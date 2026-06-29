"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FontSize = "normal" | "large" | "xl";
type Priority = "polite" | "assertive";

interface AccessibilityContextValue {
  // OS-level preferences (read from browser, live-updated)
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;

  // User preferences (persisted in localStorage)
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  fontSize: FontSize;
  setFontSize: (value: FontSize) => void;

  // Screen reader announcements
  announce: (message: string, priority?: Priority) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // OS preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);

  // User preferences
  const [highContrast, setHighContrastState] = useState(false);
  const [fontSize, setFontSizeState] = useState<FontSize>("normal");

  // Live region state for screen reader announcements
  const [announcement, setAnnouncement] = useState("");
  const [priority, setPriority] = useState<Priority>("polite");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Read OS preferences on mount and listen for changes ──────────────────
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    setPrefersReducedMotion(motionQuery.matches);
    setPrefersDarkMode(darkQuery.matches);

    const onMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    const onDark = (e: MediaQueryListEvent) => setPrefersDarkMode(e.matches);

    motionQuery.addEventListener("change", onMotion);
    darkQuery.addEventListener("change", onDark);

    return () => {
      motionQuery.removeEventListener("change", onMotion);
      darkQuery.removeEventListener("change", onDark);
    };
  }, []);

  // ── Load saved user preferences from localStorage ─────────────────────────
  useEffect(() => {
    const savedContrast = localStorage.getItem("a11y_high_contrast") === "true";
    const savedFont = (localStorage.getItem("a11y_font_size") as FontSize) || "normal";
    setHighContrastState(savedContrast);
    setFontSizeState(savedFont);
  }, []);

  // ── Apply font size to <html> element ────────────────────────────────────
  useEffect(() => {
    const sizes: Record<FontSize, string> = {
      normal: "100%",
      large: "112.5%",
      xl: "125%",
    };
    document.documentElement.style.fontSize = sizes[fontSize];
  }, [fontSize]);

  // ── Apply high contrast data attribute to <html> element ─────────────────
  useEffect(() => {
    document.documentElement.setAttribute("data-high-contrast", String(highContrast));
  }, [highContrast]);

  // ── Setters with localStorage persistence ─────────────────────────────────
  const setHighContrast = useCallback((value: boolean) => {
    setHighContrastState(value);
    localStorage.setItem("a11y_high_contrast", String(value));
  }, []);

  const setFontSize = useCallback((value: FontSize) => {
    setFontSizeState(value);
    localStorage.setItem("a11y_font_size", value);
  }, []);

  // ── announce() — writes to the ARIA live region ───────────────────────────
  // Clears first so repeating the same message still fires a new announcement
  const announce = useCallback((message: string, p: Priority = "polite") => {
    setAnnouncement("");
    setPriority(p);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAnnouncement(message), 50);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        prefersReducedMotion,
        prefersDarkMode,
        highContrast,
        setHighContrast,
        fontSize,
        setFontSize,
        announce,
      }}
    >
      {children}

      {/* ── ARIA live region ────────────────────────────────────────────────
          Visually hidden but always present in the DOM.
          Screen readers (NVDA, VoiceOver, JAWS) watch this div and read
          any text changes aloud automatically. */}
      <div
        role="status"
        aria-live={priority}
        aria-atomic="true"
        aria-relevant="additions text"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          borderWidth: 0,
        }}
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used inside <AccessibilityProvider>");
  return ctx;
}
