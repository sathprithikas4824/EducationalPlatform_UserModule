const CACHE_VERSION = "v14";
const STATIC_CACHE = `edu-static-${CACHE_VERSION}`;
const PAGE_CACHE   = `edu-pages-${CACHE_VERSION}`;
const MEDIA_CACHE  = `edu-media-${CACHE_VERSION}`;
const ALL_CACHES   = [STATIC_CACHE, PAGE_CACHE, MEDIA_CACHE];

const OFFLINE_PAGE  = "/offline.html";
const PRECACHE_URLS = [OFFLINE_PAGE];

let isUpdate = false;

self.addEventListener("install", (event) => {
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
        if (!isUpdate) return;
        const allClients = await self.clients.matchAll({ type: "window" });
        allClients.forEach((c) => c.postMessage({ type: "SW_ACTIVATED" }));
      })
  );
});

// Build a proper 206 Partial Content response by slicing a cached full response.
// The body is read into an ArrayBuffer once and sliced — only called for the
// same-origin /api/stream proxy where the browser controls the Range header.
async function synthesize206(cachedFull, rangeHeader) {
  try {
    const match = rangeHeader && rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) return null;

    const ab = await cachedFull.clone().arrayBuffer();
    const total = ab.byteLength;
    const start = parseInt(match[1], 10);
    const end   = match[2] ? parseInt(match[2], 10) : total - 1;
    const chunk = ab.slice(start, end + 1);

    return new Response(chunk, {
      status: 206,
      headers: {
        "Content-Type":  cachedFull.headers.get("Content-Type") || "video/mp4",
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(chunk.byteLength),
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return null;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // ── /api/stream — same-origin video proxy ────────────────────────────────────
  // Videos are fetched through this endpoint so they are same-origin and the SW
  // can cache and serve them offline. The original video URL is the cache key so
  // prepareOfflineHtml() can find the blob by the URL stored in the downloaded HTML.
  if (url.pathname === "/api/stream") {
    event.respondWith(
      (async () => {
        const originalUrl = url.searchParams.get("url") || "";
        const rangeHeader = request.headers.get("Range");
        const cache = await caches.open(MEDIA_CACHE);

        // Cache key = original (Cloudinary) URL so offline lookup matches
        const cached = await cache.match(originalUrl);
        if (cached && cached.status === 200) {
          if (rangeHeader) {
            const partial = await synthesize206(cached, rangeHeader);
            if (partial) return partial;
          }
          return cached.clone();
        }

        // Not cached — fetch through the proxy (network)
        try {
          const res = await fetch(request);
          if (res.ok && res.status === 200) {
            // Store under the ORIGINAL URL so prepareOfflineHtml() can look it up
            cache.put(originalUrl, res.clone());
          } else if (res.status === 206) {
            // Range response — background-fetch the full file for offline use
            (async () => {
              try {
                const full = await fetch(`/api/stream?url=${encodeURIComponent(originalUrl)}`);
                if (full.ok) cache.put(originalUrl, full);
              } catch {}
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

  // ── Supabase course-images ─────────────────────────────────────────────────
  if (
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("course-images")
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(MEDIA_CACHE);
        const cached = await cache.match(url.href);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(url.href, res.clone());
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

  // Real connectivity checks — bypass SW
  if (url.searchParams.has("_swbypass")) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip HMR and auth
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/api/auth")) return;

  // Other API routes: network-only
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
