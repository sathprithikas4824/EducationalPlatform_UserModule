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
    .order("created_at", { ascending: false });

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
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding highlight:", error);
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
    console.error("Error removing highlight:", error);
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
// MODULE PROGRESS FUNCTIONS (localStorage-based for demo login)
// =============================================

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

// localStorage key for a user's progress
const getProgressKey = (userId: string) => `edu_progress_${userId}`;

// Internal: read all progress entries for a user from localStorage
function readUserProgress(userId: string): TopicProgress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getProgressKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Internal: write all progress entries for a user to localStorage
function writeUserProgress(userId: string, progress: TopicProgress[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getProgressKey(userId), JSON.stringify(progress));
  } catch (e) {
    console.warn("Failed to save progress to localStorage:", e);
  }
}

// Dispatch a custom event so other components (e.g. ModulesSection) can react in realtime
function dispatchProgressEvent(userId: string, topicId: number, moduleId: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PROGRESS_UPDATED_EVENT, {
      detail: { userId, topicId, moduleId },
    })
  );
}

// Mark a topic as completed (or uncompleted) — works with demo login userId
export function markTopicCompleted(
  userId: string,
  topicId: number,
  moduleId: number,
  completed: boolean = true
): TopicProgress | null {
  if (!userId) return null;

  const all = readUserProgress(userId);
  const now = new Date().toISOString();

  const existingIndex = all.findIndex(
    (p) => p.topic_id === topicId && p.user_id === userId
  );

  const entry: TopicProgress = {
    id: existingIndex >= 0 ? all[existingIndex].id : `${userId}_${topicId}_${Date.now()}`,
    user_id: userId,
    topic_id: topicId,
    module_id: moduleId,
    completed,
    completed_at: completed ? now : null,
    created_at: existingIndex >= 0 ? all[existingIndex].created_at : now,
    updated_at: now,
  };

  if (existingIndex >= 0) {
    all[existingIndex] = entry;
  } else {
    all.push(entry);
  }

  writeUserProgress(userId, all);
  dispatchProgressEvent(userId, topicId, moduleId);
  return entry;
}

// Get progress for a specific module
export function getModuleProgress(
  userId: string,
  moduleId: number,
  totalTopics: number
): ModuleProgress {
  if (!userId) {
    return { module_id: moduleId, total_topics: totalTopics, completed_topics: 0, completion_percentage: 0 };
  }

  const all = readUserProgress(userId);
  const completedTopics = all.filter(
    (p) => p.module_id === moduleId && p.completed
  ).length;
  const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return {
    module_id: moduleId,
    total_topics: totalTopics,
    completed_topics: completedTopics,
    completion_percentage: percentage,
  };
}

// Get all completed progress entries for a user
export function getAllModulesProgress(userId: string): TopicProgress[] {
  if (!userId) return [];
  return readUserProgress(userId).filter((p) => p.completed);
}

// Get completed topic IDs for a specific module
export function getCompletedTopics(userId: string, moduleId: number): number[] {
  if (!userId) return [];
  return readUserProgress(userId)
    .filter((p) => p.module_id === moduleId && p.completed)
    .map((p) => p.topic_id);
}

// =============================================
// SCROLL POSITION FUNCTIONS (localStorage-based)
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

// Reset all progress for a specific module (removes entries from localStorage)
export function resetModuleProgress(userId: string, moduleId: number): void {
  if (!userId) return;
  const all = readUserProgress(userId);
  const filtered = all.filter((p) => p.module_id !== moduleId);
  writeUserProgress(userId, filtered);
  dispatchProgressEvent(userId, 0, moduleId);
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
