from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hospital_id = Column(String(80), nullable=False, index=True)
    hospital_name = Column(String(160), nullable=False)
    department = Column(String(120), nullable=False, index=True)
    doctor_id = Column(String(80), nullable=False)
    doctor_name = Column(String(160), nullable=False)
    appointment_date = Column(Date, nullable=False, index=True)
    time_slot = Column(String(32), nullable=False)
    appointment_time = Column(String(32), nullable=True)
    patient_name = Column(String(120), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="upcoming", index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="appointments")
