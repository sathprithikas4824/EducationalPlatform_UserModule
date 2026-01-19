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
  SearchDuotoneIcon,
  ArrowRightIcon,
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

        /* MOBILE VIEW - DO NOT CHANGE */
        @media (max-width: 640px) {
          .heading-hello {
            font-size: 32px !important;
            -webkit-text-stroke: 1px #111827 !important;
            margin-bottom: 0px !important;
          }
          .heading-new-way {
            font-size: 32px !important;
            -webkit-text-stroke: 1px #111827 !important;
          }
          .heading-learning {
            font-size: 30px !important;
            line-height: 1.2 !important;
            position: relative !important;
            padding: 0px !important;
          }
          .swash-underline {
            font-size: 70px !important;
            position: absolute !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            bottom: -40px !important;
          }
          .heading-container {
            min-height: 160px !important;
            gap: 0px !important;
          }
          .second-line-container {
            min-height: auto !important;
            margin-top: 0px !important;
            margin-bottom: 0px !important;
            padding-bottom: 0px !important;
            gap: 4px !important;
            flex-direction: column !important;
            align-items: center !important;
            position: relative !important;
          }
          .learning-wrapper {
            position: relative !important;
            display: inline-block !important;
            padding-bottom: 35px !important;
            margin-top: -5px !important;
          }
        }

        /* UPDATED TABLET VIEW FOR FULL WIDTH AND SEARCH BAR FIX */
        @media (min-width: 768px) and (max-width: 1080px) {
          .max-w-7xl,
          .max-w-5xl,
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
          }

          /* Reduce Search Bar width to avoid floating element overlap */
          .search-bar-container {
            max-width: 650px !important;
            padding-left: 40px !important;
            padding-right: 40px !important;
          }

          .categories-grid {
            grid-template-columns: repeat(6, 1fr) !important;
            gap: 0.5rem !important;
            width: 100% !important;
            padding: 0 10px !important;
          }

          .category-card,
          .view-all-card {
            padding: 0.6rem 0.2rem !important;
            min-width: 0 !important;
          }

          .category-icon :global(svg),
          .category-icon svg {
            width: 22px !important;
            height: 22px !important;
          }

          .category-title {
            font-size: 0.6rem !important;
            margin-bottom: 1px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .category-count {
            font-size: 0.5rem !important;
          }

          .view-all-icon-container {
            width: 1.4rem !important;
            height: 1.4rem !important;
            margin-bottom: 2px !important;
          }

          .floating-gif-left {
            top: 5px;
            left: -5px !important;
            display: block !important;
            z-index: 0 !important;
          }

          .floating-gif-right {
            bottom: 40px !important;
            right: -100px !important;
            display: block !important;
            z-index: 0 !important;
          }

          .floating-gif-left img,
          .floating-gif-right img {
            width: 140px !important;
            height: 140px !important;
          }
        }

        /* DESKTOP VIEW - DO NOT CHANGE */
        @media (min-width: 1081px) {
          .categories-grid {
            grid-template-columns: repeat(6, 1fr) !important;
          }
        }
      `}</style>

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
        <div className="pt-8 pb-8 sm:pt-10 sm:pb-10 lg:pt-12 lg:pb-12">
          {/* Heading Section */}
          <div
            className="text-center max-w-4xl mx-auto animate-fadeInUp heading-container"
            style={{ overflow: "visible", minHeight: "280px" }}
          >
            <h1
              className="font-black text-gray-900"
              style={{
                overflow: "visible",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0px",
              }}
            >
              <span
                className="block font-black heading-hello"
                style={{
                  fontSize: "50px",
                  lineHeight: "1",
                  fontWeight: "900",
                  WebkitTextStroke: "1.5px #111827",
                  marginBottom: "-10px",
                }}
              >
                Say Hello
              </span>
              <span
                className="second-line-container"
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: "12px",
                  minHeight: "140px",
                  marginTop: "0px",
                  paddingBottom: "5px",
                  marginBottom: "-30px",
                }}
              >
                <span
                  className="font-black heading-new-way"
                  style={{
                    fontSize: "50px",
                    lineHeight: "1.2",
                    fontWeight: "900",
                    WebkitTextStroke: "1.5px #111827",
                  }}
                >
                  to your new way of
                </span>
                <span className="learning-wrapper">
                  <span
                    className={`${fuzzyBubblesBoldFont.className} heading-learning`}
                    style={{
                      fontSize: "48px",
                      lineHeight: "1.8",
                      background: "linear-gradient(90deg, #7a12fa, #b614ef)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      display: "inline-block",
                      padding: "10px 0",
                    }}
                  >
                    Learning
                  </span>
                  <span
                    className={`${swashesFont.className} swash-underline`}
                    style={{
                      fontSize: "120px",
                      position: "absolute",
                      left: "88%",
                      transform: "translateX(-50%)",
                      bottom: "-70px",
                      lineHeight: "1.8",
                      background: "linear-gradient(90deg, #7a12fa, #b614ef)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      display: "inline-block",
                      padding: "10px 0",
                    }}
                  >
                    z
                  </span>
                </span>
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-normal mt-0 mb-10 px-2">
              Learning made simple with interactive visuals that bring ideas to
              life. Highlight and save what matters, revisit it anytime.
              Learning that adapts to how you learn best.
            </p>

            {/* Search Bar - Added search-bar-container class */}
            <div className="search-bar-container max-w-2xl mx-auto mt-0 mb-12 sm:mb-16 md:mb-20 px-2">
              <form onSubmit={handleSearch} className="relative group">
                <div className="relative flex items-center">
                  <div className="absolute left-4 sm:left-5 flex items-center pointer-events-none">
                    <SearchDuotoneIcon
                      size={20}
                      className="group-focus-within:opacity-80 transition-opacity"
                    />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses, subjects, or topics..."
                    className="w-full pl-12 sm:pl-14 pr-20 sm:pr-32 py-3 sm:py-4 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 shadow-sm"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                  >
                    <ArrowRightIcon size={20} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Categories Section */}
          <div
            className="max-w-5xl mx-auto animate-fadeInUp"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="categories-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 justify-items-center">
              {categories.slice(0, 5).map((category, index) => (
                <Link
                  key={index}
                  href={category.link}
                  /* Use !hover:border-[#7612fa66] to override the inline style */
                  className="category-card group flex flex-col items-center px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border relative backdrop-blur-md cursor-pointer w-full transition-all duration-300 hover:!border-[#7612fa66]"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderColor: "rgba(140, 140, 170, 0.4)",
                    boxShadow: "0 2px 4px 0 rgba(124, 58, 237, 0.06)",
                  }}
                >
                  <div className="category-icon mb-2">
                    <category.icon size={28} className="sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="category-title font-bold text-gray-900 text-xs sm:text-sm mb-1 text-center">
                    {category.name}
                  </h3>
                  <p className="category-count text-gray-500 text-xs font-medium text-center">
                    {category.templates}
                  </p>
                </Link>
              ))}

              <Link
                href="/all-categories"
                /* Use !hover:border-[#7612fa66] to override the inline style */
                className="view-all-card group flex flex-col items-center px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border relative backdrop-blur-md cursor-pointer w-full transition-all duration-300 hover:!border-[#7612fa66]"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderColor: "rgba(140, 140, 170, 0.4)",
                  boxShadow: "0 2px 4px 0 rgba(124, 58, 237, 0.06)",
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="view-all-icon-container w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gray-100 rounded-lg group-hover:bg-gray-900 transition-colors duration-500 mb-2">
                    <ArrowRightIcon
                      size={16}
                      className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-500"
                    />
                  </div>
                  <h3 className="category-title font-bold text-gray-900 text-xs sm:text-sm mb-1 text-center">
                    View all
                  </h3>
                  <p className="category-count text-gray-500 text-xs font-medium text-center">
                    14 categories
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
