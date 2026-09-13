import { HttpError } from "../../../app.mjs";

export class ReceiptController {
  constructor(verificationService) {
    this.verificationService = verificationService;
  }

  async getReceipt(request, response, context, receiptId) {
    const session = await context.requirePermission('financial.receipts.view');
    const receipt = await this.getReceiptById(receiptId);

    if (!receipt) throw new HttpError(404, 'RECEIPT_NOT_FOUND', 'Receipt not found');

    const studentId = await this.resolveStudentId(context, session);
    const transaction = await this.verificationService.paymentService?.getTransactionById?.(receipt.transactionId);

    if (transaction && transaction.studentId !== studentId && !this.hasCashierPermission(session)) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied to this receipt');
    }

    return { data: { receipt } };
  }

  async getReceiptByTransaction(request, response, context, transactionId) {
    const session = await context.requirePermission('financial.receipts.view');
    const studentId = await this.resolveStudentId(context, session);

    const transaction = await this.verificationService.paymentService?.getTransactionById?.(transactionId);
    if (!transaction) throw new HttpError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');

    if (transaction.studentId !== studentId && !this.hasCashierPermission(session)) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied to this transaction');
    }

    if (!transaction.receipt) {
      throw new HttpError(404, 'RECEIPT_NOT_FOUND', 'No receipt generated for this transaction');
    }

    return { data: { receipt: transaction.receipt } };
  }

  async getStudentReceipts(request, response, context) {
    const session = await context.requirePermission('financial.receipts.view');
    const studentId = await this.resolveStudentId(context, session);
    const limit = context.url.searchParams.get('limit') || 50;
    const offset = context.url.searchParams.get('offset') || 0;

    const transactions = await this.verificationService.paymentService?.getTransactionsByStudent?.(studentId, {
      status: 'VERIFIED',
      limit: Number(limit),
      offset: Number(offset)
    });

    const receipts = transactions?.transactions
      .filter(t => t.receipt)
      .map(t => t.receipt) || [];

    return { data: { receipts, total: receipts.length } };
  }

  async downloadReceipt(request, response, context, receiptId) {
    const session = await context.requirePermission('financial.receipts.view');
    const receipt = await this.getReceiptById(receiptId);

    if (!receipt) throw new HttpError(404, 'RECEIPT_NOT_FOUND', 'Receipt not found');
    if (!receipt.filePath) throw new HttpError(404, 'RECEIPT_FILE_NOT_FOUND', 'Receipt file not available');

    const studentId = await this.resolveStudentId(context, session);
    const transaction = await this.verificationService.paymentService?.getTransactionById?.(receipt.transactionId);

    if (transaction && transaction.studentId !== studentId && !this.hasCashierPermission(session)) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied to this receipt');
    }

    return { data: { receipt, downloadUrl: `/api/v1/financial/receipts/${receiptId}/file` } };
  }

  async getReceiptFile(request, response, context, receiptId) {
    const session = await context.requirePermission('financial.receipts.view');
    const receipt = await this.getReceiptById(receiptId);

    if (!receipt) throw new HttpError(404, 'RECEIPT_NOT_FOUND', 'Receipt not found');
    if (!receipt.filePath) throw new HttpError(404, 'RECEIPT_FILE_NOT_FOUND', 'Receipt file not available');

    const studentId = await this.resolveStudentId(context, session);
    const transaction = await this.verificationService.paymentService?.getTransactionById?.(receipt.transactionId);

    if (transaction && transaction.studentId !== studentId && !this.hasCashierPermission(session)) {
      throw new HttpError(403, 'FORBIDDEN', 'Access denied to this receipt');
    }

    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const config = context.config;

      const storageRoot = path.resolve(config.documentRoot);
      const filePath = path.resolve(storageRoot, receipt.filePath);

      if (filePath !== storageRoot && !filePath.startsWith(`${storageRoot}${path.sep}`)) {
        throw new HttpError(403, 'RECEIPT_PATH_INVALID', 'Invalid receipt path');
      }

      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(receipt.filePath).toLowerCase();
      const contentType = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';

      response.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
        'Content-Disposition': `inline; filename="${receipt.receiptNumber}${ext}"`,
        'Cache-Control': 'private, no-store'
      });
      response.end(fileBuffer);
      return { handled: true };
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new HttpError(404, 'RECEIPT_FILE_MISSING', 'Receipt file not found on disk');
      }
      throw err;
    }
  }

  async getReceiptById(receiptId) {
    const receipt = await this.verificationService.prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { transaction: { include: { student: true } } }
    });
    return receipt;
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
