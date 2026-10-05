import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const alphaUrl = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";
  const srcUrl = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms";
  
  const src = new PrismaClient({ adapter: new PrismaPg({ connectionString: srcUrl }) });
  const alpha = new PrismaClient({ adapter: new PrismaPg({ connectionString: alphaUrl }) });
  
  await src.$connect();
  await alpha.$connect();
  
  // Truncate all tables in alpha DB
  const tables = [
    "Session", "LoginAttempt", "PasswordResetToken", "AuditLog", "UserRole",
    "Student", "Faculty", "StudentDocument", "DocumentVerificationHistory",
    "AdmissionApplication", "EnrollmentStatusHistory", "GradeHistory", "ClearanceItem",
    "Assessment", "Invoice", "PaymentHistory", "FinancialEntry", "PaymentLogEvent",
    "CurriculumSubject", "SubjectRequirement", "EnrollmentApplication", "EnrollmentPeriod",
    "GradingPeriod", "ClearanceCycle", "StudentStatusHistory", "SystemLog",
    "UserCollegeAssignment", "UserDepartmentAssignment", "UserProgramAssignment",
    "ClubClearance", "ClubClearanceAudit", "ClubAnnouncement", "ClubOfficer",
    "ClubDocument", "Program", "College", "Department", "Curriculum", "Subject",
    "AcademicYear", "AcademicTerm", "Role", "Permission"
  ];
  
  for (const table of tables) {
    try {
      await alpha.$executeRaw`TRUNCATE "${table}" CASCADE`;
      console.log(`Truncated ${table}`);
    } catch (e) {
      console.log(`Could not truncate ${table}: ${e.message}`);
    }
  }
  
  console.log("Truncation complete");
  
  // Now copy master data
  // 1. DocumentTypes
  const docTypes = await src.documentType.findMany();
  await alpha.documentType.createMany({ data: docTypes });
  console.log(`DocumentTypes: ${docTypes.length} copied`);
  
  // 2. RequestTypes
  const reqTypes = await src.requestType.findMany();
  await alpha.requestType.createMany({ data: reqTypes });
  console.log(`RequestTypes: ${reqTypes.length} copied`);
  
  // 3. Roles (system only)
  const roles = await src.role.findMany({ where: { isSystem: true } });
  await alpha.role.createMany({ data: roles });
  console.log(`Roles: ${roles.length} copied`);
  
  // 3. Permissions (system only)
  const perms = await src.permission.findMany({ where: { isSystem: true } });
  await alpha.permission.createMany({ data: perms });
  console.log(`Permissions: ${perms.length} copied`);
  
  // 4. College (COE)
  const college = await src.college.findFirst({ where: { code: 'COE' } });
  await alpha.college.create({ data: college });
  console.log(`College: ${college ? '1' : '0'} copied`);
  
  // 5. Department (COE)
  const dept = await src.department.findFirst({ where: { code: 'COE' } });
  await alpha.department.create({ data: dept });
  console.log(`Department: ${dept ? '1' : '0'} copied`);
  
  // 5. Programs (BSCE, BSCOE, BSECE)
  const progs = await src.program.findMany({ where: { code: { in: ['BSCE', 'BSCOE', 'BSECE'] } } });
  await alpha.program.createMany({ data: progs });
  console.log(`Programs: ${progs.length} copied`);
  
  // 5. Curricula under the 3 programs
  const curricula = await src.curriculum.findMany({ where: { programId: { in: progs.map(p => p.id) } } });
  await alpha.curriculum.createMany({ data: curricula });
  console.log(`Curricula: ${curricula.length} copied`);
  
  // 6. Subjects under COE department
  const subjects = await src.subject.findMany({ where: { departmentId: { equals: dept.id } } });
  await alpha.subject.createMany({ data: subjects });
  console.log(`Subjects: ${subjects.length} copied`);
  
  // 6. AcademicYear AY-2026-2027
  const ay = await src.academicYear.findFirst({ where: { code: 'AY-2026-2027' } });
  await alpha.academicYear.create({ data: ay });
  console.log(`AcademicYear: ${ay ? '1' : '0'} copied`);
  
  // 7. AcademicTerms
  const terms = await src.academicTerm.findMany({ where: { academicYearId: { equals: ay.id } } });
  await alpha.academicTerm.createMany({ data: terms });
  console.log(`AcademicTerms: ${terms.length} copied`);
  
  // 8. Naldrelle + administrator role
  const naldrelle = await src.user.findUnique({ where: { id: '2c51f900-0973-4176-b7fa-712dc297587c' } });
  if (naldrelle) {
    const created = await alpha.user.create({
      data: {
        id: naldrelle.id,
        username: naldrelle.username,
        email: naldrelle.email,
        passwordHash: naldrelle.passwordHash,
        status: naldrelle.status,
        mustChangePassword: naldrelle.mustChangePassword,
        failedLoginCount: naldrelle.failedLoginCount,
        lastFailedAt: naldrelle.lastFailedAt,
        lockUntil: naldrelle.lockUntil,
        authorizationVersion: naldrelle.authorizationVersion,
        passwordChangedAt: naldrelle.passwordChangedAt,
        lastLoginAt: naldrelle.lastLoginAt,
        deletedAt: naldrelle.deletedAt,
        createdAt: naldrelle.createdAt,
        updatedAt: naldrelle.updatedAt
      }
    });
    
    const adminRole = await alpha.role.findFirst({ where: { slug: 'administrator' } });
    if (adminRole) {
      await alpha.userRole.create({
        data: {
          userId: created.id,
          roleId: adminRole.id,
          isPrimary: true,
          assignedAt: new Date()
        }
      });
      console.log(`Naldrelle + administrator role: assigned`);
    }
  }
  
  console.log("\\n=== MASTER DATA COPY COMPLETE ===");
  await src.$disconnect();
  await alpha.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
"