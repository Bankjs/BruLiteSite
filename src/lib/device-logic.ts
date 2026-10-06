/**
 * Pure seat-binding decision for client device fingerprints.
 * The fingerprint is a seat-management identifier — the token remains the
 * credential; this decides whether an incoming fingerprint may be accepted.
 */
export type DeviceDecision =
  | "bind" // no seat claimed yet and the user has room
  | "match" // seat already claimed by this fingerprint
  | "limit" // no seat claimed and the user is at their seat cap
  | "mismatch"; // seat claimed by a different fingerprint

export function decideDeviceBinding(
  existingFingerprint: string | null,
  boundSeatCount: number,
  deviceLimit: number,
  _incomingFingerprint: string
): DeviceDecision {
  if (!existingFingerprint) {
    return boundSeatCount >= deviceLimit ? "limit" : "bind";
  }
  return existingFingerprint === _incomingFingerprint ? "match" : "mismatch";
}
