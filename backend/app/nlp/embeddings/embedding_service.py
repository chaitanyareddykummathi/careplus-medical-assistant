import hashlib
import threading


class EmbeddingGenerator:
    def __init__(self, model_name: str, dimension: int) -> None:
        self.model_name = model_name
        self.dimension = dimension
        self._model = None
        self._initialized = False
        self._lock = threading.Lock()

    def _load_model(self) -> None:
        if self._initialized:
            return

        with self._lock:
            if self._initialized:
                return

            try:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(self.model_name)
            except Exception:
                self._model = None

            self._initialized = True

    def generate(self, text: str) -> list[float]:
        self._load_model()

        if self._model is not None:
            vector = self._model.encode(text, normalize_embeddings=True)
            return [float(value) for value in vector[: self.dimension]]

        return self._deterministic_fallback_embedding(text)

    def _deterministic_fallback_embedding(self, text: str) -> list[float]:
        vector: list[float] = []
        seed = text.encode('utf-8')
        cursor = seed

        while len(vector) < self.dimension:
            cursor = hashlib.sha256(cursor).digest()
            vector.extend(((byte / 255.0) * 2.0) - 1.0 for byte in cursor)

        return vector[: self.dimension]
