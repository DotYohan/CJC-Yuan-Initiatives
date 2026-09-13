import assert from "node:assert/strict";
import test from "node:test";
import { FinancialService } from "../server/modules/financial/services/financialService.mjs";
import { PaymentService } from "../server/modules/financial/services/paymentService.mjs";
import { VerificationService } from "../server/modules/financial/services/verificationService.mjs";

const baseTransaction = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  obligationId: "22222222-2222-4222-8222-222222222222",
  studentId: "33333333-3333-4333-8333-333333333333",
  enrollmentPeriodId: "55555555-5555-4555-8555-555555555555",
  gatewayName: "TEST_GATEWAY",
  gatewayTransactionReference: null,
  paymentMethod: "ONLINE",
  amountPaid: 500,
  status: "PENDING",
  createdAt: new Date("2026-08-26T00:00:00.000Z"),
  verifiedAt: null,
  verifiedByUserId: null,
  student: { id: "33333333-3333-4333-8333-333333333333", studentNumber: "TEST-001", firstName: "Test", lastName: "Student" },
  obligation: {
    id: "22222222-2222-4222-8222-222222222222",
    studentId: "33333333-3333-4333-8333-333333333333",
    academicTermId: "66666666-6666-4666-8666-666666666666",
    paymentTypeId: "44444444-4444-4444-8444-444444444444",
    amountDue: 500,
    status: "UNPAID",
    paymentType: { id: "44444444-4444-4444-8444-444444444444", name: "Entrance Fee", category: "ADMISSION" }
  },
  receipt: null,
  logs: [],
  verifiedBy: null
});

test("payment initiation records the exact open enrollment period", async () => {
  const transaction = baseTransaction();
  let createdData;
  const period = { id: transaction.enrollmentPeriodId, status: "OPEN" };
  const tx = {
    enrollmentPeriod: { findUnique: async () => period },
    paymentTransaction: {
      create: async ({ data }) => {
        createdData = data;
        Object.assign(transaction, data);
        return transaction;
      }
    },
    paymentLog: { create: async () => ({}) }
  };
  const prisma = {
    studentObligation: { findUnique: async () => transaction.obligation },
    enrollmentPeriod: { findUnique: async () => period },
    paymentTransaction: {
      findFirst: async () => null,
      findUnique: async () => transaction
    },
    $transaction: async (operation) => operation(tx)
  };

  const result = await new PaymentService(prisma).initiatePayment(
    transaction.obligationId,
    transaction.studentId,
    "ONLINE",
    transaction.studentId
  );

  assert.equal(createdData.enrollmentPeriodId, period.id);
  assert.equal(result.enrollmentPeriodId, period.id);
});

test("payment processing validates the gateway response and remains JSON safe", async () => {
  const transaction = baseTransaction();
  const logInputs = [];
  let nextLogId = 1n;
  const prisma = {
    paymentTransaction: {
      findUnique: async () => transaction,
      updateMany: async ({ data }) => {
        Object.assign(transaction, data);
        return { count: 1 };
      },
      update: async ({ data }) => {
        Object.assign(transaction, data);
        return transaction;
      }
    },
    paymentLog: {
      create: async ({ data }) => {
        logInputs.push(data);
        const log = { id: nextLogId++, createdAt: new Date(), ...data };
        transaction.logs.push(log);
        return log;
      }
    },
    $transaction: async (operations) => Promise.all(operations)
  };
  const gateway = {
    getGatewayName: () => "TEST_GATEWAY",
    processPayment: async ({ transactionId, amount }) => ({
      success: true,
      status: "SUCCESS",
      transactionId,
      amount,
      gatewayReference: "SIM-TXN-TEST-001"
    })
  };

  const service = new PaymentService(prisma, gateway);
  const result = await service.processPayment(transaction.id);

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.gatewayTransactionReference, "SIM-TXN-TEST-001");
  assert.ok(logInputs.every((entry) => !("metadata" in entry)));
  assert.equal(typeof result.logs[0].id, "string");
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("verification atomically posts the canonical payment, ledger entry, and receipt", async () => {
  const transaction = baseTransaction();
  transaction.status = "SUCCESS";
  transaction.gatewayTransactionReference = "SIM-TXN-TEST-002";
  const records = { payment: null, ledger: null, receipt: null };
  const tx = {
    paymentTransaction: {
      updateMany: async ({ where, data }) => {
        if (transaction.status !== where.status) return { count: 0 };
        Object.assign(transaction, data);
        return { count: 1 };
      }
    },
    paymentLog: { create: async () => ({}) },
    studentObligation: {
      update: async ({ data }) => {
        Object.assign(transaction.obligation, data);
        return transaction.obligation;
      }
    },
    payment: {
      create: async ({ data }) => {
        records.payment = data;
        return data;
      }
    },
    financialTransaction: {
      create: async ({ data }) => {
        records.ledger = data;
        return data;
      }
    },
    receipt: {
      create: async ({ data }) => {
        records.receipt = data;
        transaction.receipt = data;
        return data;
      }
    }
  };
  const prisma = {
    paymentTransaction: { findUnique: async () => transaction },
    receipt: { findUnique: async () => transaction.receipt },
    $transaction: async (operation) => operation(tx)
  };

  const service = new VerificationService(prisma);
  const result = await service.verifyTransaction(transaction.id, null);

  assert.equal(result.status, "VERIFIED");
  assert.equal(transaction.obligation.status, "PAID");
  assert.equal(records.payment.status, "POSTED");
  assert.equal(records.ledger.paymentId, records.payment.id);
  assert.equal(records.receipt.transactionId, transaction.id);
  assert.equal(records.payment.receiptNumber, records.receipt.receiptNumber);
});

test("financial summary reports outstanding balance without subtracting paid obligations twice", async () => {
  const prisma = {
    studentObligation: {
      findMany: async () => [
        { status: "PAID", amountDue: 500, paymentType: { name: "Entrance Fee" } },
        { status: "UNPAID", amountDue: 100, paymentType: { name: "Insurance Fee" } }
      ]
    },
    paymentTransaction: {
      findMany: async () => [{
        id: "transaction-1",
        obligationId: "obligation-1",
        amountPaid: 500,
        status: "VERIFIED",
        paymentMethod: "ONLINE",
        createdAt: new Date(),
        obligation: { paymentType: { name: "Entrance Fee" } },
        receipt: { receiptNumber: "RCP-TEST" }
      }]
    },
    financialTransaction: {
      aggregate: async ({ where }) => ({ _sum: { amount: where.direction === "DEBIT" ? 600 : 500 } })
    }
  };

  const summary = await new FinancialService(prisma).getStudentFinancialSummary("student-1");
  assert.equal(summary.totalDue, "100");
  assert.equal(summary.totalPaid, "500");
  assert.equal(summary.balance, "100");
  assert.equal(summary.transactions[0].paymentType, "Entrance Fee");
});
