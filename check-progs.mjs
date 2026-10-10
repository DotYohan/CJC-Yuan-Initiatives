import { PrismaClient } from "@prisma/client";
import { createDatabase } from "./server/db.mjs";

// Explicitly set DATABASE_URL from local-dev/.env
process.env.DATABASE_URL = "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/alpha_cor_jesu_sms";

const COLLEGE = {
  id: "e822d5e3-91a4-4350-9b5a-ca1c38c17bb3",
  code: "COE",
  codeNormalized: "coe",
  name: "College of Engineering",
  shortName: "COE"
};

const DEPARTMENT = {
  id: "e9e8b9ee-caa0-413e-86a6-b77c19ef7b67",
  code: "COE",
  name: "College of Engineering"
};

const PROGRAMS = [
  {
    code: "BSECE",
    name: "Bachelor of Science in Electronics and Communication Engineering"
  },
  {
    code: "BSCPE",
    name: "Bachelor of Science in Computer Engineering"
  },
  {
    code: "BSCE",
    name: "Bachelor of Science in Civil Engineering"
  }
].map((program) => ({
  ...program,
  codeNormalized: program.code.toLowerCase(),
  credential: "Bachelor Degree",
  durationYears: 4,
  termsPerYear: 2,
  isActive: true
}));

async function main() {
  const database = createDatabase();
  
  try {
    // Check existing state
    const colleges = await database.college.findMany({
      select: { id: true, code: true, name: true }
    });
    console.log("Existing colleges:", colleges.length);
    
    const departments = await database.department.findMany({
      include: { college: true }
    });
    console.log("Existing departments:", departments.length);
    
    const programs = await database.program.findMany({
      include: { department: true }
    });
    console.log("Existing programs:", programs.length);
    programs.forEach(p => console.log(` - ${p.code}: ${p.name}`));
    
  } finally {
    await database.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });