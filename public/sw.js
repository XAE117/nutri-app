const CACHE_NAME = "nutrilens-v4";
const APP_SHELL = [
  "/",
  "/log",
  "/weight",
  "/coaching",
  "/trends",
  "/settings",
  "/recipes",
  "/gallery",
  "/household",
  "/manifest.json",
];

// Offline fallback HTML served when no cache and no network
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NutriLens — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      background: #0a0a0a;
      color: #fafafa;
      padding: 2rem;
      text-align: center;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; }
    p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }
    button {
      margin-top: 1.5rem;
      padding: 0.625rem 1.5rem;
      border-radius: 0.5rem;
      border: 1px solid #27272a;
      background: #18181b;
      color: #fafafa;
      font-size: 0.9rem;
      cursor: pointer;
    }
    button:active { background: #27272a; }
  </style>
</head>
<body>
  <div>
    <h1>You're offline</h1>
    <p>NutriLens needs a network connection to load this page. Check your connection and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`;

// ──────────────────────────────────────────────
// Install: cache app shell
// ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Don't auto-skipWaiting; wait for message
});

// ──────────────────────────────────────────────
// Activate: iOS 7-day eviction workaround
// Delete ALL old caches and re-cache app shell
// ──────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────────
// Fetch: strategy per request type
// ──────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET (POST photo uploads, etc.) and cross-origin
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Network-only for API and auth calls
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // Stale-while-revalidate for page navigations
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed — return cache or offline page
            if (cached) return cached;
            return new Response(OFFLINE_HTML, {
              status: 503,
              headers: { "Content-Type": "text/html" },
            });
          });

        // Serve cached immediately if available, update in background
        return cached || networkFetch;
      })
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Update cache in background
        fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          return new Response("", { status: 503 });
        });
    })
  );
});

// ──────────────────────────────────────────────
// Background sync: offline photo uploads
// ──────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "photo-upload") {
    event.waitUntil(handlePhotoSync());
  }
});

async function handlePhotoSync() {
  // Read queued uploads from IndexedDB via the app's offline queue
  // The app stores pending uploads; this just triggers retry
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "SYNC_PHOTOS" });
  }
}

// ──────────────────────────────────────────────
// Message handler: SKIP_WAITING for updates
// ──────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
