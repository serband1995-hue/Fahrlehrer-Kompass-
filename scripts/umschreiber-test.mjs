// W22-Test: Umschreiber steuert das Büro und wirkt überall gleich (🗣 Serband 26.11.2026).
//   U1  Büro markiert → App übernimmt (Merker „vom Büro“), Sonderfahrten raus aus der %-Wertung, nichts eingetragen
//   U2  Freigabe-Check: Zeile „Sonderfahrten – entfällt (Umschreiber)“ grün; Akte ohne „offen“
//   U3  Schalter in der App mit Fahrschule nur Anzeige; ohne Fahrschule wie bisher
//   U4  keine neue Sonderfahrt für Umschreiber (Kalender, Termin bearbeiten); eine alte bleibt bearbeitbar
//   U5  Lohn je Termin unverändert
//   U6  neu laden → alles noch da; gleicher Büro-Stand ändert nichts mehr
//   U7  Büro nimmt zurück → alles wie vorher (alte echte Sonderfahrt zählt wieder, gleiche %)
//   U8  Altfall (ältere App setzte „an“ ohne Merker): Büro schaltet ab → App geht zurück; „neu“/leer = kein Umschreiber
//   U13 Büro schaltet mehrmals hin und her, bevor die App abgleicht: Endstand gilt, Merker wird nie überschrieben
//   U9  Büro-Seite: gleiche Wahrheit (istUmschreiber), gleiche Zahl wie die App, „wird neu berechnet“ bis zum Abgleich,
//       Termin-Fenster sperrt „Sonderfahrt“
// Nur erfundene Daten, kein Netz. Aufruf: NODE_PATH=$(npm root -g) node scripts/umschreiber-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { bauDaten } = require("../buero-vorfuehrung.js");
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
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n").filter((l, i) => i === 0 || /intercept|not visible|not stable|outside/.test(l)).slice(0, 3).join(" | "); }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 300) => page.waitForTimeout(ms);
const breit = (page) => page.evaluate(() => { const d = document.documentElement; return d.scrollWidth > d.clientWidth + 1 ? "scrollWidth " + d.scrollWidth + " > " + d.clientWidth : null; });

// Nachgebauter Server: schueler liefert window._rows, alles andere leer
function mockSupa() {
  const gen = (rows) => ({ then: (ok, no) => Promise.resolve({ data: rows, error: null }).then(ok, no), select() { return gen(rows); }, eq() { return gen(rows); }, neq() { return gen(rows); }, in() { return gen(rows); }, is() { return gen(rows); }, gte() { return gen(rows); }, lte() { return gen(rows); }, order() { return gen(rows); }, limit() { return gen(rows); }, range() { return gen(rows); }, update() { return gen([]); }, upsert() { return gen([]); }, insert() { return gen([]); }, maybeSingle() { return Promise.resolve({ data: null, error: null }); }, single() { return Promise.resolve({ data: null, error: null }); } });
  window.getSupa = () => ({ from: (tab) => (tab === "schueler" ? gen(window._rows || []) : gen([])), rpc: async () => ({ data: [], error: null }), auth: { getUser: async () => ({ data: {}, error: null }), getSession: async () => ({ data: {}, error: null }) }, functions: { invoke: async () => ({ data: null, error: null }) } });
}

async function oeffneApp({ w = 360, h = 780, mitFahrschule = true, neu = true } = {}, ctxAlt) {
  const ctx = ctxAlt || await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(([fs, neu, mock]) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    (new Function(mock))();
    _authUser = { id: "u-ich" }; _authProfile = fs ? { id: "u-ich", fahrschule_id: "fs-muster", klassen: ["B"] } : { id: "u-ich", klassen: ["B"] };
    ensureAusbildungsplaene(); ensureDB();
    if (!neu) return;
    const mk = (id, name) => { const s = { id, name, form: "B", created: Date.now(), plan: newPlan(), telefon: "" }; ensure(s);
      // 70 % der Themen grün, auch Sonderfahrt-Themen (damit die %-Zahl sich bei „Umschreiber“ sichtbar ändert)
      const ids = evalSkillsFor(s); ids.slice(0, Math.round(ids.length * 0.7)).forEach((x) => { s.plan.ampeln[x] = "gruen"; });
      ["s_ueb_tempo", "s_ab_ein"].forEach((x) => { s.plan.ampeln[x] = "rot"; });
      s.plan.theorie = true; return s; };
    const a = mk("u1", "Testschüler Eins"), b = mk("u2", "Testschüler Zwei");
    // u1: eine echte, früher gefahrene Sonderfahrt (Überland 1) mit Termin
    a.plan.sonder.ueberland[0] = { d: "10.11.", iso: "2026-11-10", tid: "L1" };
    b.umschreiber = true; // u2: wie von App v147 einmalig übernommen (ohne Merker)
    DB.students = [a, b];
    DB.lessons = [
      { id: "L1", sid: "u1", date: "2026-11-10", von: "10:00", bis: "11:30", art: "sonder", status: "gefahren", srcSonder: "u1:ueberland:0", srcSonderMin: 90, note: "Überlandfahrt" },
      { id: "L2", sid: "u1", date: "2026-11-12", von: "10:00", bis: "11:30", art: "fahrstunde", status: "gefahren" },
      { id: "L3", sid: "u1", date: "2099-01-05", von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant" }];
    DB.termine = []; DB.exams = [];
    window._rows = [
      { id: "u1", fahrlehrer_id: "u-ich", status: "aktiv", ausbildungsart: "ersterwerb", klasse: "B", vorbesitz: [], name: "Testschüler Eins" },
      { id: "u2", fahrlehrer_id: "u-ich", status: "aktiv", ausbildungsart: "umschreibung", klasse: "B", vorbesitz: [], name: "Testschüler Zwei" }];
    save();
  }, [mitFahrschule, neu, "(" + mockSupa.toString() + ")()"]);
  await warte(page, 200);
  return { ctx, page, jsFehler };
}
const abruf = (page) => page.evaluate(async () => { _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen(); });
const setzeArt = (page, id, art) => page.evaluate(([id, art]) => { window._rows.find((r) => r.id === id).ausbildungsart = art; }, [id, art]);
const zustand = (page, id) => page.evaluate((id) => {
  const s = DB.students.find((x) => x.id === id); const R = examReadiness(s);
  const zeile = R.items.find((it) => /Sonderfahrt/.test(it.label));
  return { um: !!s.umschreiber, merker: !!s.umschreiberVomBuero, pct: stand(s), sfLabel: zeile.label, sfOk: zeile.ok, box: JSON.stringify(s.plan.sonder.ueberland[0] || null),
    lessons: (DB.lessons || []).length, zeilePct: _schuelerZeile(s).ausbildung.standPct, zeileUm: !!_schuelerZeile(s).ausbildung.umschreiber };
}, id);
const lohn = (page) => page.evaluate(() => JSON.stringify((DB.lessons || []).map((l) => [l.id, _lohnStandVon(l), ueOf(l.art, l.von, l.bis, l.tatsaechlicheDauer)])));

let appZeile = null, appZeileVorher = null, pctVorher = null;
{
  const { ctx, page, jsFehler } = await oeffneApp();
  await abruf(page);
  const v = await zustand(page, "u1"); pctVorher = v.pct;
  appZeileVorher = await page.evaluate(() => _schuelerZeile(DB.students.find((x) => x.id === "u1")).ausbildung);
  const lohnVorher = await lohn(page);
  await pruefe("U0", "Ausgang: kein Umschreiber, Sonderfahrten 1/…, alte Fahrt im Kästchen", () => (!v.um && !v.merker && /Sonderfahrten 1\//.test(v.sfLabel) && v.sfOk === false && /L1/.test(v.box) ? null : JSON.stringify(v)));

  await setzeArt(page, "u1", "umschreibung"); await abruf(page);
  const n = await zustand(page, "u1");
  await pruefe("U1a", "Büro markiert → App: Umschreiber an, Merker „vom Büro“", () => (n.um && n.merker ? null : JSON.stringify(n)));
  await pruefe("U1b", "% neu berechnet (ohne Sonderfahrt-Themen), Cloud-Zeile trägt dieselbe Zahl und umschreiber", () => (n.pct !== v.pct && n.zeilePct === n.pct && n.zeileUm ? null : JSON.stringify({ v: v.pct, n })));
  await pruefe("U1c", "keine Fahrten/Kästchen angelegt, alte echte Sonderfahrt bleibt gespeichert", () => (n.lessons === v.lessons && n.box === v.box ? null : JSON.stringify({ v, n })));
  await pruefe("U1d", "Änderung gilt nicht als „abgeglichen“ → geht beim nächsten Speichern ins Büro", () => page.evaluate(() => {
    const m = _abglLaden(); const s = DB.students.find((x) => x.id === "u1"); return m.schueler.u1 && m.schueler.u1 === _abglWertVon("schueler", s) ? "als abgeglichen gemerkt" : null; }));
  await pruefe("U2a", "Freigabe-Check: „Sonderfahrten – entfällt (Umschreiber)“ grün", () => page.evaluate(() => {
    const h = freigabeCard(DB.students.find((x) => x.id === "u1")); const m = h.match(/<div class="fcheck-row (fc-\w+)"><span class="fcheck-mark">[^<]*<\/span><div class="fcheck-body"><div class="fcheck-lab">Sonderfahrten – entfällt \(Umschreiber\)/);
    return m && m[1] === "fc-ok" ? null : "Zeile fehlt oder nicht grün"; }));
  await page.evaluate(() => routeDetail("u1")); await warte(page, 300);
  await pruefe("U2b", "Akte: „Umschreiber – Sonderfahrten entfallen“, nichts „offen“, Schalter nur Anzeige", () => page.evaluate(() => {
    const t = document.querySelector(".lage-focus .lage-val").textContent; const k = document.getElementById("dashUmschreiberStatus");
    if (!/Umschreiber – Sonderfahrten entfallen/.test(t) || /offen/.test(t)) return "Stand: " + t;
    if (document.getElementById("dashUmschreiberToggle")) return "Schalter noch da";
    if (!k || !k.classList.contains("an") || !/Büro/.test(k.textContent)) return "Etikett: " + (k && k.outerHTML);
    return /Ändern nur im Büro/.test(k.closest(".theorie-card").textContent) ? null : "Hinweis fehlt"; }));
  await pruefe("U3a", "Etikett antippen (mit Fahrschule): nichts ändert sich, Etikett-Text lesbar (≥ 13 px)", async () => {
    await page.click("#dashUmschreiberStatus"); await warte(page, 300);
    const r = await page.evaluate(() => ({ um: DB.students.find((x) => x.id === "u1").umschreiber, px: parseFloat(getComputedStyle(document.getElementById("dashUmschreiberStatus")).fontSize) }));
    return r.um === true && r.px >= 13 ? null : JSON.stringify(r); });
  await pruefe("U3b", "360 px: Akte ragt nicht heraus", () => breit(page));
  // U4: neue Sonderfahrt gesperrt
  await page.evaluate(() => { routeKalender(); openAddLessonSheet("sonder"); }); await warte(page, 300);
  await pruefe("U4a", "Kalender „Sonderfahrt · mit wem?“: Umschreiber nicht wählbar", async () => {
    const t = await page.evaluate(() => document.querySelector('#alList [data-sid="u1"]').textContent);
    if (!/Umschreiber/.test(t)) return "Liste: " + t;
    await page.click('#alList [data-sid="u1"]', { force: true }); await warte(page, 250);
    const h = await page.evaluate(() => [document.querySelector(".sheet-h") && document.querySelector(".sheet-h").textContent, !!document.getElementById("alSave")]);
    return /mit wem/.test(h[0]) && !h[1] ? null : JSON.stringify(h); });
  await page.evaluate(() => closeSheet()); await warte(page, 200);
  await pruefe("U4b", "Termin bearbeiten: „Sonderfahrt“ gesperrt bei Fahrstunde, frei bei alter Sonderfahrt", async () => {
    await page.evaluate(() => openEventEdit("L3")); await warte(page, 250);
    const a = await page.evaluate(() => { const b = document.querySelector('.es-art[data-art="sonder"]'); return b ? b.disabled : "fehlt"; });
    await page.click('.es-art[data-art="sonder"]', { force: true }); await warte(page, 150);
    const gewechselt = await page.evaluate(() => document.querySelector('.es-art[data-art="sonder"]').classList.contains("on"));
    await page.evaluate(() => closeSheet()); await warte(page, 200);
    await page.evaluate(() => openEventEdit("L1")); await warte(page, 250);
    const b = await page.evaluate(() => { const x = document.querySelector('.es-art[data-art="sonder"]'); return x ? x.disabled : "fehlt"; });
    await page.evaluate(() => closeSheet()); await warte(page, 200);
    return a === true && b === false ? (gewechselt ? "Wechsel doch möglich (nur Klick-Sperre per disabled)" : null) : JSON.stringify({ a, b }); });
  await pruefe("U4c", "SF-Auswahl (Sonderfahrt zuordnen) legt für Umschreiber nichts an", async () => {
    const r = await page.evaluate(() => { const vor = JSON.stringify(DB.students.find((x) => x.id === "u1").plan.sonder); openSFPickerForLesson("L3", "u1", "2099-01-05", "10:00", "11:30", "", "sonder", null);
      return { gleich: JSON.stringify(DB.students.find((x) => x.id === "u1").plan.sonder) === vor, art: DB.lessons.find((l) => l.id === "L3").art, picker: !!document.querySelector(".sf-opt") }; });
    return r.gleich && r.art === "fahrstunde" && !r.picker ? null : JSON.stringify(r); });
  await pruefe("U4d", "„Termin vergeben“ (freier Platz): bei Sonderfahrt Umschreiber ausgegraut, Tippen bucht nichts", async () => {
    const n0 = await page.evaluate(() => DB.lessons.length);
    await page.evaluate(() => openAssignSlotSheet("2099-01-06", "10:00", "11:30", "fahrstunde")); await warte(page, 250);
    const vor = await page.evaluate(() => document.querySelector('#asList [data-sid="u1"]').textContent);
    await page.click('.seg-i[data-art="sonder"]'); await warte(page, 200);
    const nach = await page.evaluate(() => document.querySelector('#asList [data-sid="u1"]').textContent);
    await page.click('#asList [data-sid="u1"]', { force: true }); await warte(page, 300);
    const n1 = await page.evaluate(() => DB.lessons.length); await page.evaluate(() => closeSheet()); await warte(page, 200);
    return !/Umschreiber/.test(vor) && /Umschreiber/.test(nach) && n1 === n0 ? null : JSON.stringify({ vor, nach, n0, n1 }); });
  await pruefe("U2c", "„Nächster Fokus“ nennt beim Umschreiber keine Sonderfahrt-Themen", () => page.evaluate(() => { const t = autoNext(DB.students.find((x) => x.id === "u1")).text; return /Sonderfahrten/.test(t) ? t : null; }));
  await pruefe("U5", "Lohn je Termin (Lohn-Stand, UE) unverändert", async () => ((await lohn(page)) === lohnVorher ? null : "vorher " + lohnVorher + " nachher " + (await lohn(page))));
  appZeile = await page.evaluate(() => _schuelerZeile(DB.students.find((x) => x.id === "u1")).ausbildung);

  // U6: neu laden
  await page.evaluate(() => save()); await warte(page, 200);
  await page.close();
  const p2 = await oeffneApp({ neu: false }, ctx);
  await p2.page.evaluate(() => { window._rows = [
    { id: "u1", fahrlehrer_id: "u-ich", status: "aktiv", ausbildungsart: "umschreibung", klasse: "B", vorbesitz: [], name: "Testschüler Eins" },
    { id: "u2", fahrlehrer_id: "u-ich", status: "aktiv", ausbildungsart: "umschreibung", klasse: "B", vorbesitz: [], name: "Testschüler Zwei" }]; });
  const nachLaden = await zustand(p2.page, "u1");
  await pruefe("U6a", "neu laden: Umschreiber, Merker, %, alte Fahrt noch da", () => (nachLaden.um && nachLaden.merker && nachLaden.pct === n.pct && nachLaden.box === v.box ? null : JSON.stringify(nachLaden)));
  await pruefe("U6b", "gleicher Büro-Stand noch einmal: nichts ändert sich", () => p2.page.evaluate(async () => {
    const vor = JSON.stringify(DB.students.find((x) => x.id === "u1")); _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
    return JSON.stringify(DB.students.find((x) => x.id === "u1")) === vor ? null : "geändert"; }));

  // U7: Büro nimmt zurück
  await setzeArt(p2.page, "u1", "ersterwerb"); await abruf(p2.page);
  const z = await zustand(p2.page, "u1");
  await pruefe("U7a", "Büro nimmt zurück → Umschreiber aus, Merker weg", () => (!z.um && !z.merker ? null : JSON.stringify(z)));
  await pruefe("U7b", "alles wie vorher: gleiche %, alte echte Sonderfahrt zählt wieder (1/…), Cloud-Zeile gleich", () => (z.pct === pctVorher && /Sonderfahrten 1\//.test(z.sfLabel) && z.box === v.box && z.zeilePct === pctVorher && !z.zeileUm ? null : JSON.stringify({ z, pctVorher })));
  await pruefe("U7c", "Lohn nach dem Zurücknehmen unverändert", async () => ((await lohn(p2.page)) === lohnVorher ? null : "anders"));
  await p2.page.evaluate(() => routeDetail("u1")); await warte(p2.page, 300);
  await pruefe("U7d", "Akte wieder mit „Sonderfahrten offen“, Kalender bietet Sonderfahrt wieder an", () => p2.page.evaluate(() => {
    const t = document.querySelector(".lage-focus .lage-val").textContent; if (!/Sonderfahrten? offen/.test(t)) return "Stand: " + t;
    openAddLessonSheet("sonder"); const x = document.querySelector('#alList [data-sid="u1"]').textContent; closeSheet(); return /Umschreiber/.test(x) ? "noch gesperrt" : null; }));

  // U8: Altfall wie live (Büro setzte umschreibung, App v147 übernahm „an“ ohne Merker); erster Abruf der neuen App
  const u2 = await zustand(p2.page, "u2");
  await pruefe("U8a", "Altfall: Spalte umschreibung + App an ohne Merker → bleibt an, Merker kommt dazu", () => (u2.um && u2.merker ? null : JSON.stringify(u2)));
  await setzeArt(p2.page, "u2", "ersterwerb"); await abruf(p2.page);
  const u2b = await zustand(p2.page, "u2");
  await pruefe("U8b", "Altfall: Büro schaltet ab → App aus, Merker weg, Sonderfahrten zählen wieder", () => (!u2b.um && !u2b.merker && /Sonderfahrten 0\//.test(u2b.sfLabel) ? null : JSON.stringify(u2b)));
  await pruefe("U8c", "Altfall ohne Merker direkt abgeschaltet (Büro schaltet ab, bevor die neue App je abglich) → App aus", () => p2.page.evaluate(async () => {
    const s = DB.students.find((x) => x.id === "u2"); s.umschreiber = true; delete s.umschreiberVomBuero; _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
    return !s.umschreiber && !s.umschreiberVomBuero ? null : JSON.stringify({ u: s.umschreiber, m: s.umschreiberVomBuero }); }));
  await pruefe("U8d", "Werte „neu“, leer, null = kein Umschreiber; alte Datenbank ohne Spalte: nichts anfassen", () => p2.page.evaluate(async () => {
    const s = DB.students.find((x) => x.id === "u2"); const r = window._rows.find((x) => x.id === "u2"); const out = [];
    for (const w of ["neu", "", null]) { s.umschreiber = true; r.ausbildungsart = w; _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen(); out.push(!!s.umschreiber); }
    delete r.ausbildungsart; s.umschreiber = true; _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen(); const ohneSpalte = !!s.umschreiber;
    s.umschreiber = false; r.ausbildungsart = "ersterwerb";
    return out.every((x) => x === false) && ohneSpalte ? null : JSON.stringify({ out, ohneSpalte }); }));
  await pruefe("U13a", "Büro an→aus→an vor dem Abgleich: App sieht Endstand „an“, ein Merker", () => p2.page.evaluate(async () => {
    const r = window._rows.find((x) => x.id === "u2"); const s = DB.students.find((x) => x.id === "u2");
    r.ausbildungsart = "umschreibung"; r.ausbildungsart = "ersterwerb"; r.ausbildungsart = "umschreibung";
    _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
    window._m1 = JSON.stringify(s.umschreiberVomBuero);
    return s.umschreiber && s.umschreiberVomBuero && s.umschreiberVomBuero.vorherApp === false ? null : JSON.stringify(s.umschreiberVomBuero); }));
  await pruefe("U13b", "erneuter Abruf „an“ (auch nachdem die App lokal verstellt wurde): Merker unverändert, wieder an", () => p2.page.evaluate(async () => {
    const s = DB.students.find((x) => x.id === "u2"); s.umschreiber = false; // z. B. alte App auf zweitem Gerät
    _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
    return s.umschreiber && JSON.stringify(s.umschreiberVomBuero) === window._m1 ? null : JSON.stringify({ u: s.umschreiber, m: s.umschreiberVomBuero, alt: window._m1 }); }));
  await pruefe("U13c", "Büro aus→an→aus vor dem Abgleich: App aus, Merker weg", () => p2.page.evaluate(async () => {
    const r = window._rows.find((x) => x.id === "u2"); const s = DB.students.find((x) => x.id === "u2");
    r.ausbildungsart = "ersterwerb"; r.ausbildungsart = "umschreibung"; r.ausbildungsart = "ersterwerb";
    _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
    return !s.umschreiber && !s.umschreiberVomBuero ? null : JSON.stringify({ u: s.umschreiber, m: s.umschreiberVomBuero }); }));
  await p2.page.evaluate(() => routeDetail("u2")); await warte(p2.page, 300);
  await pruefe("U8e", "mit Fahrschule bei „aus“: „Kein Umschreiber“ mit Etikett Büro, kein Schalter", () => p2.page.evaluate(() => {
    const k = document.getElementById("dashUmschreiberStatus"); const c = k && k.closest(".theorie-card");
    return k && !k.classList.contains("an") && !document.getElementById("dashUmschreiberToggle") && /Kein Umschreiber/.test(c.textContent) ? null : (c ? c.textContent : "fehlt"); }));

  // U10: neuer Schüler vom Büro als Umschreiber; Gesamtansicht
  await pruefe("U10a", "neuer Schüler vom Büro (Umschreibung) kommt als Umschreiber mit Merker an", () => p2.page.evaluate(async () => {
    window._rows.push({ id: "u3", fahrlehrer_id: "u-ich", status: "aktiv", ausbildungsart: "umschreibung", klasse: "B", vorbesitz: [], name: "Testschüler Drei", ausbildung: { umschreiber: true, umschreiberVomBuero: { am: "2026-11-26T10:00:00.000Z", vorherApp: false } } });
    _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen(); const s = DB.students.find((x) => x.id === "u3");
    return s && s.umschreiber && s.umschreiberVomBuero ? null : JSON.stringify(s && { u: s.umschreiber, m: s.umschreiberVomBuero }); }));
  await pruefe("U10b", "Gesamtansicht (Leitung): Büro-Angabe gilt sofort, Rücknahme auch", () => p2.page.evaluate(() => {
    const n = (k) => "–";
    const a = _fsMapSchueler({ id: "g1", name: "G", ausbildungsart: "umschreibung", ausbildung: { plan: newPlan() } }, n);
    const b = _fsMapSchueler({ id: "g2", name: "G", ausbildungsart: "ersterwerb", ausbildung: { plan: newPlan(), umschreiber: true, umschreiberVomBuero: { am: "x" } } }, n);
    const c = _fsMapSchueler({ id: "g3", name: "G", ausbildungsart: "ersterwerb", ausbildung: { plan: newPlan(), umschreiber: true } }, n);
    const d = _fsMapSchueler({ id: "g4", name: "G", ausbildung: { plan: newPlan(), umschreiber: true } }, n); // alte Datenbank ohne Spalte
    return a.umschreiber && a.umschreiberVomBuero && !b.umschreiber && !b.umschreiberVomBuero && !c.umschreiber && d.umschreiber ? null : JSON.stringify([a.umschreiber, b.umschreiber, c.umschreiber, d.umschreiber]); }));
  await pruefe("U11", "keine JS-Fehler (App)", () => jsFehler.concat(p2.jsFehler));
  await ctx.close();
}
// U9 ohne Fahrschule: Schalter wie bisher
{
  const { ctx, page, jsFehler } = await oeffneApp({ mitFahrschule: false });
  await page.evaluate(() => routeDetail("u1")); await warte(page, 300);
  await pruefe("U9a", "ohne Fahrschule: Schalter frei, an und wieder aus", async () => {
    const dis = await page.evaluate(() => document.getElementById("dashUmschreiberToggle").getAttribute("aria-disabled"));
    await page.click("#dashUmschreiberToggle"); await warte(page, 300);
    const an = await page.evaluate(() => DB.students.find((x) => x.id === "u1").umschreiber);
    await page.click("#dashUmschreiberToggle"); await warte(page, 300);
    const aus = await page.evaluate(() => DB.students.find((x) => x.id === "u1").umschreiber);
    return dis === null && an === true && aus === false ? null : JSON.stringify({ dis, an, aus }); });
  await pruefe("U9b", "ohne Fahrschule, Umschreiber an: neue Sonderfahrt gesperrt", () => page.evaluate(() => {
    DB.students.find((x) => x.id === "u1").umschreiber = true; openAddLessonSheet("sonder"); const t = document.querySelector('#alList [data-sid="u1"]').textContent; closeSheet(); return /Umschreiber/.test(t) ? null : t; }));
  await pruefe("U9c", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
}
// Quer 740×360: Akte mit Nur-Anzeige-Schalter
{
  const { ctx, page, jsFehler } = await oeffneApp({ w: 740, h: 360 });
  await setzeArt(page, "u1", "umschreibung"); await abruf(page);
  await page.evaluate(() => routeDetail("u1")); await warte(page, 300);
  await pruefe("U12", "quer: nichts ragt heraus, Etikett ganz sichtbar", async () => (await breit(page)) || page.evaluate(() => { const e = document.getElementById("dashUmschreiberStatus"), r = e.getBoundingClientRect(), c = e.closest(".theorie-card").getBoundingClientRect(); return r.right <= c.right + 0.5 && r.height >= 30 ? null : JSON.stringify([r.right, c.right, r.height]); }));
  await pruefe("U12c", "gesperrte Knöpfe lesbar: keine Durchsichtigkeit, Hinweis ≥ 13 px", () => page.evaluate(() => {
    openEventEdit("L3"); const b = document.querySelector('.es-art[data-art="sonder"]'), h = document.querySelector(".sf-gesperrt-hinweis");
    const r = { op: getComputedStyle(b).opacity, px: h ? parseFloat(getComputedStyle(h).fontSize) : 0 }; closeSheet();
    return r.op === "1" && r.px >= 13 ? null : JSON.stringify(r); }));
  await pruefe("U12b", "keine JS-Fehler (quer)", () => jsFehler);
  await ctx.close();
}
// U9: Büro-Seite – dieselbe Wahrheit und dieselbe Zahl
{
  const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  const daten = bauDaten(new Date().toISOString().slice(0, 10));
  await page.addInitScript(([d]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: null }; }, [daten]);
  await page.goto(basis + "buero.html"); await warte(page, 500);
  const r = await page.evaluate(([nach, vor]) => {
    // Fahrlehrer mit App (liefert den Stand nach) und einer ohne App
    S.lehrer = (S.lehrer || []).concat([{ id: "fl-app", name: "Test App" }, { id: "fl-ohne", name: "Test ohne", ohne_app: true }]);
    const x = { id: "u1", fahrlehrer_id: "fl-app", ausbildungsart: "umschreibung", ausbildung: nach };
    const xVor = { id: "u1", fahrlehrer_id: "fl-app", ausbildungsart: "umschreibung", ausbildung: vor };
    const xZur = { id: "u1", fahrlehrer_id: "fl-app", ausbildungsart: "ersterwerb", ausbildung: nach };
    const xAlt = { id: "u2", fahrlehrer_id: "fl-app", ausbildungsart: "ersterwerb", ausbildung: { umschreiber: true } };
    const xNeu = { id: "u4", fahrlehrer_id: "fl-app", ausbildungsart: "neu", ausbildung: {} };
    const xOhne = { id: "u5", fahrlehrer_id: "fl-ohne", ausbildungsart: "ersterwerb", ausbildung: { standPct: 55, umschreiber: true } };
    const xKein = { id: "u6", ausbildungsart: "ersterwerb", ausbildung: { standPct: 55, umschreiber: true } };
    return { ist: istUmschreiber(x), istZur: istUmschreiber(xZur), istAlt: istUmschreiber(xAlt), istNeu: istUmschreiber(xNeu), istVor: istUmschreiber(xVor),
      zahl: standHTML(nach, x), zahlVor: standHTML(vor, xVor), zahlZur: standHTML(nach, xZur), zahlAlt: standHTML({ standPct: 40, umschreiber: true }, xAlt), zahlNeu: standHTML({ standPct: 40 }, xNeu), zahlOhne: standHTML(xOhne.ausbildung, xOhne), zahlKein: standHTML(xKein.ausbildung, xKein) };
  }, [appZeile, appZeileVorher]);
  await pruefe("U9d", "Büro: istUmschreiber folgt nur der Spalte (an, zurück; App-Echo zählt nicht; „neu“ = nein)", () => (r.ist && !r.istZur && !r.istAlt && !r.istNeu && r.istVor ? null : JSON.stringify(r)));
  await pruefe("U9e", "Büro zeigt nach dem App-Abgleich dieselbe Zahl wie die App", () => (r.zahl.includes(`>${appZeile.standPct} %<`) ? null : r.zahl + " / App " + appZeile.standPct));
  await pruefe("U9f", "Büro zeigt vor dem App-Abgleich „wird neu berechnet“ statt der alten Zahl (beide Richtungen)", () => (/wird neu berechnet/.test(r.zahlVor) && /wird neu berechnet/.test(r.zahlZur) && /wird neu berechnet/.test(r.zahlAlt) && /40 %/.test(r.zahlNeu) ? null : JSON.stringify([r.zahlVor, r.zahlZur, r.zahlAlt, r.zahlNeu])));
  await pruefe("U9j", "Fahrlehrer ohne App oder ohne Fahrlehrer: Zahl bleibt sichtbar (kein dauerhaftes „wird neu berechnet“)", () => (/55 %/.test(r.zahlOhne) && /55 %/.test(r.zahlKein) ? null : JSON.stringify([r.zahlOhne, r.zahlKein])));
  await pruefe("U9g", "Büro-Termin: Sonderfahrt für Umschreiber gesperrt, für andere nicht", () => page.evaluate(() => {
    const alt = S.schueler; S.schueler = [{ id: "u1", ausbildungsart: "umschreibung", ausbildung: {} }, { id: "u2", ausbildungsart: "ersterwerb", ausbildung: {} }];
    const r = [umschreiberSchueler("u1"), umschreiberSchueler("u2"), umschreiberSchueler("")]; S.schueler = alt;
    return r[0] === true && r[1] === false && r[2] === false ? null : JSON.stringify(r); }));
  await pruefe("U9i", "Büro-Fristen (Ausländischer Führerschein): veraltetes App-Echo zählt nicht, Spalte schon", () => page.evaluate(() => {
    const fs = [{ land: "Türkei" }], w = "2026-01-01";
    const a = KR.umschreibInfo({ ausbildungsart: "ersterwerb", ausbildung: { umschreiber: true }, auslands_fs: fs, wohnsitz_de_seit: w }).stufe;
    const b = KR.umschreibInfo({ ausbildungsart: "umschreibung", ausbildung: {}, auslands_fs: fs, wohnsitz_de_seit: w }).stufe;
    const c = KR.umschreibInfo({ ausbildung: { umschreiber: true }, auslands_fs: fs, wohnsitz_de_seit: w }).stufe; // ohne Spalte (App-Daten)
    return a === "kein" && b !== "kein" && c !== "kein" ? null : JSON.stringify([a, b, c]); }));
  await pruefe("U9k", "Büro-Termin: auch „Nachtfahrt“ gesperrt; bestehende SF bleibt bearbeitbar; Schülertausch auf Umschreiber gesperrt", () => page.evaluate(() => {
    const alt = S.schueler; S.schueler = [{ id: "u1", ausbildungsart: "umschreibung", ausbildung: {} }, { id: "u2", ausbildungsart: "ersterwerb", ausbildung: {} }];
    const r = [umschreiberSfGesperrt({}, "nacht", "u1"), umschreiberSfGesperrt({}, "sonder", "u1"), umschreiberSfGesperrt({}, "fahrstunde", "u1"),
      umschreiberSfGesperrt({}, "nacht", "u2"), umschreiberSfGesperrt({ id: "t1", art: "nacht", schueler_id: "u1" }, "nacht", "u1"),
      umschreiberSfGesperrt({ id: "t2", art: "sonder", schueler_id: "u2" }, "sonder", "u1"), umschreiberSfGesperrt({ id: "t3", art: "sonder", schueler_id: "u1" }, "nacht", "u1"), umschreiberSfGesperrt({ art: "nacht", schueler_id: "u1" }, "nacht", "u1")];
    S.schueler = alt;
    return JSON.stringify(r) === JSON.stringify([true, true, false, false, false, true, false, true]) ? null : JSON.stringify(r); }));
  await pruefe("U9l", "Büro-Termin-Fenster: Hinweis bei Umschreiber + Nachtfahrt sichtbar, Speichern blockiert", async () => {
    const r = await page.evaluate(async () => {
      // Büro ohne Anmeldung: Testschüler und Testfahrlehrer selbst hinlegen
      S.lehrer = (S.lehrer || []).concat([{ id: "fl-test", name: "Test Lehrer", aktiv: true }]); S.team = S.team || []; S.fahrzeuge = S.fahrzeuge || []; S.termine = S.termine || [];
      const x = { id: "u9", name: "Testschüler Neun", fahrlehrer_id: "fl-test", status: "aktiv", ausbildungsart: "ersterwerb", ausbildung: {} };
      S.schueler = (S.schueler || []).concat([x]); const altArt = x.ausbildungsart; x.ausbildungsart = "umschreibung";
      const vorher = S.termine.length;
      terminDialog(null, { datum: KR.todayISO(), von: "10:00", art: "nacht", schueler_id: x.id, fahrlehrer_id: x.fahrlehrer_id });
      await new Promise((ok) => setTimeout(ok, 200));
      const dlg = [...document.querySelectorAll("dialog[open]")].pop(); const h = dlg && dlg.querySelector("#umSfHinweis");
      const sichtbar = !!h && !h.hidden;
      const knopf = dlg && dlg.querySelector("button[value=ok]"); if (knopf) knopf.click();
      await new Promise((ok) => setTimeout(ok, 400));
      const offen = !!(dlg && dlg.open); if (dlg && dlg.open) dlg.close();
      x.ausbildungsart = altArt; return { sichtbar, offen, neu: S.termine.length - vorher };
    });
    return r.sichtbar && r.offen && r.neu === 0 ? null : JSON.stringify(r); });
  await pruefe("U9h", "keine JS-Fehler (Büro)", () => jsFehler);
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\nUmschreiber-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
