# Prisma seed architecture

This directory separates deterministic reference data from optional development data.
The root planning command performs validation only and never writes to PostgreSQL.

- `organization/`: colleges, departments, programs, academic years, and terms.
- `academic/`: subject, curriculum, curriculum-subject, and requirement import adapters.
- `security/`: the existing role and permission catalog adapter.
- `demo/`: development-only account adapter guarded by the existing environment checks.

The reviewed AY 2023-24 prospectus data is stored under `academic/data/` for BSECE,
BSCOE, and BSCE. Run `npm run seed:engineering:dry` to inspect all program-scoped
subjects, placements, prerequisites, and known exceptions. Database writes require
both `ALLOW_ACADEMIC_SEED=true` and `npm run seed:engineering`; the import is
transactional, idempotent, and aborts instead of overwriting conflicting data.
