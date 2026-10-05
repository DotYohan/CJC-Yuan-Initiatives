import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();
async function run() {
  const users = await prisma.user.findMany({
    where: { email: { not: null }, deletedAt: null },
    select: { email: true, userRoles: { include: { role: true } } }
  });
  const domains = new Set();
  for (const u of users) {
    if (u.email) {
      const parts = u.email.split("@");
      if (parts[1]) domains.add(parts[1].toLowerCase());
    }
  }
  console.log("Distinct email domains:", Array.from(domains));
}
run().catch(console.error).finally(() => prisma.$disconnect());
