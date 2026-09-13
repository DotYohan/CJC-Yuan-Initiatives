# Prisma authentication migration preparation

This document identifies the current hardcoded authorization dependencies that
must become database-driven during the Express/Prisma cutover. It does not
change the live SQLite authentication service.

## Canonical catalog

`prisma/catalog.mjs` is the future canonical seed catalog. It contains all 12
existing roles plus `faculty`, the corresponding portal permissions, and the
Administrator grants for `users.manage` and `audit.read`.

## Hardcoded role dependencies to replace

| Location | Current responsibility | Database-driven replacement |
| --- | --- | --- |
| `server/db.mjs:5` | Defines `ROLE_DEFINITIONS` | Query `Role` by `slug` or `landingPath` through a role repository |
| `server/db.mjs:148` | Seeds SQLite roles and permissions | `seedAuthorizationCatalog()` in `prisma/seed.mjs` |
| `server/app.mjs:4` | Imports the hardcoded catalog | Inject a Prisma-backed role service |
| `server/app.mjs:48-50` | Builds static path and API maps | Resolve active system roles by unique `landingPath`/`slug` |
| `server/app.mjs:909` | Validates a new user's role | `Role.findUnique({ where: { slug } })` and require `isSystem` |
| `server/app.mjs:1002` | Validates multi-role updates | Fetch all submitted slugs and reject any missing database roles |
| `server/app.mjs:1072` | Resolves a primary portal role | Load the primary `UserRole` including `Role` |
| `server/app.mjs:1200` | Resolves a portal HTML path | Query/cache `Role.landingPath` mappings |
| `server/app.mjs:1206` | Resolves portal API segments | Resolve the segment to a database role slug |
| `server/seed.mjs:45` | Creates one SQLite demo per hardcoded role | Prisma development seed iterates `ROLE_SEEDS` |
| `tests/auth.test.mjs` | Assumes exactly 12 hardcoded roles | Add Prisma repository tests and expect the 13-role catalog |

## Cutover boundary

The current `ROLE_DEFINITIONS` must remain in place while SQLite is the active
backend. Removing it early would break current role validation and portal route
resolution. During cutover, replace all usages as one coherent change; do not
run two authorization catalogs in production.

Permission checks should continue to be database-derived through:

`User -> UserRole -> Role -> RolePermission -> Permission`

The role repository may cache the canonical catalog briefly, but cache
invalidation must occur after role or permission changes. User authorization
must continue to honor `authorizationVersion` so role changes revoke sessions.

## Prepared scripts

- `prisma/seed.mjs`: Prisma-only authorization and development-demo seed.
- `scripts/import-sqlite-auth.mjs`: dry-by-default SQLite mapping/import tool.
- `prisma/sql/auth-constraints.sql`: SQL to append to the first reviewed migration.

Neither preparation script is invoked automatically by application startup.
