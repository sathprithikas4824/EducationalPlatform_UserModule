"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Import the fonts
import localFont from "next/font/local";

import { ArrowRightIcon, ArrowLeftIcon, VisibleIcon } from "../icons";

const fuzzyBubblesBoldFont = localFont({
  src: "../../fonts/FuzzyBubbles-Bold.ttf",
  display: "swap",
  variable: "--font-fuzzy-bubbles-bold",
});

const ExploreTopics = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  const router = useRouter();
  const carouselRef = useRef(null);

  const topics = [
    {
      title: "Generative AI",
      description:
        "Discover how AI creates artificial intelligence, enabling systems to generate content, art, and solutions autonomously. This includes usage like ChatGPT, MidJourney, and more.",
      views: "1K Views",
      tag: "#AI",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
      link: "/topics/generative-ai",
    },
    {
      title: "Digital Marketing",
      description:
        "Dive into social and digital marketing, learning to promote brands and products online. Use familiar creator social tools to expand reach and revenue insights.",
      views: "1K Views",
      tag: "#Digital Marketing",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
      link: "/topics/digital-marketing",
    },
    {
      title: "AWS (Server)",
      description:
        "Learn how to set up and manage cloud infrastructure with Amazon Web Services. Dive into cloud computing, storage, and architecture for modern applications.",
      views: "1K Views",
      tag: "#AWS",
      image:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
      link: "/topics/aws-server",
    },
    {
      title: "Meta Platform",
      description:
        "Learning AI Technology not new a great and advance technology in our system with deep learning. This robust tools makes AI Facebook, WhatsApp, and Instagram's digital ecosystems.",
      views: "1K Views",
      tag: "#Meta Platform",
      image:
        "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
      link: "/topics/meta-platform",
    },
  ];

  const floatingTags = [
    {
      text: "#AI",
      id: "tag-1",
      className: "floating-tag-1",
    },
    {
      text: "#AWS",
      id: "tag-2",
      className: "floating-tag-2",
    },
    {
      text: "#Digital Marketing",
      id: "tag-3",
      className: "floating-tag-3",
    },
    {
      text: "#Vibe Coding",
      id: "tag-4",
      className: "floating-tag-4",
    },
    {
      text: "#R&D",
      id: "tag-5",
      className: "floating-tag-5",
    },
    {
      text: "#Meta Platform",
      id: "tag-6",
      className: "floating-tag-6",
    },
  ];

  // Handle responsive items per page
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(1); // Mobile: 1 card
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2); // Tablet: 2 cards
      } else {
        setItemsPerPage(3); // Desktop: 3 cards
      }
      setCurrentIndex(0); // Reset to first item on resize
    };

    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = Math.max(0, topics.length - itemsPerPage);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const handleExploreMore = () => {
    router.push("/explore");
  };

  const handleCardClick = (link) => {
    router.push(link);
  };

  // Calculate card width percentage based on items per page
  const getCardWidth = () => {
    if (itemsPerPage === 1) return 100;
    if (itemsPerPage === 2) return 50;
    return 33.333333;
  };

  return (
    <div className="jakarta-font w-full bg-white relative overflow-hidden">
      {/* Floating Tags - Enhanced Responsive Design */}
      <div className="floating-tags-container">
        {floatingTags.map((tag, index) => (
          <div
            key={tag.id}
            className={`${tag.className} floating-pill absolute rounded-full font-semibold cursor-pointer z-20
                       transition-all duration-300
                       px-2.5 py-1 text-[10px]
                       xs:px-3 xs:py-1.5 xs:text-xs
                       sm:px-3.5 sm:py-1.5 sm:text-xs
                       md:px-4 md:py-2 md:text-sm
                       lg:px-5 lg:py-2.5 lg:text-sm
                       xl:px-6 xl:py-3 xl:text-base`}
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
              border: "1.5px solid rgba(124, 58, 237, 0.15)",
              boxShadow:
                "0 4px 12px rgba(124, 58, 237, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <span
              style={{
                color: "#000000",
                fontWeight: "600",
              }}
            >
              {tag.text}
            </span>
          </div>
        ))}
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-12 sm:pt-16 md:pt-20 lg:pt-24 xl:pt-28 pb-8 md:pb-12 lg:pb-16 xl:pb-20">
        {/* Header Section */}
        <div className="text-center mb-4 md:mb-6 lg:mb-8">
          <span
            className={`${fuzzyBubblesBoldFont.className} heading-learning`}
            style={{
              fontSize: "clamp(14px, 3.5vw, 20px)",
              lineHeight: "1.2",
              background: "linear-gradient(90deg, #7a12fa, #b614ef)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "inline-block",
              padding: "4px 0",
              textAlign: "center",
              width: "100%",
            }}
          >
            Discover & Learn
          </span>

          <h2
            className="font-black text-gray-900 mb-1 md:mb-2 lg:mb-2 px-4"
            style={{ fontSize: "34px" }}
          >
            Explore <span className="text-purple-600">Topics</span>
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 max-w-xl mx-auto leading-relaxed font-normal mt-0 mb-6 px-2">
            Learn key technology skills for students, professionals, and
            businesses in today's connected world.
          </p>
        </div>

        {/* Carousel Container with Navigation */}
        <div className="relative mt-12 md:mt-16 lg:mt-20 xl:mt-24">
          {/* Navigation Arrows - Responsive Sizes */}
          <div className="flex absolute -top-10 md:-top-12 lg:-top-20 right-0 gap-2 md:gap-2.5 lg:gap-3 z-50">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`w-8 h-8 md:w-9 md:h-9 lg:w-12 lg:h-12 rounded-full border flex items-center justify-center transition-all duration-200 ${
                currentIndex === 0
                  ? "bg-gray-50 border-gray-200 cursor-not-allowed"
                  : "bg-gray-50 border-gray-200 hover:bg-white"
              }`}
            >
              <ArrowLeftIcon
                size={16}
                className={`md:hidden transition-opacity duration-200 ${
                  currentIndex === 0 ? "opacity-30" : "opacity-100"
                }`}
              />
              <ArrowLeftIcon
                size={18}
                className={`hidden md:block lg:hidden transition-opacity duration-200 ${
                  currentIndex === 0 ? "opacity-30" : "opacity-100"
                }`}
              />
              <ArrowLeftIcon
                size={20}
                className={`hidden lg:block transition-opacity duration-200 ${
                  currentIndex === 0 ? "opacity-30" : "opacity-100"
                }`}
              />
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === maxIndex}
              className={`w-8 h-8 md:w-9 md:h-9 lg:w-12 lg:h-12 rounded-full border flex items-center justify-center transition-all duration-200 ${
                currentIndex === maxIndex
                  ? "bg-gray-50 border-gray-200 cursor-not-allowed"
                  : "bg-gray-50 border-gray-200 hover:bg-white"
              }`}
            >
              <ArrowRightIcon
                size={16}
                className={`md:hidden transition-opacity duration-200 ${
                  currentIndex === maxIndex ? "opacity-30" : "opacity-100"
                }`}
              />
              <ArrowRightIcon
                size={18}
                className={`hidden md:block lg:hidden transition-opacity duration-200 ${
                  currentIndex === maxIndex ? "opacity-30" : "opacity-100"
                }`}
              />
              <ArrowRightIcon
                size={20}
                className={`hidden lg:block transition-opacity duration-200 ${
                  currentIndex === maxIndex ? "opacity-30" : "opacity-100"
                }`}
              />
            </button>
          </div>

          {/* Professional Sliding Carousel - All Screen Sizes */}
          <div className="mt-4 md:mt-6 lg:mt-8">
            {/* Generous outer padding to ensure borders are never cut */}
            <div style={{ padding: "10px" }}>
              {/* Inner container with overflow hidden */}
              <div style={{ overflow: "hidden" }}>
                <div
                  className="flex transition-transform duration-700 ease-in-out"
                  style={{
                    gap: "24px",
                    transform: `translateX(calc(-${
                      currentIndex * getCardWidth()
                    }% - ${currentIndex * (24 / itemsPerPage)}px))`,
                  }}
                >
                  {topics.map((topic, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0"
                      style={{
                        width: `calc(${getCardWidth()}% - ${
                          (24 * (itemsPerPage - 1)) / itemsPerPage
                        }px)`,
                      }}
                    >
                      <div
                        onClick={() => handleCardClick(topic.link)}
                        onMouseEnter={() => setHoveredCard(index)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className="bg-white overflow-hidden cursor-pointer h-full flex flex-col transform transition-all duration-300"
                        style={{
                          borderRadius: "12px",
                          border:
                            hoveredCard === index
                              ? "1.5px solid rgba(90, 90, 190, 0.6)"
                              : "1.5px solid rgba(75, 75, 174, 0.3)",
                          boxShadow:
                            hoveredCard === index
                              ? "0 8px 16px rgba(18, 43, 165, 0.12)"
                              : "0 4px 8px rgba(18, 43, 165, 0.08)",
                        }}
                      >
                        {/* Image - Reduced for Mobile/Tablet */}
                        <div className="w-full p-3 md:p-4 lg:p-6">
                          <div className="w-full h-32 md:h-36 lg:h-52 bg-gray-100 overflow-hidden rounded-lg">
                            <img
                              src={topic.image}
                              alt={topic.title}
                              className="w-full h-full object-cover transition-transform duration-500"
                            />
                          </div>
                        </div>

                        {/* Content - Reduced Padding for Mobile/Tablet */}
                        <div className="px-3 pb-3 md:px-4 md:pb-4 lg:px-6 lg:pb-6 flex flex-col flex-grow">
                          {/* Title - Smaller on Mobile/Tablet */}
                          <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-900 mb-1.5 md:mb-2">
                            {topic.title}
                          </h3>

                          {/* Description - Reduced for Mobile/Tablet */}
                          <p className="text-xs md:text-xs lg:text-sm text-gray-600 mb-2 md:mb-3 lg:mb-4 line-clamp-2 md:line-clamp-3 leading-relaxed flex-grow">
                            {topic.description}
                          </p>

                          {/* Footer - Compact on Mobile/Tablet */}
                          <div className="flex items-center justify-between pt-2 md:pt-3 lg:pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-1 md:gap-1.5 lg:gap-2 text-xs lg:text-sm text-gray-600">
                              <VisibleIcon />
                              <span className="font-medium">{topic.views}</span>
                            </div>
                            <button className="bg-gray-800 hover:bg-gray-900 text-white px-2.5 py-1 md:px-3 md:py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold transition-all duration-300 hover:shadow-lg">
                              Explore
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explore More Button */}
        <div className="text-center relative z-20 pb-8 mt-10 md:mt-14 lg:mt-16">
          <button
            onClick={handleExploreMore}
            className="px-6 py-2.5 text-sm md:text-base font-bold text-white rounded-lg shadow-md relative overflow-hidden border gradient-wave transition-transform min-w-[160px]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)",
              borderColor: "#9513f4",
              backgroundSize: "200% 100%",
            }}
          >
            Explore More
          </button>
        </div>
      </div>

      {/* SEAMLESS CLOUD TRANSITION - FULL WIDTH + FULL IMAGE */}
      <div
        style={{
          width: "100vw",
          maxWidth: "100vw",
          height: "280px", // Increased height to show full image
          position: "relative",
          left: "50%",
          transform: "translateX(-50%)",
          overflow: "hidden",
          backgroundColor: "white",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Single Cloud Image - Full Width, Full Image Stretched */}
        <img
          src="/images/Pencil-Shadow.png"
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "fill", // Stretches to fill - shows FULL image edge-to-edge
            margin: 0,
            padding: 0,
            filter: "grayscale(10%) brightness(0.75) contrast(1.8)",
            opacity: 0.8,
            mixBlendMode: "multiply",
          }}
        />

        {/* Seamless Gradient Blending Overlays */}
        {/* Top gradient - fade to white above */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "45%",
            background:
              "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0) 100%)",
            zIndex: 10,
          }}
        />

        {/* Bottom gradient - fade to white below */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "45%",
            background:
              "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0) 100%)",
            zIndex: 10,
          }}
        />

        {/* Left gradient - soft edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "10%",
            background:
              "linear-gradient(to right, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)",
            zIndex: 10,
          }}
        />

        {/* Right gradient - soft edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: "10%",
            background:
              "linear-gradient(to left, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)",
            zIndex: 10,
          }}
        />
      </div>

      {/* BOTTOM SECTION */}
      <div className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-8 sm:py-12 md:py-16 lg:py-20">
          <span
            className={`${fuzzyBubblesBoldFont.className} heading-learning`}
            style={{
              fontSize: "clamp(18px, 5vw, 30px)",
              lineHeight: "1.4",
              background: "linear-gradient(90deg, #7a12fa, #b614ef)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "inline-block",
              padding: "10px 0",
              textAlign: "center",
              width: "100%",
            }}
          >
            Step into a smarter way to learn
          </span>

          <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 leading-tight px-4">
            Build Real{" "}
            <span className="relative inline-block mx-1 md:mx-2">
              <span className="relative z-10 text-purple-600">
                Understanding
              </span>
              <svg
                className="absolute top-1/2 left-1/2 pointer-events-none w-full h-full"
                style={{
                  transform: "translate(-50%, -50%)",
                  width: "105%",
                  height: "140%",
                }}
                viewBox="0 0 320 70"
                preserveAspectRatio="none"
              >
                <ellipse
                  cx="160"
                  cy="35"
                  rx="155"
                  ry="30"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2.5"
                />
              </svg>
            </span>{" "}
            In Every Subject You{" "}
            <span className="text-purple-600">Explore</span>
          </h3>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-normal mt-0 mb-10 px-2">
            We bring you the clarity and smart tools that transform how you
            learn, helping you grasp concepts deeper and remember them longer.
          </p>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Professional Floating Pills Animations */
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(var(--rotation)) scale(1);
          }
          50% {
            transform: translateY(-12px) rotate(var(--rotation)) scale(1.02);
          }
        }

        @keyframes float-subtle {
          0%,
          100% {
            transform: translateY(0) rotate(var(--rotation));
          }
          50% {
            transform: translateY(-8px) rotate(var(--rotation));
          }
        }

        @keyframes gentle-sway {
          0%,
          100% {
            transform: translateX(0) translateY(0) rotate(var(--rotation));
          }
          25% {
            transform: translateX(-3px) translateY(-6px)
              rotate(calc(var(--rotation) - 2deg));
          }
          75% {
            transform: translateX(3px) translateY(-6px)
              rotate(calc(var(--rotation) + 2deg));
          }
        }

        .floating-pill {
          animation: var(--animation-name) var(--duration) ease-in-out infinite;
          will-change: transform;
        }

        .floating-pill:hover {
          animation: hover-lift 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
        }

        @keyframes hover-lift {
          to {
            transform: translateY(-6px) scale(1.08) rotate(0deg);
            box-shadow:
              0 6px 16px rgba(124, 58, 237, 0.15),
              0 3px 6px rgba(0, 0, 0, 0.06);
            border: 1.5px solid rgba(124, 58, 237, 0.4);
          }
        }

        .floating-pill:active {
          transform: translateY(-3px) scale(1.03) !important;
        }

        /* ========================================
           MOBILE VIEW (< 768px) - 4 Pills (2 Left + 2 Right)
           ======================================== */

        /* LEFT SIDE - 2 Pills */
        .floating-tag-1 {
          display: block;
          top: 2%;
          left: 2%;
          --rotation: -5deg;
          --animation-name: float;
          --duration: 4s;
        }

        .floating-tag-2 {
          display: block;
          top: 6%;
          left: 3%;
          --rotation: 3deg;
          --animation-name: gentle-sway;
          --duration: 5.5s;
        }

        .floating-tag-3 {
          display: none;
        }

        /* RIGHT SIDE - 2 Pills */
        .floating-tag-4 {
          display: block;
          top: 2%;
          right: 2%;
          --rotation: 5deg;
          --animation-name: float-subtle;
          --duration: 5s;
        }

        .floating-tag-5 {
          display: block;
          top: 6%;
          right: 3%;
          --rotation: -3deg;
          --animation-name: float;
          --duration: 4.5s;
        }

        .floating-tag-6 {
          display: none;
        }

        /* ========================================
           TABLET VIEW (768px - 1023px) - 6 Pills (3 Left + 3 Right)
           ======================================== */
        @media (min-width: 768px) and (max-width: 1023px) {
          /* LEFT SIDE - 3 Pills */
          .floating-tag-1 {
            display: block;
            top: 3%;
            left: 3%;
            --rotation: -6deg;
            --animation-name: float;
            --duration: 4.2s;
          }

          .floating-tag-2 {
            display: block;
            top: 9%;
            left: 2%;
            --rotation: 3deg;
            --animation-name: float-subtle;
            --duration: 5.5s;
          }

          .floating-tag-3 {
            display: block;
            top: 6%;
            left: 12%;
            --rotation: -3deg;
            --animation-name: gentle-sway;
            --duration: 5s;
          }

          /* RIGHT SIDE - 3 Pills */
          .floating-tag-4 {
            display: block;
            top: 3%;
            right: 3%;
            --rotation: 6deg;
            --animation-name: gentle-sway;
            --duration: 4.8s;
          }

          .floating-tag-5 {
            display: block;
            top: 9%;
            right: 2%;
            --rotation: -3deg;
            --animation-name: float;
            --duration: 5.2s;
          }

          .floating-tag-6 {
            display: block;
            top: 6.5%;
            right: 12%;
            --rotation: 3deg;
            --animation-name: float-subtle;
            --duration: 4.5s;
          }
        }

        /* ========================================
           DESKTOP VIEW (1024px+) - 6 Pills (3 Left + 3 Right)
           ======================================== */
        @media (min-width: 1024px) {
          /* LEFT SIDE - 3 Pills */
          .floating-tag-1 {
            display: block;
            top: 4%;
            left: 5%;
            --rotation: -12deg;
            --animation-name: float;
            --duration: 4.5s;
          }

          .floating-tag-2 {
            display: block;
            top: 10%;
            left: 3%;
            --rotation: -8deg;
            --animation-name: gentle-sway;
            --duration: 5.8s;
          }

          .floating-tag-3 {
            display: block;
            top: 7%;
            left: 11%;
            --rotation: 8deg;
            --animation-name: float-subtle;
            --duration: 5s;
          }

          /* RIGHT SIDE - 3 Pills */
          .floating-tag-4 {
            display: block;
            top: 3.5%;
            right: 5%;
            --rotation: 12deg;
            --animation-name: gentle-sway;
            --duration: 4.3s;
          }

          .floating-tag-5 {
            display: block;
            top: 10%;
            right: 3%;
            --rotation: 8deg;
            --animation-name: float;
            --duration: 5.5s;
          }

          .floating-tag-6 {
            display: block;
            top: 8%;
            right: 11%;
            --rotation: -8deg;
            --animation-name: float-subtle;
            --duration: 4.8s;
          }
        }

        /* ========================================
           LARGE DESKTOP VIEW (1440px+)
           ======================================== */
        @media (min-width: 1440px) {
          /* LEFT SIDE - 3 Pills */
          .floating-tag-1 {
            top: 4%;
            left: 6%;
            --rotation: -12deg;
          }

          .floating-tag-2 {
            top: 10%;
            left: 4%;
            --rotation: -8deg;
          }

          .floating-tag-3 {
            top: 7%;
            left: 12%;
            --rotation: 8deg;
          }

          /* RIGHT SIDE - 3 Pills */
          .floating-tag-4 {
            top: 3.5%;
            right: 6%;
            --rotation: 12deg;
          }

          .floating-tag-5 {
            top: 10%;
            right: 4%;
            --rotation: 8deg;
          }

          .floating-tag-6 {
            top: 8%;
            right: 12%;
            --rotation: -8deg;
          }
        }
      `}</style>
    </div>
  );
};

export default ExploreTopics;
