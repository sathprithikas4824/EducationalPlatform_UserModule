"use client";

import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from "../common/icons";
import { useAnnotation } from "../common/AnnotationProvider";
import { getAllModulesProgress, getLastUserId, PROGRESS_UPDATED_EVENT, type TopicProgress } from "../../lib/supabase";
import { cachedFetch, prefetchAll, getCachedSync } from "../../lib/apiCache";
import { loadBookmarks, toggleBookmark } from "../../lib/bookmarks";
import { BookmarkHeart } from "../common/icons/BookmarkHeart";

const BACKEND_URL = "https://educationalplatform-usermodule-2.onrender.com";
const CATEGORY_ID = 185; // AI course category
const CACHE_PREFIX = "edu_api_";
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface BackendSubmodule {
  submodule_id: number;
  name: string;
  description: string | null;
  category_id: number;
  image_url: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface BackendTopic {
  topic_id: number;
  submodule_id: number;
  name: string;
}

interface Module {
  id: string;
  submoduleId: number;
  title: string;
  completionPercentage: number;
  imageUrl: string | null;
}

// Pure function (outside component) so it can be called from useLayoutEffect
function buildModulesFromData(
  submodules: BackendSubmodule[],
  topicsPerSubmodule: BackendTopic[][],
  userProgress: TopicProgress[]
): Module[] {
  const completedBySubmodule: Record<number, number> = {};
  userProgress.forEach((p) => {
    completedBySubmodule[p.module_id] = (completedBySubmodule[p.module_id] || 0) + 1;
  });

  return submodules.reduce<Module[]>((acc, sub, index) => {
    const topics = topicsPerSubmodule[index] || [];
    if (topics.length === 0) return acc;
    const completedTopics = completedBySubmodule[sub.submodule_id] || 0;
    acc.push({
      id: String(sub.submodule_id),
      submoduleId: sub.submodule_id,
      title: sub.name,
      completionPercentage: Math.round((completedTopics / topics.length) * 100),
      imageUrl: sub.image_url,
    });
    return acc;
  }, []);
}

// Synchronous localStorage read with TTL check
function readLocalCacheSync<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data as T;
  } catch {
    return null;
  }
}

// Skeleton card component for loading state
const SkeletonCard: React.FC = () => (
  <div
    className="flex-shrink-0 flex items-center gap-3 rounded-2xl border p-2
               w-full md:w-[calc((50%)-8px)] lg:w-[calc((33.333%)-10.6px)] animate-pulse"
    style={{
      backgroundColor: "var(--card-bg)",
      borderColor: "var(--card-border)",
    }}
  >
    <div className="w-24 h-16 md:w-32 md:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
    <div className="flex-1 flex flex-col justify-between h-16 md:h-20 py-0.5">
      <div className="space-y-1.5">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
      </div>
      <div className="flex items-center justify-between mt-auto">
        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
      </div>
    </div>
  </div>
);

const ModulesSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAnnotation();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [wakingUp, setWakingUp] = useState(false);
  const modulesRef = useRef<Module[]>([]);
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [bookmarkedModuleIds, setBookmarkedModuleIds] = useState<Set<number>>(new Set());

  const [cachedData, setCachedData] = useState<{
    submodules: BackendSubmodule[];
    topicsPerSubmodule: BackendTopic[][];
  } | null>(null);

  // ─── INSTANT PAINT from localStorage ────────────────────────────────────────
  // useLayoutEffect fires synchronously before the browser paints — if we have
  // cached data, modules appear immediately with zero visible loading skeleton.
  useLayoutEffect(() => {
    const submodulesRaw = readLocalCacheSync<BackendSubmodule[] | { data?: BackendSubmodule[] }>(
      `submodules_cat_${CATEGORY_ID}`
    );
    if (!submodulesRaw) return;

    const submodules: BackendSubmodule[] = Array.isArray(submodulesRaw)
      ? submodulesRaw
      : submodulesRaw.data || [];
    if (submodules.length === 0) return;

    const topicsPerSubmodule = submodules.map((sub) =>
      readLocalCacheSync<BackendTopic[]>(`topics_${sub.submodule_id}`) || []
    );

    // Build without progress first (progress needs async Supabase — added below)
    const built = buildModulesFromData(submodules, topicsPerSubmodule, []);
    if (built.length === 0) return;

    setCachedData({ submodules, topicsPerSubmodule });
    modulesRef.current = built;
    setModules(built);
    setLoading(false); // hide skeleton immediately
  }, []);

  // ─── BACKGROUND REFRESH: progress + fresh API data ──────────────────────────
  useEffect(() => {
    const fetchModulesAndProgress = async () => {
      // If we already have modules from cache, don't show loading spinner —
      // just refresh silently in the background.
      const hasInstantCache = modulesRef.current.length > 0;
      if (!hasInstantCache) {
        setLoading(true);
        setWakingUp(false);
      }

      const wakingTimer = hasInstantCache
        ? undefined
        : setTimeout(() => setWakingUp(true), 12000);

      try {
        const submodulesData = await cachedFetch<{ data?: BackendSubmodule[] } | BackendSubmodule[]>(
          `${BACKEND_URL}/api/submodules/category/${CATEGORY_ID}`,
          `submodules_cat_${CATEGORY_ID}`
        );
        const submodules: BackendSubmodule[] =
          Array.isArray(submodulesData) ? submodulesData :
          (submodulesData as { data?: BackendSubmodule[] }).data || [];

        const topicPromises = submodules.map((sub) =>
          cachedFetch<BackendTopic[]>(
            `${BACKEND_URL}/api/topics/${sub.submodule_id}`,
            `topics_${sub.submodule_id}`
          ).catch(() => [] as BackendTopic[])
        );

        const topicsPerSubmodule = await Promise.all(topicPromises);
        const progressUserId = user?.id ?? getLastUserId();
        if (!user) setGuestUserId(progressUserId);
        const userProgress = progressUserId ? await getAllModulesProgress(progressUserId) : [];

        setCachedData({ submodules, topicsPerSubmodule });
        const built = buildModulesFromData(submodules, topicsPerSubmodule, userProgress);
        modulesRef.current = built;
        setModules(built);

        prefetchAll(
          submodules.map((sub) => ({
            url: `${BACKEND_URL}/api/submodules`,
            cacheKey: "all_submodules",
          }))
        );
      } catch (err) {
        console.error("Error fetching modules:", err);
        if (modulesRef.current.length === 0) {
          // Last-resort fallback: stale memory cache
          const staleSubmodules = getCachedSync<BackendSubmodule[] | { data?: BackendSubmodule[] }>(`submodules_cat_${CATEGORY_ID}`);
          if (staleSubmodules) {
            const subs: BackendSubmodule[] = Array.isArray(staleSubmodules)
              ? staleSubmodules
              : (staleSubmodules as { data?: BackendSubmodule[] }).data || [];
            const topicsPerSub = subs.map((sub) =>
              getCachedSync<BackendTopic[]>(`topics_${sub.submodule_id}`) || []
            );
            const fallbackUserId = user?.id ?? getLastUserId();
            if (!user) setGuestUserId(fallbackUserId);
            const userProgress = fallbackUserId ? await getAllModulesProgress(fallbackUserId).catch(() => []) : [];
            setCachedData({ submodules: subs, topicsPerSubmodule: topicsPerSub });
            const built = buildModulesFromData(subs, topicsPerSub, userProgress);
            modulesRef.current = built;
            setModules(built);
          }
        }
      } finally {
        if (wakingTimer) clearTimeout(wakingTimer);
        setWakingUp(false);
        setLoading(false);
      }
    };

    fetchModulesAndProgress();
  }, [user]);

  // Load bookmarks when user changes
  useEffect(() => {
    if (!user?.id) { setBookmarkedModuleIds(new Set()); return; }
    loadBookmarks(user.id).then((records) => {
      const moduleRecords = records.filter((b) => b.type === "module");
      setBookmarkedModuleIds(new Set(moduleRecords.map((b) => b.moduleId)));
    });
  }, [user?.id]);

  const handleModuleBookmark = useCallback(async (e: React.MouseEvent, module: Module) => {
    e.stopPropagation();
    if (!user?.id) return;
    const nowBookmarked = await toggleBookmark(user.id, {
      type: "module",
      moduleId: module.submoduleId,
      moduleName: module.title,
      moduleImageUrl: module.imageUrl,
    });
    setBookmarkedModuleIds((prev) => {
      const next = new Set(prev);
      if (nowBookmarked) next.add(module.submoduleId);
      else next.delete(module.submoduleId);
      return next;
    });
  }, [user?.id]);

  // Listen for realtime progress updates from Contents component
  useEffect(() => {
    const effectiveUserId = user?.id ?? guestUserId;
    if (!cachedData || !effectiveUserId) return;

    const handleProgressUpdate = async () => {
      const userProgress = await getAllModulesProgress(effectiveUserId);
      const built = buildModulesFromData(cachedData.submodules, cachedData.topicsPerSubmodule, userProgress);
      modulesRef.current = built;
      setModules(built);
    };

    window.addEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    return () => {
      window.removeEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    };
  }, [cachedData, user, guestUserId]);

  const handleModuleClick = (moduleId: string) => {
    prefetchAll([
      { url: `${BACKEND_URL}/api/topics/${moduleId}`, cacheKey: `topics_${moduleId}` },
      { url: `${BACKEND_URL}/api/submodules`, cacheKey: "all_submodules" },
    ]);
    router.push(`/modules/${moduleId}`);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const card = container.firstElementChild as HTMLElement;
      if (!card) return;

      const cardWidth = card.offsetWidth;
      const gap = 16;

      let cardsToScroll = 1;
      if (window.innerWidth >= 1024) cardsToScroll = 3;
      else if (window.innerWidth >= 768) cardsToScroll = 2;

      const scrollDistance = (cardWidth + gap) * cardsToScroll;

      container.scrollTo({
        left: direction === 'left'
          ? container.scrollLeft - scrollDistance
          : container.scrollLeft + scrollDistance,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#0d0d1a] transition-colors duration-300 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="jakarta-font text-3xl md:text-5xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
          Modules <span className="text-purple-600">Available</span>
        </h2>

        {loading ? (
          <div className="flex flex-col items-center gap-4">
            {wakingUp && (
              <p className="text-sm text-gray-400 animate-pulse">
                Waking up the server, this may take a moment…
              </p>
            )}
          <div className="flex items-center justify-center gap-2 md:gap-4 w-full">
            <button
              className="z-10 flex-shrink-0 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700 opacity-50"
              style={{ backgroundColor: "var(--btn-scroll-bg)" }}
              aria-label="Scroll left"
              disabled
            >
              <ArrowLeft/>
            </button>

            <div
              className="flex gap-4 overflow-x-hidden p-1"
              style={{ width: '100%' }}
            >
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>

            <button
              className="z-10 flex-shrink-0 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700 opacity-50"
              style={{ backgroundColor: "var(--btn-scroll-bg)" }}
              aria-label="Scroll right"
              disabled
            >
              <ArrowRight/>
            </button>
          </div>
          </div>
        ) : modules.length === 0 ? (
          <p className="text-center text-gray-500">No modules available yet.</p>
        ) : (
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <button
              onClick={() => scroll('left')}
              className="z-10 flex-shrink-0 rounded-full p-2 shadow-md transition-all border border-gray-200 dark:border-gray-700 active:scale-95"
              style={{ backgroundColor: "var(--btn-scroll-bg)" }}
              aria-label="Scroll left"
            >
              <ArrowLeft/>
            </button>

            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-hidden scroll-smooth p-1 snap-x snap-mandatory"
              style={{
                width: '100%',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {modules.map((module) => (
                <div
                  key={module.id}
                  onClick={() => handleModuleClick(module.id)}
                  className="flex-shrink-0 group relative flex items-center gap-3 snap-start rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-300 hover:!border-[#7612fa66] p-2
                             w-full md:w-[calc((50%)-8px)] lg:w-[calc((33.333%)-10.6px)]"
                  style={{
                      backgroundColor: "var(--card-bg)",
                      borderColor: "var(--card-border)",
                      boxShadow: "var(--pill-shadow)",
                  }}
                >
                  {user && (
                    <button
                      onClick={(e) => handleModuleBookmark(e, module)}
                      className={`absolute top-1.5 right-1.5 z-10 p-1 rounded-full transition-all duration-200 ${
                        bookmarkedModuleIds.has(module.submoduleId)
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      } hover:bg-purple-50`}
                      title={bookmarkedModuleIds.has(module.submoduleId) ? "Remove bookmark" : "Bookmark this module"}
                    >
                      <BookmarkHeart filled={bookmarkedModuleIds.has(module.submoduleId)} size={17} />
                    </button>
                  )}

                  {module.imageUrl ? (
                    <img
                      src={module.imageUrl}
                      alt={module.title}
                      className="w-24 h-16 md:w-32 md:h-20 rounded-lg border border-gray-600 flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-24 h-16 md:w-32 md:h-20 bg-[#A3A3A3] rounded-lg border border-gray-600 flex-shrink-0"></div>
                  )}

                  <div className="flex-1 flex flex-col justify-between h-16 md:h-20 py-0.5">
                    <h3 className="jakarta-font text-[12px] md:text-[13px] font-bold text-gray-900 dark:text-gray-100 leading-tight pr-5">
                      {module.title}
                    </h3>

                    <div className="flex items-center justify-between mt-auto">
                      {(user || guestUserId) ? (
                        <div className="flex items-center gap-1">
                          <div className="relative w-3 h-3">
                            <svg className="w-3 h-3 transform -rotate-90">
                              <circle cx="6" cy="6" r="5" stroke="#9CA3AF" strokeWidth="1.5" fill="none" />
                              <circle
                                cx="6"
                                cy="6"
                                r="5"
                                stroke="#3B82F6"
                                strokeWidth="1.5"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 5}`}
                                strokeDashoffset={`${2 * Math.PI * 5 * (1 - module.completionPercentage / 100)}`}
                              />
                            </svg>
                          </div>
                          <span className="text-[7px] font-bold text-gray-700 whitespace-nowrap">
                            {module.completionPercentage}% Completed
                          </span>
                        </div>
                      ) : (
                        <span className="text-[7px] text-gray-400 whitespace-nowrap">Log in to track</span>
                      )}

                      <button className="bg-black text-white text-[9px] font-bold px-3 py-1 rounded shadow-sm hover:bg-gray-800 transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => scroll('right')}
              className="z-10 flex-shrink-0 rounded-full p-2 shadow-md transition-all border border-gray-200 dark:border-gray-700 active:scale-95"
              style={{ backgroundColor: "var(--btn-scroll-bg)" }}
              aria-label="Scroll right"
            >
              <ArrowRight/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulesSection;
