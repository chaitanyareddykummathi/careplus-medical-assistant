from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SymptomAnalysisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)

    @field_validator('text')
    @classmethod
    def normalize_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError('text cannot be empty')
        return cleaned


class SymptomAnalysisResponse(BaseModel):
    input_text: str
    extracted_symptoms: list[str]
    risk_level: Literal['LOW', 'MEDIUM', 'HIGH']
    possible_conditions: list[str]
    recommendation: str
    confidence: float = Field(ge=0.0, le=1.0)
