import Link from "next/link";
import { QuillRingMark } from "@/components/shared/BrandLogo";

/*
 * SiteFooter — the quiet last line of the page.
 *
 * Mounted on logged-out and document surfaces (landing, pricing, about,
 * help, terms, privacy). Deliberately small: one brand mark, one row of
 * plain links, one copyright line. No newsletter forms, no link forests.
 */

const LINKS: { href: string; label: string }[] = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-void">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col items-center gap-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-text-secondary hover:text-paper transition-colors"
        >
          <QuillRingMark className="w-6 h-6 text-gold/60" />
          <span className="font-display text-[13px] tracking-[0.18em] uppercase">
            Quiloria
          </span>
        </Link>

        <nav aria-label="Site" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-text-secondary hover:text-paper transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-[11px] text-text-ghost text-center">
          © 2026 Quiloria — where imagination becomes story.
        </p>
      </div>
    </footer>
  );
}
