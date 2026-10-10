import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeIdentifier } from "./security.mjs";

const base64UrlEncode = (str) => Buffer.from(str, "utf8").toString("base64url");
const base64UrlDecode = (str) => Buffer.from(str, "base64url").toString("utf8");

function signHmac(data, secret) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function verifyHmac(data, signature, secret) {
  const expected = signHmac(data, secret);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Creates a mock / test Google ID Token for testing and local development.
 */
export function createMockGoogleIdToken(payload, config) {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSec = Math.floor((config.now ? config.now() : Date.now()) / 1000);
  const fullPayload = {
    iss: "https://accounts.google.com",
    aud: config.googleClientId || "cjc-test-client-id",
    sub: payload.sub || payload.googleSub || "google-sub-mock-12345",
    email: payload.email || "student.test@g.cjc.edu.ph",
    email_verified: payload.email_verified !== false,
    name: payload.name || "Test Student",
    given_name: payload.given_name || payload.givenName || "Test",
    family_name: payload.family_name || payload.familyName || "Student",
    picture: payload.picture || null,
    iat: nowSec,
    exp: nowSec + 3600,
    ...payload
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = signHmac(`${encodedHeader}.${encodedPayload}`, config.auditPepper);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies a Google ID Token (credential) or test token and extracts the verified profile.
 * Validates domain authorization against config.googleAllowedDomains.
 */
export async function verifyGoogleCredential(credential, config) {
  if (typeof credential !== "string" || !credential.trim()) {
    const err = new Error("Google credential is required.");
    err.code = "INVALID_CREDENTIAL";
    err.status = 400;
    throw err;
  }

  const parts = credential.split(".");
  if (parts.length !== 3) {
    const err = new Error("Malformed Google credential token.");
    err.code = "INVALID_CREDENTIAL";
    err.status = 400;
    throw err;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    const err = new Error("Invalid Google token payload.");
    err.code = "INVALID_CREDENTIAL";
    err.status = 400;
    throw err;
  }

  // 1. Signature & Issuer validation
  const now = config.now ? config.now() : Date.now();
  const nowSec = Math.floor(now / 1000);

  // If signed with our test pepper (for unit tests / mock mode)
  const isTestHmac = verifyHmac(`${encodedHeader}.${encodedPayload}`, signature, config.auditPepper);
  if (isTestHmac) {
    // Verified by local secret
  } else if (!config.isProduction && (config.isTest || payload.iss === "cjc-test-google")) {
    // Permitted in test mode
  } else {
    // In live production mode with real Google tokens, verify via Google tokeninfo if Client ID configured
    try {
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!googleRes.ok) {
        const err = new Error("Google identity token verification failed with upstream provider.");
        err.code = "GOOGLE_TOKEN_VERIFICATION_FAILED";
        err.status = 401;
        throw err;
      }
      payload = await googleRes.json();
    } catch (e) {
      if (e.code === "GOOGLE_TOKEN_VERIFICATION_FAILED") throw e;
      const err = new Error("Could not verify Google ID token with Google identity servers.");
      err.code = "GOOGLE_VERIFY_UNREACHABLE";
      err.status = 502;
      throw err;
    }
  }

  // 2. Validate token issuer
  const validIssuers = ["https://accounts.google.com", "accounts.google.com"];
  if (config.isTest) {
    validIssuers.push("cjc-test-google");
  }
  if (!validIssuers.includes(payload.iss)) {
    const err = new Error("Invalid Google identity token issuer.");
    err.code = "INVALID_ISSUER";
    err.status = 401;
    throw err;
  }

  // 3. Validate audience (configured Google Client ID)
  if (config.googleClientId && payload.aud && payload.aud !== config.googleClientId) {
    const err = new Error("Google identity token audience does not match configured Google Client ID.");
    err.code = "INVALID_AUDIENCE";
    err.status = 401;
    throw err;
  }

  // 4. Validate token expiration
  if (payload.exp && Number(payload.exp) < nowSec) {
    const err = new Error("Google sign-in session has expired. Please try again.");
    err.code = "TOKEN_EXPIRED";
    err.status = 401;
    throw err;
  }

  // 5. Validate email verification
  if (payload.email_verified !== true && payload.email_verified !== "true") {
    const err = new Error("The Google account email is not verified.");
    err.code = "EMAIL_NOT_VERIFIED";
    err.status = 403;
    throw err;
  }

  const email = String(payload.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    const err = new Error("Google profile did not provide a valid email address.");
    err.code = "EMAIL_MISSING";
    err.status = 400;
    throw err;
  }

  // 6. Validate authorized CJC Workspace domain
  const domain = email.split("@")[1].toLowerCase();
  const allowed = (config.googleAllowedDomains || ["g.cjc.edu.ph", "cjc.edu.ph"]).map((d) =>
    d.toLowerCase()
  );

  if (!allowed.includes(domain)) {
    const err = new Error(
      `Only official CJC Google Workspace accounts (@g.cjc.edu.ph) are permitted. Signed in as ${email}.`
    );
    err.code = "DOMAIN_UNAUTHORIZED";
    err.status = 403;
    err.details = { email, domain, allowedDomains: allowed };
    throw err;
  }

  // 7. Validate hosted domain claim (hd) if present
  if (payload.hd && !allowed.includes(String(payload.hd).trim().toLowerCase())) {
    const err = new Error(`Google Workspace hosted domain (${payload.hd}) is not authorized.`);
    err.code = "DOMAIN_UNAUTHORIZED";
    err.status = 403;
    err.details = { email, domain, hd: payload.hd, allowedDomains: allowed };
    throw err;
  }

  // 8. Validate immutable subject identifier
  const googleSub = String(payload.sub || payload.id || "").trim();
  if (!googleSub) {
    const err = new Error("Google profile did not provide an immutable subject identifier.");
    err.code = "SUBJECT_MISSING";
    err.status = 400;
    throw err;
  }

  const givenName = payload.given_name || payload.name?.split(" ")[0] || "";
  const familyName =
    payload.family_name ||
    payload.name?.split(" ").slice(1).join(" ") ||
    "";
  const name =
    payload.name || [givenName, familyName].filter(Boolean).join(" ") || email;

  return {
    googleSub,
    email,
    givenName,
    familyName,
    name,
    picture: payload.picture || null
  };
}

/**
 * Exchanges a Google OAuth 2.0 authorization code for an ID token via Google's token endpoint.
 */
export async function exchangeGoogleAuthCode(code, config, redirectUri = "postmessage") {
  if (!config.googleClientId || !config.googleClientSecret) {
    const err = new Error("Google OAuth code exchange requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    err.code = "GOOGLE_CONFIG_MISSING";
    err.status = 500;
    throw err;
  }

  const params = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: params.toString()
  });

  if (!res.ok) {
    const err = new Error("Failed to exchange Google authorization code with Google identity servers.");
    err.code = "GOOGLE_CODE_EXCHANGE_FAILED";
    err.status = 401;
    throw err;
  }

  const data = await res.json();
  if (!data.id_token) {
    const err = new Error("Google identity servers did not return an ID token.");
    err.code = "GOOGLE_TOKEN_MISSING";
    err.status = 401;
    throw err;
  }

  return data.id_token;
}

/**
 * Creates a cryptographically signed registration handoff token holding verified Google profile data.
 * Used when no existing SMS account matches so the client can complete registration without tampering.
 */
export function createRegistrationToken(profile, config) {
  const now = config.now ? config.now() : Date.now();
  const expiry = now + (config.googleTokenExpiryMs || 15 * 60 * 1000);
  const data = {
    googleSub: profile.googleSub,
    email: profile.email.toLowerCase(),
    emailNormalized: normalizeIdentifier(profile.email),
    givenName: profile.givenName || "",
    familyName: profile.familyName || "",
    name: profile.name || "",
    picture: profile.picture || null,
    exp: expiry
  };

  const encodedData = base64UrlEncode(JSON.stringify(data));
  const signature = signHmac(encodedData, config.auditPepper);
  return `${encodedData}.${signature}`;
}

/**
 * Verifies a signed registration handoff token and returns the untampered Google profile data.
 */
export function verifyRegistrationToken(token, config) {
  if (typeof token !== "string" || !token.includes(".")) {
    const err = new Error("Invalid or missing registration token.");
    err.code = "REGISTRATION_TOKEN_INVALID";
    err.status = 400;
    throw err;
  }

  const [encodedData, signature] = token.split(".");
  if (!verifyHmac(encodedData, signature, config.auditPepper)) {
    const err = new Error("Registration token signature verification failed.");
    err.code = "REGISTRATION_TOKEN_TAMPERED";
    err.status = 403;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(base64UrlDecode(encodedData));
  } catch {
    const err = new Error("Invalid registration token payload.");
    err.code = "REGISTRATION_TOKEN_INVALID";
    err.status = 400;
    throw err;
  }

  const now = config.now ? config.now() : Date.now();
  if (data.exp && data.exp < now) {
    const err = new Error("Registration session has expired. Please sign in with Google again.");
    err.code = "REGISTRATION_TOKEN_EXPIRED";
    err.status = 401;
    throw err;
  }

  return data;
}
