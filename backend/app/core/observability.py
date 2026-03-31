import logging
import time
from contextlib import contextmanager
from typing import Any, Iterator

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class _NoopMetric:
    def labels(self, **_: Any) -> '_NoopMetric':
        return self

    def inc(self, _: float = 1.0) -> None:
        return None

    def observe(self, _: float) -> None:
        return None


try:
    from prometheus_client import CONTENT_TYPE_LATEST, REGISTRY, Counter, Histogram, generate_latest

    METRICS_ENABLED = True
except Exception:  # pragma: no cover
    CONTENT_TYPE_LATEST = 'text/plain; version=0.0.4'

    def generate_latest() -> bytes:  # type: ignore[misc]
        return b''

    Counter = Histogram = None
    METRICS_ENABLED = False


if METRICS_ENABLED:
    def _get_or_create_histogram(name: str, documentation: str, labelnames: tuple[str, ...]):
        try:
            return Histogram(name, documentation, labelnames=labelnames)
        except ValueError:
            collector = REGISTRY._names_to_collectors.get(name)  # type: ignore[attr-defined]
            if collector is None:
                raise
            return collector

    def _get_or_create_counter(name: str, documentation: str, labelnames: tuple[str, ...]):
        try:
            return Counter(name, documentation, labelnames=labelnames)
        except ValueError:
            collector = REGISTRY._names_to_collectors.get(name)  # type: ignore[attr-defined]
            if collector is None:
                raise
            return collector

    nlp_stage_latency_seconds = _get_or_create_histogram(
        'careplus_nlp_stage_latency_seconds',
        'Latency by NLP stage.',
        ('stage',),
    )
    analysis_jobs_total = _get_or_create_counter(
        'careplus_analysis_jobs_total',
        'Total analysis job transitions by status.',
        ('status',),
    )
    rate_limit_rejections_total = _get_or_create_counter(
        'careplus_rate_limit_rejections_total',
        'Total rate limit rejections by endpoint.',
        ('endpoint',),
    )
else:
    nlp_stage_latency_seconds = _NoopMetric()
    analysis_jobs_total = _NoopMetric()
    rate_limit_rejections_total = _NoopMetric()


try:
    from opentelemetry import trace

    tracer = trace.get_tracer('careplus.backend')
except Exception:  # pragma: no cover
    tracer = None


@contextmanager
def traced_span(name: str, attributes: dict[str, Any] | None = None) -> Iterator[Any]:
    if tracer is None or not settings.tracing_enabled:
        yield None
        return

    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        yield span


@contextmanager
def observe_stage(stage: str) -> Iterator[None]:
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        nlp_stage_latency_seconds.labels(stage=stage).observe(elapsed)


def record_job_status(status: str) -> None:
    analysis_jobs_total.labels(status=status).inc()


def record_rate_limit_rejection(endpoint: str) -> None:
    rate_limit_rejections_total.labels(endpoint=endpoint).inc()


def export_metrics() -> tuple[bytes, str]:
    if not METRICS_ENABLED:
        logger.warning('Prometheus client is unavailable; metrics endpoint is disabled.')
    return generate_latest(), CONTENT_TYPE_LATEST
