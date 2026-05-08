"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SceneClipProps {
  open: boolean;
  onClose: () => void;
  passage: string;
  storyTitle: string;
  authorName: string;
  /** Optional cover image URL — drawn into the export when present. */
  coverUrl?: string | null;
  /** Origin link rendered into the image and used for Share/Copy. */
  shareUrl: string;
}

type Aspect = "square" | "portrait";

/** Wrap a long string into lines that fit a max width on the given canvas context. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split(/\n+/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
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
    lines.push(""); // paragraph break
  }
  // Trim trailing blank line
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const ASPECT_DIMS: Record<Aspect, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1920 },
};

/**
 * Renders the clip into a canvas at export resolution. Returns a data URL.
 * Style mirrors the brand: void background, amber accents, Fraunces-ish serif
 * for the passage, all-caps tracked label for "From {storyTitle}".
 */
async function renderClip(
  passage: string,
  storyTitle: string,
  authorName: string,
  coverUrl: string | null | undefined,
  aspect: Aspect,
): Promise<string | null> {
  const { w, h } = ASPECT_DIMS[aspect];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background — radial vignette in our void/amber palette.
  ctx.fillStyle = "#0A0805";
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h * 0.35, 60, w / 2, h * 0.5, w);
  grad.addColorStop(0, "rgba(200, 150, 60, 0.10)");
  grad.addColorStop(1, "rgba(10, 8, 5, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle border frame.
  ctx.strokeStyle = "rgba(200, 150, 60, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, w - 72, h - 72);

  // Cover thumbnail (top-left if present)
  let coverY = 100;
  if (coverUrl) {
    const img = await loadImage(coverUrl);
    if (img) {
      const coverSize = aspect === "portrait" ? 200 : 160;
      const coverX = (w - coverSize) / 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(img, coverX, coverY, coverSize, (coverSize * 3) / 2);
      ctx.restore();
      coverY += (coverSize * 3) / 2 + 30;
    }
  }

  // Story title (small caps, amber)
  ctx.fillStyle = "#C8963C";
  ctx.font = "600 22px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const titleLabel = storyTitle.toUpperCase();
  ctx.fillText(titleLabel, w / 2, coverY, w - 200);
  coverY += 40;

  // Author byline
  ctx.fillStyle = "rgba(212, 196, 168, 0.6)";
  ctx.font = "italic 22px ui-serif, Georgia, 'Times New Roman', serif";
  ctx.fillText(`by ${authorName}`, w / 2, coverY, w - 200);
  coverY += 56;

  // Decorative divider
  ctx.strokeStyle = "rgba(200, 150, 60, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 40, coverY);
  ctx.lineTo(w / 2 + 40, coverY);
  ctx.stroke();
  coverY += 50;

  // Passage — serif, large, wrapped
  ctx.fillStyle = "#F2E8D0";
  const passageFontSize = aspect === "portrait" ? 42 : 36;
  ctx.font = `${passageFontSize}px ui-serif, Georgia, 'Times New Roman', serif`;
  ctx.textAlign = "center";
  const maxWidth = w - 180;
  // Truncate very long passages so they fit
  const trimmed = passage.length > 600 ? passage.slice(0, 580).trimEnd() + "…" : passage;
  const lines = wrapText(ctx, trimmed, maxWidth);
  const lineHeight = passageFontSize * 1.45;
  const passageBlockHeight = lines.length * lineHeight;
  const footerReserve = 160;
  const availableForPassage = h - coverY - footerReserve;
  // If too tall, scale down font and re-wrap.
  if (passageBlockHeight > availableForPassage) {
    const ratio = availableForPassage / passageBlockHeight;
    const newSize = Math.max(20, Math.floor(passageFontSize * ratio));
    ctx.font = `${newSize}px ui-serif, Georgia, 'Times New Roman', serif`;
    const reLines = wrapText(ctx, trimmed, maxWidth);
    const reLineHeight = newSize * 1.45;
    let y = coverY + (availableForPassage - reLines.length * reLineHeight) / 2;
    for (const line of reLines) {
      ctx.fillText(line, w / 2, y, maxWidth);
      y += reLineHeight;
    }
  } else {
    let y = coverY + (availableForPassage - passageBlockHeight) / 2;
    for (const line of lines) {
      ctx.fillText(line, w / 2, y, maxWidth);
      y += lineHeight;
    }
  }

  // Footer — Quiloria mark
  ctx.fillStyle = "rgba(200, 150, 60, 0.7)";
  ctx.font = "600 18px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("✦  QUILORIA  ✦", w / 2, h - 100);

  return canvas.toDataURL("image/png");
}

export default function SceneClip({
  open,
  onClose,
  passage,
  storyTitle,
  authorName,
  coverUrl,
  shareUrl,
}: SceneClipProps) {
  const [aspect, setAspect] = useState<Aspect>("square");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "text" | "image" | "error">("idle");
  const renderTokenRef = useRef(0);

  // Re-render the canvas whenever the dialog opens, the aspect changes, or the
  // passage changes. Use a token to ignore stale awaits.
  useEffect(() => {
    if (!open) return;
    const token = ++renderTokenRef.current;
    setGenerating(true);
    setImageDataUrl(null);
    renderClip(passage, storyTitle, authorName, coverUrl ?? null, aspect)
      .then((url) => {
        if (renderTokenRef.current !== token) return;
        setImageDataUrl(url);
      })
      .finally(() => {
        if (renderTokenRef.current === token) setGenerating(false);
      });
  }, [open, passage, storyTitle, authorName, coverUrl, aspect]);

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = `${storyTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}-clip.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = async () => {
    try {
      const fullText = `"${passage}"\n— ${authorName}, ${storyTitle}\n${shareUrl}`;
      await navigator.clipboard.writeText(fullText);
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
      // ClipboardItem may not exist in older browsers — guard.
      const ClipItem = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (!ClipItem) {
        handleDownload();
        return;
      }
      await navigator.clipboard.write([new ClipItem({ "image/png": blob })]);
      setCopyState("image");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      // Fallback to download if image clipboard unsupported.
      handleDownload();
    }
  };

  const handleNativeShare = async () => {
    if (!imageDataUrl) return;
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], "clip.png", { type: "image/png" });
      const shareData: ShareData = {
        title: `${storyTitle} on Quiloria`,
        text: `"${passage.slice(0, 140)}${passage.length > 140 ? "…" : ""}" — ${authorName}`,
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
      // User cancelled or unsupported — no-op.
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[calc(100vw-1.5rem)] max-w-2xl"
          >
            <div className="bg-surface border border-border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-amber">✦</span>
                  <h2 className="font-display text-paper text-sm font-semibold">Share this passage</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-text-ghost hover:text-paper transition-colors"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="3" y1="3" x2="11" y2="11" />
                    <line x1="11" y1="3" x2="3" y2="11" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Aspect picker */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-text-ghost">Format</span>
                  <div className="inline-flex bg-elevated rounded-full p-0.5 border border-border">
                    {(["square", "portrait"] as Aspect[]).map((a) => (
                      <button
                        key={a}
                        onClick={() => setAspect(a)}
                        className={`px-3 py-1 text-[11px] rounded-full transition-colors ${
                          aspect === a ? "bg-amber/15 text-amber" : "text-text-ghost hover:text-text-secondary"
                        }`}
                      >
                        {a === "square" ? "Square" : "Story"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image preview */}
                <div className="rounded-xl overflow-hidden border border-border-subtle bg-void/40 flex items-center justify-center min-h-[280px]">
                  {generating ? (
                    <div className="flex flex-col items-center gap-2 py-12">
                      <div className="w-5 h-5 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
                      <span className="text-[11px] text-text-ghost">Composing your clip…</span>
                    </div>
                  ) : imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageDataUrl}
                      alt="Clip preview"
                      className={`block max-h-[60vh] ${aspect === "portrait" ? "max-w-[260px]" : "max-w-[440px]"}`}
                    />
                  ) : (
                    <p className="text-text-ghost text-sm py-12">Couldn't render preview.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button
                      onClick={handleNativeShare}
                      disabled={!imageDataUrl}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber text-void text-[12px] font-semibold hover:bg-amber-light transition-all disabled:opacity-50 shadow-lg shadow-amber/15"
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-elevated text-text-secondary hover:text-paper hover:border-border-active text-[12px] transition-all disabled:opacity-50"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M8 2v9M8 11l-3-3M8 11l3-3" />
                      <path d="M3 14h10" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={handleCopyImage}
                    disabled={!imageDataUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-elevated text-text-secondary hover:text-paper hover:border-border-active text-[12px] transition-all disabled:opacity-50"
                  >
                    {copyState === "image" ? "Copied ✓" : "Copy image"}
                  </button>
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-elevated text-text-secondary hover:text-paper hover:border-border-active text-[12px] transition-all"
                  >
                    {copyState === "text" ? "Copied ✓" : "Copy text + link"}
                  </button>
                </div>

                {copyState === "error" && (
                  <p className="text-[11px] text-rose">Couldn't copy — try Download instead.</p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
