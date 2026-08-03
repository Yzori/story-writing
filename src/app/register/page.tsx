"use client";

/*
 * Register — "VII · Your name"
 *
 * The homepage's six-act film ends with "VI · Your page"; signing up is
 * the next act. The room stays dark and candle-lit; the form is a
 * luminous manuscript page floating in it. Fields are ink lines on
 * paper, the submit is a signature, and when the page is ready an ink
 * drop falls beside the signature line.
 *
 * All registration logic (draft import, intent routing, validation,
 * credentials sign-in, Google OAuth) is unchanged from the previous
 * version — this is a re-staging, not a rewrite of behavior.
 */

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { QuillRingMark, QuiloriaWordmark } from "@/components/shared/BrandLogo";
import { markArrival } from "@/lib/arrival";
import { importAnonPlace } from "@/lib/anon-reader";
import { readDemoDraft, clearDemoDraft, importDemoDraft } from "@/lib/demo-draft";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

type RegisterField = "displayName" | "email" | "password" | "confirmPassword";
type RegisterTouched = Record<RegisterField, boolean>;
type RegisterErrors = Partial<Record<RegisterField, string>>;

function getRegisterErrors(
  displayName: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegisterErrors {
  const errors: RegisterErrors = {};
  const trimmedDisplayName = displayName.trim();
  const trimmedEmail = email.trim();

  if (!trimmedDisplayName) {
    errors.displayName = "Every story needs a name on it.";
  } else if (trimmedDisplayName.length > 100) {
    errors.displayName = "Pen names run shorter than 100 characters.";
  }

  if (!trimmedEmail) {
    errors.email = "We need somewhere to send word.";
  } else if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = "That address doesn't look quite right.";
  }

  if (!password) {
    errors.password = "Choose a secret word.";
  } else if (password.length < 8) {
    errors.password = "Secret words need at least 8 characters.";
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = "Secret words run shorter than 128 characters.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Write your secret word once more.";
  } else if (password && password !== confirmPassword) {
    errors.confirmPassword = "The two don't match yet.";
  }

  return errors;
}

// Underlined ink-on-paper field. Dark "ink" text comes from the on-gold
// token (near-black in both themes) so the page reads as paper anywhere.
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

const MOTE_SEED = seededRandom(53);
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

// Marginalia label above each ink line.
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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const intent = searchParams?.get("intent"); // "write" | "read" | null

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<RegisterTouched>({
    displayName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const validationErrors = getRegisterErrors(displayName, email, password, confirmPassword);
  const shouldShowError = (field: RegisterField) => (touched[field] || submitted) && !!validationErrors[field];
  const isValid = Object.keys(validationErrors).length === 0;

  // Detect a demo draft so we can show a friendly margin note and tailor
  // the redirect.
  useEffect(() => {
    setHasDraft(!!readDemoDraft());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitted(true);

    if (!isValid) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Registration failed. Please try again."); setLoading(false); return; }

      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (result?.error) {
        router.push("/login");
        return;
      }

      // however onboarding routes them, their first studio entrance gets the arrival
      markArrival("new");

      // If the user came from the demo editor, import their draft into a real
      // story and drop them straight into the editor — they're a writer first,
      // skip the reader-preference flow entirely.
      const draft = readDemoDraft();
      if (draft) {
        const storyId = await importDemoDraft(draft);
        if (storyId) {
          clearDemoDraft();
          router.push(`/write/${storyId}`);
          router.refresh();
          return;
        }
      }

      // Reader continuity — the mirror of the draft import. An anonymous
      // reading place becomes real reading progress, then preferences
      // (prefilled from the journey's taste) hand them back to their page.
      const anonPlace = await importAnonPlace();
      if (anonPlace) {
        const back = `/story/${anonPlace.slug}/read/${anonPlace.chapterId}`;
        router.push(`/welcome/preferences?next=${encodeURIComponent(back)}`);
        router.refresh();
        return;
      }

      // Intent-aware routing. We capture *intent before preferences*: a writer
      // should never be asked three reading-taste questions before we even
      // learn they came to write.
      //   • write  → straight into the create flow
      //   • read   → reading-preference capture, then the library
      //   • (none) → the Write/Read/Collaborate door picks the branch
      if (intent === "write") {
        router.push("/create");
        router.refresh();
        return;
      }
      if (intent === "read") {
        router.push("/welcome/preferences?next=/read");
        router.refresh();
        return;
      }

      router.push("/welcome");
      router.refresh();
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
        {/* candle glow, low and warm, where the page sits */}
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
        {/* ── The invitation ── */}
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
            VII · Your name
          </p>
          <h1 className="font-display text-paper font-medium text-4xl md:text-6xl leading-[1.05]">
            {hasDraft ? (
              <>Bring your <span className="text-gold-light italic">draft</span> in.</>
            ) : (
              <>Write <span className="text-gold-light italic">yourself</span> in.</>
            )}
          </h1>
          <p className="mt-6 text-text-secondary text-[15px] leading-relaxed max-w-md mx-auto lg:mx-0">
            {hasDraft
              ? "Your demo pages come with you — they become chapter one the moment you sign."
              : "Every story on this shore began the same way: a name, written onto a blank page. Tonight it's yours."}
          </p>

          <div className="mt-8 space-y-2.5 text-[12px] text-text-ghost">
            <p className="flex items-center gap-2.5 justify-center lg:justify-start">
              <span className="text-gold/70">✦</span> Always free to write and read — no card, no trial clock
            </p>
            <p className="flex items-center gap-2.5 justify-center lg:justify-start">
              <span className="text-gold/70">✦</span> Your stories stay yours, every word
            </p>
          </div>

          <p className="mt-10 text-text-secondary text-sm hidden lg:block">
            Already signed in once?{" "}
            <Link href="/login" className="text-gold hover:text-gold-light transition-colors font-medium">
              return to your page →
            </Link>
          </p>
        </motion.div>

        {/* ── The page ── */}
        <motion.div
          className="relative mx-auto w-full max-w-md"
          initial={{ opacity: 0, y: 28, rotate: -2.5 }}
          animate={{ opacity: 1, y: 0, rotate: -0.75 }}
          transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.15 }}
        >
          {/* glow bleeding out from the page into the room */}
          <div
            className="absolute -inset-10 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(243,235,219,0.07) 0%, transparent 70%)" }}
            aria-hidden
          />

          <div className="relative bg-paper rounded-[6px] shadow-[0_40px_90px_rgba(0,0,0,0.65)] px-7 py-9 md:px-10 md:py-11 overflow-hidden">
            {/* candle light falling across the paper + faint fiber grain */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 90% 60% at 20% 0%, rgba(255,248,230,0.6) 0%, transparent 55%), linear-gradient(160deg, transparent 60%, rgba(74,62,44,0.08) 100%)" }}
              aria-hidden
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E')] bg-repeat bg-[length:128px_128px]"
              aria-hidden
            />

            <div className="relative">
              {/* manuscript heading */}
              <div className="text-center mb-7">
                <p className="text-[9px] uppercase tracking-[0.34em] text-gold-dark/80">
                  Quiloria · Chapter one
                </p>
                <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-on-gold/30 to-transparent" />
                <p className="mt-3 font-reading italic text-[13px] text-on-gold/55">
                  in which a new name joins the shore
                </p>
              </div>

              {/* demo draft margin note */}
              {hasDraft && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 border-l-2 border-gold-dark/50 pl-3 py-1"
                >
                  <p className="font-reading italic text-[12.5px] text-on-gold/75 leading-relaxed">
                    Your draft is tucked under your arm — it becomes your
                    first chapter the moment you sign.
                  </p>
                </motion.div>
              )}

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
                  <Marginalia htmlFor="displayName">I&apos;ll write as</Marginalia>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setTouched((current) => ({ ...current, displayName: true }));
                      setError("");
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, displayName: true }))}
                    required
                    maxLength={100}
                    placeholder="your pen name"
                    aria-invalid={shouldShowError("displayName")}
                    aria-describedby={shouldShowError("displayName") ? "display-name-error" : undefined}
                    className={inkFieldClasses(shouldShowError("displayName"))}
                  />
                  {shouldShowError("displayName") && (
                    <p id="display-name-error" className="mt-1.5 text-[11px] font-reading italic text-rose">
                      {validationErrors.displayName}
                    </p>
                  )}
                </div>

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
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
                      maxLength={MAX_PASSWORD_LENGTH + 1}
                      autoComplete="new-password"
                      placeholder="8+ characters"
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

                  <div>
                    <Marginalia htmlFor="confirmPassword">Once more, to be sure</Marginalia>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setTouched((current) => ({ ...current, confirmPassword: true }));
                        setError("");
                      }}
                      onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                      required
                      maxLength={MAX_PASSWORD_LENGTH + 1}
                      autoComplete="new-password"
                      placeholder="repeat it"
                      aria-invalid={shouldShowError("confirmPassword")}
                      aria-describedby={shouldShowError("confirmPassword") ? "confirm-password-error" : undefined}
                      className={inkFieldClasses(shouldShowError("confirmPassword"))}
                    />
                    {shouldShowError("confirmPassword") && (
                      <p id="confirm-password-error" className="mt-1.5 text-[11px] font-reading italic text-rose">
                        {validationErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* signature line — the ink drop arrives when the page is ready */}
                <div className="relative pt-2 text-center" aria-hidden>
                  <div className="h-px bg-on-gold/20 w-36 mx-auto" />
                  <AnimatePresence>
                    {isValid && (
                      <motion.svg
                        viewBox="0 0 10 14"
                        className="absolute left-1/2 -translate-x-1/2 -top-2 w-[9px]"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -26 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: "easeIn" }}
                      >
                        <path
                          d="M5 0 C5 0 0.5 6.2 0.5 9.2 a4.5 4.5 0 0 0 9 0 C9.5 6.2 5 0 5 0 Z"
                          fill="var(--t-gold-dark)"
                        />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-on-gold/40">
                    sign below
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isValid}
                  className="w-full bg-gold text-on-gold font-semibold px-6 py-3 rounded-full hover:bg-gold-dark transition-all duration-300 disabled:opacity-45 disabled:cursor-not-allowed text-sm shadow-[0_6px_24px_rgba(178,132,50,0.35)]"
                >
                  {loading
                    ? "Inking your name…"
                    : hasDraft
                      ? "Sign — and save my draft"
                      : "Sign my name in"}
                </button>

                <p className="text-center text-[11px] leading-relaxed text-on-gold/45">
                  By signing in your name you agree to the{" "}
                  <Link href="/terms" className="underline underline-offset-2 hover:text-on-gold/70 transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-on-gold/70 transition-colors">
                    Privacy Policy
                  </Link>
                  .
                </p>
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
                  markArrival("new");
                  signIn("google", { callbackUrl: intent === "write" ? "/create" : "/welcome" });
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
            Already signed in once?{" "}
            <Link href="/login" className="text-gold hover:text-gold-light transition-colors font-medium">
              return to your page →
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void" />}>
      <RegisterForm />
    </Suspense>
  );
}
