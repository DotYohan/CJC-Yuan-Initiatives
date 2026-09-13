# Phase 2 backend database foundation

Status: review-only. No pending migration has been applied.

## Migration order

1. `20260823010000_add_subject_requirements`
2. `20260823020000_complete_backend_foundation`
3. `20260823030000_complete_backend_constraints`

The second migration is Prisma-generated additive DDL. The third contains the
reviewed PostgreSQL checks, partial unique indexes, consistency triggers, and
append-only protections that Prisma 6.12 cannot express.

## Domain boundaries

- Organization: academic years and terms, program snapshots, and effective-dated program heads.
- Admissions and students: applications, decision history, program/curriculum assignments, and status history.
- Faculty: department assignments, specializations, and employment history.
- Enrollment: term enrollment, registered offerings, status history, and approved overrides.
- Scheduling: rooms, sections, subject offerings, instructors, and recurring meetings.
- Grades: term grading periods, enrollment-item grades, completion support, and immutable history.
- Clearance: cycles, office/department requirements, student clearance, and item decisions.
- Finance: assessments, charge lines, invoices, payments, allocations, and an immutable double-direction ledger.
- Requests: data-driven request types, workflow records, immutable status history, and optional fee linkage.

Authentication remains the identity and authorization boundary. New domain
records may reference a user as an actor, but no academic or employment data is
stored in `users` and no authentication table is altered.

## Decisions awaiting school data

- Department ownership for BSECE, BSCpE, and BSCE.
- Program duration and terms per year.
- Official academic calendar and grading scale.
- Reviewed curriculum versions, subject catalog, and requirement graph.
- Whether one simultaneous program head per program is sufficient.

Until these are approved, `npm run seed:plan` remains intentionally blocked from
database writes and no subject seed files exist.
