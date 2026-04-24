const CACHE_VERSION = "v9";
const STATIC_CACHE = `edu-static-${CACHE_VERSION}`;
const PAGE_CACHE   = `edu-pages-${CACHE_VERSION}`;
const MEDIA_CACHE  = `edu-media-${CACHE_VERSION}`;
const ALL_CACHES   = [STATIC_CACHE, PAGE_CACHE, MEDIA_CACHE];

const OFFLINE_PAGE  = "/offline.html";
const PRECACHE_URLS = [OFFLINE_PAGE];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(names.filter((n) => !ALL_CACHES.includes(n)).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

// Returns true for Cloudinary or Supabase media (images + videos)
function isMediaRequest(url) {
  return (
    url.hostname.includes("res.cloudinary.com") ||
    (url.hostname.includes("supabase.co") &&
      (url.pathname.includes("course-images") || url.pathname.includes("course-videos")))
  );
}

// Serve a cached full response for a Range request.
// Returning the full 200 response is safe — all modern browsers accept a 200
// in place of the expected 206 and simply download the complete file from
// the local cache (fast) before playing. This avoids loading the entire
// video into a RAM ArrayBuffer, which crashes the SW for large files (>50 MB).
function synthesizeRangeResponse(cachedFull) {
  const contentType = cachedFull.headers.get("Content-Type") || "video/mp4";
  const contentLength = cachedFull.headers.get("Content-Length") || "";
  const headers = { "Content-Type": contentType, "Accept-Ranges": "bytes" };
  if (contentLength) headers["Content-Length"] = contentLength;
  return new Response(cachedFull.clone().body, { status: 200, headers });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ── Cross-origin media (Cloudinary / Supabase storage) ──────────────────────
  // Cache full responses under a URL-only key so any Range request can be served
  // offline by synthesizing a byte-range slice from the cached complete file.
  // This makes video offline seeking work after the video has been viewed online.
  if (isMediaRequest(url)) {
    event.respondWith(
      (async () => {
        const cacheKey = url.href; // canonical key: URL only, no Range header
        const rangeHeader = request.headers.get("Range");

        // Check if we already have the full response cached
        const cache = await caches.open(MEDIA_CACHE);
        const cachedFull = await cache.match(cacheKey);

        if (cachedFull && cachedFull.status === 200) {
          // Serve full response (or wrap it to satisfy a Range request)
          return rangeHeader
            ? synthesizeRangeResponse(cachedFull)
            : cachedFull;
        }

        // Not cached — fetch from network
        try {
          const res = await fetch(request);

          if (res.status === 200 && res.ok) {
            // Full response — cache it directly
            cache.put(cacheKey, res.clone());
          } else if (res.status === 206 || res.ok) {
            // Partial (Range) response — background-fetch the full file so future
            // offline requests (including seeks) can be served from cache
            (async () => {
              try {
                const fullRes = await fetch(
                  new Request(cacheKey, { mode: "cors", credentials: "omit" })
                );
                if (fullRes.status === 200) {
                  cache.put(cacheKey, fullRes);
                }
              } catch { /* network unavailable — skip background cache */ }
            })();
          }

          return res;
        } catch {
          return Response.error();
        }
      })()
    );
    return;
  }

  // ── Same-origin only beyond this point ────────────────────────────────────
  if (url.origin !== self.location.origin) return;

  // Real connectivity checks — bypass SW entirely
  if (url.searchParams.has("_swbypass")) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip HMR and auth
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/api/auth")) return;

  // API: network-only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => Response.json({ error: "offline" }, { status: 503 }))
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Pages: network-first with offline.html fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(PAGE_CACHE).then((c) => c.put(request, clone));
        return response;
      })
      .catch(() =>
        caches.match(OFFLINE_PAGE).then((cached) =>
          cached || fetch(OFFLINE_PAGE)
        )
      )
  );
});
