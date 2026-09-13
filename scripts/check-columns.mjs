import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();

async function main() {
  const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'student_documents'`;
  console.log('Columns:', result);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
