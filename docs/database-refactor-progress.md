# Database Refactor Progress Documentation

Last updated: 2026-09-01 20:05:42 +08:00 (Asia/Manila)

Status: **ACADEMIC ORGANIZATION CUTOVER COMPLETED AND VERIFIED**

This file is the single source of truth for the academic organization database refactor. Future developers and AI agents must read this document before analyzing or changing the database. Append to the logs; do not remove prior history.

## 1. Project Objective

The project currently contains academic organization data that may be duplicated or linked through an incorrect College/Department/Program hierarchy. The cleanup is intended to normalize this data while preserving students, faculty, curricula, course offerings, enrollments, grades, program-head assignments, authentication data, and all historical records.

The target hierarchy is:

```text
College
└── Department
    └── Program
```

Expected final academic organization:

- One College of Engineering (`COE`).
- One Engineering department (`COE`), named `College of Engineering` as specified by the project owner.
- Three valid engineering programs: `BSECE`, `BSCOE`, and `BSCE`.
- Program-head assignments and all dependent records linked to the correct surviving program IDs.
- Idempotent seeds that update the canonical records and do not recreate obsolete structures.
- Constraints and application logic that prevent equivalent duplicates without breaking historical data.

No record may be deleted until all dependencies have been mapped, replacement IDs have been selected, dependent references have been migrated, and post-migration verification queries have been reviewed.

## 2. Current System Analysis

### Verified runtime and tooling

- Database engine: PostgreSQL.
- Live database identity: `cjc_app@127.0.0.1:5432/cor_jesu_sms`.
- ORM: Prisma 7.10.0 using `prisma.config.ts` and `prisma/schema.prisma`.
- The application is not Next.js despite the original task brief. The inspected workspace is a Node.js 24 ESM server with static HTML/CSS/JavaScript frontend files.
- Prisma schema size: 68 models and 33 enums.
- Migration state: 20 migrations found and all are applied.
- Live-to-schema migration diff: empty.
- Existing authentication, RBAC, sessions, security, and audit logging remain outside the refactor scope.
- Workspace check: this directory is not a Git repository. A filesystem checkpoint and PostgreSQL custom-format dump are mandatory before approved execution.

### Known project context before the audit

- Existing authentication, RBAC, sessions, security, and audit logging must remain unchanged.
- Existing academic models include College, Department, Program, Student, Faculty, Subject, Curriculum, and related transactional models.
- The project owner reported that `colleges` was empty. Live inspection disproved that stale assumption: five rows currently exist, including the correct `COE` row.
- Reported department records that may need consolidation:
  - Department of Electronics Engineering
  - Department of Computer Engineering
  - Department of Civil Engineering
- Reported target programs:
  - `BSECE` — Bachelor of Science in Electronics and Communication Engineering
  - `BSCOE` — Bachelor of Science in Computer Engineering
  - `BSCE` — Bachelor of Science in Civil Engineering
### Audit findings

Read-only inspection completed on 2026-08-31:

- `npx prisma validate`: passed.
- `npx prisma migrate status`: passed; database is up to date.
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`: empty migration.
- All 20 migration files were inventoried. None drops a table. Existing data operations are limited to prior document, registrar, and financial migrations; none seeded the current College/Department/Program catalog.
- All three custom SQL sources were inventoried. The relevant school-domain constraints already enforce code canonicalization for College, Program, Subject, Student number, and Employee number, plus academic range and curriculum lifecycle rules.
- Department has only a case-sensitive unique key on `(college_id, code)` and has no canonical code trigger. This is weaker than College and Program normalization.
- All organization and academic seed sources were inspected.
- The live PostgreSQL organization catalog and direct/indirect dependencies were queried without writes.
- Backend and frontend references were searched. Program choices are database-driven and filter `Program.isActive = true`; legacy organization names/codes are hardcoded primarily in the seed JSON.
- `ProgramHeadStore.getActiveAssignment()` does not currently reject an inactive assigned Program. This should be hardened if noncanonical records are quarantined rather than immediately purged.
- The repair utility `prisma/seeds/scripts/repair-program-head-assignments.mjs` contains heuristic and last-resort assignment logic. A prior run appears to have assigned four integration-test accounts to `BSCE`; future repair runs must require explicit mappings instead of selecting an arbitrary active program.
- Current `tests/program-head.test.mjs` uses deliberate transaction rollback. Four organization fixture trees in the live database predate that rollback protection and are confirmed test residue.

### Curriculum cleanup record (2026-09-01)

Data hygiene completed for the live curriculum catalog with the official BSECE specimen preserved as the only active curriculum record.

- Preserved curriculum: `SY2023 · v1 · DRAFT` — `Bachelor of Science in Electronics and Communication Engineering` under program `BSECE`.
- Deleted curriculum versions: `SY2024 · v1 · DRAFT`, `SY2023C · v1 · DRAFT`, `SY202 · v1 · DRAFT`, and the extra `SYCE2023 · v1 · DRAFT` test row.
- Reference migration: any class-section and student/enrollment-application curriculum links pointing to the deleted draft records were detached before removal. No valid student assignments or enrollment records depended on those duplicate records.
- Result: only the official curriculum remains visible in the operational catalog and the enrollment UI.

### Final dependency analysis (approved preparation phase)

Final read-only analysis completed at 2026-08-31 23:17 Asia/Manila. The complete fixture graph contains exactly:

| Fixture-related table | Rows | Planned action |
|---|---:|---|
| colleges | 4 | Delete explicit fixture UUIDs after all children are removed |
| departments | 4 | Delete explicit fixture UUIDs |
| programs | 4 | Delete explicit fixture UUIDs |
| faculty | 4 | Delete fixture academic profiles only; linked Users remain |
| program_head_assignments | 4 | Delete test-only assignments |
| subjects | 4 | Delete test-only catalog rows |
| curricula | 4 | Delete test-only DRAFT curricula |
| curriculum_subjects | 4 | Delete test-only curriculum rows first |

The following fixture dependency checks all returned zero: Students, AdmissionApplications, ProgramHistory, StudentProgramHistory, UserProgramAssignments pointing to fixture Programs, StudentCurriculumAssignments, SubjectRequirements, Enrollments, EnrollmentApplications, EnrollmentStatusHistory, ClassSections, CourseOfferings, FacultyDepartmentAssignments, FacultySpecializations, FacultyEmployment, FacultyCourseAssignments, ClassSchedules, EnrollmentItems, Grades, GradeHistory, Rooms, and ClearanceRequirements.

No PostgreSQL view, materialized view, or report table references College, Department, Program, or ProgramHeadAssignment. No application source contains the live organization UUIDs. API and frontend Program selection is database-driven.

The four linked integration-test Users are active and each has one role, one historical login attempt, three audit events, and no active Session. Each currently has a direct UserProgramAssignment to valid Program `BSCE`. The approved migration will not update or delete those Users, UserRoles, direct assignments, login attempts, audit logs, or other security history.

### Existing tables and relationships

Direct foreign-key map relevant to this refactor:

```text
colleges.id
└── departments.college_id (RESTRICT)

departments.id
├── programs.department_id (RESTRICT)
├── faculty.department_id (RESTRICT)
├── subjects.department_id (RESTRICT)
├── program_history.department_id (RESTRICT)
├── faculty_department_assignments.department_id (RESTRICT)
├── rooms.department_id (RESTRICT)
└── clearance_requirements.department_id (RESTRICT)

programs.id
├── students.program_id (RESTRICT)
├── curricula.program_id (RESTRICT)
├── program_history.program_id (RESTRICT)
├── program_head_assignments.program_id (RESTRICT)
├── admission_applications.intended_program_id (RESTRICT)
├── student_program_history.program_id (RESTRICT)
├── enrollments.program_id (RESTRICT)
├── enrollment_applications.program_id (RESTRICT)
├── class_sections.program_id (RESTRICT)
└── user_program_assignments.program_id (RESTRICT)
```

`program_head_assignments` is not referenced by another foreign key. It references Program, Faculty, and optionally the assigning User. `user_program_assignments` is the current direct account-to-program ownership mechanism and is separate from the faculty-based historical assignment model.

Important indirect dependencies:

- Curriculum is referenced by Student, CurriculumSubject, StudentCurriculumAssignment, Enrollment, EnrollmentApplication, and ClassSection.
- Subject is referenced by CurriculumSubject, SubjectRequirement in both directions, and CourseOffering.
- Faculty is referenced by ProgramHeadAssignment, FacultyDepartmentAssignment, FacultySpecialization, FacultyEmployment, FacultyCourseAssignment, and Grade.
- AuditLog uses string `resourceType`/`resourceId` fields rather than foreign keys. No current audit resource ID matched the College, Department, Program, or ProgramHeadAssignment IDs inspected. Audit logs remain immutable and will not be altered.

### Exact live row counts

| Table | Rows |
|---|---:|
| colleges | 5 |
| departments | 7 |
| programs | 7 |
| students | 2 |
| faculty | 4 |
| subjects | 72 |
| curricula | 8 |
| curriculum_subjects | 72 |
| subject_requirements | 30 |
| program_head_assignments | 4 |
| user_program_assignments | 7 |
| admission_applications | 2 |
| enrollment_applications | 1 |
| enrollments | 0 |
| class_sections | 0 |
| course_offerings | 0 |

All tested orphan checks returned zero. PostgreSQL currently has no broken foreign keys.

### Identified problems

- The canonical College exists, but four old test-fixture Colleges also remain active.
- The canonical College owns three separate engineering Departments (`DECE`, `DCpE`, `DCE`) instead of the requested single `COE` Department.
- The Computer Engineering Program is stored as `BSCpE`; the approved target code is `BSCOE`.
- The BSECE Program name is `Bachelor of Science in Electronics Engineering`; the approved target name is `Bachelor of Science in Electronics and Communication Engineering`.
- Four old integration-test Programs, Departments, Colleges, Subjects, Curricula, Faculty profiles, and ProgramHeadAssignments remain in the live catalog.
- All four rows in `program_head_assignments` belong to test-fixture Programs; no formal faculty-based assignment currently exists for the three canonical Programs.
- Seven `user_program_assignments` all reference real Programs, but four belong to integration-test accounts and were assigned to `BSCE` by a repair run. Authentication records must not be changed without separate approval.
- Current seeds will recreate the old three-Department hierarchy and use `BSCpE` unless corrected after the data cutover.
- Running application tests against the production-style `DATABASE_URL` previously polluted the live database. Current rollback guards prevent this specific recurrence, but a dedicated test database is still recommended.

### Duplicate and noncanonical records found

No exact normalized College, Department-code, or Program-code duplicate exists; the current unique constraints prevent exact code duplication. The cleanup candidates are semantic duplicates/test fixtures rather than equal-code duplicates.

Canonical production rows:

| Entity | ID | Current code | Current name | Dependencies |
|---|---|---|---|---|
| College | `e822d5e3-91a4-4350-9b5a-ca1c38c17bb3` | COE | College of Engineering | 3 Departments |
| Department | `e9e8b9ee-caa0-413e-86a6-b77c19ef7b67` | DECE | Department of Electronics Engineering | BSECE + 68 Subjects |
| Department | `0bab1931-2c2e-4343-9b45-a7a24e36509f` | DCpE | Department of Computer Engineering | BSCpE only |
| Department | `cab1994e-ccd9-4626-98c1-74f4df90bd2c` | DCE | Department of Civil Engineering | BSCE only |
| Program | `736c0502-8016-4c26-9d64-1049afab4158` | BSECE | Bachelor of Science in Electronics Engineering | 4 Curricula, 3 user assignments |
| Program | `9a095737-5105-4f6c-8636-e32dfa1f7650` | BSCpE | Bachelor of Science in Computer Engineering | 1 Student, 1 AdmissionApplication, 1 EnrollmentApplication |
| Program | `8863df7a-34c1-4b34-8346-99a4f09a09db` | BSCE | Bachelor of Science in Civil Engineering | 1 Student, 1 AdmissionApplication, 4 user assignments |

Confirmed old integration-test fixture roots:

| Test College ID | Test Department ID | Test Program ID | Program code | Attached fixture data |
|---|---|---|---|---|
| `ea284b3b-0af3-4a63-b072-c93e4197b441` | `a37ca68f-f8d6-4988-8041-a046499f3f47` | `0a3825d9-3118-48dc-818c-8fdb6404062c` | BSECE1a82da3c | 1 Faculty, 1 ProgramHeadAssignment, 1 Subject, 1 DRAFT Curriculum, 1 CurriculumSubject |
| `69b759f3-4d24-417a-ad08-0d395369973d` | `7d254f90-ff68-4ed4-9d07-a57ccdf79bdd` | `0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd` | BSECE5a8535de | same fixture shape |
| `3df70a78-268b-4c68-95a4-1063f7f4b47d` | `024b3567-4201-4779-91d6-6cf262e90577` | `afa137b4-a746-414f-93dc-bf4454770996` | BSECE94c89afc | same fixture shape |
| `2bd69a79-aa6c-493c-a255-24c66699422b` | `5eb5b940-e030-4b44-a6c1-9d0d7ac1462f` | `5c416679-fd16-441c-b173-f2ccc570ba6b` | BSECEebd6617d | same fixture shape |

No fixture has a Student, AdmissionApplication, Enrollment, EnrollmentApplication, ClassSection, CourseOffering, ProgramHistory, StudentProgramHistory, or user-program assignment dependency. The linked Users and authentication history are not cleanup candidates.

### Incorrect relationships found

- `BSECE` points to `DECE`; the row is the recommended canonical Department survivor because it owns all 68 real Subjects.
- `BSCpE` points to `DCpE`; its Program ID should be preserved, renamed to `BSCOE`, and moved to the canonical Department.
- `BSCE` points to `DCE`; its Program ID should be preserved and moved to the canonical Department.
- Four ProgramHeadAssignments point to confirmed test Programs. They are cleanup candidates, but no deletion is authorized yet.
- Existing real Students, applications, curricula, and direct user-program assignments already point to the Program IDs recommended for preservation; renaming/moving those Program rows avoids downstream foreign-key rewrites.

## 3. Target Architecture

```text
College: COE — College of Engineering
└── Department: COE — College of Engineering
    ├── Program: BSECE — Bachelor of Science in Electronics and Communication Engineering
    ├── Program: BSCOE — Bachelor of Science in Computer Engineering
    └── Program: BSCE — Bachelor of Science in Civil Engineering
```

Design rules:

- College owns Departments through an enforced foreign key.
- Department owns Programs through an enforced foreign key.
- Existing transactional and historical entities continue to reference stable Program IDs whenever possible.
- If duplicate Program records must be merged, one canonical ID per code will survive and every dependent foreign key will be remapped before obsolete rows are considered for removal.
- Program heads remain a generic role plus an assigned Program relationship; no program-specific roles will be created.
- Authentication identities and security records are outside the refactor scope unless a read-only dependency audit proves a direct academic foreign key exists.

## 4. Migration Plan

- [x] **Phase 1 — Database audit completed**
  - [x] Inspect Prisma schema/configuration and migrations.
  - [x] Inspect seeds and import scripts.
  - [x] Inspect live academic organization records and exact row counts.
- [x] **Phase 2 — Dependency mapping completed**
  - [x] Map all College, Department, Program, and program-head assignment foreign keys.
  - [x] Identify canonical rows, test-fixture cleanup candidates, and old-to-new ID mappings.
  - [x] Confirm historical and transactional impact.
- [x] **Phase 3 — Migration scripts created and reviewed**
  - [x] Define the migration strategy and preconditions.
  - [x] Resolve owner decisions listed below.
  - [x] Complete the final direct and indirect dependency analysis.
  - [x] Create non-destructive preflight/verification SQL.
  - [x] Create transactional migration SQL with abort-on-conflict checks.
  - [x] Create rollback/restoration instructions.
  - [ ] Obtain explicit confirmation before executing data modifications.
- [x] **Phase 4 — Data migration executed**
  - [x] Create filesystem checkpoint.
  - [x] Create and verify PostgreSQL backup.
  - [x] Run and review the final SELECT-only preflight.
  - [x] Execute the approved transaction only.
  - [x] Record exact ID mappings and affected row counts.
- [x] **Phase 5 — Code and seed preparation completed**
  - [x] Update idempotent organization/academic seeds and add a legacy-catalog cutover guard.
  - [x] Harden affected Prisma hierarchy queries and remove heuristic Program Head repair assignment.
- [x] **Phase 6 — Verification completed**
  - [x] Run database integrity and orphan checks.
  - [x] Run Prisma validation/generation/status and live-to-schema diff.
  - [x] Run all available automated tests (`npm test`); no build script exists.
  - [x] Verify key data relationships and record remaining recommendations.

Execution gate: **Satisfied.** The owner explicitly approved execution on 2026-09-01; the transaction committed successfully and post-cutover verification passed.

### Recommended migration strategy

The migration should preserve the three real Program UUIDs. This avoids changing Student, AdmissionApplication, EnrollmentApplication, Curriculum, and user-program foreign keys.

1. **Checkpoint and maintenance gate**
   - Stop write traffic for the short cutover window.
   - Create a timestamped filesystem checkpoint because Git is unavailable.
   - Create a custom-format `pg_dump` and verify its size is greater than zero.
   - Re-run the documented preflight query and abort if any ID, code, dependency count, or migration state differs.
2. **Acquire locks and execute one transaction**
   - Use an explicit transaction and lock only the organization/dependent tables required by the reviewed script.
   - Do not use `TRUNCATE`, `CASCADE`, `migrate reset`, or broad pattern-based deletion.
3. **Preserve/reuse canonical IDs**
   - Keep College ID `e822d5e3-91a4-4350-9b5a-ca1c38c17bb3` unchanged.
   - Reuse Department ID `e9e8b9ee-caa0-413e-86a6-b77c19ef7b67` and change its code/name from `DECE / Department of Electronics Engineering` to `COE / College of Engineering`.
   - Move the preserved `BSCpE` and `BSCE` Program rows to that Department ID.
   - Rename `BSCpE` in place to `BSCOE`; the existing Program code canonicalization trigger will update `code_normalized` to `bscoe`.
   - Update the BSECE name in place to the approved Electronics and Communication Engineering name.
4. **Retire the old Department rows only after dependency verification**
   - `DCpE` and `DCE` will have no remaining dependencies after their Programs move.
   - The reviewed execution script must assert they are empty before either deactivation or deletion.
5. **Handle confirmed old test fixtures separately**
   - Recommended final cleanup: remove only the four explicitly listed fixture graphs in dependency order while keeping their linked User, UserRole, Session, LoginAttempt, and AuditLog records unchanged.
   - Dependency order if destructive cleanup is approved: fixture CurriculumSubject → DRAFT Curriculum → Subject → ProgramHeadAssignment → Faculty profile → Program → Department → College.
   - Each delete must target explicit UUIDs and assert an exact affected-row count. No wildcard/suffix deletion is allowed.
   - Lower-risk alternative: mark fixture Colleges/Departments/Programs inactive and harden assignment resolution to reject inactive Programs. This preserves fixture rows but means the physical tables contain more than one College/Department/three Programs.
6. **Seed and code cutover**
   - Change `prisma/academic/data/departments.json` to one `COE` Department.
   - Change `prisma/academic/data/programs.json` to `BSECE`, `BSCOE`, and `BSCE`, all using `departmentCode: "COE"`, with approved names.
   - Keep seed upserts idempotent. Add a preflight that fails if a conflicting `BSCpE`/`BSCOE` pair exists instead of silently creating a second Program.
   - Remove arbitrary fallback selection from `repair-program-head-assignments.mjs`; require an explicit user-to-program mapping.
   - Filter both direct and faculty-based Program Head assignment resolution by active Program/Department/College.
   - Continue using database-driven program dropdowns; no frontend ID constants were found.
7. **Constraint hardening (review required)**
   - Add a PostgreSQL functional unique index for canonical Department code within a College, or introduce a Department normalized-code field/trigger in a separate reviewed schema migration.
   - A functional index is the smaller change and does not require updating every Prisma create call.
8. **Verification and commit**
   - Verify exact active catalog counts and codes.
   - Verify every listed foreign key and orphan query.
   - Verify the two real Students, two AdmissionApplications, one EnrollmentApplication, four BSECE Curricula, 68 real Subjects, 30 SubjectRequirements, and seven direct user-program assignments remain.
   - Validate Prisma, check migration status/diff, run tests against a dedicated test database, and run the application build if a build script is added.

### Migration package (executed once on 2026-09-01; do not replay)

```text
scripts/database-refactor/
├── 001-academic-organization-preflight.sql       # SELECT-only assertions/report
├── 002-normalize-engineering-organization.sql    # reviewed transaction, explicit IDs
├── 003-academic-organization-verify.sql          # SELECT-only post-checks
└── README.md                                      # backup, execution, and rollback runbook
```

The approved Department canonical-code constraint is included at the end of the same transaction as a functional unique index. It is created only after all data updates, fixture cleanup, and preservation assertions pass; any failure rolls back the data changes and index together. It is intentionally not a Prisma migration because this package contains environment-specific live UUIDs and must never replay against another database.

### Prepared transaction impact

If the source state still matches all exact preconditions, the transaction will:

- Update 1 Department row in place (`DECE` to `COE`).
- Update 3 canonical Program rows in place (`BSECE`, `BSCpE`/`BSCOE`, and `BSCE`).
- Delete 2 empty legacy Department rows after their Programs are moved.
- Delete 32 confirmed fixture-only academic rows: 4 each from College, Department, Program, Faculty, ProgramHeadAssignment, Subject, Curriculum, and CurriculumSubject.
- Create 1 canonical Department-code unique index.
- Perform 0 inserts, 0 table drops, 0 truncates, and 0 authentication/security writes.

Total expected affected data rows: **38** (4 updates and 34 deletes). The index creation is a schema operation and is counted separately.

Reviewed SQL SHA-256 fingerprints:

| File | SHA-256 |
|---|---|
| `001-academic-organization-preflight.sql` | `41CE38D0D71E8E0D842D9900570EAF4F6B7F657F729AB02F7B3128D1BFFF817C` |
| `002-normalize-engineering-organization.sql` | `B0EC71FD31E20E486044F6AD165E064E0C80A7D72830B5E637CBCF2EB43B3CED` |
| `003-academic-organization-verify.sql` | `955DEC95A3BBDDFE4A09F1555E5224FE44E3533B24273F1198E6CBD1C99BC9D6` |

Recompute and compare these hashes immediately before execution. Any difference requires re-review.

### Execution tooling and backup status

PostgreSQL 18.6 client tools were located at `C:\Program Files\PostgreSQL\18\bin` and used by absolute path. The tools remain absent from `PATH`, which is acceptable because the runbook records the explicit location. The server also reports PostgreSQL 18.6.

Verified safeguards created on 2026-09-01:

| Safeguard | Path | Bytes | SHA-256 | Validation |
|---|---|---:|---|---|
| Project checkpoint | `backups/project-before-academic-organization-refactor-20260901-200122.zip` | 6,138,307 | `A9C201FD40DF3A98068BD586171EA076C91AE10D8596E290E53D86B2AFB4BCDC` | 198 archive entries successfully listed |
| PostgreSQL custom dump | `backups/cor_jesu_sms-before-academic-organization-refactor.dump` | 372,587 | `028F435F57C46A5FFA5CE598E974D8B1E3F35BB4368540E2E15B5C9AF1421571` | Non-empty; `pg_restore --list` succeeded |
| Post-cutover PostgreSQL dump | `backups/cor_jesu_sms-after-academic-organization-refactor-20260901-200533.dump` | 370,431 | `639ACB410CB9F02496F6EEBF83C9F0BE837561DB15F6D9070CA2764CDCC2074B` | Non-empty; `pg_restore --list` succeeded |

The connection was loaded directly from `.env` and verified as `cjc_app@127.0.0.1:5432/cor_jesu_sms`. The SELECT-only preflight ran successfully through `psql`, ended with `ROLLBACK`, matched all seven Program mappings, matched every fixture dependency count, and found zero canonical Department-code conflicts. After explicit approval, the reviewed transaction completed with `COMMIT`, and a new post-cutover custom dump was created and validated.

### Approved owner decisions (2026-08-31)

1. **Approved:** Reuse existing Department UUID `e9e8b9ee-caa0-413e-86a6-b77c19ef7b67`, changing `DECE` to canonical `COE` only after dependency verification.
2. **Approved with conditions:** Purge only the four confirmed test-fixture organization graphs after a verified backup and final preflight. Any unexpected dependency aborts the entire transaction.
3. **Approved:** Preserve Program UUID `9a095737-5105-4f6c-8636-e32dfa1f7650` and rename `BSCpE` to `BSCOE`.
4. **Approved:** Leave BSCOE without a Program Head; do not create a placeholder.
5. **Approved:** Preserve all Users, roles, permissions, sessions, login attempts, audit records, and security history, including integration-test accounts.
6. **Approved:** Add canonical Department-code uniqueness only after duplicate resolution and successful data validation.

Execution was separately authorized and completed on 2026-09-01. Any future organization refactor requires a new audit, backup, reviewed SQL package, and explicit authorization; this one-time UUID cutover must not be replayed.

## 5. Database Changes Log

### 2026-09-01 — Academic organization cutover executed and verified

**Status:** Completed successfully

**Authorization:** The project owner explicitly approved executing `002-normalize-engineering-organization.sql`.

**Action:** Reverified both backup hashes and all reviewed SQL hashes, confirmed no application listener on port 3000, reran the SELECT-only preflight, and executed the exact reviewed one-transaction cutover through PostgreSQL 18.6 `psql`. PostgreSQL completed every assertion, created the index, and returned `COMMIT`. The post-verification SQL and application/tooling checks then passed.

**Database changes:**

- Updated Department `e9e8b9ee-caa0-413e-86a6-b77c19ef7b67` from `DECE` to `COE`, retaining its UUID and 68 real Subjects.
- Preserved Program UUIDs for BSECE, BSCOE, and BSCE; moved all three to canonical Department COE.
- Renamed `BSCpE` to `BSCOE` in place and updated BSECE to its approved full name.
- Removed 2 empty legacy Departments (`DCpE` and `DCE`).
- Removed 32 confirmed fixture-only academic rows: 4 each from College, Department, Program, Faculty, ProgramHeadAssignment, Subject, Curriculum, and CurriculumSubject.
- Created `departments_college_id_code_canonical_key`.
- Performed no authentication/security DML and no inserts, table drops, or truncates.

**Actual affected data rows:** 38 total — 4 updates and 34 deletes. One unique functional index was added separately.

**Post-cutover result:**

- 1 College (`COE`), 1 Department (`COE`), and exactly 3 Programs (`BSECE`, `BSCOE`, `BSCE`).
- 0 fixture College, Department, or Program roots remain.
- 0 detected orphan relationships.
- Preserved: 2 Students, 2 AdmissionApplications, 1 EnrollmentApplication, 4 Curricula, 68 Subjects, 68 CurriculumSubjects, 30 SubjectRequirements, and 7 UserProgramAssignments.
- Authentication catalog remains available: 21 Users, 21 UserRoles, and 152 AuditLogs at final verification. The four fixture-linked Users retain their roles, audit history, login-attempt history, and direct BSCE assignments.
- BSCOE intentionally has no Program Head assignment.

**Validation:** Prisma validate/generate/status passed; live-to-schema diff is empty; canonical seed plan passed; all 10 automated tests passed. The production server started successfully, returned HTTP 200 for `/`, and was stopped cleanly after the smoke check.

### 2026-09-01 — Backup gate and final read-only preflight completed

**Status:** Completed; cutover not executed

**Action:** Located PostgreSQL 18.6 tools, verified the `.env` connection identity with `psql`, created and validated a timestamped project checkpoint, created and catalog-validated a custom-format PostgreSQL dump, and ran the approved SELECT-only preflight.

**Files affected:**

- `backups/project-before-academic-organization-refactor-20260901-200122.zip` (created)
- `backups/cor_jesu_sms-before-academic-organization-refactor.dump` (created)
- `docs/database-refactor-progress.md` (updated)

**Database tables affected:** None. The preflight used a read-only transaction and ended with `ROLLBACK`.

**Result:** Connection identity and all UUID mappings match the approved plan. Fixture counts remain exactly 4 Colleges, 4 Departments, 4 Programs, 4 Faculty, 4 ProgramHeadAssignments, 4 Subjects, 4 DRAFT Curricula, and 4 CurriculumSubjects; all protected dependency categories remain zero. No canonical Department-code conflict exists. The migration is ready for a separate final execution decision.

### 2026-08-31 — Review-only migration package and safety validation completed

**Status:** Completed; not executed

**Action:** Prepared the read-only preflight, one-transaction cutover, read-only post-verification, and backup/rollback runbook. Scanned the cutover for prohibited operations, validated exact target UUIDs/count assertions, confirmed Prisma migration status, and rechecked the live source counts after the test suite.

**Files affected:**

- `scripts/database-refactor/001-academic-organization-preflight.sql`
- `scripts/database-refactor/002-normalize-engineering-organization.sql`
- `scripts/database-refactor/003-academic-organization-verify.sql`
- `scripts/database-refactor/README.md`
- `docs/database-refactor-progress.md`

**Database tables affected:** None. The prepared SQL was not executed. Live counts remain 5 Colleges, 7 Departments, 7 Programs, 4 Faculty, 72 Subjects, 8 Curricula, 72 CurriculumSubjects, 2 Students, and 7 UserProgramAssignments.

**Result:** The cutover contains no `INSERT`, `DROP TABLE`, `TRUNCATE`, authentication DML, or Prisma reset operation. The mutation script has 4 updates and 9 explicit delete statements inside one transaction, guarded by UUID and exact-row-count assertions. PostgreSQL client tools are currently unavailable, so backup creation and execution remain blocked.

### 2026-08-31 — Seed and runtime hierarchy preparation completed

**Status:** Completed; no database writes

**Action:** Updated the organization seed targets to the approved hierarchy, added a guard that refuses to seed while the legacy live catalog remains, filtered program queries through active parent hierarchy records, and replaced arbitrary Program Head repair fallback logic with an explicit-map, dry-run-by-default workflow.

**Files affected:**

- `prisma/academic/data/departments.json`
- `prisma/academic/data/programs.json`
- `prisma/seeds/organization/seed-organization.mjs`
- `prisma/seeds/scripts/repair-program-head-assignments.mjs`
- `server/auth-store.mjs`
- `server/admission-store.mjs`
- `server/enrollment-store.mjs`
- `server/program-head-store.mjs`

**Database tables affected:** None. Seeds and repair scripts were not committed or run.

**Result:** `npm run seed:plan`, JavaScript syntax validation, Prisma relation-filter validation, and all 10 automated tests passed. Authentication behavior remains unchanged.

### 2026-08-31 — Final dependency analysis and owner decisions recorded

**Status:** Completed

**Action:** Rechecked every direct and indirect fixture dependency through curricula, subjects, offerings, faculty, enrollments, grades, views, reports, and security-linked Users. Recorded all six owner approvals and the remaining execution gate.

**Files affected:**

- `docs/database-refactor-progress.md`

**Database tables affected:** None. All database operations were read-only.

**Result:** Exactly four self-contained academic test fixture graphs are eligible for explicit cleanup. No valid Student, application, enrollment, offering, grade, report, or security record depends on a fixture Program. Authentication preservation was confirmed. Migration SQL preparation is authorized; execution is not.

### 2026-08-31 — Read-only database and migration audit completed

**Status:** Completed

**Action:** Validated Prisma, confirmed migration state and schema diff, queried the live PostgreSQL organization catalog, mapped foreign keys, counted dependencies, and ran orphan checks.

**Files affected:**

- `docs/database-refactor-progress.md` (findings recorded)

**Database tables affected:** None. All database queries were read-only `SELECT` operations.

**Reason:** Establish exact IDs and dependencies before proposing normalization.

**Result:** Canonical production rows and four old integration-test fixture graphs were identified. No orphan foreign keys exist. No database data or schema changed.

**Diagnostic note:** One initial catalog query failed because Prisma could not deserialize PostgreSQL internal type `char`; the query was rerun with `contype::text`. This was a read-only diagnostic issue and did not affect the application or database.

### 2026-08-31 — Documentation initialized

**Status:** Completed

**Action:** Created the mandatory database refactor progress document before database analysis or modification.

**Files affected:**

- `docs/database-refactor-progress.md`

**Database tables affected:** None.

**Reason:** Establish a durable handoff record and prevent repeated analysis or untracked migration steps.

**Result:** Audit and migration checklist established. No SQL was executed and no database data or schema was changed.

## 6. Code Changes Log

### 2026-08-31 — Migration package, canonical seeds, and hierarchy guards prepared

**Status:** Completed; review-only/no database writes

**Files created:**

- `scripts/database-refactor/001-academic-organization-preflight.sql`
- `scripts/database-refactor/002-normalize-engineering-organization.sql`
- `scripts/database-refactor/003-academic-organization-verify.sql`
- `scripts/database-refactor/README.md`

**Files modified:**

- `prisma/academic/data/departments.json`
- `prisma/academic/data/programs.json`
- `prisma/seeds/organization/seed-organization.mjs`
- `prisma/seeds/scripts/repair-program-head-assignments.mjs`
- `server/auth-store.mjs`
- `server/admission-store.mjs`
- `server/enrollment-store.mjs`
- `server/program-head-store.mjs`
- `docs/database-refactor-progress.md`

**Component/API updated:** Organization seed planning, Program availability filtering, Program Head assignment resolution/repair, and review-only database cutover tooling. API endpoint contracts are unchanged.

**Reason:** Prevent the old hierarchy from being recreated, ensure inactive/noncanonical parents cannot leak into runtime choices, eliminate guessed Program Head assignments, and provide an auditable exact-UUID cutover.

**Result:** No application authentication code or database records were changed. Prisma validates, all modified modules pass syntax checks, seed planning resolves to COE/BSECE/BSCOE/BSCE, and all 10 tests pass.

### 2026-08-31 — Approved decisions and final dependency counts documented

**Status:** Completed

**File modified:** `docs/database-refactor-progress.md`

**Component/API updated:** None.

**Reason:** Satisfy the required final analysis and durable handoff before migration SQL preparation.

### 2026-08-31 — Audit findings and migration strategy documented

**Status:** Completed

**File modified:** `docs/database-refactor-progress.md`

**Component/API updated:** None.

**Reason:** Record the verified live state, relationship map, exact IDs, seed conflicts, code risks, and approval-gated migration plan.

**Result:** Another developer can continue from this file without repeating the audit. No application behavior changed.

### 2026-08-31 — Documentation initialized

**Status:** Completed

**File created:** `docs/database-refactor-progress.md`

**Component/API updated:** None.

**Reason:** Required single source of truth for the database restructuring task.

## 7. Data Migration Record

The approved data migration executed successfully on 2026-09-01.

Applied ID-preserving mapping:

| Entity | Old ID | Canonical/New ID | Planned dependent action | Status |
|---|---|---|---|---|
| College COE | `e822d5e3-91a4-4350-9b5a-ca1c38c17bb3` | same ID | Preserved unchanged | Applied |
| Department DECE | `e9e8b9ee-caa0-413e-86a6-b77c19ef7b67` | same ID | Renamed to `COE / College of Engineering`; retains 68 Subjects and BSECE | Applied |
| Department DCpE | `0bab1931-2c2e-4343-9b45-a7a24e36509f` | `e9e8b9ee-caa0-413e-86a6-b77c19ef7b67` | Moved BSCOE Program, then removed empty Department | Applied |
| Department DCE | `cab1994e-ccd9-4626-98c1-74f4df90bd2c` | `e9e8b9ee-caa0-413e-86a6-b77c19ef7b67` | Moved BSCE Program, then removed empty Department | Applied |
| Program BSECE | `736c0502-8016-4c26-9d64-1049afab4158` | same ID | Updated name and Department; all Curricula/user assignments stayed linked | Applied |
| Program BSCpE | `9a095737-5105-4f6c-8636-e32dfa1f7650` | same ID | Renamed code to BSCOE and moved Department; Student/application/enrollment application stayed linked | Applied |
| Program BSCE | `8863df7a-34c1-4b34-8346-99a4f09a09db` | same ID | Moved Department; Student/application/user assignments stayed linked | Applied |
| Fixture Program BSECE1a82da3c | `0a3825d9-3118-48dc-818c-8fdb6404062c` | `736c0502-8016-4c26-9d64-1049afab4158` | Logical mapping to BSECE; purged its proven fixture-only dependency graph | Applied |
| Fixture Program BSECE5a8535de | `0af9fcd4-9ef3-4c8e-b9b1-761183dd1afd` | `736c0502-8016-4c26-9d64-1049afab4158` | Logical mapping to BSECE; purged its proven fixture-only dependency graph | Applied |
| Fixture Program BSECE94c89afc | `afa137b4-a746-414f-93dc-bf4454770996` | `736c0502-8016-4c26-9d64-1049afab4158` | Logical mapping to BSECE; purged its proven fixture-only dependency graph | Applied |
| Fixture Program BSECEebd6617d | `5c416679-fd16-441c-b173-f2ccc570ba6b` | `736c0502-8016-4c26-9d64-1049afab4158` | Logical mapping to BSECE; purged its proven fixture-only dependency graph | Applied |

The four fixture Programs are mapped to canonical BSECE for traceability. Their foreign-key dependents are not reassigned because every dependent row was proven to be part of the same test fixture (4 Faculty profiles, 4 test ProgramHeadAssignments, 4 Subjects, 4 DRAFT Curricula, and 4 CurriculumSubjects). Reassigning these rows would contaminate the real BSECE catalog. All linked authentication Users and security history are preserved separately.

## 8. Remaining Tasks

### Pending

- [ ] Configure a dedicated test database or equivalent isolation before running integration tests again.
- [ ] Assign a BSCOE Program Head only when an authorized account is selected; no placeholder is permitted.

### Completed

- [x] Mandatory progress documentation created before database modification.
- [x] Project objective and requested target hierarchy recorded.
- [x] Migration execution gate recorded.
- [x] Prisma schema/configuration, migrations, and custom SQL audited.
- [x] Seed architecture and legacy organization seed data audited.
- [x] Live database identity, exact rows, constraints, indexes, triggers, and foreign keys audited.
- [x] Canonical IDs and old test-fixture IDs recorded.
- [x] Backend/frontend hierarchy assumptions searched.
- [x] Migration strategy, backup gate, and post-verification plan documented.
- [x] Owner approved the canonical UUID strategy, fixture purge, BSCOE rename, empty BSCOE head assignment, authentication preservation, and Department constraint.
- [x] Final indirect fixture dependency analysis completed with exact affected-row counts.
- [x] UUID mapping table completed for canonical and fixture Programs.
- [x] Review-only preflight, transaction, verification, and rollback package created.
- [x] Seed targets updated and protected from running before the catalog cutover.
- [x] Runtime Program hierarchy filters hardened.
- [x] Program Head repair script made explicit-map-only and dry-run-by-default.
- [x] Prisma validation and migration status passed.
- [x] All 10 automated tests passed with transaction rollback; live organization counts remained unchanged.
- [x] PostgreSQL 18.6 `psql`, `pg_dump`, and `pg_restore` located and version-checked.
- [x] Project checkpoint created and archive contents validated.
- [x] PostgreSQL custom-format backup created, hashed, and validated with `pg_restore --list`.
- [x] Final SELECT-only preflight passed through `psql` with no unexpected state.
- [x] Owner provided separate final execution approval.
- [x] Reviewed transaction committed successfully.
- [x] Canonical Department index and final hierarchy verified.
- [x] Post-cutover database dump created, hashed, and validated.
- [x] Prisma validate/generate/status/diff and all 10 tests passed after cutover.
- [x] Server startup smoke test returned HTTP 200 and left port 3000 free afterward.

## 9. Verification Report

### Database

- [x] Exactly one `COE` College exists.
- [x] Exactly one canonical Engineering Department exists.
- [x] Only the approved Programs exist: `BSECE`, `BSCOE`, `BSCE`.
- [x] Programs reference the canonical Department.
- [x] Department references the canonical College.
- [x] Program-head assignments reference valid Programs (none remain after fixture cleanup).
- [x] Students, curricula, applications, and user-program history reference valid surviving records.
- [x] No orphan records or broken foreign keys exist.
- [x] Valid academic and authentication history remains intact.

### Application and tooling

- [x] `npx prisma validate` succeeds.
- [x] `npx prisma generate` succeeds.
- [x] `npx prisma migrate status` confirms expected state.
- [x] Live database-to-schema diff is empty.
- [x] All 10 automated tests succeed.
- [x] Build check is not applicable because `package.json` has no build script.
- [x] Seed planning resolves only the canonical hierarchy and organization writes use upserts; the full seed was not run because it also updates unrelated reference data.
- [x] No runtime/API errors were detected by the available automated tests.
- [x] Server startup and root-page HTTP smoke test succeeded.

### Current verification result

Final post-cutover result:

- ✓ Prisma schema validates.
- ✓ All 20 migrations are applied.
- ✓ Live-to-schema diff is empty.
- ✓ Database identity matches `cjc_app@127.0.0.1/cor_jesu_sms`.
- ✓ No tested orphan foreign keys exist.
- ✓ Existing real Student, application, Curriculum, Subject, and user-program dependencies are mapped.
- ✓ Review-only migration package contains no inserts, table drops, truncates, authentication DML, or Prisma reset commands.
- ✓ Seed planning, modified JavaScript syntax checks, and all 10 tests pass.
- ✓ Final organization shape is compliant: 1 College, 1 Department, and 3 Programs.
- ✓ PostgreSQL 18.6 client tools were located and match the server version.
- ✓ Project checkpoint and PostgreSQL custom-format backup were created and validated.
- ✓ Final SELECT-only preflight passed and rolled back without changing data.
- ✓ Reviewed migration committed successfully: 4 updates, 34 deletes, and 1 canonical unique index were applied.
- ✓ Fixture roots are absent and all tested orphan counts are zero.
- ✓ A validated post-cutover custom-format database dump was created.
- ✓ Server startup smoke test returned HTTP 200; the temporary process was stopped.

Database refactor completed successfully on 2026-09-01.
