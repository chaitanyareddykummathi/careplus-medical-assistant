import threading
import time

from fastapi import Depends, HTTPException, Request, status

from app.api.deps.auth import require_roles
from app.core.config import get_settings
from app.core.observability import record_rate_limit_rejection
from app.models.user import User
from app.services.cache_service import cache_service

settings = get_settings()


class _InMemoryRateLimiter:
    def __init__(self) -> None:
        self._window_cache: dict[str, tuple[int, float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str, window_seconds: int) -> int:
        now = time.time()
        with self._lock:
            count, reset_at = self._window_cache.get(key, (0, now + window_seconds))
            if now > reset_at:
                count, reset_at = 0, now + window_seconds
            count += 1
            self._window_cache[key] = (count, reset_at)
            return count


in_memory_rate_limiter = _InMemoryRateLimiter()


def get_rate_limited_analysis_user(
    request: Request,
    current_user: User = Depends(require_roles('patient', 'clinician', 'admin')),
) -> User:
    window_seconds = 60
    ip_address = request.client.host if request.client else 'unknown'
    key = f'ratelimit:nlp:analyze:{current_user.id}:{ip_address}:{int(time.time() // window_seconds)}'

    count = cache_service.increment(key=key, window_seconds=window_seconds)
    if count is None:
        count = in_memory_rate_limiter.hit(key=key, window_seconds=window_seconds)

    if count > settings.analysis_rate_limit_per_minute:
        record_rate_limit_rejection(endpoint='/nlp/analyze')
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail='Rate limit exceeded for NLP analysis requests. Try again shortly.',
        )

    return current_user
