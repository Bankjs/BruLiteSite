import { put, del } from "@vercel/blob";

/**
 * Thin wrapper over Vercel Blob. Swap internals for an S3-compatible
 * provider if storage limits become an issue — callers don't change.
 * - "public": plugin images etc. served directly by URL
 * - "private": client releases, streamed through /api/download/client
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

export async function deleteFile(pathnameOrUrl: string): Promise<void> {
  await del(pathnameOrUrl);
}
