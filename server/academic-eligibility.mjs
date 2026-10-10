const finalGradeStatuses = new Set(["APPROVED", "POSTED"]);

export function isIncompleteGrade(grade) {
  return String(grade?.letterGrade ?? "").trim().toUpperCase() === "INC"
    || String(grade?.remarks ?? "").toUpperCase().includes("INCOMPLETE");
}

export function isPassingGrade(grade) {
  if (!grade) return false;
  if (isIncompleteGrade(grade)) return false;
  if (grade.isPassing === true) return true;

  const num = grade.numericGrade !== null && grade.numericGrade !== undefined ? Number(grade.numericGrade) : null;
  if (num !== null && !Number.isNaN(num)) {
    // Philippine collegiate scale: 1.00 to 3.00 is passing (1.0 is highest/excellent, 3.0 is lowest passing, 5.0 is failing)
    if (num >= 1.0 && num <= 3.0) return true;
    // Standard percentage scale: 75 to 100 is passing
    if (num >= 75 && num <= 100) return true;
    return false;
  }

  const letter = String(grade.letterGrade ?? "").trim().toUpperCase();
  if (["P", "PASSED", "PASS"].includes(letter)) return true;
  const parsedLetter = parseFloat(letter);
  if (!Number.isNaN(parsedLetter)) {
    if (parsedLetter >= 1.0 && parsedLetter <= 3.0) return true;
    if (parsedLetter >= 75 && parsedLetter <= 100) return true;
  }

  return false;
}

export function buildAcademicRecordIndex(history = []) {
  const latest = new Map();
  for (const record of history) {
    const subjectId = record.subjectId ?? record.courseOffering?.subjectId ?? record.courseOffering?.subject?.id;
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
    states.set(subjectId, isIncompleteGrade(grade) ? "INC" : isPassingGrade(grade) ? "PASSED" : "FAILED");
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

export function requirementEligibility(requirements = [], academicRecords) {
  return requirements.map((requirement) => {
    const state = prerequisiteState(requirement.requiredSubject.id, academicRecords);
    return {
      type: requirement.type,
      requiredSubject: requirement.requiredSubject,
      state,
      eligible: state === "PASSED"
    };
  });
}
