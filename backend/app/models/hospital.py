from sqlalchemy import Table, Column, String, Integer, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import relationship

from app.db.base import Base

hospital_departments = Table(
    "hospital_departments",
    Base.metadata,
    Column("hospital_id", String(80), ForeignKey("hospitals.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", Integer, ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True),
)


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String(80), primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    rating = Column(Float, default=0.0, nullable=False, index=True)
    opening_hours = Column(String(255), nullable=False)
    emergency_available = Column(Boolean, default=False, nullable=False)
    description = Column(Text, nullable=True)
    consultation_fee = Column(Integer, default=0, nullable=False)
    distance_km = Column(Float, default=0.0, nullable=False)
    image_url = Column(String(500), nullable=True)

    # Relationships
    doctors = relationship("Doctor", back_populates="hospital", cascade="all, delete-orphan")
    departments = relationship("Department", secondary=hospital_departments)
