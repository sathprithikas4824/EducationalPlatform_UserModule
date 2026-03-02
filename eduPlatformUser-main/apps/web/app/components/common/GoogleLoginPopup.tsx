"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signInWithOAuth } from "../../lib/supabase";

// sessionStorage key — popup won't reappear after being dismissed in the same session
const DISMISSED_KEY = "edu_google_popup_dismissed";

// Pages where the popup must never appear
const EXCLUDED_PREFIXES = ["/login", "/auth", "/signup"];

interface Props {
  isLoggedIn: boolean;
}

export default function GoogleLoginPopup({ isLoggedIn }: Props) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    // Hide immediately if user logs in while popup is open
    if (isLoggedIn) { setVisible(false); return; }

    // Skip excluded routes
    if (EXCLUDED_PREFIXES.some((p) => pathname?.startsWith(p))) return;

    // Skip if already dismissed this session
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(DISMISSED_KEY)) return;
    } catch { return; }

    // Show after a short delay so the page loads first
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [isLoggedIn, pathname]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* ignore */ }
  };

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    try {
      // Remember current page so /auth/callback can redirect back
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("auth_redirect", window.location.pathname);
      }
      await signInWithOAuth("google");
      // Browser navigates away on success — loading state resets on return
    } catch {
      setOauthLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-7 flex flex-col items-center text-center">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo bubble */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome!</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Sign in to save your progress, highlights &amp; downloads across all your devices.
        </p>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          disabled={oauthLoading}
          className="w-full py-3 px-4 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm mb-4"
        >
          {oauthLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continue with Google
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Sign in with email link */}
        <a
          href="/login"
          className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors mb-3"
          onClick={handleDismiss}
        >
          Sign in with Email
        </a>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
