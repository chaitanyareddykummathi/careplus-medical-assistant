import threading
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.responses import Response

from app.core.config import get_settings
from app.core.observability import record_rate_limit_rejection
from app.services.cache_service import cache_service

settings = get_settings()


class _InMemoryLimiter:
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


in_memory_limiter = _InMemoryLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        is_target_path = (
            request.method.upper() == 'POST'
            and request.url.path == f"{settings.api_v1_prefix}/nlp/analyze"
        )
        if not is_target_path:
            return await call_next(request)

        window_seconds = 60
        ip_address = request.client.host if request.client else 'unknown'
        minute_bucket = int(time.time() // window_seconds)
        key = f'ratelimit:middleware:nlp:analyze:{ip_address}:{minute_bucket}'

        count = cache_service.increment(key=key, window_seconds=window_seconds)
        if count is None:
            count = in_memory_limiter.hit(key=key, window_seconds=window_seconds)

        if count > settings.analysis_rate_limit_per_minute:
            record_rate_limit_rejection(endpoint='/nlp/analyze')
            return JSONResponse(
                status_code=429,
                content={
                    'error_code': 'RATE_LIMITED',
                    'message': 'Too many NLP analysis requests. Please retry shortly.',
                },
            )

        return await call_next(request)
