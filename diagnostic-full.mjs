import { PrismaClient } from "@prisma/client";
import { createDatabase } from "./server/db.mjs";

process.env.DATABASE_URL = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";

async function main() {
  const database = createDatabase();
  
  try {
    console.log("=== FULL DATABASE DIAGNOSTIC ===\n");
    
    // 1. Colleges
    console.log("1. COLLEGES:");
    const colleges = await database.college.findMany({
      select: { id: true, code: true, name: true }
    });
    colleges.forEach(c => console.log("   - " + c.code + ": " + c.name));
    
    // 2. Departments
    console.log("\n2. DEPARTMENTS:");
    const departments = await database.department.findMany({
      include: { college: true }
    });
    departments.forEach(d => console.log("   - " + d.code + ": " + d.name + " (College: " + (d.college?.code || 'null') + ")"));
    
    // 3. Programs
    console.log("\n3. PROGRAMS:");
    const programs = await database.program.findMany({
      include: { department: true }
    });
    programs.forEach(p => console.log("   - " + p.code + ": " + p.name + " (Dept: " + (p.department?.code || 'null') + ", College: " + (p.department?.college?.code || 'null') + ")"));
    
    // 4. Subjects (sample)
    console.log("\n4. SUBJECTS (sample - first 50):");
    const subjects = await database.subject.findMany({
      take: 50,
      include: { department: true }
    });
    const deptCounts = {};
    subjects.forEach(s => {
      const dc = s.department?.code || 'no-dept';
      deptCounts[dc] = (deptCounts[dc] || 0) + 1;
    });
    for (const [dc, count] of Object.entries(deptCounts)) {
      console.log("   " + dc + ": " + count + " subjects");
    }
    
    // 5. Curricula
    console.log("\n5. CURRICULA:");
    const curricula = await database.curriculum.findMany({
      include: { program: true }
    });
    curricula.forEach(c => console.log("   - " + c.code + " v" + c.version + ": " + c.name + " (Program: " + (c.program?.code || 'null') + ")"));
    
    // 6. Curriculum Subjects
    console.log("\n6. CURRICULUM SUBJECTS:");
    const curriculumSubjects = await database.curriculumSubject.findMany({
      include: { curriculum: true, subject: true }
    });
    const csByProg = {};
    curriculumSubjects.forEach(cs => {
      const progCode = cs.curriculum?.program?.code || 'no-prog';
      if (!csByProg[progCode]) csByProg[progCode] = [];
      csByProg[progCode].push(cs.subject?.code + " yr" + cs.yearLevel + " term" + cs.termNumber);
    });
    for (const [prog, items] of Object.entries(csByProg)) {
      var out = "   " + prog + ": ";
      items.forEach((item, i) => { out += item + (i < items.length - 1 ? ", " : ""); });
      if (items.length > 10) {
        out += " +";
        out += (items.length - 10);
        out += " more";
      }
      console.log(out);
    }
    
    // 7. Subject Requirements
    console.log("\n7. SUBJECT REQUIREMENTS (sample - first 30):");
    const requirements = await database.subjectRequirement.findMany({
      take: 30
    });
    requirements.forEach(r => console.log("   - " + (r.subject?.code || 'null') + " -> " + (r.requiredSubject?.code || 'null') + " [" + r.type + "]"));
    
    // 8. Check for standing requirements
    console.log("\n8. SUBJECTS WITH standing requirement:");
    const standingSubjects = await database.subject.findMany({
      where: { description: { contains: "Standing" } },
      take: 30
    });
    standingSubjects.forEach(s => console.log("   - " + s.code + ": " + s.description));
    
  } finally {
    await database.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });