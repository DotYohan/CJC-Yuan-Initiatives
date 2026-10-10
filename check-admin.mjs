import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms"
  })
});

async function main() {
  try {
    await prisma.$connect();
    
    // Check Naldrelle user (using usernameNormalized)
    const user = await prisma.user.findUnique({ 
      where: { usernameNormalized: "naldrelle" }, 
      select: { id: true, username: true, email: true, status: true } 
    });
    console.log('Naldrelle User:', user);
    
    if (user) {
      // Check roles
      const userRoles = await prisma.userRole.findMany({ 
        where: { userId: user.id }, 
        include: { role: true } 
      });
      console.log('Naldrelle Roles:', userRoles.map(r => ({ slug: r.role.slug, name: r.role.name, isSystem: r.role.isSystem, isPrimary: r.isPrimary })));
      
      // Check program assignments
      const progAssignments = await prisma.userProgramAssignment.findMany({ 
        where: { userId: user.id }, 
        include: { program: true } 
      });
      console.log('Naldrelle Program Assignments:');
      progAssignments.forEach(a => console.log('  -', a.program.code, a.program.name, a.program.department?.code));
      
      // Check department assignments
      const deptAssignments = await prisma.userDepartmentAssignment.findMany({ 
        where: { userId: user.id }, 
        include: { department: true } 
      });
      console.log('Naldrelle Department Assignments:');
      deptAssignments.forEach(a => console.log('  -', a.department.code, a.department.name, a.department.college?.code));
      
      // Check college assignments
      const collegeAssignments = await prisma.userCollegeAssignment.findMany({ 
        where: { userId: user.id }, 
        include: { college: true } 
      });
      console.log('Naldrelle College Assignments:');
      collegeAssignments.forEach(a => console.log('  -', a.college.code, a.college.name));
      
      // Check all user data counts
      const enrollmentCount = await prisma.enrollment.count({ where: { student: { userId: user.id } } });
      const gradeCount = await prisma.grade.count({ where: { student: { userId: user.id } } });
      const docCount = await prisma.studentDocument.count({ where: { student: { userId: user.id } } });
      const finCount = await prisma.financialTransaction.count({ where: { recordedByUserId: user.id } });
      const obligationCount = await prisma.studentObligation.count({ where: { student: { userId: user.id } } });
      const requestCount = await prisma.studentRequest.count({ where: { submittedByUserId: user.id } });
      
      console.log('Naldrelle data counts:');
      console.log('  Enrollments:', enrollmentCount);
      console.log('  Grades:', gradeCount);
      console.log('  Documents:', docCount);
      console.log('  Financial transactions:', finCount);
      console.log('  Obligations:', obligationCount);
      console.log('  Requests:', requestCount);
    }
    
    // Also check the other admin account
    const adminUser = await prisma.user.findUnique({ 
      where: { usernameNormalized: "admin.7166ba8b" }, 
      select: { id: true, username: true, email: true, status: true } 
    });
    console.log('\nadmin.7166ba8b User:', adminUser);
    if (adminUser) {
      const adminRoles = await prisma.userRole.findMany({ 
        where: { userId: adminUser.id }, 
        include: { role: true } 
      });
      console.log('admin.7166ba8b Roles:', adminRoles.map(r => ({ slug: r.role.slug, name: r.role.name, isSystem: r.role.isSystem, isPrimary: r.isPrimary })));
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();