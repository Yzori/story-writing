"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import InkDock from "@/components/shared/InkDock";
import QuillPalette, {
  SIGNED_IN_COMMANDS,
  SIGNED_OUT_COMMANDS,
} from "@/components/shared/QuillPalette";

// Surfaces where the global dock is fully suppressed (auth flows,
// onboarding, full-screen demos, and the anon film homepage — which
// carries its own chrome).
const HIDE_NAVBAR_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/forgot-password(\/|$)/,
  /^\/reset-password(\/|$)/,
  /^\/welcome(\/|$)/,
  /^\/demo\//,
  /^\/landing-experience(\/|$)/,
  /^\/mockup-homepage-v4(\/|$)/,
  /^\/mockup\/editor-desk(\/|$)/,
];

// Surfaces that need the full mobile viewport — the dock still shows on
// desktop, but the mobile (bottom) dock is suppressed so it doesn't
// clash with editor keyboard chrome or floating writer prompts.
const HIDE_MOBILE_DOCK: RegExp[] = [/^\/write\//];

export default function Navbar() {
  const pathname = usePathname();
  if (pathname && HIDE_NAVBAR_PATTERNS.some((re) => re.test(pathname))) {
    return null;
  }
  const mobileHidden = Boolean(
    pathname && HIDE_MOBILE_DOCK.some((re) => re.test(pathname))
  );
  // The editor owns ⌘K for its own command palette (the Grimoire); the
  // Quill stays reachable there via the dock's search button.
  const paletteShortcutSuppressed = Boolean(pathname && /^\/write\//.test(pathname));
  return (
    <NavbarInner
      mobileHidden={mobileHidden}
      paletteShortcutSuppressed={paletteShortcutSuppressed}
    />
  );
}

type StreakState = {
  days: number;
  status: "active" | "at-risk" | "broken" | "none";
};

function NavbarInner({
  mobileHidden,
  paletteShortcutSuppressed,
}: {
  mobileHidden: boolean;
  paletteShortcutSuppressed: boolean;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [inkDropBalance, setInkDropBalance] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const isLoading = sessionStatus === "loading";
  const signedIn = Boolean(session?.user?.id);

  // Tag <body> when the mobile (bottom) dock is mounted so the
  // responsive padding-bottom rule in globals.css keeps page content
  // above it.
  useEffect(() => {
    if (mobileHidden) return;
    document.body.classList.add("with-bottom-tab");
    return () => document.body.classList.remove("with-bottom-tab");
  }, [mobileHidden]);

  // ⌘K / Ctrl-K summons the Quill. Shift-modified chords (⌘⇧K is the
  // Editor's Desk) are someone else's binding.
  useEffect(() => {
    if (paletteShortcutSuppressed) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteShortcutSuppressed]);

  // Fetch unread notification count
  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController();
    async function fetchUnread() {
      try {
        // countOnly: the badge needs one number, not 30 full rows a minute.
        const res = await fetch("/api/notifications?countOnly=1", { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(json?.data?.unreadCount ?? 0);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  // Fetch Ink Drop balance
  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController();
    async function fetchBalance() {
      try {
        const res = await fetch("/api/user/ink-drops", { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          setInkDropBalance(json?.balance ?? null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  // Fetch reading streak (refresh every 5 min — streaks change at most once a day)
  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController();
    async function fetchStreak() {
      try {
        const res = await fetch("/api/user/streak", { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setStreak({ days: json.data.days, status: json.data.status });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    fetchStreak();
    const interval = setInterval(fetchStreak, 5 * 60_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  const profileHref = session?.user?.id ? `/profile/${session.user.id}` : "/login";
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() || "?";
  const streakVisible = Boolean(
    streak && streak.days > 0 && (streak.status === "active" || streak.status === "at-risk")
  );

  return (
    <div className={mobileHidden ? "max-md:hidden" : undefined}>
      <InkDock
        signedIn={signedIn}
        loading={isLoading}
        displayName={session?.user?.name ?? null}
        initial={initial}
        profileHref={profileHref}
        unreadCount={unreadCount}
        inkDropBalance={inkDropBalance}
        streakDays={streakVisible && streak ? streak.days : null}
        onOpenPalette={() => setPaletteOpen(true)}
        onSignOut={() => signOut({ callbackUrl: "/" })}
      />
      <QuillPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={
          signedIn
            ? SIGNED_IN_COMMANDS.map((c) =>
                c.href === "/profile" ? { ...c, href: profileHref } : c
              )
            : SIGNED_OUT_COMMANDS
        }
      />
    </div>
  );
}
