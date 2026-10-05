import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { termsAcceptances } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const TERMS_VERSION = env.TERMS_VERSION;

/** True if the user has accepted the current Terms of Service version. */
export async function hasAcceptedCurrentTerms(
  userId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: termsAcceptances.id })
    .from(termsAcceptances)
    .where(
      and(
        eq(termsAcceptances.userId, userId),
        eq(termsAcceptances.termsVersion, TERMS_VERSION)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function recordTermsAcceptance(userId: string, ip?: string) {
  await db.insert(termsAcceptances).values({
    userId,
    termsVersion: TERMS_VERSION,
    ip: ip ?? null,
  });
}
