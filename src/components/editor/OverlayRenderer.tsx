"use client";

import { useState, useRef, useCallback } from "react";
import type { TextOverlay, BubbleStyle, TailDirection, OverlayFontSize } from "@/types/editor";

const FONT_SIZE_MAP: Record<OverlayFontSize, string> = {
  small: "11px",
  medium: "14px",
  large: "18px",
};

interface OverlayRendererProps {
  overlays: TextOverlay[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onTextChange?: (id: string, text: string) => void;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onStyleChange?: (id: string, updates: Partial<TextOverlay>) => void;
  onDelete?: (id: string) => void;
}

export default function OverlayRenderer({
  overlays,
  editable = false,
  selectedId,
  onSelect,
  onTextChange,
  onPositionChange,
  onStyleChange,
  onDelete,
}: OverlayRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, overlay: TextOverlay) => {
      if (!editable) return;
      // Don't start drag if clicking on text input
      if ((e.target as HTMLElement).tagName === "TEXTAREA") return;

      e.stopPropagation();
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(overlay.id);
      dragStart.current = { x: e.clientX, y: e.clientY, ox: overlay.x, oy: overlay.y };
      onSelect?.(overlay.id);
    },
    [editable, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragStart.current || !containerRef.current) return;
      e.stopPropagation();

      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;

      const newX = Math.max(5, Math.min(95, dragStart.current.ox + dx));
      const newY = Math.max(5, Math.min(95, dragStart.current.oy + dy));

      onPositionChange?.(dragging, newX, newY);
    },
    [dragging, onPositionChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.stopPropagation();
      setDragging(null);
      dragStart.current = null;
    },
    [dragging]
  );

  // Click on empty area to deselect; auto-delete empty bubbles
  const handleBackgroundClick = useCallback(() => {
    if (!editable || !selectedId) return;
    // If the selected bubble has no text, delete it
    const selected = overlays.find((o) => o.id === selectedId);
    if (selected && !selected.text.trim()) {
      onDelete?.(selectedId);
    }
    onSelect?.(null);
  }, [editable, selectedId, overlays, onDelete, onSelect]);

  if (overlays.length === 0 && !editable) return null;

  return (
	    <div
	      ref={containerRef}
	      className="absolute inset-0 z-[5] touch-pan-y"
      style={{ pointerEvents: editable ? "auto" : "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleBackgroundClick}
    >
      {overlays.map((overlay) => {
        const isSelected = selectedId === overlay.id;

        return (
          <div
            key={overlay.id}
	            className={`bubble-base bubble-${overlay.style} touch-none ${
              isSelected
                ? "ring-2 ring-amber ring-offset-1 shadow-lg"
                : "transition-shadow"
            } ${editable && !isSelected ? "cursor-grab hover:ring-1 hover:ring-white/20" : ""} ${
              editable && isSelected ? "cursor-move" : ""
            } ${dragging === overlay.id ? "cursor-grabbing opacity-90 scale-[1.02]" : ""}`}
            data-tail={overlay.tailDirection}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              width: `${overlay.width}%`,
              fontSize: FONT_SIZE_MAP[overlay.fontSize],
              pointerEvents: "auto",
            }}
            onPointerDown={(e) => handlePointerDown(e, overlay)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(overlay.id);
            }}
	          >
	            {editable && isSelected && (
	              <button
	                type="button"
	                className="absolute -top-4 left-1/2 flex h-7 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-amber/30 bg-void/90 text-amber shadow-lg backdrop-blur-sm md:h-5 md:w-8"
	                title="Drag bubble"
	                aria-label="Drag bubble"
	                onPointerDown={(e) => handlePointerDown(e, overlay)}
	              >
	                <span className="h-1 w-6 rounded-full bg-current opacity-70 md:w-4" />
	              </button>
	            )}
	            {editable && isSelected ? (
	              <textarea
                value={overlay.text}
                onChange={(e) => onTextChange?.(overlay.id, e.target.value)}
                placeholder="Type dialogue..."
                autoFocus
	                className="w-full bg-transparent text-center outline-none resize-none leading-snug touch-pan-y"
                style={{ fontSize: "inherit", color: "inherit", fontWeight: "inherit" }}
                rows={1}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onSelect?.(null);
                  }
                }}
              />
            ) : (
              <span className="whitespace-pre-wrap">
                {overlay.text || (editable ? (
                  <span className="opacity-40 italic text-[12px]">Click to edit</span>
                ) : null)}
              </span>
            )}
          </div>
        );
      })}

      {/* Overlay toolbar when a bubble is selected in editor */}
      {editable && selectedId && (
        <OverlayToolbar
          overlay={overlays.find((o) => o.id === selectedId)}
          onStyleChange={onStyleChange}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

// ── Inline Toolbar ─────────────────────────────────────

function OverlayToolbar({
  overlay,
  onStyleChange,
  onDelete,
}: {
  overlay?: TextOverlay;
  onStyleChange?: (id: string, updates: Partial<TextOverlay>) => void;
  onDelete?: (id: string) => void;
}) {
  if (!overlay) return null;

  const styles: { key: BubbleStyle; label: string }[] = [
    { key: "speech", label: "Speech" },
    { key: "thought", label: "Thought" },
    { key: "narration", label: "Narrate" },
    { key: "shout", label: "Shout" },
    { key: "caption", label: "Caption" },
    { key: "sfx", label: "SFX" },
  ];

  const tails: { key: TailDirection; label: string }[] = [
    { key: "bottom-left", label: "↙" },
    { key: "bottom-right", label: "↘" },
    { key: "top-left", label: "↖" },
    { key: "top-right", label: "↗" },
    { key: "none", label: "✕" },
  ];

  const sizes: { key: OverlayFontSize; label: string }[] = [
    { key: "small", label: "S" },
    { key: "medium", label: "M" },
    { key: "large", label: "L" },
  ];

  return (
	      <div
	        className="absolute left-0 right-0 z-20 hidden justify-center px-2 pointer-events-none md:flex"
      style={{
        top: `${Math.max(overlay.y - 12, 2)}%`,
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-border bg-void/90 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
        {/* Style */}
        {styles.map((s) => (
	          <button
	            type="button"
	            key={s.key}
            onClick={() => onStyleChange?.(overlay.id, { style: s.key })}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
              overlay.style === s.key
                ? "bg-amber/20 text-amber"
                : "text-text-ghost hover:text-text-secondary"
            }`}
            title={s.label}
          >
            {s.label}
          </button>
        ))}

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Tail direction */}
        {tails.map((t) => (
	          <button
	            type="button"
	            key={t.key}
            onClick={() => onStyleChange?.(overlay.id, { tailDirection: t.key })}
            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors ${
              overlay.tailDirection === t.key
                ? "bg-amber/20 text-amber"
                : "text-text-ghost hover:text-text-secondary"
            }`}
            title={t.key}
          >
            {t.label}
          </button>
        ))}

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Font size */}
        {sizes.map((s) => (
	          <button
	            type="button"
	            key={s.key}
            onClick={() => onStyleChange?.(overlay.id, { fontSize: s.key })}
            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${
              overlay.fontSize === s.key
                ? "bg-amber/20 text-amber"
                : "text-text-ghost hover:text-text-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}

        <div className="h-4 w-px bg-border mx-0.5" />

        {/* Delete */}
	        <button
	          type="button"
	          onClick={() => onDelete?.(overlay.id)}
          className="w-5 h-5 rounded flex items-center justify-center text-text-ghost hover:text-rose transition-colors"
          title="Remove bubble"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="2" y1="2" x2="8" y2="8" />
            <line x1="8" y1="2" x2="2" y2="8" />
          </svg>
        </button>
	      </div>
	      <div
	        className="absolute inset-x-2 bottom-2 z-20 flex justify-center pointer-events-none md:hidden"
	        onClick={(e) => e.stopPropagation()}
	        onPointerDown={(e) => e.stopPropagation()}
	      >
	        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border bg-void/90 px-2 py-2 shadow-2xl backdrop-blur-xl">
	          {styles.map((s) => (
	            <button
	              type="button"
	              key={s.key}
	              onClick={() => onStyleChange?.(overlay.id, { style: s.key })}
	              className={`h-9 rounded-lg px-2 text-[10px] font-medium transition-colors ${
	                overlay.style === s.key
	                  ? "bg-amber/20 text-amber"
	                  : "text-text-ghost hover:text-text-secondary"
	              }`}
	              title={s.label}
	            >
	              {s.label}
	            </button>
	          ))}

	          <div className="h-7 w-px bg-border mx-0.5" />

	          {tails.map((t) => (
	            <button
	              type="button"
	              key={t.key}
	              onClick={() => onStyleChange?.(overlay.id, { tailDirection: t.key })}
	              className={`flex h-9 w-9 items-center justify-center rounded-lg text-[12px] transition-colors ${
	                overlay.tailDirection === t.key
	                  ? "bg-amber/20 text-amber"
	                  : "text-text-ghost hover:text-text-secondary"
	              }`}
	              title={t.key}
	            >
	              {t.label}
	            </button>
	          ))}

	          <div className="h-7 w-px bg-border mx-0.5" />

	          {sizes.map((s) => (
	            <button
	              type="button"
	              key={s.key}
	              onClick={() => onStyleChange?.(overlay.id, { fontSize: s.key })}
	              className={`flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
	                overlay.fontSize === s.key
	                  ? "bg-amber/20 text-amber"
	                  : "text-text-ghost hover:text-text-secondary"
	              }`}
	            >
	              {s.label}
	            </button>
	          ))}

	          <button
	            type="button"
	            onClick={() => onDelete?.(overlay.id)}
	            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-ghost transition-colors hover:text-rose"
	            title="Remove bubble"
	          >
	            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
	              <line x1="2" y1="2" x2="8" y2="8" />
	              <line x1="8" y1="2" x2="2" y2="8" />
	            </svg>
	          </button>
	        </div>
	      </div>
	    </div>
	  );
	}
