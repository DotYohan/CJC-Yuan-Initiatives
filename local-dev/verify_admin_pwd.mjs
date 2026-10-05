import { createDatabase } from "../server/db.mjs";
import { verifyPassword } from "../server/security.mjs";

const prisma = createDatabase();

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: "administrator.demo" },
    select: { username: true, passwordHash: true }
  });

  if (!user) {
    console.log("No administrator.demo user found");
    return;
  }

  const candidates = [
    "Password123!",
    "Password123!@#",
    "Admin123!",
    "Admin123!@#",
    "password123",
    "password"
  ];

  for (const pwd of candidates) {
    const valid = await verifyPassword(pwd, user.passwordHash);
    console.log(`Password "${pwd}": ${valid ? "MATCH! ✅" : "No"}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
