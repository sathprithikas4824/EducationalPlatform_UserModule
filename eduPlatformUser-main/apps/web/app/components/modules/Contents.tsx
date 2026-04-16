"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowRight, ArrowDown } from "../common/icons";
import { Highlightable } from "../common/Highlightable";
import { useAnnotation } from "../common/AnnotationProvider";
import { supabase, markTopicCompleted, getCompletedTopics, resetModuleProgress, resetTopicProgress, saveTopicScrollPosition, getTopicScrollPosition, clearModuleScrollPositions, getLastUserId, getDeviceId } from "../../lib/supabase";
import { cachedFetch } from "../../lib/apiCache";
import { saveDownload } from "../../lib/downloads";
import { loadBookmarks, toggleBookmark } from "../../lib/bookmarks";
import { BookmarkHeart } from "../common/icons/BookmarkHeart";

const BACKEND_URL = "https://educationalplatform-usermodule-2.onrender.com";

// Backend response interfaces
interface Topic {
  topic_id: number;
  submodule_id: number;
  name: string;
  title: string | null;
  description: string | null;
  content: string | null;
  module_id: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface SubModuleData {
  submodule_id: number;
  module_id: number;
  category_id: number;
  name: string;
  description: string | null;
  content: string | null;
  title: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const fuzzyBubblesBoldFont = localFont({
  src: "../../fonts/FuzzyBubbles-Bold.ttf",
  display: "swap",
  variable: "--font-fuzzy-bubbles-bold",
});

interface SidebarTopic {
  id: string;
  title: string;
  status: "completed" | "current" | "locked" | "available";
}

interface SidebarModule {
  id: string;
  submoduleId: number;
  title: string;
  expanded: boolean;
  topics: SidebarTopic[];
  topicsLoaded: boolean;
}

interface ContentsProps {
  submoduleId: number;
}

// Skeleton components for loading state
const SidebarSkeleton: React.FC = () => (
  <div className="bg-[#d4d4d4] dark:bg-gray-800 rounded-2xl lg:rounded-3xl p-3 space-y-2 max-w-[300px] mx-auto lg:max-w-none animate-pulse">
    <div className="bg-white dark:bg-gray-900 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl lg:rounded-2xl">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
    </div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white dark:bg-gray-900 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl lg:rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 rounded" style={{ width: `${50 + Math.random() * 30}%` }} />
          <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

const ContentSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-6" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
  </div>
);

const HeroSkeleton: React.FC = () => (
  <div className="w-full bg-white dark:bg-[#0d0d1a] py-6 sm:py-8 md:py-12 px-4 sm:px-6 md:px-10">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:gap-12 items-center animate-pulse">
      <div className="w-full max-w-[280px] h-[140px] sm:h-[160px] md:h-[180px] bg-gray-200 dark:bg-gray-700 rounded-2xl md:rounded-3xl flex-shrink-0" />
      <div className="flex-1 w-full space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
    </div>
  </div>
);

const Contents: React.FC<ContentsProps> = ({ submoduleId }) => {
  const { user, getHighlightsForPage } = useAnnotation();
  const [sidebarModules, setSidebarModules] = useState<SidebarModule[]>([]);
  const [currentSubmodule, setCurrentSubmodule] = useState<SubModuleData | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentEndRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const initialScrollRef = useRef(0);
  const [topicProgressMap, setTopicProgressMap] = useState<Record<number, number>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTopicId, setResetTopicId] = useState<number | null>(null);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());
  const [bookmarkedTopicIds, setBookmarkedTopicIds] = useState<Set<number>>(new Set());
  const [moduleDownloadState, setModuleDownloadState] = useState<"idle" | "downloading" | "done" | "needs-login">("idle");
  const [moduleDownloadProgress, setModuleDownloadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Load topic bookmarks when user changes
  useEffect(() => {
    if (!user?.id) { setBookmarkedTopicIds(new Set()); return; }
    loadBookmarks(user.id).then((records) => {
      const topicRecords = records.filter((b) => b.type === "topic");
      setBookmarkedTopicIds(new Set(topicRecords.map((b) => b.topicId as number)));
    });
  }, [user?.id]);

  const handleTopicBookmark = useCallback(async (
    topicId: number,
    topicName: string,
    moduleId: number,
    moduleName: string
  ) => {
    if (!user?.id) return;
    const nowBookmarked = await toggleBookmark(user.id, {
      type: "topic",
      moduleId,
      moduleName,
      topicId,
      topicName,
    });
    setBookmarkedTopicIds((prev) => {
      const next = new Set(prev);
      if (nowBookmarked) next.add(topicId);
      else next.delete(topicId);
      return next;
    });
  }, [user?.id]);

  // Strip HTML tags AND decode entities, preserving paragraph/block-level whitespace
  const stripHtml = (html: string): string => {
    try {
      // Insert newline markers at block-level boundaries before parsing
      const prepared = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6]|li|dt|dd|tr|section|article|header|footer|blockquote|pre)>/gi, "\n\n")
        .replace(/<(p|div|h[1-6]|li|dt|dd|tr|section|article|header|footer|blockquote|pre)[^>]*>/gi, "");
      const doc = new DOMParser().parseFromString(prepared, "text/html");
      return (doc.body.textContent || "")
        .replace(/[ \t]+/g, " ")        // collapse horizontal whitespace only
        .replace(/\n[ \t]+/g, "\n")     // remove leading spaces after newlines
        .replace(/[ \t]+\n/g, "\n")     // remove trailing spaces before newlines
        .replace(/\n{3,}/g, "\n\n")     // max two consecutive blank lines
        .trim();
    } catch {
      return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  };

  // Rewrite relative or localhost src attributes to use the production backend URL.
  // Handles <img>, <video>, <source>, and <iframe> tags.
  const fixMediaUrls = (html: string): string => {
    if (!html) return html;
    const fixSrc = (_match: string, before: string, src: string, after: string): string => {
      // Already an absolute non-localhost URL — leave as-is
      if (/^https?:\/\/(?!localhost)/i.test(src)) return before + src + after;
      // Relative path or localhost URL — prefix with backend URL
      const normalized = src.replace(/^https?:\/\/localhost(:\d+)?/i, "");
      return before + BACKEND_URL + (normalized.startsWith("/") ? "" : "/") + normalized + after;
    };
    return html
      .replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, fixSrc)
      .replace(/(<video[^>]*\ssrc=["'])([^"']+)(["'])/gi, fixSrc)
      .replace(/(<source[^>]*\ssrc=["'])([^"']+)(["'])/gi, fixSrc)
      .replace(/(<iframe[^>]*\ssrc=["'])([^"']+)(["'])/gi, fixSrc);
  };

  // Build a styled HTML document that preserves TipTap rich-text formatting
  const buildHtmlDoc = useCallback((
    docTitle: string,
    bodyHtml: string,
    topicName: string,
    moduleName: string,
    date: string,
    highlightsHtml: string = ""
  ): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle} – ${topicName}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.75;}
    .doc-header{border-bottom:3px solid #4f46e5;padding-bottom:16px;margin-bottom:32px;}
    .doc-header h1{color:#4f46e5;font-size:1.4rem;margin:0 0 6px;}
    .doc-meta{color:#6b7280;font-size:0.85rem;}
    h1,h2,h3,h4,h5,h6{margin-top:1.4em;margin-bottom:0.4em;}
    p{margin:0.6em 0;}
    strong{font-weight:700;}
    em{font-style:italic;}
    u{text-decoration:underline;}
    s{text-decoration:line-through;}
    ul,ol{padding-left:1.8em;margin:0.6em 0;}
    li{margin:0.3em 0;}
    blockquote{border-left:4px solid #e5e7eb;padding:8px 16px;color:#6b7280;margin:1em 0;background:#f9fafb;border-radius:0 8px 8px 0;}
    code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;}
    pre{background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;overflow-x:auto;font-family:monospace;}
    pre code{background:none;padding:0;color:inherit;}
    img{max-width:100%;border-radius:8px;margin:8px 0;display:block;}
    video{max-width:100%;border-radius:8px;margin:8px 0;}
    a{color:#4f46e5;}
    span[data-circle],.circled-text{border:2px solid currentColor;border-radius:50%;padding:2px 6px;display:inline-block;line-height:1;}
    .exercise-block{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:16px 0;}
    .exercise-block h3{color:#374151;margin-top:0;}
    .answer-line{border-bottom:1px solid #d1d5db;margin:10px 0;height:28px;}
    .highlights-section{margin-top:40px;padding-top:24px;border-top:3px solid #f59e0b;}
    .highlights-section h2{color:#b45309;font-size:1.1rem;margin:0 0 16px;}
    .highlight-item{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;border-radius:8px;margin-bottom:10px;border-left:4px solid #f59e0b;}
    .highlight-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;margin-top:4px;}
    .highlight-text{font-size:0.95rem;line-height:1.6;}
    .doc-footer{margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:0.8rem;text-align:center;}
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${docTitle}</h1>
    <div class="doc-meta">Module: ${moduleName} &nbsp;·&nbsp; Topic: ${topicName} &nbsp;·&nbsp; ${date}</div>
  </div>
  <div class="doc-body">${bodyHtml}</div>
  ${highlightsHtml}
  <div class="doc-footer">Downloaded from EduPlatform</div>
</body>
</html>`, []);

  // Build the "Your Highlights" section HTML for a given topic
  const buildHighlightsHtml = useCallback((topicId: number): string => {
    const pageHighlights = getHighlightsForPage(`topic-${topicId}`);
    if (!pageHighlights.length) return "";
    const items = pageHighlights.map((h) => {
      // Use the highlight color with reduced opacity as background
      const bg = h.color ? `${h.color}33` : "#fef08a";
      const border = h.color || "#f59e0b";
      return `<div class="highlight-item" style="background:${bg};border-left-color:${border};">
        <div class="highlight-dot" style="background:${border};"></div>
        <span class="highlight-text">"${h.text.replace(/"/g, "&quot;")}"</span>
      </div>`;
    }).join("\n");
    return `<div class="highlights-section">
  <h2>🖊 Your Highlights (${pageHighlights.length})</h2>
  ${items}
</div>`;
  }, [getHighlightsForPage]);

  const handleDownload = useCallback(
    (materialType: "notes" | "summary" | "exercises") => {
      if (!selectedTopic) return;

      const topicName = selectedTopic.name;
      const moduleName = currentSubmodule?.name || "Module";
      // Use raw HTML (with media URLs fixed) to preserve all TipTap styles
      const titleHtml = selectedTopic.title ? fixMediaUrls(selectedTopic.title) : `<p>${topicName}</p>`;
      const descHtml  = selectedTopic.description ? fixMediaUrls(selectedTopic.description) : "";

      let content = "";
      let fileName = "";
      const safeName = topicName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

      const highlightsHtml = buildHighlightsHtml(selectedTopic.topic_id);

      switch (materialType) {
        case "notes":
          fileName = `${safeName}_Notes.html`;
          content = buildHtmlDoc(
            "📝 Topic Notes",
            `${titleHtml}<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>${descHtml}`,
            topicName, moduleName, date, highlightsHtml
          );
          break;

        case "summary": {
          fileName = `${safeName}_Quick_Reference.html`;
          content = buildHtmlDoc(
            "📋 Quick Reference Guide",
            `<h2 style="color:#4f46e5;">Key Concepts</h2>${descHtml}`,
            topicName, moduleName, date, highlightsHtml
          );
          break;
        }

        case "exercises":
          fileName = `${safeName}_Practice_Exercises.html`;
          content = buildHtmlDoc(
            "✏️ Practice Exercises",
            `<h2>Topic Overview</h2>${titleHtml}
<h2 style="margin-top:32px;">Exercises</h2>
<div class="exercise-block"><h3>Exercise 1 — Review Key Concepts</h3><p>Read through the topic notes and list the main concepts in your own words.</p><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div></div>
<div class="exercise-block"><h3>Exercise 2 — Summarise Without Notes</h3><p>Write a 3–5 sentence summary of this topic without looking at any reference material.</p><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div></div>
<div class="exercise-block"><h3>Exercise 3 — Real-World Application</h3><p>Describe one real-world scenario where you would apply the concepts from this topic.</p><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div></div>
<div class="exercise-block"><h3>Exercise 4 — Self-Assessment Questions</h3><p>Write 3 questions you still have about this topic:</p><p>Q1: <span class="answer-line" style="display:inline-block;width:80%;"></span></p><p>Q2: <span class="answer-line" style="display:inline-block;width:80%;"></span></p><p>Q3: <span class="answer-line" style="display:inline-block;width:80%;"></span></p></div>
<div class="exercise-block"><h3>Exercise 5 — Teach It Back</h3><p>Explain this topic as if teaching it to someone new.</p><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div></div>`,
            topicName, moduleName, date, highlightsHtml
          );
          break;
      }

      // Trigger browser download as HTML
      const blob = new Blob([content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Visual feedback
      setDownloadedSet((prev) => new Set([...prev, materialType]));
      setTimeout(() => {
        setDownloadedSet((prev) => {
          const next = new Set(prev);
          next.delete(materialType);
          return next;
        });
      }, 2000);

      // Persist record so it shows up in Profile → My Downloads
      if (user) {
        saveDownload(user.id, {
          userId: user.id,
          topicId: selectedTopic.topic_id,
          topicName,
          moduleName,
          submoduleId: currentSubmodule?.submodule_id ?? submoduleId,
          fileName,
          fileType: "html",
          content,
        });
      }
    },
    [selectedTopic, currentSubmodule, user, buildHtmlDoc, buildHighlightsHtml, fixMediaUrls]
  );

  // Download all topics in the current module as styled HTML files
  const handleModuleDownload = useCallback(async () => {
    if (!topics.length) return;
    const userId = user?.id ?? getLastUserId();
    if (!userId) {
      setModuleDownloadState("needs-login");
      setTimeout(() => setModuleDownloadState("idle"), 3000);
      return;
    }
    setModuleDownloadState("downloading");
    setModuleDownloadProgress({ current: 0, total: topics.length });

    const moduleName = currentSubmodule?.name || "Module";
    const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      setModuleDownloadProgress({ current: i + 1, total: topics.length });

      const topicName = topic.name;
      const safeName = topicName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const fileName = `${safeName}_Notes.html`;

      // Build a styled HTML file preserving all TipTap rich-text formatting + user highlights
      const titleHtml = topic.title ? fixMediaUrls(topic.title) : `<p>${topicName}</p>`;
      const descHtml  = topic.description ? fixMediaUrls(topic.description) : "";
      const highlightsHtml = buildHighlightsHtml(topic.topic_id);
      const content = buildHtmlDoc(
        "📝 Topic Notes",
        `${titleHtml}<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>${descHtml}`,
        topicName, moduleName, date, highlightsHtml
      );

      await saveDownload(userId, {
        userId,
        topicId: topic.topic_id,
        topicName,
        moduleName,
        submoduleId: currentSubmodule?.submodule_id ?? submoduleId,
        fileName,
        fileType: "html",
        content,
      });
    }

    // Cache locally so this device shows "Downloaded" instantly on next visit
    const deviceId = getDeviceId();
    const flagKey = `edu_module_done_${userId}_${deviceId}_${submoduleId}`;
    try { localStorage.setItem(flagKey, "true"); } catch {}

    // Save to Supabase — one row per (user, module), so ALL devices see "Downloaded" immediately
    if (supabase && user?.id) {
      const sid = currentSubmodule?.submodule_id ?? submoduleId;
      const { error: upsertError } = await supabase
        .from("user_module_downloads")
        .upsert(
          { user_id: userId, submodule_id: sid },
          { onConflict: "user_id,submodule_id" }
        );
      if (upsertError) {
        console.error("[downloads] Failed to sync module download to Supabase:", upsertError.message);
        await supabase
          .from("user_module_downloads")
          .upsert(
            { user_id: userId, submodule_id: sid },
            { onConflict: "user_id,submodule_id" }
          );
      }
    }

    setModuleDownloadState("done");
  }, [user, topics, currentSubmodule, submoduleId, buildHtmlDoc, buildHighlightsHtml, fixMediaUrls]);

  // Mark the currently selected topic as completed in Supabase
  // Only runs for logged-in users — guests cannot track progress
  const markCurrentTopicDone = useCallback(async () => {
    if (!selectedTopic || !user) return;
    const topicKey = `topic-${selectedTopic.topic_id}`;

    // Persist to Supabase
    const subId = currentSubmodule?.submodule_id ?? submoduleId;
    await markTopicCompleted(user.id, selectedTopic.topic_id, subId, true);

    // Update sidebar UI
    setSidebarModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        topics: mod.topics.map((t) =>
          t.id === topicKey ? { ...t, status: "completed" as const } : t
        ),
      }))
    );
  }, [selectedTopic, user, currentSubmodule, submoduleId]);

  // Reset all progress for the current submodule
  const handleResetProgress = useCallback(async () => {
    if (!user) return;
    const subId = currentSubmodule?.submodule_id ?? submoduleId;

    // Clear from Supabase
    await resetModuleProgress(user.id, subId);

    // Clear saved scroll positions for all topics in this module
    clearModuleScrollPositions(user.id, topics.map(t => t.topic_id));

    // Clear in-memory scroll progress
    setTopicProgressMap({});

    // Reset all sidebar topics to "available", mark first as "current"
    setSidebarModules((prev) =>
      prev.map((mod) => ({
        ...mod,
        topics: mod.topics.map((t, i) => ({
          ...t,
          status: i === 0 ? ("current" as const) : ("available" as const),
        })),
      }))
    );

    // Jump back to first topic
    if (topics.length > 0) {
      setSelectedTopic(topics[0]);
    }

    setShowResetConfirm(false);
  }, [user, currentSubmodule, submoduleId, topics]);

  // Reset progress for a single topic
  const handleResetTopicProgress = useCallback(async (topicId: number) => {
    if (!user) return;
    const subId = currentSubmodule?.submodule_id ?? submoduleId;

    // Clear from Supabase
    await resetTopicProgress(user.id, topicId, subId);

    // Clear saved scroll position for this topic
    clearModuleScrollPositions(user.id, [topicId]);

    // Clear in-memory scroll progress for this topic
    setTopicProgressMap(prev => {
      const next = { ...prev };
      delete next[topicId];
      return next;
    });

    // Reset sidebar topic status to "available"
    const topicKey = `topic-${topicId}`;
    setSidebarModules(prev =>
      prev.map(mod => ({
        ...mod,
        topics: mod.topics.map(t =>
          t.id === topicKey ? { ...t, status: "available" as const } : t
        ),
      }))
    );

    setResetTopicId(null);
  }, [user, currentSubmodule, submoduleId]);

  // Auto-mark topic completed when user scrolls to the bottom of content
  useEffect(() => {
    const sentinel = contentEndRef.current;
    if (!sentinel || !selectedTopic) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          markCurrentTopicDone();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedTopic, markCurrentTopicDone]);

  // Reset scroll baseline and download feedback when topic changes
  useEffect(() => {
    initialScrollRef.current = window.scrollY;
    setDownloadedSet(new Set());
  }, [selectedTopic?.topic_id]);

  // Reset module download state when submodule changes
  useEffect(() => {
    setModuleDownloadState("idle");
  }, [submoduleId]);

  // Restore "done" state — runs as soon as user + submoduleId are known (no need to wait for topics)
  useEffect(() => {
    const userId = user?.id ?? getLastUserId();
    if (!userId || !submoduleId) return;

    const deviceId = getDeviceId();
    const flagKey = `edu_module_done_${userId}_${deviceId}_${submoduleId}`;

    // Fast path: localStorage flag set on this device (survives logout)
    try {
      if (localStorage.getItem(flagKey) === "true") {
        setModuleDownloadState("done");
        return;
      }
    } catch {}

    // Cross-device sync: immediately query Supabase so Device 2 shows "Downloaded" right away
    if (!user?.id || !supabase) return;
    supabase
      .from("user_module_downloads")
      .select("id")
      .eq("user_id", userId)
      .eq("submodule_id", submoduleId)
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          console.warn("[downloads] Cross-device check failed:", error.message);
          return;
        }
        if (!data?.length) return;
        setModuleDownloadState("done");
        // Cache locally so next visit (and after logout) is instant — no query needed
        try { localStorage.setItem(flagKey, "true"); } catch {}
      });
  }, [submoduleId, user?.id]);

  // Realtime subscription: instantly update "Downloaded" state on ALL open devices/tabs
  // when any device upserts or deletes a row in user_module_downloads for this submodule
  useEffect(() => {
    if (!supabase || !user?.id || !submoduleId) return;

    const userId = user.id;
    const deviceId = getDeviceId();
    const flagKey = `edu_module_done_${userId}_${deviceId}_${submoduleId}`;

    // Re-query Supabase to get the true current state.
    // Called on initial connect AND every reconnect (mobile drops WebSocket in background).
    const resyncFromDB = () => {
      supabase!
        .from("user_module_downloads")
        .select("id")
        .eq("user_id", userId)
        .eq("submodule_id", submoduleId)
        .limit(1)
        .then(({ data }) => {
          if (data?.length) {
            setModuleDownloadState("done");
            try { localStorage.setItem(flagKey, "true"); } catch {}
          } else {
            setModuleDownloadState("idle");
            try { localStorage.removeItem(flagKey); } catch {}
          }
        });
    };

    const channel = supabase
      // Channel name matches broadcastModuleRemoved() in downloads.ts so broadcast events arrive here
      .channel(`edu_module_badge_${userId}`)
      // ── Broadcast (fast path) ────────────────────────────────────────────────
      // Fires the moment ANY device calls removeModuleDownloads — no Postgres event needed.
      // This is the primary mechanism for instant cross-device badge reset.
      .on("broadcast", { event: "module_removed" }, ({ payload }: { payload: { submodule_id: number } }) => {
        if (payload?.submodule_id !== submoduleId) return;
        setModuleDownloadState("idle");
        try { localStorage.removeItem(flagKey); } catch {}
      })
      // ── Postgres INSERT (backup for "downloaded" from another device) ─────────
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_module_downloads",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { submodule_id: number };
          if (row.submodule_id !== submoduleId) return;
          setModuleDownloadState("done");
          try { localStorage.setItem(flagKey, "true"); } catch {}
        }
      )
      // ── Postgres DELETE (backup for "removed" — requires REPLICA IDENTITY FULL) ─
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "user_module_downloads",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const old = payload.old as { submodule_id: number };
          if (old.submodule_id !== submoduleId) return;
          setModuleDownloadState("idle");
          try { localStorage.removeItem(flagKey); } catch {}
        }
      )
      // ── Reconnect sync ───────────────────────────────────────────────────────
      // Mobile browsers silently kill the WebSocket when the screen locks or the
      // app goes to background. When Supabase reconnects (status → SUBSCRIBED),
      // re-query the DB so any removal that happened while offline is caught.
      // This fires on first connect too, making it the single source of truth
      // for badge state on mount.
      .subscribe((status) => {
        if (status === "SUBSCRIBED") resyncFromDB();
      });

    return () => { supabase.removeChannel(channel); };
  }, [submoduleId, user?.id]);

  // Safety net: re-sync download state whenever this tab/app becomes visible again.
  // Handles three mobile scenarios:
  //   1. visibilitychange — user switches apps or tabs on Android/iOS
  //   2. pageshow (persisted) — iOS Safari restores page from bfcache on back navigation;
  //      React effects do NOT re-run in that case, so we must force a re-check here.
  //   3. focus — fallback for browsers that fire focus instead of visibilitychange
  useEffect(() => {
    if (!supabase || !user?.id || !submoduleId) return;

    const userId = user.id;
    const deviceId = getDeviceId();
    const flagKey = `edu_module_done_${userId}_${deviceId}_${submoduleId}`;

    const resync = () => {
      supabase!
        .from("user_module_downloads")
        .select("id")
        .eq("user_id", userId)
        .eq("submodule_id", submoduleId)
        .limit(1)
        .then(({ data }) => {
          if (data?.length) {
            setModuleDownloadState("done");
            try { localStorage.setItem(flagKey, "true"); } catch {}
          } else {
            setModuleDownloadState("idle");
            try { localStorage.removeItem(flagKey); } catch {}
          }
        });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") resync();
    };

    // iOS Safari bfcache: pageshow fires when page is restored from cache.
    // persisted=true means the page was NOT freshly loaded — effects didn't re-run.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resync();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", resync);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", resync);
    };
  }, [submoduleId, user?.id]);

  // Track reading progress via scroll position — guests see 0%, no tracking
  useEffect(() => {
    const contentEl = contentWrapperRef.current;
    if (!contentEl || !selectedTopic || !user) return;

    const calculateProgress = () => {
      const rect = contentEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const initialScroll = initialScrollRef.current;

      // Absolute position of content bottom in document coordinates (constant)
      const contentBottomAbsolute = window.scrollY + rect.bottom;

      // Target scroll: the scrollY where content bottom aligns with viewport bottom
      const targetScroll = contentBottomAbsolute - viewportHeight;

      // Total distance user needs to scroll from their starting position
      const totalDistance = targetScroll - initialScroll;

      const topicId = selectedTopic.topic_id;

      if (totalDistance <= 0) {
        // Content bottom is already visible from the initial position
        setTopicProgressMap(prev =>
          (prev[topicId] || 0) < 100 ? { ...prev, [topicId]: 100 } : prev
        );
        return;
      }

      // How much the user has scrolled from their starting position
      const scrolled = window.scrollY - initialScroll;
      const progress = Math.min(100, Math.max(0, (scrolled / totalDistance) * 100));

      // Only allow progress to increase, never decrease
      setTopicProgressMap(prev => {
        const current = prev[topicId] || 0;
        return progress > current ? { ...prev, [topicId]: progress } : prev;
      });
    };

    // Small delay to let layout settle after topic change
    const timer = setTimeout(calculateProgress, 150);

    window.addEventListener("scroll", calculateProgress, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", calculateProgress);
    };
  }, [selectedTopic, user]);

  // Persist scroll progress to localStorage whenever it changes
  useEffect(() => {
    if (!user || !selectedTopic) return;
    const progress = topicProgressMap[selectedTopic.topic_id];
    if (progress != null && progress > 0) {
      saveTopicScrollPosition(user.id, selectedTopic.topic_id, progress);
    }
  }, [topicProgressMap, selectedTopic, user]);

  // Auto-scroll to saved reading position when returning to a topic
  useEffect(() => {
    if (!user || !selectedTopic) return;
    const contentEl = contentWrapperRef.current;
    if (!contentEl) return;

    const savedProgress = getTopicScrollPosition(user.id, selectedTopic.topic_id);
    if (savedProgress <= 0) return;

    // Restore the in-memory progress map so the sidebar circle shows correctly
    setTopicProgressMap(prev => {
      const current = prev[selectedTopic.topic_id] || 0;
      return savedProgress > current
        ? { ...prev, [selectedTopic.topic_id]: savedProgress }
        : prev;
    });

    // Wait for content to render, then scroll to the saved position
    const timer = setTimeout(() => {
      const rect = contentEl.getBoundingClientRect();
      const contentTopAbsolute = window.scrollY + rect.top;
      const contentHeight = rect.height;
      const viewportHeight = window.innerHeight;

      // Total scrollable distance for this content
      const totalDistance = (contentTopAbsolute + contentHeight) - viewportHeight - contentTopAbsolute;
      if (totalDistance <= 0) return;

      const targetScroll = contentTopAbsolute + (savedProgress / 100) * totalDistance;
      window.scrollTo({ top: targetScroll, behavior: "smooth" });

      // Update the baseline so further scroll tracking works correctly
      initialScrollRef.current = targetScroll;
    }, 300);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic?.topic_id, user]);

  // Fetch topics for a specific submodule (with cache)
  const fetchTopicsForSubmodule = useCallback(async (subId: number): Promise<Topic[]> => {
    try {
      return await cachedFetch<Topic[]>(
        `${BACKEND_URL}/api/topics/${subId}`,
        `topics_${subId}`
      );
    } catch {
      return [];
    }
  }, []);

  // Apply fresh topic data to state — called both on initial load and on background revalidation
  const applyTopicData = useCallback((
    topicsData: Topic[],
    current: SubModuleData,
    completedTopicIds: number[],
    cancelled: { value: boolean },
    preserveSelection: boolean
  ) => {
    if (cancelled.value) return;

    setTopics(topicsData);
    setCurrentSubmodule(current);

    const firstUncompletedIndex = topicsData.findIndex(
      (topic) => !completedTopicIds.includes(topic.topic_id)
    );

    const currentTopics: SidebarTopic[] = topicsData.map((topic, index) => ({
      id: `topic-${topic.topic_id}`,
      title: topic.name,
      status: completedTopicIds.includes(topic.topic_id)
        ? "completed"
        : index === firstUncompletedIndex
          ? "current"
          : ("available" as const),
    }));

    setSidebarModules([{
      id: String(current.submodule_id),
      submoduleId: current.submodule_id,
      title: current.name,
      expanded: true,
      topics: currentTopics,
      topicsLoaded: true,
    }]);

    if (!preserveSelection && topicsData.length > 0) {
      const startIndex = firstUncompletedIndex >= 0 ? firstUncompletedIndex : 0;
      setSelectedTopic(topicsData[startIndex]);
    } else if (preserveSelection) {
      // Refresh the currently-selected topic so new images/videos appear
      setSelectedTopic((prev) => {
        if (!prev) return topicsData[0] ?? null;
        const updated = topicsData.find((t) => t.topic_id === prev.topic_id);
        return updated ?? prev;
      });
    }
  }, []);

  // Initial data fetch with retry for backend cold starts
  useEffect(() => {
    const cancelled = { value: false };

    const fetchData = async (retryCount = 0) => {
      const MAX_RETRIES = 2;

      try {
        setLoading(true);
        setError(null);

        const progressUserId = user?.id ?? getLastUserId();

        // cachedFetch returns immediately (from cache if available) and also calls
        // onRefresh when fresh data arrives — so images/videos added by admin show
        // without requiring a manual page reload.
        const [rawSubmodules, topicsData] = await Promise.all([
          cachedFetch<SubModuleData[] | { data?: SubModuleData[] }>(
            `${BACKEND_URL}/api/submodules`,
            "all_submodules",
            (freshRaw) => {
              if (cancelled.value) return;
              const freshAll: SubModuleData[] = Array.isArray(freshRaw)
                ? freshRaw
                : (freshRaw as { data?: SubModuleData[] }).data || [];
              const freshCurrent = freshAll.find((s) => s.submodule_id === submoduleId);
              if (freshCurrent) setCurrentSubmodule(freshCurrent);
            }
          ),
          cachedFetch<Topic[]>(
            `${BACKEND_URL}/api/topics/${submoduleId}`,
            `topics_${submoduleId}`,
            async (freshTopics) => {
              if (cancelled.value) return;
              const freshCompleted = progressUserId
                ? await getCompletedTopics(progressUserId, submoduleId)
                : [];
              const freshSubmodules = await cachedFetch<SubModuleData[] | { data?: SubModuleData[] }>(
                `${BACKEND_URL}/api/submodules`,
                "all_submodules"
              );
              const freshAll: SubModuleData[] = Array.isArray(freshSubmodules)
                ? freshSubmodules
                : (freshSubmodules as { data?: SubModuleData[] }).data || [];
              const freshCurrent = freshAll.find((s) => s.submodule_id === submoduleId);
              if (freshCurrent) {
                applyTopicData(freshTopics, freshCurrent, freshCompleted, cancelled, true);
              }
            }
          ),
        ]);

        if (cancelled.value) return;

        // Normalize response: handle both array and { data: [...] } formats
        const allSubmodules: SubModuleData[] = Array.isArray(rawSubmodules)
          ? rawSubmodules
          : (rawSubmodules as { data?: SubModuleData[] }).data || [];

        // Find the current submodule
        const current = allSubmodules.find(
          (s) => s.submodule_id === submoduleId
        );

        if (!current) {
          if (allSubmodules.length === 0 && retryCount < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1500 * (retryCount + 1)));
            if (!cancelled.value) return fetchData(retryCount + 1);
            return;
          }
          setError("Submodule not found");
          setLoading(false);
          return;
        }

        const completedTopicIds = progressUserId
          ? await getCompletedTopics(progressUserId, submoduleId)
          : [];

        applyTopicData(topicsData, current, completedTopicIds, cancelled, false);
      } catch (err) {
        if (cancelled.value) return;
        if (retryCount < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1500 * (retryCount + 1)));
          if (!cancelled.value) return fetchData(retryCount + 1);
          return;
        }
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching data:", err);
      } finally {
        if (!cancelled.value) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled.value = true; };
  }, [submoduleId, fetchTopicsForSubmodule, user, applyTopicData]);

  // Toggle a sidebar module (expand/collapse) and lazy-load its topics
  const toggleModule = async (moduleId: string) => {
    const mod = sidebarModules.find((m) => m.id === moduleId);
    if (!mod) return;

    // If collapsing, just toggle
    if (mod.expanded) {
      setSidebarModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, expanded: false } : m
        )
      );
      return;
    }

    // If expanding and topics not loaded yet, fetch them
    if (!mod.topicsLoaded) {
      const fetchedTopics = await fetchTopicsForSubmodule(mod.submoduleId);
      const effectiveUserId = user?.id ?? getLastUserId();
      const completedTopicIds = effectiveUserId ? await getCompletedTopics(effectiveUserId, mod.submoduleId) : [];

      const sidebarTopics: SidebarTopic[] = fetchedTopics.map((topic) => ({
        id: `topic-${topic.topic_id}`,
        title: topic.name,
        status: completedTopicIds.includes(topic.topic_id)
          ? "completed"
          : ("available" as const),
      }));

      setSidebarModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, expanded: true, topics: sidebarTopics, topicsLoaded: true }
            : m
        )
      );
    } else {
      setSidebarModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, expanded: true } : m
        )
      );
    }
  };

  // Handle topic selection from sidebar
  const handleTopicClick = async (topicId: string, parentSubmoduleId: number) => {
    const topicIdNum = parseInt(topicId.replace("topic-", ""));

    const topic = topics.find((t) => t.topic_id === topicIdNum);
    if (!topic) return;

    // Clicking the already selected topic → do nothing
    if (selectedTopic?.topic_id === topicIdNum) return;

    setSelectedTopic(topic);

    // Update sidebar: mark clicked topic as "current", keep others as-is
    setSidebarModules((prev) =>
      prev.map((mod) => {
        if (mod.submoduleId === parentSubmoduleId && mod.topics) {
          return {
            ...mod,
            topics: mod.topics.map((t) => {
              // Mark the previously selected topic back to "available" (unless already completed)
              if (t.id === `topic-${selectedTopic?.topic_id}` && t.status !== "completed")
                return { ...t, status: "available" as const };
              // Mark the clicked topic as "current" only if not already completed
              if (t.id === topicId && t.status !== "completed")
                return { ...t, status: "current" as const };
              return t;
            }),
          };
        }
        return mod;
      })
    );
  };

  // Loading state - skeleton UI
  if (loading) {
    return (
      <div
        className={`w-full min-h-screen bg-white dark:bg-[#0d0d1a] jakarta-font ${fuzzyBubblesBoldFont.variable}`}
      >
        {/* Hero Skeleton */}
        <HeroSkeleton />

        {/* Mobile Toggle Placeholder */}
        <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-[#0d0d1a] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
        </div>

        {/* Main Content Skeleton */}
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block w-full lg:w-[220px] xl:w-[250px] bg-white dark:bg-[#0d0d1a] py-4 lg:py-6 px-4 flex-shrink-0 lg:min-h-screen">
            <SidebarSkeleton />
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white dark:bg-[#0d0d1a] dark:bg-[#0d0d1a]">
            <div className="max-w-2xl mx-auto lg:mx-0">
              <ContentSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full min-h-screen bg-white dark:bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-xl text-red-600 mb-2">Error: {error}</p>
          <p className="text-sm text-gray-500 mb-4">The server may be starting up. Please try again.</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              // Clear the stale cache entry and force a fresh fetch
              try { sessionStorage.removeItem("edu_api_all_submodules"); } catch {}
              window.location.reload();
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-screen bg-white dark:bg-[#0d0d1a] jakarta-font ${fuzzyBubblesBoldFont.variable}`}
    >
      {/* Hero Section - Responsive */}
      <div className="w-full bg-white dark:bg-[#0d0d1a] py-6 sm:py-8 md:py-12 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:gap-12 items-center">
          {/* Submodule Hero Image — fetched from backend; falls back to gray placeholder */}
          {currentSubmodule?.image_url ? (
            <img
              src={currentSubmodule.image_url}
              alt={currentSubmodule.name}
              className="w-full max-w-[280px] h-[140px] sm:h-[160px] md:h-[180px] rounded-2xl md:rounded-3xl flex-shrink-0 object-cover"
            />
          ) : (
            <div className="w-full max-w-[280px] h-[140px] sm:h-[160px] md:h-[180px] bg-[#9a9aa3] rounded-2xl md:rounded-3xl flex-shrink-0" />
          )}

          {/* Hero Text Content */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-purple-600 text-sm sm:text-base font-medium mb-2">Education</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-3 sm:mb-5">
              {currentSubmodule?.name}
            </h1>
            {currentSubmodule?.description ? (
              <div
                className="text-purple-600 text-sm sm:text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentSubmodule.description }}
              />
            ) : (
              <p className="text-purple-600 text-sm sm:text-base leading-relaxed">
                Explore the topics below to start learning.
              </p>
            )}

            {/* Download Module Button — shown on all devices once topics are loaded */}
            {topics.length > 0 && (
              <button
                onClick={handleModuleDownload}
                disabled={moduleDownloadState === "downloading"}
                className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  moduleDownloadState === "done"
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : moduleDownloadState === "downloading"
                    ? "bg-purple-50 text-purple-400 border border-purple-200 cursor-not-allowed"
                    : moduleDownloadState === "needs-login"
                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                    : "bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"
                }`}
              >
                {moduleDownloadState === "done" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Module Downloaded ({topics.length} topics)
                  </>
                ) : moduleDownloadState === "downloading" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving {moduleDownloadProgress.current}/{moduleDownloadProgress.total} topics...
                  </>
                ) : moduleDownloadState === "needs-login" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-9V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h3" />
                    </svg>
                    Please log in to download
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Module ({topics.length} topics)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Toggle Button */}
      <div className="lg:hidden sticky top-0 z-20 bg-white dark:bg-[#0d0d1a] border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 text-gray-700 font-medium text-sm"
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${sidebarOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {sidebarOpen ? "Hide Modules" : "Show Modules"}
        </button>
      </div>

      {/* Main Content with Sidebar - Responsive */}
      <div className="flex flex-col lg:flex-row">
        {/* Left Sidebar - Responsive */}
        <div
          className={`
            ${sidebarOpen ? "block" : "hidden"} lg:block
            w-full lg:w-[220px] xl:w-[250px]
            bg-white dark:bg-[#0d0d1a] py-4 lg:py-6 px-4
            flex-shrink-0
            lg:min-h-screen
          `}
        >
          <div className="bg-[#d4d4d4] dark:bg-gray-800 rounded-2xl lg:rounded-3xl p-3 space-y-2 max-w-[300px] mx-auto lg:max-w-none">
            {sidebarModules.map((mod) => (
              <div key={mod.id}>
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl lg:rounded-2xl text-left transition-all duration-200 shadow-sm ${
                    mod.submoduleId === submoduleId
                      ? "bg-purple-50 border border-purple-200"
                      : "bg-white dark:bg-gray-900"
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-semibold leading-tight text-gray-800 dark:text-gray-200 dark:text-gray-200">
                    {mod.title}
                  </span>
                  <span className="w-3.5 h-3.5 text-gray-400 flex-shrink-0">
                    {mod.expanded ? <ArrowDown /> : <ArrowRight />}
                  </span>
                </button>

                {/* Topics */}
                {mod.expanded && mod.topics && mod.topics.length > 0 && (
                  <div className="mt-2 bg-white dark:bg-gray-900 rounded-xl lg:rounded-2xl shadow-sm overflow-hidden">
                    {mod.topics.map((topic, index) => {
                      const topicNumId = parseInt(topic.id.replace("topic-", ""));
                      const topicProgress = topicProgressMap[topicNumId] || 0;
                      const isConfirmingReset = resetTopicId === topicNumId;

                      // Inline confirmation for per-topic reset
                      if (isConfirmingReset && user) {
                        return (
                          <div
                            key={topic.id}
                            className={`px-3 sm:px-4 py-2 ${
                              index !== mod.topics.length - 1 ? "border-b border-gray-100 dark:border-gray-700 dark:border-gray-700" : ""
                            }`}
                          >
                            <p className="text-[10px] text-gray-600 text-center mb-1.5 font-medium">
                              Reset this topic?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); setResetTopicId(null); }}
                                className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleResetTopicProgress(topicNumId); }}
                                className="flex-1 px-2 py-1 text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={topic.id}
                          onClick={() => handleTopicClick(topic.id, mod.submoduleId)}
                          className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            index !== mod.topics.length - 1 ? "border-b border-gray-100 dark:border-gray-700 dark:border-gray-700" : ""
                          }`}
                        >
                          <span
                            className={`text-[11px] sm:text-xs font-medium ${
                              topic.status === "current"
                                ? "text-blue-500"
                                : topic.status === "completed"
                                  ? "text-green-600"
                                  : "text-gray-700"
                            }`}
                          >
                            {topic.title}
                          </span>
                          {/* Status Icon + Bookmark + Reset button */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Bookmark button — always visible if bookmarked, hover otherwise */}
                            {user && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTopicBookmark(topicNumId, topic.title, mod.submoduleId, mod.title);
                                }}
                                className={`${
                                  bookmarkedTopicIds.has(topicNumId) ? "flex" : "hidden group-hover:flex"
                                } w-4 h-4 items-center justify-center transition-colors`}
                                title={bookmarkedTopicIds.has(topicNumId) ? "Remove bookmark" : "Bookmark this topic"}
                              >
                                <BookmarkHeart filled={bookmarkedTopicIds.has(topicNumId)} size={14} />
                              </button>
                            )}
                            {/* Per-topic reset button - shown on hover for completed or in-progress topics */}
                            {user && (topic.status === "completed" || topicProgress > 0) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setResetTopicId(topicNumId); }}
                                className="hidden group-hover:flex w-4 h-4 items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                title="Reset topic progress"
                              >
                                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
                                </svg>
                              </button>
                            )}
                            {/* Progress circle */}
                            {topic.status === "completed" ? (
                              <svg className="w-4 h-4" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8" fill="#22c55e" />
                                <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : topicProgress > 0 ? (
                              <svg className="w-4 h-4" viewBox="0 0 20 20">
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="8"
                                  fill="none"
                                  stroke="#e5e7eb"
                                  strokeWidth="2"
                                />
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="8"
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeDasharray="50.26"
                                  strokeDashoffset={50.26 * (1 - topicProgress / 100)}
                                  style={{ transition: "stroke-dashoffset 0.3s ease" }}
                                  transform="rotate(-90 10 10)"
                                />
                              </svg>
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Loading indicator when expanding */}
                {mod.expanded && !mod.topicsLoaded && (
                  <div className="mt-2 flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Empty state for modules with no topics */}
                {mod.expanded && mod.topicsLoaded && mod.topics.length === 0 && (
                  <div className="mt-2 bg-white dark:bg-gray-900 rounded-xl lg:rounded-2xl shadow-sm p-3">
                    <p className="text-[10px] text-gray-400 text-center italic">No topics yet</p>
                  </div>
                )}
              </div>
            ))}

            {/* Reset Progress */}
            {user && (
              <div className="mt-3 px-1">
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 bg-white dark:bg-gray-900 rounded-xl lg:rounded-2xl shadow-sm hover:bg-red-50 transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 7l1.5 9.5a1 1 0 001 .5h7a1 1 0 001-.5L16 7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 5h16" strokeLinecap="round" />
                      <path d="M8 5V3a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Reset Progress
                  </button>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-xl lg:rounded-2xl shadow-sm p-3 space-y-2">
                    <p className="text-[11px] text-gray-600 text-center font-medium">
                      Reset all progress for this module?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleResetProgress}
                        className="flex-1 px-2 py-1.5 text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Responsive */}
        <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white dark:bg-[#0d0d1a] dark:bg-[#0d0d1a]">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <Highlightable pageId={selectedTopic ? `topic-${selectedTopic.topic_id}` : "default"}>
              {selectedTopic ? (
                <div ref={contentWrapperRef} className="ai-content-wrapper">
                  {/* Topic name row with bookmark button */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate pr-2">
                      {selectedTopic.name}
                    </span>
                    {user && (
                      <button
                        onClick={() =>
                          handleTopicBookmark(
                            selectedTopic.topic_id,
                            selectedTopic.name,
                            selectedTopic.submodule_id,
                            currentSubmodule?.name || ""
                          )
                        }
                        className="flex-shrink-0 p-1 rounded-full hover:bg-purple-50 transition-colors"
                        title={bookmarkedTopicIds.has(selectedTopic.topic_id) ? "Remove bookmark" : "Bookmark this topic"}
                      >
                        <BookmarkHeart filled={bookmarkedTopicIds.has(selectedTopic.topic_id)} size={18} />
                      </button>
                    )}
                  </div>
                  <section className="mb-6 sm:mb-8">
                    {/* Topic Title from backend */}
                    {selectedTopic.title && (
                      <div
                        className="mb-4"
                        dangerouslySetInnerHTML={{ __html: fixMediaUrls(selectedTopic.title) }}
                      />
                    )}

                    {/* Topic image (standalone image_url field) */}
                    {selectedTopic.image_url && (
                      <div className="mb-4">
                        <img
                          src={selectedTopic.image_url}
                          alt={selectedTopic.name}
                          className="max-w-full rounded-xl object-contain"
                        />
                      </div>
                    )}

                    {/* Topic Description from backend */}
                    {selectedTopic.description && (
                      <div
                        className="mb-4"
                        dangerouslySetInnerHTML={{ __html: fixMediaUrls(selectedTopic.description) }}
                      />
                    )}

                    {/* Topic Content from backend */}
                    {selectedTopic.content && (
                      <div
                        dangerouslySetInnerHTML={{ __html: fixMediaUrls(selectedTopic.content) }}
                      />
                    )}

                    {/* Show message if no content at all */}
                    {!selectedTopic.title && !selectedTopic.description && !selectedTopic.content && !selectedTopic.image_url && (
                      <p className="text-gray-500 italic">
                        Content for this topic is coming soon...
                      </p>
                    )}
                  </section>
                  {/* ── Reference Materials ── */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      Reference Materials
                    </h3>

                    <div className="space-y-2">
                      {(
                        [
                          {
                            key: "notes" as const,
                            label: "Topic Notes",
                            desc: "Full topic content as plain text",
                            icon: (
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ),
                          },
                          {
                            key: "summary" as const,
                            label: "Quick Reference Guide",
                            desc: "Key points at a glance",
                            icon: (
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            ),
                          },
                          {
                            key: "exercises" as const,
                            label: "Practice Exercises",
                            desc: "Self-assessment activities",
                            icon: (
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            ),
                          },
                        ] as const
                      ).map((mat) => {
                        const done = downloadedSet.has(mat.key);
                        return (
                          <div
                            key={mat.key}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-purple-200 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                                {mat.icon}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{mat.label}</p>
                                <p className="text-xs text-gray-400 truncate">{mat.desc}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownload(mat.key)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex-shrink-0 ml-2 ${
                                done
                                  ? "bg-green-50 text-green-600 border border-green-200"
                                  : "bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"
                              }`}
                            >
                              {done ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Saved
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sentinel: when this scrolls into view, topic is marked complete */}
                  <div ref={contentEndRef} className="h-1" />

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-500 text-lg">No content available</p>
                  <p className="text-gray-400 text-sm mt-2">Please select a topic from the sidebar</p>
                </div>
              )}
            </Highlightable>
          </div>
        </div>
      </div>

      <style>{`
        .circled-text {
          position: relative;
          display: inline-block;
          padding: 0 6px;
          z-index: 1;
        }

        .circled-text::after {
          content: "";
          position: absolute;
          left: -3px;
          top: -3px;
          right: -3px;
          bottom: -3px;
          border: 2px solid #9333ea;
          border-radius: 50% 45% 55% 40% / 45% 55% 45% 55%;
          pointer-events: none;
          z-index: -1;
          transform: rotate(-2deg);
        }

        /* Styles for backend HTML content */
        .ai-content-wrapper {
          font-family: "Plus Jakarta Sans", sans-serif;
          color: #374151;
        }

        .dark .ai-content-wrapper {
          color: #d1d5db;
        }

        .ai-content-wrapper .circled-text {
          position: relative;
          display: inline-block;
          padding: 0 8px;
          z-index: 1;
        }

        .ai-content-wrapper .circled-text::after {
          content: "";
          position: absolute;
          left: -2px;
          top: -2px;
          right: -2px;
          bottom: -2px;
          border: 2px solid #9333ea;
          border-radius: 50% 45% 55% 40% / 45% 55% 45% 55%;
          pointer-events: none;
          z-index: -1;
          transform: rotate(-1deg);
        }

        .ai-content-wrapper h1,
        .ai-content-wrapper h2 {
          font-weight: 800;
          margin-bottom: 0.5rem;
          color: #111827;
        }

        .dark .ai-content-wrapper h1,
        .dark .ai-content-wrapper h2 {
          color: #f9fafb;
        }

        .ai-content-wrapper h1 {
          font-size: 1.5rem;
        }
        .ai-content-wrapper h2 {
          font-size: 1.25rem;
          margin-top: 1.5rem;
        }

        .ai-content-wrapper h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #9333ea;
          margin-top: 1rem;
          margin-bottom: 0.25rem;
        }

        .ai-content-wrapper p {
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 0.75rem;
        }

        .ai-content-wrapper mark {
          background-color: #fef08a;
          color: inherit;
          padding: 0 2px;
        }

        .dark .ai-content-wrapper mark {
          background-color: #854d0e;
          color: #fef3c7;
        }

        .ai-content-wrapper ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .ai-content-wrapper ul li {
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }

        .ai-content-wrapper ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .ai-content-wrapper ol li {
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 0.5rem;
          padding-left: 0.25rem;
        }

        .ai-content-wrapper a {
          color: #9333ea;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .ai-content-wrapper a:hover {
          color: #7c22ce;
        }

        .ai-content-wrapper code {
          background-color: #f3f4f6;
          color: #1f2937;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-family: "Fira Code", "Consolas", "Monaco", monospace;
          font-size: 0.85rem;
        }

        .dark .ai-content-wrapper code {
          background-color: #1e293b;
          color: #e2e8f0;
        }

        .ai-content-wrapper pre {
          background-color: #1f2937;
          color: #e5e7eb;
          padding: 1rem 1.25rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1rem 0;
          border: 1px solid #374151;
        }

        .ai-content-wrapper pre code {
          background-color: transparent;
          color: #e5e7eb;
          padding: 0;
          border-radius: 0;
          font-family: "Fira Code", "Consolas", "Monaco", monospace;
          font-size: 0.8rem;
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Images embedded in rich text content */
        .ai-content-wrapper img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.75rem 0;
          display: block;
        }

        /* Videos embedded in rich text content */
        .ai-content-wrapper video {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.75rem 0;
          display: block;
          background-color: #000;
        }

        /* iFrames (YouTube, Vimeo, etc.) */
        .ai-content-wrapper iframe {
          max-width: 100%;
          border-radius: 8px;
          margin: 0.75rem 0;
          display: block;
          border: none;
        }

        /* Blockquotes */
        .ai-content-wrapper blockquote {
          border-left: 4px solid #9333ea;
          margin: 1rem 0;
          padding: 0.5rem 0 0.5rem 1rem;
          color: #6b7280;
          font-style: italic;
        }

        .dark .ai-content-wrapper blockquote {
          color: #9ca3af;
          border-left-color: #7c3aed;
        }

        /* Mobile: Prevent sidebar and header from being selected */
        @media (pointer: coarse) {
          body.highlight-mode-active .jakarta-font > div:first-child,
          body.highlight-mode-active .jakarta-font > div:nth-child(2),
          body.highlight-mode-active .jakarta-font > div:nth-child(3) button,
          body.highlight-mode-active .jakarta-font > div:nth-child(4) > div:first-child {
            -webkit-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
          }

          /* CRITICAL: Allow text selection with drag handles in content area (Android only) */
          body.highlight-mode-active .mobile-highlight-mode,
          body.highlight-mode-active .mobile-highlight-mode * {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
            touch-action: manipulation !important;
            cursor: text;
            pointer-events: auto;
          }

          /* iOS Safari - COMPLETELY DISABLE native selection */
          body.highlight-mode-active .ios-highlight-mode {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }

          body.highlight-mode-active .ios-highlight-mode *,
          body.highlight-mode-active .ios-highlight-mode p,
          body.highlight-mode-active .ios-highlight-mode span,
          body.highlight-mode-active .ios-highlight-mode div {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }

          /* Purple selection color - works with Android selection handles */
          body.highlight-mode-active .mobile-highlight-mode::selection,
          body.highlight-mode-active .mobile-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.4) !important;
            color: inherit !important;
          }

          /* When highlight mode is NOT active, allow normal OS behavior */
          body:not(.highlight-mode-active) {
            -webkit-touch-callout: default;
            -webkit-user-select: auto;
            user-select: auto;
          }

          /* Disable tap highlight but allow selection */
          .mobile-highlight-mode,
          .ios-highlight-mode {
            -webkit-tap-highlight-color: transparent !important;
          }

          /* Ensure content wrapper allows selection on mobile (Android) */
          body.highlight-mode-active .ai-content-wrapper,
          body.highlight-mode-active .ai-content-wrapper * {
            -webkit-user-select: text !important;
            user-select: text !important;
            touch-action: manipulation !important;
          }

          /* iOS: Allow native selection in content wrapper but suppress callout menu */
          body.highlight-mode-active .ios-highlight-mode .ai-content-wrapper,
          body.highlight-mode-active .ios-highlight-mode .ai-content-wrapper * {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
          }
        }

        /* Desktop styles */
        @media (pointer: fine), (hover: hover) {
          body:not(.highlight-mode-active) .highlightable-content,
          body:not(.highlight-mode-active) .highlightable-content *,
          body:not(.highlight-mode-active) .ai-content-wrapper,
          body:not(.highlight-mode-active) .ai-content-wrapper * {
            -webkit-touch-callout: auto !important;
            -webkit-user-select: text !important;
            user-select: text !important;
          }

          body.highlight-mode-active .highlightable-content,
          body.highlight-mode-active .highlightable-content *,
          body.highlight-mode-active .ai-content-wrapper,
          body.highlight-mode-active .ai-content-wrapper * {
            -webkit-touch-callout: none !important;
            -webkit-user-select: text !important;
            user-select: text !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Contents;
