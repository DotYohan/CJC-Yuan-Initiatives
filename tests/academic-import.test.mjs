import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createDatabase } from "../server/db.mjs";
import { AcademicImportService } from "../server/academic-import-service.mjs";
import { buildAcademicRecordIndex } from "../server/academic-eligibility.mjs";
import { EnrollmentApplicationStore } from "../server/enrollment-store.mjs";
import { StudentDashboardStore } from "../server/student-store.mjs";

function createTextPdfBuffer(textLines = []) {
  const streamBody = textLines.map((line) => `BT /F1 12 Tf (${line}) Tj ET`).join("\n");
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length ${streamBody.length} >>
stream
${streamBody}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000210 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;
  return Buffer.from(content, "latin1");
}

function createPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82
  ]);
}

test("AI-Assisted Academic Record Import: Full Lifecycle, Deterministic Parsing & Scoped Matching", { timeout: 30_000 }, async () => {
  const prisma = createDatabase();

  // Find or create test department and college
  let dept = await prisma.department.findFirst({ where: { isActive: true } });
  if (!dept) {
    const col = await prisma.college.create({
      data: { code: "TEST-COL", codeNormalized: "TEST-COL", name: "Test College" }
    });
    dept = await prisma.department.create({
      data: { collegeId: col.id, code: "TEST-DEPT", name: "Test Department" }
    });
  }

  // Target Program (BSECE)
  let program = await prisma.program.findFirst({
    where: { code: "BSECE" }
  });
  if (!program) {
    program = await prisma.program.create({
      data: {
        departmentId: dept.id,
        code: "BSECE",
        codeNormalized: "BSECE",
        name: "Bachelor of Science in Electronics Engineering",
        credential: "BS",
        durationYears: 4
      }
    });
  }

  // Create curriculum and subjects for BSECE
  let curriculum = await prisma.curriculum.findFirst({
    where: { programId: program.id }
  });
  if (!curriculum) {
    curriculum = await prisma.curriculum.create({
      data: {
        programId: program.id,
        code: `CURR-BSECE-${Date.now()}`,
        name: "BSECE 2024 Curriculum",
        status: "ACTIVE",
        effectiveYear: 2024
      }
    });
  }

  // Subject 1: EMATH 111 (Calculus 1, 4 units)
  let sub1 = await prisma.subject.findFirst({
    where: { programId: program.id, OR: [{ code: "EMATH 111" }, { codeNormalized: "emath 111" }] }
  });
  if (!sub1) {
    sub1 = await prisma.subject.create({
      data: {
        programId: program.id,
        departmentId: dept.id,
        code: "EMATH 111",
        codeNormalized: "emath 111",
        title: "Calculus 1",
        defaultCreditUnits: 4.0
      }
    });
  }

  // Subject 2: ECE 101 (Intro to ECE, 3 units)
  let sub2 = await prisma.subject.findFirst({
    where: { programId: program.id, OR: [{ code: "ECE 101" }, { codeNormalized: "ece 101" }] }
  });
  if (!sub2) {
    sub2 = await prisma.subject.create({
      data: {
        programId: program.id,
        departmentId: dept.id,
        code: "ECE 101",
        codeNormalized: "ece 101",
        title: "Introduction to Electronics Engineering",
        defaultCreditUnits: 3.0
      }
    });
  }

  await prisma.curriculumSubject.upsert({
    where: {
      curriculumId_subjectId: {
        curriculumId: curriculum.id,
        subjectId: sub1.id
      }
    },
    update: {},
    create: {
      curriculumId: curriculum.id,
      subjectId: sub1.id,
      creditUnits: 4.0,
      yearLevel: 1,
      termNumber: 1
    }
  });

  await prisma.curriculumSubject.upsert({
    where: {
      curriculumId_subjectId: {
        curriculumId: curriculum.id,
        subjectId: sub2.id
      }
    },
    update: {},
    create: {
      curriculumId: curriculum.id,
      subjectId: sub2.id,
      creditUnits: 3.0,
      yearLevel: 1,
      termNumber: 2
    }
  });

  // Create test student user
  const testUserId = "00000000-0000-0000-0000-000000000999";
  await prisma.user.upsert({
    where: { id: testUserId },
    update: {},
    create: {
      id: testUserId,
      username: "test_import_student",
      usernameNormalized: "test_import_student",
      displayName: "Test Import Student",
      passwordHash: "dummy",
      status: "ACTIVE"
    }
  });

  let testStudent = await prisma.student.findFirst({
    where: { userId: testUserId }
  });

  if (!testStudent) {
    testStudent = await prisma.student.create({
      data: {
        userId: testUserId,
        studentNumber: `2026-IMP-${Date.now().toString().slice(-4)}`,
        studentNumberNormalized: `2026-imp-${Date.now().toString().slice(-4)}`,
        firstName: "Juan",
        lastName: "Dela Cruz",
        admissionYear: 2026,
        programId: program.id,
        curriculumId: curriculum.id
      }
    });
  }

  // Mock storage
  const inMemoryFiles = new Map();
  const mockStorage = {
    generateStoredFileName: (orig, ext) => `stored_${Date.now()}${ext}`,
    saveFile: async (relPath, buf) => { inMemoryFiles.set(relPath, buf); return relPath; },
    readFile: async (relPath) => inMemoryFiles.get(relPath) || Buffer.from(""),
    getMaxFileSize: () => 10 * 1024 * 1024
  };

  const importService = new AcademicImportService(prisma, mockStorage);

  // 1. Create text-layer PDF with 2 distinct semesters
  const pdfBuffer = createTextPdfBuffer([
    "Academic Year: 2023-2024",
    "1st Semester",
    "EMATH 111, Calculus 1, 4.0, 2.5, Passed",
    "UNREL 999, Unrelated Subject, 3.0, 2.0, Passed",
    "Academic Year: 2023-2024",
    "2nd Semester",
    "ECE 101, Introduction to Electronics Engineering, 3.0, 1.75, Passed"
  ]);

  const importRequest = await importService.createRequest({
    studentId: testStudent.id,
    targetProgramId: program.id,
    previousSchool: "Mindanao State University",
    file: {
      originalName: "transcript.pdf",
      buffer: pdfBuffer,
      mimeType: "application/pdf"
    },
    userId: testUserId
  });

  assert.equal(importRequest.status, "SUBMITTED");
  assert.equal(importRequest.previousSchool, "Mindanao State University");

  // 2. Workflow Guard: First AI run disallowed when SUBMITTED
  await assert.rejects(
    () => importService.processAI(importRequest.id),
    /FIRST_RUN_REQUIRES_REGISTRAR_APPROVAL/
  );

  // 3. Registrar verifies request -> APPROVED_FOR_AI
  const verified = await importService.verifyRequest({
    requestId: importRequest.id,
    action: "APPROVE",
    remarks: "Valid Official Transcript",
    reviewerUserId: testUserId
  });
  assert.equal(verified.status, "APPROVED_FOR_AI");

  // 4. Run AI matching -> extracts deterministically from PDF without calling Gemini
  const processed = await importService.processAI(importRequest.id);
  assert.equal(processed.status, "UNDER_REVIEW");
  assert.equal(processed.extractedData?.extractionMethod, "DETERMINISTIC");
  assert.equal(processed.matchedData?.records?.length, 3);

  const matched = processed.matchedData.records;
  const emathRec = matched.find((r) => r.extractedCode === "EMATH 111");
  assert.ok(emathRec);
  assert.equal(emathRec.matchStatus, "HIGH_MATCH");
  assert.equal(emathRec.matchedSubjectCode, sub1.code);

  const eceRec = matched.find((r) => r.extractedCode === "ECE 101");
  assert.ok(eceRec);
  assert.equal(eceRec.matchStatus, "HIGH_MATCH");

  const unrelRec = matched.find((r) => r.extractedCode === "UNREL 999");
  assert.ok(unrelRec);
  assert.equal(unrelRec.matchStatus, "NO_MATCH");

  // 5. Preview Check
  const preview = await importService.getPreview(importRequest.id);
  assert.equal(preview.summary.totalDetected, 3);
  assert.equal(preview.summary.highMatches, 2);
  assert.equal(preview.summary.unmatched, 1);

  // 6. Final Commit with aligned resolution actions (USE_UPLOADED, SKIP)
  const commitResult = await importService.commitImport({
    requestId: importRequest.id,
    resolutions: [
      { recordIndex: 0, resolutionAction: "USE_UPLOADED", selectedSubjectId: sub1.id },
      { recordIndex: 1, resolutionAction: "SKIP" },
      { recordIndex: 2, resolutionAction: "USE_UPLOADED", selectedSubjectId: sub2.id }
    ],
    reviewerUserId: testUserId
  });

  assert.equal(commitResult.importedCount, 2);
  assert.equal(commitResult.skippedCount, 1);
  assert.equal(commitResult.request.status, "IMPORTED");
  assert.equal(commitResult.targetUserId, testUserId);
  assert.equal(commitResult.request.student?.userId, testUserId);

  // Verify Audit Log foreign key constraint with targetUserId = testUserId (User.id)
  await prisma.auditLog.create({
    data: {
      eventType: "academic_import.records_imported",
      outcome: "success",
      actorUserId: testUserId,
      targetUserId: commitResult.targetUserId,
      requestId: crypto.randomUUID(),
      ipHash: "0".repeat(64),
      method: "POST",
      path: `/api/academic-import/requests/${importRequest.id}/commit`,
      metadata: {
        requestId: importRequest.id,
        studentId: testStudent.id,
        importBatchId: commitResult.importBatchId,
        importedCount: commitResult.importedCount
      }
    }
  });

  // Guard: Repeated commit on already imported request must reject with ALREADY_IMPORTED
  await assert.rejects(
    () => importService.commitImport({
      requestId: importRequest.id,
      resolutions: [],
      reviewerUserId: testUserId
    }),
    /ALREADY_IMPORTED/
  );

  // 7. Verify Historical Term Mapping across distinct terms (2023-1S and 2023-2S)
  const creditedEnrollments = await prisma.enrollment.findMany({
    where: { studentId: testStudent.id },
    include: {
      academicTerm: { include: { academicYear: true } },
      items: { include: { courseOffering: { include: { subject: true } }, grades: true } }
    }
  });

  assert.ok(creditedEnrollments.length >= 2, "Must create historical enrollments for both semesters");
  const termCodes = creditedEnrollments.map((e) => e.academicTerm.code);
  assert.ok(termCodes.includes("2023-1S"), "Must map 1st semester to 2023-1S");
  assert.ok(termCodes.includes("2023-2S"), "Must map 2nd semester to 2023-2S");

  // 8. Eligibility Index check
  const allItems = creditedEnrollments.flatMap((e) => e.items);
  const eligibility = buildAcademicRecordIndex(allItems);
  assert.equal(eligibility.get(sub1.id), "PASSED");
  assert.equal(eligibility.get(sub2.id), "PASSED");

  // Clean up
  await prisma.grade.deleteMany({ where: { enrollmentItem: { enrollment: { studentId: testStudent.id } } } });
  await prisma.enrollmentItem.deleteMany({ where: { enrollment: { studentId: testStudent.id } } });
  await prisma.enrollment.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.academicRecordImportRequest.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.studentDocument.deleteMany({ where: { studentId: testStudent.id } });
});

test("AI-Assisted Academic Record Import: Rejection flow, Conflict Actions & Program Mismatch", { timeout: 30_000 }, async () => {
  const prisma = createDatabase();
  const testUserId = "00000000-0000-0000-0000-000000000999";

  const program = await prisma.program.findFirst({ where: { code: "BSECE" } });
  assert.ok(program);
  const curriculum = await prisma.curriculum.findFirst({ where: { programId: program.id } });
  assert.ok(curriculum);
  const sub1 = await prisma.subject.findFirst({ where: { programId: program.id, OR: [{ code: "EMATH 111" }, { codeNormalized: "emath 111" }] } });
  assert.ok(sub1);

  let testStudent = await prisma.student.findFirst({ where: { userId: testUserId } });
  if (!testStudent) {
    testStudent = await prisma.student.create({
      data: {
        userId: testUserId,
        studentNumber: `2026-IMP-CONF-${Date.now().toString().slice(-4)}`,
        studentNumberNormalized: `2026-imp-conf-${Date.now().toString().slice(-4)}`,
        firstName: "Conflict",
        lastName: "Tester",
        admissionYear: 2026,
        programId: program.id,
        curriculumId: curriculum.id
      }
    });
  }

  const inMemoryFiles = new Map();
  const mockStorage = {
    generateStoredFileName: (orig, ext) => `stored_${Date.now()}${ext}`,
    saveFile: async (relPath, buf) => { inMemoryFiles.set(relPath, buf); return relPath; },
    readFile: async (relPath) => inMemoryFiles.get(relPath) || Buffer.from(""),
    getMaxFileSize: () => 10 * 1024 * 1024
  };

  const importService = new AcademicImportService(prisma, mockStorage);

  // 1. Rejection test
  const rejPdf = createTextPdfBuffer(["EMATH 111, Calculus 1, 4.0, 3.0, Passed"]);
  const rejReq = await importService.createRequest({
    studentId: testStudent.id,
    targetProgramId: program.id,
    file: { originalName: "doc.pdf", buffer: rejPdf, mimeType: "application/pdf" },
    userId: testUserId
  });

  // Rejection without remarks throws
  await assert.rejects(
    () => importService.verifyRequest({ requestId: rejReq.id, action: "REJECT", remarks: "", reviewerUserId: testUserId }),
    /REMARKS_REQUIRED_ON_REJECTION/
  );

  const rejected = await importService.verifyRequest({
    requestId: rejReq.id,
    action: "REJECT",
    remarks: "Blurred document",
    reviewerUserId: testUserId
  });
  assert.equal(rejected.status, "REJECTED");
  assert.equal(rejected.rejectionReason, "Blurred document");

  // 2. Conflict Test: Seed existing posted grade for EMATH 111 (2.75)
  const targetTerm = await prisma.academicTerm.findFirst({ where: { status: "ACTIVE" } }) ||
    await prisma.academicTerm.findFirst();
  assert.ok(targetTerm);

  let finalGp = await prisma.gradingPeriod.findFirst({ where: { academicTermId: targetTerm.id } });
  if (!finalGp) {
    finalGp = await prisma.gradingPeriod.create({
      data: {
        academicTermId: targetTerm.id,
        name: "Final Grade",
        code: `FINAL-${targetTerm.code || Date.now()}`,
        type: "FINAL",
        sequence: 4,
        isFinal: true
      }
    });
  }

  let offering = await prisma.courseOffering.findFirst({
    where: { academicTermId: targetTerm.id, subjectId: sub1.id }
  });
  if (!offering) {
    offering = await prisma.courseOffering.create({
      data: {
        academicTermId: targetTerm.id,
        subjectId: sub1.id,
        offeringCode: `OFF-TEST-${Date.now().toString().slice(-4)}`,
        creditUnits: 4.0,
        status: "COMPLETED"
      }
    });
  }

  let enr = await prisma.enrollment.findFirst({
    where: { studentId: testStudent.id, academicTermId: targetTerm.id }
  });
  if (!enr) {
    enr = await prisma.enrollment.create({
      data: {
        studentId: testStudent.id,
        academicTermId: targetTerm.id,
        programId: program.id,
        curriculumId: curriculum.id,
        yearLevel: 1,
        status: "COMPLETED"
      }
    });
  }

  let enrItem = await prisma.enrollmentItem.findFirst({
    where: { enrollmentId: enr.id, courseOfferingId: offering.id }
  });
  if (!enrItem) {
    enrItem = await prisma.enrollmentItem.create({
      data: {
        enrollmentId: enr.id,
        courseOfferingId: offering.id,
        status: "COMPLETED"
      }
    });
  }

  await prisma.grade.upsert({
    where: {
      enrollmentItemId_gradingPeriodId: {
        enrollmentItemId: enrItem.id,
        gradingPeriodId: finalGp.id
      }
    },
    update: {
      numericGrade: 2.75,
      isPassing: true,
      status: "POSTED",
      approvedByUserId: testUserId
    },
    create: {
      enrollmentItemId: enrItem.id,
      gradingPeriodId: finalGp.id,
      numericGrade: 2.75,
      isPassing: true,
      status: "POSTED",
      approvedByUserId: testUserId
    }
  });

  // Now upload new record with EMATH 111 grade 1.50
  const conflictPdf = createTextPdfBuffer([
    "Academic Year: 2024-2025",
    "1st Semester",
    "EMATH 111, Calculus 1, 4.0, 1.50, Passed"
  ]);

  const confReq = await importService.createRequest({
    studentId: testStudent.id,
    targetProgramId: program.id,
    file: { originalName: "tor_new.pdf", buffer: conflictPdf, mimeType: "application/pdf" },
    userId: testUserId
  });

  await importService.verifyRequest({
    requestId: confReq.id,
    action: "APPROVE",
    remarks: "Valid TOR",
    reviewerUserId: testUserId
  });

  await importService.processAI(confReq.id);
  const preview = await importService.getPreview(confReq.id);

  assert.equal(preview.summary.conflicts, 1);
  const conflictItem = preview.records[0];
  assert.equal(conflictItem.matchStatus, "CONFLICT");
  assert.equal(conflictItem.conflict.hasConflict, true);
  assert.equal(Number(conflictItem.conflict.existingGrade), 2.75);

  // Re-run AI matching from UNDER_REVIEW must succeed without error
  const rerun = await importService.processAI(confReq.id);
  assert.equal(rerun.status, "UNDER_REVIEW");

  // Conflict Action: KEEP_EXISTING (keeps 2.75, does not overwrite)
  await importService.commitImport({
    requestId: confReq.id,
    resolutions: [
      { recordIndex: 0, resolutionAction: "KEEP_EXISTING" }
    ],
    reviewerUserId: testUserId
  });

  const existingGradeCheck = await prisma.grade.findUnique({
    where: {
      enrollmentItemId_gradingPeriodId: {
        enrollmentItemId: enrItem.id,
        gradingPeriodId: finalGp.id
      }
    }
  });
  assert.equal(Number(existingGradeCheck.numericGrade), 2.75, "Grade must remain 2.75 when KEEP_EXISTING chosen");

  // Clean up
  await prisma.grade.deleteMany({ where: { enrollmentItem: { enrollment: { studentId: testStudent.id } } } });
  await prisma.enrollmentItem.deleteMany({ where: { enrollment: { studentId: testStudent.id } } });
  await prisma.enrollment.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.academicRecordImportRequest.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.studentDocument.deleteMany({ where: { studentId: testStudent.id } });
});

test("AI-Assisted Academic Record Import: Strict File Signature & Security Guards", async () => {
  const prisma = createDatabase();
  const importService = new AcademicImportService(prisma, {});

  // 1. Empty buffer
  assert.throws(
    () => importService.validateImportFile({ originalName: "doc.pdf", buffer: Buffer.from("") }),
    /FILE_EMPTY/
  );

  // 2. Executable Windows PE / MZ header
  const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  assert.throws(
    () => importService.validateImportFile({ originalName: "malicious.pdf", buffer: exeBuffer }),
    /EXECUTABLE_FILE_BLOCKED/
  );

  // 3. Executable Linux ELF header
  const elfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
  assert.throws(
    () => importService.validateImportFile({ originalName: "binary.pdf", buffer: elfBuffer }),
    /EXECUTABLE_FILE_BLOCKED/
  );

  // 4. Fake renamed file (text file renamed to .pdf without %PDF header)
  const fakePdf = Buffer.from("Subject Code, Title, Units, Grade\nCS101, Intro, 3, 1.0");
  assert.throws(
    () => importService.validateImportFile({ originalName: "fake.pdf", buffer: fakePdf }),
    /UNSUPPORTED_FILE_SIGNATURE/
  );

  // 5. Unsupported file extension
  assert.throws(
    () => importService.validateImportFile({ originalName: "grades.xlsx", buffer: Buffer.from("PK\x03\x04") }),
    /INVALID_FILE_EXTENSION/
  );

  // 6. Valid PNG signature
  const pngBuf = createPngBuffer();
  const validatedPng = importService.validateImportFile({ originalName: "scan.png", buffer: pngBuf });
  assert.equal(validatedPng.extension, ".png");
  assert.equal(validatedPng.mimeType, "image/png");

  // 7. Valid PDF signature
  const validPdf = createTextPdfBuffer(["Sample Text"]);
  const validatedPdf = importService.validateImportFile({ originalName: "doc.pdf", buffer: validPdf });
  assert.equal(validatedPdf.extension, ".pdf");
  assert.equal(validatedPdf.mimeType, "application/pdf");
});

test("AI-Assisted Academic Record Import: Scanned Multi-Page PDF, Gemini Fallback & 0-Record Handling", { timeout: 30_000 }, async () => {
  const prisma = createDatabase();
  const testUserId = "00000000-0000-0000-0000-000000000999";

  const program = await prisma.program.findFirst({ where: { code: "BSECE" } });
  assert.ok(program);
  const curriculum = await prisma.curriculum.findFirst({ where: { programId: program.id } });
  assert.ok(curriculum);

  let testStudent = await prisma.student.findFirst({ where: { userId: testUserId } });
  if (!testStudent) {
    testStudent = await prisma.student.create({
      data: {
        userId: testUserId,
        studentNumber: `2026-IMP-SCAN-${Date.now().toString().slice(-4)}`,
        studentNumberNormalized: `2026-imp-scan-${Date.now().toString().slice(-4)}`,
        firstName: "Scanned",
        lastName: "Applicant",
        admissionYear: 2026,
        programId: program.id,
        curriculumId: curriculum.id
      }
    });
  }

  // Scanned PDF with NO text stream layer (only raster/image stream placeholder)
  const scannedPdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 20 >>
stream
q 1 0 0 1 0 0 cm /Im0 Do Q
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000210 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;
  const scannedPdfBuffer = Buffer.from(scannedPdfContent, "latin1");

  const inMemoryFiles = new Map();
  const mockStorage = {
    generateStoredFileName: (orig, ext) => `stored_${Date.now()}${ext}`,
    saveFile: async (relPath, buf) => { inMemoryFiles.set(relPath, buf); return relPath; },
    readFile: async (relPath) => inMemoryFiles.get(relPath) || scannedPdfBuffer,
    getMaxFileSize: () => 10 * 1024 * 1024
  };

  const importService = new AcademicImportService(prisma, mockStorage);

  // 1. Submit scanned import request
  const scannedReq = await importService.createRequest({
    studentId: testStudent.id,
    targetProgramId: program.id,
    file: {
      originalName: "scanned_transcript.pdf",
      buffer: scannedPdfBuffer,
      mimeType: "application/pdf"
    },
    userId: testUserId,
    previousSchool: "Holy Cross College",
    remarks: "Transfer credits evaluation"
  });

  // Verify request
  await importService.verifyRequest({
    requestId: scannedReq.id,
    action: "APPROVE",
    remarks: "Verified authentic physical COG",
    reviewerUserId: testUserId
  });

  // 2. Mock fetch for Gemini API
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-mock-gemini-key-12345";

  let callCount = 0;
  let requestedModels = [];

  try {
    // A. First scenario: Gemini returns 0 records / unreadable document -> Must throw error & remain in retryable state
    globalThis.fetch = async (url, opts) => {
      callCount++;
      const urlObj = new URL(url);
      const modelMatch = urlObj.pathname.match(/\/models\/([^:]+):generateContent/);
      if (modelMatch) requestedModels.push(modelMatch[1]);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ detectedProgram: null, records: [] }) }]
              }
            }
          ]
        })
      };
    };

    await assert.rejects(
      () => importService.processAI(scannedReq.id),
      (err) => {
        assert.match(err.message, /No academic records could be extracted/i);
        return true;
      }
    );

    // Verify request status was NOT set to UNDER_REVIEW, but remained APPROVED_FOR_AI so registrar can retry
    const reloadedFailedReq = await importService.getRequest(scannedReq.id);
    assert.equal(reloadedFailedReq.status, "APPROVED_FOR_AI");

    const activeModel = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
    // B. Second scenario: configured model fails with 500 error -> Returns exact error
    requestedModels = [];
    callCount = 0;

    globalThis.fetch = async (url, opts) => {
      callCount++;
      const urlObj = new URL(url);
      const modelMatch = urlObj.pathname.match(/\/models\/([^:]+):generateContent/);
      const model = modelMatch ? modelMatch[1] : "unknown";
      requestedModels.push(model);

      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: { code: 500, message: `Model overloaded on ${activeModel}` } })
      };
    };

    await assert.rejects(
      () => importService.processAI(scannedReq.id),
      (err) => {
        assert.match(err.message, new RegExp(activeModel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
        assert.match(err.message, new RegExp(`Model overloaded on ${activeModel}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
        return true;
      }
    );
    assert.deepEqual(requestedModels, [activeModel], "Must only query configured GEMINI_MODEL");

    // C. Third scenario: gemini-3.8-flash succeeds and returns extracted records
    requestedModels = [];
    callCount = 0;

    globalThis.fetch = async (url, opts) => {
      callCount++;
      const urlObj = new URL(url);
      const modelMatch = urlObj.pathname.match(/\/models\/([^:]+):generateContent/);
      const model = modelMatch ? modelMatch[1] : "unknown";
      requestedModels.push(model);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      detectedProgram: "BSECE",
                      records: [
                        {
                          academicYear: "2023-2024",
                          term: "1st Semester",
                          subjectCode: "EMATH 111",
                          subjectTitle: "Calculus 1",
                          units: 4.0,
                          grade: "1.75",
                          remarks: "Passed"
                        },
                        {
                          academicYear: "2023-2024",
                          term: "2nd Semester",
                          subjectCode: "ECE 101",
                          subjectTitle: "Introduction to Electronics Engineering",
                          units: 3.0,
                          grade: "1.50",
                          remarks: "Passed"
                        }
                      ]
                    })
                  }
                ]
              }
            }
          ]
        })
      };
    };

    const successfulRun = await importService.processAI(scannedReq.id);
    assert.equal(successfulRun.status, "UNDER_REVIEW");
    assert.equal(successfulRun.extractedData?.extractionMethod, "GEMINI");
    assert.equal(successfulRun.matchedData?.records?.length, 2);
    assert.deepEqual(requestedModels, [activeModel], `Must use configured model (${activeModel})`);

    // Preview check
    const preview = await importService.getPreview(scannedReq.id);
    assert.equal(preview.extractionMethod, "GEMINI");
    assert.equal(preview.summary.totalDetected, 2);
    assert.equal(preview.summary.highMatches, 2);

  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    else delete process.env.GEMINI_API_KEY;

    // Clean up
    await prisma.academicRecordImportRequest.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.studentDocument.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.studentObligation.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.student.deleteMany({ where: { id: testStudent.id } });
  }
});

test("AI-Assisted Academic Record Import: AY & Term Handling, Unclear Period Review & Legacy Fallback", { timeout: 30_000 }, async () => {
  const prisma = createDatabase();
  const testUserId = "00000000-0000-0000-0000-000000000999";

  const program = await prisma.program.findFirst({ where: { code: "BSECE" } });
  assert.ok(program);
  const curriculum = await prisma.curriculum.findFirst({ where: { programId: program.id } });
  assert.ok(curriculum);
  const sub1 = await prisma.subject.findFirst({ where: { programId: program.id, OR: [{ code: "EMATH 111" }, { codeNormalized: "emath 111" }] } });
  assert.ok(sub1);
  const sub2 = await prisma.subject.findFirst({ where: { programId: program.id, OR: [{ code: "ECE 101" }, { codeNormalized: "ece 101" }] } });
  assert.ok(sub2);

  let testStudent = await prisma.student.findFirst({ where: { userId: testUserId } });
  if (!testStudent) {
    testStudent = await prisma.student.create({
      data: {
        userId: testUserId,
        studentNumber: `2026-IMP-TERM-${Date.now().toString().slice(-4)}`,
        studentNumberNormalized: `2026-imp-term-${Date.now().toString().slice(-4)}`,
        firstName: "Term",
        lastName: "Tester",
        admissionYear: 2026,
        programId: program.id,
        curriculumId: curriculum.id
      }
    });
  }

  const inMemoryFiles = new Map();
  const mockStorage = {
    generateStoredFileName: (orig, ext) => `stored_${Date.now()}${ext}`,
    saveFile: async (relPath, buf) => { inMemoryFiles.set(relPath, buf); return relPath; },
    readFile: async (relPath) => inMemoryFiles.get(relPath) || Buffer.from(""),
    getMaxFileSize: () => 10 * 1024 * 1024
  };

  const importService = new AcademicImportService(prisma, mockStorage);

  // 1. Create a document where AY and Term are missing/unclear for one record and present for another
  const matchResult = await importService.matchExtractedRecords({
    targetProgramId: program.id,
    studentId: testStudent.id,
    extractedRecords: [
      {
        academicYear: "2023-2024",
        term: "1st Semester",
        subjectCode: "EMATH 111",
        subjectTitle: "Calculus 1",
        units: 4.0,
        grade: "2.00",
        remarks: "Passed"
      },
      {
        academicYear: "Unclear AY",
        term: "",
        subjectCode: "ECE 101",
        subjectTitle: "Introduction to Electronics Engineering",
        units: 3.0,
        grade: "1.75",
        remarks: "Passed"
      }
    ]
  });

  const records = matchResult.matchedRecords;
  assert.equal(records[0].periodStatus, "CONFIDENT");
  assert.equal(records[0].matchStatus, "HIGH_MATCH");

  // Missing/unclear AY & Term must be flagged as UNCLEAR_OR_MISSING & NEEDS_REVIEW
  assert.equal(records[1].periodStatus, "UNCLEAR_OR_MISSING");
  assert.equal(records[1].matchStatus, "NEEDS_REVIEW");
  assert.ok(records[1].periodNote);

  // 2. Test getOrCreateHistoricalTerm directly:
  // Case A: Confident AY + Term -> maps to 2023-1S historical term
  const termResA = await prisma.$transaction((tx) =>
    importService.getOrCreateHistoricalTerm(tx, "2023-2024", "1st Semester")
  );
  assert.equal(termResA.academicYear.code, "2023-2024");
  assert.equal(termResA.academicTerm.code, "2023-1S");
  assert.equal(termResA.academicTerm.status, "CLOSED");

  // Case B: Explicit "Legacy / Unknown Historical Term" -> maps to LEGACY-CREDIT baseline (startsOn: 2000-08-01, CLOSED)
  const termResB = await prisma.$transaction((tx) =>
    importService.getOrCreateHistoricalTerm(tx, "Legacy / Unknown Historical Term", "Legacy")
  );
  assert.equal(termResB.academicYear.code, "LEGACY-CREDIT");
  assert.equal(termResB.academicTerm.status, "CLOSED");
  assert.equal(termResB.academicTerm.startsOn.getFullYear(), 2000);

  // Clean up
  await prisma.academicRecordImportRequest.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.studentDocument.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.student.deleteMany({ where: { id: testStudent.id } });
});

test("Legacy Student Onboarding: Credited subjects marked isPassed/alreadyCompleted in options and visible in student academic history", { timeout: 30_000 }, async () => {
  const prisma = createDatabase();

  const curriculum = await prisma.curriculum.findFirst({
    where: { program: { code: "BSECE" }, subjects: { some: {} } },
    include: { program: true, subjects: { include: { subject: true } } }
  }) || await prisma.curriculum.findFirst({
    where: { subjects: { some: {} } },
    include: { program: true, subjects: { include: { subject: true } } }
  });

  assert.ok(curriculum && curriculum.subjects.length >= 1);
  const program = curriculum.program;

  const sub1 = curriculum.subjects[0].subject;
  const sub2 = curriculum.subjects[1]?.subject || null;

  const testUserId = randomUUID();
  const testStudentNumber = `LEG-${Date.now().toString().slice(-6)}`;

  await prisma.user.create({
    data: {
      id: testUserId,
      email: `${testUserId}@example.com`,
      emailNormalized: `${testUserId}@example.com`.toLowerCase(),
      username: `student_${Date.now()}`,
      usernameNormalized: `student_${Date.now()}`.toLowerCase(),
      displayName: "Legacy Onboardee",
      passwordHash: "hash",
      status: "ACTIVE"
    }
  });

  const testStudent = await prisma.student.create({
    data: {
      userId: testUserId,
      studentNumber: testStudentNumber,
      studentNumberNormalized: testStudentNumber.toLowerCase(),
      firstName: "Legacy",
      lastName: "Onboardee",
      admissionYear: 2023,
      programId: program.id,
      curriculumId: curriculum.id,
      currentYearLevel: 2,
      status: "ACTIVE"
    }
  });

  const inMemoryFiles = new Map();
  const mockStorage = {
    generateStoredFileName: (orig, ext) => `stored_${Date.now()}${ext}`,
    saveFile: async (relPath, buf) => { inMemoryFiles.set(relPath, buf); return relPath; },
    readFile: async (relPath) => inMemoryFiles.get(relPath) || Buffer.from(""),
    getMaxFileSize: () => 10 * 1024 * 1024
  };

  const importService = new AcademicImportService(prisma, mockStorage);
  const enrollmentStore = new EnrollmentApplicationStore(prisma);
  const studentDashboardStore = new StudentDashboardStore(prisma);

  // 1. Submit and verify request with sub1 passed
  const pdfBuffer = createTextPdfBuffer([
    "Academic Year: 2023-2024",
    "1st Semester",
    `${sub1.code}, ${sub1.title}, 3.0, 1.50, Passed`
  ]);

  const importRequest = await importService.createRequest({
    studentId: testStudent.id,
    targetProgramId: program.id,
    file: { originalName: "transcript.pdf", buffer: pdfBuffer, mimeType: "application/pdf" },
    userId: testUserId
  });

  await importService.verifyRequest({
    requestId: importRequest.id,
    action: "APPROVE",
    remarks: "Verified valid historical TOR",
    reviewerUserId: testUserId
  });

  await importService.processAI(importRequest.id);

  // Commit import
  await importService.commitImport({
    requestId: importRequest.id,
    resolutions: [
      {
        recordIndex: 0,
        resolutionAction: "USE_UPLOADED",
        selectedSubjectId: sub1.id,
        academicYear: "2023-2024",
        term: "1st Semester"
      }
    ],
    reviewerUserId: testUserId
  });

  // 2. Verify Enrollment Options has isPassed & alreadyCompleted for sub1, but NOT sub2
  const options = await enrollmentStore.options(testUserId);
  assert.ok(options.curriculumSubjects.length > 0);

  const sub1Option = options.curriculumSubjects.find((item) => item.subjectId === sub1.id);
  const sub2Option = options.curriculumSubjects.find((item) => item.subjectId === sub2.id);

  if (sub1Option) {
    assert.equal(sub1Option.isPassed, true, "Credited subject must be flagged isPassed: true in enrollment options");
    assert.equal(sub1Option.alreadyCompleted, true, "Credited subject must be flagged alreadyCompleted: true in enrollment options");
  }

  if (sub2Option) {
    assert.equal(sub2Option.isPassed, false, "Untaken subject must be isPassed: false");
    assert.equal(sub2Option.alreadyCompleted, false, "Untaken subject must be alreadyCompleted: false");
  }

  // 3. Verify Student Dashboard returns academicHistory grouped with the credited term
  const dashboard = await studentDashboardStore.forUser(testUserId);
  assert.ok(dashboard.linked);
  assert.ok(Array.isArray(dashboard.academicHistory));
  assert.ok(dashboard.academicHistory.length >= 1, "Must contain at least 1 historical term entry");

  const histEntry = dashboard.academicHistory.find((entry) => entry.academicYear === "2023-2024" || entry.termCode === "2023-1S");
  assert.ok(histEntry, "Must find 2023-2024 historical term in academicHistory");
  assert.ok(histEntry.grades.some((g) => g.subjectCode === sub1.code && g.isPassing === true));

  // Create an active current term enrollment for this student (no grades posted yet)
  const activeTerm = await prisma.academicTerm.findFirst({
    where: { status: "ACTIVE" }
  }) || await prisma.academicTerm.findFirst({
    orderBy: { startsOn: "desc" }
  });

  if (activeTerm) {
    const activeEnrollment = await prisma.enrollment.create({
      data: {
        studentId: testStudent.id,
        academicTermId: activeTerm.id,
        programId: program.id,
        curriculumId: curriculum.id,
        yearLevel: 2,
        status: "ENROLLED",
        enrolledAt: new Date()
      }
    });

    const activeDashboard = await studentDashboardStore.forUser(testUserId);
    assert.equal(activeDashboard.finalGrades.length, 0, "Current active enrollment has 0 posted final grades");
    assert.ok(activeDashboard.academicHistory.length >= 1, "Academic history still retains credited historical terms");
  }

  // Clean up
  await prisma.grade.deleteMany({ where: { enrollmentItem: { enrollment: { studentId: testStudent.id } } } });
  await prisma.enrollmentItem.deleteMany({ where: { enrollment: { studentId: testStudent.id } } });
  await prisma.enrollment.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.academicRecordImportRequest.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.studentDocument.deleteMany({ where: { studentId: testStudent.id } });
  await prisma.studentObligation.deleteMany({ where: { studentId: testStudent.id } });
});



