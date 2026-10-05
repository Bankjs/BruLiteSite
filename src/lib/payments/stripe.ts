import Stripe from "stripe";
import { env } from "@/lib/env";
import type { PaymentProvider } from "./provider";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckoutSession({
    userId,
    email,
    stripeCustomerId,
    stripePriceId,
    successUrl,
    cancelUrl,
  }) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      ui_mode: "hosted_page",
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      customer: stripeCustomerId ?? undefined,
      customer_email: stripeCustomerId ? undefined : (email ?? undefined),
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      payment_method_collection: "always",
      submit_type: "auto",
      consent_collection: { terms_of_service: "required" },
      payment_method_options: {
        card: {
          restrictions: {
            brands_blocked: ["american_express", "discover_global_network"],
          },
        },
      },
      saved_payment_method_options: { payment_method_save: "enabled" },
      integration_identifier: "hosted_web_0001",
      origin_context: "web",
    });
    return { url: session.url! };
  },

  async createBillingPortalSession({ stripeCustomerId, returnUrl }) {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  },
};
