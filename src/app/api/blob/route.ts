import { NextResponse } from "next/server";

/**
 * GET /api/blob?u=<blob url> — public read proxy for private Vercel Blob
 * objects (ticket screenshots, plugin images). Streams the blob through the
 * server so Discord/customers can fetch it without a store token, and the
 * underlying storage URL is never exposed.
 *
 * Upload pathnames get a random suffix, so responses are immutable-cacheable.
 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // SSRF guard: only proxy Vercel Blob storage URLs over https.
  if (
    target.protocol !== "https:" ||
    !target.hostname.endsWith(".blob.vercel-storage.com")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const res = await fetch(target, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!res.ok || !res.body) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type":
        res.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
