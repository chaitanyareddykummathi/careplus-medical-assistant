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
    normalized_text: str | None = None
    extracted_symptoms: list[str]
    context: dict[str, object] = Field(
        default_factory=lambda: {
            'duration': None,
            'severity': None,
            'frequency': None,
            'body_parts': [],
        }
    )
    risk_level: Literal['LOW', 'MEDIUM', 'HIGH']
    possible_conditions: list[str]
    recommendation: str
    urgency: Literal['Immediate', 'Within 24h', 'Monitor'] = 'Monitor'
    confidence: float = Field(ge=0.0, le=1.0)
    analysis_summary: str | None = None
    condition_explanation: str | None = None
    recommended_specialist: str = "General Physician"
    recommended_department: str = "General Medicine"
    home_care_advice: list[str] = Field(default_factory=list)
    lifestyle_advice: list[str] = Field(default_factory=list)
    warning_signs: list[str] = Field(default_factory=list)
    emergency_symptoms: list[str] = Field(default_factory=list)
    when_to_visit_hospital: str | None = None
    recommended_tests: list[str] = Field(default_factory=list)
    nearby_hospitals: list[dict[str, object]] = Field(default_factory=list)
    nearby_specialists: list[dict[str, object]] = Field(default_factory=list)
    medical_disclaimer: str = (
        "This AI-assisted assessment is for educational triage support only and is not a medical diagnosis. "
        "Consult a qualified doctor for clinical evaluation."
    )
