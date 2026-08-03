"use client";

import type { ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Miniature mock-ups of the five editing surfaces, shown while the writer is
// still choosing a format. Purely decorative — divs and type, no Tiptap, no
// real content. Just enough typographic shape that a screenplay page is
// recognisably not a webtoon strip before the choice is locked in.

const SURFACE_LABEL: Record<string, string> = {
  novel: "Novel",
  poetry: "Poetry",
  screenplay: "Screenplay",
  webtoon: "Webtoon",
  illustrated: "Illustrated",
};

// A ghost line standing in for a line of text.
function Line({ w, dim = false }: { w: string; dim?: boolean }) {
  return (
    <div
      className={`h-[3px] shrink-0 rounded-full ${dim ? "bg-text-ghost/20" : "bg-text-ghost/35"}`}
      style={{ width: w }}
    />
  );
}

function NovelSurface() {
  return (
    <div className="flex h-full flex-col justify-center gap-[6px] px-6 py-4">
      <div className="flex gap-[7px]">
        <span className="font-reading text-[25px] leading-[0.74] text-amber/70">T</span>
        <div className="flex flex-1 flex-col gap-[6px] pt-[2px]">
          <Line w="94%" />
          <Line w="88%" />
        </div>
      </div>
      <Line w="97%" />
      <Line w="72%" />
      <div className="py-[3px] text-center font-display text-[9px] leading-none tracking-[0.5em] text-amber/45">❦</div>
      <Line w="92%" />
      <Line w="64%" dim />
    </div>
  );
}

// null marks the stanza break.
const POEM_LINES: ({ w: string; syllables: string } | null)[] = [
  { w: "62%", syllables: "8" },
  { w: "48%", syllables: "6" },
  { w: "70%", syllables: "9" },
  { w: "40%", syllables: "5" },
  null,
  { w: "58%", syllables: "7" },
  { w: "44%", syllables: "6" },
];

function PoetrySurface() {
  return (
    <div className="relative h-full px-6 py-4">
      {/* the counting gutter */}
      <div className="absolute inset-y-4 right-[46px] w-px bg-border" />
      <div className="flex h-full flex-col justify-center gap-[6px]">
        {POEM_LINES.map((line, i) =>
          line ? (
            <div key={i} className="flex items-center">
              <Line w={line.w} />
              <span className="ml-auto w-[18px] text-right font-mono text-[7px] leading-none text-text-ghost/50">
                {line.syllables}
              </span>
            </div>
          ) : (
            <div key={i} className="h-[7px]" />
          )
        )}
      </div>
    </div>
  );
}

// The element labels the screenplay editor prints in its left gutter.
function GutterTag({ children }: { children: string }) {
  return (
    <span className="w-[18px] shrink-0 pt-[1px] font-mono text-[6px] uppercase leading-none tracking-[0.08em] text-amber/45">
      {children}
    </span>
  );
}

function ScreenplaySurface() {
  return (
    <div className="flex h-full flex-col justify-center gap-[7px] bg-amber/[0.04] px-4 py-4">
      <div className="flex items-start">
        <GutterTag>SCN</GutterTag>
        <span className="font-mono text-[7.5px] uppercase leading-none tracking-[0.06em] text-text-secondary">
          INT. LIGHTHOUSE — NIGHT
        </span>
      </div>
      <div className="flex items-start">
        <GutterTag>ACT</GutterTag>
        <div className="flex flex-1 flex-col gap-[5px] pt-[1px]">
          <Line w="92%" dim />
          <Line w="68%" dim />
        </div>
      </div>
      <div className="flex items-start">
        <GutterTag>CHR</GutterTag>
        <span className="flex-1 pl-[34%] font-mono text-[7.5px] uppercase leading-none tracking-[0.12em] text-text">
          MAREN
        </span>
      </div>
      <div className="flex items-start">
        <GutterTag>DLG</GutterTag>
        <div className="flex flex-1 flex-col items-center gap-[5px] px-[18%] pt-[1px]">
          <Line w="100%" />
          <Line w="86%" />
          <Line w="58%" />
        </div>
      </div>
    </div>
  );
}

function WebtoonSurface() {
  return (
    <div className="flex h-full items-center justify-center py-3">
      {/* the strip runs past the bottom edge — that is the format */}
      <div className="flex h-full w-[92px] flex-col gap-[4px] overflow-hidden rounded-[9px] border border-border bg-void/40 p-[5px]">
        <div className="relative h-[42px] shrink-0 rounded-[3px] border border-border bg-subtle/70">
          <div className="absolute left-[7px] top-[7px] rounded-[5px] border border-border-active bg-elevated px-[5px] py-[4px]">
            <div className="h-[2px] w-[22px] rounded-full bg-text-ghost/45" />
            <div className="mt-[3px] h-[2px] w-[13px] rounded-full bg-text-ghost/45" />
            <div className="absolute -bottom-[3px] left-[9px] h-[5px] w-[5px] rotate-45 border-b border-r border-border-active bg-elevated" />
          </div>
        </div>
        <div className="relative h-[36px] shrink-0 rounded-[3px] border border-border bg-subtle/50">
          <div className="absolute inset-x-[8px] bottom-[9px] h-px bg-text-ghost/25" />
        </div>
        <div className="h-[44px] shrink-0 rounded-[3px] border border-border bg-subtle/60" />
      </div>
    </div>
  );
}

function IllustratedSurface() {
  return (
    <div className="flex h-full flex-col justify-center gap-[6px] px-6 py-4">
      <div className="flex gap-[10px]">
        <div className="flex flex-1 flex-col gap-[6px] pt-[1px]">
          <Line w="90%" />
          <Line w="97%" />
          <Line w="82%" />
          <Line w="94%" />
          <Line w="58%" dim />
        </div>
        {/* framed plate the text sets around */}
        <div className="shrink-0 rounded-[2px] border border-border-active bg-subtle/40 p-[3px]">
          <div className="relative h-[58px] w-[70px] overflow-hidden border border-border bg-elevated">
            <div className="absolute right-[9px] top-[8px] h-[9px] w-[9px] rounded-full bg-amber/35" />
            <div
              className="absolute inset-x-0 bottom-0 h-[24px] bg-text-ghost/25"
              style={{ clipPath: "polygon(0 100%, 26% 30%, 52% 100%, 70% 44%, 100% 100%)" }}
            />
          </div>
        </div>
      </div>
      <Line w="96%" />
      <Line w="70%" dim />
    </div>
  );
}

const SURFACES: Record<string, () => ReactElement> = {
  novel: NovelSurface,
  poetry: PoetrySurface,
  screenplay: ScreenplaySurface,
  webtoon: WebtoonSurface,
  illustrated: IllustratedSurface,
};

export default function FormatPreview({ format, className = "" }: { format: string; className?: string }) {
  const key = SURFACES[format] ? format : "novel";
  const Surface = SURFACES[key];

  return (
    <div className={`w-full max-w-[300px] ${className}`}>
      <p className="mb-2 text-center font-body text-[10px] uppercase tracking-[0.14em] text-text-ghost">
        The {SURFACE_LABEL[key]} editor
      </p>
      <div
        aria-hidden="true"
        className="pointer-events-none relative h-[144px] overflow-hidden rounded-md border border-border bg-elevated/70 backdrop-blur-xl"
      >
        <AnimatePresence>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Surface />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
