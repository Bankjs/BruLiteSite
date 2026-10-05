import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { stripeProvider } from "@/lib/payments/stripe";
import { env } from "@/lib/env";

/** POST /api/portal — redirect to Stripe billing portal for the customer. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!sub) {
    return NextResponse.json({ error: "no_customer" }, { status: 404 });
  }

  try {
    const portal = await stripeProvider.createBillingPortalSession({
      stripeCustomerId: sub.stripeCustomerId,
      returnUrl: `${env.APP_URL}/dashboard`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error("portal failed", e);
    return NextResponse.json({ error: "portal_unavailable" }, { status: 502 });
  }
}
