import { pathToFileURL } from "node:url";
import { createDatabase } from "../server/db.mjs";
import { createConfig } from "../server/config.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../server/security.mjs";
import { seedAuthorizationCatalog } from "../prisma/seed.mjs";
import { restoreCanonicalPrograms } from "../prisma/seeds/scripts/restore-canonical-programs.mjs";

export async function initializeProductionDatabase(db, config) {
  process.stdout.write("[Init] Ensuring system catalog and canonical reference data...\n");

  // 1. Seed Roles, Permissions, RolePermissions, and Organization Reference Data
  const catalog = await seedAuthorizationCatalog(db);
  process.stdout.write(
    `[Init] Authorization catalog verified: ${catalog.roleCount} roles, ${catalog.permissionCount} permissions.\n`
  );

  // 2. Restore canonical programs (BSECE, BSCOE, BSCE)
  await restoreCanonicalPrograms(db);
  process.stdout.write("[Init] Canonical college, department, and academic programs verified.\n");

  // 3. Ensure a bootstrap administrator account exists if no admin is present
  const adminRole = await db.role.findUnique({ where: { slug: "administrator" } });
  if (adminRole) {
    const existingAdmin = await db.userRole.findFirst({
      where: { roleId: adminRole.id }
    });

    if (!existingAdmin) {
      const adminUsername = process.env.ADMIN_BOOTSTRAP_USERNAME || "admin.init";
      const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@g.cjc.edu.ph";
      const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "AdminCjc2026!#*";
      const passwordHash = await hashPassword(adminPassword, config.scrypt);

      await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: newId(),
            username: adminUsername,
            usernameNormalized: normalizeIdentifier(adminUsername),
            displayName: "System Administrator",
            email: adminEmail,
            emailNormalized: normalizeIdentifier(adminEmail),
            passwordHash,
            status: "ACTIVE",
            mustChangePassword: true
          }
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: adminRole.id,
            isPrimary: true
          }
        });
      });

      process.stdout.write(
        `[Init] Created initial administrator account:\n  Username: ${adminUsername}\n  Email: ${adminEmail}\n  (Password change required on first login)\n`
      );
    } else {
      process.stdout.write("[Init] Administrator account already exists; skipping bootstrap user creation.\n");
    }
  }

  process.stdout.write("[Init] Production database initialization complete.\n");
}

async function runCli() {
  const db = createDatabase();
  const config = createConfig();
  try {
    await initializeProductionDatabase(db, config);
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((err) => {
    process.stderr.write(`[Init Warning] Non-fatal initialization error: ${err.message}\n`);
    // Exit cleanly so startup is not blocked if already initialized
    process.exit(0);
  });
}
