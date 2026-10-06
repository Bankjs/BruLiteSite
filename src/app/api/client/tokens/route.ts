import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { auditLog, licenseTokens } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { CLIENT_TOKEN_TTL_MS, generateToken, hashToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";

const mintSchema = z.object({
  label: z.string().min(1).max(50).optional(),
});

/**
 * POST /api/client/tokens — mint a client token from the dashboard (the
 * "copy-paste key" path). The raw token is returned exactly once; only its
 * sha256 hash is stored.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`token-mint:${session.userId}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = mintSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + CLIENT_TOKEN_TTL_MS);
  const [token] = await db
    .insert(licenseTokens)
    .values({
      userId: session.userId,
      tokenHash: hashToken(rawToken),
      label: parsed.data.label ?? "client",
      expiresAt,
    })
    .returning({ id: licenseTokens.id });

  await db.insert(auditLog).values({
    actorUserId: session.userId,
    action: "token.created",
    target: token.id,
    meta: { via: "dashboard" },
  });

  return NextResponse.json({ token: rawToken, expiresAt });
}

/** GET /api/client/tokens — list the caller's tokens (never raw values). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: licenseTokens.id,
      label: licenseTokens.label,
      deviceName: licenseTokens.deviceName,
      boundAt: licenseTokens.boundAt,
      createdAt: licenseTokens.createdAt,
      expiresAt: licenseTokens.expiresAt,
      lastUsedAt: licenseTokens.lastUsedAt,
      revokedAt: licenseTokens.revokedAt,
    })
    .from(licenseTokens)
    .where(eq(licenseTokens.userId, session.userId))
    .orderBy(desc(licenseTokens.createdAt));

  return NextResponse.json({ tokens: rows });
}
