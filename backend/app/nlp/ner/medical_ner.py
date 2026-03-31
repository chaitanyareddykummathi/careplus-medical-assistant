import threading


class MedicalNER:
    FALLBACK_TERMS = {
        'fever': 'SYMPTOM',
        'headache': 'SYMPTOM',
        'nausea': 'SYMPTOM',
        'cough': 'SYMPTOM',
        'chest pain': 'CRITICAL_SYMPTOM',
        'shortness of breath': 'CRITICAL_SYMPTOM',
        'diabetes': 'CONDITION',
        'hypertension': 'CONDITION',
    }

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._nlp = None
        self._initialized = False
        self._lock = threading.Lock()

    def _load_model(self) -> None:
        if self._initialized:
            return

        with self._lock:
            if self._initialized:
                return

            try:
                import spacy

                self._nlp = spacy.load(self.model_name)
            except Exception:
                self._nlp = None

            self._initialized = True

    def extract(self, text: str) -> list[dict]:
        self._load_model()

        entities: list[dict] = []

        if self._nlp is not None:
            doc = self._nlp(text)
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

        if entities:
            return entities

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
