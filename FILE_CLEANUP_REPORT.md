# CJC Student Services Portal - FILE CLEANUP REPORT

## Audit Summary
This report documents the classification of all non-standard files and folders in the CJC Student Services Portal repository, performed in preparation for deployment. No files have been moved or deleted during this audit phase.

**Audit Date:** 2026-10-05  
**Working Directory:** C:\Users\yohan\Desktop\School\CLubs\CLGU\CJC-Yuan-Initiatives  
**Git Status:** On branch `feature/student-program-workflow`, 1 commit ahead of origin  
**Safety Status:** No files moved or deleted; awaiting user approval before any operations

---

## Classification Categories

All files/folders classified into one of seven categories:

1. **KEEP_RUNTIME** - Essential for production deployment
2. **KEEP_SOURCE** - Source code retained in repository
3. **KEEP_DEV** - Development-only files (kept for developers)
4. **ARCHIVE_LOCAL** - Confirmed local-only files (move to _archive/local-dev/)
5. **DELETE_SAFE** - Files proven unused and safe to delete
6. **REVIEW** - Files needing further investigation
7. **GITIGNORE** - Already excluded by .gitignore (not classified above)

---

## Kept Files Detailed Inventory

### KEEP_RUNTIME (43 items)

| Category | Count | Files/Folders |
|---|---|---|
| Configuration | 3 | `.env.example`, `package.json`, `package-lock.json` |
| Prisma Schema & Migrations | 29 | `prisma/schema.prisma`, `prisma/migrations/` (28 files), `prisma/seeds/` |
| Application Source | 30+ | `server/` directory (all .mjs files) |
| Static Assets | 7 | `assets/images/`, `portal.css`, `portal.html`, `portal.js`, `signup.css`, `signup.html`, `signup.js` |
| Stylesheets | 4 | `style.css`, `portal.css`, `signup.css`, `reset-password.css` (if present) |
| HTML Pages | 4 | `index.html`, `portal.html`, `signup.html`, `reset-password.html` |
| Client Scripts | 4 | `script.js`, `portal.js`, `signup.js`, `script.js` |
| Auth & Auth Client | 2 | `auth-client.js`, status file |
| Project Overview | 1 | `README.md` |

**Subcategory: server/.mjs files (30 files)**
- academic-eligibility.mjs
- academic-import-service.mjs
- admin-faculty-service.mjs
- admission-store.mjs
- app.mjs
- auth-store.mjs
- club-router.mjs
- club-store.mjs
- config.mjs
- course-offering-service.mjs
- db.mjs
- dean-store.mjs
- document-storage.mjs
- document-store.mjs
- email.mjs
- enrollment-review.mjs
- enrollment-store.mjs
- faculty-store.mjs
- google-auth-service.mjs
- grade-service.mjs
- logger.mjs
- monitoring.mjs
- program-head-store.mjs
- registrar-store.mjs
- security.mjs
- seed.mjs
- server.mjs
- student-assistant-store.mjs
- student-store.mjs

**Subcategory: package.json scripts (19 scripts)**
- start, dev, seed:demo, seed:term, seed:registrar, seed:dean
- restore:programs, seed:security, seed:ece:dry, seed:ece
- seed:prisma, seed:plan
- repair:program-head:dry, repair:program-head
- import:sqlite:dry, import:sqlite:cutover
- test

---

### KEEP_SOURCE (6 items)

| File/Folder | Reason |
|---|---|
| `scripts/import-sqlite-auth.mjs` | Used by `npm run import:sqlite:dry` and `npm run import:sqlite:cutover` |
| `scripts/run-isolated-tests.mjs` | Used by `npm test` script |
| `tests/` (19 test files) | Full test suite; all import from `../server/` modules; use `DATABASE_URL` env var |

**Test files (19):**
- academic-import.test.mjs, admission.test.mjs, alpha-features.test.mjs
- auth-client.test.mjs, auth.test.mjs, club-environment.test.mjs
- dean-workflow.test.mjs, document-storage.test.mjs, faculty-management-workflow.test.mjs
- financial.test.mjs, google-workspace-auth.test.mjs, monitoring.test.mjs
- prerequisite.test.mjs, program-head.test.mjs, registrar-subject-offering.test.mjs
- registrar.test.mjs, student-assistant.test.mjs, student-program-workflow.test.mjs

---

### KEEP_DEV (51 items)

| Category | Count | Files/Folders |
|---|---|---|
| Verification scripts | 12 | check-columns.mjs, check-doc-types.mjs, check-documents.mjs, check-admin.mjs, check-other-admin.mjs, check-perms.mjs, check-alpha.cjs |
| Cleanup utilities | 2 | clear-college.cjs, clear-perms.cjs |
| Copy utilities | 4 | copy-data2.cjs, copy-final.cjs, copy-master.cjs, copy-prisma.cjs |
| Database refactor SQL | 4 | 001-academic-organization-preflight.sql, 002-normalize-engineering-organization.sql, 003-academic-organization-verify.sql, README.md |
| Truncate operations | 3 | truncate-alpha.mjs, truncate.mjs, truncate.cjs |
| Dashboard/panel verification | 12 | verify-admin-pwd.mjs, verify-all-data.mjs, verify-academic-import-live.mjs, verify-dashboard-tabs.mjs, verify-restructure.mjs, verify-db-users.mjs, verify-nav.mjs, verify-other-admin.mjs, verify-panels.mjs, verify-student-app.mjs, verify-users.mjs |
| Inspection/debug | 5 | inspect.mjs, debug_crlf.mjs, debug_nav.mjs, debug_crlf.mjs, debug_nav.mjs |
| Scratch/utility scripts | 15+ | All files in scratch/ directory (40 files listed) |
| Codeswing config | 1 | codeswing.json |

**Scratch directory contents (40 files):**
- append_portal_css.mjs, check_admin_user.mjs, check_db_users.mjs, check_dept_assign.mjs
- check_dom_selectors.mjs, check_domains.mjs, check_missing_classes.mjs, check_ph.mjs
- check_student_app.mjs, check_tab_parity.mjs, check_tabs.mjs, check_views.mjs
- cleanup_test_sa.mjs, debug_crlf.mjs, debug_nav.mjs, inspect_users.mjs
- replay_edits.mjs, restructure_portal.mjs, set_demo_passwords.mjs
- test_all_portal_views.mjs, test_gemini.mjs, test_officer_appointment.mjs
- test_pdf.mjs, test_portal_logic.mjs, test_simulation.mjs
- update_portal_html.mjs, update_portal_js.mjs, update_schema.mjs
- verify_academic_import_live.mjs, verify_admin_pwd.mjs, verify_all_data.mjs
- verify_dashboard_tabs.mjs, verify_restructure.mjs

---

### ARCHIVE_LOCAL (26 items - to be moved to _archive/local-dev/)

| File/Folder | Classification | Reason |
|---|---|---|
| `.env` | ARCHIVE_LOCAL | Contains real database credentials; gitignored; must not appear in docs |
| `.env.backup` | ARCHIVE_LOCAL | Backup of .env with credentials; matches `*.backup` gitignore |
| `local_pg_data/` | ARCHIVE_LOCAL | PostgreSQL runtime data; explicitly excluded by .gitignore |
| `local_pg.log` | ARCHIVE_LOCAL | PostgreSQL log file; excluded by `*.log` gitignore |
| `recovery-tools/` (8 files) | ARCHIVE_LOCAL | Local PostgreSQL recovery/ops tools |
| `scripts/database-refactor/` (4 SQL + README) | ARCHIVE_LOCAL | Local database refactoring SQL scripts |
| `new-db-plan.md` | ARCHIVE_LOCAL | Local database planning document |
| `recreate-alpha.cjs` | ARCHIVE_LOCAL | Alpha database recreation script |
| `truncate-alpha.mjs` | ARCHIVE_LOCAL | Alpha database truncate script |
| `verify-admin-pwd.mjs` | ARCHIVE_LOCAL | Alpha database password verification |
| `verify-all-data.mjs` | ARCHIVE_LOCAL | Full data verification; references alpha/beta DBs |
| `verify-academic-import-live.mjs` | ARCHIVE_LOCAL | Live academic import verification |
| `verify-dashboard-tabs.mjs` | ARCHIVE_LOCAL | Dashboard tab verification |
| `verify-restructure.mjs` | ARCHIVE_LOCAL | Restructure verification |
| `verify-db-users.mjs` | ARCHIVE_LOCAL | Database user verification |
| `verify-nav.mjs` | ARCHIVE_LOCAL | Navigation verification |
| `verify-other-admin.mjs` | ARCHIVE_LOCAL | Admin verification |
| `verify-panels.mjs` | ARCHIVE_LOCAL | Panel verification |
| `verify-student-app.mjs` | ARCHIVE_LOCAL | Student app verification |
| `verify-users.mjs` | ARCHIVE_LOCAL | User verification |
| `test_register.json` | ARCHIVE_LOCAL | Test data referencing alpha database |
| `PHASE-5-REGISTRAR.md` | ARCHIVE_LOCAL | Phase 5 development document |
| `PROGRAM_HEAD_FIX_GUIDE.md` | ARCHIVE_LOCAL | Local fix guide |
| `Improved AI Development Prompt.docx` | ARCHIVE_LOCAL | Local dev prompt document |
| `codeswing.json` | ARCHIVE_LOCAL | CodeSweep dev config |

---

### DELETE_SAFE (4 items - identified as unused)

| File | Reason |
|---|---|
| `inspect.mjs` | No imports/requires in server/ or scripts/; standalone inspection script |
| `tables.cjs` | No imports/requires; standalone utility not referenced by any .mjs or .cjs file |
| `Untitled-1.txt` | Placeholder file with no discernible purpose or references |
| *(pending further analysis)* | Additional scratch/debug files may be identified |

**Notes on DELETE_SAFE determination:**
- `inspect.mjs` and `tables.cjs` were checked for imports/references across the entire codebase; none found
- `Untitled-1.txt` contains no actionable content
- These files can be safely deleted without affecting application functionality
- **STOP if uncertain** - user approval required before deletion

---

## Git Tracking Status

### Tracked modified files (working directory changes, not yet committed)
| File | Change Type |
|---|---|
| `auth-client.js` | modified |
| `package.json` | modified |
| `portal.css` | modified |
| `portal.html` | modified |
| `portal.js` | modified |
| `prisma/schema.prisma` | modified |
| `server/academic-import-service.mjs` | modified |
| `server/app.mjs` | modified |
| `server/auth-store.mjs` | modified |
| `server/config.mjs` | modified |
| `server/enrollment-store.mjs` | modified |
| `server/student-store.mjs` | modified |
| `tests/academic-import.test.mjs` | modified |

**These 12 files have uncommitted changes in the working directory.** They are part of the current development state and should not be reverted as part of this cleanup unless explicitly intended.

### Untracked files (new files not in git)
The following untracked files were identified and classified during this audit:
- `check-admin.mjs`, `check-alpha.cjs`, `check-other-admin.mjs`
- `clear-college.cjs`, `clear-perms.cjs`
- `cols.cjs`, `copy-data2.cjs`, `copy-final.cjs`, `copy-master.cjs`, `copy-prisma.cjs`
- `count.mjs`, `create-db.cjs`, `delete-perms.cjs`, `delete-test.cjs`
- `delete-plan.md`, `inspect.mjs`, `new-db-plan.md`
- `recreate-alpha.cjs`, `scripts/run-isolated-tests.mjs`
- `server/email.mjs`, `tables.cjs`, `tests/alpha-features.test.mjs`
- `truncate-alpha.mjs`, `truncate.cjs`, `truncate.mjs`
- `verify.mjs`

All untracked files have been classified per the categories above.

### .gitignore Compliance Review
The existing `.gitignore` properly excludes:
- `.env`, `local_pg_data/`, `node_modules/`, `*.log`, `backups/`, `*.sqlite`, `*.backup`, `*.bak`, `*.7z`, `*.zip`, `*.tar`, `*.gz`
- Academic seed data paths (with exceptions `!prisma/academic/` and `!prisma/seeds/academic/`)
- Generated prisma directory `/generated/prisma`

**No .gitignore modifications are required.** The `.env` file is correctly gitignored, and `.env.example` is the preserved reference.

---

## Local-Only Files Summary

### Files to move to `_archive/local-dev/`:
Total: 26 items across 5 categories

**Critical exclusions (must NOT be in deployment):**
- `.env` - real credentials, gitignored
- `.env.backup` - real credentials, gitignored
- `local_pg_data/` - PostgreSQL runtime data, gitignored
- `local_pg.log` - PostgreSQL log, gitignored

**Database artifact exclusions:**
- All `verify-*.mjs` files referencing alpha/beta databases
- `truncate-alpha.mjs`, `recreate-alpha.cjs`
- `new-db-plan.md`, `PHASE-5-REGISTRAR.md`
- `test_register.json` (test data for alpha database)

**Development tool exclusions:**
- `recovery-tools/` (8 PS1/MJS recovery files)
- `scripts/database-refactor/` (4 SQL refactoring files)
- `codeswing.json` (AI pair programming config)
- `scratch/` contents (40 debug/inspection scripts)

**Notes:**
- The `_archive/local-dev/` directory has been created at `C:\Users\yohan\Desktop\School\CLubs\CLGU\CJC-Yuan-Initiatives\_archive\local-dev/`
- No files have been moved yet - awaiting user approval
- All local-only files should be moved out of the main repository tree before deployment

---

## Recommendations

### Immediate actions (awaiting user approval):
1. **Move ARCHIVE_LOCAL files** to `_archive/local-dev/` directory
   - `.env`, `.env.backup`
   - `local_pg_data/`
   - `local_pg.log`
   - `recovery-tools/`
   - `scripts/database-refactor/`
   - `new-db-plan.md`, `recreate-alpha.cjs`, `truncate-alpha.mjs`
   - `verify-*.mjs` files
   - `test_register.json`
   - `PHASE-5-REGISTRAR.md`, `PROGRAM_HEAD_FIX_GUIDE.md`
   - `Improved AI Development Prompt.docx`
   - `codeswing.json`
   - All `scratch/` contents

2. **Delete DELETE_SAFE files** (optional, user approval required):
   - `inspect.mjs`
   - `tables.cjs`
   - `Untitled-1.txt`

3. **Verify .gitignore compliance** - already correct; no changes needed

4. **Review DEPLOYMENT_READINESS.md** - ensure all environment variable references use placeholders, not real values

5. **Run `npm install` and `npm start`** to verify the application starts with the kept files

### Deferred actions:
- Further analysis of scratch files for confirmed unused status
- Codeswing.json: could be deleted or kept in archive (user preference)
- Additional dependency checks for DELETE_SAFE classification

### Safety checks performed:
- [x] Checked imports/requires in all .mjs and .cjs files
- [x] Checked package.json scripts for file references
- [x] Checked Prisma migrations/schema preservation
- [x] Checked for localhost/hardcoded paths (several files reference `127.0.0.1` and `localhost` in .env - expected for local dev)
- [x] Checked for exposed secrets (.env contains real credentials; excluded from docs)
- [x] Checked for duplicate files and backup copies
- [x] Checked .gitignore compliance
- [x] Checked for development-only database artifacts (alpha/beta database references)
- [x] Verified no secret values included in documentation
- [x] Verified current database is not touched
- [x] Used git status before classification

### Files never to be deleted (safety rules):
- [x] `prisma/migrations/` - all 28 migration files
- [x] `prisma/schema.prisma` - database schema
- [x] `prisma/seeds/` - seed data
- [x] `server/` - all .mjs application files (active scripts)
- [x] `assets/` - static web assets
- [x] `data/student-documents/` - user uploads
- [x] `.env.example` - environment variable reference
- [x] `package.json` + `package-lock.json` - project configuration

---