import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAcademicRecordIndex, prerequisiteEligibility } from "../server/academic-eligibility.mjs";

const requirement = {
  type: "PREREQUISITE",
  requiredSubject: { id: "pre-1", code: "PRE-101", title: "Prerequisite" }
};

function stateFor(grade) {
  const records = buildAcademicRecordIndex([{
    subjectId: "pre-1",
    grades: grade ? [{ status: "POSTED", updatedAt: "2026-01-01T00:00:00.000Z", ...grade }] : []
  }]);
  return prerequisiteEligibility([requirement], records)[0];
}

test("prerequisite eligibility follows academic grade state", () => {
  assert.deepEqual(stateFor({ letterGrade: "1.75", isPassing: true }), { requiredSubject: requirement.requiredSubject, state: "PASSED", eligible: true });
  assert.equal(stateFor({ letterGrade: "5.0", isPassing: false }).state, "FAILED");
  assert.equal(stateFor({ letterGrade: "INC", isPassing: false }).state, "INC");
  assert.equal(stateFor(null).state, "NOT_TAKEN");
});

test("a posted completion grade replaces an earlier incomplete result", () => {
  const records = buildAcademicRecordIndex([{
    subjectId: "pre-1",
    grades: [
      { status: "POSTED", letterGrade: "INC", isPassing: false, updatedAt: "2026-01-01T00:00:00.000Z" },
      { status: "POSTED", letterGrade: "2.00", isPassing: true, updatedAt: "2026-02-01T00:00:00.000Z" }
    ]
  }]);
  assert.equal(prerequisiteEligibility([requirement], records)[0].state, "PASSED");
});

test("INC remains blocking even if a source row incorrectly marks it passing", () => {
  assert.deepEqual(stateFor({ letterGrade: "INC", isPassing: true }), { requiredSubject: requirement.requiredSubject, state: "INC", eligible: false });
});

test("resolves subjectId from courseOffering.subjectId structure", () => {
  const records = buildAcademicRecordIndex([{
    courseOffering: { subjectId: "pre-1" },
    grades: [{ status: "POSTED", numericGrade: 1.0, isPassing: true, updatedAt: "2026-01-01T00:00:00.000Z" }]
  }]);
  assert.equal(prerequisiteEligibility([requirement], records)[0].state, "PASSED");
  assert.equal(prerequisiteEligibility([requirement], records)[0].eligible, true);
});

test("program-scoped subjects with the same code keep prerequisite results independent", () => {
  const bseceRequirement = {
    type: "PREREQUISITE",
    requiredSubject: { id: "bsece-emath-111", code: "EMath 111", title: "Calculus 1" }
  };
  const bsceRequirement = {
    type: "PREREQUISITE",
    requiredSubject: { id: "bsce-emath-111", code: "EMath 111", title: "Calculus 1 (Differential Calculus)" }
  };
  const records = buildAcademicRecordIndex([
    { subjectId: "bsece-emath-111", grades: [{ status: "POSTED", letterGrade: "2.00", isPassing: true, updatedAt: "2026-01-01T00:00:00.000Z" }] },
    { subjectId: "bsce-emath-111", grades: [{ status: "POSTED", letterGrade: "5.00", isPassing: false, updatedAt: "2026-01-01T00:00:00.000Z" }] }
  ]);

  assert.equal(prerequisiteEligibility([bseceRequirement], records)[0].eligible, true);
  assert.equal(prerequisiteEligibility([bsceRequirement], records)[0].eligible, false);
  assert.equal(prerequisiteEligibility([bsceRequirement], records)[0].state, "FAILED");
});

test("evaluates Philippine collegiate grading scale (1.00 - 3.00 is passing, 5.0 is failing)", () => {
  // 1.00 is highest honor / passing, even if legacy row had isPassing: false
  assert.equal(stateFor({ numericGrade: 1, isPassing: false }).state, "PASSED");
  assert.equal(stateFor({ numericGrade: 1.0, isPassing: true }).state, "PASSED");
  assert.equal(stateFor({ numericGrade: 2.25, isPassing: true }).state, "PASSED");
  assert.equal(stateFor({ numericGrade: 3.0, isPassing: true }).state, "PASSED");
  // 5.0 is failing
  assert.equal(stateFor({ numericGrade: 5.0, isPassing: false }).state, "FAILED");
  assert.equal(stateFor({ numericGrade: 5, isPassing: false }).eligible, false);
});

test("evaluates percentage scale (75 - 100 is passing)", () => {
  assert.equal(stateFor({ numericGrade: 88, isPassing: true }).state, "PASSED");
  assert.equal(stateFor({ numericGrade: 75, isPassing: true }).state, "PASSED");
  assert.equal(stateFor({ numericGrade: 74, isPassing: false }).state, "FAILED");
});
