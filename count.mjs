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
    
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    const roleCount = await prisma.role.count();
    console.log('Role count:', roleCount);
    
    const departmentCount = await prisma.department.count();
    console.log('Department count:', departmentCount);
    
    const programCount = await prisma.program.count();
    console.log('Program count:', programCount);
    
    const collegeCount = await prisma.college.count();
    console.log('College count:', collegeCount);
    
    const studentCount = await prisma.student.count();
    console.log('Student count:', studentCount);
    
    const facultyCount = await prisma.faculty.count();
    console.log('Faculty count:', facultyCount);
    
    const subjectCount = await prisma.subject.count();
    console.log('Subject count:', subjectCount);
    
    const curriculumCount = await prisma.curriculum.count();
    console.log('Curriculum count:', curriculumCount);
    
    const academicYearCount = await prisma.academicYear.count();
    console.log('AcademicYear count:', academicYearCount);
    
    const academicTermCount = await prisma.academicTerm.count();
    console.log('AcademicTerm count:', academicTermCount);
    
    console.log('\nAll counts retrieved successfully.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();