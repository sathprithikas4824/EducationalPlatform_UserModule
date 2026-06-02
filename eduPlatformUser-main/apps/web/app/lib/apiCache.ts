/**
 * Lightweight API cache: show cached data instantly, always revalidate in background.
 * The cache prevents a blank screen on navigation (instant-paint).
 */

const CACHE_PREFIX = "edu_api_";

// TTL in milliseconds for each cache tier
const TTL_LIST   = 3 * 60 * 1000; // 3 minutes — submodules lists, topics lists
const TTL_DETAIL = 5 * 60 * 1000; // 5 minutes — single module overview

/** Returns the correct TTL for a given cache key based on its data tier. */
function getTTL(cacheKey: string): number {
  if (cacheKey.startsWith("module_single_")) return TTL_DETAIL;
  return TTL_LIST;
}

// In-memory cache for instant access (survives client-side navigation)
const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

// Tracks in-flight fetch Promises — parallel calls for the same URL share one request.
const pendingRequests = new Map<string, Promise<unknown>>();

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

function getCached<T>(key: string): { data: T } | null {
  // Try memory cache first (fastest)
  const mem = memoryCache.get(key);
  if (mem) return { data: mem.data as T };

  // Fall back to localStorage
  const local = getLocalCache(key);
  if (local) {
    memoryCache.set(key, local);
    return { data: local.data as T };
  }

  return null;
}

function setCache<T>(key: string, data: T): void {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  setLocalCache(key, data);
}

/**
 * Returns cached data instantly (for instant-paint) and ALWAYS fires a background
 * revalidation — calling onRefresh when fresh data arrives so the UI updates.
 * Uses cache: 'no-store' to bypass browser HTTP cache and always hit the backend.
 */
export async function cachedFetch<T>(
  url: string,
  cacheKey: string,
  onRefresh?: (freshData: T) => void
): Promise<T> {
  const cached = getCached<T>(cacheKey);

  if (cached) {
    // Return cached data immediately for instant paint, then revalidate in background.
    // If background refresh fails (e.g. Render cold start > 25s on mobile), fall back to
    // fetchWithRetry so the user eventually sees fresh data rather than stale forever.
    backgroundRefresh<T>(url, cacheKey)
      .then((freshData) => { if (onRefresh) onRefresh(freshData); })
      .catch(() => {
        fetchWithRetry<T>(url, cacheKey)
          .then((freshData) => { if (onRefresh) onRefresh(freshData); })
          .catch(() => {});
      });
    return cached.data;
  }

  // No cache — must fetch (initial load, shows loading spinner)
  return fetchWithRetry<T>(url, cacheKey);
}

/** Background revalidation: up to 2 attempts so mobile networks + Render cold starts are handled */
async function backgroundRefresh<T>(url: string, cacheKey: string): Promise<T> {
  // If a fetch for this URL is already in-flight, reuse it — don't start a new one.
  if (pendingRequests.has(url)) return pendingRequests.get(url) as Promise<T>;

  // If data was freshly cached within the last 1 second, return it as-is.
  // This prevents cascade re-fetches triggered by onRefresh callbacks in ModulesSection.
  const recent = memoryCache.get(cacheKey);
  if (recent && Date.now() - recent.timestamp < getTTL(cacheKey)) return recent.data as T;

  const TIMEOUT_MS = 25000; // 25s — covers Render cold start on slow mobile networks
  let lastErr: Error | null = null;

  const fetchPromise = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        // Append _cb timestamp: iOS Safari sometimes ignores cache:"no-store" and serves a
        // stale HTTP-cached response. A unique query param guarantees a true network round-trip.
        const bustUrl = url + (url.includes("?") ? "&" : "?") + `_cb=${Date.now()}`;
        const res = await fetch(bustUrl, {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        if (res.status >= 400 && res.status < 500) throw new Error(`${res.status}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data: T = await res.json();
        setCache(cacheKey, data);
        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        lastErr = err instanceof Error ? err : new Error(String(err));
        // Stop retrying on 4xx or network errors — more requests won't help.
        if (/^4\d\d$/.test(lastErr.message)) break;
        if (lastErr.message === "Failed to fetch") break;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw lastErr ?? new Error("Background refresh failed");
  })();

  pendingRequests.set(url, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    pendingRequests.delete(url);
  }
}

/** Initial load fetch: retries with back-off to handle Render cold starts */
async function fetchWithRetry<T>(url: string, cacheKey: string): Promise<T> {
  // Reuse in-flight request if one exists for this URL.
  if (pendingRequests.has(url)) return pendingRequests.get(url) as Promise<T>;

  const MAX_RETRIES = 6;
  const ATTEMPT_TIMEOUT_MS = 25000;
  let lastError: Error | null = null;

  const fetchPromise = (async () => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 5000));
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
        const res = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        }).finally(() => clearTimeout(timeoutId));

        // All 4xx responses — stop retrying immediately.
        // 429 (Too Many Requests): retrying makes it worse, not better.
        if (res.status >= 400 && res.status < 500) {
          throw new Error(`Fetch failed: ${res.status}`);
        }
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

        const data: T = await res.json();
        setCache(cacheKey, data);
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Stop retrying on any 4xx or network/CORS error — more requests won't help.
        if (lastError.message.startsWith("Fetch failed: 4")) break;
        if (lastError.message === "Failed to fetch") break;
      }
    }
    throw lastError ?? new Error("Fetch failed after retries");
  })();

  pendingRequests.set(url, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    pendingRequests.delete(url);
  }
}

/**
 * Prefetch multiple URLs in parallel and cache them.
 */
export function prefetchAll(entries: { url: string; cacheKey: string }[]): void {
  entries.forEach(({ url, cacheKey }) => {
    fetchWithRetry(url, cacheKey).catch(() => {});
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
 * Bust the cache for a specific key.
 */
export function bustCache(cacheKey: string): void {
  memoryCache.delete(cacheKey);
  try { localStorage.removeItem(CACHE_PREFIX + cacheKey); } catch {}
}
