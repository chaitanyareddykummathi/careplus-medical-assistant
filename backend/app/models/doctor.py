from sqlalchemy import Column, String, Integer, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(80), primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    hospital_id = Column(String(80), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    specialty = Column(String(120), nullable=False, index=True)
    experience_years = Column(Integer, default=0, nullable=False)
    qualification = Column(String(120), default="MBBS MD", nullable=False)
    languages = Column(String(200), default="English, Hindi", nullable=False)
    consultation_fee = Column(Integer, default=1000, nullable=False)
    rating = Column(Float, default=5.0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    gender = Column(String(20), default="Male", nullable=False)
    available_days = Column(String(100), default="Mon, Tue, Wed, Thu, Fri, Sat", nullable=False)

    # Relationships
    hospital = relationship("Hospital", back_populates="doctors")
    department = relationship("Department", back_populates="doctors")
    availabilities = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
