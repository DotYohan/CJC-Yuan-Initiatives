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
