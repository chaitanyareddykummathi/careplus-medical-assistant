from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_roles
from app.api.deps.rate_limit import get_rate_limited_analysis_user
from app.db.deps import get_db
from app.models.user import User
from app.schemas.jobs import (
    AnalysisJobEnqueueResponse,
    AnalysisJobResultResponse,
    AnalysisJobStatusResponse,
)
from app.schemas.nlp import NLPAnalyzeRequest
from app.services.job_service import analysis_job_service

router = APIRouter(prefix='/nlp', tags=['NLP'])


@router.post('/analyze', response_model=AnalysisJobEnqueueResponse, status_code=status.HTTP_202_ACCEPTED)
def enqueue_analysis(
    payload: NLPAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_rate_limited_analysis_user),
) -> AnalysisJobEnqueueResponse:
    return analysis_job_service.enqueue(db=db, current_user=current_user, payload=payload)


@router.get('/jobs/{job_id}', response_model=AnalysisJobStatusResponse)
def get_analysis_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('patient', 'clinician', 'admin')),
) -> AnalysisJobStatusResponse:
    return analysis_job_service.get_job_status(db=db, current_user=current_user, job_id=job_id)


@router.get('/jobs/{job_id}/result', response_model=AnalysisJobResultResponse)
def get_analysis_result(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('patient', 'clinician', 'admin')),
) -> AnalysisJobResultResponse:
    return analysis_job_service.get_job_result(db=db, current_user=current_user, job_id=job_id)
