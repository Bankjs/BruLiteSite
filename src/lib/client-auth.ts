import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { licenseTokens, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/tokens";

export interface ClientAuth {
  userId: string;
  discordId: string;
  username: string;
  tokenId: string;
}

/**
 * Authenticate a desktop client request via `Authorization: Bearer <token>`.
 * Returns null when the token is missing, unknown, expired, or revoked.
 */
export async function authenticateClient(req: Request): Promise<ClientAuth | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;

  const tokenHash = hashToken(match[1]);
  const rows = await db
    .select({
      tokenId: licenseTokens.id,
      userId: licenseTokens.userId,
      discordId: users.discordId,
      username: users.username,
    })
    .from(licenseTokens)
    .innerJoin(users, eq(users.id, licenseTokens.userId))
    .where(
      and(
        eq(licenseTokens.tokenHash, tokenHash),
        isNull(licenseTokens.revokedAt),
        gt(licenseTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Best-effort lastUsedAt update.
  db.update(licenseTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(licenseTokens.id, row.tokenId))
    .catch(() => {});

  return row;
}
