const CACHE_VERSION = "v12";
const STATIC_CACHE = `edu-static-${CACHE_VERSION}`;
const PAGE_CACHE   = `edu-pages-${CACHE_VERSION}`;
const MEDIA_CACHE  = `edu-media-${CACHE_VERSION}`;
const ALL_CACHES   = [STATIC_CACHE, PAGE_CACHE, MEDIA_CACHE];

const OFFLINE_PAGE  = "/offline.html";
const PRECACHE_URLS = [OFFLINE_PAGE];

// True when a previously active SW exists — used in activate to signal clients to reload.
let isUpdate = false;

self.addEventListener("install", (event) => {
  // If there is already an active SW controlling clients, this is an update.
  isUpdate = !!self.registration.active;
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
      .then(async () => {
        // On updates (not first install): tell every open tab to reload so the
        // new JS bundle — which has the video playback fixes — is picked up
        // immediately without the user having to manually refresh.
        if (!isUpdate) return;
        const allClients = await self.clients.matchAll({ type: "window" });
        allClients.forEach((c) => c.postMessage({ type: "SW_ACTIVATED" }));
      })
  );
});

// Returns true for Cloudinary or Supabase media (images + videos).
// Render backend requests are NOT intercepted — the browser fetches them directly.
// Opaque (no-cors) SW responses cannot be used for video byte-range streaming in Chrome,
// so intercepting them breaks playback. Render backend videos bypass the SW entirely.
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
  // Preserve CORS headers from the original response. Without this, a crossorigin="anonymous"
  // video request to the SW gets a synthesized response with no Access-Control-Allow-Origin,
  // and the browser blocks it even though the original server supported CORS.
  const acao = cachedFull.headers.get("Access-Control-Allow-Origin");
  const acam = cachedFull.headers.get("Access-Control-Allow-Methods");
  if (acao) headers["Access-Control-Allow-Origin"] = acao;
  if (acam) headers["Access-Control-Allow-Methods"] = acam;
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
  // Cross-origin video requests (Render backend etc.) are NOT intercepted here.
  // Opaque (no-cors) SW responses break Chrome/Android Range-based video streaming,
  // so those requests bypass the SW and go directly to the network.
  // Large videos pre-cached during the Download action are served via client-side
  // Cache API lookup in Contents.tsx (see the offline video effect there).
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
