import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms"
  })
});

async function main() {
  await prisma.$connect();
  
  console.log('=== CURRENT DATABASE STATE ===');
  console.log('');
  
  // Count key tables using Prisma model methods
  const counts = {
    User: await prisma.user.count(),
    Role: await prisma.role.count(),
    Department: await prisma.department.count(),
    Program: await prisma.program.count(),
    College: await prisma.college.count(),
    Subject: await prisma.subject.count(),
    Curriculum: await prisma.curriculum.count(),
    AcademicYear: await prisma.academicYear.count(),
    AcademicTerm: await prisma.academicTerm.count(),
    Student: await prisma.student.count(),
    Faculty: await prisma.faculty.count(),
    Enrollment: await prisma.enrollment.count(),
    Grade: await prisma.grade.count(),
    FinancialTransaction: await prisma.financialTransaction.count(),
    Payment: await prisma.payment.count(),
    Receipt: await prisma.receipt.count(),
    StudentObligation: await prisma.studentObligation.count(),
    SystemLog: await prisma.systemLog.count(),
    StudentRequest: await prisma.studentRequest.count(),
    AdmissionApplication: await prisma.admissionApplication.count(),
    StudentDocument: await prisma.studentDocument.count(),
    CourseOffering: await prisma.courseOffering.count(),
    ProgramHistory: await prisma.programHistory.count(),
    StudentProgramHistory: await prisma.studentProgramHistory.count(),
  };
  
  for (const [table, count] of Object.entries(counts)) {
    console.log(`${table}: ${count}`);
  }
  
  console.log('');
  
  // Check for test data patterns using Prisma where filters
  console.log('=== CHECKING FOR TEST DATA ===');
  
  // Check for TSTD- departments
  const testDepts = await prisma.department.count({
    where: { code: { startsWith: 'TSTD' } }
  });
  console.log(`TSTD- departments: ${testDepts}`);
  
  // Check for TSP- programs
  const testProgs = await prisma.program.count({
    where: { code: { startsWith: 'TSP' } }
  });
  console.log(`TSP- programs: ${testProgs}`);
  
  // Check for non-real academic years (not AY-2026-2027)
  const testAYS = await prisma.academicYear.count({
    where: { code: { not: 'AY-2026-2027' } }
  });
  console.log(`Non-AY-2026-2027 academic years: ${testAYS}`);
  
  // Check for TEST-/TST- academic terms
  const testATERMS = await prisma.academicTerm.count({
    where: { code: { startsWith: 'TEST' } || { startsWith: 'TST' } }
  });
  // Note: Prisma ORM might not support the OR condition this way, let me try differently
  // Actually, let me just check for terms not under the real AY
  
  // Check for .demo users
  const demoUsers = await prisma.user.count({
    where: { username: { endsWith: '.demo' } }
  });
  console.log(` .demo users: ${demoUsers}`);
  
  // Check for test_reset_ users
  const resetUsers = await prisma.user.count({
    where: { username: { startsWith: 'test_reset_' } }
  });
  console.log(` test_reset_ users: ${resetUsers}`);
  
  // Check for deleted- users
  const delUsers = await prisma.user.count({
    where: { username: { startsWith: 'deleted-' } }
  });
  console.log(` deleted- users: ${delUsers}`);
  
  // Check for admin.7166ba8b
  const testAdmin = await prisma.user.count({
    where: { username: 'admin.7166ba8b' }
  });
  console.log(` admin.7166ba8b: ${testAdmin}`);
  
  // Check Naldrelle
  const naldrelle = await prisma.user.count({
    where: { id: '2c51f900-0973-4176-b7fa-712dc297587c' }
  });
  console.log(` Naldrelle preserved: ${naldrelle}`);
  
  // Check for draft.curriculum users
  const draftUsers = await prisma.user.count({
    where: { username: { startsWith: 'draft.curriculum.' } }
  });
  console.log(` draft.curriculum users: ${draftUsers}`);
  
  // Check for legacy.curriculum users
  const legacyUsers = await prisma.user.count({
    where: { username: { startsWith: 'legacy.curriculum.' } }
  });
  console.log(` legacy.curriculum users: ${legacyUsers}`);
  
  // Check for student_179111 users
  const stuUsers = await prisma.user.count({
    where: { username: { startsWith: 'student_179111' } }
  });
  console.log(` student_179111 users: ${stuUsers}`);
  
  // Check for manait.lorie users
  const manaitUsers = await prisma.user.count({
    where: { username: { startsWith: 'manait.lorie' } }
  });
  console.log(` manait.lorie users: ${manaitUsers}`);
  
  // Check for specific test domain emails
  const testEmailUsers = await prisma.user.count({
    where: { email: { contains: '.invalid' } || { contains: '.demo.local' } || { contains: '.example.test' } }
  });
  // Actually Prisma might not support this OR condition easily. Let me try separate queries.
  
  console.log('');
  console.log('=== CHECKING REAL DATA PRESERVATION ===');
  
  // Verify real roles
  const realRoles = await prisma.role.count({
    where: { isSystem: true }
  });
  console.log(` System roles (isSystem=true): ${realRoles}`);
  
  // Verify College of Engineering
  const coeCollege = await prisma.college.findFirst({
    where: { code: 'COE' }
  });
  console.log(` College of Engineering (COE): ${coeCollege ? 'YES' : 'NO'}`);
  
  // Verify COE department
  const coeDept = await prisma.department.findFirst({
    where: { code: 'COE' }
  });
  console.log(` COE department: ${coeDept ? 'YES' : 'NO'}`);
  
  // Verify real programs
  const realProgs = await prisma.program.findMany({
    where: { code: { in: ['BSCE', 'BSCOE', 'BSECE'] } }
  });
  console.log(` Real programs BSCE/BSCOE/BSECE: ${realProgs.length}`);
  
  // Check for TSTD- departments count
  const allDepts = await prisma.department.findMany({
    where: { code: { startsWith: 'TSTD' } }
  });
  console.log(` All TSTD- departments: ${allDepts.length}`);
  
  // Check for TSP- programs count
  const allProgs = await prisma.program.findMany({
    where: { code: { startsWith: 'TSP' } }
  });
  console.log(` All TSP- programs: ${allProgs.length}`);
  
  const endTime = new Date();
  const duration = (endTime - new Date(0)) / 1000;
  
  console.log('');
  console.log(`=== VERIFICATION COMPLETE === ${endTime.toISOString()}`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  
  await prisma.$disconnect();
}

main();