"use client";

import React, { useState } from "react";
import localFont from "next/font/local";
import { ArrowRight, ArrowDown } from "../common/icons";

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
  const [modules, setModules] = useState<ModuleItem[]>([
    {
      id: "1",
      title: "Overview of AI",
      expanded: false,
      subModules: [],
    },
    {
      id: "2",
      title: "Python Programming For AI",
      expanded: true,
      subModules: [
        { id: "2-1", title: "Python Basics", status: "current" },
        { id: "2-2", title: "NumPy and AI", status: "locked" },
        { id: "2-3", title: "Pandas for AI", status: "locked" },
        { id: "2-4", title: "Maths for AI", status: "locked" },
      ],
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleModule = (moduleId: string) => {
    setModules((prev) =>
      prev.map((mod) =>
        mod.id === moduleId ? { ...mod, expanded: !mod.expanded } : mod
      )
    );
  };

  const codeExample = `# Numbers age = 25 pi = 3.14 # Text name =
"AI Model" # Collections data = [1, 2, 3,
4, 5]  # List features = {"size": 10,
"color": "red"}  # Dictionary`;

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
              Python Programming For AI ?
            </h1>
            <p className="text-purple-600 text-sm sm:text-base leading-relaxed">
              Python is the #1 Language for AI development !<br className="hidden sm:block" />
              Python handles the complex stuff so you can<br className="hidden sm:block" />
              focus on{" "}
              <span className="font-medium">building intelligent systems !</span>
            </p>
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
                        className={`flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-all duration-200 ${
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
            {/* Why Python Section */}
            <section className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-2 sm:mb-3">
                Why Python ?
              </h2>
              <p className="text-gray-700 text-sm sm:text-[15px] leading-relaxed">
                Python is the{" "}
                <span className="circled-text text-purple-600 font-semibold">
                  #1 Language
                </span>{" "}
                for AI development! It is Easy to Learn, It has Rich Libraries
                and Fast Prototyping. Python handles the complex stuff so you
                can focus on{" "}
                <span className="text-purple-600 font-medium">
                  building intelligent systems!
                </span>
              </p>
            </section>

            {/* Essential Python Basics Section */}
            <section className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-3 sm:mb-4">
                Essential Python Basics
              </h2>

              {/* Variables & Data Types */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-purple-600 font-bold text-sm sm:text-[15px] mb-2">
                  Variables & Data Types :
                </h3>
                <div className="bg-gray-100 rounded-lg p-3 sm:p-4 border border-gray-200 overflow-x-auto">
                  <pre className="text-gray-700 text-[10px] sm:text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    <code>{codeExample}</code>
                  </pre>
                </div>

                {/* Handwritten Note */}
                <p
                  className={`mt-2 sm:mt-3 text-purple-600 text-xs sm:text-sm italic ${fuzzyBubblesBoldFont.className}`}
                  style={{
                    fontFamily: "var(--font-fuzzy-bubbles-bold), cursive",
                    textDecoration: "underline",
                    textDecorationStyle: "wavy",
                    textDecorationColor: "#9333ea",
                    textUnderlineOffset: "3px",
                  }}
                >
                  Lists and dictionaries are SUPER important for AI data!
                </p>
              </div>

              {/* Functions - Reusable Code Blocks */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-purple-600 font-bold text-sm sm:text-[15px] mb-2">
                  Functions - Reusable Code Blocks :
                </h3>
                <div className="bg-gray-100 rounded-lg p-3 sm:p-4 border border-gray-200 overflow-x-auto">
                  <pre className="text-gray-700 text-[10px] sm:text-xs font-mono leading-relaxed whitespace-pre-wrap">
                    <code>{codeExample}</code>
                  </pre>
                </div>
              </div>
            </section>

            {/* Next Steps Section */}
            <section className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2 sm:mb-3">
                Next Steps :
              </h2>
              <ol className="list-decimal list-inside space-y-1 sm:space-y-1.5 text-gray-700 text-xs sm:text-sm">
                <li>Install Python and these libraries</li>
                <li>Work through small examples</li>
                <li>Load a real dataset (try Kaggle!)</li>
                <li>Build your first ML model</li>
                <li>Experiment and break things (it&apos;s okay!)</li>
              </ol>
            </section>
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
      `}</style>
    </div>
  );
};

export default Contents;
