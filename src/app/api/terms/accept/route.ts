import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  hasAcceptedCurrentTerms,
  recordTermsAcceptance,
  TERMS_VERSION,
} from "@/lib/terms";
import { clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (await hasAcceptedCurrentTerms(session.userId)) {
    return NextResponse.json({ ok: true, already: true });
  }
  await recordTermsAcceptance(session.userId, clientIp(req));
  return NextResponse.json({ ok: true, version: TERMS_VERSION });
}
