import { newId } from "./security.mjs";
import { buildApplicationReview, applicationOfferingChoices } from "./enrollment-review.mjs";

const dateTime = (value) => value instanceof Date ? value.toISOString() : null;
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : null;
const requiredDocuments = Object.freeze([
  "Birth Certificate", "Form 138", "Good Moral Certificate",
  "Medical Certificate", "2x2 Picture"
]);
const reviewableStatuses = new Set(["PENDING", "UNDER_REVIEW"]);
const decisionStatuses = new Set(["APPROVED", "RETURNED_FOR_CORRECTION", "REJECTED"]);
const periodInclude = {
  academicYear: { select: { code: true, name: true } },
  academicTerm: { select: { id: true, code: true, name: true } }
};

const periodView = (period) => period ? { id: period.id, status: period.status, openedAt: period.openedAt ? period.openedAt.toISOString() : null, closedAt: period.closedAt ? period.closedAt.toISOString() : null, academicYear: period.academicYear ? { code: period.academicYear.code, name: period.academicYear.name } : null, academicTerm: period.academicTerm ? { id: period.academicTerm.id, code: period.academicTerm.code, name: period.academicTerm.name } : null } : null;

const parseDate = (value, errorCode) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(errorCode);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(errorCode);
  return date;
};

const parseOptionalDateTime = (value, errorCode) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error(errorCode);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(errorCode);
  return date;
};

export class RegistrarStore {
  constructor(prisma) {
    this.prisma = prisma;
  }

  transaction(operation) {
    if (typeof this.prisma.$transaction !== "function") return operation(this.prisma);
    return this.prisma.$transaction((transaction) => operation(transaction));
  }

  async dashboard() {
    const [openPeriod, recentPeriod, applications, terms, academicYears] = await Promise.all([
      this.prisma.enrollmentPeriod.findFirst({ where: { status: "OPEN" }, orderBy: { updatedAt: "desc" }, include: periodInclude }),
      this.prisma.enrollmentPeriod.findFirst({ orderBy: { updatedAt: "desc" }, include: periodInclude }),
      this.visibleApplications(),
      this.prisma.academicTerm.findMany({
        where: { status: { not: "ARCHIVED" } },
        orderBy: { startsOn: "desc" },
        select: {
          id: true, code: true, name: true, termNumber: true, startsOn: true, endsOn: true,
          enrollmentStarts: true, enrollmentEnds: true, status: true,
          academicYear: { select: { id: true, code: true, name: true } },
          enrollmentPeriods: { select: { id: true, status: true } }
        }
      }),
      this.prisma.academicYear.findMany({
        where: { status: { not: "ARCHIVED" } },
        orderBy: { startsOn: "desc" },
        select: { id: true, code: true, name: true, startsOn: true, endsOn: true, status: true }
      })
    ]);
    const period = openPeriod ?? recentPeriod;
    const counts = { pending: 0, approved: 0, rejected: 0, returnedForCorrection: 0 };
    applications.forEach((entry) => {
      if (entry.status === "PENDING" || entry.status === "UNDER_REVIEW") counts.pending += 1;
      if (entry.status === "APPROVED") counts.approved += 1;
      if (entry.status === "REJECTED") counts.rejected += 1;
      if (entry.status === "RETURNED_FOR_CORRECTION") counts.returnedForCorrection += 1;
    });
    return {
      period: periodView(period),
      applicationCounts: counts,
      academicYears: academicYears.map((year) => ({
        ...year,
        startsOn: dateOnly(year.startsOn),
        endsOn: dateOnly(year.endsOn)
      })),
      terms: terms.map((term) => ({
        ...term,
        startsOn: dateOnly(term.startsOn),
        endsOn: dateOnly(term.endsOn),
        enrollmentStarts: dateTime(term.enrollmentStarts),
        enrollmentEnds: dateTime(term.enrollmentEnds),
        periodId: term.enrollmentPeriods[0]?.id ?? null,
        periodStatus: term.enrollmentPeriods[0]?.status ?? null,
        enrollmentPeriods: undefined
      }))
    };
  }

  async listAcademicYears() {
    const years = await this.prisma.academicYear.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { startsOn: "desc" },
      select: { id: true, code: true, name: true, startsOn: true, endsOn: true, status: true }
    });
    return years.map((year) => ({
      ...year,
      startsOn: dateOnly(year.startsOn),
      endsOn: dateOnly(year.endsOn)
    }));
  }

  async createAcademicYear(input) {
    const code = typeof input?.code === "string" ? input.code.trim() : "";
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const status = typeof input?.status === "string" ? input.status.toUpperCase() : "PLANNED";
    const startsOn = parseDate(input?.startsOn, "ACADEMIC_YEAR_DATES_INVALID");
    const endsOn = parseDate(input?.endsOn, "ACADEMIC_YEAR_DATES_INVALID");

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(code)) throw new Error("ACADEMIC_YEAR_CODE_INVALID");
    if (!name || name.length > 100) throw new Error("ACADEMIC_YEAR_NAME_INVALID");
    if (startsOn >= endsOn) throw new Error("ACADEMIC_YEAR_DATES_INVALID");
    if (!new Set(["PLANNED", "ACTIVE", "CLOSED", "ARCHIVED"]).has(status)) throw new Error("ACADEMIC_YEAR_STATUS_INVALID");

    try {
      const year = await this.prisma.academicYear.create({
        data: {
          id: newId(),
          code,
          name,
          startsOn,
          endsOn,
          status: status === "ARCHIVED" ? "ARCHIVED" : "PLANNED"
        }
      });
      return {
        ...year,
        startsOn: dateOnly(year.startsOn),
        endsOn: dateOnly(year.endsOn)
      };
    } catch (caught) {
      if (caught?.code === "P2002") throw new Error("ACADEMIC_YEAR_DUPLICATE");
      throw caught;
    }
  }

  async updateAcademicYear(yearId, input) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: yearId },
      select: { id: true, code: true, name: true, startsOn: true, endsOn: true, status: true }
    });
    if (!year) throw new Error("ACADEMIC_YEAR_NOT_FOUND");

    const code = typeof input?.code === "string" ? input.code.trim() || year.code : year.code;
    const name = typeof input?.name === "string" ? input.name.trim() || year.name : year.name;
    const status = typeof input?.status === "string" ? input.status.toUpperCase() : year.status;
    const startsOn = input?.startsOn ? parseDate(input.startsOn, "ACADEMIC_YEAR_DATES_INVALID") : year.startsOn;
    const endsOn = input?.endsOn ? parseDate(input.endsOn, "ACADEMIC_YEAR_DATES_INVALID") : year.endsOn;

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(code)) throw new Error("ACADEMIC_YEAR_CODE_INVALID");
    if (!name || name.length > 100) throw new Error("ACADEMIC_YEAR_NAME_INVALID");
    if (startsOn >= endsOn) throw new Error("ACADEMIC_YEAR_DATES_INVALID");
    if (!new Set(["PLANNED", "ACTIVE", "CLOSED", "ARCHIVED"]).has(status)) throw new Error("ACADEMIC_YEAR_STATUS_INVALID");

    const updated = await this.prisma.academicYear.update({
      where: { id: yearId },
      data: {
        code,
        name,
        startsOn,
        endsOn,
        status: status === "ARCHIVED" ? "ARCHIVED" : status
      }
    });
    return {
      ...updated,
      startsOn: dateOnly(updated.startsOn),
      endsOn: dateOnly(updated.endsOn)
    };
  }

  async createAcademicTerm(input) {
    const yearInput = input?.academicYear;
    let academicYearId = typeof input?.academicYearId === "string" ? input.academicYearId.trim() : "";
    const code = typeof input?.code === "string" ? input.code.trim() : "";
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const termNumber = Number(input?.termNumber);
    const yearCode = typeof yearInput?.code === "string" ? yearInput.code.trim() : "";
    const yearName = typeof yearInput?.name === "string" ? yearInput.name.trim() : "";
    const yearStartsOn = yearInput ? parseDate(yearInput.startsOn, "ACADEMIC_YEAR_DATES_INVALID") : null;
    const yearEndsOn = yearInput ? parseDate(yearInput.endsOn, "ACADEMIC_YEAR_DATES_INVALID") : null;
    const status = typeof input?.status === "string" ? input.status.toUpperCase() : "PLANNED";
    if (!academicYearId && !yearInput) throw new Error("ACADEMIC_YEAR_REQUIRED");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(code)) throw new Error("TERM_CODE_INVALID");
    if (!name || name.length > 100) throw new Error("TERM_NAME_INVALID");
    if (!Number.isInteger(termNumber) || termNumber < 1 || termNumber > 32767) throw new Error("TERM_NUMBER_INVALID");

    const startsOn = parseDate(input.startsOn, "TERM_DATES_INVALID");
    const endsOn = parseDate(input.endsOn, "TERM_DATES_INVALID");
    const enrollmentStarts = parseOptionalDateTime(input.enrollmentStarts, "ENROLLMENT_DATES_INVALID");
    const enrollmentEnds = parseOptionalDateTime(input.enrollmentEnds, "ENROLLMENT_DATES_INVALID");
    if (endsOn < startsOn) throw new Error("TERM_DATES_INVALID");
    if ((enrollmentStarts && !enrollmentEnds) || (!enrollmentStarts && enrollmentEnds) || (enrollmentStarts && enrollmentEnds < enrollmentStarts)) {
      throw new Error("ENROLLMENT_DATES_INVALID");
    }
    if (yearInput && (!yearCode || !yearName || !yearStartsOn || !yearEndsOn || yearStartsOn >= yearEndsOn)) {
      throw new Error("ACADEMIC_YEAR_INVALID");
    }
    if (yearInput && yearStartsOn && yearEndsOn && (startsOn < yearStartsOn || endsOn > yearEndsOn)) {
      throw new Error("TERM_OUTSIDE_ACADEMIC_YEAR");
    }

    const academicYear = academicYearId
      ? await this.prisma.academicYear.findFirst({
          where: { id: academicYearId, status: { not: "ARCHIVED" } },
          select: { id: true, startsOn: true, endsOn: true }
        })
      : null;
    if (academicYearId && !academicYear) throw new Error("ACADEMIC_YEAR_NOT_FOUND");
    if (!academicYearId && yearInput) {
      const createdYear = await this.prisma.academicYear.create({
        data: {
          id: newId(),
          code: yearCode,
          name: yearName,
          startsOn: yearStartsOn,
          endsOn: yearEndsOn,
          status: status === "ARCHIVED" ? "ARCHIVED" : "PLANNED"
        }
      });
      academicYearId = createdYear.id;
    }
    if (academicYear && (startsOn < academicYear.startsOn || endsOn > academicYear.endsOn)) throw new Error("TERM_OUTSIDE_ACADEMIC_YEAR");

    try {
      return await this.transaction(async (transaction) => {
        const targetYearId = academicYearId || (await transaction.academicYear.findFirst({ where: { code: yearCode }, select: { id: true } }))?.id;
        if (!targetYearId) throw new Error("ACADEMIC_YEAR_NOT_FOUND");
        const term = await transaction.academicTerm.create({
          data: {
            id: newId(), academicYearId: targetYearId, code, name, termNumber, startsOn, endsOn,
            enrollmentStarts, enrollmentEnds, status: status === "ARCHIVED" ? "ARCHIVED" : "PLANNED"
          },
          include: { academicYear: { select: { id: true, code: true, name: true } } }
        });
        const period = await transaction.enrollmentPeriod.create({
          data: { id: newId(), academicYearId: targetYearId, academicTermId: term.id, status: "DRAFT" }
        });
        return {
          ...term,
          startsOn: dateOnly(term.startsOn),
          endsOn: dateOnly(term.endsOn),
          enrollmentStarts: dateTime(term.enrollmentStarts),
          enrollmentEnds: dateTime(term.enrollmentEnds),
          periodId: period.id,
          periodStatus: period.status
        };
      });
    } catch (caught) {
      if (caught?.code === "P2002") throw new Error("TERM_DUPLICATE");
      throw caught;
    }
  }

  async requestAcademicYearRemoval(userId, yearId, reason) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: yearId },
      select: { id: true, code: true, name: true, status: true }
    });
    if (!year) throw new Error("ACADEMIC_YEAR_NOT_FOUND");
    const note = typeof reason === "string" ? reason.trim() : "";
    if (!note) throw new Error("REMOVAL_REASON_REQUIRED");
    const fallbackStudent = await this.prisma.student.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    const assignedStudent = (await this.prisma.student.findFirst({ where: { userId }, select: { id: true } }))?.id ?? fallbackStudent?.id;
    if (!assignedStudent) throw new Error("STUDENT_PROFILE_REQUIRED");
    const requestType = await this.prisma.requestType.upsert({
      where: { code: "REQ_ACAD_YEAR_DEL" },
      update: { isActive: true },
      create: {
        id: newId(),
        code: "REQ_ACAD_YEAR_DEL",
        name: "Academic Year Removal Request",
        description: "Petition to archive an academic year and its terms.",
        defaultFeeAmount: 0,
        serviceDays: 5,
        isActive: true
      }
    });
    const request = await this.prisma.studentRequest.create({
      data: {
        id: newId(),
        requestNumber: `YEAR-DEL-${Date.now()}`,
        studentId: assignedStudent,
        requestTypeId: requestType.id,
        requesterUserId: userId,
        status: "SUBMITTED",
        purpose: `Request to archive academic year ${year.code}`,
        metadata: { type: "ACADEMIC_YEAR_REMOVAL_REQUEST", academicYearId: yearId, reason: note }
      },
      include: { requestType: true }
    });
    return {
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
      academicYearId: yearId,
      reason: note,
      submittedAt: request.submittedAt
    };
  }

  async listAcademicYearRemovalRequests() {
    return this.prisma.studentRequest.findMany({
      where: { metadata: { path: ["type"], equals: "ACADEMIC_YEAR_REMOVAL_REQUEST" } },
      orderBy: { submittedAt: "desc" },
      include: { requestType: true, student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } }, requester: { select: { id: true, username: true, displayName: true } } }
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      requestNumber: row.requestNumber,
      status: row.status,
      academicYearId: row.metadata?.academicYearId ?? null,
      reason: row.metadata?.reason ?? null,
      submittedAt: row.submittedAt,
      student: row.student ? {
        id: row.student.id,
        name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
        studentNumber: row.student.studentNumber
      } : null,
      requester: row.requester ? { id: row.requester.id, username: row.requester.username, displayName: row.requester.displayName } : null,
      requestType: row.requestType ? { id: row.requestType.id, code: row.requestType.code, name: row.requestType.name } : null
    }))); 
  }

  async resolveAcademicYearRemovalRequest(requestId, actorUserId, outcome, remarks) {
    const request = await this.prisma.studentRequest.findUnique({
      where: { id: requestId },
      include: { requestType: true }
    });
    if (!request) throw new Error("REQUEST_NOT_FOUND");
    if (request.status === "APPROVED" || request.status === "REJECTED") throw new Error("REQUEST_ALREADY_DECIDED");
    const academicYearId = request.metadata?.academicYearId;
    if (!academicYearId || typeof academicYearId !== "string") throw new Error("ACADEMIC_YEAR_NOT_FOUND");
    if (!new Set(["APPROVED", "REJECTED"]).has(outcome)) throw new Error("INVALID_OUTCOME");
    const note = typeof remarks === "string" ? remarks.trim() : "";
    if (outcome === "APPROVED" && !note) throw new Error("APPROVAL_REMARKS_REQUIRED");
    const result = await this.transaction(async (transaction) => {
      const updatedRequest = await transaction.studentRequest.update({
        where: { id: requestId },
        data: {
          status: outcome,
          processedAt: new Date(),
          processorUserId: actorUserId,
          metadata: { ...request.metadata, decision: outcome, decisionRemarks: note }
        }
      });
      if (outcome === "APPROVED") {
        await transaction.enrollmentPeriod.updateMany({
          where: { academicYearId },
          data: { status: "CLOSED", closedByUserId: actorUserId, closedAt: new Date() }
        });
        await transaction.academicTerm.updateMany({
          where: { academicYearId },
          data: { status: "ARCHIVED" }
        });
        await transaction.academicYear.update({
          where: { id: academicYearId },
          data: { status: "ARCHIVED" }
        });
      }
      return updatedRequest;
    });
    return { id: result.id, status: result.status, academicYearId, outcome, remarks: note };
  }

  async updateAcademicTerm(termId, input) {
    const term = await this.prisma.academicTerm.findUnique({
      where: { id: termId },
      select: { id: true, academicYearId: true, code: true, name: true, termNumber: true, startsOn: true, endsOn: true, enrollmentStarts: true, enrollmentEnds: true, status: true }
    });
    if (!term) throw new Error("TERM_NOT_FOUND");

    const code = typeof input?.code === "string" ? input.code.trim() : term.code;
    const name = typeof input?.name === "string" ? input.name.trim() || term.name : term.name;
    const termNumber = Number.isInteger(Number(input?.termNumber)) ? Number(input.termNumber) : term.termNumber;
    const academicYearId = typeof input?.academicYearId === "string" && input.academicYearId.trim() ? input.academicYearId.trim() : term.academicYearId;
    const status = typeof input?.status === "string" ? input.status.toUpperCase() : term.status;

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(code)) throw new Error("TERM_CODE_INVALID");
    if (!name || name.length > 100) throw new Error("TERM_NAME_INVALID");
    if (!Number.isInteger(termNumber) || termNumber < 1 || termNumber > 32767) throw new Error("TERM_NUMBER_INVALID");

    const startsOn = input?.startsOn ? parseDate(input.startsOn, "TERM_DATES_INVALID") : term.startsOn;
    const endsOn = input?.endsOn ? parseDate(input.endsOn, "TERM_DATES_INVALID") : term.endsOn;
    const enrollmentStarts = input?.enrollmentStarts === undefined ? term.enrollmentStarts : parseOptionalDateTime(input.enrollmentStarts, "ENROLLMENT_DATES_INVALID");
    const enrollmentEnds = input?.enrollmentEnds === undefined ? term.enrollmentEnds : parseOptionalDateTime(input.enrollmentEnds, "ENROLLMENT_DATES_INVALID");
    if (endsOn < startsOn) throw new Error("TERM_DATES_INVALID");
    if ((enrollmentStarts && !enrollmentEnds) || (!enrollmentStarts && enrollmentEnds) || (enrollmentStarts && enrollmentEnds < enrollmentStarts)) {
      throw new Error("ENROLLMENT_DATES_INVALID");
    }

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, status: { not: "ARCHIVED" } },
      select: { id: true, startsOn: true, endsOn: true }
    });
    if (!academicYear) throw new Error("ACADEMIC_YEAR_NOT_FOUND");
    if (startsOn < academicYear.startsOn || endsOn > academicYear.endsOn) throw new Error("TERM_OUTSIDE_ACADEMIC_YEAR");

    const updated = await this.transaction(async (transaction) => {
      const nextTerm = await transaction.academicTerm.update({
        where: { id: termId },
        data: {
          academicYearId,
          code,
          name,
          termNumber,
          startsOn,
          endsOn,
          enrollmentStarts,
          enrollmentEnds,
          status: status === "ARCHIVED" ? "ARCHIVED" : status
        },
        include: { academicYear: { select: { id: true, code: true, name: true } } }
      });
      if (nextTerm.status === "ENROLLMENT_OPEN" || nextTerm.status === "ACTIVE" || nextTerm.status === "CLOSED") {
        await transaction.enrollmentPeriod.upsert({
          where: { academicTermId: nextTerm.id },
          update: { status: nextTerm.status === "CLOSED" ? "CLOSED" : "OPEN" },
          create: { id: newId(), academicYearId: nextTerm.academicYearId, academicTermId: nextTerm.id, status: "DRAFT" }
        });
      }
      return nextTerm;
    });

    return {
      ...updated,
      startsOn: dateOnly(updated.startsOn),
      endsOn: dateOnly(updated.endsOn),
      enrollmentStarts: dateTime(updated.enrollmentStarts),
      enrollmentEnds: dateTime(updated.enrollmentEnds),
      periodStatus: (await this.prisma.enrollmentPeriod.findFirst({ where: { academicTermId: updated.id }, select: { status: true } }))?.status ?? null
    };
  }

  async requestAcademicTermRemoval(userId, termId, reason) {
    const term = await this.prisma.academicTerm.findUnique({
      where: { id: termId },
      select: { id: true, code: true, name: true, status: true }
    });
    if (!term) throw new Error("TERM_NOT_FOUND");
    const note = typeof reason === "string" ? reason.trim() : "";
    if (!note) throw new Error("REMOVAL_REASON_REQUIRED");
    const fallbackStudent = await this.prisma.student.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    const assignedStudent = (await this.prisma.student.findFirst({ where: { userId }, select: { id: true } }))?.id ?? fallbackStudent?.id;
    if (!assignedStudent) throw new Error("STUDENT_PROFILE_REQUIRED");
    const requestType = await this.prisma.requestType.upsert({
      where: { code: "REQ_SUBJ_OFFER" },
      update: { isActive: true },
      create: {
        id: newId(),
        code: "REQ_SUBJ_OFFER",
        name: "Special Subject Offering Request",
        description: "Petition to open an unoffered or off-semester subject offering.",
        defaultFeeAmount: 0,
        serviceDays: 5,
        isActive: true
      }
    });
    const request = await this.prisma.studentRequest.create({
      data: {
        id: newId(),
        requestNumber: `TERM-DEL-${Date.now()}`,
        studentId: assignedStudent,
        requestTypeId: requestType.id,
        requesterUserId: userId,
        status: "SUBMITTED",
        purpose: `Request to archive academic term ${term.code}`,
        metadata: { type: "TERM_REMOVAL_REQUEST", academicTermId: termId, reason: note }
      },
      include: { requestType: true }
    });
    return {
      id: request.id,
      requestNumber: request.requestNumber,
      status: request.status,
      academicTermId: termId,
      reason: note,
      submittedAt: request.submittedAt
    };
  }

  async listAcademicTermRemovalRequests() {
    return this.prisma.studentRequest.findMany({
      where: { metadata: { path: ["type"], equals: "TERM_REMOVAL_REQUEST" } },
      orderBy: { submittedAt: "desc" },
      include: { requestType: true, student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } }, requester: { select: { id: true, username: true, displayName: true } } }
    }).then((rows) => rows.map((row) => ({
      id: row.id,
      requestNumber: row.requestNumber,
      status: row.status,
      academicTermId: row.metadata?.academicTermId ?? null,
      reason: row.metadata?.reason ?? null,
      submittedAt: row.submittedAt,
      student: row.student ? {
        id: row.student.id,
        name: [row.student.firstName, row.student.lastName].filter(Boolean).join(" "),
        studentNumber: row.student.studentNumber
      } : null,
      requester: row.requester ? { id: row.requester.id, username: row.requester.username, displayName: row.requester.displayName } : null,
      requestType: row.requestType ? { id: row.requestType.id, code: row.requestType.code, name: row.requestType.name } : null
    })));
  }

  async resolveAcademicTermRemovalRequest(requestId, actorUserId, outcome, remarks) {
    const request = await this.prisma.studentRequest.findUnique({
      where: { id: requestId },
      include: { requestType: true }
    });
    if (!request) throw new Error("REQUEST_NOT_FOUND");
    if (request.status === "APPROVED" || request.status === "REJECTED") throw new Error("REQUEST_ALREADY_DECIDED");
    const academicTermId = request.metadata?.academicTermId;
    if (!academicTermId || typeof academicTermId !== "string") throw new Error("TERM_NOT_FOUND");
    if (!new Set(["APPROVED", "REJECTED"]).has(outcome)) throw new Error("INVALID_OUTCOME");
    const note = typeof remarks === "string" ? remarks.trim() : "";
    if (outcome === "APPROVED" && !note) throw new Error("APPROVAL_REMARKS_REQUIRED");
    const result = await this.transaction(async (transaction) => {
      const updatedRequest = await transaction.studentRequest.update({
        where: { id: requestId },
        data: {
          status: outcome,
          processedAt: new Date(),
          processorUserId: actorUserId,
          metadata: { ...request.metadata, decision: outcome, decisionRemarks: note }
        }
      });
      if (outcome === "APPROVED") {
        await transaction.enrollmentPeriod.updateMany({
          where: { academicTermId },
          data: { status: "CLOSED", closedByUserId: actorUserId, closedAt: new Date() }
        });
        await transaction.academicTerm.update({
          where: { id: academicTermId },
          data: { status: "ARCHIVED" }
        });
      }
      return updatedRequest;
    });
    return { id: result.id, status: result.status, academicTermId, outcome, remarks: note };
  }

  async openPeriod(userId, academicTermId) {
    const term = await this.prisma.academicTerm.findUnique({ where: { id: academicTermId }, select: { id: true, academicYearId: true, status: true } });
    if (!term) throw new Error("TERM_NOT_FOUND");
    if (term.status === "ARCHIVED") throw new Error("TERM_NOT_AVAILABLE");
    const entranceFee = await this.prisma.paymentType.findFirst({
      where: { name: "Entrance Fee", isActive: true },
      select: { id: true, amount: true }
    });
    if (!entranceFee) throw new Error("ENTRANCE_FEE_NOT_CONFIGURED");
    const now = new Date();
    let period;
    try {
      period = await this.transaction(async (transaction) => {
        const otherOpen = await transaction.enrollmentPeriod.findFirst({
          where: { status: "OPEN", academicTermId: { not: term.id } },
          select: { id: true }
        });
        if (otherOpen) throw new Error("PERIOD_ALREADY_OPEN");
        const opened = await transaction.enrollmentPeriod.upsert({
        where: { academicTermId: term.id },
        update: { status: "OPEN", openedByUserId: userId, openedAt: now, closedByUserId: null, closedAt: null },
        create: { id: newId(), academicYearId: term.academicYearId, academicTermId: term.id, status: "OPEN", openedByUserId: userId, openedAt: now }
      });
      await transaction.academicTerm.update({ where: { id: term.id }, data: { status: "ENROLLMENT_OPEN" } });

      const eligibleStudents = await transaction.student.findMany({
        where: { status: { in: ["APPLICANT", "ACTIVE", "ON_LEAVE"] } },
        select: { id: true }
      });
      const existingObligations = eligibleStudents.length
        ? await transaction.studentObligation.findMany({
          where: {
            studentId: { in: eligibleStudents.map((student) => student.id) },
            paymentTypeId: entranceFee.id,
            academicYearId: term.academicYearId,
            academicTermId: term.id,
            status: { not: "CANCELLED" }
          },
          select: { studentId: true }
        })
        : [];
      const existingStudentIds = new Set(existingObligations.map((obligation) => obligation.studentId));
      const missingObligations = eligibleStudents
        .filter((student) => !existingStudentIds.has(student.id))
        .map((student) => ({
          id: newId(),
          studentId: student.id,
          academicYearId: term.academicYearId,
          academicTermId: term.id,
          paymentTypeId: entranceFee.id,
          amountDue: entranceFee.amount,
          status: "UNPAID",
          createdByUserId: userId
        }));
      if (missingObligations.length) {
        await transaction.studentObligation.createMany({ data: missingObligations, skipDuplicates: true });
      }
        return opened;
      });
    } catch (caught) {
      if (caught?.code === "P2002") throw new Error("PERIOD_ALREADY_OPEN");
      throw caught;
    }
    return this.getPeriod(period.id);
  }

  async closePeriod(userId, periodId) {
    const existing = await this.prisma.enrollmentPeriod.findUnique({ where: { id: periodId }, select: { id: true, academicTermId: true, status: true } });
    if (!existing) throw new Error("PERIOD_NOT_FOUND");
    if (existing.status !== "OPEN") throw new Error("PERIOD_NOT_OPEN");
    const now = new Date();
    const period = await this.transaction(async (transaction) => {
      const closed = await transaction.enrollmentPeriod.update({
        where: { id: existing.id },
        data: { status: "CLOSED", closedByUserId: userId, closedAt: now }
      });
      await transaction.academicTerm.update({ where: { id: existing.academicTermId }, data: { status: "CLOSED" } });
      return closed;
    });
    return this.getPeriod(period.id);
  }

  async getPeriod(id) {
    return periodView(await this.prisma.enrollmentPeriod.findUnique({ where: { id }, include: periodInclude }));
  }

  async visibleApplications(filter) {
    const where = filter ? { status: filter === "PENDING" ? { in: ["PENDING", "UNDER_REVIEW"] } : filter } : {};
    const applications = await this.prisma.admissionApplication.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, applicationNumber: true, firstName: true, middleName: true, lastName: true,
        suffix: true, email: true, status: true, submittedAt: true, convertedStudentId: true, academicTermId: true,
        intendedProgram: { select: { code: true, name: true } },
        academicTerm: { select: { code: true, name: true } },
        attemptNumber: true,
        student: { select: { studentNumber: true } }
      }
    });
    const linked = applications.filter((item) => item.convertedStudentId && reviewableStatuses.has(item.status));
    const enrollments = linked.length ? await this.prisma.enrollmentApplication.findMany({
      where: { OR: linked.map((item) => ({ studentId: item.convertedStudentId, academicTermId: item.academicTermId })) },
      select: { studentId: true, academicTermId: true, status: true }
    }) : [];
    const byStudentTerm = new Map(enrollments.map((item) => [`${item.studentId}:${item.academicTermId}`, item]));
    return applications.filter((item) => {
      if (!reviewableStatuses.has(item.status)) return true;
      const enrollment = byStudentTerm.get(`${item.convertedStudentId}:${item.academicTermId}`);
      return !enrollment || enrollment.status === "UNDER_REVIEW";
    });
  }

  async applications(filter) {
    const applications = await this.visibleApplications(filter);
    return applications.slice(0, 200).map((application) => ({
      id: application.id,
      applicationNumber: application.applicationNumber,
      applicantName: [application.firstName, application.middleName, application.lastName, application.suffix].filter(Boolean).join(" "),
      studentNumber: application.student?.studentNumber ?? null,
      email: application.email,
      status: application.status,
      submittedAt: dateTime(application.submittedAt),
      intendedProgram: application.intendedProgram,
      academicTerm: application.academicTerm,
      attemptNumber: application.attemptNumber,
      tag: application.attemptNumber > 1 ? "RESUBMISSION" : null
    }));
  }

  async applicationReview(id) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { id },
      select: {
        id: true, applicationNumber: true, firstName: true, middleName: true, lastName: true,
        suffix: true, birthDate: true, email: true, phone: true, status: true, submittedAt: true,
        decidedAt: true, decisionNotes: true, attemptNumber: true, metadata: true, academicTermId: true,
        intendedProgram: {
          select: {
            code: true, name: true,
            department: { select: { college: { select: { code: true, name: true } } } }
          }
        },
        academicTerm: {
          select: {
            code: true, name: true, termNumber: true,
            academicYear: { select: { code: true, name: true } }
          }
        },
        student: {
          select: {
            id: true, studentNumber: true, institutionalEmail: true, currentYearLevel: true
          }
        },
        documents: {
          orderBy: { documentType: { sortOrder: "asc" } },
          select: {
            id: true,
            documentType: { select: { id: true, name: true, required: true } },
            originalFileName: true,
            storedFileName: true,
            filePath: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
            status: true,
            verifiedAt: true,
            remarks: true
          }
        },
        history: {
          orderBy: { changedAt: "desc" },
          select: {
            id: true, fromStatus: true, toStatus: true, actionType: true,
            changedByRole: true, remarks: true, changedAt: true,
            changedBy: { select: { displayName: true, username: true } }
          }
        }
      }
    });
    if (!application) return null;
    const enrollmentApplication = application.student?.id
      ? await this.prisma.enrollmentApplication.findFirst({
        where: {
          studentId: application.student.id,
          academicTermId: application.academicTermId
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true, status: true, yearLevel: true, formData: true, submittedAt: true }
      })
      : null;
    if (enrollmentApplication && reviewableStatuses.has(application.status) && enrollmentApplication.status !== "UNDER_REVIEW") return null;
    const enrollmentReview = enrollmentApplication ? await buildApplicationReview(this.prisma, enrollmentApplication.id) : null;
    const offeringChoices = enrollmentReview && enrollmentApplication.status === "UNDER_REVIEW"
      ? await applicationOfferingChoices(this.prisma, enrollmentReview) : [];
    const documentMap = new Map(application.documents.map((document) => [document.documentType.name, document]));

    return {
      enrollmentReview: enrollmentReview ? {
        applicationId: enrollmentApplication.id, status: enrollmentApplication.status,
        curriculum: enrollmentReview.curriculum, items: enrollmentReview.items,
        totalUnits: enrollmentReview.totalUnits, offeringChoices,
        requiresSectionAssignments: enrollmentApplication.status === "UNDER_REVIEW"
      } : null,
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        applicantName: [application.firstName, application.middleName, application.lastName, application.suffix].filter(Boolean).join(" "),
        firstName: application.firstName,
        middleName: application.middleName,
        lastName: application.lastName,
        suffix: application.suffix,
        birthDate: dateOnly(application.birthDate),
        email: application.email,
        phone: application.phone,
        status: application.status,
        submittedAt: dateTime(application.submittedAt),
        decidedAt: dateTime(application.decidedAt),
        decisionNotes: application.decisionNotes,
        attemptNumber: application.attemptNumber,
        tag: application.attemptNumber > 1 ? "RESUBMISSION" : null,
        studentNumber: application.student?.studentNumber ?? null,
        institutionalEmail: application.student?.institutionalEmail ?? null,
        yearLevel: enrollmentApplication?.yearLevel ?? application.student?.currentYearLevel ?? null,
        intendedProgram: application.intendedProgram,
        academicTerm: application.academicTerm,
        formData: enrollmentApplication?.formData ?? application.metadata?.formData ?? {}
      },
      documents: requiredDocuments.map((documentType) => {
        const document = documentMap.get(documentType);
        return document ? {
          id: document.id, documentType, fileName: document.originalFileName,
          submittedAt: dateTime(document.uploadedAt), status: document.status,
          verifiedAt: dateTime(document.verifiedAt), remarks: document.remarks,
          viewUrl: document.filePath ? `/api/v1/registrar/documents/${document.id}/view` : null
        } : {
          id: null, documentType, fileName: null, submittedAt: null,
          status: "PENDING", verifiedAt: null, remarks: "Not submitted", viewUrl: null
        };
      }),
      history: application.history.map((entry) => ({
        ...entry,
        changedAt: dateTime(entry.changedAt),
        performedBy: entry.changedBy?.displayName || entry.changedBy?.username || "System"
      }))
    };
  }

  async recordView(id, userId, userRole) {
    const current = await this.prisma.admissionApplication.findUnique({
      where: { id },
      select: { id: true, status: true }
    });
    if (!current) return false;
    await this.prisma.admissionApplicationStatusHistory.create({
      data: {
        applicationId: id,
        fromStatus: current.status,
        toStatus: current.status,
        actionType: "VIEW_APPLICATION",
        changedByUserId: userId,
        changedByRole: userRole || null
      }
    });
    return true;
  }

  async updateApplication(id, userId, userRole, status, decisionNotes, sectionAssignments) {
    if (!decisionStatuses.has(status)) throw new Error("INVALID_STATUS");
    const remarks = typeof decisionNotes === "string" ? decisionNotes.trim() : "";
    if ((status === "REJECTED" || status === "RETURNED_FOR_CORRECTION") && !remarks) {
      throw new Error("DECISION_NOTES_REQUIRED");
    }

    return this.transaction(async (transaction) => {
      const current = await transaction.admissionApplication.findUnique({
        where: { id },
        select: {
          id: true, status: true, convertedStudentId: true, academicTermId: true,
          academicTerm: {
            select: {
              academicYearId: true,
              enrollmentPeriods: { select: { id: true }, take: 1 }
            }
          }
        }
      });
      if (!current) throw new Error("APPLICATION_NOT_FOUND");
      if (!reviewableStatuses.has(current.status)) throw new Error("APPLICATION_LOCKED");
      const enrollmentApplication = current.convertedStudentId ? await transaction.enrollmentApplication.findUnique({
        where: { studentId_academicTermId: { studentId: current.convertedStudentId, academicTermId: current.academicTermId } }
      }) : null;
      if (status === "APPROVED" && enrollmentApplication && enrollmentApplication.status !== "UNDER_REVIEW") throw new Error("PROGRAM_HEAD_APPROVAL_REQUIRED");

      if (status === "APPROVED" && current.convertedStudentId) {
        const entranceFee = await transaction.paymentType.findFirst({
          where: { name: "Entrance Fee", isActive: true },
          select: { id: true }
        });
        if (!entranceFee) throw new Error("ENTRANCE_FEE_NOT_CONFIGURED");
        const enrollmentPeriodId = current.academicTerm.enrollmentPeriods[0]?.id;
        const paidTermFee = enrollmentPeriodId ? await transaction.studentObligation.findFirst({
          where: {
            studentId: current.convertedStudentId,
            paymentTypeId: entranceFee.id,
            academicYearId: current.academicTerm.academicYearId,
            academicTermId: current.academicTermId,
            status: { in: ["PAID", "WAIVED"] }
          },
          select: {
            status: true,
            transactions: {
              where: { enrollmentPeriodId, status: "VERIFIED" },
              select: { id: true },
              take: 1
            }
          }
        }) : null;
        const feeSatisfied = paidTermFee?.status === "WAIVED"
          || (paidTermFee?.status === "PAID" && paidTermFee.transactions.length > 0);
        if (!feeSatisfied) throw new Error("ENTRANCE_FEE_REQUIRED");
      }

      const now = new Date();
      const changed = await transaction.admissionApplication.updateMany({
        where: { id, status: current.status },
        data: {
          status,
          decisionNotes: remarks || null,
          decidedAt: now,
          decisionByUserId: userId
        }
      });
      if (changed.count !== 1) throw new Error("APPLICATION_CONFLICT");

      let enrollmentId = null;
      if (status === "APPROVED" && enrollmentApplication) {
        const review = await buildApplicationReview(transaction, enrollmentApplication.id);
        const assignments = Array.isArray(sectionAssignments) ? sectionAssignments : [];
        if (!review.curriculum || !review.items.length || review.items.length !== (review.application.formData?.selection?.subjectIds?.length ?? 0)
          || assignments.length !== review.items.length
          || new Set(assignments.map((item) => item?.curriculumSubjectId)).size !== assignments.length
          || new Set(assignments.map((item) => item?.courseOfferingId)).size !== assignments.length
          || assignments.some((item) => !review.items.some((subject) => subject.id === item?.curriculumSubjectId)
            || !/^[0-9a-f-]{36}$/i.test(item?.courseOfferingId ?? ""))) throw new Error("SECTION_ASSIGNMENTS_INVALID");
        // Lock offerings in stable order before reading occupancy. Concurrent
        // approvals for the last available seat cannot both pass the count.
        for (const offeringId of assignments.map((item) => item.courseOfferingId).sort()) {
          await transaction.$queryRawUnsafe('SELECT "id" FROM "course_offerings" WHERE "id" = $1::uuid FOR UPDATE', offeringId);
        }
        const choices = await applicationOfferingChoices(transaction, review);
        for (const item of assignments) {
          const subject = review.items.find((subject) => subject.id === item.curriculumSubjectId);
          const offering = choices.find((offering) => offering.id === item.courseOfferingId && offering.subjectId === subject.subjectId);
          if (!offering) throw new Error("SECTION_ASSIGNMENTS_INVALID");
          if (!offering.available) throw new Error("SECTION_UNAVAILABLE");
        }
        const existing = await transaction.enrollment.findUnique({
          where: { studentId_academicTermId: { studentId: current.convertedStudentId, academicTermId: current.academicTermId } }, select: { id: true }
        });
        if (existing || enrollmentApplication.enrollmentId) throw new Error("ENROLLMENT_ALREADY_EXISTS");
        const enrollment = await transaction.enrollment.create({ data: {
          studentId: current.convertedStudentId, academicTermId: current.academicTermId,
          programId: enrollmentApplication.programId, curriculumId: review.curriculum.id, yearLevel: enrollmentApplication.yearLevel,
          status: "ENROLLED", enrolledAt: now, processedByUserId: userId,
          items: { create: assignments.map((item) => ({ courseOfferingId: item.courseOfferingId, status: "ENROLLED" })) },
          statusHistory: { create: { toStatus: "ENROLLED", changedByUserId: userId, reason: "Program Head evaluation and Registrar verification completed." } }
        }, select: { id: true } });
        enrollmentId = enrollment.id;
      }

      if (current.convertedStudentId) {
        await transaction.enrollmentApplication.updateMany({
          where: {
            studentId: current.convertedStudentId,
            academicTermId: current.academicTermId,
            status: { in: ["SUBMITTED", "UNDER_REVIEW"] }
          },
          data: {
            status: status === "RETURNED_FOR_CORRECTION" ? "RETURNED_FOR_CORRECTION" : status,
            reviewedAt: now,
            reviewedByUserId: userId,
            reviewRemarks: remarks || null
            ,...(enrollmentId ? { enrollmentId } : {})
          }
        });
        if (status === "APPROVED") {
          await transaction.student.update({
            where: { id: current.convertedStudentId },
            data: { status: "ACTIVE" }
          });

          const entranceFee = await transaction.paymentType.findFirst({
            where: { name: "Entrance Fee", isActive: true },
            select: { id: true, amount: true }
          });
          if (entranceFee) {
            const existingObligation = await transaction.studentObligation.findFirst({
              where: {
                studentId: current.convertedStudentId,
                paymentTypeId: entranceFee.id,
                academicYearId: current.academicTerm.academicYearId,
                academicTermId: current.academicTermId,
                status: { not: "CANCELLED" }
              },
              select: { id: true }
            });
            if (!existingObligation) {
              await transaction.studentObligation.create({
                data: {
                  id: newId(),
                  studentId: current.convertedStudentId,
                  paymentTypeId: entranceFee.id,
                  academicYearId: current.academicTerm.academicYearId,
                  academicTermId: current.academicTermId,
                  amountDue: entranceFee.amount,
                  status: "UNPAID",
                  createdByUserId: userId
                }
              });
            }
          }
        }
      }

      const actionType = status === "APPROVED"
        ? "APPROVE"
        : status === "REJECTED"
          ? "REJECT"
          : "RETURN_FOR_CORRECTION";
      await transaction.admissionApplicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus: current.status,
          toStatus: status,
          actionType,
          remarks: remarks || null,
          changedByUserId: userId,
          changedByRole: userRole || null
        }
      });

      return transaction.admissionApplication.findUnique({
        where: { id },
        select: {
          id: true, applicationNumber: true, status: true,
          attemptNumber: true, decidedAt: true, decisionNotes: true
        }
      });
    });
  }

  async documentForView(id) {
    return this.prisma.studentDocument.findUnique({
      where: { id },
      select: {
        id: true,
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        mimeType: true,
        documentType: { select: { name: true } },
        admissionApplicationId: true
      }
    });
  }

  async updateDocument(id, userId, userRole, status, remarks) {
    if (!new Set(["VERIFIED", "REJECTED"]).has(status)) throw new Error("DOCUMENT_STATUS_INVALID");
    return this.transaction(async (transaction) => {
      const document = await transaction.studentDocument.findUnique({
        where: { id },
        select: {
          id: true, documentType: true, admissionApplicationId: true,
          admissionApplication: { select: { status: true } }
        }
      });
      if (!document) throw new Error("DOCUMENT_NOT_FOUND");
      if (!document.admissionApplicationId || !reviewableStatuses.has(document.admissionApplication?.status)) {
        throw new Error("APPLICATION_LOCKED");
      }

      const updated = await transaction.studentDocument.update({
        where: { id },
        data: {
          status,
          remarks: typeof remarks === "string" && remarks.trim() ? remarks.trim() : null,
          verifiedByUserId: userId,
          verifiedAt: new Date()
        },
        select: { id: true, status: true, remarks: true, verifiedAt: true }
      });
      await transaction.admissionApplicationStatusHistory.create({
        data: {
          applicationId: document.admissionApplicationId,
          fromStatus: document.admissionApplication.status,
          toStatus: document.admissionApplication.status,
          actionType: "VERIFY_DOCUMENT",
          remarks: `${document.documentType}: ${status}${updated.remarks ? ` - ${updated.remarks}` : ""}`,
          changedByUserId: userId,
          changedByRole: userRole || null
        }
      });
      return updated;
    });
  }
}
