"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export function EntitlementActions({
  userId,
  entitled,
}: {
  userId: string;
  entitled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "grant" | "revoke") {
    setBusy(true);
    try {
      const body =
        action === "revoke"
          ? { action, reason: "revoked by admin" }
          : { action };
      await fetch(`/api/admin/users/${userId}/entitlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      {!entitled && (
        <Button variant="secondary" disabled={busy} onClick={() => act("grant")}>
          Grant access
        </Button>
      )}
      {entitled && (
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (confirm("Revoke this user's access?")) act("revoke");
          }}
        >
          Revoke
        </Button>
      )}
    </div>
  );
}
