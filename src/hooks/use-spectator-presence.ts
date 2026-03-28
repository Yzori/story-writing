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
}

export function useSpectatorPresence(
  storyId: string,
  sessionId: string
): UseSpectatorPresenceReturn {
  const [spectatorCount, setSpectatorCount] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const presenceUrl = `/api/stories/${storyId}/campaign/sessions/${sessionId}/spectate/presence`;

  const sendHeartbeat = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch(presenceUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current }),
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
  }, [presenceUrl]);

  useEffect(() => {
    if (!storyId || !sessionId) return;

    tokenRef.current = getOrCreateToken(sessionId);

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Start heartbeat interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
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
  }, [storyId, sessionId, sendHeartbeat, presenceUrl]);

  return { spectatorCount };
}
