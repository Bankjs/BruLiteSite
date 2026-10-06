import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { auditLog, licenseTokens, users } from "@/lib/db/schema";

/** GET /api/admin/users/{id}/devices — seat limit + bound client tokens. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  const [[user], tokens] = await Promise.all([
    db
      .select({ deviceLimit: users.deviceLimit })
      .from(users)
      .where(eq(users.id, id))
      .limit(1),
    db
      .select({
        id: licenseTokens.id,
        label: licenseTokens.label,
        deviceName: licenseTokens.deviceName,
        boundAt: licenseTokens.boundAt,
        createdAt: licenseTokens.createdAt,
        expiresAt: licenseTokens.expiresAt,
        lastUsedAt: licenseTokens.lastUsedAt,
        revokedAt: licenseTokens.revokedAt,
      })
      .from(licenseTokens)
      .where(eq(licenseTokens.userId, id))
      .orderBy(desc(licenseTokens.createdAt)),
  ]);

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ deviceLimit: user.deviceLimit, tokens });
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_limit"), deviceLimit: z.number().int().min(1).max(20) }),
  z.object({ action: z.literal("revoke"), tokenId: z.uuid() }),
]);

/** POST /api/admin/users/{id}/devices — set seat limit or revoke a token. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (parsed.data.action === "set_limit") {
    await db
      .update(users)
      .set({ deviceLimit: parsed.data.deviceLimit })
      .where(eq(users.id, id));
    await db.insert(auditLog).values({
      actorUserId: session.userId,
      action: "device.limit_changed",
      target: id,
      meta: { deviceLimit: parsed.data.deviceLimit },
    });
  } else {
    await db
      .update(licenseTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(licenseTokens.id, parsed.data.tokenId), eq(licenseTokens.userId, id))
      );
    await db.insert(auditLog).values({
      actorUserId: session.userId,
      action: "token.revoked",
      target: parsed.data.tokenId,
      meta: { via: "admin", userId: id },
    });
  }

  return NextResponse.json({ ok: true });
}
