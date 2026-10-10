================================================================================
NEW CLEAN DATABASE CREATION PLAN
================================================================================

Current Database: postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms
Total migrations: 27 (all applied)

================================================================================
1. NEW DATABASE CREATION
================================================================================

STEP 1: Create NEW PostgreSQL database
-------------------------------------
New database name: alpha_cor_jesu_sms
New connection string: postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms

COMMAND to create new database (run in PostgreSQL):
  CREATE DATABASE alpha_cor_jesu_sms;

STEP 2: Update environment configuration
----------------------------------------
Add new environment variable to .env (or create alpha-.env):

  ALPHA_DATABASE_URL="postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms"

Note: Current .env DATABASE_URL must remain unchanged (current DB as backup/archive).

STEP 3: Set ALPHA_DATABASE_URL for Prisma
-----------------------------------------
Update prisma.config.ts or use env directly:
  ALPHA_DATABASE_URL="postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms"

STEP 4: Run migrations against NEW DB only
-------------------------------------------
  npx prisma migrate deploy

This will apply all 27 migrations to the NEW database (alpha_cor_jesu_sms).

VERIFICATION: After migration deploy, check:
  npx prisma migrate status --database-url alpha_cor_jesu_sms
  Should show 27 migrations applied to alpha database.

================================================================================
2. MASTER TABLES TO COPY (from current DB to new DB)
================================================================================

Only the following tables should be copied (NO test/demo/operational data):

A) AUTHENTICATION & AUTHORIZATION (KEEP ONLY):
  - Role (14 system roles - all isSystem=true)
  - Permission (all permissions)
  - UserRole (role assignments)
  - User (KEEP ONLY: Naldrelle admin account)
    * id: 2c51f900-0973-4176-b7fa-712dc297587c
    * username: Naldrelle
    * email: null
    * status: ACTIVE
    * Has administrator role (isPrimary: true)

B) ACADEMIC ORGANIZATION (KEEP ONLY real data):
  - College (KEEP ONLY: College of Engineering, code=COE)
  - Department (KEEP ONLY: COE department, code=COE, under College of Engineering)
  - Program (KEEP ONLY: 3 real programs under COE department)
    * BSCE: Bachelor of Science in Civil Engineering
    * BSCOE: Bachelor of Science in Computer Engineering
    * BSECE: Bachelor of Science in Electronics and Communication Engineering
  - Curriculum (KEEP ONLY: those under the 3 real programs/department)
  - Subject (KEEP ONLY: those under COE department)
  - SubjectRequirement (prerequisites/corequisites)

C) REFERENCE/CONFIGURATION DATA (KEEP ONLY):
  - DocumentType (5 document types: Birth Certificate, Form 138, Good Moral, Medical Certificate, 2x2 Picture)
  - RequestType (8 request types: TOR, COG, COR, GMC, ADD_DROP, SUBJ_OFFER, OVERLOAD)
  - AcademicYear (KEEP ONLY: AY-2026-2027 with 1st/2nd semester)
  - AcademicTerm (KEEP ONLY: 1st Semester 2026-2027 and 2nd Semester 2026-2027 under AY-2026-2027)
  - StudentStatus (enum values: APPLICANT, ACTIVE, ON_LEAVE, GRADUATED, WITHDRAWN, SUSPENDED, DISMISSED)
  - FacultyStatus (enum values: ACTIVE, ON_LEAVE, SEPARATED, RETIRED)
  - CurriculumStatus (enum values: DRAFT, ACTIVE, RETIRED)
  - SubjectStatus (enum values: ACTIVE, INACTIVE, RETIRED)
  - CourseOfferingStatus (enum values: PLANNED, OPEN, CLOSED, CANCELLED, COMPLETED, ARCHIVED)
  - EnrollmentPeriodStatus (enum values: DRAFT, OPEN, CLOSED)
  - EnrollmentItemStatus (enum values: PENDING, ENROLLED, DROPPED, WITHDRAWN, COMPLETED)
  - StudentStatus (enum values already listed above)
  - GradingPeriodType (enum values: PRELIM, MIDTERM, PREFINAL, FINAL, COMPLETION, OTHER)
  - GradeStatus (enum values: DRAFT, SUBMITTED, APPROVED, POSTED, VOIDED)
  - ClearanceCycleStatus (enum values: DRAFT, OPEN, CLOSED, ARCHIVED)
  - ClearanceItemStatus (enum values: PENDING, APPROVED, BLOCKED, WAIVED)
  - InvoiceStatus (enum values: DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOIDED)
  - PaymentStatus (enum values: PENDING, POSTED, VOIDED, REFUNDED)
  - PaymentMethod (enum values: CASH, CARD, BANK_TRANSFER, ONLINE, CHECK, OTHER)
  - PaymentTransactionStatus (enum values: CREATED, PENDING, PROCESSING, SUCCESS, VERIFIED, FAILED, REFUNDED)
  - PaymentLogEventType (enum values: PAYMENT_CREATED, PAYMENT_RECEIVED, etc.)
  - FinancialEntryType (enum values: ASSESSMENT, PAYMENT, ADJUSTMENT, REFUND, REVERSAL)
  - FinancialDirection (enum values: DEBIT, CREDIT)
  - StudentRequestStatus (enum values: SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PROCESSING, READY_FOR_RELEASE, COMPLETED, CANCELLED)
  - AdmissionApplicationStatus (enum values: DRAFT, PENDING, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN, RETURNED_FOR_CORRECTION)
  - FacultyEmploymentType (enum values: FULL_TIME, PART_TIME, ADJUNCT, CONTRACTUAL, VISITING)
  - EnrollmentStatus (enum values: DRAFT, PENDING, ASSESSED, ENROLLED, CANCELLED, WITHDRAWN, COMPLETED)
  - EnrollmentApplicationStatus (enum values: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED_FOR_CORRECTION, REJECTED)
  - EnrollmentPeriodStatus (enum values: DRAFT, OPEN, CLOSED)
  - Weekday (enum values: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY)
  - StudentStatus (enum values: APPLICANT, ACTIVE, ON_LEAVE, GRADUATED, WITHDRAWN, SUSPENDED, DISMISSED)
  - FacultyStatus (enum values: ACTIVE, ON_LEAVE, SEPARATED, RETIRED)
  - CurriculumStatus (enum values: DRAFT, ACTIVE, RETIRED)
  - SubjectStatus (enum values: ACTIVE, INACTIVE, RETIRED)

D) ENUMERATIONS (KEEP DEFINITIONS - no data rows):
  All enum types listed above - keep the schema definitions, no test data

================================================================================
3. EXACT COPY ORDER (FK-safe within transaction)
================================================================================

Within a SINGLE Prisma $transaction, copy in this EXACT order:

STEP 1: Copy Enumeration/Reference Data (safe - no FK dependencies on test data)
  1. DocumentType seeds
  2. RequestType seeds
  3. All enum type definitions (already in schema)

STEP 2: Copy Authorization/Catalog Data
  4. Role records (14 system roles)
  5. Permission records
  6. UserRole assignments (only for Naldrelle + admin role)

STEP 3: Copy Academic Organization Data (FK order important)
  7. College: College of Engineering (code=COE)
  8. Department: COE department (code=COE, under College of Engineering)
  9. Program: BSCE, BSCOE, BSECE (under COE department)
  10. Curriculum records (under the 3 real programs)
  11. Subject records (under COE department)
  12. SubjectRequirement records (prerequisites for subjects)

STEP 4: Copy Academic Period Data
  13. AcademicYear: AY-2026-2027
  14. AcademicTerm: 1st Semester 2026-2027, 2nd Semester 2026-2027 (under AY-2026-2027)

STEP 5: Verify FK Integrity
  15. Check all foreign keys are valid
  16. Check Naldrelle can login

================================================================================
3. DATA COPY DETAILS
================================================================================

A) Role records to copy (14 system roles):
  - administrator (slug: administrator, isSystem: true)
  - student (slug: student, isSystem: true)
  - faculty (slug: faculty, isSystem: true)
  - program_head (slug: program_head, isSystem: true)
  - dean (slug: dean, isSystem: true)
  - student_assistant (slug: student_assistant, isSystem: true)
  - registrar (slug: registrar, isSystem: true)
  - cashier (slug: cashier, isSystem: true)
  - ssc (slug: ssc, isSystem: true)
  - club (slug: club, isSystem: true)
  - lirc_director (slug: lirc_director, isSystem: true)
  - laboratory_in_charge (slug: laboratory_in_charge, isSystem: true)
  - yearbook_coordinator (slug: yearbook_coordinator, isSystem: true)
  - proctor (slug: proctor, isSystem: true)

B) Naldrelle user assignment:
  - User: Naldrelle (id: 2c51f900-0973-4176-b7fa-712dc297587c)
  - UserRole: primary role = administrator
  - No other user records should be copied

C) College data to copy:
  - id: (original ID from current DB)
  - code: COE
  - codeNormalized: coe
  - name: College of Engineering
  - shortName: COE
  - isActive: true

D) Department data to copy:
  - id: (original ID from current DB, under COE college)
  - collegeId: (COE college ID)
  - code: COE
  - name: (COE department name)
  - isActive: true

E) Program data to copy:
  - id: (original ID from current DB, under COE department)
  - departmentId: (COE department ID)
  - code: BSCE, BSCOE, or BSECE
  - name: (program names)
  - credential: Bachelor Degree
  - durationYears: 4
  - termsPerYear: 2
  - isActive: true

F) Curriculum data to copy:
  - id: (original ID from current DB)
  - programId: (one of the 3 real program IDs)
  - code: curriculum code
  - name: curriculum name
  - version: 1 (or original)
  - effectiveFromYear: (original)
  - effectiveToYear: (if applicable)
  - status: DRAFT or ACTIVE
  - isActive: true

G) Subject data to copy:
  - id: (original ID from current DB)
  - departmentId: (COE department ID)
  - code: subject code
  - title: subject title
  - description: (if any)
  - defaultCreditUnits: (if any)
  - defaultLectureHours: (default 0)
  - defaultLaboratoryHours: (default 0)
  - status: ACTIVE
  - isActive: true

H) AcademicYear data to copy:
  - id: (original ID from current DB)
  - code: AY-2026-2027
  - name: Academic Year 2026–2027
  - startsOn: 2026-08-01
  - endsOn: 2027-05-31
  - status: ACTIVE

I) AcademicTerm data to copy:
  - id: (original ID from current DB)
  - academicYearId: (AY-2026-2027 ID)
  - code: AY-2026-2027-1ST, AY-2026-2027-2ND
  - name: 1st Semester 2026–2027, 2nd Semester 2026–2027
  - termNumber: 1, 2
  - startsOn: 2026-08-01, 2027-01-10
  - endsOn: 2026-12-20, 2027-05-31
  - status: ACTIVE, PLANNED

================================================================================
4. VERIFICATION CHECKLIST
================================================================================

After copying data to new DB, verify:

[ ] New DB created: alpha_cor_jesu_sms
[ ] All 27 migrations applied successfully
[ ] Naldrelle user preserved (id: 2c51f900-0973-4176-b7fa-712dc297587c)
[ ] Naldrelle has administrator role (primary)
[ ] 14 system roles exist (all isSystem=true)
[ ] College of Engineering (code=COE) preserved
[ ] COE department preserved
[ ] 3 real programs (BSCE, BSCOE, BSECE) preserved
[ ] Curricula under the 3 real programs preserved
[ ] Subjects under COE department preserved
[ ] Subject prerequisites/corequisites preserved
[ ] AcademicYear AY-2026-2027 preserved
[ ] AcademicTerms (1st/2nd semester) preserved
[ ] DocumentType reference data preserved (5 types)
[ ] RequestType reference data preserved (8 types)
[ ] All enum definitions intact
[ ] NO test users present (no .demo, test_, deleted-, etc.)
[ ] NO test departments (TSTD- prefix) present
[ ] NO test programs (TSP- prefix) present
[ ] NO test curricula present
[ ] NO test subjects present
[ ] NO enrollment records present
[ ] NO grade records present
[ ] NO financial transaction records present
[ ] NO club data present
[ ] NO audit log records present
[ ] NO session records present
[ ] NO password reset token records present
[ ] Student number sequences initialized fresh
[ ] Naldrelle can successfully login to the portal
[ ] FK integrity: all foreign keys reference valid records
[ ] Current DB (cor_jesu_sms) remains completely unchanged

================================================================================
5. SAFETY MEASURES
================================================================================

[ ] Before any command, print current DB and target DB identity
[ ] Abort if target DB equals current DB
[ ] Never run DROP/RESET against current DB
[ ] Never use TRUNCATE CASCADE on current DB
[ ] Stop on any migration/import error
[ ] Current DB (cor_jesu_sms) remains as backup/archive - NO modifications
[ ] ALPHA_DATABASE_URL used separately from DATABASE_URL
[ ] TEST_DATABASE_URL must abort if equals DATABASE_URL or ALPHA_DATABASE_URL

================================================================================
APPROVAL REQUESTED
================================================================================

Do you approve executing this NEW DATABASE CREATION PLAN?

Type "CREATE NEW DB" to confirm, or specify any changes you want made to the plan
before execution.

This plan will:
1. Create NEW database: alpha_cor_jesu_sms
2. Run all 27 migrations against the NEW DB only
3. Copy ONLY master/reference data (no test/demo/operational data)
4. Copy ONLY Naldrelle admin + administrator role
5. Keep current DB (cor_jesu_sms) completely unchanged as backup
6. NOT run any demo/development seeders