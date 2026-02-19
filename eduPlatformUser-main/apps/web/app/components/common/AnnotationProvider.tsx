"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  supabase,
  addHighlight as addHighlightToSupabase,
  removeHighlight as removeHighlightFromSupabase,
  getAllUserHighlights,
  deleteAllUserHighlights,
  type Highlight as SupabaseHighlight,
} from "../../lib/supabase";

// Types
export interface Highlight {
  id: string;
  userId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  pageId: string;
  createdAt: string;
  // Context for accurate positioning
  prefixContext?: string; // Text before the highlight
  suffixContext?: string; // Text after the highlight
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface AnnotationContextType {
  user: User | null;
  highlights: Highlight[];
  isLoggedIn: boolean;
  highlightModeEnabled: boolean;
  toggleHighlightMode: () => void;
  login: (email: string, name?: string) => void;
  logout: () => void;
  addHighlight: (highlight: Omit<Highlight, "id" | "createdAt" | "userId">) => void;
  removeHighlight: (id: string) => void;
  getHighlightsForPage: (pageId: string) => Highlight[];
  clearAllHighlights: () => void;
}

const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined);

// Cookie helper functions (used only for auth session)
const setCookie = (name: string, value: string, days: number = 30) => {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {
    console.warn("Failed to set cookie:", e);
  }
};

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  } catch (e) {
    console.warn("Failed to get cookie:", e);
    return null;
  }
};

const deleteCookie = (name: string) => {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  } catch (e) {
    console.warn("Failed to delete cookie:", e);
  }
};

// Generate unique ID (for demo/fallback mode)
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Generate user ID from email (for demo/fallback mode only)
const generateUserId = (email: string) => {
  return btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16);
};

// Map Supabase highlight (snake_case) to our internal format (camelCase)
const mapSupabaseHighlight = (h: SupabaseHighlight, userId: string): Highlight => ({
  id: h.id,
  userId,
  text: h.text,
  startOffset: h.start_offset,
  endOffset: h.end_offset,
  color: h.color,
  pageId: h.page_id,
  createdAt: h.created_at,
  prefixContext: h.prefix_context,
  suffixContext: h.suffix_context,
});

export const AnnotationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [highlightModeEnabled, setHighlightModeEnabled] = useState(false);

  const toggleHighlightMode = useCallback(() => {
    setHighlightModeEnabled((prev) => !prev);
  }, []);

  // Load all highlights for the logged-in user from Supabase
  const loadHighlightsForUser = useCallback(async (userId: string) => {
    if (!supabase) return;
    const data = await getAllUserHighlights();
    setHighlights(data.map((h) => mapSupabaseHighlight(h, userId)));
  }, []);

  // Driven entirely by onAuthStateChange which fires INITIAL_SESSION on mount
  // (immediately, with the current session or null), then on every auth change.
  useEffect(() => {
    // No Supabase configured — use cookie-based demo user only
    if (!supabase) {
      const savedUser = getCookie("edu_user");
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch {
          // ignore
        }
      }
      setIsInitialized(true);
      return;
    }

    // Supabase configured: subscribe first — INITIAL_SESSION fires synchronously
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const supabaseUser: User = {
          id: u.id,
          email: u.email!,
          name: u.user_metadata?.full_name || u.email!.split("@")[0],
        };
        setUser(supabaseUser);
        setCookie("edu_user", JSON.stringify(supabaseUser));
        // Load highlights from Supabase
        loadHighlightsForUser(u.id);
      } else {
        setUser(null);
        setHighlights([]);
        deleteCookie("edu_user");
      }
      setIsInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, [loadHighlightsForUser]);

  const login = useCallback((email: string, name?: string) => {
    // Demo/fallback mode only (no Supabase)
    const userId = generateUserId(email);
    const newUser: User = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name || email.split("@")[0],
    };
    setHighlights([]);
    setUser(newUser);
    setCookie("edu_user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setHighlights([]);
    setUser(null);
    deleteCookie("edu_user");
    if (supabase) {
      supabase.auth.signOut(); // fire-and-forget; onAuthStateChange will handle state update
    }
  }, []);

  const addHighlight = useCallback(async (highlight: Omit<Highlight, "id" | "createdAt" | "userId">) => {
    if (!user) return;

    if (!supabase) {
      // Demo/fallback mode — keep in memory only
      const newHighlight: Highlight = {
        ...highlight,
        id: generateId(),
        userId: user.id,
        createdAt: new Date().toISOString(),
      };
      setHighlights((prev) => [...prev, newHighlight]);
      return;
    }

    // Optimistically add with a temp ID for instant UI feedback
    const tempId = generateId();
    const optimistic: Highlight = {
      ...highlight,
      id: tempId,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    setHighlights((prev) => [...prev, optimistic]);

    // Save to Supabase and replace temp ID with real Supabase ID
    const saved = await addHighlightToSupabase({
      pageId: highlight.pageId,
      text: highlight.text,
      startOffset: highlight.startOffset,
      endOffset: highlight.endOffset,
      color: highlight.color,
      prefixContext: highlight.prefixContext,
      suffixContext: highlight.suffixContext,
    });

    if (saved) {
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === tempId
            ? { ...h, id: saved.id, createdAt: saved.created_at }
            : h
        )
      );
    } else {
      // Revert if Supabase save failed
      setHighlights((prev) => prev.filter((h) => h.id !== tempId));
    }
  }, [user]);

  const removeHighlight = useCallback(async (id: string) => {
    if (!user) return;

    // Optimistically remove from state
    setHighlights((prev) => prev.filter((h) => !(h.id === id && h.userId === user.id)));

    if (supabase) {
      // Delete from Supabase (fire-and-forget; state already updated optimistically)
      await removeHighlightFromSupabase(id);
    }
  }, [user]);

  const getHighlightsForPage = useCallback((pageId: string) => {
    if (!user) return [];
    return highlights.filter((h) => h.pageId === pageId && h.userId === user.id);
  }, [highlights, user]);

  const clearAllHighlights = useCallback(async () => {
    if (!user) return;
    setHighlights([]);
    if (supabase) {
      await deleteAllUserHighlights();
    }
  }, [user]);

  return (
    <AnnotationContext.Provider
      value={{
        user,
        highlights,
        isLoggedIn: !!user,
        highlightModeEnabled,
        toggleHighlightMode,
        login,
        logout,
        addHighlight,
        removeHighlight,
        getHighlightsForPage,
        clearAllHighlights,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
};

export const useAnnotation = () => {
  const context = useContext(AnnotationContext);
  if (context === undefined) {
    throw new Error("useAnnotation must be used within an AnnotationProvider");
  }
  return context;
};
