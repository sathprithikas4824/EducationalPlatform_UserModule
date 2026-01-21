import { createClient } from "@supabase/supabase-js";

// Get these from your Supabase project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

// Sign in with OAuth (Google, GitHub, etc.)
export async function signInWithOAuth(provider: "google" | "github") {
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
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get current session
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// =============================================
// PROFILE FUNCTIONS
// =============================================

// Get user profile
export async function getProfile(): Promise<Profile | null> {
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
// REALTIME SUBSCRIPTION (Optional)
// =============================================

// Subscribe to highlight changes for a page
export function subscribeToHighlights(
  pageId: string,
  callback: (highlights: Highlight[]) => void
) {
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
