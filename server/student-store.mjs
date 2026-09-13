const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : null;
const timeOnly = (value) => value instanceof Date ? value.toISOString().slice(11, 16) : null;
const decimalText = (value) => value == null ? "0.00" : value.toString();

const fullName = (record) => [
  record.firstName,
  record.middleName,
  record.lastName,
  record.suffix
].filter(Boolean).join(" ");

const weekdayOrder = new Map([
  ["MONDAY", 1],
  ["TUESDAY", 2],
  ["WEDNESDAY", 3],
  ["THURSDAY", 4],
  ["FRIDAY", 5],
  ["SATURDAY", 6],
  ["SUNDAY", 7]
]);

function financialBalance(debit, credit) {
  if (debit && typeof debit.minus === "function") return debit.minus(credit ?? 0).toString();
  if (credit && typeof credit.negated === "function") return credit.negated().toString();
  return "0.00";
}

function emptyDashboard() {
  return {
    linked: false,
    student: null,
    currentEnrollment: null,
    schedule: [],
    finalGrades: [],
    clearance: null,
    requests: [],
    finance: { balance: "0.00", totalDebits: "0.00", totalCredits: "0.00", payments: [] }
  };
}

export class StudentDashboardStore {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async forUser(userId) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: {
        id: true,
        studentNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        dateOfBirth: true,
        institutionalEmail: true,
        admissionYear: true,
        currentYearLevel: true,
        status: true,
        program: {
          select: {
            code: true,
            name: true,
            department: { select: { code: true, name: true, college: { select: { code: true, name: true } } } }
          }
        },
        curriculum: { select: { code: true, name: true, version: true, status: true } }
      }
    });

    if (!student) return emptyDashboard();

    const [enrollment, clearance, requests, openPeriod] = await Promise.all([
      this.prisma.enrollment.findFirst({
        where: { studentId: student.id },
        orderBy: [{ academicTerm: { startsOn: "desc" } }, { createdAt: "desc" }],
        select: {
          id: true,
          yearLevel: true,
          status: true,
          enrolledAt: true,
          academicTerm: {
            select: {
              id: true, academicYearId: true, code: true, name: true, termNumber: true,
              startsOn: true, endsOn: true, status: true,
              academicYear: { select: { id: true, code: true, name: true } }
            }
          },
          items: {
            where: { status: { in: ["PENDING", "ENROLLED", "COMPLETED"] } },
            orderBy: { registeredAt: "asc" },
            select: {
              id: true,
              status: true,
              courseOffering: {
                select: {
                  offeringCode: true,
                  creditUnits: true,
                  status: true,
                  subject: { select: { code: true, title: true } },
                  classSection: { select: { code: true, name: true } },
                  schedules: {
                    select: {
                      weekday: true,
                      startsAt: true,
                      endsAt: true,
                      effectiveFrom: true,
                      effectiveTo: true,
                      room: { select: { code: true, name: true, building: true } }
                    }
                  },
                  faculty: {
                    select: {
                      role: true,
                      faculty: { select: { firstName: true, middleName: true, lastName: true, suffix: true } }
                    }
                  }
                }
              },
              grades: {
                where: { status: "POSTED", gradingPeriod: { isFinal: true } },
                select: {
                  numericGrade: true,
                  letterGrade: true,
                  isPassing: true,
                  remarks: true,
                  approvedAt: true,
                  gradingPeriod: { select: { name: true, type: true } }
                }
              }
            }
          }
        }
      }),
      this.prisma.studentClearance.findFirst({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          startedAt: true,
          completedAt: true,
          cycle: { select: { code: true, name: true, status: true } },
          items: {
            orderBy: { requirement: { sortOrder: "asc" } },
            select: {
              status: true,
              remarks: true,
              actedAt: true,
              requirement: { select: { code: true, title: true, officeType: true, isRequired: true } }
            }
          }
        }
      }),
      this.prisma.studentRequest.findMany({
        where: { studentId: student.id },
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: {
          id: true,
          requestNumber: true,
          status: true,
          submittedAt: true,
          completedAt: true,
          requestType: { select: { code: true, name: true } }
        }
      }),
      this.prisma.enrollmentPeriod.findFirst({
        where: { status: "OPEN" },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          academicTerm: {
            select: {
              id: true, academicYearId: true, code: true, name: true, termNumber: true,
              academicYear: { select: { id: true, code: true, name: true } }
            }
          }
        }
      })
    ]);

    const billingTerm = openPeriod?.academicTerm ?? enrollment?.academicTerm ?? null;
    const enrollmentPeriodId = openPeriod?.id ?? null;
    const academicTermId = billingTerm?.id ?? null;
    const academicYearId = billingTerm?.academicYearId ?? null;
    const [debitResult, creditResult, payments] = await Promise.all([
      academicTermId
        ? this.prisma.financialTransaction.aggregate({
            where: { studentId: student.id, direction: "DEBIT", academicTermId },
            _sum: { amount: true }
          })
        : this.prisma.financialTransaction.aggregate({
            where: { studentId: student.id, direction: "DEBIT" },
            _sum: { amount: true }
          }),
      academicTermId
        ? this.prisma.financialTransaction.aggregate({
            where: { studentId: student.id, direction: "CREDIT", academicTermId },
            _sum: { amount: true }
          })
          : this.prisma.financialTransaction.aggregate({
            where: { studentId: student.id, direction: "CREDIT" },
            _sum: { amount: true }
          }),
      academicTermId
        ? this.prisma.paymentTransaction.findMany({
          where: {
            studentId: student.id,
            status: "VERIFIED",
            ...(enrollmentPeriodId ? { enrollmentPeriodId } : {}),
            obligation: { academicTermId, academicYearId }
          },
          orderBy: { verifiedAt: "desc" },
          take: 5,
          select: {
            amountPaid: true, paymentMethod: true, status: true, createdAt: true,
            receipt: { select: { receiptNumber: true } }
          }
        })
        : []
    ]);

    const enrollmentItems = enrollment?.items ?? [];
    const schedule = enrollmentItems.flatMap((item) =>
      item.courseOffering.schedules.map((meeting) => ({
        subjectCode: item.courseOffering.subject.code,
        subjectTitle: item.courseOffering.subject.title,
        section: item.courseOffering.classSection?.code ?? null,
        weekday: meeting.weekday,
        startsAt: timeOnly(meeting.startsAt),
        endsAt: timeOnly(meeting.endsAt),
        effectiveFrom: dateOnly(meeting.effectiveFrom),
        effectiveTo: dateOnly(meeting.effectiveTo),
        room: meeting.room ? {
          code: meeting.room.code,
          name: meeting.room.name,
          building: meeting.room.building
        } : null,
        instructors: item.courseOffering.faculty.map((assignment) => ({
          name: fullName(assignment.faculty),
          role: assignment.role
        }))
      }))
    ).sort((left, right) =>
      (weekdayOrder.get(left.weekday) ?? 99) - (weekdayOrder.get(right.weekday) ?? 99)
      || String(left.startsAt).localeCompare(String(right.startsAt))
    );

    const finalGrades = enrollmentItems.flatMap((item) =>
      item.grades.map((grade) => ({
        subjectCode: item.courseOffering.subject.code,
        subjectTitle: item.courseOffering.subject.title,
        numericGrade: grade.numericGrade?.toString() ?? null,
        letterGrade: grade.letterGrade,
        isPassing: grade.isPassing,
        remarks: grade.remarks,
        period: grade.gradingPeriod.name,
        type: grade.gradingPeriod.type,
        approvedAt: grade.approvedAt
      }))
    );

    const clearanceCounts = (clearance?.items ?? []).reduce((counts, item) => {
      counts.total += 1;
      if (item.status === "APPROVED" || item.status === "WAIVED") counts.cleared += 1;
      else if (item.status === "BLOCKED") counts.blocked += 1;
      else counts.pending += 1;
      return counts;
    }, { total: 0, cleared: 0, pending: 0, blocked: 0 });

    const totalDebits = debitResult._sum.amount;
    const totalCredits = creditResult._sum.amount;

    return {
      linked: true,
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: fullName(student),
        dateOfBirth: dateOnly(student.dateOfBirth),
        institutionalEmail: student.institutionalEmail,
        admissionYear: student.admissionYear,
        currentYearLevel: student.currentYearLevel,
        status: student.status,
        program: student.program,
        curriculum: student.curriculum
      },
      currentEnrollment: enrollment ? {
        id: enrollment.id,
        status: enrollment.status,
        yearLevel: enrollment.yearLevel,
        enrolledAt: enrollment.enrolledAt,
        academicTerm: {
          ...enrollment.academicTerm,
          startsOn: dateOnly(enrollment.academicTerm.startsOn),
          endsOn: dateOnly(enrollment.academicTerm.endsOn)
        },
        subjectCount: enrollmentItems.length,
        registeredUnits: enrollmentItems.reduce(
          (total, item) => total + Number(item.courseOffering.creditUnits),
          0
        ),
        items: enrollmentItems.map((item) => ({
          id: item.id,
          status: item.status,
          subjectCode: item.courseOffering.subject.code,
          subjectTitle: item.courseOffering.subject.title,
          creditUnits: item.courseOffering.creditUnits.toString(),
          section: item.courseOffering.classSection?.code ?? null
        }))
      } : null,
      schedule,
      finalGrades,
      clearance: clearance ? {
        cycle: clearance.cycle,
        status: clearance.status,
        startedAt: clearance.startedAt,
        completedAt: clearance.completedAt,
        counts: clearanceCounts,
        items: clearance.items.map((item) => ({
          code: item.requirement.code,
          office: item.requirement.title,
          officeType: item.requirement.officeType,
          required: item.requirement.isRequired,
          status: item.status,
          remarks: item.remarks,
          processedAt: item.actedAt
        }))
      } : null,
      requests: requests.map((request) => ({
        ...request,
        submittedAt: request.submittedAt,
        completedAt: request.completedAt
      })),
      finance: {
        academicTerm: billingTerm,
        balance: financialBalance(totalDebits, totalCredits),
        totalDebits: decimalText(totalDebits),
        totalCredits: decimalText(totalCredits),
        payments: payments.map((payment) => ({
          receiptNumber: payment.receipt?.receiptNumber ?? null,
          amount: payment.amountPaid.toString(),
          currency: "PHP",
          method: payment.paymentMethod,
          status: payment.status,
          receivedAt: payment.createdAt
        }))
      }
    };
  }

  async getProfile(userId) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        program: {
          include: {
            department: {
              include: { college: true }
            }
          }
        },
        curriculum: true
      }
    });

    if (!student) return null;

    return {
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      suffix: student.suffix,
      fullName: fullName(student),
      dateOfBirth: dateOnly(student.dateOfBirth),
      institutionalEmail: student.institutionalEmail,
      admissionYear: student.admissionYear,
      currentYearLevel: student.currentYearLevel,
      status: student.status,
      program: student.program ? {
        id: student.program.id,
        code: student.program.code,
        name: student.program.name,
        credential: student.program.credential,
        department: student.program.department ? {
          code: student.program.department.code,
          name: student.program.department.name,
          college: student.program.department.college ? {
            code: student.program.department.college.code,
            name: student.program.department.college.name
          } : null
        } : null
      } : null,
      curriculum: student.curriculum ? {
        code: student.curriculum.code,
        name: student.curriculum.name,
        version: student.curriculum.version,
        status: student.curriculum.status
      } : null
    };
  }

  async updateProfile(userId, data) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) return null;

    const updateData = {};
    if (data.institutionalEmail !== undefined) updateData.institutionalEmail = data.institutionalEmail;
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }

    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: updateData,
      include: {
        program: {
          include: {
            department: {
              include: { college: true }
            }
          }
        },
        curriculum: true
      }
    });

    return {
      id: updated.id,
      studentNumber: updated.studentNumber,
      firstName: updated.firstName,
      middleName: updated.middleName,
      lastName: updated.lastName,
      suffix: updated.suffix,
      fullName: fullName(updated),
      dateOfBirth: dateOnly(updated.dateOfBirth),
      institutionalEmail: updated.institutionalEmail,
      admissionYear: updated.admissionYear,
      currentYearLevel: updated.currentYearLevel,
      status: updated.status,
      program: updated.program,
      curriculum: updated.curriculum
    };
  }

  async listRequestTypes() {
    const types = await this.prisma.requestType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
    return types.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      description: type.description,
      defaultFeeAmount: decimalText(type.defaultFeeAmount),
      serviceDays: type.serviceDays
    }));
  }

  async submitRequest(userId, { requestTypeId, requestCode, purpose, copies = 1, metadata = {} }) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new Error("STUDENT_PROFILE_REQUIRED");

    let reqType;
    if (requestTypeId) {
      reqType = await this.prisma.requestType.findUnique({ where: { id: requestTypeId } });
    } else if (requestCode) {
      reqType = await this.prisma.requestType.findUnique({ where: { code: requestCode } });
    }
    if (!reqType || !reqType.isActive) throw new Error("REQUEST_TYPE_INVALID");

    const count = await this.prisma.studentRequest.count();
    const requestNumber = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.studentRequest.create({
        data: {
          requestNumber,
          studentId: student.id,
          requestTypeId: reqType.id,
          requesterUserId: userId,
          status: "SUBMITTED",
          purpose: purpose ? String(purpose).trim().slice(0, 500) : null,
          copies: Math.max(1, Math.min(Number(copies) || 1, 10)),
          metadata
        },
        include: {
          requestType: true
        }
      });

      await tx.studentRequestStatusHistory.create({
        data: {
          studentRequestId: request.id,
          toStatus: "SUBMITTED",
          remarks: "Initial student submission",
          changedByUserId: userId
        }
      });

      return {
        id: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
        purpose: request.purpose,
        copies: request.copies,
        requestType: {
          code: request.requestType.code,
          name: request.requestType.name,
          defaultFeeAmount: decimalText(request.requestType.defaultFeeAmount)
        },
        submittedAt: request.submittedAt
      };
    });
  }

  async listRequests(userId) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) return [];

    const requests = await this.prisma.studentRequest.findMany({
      where: { studentId: student.id },
      orderBy: { submittedAt: "desc" },
      include: {
        requestType: true,
        history: {
          orderBy: { changedAt: "desc" }
        }
      }
    });

    return requests.map((req) => ({
      id: req.id,
      requestNumber: req.requestNumber,
      status: req.status,
      purpose: req.purpose,
      copies: req.copies,
      submittedAt: req.submittedAt,
      completedAt: req.completedAt,
      requestType: {
        code: req.requestType.code,
        name: req.requestType.name,
        defaultFeeAmount: decimalText(req.requestType.defaultFeeAmount)
      },
      history: req.history.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        remarks: h.remarks,
        changedAt: h.changedAt
      }))
    }));
  }
}
