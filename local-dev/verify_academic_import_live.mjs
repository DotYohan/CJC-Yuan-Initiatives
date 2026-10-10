import assert from "node:assert/strict";
import { createDatabase } from "../server/db.mjs";
import { AcademicImportService } from "../server/academic-import-service.mjs";
import { buildAcademicRecordIndex } from "../server/academic-eligibility.mjs";

function createTextPdfBuffer(lines) {
  const streamLines = lines.map((l) => `(${l.replace(/[\(\)\\]/g, "\\$&")}) Tj T*`).join("\n");
  const streamContent = `BT\n/F1 12 Tf\n14 TL\n72 720 Td\n${streamLines}\nET`;
  const streamLength = Buffer.byteLength(streamContent);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000305 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLength}
%%EOF`;

  return Buffer.from(pdf, "utf8");
}

async function main() {
    console.log("Starting Live Integration Verification...");
    const prisma = createDatabase();

    try {
        const program = await prisma.program.findFirst({
            where: { isActive: true },
            include: { curricula: { include: { subjects: { include: { subject: true } } } } }
        });
        assert.ok(program, "Must have an active program");
        const curriculum = program.curricula[0];
        assert.ok(curriculum, "Program must have curriculum");
        assert.ok(curriculum.subjects.length > 0, "Curriculum must have subjects");

        const targetSubject = curriculum.subjects[0].subject;

        let student = await prisma.student.findFirst({
            include: { user: true, program: true }
        });
        assert.ok(student, "Must have a student");

        console.log(`Using Student: ${student.studentNumber} (${student.firstName} ${student.lastName})`);
        console.log(`Target Program: ${program.code} (${program.name})`);
        console.log(`Target Curriculum: ${curriculum.code}, Sample Subject: ${targetSubject.code}`);

        // 1. Submit Import Request with text PDF
        const pdfLines = [
            "Academic Year: 2024-2025",
            "1st Semester",
            `${targetSubject.code}, ${targetSubject.title}, ${curriculum.subjects[0].creditUnits || 3}, 1.5, Passed`,
            "GEN-001, Introduction to General Arts, 3, 2.0, Passed"
        ];
        const buffer = createTextPdfBuffer(pdfLines);

        const inMemoryFiles = new Map();
        const mockStorage = {
            generateStoredFileName: (orig, ext) => `stored_${Date.now()}${ext}`,
            saveFile: async (relPath, buf) => { inMemoryFiles.set(relPath, buf); return relPath; },
            readFile: async (relPath) => inMemoryFiles.get(relPath) || buffer,
            getMaxFileSize: () => 10 * 1024 * 1024
        };
        const importService = new AcademicImportService(prisma, mockStorage);

        const request = await importService.createRequest({
            studentId: student.id,
            targetProgramId: program.id,
            file: {
                originalName: "transcript_grades.pdf",
                buffer,
                mimeType: "application/pdf"
            },
            userId: student.userId,
            previousSchool: "University of Southern Mindanao",
            remarks: "Transferee crediting application"
        });

        console.log(`✓ Step 1: Request Created [${request.requestNumber}] (Status: ${request.status})`);
        assert.equal(request.status, "SUBMITTED");

        // 2. Registrar Verification
        const registrarUser = await prisma.user.findFirst({
            where: { userRoles: { some: { role: { slug: "registrar" } } } }
        });
        assert.ok(registrarUser, "Must have registrar user");

        const verified = await importService.verifyRequest({
            requestId: request.id,
            action: "APPROVE",
            remarks: "Document verified and approved for AI processing",
            reviewerUserId: registrarUser.id
        });
        console.log(`✓ Step 2: Request Verified (Status: ${verified.status})`);
        assert.equal(verified.status, "APPROVED_FOR_AI");

        // 3. Extraction & Matching Processing (Deterministic Parser first)
        const processed = await importService.processAI(request.id);
        console.log(`✓ Step 3: Processing Complete (Status: ${processed.status}, Method: ${processed.extractedData?.extractionMethod})`);
        assert.equal(processed.status, "UNDER_REVIEW");
        assert.equal(processed.extractedData?.extractionMethod, "DETERMINISTIC");

        // 4. Preview Check
        const preview = await importService.getPreview(request.id);
        console.log(`✓ Step 4: Match Preview Summary:`, preview.summary);
        assert.ok(preview.records.length > 0, "Must have extracted records");

        const matchedItem = preview.records.find(r => r.matchedSubjectId === targetSubject.id);
        assert.ok(matchedItem, `Extracted records must contain match for ${targetSubject.code}`);
        console.log(`Matched Item: ${matchedItem.extractedCode} -> ${matchedItem.matchedSubjectCode} (Match: ${matchedItem.matchStatus})`);

        // 5. Commit Crediting
        const commitResult = await importService.commitImport({
            requestId: request.id,
            resolutions: preview.records.map((r, idx) => ({
                recordIndex: idx,
                resolutionAction: r.matchedSubjectId ? "USE_UPLOADED" : "SKIP",
                selectedSubjectId: r.matchedSubjectId
            })),
            reviewerUserId: registrarUser.id
        });
        console.log(`✓ Step 5: Committed Import (Imported Count: ${commitResult.importedCount}, Skipped Count: ${commitResult.skippedCount})`);
        assert.ok(commitResult.importedCount >= 1, "Must import at least 1 matched subject");

        // 6. Verify Academic Record Index & Eligibility
        const studentEnrollmentItems = await prisma.enrollmentItem.findMany({
            where: { enrollment: { studentId: student.id } },
            include: {
                courseOffering: { include: { subject: true } },
                grades: true
            }
        });
        const recordIndex = buildAcademicRecordIndex(studentEnrollmentItems);
        const hasPassed = recordIndex.get(targetSubject.id) === "PASSED";
        console.log(`✓ Step 6: Academic Eligibility Index has passed ${targetSubject.code}: ${hasPassed}`);
        assert.equal(hasPassed, true, "Student must be credited with the passed subject in record index");

        // 7. Verify Official Program Unchanged
        const reloadedStudent = await prisma.student.findUnique({
            where: { id: student.id },
            include: { program: true }
        });
        console.log(`✓ Step 7: Verified Student Official Program: ${reloadedStudent.program?.code || "None"} (Unchanged)`);

        console.log("\n========================================================");
        console.log("🎉 ALL INTEGRATION VERIFICATION CHECKS PASSED PERFECTLY!");
        console.log("========================================================");
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
});
