import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  ShieldCheck,
  Puzzle,
  LifeBuoy,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/auth";

const features = [
  {
    icon: Zap,
    title: "Built for speed",
    body: "A lightweight client tuned for smooth gameplay — low overhead, fast startup, GPU-accelerated.",
  },
  {
    icon: Puzzle,
    title: "Powerful plugins",
    body: "Quality-of-life and automation plugins maintained by the BruLite team, all included with membership.",
  },
  {
    icon: ShieldCheck,
    title: "Account-first security",
    body: "Sign in with Discord. Your membership is verified through our secure API — nothing sensitive lives in the client.",
  },
  {
    icon: LifeBuoy,
    title: "Real support",
    body: "File bugs and feature requests directly from the site. Our team triages everything through Discord.",
  },
];

export default async function Home() {
  const session = await getSession();

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-accent">
              Custom OSRS client
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Play Old School,
              <br />
              <span className="bg-gradient-to-r from-primary-bright to-accent bg-clip-text text-transparent">
                the BruLite way.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              A fast, plugin-powered client for Old School RuneScape. Sign in
              with Discord, grab a membership, and you&apos;re in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary-bright"
              >
                Get BruLite <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/plugins"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 font-medium transition-colors hover:border-primary/60"
              >
                Browse plugins
              </Link>
              {session && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-accent transition-colors hover:text-foreground"
                >
                  Go to dashboard →
                </Link>
              )}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-2xl" />
            <Image
              src="/logo.png"
              alt="BruLite"
              width={560}
              height={560}
              priority
              className="relative rounded-3xl border border-border shadow-2xl shadow-primary/20"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Why BruLite?</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title}>
                <f.icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to upgrade your client?
          </h2>
          <p className="mt-4 text-muted">
            Membership unlocks the client download, every plugin, and access to
            the BruLite community on Discord.
          </p>
          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-medium text-white shadow-lg shadow-primary/30 transition-colors hover:bg-primary-bright"
          >
            See pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
