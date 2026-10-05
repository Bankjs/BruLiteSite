import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { releases } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { getEntitlementStatus } from "@/lib/entitlements";

/**
 * GET /api/download/client — entitlement-gated download of the latest
 * BruLite client build. Streams the private blob through the server so the
 * storage URL is never exposed.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = await getEntitlementStatus(session.userId);
  if (!status.entitled) {
    return NextResponse.json({ error: "not_entitled" }, { status: 403 });
  }

  const [release] = await db
    .select()
    .from(releases)
    .orderBy(desc(releases.createdAt))
    .limit(1);

  if (!release) {
    return NextResponse.json({ error: "no_release" }, { status: 404 });
  }

  // Fetch the private blob with the store token and stream it out.
  const res = await fetch(release.blobUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type":
        res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${release.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
