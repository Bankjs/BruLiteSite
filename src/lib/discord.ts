import { env } from "@/lib/env";

const API = "https://discord.com/api/v10";

function botHeaders() {
  return {
    Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
}

export interface DiscordMember {
  roles: string[];
  user?: DiscordUser;
}

/** Exchange an OAuth2 code for an access token. */
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  token_type: string;
}> {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.APP_URL}/api/auth/callback/discord`,
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status}`);
  return res.json();
}

/** Fetch the authed user's Discord profile using their OAuth access token. */
export async function fetchDiscordUser(
  accessToken: string
): Promise<DiscordUser> {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord @me failed: ${res.status}`);
  return res.json();
}

/**
 * Add the user to the BruLite guild via their OAuth access token
 * (requires the `guilds.join` scope).
 */
export async function joinGuild(
  discordUserId: string,
  accessToken: string
): Promise<boolean> {
  const res = await fetch(
    `${API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}`,
    {
      method: "PUT",
      headers: botHeaders(),
      body: JSON.stringify({ access_token: accessToken }),
    }
  );
  // 201 = joined, 204 = already a member
  if (res.status === 201 || res.status === 204) return true;
  console.error("joinGuild failed", res.status, await res.text());
  return false;
}

/** Get a guild member (bot token). Returns null when not a member. */
export async function getGuildMember(
  discordUserId: string
): Promise<DiscordMember | null> {
  const res = await fetch(
    `${API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}`,
    { headers: botHeaders(), cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error("getGuildMember failed", res.status);
    return null;
  }
  return res.json();
}

export async function isGuildMember(discordUserId: string): Promise<boolean> {
  return (await getGuildMember(discordUserId)) !== null;
}

/** Add a role to a guild member (e.g. the Customer role on purchase). */
export async function addGuildRole(
  discordUserId: string,
  roleId: string
): Promise<boolean> {
  const res = await fetch(
    `${API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
    { method: "PUT", headers: botHeaders() }
  );
  if (!res.ok) {
    console.error("addGuildRole failed", res.status, await res.text());
    return false;
  }
  return true;
}

export async function removeGuildRole(
  discordUserId: string,
  roleId: string
): Promise<boolean> {
  const res = await fetch(
    `${API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
    { method: "DELETE", headers: botHeaders() }
  );
  if (!res.ok && res.status !== 404) {
    console.error("removeGuildRole failed", res.status, await res.text());
    return false;
  }
  return true;
}

/** Does this member hold any of the configured admin roles? */
export function memberIsAdmin(member: DiscordMember | null): boolean {
  if (!member) return false;
  const adminIds = new Set(env.DISCORD_ADMIN_ROLE_IDS);
  return member.roles.some((r) => adminIds.has(r));
}

export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/api/auth/callback/discord`,
    response_type: "code",
    scope: "identify email guilds guilds.join",
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Post a new ticket to Discord. Preferred path: create a forum post (thread)
 * in the tickets forum channel — customers can reply with evidence and staff
 * discuss in-thread. Falls back to a channel webhook message when no forum
 * is configured. Returns the thread/message ID, or null.
 */
export interface TicketPost {
  ticketId: string;
  type: "bug" | "feature";
  title: string;
  body: string;
  username: string;
  steps?: string | null;
  extra?: string | null;
  imageUrl?: string | null;
}

export async function postTicketToDiscord(
  args: TicketPost
): Promise<string | null> {
  const forumId =
    args.type === "bug"
      ? env.DISCORD_TICKETS_FORUM_BUG || env.DISCORD_TICKETS_FORUM_ID
      : env.DISCORD_TICKETS_FORUM_FEATURE || env.DISCORD_TICKETS_FORUM_ID;
  if (forumId) return postTicketForumThread(forumId, args);
  return postTicketWebhook(args);
}

function ticketEmbed(args: TicketPost) {
  const fields = [
    { name: "Ticket", value: args.ticketId, inline: true },
    { name: "From", value: args.username, inline: true },
  ];
  if (args.steps) {
    fields.push({
      name: "Steps to reproduce",
      value: args.steps.slice(0, 1024),
      inline: false,
    });
  }
  if (args.extra) {
    fields.push({
      name: "Other info",
      value: args.extra.slice(0, 1024),
      inline: false,
    });
  }
  return {
    title: `${args.type === "bug" ? "🐛 Bug" : "💡 Feature"}: ${args.title}`,
    description: args.body.slice(0, 4000),
    color: args.type === "bug" ? 0xef4444 : 0x8b5cf6,
    fields,
    ...(args.imageUrl ? { image: { url: args.imageUrl } } : {}),
    url: `${env.APP_URL}/admin/tickets`,
  };
}

async function fetchChannel(
  channelId: string
): Promise<{ id: string; type: number } | null> {
  const res = await fetch(`${API}/channels/${channelId}`, {
    headers: botHeaders(),
  });
  if (!res.ok) {
    console.error("fetchChannel failed", res.status, await res.text());
    return null;
  }
  return res.json();
}

function ticketThreadName(args: Pick<TicketPost, "type" | "title">): string {
  return `${args.type === "bug" ? "[Bug]" : "[Feature]"} ${args.title}`.slice(
    0,
    100
  );
}

async function postTicketForumThread(
  channelId: string,
  args: TicketPost
): Promise<string | null> {
  const channel = await fetchChannel(channelId);
  if (!channel) return null;

  // 15 = forum, 16 = media — these take a `message` payload on creation.
  if (channel.type === 15 || channel.type === 16) {
    const tag =
      args.type === "bug"
        ? env.DISCORD_TICKETS_TAG_BUG
        : env.DISCORD_TICKETS_TAG_FEATURE;
    const res = await fetch(`${API}/channels/${channelId}/threads`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({
        name: ticketThreadName(args),
        applied_tags: tag ? [tag] : [],
        message: { embeds: [ticketEmbed(args)] },
      }),
    });
    if (!res.ok) {
      console.error("forum thread failed", res.status, await res.text());
      return null;
    }
    const thread = (await res.json()) as { id?: string };
    return thread.id ?? null;
  }

  // Text channel: post the embed first, then create a thread from it.
  const msgRes = await fetch(`${API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({ embeds: [ticketEmbed(args)] }),
  });
  if (!msgRes.ok) {
    console.error("channel message failed", msgRes.status, await msgRes.text());
    return null;
  }
  const msg = (await msgRes.json()) as { id: string };

  const threadRes = await fetch(
    `${API}/channels/${channelId}/messages/${msg.id}/threads`,
    {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ name: ticketThreadName(args) }),
    }
  );
  if (!threadRes.ok) {
    console.error("message thread failed", threadRes.status, await threadRes.text());
    return msg.id; // message posted even if threading failed
  }
  const thread = (await threadRes.json()) as { id?: string };
  return thread.id ?? msg.id;
}

async function postTicketWebhook(
  args: TicketPost
): Promise<string | null> {
  const webhook = env.DISCORD_TICKETS_WEBHOOK_URL;
  if (!webhook) return null;
  try {
    const res = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "BruLite Support",
        embeds: [ticketEmbed(args)],
      }),
    });
    if (!res.ok) {
      console.error("ticket webhook failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch (e) {
    console.error("ticket webhook error", e);
    return null;
  }
}
