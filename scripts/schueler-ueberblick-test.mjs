// K6-Test: Schüler-Überblick der Fahrschule und Weitergeben (🗣 Serband 21.11.2026).
// Datenbank-Attrappe (erfundene Namen „Muster“, kein Netz):
//   U1 Knopf „Alle Schüler der Fahrschule“ auf dem Reiter Schüler (≥ 44 px)
//   U2 Überblick: Name, Fahrlehrer, Prozent, Theorie; fremde Schüler gesperrt (kein Öffnen, kein Weitergeben)
//   U3 eigener Schüler öffnet die Akte
//   U4 Weitergeben: Kollege antippen → Server-Funktion, kein Bestätigen-Fenster, Hinweis, Schüler weg vom Gerät
//   U5 alte Datenbank: kein Knopf
//   U6 360 px und quer: nichts ragt seitlich heraus
//   U7 keine JS-Fehler
// Aufruf: NODE_PATH=$(npm root -g) node scripts/schueler-ueberblick-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);

async function starte({ alteDB = false, w = 360, h = 780 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [], dialoge = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => { dialoge.push(d.message()); d.dismiss().catch(() => {}); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(async ({ alteDB }) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const FS = "fs-muster", user = { id: "u-ich", email: "ich@example.org" };
    window.__db = { schueler: [], schueler_verschiebungen: [] }; window.__rpc = [];
    const antwort = (st) => {
      if (st.tab === "fahrschulen" && st.einzeln) return { data: { id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} }, error: null };
      if (st.tab === "profiles" && st.einzeln) return { data: { id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, rolle: "fahrlehrer", agb_akzeptiert_version: typeof AGB_VERSION !== "undefined" ? AGB_VERSION : "1.0" }, error: null };
      const t = window.__db[st.tab]; if (!t) return { data: st.einzeln ? null : [], error: null, count: 0 };
      const rows = t.filter((r) => st.filter.every(([k, v]) => r[k] === v));
      if (st.art === "update") { rows.forEach((r) => Object.assign(r, st.werte)); return { data: rows, error: null }; }
      if (st.art !== "select") return { data: [], error: null };
      return { data: st.einzeln ? rows[0] || null : rows, error: null };
    };
    const baue = (tab) => {
      const st = { tab, art: "select", einzeln: false, werte: null, filter: [] };
      const q = new Proxy(function () {}, { get: (_t, k) => {
        if (k === "then") return (ok, nein) => Promise.resolve(antwort(st)).then(ok, nein);
        if (k === "single" || k === "maybeSingle") return () => { st.einzeln = true; return q; };
        if (k === "eq") return (a, b) => { st.filter.push([a, b]); return q; };
        if (["insert", "upsert", "update", "delete"].includes(k)) return (w) => { st.art = k; st.werte = w; return q; };
        return () => q; }, apply: () => q });
      return q;
    };
    const ueb = [
      { id: "s-eigen", name: "Eigen Muster", fahrlehrer_id: "u-ich", fahrlehrer_name: "Ich Muster", eigen: true, stand_pct: 40, klasse: "B", form: "B", ausbildungsart: null, vorbesitz: [], umschreiber: false, theorie_bestanden_am: "2026-11-01", theorie_lektionen: [] },
      { id: "s-fremd", name: "Fremd Muster", fahrlehrer_id: "u-jelena", fahrlehrer_name: "Jelena", eigen: false, stand_pct: 70, klasse: "B", form: "B", ausbildungsart: null, vorbesitz: [], umschreiber: false, theorie_bestanden_am: null, theorie_lektionen: ["1", "2", "3"] },
    ];
    const rpc = async (name, args) => {
      window.__rpc.push({ name, args });
      if (alteDB && ["fs_kollegen", "fs_schueler_ueberblick", "schueler_weitergeben"].includes(name)) return { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
      if (name === "fs_kollegen") return { data: [{ id: "u-ich", name: "Ich Muster", klassen: ["B"] }, { id: "u-jelena", name: "Jelena", klassen: ["B"] }], error: null };
      if (name === "fs_schueler_ueberblick") return { data: JSON.parse(JSON.stringify(ueb)), error: null };
      if (name === "schueler_weitergeben") {
        if (window.__weiterAntwort) return window.__weiterAntwort;
        const z = ueb.find((x) => x.id === args.p_schueler); z.eigen = false; z.fahrlehrer_id = args.p_an; z.fahrlehrer_name = "Jelena";
        window.__db.schueler_verschiebungen.push({ id: "v-1", schueler_id: args.p_schueler, von_fahrlehrer_id: "u-ich", zu_fahrlehrer_id: args.p_an, gesehen_von_alt: false, gesehen_von_neu: false });
        return { data: { ok: true, termine: 2, an_name: "Jelena", pruefung: "2026-12-03" }, error: null };
      }
      return { data: null, error: null };
    };
    const auth = { getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
    const supa = { from: baue, rpc, auth, functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
    window.getSupa = () => supa;
    try { localStorage.clear(); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
    _dbEigentuemer = user.id;
    ensureDB(); DB.students = [{ id: "s-eigen", name: "Eigen Muster", telefon: "0170 000000", form: "B", created: Date.now() }]; DB.students.forEach((s) => { try { ensure(s); } catch (e) {} }); DB.lessons = []; DB.exams = [];
    _authUser = user;
    await afterLogin(user);
  }, { alteDB });
  await warte(page, 900);
  await page.evaluate(async () => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } await SU.pruefen(); tabGo("schueler"); });
  await warte(page, 400);
  return { ctx, page, jsFehler, dialoge };
}
const breit = (page) => page.evaluate(() => { const d = document.documentElement; return d.scrollWidth > d.clientWidth + 1 ? "scrollWidth " + d.scrollWidth + " > " + d.clientWidth : null; });

{
  const { ctx, page, jsFehler, dialoge } = await starte();
  await pruefe("U1", "Knopf „Alle Schüler der Fahrschule“ da und ≥ 44 px", () => page.evaluate(() => { const b = document.getElementById("suOeffnen"); if (!b) return "kein Knopf"; const r = b.getBoundingClientRect(); return r.height >= 43.5 ? null : "nur " + r.height; }));
  await page.click("#suOeffnen"); await warte(page, 400);
  await pruefe("U2", "Überblick: Name, Fahrlehrer, Prozent, Theorie – fremd ohne Öffnen/Weitergeben", () => page.evaluate(() => {
    const t = document.getElementById("view").textContent;
    for (const w of ["Eigen Muster", "Fremd Muster", "bei Jelena", "40 %", "70 %", "Theorie bestanden", "Theorie 3 von 14"]) if (!t.includes(w)) return "fehlt: " + w + " | " + t.slice(0, 300);
    if (/0170/.test(t)) return "Telefonnummer sichtbar";
    const f = document.querySelector('.su-karte[data-sid="s-fremd"]'); if (f.querySelector("[data-akte],[data-weiter]")) return "fremder Schüler öffnet/weitergebbar";
    return document.querySelector('[data-weiter="s-eigen"]') ? null : "eigener ohne Weitergeben";
  }));
  await pruefe("U6", "360 px: nichts ragt seitlich heraus", () => breit(page));
  await pruefe("U8a", "Reiter „Schüler“ bleibt markiert", () => page.evaluate(() => { const b = document.querySelector('.tab-i.on'); return b && b.dataset.tab === "schueler" ? null : "markiert: " + (b && b.dataset.tab); }));
  await pruefe("U8b", "Zurück-Stapel kennt den Überblick", () => page.evaluate(() => { const l = _navStack[_navStack.length - 1]; return l && l.name === "routeSchuelerUeberblick" ? null : "oben: " + (l && l.name); }));
  await page.click('[data-akte="s-eigen"]'); await warte(page, 400);
  await pruefe("U3", "eigener Schüler öffnet die Akte", () => page.evaluate(() => (document.getElementById("tbTitle").textContent !== "Alle Schüler" && /Eigen Muster/.test(document.getElementById("view").textContent) ? null : document.getElementById("tbTitle").textContent)));
  await page.evaluate(() => history.back()); await warte(page, 700);
  await pruefe("U8c", "Zurück aus der Akte führt in den Überblick", () => page.evaluate(() => (document.getElementById("tbTitle").textContent === "Alle Schüler" ? null : "Titel: " + document.getElementById("tbTitle").textContent)));
  await page.evaluate(() => SU.route()); await warte(page, 400);
  // Fehlschlag: Fenster bleibt offen, Knöpfe wieder frei
  await page.evaluate(() => { window.__weiterAntwort = { data: null, error: { message: "Failed to fetch" } }; });
  await page.click('[data-weiter="s-eigen"]'); await warte(page, 500);
  await page.click('[data-an="u-jelena"]'); await warte(page, 800);
  await pruefe("U9", "Fehlschlag: Hinweis, Fenster bleibt offen, Knopf wieder antippbar", () => page.evaluate(() => {
    const t = document.getElementById("toast").textContent; if (!/Nicht weitergegeben/.test(t)) return "Hinweis: " + t;
    const b = document.querySelector('[data-an="u-jelena"]'); return b && !b.disabled ? null : (b ? "Knopf gesperrt" : "Fenster zu");
  }));
  await page.evaluate(() => { window.__weiterAntwort = null; if (typeof closeSheet === "function") closeSheet(); }); await warte(page, 400);
  await page.click('[data-weiter="s-eigen"]'); await warte(page, 500);
  await pruefe("U4a", "Auswahl zeigt „An Jelena“, nicht sich selbst", () => page.evaluate(() => { const t = document.getElementById("sheet").textContent; return /An Jelena/.test(t) && !/An Ich Muster/.test(t) ? null : t.slice(0, 200); }));
  await page.click('[data-an="u-jelena"]'); await warte(page, 2600);
  await pruefe("U4", "Weitergeben: Server-Funktion, kein Bestätigen-Fenster, Hinweis, Schüler weg vom Gerät", () => page.evaluate((dlg) => {
    const c = __rpc.find((x) => x.name === "schueler_weitergeben"); if (!c || c.args.p_schueler !== "s-eigen" || c.args.p_an !== "u-jelena") return "Aufruf: " + JSON.stringify(c);
    if (dlg.length) return "Fenster: " + dlg.join(" | ");
    const t = document.getElementById("toast").textContent; if (!/ist jetzt bei Jelena/.test(t) || !/Prüfung am 03\.12\.2026 bleibt bei dir/.test(t)) return "Hinweis: " + t;
    if (DB.students.some((s) => s.id === "s-eigen")) return "Schüler noch auf dem Gerät";
    const k = document.querySelector('.su-karte[data-sid="s-eigen"]'); return k && !k.querySelector("[data-weiter]") && /bei Jelena/.test(k.textContent) ? null : "Liste nicht aktualisiert";
  }, dialoge));
  await pruefe("U7", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
}
{
  const { ctx, page, jsFehler } = await starte({ w: 740, h: 360 });
  await page.evaluate(() => SU.route()); await warte(page, 500);
  await pruefe("U6b", "quer: nichts ragt seitlich heraus", () => breit(page));
  await pruefe("U7b", "keine JS-Fehler (quer)", () => jsFehler);
  await ctx.close();
}
{
  const { ctx, page, jsFehler } = await starte({ alteDB: true });
  await pruefe("U5", "alte Datenbank: kein Knopf", () => page.evaluate(() => (document.getElementById("suOeffnen") ? "Knopf da" : null)));
  await pruefe("U7c", "keine JS-Fehler (alte Datenbank)", () => jsFehler);
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\nSchüler-Überblick-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
