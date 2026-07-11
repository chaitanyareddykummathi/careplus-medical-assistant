from datetime import date
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.doctor_availability import DoctorAvailability


class DoctorService:
    def list_doctors(self, db: Session, hospital_id: str | None = None, department_id: int | None = None) -> list[Doctor]:
        query = db.query(Doctor)
        if hospital_id:
            query = query.filter(Doctor.hospital_id == hospital_id)
        if department_id:
            query = query.filter(Doctor.department_id == department_id)
        return query.all()

    def get_doctor(self, db: Session, hospital_id: str, doctor_id: str) -> Doctor | None:
        return db.query(Doctor).filter(
            Doctor.hospital_id == hospital_id,
            Doctor.id == doctor_id
        ).first()

    def get_booked_slots(self, db: Session, doctor_id: str, appointment_date: date) -> list[str]:
        """
        Query list of booked slots for a doctor on a specific date.
        """
        slots = db.query(DoctorAvailability.time_slot).filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.available_date == appointment_date,
            DoctorAvailability.is_booked == True
        ).all()
        return [s[0] for s in slots]

    def check_slot_available(self, db: Session, doctor_id: str, appointment_date: date, time_slot: str) -> bool:
        slot = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.available_date == appointment_date,
            DoctorAvailability.time_slot == time_slot
        ).first()
        return slot is not None and not slot.is_booked

    def reserve_slot(self, db: Session, doctor_id: str, appointment_date: date, time_slot: str) -> bool:
        slot = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.available_date == appointment_date,
            DoctorAvailability.time_slot == time_slot
        ).first()
        if slot and not slot.is_booked:
            slot.is_booked = True
            db.commit()
            return True
        return False

    def release_slot(self, db: Session, doctor_id: str, appointment_date: date, time_slot: str) -> None:
        slot = db.query(DoctorAvailability).filter(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.available_date == appointment_date,
            DoctorAvailability.time_slot == time_slot
        ).first()
        if slot:
            slot.is_booked = False
            db.commit()


doctor_service = DoctorService()
