"use client";

import { useEffect, useRef, useState } from "react";

// ── Real connectivity check (bypasses service worker) ────────────────────────
// Uses a short 3-second timeout so mobile users get a fast response.
export async function checkRealConnectivity(): Promise<boolean> {
  // Quick pre-check: if the browser already knows we're offline, trust it
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
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

// ── Hook: monitors connectivity on all platforms including iOS / Android ──────
// Strategy:
//   1. native online/offline events  — instant on desktop + Android Chrome
//   2. visibilitychange              — wakes check when iOS returns from bg
//   3. focus                         — catches desktop tab switches
//   4. 3-second poll                 — catches iOS drops that fire no event
//
// Returns { isOnline, wasOffline, setWasOffline, confirmed, setConfirmed }
export function useOfflineDetection() {
  // Initialise immediately from navigator.onLine — zero blank-screen delay on open.
  // The real fetch-based check runs in background and corrects this if wrong.
  const [isOnline, setIsOnline] = useState<boolean | null>(
    typeof navigator !== "undefined" ? navigator.onLine : null
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const checkingRef = useRef(false);
  // Require 2 consecutive fetch failures before declaring offline, so a single
  // transient hiccup never wrongly shows the offline page while actually online.
  const failCountRef = useRef(0);

  useEffect(() => {
    const check = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      const online = await checkRealConnectivity();
      checkingRef.current = false;

      if (online) {
        failCountRef.current = 0;
        setIsOnline(true);
      } else {
        failCountRef.current += 1;
        // Only go offline after 2 consecutive failures, OR if browser also says offline
        if (failCountRef.current >= 2 || !navigator.onLine) {
          setIsOnline(false);
          setWasOffline(true);
          setConfirmed(false);
        }
      }
    };

    // Immediate native offline signal — no fetch needed, fastest possible
    const handleOfflineEvent = () => {
      setIsOnline(false);
      setWasOffline(true);
      setConfirmed(false);
    };

    // Online event / visibility / focus — verify with real fetch
    const handleOnlineEvent = () => check();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") check();
    };

    // Initial check
    check();

    // Poll every 3 s — essential for iOS Safari which often skips events
    const interval = setInterval(check, 3000);

    window.addEventListener("offline", handleOfflineEvent);
    window.addEventListener("online", handleOnlineEvent);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleOnlineEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", handleOfflineEvent);
      window.removeEventListener("online", handleOnlineEvent);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleOnlineEvent);
    };
  }, []);

  return { isOnline, wasOffline, confirmed, setConfirmed };
}
