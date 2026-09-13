import { createDatabase } from "../../../server/db.mjs";
import { newId } from "../../../server/security.mjs";

const prisma = createDatabase();
const academicYearCode = "2026-2027";
const termCode = "2026-2027-1";

async function main() {
  const academicYear = await prisma.academicYear.upsert({
    where: { code: academicYearCode },
    update: { status: "ENROLLMENT_OPEN" },
    create: {
      id: newId(),
      code: academicYearCode,
      name: "Academic Year 2026–2027",
      startsOn: new Date("2026-08-01"),
      endsOn: new Date("2027-05-31"),
      status: "ENROLLMENT_OPEN"
    }
  });

  const term = await prisma.academicTerm.upsert({
    where: { code: termCode },
    update: { status: "ENROLLMENT_OPEN" },
    create: {
      id: newId(),
      academicYearId: academicYear.id,
      code: termCode,
      name: "First Semester, AY 2026–2027",
      termNumber: 1,
      startsOn: new Date("2026-08-01"),
      endsOn: new Date("2026-12-31"),
      enrollmentStarts: new Date("2026-08-01T00:00:00Z"),
      enrollmentEnds: new Date("2026-12-31T23:59:59Z"),
      status: "ENROLLMENT_OPEN"
    }
  });

  console.log(`Demo enrollment term ready: ${term.code}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
