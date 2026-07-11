from sqlalchemy.orm import Session
from app.models.hospital import Hospital
from app.models.department import Department
from app.data.hospital_dataset import COMMON_SPECIALTIES


class HospitalService:
    def list_hospitals(
        self,
        db: Session,
        specialty: str | None = None,
        city: str | None = None,
        department: str | None = None,
    ) -> list[dict]:
        query = db.query(Hospital)

        if city:
            query = query.filter(Hospital.city.ilike(city.strip()))

        hospitals = query.all()
        result = []
        for h in hospitals:
            h_depts = [d.name for d in h.departments]
            h_doctors = []
            for doc in h.doctors:
                h_doctors.append({
                    "id": doc.id,
                    "name": doc.name,
                    "department": doc.department.name,
                    "specialty": doc.specialty,
                    "experience_years": doc.experience_years,
                })
            
            # Filter by department on python side
            if department:
                needle = department.strip().lower()
                if not any(needle in d.lower() for d in h_depts):
                    continue
            
            # Filter by specialty on python side
            if specialty:
                needle = specialty.strip().lower()
                matches_specialty = any(needle in doc["specialty"].lower() for doc in h_doctors) or any(needle in d.lower() for d in h_depts)
                if not matches_specialty:
                    continue

            result.append({
                "id": h.id,
                "name": h.name,
                "city": h.city,
                "state": h.state,
                "address": h.address,
                "phone": h.phone or "",
                "email": h.email or "info@careplus.example",
                "rating": h.rating,
                "departments": h_depts,
                "doctors": h_doctors,
                "opening_hours": h.opening_hours,
                "emergency_available": h.emergency_available,
                "specialties": list(set(doc["specialty"] for doc in h_doctors)),
                "disease_categories": [
                    "Fever and infection",
                    "Cold, cough and breathing issues",
                    "Chest pain and heart symptoms",
                    "Headache, dizziness and nerve symptoms",
                    "Stomach pain and digestion",
                    "Bone, joint and muscle pain",
                    "Skin, allergy and rashes",
                    "Diabetes and hormone concerns",
                    "Eye, ENT and dental concerns",
                    "Mental health and sleep concerns"
                ],
                "description": h.description or "",
                "consultation_fee": h.consultation_fee,
                "distance_km": h.distance_km,
                "image_url": h.image_url or "",
            })
            
        return sorted(result, key=lambda x: (-x["rating"], x["distance_km"]))

    def list_specialties(self, db: Session) -> list[str]:
        from app.models.doctor import Doctor
        specialties = db.query(Doctor.specialty).distinct().all()
        return sorted(list(set(s[0] for s in specialties if s[0])))

    def get_hospital(self, db: Session, hospital_id: str) -> dict | None:
        h = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if not h:
            return None
        h_depts = [d.name for d in h.departments]
        h_doctors = []
        for doc in h.doctors:
            h_doctors.append({
                "id": doc.id,
                "name": doc.name,
                "department": doc.department.name,
                "specialty": doc.specialty,
                "experience_years": doc.experience_years,
            })
        return {
            "id": h.id,
            "name": h.name,
            "city": h.city,
            "state": h.state,
            "address": h.address,
            "phone": h.phone or "",
            "email": h.email or "info@careplus.example",
            "rating": h.rating,
            "departments": h_depts,
            "doctors": h_doctors,
            "opening_hours": h.opening_hours,
            "emergency_available": h.emergency_available,
            "specialties": list(set(doc["specialty"] for doc in h_doctors)),
            "description": h.description or "",
            "consultation_fee": h.consultation_fee,
            "distance_km": h.distance_km,
            "image_url": h.image_url or "",
        }

    def get_doctor(self, db: Session, hospital_id: str, doctor_id: str) -> dict | None:
        from app.models.doctor import Doctor
        doc = db.query(Doctor).filter(Doctor.hospital_id == hospital_id, Doctor.id == doctor_id).first()
        if not doc:
            return None
        return {
            "id": doc.id,
            "name": doc.name,
            "department": doc.department.name,
            "specialty": doc.specialty,
            "experience_years": doc.experience_years,
            "qualification": doc.qualification,
            "languages": doc.languages,
            "consultation_fee": doc.consultation_fee,
        }


hospital_service = HospitalService()
