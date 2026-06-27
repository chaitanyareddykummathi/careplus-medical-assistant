import hashlib
import logging
import re

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
from app.services.hospital_service import hospital_service

logger = logging.getLogger(__name__)
settings = get_settings()


class SymptomAnalysisService:
    MAX_INPUT_LENGTH = 5000
    MAX_TOKEN_COUNT = 1200
    MEDICAL_SIGNAL_TERMS = {
        "ache",
        "chest",
        "cough",
        "dizzy",
        "fatigue",
        "feeling",
        "fever",
        "head",
        "nausea",
        "pain",
        "shortness",
        "breath",
        "sick",
        "stomach",
        "throat",
        "vomiting",
        "weakness",
    }
    _non_alphanumeric = re.compile(r"[^a-z0-9]+")

    KNOWN_SYMPTOM_DATASET = {
        "fever": "fever",
        "high temperature": "fever",
        "temperature": "fever",
        "headache": "headache",
        "head pain": "headache",
        "body pain": "body pain",
        "body ache": "body pain",
        "cough": "cough",
        "sore throat": "sore throat",
        "fatigue": "fatigue",
        "nausea": "nausea",
        "feeling sick": "nausea",
        "vomiting": "vomiting",
        "diarrhea": "diarrhea",
        "shortness of breath": "shortness of breath",
        "breathing difficulty": "shortness of breath",
        "chest pain": "chest pain",
        "dizziness": "dizziness",
        "unconsciousness": "unconsciousness",
    }
    CONDITION_SPECIALTY_MAP = {
        "heart": ("Cardiologist", "Cardiology"),
        "cardiac": ("Cardiologist", "Cardiology"),
        "chest": ("Cardiologist", "Cardiology"),
        "asthma": ("Pulmonologist", "Pulmonology"),
        "pneumonia": ("Pulmonologist", "Pulmonology"),
        "breath": ("Pulmonologist", "Pulmonology"),
        "migraine": ("Neurologist", "Neurology"),
        "stroke": ("Neurologist", "Neurology"),
        "neurological": ("Neurologist", "Neurology"),
        "diabetes": ("Endocrinologist", "Endocrinology"),
        "thyroid": ("Endocrinologist", "Endocrinology"),
        "stomach": ("Gastroenterologist", "Gastroenterology"),
        "gastric": ("Gastroenterologist", "Gastroenterology"),
        "skin": ("Dermatologist", "Dermatology"),
        "rash": ("Dermatologist", "Dermatology"),
        "bone": ("Orthopedic", "Orthopedics"),
        "fracture": ("Orthopedic", "Orthopedics"),
        "kidney": ("Nephrologist", "Nephrology"),
        "urinary": ("Urologist", "Urology"),
        "infection": ("Infectious Disease", "General Medicine"),
        "fever": ("General Physician", "General Medicine"),
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
        logger.info("symptom_analysis.started", extra={"user_id": current_user.id})
        raw_text = payload.text.strip()
        if not raw_text:
            raise AppException(
                status_code=422,
                error_code="EMPTY_INPUT_TEXT",
                message="Symptom text cannot be empty.",
            )
        if len(raw_text) > self.MAX_INPUT_LENGTH:
            raise AppException(
                status_code=413,
                error_code="INPUT_TOO_LONG",
                message="Symptom text exceeds the maximum supported length.",
            )

        cache_key = self._cache_key(user_id=current_user.id, text=raw_text)
        cached = cache_service.get_json(cache_key)
        if cached:
            logger.info("symptom_analysis.cache_hit", extra={"user_id": current_user.id})
            return SymptomAnalysisResponse(**cached)

        cleaned_text, tokens = self.cleaner.clean_and_tokenize(raw_text)
        logger.info(
            "symptom_analysis.cleaned",
            extra={
                "user_id": current_user.id,
                "token_count": len(tokens),
                "cleaned_text": self._truncate(cleaned_text),
            },
        )
        if not cleaned_text or not tokens:
            raise AppException(
                status_code=422,
                error_code="INVALID_INPUT_TEXT",
                message="Input text does not contain valid symptom content.",
            )
        if len(tokens) > self.MAX_TOKEN_COUNT:
            raise AppException(
                status_code=413,
                error_code="INPUT_TOO_LONG",
                message="Symptom text has too many tokens to process safely.",
            )

        context = self.ner.extract_context(cleaned_text)
        logger.info(
            "symptom_analysis.context_extracted",
            extra={"user_id": current_user.id, "context": context},
        )

        entities = self.ner.extract(cleaned_text)
        extracted_symptoms = self._map_to_known_symptoms(entities=entities)
        logger.info(
            "symptom_analysis.extracted",
            extra={
                "user_id": current_user.id,
                "extracted_symptom_count": len(extracted_symptoms),
                "detected_symptoms": extracted_symptoms,
            },
        )
        health_profile = health_profile_repository.get_profile_by_user(db=db, user_id=current_user.id)

        is_irrelevant = self._is_irrelevant_input(tokens=tokens, extracted_symptoms=extracted_symptoms, context=context)
        classification: dict = {}

        if extracted_symptoms and not is_irrelevant:
            classification = self.classifier.classify_symptoms(
                text=cleaned_text,
                symptoms=extracted_symptoms,
                health_profile=health_profile,
                context=context,
            )
            risk_level = classification["risk_level"]
            possible_conditions = classification["possible_conditions"]
            recommendation = classification["recommendation"]
            urgency = classification.get("urgency", "Monitor")
            confidence = classification["confidence"]
            logger.info(
                "symptom_analysis.risk_decision",
                extra={
                    "user_id": current_user.id,
                    "risk_level": risk_level,
                    "risk_score": classification.get("risk_score"),
                    "urgency": urgency,
                },
            )
        else:
            risk_level = "LOW"
            possible_conditions = ["symptoms not recognized"]
            recommendation = (
                "Unable to identify clear medical symptoms from the input. "
                "Please include symptom name, severity (mild/moderate/severe), and duration."
            )
            urgency = "Monitor"
            confidence = 0.3
            logger.info(
                "symptom_analysis.risk_decision",
                extra={"user_id": current_user.id, "risk_level": risk_level, "risk_score": 0.10, "urgency": urgency},
            )

        response = SymptomAnalysisResponse(
            input_text=raw_text,
            normalized_text=cleaned_text,
            extracted_symptoms=extracted_symptoms,
            context=context,
            risk_level=risk_level,
            possible_conditions=possible_conditions,
            recommendation=recommendation,
            urgency=urgency,
            confidence=confidence,
            **self._build_structured_guidance(
                symptoms=extracted_symptoms,
                possible_conditions=possible_conditions,
                risk_level=risk_level,
                urgency=urgency,
                confidence=confidence,
            ),
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
                context=context,
                urgency=urgency,
                risk_score=classification.get("risk_score", 0.10),
            )
        except SQLAlchemyError:
            db.rollback()
            logger.exception("symptom_analysis.log_persist_failed", extra={"user_id": current_user.id})

        cache_service.set_json(cache_key, jsonable_encoder(response))
        logger.info(
            "symptom_analysis.completed",
            extra={
                "user_id": current_user.id,
                "risk_level": response.risk_level,
                "symptom_count": len(response.extracted_symptoms),
            },
        )
        return response

    def _map_to_known_symptoms(self, entities: list[dict]) -> list[str]:
        symptoms: list[str] = []
        for entity in entities:
            label = str(entity.get("label", "")).upper()
            if label not in {"SYMPTOM", "CRITICAL_SYMPTOM"}:
                continue

            candidate = str(entity.get("text", "")).strip().lower()
            if not candidate:
                continue

            normalized = self.KNOWN_SYMPTOM_DATASET.get(candidate)
            if not normalized:
                compact_candidate = self._non_alphanumeric.sub(" ", candidate).strip()
                normalized = self.KNOWN_SYMPTOM_DATASET.get(compact_candidate)
            if not normalized:
                continue
            if normalized not in symptoms:
                symptoms.append(normalized)

        return symptoms

    def _build_structured_guidance(
        self,
        symptoms: list[str],
        possible_conditions: list[str],
        risk_level: str,
        urgency: str,
        confidence: float,
    ) -> dict[str, object]:
        specialist, department = self._recommend_specialty(symptoms, possible_conditions, risk_level)
        hospitals = hospital_service.list_hospitals(specialty=specialist)[:3]
        specialists = [
            {
                "name": doctor["name"],
                "specialty": doctor["specialty"],
                "department": doctor["department"],
                "hospital": hospital["name"],
                "experience_years": doctor["experience_years"],
            }
            for hospital in hospitals
            for doctor in hospital["doctors"]
            if doctor["specialty"].lower() == specialist.lower() or doctor["department"].lower() == department.lower()
        ][:4]

        symptoms_text = ", ".join(symptoms) if symptoms else "unclear symptoms"
        condition_text = ", ".join(possible_conditions[:3]) if possible_conditions else "no clear condition pattern"

        return {
            "analysis_summary": (
                f"Detected {symptoms_text}. Current triage risk is {risk_level.lower()} "
                f"with {round(confidence * 100)}% confidence."
            ),
            "condition_explanation": (
                f"The symptom pattern may overlap with {condition_text}. This is a preliminary triage signal, "
                "not a confirmed diagnosis."
            ),
            "recommended_specialist": specialist,
            "recommended_department": department,
            "home_care_advice": self._home_care_advice(risk_level),
            "lifestyle_advice": [
                "Stay hydrated and rest until symptoms improve.",
                "Avoid self-medicating with antibiotics or strong pain medicines without medical advice.",
                "Track temperature, pain score and symptom changes for the doctor.",
            ],
            "warning_signs": [
                "Symptoms getting worse or spreading",
                "Persistent fever beyond 3 days",
                "Severe pain, fainting, confusion or dehydration",
            ],
            "emergency_symptoms": [
                "Severe chest pain",
                "Severe breathing difficulty",
                "Loss of consciousness",
                "Sudden weakness on one side of the body",
            ],
            "when_to_visit_hospital": self._visit_timeline(risk_level, urgency),
            "recommended_tests": self._recommended_tests(symptoms, department),
            "nearby_hospitals": [
                {
                    "id": hospital["id"],
                    "name": hospital["name"],
                    "city": hospital["city"],
                    "rating": hospital["rating"],
                    "distance_km": hospital["distance_km"],
                    "departments": hospital["departments"],
                    "consultation_fee": hospital["consultation_fee"],
                }
                for hospital in hospitals
            ],
            "nearby_specialists": specialists,
        }

    def _recommend_specialty(
        self,
        symptoms: list[str],
        possible_conditions: list[str],
        risk_level: str,
    ) -> tuple[str, str]:
        if risk_level == "HIGH":
            return "Emergency Medicine", "Emergency Medicine"

        search_text = " ".join([*symptoms, *possible_conditions]).lower()
        for keyword, mapping in self.CONDITION_SPECIALTY_MAP.items():
            if keyword in search_text:
                return mapping
        return "General Physician", "General Medicine"

    @staticmethod
    def _home_care_advice(risk_level: str) -> list[str]:
        if risk_level == "HIGH":
            return ["Do not delay care. Arrange urgent hospital evaluation or emergency support."]
        if risk_level == "MEDIUM":
            return ["Rest, hydrate and avoid strenuous activity.", "Book a doctor consultation within 24 hours."]
        return ["Rest, hydrate and monitor symptoms.", "Seek medical advice if symptoms persist or worsen."]

    @staticmethod
    def _visit_timeline(risk_level: str, urgency: str) -> str:
        if risk_level == "HIGH" or urgency == "Immediate":
            return "Visit an emergency department immediately."
        if risk_level == "MEDIUM" or urgency == "Within 24h":
            return "Consult a doctor within 24 hours, sooner if symptoms worsen."
        return "Monitor at home and visit a doctor if symptoms persist beyond 48-72 hours."

    @staticmethod
    def _recommended_tests(symptoms: list[str], department: str) -> list[str]:
        tests = ["Basic vitals assessment"]
        symptom_text = " ".join(symptoms)
        if "fever" in symptom_text:
            tests.extend(["Complete blood count", "CRP or infection screening if advised"])
        if "chest pain" in symptom_text or department == "Cardiology":
            tests.extend(["ECG", "Troponin test if clinically indicated"])
        if "shortness of breath" in symptom_text or department == "Pulmonology":
            tests.extend(["Pulse oximetry", "Chest X-ray if advised"])
        if "headache" in symptom_text or department == "Neurology":
            tests.append("Neurological examination")
        return list(dict.fromkeys(tests))

    def _unknown_tokens(self, tokens: list[str], extracted_symptoms: list[str]) -> list[str]:
        known_words = set()
        for symptom in extracted_symptoms:
            for token in symptom.split():
                known_words.add(token)

        unknown: list[str] = []
        for token in tokens:
            if (
                token in known_words
                or token in self.MEDICAL_SIGNAL_TERMS
                or token in {"i", "have", "for", "and", "with", "since", "day", "days", "week", "weeks", "month"}
                or token.isdigit()
            ):
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
        context: dict[str, object],
        urgency: str,
        risk_score: float,
    ) -> None:
        metadata = {
            "unknown_tokens": unknown_tokens,
            "profile_id": profile_id,
            "context": context,
            "urgency": urgency,
            "risk_score": risk_score,
        }
        symptom_log_repository.create_log(
            db=db,
            payload={
                "user_id": user_id,
                "input_text": input_text,
                "cleaned_text": cleaned_text,
                "extracted_symptoms": response.extracted_symptoms,
                "risk_level": response.risk_level,
                "possible_conditions": response.possible_conditions,
                "recommendation": response.recommendation,
                "confidence": response.confidence,
                "analysis_metadata": metadata,
            },
        )

    @staticmethod
    def _cache_key(user_id: int, text: str) -> str:
        digest = hashlib.sha256(f"{user_id}:{text}".encode("utf-8")).hexdigest()
        return f"symptom:analysis:{digest}"

    def _is_irrelevant_input(
        self,
        tokens: list[str],
        extracted_symptoms: list[str],
        context: dict[str, object],
    ) -> bool:
        if extracted_symptoms:
            return False

        has_context_signal = bool(
            context.get("duration") or context.get("severity") or context.get("frequency") or context.get("body_parts")
        )
        if has_context_signal:
            return False

        significant_tokens = [token for token in tokens if token not in {"i", "am", "have", "the", "and", "is"}]
        if len(significant_tokens) <= 1:
            return True

        return not any(token in self.MEDICAL_SIGNAL_TERMS for token in significant_tokens)

    @staticmethod
    def _truncate(text: str, limit: int = 300) -> str:
        if len(text) <= limit:
            return text
        return f"{text[:limit]}..."


symptom_analysis_service = SymptomAnalysisService()
