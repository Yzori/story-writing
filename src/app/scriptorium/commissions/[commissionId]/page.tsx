"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// ── Types ──

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

type CommissionStatus =
  | "requested"
  | "quoted"
  | "accepted"
  | "in-progress"
  | "delivered"
  | "completed"
  | "revision"
  | "cancelled";

interface Sender {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface CommissionMessage {
  id: string;
  content: string;
  attachmentUrl: string | null;
  isDelivery: boolean;
  isSystemMessage: boolean;
  createdAt: string;
  sender: Sender;
}

interface Testimonial {
  rating: number;
  comment: string | null;
  tags: string[];
  createdAt: string;
}

interface Commission {
  id: string;
  offeringId: string;
  patronId: string;
  artisanId: string;
  storyId: string | null;
  status: CommissionStatus;
  brief: string;
  quotedPrice: number | null;
  agreedPrice: number | null;
  revisionsUsed: number;
  maxRevisions: number;
  deliveryDeadline: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  testimonial?: Testimonial | null;
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
  artisan: Sender;
}

interface CommissionDetail {
  commission: Commission;
  messages: CommissionMessage[];
  offering: Offering;
}

// ── Craft metadata ──

const CRAFT_LABELS: Record<CraftType, string> = {
  "custom-chapter": "Custom Chapter",
  "cover-art": "Cover Art",
  "character-art": "Character Art",
  editing: "Editing",
  poetry: "Poetry",
  worldbuilding: "Worldbuilding",
  "gm-for-hire": "GM for Hire",
  "webtoon-panels": "Webtoon Panels",
  "screenplay-coverage": "Screenplay Coverage",
  "scene-illustration": "Scene Illustration",
  ghostwriting: "Ghostwriting",
  "story-bible": "Story Bible",
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

const STATUS_STYLES: Record<CommissionStatus, { text: string; bg: string; border: string; label: string }> = {
  requested: { text: "text-text-secondary", bg: "bg-text-secondary/10", border: "border-text-secondary/30", label: "Requested" },
  quoted: { text: "text-amber", bg: "bg-amber/10", border: "border-amber/30", label: "Quoted" },
  accepted: { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30", label: "Accepted" },
  "in-progress": { text: "text-teal", bg: "bg-teal/10", border: "border-teal/30", label: "In Progress" },
  delivered: { text: "text-gold", bg: "bg-gold/10", border: "border-gold/30", label: "Delivered" },
  completed: { text: "text-sage", bg: "bg-sage/10", border: "border-sage/30", label: "Completed" },
  cancelled: { text: "text-rose", bg: "bg-rose/10", border: "border-rose/30", label: "Cancelled" },
  revision: { text: "text-amethyst", bg: "bg-amethyst/10", border: "border-amethyst/30", label: "Revision Requested" },
};

// ── Icons ──

function DropIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
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

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

function QuillIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={`${filled ? "text-gold" : "text-text-ghost/40"} transition-colors ${className}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 2c-2 0-6 2-8 6-1 2-1.5 4-1.8 5.5L7 17l-3 5h2l2.5-3.5c1.5.2 3-.2 5-1.2 4-2 6-6 6-8V2z" />
      <path d="M10.2 13.5L7 17" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ── Helpers ──

function Spinner({ className = "" }: { className?: string }) {
  return (
    <motion.span
      className={`inline-block w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

// ── Skeleton ──

function DetailSkeleton() {
  return (
    <div className="px-4 pt-8 pb-20 max-w-4xl mx-auto animate-pulse">
      <div className="h-5 w-24 rounded bg-surface mb-6" />
      <div className="flex items-center gap-3 mb-6">
        <div className="h-5 w-20 rounded-full bg-surface" />
        <div className="h-8 w-64 rounded bg-surface" />
        <div className="h-5 w-24 rounded-full bg-surface" />
      </div>
      <div className="rounded-xl border border-border bg-ink/50 p-6 mb-6">
        <div className="h-4 w-full rounded bg-surface mb-3" />
        <div className="h-4 w-3/4 rounded bg-surface mb-3" />
        <div className="h-4 w-1/2 rounded bg-surface" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-surface shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-surface mb-2" />
              <div className="h-16 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Action Bar ──

function ActionBar({
  commission,
  offering,
  role,
  onAction,
  acting,
}: {
  commission: Commission;
  offering: Offering;
  role: "patron" | "artisan";
  onAction: (action: string, payload?: Record<string, string | number>) => Promise<void>;
  acting: boolean;
}) {
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  // Testimonial state
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialRating, setTestimonialRating] = useState(0);
  const [testimonialComment, setTestimonialComment] = useState("");
  const [testimonialTags, setTestimonialTags] = useState<string[]>([]);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);

  const revisionsRemaining = commission.maxRevisions - commission.revisionsUsed;

  // ── Requested: artisan sends quote ──
  if (commission.status === "requested" && role === "artisan") {
    return (
      <div className="rounded-xl border border-amber/30 bg-amber/5 p-5">
        <h4 className="font-display text-sm text-amber mb-3">Send a Quote</h4>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex-1">
            <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-1.5">
              Price (drops)
            </label>
            <input
              type="number"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              min={offering.priceMin}
              max={offering.priceMax}
              placeholder={`${offering.priceMin} -- ${offering.priceMax}`}
              className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-1.5">
            Message (optional)
          </label>
          <textarea
            value={quoteMessage}
            onChange={(e) => setQuoteMessage(e.target.value)}
            rows={2}
            placeholder="Any notes about scope, timeline, or approach..."
            className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 resize-none transition-colors"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => {
              const price = Number(quotePrice);
              if (!price || price < offering.priceMin || price > offering.priceMax) return;
              const payload: Record<string, string | number> = { price };
              if (quoteMessage.trim()) payload.message = quoteMessage.trim();
              onAction("quote", payload);
            }}
            disabled={acting || !quotePrice}
            className="px-5 py-2 rounded-lg bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            {acting ? <><Spinner /> Sending...</> : "Send Quote"}
          </button>
        </div>
      </div>
    );
  }

  // ── Quoted: patron accepts or declines ──
  if (commission.status === "quoted" && role === "patron") {
    return (
      <div className="rounded-xl border border-amber/30 bg-amber/5 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="font-display text-sm text-amber mb-1">Quote Received</h4>
            <p className="text-paper text-2xl font-display flex items-center gap-2">
              <DropIcon />
              {commission.quotedPrice} drops
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onAction("cancel")}
              disabled={acting}
              className="px-4 py-2 rounded-lg text-text-secondary border border-border hover:text-text hover:border-text-ghost transition-colors text-sm"
            >
              Decline
            </button>
            <button
              onClick={() => onAction("accept")}
              disabled={acting}
              className="px-5 py-2 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
            >
              {acting ? <><Spinner /> Accepting...</> : `Accept Quote (${commission.quotedPrice} drops)`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── In-progress / Revision: artisan submits delivery ──
  if ((commission.status === "in-progress" || commission.status === "accepted" || commission.status === "revision") && role === "artisan") {
    return (
      <div className="rounded-xl border border-teal/30 bg-teal/5 p-5">
        <h4 className="font-display text-sm text-teal mb-3">Submit Delivery</h4>
        <div className="mb-3">
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-1.5">
            Message
          </label>
          <textarea
            value={deliveryMessage}
            onChange={(e) => setDeliveryMessage(e.target.value)}
            rows={3}
            placeholder="Describe the delivered work..."
            className="w-full rounded-lg border border-border bg-surface/50 px-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 resize-none transition-colors"
          />
        </div>
        <div className="mb-3">
          <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-1.5">
            Attachment URL (optional)
          </label>
          <input
            type="url"
            value={deliveryUrl}
            onChange={(e) => setDeliveryUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (!deliveryMessage.trim()) return;
              const payload: Record<string, string> = { message: deliveryMessage.trim() };
              if (deliveryUrl.trim()) payload.attachmentUrl = deliveryUrl.trim();
              onAction("deliver", payload);
            }}
            disabled={acting || !deliveryMessage.trim()}
            className="px-5 py-2 rounded-lg bg-teal/10 text-teal border border-teal/30 hover:bg-teal/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
          >
            {acting ? <><Spinner /> Submitting...</> : "Submit Delivery"}
          </button>
        </div>
      </div>
    );
  }

  // ── Delivered: patron accepts or requests revision ──
  if (commission.status === "delivered" && role === "patron") {
    return (
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
          <div>
            <h4 className="font-display text-sm text-gold mb-1">Work Delivered</h4>
            <p className="text-text-secondary text-xs">
              Review the delivery and choose an action below.
            </p>
          </div>
          <div className="flex gap-3">
            {revisionsRemaining > 0 && (
              <button
                onClick={() => setShowRevisionForm((prev) => !prev)}
                disabled={acting}
                className="px-4 py-2 rounded-lg text-amethyst border border-amethyst/30 bg-amethyst/5 hover:bg-amethyst/10 transition-colors text-sm font-medium"
              >
                Request Revision ({commission.revisionsUsed}/{commission.maxRevisions} used)
              </button>
            )}
            <button
              onClick={() => onAction("complete")}
              disabled={acting}
              className="px-5 py-2 rounded-lg bg-sage/10 text-sage border border-sage/30 hover:bg-sage/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
            >
              {acting ? <><Spinner /> Completing...</> : "Accept & Complete"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showRevisionForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-border mt-3">
                <label className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold block mb-1.5">
                  Revision Feedback
                </label>
                <textarea
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  rows={3}
                  placeholder="Describe what changes you need..."
                  className="w-full rounded-lg border border-border bg-surface/50 px-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-amethyst/50 focus:ring-1 focus:ring-amethyst/20 resize-none transition-colors mb-3"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!revisionFeedback.trim()) return;
                      onAction("revision", { message: revisionFeedback.trim() });
                    }}
                    disabled={acting || !revisionFeedback.trim()}
                    className="px-5 py-2 rounded-lg bg-amethyst/10 text-amethyst border border-amethyst/30 hover:bg-amethyst/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    {acting ? <><Spinner /> Sending...</> : "Send Revision Request"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Completed ──
  if (commission.status === "completed") {
    const hasTestimonial = !!commission.testimonial;
    const canLeaveTestimonial = role === "patron" && !hasTestimonial && !testimonialSubmitted;

    const TESTIMONIAL_TAG_OPTIONS = [
      "Fast Delivery",
      "Exceeded Expectations",
      "Great Communication",
      "True to Brief",
    ];

    const toggleTag = (tag: string) => {
      setTestimonialTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
    };

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-sage/30 bg-sage/5 p-5 text-center">
          <div className="flex items-center justify-center gap-2 text-sage">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8l3 3 7-7" />
            </svg>
            <span className="font-display text-sm">Commission Complete</span>
          </div>
          {commission.completedAt && (
            <p className="text-text-ghost text-xs mt-1">
              Completed on {formatDate(commission.completedAt)}
            </p>
          )}
        </div>

        {/* Existing testimonial display */}
        {hasTestimonial && commission.testimonial && (
          <div className="rounded-xl border border-gold/20 bg-gold/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <QuillIcon
                    key={i}
                    filled={i < commission.testimonial!.rating}
                    className="w-4 h-4"
                  />
                ))}
              </div>
              <span className="text-text-ghost text-[10px]">
                {formatDate(commission.testimonial.createdAt)}
              </span>
            </div>
            {commission.testimonial.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {commission.testimonial.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {commission.testimonial.comment && (
              <p className="text-text-secondary text-sm leading-relaxed">
                {commission.testimonial.comment}
              </p>
            )}
          </div>
        )}

        {/* Testimonial submitted confirmation */}
        {testimonialSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gold/30 bg-gold/5 p-5 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-gold mb-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l3 3 7-7" />
              </svg>
              <span className="font-display text-sm">Testimonial Submitted</span>
            </div>
            <p className="text-text-ghost text-xs">Thank you for your feedback.</p>
          </motion.div>
        )}

        {/* Leave testimonial toggle */}
        {canLeaveTestimonial && !showTestimonialForm && (
          <button
            onClick={() => setShowTestimonialForm(true)}
            className="w-full px-4 py-3 rounded-xl border border-gold/20 bg-gold/5 text-gold text-sm font-medium hover:bg-gold/10 hover:border-gold/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <QuillIcon filled={false} className="w-4 h-4" />
            Leave a Testimonial
          </button>
        )}

        {/* Testimonial form */}
        <AnimatePresence>
          {canLeaveTestimonial && showTestimonialForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-gold/20 bg-ink/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm text-gold">Leave a Testimonial</h4>
                  <button
                    onClick={() => setShowTestimonialForm(false)}
                    className="text-text-ghost hover:text-text-secondary transition-colors cursor-pointer p-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>

                {/* Star rating with quill icons */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
                    Rating
                  </label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setTestimonialRating(i + 1)}
                        className="cursor-pointer p-0.5 transition-transform hover:scale-110"
                      >
                        <QuillIcon
                          filled={i < testimonialRating}
                          className="w-6 h-6"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
                    Tags (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TESTIMONIAL_TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all cursor-pointer ${
                          testimonialTags.includes(tag)
                            ? "bg-gold/15 border-gold/40 text-gold"
                            : "bg-void/50 border-border text-text-secondary hover:border-gold/25"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.12em] text-text-ghost font-semibold">
                    Comment (optional)
                  </label>
                  <textarea
                    value={testimonialComment}
                    onChange={(e) => {
                      if (e.target.value.length <= 500)
                        setTestimonialComment(e.target.value);
                    }}
                    rows={3}
                    placeholder="Share your experience working with this artisan..."
                    className="w-full rounded-lg border border-border bg-surface/50 px-4 py-3 text-text text-sm placeholder:text-text-ghost focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 resize-none transition-colors"
                  />
                  <div className="flex justify-end">
                    <span className="text-[11px] text-text-ghost">
                      {testimonialComment.length}/500
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={async () => {
                      if (testimonialRating < 1) return;
                      await onAction("testimonial", {
                        rating: testimonialRating,
                        ...(testimonialComment.trim() && { comment: testimonialComment.trim() }),
                        ...(testimonialTags.length > 0 && { tags: testimonialTags.join(",") }),
                      });
                      setTestimonialSubmitted(true);
                      setShowTestimonialForm(false);
                    }}
                    disabled={acting || testimonialRating < 1}
                    className="px-5 py-2 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    {acting ? <><Spinner /> Submitting...</> : "Submit Testimonial"}
                  </button>
                  <button
                    onClick={() => setShowTestimonialForm(false)}
                    disabled={acting}
                    className="px-4 py-2 text-text-secondary hover:text-paper text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Cancelled ──
  if (commission.status === "cancelled") {
    return (
      <div className="rounded-xl border border-rose/30 bg-rose/5 p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-rose">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
          <span className="font-display text-sm">Cancelled</span>
        </div>
        {commission.cancelReason && (
          <p className="text-text-secondary text-xs mt-2 max-w-md mx-auto">
            {commission.cancelReason}
          </p>
        )}
      </div>
    );
  }

  // ── Waiting states (show contextual info) ──
  if (commission.status === "requested" && role === "patron") {
    return (
      <div className="rounded-xl border border-border bg-ink/50 p-5 text-center">
        <p className="text-text-secondary text-sm">Waiting for the artisan to send a quote...</p>
        <button
          onClick={() => onAction("cancel")}
          disabled={acting}
          className="mt-3 px-4 py-1.5 rounded-lg text-rose/70 border border-rose/20 hover:text-rose hover:border-rose/40 transition-colors text-xs"
        >
          Cancel Request
        </button>
      </div>
    );
  }

  if (commission.status === "quoted" && role === "artisan") {
    return (
      <div className="rounded-xl border border-border bg-ink/50 p-5 text-center">
        <p className="text-text-secondary text-sm">
          Quote of <span className="text-amber font-medium">{commission.quotedPrice} drops</span> sent. Waiting for the patron to accept...
        </p>
      </div>
    );
  }

  if (commission.status === "delivered" && role === "artisan") {
    return (
      <div className="rounded-xl border border-border bg-ink/50 p-5 text-center">
        <p className="text-text-secondary text-sm">Delivery submitted. Waiting for the patron to review...</p>
      </div>
    );
  }

  return null;
}

// ── Message Thread ──

function MessageThread({ messages, currentUserId }: { messages: CommissionMessage[]; currentUserId: string }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-ghost text-sm">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        // System messages
        if (msg.isSystemMessage) {
          return (
            <motion.div
              key={msg.id}
              className="text-center py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-text-ghost text-xs italic">{msg.content}</span>
              <span className="text-text-ghost/50 text-[10px] ml-2">{formatTime(msg.createdAt)}</span>
            </motion.div>
          );
        }

        const isMine = msg.sender.id === currentUserId;

        return (
          <motion.div
            key={msg.id}
            className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Avatar */}
            {msg.sender.avatarUrl ? (
              <Image
                src={msg.sender.avatarUrl}
                alt={msg.sender.displayName}
                width={32}
                height={32}
                className="rounded-full object-cover shrink-0 w-8 h-8"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-ghost text-xs font-medium shrink-0">
                {msg.sender.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Bubble */}
            <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${isMine ? "text-gold" : "text-text"}`}>
                  {msg.sender.displayName}
                </span>
                <span className="text-text-ghost/50 text-[10px]">{formatDateTime(msg.createdAt)}</span>
              </div>
              <div
                className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.isDelivery
                    ? "border-2 border-gold/40 bg-gold/5 text-text"
                    : isMine
                      ? "bg-surface/80 text-text border border-border"
                      : "bg-ink/80 text-text border border-border"
                }`}
              >
                {msg.isDelivery && (
                  <div className="flex items-center gap-1.5 text-gold text-[10px] uppercase tracking-[0.1em] font-semibold mb-2">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                    Delivery
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.attachmentUrl && (
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-gold text-xs hover:underline"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M10 2H4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" />
                      <path d="M10 2v4h4" />
                    </svg>
                    View Attachment
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// ── Main Page ──

export default function CommissionDetailPage() {
  const { commissionId } = useParams<{ commissionId: string }>();
  const { data: session, status: sessionStatus } = useSession();
  const [detail, setDetail] = useState<CommissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  const userId = session?.user?.id;

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/scriptorium/commissions/${commissionId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Commission not found.");
        throw new Error("Failed to load commission.");
      }
      const data = await res.json();
      setDetail(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load commission.");
    } finally {
      setLoading(false);
    }
  }, [commissionId]);

  useEffect(() => {
    if (commissionId) fetchDetail();
  }, [commissionId, fetchDetail]);

  async function handleAction(action: string, payload?: Record<string, string | number>) {
    setActing(true);
    setActionError("");
    try {
      const body: Record<string, string | number> = { action, ...payload };
      const res = await fetch(`/api/scriptorium/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Action failed.");
      }
      // Refresh data
      await fetchDetail();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActing(false);
    }
  }

  // Unauthenticated
  if (sessionStatus === "unauthenticated") {
    return (
      <div className="px-4 pt-12 pb-8 text-center">
        <h1 className="font-display text-2xl text-paper mb-3">Sign in Required</h1>
        <p className="text-text-secondary text-sm">You must be signed in to view commissions.</p>
      </div>
    );
  }

  // Loading
  if (loading || sessionStatus === "loading") {
    return <DetailSkeleton />;
  }

  // Error
  if (error || !detail) {
    return (
      <div className="px-4 pt-12 pb-20 max-w-4xl mx-auto">
        <Link
          href="/scriptorium"
          className="inline-flex items-center gap-1.5 text-text-secondary text-sm hover:text-text transition-colors mb-8"
        >
          <ArrowLeftIcon />
          Back to Scriptorium
        </Link>
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 rounded-full bg-ink/50 border border-border flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ruby">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3" />
              <circle cx="8" cy="11" r="0.5" fill="currentColor" />
            </svg>
          </div>
          <p className="text-ruby text-sm mb-4">{error || "Commission not found."}</p>
          <button
            onClick={fetchDetail}
            className="px-4 py-2 rounded-lg bg-ink/50 border border-border text-text-secondary text-sm hover:text-text transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  const { commission, messages, offering } = detail;
  const craftColors = CRAFT_COLOR_MAP[offering.craft];
  const statusStyle = STATUS_STYLES[commission.status];
  const role: "patron" | "artisan" = userId === commission.artisanId ? "artisan" : "patron";
  const priceDisplay = commission.agreedPrice ?? commission.quotedPrice;

  return (
    <div className="relative min-h-screen">
      <div className="px-4 pt-8 pb-20 max-w-4xl mx-auto">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/scriptorium"
            className="inline-flex items-center gap-1.5 text-text-secondary text-sm hover:text-text transition-colors mb-6"
          >
            <ArrowLeftIcon />
            Back to Scriptorium
          </Link>
        </motion.div>

        {/* ── Header ── */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {/* Craft badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold border ${craftColors.text} ${craftColors.bg} ${craftColors.border}`}
            >
              {CRAFT_LABELS[offering.craft]}
            </span>

            <h1 className="font-display text-xl md:text-2xl text-paper">{offering.title}</h1>

            {/* Status badge */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold border ${statusStyle.text} ${statusStyle.bg} ${statusStyle.border}`}
            >
              {statusStyle.label}
            </span>
          </div>
          <p className="text-text-ghost text-xs">
            Requested {formatDate(commission.createdAt)}
            {" / "}
            {role === "patron" ? "Artisan" : "Patron"}:{" "}
            <span className="text-text-secondary">
              {role === "patron" ? offering.artisan.displayName : "You"}
            </span>
          </p>
        </motion.div>

        {/* ── Action Bar ── */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <ActionBar
            commission={commission}
            offering={offering}
            role={role}
            onAction={handleAction}
            acting={acting}
          />
          <AnimatePresence>
            {actionError && (
              <motion.p
                className="text-ruby text-sm mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {actionError}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Details Card ── */}
        <motion.div
          className="rounded-xl border border-border bg-ink/50 p-6 mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold mb-3">
            Commission Details
          </h3>

          {/* Brief */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-[0.1em] text-text-ghost block mb-1">Brief</label>
            <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{commission.brief}</p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-ghost">
            {priceDisplay && (
              <span className="inline-flex items-center gap-1.5">
                <DropIcon />
                <span className="text-text-secondary">
                  {commission.agreedPrice ? (
                    <>{commission.agreedPrice} drops (agreed)</>
                  ) : (
                    <>{commission.quotedPrice} drops (quoted)</>
                  )}
                </span>
              </span>
            )}
            {commission.deliveryDeadline && (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon />
                <span className="text-text-secondary">Due {formatDate(commission.deliveryDeadline)}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <RefreshIcon />
              <span className="text-text-secondary">
                {commission.revisionsUsed} / {commission.maxRevisions} revisions used
              </span>
            </span>
          </div>
        </motion.div>

        {/* ── Message Thread ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <h3 className="text-[11px] uppercase tracking-[0.12em] text-text-ghost font-semibold mb-4">
            Messages
          </h3>
          <MessageThread messages={messages} currentUserId={userId ?? ""} />
        </motion.div>
      </div>
    </div>
  );
}
