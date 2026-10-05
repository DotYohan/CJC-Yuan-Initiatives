import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  user: 'cjc_app',
  password: 'your_secure_password',
  database: 'alpha_cor_jesu_sms'
});

const tables = [
  '"Session"', '"LoginAttempt"', '"PasswordResetToken"', '"AuditLog"', '"UserRole"',
  '"Student"', '"Faculty"', '"StudentDocument"', '"DocumentVerificationHistory"',
  '"AdmissionApplication"', '"EnrollmentStatusHistory"', '"GradeHistory"', '"ClearanceItem"',
  '"Assessment"', '"Invoice"', '"PaymentHistory"', '"FinancialEntry"', '"PaymentLogEvent"',
  '"CurriculumSubject"', '"SubjectRequirement"', '"EnrollmentApplication"', '"EnrollmentPeriod"',
  '"GradingPeriod"', '"ClearanceCycle"', '"StudentStatusHistory"', '"SystemLog"',
  '"UserCollegeAssignment"', '"UserDepartmentAssignment"', '"UserProgramAssignment"',
  '"ClubClearance"', '"ClubClearanceAudit"', '"ClubAnnouncement"', '"ClubOfficer"',
  '"ClubDocument"'
];

const truncateSQL = `TRUNCATE ${tables.join(', ')} CASCADE`;

// Also truncate remaining tables
const moreTables = '"Program"', '"College"', '"Department"', '"Curriculum"', '"Subject"', '"AcademicYear"', '"AcademicTerm"', '"Role"', '"Permission"';
const moreSQL = `TRUNCATE ${moreTables.join(', ')} CASCADE`;

pool.query(truncateSQL + ' ' + moreSQL, (err, res) => {
  if (err) {
    console.error('Error truncating:', err);
  } else {
    console.log('Tables truncated successfully, total rows affected: ' + (res.rowCount || 0));
  }
  pool.end();
});