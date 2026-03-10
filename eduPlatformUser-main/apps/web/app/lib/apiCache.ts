/**
 * Lightweight API cache with in-memory + sessionStorage for fast page loads.
 * Uses stale-while-revalidate: returns cached data instantly, refreshes in background.
 */

const CACHE_PREFIX = "edu_api_";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — module data is static

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
  const session = getLocalCache(key);
  if (session) {
    // Promote to memory cache
    memoryCache.set(key, session);
    const isStale = Date.now() - session.timestamp > CACHE_TTL;
    return { data: session.data as T, isStale };
  }

  return null;
}

function setCache<T>(key: string, data: T): void {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  setLocalCache(key, data);
}

/**
 * Fetch with cache. Returns cached data instantly if available.
 * If stale or missing, fetches fresh data.
 *
 * @param url - The API URL to fetch
 * @param cacheKey - A unique key for this request
 * @returns The data (from cache or network)
 */
export async function cachedFetch<T>(url: string, cacheKey: string): Promise<T> {
  const cached = getCached<T>(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  // If we have stale data, start a background refresh and return stale data
  if (cached) {
    fetchAndCache<T>(url, cacheKey).catch(() => {});
    return cached.data;
  }

  // No cache at all — must fetch
  return fetchAndCache<T>(url, cacheKey);
}

async function fetchAndCache<T>(url: string, cacheKey: string): Promise<T> {
  const MAX_RETRIES = 6;
  // Per-attempt timeout: 25s to accommodate Render.com cold starts (~30-60s to wake)
  const ATTEMPT_TIMEOUT_MS = 25000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        // Fixed 5s gap between retries — keeps total window ~2.5 min for cold starts
        await new Promise((r) => setTimeout(r, 5000));
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal }).finally(() =>
        clearTimeout(timeoutId)
      );

      // 429 = rate limited — always retry with backoff
      if (res.status === 429) {
        lastError = new Error(`Fetch failed: 429`);
        continue;
      }

      // Other 4xx = permanent client error, don't retry
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Fetch failed: ${res.status}`);
      }

      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data: T = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Don't retry permanent 4xx errors
      if (lastError.message.match(/Fetch failed: 4(?!29)\d\d/)) break;
      // AbortError = timeout — always retry
    }
  }

  throw lastError ?? new Error("Fetch failed after retries");
}

/**
 * Prefetch multiple URLs in parallel and cache them.
 * Call this early to warm up the cache.
 */
export function prefetchAll(entries: { url: string; cacheKey: string }[]): void {
  entries.forEach(({ url, cacheKey }) => {
    const cached = getCached(cacheKey);
    if (!cached || cached.isStale) {
      fetchAndCache(url, cacheKey).catch(() => {});
    }
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
