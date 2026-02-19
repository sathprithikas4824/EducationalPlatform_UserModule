import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Get these from your Supabase project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);

// Types for the database
export interface Highlight {
  id: string;
  user_id: string;
  page_id: string;
  text: string;
  start_offset: number;
  end_offset: number;
  color: string;
  prefix_context?: string;
  suffix_context?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// HIGHLIGHT FUNCTIONS
// =============================================

// Get all highlights for current user on a specific page
export async function getHighlights(pageId: string): Promise<Highlight[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .eq("user_id", user.id)
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching highlights:", error);
    return [];
  }

  return data || [];
}

// Get all highlights for current user (all pages)
export async function getAllUserHighlights(): Promise<Highlight[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching highlights:", error);
    return [];
  }

  return data || [];
}

// Add a new highlight
export async function addHighlight(highlight: {
  pageId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  prefixContext?: string;
  suffixContext?: string;
}): Promise<Highlight | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("highlights")
    .insert({
      user_id: user.id,
      page_id: highlight.pageId,
      text: highlight.text,
      start_offset: highlight.startOffset,
      end_offset: highlight.endOffset,
      color: highlight.color,
      prefix_context: highlight.prefixContext,
      suffix_context: highlight.suffixContext,
    })
    .select()
    .single();

  if (error) {
    console.warn(
      "Could not sync highlight to Supabase (saved locally):",
      error.message || "Unknown error",
      error.code ? `[${error.code}]` : "",
      error.details || "",
      error.hint || ""
    );
    return null;
  }

  return data;
}

// Remove a highlight
export async function removeHighlight(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("highlights")
    .delete()
    .eq("id", id);

  if (error) {
    console.warn(
      "Could not remove highlight from Supabase:",
      error.message || "Unknown error",
      error.code ? `[${error.code}]` : "",
      error.details || "",
      error.hint || ""
    );
    return false;
  }

  return true;
}

// Update highlight color
export async function updateHighlightColor(id: string, color: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("highlights")
    .update({ color })
    .eq("id", id);

  if (error) {
    console.error("Error updating highlight:", error);
    return false;
  }

  return true;
}

// Delete all highlights for a user
export async function deleteAllUserHighlights(): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("highlights")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting all highlights:", error);
    return false;
  }

  return true;
}

// =============================================
// AUTH FUNCTIONS
// =============================================

// Sign up with email
export async function signUp(email: string, password: string, fullName?: string) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { data, error };
}

// Sign in with email
export async function signIn(email: string, password: string) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

// Sign in with OAuth (Google, GitHub, etc.)
export async function signInWithOAuth(provider: "google" | "github") {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { data, error };
}

// Sign out
export async function signOut() {
  if (!supabase) return { error: new Error("Supabase not configured") };
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Get current user
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get current session
export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// =============================================
// PROFILE FUNCTIONS
// =============================================

// Get user profile
export async function getProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

// Update user profile
export async function updateProfile(updates: Partial<Profile>): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return false;
  }

  return true;
}

// =============================================
// MODULE PROGRESS FUNCTIONS (Supabase + Cookie fallback)
// =============================================

// ---- Cookie helpers for progress persistence (browser-only) ----
// Used as fallback when Supabase is unavailable or user is in demo/cookie mode.

interface CookieProgressEntry {
  module_id: number;
  completed_at: string;
}

function getProgressCookieName(userId: string) {
  return `edu_progress_${userId}`;
}

function readProgressCookie(userId: string): Record<string, CookieProgressEntry> {
  if (typeof document === "undefined") return {};
  try {
    const name = getProgressCookieName(userId) + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      const c = ca[i].trim();
      if (c.indexOf(name) === 0) {
        return JSON.parse(decodeURIComponent(c.substring(name.length)));
      }
    }
    return {};
  } catch {
    return {};
  }
}

function writeProgressCookie(userId: string, map: Record<string, CookieProgressEntry>): void {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    document.cookie = `${getProgressCookieName(userId)}=${encodeURIComponent(JSON.stringify(map))};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {
    console.warn("Failed to write progress cookie:", e);
  }
}

function deleteProgressCookie(userId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${getProgressCookieName(userId)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

// Returns true if userId looks like a real Supabase UUID (not a demo user ID)
function isSupabaseUserId(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

// Build TopicProgress objects from the cookie map
function cookieMapToProgressList(userId: string, map: Record<string, CookieProgressEntry>): TopicProgress[] {
  return Object.entries(map).map(([topicIdStr, entry]) => ({
    id: `cookie-${userId}-${topicIdStr}`,
    user_id: userId,
    topic_id: Number(topicIdStr),
    module_id: entry.module_id,
    completed: true,
    completed_at: entry.completed_at,
    created_at: entry.completed_at,
    updated_at: entry.completed_at,
  }));
}

// Clear all progress cookies for a user (call on logout)
export function clearProgressCookie(userId: string): void {
  deleteProgressCookie(userId);
}

export interface TopicProgress {
  id: string;
  user_id: string;
  topic_id: number;
  module_id: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleProgress {
  module_id: number;
  total_topics: number;
  completed_topics: number;
  completion_percentage: number;
}

// Custom event name for cross-component realtime progress updates
export const PROGRESS_UPDATED_EVENT = "edu-progress-updated";

// Dispatch a custom event so other components (e.g. ModulesSection) can react in realtime
function dispatchProgressEvent(userId: string, topicId: number, moduleId: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PROGRESS_UPDATED_EVENT, {
      detail: { userId, topicId, moduleId },
    })
  );
}

// Mark a topic as completed (or uncompleted) — Supabase for real users, cookies for demo users
export async function markTopicCompleted(
  userId: string,
  topicId: number,
  moduleId: number,
  completed: boolean = true
): Promise<TopicProgress | null> {
  if (!userId) return null;

  const now = new Date().toISOString();

  // Use Supabase for real authenticated users (UUID)
  if (supabase && isSupabaseUserId(userId)) {
    const { data, error } = await supabase
      .from("user_topic_progress")
      .upsert(
        {
          user_id: userId,
          topic_id: topicId,
          module_id: moduleId,
          completed,
          completed_at: completed ? now : null,
          updated_at: now,
        },
        { onConflict: "user_id,topic_id" }
      )
      .select()
      .single();

    if (!error) {
      // Also write to cookie so progress is visible after logout (same device)
      const map = readProgressCookie(userId);
      if (completed) {
        map[String(topicId)] = { module_id: moduleId, completed_at: now };
      } else {
        delete map[String(topicId)];
      }
      writeProgressCookie(userId, map);
      dispatchProgressEvent(userId, topicId, moduleId);
      return data;
    }
    console.warn("Supabase markTopicCompleted failed, falling back to cookie:", error.message);
  }

  // Cookie-based fallback (demo/cookie login users or Supabase unavailable)
  const map = readProgressCookie(userId);
  if (completed) {
    map[String(topicId)] = { module_id: moduleId, completed_at: now };
  } else {
    delete map[String(topicId)];
  }
  writeProgressCookie(userId, map);
  dispatchProgressEvent(userId, topicId, moduleId);

  return {
    id: `cookie-${userId}-${topicId}`,
    user_id: userId,
    topic_id: topicId,
    module_id: moduleId,
    completed,
    completed_at: completed ? now : null,
    created_at: now,
    updated_at: now,
  };
}

// Get progress for a specific module
export async function getModuleProgress(
  userId: string,
  moduleId: number,
  totalTopics: number
): Promise<ModuleProgress> {
  const empty = { module_id: moduleId, total_topics: totalTopics, completed_topics: 0, completion_percentage: 0 };
  if (!userId) return empty;

  if (supabase && isSupabaseUserId(userId)) {
    // Only query Supabase when a session is active — after logout RLS returns
    // empty results (no error), which would hide the cookie-based progress.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("user_topic_progress")
        .select("topic_id")
        .eq("user_id", userId)
        .eq("module_id", moduleId)
        .eq("completed", true);

      if (!error) {
        const completedTopics = (data || []).length;
        const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
        return { module_id: moduleId, total_topics: totalTopics, completed_topics: completedTopics, completion_percentage: percentage };
      }
    }
  }

  // Cookie fallback
  const map = readProgressCookie(userId);
  const completedTopics = Object.values(map).filter((e) => e.module_id === moduleId).length;
  const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  return { module_id: moduleId, total_topics: totalTopics, completed_topics: completedTopics, completion_percentage: percentage };
}

// Get all completed progress entries for a user (across all modules)
export async function getAllModulesProgress(userId: string): Promise<TopicProgress[]> {
  if (!userId) return [];

  if (supabase && isSupabaseUserId(userId)) {
    // Only query Supabase when a session is active — after logout RLS returns
    // empty results (no error), which would hide the cookie-based progress.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("user_topic_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", true);

      if (!error) return data || [];
      console.warn("Supabase getAllModulesProgress failed, falling back to cookie:", error.message);
    }
  }

  // Cookie fallback (no active session, demo user, or Supabase unavailable)
  const map = readProgressCookie(userId);
  return cookieMapToProgressList(userId, map);
}

// Get completed topic IDs for a specific module
export async function getCompletedTopics(userId: string, moduleId: number): Promise<number[]> {
  if (!userId) return [];

  if (supabase && isSupabaseUserId(userId)) {
    // Only query Supabase when a session is active — after logout RLS returns
    // empty results (no error), which would hide the cookie-based progress.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("user_topic_progress")
        .select("topic_id")
        .eq("user_id", userId)
        .eq("module_id", moduleId)
        .eq("completed", true);

      if (!error) return (data || []).map((p) => p.topic_id);
      console.warn("Supabase getCompletedTopics failed, falling back to cookie:", error.message);
    }
  }

  // Cookie fallback
  const map = readProgressCookie(userId);
  return Object.entries(map)
    .filter(([, entry]) => entry.module_id === moduleId)
    .map(([topicIdStr]) => Number(topicIdStr));
}

// Reset progress for a single topic
export async function resetTopicProgress(userId: string, topicId: number, moduleId: number): Promise<void> {
  if (!userId) return;

  if (supabase && isSupabaseUserId(userId)) {
    const { error } = await supabase
      .from("user_topic_progress")
      .delete()
      .eq("user_id", userId)
      .eq("topic_id", topicId);

    if (!error) {
      // Also clear from cookie so post-logout view stays consistent
      const map = readProgressCookie(userId);
      delete map[String(topicId)];
      writeProgressCookie(userId, map);
      dispatchProgressEvent(userId, topicId, moduleId);
      return;
    }
    console.warn("Supabase resetTopicProgress failed, falling back to cookie:", error.message);
  }

  // Cookie fallback
  const map = readProgressCookie(userId);
  delete map[String(topicId)];
  writeProgressCookie(userId, map);
  dispatchProgressEvent(userId, topicId, moduleId);
}

// Reset all progress for a specific module
export async function resetModuleProgress(userId: string, moduleId: number): Promise<void> {
  if (!userId) return;

  if (supabase && isSupabaseUserId(userId)) {
    const { error } = await supabase
      .from("user_topic_progress")
      .delete()
      .eq("user_id", userId)
      .eq("module_id", moduleId);

    if (!error) {
      // Also clear from cookie so post-logout view stays consistent
      const map = readProgressCookie(userId);
      for (const key of Object.keys(map)) {
        if (map[key].module_id === moduleId) delete map[key];
      }
      writeProgressCookie(userId, map);
      dispatchProgressEvent(userId, 0, moduleId);
      return;
    }
    console.warn("Supabase resetModuleProgress failed, falling back to cookie:", error.message);
  }

  // Cookie fallback
  const map = readProgressCookie(userId);
  for (const key of Object.keys(map)) {
    if (map[key].module_id === moduleId) delete map[key];
  }
  writeProgressCookie(userId, map);
  dispatchProgressEvent(userId, 0, moduleId);
}

// Fetch all completed progress from Supabase and write to cookie.
// Call this on login (to sync historical data) and before logout (safety net),
// so progress is always visible on the same device even after logout.
export async function backupProgressToCookies(userId: string): Promise<void> {
  if (!supabase || !isSupabaseUserId(userId)) return;
  try {
    const { data, error } = await supabase
      .from("user_topic_progress")
      .select("topic_id, module_id, completed_at")
      .eq("user_id", userId)
      .eq("completed", true);

    if (error || !data || data.length === 0) return;

    const map: Record<string, CookieProgressEntry> = {};
    data.forEach((p: { topic_id: number; module_id: number; completed_at: string | null }) => {
      map[String(p.topic_id)] = {
        module_id: p.module_id,
        completed_at: p.completed_at || new Date().toISOString(),
      };
    });
    writeProgressCookie(userId, map);
  } catch {
    // Silently ignore — cookies are best-effort backup
  }
}

// =============================================
// LAST USER ID COOKIE (persists across logout so progress stays visible)
// =============================================

const LAST_USER_ID_KEY = "edu_last_user_id";

export function saveLastUserId(userId: string): void {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
    document.cookie = `${LAST_USER_ID_KEY}=${encodeURIComponent(userId)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch {}
}

export function getLastUserId(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const nameEQ = `${LAST_USER_ID_KEY}=`;
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      const c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================
// SCROLL POSITION FUNCTIONS (localStorage-based UI state)
// =============================================

const getScrollKey = (userId: string) => `edu_scroll_${userId}`;

// Save the scroll progress percentage for a topic so we can restore it later
export function saveTopicScrollPosition(userId: string, topicId: number, progressPercent: number): void {
  if (!userId || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(getScrollKey(userId));
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[String(topicId)] = progressPercent;
    localStorage.setItem(getScrollKey(userId), JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to save scroll position:", e);
  }
}

// Get the saved scroll progress percentage for a topic
export function getTopicScrollPosition(userId: string, topicId: number): number {
  if (!userId || typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(getScrollKey(userId));
    if (!raw) return 0;
    const map: Record<string, number> = JSON.parse(raw);
    return map[String(topicId)] || 0;
  } catch {
    return 0;
  }
}

// Clear saved scroll positions for all topics in a module
export function clearModuleScrollPositions(userId: string, topicIds: number[]): void {
  if (!userId || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(getScrollKey(userId));
    if (!raw) return;
    const map: Record<string, number> = JSON.parse(raw);
    for (const id of topicIds) {
      delete map[String(id)];
    }
    localStorage.setItem(getScrollKey(userId), JSON.stringify(map));
  } catch {}
}

// =============================================
// REALTIME SUBSCRIPTION (Optional)
// =============================================

// Subscribe to highlight changes for a page
export function subscribeToHighlights(
  pageId: string,
  callback: (highlights: Highlight[]) => void
) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`highlights:${pageId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "highlights",
        filter: `page_id=eq.${pageId}`,
      },
      async () => {
        // Refetch highlights when changes occur
        const highlights = await getHighlights(pageId);
        callback(highlights);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
