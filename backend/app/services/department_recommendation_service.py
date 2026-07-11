import re
import logging

logger = logging.getLogger(__name__)

DEPARTMENT_MAPPINGS = {
    r"\bfever\b": "General Medicine",
    r"\bcold\b": "General Medicine",
    r"\bcough\b": "General Medicine",
    r"\bheadache\b": "Neurology",
    r"\bmigraine\b": "Neurology",
    r"\bchest\s*pain\b": "Cardiology",
    r"\bpalpitation\b": "Cardiology",
    r"\brash\b": "Dermatology",
    r"\bskin\b": "Dermatology",
    r"\bstomach\s*pain\b": "Gastroenterology",
    r"\bvomiting\b": "Gastroenterology",
    r"\bdiabetes\b": "Endocrinology",
    r"\bdiabetic\b": "Endocrinology",
    r"\bjoint\s*pain\b": "Orthopedics",
    r"\bback\s*pain\b": "Orthopedics",
    r"\beye\s*pain\b": "Ophthalmology",
    r"\bpregnancy\b": "Gynecology",
    r"\bear\s*pain\b": "ENT",
    r"\bstress\b": "Psychiatry",
    r"\banxiety\b": "Psychiatry",
    r"\bbreathing\s*difficulty\b": "Pulmonology",
    r"\bshortness\s*of\s*breath\b": "Pulmonology",
}

CANONICAL_DEPARTMENTS = [
    "General Medicine",
    "Cardiology",
    "Neurology",
    "Dermatology",
    "Orthopedics",
    "Pulmonology",
    "Gastroenterology",
    "Endocrinology",
    "ENT",
    "Ophthalmology",
    "Gynecology",
    "Psychiatry",
    "Cardiac Surgery",
    "Neurosurgery",
    "Oncology",
    "Nephrology",
    "Urology",
    "Pediatrics",
    "Nutrition",
    "Sports Medicine",
    "Pain Management",
    "Physiotherapy",
    "Diabetology",
    "Dentistry",
    "Radiology",
    "Emergency Medicine"
]


class DepartmentRecommendationService:
    def recommend_department(self, text: str, gemini_dept: str | None = None) -> str:
        """
        Analyze chatbot text or Gemini output to recommend a department.
        Falls back to keyword matching if Gemini output is invalid or missing.
        """
        # If Gemini predicted a department, validate and match against canonical list
        if gemini_dept:
            g_dept = gemini_dept.strip().lower()
            for canonical in CANONICAL_DEPARTMENTS:
                if canonical.lower() == g_dept or g_dept in canonical.lower() or canonical.lower() in g_dept:
                    return canonical
            # Handle common synonym/specialist mapping
            if "physician" in g_dept or "general" in g_dept:
                return "General Medicine"
            if "cardiologist" in g_dept:
                return "Cardiology"
            if "neurologist" in g_dept:
                return "Neurology"
            if "dermatologist" in g_dept:
                return "Dermatology"
            if "orthopedic" in g_dept:
                return "Orthopedics"
            if "pulmonologist" in g_dept:
                return "Pulmonology"
            if "gastro" in g_dept:
                return "Gastroenterology"
            if "endocrinologist" in g_dept:
                return "Endocrinology"
            if "gynecologist" in g_dept or "gynecology" in g_dept:
                return "Gynecology"
            if "ent" in g_dept:
                return "ENT"
            if "psychiatrist" in g_dept:
                return "Psychiatry"
            if "ophthalmologist" in g_dept:
                return "Ophthalmology"

        # Apply rule-based keyword mapping fallback
        normalized_text = text.lower()
        for pattern, department in DEPARTMENT_MAPPINGS.items():
            if re.search(pattern, normalized_text):
                logger.info(f"Keyword match trigger: mapped '{pattern}' to department '{department}'")
                return department

        # Default fallback
        return "General Medicine"


department_recommendation_service = DepartmentRecommendationService()
