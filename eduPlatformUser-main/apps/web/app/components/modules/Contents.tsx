"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import localFont from "next/font/local";
import { ArrowRight, ArrowDown } from "../common/icons";
import { Highlightable } from "../common/Highlightable";
import { useAnnotation } from "../common/AnnotationProvider";
import { markTopicCompleted, getCompletedTopics, resetModuleProgress, resetTopicProgress, saveTopicScrollPosition, getTopicScrollPosition, clearModuleScrollPositions, getLastUserId } from "../../lib/supabase";
import { cachedFetch } from "../../lib/apiCache";
import { saveDownload } from "../../lib/downloads";

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
  <div className="bg-[#d4d4d4] rounded-2xl lg:rounded-3xl p-3 space-y-2 max-w-[300px] mx-auto lg:max-w-none animate-pulse">
    <div className="bg-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl lg:rounded-2xl">
      <div className="h-3 bg-gray-200 rounded w-3/4" />
    </div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl lg:rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 rounded" style={{ width: `${50 + Math.random() * 30}%` }} />
          <div className="w-4 h-4 bg-gray-200 rounded-full flex-shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

const ContentSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-5/6" />
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-2/3" />
    <div className="h-6 bg-gray-200 rounded w-1/2 mt-6" />
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-4/5" />
    <div className="h-4 bg-gray-200 rounded w-full" />
  </div>
);

const HeroSkeleton: React.FC = () => (
  <div className="w-full bg-white py-6 sm:py-8 md:py-12 px-4 sm:px-6 md:px-10">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:gap-12 items-center animate-pulse">
      <div className="w-full max-w-[280px] h-[140px] sm:h-[160px] md:h-[180px] bg-gray-200 rounded-2xl md:rounded-3xl flex-shrink-0" />
      <div className="flex-1 w-full space-y-3">
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-10 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  </div>
);

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
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const initialScrollRef = useRef(0);
  const [topicProgressMap, setTopicProgressMap] = useState<Record<number, number>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTopicId, setResetTopicId] = useState<number | null>(null);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

  // Strip HTML tags for plain-text downloads
  const stripHtml = (html: string): string =>
    html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const handleDownload = useCallback(
    (materialType: "notes" | "summary" | "exercises") => {
      if (!selectedTopic) return;

      const topicName = selectedTopic.name;
      const moduleName = currentSubmodule?.name || "Module";
      const titleText = selectedTopic.title ? stripHtml(selectedTopic.title) : topicName;
      const descText = selectedTopic.description ? stripHtml(selectedTopic.description) : "";

      let content = "";
      let fileName = "";

      const safeName = topicName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

      switch (materialType) {
        case "notes":
          fileName = `${safeName}_Notes.txt`;
          content = `TOPIC NOTES\n${"=".repeat(40)}\nModule: ${moduleName}\nTopic:  ${topicName}\n\n${titleText}\n\n${descText}`;
          break;
        case "summary":
          fileName = `${safeName}_Quick_Reference.txt`;
          content = `QUICK REFERENCE GUIDE\n${"=".repeat(40)}\nModule: ${moduleName}\nTopic:  ${topicName}\n\nKey Points:\n${titleText}\n\n${descText.split(".").slice(0, 3).join(".")}`;
          break;
        case "exercises":
          fileName = `${safeName}_Practice_Exercises.txt`;
          content = `PRACTICE EXERCISES\n${"=".repeat(40)}\nModule: ${moduleName}\nTopic:  ${topicName}\n\n1. Review the key concepts:\n   ${titleText}\n\n2. Summarise the main points in your own words.\n\n3. Apply what you learned to a real-world scenario.\n\n4. Identify 3 questions you still have about this topic.\n\n5. Teach the concept to a peer or write it down from memory.`;
          break;
      }

      // Trigger real browser download
      const blob = new Blob([content], { type: "text/plain" });
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
          fileName,
          fileType: "txt",
        });
      }
    },
    [selectedTopic, currentSubmodule, user]
  );

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

  // Initial data fetch with retry for backend cold starts
  useEffect(() => {
    let cancelled = false;

    const fetchData = async (retryCount = 0) => {
      const MAX_RETRIES = 2;

      try {
        setLoading(true);
        setError(null);

        // Fetch all submodules and topics for the current submodule in parallel (with cache)
        const [rawSubmodules, topicsData] = await Promise.all([
          cachedFetch<SubModuleData[] | { data?: SubModuleData[] }>(
            `${BACKEND_URL}/api/submodules`,
            "all_submodules"
          ),
          fetchTopicsForSubmodule(submoduleId),
        ]);

        if (cancelled) return;

        // Normalize response: handle both array and { data: [...] } formats
        const allSubmodules: SubModuleData[] = Array.isArray(rawSubmodules)
          ? rawSubmodules
          : (rawSubmodules as { data?: SubModuleData[] }).data || [];

        // Find the current submodule
        const current = allSubmodules.find(
          (s) => s.submodule_id === submoduleId
        );
        setCurrentSubmodule(current || null);

        if (!current) {
          // If we got an empty response, the backend might still be waking up — retry
          if (allSubmodules.length === 0 && retryCount < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 1500 * (retryCount + 1)));
            if (!cancelled) return fetchData(retryCount + 1);
            return;
          }
          setError("Submodule not found");
          setLoading(false);
          return;
        }

        setTopics(topicsData);

        // Fetch completed topics — use last user ID cookie so progress shows after logout
        const progressUserId = user?.id ?? getLastUserId();
        const completedTopicIds = progressUserId ? await getCompletedTopics(progressUserId, submoduleId) : [];

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
        if (cancelled) return;
        // Retry on network/server errors (backend cold start)
        if (retryCount < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1500 * (retryCount + 1)));
          if (!cancelled) return fetchData(retryCount + 1);
          return;
        }
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
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
        className={`w-full min-h-screen bg-white jakarta-font ${fuzzyBubblesBoldFont.variable}`}
      >
        {/* Hero Skeleton */}
        <HeroSkeleton />

        {/* Mobile Toggle Placeholder */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
          <div className="h-5 bg-gray-200 rounded w-28 animate-pulse" />
        </div>

        {/* Main Content Skeleton */}
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block w-full lg:w-[220px] xl:w-[250px] bg-white py-4 lg:py-6 px-4 flex-shrink-0 lg:min-h-screen">
            <SidebarSkeleton />
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
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
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
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
      className={`w-full min-h-screen bg-white jakarta-font ${fuzzyBubblesBoldFont.variable}`}
    >
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
                              index !== mod.topics.length - 1 ? "border-b border-gray-100" : ""
                            }`}
                          >
                            <p className="text-[10px] text-gray-600 text-center mb-1.5 font-medium">
                              Reset this topic?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); setResetTopicId(null); }}
                                className="flex-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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
                          className={`group flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
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
                          {/* Status Icon + Reset button */}
                          <div className="flex items-center gap-1 flex-shrink-0">
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
                  <div className="mt-2 bg-white rounded-xl lg:rounded-2xl shadow-sm p-3">
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
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs font-medium text-gray-500 hover:text-red-600 bg-white rounded-xl lg:rounded-2xl shadow-sm hover:bg-red-50 transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 7l1.5 9.5a1 1 0 001 .5h7a1 1 0 001-.5L16 7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 5h16" strokeLinecap="round" />
                      <path d="M8 5V3a1 1 0 011-1h2a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Reset Progress
                  </button>
                ) : (
                  <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm p-3 space-y-2">
                    <p className="text-[11px] text-gray-600 text-center font-medium">
                      Reset all progress for this module?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
        <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <Highlightable pageId={selectedTopic ? `topic-${selectedTopic.topic_id}` : "default"}>
              {selectedTopic ? (
                <div ref={contentWrapperRef} className="ai-content-wrapper">
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
