"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import type { ApiStory } from "@/types/api";
import Room, { ZoneLabel } from "./Room";
import Bookshelf from "./Bookshelf";
import WritersDesk from "./WritersDesk";
import SideTable from "./SideTable";
import Mantel, { type MantelCandle } from "../Mantel";
import { LetterboxBody } from "../Letterbox";
import type { ProfilePoll } from "../ProfileCrossroads";

type Focus = "shelves" | "desk" | "door" | "letters";

const FOCUS_TITLES: Record<Focus, string> = {
  shelves: "The shelves",
  desk: "The desk",
  door: "For visitors",
  letters: "Correspondence",
};

interface StudyStageProps {
  userId: string;
  ownerName: string;
  isOwner: boolean;
  signedIn: boolean;
  // mantel
  candles: { enabled: boolean; count: number; candles: MantelCandle[]; hasLit: boolean };
  onLightCandle: () => Promise<boolean>;
  // shelves
  featured: ApiStory | null;
  stories: ApiStory[];
  // door
  showGifts: boolean;
  letterboxPolicy: "open" | "followers" | "closed";
  hearthEnabled: boolean;
  circleActive: boolean;
  offeringsCount: number;
  polls: ProfilePoll[];
  onRefreshPolls: () => void;
  onArrange: () => void;
}

/**
 * The study as a stage: one viewport, not a feed. Every zone is visible
 * at ambient scale; opening one expands it in place over the room — the
 * page never grows downward.
 */
export default function StudyStage(props: StudyStageProps) {
  const [focus, setFocus] = useState<Focus | null>(null);

  // Deep links (#letterbox from letter notifications) open the letters.
  useEffect(() => {
    if (window.location.hash === "#letterbox") setFocus("letters");
  }, []);

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  return (
    <div id="study-room" className="scroll-mt-14">
      <Room>
        <div className="flex min-h-0 flex-1 flex-col px-7 pb-6 pt-6 lg:px-10">
          <Mantel
            variant="room"
            enabled={props.candles.enabled}
            count={props.candles.count}
            candles={props.candles.candles}
            hasLit={props.candles.hasLit}
            isOwner={props.isOwner}
            signedIn={props.signedIn}
            ownerName={props.ownerName}
            onLight={props.onLightCandle}
          />

          <div className="mt-8 grid min-h-0 flex-1 grid-cols-12 gap-x-10">
            <Zone
              span="col-span-3"
              openLabel="browse the shelves"
              onOpen={() => setFocus("shelves")}
            >
              <Bookshelf
                featured={props.featured}
                stories={props.stories}
                isOwner={props.isOwner}
              />
            </Zone>

            <Zone span="col-span-5" openLabel="open the desk" onOpen={() => setFocus("desk")}>
              <WritersDesk
                userId={props.userId}
                ownerName={props.ownerName}
                isOwner={props.isOwner}
                compact
                onOpenMore={() => setFocus("desk")}
              />
            </Zone>

            <Zone span="col-span-4" openLabel="see everything" onOpen={() => setFocus("door")}>
              <SideTable
                userId={props.userId}
                ownerName={props.ownerName}
                isOwner={props.isOwner}
                signedIn={props.signedIn}
                showGifts={props.showGifts}
                letterboxPolicy={props.letterboxPolicy}
                hearthEnabled={props.hearthEnabled}
                circleActive={props.circleActive}
                offeringsCount={props.offeringsCount}
                polls={props.polls}
                onRefreshPolls={props.onRefreshPolls}
                onArrange={props.onArrange}
                compact
                onOpenDoor={() => setFocus("door")}
              />
            </Zone>
          </div>

          <LettersStrip
            userId={props.userId}
            ownerName={props.ownerName}
            isOwner={props.isOwner}
            letterboxPolicy={props.letterboxPolicy}
            onOpen={() => setFocus("letters")}
          />
        </div>

        {/* Zone focus — the room leans in, nothing scrolls away */}
        <AnimatePresence>
          {focus && (
            <motion.div
              key={focus}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="absolute inset-2 z-30 flex flex-col overflow-hidden rounded-[1.7rem] border border-border bg-ink/95 shadow-[var(--t-shadow-modal)] backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-8 py-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-amber/80">
                  {FOCUS_TITLES[focus]}
                </p>
                <button
                  onClick={() => setFocus(null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:text-paper"
                >
                  <ArrowLeft size={11} />
                  Step back
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
                {focus === "letters" && (
                  <div className="mx-auto max-w-2xl" id="letterbox">
                    <LetterboxBody
                      userId={props.userId}
                      ownerName={props.ownerName}
                      isOwner={props.isOwner}
                    />
                  </div>
                )}
                {focus === "desk" && (
                  <div className="mx-auto max-w-xl">
                    <WritersDesk
                      userId={props.userId}
                      ownerName={props.ownerName}
                      isOwner={props.isOwner}
                    />
                  </div>
                )}
                {focus === "shelves" && (
                  <div className="mx-auto max-w-2xl">
                    <Bookshelf
                      featured={props.featured}
                      stories={props.stories}
                      isOwner={props.isOwner}
                    />
                  </div>
                )}
                {focus === "door" && (
                  <div className="mx-auto max-w-sm">
                    <SideTable
                      userId={props.userId}
                      ownerName={props.ownerName}
                      isOwner={props.isOwner}
                      signedIn={props.signedIn}
                      showGifts={props.showGifts}
                      letterboxPolicy={props.letterboxPolicy}
                      hearthEnabled={props.hearthEnabled}
                      circleActive={props.circleActive}
                      offeringsCount={props.offeringsCount}
                      polls={props.polls}
                      onRefreshPolls={props.onRefreshPolls}
                      onArrange={props.onArrange}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Room>
    </div>
  );
}

/**
 * An ambient zone. The fade and the "open →" affordance exist only when
 * the room's height cap actually clips the content — a zone that fits is
 * simply, fully there.
 */
function Zone({
  span,
  openLabel,
  onOpen,
  children,
}: {
  span: string;
  openLabel: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setClipped(el.scrollHeight > el.clientHeight + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`relative flex min-h-0 flex-col ${span}`}>
      <div ref={ref} className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
      {clipped && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-6 h-12 bg-gradient-to-t from-ink/85 to-transparent" />
          <button
            onClick={onOpen}
            className="relative mt-1.5 self-start text-[10px] uppercase tracking-[0.16em] text-text-ghost transition-colors hover:text-amber"
          >
            {openLabel} →
          </button>
        </>
      )}
    </div>
  );
}

/** The correspondence, glimpsed along the desk's front edge. */
function LettersStrip({
  userId,
  ownerName,
  isOwner,
  letterboxPolicy,
  onOpen,
}: {
  userId: string;
  ownerName: string;
  isOwner: boolean;
  letterboxPolicy: "open" | "followers" | "closed";
  onOpen: () => void;
}) {
  const [summary, setSummary] = useState<{
    answered: number;
    waiting: number;
    latest: { sender: string; body: string } | null;
  } | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/letters?limit=3`);
      if (!res.ok) return;
      const json = await res.json();
      const letters = json.data.letters ?? [];
      setSummary({
        answered: letters.length,
        waiting: (json.data.waiting ?? []).length,
        latest: letters[0]
          ? {
              sender: letters[0].sender.displayName || "A reader",
              body: letters[0].body,
            }
          : null,
      });
    } catch {}
  }, [userId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (letterboxPolicy === "closed" && !isOwner && !summary?.answered) return null;

  const glimpse =
    isOwner && summary && summary.waiting > 0
      ? `${summary.waiting} ${summary.waiting === 1 ? "letter waits" : "letters wait"} on the desk, unread by anyone but you`
      : summary?.latest
        ? `"${summary.latest.body.slice(0, 96)}${summary.latest.body.length > 96 ? "…" : ""}" — ${summary.latest.sender}`
        : isOwner
          ? "No letters yet — what you answer will be displayed here"
          : `Write to ${ownerName} — it stays between you until it's answered`;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      onClick={onOpen}
      className="group mt-5 flex w-full items-center gap-4 rounded-2xl border border-border bg-elevated/40 px-6 py-4 text-left transition-all hover:border-amber/25 hover:bg-amber/[0.03]"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
          isOwner && summary && summary.waiting > 0
            ? "border-amber/40 bg-amber/10 text-amber"
            : "border-border bg-elevated text-amber"
        }`}
      >
        <Mail size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-[0.22em] text-text-ghost">
          Correspondence
        </span>
        <span className="mt-0.5 block truncate font-reading text-[13px] italic text-text-secondary">
          {glimpse}
        </span>
      </span>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-text-ghost transition-colors group-hover:text-amber">
        open the letters →
      </span>
    </motion.button>
  );
}
