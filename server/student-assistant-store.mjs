import { buildApplicationReview, applicationOfferingChoices } from "./enrollment-review.mjs";

const fullName = (person) =>
  [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(" ");

export class StudentAssistantStore {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getActiveAssignment(userId) {
    const assignment = await this.prisma.userDepartmentAssignment.findUnique({
      where: { userId },
      include: {
        department: {
          include: {
            college: true,
            programs: {
              where: { isActive: true },
              select: { id: true, code: true, name: true }
            }
          }
        }
      }
    });
    if (!assignment) throw new Error("STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED");
    return assignment;
  }

  async dashboard(userId) {
    const assignment = await this.getActiveAssignment(userId);
    const programIds = assignment.department.programs.map((p) => p.id);
    const applications = await this.prisma.enrollmentApplication.findMany({
      where: {
        programId: { in: programIds },
        status: "UNDER_REVIEW"
      },
      select: { id: true, formData: true }
    });

    const isComplete = (app) => {
      const assignments = app.formData?.encoding?.assignments;
      const expected = Array.isArray(app.formData?.selection?.subjectIds)
        ? app.formData.selection.subjectIds.length
        : 0;
      return Array.isArray(assignments) && assignments.length > 0 && assignments.length === expected;
    };

    const pendingCount = applications.filter((app) => !isComplete(app)).length;
    const encodedCount = applications.filter(isComplete).length;

    return {
      department: {
        id: assignment.department.id,
        code: assignment.department.code,
        name: assignment.department.name
      },
      college: {
        id: assignment.department.college.id,
        code: assignment.department.college.code,
        name: assignment.department.college.name
      },
      programs: assignment.department.programs,
      metrics: {
        pendingCount,
        encodedCount,
        totalUnderReview: applications.length
      }
    };
  }

  async enrollmentApplications(userId, filter = "PENDING") {
    const assignment = await this.getActiveAssignment(userId);
    const programIds = assignment.department.programs.map((p) => p.id);
    const applications = await this.prisma.enrollmentApplication.findMany({
      where: {
        programId: { in: programIds },
        status: "UNDER_REVIEW"
      },
      orderBy: { submittedAt: "asc" },
      include: {
        student: {
          select: { id: true, studentNumber: true, firstName: true, middleName: true, lastName: true, suffix: true }
        },
        program: { select: { id: true, code: true, name: true } },
        curriculum: { select: { id: true, code: true, name: true, version: true } },
        academicTerm: { select: { id: true, name: true, academicYear: { select: { code: true } } } }
      }
    });

    return applications
      .map(({ formData, ...app }) => {
        const rawIds = formData?.selection?.subjectIds;
        const subjectCount = Array.isArray(rawIds) ? rawIds.length : 0;
        const assignments = formData?.encoding?.assignments;
        const isEncoded = Array.isArray(assignments) && assignments.length > 0 && assignments.length === subjectCount;
        return {
          ...app,
          studentName: fullName(app.student),
          student: { ...app.student, name: fullName(app.student) },
          subjectCount,
          isEncoded,
          encodingStatus: isEncoded ? "COMPLETED" : "PENDING",
          encoding: formData?.encoding ?? null
        };
      })
      .filter((app) => {
        if (filter === "PENDING") return !app.isEncoded;
        if (filter === "ENCODED") return app.isEncoded;
        return true;
      });
  }

  async enrollmentApplicationDetail(userId, applicationId) {
    const assignment = await this.getActiveAssignment(userId);
    const review = await buildApplicationReview(this.prisma, applicationId);
    if (!assignment.department.programs.some((p) => p.id === review.application.programId)) {
      throw new Error("UNAUTHORIZED_DEPARTMENT_ACCESS");
    }
    if (review.application.status !== "UNDER_REVIEW") {
      throw new Error("APPLICATION_NOT_READY_FOR_ENCODING");
    }
    const offeringChoices = await applicationOfferingChoices(this.prisma, review);
    const existingEncoding = review.application.formData?.encoding ?? null;
    return {
      id: applicationId,
      studentName: fullName(review.application.student),
      studentNumber: review.application.student?.studentNumber ?? null,
      program: review.application.program,
      academicTerm: review.application.academicTerm,
      yearLevel: review.application.yearLevel,
      items: review.items,
      totalUnits: review.totalUnits,
      curriculum: review.curriculum,
      offeringChoices,
      encoding: existingEncoding,
      existingEncoding,
      encodingStatus: existingEncoding?.assignments?.length ? "COMPLETED" : "PENDING",
      review
    };
  }

  async encodeSubjects(userId, applicationId, input) {
    const assignment = await this.getActiveAssignment(userId);
    const assignments = Array.isArray(input?.assignments) ? input.assignments : [];
    if (!assignments.length) throw new Error("INCOMPLETE_SUBJECT_ENCODING");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, username: true }
    });

    return this.prisma.$transaction(async (transaction) => {
      const application = await transaction.enrollmentApplication.findUnique({
        where: { id: applicationId },
        include: {
          program: { select: { id: true, departmentId: true } }
        }
      });
      if (!application) throw new Error("APPLICATION_NOT_FOUND");
      if (application.program.departmentId !== assignment.departmentId) {
        throw new Error("UNAUTHORIZED_DEPARTMENT_ACCESS");
      }
      if (application.status !== "UNDER_REVIEW") {
        throw new Error("APPLICATION_NOT_READY_FOR_ENCODING");
      }

      const review = await buildApplicationReview(transaction, applicationId);
      if (!review.curriculum || !review.items.length) {
        throw new Error("APPLICATION_CURRICULUM_INVALID");
      }

      // Check that every approved subject is assigned
      if (assignments.length !== review.items.length) {
        throw new Error("INCOMPLETE_SUBJECT_ENCODING");
      }
      const assignedSubjIds = new Set(assignments.map((a) => a.curriculumSubjectId));
      if (assignedSubjIds.size !== review.items.length) {
        throw new Error("DUPLICATE_SUBJECT_ASSIGNMENT");
      }
      if (review.items.some((item) => !assignedSubjIds.has(item.id))) {
        throw new Error("INCOMPLETE_SUBJECT_ENCODING");
      }

      const choices = await applicationOfferingChoices(transaction, review);
      const validatedAssignments = [];
      for (const item of assignments) {
        const curriculumSubject = review.items.find((s) => s.id === item.curriculumSubjectId);
        if (!curriculumSubject) throw new Error("INVALID_SUBJECT_ASSIGNMENT");
        const offering = choices.find((c) => c.id === item.courseOfferingId && c.subjectId === curriculumSubject.subjectId);
        if (!offering) throw new Error("INVALID_OFFERING_ASSIGNMENT");
        if (!offering.available) throw new Error("SECTION_UNAVAILABLE");
        validatedAssignments.push({
          curriculumSubjectId: item.curriculumSubjectId,
          subjectId: curriculumSubject.subjectId,
          subjectCode: curriculumSubject.subject.code,
          subjectTitle: curriculumSubject.subject.title,
          creditUnits: curriculumSubject.creditUnits,
          courseOfferingId: offering.id,
          offeringCode: offering.offeringCode,
          sectionCode: offering.sectionCode,
          instructor: offering.instructor,
          schedule: offering.schedule
        });
      }

      const now = new Date();
      const currentFormData = application.formData || {};
      const encodingData = {
        encodedAt: now.toISOString(),
        encodedByUserId: userId,
        encodedByDisplayName: user?.displayName || "Student Assistant",
        encodedByUsername: user?.username || "",
        assignments: validatedAssignments
      };

      const updatedFormData = {
        ...currentFormData,
        encoding: encodingData
      };

      await transaction.enrollmentApplication.update({
        where: { id: applicationId },
        data: {
          formData: updatedFormData,
          updatedAt: now
        }
      });

      // Record footprint in AdmissionApplicationStatusHistory
      const admission = await transaction.admissionApplication.findFirst({
        where: {
          convertedStudentId: application.studentId,
          academicTermId: application.academicTermId
        },
        select: { id: true, status: true }
      });

      if (admission) {
        await transaction.admissionApplicationStatusHistory.create({
          data: {
            applicationId: admission.id,
            fromStatus: admission.status,
            toStatus: admission.status,
            actionType: "SA_SUBJECT_ENCODED",
            remarks: `Subject offerings encoded by Student Assistant ${user?.displayName} (@${user?.username}). Ready for Registrar verification.`,
            changedByUserId: userId,
            changedByRole: "student_assistant"
          }
        });
      }

      return {
        id: applicationId,
        status: application.status,
        encoding: encodingData
      };
    });
  }
}
