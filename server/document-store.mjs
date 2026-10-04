import { newId } from "./security.mjs";

const dateTime = (value) => value instanceof Date ? value.toISOString() : null;
const documentResponse = (document) => document ? {
  ...document,
  fileSize: typeof document.fileSize === "bigint" ? Number(document.fileSize) : document.fileSize
} : document;

export class DocumentStore {
  constructor(prisma, storageService) {
    this.prisma = prisma;
    this.storage = storageService;
  }

  async listDocumentTypes() {
    return this.prisma.documentType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        required: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async getDocumentType(id) {
    return this.prisma.documentType.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        required: true,
        active: true,
        sortOrder: true
      }
    });
  }

  async createDocumentType(data) {
    return this.prisma.documentType.create({
      data: {
        name: data.name,
        description: data.description || null,
        required: data.required ?? true,
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0
      }
    });
  }

  async updateDocumentType(id, data) {
    return this.prisma.documentType.update({
      where: { id },
      data
    });
  }

  async getStudentApplication(userId) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, studentNumber: true }
    });
    if (!student) return null;

    const application = await this.prisma.admissionApplication.findFirst({
      where: {
        OR: [
          { convertedStudentId: student.id },
          { applicantUserId: userId }
        ]
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, applicationNumber: true, status: true }
    });

    return { student, application };
  }

  async getStudentApplicationById(userId, applicationId) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, studentNumber: true }
    });
    if (!student) return null;

    const application = await this.prisma.admissionApplication.findFirst({
      where: {
        id: applicationId,
        OR: [
          { convertedStudentId: student.id },
          { applicantUserId: userId }
        ]
      },
      select: { id: true, applicationNumber: true, status: true }
    });

    return { student, application };
  }

  async getRequiredDocumentTypes() {
    return this.prisma.documentType.findMany({
      where: { active: true, required: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true, required: true }
    });
  }

  async getStudentDocuments(studentId, applicationId = null) {
    const where = { studentId };
    if (applicationId) where.admissionApplicationId = applicationId;

    const documents = await this.prisma.studentDocument.findMany({
      where,
      orderBy: [{ documentType: { sortOrder: "asc" } }, { uploadedAt: "desc" }],
      select: {
        id: true,
        documentTypeId: true,
        documentType: { select: { id: true, name: true, required: true } },
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
        uploadedAt: true,
        status: true,
        verifiedAt: true,
        remarks: true,
        admissionApplicationId: true,
        admissionApplication: { select: { applicationNumber: true, status: true } }
      }
    });
    return documents.map(documentResponse);
  }

  async getDocumentById(id) {
    return this.prisma.studentDocument.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        admissionApplicationId: true,
        documentTypeId: true,
        documentType: { select: { id: true, name: true, required: true } },
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
        uploadedByUserId: true,
        uploadedAt: true,
        status: true,
        verifiedByUserId: true,
        verifiedAt: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { studentNumber: true, userId: true } },
        admissionApplication: { select: { applicationNumber: true, status: true } }
      }
    });
  }

  async canDeleteDocument(document, userId) {
    if (document.uploadedByUserId !== userId) return false;
    if (document.status !== "PENDING" && document.status !== "RETURNED_FOR_CORRECTION") return false;
    if (document.admissionApplicationId) {
      const app = await this.prisma.admissionApplication.findUnique({
        where: { id: document.admissionApplicationId },
        select: { status: true }
      });
      if (app && !["DRAFT", "PENDING", "RETURNED_FOR_CORRECTION"].includes(app.status)) {
        return false;
      }
    }
    return true;
  }

  async uploadDocument(data) {
    const { studentId, applicationId, documentTypeId, originalFileName, storedFileName, filePath, fileSize, mimeType, uploadedByUserId } = data;

    const document = await this.prisma.$transaction(async (tx) => {
      if (applicationId) {
        const app = await tx.admissionApplication.findUnique({
          where: { id: applicationId },
          select: { status: true }
        });
        if (app && !["DRAFT", "RETURNED_FOR_CORRECTION"].includes(app.status)) {
          throw new Error("APPLICATION_LOCKED");
        }
      }

      const existing = await tx.studentDocument.findUnique({
        where: {
          admissionApplicationId_documentTypeId: {
            admissionApplicationId: applicationId,
            documentTypeId
          }
        }
      });

      if (existing?.status === "VERIFIED") {
        throw new Error("DOCUMENT_VERIFIED_LOCKED");
      }

      if (existing) {
        await this.storage.deleteFile(existing.filePath);
        await tx.documentVerificationHistory.deleteMany({ where: { documentId: existing.id } });
        await tx.studentDocument.delete({ where: { id: existing.id } });
      }

      const document = await tx.studentDocument.create({
        data: {
          studentId,
          admissionApplicationId: applicationId,
          documentTypeId,
          originalFileName,
          storedFileName,
          filePath,
          fileSize: BigInt(fileSize),
          mimeType,
          uploadedByUserId,
          uploadedAt: new Date(),
          status: "SUBMITTED"
        },
        select: {
          id: true,
          studentId: true,
          admissionApplicationId: true,
          documentTypeId: true,
          originalFileName: true,
          storedFileName: true,
          filePath: true,
          fileSize: true,
          mimeType: true,
          uploadedByUserId: true,
          uploadedAt: true,
          status: true,
          verifiedByUserId: true,
          verifiedAt: true,
          remarks: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await tx.documentVerificationHistory.create({
        data: {
          documentId: document.id,
          previousStatus: null,
          newStatus: "SUBMITTED",
          action: "UPLOAD",
          performedByUserId: uploadedByUserId
        }
      });

      return document;
    });
    return documentResponse(document);
  }

  async deleteDocument(id, userId) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.studentDocument.findUnique({
        where: { id },
        select: {
          id: true,
          filePath: true,
          uploadedByUserId: true,
          status: true,
          admissionApplicationId: true
        }
      });

      if (!document) throw new Error("DOCUMENT_NOT_FOUND");

      const canDelete = await this.canDeleteDocument(document, userId);
      if (!canDelete) throw new Error("DOCUMENT_CANNOT_BE_DELETED");

      await this.storage.deleteFile(document.filePath);
      await tx.documentVerificationHistory.deleteMany({ where: { documentId: document.id } });
      await tx.studentDocument.delete({ where: { id } });

      return { success: true };
    });
  }

  async updateDocumentStatus(documentId, userId, userRole, status, remarks) {
    const validStatuses = new Set(["VERIFIED", "REJECTED", "RETURNED_FOR_CORRECTION"]);
    if (!validStatuses.has(status)) throw new Error("INVALID_DOCUMENT_STATUS");

    return this.prisma.$transaction(async (tx) => {
      const document = await tx.studentDocument.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          documentTypeId: true,
          documentType: { select: { name: true } },
          status: true,
          admissionApplicationId: true,
          admissionApplication: { select: { status: true } }
        }
      });

      if (!document) throw new Error("DOCUMENT_NOT_FOUND");

      if (!document.admissionApplicationId || !["PENDING", "UNDER_REVIEW"].includes(document.admissionApplication?.status)) {
        throw new Error("APPLICATION_LOCKED");
      }

      const previousStatus = document.status;
      const updated = await tx.studentDocument.update({
        where: { id: documentId },
        data: {
          status,
          remarks: typeof remarks === "string" && remarks.trim() ? remarks.trim() : null,
          verifiedByUserId: userId,
          verifiedAt: new Date()
        },
        select: {
          id: true, status: true, remarks: true, verifiedAt: true, verifiedByUserId: true
        }
      });

      await tx.documentVerificationHistory.create({
        data: {
          documentId,
          previousStatus,
          newStatus: status,
          action: status === "VERIFIED" ? "VERIFY" : status === "REJECTED" ? "REJECT" : "RETURN_FOR_CORRECTION",
          remarks: remarks || null,
          performedByUserId: userId
        }
      });

      await tx.admissionApplicationStatusHistory.create({
        data: {
          applicationId: document.admissionApplicationId,
          fromStatus: document.admissionApplication.status,
          toStatus: document.admissionApplication.status,
          actionType: "VERIFY_DOCUMENT",
          remarks: `${document.documentType.name}: ${status}${updated.remarks ? ` - ${updated.remarks}` : ""}`,
          changedByUserId: userId,
          changedByRole: userRole || null
        }
      });

      return updated;
    });
  }

  async getVerificationHistory(documentId) {
    return this.prisma.documentVerificationHistory.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        previousStatus: true,
        newStatus: true,
        action: true,
        remarks: true,
        performedByUserId: true,
        createdAt: true,
        performedBy: { select: { displayName: true, username: true } }
      }
    });
  }

  async getDocumentsForApplication(applicationId) {
    return this.prisma.studentDocument.findMany({
      where: { admissionApplicationId: applicationId },
      orderBy: [{ documentType: { sortOrder: "asc" } }, { uploadedAt: "desc" }],
      select: {
        id: true,
        documentTypeId: true,
        documentType: { select: { id: true, name: true, required: true } },
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
        uploadedAt: true,
        status: true,
        verifiedAt: true,
        remarks: true,
        verifiedBy: { select: { displayName: true, username: true } }
      }
    });
  }

  async getDocumentForView(documentId) {
    return this.prisma.studentDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        originalFileName: true,
        storedFileName: true,
        filePath: true,
        mimeType: true,
        documentTypeId: true,
        documentType: { select: { name: true } },
        admissionApplicationId: true
      }
    });
  }

  async getApplicationDocumentSummary(applicationId) {
    const requiredTypes = await this.getRequiredDocumentTypes();
    const submittedDocs = await this.getDocumentsForApplication(applicationId);
    const docMap = new Map(submittedDocs.map((d) => [d.documentTypeId, d]));

    return requiredTypes.map((type) => {
      const doc = docMap.get(type.id);
      return doc ? {
        id: doc.id,
        documentType: type.name,
        documentTypeId: type.id,
        originalFileName: doc.originalFileName,
        fileSize: typeof doc.fileSize === "bigint" ? Number(doc.fileSize) : doc.fileSize,
        mimeType: doc.mimeType,
        uploadedAt: dateTime(doc.uploadedAt),
        status: doc.status,
        verifiedAt: dateTime(doc.verifiedAt),
        remarks: doc.remarks,
        viewUrl: doc.filePath ? `/api/v1/registrar/documents/${doc.id}/view` : null
      } : {
        id: null,
        documentType: type.name,
        documentTypeId: type.id,
        originalFileName: null,
        fileSize: null,
        mimeType: null,
        uploadedAt: null,
        status: "PENDING",
        verifiedAt: null,
        remarks: "Not submitted",
        viewUrl: null
      };
    });
  }
}
