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
import GoogleLoginPopup from "./GoogleLoginPopup";

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
  syncHighlightsToSupabase: () => Promise<number>; // returns count synced
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

// Scans ALL edu_highlights_* keys (handles demo→Supabase user migration)
const loadHighlightsFromAllStorageKeys = (): Highlight[] => {
  if (typeof window === "undefined") return [];
  try {
    const all: Highlight[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("edu_highlights_")) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) all.push(...(JSON.parse(raw) as Highlight[]));
        } catch { /* skip malformed entry */ }
      }
    }
    // Deduplicate by text + pageId (same highlight may exist under multiple keys)
    const seen = new Set<string>();
    return all.filter((h) => {
      const sig = `${h.pageId}::${h.startOffset}::${h.endOffset}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  } catch {
    return [];
  }
};

const clearHighlightsFromStorage = (userId: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getHighlightsKey(userId));
  } catch (_) {
    // ignore
  }
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
  const [highlightModeEnabled, setHighlightModeEnabled] = useState(false);

  const toggleHighlightMode = useCallback(() => {
    setHighlightModeEnabled((prev) => !prev);
  }, []);

  // Push a batch of local highlights straight to Supabase using userId directly
  // (avoids calling getUser() internally which can fail due to timing).
  const migrateHighlightsToSupabase = useCallback(async (
    userId: string,
    items: Highlight[]
  ): Promise<Highlight[]> => {
    if (!supabase || items.length === 0) return items;
    const migrated: Highlight[] = [];
    for (const h of items) {
      try {
        const { data: saved, error } = await supabase
          .from("highlights")
          .insert({
            user_id: userId,
            page_id: h.pageId,
            text: h.text,
            start_offset: h.startOffset,
            end_offset: h.endOffset,
            color: h.color,
            prefix_context: h.prefixContext ?? null,
            suffix_context: h.suffixContext ?? null,
          })
          .select()
          .single();
        if (saved) {
          migrated.push(mapSupabaseHighlight(saved as SupabaseHighlight, userId));
        } else {
          console.warn("Highlight migration failed:", error?.message);
          migrated.push(h);
        }
      } catch (e) {
        console.warn("Highlight migration error:", e);
        migrated.push(h);
      }
    }
    return migrated;
  }, []);

  // Load highlights for a Supabase user — tries Supabase first, falls back to localStorage.
  // Also scans ALL edu_highlights_* keys so demo-user highlights are migrated after sign-up.
  const loadHighlightsForUser = useCallback(async (userId: string) => {
    if (!supabase) return;
    const data = await getAllUserHighlights();
    if (data.length > 0) {
      const mapped = data.map((h) => mapSupabaseHighlight(h, userId));
      setHighlights(mapped);
      saveHighlightsToStorage(userId, mapped);
      return;
    }

    // Supabase empty — gather from localStorage.
    // First try the exact UUID key, then fall back to ALL edu_highlights_* keys
    // (covers the case where highlights were created under a demo/cookie user ID).
    let cached = loadHighlightsFromStorage(userId);
    if (cached.length === 0) {
      cached = loadHighlightsFromAllStorageKeys();
    }
    setHighlights(cached);

    // Migrate to Supabase using direct insert (bypasses internal getUser() timing issues)
    if (cached.length > 0) {
      const migrated = await migrateHighlightsToSupabase(userId, cached);
      setHighlights(migrated);
      saveHighlightsToStorage(userId, migrated);
    }
  }, [migrateHighlightsToSupabase]);

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
        // Persist name+email so the login popup can show "Continue as…" on next visit
        try { localStorage.setItem("edu_last_login", JSON.stringify({ name: supabaseUser.name, email: supabaseUser.email })); } catch { /* ignore */ }
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

  // Manual sync: push all localStorage highlights to Supabase. Returns count synced.
  const syncHighlightsToSupabase = useCallback(async (): Promise<number> => {
    if (!user || !supabase || !isSupabaseUUID(user.id)) return 0;

    // Gather all local highlights (all keys)
    let local = loadHighlightsFromStorage(user.id);
    if (local.length === 0) local = loadHighlightsFromAllStorageKeys();
    if (local.length === 0) return 0;

    // Fetch what's already in Supabase to avoid duplicates
    const existing = await getAllUserHighlights();
    const existingSigs = new Set(
      existing.map((h) => `${h.page_id}::${h.start_offset}::${h.end_offset}`)
    );
    const toSync = local.filter(
      (h) => !existingSigs.has(`${h.pageId}::${h.startOffset}::${h.endOffset}`)
    );

    if (toSync.length === 0) return 0;

    const migrated = await migrateHighlightsToSupabase(user.id, toSync);
    const successCount = migrated.filter((h) => !toSync.includes(h)).length;

    // Reload fresh from Supabase
    const fresh = await getAllUserHighlights();
    if (fresh.length > 0) {
      const mapped = fresh.map((h) => mapSupabaseHighlight(h, user.id));
      setHighlights(mapped);
      saveHighlightsToStorage(user.id, mapped);
    }

    return successCount || toSync.length;
  }, [user, migrateHighlightsToSupabase]);

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
        syncHighlightsToSupabase,
      }}
    >
      {children}
      <GoogleLoginPopup isLoggedIn={!!user} />
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
