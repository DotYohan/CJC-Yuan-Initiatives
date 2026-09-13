import { createDatabase } from "../../../server/db.mjs";

console.log("🚀 Starting database test...\n");

try {
  console.log("🔌 Connecting to database...");
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);
  
  const prisma = createDatabase();
  console.log("✅ Database connected");
  
  console.log("📊 Checking for Program Head role...");
  const role = await prisma.role.findUnique({ where: { slug: "program_head" } });
  if (!role) {
    console.log("❌ Program Head role not found");
    process.exit(1);
  }
  console.log(`✅ Found Program Head role (ID: ${role.id})`);
  
  console.log("👥 Scanning for Program Head users without assignments...");
  const unassigned = await prisma.user.findMany({
    where: {
      userRoles: { some: { roleId: role.id } },
      programAssignments: { none: {} }
    },
    select: {
      id: true,
      username: true,
      displayName: true
    }
  });
  
  console.log(`\n📋 Results: ${unassigned.length} Program Head(s) without assignments\n`);
  
  if (unassigned.length > 0) {
    unassigned.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.displayName} (@${user.username})`);
    });
  } else {
    console.log("✅ All Program Head accounts have valid program assignments.\n");
  }
  
  await prisma.$disconnect();
  console.log("\n✅ Test complete");
  
} catch (error) {
  console.error("\n❌ Error:", error.message);
  console.error(error.stack);
  process.exit(1);
}
