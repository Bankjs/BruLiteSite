import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clientPairings } from "@/lib/db/schema";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * GET /api/client/pair/{code} — the desktop client polls this.
 * 202 pending until the browser flow completes; on completion the raw
 * token is returned exactly once, then cleared from the row.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rl = rateLimit(`pair-poll:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { code } = await params;
  const [pair] = await db
    .select()
    .from(clientPairings)
    .where(eq(clientPairings.code, code))
    .limit(1);

  if (!pair) return NextResponse.json({ status: "invalid" }, { status: 404 });

  if (pair.expiresAt <= new Date() && pair.status !== "complete") {
    if (pair.status !== "expired") {
      await db
        .update(clientPairings)
        .set({ status: "expired" })
        .where(eq(clientPairings.code, code));
    }
    return NextResponse.json({ status: "expired" }, { status: 410 });
  }

  if (pair.status !== "complete") {
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }

  // Complete — deliver the raw token once, then clear it.
  const token = pair.pendingToken;
  if (!token) {
    return NextResponse.json(
      { status: "complete", token: null },
      { status: 200 }
    );
  }

  await db
    .update(clientPairings)
    .set({ pendingToken: null })
    .where(eq(clientPairings.code, code));

  return NextResponse.json({ status: "complete", token });
}
