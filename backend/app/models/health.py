from sqlalchemy import JSON, Column, DateTime, Index, Integer, String, Text, func

from app.db.base import Base
from app.models.base import TimestampMixin


class AnalysisJob(TimestampMixin, Base):
    __tablename__ = 'analysis_jobs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    celery_task_id = Column(String(128), nullable=True, unique=True, index=True)
    status = Column(String(32), nullable=False, default='queued', index=True)
    payload_hash = Column(String(64), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    retry_count = Column(Integer, nullable=False, default=0)
    max_retries = Column(Integer, nullable=False, default=3)
    queued_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    started_at = Column(DateTime(timezone=True), nullable=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True, index=True)
    result = Column(JSON, nullable=True)
    model_versions = Column(JSON, nullable=True)
    error_code = Column(String(64), nullable=True)
    error = Column(Text, nullable=True)

    __table_args__ = (
        Index('ix_analysis_jobs_user_status_created', 'user_id', 'status', 'created_at'),
    )
