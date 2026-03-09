// ── Bookmarks Utility ─────────────────────────────────────────────────────────
// Stores per-user bookmarks in localStorage.
// Supports both module-level and topic-level bookmarks.

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

const getBookmarksKey = (userId: string) => `edu_bookmarks_${userId}`;

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

export function loadBookmarks(userId: string): BookmarkRecord[] {
  return localLoad(userId);
}

export function addBookmark(
  userId: string,
  record: Omit<BookmarkRecord, "id" | "userId" | "bookmarkedAt">
): BookmarkRecord {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const bookmarkedAt = new Date().toISOString();
  const newRecord: BookmarkRecord = { ...record, id, userId, bookmarkedAt };

  const existing = localLoad(userId);
  // Remove any duplicate (same type + moduleId + topicId)
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

export function removeBookmark(userId: string, bookmarkId: string): void {
  const existing = localLoad(userId);
  localSave(userId, existing.filter((b) => b.id !== bookmarkId));
}

// Toggle bookmark — returns true if now bookmarked, false if removed
export function toggleBookmark(
  userId: string,
  record: Omit<BookmarkRecord, "id" | "userId" | "bookmarkedAt">
): boolean {
  const bookmarks = localLoad(userId);
  const existing = bookmarks.find(
    (b) =>
      b.type === record.type &&
      b.moduleId === record.moduleId &&
      b.topicId === record.topicId
  );
  if (existing) {
    removeBookmark(userId, existing.id);
    return false;
  } else {
    addBookmark(userId, record);
    return true;
  }
}

export function isItemBookmarked(
  userId: string,
  type: BookmarkType,
  moduleId: number,
  topicId?: number
): boolean {
  const bookmarks = localLoad(userId);
  return bookmarks.some(
    (b) =>
      b.type === type &&
      b.moduleId === moduleId &&
      b.topicId === topicId
  );
}
