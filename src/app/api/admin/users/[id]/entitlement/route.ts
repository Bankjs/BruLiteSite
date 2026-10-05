import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { grantManualEntitlement, revokeEntitlement } from "@/lib/entitlements";

const bodySchema = z.object({
  action: z.enum(["grant", "revoke"]),
  reason: z.string().max(500).optional(),
  /** ISO date for time-limited manual grants; omit for lifetime. */
  expiresAt: z.iso.datetime().optional(),
});

/** POST /api/admin/users/{id}/entitlement — grant or revoke access. */
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
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.action === "grant") {
    await grantManualEntitlement(
      id,
      session.userId,
      parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined
    );
  } else {
    await revokeEntitlement(
      id,
      parsed.data.reason ?? "revoked by admin",
      session.userId
    );
  }

  return NextResponse.json({ ok: true });
}
