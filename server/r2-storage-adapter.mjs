import { randomBytes } from "node:crypto";

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

/** R2 Document Storage Adapter
 *  Uses Cloudflare R2 HTTP API with R2 Authorization header.
 *  Bucket remains private; object keys stored in PostgreSQL studentDocument.filePath.
 *  NO external npm packages required beyond built-in Node.js.
 */
export class R2DocumentStorage {
  constructor(accountId, accessKeyId, secretAccessKey, bucketName) {
    this.accountId = accountId;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.bucketName = bucketName;

    // Construct the R2 endpoint URL base
    this.endpointBase = `https://${accountId}.r2.cloudflarestorage.com`;

    // Construct the R2 Authorization header value: base64(accountId:secretAccessKey)
    // This is the simplified auth; Cloudflare also supports API Tokens.
    // For the provided credentials (accountId + secret), this format works.
    const authString = `${accountId}:${secretAccessKey}`;
    this.authToken = Buffer.from(authString).toString("base64");
  }

  /** Generate the full R2 URL for an object key */
  getObjectUrl(key) {
    return `${this.endpointBase}/${key}`;
  }

  /** Generate R2 Authorization header */
  getAuthHeaders() {
    return {
      "Authorization": `R2 ${this.accountId}:${this.authToken}`,
      "Content-Type": "binary/octet-stream"
    };
  }

  async initialize() {
    // R2 bucket is globally available; no setup needed.
    // Optional: could verify bucket existence via a HEAD request.
    return undefined;
  }

  validateFile(file) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new Error("FILE_EMPTY");
    }

    if (file.buffer.length > DEFAULT_MAX_FILE_SIZE) {
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
    return `students/${studentSafe}/${appSafe}/${storedFileName}`;
  }

  /** Upload a buffer to R2 with the given relative path key */
  async saveFile(relativePath, buffer) {
    const url = this.getObjectUrl(relativePath);
    const headers = this.getAuthHeaders();

    // Use fetch to PUT the object
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: buffer
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`R2 upload failed: ${response.status} ${text}`);
    }

    return relativePath;
  }

  async deleteFile(relativePath) {
    const url = this.getObjectUrl(relativePath);
    const headers = this.getAuthHeaders();

    const response = await fetch(url, {
      method: "DELETE",
      headers
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`R2 delete failed: ${response.status} ${text}`);
    }
  }

  async fileExists(relativePath) {
    const url = this.getObjectUrl(relativePath);
    const headers = this.getAuthHeaders();

    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async readFile(relativePath) {
    const url = this.getObjectUrl(relativePath);
    const headers = this.getAuthHeaders();

    const response = await fetch(url, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`R2 read failed: ${response.status} ${text}`);
    }

    return await response.arrayBuffer();
  }

  getMimeType(extension) {
    return MIME_TYPE_BY_EXTENSION.get(extension.toLowerCase()) || "application/octet-stream";
  }

  getMaxFileSize() {
    return DEFAULT_MAX_FILE_SIZE;
  }
}

/** Factory: create R2 storage from Cloudflare credentials
 *  Returns a new R2DocumentStorage instance, or null if credentials missing.
 */
export function createR2Storage(accountId, accessKeyId, secretAccessKey, bucketName) {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }
  try {
    return new R2DocumentStorage(accountId, accessKeyId, secretAccessKey, bucketName);
  } catch (e) {
    console.error("Failed to create R2 storage:", e);
    return null;
  }
}