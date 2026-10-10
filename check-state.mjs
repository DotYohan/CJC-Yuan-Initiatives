import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const colleges = await prisma.college.findMany({
      select: { id: true, code: true, name: true }
    });
    console.log('Colleges:', colleges.length);
    colleges.forEach(c => console.log(' - ' + c.code + ': ' + c.name));
  
    const departments = await prisma.department.findMany({
      include: { college: true }
    });
    console.log('Departments:', departments.length);
    departments.forEach(d => console.log(' - ' + d.code + ': ' + d.name + ' (College: ' + (d.college?.code || 'null') + ')'));
  
    const programs = await prisma.program.findMany({
      include: { department: true }
    });
    console.log('Programs:', programs.length);
    programs.forEach(p => console.log(' - ' + p.code + ': ' + p.name + ' (Dept: ' + (p.department?.code || 'null') + ', College: ' + (p.department?.college?.code || 'null') + ')'));
  
    const subjects = await prisma.subject.findMany({
      take: 20,
      include: { department: true }
    });
    console.log('Subjects (first 20):', subjects.length);
    subjects.forEach(s => console.log(' - ' + s.code + ': ' + s.title + ' (Dept: ' + (s.department?.code || 'null') + ')'));
  
    const curricula = await prisma.curriculum.findMany({
      include: { program: true }
    });
    console.log('Curricula:', curricula.length);
    curricula.forEach(c => console.log(' - ' + c.code + ' v' + c.version + ': ' + c.name + ' (Program: ' + (c.program?.code || 'null') + ')'));
  
    const curriculumSubjects = await prisma.curriculumSubject.findMany({
      include: { curriculum: true, subject: true }
    });
    console.log('Curriculum Subjects:', curriculumSubjects.length);
    curriculumSubjects.slice(0, 20).forEach(cs => console.log(' - ' + (cs.subject?.code || 'null') + ' in ' + (cs.curriculum?.code || 'null') + ' yr' + cs.yearLevel + ' term' + cs.termNumber));
  
    const requirements = await prisma.subjectRequirement.findMany({
      take: 30
    });
    console.log('Subject Requirements (first 30):', requirements.length);
    requirements.forEach(r => console.log(' - ' + (r.subject?.code || 'null') + ' -> ' + (r.requiredSubject?.code || 'null') + ' [' + r.type + ']'));
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();