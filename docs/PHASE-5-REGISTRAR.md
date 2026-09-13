# Phase 5 - Registrar Foundation

## Scope

The existing `registrar` role now receives the enrollment-lifecycle permission
catalog. Authentication continues to use the existing User, Role, Permission,
scrypt, session, CSRF, and audit systems.

The Registrar workspace displays the current enrollment period, academic year
and term, application totals, and controls for opening or closing a period.
Open and close operations are server-authorized and audited.

## Database

`EnrollmentPeriod` is linked to one `AcademicYear` and one `AcademicTerm`, with
optional opened/closed actor users and timestamps. One period is allowed per
academic term. Migration: `20260823060000_add_enrollment_periods`.

## Registrar permissions

The catalog grants the existing Registrar role:

- `VIEW_ENROLLMENT_PERIOD`, `CREATE_ENROLLMENT_PERIOD`, `UPDATE_ENROLLMENT_PERIOD`
- `OPEN_ENROLLMENT`, `CLOSE_ENROLLMENT`
- `VIEW_STUDENT_APPLICATION`, `APPROVE_STUDENT_APPLICATION`, `REJECT_STUDENT_APPLICATION`
- `VIEW_DOCUMENTS`, `VERIFY_DOCUMENTS`
- `VIEW_ENROLLMENT`, `APPROVE_ENROLLMENT`

## API

- `GET /api/v1/registrar/dashboard`
- `GET /api/v1/registrar/applications`
- `GET|PATCH /api/v1/registrar/applications/{id}`
- `PATCH /api/v1/registrar/documents/{id}`
- `POST /api/v1/registrar/enrollment-period/open`
- `POST /api/v1/registrar/enrollment-period/close`

## Student portal reflection

`GET /api/v1/student/enrollment/options` now reports `periodStatus` and an
`enrollmentOpen` flag per academic term. Submitting an enrollment application
(`POST /api/v1/student/enrollment/submit`) is rejected with
`409 ENROLLMENT_CLOSED` unless the selected term has an enrollment period in
the `OPEN` state; drafts may still be saved at any time. The enrollment dialog
shows the window status, labels closed terms, and disables the submit button.

## Tests

`tests/registrar.test.mjs` covers login and landing path, dashboard access,
permission enforcement (student/faculty denials), opening a period with actor
and timestamp verification, student options/submit while open, closing a
period with actor and timestamp verification, submit rejection after close,
reopen semantics, and double-close rejection. Run with `npm test`.

## Local account

```powershell
npm.cmd run seed:registrar
```

The development account is `registrar.demo` with email
`registrar@g.cjc.edu.ph` and temporary password `Cjc123456!!!`. The existing
12-character password policy is preserved, so the shorter requested
`Cjc123456` cannot be accepted. Change the password on first login.

## Verification

The live flow was verified by logging in, changing the temporary password,
loading the Registrar dashboard, opening a term, closing it, and confirming the
database returned `OPEN` and `CLOSED` states. The demo account was then reset to
its initial temporary-password state. Payment, documents, student application
decisions, and enrollment approval remain future workflow surfaces.