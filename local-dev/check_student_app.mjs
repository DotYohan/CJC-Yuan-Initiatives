import { createDatabase } from "../server/db.mjs";

const db = createDatabase();

async function main() {
  const keys = Object.keys(db).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log("DB models:", keys);

  // Look for student or admission or enrollment
  const enrollments = await db.enrollmentApplication.findMany({
    include: {
      student: { include: { user: true } },
      program: true,
      academicTerm: true
    }
  });

  console.log(`\nFound ${enrollments.length} enrollment applications:`);
  for (const e of enrollments) {
    console.log({
      id: e.id,
      studentName: e.student?.user?.name,
      studentNumber: e.student?.studentNumber,
      status: e.status,
      program: e.program?.code,
      term: e.academicTerm?.name
    });
  }
}

main().catch(console.error).finally(() => db.$disconnect());
