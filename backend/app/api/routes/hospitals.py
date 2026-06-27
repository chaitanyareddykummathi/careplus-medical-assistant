from fastapi import APIRouter, Query

from app.schemas.hospital import HospitalListResponse, SpecialtyListResponse
from app.services.hospital_service import hospital_service

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


@router.get("", response_model=HospitalListResponse)
def list_hospitals(
    specialty: str | None = Query(default=None),
    city: str | None = Query(default=None),
    department: str | None = Query(default=None),
) -> HospitalListResponse:
    hospitals = hospital_service.list_hospitals(specialty=specialty, city=city, department=department)
    return HospitalListResponse(data=hospitals)


@router.get("/specialties", response_model=SpecialtyListResponse)
def list_specialties() -> SpecialtyListResponse:
    return SpecialtyListResponse(data=hospital_service.list_specialties())
