/**
 * Lightweight API cache with in-memory + localStorage for fast page loads.
 * Strategy:
 *   - Return cached data instantly if fresh (< CACHE_TTL)
 *   - If stale, return cached data AND fetch fresh, calling onRefresh when done
 *   - If no cache, fetch and return fresh data
 *
 * TTL is kept short so admin content updates (images, videos) show quickly.
 */

const CACHE_PREFIX = "edu_api_";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes — keeps content fresh after admin edits

// In-memory cache for instant access (survives client-side navigation)
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

function getLocalCache(key: string): { data: unknown; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLocalCache(key: string, data: unknown): void {
  try {
    const entry = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function getCached<T>(key: string): { data: T; isStale: boolean } | null {
  // Try memory cache first (fastest)
  const mem = memoryCache.get(key);
  if (mem) {
    const isStale = Date.now() - mem.timestamp > CACHE_TTL;
    return { data: mem.data as T, isStale };
  }

  // Fall back to localStorage
  const local = getLocalCache(key);
  if (local) {
    memoryCache.set(key, local);
    const isStale = Date.now() - local.timestamp > CACHE_TTL;
    return { data: local.data as T, isStale };
  }

  return null;
}

function setCache<T>(key: string, data: T): void {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  setLocalCache(key, data);
}

/**
 * Fetch with cache. Returns cached data instantly if fresh.
 * If stale, returns cached data immediately and calls onRefresh with fresh data
 * when the network request completes — so the UI can update without a page reload.
 *
 * @param url       - The API URL to fetch
 * @param cacheKey  - A unique key for this request
 * @param onRefresh - Called with fresh data when a background revalidation finishes
 * @returns The data (from cache or network)
 */
export async function cachedFetch<T>(
  url: string,
  cacheKey: string,
  onRefresh?: (freshData: T) => void
): Promise<T> {
  const cached = getCached<T>(cacheKey);

  if (cached && !cached.isStale) {
    // Fresh cache — return immediately. Still schedule a silent background check
    // so that if admin updated content very recently, the NEXT navigation gets it.
    fetchAndCache<T>(url, cacheKey).then((freshData) => {
      if (onRefresh) onRefresh(freshData);
    }).catch(() => {});
    return cached.data;
  }

  // Stale cache — return stale data immediately so UI isn't blank,
  // fetch fresh in background and notify caller so it can re-render.
  if (cached) {
    fetchAndCache<T>(url, cacheKey).then((freshData) => {
      if (onRefresh) onRefresh(freshData);
    }).catch(() => {});
    return cached.data;
  }

  // No cache at all — must fetch (shows loading spinner)
  return fetchAndCache<T>(url, cacheKey);
}

async function fetchAndCache<T>(url: string, cacheKey: string): Promise<T> {
  const MAX_RETRIES = 6;
  const ATTEMPT_TIMEOUT_MS = 25000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 5000));
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal }).finally(() =>
        clearTimeout(timeoutId)
      );

      if (res.status === 429) {
        lastError = new Error(`Fetch failed: 429`);
        continue;
      }

      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Fetch failed: ${res.status}`);
      }

      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data: T = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.match(/Fetch failed: 4(?!29)\d\d/)) break;
    }
  }

  throw lastError ?? new Error("Fetch failed after retries");
}

/**
 * Prefetch multiple URLs in parallel and cache them.
 */
export function prefetchAll(entries: { url: string; cacheKey: string }[]): void {
  entries.forEach(({ url, cacheKey }) => {
    fetchAndCache(url, cacheKey).catch(() => {});
  });
}

/**
 * Get cached data synchronously (memory only). Returns null if not cached.
 */
export function getCachedSync<T>(cacheKey: string): T | null {
  const cached = getCached<T>(cacheKey);
  return cached ? cached.data : null;
}

/**
 * Manually set cache (useful for storing derived data).
 */
export function setCacheManual<T>(cacheKey: string, data: T): void {
  setCache(cacheKey, data);
}

/**
 * Bust the cache for a specific key (call this after admin updates).
 */
export function bustCache(cacheKey: string): void {
  memoryCache.delete(cacheKey);
  try { localStorage.removeItem(CACHE_PREFIX + cacheKey); } catch {}
}
