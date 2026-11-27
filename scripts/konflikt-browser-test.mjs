// P1.4a/b (W25): Überschneidungs-Warnung und Spalten in der echten App (Handy 360 und 412 px), erfundene Schüler, keine Datenbank.
//   B1 Tagesansicht: zwei gleichzeitige Termine stehen nebeneinander, beide mit ⚠
//   B2 Eintragen mit Überschneidung → Rückfrage, „Abbrechen“ ist Hauptknopf, Abbrechen speichert nichts
//   B3 „Trotzdem speichern“ speichert
//   B4 Ende = Anfang → keine Rückfrage; abgesagter Termin → keine Rückfrage
//   B5 Bearbeiten auf belegte Zeit → Rückfrage; nur Notiz ändern → keine Rückfrage
//   B6 Wochenansicht: ⚠ an überlappenden Kacheln
//   B7 nichts läuft seitlich über (360 px), keine JS-Fehler
//   B12 acht gleichzeitige Termine: Spalten ≥ 60 px, Tagesansicht seitlich wischbar, Seite läuft nicht über
//   B11 Büro-Kalender: zwei gleichzeitige Termine nebeneinander, ⇄ in der Ecke, Anfangszeit nicht abgeschnitten (360/412/1024 px)
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/konflikt-browser-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
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

for (const breite of [360, 412]) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 800 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await warte(page, 600);
  const tag = await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const neu = (id, name) => { const s = { id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }; try { ensure(s); } catch (e) {} return s; };
    DB.students = [neu("m1", "Mia Muster"), neu("m2", "Tom Test")]; DB.exams = []; DB.termine = [];
    let tag = addDays(todayISO(), 2); if (weekdayMon0(tag) === 6) tag = addDays(tag, 1);
    DB.workCfg.fahrzeuge = [];
    DB.lessons = [
      { id: "A", sid: "m1", date: tag, von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant" },
      { id: "B", sid: "m2", date: tag, von: "10:45", bis: "12:15", art: "fahrstunde", status: "geplant" },
      { id: "C", sid: "m2", date: tag, von: "15:00", bis: "16:30", art: "fahrstunde", status: "abgesagt" },
    ];
    save(); _calView = "tag"; _calDate = tag; routeKalender(); return tag;
  });
  await warte(page, 500);
  const b = `[${breite}]`;
  await pruefe("B1" + b, "überlappende Termine nebeneinander, beide mit ⚠", () => page.evaluate(() => {
    const el = (id) => document.querySelector(`.ct-ev[data-evedit^="lesson|${id}|"]`);
    const a = el("A"), bb = el("B"); if (!a || !bb) return "Termine fehlen";
    const ra = a.getBoundingClientRect(), rb = bb.getBoundingClientRect(), f = [];
    if (!(ra.right <= rb.left + 1 || rb.right <= ra.left + 1)) f.push(`überdecken sich (${Math.round(ra.left)}–${Math.round(ra.right)} / ${Math.round(rb.left)}–${Math.round(rb.right)})`);
    if (ra.width < 120) f.push("zu schmal: " + Math.round(ra.width));
    if (!a.classList.contains("kf-ueber") || !bb.querySelector(".kf-zeichen")) f.push("kein Warnzeichen");
    return f;
  }));
  await page.screenshot({ path: `${process.env.SHOTS || "/tmp"}/konflikt-tag-${breite}.png` });
  // B2/B3: Eintragen 11:00 für Mia (gleicher Schüler + gleicher Fahrlehrer)
  const eintragen = async (sid, von) => {
    await page.evaluate(() => openAddLessonSheet("fahrstunde")); await warte(page);
    await page.click(`#alList .as-item[data-sid="${sid}"]`); await warte(page);
    await page.fill("#alDate", tag); await page.fill("#alTime", von);
    await page.click("#alSave"); await warte(page, 400);
  };
  await eintragen("m1", "11:00");
  await pruefe("B2" + b, "Rückfrage erscheint, Abbrechen ist Hauptknopf, Abbrechen speichert nichts", async () => {
    const r = await page.evaluate(() => ({ da: !!document.getElementById("kfNein"), haupt: (document.getElementById("kfNein") || {}).className || "", text: (document.querySelector(".kf-liste") || {}).innerText || "" }));
    if (!r.da) return "keine Rückfrage";
    const f = [];
    if (!/btn-primary/.test(r.haupt)) f.push("Abbrechen nicht Hauptknopf");
    if (!/gleicher Schüler/.test(r.text) || !/gleicher Fahrlehrer/.test(r.text)) f.push("Grund fehlt: " + r.text);
    const vorher = await page.evaluate(() => DB.lessons.length);
    await page.click("#kfNein"); await warte(page, 300);
    const nach = await page.evaluate(() => ({ n: DB.lessons.length, form: !!document.getElementById("alSave") }));
    if (nach.n !== vorher) f.push("trotz Abbrechen gespeichert");
    if (!nach.form) f.push("nach Abbrechen nicht zurück im Formular");
    return f;
  });
  await pruefe("B3" + b, "„Trotzdem speichern“ speichert", async () => {
    const vorher = await page.evaluate(() => DB.lessons.length);
    await page.click("#alSave"); await warte(page, 300); await page.click("#kfJa"); await warte(page, 300);
    const n = await page.evaluate(() => DB.lessons.length);
    return n === vorher + 1 ? true : `Anzahl ${vorher} → ${n}`;
  });
  await pruefe("B4" + b, "Ende = Anfang und abgesagter Termin: keine Rückfrage", async () => {
    await page.evaluate(() => { DB.lessons = DB.lessons.filter((l) => ["A", "B", "C"].includes(l.id)); save(); closeSheet(); });
    await eintragen("m2", "12:15"); // B endet 12:15
    const r1 = await page.evaluate(() => ({ frage: !!document.getElementById("kfNein"), n: DB.lessons.length }));
    await eintragen("m2", "15:00"); // C ist abgesagt
    const r2 = await page.evaluate(() => ({ frage: !!document.getElementById("kfNein"), n: DB.lessons.length }));
    const f = [];
    if (r1.frage || r1.n !== 4) f.push("Ende=Anfang: " + JSON.stringify(r1));
    if (r2.frage || r2.n !== 5) f.push("abgesagt: " + JSON.stringify(r2));
    return f;
  });
  await pruefe("B5" + b, "Bearbeiten auf belegte Zeit fragt; nur Notiz ändern fragt nicht", async () => {
    const f = [];
    await page.evaluate(() => { closeSheet(); DB.lessons = DB.lessons.filter((l) => ["A", "B", "C"].includes(l.id)); save(); openEventEdit("B"); }); await warte(page);
    await page.fill("#esNote", "nur Notiz"); await page.click("#esSave"); await warte(page, 300);
    let r = await page.evaluate(() => ({ frage: !!document.getElementById("kfNein"), note: DB.lessons.find((l) => l.id === "B").note }));
    if (r.frage || r.note !== "nur Notiz") f.push("Notiz: " + JSON.stringify(r));
    await page.evaluate(() => { closeSheet(); DB.lessons.find((l) => l.id === "B").von = "13:00"; DB.lessons.find((l) => l.id === "B").bis = "14:30"; save(); openEventEdit("B"); }); await warte(page);
    await page.fill("#esTime", "10:30"); await page.click("#esSave"); await warte(page, 300);
    r = await page.evaluate(() => ({ frage: !!document.getElementById("kfNein"), von: DB.lessons.find((l) => l.id === "B").von }));
    if (!r.frage) f.push("keine Rückfrage beim Verschieben auf 10:30");
    if (r.frage) { await page.click("#kfNein"); await warte(page, 300); }
    const von = await page.evaluate(() => DB.lessons.find((l) => l.id === "B").von);
    if (von !== "13:00") f.push("trotz Abbrechen geändert: " + von);
    return f;
  });
  await pruefe("B6" + b, "Wochenansicht zeigt ⚠ an überlappenden Kacheln", async () => {
    await page.evaluate(() => { closeSheet(); const l = DB.lessons.find((x) => x.id === "B"); l.von = "10:45"; l.bis = "12:15"; save(); _calView = "woche"; routeKalender(); }); await warte(page, 400);
    return page.evaluate(() => document.querySelectorAll(".cw-ev.kf-ueber .kf-zeichen").length >= 2 ? true : "Warnzeichen fehlen");
  });
  await pruefe("B8" + b, "drei gleichzeitige Termine: 3 Spalten, nur Zeit und Vorname, Uhrzeit nicht abgeschnitten", async () => {
    await page.evaluate((tag) => { closeSheet(); DB.lessons.push({ id: "D", sid: "m1", date: tag, von: "10:30", bis: "12:00", art: "fahrstunde", status: "geplant" }); save(); _calView = "tag"; routeKalender(); }, tag); await warte(page, 400);
    return page.evaluate(() => {
      const f = [], els = ["A", "B", "D"].map((id) => document.querySelector(`.ct-ev[data-evedit^="lesson|${id}|"]`));
      if (els.some((e) => !e)) return "Termine fehlen";
      if (!els.every((e) => e.classList.contains("ct-sehr-schmal"))) f.push("nicht als sehr schmal markiert");
      if (els.some((e) => getComputedStyle(e.querySelector(".ct-ev-a")).display !== "none")) f.push("Art-Zeile sichtbar");
      if (els.some((e) => { const t = e.querySelector(".ct-ev-t"); return t.scrollWidth > t.clientWidth + 1; })) f.push("Uhrzeit abgeschnitten");
      return f;
    });
  });
  await pruefe("B12" + b, "acht gleichzeitige Termine (Gesamtansicht viele Fahrlehrer): Spalten mindestens 60 px, seitlich wischbar, Seite läuft nicht über", async () => {
    await page.evaluate((tag) => { for (let i = 0; i < 5; i++) DB.lessons.push({ id: "V" + i, sid: "m1", date: tag, von: "10:15", bis: "11:15", art: "fahrstunde", status: "geplant" }); save(); _calView = "tag"; routeKalender(); }, tag); await warte(page, 400);
    const r = await page.evaluate(() => {
      const f = [], els = [...document.querySelectorAll('.ct-ev[data-evedit^="lesson|"]')].filter((e) => e.style.width);
      if (els.length < 8) f.push("nur " + els.length + " Spalten-Termine");
      const eng = els.filter((e) => e.getBoundingClientRect().width < 60);
      if (eng.length) f.push(eng.length + " Spalten schmaler als 60 px (" + Math.round(eng[0].getBoundingClientRect().width) + " px)");
      const q = document.querySelector(".ct-quer"); if (!q) f.push("kein wischbarer Bereich"); else if (q.scrollWidth <= q.clientWidth) f.push("Bereich nicht breiter als der Bildschirm");
      if (!document.querySelector(".ct-quer-hinweis")) f.push("Hinweis „seitlich wischen“ fehlt");
      const ueber = document.documentElement.scrollWidth - innerWidth; if (ueber > 1) f.push("Seite läuft " + ueber + " px über");
      return f;
    });
    await page.evaluate(() => { DB.lessons = DB.lessons.filter((l) => !/^V\d$/.test(l.id)); save(); routeKalender(); });
    return r;
  });
  await pruefe("B9" + b, "Wochenansicht: Uhrzeit neben ⚠ vollständig", async () => {
    await page.evaluate(() => { _calView = "woche"; routeKalender(); }); await warte(page, 400);
    return page.evaluate(() => { const z = [...document.querySelectorAll(".cw-ev.kf-ueber .cw-evt")]; if (!z.length) return "keine Kachel mit ⚠";
      const kurz = z.filter((e) => e.scrollWidth > e.clientWidth + 1 || !/^\d\d:\d\d$/.test(e.textContent.trim())); return kurz.length ? "abgeschnitten: " + kurz.map((e) => e.textContent).join(",") : true; });
  });
  await pruefe("B10" + b, "alte Rechendatei ohne Baustein: Kalender zeichnet trotzdem", async () => {
    const r = await page.evaluate(() => { const alt = { t: KR.terminKonflikte, k: KR.konfliktIds, s: KR.spaltenLayout }; delete KR.terminKonflikte; delete KR.konfliktIds; delete KR.spaltenLayout;
      let fehler = null; try { _calView = "tag"; routeKalender(); _calView = "woche"; routeKalender(); if (_kfFinde({ date: todayISO(), von: "10:00", bis: "11:00", art: "fahrstunde", sid: "m1" }).length) fehler = "Treffer ohne Baustein"; } catch (e) { fehler = e.message; }
      Object.assign(KR, { terminKonflikte: alt.t, konfliktIds: alt.k, spaltenLayout: alt.s }); return fehler; });
    return r || true;
  });
  await pruefe("B7" + b, "kein seitliches Überlaufen, keine JS-Fehler", async () => {
    await page.evaluate(() => { _calView = "tag"; routeKalender(); }); await warte(page, 400);
    const f = [];
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ueber > 1) f.push("Seite läuft " + ueber + " px über");
    if (jsFehler.length) f.push(...jsFehler);
    return f;
  });
  await ctx.close();
}

// B11 Büro (Vorführdaten, keine Datenbank): schmale Blöcke müssen die Anfangszeit ganz zeigen
{
  const { bauDaten } = require(join(ROOT, "buero-vorfuehrung.js"));
  const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
  const HEUTE = new Date().toISOString().slice(0, 10);
  const d0 = new Date(HEUTE + "T12:00:00Z"); d0.setUTCDate(d0.getUTCDate() + 40); const TAG = d0.toISOString().slice(0, 10);
  for (const breite of [360, 412, 1024]) {
    const ctx = await browser.newContext({ viewport: { width: breite, height: 800 } });
    const page = await ctx.newPage(); page.setDefaultTimeout(5000);
    const jsFehler = []; page.on("pageerror", (e) => jsFehler.push(e.message));
    await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
    await page.route("**/*", (r) => { const u = r.request().url(); if (/vendor\/supabase-js-/.test(u)) return r.fallback(); return u.startsWith(basis) ? r.continue() : r.abort(); });
    await page.addInitScript(([d, TAG]) => {
      d.tabellen.fahrschule_urlaub = []; d.tabellen.fahrschule_schichten = []; d.tabellen.fahrschule_backups = [];
      d.tabellen.kalender_termine = d.tabellen.kalender_termine.filter((t) => t.datum !== TAG);
      const T = (id, sid, von, bis) => d.tabellen.kalender_termine.push({ id, fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: sid, datum: TAG, von, bis, art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: false, payload: {}, buero_fc_status: "offen", kurs_bezahlt: false, interessent_name: null, interessent_telefon: null });
      T("kx1", "s1", "10:00", "11:30"); T("kx2", "s2", "10:45", "12:15");
      window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: "ad-1", email: "ad-1@example.org" } }, rpcs: {}, fehler: {} };
    }, [bauDaten(HEUTE), TAG]);
    await page.goto(basis + "buero.html#kalender?tag=" + TAG); await warte(page, 900);
    await pruefe("B11 [Büro " + breite + "]", "nebeneinander, ⇄ in der Ecke, Anfangszeit ganz lesbar", async () => {
      const r = await page.evaluate(() => ["kx1", "kx2"].map((id) => { const b = document.querySelector(`.k-termin[data-termin="${id}"]`); if (!b) return id + " fehlt";
        const z = b.querySelector(".k-zeit"), e = b.querySelector(".kf-zeichen.kf-ecke");
        if (!b.classList.contains("kf-ueber") || !b.classList.contains("k-schmal")) return id + " nicht markiert/schmal";
        if (!e) return id + " ohne ⇄ in der Ecke";
        if (z.scrollWidth > z.clientWidth + 1) return id + " Zeit abgeschnitten (" + z.textContent + ", " + Math.round(b.getBoundingClientRect().width) + " px)";
        return null; }).filter(Boolean));
      if (jsFehler.length) r.push(...jsFehler);
      return r;
    });
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log(fehlerZahl ? `❌ ${fehlerZahl} Fehler, ${okZahl} ok` : `✅ Konflikt-Browser-Test: alle ${okZahl} Prüfungen bestanden`);
process.exit(fehlerZahl ? 1 : 0);
