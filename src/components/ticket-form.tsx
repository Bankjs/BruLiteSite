"use client";

import { useState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { useRouter } from "next/navigation";

export function TicketForm() {
  const router = useRouter();
  const [type, setType] = useState<"bug" | "feature">("bug");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "rate_limited"
            ? "Slow down — too many tickets in a short time."
            : "Couldn't create the ticket — check the fields and try again."
        );
        return;
      }
      setTitle("");
      setBody("");
      router.push(`/support/${data.ticket.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="type">Type</Label>
        <Select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as "bug" | "feature")}
        >
          <option value="bug">Bug report</option>
          <option value="feature">Feature request</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === "bug"
              ? "e.g. Client crashes on startup"
              : "e.g. Add a loot tracker overlay"
          }
          required
          minLength={5}
          maxLength={200}
        />
      </div>
      <div>
        <Label htmlFor="body">Details</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            type === "bug"
              ? "What happened? Steps to reproduce, error messages, client version…"
              : "Describe the feature and why it's useful…"
          }
          required
          minLength={10}
          maxLength={5000}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting…" : `Submit ${type === "bug" ? "bug" : "request"}`}
      </Button>
    </form>
  );
}
