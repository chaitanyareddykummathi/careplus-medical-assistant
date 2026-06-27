# CarePlus Medical Assistant

# API Reference

Version: 1.0

Status: Active

---

# Overview

This document defines every public API endpoint exposed by the CarePlus Medical Assistant backend.

The API follows REST principles and JSON request/response formats.

Base URL

```text
/api
```

Authentication

JWT Bearer Token

Content Type

```text
application/json
```

Every endpoint returns the standard response format defined in **response-schemas.md**.

---

# API Groups

The API is divided into the following modules.

* Authentication
* Health Profile
* Symptoms
* Severity
* Specialists
* Hospitals
* Appointments
* Notifications
* System

---

# Authentication API

Base Route

```text
/api/auth
```

---

## POST /register

Description

Registers a new user.

Authentication

Not Required

Handled By

* auth_service.py

Repository

* user_repository.py

Validation

* Email must be unique.
* Username must be unique.
* Password must satisfy security policy.

Response

See:

* Register Response
* response-schemas.md

Possible Errors

* Email already exists
* Username already exists
* Invalid request body

---

## POST /login

Description

Authenticates an existing user.

Authentication

Not Required

Handled By

* auth_service.py

Validation

* Verify credentials.
* Verify password hash.

Response

JWT Access Token

Possible Errors

* Invalid credentials
* User disabled

---

## GET /me

Description

Returns authenticated user information.

Authentication

Required

JWT

Handled By

* auth_service.py

Response

User Profile Response

---

# Health Profile API

Base Route

```text
/api/health-profile
```

---

## POST /

Description

Create Health Profile.

Authentication

Required

Handled By

* health_profile_service.py

Validation

* Age > 0
* Height > 0
* Weight > 0

---

## GET /

Description

Retrieve Health Profile.

Authentication

Required

---

## PUT /

Description

Update Health Profile.

Authentication

Required

---

# Symptom API

Base Route

```text
/api/symptoms
```

---

## POST /analyze

Description

Analyzes user symptoms using OpenAI and backend rule processing.

Authentication

Required

Handled By

* symptom_service.py

Calls

* ai_service.py
* rule_engine.py
* severity_service.py

Processing Flow

User Input

↓

AI Service

↓

JSON Validation

↓

Rule Engine

↓

Severity

↓

Specialist Recommendation

↓

API Response

Validation

* Symptom text required.
* Input length validation.
* JSON validation.

Response

Validated Symptom Response

Severity Response

Specialist Recommendation

Medical Disclaimer

Possible Errors

* Invalid input
* AI unavailable
* Invalid AI response
* Validation failure

---

## GET /history

Description

Returns user symptom history.

Authentication

Required

Handled By

* symptom_service.py

---

# Severity API

Base Route

```text
/api/severity
```

---

## POST /evaluate

Description

Evaluates structured symptoms.

Authentication

Required

Handled By

* severity_service.py

Calls

* rule_engine.py

Response

Severity Response

Possible Errors

* Invalid symptom data

---

# Specialist API

Base Route

```text
/api/specialists
```

---

## POST /recommend

Description

Returns the recommended specialist.

Authentication

Required

Handled By

* specialist_service.py

Calls

* rule_engine.py

Response

Specialist Recommendation Response

---

## GET /

Returns supported specialists.

---

# Hospital API

Base Route

```text
/api/hospitals
```

---

## GET /

Returns available hospitals.

Authentication

Required

Handled By

* hospital_service.py

---

## GET /search

Description

Search hospitals by:

* City
* Department
* Specialist

Authentication

Required

---

## GET /{hospitalId}

Returns hospital details.

Authentication

Required

---

# Appointment API

Base Route

```text
/api/appointments
```

---

## POST /

Description

Books an appointment.

Authentication

Required

Handled By

* appointment_service.py

Validation

* Doctor exists.
* Hospital exists.
* Slot available.
* Future appointment date.

Response

Appointment Response

Possible Errors

* Slot unavailable
* Invalid doctor
* Invalid hospital

---

## GET /

Returns appointment history.

Authentication

Required

---

## PUT /{appointmentId}

Description

Reschedule appointment.

Authentication

Required

---

## DELETE /{appointmentId}

Description

Cancel appointment.

Authentication

Required

---

# Notification API

Base Route

```text
/api/notifications
```

---

## GET /

Returns user notifications.

Authentication

Required

Handled By

* notification_service.py

---

## PUT /{notificationId}

Marks notification as read.

Authentication

Required

---

# System API

Base Route

```text
/api/system
```

---

## GET /health

Purpose

Application health check.

Authentication

Not Required

Returns

* Database status
* OpenAI status
* Version

---

## GET /metrics

Purpose

Application metrics.

Authentication

Admin Only (Future)

---

# HTTP Status Codes

200

Successful Request

201

Resource Created

204

No Content

400

Bad Request

401

Unauthorized

403

Forbidden

404

Not Found

409

Conflict

422

Validation Error

429

Rate Limited

500

Internal Server Error

503

Service Unavailable

---

# Authentication Rules

Protected endpoints require:

Authorization Header

```text
Authorization: Bearer <JWT_TOKEN>
```

Expired tokens return:

401 Unauthorized

---

# Validation Rules

Every endpoint must validate:

* Request body
* Data types
* Required fields
* Business rules

Invalid requests never reach the service layer.

---

# Error Handling

Every endpoint returns standardized error responses.

Errors include:

* Validation Errors
* Authentication Errors
* Authorization Errors
* Database Errors
* AI Errors
* Internal Errors

Internal exceptions are never exposed to clients.

---

# Rate Limiting

Authentication APIs

Enabled

AI APIs

Enabled

Appointment APIs

Enabled

System APIs

Configurable

---

# API Versioning

Current Version

v1

Future breaking changes require:

```text
/api/v2/
```

Minor additions remain backward compatible.

---

# API Design Principles

The API follows these engineering principles:

* RESTful design
* Stateless requests
* JWT authentication
* Standardized responses
* Consistent validation
* Service-oriented architecture
* Repository pattern
* Thin controllers
* AI-assisted processing
* Backend-controlled medical decisions

This document serves as the official API contract for CarePlus Medical Assistant.
