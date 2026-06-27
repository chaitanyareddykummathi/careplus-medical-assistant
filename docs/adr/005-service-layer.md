# ADR-005: Service Layer Architecture

Status: Accepted

Date: 2026-06-26

---

# Context

The backend contains multiple business domains including authentication, AI processing, severity analysis, specialist mapping, and appointment booking.

A clear separation of responsibilities is required.

---

# Decision

Business logic will be implemented inside dedicated service classes.

Each service owns exactly one responsibility.

The final service structure is:

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

---

# Reasons

Benefits

* High cohesion.
* Low coupling.
* Easy testing.
* Easy maintenance.
* Easy scalability.

---

# Rules

API Routes

↓

Services

↓

Repositories

↓

Database

Routes never contain business logic.

Repositories never contain business logic.

The Rule Engine remains independent from the AI Service.

---

# Consequences

Future features can be added by introducing new services without affecting existing modules.

The architecture remains modular and follows the Single Responsibility Principle (SRP).
