// Prüft den Service Worker beim Aufräumen (activate): Kompass und Fahr-Akademie liegen beide unter
// serband1995-hue.github.io und teilen sich den Cache-Speicher. Der Kompass darf nur eigene alte Caches
// löschen, nie die der Akademie oder anderer Seiten.
// Ohne Browser, läuft auch in der GitHub-Prüfung.  Aufruf:  node scripts/cache-test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const quelle = readFileSync(join(ROOT, "sw.js"), "utf8");
const version = quelle.match(/const CACHE_VERSION\s*=\s*"([^"]+)"/)[1];

async function aufraeumen(vorhanden) {
  const caches = new Set(vorhanden);
  const handler = {};
  const self = {
    location: { origin: "https://serband1995-hue.github.io" },
    addEventListener: (typ, fn) => { handler[typ] = fn; },
    skipWaiting() {}, clients: { claim() {} }, registration: {},
  };
  const cachesApi = {
    keys: async () => [...caches],
    delete: async (n) => caches.delete(n),
    open: async () => ({ addAll: async () => {}, put: async () => {} }),
    match: async () => undefined,
  };
  vm.runInNewContext(quelle, { self, caches: cachesApi, console, URL, Response: class {}, fetch: async () => {} });
  let warten = null;
  handler.activate({ waitUntil: (p) => { warten = p; } });
  await warten;
  return [...caches].sort();
}

let fehler = 0, faelle = 0;
function pruefe(name, ok, info) {
  faelle++;
  if (ok) console.log("ok  ", name);
  else { fehler++; console.log("FEHLER", name, info || ""); }
}

const fremde = ["fahr-akademie-shell-v32", "fahr-akademie-daten-v5", "workbox-precache-v2-https://serband1995-hue.github.io/", "quiz-cache"];
const alteKompass = ["kompass-v1", "kompass-v44", "kompass-v45"].filter((n) => n !== version);
const nachher = await aufraeumen([...fremde, ...alteKompass, version]);

pruefe("aktueller Kompass-Cache bleibt (" + version + ")", nachher.includes(version), nachher);
for (const n of fremde) pruefe("fremder Cache bleibt: " + n, nachher.includes(n), nachher);
for (const n of alteKompass) pruefe("alter Kompass-Cache wird gelöscht: " + n, !nachher.includes(n), nachher);
pruefe("sonst nichts übrig", nachher.length === fremde.length + 1, nachher);

const leer = await aufraeumen([]);
pruefe("leerer Speicher: kein Fehler", leer.length === 0, leer);

console.log(`\n${faelle - fehler} ok, ${fehler} Fehler.`);
process.exit(fehler ? 1 : 0);
