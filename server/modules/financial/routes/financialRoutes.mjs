import { ObligationController } from "./controllers/obligationController.mjs";
import { PaymentController } from "./controllers/paymentController.mjs";
import { ReceiptController } from "./controllers/receiptController.mjs";

export function createFinancialRoutes(
  app,
  { financialService, paymentService, verificationService }
) {
  const obligationController = new ObligationController(financialService);
  const paymentController = new PaymentController(paymentService, verificationService);
  const receiptController = new ReceiptController(verificationService);

  const asyncHandler = (handler) => async (request, response, context) => {
    try {
      const result = await handler(request, response, context);
      if (result?.handled) return;
      if (result?.data !== undefined) {
        context.sendJson(response, 200, result);
      }
    } catch (error) {
      if (error.status && error.code) {
        context.sendJson(response, error.status, { error: { code: error.code, message: error.message, details: error.details } }, error.headers);
      } else {
        context.config.isTest || console.error('Financial route error:', error);
        context.sendJson(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
      }
    }
  };

  // Payment Types (Admin/Finance management)
  app.get('/api/financial/payment-types', asyncHandler((req, res, ctx) => obligationController.getPaymentTypes(req, res, ctx)));
  app.get('/api/financial/payment-types/:paymentTypeId', asyncHandler((req, res, ctx) => obligationController.getPaymentType(req, res, ctx, req.params.paymentTypeId)));
  app.post('/api/financial/payment-types', asyncHandler((req, res, ctx) => obligationController.createPaymentType(req, res, ctx)));
  app.put('/api/financial/payment-types/:paymentTypeId', asyncHandler((req, res, ctx) => obligationController.updatePaymentType(req, res, ctx, req.params.paymentTypeId)));
  app.delete('/api/financial/payment-types/:paymentTypeId', asyncHandler((req, res, ctx) => obligationController.deactivatePaymentType(req, res, ctx, req.params.paymentTypeId)));

  // Student Obligations
  app.get('/api/financial/obligations', asyncHandler((req, res, ctx) => obligationController.getStudentObligations(req, res, ctx)));
  app.get('/api/financial/obligations/:obligationId', asyncHandler((req, res, ctx) => obligationController.getStudentObligation(req, res, ctx, req.params.obligationId)));
  app.post('/api/financial/obligations', asyncHandler((req, res, ctx) => obligationController.createStudentObligation(req, res, ctx)));
  app.post('/api/financial/obligations/bulk', asyncHandler((req, res, ctx) => obligationController.createBulkObligations(req, res, ctx)));
  app.patch('/api/financial/obligations/:obligationId/status', asyncHandler((req, res, ctx) => obligationController.updateObligationStatus(req, res, ctx, req.params.obligationId)));

  // Student Financial Summary
  app.get('/api/financial/summary', asyncHandler((req, res, ctx) => obligationController.getStudentFinancialSummary(req, res, ctx)));

  // Payment Transactions
  app.post('/api/financial/payments/initiate', asyncHandler((req, res, ctx) => paymentController.initiatePayment(req, res, ctx)));
  app.post('/api/financial/payments/:transactionId/process', asyncHandler((req, res, ctx) => paymentController.processPayment(req, res, ctx, req.params.transactionId)));
  app.get('/api/financial/payments/:transactionId', asyncHandler((req, res, ctx) => paymentController.getTransaction(req, res, ctx, req.params.transactionId)));
  app.get('/api/financial/payments', asyncHandler((req, res, ctx) => paymentController.getStudentTransactions(req, res, ctx)));
  app.get('/api/financial/obligations/:obligationId/payments', asyncHandler((req, res, ctx) => paymentController.getObligationTransactions(req, res, ctx, req.params.obligationId)));

  // Cashier/Finance - All transactions
  app.get('/api/financial/admin/payments', asyncHandler((req, res, ctx) => paymentController.getAllTransactions(req, res, ctx)));

  // Payment Verification (Cashier)
  app.get('/api/financial/admin/payments/pending-verification', asyncHandler((req, res, ctx) => paymentController.getPendingVerifications(req, res, ctx)));
  app.post('/api/financial/admin/payments/:transactionId/verify', asyncHandler((req, res, ctx) => paymentController.verifyTransaction(req, res, ctx, req.params.transactionId)));
  app.get('/api/financial/admin/payments/failed', asyncHandler((req, res, ctx) => paymentController.getFailedTransactions(req, res, ctx)));

  // Receipts
  app.get('/api/financial/receipts/:receiptId', asyncHandler((req, res, ctx) => receiptController.getReceipt(req, res, ctx, req.params.receiptId)));
  app.get('/api/financial/payments/:transactionId/receipt', asyncHandler((req, res, ctx) => receiptController.getReceiptByTransaction(req, res, ctx, req.params.transactionId)));
  app.get('/api/financial/receipts', asyncHandler((req, res, ctx) => receiptController.getStudentReceipts(req, res, ctx)));
  app.get('/api/financial/receipts/:receiptId/download', asyncHandler((req, res, ctx) => receiptController.downloadReceipt(req, res, ctx, req.params.receiptId)));
  app.get('/api/financial/receipts/:receiptId/file', asyncHandler((req, res, ctx) => receiptController.getReceiptFile(req, res, ctx, req.params.receiptId)));
}

export function registerFinancialRoutes(app, services) {
  createFinancialRoutes(app, services);
}