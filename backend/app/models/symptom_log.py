from sqlalchemy import JSON, Column, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class SymptomLog(TimestampMixin, Base):
    __tablename__ = 'symptom_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    input_text = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=False)
    extracted_symptoms = Column(JSON, nullable=False, default=list)
    risk_level = Column(String(16), nullable=False, index=True)
    possible_conditions = Column(JSON, nullable=False, default=list)
    recommendation = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    analysis_metadata = Column(JSON, nullable=False, default=dict)

    user = relationship('User', back_populates='symptom_logs')

    __table_args__ = (
        Index('ix_symptom_logs_user_created', 'user_id', 'created_at'),
    )

