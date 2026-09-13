# Phase 3 — Student Dashboard

## Scope

Phase 3 replaces the generic Student workspace with a protected, read-only dashboard.
It does not yet implement profile editing, enrollment submission, adding/dropping,
clearance actions, document-request submission, or online payments.

## API

`GET /api/v1/student/dashboard`

- Requires an authenticated account with `portal.access.student`.
- Rejects temporary-password accounts until their password is changed.
- Resolves the Student profile through `students.user_id`; it never accepts a
  student ID from the browser.
- Returns a safe `linked: false` state when the account has no Student profile.
- Reads current enrollment items, schedule meetings, posted final grades,
  clearance progress, recent requests and payments, and a ledger-derived balance.

## Frontend

The existing `/portal/student` route now displays:

- Student identity, program, curriculum, year level, and status
- Current academic term and registered load
- Weekly schedule
- Posted final grades
- Clearance progress
- Recent requests and payments
- Balance derived from immutable debit and credit transactions

The layout is responsive, keyboard-accessible, safe for empty records, and keeps
the independent-project notice and existing account-security controls.

## Verification

`npm test` runs inside a rolled-back PostgreSQL transaction and confirms:

1. Student authentication and session validation
2. Student access to the dashboard using its linked profile
3. Administrator denial from the Student dashboard without Student permission
4. Existing logout and Administrator account-management authorization
