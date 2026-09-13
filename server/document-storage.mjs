import { createHash, randomBytes } from "node:crypto";
import { extname, join, resolve, sep } from "node:path";
import { mkdir, writeFile, unlink, access, constants } from "node:fs/promises";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png"
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const MIME_TYPE_BY_EXTENSION = new Map([
  [".pdf", "application/pdf"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"]
]);

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

const detectedMimeType = (buffer) => {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
};

export class DocumentStorageService {
  constructor(storageRoot, config = {}) {
    this.storageRoot = resolve(storageRoot);
    this.maxFileSize = config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  }

  async initialize() {
    await mkdir(this.storageRoot, { recursive: true });
  }

  validateFile(file) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new Error("FILE_EMPTY");
    }

    if (file.buffer.length > this.maxFileSize) {
      throw new Error("FILE_TOO_LARGE");
    }

    const extension = extname(file.originalName || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error("INVALID_FILE_EXTENSION");
    }

    const expectedMimeType = MIME_TYPE_BY_EXTENSION.get(extension);
    const suppliedMimeType = String(file.mimeType || "").toLowerCase();
    if (!expectedMimeType || !ALLOWED_MIME_TYPES.has(expectedMimeType)
        || (suppliedMimeType && suppliedMimeType !== expectedMimeType)) {
      throw new Error("INVALID_MIME_TYPE");
    }

    if (detectedMimeType(file.buffer) !== expectedMimeType) {
      throw new Error("FILE_CONTENT_MISMATCH");
    }

    return { extension, mimeType: expectedMimeType };
  }

  generateStoredFileName(originalName, extension) {
    const randomSuffix = randomBytes(6).toString("hex");
    const baseName = `document_${randomSuffix}`;
    return `${baseName}${extension}`;
  }

  generateFilePath(studentNumber, applicationNumber, storedFileName) {
    const studentSafe = studentNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    const appSafe = applicationNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join("students", studentSafe, appSafe, storedFileName);
  }

  async saveFile(relativePath, buffer) {
    const absolutePath = resolve(this.storageRoot, relativePath);
    const dirPath = absolutePath.slice(0, absolutePath.lastIndexOf(sep));

    if (dirPath !== this.storageRoot && !dirPath.startsWith(`${this.storageRoot}${sep}`)) {
      throw new Error("INVALID_STORAGE_PATH");
    }

    await mkdir(dirPath, { recursive: true });
    await writeFile(absolutePath, buffer);
    return relativePath;
  }

  async deleteFile(relativePath) {
    const absolutePath = resolve(this.storageRoot, relativePath);
    if (absolutePath !== this.storageRoot && !absolutePath.startsWith(`${this.storageRoot}${sep}`)) {
      throw new Error("INVALID_STORAGE_PATH");
    }
    try {
      await unlink(absolutePath);
    } catch (caught) {
      if (caught.code !== "ENOENT") throw caught;
    }
  }

  async fileExists(relativePath) {
    const absolutePath = resolve(this.storageRoot, relativePath);
    if (absolutePath !== this.storageRoot && !absolutePath.startsWith(`${this.storageRoot}${sep}`)) {
      return false;
    }
    try {
      await access(absolutePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(relativePath) {
    const absolutePath = resolve(this.storageRoot, relativePath);
    if (absolutePath !== this.storageRoot && !absolutePath.startsWith(`${this.storageRoot}${sep}`)) {
      throw new Error("INVALID_STORAGE_PATH");
    }
    const { readFile } = await import("node:fs/promises");
    return readFile(absolutePath);
  }

  getMimeType(extension) {
    return MIME_TYPE_BY_EXTENSION.get(extension.toLowerCase()) || "application/octet-stream";
  }

  getMaxFileSize() {
    return this.maxFileSize;
  }
}

export function createDocumentStorageService(config) {
  const storageRoot = config.documentRoot;
  return new DocumentStorageService(storageRoot, {
    maxFileSize: config.maxDocumentSize
  });
}
