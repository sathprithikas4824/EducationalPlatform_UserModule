"use client";

import { useEffect, useRef, useState } from "react";

// ── Real connectivity check — only used to confirm coming BACK online ─────────
// (e.g. captive portal: navigator.onLine is true but no real internet)
async function checkRealConnectivity(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`/logo.svg?_swbypass=1&_t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// Rules:
//   GO OFFLINE  → only from native "offline" event or navigator.onLine === false
//   COME ONLINE → native "online" event verified with a real fetch
//   NEVER mark offline from a failed fetch (eliminates all false-offline on load/refresh)
//   Poll every 3 s only while already offline — catches iOS Safari reconnection
export function useOfflineDetection() {
  const [isOnline, setIsOnline] = useState<boolean | null>(
    typeof navigator !== "undefined" ? navigator.onLine : null
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Refs so event handlers always see current values without re-registering
  const isOnlineRef = useRef(typeof navigator !== "undefined" ? navigator.onLine : true);
  const checkingRef = useRef(false);

  useEffect(() => {
    // Verify internet is truly back (handles captive portals)
    const verifyOnline = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      const ok = await checkRealConnectivity();
      checkingRef.current = false;
      if (ok) {
        isOnlineRef.current = true;
        setIsOnline(true);
      }
      // Do NOT go offline here — only native events / navigator.onLine do that
    };

    const goOffline = () => {
      if (isOnlineRef.current === false) return; // already offline, skip
      isOnlineRef.current = false;
      setIsOnline(false);
      setWasOffline(true);
      setConfirmed(false);
    };

    const handleOffline = () => goOffline();
    const handleOnline  = () => verifyOnline();
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine) goOffline();
      else if (!isOnlineRef.current) verifyOnline(); // was offline, check if back
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    // Poll every 3 s — ONLY acts when we are already offline (for iOS Safari reconnect)
    const interval = setInterval(() => {
      if (!navigator.onLine) { goOffline(); return; }
      if (!isOnlineRef.current) verifyOnline();
    }, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return { isOnline, wasOffline, confirmed, setConfirmed };
}
