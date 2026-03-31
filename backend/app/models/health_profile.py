from sqlalchemy import JSON, Column, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class UserHealthProfile(TimestampMixin, Base):
    __tablename__ = 'user_health_profiles'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(32), nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)
    blood_pressure = Column(String(16), nullable=True)
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    existing_conditions = Column(JSON, nullable=False, default=list)

    user = relationship('User', back_populates='health_profile')

    __table_args__ = (
        UniqueConstraint('user_id', name='uq_user_health_profiles_user_id'),
        Index('ix_user_health_profiles_user_created', 'user_id', 'created_at'),
    )

