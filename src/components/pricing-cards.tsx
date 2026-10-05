"use client";

import { useState } from "react";
import { Button, Card, Badge } from "@/components/ui";
import { formatUsd } from "@/lib/utils";
import { Check } from "lucide-react";

interface Price {
  priceId: string;
  interval: string;
  amountUsdCents: number;
  productName: string;
  description: string | null;
  category: string;
}

const INTERVAL_LABEL: Record<string, string> = {
  month: "/month",
  year: "/year",
  one_time: "one-time",
};

export function PricingCards({
  prices,
  signedIn,
}: {
  prices: Price[];
  signedIn: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(priceId: string) {
    setError(null);
    setLoading(priceId);
    try {
      const t = await fetch("/api/terms/accept", { method: "POST" });
      if (!t.ok) throw new Error("terms");
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "checkout");
      window.location.assign(data.url);
    } catch {
      setError("Checkout is unavailable right now — please try again later.");
      setLoading(null);
    }
  }

  if (prices.length === 0) {
    return (
      <Card className="py-16 text-center text-muted">
        Membership options aren&apos;t available yet — join the Discord for
        launch news.
      </Card>
    );
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        {prices.map((p) => (
          <Card key={p.priceId} className="flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {p.interval === "year" ? "Yearly" : "Monthly"}
              </h3>
              {p.interval === "year" && <Badge tone="purple">Best value</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted">
              {p.description ?? `${p.productName} membership`}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                {formatUsd(p.amountUsdCents)}
              </span>
              <span className="text-sm text-muted">
                {INTERVAL_LABEL[p.interval] ?? p.interval}
              </span>
            </div>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-muted">
              {[
                "BruLite client download",
                "All included plugins",
                "Customer role on Discord",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" /> {f}
                </li>
              ))}
            </ul>
            {signedIn ? (
              <Button
                className="mt-6 w-full"
                disabled={!accepted || loading !== null}
                onClick={() => buy(p.priceId)}
              >
                {loading === p.priceId ? "Redirecting…" : "Subscribe"}
              </Button>
            ) : (
              <a
                href="/api/auth/discord?next=/pricing"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-bright"
              >
                Sign in with Discord to subscribe
              </a>
            )}
          </Card>
        ))}
      </div>

      {signedIn && (
        <label className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span>
            I have read and agree to the{" "}
            <a href="/terms" className="text-accent underline">
              BruLite Terms of Service
            </a>
            , including the subscription, cancellation and refund policies.
          </span>
        </label>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
