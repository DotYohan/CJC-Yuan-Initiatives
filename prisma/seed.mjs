import { pathToFileURL } from "node:url";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import {
  auditHash,
  hashPassword,
  newId,
  normalizeIdentifier,
  randomToken,
  validatePassword
} from "../server/security.mjs";
import { PERMISSION_SEEDS, ROLE_PERMISSION_SEEDS, ROLE_SEEDS } from "./catalog.mjs";
import { seedOrganizationAndReferenceData } from "./seeds/organization/index.mjs";

const demoUsername = (role) => `${role.slug.replaceAll("_", "-")}.demo`;
const demoEmail = (role) => `${role.slug.replaceAll("_", "-")}.demo@cjc.invalid`;
const generatedPassword = () => `Demo-${randomToken(15)}-9aA!`;

export function assertDemoSeedAllowed(environment = process.env) {
  if (environment.NODE_ENV === "production") {
    throw new Error("Development demo accounts cannot be seeded when NODE_ENV=production.");
  }
  if (environment.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Development demo seeding requires ALLOW_DEMO_SEED=true.");
  }
}

export async function seedAuthorizationCatalog(prisma) {
  const orgSummary = await seedOrganizationAndReferenceData(prisma);

  const authSummary = await prisma.$transaction(async (transaction) => {
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

    return { roleCount: roles.size, permissionCount: permissions.size };
  });

  return { ...authSummary, ...orgSummary };
}

export async function seedDevelopmentDemoUsers(prisma, options = {}) {
  assertDemoSeedAllowed(options.environment);
  const config = options.config ?? createConfig();
  const sharedPassword = options.password ?? process.env.CJC_DEMO_PASSWORD;
  if (sharedPassword) {
    const passwordError = validatePassword(sharedPassword, config);
    if (passwordError) throw new Error(`CJC_DEMO_PASSWORD is invalid: ${passwordError}`);
  }

  const credentials = [];
  for (const definition of ROLE_SEEDS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { slug: definition.slug } });
    const username = demoUsername(definition);
    const usernameNormalized = normalizeIdentifier(username);
    let user = await prisma.user.findUnique({ where: { usernameNormalized } });
    let password;

    if (!user) {
      password = sharedPassword || generatedPassword();
      const passwordHash = await hashPassword(password, config.scrypt);
      const email = demoEmail(definition);
      const now = new Date();
      user = await prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            id: newId(),
            username,
            usernameNormalized,
            displayName: `${definition.name} Demo Account`,
            email,
            emailNormalized: normalizeIdentifier(email),
            emailVerifiedAt: null,
            passwordHash,
            status: "ACTIVE",
            mustChangePassword: true,
            createdAt: now,
            updatedAt: now
          }
        });
        await transaction.userRole.create({
          data: { userId: created.id, roleId: role.id, isPrimary: true, assignedAt: now }
        });
        await transaction.auditLog.create({
          data: {
            eventType: "account.demo_seeded",
            outcome: "success",
            targetUserId: created.id,
            resourceType: "user",
            resourceId: created.id,
            requestId: newId(),
            ipHash: auditHash("local-prisma-seed", config.auditPepper),
            method: "CLI",
            path: "prisma/seed.mjs",
            metadata: { role: definition.slug },
            createdAt: now
          }
        });
        return created;
      });
      credentials.push({ role: definition.name, username, password, status: "created" });
      continue;
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.userRole.updateMany({
        where: { userId: user.id, isPrimary: true },
        data: { isPrimary: false }
      });
      await transaction.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: { isPrimary: true },
        create: { userId: user.id, roleId: role.id, isPrimary: true }
      });
    });
    credentials.push({ role: definition.name, username, status: "already exists" });
  }
  return credentials;
}

async function runCli() {
  assertDemoSeedAllowed();
  const prisma = createDatabase();
  try {
    const catalog = await seedAuthorizationCatalog(prisma);
    const credentials = await seedDevelopmentDemoUsers(prisma);
    process.stdout.write(
      `Seeded ${catalog.roleCount} roles and ${catalog.permissionCount} permissions.\n` +
        "Development demo accounts (all require a password change):\n\n"
    );
    for (const account of credentials) {
      if (account.status === "created") {
        process.stdout.write(`${account.role.padEnd(24)} ${account.username.padEnd(38)} ${account.password}\n`);
      } else {
        process.stdout.write(`${account.role.padEnd(24)} ${account.username.padEnd(38)} already exists; unchanged\n`);
      }
    }
    process.stdout.write("\nStore generated passwords securely; this command will not show them again.\n");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
