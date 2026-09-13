import { createDatabase } from "../../../server/db.mjs";
import { createConfig } from "../../../server/config.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../../../server/security.mjs";
import { ROLE_SEEDS } from "../../catalog.mjs";

const prisma = createDatabase();
const config = createConfig();
const password = "DemoStudent1234!";

async function main() {
  const passwordHash = await hashPassword(password, config.scrypt);
  const accounts = [];

  for (const roleDefinition of ROLE_SEEDS) {
    const username = `${roleDefinition.slug.replaceAll("_", "-")}.demo`;
    const email = `${username}@cjc.invalid`;
    const role = await prisma.role.findUniqueOrThrow({ where: { slug: roleDefinition.slug } });
    const existingUser = await prisma.user.findUnique({
      where: { usernameNormalized: normalizeIdentifier(username) }
    });
    const user = existingUser ?? await prisma.user.create({
      data: {
        id: newId(),
        username,
        usernameNormalized: normalizeIdentifier(username),
        displayName: `${roleDefinition.name} Demo Account`,
        email,
        emailNormalized: normalizeIdentifier(email),
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        displayName: `${roleDefinition.name} Demo Account`
      }
    });
    await prisma.userRole.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: { isPrimary: true },
      create: { userId: user.id, roleId: role.id, isPrimary: true }
    });
    accounts.push({ role: roleDefinition.name, username, email });
  }

  console.log(JSON.stringify({ password, accounts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
