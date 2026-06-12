"use client";

/*
 * Login — "The story so far"
 *
 * The companion to /register's "VII · Your name". Same dark candle-lit
 * room, same manuscript page — but this one is already written in and
 * a gold bookmark ribbon holds the reader's place. Signing in is
 * returning to your page, not filling a form.
 *
 * All auth logic (credentials sign-in, safe callbackUrl handling,
 * Google OAuth) is unchanged — this is a re-staging only.
 */

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { QuillRingMark, QuiloriaWordmark } from "@/components/shared/BrandLogo";
import { markArrival } from "@/lib/arrival";
import { importAnonPlace } from "@/lib/anon-reader";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginField = "email" | "password";
type LoginTouched = Record<LoginField, boolean>;
type LoginErrors = Partial<Record<LoginField, string>>;

function getLoginErrors(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = "We need the address you signed with.";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = "That address doesn't look quite right.";
  }

  if (!password) {
    errors.password = "Your secret word opens the page.";
  }

  return errors;
}

// Underlined ink-on-paper field — same treatment as /register.
function inkFieldClasses(hasError: boolean) {
  return `w-full bg-transparent border-0 border-b rounded-none px-1 py-2 font-reading italic text-[16px] text-on-gold outline-none placeholder:text-on-gold/30 placeholder:not-italic caret-gold-dark transition-colors ${
    hasError
      ? "border-b-rose/70 focus:border-b-rose"
      : "border-b-on-gold/25 focus:border-b-gold-dark"
  }`;
}

// ── Hydration-safe drifting motes for the dark room ─────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const MOTE_SEED = seededRandom(71);
const MOTES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: MOTE_SEED() * 100,
  startY: 75 + MOTE_SEED() * 35,
  size: 1.5 + MOTE_SEED() * 2,
  duration: 11 + MOTE_SEED() * 12,
  delay: MOTE_SEED() * 10,
  drift: (MOTE_SEED() - 0.5) * 26,
  opacity: 0.1 + MOTE_SEED() * 0.3,
}));

function Motes() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {MOTES.map((m) => (
        <motion.div
          key={m.id}
          className="absolute rounded-full bg-gold-light"
          style={{ width: m.size, height: m.size, left: `${m.x}%` }}
          initial={{ y: `${m.startY}vh`, opacity: 0 }}
          animate={{
            y: `${m.startY - 100}vh`,
            x: [0, m.drift, 0],
            opacity: [0, m.opacity, m.opacity * 0.5, m.opacity, 0],
          }}
          transition={{ duration: m.duration, repeat: Infinity, delay: m.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function Marginalia({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[9px] uppercase tracking-[0.22em] text-on-gold/50 mb-1"
    >
      {children}
    </label>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = rawCallback.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<LoginTouched>({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const validationErrors = getLoginErrors(email, password);
  const shouldShowError = (field: LoginField) => (touched[field] || submitted) && !!validationErrors[field];
  const isValid = Object.keys(validationErrors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitted(true);

    if (!isValid) return;

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("That email and secret word don't match our ledger. Try again?");
      } else {
        markArrival("return");
        // a place kept while signed out becomes real progress (keepalive
        // survives the navigation; cleared only once the PUT succeeds)
        void importAnonPlace();
        window.location.assign(callbackUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-void relative overflow-hidden font-body">
      {/* ── The dark room ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[760px] h-[760px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(224,169,62,0.10) 0%, transparent 65%)" }}
        />
        <div
          className="absolute left-[-15%] top-[-20%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(172,156,222,0.05) 0%, transparent 65%)" }}
        />
      </div>
      <Motes />

      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16 min-h-screen grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-20 items-center">
        {/* ── The welcome back ── */}
        <motion.div
          className="text-center lg:text-left"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Link
            href="/"
            aria-label="Quiloria — home"
            className="inline-flex items-center gap-2.5 mb-10 text-paper/90 hover:text-paper transition-colors"
          >
            <QuillRingMark className="w-7 h-7" />
            <QuiloriaWordmark className="font-display text-base font-bold tracking-wide" />
          </Link>

          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.32em] text-gold/80 mb-5">
            The story so far
          </p>
          <h1 className="font-display text-paper font-medium text-4xl md:text-6xl leading-[1.05]">
            The ink kept <span className="text-gold-light italic">your place</span>.
          </h1>
          <p className="mt-6 text-text-secondary text-[15px] leading-relaxed max-w-md mx-auto lg:mx-0">
            Your stories are exactly where you left them — drafts still warm,
            readers still waiting. Sign back in and pick up the thread.
          </p>

          <p className="mt-10 text-text-secondary text-sm hidden lg:block">
            First time on this shore?{" "}
            <Link href="/register" className="text-gold hover:text-gold-light transition-colors font-medium">
              write yourself in →
            </Link>
          </p>
        </motion.div>

        {/* ── The bookmarked page ── */}
        <motion.div
          className="relative mx-auto w-full max-w-md"
          initial={{ opacity: 0, y: 28, rotate: 2.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0.75 }}
          transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.15 }}
        >
          {/* glow bleeding out from the page into the room */}
          <div
            className="absolute -inset-10 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(243,235,219,0.07) 0%, transparent 70%)" }}
            aria-hidden
          />

          <div className="relative bg-paper rounded-[6px] shadow-[0_40px_90px_rgba(0,0,0,0.65)] px-7 py-9 md:px-10 md:py-11 overflow-visible">
            {/* the bookmark ribbon holding your place */}
            <motion.div
              className="absolute -top-1 right-9 w-7 h-24 z-10 shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
              style={{
                background: "linear-gradient(to bottom, var(--t-gold-dark), var(--t-gold))",
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 86%, 0 100%)",
              }}
              initial={{ scaleY: 0, originY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              aria-hidden
            />

            {/* candle light falling across the paper + faint fiber grain */}
            <div
              className="absolute inset-0 rounded-[6px] pointer-events-none"
              style={{ background: "radial-gradient(ellipse 90% 60% at 20% 0%, rgba(255,248,230,0.6) 0%, transparent 55%), linear-gradient(160deg, transparent 60%, rgba(74,62,44,0.08) 100%)" }}
              aria-hidden
            />
            <div
              className="absolute inset-0 rounded-[6px] pointer-events-none opacity-[0.05] mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')] bg-repeat bg-[length:128px_128px]"
              aria-hidden
            />

            <div className="relative">
              {/* manuscript heading */}
              <div className="text-center mb-7">
                <p className="text-[9px] uppercase tracking-[0.34em] text-gold-dark/80">
                  Quiloria · Where you left off
                </p>
                <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-on-gold/30 to-transparent" />
                <p className="mt-3 font-reading italic text-[13px] text-on-gold/55">
                  in which a familiar name returns
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-l-2 border-rose pl-3 py-1 text-[12.5px] font-reading italic text-rose"
                    role="alert"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <Marginalia htmlFor="email">Letters reach me at</Marginalia>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setTouched((current) => ({ ...current, email: true }));
                      setError("");
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={shouldShowError("email")}
                    aria-describedby={shouldShowError("email") ? "email-error" : undefined}
                    className={inkFieldClasses(shouldShowError("email"))}
                  />
                  {shouldShowError("email") && (
                    <p id="email-error" className="mt-1.5 text-[11px] font-reading italic text-rose">
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <Marginalia htmlFor="password">My secret word</Marginalia>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setTouched((current) => ({ ...current, password: true }));
                      setError("");
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                    required
                    autoComplete="current-password"
                    placeholder="your password"
                    aria-invalid={shouldShowError("password")}
                    aria-describedby={shouldShowError("password") ? "password-error" : undefined}
                    className={inkFieldClasses(shouldShowError("password"))}
                  />
                  {shouldShowError("password") && (
                    <p id="password-error" className="mt-1.5 text-[11px] font-reading italic text-rose">
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-reading italic text-on-gold/55 hover:text-gold-dark transition-colors"
                  >
                    lost your secret word?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValid}
                  className="w-full bg-gold text-on-gold font-semibold px-6 py-3 rounded-full hover:bg-gold-dark transition-all duration-300 disabled:opacity-45 disabled:cursor-not-allowed text-sm shadow-[0_6px_24px_rgba(178,132,50,0.35)]"
                >
                  {loading ? "Finding your place…" : "Return to my page"}
                </button>
              </form>

              {/* or arrive another way */}
              <div className="flex items-center gap-3 my-5" aria-hidden>
                <div className="flex-1 h-px bg-on-gold/15" />
                <span className="text-[10px] text-on-gold/45 uppercase tracking-[0.2em]">or</span>
                <div className="flex-1 h-px bg-on-gold/15" />
              </div>

              <button
                type="button"
                onClick={() => {
                  markArrival("return");
                  signIn("google", { callbackUrl });
                }}
                className="w-full flex items-center justify-center gap-2.5 bg-transparent border border-on-gold/25 text-on-gold/80 font-medium px-6 py-2.5 rounded-full hover:border-on-gold/50 hover:text-on-gold transition-all duration-200 text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M14.5 8.15c0-.52-.05-1.01-.14-1.49H8v2.69h3.64a3.1 3.1 0 0 1-1.35 2.04v1.77h2.18c1.28-1.19 2.03-2.94 2.03-5.01Z" fill="currentColor" />
                  <path d="M8 14.8c1.83 0 3.37-.61 4.49-1.64l-2.18-1.77c-.61.41-1.39.65-2.31.65-1.77 0-3.26-1.2-3.8-2.8H1.95v1.82A6.78 6.78 0 0 0 8 14.8Z" fill="currentColor" opacity="0.8" />
                  <path d="M4.2 9.24a4.04 4.04 0 0 1 0-2.48V4.94H1.95a6.81 6.81 0 0 0 0 6.12L4.2 9.24Z" fill="currentColor" opacity="0.65" />
                  <path d="M8 3.96c.99 0 1.88.34 2.58 1.01l1.94-1.95A6.52 6.52 0 0 0 8 1.2a6.78 6.78 0 0 0-6.05 3.74L4.2 6.76c.54-1.6 2.03-2.8 3.8-2.8Z" fill="currentColor" opacity="0.9" />
                </svg>
                arrive with Google
              </button>
            </div>
          </div>

          {/* under the page, for small screens */}
          <p className="text-center text-text-secondary text-sm mt-6 lg:hidden">
            First time on this shore?{" "}
            <Link href="/register" className="text-gold hover:text-gold-light transition-colors font-medium">
              write yourself in →
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void" />}>
      <LoginForm />
    </Suspense>
  );
}
