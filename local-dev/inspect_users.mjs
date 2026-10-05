import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();
async function run() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, userRoles: { include: { role: true } } },
    take: 20
  });
  console.log("Sample users:");
  for (const u of users) {
    console.log(u.username, "|", u.email, "|", u.userRoles.map((r) => r.role.slug).join(", "));
  }
  const students = await prisma.student.findMany({
    select: { studentNumber: true, institutionalEmail: true },
    take: 5
  });
  console.log("\nSample students:");
  for (const s of students) {
    console.log(s.studentNumber, "|", s.institutionalEmail);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
