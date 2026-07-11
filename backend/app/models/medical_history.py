from sqlalchemy import Column, Integer, String, ForeignKey, Date, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class MedicalHistory(Base):
    __tablename__ = "medical_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    condition_name = Column(String(255), nullable=False)
    diagnosed_date = Column(Date, nullable=True)
    severity = Column(String(32), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(32), default="active", nullable=False)

    user = relationship("User", back_populates="medical_histories")
