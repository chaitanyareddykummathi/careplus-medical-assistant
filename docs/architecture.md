# CarePlus Medical Assistant

# Software Architecture Document

Version: 1.0

Status: Active

---

# 1. Overview

CarePlus Medical Assistant is designed using a layered, modular, and service-oriented architecture.

The objective is to separate responsibilities across independent components, allowing the system to remain maintainable, scalable, testable, and easy to extend.

The architecture follows:

* Specification Driven Development (SDD)
* Clean Architecture
* SOLID Principles
* Repository Pattern
* Service Layer Pattern
* Dependency Injection
* RESTful API Design

---

# 2. High-Level Architecture

```text
                        ┌──────────────────────┐
                        │      React Client    │
                        └──────────┬───────────┘
                                   │
                                   │ HTTP / JWT
                                   │
                        ┌──────────▼───────────┐
                        │    FastAPI Routes    │
                        └──────────┬───────────┘
                                   │
                     Authentication │ Validation
                                   │
                        ┌──────────▼───────────┐
                        │    Service Layer     │
                        └──────────┬───────────┘
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        │                          │                           │
        ▼                          ▼                           ▼
 AI Service                Rule Engine                 Repository Layer
        │                          │                           │
        ▼                          ▼                           ▼
 OpenAI API              Business Rules              PostgreSQL Database
```

---

# 3. Request Flow

Every request follows the same lifecycle.

```text
Client Request

↓

FastAPI Route

↓

Request Validation

↓

Authentication

↓

Service Layer

↓

AI Service (If Required)

↓

Response Validation

↓

Rule Engine

↓

Repository

↓

Database

↓

API Response
```

No layer may skip another layer.

---

# 4. Layer Responsibilities

## Frontend Layer

Responsibilities

* User Interface
* Authentication
* Dashboard
* Forms
* Appointment Booking
* Display AI Results

The frontend never communicates directly with the database or OpenAI.

---

## API Layer

Location

backend/app/api/

Responsibilities

* HTTP Routing
* JWT Verification
* Input Validation
* Dependency Injection
* HTTP Responses

The API layer must remain thin.

Business logic is prohibited.

---

## Service Layer

Location

backend/app/services/

Responsibilities

* Business Logic
* AI Orchestration
* Symptom Processing
* Severity Analysis
* Specialist Recommendation
* Appointment Management

Every service has exactly one responsibility.

---

## AI Layer

Responsibilities

* Prompt Construction
* OpenAI Communication
* Response Validation
* JSON Parsing

The AI Layer understands language only.

It never makes medical decisions.

---

## Rule Engine

Responsibilities

* Severity Classification
* Emergency Detection
* Disease Category Mapping
* Specialist Mapping
* Hospital Mapping

The Rule Engine never communicates directly with OpenAI.

---

## Repository Layer

Responsibilities

* CRUD Operations
* Query Management
* Transactions
* Database Abstraction

Repositories never contain business logic.

---

## Database Layer

Responsibilities

* Persistent Storage
* Relationships
* Constraints
* Audit Information

Business logic is prohibited inside models.

---

# 5. Backend Package Structure

```text
backend/app/

api/
core/
db/
middleware/
models/
repositories/
schemas/
services/
utils/
```

Additional AI modules

```text
backend/app/

ai/
│
├── providers/
│
├── prompts/
│
├── validators/
│
└── schemas/
```

This keeps AI infrastructure isolated from business logic.

---

# 6. Service Architecture

```text
services/

auth_service.py

health_profile_service.py

ai_service.py

symptom_service.py

severity_service.py

specialist_service.py

hospital_service.py

appointment_service.py

notification_service.py

rule_engine.py

cache_service.py

job_service.py
```

Each service owns a single business domain.

---

# 7. AI Processing Architecture

The AI layer is only responsible for Natural Language Understanding.

```text
User Input

↓

Prompt Builder

↓

OpenAI

↓

JSON Response

↓

Response Validator

↓

Structured Symptoms
```

Only validated JSON enters backend business logic.

---

# 8. Symptom Analysis Pipeline

```text
User

↓

Symptom API

↓

Symptom Service

↓

AI Service

↓

OpenAI

↓

JSON Validation

↓

Rule Engine

↓

Severity Service

↓

Specialist Service

↓

Hospital Service

↓

API Response
```

---

# 9. Authentication Flow

```text
Register

↓

Password Hashing

↓

Database

↓

Login

↓

Password Verification

↓

JWT Generation

↓

Protected APIs
```

---

# 10. Appointment Flow

```text
Symptom Analysis

↓

Specialist Recommendation

↓

Hospital Recommendation

↓

Doctor Selection

↓

Appointment Booking

↓

Confirmation

↓

Appointment History
```

---

# 11. Dependency Rules

Allowed

Routes

↓

Services

↓

Repositories

↓

Database

Allowed

Services

↓

AI Service

Allowed

Services

↓

Rule Engine

Not Allowed

Route

✗

Repository

Not Allowed

Route

✗

OpenAI

Not Allowed

Repository

✗

OpenAI

Not Allowed

Model

✗

Business Logic

---

# 12. Error Handling Architecture

Every layer handles only its own errors.

Route

* HTTP Errors

Service

* Business Errors

AI

* Provider Errors

Repository

* Database Errors

Validation

* Schema Errors

Errors must propagate upward as standardized API responses.

---

# 13. Logging Architecture

The system logs

* Authentication Events
* API Requests
* AI Calls
* AI Failures
* Severity Decisions
* Appointment Events
* Database Errors

Sensitive data must never be logged.

---

# 14. Scalability Strategy

Future enhancements may include

* Redis Caching
* Celery Background Workers
* WebSockets
* Multiple AI Providers
* OCR Processing
* Voice Input
* Multi-language Support

The architecture is designed so these features can be added without major restructuring.

---

# 15. Architectural Principles

The following principles are mandatory.

* Thin Controllers
* Fat Services
* Repository Pattern
* Single Responsibility Principle
* Open/Closed Principle
* Dependency Injection
* Stateless APIs
* Deterministic Rule Engine
* AI-Assisted, Not AI-Controlled
* Modular Components
* High Cohesion
* Low Coupling

Every implementation must preserve these principles.

This document serves as the technical blueprint for all future development.
