// Notes utility — Supabase-first with localStorage fallback (same pattern as bookmarks.ts)

import { supabase } from "./supabase";
import { sanitiseText } from "./sanitise";

export interface NoteRecord {
  id: string;
  userId: string;
  topicId: number;
  topicName: string;
  moduleId?: number;
  moduleName?: string;
  content: string;
  notionPageId?: string;
  syncedToNotion: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // soft delete timestamp — undefined means active
}

function isSupabaseUserId(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

const getNotesKey = (userId: string) => `edu_notes_${userId}`;

function rowToRecord(row: Record<string, unknown>): NoteRecord {
  return {
    id:              row.id               as string,
    userId:          row.user_id          as string,
    topicId:         row.topic_id         as number,
    topicName:       row.topic_name       as string,
    moduleId:        row.module_id        as number | undefined,
    moduleName:      row.module_name      as string | undefined,
    content:         row.content          as string,
    notionPageId:    row.notion_page_id   as string | undefined,
    syncedToNotion:  row.synced_to_notion as boolean,
    createdAt:       row.created_at       as string,
    updatedAt:       row.updated_at       as string,
    deletedAt:       row.deleted_at       as string | undefined,
  };
}

function localLoad(userId: string): NoteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getNotesKey(userId));
    return raw ? (JSON.parse(raw) as NoteRecord[]) : [];
  } catch {
    return [];
  }
}

function localSave(userId: string, records: NoteRecord[]): void {
  try {
    localStorage.setItem(getNotesKey(userId), JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

export async function getNoteForTopic(userId: string, topicId: number): Promise<NoteRecord | null> {
  if (typeof window === "undefined") return null;

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .maybeSingle();
      if (!error) return data ? rowToRecord(data as Record<string, unknown>) : null;
      console.warn("Supabase getNoteForTopic failed, using localStorage:", error.message);
    }
  }

  return localLoad(userId).find((n) => n.topicId === topicId) ?? null;
}

export async function upsertNote(
  userId: string,
  topicId: number,
  topicName: string,
  content: string,
  opts?: {
    moduleId?: number;
    moduleName?: string;
    notionPageId?: string;
    syncedToNotion?: boolean;
  }
): Promise<NoteRecord> {
  const now = new Date().toISOString();
  const cleanContent = sanitiseText(content);

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("notes")
        .upsert(
          {
            user_id:          userId,
            topic_id:         topicId,
            topic_name:       topicName,
            module_id:        opts?.moduleId   ?? null,
            module_name:      opts?.moduleName ?? null,
            content:          cleanContent,
            notion_page_id:   opts?.notionPageId   ?? null,
            synced_to_notion: opts?.syncedToNotion ?? false,
            updated_at:       now,
          },
          { onConflict: "user_id,topic_id" }
        )
        .select()
        .single();
      if (!error && data) return rowToRecord(data as Record<string, unknown>);
      console.warn("Supabase upsertNote failed, using localStorage:", error?.message);
    }
  }

  // localStorage fallback
  const notes  = localLoad(userId);
  const existing = notes.find((n) => n.topicId === topicId);
  const record: NoteRecord = existing
    ? {
        ...existing,
        content:   cleanContent,
        updatedAt: now,
        ...(opts?.notionPageId   !== undefined && { notionPageId:   opts.notionPageId }),
        ...(opts?.syncedToNotion !== undefined && { syncedToNotion: opts.syncedToNotion }),
      }
    : {
        id:             Math.random().toString(36).slice(2) + Date.now().toString(36),
        userId,
        topicId,
        topicName,
        moduleId:        opts?.moduleId,
        moduleName:      opts?.moduleName,
        content:         cleanContent,
        notionPageId:    opts?.notionPageId,
        syncedToNotion:  opts?.syncedToNotion ?? false,
        createdAt:       now,
        updatedAt:       now,
      };

  localSave(userId, [...notes.filter((n) => n.topicId !== topicId), record]);
  return record;
}

export async function getAllNotes(userId: string): Promise<NoteRecord[]> {
  if (typeof window === "undefined") return [];

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (!error) return (data || []).map((r) => rowToRecord(r as Record<string, unknown>));
      console.warn("Supabase getAllNotes failed, using localStorage:", error.message);
    }
  }

  return localLoad(userId)
    .filter((n) => !n.deletedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getNotesPaginated(
  userId: string,
  page: number = 0,
  pageSize: number = 10
): Promise<{ notes: NoteRecord[]; hasMore: boolean }> {
  if (typeof window === "undefined") return { notes: [], hasMore: false };

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const from = page * pageSize;
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .range(from, from + pageSize); // fetch one extra to detect hasMore
      if (!error && data) {
        return {
          notes:   data.slice(0, pageSize).map((r) => rowToRecord(r as Record<string, unknown>)),
          hasMore: data.length > pageSize,
        };
      }
    }
  }

  // localStorage fallback — paginate in memory (exclude soft-deleted)
  const all = localLoad(userId)
    .filter((n) => !n.deletedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const start = page * pageSize;
  return {
    notes:   all.slice(start, start + pageSize),
    hasMore: all.length > start + pageSize,
  };
}

// Soft delete — sets deleted_at timestamp. Data is NEVER removed from the database.
export async function deleteNote(userId: string, topicId: number): Promise<void> {
  const now = new Date().toISOString();
  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("notes")
        .update({ deleted_at: now })
        .eq("user_id", userId)
        .eq("topic_id", topicId);
      return;
    }
  }
  // localStorage: mark as deleted — do NOT remove from array
  localSave(userId, localLoad(userId).map((n) =>
    n.topicId === topicId ? { ...n, deletedAt: now } : n
  ));
}

// Restore a soft-deleted note — clears the deleted_at timestamp.
export async function restoreNote(userId: string, topicId: number): Promise<void> {
  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("notes")
        .update({ deleted_at: null })
        .eq("user_id", userId)
        .eq("topic_id", topicId);
      return;
    }
  }
  localSave(userId, localLoad(userId).map((n) =>
    n.topicId === topicId ? { ...n, deletedAt: undefined } : n
  ));
}

// Get all soft-deleted notes for the trash view.
export async function getDeletedNotes(userId: string): Promise<NoteRecord[]> {
  if (typeof window === "undefined") return [];
  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (!error) return (data || []).map((r) => rowToRecord(r as Record<string, unknown>));
    }
  }
  return localLoad(userId)
    .filter((n) => !!n.deletedAt)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}
