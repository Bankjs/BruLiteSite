import { NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plugins } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const pluginSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  category: z.string().min(1).max(60).default("general"),
  imageUrl: z.url().nullable().optional(),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** GET /api/admin/plugins — all plugins incl. unpublished. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }
  const rows = await db
    .select()
    .from(plugins)
    .orderBy(asc(plugins.sortOrder), asc(plugins.name));
  return NextResponse.json({ plugins: rows });
}

/** POST /api/admin/plugins — create a plugin entry. */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const parsed = pluginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [plugin] = await db
    .insert(plugins)
    .values({ ...parsed.data, slug: slugify(parsed.data.name) })
    .returning();
  return NextResponse.json({ plugin }, { status: 201 });
}
