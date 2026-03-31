import re


class TextPreprocessor:
    _invalid_chars = re.compile(r'[^a-z0-9\s.,!?/-]')
    _spaces = re.compile(r'\s+')

    def normalize(self, text: str) -> str:
        normalized = text.strip().lower()
        normalized = self._invalid_chars.sub(' ', normalized)
        normalized = self._spaces.sub(' ', normalized)
        return normalized.strip()
