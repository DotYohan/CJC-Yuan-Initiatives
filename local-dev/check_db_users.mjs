import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";

const config = createConfig();
const db = createDatabase(config.db);

async function main() {
  const users = await db.user.findMany({
    select: { id: true, username: true, displayName: true, status: true, userRoles: { include: { role: true } } }
  });
  console.log("Total users in DB:", users.length);
  for (const u of users) {
    const roles = u.userRoles.map(r => r.role.slug).join(", ");
    console.log(`- ${u.username} (${u.displayName}) -> Roles: [${roles}], Status: ${u.status}`);
  }
  await db.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
