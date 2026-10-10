import { createDatabase } from "../server/db.mjs";
import { EnrollmentApplicationStore } from "../server/enrollment-store.mjs";

const db = createDatabase();
const store = new EnrollmentApplicationStore(db);

async function main() {
  const student = await db.student.findFirst({
    where: { studentNumber: { contains: "00005" } }
  });

  const appData = await store.getForUser(student.userId);
  const options = await store.options(student.userId);

  console.log("=== SIMULATING PORTAL POPULATION ===");
  const application = appData.application;
  const profile = appData.profile;

  // Simulate populateEnrollmentOptions
  const assignedProgram = (options?.programs || []).find((item) => item.id === options?.studentContext?.programId);
  let programSelectValue = assignedProgram ? assignedProgram.id : "";
  const openTerm = (options?.terms || []).find((item) => item.enrollmentOpen) || (options?.terms || [])[0];
  let termSelectValue = openTerm ? openTerm.id : "";
  let yearSelectValue = String(options?.studentContext?.currentYearLevel || "1");

  console.log("After populateEnrollmentOptions:");
  console.log("- Program Select Value:", programSelectValue, `(${assignedProgram?.code})`);
  console.log("- Term Select Value:", termSelectValue, `(${openTerm?.name})`);
  console.log("- Year Select Value:", yearSelectValue);
  console.log("- Program Locked:", assignedProgram ? "true (LOCKED)" : "false");
  console.log("- Year Locked: false (SELECTABLE)");

  // Simulate fillEnrollmentForm
  if (application) {
    if (application.programId) programSelectValue = application.programId;
    if (application.academicTermId) termSelectValue = application.academicTermId;
    if (application.yearLevel) yearSelectValue = String(application.yearLevel);
  } else {
    if (options?.studentContext?.programId) programSelectValue = options.studentContext.programId;
    if (profile?.currentYearLevel) yearSelectValue = String(profile.currentYearLevel);
    if (openTerm && !termSelectValue) termSelectValue = openTerm.id;
  }

  console.log("\nAfter fillEnrollmentForm:");
  console.log("- Program Select Value:", programSelectValue);
  console.log("- Term Select Value:", termSelectValue);
  console.log("- Year Select Value:", yearSelectValue);

  // Filter available subjects
  const available = (options?.curriculumSubjects || []).filter((item) => (
    item.academicTermId === termSelectValue
    && item.programId === programSelectValue
    && Number(item.yearLevel) === Number(yearSelectValue)
    && Number(item.termNumber) === Number(openTerm?.termNumber)
  ));

  console.log("\nAvailable Subjects Rendered (Count: " + available.length + "):");
  for (const s of available) {
    const reqs = s.requirements || s.prerequisites || [];
    const blocked = reqs.filter((r) => r.type !== "COREQUISITE" && !r.eligible);
    const buttonState = blocked.length ? "Prerequisite required" : "Add to cart";
    console.log(`- ${s.subjectCode.padEnd(12)} ${s.subjectTitle.padEnd(30)} [${buttonState}]`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
