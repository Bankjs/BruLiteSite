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

## 4. Tickets forum channel (preferred)

Bug reports and feature requests become **forum posts** — customers can open
the thread, add evidence, and reply; staff discuss in the same thread.

1. In your server: **Create Channel → Forum** — e.g. `#brulite-support`.
2. **Permissions** (channel settings → Permissions):
   - `@everyone`: deny View Channel
   - `Customer` (and any member roles): **View Channel** + **Send Messages in
     Posts**, but **not** Create Posts (only the bot creates threads)
   - `Admin`/staff: as above + manage permissions as needed
3. Optional: create forum tags `Bug` and `Feature`, copy their IDs
   (right-click the tag when editing, or via API) →
   `DISCORD_TICKETS_TAG_BUG` / `DISCORD_TICKETS_TAG_FEATURE`
4. Right-click the forum channel → **Copy Channel ID** →
   `DISCORD_TICKETS_FORUM_ID`

Note: threads are visible to everyone who can see the channel — so staff
comments in a ticket thread are customer-visible by design.

**Fallback:** if `DISCORD_TICKETS_FORUM_ID` is unset, tickets are posted via
channel webhook instead — Channel Settings → Integrations → Webhooks →
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
