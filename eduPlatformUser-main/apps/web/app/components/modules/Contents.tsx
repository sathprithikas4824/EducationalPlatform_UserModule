"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import localFont from "next/font/local";
import { ArrowRight, ArrowDown } from "../common/icons";
import { Highlightable } from "../common/Highlightable";
import { UserProfileButton } from "../common/UserProfileButton";
import { useAnnotation } from "../common/AnnotationProvider";
import { markTopicCompleted, getCompletedTopics } from "../../lib/supabase";

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

const Contents: React.FC<ContentsProps> = ({ submoduleId }) => {
  const { user } = useAnnotation();
  const [sidebarModules, setSidebarModules] = useState<SidebarModule[]>([]);
  const [currentSubmodule, setCurrentSubmodule] = useState<SubModuleData | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentEndRef = useRef<HTMLDivElement>(null);

  // Mark the currently selected topic as completed in sidebar + localStorage
  const markCurrentTopicDone = useCallback(() => {
    if (!selectedTopic) return;
    const topicKey = `topic-${selectedTopic.topic_id}`;

    // Persist to localStorage
    if (user) {
      const subId = currentSubmodule?.submodule_id ?? submoduleId;
      markTopicCompleted(user.id, selectedTopic.topic_id, subId, true);
    }

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

  // Fetch topics for a specific submodule
  const fetchTopicsForSubmodule = useCallback(async (subId: number): Promise<Topic[]> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/topics/${subId}`);
      if (!res.ok) return [];
      const data: Topic[] = await res.json();
      return data;
    } catch {
      return [];
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all submodules and topics for the current submodule in parallel
        const [submodulesRes, topicsData] = await Promise.all([
          fetch(`${BACKEND_URL}/api/submodules`).then((res) =>
            res.ok ? res.json() : []
          ),
          fetchTopicsForSubmodule(submoduleId),
        ]);

        const allSubmodules: SubModuleData[] = submodulesRes;

        // Find the current submodule
        const current = allSubmodules.find(
          (s) => s.submodule_id === submoduleId
        );
        setCurrentSubmodule(current || null);

        if (!current) {
          setError("Submodule not found");
          setLoading(false);
          return;
        }

        setTopics(topicsData);

        // Fetch completed topics from localStorage for current demo user
        const completedTopicIds = user ? getCompletedTopics(user.id, submoduleId) : [];

        // Find the first uncompleted topic index
        const firstUncompletedIndex = topicsData.findIndex(
          (topic) => !completedTopicIds.includes(topic.topic_id)
        );

        // Build sidebar topics for the current submodule only
        const currentTopics: SidebarTopic[] = topicsData.map(
          (topic, index) => ({
            id: `topic-${topic.topic_id}`,
            title: topic.name,
            status: completedTopicIds.includes(topic.topic_id)
              ? "completed"
              : index === firstUncompletedIndex
                ? "current"
                : ("available" as const),
          })
        );

        // Only show the selected submodule in the sidebar
        const sidebarData: SidebarModule[] = [{
          id: String(current.submodule_id),
          submoduleId: current.submodule_id,
          title: current.name,
          expanded: true,
          topics: currentTopics,
          topicsLoaded: true,
        }];

        setSidebarModules(sidebarData);

        // Select the first uncompleted topic, or first topic if all completed
        if (topicsData.length > 0) {
          const startIndex = firstUncompletedIndex >= 0 ? firstUncompletedIndex : 0;
          setSelectedTopic(topicsData[startIndex]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [submoduleId, fetchTopicsForSubmodule, user]);

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
      const completedTopicIds = user ? getCompletedTopics(user.id, mod.submoduleId) : [];

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

    const isSameTopic = selectedTopic?.topic_id === topicIdNum;

    // Clicking the current topic → mark it completed
    if (isSameTopic) {
      if (user) {
        const subId = currentSubmodule?.submodule_id ?? submoduleId;
        markTopicCompleted(user.id, topicIdNum, subId, true);
      }
      setSidebarModules((prev) =>
        prev.map((mod) => {
          if (mod.submoduleId === parentSubmoduleId && mod.topics) {
            return {
              ...mod,
              topics: mod.topics.map((t) =>
                t.id === topicId ? { ...t, status: "completed" as const } : t
              ),
            };
          }
          return mod;
        })
      );
      return;
    }

    // Clicking a different topic → mark the previous topic as completed
    if (user && selectedTopic) {
      const prevSubId = currentSubmodule?.submodule_id ?? submoduleId;
      markTopicCompleted(user.id, selectedTopic.topic_id, prevSubId, true);
    }

    setSelectedTopic(topic);

    // Update sidebar topic statuses
    setSidebarModules((prev) =>
      prev.map((mod) => {
        if (mod.submoduleId === parentSubmoduleId && mod.topics) {
          return {
            ...mod,
            topics: mod.topics.map((t) => {
              // Mark previously selected topic as "completed"
              if (t.id === `topic-${selectedTopic?.topic_id}`)
                return { ...t, status: "completed" as const };
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

  // Loading state
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-xl text-gray-600 font-medium">Loading content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
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
      className={`w-full min-h-screen bg-white jakarta-font ${fuzzyBubblesBoldFont.variable}`}
    >
      {/* Header with Login Button */}
      <div className="w-full bg-white px-4 sm:px-6 md:px-10 py-3 border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex justify-end">
          <UserProfileButton />
        </div>
      </div>

      {/* Hero Section - Responsive */}
      <div className="w-full bg-white py-6 sm:py-8 md:py-12 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:gap-12 items-center">
          {/* Gray Placeholder Image - Responsive */}
          <div className="w-full max-w-[280px] h-[140px] sm:h-[160px] md:h-[180px] bg-[#9a9aa3] rounded-2xl md:rounded-3xl flex-shrink-0"></div>

          {/* Hero Text Content */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-purple-600 text-sm sm:text-base font-medium mb-2">Education</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-3 sm:mb-5">
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
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Toggle Button */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
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
            bg-white py-4 lg:py-6 px-4
            flex-shrink-0
            lg:min-h-screen
          `}
        >
          <div className="bg-[#d4d4d4] rounded-2xl lg:rounded-3xl p-3 space-y-2 max-w-[300px] mx-auto lg:max-w-none">
            {sidebarModules.map((mod) => (
              <div key={mod.id}>
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(mod.id)}
                  className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl lg:rounded-2xl text-left transition-all duration-200 shadow-sm ${
                    mod.submoduleId === submoduleId
                      ? "bg-purple-50 border border-purple-200"
                      : "bg-white"
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-semibold leading-tight text-gray-800">
                    {mod.title}
                  </span>
                  <span className="w-3.5 h-3.5 text-gray-400 flex-shrink-0">
                    {mod.expanded ? <ArrowDown /> : <ArrowRight />}
                  </span>
                </button>

                {/* Topics */}
                {mod.expanded && mod.topics && mod.topics.length > 0 && (
                  <div className="mt-2 bg-white rounded-xl lg:rounded-2xl shadow-sm overflow-hidden">
                    {mod.topics.map((topic, index) => (
                      <div
                        key={topic.id}
                        onClick={() => handleTopicClick(topic.id, mod.submoduleId)}
                        className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                          index !== mod.topics.length - 1 ? "border-b border-gray-100" : ""
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
                        {/* Status Icon - Progress Circle */}
                        <div className="flex-shrink-0">
                          {topic.status === "completed" ? (
                            <svg className="w-4 h-4" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="8" fill="#22c55e" />
                              <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : topic.status === "current" ? (
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
                                strokeDashoffset="12.5"
                                transform="rotate(-90 10 10)"
                              />
                            </svg>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                          )}
                        </div>
                      </div>
                    ))}
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
                  <div className="mt-2 bg-white rounded-xl lg:rounded-2xl shadow-sm p-3">
                    <p className="text-[10px] text-gray-400 text-center italic">No topics yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area - Responsive */}
        <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <Highlightable pageId={selectedTopic ? `topic-${selectedTopic.topic_id}` : "default"}>
              {selectedTopic ? (
                <div className="ai-content-wrapper">
                  <section className="mb-6 sm:mb-8">
                    {/* Topic Title from backend */}
                    {selectedTopic.title && (
                      <div
                        className="mb-4"
                        dangerouslySetInnerHTML={{ __html: selectedTopic.title }}
                      />
                    )}

                    {/* Topic Description from backend */}
                    {selectedTopic.description && (
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedTopic.description }}
                      />
                    )}

                    {/* Show message if no title and no description */}
                    {!selectedTopic.title && !selectedTopic.description && (
                      <p className="text-gray-500 italic">
                        Content for this topic is coming soon...
                      </p>
                    )}
                  </section>
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
