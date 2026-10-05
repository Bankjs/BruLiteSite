import { put, del } from "@vercel/blob";
import { env } from "@/lib/env";

/**
 * Thin wrapper over Vercel Blob. Swap internals for an S3-compatible
 * provider if storage limits become an issue — callers don't change.
 * - "public": only for public-access stores (unused — our store is private)
 * - "private": releases, ticket screenshots, plugin images — served through
 *   /api/download/client or the /api/blob proxy (see proxyUrl)
 */
export async function uploadFile(
  pathname: string,
  file: File | Blob,
  access: "public" | "private" = "public"
): Promise<{ url: string; pathname: string }> {
  const res = await put(pathname, file, {
    access,
    addRandomSuffix: true,
  });
  return { url: res.url, pathname: res.pathname };
}

/**
 * Wrap a private blob URL in our public read proxy — stable absolute URL for
 * <img> tags and Discord embeds on private-access stores.
 */
export function proxyUrl(blobUrl: string): string {
  return `${env.APP_URL}/api/blob?u=${encodeURIComponent(blobUrl)}`;
}

export async function deleteFile(pathnameOrUrl: string): Promise<void> {
  await del(pathnameOrUrl);
}
