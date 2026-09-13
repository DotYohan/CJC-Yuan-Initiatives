import { HttpError } from "../../../app.mjs";

export class PaymentController {
  constructor(paymentService, verificationService) {
    this.paymentService = paymentService;
    this.verificationService = verificationService;
  }

  async initiatePayment(request, response, context) {
    const session = await context.requireStatePermission('financial.payments.initiate');
    const body = await context.readJson(request);
    const { obligationId, paymentMethod } = body;

    if (!obligationId || !paymentMethod) {
      throw new HttpError(422, 'MISSING_FIELDS', 'Obligation ID and payment method are required');
    }

    const validMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'CHECK', 'OTHER'];
    if (!validMethods.includes(paymentMethod)) {
      throw new HttpError(422, 'INVALID_PAYMENT_METHOD', 'Invalid payment method');
    }

    const studentId = await this.resolveStudentId(context, session);
    const transaction = await this.paymentService.initiatePayment(obligationId, studentId, paymentMethod, session.user.id);

    return { data: { transaction } };
  }

  async processPayment(request, response, context, transactionId) {
    const session = await context.requireStatePermission('financial.payments.process');
    const existing = await this.paymentService.getTransactionById(transactionId);
    if (!existing) throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    if (!this.hasCashierPermission(session)) {
      const studentId = await this.resolveStudentId(context, session);
      if (existing.studentId !== studentId) {
        throw new HttpError(403, 'FORBIDDEN', 'Access denied to this transaction');
      }
    }

    const processed = await this.paymentService.processPayment(transactionId);
    const transaction = processed.status === 'SUCCESS'
      ? await this.verificationService.verifyTransaction(transactionId, null)
      : processed;
    return { data: { transaction } };
  }

  async getTransaction(request, response, context, transactionId) {
    const session = await context.requirePermission('financial.payments.view');
    const studentId = await this.resolveStudentId(context, session);

    const transaction = await this.paymentService.getTransactionById(transactionId);
    if (!transaction) throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');

    if (transaction.studentId !== studentId && !this.hasCashierPermission(session)) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied to this transaction');
    }

    return { data: { transaction } };
  }

  async getStudentTransactions(request, response, context) {
    const session = await context.requirePermission('financial.payments.view');
    const studentId = await this.resolveStudentId(context, session);
    const status = context.url.searchParams.get('status');
    const limit = context.url.searchParams.get('limit') || 50;
    const offset = context.url.searchParams.get('offset') || 0;

    const result = await this.paymentService.getTransactionsByStudent(studentId, {
      status: status || undefined,
      limit: Number(limit),
      offset: Number(offset)
    });

    return { data: result };
  }

  async getObligationTransactions(request, response, context, obligationId) {
    const session = await context.requirePermission('financial.payments.view');
    const studentId = await this.resolveStudentId(context, session);

    const transactions = await this.paymentService.getTransactionsByObligation(obligationId);
    const hasAccess = transactions.every(t => t.studentId === studentId) || this.hasCashierPermission(session);

    if (!hasAccess) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied to these transactions');
    }

    return { data: { transactions } };
  }

  async getAllTransactions(request, response, context) {
    const session = await context.requirePermission('financial.payments.view_all');
    const status = context.url.searchParams.get('status');
    const studentId = context.url.searchParams.get('studentId');
    const startDate = context.url.searchParams.get('startDate');
    const endDate = context.url.searchParams.get('endDate');
    const limit = context.url.searchParams.get('limit') || 100;
    const offset = context.url.searchParams.get('offset') || 0;

    const result = await this.paymentService.getAllTransactions({
      status: status || undefined,
      studentId: studentId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: Number(limit),
      offset: Number(offset)
    });

    return { data: result };
  }

  async getPendingVerifications(request, response, context) {
    const session = await context.requirePermission('financial.payments.verify');
    const limit = context.url.searchParams.get('limit') || 50;
    const offset = context.url.searchParams.get('offset') || 0;

    const result = await this.verificationService.getPendingVerifications({
      limit: Number(limit),
      offset: Number(offset)
    });

    return { data: result };
  }

  async verifyTransaction(request, response, context, transactionId) {
    const session = await context.requireStatePermission('financial.payments.verify');
    const verifiedTransaction = await this.verificationService.verifyTransaction(transactionId, session.user.id);
    return { data: { transaction: verifiedTransaction } };
  }

  async getFailedTransactions(request, response, context) {
    const session = await context.requirePermission('financial.payments.view_failed');
    const limit = context.url.searchParams.get('limit') || 50;
    const offset = context.url.searchParams.get('offset') || 0;
    const studentId = context.url.searchParams.get('studentId');

    const result = await this.verificationService.getFailedTransactions({
      limit: Number(limit),
      offset: Number(offset),
      studentId: studentId || undefined
    });

    return { data: result };
  }

  async resolveStudentId(context, session) {
    const urlParams = context.url.searchParams;
    const requestedStudentId = urlParams.get('studentId');

    if (requestedStudentId && this.hasCashierPermission(session)) {
      return requestedStudentId;
    }

    const student = await context.prisma.student.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!student) {
      throw new HttpError(404, 'STUDENT_NOT_FOUND', 'No student profile linked to this account');
    }

    return student.id;
  }

  hasCashierPermission(session) {
    const permissions = session.user?.permissions || [];
    return permissions.some(p => p.startsWith('financial.') && (p.includes('cashier') || p.includes('manage') || p.includes('verify')));
  }
}
