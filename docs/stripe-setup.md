# Stripe setup for BruLite

Stripe is the payment provider; the BruLite database is the membership
authority. All access decisions come from the `entitlements` table — Stripe
events only ever *update* it via verified webhooks.

## 1. Account & keys

1. Create a Stripe account. **Confirm with Stripe that an OSRS-related
   client/software business is permitted under their current policies before
   launch — do not misrepresent the business.**
2. Developers → API keys → copy the **secret key** → `STRIPE_SECRET_KEY`
   (`sk_test_…` for testing).

## 2. Products & prices (USD)

Create two prices under one product (e.g. "BruLite Membership"):

- Recurring **monthly**, e.g. $9.99 USD → copy `price_…` ID
- Recurring **yearly**, e.g. $99.99 USD → copy `price_…` ID

Then either:

- Set `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_YEARLY` and run
  `npm run db:seed`, or
- Add them via **Admin → Products** on the site (paste the `price_…` IDs).

Future bundles (QoL, automation, …) are added the same way — a new product +
price in Stripe, then bound in the admin panel.

## 3. Webhook

Developers → Webhooks → **Add endpoint**:

- URL: `https://YOUR_DOMAIN/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `charge.refunded`
  - `charge.dispute.created`
  - `charge.dispute.closed`

Copy the endpoint's **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

For local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## 4. Billing portal

Settings → Billing → **Customer portal** → activate (enable cancel +
payment-method update). "Manage billing" on the dashboard links here.

## 5. Behaviour reference

| Event | Effect |
|---|---|
| Checkout completes | subscription + active entitlement, Discord `Customer` role |
| Subscription renewal/updated | entitlement `expiresAt` moves to new period end |
| Cancel at period end | access continues until `current_period_end`, then expires |
| `invoice.payment_failed` | `past_due` — access continues while inside paid period |
| Refund | entitlement **revoked** immediately + role removed |
| Chargeback/dispute opened | entitlement **revoked** + role removed |
| Dispute won (`closed` won) | entitlement recomputed from subscription (restored if still valid) |

All handlers are idempotent and recompute from subscription state, so
out-of-order or retried events converge correctly.

## 6. Test-mode checklist

- [ ] `4242 4242 4242 4242` checkout → webhook → dashboard shows Active, Discord role appears
- [ ] `/api/client/entitlement` returns `entitled: true` for a paired token
- [ ] Cancel in billing portal → still entitled until period end
- [ ] Trigger `customer.subscription.updated` with `past_due` → dashboard warning
- [ ] Issue refund in Stripe → entitlement revoked, role removed
- [ ] Admin revoke → same effect as refund
