import threading


class RiskClassifier:
    HIGH_RISK_TERMS = {
        'chest pain',
        'shortness of breath',
        'blood in stool',
        'severe headache',
        'fainting',
    }

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._classifier = None
        self._initialized = False
        self._lock = threading.Lock()

    def _load_model(self) -> None:
        if self._initialized:
            return

        with self._lock:
            if self._initialized:
                return

            try:
                from transformers import pipeline

                self._classifier = pipeline('text-classification', model=self.model_name)
            except Exception:
                self._classifier = None

            self._initialized = True

    def classify(self, text: str, entities: list[dict]) -> dict:
        self._load_model()

        if self._classifier is not None:
            raw = self._classifier(text, truncation=True)[0]
            model_score = float(raw.get('score', 0.5))
            label = str(raw.get('label', 'UNKNOWN')).upper()
            mapped_score = model_score if label in {'POSITIVE', 'LABEL_1'} else 1.0 - model_score
        else:
            mapped_score = 0.15

        hits = [term for term in self.HIGH_RISK_TERMS if term in text]
        mapped_score += min(len(hits) * 0.20, 0.60)

        critical_entities = [entity for entity in entities if entity.get('label') == 'CRITICAL_SYMPTOM']
        if critical_entities:
            mapped_score += 0.25

        risk_score = max(0.0, min(mapped_score, 1.0))
        if risk_score >= 0.80:
            risk_level = 'critical'
        elif risk_score >= 0.60:
            risk_level = 'high'
        elif risk_score >= 0.35:
            risk_level = 'moderate'
        else:
            risk_level = 'low'

        intent = 'urgent_assessment' if risk_level in {'critical', 'high'} else 'routine_assessment'

        return {
            'intent': intent,
            'risk_level': risk_level,
            'risk_score': risk_score,
        }
