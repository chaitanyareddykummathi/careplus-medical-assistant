from app.data.hospital_dataset import COMMON_SPECIALTIES, HOSPITALS


class HospitalService:
    def list_hospitals(
        self,
        specialty: str | None = None,
        city: str | None = None,
        department: str | None = None,
    ) -> list[dict]:
        hospitals = list(HOSPITALS)

        if specialty:
            needle = specialty.strip().lower()
            hospitals = [
                hospital
                for hospital in hospitals
                if any(needle in item.lower() for item in hospital["specialties"])
                or any(needle in item.lower() for item in hospital["departments"])
            ]

        if city:
            needle = city.strip().lower()
            hospitals = [hospital for hospital in hospitals if hospital["city"].lower() == needle]

        if department:
            needle = department.strip().lower()
            hospitals = [
                hospital for hospital in hospitals if any(needle in item.lower() for item in hospital["departments"])
            ]

        return sorted(hospitals, key=lambda item: (-item["rating"], item["distance_km"]))

    def list_specialties(self) -> list[str]:
        return COMMON_SPECIALTIES

    def get_hospital(self, hospital_id: str) -> dict | None:
        return next((hospital for hospital in HOSPITALS if hospital["id"] == hospital_id), None)

    def get_doctor(self, hospital_id: str, doctor_id: str) -> dict | None:
        hospital = self.get_hospital(hospital_id)
        if not hospital:
            return None
        return next((doctor for doctor in hospital["doctors"] if doctor["id"] == doctor_id), None)


hospital_service = HospitalService()
