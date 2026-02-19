"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  supabase,
  addHighlight as addHighlightToSupabase,
  removeHighlight as removeHighlightFromSupabase,
  getAllUserHighlights,
  deleteAllUserHighlights,
  saveLastUserId,
  backupProgressToCookies,
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

// Regex to detect real Supabase UUID user IDs vs demo user IDs
const SUPABASE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isSupabaseUUID = (id: string) => SUPABASE_UUID_REGEX.test(id);

// ---- Cookie helpers (auth session only) ----
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

// ---- localStorage helpers for highlight persistence ----
const getHighlightsKey = (userId: string) => `edu_highlights_${userId}`;

const saveHighlightsToStorage = (userId: string, items: Highlight[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getHighlightsKey(userId), JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to save highlights to localStorage:", e);
  }
};

const loadHighlightsFromStorage = (userId: string): Highlight[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getHighlightsKey(userId));
    return raw ? (JSON.parse(raw) as Highlight[]) : [];
  } catch {
    return [];
  }
};

const clearHighlightsFromStorage = (userId: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getHighlightsKey(userId));
  } catch {}
};

// ---- Misc helpers ----
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const generateUserId = (email: string) =>
  btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16);

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

  // Load highlights for a Supabase user — tries Supabase first, falls back to localStorage cache
  const loadHighlightsForUser = useCallback(async (userId: string) => {
    if (!supabase) return;
    const data = await getAllUserHighlights();
    if (data.length > 0) {
      const mapped = data.map((h) => mapSupabaseHighlight(h, userId));
      setHighlights(mapped);
      saveHighlightsToStorage(userId, mapped); // Keep localStorage in sync
    } else {
      // Supabase returned nothing (table may not be set up, or no highlights yet)
      // Fall back to localStorage cache so highlights survive logout/login
      const cached = loadHighlightsFromStorage(userId);
      setHighlights(cached);
    }
  }, []);

  // Initialise auth state. Supports both Supabase auth and demo (cookie) login.
  useEffect(() => {
    // No Supabase configured — use cookie-based demo user only
    if (!supabase) {
      const savedUser = getCookie("edu_user");
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser) as User;
          setUser(parsedUser);
          setHighlights(loadHighlightsFromStorage(parsedUser.id));
        } catch {
          // ignore corrupted cookie
        }
      }
      setIsInitialized(true);
      return;
    }

    // Supabase configured: subscribe first — INITIAL_SESSION fires synchronously
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Real Supabase-authenticated user
        const u = session.user;
        const supabaseUser: User = {
          id: u.id,
          email: u.email!,
          name: u.user_metadata?.full_name || u.email!.split("@")[0],
        };
        setUser(supabaseUser);
        setCookie("edu_user", JSON.stringify(supabaseUser));
        saveLastUserId(u.id);
        loadHighlightsForUser(u.id);
        // Sync all Supabase progress to cookie so it's visible after logout
        backupProgressToCookies(u.id);
      } else {
        // No Supabase session — check whether a demo (cookie) user is logged in.
        // We must NOT delete the demo user cookie here, as it belongs to a
        // different auth path (email/name demo login, not Supabase auth).
        const savedUser = getCookie("edu_user");
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser) as User;
            // Only restore if this is a demo user (non-UUID id)
            if (!isSupabaseUUID(parsedUser.id)) {
              setUser(parsedUser);
              setHighlights(loadHighlightsFromStorage(parsedUser.id));
              setIsInitialized(true);
              return;
            }
          } catch {
            // ignore corrupted cookie
          }
        }
        // No valid demo cookie either — fully logged out
        setUser(null);
        setHighlights([]);
        deleteCookie("edu_user");
      }
      setIsInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, [loadHighlightsForUser]);

  const login = useCallback((email: string, name?: string) => {
    const userId = generateUserId(email);
    const newUser: User = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name || email.split("@")[0],
    };
    // Restore any previously saved highlights for this user
    const savedHighlights = loadHighlightsFromStorage(userId);
    setHighlights(savedHighlights);
    setUser(newUser);
    setCookie("edu_user", JSON.stringify(newUser));
    saveLastUserId(userId);
  }, []);

  const logout = useCallback(() => {
    // Backup all Supabase progress to cookie BEFORE signing out (session must still be active).
    // This ensures every module's progress is visible after logout on the same device.
    const userId = user?.id;
    if (userId && isSupabaseUUID(userId)) {
      backupProgressToCookies(userId).finally(() => {
        if (supabase) supabase.auth.signOut();
      });
    } else if (supabase) {
      supabase.auth.signOut();
    }
    setHighlights([]);
    setUser(null);
    deleteCookie("edu_user");
  }, [user]);

  const addHighlight = useCallback(async (highlight: Omit<Highlight, "id" | "createdAt" | "userId">) => {
    if (!user) return;

    // Always add to state immediately so highlighting feels instant
    const tempId = generateId();
    const newHighlight: Highlight = {
      ...highlight,
      id: tempId,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    setHighlights((prev) => {
      const updated = [...prev, newHighlight];
      saveHighlightsToStorage(user.id, updated); // Persist so it survives logout/login
      return updated;
    });

    // Only attempt Supabase for real authenticated users (UUID)
    if (!supabase || !isSupabaseUUID(user.id)) return;

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
      // Replace temp ID with the real Supabase-assigned ID
      setHighlights((prev) => {
        const updated = prev.map((h) =>
          h.id === tempId ? { ...h, id: saved.id, createdAt: saved.created_at } : h
        );
        saveHighlightsToStorage(user.id, updated);
        return updated;
      });
    }
    // If Supabase fails, localStorage already has the highlight — no revert
  }, [user]);

  const removeHighlight = useCallback(async (id: string) => {
    if (!user) return;

    setHighlights((prev) => {
      const updated = prev.filter((h) => !(h.id === id && h.userId === user.id));
      saveHighlightsToStorage(user.id, updated);
      return updated;
    });

    if (supabase && isSupabaseUUID(user.id)) {
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
    clearHighlightsFromStorage(user.id);
    if (supabase && isSupabaseUUID(user.id)) {
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
