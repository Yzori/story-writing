"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EpisodeRecap } from "@/lib/campaign-recap";

interface EpisodeCardProps {
  open: boolean;
  onClose: () => void;
  recap: EpisodeRecap;
  storyTitle: string;
  /** Origin link rendered into the image and used for Share/Copy. */
  shareUrl: string;
}

type Aspect = "portrait" | "square";

const ASPECT_DIMS: Record<Aspect, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

/** Wrap a string into lines that fit maxWidth on the given context. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draw the keepsake into a canvas at export resolution and return a data URL.
 * Lays out top-down and simply stops adding rows once it nears the footer, so
 * a busy session never overflows the card.
 */
function renderEpisodeCard(recap: EpisodeRecap, storyTitle: string, aspect: Aspect): string | null {
  const { w, h } = ASPECT_DIMS[aspect];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background — void with an amber bloom.
  ctx.fillStyle = "#0A0805";
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h * 0.3, 60, w / 2, h * 0.5, w);
  grad.addColorStop(0, "rgba(200, 150, 60, 0.12)");
  grad.addColorStop(1, "rgba(10, 8, 5, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(200, 150, 60, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  const cx = w / 2;
  const maxWidth = w - 200;
  const footerReserve = 150;
  const sans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
  const serif = "ui-serif, Georgia, 'Times New Roman', serif";
  let y = 110;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Eyebrow
  ctx.fillStyle = "#C8963C";
  ctx.font = `600 22px ${sans}`;
  ctx.fillText("✦  EPISODE  ✦", cx, y);
  y += 46;

  // Session title
  ctx.fillStyle = "#F2E8D0";
  ctx.font = `600 56px ${serif}`;
  for (const line of wrapText(ctx, recap.title || "A Session", maxWidth)) {
    ctx.fillText(line, cx, y, maxWidth);
    y += 66;
  }
  y += 14;

  // Divider
  ctx.strokeStyle = "rgba(200, 150, 60, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 48, y);
  ctx.lineTo(cx + 48, y);
  ctx.stroke();
  y += 50;

  const limit = h - footerReserve;

  // Beats — glyph centred above its wrapped text, the way the on-screen card reads.
  ctx.textAlign = "left";
  const leftX = 110;
  const glyphGap = 56;
  for (const beat of recap.beats) {
    if (y > limit - 60) break;
    ctx.fillStyle = "rgba(200, 150, 60, 0.85)";
    ctx.font = "30px " + sans;
    ctx.fillText(beat.glyph, leftX, y);

    ctx.fillStyle = "#D9C8A8";
    ctx.font = `30px ${serif}`;
    const lines = wrapText(ctx, beat.text, maxWidth - glyphGap);
    for (let i = 0; i < lines.length; i++) {
      if (y > limit) break;
      ctx.fillText(lines[i], leftX + glyphGap, y, maxWidth - glyphGap);
      y += 40;
    }
    y += 18;
  }

  // Marks earned
  if (recap.marks.length > 0 && y < limit - 80) {
    y += 8;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(200, 150, 60, 0.65)";
    ctx.font = `600 18px ${sans}`;
    ctx.fillText("MARKS LEFT ON THE CAST", cx, y);
    y += 40;
    ctx.textAlign = "left";
    for (const mark of recap.marks) {
      if (y > limit - 36) break;
      ctx.fillStyle = "rgba(200, 150, 60, 0.85)";
      ctx.font = `26px ${sans}`;
      ctx.fillText(mark.glyph, leftX, y);
      ctx.fillStyle = "#C9B89A";
      ctx.font = `italic 26px ${serif}`;
      const text = `${mark.text} — ${mark.character}`;
      const lines = wrapText(ctx, text, maxWidth - glyphGap);
      for (let i = 0; i < lines.length; i++) {
        if (y > limit) break;
        ctx.fillText(lines[i], leftX + glyphGap, y, maxWidth - glyphGap);
        y += 36;
      }
      y += 12;
    }
  }

  // Epilogue (closing thought)
  if (recap.epilogue && y < limit - 80) {
    y += 14;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(212, 196, 168, 0.75)";
    ctx.font = `italic 28px ${serif}`;
    const epi = recap.epilogue.length > 220 ? recap.epilogue.slice(0, 210).trimEnd() + "…" : recap.epilogue;
    for (const line of wrapText(ctx, `“${epi}”`, maxWidth)) {
      if (y > limit) break;
      ctx.fillText(line, cx, y, maxWidth);
      y += 38;
    }
  }

  // Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(212, 196, 168, 0.55)";
  ctx.font = `600 20px ${sans}`;
  ctx.fillText(storyTitle.toUpperCase(), cx, h - 116, w - 160);
  ctx.fillStyle = "rgba(200, 150, 60, 0.7)";
  ctx.font = `600 18px ${sans}`;
  ctx.fillText("✦  QUILORIA  ✦", cx, h - 80);

  return canvas.toDataURL("image/png");
}

export default function EpisodeCard({ open, onClose, recap, storyTitle, shareUrl }: EpisodeCardProps) {
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "text" | "image" | "error">("idle");
  const renderTokenRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const token = ++renderTokenRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGenerating(true);
    setImageDataUrl(null);
    // Defer to the next frame so the spinner paints before the (sync) draw.
    const id = requestAnimationFrame(() => {
      if (renderTokenRef.current !== token) return;
      const url = renderEpisodeCard(recap, storyTitle, aspect);
      if (renderTokenRef.current !== token) return;
      setImageDataUrl(url);
      setGenerating(false);
    });
    return () => cancelAnimationFrame(id);
  }, [open, recap, storyTitle, aspect]);

  const fileName = `${storyTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 50)}-episode.png`;

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const recapText = () => {
    const lines = [`✦ ${recap.title} — on Quiloria`];
    for (const b of recap.beats) lines.push(`${b.glyph} ${b.text}`);
    if (recap.epilogue) lines.push(`“${recap.epilogue}”`);
    lines.push(shareUrl);
    return lines.join("\n");
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(recapText());
      setCopyState("text");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  const handleCopyImage = async () => {
    if (!imageDataUrl) return;
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const ClipItem = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (!ClipItem) {
        handleDownload();
        return;
      }
      await navigator.clipboard.write([new ClipItem({ "image/png": blob })]);
      setCopyState("image");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      handleDownload();
    }
  };

  const handleNativeShare = async () => {
    if (!imageDataUrl) return;
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const shareData: ShareData = {
        title: `${recap.title} — ${storyTitle} on Quiloria`,
        text: `${recap.title} — a session on Quiloria`,
        url: shareUrl,
      };
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
      } else if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleDownload();
      }
    } catch {
      /* cancelled / unsupported */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-void/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-amber">✦</span>
                  <h2 className="font-display text-sm font-semibold text-paper">The keepsake</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md p-1 text-text-ghost transition-colors hover:text-paper"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="3" y1="3" x2="11" y2="11" />
                    <line x1="11" y1="3" x2="3" y2="11" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">Format</span>
                  <div className="inline-flex rounded-full border border-border bg-elevated p-0.5">
                    {(["portrait", "square"] as Aspect[]).map((a) => (
                      <button
                        key={a}
                        onClick={() => setAspect(a)}
                        className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                          aspect === a ? "bg-amber/15 text-amber" : "text-text-ghost hover:text-text-secondary"
                        }`}
                      >
                        {a === "portrait" ? "Story" : "Square"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-void/40">
                  {generating ? (
                    <div className="flex flex-col items-center gap-2 py-12">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
                      <span className="text-[11px] text-text-ghost">Pressing the keepsake…</span>
                    </div>
                  ) : imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageDataUrl}
                      alt="Episode keepsake preview"
                      className={`block ${aspect === "portrait" ? "max-h-[60vh] max-w-[280px]" : "max-h-[50vh] max-w-[360px]"}`}
                    />
                  ) : (
                    <p className="py-12 text-sm text-text-ghost">Couldn&apos;t render the card.</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button
                      onClick={handleNativeShare}
                      disabled={!imageDataUrl}
                      className="inline-flex items-center gap-2 rounded-full bg-amber px-4 py-2 text-[12px] font-semibold text-void shadow-lg shadow-amber/15 transition-all hover:bg-amber-light disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M8 11V2M8 2l-3 3M8 2l3 3" />
                        <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2" />
                      </svg>
                      Share
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    disabled={!imageDataUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-[12px] text-text-secondary transition-all hover:border-border-active hover:text-paper disabled:opacity-50"
                  >
                    Download
                  </button>
                  <button
                    onClick={handleCopyImage}
                    disabled={!imageDataUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-[12px] text-text-secondary transition-all hover:border-border-active hover:text-paper disabled:opacity-50"
                  >
                    {copyState === "image" ? "Copied ✓" : "Copy image"}
                  </button>
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-4 py-2 text-[12px] text-text-secondary transition-all hover:border-border-active hover:text-paper"
                  >
                    {copyState === "text" ? "Copied ✓" : "Copy text"}
                  </button>
                </div>

                {copyState === "error" && (
                  <p className="text-[11px] text-rose">Couldn&apos;t copy — try Download instead.</p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
