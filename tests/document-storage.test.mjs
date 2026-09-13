import assert from "node:assert/strict";
import test from "node:test";
import { DocumentStorageService } from "../server/document-storage.mjs";

const storage = new DocumentStorageService("data/test-student-documents");

test("document storage accepts genuine PDF, PNG, JPG, and JPEG files", () => {
  const cases = [
    ["record.pdf", "application/pdf", Buffer.from("%PDF-1.7\n")],
    ["photo.png", "image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["photo.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ["photo.jpeg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe1])],
  ];

  for (const [originalName, mimeType, buffer] of cases) {
    assert.equal(storage.validateFile({ originalName, mimeType, buffer }).mimeType, mimeType);
  }
});

test("document storage rejects renamed or unsupported files", () => {
  assert.throws(
    () => storage.validateFile({ originalName: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image") }),
    { message: "FILE_CONTENT_MISMATCH" }
  );
  assert.throws(
    () => storage.validateFile({ originalName: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("text") }),
    { message: "INVALID_FILE_EXTENSION" }
  );
});
