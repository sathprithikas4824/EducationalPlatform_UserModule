const CACHE_VERSION = "v8";
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

// Synthesize a proper 206 Partial Content response from a cached full response.
// Needed for offline video seeking — the browser sends Range requests which must
// be answered with the correct byte slice, not the full file.
async function synthesizeRangeResponse(cachedFull, rangeHeader) {
  const buffer = await cachedFull.clone().arrayBuffer();
  const total = buffer.byteLength;
  const contentType = cachedFull.headers.get("Content-Type") || "video/mp4";

  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!match) {
    return new Response(buffer, {
      status: 200,
      headers: { "Content-Type": contentType, "Content-Length": String(total) },
    });
  }

  const start = parseInt(match[1], 10);
  const end = match[2] !== "" ? parseInt(match[2], 10) : total - 1;
  const safeEnd = Math.min(end, total - 1);
  const chunk = buffer.slice(start, safeEnd + 1);

  return new Response(chunk, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${safeEnd}/${total}`,
      "Content-Length": String(chunk.byteLength),
      "Accept-Ranges": "bytes",
    },
  });
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
          // Serve full response or synthesize a Range slice for video seeking
          return rangeHeader
            ? synthesizeRangeResponse(cachedFull, rangeHeader)
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
