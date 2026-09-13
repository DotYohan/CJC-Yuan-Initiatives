const finalGradeStatuses = new Set(["APPROVED", "POSTED"]);

function isIncompleteGrade(grade) {
  return String(grade?.letterGrade ?? "").trim().toUpperCase() === "INC"
    || String(grade?.remarks ?? "").toUpperCase().includes("INCOMPLETE");
}

export function buildAcademicRecordIndex(history = []) {
  const latest = new Map();
  for (const record of history) {
    const subjectId = record.subjectId ?? record.courseOffering?.subject?.id;
    if (!subjectId) continue;
    for (const grade of record.grades ?? []) {
      if (grade.status && !finalGradeStatuses.has(grade.status)) continue;
      const current = latest.get(subjectId);
      if (!current || new Date(current.updatedAt ?? 0) <= new Date(grade.updatedAt ?? 0)) {
        latest.set(subjectId, grade);
      }
    }
  }

  const states = new Map();
  for (const [subjectId, grade] of latest) {
    states.set(subjectId, isIncompleteGrade(grade) ? "INC" : grade.isPassing === true ? "PASSED" : "FAILED");
  }
  return states;
}

export function prerequisiteState(requiredSubjectId, academicRecords) {
  return academicRecords.get(requiredSubjectId) ?? "NOT_TAKEN";
}

export function prerequisiteEligibility(requirements = [], academicRecords) {
  return requirements
    .filter((requirement) => requirement.type === "PREREQUISITE")
    .map((requirement) => {
      const state = prerequisiteState(requirement.requiredSubject.id, academicRecords);
      return {
        requiredSubject: requirement.requiredSubject,
        state,
        eligible: state === "PASSED"
      };
    });
}
