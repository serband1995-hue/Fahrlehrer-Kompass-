// Rollen-Test (🗣 Serband 21.11.2026: „sorge dafür, dass solche Fehler nicht nochmal vorkommen“).
// Anlass: Jelena (Leitung und Fahrlehrerin) fand in der App keinen Weg, Schüler anzulegen, und bekam nicht
// ihre eigene Fahrlehrer-Ansicht. Dieser Test spielt JEDE Rolle vom Start der App bis zum gespeicherten Schüler durch:
//   Fahrlehrer · Leitung (reine) · Leitung, die selbst fährt · Büro · Super-Admin · gesperrt · gelöscht
// über den echten Anmeldeweg (afterLogin), am Handy hoch (360) und quer (740×360)
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
  // Gesperrter oder gelöschter Zugang (Fable 21.11.): kommt gar nicht erst hinein
  { n: "Gesperrt", prof: { rolle: "fahrlehrer", aktiv: false }, gesperrt: true },
  { n: "Gelöscht", prof: { rolle: "entfernt", aktiv: false }, gesperrt: true },
];
const GROESSEN = [{ n: "360", w: 360, h: 780 }, { n: "quer", w: 740, h: 360 }];

for (const R of ROLLEN) {
  for (const g of R.gesperrt ? GROESSEN.slice(0, 1) : GROESSEN) {
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
        if (tab === "profiles" && einzeln) return { data: Object.assign({ id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: typeof AGB_VERSION !== "undefined" ? AGB_VERSION : "1.0" }, prof), error: null };
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
      // Der echte Anmeldeweg der App (Profil laden, Sperre, Fahrschule, Menü, Streifen, Startansicht) – keine Abkürzung
      _authUser = user;
      await afterLogin(user);
    }, { prof: R.prof, FS });
    await warte(page, 800);
    // Die Anmeldemaske ist hier nicht Gegenstand (sie wird über die Attrappe übersprungen)
    const maskeWeg = () => page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } });
    if (R.gesperrt) {
      await pruefe("R0", `${P} kommt nicht hinein, sieht die Sperr-Meldung`, () => page.evaluate(() => {
        const err = (document.getElementById("loErr") || {}).textContent || "";
        return !_authUser && /gesperrt/i.test(err) ? null : "angemeldet=" + !!_authUser + " Meldung: " + String(err).slice(0, 80);
      }));
      await pruefe("R5", `${P} keine JS-Fehler`, () => jsFehler);
      await ctx.close();
      continue;
    }
    await maskeWeg();
    // K10 (Fable 22.11.): direkt nach der Anmeldung kein Zurück-Pfeil (es gibt keine vorige Seite) – in jeder Rolle
    const pfeilStart = await page.evaluate(() => { const b = document.getElementById("navBackBtn"); return !!b && !b.hidden; });
    await pruefe("R10", `${P} beim Start kein Zurück-Pfeil (keine tote Taste)`, async () => (pfeilStart ? "Pfeil sichtbar, Stapel: " + (await page.evaluate(() => _navStack.map((x) => x.name + (x.agg ? "*" : "")).join(" > "))) : null));

    await pruefe("R1", `${P} Startansicht: ${R.eigen ? "eigene Fahrlehrer-Ansicht" : "Gesamtansicht der Fahrschule"}`, () => page.evaluate(() => (_fsAgg ? "gesamt" : "eigen")).then((v) => (v === (R.eigen ? "eigen" : "gesamt") ? null : "ist " + v)));
    await pruefe("R2", `${P} Umschalter „Admin-Gesamtübersicht“ ${R.umschalter ? "da" : "nicht da"}`, () => page.evaluate(() => /Admin-Gesamtübersicht|Zu meiner Fahrlehrer-Ansicht/.test(document.querySelector(".drawer-nav").textContent)).then((v) => (v === R.umschalter ? null : "ist " + v)));

    // Reiter „Schüler“: Knopf zum Anlegen sichtbar
    await page.evaluate(() => tabGo("schueler")); await warte(page, 400);
    // Ein Knopf zählt nur, wenn er ganz zu sehen ist und nichts darüber liegt (Mitte und beide Enden wirklich antippbar)
    const knopf = await page.evaluate(() => {
      const frei = (b) => {
        const r = b.getBoundingClientRect();
        if (getComputedStyle(b).display === "none" || r.height <= 0 || r.top < 0 || r.bottom > innerHeight + 1) return false;
        return [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 6, r.top + r.height / 2], [r.right - 6, r.top + r.height / 2]].every(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e === b || b.contains(e)); });
      };
      const kand = [document.getElementById("emptyAdd"), document.getElementById("fab")].filter(Boolean);
      const b = kand.find(frei); if (!b) return { keiner: kand.filter((x) => getComputedStyle(x).display !== "none").map((x) => x.id).join(",") || "–" };
      return { id: b.id, h: Math.round(b.getBoundingClientRect().height) };
    });
    await pruefe("R3", `${P} Reiter „Schüler“ hat einen freien, antippbaren Knopf zum Anlegen`, () => (knopf.keiner ? "kein Knopf frei (verdeckt oder außerhalb): " + knopf.keiner : knopf.h < 43.5 ? `nur ${knopf.h} px hoch` : null));

    // Schüler anlegen und speichern
    if (knopf && knopf.id) {
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
    // K3 (22.11.2026): Menüpunkt „Buchungs-QR fürs Auto“ nur mit eigenem Buchungslink und nur in der eigenen Ansicht
    // (Fahrlehrer, fahrende Leitung, Super-Admin); Leitung ohne Fahren und Büro haben ihn nie.
    await maskeWeg();
    const bq = await page.evaluate(() => {
      document.getElementById("bueroNotizPopup")?.remove();
      const blick = () => { openDrawer(); const b = [...document.querySelectorAll('#drawer [data-nav="buchqr"]')].filter((x) => getComputedStyle(x).display !== "none" && x.getBoundingClientRect().height > 0).length; closeDrawer(); return b; };
      const alt = _authProfile.slug; _authProfile.slug = null; const ohne = blick();
      _authProfile.slug = "ich-muster"; const mit = blick(); _authProfile.slug = alt;
      return { ohne, mit };
    });
    await pruefe("R9", `${P} Menüpunkt „Buchungs-QR fürs Auto“: ohne Buchungslink weg, mit Link ${R.eigen ? "sichtbar" : "nicht da"}`, () => {
      const f = [];
      if (bq.ohne) f.push("ohne Link sichtbar");
      if (R.eigen && bq.mit !== 1) f.push(`mit Link ${bq.mit}× sichtbar statt 1×`);
      if (!R.eigen && bq.mit) f.push("mit Link sichtbar, obwohl Gesamtansicht");
      return f.length ? f : null;
    });
    // Leitung, die selbst fährt: Streifen oben wechselt per Tipp in die ganze Fahrschule und zurück
    if (R.prof.faehrt_selbst) {
      await maskeWeg();
      const st = await page.evaluate(() => { const e = document.getElementById("saStreifen"); return e && !e.hidden ? { t: e.textContent, h: e.getBoundingClientRect().height } : null; });
      await pruefe("R6", `${P} Streifen „Du bist Leitung“ sichtbar und antippbar (≥ 44 px)`, () => (!st ? "kein Streifen" : !/Du bist Leitung/.test(st.t) ? "Text: " + st.t : st.h < 43.5 ? `nur ${Math.round(st.h)} px` : null));
      await page.click("#saStreifen", { timeout: 5000 }).catch(() => {}); await warte(page, 900);
      await pruefe("R7", `${P} Tipp auf den Streifen → ganze Fahrschule, Streifen sagt das`, () => page.evaluate(() => (_fsAgg && /Ganze Fahrschule/.test(document.getElementById("saStreifen").textContent) ? null : "ist " + (_fsAgg ? "gesamt" : "eigen") + ": " + document.getElementById("saStreifen").textContent)));
      await page.click("#saStreifen", { timeout: 5000 }).catch(() => {}); await warte(page, 900);
      await pruefe("R8", `${P} zweiter Tipp → zurück zu den eigenen Schülern`, () => page.evaluate(() => (!_fsAgg && /Du bist Leitung/.test(document.getElementById("saStreifen").textContent) ? null : "ist " + (_fsAgg ? "gesamt" : "eigen"))));
      await pruefe("R11", `${P} nach dem Umschalten nur Zurück-Einträge der aktuellen Ansicht (kein toter Pfeil)`, () => page.evaluate(() => { const a = !!_fsAgg; const fremd = _navStack.filter((x) => x.agg !== undefined && x.agg !== a).length; return fremd ? fremd + " Einträge der anderen Ansicht" : null; }));
    }
    await pruefe("R5", `${P} keine JS-Fehler`, () => jsFehler);
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(`\nRollen-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
