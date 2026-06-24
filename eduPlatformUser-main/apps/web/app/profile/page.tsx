"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAnnotation } from "../components/common/AnnotationProvider";
import { supabase, getAllModulesProgress, getProgressPaginated, getUserSurvey, uploadAvatar, type TopicProgress, type SurveyRow } from "../lib/supabase";
import { compressImage } from "../lib/imageCompress";
import { logAudit } from "../lib/audit";
import { loadDownloads, removeDownload, removeModuleDownloads, type DownloadRecord } from "../lib/downloads";
import { loadBookmarks, removeBookmark, type BookmarkRecord } from "../lib/bookmarks";
import { getAllNotes, getNotesPaginated, deleteNote, restoreNote, getDeletedNotes, type NoteRecord } from "../lib/notes";
import { getSummariesPaginated, deleteSummary, restoreSummary, getDeletedSummaries, type SummaryRecord } from "../lib/summaries";
import { BookmarkHeart } from "../components/common/icons/BookmarkHeart";

// ── Constants ──────────────────────────────────────────────────────────────────
const BACKEND_URL = "https://educationalplatform-usermodule-2.onrender.com";

type Tab = "account" | "highlights" | "progress" | "projects" | "downloads" | "survey" | "bookmarks" | "notes";

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
    id: "downloads",
    label: "My Downloads",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    id: "survey",
    label: "My Survey",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "bookmarks",
    label: "My Bookmarks",
    icon: <BookmarkHeart size={20} />,
  },
  {
    id: "notes",
    label: "My Notes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
    let cancelled = false;

    const loadData = async (attempt: number) => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/submodules`);
        if (!res.ok) throw new Error("submodules fetch failed");
        const raw = await res.json();
        const submodules: BackendSubmodule[] = Array.isArray(raw) ? raw : (raw.data ?? []);

        const sMap: SubmoduleMap = {};
        for (const sm of submodules) sMap[sm.submodule_id] = sm.name;

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

        if (!cancelled) {
          setSubmoduleMap(sMap);
          setTopicMap(tMap);
          setDataLoaded(true);
        }
      } catch {
        if (!cancelled && attempt < 2) {
          // Retry once after 3 s (handles cold-start on free-tier backend)
          setTimeout(() => loadData(attempt + 1), 3000);
        } else if (!cancelled) {
          setDataLoaded(true);
        }
      }
    };

    loadData(0);
    return () => { cancelled = true; };
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

interface NotionTokenInfo { workspace_name: string | null; workspace_icon: string | null }

function AccountDetails({ onAvatarChange }: { onAvatarChange?: (url: string) => void }) {
  const { user } = useAnnotation();
  const searchParams = useSearchParams();
  const initial = user?.name?.charAt(0).toUpperCase() || "U";

  const [resetStep, setResetStep] = useState<ResetStep>("idle");
  const [email, setEmail] = useState(user?.email || "");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null);
  const [notionInfo, setNotionInfo] = useState<NotionTokenInfo | null | "loading">("loading");
  const [notionDisconnecting, setNotionDisconnecting] = useState(false);
  // Read from localStorage immediately so the photo shows without waiting for the DB
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("edu_avatar_url") : null
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const notionParam = searchParams.get("notion");

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`pwd_changed_${user.id}`);
    if (stored) setLastChangedAt(stored);
  }, [user?.id]);

  // Only fall back to Supabase Storage if localStorage has no cached URL.
  // Never read from the profiles DB — it can have a stale URL that would
  // overwrite a newer one that's already showing.
  useEffect(() => {
    if (!user?.id || !supabase) return;
    if (localStorage.getItem("edu_avatar_url")) return; // trust the cache
    const { data } = supabase.storage.from("avatars").getPublicUrl(`${user.id}/avatar.jpg`);
    setAvatarUrl(data.publicUrl);
    localStorage.setItem("edu_avatar_url", data.publicUrl);
  }, [user?.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    const compressed = await compressImage(file);
    const url = await uploadAvatar(user.id, compressed);
    if (url) {
      setAvatarUrl(url);
      localStorage.setItem("edu_avatar_url", url);
      onAvatarChange?.(url);
      window.dispatchEvent(new CustomEvent("edu:avatar-changed", { detail: { url } }));
      logAudit({ action: "avatar_uploaded", category: "profile" });
    } else {
      logAudit({ action: "avatar_uploaded", category: "profile", status: "failure" });
    }
    setAvatarUploading(false);
    if (e.target) e.target.value = "";
  };

  // Load Notion connection status
  useEffect(() => {
    if (!user?.id || !supabase) { setNotionInfo(null); return; }
    supabase
      .from("user_notion_tokens")
      .select("workspace_name, workspace_icon")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setNotionInfo(data ? (data as NotionTokenInfo) : null));
  }, [user?.id, notionParam]);

  const handleDisconnectNotion = async () => {
    if (!user?.id || !supabase) return;
    setNotionDisconnecting(true);
    await supabase.from("user_notion_tokens").delete().eq("user_id", user.id);
    logAudit({ action: "notion_disconnected", category: "profile" });
    setNotionInfo(null);
    setNotionDisconnecting(false);
  };

  const handleSendEmail = async () => {
    if (!supabase) { setPwError("Auth not configured."); return; }
    setPwLoading(true);
    setPwError(null);
    // Route through /auth/callback?type=recovery so the callback handles the token exchange
    const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    logAudit({ action: "password_reset_requested", category: "auth", metadata: { email } });
    setResetStep("email-sent");
  };

  const cancelReset = () => {
    setResetStep("idle");
    setPwError(null);
    setEmail(user?.email || "");
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Account Details</h2>

      {/* Avatar + name banner */}
      <div className="flex items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
        {/* Clickable avatar — click to change photo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full flex-shrink-0 group focus:outline-none"
          title="Click to change profile photo"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt={`${user?.name || "User"}'s profile photo`} fill className="rounded-full object-cover" />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold"
              style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
            >
              {avatarUploading ? (
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : initial}
            </div>
          )}
          {/* Hover overlay */}
          {!avatarUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}
        </button>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div className="min-w-0">
          <p className="text-base sm:text-xl font-bold text-gray-900 truncate">{user?.name}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{user?.email}</p>
          <p className="text-xs text-purple-500 mt-1">
            {avatarUploading ? "Uploading…" : "Click photo to change"}
          </p>
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
              <label htmlFor="profile-email-reset" className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <input
                id="profile-email-reset"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
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

      {/* ── Notion Integration ── */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#000" }}>
            <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
          </svg>
          <p className="text-sm font-semibold text-gray-800">Notion Integration</p>
        </div>

        {/* Feedback banners */}
        {notionParam === "connected" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 text-sm text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Notion connected! Your notes and AI summaries will now go to your personal Notion workspace.
          </div>
        )}
        {notionParam === "error" && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-600">
            Connection failed. Please try again or check your Notion account.
          </div>
        )}
        {notionParam === "not_configured" && (
          <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-sm text-yellow-700">
            Notion OAuth is not configured on this platform yet. Contact the admin.
          </div>
        )}

        {notionInfo === "loading" ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            Checking connection…
          </div>
        ) : notionInfo ? (
          /* Connected state */
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-base flex-shrink-0">
                {notionInfo.workspace_icon ?? "📚"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-green-800">Connected to Notion</p>
                <p className="text-xs text-green-600 truncate">{notionInfo.workspace_name ?? "Your workspace"}</p>
              </div>
              <svg className="w-4 h-4 text-green-500 flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">
              Your notes and AI summaries now sync to your personal Notion workspace. An &quot;EduPlatform Notes&quot; database is created there automatically.
            </p>
            <button
              onClick={handleDisconnectNotion}
              disabled={notionDisconnecting}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors disabled:opacity-50"
            >
              {notionDisconnecting
                ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              }
              Disconnect Notion
            </button>
          </div>
        ) : (
          /* Not connected state */
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Connect your Notion account so your notes and AI summaries go directly into your personal Notion workspace — visible only to you.
            </p>
            <a
              href={user?.id ? `/api/auth/notion/connect?userId=${user.id}` : "#"}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90"
              style={{ background: "#000" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
              </svg>
              Connect Notion
            </a>
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

  // Sort all highlights newest-first, then group by pageId (topic)
  const groups = useMemo(() => {
    const sorted = [...highlights].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const map = new Map<string, typeof highlights>();
    for (const h of sorted) {
      const bucket = map.get(h.pageId) ?? [];
      bucket.push(h);
      map.set(h.pageId, bucket);
    }
    // Return groups sorted by the newest highlight in each group
    return Array.from(map.values());
  }, [highlights]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Highlights</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
          {highlights.length} saved
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-gray-500 font-medium">No highlights yet</p>
          <p className="text-gray-400 text-sm mt-1">Start highlighting text in your modules to save them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((groupItems) => {
            const first    = groupItems[0];
            const topicId  = topicIdFromPageId(first.pageId);
            const info     = topicId != null ? topicMap[topicId] : undefined;
            const isLoading = !dataLoaded && !info;

            const moduleName = info?.submoduleName ?? (topicId != null ? `Module ${topicId}` : first.pageId);
            const topicName  = info?.topicName     ?? (topicId != null ? `Topic ${topicId}`  : first.pageId);

            return (
              <div key={first.pageId} className="rounded-xl border border-gray-200 overflow-hidden">

                {/* ── Topic header (shown once per group) ── */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 dark:border-gray-700 flex-wrap">
                  <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full truncate max-w-[160px]">
                    {isLoading ? "Loading…" : moduleName}
                  </span>
                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs text-gray-600 bg-white border border-gray-200 px-2.5 py-0.5 rounded-full truncate max-w-[160px]">
                    {isLoading ? "…" : topicName}
                  </span>
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                    {groupItems.length} highlight{groupItems.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* ── All highlights for this topic ── */}
                <div className="divide-y divide-gray-100">
                  {groupItems.map((h) => {
                    const colors = colorMap[h.color] ?? colorMap.yellow;
                    return (
                      <div key={h.id} className={`flex items-start gap-3 px-4 py-3 ${colors.bg}`}>
                        {/* Colour dot */}
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${colors.dot}`} />

                        {/* Text + timestamp */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-relaxed italic">"{h.text}"</p>
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(h.createdAt)}</p>
                        </div>

                        {/* Remove */}
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
                    );
                  })}
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
  const [allProgress, setAllProgress] = useState<TopicProgress[]>([]);
  const [recent, setRecent] = useState<TopicProgress[]>([]);
  const [progressPage, setProgressPage] = useState(0);
  const [progressHasMore, setProgressHasMore] = useState(false);
  const [progressLoadingMore, setProgressLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      getAllModulesProgress(userId),
      getProgressPaginated(userId, 0, 10),
    ]).then(([all, { progress, hasMore }]) => {
      setAllProgress(all);
      setRecent(progress);
      setProgressHasMore(hasMore);
      setProgressPage(0);
      setLoading(false);
    });
  }, [userId]);

  const handleLoadMoreProgress = async () => {
    if (!userId || progressLoadingMore) return;
    setProgressLoadingMore(true);
    const next = progressPage + 1;
    const { progress: more, hasMore } = await getProgressPaginated(userId, next, 10);
    setRecent((prev) => [...prev, ...more]);
    setProgressHasMore(hasMore);
    setProgressPage(next);
    setProgressLoadingMore(false);
  };

  // Completed topic count per module (across ALL progress, not just the 10 shown)
  const completedPerModule = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of allProgress) map[p.module_id] = (map[p.module_id] || 0) + 1;
    return map;
  }, [allProgress]);

  // Total topic count per module derived from the topicMap
  const totalPerModule = useMemo(() => {
    const map: Record<number, number> = {};
    for (const info of Object.values(topicMap)) {
      map[info.submoduleId] = (map[info.submoduleId] || 0) + 1;
    }
    return map;
  }, [topicMap]);

  if (loading || !dataLoaded) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Progress</h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm py-10 justify-center">
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Loading progress…
        </div>
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Progress</h2>
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Progress</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
          {recent.length} completed
        </span>
      </div>

      <div className="space-y-3">
        {recent.map((p, idx) => {
          const moduleName = submoduleMap[p.module_id] ?? `Module ${p.module_id}`;
          const topicInfo  = topicMap[p.topic_id];
          const topicName  = topicInfo?.topicName ?? `Topic ${p.topic_id}`;

          const completed = completedPerModule[p.module_id] ?? 0;
          const total     = totalPerModule[p.module_id] ?? 0;
          const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div
              key={`${p.topic_id}-${idx}`}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/modules/${p.module_id}`)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && router.push(`/modules/${p.module_id}`)}
              className="cursor-pointer p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
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

                {/* Arrow */}
                <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Module progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{completed}{total > 0 ? `/${total}` : ""} topics completed</span>
                  {total > 0 && <span className="text-xs font-semibold text-purple-600">{pct}%</span>}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: total > 0 ? `${pct}%` : "0%",
                      backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {progressHasMore && (
          <button
            onClick={handleLoadMoreProgress}
            disabled={progressLoadingMore}
            className="w-full py-2.5 text-sm font-semibold text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-50 disabled:opacity-50 transition-colors"
          >
            {progressLoadingMore ? "Loading…" : "Load More Progress"}
          </button>
        )}
      </div>
    </div>
  );
}


const PROFESSION_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher / Educator",
  professional: "Working Professional",
  jobseeker: "Job Seeker",
  other: "Other",
};

// ── My Survey ──────────────────────────────────────────────────────────────────────────────
function MySurvey() {
  const [survey, setSurvey] = useState<SurveyRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserSurvey().then((data) => { setSurvey(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Survey</h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm py-10">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Survey</h2>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-gray-500 font-medium">No survey completed yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Complete the survey to personalise your experience.</p>
          <a
            href="/survey"
            className="px-5 py-2.5 text-white text-sm font-semibold rounded-xl"
            style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)", boxShadow: "0 2px 8px 0 rgba(122,18,250,0.3)" }}
          >
            Take the survey
          </a>
        </div>
      </div>
    );
  }

  const a = survey.answers;

  const professionDetail: { label: string; value: string }[] = [];
  if (survey.profession === "student") {
    if (a.education_level) professionDetail.push({ label: "Education Level", value: a.education_level });
    if (a.field_of_study)  professionDetail.push({ label: "Field of Study",  value: a.field_of_study });
    if (a.career_goal)     professionDetail.push({ label: "Career Goal",     value: a.career_goal });
  } else if (survey.profession === "teacher") {
    if (a.subject_taught)   professionDetail.push({ label: "Subject Taught",  value: a.subject_taught });
    if (a.teaching_level)   professionDetail.push({ label: "Teaching Level",  value: a.teaching_level });
    if (a.experience_years) professionDetail.push({ label: "Experience",      value: a.experience_years });
  } else if (survey.profession === "professional") {
    if (a.industry)     professionDetail.push({ label: "Industry",     value: a.industry });
    if (a.job_role)     professionDetail.push({ label: "Role / Title", value: a.job_role });
    if (a.platform_use) professionDetail.push({ label: "Using for",   value: a.platform_use });
  } else if (survey.profession === "jobseeker") {
    if (a.target_role)     professionDetail.push({ label: "Target Role",     value: a.target_role });
    if (a.education_level) professionDetail.push({ label: "Education Level", value: a.education_level });
  } else if (a.other_description) {
    professionDetail.push({ label: "About you", value: a.other_description });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Survey</h2>

      {/* Profession card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6" style={{ border: "1px solid rgba(140,140,170,0.18)", boxShadow: "0 2px 12px 0 rgba(124,58,237,0.06)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7a12fa22, #b614ef22)" }}>
            <svg className="w-5 h-5" style={{ color: "#7a12fa" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Profession</p>
            <p className="text-base font-bold text-gray-900">{PROFESSION_LABELS[survey.profession] || survey.profession}</p>
          </div>
        </div>
        {professionDetail.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            {professionDetail.map((item) => (
              <div key={item.label} className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Topics card */}
      {(a.topics_interested || []).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6" style={{ border: "1px solid rgba(140,140,170,0.18)", boxShadow: "0 2px 12px 0 rgba(124,58,237,0.06)" }}>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Topics Interested In</p>
          <div className="flex flex-wrap gap-2">
            {(a.topics_interested || []).map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Learning preferences card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6" style={{ border: "1px solid rgba(140,140,170,0.18)", boxShadow: "0 2px 12px 0 rgba(124,58,237,0.06)" }}>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Learning Preferences</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {a.weekly_hours && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Time per week</p>
              <p className="text-sm font-semibold text-gray-800">{a.weekly_hours}</p>
            </div>
          )}
          {a.primary_goal && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Primary Goal</p>
              <p className="text-sm font-semibold text-gray-800">{a.primary_goal}</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Submitted on {new Date(survey.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}

// ── My Projects ────────────────────────────────────────────────────────────────
function MyProjects() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Projects</h2>
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

// ── Module group type for MyDownloads ─────────────────────────────────────────
interface DownloadModuleGroup {
  moduleName: string;
  submoduleId?: number;
  files: DownloadRecord[];
}

function groupDownloadsByModule(records: DownloadRecord[]): DownloadModuleGroup[] {
  const map = new Map<string, DownloadModuleGroup>();
  for (const d of records) {
    if (!map.has(d.moduleName)) {
      map.set(d.moduleName, { moduleName: d.moduleName, submoduleId: d.submoduleId, files: [] });
    }
    map.get(d.moduleName)!.files.push(d);
  }
  return Array.from(map.values());
}

// ── My Downloads ───────────────────────────────────────────────────────────────
function MyDownloads() {
  const { user } = useAnnotation();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [redownloadingId, setRedownloadingId] = useState<string | null>(null);
  const [removingModule, setRemovingModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Load downloads from Supabase (or localStorage fallback) when user changes
  useEffect(() => {
    if (!user?.id) { setDownloads([]); setLoading(false); return; }
    setLoading(true);
    loadDownloads(user.id).then((records) => {
      setDownloads(
        [...records].sort(
          (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
        )
      );
      setLoading(false);
    });
  }, [user?.id]);

  const handleRemoveFile = async (id: string) => {
    if (!user?.id) return;
    await removeDownload(user.id, id);
    logAudit({ action: "download_removed", category: "download", entity_id: id });
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  const handleRemoveModule = async (group: DownloadModuleGroup) => {
    if (!user?.id) return;
    setRemovingModule(group.moduleName);
    await removeModuleDownloads(user.id, group.moduleName, group.submoduleId);
    logAudit({ action: "module_downloads_cleared", category: "download", metadata: { moduleName: group.moduleName } });
    setDownloads((prev) => prev.filter((d) => d.moduleName !== group.moduleName));
    setRemovingModule(null);
  };

  const handleRedownload = (d: DownloadRecord) => {
    if (!d.content) return;
    const mimeType = d.fileType === "html" ? "text/html" : "text/plain";
    const blob = new Blob([d.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = d.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Brief visual feedback
    setRedownloadingId(d.id);
    setTimeout(() => setRedownloadingId(null), 2000);
  };

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  const groups = groupDownloadsByModule(downloads);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Downloads</h2>
        {downloads.length > 0 && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
            {groups.length} module{groups.length !== 1 ? "s" : ""} · {downloads.length} file{downloads.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-20 justify-center">
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          Loading downloads…
        </div>
      ) : downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <p className="text-gray-500 font-medium">No downloads yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Open any module topic and click <strong>Download</strong> on a reference material.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedModules.has(group.moduleName);
            const isRemoving = removingModule === group.moduleName;
            return (
              <div key={group.moduleName} className="rounded-xl border border-gray-200 overflow-hidden">
                {/* Module header row */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <button
                    onClick={() => toggleModule(group.moduleName)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{group.moduleName}</p>
                      <p className="text-xs text-gray-400">{group.files.length} file{group.files.length !== 1 ? "s" : ""}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Remove entire module button */}
                  <button
                    onClick={() => handleRemoveModule(group)}
                    disabled={isRemoving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove entire module from downloads"
                  >
                    {isRemoving ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Remove module
                  </button>
                </div>

                {/* Expanded file list */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {group.files.map((d) => {
                      const isDone = redownloadingId === d.id;
                      return (
                        <div key={d.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{d.topicName}</p>
                            <p className="text-xs text-gray-400">{d.fileName} · {timeAgo(d.downloadedAt)}</p>
                          </div>
                          {/* Re-download button */}
                          <button
                            onClick={() => d.content ? handleRedownload(d) : undefined}
                            disabled={!d.content}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex-shrink-0 border ${
                              !d.content
                                ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-50"
                                : isDone
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                            }`}
                            title={d.content ? "Download file" : "Content not available"}
                          >
                            {isDone ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                          </button>
                          {/* Remove single file */}
                          <button
                            onClick={() => handleRemoveFile(d.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Remove this file"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── My Bookmarks ───────────────────────────────────────────────────────────────
function MyBookmarks({ userId }: { userId: string | undefined }) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);

  useEffect(() => {
    if (!userId) { setBookmarks([]); return; }
    loadBookmarks(userId).then((records) => {
      setBookmarks(
        records.sort(
          (a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime()
        )
      );
    });
  }, [userId]);

  const moduleBookmarks = bookmarks.filter((b) => b.type === "module");
  const topicBookmarks  = bookmarks.filter((b) => b.type === "topic");

  const handleRemove = async (bookmarkId: string) => {
    if (!userId) return;
    await removeBookmark(userId, bookmarkId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  };

  if (bookmarks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Bookmarks</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookmarkHeart size={64} className="text-gray-300 mb-4 opacity-40" />
          <p className="text-gray-500 font-medium">No bookmarks yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Click the bookmark icon on any module or topic to save it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Bookmarks</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
          {bookmarks.length} saved
        </span>
      </div>

      {/* ── Module Bookmarks ── */}
      {moduleBookmarks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Modules
            <span className="text-xs font-medium text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full normal-case tracking-normal ml-1">
              {moduleBookmarks.length}
            </span>
          </h3>
          {moduleBookmarks.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-200 transition-colors group"
            >
              {/* Thumbnail */}
              {b.moduleImageUrl ? (
                <img
                  src={b.moduleImageUrl}
                  alt={b.moduleName}
                  className="w-16 h-11 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                />
              ) : (
                <div className="w-16 h-11 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{b.moduleName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(b.bookmarkedAt)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => router.push(`/modules/${b.moduleId}`)}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => handleRemove(b.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove bookmark"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Topic Bookmarks ── */}
      {topicBookmarks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Topics
            <span className="text-xs font-medium text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full normal-case tracking-normal ml-1">
              {topicBookmarks.length}
            </span>
          </h3>
          {topicBookmarks.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-purple-200 transition-colors"
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                <BookmarkHeart filled size={18} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-purple-600 truncate">{b.moduleName}</p>
                <p className="text-sm font-medium text-gray-800 truncate">{b.topicName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(b.bookmarkedAt)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => router.push(`/modules/${b.moduleId}`)}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => handleRemove(b.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove bookmark"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notion sync badge (shared) ─────────────────────────────────────────────────
function NotionBadge({ synced }: { synced: boolean }) {
  return synced ? (
    <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>
      </svg>
      Synced
    </span>
  ) : (
    <span className="text-[10px] text-gray-400">Not synced</span>
  );
}

// ── My Notes ──────────────────────────────────────────────────────────────────
function MyNotes({ userId }: { userId: string | undefined }) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [notesPage, setNotesPage] = useState(0);
  const [notesHasMore, setNotesHasMore] = useState(false);
  const [notesLoadingMore, setNotesLoadingMore] = useState(false);
  const [summaries, setSummaries] = useState<SummaryRecord[]>([]);
  const [summariesPage, setSummariesPage] = useState(0);
  const [summariesHasMore, setSummariesHasMore] = useState(false);
  const [summariesLoadingMore, setSummariesLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [deletingSummaryKey, setDeletingSummaryKey] = useState<string | null>(null);
  const [deletedNotes, setDeletedNotes] = useState<NoteRecord[]>([]);
  const [deletedSummaries, setDeletedSummaries] = useState<SummaryRecord[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    if (!userId) { setNotes([]); setSummaries([]); setLoading(false); return; }
    Promise.all([
      getNotesPaginated(userId, 0, 10),
      getDeletedNotes(userId),
      getSummariesPaginated(userId, 0, 10),
      getDeletedSummaries(userId),
    ]).then(([{ notes: firstNotes, hasMore: notesMore }, trashNotes, { summaries: firstSummaries, hasMore: summariesMore }, trashSummaries]) => {
      setNotes(firstNotes);
      setNotesHasMore(notesMore);
      setNotesPage(0);
      setSummaries(firstSummaries);
      setSummariesHasMore(summariesMore);
      setSummariesPage(0);
      setDeletedNotes(trashNotes);
      setDeletedSummaries(trashSummaries);
      setLoading(false);
    });
  }, [userId]);

  const handleLoadMoreNotes = async () => {
    if (!userId || notesLoadingMore) return;
    setNotesLoadingMore(true);
    const next = notesPage + 1;
    const { notes: more, hasMore } = await getNotesPaginated(userId, next, 10);
    setNotes((prev) => [...prev, ...more]);
    setNotesHasMore(hasMore);
    setNotesPage(next);
    setNotesLoadingMore(false);
  };

  const handleLoadMoreSummaries = async () => {
    if (!userId || summariesLoadingMore) return;
    setSummariesLoadingMore(true);
    const next = summariesPage + 1;
    const { summaries: more, hasMore } = await getSummariesPaginated(userId, next, 10);
    setSummaries((prev) => [...prev, ...more]);
    setSummariesHasMore(hasMore);
    setSummariesPage(next);
    setSummariesLoadingMore(false);
  };

  const handleDeleteNote = async (topicId: number) => {
    if (!userId) return;
    const confirmed = window.confirm("Move this note to Recently Deleted?\nYou can restore it any time.");
    if (!confirmed) return;
    setDeletingNoteId(topicId);
    await deleteNote(userId, topicId);
    logAudit({ action: "note_deleted", category: "note", entity_id: String(topicId) });
    const moved = notes.find((n) => n.topicId === topicId);
    setNotes((prev) => prev.filter((n) => n.topicId !== topicId));
    if (moved) setDeletedNotes((prev) => [{ ...moved, deletedAt: new Date().toISOString() }, ...prev]);
    setDeletingNoteId(null);
  };

  const handleDeleteSummary = async (topicId: number, level: string) => {
    if (!userId) return;
    const confirmed = window.confirm("Move this summary to Recently Deleted?\nYou can restore it any time.");
    if (!confirmed) return;
    const key = `${topicId}:${level}`;
    setDeletingSummaryKey(key);
    await deleteSummary(userId, topicId, level);
    logAudit({ action: "summary_deleted", category: "summary", entity_id: String(topicId), metadata: { level } });
    const moved = summaries.find((s) => s.topicId === topicId && s.level === level);
    setSummaries((prev) => prev.filter((s) => !(s.topicId === topicId && s.level === level)));
    if (moved) setDeletedSummaries((prev) => [{ ...moved, deletedAt: new Date().toISOString() }, ...prev]);
    setDeletingSummaryKey(null);
  };

  const handleRestoreNote = async (topicId: number) => {
    if (!userId) return;
    await restoreNote(userId, topicId);
    logAudit({ action: "note_restored", category: "note", entity_id: String(topicId) });
    const restored = deletedNotes.find((n) => n.topicId === topicId);
    setDeletedNotes((prev) => prev.filter((n) => n.topicId !== topicId));
    if (restored) setNotes((prev) => [{ ...restored, deletedAt: undefined }, ...prev]);
  };

  const handleRestoreSummary = async (topicId: number, level: string) => {
    if (!userId) return;
    await restoreSummary(userId, topicId, level);
    logAudit({ action: "summary_restored", category: "summary", entity_id: String(topicId), metadata: { level } });
    const restored = deletedSummaries.find((s) => s.topicId === topicId && s.level === level);
    setDeletedSummaries((prev) => prev.filter((s) => !(s.topicId === topicId && s.level === level)));
    if (restored) setSummaries((prev) => [{ ...restored, deletedAt: undefined }, ...prev]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Notes</h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm py-20 justify-center">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  const total = notes.length + summaries.length;

  if (total === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Notes</h2>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="text-gray-500 font-medium">No notes or summaries yet</p>
          <p className="text-gray-400 text-sm mt-1">Click &quot;Take Notes&quot; or &quot;AI Summary&quot; on any topic to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Notes</h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
          {total} item{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Manual notes ── */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Notes
            <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full normal-case tracking-normal ml-1">
              {notes.length}
            </span>
          </h3>
          {notes.map((note) => (
            <div key={note.topicId} className="rounded-xl border border-amber-100 bg-amber-50/40 overflow-hidden hover:border-amber-200 transition-colors">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <span className="text-xs font-semibold text-amber-700 truncate">{note.topicName}</span>
                {note.moduleName && (
                  <>
                    <span className="text-amber-300 text-xs">·</span>
                    <span className="text-xs text-amber-500 truncate">{note.moduleName}</span>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                  <NotionBadge synced={note.syncedToNotion} />
                  <span className="text-[10px] text-gray-400">{timeAgo(note.updatedAt)}</span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line line-clamp-3 font-mono">
                  {note.content || <span className="text-gray-400 italic">Empty note</span>}
                </p>
              </div>
              <div className="px-4 py-2 border-t border-amber-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400">{note.content.length} characters · Auto-saved</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => note.moduleId && router.push(`/modules/${note.moduleId}`)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 hover:bg-amber-200 rounded-lg transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.topicId)}
                    disabled={deletingNoteId === note.topicId}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete note"
                  >
                    {deletingNoteId === note.topicId ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {notesHasMore && (
            <button
              onClick={handleLoadMoreNotes}
              disabled={notesLoadingMore}
              className="w-full py-2.5 text-sm font-semibold text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-colors"
            >
              {notesLoadingMore ? "Loading…" : "Load More Notes"}
            </button>
          )}
        </div>
      )}

      {/* ── AI Summaries ── */}
      {summaries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Summaries
            <span className="text-xs font-medium text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full normal-case tracking-normal ml-1">
              {summaries.length}
            </span>
          </h3>
          {summaries.map((s) => {
            const key = `${s.topicId}:${s.level}`;
            const levelColors: Record<string, string> = {
              "Professional English": "text-blue-600 bg-blue-50 border-blue-200",
              "Simple English":       "text-green-600 bg-green-50 border-green-200",
              "Basic English":        "text-orange-600 bg-orange-50 border-orange-200",
            };
            const levelColor = levelColors[s.level] ?? "text-purple-600 bg-purple-50 border-purple-200";
            return (
              <div key={key} className="rounded-xl border border-purple-100 bg-purple-50/30 overflow-hidden hover:border-purple-200 transition-colors">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 border-b border-purple-100">
                  <svg className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-xs font-semibold text-purple-700 truncate">{s.topicName}</span>
                  {s.moduleName && (
                    <>
                      <span className="text-purple-300 text-xs">·</span>
                      <span className="text-xs text-purple-500 truncate">{s.moduleName}</span>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${levelColor}`}>{s.level}</span>
                    <NotionBadge synced={s.syncedToNotion} />
                    <span className="text-[10px] text-gray-400">{timeAgo(s.updatedAt)}</span>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line line-clamp-4">
                    {s.content}
                  </p>
                </div>
                <div className="px-4 py-2 border-t border-purple-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400">{s.format} format · AI generated</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => s.moduleId && router.push(`/modules/${s.moduleId}`)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200 hover:bg-purple-200 rounded-lg transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteSummary(s.topicId, s.level)}
                      disabled={deletingSummaryKey === key}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete summary"
                    >
                      {deletingSummaryKey === key ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {summariesHasMore && (
            <button
              onClick={handleLoadMoreSummaries}
              disabled={summariesLoadingMore}
              className="w-full py-2.5 text-sm font-semibold text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              {summariesLoadingMore ? "Loading…" : "Load More Summaries"}
            </button>
          )}
        </div>
      )}

      {/* ── Recently Deleted ── */}
      {(deletedNotes.length > 0 || deletedSummaries.length > 0) && (
        <div className="mt-4 border border-red-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTrash((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Recently Deleted ({deletedNotes.length + deletedSummaries.length})
            </span>
            <span>{showTrash ? "▲" : "▼"}</span>
          </button>
          {showTrash && (
            <div className="divide-y divide-red-50 bg-white">
              {deletedNotes.map((note) => (
                <div key={note.topicId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{note.topicName}</p>
                    <p className="text-xs text-gray-400">Note · {note.moduleName ?? "No module"}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreNote(note.topicId)}
                    className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {deletedSummaries.map((s) => (
                <div key={`${s.topicId}:${s.level}`} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{s.topicName}</p>
                    <p className="text-xs text-gray-400">Summary · {s.level}</p>
                  </div>
                  <button
                    onClick={() => handleRestoreSummary(s.topicId, s.level)}
                    className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Profile Page Inner ─────────────────────────────────────────────────────────
function ProfilePageInner() {
  const { user, isLoggedIn, logout } = useAnnotation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as Tab) || "account";

  // Avatar URL for the sidebar/mobile card — read from localStorage instantly
  const [sidebarAvatar, setSidebarAvatar] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("edu_avatar_url") : null
  );

  // Keep sidebar avatar in sync when upload happens (same tab) or when user loads
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail?.url;
      if (url) setSidebarAvatar(url);
    };
    window.addEventListener("edu:avatar-changed", handler);
    return () => window.removeEventListener("edu:avatar-changed", handler);
  }, []);

  // Shared topic/submodule data (fetched once, used by highlights + progress)
  const { topicMap, submoduleMap, dataLoaded } = useTopicData();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
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
      case "account":    return <AccountDetails onAvatarChange={setSidebarAvatar} />;
      case "highlights": return <MyHighlights topicMap={topicMap} dataLoaded={dataLoaded} />;
      case "progress":   return <MyProgress userId={user?.id} topicMap={topicMap} submoduleMap={submoduleMap} dataLoaded={dataLoaded} />;
      case "projects":   return <MyProjects />;
      case "downloads":  return <MyDownloads />;
      case "survey":     return <MySurvey />;
      case "bookmarks":  return <MyBookmarks userId={user?.id} />;
      case "notes":      return <MyNotes userId={user?.id} />;
      default:           return <AccountDetails />;
    }
  };

  const handleLogout = () => { logout(); router.push("/"); };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top bar ── */}
      <header className="w-full bg-white dark:bg-[#0d0d1a] border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Back link */}
          <Link href="/" className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <img src="/logo.svg" alt="Logo" className="w-5 h-5 hidden sm:block" />
            <span className="text-sm font-semibold hidden sm:inline">Back to Home</span>
            <span className="text-sm font-semibold sm:hidden">Back</span>
          </Link>

          <span className="text-sm font-semibold text-gray-900">My Profile</span>

          {/* Desktop: invisible spacer | Mobile: logout button */}
          <div className="flex justify-end w-20 sm:w-28">
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile: user card + horizontal tab strip ── */}
      <div className="md:hidden bg-white border-b border-gray-200">
        {/* User card */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="relative w-10 h-10 flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center text-white text-base font-bold"
              style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
            >
              {!sidebarAvatar ? initial : null}
            </div>
            {sidebarAvatar && (
              <Image
                src={sidebarAvatar}
                alt={user?.name || "User"}
                fill
                unoptimized
                className="rounded-full object-cover"
                onError={() => setSidebarAvatar(null)}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Scrollable horizontal tabs */}
        <nav className="flex overflow-x-auto border-t border-gray-100" style={{ scrollbarWidth: "none" }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/profile?tab=${tab.id}`}
                className={`flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium flex-shrink-0 border-b-2 transition-colors ${
                  isActive
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className={isActive ? "text-purple-600" : "text-gray-400"}>{tab.icon}</span>
                <span>{tab.label.replace("My ", "")}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Page body ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="md:flex md:gap-6">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 flex-shrink-0">
                    <div
                      className="absolute inset-0 rounded-full flex items-center justify-center text-white text-base font-bold"
                      style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
                    >
                      {!sidebarAvatar ? initial : null}
                    </div>
                    {sidebarAvatar && (
                      <Image
                        src={sidebarAvatar}
                        alt={user?.name || "User"}
                        fill
                        unoptimized
                        className="rounded-full object-cover"
                        onError={() => setSidebarAvatar(null)}
                      />
                    )}
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

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 min-h-[500px]">
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
