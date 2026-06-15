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
    id:           row.id              as string,
    userId:       row.user_id         as string,
    topicId:      row.topic_id        as number,
    topicName:    row.topic_name      as string,
    moduleName:   row.module_name     as string,
    submoduleId:  row.submodule_id != null ? (row.submodule_id as number) : undefined,
    fileName:     row.file_name       as string,
    fileType:     row.file_type       as string,
    content:      (row.content        as string) || "",
    downloadedAt: row.downloaded_at   as string,
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
          submodule_id:  record.submoduleId ?? null,
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
      // submoduleId is now stored in the DB and returned via rowToRecord
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

    if (!error) {
      localSave(userId, localLoad(userId).filter((d) => d.id !== downloadId));
      return;
    }
    console.warn("Supabase removeDownload failed, using localStorage:", error.message);
  }

  // ── localStorage fallback ──
  const existing = localLoad(userId);
  localSave(userId, existing.filter((d) => d.id !== downloadId));
}

/**
 * Broadcast a module_removed event to every device/tab that has the module page open.
 * Uses Supabase Realtime Broadcast so the badge resets instantly without needing
 * the receiver to detect a Postgres DELETE event (which can be dropped on mobile).
 */
function broadcastModuleRemoved(userId: string, submoduleId: number): void {
  if (!supabase) return;
  const ch = supabase.channel(`edu_module_badge_${userId}`);
  ch.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;
    ch.send({
      type: "broadcast",
      event: "module_removed",
      payload: { submodule_id: submoduleId },
    }).finally(() => {
      // Short delay so the server can forward the message before we close the channel
      setTimeout(() => { try { supabase!.removeChannel(ch); } catch {} }, 1500);
    });
  });
  // Safety cleanup — remove channel after 12 s regardless
  setTimeout(() => { try { supabase!.removeChannel(ch); } catch {} }, 12000);
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
    // If submoduleId wasn't passed (e.g. missing from localStorage on another device),
    // look it up from user_downloads where module_name matches — submodule_id is now stored there.
    let resolvedSubmoduleId = submoduleId;
    if (resolvedSubmoduleId == null) {
      const { data } = await supabase
        .from("user_downloads")
        .select("submodule_id")
        .eq("user_id", userId)
        .eq("module_name", moduleName)
        .not("submodule_id", "is", null)
        .limit(1)
        .single();
      if (data?.submodule_id != null) resolvedSubmoduleId = data.submodule_id as number;
    }

    // Delete all topic records for this module
    const { error: e1 } = await supabase
      .from("user_downloads")
      .delete()
      .eq("user_id", userId)
      .eq("module_name", moduleName);
    if (e1) console.warn("Supabase removeModuleDownloads (user_downloads) failed:", e1.message);

    // Delete the module-level "downloaded" badge row
    if (resolvedSubmoduleId != null) {
      const { error: e2 } = await supabase
        .from("user_module_downloads")
        .delete()
        .eq("user_id", userId)
        .eq("submodule_id", resolvedSubmoduleId);
      if (e2) console.warn("Supabase removeModuleDownloads (user_module_downloads) failed:", e2.message);
      submoduleId = resolvedSubmoduleId; // use resolved value for localStorage cleanup below

      // Broadcast to ALL connected devices so they reset their badge instantly.
      // This is faster and more reliable than waiting for the Postgres DELETE event,
      // which can be dropped on mobile or when REPLICA IDENTITY is not FULL.
      broadcastModuleRemoved(userId, resolvedSubmoduleId);
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
