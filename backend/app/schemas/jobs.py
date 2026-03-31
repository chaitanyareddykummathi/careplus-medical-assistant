from datetime import datetime

from pydantic import BaseModel

from app.schemas.nlp import NLPAnalyzeResponse


class AnalysisJobEnqueueResponse(BaseModel):
    job_id: int
    status: str
    task_id: str | None


class AnalysisJobStatusResponse(BaseModel):
    job_id: int
    status: str
    retry_count: int
    max_retries: int
    queued_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    error_code: str | None
    error: str | None


class AnalysisJobResultResponse(BaseModel):
    job_id: int
    status: str
    result: NLPAnalyzeResponse | None
    error_code: str | None
    error: str | None
