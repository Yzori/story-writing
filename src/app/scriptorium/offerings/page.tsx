"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { dropsToUsd } from "@/lib/constants";

// ── Types ──────────────────────────────────────────────────────────────────────

type CraftType =
  | "custom-chapter"
  | "cover-art"
  | "character-art"
  | "editing"
  | "poetry"
  | "worldbuilding"
  | "gm-for-hire"
  | "webtoon-panels"
  | "screenplay-coverage"
  | "scene-illustration"
  | "ghostwriting"
  | "story-bible";

interface Artisan {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Offering {
  id: string;
  craft: CraftType;
  title: string;
  description: string;
  priceMin: number;
  priceMax: number;
  deliveryDays: number;
  revisionRounds: number;
  completedCount: number;
  portfolioUrls: string[];
  artisan: Artisan;
}

type WizardStep = 1 | 2 | 3 | 4;

interface FormData {
  craft: CraftType | "";
  title: string;
  description: string;
  priceMin: string;
  priceMax: string;
  deliveryDays: number | null;
  revisionRounds: number | null;
}

const INITIAL_FORM: FormData = {
  craft: "",
  title: "",
  description: "",
  priceMin: "",
  priceMax: "",
  deliveryDays: null,
  revisionRounds: null,
};

// ── Craft Data ─────────────────────────────────────────────────────────────────

interface CraftMeta {
  value: CraftType;
  label: string;
  description: string;
  group: "Writing" | "Visual" | "Services";
}

const CRAFT_LIST: CraftMeta[] = [
  { value: "custom-chapter", label: "Custom Chapter", description: "Write a chapter or short story to a patron's brief", group: "Writing" },
  { value: "ghostwriting", label: "Ghostwriting", description: "Full stories or multi-chapter arcs written to spec", group: "Writing" },
  { value: "poetry", label: "Poetry", description: "Poems for occasions -- weddings, memorials, celebrations", group: "Writing" },
  { value: "screenplay-coverage", label: "Screenplay Coverage", description: "Professional feedback on structure, dialogue, pacing", group: "Writing" },
  { value: "editing", label: "Editing", description: "Line editing, copy editing, or developmental passes", group: "Writing" },
  { value: "cover-art", label: "Cover Art", description: "Story covers, typography design, promotional art", group: "Visual" },
  { value: "character-art", label: "Character Art", description: "Portraits, reference sheets, concept art", group: "Visual" },
  { value: "webtoon-panels", label: "Webtoon Panels", description: "Individual panels or full episode artwork", group: "Visual" },
  { value: "scene-illustration", label: "Scene Illustration", description: "Interior illustrations for chapters", group: "Visual" },
  { value: "worldbuilding", label: "Worldbuilding", description: "Maps, lore documents, world design consultations", group: "Services" },
  { value: "gm-for-hire", label: "GM for Hire", description: "Run a one-shot or campaign session for a group", group: "Services" },
  { value: "story-bible", label: "Story Bible", description: "Compile characters, locations, rules into a reference", group: "Services" },
];

const GROUP_COLORS: Record<string, { accent: string; accentBg: string; accentBorder: string; accentRing: string }> = {
  Writing: { accent: "text-gold", accentBg: "bg-gold/10", accentBorder: "border-gold/40", accentRing: "ring-gold/30" },
  Visual: { accent: "text-amethyst", accentBg: "bg-amethyst/10", accentBorder: "border-amethyst/40", accentRing: "ring-amethyst/30" },
  Services: { accent: "text-teal", accentBg: "bg-teal/10", accentBorder: "border-teal/40", accentRing: "ring-teal/30" },
};

const CRAFT_COLOR_MAP: Record<CraftType, { text: string; bg: string; border: string }> = {
  "custom-chapter": { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  ghostwriting: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  poetry: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  "screenplay-coverage": { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  editing: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  "cover-art": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "character-art": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "webtoon-panels": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  "scene-illustration": { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30" },
  worldbuilding: { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
  "gm-for-hire": { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
  "story-bible": { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30" },
};

function craftLabel(craft: CraftType): string {
  return CRAFT_LIST.find((c) => c.value === craft)?.label ?? craft;
}

function craftMeta(craft: CraftType): CraftMeta | undefined {
  return CRAFT_LIST.find((c) => c.value === craft);
}


const DELIVERY_OPTIONS = [3, 5, 7, 14, 21, 30];
const REVISION_OPTIONS = [1, 2, 3, 4, 5];

// ── SVG Icons (24x24 viewBox) ──────────────────────────────────────────────────

function CraftIcon({ craft, size = 24 }: { craft: CraftType; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (craft) {
    case "custom-chapter":
      return (<svg {...props}><path d="M4 4h12a2 2 0 012 2v12a2 2 0 01-2 2H4" /><path d="M4 4v16" /><path d="M8 8h4" /><path d="M8 12h6" /><path d="M18 8l3-3M19.5 6.5l-1-1" /></svg>);
    case "ghostwriting":
      return (<svg {...props}><path d="M7 20l3-3h0a2 2 0 012.83 0h0a2 2 0 002.83 0L20 12.5" /><path d="M20 12.5l-7-7L6 12.5" /><path d="M10 4a3 3 0 016 0c0 2-3 3-3 5" /><circle cx="13" cy="11" r="0.5" fill="currentColor" /></svg>);
    case "poetry":
      return (<svg {...props}><path d="M12 3c-1 4-5 6-5 10a5 5 0 0010 0c0-4-4-6-5-10z" /><path d="M9 14h6" /><path d="M10 17h4" /></svg>);
    case "screenplay-coverage":
      return (<svg {...props}><path d="M4 4h16v3H4z" /><path d="M6 7v13h12V7" /><path d="M4 4l2-1h12l2 1" /><path d="M9 11h6" /><path d="M9 14h4" /></svg>);
    case "editing":
      return (<svg {...props}><path d="M15 3l4 4-9 9H6v-4l9-9z" /><path d="M4 20h16" /><path d="M12 7l4 4" /><path d="M17 14l2-1" /><path d="M17 17l2 0" /></svg>);
    case "cover-art":
      return (<svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 3-3 6 6" /><circle cx="15" cy="8" r="2" /></svg>);
    case "character-art":
      return (<svg {...props}><circle cx="12" cy="8" r="4" /><path d="M5 20c0-4 3-7 7-7s7 3 7 7" /><path d="M12 4V3" /><path d="M15 5l1-1" /><path d="M9 5L8 4" /></svg>);
    case "webtoon-panels":
      return (<svg {...props}><rect x="3" y="3" width="18" height="6" rx="1" /><rect x="3" y="11" width="8" height="10" rx="1" /><rect x="13" y="11" width="8" height="10" rx="1" /></svg>);
    case "scene-illustration":
      return (<svg {...props}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 16l6-6 4 4 3-3 7 7" /><path d="M17 8l2-2 3 3" /></svg>);
    case "worldbuilding":
      return (<svg {...props}><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /><path d="M5 7h14" /><path d="M5 17h14" /></svg>);
    case "gm-for-hire":
      return (<svg {...props}><rect x="3" y="3" width="8" height="8" rx="1" transform="rotate(45 7 7)" /><circle cx="7" cy="7" r="1" fill="currentColor" /><path d="M15 4l3 1.5L15 7" /><path d="M15 4v3" /><circle cx="17" cy="15" r="5" /><path d="M17 12v3h3" /></svg>);
    case "story-bible":
      return (<svg {...props}><path d="M4 4h12a2 2 0 012 2v12a2 2 0 01-2 2H4" /><path d="M4 4v16" /><path d="M4 4h1a1 1 0 011 1v14a1 1 0 01-1 1H4" /><path d="M9 8h4" /><path d="M9 12h5" /><path d="M9 16h3" /><path d="M18 6v3l1.5-1.5L21 9V6" /></svg>);
  }
}

function DropIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2c0 0-5 5.5-5 9a5 5 0 0010 0c0-3.5-5-9-5-9z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8a6 6 0 0111-3M14 8a6 6 0 01-11 3" />
      <path d="M13 2v4h-4M3 14v-4h4" />
    </svg>
  );
}

function CheckCircleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l3 3 7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

// ── Shared Components ──────────────────────────────────────────────────────────

function Spinner({ className = "" }: { className?: string }) {
  return (
    <motion.span
      className={`inline-block w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-ink/50 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-24 rounded bg-surface" />
        <div className="h-5 w-10 rounded-full bg-surface" />
      </div>
      <div className="h-6 w-3/4 rounded bg-surface mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full rounded bg-surface" />
        <div className="h-4 w-2/3 rounded bg-surface" />
      </div>
      <div className="flex gap-4">
        <div className="h-4 w-20 rounded bg-surface" />
        <div className="h-4 w-16 rounded bg-surface" />
        <div className="h-4 w-18 rounded bg-surface" />
      </div>
    </div>
  );
}

// ── Step Indicator ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Craft", "Details", "Terms", "Preview"];

function StepIndicator({ current, completed }: { current: WizardStep; completed: Set<number> }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEP_LABELS.map((label, i) => {
        const step = (i + 1) as WizardStep;
        const isActive = step === current;
        const isDone = completed.has(step);
        const isLast = i === STEP_LABELS.length - 1;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors duration-300 ${
                  isActive
                    ? "border-gold bg-gold/20 text-gold"
                    : isDone
                    ? "border-gold/60 bg-gold/10 text-gold/80"
                    : "border-border bg-ink/30 text-text-ghost"
                }`}
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                {isDone && !isActive ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 8l3 3 7-7" />
                  </svg>
                ) : (
                  step
                )}
              </motion.div>
              <span
                className={`text-[10px] mt-1.5 tracking-wide uppercase font-medium transition-colors ${
                  isActive ? "text-gold" : isDone ? "text-gold/60" : "text-text-ghost"
                }`}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`w-12 sm:w-20 h-px mx-2 mb-5 transition-colors duration-300 ${
                  isDone ? "bg-gold/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Choose Your Craft ──────────────────────────────────────────────────

function StepCraft({
  selected,
  onSelect,
}: {
  selected: CraftType | "";
  onSelect: (craft: CraftType) => void;
}) {
  const groups = useMemo(() => {
    const map: Record<string, CraftMeta[]> = { Writing: [], Visual: [], Services: [] };
    CRAFT_LIST.forEach((c) => map[c.group].push(c));
    return map;
  }, []);

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl text-paper mb-2">Choose Your Craft</h2>
        <p className="text-text-secondary text-sm">Select the type of service you want to offer</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["Writing", "Visual", "Services"] as const).map((groupName) => {
          const colors = GROUP_COLORS[groupName];
          return (
            <div key={groupName}>
              <h3 className={`text-xs uppercase tracking-[0.15em] font-bold mb-3 ${colors.accent}`}>
                {groupName}
              </h3>
              <div className="space-y-2.5">
                {groups[groupName].map((craft) => {
                  const isSelected = selected === craft.value;
                  return (
                    <motion.button
                      key={craft.value}
                      type="button"
                      onClick={() => onSelect(craft.value)}
                      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 group relative ${
                        isSelected
                          ? `${colors.accentBorder} ${colors.accentBg} ring-1 ${colors.accentRing}`
                          : "border-border bg-ink/30 hover:bg-ink/60 hover:border-text-ghost/30"
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex-shrink-0 transition-colors ${
                            isSelected ? colors.accent : "text-text-ghost group-hover:text-text-secondary"
                          }`}
                        >
                          <CraftIcon craft={craft.value} size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold transition-colors ${
                                isSelected ? "text-paper" : "text-text group-hover:text-paper"
                              }`}
                            >
                              {craft.label}
                            </span>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={colors.accent}
                              >
                                <CheckCircleIcon size={18} />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-xs text-text-ghost mt-0.5 leading-relaxed">
                            {craft.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Describe Your Service ──────────────────────────────────────────────

function StepDetails({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: {
  title: string;
  description: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}) {
  const titleValid = title.length >= 5;
  const titleTouched = title.length > 0;
  const descValid = description.length >= 20;
  const descTouched = description.length > 0;
  const descNearLimit = description.length > 1800;

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl text-paper mb-2">Describe Your Service</h2>
        <p className="text-text-secondary text-sm">Tell patrons what they will receive and how you work</p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Title */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
            Offering Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value.slice(0, 100))}
            placeholder="A name that captures your service in a few words..."
            className={`w-full rounded-lg border bg-surface/50 px-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none transition-all duration-200 ${
              titleTouched
                ? titleValid
                  ? "border-sage/40 focus:border-sage/60 focus:ring-1 focus:ring-sage/20"
                  : "border-ruby/40 focus:border-ruby/60 focus:ring-1 focus:ring-ruby/20"
                : "border-border focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            }`}
          />
          <div className="flex items-center justify-between mt-1.5">
            {titleTouched && !titleValid && (
              <span className="text-ruby text-xs">At least 5 characters needed</span>
            )}
            {titleTouched && titleValid && (
              <span className="text-sage text-xs">Looks good</span>
            )}
            {!titleTouched && <span />}
            <span
              className={`text-xs tabular-nums ${
                titleTouched && !titleValid ? "text-ruby" : "text-text-ghost"
              }`}
            >
              {title.length}/100
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value.slice(0, 2000))}
            rows={6}
            placeholder={`Describe what is included in this offering.\n\nConsider mentioning:\n- What the patron receives (word count, file format, etc.)\n- Your process and communication style\n- Any requirements or information you need upfront\n- What makes your approach unique`}
            className={`w-full rounded-lg border bg-surface/50 px-4 py-3 text-text text-sm placeholder:text-text-ghost/60 focus:outline-none resize-none transition-all duration-200 leading-relaxed ${
              descTouched
                ? descValid
                  ? "border-sage/40 focus:border-sage/60 focus:ring-1 focus:ring-sage/20"
                  : "border-ruby/40 focus:border-ruby/60 focus:ring-1 focus:ring-ruby/20"
                : "border-border focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            }`}
          />
          <div className="flex items-center justify-between mt-1.5">
            {descTouched && !descValid && (
              <span className="text-ruby text-xs">At least 20 characters needed</span>
            )}
            {descTouched && descValid && (
              <span className="text-sage text-xs">Looks good</span>
            )}
            {!descTouched && <span />}
            <span
              className={`text-xs tabular-nums ${
                descNearLimit ? "text-amber" : descTouched && !descValid ? "text-ruby" : "text-text-ghost"
              }`}
            >
              {description.length}/2,000
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Set Your Terms ─────────────────────────────────────────────────────

function StepTerms({
  form,
  onUpdate,
}: {
  form: FormData;
  onUpdate: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  const minNum = Number(form.priceMin) || 0;
  const maxNum = Number(form.priceMax) || 0;
  const showConversion = minNum > 0 || maxNum > 0;

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl text-paper mb-2">Set Your Terms</h2>
        <p className="text-text-secondary text-sm">Define pricing, delivery timeline, and revision policy</p>
      </div>

      <div className="max-w-xl mx-auto space-y-8">
        {/* Price Range */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-3">
            Price Range (Ink Drops)
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost">
                  <DropIcon size={14} />
                </div>
                <input
                  type="number"
                  value={form.priceMin}
                  onChange={(e) => onUpdate("priceMin", e.target.value)}
                  min={50}
                  max={1500}
                  placeholder="50"
                  className="w-full rounded-lg border border-border bg-surface/50 pl-8 pr-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
                />
              </div>
              <span className="text-[10px] text-text-ghost mt-1 block">Minimum</span>
            </div>
            <span className="text-text-ghost text-sm font-medium pt-[-12px]">to</span>
            <div className="flex-1">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost">
                  <DropIcon size={14} />
                </div>
                <input
                  type="number"
                  value={form.priceMax}
                  onChange={(e) => onUpdate("priceMax", e.target.value)}
                  min={50}
                  max={1500}
                  placeholder="500"
                  className="w-full rounded-lg border border-border bg-surface/50 pl-8 pr-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
                />
              </div>
              <span className="text-[10px] text-text-ghost mt-1 block">Maximum</span>
            </div>
          </div>
          {showConversion && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-text-ghost mt-2.5 text-center"
            >
              {minNum > 0 && maxNum > 0
                ? `${minNum} -- ${maxNum} drops (~$${dropsToUsd(minNum)} -- $${dropsToUsd(maxNum)} USD)`
                : minNum > 0
                ? `${minNum} drops (~$${dropsToUsd(minNum)} USD)`
                : `${maxNum} drops (~$${dropsToUsd(maxNum)} USD)`}
            </motion.p>
          )}
        </div>

        {/* Delivery Time */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-3">
            Delivery Time
          </label>
          <div className="flex flex-wrap gap-2.5">
            {DELIVERY_OPTIONS.map((days) => {
              const isSelected = form.deliveryDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => onUpdate("deliveryDays", days)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                    isSelected
                      ? "border-gold/50 bg-gold/15 text-gold"
                      : "border-border bg-ink/30 text-text-secondary hover:text-text hover:border-text-ghost/40 hover:bg-ink/50"
                  }`}
                >
                  {days} {days === 1 ? "day" : "days"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Revision Rounds */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-3">
            Revision Rounds
          </label>
          <div className="flex flex-wrap gap-2.5">
            {REVISION_OPTIONS.map((rounds) => {
              const isSelected = form.revisionRounds === rounds;
              return (
                <button
                  key={rounds}
                  type="button"
                  onClick={() => onUpdate("revisionRounds", rounds)}
                  className={`w-12 h-12 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                    isSelected
                      ? "border-gold/50 bg-gold/15 text-gold"
                      : "border-border bg-ink/30 text-text-secondary hover:text-text hover:border-text-ghost/40 hover:bg-ink/50"
                  }`}
                >
                  {rounds}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-text-ghost mt-2">
            Number of times a patron can request changes
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Preview & Publish ──────────────────────────────────────────────────

function OfferingPreviewCard({ form }: { form: FormData }) {
  const craft = form.craft as CraftType;
  const colors = CRAFT_COLOR_MAP[craft];
  const minNum = Number(form.priceMin) || 0;
  const maxNum = Number(form.priceMax) || 0;

  return (
    <div className="rounded-xl border border-border bg-ink/50 p-6 max-w-md mx-auto">
      {/* Craft badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`${colors.text}`}>
          <CraftIcon craft={craft} size={18} />
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold border ${colors.text} ${colors.bg} ${colors.border}`}
        >
          {craftLabel(craft)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-display text-paper text-lg mb-2 leading-snug">
        {form.title || "Untitled Offering"}
      </h3>

      {/* Description */}
      <p className="text-text-secondary text-sm leading-relaxed line-clamp-3 mb-5">
        {form.description || "No description provided."}
      </p>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-ghost pt-4 border-t border-border/50">
        <span className="inline-flex items-center gap-1.5">
          <DropIcon />
          <span className="text-text-secondary font-medium">
            {minNum === maxNum
              ? `${minNum} drops`
              : `${minNum} -- ${maxNum} drops`}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon />
          <span className="text-text-secondary">~{form.deliveryDays} days</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RefreshIcon />
          <span className="text-text-secondary">{form.revisionRounds} revision{form.revisionRounds === 1 ? "" : "s"}</span>
        </span>
      </div>
    </div>
  );
}

function StepPreview({
  form,
  submitting,
  error,
  onPublish,
}: {
  form: FormData;
  submitting: boolean;
  error: string;
  onPublish: () => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl text-paper mb-2">Preview Your Offering</h2>
        <p className="text-text-secondary text-sm">This is how patrons will see your service</p>
      </div>

      {/* Preview card */}
      <OfferingPreviewCard form={form} />

      {/* Summary details */}
      <div className="max-w-md mx-auto mt-8 rounded-xl border border-border/50 bg-ink/30 p-5">
        <h4 className="text-xs uppercase tracking-[0.12em] text-text-ghost font-semibold mb-3">
          Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-ghost">Craft</span>
            <span className="text-text">{craftLabel(form.craft as CraftType)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-ghost">Price Range</span>
            <span className="text-text">{form.priceMin} -- {form.priceMax} drops</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-ghost">USD Estimate</span>
            <span className="text-text">~${dropsToUsd(Number(form.priceMin))} -- ${dropsToUsd(Number(form.priceMax))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-ghost">Delivery</span>
            <span className="text-text">{form.deliveryDays} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-ghost">Revisions</span>
            <span className="text-text">{form.revisionRounds} round{form.revisionRounds === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-ruby text-sm text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Publish button */}
      <div className="flex justify-center mt-8">
        <motion.button
          onClick={onPublish}
          disabled={submitting}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-gold/20 to-amber/20 text-gold border border-gold/40 hover:from-gold/30 hover:to-amber/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-semibold flex items-center gap-2.5 shadow-lg shadow-gold/5"
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
        >
          {submitting ? (
            <>
              <Spinner />
              Publishing...
            </>
          ) : (
            <>
              <SparkleIcon />
              Publish Offering
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

// ── Success Screen ─────────────────────────────────────────────────────────────

function SuccessScreen({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gold"
        >
          <CheckCircleIcon size={36} />
        </motion.div>
      </motion.div>

      <motion.h2
        className="font-display text-2xl text-paper mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        Offering Published
      </motion.h2>
      <motion.p
        className="text-text-secondary text-sm max-w-sm mx-auto mb-8 leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        Your service is now live in Commissions. Patrons can discover
        and commission you starting now.
      </motion.p>
      <motion.button
        onClick={onDone}
        className="px-6 py-2.5 rounded-lg bg-ink/50 border border-border text-text-secondary text-sm hover:text-paper hover:border-text-ghost/40 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        Back to My Offerings
      </motion.button>
    </motion.div>
  );
}

// ── Create Offering Wizard ─────────────────────────────────────────────────────

function CreateOfferingWizard({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  }

  const completedSteps = useMemo(() => {
    const set = new Set<number>();
    if (form.craft) set.add(1);
    if (form.title.length >= 5 && form.description.length >= 20) set.add(2);
    const min = Number(form.priceMin);
    const max = Number(form.priceMax);
    if (min >= 50 && max >= 50 && min <= max && form.deliveryDays && form.revisionRounds) set.add(3);
    return set;
  }, [form]);

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return !!form.craft;
      case 2:
        return form.title.length >= 5 && form.description.length >= 20;
      case 3: {
        const min = Number(form.priceMin);
        const max = Number(form.priceMax);
        return min >= 50 && min <= 1500 && max >= 50 && max <= 1500 && min <= max && !!form.deliveryDays && !!form.revisionRounds;
      }
      default:
        return true;
    }
  }

  function goNext() {
    if (step < 4 && canProceed()) {
      setDirection(1);
      setStep((s) => (s + 1) as WizardStep);
    }
  }

  function goBack() {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => (s - 1) as WizardStep);
    }
  }

  async function handlePublish() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/scriptorium/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craft: form.craft,
          title: form.title.trim(),
          description: form.description.trim(),
          priceMin: Number(form.priceMin),
          priceMax: Number(form.priceMax),
          deliveryDays: form.deliveryDays,
          revisionRounds: form.revisionRounds,
          portfolioUrls: [],
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to create offering.");
      }

      setSuccess(true);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <SuccessScreen
        onDone={() => {
          setSuccess(false);
          setForm(INITIAL_FORM);
          setStep(1);
          onCancel();
        }}
      />
    );
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Close button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-text-ghost hover:text-text hover:bg-ink/50 transition-colors"
          title="Cancel"
        >
          <XIcon />
        </button>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} completed={completedSteps} />

      {/* Step content */}
      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {step === 1 && (
              <StepCraft
                selected={form.craft}
                onSelect={(craft) => updateField("craft", craft)}
              />
            )}
            {step === 2 && (
              <StepDetails
                title={form.title}
                description={form.description}
                onTitleChange={(v) => updateField("title", v)}
                onDescriptionChange={(v) => updateField("description", v)}
              />
            )}
            {step === 3 && <StepTerms form={form} onUpdate={updateField} />}
            {step === 4 && (
              <StepPreview
                form={form}
                submitting={submitting}
                error={error}
                onPublish={handlePublish}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/50">
        <button
          onClick={goBack}
          disabled={step === 1}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-paper disabled:opacity-0 disabled:pointer-events-none transition-all"
        >
          <ArrowLeftIcon />
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ArrowRightIcon />
          </button>
        ) : (
          <div /> // Publish button is inside StepPreview
        )}
      </div>
    </motion.div>
  );
}

// ── Offering Card (List View) ──────────────────────────────────────────────────

function OfferingCard({
  offering,
  index,
}: {
  offering: Offering;
  index: number;
}) {
  const [active, setActive] = useState(true);
  const [showEditTooltip, setShowEditTooltip] = useState(false);
  const colors = CRAFT_COLOR_MAP[offering.craft];

  return (
    <motion.div
      className={`rounded-xl border border-border bg-ink/50 p-6 flex flex-col relative group transition-opacity duration-300 ${
        active ? "opacity-100" : "opacity-50"
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: active ? 1 : 0.5, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      {/* Top row: badge + controls */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`${colors.text}`}>
            <CraftIcon craft={offering.craft} size={18} />
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold border ${colors.text} ${colors.bg} ${colors.border}`}
          >
            {craftLabel(offering.craft)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit button */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowEditTooltip(true)}
              onMouseLeave={() => setShowEditTooltip(false)}
              className="p-1.5 rounded-md text-text-ghost hover:text-text-secondary hover:bg-surface/30 transition-colors"
            >
              <PencilIcon />
            </button>
            <AnimatePresence>
              {showEditTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute right-0 top-full mt-1 z-10 px-3 py-1.5 rounded-lg bg-elevated border border-border text-[11px] text-text-secondary whitespace-nowrap shadow-xl"
                >
                  Editing coming soon
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active toggle */}
          <button
            onClick={() => setActive((prev) => !prev)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
              active ? "bg-gold/30" : "bg-surface/50"
            }`}
          >
            <motion.div
              className={`absolute top-0.5 w-4 h-4 rounded-full transition-colors duration-200 ${
                active ? "bg-gold" : "bg-text-ghost"
              }`}
              animate={{ left: active ? 18 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-display text-paper text-base mb-2 leading-snug">
        {offering.title}
      </h3>

      {/* Description */}
      <p className="text-text-secondary text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
        {offering.description}
      </p>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-ghost pt-3 border-t border-border/30">
        <span className="inline-flex items-center gap-1.5">
          <DropIcon />
          <span className="text-text-secondary font-medium">
            {offering.priceMin === offering.priceMax
              ? `${offering.priceMin} drops`
              : `${offering.priceMin} -- ${offering.priceMax} drops`}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon />
          <span className="text-text-secondary">~{offering.deliveryDays}d</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RefreshIcon />
          <span className="text-text-secondary">{offering.revisionRounds} rev</span>
        </span>
        {offering.completedCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon />
            <span className="text-text-secondary">{offering.completedCount} done</span>
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      className="text-center py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="w-20 h-20 rounded-full bg-ink/50 border border-border flex items-center justify-center mx-auto mb-5">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-text-ghost"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
      </div>
      <h3 className="font-display text-xl text-paper mb-2">No offerings yet</h3>
      <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed mb-6">
        Share your craft with the guild. Create your first service offering
        and start accepting commissions from fellow storytellers.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold/15 to-amber/15 text-gold border border-gold/30 hover:from-gold/25 hover:to-amber/25 transition-all text-sm font-medium"
      >
        <PlusIcon />
        Create Your First Offering
      </button>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MyOfferingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  const userId = session?.user?.id;

  const fetchMyOfferings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/scriptorium/offerings?artisanId=${userId}`);
      if (!res.ok) throw new Error("Failed to load offerings.");
      const data = await res.json();
      setOfferings(data.offerings ?? []);
    } catch {
      setError("Could not load your offerings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchMyOfferings();
  }, [userId, fetchMyOfferings]);

  // Unauthenticated
  if (sessionStatus === "unauthenticated") {
    return (
      <div className="relative min-h-screen">
        <div className="px-4 pt-12 pb-8 md:pt-16 text-center">
          <h1 className="font-display text-3xl md:text-4xl text-paper mb-3 tracking-tight">
            My Offerings
          </h1>
          <p className="text-text-secondary text-base max-w-lg mx-auto leading-relaxed">
            Sign in to manage your commission offerings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="relative px-4 pt-12 pb-8 md:pt-16 md:pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-3xl md:text-4xl text-paper mb-3 tracking-tight">
            My Offerings
          </h1>
          <p className="text-text-secondary text-base max-w-lg mx-auto leading-relaxed">
            Services you offer to fellow storytellers
          </p>
        </motion.div>

        {/* Decorative rule */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-border" />
          <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-border" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-20 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {showWizard ? (
            <motion.div
              key="wizard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border bg-ink/30 backdrop-blur-sm p-6 md:p-10"
            >
              <CreateOfferingWizard
                onCreated={fetchMyOfferings}
                onCancel={() => setShowWizard(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Create button (shown when user has offerings) */}
              {!loading && offerings.length > 0 && (
                <motion.div
                  className="mb-8 flex justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <button
                    onClick={() => setShowWizard(true)}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-gold/15 to-amber/15 text-gold border border-gold/30 hover:from-gold/25 hover:to-amber/25 transition-all text-sm font-semibold shadow-lg shadow-gold/5"
                  >
                    <PlusIcon />
                    Create New Offering
                  </button>
                </motion.div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : error ? (
                /* Error */
                <motion.div
                  className="text-center py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-full bg-ink/50 border border-border flex items-center justify-center mx-auto mb-4">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-ruby"
                    >
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3" />
                      <circle cx="8" cy="11" r="0.5" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="text-ruby text-sm mb-4">{error}</p>
                  <button
                    onClick={fetchMyOfferings}
                    className="px-4 py-2 rounded-lg bg-ink/50 border border-border text-text-secondary text-sm hover:text-text transition-colors"
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : offerings.length === 0 ? (
                <EmptyState onCreate={() => setShowWizard(true)} />
              ) : (
                /* Offerings grid */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {offerings.map((offering, i) => (
                    <OfferingCard key={offering.id} offering={offering} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
