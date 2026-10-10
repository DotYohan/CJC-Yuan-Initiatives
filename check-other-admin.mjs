import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://cjc_app:your_secure_password@127.0.0.1:5432/cor_jesu_sms"
  })
});

async function main() {
  try {
    await prisma.$connect();
    
    // Check the other admin account
    const adminUser = await prisma.user.findUnique({ 
      where: { usernameNormalized: "admin.7166ba8b" }, 
      select: { id: true, username: true, email: true, status: true } 
    });
    console.log('admin.7166ba8b User:', adminUser);
    
    if (adminUser) {
      const adminRoles = await prisma.userRole.findMany({ 
        where: { userId: adminUser.id }, 
        include: { role: true } 
      });
      console.log('admin.7166ba8b Roles:', adminRoles.map(r => ({ slug: r.role.slug, name: r.role.name, isSystem: r.role.isSystem, isPrimary: r.isPrimary })));
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();