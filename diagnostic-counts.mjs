import { PrismaClient } from "@prisma/client";
import { createDatabase } from "./server/db.mjs";

process.env.DATABASE_URL = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";

async function main() {
  const database = createDatabase();
  
  try {
    // Check subject count
    console.log("Total subjects count:");
    const subjCount = await database.subject.count();
    console.log("  " + subjCount);
    
    // Check curriculum count
    console.log("Total curricula count:");
    const curriculaCount = await database.curriculum.count();
    console.log("  " + curriculaCount);
    
    // Check curriculum subject count
    console.log("Total curriculum subjects count:");
    const csCount = await database.curriculumSubject.count();
    console.log("  " + csCount);
    
    // Check subject requirements count
    console.log("Total subject requirements count:");
    const reqCount = await database.subjectRequirement.count();
    console.log("  " + reqCount);
    
    // Check programs with curricula
    console.log("\nPrograms with curricula:");
    const programsWithCurricula = await database.program.findMany({
      include: { curricula: true }
    });
    programsWithCurricula.forEach(p => {
      console.log("  - " + p.code + ": " + p.curricula.length + " curricula");
      p.curricula.forEach(c => {
        console.log("      * " + c.code + " v" + c.version + " (" + c.status + ")");
      });
    });
    
    // Check departments with programs
    console.log("\nDepartments with programs:");
    const depts = await database.department.findMany({
      include: { programs: true }
    });
    depts.forEach(d => {
      console.log("  - " + d.code + ": " + d.name + " (" + d.programs.length + " programs)");
      d.programs.forEach(p => {
        console.log("      * " + p.code + ": " + p.name);
      });
    });
    
    // Check college
    console.log("\nCollege details:");
    const college = await database.college.findFirst();
    console.log("  - " + college.code + ": " + college.name);
    console.log("    Departments: " + (college.departments?.length || 0));
    
  } finally {
    await database.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });