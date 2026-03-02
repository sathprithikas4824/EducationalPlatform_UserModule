// ── Downloads Utility ──────────────────────────────────────────────────────────
// Saves per-user download records to Supabase (real users) with localStorage fallback.

import { supabase } from "./supabase";

export interface DownloadRecord {
  id: string;
  userId: string;
  topicId: number;
  topicName: string;
  moduleName: string;
  fileName: string;
  fileType: string;
  content: string;
  downloadedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const getDownloadsKey = (userId: string) => `edu_downloads_${userId}`;

function isSupabaseUserId(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}

// Map Supabase snake_case row → DownloadRecord camelCase
function rowToRecord(row: Record<string, unknown>): DownloadRecord {
  return {
    id:           row.id           as string,
    userId:       row.user_id      as string,
    topicId:      row.topic_id     as number,
    topicName:    row.topic_name   as string,
    moduleName:   row.module_name  as string,
    fileName:     row.file_name    as string,
    fileType:     row.file_type    as string,
    content:      (row.content     as string) || "",
    downloadedAt: row.downloaded_at as string,
  };
}

// ── localStorage fallback helpers ──────────────────────────────────────────────

function localLoad(userId: string): DownloadRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getDownloadsKey(userId));
    return raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
  } catch {
    return [];
  }
}

function localSave(userId: string, records: DownloadRecord[]): void {
  try {
    localStorage.setItem(getDownloadsKey(userId), JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function saveDownload(
  userId: string,
  record: Omit<DownloadRecord, "id" | "downloadedAt">
): Promise<DownloadRecord> {
  const id           = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const downloadedAt = new Date().toISOString();
  const newRecord: DownloadRecord = { ...record, id, downloadedAt };

  // ── Supabase (real authenticated users) ──
  if (supabase && isSupabaseUserId(userId)) {
    const { data, error } = await supabase
      .from("user_downloads")
      .upsert(
        {
          id,
          user_id:       userId,
          topic_id:      record.topicId,
          topic_name:    record.topicName,
          module_name:   record.moduleName,
          file_name:     record.fileName,
          file_type:     record.fileType,
          content:       record.content,
          downloaded_at: downloadedAt,
        },
        { onConflict: "user_id,topic_id,file_name" }
      )
      .select()
      .single();

    if (!error && data) return rowToRecord(data as Record<string, unknown>);
    console.warn("Supabase saveDownload failed, using localStorage:", error?.message);
  }

  // ── localStorage fallback ──
  const existing = localLoad(userId);
  const filtered = existing.filter(
    (d) => !(d.topicId === record.topicId && d.fileName === record.fileName)
  );
  localSave(userId, [...filtered, newRecord]);
  return newRecord;
}

export async function loadDownloads(userId: string): Promise<DownloadRecord[]> {
  if (typeof window === "undefined") return [];

  // ── Supabase (real authenticated users with active session) ──
  if (supabase && isSupabaseUserId(userId)) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data, error } = await supabase
        .from("user_downloads")
        .select("*")
        .eq("user_id", userId)
        .order("downloaded_at", { ascending: false });

      if (!error) return (data || []).map((r) => rowToRecord(r as Record<string, unknown>));
      console.warn("Supabase loadDownloads failed, using localStorage:", error.message);
    }
  }

  // ── localStorage fallback ──
  return localLoad(userId);
}

export async function removeDownload(userId: string, downloadId: string): Promise<void> {
  // ── Supabase (real authenticated users) ──
  if (supabase && isSupabaseUserId(userId)) {
    const { error } = await supabase
      .from("user_downloads")
      .delete()
      .eq("id", downloadId)
      .eq("user_id", userId);

    if (!error) return;
    console.warn("Supabase removeDownload failed, using localStorage:", error.message);
  }

  // ── localStorage fallback ──
  const existing = localLoad(userId);
  localSave(userId, existing.filter((d) => d.id !== downloadId));
}
