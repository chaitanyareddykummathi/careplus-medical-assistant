# CarePlus Medical Assistant

# AI Prompt Engineering Specification

Version: 1.0

Status: Active

---

# Purpose

This document defines how OpenAI is integrated into the CarePlus Medical Assistant.

It serves as the contract between the backend AI service and the OpenAI API.

Every OpenAI request must follow this specification.

The backend remains the source of truth for all medical decisions.

OpenAI is responsible only for understanding natural language and converting user symptoms into structured medical information.

---

# AI Responsibilities

OpenAI is responsible for:

* Understanding natural language.
* Extracting symptoms.
* Extracting duration.
* Extracting body location.
* Extracting pain severity.
* Extracting associated symptoms.
* Normalizing symptom names.
* Returning structured JSON.

OpenAI is NOT responsible for:

* Diagnosing diseases.
* Predicting severity.
* Recommending hospitals.
* Recommending specialists.
* Providing treatment.
* Suggesting medication.
* Making medical decisions.

---

# AI Provider

Primary Provider

OpenAI

Future Supported Providers

* Azure OpenAI
* Google Gemini
* Anthropic Claude

The application architecture must support replacing the provider without changing backend business logic.

---

# Recommended OpenAI Model

Primary Model

GPT-5.5

Reasoning

High

Future Upgrade Path

* GPT-6
* Azure GPT
* Other supported providers

Changing models should require only configuration updates.

---

# AI Workflow

User enters symptoms

↓

Prompt Builder

↓

OpenAI API

↓

Structured JSON

↓

Response Validator

↓

Rule Engine

↓

Severity Engine

↓

Specialist Mapping

↓

Hospital Recommendation

↓

API Response

---

# System Prompt

The AI should receive the following system instructions.

---

You are an AI medical language understanding assistant.

Your responsibility is ONLY to extract structured symptom information from user input.

You must never diagnose diseases.

You must never recommend treatment.

You must never recommend medication.

You must never calculate severity.

You must never recommend hospitals.

You must never recommend specialists.

Always return valid JSON.

If information is missing, return null.

Never invent symptoms that the user did not mention.

---

# User Prompt Template

The backend sends:

Analyze the following patient symptoms.

Extract every symptom mentioned.

Return only valid JSON.

Patient Input:

{{USER_INPUT}}

---

# Expected JSON Response

```json
{
  "symptoms": [
    "fever",
    "cough"
  ],
  "duration": "2 days",
  "body_location": [
    "throat"
  ],
  "pain_level": "moderate",
  "associated_symptoms": [
    "fatigue"
  ],
  "confidence": 0.95
}
```

The response must contain JSON only.

No markdown.

No explanations.

No additional text.

---

# JSON Rules

Required

* symptoms
* confidence

Optional

* duration
* body_location
* pain_level
* associated_symptoms

Null should be used when information is unavailable.

---

# Validation Rules

Every AI response must pass validation.

Validation includes:

* Valid JSON
* Required fields
* Correct data types
* Confidence between 0 and 1
* Non-empty symptom list
* Maximum response length
* No unexpected properties

Invalid responses must be rejected.

---

# Retry Strategy

If validation fails:

Attempt one automatic retry.

If retry fails:

Return an AI Processing Error.

Do not continue to the Rule Engine.

---

# Temperature

0.2

Reason

Medical information should be deterministic and repeatable.

---

# Max Tokens

300

Reason

Only structured JSON is expected.

---

# Timeout

30 seconds

---

# Logging

Log

* Request ID
* Timestamp
* Response Time
* Token Usage
* Validation Result

Do NOT log:

* API Keys
* User Passwords
* JWT Tokens
* Sensitive Health Information

---

# Medical Safety Rules

The AI must never claim:

"You have pneumonia."

"You have cancer."

"You have a heart attack."

Instead, it extracts symptoms only.

Medical reasoning is handled by backend services.

---

# Backend Responsibilities

After receiving validated JSON, the backend performs:

* Symptom Validation
* Rule Engine
* Severity Calculation
* Disease Category Mapping
* Specialist Recommendation
* Hospital Recommendation
* Appointment Recommendation

The backend remains the decision-making authority.

---

# Error Handling

Possible AI Errors

* Invalid JSON
* Empty Response
* Timeout
* Rate Limit
* Provider Unavailable

Each error should return a standardized backend response.

---

# Future Improvements

Future versions may include:

* Multilingual symptom extraction.
* Medical abbreviation expansion.
* OCR integration.
* Voice symptom input.
* Patient conversation memory.
* Structured follow-up questions.

These enhancements must remain compatible with the existing AI service interface.

---

# Implementation Rules

The AI service must:

* Build prompts using templates.
* Never hardcode prompts in routes.
* Never bypass validation.
* Never expose raw OpenAI responses.
* Always return structured backend objects.

Prompt templates should remain centralized so updates can be made without changing business logic.
