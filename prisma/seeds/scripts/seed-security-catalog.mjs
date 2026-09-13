import { createDatabase } from "../../../server/db.mjs";
import { seedSecurityCatalog } from "../security/index.mjs";

const prisma = createDatabase();

try {
  const result = await seedSecurityCatalog(prisma);
  process.stdout.write(
    `Security catalog ready: ${result.roles} roles, ${result.permissions} permissions, ${result.grants} grants.\n`
  );
} finally {
  await prisma.$disconnect();
}
