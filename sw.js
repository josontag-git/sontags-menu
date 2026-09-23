const CACHE_NAME = "were-hungry-v6";

// App-Shell: aendert sich mit jedem Release, wird per Network-first geladen,
// damit nach einem Deploy nie eine veraltete Version haengen bleibt.
const SHELL_FILES = new Set(["", "index.html", "style.css", "app.js", "manifest.json"]);

// Statische Assets: aendern sich praktisch nie, Cache-first spart unnoetige Requests.
const STATIC_ASSETS = ["icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

const ASSETS = ["./", "index.html", "style.css", "app.js", "manifest.json", ...STATIC_ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const filename = url.pathname.split("/").pop() || "";

  if (SHELL_FILES.has(filename)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
