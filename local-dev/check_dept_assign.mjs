import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();
const rows = await prisma.userDepartmentAssignment.findMany({
  include: { department: true, user: { include: { userRoles: { include: { role: true } } } } }
});
console.log("Current department assignments in DB:", JSON.stringify(rows, null, 2));
await prisma.$disconnect();
