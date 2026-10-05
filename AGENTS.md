<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BruLite site

Website + backend for the BruLite OSRS client (Next.js 16 App Router, Tailwind v4, Neon Postgres + Drizzle, Stripe, Discord OAuth).

- **Membership authority is the DB `entitlements` table** — Stripe only feeds it via `/api/stripe/webhook`. Client access is checked via `/api/client/entitlement` (Bearer token from the pair flow); the Discord Customer role mirrors entitlement state.
- Verify: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
- DB: `npm run db:generate` (migrations from `src/lib/db/schema.ts`), `db:migrate`, `db:seed`
- Env vars documented in `.env.example`; setup guides in `docs/`
