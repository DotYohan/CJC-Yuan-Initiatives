# Cor Jesu College Student Services Portal

This repository contains the completed Phase 1 public website, deployed Phase 2 authentication/database foundation, and the Phase 3 Student Dashboard. The Student workspace now reads the signed-in account's linked profile, enrollment, schedule, posted final grades, clearance, recent requests, payments, and ledger-derived balance from PostgreSQL. Transactional student workflows remain later phases.

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
- PostgreSQL with the approved authentication migration applied
- Prisma Client 6.12.0 (`npm.cmd install` installs project dependencies)

Phase 2 must run through the included Node server. Opening `index.html` directly or using CodeSwing alone cannot provide the same-origin cookies, CSRF tokens, API, and database required for authentication.

## Run locally

From this folder in PowerShell:

```powershell
Copy-Item .env.example .env
npm.cmd run seed:term
npm.cmd start
```

Then open `http://localhost:3000`.

The PostgreSQL authentication catalog and cutover data must already exist. Optional demo seeding remains guarded by `NODE_ENV != production` and `ALLOW_DEMO_SEED=true`.

For local admission testing, `npm.cmd run seed:term` creates the development academic-year/term fixture used by the public Student Enrollment signup page.

For local password recovery, request a reset in the sign-in dialog and copy the development-only reset link printed in the server terminal. A production deployment must send reset links through an approved delivery service instead.

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
├── assets/images/
├── server/
│   ├── app.mjs
│   ├── config.mjs
│   ├── db.mjs
│   ├── security.mjs
│   ├── seed.mjs
│   └── server.mjs
├── tests/auth.test.mjs
├── docs/PHASE-2.md
├── .env.example
└── package.json
```

PostgreSQL credentials belong in the ignored `.env` file and are consumed through `DATABASE_URL`.

## Design and deployment notes

The backend uses Node's built-in HTTP server, Prisma ORM, and PostgreSQL. Before storing real student, academic, identity, or financial data, obtain institutional authorization and move to approved single sign-on, managed hosting, TLS, secret management, backups, monitoring, MFA for privileged accounts, and a formal privacy/security review.

See [docs/PHASE-2.md](docs/PHASE-2.md) for the database design, API routes, role mappings, manual acceptance checklist, and production recommendations.

## Public-site notes

The public page retains the responsive Phase 1 design, school identity content supplied for this project, local images, keyboard-friendly interactions, reduced-motion support, contact-card hover behavior (including Office Hours), and the independent-project footer disclaimer.
