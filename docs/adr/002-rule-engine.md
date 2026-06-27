# ADR-002: Rule Engine for Medical Decisions

Status: Accepted

Date: 2026-06-26

---

# Context

The application must determine symptom severity, specialist recommendations, and hospital mapping.

These decisions must be deterministic and explainable.

---

# Decision

A backend Rule Engine will perform all healthcare decision making.

The Rule Engine is independent from OpenAI.

---

# Responsibilities

The Rule Engine handles:

* Severity calculation.
* Emergency detection.
* Disease category mapping.
* Specialist mapping.
* Hospital mapping.

---

# AI Responsibility

OpenAI extracts information.

The Rule Engine interprets information.

---

# Reasons

Benefits

* Explainable decisions.
* Consistent outputs.
* Easier testing.
* Regulatory friendliness.
* Reduced hallucination risk.

---

# Alternatives Considered

LLM-only decision making.

Rejected because:

* Non-deterministic.
* Difficult to test.
* Difficult to explain.
* Medical safety concerns.

---

# Consequences

Medical logic remains entirely inside backend services.

The Rule Engine becomes the authoritative decision component.
