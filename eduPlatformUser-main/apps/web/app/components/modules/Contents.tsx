"use client";

import React, { useState, useEffect } from "react";
import localFont from "next/font/local";
import { ArrowRight, ArrowDown } from "../common/icons";
import { Highlightable } from "../common/Highlightable";
import { UserProfileButton } from "../common/UserProfileButton";

const BACKEND_URL = "https://educationalplatform-usermodule-2.onrender.com";
const SUBMODULE_ID = 18; // Submodule ID for "Python Programming For AI"

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
  name: string;
  description: string | null;
  content: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  topics?: Topic[];
}

const fuzzyBubblesBoldFont = localFont({
  src: "../../fonts/FuzzyBubbles-Bold.ttf",
  display: "swap",
  variable: "--font-fuzzy-bubbles-bold",
});

interface SubModule {
  id: string;
  title: string;
  status: "completed" | "current" | "locked" | "available";
}

interface ModuleItem {
  id: string;
  title: string;
  expanded: boolean;
  subModules?: SubModule[];
}

const Contents: React.FC = () => {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [subModuleData, setSubModuleData] = useState<SubModuleData | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch submodule data and topics from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all submodules to find the one we need
        const submodulesResponse = await fetch(
          `${BACKEND_URL}/api/submodules`
        );

        // Fetch topics for this submodule - endpoint is /api/topics/:submoduleId
        const topicsResponse = await fetch(
          `${BACKEND_URL}/api/topics/${SUBMODULE_ID}`
        );

        if (!topicsResponse.ok) {
          throw new Error("Failed to fetch topics data");
        }

        const topicsData: Topic[] = await topicsResponse.json();
        setTopics(topicsData);

        // Try to get submodule data from the list
        let submoduleData: SubModuleData | null = null;
        if (submodulesResponse.ok) {
          const allSubmodules: SubModuleData[] = await submodulesResponse.json();
          submoduleData = allSubmodules.find(s => s.submodule_id === SUBMODULE_ID) || null;
          setSubModuleData(submoduleData);
        }

        // Convert topics to sidebar format
        const subModulesForSidebar: SubModule[] = topicsData.map((topic, index) => ({
          id: `topic-${topic.topic_id}`,
          title: topic.name,
          status: index === 0 ? "current" : "available" as const,
        }));

        // Set the first topic as selected by default
        if (topicsData.length > 0) {
          setSelectedTopic(topicsData[0]);
        }

        // Create module structure with fetched topics
        setModules([
          {
            id: "1",
            title: "Overview of AI",
            expanded: false,
            subModules: [],
          },
          {
            id: "2",
            title: submoduleData?.name,
            expanded: true,
            subModules: subModulesForSidebar,
          },
          {
            id: "3",
            title: "ML Fundamentals",
            expanded: false,
            subModules: [],
          },
          {
            id: "4",
            title: "DL Basics",
            expanded: false,
            subModules: [],
          },
          {
            id: "5",
            title: "Computer Vision",
            expanded: false,
            subModules: [],
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleModule = (moduleId: string) => {
    setModules((prev) =>
      prev.map((mod) =>
        mod.id === moduleId ? { ...mod, expanded: !mod.expanded } : mod
      )
    );
  };

  // Handle topic selection from sidebar
  const handleTopicClick = (topicId: string) => {
    if (topics.length === 0) return;

    const topicIdNum = parseInt(topicId.replace("topic-", ""));
    const topic = topics.find((t) => t.topic_id === topicIdNum);
    if (topic) {
      setSelectedTopic(topic);
      // Update status to show current topic
      setModules((prev) =>
        prev.map((mod) => {
          if (mod.id === "2" && mod.subModules) {
            return {
              ...mod,
              subModules: mod.subModules.map((sub) => ({
                ...sub,
                status: sub.id === topicId ? "current" : "available" as const,
              })),
            };
          }
          return mod;
        })
      );
    }
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
              {subModuleData?.name} ?
            </h1>
            {subModuleData?.description ? (
              <div
                className="text-purple-600 text-sm sm:text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: subModuleData.description }}
              />
            ) : (
              <p className="text-purple-600 text-sm sm:text-base leading-relaxed">
                Python is the #1 Language for AI development !<br className="hidden sm:block" />
                Python handles the complex stuff so you can<br className="hidden sm:block" />
                focus on{" "}
                <span className="font-medium">building intelligent systems !</span>
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
            {modules.map((module) => (
              <div key={module.id}>
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl lg:rounded-2xl text-left transition-all duration-200 bg-white shadow-sm"
                >
                  <span className="text-[11px] sm:text-xs font-semibold leading-tight text-gray-800">
                    {module.title}
                  </span>
                  <span className="w-3.5 h-3.5 text-gray-400 flex-shrink-0">
                    {module.expanded ? <ArrowDown /> : <ArrowRight />}
                  </span>
                </button>

                {/* Sub Modules */}
                {module.expanded && module.subModules && module.subModules.length > 0 && (
                  <div className="mt-2 bg-white rounded-xl lg:rounded-2xl shadow-sm overflow-hidden">
                    {module.subModules.map((subModule, index) => (
                      <div
                        key={subModule.id}
                        onClick={() => handleTopicClick(subModule.id)}
                        className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                          index !== module.subModules!.length - 1 ? "border-b border-gray-100" : ""
                        }`}
                      >
                        <span
                          className={`text-[11px] sm:text-xs font-medium ${
                            subModule.status === "current"
                              ? "text-blue-500"
                              : "text-gray-700"
                          }`}
                        >
                          {subModule.title}
                        </span>
                        {/* Status Icon - Progress Circle */}
                        <div className="flex-shrink-0">
                          {subModule.status === "current" ? (
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
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area - Responsive */}
        <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
          <div className="max-w-2xl mx-auto lg:mx-0">
            <Highlightable pageId={selectedTopic ? `topic-${selectedTopic.topic_id}` : "python-basics"}>
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
        @media (max-width: 1023px) and (pointer: coarse) {
          .jakarta-font > div:first-child,
          .jakarta-font > div:nth-child(2),
          .jakarta-font > div:nth-child(3) button {
            -webkit-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
          }
        }

        /* iOS Safari: Prevent entire page selection */
        @supports (-webkit-touch-callout: none) {
          @media (max-width: 1023px) {
            /* Disable selection on all non-content areas */
            .jakarta-font {
              -webkit-user-select: none;
              user-select: none;
              -webkit-touch-callout: none;
            }

            /* Header area */
            .jakarta-font > div:first-child {
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
            }

            /* Hero section */
            .jakarta-font > div:nth-child(2) {
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
            }

            /* Mobile toggle button */
            .jakarta-font > div:nth-child(3) {
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
            }

            /* Sidebar */
            .jakarta-font > div:nth-child(4) > div:first-child {
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
            }

            /* Only allow selection in the main content area */
            .jakarta-font .mobile-highlight-mode {
              -webkit-user-select: text !important;
              user-select: text !important;
              -webkit-touch-callout: none !important;
            }

            .jakarta-font .mobile-highlight-mode * {
              -webkit-user-select: text !important;
              user-select: text !important;
              -webkit-touch-callout: none !important;
            }
          }
        }

        /* Global mobile suppression of native context menus */
        @media (pointer: coarse) {
          /* Suppress iOS callout menu globally when highlight mode is active */
          body.highlight-mode-active {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            user-select: none !important;
          }

          /* Allow selection only in highlight content area */
          body.highlight-mode-active .mobile-highlight-mode,
          body.highlight-mode-active .mobile-highlight-mode * {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: none !important;
          }

          /* Custom purple selection color */
          body.highlight-mode-active .mobile-highlight-mode::selection,
          body.highlight-mode-active .mobile-highlight-mode *::selection {
            background-color: rgba(147, 51, 234, 0.3) !important;
          }
        }

        /* Android specific fixes */
        @media (pointer: coarse) and (hover: none) {
          .mobile-highlight-mode {
            -webkit-tap-highlight-color: transparent !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Contents;
