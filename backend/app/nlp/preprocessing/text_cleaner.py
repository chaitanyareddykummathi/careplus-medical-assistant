import re
from collections.abc import Iterable


class TextCleaner:
    _invalid_chars = re.compile(r"[^a-z0-9\s.,!?'/\-]")
    _spaces = re.compile(r"\s+")
    _token_pattern = re.compile(r"[a-z0-9]+'?[a-z0-9]*")
    _repeat_chars = re.compile(r"(.)\1{2,}")

    _IRREGULAR_LEMMAS = {
        "teeth": "tooth",
        "feet": "foot",
        "children": "child",
        "mice": "mouse",
    }

    _COMMON_WORDS = {
        "a",
        "an",
        "and",
        "are",
        "be",
        "been",
        "for",
        "from",
        "have",
        "having",
        "i",
        "in",
        "is",
        "it",
        "my",
        "of",
        "on",
        "since",
        "that",
        "the",
        "this",
        "to",
        "was",
        "with",
        "yesterday",
        "today",
        "tomorrow",
        "day",
        "days",
        "week",
        "weeks",
        "month",
        "months",
        "hour",
        "hours",
    }

    _MEDICAL_TERMS = {
        "abdomen",
        "abdominal",
        "ache",
        "asthma",
        "back",
        "belly",
        "blood",
        "body",
        "breath",
        "breathing",
        "breathlessness",
        "burning",
        "chest",
        "chills",
        "cough",
        "covid",
        "dehydration",
        "diarrhea",
        "difficulty",
        "dizzy",
        "dizziness",
        "exhaustion",
        "extreme",
        "fainting",
        "fatigue",
        "feeling",
        "fever",
        "flu",
        "frequent",
        "frequency",
        "head",
        "headache",
        "heart",
        "hypertension",
        "intermittent",
        "lightheaded",
        "low",
        "mild",
        "moderate",
        "muscle",
        "nausea",
        "neck",
        "pain",
        "palpitations",
        "persistent",
        "pulse",
        "queasy",
        "respiratory",
        "seizure",
        "severe",
        "sick",
        "sore",
        "stomach",
        "temperature",
        "throat",
        "tightness",
        "tired",
        "tiredness",
        "unconscious",
        "unconsciousness",
        "vomit",
        "vomiting",
        "weakness",
    }

    _SPELLING_VARIATIONS = {
        "brething": "breathing",
        "brethingg": "breathing",
        "brethinggg": "breathing",
        "brethingdifficult": "breathing",
        "brethlessness": "breathlessness",
        "ches": "chest",
        "chesst": "chest",
        "cof": "cough",
        "coug": "cough",
        "coughh": "cough",
        "diarhea": "diarrhea",
        "diareha": "diarrhea",
        "dizines": "dizziness",
        "fatique": "fatigue",
        "feaver": "fever",
        "feveer": "fever",
        "feverr": "fever",
        "headach": "headache",
        "headche": "headache",
        "hedache": "headache",
        "nausia": "nausea",
        "nauseous": "nausea",
        "nusea": "nausea",
        "sver": "severe",
        "temprature": "temperature",
        "thorat": "throat",
        "vomitting": "vomiting",
        "weekk": "week",
        "wek": "week",
    }

    def clean(self, text: str) -> str:
        sanitized = self._sanitize_text(text)
        if not sanitized:
            return ""
        tokens = self._token_pattern.findall(sanitized)
        normalized_tokens = [self._normalize_token(token, apply_lemma=False) for token in tokens]
        normalized_tokens = [token for token in normalized_tokens if token]
        return " ".join(normalized_tokens).strip()

    def tokenize(self, text: str) -> list[str]:
        sanitized = self._sanitize_text(text)
        if not sanitized:
            return []
        tokens = self._token_pattern.findall(sanitized)
        normalized_tokens = [self._normalize_token(token, apply_lemma=True) for token in tokens]
        return [token for token in normalized_tokens if token]

    def clean_and_tokenize(self, text: str) -> tuple[str, list[str]]:
        cleaned = self.clean(text)
        tokens = self.tokenize(cleaned) if cleaned else []
        return cleaned, tokens

    def deduplicate(self, tokens: Iterable[str]) -> list[str]:
        unique: list[str] = []
        for token in tokens:
            if token and token not in unique:
                unique.append(token)
        return unique

    def _sanitize_text(self, text: str) -> str:
        normalized = (text or "").strip().lower()
        if not normalized:
            return ""
        normalized = normalized.replace("-", " ")
        normalized = self._invalid_chars.sub(" ", normalized)
        normalized = self._spaces.sub(" ", normalized)
        return normalized.strip()

    def _normalize_token(self, token: str, apply_lemma: bool) -> str:
        if not token:
            return ""
        corrected = self._correct_spelling(token)
        return self._lemmatize(corrected) if apply_lemma else corrected

    def _correct_spelling(self, token: str) -> str:
        if token.isdigit():
            return token
        if token in self._COMMON_WORDS or token in self._MEDICAL_TERMS:
            return token

        if token in self._SPELLING_VARIATIONS:
            return self._SPELLING_VARIATIONS[token]

        collapsed = self._repeat_chars.sub(r"\1\1", token)
        if collapsed in self._SPELLING_VARIATIONS:
            return self._SPELLING_VARIATIONS[collapsed]
        if collapsed in self._MEDICAL_TERMS:
            return collapsed

        if len(collapsed) >= 4:
            candidate = self._closest_medical_term(collapsed)
            if candidate:
                return candidate

        return collapsed

    def _closest_medical_term(self, token: str) -> str | None:
        threshold = 1 if len(token) <= 5 else 2
        best_term: str | None = None
        best_distance = threshold + 1
        token_initial = token[0]

        for term in self._MEDICAL_TERMS:
            if term[0] != token_initial:
                continue
            if abs(len(term) - len(token)) > threshold:
                continue
            distance = self._edit_distance(token, term, max_distance=best_distance)
            if distance < best_distance:
                best_distance = distance
                best_term = term
                if distance == 0:
                    break

        return best_term if best_term is not None and best_distance <= threshold else None

    def _lemmatize(self, token: str) -> str:
        if len(token) <= 3:
            return token

        irregular = self._IRREGULAR_LEMMAS.get(token)
        if irregular:
            return irregular

        if token.endswith("ies") and len(token) > 4:
            return f"{token[:-3]}y"
        if token.endswith("ing") and len(token) > 5:
            stem = token[:-3]
            if len(stem) > 3 and stem[-1] == stem[-2]:
                stem = stem[:-1]
            return stem
        if token.endswith("ed") and len(token) > 4:
            return token[:-2]
        if token.endswith("es") and len(token) > 4:
            return token[:-2]
        if token.endswith("s") and len(token) > 4 and not token.endswith("ss"):
            return token[:-1]

        return token

    @staticmethod
    def _edit_distance(source: str, target: str, max_distance: int = 3) -> int:
        if source == target:
            return 0
        if abs(len(source) - len(target)) > max_distance:
            return max_distance + 1

        previous_row = list(range(len(target) + 1))
        for i, source_char in enumerate(source, start=1):
            current_row = [i]
            row_min = current_row[0]

            for j, target_char in enumerate(target, start=1):
                insertions = previous_row[j] + 1
                deletions = current_row[j - 1] + 1
                substitutions = previous_row[j - 1] + (source_char != target_char)
                cost = min(insertions, deletions, substitutions)
                current_row.append(cost)
                if cost < row_min:
                    row_min = cost

            if row_min > max_distance:
                return max_distance + 1
            previous_row = current_row

        return previous_row[-1]


class TextPreprocessor(TextCleaner):
    # Backward-compatible alias used by the existing NLP batch pipeline.
    def normalize(self, text: str) -> str:
        return self.clean(text)
