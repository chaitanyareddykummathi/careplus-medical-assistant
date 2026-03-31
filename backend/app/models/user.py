from sqlalchemy import Boolean, Column, Integer, String
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

    symptom_records = relationship(
        'SymptomRecord',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='selectin',
    )
