"use client";

import { useEffect, useRef, useState } from "react";
import Main from "../moduleFirstPage/Main";
import OfflineLandingPage from "./OfflineLandingPage";

// ── Real connectivity check ────────────────────────────────────────────────────
// navigator.onLine alone is unreliable on mobile — returns true on captive
// portals and metered connections with no data.
// _swbypass param tells the service worker to skip cache and hit real network.
async function checkRealConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
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

// ── Back-online popup ──────────────────────────────────────────────────────────
function BackOnlinePopup({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" />

      {/* Dialog */}
      <div
        className="fixed z-[9999] bg-white dark:bg-[#16162a] rounded-2xl shadow-2xl p-6 text-center"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(360px, 90vw)",
          border: "1px solid rgba(122, 18, 250, 0.2)",
        }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
        >
          {/* Wifi on icon */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <h3 className="jakarta-font text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
          You're back online!
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          Internet connection restored. Ready to load the full content?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 px-4 text-sm font-bold text-white rounded-xl transition-all active:scale-95 hover:opacity-90"
            style={{ background: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
          >
            Go to content
          </button>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Connected</span>
        </div>
      </div>
    </>
  );
}

// ── Main wrapper ───────────────────────────────────────────────────────────────
export default function OfflineWrapper() {
  // null  = not yet determined (SSR / first paint)
  // false = offline
  // true  = online
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  // true when we transitioned offline → online and user hasn't confirmed yet
  const [showReconnectedPopup, setShowReconnectedPopup] = useState(false);

  // whether the user confirmed and we should render Main
  const [confirmed, setConfirmed] = useState(false);

  // track previous online state to detect the offline→online transition
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Initial check — no popup on first load (user was never offline in this session)
    checkRealConnectivity().then((online) => {
      prevOnlineRef.current = online;
      setIsOnline(online);
    });

    const handleOnline = () => {
      checkRealConnectivity().then((online) => {
        if (online && prevOnlineRef.current === false) {
          // Transitioned offline → online: show popup instead of immediately switching
          setShowReconnectedPopup(true);
        }
        prevOnlineRef.current = online;
        setIsOnline(online);
      });
    };

    const handleOffline = () => {
      prevOnlineRef.current = false;
      setIsOnline(false);
      setShowReconnectedPopup(false);
      setConfirmed(false); // reset so popup shows again next reconnect
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleContinue = () => {
    setShowReconnectedPopup(false);
    setConfirmed(true);
  };

  // SSR guard
  if (isOnline === null) return null;

  // Was online from the start — render Main directly (no popup needed)
  if (isOnline && confirmed) return <Main />;
  if (isOnline && prevOnlineRef.current !== false) return <Main />;

  // Offline — show offline landing page, with popup on top if just reconnected
  return (
    <>
      <OfflineLandingPage />
      {showReconnectedPopup && <BackOnlinePopup onContinue={handleContinue} />}
    </>
  );
}
