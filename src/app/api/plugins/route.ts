import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plugins } from "@/lib/db/schema";

/** GET /api/plugins — public list of published plugins. */
export async function GET() {
  const rows = await db
    .select()
    .from(plugins)
    .where(eq(plugins.published, true))
    .orderBy(asc(plugins.sortOrder), asc(plugins.name));
  return NextResponse.json({ plugins: rows });
}
