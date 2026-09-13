import assert from "node:assert/strict";
import test from "node:test";
import { DocumentStore } from "../server/document-store.mjs";

test("student document list converts Prisma BigInt file sizes to JSON-safe numbers", async () => {
  const store = new DocumentStore({
    studentDocument: {
      findMany: async () => [{ id: "document-1", fileSize: 2048n }]
    }
  }, {});

  const documents = await store.getStudentDocuments("student-1", "application-1");
  assert.equal(documents[0].fileSize, 2048);
  assert.doesNotThrow(() => JSON.stringify({ data: { documents } }));
});

test("student document upload returns a JSON-safe file size", async () => {
  const created = { id: "document-2", fileSize: 4096n, status: "SUBMITTED" };
  const transaction = {
    studentDocument: {
      findUnique: async () => null,
      create: async () => created
    },
    documentVerificationHistory: { create: async () => ({}) }
  };
  const store = new DocumentStore({
    $transaction: async (operation) => operation(transaction)
  }, { deleteFile: async () => {} });

  const document = await store.uploadDocument({
    studentId: "student-1",
    applicationId: "application-1",
    documentTypeId: "type-1",
    originalFileName: "record.png",
    storedFileName: "stored.png",
    filePath: "students/record.png",
    fileSize: 4096,
    mimeType: "image/png",
    uploadedByUserId: "user-1"
  });

  assert.equal(document.fileSize, 4096);
  assert.doesNotThrow(() => JSON.stringify({ data: { document } }));
});

test("verified student documents cannot be replaced", async () => {
  let deletedFilePath = null;
  const transaction = {
    studentDocument: {
      findUnique: async () => ({
        id: "verified-document",
        filePath: "students/verified.png",
        status: "VERIFIED"
      })
    }
  };
  const store = new DocumentStore({
    $transaction: async (operation) => operation(transaction)
  }, {
    deleteFile: async (filePath) => {
      deletedFilePath = filePath;
    }
  });

  await assert.rejects(
    store.uploadDocument({
      studentId: "student-1",
      applicationId: "application-1",
      documentTypeId: "type-1",
      originalFileName: "replacement.png",
      storedFileName: "replacement-stored.png",
      filePath: "students/replacement.png",
      fileSize: 512,
      mimeType: "image/png",
      uploadedByUserId: "user-1"
    }),
    { message: "DOCUMENT_VERIFIED_LOCKED" }
  );
  assert.equal(deletedFilePath, null);
});

test("Registrar application document summary is JSON-safe", async () => {
  const store = new DocumentStore({}, {});
  store.getRequiredDocumentTypes = async () => [{
    id: "type-1",
    name: "Birth Certificate",
    required: true
  }];
  store.getDocumentsForApplication = async () => [{
    id: "document-3",
    documentTypeId: "type-1",
    originalFileName: "birth-certificate.png",
    filePath: "students/birth-certificate.png",
    fileSize: 8192n,
    mimeType: "image/png",
    uploadedAt: new Date("2026-08-25T00:00:00.000Z"),
    status: "SUBMITTED",
    verifiedAt: null,
    remarks: null
  }];

  const summary = await store.getApplicationDocumentSummary("application-1");
  assert.equal(summary[0].fileSize, 8192);
  assert.doesNotThrow(() => JSON.stringify({ data: { documents: summary } }));
});

test("Registrar document view selects only current StudentDocument fields", async () => {
  let query;
  const store = new DocumentStore({
    studentDocument: {
      findUnique: async (options) => {
        query = options;
        return { id: "document-4", filePath: "students/document.png" };
      }
    }
  }, {});

  await store.getDocumentForView("document-4");
  assert.equal(query.select.fileName, undefined);
  assert.equal(query.select.originalFileName, true);
  assert.equal(query.select.storedFileName, true);
  assert.equal(query.select.filePath, true);
});
