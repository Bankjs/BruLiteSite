import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plugins } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { pluginSchema } from "../route";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  const parsed = pluginSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [plugin] = await db
    .update(plugins)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(plugins.id, id))
    .returning();

  if (!plugin) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ plugin });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  await db.delete(plugins).where(eq(plugins.id, id));
  return NextResponse.json({ ok: true });
}
