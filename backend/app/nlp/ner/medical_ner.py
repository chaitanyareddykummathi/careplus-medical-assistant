import re
import threading

from app.nlp.preprocessing.text_cleaner import TextCleaner


class MedicalNER:
    SYMPTOM_SYNONYMS = {
        "fever": {
            "fever",
            "feverish",
            "temperature",
            "high temperature",
            "running a temperature",
            "pyrexia",
        },
        "headache": {"headache", "head pain", "migraine", "pain in head", "pain in the head"},
        "body pain": {"body pain", "body ache", "body aches", "myalgia", "muscle pain", "muscle ache"},
        "cough": {"cough", "coughing", "dry cough", "wet cough", "persistent cough"},
        "sore throat": {"sore throat", "throat pain", "scratchy throat"},
        "fatigue": {"fatigue", "tiredness", "exhaustion", "tired", "weakness", "weak", "no energy"},
        "nausea": {"nausea", "nauseous", "queasy", "vomit sensation", "feeling sick", "sick feeling"},
        "vomiting": {"vomiting", "throwing up", "vomit", "puking", "puke"},
        "diarrhea": {"diarrhea", "loose motions", "loose motion", "loose stool", "watery stool", "watery stools"},
        "abdominal pain": {
            "abdominal pain",
            "abdomen pain",
            "stomach ache",
            "stomach pain",
            "belly ache",
            "belly pain",
            "tummy ache",
            "tummy pain",
            "cramps",
            "abdominal cramps",
        },
        "shortness of breath": {
            "shortness of breath",
            "breathlessness",
            "difficulty breathing",
            "breathing difficulty",
            "trouble breathing",
            "hard to breathe",
            "cannot breathe",
            "cant breathe",
            "can't breathe",
        },
        "chest pain": {"chest pain", "chest tightness", "pain in chest", "pain in the chest"},
        "dizziness": {"dizziness", "lightheadedness", "feeling dizzy", "dizzy", "light headed"},
        "unconsciousness": {
            "unconsciousness",
            "unconscious",
            "loss of consciousness",
            "passed out",
            "fainted",
        },
    }
    CONDITION_TERMS = {
        "diabetes": "CONDITION",
        "hypertension": "CONDITION",
        "asthma": "CONDITION",
    }
    CRITICAL_SYMPTOMS = {"shortness of breath", "chest pain", "unconsciousness"}
    NEGATION_TERMS = {
        "no",
        "not",
        "never",
        "without",
        "don't",
        "dont",
        "doesn't",
        "doesnt",
        "denies",
        "deny",
    }

    DURATION_PATTERNS = (
        re.compile(
            r"\b(?:for|since)\s+(?:an?\s+)?\d+\s*(?:hour|hours|day|days|week|weeks|month|months)\b"
        ),
        re.compile(r"\b(?:for|since)\s+(?:an?|one)\s+(?:hour|day|week|month)\b"),
        re.compile(r"\bsince\s+(?:yesterday|today|last night|last week|last month)\b"),
        re.compile(r"\b\d+\s*(?:hour|hours|day|days|week|weeks|month|months)\b"),
    )
    SEVERITY_TERMS = {
        "mild": {"mild", "slight", "light"},
        "moderate": {"moderate", "medium"},
        "severe": {"severe", "intense", "serious", "bad"},
        "extreme": {"extreme", "unbearable", "excruciating", "worst"},
    }
    FREQUENCY_TERMS = {
        "constant": {"constant", "continuous", "persistent", "all the time"},
        "intermittent": {"intermittent", "on and off", "comes and goes", "occasional"},
    }
    BODY_PART_TERMS = {
        "head": {"head", "forehead", "temple"},
        "chest": {"chest"},
        "stomach": {"stomach", "abdomen", "abdominal", "belly"},
        "throat": {"throat"},
        "back": {"back", "lower back", "upper back"},
        "neck": {"neck"},
        "arm": {"arm", "arms"},
        "leg": {"leg", "legs"},
    }
    AGE_PATTERNS = (
        re.compile(r"\b(?:i\s+am|im|i'm|age|aged)\s+(?P<age>\d{1,3})\b"),
        re.compile(r"\b(?P<age>\d{1,3})\s*(?:years?\s*old|year\s*old|yrs?\s*old|yo|y\s*o)\b"),
    )
    TEMPERATURE_PATTERNS = (
        re.compile(r"\b(?P<value>9[5-9]|10[0-9]|11[0-5])\s*(?:degree|degrees)?\s*(?:f|fahrenheit)\b"),
        re.compile(r"\b(?P<value>3[5-9]|4[0-2])(?:\.\d+)?\s*(?:degree|degrees)?\s*(?:c|celsius)\b"),
    )

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self._nlp = None
        self._initialized = False
        self._lock = threading.Lock()
        self._cleaner = TextCleaner()
        self._synonym_to_canonical = self._build_synonym_index()

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
                raw_text = str(ent.text or "").lower().strip()
                canonical = self._normalize_symptom(raw_text)
                if canonical:
                    label = "CRITICAL_SYMPTOM" if canonical in self.CRITICAL_SYMPTOMS else "SYMPTOM"
                    normalized_text = canonical
                else:
                    label = str(ent.label_ or "").upper()
                    normalized_text = raw_text

                entities.append(
                    {
                        "text": normalized_text,
                        "label": label,
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "confidence": 0.90,
                    }
                )

        entities.extend(self._extract_rule_based(cleaned_text))
        return self._deduplicate_entities(entities)

    def extract_symptoms(self, text: str) -> list[str]:
        entities = self.extract(text)
        symptoms = [entity["text"] for entity in entities if entity.get("label") in {"SYMPTOM", "CRITICAL_SYMPTOM"}]
        deduplicated: list[str] = []
        for symptom in symptoms:
            if symptom not in deduplicated:
                deduplicated.append(symptom)
        return deduplicated

    def extract_context(self, text: str) -> dict[str, object]:
        cleaned_text = self._cleaner.clean(text)
        if not cleaned_text:
            return {
                "duration": None,
                "severity": None,
                "frequency": None,
                "body_parts": [],
            }

        return {
            "duration": self._extract_duration(cleaned_text),
            "severity": self._extract_severity(cleaned_text),
            "frequency": self._extract_frequency(cleaned_text),
            "body_parts": self._extract_body_parts(cleaned_text),
            "age": self._extract_age(cleaned_text),
            "temperature": self._extract_temperature(cleaned_text),
            "reported_conditions": self._extract_conditions(cleaned_text),
        }

    def _extract_rule_based(self, cleaned_text: str) -> list[dict]:
        entities: list[dict] = []
        if not cleaned_text:
            return entities

        for canonical, synonyms in self.SYMPTOM_SYNONYMS.items():
            match = self._match_first_term(cleaned_text, synonyms)
            if match is None:
                continue
            if self._is_negated(cleaned_text, match.start()):
                continue
            label = "CRITICAL_SYMPTOM" if canonical in self.CRITICAL_SYMPTOMS else "SYMPTOM"
            entities.append(
                {
                    "text": canonical,
                    "label": label,
                    "start": match.start(),
                    "end": match.end(),
                    "confidence": 0.84,
                }
            )

        for condition, label in self.CONDITION_TERMS.items():
            match = self._match_first_term(cleaned_text, {condition})
            if match is None:
                continue
            entities.append(
                {
                    "text": condition,
                    "label": label,
                    "start": match.start(),
                    "end": match.end(),
                    "confidence": 0.75,
                }
            )

        return entities

    def _extract_duration(self, cleaned_text: str) -> str | None:
        best_match: re.Match[str] | None = None
        for pattern in self.DURATION_PATTERNS:
            match = pattern.search(cleaned_text)
            if match is None:
                continue
            if best_match is None or match.start() < best_match.start():
                best_match = match

        return best_match.group(0).strip() if best_match else None

    def _extract_severity(self, cleaned_text: str) -> str | None:
        for severity in ("extreme", "severe", "moderate", "mild"):
            terms = self.SEVERITY_TERMS[severity]
            if self._match_first_term(cleaned_text, terms):
                return severity
        return None

    def _extract_frequency(self, cleaned_text: str) -> str | None:
        for frequency, terms in self.FREQUENCY_TERMS.items():
            if self._match_first_term(cleaned_text, terms):
                return frequency
        return None

    def _extract_body_parts(self, cleaned_text: str) -> list[str]:
        found: list[tuple[int, str]] = []
        for body_part, terms in self.BODY_PART_TERMS.items():
            match = self._match_first_term(cleaned_text, terms)
            if match is None:
                continue
            found.append((match.start(), body_part))

        found.sort(key=lambda item: item[0])
        ordered_parts: list[str] = []
        for _, body_part in found:
            if body_part not in ordered_parts:
                ordered_parts.append(body_part)
        return ordered_parts

    def _extract_age(self, cleaned_text: str) -> int | None:
        for pattern in self.AGE_PATTERNS:
            match = pattern.search(cleaned_text)
            if match is None:
                continue
            try:
                age = int(match.group("age"))
            except (TypeError, ValueError):
                continue
            if 0 < age <= 120:
                return age
        return None

    def _extract_temperature(self, cleaned_text: str) -> str | None:
        for pattern in self.TEMPERATURE_PATTERNS:
            match = pattern.search(cleaned_text)
            if match:
                return match.group(0).strip()
        return None

    def _extract_conditions(self, cleaned_text: str) -> list[str]:
        conditions: list[str] = []
        for condition in self.CONDITION_TERMS:
            if self._match_first_term(cleaned_text, {condition}) and condition not in conditions:
                conditions.append(condition)
        return conditions

    def _normalize_symptom(self, raw_text: str) -> str | None:
        if not raw_text:
            return None
        normalized = self._cleaner.clean(raw_text)
        if not normalized:
            return None
        if normalized in self.SYMPTOM_SYNONYMS:
            return normalized
        return self._synonym_to_canonical.get(normalized)

    @staticmethod
    def _match_first_term(text: str, terms: set[str]) -> re.Match[str] | None:
        best_match: re.Match[str] | None = None
        for term in terms:
            pattern = re.compile(rf"\b{re.escape(term)}\b")
            match = pattern.search(text)
            if match is None:
                continue
            if best_match is None or match.start() < best_match.start():
                best_match = match
        return best_match

    def _is_negated(self, text: str, match_start: int) -> bool:
        prefix = text[max(0, match_start - 40) : match_start].strip()
        if not prefix:
            return False
        words = re.findall(r"[a-z]+'?[a-z]*", prefix)
        return any(word in self.NEGATION_TERMS for word in words[-4:])

    def _build_synonym_index(self) -> dict[str, str]:
        index: dict[str, str] = {}
        for canonical, synonyms in self.SYMPTOM_SYNONYMS.items():
            normalized_canonical = self._cleaner.clean(canonical)
            index[normalized_canonical] = canonical
            for synonym in synonyms:
                normalized_synonym = self._cleaner.clean(synonym)
                if normalized_synonym:
                    index[normalized_synonym] = canonical
        return index

    @staticmethod
    def _deduplicate_entities(entities: list[dict]) -> list[dict]:
        deduplicated: list[dict] = []
        seen_pairs: set[tuple[str, str]] = set()

        for entity in entities:
            key = (str(entity.get("text", "")).lower(), str(entity.get("label", "")))
            if key in seen_pairs:
                continue
            seen_pairs.add(key)
            deduplicated.append(entity)

        return deduplicated
