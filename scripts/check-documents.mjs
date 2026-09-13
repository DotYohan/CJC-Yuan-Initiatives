import { createDatabase } from "../server/db.mjs";

const prisma = createDatabase();

async function main() {
  const docs = await prisma.studentDocument.findMany({
    select: {
      id: true,
      studentId: true,
      admissionApplicationId: true,
      documentType: true,
      fileName: true,
      storageKey: true,
      status: true,
      submittedAt: true,
      verifiedAt: true,
      remarks: true
    }
  });
  console.log(JSON.stringify(docs, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
