import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();
await prisma.userDepartmentAssignment.deleteMany({ where: { user: { username: "CJCCOESA" } } });
await prisma.userRole.deleteMany({ where: { user: { username: "CJCCOESA" } } });
await prisma.user.deleteMany({ where: { username: "CJCCOESA" } });
console.log("Cleaned up CJCCOESA test user");
await prisma.$disconnect();
