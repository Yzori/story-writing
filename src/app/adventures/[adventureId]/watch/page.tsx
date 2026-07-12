"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { useAdventureWatch, type WatchSeat } from "@/hooks/use-adventure-watch";
import CurtainCall from "@/components/adventures/CurtainCall";
import ThePage from "@/components/adventures/ThePage";
import DevCastPanel from "@/components/adventures/DevCastPanel";
import { inkFor } from "@/components/adventures/ink";
import {
  PACE_LABELS,
  type AdventureInk,
  type AdventurePace,
  type AdventureView,
} from "@/types/adventure";

/**
 * The watch page — the audience's door, no account needed to read.
 * The same bound page the cast writes on, read-only, with the rail:
 * lanterns, the house vote, backing, and the book it becomes.
 */
export default function AdventureWatchPage() {
  const params = useParams<{ adventureId: string }>();
  const {
    state,
    passages,
    audienceByPassage,
    loading,
    error,
    spark,
    back,
    suggest,
    vote,
  } = useAdventureWatch(params.adventureId);

  if (loading) {
    return (
      <div className="min-h-screen bg-void grid place-items-center">
        <p className="font-reading italic text-text-secondary">
          Finding a place to stand…
        </p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-void grid place-items-center px-6">
        <div className="text-center">
          <p className="font-display text-paper text-xl mb-2">
            The room isn&apos;t open.
          </p>
          <p className="text-[13px] text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  const adventure = state.adventure;
  const writers = state.seats.filter((s) => s.role === "writer");
  const spotlit = state.seats.find((s) => s.id === adventure.spotlightSeatId);
  const spotlightWriting =
    state.presence?.find((p) => p.seatId === adventure.spotlightSeatId)
      ?.writing ?? false;

  // ThePage takes the play-view shapes; the watch payload is a subset.
  const pageAdventure = {
    ...adventure,
    ownerId: "",
    turnDueHours: 0,
    spotlightSince: null,
    spotlightDueAt: null,
    boardVisibility: "board",
    pace: adventure.pace as AdventurePace,
  } as AdventureView;

  return (
    <div className="min-h-screen bg-void pb-24 [background-image:radial-gradient(1100px_520px_at_50%_-8%,var(--color-gold-glow),transparent_62%)]">
      <div className="text-center px-6 pt-24">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold-dark mb-3">
          An adventure, written live
          {adventure.sceneNo > 0 &&
            ` · Act ${adventure.actNo}, Scene ${adventure.sceneNo}`}
        </p>
        <h1 className="font-display font-medium text-paper text-[clamp(30px,5vw,50px)] [text-wrap:balance] [text-shadow:0_0_44px_var(--color-gold-glow)]">
          {adventure.title}
        </h1>
        <div className="mt-3.5 flex gap-2.5 justify-center flex-wrap">
          <span className="text-[12px] text-text border border-border rounded-full px-3 py-1 bg-ink/70">
            {PACE_LABELS[adventure.pace as AdventurePace] ?? adventure.pace}
          </span>
          {spotlit && adventure.status === "running" && (
            <span className="text-[12px] text-gold-light border border-gold/40 rounded-full px-3 py-1 bg-ink/70">
              {spotlit.role === "director"
                ? "The Director has the spotlight"
                : spotlightWriting
                  ? `${spotlit.userName ?? spotlit.characterName} is writing right now`
                  : `${spotlit.userName ?? spotlit.characterName} has the spotlight`}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto mt-8 px-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="max-w-[720px] w-full mx-auto lg:mx-0">
          {(adventure.status === "finished" ||
            adventure.status === "abandoned") && (
            <CurtainCall adventureId={params.adventureId} />
          )}
          <ThePage
            adventure={pageAdventure}
            seats={state.seats.map((s) => ({
              ...s,
              inkColor: s.inkColor as AdventureInk,
              userId: null,
              status: "seated" as const,
              stepForwardAct: 0,
              userAvatarUrl: null,
            }))}
            scenes={state.scenes}
            passages={passages}
            mySeatId=""
            spotlightWriting={spotlightWriting}
            audience={audienceByPassage}
            onSpark={state.signedIn ? spark : undefined}
          />
          {!state.signedIn && (
            <p className="text-center text-[12.5px] text-text-ghost mt-4">
              <Link href="/login" className="text-gold hover:text-gold-light transition-colors">
                Sign in
              </Link>{" "}
              to spark passages, back a character, or send the Director a
              suggestion. Reading is free — you&apos;re already in the room.
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <RailCard title="The audience">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-medium text-[34px] text-gold-light tabular-nums [text-shadow:0_0_26px_var(--color-gold-glow)]">
                {state.audience.present}
              </span>
              <span className="text-[12px] text-text-ghost leading-tight">
                reading live
                <br />
                {state.audience.allTime.toLocaleString()} all-time
              </span>
            </div>
            <LanternField count={Math.min(state.audience.present, 38)} />
            <p className="text-[11px] text-text-ghost m-0">
              Every lantern is a reader in the room right now.
            </p>
          </RailCard>

          {state.houseVote && (
            <HouseVoteCard
              houseVote={state.houseVote}
              signedIn={state.signedIn}
              onVote={vote}
            />
          )}

          {writers.length > 0 && (
            <BackingCard
              writers={writers}
              myBackingSeatId={state.myBackingSeatId}
              signedIn={state.signedIn}
              onBack={back}
            />
          )}

          {state.signedIn && adventure.status === "running" && (
            <SuggestCard onSuggest={suggest} />
          )}

          <RailCard title="The book it becomes">
            <p className="text-[12.5px] text-text-secondary m-0">
              Every scene is published the moment it&apos;s signed. When the
              adventure ends, it compiles into a finished novel credited to
              the whole table.
            </p>
          </RailCard>
        </aside>
      </div>

      <DevCastPanel adventureId={params.adventureId} />
    </div>
  );
}

function RailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-2xl bg-gradient-to-b from-elevated/50 to-ink/90 p-5 shadow-[0_14px_34px_rgba(0,0,0,0.3)] space-y-3">
      <h3 className="m-0 font-body font-semibold text-[10.5px] tracking-[0.24em] uppercase text-gold-dark flex items-center gap-3 after:content-[''] after:h-px after:flex-1 after:bg-gradient-to-r after:from-gold/30 after:to-transparent">
        {title}
      </h3>
      {children}
    </div>
  );
}

function LanternField({ count }: { count: number }) {
  // Deterministic scatter — same lanterns between polls, no hydration drift.
  const lanterns = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (i * 2654435761) % 1000;
        const seed2 = (i * 40503 + 129) % 1000;
        const size = 2.5 + (seed % 45) / 10;
        return {
          left: 2 + (seed2 % 940) / 10,
          top: (seed % 840) / 10,
          size,
          opacity: 0.3 + (seed2 % 60) / 100,
          delay: seed % 2900,
        };
      }),
    [count]
  );
  if (count === 0) {
    return (
      <p className="font-reading italic text-[12.5px] text-text-ghost my-2">
        The room is quiet — be the first lantern.
      </p>
    );
  }
  return (
    <div
      aria-hidden
      className="relative h-[58px] my-2 [mask-image:linear-gradient(180deg,black_55%,transparent)]"
    >
      {lanterns.map((lantern, i) => (
        <i
          key={i}
          className="absolute rounded-full bg-gold animate-pulse"
          style={{
            left: `${lantern.left}%`,
            top: `${lantern.top}%`,
            width: lantern.size,
            height: lantern.size,
            opacity: lantern.opacity,
            boxShadow: `0 0 ${4 + lantern.size * 1.6}px rgba(245,197,94,.75)`,
            animationDelay: `${lantern.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

function HouseVoteCard({
  houseVote,
  signedIn,
  onVote,
}: {
  houseVote: NonNullable<ReturnType<typeof useAdventureWatch>["state"]>["houseVote"] & object;
  signedIn: boolean;
  onVote: (
    storyId: string,
    crossroadId: string,
    optionIndex: number,
    amount: number
  ) => Promise<string | null>;
}) {
  const [drops, setDrops] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  if (!houseVote) return null;
  const lead = Math.max(...houseVote.options.map((o) => o.pct));

  return (
    <RailCard title="The Director asked the house">
      <p className="font-reading italic text-paper text-[15px] m-0">
        {houseVote.question}
      </p>
      <div className="space-y-2.5">
        {houseVote.options.map((option, i) => (
          <div key={i}>
            <div className="flex justify-between gap-2.5 text-[12.5px] mb-1">
              <span
                className={
                  option.pct === lead && option.drops > 0
                    ? "text-paper font-semibold"
                    : "text-text"
                }
              >
                {option.label}
              </span>
              <span className="text-gold-light tabular-nums">{option.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-void/80 overflow-hidden">
              <i
                className="block h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light shadow-[0_0_10px_rgba(245,197,94,0.4)]"
                style={{ width: `${option.pct}%` }}
              />
            </div>
            {signedIn && !voted && (
              <button
                onClick={async () => {
                  setError(null);
                  const err = await onVote(
                    houseVote.storyId,
                    houseVote.id,
                    i,
                    drops
                  );
                  if (err) setError(err);
                  else setVoted(true);
                }}
                className="mt-1 text-[11px] text-gold-dark hover:text-gold transition-colors"
              >
                cast {drops} drops here
              </button>
            )}
          </div>
        ))}
      </div>
      {signedIn && !voted && (
        <div className="flex items-center gap-2 text-[11.5px] text-text-ghost">
          weight your vote:
          {[5, 25, 100].map((n) => (
            <button
              key={n}
              onClick={() => setDrops(n)}
              className={`px-2 py-0.5 rounded-full border transition-colors ${
                drops === n
                  ? "border-gold/50 text-gold-light"
                  : "border-border hover:text-text"
              }`}
            >
              {n}
            </button>
          ))}
          drops
        </div>
      )}
      {voted && (
        <p className="text-[11.5px] text-sage m-0">
          Cast. The Director keeps the final word.
        </p>
      )}
      {error && <p className="text-[11.5px] text-rose m-0">{error}</p>}
      {houseVote.closesAt && (
        <p className="text-[11.5px] text-text-ghost m-0">
          Vote closes {new Date(houseVote.closesAt).toLocaleString()} · the
          Director keeps the final word
        </p>
      )}
    </RailCard>
  );
}

function BackingCard({
  writers,
  myBackingSeatId,
  signedIn,
  onBack,
}: {
  writers: WatchSeat[];
  myBackingSeatId: string | null;
  signedIn: boolean;
  onBack: (seatId: string) => Promise<boolean>;
}) {
  return (
    <RailCard title="Backing the cast">
      <div className="space-y-1">
        {writers.map((writer) => {
          const ink = inkFor(writer.inkColor);
          const mine = myBackingSeatId === writer.id;
          return (
            <div key={writer.id} className="flex items-center gap-2 text-[12.5px] py-0.5">
              <span
                aria-hidden
                className={`w-[7px] h-[7px] rounded-full flex-none ${ink.dot}`}
              />
              <span className="text-text truncate">
                {writer.characterName || (writer.userName ?? "—")}
              </span>
              {signedIn && (
                <button
                  onClick={() => onBack(writer.id)}
                  className={`text-[10.5px] transition-colors ${
                    mine
                      ? "text-gold-light"
                      : "text-text-ghost hover:text-gold"
                  }`}
                >
                  {mine ? "backing" : "back"}
                </button>
              )}
              <span className="ml-auto text-paper tabular-nums">
                {writer.backers}
              </span>
            </div>
          );
        })}
      </div>
    </RailCard>
  );
}

function SuggestCard({
  onSuggest,
}: {
  onSuggest: (content: string) => Promise<string | null>;
}) {
  const [content, setContent] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <RailCard title="Send a suggestion">
      <p className="text-[12px] text-text-ghost m-0">
        A detail, a knock at the door, a name for the thing in the dark. If
        the Director writes it in, the passage is credited to you.
      </p>
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value.slice(0, 280));
          setSent(false);
        }}
        rows={2}
        placeholder="The grey wax smells of the lighthouse lamp oil…"
        className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[12.5px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            if (!content.trim()) return;
            setError(null);
            const err = await onSuggest(content.trim());
            if (err) setError(err);
            else {
              setSent(true);
              setContent("");
            }
          }}
          disabled={!content.trim()}
          className="font-semibold text-[12.5px] rounded-[10px] px-3.5 py-2 bg-surface border border-border text-paper hover:border-gold transition-colors disabled:opacity-50"
        >
          Send it up
        </button>
        {sent && <span className="text-[11.5px] text-sage">On the Director&apos;s desk.</span>}
        {error && <span className="text-[11.5px] text-rose">{error}</span>}
      </div>
    </RailCard>
  );
}
