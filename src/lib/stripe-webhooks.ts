import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { subscriptions, users } from "@/lib/db/schema";
import {
  revokeEntitlement,
  syncEntitlementFromSubscription,
} from "@/lib/entitlements";
import { getStripe } from "@/lib/payments/stripe";

function subPeriodEnd(sub: Stripe.Subscription): Date {
  const item = sub.items.data[0];
  // Stripe API 2025+: current_period_end lives on subscription items.
  const end =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return new Date((end ?? Math.floor(Date.now() / 1000)) * 1000);
}

function subInterval(sub: Stripe.Subscription): "month" | "year" | null {
  const interval: string | undefined =
    sub.items.data[0]?.price?.recurring?.interval;
  return interval === "month" || interval === "year" ? interval : null;
}

async function userIdFromStripeCustomer(
  customerId: string
): Promise<string | null> {
  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  if (sub) return sub.userId;
  // Fall back to Stripe customer metadata (set at checkout).
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if ("deleted" in customer && customer.deleted) return null;
  return (customer.metadata?.userId as string) ?? null;
}

async function upsertSubscription(
  userId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const values = {
    userId,
    stripeCustomerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    planInterval: subInterval(sub),
    currentPeriodEnd: subPeriodEnd(sub),
    // Newer Stripe API sets cancel_at + canceled_at for cancel-at-period-end
    // while cancel_at_period_end stays false — treat either as canceling.
    cancelAtPeriodEnd:
      sub.cancel_at_period_end ||
      (typeof sub.cancel_at === "number" && sub.cancel_at * 1000 > Date.now()),
    updatedAt: new Date(),
  };
  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: values,
    });
}

async function resolveUserId(
  sub: Stripe.Subscription
): Promise<string | null> {
  const meta = sub.metadata?.userId;
  if (meta) return meta;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  return userIdFromStripeCustomer(customerId);
}

/** Route a verified Stripe event to the appropriate handler. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) return;
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId =
        (session.metadata?.userId as string) ??
        (session.client_reference_id as string) ??
        (await resolveUserId(sub));
      if (!userId) return;
      await upsertSubscription(userId, sub);
      await syncEntitlementFromSubscription(userId);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(sub);
      if (!userId) return;
      await upsertSubscription(userId, sub);
      await syncEntitlementFromSubscription(userId);
      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef =
        (invoice.parent as { subscription_details?: { subscription?: string | Stripe.Subscription } })
          ?.subscription_details?.subscription ??
        (invoice as unknown as { subscription?: string | Stripe.Subscription })
          .subscription;
      if (!subRef) return;
      const subId = typeof subRef === "string" ? subRef : subRef.id;
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = await resolveUserId(sub);
      if (!userId) return;
      await upsertSubscription(userId, sub);
      await syncEntitlementFromSubscription(userId);
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const customerId =
        typeof charge.customer === "string"
          ? charge.customer
          : charge.customer?.id;
      if (!customerId) return;
      const userId = await userIdFromStripeCustomer(customerId);
      if (!userId) return;
      await revokeEntitlement(userId, `refund on charge ${charge.id}`);
      return;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const customerId =
        typeof dispute.charge === "string"
          ? null
          : (dispute.charge?.customer as string | null);
      // Prefer resolving via the charge's customer.
      const chargeId =
        typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
      let userId: string | null = customerId
        ? await userIdFromStripeCustomer(customerId)
        : null;
      if (!userId && chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        const cid =
          typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id;
        if (cid) userId = await userIdFromStripeCustomer(cid);
      }
      if (!userId) return;
      await revokeEntitlement(userId, `chargeback on dispute ${dispute.id}`);
      return;
    }

    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      if (dispute.status !== "won") return;
      const chargeId =
        typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
      if (!chargeId) return;
      const charge = await stripe.charges.retrieve(chargeId);
      const cid =
        typeof charge.customer === "string"
          ? charge.customer
          : charge.customer?.id;
      if (!cid) return;
      const userId = await userIdFromStripeCustomer(cid);
      if (!userId) return;
      // Dispute won — recompute from the subscription so access is restored
      // only if the subscription is genuinely still valid.
      await syncEntitlementFromSubscription(userId);
      return;
    }

    default:
      return;
  }
}

export async function findUserByDiscordId(discordId: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);
  return u ?? null;
}
