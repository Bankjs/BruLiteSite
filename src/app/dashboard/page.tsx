import Link from "next/link";
import { desc, eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  licenseTokens,
  releases,
  subscriptions,
  tickets,
  users,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { getEntitlementStatus } from "@/lib/entitlements";
import { Badge, Card, CardTitle, PageHeader } from "@/components/ui";
import {
  ManageBillingButton,
  NewTokenButton,
  RegenerateTokenButton,
  RevokeTokenButton,
} from "@/components/dashboard-actions";
import { Download, KeyRound, Ticket } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—";
}

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const session = await getSession();
  if (!session) redirect("/auth/signin?next=/dashboard");
  const { checkout } = await searchParams;

  const [ent, [sub], tokens, myTickets, [latestRelease], [me]] =
    await Promise.all([
      getEntitlementStatus(session.userId),
      db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, session.userId))
        .orderBy(desc(subscriptions.currentPeriodEnd))
        .limit(1),
      db
        .select()
        .from(licenseTokens)
        .where(
          and(
            eq(licenseTokens.userId, session.userId),
            isNull(licenseTokens.revokedAt),
          ),
        )
        .orderBy(desc(licenseTokens.createdAt)),
      db
        .select()
        .from(tickets)
        .where(eq(tickets.userId, session.userId))
        .orderBy(desc(tickets.createdAt))
        .limit(5),
      db.select().from(releases).orderBy(desc(releases.createdAt)).limit(1),
      db
        .select({ deviceLimit: users.deviceLimit })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1),
    ]);

  const boundDevices = tokens.filter((t) => t.deviceFingerprint).length;
  const deviceLimit = me?.deviceLimit ?? 2;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <PageHeader
        title={`Welcome, ${session.username}`}
        subtitle="Manage your membership, download, and linked clients."
      />

      {checkout === "success" && (
        <p className="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Payment received — your membership will activate as soon as Stripe
          confirms it (usually seconds).
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Membership */}
        <Card>
          <CardTitle>Membership</CardTitle>
          <div className="flex items-center justify-between">
            <div>
              {ent.entitled ? (
                <>
                  <Badge tone="green">Active</Badge>
                  <p className="mt-3 text-sm text-muted">
                    {ent.plan === "monthly"
                      ? "Monthly"
                      : ent.plan === "yearly"
                        ? "Yearly"
                        : "Manual"}{" "}
                    plan ·{" "}
                    {ent.expiresAt
                      ? `renews/ends ${fmtDate(ent.expiresAt)}`
                      : "no expiry"}
                  </p>
                </>
              ) : (
                <>
                  <Badge tone="red">No active membership</Badge>
                  <p className="mt-3 text-sm text-muted">
                    {ent.status === "revoked"
                      ? "Access was revoked — contact support."
                      : "Subscribe to unlock the client."}
                  </p>
                </>
              )}
              {ent.pastDue && (
                <p className="mt-2 text-sm text-amber-300">
                  Your last payment failed — update billing to keep access.
                </p>
              )}
              {ent.cancelAtPeriodEnd && ent.entitled && (
                <p className="mt-2 text-sm text-amber-300">
                  Cancels at period end ({fmtDate(ent.expiresAt)}).
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {!ent.entitled && (
              <Link
                href="/pricing"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-bright"
              >
                View plans
              </Link>
            )}
            {sub && <ManageBillingButton />}
          </div>
        </Card>

        {/* Download */}
        <Card>
          <CardTitle>Client download</CardTitle>
          {ent.entitled ? (
            latestRelease ? (
              <>
                <p className="text-sm text-muted">
                  Latest build:{" "}
                  <span className="text-foreground">
                    v{latestRelease.version}
                  </span>{" "}
                  ({latestRelease.fileName})
                </p>
                <a
                  href="/api/download/client"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-bright"
                >
                  <Download className="h-4 w-4" /> Download BruLite
                </a>
              </>
            ) : (
              <p className="text-sm text-muted">
                No build has been published yet — check Discord for release
                announcements.
              </p>
            )
          ) : (
            <p className="text-sm text-muted">
              An active membership is required to download the client.
            </p>
          )}
        </Card>

        {/* Linked clients */}
        <Card>
          <CardTitle>
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-accent" /> Linked clients
            </span>
          </CardTitle>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted">
              No linked devices. Sign in from inside the BruLite client, or
              create a client token here and paste it in.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted">
                {boundDevices} of {deviceLimit} device seats in use.
              </p>
              <ul className="space-y-3">
                {tokens.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{t.label}</span>
                        <span className="ml-3 text-muted">
                          expires {fmtDate(t.expiresAt)}
                          {t.expiresAt <= new Date() && " (expired)"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <RegenerateTokenButton tokenId={t.id} />
                        <RevokeTokenButton tokenId={t.id} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {t.deviceName
                        ? `Device: ${t.deviceName}`
                        : "No device bound yet"}
                      {t.lastUsedAt && ` · last used ${fmtDate(t.lastUsedAt)}`}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-4">
            <NewTokenButton />
          </div>
        </Card>

        {/* Recent tickets */}
        <Card>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-accent" /> Recent tickets
            </span>
          </CardTitle>
          {myTickets.length === 0 ? (
            <p className="text-sm text-muted">
              No tickets yet.{" "}
              <Link href="/support" className="text-accent underline">
                File a bug or request a feature
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {myTickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm transition-colors hover:border-primary/50"
                  >
                    <span className="truncate font-medium">{t.title}</span>
                    <Badge>{t.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
