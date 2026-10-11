// Reiter-Test (Umbau Schritt 1): Reiterleiste unten, Menü „Mehr“, Gesamtansicht, Plus-Knopf, CSS-Variablen.
// Jeder Prüfpunkt (A1 … F2) gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt eine Funktion, wird der Punkt übersprungen.
// Die Datenbank wird nicht angesprochen: alle Fremdanfragen sind blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/reiter-test.mjs
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
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

let fehlerZahl = 0, okZahl = 0, uebersprungen = 0;
// fn liefert: nichts/true = ok, Text = Fehlergrund, { skip: "Grund" } = übersprungen
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r && typeof r === "object" && r.skip) { uebersprungen++; console.log(`übersprungen  ${id} ${text}: ${r.skip}`); return; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

const REITER = ["heute", "kalender", "schueler", "pruefungen", "mehr"];
const BESCHRIFTUNG = { heute: "Heute", kalender: "Kalender", schueler: "Schüler", pruefungen: "Prüfungen", mehr: "Mehr" };
const VERBOTEN = ["dash", "new", "home", "kalender", "pruef"];

async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  // Nur die eigene Seite laden, keine Außenwelt: Fremdanfragen blockieren.
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    // Keine Datenbank: Attrappe, die nichts tut.
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students.push({ id: "t1", name: "Erfundene Testperson Lang", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0123" });
  });
  return { ctx, page, jsFehler };
}

const warte = (page, ms = 250) => page.waitForTimeout(ms);
const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
const aufraeumen = (page) => page.evaluate(() => { try { closeSheet(); } catch (e) {} try { closeDrawer(); } catch (e) {} });
async function reiterKlick(page, tab) {
  const loc = page.locator(`#tabbar .tab-i[data-tab="${tab}"]`);
  if (!(await loc.count())) return `Reiter „${tab}“ fehlt`;
  await loc.first().click();
  await warte(page);
  return null;
}
const aktiveReiter = (page) => page.evaluate(() => [...document.querySelectorAll("#tabbar .tab-i.on")].map((b) => b.dataset.tab));
const gibtFunktion = (page, name) => page.evaluate((n) => typeof window[n] === "function", name);
async function menuOeffnen(page) {
  const mehr = page.locator('#tabbar .tab-i[data-tab="mehr"]');
  if (await mehr.count()) await mehr.first().click();
  else await page.evaluate(() => openDrawer());
  await warte(page, 150);
}
const fabZustand = (page) => page.evaluate(() => {
  const f = document.getElementById("fab");
  if (!f) return { da: false };
  return { da: true, sichtbar: getComputedStyle(f).display !== "none" && f.getBoundingClientRect().width > 0, text: f.textContent.replace(/\s+/g, " ").trim() };
});
const sheetZustand = (page) => page.evaluate(() => {
  const s = document.getElementById("sheet");
  return { offen: !!s && s.classList.contains("open"), kopf: (s?.querySelector(".sheet-h")?.textContent || "").replace(/\s+/g, " ").trim(), text: (s?.textContent || "").replace(/\s+/g, " ").trim() };
});

// ---------- Hauptlauf bei 412 × 915 ----------
const { ctx, page, jsFehler } = await neueSeite(412, 915);

// A. Reiterleiste
await pruefe("A1", "genau 5 Reiter in der Reihenfolge heute, kalender, schueler, pruefungen, mehr", async () => {
  const tabs = await page.evaluate(() => [...document.querySelectorAll("#tabbar .tab-i")].map((b) => b.dataset.tab));
  if (tabs.join() !== REITER.join()) return `gefunden: [${tabs.join(", ")}]`;
});

await pruefe("A2", "Beschriftungen Heute, Kalender, Schüler, Prüfungen, Mehr", async () => {
  const b = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#tabbar .tab-i")].map((x) => [x.dataset.tab, (x.innerText || x.textContent).replace(/\s+/g, " ").trim()])));
  return REITER.filter((t) => b[t] !== BESCHRIFTUNG[t]).map((t) => `${t}: „${b[t] ?? "fehlt"}“ statt „${BESCHRIFTUNG[t]}“`);
});

await pruefe("A3", "Tipp auf Reiter öffnet die richtige Seite, „Mehr“ öffnet das Menü", async () => {
  const f = [];
  for (const t of ["heute", "kalender", "schueler", "pruefungen"]) {
    await aufraeumen(page);
    const e = await reiterKlick(page, t);
    if (e) { f.push(e); continue; }
    const ti = await titel(page);
    if (ti !== BESCHRIFTUNG[t]) f.push(`${t} → Titel „${ti}“`);
  }
  await aufraeumen(page);
  await page.evaluate(() => routeDashboard());
  await warte(page, 100);
  const vorher = await titel(page);
  const e = await reiterKlick(page, "mehr");
  if (e) f.push(e);
  else {
    const offen = await page.evaluate(() => document.getElementById("drawer")?.classList.contains("open"));
    if (!offen) f.push("Mehr öffnet das Menü nicht");
    if ((await titel(page)) !== vorher) f.push("Mehr wechselt die Seite");
  }
  await aufraeumen(page);
  return f;
});

await pruefe("A4", "aktiver Reiter passt zur Seite (genau einer)", async () => {
  const faelle = [
    ["routeDashboard()", "heute"], ["routeKalender()", "kalender"], ["routeHome()", "schueler"], ["routeDetail('t1')", "schueler"],
    ["routePlan('t1')", "schueler"], ["formView(null)", "schueler"], ["routePruefungen()", "pruefungen"], ["routePruefungenWoche()", "pruefungen"],
    ["routePruefer()", "pruefungen"], ["routeSettings()", "mehr"], ["routeStats('cur')", "mehr"], ["routeArchive()", "mehr"], ["routeTodos()", "mehr"], ["routeDraw()", "mehr"],
  ];
  const f = [];
  for (const [aufruf, soll] of faelle) {
    await aufraeumen(page);
    const name = aufruf.split("(")[0];
    if (!(await gibtFunktion(page, name))) { if (name !== "routePruefer") f.push(`${name} fehlt`); continue; }
    const err = await page.evaluate((a) => { try { eval(a); return null; } catch (e) { return String(e); } }, aufruf);
    if (err) { f.push(`${aufruf}: ${err}`); continue; }
    await warte(page, 120);
    const on = await aktiveReiter(page);
    if (on.length !== 1 || on[0] !== soll) f.push(`${aufruf} → [${on.join(",")}] statt ${soll}`);
  }
  await page.evaluate(() => routeDashboard());
  return f;
});

await pruefe("A6", "Zurück: auf Hauptseiten kein Pfeil, Android-Zurück Prüfungen → Heute, Pfeil in der Akte führt zurück", async () => {
  await aufraeumen(page);
  let e = await reiterKlick(page, "heute"); if (e) return e;
  e = await reiterKlick(page, "pruefungen"); if (e) return e;
  if ((await titel(page)) !== "Prüfungen") return "Prüfungen-Reiter öffnet nicht „Prüfungen“";
  const btn = page.locator("#navBackBtn");
  if (await btn.isVisible()) return "Zurück-Pfeil auf der Hauptseite Prüfungen sichtbar";
  if (await page.locator("#menuBtn").isVisible()) return "Menü-Knopf oben noch sichtbar (doppelt zu „Mehr“)";
  await page.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate")));
  await warte(page);
  let ti = await titel(page);
  if (ti !== "Heute") return `nach Android-Zurück Titel „${ti}“`;
  e = await reiterKlick(page, "schueler"); if (e) return e;
  await page.evaluate(() => routeDetail("t1"));
  await warte(page);
  if (!(await btn.isVisible())) return "Zurück-Pfeil in der Schülerakte fehlt";
  await btn.click();
  await warte(page);
  ti = await titel(page);
  if (ti !== "Schüler") return `Pfeil in der Akte führt zu „${ti}“`;
});

await pruefe("A7", "Kalender: nur ein Plus-Knopf; „Neuer Termin“ ohne vergangene Zeiten, mit Ende und „Andere Art“", async () => {
  await aufraeumen(page);
  let e = await reiterKlick(page, "kalender"); if (e) return e;
  const plus = await page.evaluate(() => [...document.querySelectorAll("#fab,#calFab")].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && getComputedStyle(x).display !== "none"; }).length);
  if (plus !== 1) return `${plus} Plus-Knöpfe sichtbar`;
  const r = await page.evaluate(async () => {
    const orig = naechsteFreieLuecken, h = todayISO(), m = addDays(h, 1);
    naechsteFreieLuecken = () => [{ date: h, von: "00:00", bis: "00:45", art: "fahrstunde" }, { date: m, von: "10:00", bis: "11:30", art: "fahrstunde" }];
    try { routeDashboard(); openNeuerTerminSheet(); } finally { naechsteFreieLuecken = orig; }
    await new Promise((k) => setTimeout(k, 150));
    const t = [...document.querySelectorAll("#sheet .nt-gap")].map((b) => b.textContent);
    const andere = !!document.getElementById("ntAndere");
    closeSheet();
    return { t, andere };
  });
  if (r.t.some((x) => x.includes("00:00"))) return "vergangene Uhrzeit von heute wird angeboten";
  if (!r.t.some((x) => x.includes("10:00–11:30"))) return "Lücke ohne Ende-Zeit: " + r.t.join(" | ");
  if (!r.andere) return "Knopf „Andere Art“ fehlt";
});

// B. Menü „Mehr“
const navWerte = () => page.evaluate(() => [...document.querySelectorAll(".drawer-nav [data-nav]")].map((b) => b.dataset.nav));
await pruefe("B1", "Menü ohne dash, new, home, kalender, pruef", async () => {
  const n = await navWerte();
  const da = VERBOTEN.filter((v) => n.includes(v));
  if (da.length) return `noch im Menü: ${da.join(", ")}`;
});

await pruefe("B2", "Menü enthält todos, stats, archive, draw, settings und jeder öffnet seine Seite", async () => {
  const ziele = { todos: "To-Dos", stats: "Statistik", archive: "Archiv", draw: "Verkehrstafel", settings: "Einstellungen" };
  const n = await navWerte();
  const f = Object.keys(ziele).filter((k) => !n.includes(k)).map((k) => `${k} fehlt`);
  for (const [k, soll] of Object.entries(ziele)) {
    if (!n.includes(k)) continue;
    await aufraeumen(page);
    await page.evaluate(() => routeDashboard());
    await warte(page, 100);
    await menuOeffnen(page);
    await page.locator(`.drawer-nav [data-nav="${k}"]`).first().click();
    await warte(page, 400); // Navigation läuft mit setTimeout 170 ms
    const ti = await titel(page);
    if (ti !== soll) f.push(`${k} → Titel „${ti}“ statt „${soll}“`);
  }
  await aufraeumen(page);
  await page.evaluate(() => routeDashboard());
  return f;
});

await pruefe("B3", "Beschriftungen „Verkehrstafel“ und „Verdienst & Statistik“", async () => {
  const t = await page.evaluate(() => {
    const txt = (k) => (document.querySelector(`.drawer-nav [data-nav="${k}"]`)?.textContent || "").replace(/\s+/g, " ").trim();
    return { draw: txt("draw"), stats: txt("stats") };
  });
  const f = [];
  if (t.draw !== "Verkehrstafel") f.push(`draw heißt „${t.draw}“`);
  if (t.stats !== "Verdienst & Statistik") f.push(`stats heißt „${t.stats}“`);
  return f;
});

await pruefe("B4", "Super-Admin-Knopf wird im normalen Menü angehängt", async () => {
  if (!(await gibtFunktion(page, "_fsSetDrawer"))) return { skip: "_fsSetDrawer fehlt" };
  const r = await page.evaluate(() => {
    const alt = window.isSuperAdmin;
    window.isSuperAdmin = () => true;
    try {
      _fsSetDrawer(false);
      const n = [...document.querySelectorAll(".drawer-nav [data-nav]")].map((b) => b.dataset.nav);
      return { toggle: n.includes("__fstoggle"), verboten: n.filter((v) => ["dash", "new", "home", "kalender", "pruef"].includes(v)) };
    } finally { window.isSuperAdmin = alt; _fsSetDrawer(false); }
  });
  const f = [];
  if (!r.toggle) f.push("__fstoggle fehlt");
  if (r.verboten.length) f.push(`zusätzlich noch im Menü: ${r.verboten.join(", ")}`);
  return f;
});

// C. Gesamtansicht
await pruefe("C1", "Fahrschul-Menü unverändert (fs_dash … fs_stats, buero.html)", async () => {
  if (!(await gibtFunktion(page, "_fsSetDrawer"))) return { skip: "_fsSetDrawer fehlt" };
  const r = await page.evaluate(() => {
    _fsSetDrawer(true);
    const nav = document.querySelector(".drawer-nav");
    return { n: [...nav.querySelectorAll("[data-nav]")].map((b) => b.dataset.nav), buero: !!nav.querySelector('a[href="buero.html"]') };
  });
  const f = ["fs_dash", "fs_kalender", "fs_schueler", "fs_lehrer", "fs_fahrzeuge", "fs_stats"].filter((k) => !r.n.includes(k)).map((k) => `${k} fehlt`);
  if (!r.buero) f.push("Link buero.html fehlt");
  return f;
});

await pruefe("C2", "nach _fsSetDrawer(true) → (false) ist das normale Menü zurück", async () => {
  if (!(await gibtFunktion(page, "_fsSetDrawer"))) return { skip: "_fsSetDrawer fehlt" };
  const n = await page.evaluate(() => { _fsSetDrawer(true); _fsSetDrawer(false); return [...document.querySelectorAll(".drawer-nav [data-nav]")].map((b) => b.dataset.nav); });
  const f = VERBOTEN.filter((v) => n.includes(v)).map((v) => `${v} noch im Menü`);
  if (!n.includes("settings")) f.push("settings fehlt");
  if (n.some((v) => v.startsWith("fs_"))) f.push("Fahrschul-Punkte noch im Menü");
  return f;
});

await pruefe("C3", "Gesamtansicht: Heute öffnet routeFahrschuleDashboard, Plus-Knopf aus auf Heute/Kalender", async () => {
  if (!(await gibtFunktion(page, "routeFahrschuleDashboard"))) return { skip: "routeFahrschuleDashboard fehlt" };
  await aufraeumen(page);
  await page.evaluate(() => {
    _fsAgg = { fahrschuleId: "x", fahrschule: { name: "Test" }, lehrer: [] };
    window.__fsDashAufrufe = 0;
    const orig = window.routeFahrschuleDashboard;
    window.__fsDashOrig = orig;
    window.routeFahrschuleDashboard = function () { window.__fsDashAufrufe++; return orig.apply(this, arguments); };
  });
  const f = [];
  try {
    await page.evaluate(() => routeKalender()); // von woanders kommen, damit „Heute“ wirklich etwas tut
    await warte(page, 100);
    const e = await reiterKlick(page, "heute");
    if (e) f.push(e);
    else {
      const r = await page.evaluate(() => ({ n: window.__fsDashAufrufe, ti: document.getElementById("tbTitle").textContent.trim() }));
      if (!r.n) f.push(`Heute öffnet nicht routeFahrschuleDashboard (Titel „${r.ti}“)`);
      if ((await fabZustand(page)).sichtbar) f.push("Plus-Knopf auf Heute sichtbar");
    }
    const e2 = await reiterKlick(page, "kalender");
    if (e2) f.push(e2);
    else if ((await fabZustand(page)).sichtbar) f.push("Plus-Knopf auf Kalender sichtbar");
  } finally {
    await page.evaluate(() => {
      window.routeFahrschuleDashboard = window.__fsDashOrig;
      _fsAgg = null;
      document.getElementById("fsCalTiles")?.remove();
      _fsSetDrawer(false);
      routeDashboard();
    });
    await warte(page, 100);
  }
  return f;
});

// D. Plus-Knopf
async function terminFab(tab) {
  await aufraeumen(page);
  const e = await reiterKlick(page, tab);
  if (e) return [e];
  const f = [];
  const z = await fabZustand(page);
  if (!z.sichtbar) return ["Plus-Knopf ausgeblendet"];
  if (z.text !== "Termin") f.push(`Plus-Knopf heißt „${z.text}“`);
  await page.click("#fab");
  await warte(page);
  const s = await sheetZustand(page);
  if (!s.offen) f.push(`kein Fenster offen (Titel jetzt „${await titel(page)}“)`);
  else if (s.kopf !== "Neuer Termin") f.push(`Fenster-Überschrift „${s.kopf}“`);
  await aufraeumen(page);
  return f;
}
await pruefe("D1", "Heute: Plus „Termin“ öffnet Fenster „Neuer Termin“", () => terminFab("heute"));
await pruefe("D2", "Kalender: Plus „Termin“ öffnet Fenster „Neuer Termin“", () => terminFab("kalender"));

await pruefe("D3", "Schüler: Plus „Neuer Schüler“ öffnet Formular", async () => {
  await aufraeumen(page);
  await page.evaluate(() => routeHome());
  await warte(page);
  const z = await fabZustand(page);
  if (!z.sichtbar) return "Plus-Knopf ausgeblendet";
  const f = [];
  if (z.text !== "Neuer Schüler") f.push(`Plus-Knopf heißt „${z.text}“`);
  await page.click("#fab");
  await warte(page);
  const ti = await titel(page);
  if (ti !== "Neuer Schüler") f.push(`Titel „${ti}“`);
  return f;
});

await pruefe("D4", "Plus-Knopf aus auf Prüfungen, Einstellungen, Statistik, Schülerakte", async () => {
  const f = [];
  for (const a of ["routePruefungen()", "routeSettings()", "routeStats('cur')", "routeDetail('t1')"]) {
    await aufraeumen(page);
    await page.evaluate((x) => eval(x), a);
    await warte(page, 150);
    const vis = await page.evaluate(() => getComputedStyle(document.getElementById("fab")).display !== "none");
    if (vis) f.push(`${a}: sichtbar`);
  }
  await page.evaluate(() => routeDashboard());
  return f;
});

await pruefe("D5", "Fenster „Neuer Termin“: Lücken als Knöpfe → „Termin vergeben“; ohne Lücken Hinweis + „Schließen“", async () => {
  if (!(await gibtFunktion(page, "naechsteFreieLuecken"))) return { skip: "naechsteFreieLuecken fehlt" };
  const f = [];
  await aufraeumen(page);
  // Eine erfundene Lücke morgen 10:00–11:30
  await page.evaluate(() => {
    window.__lueckenOrig = window.naechsteFreieLuecken;
    const d = addDays(todayISO(), 1);
    window.naechsteFreieLuecken = () => [{ date: d, von: "10:00", bis: "11:30", art: "fahrstunde" }];
    routeDashboard();
  });
  try {
    await warte(page);
    if (!(await fabZustand(page)).sichtbar) return "Plus-Knopf auf Heute ausgeblendet";
    await page.click("#fab");
    await warte(page);
    let s = await sheetZustand(page);
    if (!s.offen || s.kopf !== "Neuer Termin") return `Fenster „Neuer Termin“ öffnet nicht (offen=${s.offen}, Kopf „${s.kopf}“)`;
    const luecke = page.locator("#sheet button", { hasText: "10:00" });
    if (!(await luecke.count())) f.push("Lücke 10:00 nicht als Knopf gelistet");
    else {
      await luecke.first().click();
      await warte(page, 350);
      s = await sheetZustand(page);
      if (!s.offen || s.kopf !== "Termin vergeben") f.push(`Tipp auf Lücke → „${s.kopf}“ statt „Termin vergeben“`);
    }
    await aufraeumen(page);
    // Ohne Lücken
    await page.evaluate(() => { window.naechsteFreieLuecken = () => []; if (typeof window.dayFreeSlots === "function") { window.__dfsOrig = window.dayFreeSlots; window.dayFreeSlots = () => []; } });
    await page.click("#fab");
    await warte(page);
    s = await sheetZustand(page);
    if (!s.offen) f.push("ohne Lücken: Fenster öffnet nicht");
    else {
      if (s.text.replace(s.kopf, "").replace("Schließen", "").trim().length < 10) f.push("ohne Lücken: kein Hinweistext");
      const zu = page.locator("#sheet button", { hasText: "Schließen" });
      if (!(await zu.count())) f.push("ohne Lücken: Knopf „Schließen“ fehlt");
      else {
        await zu.first().click();
        await warte(page);
        if ((await sheetZustand(page)).offen) f.push("„Schließen“ schließt das Fenster nicht");
      }
    }
  } finally {
    await page.evaluate(() => {
      window.naechsteFreieLuecken = window.__lueckenOrig;
      if (window.__dfsOrig) window.dayFreeSlots = window.__dfsOrig;
      try { closeSheet(); } catch (e) {}
    });
  }
  return f;
});

// E. CSS-Variablen und Schrift
await pruefe("E1", "Farb- und Schrift-Variablen --k-* auf :root", async () => {
  const soll = {
    "--k-grund": "#F3F5F1", "--k-tinte": "#14211A", "--k-text2": "#55645A", "--k-rand": "#E1E7DF", "--k-karte": "#FFFFFF",
    "--k-akzent": "#1E6B46", "--k-akzent-hell": "#E3EFE7", "--k-jetzt": "#14211A", "--k-mint": "#5BD18E", "--k-mint-hell": "#9FD3B4",
    "--k-gelb": "#FBEFD9", "--k-gelb-text": "#7A4508", "--k-rot": "#F8E3DF", "--k-rot-text": "#8E2A1E", "--k-whatsapp": "#0F7D6E",
    "--k-radius": "16px", "--k-tipp": "44px",
  };
  const ist = await page.evaluate((namen) => { const cs = getComputedStyle(document.documentElement); return Object.fromEntries(namen.map((n) => [n, cs.getPropertyValue(n)])); },
    [...Object.keys(soll), "--k-font-titel", "--k-font-text"]);
  const norm = (v) => String(v || "").replace(/\s+/g, "").toLowerCase();
  const f = Object.entries(soll).filter(([k, v]) => norm(ist[k]) !== norm(v)).map(([k, v]) => `${k}=„${(ist[k] || "").trim() || "fehlt"}“ statt ${v}`);
  if (!/playfairdisplay/.test(norm(ist["--k-font-titel"]))) f.push(`--k-font-titel ohne Playfair Display („${(ist["--k-font-titel"] || "").trim() || "fehlt"}“)`);
  if (!/manrope/.test(norm(ist["--k-font-text"]))) f.push(`--k-font-text ohne Manrope („${(ist["--k-font-text"] || "").trim() || "fehlt"}“)`);
  if (f.length > 4) return `${f.length} Variablen falsch/fehlen, z. B. ${f.slice(0, 3).join(" · ")}`;
  return f;
});

await pruefe("E2", "Manrope wird über Google Fonts geladen", async () => {
  const da = await page.evaluate(() => [...document.head.querySelectorAll("link[href]")].some((l) => /fonts\.googleapis\.com/.test(l.href) && /family=Manrope/.test(l.href)));
  if (!da) return "kein <link> mit family=Manrope im <head>";
});

// F. Nichts kaputt
await pruefe("F2", "Android-Zurück schließt zuerst das offene Menü", async () => {
  await aufraeumen(page);
  await page.evaluate(() => routeHome());
  await warte(page, 100);
  await menuOeffnen(page);
  if (!(await page.evaluate(() => document.getElementById("drawer").classList.contains("open")))) return "Menü ließ sich nicht öffnen";
  const vorher = await titel(page);
  await page.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate")));
  await warte(page, 150);
  const r = await page.evaluate(() => document.getElementById("drawer").classList.contains("open"));
  if (r) return "Menü bleibt offen";
  if ((await titel(page)) !== vorher) return "Seite gewechselt statt nur Menü zu schließen";
});

await pruefe("F1", "keine JS-Fehler beim Öffnen aller Reiter und Menüpunkte", async () => {
  // Alle Reiter und Menüpunkte einmal über die Oberfläche antippen.
  for (const t of REITER) { await aufraeumen(page); await reiterKlick(page, t); }
  const navs = await navWerte();
  for (const k of navs.filter((v) => !v.startsWith("__") && !v.startsWith("fs_"))) {
    await aufraeumen(page);
    await menuOeffnen(page);
    const loc = page.locator(`.drawer-nav [data-nav="${k}"]`);
    if (await loc.count()) { await loc.first().click(); await warte(page, 350); }
  }
  await aufraeumen(page);
  if (jsFehler.length) return `${jsFehler.length} JS-Fehler, z. B. ${jsFehler[0]}`;
});
await ctx.close();

// A5: Größen
await pruefe("A5", "Reiter bei 360/384/412 hoch und 915 quer vollständig, ≥ 44 px, nicht wischbar", async () => {
  const f = [];
  for (const g of [{ n: "360 hoch", w: 360, h: 740 }, { n: "384 hoch", w: 384, h: 830 }, { n: "412 hoch", w: 412, h: 915 }, { n: "915 quer", w: 915, h: 412 }]) {
    const s = await neueSeite(g.w, g.h);
    const m = await s.page.evaluate(() => {
      const W = document.documentElement.clientWidth, H = window.innerHeight, p = [];
      const tabs = [...document.querySelectorAll("#tabbar .tab-i")];
      if (!tabs.length) p.push("keine Reiter");
      for (const b of tabs) {
        const r = b.getBoundingClientRect(), id = b.dataset.tab;
        if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) p.push(`${id} ragt aus dem Bild`);
        if (r.height < 44 || r.width < 44) p.push(`${id} nur ${Math.round(r.width)}×${Math.round(r.height)} px`);
        const lab = [...b.querySelectorAll("span")].filter((x) => !x.querySelector("svg") && x.textContent.trim()).pop();
        if (!lab) { p.push(`${id} ohne Beschriftung`); continue; }
        const lr = lab.getBoundingClientRect();
        if (lab.scrollWidth > lab.clientWidth + 1 || lr.left < r.left - 1 || lr.right > r.right + 1 || lr.right > W + 1) p.push(`${id}: „${lab.textContent.trim()}“ abgeschnitten`);
      }
      if (document.documentElement.scrollWidth > W + 1) p.push("seitlich wischbar");
      return p;
    });
    if (m.length) f.push(`${g.n}: ${m.join(", ")}`);
    await s.ctx.close();
  }
  return f;
});

await browser.close();
server.close();
console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler${uebersprungen ? `, ${uebersprungen} übersprungen` : ""}.`);
process.exit(fehlerZahl ? 1 : 0);
