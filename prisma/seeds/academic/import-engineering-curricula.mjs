import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createDatabase } from "../../../server/db.mjs";
import { newId, normalizeIdentifier } from "../../../server/security.mjs";

const sourceFiles = [
  "./data/ece-prospectus-2023-24.json",
  "./data/computer-engineering-ay2023-24.json",
  "./data/civil-engineering-ay2023-24.json"
];

const PROGRAMS = Object.freeze({
  BSECE: "Bachelor of Science in Electronics and Communication Engineering",
  BSCOE: "Bachelor of Science in Computer Engineering",
  BSCE: "Bachelor of Science in Civil Engineering"
});

const num = (value) => Number(value);
const sameNum = (left, right) => num(left) === num(right);
const subjectKey = (programId, codeNormalized) => `${programId}:${codeNormalized}`;

function authorizeCommit() {
  const commit = process.argv.includes("--commit");
  if (commit && process.env.ALLOW_ACADEMIC_SEED !== "true") {
    throw new Error("Set ALLOW_ACADEMIC_SEED=true together with --commit to write academic data.");
  }
  return commit;
}

async function loadSources() {
  const sources = await Promise.all(sourceFiles.map(async (file) =>
    JSON.parse(await readFile(new URL(file, import.meta.url), "utf8"))));
  const byProgram = new Map(sources.map((source) => [source.programCode, source]));
  if (Object.keys(PROGRAMS).some((code) => !byProgram.has(code))) throw new Error("All three engineering program sources are required.");

  for (const [programCode, source] of byProgram) {
    if (!Array.isArray(source.subjects) || source.subjects.length === 0) throw new Error(`${programCode} has no regular-term subjects.`);
    const codes = source.subjects.map((subject) => normalizeIdentifier(subject.code));
    if (new Set(codes).size !== codes.length) throw new Error(`${programCode} has duplicate subject codes after normalization.`);
    for (const subject of source.subjects) {
      if (!subject.code || !subject.title || subject.title.length > 200) throw new Error(`${programCode} has an invalid course code or title.`);
      if (!Number.isInteger(subject.yearLevel) || subject.yearLevel < 1 || subject.yearLevel > 4) throw new Error(`${programCode} ${subject.code} has an invalid year.`);
      if (!Number.isInteger(subject.termNumber) || subject.termNumber < 1 || subject.termNumber > 2) throw new Error(`${programCode} ${subject.code} has an unsupported regular term.`);
      if (!(subject.creditUnits > 0) || subject.lectureHours < 0 || subject.laboratoryHours < 0) throw new Error(`${programCode} ${subject.code} has invalid units or hours.`);
    }
    const codeSet = new Set(codes);
    for (const subject of source.subjects) {
      for (const required of [...(subject.prerequisites || []), ...(subject.corequisites || [])]) {
        if (!codeSet.has(normalizeIdentifier(required)) && normalizeIdentifier(required) !== "emath 123") {
          throw new Error(`${programCode} ${subject.code} references missing source prerequisite ${required}.`);
        }
        if (normalizeIdentifier(required) === normalizeIdentifier(subject.code)) throw new Error(`${programCode} ${subject.code} cannot require itself.`);
      }
    }
  }
  return byProgram;
}

async function inspect(tx, sources) {
  const college = await tx.college.findUnique({
    where: { codeNormalized: normalizeIdentifier("COE") }, select: { id: true, code: true, name: true }
  });
  if (!college) throw new Error("COE College is missing; refusing to create a parallel organization.");
  const departments = await tx.department.findMany({ where: { collegeId: college.id, code: "COE" }, select: { id: true, code: true, name: true } });
  if (departments.length !== 1) throw new Error(`Expected exactly one COE Department; found ${departments.length}.`);
  const department = departments[0];

  const programs = await tx.program.findMany({ where: { codeNormalized: { in: Object.keys(PROGRAMS).map(normalizeIdentifier) } } });
  const programByCode = new Map(programs.map((program) => [normalizeIdentifier(program.code), program]));
  for (const [code, name] of Object.entries(PROGRAMS)) {
    const existing = programByCode.get(normalizeIdentifier(code));
    if (existing && (existing.departmentId !== department.id || existing.name !== name)) {
      throw new Error(`${code} exists with a conflicting Department or Program name.`);
    }
  }

  const programIds = [...programByCode.values()].map((program) => program.id);
  const curricula = programIds.length
    ? await tx.curriculum.findMany({ where: { programId: { in: programIds } }, include: { _count: { select: { subjects: true } } } })
    : [];
  const curriculumByKey = new Map(curricula.map((item) => [`${item.programId}:${item.code}:${item.version}`, item]));
  const existingSubjects = programIds.length
    ? await tx.subject.findMany({
      where: { programId: { in: programIds } },
      select: { id: true, programId: true, code: true, codeNormalized: true, title: true, defaultCreditUnits: true, defaultLectureHours: true, defaultLaboratoryHours: true }
    })
    : [];
  const subjectByKey = new Map(existingSubjects.map((item) => [subjectKey(item.programId, item.codeNormalized), item]));

  const plan = { college, department, programs: [], curricula: [], subjects: [], mappings: [], requirements: [], unresolvedPrerequisites: [], summer: [] };
  const allDefs = [];
  for (const [code, name] of Object.entries(PROGRAMS)) {
    const source = sources.get(code);
    const program = programByCode.get(normalizeIdentifier(code));
    plan.programs.push({ code, name, action: program ? "reuse" : "create", id: program?.id ?? null });
    let curriculum = program
      ? curriculumByKey.get(`${program.id}:${source.curriculum.code}:${source.curriculum.version}`)
      : null;
    if (!curriculum && program) {
      const compatibleEmptyDrafts = curricula.filter((item) => item.programId === program.id
        && item.effectiveFromYear === source.curriculum.effectiveFromYear
        && item.status === "DRAFT" && item._count.subjects === 0);
      if (compatibleEmptyDrafts.length > 1) throw new Error(`${code} has multiple empty draft curricula for the source year; refusing to choose one.`);
      curriculum = compatibleEmptyDrafts[0] ?? null;
    }
    if (curriculum && (curriculum.effectiveFromYear !== source.curriculum.effectiveFromYear || curriculum.status !== "DRAFT")) {
      throw new Error(`${code} curriculum ${curriculum.code} conflicts with the source year or is not DRAFT.`);
    }
    plan.curricula.push({ programCode: code, code: curriculum?.code ?? source.curriculum.code, name: curriculum?.name ?? source.curriculum.name, version: curriculum?.version ?? source.curriculum.version, action: curriculum ? "reuse" : "create", id: curriculum?.id ?? null });

    for (const subject of source.subjects) {
      const codeNormalized = normalizeIdentifier(subject.code);
      const existing = program ? subjectByKey.get(subjectKey(program.id, codeNormalized)) : null;
      if (existing && (existing.code !== subject.code || existing.title !== subject.title
        || !sameNum(existing.defaultCreditUnits, subject.creditUnits)
        || !sameNum(existing.defaultLectureHours, subject.lectureHours)
        || !sameNum(existing.defaultLaboratoryHours, subject.laboratoryHours))) {
        throw new Error(`${code} subject ${subject.code} conflicts with existing program-scoped catalog data.`);
      }
      const def = { programCode: code, programId: program?.id ?? null, curriculumId: curriculum?.id ?? null, codeNormalized, subject, existing };
      allDefs.push(def);
      plan.subjects.push({ programCode: code, code: subject.code, action: existing ? "reuse" : "create" });
      if (subject.standingRequirement) plan.requirements.push({ kind: "standing", programCode: code, subjectCode: subject.code, requirement: subject.standingRequirement });
      if (subject.otherRequirement) plan.requirements.push({ kind: "other", programCode: code, subjectCode: subject.code, requirement: subject.otherRequirement });
    }
    for (const subject of source.summerSubjects || []) plan.summer.push({ programCode: code, ...subject });
  }

  // Check placements and resolve same-Program requirement targets after subjects are planned.
  for (const def of allDefs) {
    const source = sources.get(def.programCode);
    const curriculum = plan.curricula.find((item) => item.programCode === def.programCode);
    if (def.existing && def.curriculumId) {
      const placement = await tx.curriculumSubject.findUnique({
        where: { curriculumId_subjectId: { curriculumId: def.curriculumId, subjectId: def.existing.id } }
      });
      if (placement && (placement.yearLevel !== def.subject.yearLevel || placement.termNumber !== def.subject.termNumber
        || !sameNum(placement.creditUnits, def.subject.creditUnits)
        || !sameNum(placement.lectureHours, def.subject.lectureHours)
        || !sameNum(placement.laboratoryHours, def.subject.laboratoryHours))) {
        throw new Error(`${def.programCode} ${def.subject.code} has a conflicting existing curriculum placement.`);
      }
      if (placement) def.placementExists = true;
    }
    def.curriculumCode = curriculum.code;
    const programSource = source.subjects;
    for (const [type, keys] of [["PREREQUISITE", "prerequisites"], ["COREQUISITE", "corequisites"]]) {
      for (const targetCode of def.subject[keys] || []) {
        const target = programSource.find((candidate) => normalizeIdentifier(candidate.code) === normalizeIdentifier(targetCode));
        if (!target) {
          plan.unresolvedPrerequisites.push({ programCode: def.programCode, subjectCode: def.subject.code, requiredCode: targetCode, type });
        } else {
          plan.requirements.push({ kind: "subject", programCode: def.programCode, subjectCode: def.subject.code, requiredCode: target.code, type });
        }
      }
    }
  }
  return { ...plan, allDefs };
}

async function commitImport(tx, sources) {
  const plan = await inspect(tx, sources);
  const missingPrograms = plan.programs.filter((item) => item.action === "create");
  if (missingPrograms.length) await tx.program.createMany({
    data: missingPrograms.map(({ code, name }) => ({
      id: newId(), departmentId: plan.department.id, code, codeNormalized: normalizeIdentifier(code), name,
      credential: "Bachelor Degree", durationYears: 4, termsPerYear: 2, isActive: true
    })), skipDuplicates: true
  });
  const programs = await tx.program.findMany({ where: { codeNormalized: { in: Object.keys(PROGRAMS).map(normalizeIdentifier) } } });
  const programByCode = new Map(programs.map((program) => [normalizeIdentifier(program.code), program]));

  for (const [code, source] of sources) {
    const program = programByCode.get(normalizeIdentifier(code));
    const planned = plan.curricula.find((item) => item.programCode === code);
    if (planned.action === "create") await tx.curriculum.create({ data: {
      id: newId(), programId: program.id, code: source.curriculum.code, name: source.curriculum.name,
      version: source.curriculum.version, effectiveFromYear: source.curriculum.effectiveFromYear,
      effectiveToYear: source.curriculum.effectiveToYear ?? null, status: "DRAFT"
    } });
  }
  const curricula = await tx.curriculum.findMany({ where: { programId: { in: programs.map((item) => item.id) } } });
  const curriculumByProgram = new Map(curricula.map((item) => [item.programId, item]));

  const missingSubjects = [];
  for (const def of plan.allDefs) {
    const program = programByCode.get(normalizeIdentifier(def.programCode));
    if (def.existing) continue;
    missingSubjects.push({
      id: newId(), programId: program.id, departmentId: plan.department.id,
      code: def.subject.code, codeNormalized: def.codeNormalized, title: def.subject.title,
      defaultCreditUnits: def.subject.creditUnits, defaultLectureHours: def.subject.lectureHours,
      defaultLaboratoryHours: def.subject.laboratoryHours, status: "ACTIVE", isActive: true
    });
  }
  if (missingSubjects.length) await tx.subject.createMany({ data: missingSubjects, skipDuplicates: true });

  const subjectCodes = [...new Set(plan.allDefs.map((def) => def.codeNormalized))];
  const subjects = await tx.subject.findMany({ where: { programId: { in: programs.map((item) => item.id) }, codeNormalized: { in: subjectCodes } } });
  const subjectByKey = new Map(subjects.map((item) => [subjectKey(item.programId, item.codeNormalized), item]));

  const mappingRows = [];
  const requirementRows = [];
  for (const def of plan.allDefs) {
    const program = programByCode.get(normalizeIdentifier(def.programCode));
    const curriculum = curriculumByProgram.get(program.id);
    const subject = subjectByKey.get(subjectKey(program.id, def.codeNormalized));
    if (!subject) throw new Error(`Subject ${def.programCode} ${def.subject.code} was not persisted.`);
    const existingPlacement = await tx.curriculumSubject.findUnique({
      where: { curriculumId_subjectId: { curriculumId: curriculum.id, subjectId: subject.id } }, select: { id: true }
    });
    if (!existingPlacement) mappingRows.push({
      id: newId(), curriculumId: curriculum.id, subjectId: subject.id, yearLevel: def.subject.yearLevel,
      termNumber: def.subject.termNumber, creditUnits: def.subject.creditUnits,
      lectureHours: def.subject.lectureHours, laboratoryHours: def.subject.laboratoryHours,
      type: def.subject.type || "REQUIRED", isRequired: (def.subject.type || "REQUIRED") === "REQUIRED",
      sortOrder: def.subject.sortOrder ?? 0
    });
  }
  if (mappingRows.length) await tx.curriculumSubject.createMany({ data: mappingRows, skipDuplicates: true });

  const existingRequirements = await tx.subjectRequirement.findMany({ where: { subjectId: { in: subjects.map((item) => item.id) } } });
  const requirementSet = new Set(existingRequirements.map((item) => `${item.subjectId}:${item.requiredSubjectId}:${item.type}`));
  for (const def of plan.allDefs) {
    const program = programByCode.get(normalizeIdentifier(def.programCode));
    const subject = subjectByKey.get(subjectKey(program.id, def.codeNormalized));
    for (const [type, keys] of [["PREREQUISITE", "prerequisites"], ["COREQUISITE", "corequisites"]]) {
      for (const targetCode of def.subject[keys] || []) {
        const codeNormalized = normalizeIdentifier(targetCode);
        const target = subjectByKey.get(subjectKey(program.id, codeNormalized));
        if (!target) continue; // Recorded as unresolved in the dry-run report.
        const key = `${subject.id}:${target.id}:${type}`;
        if (!requirementSet.has(key)) {
          requirementSet.add(key);
          requirementRows.push({ id: newId(), subjectId: subject.id, requiredSubjectId: target.id, type });
        }
      }
    }
  }
  if (requirementRows.length) await tx.subjectRequirement.createMany({ data: requirementRows, skipDuplicates: true });

  return {
    programsCreated: missingPrograms.length,
    curriculaCreated: curricula.filter((item) => !plan.curricula.some((planned) => planned.id === item.id)).length,
    subjectsCreated: missingSubjects.length,
    mappingsCreated: mappingRows.length,
    prerequisitesCreated: requirementRows.length,
    programs: programs.map((item) => ({ id: item.id, code: item.code })),
    curricula: curricula.map((item) => ({ id: item.id, programId: item.programId, code: item.code, status: item.status })),
    subjects: subjects.length,
    mappings: await tx.curriculumSubject.count({ where: { curriculumId: { in: curricula.map((item) => item.id) } } }),
    requirements: await tx.subjectRequirement.count({ where: { subjectId: { in: subjects.map((item) => item.id) } } })
  };
}

async function run() {
  const sources = await loadSources();
  const commit = authorizeCommit();
  const database = createDatabase();
  try {
    if (!commit) {
      const plan = await inspect(database, sources);
      const { allDefs, ...summary } = plan;
      process.stdout.write(`${JSON.stringify({
        mode: "dry-run",
        programs: summary.programs,
        curricula: summary.curricula,
        subjectCounts: Object.fromEntries(Object.keys(PROGRAMS).map((code) => [code, sources.get(code).subjects.length])),
        subjectsToCreate: summary.subjects.filter((item) => item.action === "create").length,
        subjectsToReuse: summary.subjects.filter((item) => item.action === "reuse").length,
        mappingsToCreate: summary.subjects.filter((_, index) => !allDefs[index].placementExists).length,
        prerequisitesToCreate: summary.requirements.filter((item) => item.kind === "subject").length,
        standingRequirements: summary.requirements.filter((item) => item.kind === "standing"),
        otherUnmodeledRequirements: summary.requirements.filter((item) => item.kind === "other"),
        unresolvedPrerequisites: summary.unresolvedPrerequisites,
        summerItems: summary.summer,
        command: "Set ALLOW_ACADEMIC_SEED=true and rerun with --commit to import."
      }, null, 2)}\n`);
      return;
    }
    const result = await database.$transaction((tx) => commitImport(tx, sources), { maxWait: 15000, timeout: 180000 });
    process.stdout.write(`${JSON.stringify({ mode: "committed", ...result }, null, 2)}\n`);
  } finally {
    await database.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
