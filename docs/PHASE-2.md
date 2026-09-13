# Phase 2 — Authentication and Account Management

## Scope and trust boundary

Phase 2 adds database-backed authentication, account management, server-side sessions, password recovery, and role-based access control. It intentionally stops before student records, enrollment, grades, clearance, payments, requests, notifications, and role-specific operational dashboards.

This repository is an independent student project and is not affiliated with Cor Jesu College, Inc. Accounts created here are project-specific accounts. Never enter or import an existing CJC password. An authorized institutional deployment should integrate with CJC's approved identity provider instead of collecting existing school credentials.

## System design

- Runtime: Node.js 24 or newer
- HTTP service: Node's built-in HTTP server
- Relational database: PostgreSQL through Prisma Client 6.12.0
- Authentication: project-issued username/email and password
- Password storage: salted scrypt hashes; the default non-test work factor is `N=2^17`, `r=8`, `p=1`
- Sessions: random opaque tokens in `HttpOnly`, `SameSite=Lax` cookies; only token hashes are stored
- Request integrity: same-origin checks plus a synchronizer CSRF token on every state-changing request
- Authorization: database-backed roles and permissions checked by the server on every protected route
- Frontend: the existing responsive HTML/CSS/JavaScript site plus dedicated portal and password-reset pages
- Maintenance: interval-gated, batch-bounded cleanup removes stale authentication state without modifying immutable audit logs

The authentication runtime now uses the cutover PostgreSQL database. Production deployment still requires managed hosting, encrypted backups, restoration testing, and least-privilege credentials.

## Supported roles

| Role | Stable slug | Protected landing route |
| --- | --- | --- |
| Student | `student` | `/portal/student` |
| Faculty | `faculty` | `/portal/faculty` |
| Program Head | `program_head` | `/portal/program-head` |
| Dean | `dean` | `/portal/dean` |
| Administrator | `administrator` | `/portal/administrator` |
| Student Assistant | `student_assistant` | `/portal/student-assistant` |
| Registrar | `registrar` | `/portal/registrar` |
| Cashier | `cashier` | `/portal/cashier` |
| SSC | `ssc` | `/portal/ssc` |
| LiRC Director | `lirc_director` | `/portal/lirc-director` |
| Laboratory In-charge | `laboratory_in_charge` | `/portal/laboratory-in-charge` |
| Yearbook Coordinator | `yearbook_coordinator` | `/portal/yearbook-coordinator` |
| Proctor | `proctor` | `/portal/proctor` |

The browser never selects or asserts a role during login. The server derives the user's assigned roles and allowlisted landing route from the database. Student Assistant receives only its own portal-access permission until its business functions are defined in a later phase.

## Database tables

| Table | Purpose |
| --- | --- |
| `users` | Account identifiers, password hash, status, temporary-password requirement, lockout counters, authorization version, and authentication timestamps |
| `roles` | The 13 stable role definitions and their allowlisted landing paths |
| `permissions` | Stable server-side permission codes |
| `user_roles` | Many-to-many user/role assignments with one primary role |
| `role_permissions` | Permissions granted to each role |
| `sessions` | Hashed opaque sessions, CSRF state, idle/absolute expiry, revocation, and authorization version |
| `password_reset_tokens` | Hashed, expiring, single-use reset tokens |
| `login_attempts` | Privacy-safe successful/failed authentication history |
| `rate_limits` | Persistent counters for login and password-recovery throttling windows |
| `reset_requests` | Privacy-safe password-recovery request history |
| `audit_logs` | Immutable, sanitized authentication and account-administration events |

PostgreSQL foreign keys, indexes, and custom authentication constraints are enabled. Account status or role changes increment the user's authorization version and revoke existing sessions.

Expired/revoked sessions, expired/used reset tokens, old login/reset history, and stale rate-limit buckets are pruned in bounded batches. Authentication audit records remain immutable and are not included in automatic cleanup.

## API design

All request and response bodies use JSON. Successful responses use `{ "data": ... }`; failures use `{ "error": { "code", "message" } }`. State-changing requests require the current `X-CSRF-Token` header and an exact allowed `Origin`.

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/auth/session` | Bootstrap anonymous/authenticated state and obtain the current CSRF token |
| `GET` | `/api/v1/auth/csrf` | Alias for CSRF/session bootstrap |
| `GET` | `/api/v1/auth/me` | Require and return the authenticated account |
| `POST` | `/api/v1/auth/login` | Authenticate and rotate into a new server session |
| `POST` | `/api/v1/auth/logout` | Revoke the current server session |
| `POST` | `/api/v1/auth/forgot-password` | Create recovery instructions without revealing whether an account exists |
| `POST` | `/api/v1/auth/reset-password` | Consume a single-use reset token and revoke prior sessions |
| `POST` | `/api/v1/auth/change-password` | Verify the current password, update it, revoke prior sessions, and rotate the session |

### Account administration

These endpoints require the Administrator role's `users.manage` permission. Seeded administrators must replace their temporary password first.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/admin/roles` | List assignable roles |
| `GET` | `/api/v1/admin/users` | List portal accounts |
| `POST` | `/api/v1/admin/users` | Create a project-specific account and assign its initial role |
| `PATCH` | `/api/v1/admin/users/:userId/status` | Activate or disable an account and revoke its sessions |
| `PUT` | `/api/v1/admin/users/:userId/roles` | Replace role assignments and select the primary role |
| `GET` | `/api/v1/admin/audit-logs` | Read recent sanitized authentication/account events |

## Frontend UI design

- The public landing page opens a real sign-in dialog with project-account warnings, remember-me support, inline validation, and a generic recovery view.
- An unauthenticated browser opening a protected portal bookmark is returned to the sign-in dialog; API-style requests still receive a JSON `401`.
- Password-reset tokens stay in the URL fragment, are removed immediately by the reset page, and are never sent in a page request or stored in browser storage.
- Every authenticated role receives a protected account workspace showing its server-derived role and account details. Temporary-password accounts must change their password before using account services.
- Administrators can create accounts, activate/disable non-current accounts, and edit their assigned and primary roles. The server validates every change and revokes affected sessions.
- The interfaces use native dialogs, live status/error regions, labeled fields, keyboard focus handling, reduced-motion support, and responsive layouts down to 320 CSS pixels.

## Folder structure

```text
Project/
├── index.html
├── style.css
├── script.js
├── auth-client.js
├── portal.html
├── portal.css
├── portal.js
├── reset-password.html
├── reset-password.js
├── assets/
├── server/
│   ├── app.mjs
│   ├── config.mjs
│   ├── db.mjs
│   ├── security.mjs
│   ├── seed.mjs
│   └── server.mjs
├── tests/
│   └── auth.test.mjs
├── docs/
│   └── PHASE-2.md
├── .env.example
├── .gitignore
└── package.json
```

The server uses a fixed static-file allowlist. It never exposes the project root, `.env`, database credentials, server source, tests, Word documents, or other unlisted files.

## Local setup

Use the Node server for Phase 2; CodeSwing remains useful for visual editing but cannot provide the required same-origin cookie/session environment.

```powershell
Copy-Item .env.example .env
npm.cmd start
```

Open `http://localhost:3000` after confirming `DATABASE_URL` points to the migrated PostgreSQL database. Optional demo seeding requires both a non-production environment and `ALLOW_DEMO_SEED=true`.

The local development server prints a reset link when an eligible forgot-password request is made. Production never prints reset links; connect the injected delivery hook to an approved transactional email service.

## Testing procedure

Run the automated suite:

```powershell
npm.cmd test
```

Manual acceptance checklist:

1. Start with the migrated PostgreSQL database and verify all 13 roles.
2. Sign in using a seeded account and verify that the server—not the browser—chooses its role route.
3. Open a protected bookmark while signed out and verify that the browser returns to the sign-in dialog rather than displaying a raw API error.
4. Verify that a temporary-password account is prompted to change its password before account services become available.
5. Sign out, then confirm the protected portal route no longer loads.
6. Request password recovery for an existing and nonexistent identifier; both public responses must be identical.
7. Use the local reset link once, then verify that replaying it fails.
8. Sign in as an Administrator; create an account, edit its assigned/primary roles, disable it, and confirm its active sessions are revoked.
9. Confirm a Student receives `403` from all Administrator endpoints.
10. Submit state-changing requests without or with a mismatched CSRF token and confirm rejection.
11. Repeatedly submit an incorrect current password and confirm password-change throttling returns `429` with `Retry-After`.
12. Test public, login, reset, portal, change-password, role-editing, and account-management interfaces at 320 px, 390 px, tablet, desktop, keyboard-only, and 200% zoom.

## Security and deployment improvements

Before any real institutional use:

1. Obtain written CJC authorization and replace project passwords with approved OIDC/SAML single sign-on.
2. Move the schema to managed PostgreSQL with encrypted backups, tested restoration, and least-privilege credentials.
3. Terminate TLS at a trusted reverse proxy and keep secure `__Host-` cookies enabled.
4. Add phishing-resistant MFA for Administrator, Registrar, Cashier, and other privileged roles.
5. Connect password recovery to an approved email provider; never expose reset tokens in API responses or logs.
6. Add breached-password screening, centralized secret management, audit retention policy, monitoring, and alerts.
7. Perform threat modeling, dependency/runtime patching, penetration testing, and an institutional privacy review.
8. Add organizational scope assignments when Program Head, Dean, office, and student-record modules are implemented; a role alone is not sufficient for record-level authorization.
