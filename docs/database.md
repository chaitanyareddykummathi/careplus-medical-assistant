# CarePlus Medical Assistant

# Database Design Document

Version: 1.0

Status: Active

---

# 1. Overview

CarePlus uses PostgreSQL as the primary relational database.

The database is designed following normalization principles while maintaining efficient query performance.

Objectives:

* Data consistency
* Scalability
* Security
* Auditability
* Easy future expansion

The application uses SQLAlchemy ORM with Alembic for schema migrations.

---

# 2. Database Architecture

```text
Frontend

↓

FastAPI

↓

Repositories

↓

SQLAlchemy ORM

↓

PostgreSQL
```

The database is accessed only through repositories.

No service or API route may execute raw SQL directly.

---

# 3. Database Tables

## Users

Purpose

Stores registered platform users.

Primary Key

* id

Fields

* id
* name
* email
* username
* hashed_password
* role
* is_active
* is_google_user
* created_at
* updated_at

Indexes

* email (Unique)
* username (Unique)

Relationships

* One Health Profile
* Many Symptom Logs
* Many Appointments
* Many Notifications

---

## Health Profiles

Purpose

Stores user medical profile.

Primary Key

* id

Foreign Keys

* user_id → Users.id

Fields

* age
* gender
* blood_group
* weight
* height
* blood_pressure
* blood_sugar
* allergies
* chronic_conditions

Indexes

* user_id

Relationship

One User

↓

One Health Profile

---

## Symptoms

Purpose

Stores standardized symptom definitions used by the Rule Engine.

Examples

* Fever
* Headache
* Chest Pain
* Vomiting
* Cough
* Fatigue

Fields

* id
* symptom_name
* category
* description
* created_at

Indexes

* symptom_name

---

## Symptom Logs

Purpose

Stores every symptom submission.

Primary Key

* id

Foreign Keys

* user_id

Fields

* raw_input
* extracted_symptoms
* ai_confidence
* created_at

Indexes

* user_id
* created_at

Relationship

Many Symptom Logs

↓

One User

---

## Predictions

Purpose

Stores validated prediction results.

Fields

* id
* symptom_log_id
* disease_category
* severity
* specialist
* recommendation
* created_at

Relationship

One Symptom Log

↓

One Prediction

---

## Specialists

Purpose

Stores supported medical specialists.

Examples

* Cardiologist
* Dermatologist
* Neurologist
* ENT Specialist
* Orthopedic
* General Physician

Fields

* id
* specialist_name
* department
* description

Indexes

* specialist_name

---

## Hospitals

Purpose

Stores hospital information.

Fields

* id
* hospital_name
* address
* city
* state
* phone
* email
* latitude
* longitude

Indexes

* city
* hospital_name

---

## Doctors

Purpose

Stores doctor information.

Fields

* id
* hospital_id
* specialist_id
* doctor_name
* qualification
* experience
* availability
* consultation_fee

Relationships

Many Doctors

↓

One Hospital

Many Doctors

↓

One Specialist

---

## Appointments

Purpose

Stores booked appointments.

Fields

* id
* user_id
* doctor_id
* appointment_date
* appointment_time
* appointment_status
* created_at

Indexes

* appointment_date
* doctor_id
* user_id

---

## Notifications

Purpose

Stores user notifications.

Fields

* id
* user_id
* notification_type
* title
* message
* is_read
* created_at

Indexes

* user_id
* created_at

---

# 4. Entity Relationships

```text
User
 │
 ├──────────────┐
 │              │
 ▼              ▼
Health      Symptom Logs
Profile          │
                 ▼
            Predictions
                 │
                 ▼
           Specialist
                 │
                 ▼
             Doctors
                 │
                 ▼
            Hospitals
                 │
                 ▼
          Appointments

User
 │
 ▼
Notifications
```

---

# 5. Primary Keys

Every table uses

* UUID (Recommended)

or

* Auto Increment Integer

Version 1 may use Integer IDs.

Future versions should migrate to UUIDs.

---

# 6. Foreign Keys

HealthProfile.user_id

→ Users.id

SymptomLog.user_id

→ Users.id

Prediction.symptom_log_id

→ SymptomLogs.id

Doctor.specialist_id

→ Specialists.id

Doctor.hospital_id

→ Hospitals.id

Appointment.user_id

→ Users.id

Appointment.doctor_id

→ Doctors.id

Notification.user_id

→ Users.id

---

# 7. Index Strategy

Indexes should exist for:

Users

* email
* username

Hospitals

* city
* hospital_name

Doctors

* specialist_id
* hospital_id

Appointments

* appointment_date
* doctor_id
* user_id

Symptom Logs

* user_id
* created_at

Notifications

* user_id

Indexes should support the most common search operations.

---

# 8. Constraints

Users

* Email must be unique.
* Username must be unique.

Appointments

* Appointment date cannot be in the past.
* Doctor must exist.
* User must exist.

Health Profile

* Age must be positive.
* Height must be positive.
* Weight must be positive.

Predictions

* Severity must be one of:

  * Low
  * Moderate
  * High
  * Emergency

---

# 9. Data Integrity Rules

* Every Health Profile belongs to one User.
* Every Appointment belongs to one User.
* Every Doctor belongs to one Hospital.
* Every Doctor belongs to one Specialist.
* Predictions cannot exist without a Symptom Log.
* Notifications cannot exist without a User.

---

# 10. Audit Fields

Transactional tables include:

* created_at
* updated_at

Future versions may include:

* created_by
* updated_by
* deleted_at (Soft Delete)

---

# 11. Migration Strategy

Schema changes are managed using Alembic.

Migration rules:

* Never modify production tables manually.
* Every schema change requires a migration.
* Migrations must be version controlled.
* Rollback scripts should be supported where possible.

---

# 12. Future Database Enhancements

Potential future tables:

* Medical Reports
* Uploaded Files
* Chat History
* AI Audit Logs
* Feedback
* Reviews
* Hospital Ratings
* Doctor Ratings
* Emergency Contacts
* Insurance Information

These are intentionally excluded from Version 1 to keep the initial release focused.

---

# 13. Database Design Principles

The database must follow these principles:

* Normalize data where practical.
* Avoid duplicate information.
* Use foreign keys for relationships.
* Keep business logic outside database models.
* Access the database only through repositories.
* Optimize common queries using indexes.
* Design tables for future scalability.

This document defines the canonical database structure for CarePlus Medical Assistant.
