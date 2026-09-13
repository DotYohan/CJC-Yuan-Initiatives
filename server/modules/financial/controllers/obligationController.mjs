import { HttpError } from "../../../app.mjs";

export class ObligationController {
  constructor(financialService) {
    this.financialService = financialService;
  }

  async getPaymentTypes(request, response, context) {
    await context.requirePermission('financial.payment_types.view');
    const category = context.url.searchParams.get('category');
    const isActive = context.url.searchParams.get('isActive');
    const types = await this.financialService.getPaymentTypes({
      category: category || undefined,
      isActive: isActive === 'false' ? false : true
    });
    return { data: { paymentTypes: types } };
  }

  async getPaymentType(request, response, context, paymentTypeId) {
    await context.requirePermission('financial.payment_types.view');
    const type = await this.financialService.getPaymentTypeById(paymentTypeId);
    if (!type) throw new HttpError(404, 'PAYMENT_TYPE_NOT_FOUND', 'Payment type not found');
    return { data: { paymentType: type } };
  }

  async createPaymentType(request, response, context) {
    const session = await context.requireStatePermission('financial.payment_types.manage');
    const body = await context.readJson(request);
    const { name, description, category, amount, isActive } = body;

    if (!name || !category || amount === undefined) {
      throw new HttpError(422, 'MISSING_FIELDS', 'Name, category, and amount are required');
    }

    const type = await this.financialService.createPaymentType({
      name, description, category, amount, isActive
    }, session.user.id);

    return { data: { paymentType: type } };
  }

  async updatePaymentType(request, response, context, paymentTypeId) {
    const session = await context.requireStatePermission('financial.payment_types.manage');
    const body = await context.readJson(request);
    const { name, description, category, amount, isActive } = body;

    const type = await this.financialService.updatePaymentType(paymentTypeId, {
      name, description, category, amount, isActive
    });

    return { data: { paymentType: type } };
  }

  async deactivatePaymentType(request, response, context, paymentTypeId) {
    const session = await context.requireStatePermission('financial.payment_types.manage');
    const type = await this.financialService.deactivatePaymentType(paymentTypeId);
    return { data: { paymentType: type } };
  }

  async getStudentObligations(request, response, context) {
    const session = await context.requirePermission('financial.obligations.view');
    const studentId = await this.resolveStudentId(context, session);
    const status = context.url.searchParams.get('status');
    const semester = context.url.searchParams.get('semester');
    const schoolYear = context.url.searchParams.get('schoolYear');
    const paymentTypeId = context.url.searchParams.get('paymentTypeId');
    const academicTermId = context.url.searchParams.get('academicTermId');

    const obligations = await this.financialService.getStudentObligations(studentId, {
      status: status || undefined,
      semester: semester || undefined,
      schoolYear: schoolYear || undefined,
      paymentTypeId: paymentTypeId || undefined,
      academicTermId: academicTermId || undefined
    });

    return { data: { obligations } };
  }

  async getStudentObligation(request, response, context, obligationId) {
    const session = await context.requirePermission('financial.obligations.view');
    const studentId = await this.resolveStudentId(context, session);

    const obligation = await this.financialService.getStudentObligationById(obligationId);
    if (!obligation) throw new HttpError(404, 'OBLIGATION_NOT_FOUND', 'Obligation not found');
    if (obligation.studentId !== studentId && !this.hasCashierPermission(session)) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied to this obligation');
    }

    return { data: { obligation } };
  }

  async createStudentObligation(request, response, context) {
    const session = await context.requireStatePermission('financial.obligations.manage');
    const body = await context.readJson(request);
    const { studentId, paymentTypeId, amountDue, academicYearId, academicTermId, semester, schoolYear, status } = body;

    if (!studentId || !paymentTypeId || amountDue === undefined) {
      throw new HttpError(422, 'MISSING_FIELDS', 'Student ID, payment type ID, and amount due are required');
    }

    const obligation = await this.financialService.createStudentObligation({
      studentId, paymentTypeId, amountDue, academicYearId, academicTermId, semester, schoolYear, status
    }, session.user.id);

    return { data: { obligation } };
  }

  async createBulkObligations(request, response, context) {
    const session = await context.requireStatePermission('financial.obligations.manage');
    const body = await context.readJson(request);
    const { obligations } = body;

    if (!Array.isArray(obligations) || obligations.length === 0) {
      throw new HttpError(422, 'INVALID_OBLIGATIONS', 'Obligations array is required');
    }

    const results = await this.financialService.createBulkStudentObligations(obligations, session.user.id);
    return { data: { obligations: results } };
  }

  async updateObligationStatus(request, response, context, obligationId) {
    const session = await context.requireStatePermission('financial.obligations.manage');
    const body = await context.readJson(request);
    const { status } = body;

    const validStatuses = ['UNPAID', 'PARTIAL', 'PAID', 'WAIVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new HttpError(422, 'INVALID_STATUS', 'Invalid obligation status');
    }

    const obligation = await this.financialService.updateObligationStatus(obligationId, status);
    return { data: { obligation } };
  }

  async getStudentFinancialSummary(request, response, context) {
    const session = await context.requirePermission('financial.summary.view');
    const studentId = await this.resolveStudentId(context, session);
    const academicTermId = context.url.searchParams.get('academicTermId');

    const summary = await this.financialService.getStudentFinancialSummary(studentId, academicTermId || undefined);
    return { data: { summary } };
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
    return permissions.some(p => p.startsWith('financial.') && (p.includes('cashier') || p.includes('manage')));
  }
}
