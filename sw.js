/* S.A. Akademie – Service Worker
   Cached die App-Hülle (HTML, Icons, Manifest) für Offline-Nutzung und macht die App installierbar.
   WICHTIG: Deine Schülerdaten liegen NICHT hier, sondern in localStorage im Browser –
   der Service Worker betrifft nur Dateien, niemals deine eingetragenen Daten. */

const CACHE_VERSION = "sa-akademie-v1";
const CORE_FILES = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

/* Strategie: Netzwerk zuerst (damit du bei Updates immer die neueste Version siehst),
   bei fehlender Verbindung Fallback auf den Cache -> App funktioniert auch offline. */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
