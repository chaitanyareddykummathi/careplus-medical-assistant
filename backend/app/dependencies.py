from app.services.health_profile_service import HealthProfileService, health_profile_service
from app.services.symptom_analysis_service import (
    SymptomAnalysisService,
    symptom_analysis_service,
)


def get_health_profile_service() -> HealthProfileService:
    return health_profile_service


def get_symptom_analysis_service() -> SymptomAnalysisService:
    return symptom_analysis_service
