# CarePlus Medical Assistant

# Development Workflow

Version: 1.0

Status: Active

---

# Purpose

This document defines the standard development workflow for the CarePlus Medical Assistant project.

The objective is to ensure that every feature is developed consistently using Specification Driven Development (SDD), clean architecture principles, and AI-assisted software engineering.

This workflow applies to all contributors and AI coding assistants.

---

# Development Methodology

The project follows:

* Specification Driven Development (SDD)
* Incremental Development
* Modular Architecture
* AI-Assisted Development
* Continuous Testing
* Documentation First

Every feature begins with documentation before implementation.

---

# Source of Truth

Development must follow this priority.

```text
spec.md

↓

Architecture Documents

↓

ADR Documents

↓

Task Files

↓

Implementation

↓

Testing

↓

Documentation Update
```

If documentation and implementation differ, the documentation must be reviewed before continuing development.

---

# Development Lifecycle

Every feature follows the same lifecycle.

```text
Requirement

↓

Specification

↓

Architecture Review

↓

Task Definition

↓

Implementation

↓

Testing

↓

Review

↓

Documentation Update

↓

Git Commit
```

No phase may skip these steps.

---

# Phase Workflow

Each project phase must be completed sequentially.

Current roadmap:

Phase 1

Authentication

↓

Phase 2

Symptom Checker

↓

Phase 3

Severity Engine

↓

Phase 4

Specialist Mapping

↓

Phase 5

Appointment Booking

A phase is considered complete only after meeting its completion criteria defined in the corresponding task document.

---

# Codex Development Workflow

Every implementation request should follow this order.

Step 1

Read

* spec.md

Step 2

Read

Relevant documentation from docs/

Step 3

Read

Relevant ADR documents

Step 4

Read

Current phase task file

Step 5

Analyze existing implementation

Step 6

Create implementation plan

Step 7

Implement only the requested task

Step 8

Run validation

Step 9

Update documentation if required

Step 10

Recommend the next task

Codex must never implement multiple phases simultaneously unless explicitly instructed.

---

# Implementation Rules

Every implementation must:

* Preserve existing functionality.
* Reuse existing modules whenever possible.
* Avoid duplicate logic.
* Follow the existing project architecture.
* Keep controllers thin.
* Keep business logic inside services.
* Access the database only through repositories.

---

# AI Development Rules

OpenAI is responsible only for:

* Natural language understanding
* Symptom extraction
* Medical entity extraction
* Structured JSON generation

OpenAI must never:

* Diagnose diseases
* Determine severity
* Recommend specialists
* Recommend hospitals
* Make treatment decisions

These responsibilities belong to backend services.

---

# Branching Strategy

Recommended Git workflow:

```text
main

↓

develop

↓

feature/<feature-name>

↓

bugfix/<bug-name>

↓

hotfix/<issue-name>
```

Examples:

```text
feature/authentication

feature/symptom-checker

feature/severity-engine

feature/appointments
```

---

# Commit Message Convention

Use conventional commit messages.

Examples:

```text
feat: implement symptom analysis service

feat: add OpenAI provider

fix: resolve JWT authentication bug

docs: update API reference

refactor: simplify rule engine

test: add appointment service tests
```

---

# Definition of Done (DoD)

A task is complete only when:

* Code is implemented.
* Tests pass.
* Documentation is updated.
* No existing functionality is broken.
* Code follows project architecture.
* Error handling is complete.
* Logging is implemented where required.

---

# Code Review Checklist

Before merging code, verify:

* Single Responsibility Principle followed.
* No duplicate logic.
* Proper error handling.
* Correct type hints.
* Repository pattern respected.
* Services remain cohesive.
* API responses follow response-schemas.md.
* Security requirements satisfied.

---

# Testing Workflow

Every feature requires testing.

Testing levels:

* Unit Tests
* Integration Tests
* API Tests
* Manual Verification

Regression testing should be performed before completing each phase.

---

# Documentation Workflow

Whenever architecture changes:

Update:

* spec.md (if required)
* architecture.md
* database.md
* api-reference.md
* response-schemas.md
* ADR documents (if an architectural decision changes)

Documentation should always reflect the current implementation.

---

# Logging Standards

Important events must be logged.

Examples:

* User Registration
* Login
* AI Request
* AI Failure
* Severity Calculation
* Appointment Booking
* System Errors

Sensitive information must never be written to logs.

---

# Security Checklist

Every new feature must verify:

* Authentication
* Authorization
* Input Validation
* Rate Limiting
* Secure Error Messages
* SQL Injection Prevention
* Prompt Injection Prevention
* API Key Protection

---

# Performance Guidelines

Development should prioritize:

* Readability
* Maintainability
* Scalability

Optimize performance only after correctness is achieved.

---

# Project Quality Principles

Every implementation should improve one or more of the following:

* Maintainability
* Reliability
* Security
* Scalability
* Testability
* Readability

No feature should reduce overall project quality.

---

# Final Workflow

```text
Read Specification

↓

Read Architecture

↓

Read ADR

↓

Read Task

↓

Analyze Existing Code

↓

Implement

↓

Test

↓

Update Documentation

↓

Commit

↓

Next Task
```

This workflow is the standard development process for the CarePlus Medical Assistant project and must be followed throughout the project lifecycle.
