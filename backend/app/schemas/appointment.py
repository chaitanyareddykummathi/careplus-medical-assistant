from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AppointmentCreate(BaseModel):
    hospital_id: str = Field(min_length=2, max_length=80)
    department: str = Field(min_length=2, max_length=120)
    doctor_id: str = Field(min_length=2, max_length=80)
    appointment_date: date
    time_slot: str = Field(min_length=4, max_length=32)
    patient_name: str = Field(min_length=2, max_length=120)
    reason: str | None = Field(default=None, max_length=1000)

    @field_validator("patient_name", "department", "time_slot")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value cannot be empty")
        return cleaned


class AppointmentReschedule(BaseModel):
    appointment_date: date
    time_slot: str = Field(min_length=4, max_length=32)


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hospital_id: str
    hospital_name: str
    department: str
    doctor_id: str
    doctor_name: str
    appointment_date: date
    time_slot: str
    appointment_time: str | None = None
    patient_name: str
    reason: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None


class AppointmentEnvelope(BaseModel):
    success: bool = True
    message: str
    data: AppointmentResponse


class AppointmentListResponse(BaseModel):
    success: bool = True
    message: str = "Appointments retrieved successfully."
    data: list[AppointmentResponse]
