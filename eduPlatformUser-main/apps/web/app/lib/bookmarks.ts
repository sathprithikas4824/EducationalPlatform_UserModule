// ── Bookmarks Utility ─────────────────────────────────────────────────────────
// Stores per-user bookmarks in Supabase (real users) with localStorage fallback.

import { supabase } from "./supabase";

export type BookmarkType = "module" | "topic";

export interface BookmarkRecord {
  id: string;
  userId: string;
  type: BookmarkType;
  // Module info (always present)
  moduleId: number;
  moduleName: string;
  moduleImageUrl?: string | null;
  // Topic info (only for type="topic")
  topicId?: number;
  topicName?: string;
  bookmarkedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const getBookmarksKey = (userId: string) => `edu_bookmarks_${userId}`;

function isSupabaseUserId(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

function rowToRecord(row: Record<string, unknown>): BookmarkRecord {
  return {
    id:             row.id             as string,
    userId:         row.user_id        as string,
    type:           row.type           as BookmarkType,
    moduleId:       row.module_id      as number,
    moduleName:     row.module_name    as string,
    moduleImageUrl: row.module_image_url as string | null | undefined,
    topicId:        row.topic_id       as number | undefined,
    topicName:      row.topic_name     as string | undefined,
    bookmarkedAt:   row.bookmarked_at  as string,
  };
}

// ── localStorage fallback helpers ──────────────────────────────────────────────

function localLoad(userId: string): BookmarkRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getBookmarksKey(userId));
    return raw ? (JSON.parse(raw) as BookmarkRecord[]) : [];
  } catch {
    return [];
  }
}

function localSave(userId: string, records: BookmarkRecord[]): void {
  try {
    localStorage.setItem(getBookmarksKey(userId), JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function loadBookmarks(userId: string): Promise<BookmarkRecord[]> {
  if (typeof window === "undefined") return [];

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("user_bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("bookmarked_at", { ascending: false });

      if (!error) return (data || []).map((r) => rowToRecord(r as Record<string, unknown>));
      console.warn("Supabase loadBookmarks failed, using localStorage:", error.message);
    }
  }

  return localLoad(userId);
}

export async function addBookmark(
  userId: string,
  record: Omit<BookmarkRecord, "id" | "userId" | "bookmarkedAt">
): Promise<BookmarkRecord> {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const bookmarkedAt = new Date().toISOString();
  const newRecord: BookmarkRecord = { ...record, id, userId, bookmarkedAt };

  if (supabase && isSupabaseUserId(userId)) {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .upsert(
        {
          id,
          user_id:          userId,
          type:             record.type,
          module_id:        record.moduleId,
          module_name:      record.moduleName,
          module_image_url: record.moduleImageUrl ?? null,
          topic_id:         record.topicId ?? null,
          topic_name:       record.topicName ?? null,
          bookmarked_at:    bookmarkedAt,
        },
        { onConflict: "user_id,type,module_id,topic_id" }
      )
      .select()
      .single();

    if (!error && data) return rowToRecord(data as Record<string, unknown>);
    console.warn("Supabase addBookmark failed, using localStorage:", error?.message);
  }

  const existing = localLoad(userId);
  const filtered = existing.filter(
    (b) =>
      !(
        b.type === record.type &&
        b.moduleId === record.moduleId &&
        b.topicId === record.topicId
      )
  );
  localSave(userId, [...filtered, newRecord]);
  return newRecord;
}

export async function removeBookmark(userId: string, bookmarkId: string): Promise<void> {
  if (supabase && isSupabaseUserId(userId)) {
    const { error } = await supabase
      .from("user_bookmarks")
      .delete()
      .eq("id", bookmarkId)
      .eq("user_id", userId);

    if (!error) return;
    console.warn("Supabase removeBookmark failed, using localStorage:", error.message);
  }

  const existing = localLoad(userId);
  localSave(userId, existing.filter((b) => b.id !== bookmarkId));
}

// Toggle bookmark — returns true if now bookmarked, false if removed
export async function toggleBookmark(
  userId: string,
  record: Omit<BookmarkRecord, "id" | "userId" | "bookmarkedAt">
): Promise<boolean> {
  // Check current state from Supabase or localStorage
  const bookmarks = await loadBookmarks(userId);
  const existing = bookmarks.find(
    (b) =>
      b.type === record.type &&
      b.moduleId === record.moduleId &&
      b.topicId === record.topicId
  );
  if (existing) {
    await removeBookmark(userId, existing.id);
    return false;
  } else {
    await addBookmark(userId, record);
    return true;
  }
}

export async function isItemBookmarked(
  userId: string,
  type: BookmarkType,
  moduleId: number,
  topicId?: number
): Promise<boolean> {
  const bookmarks = await loadBookmarks(userId);
  return bookmarks.some(
    (b) =>
      b.type === type &&
      b.moduleId === moduleId &&
      b.topicId === topicId
  );
}
