const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const { promisify } = require("util");
const scrypt = promisify(crypto.scrypt);

async function setPasswords() {
  const prisma = new PrismaClient();
  const password = "Password123!";
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const hash = `${salt}:${key.toString("hex")}`;
  
  const updated = await prisma.user.updateMany({
    where: { username: { in: ["registrar.demo", "administrator.demo", "program-head.demo", "student.demo"] } },
    data: { passwordHash: hash }
  });
  console.log("Updated accounts: " + updated.count);
  await prisma.$disconnect();
}
setPasswords().catch(console.error);
