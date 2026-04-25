/**
 * Lightweight API cache: show cached data instantly, always revalidate in background.
 * CACHE_TTL=0 means every cached entry is immediately stale, so a background
 * refresh fires on every page visit and onRefresh updates the UI with fresh data.
 * The cache still prevents a blank screen on navigation (instant-paint).
 */

const CACHE_PREFIX = "edu_api_";
const CACHE_TTL = 0; // Always stale — every visit revalidates from backend

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
  const TIMEOUT_MS = 25000; // 25s — covers Render cold start on slow mobile networks
  let lastErr: Error | null = null;

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
        headers: { "Pragma": "no-cache" }, // belt-and-suspenders for iOS Safari
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`${res.status}`);
      const data: T = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) await new Promise((r) => setTimeout(r, 3000)); // brief pause before retry
    }
  }

  throw lastErr ?? new Error("Background refresh failed");
}

/** Initial load fetch: retries with back-off to handle Render cold starts */
async function fetchWithRetry<T>(url: string, cacheKey: string): Promise<T> {
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
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: { "Pragma": "no-cache" },
      }).finally(() => clearTimeout(timeoutId));

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
