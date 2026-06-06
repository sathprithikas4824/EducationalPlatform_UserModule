// AI Summary persistence — Supabase-first with localStorage fallback (same pattern as notes.ts)

import { supabase } from "./supabase";

export interface SummaryRecord {
  id: string;
  userId: string;
  topicId: number;
  topicName: string;
  moduleId?: number;
  moduleName?: string;
  content: string;
  level: string;       // "Professional English" | "Simple English" | "Basic English"
  format: string;      // "bullets" | "paragraph"
  syncedToNotion: boolean;
  notionPageId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;  // soft delete timestamp — undefined means active
}

function isSupabaseUserId(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

const getSummariesKey = (userId: string) => `edu_summaries_${userId}`;

function rowToRecord(row: Record<string, unknown>): SummaryRecord {
  return {
    id:              row.id               as string,
    userId:          row.user_id          as string,
    topicId:         row.topic_id         as number,
    topicName:       row.topic_name       as string,
    moduleId:        row.module_id        as number | undefined,
    moduleName:      row.module_name      as string | undefined,
    content:         row.content          as string,
    level:           row.level            as string,
    format:          row.format           as string,
    syncedToNotion:  row.synced_to_notion as boolean,
    notionPageId:    row.notion_page_id   as string | undefined,
    createdAt:       row.created_at       as string,
    updatedAt:       row.updated_at       as string,
    deletedAt:       row.deleted_at       as string | undefined,
  };
}

function localLoad(userId: string): SummaryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getSummariesKey(userId));
    return raw ? (JSON.parse(raw) as SummaryRecord[]) : [];
  } catch {
    return [];
  }
}

function localSave(userId: string, records: SummaryRecord[]): void {
  try {
    localStorage.setItem(getSummariesKey(userId), JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

// Unique key is (topicId, level) — a topic can have one summary per level per user
function matchKey(r: SummaryRecord, topicId: number, level: string) {
  return r.topicId === topicId && r.level === level;
}

export async function upsertSummary(
  userId: string,
  topicId: number,
  topicName: string,
  content: string,
  level: string,
  format: string,
  opts?: { moduleId?: number; moduleName?: string; syncedToNotion?: boolean; notionPageId?: string }
): Promise<SummaryRecord> {
  const now = new Date().toISOString();

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("topic_summaries")
        .upsert(
          {
            user_id:          userId,
            topic_id:         topicId,
            topic_name:       topicName,
            module_id:        opts?.moduleId   ?? null,
            module_name:      opts?.moduleName ?? null,
            content,
            level,
            format,
            synced_to_notion: opts?.syncedToNotion ?? false,
            notion_page_id:   opts?.notionPageId   ?? null,
            updated_at:       now,
          },
          { onConflict: "user_id,topic_id,level" }
        )
        .select()
        .single();
      if (!error && data) return rowToRecord(data as Record<string, unknown>);
      console.warn("Supabase upsertSummary failed, using localStorage:", error?.message);
    }
  }

  // localStorage fallback
  const records = localLoad(userId);
  const existing = records.find((r) => matchKey(r, topicId, level));

  const record: SummaryRecord = existing
    ? {
        ...existing,
        content,
        format,
        updatedAt: now,
        ...(opts?.syncedToNotion !== undefined && { syncedToNotion: opts.syncedToNotion }),
        ...(opts?.notionPageId   !== undefined && { notionPageId:   opts.notionPageId }),
      }
    : {
        id:             Math.random().toString(36).slice(2) + Date.now().toString(36),
        userId,
        topicId,
        topicName,
        moduleId:        opts?.moduleId,
        moduleName:      opts?.moduleName,
        content,
        level,
        format,
        syncedToNotion:  opts?.syncedToNotion ?? false,
        notionPageId:    opts?.notionPageId,
        createdAt:       now,
        updatedAt:       now,
      };

  localSave(userId, [...records.filter((r) => !matchKey(r, topicId, level)), record]);
  return record;
}

export async function markSummaryNotion(
  userId: string,
  topicId: number,
  level: string,
  synced: boolean,
  pageId?: string
): Promise<void> {
  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("topic_summaries")
        .update({
          synced_to_notion: synced,
          ...(pageId !== undefined && { notion_page_id: pageId }),
        })
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .eq("level", level);
      return;
    }
  }
  // localStorage fallback
  localSave(userId, localLoad(userId).map((r) =>
    matchKey(r, topicId, level)
      ? { ...r, syncedToNotion: synced, ...(pageId !== undefined && { notionPageId: pageId }) }
      : r
  ));
}

export async function getAllSummaries(userId: string): Promise<SummaryRecord[]> {
  if (typeof window === "undefined") return [];

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("topic_summaries")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (!error) return (data || []).map((r) => rowToRecord(r as Record<string, unknown>));
      console.warn("Supabase getAllSummaries failed, using localStorage:", error.message);
    }
  }

  return localLoad(userId)
    .filter((r) => !r.deletedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getSummariesPaginated(
  userId: string,
  page: number = 0,
  pageSize: number = 10
): Promise<{ summaries: SummaryRecord[]; hasMore: boolean }> {
  if (typeof window === "undefined") return { summaries: [], hasMore: false };

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const from = page * pageSize;
      const { data, error } = await supabase
        .from("topic_summaries")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .range(from, from + pageSize); // fetch one extra to detect hasMore
      if (!error && data) {
        return {
          summaries: data.slice(0, pageSize).map((r) => rowToRecord(r as Record<string, unknown>)),
          hasMore:   data.length > pageSize,
        };
      }
    }
  }

  // localStorage fallback — paginate in memory
  const all = localLoad(userId)
    .filter((r) => !r.deletedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const start = page * pageSize;
  return {
    summaries: all.slice(start, start + pageSize),
    hasMore:   all.length > start + pageSize,
  };
}

// Soft delete — sets deleted_at timestamp. Data is NEVER removed from the database.
export async function deleteSummary(userId: string, topicId: number, level: string): Promise<void> {
  const now = new Date().toISOString();

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("topic_summaries")
        .update({ deleted_at: now })
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .eq("level", level);
      return;
    }
  }
  // localStorage: mark as deleted — do NOT remove from array
  localSave(userId, localLoad(userId).map((r) =>
    matchKey(r, topicId, level) ? { ...r, deletedAt: now } : r
  ));
}

// Restore a soft-deleted summary — clears the deleted_at timestamp.
export async function restoreSummary(userId: string, topicId: number, level: string): Promise<void> {
  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("topic_summaries")
        .update({ deleted_at: null })
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .eq("level", level);
      return;
    }
  }
  localSave(userId, localLoad(userId).map((r) =>
    matchKey(r, topicId, level) ? { ...r, deletedAt: undefined } : r
  ));
}

// Get all soft-deleted summaries for the trash view.
export async function getDeletedSummaries(userId: string): Promise<SummaryRecord[]> {
  if (typeof window === "undefined") return [];

  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("topic_summaries")
        .select("*")
        .eq("user_id", userId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (!error) return (data || []).map((r) => rowToRecord(r as Record<string, unknown>));
    }
  }

  return localLoad(userId)
    .filter((r) => !!r.deletedAt)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}
