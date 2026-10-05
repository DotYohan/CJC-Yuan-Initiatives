var { PrismaClient } = require('@prisma/client');
var { PrismaPg } = require('@prisma/adapter-pg');

// Source DB and Target DB connection strings
var srcDbUrl = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms";
var alphaDbUrl = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";

// Create two Prisma clients with different connection strings
var srcPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: srcDbUrl })
});

var alphaPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: alphaDbUrl })
});

async function main() {
  console.log('Connecting to both databases...\n');
  
  await srcPrisma.$connect();
  await alphaPrisma.$connect();
  
  // Step 1: Clear all data in alpha DB tables using deleteMany
  console.log('Clearing alpha DB tables...');
  var alphaTables = [
    'user_roles', 'users', 'student_obligations', 'payment_transactions', 'receipts',
    'payment_logs', 'invoices', 'grades', 'grade_history', 'assessment_items',
    'clearance_cycles', 'student_clearances', 'clearance_items', 'clearance_requirements',
    'enrollment_status_history', 'grade_history', 'student_status_history', 'system_logs',
    'user_college_assignments', 'user_department_assignments', 'user_program_assignments',
    'club_clearances', 'club_clearance_audits', 'club_announcements', 'club_officers', 'club_documents',
    'faculty_specializations', 'program_history', 'program_head_assignments', 'student_curriculum_assignments',
    'faculty_department_assignments', 'faculty_employment', 'enrollment_items', 'payment_types',
    'student_request_status_history', 'admission_application_status_history', 'student_requests',
    'enrollment_status_history', 'document_types', 'request_types', 'roles', 'permissions',
    'colleges', 'departments', 'programs', 'curricula', 'subjects', 'academic_years', 'academic_terms',
    '_prisma_migrations'
  ];
  
  for (var table of alphaTables) {
    try {
      await alphaPrisma.$executeRaw`DELETE FROM ${table}`;
      console.log('  Cleared: ' + table);
    } catch (e) {
      console.log('  Skip: ' + table + ' (', e.message.substring(0, 50) + ')');
    }
  }
  
  // Step 2: Copy master data
  console.log('\nStarting master data copy to alpha_cor_jesu_sms...\n');
  
  try {
    // 1. DocumentTypes
    console.log('Copying DocumentTypes...');
    var docTypes = await srcPrisma.documentType.findMany();
    await alphaPrisma.documentType.createMany({ data: docTypes });
    console.log('  DocumentTypes copied: ' + docTypes.length);
    
    // 2. RequestTypes
    console.log('Copying RequestTypes...');
    var reqTypes = await srcPrisma.requestType.findMany();
    await alphaPrisma.requestType.createMany({ data: reqTypes });
    console.log('  RequestTypes copied: ' + reqTypes.length);
    
    // 3. Roles (system roles only)
    console.log('Copying Roles (system roles only)...');
    var roles = await srcPrisma.role.findMany({ where: { isSystem: true } });
    await alphaPrisma.role.createMany({ data: roles });
    console.log('  Roles copied: ' + roles.length);
    
    // 4. Permissions (system permissions)
    console.log('Copying Permissions (system permissions)...');
    var perms = await srcPrisma.permission.findMany({ where: { isSystem: true } });
    await alphaPrisma.permission.createMany({ data: perms });
    console.log('  Permissions copied: ' + perms.length);
    
    // 5. College (COE)
    console.log('Copying College (COE)...');
    var college = await srcPrisma.college.findFirst({ where: { code: 'COE' } });
    await alphaPrisma.college.create({ data: college });
    console.log('  College copied: ' + (college ? '1' : '0'));
    
    // 6. Department (COE)
    console.log('Copying COE Department...');
    var dept = await srcPrisma.department.findFirst({ where: { code: 'COE' } });
    await alphaPrisma.department.create({ data: dept });
    console.log('  Department copied: ' + (dept ? '1' : '0'));
    
    // 7. Programs (BSCE, BSCOE, BSECE)
    console.log('Copying 3 real programs (BSCE, BSCOE, BSECE)...');
    var progs = await srcPrisma.program.findMany({ where: { code: { in: ['BSCE', 'BSCOE', 'BSECE'] } } });
    await alphaPrisma.program.createMany({ data: progs });
    console.log('  Programs copied: ' + progs.length);
    
    // 8. Curricula under the 3 real programs
    console.log('Copying Curricula under real programs...');
    var curricula = await srcPrisma.curriculum.findMany({ 
      where: { programId: { in: progs.map(p => p.id) } } 
    });
    await alphaPrisma.curriculum.createMany({ data: curricula });
    console.log('  Curricula copied: ' + curricula.length);
    
    // 9. Subjects under COE department
    console.log('Copying Subjects under COE department...');
    var subjects = await srcPrisma.subject.findMany({ 
      where: { departmentId: { equals: dept.id } } 
    });
    await alphaPrisma.subject.createMany({ data: subjects });
    console.log('  Subjects copied: ' + subjects.length);
    
    // 10. AcademicYear AY-2026-2027
    console.log('Copying AcademicYear AY-2026-2027...');
    var ay = await srcPrisma.academicYear.findFirst({ where: { code: 'AY-2026-2027' } });
    await alphaPrisma.academicYear.create({ data: ay });
    console.log('  AcademicYear copied: ' + (ay ? '1' : '0'));
    
    // 11. AcademicTerms
    console.log('Copying AcademicTerms...');
    var terms = await srcPrisma.academicTerm.findMany({ 
      where: { academicYearId: { equals: ay.id } } 
    });
    await alphaPrisma.academicTerm.createMany({ data: terms });
    console.log('  AcademicTerms copied: ' + terms.length);
    
    // 12. Naldrelle + administrator role assignment
    console.log('Copying Naldrelle + administrator role assignment...');
    
    // Check if Naldrelle exists in alpha DB
    var existingNaldrelle = await alphaPrisma.user.findUnique({ where: { id: '2c51f900-0973-4176-b7fa-712dc297587c' } });
    
    if (!existingNaldrelle) {
      // Create Naldrelle user in alpha DB
      await alphaPrisma.user.create({
        data: {
          id: '2c51f900-0973-4176-b7fa-712dc297587c',
          username: 'Naldrelle',
          email: null,
          passwordHash: '',
          status: 'ACTIVE',
          mustChangePassword: true,
          failedLoginCount: 0,
          lastFailedAt: null,
          lockUntil: null,
          authorizationVersion: 1,
          passwordChangedAt: null,
          lastLoginAt: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date
        }
      });
      console.log('  Naldrelle user created in alpha DB');
    } else {
      console.log('  Naldrelle user already exists in alpha DB');
    }
    
    // Get the administrator role ID from alpha DB
    var adminRole = await alphaPrisma.role.findFirst({ where: { slug: 'administrator' } });
    
    if (adminRole) {
      // Assign administrator role to Naldrelle
      await alphaPrisma.userRole.create({
        data: {
          userId: '2c51f900-0973-4176-b7fa-712dc297587c',
          roleId: adminRole.id,
          isPrimary: true,
          assignedAt: new Date()
        }
      });
      console.log('  Naldrelle administrator role assigned');
    } else {
      console.log('  Administrator role not found in alpha DB');
    }
    
    console.log('\n=== MASTER DATA COPY COMPLETE ===');
    console.log('Current DB (cor_jesu_sms) remains unchanged as backup');
    
  } catch (e) {
    console.error('Error during data copy:', e);
  } finally {
    await srcPrisma.$disconnect();
    await alphaPrisma.$disconnect();
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});