# ADR-001: OpenAI as the AI Provider

Status: Accepted

Date: 2026-06-26

---

# Context

CarePlus Medical Assistant requires an AI system capable of understanding natural language symptom descriptions entered by users.

The AI component is responsible only for language understanding and structured symptom extraction.

Medical reasoning remains within the backend.

---

# Decision

The project will use the OpenAI API as the primary Large Language Model provider.

Initially, GPT-5.5 will be used with High Reasoning.

The AI provider will be accessed only through the AI Service layer.

No API route or business service may communicate directly with OpenAI.

---

# Reasons

OpenAI provides:

* Excellent natural language understanding.
* Reliable structured JSON generation.
* Strong developer ecosystem.
* Consistent API.
* Easy future model upgrades.
* Production-ready infrastructure.

---

# Alternatives Considered

Google Gemini

Pros

* Lower cost.
* Good multimodal support.

Cons

* Less consistent JSON generation.

---

Anthropic Claude

Pros

* Excellent reasoning.

Cons

* Additional provider integration.

---

Custom NLP Model

Pros

* Full control.

Cons

* Large datasets required.
* Long training time.
* High maintenance.

Rejected for Version 1.

---

# Consequences

Benefits

* Faster development.
* Better maintainability.
* Better JSON reliability.

Trade-offs

* External API dependency.
* Token costs.
* Network latency.

---

# Future Direction

The architecture should support replacing OpenAI with another provider without changing backend business logic.

Only the provider implementation should change.
