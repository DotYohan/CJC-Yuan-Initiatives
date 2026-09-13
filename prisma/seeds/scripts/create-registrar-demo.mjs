import { createDatabase } from "../../../server/db.mjs";
import { createConfig } from "../../../server/config.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../../../server/security.mjs";
import { seedAuthorizationCatalog } from "../../seed.mjs";

const prisma = createDatabase();
const config = createConfig();
const username = "registrar.demo";
const email = "registrar@g.cjc.edu.ph";
const password = "Cjc123456!!!";

async function main() {
  await seedAuthorizationCatalog(prisma);
  const role = await prisma.role.findUniqueOrThrow({ where: { slug: "registrar" } });
  const passwordHash = await hashPassword(password, config.scrypt);
  const user = await prisma.$transaction(async (transaction) => {
    const current = await transaction.user.findUnique({ where: { usernameNormalized: normalizeIdentifier(username) } });
    const updated = current
      ? await transaction.user.update({
          where: { id: current.id },
          data: {
            email,
            emailNormalized: normalizeIdentifier(email),
            passwordHash,
            mustChangePassword: true,
            status: "ACTIVE",
            authorizationVersion: { increment: 1 }
          }
        })
      : await transaction.user.create({
          data: {
            id: newId(),
            username,
            usernameNormalized: normalizeIdentifier(username),
            displayName: "Registrar Demo Account",
            email,
            emailNormalized: normalizeIdentifier(email),
            passwordHash,
            status: "ACTIVE",
            mustChangePassword: true
          }
        });
    await transaction.userRole.updateMany({ where: { userId: updated.id }, data: { isPrimary: false } });
    await transaction.userRole.upsert({
      where: { userId_roleId: { userId: updated.id, roleId: role.id } },
      update: { isPrimary: true },
      create: { userId: updated.id, roleId: role.id, isPrimary: true }
    });
    await transaction.session.updateMany({ where: { userId: updated.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return updated;
  });
  console.log(JSON.stringify({ username: user.username, email: user.email, password, role: role.slug, mustChangePassword: true }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
