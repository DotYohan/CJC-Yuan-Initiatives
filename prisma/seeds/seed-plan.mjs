import { pathToFileURL } from "node:url";
import { loadAcademicCatalogSeedPlan } from "./academic/index.mjs";
import { loadOrganizationSeedPlan } from "./organization/index.mjs";
import { loadSecuritySeedPlan } from "./security/index.mjs";

export async function loadCompleteSeedPlan() {
  const [organization, academic] = await Promise.all([
    loadOrganizationSeedPlan(),
    Promise.resolve(loadAcademicCatalogSeedPlan())
  ]);
  const security = loadSecuritySeedPlan();
  return {
    organization,
    academic,
    security: {
      roleCount: security.roles.length,
      permissionCount: security.permissions.length,
      rolePermissionCount: security.rolePermissions.length
    },
    readyForDatabase: organization.readyForDatabase && academic.readyForDatabase
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify(await loadCompleteSeedPlan(), null, 2)}\n`);
}
