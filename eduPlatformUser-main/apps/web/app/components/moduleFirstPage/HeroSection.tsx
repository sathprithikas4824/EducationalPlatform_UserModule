"use client";

import React, { useState } from "react";
import Link from "next/link";

// Import the fonts
import localFont from "next/font/local";

// Import icons
import {
  MathDuotoneIcon,
  ScienceDuotoneIcon,
  CodeDuotoneIcon,
  LanguageDuotoneIcon,
  BriefcaseDuotoneIcon,
 
} from "../icons";
import PenGif from "../icons/gif/Pen-pingpong.gif";
import BookGif from "../icons/gif/Book-pingpong.gif";

const signatureFont = localFont({
  src: "../../fonts/Signature December.otf",
  display: "swap",
  variable: "--font-signature",
});

const swashesFont = localFont({
  src: "../../fonts/Swashes.ttf",
  display: "swap",
  variable: "--font-swashes",
});

const artheloFont = localFont({
  src: "../../fonts/Arthelo.ttf",
  display: "swap",
  variable: "--font-arthelo",
});

const bassyFont = localFont({
  src: "../../fonts/Bassy.ttf",
  display: "swap",
  variable: "--font-bassy",
});

const regularBrushFont = localFont({
  src: "../../fonts/Regular Brush.ttf",
  display: "swap",
  variable: "--font-regular-brush",
});

const heyAugustFont = localFont({
  src: "../../fonts/Hey August.ttf",
  display: "swap",
  variable: "--font-hey-august",
});

const wildYouthFont = localFont({
  src: "../../fonts/Wild Youth.otf",
  display: "swap",
  variable: "--font-wild-youth",
});

const christmasMerrylandFont = localFont({
  src: "../../fonts/ChristmasMerryland.ttf",
  display: "swap",
  variable: "--font-christmas-merryland",
});

const blueRiverFont = localFont({
  src: "../../fonts/BlueRiver.otf",
  display: "swap",
  variable: "--font-blue-river",
});

const fuzzyBubblesBoldFont = localFont({
  src: "../../fonts/FuzzyBubbles-Bold.ttf",
  display: "swap",
  variable: "--font-fuzzy-bubbles-bold",
});

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    {
      name: "Mathematics",
      icon: MathDuotoneIcon,
      templates: "250+ courses",
      link: "/mathematics",
    },
    {
      name: "Science",
      icon: ScienceDuotoneIcon,
      templates: "180+ courses",
      link: "/science",
    },
    {
      name: "Programming",
      icon: CodeDuotoneIcon,
      templates: "320+ courses",
      link: "/programming",
    },
    {
      name: "Languages",
      icon: LanguageDuotoneIcon,
      templates: "150+ courses",
      link: "/languages",
    },
    {
      name: "Business",
      icon: BriefcaseDuotoneIcon,
      templates: "120+ courses",
      link: "/business",
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  return (
    <div className="relative bg-white" style={{ overflow: "hidden" }}>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .float-animation {
          animation: float 10s ease-in-out infinite;
        }
        .float-animation-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 2s;
        }

        .category-card,
        .view-all-card {
          position: relative;
          transition: all 0.2s ease;
        }

        /* Base heading styles */
        .heading-container {
          position: relative;
          padding: 0 1rem;
        }
        
        .heading-main {
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          line-height: 1.2;
          white-space: nowrap;
        }
        
        .heading-intro {
          font-weight: 700;
          color: #111827;
        }
        
        .heading-ai-wrapper {
          position: relative;
          display: inline-block;
        }
        
        .heading-ai {
          background: linear-gradient(90deg, #7a12fa, #b614ef);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
        
        .swash-underline {
          position: absolute;
          left: 50%;
          background: linear-gradient(90deg, #7a12fa, #b614ef);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          pointer-events: none;
          white-space: nowrap;
        }

        /* MOBILE VIEW (≤640px) */
        @media (max-width: 640px) {
          .heading-container {
            padding: 0 0.5rem;
            margin-bottom: 1.5rem;
          }
          
          .heading-main {
            flex-direction: column;
            gap: 0.25rem;
            white-space: normal;
          }
          
          .heading-intro {
            font-size: 20px;
          }
          
          .heading-ai-wrapper {
            margin-bottom: 1.5rem;
          }
          
          .heading-ai {
            font-size: 20px;
          }
          
          .swash-underline {
            font-size: 60px;
            bottom: -40px;
            transform: translateX(-50%) scaleX(2.8);
          }
          
          /* Description text responsive */
          .description-text {
            font-size: 0.9rem;
            padding: 0 1rem;
            margin-top: 0;
            margin-bottom: 1.25rem;
            line-height: 1.6;
          }
          
          /* Tags responsive styles for mobile */
          .tags-container {
            overflow-x: visible;
            overflow-y: visible;
            padding: 0 0.75rem;
            margin-top: 0;
          }
          
          .tags-wrapper {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
          }
          
          .tag-item {
            font-size: 0.75rem;
            padding: 0.4rem 0.75rem;
            white-space: nowrap;
          }
          
          /* Hide floating GIFs on mobile */
          .floating-gif-left,
          .floating-gif-right {
            display: none;
          }
        }

        /* TABLET VIEW (641px - 1080px) */
        @media (min-width: 641px) and (max-width: 1080px) {
          .max-w-7xl,
          .max-w-5xl,
          .max-w-4xl {
            max-width: 100%;
            width: 100%;
          }

          .search-bar-container {
            max-width: 650px;
            padding-left: 40px;
            padding-right: 40px;
          }

          .categories-grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 0.5rem;
            width: 100%;
            padding: 0 10px;
          }

          .category-card,
          .view-all-card {
            padding: 0.6rem 0.2rem;
            min-width: 0;
          }

          .category-icon :global(svg),
          .category-icon svg {
            width: 22px;
            height: 22px;
          }

          .category-title {
            font-size: 0.6rem;
            margin-bottom: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .category-count {
            font-size: 0.5rem;
          }

          .view-all-icon-container {
            width: 1.4rem;
            height: 1.4rem;
            margin-bottom: 2px;
          }

          .floating-gif-left {
            top: 5px;
            left: -5px;
            display: block;
            z-index: 0;
          }

          .floating-gif-right {
            bottom: 40px;
            right: -100px;
            display: block;
            z-index: 0;
          }

          .floating-gif-left img,
          .floating-gif-right img {
            width: 140px;
            height: 140px;
          }
          
          /* Heading responsive for tablet */
          .heading-container {
            padding: 0 1.5rem;
            margin-bottom: 2rem;
          }
          
          .heading-main {
            gap: 0.4rem;
          }
          
          .heading-intro {
            font-size: 28px;
          }
          
          .heading-ai-wrapper {
            margin-bottom: -0.25rem;
          }
          
          .heading-ai {
            font-size: 32px;
          }
          
          .swash-underline {
            font-size: 110px;
            bottom: -80px;
            transform: translateX(-50%) scaleX(2.6);
          }
          
          /* Description text responsive */
          .description-text {
            font-size: 1rem;
            padding: 0 2rem;
            margin-top: 1.5rem;
            margin-bottom: 1.5rem;
            line-height: 1.65;
          }
          
          /* Tags responsive styles for tablet */
          .tags-container {
            overflow-x: visible;
            overflow-y: visible;
            padding: 0 1.5rem;
            margin-top: 0;
          }
          
          .tags-wrapper {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.65rem;
            width: 100%;
          }
          
          .tag-item {
            font-size: 0.825rem;
            padding: 0.45rem 0.9rem;
            white-space: nowrap;
          }
        }

        /* DESKTOP VIEW (≥1081px) */
        @media (min-width: 1081px) {
          .categories-grid {
            grid-template-columns: repeat(6, 1fr);
          }
          
          .heading-container {
            padding: 0 2rem;
            margin-bottom: 2.5rem;
          }
          
          .heading-main {
            gap: 0.5rem;
          }
          
          .heading-intro {
            font-size: 48px;
          }
          
          .heading-ai-wrapper {
            margin-bottom: -1rem;
          }
        
          .heading-ai {
            font-size: 54px;
          }
          
          .swash-underline {
            font-size: 200px;
            bottom: -130px;
            transform: translateX(-50%) scaleX(2.5);
          }
          
          .description-text {
            font-size: 1.125rem;
            margin-top: 2rem;
            margin-bottom: 1.75rem;
            line-height: 1.75;
            padding: 0 2rem;
          }
          
          /* Tags responsive styles for desktop - Single Row */
          .tags-container {
            display: flex;
            justify-content: center;
            overflow-x: visible;
            overflow-y: visible;
            margin-top: 0;
            padding: 0 2rem;
          }
          
          .tags-wrapper {
            display: flex;
            flex-wrap: nowrap;
            justify-content: center;
            gap: 0.75rem;
            width: auto;
            min-width: auto;
          }
          
          .tag-item {
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          .floating-gif-left,
          .floating-gif-right {
            display: block;
          }
        }
        
        /* Ensure tags wrap on mobile/tablet */
        @media (max-width: 1080px) {
          .tags-container {
            justify-content: center;
          }
          
          .tags-wrapper {
            flex-wrap: wrap;
          }
        }      `}</style>

      {/* Floating GIF - Top Left */}
      <div
        className="floating-gif-left absolute top-4 left-5 hidden lg:block"
        style={{ zIndex: 1 }}
      >
        <div className="float-animation">
          <div
            style={{
              width: "240px",
              height: "240px",
              filter: "drop-shadow(0 20px 25px rgb(0 0 0 / 0.15))",
            }}
          >
            <img
              src={PenGif.src}
              alt="Pen Animation"
              width={240}
              height={240}
              style={{
                width: "240px",
                height: "240px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating GIF - Bottom Right */}
      <div
        className="floating-gif-right absolute bottom-32 right-10 hidden lg:block"
        style={{ zIndex: 1 }}
      >
        <div className="float-animation-delayed">
          <div
            style={{
              width: "240px",
              height: "240px",
              filter: "drop-shadow(0 20px 25px rgb(0 0 0 / 0.15))",
            }}
          >
            <img
              src={BookGif.src}
              alt="Book Animation"
              width={240}
              height={240}
              style={{
                width: "240px",
                height: "240px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ overflow: "visible" }}
      >
        <div className="pt-6 pb-6 sm:pt-8 sm:pb-8 lg:pt-10 lg:pb-10">
          {/* Heading Section */}
          <div className="text-center max-w-4xl mx-auto animate-fadeInUp heading-container">
            <h1 className="heading-main">
              {/* Introduction to */}
              <span className="heading-intro">
                Introduction to
              </span>
              
              {/* Artificial Intelligence with curve underline */}
              <span className="heading-ai-wrapper">
                <span className={`${fuzzyBubblesBoldFont.className} heading-ai`}>
                  Artificial Intelligence
                </span>
                <span className={`${swashesFont.className} swash-underline`}>
                  z
                </span>
              </span>
            </h1>

            <p className="description-text text-gray-600 max-w-4xl mx-auto leading-relaxed font-normal">
              Master machine learning and deep learning with hands-on coding
              projects and step-by-step guides.
            </p>

            {/* Tags Section */}
            <div className="tags-container w-full">
              <div className="tags-wrapper">
                {[
                  "#AI",
                  "#MachineLearning",
                  "#AIForBeginners",
                  "#IntroToAI",
                  "#NLP",
                  "#NeuralNetworks",
                ].map((tag, index) => (
                  <span
                    key={index}
                    className="tag-item bg-white text-gray-700 rounded-full text-sm font-medium border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 cursor-pointer"
                    style={{
                      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}