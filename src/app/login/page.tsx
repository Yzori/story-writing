"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push(callbackUrl);
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
          <h1 className="font-display text-3xl text-paper">Welcome back</h1>
          <p className="text-text-secondary text-sm mt-2 font-body">
            Sign in to continue your stories
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
                autoComplete="current-password"
                placeholder="Enter your password"
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-ghost focus:border-amber/30 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber text-void font-medium px-6 py-2.5 rounded-lg hover:bg-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-body"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-text-secondary text-sm mt-6 font-body">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-amber hover:text-amber/80 transition-colors"
          >
            Join Inkwell
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
