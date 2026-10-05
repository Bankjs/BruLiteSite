/**
 * Payment provider abstraction. Stripe is the primary provider; a crypto
 * provider (NOWPayments etc.) can implement this interface later without
 * changing the membership model — the DB remains the source of truth.
 */
export interface CheckoutResult {
  /** URL to redirect the user to in order to pay. */
  url: string;
}

export interface PaymentProvider {
  name: string;
  createCheckoutSession(args: {
    userId: string;
    email: string | null;
    stripeCustomerId: string | null;
    stripePriceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutResult>;
  createBillingPortalSession(args: {
    stripeCustomerId: string;
    returnUrl: string;
  }): Promise<CheckoutResult>;
}
