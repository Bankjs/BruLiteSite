"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export function DeleteTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="danger"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Delete this ticket and its Discord thread?")) return;
        setBusy(true);
        await fetch(`/api/admin/tickets/${ticketId}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Delete
    </Button>
  );
}
