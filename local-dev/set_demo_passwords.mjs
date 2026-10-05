import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { hashPassword } from "../server/security.mjs";

const config = createConfig();
const db = createDatabase(config.db);

async function main() {
  const password = "Password123!@#";
  const passwordHash = await hashPassword(password, config.scrypt);

  const usernames = ["registrar.demo", "administrator.demo", "program-head.demo", "student.demo", "0001"];
  for (const username of usernames) {
    const user = await db.user.findFirst({
      where: { usernameNormalized: username.toLowerCase() }
    });
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false, status: "ACTIVE" }
      });
      console.log(`Updated password for ${username} to: ${password}`);
    } else {
      console.log(`User ${username} not found`);
    }
  }
  await db.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
