import { pathToFileURL } from "node:url";
import { createConfig } from "./config.mjs";
import { createDatabase } from "./db.mjs";
import {
  assertDemoSeedAllowed,
  seedAuthorizationCatalog,
  seedDevelopmentDemoUsers
} from "../prisma/seed.mjs";

export async function seedDemoAccounts({ database, config, password, environment = process.env } = {}) {
  if (!database) throw new Error("seedDemoAccounts requires a Prisma Client instance.");
  return seedDevelopmentDemoUsers(database, { config: config ?? createConfig(), password, environment });
}

async function runCli() {
  assertDemoSeedAllowed();
  const prisma = createDatabase();
  try {
    await seedAuthorizationCatalog(prisma);
    const credentials = await seedDevelopmentDemoUsers(prisma);
    process.stdout.write(`${JSON.stringify(credentials, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
