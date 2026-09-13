# Phase 4 - Student Admission Signup

## Implemented scope

The homepage now links `Enrollment` to `/signup.html`. The signup flow collects
the applicant's name, birthday, personal email, mobile number, program, and
password. The server creates the existing `User`, `Student`, and
`AdmissionApplication` records in one serializable transaction and assigns the
existing `student` role.

Student numbers use `001-YYYY-#####`. The new `student_number_sequences` table
stores a monotonic per-year counter, so issued numbers are not reused. School
emails use the normalized `lastname.firstname@g.cjc.edu.ph` format with numeric
suffixes for duplicates.

New accounts are active, linked to `/portal/student`, and require a password
change before protected account services. Passwords are hashed with the
existing scrypt implementation; plaintext passwords are never stored.

## Schema and migration

- `StudentNumberSequence` / `student_number_sequences`: one row per admission
  year, with a locked counter and positive-next-number constraint.
- Existing `User`, `Student`, `AdmissionApplication`, role, and term tables are
  reused without authentication-table changes.
- Migration: `20260823040000_add_student_number_sequences`.

## API

- `GET /api/v1/admission/programs`
- `POST /api/v1/admission/register`

Registration uses the existing anonymous CSRF session and exact-origin checks.

## Local testing

```powershell
npm.cmd run seed:term
npm.cmd start
```

Open `http://localhost:3000`, select **Enrollment**, complete the form, and
sign in with the generated school email. The account will land in the Student
portal and must change its password before using protected services.

The full subject enrollment, payment verification, document submission,
approval, clearance processing, assessment generation, and communication
workflows remain subsequent implementation phases. Their existing normalized
models are preserved as the next integration surfaces.