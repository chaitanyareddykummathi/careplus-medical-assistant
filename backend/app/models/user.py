from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    username = Column(String(50), nullable=True, unique=True, index=True)
    hashed_password = Column('password_hash', String(255), nullable=True)
    is_google_user = Column(Boolean, nullable=False, default=False, index=True)
    role = Column(String(32), nullable=False, default='patient', index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    email_verified = Column(Boolean, nullable=False, default=False, index=True)

    # Security & Password recovery fields
    reset_token = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    refresh_token = Column(String(255), nullable=True)
    refresh_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    lockout_until = Column(DateTime(timezone=True), nullable=True)
    verification_token = Column(String(255), nullable=True)
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    symptom_records = relationship(
        'SymptomRecord',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin',
    )
    health_profile = relationship(
        'UserHealthProfile',
        back_populates='user',
        uselist=False,
        cascade='all, delete-orphan',
        lazy='selectin',
    )
    symptom_logs = relationship(
        'SymptomLog',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin',
    )
    appointments = relationship(
        'Appointment',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin',
    )
    chat_messages = relationship(
        'ChatMessage',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin',
    )
