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
 * - "revoked": subscription "unpaid" (payment failed beyond recovery) — kept
 *   distinct for audit. Refunds/chargebacks/admin actions revoke explicitly
 *   via revokeEntitlement(), not through this function.
 * - "expired": paid period over without renewal — includes normal
 *   cancel-at-period-end lapses and deleted subscriptions.
 */
export function decideEntitlement(
  sub: SubSnapshot | null,
  now: Date
): EntitlementDecision {
  if (!sub) return "expired";
  const paidPeriodOver = sub.currentPeriodEnd <= now;
  if (ACTIVE_SUB_STATUSES.has(sub.status) && !paidPeriodOver) return "active";
  if (sub.status === "unpaid" && paidPeriodOver) return "revoked";
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
