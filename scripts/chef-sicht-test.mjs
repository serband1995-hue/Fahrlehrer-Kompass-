// Chef-Sicht-Test (Schritt K2): die Gesamtansicht (Leitung, Büro, Super-Admin) der Fahrlehrer-App.
// Die App wird lokal mit erfundenen Daten geladen (kein Netz, getSupa() ist eine Attrappe, Nachname „Muster“).
// Geprüft wird bei 360 und 412 px hochkant, quer (740×360) und am PC (1366 px):
//  (a) Kalender ohne Auswahl zeigt die Karte „Noch kein Fahrlehrer gewählt“, der Knopf öffnet die Filter-Schublade,
//      nach Auswahl eines Fahrlehrers ist die Karte weg und Termine sind da (Woche und Tag)
//  (b) jede Termin-Kachel der Gesamtansicht nennt den Vornamen des Fahrlehrers, die normale App nicht
//  (c) nach Kalender → andere Seite (Reiter, Mehr-Menü, Zurück-Pfeil, Android-Zurück) kein Filter-Knopf, keine Schublade,
//      kein Schatten; die Auswahl bleibt beim nächsten Öffnen erhalten
//  (d) die vier Start-Kacheln haben ein sichtbares Symbol und die Zahlen stehen gleich hoch (hell und dunkel)
//  (e) kein sichtbares „Slug“ oder „Dashboard“, Fahrlehrer-Seite ohne doppeltes Zurück
//  (f) Schüler ohne Plan: „Noch nicht begonnen“ statt „Alles grün“
//  (g) Knopf „Zur Büro-Seite“ für Leitung und Büro, nicht für Fahrlehrer
//  (h) keine Seite breiter als der Bildschirm, keine JS-Fehler
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/chef-sicht-test.mjs
// Optional: CHEF_SEITE=/pfad/zu/index.html (andere Fassung, z. B. der alte Stand), CHEF_BILDER=/ordner (Bilder bei 412 px),
//           CHROMIUM_PATH=…
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
    const istStart = pfad === "/" || pfad === "/index.html" || pfad === "index.html";
    const datei = await readFile(istStart ? (process.env.CHEF_SEITE || join(ROOT, "index.html")) : join(ROOT, pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || (istStart ? "text/html" : "application/octet-stream") });
    res.end(datei);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const BILDER = process.env.CHEF_BILDER || "";
const BILDER2 = process.env.CHEF_BILDER2 || ""; // Nacharbeit: Bilder bei 412 hell/dunkel und 740×360

let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

const TAG = "2026-11-11"; // Mittwoch
const JETZT = new Date("2026-11-11T07:30:00+01:00");
const GROESSEN = [
  { n: "360 hoch", w: 360, h: 780, mobil: true },
  { n: "412 hoch", w: 412, h: 915, mobil: true },
  { n: "quer 740", w: 740, h: 360, mobil: true },
  { n: "PC 1366", w: 1366, h: 900, mobil: false },
];

// Erfundene Daten in die Seite legen. modus: "fs" (Gesamtansicht, Rolle wählbar) oder "normal" (Fahrlehrer-App)
async function daten(page, modus, rolle) {
  await page.evaluate(({ modus, rolle, TAG }) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("fsCalTiles")?.remove();
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const neu = (id, name, lid, lname, mitPlan) => Object.assign({ id, name, form: "B", created: Date.now(), telefon: "0170 1234567", _fahrlehrerId: lid, _fahrlehrerName: lname },
      mitPlan ? { plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)) } : {});
    const s1 = neu("s1", "Lena Muster", "L1", "Anna Muster", true);
    const s2 = neu("s2", "Max Muster", "L2", "Bernd Muster", true);
    const s3 = neu("s3", "Nina Muster", "L1", "Anna Muster", false); // im Büro angelegt: ohne Plan
    DB.students = [s1, s2, s3];
    const L = (id, o) => Object.assign({ id, date: TAG, von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s1", name: "", status: "geplant", note: "", fc: null, fahrzeug: "Golf Muster", _fahrlehrerId: "L1", _fahrlehrerName: "Anna Muster" }, o);
    DB.lessons = [
      L("t1", {}),
      L("t2", { von: "10:00", bis: "11:30", sid: "s2", fahrzeug: "Polo Muster", _fahrlehrerId: "L2", _fahrlehrerName: "Bernd Muster" }),
      L("t3", { von: "12:00", bis: "12:45", sid: "s2", fahrzeug: "Polo Muster", _fahrlehrerId: "L2", _fahrlehrerName: "Bernd Muster" }),
      L("t4", { von: "13:00", bis: "13:45", art: "sonder", sid: "s1" }),
    ];
    DB.termine = [];
    DB.exams = [{ id: "e1", sid: "s2", name: "Max Muster", date: TAG, result: "pass", pruefer: "Herr Muster", faults: [], von: "15:00", attempt: 1, _fahrlehrerId: "L2", _fahrlehrerName: "Bernd Muster" }];
    DB.todos = [];
    Object.assign(DB.workCfg, { vorMittag: { von: "08:00", bis: "12:30" }, nachMittag: { von: "13:30", bis: "18:00" }, blockMin: 90, pausen: [] });
    _fsCalLehrerFilter = []; _fsCalFahrzeugFilter = []; _fsCalBueroFilter = []; _fsKalenderModus = "fahrlehrer"; _fsFilterPanelOpen = false;
    _navStack.length = 0;
    if (modus === "fs") {
      _authProfile = { id: "u1", rolle: rolle || "fahrschule_admin", fahrschule_id: "f1", name: "Leitung Muster" };
      _fsAgg = { fahrschuleId: "f1", fahrschule: { name: "Fahrschule Muster" },
        lehrer: [{ id: "L1", name: "Anna Muster", email: "anna@muster.invalid", aktiv: true, slug: null, rolle: "fahrlehrer" },
                 { id: "L2", name: "Bernd Muster", email: "bernd@muster.invalid", aktiv: true, slug: "bernd-muster", rolle: "fahrlehrer" }],
        fahrzeuge: [{ name: "Golf Muster" }, { name: "Polo Muster" }], pakete: [] };
      _fsSetDrawer(true);
    } else {
      _fsAgg = null;
      _authProfile = { id: "u2", rolle: "fahrlehrer", fahrschule_id: "f1", name: "Anna Muster" };
      _fsSetDrawer(false);
    }
  }, { modus, rolle, TAG });
}
const ev = (page, code) => page.evaluate((c) => (0, eval)("(async()=>{" + c + "})()"), code);
const warte = (page, ms = 250) => page.waitForTimeout(ms);
async function zuBreit(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return sw > w + 1 ? `Seite ${sw} px breit bei ${w} px Bildschirm` : null;
  });
}

for (const g of GROESSEN) {
  const ctx = await browser.newContext({ viewport: { width: g.w, height: g.h }, isMobile: g.mobil, hasTouch: g.mobil, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (ok) => ok({ data: [], error: null }) : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
  });
  const P = `[${g.n}]`;
  const bild = async (name) => { if (BILDER && g.w === 412) await page.screenshot({ path: join(BILDER, name + ".png") }); };

  // ---------- (a) Kalender ohne Auswahl ----------
  await daten(page, "fs");
  for (const ansicht of ["woche", "tag"]) {
    await pruefe(`A1 ${P}`, `Kalender (${ansicht}) ohne Auswahl zeigt Karte „Noch kein Fahrlehrer gewählt“ mit Knopf`, async () => {
      await ev(page, `routeKalender("${ansicht}","${TAG}")`); await warte(page);
      const r = await page.evaluate(() => {
        const k = document.getElementById("fsKeineAuswahl");
        if (!k) return { f: "keine Karte im leeren Kalender" };
        const t = k.innerText.replace(/\s+/g, " ");
        const b = [...k.querySelectorAll("button")].find((x) => /Fahrlehrer wählen/i.test(x.innerText));
        const bb = b && b.getBoundingClientRect();
        const cb = document.getElementById("calBody");
        return { t, hatKnopf: !!b, hoehe: bb ? bb.height : 0, breite: k.getBoundingClientRect().width, oben: !cb || k.getBoundingClientRect().top < cb.getBoundingClientRect().top };
      });
      if (r.f) return r.f;
      const f = [];
      if (!/Noch kein Fahrlehrer gewählt/i.test(r.t)) f.push("Text fehlt: " + r.t);
      else if (!r.t.includes("Noch kein Fahrlehrer gewählt")) f.push("Überschrift in Großbuchstaben: " + r.t);
      if (/[–—]/.test(r.t)) f.push("Gedankenstrich im Text");
      if (!r.hatKnopf) f.push("Knopf „Fahrlehrer wählen“ fehlt");
      else if (r.hoehe < 44) f.push(`Knopf nur ${r.hoehe} px hoch`);
      if (r.breite <= 0) f.push("Karte unsichtbar");
      if (!r.oben) f.push("Karte steht unter dem Kalender statt darüber");
      return f;
    });
    if (ansicht === "woche") await bild("gk1-kalender-leer");
    await pruefe(`A2 ${P}`, `Tipp auf „Fahrlehrer wählen“ öffnet die Schublade (${ansicht})`, async () => {
      const b = page.locator("#fsKeineAuswahl button", { hasText: /Fahrlehrer wählen/i });
      if (!(await b.count())) return "Knopf fehlt";
      await b.first().click({ timeout: 3000 }); await warte(page, 400);
      const offen = await page.evaluate(() => !!document.querySelector("#fsFilterDrawer.open"));
      return offen ? null : "Schublade nicht offen";
    });
    await pruefe(`A3 ${P}`, `nach Wahl eines Fahrlehrers: Karte weg, Termine da (${ansicht})`, async () => {
      const cb = page.locator('#fsFilterDrawer input[data-fslehrer="L1"]');
      if (!(await cb.count())) return "Häkchen für Anna fehlt";
      await cb.click({ timeout: 3000 }); await warte(page, 300);
      const r = await page.evaluate(() => ({ karte: !!document.getElementById("fsKeineAuswahl"), termine: document.querySelectorAll("#calBody .cw-ev, #calBody .ct-ev").length }));
      try { await ev(page, `_fsCloseFilterPanel()`); } catch (e) {}
      const f = [];
      if (r.karte) f.push("Karte noch da");
      if (!r.termine) f.push("keine Termine sichtbar");
      return f;
    });
    await ev(page, `_fsCalLehrerFilter=[];_fsCalFahrzeugFilter=[];_fsFilterPanelOpen=false;`);
  }
  await pruefe(`A4 ${P}`, "Karte auch im Büro-Kalender ohne Auswahl; mit Fahrzeug-Auswahl weg", async () => {
    await ev(page, `_fsKalenderModus="buero"; routeKalender("woche","${TAG}")`); await warte(page);
    const a = await page.evaluate(() => !!document.getElementById("fsKeineAuswahl"));
    await ev(page, `_fsKalenderModus="fahrlehrer"; _fsCalFahrzeugFilter=["Golf Muster"]; routeKalender("woche","${TAG}")`); await warte(page);
    const b = await page.evaluate(() => !!document.getElementById("fsKeineAuswahl"));
    await ev(page, `_fsCalFahrzeugFilter=[];`);
    const f = [];
    if (!a) f.push("Büro-Kalender ohne Karte");
    if (b) f.push("Karte trotz Fahrzeug-Auswahl");
    return f;
  });

  for (const ansicht of ["woche", "tag", "monat"]) {
    await pruefe(`A5 ${P}`, `ohne Auswahl (${ansicht}): keine „+ frei“-Felder, keine Zählkacheln, kein „+“-Knopf; nach Auswahl wieder da`, async () => {
      const zaehle = () => page.evaluate(() => ({ frei: document.querySelectorAll("#calBody .cw-free, #calBody .ct-free").length, zahl: document.querySelectorAll("#calBody .cd-summary").length, fab: !!document.querySelector("#calFab") && getComputedStyle(document.querySelector("#calFab")).display !== "none" }));
      await ev(page, `_fsCalLehrerFilter=[];_fsCalFahrzeugFilter=[]; routeKalender("${ansicht}","${TAG}")`); await warte(page);
      const leer = await zaehle();
      await ev(page, `_fsCalLehrerFilter=["L1"]; routeKalender("${ansicht}","${TAG}")`); await warte(page);
      const voll = await zaehle();
      await ev(page, `_fsCalLehrerFilter=[];`);
      const f = [];
      if (leer.frei) f.push(`${leer.frei} „+ frei“-Felder ohne Auswahl`);
      if (leer.zahl) f.push("Zählkacheln ohne Auswahl");
      if (leer.fab) f.push("„+“-Knopf ohne Auswahl");
      if (!voll.fab) f.push("„+“-Knopf nach Auswahl fehlt");
      if (ansicht === "woche" && !voll.frei) f.push("„+ frei“-Felder nach Auswahl fehlen");
      if (ansicht === "tag" && !voll.zahl) f.push("Zählkacheln nach Auswahl fehlen");
      return f;
    });
  }
  await pruefe(`A6 ${P}`, "Karte wird von Filter-Reiter und „+“-Knopf nicht überdeckt (Woche und Tag)", async () => {
    const f = [];
    for (const ansicht of ["woche", "tag"]) {
      await ev(page, `_fsCalLehrerFilter=[];_fsCalFahrzeugFilter=[]; routeKalender("${ansicht}","${TAG}")`); await warte(page);
      const r = await page.evaluate(() => {
        const k = document.getElementById("fsKeineAuswahl"); if (!k) return ["keine Karte"];
        const a = k.getBoundingClientRect(); const o = [];
        for (const sel of [".fs-filter-tab", "#calFab", "#fab"]) {
          const e = document.querySelector(sel); if (!e || getComputedStyle(e).display === "none") continue;
          const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue;
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) o.push(sel + " überdeckt die Karte");
        }
        return o;
      });
      f.push(...r.map((x) => ansicht + ": " + x));
    }
    return f;
  });

  // ---------- (b) Vorname des Fahrlehrers an jeder Termin-Kachel ----------
  await pruefe(`B1 ${P}`, "Wochenansicht Gesamtansicht: jede Termin-Kachel nennt den Vornamen, Uhrzeit bleibt, Kachel bleibt in der Spalte", async () => {
    await ev(page, `_fsCalLehrerFilter=["L1","L2"]; routeKalender("woche","${TAG}")`); await warte(page);
    await bild("gk3-woche-vorname");
    const r = await page.evaluate(() => [...document.querySelectorAll("#calBody .cw-ev")].map((e) => {
      const fl = e.querySelector(".cw-fl"); const col = e.closest(".cw-col").getBoundingClientRect(); const b = e.getBoundingClientRect();
      const t = e.querySelector(".cw-evt");
      return { fl: fl ? fl.textContent.trim() : "", zeit: t ? t.textContent.trim() : "", raus: b.right > col.right + 1 || b.left < col.left - 1 };
    }));
    if (!r.length) return "keine Termin-Kacheln";
    const f = [];
    r.forEach((x, i) => {
      if (!["Anna", "Bernd"].includes(x.fl)) f.push(`Kachel ${i + 1} ohne Vorname (${x.fl || "leer"})`);
      if (!/^\d\d:\d\d/.test(x.zeit)) f.push(`Kachel ${i + 1} ohne Uhrzeit vorne (${x.zeit})`);
      if (x.raus) f.push(`Kachel ${i + 1} ragt aus der Spalte`);
    });
    const namen = new Set(r.map((x) => x.fl));
    if (!namen.has("Anna") || !namen.has("Bernd")) f.push("nicht beide Fahrlehrer zu sehen: " + [...namen].join(","));
    return f;
  });
  await pruefe(`B2 ${P}`, "Tagesansicht Gesamtansicht: jede Termin-Kachel nennt den Vornamen, Uhrzeit wird nie verdrängt", async () => {
    await ev(page, `routeKalender("tag","${TAG}")`); await warte(page);
    const r = await page.evaluate(() => [...document.querySelectorAll("#calBody .ct-ev")].map((e) => {
      const t = e.querySelector(".ct-ev-t"); const fl = e.querySelector(".ct-fl");
      let zeitSichtbar = false, zeit = "";
      if (t && t.firstChild && t.firstChild.nodeType === 3) {
        zeit = t.firstChild.textContent; const rg = document.createRange(); rg.selectNodeContents(t.firstChild);
        zeitSichtbar = rg.getBoundingClientRect().right <= t.getBoundingClientRect().right + 1;
      }
      return { fl: fl ? fl.textContent.replace(/[·\s]/g, "") : "", zeit, zeitSichtbar };
    }));
    if (!r.length) return "keine Termin-Kacheln";
    const f = [];
    r.forEach((x, i) => {
      if (!["Anna", "Bernd"].includes(x.fl)) f.push(`Kachel ${i + 1} ohne Vorname (${x.fl || "leer"})`);
      if (!/^\d\d:\d\d$/.test(x.zeit.trim()) || !x.zeitSichtbar) f.push(`Kachel ${i + 1}: Uhrzeit nicht frei sichtbar (${x.zeit})`);
    });
    return f;
  });
  await pruefe(`B3 ${P}`, "normale Fahrlehrer-App (ohne Gesamtansicht): kein Fahrlehrer-Name an den Kacheln", async () => {
    await daten(page, "normal");
    await ev(page, `routeKalender("woche","${TAG}")`); await warte(page);
    const w = await page.evaluate(() => ({ n: document.querySelectorAll("#calBody .cw-ev").length, fl: document.querySelectorAll(".cw-fl,.ct-fl").length, karte: !!document.getElementById("fsKeineAuswahl"), filter: !!document.getElementById("fsCalTiles") }));
    await ev(page, `routeKalender("tag","${TAG}")`); await warte(page);
    const t = await page.evaluate(() => ({ n: document.querySelectorAll("#calBody .ct-ev").length, fl: document.querySelectorAll(".cw-fl,.ct-fl").length, text: document.getElementById("calBody").innerText, zahl: document.querySelectorAll("#calBody .cd-summary").length }));
    const wFrei = await (async () => { await ev(page, `routeKalender("woche","${TAG}")`); await warte(page); return page.evaluate(() => document.querySelectorAll("#calBody .cw-free").length); })();
    const f = [];
    if (!w.n || !t.n) f.push(`Termine fehlen (Woche ${w.n}, Tag ${t.n})`);
    if (w.fl || t.fl || /\bAnna\b|\bBernd\b/.test(t.text)) f.push("Fahrlehrer-Name in der normalen App");
    if (w.karte || w.filter) f.push("Karte oder Gesamtansicht-Filter in der normalen App");
    if (!wFrei) f.push("„+ frei“-Felder fehlen in der normalen App");
    if (!t.zahl) f.push("Zählkacheln fehlen in der normalen App");
    return f;
  });
  await pruefe(`H1 ${P}`, "Kalender (normal, Woche/Tag) nicht breiter als der Bildschirm", () => zuBreit(page));

  // ---------- (c) Filter verschwindet beim Verlassen ----------
  await daten(page, "fs");
  const filterReste = () => page.evaluate(() => {
    const f = [];
    if (document.getElementById("fsCalTiles")) f.push("#fsCalTiles noch da");
    if (document.querySelector(".fs-filter-tab")) f.push("Filter-Knopf noch da");
    if (document.querySelector(".fs-filter-drawer")) f.push("Schublade noch da");
    if (document.querySelector(".fs-filter-scrim")) f.push("Abdunklung noch da");
    return f;
  });
  await pruefe(`C1 ${P}`, "Kalender zeigt Filter-Knopf, zugeklappte Schublade ohne Schatten", async () => {
    await ev(page, `routeFahrschuleDashboard(); routeKalender("woche","${TAG}")`); await warte(page, 400);
    return page.evaluate(() => {
      const f = [];
      if (!document.querySelector(".fs-filter-tab")) f.push("Filter-Knopf fehlt");
      const d = document.getElementById("fsFilterDrawer");
      if (!d) f.push("Schublade fehlt");
      else if (!d.classList.contains("open") && getComputedStyle(d).boxShadow !== "none") f.push("Schatten bei zugeklappter Schublade: " + getComputedStyle(d).boxShadow);
      return f;
    });
  });
  await pruefe(`C2 ${P}`, "Kalender → Reiter „Start“ (tabGo): Filter ganz weg", async () => {
    await ev(page, `_fsCalLehrerFilter=["L1"]; routeKalender("woche","${TAG}")`); await warte(page);
    await ev(page, `tabGo("heute")`); await warte(page, 300);
    await bild("gk4-nach-wechsel");
    return filterReste();
  });
  await pruefe(`C3 ${P}`, "Kalender → Reiter „Schüler“ (tabGo): Filter ganz weg", async () => {
    await ev(page, `routeKalender("woche","${TAG}")`); await warte(page);
    await ev(page, `tabGo("schueler")`); await warte(page, 300);
    return filterReste();
  });
  await pruefe(`C4 ${P}`, "Kalender → Mehr-Menü „Alle Fahrlehrer“: Filter ganz weg", async () => {
    await ev(page, `routeKalender("woche","${TAG}")`); await warte(page);
    await ev(page, `openDrawer()`); await warte(page, 300);
    await page.locator('.drawer-nav [data-nav="fs_lehrer"]').click({ timeout: 3000 }); await warte(page, 500);
    return filterReste();
  });
  await pruefe(`C5 ${P}`, "Kalender → Zurück-Pfeil oben: Filter ganz weg", async () => {
    await ev(page, `routeFahrschuleLehrer(); routeKalender("woche","${TAG}")`); await warte(page);
    await ev(page, `navZurueck()`); await warte(page, 300);
    return filterReste();
  });
  await pruefe(`C6 ${P}`, "Kalender → Android-Zurück: Filter ganz weg", async () => {
    await ev(page, `routeFahrschuleLehrer(); routeKalender("woche","${TAG}")`); await warte(page);
    await page.evaluate(() => history.back()); await warte(page, 600);
    return filterReste();
  });
  await pruefe(`C7 ${P}`, "Kalender → Knopf in der Schublade „← Zurück“: Filter ganz weg", async () => {
    await ev(page, `routeFahrschuleLehrer(); routeKalender("woche","${TAG}"); _fsOpenFilterPanel()`); await warte(page, 400);
    await page.locator("#fsFilterDrawer button", { hasText: "← Zurück" }).first().click({ timeout: 3000 }); await warte(page, 300);
    return filterReste();
  });
  await pruefe(`C8 ${P}`, "Kalender wieder öffnen: Filter kommt sauber zurück (zugeklappt), Auswahl Anna bleibt", async () => {
    await ev(page, `tabGo("kalender")`); await warte(page, 400);
    return page.evaluate(() => {
      const f = [];
      if (document.querySelectorAll("#fsCalTiles").length !== 1) f.push(`${document.querySelectorAll("#fsCalTiles").length} Filter-Bereiche`);
      if (document.querySelector("#fsFilterDrawer.open")) f.push("Schublade offen statt zu");
      const cb = document.querySelector('#fsFilterDrawer input[data-fslehrer="L1"]');
      if (!cb || !cb.checked) f.push("Auswahl Anna verloren");
      if (document.getElementById("fsKeineAuswahl")) f.push("Karte trotz Auswahl");
      return f;
    });
  });
  await pruefe(`H2 ${P}`, "Kalender der Gesamtansicht nicht breiter als der Bildschirm", () => zuBreit(page));

  // ---------- (d) Start-Kacheln ----------
  for (const hell of [true, false]) {
    await pruefe(`D1 ${P}`, `Start: vier Kacheln mit sichtbarem Symbol, Zahlen gleich hoch (${hell ? "hell" : "dunkel"})`, async () => {
      await page.evaluate((h) => document.body.classList.toggle("light", h), hell);
      await ev(page, `_fsCalLehrerFilter=[]; routeFahrschuleDashboard()`); await warte(page, 900);
      if (hell) await bild("gk5-start-kacheln");
      const r = await page.evaluate(() => [...document.querySelectorAll("#view .dash-tiles .d-tile")].map((t) => {
        const s = t.querySelector(".badge svg"); const sb = s && s.getBoundingClientRect(); const tb = t.getBoundingClientRect();
        const n = t.querySelector(".dt-n").getBoundingClientRect();
        const farbe = s ? getComputedStyle(s).color : "";
        return { svg: sb ? [sb.width, sb.height] : [0, 0], drin: sb ? sb.right <= tb.right + 1 && sb.bottom <= tb.bottom + 1 : false, nTop: n.top - tb.top, tTop: tb.top, farbe };
      }));
      const f = [];
      if (r.length !== 4) f.push(`${r.length} Kacheln statt 4`);
      r.forEach((x, i) => {
        if (!(x.svg[0] > 0 && x.svg[1] > 0) || x.svg[0] > 40) f.push(`Kachel ${i + 1}: Symbol ${x.svg[0]}×${x.svg[1]} px`);
        if (!x.drin) f.push(`Kachel ${i + 1}: Symbol ragt heraus`);
        if (/rgba\(0, 0, 0, 0\)/.test(x.farbe)) f.push(`Kachel ${i + 1}: Symbol durchsichtig`);
      });
      const tops = r.map((x) => Math.round(x.nTop));
      if (Math.max(...tops) - Math.min(...tops) > 2) f.push("Zahlen nicht gleich hoch: " + tops.join("/"));
      return f;
    });
  }
  await page.evaluate(() => document.body.classList.add("light"));
  await pruefe(`D2 ${P}`, "Kalender-Kachel auf Start: ehrlicher Text ohne Gedankenstrich", async () => {
    const t = await page.evaluate(() => { const b = [...document.querySelectorAll("#view button.res-block")].find((x) => /Kalender/i.test(x.innerText)); return b ? b.innerText.replace(/\s+/g, " ") : ""; });
    const f = [];
    if (!t) return "Kalender-Kachel fehlt";
    if (/Alle Termine aller Fahrlehrer/i.test(t)) f.push("verspricht noch „Alle Termine aller Fahrlehrer“");
    if (/[–—]/.test(t)) f.push("Gedankenstrich: " + t);
    return f;
  });

  // ---------- (g) Knopf „Zur Büro-Seite“ ----------
  await pruefe(`G1 ${P}`, "Leitung: Knopf „Zur Büro-Seite“ sichtbar, zeigt auf buero.html, Untertitel, mind. 44 px", async () => {
    const r = await page.evaluate(() => {
      const a = [...document.querySelectorAll("#view a, #view button")].find((x) => /Zur Büro-Seite/i.test(x.innerText));
      if (!a) return null;
      const b = a.getBoundingClientRect();
      const pf = a.querySelector(".fbl-pfeil"); const ic = a.querySelector("svg");
      return { href: a.getAttribute("href"), h: b.height, w: b.width, t: a.innerText.replace(/\s+/g, " "), pfeil: !!pf && pf.textContent.trim() === "›" && pf.getBoundingClientRect().width > 0, svg: !!ic && ic.getBoundingClientRect().width > 0, bg: getComputedStyle(a).backgroundColor, emoji: /🖥/.test(a.innerText) };
    });
    if (!r) return "Knopf fehlt";
    const f = [];
    if (r.href !== "buero.html") f.push("zeigt auf " + r.href);
    if (r.h < 44 || r.w <= 0) f.push(`Größe ${r.w}×${r.h}`);
    if (!/Kalender aller Fahrlehrer, Prüfungstafel, Fristen/i.test(r.t)) f.push("Untertitel fehlt");
    if (/[–—]/.test(r.t)) f.push("Gedankenstrich");
    if (!r.pfeil) f.push("Pfeil „›“ fehlt");
    if (!r.svg) f.push("Strichsymbol fehlt");
    if (r.emoji) f.push("noch Emoji 🖥️");
    if (/rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)/.test(r.bg)) f.push("Hintergrund weiß/leer: " + r.bg);
    return f;
  });
  await pruefe(`H3 ${P}`, "Start der Gesamtansicht nicht breiter als der Bildschirm", () => zuBreit(page));
  await pruefe(`G2 ${P}`, "Büro-Rolle: Knopf sichtbar; Fahrlehrer-Rolle: kein Knopf", async () => {
    await daten(page, "fs", "buero"); await ev(page, `routeFahrschuleDashboard()`); await warte(page, 300);
    const buero = await page.evaluate(() => [...document.querySelectorAll("#view a")].some((x) => /Zur Büro-Seite/i.test(x.innerText) && x.getAttribute("href") === "buero.html"));
    await daten(page, "fs", "fahrlehrer"); await ev(page, `routeFahrschuleDashboard()`); await warte(page, 300);
    const fl = await page.evaluate(() => /Zur Büro-Seite/i.test(document.getElementById("view").innerText));
    await daten(page, "normal"); await ev(page, `routeDashboard()`); await warte(page, 300);
    const normal = await page.evaluate(() => /Zur Büro-Seite/i.test(document.getElementById("view").innerText) || !!document.querySelector('#view a[href="buero.html"]'));
    const f = [];
    if (!buero) f.push("Büro sieht den Knopf nicht");
    if (fl) f.push("Fahrlehrer-Rolle sieht den Knopf in der Gesamtansicht");
    if (normal) f.push("normale Fahrlehrer-App zeigt den Knopf");
    return f;
  });

  // ---------- (e) „Slug“ und „Dashboard“ ----------
  await daten(page, "fs");
  await pruefe(`E1 ${P}`, "Fahrlehrer-Seite: „Noch kein Buchungslink eingerichtet.“ nur bei Anna, kein zweites Zurück, Pfeil oben führt zur Übersicht", async () => {
    await ev(page, `routeFahrschuleDashboard(); routeFahrschuleLehrer()`); await warte(page, 300);
    await bild("gk24-fahrlehrer");
    const r = await page.evaluate(() => {
      const t = document.getElementById("view").innerText;
      const zurueck = [...document.querySelectorAll("#view button")].filter((b) => /Zurück/.test(b.innerText)).length;
      const pfeil = document.getElementById("navBackBtn");
      return { anzahl: (t.match(/Noch kein Buchungslink eingerichtet\./g) || []).length, slug: /Slug/i.test(t), zurueck, pfeil: !!pfeil && !pfeil.hidden };
    });
    const f = [];
    if (r.anzahl !== 1) f.push(`Hinweis ${r.anzahl}× statt 1×`);
    if (r.slug) f.push("„Slug“ sichtbar");
    if (r.zurueck) f.push(`${r.zurueck} Zurück-Knopf in der Seite`);
    if (!r.pfeil) f.push("Zurück-Pfeil oben fehlt");
    else {
      await page.locator("#navBackBtn").click({ timeout: 3000 }); await warte(page, 300);
      const titel = await page.evaluate(() => document.getElementById("tbTitle").textContent);
      if (titel !== "Start") f.push("Pfeil führt nach „" + titel + "“");
    }
    return f;
  });
  await pruefe(`E2 ${P}`, "kein sichtbares „Slug“ oder „Dashboard“ in der Gesamtansicht (Start, Menü, Fahrlehrer, Fahrzeuge, Statistik, Verwaltung, Kalender, Schüler)", async () => {
    const f = [];
    const seiten = ["routeFahrschuleDashboard()", "routeFahrschuleLehrer()", "routeFahrschuleFahrzeuge()", "routeFahrschuleStatistik()", "routeFahrschuleVerwaltung()", `routeKalender("woche","${TAG}")`, "routeHome()"];
    for (const s of seiten) {
      try { await ev(page, s); } catch (e) { f.push(s + " scheiterte: " + String(e.message || e).split("\n")[0]); continue; }
      await warte(page, 300);
      const t = await page.evaluate(() => (document.getElementById("view").innerText || "") + " " + (document.getElementById("fsCalTiles")?.innerText || ""));
      const m = t.match(/.{0,20}(Slug|Dashboard|Kill-Switch).{0,20}/i);
      if (m) f.push(`${s}: „${m[0].replace(/\s+/g, " ")}“`);
    }
    await ev(page, `openDrawer()`); await warte(page, 300);
    const d = await page.evaluate(() => document.querySelector(".drawer-nav").innerText);
    await ev(page, `closeDrawer()`);
    const m = d.match(/.{0,20}(Slug|Dashboard|Kill-Switch).{0,20}/i);
    if (m) f.push(`Mehr-Menü: „${m[0].replace(/\s+/g, " ")}“`);
    return f;
  });
  for (const hell of [true, false]) {
    await pruefe(`E3 ${P}`, `Fahrlehrer-Seite (${hell ? "hell" : "dunkel"}): Knöpfe „Passwort zurücksetzen“/„Buchungslinks“ und „Aktiv“ mit Kontrast mind. 4,5:1; Büro-Hinweis ohne Namen und Gedankenstrich`, async () => {
      await page.evaluate((h) => document.body.classList.toggle("light", h), hell);
      await ev(page, `routeFahrschuleLehrer()`); await warte(page, 400);
      if (BILDER2 && g.w === 412) await page.screenshot({ path: join(BILDER2, `fahrlehrer-${hell ? "hell" : "dunkel"}-412.png`), fullPage: false });
      const r = await page.evaluate(() => {
        const rgb = (c) => { const m = c.match(/[\d.]+/g) || []; return { r: +m[0] || 0, g: +m[1] || 0, b: +m[2] || 0, a: m[3] == null ? 1 : +m[3] }; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const hinter = (el) => { const schichten = []; for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.a > 0) schichten.push(c); if (c.a >= 1) break; }
          let erg = schichten.length && schichten[schichten.length - 1].a >= 1 ? schichten.pop() : rgb(getComputedStyle(document.body).backgroundColor);
          while (schichten.length) { const c = schichten.pop(); erg = { r: c.r * c.a + erg.r * (1 - c.a), g: c.g * c.a + erg.g * (1 - c.a), b: c.b * c.a + erg.b * (1 - c.a), a: 1 }; } return erg; };
        const kontrast = (el) => { const a = lum(rgb(getComputedStyle(el).color)), b = lum(hinter(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
        const els = [...document.querySelectorAll("#view .fs-btn-activate, #view .fs-status-on")];
        const t = document.getElementById("view").innerText;
        return { werte: els.map((e) => [e.innerText.trim(), Math.round(kontrast(e) * 100) / 100]), christina: /Christina/.test(t), strich: /Büro[^]{0,200}[—–]/.test(t) || /Mitarbeiter[^.]*[—–]/.test(t), kill: /Kill-Switch/i.test(t) };
      });
      const f = [];
      if (!r.werte.length) f.push("keine Knöpfe gefunden");
      r.werte.filter((x) => x[1] < 4.5).forEach((x) => f.push(`„${x[0]}“ Kontrast ${x[1]}:1`));
      if (r.christina) f.push("echter Vorname im Hinweis");
      if (r.strich) f.push("Gedankenstrich im Büro-Hinweis");
      if (r.kill) f.push("„Kill-Switch“ sichtbar");
      return f;
    });
  }
  await page.evaluate(() => document.body.classList.add("light"));
  await pruefe(`H4 ${P}`, "Seiten der Gesamtansicht nicht breiter als der Bildschirm", async () => {
    const f = [];
    for (const s of ["routeFahrschuleDashboard()", "routeFahrschuleLehrer()", "routeHome()"]) { await ev(page, s); await warte(page, 300); const z = await zuBreit(page); if (z) f.push(s + ": " + z); }
    return f;
  });

  // ---------- (f) Schüler ohne Plan ----------
  await pruefe(`F1 ${P}`, "Schüler ohne Plan: „Noch nicht begonnen“, nicht „Alles grün“ (Liste und autoNext)", async () => {
    await ev(page, `routeHome()`); await warte(page, 400);
    await bild("gk25-schueler-ohne-plan");
    const r = await page.evaluate(() => {
      const karte = [...document.querySelectorAll("#view .s-card, #view [data-id]")].find((k) => /Nina Muster/.test(k.innerText));
      return { karte: karte ? karte.innerText.replace(/\s+/g, " ") : "", direkt: autoNext({ id: "x", name: "Neu Muster" }).text };
    });
    const f = [];
    if (!r.karte) f.push("Karte von Nina fehlt");
    else {
      if (/Alles grün/.test(r.karte)) f.push("Karte zeigt „Alles grün“: " + r.karte);
      if (!/Noch nicht begonnen/.test(r.karte)) f.push("Karte ohne „Noch nicht begonnen“: " + r.karte);
    }
    if (r.direkt !== "Noch nicht begonnen") f.push("autoNext ohne Plan: " + r.direkt);
    return f;
  });
  await pruefe(`F2 ${P}`, "Schüler mit Fortschritt unverändert: nächster Punkt bzw. „Alles grün“ bei allem grün", async () => {
    return page.evaluate(() => {
      const f = [];
      const s = DB.students.find((x) => x.id === "s1");
      const st = stufenFor(s); const erstes = st[0].items[0];
      s.plan.ampeln[erstes.id] = "gruen";
      const zweites = st[0].items[1] || st[1].items[0];
      const t1 = autoNext(s).text;
      const soll1 = zweites.t + " · " + (st[0].items[1] ? st[0].titel : st[1].titel);
      if (t1 !== soll1) f.push(`teilweise grün: „${t1}“ statt „${soll1}“`);
      st.forEach((x) => x.items.forEach((it) => { s.plan.ampeln[it.id] = "gruen"; }));
      const t2 = autoNext(s).text;
      if (t2 !== "Alles grün – Generalprobe!") f.push(`alles grün: „${t2}“`);
      s.plan.ampeln = {};
      return f;
    });
  });

  if (BILDER2 && (g.w === 412 || g.w === 740)) {
    for (const hell of [true, false]) {
      const th = hell ? "hell" : "dunkel", gr = g.w === 412 ? "412" : "740x360";
      await daten(page, "fs");
      await page.evaluate((h) => document.body.classList.toggle("light", h), hell);
      for (const [name, code] of [["kalender-woche-leer", `routeKalender("woche","${TAG}")`], ["kalender-tag-leer", `routeKalender("tag","${TAG}")`], ["kalender-woche-anna", `_fsCalLehrerFilter=["L1"]; routeKalender("woche","${TAG}")`], ["start-buero-knopf", `_fsCalLehrerFilter=[]; routeFahrschuleDashboard()`]]) {
        await ev(page, code); await warte(page, 900);
        await page.screenshot({ path: join(BILDER2, `${name}-${th}-${gr}.png`) });
      }
    }
    await page.evaluate(() => document.body.classList.add("light"));
  }
  await pruefe(`H5 ${P}`, "keine JS-Fehler", async () => (jsFehler.length ? jsFehler.slice(0, 3) : null));
  await ctx.close();
}

// ---------- (g) Tipp auf den Knopf öffnet die Büro-Seite im selben Fenster ----------
await pruefe("G3", "Tipp auf „Zur Büro-Seite“ öffnet buero.html im selben Fenster", async () => {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; } });
  try {
    await daten(page, "fs");
    await ev(page, `routeFahrschuleDashboard()`); await warte(page, 300);
    const k = page.locator("#view a", { hasText: /Zur Büro-Seite/i });
    if (!(await k.count())) return "Knopf fehlt";
    const seiten = ctx.pages().length;
    await Promise.all([page.waitForURL(/buero\.html/, { timeout: 5000 }), k.first().click()]);
    if (ctx.pages().length !== seiten) return "neues Fenster geöffnet";
    return null;
  } finally { await ctx.close(); }
});

await browser.close();
server.close();
console.log(`Chef-Sicht-Test: ${okZahl + fehlerZahl} Prüfungen, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
