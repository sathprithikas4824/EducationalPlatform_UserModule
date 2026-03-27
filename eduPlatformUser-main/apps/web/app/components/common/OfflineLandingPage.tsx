"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadDownloads, type DownloadRecord } from "../../lib/downloads";
import { getLastUserId } from "../../lib/supabase";
import { useAnnotation } from "./AnnotationProvider";
import ThemeToggle from "./ThemeToggle";

// ── Wifi Off Icon ──────────────────────────────────────────────────────────────
const WifiOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const BookIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

// ── Group downloads by submodule ───────────────────────────────────────────────
interface ModuleGroup {
  submoduleId: number | null;
  moduleName: string;
  topics: DownloadRecord[];
}

function groupByModule(downloads: DownloadRecord[]): ModuleGroup[] {
  const map = new Map<string, ModuleGroup>();
  for (const d of downloads) {
    const key = d.submoduleId != null ? String(d.submoduleId) : d.moduleName;
    if (!map.has(key)) {
      map.set(key, {
        submoduleId: d.submoduleId ?? null,
        moduleName: d.moduleName,
        topics: [],
      });
    }
    map.get(key)!.topics.push(d);
  }
  return Array.from(map.values());
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function OfflineLandingPage() {
  const router = useRouter();
  const { user } = useAnnotation();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = user?.id ?? getLastUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    loadDownloads(userId)
      .then(setDownloads)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const groups = groupByModule(downloads);
  const pillStyle = {
    backgroundColor: "var(--pill-bg)",
    borderColor: "var(--pill-border)",
    boxShadow: "var(--pill-shadow)",
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0d1a] transition-colors duration-300">
      {/* ── Minimal Navbar ── */}
      <header className="w-full sticky top-0 z-50 bg-transparent py-3 jakarta-font">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div
              className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
              style={pillStyle}
            >
              <Link href="/" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200">
                <img src="/logo.svg" alt="Logo" className="w-5 h-5 object-contain" />
                <span className="text-gray-900 dark:text-gray-100">Logo</span>
              </Link>
            </div>

            {/* Offline Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <span className="text-red-500 dark:text-red-400">
                <WifiOffIcon />
              </span>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 hidden sm:block">
                You're offline
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center px-2 py-2 rounded-2xl border backdrop-blur-md"
                style={pillStyle}
              >
                <ThemeToggle />
              </div>
              {user ? (
                <button
                  onClick={() => router.push("/profile")}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-2xl border backdrop-blur-md transition-all"
                  style={pillStyle}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
                  >
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[80px] truncate hidden sm:block">{user.name}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border rounded-2xl backdrop-blur-md transition-all"
                  style={pillStyle}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* ── Offline Hero ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 text-center">
        {/* Offline status pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">Offline Mode</span>
        </div>

        <h1 className="jakarta-font text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          You're <span className="text-red-500">offline</span> right now
        </h1>

        <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-6">
          No internet connection detected. You can still read any content you
          downloaded while online. Connect to the internet to access all modules.
        </p>

        {/* Info cards */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: "📥", label: "Downloaded content available" },
            { icon: "📖", label: "Read topics offline" },
            { icon: "🔄", label: "Sync progress when back online" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium text-gray-700 dark:text-gray-300"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--card-border)",
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Try again */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
          </svg>
          Try reconnecting
        </button>
      </div>

      {/* ── Downloads Section ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="jakarta-font text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Downloaded <span className="text-purple-600">Content</span>
          </h2>
          {!loading && downloads.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {downloads.length} file{downloads.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          /* Skeleton */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border p-4 animate-pulse"
                style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
              </div>
            ))}
          </div>
        ) : downloads.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5 text-gray-400 dark:text-gray-600">
              <BookIcon />
            </div>
            <h3 className="jakarta-font text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              No downloaded content
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs leading-relaxed">
              You haven't downloaded anything yet. Go online, open a module, and
              use the download button on any topic to save it for offline reading.
            </p>
          </div>
        ) : (
          /* Module group cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <ModuleGroupCard key={group.submoduleId ?? group.moduleName} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Module Group Card ──────────────────────────────────────────────────────────
function ModuleGroupCard({ group }: { group: ModuleGroup }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const canNavigate = group.submoduleId != null;

  const handleCardClick = () => {
    if (canNavigate) {
      router.push(`/modules/${group.submoduleId}`);
    } else {
      setExpanded((v) => !v);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group rounded-2xl border cursor-pointer transition-all duration-300 hover:border-purple-400 dark:hover:border-purple-500 overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--pill-shadow)",
      }}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Module color dot */}
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white"
              style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
            >
              <DownloadIcon />
            </div>
            <div className="min-w-0">
              <h3 className="jakarta-font text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                {group.moduleName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {group.topics.length} topic{group.topics.length !== 1 ? "s" : ""} downloaded
              </p>
            </div>
          </div>

          {/* Navigate arrow or expand toggle */}
          <div className="flex-shrink-0 mt-0.5">
            {canNavigate ? (
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>

        {/* Topic list preview (first 2 always visible) */}
        <div className="space-y-1.5">
          {group.topics.slice(0, expanded ? group.topics.length : 2).map((topic) => (
            <TopicRow key={topic.id} topic={topic} submoduleId={group.submoduleId} />
          ))}
        </div>

        {/* Collapsed: show "N more" */}
        {!expanded && group.topics.length > 2 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
          >
            +{group.topics.length - 2} more topic{group.topics.length - 2 !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 border-t flex items-center justify-between"
        style={{ borderColor: "var(--card-border)", backgroundColor: "var(--pill-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Last saved: {new Date(group.topics[0].downloadedAt).toLocaleDateString()}
        </span>
        {canNavigate && (
          <button
            onClick={() => router.push(`/modules/${group.submoduleId}`)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white transition-all active:scale-95"
            style={{ background: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
          >
            Open module
          </button>
        )}
      </div>
    </div>
  );
}

// ── Topic Row ──────────────────────────────────────────────────────────────────
function TopicRow({ topic, submoduleId }: { topic: DownloadRecord; submoduleId: number | null }) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (submoduleId != null) {
      router.push(`/modules/${submoduleId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
      <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
        {topic.topicName}
      </span>
      <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">
        {topic.fileType}
      </span>
    </div>
  );
}
