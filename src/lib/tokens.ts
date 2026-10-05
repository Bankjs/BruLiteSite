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
