import { describe, it, expect } from "vitest";
import { generateToken, hashToken, generatePairCode } from "./tokens";
import { rateLimit } from "./rate-limit";

describe("tokens", () => {
  it("generates unique opaque tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes tokens deterministically (sha256)", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(t)).not.toContain(t);
  });

  it("generates unique pair codes", () => {
    expect(generatePairCode()).not.toBe(generatePairCode());
  });
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).ok).toBe(true);
    }
    const r = rateLimit(key, 5, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("uses independent buckets per key", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });
});
