from pydantic import BaseModel, EmailStr, Field


class DoctorResponse(BaseModel):
    id: str
    name: str
    department: str
    specialty: str
    experience_years: int


class HospitalResponse(BaseModel):
    id: str
    name: str
    city: str
    state: str
    address: str
    phone: str
    email: EmailStr
    rating: float = Field(ge=0, le=5)
    departments: list[str]
    doctors: list[DoctorResponse]
    opening_hours: str
    emergency_available: bool
    specialties: list[str]
    disease_categories: list[str] = Field(default_factory=list)
    description: str
    consultation_fee: int
    distance_km: float
    image_url: str


class HospitalListResponse(BaseModel):
    success: bool = True
    message: str = "Hospitals retrieved successfully."
    data: list[HospitalResponse]


class SpecialtyListResponse(BaseModel):
    success: bool = True
    message: str = "Specialties retrieved successfully."
    data: list[str]
