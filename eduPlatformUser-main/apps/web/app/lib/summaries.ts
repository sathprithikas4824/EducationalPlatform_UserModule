// AI Summary persistence — localStorage only (session cache upgrades this later)

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
  createdAt: string;
  updatedAt: string;
}

const getSummariesKey = (userId: string) => `edu_summaries_${userId}`;

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

// Unique key is (topicId, level) — a topic can have one summary per level
function matchKey(r: SummaryRecord, topicId: number, level: string) {
  return r.topicId === topicId && r.level === level;
}

export function upsertSummary(
  userId: string,
  topicId: number,
  topicName: string,
  content: string,
  level: string,
  format: string,
  opts?: { moduleId?: number; moduleName?: string; syncedToNotion?: boolean }
): SummaryRecord {
  const now = new Date().toISOString();
  const records = localLoad(userId);
  const existing = records.find((r) => matchKey(r, topicId, level));

  const record: SummaryRecord = existing
    ? {
        ...existing,
        content,
        format,
        updatedAt: now,
        ...(opts?.syncedToNotion !== undefined && { syncedToNotion: opts.syncedToNotion }),
      }
    : {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        userId,
        topicId,
        topicName,
        moduleId:       opts?.moduleId,
        moduleName:     opts?.moduleName,
        content,
        level,
        format,
        syncedToNotion: opts?.syncedToNotion ?? false,
        createdAt:      now,
        updatedAt:      now,
      };

  localSave(userId, [...records.filter((r) => !matchKey(r, topicId, level)), record]);
  return record;
}

export function markSummaryNotion(
  userId: string,
  topicId: number,
  level: string,
  synced: boolean
): void {
  const records = localLoad(userId);
  const updated = records.map((r) =>
    matchKey(r, topicId, level) ? { ...r, syncedToNotion: synced } : r
  );
  localSave(userId, updated);
}

export function getAllSummaries(userId: string): SummaryRecord[] {
  if (typeof window === "undefined") return [];
  return localLoad(userId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function deleteSummary(userId: string, topicId: number, level: string): void {
  localSave(userId, localLoad(userId).filter((r) => !matchKey(r, topicId, level)));
}
