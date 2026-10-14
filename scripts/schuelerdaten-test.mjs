// Schülerdaten-Test (14.10.2026): Behörde, Vorbesitz, Umschreiber und Sehhilfe in der Fahrlehrer-App.
// Prüft die Akte (Karte „Behörde“, Hinweise zu Theorie-Frist und ausländischem Führerschein), das Bearbeiten-Blatt
// am Handy (360 px, quer), den Lkw-Weg aus dem Vorbesitz und den Abgleich der Sehhilfe mit dem Büro.
// Nur erfundene Testdaten. Keine Datenbank: getSupa() ist eine Attrappe, die Schreibvorgänge mitschreibt.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/schuelerdaten-test.mjs
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
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

let fehler = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { console.log(`ok  ${id} ${text}`); return; }
  fehler++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

const HILFEN = `
window.__t = {
  setze() {
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const mk = (id, name, form, extra) => { const s = Object.assign({ id, name, form, created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }, extra || {}); ensure(s); return s; };
    DB.students = [mk("u1", "Umut Erfunden", "B", { umschreiber: true }), mk("ce1", "Cem Erfunden", "CE"), mk("ce2", "Cora Erfunden", "CE"), mk("ce3", "Cid Erfunden", "CE", { lkwWeg: "C" }), mk("b1", "Bea Erfunden", "B", { sehhilfe: true })];
    DB.lessons = []; DB.termine = []; DB.exams = [];
    _authUser = { id: "me", email: "me@example.org" }; _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer" };
    const h = KR.todayISO();
    _schuelerFristen.u1 = { ausbildungsart: "umschreibung", bewerbernummer: "RL-0815", theorie_frist_bis: KR.addDaysISO(h, 10), vorbesitz: [],
      auslands_fs: [{ land: "Syrien", klasse: "B", erteilt_am: "2019-05-02", nummer: "SY-1", behoerde: "Damaskus" }], wohnsitz_de_seit: KR.addDaysISO(h, -175), uebersetzung_vorhanden: false };
    _schuelerFristen.ce1 = { vorbesitz: ["B", "C"] };
    _schuelerFristen.ce2 = { vorbesitz: ["B"] };
    _schuelerFristen.ce3 = { vorbesitz: ["B"] };
    save();
  },
  stud: (id) => DB.students.find((x) => x.id === id),
};`;
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(600);
await page.evaluate((h) => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.__schreib = [];
  const upd = (tab) => ({ update: (w) => ({ eq: (_k, id) => ({ select: async () => { window.__schreib.push({ tab, id, w }); return { data: [{ id }], error: null }; } }) }) });
  window.getSupa = () => ({ from: (tab) => Object.assign(Object.create(null), { update: upd(tab).update, select: () => q, upsert: leer, insert: () => q, delete: () => q, eq: () => q, in: () => q, is: () => q }), rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
  (0, eval)(h);
  __t.setze();
}, HILFEN);


await pruefe("D1", "Akte Umschreiber: Karte „Behörde“ mit Bewerbernummer, Führerschein, „Darf fahren bis“; Warnung Theorie-Frist und Führerschein", () => page.evaluate(() => {
  routeDetail("u1");
  const t = document.querySelector("#view").textContent, f = [];
  if (!/Bewerbernummer/.test(t) || !/RL-0815/.test(t)) f.push("Bewerbernummer fehlt");
  if (!/Führerschein Syrien/.test(t) || !/SY-1/.test(t)) f.push("ausländischer Führerschein fehlt");
  if (!/Darf fahren bis/.test(t)) f.push("Darf fahren bis fehlt");
  if (!/Theorieprüfung muss bis/.test(t)) f.push("Warnung Theorie-Frist fehlt");
  if (!/Ausländischer Führerschein gilt nur noch bis/.test(t)) f.push("Warnung Führerschein fehlt");
  return f;
}));
await pruefe("D2", "Bearbeiten-Blatt: speichert nur Geändertes (Bewerbernummer, Vorbesitz, Übersetzung) direkt in schueler", async () => {
  await page.evaluate(() => { routeDetail("u1"); document.querySelector("#behoerdeBearb").click(); });
  await page.waitForTimeout(200);
  await page.fill("#bhNr", "RL-0816");
  await page.click('#bhVorbesitz .pill[data-k="B"]');
  await page.click("#bhUebers");
  await page.click("#bhSpeichern"); await page.waitForTimeout(300);
  return page.evaluate(() => {
    const w = (window.__schreib.filter((x) => x.tab === "schueler" && x.id === "u1").pop() || {}).w || {};
    const f = [];
    if (w.bewerbernummer !== "RL-0816") f.push("Bewerbernummer " + w.bewerbernummer);
    if (JSON.stringify(w.vorbesitz) !== '["B"]') f.push("Vorbesitz " + JSON.stringify(w.vorbesitz));
    if ("auslands_fs" in w || w.uebersetzung_vorhanden !== true) f.push("nur Geändertes senden (Führerschein unverändert, Übersetzung neu): " + JSON.stringify(w));
    if ("theorie_frist_bis" in w) f.push("App schreibt die Theorie-Frist (nur Büro)");
    if (_schuelerFristen.u1.bewerbernummer !== "RL-0816") f.push("Akte nicht aktualisiert");
    return f;
  });
});
await pruefe("D3", "Akte und Blatt bei 360 px und quer: nichts seitlich wischbar", async () => {
  const f = [];
  for (const [w, h] of [[360, 780], [780, 360]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => { closeSheet(); routeDetail("u1"); }); await page.waitForTimeout(200);
    let b = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (b > 1) f.push(`Akte ${w}×${h}: ${b} px zu breit`);
    await page.evaluate(() => document.querySelector("#behoerdeBearb").click()); await page.waitForTimeout(200);
    b = await page.evaluate(() => { const sh = document.querySelector("#sheet"); return Math.max(document.documentElement.scrollWidth - window.innerWidth, sh.scrollWidth - sh.clientWidth); });
    if (b > 1) f.push(`Blatt ${w}×${h}: ${b} px zu breit`);
  }
  await page.evaluate(() => closeSheet());
  await page.setViewportSize({ width: 412, height: 915 });
  return f;
});
await pruefe("D4", "Lkw-Weg aus dem Vorbesitz: CE mit C → 5/2/3, CE nur mit B → C+CE 8/3/3, selbst gewählter Weg geht vor", () => page.evaluate(() => {
  const w = (id) => sonderWerte(__t.stud(id)).join("/");
  const f = [];
  if (w("ce1") !== "5/2/3") f.push("ce1 " + w("ce1"));
  if (w("ce2") !== "8/3/3") f.push("ce2 " + w("ce2"));
  if (w("ce3") !== "5/2/3") f.push("ce3 " + w("ce3"));
  if (!lkwStufen(__t.stud("ce2")).flatMap((s) => s.items.map((i) => i.id)).includes("lk_gfa_rampe_r")) f.push("ce2 ohne C-Grundfahraufgaben");
  return f;
}));
await pruefe("D5", "Sehhilfe: Tippen schreibt in schueler; ein Wert aus dem Büro wird übernommen", async () => {
  await page.evaluate(() => { window.__schreib = []; routeDetail("ce1"); document.querySelector("#sehhilfeBtn").click(); });
  await page.waitForTimeout(200);
  return page.evaluate(async () => {
    const f = [];
    const w = window.__schreib.find((x) => x.id === "ce1");
    if (!w || w.w.sehhilfe !== true) f.push("Tippen schreibt nicht: " + JSON.stringify(window.__schreib));
    if (__t.stud("ce1")._sehhilfeOffen) f.push("bleibt als offen markiert");
    // Büro hat „nein“ eingetragen → App übernimmt
    const rows = [{ id: "b1", name: "Bea Erfunden", klasse: "B", status: "aktiv", fahrlehrer_id: "me", sehhilfe: false }];
    const alt = window.getSupa;
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (ok) => ok({ data: [], error: null }) : k === "single" || k === "maybeSingle" ? async () => ({ data: null, error: null }) : () => q), apply: () => q });
    window.getSupa = () => ({ from: (t) => t === "schueler" ? { select: () => ({ eq: () => ({ eq: async () => ({ data: rows, error: null }) }) }), update: alt().from("schueler").update } : q, rpc: async () => ({ data: null, error: null }) });
    try { await pullSchuelerZuweisungen(); } catch (e) { f.push("Ausnahme " + e.message); }
    window.getSupa = alt;
    if (__t.stud("b1").sehhilfe !== false) f.push("Büro-Wert nicht übernommen");
    return f;
  });
});
await pruefe("D7", "Theorie-Besuch in der Akte: B 12/14 mit „fehlt: 5, 11“, CE (Vorbesitz B,C) Grundstoff 6 + CE 4", () => page.evaluate(() => {
  const h = KR.todayISO();
  _schuelerFristen.b1 = { vorbesitz: [] };
  _theorieBesuch = { b1: ["1", "2", "3", "4", "6", "7", "8", "9", "10", "12", "13", "14"].map((l) => ({ lektion: l, datum: h })), ce1: [{ lektion: "CE1", datum: h }] };
  routeDetail("b1");
  const f = [], t = document.querySelector(".theorie-besuch") ? document.querySelector(".theorie-besuch").textContent : "";
  if (!/12 von 14/.test(t) || !/fehlt: 5, 11/.test(t)) f.push("B: " + t.slice(0, 120));
  routeDetail("ce1");
  const t2 = document.querySelector(".theorie-besuch") ? document.querySelector(".theorie-besuch").textContent : "";
  if (!/1 von 10/.test(t2) || !/Grundstoff/.test(t2) || !/Klasse CE/.test(t2)) f.push("CE: " + t2.slice(0, 120));
  routeDetail("u1");
  const t3 = document.querySelector(".tb-zeile") ? document.querySelector(".tb-zeile").textContent : "";
  if (!/keine Pflicht-Theorie/.test(t3)) f.push("Umschreiber: " + t3.slice(0, 80));
  return f;
}));
await pruefe("D8", "Anwesenheit im Theorie-Termin: Abend mit Lektion 7 wählt 7 + 8 vor, Antippen und Speichern ruft theorie_teilnahme_setzen", async () => {
  await page.evaluate(() => {
    const h = KR.todayISO();
    DB.lessons = [{ id: "th1", date: h, von: "18:00", bis: "19:30", art: "theorie", sid: null, lektion: 7 }, { id: "th2", date: h, von: "19:30", bis: "21:00", art: "theorie", sid: null, lektion: 7 }];
    window.__rpc = [];
    const alt = window.getSupa();
    window.getSupa = () => Object.assign({}, alt, { rpc: async (name, args) => { window.__rpc.push({ name, args });
      if (name === "theorie_schuelerliste") return { data: [{ id: "b1", name: "Bea Erfunden", klasse: "B", fahrlehrer_id: "me" }, { id: "x9", name: "Xaver Fremd", klasse: "B", fahrlehrer_id: "ander" }], error: null };
      if (name === "theorie_teilnahme_tag") return { data: [{ schueler_id: "x9", lektion: "7" }], error: null };
      return { data: { ok: true, eintraege: 4 }, error: null }; } });
    openTheorieAnwesenheit(DB.lessons[0]);
  });
  await page.waitForTimeout(400);
  const f = [];
  const sel = (await page.textContent(".ta-lekt-zeile span")).trim();
  if (sel !== "Lektion 7 + Lektion 8") f.push("vorgewählt: " + sel);
  if (await page.$("#taLekt")) f.push("Lektionen-Pills sind nicht eingeklappt");
  if (!(await page.isChecked('#taListe input[value="x9"]'))) f.push("schon Eingetragener ist nicht angehakt");
  await page.check('#taListe input[value="b1"]');
  await page.fill("#taSuche", "bea"); await page.waitForTimeout(100);
  if (await page.isVisible('#taListe input[value="x9"]')) f.push("Suche filtert nicht");
  for (const [w, h] of [[360, 780], [780, 360]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150);
    const b = await page.evaluate(() => { const sh = document.querySelector("#sheet"); return Math.max(document.documentElement.scrollWidth - window.innerWidth, sh.scrollWidth - sh.clientWidth); });
    if (b > 1) f.push(`${w}×${h}: ${b} px zu breit`);
  }
  await page.setViewportSize({ width: 412, height: 915 });
  // Abwählen bleibt abgewählt, auch wenn die Lektionen geändert werden
  await page.fill("#taSuche", "");
  await page.uncheck('#taListe input[value="x9"]');
  await page.click("#taLektAuf"); await page.click('#taLekt .pill[data-k="9"]'); await page.waitForTimeout(150);
  if (await page.isChecked('#taListe input[value="x9"]')) f.push("abgewählter Schüler ist wieder angehakt");
  await page.click('#taLekt .pill[data-k="9"]'); await page.waitForTimeout(150);
  await page.check('#taListe input[value="x9"]');
  await page.click("#taSpeichern"); await page.waitForTimeout(300);
  const setz = await page.evaluate(() => window.__rpc.find((x) => x.name === "theorie_teilnahme_setzen"));
  if (!setz || setz.args.p_lektionen.join("+") !== "7+8" || setz.args.p_schueler.slice().sort().join() !== "b1,x9") f.push("Speichern: " + JSON.stringify(setz && setz.args));
  const lokal = await page.evaluate(() => (_theorieBesuch.b1 || []).filter((x) => x.datum === KR.todayISO()).map((x) => x.lektion).sort().join("+"));
  if (!lokal.includes("7") || !lokal.includes("8")) f.push("Akte nicht sofort aktualisiert: " + lokal);
  return f;
});
await pruefe("D8b", "Anwesenheit: Laden der Eingetragenen schlägt fehl → Blatt schließt, nichts wird gespeichert", async () => {
  await page.evaluate(() => {
    window.__rpc = [];
    const alt = window.getSupa();
    window.getSupa = () => Object.assign({}, alt, { rpc: async (name, args) => { window.__rpc.push({ name, args });
      if (name === "theorie_schuelerliste") return { data: [{ id: "b1", name: "Bea Erfunden", klasse: "B", fahrlehrer_id: "me" }], error: null };
      if (name === "theorie_teilnahme_tag") return { data: null, error: { message: "Netz weg" } };
      return { data: { ok: true }, error: null }; } });
    openTheorieAnwesenheit(DB.lessons[0] || { date: KR.todayISO(), lektion: 7, art: "theorie" });
  });
  await page.waitForTimeout(300);
  const f = [];
  if (await page.evaluate(() => document.querySelector("#sheet").classList.contains("open") && !!document.querySelector("#taSpeichern"))) f.push("Blatt bleibt offen mit Speichern-Knopf");
  if (await page.evaluate(() => window.__rpc.some((x) => x.name === "theorie_teilnahme_setzen"))) f.push("es wurde gespeichert");
  return f;
});
await pruefe("D9", "Theorie eintragen: Lkw-Lektion C3 wählbar und am Termin gespeichert", async () => {
  await page.evaluate(() => { closeSheet(); DB.lessons = []; openTheorieSheet(); });
  await page.waitForTimeout(200);
  await page.selectOption("#thLektion", "C3");
  await page.click("#thSave"); await page.waitForTimeout(200);
  return page.evaluate(() => { const l = DB.lessons.filter((x) => x.art === "theorie"); return l.length === 2 && l.every((x) => x.lektion === "C3") && lektionTitel("C3") === "Kraftstrang" ? null : JSON.stringify(l.map((x) => x.lektion)); });
});
await pruefe("D10", "Lkw-Klassen nur mit Fahrlehrerlaubnis CE: ohne CE keine Lkw-Pills (außer der Schüler fährt schon Lkw), mit CE alle", () => page.evaluate(() => {
  const f = [], pills = () => [...document.querySelectorAll("#dashFormPills .pill")].map((b) => b.dataset.form).join(",");
  _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer", klassen: ["B", "BE"] };
  routeDetail("b1");
  if (/C1|CE|\bC\b/.test(pills())) f.push("B-Fahrlehrer sieht Lkw: " + pills());
  routeDetail("ce1");
  if (!pills().split(",").includes("CE")) f.push("bestehender CE-Schüler verliert seine Klasse");
  _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer", klassen: ["B", "BE", "C1", "C1E", "C", "CE"] };
  routeDetail("b1");
  if (!pills().includes("C1E")) f.push("CE-Fahrlehrer sieht keine Lkw-Klassen: " + pills());
  // Büro hat noch keine Klassen eingetragen: nichts sperren (wie vor Schritt 5)
  _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer", klassen: [] };
  routeDetail("b1");
  if (!pills().includes("C1E")) f.push("leere Klassen sperren Lkw: " + pills());
  return f;
}));
await pruefe("D11", "C und CE zusammen: Klasse je Fahrstunde umstellbar, Zähler in der Akte", () => page.evaluate(() => {
  const h = KR.addDaysISO(KR.todayISO(), -1), f = [];
  DB.lessons = [{ id: "fs1", sid: "ce2", date: h, von: "08:00", bis: "09:30", art: "fahrstunde" }, { id: "fs2", sid: "ce2", date: h, von: "10:00", bis: "11:30", art: "fahrstunde" }];
  openEventSheet("lesson", "fs2", "ce2");
  const b = document.querySelector("#esLkwKl");
  if (!b) return "kein Knopf „Klasse dieser Stunde“";
  b.click();
  if (DB.lessons.find((l) => l.id === "fs2").lkwKlasse !== "CE") f.push("Umstellen auf CE klappt nicht");
  closeSheet(); routeDetail("ce2");
  const z = (document.querySelector(".lkw-zaehler") || {}).textContent || "";
  if (!/Klasse C 2 UE/.test(z) || !/Klasse CE 2 UE/.test(z)) f.push("Zähler: " + z);
  return f;
}));
await pruefe("D6", "keine JS-Fehler", () => (jsFehler.length ? jsFehler.slice(0, 5) : null));

await browser.close();
server.close();
console.log(fehler ? `Schülerdaten-Test: ${fehler} Fehler.` : "Schülerdaten-Test: alles in Ordnung.");
process.exit(fehler ? 1 : 0);
