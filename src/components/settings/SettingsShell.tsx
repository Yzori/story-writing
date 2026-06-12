"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, ChevronRight, CreditCard, Droplet, Eye, Settings, ShieldCheck, User } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/settings",
    label: "Preferences",
    description: "Reading, comfort, and email cadence",
    icon: Settings,
    match: (pathname: string) => pathname === "/settings",
  },
  {
    href: "/settings/billing",
    label: "Billing",
    description: "Plan, renewal, and AI usage",
    icon: CreditCard,
    match: (pathname: string) => pathname.startsWith("/settings/billing"),
  },
  {
    href: "/settings/ink-drops",
    label: "Inkwell",
    description: "Your ink, refills, and purchase history",
    icon: Droplet,
    match: (pathname: string) => pathname.startsWith("/settings/ink-drops"),
  },
];

const TRUST_POINTS = [
  { label: "Private controls", icon: Eye },
  { label: "Secure billing", icon: ShieldCheck },
  { label: "Account synced", icon: Bell },
];

export default function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/settings";
  const active = NAV_ITEMS.find((item) => item.match(pathname)) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-void">
      <main className="pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-border bg-surface/72 p-5 shadow-[var(--t-shadow-card)] sm:p-6"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Account controls</p>
                <h1 className="mt-2 font-display text-3xl leading-tight text-paper sm:text-4xl">
                  Settings
                </h1>
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-text-secondary">
                  Manage how Quiloria reads, notifies, charges, and remembers your preferences.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:w-[430px]">
                {TRUST_POINTS.map((point) => {
                  const Icon = point.icon;
                  return (
                    <div key={point.label} className="rounded-xl border border-border bg-ink/45 px-3 py-3">
                      <Icon size={14} className="mb-2 text-gold" />
                      <p className="text-[11px] font-medium text-text-secondary">{point.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.header>

          <div className="mb-5 overflow-x-auto pb-1 lg:hidden">
            <div className="flex min-w-max gap-2">
              {NAV_ITEMS.map((item) => {
                const selected = item.match(pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors ${
                      selected
                        ? "border-gold/30 bg-gold/[0.08] text-gold"
                        : "border-border bg-ink/35 text-text-secondary hover:text-paper"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border border-border bg-surface/64 p-2">
                {NAV_ITEMS.map((item) => {
                  const selected = item.match(pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                        selected
                          ? "border-gold/25 bg-gold/[0.07] text-gold"
                          : "border-transparent text-text-secondary hover:bg-ink/45 hover:text-paper"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        selected ? "border-gold/25 bg-gold/[0.08]" : "border-border bg-ink/40"
                      }`}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-text-ghost">{item.description}</span>
                      </span>
                      <ChevronRight size={14} className={selected ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-60"} />
                    </Link>
                  );
                })}

                <div className="mt-2 rounded-xl border border-border bg-ink/35 p-3">
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <User size={13} className="text-gold" />
                    Profile details live on your public desk.
                  </div>
                  <Link href="/dashboard" className="mt-2 inline-flex text-[11px] font-medium text-gold hover:text-gold-light">
                    Back to dashboard
                  </Link>
                </div>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-ghost">
                <span>{active.label}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              {children}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
