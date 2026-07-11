import type { AdventureInk } from "@/types/adventure";

// Per-seat ink styling. The Director always writes in gold; writers
// pick an ink when they take their seat.
export const INK_STYLES: Record<
  AdventureInk,
  { text: string; pip: string; dot: string; stroke: string }
> = {
  amber: { text: "text-amber", pip: "bg-amber", dot: "bg-amber", stroke: "var(--color-amber)" },
  rose: { text: "text-rose", pip: "bg-rose", dot: "bg-rose", stroke: "var(--color-rose)" },
  sage: { text: "text-sage", pip: "bg-sage", dot: "bg-sage", stroke: "var(--color-sage)" },
  lavender: { text: "text-lavender", pip: "bg-lavender", dot: "bg-lavender", stroke: "var(--color-lavender)" },
  teal: { text: "text-teal", pip: "bg-teal", dot: "bg-teal", stroke: "var(--color-teal)" },
  copper: { text: "text-copper", pip: "bg-copper", dot: "bg-copper", stroke: "var(--color-copper)" },
};

export const INK_CHOICES = Object.keys(INK_STYLES) as AdventureInk[];

export function inkFor(ink: string): (typeof INK_STYLES)[AdventureInk] {
  return INK_STYLES[ink as AdventureInk] ?? INK_STYLES.amber;
}
