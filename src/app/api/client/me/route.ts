import { NextResponse } from "next/server";
import { authenticateClient } from "@/lib/client-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** GET /api/client/me — identity check for the desktop client. */
export async function GET(req: Request) {
  const rl = rateLimit(`client-me:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const auth = await authenticateClient(req);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    discordId: auth.discordId,
    username: auth.username,
  });
}
