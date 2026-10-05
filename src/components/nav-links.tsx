"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
  accent?: boolean;
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active =
          pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "relative text-sm transition-colors",
              active
                ? "text-foreground"
                : l.accent
                  ? "text-accent hover:text-foreground"
                  : "text-muted hover:text-foreground"
            )}
          >
            {l.label}
            {active && (
              <span className="absolute -bottom-[21px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
            )}
          </Link>
        );
      })}
    </>
  );
}
