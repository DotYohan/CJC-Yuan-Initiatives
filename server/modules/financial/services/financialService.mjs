import { newId } from "../../../security.mjs";

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : null;
const decimalText = (value) => value == null ? "0.00" : value.toString();

export class FinancialService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async resolveAcademicScope({ academicTermId, academicYearId }, client = this.prisma) {
    if (!academicTermId) return { academicTermId: null, academicYearId: academicYearId || null };
    const term = await client.academicTerm.findUnique({
      where: { id: academicTermId },
      select: { id: true, academicYearId: true }
    });
    if (!term) throw new Error('TERM_NOT_FOUND');
    if (academicYearId && academicYearId !== term.academicYearId) throw new Error('ACADEMIC_YEAR_MISMATCH');
    return { academicTermId: term.id, academicYearId: term.academicYearId };
  }

  async getPaymentTypes(options = {}) {
    const { category, isActive = true } = options;
    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const types = await this.prisma.paymentType.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    return types.map(type => ({
      id: type.id,
      name: type.name,
      description: type.description,
      category: type.category,
      amount: decimalText(type.amount),
      isActive: type.isActive,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt
    }));
  }

  async getPaymentTypeById(id) {
    const type = await this.prisma.paymentType.findUnique({ where: { id } });
    if (!type) return null;

    return {
      id: type.id,
      name: type.name,
      description: type.description,
      category: type.category,
      amount: decimalText(type.amount),
      isActive: type.isActive,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt
    };
  }

  async createPaymentType(data, createdByUserId) {
    const type = await this.prisma.paymentType.create({
      data: {
        id: newId(),
        name: data.name,
        description: data.description,
        category: data.category,
        amount: data.amount,
        isActive: data.isActive ?? true
      }
    });
    return this.getPaymentTypeById(type.id);
  }

  async updatePaymentType(id, data) {
    const type = await this.prisma.paymentType.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        amount: data.amount,
        isActive: data.isActive
      }
    });
    return this.getPaymentTypeById(type.id);
  }

  async deactivatePaymentType(id) {
    const type = await this.prisma.paymentType.update({
      where: { id },
      data: { isActive: false }
    });
    return this.getPaymentTypeById(type.id);
  }

  async getStudentObligations(studentId, options = {}) {
    const { status, semester, schoolYear, paymentTypeId, academicTermId } = options;
    const where = { studentId };
    if (status) where.status = status;
    if (semester) where.semester = semester;
    if (schoolYear) where.schoolYear = schoolYear;
    if (paymentTypeId) where.paymentTypeId = paymentTypeId;
    if (academicTermId) {
      const scope = await this.resolveAcademicScope({ academicTermId });
      where.academicTermId = scope.academicTermId;
      where.academicYearId = scope.academicYearId;
    }

    const obligations = await this.prisma.studentObligation.findMany({
      where,
      include: {
        paymentType: true,
        academicYear: { select: { id: true, code: true, name: true } },
        academicTerm: { select: { id: true, code: true, name: true, termNumber: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: [{ createdAt: 'desc' }]
    });

    return obligations.map(obligation => ({
      id: obligation.id,
      studentId: obligation.studentId,
      paymentTypeId: obligation.paymentTypeId,
      academicYearId: obligation.academicYearId,
      academicTermId: obligation.academicTermId,
      academicYear: obligation.academicYear,
      academicTerm: obligation.academicTerm,
      paymentType: obligation.paymentType ? {
        id: obligation.paymentType.id,
        name: obligation.paymentType.name,
        description: obligation.paymentType.description,
        category: obligation.paymentType.category,
        amount: decimalText(obligation.paymentType.amount)
      } : null,
      amountDue: decimalText(obligation.amountDue),
      semester: obligation.semester,
      schoolYear: obligation.schoolYear,
      status: obligation.status,
      createdByUserId: obligation.createdByUserId,
      createdAt: obligation.createdAt,
      updatedAt: obligation.updatedAt,
      latestTransaction: obligation.transactions[0] ? {
        id: obligation.transactions[0].id,
        enrollmentPeriodId: obligation.transactions[0].enrollmentPeriodId,
        status: obligation.transactions[0].status,
        amountPaid: decimalText(obligation.transactions[0].amountPaid),
        createdAt: obligation.transactions[0].createdAt
      } : null
    }));
  }

  async getStudentObligationById(id) {
    const obligation = await this.prisma.studentObligation.findUnique({
      where: { id },
      include: {
        paymentType: true,
        academicYear: { select: { id: true, code: true, name: true } },
        academicTerm: { select: { id: true, code: true, name: true, termNumber: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            receipt: true,
            logs: { orderBy: { createdAt: 'asc' } }
          }
        }
      }
    });

    if (!obligation) return null;

    return {
      id: obligation.id,
      studentId: obligation.studentId,
      paymentTypeId: obligation.paymentTypeId,
      academicYearId: obligation.academicYearId,
      academicTermId: obligation.academicTermId,
      academicYear: obligation.academicYear,
      academicTerm: obligation.academicTerm,
      paymentType: obligation.paymentType ? {
        id: obligation.paymentType.id,
        name: obligation.paymentType.name,
        description: obligation.paymentType.description,
        category: obligation.paymentType.category,
        amount: decimalText(obligation.paymentType.amount)
      } : null,
      amountDue: decimalText(obligation.amountDue),
      semester: obligation.semester,
      schoolYear: obligation.schoolYear,
      status: obligation.status,
      createdByUserId: obligation.createdByUserId,
      createdAt: obligation.createdAt,
      updatedAt: obligation.updatedAt,
      transactions: obligation.transactions.map(tx => ({
        id: tx.id,
        enrollmentPeriodId: tx.enrollmentPeriodId,
        gatewayName: tx.gatewayName,
        gatewayTransactionReference: tx.gatewayTransactionReference,
        paymentMethod: tx.paymentMethod,
        amountPaid: decimalText(tx.amountPaid),
        status: tx.status,
        createdAt: tx.createdAt,
        verifiedAt: tx.verifiedAt,
        verifiedByUserId: tx.verifiedByUserId,
        receipt: tx.receipt ? {
          id: tx.receipt.id,
          receiptNumber: tx.receipt.receiptNumber,
          issuedDate: tx.receipt.issuedDate,
          filePath: tx.receipt.filePath
        } : null,
        logs: tx.logs.map(log => ({
          id: String(log.id),
          eventType: log.eventType,
          description: log.description,
          createdAt: log.createdAt
        }))
      }))
    };
  }

  async createStudentObligation(data, createdByUserId) {
    const paymentType = await this.prisma.paymentType.findUnique({ where: { id: data.paymentTypeId } });
    if (!paymentType) throw new Error('PAYMENT_TYPE_NOT_FOUND');
    if (!paymentType.isActive) throw new Error('PAYMENT_TYPE_INACTIVE');
    if (!Number.isFinite(Number(data.amountDue)) || Number(data.amountDue) <= 0) {
      throw new Error('AMOUNT_INVALID');
    }
    const scope = await this.resolveAcademicScope(data);
    const duplicate = await this.prisma.studentObligation.findFirst({
      where: {
        studentId: data.studentId,
        paymentTypeId: data.paymentTypeId,
        academicYearId: scope.academicYearId,
        academicTermId: scope.academicTermId,
        semester: data.semester || null,
        schoolYear: data.schoolYear || null,
        status: { not: 'CANCELLED' }
      },
      select: { id: true }
    });
    if (duplicate) throw new Error('OBLIGATION_DUPLICATE');

    const obligation = await this.prisma.studentObligation.create({
      data: {
        id: newId(),
        studentId: data.studentId,
        paymentTypeId: data.paymentTypeId,
        academicYearId: scope.academicYearId,
        academicTermId: scope.academicTermId,
        amountDue: data.amountDue,
        semester: data.semester,
        schoolYear: data.schoolYear,
        status: data.status || 'UNPAID',
        createdByUserId
      }
    });
    return this.getStudentObligationById(obligation.id);
  }

  async createBulkStudentObligations(obligations, createdByUserId) {
    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const obligation of obligations) {
        const paymentType = await tx.paymentType.findUnique({ where: { id: obligation.paymentTypeId } });
        if (!paymentType) throw new Error('PAYMENT_TYPE_NOT_FOUND');
        if (!paymentType.isActive) throw new Error('PAYMENT_TYPE_INACTIVE');
        if (!Number.isFinite(Number(obligation.amountDue)) || Number(obligation.amountDue) <= 0) {
          throw new Error('AMOUNT_INVALID');
        }
        const scope = await this.resolveAcademicScope(obligation, tx);
        const duplicate = await tx.studentObligation.findFirst({
          where: {
            studentId: obligation.studentId,
            paymentTypeId: obligation.paymentTypeId,
            academicYearId: scope.academicYearId,
            academicTermId: scope.academicTermId,
            semester: obligation.semester || null,
            schoolYear: obligation.schoolYear || null,
            status: { not: 'CANCELLED' }
          },
          select: { id: true }
        });
        if (duplicate) throw new Error('OBLIGATION_DUPLICATE');
        results.push(await tx.studentObligation.create({
          data: {
            id: newId(),
            studentId: obligation.studentId,
            paymentTypeId: obligation.paymentTypeId,
            academicYearId: scope.academicYearId,
            academicTermId: scope.academicTermId,
            amountDue: obligation.amountDue,
            semester: obligation.semester || null,
            schoolYear: obligation.schoolYear || null,
            status: obligation.status || 'UNPAID',
            createdByUserId
          }
        }));
      }
      return results;
    });
  }

  async updateObligationStatus(id, status) {
    const obligation = await this.prisma.studentObligation.update({
      where: { id },
      data: { status }
    });
    return this.getStudentObligationById(obligation.id);
  }

  async getStudentFinancialSummary(studentId, academicTermId = null) {
    const obligationWhere = { studentId };
    const transactionWhere = { studentId };
    const financialWhere = { studentId };

    if (academicTermId) {
      const scope = await this.resolveAcademicScope({ academicTermId });
      obligationWhere.academicTermId = scope.academicTermId;
      obligationWhere.academicYearId = scope.academicYearId;
      transactionWhere.obligation = {
        academicTermId: scope.academicTermId,
        academicYearId: scope.academicYearId
      };
      financialWhere.academicTermId = scope.academicTermId;
    }

    const [obligations, transactions, debitSum, creditSum] = await Promise.all([
      this.prisma.studentObligation.findMany({
        where: obligationWhere,
        include: { paymentType: true }
      }),
      this.prisma.paymentTransaction.findMany({
        where: transactionWhere,
        orderBy: { createdAt: 'desc' },
        include: { receipt: true, obligation: { include: { paymentType: true } } }
      }),
      this.prisma.financialTransaction.aggregate({
        where: financialWhere,
        _sum: { amount: true }
      }),
      this.prisma.financialTransaction.aggregate({
        where: { ...financialWhere, direction: 'CREDIT' },
        _sum: { amount: true }
      })
    ]);

    const totalDue = obligations
      .filter(o => o.status === 'UNPAID' || o.status === 'PARTIAL')
      .reduce((sum, o) => sum + Number(o.amountDue), 0);

    const totalPaid = transactions
      .filter(t => t.status === 'VERIFIED')
      .reduce((sum, t) => sum + Number(t.amountPaid), 0);

    const pendingTransactions = transactions
      .filter(t => t.status === 'CREATED' || t.status === 'PENDING' || t.status === 'PROCESSING')
      .reduce((sum, t) => sum + Number(t.amountPaid), 0);

    return {
      totalDue: decimalText(totalDue),
      totalPaid: decimalText(totalPaid),
      pendingAmount: decimalText(pendingTransactions),
      balance: decimalText(totalDue),
      totalDebits: decimalText(debitSum._sum.amount),
      totalCredits: decimalText(creditSum._sum.amount),
      obligationsCount: obligations.length,
      unpaidObligationsCount: obligations.filter(o => o.status === 'UNPAID').length,
      transactions: transactions.slice(0, 10).map(t => ({
        id: t.id,
        obligationId: t.obligationId,
        paymentType: t.obligation?.paymentType?.name || 'Unknown',
        amountPaid: decimalText(t.amountPaid),
        status: t.status,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        receiptNumber: t.receipt?.receiptNumber || null
      }))
    };
  }
}
