"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

const DEMO_DRAFT_KEY = "quiloria-demo-draft-v1";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

type RegisterField = "displayName" | "email" | "password" | "confirmPassword";
type RegisterTouched = Record<RegisterField, boolean>;
type RegisterErrors = Partial<Record<RegisterField, string>>;

interface DemoDraft {
  title?: string;
  content?: string;
  updatedAt?: number;
}

function readDemoDraft(): DemoDraft | null {
  try {
    const raw = localStorage.getItem(DEMO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoDraft;
    if (!parsed?.content) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearDemoDraft() {
  try { localStorage.removeItem(DEMO_DRAFT_KEY); } catch {}
}

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
    errors.displayName = "Display name is required.";
  } else if (trimmedDisplayName.length > 100) {
    errors.displayName = "Display name must be under 100 characters.";
  }

  if (!trimmedEmail) {
    errors.email = "Email is required.";
  } else if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = "Password must be under 128 characters.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (password && password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

function fieldClasses(hasError: boolean) {
  return `w-full bg-elevated/80 border rounded-xl px-3.5 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-void transition-all ${
    hasError
      ? "border-rose/40 focus:border-rose/50 focus-visible:ring-rose/30"
      : "border-border focus:border-amber/40 focus-visible:ring-amber/40"
  }`;
}

/**
 * Imports a localStorage demo draft into a real story for a freshly registered
 * user. Best-effort: on any failure we fall through to the regular welcome
 * flow rather than leaving the user stuck.
 */
async function importDemoDraft(draft: DemoDraft): Promise<string | null> {
  try {
    const storyRes = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title?.trim() || "Untitled story",
        format: "novel",
        writingMode: "solo",
      }),
    });
    const storyJson = await storyRes.json();
    const storyId: string | undefined = storyJson.data?.id;
    if (!storyRes.ok || !storyId) return null;

    // Replace the auto-created first chapter's content with the draft.
    const chaptersRes = await fetch(`/api/stories/${storyId}/chapters?withContent=true`, { cache: "no-store" });
    const chaptersJson = await chaptersRes.json();
    const firstChapter = chaptersJson?.data?.[0];
    if (firstChapter?.id) {
      await fetch(`/api/stories/${storyId}/chapters/${firstChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.content }),
      });
    } else {
      // No auto chapter — create one with the draft content.
      await fetch(`/api/stories/${storyId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Chapter 1", content: draft.content }),
      });
    }

    return storyId;
  } catch {
    return null;
  }
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Detect a demo draft so we can show a friendly banner and tailor the redirect.
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
      if (!res.ok) { setError(data.error || "Registration failed. Please try again."); setLoading(false); return; }

      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (result?.error) {
        router.push("/login");
        return;
      }

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
    <div className="min-h-screen bg-void flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambiance */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber/[0.03] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm relative"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <svg className="w-5 h-5 text-amber" viewBox="0 0 32 32" fill="none">
              <path d="M26 3C22 7 18 11 14 16C10 21 8 25 7 28L5 29L4 27C5 24 8 18 12 13C16 8 21 5 26 3Z" fill="currentColor" opacity="0.85" />
              <path d="M7 28L5 29L4 27L7 28Z" fill="currentColor" />
              <circle cx="4.5" cy="28" r="1" fill="currentColor" opacity="0.6" />
            </svg>
            <span className="font-display text-sm font-bold text-paper tracking-wide">Quiloria</span>
          </Link>
          <h1 className="font-display text-3xl text-paper font-semibold">
            {hasDraft ? "Save your draft" : "Begin your journey"}
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            {hasDraft
              ? "Create an account and we'll bring your draft with you."
              : "Always free to write and read · No credit card required"}
          </p>
        </div>

        {/* Demo draft banner */}
        {hasDraft && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-amber/20 bg-amber/[0.05] px-4 py-3 flex items-start gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber/80 shrink-0 mt-0.5">
              <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
              <path d="M5 5h6M5 8h4M5 11h3" />
            </svg>
            <div className="min-w-0">
              <p className="text-paper text-[12px] font-medium">Your draft is ready to save</p>
              <p className="text-text-ghost text-[11px] mt-0.5 leading-relaxed">
                We&apos;ll import your demo writing as your first chapter.
              </p>
            </div>
          </motion.div>
        )}

        {/* Form Card */}
        <div className="card-page firelight p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-rose/10 border border-rose/20 rounded-xl px-3 py-2.5 text-[13px] text-rose"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Display Name <span className="text-rose">*</span>
              </label>
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
                placeholder="Your pen name"
                aria-invalid={shouldShowError("displayName")}
                aria-describedby={shouldShowError("displayName") ? "display-name-error" : undefined}
                className={fieldClasses(shouldShowError("displayName"))}
              />
              {shouldShowError("displayName") && (
                <p id="display-name-error" className="mt-1.5 text-[11px] leading-relaxed text-rose">
                  {validationErrors.displayName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Email
              </label>
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
                className={fieldClasses(shouldShowError("email"))}
              />
              {shouldShowError("email") && (
                <p id="email-error" className="mt-1.5 text-[11px] leading-relaxed text-rose">
                  {validationErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Password
              </label>
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
                placeholder="At least 8 characters"
                aria-invalid={shouldShowError("password")}
                aria-describedby={shouldShowError("password") ? "password-error" : undefined}
                className={fieldClasses(shouldShowError("password"))}
              />
              {shouldShowError("password") && (
                <p id="password-error" className="mt-1.5 text-[11px] leading-relaxed text-rose">
                  {validationErrors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Confirm Password
              </label>
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
                placeholder="Repeat your password"
                aria-invalid={shouldShowError("confirmPassword")}
                aria-describedby={shouldShowError("confirmPassword") ? "confirm-password-error" : undefined}
                className={fieldClasses(shouldShowError("confirmPassword"))}
              />
              {shouldShowError("confirmPassword") && (
                <p id="confirm-password-error" className="mt-1.5 text-[11px] leading-relaxed text-rose">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full bg-amber text-void font-semibold px-6 py-2.5 rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:shadow-md hover:shadow-amber/15"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-ghost uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: intent === "write" ? "/create" : "/welcome" })}
            className="w-full flex items-center justify-center gap-2.5 bg-elevated/80 border border-border text-text-secondary font-medium px-6 py-2.5 rounded-full hover:text-paper hover:border-border-active transition-all duration-200 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M14.5 8.15c0-.52-.05-1.01-.14-1.49H8v2.69h3.64a3.1 3.1 0 0 1-1.35 2.04v1.77h2.18c1.28-1.19 2.03-2.94 2.03-5.01Z" fill="currentColor" />
              <path d="M8 14.8c1.83 0 3.37-.61 4.49-1.64l-2.18-1.77c-.61.41-1.39.65-2.31.65-1.77 0-3.26-1.2-3.8-2.8H1.95v1.82A6.78 6.78 0 0 0 8 14.8Z" fill="currentColor" opacity="0.8" />
              <path d="M4.2 9.24a4.04 4.04 0 0 1 0-2.48V4.94H1.95a6.81 6.81 0 0 0 0 6.12L4.2 9.24Z" fill="currentColor" opacity="0.65" />
              <path d="M8 3.96c.99 0 1.88.34 2.58 1.01l1.94-1.95A6.52 6.52 0 0 0 8 1.2a6.78 6.78 0 0 0-6.05 3.74L4.2 6.76c.54-1.6 2.03-2.8 3.8-2.8Z" fill="currentColor" opacity="0.9" />
            </svg>
            Continue with Google
          </button>

          {/* Reassurance footer */}
          <div className="mt-5 pt-4 border-t border-border-subtle flex items-start gap-2 text-[11px] text-text-ghost leading-relaxed">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage/60 shrink-0 mt-0.5">
              <path d="M3 8.5l3 3 7-7" />
            </svg>
            <span>
              Your stories stay yours. Free tier is forever — no trial expiry, no payment up front.
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-text-secondary text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-amber hover:text-amber-light transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
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
