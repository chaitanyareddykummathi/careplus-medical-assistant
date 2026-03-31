import threading

from app.nlp.preprocessing.text_cleaner import TextCleaner


class MedicalNER:
    SYMPTOM_SYNONYMS = {
        'fever': {'fever', 'temperature', 'high temperature', 'pyrexia'},
        'headache': {'headache', 'head pain', 'migraine'},
        'body pain': {'body pain', 'body ache', 'myalgia', 'muscle pain'},
        'cough': {'cough', 'dry cough', 'wet cough'},
        'sore throat': {'sore throat', 'throat pain'},
        'fatigue': {'fatigue', 'tiredness', 'exhaustion'},
        'nausea': {'nausea', 'queasy', 'vomit sensation'},
        'vomiting': {'vomiting', 'throwing up'},
        'diarrhea': {'diarrhea', 'loose motions', 'loose stool'},
        'shortness of breath': {'shortness of breath', 'breathlessness', 'difficulty breathing'},
        'chest pain': {'chest pain', 'chest tightness'},
        'dizziness': {'dizziness', 'lightheadedness'},
    }
    CONDITION_TERMS = {
        'diabetes': 'CONDITION',
        'hypertension': 'CONDITION',
        'asthma': 'CONDITION',
    }
    CRITICAL_SYMPTOMS = {'shortness of breath', 'chest pain'}

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._nlp = None
        self._initialized = False
        self._lock = threading.Lock()
        self._cleaner = TextCleaner()

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
        cleaned_text = self._cleaner.clean(text)
        entities: list[dict] = []

        if self._nlp is not None and cleaned_text:
            doc = self._nlp(cleaned_text)
            for ent in doc.ents:
                entities.append(
                    {
                        'text': ent.text.lower(),
                        'label': ent.label_,
                        'start': ent.start_char,
                        'end': ent.end_char,
                        'confidence': 0.90,
                    }
                )

        entities.extend(self._extract_rule_based(cleaned_text))
        return self._deduplicate_entities(entities)

    def extract_symptoms(self, text: str) -> list[str]:
        entities = self.extract(text)
        symptoms = [entity['text'] for entity in entities if entity.get('label') in {'SYMPTOM', 'CRITICAL_SYMPTOM'}]
        deduplicated: list[str] = []
        for symptom in symptoms:
            if symptom not in deduplicated:
                deduplicated.append(symptom)
        return deduplicated

    def _extract_rule_based(self, cleaned_text: str) -> list[dict]:
        entities: list[dict] = []
        if not cleaned_text:
            return entities

        for canonical, synonyms in self.SYMPTOM_SYNONYMS.items():
            start = self._match_first_synonym(cleaned_text, synonyms)
            if start < 0:
                continue
            label = 'CRITICAL_SYMPTOM' if canonical in self.CRITICAL_SYMPTOMS else 'SYMPTOM'
            entities.append(
                {
                    'text': canonical,
                    'label': label,
                    'start': start,
                    'end': start + len(canonical),
                    'confidence': 0.80,
                }
            )

        for condition, label in self.CONDITION_TERMS.items():
            start = cleaned_text.find(condition)
            if start >= 0:
                entities.append(
                    {
                        'text': condition,
                        'label': label,
                        'start': start,
                        'end': start + len(condition),
                        'confidence': 0.75,
                    }
                )

        return entities

    @staticmethod
    def _match_first_synonym(text: str, synonyms: set[str]) -> int:
        match_positions = [text.find(term) for term in synonyms]
        valid_positions = [position for position in match_positions if position >= 0]
        if not valid_positions:
            return -1
        return min(valid_positions)

    @staticmethod
    def _deduplicate_entities(entities: list[dict]) -> list[dict]:
        deduplicated: list[dict] = []
        seen_pairs: set[tuple[str, str]] = set()

        for entity in entities:
            key = (str(entity.get('text', '')).lower(), str(entity.get('label', '')))
            if key in seen_pairs:
                continue
            seen_pairs.add(key)
            deduplicated.append(entity)

        return deduplicated
