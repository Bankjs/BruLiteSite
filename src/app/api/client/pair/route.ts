import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { clientPairings } from "@/lib/db/schema";
import { generatePairCode } from "@/lib/tokens";
import { env } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const PAIR_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * POST /api/client/pair — the desktop client calls this to start pairing.
 * Returns a code + URL to open in the user's browser.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`pair-create:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const code = generatePairCode();
  await db.insert(clientPairings).values({
    code,
    status: "pending",
    expiresAt: new Date(Date.now() + PAIR_TTL_MS),
  });

  return NextResponse.json({
    code,
    verifyUrl: `${env.APP_URL}/auth/client?code=${code}`,
    expiresIn: Math.floor(PAIR_TTL_MS / 1000),
  });
}
