import { describe, it, expect } from "vitest";
import {
  decideEntitlement,
  shouldTransition,
  type SubSnapshot,
} from "./entitlement-logic";

const now = new Date("2026-01-15T00:00:00Z");
const future = new Date("2026-02-15T00:00:00Z");
const past = new Date("2026-01-01T00:00:00Z");

const sub = (status: string, end: Date): SubSnapshot => ({
  status,
  currentPeriodEnd: end,
});

describe("decideEntitlement", () => {
  it("active subscription inside paid period → active", () => {
    expect(decideEntitlement(sub("active", future), now)).toBe("active");
  });

  it("trialing subscription → active", () => {
    expect(decideEntitlement(sub("trialing", future), now)).toBe("active");
  });

  it("past_due but inside paid period → still active", () => {
    expect(decideEntitlement(sub("past_due", future), now)).toBe("active");
  });

  it("canceled before period end → active until the period ends", () => {
    // Stripe marks cancel-at-period-end subs as canceled with future end
    // OR (newer API) still "active" with cancel_at set — both stay entitled.
    expect(decideEntitlement(sub("active", future), now)).toBe("active");
  });

  it("canceled after period end → expired (normal lapse, not revoked)", () => {
    expect(decideEntitlement(sub("canceled", past), now)).toBe("expired");
  });

  it("unpaid after period end → revoked", () => {
    expect(decideEntitlement(sub("unpaid", past), now)).toBe("revoked");
  });

  it("incomplete subscription → expired", () => {
    expect(decideEntitlement(sub("incomplete", future), now)).toBe("expired");
  });

  it("no subscription → expired", () => {
    expect(decideEntitlement(null, now)).toBe("expired");
  });
});

describe("shouldTransition", () => {
  it("reactivates a revoked row when subscription is live again (dispute won)", () => {
    expect(shouldTransition("revoked", "active")).toBe(true);
    expect(shouldTransition("expired", "active")).toBe(true);
  });

  it("deactivates an active row on expiry/revocation", () => {
    expect(shouldTransition("active", "expired")).toBe(true);
    expect(shouldTransition("active", "revoked")).toBe(true);
  });

  it("is a no-op when states already agree", () => {
    expect(shouldTransition("active", "active")).toBe(false);
    expect(shouldTransition("expired", "expired")).toBe(false);
  });
});
