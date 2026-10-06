import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, licenseTokens, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/tokens";
import { decideDeviceBinding } from "@/lib/device-logic";

export interface ClientAuth {
  userId: string;
  discordId: string;
  username: string;
  tokenId: string;
  /** Present once a device seat has been bound to this token. */
  deviceFingerprint: string | null;
  deviceName: string | null;
  tokenExpiresAt: Date;
}

/** Client auth failure kinds the desktop client maps to user-facing states. */
export type ClientAuthError =
  | "unauthorized"
  | "device_required"
  | "device_limit"
  | "device_mismatch";

export type ClientAuthResult =
  | { ok: true; auth: ClientAuth }
  | { ok: false; error: ClientAuthError };

/**
 * Authenticate a desktop client request via `Authorization: Bearer <token>`
 * plus the `X-Device-Id` device seat binding.
 *
 * Device semantics: the fingerprint is a seat-management identifier — the
 * token remains the credential. On the first call carrying an X-Device-Id,
 * the seat is claimed (subject to the user's deviceLimit); subsequent calls
 * must present the same fingerprint.
 */
export async function authenticateClient(
  req: Request,
): Promise<ClientAuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return { ok: false, error: "unauthorized" };

  const deviceId = req.headers.get("x-device-id");
  const deviceName = req.headers.get("x-device-name") ?? null;
  if (!deviceId) return { ok: false, error: "device_required" };

  const tokenHash = hashToken(match[1]);
  const rows = await db
    .select({
      tokenId: licenseTokens.id,
      userId: licenseTokens.userId,
      discordId: users.discordId,
      username: users.username,
      deviceLimit: users.deviceLimit,
      deviceFingerprint: licenseTokens.deviceFingerprint,
      deviceName: licenseTokens.deviceName,
      expiresAt: licenseTokens.expiresAt,
    })
    .from(licenseTokens)
    .innerJoin(users, eq(users.id, licenseTokens.userId))
    .where(
      and(
        eq(licenseTokens.tokenHash, tokenHash),
        isNull(licenseTokens.revokedAt),
        gt(licenseTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, error: "unauthorized" };

  // Seat not yet claimed — bind this device if the user has room.
  if (!row.deviceFingerprint) {
    const bound = await db
      .select({ id: licenseTokens.id })
      .from(licenseTokens)
      .where(
        and(
          eq(licenseTokens.userId, row.userId),
          isNull(licenseTokens.revokedAt),
          isNotNull(licenseTokens.deviceFingerprint),
        ),
      );

    const decision = decideDeviceBinding(
      row.deviceFingerprint,
      bound.length,
      row.deviceLimit,
      deviceId,
    );

    if (decision === "limit") {
      audit("device.limit_hit", row.userId, row.tokenId, deviceId);
      return { ok: false, error: "device_limit" };
    }

    await db
      .update(licenseTokens)
      .set({
        deviceFingerprint: deviceId,
        deviceName,
        boundAt: new Date(),
      })
      .where(eq(licenseTokens.id, row.tokenId));
    audit("device.bound", row.userId, row.tokenId, deviceId);
    row.deviceFingerprint = deviceId;
    row.deviceName = deviceName;
  } else if (row.deviceFingerprint !== deviceId) {
    audit("device.mismatch", row.userId, row.tokenId, deviceId);
    return { ok: false, error: "device_mismatch" };
  }

  // Best-effort lastUsedAt update.
  db.update(licenseTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(licenseTokens.id, row.tokenId))
    .catch(() => {});

  return {
    ok: true,
    auth: {
      userId: row.userId,
      discordId: row.discordId,
      username: row.username,
      tokenId: row.tokenId,
      deviceFingerprint: row.deviceFingerprint,
      deviceName: row.deviceName,
      tokenExpiresAt: row.expiresAt,
    },
  };
}

/** Fingerprint prefix only — never log raw tokens or full fingerprints. */
function audit(
  action: string,
  userId: string,
  tokenId: string,
  deviceId: string,
) {
  db.insert(auditLog)
    .values({
      actorUserId: userId,
      action,
      target: tokenId,
      meta: { devicePrefix: deviceId.slice(0, 8) },
    })
    .catch(() => {});
}
