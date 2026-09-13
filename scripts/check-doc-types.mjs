import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();

async function main() {
  const docTypes = await prisma.documentType.findMany({
    orderBy: { sortOrder: "asc" }
  });
  console.log("Document Types:", JSON.stringify(docTypes, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
