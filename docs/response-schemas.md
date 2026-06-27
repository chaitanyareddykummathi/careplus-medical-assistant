# CarePlus Medical Assistant

# Response Schemas

Version: 1.0

Status: Active

---

# Purpose

This document defines every standard request and response object used throughout the CarePlus Medical Assistant.

It serves as the API contract between:

* Frontend ↔ Backend
* Backend ↔ AI Service
* Backend ↔ Database Layer

No endpoint should return a custom response outside this specification.

---

# Standard API Response

Every successful response follows this structure.

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

---

# Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists."
    }
  ]
}
```

---

# Authentication Responses

## Register Response

```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "access_token": "jwt_token",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Login Response

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "access_token": "jwt_token",
    "token_type": "bearer",
    "user": {}
  }
}
```

---

## User Profile Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "",
    "email": "",
    "username": "",
    "role": "user"
  }
}
```

---

# Health Profile Response

```json
{
  "success": true,
  "data": {
    "age": 25,
    "gender": "Male",
    "height": 175,
    "weight": 70,
    "blood_pressure": "120/80",
    "blood_sugar": "Normal",
    "allergies": [],
    "chronic_conditions": []
  }
}
```

---

# AI Response (Internal Only)

This response is never returned directly to the frontend.

```json
{
  "symptoms": [
    "fever",
    "headache"
  ],
  "duration": "2 days",
  "body_location": [
    "head"
  ],
  "pain_level": "moderate",
  "associated_symptoms": [
    "fatigue"
  ],
  "confidence": 0.94
}
```

---

# Validated Symptom Response

After backend validation.

```json
{
  "success": true,
  "data": {
    "symptoms": [
      "fever",
      "headache"
    ],
    "confidence": 0.94
  }
}
```

---

# Severity Response

```json
{
  "success": true,
  "data": {
    "severity": "Moderate",
    "risk_score": 62,
    "emergency": false,
    "reason": "Multiple symptoms require medical consultation."
  }
}
```

Allowed values

* Low
* Moderate
* High
* Emergency

---

# Disease Category Response

```json
{
  "success": true,
  "data": {
    "category": "Respiratory Infection"
  }
}
```

The category is informational only and must not be interpreted as a confirmed diagnosis.

---

# Specialist Recommendation Response

```json
{
  "success": true,
  "data": {
    "specialist": "General Physician",
    "department": "General Medicine"
  }
}
```

---

# Hospital Recommendation Response

```json
{
  "success": true,
  "data": {
    "hospital_id": 3,
    "hospital_name": "CarePlus City Hospital",
    "city": "Hyderabad"
  }
}
```

---

# Doctor Response

```json
{
  "success": true,
  "data": {
    "doctor_id": 12,
    "doctor_name": "Dr. Jane Smith",
    "specialization": "Cardiology",
    "experience": 12
  }
}
```

---

# Appointment Response

```json
{
  "success": true,
  "message": "Appointment booked successfully.",
  "data": {
    "appointment_id": 101,
    "doctor_name": "Dr. Jane Smith",
    "hospital_name": "CarePlus City Hospital",
    "appointment_date": "2026-07-01",
    "appointment_time": "10:30 AM",
    "status": "Confirmed"
  }
}
```

---

# Appointment History Response

```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 101,
      "doctor_name": "Dr. Jane Smith",
      "status": "Completed"
    }
  ]
}
```

---

# Notification Response

```json
{
  "success": true,
  "data": [
    {
      "title": "Appointment Reminder",
      "message": "Your appointment starts in 30 minutes.",
      "is_read": false
    }
  ]
}
```

---

# Health Check Response

```json
{
  "status": "healthy",
  "database": "connected",
  "openai": "available",
  "version": "1.0"
}
```

---

# Validation Error Response

HTTP 400

```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "field": "symptoms",
      "message": "Symptoms are required."
    }
  ]
}
```

---

# Authentication Error

HTTP 401

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

# Forbidden Response

HTTP 403

```json
{
  "success": false,
  "message": "Access denied."
}
```

---

# Not Found Response

HTTP 404

```json
{
  "success": false,
  "message": "Resource not found."
}
```

---

# Internal Server Error

HTTP 500

```json
{
  "success": false,
  "message": "Internal server error."
}
```

---

# AI Processing Error

```json
{
  "success": false,
  "message": "Unable to process symptoms at this time."
}
```

---

# Response Design Rules

Every response must:

* Return valid JSON.
* Include a success flag.
* Include a human-readable message where appropriate.
* Return data inside the data object.
* Never expose internal exceptions.
* Never expose SQL errors.
* Never expose OpenAI responses directly.

---

# Naming Standards

JSON keys must use:

camelCase

Example

```json
{
  "doctorName": "Dr. Jane Smith",
  "appointmentDate": "2026-07-01"
}
```

Python models may continue using snake_case internally.

The API layer is responsible for serialization if naming conventions differ.

---

# AI Contract

OpenAI communicates only with the AI Service.

The frontend must never consume OpenAI output directly.

Every AI response must pass:

* JSON Validation
* Schema Validation
* Business Validation

before entering the Rule Engine.

---

# Future Response Schemas

Future versions may introduce schemas for:

* Chat History
* OCR Reports
* Voice Analysis
* Medical Reports
* Insurance Information
* Emergency Contacts

These additions must remain backward compatible with Version 1.

---

# Versioning Policy

Breaking response changes require a new API version.

Minor additions should remain backward compatible.

This document is the canonical source for all response formats used within CarePlus Medical Assistant.
