const CACHE_VERSION = "v2";
const STATIC_CACHE = `edu-static-${CACHE_VERSION}`;
const PAGE_CACHE = `edu-pages-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, PAGE_CACHE];

// Assets to pre-cache on install
const PRECACHE_URLS = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !ALL_CACHES.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // _swbypass: used for real connectivity checks — go straight to network, no cache
  if (url.searchParams.has("_swbypass")) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip Next.js internal routes and Supabase API calls
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/auth")
  ) {
    return;
  }

  // API routes: network-only (always fresh data)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        Response.json({ error: "You are offline" }, { status: 503 })
      )
    );
    return;
  }

  // Static assets (_next/static, fonts, images, icons): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Pages: network-first, fallback to /offline, last resort inline HTML
  const OFFLINE_HTML = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline – Educational Platform</title>
<style>
  body{margin:0;font-family:sans-serif;display:flex;flex-direction:column;
    align-items:center;justify-content:center;min-height:100vh;
    background:#fff;color:#111;text-align:center;padding:2rem}
  h1{font-size:1.75rem;font-weight:700;margin:.5rem 0}
  p{color:#6b7280;max-width:340px;line-height:1.6;margin:.5rem 0 1.5rem}
  button{background:#7c3aed;color:#fff;border:none;padding:.75rem 2rem;
    border-radius:.5rem;font-size:1rem;font-weight:600;cursor:pointer}
</style></head><body>
<div style="font-size:3rem">📚</div>
<h1>You're offline</h1>
<p>No internet connection. Please reconnect and try again.<br>
   If you downloaded modules, open the app when online to access them offline.</p>
<button onclick="location.reload()">Try again</button>
</body></html>`;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() =>
        caches.match("/offline")
          .then((cached) => cached || new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }))
      )
  );
});
