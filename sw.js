/* Fahrlehrer-Kompass – Service Worker
   Cached nur die App-Hülle (HTML, Icons, Manifest) plus Schriften und die Supabase-Bibliothek.
   Antworten von Supabase (Schülerdaten) und anderen Diensten werden NIE gespeichert. */

const CACHE_VERSION = "kompass-v112";
const CORE_FILES = [
  "./index.html",
  "./kompass-rechnen.js",
  "./neuigkeiten.js",
  "./pruefer-wissen.js",
  "./schueler-ueberblick.js",
  "./lernszenen.js",
  "./lernszenen-stadt.js",
  "./lernszenen-neu-a.js",
  "./lernszenen-neu-b.js",
  "./lernszenen-neu-c.js",
  "./schilder/z1002-10.svg",
  "./schilder/z1002-11.svg",
  "./schilder/z1002-20.svg",
  "./schilder/z1002-21.svg",
  "./schilder/kat/z1000-32.webp",
  "./schilder/kat/z1020-30.webp",
  "./schilder/kat/z1022-10.webp",
  "./schilder/kat/z201-50.webp",
  "./schilder/kat/z205.webp",
  "./schilder/kat/z206.webp",
  "./schilder/kat/z215.webp",
  "./schilder/kat/z220-10.webp",
  "./schilder/kat/z220-20.webp",
  "./schilder/kat/z224.webp",
  "./schilder/kat/z244p1.webp",
  "./schilder/kat/z244p2.webp",
  "./schilder/kat/z250.webp",
  "./schilder/kat/z267.webp",
  "./schilder/kat/z274.webp",
  "./schilder/kat/z274p1.webp",
  "./schilder/kat/z276.webp",
  "./schilder/kat/z280.webp",
  "./schilder/kat/z283.webp",
  "./schilder/kat/z286.webp",
  "./schilder/kat/z306.webp",
  "./schilder/kat/z325p1.webp",
  "./schilder/kat/z325p2.webp",
  "./schilder/kat/z330p1.webp",
  "./schilder/kat/z332.webp",
  "./schilder/kat/z333.webp",
  "./schilder/kat/z350-10.webp",
  "./lernszenen-en.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

/* Fremde Adressen, die gecacht werden dürfen (keine personenbezogenen Daten). */
const ERLAUBTE_FREMDE = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://cdn.jsdelivr.net"
];

function darfCachen(url) {
  // Die Landingpage im Unterordner serband/ gehört nicht zur App: nicht zwischenspeichern
  // (sonst landen ihre großen Hintergrundvideos im Speicher des Kompass)
  if (url.origin === self.location.origin && url.pathname.indexOf("/serband/") !== -1) return false;
  if (url.origin === self.location.origin) return true;
  return ERLAUBTE_FREMDE.indexOf(url.origin) !== -1;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

/* Löscht nur eigene alte Caches (kompass-v + Zahl), also auch kompass-v1 mit den früher gespeicherten
   Supabase-Antworten. Fremde Caches bleiben stehen: Fahr-Akademie und Kompass liegen beide unter
   serband1995-hue.github.io und teilen sich den Cache-Speicher. */
const EIGENER_CACHE = /^kompass-v\d+$/;
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => EIGENER_CACHE.test(n) && n !== CACHE_VERSION).map((n) => caches.delete(n)))
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
