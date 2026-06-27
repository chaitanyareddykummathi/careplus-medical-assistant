# CarePlus Medical Assistant - Master Specification

Version: 1.0

Status: In Development

---

# 1. Project Overview

## Project Name

CarePlus Medical Assistant

## Project Purpose

CarePlus Medical Assistant is an AI-assisted healthcare platform designed to help users perform preliminary symptom analysis, determine symptom severity, recommend the appropriate medical specialist, and simplify appointment booking. The system is intended to assist users in understanding their symptoms and navigating healthcare services efficiently while clearly communicating that it does not replace professional medical diagnosis.

The platform combines Large Language Models (OpenAI), deterministic rule-based decision making, and structured healthcare data to provide reliable and explainable recommendations.

The application is designed as a modular, scalable, and production-ready software system following clean architecture principles, service-oriented design, and Specification Driven Development (SDD).

---

## Target Users

Primary Users

* Patients seeking preliminary symptom assessment.
* Users searching for the appropriate medical specialist.
* Users booking appointments with hospitals or doctors.

Future Users

* Hospitals
* Clinics
* Healthcare administrators
* Doctors
* Telemedicine providers

---

## Project Goals

The system must:

* Provide secure user authentication.
* Maintain a user health profile.
* Accept symptoms in natural language.
* Use OpenAI to understand user symptoms.
* Convert natural language into structured medical information.
* Analyze symptom severity using deterministic backend rules.
* Recommend the appropriate medical specialist.
* Recommend suitable hospitals or clinics.
* Allow users to schedule appointments.
* Maintain symptom history and appointment history.
* Produce explainable and consistent outputs instead of black-box decisions.

---

## Project Scope

Included

* User Registration
* User Login
* JWT Authentication
* Health Profile Management
* AI-powered Symptom Understanding
* Rule-based Severity Analysis
* Specialist Recommendation
* Hospital Recommendation
* Appointment Booking
* Medical History
* User Dashboard

Not Included

* Final medical diagnosis
* Prescription generation
* Laboratory report interpretation
* Emergency ambulance dispatch
* Electronic Health Record (EHR) integration
* Insurance claim processing

---

## Core Design Principles

The project follows these principles throughout development:

* Specification Driven Development (SDD)
* Clean Architecture
* SOLID Principles
* Repository Pattern
* Service Layer Pattern
* Modular Design
* Explainable Decision Making
* AI-Assisted, Not AI-Controlled
* Security First
* Scalability
* Production Readiness

---

# 2. Technology Stack

## Frontend

* React.js
* Vite
* TypeScript (Future)
* Tailwind CSS
* Axios
* React Router
* React Hook Form

---

## Backend

* Python
* FastAPI
* SQLAlchemy
* Alembic
* Pydantic
* Uvicorn

---

## Database

* PostgreSQL

---

## Authentication

* JWT Authentication
* OAuth 2.0 (Future)
* bcrypt Password Hashing

---

## Artificial Intelligence

Primary Provider

* OpenAI API

Responsibilities

* Natural Language Understanding
* Symptom Extraction
* Medical Entity Extraction
* Structured JSON Generation

OpenAI is responsible only for understanding user input.

Medical reasoning, severity calculation, specialist mapping, and hospital recommendation are handled by backend services.

---

## Rule Engine

The backend rule engine is responsible for:

* Severity Classification
* Emergency Detection
* Disease Category Mapping
* Specialist Recommendation
* Hospital Recommendation
* Medical Safety Rules

---

## Infrastructure

* Docker
* Docker Compose
* Environment-based Configuration
* Logging
* Rate Limiting
* CORS
* Background Tasks (Future)

---

# 3. System Architecture

CarePlus follows a layered architecture where every layer has a single responsibility.

```text
User

↓

Frontend (React)

↓

FastAPI Routes

↓

Service Layer

↓

AI Service (OpenAI)

↓

Response Validation

↓

Rule Engine

↓

Repositories

↓

PostgreSQL Database
```

---

## Layer Responsibilities

Frontend

Responsible for user interaction, authentication, forms, dashboards, appointment booking, and displaying AI results.

API Layer

Handles request validation, authentication, authorization, and HTTP responses.

Service Layer

Contains all business logic and orchestrates communication between AI services, repositories, and rule engines.

AI Layer

Uses OpenAI to convert free-text symptom descriptions into structured medical information.

Rule Engine

Applies deterministic business rules for severity analysis, specialist mapping, and hospital recommendation.

Repository Layer

Handles all database operations without exposing database logic to services.

Database Layer

Stores users, health profiles, symptom history, predictions, appointments, hospitals, doctors, and audit information.

---

## Architectural Principles

The architecture must satisfy the following constraints:

* Controllers must remain thin.
* Business logic belongs only inside services.
* Services never access HTTP request objects directly.
* Database operations must go through repositories.
* OpenAI calls must be isolated inside the AI service.
* Rule Engine must never call OpenAI directly.
* AI responses must always be validated before use.
* Every service should be independently testable.

---

# 4. User Flow

The application follows a guided healthcare workflow.

```text
User Registration / Login

↓

Health Profile Setup

↓

User Dashboard

↓

Symptom Checker

↓

User enters symptoms in natural language

↓

OpenAI understands symptoms

↓

Structured symptom extraction

↓

Response validation

↓

Rule Engine

↓

Severity Analysis

↓

Possible Disease Category

↓

Specialist Recommendation

↓

Hospital Recommendation

↓

Appointment Booking

↓

Appointment Confirmation

↓

Medical History
```

---

## AI Processing Flow

```text
User Input

↓

OpenAI

↓

Structured JSON

↓

Backend Validation

↓

Rule Engine

↓

Severity Engine

↓

Specialist Mapping

↓

Hospital Mapping

↓

API Response
```

The AI layer never produces a final diagnosis.

The backend remains responsible for every medical decision shown to the user.

---

## Development Roadmap

The project will be developed in five sequential phases.

Phase 1

Authentication

Phase 2

Symptom Checker

Phase 3

Severity Engine

Phase 4

Specialist Mapping

Phase 5

Appointment Booking

Each phase must be fully implemented, tested, and reviewed before the next phase begins.
# 5. Core Features

CarePlus Medical Assistant is composed of five major functional modules. Each module is independently developed, tested, and maintained while working together as a complete healthcare workflow.

---

## Phase 1 – Authentication

Authentication provides secure access to the platform.

Features include:

* User Registration
* User Login
* JWT Authentication
* Protected API Routes
* Password Hashing
* User Session Management
* Logout
* User Profile
* Health Profile Initialization

The authentication system acts as the entry point for all protected services.

---

## Phase 2 – Symptom Checker

The Symptom Checker allows users to describe their symptoms using natural language.

Features include:

* Free-text symptom input
* OpenAI-powered symptom understanding
* Medical entity extraction
* Structured symptom generation
* Input validation
* Symptom history
* AI response validation
* Medical disclaimer

The Symptom Checker does not diagnose diseases.

Its responsibility is to convert user language into structured medical information.

---

## Phase 3 – Severity Engine

The Severity Engine evaluates extracted symptoms using deterministic backend rules.

Responsibilities include:

* Emergency detection
* Severity scoring
* Risk classification
* High-risk symptom identification
* Rule execution
* Safety validation

Possible severity levels:

* Low
* Moderate
* High
* Emergency

Emergency cases must bypass normal recommendations and immediately display emergency guidance.

---

## Phase 4 – Specialist Mapping

After severity analysis, the backend recommends the most appropriate specialist.

Examples include:

* Cardiologist
* Neurologist
* Dermatologist
* Orthopedic Specialist
* ENT Specialist
* Gastroenterologist
* Pulmonologist
* Psychiatrist
* General Physician

Recommendations are based on backend rule evaluation rather than AI-generated opinions.

---

## Phase 5 – Appointment Booking

Users may schedule appointments after receiving specialist recommendations.

Features include:

* Hospital search
* Doctor listing
* Department selection
* Appointment scheduling
* Appointment confirmation
* Appointment history
* Appointment cancellation (Future)

---

## Supporting Features

Additional platform capabilities include:

* User Dashboard
* Health Profile Management
* Symptom History
* Prediction History
* Notifications
* Medical Disclaimer
* Activity Logging
* Error Monitoring

---

# 6. Backend Architecture

The backend follows a layered architecture based on separation of responsibilities.

Each layer performs one responsibility only.

```text
Client

↓

API Routes

↓

Services

↓

Repositories

↓

Database
```

---

## Current Backend Structure

The existing backend structure is preserved and extended.

```text
backend/app/

api/
core/
db/
middleware/
models/
nlp/
repositories/
schemas/
services/
utils/
```

Future modules may be added without restructuring the project.

---

## API Layer

Location

```text
backend/app/api/
```

Responsibilities

* HTTP routing
* Authentication
* Request validation
* Response generation
* Dependency injection

Routes must never contain business logic.

---

## Service Layer

Location

```text
backend/app/services/
```

Responsibilities

* Business logic
* AI orchestration
* Severity analysis
* Specialist recommendation
* Appointment management
* Health profile management

Services communicate with repositories rather than directly accessing the database.

---

## Repository Layer

Location

```text
backend/app/repositories/
```

Responsibilities

* CRUD operations
* Database abstraction
* Query optimization
* Transaction handling

Repositories never contain business logic.

---

## Models

Location

```text
backend/app/models/
```

Responsibilities

* SQLAlchemy models
* Database relationships
* Table definitions

Models represent persistent storage only.

---

## Schemas

Location

```text
backend/app/schemas/
```

Responsibilities

* Request validation
* Response serialization
* API contracts
* Pydantic models

Schemas must remain independent of database models.

---

## Core Module

Location

```text
backend/app/core/
```

Responsibilities

* Configuration
* Security
* Logging
* Error handling
* Observability
* Celery configuration

---

## Middleware

Location

```text
backend/app/middleware/
```

Responsibilities

* Rate limiting
* Request filtering
* Authentication middleware
* Future middleware

---

## Utilities

Location

```text
backend/app/utils/
```

Responsibilities

* Shared helper functions
* Validators
* Reusable utilities

---

# 7. AI Architecture

The AI Layer is responsible only for understanding user language.

It is not responsible for diagnosis, treatment, or medical decision making.

---

## AI Provider

Primary Provider

OpenAI API

Future Providers

* Azure OpenAI
* Google Gemini
* Anthropic Claude

The architecture must support changing providers with minimal code modifications.

---

## AI Responsibilities

OpenAI is responsible for:

* Symptom extraction
* Medical entity extraction
* Duration extraction
* Body part identification
* Pain intensity extraction
* Symptom normalization
* Structured JSON generation

OpenAI is not responsible for:

* Disease diagnosis
* Severity classification
* Hospital recommendation
* Specialist recommendation
* Medical advice

---

## AI Processing Pipeline

```text
User Input

↓

Prompt Builder

↓

OpenAI API

↓

Structured JSON

↓

Response Validator

↓

Backend Services

↓

Rule Engine

↓

API Response
```

---

## Response Validation

Every AI response must be validated before entering the business layer.

Validation includes:

* Required fields
* JSON schema validation
* Missing values
* Unsupported symptoms
* Invalid confidence scores
* Empty responses

Invalid AI responses must never reach the Rule Engine.

---

## AI Safety Rules

The AI must never:

* Diagnose diseases
* Recommend medication
* Replace doctors
* Guarantee accuracy
* Ignore medical disclaimers

The backend remains the source of truth for all healthcare recommendations.

---

# 8. Database Models

The system uses PostgreSQL as the primary database.

Each entity has a clearly defined responsibility.

---

## Users

Stores registered platform users.

Fields include:

* id
* name
* email
* username
* hashed_password
* role
* is_active
* created_at
* updated_at

---

## Health Profiles

Stores personal health information.

Fields include:

* user_id
* age
* gender
* height
* weight
* blood_pressure
* blood_sugar
* allergies
* chronic_conditions

---

## Symptoms

Stores standardized symptom definitions.

Examples

* Fever
* Headache
* Chest Pain
* Cough
* Vomiting

---

## Symptom Logs

Stores every symptom submission.

Fields include:

* user_id
* raw_input
* extracted_symptoms
* severity_level
* created_at

---

## Predictions

Stores symptom analysis results.

Fields include:

* symptom_log_id
* disease_category
* confidence_score
* severity_level
* specialist
* recommendation

---

## Hospitals

Stores hospital information.

Fields include:

* hospital_name
* address
* city
* departments
* contact_number

---

## Doctors

Stores doctor information.

Fields include:

* doctor_name
* specialization
* hospital_id
* availability
* experience

---

## Appointments

Stores user bookings.

Fields include:

* user_id
* doctor_id
* hospital_id
* appointment_date
* appointment_time
* appointment_status

---

## Notifications

Stores user notifications.

Examples include:

* Appointment Confirmation
* Appointment Reminder
* System Alerts
* Health Notifications

---

## Future Models

The following models may be introduced in future versions:

* Medical Reports
* Uploaded Documents
* Chat History
* AI Audit Logs
* Feedback
* Hospital Reviews

---

## Database Design Principles

The database must satisfy the following rules:

* Every table has a primary key.
* Foreign keys enforce relationships.
* Soft deletion is preferred over permanent deletion where appropriate.
* Audit timestamps are maintained for all transactional tables.
* Business logic must never exist inside database models.
* All database operations must pass through repositories.
# 9. API Endpoints

The backend follows RESTful API design principles.

Every endpoint must:

* Validate request data using Pydantic schemas.
* Require JWT authentication unless explicitly public.
* Return consistent JSON responses.
* Use proper HTTP status codes.
* Never expose internal exceptions.
* Delegate business logic to services.

---

# Authentication APIs

Base Route

```text
/api/auth
```

Endpoints

### POST /register

Creates a new user account.

Responsibilities

* Validate request
* Check duplicate email
* Hash password
* Create user
* Return JWT token

---

### POST /login

Authenticates an existing user.

Responsibilities

* Validate credentials
* Verify password
* Generate JWT
* Return authenticated user

---

### GET /me

Returns authenticated user information.

Requires JWT Authentication.

---

### POST /logout

Invalidates current session (Future).

---

# Health Profile APIs

Base Route

```text
/api/health-profile
```

Endpoints

### POST /

Create Health Profile

### GET /

Retrieve Health Profile

### PUT /

Update Health Profile

---

# Symptom APIs

Base Route

```text
/api/symptoms
```

Endpoints

### POST /analyze

Accepts free-text symptom descriptions.

Responsibilities

* Validate input
* Call AI Service
* Validate AI response
* Execute Rule Engine
* Calculate Severity
* Generate Recommendation

Returns

* Extracted Symptoms
* Severity Level
* Possible Disease Category
* Specialist Recommendation
* Medical Disclaimer

---

### GET /history

Returns user's symptom history.

---

# Severity APIs

Base Route

```text
/api/severity
```

Endpoints

### POST /evaluate

Evaluates structured symptoms.

Returns

* Severity
* Emergency Status
* Risk Score

---

# Specialist APIs

Base Route

```text
/api/specialists
```

Endpoints

### POST /recommend

Returns recommended specialist.

### GET /

Returns supported specialists.

---

# Hospital APIs

Base Route

```text
/api/hospitals
```

Endpoints

### GET /

List hospitals.

### GET /{hospital_id}

Hospital details.

### GET /search

Search hospitals by:

* Specialist
* City
* Department

---

# Appointment APIs

Base Route

```text
/api/appointments
```

Endpoints

### POST /

Book Appointment.

### GET /

Appointment History.

### PUT /{appointment_id}

Reschedule Appointment.

### DELETE /{appointment_id}

Cancel Appointment.

---

# System APIs

### GET /health

Application Health Check.

### GET /metrics

Application Metrics.

---

# API Design Rules

All APIs must:

* Return JSON.
* Follow REST conventions.
* Use HTTP status codes correctly.
* Return structured error responses.
* Never return raw exceptions.
* Validate every request.
* Require authentication where appropriate.

---

# 10. Development Phases

Development follows Specification Driven Development (SDD).

Every phase must be completed, reviewed, and tested before the next phase begins.

No phase may introduce unfinished features from later phases.

---

## Phase 1

Authentication

Objectives

* Registration
* Login
* JWT Authentication
* Protected Routes
* User Profile
* Health Profile Initialization
* Authentication Security
* Input Validation

Deliverable

A fully secured authentication system.

---

## Phase 2

Symptom Checker

Objectives

* Symptom Input
* OpenAI Integration
* Prompt Builder
* AI Service
* Response Validation
* Symptom History
* Medical Disclaimer

Deliverable

Reliable symptom understanding using OpenAI.

---

## Phase 3

Severity Engine

Objectives

* Rule Engine
* Severity Calculation
* Emergency Detection
* Risk Classification
* Severity Explanation

Deliverable

Explainable severity assessment.

---

## Phase 4

Specialist Mapping

Objectives

* Disease Category Mapping
* Specialist Recommendation
* Hospital Recommendation
* Doctor Recommendation

Deliverable

Correct healthcare routing.

---

## Phase 5

Appointment Booking

Objectives

* Hospital Listing
* Doctor Listing
* Available Slots
* Appointment Booking
* Appointment History
* Notifications

Deliverable

Complete patient workflow.

---

# Phase Completion Rules

A phase is complete only when:

* Backend is implemented.
* Frontend is implemented.
* Database changes are complete.
* APIs are tested.
* Error handling is complete.
* Documentation is updated.
* Existing functionality is not broken.

---

# 11. Security Requirements

CarePlus handles healthcare-related information.

Security is mandatory.

---

## Authentication

* JWT Authentication
* Password Hashing using bcrypt
* Protected Routes
* Token Validation
* Session Expiration

---

## Input Validation

Every API request must be validated.

Reject:

* Missing fields
* Invalid values
* Malformed JSON
* Oversized payloads

---

## AI Security

OpenAI responses must never be trusted directly.

Every response must pass:

* JSON Validation
* Schema Validation
* Business Validation

Invalid responses must be rejected.

---

## Medical Safety

The system must never:

* Diagnose diseases.
* Recommend medication.
* Replace licensed doctors.
* Guarantee medical accuracy.

Every prediction must display a medical disclaimer.

---

## Logging

The backend must log:

* Authentication Events
* AI Requests
* AI Failures
* Severity Calculations
* Appointment Events
* System Errors

Sensitive user information must never appear in logs.

---

## Rate Limiting

Authentication APIs

* Rate Limited

AI APIs

* Rate Limited

Appointment APIs

* Rate Limited

---

# 12. Final Expected Outcome

The completed CarePlus Medical Assistant must provide a secure, scalable, and production-ready healthcare assistance platform.

Users should be able to:

* Register
* Login
* Manage their health profile
* Describe symptoms naturally
* Receive structured symptom analysis
* View severity assessment
* Receive specialist recommendations
* Find hospitals
* Book appointments
* View medical history

The system must remain modular, maintainable, explainable, and easy to extend.

---

# 13. Codex Implementation Rules

This specification is the single source of truth for the project.

Every implementation must follow these rules.

---

## General Rules

* Implement one phase at a time.
* Never skip phases.
* Never modify unrelated modules.
* Prefer extending existing code over rewriting it.
* Preserve backward compatibility.

---

## Architecture Rules

* Routes handle HTTP only.
* Services contain business logic.
* Repositories handle database access.
* Models represent database tables.
* Schemas validate requests and responses.
* AI Service communicates with OpenAI.
* Rule Engine performs deterministic decision making.

---

## AI Rules

OpenAI must only:

* Understand symptoms.
* Extract medical entities.
* Return structured JSON.

OpenAI must never:

* Diagnose diseases.
* Calculate severity.
* Recommend hospitals.
* Recommend specialists.

---

## Rule Engine Rules

Rule Engine is responsible for:

* Severity
* Disease Category
* Emergency Detection
* Specialist Mapping
* Hospital Mapping

The Rule Engine must never call OpenAI directly.

---

## Database Rules

* No database queries inside API routes.
* No business logic inside models.
* Database access only through repositories.

---

## Service Rules

Every service must have a single responsibility.

Services communicate with each other only when required.

Circular dependencies are prohibited.

---

## Error Handling

All exceptions must:

* Be logged.
* Return standardized API responses.
* Never expose internal details.

---

## Coding Standards

* Follow PEP 8.
* Use type hints.
* Use descriptive naming.
* Keep functions focused.
* Avoid duplicate logic.
* Prefer composition over inheritance.

---

## Implementation Verification

At the end of every development task, Codex must:

* List created files.
* List modified files.
* Explain architectural decisions.
* Verify existing functionality still works.
* Recommend the next implementation step.

No implementation should proceed unless the current phase is fully completed and verified.
