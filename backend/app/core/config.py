import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent

load_dotenv(PROJECT_DIR / '.env')
load_dotenv(BACKEND_DIR / '.env')


def _as_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def _as_csv(value: str | None, default: list[str]) -> list[str]:
    if value is None:
        return default
    parsed = [item.strip() for item in value.split(',') if item.strip()]
    return parsed or default


@dataclass(frozen=True)
class Settings:
    app_name: str
    environment: str
    debug: bool
    api_v1_prefix: str
    database_url: str
    db_pool_size: int
    db_max_overflow: int
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_token_exp_minutes: int
    google_oauth_client_id: str | None
    cors_allow_origins: tuple[str, ...]
    redis_url: str | None
    celery_broker_url: str | None
    celery_result_backend: str | None
    cache_ttl_seconds: int
    analysis_job_max_retries: int
    analysis_retry_backoff_seconds: int
    analysis_rate_limit_per_minute: int
    analysis_worker_batch_size: int
    worker_health_timeout_seconds: int
    log_level: str
    tracing_enabled: bool
    nlp_batch_size: int
    nlp_warmup_enabled: bool
    vector_ivfflat_lists: int
    vector_ivfflat_probes: int
    medical_ner_model: str
    classifier_model: str
    embedding_model: str
    embedding_dimension: int
    model_version_tag: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    database_url = os.getenv('DB_URL') or os.getenv('DATABASE_URL')
    if not database_url:
        raise RuntimeError('Set DB_URL or DATABASE_URL in environment.')

    environment = os.getenv('APP_ENV', 'development')
    jwt_secret_key = os.getenv('JWT_SECRET_KEY') or os.getenv('JWT_SECRET')
    if not jwt_secret_key and environment.lower() not in {'development', 'dev', 'local', 'test'}:
        raise RuntimeError('Set JWT_SECRET_KEY in environment.')

    return Settings(
        app_name=os.getenv('APP_NAME', 'CarePlus Medical Assistant'),
        environment=environment,
        debug=_as_bool(os.getenv('APP_DEBUG'), False),
        api_v1_prefix=os.getenv('API_V1_PREFIX', '/api/v1'),
        database_url=database_url,
        db_pool_size=_as_int(os.getenv('DB_POOL_SIZE'), 10),
        db_max_overflow=_as_int(os.getenv('DB_MAX_OVERFLOW'), 20),
        jwt_secret_key=jwt_secret_key or 'change-me-in-production',
        jwt_algorithm=os.getenv('JWT_ALGORITHM', 'HS256'),
        jwt_access_token_exp_minutes=_as_int(os.getenv('JWT_ACCESS_TOKEN_EXP_MINUTES'), 30),
        google_oauth_client_id=(
            os.getenv('GOOGLE_OAUTH_CLIENT_ID')
            or os.getenv('GOOGLE_CLIENT_ID')
            or os.getenv('REACT_APP_GOOGLE_CLIENT_ID')
        ),
        cors_allow_origins=tuple(
            _as_csv(
                os.getenv('CORS_ALLOW_ORIGINS'),
                [
                    'http://localhost:3000',
                    'http://127.0.0.1:3000',
                    'http://localhost:5173',
                    'http://127.0.0.1:5173',
                ],
            )
        ),
        redis_url=os.getenv('REDIS_URL'),
        celery_broker_url=os.getenv('CELERY_BROKER_URL'),
        celery_result_backend=os.getenv('CELERY_RESULT_BACKEND'),
        cache_ttl_seconds=_as_int(os.getenv('CACHE_TTL_SECONDS'), 300),
        analysis_job_max_retries=_as_int(os.getenv('ANALYSIS_JOB_MAX_RETRIES'), 3),
        analysis_retry_backoff_seconds=_as_int(os.getenv('ANALYSIS_RETRY_BACKOFF_SECONDS'), 20),
        analysis_rate_limit_per_minute=_as_int(os.getenv('ANALYSIS_RATE_LIMIT_PER_MINUTE'), 30),
        analysis_worker_batch_size=_as_int(os.getenv('ANALYSIS_WORKER_BATCH_SIZE'), 8),
        worker_health_timeout_seconds=_as_int(os.getenv('WORKER_HEALTH_TIMEOUT_SECONDS'), 2),
        log_level=os.getenv('LOG_LEVEL', 'INFO'),
        tracing_enabled=_as_bool(os.getenv('TRACING_ENABLED'), True),
        nlp_batch_size=_as_int(os.getenv('NLP_BATCH_SIZE'), 8),
        nlp_warmup_enabled=_as_bool(os.getenv('NLP_WARMUP_ENABLED'), True),
        vector_ivfflat_lists=_as_int(os.getenv('VECTOR_IVFFLAT_LISTS'), 100),
        vector_ivfflat_probes=_as_int(os.getenv('VECTOR_IVFFLAT_PROBES'), 10),
        medical_ner_model=os.getenv('MEDICAL_NER_MODEL', 'en_ner_bc5cdr_md'),
        classifier_model=os.getenv(
            'CLASSIFIER_MODEL',
            'distilbert-base-uncased-finetuned-sst-2-english',
        ),
        embedding_model=os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2'),
        embedding_dimension=_as_int(os.getenv('EMBEDDING_DIMENSION'), 384),
        model_version_tag=os.getenv('MODEL_VERSION_TAG', 'v1'),
    )
