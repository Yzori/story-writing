"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!displayName.trim()) return "Display name is required.";
    if (displayName.trim().length > 100) return "Display name must be under 100 characters.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed. Please try again."); setLoading(false); return; }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) { router.push("/login"); } else { router.push("/welcome"); router.refresh(); }
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
          <h1 className="font-display text-3xl text-paper font-semibold">Begin your journey</h1>
          <p className="text-text-secondary text-sm mt-2">Create an account and start writing</p>
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
              <label htmlFor="displayName" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Display Name <span className="text-rose">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={100}
                placeholder="Your pen name"
                className="w-full bg-elevated/80 border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-elevated/80 border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full bg-elevated/80 border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
                className="w-full bg-elevated/80 border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/25 focus:shadow-sm focus:shadow-amber/5 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
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

          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/welcome" })}
            className="w-full flex items-center justify-center gap-2.5 bg-elevated/80 border border-border text-text-secondary font-medium px-6 py-2.5 rounded-full hover:text-paper hover:border-border-active transition-all duration-200 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continue with GitHub
          </button>
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
