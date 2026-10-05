import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "brulite_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  userId: string;
  discordId: string;
  username: string;
  avatar: string | null;
  isAdmin: boolean;
}

function secretKey() {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: payload.userId as string,
      discordId: payload.discordId as string,
      username: payload.username as string,
      avatar: (payload.avatar as string | null) ?? null,
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}

/** Read the current session from cookies (server components / route handlers). */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new Response("Unauthorized", { status: 401 });
  return s;
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireUser();
  if (!s.isAdmin) throw new Response("Forbidden", { status: 403 });
  return s;
}

/** Signed OAuth state payload (carries post-login redirect + pairing code). */
export async function createOAuthState(payload: {
  next?: string;
  pair?: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secretKey());
}

export async function verifyOAuthState(
  state: string
): Promise<{ next?: string; pair?: string }> {
  try {
    const { payload } = await jwtVerify(state, secretKey());
    return { next: payload.next as string | undefined, pair: payload.pair as string | undefined };
  } catch {
    return {};
  }
}

export function avatarUrl(discordId: string, avatar: string | null): string {
  if (!avatar)
    return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) >> BigInt(22)) % 6}.png`;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`;
}
