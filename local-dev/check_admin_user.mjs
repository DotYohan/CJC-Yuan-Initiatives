import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();

async function main() {
  const adminUsers = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            slug: "administrator"
          }
        }
      }
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      userRoles: {
        include: { role: true }
      }
    }
  });

  console.log("Admin users found:", JSON.stringify(adminUsers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
