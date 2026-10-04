import { buildAcademicRecordIndex, prerequisiteState } from "./academic-eligibility.mjs";

const fullName = (person) => [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" ");
const finalGrades = { status: { in: ["APPROVED", "POSTED"] }, OR: [{ gradingPeriod: { isFinal: true } }, { gradingPeriod: { type: "COMPLETION" } }] };

export function reviewError(code, details) {
  return Object.assign(new Error(code), { details });
}

// Always resolve saved selections on the server. Older submissions may contain
// Subject IDs instead of CurriculumSubject IDs and may not yet have curriculumId.
export async function buildApplicationReview(database, applicationId, programId) {
  const application = await database.enrollmentApplication.findFirst({
    where: { id: applicationId, ...(programId ? { programId } : {}) },
    include: {
      student: { select: { id: true, userId: true, studentNumber: true, firstName: true, middleName: true, lastName: true, suffix: true } },
      program: { select: { id: true, code: true, name: true } },
      academicTerm: { select: { id: true, code: true, name: true, termNumber: true, startsOn: true, academicYear: { select: { id: true, code: true, name: true } } } }
    }
  });
  if (!application) throw reviewError("ENROLLMENT_APPLICATION_NOT_FOUND");
  const rawIds = application.formData?.selection?.subjectIds;
  const ids = Array.isArray(rawIds) ? rawIds : [];
  const curricula = await database.curriculum.findMany({
    where: { programId: application.programId, ...(application.curriculumId ? { id: application.curriculumId } : {}) },
    orderBy: [{ effectiveFromYear: "desc" }, { version: "desc" }],
    include: { subjects: { include: { subject: { include: { requirements: { include: { requiredSubject: { select: { id: true, code: true, title: true } } } } } } } } }
  });
  const matches = (curriculum) => ids.length && ids.every((id) => curriculum.subjects.some((item) => item.id === id || item.subjectId === id));
  // A placement UUID unambiguously identifies the originally selected version.
  const curriculum = curricula.find((item) => matches(item) && item.subjects.some((subject) => ids.includes(subject.id)))
    ?? curricula.find(matches) ?? (application.curriculumId ? curricula[0] : null);
  const placements = curriculum?.subjects.filter((item) => ids.includes(item.id) || ids.includes(item.subjectId)) ?? [];
  const issues = [];
  const issue = (code, message, subjectId) => issues.push({ code, message, subjectId, blocking: true });
  if (!ids.length) issue("SUBJECT_SELECTION_REQUIRED", "Select at least one curriculum subject.");
  if (!curriculum || ids.some((id) => !placements.some((item) => item.id === id || item.subjectId === id))) {
    issue("SUBJECT_SELECTION_INVALID", "The saved subjects could not be resolved within the selected program and curriculum.");
  }
  if (placements.length !== ids.length || new Set(ids).size !== ids.length) {
    issue("DUPLICATE_SUBJECT_SELECTION", "Select each subject only once.");
  }
  const history = await database.enrollmentItem.findMany({
    where: {
      enrollment: { studentId: application.studentId, status: { in: ["ENROLLED", "COMPLETED"] } },
      courseOffering: { academicTerm: { startsOn: { lt: application.academicTerm.startsOn } } },
      grades: { some: finalGrades }
    },
    select: { courseOffering: { select: { subject: { select: { id: true, code: true } } } }, grades: { where: finalGrades, select: { status: true, isPassing: true, numericGrade: true, letterGrade: true, remarks: true, updatedAt: true } } }
  });
  const records = buildAcademicRecordIndex(history);
  for (const [subjectId, state] of records) {
    if (state === "INC") issue("INC_RESTRICTION", `${history.find((item) => item.courseOffering.subject.id === subjectId)?.courseOffering.subject.code ?? "A previous subject"} has an unresolved INC grade.`, subjectId);
  }
  const duplicates = await database.enrollmentItem.findMany({
    where: {
      enrollment: { studentId: application.studentId, academicTermId: application.academicTermId, status: { notIn: ["CANCELLED", "WITHDRAWN"] } },
      status: { in: ["PENDING", "ENROLLED", "COMPLETED"] },
      courseOffering: { subjectId: { in: placements.map((item) => item.subjectId) } }
    }, select: { courseOffering: { select: { subjectId: true } } }
  });
  const selectedSubjects = new Set(placements.map((item) => item.subjectId));
  for (const item of placements) {
    if (item.yearLevel !== application.yearLevel || item.termNumber !== application.academicTerm.termNumber) {
      issue("SUBJECT_SELECTION_INVALID", `${item.subject.code} does not match the saved year and term.`, item.subjectId);
    }
    if (duplicates.some((duplicate) => duplicate.courseOffering.subjectId === item.subjectId)) {
      issue("DUPLICATE_ENROLLMENT", `${item.subject.code} is already registered for this term.`, item.subjectId);
    }
    for (const requirement of item.subject.requirements) {
      const state = prerequisiteState(requirement.requiredSubject.id, records);
      if (state === "PASSED") continue;
      if (requirement.type === "COREQUISITE" && selectedSubjects.has(requirement.requiredSubject.id)) continue;
      issue(requirement.type === "PREREQUISITE" ? "PREREQUISITE_NOT_MET" : "COREQUISITE_NOT_MET",
        `${item.subject.code} requires ${requirement.requiredSubject.code} (${state.replaceAll("_", " ").toLowerCase()}).`, item.subjectId);
    }
  }
  const totalUnits = placements.reduce((sum, item) => sum + Number(item.creditUnits), 0);
  if (totalUnits > 29) issue("MAX_UNITS_EXCEEDED", `Selected load is ${totalUnits} units; the maximum is 29.`);
  return {
    application: { ...application, student: { ...application.student, name: fullName(application.student) } },
    curriculum: curriculum ? { id: curriculum.id, code: curriculum.code, name: curriculum.name, version: curriculum.version } : null,
    items: placements.map((item) => ({
      id: item.id, subjectId: item.subjectId, subject: { id: item.subjectId, code: item.subject.code, title: item.subject.title },
      creditUnits: Number(item.creditUnits), yearLevel: item.yearLevel, termNumber: item.termNumber,
      issues: issues.filter((entry) => entry.subjectId === item.subjectId)
    })),
    totalUnits, maximumUnits: 29, issues, blockingIssues: issues, canApprove: issues.length === 0
  };
}

export async function applicationOfferingChoices(database, review) {
  if (!review.curriculum) return [];
  const offerings = await database.courseOffering.findMany({
    where: {
      academicTermId: review.application.academicTermId, status: "OPEN",
      subjectId: { in: review.items.map((item) => item.subjectId) },
      classSection: { is: {
        academicTermId: review.application.academicTermId, programId: review.application.programId,
        curriculumId: review.curriculum.id, yearLevel: review.application.yearLevel, isActive: true
      } }
    },
    orderBy: { offeringCode: "asc" },
    include: {
      classSection: { select: { id: true, code: true, capacity: true } },
      faculty: {
        select: {
          role: true,
          faculty: {
            select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true }
          }
        }
      },
      schedules: {
        select: {
          id: true, weekday: true, startsAt: true, endsAt: true,
          room: { select: { id: true, code: true, building: true } }
        }
      },
      _count: { select: { enrollmentItems: { where: { status: { in: ["PENDING", "ENROLLED", "COMPLETED"] }, enrollment: { status: { notIn: ["CANCELLED", "WITHDRAWN"] } } } } } }
    }
  });
  return offerings.map((item) => {
    const limits = [item.capacity, item.classSection?.capacity].filter((value) => value != null);
    const capacity = limits.length ? Math.min(...limits) : null;
    const instructorNames = (item.faculty || []).map((f) => fullName(f.faculty)).filter(Boolean);
    const instructor = instructorNames.length ? instructorNames.join(", ") : "TBA";
    const scheduleParts = (item.schedules || []).map((s) => {
      const day = s.weekday;
      const start = s.startsAt instanceof Date ? s.startsAt.toISOString().slice(11, 16) : String(s.startsAt || "").slice(0, 5);
      const end = s.endsAt instanceof Date ? s.endsAt.toISOString().slice(11, 16) : String(s.endsAt || "").slice(0, 5);
      const room = s.room?.code ? ` (${s.room.code})` : "";
      return `${day} ${start}-${end}${room}`;
    });
    const schedule = scheduleParts.length ? scheduleParts.join("; ") : "TBA";
    return {
      id: item.id, subjectId: item.subjectId, offeringCode: item.offeringCode, sectionCode: item.classSection?.code || item.offeringCode,
      instructor,
      schedule,
      capacity, availableSeats: capacity == null ? null : Math.max(0, capacity - item._count.enrollmentItems),
      available: capacity == null || item._count.enrollmentItems < capacity
    };
  });
}
