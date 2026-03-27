"use client";

import { useEffect, useState } from "react";
import Main from "../moduleFirstPage/Main";
import OfflineLandingPage from "./OfflineLandingPage";

// ── Real connectivity check ────────────────────────────────────────────────────
// navigator.onLine alone is unreliable on mobile:
//   - iOS/Android return true on captive-portal WiFi (hotel, airport)
//   - Android returns true on metered connections with no data
// Solution: fetch a small static asset with ?_swbypass=1 so the service
// worker skips its cache and hits the real network. If the fetch throws
// (network error / timeout) we know we're truly offline.

async function checkRealConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000); // 5 s timeout
  try {
    await fetch(`/logo.svg?_swbypass=1&_t=${Date.now()}`, {
      method: "HEAD",
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

export default function OfflineWrapper() {
  // null = not yet determined (SSR / first paint)
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Initial check: use real fetch, not just navigator.onLine
    checkRealConnectivity().then(setIsOnline);

    // browser fires these reliably on Android Chrome, iOS Safari, Firefox, etc.
    const handleOnline = () => {
      // Re-verify — don't trust the event alone on mobile
      checkRealConnectivity().then(setIsOnline);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Render nothing until the connectivity check resolves (avoids hydration mismatch)
  if (isOnline === null) return null;

  if (!isOnline) return <OfflineLandingPage />;

  return <Main />;
}
