/**
 * Typed access to environment variables. Throws on access when a required
 * variable is missing, so misconfiguration fails fast at request time.
 */
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get DATABASE_URL() {
    return req("DATABASE_URL");
  },
  get AUTH_SECRET() {
    return req("AUTH_SECRET");
  },
  get APP_URL() {
    return opt("NEXT_PUBLIC_APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },
  get DISCORD_CLIENT_ID() {
    return req("DISCORD_CLIENT_ID");
  },
  get DISCORD_CLIENT_SECRET() {
    return req("DISCORD_CLIENT_SECRET");
  },
  get DISCORD_BOT_TOKEN() {
    return req("DISCORD_BOT_TOKEN");
  },
  get DISCORD_GUILD_ID() {
    return req("DISCORD_GUILD_ID");
  },
  get DISCORD_CUSTOMER_ROLE_ID() {
    return req("DISCORD_CUSTOMER_ROLE_ID");
  },
  get DISCORD_ADMIN_ROLE_IDS() {
    return opt("DISCORD_ADMIN_ROLE_IDS")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
  /** Channel webhook used to post new tickets to Discord. */
  get DISCORD_TICKETS_WEBHOOK_URL() {
    return opt("DISCORD_TICKETS_WEBHOOK_URL");
  },
  get STRIPE_SECRET_KEY() {
    return req("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return req("STRIPE_WEBHOOK_SECRET");
  },
  /** Returns the site base URL; needed when building absolute URLs server-side. */
  get TERMS_VERSION() {
    return opt("TERMS_VERSION", "1");
  },
};
