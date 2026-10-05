/**
 * Pure entitlement decision logic — extracted for unit testing.
 */

export const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

export type SubSnapshot = {
  status: string;
  currentPeriodEnd: Date;
};

export type EntitlementDecision = "active" | "expired" | "revoked";

/**
 * Given the latest subscription snapshot and current time, decide what the
 * entitlement state should be:
 * - "active": subscription in a good/limbo status AND paid period not over
 * - "revoked": subscription dead (canceled/unpaid) AND paid period over —
 *   kept distinct for audit ("was cut off" vs "simply lapsed")
 * - "expired": paid period over without a terminal Stripe status
 *   (e.g. canceled with cancel_at_period_end honored, or sub deleted)
 */
export function decideEntitlement(
  sub: SubSnapshot | null,
  now: Date
): EntitlementDecision {
  if (!sub) return "expired";
  const paidPeriodOver = sub.currentPeriodEnd <= now;
  if (ACTIVE_SUB_STATUSES.has(sub.status) && !paidPeriodOver) return "active";
  if (["canceled", "unpaid"].includes(sub.status) && paidPeriodOver)
    return "revoked";
  return "expired";
}

/** Should a stored entitlement row change state? */
export function shouldTransition(
  storedStatus: string,
  decision: EntitlementDecision
): boolean {
  return decision === "active"
    ? storedStatus !== "active"
    : storedStatus === "active";
}
