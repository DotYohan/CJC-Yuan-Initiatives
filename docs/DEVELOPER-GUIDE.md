# Developer Guide

This guide maps the CJC Student Services Portal repository for developers who need to find the right files before changing a feature. It describes the current layout; `server/app.mjs` remains the central place where most HTTP routes are connected.

## Start with the feature flow

For an existing feature, trace it in this order:

1. **Browser UI:** locate the page markup in `portal.html` (or a standalone page such as `signup.html`).
2. **Browser behavior:** find its event handlers and API call in `portal.js`, `signup.js`, `auth-client.js`, or the matching page script.
3. **HTTP route and access checks:** follow the endpoint in `server/app.mjs`. Check authentication, role authorization, CSRF, request parsing, and error mapping here.
4. **Business and persistence logic:** follow the route into a feature service or store in `server/`.
5. **Data model:** inspect the relevant model and relations in `prisma/schema.prisma` and the migrations that created or changed them.
6. **Regression coverage:** find the corresponding scenario in `tests/`.

Keep validation and authorization server-side. Browser controls are presentation; they are not security boundaries.

## Repository map

| Path | Responsibility |
| --- | --- |
| `index.html`, `style.css`, `script.js` | Public landing page and its interactions. |
| `portal.html`, `portal.css`, `portal.js` | Shared authenticated portal shell, role workspaces, dashboard rendering, and UI actions. |
| `auth-client.js` | Shared browser API/authentication helpers, including CSRF-aware requests. |
| `signup.html`, `signup.css`, `signup.js` | Public student signup flow. |
| `reset-password.html`, `reset-password.js` | Password reset page and client behavior. |
| `server/server.mjs` | Starts the Node HTTP server and handles process shutdown. |
| `server/app.mjs` | Creates the application, serves the allowlisted public files, dispatches API routes, and applies request/auth/error handling. |
| `server/config.mjs` | Reads and validates server configuration from environment variables. |
| `server/db.mjs` | Builds the Prisma Client with the PostgreSQL adapter. |
| `server/security.mjs` | Shared security primitives, identifiers, and IDs used by server features. |
| `server/*-store.mjs` | Feature data access and associated domain operations. Examples: `student-store.mjs`, `registrar-store.mjs`, `program-head-store.mjs`, `dean-store.mjs`, and `faculty-store.mjs`. |
| `server/*-service.mjs` | Cross-store workflows and business rules. Examples include `admin-faculty-service.mjs`, `academic-import-service.mjs`, and `course-offering-service.mjs`. |
| `server/academic-eligibility.mjs`, `server/enrollment-review.mjs` | Academic eligibility and enrollment review logic. Check these before changing prerequisites or enrollment decisions. |
| `server/modules/financial/` | Financial routes, controllers, services, verification, and payment gateway boundary. |
| `prisma/schema.prisma` | Canonical Prisma data model, relations, indexes, and uniqueness rules. |
| `prisma/migrations/` | Ordered, committed PostgreSQL schema changes. Each migration directory contains its SQL. |
| `prisma.config.ts` | Prisma CLI schema/migration configuration and datasource URL selection. |
| `prisma/seeds/` | Reference data, optional demo data, and reviewed academic import sources/adapters. |
| `prisma/catalog.mjs`, `prisma/seed.mjs` | Authorization catalog and shared seed entry points. |
| `scripts/` | Operational helpers such as production initialization, isolated test orchestration, and import tooling. Inspect each script before running it against a database. |
| `tests/` | Unit and PostgreSQL-backed workflow tests, organized by feature. |
| `docs/` | Feature, migration, operations, and handoff documentation. |
| `render.yaml`, `Dockerfile` | Render service configuration and container build configuration. |
| `.env.example` | Names and example formats for local settings. Never commit `.env` or real credentials. |

## Backend request lifecycle

`server/server.mjs` creates the Node HTTP server from the handler returned by `createApp()` in `server/app.mjs`. `createApp()` creates or accepts the Prisma-backed database dependency and returns the handler, configuration, and close function. This injection point is used by tests as well as the production entry point.

Most API routing is centralized in `server/app.mjs`; it is not an Express router-per-feature layout. Search for the endpoint path or its distinctive route suffix there, then follow the call into the relevant store/service. Route code should remain responsible for HTTP concerns such as status codes and access control, while domain/data rules should live in the relevant server module.

When debugging an API error, compare these layers in order:

- Browser request URL, method, headers, and JSON body.
- Route parsing and validation in `server/app.mjs` or the invoked service.
- Authorization and scope checks for the signed-in account.
- Store/service Prisma query and expected related records.
- Prisma model, database constraints, and applied migration history.
- Response mapping and sanitized server logs.

Do not remove a validation or authorization check to make a request succeed. Fix an actual client/server contract mismatch or missing database state instead.

## Browser application

The public landing page, signup, and password-reset pages have dedicated HTML and scripts. Signed-in experiences use the portal shell: `portal.html` contains workspace containers, `portal.css` styles them, and `portal.js` selects and renders the authenticated role experience. The browser calls the API through shared helpers in `auth-client.js` and feature code in the page scripts.

When changing a portal feature, search both the visible label/action and the API endpoint. A UI control may be rendered dynamically from `portal.js` rather than appearing as a complete static form in `portal.html`.

## Prisma data and migrations

`prisma/schema.prisma` is the intended model. A schema edit alone does not update a deployed database: the matching SQL migration must be committed and applied. Review both the model diff and generated SQL, especially foreign keys, uniqueness, nullability, and existing-row behavior.

Normal workflow:

1. Inspect the model, existing migrations, and every caller that relies on its keys or relations.
2. Confirm which database a command would target before running it. For production work, verify the host is the intended Neon database without printing credentials. Stop if it resolves to localhost or an unintended database.
3. Create a reviewed migration; do not use `prisma db push` as a production schema workflow.
4. Run Prisma validation/client generation and the applicable tests.
5. Check migration status, deploy only the reviewed migration, and verify the resulting schema/data on the intended database.

The application uses Prisma 7 with `@prisma/adapter-pg`; runtime database creation is centralized in `server/db.mjs`. Prisma CLI datasource configuration is in `prisma.config.ts`. The deployed Render service is described in `render.yaml`; inspect its branch and start command when diagnosing a production/schema mismatch.

### Program-scoped academic subject identity

Subjects are scoped to a Program. Their identity is `(programId, codeNormalized)`, so course codes can repeat across programs. When looking up a Subject, use its Program or curriculum context; do not assume a code alone identifies one record. `CurriculumSubject` connects a curriculum to a subject, while `SubjectRequirement` connects prerequisite/corequisite subjects by record ID. Enrollment eligibility is evaluated in the academic eligibility/enrollment modules using those subject relations.

The academic import adapter and source files are under `prisma/seeds/academic/`. For the engineering curricula, `import-engineering-curricula.mjs` reads the JSON sources in `prisma/seeds/academic/data/`. Review the sources and run the dry-run script before any write. The import is designed to be transactional and idempotent; known exceptions are reported rather than converted into invented subjects or placements. See `prisma/seeds/README.md` for the import-specific safeguards and commands.

## Authentication and authorization

Authentication is server-managed. The browser obtains session/CSRF state through the auth API; the backend resolves the user and roles and enforces access. Role catalog data is maintained through the seed/catalog code. For any route change, verify both the allowed role and its data scope (for example, a Program Head should not gain access to another program by changing an ID in the request).

Relevant starting points include `server/auth-store.mjs`, `server/security.mjs`, the authorization checks in `server/app.mjs`, `prisma/catalog.mjs`, and auth/role tests in `tests/`.

## Tests and local development

Common commands are defined in `package.json`:

```powershell
npm run dev
npm run build
npm test
```

The test command uses `scripts/run-isolated-tests.mjs`; inspect that runner and the test setup before changing database-backed tests. Tests may require a configured PostgreSQL test connection. Never point a test or maintenance script at production unless the operation is explicitly read-only and intended for production.

For focused work, run the corresponding feature test (for example, `node --test tests/prerequisite.test.mjs`) and any relevant syntax/schema validation. Avoid ad hoc root-level diagnostic or import scripts unless you have read their contents and verified their target database; the maintained workflows belong under `scripts/` or `prisma/seeds/`.

## Render deployment

`render.yaml` identifies the configured Render branch and deployment commands. The build runs dependency installation and Prisma client generation; the start command deploys committed Prisma migrations, runs production initialization, and starts the server. Confirm a change is present on the configured deployment branch and that the migration is committed before expecting Render to apply it. Production connection values belong in Render environment settings and must not be copied into logs, documentation, or commits.

## Existing feature documents

- [Phase 2: authentication and API foundation](PHASE-2.md)
- [Phase 2 backend foundation](PHASE-2-BACKEND-FOUNDATION.md)
- [Phase 3: student dashboard](PHASE-3.md)
- [Phase 4: admission](PHASE-4-ADMISSION.md)
- [Phase 5: registrar](PHASE-5-REGISTRAR.md)
- [Monitoring implementation](MONITORING-IMPLEMENTATION.md)
- [Database refactor progress](database-refactor-progress.md)

