import { createDatabase } from "../server/db.mjs";
import { ClubStore } from "../server/club-store.mjs";

async function testAppointOfficer() {
  const prisma = createDatabase();
  const clubStore = new ClubStore(prisma);

  try {
    // Find an active club account
    const club = await prisma.club.findFirst({
      where: { status: "ACTIVE" },
      include: { user: true }
    });
    console.log("Found club:", club?.name, "User:", club?.user?.username, club?.userId);

    // Find a student
    const student = await prisma.student.findFirst({
      select: { id: true, studentNumber: true, firstName: true, lastName: true }
    });
    console.log("Found student:", student?.studentNumber, student?.firstName, student?.lastName);

    // Test validation
    const validation = await clubStore.validateStudentForOfficer(club.userId, student.studentNumber);
    console.log("Validation result:", validation);

    // Test assignOfficer with studentIdNumber
    const officer1 = await clubStore.assignOfficer(club.userId, {
      studentIdNumber: student.studentNumber,
      position: "Vice President",
      canClearClearance: true
    });
    console.log("Appointed officer via studentIdNumber:", officer1.position, officer1.canClearClearance);

    // Test assignOfficer with studentId (UUID)
    const officer2 = await clubStore.assignOfficer(club.userId, {
      studentId: student.id,
      position: "President",
      canClearClearance: true
    });
    console.log("Appointed officer via studentId (UUID):", officer2.position, officer2.canClearClearance);

    // Test assignOfficer with studentId as student number
    const officer3 = await clubStore.assignOfficer(club.userId, {
      studentId: student.studentNumber,
      position: "Executive Secretary",
      canClearClearance: false
    });
    console.log("Appointed officer via studentId as number:", officer3.position, officer3.canClearClearance);

    console.log("ALL OFFICER APPOINTMENT TESTS PASSED!");
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testAppointOfficer();
