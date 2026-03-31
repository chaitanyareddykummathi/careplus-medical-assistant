from fastapi import APIRouter, Depends

from app.api.deps.auth import require_roles
from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.models.user import User
from app.schemas.common import HealthResponse, WorkerHealthResponse

settings = get_settings()
router = APIRouter(prefix='/health', tags=['Health'])


@router.get('', response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status='ok', service='careplus-api')


@router.get('/worker', response_model=WorkerHealthResponse)
def worker_health_check(_: User = Depends(require_roles('admin'))) -> WorkerHealthResponse:
    broker_connected = True
    try:
        workers = celery_app.control.ping(timeout=float(settings.worker_health_timeout_seconds))
    except Exception:
        broker_connected = False
        workers = []

    workers_available = len(workers or [])
    status = 'ok' if broker_connected and workers_available > 0 else 'degraded'

    return WorkerHealthResponse(
        status=status,
        service='careplus-nlp-worker',
        workers_available=workers_available,
        broker_connected=broker_connected,
    )
