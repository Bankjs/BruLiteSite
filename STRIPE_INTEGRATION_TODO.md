# Stripe Integration TODO

Checkout is already fully integrated (hosted Checkout Sessions). This file
tracks what's left before payments work end-to-end.

## Values to Replace

**Files containing placeholders:**
- [.env.local](.env.local) / Vercel environment variables

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Real key from Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Signing secret from Dashboard → Developers → Webhooks after adding the endpoint below |
| `BLOB_READ_WRITE_TOKEN` | _(empty)_ | Vercel → Storage → Blob token (needed for client downloads, not payments) |

**Webhook endpoint to register:** `https://brulitesite.vercel.app/api/stripe/webhook`
Events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`,
`charge.dispute.closed` — full details in [docs/stripe-setup.md](docs/stripe-setup.md).

**Prices:** create the monthly + yearly recurring USD prices in Stripe, then
bind them either via `STRIPE_PRICE_ID_MONTHLY`/`_YEARLY` + `npm run db:seed`,
or in **Admin → Products**.

## Configured Parameters

**Files containing these parameters:**
- [src/lib/payments/stripe.ts](src/lib/payments/stripe.ts)

| Parameter | Value |
|-----------|-------|
| `ui_mode` | `hosted_page` (stripe SDK 23 ≥ 21) |
| `billing_address_collection` | `auto` |
| `phone_number_collection` | `{ enabled: false }` |
| `automatic_tax` | `{ enabled: false }` |
| `allow_promotion_codes` | `false` |
| `payment_method_collection` | `always` |
| `submit_type` | `auto` |
| `consent_collection.terms_of_service` | `required` |
| `payment_method_options.card.restrictions.brands_blocked` | `american_express`, `discover_global_network` |
| `saved_payment_method_options.payment_method_save` | `enabled` |
| `integration_identifier` | `hosted_web_0001` |
| `origin_context` | `web` |

Already-real values kept (not placeholders): `mode: "subscription"`,
`success_url`/`cancel_url` (from `NEXT_PUBLIC_APP_URL`), `line_items` (Stripe
price IDs loaded from the DB `prices` table).

## Setup and next steps

1. Env vars above into `.env.local` **and** Vercel → Settings → Environment
   Variables, then redeploy.
2. Register the webhook endpoint (above) → copy `whsec_…` → `STRIPE_WEBHOOK_SECRET`.
3. Create Stripe products/prices (USD, monthly + yearly recurring), then seed
   or add via admin.
4. Enable the Customer Portal: Settings → Billing → Customer portal (needed by
   "Manage billing" on the dashboard).

### Flow overview

User signs in via Discord → accepts ToS (recorded in `terms_acceptances` with
version + IP) → `/api/checkout` creates the Stripe session → webhook
`checkout.session.completed` creates the subscription + active entitlement +
grants the Discord Customer role → client verifies via
`/api/client/entitlement`.

Note: Stripe's own `consent_collection.terms_of_service = required` adds a
second ToS checkbox on the Stripe page — that's the Studio config and is fine
(ours is the versioned record that gates checkout).

### Testing

Test card: `4242 4242 4242 4242`, any future expiry/CVC/ZIP.
Local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
Full checklist: [docs/stripe-setup.md](docs/stripe-setup.md) §6.

Resources: https://support.stripe.com · https://docs.stripe.com
