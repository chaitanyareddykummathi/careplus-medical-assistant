from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_roles
from app.db.deps import get_db
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentEnvelope,
    AppointmentListResponse,
    AppointmentReschedule,
)
from app.services.appointment_service import appointment_service

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("", response_model=AppointmentListResponse)
def list_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "clinician", "admin")),
) -> AppointmentListResponse:
    return AppointmentListResponse(data=appointment_service.list_user_appointments(db, current_user))


@router.post("", response_model=AppointmentEnvelope, status_code=status.HTTP_201_CREATED)
def book_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "clinician", "admin")),
) -> AppointmentEnvelope:
    appointment = appointment_service.book(db, current_user, payload)
    return AppointmentEnvelope(message="Appointment booked successfully.", data=appointment)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentEnvelope)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "clinician", "admin")),
) -> AppointmentEnvelope:
    appointment = appointment_service.cancel(db, current_user, appointment_id)
    return AppointmentEnvelope(message="Appointment cancelled successfully.", data=appointment)


from datetime import date
from pydantic import BaseModel
from app.models.appointment import Appointment

class BookedSlotsResponse(BaseModel):
    booked_slots: list[str]


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentEnvelope)
def reschedule_appointment(
    appointment_id: int,
    payload: AppointmentReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "clinician", "admin")),
) -> AppointmentEnvelope:
    appointment = appointment_service.reschedule(db, current_user, appointment_id, payload)
    return AppointmentEnvelope(message="Appointment rescheduled successfully.", data=appointment)


@router.get("/booked-slots", response_model=BookedSlotsResponse)
def get_booked_slots(
    doctor_id: str,
    appointment_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("patient", "clinician", "admin")),
) -> BookedSlotsResponse:
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_date,
            Appointment.status != "cancelled"
        )
        .all()
    )
    booked_slots = [apt.time_slot for apt in appointments]
    return BookedSlotsResponse(booked_slots=booked_slots)
