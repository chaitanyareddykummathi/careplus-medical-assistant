import logging
from sqlalchemy import inspect, text
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.db import models  # noqa: F401
from sqlalchemy.orm import Session
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)
settings = get_settings()


def init_db() -> None:
    if engine.dialect.name == 'postgresql':
        try:
            with engine.begin() as connection:
                connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        except Exception:
            logger.warning('Could not create pgvector extension; continuing startup.')

    Base.metadata.create_all(bind=engine)
    _ensure_user_auth_columns()
    _ensure_appointment_columns()

    if engine.dialect.name == 'postgresql':
        try:
            with engine.begin() as connection:
                connection.execute(
                    text(
                        'CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_embedding_ivfflat '
                        'ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) '
                        f'WITH (lists = {settings.vector_ivfflat_lists})'
                    )
                )
                connection.execute(
                    text(
                        'CREATE INDEX IF NOT EXISTS ix_symptom_records_embedding_ivfflat '
                        'ON symptom_records USING ivfflat (embedding vector_cosine_ops) '
                        f'WITH (lists = {settings.vector_ivfflat_lists})'
                    )
                )
        except Exception:
            logger.warning('Could not create pgvector ANN indexes; continuing startup.')

    # Seed data
    db = SessionLocal()
    try:
        _seed_db_data(db)
    finally:
        db.close()


def _ensure_user_auth_columns() -> None:
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    alter_statements = []

    if 'failed_login_attempts' not in columns:
        alter_statements.append('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0')
    if 'lockout_until' not in columns:
        ts_type = 'TIMESTAMP' if engine.dialect.name == 'postgresql' else 'DATETIME'
        alter_statements.append(f'ALTER TABLE users ADD COLUMN lockout_until {ts_type}')

    if alter_statements:
        with engine.begin() as connection:
            for statement in alter_statements:
                connection.execute(text(statement))


def _ensure_appointment_columns() -> None:
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('appointments')]
    alter_statements = []
    ts_type = 'TIMESTAMP' if engine.dialect.name == 'postgresql' else 'DATETIME'

    if 'cancelled_at' not in columns:
        alter_statements.append(f'ALTER TABLE appointments ADD COLUMN cancelled_at {ts_type}')

    if alter_statements:
        with engine.begin() as connection:
            for statement in alter_statements:
                connection.execute(text(statement))


def _seed_db_data(db: Session) -> None:
    from app.models.department import Department
    from app.models.hospital import Hospital
    from app.models.doctor import Doctor
    from app.models.doctor_availability import DoctorAvailability
    from datetime import date, timedelta

    # 1. Seeding core & extra clinical departments
    core_depts = [
        "General Medicine", "Cardiology", "Orthopedics", "Neurology", "Dermatology",
        "ENT", "Gastroenterology", "Pediatrics", "Gynecology", "Pulmonology",
        "Ophthalmology", "Psychiatry", "Urology", "Endocrinology"
    ]
    extra_depts = [
        "Allergy & Immunology", "Nephrology", "Oncology", "Rheumatology",
        "Plastic Surgery", "Vascular Surgery", "Neurosurgery", "Cardiac Surgery",
        "Emergency Medicine", "Critical Care", "Infectious Diseases", "Pain Medicine",
        "Sports Medicine", "Geriatrics", "Physiotherapy", "Nutrition & Dietetics"
    ]
    all_depts = core_depts + extra_depts

    existing_dept_count = db.query(Department).count()
    if existing_dept_count == 0:
        logger.info("Seeding clinical departments...")
        depts = [Department(name=name) for name in all_depts]
        db.add_all(depts)
        db.commit()

    dept_map = {d.name.lower(): d.id for d in db.query(Department).all()}

    def get_specialty_by_dept(dept_name: str) -> str:
        mapping = {
            "General Medicine": "General Physician",
            "Cardiology": "Cardiologist",
            "Neurology": "Neurologist",
            "Dermatology": "Dermatologist",
            "Orthopedics": "Orthopedic Surgeon",
            "Pulmonology": "Pulmonologist",
            "Gastroenterology": "Gastroenterologist",
            "Endocrinology": "Endocrinologist",
            "ENT": "ENT Specialist",
            "Ophthalmology": "Ophthalmologist",
            "Gynecology": "Gynecologist",
            "Psychiatry": "Psychiatrist",
            "Cardiac Surgery": "Cardiac Surgeon",
            "Neurosurgery": "Neurosurgeon",
            "Oncology": "Oncologist",
            "Nephrology": "Nephrologist",
            "Urology": "Urologist",
            "Pediatrics": "Pediatrician",
            "Nutrition & Dietetics": "Clinical Dietitian",
            "Sports Medicine": "Sports Medicine Specialist",
            "Pain Medicine": "Pain Specialist",
            "Physiotherapy": "Physiotherapist",
            "Diabetology": "Diabetologist",
            "Dentistry": "Dentist",
            "Radiology": "Radiologist",
            "Emergency Medicine": "Emergency Specialist",
            "Allergy & Immunology": "Allergist / Immunologist",
            "Rheumatology": "Rheumatologist",
            "Plastic Surgery": "Plastic Surgeon",
            "Vascular Surgery": "Vascular Surgeon",
            "Critical Care": "Intensivist",
            "Infectious Diseases": "Infectious Diseases Specialist",
            "Geriatrics": "Geriatrician"
        }
        return mapping.get(dept_name, f"{dept_name} Specialist")

    # 2. Expand Indian Hospital Network (20 Cities, 4 hospitals each = 80 hospitals)
    CITIES_HOSPITALS = {
        "Hyderabad": [
            {"id": "apollo-hyd", "name": "Apollo Hospitals Jubilee Hills", "address": "Road No 72, Jubilee Hills, Hyderabad", "fee": 1200, "dist": 3.2, "phone": "+91-40-2360-7777"},
            {"id": "yashoda-sec", "name": "Yashoda Hospitals Secunderabad", "address": "Alexander Road, Secunderabad", "fee": 1000, "dist": 4.8, "phone": "+91-40-2771-3333"},
            {"id": "kims-hyd", "name": "KIMS Hospitals Gachibowli", "address": "Kondapur, Hyderabad", "fee": 1100, "dist": 5.1, "phone": "+91-40-4488-5000"},
            {"id": "aig-hyd", "name": "AIG Hospitals Hyderabad", "address": "Mindspace Road, Gachibowli, Hyderabad", "fee": 1300, "dist": 6.4, "phone": "+91-40-2337-8888"},
        ],
        "Bengaluru": [
            {"id": "narayana-blr", "name": "Narayana Health City Bengaluru", "address": "Bommasandra Industrial Area, Bengaluru", "fee": 1100, "dist": 7.5, "phone": "+91-80-7122-2222"},
            {"id": "manipal-blr", "name": "Manipal Hospital HAL Road", "address": "HAL Airport Road, Bengaluru", "fee": 1300, "dist": 4.2, "phone": "+91-80-2502-4444"},
            {"id": "apollo-blr", "name": "Apollo Hospitals Bannerghatta", "address": "Bannerghatta Road, Bengaluru", "fee": 1200, "dist": 5.8, "phone": "+91-80-2630-4050"},
            {"id": "fortis-blr", "name": "Fortis Hospital Bannerghatta", "address": "Bannerghatta Road, Bengaluru", "fee": 1150, "dist": 6.1, "phone": "+91-80-6621-4444"},
        ],
        "Chennai": [
            {"id": "apollo-chn", "name": "Apollo Hospitals Greams Road", "address": "Greams Road, Thousand Lights, Chennai", "fee": 1200, "dist": 2.8, "phone": "+91-44-2829-0200"},
            {"id": "mgm-chn", "name": "MGM Healthcare Chennai", "address": "Nelson Manickam Road, Chennai", "fee": 1100, "dist": 4.3, "phone": "+91-44-4526-7000"},
            {"id": "sims-chn", "name": "SIMS Hospital Vadapalani", "address": "Jawaharlal Nehru Salai, Vadapalani, Chennai", "fee": 1050, "dist": 5.2, "phone": "+91-44-3355-5330"},
            {"id": "global-chn", "name": "Global Health City Perumbakkam", "address": "Cheran Nagar, Perumbakkam, Chennai", "fee": 1250, "dist": 8.1, "phone": "+91-44-4477-7000"},
        ],
        "Mumbai": [
            {"id": "kokilaben-mum", "name": "Kokilaben Dhirubhai Ambani Hospital", "address": "Rao Saheb Achutrao Patwardhan Marg, Andheri West, Mumbai", "fee": 1500, "dist": 6.2, "phone": "+91-22-3099-9999"},
            {"id": "nanavati-mum", "name": "Nanavati Max Super Speciality Hospital", "address": "S.V. Road, Vile Parle West, Mumbai", "fee": 1400, "dist": 5.5, "phone": "+91-22-2626-7500"},
            {"id": "reliance-mum", "name": "H. N. Reliance Foundation Hospital", "address": "Prarthana Samaj, Girgaon, Mumbai", "fee": 1450, "dist": 3.8, "phone": "+91-22-6130-3030"},
            {"id": "fortis-mum", "name": "Fortis Hospital Mulund", "address": "Mulund Goregaon Link Road, Mulund West, Mumbai", "fee": 1200, "dist": 8.4, "phone": "+91-22-4925-4925"},
        ],
        "Pune": [
            {"id": "jehangir-pune", "name": "Jehangir Hospital Pune", "address": "Sassoon Road, Pune", "fee": 1000, "dist": 1.8, "phone": "+91-20-6605-0800"},
            {"id": "ruby-pune", "name": "Ruby Hall Clinic Pune", "address": "Sassoon Road, Pune", "fee": 1100, "dist": 2.1, "phone": "+91-20-6645-0500"},
            {"id": "sahyadri-pune", "name": "Sahyadri Super Speciality Hospital", "address": "Deccan Gymkhana, Pune", "fee": 950, "dist": 3.4, "phone": "+91-20-6721-3000"},
            {"id": "manipal-pune", "name": "Manipal Hospital Kharadi", "address": "Pune-Nagar Road, Kharadi, Pune", "fee": 1150, "dist": 5.9, "phone": "+91-20-6745-6745"},
        ],
        "Ahmedabad": [
            {"id": "sterling-ahmd", "name": "Sterling Hospital Ahmedabad", "address": "Sterling Hospital Road, Gurukul, Ahmedabad", "fee": 1000, "dist": 2.5, "phone": "+91-79-4001-1111"},
            {"id": "zydus-ahmd", "name": "Zydus Hospital Ahmedabad", "address": "Sola Bridge, SG Highway, Ahmedabad", "fee": 1100, "dist": 3.1, "phone": "+91-79-6677-0000"},
            {"id": "sal-ahmd", "name": "SAL Hospital Ahmedabad", "address": "Drive-In Road, Ahmedabad", "fee": 950, "dist": 4.2, "phone": "+91-79-6611-5600"},
            {"id": "cims-ahmd", "name": "Marengo CIMS Hospital", "address": "Science City Road, Sola, Ahmedabad", "fee": 1200, "dist": 4.9, "phone": "+91-79-2771-2771"},
        ],
        "Delhi": [
            {"id": "apollo-del", "name": "Indraprastha Apollo Hospital", "address": "Sarita Vihar, Delhi-Mathura Road, New Delhi", "fee": 1300, "dist": 4.8, "phone": "+91-11-2692-5858"},
            {"id": "max-saket", "name": "Max Super Speciality Hospital Saket", "address": "Press Enclave Road, Saket, New Delhi", "fee": 1250, "dist": 6.2, "phone": "+91-11-2651-5050"},
            {"id": "gangaram-del", "name": "Sir Ganga Ram Hospital Delhi", "address": "Rajinder Nagar, New Delhi", "fee": 1100, "dist": 3.6, "phone": "+91-11-2575-7575"},
            {"id": "fortis-escorts", "name": "Fortis Escorts Heart Institute", "address": "Okhla Road, New Delhi", "fee": 1350, "dist": 5.1, "phone": "+91-11-4713-5000"},
        ],
        "Noida": [
            {"id": "fortis-noida", "name": "Fortis Hospital Noida", "address": "Sector 62, Noida", "fee": 1100, "dist": 3.2, "phone": "+91-120-662-2000"},
            {"id": "metro-noida", "name": "Metro Hospital Noida", "address": "Sector 11, Noida", "fee": 950, "dist": 2.4, "phone": "+91-120-422-9900"},
            {"id": "kailash-noida", "name": "Kailash Hospital Noida", "address": "Sector 27, Noida", "fee": 1000, "dist": 1.9, "phone": "+91-120-244-4444"},
            {"id": "jaypee-noida", "name": "Jaypee Hospital Noida", "address": "Sector 128, Noida", "fee": 1200, "dist": 5.7, "phone": "+91-120-412-2222"},
        ],
        "Gurugram": [
            {"id": "medanta-gur", "name": "Medanta The Medicity", "address": "Sector 38, Gurugram", "fee": 1400, "dist": 6.8, "phone": "+91-124-414-1414"},
            {"id": "fortis-gur", "name": "Fortis Memorial Research Institute", "address": "Sector 44, Gurugram", "fee": 1350, "dist": 4.5, "phone": "+91-124-496-2200"},
            {"id": "artemis-gur", "name": "Artemis Hospital Gurugram", "address": "Sector 51, Gurugram", "fee": 1250, "dist": 5.9, "phone": "+91-124-451-1111"},
            {"id": "max-gur", "name": "Max Hospital Gurugram", "address": "Sushant Lok 1, Gurugram", "fee": 1200, "dist": 3.4, "phone": "+91-124-662-3000"},
        ],
        "Kolkata": [
            {"id": "amri-kol", "name": "AMRI Hospital Salt Lake", "address": "Salt Lake Sector III, Kolkata", "fee": 950, "dist": 2.9, "phone": "+91-33-6680-0000"},
            {"id": "fortis-kol", "name": "Fortis Hospital Anandapur", "address": "Anandapur, E.M. Bypass, Kolkata", "fee": 1100, "dist": 5.4, "phone": "+91-33-6620-2000"},
            {"id": "apollo-kol", "name": "Apollo Gleneagles Hospital", "address": "E.M. Bypass, Kankurgachi, Kolkata", "fee": 1200, "dist": 4.2, "phone": "+91-33-2320-3040"},
            {"id": "ruby-kol", "name": "Ruby General Hospital Kolkata", "address": "Kasba, E.M. Bypass, Kolkata", "fee": 900, "dist": 6.1, "phone": "+91-33-6687-1800"},
        ],
        "Jaipur": [
            {"id": "eternal-jai", "name": "Eternal Hospital Jaipur", "address": "Jawahar Circle, Malviya Nagar, Jaipur", "fee": 1000, "dist": 3.8, "phone": "+91-141-409-7000"},
            {"id": "fortis-jai", "name": "Fortis Escorts Hospital Jaipur", "address": "JLN Marg, Malviya Nagar, Jaipur", "fee": 1100, "dist": 4.5, "phone": "+91-141-254-7000"},
            {"id": "manipal-jai", "name": "Manipal Hospital Jaipur", "address": "Sikar Road, Jaipur", "fee": 950, "dist": 5.9, "phone": "+91-141-233-3222"},
            {"id": "narayana-jai", "name": "Narayana Multispeciality Hospital", "address": "Pratap Nagar, Jaipur", "fee": 900, "dist": 7.1, "phone": "+91-141-711-2345"},
        ],
        "Lucknow": [
            {"id": "medanta-luc", "name": "Medanta Hospital Lucknow", "address": "Sector A, Pocket 1, Sushant Golf City, Lucknow", "fee": 1200, "dist": 5.2, "phone": "+91-522-450-5050"},
            {"id": "apollomedics-luc", "name": "Apollo Medics Super Speciality Lucknow", "address": "Kanpur Road, Lucknow", "fee": 1100, "dist": 4.8, "phone": "+91-522-678-8888"},
            {"id": "sahara-luc", "name": "Sahara Hospital Lucknow", "address": "Vibhuti Khand, Gomti Nagar, Lucknow", "fee": 1000, "dist": 6.4, "phone": "+91-522-678-0001"},
            {"id": "metro-luc", "name": "Metro Hospital Lucknow", "address": "Vikas Nagar, Lucknow", "fee": 900, "dist": 3.1, "phone": "+91-522-410-6677"},
        ],
        "Kochi": [
            {"id": "aster-koc", "name": "Aster Medcity Kochi", "address": "Cheranelloor, Kochi", "fee": 1100, "dist": 6.8, "phone": "+91-484-660-0600"},
            {"id": "lakeshore-koc", "name": "Lakeshore Hospital Kochi", "address": "NH-66, Nettoor, Kochi", "fee": 1050, "dist": 5.4, "phone": "+91-484-270-1032"},
            {"id": "amrita-koc", "name": "Amrita Institute of Medical Sciences", "address": "Ponekkara, Edappally, Kochi", "fee": 950, "dist": 4.9, "phone": "+91-484-285-1234"},
            {"id": "rajagiri-koc", "name": "Rajagiri Hospital Aluva", "address": "Chunangamvely, Aluva, Kochi", "fee": 1000, "dist": 8.3, "phone": "+91-484-290-5000"},
        ],
        "Visakhapatnam": [
            {"id": "care-vizag", "name": "Care Hospitals Visakhapatnam", "address": "AS Raja Complex, Ramnagar, Visakhapatnam", "fee": 950, "dist": 2.1, "phone": "+91-891-304-1600"},
            {"id": "apollo-vizag", "name": "Apollo Hospitals Ramnagar", "address": "Ramnagar, Visakhapatnam", "fee": 1000, "dist": 3.2, "phone": "+91-891-272-7272"},
            {"id": "sevenhills-vizag", "name": "SevenHills Hospital", "address": "Rockdale Layout, Ramnagar, Visakhapatnam", "fee": 900, "dist": 1.9, "phone": "+91-891-270-8090"},
            {"id": "kims-vizag", "name": "KIMS Icon Hospital", "address": "Sheela Nagar, Visakhapatnam", "fee": 1050, "dist": 5.7, "phone": "+91-891-448-8500"},
        ],
        "Vijayawada": [
            {"id": "manipal-vij", "name": "Manipal Hospital Vijayawada", "address": "Near Varadhi, Tadepalli, Vijayawada", "fee": 1000, "dist": 3.5, "phone": "+91-866-222-3333"},
            {"id": "ayush-vij", "name": "Ayush Hospitals Vijayawada", "address": "Siddhartha Nagar, Vijayawada", "fee": 900, "dist": 2.2, "phone": "+91-866-248-8488"},
            {"id": "kamineni-vij", "name": "Kamineni Hospitals Vijayawada", "address": "Moghalrajpuram, Vijayawada", "fee": 950, "dist": 4.1, "phone": "+91-866-254-1541"},
            {"id": "metro-vij", "name": "Metro International Hospital", "address": "Labbipet, Vijayawada", "fee": 850, "dist": 1.8, "phone": "+91-866-410-3344"},
        ],
        "Coimbatore": [
            {"id": "kmch-cbe", "name": "Kovai Medical Center and Hospital", "address": "Avinashi Road, Coimbatore", "fee": 1050, "dist": 4.8, "phone": "+91-422-432-3800"},
            {"id": "psg-cbe", "name": "PSG Hospitals Coimbatore", "address": "Peelamedu, Coimbatore", "fee": 900, "dist": 3.9, "phone": "+91-422-257-0170"},
            {"id": "ganga-cbe", "name": "Ganga Hospital Coimbatore", "address": "Mettupalayam Road, Coimbatore", "fee": 1000, "dist": 2.4, "phone": "+91-422-222-9000"},
            {"id": "apollo-cbe", "name": "Apollo Hospitals Coimbatore", "address": "Sathy Road, Coimbatore", "fee": 1100, "dist": 5.2, "phone": "+91-422-666-3000"},
        ],
        "Indore": [
            {"id": "choithram-ind", "name": "Choithram Hospital Indore", "address": "Manik Bagh Road, Indore", "fee": 950, "dist": 3.1, "phone": "+91-731-247-0062"},
            {"id": "bombay-ind", "name": "Bombay Hospital Indore", "address": "IDA Scheme No. 94, Indore", "fee": 1000, "dist": 4.9, "phone": "+91-731-255-8866"},
            {"id": "medanta-ind", "name": "Medanta Super Speciality Indore", "address": "Vijay Nagar, Indore", "fee": 1150, "dist": 5.8, "phone": "+91-731-488-8888"},
            {"id": "kokilaben-ind", "name": "Kokilaben Hospital Indore", "address": "Nipania, Indore", "fee": 1200, "dist": 6.3, "phone": "+91-731-309-9999"},
        ],
        "Bhopal": [
            {"id": "bansal-bho", "name": "Bansal Hospital Bhopal", "address": "Shahpura Lake, Bhopal", "fee": 1000, "dist": 3.6, "phone": "+91-755-4086-000"},
            {"id": "lbs-bho", "name": "LBS Hospital Bhopal", "address": "Motia Park, Bhopal", "fee": 850, "dist": 1.8, "phone": "+91-755-422-2233"},
            {"id": "national-bho", "name": "National Hospital Bhopal", "address": "Link Road 1, Bhopal", "fee": 900, "dist": 2.7, "phone": "+91-755-257-2270"},
            {"id": "apollo-sage-bho", "name": "Apollo Sage Hospital Bhopal", "address": "Ayodhya Bypass, Bhopal", "fee": 1100, "dist": 5.1, "phone": "+91-755-430-8111"},
        ],
        "Nagpur": [
            {"id": "kingsway-nag", "name": "Kingsway Hospitals Nagpur", "address": "Near Railway Station, Nagpur", "fee": 1000, "dist": 2.5, "phone": "+91-712-672-1111"},
            {"id": "alexis-nag", "name": "Alexis Hospital Nagpur", "address": "Survey No 232, Mankapur, Nagpur", "fee": 1100, "dist": 4.2, "phone": "+91-712-712-8888"},
            {"id": "wockhardt-nag", "name": "Wockhardt Hospital Nagpur", "address": "Shankar Nagar, Nagpur", "fee": 950, "dist": 3.1, "phone": "+91-712-256-2580"},
            {"id": "orange-nag", "name": "Orange City Hospital Nagpur", "address": "Veer Sawarkar Marg, Nagpur", "fee": 900, "dist": 1.9, "phone": "+91-712-664-3999"},
        ],
        "Surat": [
            {"id": "kiran-sur", "name": "Kiran Multi Super Speciality Hospital", "address": "Near Gitanjali petrol pump, Surat", "fee": 1100, "dist": 4.1, "phone": "+91-261-716-1111"},
            {"id": "shalby-sur", "name": "Shalby Hospital Surat", "address": "Rander Road, Surat", "fee": 1000, "dist": 3.4, "phone": "+91-261-270-2222"},
            {"id": "apex-sur", "name": "Apex Hospital Surat", "address": "Udhana Main Road, Surat", "fee": 900, "dist": 2.7, "phone": "+91-261-410-6677"},
            {"id": "sunshine-sur", "name": "Sunshine Global Hospital Surat", "address": "Dumas Road, Surat", "fee": 1050, "dist": 5.9, "phone": "+91-261-710-1010"},
        ]
    }

    existing_hosp_count = db.query(Hospital).count()
    if existing_hosp_count == 0:
        logger.info("Seeding expanded network hospitals and localized doctors...")

        # Gender lists
        male_firsts = ["Aarav", "Amit", "Rajesh", "Suresh", "Vikram", "Sanjay", "Anil", "Sunil", "Vijay", "Ramesh", "Karan", "Vivek", "Alok", "Sameer", "Arjun", "Farhan", "Rahul", "Nikhil", "Gaurav", "Yash"]
        female_firsts = ["Aditi", "Meera", "Sneha", "Sahana", "Pooja", "Kavita", "Priya", "Leela", "Mira", "Nisha", "Tara", "Isha", "Preeti", "Divya", "Ritu", "Kiran", "Shreya", "Ananya", "Deepa", "Anjali"]
        last_names = ["Kapoor", "Bose", "Naik", "Roy", "Suri", "Jain", "Reddy", "Kulkarni", "Sharma", "Thomas", "Iyer", "Menon", "Shah", "Nair", "Murthy", "Sen", "Varma", "Ali", "Desai", "Patel", "Verma", "Rao", "Mehta", "Khan", "Gupta", "Joshi", "Chawla", "Malhotra", "Mishra", "Trivedi"]
        
        city_languages = {
            "pune": "English, Hindi, Marathi",
            "mumbai": "English, Hindi, Marathi",
            "nagpur": "English, Hindi, Marathi",
            "ahmedabad": "English, Hindi, Gujarati",
            "hyderabad": "English, Hindi, Telugu",
            "chennai": "English, Hindi, Tamil",
            "bengaluru": "English, Hindi, Kannada",
            "kolkata": "English, Hindi, Bengali",
            "kochi": "English, Hindi, Malayalam",
            "surat": "English, Hindi, Gujarati",
            "coimbatore": "English, Hindi, Tamil",
            "vijayawada": "English, Hindi, Telugu",
            "visakhapatnam": "English, Hindi, Telugu",
        }

        hosp_counter = 0
        for city_name, hosp_list in CITIES_HOSPITALS.items():
            for h_data in hosp_list:
                # Add core departments (14) plus 4 extra departments dynamically
                h_depts = list(core_depts)
                for i in range(4):
                    extra_d = extra_depts[(hosp_counter + i) % len(extra_depts)]
                    if extra_d not in h_depts:
                        h_depts.append(extra_d)

                # Create Hospital
                h = Hospital(
                    id=h_data["id"],
                    name=h_data["name"],
                    city=city_name,
                    state="India",
                    address=h_data["address"],
                    phone=h_data["phone"],
                    email=f"appointments.{h_data['id']}@careplus.example",
                    rating=round(4.2 + (hosp_counter % 8) * 0.1, 1),
                    opening_hours="24 x 7 Emergency, OPD 08:30 AM - 08:00 PM",
                    emergency_available=True, # Every network hospital is emergency-capable
                    description="Full-service CarePlus network hospital with broad specialty OPD, diagnostics and triage.",
                    consultation_fee=h_data["fee"],
                    distance_km=h_data["dist"],
                    image_url=f"https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80"
                )

                # Associate departments
                for dept_name in h_depts:
                    dept_id = dept_map.get(dept_name.lower())
                    if dept_id:
                        dept_obj = db.query(Department).get(dept_id)
                        if dept_obj:
                            h.departments.append(dept_obj)
                db.add(h)
                db.commit()

                # Create unique doctors for each department in this hospital
                for dept_name in h_depts:
                    dept_id = dept_map.get(dept_name.lower())
                    if not dept_id:
                        continue

                    # 3 for General Medicine, 2 for Cardio, Ortho, Neuro, Derma, ENT, 1 for others
                    if dept_name == "General Medicine":
                        num_doctors = 3
                    elif dept_name in ["Cardiology", "Orthopedics", "Neurology", "Dermatology", "ENT"]:
                        num_doctors = 2
                    else:
                        num_doctors = 1
                    
                    for d_idx in range(num_doctors):
                        hash_val = (hash(h.id) + hash(dept_name) + d_idx) & 0xffffffff
                        
                        # Gender & Name Selection
                        if dept_name == "Gynecology":
                            gender = "Female"
                        else:
                            gender = "Female" if (hash_val % 2 == 0) else "Male"

                        if gender == "Female":
                            f_name = female_firsts[hash_val % len(female_firsts)]
                        else:
                            f_name = male_firsts[hash_val % len(male_firsts)]

                        l_name = last_names[(hash_val >> 2) % len(last_names)]
                        doc_id = f"{h.id}-{dept_name.lower().replace(' ', '-')}-{d_idx + 1}"
                        specialty = get_specialty_by_dept(dept_name)
                        exp_years = 6 + (hash_val % 16)
                        
                        # Qualification check
                        if "Surgery" in dept_name or dept_name in ["ENT", "Ophthalmology", "Gynecology", "Orthopedics"]:
                            qual = "MBBS MS MCh" if (hash_val % 2 == 0) else "MBBS MS"
                        elif dept_name in ["Cardiology", "Neurology", "Endocrinology", "Gastroenterology", "Nephrology"]:
                            qual = "MBBS MD DM" if (hash_val % 2 == 0) else "MBBS MD"
                        else:
                            qual = "MBBS MD"

                        lang = city_languages.get(city_name.lower(), "English, Hindi")

                        doc = Doctor(
                            id=doc_id,
                            name=f"Dr. {f_name} {l_name}",
                            hospital_id=h.id,
                            department_id=dept_id,
                            specialty=specialty,
                            experience_years=exp_years,
                            qualification=qual,
                            languages=lang,
                            consultation_fee=h.consultation_fee,
                            rating=round(4.3 + (hash_val % 7) * 0.1, 1),
                            active=True,
                            gender=gender,
                            available_days="Mon, Tue, Wed, Thu, Fri, Sat"
                        )
                        db.add(doc)
                db.commit()
                hosp_counter += 1

    # 3. Seed doctor availability slots (7 days of slots for each doctor)
    existing_slots = db.query(DoctorAvailability).count()
    if existing_slots == 0:
        logger.info("Seeding doctor availabilities in bulk for the next 7 days...")
        doctors = db.query(Doctor).all()
        today = date.today()
        slots_to_generate = [
            "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", 
            "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", 
            "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", 
            "04:00 PM", "04:30 PM", "05:00 PM"
        ]

        avail_records = []
        for doc in doctors:
            for day_offset in range(7):
                slot_date = today + timedelta(days=day_offset)
                for slot_time in slots_to_generate:
                    avail_records.append({
                        "doctor_id": doc.id,
                        "available_date": slot_date,
                        "time_slot": slot_time,
                        "is_booked": False
                    })
        
        # Performance optimized bulk insert
        db.bulk_insert_mappings(DoctorAvailability, avail_records)
        db.commit()
        logger.info(f"Doctor availabilities successfully seeded: {len(avail_records)} slots created.")


if __name__ == '__main__':
    Base.metadata.drop_all(bind=engine)
    init_db()
    print('Database tables initialized.')
