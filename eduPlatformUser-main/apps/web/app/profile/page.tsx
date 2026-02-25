"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAnnotation } from "../components/common/AnnotationProvider";
import { supabase } from "../lib/supabase";

type Tab = "account" | "highlights" | "projects" | "downloads";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "account",
    label: "Account Details",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: "highlights",
    label: "My Highlights",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    id: "projects",
    label: "My Projects",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    id: "downloads",
    label: "My Downloads",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

// ── Relative time helper ───────────────────────────────────────────────────────
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

// ── Account Details ────────────────────────────────────────────────────────────
type ResetStep = "idle" | "send-email" | "email-sent" | "set-password" | "success";

function AccountDetails() {
  const { user } = useAnnotation();
  const initial = user?.name?.charAt(0).toUpperCase() || "U";

  // Password reset state
  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null);

  // Load last-changed timestamp from localStorage
  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`pwd_changed_${user.id}`);
    if (stored) setLastChangedAt(stored);
  }, [user?.id]);

  // Listen for Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetStep("set-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSendEmail = async () => {
    if (!supabase) { setPwError("Auth not configured."); return; }
    setPwLoading(true);
    setPwError(null);
    const redirectTo = `${window.location.origin}/profile?tab=account`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setResetStep("email-sent");
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    if (!supabase) { setPwError("Auth not configured."); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    const now = new Date().toISOString();
    if (user?.id) localStorage.setItem(`pwd_changed_${user.id}`, now);
    setLastChangedAt(now);
    setResetStep("success");
    setNewPassword("");
    setConfirmPassword("");
  };

  const cancelReset = () => {
    setResetStep("idle");
    setPwError(null);
    setNewPassword("");
    setConfirmPassword("");
    setEmail(user?.email || "");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Account Details</h2>

      {/* Avatar + name banner */}
      <div className="flex items-center gap-5 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
        >
          {initial}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Info fields */}
      <div className="grid gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Full Name</p>
          <p className="text-base font-medium text-gray-800">{user?.name || "—"}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Email Address</p>
          <p className="text-base font-medium text-gray-800">{user?.email || "—"}</p>
        </div>
      </div>

      {/* ── Password & Security ─────────────────────────────────── */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-sm font-semibold text-gray-800">Password &amp; Security</p>
        </div>

        {/* ── Step: idle ── */}
        {resetStep === "idle" && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {lastChangedAt
                  ? `Password was changed ${timeAgo(lastChangedAt)}`
                  : "Manage your account password"}
              </p>
            </div>
            <button
              onClick={() => setResetStep("send-email")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Password
            </button>
          </div>
        )}

        {/* ── Step: send-email ── */}
        {resetStep === "send-email" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Enter your email address to receive a password reset link.</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            {pwError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {pwError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={cancelReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={pwLoading || !email}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-opacity disabled:opacity-60"
                style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
              >
                {pwLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                Send Verification Email
              </button>
            </div>
          </div>
        )}

        {/* ── Step: email-sent ── */}
        {resetStep === "email-sent" && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">Check your email</p>
              <p className="text-xs text-blue-600 mt-0.5">
                We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
              </p>
              <button onClick={cancelReset} className="text-xs text-blue-500 underline mt-2">Cancel</button>
            </div>
          </div>
        )}

        {/* ── Step: set-password ── */}
        {resetStep === "set-password" && (
          <form onSubmit={handleSetPassword} className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Set your new password</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
            {pwError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {pwError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelReset}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pwLoading || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-60 transition-opacity"
                style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
              >
                {pwLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Update Password
              </button>
            </div>
          </form>
        )}

        {/* ── Step: success ── */}
        {resetStep === "success" && (
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800">Password updated successfully</p>
              {lastChangedAt && (
                <p className="text-xs text-green-600 mt-0.5">
                  Password was changed {timeAgo(lastChangedAt)}
                </p>
              )}
              <button
                onClick={() => setResetStep("idle")}
                className="text-xs text-green-600 underline mt-2"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── My Highlights ──────────────────────────────────────────────────────────────
function parsePageId(pageId: string): { topicLabel: string; topicId: string } {
  // pageId is like "topic-123" or "default"
  if (pageId.startsWith("topic-")) {
    const id = pageId.replace("topic-", "");
    return { topicLabel: `Topic ${id}`, topicId: id };
  }
  return { topicLabel: pageId, topicId: pageId };
}

function MyHighlights() {
  const { highlights, removeHighlight } = useAnnotation();

  // Sort newest first
  const sorted = [...highlights].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const colorMap: Record<string, { bg: string; border: string; dot: string }> = {
    yellow: { bg: "bg-yellow-50",  border: "border-yellow-200", dot: "bg-yellow-400" },
    green:  { bg: "bg-green-50",   border: "border-green-200",  dot: "bg-green-400" },
    blue:   { bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-400" },
    pink:   { bg: "bg-pink-50",    border: "border-pink-200",   dot: "bg-pink-400" },
    purple: { bg: "bg-purple-50",  border: "border-purple-200", dot: "bg-purple-400" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Highlights</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
          {highlights.length} saved
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-gray-500 font-medium">No highlights yet</p>
          <p className="text-gray-400 text-sm mt-1">Start highlighting text in your modules to save them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((h, idx) => {
            const colors = colorMap[h.color] || colorMap.yellow;
            const { topicLabel, topicId } = parsePageId(h.pageId);
            const isRecent = idx === 0;

            return (
              <div
                key={h.id}
                className={`relative p-4 rounded-xl border ${colors.bg} ${colors.border}`}
              >
                {/* Recent badge on first item */}
                {isRecent && (
                  <span className="absolute top-3 right-10 text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    Recent
                  </span>
                )}

                {/* Topic + Module row */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <span className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    {topicLabel}
                  </span>
                  <span className="text-xs text-gray-400 bg-white border border-gray-100 px-2 py-0.5 rounded-full">
                    Module {topicId}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{timeAgo(h.createdAt)}</span>
                </div>

                {/* Highlight text */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-relaxed italic">"{h.text}"</p>
                  </div>
                  <button
                    onClick={() => removeHighlight(h.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-0.5"
                    title="Remove highlight"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── My Projects ────────────────────────────────────────────────────────────────
function MyProjects() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-gray-500 font-medium">No projects yet</p>
        <p className="text-gray-400 text-sm mt-1">Your learning projects will appear here.</p>
      </div>
    </div>
  );
}

// ── My Downloads ───────────────────────────────────────────────────────────────
function MyDownloads() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Downloads</h2>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <p className="text-gray-500 font-medium">No downloads yet</p>
        <p className="text-gray-400 text-sm mt-1">Files you download will appear here.</p>
      </div>
    </div>
  );
}

// ── Profile Page Inner ─────────────────────────────────────────────────────────
function ProfilePageInner() {
  const { user, isLoggedIn, logout } = useAnnotation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as Tab) || "account";

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">You need to be logged in to view your profile.</p>
          <Link
            href="/login"
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const initial = user?.name?.charAt(0).toUpperCase() || "U";

  const renderContent = () => {
    switch (activeTab) {
      case "account":    return <AccountDetails />;
      case "highlights": return <MyHighlights />;
      case "projects":   return <MyProjects />;
      case "downloads":  return <MyDownloads />;
      default:           return <AccountDetails />;
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
            <span className="text-sm font-semibold">Back to Home</span>
          </Link>
          <span className="text-sm font-semibold text-gray-900">My Profile</span>
          <div className="w-28" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* User info */}
              <div className="px-5 py-5 border-b border-gray-100 bg-gradient-to-br from-purple-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation links */}
              <nav className="p-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={`/profile?tab=${tab.id}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                        isActive
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span className={isActive ? "text-white" : "text-gray-400"}>{tab.icon}</span>
                      {tab.label}
                    </Link>
                  );
                })}

                <div className="my-2 border-t border-gray-100" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </nav>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[500px]">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ── Page export ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProfilePageInner />
    </Suspense>
  );
}
