# ADR-004: JWT-Based Authentication

Status: Accepted

Date: 2026-06-26

---

# Context

The application requires secure user authentication for protected healthcare information.

---

# Decision

JWT Authentication will be used.

Passwords will be hashed using bcrypt.

Protected APIs require JWT verification.

---

# Reasons

Benefits

* Stateless authentication.
* Easy frontend integration.
* Good FastAPI support.
* Production-ready.
* Scalable.

---

# Alternatives Considered

Server Sessions

Rejected because:

* Less scalable.

OAuth Only

Deferred for future versions.

---

# Consequences

Users remain authenticated using JWT access tokens.

Future versions may introduce refresh tokens and OAuth login.
