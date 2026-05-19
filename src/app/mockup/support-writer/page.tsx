"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Mockup context ──────────────────────────────────────────────────────────

const WRITER = {
  name: "Iris Halloran",
  handle: "@irishal",
  storyTitle: "Reagent of Salt",
};

type Scenario = "circle-active" | "tip-only" | "gated-reader" | "crossroad-live";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SupportWriterMockup() {
  const [scenario, setScenario] = useState<Scenario>("circle-active");
  const [readerBalance, setReaderBalance] = useState(42);
  const [tipping, setTipping] = useState(false);
  const [tipAmount, setTipAmount] = useState(10);

  return (
    <div className="min-h-screen bg-void text-text">
      {/* Mockup chrome — switcher */}
      <div className="border-b border-border-subtle bg-ink/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="text-[10px] uppercase tracking-[0.3em] text-text-ghost">Mockup · Support module</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["circle-active", "Writer has a Circle"],
                ["tip-only", "Only tips enabled"],
                ["gated-reader", "Reader hit a lock"],
                ["crossroad-live", "Crossroad is live"],
              ] as [Scenario, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setScenario(id)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  scenario === id
                    ? "border-amber/40 bg-amber/15 text-amber"
                    : "border-border-subtle bg-surface/60 text-text-secondary hover:border-amber/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Faux story-page context to ground the module */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1fr_380px]">
        <FauxStorySide />

        <div className="self-start lg:sticky lg:top-8">
          <SupportModule
            scenario={scenario}
            balance={readerBalance}
            onTip={() => setTipping(true)}
            onSpend={(amount) => setReaderBalance((b) => Math.max(0, b - amount))}
          />
        </div>
      </div>

      {/* Compact reader-end mirror */}
      <div className="border-t border-border-subtle bg-ink/30">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-ghost">
              Same module · compact form
            </div>
            <div className="text-[11px] italic text-text-ghost">at the foot of a chapter in the reader</div>
          </div>
          <FauxChapterEnd />
          <SupportFooter
            scenario={scenario}
            onTip={() => setTipping(true)}
            onSpend={(amount) => setReaderBalance((b) => Math.max(0, b - amount))}
          />
        </div>
      </div>

      {/* Tip drawer */}
      <AnimatePresence>
        {tipping && (
          <TipDrawer
            balance={readerBalance}
            amount={tipAmount}
            setAmount={setTipAmount}
            writerName={WRITER.name}
            onClose={() => setTipping(false)}
            onSend={() => {
              setReaderBalance((b) => Math.max(0, b - tipAmount));
              setTipping(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Support module ──────────────────────────────────────────────────────────

function SupportModule({
  scenario,
  balance,
  onTip,
  onSpend,
}: {
  scenario: Scenario;
  balance: number;
  onTip: () => void;
  onSpend: (amount: number) => void;
}) {
  // Which option is primary depends on context
  const hasCircle = scenario === "circle-active" || scenario === "gated-reader" || scenario === "crossroad-live";
  const hasLock = scenario === "gated-reader";
  const hasCrossroad = scenario === "crossroad-live";

  // Primary CTA selection (top to bottom of fallback order)
  let primary: "unlock" | "circle" | "tip" = "tip";
  if (hasLock) primary = "unlock";
  else if (hasCircle) primary = "circle";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber/20 bg-gradient-to-br from-surface via-surface to-ink/90 shadow-2xl shadow-void/40">
      {/* Warm ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.10),transparent_55%)]" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-copper/[0.08] blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">
          A way to stand with
        </div>
        <h3 className="font-display text-[24px] font-light leading-tight text-paper">
          {WRITER.name}
        </h3>
        <p className="mt-1 text-[12px] text-text-ghost">
          {WRITER.storyTitle} · {WRITER.handle}
        </p>

        <div className="mt-5 space-y-3">
          {/* Primary action */}
          {primary === "unlock" && <PrimaryUnlock onClick={() => onSpend(60)} />}
          {primary === "circle" && <PrimaryCircle onClick={() => onSpend(5)} />}
          {primary === "tip" && <PrimaryTip onClick={onTip} />}

          {/* Crossroad — promoted only if live */}
          {hasCrossroad && <CrossroadCard />}
        </div>

        {/* Secondary row — every other path, quietly */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {primary !== "tip" && (
            <SecondaryChip
              icon={<TipIcon />}
              label="Leave a gift"
              meta="pay what you want"
              onClick={onTip}
            />
          )}
          {primary !== "circle" && hasCircle && (
            <SecondaryChip
              icon={<CircleIcon />}
              label="Join the Circle"
              meta="5 drops / month"
            />
          )}
          {primary !== "unlock" && hasLock && (
            <SecondaryChip
              icon={<UnlockIcon />}
              label="Unlock all chapters"
              meta="60 drops · saves 30%"
              onClick={() => onSpend(60)}
            />
          )}
          <SecondaryChip
            icon={<CommissionIcon />}
            label="Commission them"
            meta="from 200 drops"
            href="/commissions"
          />
        </div>

        {/* Currency layer */}
        <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-4 text-[11.5px]">
          <span className="text-text-ghost">
            Your balance: <span className="font-medium text-paper">{balance} drops</span>
          </span>
          <Link href="/pricing" className="text-amber transition-colors hover:text-amber-light">
            Buy more →
          </Link>
        </div>
      </div>

      {/* Reader-context strip — only when at a lock */}
      {scenario === "gated-reader" && (
        <div className="relative border-t border-amber/15 bg-amber/[0.04] px-5 py-3 text-[12px] text-amber/90 sm:px-6">
          You hit a locked chapter while reading.
        </div>
      )}
    </section>
  );
}

// ─── Primary actions ─────────────────────────────────────────────────────────

function PrimaryUnlock({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-amber/40 bg-gradient-to-br from-amber/15 to-amber/[0.05] p-4 text-left transition-all hover:border-amber/60 hover:shadow-lg hover:shadow-amber/15"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber/30 bg-amber/[0.08] text-amber">
          <UnlockIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[17px] text-paper">Unlock the next chapter</span>
            <span className="shrink-0 font-mono text-[12px] text-amber">5 drops</span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
            Or unlock all 12 chapters for 60 drops (save 30%).
          </p>
        </div>
      </div>
    </button>
  );
}

function PrimaryCircle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-amber/40 bg-gradient-to-br from-amber/15 to-amber/[0.05] p-4 text-left transition-all hover:border-amber/60 hover:shadow-lg hover:shadow-amber/15"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber/30 bg-amber/[0.08] text-amber">
          <CircleIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[17px] text-paper">Join {WRITER.name.split(" ")[0]}&apos;s Circle</span>
            <span className="shrink-0 font-mono text-[12px] text-amber">5 drops / mo</span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
            Early chapters, behind-the-scenes notes, and a private firelight chat.
          </p>
        </div>
      </div>
    </button>
  );
}

function PrimaryTip({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-amber/40 bg-gradient-to-br from-amber/15 to-amber/[0.05] p-4 text-left transition-all hover:border-amber/60 hover:shadow-lg hover:shadow-amber/15"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber/30 bg-amber/[0.08] text-amber">
          <TipIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[17px] text-paper">Leave a gift</span>
            <span className="shrink-0 font-mono text-[12px] text-amber">any amount</span>
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
            One-off, no commitment — just because the writing landed.
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Secondary action ───────────────────────────────────────────────────────

function SecondaryChip({
  icon,
  label,
  meta,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="text-text-ghost transition-colors group-hover:text-amber">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] text-paper">{label}</div>
        <div className="truncate text-[10.5px] italic text-text-ghost">{meta}</div>
      </div>
    </>
  );

  const className =
    "group flex items-center gap-2.5 rounded-xl border border-border-subtle bg-ink/40 px-3 py-2.5 text-left transition-colors hover:border-amber/25 hover:bg-amber/[0.04]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

// ─── Crossroad card (only when active) ──────────────────────────────────────

function CrossroadCard() {
  return (
    <div className="rounded-xl border border-violet/25 bg-violet/[0.06] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet/15 text-violet">
            <CrossroadIcon />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet/90">A crossroad is live</span>
        </div>
        <span className="text-[10.5px] text-text-ghost">ends Fri</span>
      </div>
      <p className="font-reading text-[13px] italic leading-snug text-text">
        &ldquo;Should Calwen open the letter, or burn it unread?&rdquo;
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-text-ghost">Each drop weighs your vote.</span>
        <button className="text-violet transition-colors hover:text-violet/80">Cast a drop →</button>
      </div>
    </div>
  );
}

// ─── Tip drawer ─────────────────────────────────────────────────────────────

function TipDrawer({
  balance,
  amount,
  setAmount,
  writerName,
  onClose,
  onSend,
}: {
  balance: number;
  amount: number;
  setAmount: (n: number) => void;
  writerName: string;
  onClose: () => void;
  onSend: () => void;
}) {
  const presets = [5, 10, 25, 50, 100];
  const tooMuch = amount > balance;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-amber/20 bg-surface shadow-2xl shadow-void/50 sm:rounded-2xl"
      >
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

        <div className="p-6">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em] text-amber/80">A gift to</div>
          <h3 className="font-display text-[22px] font-light text-paper">{writerName}</h3>

          <div className="mt-5">
            <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-text-ghost">How much</div>
            <div className="flex flex-wrap gap-2">
              {presets.map((n) => (
                <button
                  key={n}
                  onClick={() => setAmount(n)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                    amount === n
                      ? "border-amber/40 bg-amber/15 text-amber"
                      : "border-border-subtle bg-ink/40 text-text-secondary hover:border-amber/25"
                  }`}
                >
                  {n} drops
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-baseline justify-between text-[11.5px]">
            <span className="text-text-ghost">Your balance:</span>
            <span className={tooMuch ? "text-rose" : "text-text"}>{balance} drops</span>
          </div>

          {tooMuch && (
            <p className="mt-2 text-[11.5px] text-rose">
              Not enough drops. <Link href="/pricing" className="underline">Buy more →</Link>
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onSend}
              disabled={tooMuch}
              className="flex-1 rounded-full bg-amber px-5 py-3 text-[13px] font-semibold text-void shadow-lg shadow-amber/15 transition-all hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send {amount} drops
            </button>
            <button onClick={onClose} className="text-[12.5px] text-text-secondary transition-colors hover:text-paper">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Compact reader-end footer (same brain, banner shape) ───────────────────

function SupportFooter({
  scenario,
  onTip,
  onSpend,
}: {
  scenario: Scenario;
  onTip: () => void;
  onSpend: (amount: number) => void;
}) {
  const hasCircle = scenario === "circle-active" || scenario === "gated-reader" || scenario === "crossroad-live";
  const hasLock = scenario === "gated-reader";
  const hasCrossroad = scenario === "crossroad-live";

  // Contextual headline + primary
  let headline: React.ReactNode;
  let primary: { label: string; onClick?: () => void; href?: string; tone?: "violet" } = {
    label: "Leave a gift",
    onClick: onTip,
  };

  if (hasLock) {
    headline = (
      <>
        <span className="text-amber">Chapter 8 is locked.</span>{" "}
        <span className="text-text-ghost">5 drops unlocks it, or 60 unlocks the whole story.</span>
      </>
    );
    primary = { label: "Unlock · 5 drops", onClick: () => onSpend(5) };
  } else if (hasCrossroad) {
    headline = (
      <>
        <span className="text-violet">A crossroad is open</span>{" "}
        <span className="font-reading italic text-text-ghost">— &ldquo;Should Calwen open the letter, or burn it unread?&rdquo;</span>
      </>
    );
    primary = { label: "Cast a drop →", tone: "violet" };
  } else if (hasCircle) {
    headline = (
      <>
        <span className="text-paper">You finished Chapter 7.</span>{" "}
        <span className="text-text-ghost">{WRITER.name.split(" ")[0]} is writing the next.</span>
      </>
    );
    primary = { label: "Read on with the Circle · 5/mo", onClick: () => onSpend(5) };
  } else {
    headline = (
      <>
        <span className="text-paper">You finished Chapter 7.</span>{" "}
        <span className="text-text-ghost">Something land?</span>
      </>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber/15 bg-gradient-to-br from-surface to-ink/80 shadow-xl shadow-void/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.06),transparent_55%)]" />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        {/* Leading flourish */}
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber/25 bg-amber/[0.06] text-amber sm:flex">
          <FlourishIcon />
        </div>

        {/* Headline */}
        <p className="min-w-0 flex-1 font-reading text-[14px] leading-relaxed">{headline}</p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <FooterPrimary
            label={primary.label}
            tone={primary.tone}
            onClick={primary.onClick}
            href={primary.href}
          />
          {!hasLock && (
            <FooterSecondary label="Tip" onClick={onTip} />
          )}
          {hasLock && (
            <FooterSecondary label="Tip" onClick={onTip} />
          )}
          {hasCircle && !hasLock && scenario !== "crossroad-live" ? null : (
            hasCircle && <FooterSecondary label="Join Circle" />
          )}
        </div>
      </div>
    </div>
  );
}

function FooterPrimary({
  label,
  tone,
  onClick,
  href,
}: {
  label: string;
  tone?: "violet";
  onClick?: () => void;
  href?: string;
}) {
  const className =
    tone === "violet"
      ? "inline-flex items-center gap-1.5 rounded-full bg-violet/90 px-4 py-2 text-[12.5px] font-semibold text-void transition-colors hover:bg-violet"
      : "inline-flex items-center gap-1.5 rounded-full bg-amber px-4 py-2 text-[12.5px] font-semibold text-void shadow shadow-amber/15 transition-colors hover:bg-amber-light";
  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={className}>
      {label}
    </button>
  );
}

function FooterSecondary({ label, onClick, href }: { label: string; onClick?: () => void; href?: string }) {
  const className =
    "inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-ink/40 px-3.5 py-2 text-[12px] text-text-secondary transition-colors hover:border-amber/30 hover:text-amber";
  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={className}>
      {label}
    </button>
  );
}

function FauxChapterEnd() {
  return (
    <div className="mb-5 rounded-2xl border border-border-subtle bg-surface/40 p-6 font-reading text-[15px] leading-[1.85] text-text-secondary">
      <p className="mb-3 italic text-text-ghost">… (last paragraph of chapter 7) …</p>
      <p>
        She closed the door behind her without turning around. The salt was still warm in her palm, and somewhere down the hall a bell that wasn&apos;t a bell rang once, very softly, the way old houses do when they decide to remember something.
      </p>
      <div className="mt-4 flex items-center justify-center gap-3 text-[12px] text-text-ghost">
        <span className="h-px w-12 bg-border-subtle" />
        <span className="font-mono uppercase tracking-[0.3em]">end of chapter 7</span>
        <span className="h-px w-12 bg-border-subtle" />
      </div>
    </div>
  );
}

function FlourishIcon() {
  return (
    <Glyph>
      <path d="M2 8 Q5 4 8 8 T14 8" />
      <circle cx="8" cy="8" r="1.2" />
    </Glyph>
  );
}

// ─── Faux story-page side, for context ──────────────────────────────────────

function FauxStorySide() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border-subtle bg-surface/40 p-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-ghost">Story page · preview</div>
        <h1 className="font-display text-[36px] font-light leading-tight text-paper">{WRITER.storyTitle}</h1>
        <p className="mt-1 text-[12.5px] text-text-ghost">by {WRITER.name}</p>
        <blockquote className="mt-5 border-l border-amber/30 pl-4 font-reading text-[15px] italic leading-relaxed text-text-secondary">
          &ldquo;Three kingdoms burned for a substance you can hold in your palm. The fourth is yours.&rdquo;
        </blockquote>
      </div>
      <div className="space-y-2 rounded-2xl border border-border-subtle bg-surface/40 p-4 text-[12px] text-text-ghost">
        <p>This page would also carry chapters, an About tab, updates, comments, etc.</p>
        <p>The aside on the right is the proposed unified <span className="text-amber">Support</span> module — replacing scattered Circle / Tip / Crossroad / Unlock affordances.</p>
      </div>
    </div>
  );
}

// ─── Tiny icon set ──────────────────────────────────────────────────────────

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function CircleIcon() {
  return (
    <Glyph>
      <circle cx="8" cy="8" r="5" />
      <path d="M8 3v10M3 8h10" />
    </Glyph>
  );
}
function TipIcon() {
  return (
    <Glyph>
      <path d="M8 3.5c-1.6-1.8-4.5-1.2-4.5 1.4 0 2.6 4.5 5.6 4.5 5.6s4.5-3 4.5-5.6c0-2.6-2.9-3.2-4.5-1.4Z" />
    </Glyph>
  );
}
function UnlockIcon() {
  return (
    <Glyph>
      <rect x="3.5" y="7.5" width="9" height="6" rx="1.2" />
      <path d="M5.5 7.5V5a2.5 2.5 0 0 1 5 0" />
    </Glyph>
  );
}
function CommissionIcon() {
  return (
    <Glyph>
      <path d="M3 13l5-10 5 10M5.5 9.5h5" />
    </Glyph>
  );
}
function CrossroadIcon() {
  return (
    <Glyph>
      <path d="M8 2v12M2 8h12" />
      <circle cx="8" cy="8" r="1.2" />
    </Glyph>
  );
}
