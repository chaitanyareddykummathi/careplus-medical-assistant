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

