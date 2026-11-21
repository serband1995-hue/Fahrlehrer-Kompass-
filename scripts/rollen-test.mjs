// Rollen-Test (🗣 Serband 21.11.2026: „sorge dafür, dass solche Fehler nicht nochmal vorkommen“).
// Anlass: Jelena (Leitung und Fahrlehrerin) fand in der App keinen Weg, Schüler anzulegen, und bekam nicht
// ihre eigene Fahrlehrer-Ansicht. Dieser Test spielt JEDE Rolle vom Start der App bis zum gespeicherten Schüler durch:
//   Fahrlehrer · Leitung (reine) · Leitung, die selbst fährt · Büro · Super-Admin
// Je Rolle wird geprüft:
//   (1) die richtige Startansicht (eigene Fahrlehrer-Ansicht oder Gesamtansicht der Fahrschule)
//   (2) der Umschalter in die Gesamtübersicht ist genau bei Betreiber und Leitung-fährt-selbst da
//   (3) auf dem Reiter „Schüler“ gibt es einen sichtbaren Knopf zum Anlegen (mind. 44 px hoch)
//   (4) ein neuer Schüler wird wirklich in die Datenbank geschrieben – in der eigenen Ansicht beim eigenen Fahrlehrer
//   (5) keine JS-Fehler
// Die App läuft lokal mit einer Attrappe statt Datenbank (kein Netz, erfundene Namen „Muster“).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/rollen-test.mjs        (auch in der GitHub-Prüfung)
// Gegenprobe: ROLLEN_SEITE=/tmp/alt/index.html … (alter Stand muss bei „Leitung fährt selbst“ durchfallen)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const start = pfad === "/" || pfad === "/index.html";
    // ROLLEN_SEITE=/pfad/index.html prüft eine andere Fassung (Gegenprobe gegen einen alten Stand)
    const datei = await readFile(start && process.env.ROLLEN_SEITE ? process.env.ROLLEN_SEITE : join(ROOT, start ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);

const FS = "fs-muster";
const ROLLEN = [
  { n: "Fahrlehrer", prof: { rolle: "fahrlehrer" }, eigen: true, umschalter: false },
  { n: "Leitung", prof: { rolle: "fahrschule_admin" }, eigen: false, umschalter: false },
  { n: "Leitung fährt selbst", prof: { rolle: "fahrschule_admin", faehrt_selbst: true }, eigen: true, umschalter: true },
  { n: "Büro", prof: { rolle: "buero" }, eigen: false, umschalter: false },
  { n: "Super-Admin", prof: { rolle: "super_admin" }, eigen: true, umschalter: true },
];

for (const R of ROLLEN) {
  for (const g of [{ n: "360", w: 360, h: 780 }]) {
    const ctx = await browser.newContext({ viewport: { width: g.w, height: g.h }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
    const page = await ctx.newPage();
    const jsFehler = [];
    page.on("pageerror", (e) => jsFehler.push(e.message));
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    if (process.env.ROLLEN_DEBUG) page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") console.log("  konsole:", m.text().slice(0, 200)); });
    await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
    await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
    await warte(page, 600);
    const P = `[${R.n} ${g.n}]`;
    // Attrappe der Datenbank: merkt sich jede schreibende Anfrage; Lesen liefert leere Listen.
    await page.evaluate(async ({ prof, FS }) => {
      for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
      window.__schreib = [];
      const user = { id: "u-ich", email: "ich@example.org" };
      const antwort = (tab, art, einzeln) => {
        if (tab === "fahrschulen" && einzeln) return { data: { id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} }, error: null };
        if (tab === "profiles" && einzeln) return { data: Object.assign({ id: "u-ich", name: "Ich Muster", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" }, prof), error: null };
        if (tab === "profiles") return { data: [{ id: "u-ich", name: "Ich Muster", fahrschule_id: FS, aktiv: true, ...prof }, { id: "u-anna", name: "Anna Muster", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true }], error: null };
        return { data: einzeln ? null : [], error: null, count: 0 };
      };
      const baue = (tab) => {
        const st = { tab, art: "select", einzeln: false, werte: null };
        const q = new Proxy(function () {}, {
          get: (_t, k) => {
            if (k === "then") return (ok, nein) => {
              if (st.art !== "select") window.__schreib.push({ tab: st.tab, art: st.art, werte: st.werte });
              return Promise.resolve(st.art === "select" ? antwort(st.tab, st.art, st.einzeln) : { data: Array.isArray(st.werte) ? st.werte : (st.werte ? [st.werte] : []), error: null }).then(ok, nein);
            };
            if (k === "single" || k === "maybeSingle") return () => { st.einzeln = true; return q; };
            if (["insert", "upsert", "update", "delete"].includes(k)) return (w) => { st.art = k; st.werte = w; return q; };
            return () => q;
          },
          apply: () => q,
        });
        return q;
      };
      const auth = { getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
      const supa = { from: baue, rpc: async () => ({ data: null, error: null }), auth, functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
      window.getSupa = () => supa;
      // Gerätespeicher gehört diesem Konto (wie nach einer echten Anmeldung), sonst startet die App zum Schutz neu
      try { localStorage.clear(); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
      _dbEigentuemer = user.id;
      ensureDB(); DB.students = []; DB.lessons = []; DB.exams = [];
      _authUser = user;
      _authProfile = Object.assign({ id: "u-ich", name: "Ich Muster", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" }, prof);
      // wie _nachAnmeldung: Menü und Streifen nach der Rolle
      if (typeof _hatAdminUmschalter === "function" ? _hatAdminUmschalter() : isSuperAdmin()) _fsSetDrawer(false); // alter Stand: nur Betreiber
      _zeigeSaStreifen();
      await _continueLoginFlow(_authProfile);
    }, { prof: R.prof, FS });
    await warte(page, 800);
    // Die Anmeldemaske ist hier nicht Gegenstand (sie wird über die Attrappe übersprungen)
    const maskeWeg = () => page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } });
    await maskeWeg();

    await pruefe("R1", `${P} Startansicht: ${R.eigen ? "eigene Fahrlehrer-Ansicht" : "Gesamtansicht der Fahrschule"}`, () => page.evaluate(() => (_fsAgg ? "gesamt" : "eigen")).then((v) => (v === (R.eigen ? "eigen" : "gesamt") ? null : "ist " + v)));
    await pruefe("R2", `${P} Umschalter „Admin-Gesamtübersicht“ ${R.umschalter ? "da" : "nicht da"}`, () => page.evaluate(() => /Admin-Gesamtübersicht|Zu meiner Fahrlehrer-Ansicht/.test(document.querySelector(".drawer-nav").textContent)).then((v) => (v === R.umschalter ? null : "ist " + v)));

    // Reiter „Schüler“: Knopf zum Anlegen sichtbar
    await page.evaluate(() => tabGo("schueler")); await warte(page, 400);
    const knopf = await page.evaluate(() => {
      const kand = [document.getElementById("emptyAdd"), document.getElementById("fab")].filter((b) => b && getComputedStyle(b).display !== "none" && b.getBoundingClientRect().height > 0);
      const b = kand[0]; if (!b) return null;
      const r = b.getBoundingClientRect();
      return { id: b.id, h: Math.round(r.height), sichtbar: r.bottom <= innerHeight + 1 && r.top >= 0 };
    });
    await pruefe("R3", `${P} Reiter „Schüler“ hat einen sichtbaren Knopf zum Anlegen`, () => (!knopf ? "kein Knopf" : !knopf.sichtbar ? "Knopf außerhalb des Bildschirms" : knopf.h < 43.5 ? `nur ${knopf.h} px hoch` : null));

    // Schüler anlegen und speichern
    if (knopf) {
      await maskeWeg();
      await page.click("#" + knopf.id, { timeout: 5000 }); await warte(page, 400);
      await page.fill("#f_name", "Rollen Muster");
      await page.evaluate(() => { window.__schreib = []; });
      await page.click("#saveBtn"); await warte(page, 300);
      await page.evaluate(() => { try { closeSheet(); } catch (e) {} });
      // Eigene Ansicht: Abgleich nach ~4 s; Gesamtansicht: Speichern nach kurzer Pause
      await page.waitForFunction(() => window.__schreib.some((x) => x.tab === "schueler" && x.art === "upsert"), null, { timeout: 15000 }).catch(() => {});
      await pruefe("R4", `${P} neuer Schüler landet in der Datenbank${R.eigen ? " beim eigenen Fahrlehrer" : ""}`, () => page.evaluate((eigen) => {
        const z = window.__schreib.filter((x) => x.tab === "schueler" && x.art === "upsert").flatMap((x) => (Array.isArray(x.werte) ? x.werte : [x.werte]));
        const s = z.find((r) => r && r.name === "Rollen Muster");
        if (!s) return "nicht geschrieben (" + window.__schreib.map((x) => x.tab + ":" + x.art).join(", ") + ")";
        if (eigen && s.fahrlehrer_id !== "u-ich") return "falscher Fahrlehrer: " + s.fahrlehrer_id;
        return null;
      }, R.eigen));
    }
    await pruefe("R5", `${P} keine JS-Fehler`, () => jsFehler);
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(`\nRollen-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
