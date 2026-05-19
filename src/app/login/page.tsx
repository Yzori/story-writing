"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginField = "email" | "password";
type LoginTouched = Record<LoginField, boolean>;
type LoginErrors = Partial<Record<LoginField, string>>;

function getLoginErrors(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
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
        setError("Invalid email or password. Please try again.");
      } else {
        window.location.assign(callbackUrl);
      }
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber/[0.03] blur-[120px]" />
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
          <h1 className="font-display text-3xl text-paper font-semibold">Welcome back</h1>
          <p className="text-text-secondary text-sm mt-2">
            Sign in to continue your stories
          </p>
        </div>

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
                autoComplete="current-password"
                placeholder="Enter your password"
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

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-[12px] text-text-ghost hover:text-amber transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full bg-amber text-void font-semibold px-6 py-2.5 rounded-full hover:bg-amber-light transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:shadow-md hover:shadow-amber/15"
            >
              {loading ? "Signing in..." : "Sign in"}
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
            onClick={() => signIn("google", { callbackUrl })}
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
        </div>

        {/* Footer */}
        <p className="text-center text-text-secondary text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-amber hover:text-amber-light transition-colors font-medium">
            Join Quiloria
          </Link>
        </p>
      </motion.div>
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
