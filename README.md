# Cor Jesu College Student Services Portal

This repository contains the completed **Phases 1–5** and **Phase 6 (in progress)** of the CJC Student Services Portal:

- **Phase 1**: Public website (responsive HTML/CSS/JS)
- **Phase 2**: Authentication/DB foundation (RBAC, scrypt, sessions, CSRF, audit, password reset)
- **Phase 3**: Student Dashboard (read-only: profile, enrollment, schedule, grades, clearance, balance)
- **Phase 4**: Student Admission Signup (self-registration, student number, school email, admission app)
- **Phase 5**: Registrar Foundation (enrollment periods, application/document review, open/close enrollment)
- **Phase 6**: Enrollment Approval Hierarchy (Student → Program Head → Registrar) — *partially implemented, needs regression testing*

> This is an independent student project by Naldrelle Yuan Briones. It is not affiliated with or endorsed by Cor Jesu College, Inc. and is not an official source of information. Never enter or reuse credentials from an official CJC service here.

## Phase 2 features

- Database-backed sign-in by project username or email
- Salted scrypt password hashes; plaintext passwords are never stored
- Opaque, revocable server sessions in `HttpOnly`, `SameSite=Lax` cookies
- Same-origin and synchronizer-token CSRF protection
- Password-change enforcement for newly issued accounts
- Generic forgot-password responses and single-use, expiring reset links
- Login/password-change throttling, escalating account lockout, and immutable audit records
- Server-enforced, database-driven RBAC for all 13 account types
- Protected, role-derived portal routes; the browser does not choose its own role
- Administrator UI to create, list, activate, disable, and assign roles to project accounts
- Responsive sign-in, recovery, account, and administrator interfaces
- Fixed public-file allowlist so source, environment, database, test, and document files are not served

The protected workspaces confirm the signed-in account and role only. Operational dashboards belong to later phases.

## Requirements

- Node.js 24 or newer
- PostgreSQL 16+ (tested with 18.6)
- Prisma Client 7.10.0 (`npm.cmd install` installs project dependencies)

Phase 2 must run through the included Node server. Opening `index.html` directly or using CodeSwing alone cannot provide the same-origin cookies, CSRF tokens, API, and database required for authentication.

## Run locally

**Prerequisites**: Install PostgreSQL 16+ and create the database:

```powershell
# As PostgreSQL superuser (postgres):
psql -U postgres -c "CREATE ROLE cjc_app WITH LOGIN PASSWORD 'your_secure_password';"
psql -U postgres -c "CREATE DATABASE cor_jesu_sms OWNER cjc_app;"
```

Then in PowerShell from this folder:

```powershell
Copy-Item .env.example .env
# Edit .env with your DATABASE_URL and CJC_AUDIT_PEPPER
npx prisma migrate deploy
npm.cmd run seed:term
npm.cmd run seed:registrar
npm.cmd start
```

Then open `http://localhost:3000`.

For local admission testing, `npm.cmd run seed:term` creates the development academic-year/term fixture used by the public Student Enrollment signup page.

For local password recovery, request a reset in the sign-in dialog and copy the development-only reset link printed in the server terminal. A production deployment must send reset links through an approved delivery service instead.

**Demo accounts** (after seeding):
- `registrar.demo` / `Cjc123456!!!` (Registrar role)
- Student accounts created via `/signup.html` landing page

## Test

```powershell
npm.cmd test
```

The transaction-wrapped PostgreSQL integration test covers login, HTTP-only session cookies, session validation, logout revocation, Student denial from Administrator APIs, and Administrator authorization. Test data is rolled back.

## Account roles

`Student`, `Faculty`, `Program Head`, `Dean`, `Administrator`, `Student Assistant`, `Registrar`, `Cashier`, `SSC`, `LiRC Director`, `Laboratory In-charge`, `Yearbook Coordinator`, and `Proctor`.

## Project structure

```text
Project/
├── index.html, style.css, script.js
├── auth-client.js
├── portal.html, portal.css, portal.js
├── reset-password.html, reset-password.js
├── signup.html, signup.js, signup.css
├── assets/images/
├── server/
│   ├── app.mjs
│   ├── config.mjs
│   ├── db.mjs
│   ├── security.mjs
│   ├── seed.mjs
│   ├── server.mjs
│   ├── admission-store.mjs
│   ├── auth-store.mjs
│   ├── enrollment-store.mjs
│   ├── enrollment-review.mjs
│   ├── program-head-store.mjs
│   ├── registrar-store.mjs
│   ├── student-store.mjs
│   └── modules/financial/
├── tests/
│   ├── auth.test.mjs
│   ├── auth-client.test.mjs
│   ├── admission.test.mjs
│   ├── registrar.test.mjs
│   ├── program-head.test.mjs
│   ├── prerequisite.test.mjs
│   ├── financial.test.mjs
│   └── document-store.test.mjs
├── prisma/
│   ├── schema.prisma
│   ├── config.ts
│   ├── seeds/
│   └── migrations/
├── scripts/
│   └── database-refactor/
├── docs/
│   ├── PHASE-2.md
│   ├── PHASE-3.md
│   ├── PHASE-4-ADMISSION.md
│   ├── PHASE-5-REGISTRAR.md
│   ├── PHASE-2-BACKEND-FOUNDATION.md
│   ├── RECOVERY-HANDOFF.md
│   └── database-refactor-progress.md
├── .env.example
└── package.json
```

PostgreSQL credentials belong in the ignored `.env` file and are consumed through `DATABASE_URL`.

## Design and deployment notes

The backend uses Node's built-in HTTP server, Prisma ORM, and PostgreSQL. Before storing real student, academic, identity, or financial data, obtain institutional authorization and move to approved single sign-on, managed hosting, TLS, secret management, backups, monitoring, MFA for privileged accounts, and a formal privacy/security review.

See [docs/PHASE-2.md](docs/PHASE-2.md) for the database design, API routes, role mappings, manual acceptance checklist, and production recommendations.

## Public-site notes

The public page retains the responsive Phase 1 design, school identity content supplied for this project, local images, keyboard-friendly interactions, reduced-motion support, contact-card hover behavior (including Office Hours), and the independent-project footer disclaimer.
