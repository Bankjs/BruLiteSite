"use client";

import { useState } from "react";
import { Select } from "@/components/ui";
import { useRouter } from "next/navigation";

const STATUSES = ["open", "in_progress", "resolved", "closed"];

export function TicketStatusSelect({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <Select
      value={status}
      disabled={saving}
      onChange={async (e) => {
        setSaving(true);
        await fetch(`/api/admin/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: e.target.value }),
        });
        setSaving(false);
        router.refresh();
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </Select>
  );
}
