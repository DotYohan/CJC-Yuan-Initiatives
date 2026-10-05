import { pathToFileURL } from "node:url";
import { createDatabase } from "../../../server/db.mjs";

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
    id: "736c0502-8016-4c26-9d64-1049afab4158",
    code: "BSECE",
    name: "Bachelor of Science in Electronics and Communication Engineering"
  },
  {
    id: "9a095737-5105-4f6c-8636-e32dfa1f7650",
    code: "BSCOE",
    name: "Bachelor of Science in Computer Engineering"
  },
  {
    id: "8863df7a-34c1-4b34-8346-99a4f09a09db",
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

async function assertNoConflictingIdentity(tx, model, id, codeNormalized, label) {
  const [byId, byCode] = await Promise.all([
    tx[model].findUnique({ where: { id }, select: { id: true, code: true, codeNormalized: true } }),
    tx[model].findUnique({ where: { codeNormalized }, select: { id: true, code: true, codeNormalized: true } })
  ]);
  if (byId && byId.codeNormalized !== codeNormalized) {
    throw new Error(`${label} ID ${id} is already used by ${byId.code}.`);
  }
  if (byCode && byCode.id !== id) {
    throw new Error(`${label} code ${codeNormalized} already belongs to ${byCode.id}; refusing to create a duplicate.`);
  }
}

export async function restoreCanonicalPrograms(database) {
  return database.$transaction(async (tx) => {
    await assertNoConflictingIdentity(tx, "college", COLLEGE.id, COLLEGE.codeNormalized, "College");
    for (const program of PROGRAMS) {
      await assertNoConflictingIdentity(tx, "program", program.id, program.codeNormalized, "Program");
    }

    const college = await tx.college.upsert({
      where: { id: COLLEGE.id },
      update: { code: COLLEGE.code, codeNormalized: COLLEGE.codeNormalized, name: COLLEGE.name, shortName: COLLEGE.shortName, isActive: true },
      create: { ...COLLEGE, isActive: true }
    });
    const department = await tx.department.upsert({
      where: { id: DEPARTMENT.id },
      update: { collegeId: college.id, code: DEPARTMENT.code, name: DEPARTMENT.name, isActive: true },
      create: { ...DEPARTMENT, collegeId: college.id, isActive: true }
    });
    const programs = [];
    for (const definition of PROGRAMS) {
      programs.push(await tx.program.upsert({
        where: { id: definition.id },
        update: { departmentId: department.id, ...definition },
        create: { departmentId: department.id, ...definition }
      }));
    }
    return {
      college: { id: college.id, code: college.code, name: college.name },
      department: { id: department.id, code: department.code, name: department.name },
      programs: programs.map(({ id, code, name, isActive }) => ({ id, code, name, isActive }))
    };
  }, { maxWait: 15000, timeout: 60000 });
}

async function runCli() {
  const commit = process.argv.includes("--commit");
  const database = createDatabase();
  try {
    if (!commit) {
      process.stdout.write(`${JSON.stringify({ mode: "dry-run", college: COLLEGE, department: DEPARTMENT, programs: PROGRAMS, command: "node prisma/seeds/scripts/restore-canonical-programs.mjs --commit" }, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify({ mode: "committed", ...(await restoreCanonicalPrograms(database)) }, null, 2)}\n`);
  } finally {
    await database.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
