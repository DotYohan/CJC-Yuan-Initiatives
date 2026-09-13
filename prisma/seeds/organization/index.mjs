import { loadAcademicSeedPlan } from "../../academic/academic-seed.mjs";
export { seedOrganizationAndReferenceData, REQUEST_TYPE_SEEDS } from "./seed-organization.mjs";

export async function loadOrganizationSeedPlan() {
  const legacyPlan = await loadAcademicSeedPlan();
  return {
    colleges: [legacyPlan.college],
    departments: legacyPlan.departments,
    programs: legacyPlan.programs,
    readyForDatabase: legacyPlan.readyForDatabase,
    unresolved: legacyPlan.unresolved
  };
}
