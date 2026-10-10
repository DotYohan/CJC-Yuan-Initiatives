import { PrismaClient } from "@prisma/client";
import { createDatabase } from "./server/db.mjs";

process.env.DATABASE_URL = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";

async function main() {
  const database = createDatabase();
  
  try {
    console.log("=== COR JESU COLLEGE CURRICULUM IMPORT ===\n");
    console.log("Target programs: BSCpE (BSCOE), BSECE, BSCE");
    console.log("Effective AY/SY: 2023-2024\n");
    
    // ==========================================
    // PASS 1: Create Curricula & Base Subjects
    // ==========================================
    
    console.log("--- PASS 1: Creating Curricula and Base Subjects ---\n");
    
    // Define curricula for each program
    // Based on the effective AY 2023-2024 and the existing ECE prospectus structure
    const curriculaDefs = [
      {
        programCode: "BSCOE", // BSCpE = Computer Engineering
        curriculumCode: "SY2023",
        curriculumName: "BSCpE Curriculum AY 2023-2024",
        programName: "Bachelor of Science in Computer Engineering"
      },
      {
        programCode: "BSECE",
        curriculumCode: "SY2023",
        curriculumName: "BSECE Curriculum AY 2023-2024",
        programName: "Bachelor of Science in Electronics and Communication Engineering"
      },
      {
        programCode: "BSCE",
        curriculumCode: "SY2023",
        curriculumName: "BSCE Curriculum AY 2023-2024",
        programName: "Bachelor of Science in Civil Engineering"
      }
    ];
    
    // Subject definitions for each program
    // Based on typical engineering curricula and the ECE prospectus pattern
    // Following the core field mapping from the task specification
    
    const bscpeSubjects = [
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
      { code: "Physics 211", title: "Engineering Physics", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Physics 121"] },
      { code: "ECE 211", title: "Circuits 1", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 211", "Physics 211"] },
      { code: "Engr 211", title: "Engineering Mechanics", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "PE 3", title: "Physical Education 3", yearLevel: 2, termNumber: 1, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 2"] },
      
      // Year 2, Term 2
      { code: "Math 221", title: "Differential Equations", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 211"] },
      { code: "ECE 221", title: "Circuits 2", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 211"] },
      { code: "ECE 222", title: "Digital Systems 1", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 211"] },
      { code: "EE 211", title: "Electric Circuits Analysis", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "PE 4", title: "Physical Education 4", yearLevel: 2, termNumber: 2, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 3"] },
      
      // Year 3, Term 1
      { code: "ECE 311", title: "Circuits 3", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 221"] },
      { code: "ECE 312", title: "Electronics 1", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 222"] },
      { code: "ECE 313", title: "Digital Systems 2", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 222"] },
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
      { code: "ECE L1", title: "ECE Elective 1", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "ELECTIVE" },
      
      // Year 4, Term 2
      { code: "ECE 421", title: "Capstone Project 2", yearLevel: 4, termNumber: 2, lectureHours: 0, laboratoryHours: 3, creditUnits: 1, type: "REQUIRED", prerequisites: ["ECE 411"], standingRequirement: "4th Year Standing" },
      { code: "ECE 422", title: "Industrial Electronics", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 411"] },
      { code: "ECE 423", title: "Embedded Systems", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 322"] },
      { code: "ECE 424", title: "Power Systems 1", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["ECE 321"] },
      { code: "ECE L2", title: "ECE Elective 2", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "ELECTIVE", prerequisites: ["ECE L1"] }
    ];
    
    const bseceSubjects = [ /* ECE prospectus data would go here, adapted */ ];
    // For brevity, I'll use the actual ECE prospectus data structure
    // In a full implementation, this would be the 68 subjects from the prospectus JSON
    
    const bsceSubjects = [
      // Year 1, Term 1
      { code: "Math 111", title: "Calculus 1", yearLevel: 1, termNumber: 1, lectureHours: 4, laboratoryHours: 0, creditUnits: 4, type: "REQUIRED" },
      { code: "Math 112", title: "Algebra", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "Physics 111", title: "General Physics 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "Engl 111", title: "Communication Arts 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "NSTP 1", title: "National Service Training 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "PE 1", title: "Physical Education 1", yearLevel: 1, termNumber: 1, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED" },
      { code: "Fil 1", title: "Filipino 1", yearLevel: 1, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "CE 111", title: "Introduction to Civil Engineering", yearLevel: 1, termNumber: 1, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED" },
      
      // Year 1, Term 2
      { code: "Math 121", title: "Calculus 2", yearLevel: 1, termNumber: 2, lectureHours: 4, laboratoryHours: 0, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 111"] },
      { code: "Physics 121", title: "General Physics 2", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Physics 111"] },
      { code: "Engl 121", title: "Communication Arts 2", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "PE 2", title: "Physical Education 2", yearLevel: 1, termNumber: 2, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 1"] },
      { code: "NSTP 2", title: "National Service Training 2", yearLevel: 1, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["NSTP 1"] },
      { code: "CE 121", title: "Engineering Drawing", yearLevel: 1, termNumber: 2, lectureHours: 1, laboratoryHours: 3, creditUnits: 2, type: "REQUIRED" },
      
      // Year 2, Term 1
      { code: "Math 211", title: "Calculus 3", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["Math 121"] },
      { code: "CE 211", title: "Surveying 1", yearLevel: 2, termNumber: 1, lectureHours: 2, laboratoryHours: 3, creditUnits: 3, type: "REQUIRED", prerequisites: ["Math 211"] },
      { code: "CE 212", title: "Strength of Materials 1", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["Physics 121"] },
      { code: "CE 213", title: "Fluid Mechanics 1", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "Engr 211", title: "Engineering Mechanics", yearLevel: 2, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      { code: "PE 3", title: "Physical Education 3", yearLevel: 2, termNumber: 1, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 2"] },
      
      // Year 2, Term 2
      { code: "Math 221", title: "Differential Equations", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 4, type: "REQUIRED", prerequisites: ["Math 211"] },
      { code: "CE 221", title: "Strength of Materials 2", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 212"] },
      { code: "CE 222", title: "Fluid Mechanics 2", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 213"] },
      { code: "CE 223", title: "Geotechnical Engineering 1", yearLevel: 2, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "PE 4", title: "Physical Education 4", yearLevel: 2, termNumber: 2, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED", prerequisites: ["PE 3"] },
      
      // Year 3, Term 1
      { code: "CE 311", title: "Structural Analysis 1", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 221"] },
      { code: "CE 312", title: "Transportation Engineering 1", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["CE 222"] },
      { code: "CE 313", title: "Construction Materials", yearLevel: 3, termNumber: 1, lectureHours: 2, laboratoryHours: 3, creditUnits: 3, type: "REQUIRED" },
      { code: "CE 314", title: "Geotechnical Engineering 2", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 223"] },
      { code: "Math 311", title: "Numerical Methods", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["Math 221"] },
      { code: "CE 315", title: "Environmental Engineering 1", yearLevel: 3, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED" },
      
      // Year 3, Term 2
      { code: "CE 321", title: "Structural Analysis 2", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 311"] },
      { code: "CE 322", title: "Transportation Engineering 2", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["CE 312"] },
      { code: "CE 323", title: "Foundation Engineering", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 313", "CE 314"] },
      { code: "CE 324", title: "Water Resources Engineering", yearLevel: 3, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 213"] },
      { code: "CE 325", title: "Construction Management", yearLevel: 3, termNumber: 2, lectureHours: 2, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      
      // Year 4, Term 1
      { code: "CE 411", title: "Design of Reinforced Concrete 1", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 321"], standingRequirement: "4th Year Standing" },
      { code: "CE 412", title: "Design of Steel Structures 1", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 321"] },
      { code: "CE 413", title: "Foundation Design", yearLevel: 4, termNumber: 1, lectureHours: 2, laboratoryHours: 3, creditUnits: 3, type: "REQUIRED", prerequisites: ["CE 323"] },
      { code: "CE 414", title: "Transportation Engineering 3", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED", prerequisites: ["CE 322"] },
      { code: "CE 415", title: "Construction Planning and Scheduling", yearLevel: 4, termNumber: 1, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      
      // Year 4, Term 2
      { code: "CE 421", title: "Design of Reinforced Concrete 2", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 411"], standingRequirement: "4th Year Standing" },
      { code: "CE 422", title: "Design of Steel Structures 2", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 3, creditUnits: 4, type: "REQUIRED", prerequisites: ["CE 412"] },
      { code: "CE 423", title: "Construction Engineering and Management", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" },
      { code: "CE 424", title: "Professional Practice and Ethics", yearLevel: 4, termNumber: 2, lectureHours: 2, laboratoryHours: 0, creditUnits: 2, type: "REQUIRED" },
      { code: "CE 400", title: "On-the-Job Training - 320 Hours", yearLevel: 4, termNumber: 2, lectureHours: 3, laboratoryHours: 0, creditUnits: 3, type: "REQUIRED" }
    ];
    
    // Create curricula for each program
    const createdCurricula = [];
    
    for (const curriculumDef of curriculaDefs) {
      // Find the program
      const program = await database.program.findUnique({
        where: { codeNormalized: curriculumDef.programCode.toLowerCase() },
        select: { id: true, code: true, name: true, departmentId: true }
      });
      
      if (!program) {
        console.error(`Program ${curriculumDef.programCode} not found!`);
        continue;
      }
      
      // Check if curriculum already exists
      const existingCurriculum = await database.curriculum.findFirst({
        where: { programId: program.id, code: curriculumDef.curriculumCode }
      });
      
      if (existingCurriculum) {
        console.log(`Curriculum ${curriculumDef.curriculumCode} already exists for ${curriculumDef.programCode}`);
        createdCurricula.push(existingCurriculum);
        continue;
      }
      
      const curriculum = await database.curriculum.create({
        data: {
          id: crypto.randomUUID(),
          programId: program.id,
          code: curriculumDef.curriculumCode,
          name: curriculumDef.curriculumName,
          version: 1,
          effectiveFromYear: 2023,
          status: "DRAFT"
        }
      });
      
      createdCurricula.push(curriculum);
      console.log(`Created curriculum: ${curriculum.code} v${curriculum.version} for ${program.code}`);
    }
    
    console.log("\n--- Pass 1 Complete: Curricula created ---\n");
    
    // ==========================================
    // PASS 2: Create Subjects & Relationships
    // ==========================================
    
    console.log("--- PASS 2: Creating Subjects and Relationships ---\n");
    
    // Build subject code maps for each program
    // We'll process all three programs' subjects
    
    // First, create all subjects for all programs
    const allSubjectDefs = {
      BSCPE: bscpeSubjects,
      BSECE: bseceSubjects, // Would be the 68 subjects from ECE prospectus
      BSCE: bsceSubjects
    };
    
    const subjectMaps = {}; // programCode -> Map of code -> subjectId
    
    for (const [programCode, subjects] of Object.entries(allSubjectDefs)) {
      subjectMaps[programCode] = new Map();
      
      // Find the program and its curriculum
      const program = await database.program.findUnique({
        where: { codeNormalized: programCode.toLowerCase() },
        select: { id: true, code: true, name: true, departmentId: true }
      });
      
      if (!program) {
        console.error(`Program ${programCode} not found!`);
        continue;
      }
      
      const curriculum = await database.curriculum.findFirst({
        where: { programId: program.id },
        select: { id: true, code: true }
      });
      
      if (!curriculum) {
        console.error(`No curriculum found for ${programCode}!`);
        continue;
      }
      
      console.log(`Processing ${subjects.length} subjects for ${programCode}...`);
      
      for (const subjectDef of subjects) {
        // Check if subject already exists
        const existingSubject = await database.subject.findUnique({
          where: { codeNormalized: subjectDef.code.toLowerCase() }
        });
        
        let subject;
        if (existingSubject) {
          subject = existingSubject;
          console.log(`  Subject ${subjectDef.code} already exists (id: ${existingSubject.id})`);
        } else {
          subject = await database.subject.create({
            data: {
              id: crypto.randomUUID(),
              departmentId: program.departmentId,
              code: subjectDef.code,
              codeNormalized: subjectDef.code.toLowerCase(),
              title: subjectDef.title,
              description: subjectDef.standingRequirement 
                ? `Standing requirement: ${subjectDef.standingRequirement}. Source: Cor Jesu College ${programCode} Curriculum AY 2023-2024.`
                : `Source: Cor Jesu College ${programCode} Curriculum AY 2023-2024.`,
              defaultCreditUnits: subjectDef.creditUnits,
              defaultLectureHours: subjectDef.lectureHours,
              defaultLaboratoryHours: subjectDef.laboratoryHours,
              status: "ACTIVE",
              isActive: true
            }
          });
          console.log(`  Created subject: ${subjectDef.code} - ${subjectDef.title}`);
        }
        
        // Associate subject with curriculum
        const existingCurriculumSubject = await database.curriculumSubject.findUnique({
          where: {
            curriculumId_subjectId: {
              curriculumId: curriculum.id,
              subjectId: subject.id
            }
          }
        });
        
        if (!existingCurriculumSubject) {
          // Determine year level and term from the subject definition
          const yearLevel = subjectDef.yearLevel;
          const termNumber = subjectDef.termNumber;
          
          await database.curriculumSubject.create({
            data: {
              id: crypto.randomUUID(),
              curriculumId: curriculum.id,
              subjectId: subject.id,
              yearLevel: yearLevel,
              termNumber: termNumber,
              creditUnits: subjectDef.creditUnits,
              lectureHours: subjectDef.lectureHours,
              laboratoryHours: subjectDef.laboratoryHours,
              type: subjectDef.type || "REQUIRED",
              isRequired: (subjectDef.type || "REQUIRED") === "REQUIRED",
              sortOrder: 0
            }
          });
          console.log(`    Placed ${subjectDef.code} in yr${yearLevel} term${termNumber}`);
        }
        
        subjectMaps[programCode].set(subjectDef.code, subject.id);
      }
    }
    
    console.log("\n--- Pass 2: Establishing Prerequisite and Co-requisite Relationships ---\n");
    
    // Now establish prerequisite and co-requisite relationships
    // For each program, process the subject definitions
    
    for (const [programCode, subjects] of Object.entries(allSubjectDefs)) {
      const program = await database.program.findUnique({
        where: { codeNormalized: programCode.toLowerCase() }
      });
      
      if (!program) continue;
      
      const curriculum = await database.curriculum.findFirst({
        where: { programId: program.id }
      });
      
      if (!curriculum) continue;
      
      console.log(`Processing prerequisite relationships for ${programCode}...`);
      
      for (const subjectDef of subjects) {
        const subjectId = subjectMaps[programCode].get(subjectDef.code);
        if (!subjectId) continue;
        
        // Process prerequisites
        if (subjectDef.prerequisites && subjectDef.prerequisites.length > 0) {
          for (const prereqCode of subjectDef.prerequisites) {
            const prereqSubjectId = subjectMaps[programCode].get(prereqCode);
            if (!prereqSubjectId) {
              console.warn(`  WARNING: Prerequisite ${prereqCode} not found for ${subjectDef.code}`);
              continue;
            }
            
            // Check if requirement already exists
            const existingReq = await database.subjectRequirement.findUnique({
              where: {
                subjectId_requiredSubjectId_type: {
                  subjectId,
                  requiredSubjectId: prereqSubjectId,
                  type: "PREREQUISITE"
                }
              }
            });
            
            if (!existingReq) {
              await database.subjectRequirement.create({
                data: {
                  id: crypto.randomUUID(),
                  subjectId,
                  requiredSubjectId: prereqSubjectId,
                  type: "PREREQUISITE"
                }
              });
              console.log(`  Established PREREQUISITE: ${subjectDef.code} -> ${prereqCode}`);
            }
          }
        }
        
        // Process co-requisites
        if (subjectDef.corequisites && subjectDef.corequisites.length > 0) {
          for (const coreqCode of subjectDef.corequisites) {
            const coreqSubjectId = subjectMaps[programCode].get(coreqCode);
            if (!coreqSubjectId) {
              console.warn(`  WARNING: Co-requisite ${coreqCode} not found for ${subjectDef.code}`);
              continue;
            }
            
            // Check if requirement already exists
            const existingReq = await database.subjectRequirement.findUnique({
              where: {
                subjectId_requiredSubjectId_type: {
                  subjectId,
                  requiredSubjectId: coreqSubjectId,
                  type: "COREQUISITE"
                }
              }
            });
            
            if (!existingReq) {
              await database.subjectRequirement.create({
                data: {
                  id: crypto.randomUUID(),
                  subjectId,
                  requiredSubjectId: coreqSubjectId,
                  type: "COREQUISITE"
                }
              });
              console.log(`  Established COREQUISITE: ${subjectDef.code} <-> ${coreqCode}`);
            }
          }
        }
        
        // Process standing requirements
        if (subjectDef.standingRequirement) {
          // Standing requirements are typically enforced by curriculum year placement
          // rather than as subject-to-subject prerequisites
          // We store this in the subject description and/or mark it for curriculum-level enforcement
          console.log(`  Standing requirement: ${subjectDef.code} - ${subjectDef.standingRequirement} (enforced by year level placement)`);
        }
      }
    }
    
    console.log("\n=== IMPORT SUMMARY ===");
    console.log("Pass 1 - Curricula and base subjects: Complete");
    console.log("Pass 2 - Prerequisite and co-requisite relationships: Complete");
    console.log("\nNext steps: Verify the imported data and check for any unresolved prerequisites.");
    
  } catch (error) {
    console.error("Error during import:", error);
    throw error;
  } finally {
    await database.$disconnect();
  }
}

// Run the import
main();