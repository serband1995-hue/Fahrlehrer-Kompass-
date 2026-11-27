// Textkontrast-Messung (alle sichtbaren Texte, 360 px, hell/dunkel) auf denselben Seiten wie die Bilder. Aufruf wie bilder.mjs.  Büro-Start, Büro-Schülerakte, App-Heute, App-Schülerakte, je 360 px hell und dunkel.
// Aufruf:  KOMPASS_ROOT=/pfad/zum/stand PREFIX=vorher OUT=docs/farbe-b NODE_PATH=$(npm root -g) node docs/farbe-b/bilder.mjs
// (vorher = Stand main, nachher = Branch farbe-b). Nur erfundene Testdaten, keine Datenbank.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HIER = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(process.env.KOMPASS_ROOT || join(HIER, "..", ".."));
const PREFIX = process.env.PREFIX || "nachher";
const OUT = resolve(process.env.OUT || HIER);
const { bauDaten } = require(join(ROOT, "buero-vorfuehrung.js"));
const { chromium } = require("playwright");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const d0 = new Date(); const HEUTE = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
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
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const BREITE = { viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 };


async function messe(page, label) {
  const r = await page.evaluate(() => {
    const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
    const lum = (c) => { const k = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * k(c[0]) + 0.7152 * k(c[1]) + 0.0722 * k(c[2]); };
    const over = (f, b) => { const a = f[3] === undefined ? 1 : f[3]; return [0, 1, 2].map((i) => f[i] * a + b[i] * (1 - a)); };
    const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) chain.push(e); let base = [255, 255, 255]; for (const e of chain.reverse()) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0)) base = over(c, base); } return base; };
    const out = new Map();
    for (const el of document.querySelectorAll("body *")) {
      const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
      if (!t) continue;
      const cs = getComputedStyle(el), rc = el.getBoundingClientRect();
      if (rc.width < 2 || rc.height < 2 || cs.visibility === "hidden" || cs.display === "none") continue;
      let op = 1; for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
      if (op < 0.05) continue;
      const bg = bgOf(el), fg = over(parse(cs.color), bg);
      const fgo = [0, 1, 2].map((i) => fg[i] * op + bg[i] * (1 - op));
      const a = lum(fgo), b = lum(bg), q = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const px = parseFloat(cs.fontSize), grosz = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight) >= 700);
      if (q < (grosz ? 3 : 4.5)) { const key = (el.className || el.tagName) + "|" + t.slice(0, 24); if (!out.has(key)) out.set(key, `${q.toFixed(2)}:1  ${String(el.className).slice(0, 40)}  „${t.slice(0, 30)}“  ${cs.color} auf rgb(${bg.map(Math.round)}) op ${op.toFixed(2)}`); }
    }
    return [...out.values()];
  });
  console.log("== " + label + " (" + r.length + ")"); r.forEach((x) => console.log("  " + x));
}

// ---------- Büro (Vorführmodus) ----------
const ZD = { fahrschule_id: "fs-test-1", kontoinhaber: "Boost Fahrschule Muster", iban: "DE89370400440532013000", bic: "COBADEFFXXX", paypal: "boostmuster",
  impressum: "Boost Fahrschule Muster, Beispielstraße 1, 12345 Beispielstadt", modus: "test", test_email: "test@example.org", geaendert_am: "2026-11-20T10:00:00Z", bearbeiter: "Mia Muster" };
const vor = `
  F.tabellen.fahrschule_zahlungsdaten = [${JSON.stringify(ZD)}];
  F.tabellen.fahrschule_preise = [{ id: "pz1", fahrschule_id: "fs-test-1", art: "pruefung_praxis", klasse: "B", bezeichnung: "Vorstellung zur praktischen Prüfung", einheit: "pauschal", betrag_cent: 12000, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" }];
`;
async function bueroBild(name, modus, akte) {
  const ctx = await browser.newContext({ ...BREITE, colorScheme: modus === "dunkel" ? "dark" : "light" });
  const page = await ctx.newPage();
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, v]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; (new Function("F", v))(window.__FAKE); },
    [bauDaten(HEUTE), { user: { id: "ad-1", email: "ad-1@example.org" } }, vor]);
  await page.goto(basis + "buero.html#start");
  await page.waitForTimeout(400);
  if (await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null)) {
    await page.click(`#werListe button:has-text("Paula Muster")`);
    await page.keyboard.type("7352", { delay: 20 });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => { const x = document.getElementById("ansicht"); return x && !/Daten werden geladen/.test(x.textContent); }, null, { timeout: 8000 }).catch(() => {});
  if (akte) {
    await page.evaluate(() => schuelerDialog("s3"));
    await page.waitForSelector("dialog[open]");
    await page.evaluate(() => document.getElementById("zmBlock")?.scrollIntoView({ block: "center" }));
  }
  await page.waitForTimeout(300);
  await messe(page, `${name} ${modus}`);
  await ctx.close();
}

// ---------- App (erfundene Schüler, keine Datenbank) ----------
const TAG = "2026-10-14";       // Mittwoch
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const plusTage = (n) => { const d = new Date(Date.UTC(2026, 9, 14 + n)); return d.toISOString().slice(0, 10); };
// s2 ist 12-mal gefahren: „Bisher“ darf nur die letzten 10 zeigen (01.09. und 03.09. nicht).
const S2_ALT = ["2026-09-01", "2026-09-03", "2026-09-07", "2026-09-09", "2026-09-11", "2026-09-15", "2026-09-17", "2026-09-21", "2026-09-23", "2026-09-25", "2026-09-29", "2026-10-04"];

function basisSzenario() {
  return {
    theme: "light",
    // anteil = Anteil grüner Plan-Punkte (Item-IDs aus evalSkillsFor/stufenFor gelesen) → stand(s) eindeutig verschieden
    students: [
      // s1: nächster Termin heute 16:00, letzte Fahrt gestern; Protokoll-Knopf (findLastNextLesson zählt heute als „letzte“)
      { id: "s1", name: "Anna Erfunden", telefon: "0170 1111111", anteil: 0.6, theorie: true, protokoll: TAG },
      // s2: morgen 09:00, letzte Fahrt vor 10 Tagen, Sonderfahrt in 6 Tagen, Prüfung in 9 Tagen (DB.termine), Ergebnis in DB.exams
      { id: "s2", name: "Bernd Erfunden", telefon: "0170 2222222", anteil: 0.9, theorie: true },
      // s3: in 5 Tagen (Mo 19.10.), nie gefahren, OHNE Telefon, Theorie 40 %
      { id: "s3", name: "Clara Erfunden", telefon: "", anteil: 0, theoriePct: 40 },
      // s4: kein Termin, letzte Fahrt vor 20 Tagen (gestern „nicht erschienen“ zählt nicht), Prüfungsreif-Zeichen
      { id: "s4", name: "Dieter Erfunden", telefon: "0170 4444444", anteil: 0.15, reif: true },
      // s5: kein Termin, letzte Fahrt vor 3 Tagen, Büro-Stopp
      { id: "s5", name: "Emma Erfunden", telefon: "0170 5555555", anteil: 0.3 },
      // s6: kein Termin (morgen abgebrochen), letzte Fahrt vor 6 Tagen, eigener Fokus, Sehhilfe
      { id: "s6", name: "Felix Erfunden", telefon: "0170 6666666", anteil: 0.4, next: "Erfundener Fokus Einparken", sehhilfe: true },
      // s7: Termin übermorgen 08:00, aber gelbe Frist (Theorie bald) → gelb geht vor
      { id: "s7", name: "Greta Erfunden", telefon: "0170 7777777", anteil: 0.5 },
      // s8: wartet auf die Praxisprüfung (ready, keine Fahrstunde danach, kein Prüfungstermin) → Abschnitt „Wartet“
      { id: "s8", name: "Hans Erfunden", telefon: "0170 8888888", anteil: 0.95, theorie: true, ready: "2026-10-01T08:00:00.000Z", theoryPassed: "2026-09-20T08:00:00.000Z" },
    ],
    lessons: [
      { id: "a1", date: "2026-10-13", von: "14:00", bis: "15:30", sid: "s1" },
      { id: "a2", date: TAG, von: "16:00", bis: "17:30", sid: "s1" },
      ...S2_ALT.map((d, i) => ({ id: "b" + i, date: d, von: "10:00", bis: "11:30", sid: "s2" })),
      { id: "bM", date: plusTage(1), von: "09:00", bis: "10:30", sid: "s2" },
      { id: "bS", date: plusTage(6), von: "10:00", bis: "11:30", sid: "s2", art: "sonder" },
      { id: "c1", date: plusTage(5), von: "14:00", bis: "15:30", sid: "s3" },
      { id: "d1", date: "2026-09-24", von: "10:00", bis: "11:30", sid: "s4" },
      { id: "d2", date: "2026-10-13", von: "10:00", bis: "11:30", sid: "s4", status: "nicht erschienen" },
      { id: "e1", date: "2026-10-11", von: "10:00", bis: "11:30", sid: "s5" },
      { id: "f1", date: "2026-10-08", von: "10:00", bis: "11:30", sid: "s6" },
      { id: "f2", date: plusTage(1), von: "12:00", bis: "13:30", sid: "s6", status: "abgebrochen" },
      { id: "g1", date: "2026-10-12", von: "10:00", bis: "11:30", sid: "s7" },
      { id: "g2", date: plusTage(2), von: "08:00", bis: "09:30", sid: "s7" },
      { id: "h1", date: "2026-09-28", von: "10:00", bis: "11:30", sid: "s8" },
    ],
    termine: [{ id: "P2", date: plusTage(9), von: "09:00", slots: ["s2"] }],
    exams: [{ id: "E2", sid: "s2", name: "Bernd Erfunden", date: "2026-09-30", von: "09:00", result: "fail", pruefer: "XY", note: "", attempt: 1, faults: [], eingriff: false, earnAt: "2026-09-30" }],
    fristen: { s7: { theorie_abgeschlossen_am: "2025-10-30" } },                 // Theorie bald (gelb)
    notizen: { s5: [{ id: "n1", schueler_id: "s5", art: "stopp", text: "Erfundener Stopp-Grund", gelesen: true, erstellt_am: "2026-10-13T08:00:00Z" }] },
    start: "routeHome",
  };
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);
async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
    // Fremde Fenster (WhatsApp) nur mitschreiben, nicht öffnen
    window.__offen = []; window.open = (u) => { window.__offen.push(String(u)); return null; };
  });
  return { ctx, page, jsFehler };
}

// Daten in die App legen und die Startseite (sz.start) zeichnen. Zurück-Stapel wird geleert.
async function setze(page, sz) {
  await page.evaluate((sz) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    _fsAgg = null;
    try { _fsSetDrawer(false); } catch (e) {}
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students = sz.students.map((p) => {
      const s = { id: p.id, name: p.name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: p.telefon || "" };
      if (p.theorie) s.plan.theorie = true;
      if (p.next) s.next = p.next;
      if (p.sehhilfe) s.sehhilfe = true;
      if (p.reif) s.pruefungsreifManuell = true;
      if (p.theoriePct) s.theoriePct = p.theoriePct;
      if (p.ready) s.ready = p.ready;
      if (p.theoryPassed) s.theoryPassed = p.theoryPassed;
      if (p._fahrlehrerName) s._fahrlehrerName = p._fahrlehrerName;
      if (p._paketId) s._paketId = p._paketId;
      s.plan.sonder = { ueberland: [], autobahn: [], nacht: [] };
      ensure(s);
      const ids = evalSkillsFor(s), k = Math.round(ids.length * (p.anteil || 0));
      ids.slice(0, k).forEach((id) => { s.plan.ampeln[id] = "gruen"; });
      if (p.protokoll && ids[0]) s.plan.ampelnZeit[ids[0]] = p.protokoll + "T15:00:00";
      return s;
    });
    DB.lessons = sz.lessons.map((l) => ({ id: l.id, date: l.date, von: l.von, bis: l.bis, art: l.art || "fahrstunde", sid: l.sid || null, name: "", status: l.status || "geplant", note: "", fc: null }));
    DB.termine = sz.termine.map((t) => ({ id: t.id, date: t.date, plaetze: t.slots.length, slots: t.slots.slice(), von: t.von, bis: min2hm(hm2min(t.von) + PRUEF_MIN) }));
    DB.exams = JSON.parse(JSON.stringify(sz.exams));
    DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Testauto", typ: "schalt" }];
    DB.sichtbarkeit = Object.assign({}, DB.sichtbarkeit, { dash_nextstudent: true });
    _schuelerFristen = JSON.parse(JSON.stringify(sz.fristen));
    _bueroNotizen = JSON.parse(JSON.stringify(sz.notizen));
    _homeFormFilter = []; _homeColorFilter = []; _homeOhneTelefon = false;
    localStorage.setItem("serband-backup-stamp", String(Date.now()));
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    _navStack = [];
    if (sz.fsAgg) _fsAgg = sz.fsAgg;
    window[sz.start]();
  }, sz);
  await warte(page, 350);
}

async function appBild(name, modus, start) {
  const { ctx, page } = await neueSeite(360, 780);
  await setze(page, { ...basisSzenario(), theme: modus === "dunkel" ? "dark" : "light", start: "routeHome" });
  await page.evaluate(([m, st]) => { localStorage.setItem(THEME_KEY, m === "dunkel" ? "dark" : "light"); applyTheme(); ({ heute: () => routeDashboard(), akte: () => routeDetail("s1"), kalender: () => routeKalender(), einst: () => routeSettings(), plan: () => routePlan("s1"), vorlagen: () => routePlanVorlagen() })[st](); }, [modus, start]);
  await warte(page, 500);
  await messe(page, `${name} ${modus}`);
  await ctx.close();
}

for (const m of ["hell", "dunkel"]) {
  await bueroBild("buero-start", m, false); console.log("ok buero-start", m);
  await bueroBild("buero-akte", m, true); console.log("ok buero-akte", m);
  await appBild("app-heute", m, "heute"); console.log("ok app-heute", m);
  await appBild("app-akte", m, "akte"); console.log("ok app-akte", m);
  for (const [n, k] of [["app-kalender", "kalender"], ["app-einst", "einst"], ["app-plan", "plan"], ["app-vorlagen", "vorlagen"]]) await appBild(n, m, k);
}
await browser.close(); server.close();
