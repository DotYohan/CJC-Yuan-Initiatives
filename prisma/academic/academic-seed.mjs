import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const dataUrl = new URL("./data/", import.meta.url);

const canonicalIdentifier = (value) =>
  typeof value === "string" ? value.normalize("NFKC").trim().toLocaleLowerCase("en-US") : "";

async function readJson(filename) {
  return JSON.parse(await readFile(new URL(filename, dataUrl), "utf8"));
}

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

export async function loadAcademicSeedPlan() {
  const [collegeSource, departmentSources, programSources] = await Promise.all([
    readJson("college.json"),
    readJson("departments.json"),
    readJson("programs.json")
  ]);

  const college = {
    ...collegeSource,
    code: requiredText(collegeSource.code, "college.code"),
    name: requiredText(collegeSource.name, "college.name"),
    codeNormalized: canonicalIdentifier(collegeSource.code)
  };

  const departments = (departmentSources || []).map((source, index) => ({
    ...source,
    code: requiredText(source.code, `departments[${index}].code`),
    name: requiredText(source.name, `departments[${index}].name`),
    collegeCode: requiredText(source.collegeCode, `departments[${index}].collegeCode`)
  }));

  if (!Array.isArray(programSources) || programSources.length === 0) {
    throw new Error("programs.json must contain at least one program.");
  }

  const programs = programSources.map((source, index) => ({
    ...source,
    code: requiredText(source.code, `programs[${index}].code`),
    name: requiredText(source.name, `programs[${index}].name`),
    codeNormalized: canonicalIdentifier(source.code)
  }));
  const normalizedCodes = programs.map((program) => program.codeNormalized);
  if (new Set(normalizedCodes).size !== normalizedCodes.length) {
    throw new Error("Program codes must be unique after canonical normalization.");
  }

  const unresolved = programs.flatMap((program) =>
    ["departmentCode", "durationYears", "termsPerYear"]
      .filter((field) => program[field] === null || program[field] === undefined)
      .map((field) => `${program.code}.${field}`)
  );

  return {
    college,
    departments,
    programs,
    readyForDatabase: unresolved.length === 0,
    unresolved,
    subjects: []
  };
}

async function runCli() {
  const plan = await loadAcademicSeedPlan();
  process.stdout.write(
    `${JSON.stringify(
      {
        college: plan.college.name,
        programs: plan.programs.map((program) => program.code),
        readyForDatabase: plan.readyForDatabase,
        unresolved: plan.unresolved,
        note: "Planning validation only; no database writes are implemented."
      },
      null,
      2
    )}\n`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
