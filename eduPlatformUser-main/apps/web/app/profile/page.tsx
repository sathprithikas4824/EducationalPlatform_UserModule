"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAnnotation } from "../components/common/AnnotationProvider";

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

// ── Account Details ────────────────────────────────────────────────────────────
function AccountDetails() {
  const { user } = useAnnotation();
  const initial = user?.name?.charAt(0).toUpperCase() || "U";

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
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">User ID</p>
          <p className="text-sm font-mono text-gray-500 break-all">{user?.id || "—"}</p>
        </div>
      </div>
    </div>
  );
}

// ── My Highlights ──────────────────────────────────────────────────────────────
function MyHighlights() {
  const { highlights, removeHighlight } = useAnnotation();

  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-200 border-yellow-300",
    green: "bg-green-200 border-green-300",
    blue: "bg-blue-200 border-blue-300",
    pink: "bg-pink-200 border-pink-300",
    purple: "bg-purple-200 border-purple-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Highlights</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
          {highlights.length} saved
        </span>
      </div>

      {highlights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-gray-500 font-medium">No highlights yet</p>
          <p className="text-gray-400 text-sm mt-1">Start highlighting text in your modules to save them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {highlights.map((h) => (
            <div
              key={h.id}
              className={`flex items-start gap-3 p-4 rounded-xl border ${colorMap[h.color] || "bg-yellow-100 border-yellow-200"}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-relaxed">"{h.text}"</p>
                <p className="text-xs text-gray-500 mt-1.5">Page: {h.pageId}</p>
              </div>
              <button
                onClick={() => removeHighlight(h.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Remove highlight"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
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

// ── Profile Page Inner (reads search params) ──────────────────────────────────
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
              {/* User info at top of sidebar */}
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

                {/* Divider */}
                <div className="my-2 border-t border-gray-100" />

                {/* Logout */}
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

// ── Page export (wrap in Suspense for useSearchParams) ────────────────────────
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
