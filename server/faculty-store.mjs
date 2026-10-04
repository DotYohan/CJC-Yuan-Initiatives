/**
 * Faculty Store
 *
 * Encapsulates all teacher-scoped academic queries:
 *   - Resolve faculty profile from a userId
 *   - List assigned course offerings
 *   - View enrolled student roster for an assigned offering
 *   - Save / submit grades for an assigned offering
 *
 * Every query validates that the logged-in user owns the faculty record
 * and is assigned to the offering before returning any data.
 */

import { newId } from "./security.mjs";

export class FacultyStore {
  constructor(database) {
    this.database = database;
  }

  // ── Profile ──────────────────────────────────────────────────────────

  /**
   * Resolve the active Faculty record linked to the logged-in user.
   * Returns null if the user has no active faculty profile.
   */
  async getFacultyProfile(userId) {
    const faculty = await this.database.faculty.findFirst({
      where: { userId, status: "ACTIVE" },
      include: {
        department: {
          include: { college: { select: { id: true, code: true, name: true } } }
        }
      }
    });
    if (!faculty) return null;

    return {
      id: faculty.id,
      userId: faculty.userId,
      employeeNumber: faculty.employeeNumber,
      fullName: [faculty.firstName, faculty.middleName, faculty.lastName, faculty.suffix]
        .filter(Boolean)
        .join(" "),
      college: faculty.department.college,
      departmentId: faculty.departmentId,
      status: faculty.status
    };
  }

  // ── Assigned Classes ─────────────────────────────────────────────────

  /**
   * Return all course offerings assigned to this faculty member,
   * including subject info, schedule, section, and enrolled count.
   */
  async getAssignedOfferings(userId) {
    const faculty = await this._resolveFaculty(userId);

    const assignments = await this.database.facultyCourseAssignment.findMany({
      where: { facultyId: faculty.id },
      include: {
        courseOffering: {
          include: {
            subject: {
              select: { id: true, code: true, title: true }
            },
            classSection: {
              select: { id: true, code: true }
            },
            academicTerm: {
              select: {
                id: true,
                code: true,
                name: true,
                academicYear: { select: { code: true, name: true } }
              }
            },
            schedules: {
              include: {
                room: { select: { code: true, name: true } }
              },
              orderBy: { weekday: "asc" }
            },
            _count: {
              select: {
                enrollmentItems: {
                  where: { status: "ENROLLED" }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return assignments.map((a) => {
      const o = a.courseOffering;
      return {
        assignmentId: a.id,
        role: a.role,
        offeringId: o.id,
        offeringCode: o.offeringCode,
        status: o.status,
        subject: o.subject,
        section: o.classSection
          ? { id: o.classSection.id, code: o.classSection.code }
          : null,
        academicTerm: {
          id: o.academicTerm.id,
          code: o.academicTerm.code,
          name: o.academicTerm.name,
          academicYear: o.academicTerm.academicYear
        },
        capacity: o.capacity,
        creditUnits: o.creditUnits,
        enrolledCount: o._count.enrollmentItems,
        schedules: o.schedules.map((s) => ({
          weekday: s.weekday,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          room: s.room ? { code: s.room.code, name: s.room.name } : null
        }))
      };
    });
  }

  // ── Class Roster ─────────────────────────────────────────────────────

  /**
   * Return the enrolled student list for a specific offering that the
   * faculty member is assigned to.
   *
   * Throws 403 if the faculty is not assigned to the offering.
   */
  async getOfferingRoster(userId, offeringId) {
    const faculty = await this._resolveFaculty(userId);
    await this._validateAssignment(faculty.id, offeringId);

    const items = await this.database.enrollmentItem.findMany({
      where: {
        courseOfferingId: offeringId,
        status: "ENROLLED"
      },
      include: {
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                studentNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
                suffix: true,
                currentYearLevel: true,
                program: {
                  select: { id: true, code: true, name: true }
                }
              }
            }
          }
        },
        grades: {
          select: {
            id: true,
            gradingPeriodId: true,
            numericGrade: true,
            letterGrade: true,
            isPassing: true,
            status: true,
            remarks: true
          }
        }
      },
      orderBy: {
        enrollment: { student: { lastName: "asc" } }
      }
    });

    const offering = await this.database.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        subject: { select: { code: true, title: true } },
        classSection: { select: { code: true } },
        academicTerm: {
          include: {
            gradingPeriods: {
              orderBy: { sequence: "asc" },
              select: { id: true, code: true, name: true, type: true, isFinal: true }
            }
          }
        }
      }
    });

    let gradingPeriods = offering?.academicTerm?.gradingPeriods || [];
    if (gradingPeriods.length === 0 && offering?.academicTermId) {
      const defaultPeriod = await this.database.gradingPeriod.upsert({
        where: {
          academicTermId_code: {
            academicTermId: offering.academicTermId,
            code: "FINAL"
          }
        },
        update: {},
        create: {
          id: newId(),
          academicTermId: offering.academicTermId,
          code: "FINAL",
          name: "Final Grade",
          type: "FINAL",
          sequence: 1,
          isFinal: true
        },
        select: { id: true, code: true, name: true, type: true, isFinal: true }
      });
      gradingPeriods = [defaultPeriod];
    }

    return {
      offering: {
        id: offering.id,
        offeringCode: offering.offeringCode,
        subjectCode: offering.subject.code,
        subjectTitle: offering.subject.title,
        section: offering.classSection?.code || null,
        status: offering.status
      },
      gradingPeriods,
      students: items.map((item) => {
        const s = item.enrollment.student;
        return {
          enrollmentItemId: item.id,
          studentId: s.id,
          studentNumber: s.studentNumber,
          fullName: [s.firstName, s.middleName, s.lastName, s.suffix]
            .filter(Boolean)
            .join(" "),
          firstName: s.firstName,
          lastName: s.lastName,
          program: s.program,
          yearLevel: s.currentYearLevel,
          grades: item.grades
        };
      })
    };
  }

  // ── Grade Management ─────────────────────────────────────────────────

  /**
   * Save or submit grades for a specific offering.
   *
   * @param {string} userId - The logged-in user ID
   * @param {string} offeringId - The course offering ID
   * @param {Array<{enrollmentItemId, gradingPeriodId, numericGrade, letterGrade, remarks}>} gradesData
   * @param {boolean} isSubmit - If true, set status to SUBMITTED instead of DRAFT
   */
  async saveGrades(userId, offeringId, gradesData, isSubmit = false) {
    const faculty = await this._resolveFaculty(userId);
    await this._validateAssignment(faculty.id, offeringId);

    if (!Array.isArray(gradesData) || gradesData.length === 0) {
      const err = new Error("No grade data provided.");
      err.code = "GRADES_EMPTY";
      err.status = 422;
      throw err;
    }

    const targetStatus = isSubmit ? "SUBMITTED" : "DRAFT";
    const now = new Date();

    // Validate all enrollment items belong to this offering
    const enrollmentItemIds = [...new Set(gradesData.map((g) => g.enrollmentItemId))];
    const validItems = await this.database.enrollmentItem.findMany({
      where: {
        id: { in: enrollmentItemIds },
        courseOfferingId: offeringId,
        status: "ENROLLED"
      },
      select: { id: true }
    });
    const validIds = new Set(validItems.map((v) => v.id));

    for (const entry of gradesData) {
      if (!validIds.has(entry.enrollmentItemId)) {
        const err = new Error(
          `Student enrollment item ${entry.enrollmentItemId} is not enrolled in this offering.`
        );
        err.code = "INVALID_ENROLLMENT_ITEM";
        err.status = 422;
        throw err;
      }
    }

    // Validate grade values
    for (const entry of gradesData) {
      if (entry.numericGrade !== null && entry.numericGrade !== undefined) {
        const grade = Number(entry.numericGrade);
        if (Number.isNaN(grade) || grade < 0 || grade > 100) {
          const err = new Error(
            `Invalid grade value: ${entry.numericGrade}. Must be between 0 and 100.`
          );
          err.code = "GRADE_VALUE_INVALID";
          err.status = 422;
          throw err;
        }
      }
    }

    const offering = await this.database.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        academicTerm: {
          include: {
            gradingPeriods: {
              orderBy: { sequence: "asc" }
            }
          }
        }
      }
    });

    if (!offering) {
      const err = new Error("Course offering not found.");
      err.code = "OFFERING_NOT_FOUND";
      err.status = 404;
      throw err;
    }

    let defaultGradingPeriod = offering.academicTerm?.gradingPeriods?.[0];
    if (!defaultGradingPeriod && offering.academicTermId) {
      defaultGradingPeriod = await this.database.gradingPeriod.upsert({
        where: {
          academicTermId_code: {
            academicTermId: offering.academicTermId,
            code: "FINAL"
          }
        },
        update: {},
        create: {
          id: newId(),
          academicTermId: offering.academicTermId,
          code: "FINAL",
          name: "Final Grade",
          type: "FINAL",
          sequence: 1,
          isFinal: true
        }
      });
    }

    return this.database.$transaction(async (tx) => {
      const results = [];

      for (const entry of gradesData) {
        const gradingPeriodId = entry.gradingPeriodId || defaultGradingPeriod?.id;
        if (!gradingPeriodId) {
          const err = new Error("No grading period found for this offering.");
          err.code = "GRADING_PERIOD_NOT_FOUND";
          err.status = 422;
          throw err;
        }

        const existing = await tx.grade.findUnique({
          where: {
            enrollmentItemId_gradingPeriodId: {
              enrollmentItemId: entry.enrollmentItemId,
              gradingPeriodId
            }
          }
        });

        // Block updates to already-posted grades
        if (existing && existing.status === "POSTED") {
          const err = new Error("Cannot modify a grade that has already been posted.");
          err.code = "GRADE_ALREADY_POSTED";
          err.status = 409;
          throw err;
        }

        // Block reverting submitted grades back to draft
        if (existing && (existing.status === "SUBMITTED" || existing.status === "APPROVED") && !isSubmit) {
          const err = new Error(
            "Cannot revert a submitted or approved grade to draft. Contact your College Dean or the Registrar."
          );
          err.code = "GRADE_ALREADY_SUBMITTED";
          err.status = 409;
          throw err;
        }

        // Block resubmitting already approved grades
        if (existing && existing.status === "APPROVED" && isSubmit) {
          const err = new Error(
            "Grades for this class have already been approved by the College Dean."
          );
          err.code = "GRADE_ALREADY_APPROVED";
          err.status = 409;
          throw err;
        }

        const numericGrade =
          entry.numericGrade !== null && entry.numericGrade !== undefined
            ? Number(entry.numericGrade)
            : null;

        const isPassing =
          numericGrade !== null
            ? (numericGrade >= 1.0 && numericGrade <= 3.0) || (numericGrade >= 75 && numericGrade <= 100)
            : entry.letterGrade
            ? ["P", "PASSED", "PASS"].includes(String(entry.letterGrade).trim().toUpperCase())
            : null;

        const gradeData = {
          numericGrade,
          letterGrade: entry.letterGrade || null,
          isPassing,
          remarks: entry.remarks || null,
          status: targetStatus,
          submittedByFacultyId: faculty.id,
          updatedAt: now,
          ...(isSubmit ? { submittedAt: now } : {})
        };

        // Record history if modifying an existing grade
        if (
          existing &&
          existing.numericGrade !== null &&
          Number(existing.numericGrade) !== numericGrade
        ) {
          await tx.gradeHistory.create({
            data: {
              id: newId(),
              gradeId: existing.id,
              previousNumeric: existing.numericGrade,
              previousLetter: existing.letterGrade,
              previousStatus: existing.status,
              newNumeric: numericGrade,
              newLetter: entry.letterGrade || null,
              newStatus: targetStatus,
              reason: isSubmit ? "Grade submitted" : "Grade updated",
              changedByUserId: userId,
              changedAt: now
            }
          });
        }

        let grade;
        if (existing) {
          grade = await tx.grade.update({
            where: { id: existing.id },
            data: gradeData
          });
        } else {
          grade = await tx.grade.create({
            data: {
              id: newId(),
              enrollmentItemId: entry.enrollmentItemId,
              gradingPeriodId,
              ...gradeData,
              createdAt: now
            }
          });
        }

        results.push({
          id: grade.id,
          enrollmentItemId: grade.enrollmentItemId,
          gradingPeriodId: grade.gradingPeriodId,
          numericGrade: grade.numericGrade,
          letterGrade: grade.letterGrade,
          isPassing: grade.isPassing,
          status: grade.status
        });
      }

      return {
        savedCount: results.length,
        status: targetStatus,
        grades: results
      };
    });
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  async _resolveFaculty(userId) {
    const faculty = await this.database.faculty.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { id: true }
    });
    if (!faculty) {
      const err = new Error("No active faculty profile found for this user.");
      err.code = "FACULTY_NOT_FOUND";
      err.status = 403;
      throw err;
    }
    return faculty;
  }

  async _validateAssignment(facultyId, offeringId) {
    const assignment = await this.database.facultyCourseAssignment.findFirst({
      where: { facultyId, courseOfferingId: offeringId }
    });
    if (!assignment) {
      const err = new Error(
        "You are not assigned to this class. Access denied."
      );
      err.code = "UNAUTHORIZED_CLASS_ACCESS";
      err.status = 403;
      throw err;
    }
    return assignment;
  }
}
