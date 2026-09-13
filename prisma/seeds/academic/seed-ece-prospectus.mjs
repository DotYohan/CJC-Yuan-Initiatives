import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createDatabase } from "../../../server/db.mjs";
import { newId, normalizeIdentifier } from "../../../server/security.mjs";

const sourceUrl = new URL("./data/ece-prospectus-2023-24.json", import.meta.url);

const numberEquals = (left, right) => Number(left) === Number(right);

function requireCommitAuthorization() {
  if (!process.argv.includes("--commit")) return false;
  if (process.env.ALLOW_ACADEMIC_SEED !== "true") {
    throw new Error("Set ALLOW_ACADEMIC_SEED=true together with --commit to write academic data.");
  }
  return true;
}

function validateSource(source) {
  if (!source || !Array.isArray(source.subjects) || source.subjects.length === 0) throw new Error("Prospectus subjects are required.");
  const normalizedCodes = source.subjects.map((subject) => normalizeIdentifier(subject.code));
  if (new Set(normalizedCodes).size !== normalizedCodes.length) throw new Error("Prospectus subject codes must be unique after normalization.");
  const codes = new Set(source.subjects.map((subject) => subject.code));
  for (const subject of source.subjects) {
    if (!subject.code || !subject.title) throw new Error("Every prospectus subject requires a code and title.");
    if (!Number.isInteger(subject.yearLevel) || subject.yearLevel < 1 || subject.yearLevel > 4) throw new Error(`${subject.code} has an invalid year level.`);
    if (!Number.isInteger(subject.termNumber) || subject.termNumber < 1 || subject.termNumber > 2) throw new Error(`${subject.code} has an invalid term number.`);
    if (!(subject.creditUnits > 0) || subject.lectureHours < 0 || subject.laboratoryHours < 0) throw new Error(`${subject.code} has invalid units or hours.`);
    for (const requiredCode of [...(subject.prerequisites || []), ...(subject.corequisites || [])]) {
      if (!codes.has(requiredCode)) throw new Error(`${subject.code} references missing requirement ${requiredCode}.`);
      if (requiredCode === subject.code) throw new Error(`${subject.code} cannot require itself.`);
    }
  }
  const totalUnits = source.subjects.reduce((sum, subject) => sum + subject.creditUnits, 0);
  if (source.subjects.length !== 68 || totalUnits !== 204) {
    throw new Error(`Expected 68 subjects and 204 units; received ${source.subjects.length} subjects and ${totalUnits} units.`);
  }
}

async function inspect(database, source) {
  const program = await database.program.findUnique({
    where: { codeNormalized: normalizeIdentifier(source.programCode) },
    select: { id: true, code: true, name: true, departmentId: true, durationYears: true, termsPerYear: true }
  });
  if (!program) throw new Error(`Program ${source.programCode} was not found.`);
  if (program.durationYears < 4 || program.termsPerYear < 2) throw new Error(`${program.code} does not support the four-year, two-term prospectus.`);
  const curriculum = await database.curriculum.findFirst({
    where: { programId: program.id, code: source.curriculum.code, version: source.curriculum.version },
    select: { id: true, code: true, name: true, version: true, effectiveFromYear: true, status: true }
  });
  if (curriculum && curriculum.effectiveFromYear !== source.curriculum.effectiveFromYear) {
    throw new Error(`Existing ${curriculum.code} version ${curriculum.version} has a conflicting effective year.`);
  }
  const existingSubjects = await database.subject.findMany({
    where: { codeNormalized: { in: source.subjects.map((subject) => normalizeIdentifier(subject.code)) } },
    select: {
      id: true, code: true, codeNormalized: true, title: true,
      defaultCreditUnits: true, defaultLectureHours: true, defaultLaboratoryHours: true
    }
  });
  const byCode = new Map(existingSubjects.map((subject) => [subject.codeNormalized, subject]));
  for (const subject of source.subjects) {
    const existing = byCode.get(normalizeIdentifier(subject.code));
    if (!existing) continue;
    if (existing.title !== subject.title
      || !numberEquals(existing.defaultCreditUnits, subject.creditUnits)
      || !numberEquals(existing.defaultLectureHours, subject.lectureHours)
      || !numberEquals(existing.defaultLaboratoryHours, subject.laboratoryHours)) {
      throw new Error(`Existing subject ${subject.code} conflicts with the reviewed prospectus. No data was changed.`);
    }
  }
  return { program, curriculum, existingSubjects };
}

export async function seedEceProspectus(database, source) {
  validateSource(source);
  const inspected = await inspect(database, source);
  return database.$transaction(async (transaction) => {
    const curriculum = inspected.curriculum ?? await transaction.curriculum.create({
      data: {
        id: newId(), programId: inspected.program.id, code: source.curriculum.code,
        name: source.curriculum.name, version: source.curriculum.version,
        effectiveFromYear: source.curriculum.effectiveFromYear, status: "DRAFT"
      }
    });
    if (curriculum.status !== "DRAFT") throw new Error("The target curriculum is published and cannot receive imported subjects.");

    const subjectIds = new Map();
    let subjectsCreated = 0;
    let curriculumItemsCreated = 0;
    let requirementsCreated = 0;
    const termSequence = new Map();

    for (const subject of source.subjects) {
      const codeNormalized = normalizeIdentifier(subject.code);
      let record = await transaction.subject.findUnique({ where: { codeNormalized }, select: { id: true } });
      if (!record) {
        record = await transaction.subject.create({
          data: {
            id: newId(), departmentId: inspected.program.departmentId, code: subject.code, codeNormalized,
            title: subject.title,
            description: subject.standingRequirement ? `Standing requirement: ${subject.standingRequirement}. Source: BSECE AY 2023-24 prospectus.` : "Source: BSECE AY 2023-24 prospectus.",
            defaultCreditUnits: subject.creditUnits, defaultLectureHours: subject.lectureHours,
            defaultLaboratoryHours: subject.laboratoryHours, status: "ACTIVE", isActive: true
          },
          select: { id: true }
        });
        subjectsCreated += 1;
      }
      subjectIds.set(subject.code, record.id);
      const key = `${subject.yearLevel}-${subject.termNumber}`;
      const sortOrder = (termSequence.get(key) || 0) + 1;
      termSequence.set(key, sortOrder);
      const existingItem = await transaction.curriculumSubject.findUnique({
        where: { curriculumId_subjectId: { curriculumId: curriculum.id, subjectId: record.id } }
      });
      if (existingItem) {
        if (existingItem.yearLevel !== subject.yearLevel || existingItem.termNumber !== subject.termNumber
          || !numberEquals(existingItem.creditUnits, subject.creditUnits)
          || !numberEquals(existingItem.lectureHours, subject.lectureHours)
          || !numberEquals(existingItem.laboratoryHours, subject.laboratoryHours)) {
          throw new Error(`Existing curriculum placement for ${subject.code} conflicts with the prospectus. No data was changed.`);
        }
      } else {
        await transaction.curriculumSubject.create({
          data: {
            id: newId(), curriculumId: curriculum.id, subjectId: record.id,
            yearLevel: subject.yearLevel, termNumber: subject.termNumber,
            creditUnits: subject.creditUnits, lectureHours: subject.lectureHours,
            laboratoryHours: subject.laboratoryHours, type: subject.type || "REQUIRED",
            isRequired: (subject.type || "REQUIRED") === "REQUIRED", sortOrder
          }
        });
        curriculumItemsCreated += 1;
      }
    }

    for (const subject of source.subjects) {
      for (const [type, codes] of [["PREREQUISITE", subject.prerequisites || []], ["COREQUISITE", subject.corequisites || []]]) {
        for (const requiredCode of codes) {
          const subjectId = subjectIds.get(subject.code);
          const requiredSubjectId = subjectIds.get(requiredCode);
          const existing = await transaction.subjectRequirement.findUnique({
            where: { subjectId_requiredSubjectId_type: { subjectId, requiredSubjectId, type } },
            select: { id: true }
          });
          if (!existing) {
            await transaction.subjectRequirement.create({ data: { id: newId(), subjectId, requiredSubjectId, type } });
            requirementsCreated += 1;
          }
        }
      }
    }

    return {
      program: { id: inspected.program.id, code: inspected.program.code },
      curriculum: { id: curriculum.id, code: curriculum.code, version: curriculum.version, preservedExistingShell: Boolean(inspected.curriculum) },
      sourceSubjects: source.subjects.length,
      sourceUnits: source.subjects.reduce((sum, subject) => sum + subject.creditUnits, 0),
      subjectsCreated,
      subjectsReused: source.subjects.length - subjectsCreated,
      curriculumItemsCreated,
      requirementsCreated
    };
  });
}

async function runCli() {
  const source = JSON.parse(await readFile(sourceUrl, "utf8"));
  validateSource(source);
  const commit = requireCommitAuthorization();
  const database = createDatabase();
  try {
    if (!commit) {
      const inspected = await inspect(database, source);
      process.stdout.write(`${JSON.stringify({
        mode: "dry-run", program: inspected.program.code,
        targetCurriculum: inspected.curriculum ?? { ...source.curriculum, wouldCreate: true },
        sourceSubjects: source.subjects.length,
        sourceUnits: source.subjects.reduce((sum, subject) => sum + subject.creditUnits, 0),
        existingMatchingSubjects: inspected.existingSubjects.length,
        command: "Set ALLOW_ACADEMIC_SEED=true, then rerun with --commit"
      }, null, 2)}\n`);
      return;
    }
    const result = await seedEceProspectus(database, source);
    process.stdout.write(`${JSON.stringify({ mode: "committed", ...result }, null, 2)}\n`);
  } finally {
    await database.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
