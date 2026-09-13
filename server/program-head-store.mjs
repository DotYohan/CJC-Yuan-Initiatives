import { newId } from "./security.mjs";
import { buildAcademicRecordIndex, prerequisiteState } from "./academic-eligibility.mjs";
import { buildApplicationReview, reviewError } from "./enrollment-review.mjs";

const validStatuses = new Set(["DRAFT", "ACTIVE", "RETIRED"]);
const validSubjectTypes = new Set(["REQUIRED", "ELECTIVE"]);
const validWeekdays = new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
const activeItemStatuses = ["PENDING", "ENROLLED"];
const finalGradeStatuses = ["APPROVED", "POSTED"];
const activeProgramScope = Object.freeze({
  isActive: true,
  department: { is: { isActive: true, college: { is: { isActive: true } } } }
});

const fullName = (person) => [person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(" ");
const decimal = (value) => value == null ? null : value.toString();
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : null;
const timeOnly = (value) => value instanceof Date ? value.toISOString().slice(11, 16) : null;

function parseTime(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function detailedError(message, details) {
  const error = new Error(message);
  error.details = details;
  return error;
}

export class ProgramHeadStore {
  constructor(prisma) {
    this.prisma = prisma;
  }

  transaction(operation) {
    if (typeof this.prisma.$transaction !== "function") return operation(this.prisma);
    return this.prisma.$transaction((transaction) => operation(transaction));
  }

  async getActiveAssignment(userId) {
    const directAssignment = await this.prisma.userProgramAssignment.findFirst({
      where: { userId, program: { is: activeProgramScope } },
      select: {
        id: true,
        programId: true,
        program: {
          select: {
            id: true,
            code: true,
            name: true,
            durationYears: true,
            termsPerYear: true,
            departmentId: true,
            department: {
              select: {
                id: true,
                code: true,
                name: true,
                college: { select: { id: true, code: true, name: true } }
              }
            }
          }
        }
      }
    });
    if (directAssignment) return directAssignment;

    // Preserve support for Program Heads assigned through the existing Faculty workflow.
    const now = new Date();
    const faculty = await this.prisma.faculty.findUnique({
      where: { userId },
      select: {
        id: true,
        programHeadAssignments: {
          where: {
            startsOn: { lte: now },
            OR: [{ endsOn: null }, { endsOn: { gte: now } }],
            program: { is: activeProgramScope }
          },
          orderBy: { startsOn: "desc" },
          take: 1,
          select: {
            id: true,
            programId: true,
            program: {
              select: {
                id: true,
                code: true,
                name: true,
                durationYears: true,
                termsPerYear: true,
                departmentId: true,
                department: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    college: { select: { id: true, code: true, name: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    return faculty?.programHeadAssignments?.[0] ?? null;
  }

  async dashboard(userId) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");

    const now = new Date();
    const [curricula, students, evaluations, courseOfferings, academicTerms, faculty, rooms] = await Promise.all([
      this.prisma.curriculum.findMany({
        where: { programId: assignment.programId },
        orderBy: [{ effectiveFromYear: "desc" }, { version: "desc" }],
        select: {
          id: true,
          programId: true,
          code: true,
          name: true,
          version: true,
          effectiveFromYear: true,
          effectiveToYear: true,
          status: true,
          subjects: {
            orderBy: [{ yearLevel: "asc" }, { termNumber: "asc" }, { sortOrder: "asc" }, { subject: { code: "asc" } }],
            select: {
              id: true, subjectId: true, yearLevel: true, termNumber: true, creditUnits: true,
              lectureHours: true, laboratoryHours: true, type: true, isRequired: true, sortOrder: true,
              subject: {
                select: {
                  id: true, departmentId: true, code: true, title: true, status: true,
                  department: { select: { id: true, code: true, name: true } },
                  requirements: {
                    orderBy: [{ type: "asc" }, { requiredSubject: { code: "asc" } }],
                    select: { id: true, type: true, requiredSubject: { select: { id: true, code: true, title: true } } }
                  }
                }
              }
            }
          }
        }
      }),
      this.prisma.student.findMany({
        where: { programId: assignment.programId },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true, studentNumber: true, firstName: true, middleName: true,
          lastName: true, suffix: true, currentYearLevel: true, status: true,
          curriculum: { select: { id: true, code: true, name: true, version: true } },
          enrollments: {
            where: { status: { in: ["ENROLLED", "COMPLETED"] } },
            orderBy: { academicTerm: { startsOn: "desc" } }, take: 1,
            select: { id: true, status: true, academicTerm: { select: { id: true, code: true, name: true } } }
          }
        }
      }),
      this.prisma.enrollment.findMany({
        where: { programId: assignment.programId, status: { in: ["PENDING", "ASSESSED"] } },
        orderBy: { updatedAt: "asc" },
        select: {
          id: true, yearLevel: true, status: true, updatedAt: true,
          student: { select: { id: true, studentNumber: true, firstName: true, middleName: true, lastName: true, suffix: true } },
          academicTerm: { select: { id: true, code: true, name: true, termNumber: true } },
          items: { where: { status: { in: activeItemStatuses } }, select: { courseOffering: { select: { creditUnits: true } } } }
        }
      }),
      this.prisma.courseOffering.findMany({
        where: { classSection: { programId: assignment.programId } },
        orderBy: [{ academicTerm: { startsOn: "desc" } }, { offeringCode: "asc" }],
        select: {
          id: true, offeringCode: true, status: true, creditUnits: true, lectureHours: true,
          laboratoryHours: true, capacity: true,
          academicTerm: { select: { id: true, code: true, name: true, termNumber: true } },
          subject: { select: { id: true, code: true, title: true } },
          classSection: { select: { id: true, code: true, name: true, programId: true, yearLevel: true } },
          faculty: { select: { role: true, faculty: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true } } } },
          schedules: {
            orderBy: [{ weekday: "asc" }, { startsAt: "asc" }],
            select: { id: true, weekday: true, startsAt: true, endsAt: true, room: { select: { id: true, code: true, name: true, building: true } } }
          }
        }
      }),
      this.prisma.academicTerm.findMany({
        where: { status: { not: "ARCHIVED" } }, orderBy: { startsOn: "desc" }, take: 12,
        select: { id: true, code: true, name: true, termNumber: true, startsOn: true, endsOn: true, status: true, academicYear: { select: { id: true, code: true, name: true } } }
      }),
      this.prisma.faculty.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { departmentId: assignment.program.departmentId },
            { departmentAssignments: { some: { departmentId: assignment.program.departmentId, startsOn: { lte: now }, OR: [{ endsOn: null }, { endsOn: { gte: now } }] } } }
          ]
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, employeeNumber: true, firstName: true, middleName: true, lastName: true, suffix: true, academicRank: true }
      }),
      this.prisma.room.findMany({
        where: { isActive: true }, orderBy: [{ building: "asc" }, { code: "asc" }],
        select: { id: true, code: true, name: true, building: true, roomType: true, capacity: true, departmentId: true }
      })
    ]);

    return {
      program: {
        id: assignment.program.id,
        code: assignment.program.code,
        name: assignment.program.name,
        durationYears: assignment.program.durationYears,
        termsPerYear: assignment.program.termsPerYear,
        department: assignment.program.department ? {
          id: assignment.program.department.id,
          code: assignment.program.department.code,
          name: assignment.program.department.name,
          college: assignment.program.department.college ? {
            id: assignment.program.department.college.id,
            code: assignment.program.department.college.code,
            name: assignment.program.department.college.name
          } : null
        } : null
      },
      curricula: curricula.map((curriculum) => ({
        ...curriculum,
        effectiveToYear: curriculum.effectiveToYear ?? null,
        totalUnits: curriculum.subjects.reduce((sum, item) => sum + Number(item.creditUnits), 0),
        subjects: curriculum.subjects.map((item) => ({
          ...item,
          creditUnits: decimal(item.creditUnits), lectureHours: decimal(item.lectureHours), laboratoryHours: decimal(item.laboratoryHours)
        }))
      })),
      students: students.map((student) => ({
        ...student,
        name: fullName(student), latestEnrollment: student.enrollments[0] ?? null, enrollments: undefined
      })),
      officialStudents: students.filter((student) => student.enrollments.length > 0).map((student) => ({
        ...student,
        name: fullName(student), latestEnrollment: student.enrollments[0], enrollments: undefined
      })),
      evaluations: evaluations.map((enrollment) => ({
        id: enrollment.id, status: enrollment.status, yearLevel: enrollment.yearLevel, updatedAt: enrollment.updatedAt,
        student: { ...enrollment.student, name: fullName(enrollment.student) }, academicTerm: enrollment.academicTerm,
        subjectCount: enrollment.items.length,
        totalUnits: enrollment.items.reduce((sum, item) => sum + Number(item.courseOffering.creditUnits), 0)
      })),
      courseOfferings: courseOfferings.map((offering) => ({
        ...offering,
        creditUnits: decimal(offering.creditUnits), lectureHours: decimal(offering.lectureHours), laboratoryHours: decimal(offering.laboratoryHours),
        faculty: offering.faculty.map((item) => ({ id: item.faculty.id, name: fullName(item.faculty), role: item.role })),
        schedules: offering.schedules.map((item) => ({ ...item, startsAt: timeOnly(item.startsAt), endsAt: timeOnly(item.endsAt) }))
      })),
      academicTerms: academicTerms.map((term) => ({ ...term, startsOn: dateOnly(term.startsOn), endsOn: dateOnly(term.endsOn) })),
      faculty: faculty.map((item) => ({ ...item, name: fullName(item) })),
      rooms,
      enrollmentApplications: await this.enrollmentApplications(userId)
    };
  }

  async enrollmentApplications(userId) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    const applications = await this.prisma.enrollmentApplication.findMany({
      where: { programId: assignment.programId, status: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: {
        student: { select: { id: true, studentNumber: true, firstName: true, middleName: true, lastName: true, suffix: true } },
        program: { select: { id: true, code: true, name: true } },
        curriculum: { select: { id: true, code: true, name: true, version: true } },
        academicTerm: { select: { id: true, name: true, academicYear: { select: { code: true } } } }
      }
    });
    return applications.map(({ formData, ...application }) => ({ ...application,
      student: { ...application.student, name: fullName(application.student) },
      subjectCount: Array.isArray(formData?.selection?.subjectIds) ? formData.selection.subjectIds.length : 0
    }));
  }

  async enrollmentApplicationReview(userId, applicationId) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    return buildApplicationReview(this.prisma, applicationId, assignment.programId);
  }

  async decideEnrollmentApplication(userId, applicationId, input) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    if (!["APPROVED", "RETURNED_FOR_CORRECTION", "REJECTED"].includes(input?.status)) throw new Error("INVALID_STATUS");
    const remarks = typeof input.remarks === "string" ? input.remarks.trim().slice(0, 2000) : "";
    if (input.status !== "APPROVED" && !remarks) throw new Error("DECISION_NOTES_REQUIRED");
    return this.transaction(async (transaction) => {
      const review = await buildApplicationReview(transaction, applicationId, assignment.programId);
      if (review.application.status !== "SUBMITTED") throw new Error("APPLICATION_LOCKED");
      if (input.status === "APPROVED" && !review.canApprove) throw reviewError("ENROLLMENT_RULES_FAILED", review);
      const admission = await transaction.admissionApplication.findFirst({
        where: { convertedStudentId: review.application.studentId, academicTermId: review.application.academicTermId },
        orderBy: { createdAt: "desc" }, select: { id: true, status: true, intendedProgramId: true }
      });
      if (!admission || admission.status !== "PENDING" || admission.intendedProgramId !== assignment.programId) throw new Error("APPLICATION_CONFLICT");
      const status = input.status === "APPROVED" ? "UNDER_REVIEW" : input.status;
      const now = new Date();
      const changed = await transaction.enrollmentApplication.updateMany({
        where: { id: applicationId, programId: assignment.programId, status: "SUBMITTED" },
        data: { status, curriculumId: review.curriculum?.id ?? review.application.curriculumId,
          reviewedAt: now, reviewedByUserId: userId, reviewRemarks: remarks || null }
      });
      if (changed.count !== 1) throw new Error("APPLICATION_CONFLICT");
      const admissionChanged = await transaction.admissionApplication.updateMany({
        where: { id: admission.id, status: "PENDING" },
        data: { status, decisionNotes: remarks || null, decisionByUserId: userId, decidedAt: now }
      });
      if (admissionChanged.count !== 1) throw new Error("APPLICATION_CONFLICT");
      await transaction.admissionApplicationStatusHistory.create({ data: {
        applicationId: admission.id, fromStatus: admission.status, toStatus: status,
        actionType: input.status === "APPROVED" ? "PROGRAM_HEAD_APPROVE" : input.status === "REJECTED" ? "REJECT" : "RETURN_FOR_CORRECTION",
        remarks: remarks || (input.status === "APPROVED" ? "Academic evaluation approved; forwarded to Registrar." : null),
        changedByUserId: userId, changedByRole: "program_head"
      } });
      return { id: applicationId, status, reviewRemarks: remarks || null };
    });
  }

  async createCurriculum(userId, input) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");

    const providedProgramId = typeof input?.programId === "string" ? input.programId.trim() : "";
    const programId = providedProgramId || assignment.programId;
    if (providedProgramId && programId !== assignment.programId) throw new Error("FORBIDDEN");

    const code = typeof input?.code === "string" ? input.code.trim() : "";
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const version = Number(input?.version);
    const effectiveFromYear = Number(input?.effectiveFromYear);
    const status = typeof input?.status === "string" ? input.status.toUpperCase() : "DRAFT";

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(code)) throw new Error("CURRICULUM_CODE_INVALID");
    if (!name || name.length > 200) throw new Error("CURRICULUM_NAME_INVALID");
    if (!Number.isInteger(version) || version <= 0) throw new Error("CURRICULUM_VERSION_INVALID");
    if (!Number.isInteger(effectiveFromYear) || effectiveFromYear < 1900 || effectiveFromYear > 9999) throw new Error("EFFECTIVE_YEAR_INVALID");
    if (!validStatuses.has(status)) throw new Error("CURRICULUM_STATUS_INVALID");

    try {
      return await this.prisma.curriculum.create({
        data: {
          id: newId(),
          programId,
          code,
          name,
          version,
          effectiveFromYear,
          status
        }
      });
    } catch (caught) {
      if (caught?.code === "P2002") throw new Error("CURRICULUM_DUPLICATE");
      throw caught;
    }
  }

  async addSubject(userId, curriculumId, input) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");

    const curriculum = await this.prisma.curriculum.findUnique({
      where: { id: curriculumId },
      select: { id: true, programId: true, status: true }
    });
    if (!curriculum) throw new Error("CURRICULUM_NOT_FOUND");
    if (curriculum.programId !== assignment.programId) throw new Error("FORBIDDEN");
    if (curriculum.status !== "DRAFT") throw new Error("CURRICULUM_LOCKED");

    const subjectId = typeof input?.subjectId === "string" ? input.subjectId.trim() : "";
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true, code: true, title: true, defaultCreditUnits: true,
        defaultLectureHours: true, defaultLaboratoryHours: true, status: true, isActive: true
      }
    });
    if (!subject || subject.status !== "ACTIVE" || !subject.isActive) throw new Error("SUBJECT_NOT_FOUND");

    const yearLevel = Number(input?.yearLevel);
    const termNumber = Number(input?.termNumber);
    const creditUnits = Number(input?.creditUnits ?? subject.defaultCreditUnits);
    const lectureHours = Number(input?.lectureHours ?? subject.defaultLectureHours);
    const laboratoryHours = Number(input?.laboratoryHours ?? subject.defaultLaboratoryHours);
    const type = typeof input?.type === "string" ? input.type.toUpperCase() : "REQUIRED";
    const isRequired = input?.isRequired !== undefined ? Boolean(input.isRequired) : type === "REQUIRED";

    if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > assignment.program.durationYears) throw new Error("CURRICULUM_SUBJECT_INVALID");
    if (!Number.isInteger(termNumber) || termNumber < 1 || termNumber > assignment.program.termsPerYear) throw new Error("CURRICULUM_SUBJECT_INVALID");
    if (!Number.isFinite(creditUnits) || creditUnits <= 0 || !Number.isFinite(lectureHours) || lectureHours < 0 || !Number.isFinite(laboratoryHours) || laboratoryHours < 0) throw new Error("CURRICULUM_SUBJECT_INVALID");
    if (!validSubjectTypes.has(type)) throw new Error("CURRICULUM_SUBJECT_INVALID");

    try {
      return await this.prisma.curriculumSubject.create({
        data: {
          id: newId(),
          curriculumId,
          subjectId: subject.id,
          yearLevel,
          termNumber,
          creditUnits,
          lectureHours,
          laboratoryHours,
          type,
          isRequired,
          sortOrder: Number(input?.sortOrder ?? 0)
        },
        include: { subject: true }
      });
    } catch (caught) {
      if (caught?.code === "P2002") throw new Error("SUBJECT_ALREADY_ASSIGNED");
      throw caught;
    }
  }

  async subjectCatalog(userId, query = "") {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    const search = typeof query === "string" ? query.trim().slice(0, 100) : "";
    const subjects = await this.prisma.subject.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        ...(search ? { OR: [
          { code: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } }
        ] } : {})
      },
      orderBy: { code: "asc" },
      take: 250,
      select: {
        id: true, departmentId: true, code: true, title: true, description: true,
        defaultCreditUnits: true, defaultLectureHours: true, defaultLaboratoryHours: true,
        department: { select: { id: true, code: true, name: true } },
        requirements: {
          orderBy: [{ type: "asc" }, { requiredSubject: { code: "asc" } }],
          select: { id: true, type: true, requiredSubject: { select: { id: true, code: true, title: true } } }
        }
      }
    });
    return subjects.map((subject) => ({
      ...subject,
      defaultCreditUnits: decimal(subject.defaultCreditUnits),
      defaultLectureHours: decimal(subject.defaultLectureHours),
      defaultLaboratoryHours: decimal(subject.defaultLaboratoryHours),
      shared: subject.departmentId !== assignment.program.departmentId
    }));
  }

  async studentDetail(userId, studentId) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, programId: assignment.programId },
      select: {
        id: true, studentNumber: true, firstName: true, middleName: true, lastName: true, suffix: true,
        currentYearLevel: true, status: true, institutionalEmail: true,
        curriculum: { select: { id: true, code: true, name: true, version: true, status: true } },
        curriculumAssignments: {
          orderBy: { startsOn: "desc" },
          select: { id: true, startsOn: true, endsOn: true, reason: true, curriculum: { select: { id: true, code: true, name: true, version: true, status: true } } }
        },
        enrollments: {
          where: { status: { in: ["PENDING", "ASSESSED", "ENROLLED", "COMPLETED"] } },
          orderBy: { academicTerm: { startsOn: "desc" } },
          select: {
            id: true, yearLevel: true, status: true, enrolledAt: true,
            academicTerm: { select: { id: true, code: true, name: true, termNumber: true } },
            curriculum: { select: { id: true, code: true, name: true, version: true } },
            items: {
              orderBy: { courseOffering: { subject: { code: "asc" } } },
              select: {
                id: true, status: true, remarks: true, overrideReason: true,
                overrideApprovedBy: { select: { id: true, displayName: true } },
                courseOffering: {
                  select: {
                    id: true, offeringCode: true, creditUnits: true,
                    subject: { select: { id: true, code: true, title: true } },
                    classSection: { select: { id: true, code: true, name: true } }
                  }
                },
                grades: {
                  where: { status: { in: finalGradeStatuses } },
                  orderBy: { updatedAt: "desc" },
                  select: {
                    id: true, numericGrade: true, letterGrade: true, isPassing: true, remarks: true,
                    status: true, completionDueAt: true,
                    gradingPeriod: { select: { id: true, name: true, type: true, isFinal: true } },
                    history: {
                      orderBy: { changedAt: "desc" },
                      select: { id: true, previousNumeric: true, previousLetter: true, newNumeric: true, newLetter: true, newStatus: true, reason: true, changedAt: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!student) throw new Error("STUDENT_NOT_FOUND");
    return {
      ...student,
      name: fullName(student),
      curriculumAssignments: student.curriculumAssignments.map((item) => ({ ...item, startsOn: dateOnly(item.startsOn), endsOn: dateOnly(item.endsOn) })),
      enrollments: student.enrollments.map((enrollment) => ({
        ...enrollment,
        items: enrollment.items.map((item) => ({
          ...item,
          courseOffering: { ...item.courseOffering, creditUnits: decimal(item.courseOffering.creditUnits) },
          grades: item.grades.map((grade) => ({
            ...grade, numericGrade: decimal(grade.numericGrade), completionDueAt: dateOnly(grade.completionDueAt),
            history: grade.history.map((history) => ({ ...history, previousNumeric: decimal(history.previousNumeric), newNumeric: decimal(history.newNumeric) }))
          }))
        }))
      }))
    };
  }

  async createOffering(userId, input) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    const academicTermId = typeof input?.academicTermId === "string" ? input.academicTermId.trim() : "";
    const curriculumId = typeof input?.curriculumId === "string" ? input.curriculumId.trim() : "";
    const subjectId = typeof input?.subjectId === "string" ? input.subjectId.trim() : "";
    const sectionCode = typeof input?.sectionCode === "string" ? input.sectionCode.trim() : "";
    const sectionName = typeof input?.sectionName === "string" ? input.sectionName.trim().slice(0, 150) : "";
    const offeringCode = typeof input?.offeringCode === "string" ? input.offeringCode.trim() : "";
    const facultyId = typeof input?.facultyId === "string" && input.facultyId ? input.facultyId : null;
    const roomId = typeof input?.roomId === "string" && input.roomId ? input.roomId : null;
    const weekday = typeof input?.weekday === "string" && input.weekday ? input.weekday.toUpperCase() : null;
    const startsAt = input?.startsAt ? parseTime(input.startsAt) : null;
    const endsAt = input?.endsAt ? parseTime(input.endsAt) : null;
    const capacity = input?.capacity == null || input.capacity === "" ? null : Number(input.capacity);

    if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/.test(sectionCode)) throw new Error("SECTION_CODE_INVALID");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(offeringCode)) throw new Error("OFFERING_CODE_INVALID");
    if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0 || capacity > 32767)) throw new Error("OFFERING_INVALID");
    if (weekday && !validWeekdays.has(weekday)) throw new Error("SCHEDULE_INVALID");
    if (Boolean(weekday) !== Boolean(startsAt && endsAt) || startsAt && startsAt >= endsAt) throw new Error("SCHEDULE_INVALID");

    return this.transaction(async (transaction) => {
      const [term, curriculum, placement, faculty, room] = await Promise.all([
        transaction.academicTerm.findFirst({
          where: { id: academicTermId, status: { notIn: ["CLOSED", "ARCHIVED"] } },
          select: { id: true, startsOn: true, endsOn: true }
        }),
        transaction.curriculum.findFirst({ where: { id: curriculumId, programId: assignment.programId }, select: { id: true } }),
        transaction.curriculumSubject.findFirst({
          where: { curriculumId, subjectId },
          select: { subjectId: true, yearLevel: true, creditUnits: true, lectureHours: true, laboratoryHours: true }
        }),
        facultyId ? transaction.faculty.findFirst({
          where: {
            id: facultyId, status: "ACTIVE",
            OR: [
              { departmentId: assignment.program.departmentId },
              { departmentAssignments: { some: { departmentId: assignment.program.departmentId } } }
            ]
          },
          select: { id: true }
        }) : Promise.resolve(null),
        roomId ? transaction.room.findFirst({ where: { id: roomId, isActive: true }, select: { id: true } }) : Promise.resolve(null)
      ]);
      if (!term) throw new Error("ACADEMIC_TERM_INVALID");
      if (!curriculum) throw new Error("CURRICULUM_NOT_FOUND");
      if (!placement) throw new Error("CURRICULUM_SUBJECT_NOT_FOUND");
      if (facultyId && !faculty) throw new Error("FACULTY_INVALID");
      if (roomId && !room) throw new Error("ROOM_INVALID");

      const existingSection = await transaction.classSection.findUnique({
        where: { academicTermId_programId_code: { academicTermId, programId: assignment.programId, code: sectionCode } },
        select: { id: true, curriculumId: true, yearLevel: true }
      });
      if (existingSection && ((existingSection.curriculumId && existingSection.curriculumId !== curriculumId) || existingSection.yearLevel !== placement.yearLevel)) {
        throw new Error("SECTION_CONFLICT");
      }

      if (weekday && (facultyId || roomId)) {
        const alternatives = [];
        if (roomId) alternatives.push({ roomId });
        if (facultyId) alternatives.push({ courseOffering: { faculty: { some: { facultyId } } } });
        const conflict = await transaction.classSchedule.findFirst({
          where: {
            weekday, startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
            courseOffering: { academicTermId }, OR: alternatives
          },
          select: { id: true }
        });
        if (conflict) throw new Error("SCHEDULE_CONFLICT");
      }

      const section = existingSection ?? await transaction.classSection.create({
        data: {
          id: newId(), academicTermId, programId: assignment.programId, curriculumId,
          code: sectionCode, name: sectionName || null, yearLevel: placement.yearLevel, capacity
        },
        select: { id: true }
      });

      try {
        return await transaction.courseOffering.create({
          data: {
            id: newId(), academicTermId, subjectId, classSectionId: section.id, offeringCode,
            creditUnits: placement.creditUnits, lectureHours: placement.lectureHours,
            laboratoryHours: placement.laboratoryHours, capacity, status: "OPEN",
            faculty: facultyId ? { create: { id: newId(), facultyId, role: "PRIMARY_INSTRUCTOR" } } : undefined,
            schedules: weekday ? { create: { id: newId(), roomId, weekday, startsAt, endsAt, effectiveFrom: term.startsOn, effectiveTo: term.endsOn } } : undefined
          },
          select: {
            id: true, offeringCode: true, status: true,
            subject: { select: { id: true, code: true, title: true } },
            classSection: { select: { id: true, code: true, name: true, yearLevel: true, programId: true } }
          }
        });
      } catch (caught) {
        if (caught?.code === "P2002") throw new Error("OFFERING_DUPLICATE");
        throw caught;
      }
    });
  }

  async buildEnrollmentEvaluation(database, assignment, enrollmentId) {
    const enrollment = await database.enrollment.findFirst({
      where: { id: enrollmentId, programId: assignment.programId },
      select: {
        id: true, yearLevel: true, status: true,
        student: { select: { id: true, studentNumber: true, firstName: true, middleName: true, lastName: true, suffix: true } },
        academicTerm: { select: { id: true, code: true, name: true, termNumber: true, startsOn: true } },
        curriculum: {
          select: {
            id: true, code: true, name: true, version: true,
            subjects: { select: { subjectId: true, yearLevel: true, termNumber: true, type: true } }
          }
        },
        items: {
          where: { status: { in: activeItemStatuses } },
          orderBy: { courseOffering: { subject: { code: "asc" } } },
          select: {
            id: true, status: true, overrideReason: true, overrideApprovedByUserId: true,
            courseOffering: {
              select: {
                offeringCode: true, creditUnits: true,
                subject: {
                  select: {
                    id: true, code: true, title: true,
                    requirements: {
                      select: { type: true, requiredSubject: { select: { id: true, code: true, title: true } } }
                    }
                  }
                },
                classSection: { select: { id: true, code: true, yearLevel: true, programId: true } }
              }
            }
          }
        }
      }
    });
    if (!enrollment) throw new Error("ENROLLMENT_NOT_FOUND");

    const history = await database.enrollmentItem.findMany({
      where: {
        enrollment: { studentId: enrollment.student.id },
        courseOffering: { academicTerm: { startsOn: { lt: enrollment.academicTerm.startsOn } } },
        grades: { some: { status: { in: finalGradeStatuses }, OR: [{ gradingPeriod: { isFinal: true } }, { gradingPeriod: { type: "COMPLETION" } }] } }
      },
      select: {
        courseOffering: { select: { subject: { select: { id: true, code: true, title: true } } } },
        grades: {
          where: { status: { in: finalGradeStatuses }, OR: [{ gradingPeriod: { isFinal: true } }, { gradingPeriod: { type: "COMPLETION" } }] },
          orderBy: { updatedAt: "asc" },
          select: { isPassing: true, letterGrade: true, remarks: true, updatedAt: true }
        }
      }
    });

    const historySubject = new Map();
    for (const item of history) {
      const subject = item.courseOffering.subject;
      historySubject.set(subject.id, subject);
    }
    const academicRecords = buildAcademicRecordIndex(history);
    const passed = new Set([...academicRecords].filter(([, state]) => state === "PASSED").map(([subjectId]) => subjectId));
    const incomplete = [...academicRecords].filter(([, state]) => state === "INC").map(([subjectId]) => subjectId);
    const selected = new Set(enrollment.items.map((item) => item.courseOffering.subject.id));
    const placements = new Map(enrollment.curriculum.subjects.map((item) => [item.subjectId, item]));
    const totalUnits = enrollment.items.reduce((sum, item) => sum + Number(item.courseOffering.creditUnits), 0);
    const issues = [];

    if (totalUnits > 29) {
      issues.push({ code: "MAX_UNITS_EXCEEDED", blocking: true, message: `Selected load is ${totalUnits} units; the maximum is 29.` });
    }
    for (const subjectId of incomplete) {
      const subject = historySubject.get(subjectId);
      issues.push({
        code: "INC_RESTRICTION", blocking: true, subjectId, subjectCode: subject?.code,
        message: `${subject?.code ?? "A prior subject"} has an unresolved INC grade.`
      });
    }

    const items = enrollment.items.map((item) => {
      const subject = item.courseOffering.subject;
      const placement = placements.get(subject.id);
      const itemIssues = [];
      if (!placement) {
        itemIssues.push({ code: "OUTSIDE_CURRICULUM", blocking: true, message: `${subject.code} is not part of the assigned curriculum.` });
      } else {
        if (placement.yearLevel > enrollment.yearLevel) {
          itemIssues.push({ code: "YEAR_LEVEL_RESTRICTION", blocking: true, message: `${subject.code} is placed in Year ${placement.yearLevel}.` });
        }
        if (placement.termNumber !== enrollment.academicTerm.termNumber) {
          itemIssues.push({ code: "OFF_TERM_SUBJECT", blocking: false, message: `${subject.code} is normally offered in Term ${placement.termNumber}.` });
        }
      }
      for (const requirement of subject.requirements) {
        const completed = prerequisiteState(requirement.requiredSubject.id, academicRecords) === "PASSED";
        if (requirement.type === "PREREQUISITE" && !completed) {
          const overridden = Boolean(item.overrideApprovedByUserId && item.overrideReason);
          itemIssues.push({
            code: "MISSING_PREREQUISITE", blocking: !overridden, overrideEligible: true, overridden,
            requiredSubject: requirement.requiredSubject,
            message: `${requirement.requiredSubject.code} has not been completed with a passing final grade.`
          });
        }
        if (requirement.type === "COREQUISITE" && !completed && !selected.has(requirement.requiredSubject.id)) {
          itemIssues.push({
            code: "MISSING_COREQUISITE", blocking: true, requiredSubject: requirement.requiredSubject,
            message: `${requirement.requiredSubject.code} must be completed or enrolled at the same time.`
          });
        }
      }
      issues.push(...itemIssues.map((issue) => ({ ...issue, enrollmentItemId: item.id, subjectId: subject.id, subjectCode: subject.code })));
      return {
        id: item.id, status: item.status, subject, offeringCode: item.courseOffering.offeringCode,
        section: item.courseOffering.classSection, creditUnits: decimal(item.courseOffering.creditUnits),
        placement: placement ?? null,
        override: item.overrideApprovedByUserId ? { approvedByUserId: item.overrideApprovedByUserId, reason: item.overrideReason } : null,
        issues: itemIssues
      };
    });

    return {
      enrollment: {
        id: enrollment.id, status: enrollment.status, yearLevel: enrollment.yearLevel,
        student: { ...enrollment.student, name: fullName(enrollment.student) },
        academicTerm: enrollment.academicTerm,
        curriculum: { id: enrollment.curriculum.id, code: enrollment.curriculum.code, name: enrollment.curriculum.name, version: enrollment.curriculum.version }
      },
      totalUnits, maximumUnits: 29, items, issues,
      blockingIssues: issues.filter((issue) => issue.blocking),
      canApprove: issues.every((issue) => !issue.blocking)
    };
  }

  async enrollmentEvaluation(userId, enrollmentId) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    return this.buildEnrollmentEvaluation(this.prisma, assignment, enrollmentId);
  }

  async approveEnrollmentEvaluation(userId, enrollmentId, input) {
    const assignment = await this.getActiveAssignment(userId);
    if (!assignment) throw new Error("PROGRAM_HEAD_ASSIGNMENT_REQUIRED");
    const overrideItemIds = [...new Set(Array.isArray(input?.overrideItemIds) ? input.overrideItemIds.filter((id) => typeof id === "string" && id) : [])];
    const overrideReason = typeof input?.overrideReason === "string" ? input.overrideReason.trim().slice(0, 500) : "";
    if (overrideItemIds.length && !overrideReason) throw new Error("OVERRIDE_REASON_REQUIRED");

    return this.transaction(async (transaction) => {
      const before = await this.buildEnrollmentEvaluation(transaction, assignment, enrollmentId);
      if (before.enrollment.status !== "PENDING") throw new Error("ENROLLMENT_NOT_REVIEWABLE");
      const eligible = new Set(before.issues.filter((issue) => issue.code === "MISSING_PREREQUISITE").map((issue) => issue.enrollmentItemId));
      if (overrideItemIds.some((id) => !eligible.has(id))) throw new Error("OVERRIDE_INVALID");
      if (overrideItemIds.length) {
        const changed = await transaction.enrollmentItem.updateMany({
          where: { id: { in: overrideItemIds }, enrollmentId },
          data: { overrideApprovedByUserId: userId, overrideReason }
        });
        if (changed.count !== overrideItemIds.length) throw new Error("OVERRIDE_INVALID");
      }
      const evaluation = await this.buildEnrollmentEvaluation(transaction, assignment, enrollmentId);
      if (!evaluation.canApprove) throw detailedError("ENROLLMENT_RULES_FAILED", evaluation);
      const now = new Date();
      await transaction.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "ASSESSED", processedByUserId: userId, updatedAt: now }
      });
      await transaction.enrollmentStatusHistory.create({
        data: {
          id: newId(), enrollmentId, fromStatus: "PENDING", toStatus: "ASSESSED",
          reason: overrideItemIds.length ? `Academic evaluation approved with prerequisite override: ${overrideReason}` : "Academic evaluation approved by Program Head",
          changedByUserId: userId, changedAt: now
        }
      });
      return { ...evaluation, enrollment: { ...evaluation.enrollment, status: "ASSESSED" } };
    });
  }
}
