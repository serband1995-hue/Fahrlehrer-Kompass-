// W28: Terminarten „nur Büro“ (Vortest, Simulator, Beratungsgespräch vor Ort, MPU-Termin), Filter, Link je Termin.
// Büro mit Vorführdaten (keine Datenbank), erfundene Schüler. App nur über ihren Code (ohne Anmeldung).
//   W1 Arten im Büro-Fenster, MPU anlegen (mit Überschneidungs-Rückfrage), Hinweis „Nur im Büro“, kein App-Hinweis
//   W2 Filter: nur gewählte Arten sichtbar, gemerkt nach Neuladen, „Alle Arten zeigen“, Termine bleiben unverändert
//   W3 Link kopieren → #termin=<id>; Link öffnen → richtiger Tag, Termin offen
//   W4 gelöschter / unbekannter Termin → „Termin gibt es nicht mehr“
//   W5 ohne Anmeldung: Anmeldeseite, kein Termin
//   W6 UE/Lohn: Büro-Arten zählen 0 (Büro und App), App blendet sie aus und löscht sie nie
//   W7 360 px: nichts läuft seitlich über, keine JS-Fehler
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/w28-test.mjs
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
const { bauDaten } = require(join(ROOT, "buero-vorfuehrung.js"));
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const HEUTE = new Date().toISOString().slice(0, 10);
const d0 = new Date(HEUTE + "T12:00:00Z"); d0.setUTCDate(d0.getUTCDate() + 40); const TAG = d0.toISOString().slice(0, 10);

async function bueroSeite(breite, { mitSitzung = true, hash = "#kalender?tag=" + TAG, ctx: altCtx, speicher } = {}) {
  const ctx = altCtx || await browser.newContext({ viewport: { width: breite, height: 800 } });
  const page = await ctx.newPage(); page.setDefaultTimeout(5000);
  const jsFehler = []; page.on("pageerror", (e) => jsFehler.push(e.message));
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route("**/*", (r) => { const u = r.request().url(); if (/vendor\/supabase-js-/.test(u)) return r.fallback(); return u.startsWith(basis) ? r.continue() : r.abort(); });
  await page.addInitScript(([d, TAG, mitSitzung]) => {
    d.tabellen.fahrschule_urlaub = []; d.tabellen.fahrschule_schichten = []; d.tabellen.fahrschule_backups = [];
    d.tabellen.kalender_termine = d.tabellen.kalender_termine.filter((t) => t.datum !== TAG);
    const T = (id, sid, von, bis, art) => d.tabellen.kalender_termine.push({ id, fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: sid, datum: TAG, von, bis, art, fahrzeug: null, status: "geplant", geloescht: false, payload: {}, aktualisiert_am: new Date().toISOString() });
    T("w28f", "s1", "08:00", "09:30", "fahrstunde"); T("w28v", "s2", "10:00", "11:00", "vortest"); T("w28s", null, "12:00", "13:00", "simulator");
    T("w28weg", "s1", "14:00", "15:00", "beratung"); d.tabellen.kalender_termine[d.tabellen.kalender_termine.length - 1].geloescht = true;
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: mitSitzung ? { user: { id: "ad-1", email: "ad-1@example.org" } } : null, rpcs: {}, fehler: {} };
    window.__KOPIE = null;
    try { Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__KOPIE = t; } }, configurable: true }); } catch (e) {}
  }, [bauDaten(HEUTE), TAG, mitSitzung]);
  if (speicher) await page.addInitScript((sp) => { for (const [k, v] of Object.entries(sp)) localStorage.setItem(k, v); }, speicher);
  await page.goto(basis + "buero.html" + hash); await warte(page, 1000);
  return { ctx, page, jsFehler };
}
const sichtbareIds = (page) => page.evaluate(() => [...document.querySelectorAll(".k-termin[data-termin]")].map((b) => b.dataset.termin).filter((x) => x.startsWith("w28")).sort());

// W1–W4, W7 im Büro
for (const breite of [1024, 360]) {
  const { ctx, page, jsFehler } = await bueroSeite(breite);
  const B = `[Büro ${breite}]`;
  await pruefe("W1a " + B, "Art-Auswahl hat die vier Büro-Arten", async () => {
    await page.evaluate((TAG) => terminDialog(null, { fahrlehrer_id: "fl-1", datum: TAG, von: "10:30" }), TAG); await warte(page);
    const opt = await page.evaluate(() => [...document.querySelectorAll("dialog[open] select[name=art] option")].map((o) => o.textContent));
    return ["Vortest", "Simulator", "Beratungsgespräch vor Ort", "MPU-Termin"].filter((x) => !opt.includes(x)).map((x) => x + " fehlt");
  });
  await pruefe("W1b " + B, "MPU: Hinweis „Nur im Büro“, kein App-Hinweis; Überschneidung fragt nach; gespeichert als mpu", async () => {
    const f = [];
    await page.selectOption("dialog[open] select[name=art]", "mpu");
    await page.selectOption("dialog[open] select[name=schueler_id]", "s2");
    await page.fill("dialog[open] input[name=bis]", "11:15");
    const h = await page.evaluate(() => ({ nb: !document.querySelector("dialog[open] #nurBueroHinweis").hidden, app: !document.querySelector("dialog[open] #appHinweis").hidden }));
    if (!h.nb) f.push("Hinweis Nur-Büro fehlt"); if (h.app) f.push("App-Hinweis sichtbar");
    await page.click("dialog[open] footer button[value=ok]"); await warte(page, 400);
    const frage = await page.evaluate(() => [...document.querySelectorAll("dialog[open]")].map((d) => d.textContent).join(" "));
    if (!/Überschneidung/.test(frage)) f.push("keine Überschneidungs-Rückfrage");
    else { await page.getByRole("button", { name: "Trotzdem speichern" }).click(); await warte(page, 500); }
    const neu = await page.evaluate(() => window.__FAKE.tabellen.kalender_termine.filter((t) => t.art === "mpu" && !t.geloescht).length);
    if (neu !== 1) f.push("mpu-Zeilen: " + neu);
    return f;
  });
  await pruefe("W2a " + B, "ohne Auswahl alle Arten sichtbar", async () => {
    const ids = await sichtbareIds(page);
    return ["w28f", "w28s", "w28v"].filter((x) => !ids.includes(x)).map((x) => x + " fehlt").concat(ids.includes("w28weg") ? ["gelöschter sichtbar"] : []);
  });
  await pruefe("W2b " + B, "nur Vortest + Simulator gewählt → nur diese; Termine unverändert", async () => {
    const vorher = await page.evaluate(() => JSON.stringify(window.__FAKE.tabellen.kalender_termine));
    await page.evaluate(() => { const d = document.querySelector(".k-art-filter"); if (d) d.open = true; });
    await page.check('[data-kart="vortest"]'); await warte(page, 300);
    await page.evaluate(() => { const d = document.querySelector(".k-art-filter"); if (d) d.open = true; });
    await page.check('[data-kart="simulator"]'); await warte(page, 300);
    const ids = await sichtbareIds(page), f = [];
    if (ids.join() !== "w28s,w28v") f.push("sichtbar: " + ids.join());
    if (vorher !== await page.evaluate(() => JSON.stringify(window.__FAKE.tabellen.kalender_termine))) f.push("Filter hat Termine verändert");
    return f;
  });
  // Neuladen: die Vorführung meldet sich bei F5 ab – darum neuer Browser mit dem gespeicherten Wert dieses PCs
  const gemerkt = await page.evaluate(() => localStorage.getItem("buero-kalender-arten"));
  await ctx.close();
  const p2 = await bueroSeite(breite, { speicher: { "buero-kalender-arten": gemerkt || "" } });
  const page2 = p2.page;
  await pruefe("W2c " + B, "Auswahl gemerkt nach Neuladen", async () => {
    if (gemerkt !== '["vortest","simulator"]') return "gespeichert: " + gemerkt;
    const ids = await sichtbareIds(page2);
    return ids.join() === "w28s,w28v" ? null : "sichtbar: " + ids.join();
  });
  await pruefe("W2d " + B, "„Alle Arten zeigen“ → wieder alle", async () => {
    await page2.click("[data-kartalle]"); await warte(page2, 300);
    const ids = await sichtbareIds(page2);
    const ls = await page2.evaluate(() => localStorage.getItem("buero-kalender-arten"));
    return ["w28f", "w28s", "w28v"].every((x) => ids.includes(x)) && ls === null ? null : "sichtbar: " + ids.join() + " / gespeichert: " + ls;
  });
  await pruefe("W3a " + B, "Link kopieren → buero.html#termin=<id>", async () => {
    await page2.evaluate(() => terminDialog("w28v")); await warte(page2);
    await page2.click("dialog[open] [data-klink]"); await warte(page2, 200);
    const k = await page2.evaluate(() => window.__KOPIE);
    await page2.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
    return k === basis + "buero.html#termin=w28v" ? null : "kopiert: " + k;
  });
  await pruefe("W7 " + B, "nichts läuft seitlich über, keine JS-Fehler", async () => {
    const f = [...jsFehler, ...p2.jsFehler];
    const ueber = await page2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ueber > 1) f.push("seitlich " + ueber + " px");
    return f;
  });
  await p2.ctx.close();
  const l = await bueroSeite(breite, { hash: "#termin=w28v" });
  await pruefe("W3b " + B, "Link öffnet richtigen Tag und den Termin", async () => {
    await warte(l.page, 800);
    const r = await l.page.evaluate(() => ({ hash: location.hash, titel: (document.querySelector("dialog[open] h2") || {}).textContent, art: (document.querySelector("dialog[open] select[name=art]") || {}).value }));
    return r.hash === "#kalender?tag=" + TAG && r.titel === "Termin bearbeiten" && r.art === "vortest" ? null : JSON.stringify(r);
  });
  await l.ctx.close();
  for (const id of ["w28weg", "gibtsnicht"]) {
    const g = await bueroSeite(breite, { hash: "#termin=" + id });
    await pruefe("W4 " + B, `${id} → „Termin gibt es nicht mehr“`, async () => {
      await warte(g.page, 800);
      const t = await g.page.evaluate(() => [...document.querySelectorAll("dialog[open]")].map((d) => d.textContent).join(" "));
      return /Termin gibt es nicht mehr/.test(t) && !/Termin bearbeiten/.test(t) ? null : "Text: " + t.slice(0, 120);
    });
    await g.ctx.close();
  }
}
// W5 ohne Anmeldung
{
  const { ctx, page } = await bueroSeite(1024, { mitSitzung: false, hash: "#termin=w28v" });
  await pruefe("W5", "ohne Anmeldung: kein Termin, keine Daten", async () => {
    const r = await page.evaluate(() => ({ dlg: document.querySelectorAll("dialog[open]").length, app: !document.getElementById("app") || document.getElementById("app").hidden }));
    return r.dlg === 0 && r.app ? null : JSON.stringify(r);
  });
  await ctx.close();
}
// W6 UE und App
{
  const { ctx, page } = await bueroSeite(1024);
  await pruefe("W6a [Büro]", "UE der Büro-Arten = 0 (Statistik, Lohn-Grundlage, Monatsbericht)", async () => {
    const r = await page.evaluate(() => { let s = 0; ueJeFahrlehrer(["vortest", "simulator", "beratung", "mpu"].map((art, i) => ({ id: "u" + i, art, von: "10:00", bis: "11:30", datum: "2026-12-01", fahrlehrer_id: "fl-1", payload: {} })), (fl, u) => { s += u; }); return { s, kr: KR.ueOf("mpu", "10:00", "11:30") }; });
    return r.s === 0 && r.kr === 0 ? null : JSON.stringify(r);
  });
  await ctx.close();
  const actx = await browser.newContext({ viewport: { width: 412, height: 800 } });
  const ap = await actx.newPage(); const aFehler = []; ap.on("pageerror", (e) => aFehler.push(e.message));
  await ap.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await ap.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await warte(ap, 600);
  await pruefe("W6b [App]", "UE 0, App-Büro-Kalender ohne Vortest/Simulator/Beratung/MPU, Hinzufügen ohne diese Arten", async () => {
    const r = await ap.evaluate(() => {
      const f = [];
      for (const a of ["vortest", "simulator", "beratung", "mpu"]) { if (ueOf(a, "10:00", "11:30") !== 0) f.push("UE " + a); if (!istNurBueroArt(a)) f.push("nicht nur Büro: " + a); if (FS_APP_BUERO_ARTEN.includes(a)) f.push("App-Büro-Kalender: " + a); }
      if (istNurBueroArt("fahrstunde") || istNurBueroArt("ersthilfe")) f.push("zu viel ausgeblendet");
      _fsKalenderModus = "buero"; try { openAddSheet(); } catch (e) { f.push("openAddSheet: " + e.message); }
      const add = [...document.querySelectorAll(".add-opt[data-add]")].map((b) => b.dataset.add); _fsKalenderModus = "fahrlehrer";
      for (const a of ["vortest", "simulator", "beratung", "mpu"]) if (add.includes(a)) f.push("Hinzufügen: " + a);
      if (!add.includes("ersthilfe")) f.push("Erste Hilfe fehlt im Hinzufügen");
      return f;
    });
    return r.concat(aFehler);
  });
  await pruefe("W6c [App-Code]", "Abruf filtert Büro-Arten vor der Abgleich-Basis, Brücke löscht sie nie", async () => {
    const html = await readFile(join(ROOT, "index.html"), "utf8"), f = [];
    if (!/eq\("fahrlehrer_id", _authUser\.id\)\.eq\("geloescht", false\)\)\)\.filter\(r => !istNurBueroArt\(r\.art\)\)/.test(html)) f.push("Abruf ohne Filter");
    if (!/\.then\(data=>\(\{data:data\.filter\(r=>!istNurBueroArt\(r\.art\)\)\}\)\)/.test(html)) f.push("Gesamtansicht ohne Filter");
    if (!/filter\(r => !termine \|\| !istNurBueroArt\(r\.art\)\)/.test(html)) f.push("Brücke ohne Schutz");
    return f;
  });
  await actx.close();
}
await browser.close(); server.close();
console.log(fehlerZahl ? `❌ ${fehlerZahl} Fehler, ${okZahl} ok` : `✅ W28-Test: alle ${okZahl} Prüfungen bestanden`);
process.exit(fehlerZahl ? 1 : 0);
