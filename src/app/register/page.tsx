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
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Auto sign in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Account created but auto-login failed, redirect to login
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.2em] text-amber font-body mb-4 inline-block"
          >
            Inkwell
          </Link>
          <h1 className="font-display text-3xl text-paper">
            Begin your journey
          </h1>
          <p className="text-text-secondary text-sm mt-2 font-body">
            Create an account and start writing
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-rose/10 border border-rose/20 rounded-lg px-3 py-2.5 text-[13px] text-rose"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label
                htmlFor="displayName"
                className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your pen name"
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5"
              >
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
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5"
              >
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
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-[10px] uppercase tracking-[0.12em] text-text-ghost mb-1.5"
              >
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
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber text-void font-medium px-6 py-2.5 rounded-lg hover:bg-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-text-secondary text-sm mt-6 font-body">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-amber hover:text-amber/80 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
