import hashlib
import logging

from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppException
from app.models.user import User
from app.nlp.classification.risk_classifier import RiskClassifier
from app.nlp.ner.medical_ner import MedicalNER
from app.nlp.preprocessing.text_cleaner import TextCleaner
from app.repositories.health_profile_repository import health_profile_repository
from app.repositories.symptom_log_repository import symptom_log_repository
from app.schemas.symptom_analysis import SymptomAnalysisRequest, SymptomAnalysisResponse
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)
settings = get_settings()


class SymptomAnalysisService:
    MAX_INPUT_LENGTH = 5000
    MAX_TOKEN_COUNT = 1200

    KNOWN_SYMPTOM_DATASET = {
        'fever': 'fever',
        'headache': 'headache',
        'body pain': 'body pain',
        'cough': 'cough',
        'sore throat': 'sore throat',
        'fatigue': 'fatigue',
        'nausea': 'nausea',
        'vomiting': 'vomiting',
        'diarrhea': 'diarrhea',
        'shortness of breath': 'shortness of breath',
        'chest pain': 'chest pain',
        'dizziness': 'dizziness',
    }

    def __init__(
        self,
        cleaner: TextCleaner | None = None,
        ner: MedicalNER | None = None,
        classifier: RiskClassifier | None = None,
    ) -> None:
        self.cleaner = cleaner or TextCleaner()
        self.ner = ner or MedicalNER(model_name=settings.medical_ner_model)
        self.classifier = classifier or RiskClassifier(model_name=settings.classifier_model)

    def analyze_symptoms(
        self,
        db: Session,
        current_user: User,
        payload: SymptomAnalysisRequest,
    ) -> SymptomAnalysisResponse:
        logger.info('symptom_analysis.started', extra={'user_id': current_user.id})
        raw_text = payload.text.strip()
        if not raw_text:
            raise AppException(
                status_code=422,
                error_code='EMPTY_INPUT_TEXT',
                message='Symptom text cannot be empty.',
            )
        if len(raw_text) > self.MAX_INPUT_LENGTH:
            raise AppException(
                status_code=413,
                error_code='INPUT_TOO_LONG',
                message='Symptom text exceeds the maximum supported length.',
            )

        cache_key = self._cache_key(user_id=current_user.id, text=raw_text)
        cached = cache_service.get_json(cache_key)
        if cached:
            logger.info('symptom_analysis.cache_hit', extra={'user_id': current_user.id})
            return SymptomAnalysisResponse(**cached)

        cleaned_text, tokens = self.cleaner.clean_and_tokenize(raw_text)
        logger.info(
            'symptom_analysis.cleaned',
            extra={'user_id': current_user.id, 'token_count': len(tokens)},
        )
        if not cleaned_text or not tokens:
            raise AppException(
                status_code=422,
                error_code='INVALID_INPUT_TEXT',
                message='Input text does not contain valid symptom content.',
            )
        if len(tokens) > self.MAX_TOKEN_COUNT:
            raise AppException(
                status_code=413,
                error_code='INPUT_TOO_LONG',
                message='Symptom text has too many tokens to process safely.',
            )

        entities = self.ner.extract(cleaned_text)
        extracted_symptoms = self._map_to_known_symptoms(entities=entities)
        logger.info(
            'symptom_analysis.extracted',
            extra={'user_id': current_user.id, 'extracted_symptom_count': len(extracted_symptoms)},
        )
        health_profile = health_profile_repository.get_profile_by_user(db=db, user_id=current_user.id)

        if extracted_symptoms:
            classification = self.classifier.classify_symptoms(
                text=cleaned_text,
                symptoms=extracted_symptoms,
                health_profile=health_profile,
            )
            risk_level = classification['risk_level']
            possible_conditions = classification['possible_conditions']
            recommendation = classification['recommendation']
            confidence = classification['confidence']
            logger.info(
                'symptom_analysis.classified',
                extra={'user_id': current_user.id, 'risk_level': risk_level},
            )
        else:
            risk_level = 'LOW'
            possible_conditions = ['symptoms not recognized']
            recommendation = (
                'Unable to identify clear medical symptoms from the input. '
                'Please provide specific symptoms such as fever, cough, or headache.'
            )
            confidence = 0.3

        response = SymptomAnalysisResponse(
            input_text=raw_text,
            extracted_symptoms=extracted_symptoms,
            risk_level=risk_level,
            possible_conditions=possible_conditions,
            recommendation=recommendation,
            confidence=confidence,
        )

        unknown_tokens = self._unknown_tokens(tokens=tokens, extracted_symptoms=extracted_symptoms)
        try:
            self._persist_symptom_log(
                db=db,
                user_id=current_user.id,
                input_text=raw_text,
                cleaned_text=cleaned_text,
                response=response,
                unknown_tokens=unknown_tokens,
                profile_id=health_profile.id if health_profile else None,
            )
        except SQLAlchemyError:
            db.rollback()
            logger.exception('symptom_analysis.log_persist_failed', extra={'user_id': current_user.id})

        cache_service.set_json(cache_key, jsonable_encoder(response))
        logger.info(
            'symptom_analysis.completed',
            extra={
                'user_id': current_user.id,
                'risk_level': response.risk_level,
                'symptom_count': len(response.extracted_symptoms),
            },
        )
        return response

    def _map_to_known_symptoms(self, entities: list[dict]) -> list[str]:
        symptoms: list[str] = []
        for entity in entities:
            label = str(entity.get('label', '')).upper()
            if label not in {'SYMPTOM', 'CRITICAL_SYMPTOM'}:
                continue

            candidate = str(entity.get('text', '')).strip().lower()
            if not candidate:
                continue

            normalized = self.KNOWN_SYMPTOM_DATASET.get(candidate)
            if not normalized:
                continue
            if normalized not in symptoms:
                symptoms.append(normalized)

        return symptoms

    def _unknown_tokens(self, tokens: list[str], extracted_symptoms: list[str]) -> list[str]:
        known_words = set()
        for symptom in extracted_symptoms:
            for token in symptom.split():
                known_words.add(token)

        unknown: list[str] = []
        for token in tokens:
            if token in known_words or token in {'i', 'have', 'for', 'and', 'with', 'since', 'day', 'days'}:
                continue
            if token not in unknown:
                unknown.append(token)
        return unknown

    def _persist_symptom_log(
        self,
        db: Session,
        user_id: int,
        input_text: str,
        cleaned_text: str,
        response: SymptomAnalysisResponse,
        unknown_tokens: list[str],
        profile_id: int | None,
    ) -> None:
        metadata = {
            'unknown_tokens': unknown_tokens,
            'profile_id': profile_id,
        }
        symptom_log_repository.create_log(
            db=db,
            payload={
                'user_id': user_id,
                'input_text': input_text,
                'cleaned_text': cleaned_text,
                'extracted_symptoms': response.extracted_symptoms,
                'risk_level': response.risk_level,
                'possible_conditions': response.possible_conditions,
                'recommendation': response.recommendation,
                'confidence': response.confidence,
                'analysis_metadata': metadata,
            },
        )

    @staticmethod
    def _cache_key(user_id: int, text: str) -> str:
        digest = hashlib.sha256(f'{user_id}:{text}'.encode('utf-8')).hexdigest()
        return f'symptom:analysis:{digest}'


symptom_analysis_service = SymptomAnalysisService()
