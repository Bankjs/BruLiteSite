import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, licenseTokens } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { CLIENT_TOKEN_TTL_MS, generateToken, hashToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/client/tokens/{id}/regenerate — revoke a token and mint a
 * replacement in one action (recovery for a possibly-exposed token).
 * The new token carries no device binding — the client re-claims a seat on
 * its next launch.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`token-regen:${session.userId}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { id } = await params;
  const [old] = await db
    .select()
    .from(licenseTokens)
    .where(
      and(eq(licenseTokens.id, id), eq(licenseTokens.userId, session.userId))
    )
    .limit(1);

  if (!old) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date();
  if (!old.revokedAt) {
    await db
      .update(licenseTokens)
      .set({ revokedAt: now })
      .where(eq(licenseTokens.id, old.id));
  }

  const rawToken = generateToken();
  const expiresAt = new Date(now.getTime() + CLIENT_TOKEN_TTL_MS);
  const [token] = await db
    .insert(licenseTokens)
    .values({
      userId: session.userId,
      tokenHash: hashToken(rawToken),
      label: old.label,
      expiresAt,
    })
    .returning({ id: licenseTokens.id });

  await db.insert(auditLog).values({
    actorUserId: session.userId,
    action: "token.regenerated",
    target: token.id,
    meta: { replaced: old.id },
  });

  return NextResponse.json({ token: rawToken, expiresAt });
}
