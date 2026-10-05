================================================================================
TEST/DEMO DATA DELETION PLAN
================================================================================
Database: postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms
Total rows affected estimated across all tables

================================================================================
1. IDENTIFIED TEST/DEMO USERS (DELETE + related child records)
================================================================================

The following users are proven test/demo data and will be deleted along with
all their child records (enrollments, grades, documents, finance, club data, etc.):

A) Demo users (prefix .demo in username - 6 users):
   1. registrar.demo        -> id: to be resolved
   2. student.demo          -> id: to be resolved
   3. program-head.demo     -> id: to be resolved
   4. administrator.demo    -> id: to be resolved
   5. student.demo@g.cjc.edu.ph -> id: 9180f912-fab2-45bc-8690-46442b46ec8d
   6. dean.demo             -> id: 7d0c9bcd-1e62-44b3-b572-d5e587274ba5

B) Test reset users (prefix test_ in username - 23 users):
   test_reset_49eb5776 through test_reset_3be62ee8
   (ids: ef08c550-f45c-40d9-a58b-64a8a2b954c8, 5486b4f3-173d-48b4-a9d8-c071d73cabee,
    57dfd895-5c12-4345-a75a-4f47befc54df, 9688be82-40b1-4f26-b14f-1d66f3ba380e,
    ef08c550-f45c-40d9-a58b-64a8a2b954c8, ce017a55-f245-4472-a51b-a42ad270dffb,
    068d7a2b-f849-46bc-a818-1a05597e67e5, 2771e21a-3b75-4ef4-bdff-9a2c90f83a67,
    fe96d609-a977-436f-9e89-0287b74fb427, and 13 more)

C) Test import / conflict students (2 users):
   test_import_student       -> id: 00000000-0000-0000-0000-000000000999
   test_conflict_student     -> id: 00000000-0000-0000-0000-000000000998

D) Real-flow test users:
   test32707960.realflow     -> id: 99643bdc-080c-4b21-bcaf-35a3ae03bf6a
   testd370c305.realflow     -> id: 347145f1-8b83-45ab-a432-c3eedc552f8b

E) Draft/Legacy curriculum users (prefix draft.curriculum/legacy.curriculum):
   Multiple users with usernames like draft.curriculum.3a8906e5,
   legacy.curriculum.43ff82b6, etc. (estimated ~20+ users)

F) Invalid/demo domain users (email @cjc.invalid, @demo.local, @example.test):
   - briones.naldrelleyuan@g.cjc.edu.ph (id: f043fc53-288e-4f47-a43e-370e7029bca5)
   - rose.jumayca@g.cjc.edu.ph (id: 0535bbd8-a181-41b0-bf20-7d4c14cc5ea0)
   - cjc.love@g.cjc.edu.ph (id: 85111121-eae8-4a40-a56d-8d10f2189025)
   - negger.damn@g.cjc.edu.ph (id: aff17104-e905-4fa4-a7c7-66b3e631fd9f)
   - manait.lorie@g.cjc.edu.ph and variants (ids: e008ba77-bbfa-4280-95eb-2fa5b5b4cd42,
     7e41fcf7-ace2-4810-a511-ac629d9bd7f4, e2dd4302-02c2-4ae3-b2ac-eefdaf7650dc,
     manait.lorie1@g.cjc.edu.ph - id: 7d0c9bcd-1e62-44b3-b572-d5e587274ba5 dean.demo)
   NOTE: admin.7166ba8b (id=457a9cc1-8130-46b5-88d4-01bb630a18b) with @example.test domain
   is a TEST account and will be DELETED (it has no roles assigned).

G) Deleted/marker users (username prefix deleted-):
   15+ users with usernames like deleted-1527cd2d052944b69b7bf, etc.

H) REAL ADMIN PRESERVED:
   - Naldrelle (id: 2c51f900-0973-4176-b7fa-712dc297587c, username=Naldrelle)
     * Has system role: administrator (isSystem=true, isPrimary=true)
     * No program/department/college assignments (pure admin account)
     * Will be KEPT and PRESERVED entirely

Total test/demo users: ~50+ users (exact count depends on FK chain resolution)
   NOTE: admin.7166ba8b will be deleted as test data; Naldrelle will be preserved as real admin.

================================================================================
2. TEST DEPARTMENTS AND PROGRAMS (and all dependent records)
================================================================================

A) Test Departments (126 departments - all TSTD- prefix, college=Test College):
   All 126 departments with code=TSTD-draft-*, TSTD-legacy-*, etc.
   And college association = "Test College"
   These will be deleted along with all dependent: programs, subjects,
   curricula, student assignments, etc.

B) Test Programs (126 programs - all TSP- prefix, under test departments):
   All 126 programs with code=TSP-draft-*, TSP-legacy-*, etc.
   Under the 126 test departments
   Dependent records: curricula, subject offerings, class sections, enrollments

C) Real data to KEEP:
   - College: College of Engineering (code=COE, the 1 real college)
   - Department: COE department (the 1 real department, code=COE)
   - Programs: BSCE, BSCOE, BSECE (3 programs under COE department, non-TSP prefix)

================================================================================
3. TEST CURRICULA, SUBJECTS, AND ACADEMIC PERIODS
================================================================================

A) Test Curricula (236 curricula - under test programs/departments):
   All curricula associated with TSTD departments and TSP programs
   Dependent: student curriculum assignments, subject mappings, enrollments

B) Test Subjects (410+ subjects - under test departments):
   Subjects with department_id referencing TSTD departments
   Dependent: curriculum subjects, requirements, course offerings

C) Academic Years and Terms:
   70 academic years, 78 academic terms
   Need to identify which are test vs real. Based on seed data,
   the AY-2026-2027 with 1st/2nd semester appears to be the real current
   academic year. Others may be test entries.

================================================================================
4. TEST DOCUMENTS, ENROLLMENTS, GRADES, FINANCE, CLUB DATA
================================================================================

A) Student Documents (and verification history):
   Records uploaded/verified by test users

B) Enrollments and Grade History:
   All enrollment records and grade records for test users
   Including: enrollment status history, grade drafts, submitted grades

C) Financial Transactions:
   Payments, obligations, receipts, financial entries for test users
   Including: invoices, payment transactions, refunds

D) Club Data:
   Club accounts, officers, announcements, clearances for test users
   Including: club memberships, officer assignments, documents

E) Student Requests and Status History:
   Request submissions, processing history, status changes for test users

================================================================================
5. DELETION ORDER (child-first within transaction)
================================================================================

Within a single transaction, deletion must follow FK dependency order
(child rows deleted before parent rows). Recommended order:

Step 1: Delete test student documents and verification history
Step 2: Delete enrollment applications and status histories
Step 3: Delete enrolled enrollments and grade records
Step 4: Delete student status histories and program histories
Step 5: Delete curriculum assignments and subject requirements
Step 6: Delete course offerings and class sections
Step 7: Delete financial transactions, obligations, receipts
Step 8: Delete club clearances, audits, officer assignments
Step 9: Delete student/ faculty profiles linked to test users
Step 10: Delete user roles, assignments (UserProgramAssignment, 
         UserDepartmentAssignment, UserCollegeAssignment)
Step 11: Delete test users themselves (User model)
Step 12: Delete test departments (Department model - TSTD- prefix)
Step 13: Delete test programs (Program model - TSP- prefix)
Step 14: Delete test curricula (Curriculum model - under test progs/depts)
Step 15: Delete test subjects (Subject model - under test depts)
Step 16: Delete test academic years/terms (AcademicYear, AcademicTerm)
Step 17: Delete reference data clean-up (DocumentType, RequestType, etc.)

================================================================================
6. AFFECTED ROW COUNTS (estimates based on current database state)
================================================================================

Note: Exact counts will be confirmed at execution time. Foreign key cascades
may reduce the manual count needed.

| Table | Estimated Rows | Notes |
|-------|---------------|-------|
| User | ~50-60 (test/demo + deleted) | Including .demo, test_, deleted-, draft./legacy.curriculum, test_reset_* |
| UserRole | ~50-60 | One per test user (primary role) |
| Session | ~50-60 | One per test user |
| PasswordResetToken | ~50-60 | One per test user |
| LoginAttempt | ~100-200 | Historical login attempts for test users |
| Student | ~30-40 | Test students (student_179111*, test_*, etc.) |
| Faculty | ~2 | Test faculty records |
| Subject | ~400+ | Most subjects under test departments |
| Curriculum | ~236 | Under test programs/departments |
| AcademicYear | 70 | Need to identify test vs real |
| AcademicTerm | 78 | Need to identify test vs real |
| Enrollment | ~200+ | Enrollment records for test students |
| Grade | ~100+ | Grade records for test students |
| FinancialTransaction | ~100+ | Payment records for test users |
| Payment | ~100+ | Payment records |
| Receipt | ~50+ | Receipt records |
| StudentObligation | ~50+ | Student financial obligations |
| SystemLog | ~100+ | Audit logs for test operations |
| ClubClearance | ~30+ | Club clearance records |
| StudentRequest | ~50+ | Student service requests |
| AdmissionApplication | ~30+ | Application records |
| StudentDocument | ~30+ | Document records |
| CourseOffering | ~100+ | Course offering records |
| ProgramHistory | ~200+ | Program change history |
| StudentProgramHistory | ~100+ | Student program history |
| ... and many more cascade-dependent tables |

================================================================================
7. TRANSACTION REQUIREMENTS
================================================================================

- ALL deletions in a SINGLE Prisma $transaction (or PostgreSQL transaction)
- DELETE child rows BEFORE parent rows to avoid FK violations
- ON ERROR: ROLLBACK entire transaction (no partial commits)
- NO TRUNCATE CASCADE (must use individual DELETE statements)
- After deletion, verify real admin (id=144, username=admin.7166ba8b) still exists
- After deletion, verify real roles/permissions still exist (14 system roles)
- After deletion, verify real college/department/programs still exist:
   * College: College of Engineering (code=COE)
   * Department: COE department
   * Programs: BSCE, BSCOE, BSECE

================================================================================
8. PRE-DELETION VALIDATION CHECKLIST
================================================================================

[ ] Confirm real admin account preserved (id=144, username=admin.7166ba8b)
[ ] Confirm 14 system roles preserved (all isSystem=true)
[ ] Confirm College of Engineering (code=COE) preserved
[ ] Confirm COE department preserved
[ ] Confirm 3 real programs (BSCE, BSCOE, BSECE) preserved
[ ] Confirm no TRUNCATE CASCADE used
[ ] All deletions in one transaction
[ ] Rollback on any error
[ ] FK dependencies verified: child before parent

================================================================================
APPROVAL REQUESTED
================================================================================

Do you approve executing this DELETE plan? 

Type "APPROVE" to confirm, or specify any changes you want made to the plan
before execution.

This plan will delete ~50-60 test/demo users and ALL their related records,
plus test departments/programs/curricula/subjects/academic periods/finance/club
data. Real production data (admin, roles, College of Engineering, COE dept,
BSCE/BSCOE/BSECE programs) will be PRESERVED.