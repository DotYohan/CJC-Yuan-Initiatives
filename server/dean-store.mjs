import { randomUUID as newId } from "node:crypto";

function detailedError(code, details, status = 422) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  err.details = details;
  return err;
}

export class DeanStore {
  constructor(database, { gradeService, programHeadStore } = {}) {
    this.database = database;
    this.gradeService = gradeService;
    this.programHeadStore = programHeadStore;
  }

  /**
   * Resolves the Dean's assigned college, department IDs, and program IDs.
   * Throws 403 if the user has no assigned college.
   */
  async getDeanAssignment(userId) {
    const assignment = await this.database.userCollegeAssignment.findUnique({
      where: { userId },
      include: {
        college: {
          include: {
            departments: {
              where: { isActive: true },
              include: {
                programs: {
                  where: { isActive: true },
                  select: { id: true, code: true, name: true }
                }
              }
            }
          }
        }
      }
    });

    if (!assignment || !assignment.college) {
      const err = new Error("No active college assignment found for this Dean account.");
      err.code = "DEAN_ASSIGNMENT_REQUIRED";
      err.status = 403;
      throw err;
    }

    const college = assignment.college;
    const departmentIds = college.departments.map((dept) => dept.id);
    const programs = college.departments.flatMap((dept) => dept.programs);
    const programIds = programs.map((prog) => prog.id);

    return {
      assignment,
      college: {
        id: college.id,
        code: college.code,
        name: college.name,
        shortName: college.shortName
      },
      departments: college.departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
      departmentIds,
      programs,
      programIds
    };
  }

  /**
   * Dean Overview dashboard metrics.
   */
  async getDashboardOverview(userId) {
    const scope = await this.getDeanAssignment(userId);
    const { college, departmentIds, programIds } = scope;

    const [officialStudentsCount, facultyCount, pendingOfferings] = await Promise.all([
      // Officially enrolled students under college programs
      this.database.enrollment.count({
        where: {
          programId: { in: programIds },
          status: "ENROLLED"
        }
      }),

      // Faculty assigned to college departments
      this.database.faculty.count({
        where: {
          OR: [
            { departmentId: { in: departmentIds } },
            { departmentAssignments: { some: { departmentId: { in: departmentIds } } } }
          ],
          status: "ACTIVE"
        }
      }),

      // Pending grade submissions in college offerings
      this.database.grade.findMany({
        where: {
          status: "SUBMITTED",
          enrollmentItem: {
            courseOffering: {
              OR: [
                { classSection: { programId: { in: programIds } } },
                { subject: { departmentId: { in: departmentIds } } }
              ]
            }
          }
        },
        select: {
          enrollmentItem: { select: { courseOfferingId: true } }
        },
        distinct: ["enrollmentItemId"]
      })
    ]);

    const pendingOfferingIds = new Set(
      pendingOfferings.map((p) => p.enrollmentItem.courseOfferingId)
    );

    const counts = {
      programs: programIds.length,
      facultyMembers: facultyCount,
      officialStudents: officialStudentsCount,
      pendingGradeApprovals: pendingOfferingIds.size
    };

    return {
      college,
      counts,
      metrics: {
        officialStudentsCount,
        facultyCount,
        programsCount: programIds.length,
        pendingGradeApprovalsCount: pendingOfferingIds.size
      }
    };
  }

  /**
   * List officially enrolled students under college programs (read-only).
   */
  async listCollegeStudents(userId, { search = "", sort = "name", programId = "", yearLevel = null } = {}) {
    const scope = await this.getDeanAssignment(userId);
    const { programIds } = scope;

    const where = {
      status: "ENROLLED",
      programId: { in: programIds }
    };

    if (programId && programIds.includes(programId)) {
      where.programId = programId;
    }
    if (yearLevel) {
      const parsedYear = Number(yearLevel);
      if (Number.isInteger(parsedYear) && parsedYear >= 1 && parsedYear <= 6) {
        where.yearLevel = parsedYear;
      }
    }

    const enrollments = await this.database.enrollment.findMany({
      where,
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
            status: true
          }
        },
        program: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        academicTerm: {
          select: {
            id: true,
            code: true,
            name: true,
            academicYear: { select: { code: true } }
          }
        }
      }
    });

    let students = enrollments.map((e) => {
      const s = e.student;
      const fullName = [s.firstName, s.middleName, s.lastName, s.suffix]
        .filter(Boolean)
        .join(" ");
      return {
        enrollmentId: e.id,
        studentId: s.id,
        studentNumber: s.studentNumber,
        fullName,
        lastName: s.lastName,
        firstName: s.firstName,
        programId: e.program.id,
        programCode: e.program.code,
        programName: e.program.name,
        yearLevel: e.yearLevel,
        academicTerm: e.academicTerm
          ? `${e.academicTerm.academicYear?.code || ""} · ${e.academicTerm.name}`
          : "Active Term"
      };
    });

    // Optional search filter
    if (search && typeof search === "string") {
      const term = search.trim().toLowerCase();
      students = students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.studentNumber.toLowerCase().includes(term) ||
          s.programCode.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sort === "program") {
      students.sort((a, b) => a.programCode.localeCompare(b.programCode) || a.lastName.localeCompare(b.lastName));
    } else if (sort === "yearLevel") {
      students.sort((a, b) => a.yearLevel - b.yearLevel || a.lastName.localeCompare(b.lastName));
    } else {
      // Default: sort by name
      students.sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
    }

    return {
      college: scope.college,
      students,
      totalCount: students.length
    };
  }

  /**
   * List Faculty/Teachers assigned to the Dean's college (read-only).
   */
  async listCollegeFaculty(userId) {
    const scope = await this.getDeanAssignment(userId);
    const { departmentIds } = scope;

    const facultyRecords = await this.database.faculty.findMany({
      where: {
        OR: [
          { departmentId: { in: departmentIds } },
          { departmentAssignments: { some: { departmentId: { in: departmentIds } } } }
        ]
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        departmentAssignments: {
          where: { departmentId: { in: departmentIds } },
          include: { department: { select: { id: true, code: true, name: true } } }
        },
        user: { select: { email: true, status: true } }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });

    const faculty = facultyRecords.map((f) => {
      const fullName = [f.firstName, f.middleName, f.lastName, f.suffix]
        .filter(Boolean)
        .join(" ");
      const dept = f.department?.name || f.departmentAssignments[0]?.department?.name || "Unassigned";
      return {
        id: f.id,
        employeeNumber: f.employeeNumber,
        fullName,
        department: dept,
        departmentCode: f.department?.code || f.departmentAssignments[0]?.department?.code || "",
        email: f.user?.email || null,
        status: f.status
      };
    });

    return {
      college: scope.college,
      faculty,
      totalCount: faculty.length
    };
  }

  /**
   * List class schedules for offerings under the Dean's college (read-only).
   */
  async listCollegeSchedules(userId, { programId = "" } = {}) {
    const scope = await this.getDeanAssignment(userId);
    const { departmentIds, programIds } = scope;

    const offerings = await this.database.courseOffering.findMany({
      where: {
        status: "OPEN",
        OR: [
          { classSection: { programId: { in: programIds } } },
          { subject: { departmentId: { in: departmentIds } } }
        ],
        ...(programId && programIds.includes(programId)
          ? { classSection: { programId } }
          : {})
      },
      include: {
        subject: { select: { id: true, code: true, title: true } },
        classSection: {
          select: {
            id: true,
            code: true,
            program: { select: { code: true, name: true } }
          }
        },
        academicTerm: {
          select: {
            code: true,
            name: true,
            academicYear: { select: { code: true } }
          }
        },
        schedules: {
          include: {
            room: { select: { code: true, name: true } }
          }
        },
        faculty: {
          include: {
            faculty: {
              select: { firstName: true, lastName: true, employeeNumber: true }
            }
          }
        }
      },
      orderBy: [{ subject: { code: "asc" } }, { classSection: { code: "asc" } }]
    });

    const schedules = offerings.map((o) => {
      const instructor = o.faculty[0]?.faculty;
      return {
        offeringId: o.id,
        offeringCode: o.offeringCode,
        subjectCode: o.subject.code,
        subjectTitle: o.subject.title,
        section: o.classSection?.code || null,
        program: o.classSection?.program?.code || null,
        academicTerm: `${o.academicTerm.academicYear.code} · ${o.academicTerm.name}`,
        instructor: instructor
          ? `${instructor.firstName} ${instructor.lastName}`
          : "Unassigned",
        schedules: o.schedules.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room ? `${s.room.code} (${s.room.name})` : "TBA"
        }))
      };
    });

    return {
      college: scope.college,
      schedules,
      totalCount: schedules.length
    };
  }

  /**
   * List offerings that have at least one grade in SUBMITTED status under the Dean's college.
   */
  async listPendingGradeSubmissions(userId) {
    const scope = await this.getDeanAssignment(userId);
    const { departmentIds, programIds } = scope;

    // Find offerings with SUBMITTED grades in Dean's college
    const submittedGrades = await this.database.grade.findMany({
      where: {
        status: "SUBMITTED",
        enrollmentItem: {
          courseOffering: {
            OR: [
              { classSection: { programId: { in: programIds } } },
              { subject: { departmentId: { in: departmentIds } } }
            ]
          }
        }
      },
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

    if (offeringIds.length === 0) {
      return {
        college: scope.college,
        submissions: []
      };
    }

    const offerings = await this.database.courseOffering.findMany({
      where: { id: { in: offeringIds } },
      include: {
        subject: { select: { code: true, title: true } },
        classSection: { select: { code: true, program: { select: { code: true } } } },
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

    const submissions = [];
    for (const offering of offerings) {
      const gradeCounts = await this.database.grade.groupBy({
        by: ["status"],
        where: {
          enrollmentItem: { courseOfferingId: offering.id }
        },
        _count: { id: true }
      });

      const submitted = gradeCounts.find((g) => g.status === "SUBMITTED")?._count.id || 0;
      const totalGrades = gradeCounts.reduce((sum, g) => sum + g._count.id, 0);
      const instructor = offering.faculty[0]?.faculty;

      submissions.push({
        offeringId: offering.id,
        offeringCode: offering.offeringCode,
        subjectCode: offering.subject.code,
        subjectTitle: offering.subject.title,
        section: offering.classSection?.code || null,
        program: offering.classSection?.program?.code || null,
        academicTerm: `${offering.academicTerm.academicYear.code} · ${offering.academicTerm.name}`,
        instructor: instructor
          ? `${instructor.firstName} ${instructor.lastName} (${instructor.employeeNumber})`
          : "Unassigned",
        enrolledCount: offering._count.enrollmentItems,
        submittedGradeCount: submitted,
        totalGradeCount: totalGrades,
        status: offering.status
      });
    }

    return {
      college: scope.college,
      submissions
    };
  }

  /**
   * Validate offering belongs to the Dean's college.
   */
  async _assertOfferingScope(scope, offeringId) {
    const { departmentIds, programIds } = scope;
    const offering = await this.database.courseOffering.findFirst({
      where: {
        id: offeringId,
        OR: [
          { classSection: { programId: { in: programIds } } },
          { subject: { departmentId: { in: departmentIds } } }
        ]
      },
      select: { id: true }
    });

    if (!offering) {
      const err = new Error("This course offering does not belong to your assigned college.");
      err.code = "UNAUTHORIZED_COLLEGE_OFFERING";
      err.status = 403;
      throw err;
    }
  }

  /**
   * Retrieve the detailed grade sheet for Dean review.
   */
  async getOfferingGradeSheet(userId, offeringId) {
    const scope = await this.getDeanAssignment(userId);
    await this._assertOfferingScope(scope, offeringId);
    return this.gradeService.getOfferingGradeSheet(offeringId);
  }

  /**
   * Approve submitted grades for an offering (transitions SUBMITTED -> APPROVED).
   * Dean CANNOT modify numeric/letter values.
   */
  async approveGrades(userId, offeringId, remarks = "") {
    const scope = await this.getDeanAssignment(userId);
    await this._assertOfferingScope(scope, offeringId);
    const now = new Date();

    const submittedGrades = await this.database.grade.findMany({
      where: {
        status: "SUBMITTED",
        enrollmentItem: {
          courseOfferingId: offeringId,
          status: "ENROLLED"
        }
      }
    });

    if (submittedGrades.length === 0) {
      const err = new Error("No submitted grades found for this offering.");
      err.code = "NO_SUBMITTED_GRADES";
      err.status = 404;
      throw err;
    }
    const enrolledCount = await this.database.enrollmentItem.count({
      where: { courseOfferingId: offeringId, status: "ENROLLED" }
    });
    if (submittedGrades.length !== enrolledCount) {
      const err = new Error("Every enrolled student must have a submitted grade before Dean approval.");
      err.code = "INCOMPLETE_GRADE_SHEET";
      err.status = 409;
      throw err;
    }

    return this.database.$transaction(async (tx) => {
      const approvedIds = [];
      const reason = remarks && remarks.trim()
        ? `Dean approved (${scope.college.code}); forwarded to Registrar: ${remarks.trim()}`
        : `Dean approved (${scope.college.code}); forwarded to Registrar`;

      for (const grade of submittedGrades) {
        // Record audit history
        await tx.gradeHistory.create({
          data: {
            id: newId(),
            gradeId: grade.id,
            previousNumeric: grade.numericGrade,
            previousLetter: grade.letterGrade,
            previousStatus: grade.status,
            newNumeric: grade.numericGrade,
            newLetter: grade.letterGrade,
            newStatus: "APPROVED",
            reason,
            changedByUserId: userId,
            changedAt: now
          }
        });

        // Update status to APPROVED
        await tx.grade.update({
          where: { id: grade.id },
          data: {
            status: "APPROVED",
            approvedByUserId: userId,
            approvedAt: now,
            updatedAt: now
          }
        });

        approvedIds.push(grade.id);
      }

      return {
        approvedCount: approvedIds.length,
        offeringId,
        status: "APPROVED",
        collegeCode: scope.college.code,
        approvedAt: now
      };
    });
  }

  /**
   * Return submitted grades to faculty for correction (transitions SUBMITTED -> DRAFT).
   * Requires non-empty remarks.
   */
  async returnGrades(userId, offeringId, remarks) {
    const scope = await this.getDeanAssignment(userId);
    await this._assertOfferingScope(scope, offeringId);

    if (typeof remarks !== "string" || !remarks.trim()) {
      const err = new Error("Remarks are required when returning grades to faculty.");
      err.code = "REMARKS_REQUIRED";
      err.status = 422;
      throw err;
    }

    const trimmedRemarks = remarks.trim();
    const now = new Date();

    const submittedGrades = await this.database.grade.findMany({
      where: {
        status: "SUBMITTED",
        enrollmentItem: {
          courseOfferingId: offeringId,
          status: "ENROLLED"
        }
      }
    });

    if (submittedGrades.length === 0) {
      const err = new Error("No submitted grades found for this offering.");
      err.code = "NO_SUBMITTED_GRADES";
      err.status = 404;
      throw err;
    }

    return this.database.$transaction(async (tx) => {
      const returnedIds = [];
      const reason = `Returned by Dean (${scope.college.code}): ${trimmedRemarks}`;

      for (const grade of submittedGrades) {
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
            reason,
            changedByUserId: userId,
            changedAt: now
          }
        });

        await tx.grade.update({
          where: { id: grade.id },
          data: {
            status: "DRAFT",
            remarks: trimmedRemarks,
            updatedAt: now
          }
        });

        returnedIds.push(grade.id);
      }

      return {
        returnedCount: returnedIds.length,
        offeringId,
        status: "DRAFT",
        remarks: trimmedRemarks,
        returnedAt: now
      };
    });
  }

  /**
   * List pending student enrollments eligible for evaluation under the Dean's college.
   */
  async listPendingEvaluations(userId) {
    const scope = await this.getDeanAssignment(userId);
    const { programIds } = scope;

    const enrollments = await this.database.enrollment.findMany({
      where: {
        status: "PENDING",
        programId: { in: programIds }
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true
          }
        },
        program: { select: { id: true, code: true, name: true } },
        academicTerm: { select: { id: true, code: true, name: true } },
        curriculum: { select: { id: true, code: true, name: true, version: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    const evaluations = enrollments.map((e) => {
      const s = e.student;
      const fullName = [s.firstName, s.middleName, s.lastName, s.suffix]
        .filter(Boolean)
        .join(" ");
      return {
        id: e.id,
        enrollmentId: e.id,
        studentId: s.id,
        studentNumber: s.studentNumber,
        fullName,
        student: { id: s.id, studentNumber: s.studentNumber, name: fullName },
        program: { id: e.program.id, code: e.program.code, name: e.program.name },
        programCode: e.program.code,
        programName: e.program.name,
        yearLevel: e.yearLevel,
        academicTerm: e.academicTerm,
        academicTermName: e.academicTerm?.name || "Active Term",
        curriculumCode: e.curriculum?.code || null,
        subjectCount: e._count.items,
        status: e.status,
        submittedAt: e.createdAt
      };
    });

    return {
      college: scope.college,
      evaluations
    };
  }

  /**
   * Get student enrollment evaluation breakdown (reuses Program Head engine).
   */
  async getEnrollmentEvaluation(userId, enrollmentId) {
    const scope = await this.getDeanAssignment(userId);
    const { programIds } = scope;

    const enrollment = await this.database.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { programId: true }
    });

    if (!enrollment || !programIds.includes(enrollment.programId)) {
      const err = new Error("This student enrollment does not belong to your assigned college.");
      err.code = "UNAUTHORIZED_COLLEGE_ENROLLMENT";
      err.status = 403;
      throw err;
    }

    return this.programHeadStore.buildEnrollmentEvaluation(
      this.database,
      { programId: enrollment.programId },
      enrollmentId
    );
  }

  /**
   * Approve student enrollment evaluation by Dean.
   * Records Dean role, college, timestamp, and optional override reasons / remarks.
   */
  async approveEnrollmentEvaluation(userId, enrollmentId, input = {}) {
    const scope = await this.getDeanAssignment(userId);
    const { programIds, college } = scope;

    const enrollment = await this.database.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { programId: true }
    });

    if (!enrollment || !programIds.includes(enrollment.programId)) {
      const err = new Error("This student enrollment does not belong to your assigned college.");
      err.code = "UNAUTHORIZED_COLLEGE_ENROLLMENT";
      err.status = 403;
      throw err;
    }

    const assignment = { programId: enrollment.programId };
    const overrideItemIds = [
      ...new Set(
        Array.isArray(input?.overrideItemIds)
          ? input.overrideItemIds.filter((id) => typeof id === "string" && id)
          : []
      )
    ];
    const overrideReason = typeof input?.overrideReason === "string" ? input.overrideReason.trim().slice(0, 500) : "";
    if (overrideItemIds.length && !overrideReason) {
      throw detailedError("OVERRIDE_REASON_REQUIRED", "An override reason is required when overriding prerequisites.");
    }
    const remarks = typeof input?.remarks === "string" ? input.remarks.trim().slice(0, 500) : "";

    return this.database.$transaction(async (tx) => {
      const before = await this.programHeadStore.buildEnrollmentEvaluation(tx, assignment, enrollmentId);
      if (before.enrollment.status !== "PENDING") {
        throw detailedError("ENROLLMENT_NOT_REVIEWABLE", "Enrollment is not in reviewable PENDING status.");
      }

      const eligible = new Set(
        before.issues
          .filter((issue) => issue.code === "MISSING_PREREQUISITE")
          .map((issue) => issue.enrollmentItemId)
      );

      if (overrideItemIds.some((id) => !eligible.has(id))) {
        throw detailedError("OVERRIDE_INVALID", "One or more selected subjects are not eligible for prerequisite override.");
      }

      if (overrideItemIds.length) {
        const changed = await tx.enrollmentItem.updateMany({
          where: { id: { in: overrideItemIds }, enrollmentId },
          data: { overrideApprovedByUserId: userId, overrideReason }
        });
        if (changed.count !== overrideItemIds.length) {
          throw detailedError("OVERRIDE_INVALID", "Failed to apply prerequisite overrides.");
        }
      }

      const evaluation = await this.programHeadStore.buildEnrollmentEvaluation(tx, assignment, enrollmentId);
      if (!evaluation.canApprove) {
        throw detailedError("ENROLLMENT_RULES_FAILED", evaluation);
      }

      const now = new Date();
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "ASSESSED", processedByUserId: userId, updatedAt: now }
      });

      const historyReason = overrideItemIds.length
        ? `Academic evaluation approved with prerequisite override by Dean (${college.code}): ${overrideReason}`
        : `Academic evaluation approved by Dean (${college.code})${remarks ? ": " + remarks : ""}`;

      await tx.enrollmentStatusHistory.create({
        data: {
          id: newId(),
          enrollmentId,
          fromStatus: "PENDING",
          toStatus: "ASSESSED",
          reason: historyReason,
          changedByUserId: userId,
          changedAt: now
        }
      });

      return {
        ...evaluation,
        enrollment: { ...evaluation.enrollment, status: "ASSESSED" },
        evaluatedBy: {
          userId,
          role: "Dean",
          collegeCode: college.code,
          evaluatedAt: now
        }
      };
    });
  }
}
