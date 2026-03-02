"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signInWithOAuth } from "../../lib/supabase";

const DISMISSED_KEY   = "edu_google_popup_dismissed";
const LAST_LOGIN_KEY  = "edu_last_login";
const EXCLUDED_PREFIXES = ["/login", "/auth", "/signup"];

interface LastUser { name: string; email: string; }
interface Props    { isLoggedIn: boolean; }

export default function GoogleLoginPopup({ isLoggedIn }: Props) {
  const pathname       = usePathname();
  const [visible, setVisible]           = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [lastUser, setLastUser]         = useState<LastUser | null>(null);

  // Load previously signed-in user for "Continue as…" display
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_LOGIN_KEY);
      if (raw) setLastUser(JSON.parse(raw) as LastUser);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isLoggedIn) { setVisible(false); return; }
    if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(DISMISSED_KEY)) return;
    } catch { return; }

    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [isLoggedIn, pathname]);

  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch { /* ignore */ }
  };

  const handleContinue = async () => {
    setOauthLoading(true);
    try {
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem("auth_redirect", window.location.pathname);
      await signInWithOAuth("google");
    } catch {
      setOauthLoading(false);
    }
  };

  if (!visible) return null;

  // Derive initials / avatar colour from name
  const initial   = lastUser?.name?.charAt(0).toUpperCase() ?? "G";
  const firstName = lastUser?.name?.split(" ")[0] ?? "";

  return (
    /* ── Positioned top-right, same style as the browser One-Tap picker ── */
    <div className="fixed top-4 right-4 z-[9999] w-[360px] rounded-2xl overflow-hidden shadow-2xl"
         style={{ background: "#1f1f1f" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          {/* Google G logo */}
          <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <div>
            <p className="text-white text-sm font-medium leading-tight">Sign in to EduPlatform</p>
            <p className="text-[#9aa0a6] text-xs leading-tight mt-0.5">with google.com</p>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="text-[#9aa0a6] hover:text-white transition-colors mt-0.5 flex-shrink-0"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Divider ── */}
      <div className="h-px mx-0" style={{ background: "#3c4043" }} />

      {/* ── Account row (shown when a previous login is remembered) ── */}
      {lastUser && (
        <>
          <button
            onClick={handleContinue}
            disabled={oauthLoading}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left disabled:opacity-60"
          >
            {/* Avatar circle */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-semibold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
            >
              {initial}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{lastUser.name}</p>
              <p className="text-[#9aa0a6] text-xs truncate">{lastUser.email}</p>
            </div>

            {/* Loading spinner or arrow */}
            {oauthLoading
              ? <div className="w-4 h-4 border-2 border-[#9aa0a6] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              : <svg className="w-4 h-4 text-[#9aa0a6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            }
          </button>

          <div className="h-px" style={{ background: "#3c4043" }} />

          {/* "Use another account" row */}
          <button
            onClick={handleContinue}
            disabled={oauthLoading}
            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                 style={{ background: "#3c4043" }}>
              <svg className="w-5 h-5 text-[#9aa0a6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-[#e8eaed] text-sm">Use another account</p>
          </button>
        </>
      )}

      {/* ── No previous user: single "Continue with Google" button ── */}
      {!lastUser && (
        <button
          onClick={handleContinue}
          disabled={oauthLoading}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors disabled:opacity-60"
        >
          {/* Google G icon circle */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ background: "#3c4043" }}>
            {oauthLoading
              ? <div className="w-4 h-4 border-2 border-[#9aa0a6] border-t-transparent rounded-full animate-spin" />
              : <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
            }
          </div>
          <p className="text-[#e8eaed] text-sm font-medium">Continue with Google</p>
        </button>
      )}

      {/* ── Footer ── */}
      <div className="h-px" style={{ background: "#3c4043" }} />
      <div className="flex items-center justify-between px-5 py-3">
        <p className="text-[#9aa0a6] text-xs">
          {lastUser
            ? <>Continue as <span className="text-white font-medium">{firstName}</span></>
            : "Quick sign-in"}
        </p>
        <button
          onClick={dismiss}
          className="text-xs text-[#8ab4f8] hover:text-[#aecbfa] transition-colors font-medium"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
