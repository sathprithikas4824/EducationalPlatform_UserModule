// ── Downloads Utility ──────────────────────────────────────────────────────────
// Saves per-user download records to Supabase (real users) with localStorage fallback.

import { supabase } from "./supabase";

export interface DownloadRecord {
  id: string;
  userId: string;
  topicId: number;
  topicName: string;
  moduleName: string;
  submoduleId?: number;
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

    if (!error && data) {
      const saved = rowToRecord(data as Record<string, unknown>);
      // Mirror to localStorage so the record is available offline
      const existing = localLoad(userId);
      const filtered = existing.filter(
        (d) => !(d.topicId === record.topicId && d.fileName === record.fileName)
      );
      localSave(userId, [...filtered, saved]);
      return saved;
    }
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

      if (!error) {
        const records = (data || []).map((r) => rowToRecord(r as Record<string, unknown>));

        // Restore submoduleId from localStorage cache — it's not stored in user_downloads
        // but IS stored in the local records. Match by topicId+fileName which is unique.
        const localRecords = localLoad(userId);
        const localByKey = new Map(localRecords.map((r) => [`${r.topicId}_${r.fileName}`, r]));
        for (const rec of records) {
          if (rec.submoduleId == null) {
            const local = localByKey.get(`${rec.topicId}_${rec.fileName}`);
            if (local?.submoduleId != null) rec.submoduleId = local.submoduleId;
          }
        }

        // Cache to localStorage so records are available offline
        localSave(userId, records);
        return records;
      }
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

/**
 * Remove ALL downloaded topics for a module, plus the module's "downloaded" badge.
 * Deletes from Supabase (user_downloads + user_module_downloads) and clears localStorage.
 */
export async function removeModuleDownloads(
  userId: string,
  moduleName: string,
  submoduleId?: number
): Promise<void> {
  // ── Supabase ──
  if (supabase && isSupabaseUserId(userId)) {
    // Delete all topic records for this module
    const { error: e1 } = await supabase
      .from("user_downloads")
      .delete()
      .eq("user_id", userId)
      .eq("module_name", moduleName);
    if (e1) console.warn("Supabase removeModuleDownloads (user_downloads) failed:", e1.message);

    // Delete the module-level "downloaded" badge row
    if (submoduleId != null) {
      const { error: e2 } = await supabase
        .from("user_module_downloads")
        .delete()
        .eq("user_id", userId)
        .eq("submodule_id", submoduleId);
      if (e2) console.warn("Supabase removeModuleDownloads (user_module_downloads) failed:", e2.message);
    }
  }

  // ── localStorage ──
  const existing = localLoad(userId);
  localSave(userId, existing.filter((d) => d.moduleName !== moduleName));

  // Clear the per-device "done" flags for this submodule
  if (typeof window !== "undefined" && submoduleId != null) {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`edu_module_done_${userId}_`) && key.endsWith(`_${submoduleId}`)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }
}
