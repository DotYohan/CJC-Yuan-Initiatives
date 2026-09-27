import { createDatabase } from "./server/db.mjs";
import { hashPassword } from "./server/security.mjs";

async function setPasswords() {
  const prisma = createDatabase();
  const hash = await hashPassword("Password123!", { N: 16384, r: 8, p: 1, keyLength: 32 });
  
  const updated = await prisma.user.updateMany({
    where: { username: { in: ["registrar.demo", "administrator.demo", "program-head.demo", "student.demo"] } },
    data: { passwordHash: hash }
  });
  console.log("Updated accounts: " + updated.count);
  
  const users = await prisma.user.findMany({
    where: { username: { endsWith: ".demo" } },
    select: { username: true }
  });
  console.log("Demo accounts: ", users.map(u => u.username).join(", "));
  
  await prisma.$disconnect();
}
setPasswords().catch(console.error);
