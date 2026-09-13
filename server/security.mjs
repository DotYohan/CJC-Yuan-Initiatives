import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as nodeScrypt,
  timingSafeEqual
} from "node:crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const newId = () => randomUUID();
export const tokenHash = (token) => createHash("sha256").update(String(token)).digest("hex");
export const auditHash = (value, pepper) =>
  createHmac("sha256", pepper).update(String(value)).digest("hex");

export function normalizeIdentifier(value) {
  return typeof value === "string" ? value.normalize("NFKC").trim().toLocaleLowerCase("en-US") : "";
}

export function validatePassword(password, config) {
  if (typeof password !== "string") return "Password is required.";
  const length = [...password].length;
  if (length < config.passwordMinLength) {
    return `Password must contain at least ${config.passwordMinLength} characters.`;
  }
  if (length > config.passwordMaxLength || Buffer.byteLength(password, "utf8") > 1024) {
    return `Password must contain no more than ${config.passwordMaxLength} characters.`;
  }
  return null;
}

const runScrypt = (password, salt, parameters) =>
  new Promise((resolve, reject) => {
    const estimatedMemory = 128 * parameters.N * parameters.r;
    const maxmem = Math.max(32 * 1024 * 1024, estimatedMemory + 16 * 1024 * 1024);
    nodeScrypt(
      password,
      salt,
      parameters.keyLength,
      { N: parameters.N, r: parameters.r, p: parameters.p, maxmem },
      (error, key) => (error ? reject(error) : resolve(key))
    );
  });

export async function hashPassword(password, parameters) {
  const salt = randomBytes(16);
  const derived = await runScrypt(password, salt, parameters);
  return `$scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== "string" || typeof encoded !== "string") return false;
  const parts = encoded.split("$");
  if (parts.length !== 7 || parts[1] !== "scrypt") return false;
  const N = Number(parts[2]);
  const r = Number(parts[3]);
  const p = Number(parts[4]);
  if (!Number.isSafeInteger(N) || (N & (N - 1)) !== 0 || N < 2 || N > 1 << 20) return false;
  if (!Number.isSafeInteger(r) || r < 1 || r > 32 || !Number.isSafeInteger(p) || p < 1 || p > 16) return false;
  try {
    const salt = Buffer.from(parts[5], "base64url");
    const expected = Buffer.from(parts[6], "base64url");
    if (salt.length < 16 || expected.length < 32 || expected.length > 128) return false;
    const actual = await runScrypt(password, salt, { N, r, p, keyLength: expected.length });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function passwordHashNeedsUpgrade(encoded, desired) {
  const parts = typeof encoded === "string" ? encoded.split("$") : [];
  return (
    parts.length !== 7 ||
    parts[1] !== "scrypt" ||
    Number(parts[2]) !== desired.N ||
    Number(parts[3]) !== desired.r ||
    Number(parts[4]) !== desired.p ||
    Buffer.from(parts[6] ?? "", "base64url").length !== desired.keyLength
  );
}

export function safeHashEqual(actualHex, expectedHex) {
  if (typeof actualHex !== "string" || typeof expectedHex !== "string") return false;
  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length > 0 && actual.length === expected.length && timingSafeEqual(actual, expected);
}
