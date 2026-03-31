import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


BP_PATTERN = re.compile(r'^\s*(\d{2,3})\s*[/\-]\s*(\d{2,3})\s*$')


class HealthProfileCreate(BaseModel):
    age: int = Field(ge=0, le=120)
    gender: str = Field(min_length=1, max_length=32)
    height_cm: float = Field(gt=0, le=300)
    weight_kg: float = Field(gt=0, le=500)
    blood_pressure: str | None = Field(default=None, max_length=16)
    systolic_bp: int | None = Field(default=None, ge=60, le=260)
    diastolic_bp: int | None = Field(default=None, ge=30, le=180)
    heart_rate: int | None = Field(default=None, ge=20, le=250)
    existing_conditions: list[str] = Field(default_factory=list, max_length=50)

    @field_validator('gender')
    @classmethod
    def normalize_gender(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned:
            raise ValueError('gender cannot be empty')
        return cleaned

    @field_validator('existing_conditions')
    @classmethod
    def normalize_conditions(cls, value: list[str]) -> list[str]:
        normalized = [item.strip().lower() for item in value if item and item.strip()]
        deduplicated: list[str] = []
        for item in normalized:
            if item not in deduplicated:
                deduplicated.append(item)
        return deduplicated

    @field_validator('blood_pressure')
    @classmethod
    def validate_blood_pressure(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None

        if not BP_PATTERN.match(cleaned):
            raise ValueError("blood_pressure must be in 'systolic/diastolic' format")
        return cleaned

    @model_validator(mode='after')
    def validate_bp_components(self) -> 'HealthProfileCreate':
        if (self.systolic_bp is None) != (self.diastolic_bp is None):
            raise ValueError('Provide both systolic_bp and diastolic_bp together')
        return self


class HealthProfileUpdate(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, min_length=1, max_length=32)
    height_cm: float | None = Field(default=None, gt=0, le=300)
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    blood_pressure: str | None = Field(default=None, max_length=16)
    systolic_bp: int | None = Field(default=None, ge=60, le=260)
    diastolic_bp: int | None = Field(default=None, ge=30, le=180)
    heart_rate: int | None = Field(default=None, ge=20, le=250)
    existing_conditions: list[str] | None = Field(default=None, max_length=50)

    @field_validator('gender')
    @classmethod
    def normalize_gender(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower()
        if not cleaned:
            return None
        return cleaned

    @field_validator('existing_conditions')
    @classmethod
    def normalize_conditions(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized = [item.strip().lower() for item in value if item and item.strip()]
        deduplicated: list[str] = []
        for item in normalized:
            if item not in deduplicated:
                deduplicated.append(item)
        return deduplicated

    @field_validator('blood_pressure')
    @classmethod
    def validate_blood_pressure(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if not BP_PATTERN.match(cleaned):
            raise ValueError("blood_pressure must be in 'systolic/diastolic' format")
        return cleaned

    @model_validator(mode='after')
    def validate_payload(self) -> 'HealthProfileUpdate':
        if (self.systolic_bp is None) != (self.diastolic_bp is None):
            raise ValueError('Provide both systolic_bp and diastolic_bp together')

        if not any(
            value is not None
            for value in (
                self.age,
                self.gender,
                self.height_cm,
                self.weight_kg,
                self.blood_pressure,
                self.systolic_bp,
                self.diastolic_bp,
                self.heart_rate,
                self.existing_conditions,
            )
        ):
            raise ValueError('At least one field must be provided for update')

        return self


class HealthProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    bmi: float
    blood_pressure: str | None
    systolic_bp: int | None
    diastolic_bp: int | None
    heart_rate: int | None
    existing_conditions: list[str]
    created_at: datetime
    updated_at: datetime

