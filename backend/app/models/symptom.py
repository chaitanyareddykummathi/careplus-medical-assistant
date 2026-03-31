from sqlalchemy import JSON, Column, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover
    Vector = None


class SymptomRecord(TimestampMixin, Base):
    __tablename__ = 'symptom_records'

    id = Column(Integer, primary_key=True, index=True)
    analysis_job_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    raw_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=False)
    intent = Column(String(64), nullable=False, index=True)
    risk_level = Column(String(16), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)

    entities = Column(JSON, nullable=False, default=list)
    decision = Column(JSON, nullable=False, default=dict)

    if Vector is not None:
        embedding = Column(Vector(384), nullable=True)
    else:
        embedding = Column(JSON, nullable=True)

    user = relationship('User', back_populates='symptom_records')

    __table_args__ = (
        Index('ix_symptom_records_user_created_at', 'user_id', 'created_at'),
    )
