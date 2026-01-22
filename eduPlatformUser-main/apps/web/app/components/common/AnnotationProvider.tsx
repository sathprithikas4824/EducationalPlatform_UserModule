"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  login: (email: string, name?: string) => void;
  logout: () => void;
  addHighlight: (highlight: Omit<Highlight, "id" | "createdAt" | "userId">) => void;
  removeHighlight: (id: string) => void;
  getHighlightsForPage: (pageId: string) => Highlight[];
  clearAllHighlights: () => void;
}

const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined);

// Cookie version - increment this to clear old data
const COOKIE_VERSION = "v2";

// Cookie helper functions with cross-browser support
const setCookie = (name: string, value: string, days: number = 30) => {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    // Add SameSite=Lax for cross-browser compatibility
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
    // Delete with multiple path variations for cross-browser support
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  } catch (e) {
    console.warn("Failed to delete cookie:", e);
  }
};

// Clear all old highlight cookies (migration helper)
const clearOldCookies = () => {
  if (typeof document === "undefined") return;
  try {
    const cookies = document.cookie.split(";");
    cookies.forEach(cookie => {
      const name = cookie.split("=")[0].trim();
      // Clear old format cookies (edu_hl_ without version prefix)
      if (name.startsWith("edu_hl_") && !name.includes(COOKIE_VERSION)) {
        deleteCookie(name);
      }
    });
  } catch (e) {
    console.warn("Failed to clear old cookies:", e);
  }
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Generate user ID from email
const generateUserId = (email: string) => {
  return btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16);
};

// Get highlight cookie key with version
const getHighlightCookieKey = (userId: string) => `edu_hl_${COOKIE_VERSION}_${userId}`;

export const AnnotationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user and highlights from cookies on mount
  useEffect(() => {
    // Clear old cookies without version prefix
    clearOldCookies();

    const savedUser = getCookie("edu_user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Load highlights ONLY for this specific user (with version prefix)
        const savedHighlights = getCookie(getHighlightCookieKey(parsedUser.id));
        if (savedHighlights) {
          const parsed = JSON.parse(savedHighlights);
          // Filter to ensure only this user's highlights and valid data
          const userHighlights = Array.isArray(parsed)
            ? parsed.filter((h: Highlight) => h.userId === parsedUser.id && h.id && h.text)
            : [];
          setHighlights(userHighlights);
        } else {
          setHighlights([]);
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
        setHighlights([]);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save highlights to cookies whenever they change (only if initialized)
  useEffect(() => {
    if (user && isInitialized) {
      // Only save highlights that belong to current user
      const userHighlights = highlights.filter(h => h.userId === user.id);
      setCookie(getHighlightCookieKey(user.id), JSON.stringify(userHighlights));
    }
  }, [highlights, user, isInitialized]);

  const login = useCallback((email: string, name?: string) => {
    const userId = generateUserId(email);
    const newUser: User = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name || email.split("@")[0],
    };

    // Clear current highlights before loading new user's data
    setHighlights([]);
    setUser(newUser);
    setCookie("edu_user", JSON.stringify(newUser));

    // Load existing highlights for this specific user (with version prefix)
    const savedHighlights = getCookie(getHighlightCookieKey(userId));
    if (savedHighlights) {
      try {
        const parsed = JSON.parse(savedHighlights);
        // Double check: only load highlights belonging to this user and valid data
        const userHighlights = Array.isArray(parsed)
          ? parsed.filter((h: Highlight) => h.userId === userId && h.id && h.text)
          : [];
        setHighlights(userHighlights);
      } catch (e) {
        setHighlights([]);
      }
    } else {
      setHighlights([]);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear highlights from state only (keep in cookie for when user logs back in)
    setHighlights([]);
    setUser(null);
    deleteCookie("edu_user");
  }, []);

  const addHighlight = useCallback((highlight: Omit<Highlight, "id" | "createdAt" | "userId">) => {
    if (!user) return;

    const newHighlight: Highlight = {
      ...highlight,
      id: generateId(),
      userId: user.id, // Always attach current user's ID
      createdAt: new Date().toISOString(),
    };

    setHighlights((prev) => {
      const updated = [...prev, newHighlight];
      // Immediately persist to cookie for reliability
      setCookie(getHighlightCookieKey(user.id), JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const removeHighlight = useCallback((id: string) => {
    if (!user) return;
    // Only remove if it belongs to current user
    setHighlights((prev) => {
      const updated = prev.filter((h) => !(h.id === id && h.userId === user.id));
      // Immediately persist to cookie for reliability
      setCookie(getHighlightCookieKey(user.id), JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  const getHighlightsForPage = useCallback((pageId: string) => {
    if (!user) return [];
    // Only return highlights for current user AND current page
    return highlights.filter((h) => h.pageId === pageId && h.userId === user.id);
  }, [highlights, user]);

  // Clear all highlights for current user (removes from state and cookie)
  const clearAllHighlights = useCallback(() => {
    if (!user) return;
    setHighlights([]);
    deleteCookie(getHighlightCookieKey(user.id));
  }, [user]);

  return (
    <AnnotationContext.Provider
      value={{
        user,
        highlights,
        isLoggedIn: !!user,
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
