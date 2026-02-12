"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from "../common/icons";
import { useAnnotation } from "../common/AnnotationProvider";
import { getAllModulesProgress, PROGRESS_UPDATED_EVENT, type TopicProgress } from "../../lib/supabase";

const BACKEND_URL = "https://educationalplatform-usermodule-2.onrender.com";
const CATEGORY_ID = 185; // AI course category

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

const ModulesSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAnnotation();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Cache submodule/topic data so we only fetch it once
  const [cachedData, setCachedData] = useState<{
    submodules: BackendSubmodule[];
    topicsPerSubmodule: BackendTopic[][];
  } | null>(null);

  // Build modules list from cached data + progress
  const buildModules = useCallback((
    submodules: BackendSubmodule[],
    topicsPerSubmodule: BackendTopic[][],
    userProgress: TopicProgress[]
  ): Module[] => {
    const completedBySubmodule: Record<number, number> = {};
    userProgress.forEach((p) => {
      if (!completedBySubmodule[p.module_id]) {
        completedBySubmodule[p.module_id] = 0;
      }
      completedBySubmodule[p.module_id] += 1;
    });

    const modulesData: Module[] = [];
    submodules.forEach((sub, index) => {
      const topics: BackendTopic[] = topicsPerSubmodule[index] || [];
      const totalTopics = topics.length;
      if (totalTopics === 0) return;

      const completedTopics = completedBySubmodule[sub.submodule_id] || 0;
      const percentage = Math.round((completedTopics / totalTopics) * 100);

      modulesData.push({
        id: String(sub.submodule_id),
        submoduleId: sub.submodule_id,
        title: sub.name,
        completionPercentage: percentage,
        imageUrl: sub.image_url,
      });
    });
    return modulesData;
  }, []);

  // Initial fetch: submodules, topics, and progress
  useEffect(() => {
    const fetchModulesAndProgress = async () => {
      try {
        setLoading(true);

        const submodulesRes = await fetch(
          `${BACKEND_URL}/api/submodules/category/${CATEGORY_ID}`
        );
        const submodulesData = submodulesRes.ok ? await submodulesRes.json() : { data: [] };
        const submodules: BackendSubmodule[] = submodulesData.data || submodulesData || [];

        const topicPromises = submodules.map((sub) =>
          fetch(`${BACKEND_URL}/api/topics/${sub.submodule_id}`)
            .then((res) => (res.ok ? res.json() : []))
            .catch(() => [])
        );

        const topicsPerSubmodule = await Promise.all(topicPromises);
        const userProgress = user ? getAllModulesProgress(user.id) : [];

        setCachedData({ submodules, topicsPerSubmodule });
        setModules(buildModules(submodules, topicsPerSubmodule, userProgress));
      } catch (err) {
        console.error("Error fetching modules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModulesAndProgress();
  }, [user, buildModules]);

  // Listen for realtime progress updates from Contents component
  useEffect(() => {
    if (!cachedData || !user) return;

    const handleProgressUpdate = () => {
      const userProgress = getAllModulesProgress(user.id);
      setModules(buildModules(cachedData.submodules, cachedData.topicsPerSubmodule, userProgress));
    };

    window.addEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    return () => {
      window.removeEventListener(PROGRESS_UPDATED_EVENT, handleProgressUpdate);
    };
  }, [cachedData, user, buildModules]);

  const handleModuleClick = (moduleId: string) => {
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
    <div className="w-full bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="jakarta-font text-3xl md:text-5xl font-bold text-center mb-8 text-gray-900">
          Modules <span className="text-purple-600">Available</span>
        </h2>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : modules.length === 0 ? (
          <p className="text-center text-gray-500">No modules available yet.</p>
        ) : (
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <button
              onClick={() => scroll('left')}
              className="z-10 flex-shrink-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-all border border-gray-200 active:scale-95"
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
                  className="flex-shrink-0 group flex items-center gap-3 snap-start rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-300 hover:!border-[#7612fa66] p-2
                             w-full md:w-[calc((50%)-8px)] lg:w-[calc((33.333%)-10.6px)]"
                  style={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderColor: "rgba(140, 140, 170, 0.4)",
                      boxShadow: "0 2px 4px 0 rgba(124, 58, 237, 0.06)",
                  }}
                >
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
                    <h3 className="jakarta-font text-[12px] md:text-[13px] font-bold text-gray-900 leading-tight">
                      {module.title}
                    </h3>

                    <div className="flex items-center justify-between mt-auto">
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
              className="z-10 flex-shrink-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-all border border-gray-200 active:scale-95"
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
