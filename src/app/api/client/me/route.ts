import { NextResponse } from "next/server";
import { authenticateClient } from "@/lib/client-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** GET /api/client/me — identity check for the desktop client. */
export async function GET(req: Request) {
  const rl = rateLimit(`client-me:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const result = await authenticateClient(req);
  if (!result.ok) {
    const status = result.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    discordId: result.auth.discordId,
    username: result.auth.username,
  });
}
