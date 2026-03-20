const CACHE_VERSION = "v1";
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

  // Pages: network-first, fallback to cache, fallback to /offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached || caches.match("/offline"))
      )
  );
});
