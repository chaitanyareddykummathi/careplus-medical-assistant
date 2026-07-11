from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import require_roles
from app.db.deps import get_db
from app.dependencies import get_health_profile_service
from app.models.user import User
from app.schemas.health_profile import (
    HealthProfileCreate,
    HealthProfileResponse,
    HealthProfileUpdate,
)
from app.services.health_profile_service import HealthProfileService

router = APIRouter(prefix='/user', tags=['User Health'])


@router.post('/health-profile', response_model=HealthProfileResponse)
def upsert_health_profile(
    payload: HealthProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('patient', 'clinician', 'admin')),
    service: HealthProfileService = Depends(get_health_profile_service),
) -> HealthProfileResponse:
    profile = service.upsert_profile(db=db, current_user=current_user, payload=payload)
    return HealthProfileResponse.model_validate(profile)


@router.get('/health-profile', response_model=HealthProfileResponse)
def get_health_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('patient', 'clinician', 'admin')),
    service: HealthProfileService = Depends(get_health_profile_service),
) -> HealthProfileResponse:
    profile = service.get_profile(db=db, current_user=current_user)
    return HealthProfileResponse.model_validate(profile)


@router.put('/health-profile', response_model=HealthProfileResponse)
def update_health_profile(
    payload: HealthProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('patient', 'clinician', 'admin')),
    service: HealthProfileService = Depends(get_health_profile_service),
) -> HealthProfileResponse:
    profile = service.update_profile(db=db, current_user=current_user, payload=payload)
    return HealthProfileResponse.model_validate(profile)


from app.models.medical_history import MedicalHistory
from pydantic import BaseModel
from datetime import date as date_type

class MedicalHistoryItem(BaseModel):
    id: int
    condition_name: str
    diagnosed_date: date_type | None
    severity: str | None
    notes: str | None
    status: str

@router.get('/medical-history', response_model=list[MedicalHistoryItem])
def get_user_medical_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('patient', 'clinician', 'admin')),
) -> list[MedicalHistoryItem]:
    histories = db.query(MedicalHistory).filter(MedicalHistory.user_id == current_user.id).all()
    if not histories:
        from app.models.health_profile import UserHealthProfile
        profile = db.query(UserHealthProfile).filter(UserHealthProfile.user_id == current_user.id).first()
        if profile and profile.existing_conditions:
            for cond in profile.existing_conditions:
                item = MedicalHistory(
                    user_id=current_user.id,
                    condition_name=cond.title(),
                    diagnosed_date=date_type.today(),
                    severity="LOW",
                    notes="Reported during profile configuration.",
                    status="active"
                )
                db.add(item)
            db.commit()
            histories = db.query(MedicalHistory).filter(MedicalHistory.user_id == current_user.id).all()
    return histories

