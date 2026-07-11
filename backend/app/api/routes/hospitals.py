from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.schemas.hospital import HospitalListResponse, SpecialtyListResponse
from app.services.hospital_service import hospital_service

# Original hospitals router
router = APIRouter(prefix="/hospitals", tags=["Hospitals"])

# New locations and doctors routers
locations_router = APIRouter(prefix="/locations", tags=["Locations"])
doctors_router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("", response_model=HospitalListResponse)
def list_hospitals(
    specialty: str | None = Query(default=None),
    city: str | None = Query(default=None),
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> HospitalListResponse:
    hospitals = hospital_service.list_hospitals(db, specialty=specialty, city=city, department=department)
    return HospitalListResponse(data=hospitals)


@router.get("/specialties", response_model=SpecialtyListResponse)
def list_specialties(db: Session = Depends(get_db)) -> SpecialtyListResponse:
    return SpecialtyListResponse(data=hospital_service.list_specialties(db))


@router.get("/{id}/departments")
def list_hospital_departments(id: str, db: Session = Depends(get_db)):
    from app.models.hospital import Hospital
    h = db.query(Hospital).filter(Hospital.id == id).first()
    if not h:
        return {"data": []}
    return {"data": [{"id": dept.id, "name": dept.name} for dept in h.departments]}


@router.get("/{id}/doctors")
def list_hospital_doctors(
    id: str,
    department: str | None = Query(default=None),
    department_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    from app.models.doctor import Doctor
    from app.models.department import Department
    query = db.query(Doctor).filter(Doctor.hospital_id == id, Doctor.active == True)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    elif department:
        dept = db.query(Department).filter(Department.name.ilike(department.strip())).first()
        if dept:
            query = query.filter(Doctor.department_id == dept.id)
        else:
            return {"data": []}
    
    doctors = query.all()
    data = []
    for doc in doctors:
        data.append({
            "id": doc.id,
            "name": doc.name,
            "hospital_id": doc.hospital_id,
            "department_id": doc.department_id,
            "department": doc.department.name,
            "specialty": doc.specialty,
            "experience_years": doc.experience_years,
            "qualification": doc.qualification,
            "languages": doc.languages,
            "consultation_fee": doc.consultation_fee,
            "rating": doc.rating,
            "gender": doc.gender,
            "available_days": doc.available_days,
        })
    return {"data": data}


# Locations router endpoints
@locations_router.get("")
def list_locations(db: Session = Depends(get_db)):
    from app.models.hospital import Hospital
    cities = db.query(Hospital.city).distinct().all()
    # Filter empty and format
    data = [{"id": c[0], "name": c[0]} for c in cities if c[0]]
    # Ensure stable sorting
    data = sorted(data, key=lambda x: x["name"])
    return {"data": data}


@locations_router.get("/{id}/hospitals")
def list_location_hospitals(id: str, db: Session = Depends(get_db)):
    from app.models.hospital import Hospital
    hospitals = db.query(Hospital).filter(Hospital.city.ilike(id.strip())).all()
    formatted = []
    for h in hospitals:
        formatted.append(hospital_service.get_hospital(db, h.id))
    return {"data": formatted}


# Doctors router endpoints
@doctors_router.get("")
def list_doctors_filtered(
    hospital_id: str | None = Query(default=None),
    department_id: int | None = Query(default=None),
    location_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    from app.models.doctor import Doctor
    from app.models.hospital import Hospital
    query = db.query(Doctor).filter(Doctor.active == True)
    if hospital_id:
        query = query.filter(Doctor.hospital_id == hospital_id)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    if location_id:
        query = query.join(Hospital).filter(Hospital.city.ilike(location_id.strip()))
    
    doctors = query.all()
    data = []
    for doc in doctors:
        data.append({
            "id": doc.id,
            "name": doc.name,
            "hospital_id": doc.hospital_id,
            "department_id": doc.department_id,
            "department": doc.department.name,
            "specialty": doc.specialty,
            "experience_years": doc.experience_years,
            "qualification": doc.qualification,
            "languages": doc.languages,
            "consultation_fee": doc.consultation_fee,
            "rating": doc.rating,
            "gender": doc.gender,
            "available_days": doc.available_days,
        })
    return {"data": data}


@doctors_router.get("/{id}/availability")
def get_doctor_availability(
    id: str,
    date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    from app.models.doctor_availability import DoctorAvailability
    query = db.query(DoctorAvailability).filter(DoctorAvailability.doctor_id == id)
    if date:
        from datetime import datetime
        try:
            from datetime import datetime
            parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(DoctorAvailability.available_date == parsed_date)
        except ValueError:
            return {"data": []}
    
    availabilities = query.all()
    data = []
    for da in availabilities:
        data.append({
            "id": da.id,
            "doctor_id": da.doctor_id,
            "available_date": str(da.available_date),
            "time_slot": da.time_slot,
            "is_booked": da.is_booked,
        })
    return {"data": data}
