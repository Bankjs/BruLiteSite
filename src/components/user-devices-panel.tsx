"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type TokenRow = {
  id: string;
  label: string;
  deviceName: string | null;
  boundAt: string | null;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function fmt(d: string | null) {
  return d
    ? new Date(d).toLocaleDateString("en-GB", { dateStyle: "medium" })
    : "—";
}

/** Expandable admin panel: per-user device seats and token management. */
export function UserDevicesPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{
    deviceLimit: number;
    tokens: TokenRow[];
  } | null>(null);
  const [limit, setLimit] = useState("2");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/users/${userId}/devices`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setLimit(String(json.deviceLimit));
    }
  }

  async function act(body: object) {
    setBusy(true);
    try {
      await fetch(`/api/admin/users/${userId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(true);
          if (!data) load();
        }}
      >
        Devices
      </Button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-lg border border-border bg-surface-2 p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium">Client devices</p>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-muted">Seat limit</label>
        <input
          type="number"
          min={1}
          max={20}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="w-16 rounded border border-border bg-surface px-2 py-1 text-xs"
        />
        <Button
          variant="secondary"
          disabled={busy || Number(limit) === data?.deviceLimit}
          onClick={() =>
            act({ action: "set_limit", deviceLimit: Number(limit) })
          }
        >
          Save
        </Button>
      </div>

      {!data ? (
        <p className="mt-3 text-xs text-muted">Loading…</p>
      ) : data.tokens.length === 0 ? (
        <p className="mt-3 text-xs text-muted">No client tokens.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs"
            >
              <div>
                <span className="font-medium">{t.label}</span>
                {t.revokedAt && (
                  <span className="ml-2 text-red-400">revoked</span>
                )}
                <p className="text-muted">
                  {t.deviceName ?? "no device"} · expires {fmt(t.expiresAt)}
                  {t.lastUsedAt && ` · used ${fmt(t.lastUsedAt)}`}
                </p>
              </div>
              {!t.revokedAt && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    confirm("Revoke this token / unbind its device?") &&
                    act({ action: "revoke", tokenId: t.id })
                  }
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
