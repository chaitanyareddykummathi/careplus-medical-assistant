from datetime import date

from sqlalchemy.orm import Session

from app.core.errors import AppException
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentReschedule
from app.services.hospital_service import hospital_service


class AppointmentService:
    def list_user_appointments(self, db: Session, current_user: User) -> list[Appointment]:
        return (
            db.query(Appointment)
            .filter(Appointment.user_id == current_user.id)
            .order_by(Appointment.appointment_date.asc(), Appointment.time_slot.asc())
            .all()
        )

    def book(self, db: Session, current_user: User, payload: AppointmentCreate) -> Appointment:
        if payload.appointment_date < date.today():
            raise AppException(422, "PAST_APPOINTMENT_DATE", "Appointment date cannot be in the past.")

        hospital = hospital_service.get_hospital(payload.hospital_id)
        if not hospital:
            raise AppException(404, "HOSPITAL_NOT_FOUND", "Selected hospital was not found.")

        doctor = hospital_service.get_doctor(payload.hospital_id, payload.doctor_id)
        if not doctor:
            raise AppException(404, "DOCTOR_NOT_FOUND", "Selected doctor was not found for this hospital.")

        if payload.department not in hospital["departments"]:
            raise AppException(422, "INVALID_DEPARTMENT", "Selected department is not available at this hospital.")

        appointment = Appointment(
            user_id=current_user.id,
            hospital_id=hospital["id"],
            hospital_name=hospital["name"],
            department=payload.department,
            doctor_id=doctor["id"],
            doctor_name=doctor["name"],
            appointment_date=payload.appointment_date,
            time_slot=payload.time_slot,
            patient_name=payload.patient_name,
            reason=payload.reason,
            status="upcoming",
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return appointment

    def cancel(self, db: Session, current_user: User, appointment_id: int) -> Appointment:
        appointment = self._get_owned(db, current_user, appointment_id)
        if appointment.status == "cancelled":
            return appointment
        appointment.status = "cancelled"
        db.commit()
        db.refresh(appointment)
        return appointment

    def reschedule(
        self,
        db: Session,
        current_user: User,
        appointment_id: int,
        payload: AppointmentReschedule,
    ) -> Appointment:
        if payload.appointment_date < date.today():
            raise AppException(422, "PAST_APPOINTMENT_DATE", "Appointment date cannot be in the past.")

        appointment = self._get_owned(db, current_user, appointment_id)
        if appointment.status == "cancelled":
            raise AppException(422, "CANCELLED_APPOINTMENT", "Cancelled appointments cannot be rescheduled.")

        appointment.appointment_date = payload.appointment_date
        appointment.time_slot = payload.time_slot.strip()
        appointment.status = "rescheduled"
        db.commit()
        db.refresh(appointment)
        return appointment

    def _get_owned(self, db: Session, current_user: User, appointment_id: int) -> Appointment:
        appointment = (
            db.query(Appointment)
            .filter(Appointment.id == appointment_id, Appointment.user_id == current_user.id)
            .first()
        )
        if not appointment:
            raise AppException(404, "APPOINTMENT_NOT_FOUND", "Appointment was not found.")
        return appointment


appointment_service = AppointmentService()
