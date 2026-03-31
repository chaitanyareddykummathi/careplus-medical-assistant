import hashlib
import logging
import threading
from importlib import metadata

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ModelManager:
    FALLBACK_TERMS = {
        'fever': 'SYMPTOM',
        'headache': 'SYMPTOM',
        'nausea': 'SYMPTOM',
        'cough': 'SYMPTOM',
        'chest pain': 'CRITICAL_SYMPTOM',
        'shortness of breath': 'CRITICAL_SYMPTOM',
        'diabetes': 'CONDITION',
        'hypertension': 'CONDITION',
        'stroke': 'CRITICAL_SYMPTOM',
    }

    HIGH_RISK_TERMS = {
        'chest pain',
        'shortness of breath',
        'blood in stool',
        'severe headache',
        'fainting',
        'stroke symptoms',
    }

    def __init__(self) -> None:
        self._device = self._detect_device()

        self._spacy_nlp = None
        self._classifier = None
        self._embedder = None

        self._spacy_lock = threading.Lock()
        self._classifier_lock = threading.Lock()
        self._embedder_lock = threading.Lock()

        self._spacy_initialized = False
        self._classifier_initialized = False
        self._embedder_initialized = False

    @staticmethod
    def _detect_device() -> str:
        try:
            import torch

            if torch.cuda.is_available():
                return 'cuda:0'
        except Exception:
            return 'cpu'
        return 'cpu'

    def warmup(self) -> None:
        self._load_spacy()
        self._load_classifier()
        self._load_embedder()

        sample = ['patient reports mild headache and fever since yesterday']
        entities = self.extract_entities_batch(sample)
        self.classify_risk_batch(sample, entities)
        self.generate_embeddings_batch(sample)

    def _load_spacy(self) -> None:
        if self._spacy_initialized:
            return

        with self._spacy_lock:
            if self._spacy_initialized:
                return

            try:
                import spacy

                if self._device.startswith('cuda'):
                    try:
                        spacy.require_gpu()
                    except Exception:
                        logger.info('spaCy GPU request failed, keeping CPU execution.')

                self._spacy_nlp = spacy.load(settings.medical_ner_model)
            except Exception:
                self._spacy_nlp = None
                logger.warning(
                    'spaCy medical NER model could not be loaded, fallback entities will be used.',
                    extra={'model_name': settings.medical_ner_model},
                )
            finally:
                self._spacy_initialized = True

    def _load_classifier(self) -> None:
        if self._classifier_initialized:
            return

        with self._classifier_lock:
            if self._classifier_initialized:
                return

            try:
                from transformers import pipeline

                device_index = 0 if self._device.startswith('cuda') else -1
                self._classifier = pipeline(
                    task='text-classification',
                    model=settings.classifier_model,
                    device=device_index,
                )
            except Exception:
                self._classifier = None
                logger.warning(
                    'Transformers classifier could not be loaded, fallback scoring will be used.',
                    extra={'model_name': settings.classifier_model},
                )
            finally:
                self._classifier_initialized = True

    def _load_embedder(self) -> None:
        if self._embedder_initialized:
            return

        with self._embedder_lock:
            if self._embedder_initialized:
                return

            try:
                from sentence_transformers import SentenceTransformer

                self._embedder = SentenceTransformer(settings.embedding_model, device=self._device)
            except Exception:
                self._embedder = None
                logger.warning(
                    'Embedding model could not be loaded, deterministic fallback embeddings will be used.',
                    extra={'model_name': settings.embedding_model},
                )
            finally:
                self._embedder_initialized = True

    def extract_entities_batch(self, texts: list[str]) -> list[list[dict]]:
        self._load_spacy()
        if self._spacy_nlp is None:
            return [self._fallback_entities(text) for text in texts]

        entity_batches: list[list[dict]] = []
        docs = self._spacy_nlp.pipe(texts, batch_size=settings.nlp_batch_size)
        for text, doc in zip(texts, docs):
            entities: list[dict] = []
            for ent in doc.ents:
                entities.append(
                    {
                        'text': ent.text,
                        'label': ent.label_,
                        'start': ent.start_char,
                        'end': ent.end_char,
                        'confidence': 0.90,
                    }
                )
            entity_batches.append(entities or self._fallback_entities(text))

        return entity_batches

    def classify_risk_batch(self, texts: list[str], entity_batches: list[list[dict]]) -> list[dict]:
        self._load_classifier()

        raw_scores: list[float] = [0.15 for _ in texts]
        if self._classifier is not None:
            try:
                raw_outputs = self._classifier(
                    texts,
                    truncation=True,
                    batch_size=settings.nlp_batch_size,
                )
                normalized_outputs = raw_outputs if isinstance(raw_outputs, list) else [raw_outputs]
                for index, output in enumerate(normalized_outputs):
                    model_score = float(output.get('score', 0.5))
                    label = str(output.get('label', 'UNKNOWN')).upper()
                    raw_scores[index] = model_score if label in {'POSITIVE', 'LABEL_1'} else 1.0 - model_score
            except Exception:
                logger.warning('Classifier batch inference failed, reverting to fallback score baseline.')

        results: list[dict] = []
        for text, entities, base_score in zip(texts, entity_batches, raw_scores):
            hits = [term for term in self.HIGH_RISK_TERMS if term in text]
            score = base_score + min(len(hits) * 0.20, 0.60)

            critical_entities = [entity for entity in entities if entity.get('label') == 'CRITICAL_SYMPTOM']
            if critical_entities:
                score += 0.25

            risk_score = max(0.0, min(score, 1.0))
            if risk_score >= 0.80:
                risk_level = 'critical'
            elif risk_score >= 0.60:
                risk_level = 'high'
            elif risk_score >= 0.35:
                risk_level = 'moderate'
            else:
                risk_level = 'low'

            intent = 'urgent_assessment' if risk_level in {'critical', 'high'} else 'routine_assessment'
            results.append(
                {
                    'intent': intent,
                    'risk_level': risk_level,
                    'risk_score': risk_score,
                }
            )

        return results

    def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        self._load_embedder()
        if self._embedder is not None:
            try:
                vectors = self._embedder.encode(
                    texts,
                    batch_size=settings.nlp_batch_size,
                    normalize_embeddings=True,
                )
                return [
                    [float(value) for value in vector[: settings.embedding_dimension]]
                    for vector in vectors
                ]
            except Exception:
                logger.warning('Embedding batch inference failed, reverting to deterministic fallback.')

        return [self._deterministic_fallback_embedding(text) for text in texts]

    def model_versions(self) -> dict[str, str]:
        return {
            'model_tag': settings.model_version_tag,
            'ner_model': settings.medical_ner_model,
            'classifier_model': settings.classifier_model,
            'embedding_model': settings.embedding_model,
            'runtime_device': self._device,
            'spacy_version': self._package_version('spacy'),
            'transformers_version': self._package_version('transformers'),
            'sentence_transformers_version': self._package_version('sentence-transformers'),
        }

    def _fallback_entities(self, text: str) -> list[dict]:
        entities: list[dict] = []
        for term, label in self.FALLBACK_TERMS.items():
            start = text.find(term)
            if start >= 0:
                entities.append(
                    {
                        'text': term,
                        'label': label,
                        'start': start,
                        'end': start + len(term),
                        'confidence': 0.70,
                    }
                )
        return entities

    def _deterministic_fallback_embedding(self, text: str) -> list[float]:
        vector: list[float] = []
        seed = text.encode('utf-8')
        cursor = seed

        while len(vector) < settings.embedding_dimension:
            cursor = hashlib.sha256(cursor).digest()
            vector.extend(((byte / 255.0) * 2.0) - 1.0 for byte in cursor)

        return vector[: settings.embedding_dimension]

    @staticmethod
    def _package_version(name: str) -> str:
        try:
            return metadata.version(name)
        except Exception:
            return 'unavailable'


model_manager = ModelManager()
