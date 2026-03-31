import hashlib
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppException
from app.core.observability import record_job_status, traced_span
from app.models.health import AnalysisJob
from app.models.user import User
from app.schemas.jobs import (
    AnalysisJobEnqueueResponse,
    AnalysisJobResultResponse,
    AnalysisJobStatusResponse,
)
from app.schemas.nlp import NLPAnalyzeRequest, NLPAnalyzeResponse

settings = get_settings()

IN_FLIGHT_STATUSES = {'queued', 'processing', 'retrying'}


class AnalysisJobService:
    def enqueue(self, db: Session, current_user: User, payload: NLPAnalyzeRequest) -> AnalysisJobEnqueueResponse:
        payload_hash = self._payload_hash(current_user.id, payload)

        existing = (
            db.query(AnalysisJob)
            .filter(
                AnalysisJob.user_id == current_user.id,
                AnalysisJob.payload_hash == payload_hash,
            )
            .order_by(AnalysisJob.id.desc())
            .first()
        )

        if existing and existing.status in IN_FLIGHT_STATUSES:
            return AnalysisJobEnqueueResponse(
                job_id=existing.id,
                status=existing.status,
                task_id=existing.celery_task_id,
            )

        job = AnalysisJob(
            user_id=current_user.id,
            status='queued',
            payload_hash=payload_hash,
            payload={'text': payload.text, 'top_k': payload.top_k},
            max_retries=settings.analysis_job_max_retries,
            retry_count=0,
            queued_at=datetime.now(timezone.utc),
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        with traced_span('analysis.enqueue', {'job_id': job.id, 'user_id': current_user.id}):
            from app.workers.tasks.nlp_tasks import process_analysis_batch

            try:
                async_result = process_analysis_batch.apply_async()
            except Exception as exc:
                job.status = 'failed'
                job.error_code = 'QUEUE_UNAVAILABLE'
                job.error = str(exc)[:1000]
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
                record_job_status('failed')
                raise AppException(
                    status_code=503,
                    error_code='QUEUE_UNAVAILABLE',
                    message='Analysis queue is temporarily unavailable.',
                ) from exc

        job.celery_task_id = async_result.id
        db.commit()

        record_job_status('queued')

        return AnalysisJobEnqueueResponse(
            job_id=job.id,
            status=job.status,
            task_id=job.celery_task_id,
        )

    def get_job_status(self, db: Session, current_user: User, job_id: int) -> AnalysisJobStatusResponse:
        with traced_span('analysis.status', {'job_id': job_id, 'user_id': current_user.id}):
            job = self._get_user_job(db=db, current_user=current_user, job_id=job_id)
        return AnalysisJobStatusResponse(
            job_id=job.id,
            status=job.status,
            retry_count=job.retry_count,
            max_retries=job.max_retries,
            queued_at=job.queued_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            error_code=job.error_code,
            error=job.error,
        )

    def get_job_result(self, db: Session, current_user: User, job_id: int) -> AnalysisJobResultResponse:
        with traced_span('analysis.result', {'job_id': job_id, 'user_id': current_user.id}):
            job = self._get_user_job(db=db, current_user=current_user, job_id=job_id)
            result = NLPAnalyzeResponse(**job.result) if job.result else None

        return AnalysisJobResultResponse(
            job_id=job.id,
            status=job.status,
            result=result,
            error_code=job.error_code,
            error=job.error,
        )

    @staticmethod
    def _get_user_job(db: Session, current_user: User, job_id: int) -> AnalysisJob:
        job = (
            db.query(AnalysisJob)
            .filter(
                AnalysisJob.id == job_id,
                AnalysisJob.user_id == current_user.id,
            )
            .first()
        )
        if not job:
            raise AppException(
                status_code=404,
                error_code='JOB_NOT_FOUND',
                message='Analysis job was not found for this user.',
            )

        return job

    @staticmethod
    def _payload_hash(user_id: int, payload: NLPAnalyzeRequest) -> str:
        raw = f'{user_id}:{payload.top_k}:{payload.text}'.encode('utf-8')
        return hashlib.sha256(raw).hexdigest()


analysis_job_service = AnalysisJobService()
