"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase, getAccessibilityPreferences, updateAccessibilityPreferences, type AccessibilityPreferences } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type FontSize = "normal" | "large" | "xl";
type Priority = "polite" | "assertive";

interface AccessibilityContextValue {
  // OS-level preferences (read from browser, live-updated)
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;

  // User preferences (persisted in localStorage + synced to Supabase when logged in)
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
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
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [fontSize, setFontSizeState] = useState<FontSize>("normal");

  // Refs mirror the latest state so Supabase sync always sends complete,
  // up-to-date preferences without re-creating callbacks on every change
  const highContrastRef = useRef(highContrast);
  const reducedMotionRef = useRef(reducedMotion);
  const fontSizeRef = useRef(fontSize);
  useEffect(() => { highContrastRef.current = highContrast; }, [highContrast]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);
  useEffect(() => { fontSizeRef.current = fontSize; }, [fontSize]);

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

  // ── Load saved user preferences from localStorage (instant, no flash) ─────
  useEffect(() => {
    const savedContrast = localStorage.getItem("a11y_high_contrast") === "true";
    const savedMotion = localStorage.getItem("a11y_reduced_motion") === "true";
    const savedFont = (localStorage.getItem("a11y_font_size") as FontSize) || "normal";
    setHighContrastState(savedContrast);
    setReducedMotionState(savedMotion);
    setFontSizeState(savedFont);
  }, []);

  // ── Load from Supabase when logged in — overrides localStorage so the
  //     preference follows the user across devices/browsers ─────────────────
  useEffect(() => {
    if (!supabase) return;

    const applyFromSupabase = (prefs: AccessibilityPreferences) => {
      setHighContrastState(prefs.highContrast);
      setReducedMotionState(prefs.reducedMotion);
      setFontSizeState(prefs.fontSize);
      localStorage.setItem("a11y_high_contrast", String(prefs.highContrast));
      localStorage.setItem("a11y_reduced_motion", String(prefs.reducedMotion));
      localStorage.setItem("a11y_font_size", prefs.fontSize);
    };

    getAccessibilityPreferences().then((prefs) => {
      if (prefs) applyFromSupabase(prefs);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        getAccessibilityPreferences().then((prefs) => {
          if (prefs) applyFromSupabase(prefs);
        });
      }
    });

    return () => subscription.unsubscribe();
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

  // ── Apply reduced motion data attribute (user override OR OS preference) ──
  useEffect(() => {
    const effective = prefersReducedMotion || reducedMotion;
    document.documentElement.setAttribute("data-reduce-motion", String(effective));
  }, [prefersReducedMotion, reducedMotion]);

  // ── Push current preferences to Supabase (logged-in users only) ──────────
  const syncToSupabase = useCallback((overrides: Partial<AccessibilityPreferences>) => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      updateAccessibilityPreferences({
        highContrast: overrides.highContrast ?? highContrastRef.current,
        reducedMotion: overrides.reducedMotion ?? reducedMotionRef.current,
        fontSize: overrides.fontSize ?? fontSizeRef.current,
      });
    });
  }, []);

  // ── Setters with localStorage persistence + Supabase sync ─────────────────
  const setHighContrast = useCallback((value: boolean) => {
    setHighContrastState(value);
    localStorage.setItem("a11y_high_contrast", String(value));
    syncToSupabase({ highContrast: value });
  }, [syncToSupabase]);

  const setReducedMotion = useCallback((value: boolean) => {
    setReducedMotionState(value);
    localStorage.setItem("a11y_reduced_motion", String(value));
    syncToSupabase({ reducedMotion: value });
  }, [syncToSupabase]);

  const setFontSize = useCallback((value: FontSize) => {
    setFontSizeState(value);
    localStorage.setItem("a11y_font_size", value);
    syncToSupabase({ fontSize: value });
  }, [syncToSupabase]);

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
        reducedMotion,
        setReducedMotion,
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
