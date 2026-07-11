from sqlalchemy import Column, Integer, String, ForeignKey, Date, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class DoctorAvailability(Base):
    __tablename__ = "doctor_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String(80), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    available_date = Column(Date, nullable=False, index=True)
    time_slot = Column(String(32), nullable=False)
    is_booked = Column(Boolean, default=False, nullable=False)

    # Relationships
    doctor = relationship("Doctor", back_populates="availabilities")

    __table_args__ = (
        UniqueConstraint('doctor_id', 'available_date', 'time_slot', name='_doctor_date_slot_uc'),
    )
