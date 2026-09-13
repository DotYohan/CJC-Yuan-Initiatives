# CJC Student Services Portal — Recovery Handoff

Last updated: 2026-09-13 (Asia/Manila)

## Purpose

This document is the durable handoff for restoring the CJC Student Services Portal after a computer reformat. The encrypted recovery archive, not GitHub, is the authoritative complete backup. A private GitHub repository is only a reviewed source-code mirror and must never contain secrets, database dumps, student documents, chats, dependencies, or backup archives.

After restoration, give the next developer or Codex session this instruction:

> Read `docs/RECOVERY-HANDOFF.md`, verify the restored project against its backup report, and continue the unfinished enrollment approval hierarchy work.

## Project architecture

- Frontend: static HTML, CSS, and browser JavaScript (`portal.html`, `portal.js`, `portal.css`, `auth-client.js`).
- Backend: Node.js ES modules with an Express-compatible HTTP server in `server/`.
- Database: PostgreSQL `cor_jesu_sms`, accessed through Prisma 7 and selected PostgreSQL queries.
- Prisma: `prisma/schema.prisma`, `prisma.config.ts`, generated client, and committed migration history.
- File storage: `data/student-documents/` plus historical files retained by the document workflow.
- Security: database-backed sessions, HTTP-only cookies, CSRF protection, role/permission checks, password hashing, rate limiting, audit history, and password-reset records.

## Current database state at handoff

- PostgreSQL server: 18.6.
- Connection source: project `.env`; expected user `cjc_app`, host `127.0.0.1`, port `5432`, database `cor_jesu_sms`.
- Public tables observed during the pre-backup audit: 69.
- Prisma migration directories: 20.
- Migration history observed: 20 successfully applied migrations, one historical rolled-back entry, no unfinished entry, and no pending local migration.
- Database-referenced student documents observed: 20; all 20 resolved to files under the document storage root at audit time.
- The application role owns the public application tables and functions. PostgreSQL cluster roles must be restored separately because a database dump does not contain them.

The final recovery package includes a fresh custom-format dump, schema-only SQL, role metadata, table counts, file checksums, and verification logs. Treat any zero-byte historical dump as unusable; keep it only as history. The fresh dump named in the package verification report is the recovery source.

## Completed work

- PostgreSQL and Prisma foundation.
- Authentication, RBAC, sessions, audit/security records, password reset and login protection.
- Academic organization and school-domain foundation.
- Subject lifecycle, curriculum subject types, and subject requirements.
- Registrar application/document review repairs and UI work.
- Semester/enrollment-period and payment-period foundations.
- Program Head program assignment, curriculum workspace, organization normalization, and academic organization cutover.
- Existing organization target: College of Engineering / COE department with programs BSECE, BSCOE, and BSCE. BSCOE intentionally has no placeholder Program Head.

For detailed historical database changes, also read `docs/database-refactor-progress.md`.

## Work in progress — do not assume complete

The enrollment approval hierarchy is partially implemented and has not completed regression testing. The intended workflow is:

```text
Student submission
  -> Program Head evaluation
  -> Registrar verification and section assignment
  -> Official enrollment
```

Files with partial enrollment hierarchy work include:

- `server/enrollment-review.mjs`
- `server/enrollment-store.mjs`
- `server/program-head-store.mjs`
- `server/registrar-store.mjs`
- `server/app.mjs`
- `auth-client.js`
- `portal.html`
- `portal.js`

No Prisma schema migration was required for this partial change. Known items requiring review before calling it complete:

- Recheck transaction ordering in Registrar final approval so invalid section assignments cannot produce partial state in any test transaction wrapper.
- Preserve/read saved curriculum and selected-subject snapshots when a curriculum or term later changes.
- Finish status labels and correction/unlock behavior throughout the student UI.
- Update integration tests for the Program Head-first workflow.
- Audit `tests/registrar.test.mjs` before running it: earlier inspection found rollback sentinels outside two transaction callbacks, which can commit test writes to the selected database. Run tests only against an isolated restored database until corrected.

Do not seed, reset, or automatically migrate during recovery.

## Recovery package contents

```text
CJC-Recovery-<timestamp>/
  START-HERE.md
  project/                 exact project snapshot, including existing backups
  database/                fresh dump, schema, role/grant metadata, baseline
  developer-context/       Codex, VS Code, extension, raw session, transcript data
  reference-files/         ECE prospectus and UI design reference images
  recovery-tools/          backup, verification, transcript, Git, and restore tools
  verification/            SHA-256 manifests, versions, inventory, logs
```

Sensitive material is intentionally included only inside the password-encrypted archive: `.env`, database credentials, uploaded student records, authentication hashes, audit history, Codex state, and editor state. Never publish the archive or its password.

One historical checkpoint (`checkpoint-before-enrollment-period-management-20260831-003429`) contains a real recursive copy of its own backup tree. Windows cannot copy its deepest paths normally. The recovery process preserves that complete readable tree as `checkpoint-before-enrollment-period-management-20260831-003429-LONG-PATH-COMPLETE.7z` inside `project/backups/`; see `verification/long-path-backup-note.txt`. It is historical only and is not needed to run the portal.

## Before reformatting

1. Save all files and stop the portal.
2. Close VS Code and every Codex window.
3. From a separate PowerShell window, run `recovery-tools/Finalize-RecoveryPackage.ps1` from this project.
4. Enter a strong archive password when 7-Zip asks. Save that password in a password manager reachable after the reformat.
5. Create/push the reviewed source mirror to a **private** GitHub repository using `recovery-tools/New-PrivateSourceMirror.ps1` and the instructions it prints.
6. Upload the `.7z` and matching `.sha256` file to a private Google Drive folder.
7. Download both files back into a different local folder and run `recovery-tools/Test-RecoveryPackage.ps1` against the downloaded files.
8. Reformat only when the script reports a valid checksum and successful archive test, and when Google Drive, GitHub, OpenAI, and the password manager are accessible from another device or browser session.

## Restoration procedure

1. Install the recorded versions, or compatible supported versions, of Git, Node.js, PostgreSQL, 7-Zip, VS Code, and Codex.
2. Download the `.7z` and `.sha256` files from Google Drive and verify their checksum before extraction.
3. Run `recovery-tools/Restore-CJCProject.ps1`. It refuses a non-empty project destination and refuses a database that already exists.
4. Confirm the standard PostgreSQL administrator role `postgres` exists, then recreate the scoped `cjc_app` role using the archived role metadata and the password from the archived `.env`. The dump contains historical default privileges owned by `postgres`, so that role must exist during restore. Use administrator credentials you control; do not guess credentials.
5. Create an empty `cor_jesu_sms` owned by `cjc_app`, then restore the custom dump with `pg_restore --exit-on-error --single-transaction`.
6. Restore configuration and student documents from the project snapshot.
7. Run `npm ci` and `npx prisma generate`. Do not run `prisma migrate reset`, seed scripts, or automatic migration deployment.
8. Compare restored table counts, migration history, schema objects, and document checksums with `verification/`.
9. Restore compatible Codex sessions/configuration and editor settings. Do not blindly restore archived login tokens (`auth.json`, `cap_sid`, `.sandbox-secrets`); sign in again.
10. Run application tests only against an isolated restored/test database, then resume the unfinished work described above.

## Recovery limitations

- Raw Codex session/state data and readable transcripts are both preserved. A future Codex/VS Code version may not reproduce the old chat sidebar exactly, so this document and transcripts are the independent continuity path.
- A Google Drive upload or sync indicator is not proof of backup. The downloaded archive must pass checksum and extraction tests.
- GitHub is not a complete recovery source. It deliberately excludes confidential and large runtime data.
