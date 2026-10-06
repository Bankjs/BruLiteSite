import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, licenseTokens } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";

const bodySchema = z.object({
  // Revoke a specific token by id (dashboard) or the raw token (client itself).
  tokenId: z.uuid().optional(),
  token: z.string().optional(),
});

/** POST /api/client/revoke — revoke a client token. */
export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { tokenId, token } = parsed.data;

  // Session-authed revocation from the dashboard.
  if (session && tokenId) {
    await db
      .update(licenseTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(licenseTokens.id, tokenId),
          eq(licenseTokens.userId, session.userId),
        ),
      );
    await db.insert(auditLog).values({
      actorUserId: session.userId,
      action: "token.revoked",
      target: tokenId,
      meta: { via: "dashboard" },
    });
    return NextResponse.json({ ok: true });
  }

  // Token-authed self-revocation (client signs out).
  if (token) {
    await db
      .update(licenseTokens)
      .set({ revokedAt: new Date() })
      .where(eq(licenseTokens.tokenHash, hashToken(token)));
    await db.insert(auditLog).values({
      actorUserId: session?.userId ?? null,
      action: "token.revoked",
      target: "self",
      meta: { via: "client" },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
