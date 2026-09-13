import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ROLE_SEEDS } from "../prisma/catalog.mjs";

export const ROLE_DEFINITIONS = Object.freeze(
  ROLE_SEEDS.map(({ slug, name, landingPath }) => Object.freeze({ slug, name, path: landingPath }))
);

export function createDatabase(options = {}) {
  const { connectionString = process.env.DATABASE_URL, ...clientOptions } = options;
  if (!clientOptions.adapter && !connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma PostgreSQL adapter.");
  }
  const adapter = clientOptions.adapter ?? new PrismaPg({ connectionString });
  return new PrismaClient({ ...clientOptions, adapter });
}
