var { PrismaClient } = require('@prisma/client');
var { PrismaPg } = require('@prisma/adapter-pg');

var srcDbUrl = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms";
var alphaDbUrl = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";

var srcPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: srcDbUrl }) });
var alphaPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: alphaDbUrl }) });

async function main() {
  await srcPrisma.$connect();
  await alphaPrisma.$connect();
  console.log('Connected.\n');
  
  // Clear alpha DB
  var models = ['documentType','requestType','role','permission','college','department','program','curriculum','subject','academicYear','academicTerm','user','userRole'];
  for (var m of models) {
    try { await alphaPrisma[m].deleteMany({}); console.log('Cleared:', m); }
    catch (e) { console.log('Skip:', m, e.message.substring(20)); }
  }
  
  // Copy master data
  console.log('\nCopying master data...\n');
  
  // DocumentTypes
  var dt = await srcPrisma.documentType.findMany();
  await alphaPrisma.documentType.createMany({ data: dt }); console.log('DocumentTypes: ' + dt.length);
  
  // RequestTypes
  var rt = await srcPrisma.requestType.findMany();
  await alphaPrisma.requestType.createMany({ data: rt }); console.log('RequestTypes: ' + rt.length);
  
  // Roles (system)
  var rl = await srcPrisma.role.findMany({ where: { isSystem: true } });
  await alphaPrisma.role.createMany({ data: rl }); console.log('Roles: ' + rl.length);
  
  // Permissions (system)
  var pm = await srcPrisma.permission.findMany({ where: { isSystem: true } });
  await alphaPrisma.permission.createMany({ data: pm }); console.log('Permissions: ' + pm.length);
  
  // College
  var cl = await srcPrisma.college.findFirst({ where: { code: 'COE' } });
  await alphaPrisma.college.create({ data: cl }); console.log('College: ' + (cl ? '1' : '0'));
  
  // Department
  var dtpt = await srcPrisma.department.findFirst({ where: { code: 'COE' } });
  await alphaPrisma.department.create({ data: dtpt }); console.log('Department: ' + (dtpt ? '1' : '0'));
  
  // Programs
  var pgms = await srcPrisma.program.findMany({ where: { code: { in: ['BSCE','BSCOE','BSECE'] } } });
  await alphaPrisma.program.createMany({ data: pgms }); console.log('Programs: ' + pgms.length);
  
  // Curricula
  var cur = await srcPrisma.curriculum.findMany({ where: { programId: { in: pgms.map(p => p.id) } } });
  await alphaPrisma.curriculum.createMany({ data: cur }); console.log('Curricula: ' + cur.length);
  
  // Subjects
  var sbj = await srcPrisma.subject.findMany({ where: { departmentId: { equals: dtpt.id } } });
  await alphaPrisma.subject.createMany({ data: sbj }); console.log('Subjects: ' + sbj.length);
  
  // AcademicYear
  var ay = await srcPrisma.academicYear.findFirst({ where: { code: 'AY-2026-2027' } });
  await alphaPrisma.academicYear.create({ data: ay }); console.log('AcademicYear: ' + (ay ? '1' : '0'));
  
  // AcademicTerms
  var terms = await srcPrisma.academicTerm.findMany({ where: { academicYearId: { equals: ay.id } } });
  await alphaPrisma.academicTerm.createMany({ data: terms }); console.log('AcademicTerms: ' + terms.length);
  
  // Naldrelle + admin
  var existing = await alphaPrisma.user.findUnique({ where: { id: '2c51f900-0973-4176-b7fa-712dc297587c' } });
  if (!existing) {
    await alphaPrisma.user.create({
      data: { id: '2c51f900-0973-4176-b7fa-712dc297587c', username: 'Naldrelle', usernameNormalized: 'naldrelle', email: null, passwordHash: '', status: 'ACTIVE', mustChangePassword: true, failedLoginCount: 0, lastFailedAt: null, lockUntil: null, authorizationVersion: 1, passwordChangedAt: null, lastLoginAt: null, deletedAt: null, createdAt: new Date(), updatedAt: new Date }
    });
    console.log('Naldrelle user created');
  }
  var ar = await alphaPrisma.role.findFirst({ where: { slug: 'administrator' } });
  if (ar) {
    await alphaPrisma.userRole.create({ data: { userId: '2c51f900-0973-4176-b7fa-712dc297587c', roleId: ar.id, isPrimary: true, assignedAt: new Date() } });
    console.log('Naldrelle administrator role assigned');
  }
  
  console.log('\n=== MASTER DATA COPY COMPLETE ===');
  console.log('Current DB unchanged as backup');
  
  await srcPrisma.$disconnect();
  await alphaPrisma.$disconnect();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });