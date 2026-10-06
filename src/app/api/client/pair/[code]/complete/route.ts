import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clientPairings, licenseTokens } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { CLIENT_TOKEN_TTL_MS, generateToken, hashToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/client/pair/{code}/complete — called by the browser (authed
 * session) on the /auth/client page to link the pairing code to the user
 * and mint a client API token.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`pair-complete:${session.userId}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { code } = await params;
  const [pair] = await db
    .select()
    .from(clientPairings)
    .where(
      and(
        eq(clientPairings.code, code),
        eq(clientPairings.status, "pending"),
        gt(clientPairings.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!pair) {
    return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  }

  const rawToken = generateToken();
  const [token] = await db
    .insert(licenseTokens)
    .values({
      userId: session.userId,
      tokenHash: hashToken(rawToken),
      label: "client",
      expiresAt: new Date(Date.now() + CLIENT_TOKEN_TTL_MS),
    })
    .returning({ id: licenseTokens.id });

  await db
    .update(clientPairings)
    .set({
      status: "complete",
      userId: session.userId,
      licenseTokenId: token.id,
      pendingToken: rawToken,
    })
    .where(eq(clientPairings.code, code));

  return NextResponse.json({ ok: true });
}
