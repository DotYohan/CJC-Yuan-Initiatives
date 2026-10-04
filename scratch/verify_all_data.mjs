import { createDatabase } from "../server/db.mjs";

const db = createDatabase();

async function main() {
  const student = await db.student.findFirst({
    where: { studentNumber: { contains: "00005" } },
    include: {
      user: true,
      program: true,
      enrollments: {
        include: {
          items: {
            include: {
              courseOffering: { include: { subject: true } },
              grades: true
            }
          }
        }
      },
      enrollmentApplications: true
    }
  });

  console.log("=== COMPLETE DATABASE VERIFICATION ===");
  console.log("Student ID:", student.id);
  console.log("Student Name:", student.user.fullName);
  console.log("Student Number:", student.studentNumber);
  console.log("Assigned Program:", student.program.code, "-", student.program.name);
  console.log("Current Year Level:", student.currentYearLevel);
  console.log("\nEnrollments Count:", student.enrollments.length);
  for (const e of student.enrollments) {
    console.log(`- Enrollment [${e.id}] Status: ${e.status}, Items: ${e.items.length}`);
    for (const item of e.items) {
      const g = item.grades[0];
      console.log(`    ${item.courseOffering.subject.code.padEnd(12)} ${item.courseOffering.subject.title.padEnd(30)} | Grade: ${String(g?.gradeValue).padEnd(5)} Numeric: ${String(g?.numericGrade).padEnd(5)} Passing: ${g?.isPassing}`);
    }
  }

  console.log("\nEnrollment Applications Count:", student.enrollmentApplications.length);
  for (const app of student.enrollmentApplications) {
    console.log(`- App [${app.id}] Status: ${app.status}, Term: ${app.academicTermId}, Year Level: ${app.yearLevel}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
