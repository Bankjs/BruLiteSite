import { createHash, randomBytes } from "crypto";

/** Generate an opaque API token (returned once to the client). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are stored hashed so a DB leak doesn't expose live credentials. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Short human-friendly pairing code for the desktop client flow. */
export function generatePairCode(): string {
  return randomBytes(6).toString("base64url"); // ~8 chars
}

/**
 * Client token lifetime. A product/anti-sharing lever, not a security
 * requirement — entitlement is verified online on every client launch and
 * tokens are revocable, so a longer TTL mainly reduces re-pairing friction.
 */
export const CLIENT_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
