import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tickets } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { postTicketToDiscord } from "@/lib/discord";
import { rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  type: z.enum(["bug", "feature"]),
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(5000),
});

/** GET /api/tickets — list the current user's tickets. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, session.userId))
    .orderBy(desc(tickets.createdAt));
  return NextResponse.json({ tickets: rows });
}

/** POST /api/tickets — create a bug report or feature request. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(`ticket:${session.userId}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [ticket] = await db
    .insert(tickets)
    .values({
      userId: session.userId,
      type: parsed.data.type,
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .returning();

  // Mirror to Discord — best effort; ticket already exists if this fails.
  const messageId = await postTicketToDiscord({
    ticketId: ticket.id,
    type: ticket.type as "bug" | "feature",
    title: ticket.title,
    body: ticket.body,
    username: session.username,
  });
  if (messageId) {
    await db
      .update(tickets)
      .set({ discordMessageId: messageId })
      .where(eq(tickets.id, ticket.id));
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
