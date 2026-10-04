/**
 * Grade Service
 *
 * Encapsulates Registrar grade approval and posting workflows:
 *   - List offerings with SUBMITTED grades pending review
 *   - Approve/post grades for an offering
 *
 * When grades are posted, they become permanently locked and
 * immediately visible to Student Dashboards, Program Head evaluations,
 * and Registrar transcripts.
 */

import { newId } from "./security.mjs";

export class GradeService {
  constructor(database) {
    this.database = database;
  }

  /**
   * Return offerings that have at least one grade in SUBMITTED status,
   * including faculty name and student counts.
   */
  async listPendingSubmissions() {
    // Registrar may only receive grade sheets approved by the Dean.
    const submittedGrades = await this.database.grade.findMany({
      where: { status: "APPROVED" },
      select: {
        enrollmentItem: {
          select: { courseOfferingId: true }
        }
      },
      distinct: ["enrollmentItemId"]
    });

    const offeringIds = [
      ...new Set(submittedGrades.map((g) => g.enrollmentItem.courseOfferingId))
    ];

    if (offeringIds.length === 0) return [];

    const offerings = await this.database.courseOffering.findMany({
      where: { id: { in: offeringIds } },
      include: {
        subject: { select: { code: true, title: true } },
        classSection: { select: { code: true } },
        academicTerm: {
          select: {
            code: true,
            name: true,
            academicYear: { select: { code: true } }
          }
        },
        faculty: {
          include: {
            faculty: {
              select: {
                firstName: true,
                lastName: true,
                employeeNumber: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollmentItems: { where: { status: "ENROLLED" } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    // For each offering, count submitted and total grades
    const results = [];
    for (const offering of offerings) {
      const gradeCounts = await this.database.grade.groupBy({
        by: ["status"],
        where: {
          enrollmentItem: { courseOfferingId: offering.id }
        },
        _count: { id: true }
      });

      const approvedCount = gradeCounts.find((g) => g.status === "APPROVED")?._count.id || 0;
      const submittedCount = gradeCounts.find((g) => g.status === "SUBMITTED")?._count.id || 0;
      const totalGrades = gradeCounts.reduce((sum, g) => sum + g._count.id, 0);
      if (approvedCount !== offering._count.enrollmentItems) continue;

      const instructor = offering.faculty[0]?.faculty;

      results.push({
        offeringId: offering.id,
        offeringCode: offering.offeringCode,
        subjectCode: offering.subject.code,
        subjectTitle: offering.subject.title,
        section: offering.classSection?.code || null,
        academicTerm: `${offering.academicTerm.academicYear.code} · ${offering.academicTerm.name}`,
        instructor: instructor
          ? `${instructor.firstName} ${instructor.lastName} (${instructor.employeeNumber})`
          : "Unassigned",
        enrolledCount: offering._count.enrollmentItems,
        submittedGradeCount: approvedCount + submittedCount,
        approvedGradeCount: approvedCount,
        pendingDeanGradeCount: submittedCount,
        totalGradeCount: totalGrades,
        approvalStage: approvedCount > 0 ? "DEAN_APPROVED" : "PENDING_DEAN",
        status: offering.status
      });
    }

    return results;
  }

  /**
   * Retrieve the detailed grade sheet for a specific offering,
   * showing all enrolled students and their submitted grades.
   */
  async getOfferingGradeSheet(offeringId) {
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
        },
        faculty: {
          include: {
            faculty: {
              select: { firstName: true, lastName: true, employeeNumber: true }
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
                studentNumber: true,
                firstName: true,
                middleName: true,
                lastName: true,
                suffix: true,
                currentYearLevel: true,
                program: { select: { code: true } }
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
            remarks: true,
            submittedAt: true
          }
        }
      },
      orderBy: { enrollment: { student: { lastName: "asc" } } }
    });

    const instructor = offering.faculty[0]?.faculty;

    let gradingPeriods = offering.academicTerm?.gradingPeriods || [];
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
      instructor: instructor
        ? `${instructor.firstName} ${instructor.lastName}`
        : "Unassigned",
      gradingPeriods,
      students: items.map((item) => {
        const s = item.enrollment.student;
        return {
          enrollmentItemId: item.id,
          studentNumber: s.studentNumber,
          fullName: [s.firstName, s.middleName, s.lastName, s.suffix]
            .filter(Boolean)
            .join(" "),
          program: s.program?.code || null,
          yearLevel: s.currentYearLevel,
          grades: item.grades
        };
      })
    };
  }

  /**
   * Approve and post all SUBMITTED grades for an offering.
   *
   * Sets:
   *   - status: SUBMITTED -> POSTED
   *   - approvedByUserId and approvedAt
   *   - Creates GradeHistory records
   *
   * Grades become permanently locked after posting.
   */
  async approveGrades(offeringId, registrarUserId) {
    const now = new Date();

    // Only Dean-approved grades may be posted by the Registrar.
    const targetGrades = await this.database.grade.findMany({
      where: {
        status: "APPROVED",
        enrollmentItem: {
          courseOfferingId: offeringId,
          status: "ENROLLED"
        }
      },
      include: {
        enrollmentItem: {
          select: { courseOfferingId: true }
        }
      }
    });

    if (targetGrades.length === 0) {
      const err = new Error("No submitted or approved grades found for this offering.");
      err.code = "NO_SUBMITTED_GRADES";
      err.status = 404;
      throw err;
    }
    const enrolledCount = await this.database.enrollmentItem.count({
      where: { courseOfferingId: offeringId, status: "ENROLLED" }
    });
    if (targetGrades.length !== enrolledCount) {
      const err = new Error("Every enrolled student must have a Dean-approved grade before Registrar posting.");
      err.code = "INCOMPLETE_GRADE_SHEET";
      err.status = 409;
      throw err;
    }

    return this.database.$transaction(async (tx) => {
      const approvedIds = [];

      for (const grade of targetGrades) {
        // Record history
        await tx.gradeHistory.create({
          data: {
            id: newId(),
            gradeId: grade.id,
            previousNumeric: grade.numericGrade,
            previousLetter: grade.letterGrade,
            previousStatus: grade.status,
            newNumeric: grade.numericGrade,
            newLetter: grade.letterGrade,
            newStatus: "POSTED",
            reason: "Registrar approved and posted",
            changedByUserId: registrarUserId,
            changedAt: now
          }
        });

        // Update grade to POSTED
        await tx.grade.update({
          where: { id: grade.id },
          data: {
            status: "POSTED",
            approvedByUserId: registrarUserId,
            approvedAt: now,
            updatedAt: now
          }
        });

        approvedIds.push(grade.id);
      }

      return {
        approvedCount: approvedIds.length,
        offeringId,
        status: "POSTED",
        approvedAt: now
      };
    });
  }

  async returnGrades(offeringId, registrarUserId, remarks) {
    if (typeof remarks !== "string" || !remarks.trim()) {
      const err = new Error("Remarks are required when returning grades to faculty.");
      err.code = "REMARKS_REQUIRED";
      err.status = 422;
      throw err;
    }

    const now = new Date();
    const approvedGrades = await this.database.grade.findMany({
      where: {
        status: "APPROVED",
        enrollmentItem: { courseOfferingId: offeringId, status: "ENROLLED" }
      }
    });
    if (approvedGrades.length === 0) {
      const err = new Error("No Dean-approved grades found for this offering.");
      err.code = "NO_APPROVED_GRADES";
      err.status = 404;
      throw err;
    }

    const trimmedRemarks = remarks.trim();
    return this.database.$transaction(async (tx) => {
      for (const grade of approvedGrades) {
        await tx.gradeHistory.create({
          data: {
            id: newId(),
            gradeId: grade.id,
            previousNumeric: grade.numericGrade,
            previousLetter: grade.letterGrade,
            previousStatus: grade.status,
            newNumeric: grade.numericGrade,
            newLetter: grade.letterGrade,
            newStatus: "DRAFT",
            reason: `Returned by Registrar: ${trimmedRemarks}`,
            changedByUserId: registrarUserId,
            changedAt: now
          }
        });
        await tx.grade.update({
          where: { id: grade.id },
          data: {
            status: "DRAFT",
            remarks: trimmedRemarks,
            approvedByUserId: null,
            approvedAt: null,
            updatedAt: now
          }
        });
      }
      return { returnedCount: approvedGrades.length, offeringId, status: "DRAFT", remarks: trimmedRemarks, returnedAt: now };
    });
  }
}
