import { createDatabase } from "./server/db.mjs";
async function run() {
  const prisma = createDatabase();
  const admin = await prisma.user.findFirst({
    where: { username: "administrator.demo" },
    include: {
      userRoles: {
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } }
          }
        }
      }
    }
  });
  console.log("Admin Roles:", admin.userRoles.map(ur => ur.role.slug));
  const perms = admin.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.slug));
  console.log("Admin Perms:", perms);
  await prisma.$disconnect();
}
run().catch(console.error);
