import { newId, normalizeIdentifier } from "./security.mjs";
import { buildAcademicRecordIndex, requirementEligibility } from "./academic-eligibility.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : null;
const fullName = (student) => [student.firstName, student.middleName, student.lastName, student.suffix].filter(Boolean).join(" ");
const allowedStatuses = new Set(["DRAFT", "RETURNED_FOR_CORRECTION", "REJECTED"]);

function academicYearNumber(term) {
  const value = term?.academicYear?.startsOn ?? term?.startsOn;
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getUTCFullYear();
  }
  return null;
}

function assignmentApplies(assignment, term) {
  if (!term?.startsOn) return false;
  const startsOn = new Date(assignment.startsOn);
  const termStartsOn = new Date(term.startsOn);
  const endsOn = assignment.endsOn ? new Date(assignment.endsOn) : null;
  return startsOn <= termStartsOn && (!endsOn || endsOn >= termStartsOn);
}

function curriculumForTerm(student, curricula, term) {
  const assignedId = student.curriculumAssignments?.find((assignment) => assignmentApplies(assignment, term))?.curriculumId
    ?? student.curriculumId;
  if (assignedId) return curricula.find((curriculum) => curriculum.id === assignedId) ?? null;
  const year = academicYearNumber(term);
  return curricula.find((curriculum) => year != null
    && curriculum.effectiveFromYear <= year
    && (curriculum.effectiveToYear == null || curriculum.effectiveToYear >= year)) ?? null;
}

const formFields = {
  personal: ["fullName", "birthday", "sex", "civilStatus", "nationality", "religion", "placeOfBirth"],
  contact: ["mobileNumber", "telephoneNumber", "personalEmail", "presentAddress", "permanentAddress"],
  family: ["father", "mother", "guardian"],
  emergency: ["name", "relationship", "contactNumber"],
  education: ["elementary", "juniorHigh", "seniorHigh"]
};

function copyFormData(input = {}, selectedSubjectIds = []) {
  const result = {};
  for (const [section, fields] of Object.entries(formFields)) {
    if (!input[section] || typeof input[section] !== "object" || Array.isArray(input[section])) continue;
    result[section] = {};
    for (const field of fields) {
      const value = input[section][field];
      if (typeof value === "string") result[section][field] = value.trim().slice(0, 2000);
      else if (value && typeof value === "object" && !Array.isArray(value)) {
        result[section][field] = Object.fromEntries(Object.entries(value).slice(0, 20).map(([key, item]) => [
          String(key).slice(0, 64), typeof item === "string" ? item.trim().slice(0, 500) : Boolean(item)
        ]));
      }
    }
  }
  result.selection = { subjectIds: selectedSubjectIds };
  return result;
}

function profileData(student) {
  return {
    studentNumber: student.studentNumber,
    schoolEmail: student.institutionalEmail,
    fullName: fullName(student),
    birthday: dateOnly(student.dateOfBirth),
    currentYearLevel: student.currentYearLevel,
    personalEmail: null,
    mobileNumber: null
  };
}

export class EnrollmentApplicationStore {
  constructor(prisma) {
    this.prisma = prisma;
  }

  transaction(operation) {
    if (typeof this.prisma.$transaction !== "function") return operation(this.prisma);
    return this.prisma.$transaction((transaction) => operation(transaction));
  }

  async options(userId) {
    const student = userId ? await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true, programId: true, curriculumId: true, currentYearLevel: true,
        program: {
          select: { id: true, code: true, name: true, credential: true, durationYears: true, termsPerYear: true, isActive: true,
            department: { select: { isActive: true, college: { select: { isActive: true } } } } }
        },
        curriculumAssignments: {
          orderBy: { startsOn: "desc" },
          select: { curriculumId: true, startsOn: true, endsOn: true }
        }
      }
    }) : null;
    const programAvailable = Boolean(student?.program?.isActive && student.program.department.isActive && student.program.department.college.isActive);
    const programs = programAvailable ? [{
      id: student.program.id,
      code: student.program.code,
      name: student.program.name,
      credential: student.program.credential,
      durationYears: student.program.durationYears,
      termsPerYear: student.program.termsPerYear
    }] : [];
    const [terms, curricula, history] = await Promise.all([
      this.prisma.academicTerm.findMany({
        where: {
          status: { not: "ARCHIVED" },
          enrollmentPeriods: { some: { status: "OPEN" } }
        },
        select: {
          id: true, academicYearId: true, code: true, name: true, termNumber: true, startsOn: true, endsOn: true, status: true,
          academicYear: { select: { code: true, name: true, startsOn: true } },
          enrollmentPeriods: { select: { id: true, status: true } }
        },
        orderBy: { startsOn: "desc" }
      }),
      this.prisma.curriculum.findMany({
        where: {
          status: { in: ["ACTIVE", "DRAFT"] },
          ...(student?.programId ? { programId: student.programId } : { id: { in: [] } })
        },
        orderBy: [{ effectiveFromYear: "desc" }, { version: "desc" }, { createdAt: "desc" }],
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
            where: { subject: { is: { status: "ACTIVE", isActive: true } } },
            orderBy: [{ yearLevel: "asc" }, { termNumber: "asc" }, { sortOrder: "asc" }, { subject: { code: "asc" } }],
            select: {
              id: true,
              subjectId: true,
              yearLevel: true,
              termNumber: true,
              creditUnits: true,
              lectureHours: true,
              laboratoryHours: true,
              type: true,
              isRequired: true,
              sortOrder: true,
              subject: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  description: true,
                  status: true,
                  isActive: true,
                  requirements: { select: { type: true, requiredSubject: { select: { id: true, code: true, title: true } } } }
                }
              }
            }
          }
        }
      }),
      student ? this.prisma.student.findUnique({
        where: { id: student.id },
        select: { enrollments: {
            where: { status: { in: ["PENDING", "ASSESSED", "ENROLLED", "COMPLETED"] } },
            select: {
              items: {
                select: {
                  courseOffering: { select: { subjectId: true } },
                  grades: {
                    where: { status: { in: ["APPROVED", "POSTED"] }, OR: [{ gradingPeriod: { isFinal: true } }, { gradingPeriod: { type: "COMPLETION" } }] },
                    select: { status: true, isPassing: true, letterGrade: true, remarks: true, updatedAt: true }
                  }
                }
              }
            }
          } }
      }) : Promise.resolve(null)
    ]);

    const academicRecords = buildAcademicRecordIndex((history?.enrollments || []).flatMap((enrollment) => enrollment.items));

    const curriculumSubjects = terms.flatMap((term) => {
      const curriculum = curriculumForTerm(student ?? {}, curricula, term);
      if (!curriculum) return [];
      return curriculum.subjects.map((item) => ({
      id: item.id,
      academicTermId: term.id,
      curriculumId: curriculum.id,
      programId: curriculum.programId,
      curriculumCode: curriculum.code,
      curriculumName: curriculum.name,
      yearLevel: item.yearLevel,
      termNumber: item.termNumber,
      subjectId: item.subjectId,
      subjectCode: item.subject.code,
      subjectTitle: item.subject.title,
      subjectDescription: item.subject.description,
      creditUnits: Number(item.creditUnits),
      lectureHours: Number(item.lectureHours),
      laboratoryHours: Number(item.laboratoryHours),
      type: item.type,
      isRequired: item.isRequired,
      sortOrder: item.sortOrder,
      requirements: requirementEligibility(item.subject.requirements, academicRecords),
      prerequisites: requirementEligibility(item.subject.requirements, academicRecords).filter((requirement) => requirement.type === "PREREQUISITE")
      }));
    });

    return {
      programs,
      studentContext: student ? {
        programId: student.programId,
        curriculumId: student.curriculumId,
        currentYearLevel: student.currentYearLevel
      } : null,
      terms: terms.map((term) => ({
        ...term,
        academicYear: { ...term.academicYear, startsOn: dateOnly(term.academicYear.startsOn) },
        startsOn: dateOnly(term.startsOn),
        endsOn: dateOnly(term.endsOn),
        periodStatus: term.enrollmentPeriods[0]?.status ?? null,
        enrollmentOpen: term.enrollmentPeriods[0]?.status === "OPEN"
      })),
      curriculumSubjects
    };
  }

  async getForUser(userId) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true, studentNumber: true, firstName: true, middleName: true, lastName: true, suffix: true,
        dateOfBirth: true, institutionalEmail: true, programId: true, currentYearLevel: true
      }
    });
    if (!student) return null;
    const openPeriod = await this.prisma.enrollmentPeriod.findFirst({
      where: { status: "OPEN" },
      orderBy: { updatedAt: "desc" },
      select: { academicTermId: true }
    });
    const application = await this.prisma.enrollmentApplication.findFirst({
      where: {
        studentId: student.id,
        ...(openPeriod ? { academicTermId: openPeriod.academicTermId } : {})
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, programId: true, academicTermId: true, curriculumId: true, yearLevel: true,
        status: true, formData: true, submittedAt: true, reviewedAt: true, reviewRemarks: true
      }
    });
    const admission = await this.prisma.admissionApplication.findFirst({
      where: { convertedStudentId: student.id, ...(openPeriod ? { academicTermId: openPeriod.academicTermId } : application ? { academicTermId: application.academicTermId } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, applicationNumber: true, status: true, attemptNumber: true,
        decisionNotes: true, decidedAt: true, academicTermId: true,
        history: {
          where: { actionType: { in: ["RETURN_FOR_CORRECTION", "REJECT"] } },
          orderBy: { changedAt: "desc" },
          select: { actionType: true, remarks: true, changedAt: true }
        }
      }
    });
    return {
      profile: profileData(student),
      application,
      admission: admission ? {
        ...admission,
        decidedAt: dateOnly(admission.decidedAt),
        history: admission.history.map((entry) => ({
          ...entry,
          changedAt: entry.changedAt.toISOString()
        }))
      } : null,
      feedback: admission?.history.map((entry) => ({
        actionType: entry.actionType,
        comment: entry.remarks,
        createdAt: entry.changedAt.toISOString()
      })) ?? []
    };
  }

  async save(userId, input, submit = false) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true, studentNumber: true, firstName: true, middleName: true, lastName: true,
        suffix: true, dateOfBirth: true, institutionalEmail: true, admissionYear: true,
        programId: true, curriculumId: true, currentYearLevel: true
      }
    });
    if (!student) throw new Error("STUDENT_PROFILE_REQUIRED");
    const program = await this.prisma.program.findFirst({
      where: {
        id: input.programId,
        isActive: true,
        department: { is: { isActive: true, college: { is: { isActive: true } } } }
      },
      select: { id: true }
    });
    const term = await this.prisma.academicTerm.findFirst({
      where: { id: input.academicTermId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        academicYearId: true,
        termNumber: true,
        enrollmentPeriods: { where: { status: "OPEN" }, select: { id: true, status: true }, take: 1 }
      }
    });
    if (!program) throw new Error("PROGRAM_INVALID");
    if (!student.programId || program.id !== student.programId) throw new Error("STUDENT_PROGRAM_MISMATCH");
    if (!term) throw new Error("TERM_INVALID");
    const existing = await this.prisma.enrollmentApplication.findUnique({
      where: { studentId_academicTermId: { studentId: student.id, academicTermId: term.id } }
    });
    if (existing && !allowedStatuses.has(existing.status)) throw new Error("APPLICATION_LOCKED");
    if (submit && term.enrollmentPeriods[0]?.status !== "OPEN") throw new Error("ENROLLMENT_CLOSED");
    const yearLevel = Number(input.yearLevel);
    if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 8) throw new Error("YEAR_LEVEL_INVALID");
    if (yearLevel !== student.currentYearLevel) throw new Error("STUDENT_YEAR_LEVEL_MISMATCH");
    const selectedSubjectIds = [...new Set(Array.isArray(input.selectedSubjectIds) ? input.selectedSubjectIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()) : [])];
    const formData = copyFormData(input.formData, selectedSubjectIds);
    let curriculumId = existing?.programId === program.id ? existing.curriculumId : null;
    if (JSON.stringify(formData).length > 60000) throw new Error("FORM_TOO_LARGE");
    if (submit) {
      const required = [formData.personal?.fullName, formData.personal?.birthday, formData.personal?.sex,
      formData.personal?.civilStatus, formData.personal?.nationality, formData.personal?.religion,
      formData.personal?.placeOfBirth, formData.contact?.mobileNumber, formData.contact?.personalEmail,
      formData.contact?.presentAddress, formData.contact?.permanentAddress];
      if (required.some((value) => typeof value !== "string" || !value.trim())) throw new Error("FORM_INCOMPLETE");

      const entranceFee = await this.prisma.paymentType.findFirst({
        where: { name: "Entrance Fee", isActive: true },
        select: { id: true }
      });
      if (!entranceFee) throw new Error("ENTRANCE_FEE_NOT_CONFIGURED");
      const feeObligation = await this.prisma.studentObligation.findFirst({
        where: {
          studentId: student.id,
          paymentTypeId: entranceFee.id,
          academicYearId: term.academicYearId,
          academicTermId: term.id,
          status: { not: "CANCELLED" }
        },
        select: {
          status: true,
          transactions: {
            where: { enrollmentPeriodId: term.enrollmentPeriods[0].id, status: "VERIFIED" },
            select: { id: true },
            take: 1
          }
        }
      });
      const feeSatisfied = feeObligation?.status === "WAIVED"
        || (feeObligation?.status === "PAID" && feeObligation.transactions.length > 0);
      if (!feeSatisfied) {
        throw new Error("ENTRANCE_FEE_REQUIRED");
      }

      const options = await this.options(userId);
      const selected = options.curriculumSubjects.filter((item) => item.academicTermId === term.id && item.programId === program.id && item.yearLevel === yearLevel && item.termNumber === term.termNumber);
      const selectedSet = new Set(selectedSubjectIds);
      const invalidSelection = selectedSubjectIds.some((subjectId) => !selected.some((item) => item.subjectId === subjectId || item.id === subjectId));
      const validSelected = selected.filter((item) => selectedSet.has(item.subjectId) || selectedSet.has(item.id));
      const selectedCatalogSubjectIds = new Set(validSelected.map((item) => item.subjectId));
      const blockedPrerequisites = validSelected.flatMap((item) => item.requirements.filter((requirement) => requirement.type === "PREREQUISITE" && !requirement.eligible));
      const blockedCorequisites = validSelected.flatMap((item) => item.requirements.filter((requirement) => requirement.type === "COREQUISITE"
        && !requirement.eligible && !selectedCatalogSubjectIds.has(requirement.requiredSubject.id)));
      const totalUnits = validSelected.reduce((sum, item) => sum + Number(item.creditUnits), 0);
      if (invalidSelection) throw new Error("SUBJECT_SELECTION_INVALID");
      if (!validSelected.length) throw new Error("SUBJECT_SELECTION_REQUIRED");
      if (validSelected.length !== selectedSubjectIds.length) throw new Error("SUBJECT_SELECTION_INVALID");
      if (blockedPrerequisites.length) throw new Error("PREREQUISITE_NOT_MET");
      if (blockedCorequisites.length) throw new Error("COREQUISITE_NOT_MET");
      if (totalUnits > 29) throw new Error("MAX_UNITS_EXCEEDED");
      curriculumId = validSelected[0].curriculumId;
      formData.selection.subjectIds = validSelected.map((item) => item.id);
    } else if (selectedSubjectIds.length) {
      const options = await this.options(userId);
      const eligible = options.curriculumSubjects.filter((item) => item.academicTermId === term.id && item.programId === program.id && item.yearLevel === yearLevel && item.termNumber === term.termNumber);
      const selectedSet = new Set(selectedSubjectIds);
      const validSelected = eligible.filter((item) => selectedSet.has(item.subjectId) || selectedSet.has(item.id));
      if (validSelected.length !== selectedSubjectIds.length) throw new Error("SUBJECT_SELECTION_INVALID");
      curriculumId = validSelected[0]?.curriculumId ?? curriculumId;
      formData.selection.subjectIds = validSelected.map((item) => item.id);
    }
    const values = {
      programId: program.id,
      academicTermId: term.id,
      curriculumId,
      yearLevel,
      formData,
      status: submit ? "SUBMITTED" : "DRAFT",
      submittedAt: submit ? new Date() : existing?.submittedAt ?? null,
      reviewRemarks: submit ? null : existing?.reviewRemarks ?? null
    };
    const admission = await this.prisma.admissionApplication.findFirst({
      where: { convertedStudentId: student.id, academicTermId: term.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, attemptNumber: true, academicTermId: true }
    });
    const admissionForTerm = admission?.academicTermId === term.id ? admission : null;
    if (admissionForTerm?.status === "APPROVED") {
      throw new Error("APPLICATION_LOCKED");
    }

    return this.transaction(async (transaction) => {
      const application = await transaction.enrollmentApplication.upsert({
        where: { studentId_academicTermId: { studentId: student.id, academicTermId: term.id } },
        update: values,
        create: { id: newId(), studentId: student.id, ...values }
      });

      if (submit && (!admissionForTerm || admissionForTerm.status === "REJECTED")) {
        const applicationId = newId();
        const applicationNumber = `APP-${student.admissionYear}-${applicationId.slice(0, 8).toUpperCase()}`;
        await transaction.admissionApplication.create({
          data: {
            id: applicationId,
            applicationNumber,
            applicationNumberNormalized: normalizeIdentifier(applicationNumber),
            applicantUserId: userId,
            intendedProgramId: program.id,
            academicTermId: term.id,
            convertedStudentId: student.id,
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            suffix: student.suffix,
            birthDate: student.dateOfBirth,
            email: formData.contact?.personalEmail || student.institutionalEmail,
            phone: formData.contact?.mobileNumber || null,
            status: "PENDING",
            submittedAt: new Date(),
            metadata: { formData },
            attemptNumber: 1,
            history: {
              create: {
                toStatus: "PENDING",
                actionType: "STUDENT_SUBMIT",
                changedByUserId: userId,
                changedByRole: "student",
                remarks: admissionForTerm ? "New application after a previous rejection" : "Submitted for Program Head review"
              }
            }
          }
        });
      } else if (submit && admissionForTerm) {
        const isResubmission = admissionForTerm.status === "RETURNED_FOR_CORRECTION";
        const attemptNumber = isResubmission ? admissionForTerm.attemptNumber + 1 : admissionForTerm.attemptNumber;
        await transaction.admissionApplication.update({
          where: { id: admissionForTerm.id },
          data: {
            status: "PENDING",
            intendedProgramId: program.id,
            attemptNumber,
            metadata: { formData },
            submittedAt: new Date(),
            decidedAt: null,
            decisionByUserId: null,
            decisionNotes: null
          }
        });
        await transaction.admissionApplicationStatusHistory.create({
          data: {
            applicationId: admissionForTerm.id,
            fromStatus: admissionForTerm.status,
            toStatus: "PENDING",
            actionType: isResubmission ? "STUDENT_RESUBMIT" : "STUDENT_SUBMIT",
            changedByUserId: userId,
            changedByRole: "student",
            remarks: isResubmission ? `Resubmission attempt ${attemptNumber}` : null
          }
        });
      }
      return application;
    });
  }
}
