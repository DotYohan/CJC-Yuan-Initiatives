# CJC Student Services Portal - DEPLOYMENT READINESS

## Overview
This document outlines the deployment classification, required environment variables, Prisma migration commands, storage requirements, and deployment checklist for the CJC Student Services Portal.

**WARNING: Do not modify the current database. No database changes, architecture changes, or business-logic changes are intended.**

---

## Folder Classification

### KEEP_RUNTIME - Essential for production deployment
These files/folders must be present in the deployed application:

| File/Folder | Category | Reason |
|---|---|---|
| `.env.example` | KEEP_RUNTIME | Required reference for deployment environment variables; must NOT be replaced with .env |
| `package.json` | KEEP_RUNTIME | Project configuration, dependencies, deployment scripts |
| `package-lock.json` | KEEP_RUNTIME | Dependency lockfile for reproducible installs |
| `prisma/schema.prisma` | KEEP_RUNTIME | Database schema definition; must be preserved intact |
| `prisma/migrations/` (28 files) | KEEP_RUNTIME | All Prisma migration files must be preserved in order; never delete or reorder |
| `prisma/seeds/` | KEEP_RUNTIME | Seed data scripts and canonical data |
| `server/` (all .mjs files) | KEEP_RUNTIME | Application source code; 30+ Node.js module files forming the HTTP server |
| `assets/images/` | KEEP_RUNTIME | Static web assets (images) |
| `data/student-documents/` | KEEP_RUNTIME | Production user upload directory; preserve existing uploads |
| `index.html` | KEEP_RUNTIME | Public homepage entry point |
| `portal.html` | KEEP_RUNTIME | Portal HTML page |
| `signup.html` | KEEP_RUNTIME | Signup HTML page |
| `reset-password.html` | KEEP_RUNTIME | Password reset HTML page |
| `portal.css` | KEEP_RUNTIME | Portal stylesheet |
| `signup.css` | KEEP_RUNTIME | Signup stylesheet |
| `style.css` | KEEP_RUNTIME | General stylesheet |
| `portal.js` | KEEP_RUNTIME | Portal client script |
| `signup.js` | KEEP_RUNTIME | Signup client script |
| `script.js` | KEEP_RUNTIME | General client script |
| `auth-client.js` | KEEP_RUNTIME | Authentication client module |
| `README.md` | KEEP_RUNTIME | Project overview and setup instructions |

### KEEP_SOURCE - Source code retained in repository
| File/Folder | Category | Reason |
|---|---|---|
| `scripts/import-sqlite-auth.mjs` | KEEP_SOURCE | Used by `npm run import:sqlite:dry` and `npm run import:sqlite:cutover` scripts |
| `scripts/run-isolated-tests.mjs` | KEEP_SOURCE | Used by `npm test` script; spawns isolated test process |
| `tests/` (19 files) | KEEP_SOURCE | Test suite; all import from `../server/` modules and use `DATABASE_URL` env var |

### KEEP_DEV - Development-only files (kept in repo for developers)
| File/Folder | Category | Reason |
|---|---|---|
| `scripts/check-columns.mjs` | KEEP_DEV | Verification script; not used in production runtime |
| `scripts/check-doc-types.mjs` | KEEP_DEV | Verification script; not used in production runtime |
| `scripts/check-documents.mjs` | KEEP_DEV | Verification script; not used in production runtime |
| `scripts/clear-college.cjs` | KEEP_DEV | Cleanup script; not used in production runtime |
| `scripts/clear-perms.cjs` | KEEP_DEV | Cleanup script; not used in production runtime |
| `scripts/copy-data2.cjs` | KEEP_DEV | Utility script; not used in production runtime |
| `scripts/copy-final.cjs` | KEEP_DEV | Utility script; not used in production runtime |
| `scripts/copy-master.cjs` | KEEP_DEV | Utility script; not used in production runtime |
| `scripts/copy-prisma.cjs` | KEEP_DEV | Utility script; not used in production runtime |
| `scripts/database-refactor/` (4 SQL files) | KEEP_DEV | Local database refactoring SQL files |
| `tests/` (already listed above) | KEEP_DEV | Development test suite |
| `scratch/` contents | KEEP_DEV | Development scratch/debug scripts |
| `check-admin.mjs` | KEEP_DEV | Admin verification script |
| `check-other-admin.mjs` | KEEP_DEV | Admin verification script |
| `check-perms.mjs` | KEEP_DEV | Permission verification script |
| `check-alpha.cjs` | KEEP_DEV | Alpha database check script |
| `truncate-alpha.mjs` | KEEP_DEV | Alpha database truncate script |
| `truncate.mjs` | KEEP_DEV | General truncate script |
| `truncate.cjs` | KEEP_DEV | General truncate script (CJS format) |
| `verify-admin-pwd.mjs` | KEEP_DEV | Alpha database password verification |
| `verify-all-data.mjs` | KEEP_DEV | Full data verification script |
| `verify-academic-import-live.mjs` | KEEP_DEV | Live academic import verification |
| `verify-dashboard-tabs.mjs` | KEEP_DEV | Dashboard tab verification |
| `verify-restructure.mjs` | KEEP_DEV | Restructure verification script |
| `verify-db-users.mjs` | KEEP_DEV | Database user verification |
| `verify-nav.mjs` | KEEP_DEV | Navigation verification script |
| `verify-other-admin.mjs` | KEEP_DEV | Admin verification script |
| `verify-panels.mjs` | KEEP_DEV | Panel verification script |
| `verify-student-app.mjs` | KEEP_DEV | Student app verification |
| `verify-users.mjs` | KEEP_DEV | User verification script |
| `inspect.mjs` | KEEP_DEV | Inspection script |
| `codeswing.json` | KEEP_DEV | CodeSweep AI pair programming config |

### ARCHIVE_LOCAL - Confirmed local-only files (move to _archive/local-dev/)
These files reference local paths, local databases, or are only usable in local development. **Move all to `_archive/local-dev/`**:

| File/Folder | Classification | Reason |
|---|---|---|
| `.env` | ARCHIVE_LOCAL | Contains real database credentials and secrets; must NOT appear in deployment docs; gitignored |
| `.env.backup` | ARCHIVE_LOCAL | Backup of .env with credentials; matches `*.backup` gitignore pattern |
| `local_pg_data/` | ARCHIVE_LOCAL | PostgreSQL runtime data directory; explicitly excluded by .gitignore and deployment requirements |
| `local_pg.log` | ARCHIVE_LOCAL | PostgreSQL log file; excluded by `*.log` gitignore pattern |
| `recovery-tools/` (8 files) | ARCHIVE_LOCAL | Local PostgreSQL recovery and restoration tools; ops-only |
| `scripts/database-refactor/` (4 SQL files) | ARCHIVE_LOCAL | Local database organization SQL scripts; not for production use |
| `new-db-plan.md` | ARCHIVE_LOCAL | Local database planning document; references alpha database |
| `recreate-alpha.cjs` | ARCHIVE_LOCAL | Alpha database recreation script; local-only |
| `truncate-alpha.mjs` | ARCHIVE_LOCAL | Alpha database truncate script; local-only |
| `verify-admin-pwd.mjs` | ARCHIVE_LOCAL | Alpha database password verification; references alpha DB |
| `verify-all-data.mjs` | ARCHIVE_LOCAL | Full data verification; references alpha/beta databases |
| `verify-academic-import-live.mjs` | ARCHIVE_LOCAL | Live academic import verification; local dev |
| `verify-dashboard-tabs.mjs` | ARCHIVE_LOCAL | Dashboard tab verification; local dev |
| `verify-restructure.mjs` | ARCHIVE_LOCAL | Restructure verification; local dev |
| `verify-db-users.mjs` | ARCHIVE_LOCAL | Database user verification; local dev |
| `verify-nav.mjs` | ARCHIVE_LOCAL | Navigation verification; local dev |
| `verify-other-admin.mjs` | ARCHIVE_LOCAL | Admin verification; local dev |
| `verify-panels.mjs` | ARCHIVE_LOCAL | Panel verification; local dev |
| `verify-student-app.mjs` | ARCHIVE_LOCAL | Student app verification; local dev |
| `verify-users.mjs` | ARCHIVE_LOCAL | User verification; local dev |
| `test_register.json` | ARCHIVE_LOCAL | Test data referencing alpha database |
| `PHASE-5-REGISTRAR.md` | ARCHIVE_LOCAL | Phase 5 development document; references local database |
| `PROGRAM_HEAD_FIX_GUIDE.md` | ARCHIVE_LOCAL | Local fix guide for program head assignments |
| `Improved AI Development Prompt.docx` | ARCHIVE_LOCAL | Local development prompt; not a code/file artifact |
| `codeswing.json` | ARCHIVE_LOCAL | CodeSweep development config; could also be DELETE_SAFE but archived for safety |
| `local_pg.log` | ARCHIVE_LOCAL | PostgreSQL log file |

### DELETE_SAFE - Files proven unused and safe to delete
These files have no imports, requires, or references in the codebase and can be removed:

| File | Reason |
|---|---|
| `inspect.mjs` | No imports/requires; standalone inspection script not referenced by any other file |
| `tables.cjs` | No imports/requires; standalone utility not referenced by any other file |
| `Untitled-1.txt` | Placeholder/empty file with no discernible purpose |
| *(additional files may be identified through further dependency analysis)* |

---

## Required Environment Variables

The application requires the following environment variables (via `.env` file, NOT committed to git). **Do not include actual secret values in documentation.**

Create a `.env` file in the project root with these variables (based on `.env.example`):

```
# PostgreSQL connection (REQUIRED)
# Format: postgresql://user:password@host:port/database
DATABASE_URL="postgresql://cjc_app:your_password@127.0.0.1:5432/cor_jesu_sms"

# Application environment
NODE_ENV=development

# Application origin
APP_ORIGIN=http://localhost:3000

# Security (production requires HTTPS and strong secrets)
CJC_AUDIT_PEPPER="replace-with-a-long-random-production-secret-at-least-32-chars"

# Optional: Document storage path
# CJC_DOCUMENT_ROOT=data/student-documents

# Optional: request duration at which an API warning is recorded
# CJC_SLOW_REQUEST_MS=1000

# Optional: Scrypt tuning (test uses weaker defaults)
# CJC_SCRYPT_N=131072
# CJC_SCRYPT_R=8
# CJC_SCRYPT_P=1

# Gemini AI (for AI-Assisted Academic Record Import / OCR)
# GEMINI_API_KEY="your-gemini-api-key"
# GEMINI_MODEL="gemini-3.5-flash-lite"
```

**Additional environment variables referenced in `config.mjs`:**
- `GOOGLE_CLIENT_ID` - Google OAuth2 Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth2 Client Secret
- `GOOGLE_WORKSPACE_DOMAINS` - Allowed Google Workspace domains
- `GOOGLE_CALLBACK_URL` - Google callback URL
- `CJC_SCRYPT_N` - Scrypt cost parameter (N must be power of 2, >= 2^17 in production)
- `CJC_SCRYPT_R` - Scrypt cost parameter (>= 8 in production)
- `CJC_SCRYPT_P` - Scrypt cost parameter (= 1 recommended)
- `CJC_CHANGE_PASSWORD_USER_LIMIT` - Change password attempt limit
- `CJC_CHANGE_PASSWORD_IP_LIMIT` - Change password IP attempt limit
- `CJC_CLEANUP_INTERVAL_MS` - Cleanup interval in milliseconds
- `CJC_CLEANUP_BATCH_SIZE` - Cleanup batch size
- `CJC_SLOW_REQUEST_MS` - Slow request threshold in milliseconds
- `CJC_REVOKED_SESSION_RETENTION_MS` - Revoked session retention in milliseconds
- `CJC_USED_RESET_TOKEN_RETENTION_MS` - Used reset token retention in milliseconds
- `CJC_AUTH_HISTORY_RETENTION_MS` - Auth history retention in milliseconds

---

## Prisma Migration Commands

### Run migrations (production)
```bash
npx prisma migrate deploy
```
This will run all pending migrations from the `prisma/migrations/` folder against the database defined in `DATABASE_URL`.

### Reset migrations (dangerous - resets database)
```bash
npx prisma migrate reset
```
**WARNING: This drops and recreates the database. Do not use on production without backup.**

### Generate Prisma client
```bash
npx prisma generate
```
Regenerates the Prisma Client based on `prisma/schema.prisma`.

### Migration workflow
1. Make changes to `prisma/schema.prisma`
2. `npx prisma migrate save --experimental to make a new migration`
3. `npx prisma migrate deploy` to apply the new migration
4. Commit the new migration file to version control

**There are 28 existing migration files that must be preserved in order.**

---

## Storage Requirements

| Resource | Requirement |
|---|---|
| PostgreSQL database | Required; must have `cor_jesu_sms` or equivalent schema |
| Disk space for Prisma migrations | ~28 migration files; preserve all |
| Disk space for Prisma client | Generated; not tracked in repo |
| User upload storage | `data/student-documents/` directory; preserve existing uploads |
| Node.js modules (`node_modules/`) | Install via `npm install`; excluded by .gitignore |
| Memory | Node.js >= 24.0.0 per engines field |

---

## Deployment Checklist

### Pre-deployment
- [ ] Verify `.env.example` is present in repository root
- [ ] Verify `prisma/schema.prisma` is intact and unmodified from working version
- [ ] Verify `prisma/migrations/` contains all 28 migration files in correct order
- [ ] Verify `package.json` scripts are intact
- [ ] Verify `server/server.mjs` entry point is functional
- [ ] Verify `assets/` directory is present
- [ ] Verify `data/student-documents/` directory exists
- [ ] **DO NOT commit `.env` file** - it contains real credentials
- [ ] **DO NOT commit `node_modules/`** - excluded by .gitignore
- [ ] **DO NOT commit `local_pg_data/`** - excluded by .gitignore
- [ ] **DO NOT commit backup files** (`.env.backup`, `*.backup`, etc.)

### Deployment
- [ ] Set `DATABASE_URL` environment variable to production PostgreSQL connection string
- [ ] Set `NODE_ENV=production`
- [ ] Set `APP_ORIGIN` to production HTTPS origin (e.g., `https://your-domain.com`)
- [ ] Set `CJC_AUDIT_PEPPER` to a strong random secret >= 32 characters
- [ ] Run `npx prisma migrate deploy` to apply pending migrations
- [ ] Run `npx prisma generate` to generate Prisma client
- [ ] Run `npm start` to verify the application starts correctly
- [ ] Verify Google OAuth configuration if Google authentication is required
- [ ] Verify Brevo API key if email functionality is required

### Post-deployment
- [ ] Monitor application logs for startup errors
- [ ] Verify health check endpoints if configured
- [ ] Confirm database connectivity and Prisma client introspection
- [ ] Test critical workflows: authentication, student enrollment, document upload

---

## Rollback / Backup Notes

### Rollback strategy
1. **Database rollback**: Use `npx prisma migrate reset` to rollback to a specific migration, or `npx prisma migrate deploy` to re-apply migrations from the migration folder.
2. **Application rollback**: Redeploy the previous commit/tag of the repository.
3. **File restoration**: Restore from git: `git restore <file>` for tracked files.

### Backup recommendations
- **Database**: Take a full PostgreSQL backup before running `prisma migrate deploy` in production.
- **User uploads**: Preserve `data/student-documents/` contents before any deployment.
- **Configuration**: Keep a backup of the `.env` file (stored locally, not in version control).

### Important restrictions
- **Never run `prisma migrate reset` on production without a database backup**
- **Never delete `prisma/migrations/` files** - all 28 must be preserved
- **Never modify `.env` values that contain real credentials** - keep `.env` out of version control
- **Do not touch the current database** - preserving existing data is a safety requirement

---

## .gitignore Compliance

The following are already excluded via `.gitignore` and must NOT be committed:
- `.env` and `.env.*` files (except `.env.example`)
- `node_modules/`
- `local_pg_data/` (PostgreSQL runtime data)
- `*.log` files (including `local_pg.log`)
- `backups/` directory
- `*.sqlite`, `*.sqlite-shm`, `*.sqlite-wal` files
- `*.dump`, `*.backup`, `*.bak` files
- `*.7z`, `*.zip`, `*.tar`, `*.gz` archive files
- `.codex/`, `.agents/`, `developer-context/`
- `recovery-staging/`, `verification/private/`
- `test-output.txt`

The following MUST be committed:
- `.env.example` - reference deployment environment variables
- `prisma/schema.prisma` - database schema
- `prisma/migrations/` - all 28 migration files
- `package.json` + `package-lock.json`
- All `server/` .mjs source files
- `assets/` and `data/` directories
- All documentation and test files

---

## Secrets and Security

**NEVER include the following in documentation, deployment configs, or version control:**
- Database passwords or connection strings with real credentials
- Google OAuth `GOOGLE_CLIENT_SECRET`
- Brevo `BREVO_API_KEY`
- Any API keys or secrets
- The `.env` file contents (real credentials)

The `.env.example` file intentionally uses placeholder values (`your_password`, `replace-with-a-long-random-production-secret-at-least-32-chars`, etc.) that must be replaced with actual values in the deployed `.env` file.

---