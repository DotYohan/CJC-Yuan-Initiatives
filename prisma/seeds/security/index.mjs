import { PERMISSION_SEEDS, ROLE_PERMISSION_SEEDS, ROLE_SEEDS } from "../../catalog.mjs";

export function loadSecuritySeedPlan() {
  return {
    roles: ROLE_SEEDS,
    permissions: PERMISSION_SEEDS,
    rolePermissions: ROLE_PERMISSION_SEEDS
  };
}

export async function seedSecurityCatalog(prisma) {
  return prisma.$transaction(async (transaction) => {
    const roles = new Map();
    for (const definition of ROLE_SEEDS) {
      const role = await transaction.role.upsert({
        where: { slug: definition.slug },
        update: {
          name: definition.name,
          description: definition.description,
          landingPath: definition.landingPath,
          isSystem: true
        },
        create: { ...definition, isSystem: true }
      });
      roles.set(role.slug, role);
    }

    const permissions = new Map();
    for (const definition of PERMISSION_SEEDS) {
      const permission = await transaction.permission.upsert({
        where: { slug: definition.slug },
        update: { description: definition.description, isSystem: true },
        create: { ...definition, isSystem: true }
      });
      permissions.set(permission.slug, permission);
    }

    await transaction.rolePermission.createMany({
      data: ROLE_PERMISSION_SEEDS.map((grant) => ({
        roleId: roles.get(grant.roleSlug).id,
        permissionId: permissions.get(grant.permissionSlug).id,
        grantedByUserId: null
      })),
      skipDuplicates: true
    });

    return {
      roles: roles.size,
      permissions: permissions.size,
      grants: ROLE_PERMISSION_SEEDS.length
    };
  });
}
