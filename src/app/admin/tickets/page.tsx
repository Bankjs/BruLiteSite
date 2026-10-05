import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tickets, users } from "@/lib/db/schema";
import { Badge, Card, PageHeader } from "@/components/ui";
import { TicketStatusSelect } from "@/components/admin-ticket-status";

export const metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const rows = await db
    .select({
      id: tickets.id,
      type: tickets.type,
      title: tickets.title,
      body: tickets.body,
      status: tickets.status,
      createdAt: tickets.createdAt,
      username: users.username,
      discordId: users.discordId,
    })
    .from(tickets)
    .innerJoin(users, eq(users.id, tickets.userId))
    .orderBy(desc(tickets.createdAt));

  return (
    <div>
      <PageHeader title="Tickets" subtitle="Bug reports and feature requests." />
      {rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted">
          No tickets yet.
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={t.type === "bug" ? "red" : "purple"}>
                      {t.type}
                    </Badge>
                    <h3 className="font-semibold">{t.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {t.username} ({t.discordId}) ·{" "}
                    {t.createdAt.toLocaleString("en-GB")}
                  </p>
                </div>
                <TicketStatusSelect ticketId={t.id} status={t.status} />
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm text-muted">
                {t.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
