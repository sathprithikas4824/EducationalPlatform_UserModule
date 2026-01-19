"use client";

import React, { useEffect, useState } from "react";

// Import the fonts
import localFont from "next/font/local";

const fuzzyBubblesBoldFont = localFont({
  src: "../../fonts/FuzzyBubbles-Bold.ttf",
  display: "swap",
  variable: "--font-fuzzy-bubbles-bold",
});

interface Module {
  module_id: number;
  category_id: number;
  name: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  content?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const BACKEND_URL ="https://educationalplatform-usermodule-1.onrender.com";
const MODULE_ID = 19; // Module ID for AI content

const Overview: React.FC = () => {
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        setLoading(true);

        // Fetch module 17 directly
        const response = await fetch(
          `${BACKEND_URL}/api/modules/single/${MODULE_ID}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch module");
        }
        const data: Module = await response.json();
        setModuleData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching module:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModule();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white jakarta-font py-8 md:py-12 px-4 md:px-6 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-white jakarta-font py-8 md:py-12 px-4 md:px-6 flex items-center justify-center">
        <p className="text-xl text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-screen bg-white jakarta-font py-8 md:py-12 px-4 md:px-6 ${fuzzyBubblesBoldFont.variable}`}
    >
      <div className="max-w-6xl ml-0 md:pl-16 lg:pl-32 space-y-10 md:space-y-12">
        {/* Display Module Content */}
        {moduleData ? (
          <div className="space-y-4">
            {/* Module Title - "What is AI ?" */}
            {moduleData.title && (
              <div
                className="ai-content-wrapper"
                dangerouslySetInnerHTML={{ __html: moduleData.title }}
              />
            )}

            {/* Module Description - Contains all HTML content */}
            {moduleData.description && (
              <div
                className="ai-content-wrapper"
                dangerouslySetInnerHTML={{ __html: moduleData.description }}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <p className="text-xl text-gray-500">No content found</p>
          </div>
        )}
      </div>
      <style jsx global>{`
        .ai-content-wrapper {
          font-family: "Plus Jakarta Sans", sans-serif;
          color: #374151;
        }

        /* 1. THE OVAL / CIRCLED TEXT EFFECT */
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
          border: 2px solid #9333ea; /* Purple color from your JSON */
          border-radius: 50% 45% 55% 40% / 45% 55% 45% 55%; /* Irregular "hand-drawn" oval */
          pointer-events: none;
          z-index: -1;
          transform: rotate(-1deg);
        }

        /* 2. THE HAND-DRAWN UNDERLINE EFFECT */
        .ai-content-wrapper u {
          text-decoration: none;
          position: relative;
          display: inline-block;
          font-family: var(--font-fuzzy-bubbles-bold), cursive;
        }

        .ai-content-wrapper u::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 2px;
          width: 100%;
          height: 3px;
          background-color: currentColor; /* Matches the text color automatically */
          border-radius: 2px;
          /* This makes the line look slightly wiggly/organic */
          clip-path: polygon(
            0% 20%,
            25% 0%,
            50% 30%,
            75% 10%,
            100% 40%,
            100% 70%,
            75% 90%,
            50% 70%,
            25% 100%,
            0% 80%
          );
        }

        /* Standard Styles */
        .ai-content-wrapper h1,
        .ai-content-wrapper h2 {
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .ai-content-wrapper h1 {
          font-size: 2.25rem;
        }
        .ai-content-wrapper h2 {
          font-size: 1.85rem;
          margin-top: 2.5rem;
        }

        .ai-content-wrapper h3 {
          font-size: 1.15rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .ai-content-wrapper p {
          font-size: 1.05rem;
          line-height: 1.6;
          margin-bottom: 0.75rem;
        }

        .ai-content-wrapper mark {
          background-color: #fef08a; /* Soft yellow highlight */
          color: inherit;
          padding: 0 2px;
        }

        .ai-content-wrapper ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default Overview;