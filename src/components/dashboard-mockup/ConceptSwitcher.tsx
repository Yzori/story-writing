import Link from "next/link";

// Quick hop between dashboard mockups so they can be compared without bouncing
// through the index. Throwaway support for the design exploration.
const CONCEPTS = [
  { key: "spillover", href: "/dashboard-mockup/spillover", label: "Spillover" },
  { key: "worlds", href: "/dashboard-mockup/worlds", label: "Two Worlds" },
  { key: "hearth", href: "/dashboard-mockup/hearth", label: "Hearth" },
  { key: "treehouse", href: "/dashboard-mockup/treehouse", label: "Treehouse" },
  { key: "bookshop", href: "/dashboard-mockup/bookshop", label: "Bookshop" },
  { key: "banner", href: "/dashboard-mockup/banner", label: "Banner" },
  { key: "canon", href: "/dashboard-mockup/canon", label: "Work-hero" },
  { key: "brief", href: "/dashboard-mockup/brief", label: "Brief" },
  { key: "mosaic", href: "/dashboard-mockup/mosaic", label: "Mosaic" },
  { key: "coexist", href: "/dashboard-mockup/coexist", label: "Coexist" },
  { key: "studio", href: "/dashboard-mockup/studio", label: "Studio (toggle)" },
];

export function ConceptSwitcher({ current }: { current: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.18em] text-text-ghost">compare:</span>
      {CONCEPTS.map((c) => {
        const active = c.key === current;
        return (
          <Link
            key={c.key}
            href={c.href}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${active ? "border-amber/50 bg-amber/15 text-amber" : "border-border-subtle text-text-secondary hover:border-border hover:text-paper"}`}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
