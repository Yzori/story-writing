"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdventureHandView,
  AdventureSeatView,
  AdventureView,
} from "@/types/adventure";
import { inkFor } from "@/components/adventures/ink";

/**
 * The quiet control strip below the page. The page stays pure story;
 * everything you can *do* lives here, and what you can do depends on
 * where the spotlight is:
 *  - writer, spotlight elsewhere → raise your hand (+ whisper), step forward
 *  - writer, spotlit → write and sign
 *  - Director → write direction, pass the spotlight (raised hands first),
 *    open/close scenes, start the adventure while casting
 */
export default function Composer({
  adventure,
  seats,
  hands,
  mySeat,
  hasOpenScene,
  actionError,
  onSign,
  onPassSpotlight,
  onRaiseHand,
  onLowerHand,
  onStepForward,
  onOpenScene,
  onCloseScene,
  onStart,
  onFinish,
  onMintInvite,
}: {
  adventure: AdventureView;
  seats: AdventureSeatView[];
  hands: AdventureHandView[];
  mySeat: AdventureSeatView;
  hasOpenScene: boolean;
  actionError: string | null;
  onSign: (content: string, canonizeSuggestionId?: string) => Promise<boolean>;
  onPassSpotlight: (toSeatId: string) => Promise<boolean>;
  onRaiseHand: (whisper: string) => Promise<boolean>;
  onLowerHand: () => Promise<boolean>;
  onStepForward: () => Promise<boolean>;
  onOpenScene: (title: string, newAct: boolean, opening?: string) => Promise<boolean>;
  onCloseScene: () => Promise<boolean>;
  onStart: () => Promise<boolean>;
  onFinish: () => Promise<boolean>;
  onMintInvite: () => Promise<string | null>;
}) {
  const isDirector = mySeat.role === "director";
  const haveSpotlight = adventure.spotlightSeatId === mySeat.id;
  const running = adventure.status === "running";

  return (
    <div className="mt-5 border border-amber/30 rounded-[14px] bg-ink/70 p-4 sm:p-5 font-body">
      {adventure.status === "casting" && (
        <CastingControls
          seats={seats}
          isDirector={isDirector}
          onStart={onStart}
          onMintInvite={onMintInvite}
        />
      )}

      {running && isDirector && (
        <DirectorDesk
          adventure={adventure}
          seats={seats}
          hands={hands}
          haveSpotlight={haveSpotlight}
          hasOpenScene={hasOpenScene}
          onSign={onSign}
          onPassSpotlight={onPassSpotlight}
          onOpenScene={onOpenScene}
          onCloseScene={onCloseScene}
          onFinish={onFinish}
        />
      )}

      {running && !isDirector && haveSpotlight && (
        <WriteAndSign
          label={`You're writing ${mySeat.characterName || "your character"} — sign it when it's said.`}
          buttonLabel="Sign it onto the page"
          onSubmit={onSign}
        />
      )}

      {running && !isDirector && !haveSpotlight && (
        <WriterWaiting
          adventure={adventure}
          mySeat={mySeat}
          hands={hands}
          onRaiseHand={onRaiseHand}
          onLowerHand={onLowerHand}
          onStepForward={onStepForward}
        />
      )}

      {(adventure.status === "finished" || adventure.status === "abandoned") && (
        <p className="text-[13px] text-text-secondary m-0">
          This adventure has ended. The pages remain.
        </p>
      )}

      {actionError && (
        <p className="text-[12.5px] text-rose mt-3 mb-0">{actionError}</p>
      )}
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────

function Btn({
  children,
  onClick,
  primary,
  quiet,
  raised,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  quiet?: boolean;
  raised?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`font-semibold text-[13.5px] rounded-[11px] px-4 py-2.5 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? "bg-gold border-gold text-on-gold hover:bg-gold-light"
          : raised
            ? "bg-amber/15 border-amber text-amber shadow-[0_0_18px_rgba(245,172,78,0.25)]"
            : quiet
              ? "bg-surface border-border text-text-ghost hover:text-paper"
              : "bg-surface border-border text-paper hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}

function WriteAndSign({
  label,
  buttonLabel,
  onSubmit,
  allowEmpty,
}: {
  label: string;
  buttonLabel: string;
  onSubmit: (content: string) => Promise<boolean>;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || (!allowEmpty && !text.trim())) return;
    setBusy(true);
    const ok = await onSubmit(toParagraphHtml(text));
    setBusy(false);
    if (ok) setText("");
  };

  return (
    <div>
      <p className="text-[12.5px] text-text-ghost mt-0 mb-2.5">{label}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Write your passage…"
        className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 font-reading text-[15px] text-paper leading-relaxed outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors resize-y"
      />
      <div className="flex justify-end mt-2.5">
        <Btn primary onClick={submit} disabled={busy || !text.trim()}>
          {busy ? "Signing…" : buttonLabel}
        </Btn>
      </div>
    </div>
  );
}

/** Plain text → sanitizable paragraph HTML (blank line = new paragraph). */
function toParagraphHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── casting ──────────────────────────────────────────────────

function CastingControls({
  seats,
  isDirector,
  onStart,
  onMintInvite,
}: {
  seats: AdventureSeatView[];
  isDirector: boolean;
  onStart: () => Promise<boolean>;
  onMintInvite: () => Promise<string | null>;
}) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const seated = seats.filter(
    (s) => s.role === "writer" && s.status === "seated"
  ).length;
  const open = seats.filter((s) => s.status === "open").length;

  const mint = async () => {
    const path = await onMintInvite();
    if (path) setInviteUrl(`${window.location.origin}${path}`);
  };

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div>
      <p className="text-[13px] text-text-secondary mt-0 mb-3">
        The table is casting — {seated} writer{seated === 1 ? "" : "s"} seated,{" "}
        {open} seat{open === 1 ? "" : "s"} open. Invite friends by link
        {isDirector ? ", then start when the cast is set." : "."}
      </p>
      <div className="flex gap-2.5 flex-wrap items-center">
        <Btn onClick={mint}>Make an invite link</Btn>
        {isDirector && (
          <Btn primary onClick={onStart} disabled={seated < 2}>
            Start the adventure
          </Btn>
        )}
      </div>
      {inviteUrl && (
        <div className="mt-3 flex items-center gap-2.5 border-b border-dashed border-amber/40 pb-2">
          <code className="font-mono text-[11.5px] text-gold-light truncate">
            {inviteUrl}
          </code>
          <button
            onClick={copy}
            className="text-[11px] text-text-ghost hover:text-paper transition-colors flex-none"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── writer, waiting ──────────────────────────────────────────

function WriterWaiting({
  adventure,
  mySeat,
  hands,
  onRaiseHand,
  onLowerHand,
  onStepForward,
}: {
  adventure: AdventureView;
  mySeat: AdventureSeatView;
  hands: AdventureHandView[];
  onRaiseHand: (whisper: string) => Promise<boolean>;
  onLowerHand: () => Promise<boolean>;
  onStepForward: () => Promise<boolean>;
}) {
  const myHand = hands.find((h) => h.seatId === mySeat.id) ?? null;
  const [whisper, setWhisper] = useState("");
  const stepLeft = mySeat.stepForwardAct < adventure.actNo;
  const ink = inkFor(mySeat.inkColor);

  return (
    <div>
      <div className="flex gap-2.5 flex-wrap items-center">
        {myHand ? (
          <Btn raised onClick={onLowerHand}>
            Hand raised — lower it
          </Btn>
        ) : (
          <Btn onClick={() => onRaiseHand(whisper.trim())}>
            Raise your hand — I have the next move
          </Btn>
        )}
        <span className="flex-1" />
        <Btn
          quiet
          onClick={onStepForward}
          disabled={!stepLeft}
          title="Once per act: take the spotlight without waiting."
        >
          Step forward · {stepLeft ? "1 left" : "used this act"}
        </Btn>
      </div>
      <div className="mt-2.5 flex items-baseline gap-3 border-b border-dashed border-amber/40 px-0.5 pb-2 text-[13.5px]">
        <span className="text-gold-dark text-[10px] tracking-[0.18em] uppercase whitespace-nowrap">
          To the Director
        </span>
        {myHand ? (
          <span className="font-reading italic text-paper">
            {myHand.whisper || "(no whisper — just the hand)"}
          </span>
        ) : (
          <input
            value={whisper}
            onChange={(e) => setWhisper(e.target.value.slice(0, 200))}
            placeholder="Tell them what you're holding (only they see it)…"
            className="flex-1 bg-transparent border-none outline-none font-reading italic text-[13.5px] text-paper placeholder:text-text-ghost"
          />
        )}
      </div>
      <p className="text-[12.5px] text-text-ghost mt-3 mb-0">
        You&apos;re writing{" "}
        <b className={`font-semibold ${ink.text}`}>
          {mySeat.characterName || "your character"}
        </b>
        . Raising your hand tells the Director you have the next move;{" "}
        <b className="text-text font-semibold">Step forward</b> takes the
        spotlight outright — once per act, and the Director has to work with
        what you write.
      </p>
    </div>
  );
}

// ── the Director's desk ──────────────────────────────────────

function DirectorDesk({
  adventure,
  seats,
  hands,
  haveSpotlight,
  hasOpenScene,
  onSign,
  onPassSpotlight,
  onOpenScene,
  onCloseScene,
  onFinish,
}: {
  adventure: AdventureView;
  seats: AdventureSeatView[];
  hands: AdventureHandView[];
  haveSpotlight: boolean;
  hasOpenScene: boolean;
  onSign: (content: string, canonizeSuggestionId?: string) => Promise<boolean>;
  onPassSpotlight: (toSeatId: string) => Promise<boolean>;
  onOpenScene: (title: string, newAct: boolean, opening?: string) => Promise<boolean>;
  onCloseScene: () => Promise<boolean>;
  onFinish: () => Promise<boolean>;
}) {
  const [sceneTitle, setSceneTitle] = useState("");
  const [newAct, setNewAct] = useState(false);
  const [showScene, setShowScene] = useState(false);
  const [weaveInId, setWeaveInId] = useState<string | null>(null);
  const { suggestions, dismiss, refreshSuggestions } = useSuggestionStack(
    adventure.id
  );
  const writers = seats.filter(
    (s) => s.role === "writer" && s.status === "seated"
  );
  const handBySeat = new Map(hands.map((h) => [h.seatId, h] as const));
  const spotlitWriter = writers.find((w) => w.id === adventure.spotlightSeatId);

  if (!haveSpotlight && spotlitWriter) {
    return (
      <p className="text-[13px] text-text-secondary m-0">
        The spotlight is on{" "}
        <b className="text-paper font-semibold">
          {spotlitWriter.userName ?? spotlitWriter.characterName}
        </b>{" "}
        — it comes back to your desk when they sign.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hasOpenScene && (
        <div>
          <p className="text-[10.5px] tracking-[0.24em] uppercase text-gold-dark font-semibold mt-0 mb-2.5">
            The Director&apos;s desk
          </p>
          {suggestions.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`flex items-start gap-2.5 text-[12.5px] border rounded-lg px-3 py-2 transition-colors ${
                    weaveInId === suggestion.id
                      ? "border-lavender/60 bg-lavender/[0.06]"
                      : "border-border bg-surface"
                  }`}
                >
                  <span className="text-lavender flex-none">✦</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-reading italic text-text">
                      &ldquo;{suggestion.content}&rdquo;
                    </span>{" "}
                    <span className="text-text-ghost">— {suggestion.readerName}</span>
                  </span>
                  <button
                    onClick={() =>
                      setWeaveInId(
                        weaveInId === suggestion.id ? null : suggestion.id
                      )
                    }
                    className={`flex-none text-[11px] transition-colors ${
                      weaveInId === suggestion.id
                        ? "text-lavender"
                        : "text-text-ghost hover:text-lavender"
                    }`}
                  >
                    {weaveInId === suggestion.id ? "weaving in" : "weave in"}
                  </button>
                  <button
                    onClick={() => {
                      if (weaveInId === suggestion.id) setWeaveInId(null);
                      dismiss(suggestion.id);
                    }}
                    className="flex-none text-[11px] text-text-ghost hover:text-rose transition-colors"
                  >
                    let it go
                  </button>
                </div>
              ))}
              {weaveInId && (
                <p className="text-[11px] text-lavender m-0">
                  Your next signed direction credits this reader.
                </p>
              )}
            </div>
          )}
          <WriteAndSign
            label="Write direction — the world, the weather, the answer to what was just signed."
            buttonLabel="Sign the direction"
            onSubmit={async (content) => {
              const ok = await onSign(content, weaveInId ?? undefined);
              if (ok) {
                setWeaveInId(null);
                refreshSuggestions();
              }
              return ok;
            }}
          />
        </div>
      )}

      {hasOpenScene && (
        <div>
          <p className="text-[10.5px] tracking-[0.24em] uppercase text-gold-dark font-semibold mt-0 mb-2.5">
            Pass the spotlight
          </p>
        <div className="flex gap-2.5 flex-wrap">
          {writers.map((writer) => {
            const hand = handBySeat.get(writer.id);
            const ink = inkFor(writer.inkColor);
            return (
              <button
                key={writer.id}
                onClick={() => onPassSpotlight(writer.id)}
                className={`text-left rounded-[11px] px-3.5 py-2.5 border transition-colors ${
                  hand
                    ? "border-amber bg-amber/10 hover:bg-amber/15"
                    : "border-border bg-surface hover:border-gold"
                }`}
              >
                <span className={`block text-[13px] font-semibold ${ink.text}`}>
                  {writer.userName ?? writer.characterName}
                  {hand && " ✋"}
                </span>
                <span className="block text-[11px] text-text-ghost">
                  {writer.characterName}
                </span>
                {hand?.whisper && (
                  <span className="block font-reading italic text-[12px] text-paper mt-1 max-w-[240px]">
                    &ldquo;{hand.whisper}&rdquo;
                  </span>
                )}
              </button>
            );
          })}
          {writers.length === 0 && (
            <span className="text-[12.5px] text-text-ghost">
              No writers seated yet.
            </span>
          )}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10.5px] tracking-[0.24em] uppercase text-gold-dark font-semibold mt-0 mb-2.5">
          Scenes
        </p>
        {!showScene ? (
          <div className="flex gap-2.5 flex-wrap">
            <Btn
              primary={!hasOpenScene}
              onClick={() => setShowScene(true)}
            >
              {hasOpenScene ? "Close this scene…" : "Open the next scene…"}
            </Btn>
          </div>
        ) : hasOpenScene ? (
          <div className="flex gap-2.5 flex-wrap items-center">
            <span className="text-[12.5px] text-text-ghost">
              Close Scene {adventure.sceneNo}? The next one opens fresh.
            </span>
            <Btn
              primary
              onClick={async () => {
                await onCloseScene();
                setShowScene(false);
              }}
            >
              Close the scene
            </Btn>
            <Btn quiet onClick={() => setShowScene(false)}>
              Keep writing
            </Btn>
          </div>
        ) : (
          <div className="space-y-2.5">
            <input
              value={sceneTitle}
              onChange={(e) => setSceneTitle(e.target.value.slice(0, 200))}
              placeholder="Scene title — e.g. The Customs House After Dark"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
            />
            <label className="flex items-center gap-2 text-[12.5px] text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={newAct}
                onChange={(e) => setNewAct(e.target.checked)}
                className="accent-[var(--color-gold)]"
              />
              This opens a new act (writers get their step-forward back)
            </label>
            <div className="flex gap-2.5">
              <Btn
                primary
                onClick={async () => {
                  const ok = await onOpenScene(sceneTitle.trim(), newAct);
                  if (ok) {
                    setSceneTitle("");
                    setNewAct(false);
                    setShowScene(false);
                  }
                }}
              >
                Open the scene
              </Btn>
              <Btn quiet onClick={() => setShowScene(false)}>
                Not yet
              </Btn>
            </div>
          </div>
        )}
      </div>

      <AskTheHouse adventureId={adventure.id} />

      <CloseTheBook onFinish={onFinish} />
    </div>
  );
}

function CloseTheBook({ onFinish }: { onFinish: () => Promise<boolean> }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="pt-1 border-t border-border">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="text-[12px] text-text-ghost hover:text-paper transition-colors"
        >
          Close the book — end the adventure and compile it…
        </button>
      ) : (
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[12.5px] text-text-secondary">
            Each act becomes a chapter, credited to the whole table, readable
            by anyone. There&apos;s no reopening it.
          </span>
          <Btn primary onClick={onFinish}>
            Close the book
          </Btn>
          <Btn quiet onClick={() => setConfirming(false)}>
            Keep playing
          </Btn>
        </div>
      )}
    </div>
  );
}

// ── the Director's suggestion stack + house vote ─────────────

interface DirectorSuggestion {
  id: string;
  content: string;
  readerName: string;
}

function useSuggestionStack(adventureId: string) {
  const [suggestions, setSuggestions] = useState<DirectorSuggestion[]>([]);

  const refreshSuggestions = useCallback(async () => {
    const res = await fetch(`/api/adventures/${adventureId}/suggestions`);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.data) setSuggestions(body.data);
  }, [adventureId]);

  useEffect(() => {
    (async () => {
      await refreshSuggestions();
    })();
    const interval = setInterval(refreshSuggestions, 15000);
    return () => clearInterval(interval);
  }, [refreshSuggestions]);

  const dismiss = useCallback(
    async (suggestionId: string) => {
      await fetch(
        `/api/adventures/${adventureId}/suggestions/${suggestionId}`,
        { method: "DELETE" }
      );
      await refreshSuggestions();
    },
    [adventureId, refreshSuggestions]
  );

  return { suggestions, dismiss, refreshSuggestions };
}

function AskTheHouse({ adventureId }: { adventureId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [status, setStatus] = useState<string | null>(null);

  const ask = async () => {
    setStatus(null);
    const res = await fetch(`/api/adventures/${adventureId}/house-vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
      }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setStatus("The house is voting — it shows on the watch page.");
      setOpen(false);
      setQuestion("");
      setOptions(["", ""]);
    } else {
      setStatus(body?.error?.message ?? "Something went wrong.");
    }
  };

  return (
    <div>
      <p className="text-[10.5px] tracking-[0.24em] uppercase text-gold-dark font-semibold mt-0 mb-2.5">
        The house
      </p>
      {!open ? (
        <div className="flex items-center gap-3 flex-wrap">
          <Btn quiet onClick={() => setOpen(true)}>
            Ask the house a question…
          </Btn>
          {status && <span className="text-[12px] text-sage">{status}</span>}
        </div>
      ) : (
        <div className="space-y-2.5">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            placeholder="Who let go of the bell rope?"
            className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
          />
          {options.map((option, i) => (
            <input
              key={i}
              value={option}
              onChange={(e) =>
                setOptions((prev) =>
                  prev.map((o, j) => (j === i ? e.target.value.slice(0, 120) : o))
                )
              }
              placeholder={`Answer ${i + 1}`}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[12.5px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
            />
          ))}
          <div className="flex gap-2.5 flex-wrap items-center">
            {options.length < 4 && (
              <button
                onClick={() => setOptions((prev) => [...prev, ""])}
                className="text-[11.5px] text-text-ghost hover:text-paper transition-colors"
              >
                + another answer
              </button>
            )}
            <span className="flex-1" />
            <Btn
              primary
              onClick={ask}
              disabled={
                !question.trim() ||
                options.filter((o) => o.trim()).length < 2
              }
            >
              Put it to the house
            </Btn>
            <Btn quiet onClick={() => setOpen(false)}>
              Never mind
            </Btn>
          </div>
          {status && <p className="text-[12px] text-rose m-0">{status}</p>}
        </div>
      )}
    </div>
  );
}
