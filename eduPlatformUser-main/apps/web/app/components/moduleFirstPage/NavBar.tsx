"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Import icons
import { SearchDuotoneIcon, PenEditIcon } from "../icons";
import { useAnnotation } from "../common/AnnotationProvider";

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Popup shown when guest clicks the pencil/annotation button
const LoginToAnnotateModal = ({ onClose }: { onClose: () => void }) => {
  const pathname = usePathname();
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl p-6 text-center"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(340px, 90vw)",
          border: "1px solid rgba(122, 18, 250, 0.15)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
        >
          <PenEditIcon size={22} className="text-white" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Log in to highlight</h3>
        <p className="text-sm text-gray-500 mb-5">
          Save highlights and annotations on any topic. Log in to get started.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            className="flex-1 py-2.5 px-4 text-sm font-bold text-white rounded-xl text-center"
            style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef)" }}
          >
            Log in
          </Link>
        </div>
      </div>
    </>
  );
};

const MobileMenu = ({ isOpen, onClose, activeTab, setActiveTab }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] lg:hidden" onClick={onClose} />
      <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto lg:hidden shadow-2xl jakarta-font">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
            <span className="text-lg font-bold text-gray-900">Logo</span>
          </Link>
          <button onClick={onClose} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <div className="py-4">
          <div className="px-6 py-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Topic</div>
            <div className="text-base font-medium text-gray-900">Topic Name</div>
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="px-6 py-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</div>
            </div>
            <button
              onClick={() => { setActiveTab("topics"); onClose(); }}
              className={`block w-full px-6 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${activeTab === "topics" ? "bg-purple-50 border-l-4 border-l-purple-600" : ""}`}
            >
              <span className="text-base font-medium text-gray-900">Topics</span>
            </button>
            <button
              onClick={() => { setActiveTab("pathways"); onClose(); }}
              className={`block w-full px-6 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${activeTab === "pathways" ? "bg-purple-50 border-l-4 border-l-purple-600" : ""}`}
            >
              <span className="text-base font-medium text-gray-900">Pathways</span>
            </button>
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4 px-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Search</div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <SearchDuotoneIcon size={20} className="group-focus-within:opacity-80 transition-opacity" />
              <input type="text" placeholder="Search..." className="flex-1 text-sm bg-transparent border-none outline-none text-gray-900 placeholder-gray-500" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Reusable auth pill: navigates to /profile when logged in, Login/Signup when not
const NavAuthSection = ({ compact = false }: { compact?: boolean }) => {
  const { user, isLoggedIn } = useAnnotation();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoggedIn && user) {
    const initial = user.name?.charAt(0).toUpperCase() || "U";
    const textSize = compact ? "text-xs" : "text-sm";
    return (
      <button
        onClick={() => router.push("/profile")}
        className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7a12fa, #b614ef)" }}
        >
          {initial}
        </div>
        <span className={`${textSize} font-medium text-gray-700 max-w-[80px] truncate hidden sm:block`}>{user.name}</span>
      </button>
    );
  }

  const textSize = compact ? "text-xs" : "text-sm";
  const loginHref = `/login?redirect=${encodeURIComponent(pathname)}`;
  return (
    <>
      <Link href={loginHref} className={`px-3 py-1.5 ${textSize} font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200`}>
        Login
      </Link>
      <Link
        href="/signup"
        className={`px-4 py-2.5 -my-1 ${textSize} font-black text-white rounded-lg shadow-sm relative overflow-hidden border gradient-wave`}
        style={{ backgroundImage: "linear-gradient(90deg, #7a12fa, #b614ef, #7a12fa)", borderColor: "#9513f4" }}
      >
        Signup
      </Link>
    </>
  );
};

export default function NavBar() {
  const [activeTab, setActiveTab] = useState("topics");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { highlightModeEnabled, toggleHighlightMode, isLoggedIn } = useAnnotation();

  const handlePencilClick = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    toggleHighlightMode();
  };

  const pillStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "rgba(140, 140, 170, 0.4)",
    boxShadow: "0 2px 4px 0 rgba(124, 58, 237, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  };

  return (
    <>
      {showLoginModal && <LoginToAnnotateModal onClose={() => setShowLoginModal(false)} />}

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <header className="w-full sticky top-0 z-50 bg-transparent py-3 jakarta-font">
        <nav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* DESKTOP LAYOUT (1024px+) */}
          <div className="hidden lg:flex items-center justify-between gap-2.5">
            {/* Logo Pill */}
            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
              <Link href="/" className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                <div className="w-5 h-5">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-gray-900">Logo</span>
              </Link>
            </div>

            {/* Topic Name Pill */}
            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
              <div className="px-3.5 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">
                Topic Name
              </div>
            </div>

            {/* Navigation Tabs Pill */}
            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
              <button onClick={() => setActiveTab("topics")} className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "topics" ? "text-gray-900 bg-white hover:bg-gray-100" : "text-gray-700 hover:bg-gray-100"}`}>
                Topics
              </button>
              <button onClick={() => setActiveTab("pathways")} className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "pathways" ? "text-gray-900 bg-gray-100" : "text-gray-700 hover:bg-gray-100"}`}>
                Pathways
              </button>
            </div>

            {/* Search Bar Pill */}
            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md flex-1 max-w-md" style={pillStyle}>
              <div className="flex items-center gap-2 px-3.5 py-1.5 w-full">
                <SearchDuotoneIcon size={20} className="group-focus-within:opacity-80 transition-opacity" />
                <input type="text" placeholder="Search..." className="flex-1 text-sm bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 jakarta-font" />
              </div>
            </div>

            {/* Pencil / Highlight Toggle Pill */}
            <div
              className={`flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-hidden backdrop-blur-md transition-all duration-200 ${highlightModeEnabled ? "ring-2 ring-purple-500 border-purple-400" : ""}`}
              style={highlightModeEnabled ? { ...pillStyle, backgroundColor: "rgba(147, 51, 234, 0.1)" } : pillStyle}
            >
              <button
                onClick={handlePencilClick}
                className={`p-1.5 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center ${highlightModeEnabled ? "text-purple-600 bg-purple-100" : "text-gray-700"}`}
                title={isLoggedIn ? (highlightModeEnabled ? "Disable highlighting" : "Enable highlighting") : "Log in to highlight"}
              >
                <PenEditIcon size={20} className="transition-opacity" />
              </button>
            </div>

            {/* Auth Section */}
            <div className="flex items-center gap-0.5 px-2 py-2.5 rounded-2xl border relative overflow-visible backdrop-blur-md" style={pillStyle}>
              <NavAuthSection />
            </div>
          </div>

          {/* TABLET LAYOUT (640px - 1023px) */}
          <div className="hidden sm:flex lg:hidden items-center justify-between gap-2">
            {/* Left Group: Logo + Topic Name */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
                <Link href="/" className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  <div className="w-5 h-5"><img src="/logo.svg" alt="Logo" className="w-full h-full" /></div>
                  <span className="text-gray-900">Logo</span>
                </Link>
              </div>
              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
                <div className="px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200">Topic Name</div>
              </div>
            </div>

            {/* Center: Navigation Tabs */}
            <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
              <button onClick={() => setActiveTab("topics")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${activeTab === "topics" ? "text-gray-900 bg-white hover:bg-gray-100" : "text-gray-700 hover:bg-gray-100"}`}>
                Topics
              </button>
              <button onClick={() => setActiveTab("pathways")} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${activeTab === "pathways" ? "text-gray-900 bg-gray-100" : "text-gray-700 hover:bg-gray-100"}`}>
                Pathways
              </button>
            </div>

            {/* Right Group: Search + Edit + Auth */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
                <button className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center">
                  <SearchDuotoneIcon size={20} />
                </button>
              </div>

              <div
                className={`flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md transition-all duration-200 ${highlightModeEnabled ? "ring-2 ring-purple-500 border-purple-400" : ""}`}
                style={highlightModeEnabled ? { ...pillStyle, backgroundColor: "rgba(147, 51, 234, 0.1)" } : pillStyle}
              >
                <button
                  onClick={handlePencilClick}
                  className={`p-1.5 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center ${highlightModeEnabled ? "text-purple-600 bg-purple-100" : "text-gray-700"}`}
                  title={isLoggedIn ? (highlightModeEnabled ? "Disable highlighting" : "Enable highlighting") : "Log in to highlight"}
                >
                  <PenEditIcon size={20} />
                </button>
              </div>

              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-visible backdrop-blur-md" style={pillStyle}>
                <NavAuthSection compact />
              </div>
            </div>
          </div>

          {/* MOBILE LAYOUT (0px - 639px) */}
          <div className="flex sm:hidden items-center justify-between gap-1.5">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center">
                  <HamburgerIcon />
                </button>
              </div>
              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md" style={pillStyle}>
                <Link href="/" className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  <img src="/logo.svg" alt="Logo" className="w-5 h-5" />
                  <span className="text-gray-900">Logo</span>
                </Link>
              </div>
            </div>

            {/* Right: Edit + Auth */}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-hidden backdrop-blur-md transition-all duration-200 ${highlightModeEnabled ? "ring-2 ring-purple-500 border-purple-400" : ""}`}
                style={highlightModeEnabled ? { ...pillStyle, backgroundColor: "rgba(147, 51, 234, 0.1)" } : pillStyle}
              >
                <button
                  onClick={handlePencilClick}
                  className={`p-1.5 rounded-lg transition-all duration-200 w-9 h-9 flex items-center justify-center ${highlightModeEnabled ? "text-purple-600 bg-purple-100" : "text-gray-700"}`}
                  title={isLoggedIn ? (highlightModeEnabled ? "Disable highlighting" : "Enable highlighting") : "Log in to highlight"}
                >
                  <PenEditIcon size={20} />
                </button>
              </div>

              <div className="flex items-center gap-0.5 px-2 py-2 rounded-2xl border relative overflow-visible backdrop-blur-md" style={pillStyle}>
                <NavAuthSection compact />
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
