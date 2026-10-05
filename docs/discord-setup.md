# Discord setup for BruLite

The site needs a Discord **application** (OAuth) and a **bot** in your server.
Everything below happens in <https://discord.com/developers/applications> and
your Discord client.

## 1. Create the application

1. Discord Developer Portal → **New Application** → name it `BruLite`.
2. **OAuth2** tab → copy **Client ID** → `DISCORD_CLIENT_ID`.
3. **Reset Client Secret** → copy → `DISCORD_CLIENT_SECRET`.
4. OAuth2 → **Redirects** → add:
   - `http://localhost:3000/api/auth/callback/discord`
   - `https://YOUR_DOMAIN/api/auth/callback/discord` (production)

## 2. Create the bot

1. **Bot** tab → **Reset Token** → copy → `DISCORD_BOT_TOKEN` (keep secret).
2. Under Privileged Gateway Intents you can leave defaults — we only use REST.
3. **OAuth2 → URL Generator**: scopes `bot`, permissions **Manage Roles**.
   Open the generated URL and invite the bot to your server.
4. In your server: **Server Settings → Roles** — make sure the bot's role sits
   **above** the `Customer` role in the hierarchy, or role assignment will
   silently fail.

## 3. Roles & IDs

Enable Discord **Developer Mode** (User Settings → Advanced) to copy IDs.

- **Server Settings → Roles → Create Role**:
  - `Customer` — granted automatically on purchase → copy ID → `DISCORD_CUSTOMER_ROLE_ID`
  - `Admin` (or reuse an existing staff role) → copy ID(s) → `DISCORD_ADMIN_ROLE_IDS` (comma-separated)
- Right-click your server icon → **Copy Server ID** → `DISCORD_GUILD_ID`

## 4. Tickets channels

Bug reports and feature requests become **threads** in Discord — customers can
open the thread, add evidence, and reply; staff discuss in the same thread.

Two channel styles are supported — set the env vars that match yours:

- **Forum channels** (recommended): each ticket is a forum post. Set
  `DISCORD_TICKETS_FORUM_BUG` / `DISCORD_TICKETS_FORUM_FEATURE`
  (or a shared `DISCORD_TICKETS_FORUM_ID`).
- **Text channels**: the bot posts the ticket embed and creates a thread on
  the message. Same env vars work — the channel type is detected at runtime.

Setup:

1. Create the channel(s) — e.g. `#bug-reports` and `#feature-requests`.
2. **Permissions** (channel settings → Permissions):
   - `@everyone`: deny View Channel
   - `Customer` (and any member roles): **View Channel** + send messages in
     threads/posts, but **not** Create Posts/Threads (only the bot creates
     them)
   - `Admin`/staff: as above + manage permissions as needed
   - the **bot**: Send Messages + Create Posts/Threads
3. Optional: for forum channels, create `Bug`/`Feature` tags and copy their
   IDs → `DISCORD_TICKETS_TAG_BUG` / `DISCORD_TICKETS_TAG_FEATURE`
4. Right-click each channel → **Copy Channel ID** → the env vars above

Note: threads are visible to everyone who can see the channel — so staff
comments in a ticket thread are customer-visible by design.

**Fallback:** if no forum env var is set, tickets are posted via a channel
webhook instead — Channel Settings → Integrations → Webhooks →
New Webhook → `DISCORD_TICKETS_WEBHOOK_URL`.

## 5. How it fits together

- Users sign in with OAuth scopes `identify email guilds guilds.join` —
  the site calls `PUT /guilds/{id}/members/{user}` with the bot token to
  auto-join them, so **server membership is required** to use the site.
- On purchase / entitlement grant → bot adds `Customer`.
- On expiry / refund / chargeback / admin revoke → bot removes `Customer`.
- Admin status = holding any role in `DISCORD_ADMIN_ROLE_IDS` (checked at
  sign-in and baked into the 7-day session — demoted staff keep access until
  their session expires; ask them to sign out/in to refresh).
