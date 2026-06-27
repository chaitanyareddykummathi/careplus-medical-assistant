# ADR-003: PostgreSQL as the Primary Database

Status: Accepted

Date: 2026-06-26

---

# Context

CarePlus requires a relational database to store healthcare data, user accounts, appointments, hospitals, and audit information.

---

# Decision

PostgreSQL is selected as the primary database.

SQLAlchemy is used as the ORM.

Alembic manages migrations.

---

# Reasons

PostgreSQL provides:

* ACID compliance.
* Strong relational support.
* Excellent indexing.
* JSON support.
* High scalability.
* Mature ecosystem.

---

# Alternatives Considered

SQLite

Rejected because:

* Limited scalability.

MongoDB

Rejected because:

* Relational data dominates this application.

---

# Consequences

Benefits

* Strong consistency.
* Reliable transactions.
* Production readiness.

Trade-offs

* More schema planning.
* Structured migrations.
