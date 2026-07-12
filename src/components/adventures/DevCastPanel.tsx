"use client";

import { useCallback, useEffect, useState } from "react";

interface PuppetSeat {
  seatId: string;
  role: "director" | "writer";
  status: "open" | "seated" | "left";
  characterName: string;
  inkColor: string;
  email: string | null;
  displayName: string | null;
  puppetable: boolean;
}

interface PuppetCast {
  seats: PuppetSeat[];
  audience: { email: string | null; displayName: string | null }[];
}

const toHtml = (text: string) =>
  text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    )
    .join("");

/**
 * Dev-only puppet panel — play the other chairs at the table without
 * switching accounts. Renders nothing in production builds; actions go
 * through /api/dev/puppet, which enforces every real table rule (it
 * only swaps who is asking). The page's normal polling picks up the
 * results within a few seconds.
 */
export default function DevCastPanel({
  adventureId,
  mySeatId,
}: {
  adventureId: string;
  /** The viewer's own seat, hidden from the puppet list. */
  mySeatId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [cast, setCast] = useState<PuppetCast | null>(null);
  const [seatId, setSeatId] = useState<string>("");
  const [audienceEmail, setAudienceEmail] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [passage, setPassage] = useState("");
  const [whisper, setWhisper] = useState("");
  const [spotlightTo, setSpotlightTo] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [newAct, setNewAct] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [backSeatId, setBackSeatId] = useState("");

  const isDev = process.env.NODE_ENV === "development";

  const loadCast = useCallback(async () => {
    const res = await fetch(`/api/dev/puppet?adventureId=${adventureId}`);
    const body = await res.json().catch(() => null);
    if (res.ok && body?.data) setCast(body.data);
  }, [adventureId]);

  useEffect(() => {
    if (isDev && open) loadCast();
  }, [isDev, open, loadCast]);

  if (!isDev) return null;

  const puppetSeats = (cast?.seats ?? []).filter(
    (s) => s.puppetable && s.status === "seated" && s.seatId !== mySeatId
  );
  const seat = puppetSeats.find((s) => s.seatId === seatId) ?? null;
  const writerSeats = (cast?.seats ?? []).filter(
    (s) => s.status === "seated" && s.role === "writer"
  );

  const puppet = async (
    email: string,
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: unknown } | null> => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/dev/puppet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, method, path, body }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setResult(`✗ ${json?.error ?? `puppet failed (${res.status})`}`);
        return null;
      }
      const proxied = json?.data as { status: number; body: unknown };
      const err = (proxied?.body as { error?: { message?: string } } | null)
        ?.error?.message;
      const short = path.replace(`/api/adventures/${adventureId}`, "…");
      setResult(
        proxied.status < 300
          ? `✓ ${method} ${short} → ${proxied.status}`
          : `✗ ${method} ${short} → ${proxied.status}${err ? ` — ${err}` : ""}`
      );
      return proxied;
    } finally {
      setBusy(false);
    }
  };

  const base = `/api/adventures/${adventureId}`;
  const seatLabel = (s: PuppetSeat) =>
    s.role === "director"
      ? `${s.displayName ?? "?"} (Director)`
      : `${s.characterName || s.displayName || "?"} — ${s.displayName ?? "?"}`;

  const sparkLatest = async () => {
    if (!audienceEmail) return;
    const feed = await puppet(audienceEmail, "GET", `${base}/watch/passages`);
    const list = (feed?.body as { data?: { id: string }[] } | null)?.data;
    const last = list?.[list.length - 1];
    if (!last) {
      setResult("✗ no passages to spark yet");
      return;
    }
    await puppet(audienceEmail, "POST", `${base}/watch/spark`, {
      passageId: last.id,
    });
  };

  const lightLantern = async () => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    const res = await fetch(`${base}/watch/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setResult(res.ok ? "✓ a lantern lit" : `✗ presence → ${res.status}`);
  };

  const inputCls =
    "w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-text placeholder:text-text-ghost focus:outline-none focus:border-gold-dark";
  const btnCls =
    "font-semibold text-[11.5px] rounded-lg px-2.5 py-1.5 bg-surface border border-border text-text hover:text-paper hover:border-gold-dark transition-colors disabled:opacity-40";
  const labelCls =
    "text-[9.5px] tracking-[0.2em] uppercase text-gold-dark font-semibold";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 font-body font-semibold text-[11.5px] rounded-full px-3.5 py-2 bg-ink border border-gold-dark/60 text-gold-dark hover:text-gold transition-colors shadow-lg"
        title="Dev only — act as the other seats and the audience"
      >
        ⚙ Play the cast
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[330px] max-h-[80vh] overflow-y-auto font-body bg-ink border border-border rounded-[14px] p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <p className={`${labelCls} m-0`}>Play the cast · dev only</p>
        <button
          onClick={() => setOpen(false)}
          className="text-text-ghost hover:text-paper text-[13px] leading-none"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {puppetSeats.length === 0 && (
        <p className="font-reading italic text-[12px] text-text-secondary mt-0 mb-3">
          No fixture cast at this table. Seed one with{" "}
          <code className="font-mono text-[11px]">
            node scripts/seed-demo-adventure.mjs
          </code>
        </p>
      )}

      {puppetSeats.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <label className={labelCls}>Act as</label>
          <select
            value={seatId}
            onChange={(e) => setSeatId(e.target.value)}
            className={inputCls}
          >
            <option value="">Pick a seat…</option>
            {puppetSeats.map((s) => (
              <option key={s.seatId} value={s.seatId}>
                {seatLabel(s)}
              </option>
            ))}
          </select>

          {seat && seat.email && (
            <>
              <textarea
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                placeholder={`What ${seat.characterName || seat.displayName} writes…`}
                rows={2}
                className={inputCls}
              />
              <button
                disabled={busy || !passage.trim()}
                onClick={async () => {
                  const ok = await puppet(seat.email!, "POST", `${base}/passages`, {
                    content: toHtml(passage),
                  });
                  if (ok && ok.status < 300) setPassage("");
                }}
                className={btnCls}
              >
                Sign this passage
              </button>

              {seat.role === "writer" && (
                <div className="flex flex-wrap gap-1.5">
                  <input
                    value={whisper}
                    onChange={(e) => setWhisper(e.target.value)}
                    placeholder="Whisper to the Director (optional)"
                    className={inputCls}
                  />
                  <button
                    disabled={busy}
                    onClick={() =>
                      puppet(seat.email!, "POST", `${base}/hand`, {
                        whisper: whisper.trim() || undefined,
                      })
                    }
                    className={btnCls}
                  >
                    Raise hand
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => puppet(seat.email!, "DELETE", `${base}/hand`)}
                    className={btnCls}
                  >
                    Lower hand
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      puppet(seat.email!, "POST", `${base}/step-forward`)
                    }
                    className={btnCls}
                  >
                    Step forward
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => puppet(seat.email!, "DELETE", `${base}/spotlight`)}
                    className={btnCls}
                  >
                    Hand spotlight back
                  </button>
                </div>
              )}

              {seat.role === "director" && (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <select
                      value={spotlightTo}
                      onChange={(e) => setSpotlightTo(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Spotlight to…</option>
                      {writerSeats.map((s) => (
                        <option key={s.seatId} value={s.seatId}>
                          {s.characterName || s.displayName}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={busy || !spotlightTo}
                      onClick={() =>
                        puppet(seat.email!, "POST", `${base}/spotlight`, {
                          toSeatId: spotlightTo,
                        })
                      }
                      className={btnCls}
                    >
                      Pass
                    </button>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <input
                      value={sceneTitle}
                      onChange={(e) => setSceneTitle(e.target.value)}
                      placeholder="Scene title"
                      className={inputCls}
                    />
                    <label className="flex items-center gap-1 text-[11px] text-text-secondary whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={newAct}
                        onChange={(e) => setNewAct(e.target.checked)}
                      />
                      new act
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      disabled={busy || !sceneTitle.trim()}
                      onClick={() =>
                        puppet(seat.email!, "POST", `${base}/scenes`, {
                          action: "open",
                          title: sceneTitle.trim(),
                          newAct,
                        })
                      }
                      className={btnCls}
                    >
                      Open scene
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        puppet(seat.email!, "POST", `${base}/scenes`, {
                          action: "close",
                        })
                      }
                      className={btnCls}
                    >
                      Close scene
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => puppet(seat.email!, "DELETE", `${base}/spotlight`)}
                      className={btnCls}
                    >
                      Call spotlight back
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-2.5 border-t border-border pt-3">
        <label className={labelCls}>The audience</label>
        {cast && cast.audience.length > 0 && (
          <>
            <select
              value={audienceEmail}
              onChange={(e) => setAudienceEmail(e.target.value)}
              className={inputCls}
            >
              <option value="">Pick a reader…</option>
              {cast.audience.map(
                (a) =>
                  a.email && (
                    <option key={a.email} value={a.email}>
                      {a.displayName ?? a.email}
                    </option>
                  )
              )}
            </select>
            {audienceEmail && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <button disabled={busy} onClick={sparkLatest} className={btnCls}>
                    Spark the latest passage
                  </button>
                  <select
                    value={backSeatId}
                    onChange={(e) => setBackSeatId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Back a character…</option>
                    {writerSeats.map((s) => (
                      <option key={s.seatId} value={s.seatId}>
                        {s.characterName || s.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={busy || !backSeatId}
                    onClick={() =>
                      puppet(audienceEmail, "POST", `${base}/watch/back`, {
                        seatId: backSeatId,
                      })
                    }
                    className={btnCls}
                  >
                    Back them
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="A suggestion for the Director…"
                    className={inputCls}
                  />
                  <button
                    disabled={busy || !suggestion.trim()}
                    onClick={async () => {
                      const ok = await puppet(
                        audienceEmail,
                        "POST",
                        `${base}/watch/suggest`,
                        { content: suggestion.trim() }
                      );
                      if (ok && ok.status < 300) setSuggestion("");
                    }}
                    className={btnCls}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </>
        )}
        <button disabled={busy} onClick={lightLantern} className={btnCls}>
          Light a lantern (anonymous reader)
        </button>
      </div>

      {result && (
        <p
          className={`font-mono text-[11px] mt-3 mb-0 ${result.startsWith("✓") ? "text-sage" : "text-rose"}`}
        >
          {result}
        </p>
      )}
      <p className="font-reading italic text-[10.5px] text-text-ghost mt-2 mb-0">
        Real table rules still apply. The page catches up within ~5s.
      </p>
    </div>
  );
}
