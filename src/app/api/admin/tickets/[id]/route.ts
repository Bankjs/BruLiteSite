import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, tickets } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { deleteChannelOrThread } from "@/lib/discord";

const patchSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

/** PATCH /api/admin/tickets/{id} — update ticket status. */
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
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const [ticket] = await db
    .update(tickets)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .returning();

  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ticket });
}

/** DELETE /api/admin/tickets/{id} — delete a ticket + its Discord thread. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  const [ticket] = await db
    .delete(tickets)
    .where(eq(tickets.id, id))
    .returning();

  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (ticket.discordMessageId) {
    await deleteChannelOrThread(ticket.discordMessageId).catch((e) =>
      console.error("discord thread delete failed", e)
    );
  }

  await db.insert(auditLog).values({
    actorUserId: session.userId,
    action: "ticket.deleted",
    target: id,
    meta: { title: ticket.title, type: ticket.type },
  });

  return NextResponse.json({ ok: true });
}
