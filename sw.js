/* Fahrlehrer-Kompass – Service Worker
   Cached nur die App-Hülle (HTML, Icons, Manifest) plus Schriften und die Supabase-Bibliothek.
   Antworten von Supabase (Schülerdaten) und anderen Diensten werden NIE gespeichert. */

const CACHE_VERSION = "kompass-v4";
const CORE_FILES = [
  "./index.html",
  "./lernszenen.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png"
];

/* Fremde Adressen, die gecacht werden dürfen (keine personenbezogenen Daten). */
const ERLAUBTE_FREMDE = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://cdn.jsdelivr.net"
];

function darfCachen(url) {
  if (url.origin === self.location.origin) return true;
  return ERLAUBTE_FREMDE.indexOf(url.origin) !== -1;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

/* Löscht jeden alten Cache, also auch kompass-v1 mit den früher gespeicherten Supabase-Antworten. */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

/* Netzwerk zuerst, offline Fallback auf den Cache.
   Alles außerhalb von darfCachen() geht unberührt am Service Worker vorbei. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (!darfCachen(url)) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && (response.ok || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});

/* Push-Benachrichtigungen (z.B. neue Online-Buchung, Stornierung, Büro-Änderung).
   Zeigt die Notification an, auch wenn die App/der Tab geschlossen ist. */
self.addEventListener("push", (event) => {
  let data = { title: "Fahrlehrer-Kompass", body: "Neue Nachricht" };
  try { if (event.data) data = event.data.json(); } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Fahrlehrer-Kompass", {
      body: data.body || "",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "kompass-buchung",
      renotify: true
    })
  );
});

/* Tippt der Nutzer auf die Benachrichtigung: bestehendes App-Fenster fokussieren, sonst neu öffnen. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.find((c) => c.url.includes("index.html") || c.url.endsWith("/"));
      if (hadWindow) return hadWindow.focus();
      return self.clients.openWindow("./index.html");
    })
  );
});
