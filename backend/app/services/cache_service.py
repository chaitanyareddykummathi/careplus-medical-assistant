import json
import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

try:
    import redis
except Exception:  # pragma: no cover
    redis = None


class CacheService:
    def __init__(self) -> None:
        self._client = None
        if redis and settings.redis_url:
            try:
                self._client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
                self._client.ping()
            except Exception:
                logger.warning('Redis is unavailable, continuing without cache.')
                self._client = None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def get_json(self, key: str) -> dict[str, Any] | None:
        if not self._client:
            return None

        raw_value = self._client.get(key)
        if not raw_value:
            return None

        try:
            return json.loads(raw_value)
        except json.JSONDecodeError:
            return None

    def set_json(self, key: str, payload: dict[str, Any], ttl_seconds: int | None = None) -> None:
        if not self._client:
            return

        ttl = ttl_seconds if ttl_seconds is not None else settings.cache_ttl_seconds
        self._client.setex(key, ttl, json.dumps(payload))

    def increment(self, key: str, window_seconds: int) -> int | None:
        if not self._client:
            return None

        try:
            value = int(self._client.incr(key))
            if value == 1:
                self._client.expire(key, window_seconds)
            return value
        except Exception:
            logger.warning('Failed to increment rate-limit key in Redis.')
            return None


cache_service = CacheService()
