"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/shared/Toast";
import { importAnonPlace, readAnonPlace } from "@/lib/anon-reader";
import { readDemoDraft, clearDemoDraft, importDemoDraft } from "@/lib/demo-draft";

/**
 * The safety net under every door into the house. The credentials
 * register/login handlers import anonymous work inline (so they can route
 * the user straight to it), but OAuth sign-in is a full-page redirect that
 * never runs those handlers — before this, a Google signup silently
 * dropped the demo draft and reading place. Mounted in the app shell, this
 * runs once per authenticated load, imports whatever anonymous work is
 * still in localStorage, and clears it only on success so failures retry
 * on the next load. No redirects — just a toast saying where the work went.
 */
export default function ContinuityImporter() {
  const { status } = useSession();
  const { toast } = useToast();
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || ran.current) return;
    // The credentials pages import inline and then route the user to the
    // work — running here too would race them into a duplicate import.
    if (pathname === "/register" || pathname === "/login") return;
    // Nothing waiting? Skip without marking ran, in case a key appears
    // later in the session (e.g. bfcache restore).
    const draft = readDemoDraft();
    const place = readAnonPlace();
    if (!draft && !place) return;
    ran.current = true;

    void (async () => {
      if (draft) {
        const storyId = await importDemoDraft(draft);
        if (storyId) {
          clearDemoDraft();
          toast("The draft you wrote before signing in is on your desk now", "success");
        } else {
          toast("Couldn't carry your demo draft over — it's still saved in this browser", "error");
        }
      }
      if (place) {
        // importAnonPlace clears the local copy itself on success.
        const imported = await importAnonPlace();
        if (imported) {
          toast(`Your place in "${imported.storyTitle || "your story"}" is saved`, "info");
        }
      }
    })();
  }, [status, pathname, toast]);

  return null;
}
