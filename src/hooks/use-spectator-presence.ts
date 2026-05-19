"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const TOKEN_PREFIX = "spectator-token-";

function getOrCreateToken(sessionId: string): string {
  const key = `${TOKEN_PREFIX}${sessionId}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

interface UseSpectatorPresenceReturn {
  spectatorCount: number;
  token: string;
}

export function useSpectatorPresence(
  storyId: string,
  sessionId: string
): UseSpectatorPresenceReturn {
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [token] = useState(() =>
    typeof window !== "undefined" && sessionId ? getOrCreateToken(sessionId) : ""
  );
  const tokenRef = useRef(token);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const presenceUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/presence`;

  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(presenceUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.spectatorCount === "number") {
          setSpectatorCount(json.spectatorCount);
        }
      }
    } catch {
      // Heartbeat failures are non-critical
    }
  }, [presenceUrl, token]);

  useEffect(() => {
    if (!storyId || !sessionId) return;

    tokenRef.current = token;

    // Send initial heartbeat after mount so React does not receive state updates
    // during the effect's synchronous setup.
    const initialHeartbeat = setTimeout(sendHeartbeat, 0);

    // Start heartbeat interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      clearTimeout(initialHeartbeat);
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Attempt to signal departure
      const token = tokenRef.current;
      if (!token) return;

      const body = JSON.stringify({ token });
      const url = presenceUrl;

      // Try sendBeacon first (survives page unload)
      const beaconSent = navigator.sendBeacon?.(
        url + "?_method=DELETE",
        new Blob([body], { type: "application/json" })
      );

      // Fallback to fetch with keepalive
      if (!beaconSent) {
        fetch(url, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [storyId, sessionId, sendHeartbeat, presenceUrl, token]);

  return { spectatorCount, token };
}
