import { NextResponse } from "next/server";
import { authenticateClient } from "@/lib/client-auth";
import { getEntitlementStatus } from "@/lib/entitlements";
import { env } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * GET /api/client/entitlement — the call the BruLite client makes to check
 * whether the authed user may use the software.
 */
export async function GET(req: Request) {
  const rl = rateLimit(`client-ent:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const result = await authenticateClient(req);
  if (!result.ok) {
    const status = result.error === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }
  const auth = result.auth;

  const status = await getEntitlementStatus(auth.userId);
  return NextResponse.json({
    entitled: status.entitled,
    status: status.status,
    plan: status.plan,
    expiresAt: status.expiresAt,
    cancelAtPeriodEnd: status.cancelAtPeriodEnd,
    pastDue: status.pastDue,
    tokenExpiresAt: auth.tokenExpiresAt,
    /** Oldest client version still allowed; null = no floor enforced. */
    minClientVersion: env.MIN_CLIENT_VERSION || null,
  });
}
