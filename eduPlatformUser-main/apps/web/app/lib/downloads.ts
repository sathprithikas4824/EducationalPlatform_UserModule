// ── Downloads Utility ──────────────────────────────────────────────────────────
// Stores per-user download records in localStorage, keyed by user ID.

export interface DownloadRecord {
  id: string;
  userId: string;
  topicId: number;
  topicName: string;
  moduleName: string;
  fileName: string;
  fileType: string;
  downloadedAt: string;
}

const getDownloadsKey = (userId: string) => `edu_downloads_${userId}`;

export function saveDownload(
  userId: string,
  record: Omit<DownloadRecord, "id" | "downloadedAt">
): DownloadRecord {
  const newRecord: DownloadRecord = {
    ...record,
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    downloadedAt: new Date().toISOString(),
  };
  const existing = loadDownloads(userId);
  // Replace any existing entry for same topic + filename
  const filtered = existing.filter(
    (d) => !(d.topicId === record.topicId && d.fileName === record.fileName)
  );
  try {
    localStorage.setItem(
      getDownloadsKey(userId),
      JSON.stringify([...filtered, newRecord])
    );
  } catch {
    // ignore storage errors
  }
  return newRecord;
}

export function loadDownloads(userId: string): DownloadRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getDownloadsKey(userId));
    return raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
  } catch {
    return [];
  }
}

export function removeDownload(userId: string, downloadId: string): void {
  const existing = loadDownloads(userId);
  try {
    localStorage.setItem(
      getDownloadsKey(userId),
      JSON.stringify(existing.filter((d) => d.id !== downloadId))
    );
  } catch {
    // ignore storage errors
  }
}
