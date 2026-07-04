from datetime import date, datetime
from sqlalchemy.orm import Session

from app.core.errors import AppException
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentReschedule
from app.services.hospital_service import hospital_service


def check_past_appointment(appointment_date: date, time_slot: str) -> bool:
    try:
        slot_time = datetime.strptime(time_slot.strip(), "%I:%M %p").time()
        combined_dt = datetime.combine(appointment_date, slot_time)
        return combined_dt <= datetime.now()
    except Exception:
        return appointment_date < date.today()


class AppointmentService:
    @staticmethod
    def _ensure_future_slot(appointment_date: date, time_slot: str) -> None:
        if appointment_date < date.today():
            raise AppException(
                422,
                "PAST_DATE_NOT_ALLOWED",
                "You cannot book appointments for past dates.",
            )

        if appointment_date == date.today():
            try:
                selected_time = datetime.strptime(time_slot.strip(), "%I:%M %p").time()
            except ValueError:
                raise AppException(422, "INVALID_TIME_SLOT", "Invalid time slot format.")

            if selected_time <= datetime.now().time():
                raise AppException(
                    422,
                    "PAST_TIME_SLOT_NOT_ALLOWED",
                    "This time slot has already passed.",
                )

    def list_user_appointments(self, db: Session, current_user: User) -> list[Appointment]:
        appointments = (
            db.query(Appointment)
            .filter(Appointment.user_id == current_user.id)
            .all()
        )
        updated = False
        for apt in appointments:
            if apt.status in {"upcoming", "rescheduled"} and check_past_appointment(apt.appointment_date, apt.time_slot):
                apt.status = "completed"
                apt.completed_at = datetime.now()
                updated = True
        if updated:
            db.commit()
            for apt in appointments:
                db.refresh(apt)

        return sorted(appointments, key=lambda a: (a.appointment_date, a.time_slot))

    def book(self, db: Session, current_user: User, payload: AppointmentCreate) -> Appointment:
        self._ensure_future_slot(payload.appointment_date, payload.time_slot)

        hospital = hospital_service.get_hospital(payload.hospital_id)
        if not hospital:
            raise AppException(404, "HOSPITAL_NOT_FOUND", "Selected hospital was not found.")

        doctor = hospital_service.get_doctor(payload.hospital_id, payload.doctor_id)
        if not doctor:
            raise AppException(404, "DOCTOR_NOT_FOUND", "Selected doctor was not found for this hospital.")

        if payload.department not in hospital["departments"]:
            raise AppException(422, "INVALID_DEPARTMENT", "Selected department is not available at this hospital.")

        # Check duplicate booking
        existing_user_apt = (
            db.query(Appointment)
            .filter(
                Appointment.user_id == current_user.id,
                Appointment.doctor_id == payload.doctor_id,
                Appointment.appointment_date == payload.appointment_date,
                Appointment.time_slot == payload.time_slot,
                Appointment.status != "cancelled"
            )
            .first()
        )
        if existing_user_apt:
            raise AppException(
                422,
                "DUPLICATE_BOOKING",
                "You already have an appointment booked for this slot."
            )

        # Check slot availability / Fully Booked (capacity = 1)
        existing_doc_apt = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == payload.doctor_id,
                Appointment.appointment_date == payload.appointment_date,
                Appointment.time_slot == payload.time_slot,
                Appointment.status != "cancelled"
            )
            .first()
        )
        if existing_doc_apt:
            raise AppException(
                422,
                "FULLY_BOOKED",
                "This slot is fully booked for this doctor."
            )

        appointment = Appointment(
            user_id=current_user.id,
            hospital_id=hospital["id"],
            hospital_name=hospital["name"],
            department=payload.department,
            doctor_id=doctor["id"],
            doctor_name=doctor["name"],
            appointment_date=payload.appointment_date,
            time_slot=payload.time_slot,
            appointment_time=payload.time_slot,
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
        
        if check_past_appointment(appointment.appointment_date, appointment.time_slot) or appointment.status == "completed":
            raise AppException(
                422,
                "PAST_APPOINTMENT_MODIFICATION_NOT_ALLOWED",
                "Completed appointments cannot be cancelled."
            )

        if appointment.status == "cancelled":
            return appointment
            
        appointment.status = "cancelled"
        appointment.cancelled_at = datetime.now()
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
        appointment = self._get_owned(db, current_user, appointment_id)
        
        if check_past_appointment(appointment.appointment_date, appointment.time_slot) or appointment.status == "completed":
            raise AppException(
                422,
                "PAST_APPOINTMENT_MODIFICATION_NOT_ALLOWED",
                "Past appointments cannot be modified."
            )

        if appointment.status == "cancelled":
            raise AppException(422, "CANCELLED_APPOINTMENT", "Cancelled appointments cannot be rescheduled.")

        self._ensure_future_slot(payload.appointment_date, payload.time_slot)

        # Check duplicate booking
        existing_user_apt = (
            db.query(Appointment)
            .filter(
                Appointment.user_id == current_user.id,
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.appointment_date == payload.appointment_date,
                Appointment.time_slot == payload.time_slot,
                Appointment.status != "cancelled",
                Appointment.id != appointment_id
            )
            .first()
        )
        if existing_user_apt:
            raise AppException(
                422,
                "DUPLICATE_BOOKING",
                "You already have an appointment booked for this slot."
            )

        # Check slot availability
        existing_doc_apt = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.appointment_date == payload.appointment_date,
                Appointment.time_slot == payload.time_slot,
                Appointment.status != "cancelled",
                Appointment.id != appointment_id
            )
            .first()
        )
        if existing_doc_apt:
            raise AppException(
                422,
                "FULLY_BOOKED",
                "This slot is fully booked for this doctor."
            )

        appointment.appointment_date = payload.appointment_date
        appointment.time_slot = payload.time_slot.strip()
        appointment.appointment_time = payload.time_slot.strip()
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
