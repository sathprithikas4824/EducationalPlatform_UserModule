"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAnnotation } from "../components/common/AnnotationProvider";
import { supabase, getAllModulesProgress, type TopicProgress } from "../lib/supabase";

// ── Constants ──────────────────────────────────────────────────────────────────
const BACKEND_URL = "https://educationalplatform-usermodule-2.onrender.com";

type Tab = "account" | "highlights" | "progress" | "projects" | "downloads";

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
    id: "progress",
    label: "My Progress",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

// ── Data types for backend ─────────────────────────────────────────────────────
interface BackendSubmodule {
  submodule_id: number;
  name: string;
  category_id: number;
}
interface BackendTopic {
  topic_id: number;
  submodule_id: number;
  name: string;
}
interface TopicInfo {
  topicName: string;
  submoduleName: string;
  submoduleId: number;
}
type TopicMap = Record<number, TopicInfo>;
type SubmoduleMap = Record<number, string>; // submodule_id → name

// ── Shared data hook (topic & submodule names from backend) ───────────────────
function useTopicData() {
  const [topicMap, setTopicMap] = useState<TopicMap>({});
  const [submoduleMap, setSubmoduleMap] = useState<SubmoduleMap>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/submodules`);
        const raw = await res.json();
        const submodules: BackendSubmodule[] = Array.isArray(raw) ? raw : (raw.data ?? []);

        const sMap: SubmoduleMap = {};
        for (const sm of submodules) sMap[sm.submodule_id] = sm.name;
        setSubmoduleMap(sMap);

        // Fetch topics for all submodules in parallel
        const results = await Promise.all(
          submodules.map((sm) =>
            fetch(`${BACKEND_URL}/api/topics/${sm.submodule_id}`)
              .then((r) => r.json())
              .then((data) => ({
                submoduleId: sm.submodule_id,
                submoduleName: sm.name,
                topics: Array.isArray(data) ? data : [],
              }))
              .catch(() => ({ submoduleId: sm.submodule_id, submoduleName: sm.name, topics: [] }))
          )
        );

        const tMap: TopicMap = {};
        for (const { submoduleId, submoduleName, topics } of results) {
          for (const t of topics as BackendTopic[]) {
            tMap[t.topic_id] = { topicName: t.name, submoduleName, submoduleId };
          }
        }
        setTopicMap(tMap);
      } catch { /* ignore */ } finally {
        setDataLoaded(true);
      }
    };
    fetch_();
  }, []);

  return { topicMap, submoduleMap, dataLoaded };
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function topicIdFromPageId(pageId: string): number | null {
  if (pageId.startsWith("topic-")) {
    const n = Number(pageId.replace("topic-", ""));
    return isNaN(n) ? null : n;
  }
  return null;
}

// ── Account Details ────────────────────────────────────────────────────────────
type ResetStep = "idle" | "send-email" | "email-sent";

function AccountDetails() {
  const { user } = useAnnotation();
  const initial = user?.name?.charAt(0).toUpperCase() || "U";

  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [email, setEmail] = useState(user?.email || "");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`pwd_changed_${user.id}`);
    if (stored) setLastChangedAt(stored);
  }, [user?.id]);

  const handleSendEmail = async () => {
    if (!supabase) { setPwError("Auth not configured."); return; }
    setPwLoading(true);
    setPwError(null);
    // Route through /auth/callback?type=recovery so the callback handles the token exchange
    const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setResetStep("email-sent");
  };

  const cancelReset = () => {
    setResetStep("idle");
    setPwError(null);
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

      {/* Password & Security */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-sm font-semibold text-gray-800">Password &amp; Security</p>
        </div>

        {/* idle */}
        {resetStep === "idle" && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              {lastChangedAt
                ? `Password was changed ${timeAgo(lastChangedAt)}`
                : "Manage your account password"}
            </p>
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

        {/* send-email */}
        {resetStep === "send-email" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Enter your email to receive a password reset link.</p>
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
              <button onClick={cancelReset} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={pwLoading || !email}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-opacity disabled:opacity-60"
                style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
              >
                {pwLoading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                }
                Send Verification Email
              </button>
            </div>
          </div>
        )}

        {/* email-sent */}
        {resetStep === "email-sent" && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">Check your email</p>
              <p className="text-xs text-blue-600 mt-0.5">
                We sent a reset link to <strong>{email}</strong>. Click it to set a new password — you'll be guided through the steps.
              </p>
              <button onClick={cancelReset} className="text-xs text-blue-500 underline mt-2">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── My Highlights ──────────────────────────────────────────────────────────────
const colorMap: Record<string, { bg: string; border: string; dot: string }> = {
  yellow: { bg: "bg-yellow-50",  border: "border-yellow-200", dot: "bg-yellow-400" },
  green:  { bg: "bg-green-50",   border: "border-green-200",  dot: "bg-green-400" },
  blue:   { bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-400" },
  pink:   { bg: "bg-pink-50",    border: "border-pink-200",   dot: "bg-pink-400" },
  purple: { bg: "bg-purple-50",  border: "border-purple-200", dot: "bg-purple-400" },
};

function MyHighlights({ topicMap, dataLoaded }: { topicMap: TopicMap; dataLoaded: boolean }) {
  const { highlights, removeHighlight } = useAnnotation();
  const sorted = [...highlights].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
          {sorted.map((h) => {
            const colors = colorMap[h.color] ?? colorMap.yellow;
            const topicId = topicIdFromPageId(h.pageId);
            const info = topicId != null ? topicMap[topicId] : undefined;

            const moduleName = info?.submoduleName ?? (topicId != null ? `Module ${topicId}` : h.pageId);
            const topicName  = info?.topicName     ?? (topicId != null ? `Topic ${topicId}`  : h.pageId);
            const isLoading  = !dataLoaded && !info;

            return (
              <div key={h.id} className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
                {/* Module + Topic row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <span className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded-full max-w-[160px] truncate">
                    {isLoading ? "Loading…" : moduleName}
                  </span>
                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs text-gray-600 bg-white border border-gray-100 px-2 py-0.5 rounded-full max-w-[160px] truncate">
                    {isLoading ? "…" : topicName}
                  </span>
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{timeAgo(h.createdAt)}</span>
                </div>

                {/* Highlight text */}
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-sm text-gray-800 leading-relaxed italic min-w-0">"{h.text}"</p>
                  <button
                    onClick={() => removeHighlight(h.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Remove"
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

// ── My Progress ────────────────────────────────────────────────────────────────
function MyProgress({
  userId,
  topicMap,
  submoduleMap,
  dataLoaded,
}: {
  userId: string | undefined;
  topicMap: TopicMap;
  submoduleMap: SubmoduleMap;
  dataLoaded: boolean;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    getAllModulesProgress(userId).then((data) => {
      // Sort by completed_at descending, take 10
      const sorted = [...data]
        .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
        .slice(0, 10);
      setProgress(sorted);
      setLoading(false);
    });
  }, [userId]);

  if (loading || !dataLoaded) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">My Progress</h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm py-10 justify-center">
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Loading progress…
        </div>
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">My Progress</h2>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 font-medium">No progress yet</p>
          <p className="text-gray-400 text-sm mt-1">Complete topics in your modules to track progress here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Progress</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
          Recent {progress.length}
        </span>
      </div>

      <div className="space-y-3">
        {progress.map((p, idx) => {
          const moduleName = submoduleMap[p.module_id] ?? `Module ${p.module_id}`;
          const topicInfo  = topicMap[p.topic_id];
          const topicName  = topicInfo?.topicName ?? `Topic ${p.topic_id}`;

          return (
            <div
              key={`${p.topic_id}-${idx}`}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all group"
            >
              {/* Completed icon */}
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-purple-600 truncate">{moduleName}</p>
                <p className="text-sm font-medium text-gray-800 truncate">{topicName}</p>
                {p.completed_at && (
                  <p className="text-xs text-gray-400 mt-0.5">Completed {timeAgo(p.completed_at)}</p>
                )}
              </div>

              {/* View button */}
              <button
                onClick={() => router.push(`/modules/${p.module_id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-600 hover:text-white rounded-lg transition-all flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white"
              >
                View
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
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

  // Shared topic/submodule data (fetched once, used by highlights + progress)
  const { topicMap, submoduleMap, dataLoaded } = useTopicData();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">You need to be logged in to view your profile.</p>
          <Link href="/login" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors">
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
      case "highlights": return <MyHighlights topicMap={topicMap} dataLoaded={dataLoaded} />;
      case "progress":   return <MyProgress userId={user?.id} topicMap={topicMap} submoduleMap={submoduleMap} dataLoaded={dataLoaded} />;
      case "projects":   return <MyProjects />;
      case "downloads":  return <MyDownloads />;
      default:           return <AccountDetails />;
    }
  };

  const handleLogout = () => { logout(); router.push("/"); };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
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
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
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

              <nav className="p-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      href={`/profile?tab=${tab.id}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                        isActive ? "bg-purple-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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

          {/* Main content */}
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
