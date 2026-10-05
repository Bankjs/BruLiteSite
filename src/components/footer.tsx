import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} BruLite. Not affiliated with Jagex Ltd.</p>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link href="/faq" className="hover:text-foreground transition-colors">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
}
