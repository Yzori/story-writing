"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/shared/Navbar";

/**
 * /creator/boost — boost marketplace.
 *
 * Creators pick one of their published stories, see the current home-page
 * surface state (hero occupancy, next opening), and buy a standard or hero
 * boost. If the hero carousel is full, buying creates a pre-booked slot.
 */

interface MyStory {
  id: string;
  title: string;
  coverImageUrl: string | null;
  slug: string | null;
  format: string;
  writingMode: string;
  isPublic: boolean;
  status: string;
}

interface HeroState {
  activeCount: number;
  nextOpeningAt: string | null; // ISO string, or null if slots are available
}

const STANDARD_COST = 50;
const HERO_COST = 300;

export default function BoostMarketplace() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stories, setStories] = useState<MyStory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tier, setTier] = useState<"standard" | "hero">("standard");
  const [heroState, setHeroState] = useState<HeroState | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    queued?: boolean;
    startsAt?: string;
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/creator/boost");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    // Load user's stories
    fetch(`/api/stories?mine=true`)
      .then((r) => r.json())
      .then((json) => {
        const all: MyStory[] = json?.data?.stories ?? [];
        setStories(
          all.filter(
            (s) => s.isPublic && s.status === "published",
          ),
        );
      });
    // Load balance
    fetch("/api/user/ink-drops")
      .then((r) => r.json())
      .then((json) => setBalance(json?.balance ?? 0));
    // Load home state to compute hero availability
    fetch("/api/home")
      .then((r) => r.json())
      .then((json) => {
        const hero = json?.data?.hero ?? [];
        const activePaid = hero.filter(
          (h: { sponsored: boolean; boostExpiresAt: string | null }) =>
            h.sponsored,
        );
        const soonest =
          activePaid.length >= 5
            ? activePaid
                .map((h: { boostExpiresAt: string }) => h.boostExpiresAt)
                .filter(Boolean)
                .sort()[0]
            : null;
        setHeroState({
          activeCount: activePaid.length,
          nextOpeningAt: soonest,
        });
      });
  }, [session?.user?.id]);

  const submit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/stories/${selectedId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({
          ok: false,
          message: json?.error?.message ?? "Something went wrong",
        });
      } else {
        setResult({
          ok: true,
          message: json.boost.isImmediate
            ? tier === "hero"
              ? "Live in the hero carousel now."
              : "Live in the sponsored strip now."
            : `Pre-booked. Your slot starts ${new Date(
                json.boost.startsAt,
              ).toLocaleString()}.`,
          queued: !json.boost.isImmediate,
          startsAt: json.boost.startsAt,
        });
        // Refresh balance
        fetch("/api/user/ink-drops")
          .then((r) => r.json())
          .then((json) => setBalance(json?.balance ?? 0));
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  const cost = tier === "hero" ? HERO_COST : STANDARD_COST;
  const insufficient = balance !== null && balance < cost;
  const heroFull =
    tier === "hero" && heroState && heroState.activeCount >= 5;
  const selectedStory = stories.find((s) => s.id === selectedId);
  const missingCoverForHero =
    tier === "hero" && selectedStory && !selectedStory.coverImageUrl;

  return (
    <main className="min-h-screen bg-void">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-text-ghost text-[11px] tracking-[0.3em] uppercase mb-2">
            Promote your work
          </p>
          <h1 className="font-display text-paper text-4xl mb-2">
            Boost marketplace
          </h1>
          <p className="text-text-secondary text-[14px] mb-10 max-w-xl">
            Put a story or adventure in front of every reader landing on
            Quiloria. Hero slots rotate at the top of the home page. Sponsored
            strip appears just beneath.
          </p>
        </motion.div>

        {/* Tier picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setTier("standard")}
            className={`text-left p-4 sm:p-6 rounded-xl border transition-all ${
              tier === "standard"
                ? "border-gold/50 bg-gold/5"
                : "border-border bg-elevated/30 hover:border-border-active"
            }`}
          >
            <p className="font-display text-paper text-lg">Standard</p>
            <p className="text-text-ghost text-[11px] mb-3 tracking-wide uppercase">
              Sponsored strip
            </p>
            <p className="text-text-secondary text-[13px] mb-4">
              A card in the Sponsored row on the home page. Clearly labelled.
              No concurrency cap.
            </p>
            <p className="font-display text-gold text-xl">
              {STANDARD_COST}{" "}
              <span className="text-text-ghost text-[11px] font-body">
                drops / 24h
              </span>
            </p>
          </button>
          <button
            onClick={() => setTier("hero")}
            className={`text-left p-4 sm:p-6 rounded-xl border transition-all relative ${
              tier === "hero"
                ? "border-gold/50 bg-gold/5"
                : "border-border bg-elevated/30 hover:border-border-active"
            }`}
          >
            <div className="absolute top-3 right-3 text-[9px] tracking-[0.2em] uppercase text-gold/70 border border-gold/20 rounded-full px-2 py-0.5">
              Premium
            </div>
            <p className="font-display text-paper text-lg">Hero carousel</p>
            <p className="text-text-ghost text-[11px] mb-3 tracking-wide uppercase">
              Top of the home page
            </p>
            <p className="text-text-secondary text-[13px] mb-4">
              One of 5 rotating full-bleed hero slides. 7s each. If full, you
              pre-book the next opening.
            </p>
            <p className="font-display text-gold text-xl">
              {HERO_COST}{" "}
              <span className="text-text-ghost text-[11px] font-body">
                drops / 24h
              </span>
            </p>
          </button>
        </div>

        {/* Hero availability */}
        {tier === "hero" && heroState && (
          <div className="mb-8 p-4 rounded-xl border border-border bg-elevated/20">
            <p className="text-[12px] text-text-secondary">
              <span className="font-display text-paper">
                {heroState.activeCount} / 5
              </span>{" "}
              hero slots taken right now.{" "}
              {heroState.activeCount < 5 ? (
                <span className="text-gold">A slot is available.</span>
              ) : heroState.nextOpeningAt ? (
                <span className="text-text-ghost">
                  Next opening:{" "}
                  {new Date(heroState.nextOpeningAt).toLocaleString()}. Your
                  boost will be pre-booked.
                </span>
              ) : null}
            </p>
          </div>
        )}

        {/* Story picker */}
        <h2 className="text-text-secondary text-[12px] tracking-[0.25em] uppercase mb-4">
          Pick a story
        </h2>
        {stories.length === 0 ? (
          <p className="text-text-ghost text-[13px] mb-10">
            You don&apos;t have any published public stories yet.{" "}
            <Link href="/create" className="text-gold hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
            {stories.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedId === s.id
                    ? "border-gold/50 bg-gold/5"
                    : "border-border bg-elevated/30 hover:border-border-active"
                }`}
              >
                <div
                  className="w-12 h-16 rounded-sm bg-cover bg-center flex-shrink-0 bg-void border border-border"
                  style={{
                    backgroundImage: s.coverImageUrl
                      ? `url(${s.coverImageUrl})`
                      : undefined,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-paper text-[14px] truncate">
                    {s.title}
                  </p>
                  <p className="text-text-ghost text-[11px] capitalize">
                    {s.writingMode === "campaign" ? "Adventure" : s.format}
                    {!s.coverImageUrl && (
                      <span className="ml-2 text-amber/70">
                        · no cover
                      </span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Confirm */}
        <div className="flex items-center justify-between p-5 rounded-xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
          <div>
            <p className="text-text-ghost text-[11px] tracking-wide uppercase">
              Cost
            </p>
            <p className="font-display text-paper text-2xl">
              {cost}{" "}
              <span className="text-text-ghost text-[11px]">drops</span>
            </p>
            {balance !== null && (
              <p className="text-text-ghost text-[11px] mt-1">
                Your balance: {balance}
              </p>
            )}
          </div>
          <button
            onClick={submit}
            disabled={
              !selectedId || submitting || insufficient || !!missingCoverForHero
            }
            className="px-6 py-3 rounded-full bg-gold text-void font-body font-semibold text-[13px] tracking-wide hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? "Submitting…"
              : heroFull
                ? `Pre-book for ${cost}`
                : `Boost for ${cost}`}
          </button>
        </div>

        {missingCoverForHero && selectedStory && (
          <p className="text-amber text-[12px] mt-3">
            <strong className="font-display">{selectedStory.title}</strong>{" "}
            doesn&apos;t have a cover image. Hero slots are full-bleed and
            need one.{" "}
            <Link
              href={`/story/${selectedStory.slug ?? selectedStory.id}/edit`}
              className="text-gold hover:underline"
            >
              Add a cover first
            </Link>
            , or pick the Standard tier instead.
          </p>
        )}

        {insufficient && (
          <p className="text-rose text-[12px] mt-3">
            Not enough Ink Drops. You need {cost - (balance ?? 0)} more.{" "}
            <Link
              href="/settings/ink-drops"
              className="text-gold hover:underline"
            >
              Top up
            </Link>
            .
          </p>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 p-4 rounded-xl border ${
              result.ok
                ? "border-gold/30 bg-gold/5 text-gold"
                : "border-rose/30 bg-rose/5 text-rose"
            }`}
          >
            <p className="text-[13px]">{result.message}</p>
            {result.ok && !result.queued && (
              <Link
                href="/"
                className="inline-block mt-2 text-[12px] underline"
              >
                View it on the home page →
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
