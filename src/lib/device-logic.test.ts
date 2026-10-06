import { describe, expect, it } from "vitest";
import { decideDeviceBinding } from "./device-logic";

describe("decideDeviceBinding", () => {
  it("binds a new device when seats remain", () => {
    expect(decideDeviceBinding(null, 0, 2, "fp-a")).toBe("bind");
    expect(decideDeviceBinding(null, 1, 2, "fp-b")).toBe("bind");
  });

  it("rejects a new device at the seat cap", () => {
    expect(decideDeviceBinding(null, 2, 2, "fp-c")).toBe("limit");
    expect(decideDeviceBinding(null, 5, 2, "fp-c")).toBe("limit");
  });

  it("accepts the already-bound fingerprint", () => {
    expect(decideDeviceBinding("fp-a", 2, 2, "fp-a")).toBe("match");
  });

  it("rejects a different fingerprint on a bound token", () => {
    expect(decideDeviceBinding("fp-a", 0, 2, "fp-b")).toBe("mismatch");
  });

  it("per-user limit overrides are honored", () => {
    expect(decideDeviceBinding(null, 4, 5, "fp-x")).toBe("bind");
    expect(decideDeviceBinding(null, 5, 5, "fp-x")).toBe("limit");
  });
});
