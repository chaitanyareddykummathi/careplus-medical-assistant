from celery import Celery

from app.core.config import get_settings

settings = get_settings()

broker_url = settings.celery_broker_url or settings.redis_url or 'redis://localhost:6379/0'
result_backend = settings.celery_result_backend or settings.redis_url or broker_url

celery_app = Celery(
    'careplus',
    broker=broker_url,
    backend=result_backend,
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    broker_connection_retry_on_startup=True,
    task_default_queue='nlp',
)
