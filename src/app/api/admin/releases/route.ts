import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, releases } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { uploadFile, deleteFile } from "@/lib/blob";

const MAX_SIZE = 512 * 1024 * 1024; // 512 MB

/** GET /api/admin/releases — list uploaded client builds. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }
  const rows = await db
    .select()
    .from(releases)
    .orderBy(desc(releases.createdAt));
  return NextResponse.json({ releases: rows });
}

/**
 * POST /api/admin/releases — multipart upload of a new client build.
 * Stored as a private blob; served only via /api/download/client.
 */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const version = form?.get("version");
  const notes = form?.get("notes");

  if (!(file instanceof File) || typeof version !== "string" || !version) {
    return NextResponse.json(
      { error: "file_and_version_required" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const blob = await uploadFile(`releases/${version}/${file.name}`, file, "private");

  const [release] = await db
    .insert(releases)
    .values({
      version,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      fileName: file.name,
      notes: typeof notes === "string" ? notes : null,
    })
    .returning();

  await db.insert(auditLog).values({
    actorUserId: session.userId,
    action: "release.uploaded",
    target: release.id,
    meta: { version, fileName: file.name },
  });

  return NextResponse.json({ release }, { status: 201 });
}

/** DELETE /api/admin/releases?id= — remove a release + its blob. */
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const [release] = await db
    .delete(releases)
    .where(eq(releases.id, id))
    .returning();

  if (release) {
    await deleteFile(release.blobUrl).catch((e) =>
      console.error("blob delete failed", e)
    );
  }
  return NextResponse.json({ ok: true });
}
