import { NextResponse } from "next/server";
import { buildOAuthUrl } from "@/lib/discord";
import { createOAuthState } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** GET /api/auth/discord?next=/dashboard&pair=CODE — start Discord OAuth. */
export async function GET(req: Request) {
  const rl = rateLimit(`oauth:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return new Response("Too many requests", { status: 429 });

  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? undefined;
  const pair = url.searchParams.get("pair") ?? undefined;
  const state = await createOAuthState({ next, pair });
  return NextResponse.redirect(buildOAuthUrl(state));
}
