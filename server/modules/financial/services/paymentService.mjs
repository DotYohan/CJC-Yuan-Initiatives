import { newId } from "../../../security.mjs";
import { simulatedGateway } from "../gateway/simulatedGateway.mjs";

const decimalText = (value) => value == null ? "0.00" : value.toString();
const STALE_SIMULATED_PAYMENT_MS = 5 * 1000;

export class PaymentService {
  constructor(prisma, gateway = simulatedGateway) {
    this.prisma = prisma;
    this.gateway = gateway;
  }

  async initiatePayment(obligationId, studentId, paymentMethod, userId) {
    const obligation = await this.prisma.studentObligation.findUnique({
      where: { id: obligationId },
      include: { paymentType: true, student: true }
    });

    if (!obligation) {
      throw new Error('OBLIGATION_NOT_FOUND');
    }

    if (obligation.studentId !== studentId) {
      throw new Error('OBLIGATION_STUDENT_MISMATCH');
    }

    if (obligation.status === 'PAID') {
      throw new Error('OBLIGATION_ALREADY_PAID');
    }

    const isEnrollmentFee = obligation.paymentType.name === 'Entrance Fee';
    const enrollmentPeriod = obligation.academicTermId
      ? await this.prisma.enrollmentPeriod.findUnique({
        where: { academicTermId: obligation.academicTermId },
        select: { id: true, status: true }
      })
      : null;
    if (isEnrollmentFee && !enrollmentPeriod) throw new Error('PAYMENT_PERIOD_NOT_FOUND');
    if (isEnrollmentFee && enrollmentPeriod.status !== 'OPEN') throw new Error('PAYMENT_PERIOD_CLOSED');

    const existingPending = await this.prisma.paymentTransaction.findFirst({
      where: {
        obligationId,
        studentId,
        status: { in: ['CREATED', 'PENDING', 'PROCESSING'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPending) {
      if (existingPending.status === 'CREATED' || existingPending.status === 'PENDING') {
        return this.getTransactionById(existingPending.id);
      }

      const staleBefore = new Date(Date.now() - STALE_SIMULATED_PAYMENT_MS);
      const expired = await this.prisma.paymentTransaction.updateMany({
        where: {
          id: existingPending.id,
          status: 'PROCESSING',
          createdAt: { lte: staleBefore }
        },
        data: { status: 'FAILED' }
      });
      if (expired.count !== 1) throw new Error('PENDING_TRANSACTION_EXISTS');
      await this.prisma.paymentLog.create({
        data: {
          transactionId: existingPending.id,
          eventType: 'PAYMENT_FAILED',
          description: 'Abandoned simulated payment expired before a gateway result was recorded'
        }
      });
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const currentPeriod = obligation.academicTermId
        ? await tx.enrollmentPeriod.findUnique({
          where: { academicTermId: obligation.academicTermId },
          select: { id: true, status: true }
        })
        : null;
      if (isEnrollmentFee && !currentPeriod) throw new Error('PAYMENT_PERIOD_NOT_FOUND');
      if (isEnrollmentFee && currentPeriod.status !== 'OPEN') throw new Error('PAYMENT_PERIOD_CLOSED');
      const paymentTxn = await tx.paymentTransaction.create({
        data: {
          id: newId(),
          obligationId,
          studentId,
          enrollmentPeriodId: currentPeriod?.id ?? null,
          gatewayName: this.gateway.getGatewayName(),
          paymentMethod,
          amountPaid: obligation.amountDue,
          status: 'PENDING'
        }
      });

      await tx.paymentLog.create({
        data: {
          transactionId: paymentTxn.id,
          eventType: 'PAYMENT_CREATED',
          description: `Payment initiated for ${obligation.paymentType.name} - ${paymentMethod}`
        }
      });

      return paymentTxn;
    });

    return this.getTransactionById(transaction.id);
  }

  async processPayment(transactionId) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        obligation: { include: { paymentType: true } },
        student: true
      }
    });

    if (!transaction) {
      throw new Error('TRANSACTION_NOT_FOUND');
    }

    if (transaction.status === 'PROCESSING') {
      throw new Error('TRANSACTION_PROCESSING');
    }

    if (transaction.status !== 'CREATED' && transaction.status !== 'PENDING') {
      throw new Error('INVALID_TRANSACTION_STATUS');
    }

    const claimed = await this.prisma.paymentTransaction.updateMany({
      where: { id: transactionId, status: { in: ['CREATED', 'PENDING'] } },
      data: { status: 'PROCESSING' }
    });
    if (claimed.count !== 1) throw new Error('TRANSACTION_PROCESSING');

    await this.prisma.paymentLog.create({
      data: { transactionId, eventType: 'PAYMENT_RECEIVED', description: 'Payment sent to gateway for processing' }
    });

    let gatewayResponse;
    try {
      gatewayResponse = await this.gateway.processPayment({
        transactionId: transaction.id,
        studentId: transaction.studentId,
        amount: Number(transaction.amountPaid),
        paymentMethod: transaction.paymentMethod,
        obligationId: transaction.obligationId
      });
    } catch {
      await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({ where: { id: transactionId }, data: { status: 'FAILED' } }),
        this.prisma.paymentLog.create({
          data: { transactionId, eventType: 'PAYMENT_FAILED', description: 'Payment gateway was unavailable' }
        })
      ]);
      return this.getTransactionById(transactionId);
    }

    const responseMatches = gatewayResponse.transactionId === transaction.id
      && Number(gatewayResponse.amount) === Number(transaction.amountPaid)
      && typeof gatewayResponse.gatewayReference === 'string'
      && gatewayResponse.gatewayReference.length > 0;

    if (gatewayResponse.success && responseMatches) {
      await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: 'SUCCESS', gatewayTransactionReference: gatewayResponse.gatewayReference }
        }),
        this.prisma.paymentLog.create({
          data: { transactionId, eventType: 'GATEWAY_RESPONSE_RECEIVED', description: `Gateway response: ${gatewayResponse.status}` }
        }),
        this.prisma.paymentLog.create({
          data: { transactionId, eventType: 'PAYMENT_RECEIVED', description: `Payment successful via ${this.gateway.getGatewayName()}` }
        })
      ]);
    } else {
      const failureReason = gatewayResponse.success
        ? 'GATEWAY_RESPONSE_MISMATCH'
        : gatewayResponse.failureReason;
      await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({
          where: { id: transactionId },
          data: { status: 'FAILED', gatewayTransactionReference: gatewayResponse.gatewayReference }
        }),
        this.prisma.paymentLog.create({
          data: { transactionId, eventType: 'GATEWAY_RESPONSE_RECEIVED', description: `Gateway response: ${gatewayResponse.status}` }
        }),
        this.prisma.paymentLog.create({
          data: { transactionId, eventType: 'PAYMENT_FAILED', description: `Payment failed: ${failureReason}` }
        })
      ]);
    }

    return this.getTransactionById(transactionId);
  }

  async getTransactionById(id) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        obligation: {
          include: { paymentType: true }
        },
        student: true,
        receipt: true,
        logs: { orderBy: { createdAt: 'asc' } },
        verifiedBy: {
          select: { id: true, username: true, displayName: true }
        }
      }
    });

    if (!transaction) return null;

    return this.formatTransaction(transaction);
  }

  async getTransactionsByStudent(studentId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    const where = { studentId };
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          obligation: { include: { paymentType: true } },
          receipt: true,
          logs: { orderBy: { createdAt: 'asc' } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.paymentTransaction.count({ where })
    ]);

    return {
      transactions: transactions.map(t => this.formatTransaction(t)),
      total,
      limit,
      offset
    };
  }

  async getTransactionsByObligation(obligationId) {
    const transactions = await this.prisma.paymentTransaction.findMany({
      where: { obligationId },
      include: {
        obligation: { include: { paymentType: true } },
        receipt: true,
        logs: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return transactions.map(t => this.formatTransaction(t));
  }

  async getAllTransactions(options = {}) {
    const { status, studentId, startDate, endDate, limit = 100, offset = 0 } = options;
    const where = {};

    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          obligation: { include: { paymentType: true } },
          student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
          receipt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.paymentTransaction.count({ where })
    ]);

    return {
      transactions: transactions.map(t => this.formatTransaction(t)),
      total,
      limit,
      offset
    };
  }

  formatTransaction(transaction) {
    return {
      id: transaction.id,
      obligationId: transaction.obligationId,
      studentId: transaction.studentId,
      enrollmentPeriodId: transaction.enrollmentPeriodId,
      student: transaction.student ? {
        id: transaction.student.id,
        studentNumber: transaction.student.studentNumber,
        name: [transaction.student.firstName, transaction.student.middleName, transaction.student.lastName, transaction.student.suffix].filter(Boolean).join(' ')
      } : null,
      gatewayName: transaction.gatewayName,
      gatewayTransactionReference: transaction.gatewayTransactionReference,
      paymentMethod: transaction.paymentMethod,
      amountPaid: decimalText(transaction.amountPaid),
      status: transaction.status,
      createdAt: transaction.createdAt,
      verifiedAt: transaction.verifiedAt,
      verifiedByUserId: transaction.verifiedByUserId,
      verifiedBy: transaction.verifiedBy ? {
        id: transaction.verifiedBy.id,
        username: transaction.verifiedBy.username,
        displayName: transaction.verifiedBy.displayName
      } : null,
      obligation: transaction.obligation ? {
        id: transaction.obligation.id,
        paymentTypeId: transaction.obligation.paymentTypeId,
        paymentType: transaction.obligation.paymentType ? {
          id: transaction.obligation.paymentType.id,
          name: transaction.obligation.paymentType.name,
          category: transaction.obligation.paymentType.category
        } : null,
        amountDue: decimalText(transaction.obligation.amountDue),
        status: transaction.obligation.status
      } : null,
      receipt: transaction.receipt ? {
        id: transaction.receipt.id,
        receiptNumber: transaction.receipt.receiptNumber,
        issuedDate: transaction.receipt.issuedDate,
        filePath: transaction.receipt.filePath
      } : null,
      logs: transaction.logs?.map(log => ({
        id: String(log.id),
        eventType: log.eventType,
        description: log.description,
        createdAt: log.createdAt
      })) || []
    };
  }
}
