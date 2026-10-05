import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { handleStripeEvent } from "@/lib/stripe-webhooks";
import { env } from "@/lib/env";

/**
 * POST /api/stripe/webhook — signature-verified Stripe events.
 * Register this endpoint in the Stripe dashboard with the events listed in
 * docs/stripe-setup.md.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "no_signature" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error("webhook signature verification failed", e);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (e) {
    console.error(`webhook handler failed for ${event.type}`, e);
    // 500 → Stripe retries; handlers are idempotent so retries are safe.
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
