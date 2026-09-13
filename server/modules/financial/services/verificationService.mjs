import { newId } from "../../../security.mjs";

const decimalText = (value) => value == null ? "0.00" : value.toString();

export class VerificationService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async verifyTransaction(transactionId, verifiedByUserId) {
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

    if (transaction.status === 'VERIFIED') {
      return this.getVerifiedTransaction(transactionId);
    }

    const verificationResult = this.performVerification(transaction);

    if (!verificationResult.valid) {
      await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED' }
      });

      await this.prisma.paymentLog.create({
        data: {
          transactionId,
          eventType: 'VERIFICATION_FAILED',
          description: `Verification failed: ${verificationResult.reason}`
        }
      });

      throw new Error(`VERIFICATION_FAILED: ${verificationResult.reason}`);
    }

    const now = new Date();
    const receiptNumber = `RCP-${now.getFullYear()}-${transactionId.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({
        where: { id: transactionId, status: 'SUCCESS' },
        data: {
          status: 'VERIFIED',
          verifiedAt: now,
          verifiedByUserId
        }
      });
      if (claimed.count !== 1) throw new Error('VERIFICATION_CONFLICT');

      await tx.paymentLog.create({
        data: {
          transactionId,
          eventType: 'VERIFICATION_PASSED',
          description: 'Payment verified successfully'
        }
      });

      await tx.studentObligation.update({
        where: { id: transaction.obligationId },
        data: { status: 'PAID' }
      });

      const payment = await tx.payment.create({
        data: {
          id: newId(),
          receiptNumber,
          studentId: transaction.studentId,
          externalReference: transaction.gatewayTransactionReference,
          method: transaction.paymentMethod,
          status: 'POSTED',
          currency: 'PHP',
          amount: transaction.amountPaid,
          receivedAt: transaction.createdAt,
          postedAt: now,
          recordedByUserId: verifiedByUserId,
          metadata: {
            paymentTransactionId: transaction.id,
            gatewayName: transaction.gatewayName
          }
        }
      });

      await tx.financialTransaction.create({
        data: {
          id: newId(),
          studentId: transaction.studentId,
          academicTermId: transaction.obligation.academicTermId,
          referenceNumber: `PAY-${transactionId}`,
          entryType: 'PAYMENT',
          direction: 'CREDIT',
          amount: transaction.amountPaid,
          currency: 'PHP',
          description: `Payment for ${transaction.obligation.paymentType.name} (${transaction.gatewayTransactionReference})`,
          occurredAt: now,
          recordedByUserId: verifiedByUserId,
          paymentId: payment.id,
          metadata: {
            transactionId: transaction.id,
            gatewayReference: transaction.gatewayTransactionReference,
            paymentMethod: transaction.paymentMethod
          }
        }
      });

      await tx.receipt.create({
        data: {
          id: newId(),
          transactionId,
          receiptNumber,
          issuedByUserId: verifiedByUserId,
          issuedDate: now
        }
      });

      await tx.paymentLog.create({
        data: { transactionId, eventType: 'PAYMENT_VERIFIED', description: `Receipt ${receiptNumber} issued` }
      });
    });
    return this.getVerifiedTransaction(transactionId);
  }

  performVerification(transaction) {
    if (transaction.status !== 'SUCCESS') {
      return { valid: false, reason: 'Transaction not in SUCCESS status' };
    }

    if (!transaction.gatewayTransactionReference) {
      return { valid: false, reason: 'Missing gateway transaction reference' };
    }

    if (!transaction.obligation) {
      return { valid: false, reason: 'Associated obligation not found' };
    }

    const amountMatch = Number(transaction.amountPaid) === Number(transaction.obligation.amountDue);
    if (!amountMatch) {
      return { valid: false, reason: 'Payment amount does not match obligation amount' };
    }

    if (transaction.studentId !== transaction.obligation.studentId) {
      return { valid: false, reason: 'Student ID mismatch between transaction and obligation' };
    }

    if (transaction.obligation.status === 'PAID') {
      return { valid: false, reason: 'Obligation already marked as paid' };
    }

    return { valid: true };
  }

  async generateReceipt(transactionId, issuedByUserId) {
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

    const existing = await this.prisma.receipt.findUnique({ where: { transactionId } });
    if (existing) return existing;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${transactionId.replaceAll('-', '').slice(0, 12).toUpperCase()}`;

    const receipt = await this.prisma.receipt.create({
      data: {
        id: newId(),
        transactionId,
        receiptNumber,
        issuedByUserId,
        issuedDate: new Date()
      }
    });

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      issuedDate: receipt.issuedDate,
      transactionId: receipt.transactionId
    };
  }

  async getVerifiedTransaction(transactionId) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        obligation: { include: { paymentType: true } },
        student: true,
        receipt: true,
        verifiedBy: {
          select: { id: true, username: true, displayName: true }
        }
      }
    });

    if (!transaction) return null;

    return {
      id: transaction.id,
      obligationId: transaction.obligationId,
      studentId: transaction.studentId,
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
      } : null
    };
  }

  async getPendingVerifications(options = {}) {
    const { limit = 50, offset = 0 } = options;

    const [transactions, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { status: 'SUCCESS' },
        include: {
          obligation: { include: { paymentType: true } },
          student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset
      }),
      this.prisma.paymentTransaction.count({ where: { status: 'SUCCESS' } })
    ]);

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        studentId: t.studentId,
        student: t.student ? {
          id: t.student.id,
          studentNumber: t.student.studentNumber,
          name: [t.student.firstName, t.student.lastName].filter(Boolean).join(' ')
        } : null,
        gatewayName: t.gatewayName,
        gatewayTransactionReference: t.gatewayTransactionReference,
        paymentMethod: t.paymentMethod,
        amountPaid: decimalText(t.amountPaid),
        status: t.status,
        createdAt: t.createdAt,
        obligation: t.obligation ? {
          id: t.obligation.id,
          paymentType: t.obligation.paymentType?.name || 'Unknown',
          amountDue: decimalText(t.obligation.amountDue),
          status: t.obligation.status
        } : null
      })),
      total,
      limit,
      offset
    };
  }

  async getFailedTransactions(options = {}) {
    const { limit = 50, offset = 0, studentId } = options;
    const where = { status: 'FAILED' };
    if (studentId) where.studentId = studentId;

    const [transactions, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          obligation: { include: { paymentType: true } },
          student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
          logs: { where: { eventType: 'PAYMENT_FAILED' }, orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.paymentTransaction.count({ where })
    ]);

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        studentId: t.studentId,
        student: t.student ? {
          id: t.student.id,
          studentNumber: t.student.studentNumber,
          name: [t.student.firstName, t.student.lastName].filter(Boolean).join(' ')
        } : null,
        gatewayName: t.gatewayName,
        gatewayTransactionReference: t.gatewayTransactionReference,
        paymentMethod: t.paymentMethod,
        amountPaid: decimalText(t.amountPaid),
        status: t.status,
        createdAt: t.createdAt,
        failureReason: t.logs[0]?.description || 'Unknown failure',
        obligation: t.obligation ? {
          id: t.obligation.id,
          paymentType: t.obligation.paymentType?.name || 'Unknown',
          amountDue: decimalText(t.obligation.amountDue),
          status: t.obligation.status
        } : null
      })),
      total,
      limit,
      offset
    };
  }
}
