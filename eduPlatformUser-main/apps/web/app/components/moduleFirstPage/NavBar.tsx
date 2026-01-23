"use client";

import { useState } from "react";
import Link from "next/link";

// Import icons
import { SearchDuotoneIcon, PenEditIcon } from "../icons";
import { useAnnotation } from "../common/AnnotationProvider";

const HamburgerIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 5h14M3 10h14M3 15h14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 5l10 10M15 5l-10 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const MobileMenu = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] lg:hidden"
        onClick={onClose}
      />

      <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto lg:hidden shadow-2xl jakarta-font">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
            <span className="text-lg font-bold text-gray-900">Logo</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="py-4">
          <div className="px-6 py-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Current Topic
            </div>
            <div className="text-base font-medium text-gray-900">
              Topic Name
            </div>
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="px-6 py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Navigation
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab("topics");
                onClose();
              }}
              className={`block w-full px-6 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                activeTab === "topics"
                  ? "bg-purple-50 border-l-4 border-l-purple-600"
                  : ""
              }`}
            >
              <span className="text-base font-medium text-gray-900">
                Topics
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("pathways");
                onClose();
              }}
              className={`block w-full px-6 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                activeTab === "pathways"
                  ? "bg-purple-50 border-l-4 border-l-purple-600"
                  : ""
              }`}
            >
              <span className="text-base font-medium text-gray-900">
                Pathways
              </span>
            </button>
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4 px-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Search
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <SearchDuotoneIcon
                size={20}
                className="group-focus-within:opacity-80 transition-opacity"
              />
              <input
                type="text"
                placeholder="Search..."
                className="flex-1 text-sm bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function NavBar() {
  const [activeTab, setActiveTab] = useState("topics");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { highlightModeEnabled, toggleHighlightMode } = useAnnotation();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const pillStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "rgba(140, 140, 170, 0.4)",
    boxShadow:
      "0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  };

  return (
    <>
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <header className="w-full sticky top-0 z-50 bg-transparent py-3 jakarta-font">
        <nav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* DESKTOP LAYOUT (1024px+) */}
          <div className="hidden lg:flex items-center justify-between gap-2.5">
            {/* Logo Pill */}
            <div
              className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md"
              style={pillStyle}
            >
              <Link
                href="/"
                className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <div className="w-5 h-5">
                  <img
                    src="/logo.svg"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-gray-900">Logo</span>
              </Link>
            </div>

            {/* Topic Name Pill */}
            <div
              className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md"
              style={pillStyle}
            >
              <div className="px-3.5 py-1.5 text-sm font-medium text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                Topic Name
              </div>
            </div>

            {/* Navigation Tabs Pill */}
            <div
              className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md"
              style={pillStyle}
            >
              <button
                onClick={() => setActiveTab("topics")}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "topics"
                    ? "text-gray-900 bg-white hover:text-gray-900 hover:bg-gray-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Topics
              </button>
              <button
                onClick={() => setActiveTab("pathways")}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "pathways"
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Pathways
              </button>
            </div>

            {/* Search Bar Pill */}
            <div
              className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md flex-1 max-w-md"
              style={pillStyle}
            >
              <div className="flex items-center gap-2 px-3.5 py-1.5 w-full">
                <SearchDuotoneIcon
                  size={20}
                  className="group-focus-within:opacity-80 transition-opacity"
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 jakarta-font"
                />
              </div>
            </div>

            {/* Edit Icon Pill - Highlight Toggle */}
            <div
              className={`flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md transition-all duration-200 ${
                highlightModeEnabled ? "ring-2 ring-purple-500 border-purple-400" : ""
              }`}
              style={highlightModeEnabled ? { ...pillStyle, backgroundColor: "rgba(147, 51, 234, 0.1)" } : pillStyle}
            >
              <button
                onClick={toggleHighlightMode}
                className={`p-1.5 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center ${
                  highlightModeEnabled
                    ? "text-purple-600 bg-purple-100 hover:bg-purple-200"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }`}
                title={highlightModeEnabled ? "Disable highlighting" : "Enable highlighting"}
              >
                <PenEditIcon
                  size={20}
                  className="transition-opacity"
                />
              </button>
            </div>

            {/* Auth Section */}
            <div
              className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md"
              style={pillStyle}
            >
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 -my-1 text-sm font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)",
                  borderColor: "#9513f4",
                }}
              >
                Signup
              </Link>
            </div>
          </div>

          {/* TABLET LAYOUT (640px - 1023px) */}
          <div className="hidden sm:flex lg:hidden items-center justify-between gap-2">
            {/* Left Group: Logo + Topic Name */}
            <div className="flex items-center gap-2">
              {/* Logo Pill */}
              <div
                className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
                style={pillStyle}
              >
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <div className="w-5 h-5">
                    <img src="/logo.svg" alt="Logo" className="w-full h-full" />
                  </div>
                  <span className="text-gray-900">Logo</span>
                </Link>
              </div>

              {/* Topic Name Pill */}
              <div
                className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
                style={pillStyle}
              >
                <div className="px-3 py-1.5 text-xs font-medium text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  Topic Name
                </div>
              </div>
            </div>

            {/* Center: Navigation Tabs */}
            <div
              className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
              style={pillStyle}
            >
              <button
                onClick={() => setActiveTab("topics")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "topics"
                    ? "text-gray-900 bg-white hover:text-gray-900 hover:bg-gray-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Topics
              </button>
              <button
                onClick={() => setActiveTab("pathways")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "pathways"
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                Pathways
              </button>
            </div>

            {/* Right Group: Search + Edit + Auth */}
            <div className="flex items-center gap-2">
              {/* Search Icon Only */}
              <div
                className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
                style={pillStyle}
              >
                <button className="p-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center">
                  <SearchDuotoneIcon
                    size={20}
                    className="group-focus-within:opacity-80 transition-opacity"
                  />
                </button>
              </div>

              {/* Edit Icon - Highlight Toggle */}
              <div
                className={`flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md transition-all duration-200 ${
                  highlightModeEnabled ? "ring-2 ring-purple-500 border-purple-400" : ""
                }`}
                style={highlightModeEnabled ? { ...pillStyle, backgroundColor: "rgba(147, 51, 234, 0.1)" } : pillStyle}
              >
                <button
                  onClick={toggleHighlightMode}
                  className={`p-1.5 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center ${
                    highlightModeEnabled
                      ? "text-purple-600 bg-purple-100 hover:bg-purple-200"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  title={highlightModeEnabled ? "Disable highlighting" : "Enable highlighting"}
                >
                  <PenEditIcon
                    size={20}
                    className="transition-opacity"
                  />
                </button>
              </div>

              {/* Auth Section */}
              <div
                className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
                style={pillStyle}
              >
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2.5 -my-1 text-xs font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)",
                    borderColor: "#9513f4",
                  }}
                >
                  Signup
                </Link>
              </div>
            </div>
          </div>

          {/* MOBILE LAYOUT (0px - 639px) */}
          <div className="flex sm:hidden items-center justify-between gap-1.5">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-1.5">
              {/* Hamburger Menu Pill */}
              <div
                className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
                style={pillStyle}
              >
                <button
                  onClick={toggleMobileMenu}
                  className="p-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center"
                >
                  <HamburgerIcon />
                </button>
              </div>

              {/* Logo Pill */}
              <div
                className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
                style={pillStyle}
              >
                <Link
                  href="/"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
                  <span className="text-gray-900">Logo</span>
                </Link>
              </div>
            </div>

            {/* Right: Edit + Auth */}
            <div className="flex items-center gap-1.5">
              {/* Edit Icon Pill - Highlight Toggle */}
              <div
                className={`flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md transition-all duration-200 ${
                  highlightModeEnabled ? "ring-2 ring-purple-500 border-purple-400" : ""
                }`}
                style={highlightModeEnabled ? { ...pillStyle, backgroundColor: "rgba(147, 51, 234, 0.1)" } : pillStyle}
              >
                <button
                  onClick={toggleHighlightMode}
                  className={`p-1.5 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center ${
                    highlightModeEnabled
                      ? "text-purple-600 bg-purple-100 hover:bg-purple-200"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  title={highlightModeEnabled ? "Disable highlighting" : "Enable highlighting"}
                >
                  <PenEditIcon
                    size={20}
                    className="transition-opacity"
                  />
                </button>
              </div>

              {/* Auth Section */}
              <div
                className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md"
                style={pillStyle}
              >
                <Link
                  href="/login"
                  className="px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-2.5 -my-1 text-xs font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)",
                    borderColor: "#9513f4",
                  }}
                >
                  Signup
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}