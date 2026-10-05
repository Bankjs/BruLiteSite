import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tickets } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: PageProps<"/support/[id]">) {
  const session = await getSession();
  if (!session) redirect("/auth/signin?next=/support");

  const { id } = await params;
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);

  if (!ticket || (ticket.userId !== session.userId && !session.isAdmin)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/support" className="text-sm text-accent hover:underline">
        ← Back to support
      </Link>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">{ticket.title}</h1>
          <div className="flex gap-2">
            <Badge tone="purple">{ticket.type}</Badge>
            <Badge>{ticket.status.replace("_", " ")}</Badge>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">
          Opened{" "}
          {ticket.createdAt.toLocaleDateString("en-GB", { dateStyle: "full" })}
        </p>
        <p className="mt-6 whitespace-pre-wrap text-sm text-muted">
          {ticket.body}
        </p>
        {ticket.discordMessageId && (
          <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
            This ticket was posted to the BruLite Discord — staff will respond
            there or update the status here.
          </p>
        )}
      </Card>
    </div>
  );
}
