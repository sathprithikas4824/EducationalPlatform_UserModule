const CACHE_VERSION = "v13";
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

// Returns true for Supabase course-images (thumbnails, cover art).
function isMediaRequest(url) {
  return (
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("course-images")
  );
}

// Returns true for Cloudinary-hosted videos.
function isCloudinaryVideo(url) {
  return url.hostname.endsWith("cloudinary.com");
}

// Serve a cached full Supabase image response for a Range request.
// Returning 200 is safe for images — browsers don't hard-require 206 for images.
function synthesizeRangeResponse(cachedFull) {
  const contentType = cachedFull.headers.get("Content-Type") || "image/jpeg";
  const contentLength = cachedFull.headers.get("Content-Length") || "";
  const headers = { "Content-Type": contentType, "Accept-Ranges": "bytes" };
  if (contentLength) headers["Content-Length"] = contentLength;
  const acao = cachedFull.headers.get("Access-Control-Allow-Origin");
  const acam = cachedFull.headers.get("Access-Control-Allow-Methods");
  if (acao) headers["Access-Control-Allow-Origin"] = acao;
  if (acam) headers["Access-Control-Allow-Methods"] = acam;
  return new Response(cachedFull.clone().body, { status: 200, headers });
}

// Serve a proper 206 Partial Content response from a full cached video blob.
// iOS Safari hard-fails on 200 responses to Range requests for video — it requires 206.
// blob.slice() creates a lightweight view without copying the entire buffer.
async function serve206FromCache(cachedFull, rangeHeader) {
  const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  const blob = await cachedFull.clone().blob();
  const total = blob.size;
  const contentType = cachedFull.headers.get("Content-Type") || "video/mp4";
  if (!m) {
    // Malformed Range — return full response as 200
    return new Response(blob, {
      status: 200,
      headers: { "Content-Type": contentType, "Content-Length": String(total), "Accept-Ranges": "bytes" },
    });
  }
  const start = parseInt(m[1], 10);
  const end = m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
  const chunk = blob.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(end - start + 1),
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

  // ── Cloudinary video (explicit offline cache only) ───────────────────────
  // Only intercept when the video is already in MEDIA_CACHE (put there by the
  // client-side Download action via cacheMediaForSW). Serving from cache means
  // we must return 206 Partial Content — iOS Safari hard-fails on 200 for Range
  // requests. If the video is NOT cached, pass the request straight through so
  // Cloudinary serves its native 206 and online playback is unaffected.
  if (isCloudinaryVideo(url)) {
    event.respondWith((async () => {
      const cacheKey = url.href;
      const rangeHeader = request.headers.get("Range");
      const cache = await caches.open(MEDIA_CACHE);
      const cachedFull = await cache.match(cacheKey);
      if (cachedFull) {
        return rangeHeader
          ? serve206FromCache(cachedFull, rangeHeader)
          : cachedFull.clone();
      }
      // Not in cache — network pass-through (Cloudinary returns real 206)
      try { return await fetch(request); } catch { return Response.error(); }
    })());
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
