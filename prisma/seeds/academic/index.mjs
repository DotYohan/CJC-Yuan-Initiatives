import { readFile } from "node:fs/promises";

export async function loadAcademicCatalogSeedPlan() {
  const prospectus = JSON.parse(await readFile(new URL("./data/ece-prospectus-2023-24.json", import.meta.url), "utf8"));
  const requirements = prospectus.subjects.reduce(
    (count, subject) => count + (subject.prerequisites?.length || 0) + (subject.corequisites?.length || 0),
    0
  );
  return {
    subjects: prospectus.subjects,
    curricula: [prospectus.curriculum],
    curriculumSubjects: prospectus.subjects.length,
    subjectRequirements: requirements,
    readyForDatabase: prospectus.subjects.length === 68,
    unresolved: prospectus.subjects.filter((subject) => subject.standingRequirement).map(
      (subject) => `${subject.code}: ${subject.standingRequirement} is enforced by curriculum year placement.`
    )
  };
}
