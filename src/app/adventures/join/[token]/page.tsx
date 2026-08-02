"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import InkPicker from "@/components/adventures/InkPicker";
import { PACE_LABELS, type AdventurePace } from "@/types/adventure";

interface InvitePeek {
  title: string;
  premise: string;
  genre: string;
  pace: AdventurePace;
  status: string;
  openWriterSeats: number;
  directorSeatOpen: boolean;
}

/**
 * The seat behind an invite link: see the table, bring a character,
 * sit down.
 */
export default function JoinAdventurePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [peek, setPeek] = useState<InvitePeek | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [role, setRole] = useState<"writer" | "director">("writer");
  const [characterName, setCharacterName] = useState("");
  const [characterBrief, setCharacterBrief] = useState("");
  const [inkColor, setInkColor] = useState("teal");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/adventures/join/${params.token}`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        if (body.data) {
          setPeek(body.data);
          if (body.data.openWriterSeats === 0 && body.data.directorSeatOpen) {
            setRole("director");
          }
        } else {
          setFailed(body.error?.message ?? "This invite is no longer good.");
        }
      })
      .catch(() => {
        if (!cancelled) setFailed("This invite is no longer good.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  const join = async () => {
    if (busy || (role === "writer" && !characterName.trim())) return;
    setBusy(true);
    setFailed(null);
    const res = await fetch(`/api/adventures/join/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        role === "director"
          ? { role }
          : { role, characterName, characterBrief, inkColor }
      ),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (body?.data?.adventureId) {
      router.push(`/adventures/${body.data.adventureId}`);
      return;
    }
    setFailed(body?.error?.message ?? "Couldn't take a seat.");
  };

  if (failed && !peek) {
    return (
      <div className="min-h-screen bg-void grid place-items-center px-6">
        <div className="text-center">
          <p className="font-display text-paper text-xl mb-2">{failed}</p>
          <Link
            href="/adventures"
            className="text-[13px] text-gold hover:text-gold-light transition-colors"
          >
            Back to adventures
          </Link>
        </div>
      </div>
    );
  }

  if (!peek) {
    return (
      <div className="min-h-screen bg-void grid place-items-center">
        <p className="font-reading italic text-text-secondary">
          Reading the invite…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void pb-24">
      <div className="max-w-[560px] mx-auto px-6 pt-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold-dark mb-3">
          You&apos;re invited to the table
        </p>
        <h1 className="font-display font-medium text-paper text-[clamp(28px,4vw,42px)] [text-wrap:balance] mb-3">
          {peek.title}
        </h1>
        <p className="font-reading italic text-[15px] text-text leading-relaxed mb-2">
          {peek.premise}
        </p>
        <p className="text-[12px] text-teal mb-8">
          {PACE_LABELS[peek.pace]}
          {peek.openWriterSeats > 0 &&
            ` · ${peek.openWriterSeats} writer seat${peek.openWriterSeats === 1 ? "" : "s"} open`}
          {peek.directorSeatOpen && " · the Director's chair is open"}
        </p>

        <div className="text-left border border-border rounded-xl p-5 bg-ink/60 space-y-4">
          {peek.openWriterSeats > 0 && peek.directorSeatOpen && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                Sit down as
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRole("writer")}
                  className={`rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    role === "writer"
                      ? "border-amber/50 bg-amber/10 text-paper"
                      : "border-border bg-elevated text-text-secondary hover:text-text"
                  }`}
                >
                  Writer
                  <span className="block text-[11px] font-normal text-text-ghost">
                    play a character
                  </span>
                </button>
                <button
                  onClick={() => setRole("director")}
                  className={`rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    role === "director"
                      ? "border-amber/50 bg-amber/10 text-paper"
                      : "border-border bg-elevated text-text-secondary hover:text-text"
                  }`}
                >
                  Director
                  <span className="block text-[11px] font-normal text-text-ghost">
                    run the world
                  </span>
                </button>
              </div>
            </div>
          )}
          {role === "writer" ? (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Your character
                </label>
                <input
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value.slice(0, 80))}
                  placeholder="Brother Calder"
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[14px] text-paper outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  In a few words
                </label>
                <input
                  value={characterBrief}
                  onChange={(e) => setCharacterBrief(e.target.value.slice(0, 500))}
                  placeholder="defrocked cartographer"
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2 block">
                  Your ink
                </label>
                <InkPicker value={inkColor} onChange={setInkColor} />
              </div>
            </>
          ) : (
            <p className="font-reading italic text-[14px] text-text leading-relaxed m-0">
              The Director plays the world, not a character — you set scenes,
              pass the spotlight, and keep the story moving.
            </p>
          )}
          {failed && <p className="text-[12.5px] text-rose m-0">{failed}</p>}
          <button
            onClick={join}
            disabled={busy || (role === "writer" && !characterName.trim())}
            className="w-full font-semibold text-[14px] rounded-[11px] px-5 py-3 bg-gold text-on-gold border border-gold hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy
              ? "Taking your seat…"
              : role === "director"
                ? "Take the Director's chair"
                : "Take a seat"}
          </button>
        </div>
      </div>
    </div>
  );
}
