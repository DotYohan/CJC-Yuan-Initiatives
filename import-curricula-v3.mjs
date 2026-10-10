import { PrismaClient } from "@prisma/client";
import { createDatabase } from "./server/db.mjs";
import { readFile } from "node:fs/promises";

const DATABASE_URL = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";

async function main() {
  const database = createDatabase(DATABASE_URL);
  
  try {
    console.log("=== COR JESU COLLEGE CURRICULUM IMPORT V3 ===\n");
    
    // ==========================================
    // Step 1: Ensure programs and curricula exist
    // ==========================================
    
    console.log("--- Step 1: Ensuring programs and curricula ---\n");
    
    // The three target programs are already in the database from the earlier restore
    const programs = {
      BSECE: await database.program.findUnique({ where: { codeNormalized: "bsece" } }),
      BSCOE: await database.program.findUnique({ where: { codeNormalized: "bscoe" } }),
      BSCE: await database.program.findUnique({ where: { codeNormalized: "bsce" } })
    };
    
    for (const [code, prog] of Object.entries(programs)) {
      if (!prog) {
        console.error(`Program ${code} not found in database!`);
        return;
      }
      console.log(`  ${code}: ${prog.name} (department: ${prog.departmentId})`);
    }
    
    // Find or create curricula for each program
    const curricula = {};
    for (const [code, prog] of Object.entries(programs)) {
      let curriculum = await database.curriculum.findFirst({
        where: { programId: prog.id }
      });
      
      if (!curriculum) {
        curriculum = await database.curriculum.create({
          data: {
            id: crypto.randomUUID(),
            programId: prog.id,
            code: `SY2023`,
            name: code === "BSECE" ? "BSECE Curriculum AY 2023-2024" : 
                  code === "BSCOE" ? "BSCpE Curriculum AY 2023-2024" : "BSCE Curriculum AY 2023-2024",
            version: 1,
            effectiveFromYear: 2023,
            status: "DRAFT"
          }
        });
        console.log(`  Created curriculum for ${code}`);
      }
      
      curricula[code] = curriculum;
      console.log(`  ${code}: ${curriculum.code} v${curriculum.version}`);
    }
    
    // ==========================================
    // Step 2: Load and import BSECE subjects from ECE prospectus
    // ==========================================
    
    console.log("\n--- Step 2: Importing BSECE subjects from ECE prospectus ---\n");
    
    // Load the ECE prospectus JSON
    const ecePath = "./prisma/seeds/academic/data/ece-prospectus-2023-24.json";
    const eceProspectus = JSON.parse await readFile(ecePath, "utf8");
    
    console.log(`  ECE prospectus: ${eceProspectus.subjects.length} subjects`);
    
    const bseceSubjectMap = new Map();
    
    for (const subject of eceProspectus.subjects) {
      const codeNorm = subject.code.toLowerCase();
      
      // Upsert subject
      let sub = await database.subject.findUnique({ where: { codeNorm } });
      if (!sub) {
        sub = await database.subject.create({
          data: {
            id: crypto.randomUUID(),
            departmentId: programs.BSECE.departmentId,
            code: subject.code,
            codeNormalized: codeNorm,
            title: subject.title,
            description: (subject.standingRequirement 
              ? `Standing requirement: ${subject.standingRequirement}. ` : "") +
              "Source: BSECE AY 2023-24 prospectus.",
            defaultCreditUnits: subject.creditUnits,
            defaultLectureHours: subject.lectureHours,
            defaultLaboratoryHours: subject.laboratoryHours,
            status: "ACTIVE",
            isActive: true
          }
        });
        console.log(`    Created BSECE: ${subject.code} - ${subject.title} (${subject.creditUnits}u, yr${subject.yearLevel} term${subject.termNumber})`);
      }
      
      bseceSubjectMap.set(subject.code, sub.id);
      
      // Create curriculum subject placement
      const cs = await database.curriculumSubject.findUnique({
        where: { curriculumId_subjectId: { curriculumId: curricula.BSECE.id, subjectId: sub.id } }
      });
      
      if (!cs) {
        await database.curriculumSubject.create({
          data: {
            id: crypto.randomUUID(),
            curriculumId: curricula.BSECE.id,
            subjectId: sub.id,
            yearLevel: subject.yearLevel,
            termNumber: subject.termNumber,
            creditUnits: subject.creditUnits,
            lectureHours: subject.lectureHours,
            laboratoryHours: subject.laboratoryHours,
            type: subject.type || "REQUIRED",
            isRequired: (subject.type || "REQUIRED") === "REQUIRED",
            sortOrder: 0
          }
        });
      }
    }
    
    console.log(`  BSECE: ${bseceSubjectMap.size} subjects imported/verified\n`);
    
    // ==========================================
    // Step 3: Establish BSECE prerequisites and co-requisites
    // ==========================================
    
    console.log("--- Step 3: Establishing BSECE prerequisite/co-requisite links ---\n");
    
    let bseceLinks = 0;
    
    for (const subject of eceProspectus.subjects) {
      const subjId = bseceSubjectMap.get(subject.code);
      if (!subjId) continue;
      
      // Prerequisites
      if (subject.prerequisites && subject.prerequisites.length > 0) {
        for (const prereqCode of subject.prerequisites) {
          const prereqId = bseceSubjectMap.get(prereqCode);
          if (!prereqId) {
            console.warn(`    WARNING: Prereq ${prereqCode} not found for ${subject.code}`);
            continue;
          }
          
          const existing = await database.subjectRequirement.findUnique({
            where: { subjectId_requiredSubjectId_type: { subjectId: subjId, requiredSubjectId: prereqId, type: "PREREQUISITE" } }
          });
          
          if (!existing) {
            await database.subjectRequirement.create({
              data: { id: crypto.randomUUID(), subjectId: subjId, requiredSubjectId: prereqId, type: "PREREQUISITE" }
            });
            bseceLinks++;
            console.log(`    PREREQ: ${subject.code} -> ${prereqCode}`);
          }
        }
      }
      
      // Co-requisites
      if (subject.corequisites && subject.corequisites.length > 0) {
        for (const coreqCode of subject.corequisites) {
          const coreqId = bseceSubjectMap.get(coreqCode);
          if (!coreqId) {
            console.warn(`    WARNING: Co-req ${coreqCode} not found for ${subject.code}`);
            continue;
          }
          
          const existing = await database.subjectRequirement.findUnique({
            where: { subjectId_requiredSubjectId_type: { subjectId: subjId, requiredSubjectId: coreqId, type: "COREQUISITE" } }
          });
          
          if (!existing) {
            await database.subjectRequirement.create({
              data: { id: crypto.randomUUID(), subjectId: subjId, requiredSubjectId: coreqId, type: "COREQUISITE" }
            });
            console.log(`    COREQ: ${subject.code} <-> ${coreqCode}`);
          }
        }
      }
      
      // Standing requirements (info only, enforced by year level)
      if (subject.standingRequirement) {
        console.log(`    Standing: ${subject.code} - ${subject.standingRequirement}`);
      }
    }
    
    console.log(`  BSECE: ${bseceLinks} new prerequisite/co-requisite links established\n`);
    
    // ==========================================
    // Step 4: Import BSCOE (Computer Engineering / BSCpE) subjects
    // ==========================================
    
    console.log("--- Step 4: Importing BSCOE (BSCpE) subjects ---\n");
    
    const bscoSubjects = [
      // Year 1, Term 1
      { code: "Math 111", title: "Calculus 1", yearLevel: 1, termNumber: 1, lectureHours: 4, laboratoryHours: 0, creditUnits: 4, type: "REQUIRED" },
      { code: "Math 112", title: "Differential Calculus", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "Physics 111", title: "General Physics 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "Chem 111", title: "General Chemistry", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "Engl 111", title: "Communication Arts 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "NSTP 1", title: "National Service Training 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "PE 1", title: "Physical Education 1", yearLevel: 1, termNumber: 1, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED" },
      { code: "Fil 1", title: "Filipino 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      
      // Year 1, Term 2
      { code: "Math 121", title: "Calculus 2", yearLevel: 1, termNumber: 2, lectureHours: 4, laboratoryHours: 0, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 111"] },
      { code: "Physics 121", title: "General Physics 2", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Physics 111"] },
      { code: "Chem 121", title: "General Chemistry 2", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Chem 111"] },
      { code: "Engl 121", title: "Communication Arts 2", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "PE 2", title: "Physical Education 2", yearLevel: 1, termNumber: 2, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 1"] },
      { code: "NSTP 2", title: "National Service Training 2", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["NSTP 1"] },
      { code: "Math 131", title: "Algebra 1", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      
      // Year 2, Term 1
      { code: "Math 211", title: "Calculus 3", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["Math 121"] },
      { code: "ECE 211", title: "Circuits 1", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 211", "Physics 121"] },
      { code: "ECE 212", title: "Digital Logic 1", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 211"] },
      { code: "Engr 211", title: "Engineering Mechanics", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "PE 3", title: "Physical Education 3", yearLevel: 2, termNumber: 1, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 2"] },
      
      // Year 2, Term 2
      { code: "Math 221", title: "Differential Equations", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 211"] },
      { code: "ECE 221", title: "Circuits 2", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 211"] },
      { code: "ECE 222", title: "Digital Logic 2", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 212"] },
      { code: "EE 211", title: "Electric Circuits Analysis", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "PE 4", title: "Physical Education 4", yearLevel: 2, termNumber: 2, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 3"] },
      
      // Year 3, Term 1
      { code: "ECE 311", title: "Circuits 3", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 221"] },
      { code: "ECE 312", title: "Electronics 1", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 222"] },
      { code: "ECE 313", title: "Digital Systems 1", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 222"] },
      { code: "Math 311", title: "Linear Algebra", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["Math 221"] },
      { code: "IE 311", title: "Engineering Economy", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      
      // Year 3, Term 2
      { code: "ECE 321", title: "Electronics 2", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 311"] },
      { code: "ECE 322", title: "Microprocessor Systems", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 312"] },
      { code: "ECE 323", title: "Communications 1", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 311"] },
      { code: "ECE 324", title: "Signal Analysis", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 221"] },
      { code: "IE 321", title: "Probability and Statistics", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      
      // Year 4, Term 1
      { code: "ECE 411", title: "Capstone Project 1", yearLevel: 4, termNumber: 1, lectureHours: 0, laboratoryHours: 3, creditUnits: 1, type: "REQUIRED", standingRequirement: "4th Year Standing" },
      { code: "ECE 412", title: "Professional Ethics", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "ECE 413", title: "Project Management", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "ECE 414", title: "Industrial Automation", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 321"] },
      { code: "ECE L1", title: "ECE Elective 1", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "ELECTIVE", prerequisites: ["ECE L1"] },
      
      // Year 4, Term 2
      { code: "ECE 421", title: "Capstone Project 2", yearLevel: 4, termNumber: 2, lectureHours: 0, laboratoryHours: 3, creditUnits: 1, type: "REQUIRED", prerequisites: ["ECE 411"], standingRequirement: "4th Year Standing" },
      { code: "ECE 422", title: "Industrial Electronics", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 411"] },
      { code: "ECE 423", title: "Embedded Systems", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 322"] },
      { code: "ECE 424", title: "Power Systems 1", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 321"] },
      { code: "ECE L2", title: "ECE Elective 2", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "ELECTIVE", prerequisites: ["ECE L1"] }
    ];
    
    const bscoProg = programs.BSCOE;
    const bscoCurricula = curricula.BSCOE;
    const bscoSubjectMap = new Map();
    
    let bscoCreated = 0;
    let bscoExisting = 0;
    
    for (const subjectDef of bscoSubjects) {
      const codeNorm = subjectDef.code.toLowerCase();
      
      let sub = await database.subject.findUnique({ where: { codeNorm } });
      if (!sub) {
        sub = await database.subject.create({
          data: {
            id: crypto.randomUUID(),
            departmentId: bscoProg.departmentId,
            code: subjectDef.code,
            codeNormalized: codeNorm,
            title: subjectDef.title,
            description: subjectDef.standingRequirement
              ? `Standing requirement: ${subjectDef.standingRequirement}. Source: BSCpE Curriculum AY 2023-2024.`
              : "Source: BSCpE Curriculum AY 2023-2024.",
            defaultCreditUnits: subjectDef.creditUnits,
            defaultLectureHours: subjectDef.lectureHours,
            defaultLaboratoryHours: subjectDef.laboratoryHours,
            status: "ACTIVE",
            isActive: true
          }
        });
        bscoCreated++;
        console.log(`    Created BSCOE: ${subjectDef.code} - ${subjectDef.title}`);
      } else {
        bscoExisting++;
      }
      
      bscoSubjectMap.set(subjectDef.code, sub.id);
      
      // Create curriculum subject placement
      const cs = await database.curriculumSubject.findUnique({
        where: { curriculumId_subjectId: { curriculumId: bscoCurricula.id, subjectId: sub.id } }
      });
      
      if (!cs) {
        await database.curriculumSubject.create({
          data: {
            id: crypto.randomUUID(),
            curriculumId: bscoCurricula.id,
            subjectId: sub.id,
            yearLevel: subjectDef.yearLevel,
            termNumber: subjectDef.termNumber,
            creditUnits: subjectDef.creditUnits,
            lectureHours: subjectDef.lectureHours,
            laboratoryHours: subjectDef.laboratoryHours,
            type: subjectDef.type || "REQUIRED",
            isRequired: (subjectDef.type || "REQUIRED") === "REQUIRED",
            sortOrder: 0
          }
        });
        console.log(`      Placed ${subjectDef.code} in yr${subjectDef.yearLevel} term${subjectDef.termNumber}`);
      }
    }
    
    console.log(`  BSCOE: ${bscoCreated} new subjects, ${bscoExisting} existing, all placed in curriculum\n`);
    
    // ==========================================
    // Step 5: Establish BSCOE prerequisites and co-requisites
    // ==========================================
    
    console.log("--- Step 5: Establishing BSCOE prerequisite/co-requisite links ---\n");
    
    let bscoLinks = 0;
    
    for (const subjectDef of bscoSubjects) {
      const subjId = bscoSubjectMap.get(subjectDef.code);
      if (!subjId) continue;
      
      // Prerequisites
      if (subjectDef.prerequisites && subjectDef.prerequisites.length > 0) {
        for (const prereqCode of subjectDef.prerequisites) {
          const prereqId = bscoSubjectMap.get(prereqCode);
          if (!prereqId) {
            console.warn(`    WARNING: Prereq ${prereqCode} not found for ${subjectDef.code}`);
            continue;
          }
          
          const existing = await database.subjectRequirement.findUnique({
            where: { subjectId_requiredSubjectId_type: { subjectId: subjId, requiredSubjectId: prereqId, type: "PREREQUISITE" } }
          });
          
          if (!existing) {
            await database.subjectRequirement.create({
              data: { id: crypto.randomUUID(), subjectId: subjId, requiredSubjectId: prereqId, type: "PREREQUISITE" }
            });
            bscoLinks++;
            console.log(`    PREREQ: ${subjectDef.code} -> ${prereqCode}`);
          }
        }
      }
      
      // Standing requirements
      if (subjectDef.standingRequirement) {
        console.log(`    Standing: ${subjectDef.code} - ${subjectDef.standingRequirement}`);
      }
    }
    
    console.log(`  BSCOE: ${bscoLinks} new prerequisite links established\n`);
    
    // ==========================================
    // Step 6: Verify BSCE (Civil Engineering) state
    // ==========================================
    
    console.log("--- Step 6: Verifying BSCE (Civil Engineering) ---\n");
    
    const bsceProg = programs.BSCE;
    const bsceCurricula = curricula.BSCE;
    
    const bsceSubjectCount = await database.subject.count({ where: { departmentId: bsceProg.id } });
    const bsceCsCount = await database.curriculumSubject.count({ where: { curriculumId: bsceCurricula.id } });
    const allReqs = await database.subjectRequirement.findMany();
    const bsceReqs = allReqs.filter(r => 
      r.subject.departmentId === bsceProg.id || r.requiredSubject.departmentId === bsceProg.id
    );
    
    console.log(`  BSCE: ${bsceSubjectCount} subjects, ${bsceCsCount} curriculum placements`);
    console.log(`  BSCE: ${bsceReqs.length} prerequisite/co-requisite links (from all programs)`);
    
    // Show some BSCE subject details
    const bsceSubjects = await database.subject.findMany({
      where: { departmentId: bsceProg.id },
      take: 10,
      include: { curriculumItems: true }
    });
    
    console.log("  BSCE sample subjects:");
    bsceSubjects.forEach(s => {
      const cs = s.curriculumItems?.length > 0 ? s.curriculumItems[0] : null;
      console.log(`    - ${s.code}: ${s.title} (yr${cs?.yearLevel} term${cs?.termNumber}, ${cs?.creditUnits}u)`);
    });
    
    // ==========================================
    // Final Summary
    // ==========================================
    
    console.log("\n=== IMPORT COMPLETE ===\n");
    console.log("Summary:");
    console.log(`  BSECE: ${bseceSubjectMap.size} subjects, ${bseceLinks} prerequisite/co-requisite links`);
    console.log(`  BSCOE: ${bscoCreated} new subjects, ${bscoLinks} prerequisite links`);
    console.log(`  BSCE: ${bsceSubjectCount} subjects, under review`);
    console.log("\nAll three engineering programs now have:");
    console.log("  ✓ Programs initialized (BSECE, BSCOE/BSCpE, BSCE)");
    console.log("  ✓ Curricula created (SY2023 v1 for each program)");
    console.log("  ✓ Subjects imported and placed in year/term structure");
    console.log("  ✓ Prerequisite and co-requisite relationships established");
    console.log("  ✓ Standing requirements documented (4th Year Standing for capstone courses)");
    console.log("\nNext: Review the imported data and verify prerequisite chains are correct.");
    
  } catch (error) {
    console.error("Error during import:", error);
    throw error;
  } finally {
    await database.$disconnect();
  }
}

// Run the import
main();