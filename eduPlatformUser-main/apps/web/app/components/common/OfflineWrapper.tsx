"use client";

import { useEffect, useState } from "react";
import Main from "../moduleFirstPage/Main";
import OfflineLandingPage from "./OfflineLandingPage";

// ── Real connectivity check ────────────────────────────────────────────────────
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]" />
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
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
        >
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

        <button
          onClick={onContinue}
          className="w-full py-2.5 px-4 text-sm font-bold text-white rounded-xl transition-all active:scale-95 hover:opacity-90"
          style={{ background: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
        >
          Go to content
        </button>

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
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  // true once the user has been offline at least once in this session
  const [wasOffline, setWasOffline] = useState(false);
  // true once the user explicitly clicks "Go to content" on the popup
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Initial check — just set online state, no popup on first load
    checkRealConnectivity().then(setIsOnline);

    const handleOnline = () => {
      checkRealConnectivity().then(setIsOnline);
      // wasOffline stays true — popup will appear via render logic below
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);   // remember: user lost connection this session
      setConfirmed(false);   // reset so popup shows again on next reconnect
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // SSR guard — render nothing until first connectivity check resolves
  if (isOnline === null) return null;

  // Currently offline → show offline landing page
  if (!isOnline) return <OfflineLandingPage />;

  // Online but was offline this session and user hasn't confirmed yet
  // → keep showing offline page with the popup on top
  if (wasOffline && !confirmed) {
    return (
      <>
        <OfflineLandingPage />
        <BackOnlinePopup onContinue={() => setConfirmed(true)} />
      </>
    );
  }

  // Online and either never went offline, or user confirmed → show normal content
  return <Main />;
}
