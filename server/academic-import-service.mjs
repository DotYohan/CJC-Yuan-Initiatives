import crypto from "node:crypto";
import zlib from "node:zlib";
import { isIncompleteGrade, isPassingGrade } from "./academic-eligibility.mjs";

/**
 * Recursively sanitizes strings, arrays, and objects for safe PostgreSQL JSON/Text storage,
 * removing null bytes (\u0000) and lone surrogate code points that trigger Postgres 22P05 errors.
 */
function sanitizeForPostgres(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") {
    return val.replace(/\0/g, "").replace(/[\uD800-\uDFFF]/g, "").trim();
  }
  if (typeof val === "number" || typeof val === "boolean") return val;
  if (typeof val === "bigint") return Number(val);
  if (Array.isArray(val)) {
    return val.map(sanitizeForPostgres);
  }
  if (typeof val === "object") {
    const cleaned = {};
    for (const [k, v] of Object.entries(val)) {
      const cleanKey = typeof k === "string" ? k.replace(/\0/g, "") : k;
      cleaned[cleanKey] = sanitizeForPostgres(v);
    }
    return cleaned;
  }
  return val;
}

/**
 * Normalizes text for string matching (lowercase, alphanumeric only).
 */
function normalizeString(str) {
  if (!str) return "";
  return String(str)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Calculates Jaccard / Token similarity between two titles.
 */
function calculateTitleSimilarity(titleA, titleB) {
  if (!titleA || !titleB) return 0;
  const wordsA = new Set(String(titleA).toLowerCase().split(/[\s,./\\-_()]+/).filter(Boolean));
  const wordsB = new Set(String(titleB).toLowerCase().split(/[\s,./\\-_()]+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg"]);
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export class AcademicImportService {
  constructor(prisma, storageService) {
    this.prisma = prisma;
    this.storage = storageService;
  }

  /**
   * Validates uploaded academic record file:
   * - Max 50 MB
   * - Extensions: .pdf, .png, .jpg, .jpeg
   * - Actual magic byte file signature verification
   * - Explicitly rejects executables (MZ, ELF, Mach-O), script headers, and empty files.
   */
  validateImportFile(file) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new Error("FILE_EMPTY");
    }

    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new Error("FILE_TOO_LARGE");
    }

    const origName = String(file.originalName || "").trim();
    const dotIdx = origName.lastIndexOf(".");
    const extension = dotIdx >= 0 ? origName.slice(dotIdx).toLowerCase() : "";

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error("INVALID_FILE_EXTENSION");
    }

    const buf = file.buffer;

    // Reject executable and script signatures
    if (buf.length >= 2 && buf[0] === 0x4D && buf[1] === 0x5A) {
      throw new Error("EXECUTABLE_FILE_BLOCKED"); // Windows PE / DOS MZ
    }
    if (buf.length >= 4 && buf[0] === 0x7F && buf[1] === 0x45 && buf[2] === 0x4C && buf[3] === 0x46) {
      throw new Error("EXECUTABLE_FILE_BLOCKED"); // Linux ELF
    }
    if (buf.length >= 4 && ((buf[0] === 0xFE && buf[1] === 0xED && buf[2] === 0xFA && (buf[3] === 0xCE || buf[3] === 0xCF)) ||
      (buf[0] === 0xCA && buf[1] === 0xFE && buf[2] === 0xBA && buf[3] === 0xBE))) {
      throw new Error("EXECUTABLE_FILE_BLOCKED"); // Mach-O binary
    }

    // Verify magic bytes matching extension
    let detectedMime = null;
    if (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF") {
      detectedMime = "application/pdf";
    } else if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
      detectedMime = "image/png";
    } else if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      detectedMime = "image/jpeg";
    }

    if (!detectedMime) {
      throw new Error("UNSUPPORTED_FILE_SIGNATURE");
    }

    if (extension === ".pdf" && detectedMime !== "application/pdf") {
      throw new Error("FILE_SIGNATURE_MISMATCH");
    }
    if (extension === ".png" && detectedMime !== "image/png") {
      throw new Error("FILE_SIGNATURE_MISMATCH");
    }
    if ((extension === ".jpg" || extension === ".jpeg") && detectedMime !== "image/jpeg") {
      throw new Error("FILE_SIGNATURE_MISMATCH");
    }

    return { extension, mimeType: detectedMime };
  }

  formatRequest(request) {
    if (!request) return null;
    const previousSchool = request.previousSchool || request.extractedData?.previousSchool || null;
    const submittedAt = request.submittedAt || request.createdAt || request.document?.uploadedAt || null;
    const originalFilename = request.document?.originalFileName || null;
    const requestNumber = request.requestNumber || `REQ-${request.id.slice(0, 8).toUpperCase()}`;

    return {
      ...request,
      requestNumber,
      previousSchool,
      submittedAt,
      originalFilename,
      document: request.document
        ? {
          ...request.document,
          fileSize: typeof request.document.fileSize === "bigint"
            ? Number(request.document.fileSize)
            : request.document.fileSize
        }
        : request.document
    };
  }

  /**
   * Helper to fetch or create default DocumentType for Academic Record / Transcript
   */
  async getOrCreateTranscriptDocumentType() {
    let docType = await this.prisma.documentType.findFirst({
      where: {
        OR: [
          { name: { contains: "Transcript", mode: "insensitive" } },
          { name: { contains: "Academic Record", mode: "insensitive" } },
          { name: { contains: "Credit Evaluation", mode: "insensitive" } }
        ]
      }
    });

    if (!docType) {
      docType = await this.prisma.documentType.create({
        data: {
          name: "Academic Record / Transcript",
          description: "Student submitted academic records, TOR, or grades for credit evaluation",
          required: false,
          active: true,
          sortOrder: 100
        }
      });
    }

    return docType;
  }

  /**
   * Student submits credit evaluation request with program selection, previous school, and uploaded file.
   */
  async createRequest({ studentId, targetProgramId, previousSchool = null, file, userId }) {
    if (!studentId) throw new Error("STUDENT_ID_REQUIRED");
    if (!targetProgramId) throw new Error("PROGRAM_SELECTION_REQUIRED");
    if (!file || !file.buffer) throw new Error("FILE_REQUIRED");

    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { program: true }
    });
    if (!student) throw new Error("STUDENT_NOT_FOUND");

    // Validate target program exists
    const targetProgram = await this.prisma.program.findUnique({
      where: { id: targetProgramId }
    });
    if (!targetProgram) throw new Error("PROGRAM_NOT_FOUND");

    // Strict file validation
    const validated = this.validateImportFile(file);
    const docType = await this.getOrCreateTranscriptDocumentType();
    const storedFileName = this.storage.generateStoredFileName
      ? this.storage.generateStoredFileName(file.originalName, validated.extension)
      : `document_${Date.now()}${validated.extension}`;
    const relativePath = `students/${student.studentNumber}/academic_imports/${storedFileName}`;
    await this.storage.saveFile(relativePath, file.buffer);

    // Save StudentDocument
    const studentDoc = await this.prisma.studentDocument.create({
      data: {
        studentId: student.id,
        documentTypeId: docType.id,
        originalFileName: file.originalName,
        storedFileName,
        filePath: relativePath,
        fileSize: BigInt(file.buffer.length),
        mimeType: validated.mimeType,
        uploadedByUserId: userId,
        uploadedAt: new Date(),
        status: "SUBMITTED"
      }
    });

    const initialExtractedData = previousSchool
      ? sanitizeForPostgres({ previousSchool: String(previousSchool).trim() })
      : null;

    // Create AcademicRecordImportRequest
    const importRequest = await this.prisma.academicRecordImportRequest.create({
      data: {
        studentId: student.id,
        targetProgramId: targetProgram.id,
        documentId: studentDoc.id,
        status: "SUBMITTED",
        extractedData: initialExtractedData
      },
      include: {
        student: {
          include: { program: true }
        },
        targetProgram: true,
        document: true
      }
    });

    return this.formatRequest(importRequest);
  }

  /**
   * List import requests with filters (for Registrar or Student)
   */
  async listRequests({ studentId = null, status = null } = {}) {
    const where = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const rows = await this.prisma.academicRecordImportRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            institutionalEmail: true,
            program: { select: { id: true, code: true, name: true } }
          }
        },
        targetProgram: {
          select: { id: true, code: true, name: true }
        },
        document: {
          select: {
            id: true,
            originalFileName: true,
            mimeType: true,
            fileSize: true,
            uploadedAt: true
          }
        },
        reviewedBy: {
          select: { id: true, displayName: true }
        }
      }
    });

    return rows.map((r) => this.formatRequest(r));
  }

  /**
   * Get single request details
   */
  async getRequest(id) {
    const row = await this.prisma.academicRecordImportRequest.findUnique({
      where: { id },
      include: {
        student: {
          include: { program: true, curriculum: true }
        },
        targetProgram: true,
        document: true,
        reviewedBy: {
          select: { id: true, displayName: true }
        }
      }
    });

    return this.formatRequest(row);
  }

  /**
   * Registrar verifies document validity.
   * Action: "APPROVE" -> APPROVED_FOR_AI
   * Action: "REJECT" -> REJECTED (requires remarks)
   */
  async verifyRequest({ requestId, action, remarks, rejectionReason, reviewerUserId }) {
    const request = await this.getRequest(requestId);
    if (!request) throw new Error("REQUEST_NOT_FOUND");

    const reasonText = (remarks || rejectionReason || "").trim();

    if (action === "REJECT") {
      if (!reasonText) {
        throw new Error("REMARKS_REQUIRED_ON_REJECTION");
      }
      const updated = await this.prisma.academicRecordImportRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectionReason: reasonText,
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date()
        },
        include: {
          student: true,
          targetProgram: true,
          document: true
        }
      });
      return this.formatRequest(updated);
    }

    if (action === "APPROVE") {
      const updated = await this.prisma.academicRecordImportRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED_FOR_AI",
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date()
        },
        include: {
          student: true,
          targetProgram: true,
          document: true
        }
      });

      // Update StudentDocument status as verified
      if (request.documentId) {
        await this.prisma.studentDocument.update({
          where: { id: request.documentId },
          data: {
            status: "VERIFIED",
            verifiedByUserId: reviewerUserId,
            verifiedAt: new Date(),
            remarks: reasonText || "Verified for academic record credit evaluation"
          }
        }).catch(() => { });
      }

      return this.formatRequest(updated);
    }

    throw new Error("INVALID_VERIFICATION_ACTION");
  }

  /**
   * AI Extraction:
   * 1. Text-layer PDF -> Deterministic parser FIRST (built-in zlib text decompressor).
   *    If valid subject records are found, use deterministic results directly.
   * 2. Scanned / Vector PDF (0 text layer records) -> Gemini Multimodal OCR fallback.
   * 3. PNG / JPG / JPEG -> Gemini Multimodal OCR.
   * Do not call Gemini if deterministic parsing already succeeds.
   */
  async extractRecordsFromDocument(documentBuffer, mimeType, originalFileName) {
    const isBinaryPdf = documentBuffer.length >= 4 && documentBuffer.subarray(0, 4).toString("ascii") === "%PDF";
    const isBinaryImage = documentBuffer.length >= 8 && (
      documentBuffer.subarray(0, 4).toString("hex") === "89504e47" || // PNG
      documentBuffer.subarray(0, 2).toString("hex") === "ffd8"        // JPEG
    );

    // 1. Text-layer PDF -> Deterministic parser FIRST
    if (isBinaryPdf) {
      const pdfTextLines = this.extractTextFromPdf(documentBuffer);
      if (pdfTextLines.length > 0) {
        const parsed = this.parseTextLines(pdfTextLines);
        if (parsed.records && parsed.records.length > 0) {
          return sanitizeForPostgres({
            extractionMethod: "DETERMINISTIC",
            detectedProgram: parsed.detectedProgram,
            records: parsed.records
          });
        }
      }
    }

    // 2. Multimodal Gemini API for Scanned/Vector PDFs or Images
    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
    let lastGeminiError = null;

    if (!apiKey) {
      console.warn("[AcademicImportService] Neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured in environment. Multimodal AI OCR fallback is unavailable.");
      lastGeminiError = "GEMINI_API_KEY is not configured in server environment. Please set GEMINI_API_KEY in your .env file to enable AI OCR extraction.";
    } else {
      try {
        const base64Data = documentBuffer.toString("base64");
        const docMime = mimeType || (isBinaryPdf ? "application/pdf" : "image/jpeg");

        const prompt = `You are an expert Registrar AI specializing in analyzing multi-page university academic transcripts, grade sheets, and Certificate of Grades (COG).
Carefully read all pages in this document and extract every single subject/course grade row into strict JSON format.

A document typically contains:
- Header info: Academic Year (e.g., "AY 2023-2024", "2024-2025"), Semester/Term (e.g., "1st Semester", "2nd Semester", "Summer", "Midyear").
- Table Columns:
  * Subject Code (e.g. "EMATH 111", "ECE 101", "GEN ED 1", "CHEM 111", "PE 1", "NSTP 1", "Gen Ed 4", "RS 1")
  * Descriptive Title (e.g. "Calculus 1", "Introduction to ECE", "Understanding the Self", "Mathematics in the Modern World")
  * Units / Credit Units (e.g. 3.0, 4.0, 1.0)
  * Grade / Final Grade / Average (Often in columns named "Average", "Finals", "Grade", "Final Grade", "Rating", or "Equiv", e.g. 1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00, "Passed", "FAILED", "INC", "DRP")
  * Remarks (e.g. "Passed", "Failed", "Incomplete", "Credited")

Instructions:
1. Extract EVERY subject row across ALL semesters and pages.
2. Maintain the corresponding Academic Year and Semester for each subject row. If a table does not repeat the header, carry over the nearest preceding semester/academic year.
3. For the grade, prefer the final Average / Final Grade / Rating column.
4. Clean and normalize subject codes and titles (e.g. uppercase subject codes).
5. Omit summary rows (like "Total Units", "GPA", "GWA", "General Weighted Average").

Return pure JSON matching this exact structure:
{
  "detectedProgram": "string or null",
  "records": [
    {
      "academicYear": "2023-2024",
      "term": "1st Semester",
      "subjectCode": "EMATH 111",
      "subjectTitle": "Calculus 1",
      "units": 4.0,
      "grade": "1.75",
      "remarks": "Passed"
    }
  ]
}
Do not include markdown code fences or backticks. Return strictly the JSON object.`;

        const configuredModel = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
        const candidateModels = [configuredModel];

        for (const model of candidateModels) {
          try {
            console.log(`[AcademicImportService] Attempting AI OCR extraction with Gemini model '${model}' (MIME: ${docMime}, Size: ${documentBuffer.length} bytes)...`);
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inline_data: {
                          mime_type: docMime,
                          data: base64Data
                        }
                      }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.1,
                  responseMimeType: "application/json"
                }
              })
            });

            if (!response.ok) {
              const errBody = await response.json().catch(() => null);
              const errMsg = errBody?.error?.message || errBody?.error?.code || response.statusText;
              console.warn(`[AcademicImportService] Gemini model '${model}' failed with HTTP ${response.status}: ${errMsg}`);
              lastGeminiError = `Gemini model ${model} (HTTP ${response.status}): ${errMsg}`;
              continue; // Fallback to next model
            }

            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
              console.warn(`[AcademicImportService] Gemini model '${model}' returned empty candidate text.`);
              lastGeminiError = `Gemini model ${model} returned empty response`;
              continue;
            }

            const cleanText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
            let parsed;
            try {
              parsed = JSON.parse(cleanText);
            } catch (jsonErr) {
              console.warn(`[AcademicImportService] Failed to parse JSON from Gemini model '${model}':`, jsonErr.message);
              lastGeminiError = `Invalid JSON from Gemini model ${model}: ${jsonErr.message}`;
              continue;
            }

            if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
              const validRecords = parsed.records
                .filter((r) => r && r.subjectCode && r.subjectTitle)
                .map((r) => ({
                  academicYear: String(r.academicYear || "2024-2025").trim(),
                  term: String(r.term || "1st Semester").trim(),
                  subjectCode: String(r.subjectCode).trim().toUpperCase(),
                  subjectTitle: String(r.subjectTitle).trim(),
                  units: Number(r.units) || 3.0,
                  grade: String(r.grade || "Passed").trim(),
                  remarks: r.remarks ? String(r.remarks).trim() : null
                }));

              if (validRecords.length > 0) {
                console.log(`[AcademicImportService] Gemini model '${model}' successfully extracted ${validRecords.length} academic record(s).`);
                return sanitizeForPostgres({
                  extractionMethod: "GEMINI",
                  detectedProgram: parsed.detectedProgram || null,
                  records: validRecords
                });
              }
            }

            console.warn(`[AcademicImportService] Gemini model '${model}' parsed JSON but found 0 valid records.`);
            lastGeminiError = `Gemini model ${model} found 0 academic records in document`;
          } catch (modelErr) {
            console.warn(`[AcademicImportService] Gemini model '${model}' network/runtime error:`, modelErr.message);
            lastGeminiError = `Gemini model ${model} error: ${modelErr.message}`;
          }
        }
      } catch (err) {
        console.warn("[AcademicImportService] Gemini Multimodal pipeline encountered an error:", err.message);
        lastGeminiError = err.message;
      }
    }

    if (isBinaryPdf || isBinaryImage) {
      const errorMsg = lastGeminiError
        ? `No academic records could be extracted. ${lastGeminiError}.`
        : "No academic records could be extracted. AI/OCR processing failed or the document is unreadable.";
      return sanitizeForPostgres({
        extractionMethod: "GEMINI",
        detectedProgram: null,
        records: [],
        error: errorMsg
      });
    }

    // 3. Fallback parser for plain text / CSV / JSON structured documents (e.g. test payloads)
    const fallback = this.fallbackParseDocument(documentBuffer, originalFileName);
    return sanitizeForPostgres({
      extractionMethod: "DETERMINISTIC",
      ...fallback
    });
  }

  /**
   * Extracts text streams from text-layer PDF documents using built-in zlib decompression.
   */
  extractTextFromPdf(buffer) {
    const str = buffer.toString("latin1");
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    const extractedLines = [];

    const cleanPdfString = (s) =>
      s
        .replace(/\\\\/g, "\\")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\b/g, "\b")
        .replace(/\\f/g, "\f")
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));

    while ((match = streamRegex.exec(str)) !== null) {
      const rawStream = Buffer.from(match[1], "latin1");
      let decompressed;
      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch {
          try {
            decompressed = zlib.unzipSync(rawStream);
          } catch {
            decompressed = rawStream;
          }
        }
      }

      const text = decompressed.toString("latin1");
      const btRegex = /BT([\s\S]*?)ET/g;
      let btMatch;
      while ((btMatch = btRegex.exec(text)) !== null) {
        const block = btMatch[1];
        const opRegex = /(?:\((.*?)\)\s*(?:Tj|'|")|\[([\s\S]*?)\]\s*TJ|T\*|(?:\d+(?:\.\d+)?\s+){2}Td)/g;
        let opMatch;
        let currentLine = "";
        while ((opMatch = opRegex.exec(block)) !== null) {
          const matchStr = opMatch[0];
          if (opMatch[1] !== undefined) {
            currentLine += cleanPdfString(opMatch[1]) + " ";
            if (matchStr.includes("'") || matchStr.includes('"')) {
              const clean = currentLine.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").trim();
              if (clean.length > 1) extractedLines.push(clean);
              currentLine = "";
            }
          } else if (opMatch[2] !== undefined) {
            const arrayContent = opMatch[2];
            const itemRegex = /\((.*?)\)/g;
            let itemMatch;
            while ((itemMatch = itemRegex.exec(arrayContent)) !== null) {
              currentLine += cleanPdfString(itemMatch[1]);
            }
            currentLine += " ";
          } else if (matchStr.includes("T*") || matchStr.includes("Td")) {
            const clean = currentLine.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").trim();
            if (clean.length > 1) {
              extractedLines.push(clean);
              currentLine = "";
            }
          }
        }
        const clean = currentLine.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").trim();
        if (clean.length > 1) {
          extractedLines.push(clean);
        }
      }
    }

    return extractedLines;
  }

  /**
   * Parses text lines into structured academic records with rigorous validation.
   */
  parseTextLines(lines) {
    const records = [];
    let currentAY = "2024-2025";
    let currentTerm = "1st Semester";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

      // Check for AY / Term headers
      const ayMatch = trimmed.match(/(?:AY|Academic Year|A\.Y\.)\s*[:]?\s*(\d{4}[-\s/]\d{4})/i);
      if (ayMatch) currentAY = ayMatch[1].replace("/", "-").trim();

      const termMatch = trimmed.match(/(1st|2nd|First|Second|Summer|Midyear)\s*(?:Semester|Sem|Term)?/i);
      if (termMatch) currentTerm = termMatch[0].trim();

      // Common CSV/Tabular pattern: [Code] [Title] [Units] [Grade]
      const csvParts = trimmed.split(/[,;\t|]+/);
      if (csvParts.length >= 4) {
        const code = csvParts[0].trim();
        const title = csvParts[1].trim();
        const units = parseFloat(csvParts[2].trim());
        const grade = csvParts[3].trim();
        const remarks = csvParts[4] ? csvParts[4].trim() : null;

        if (this.isValidSubjectRecord(code, title, units, grade)) {
          records.push({
            academicYear: currentAY,
            term: currentTerm,
            subjectCode: code,
            subjectTitle: title,
            units: Number(units) || 3.0,
            grade,
            remarks
          });
          continue;
        }
      }

      // Regex matching for space-delimited subject line
      const lineMatch = trimmed.match(/^([A-Z0-9\s.-]{2,15})\s{2,}(.+?)\s+(\d(?:\.\d+)?)\s+([0-9.]+|PASSED|FAILED|INC)(?:\s+(.*))?$/i) ||
        trimmed.match(/^([A-Z]{2,6}\s*\d{1,4}[A-Z]?)\s+(.+?)\s+(\d(?:\.\d+)?)\s+([0-9.]+|PASSED|FAILED|INC)(?:\s+(.*))?$/i);

      if (lineMatch) {
        const code = lineMatch[1].trim();
        const title = lineMatch[2].trim();
        const units = parseFloat(lineMatch[3]);
        const grade = lineMatch[4].trim();
        const remarks = lineMatch[5] ? lineMatch[5].trim() : null;

        if (this.isValidSubjectRecord(code, title, units, grade)) {
          records.push({
            academicYear: currentAY,
            term: currentTerm,
            subjectCode: code,
            subjectTitle: title,
            units: Number(units) || 3.0,
            grade,
            remarks
          });
        }
      }
    }

    return {
      detectedProgram: null,
      records
    };
  }

  /**
   * Validates that extracted fields conform to realistic academic subject codes and titles,
   * completely filtering out binary corruptions or random string matches.
   */
  isValidSubjectRecord(code, title, units, grade) {
    if (!code || !title || isNaN(units)) return false;
    // Reject binary replacement characters and control characters
    if (code.includes("\ufffd") || title.includes("\ufffd") || String(grade).includes("\ufffd")) return false;
    if (/[\x00-\x1f\x7f-\x9f]/.test(code) || /[\x00-\x1f\x7f-\x9f]/.test(title)) return false;

    // Subject code must be alphanumeric with standard punctuation (2 to 20 chars)
    if (!/^[A-Za-z0-9\s.-]{2,20}$/.test(code)) return false;

    // Title must be reasonable text length (2 to 120 chars)
    if (title.length < 2 || title.length > 120) return false;

    // Units must be reasonable academic units (0 to 15)
    if (units < 0 || units > 15) return false;

    // Grade must be a valid grade string
    if (!/^([0-5](?:\.\d{1,2})?|[0-9]{2,3}(?:\.\d{1,2})?|PASSED|FAILED|INC|DRP|INCOMPLETE|WITHDRAWN|IP)$/i.test(String(grade).trim())) {
      return false;
    }

    return true;
  }

  /**
   * Fallback parser for plain text / CSV / JSON structured representations.
   */
  fallbackParseDocument(buffer, originalFileName) {
    const rawText = buffer.toString("utf-8");
    const text = rawText.replace(/\0/g, "").replace(/[\uD800-\uDFFF]/g, "");

    // Attempt JSON parse in case the buffer is structured JSON/text
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.records)) return sanitizeForPostgres(parsed);
      if (Array.isArray(parsed)) return sanitizeForPostgres({ detectedProgram: null, records: parsed });
    } catch {
      // Continue to line-by-line parsing
    }

    const lines = text.split(/\r?\n/);
    const parsed = this.parseTextLines(lines);
    return sanitizeForPostgres(parsed);
  }

  /**
   * Matches extracted records against target program's subjects and checks for student conflicts.
   * Matches ONLY against the selected target Program's curriculum.
   */
  async matchExtractedRecords({ targetProgramId, studentId, extractedRecords }) {
    // 1. Fetch all subjects belonging strictly to target program's curriculums
    const curriculums = await this.prisma.curriculum.findMany({
      where: { programId: targetProgramId },
      include: {
        subjects: {
          include: { subject: true }
        }
      }
    });

    const catalogSubjectsMap = new Map();
    for (const cur of curriculums) {
      for (const cs of cur.subjects || []) {
        if (cs.subject && cs.subject.status !== "INACTIVE") {
          catalogSubjectsMap.set(cs.subject.id, cs.subject);
        }
      }
    }

    const catalogSubjects = Array.from(catalogSubjectsMap.values());
    const curriculumWarning = catalogSubjects.length === 0
      ? "Target program has no active curriculum catalog. Matching stopped."
      : null;

    // 2. Fetch student's existing grade history for conflict detection
    const studentHistory = await this.prisma.enrollmentItem.findMany({
      where: {
        enrollment: { studentId }
      },
      include: {
        courseOffering: {
          include: {
            subject: true,
            academicTerm: {
              include: { academicYear: true }
            }
          }
        },
        grades: {
          where: { status: { in: ["APPROVED", "POSTED"] } },
          include: { gradingPeriod: true }
        }
      }
    });

    const existingGradeBySubjectId = new Map();
    const existingGradeByNormCode = new Map();

    for (const item of studentHistory) {
      const subject = item.courseOffering?.subject;
      if (!subject) continue;
      const latestGrade = item.grades?.[0];
      if (latestGrade) {
        const gradeSummary = {
          gradeId: latestGrade.id,
          numericGrade: latestGrade.numericGrade ? Number(latestGrade.numericGrade) : null,
          letterGrade: latestGrade.letterGrade,
          status: latestGrade.status,
          termCode: item.courseOffering.academicTerm?.code,
          termName: item.courseOffering.academicTerm?.name
        };
        existingGradeBySubjectId.set(subject.id, gradeSummary);
        existingGradeByNormCode.set(normalizeString(subject.code), gradeSummary);
      }
    }

    // 3. Match each extracted record
    const matchedRecords = extractedRecords.map((record, index) => {
      const normExtractedCode = normalizeString(record.subjectCode);
      const recordUnits = typeof record.units === "number" ? record.units : parseFloat(record.units) || 3.0;

      let bestMatch = null;
      let highestScore = 0;
      let matchType = "NO_MATCH";

      if (catalogSubjects.length > 0) {
        for (const subject of catalogSubjects) {
          const normCatCode = normalizeString(subject.code);
          const codeExact = normExtractedCode === normCatCode;
          const titleSim = calculateTitleSimilarity(record.subjectTitle, subject.title);
          const subjectUnits = Number(subject.defaultCreditUnits ?? subject.creditUnits ?? 3.0);
          const unitsMatch = Math.abs(subjectUnits - recordUnits) < 0.1;

          if (codeExact) {
            bestMatch = subject;
            matchType = unitsMatch ? "HIGH_MATCH" : "NEEDS_REVIEW";
            highestScore = 1.0;
            break;
          } else if (titleSim >= 0.85) {
            if (titleSim > highestScore) {
              highestScore = titleSim;
              bestMatch = subject;
              matchType = unitsMatch ? "HIGH_MATCH" : "NEEDS_REVIEW";
            }
          } else if (titleSim >= 0.50 && highestScore < 0.85) {
            if (titleSim > highestScore) {
              highestScore = titleSim;
              bestMatch = subject;
              matchType = "NEEDS_REVIEW";
            }
          }
        }
      }

      // Check conflict
      let conflict = null;
      if (bestMatch) {
        const existing = existingGradeBySubjectId.get(bestMatch.id) || existingGradeByNormCode.get(normExtractedCode);
        if (existing) {
          conflict = {
            hasConflict: true,
            existingGrade: existing.numericGrade ?? existing.letterGrade,
            uploadedGrade: record.grade,
            termName: existing.termName,
            defaultResolution: "KEEP_EXISTING"
          };
          matchType = "CONFLICT";
        }
      }

      return {
        recordIndex: index,
        academicYear: record.academicYear,
        term: record.term,
        extractedCode: record.subjectCode,
        extractedTitle: record.subjectTitle,
        extractedUnits: recordUnits,
        extractedGrade: record.grade,
        extractedRemarks: record.remarks,
        matchedSubjectId: bestMatch ? bestMatch.id : null,
        matchedSubjectCode: bestMatch ? bestMatch.code : null,
        matchedSubjectTitle: bestMatch ? bestMatch.title : null,
        matchedSubjectUnits: bestMatch ? Number(bestMatch.defaultCreditUnits ?? bestMatch.creditUnits ?? 3.0) : null,
        matchScore: highestScore,
        matchStatus: matchType,
        conflict
      };
    });

    return {
      matchedRecords,
      curriculumWarning
    };
  }

  /**
   * Trigger AI Processing on an APPROVED request.
   * First AI run requires APPROVED_FOR_AI status (verified by Registrar).
   * Re-runs are supported from UNDER_REVIEW, AI_PROCESSING, or APPROVED_FOR_AI.
   */
  async processAI(requestId) {
    const request = await this.getRequest(requestId);
    if (!request) throw new Error("REQUEST_NOT_FOUND");

    if (request.status === "SUBMITTED") {
      throw new Error("FIRST_RUN_REQUIRES_REGISTRAR_APPROVAL");
    }

    const allowedStatuses = ["APPROVED_FOR_AI", "AI_PROCESSING", "UNDER_REVIEW"];
    if (!allowedStatuses.includes(request.status)) {
      throw new Error(`CANNOT_PROCESS_AI_IN_STATUS_${request.status}`);
    }

    const previousStatus = request.status;

    // Set status to AI_PROCESSING
    await this.prisma.academicRecordImportRequest.update({
      where: { id: requestId },
      data: { status: "AI_PROCESSING" }
    });

    try {
      // Read document buffer
      const docBuffer = await this.storage.readFile(request.document.filePath);
      const extraction = await this.extractRecordsFromDocument(
        docBuffer,
        request.document.mimeType,
        request.document.originalFileName
      );

      // Preserve existing previousSchool from request
      extraction.previousSchool = request.previousSchool || request.extractedData?.previousSchool || extraction.previousSchool || null;

      const records = extraction.records || [];
      if (records.length === 0) {
        const failureReason = extraction.error || "No academic records could be extracted. AI/OCR processing failed or the document is unreadable.";
        console.warn(`[AcademicImportService] Extraction returned 0 records for request ${requestId}: ${failureReason}`);

        // Update request with extracted error state and revert status to retryable state
        const revertStatus = previousStatus === "UNDER_REVIEW" ? "UNDER_REVIEW" : "APPROVED_FOR_AI";
        await this.prisma.academicRecordImportRequest.update({
          where: { id: requestId },
          data: {
            status: revertStatus,
            extractedData: sanitizeForPostgres(extraction)
          }
        });

        throw new Error(failureReason);
      }

      const matchResult = await this.matchExtractedRecords({
        targetProgramId: request.targetProgramId,
        studentId: request.studentId,
        extractedRecords: records
      });

      const matchedRecords = matchResult.matchedRecords || [];
      const sanitizedExtraction = sanitizeForPostgres(extraction);
      const sanitizedMatchedData = sanitizeForPostgres({
        detectedProgram: extraction.detectedProgram,
        records: matchedRecords,
        curriculumWarning: matchResult.curriculumWarning
      });

      // Update request with extracted and matched data, status: UNDER_REVIEW
      const updated = await this.prisma.academicRecordImportRequest.update({
        where: { id: requestId },
        data: {
          status: "UNDER_REVIEW",
          extractedData: sanitizedExtraction,
          matchedData: sanitizedMatchedData
        },
        include: {
          student: { include: { program: true } },
          targetProgram: true,
          document: true
        }
      });

      return this.formatRequest(updated);
    } catch (err) {
      console.error("[AcademicImportService] AI Processing error:", err.message);
      // Revert status to retryable state
      const revertStatus = previousStatus === "UNDER_REVIEW" ? "UNDER_REVIEW" : "APPROVED_FOR_AI";
      await this.prisma.academicRecordImportRequest.update({
        where: { id: requestId },
        data: { status: revertStatus }
      });
      throw err;
    }
  }

  /**
   * Generates full preview for Registrar review
   */
  async getPreview(requestId) {
    const request = await this.getRequest(requestId);
    if (!request) throw new Error("REQUEST_NOT_FOUND");

    const matchedRecords = request.matchedData?.records || [];
    const totalDetected = matchedRecords.length;
    const highMatches = matchedRecords.filter((r) => r.matchStatus === "HIGH_MATCH").length;
    const needsReview = matchedRecords.filter((r) => r.matchStatus === "NEEDS_REVIEW").length;
    const unmatched = matchedRecords.filter((r) => r.matchStatus === "NO_MATCH").length;
    const conflicts = matchedRecords.filter((r) => r.conflict?.hasConflict || r.matchStatus === "CONFLICT").length;

    const isProgramMismatch = request.student.programId !== request.targetProgramId;
    const isImported = request.status === "IMPORTED";
    const isRejected = request.status === "REJECTED";

    return {
      requestId: request.id,
      status: request.status,
      isImported,
      isRejected,
      extractionMethod: request.extractedData?.extractionMethod || "DETERMINISTIC",
      extractionError: request.extractedData?.error || null,
      student: {
        id: request.student.id,
        studentNumber: request.student.studentNumber,
        name: `${request.student.firstName} ${request.student.lastName}`,
        currentProgramId: request.student.programId,
        currentProgramCode: request.student.program?.code || "N/A",
        currentProgramName: request.student.program?.name || "Unassigned"
      },
      targetProgram: {
        id: request.targetProgram.id,
        code: request.targetProgram.code,
        name: request.targetProgram.name
      },
      document: {
        id: request.document.id,
        fileName: request.document.originalFileName,
        mimeType: request.document.mimeType,
        uploadedAt: request.document.uploadedAt
      },
      isProgramMismatch,
      programMismatchWarning: isProgramMismatch
        ? `Selected program (${request.targetProgram.code}) differs from student's current registered program (${request.student.program?.code || "None"}).`
        : null,
      curriculumWarning: request.matchedData?.curriculumWarning || null,
      summary: {
        totalDetected,
        highMatches,
        needsReview,
        unmatched,
        conflicts
      },
      metrics: {
        totalExtracted: totalDetected,
        highMatch: highMatches,
        needsReview,
        conflictCount: conflicts,
        unmatched
      },
      records: matchedRecords,
      items: matchedRecords.map((r) => ({
        ...r,
        id: r.recordIndex,
        sourceSubjectCode: r.extractedCode,
        sourceSubjectTitle: r.extractedTitle,
        sourceUnits: r.extractedUnits,
        sourceGrade: r.extractedGrade,
        status: r.matchStatus,
        confidenceScore: r.matchScore,
        hasConflict: Boolean(r.conflict?.hasConflict),
        existingGrade: r.conflict?.existingGrade || null,
        matchedSubject: r.matchedSubjectCode
          ? {
            id: r.matchedSubjectId,
            code: r.matchedSubjectCode,
            title: r.matchedSubjectTitle,
            units: r.matchedSubjectUnits
          }
          : null
      })),
      registrarOverrides: request.registrarOverrides || {}
    };
  }

  /**
   * Resolves or creates historical AcademicYear, AcademicTerm, and GradingPeriod.
   */
  async getOrCreateHistoricalTerm(tx, academicYearStr, termStr) {
    const rawAY = String(academicYearStr || "").trim();
    const ayMatch = rawAY.match(/(\d{4})[-\s/](\d{4})/);
    const startYear = ayMatch ? parseInt(ayMatch[1], 10) : 2024;
    const endYear = ayMatch ? parseInt(ayMatch[2], 10) : startYear + 1;
    const ayCode = `${startYear}-${endYear}`;

    let ay = await tx.academicYear.findFirst({
      where: { code: ayCode }
    });

    if (!ay) {
      ay = await tx.academicYear.create({
        data: {
          code: ayCode,
          name: `Academic Year ${ayCode}`,
          startsOn: new Date(`${startYear}-08-01`),
          endsOn: new Date(`${endYear}-05-31`),
          status: "CLOSED"
        }
      });
    }

    const rawTerm = String(termStr || "").toLowerCase();
    let termNumber = 1;
    let termSuffix = "1S";
    let termName = `1st Semester ${ayCode}`;
    let termStart = new Date(`${startYear}-08-01`);
    let termEnd = new Date(`${startYear}-12-31`);

    if (rawTerm.includes("2nd") || rawTerm.includes("second")) {
      termNumber = 2;
      termSuffix = "2S";
      termName = `2nd Semester ${ayCode}`;
      termStart = new Date(`${endYear}-01-10`);
      termEnd = new Date(`${endYear}-05-31`);
    } else if (rawTerm.includes("summer") || rawTerm.includes("midyear")) {
      termNumber = 3;
      termSuffix = "SUM";
      termName = `Summer ${ayCode}`;
      termStart = new Date(`${endYear}-06-01`);
      termEnd = new Date(`${endYear}-07-31`);
    }

    const termCode = `${startYear}-${termSuffix}`;
    let term = await tx.academicTerm.findFirst({
      where: {
        academicYearId: ay.id,
        termNumber
      }
    });

    if (!term) {
      term = await tx.academicTerm.create({
        data: {
          academicYearId: ay.id,
          code: termCode,
          name: termName,
          termNumber,
          startsOn: termStart,
          endsOn: termEnd,
          status: "CLOSED"
        }
      });
    }

    // Ensure final grading period exists
    let finalGp = await tx.gradingPeriod.findFirst({
      where: {
        academicTermId: term.id,
        type: "FINAL"
      }
    });

    if (!finalGp) {
      finalGp = await tx.gradingPeriod.create({
        data: {
          academicTermId: term.id,
          code: "FINAL",
          name: `Final Grading Period - ${term.name}`,
          type: "FINAL",
          sequence: 4,
          isFinal: true
        }
      });
    }

    return { academicYear: ay, academicTerm: term, gradingPeriod: finalGp };
  }

  /**
   * Final Transactional Import Commit.
   * Commits approved records into student's academic history safely using DB transaction.
   * Preserves historical academic years + semesters and leaves official program / active enrollments intact.
   */
  async commitImport({ requestId, resolutions = [], reviewerUserId }) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.academicRecordImportRequest.findUnique({
        where: { id: requestId },
        include: {
          student: true,
          targetProgram: true,
          document: true
        }
      });

      if (!request) throw new Error("REQUEST_NOT_FOUND");
      if (request.status === "IMPORTED") {
        throw new Error("ALREADY_IMPORTED");
      }
      if (request.status !== "UNDER_REVIEW" && request.status !== "APPROVED_FOR_AI") {
        throw new Error(`CANNOT_COMMIT_IN_STATUS_${request.status}`);
      }

      const matchedRecords = request.matchedData?.records || [];
      const resolutionMap = new Map();
      for (const res of resolutions) {
        resolutionMap.set(res.recordIndex, res);
      }

      const importBatchId = crypto.randomUUID();
      const importedSubjects = [];
      const skippedSubjects = [];

      for (let i = 0; i < matchedRecords.length; i++) {
        const record = matchedRecords[i];
        const res = resolutionMap.get(i) || {
          action: record.matchStatus === "NO_MATCH" ? "SKIP" : "USE_UPLOADED",
          resolutionAction: record.matchStatus === "NO_MATCH" ? "SKIP" : "USE_UPLOADED",
          selectedSubjectId: record.matchedSubjectId
        };

        const resolvedAction = res.resolutionAction || res.conflictResolution || res.action;

        // Skip if requested or kept existing
        if (resolvedAction === "SKIP" || resolvedAction === "KEEP_EXISTING") {
          skippedSubjects.push({
            subjectCode: record.extractedCode,
            reason: resolvedAction === "KEEP_EXISTING" ? "Kept existing grade" : "Skipped by Registrar"
          });
          continue;
        }

        const subjectIdToImport = res.selectedSubjectId || record.matchedSubjectId;
        if (!subjectIdToImport) {
          skippedSubjects.push({ subjectCode: record.extractedCode, reason: "No subject mapping" });
          continue;
        }

        // Verify subject exists
        const subject = await tx.subject.findUnique({ where: { id: subjectIdToImport } });
        if (!subject) {
          skippedSubjects.push({ subjectCode: record.extractedCode, reason: "Subject not found in catalog" });
          continue;
        }

        // Resolve historical term and grading period for this record's extracted AY + Term
        const { academicTerm, gradingPeriod } = await this.getOrCreateHistoricalTerm(
          tx,
          record.academicYear,
          record.term
        );

        // Ensure a historical completed enrollment exists for the student in this historical term
        let enrollment = await tx.enrollment.findFirst({
          where: {
            studentId: request.studentId,
            academicTermId: academicTerm.id
          }
        });

        if (!enrollment) {
          const enrollmentProgramId = request.student.programId || request.targetProgramId;
          let enrollmentCurriculumId = request.student.curriculumId;
          if (!enrollmentCurriculumId) {
            const fallbackCurriculum = await tx.curriculum.findFirst({
              where: { programId: enrollmentProgramId },
              orderBy: { createdAt: "desc" }
            });
            enrollmentCurriculumId = fallbackCurriculum?.id;
          }

          enrollment = await tx.enrollment.create({
            data: {
              studentId: request.studentId,
              academicTermId: academicTerm.id,
              programId: enrollmentProgramId,
              curriculumId: enrollmentCurriculumId,
              yearLevel: request.student.currentYearLevel || 1,
              status: "COMPLETED",
              enrolledAt: new Date()
            }
          });
        }

        // Ensure course offering exists for this subject in the historical term
        let offering = await tx.courseOffering.findFirst({
          where: {
            academicTermId: academicTerm.id,
            subjectId: subject.id
          }
        });

        if (!offering) {
          offering = await tx.courseOffering.create({
            data: {
              academicTermId: academicTerm.id,
              subjectId: subject.id,
              offeringCode: `CRED-${subject.code}-${academicTerm.code}`,
              creditUnits: subject.defaultCreditUnits ?? 3.0,
              status: "COMPLETED"
            }
          });
        }

        // Create or find EnrollmentItem with registrar override approval
        let item = await tx.enrollmentItem.findFirst({
          where: {
            enrollmentId: enrollment.id,
            courseOfferingId: offering.id
          }
        });

        if (!item) {
          item = await tx.enrollmentItem.create({
            data: {
              enrollmentId: enrollment.id,
              courseOfferingId: offering.id,
              status: "COMPLETED",
              overrideApprovedByUserId: reviewerUserId,
              overrideReason: `Imported via Credit Evaluation (${request.targetProgram.code})`
            }
          });
        }

        // Parse grade value
        const rawGrade = String(record.extractedGrade).trim();
        const parsedNum = parseFloat(rawGrade);
        const numericGrade = !isNaN(parsedNum) ? parsedNum : null;
        const letterGrade = isNaN(parsedNum) ? rawGrade : null;
        const isPassing = isPassingGrade({ numericGrade, letterGrade });

        // Upsert Grade
        const existingGrade = await tx.grade.findUnique({
          where: {
            enrollmentItemId_gradingPeriodId: {
              enrollmentItemId: item.id,
              gradingPeriodId: gradingPeriod.id
            }
          }
        });

        if (existingGrade) {
          await tx.grade.update({
            where: { id: existingGrade.id },
            data: {
              numericGrade,
              letterGrade,
              isPassing,
              remarks: `Imported via Credit Evaluation (${request.targetProgram.code})`,
              status: "POSTED",
              approvedByUserId: reviewerUserId,
              approvedAt: new Date()
            }
          });
        } else {
          await tx.grade.create({
            data: {
              enrollmentItemId: item.id,
              gradingPeriodId: gradingPeriod.id,
              numericGrade,
              letterGrade,
              isPassing,
              remarks: `Imported via Credit Evaluation (${request.targetProgram.code})`,
              status: "POSTED",
              approvedByUserId: reviewerUserId,
              approvedAt: new Date()
            }
          });
        }

        importedSubjects.push({
          subjectCode: subject.code,
          subjectTitle: subject.title,
          units: Number(subject.defaultCreditUnits ?? subject.creditUnits ?? 3.0),
          grade: rawGrade,
          term: academicTerm.name
        });
      }

      // Update request status to IMPORTED
      const updatedRequest = await tx.academicRecordImportRequest.update({
        where: { id: requestId },
        data: {
          status: "IMPORTED",
          importedAt: new Date(),
          importBatchId,
          reviewedByUserId: reviewerUserId,
          registrarOverrides: resolutions
        },
        include: {
          student: {
            select: {
              id: true,
              userId: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              institutionalEmail: true,
              program: { select: { id: true, code: true, name: true } }
            }
          },
          targetProgram: {
            select: { id: true, code: true, name: true }
          },
          document: {
            select: {
              id: true,
              originalFileName: true,
              mimeType: true,
              fileSize: true,
              uploadedAt: true
            }
          },
          reviewedBy: {
            select: { id: true, displayName: true }
          }
        }
      });

      // Write SystemLog entry for audit trail
      await tx.systemLog.create({
        data: {
          severity: "INFO",
          category: "ACADEMIC_IMPORT",
          module: "REGISTRAR_CREDITING",
          userId: reviewerUserId,
          message: `Academic record import committed for student ${request.student.studentNumber}`,
          technicalDetail: JSON.stringify({
            importBatchId,
            requestId: request.id,
            studentId: request.studentId,
            targetProgramId: request.targetProgramId,
            importedCount: importedSubjects.length,
            skippedCount: skippedSubjects.length,
            importedSubjects,
            skippedSubjects
          }),
          status: "CLOSED"
        }
      }).catch(() => { });

      return {
        request: this.formatRequest(updatedRequest),
        targetUserId: request.student?.userId || null,
        studentId: request.studentId,
        importBatchId,
        importedCount: importedSubjects.length,
        skippedCount: skippedSubjects.length,
        importedSubjects,
        skippedSubjects
      };
    });
  }
}
