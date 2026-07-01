"use client";

import type { ReactNode } from "react";

/**
 * The Table — the play surface's docked right rail. A vertical stack of
 * slots (cast → pressure → your sheet / party → chat peek) with its own
 * scroll, so the stage never has to share its height with chrome.
 */
export default function TableRail({ children }: { children: ReactNode }) {
  return (
    <aside className="flex h-full flex-col border-l border-border bg-gradient-to-b from-ink/60 to-void">
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4 [scrollbar-color:rgba(224,169,62,0.22)_transparent] [scrollbar-width:thin]">
        {children}
      </div>
    </aside>
  );
}
