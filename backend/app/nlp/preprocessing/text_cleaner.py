import re
from collections.abc import Iterable


class TextCleaner:
    _invalid_chars = re.compile(r"[^a-z0-9\s.,!?'/\-]")
    _spaces = re.compile(r'\s+')
    _token_pattern = re.compile(r"[a-z0-9]+'?[a-z0-9]*")

    def clean(self, text: str) -> str:
        normalized = (text or '').strip().lower()
        normalized = self._invalid_chars.sub(' ', normalized)
        normalized = self._spaces.sub(' ', normalized)
        return normalized.strip()

    def tokenize(self, text: str) -> list[str]:
        cleaned = self.clean(text)
        if not cleaned:
            return []
        return self._token_pattern.findall(cleaned)

    def clean_and_tokenize(self, text: str) -> tuple[str, list[str]]:
        cleaned = self.clean(text)
        tokens = self._token_pattern.findall(cleaned) if cleaned else []
        return cleaned, tokens

    def deduplicate(self, tokens: Iterable[str]) -> list[str]:
        unique: list[str] = []
        for token in tokens:
            if token and token not in unique:
                unique.append(token)
        return unique


class TextPreprocessor(TextCleaner):
    # Backward-compatible alias used by the existing NLP batch pipeline.
    def normalize(self, text: str) -> str:
        return self.clean(text)
