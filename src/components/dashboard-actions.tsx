"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/portal", { method: "POST" });
          const data = await res.json();
          if (res.ok && data.url) window.location.assign(data.url);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Opening…" : "Manage billing"}
    </Button>
  );
}

export function RevokeTokenButton({ tokenId }: { tokenId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await fetch("/api/client/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId }),
        });
        router.refresh();
      }}
    >
      Revoke
    </Button>
  );
}

/** Shown once after mint/regenerate — the server never reveals it again. */
function OneTimeToken({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-xs font-medium text-amber-300">
        Copy this token now — it will not be shown again. Paste it into the
        BruLite client&apos;s &quot;Enter client token&quot; field.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-surface-2 px-3 py-2 font-mono text-xs">
          {token}
        </code>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(token);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

export function NewTokenButton() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  if (token)
    return (
      <OneTimeToken
        token={token}
        onDone={() => {
          setToken(null);
          router.refresh();
        }}
      />
    );

  return (
    <Button
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/client/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const data = await res.json();
          if (res.ok && data.token) setToken(data.token);
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Creating…" : "New client token"}
    </Button>
  );
}

export function RegenerateTokenButton({ tokenId }: { tokenId: string }) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  if (token)
    return (
      <OneTimeToken
        token={token}
        onDone={() => {
          setToken(null);
          router.refresh();
        }}
      />
    );

  return (
    <Button
      variant="ghost"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/client/tokens/${tokenId}/regenerate`, {
            method: "POST",
          });
          const data = await res.json();
          if (res.ok && data.token) setToken(data.token);
        } finally {
          setLoading(false);
        }
      }}
    >
      Regenerate
    </Button>
  );
}
