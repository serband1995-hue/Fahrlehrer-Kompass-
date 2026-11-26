// W19 Teil 3: Punktesystem – Büro (Attrappe der Datenbank, erfundene Daten) und App (Schülerakte, Handy 360 px).
// Büro: Standard AUS und leere Listen, Hinweis gut sichtbar, Einschalten mit Rückfrage, Listen anlegen/ändern/entfernen,
//   Knopf „Punkte“ nur bei eingeschaltetem System, Kontostand, Vergeben aus der Liste, Einlösen (zu wenig → abgelehnt, nichts gebucht),
//   Verschenken nur mit Schalter (zwei Zeilen), Eigene Buchung, Verlauf mit wer/wann, Ausschalten, Fahrlehrer ohne Zugang, nicht wischbar.
// App: Karte „Punkte“ nur mit eingeschaltetem System und Fahrschule, Kontostand und Verlauf, Geben und Einlösen aus den Listen
//   (Bestätigung), zu wenig Punkte → Hinweis, fremder Schüler → keine Karte, keine JS-Fehler, Knöpfe ≥ 44 px, nicht wischbar.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/punkte-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const HEUTE = new Date().toISOString().slice(0, 10);
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const TEST_PIN = { "Paula Muster": "7352" };
async function oeffne(nutzer, hash, breite = 1366) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 860 } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; },
    [bauDaten(HEUTE), { user: { id: nutzer, email: nutzer + "@example.org" } }]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
  if (frage) { await page.click(`#werListe button:has-text("Paula Muster")`); await page.keyboard.type(TEST_PIN["Paula Muster"], { delay: 20 }); await page.waitForTimeout(200); }
  await page.waitForTimeout(300);
  return { page, ctx, konsole };
}
const okKlick = async (page) => { await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await page.waitForTimeout(250); };
// Fenster schließen; kommt „Eingaben verwerfen?“, mit „Ja“ bestätigen
async function schliesse(page) {
  for (let i = 0; i < 4; i++) {
    const n = await page.locator("dialog[open]").count(); if (!n) return;
    const letzter = page.locator("dialog[open]").last();
    const x = letzter.locator("[data-schliessen]").first();
    if (n === 1 && await x.count()) await x.click(); else await letzter.locator("button[value=ok]").click(); // zweites Fenster = „Eingaben verwerfen?“
    await page.waitForTimeout(250);
  }
}
const wischbar = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1 ? "seitlich wischbar: " + document.documentElement.scrollWidth : null);
const tab = (page, n) => page.evaluate((n) => window.__FAKE.tabellen[n] || [], n);
const einst = (page, k) => page.evaluate((k) => ((window.__FAKE.tabellen.fahrschule_einstellungen || []).find((e) => e.schluessel === k) || {}).wert || null, k);
const toastText = (page) => page.evaluate(() => (document.getElementById("toast") || {}).textContent || "");

try {
  // ======================= Büro =======================
  const { page, ctx, konsole } = await oeffne("bu-1", "#einstellungen?thema=punkte");
  await page.waitForSelector("#punkteEinst", { timeout: 4000 });
  const e0 = await page.evaluate(() => { const f = document.getElementById("punkteEinst"); return { aktiv: f.elements.aktiv.checked, vers: f.elements.verschenken.checked, zeilen: f.querySelectorAll(".punkte-edit").length, text: f.textContent.replace(/\s+/g, " ") }; });
  await pruefe("E1", "Standard: aus, Verschenken aus, beide Listen leer (keine festen Werte)", () => [e0.aktiv && "an", e0.vers && "verschenken an", e0.zeilen && "Zeilen: " + e0.zeilen].filter(Boolean));
  await pruefe("E2", "Hinweis zu Rabatt, Steuer und Minderjährigen steht gut sichtbar da", () => [!e0.text.includes("Punkte für Bezahltes wirken wie ein Rabatt (Preisangaben, Steuer). Viele Schüler sind minderjährig. Vor dem Einschalten prüfen.") && "Hinweis fehlt"].filter(Boolean));
  await pruefe("E2b", "Hinweis ist ein auffälliger Kasten (fl-warnung) oben im Thema", () => page.evaluate(() => { const n = document.querySelector("#punkteEinst .fl-warnung"); return n && n.getBoundingClientRect().top < 400 && n.offsetHeight > 20 ? null : "nicht oben sichtbar"; }));
  await pruefe("E2c", "Thema „Punktesystem“ steht in der Themenliste", () => page.evaluate(() => (/Punktesystem/.test(document.getElementById("ansicht").textContent) ? null : "kein Thema")));
  // Schülerliste ohne Knopf
  await page.goto(basis + "buero.html#schueler"); await page.waitForTimeout(600);
  await pruefe("S1", "System aus: kein Knopf „Punkte“ in der Schülerliste", () => page.evaluate(() => (document.querySelector("[data-spunkte]") ? "Knopf da" : null)));
  // Listen anlegen
  await page.goto(basis + "buero.html#einstellungen?thema=punkte"); await page.waitForSelector("#punkteEinst", { timeout: 4000 });
  const fuelle = async (art, name, punkte) => {
    await page.click(`#punkteEinst [data-neu=${art}]`);
    const z = page.locator(`#punkteEinst .punkte-edit[data-art=${art}]`).last();
    await z.locator("[data-feld=name]").fill(name); await z.locator("[data-feld=punkte]").fill(String(punkte));
  };
  await fuelle("regeln", "Theorie bestanden", 50);
  await fuelle("regeln", "Pünktlich erschienen", 10);
  await fuelle("praemien", "Gratis Fahrstunde", 100);
  await fuelle("praemien", "Kleines Geschenk", 20);
  await page.check("#punkteEinst [name=aktiv]");
  await page.fill("#punkteEinst [name=bedingungen]", "Nur zum Test, keine Auszahlung.");
  await page.click("#punkteEinst button[type=submit]"); await page.waitForTimeout(300);
  await pruefe("E3", "Einschalten fragt nach, mit dem Hinweis", () => page.evaluate(() => { const d = document.querySelector("dialog[open]"); return d && /Rabatt/.test(d.textContent) ? null : "keine Rückfrage"; }));
  // Rückfrage verneinen: nichts eingeschaltet
  await page.locator("dialog[open]").last().locator("[data-schliessen]").first().click(); await page.waitForTimeout(250);
  await pruefe("E4", "Abbrechen: Schalter wieder aus, nichts gespeichert", async () => [(await einst(page, "punkte.system")) && "gespeichert", await page.evaluate(() => document.getElementById("punkteEinst").elements.aktiv.checked && "Haken noch da")].filter(Boolean));
  await page.check("#punkteEinst [name=aktiv]");
  await page.click("#punkteEinst button[type=submit]"); await page.waitForTimeout(250);
  await okKlick(page); await page.waitForTimeout(400);
  const sys1 = await einst(page, "punkte.system"), reg1 = await einst(page, "punkte.regeln"), pra1 = await einst(page, "punkte.praemien");
  await pruefe("E5", "gespeichert: System an, Verschenken aus, Bedingungen", () => (sys1 && sys1.aktiv === true && sys1.verschenken === false && /Nur zum Test/.test(sys1.bedingungen) ? null : JSON.stringify(sys1)));
  await pruefe("E6", "gespeichert: 2 Regeln und 2 Prämien mit Name, Punkten und Kennung", () => (reg1 && pra1 && reg1.liste.length === 2 && pra1.liste.length === 2 && reg1.liste[0].name === "Theorie bestanden" && reg1.liste[0].punkte === 50 && reg1.liste[0].id && pra1.liste[0].punkte === 100 ? null : JSON.stringify([reg1, pra1])));
  // Ändern und Entfernen
  await page.locator("#punkteEinst .punkte-edit[data-art=praemien]").nth(1).locator("[data-feld=punkte]").fill("25");
  await page.locator("#punkteEinst .punkte-edit[data-art=regeln]").nth(1).locator("[data-weg]").click();
  await page.click("#punkteEinst button[type=submit]"); await page.waitForTimeout(400);
  const reg2 = await einst(page, "punkte.regeln"), pra2 = await einst(page, "punkte.praemien");
  await pruefe("E7", "ändern (Prämie 25) und entfernen (nur noch 1 Regel) wirkt", () => (reg2.liste.length === 1 && pra2.liste[1].punkte === 25 ? null : JSON.stringify([reg2, pra2])));
  await fuelle("regeln", "Pünktlich erschienen", 10);
  await page.click("#punkteEinst button[type=submit]"); await page.waitForTimeout(400);
  await fuelle("regeln", "Ohne Punkte", "");
  await page.locator("#punkteEinst .punkte-edit[data-art=regeln]").last().locator("[data-feld=punkte]").fill("0");
  await page.click("#punkteEinst button[type=submit]"); await page.waitForTimeout(300);
  await pruefe("E8", "ungültige Punktezahl (0) wird abgelehnt, nichts gespeichert", async () => [!(await page.evaluate(() => /ganze Punktezahl/.test(document.getElementById("esMeldung").textContent))) && "keine Meldung", (await einst(page, "punkte.regeln")).liste.length !== 2 && "gespeichert"].filter(Boolean));
  await page.locator("#punkteEinst .punkte-edit[data-art=regeln]").last().locator("[data-weg]").click();
  await pruefe("E9", "Einstellungen: nicht seitlich wischbar", () => wischbar(page));

  // Schülerliste: Knopf und Dialog
  await page.goto(basis + "buero.html#schueler"); await page.waitForTimeout(700);
  await pruefe("S2", "System an: Knopf „Punkte“ in der Schülerliste", () => page.evaluate(() => (document.querySelector("[data-spunkte]") ? null : "kein Knopf")));
  const sid = await page.evaluate(() => document.querySelector("[data-spunkte]").dataset.spunkte);
  await page.click(`[data-spunkte="${sid}"]`); await page.waitForTimeout(500);
  const d0 = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return { text: d.textContent.replace(/\s+/g, " "), verschenken: !!d.querySelector("input[name=aktion][value=verschenken]"), opt: [...d.querySelectorAll("select[name=eintrag] option")].map((o) => o.textContent.trim()) }; });
  await pruefe("D1", "Dialog: Kontostand 0, noch keine Buchungen, Bedingungen sichtbar", () => [!/0\s*Punkte/.test(d0.text) && "Stand fehlt", !/Noch keine Buchungen/.test(d0.text) && "Verlauf", !/Nur zum Test, keine Auszahlung/.test(d0.text) && "Bedingungen fehlen"].filter(Boolean));
  await pruefe("D2", "Dialog: Auswahl kommt aus der Regel-Liste, „Verschenken“ fehlt (Schalter aus)", () => [JSON.stringify(d0.opt) !== JSON.stringify(["Theorie bestanden (50)", "Pünktlich erschienen (10)"]) && "Auswahl: " + d0.opt.join("|"), d0.verschenken && "Verschenken da"].filter(Boolean));
  await page.selectOption("dialog[open] select[name=eintrag]", "0");
  await okKlick(page); await okKlick(page); await page.waitForTimeout(400);
  let pt = await tab(page, "schueler_punkte");
  await pruefe("D3", "Vergeben „Theorie bestanden“: Zeile +50, Grund, Wer gesetzt", () => (pt.length === 1 && pt[0].art === "vergeben" && pt[0].punkte === 50 && pt[0].grund === "Theorie bestanden" && pt[0].bearbeiter ? null : JSON.stringify(pt)));
  // Einlösen: zu wenig
  await page.click(`[data-spunkte="${sid}"]`); await page.waitForTimeout(500);
  await pruefe("D4", "Dialog zeigt Kontostand 50 und den Verlauf mit Wer/Wann", () => page.evaluate(() => { const t = document.querySelector("dialog[open]").textContent.replace(/\s+/g, " "); return [!/50\s*Punkte/.test(t) && "Stand", !/Theorie bestanden/.test(t) && "Verlauf", !/Paula Muster/.test(t) && "Wer"].filter(Boolean); }));
  await page.check("dialog[open] input[name=aktion][value=einloesen]");
  await page.selectOption("dialog[open] select[name=eintrag]", "0"); // Gratis Fahrstunde (100)
  await okKlick(page); await okKlick(page); await page.waitForTimeout(400);
  pt = await tab(page, "schueler_punkte");
  await pruefe("D5", "Einlösen über den Kontostand: abgelehnt, Hinweis, nichts gebucht", async () => [pt.length !== 1 && "Zeilen: " + pt.length, !/Nicht genug Punkte/.test(await toastText(page)) && "Hinweis: " + (await toastText(page))].filter(Boolean));
  await schliesse(page);
  // aufstocken und einlösen (Prämie 2 = 25)
  await page.click(`[data-spunkte="${sid}"]`); await page.waitForTimeout(500);
  await page.check("dialog[open] input[name=aktion][value=einloesen]");
  await page.selectOption("dialog[open] select[name=eintrag]", "1"); // Kleines Geschenk (25)
  await okKlick(page); await okKlick(page); await page.waitForTimeout(400);
  pt = await tab(page, "schueler_punkte");
  await pruefe("D6", "Einlösen mit genug Punkten: Zeile −25, Stand 25", () => (pt.length === 2 && pt[1].art === "einloesen" && pt[1].punkte === -25 && pt.reduce((a, x) => a + x.punkte, 0) === 25 ? null : JSON.stringify(pt)));
  // Eigene Buchung (Gegenbuchung)
  await page.click(`[data-spunkte="${sid}"]`); await page.waitForTimeout(500);
  await page.check("dialog[open] input[name=aktion][value=frei]");
  await page.fill("dialog[open] input[name=anzahl]", "5"); await page.fill("dialog[open] input[name=grund]", "Korrektur: Tippfehler");
  await page.check("dialog[open] input[name=richtung][value=einloesen]");
  await okKlick(page); await okKlick(page); await page.waitForTimeout(400);
  pt = await tab(page, "schueler_punkte");
  await pruefe("D7", "Eigene Buchung (abziehen): −5 mit Grund, Stand 20", () => (pt.length === 3 && pt[2].punkte === -5 && pt[2].grund === "Korrektur: Tippfehler" && pt.reduce((a, x) => a + x.punkte, 0) === 20 ? null : JSON.stringify(pt)));
  // Verschenken: erst Schalter
  await page.goto(basis + "buero.html#einstellungen?thema=punkte"); await page.waitForSelector("#punkteEinst", { timeout: 4000 });
  await page.check("#punkteEinst [name=verschenken]");
  await page.click("#punkteEinst button[type=submit]"); await page.waitForTimeout(400);
  await pruefe("V1", "Verschenken eingeschaltet (ohne Rückfrage nötig, System war schon an)", async () => ((await einst(page, "punkte.system")).verschenken === true ? null : "nicht gespeichert"));
  await page.goto(basis + "buero.html#schueler"); await page.waitForTimeout(700);
  await page.click(`[data-spunkte="${sid}"]`); await page.waitForTimeout(500);
  await page.check("dialog[open] input[name=aktion][value=verschenken]");
  const an = await page.evaluate((sid) => [...document.querySelectorAll("dialog[open] select[name=an] option")].map((o) => o.value).filter((v) => v && v !== sid), sid);
  await page.selectOption("dialog[open] select[name=an]", an[0]);
  await page.fill("dialog[open] input[name=anzahl]", "8");
  await okKlick(page); await okKlick(page); await page.waitForTimeout(400);
  pt = await tab(page, "schueler_punkte");
  const paar = pt.filter((x) => /verschenkt/.test(x.art));
  await pruefe("V2", "Verschenken: zwei Zeilen (−8 beim Geber, +8 beim Empfänger), Grund „Geschenk“", () => (paar.length === 2 && paar.some((x) => x.art === "verschenkt_ab" && x.punkte === -8 && x.schueler_id === sid && x.gegen_schueler_id === an[0]) && paar.some((x) => x.art === "verschenkt_an" && x.punkte === 8 && x.schueler_id === an[0]) && paar[0].grund === "Geschenk" ? null : JSON.stringify(paar)));
  await page.click(`[data-spunkte="${sid}"]`); await page.waitForTimeout(500);
  await page.check("dialog[open] input[name=aktion][value=verschenken]");
  await page.selectOption("dialog[open] select[name=an]", an[0]); await page.fill("dialog[open] input[name=anzahl]", "500");
  await okKlick(page); await okKlick(page); await page.waitForTimeout(400);
  pt = await tab(page, "schueler_punkte");
  await pruefe("V3", "Verschenken über den Kontostand: abgelehnt, keine neue Zeile", async () => [pt.length !== 5 && "Zeilen: " + pt.length, !/Nicht genug Punkte/.test(await toastText(page)) && "Hinweis: " + (await toastText(page))].filter(Boolean));
  await pruefe("V4", "Punkte-Fenster: nicht seitlich wischbar", () => wischbar(page));
  await schliesse(page);
  await pruefe("V5", "keine JS-Fehler (Büro)", () => (konsole.length ? konsole.slice(0, 3).join(" | ") : null));
  // Ausschalten
  await page.goto(basis + "buero.html#einstellungen?thema=punkte"); await page.waitForSelector("#punkteEinst", { timeout: 4000 });
  await page.uncheck("#punkteEinst [name=aktiv]");
  await page.click("#punkteEinst button[type=submit]"); await page.waitForTimeout(400);
  await page.goto(basis + "buero.html#schueler"); await page.waitForTimeout(700);
  await pruefe("A1", "System aus: Knopf „Punkte“ wieder weg, Buchungen bleiben erhalten", async () => [await page.evaluate(() => !!document.querySelector("[data-spunkte]") && "Knopf da"), (await tab(page, "schueler_punkte")).length !== 5 && "Buchungen weg"].filter(Boolean));
  await ctx.close();
  // 1024 px
  const b2 = await oeffne("bu-1", "#einstellungen?thema=punkte", 1024);
  await b2.page.waitForSelector("#punkteEinst", { timeout: 4000 });
  await pruefe("W1", "1024 px: nicht seitlich wischbar", () => wischbar(b2.page));
  await b2.ctx.close();
  // Fahrlehrer: kein Zugang
  const f = await oeffne("fl-1", "#einstellungen?thema=punkte");
  await pruefe("F1", "Fahrlehrer: kein Thema Punktesystem im Büro", () => f.page.evaluate(() => (document.getElementById("punkteEinst") || document.querySelector("[data-spunkte]") ? "sichtbar" : null)));
  await f.ctx.close();

  // ======================= App (Schülerakte, Handy) =======================
  const appServer = createServer(async (req, res) => {
    try {
      const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
      const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
      res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => appServer.listen(0, "127.0.0.1", ok));
  const ab = `http://127.0.0.1:${appServer.address().port}/`;
  const actx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const apage = await actx.newPage();
  const jsF = []; apage.on("pageerror", (e) => jsF.push(e.message));
  apage.on("dialog", (d) => d.accept());
  await apage.route("**/*", (r) => (r.request().url().startsWith(ab) ? r.continue() : r.abort()));
  await apage.goto(ab + "index.html", { waitUntil: "load", timeout: 20000 }); await apage.waitForTimeout(600);
  const erg = await apage.evaluate(async () => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students = ["a1", "a2"].map((id) => ({ id, name: id === "a1" ? "Anna Erfunden" : "Arne Erfunden", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }));
    DB.lessons = []; DB.termine = []; DB.exams = []; save();
    const FS = "fs-test";
    // Attrappe der Datenbank: Einstellungen, Buchungen (nur Schüler a1 gehört dem Fahrlehrer), Kontostand
    const db = { einst: [], punkte: [], fehler: null, aufrufe: [] };
    const setze = (k, w) => { db.einst = db.einst.filter((x) => x.schluessel !== k); db.einst.push({ schluessel: k, wert: w }); };
    const stand = (sid) => db.punkte.filter((x) => x.schueler_id === sid).reduce((a, x) => a + x.punkte, 0);
    const mock = { rpc: async (n, a) => {
        if (n !== "punkte_kontostand") return { data: null, error: { message: "rpc fehlt" } };
        if (db.fehler === "netz") return { data: null, error: { message: "Failed to fetch" } };
        if (a.p_schueler !== "a1") return { data: null, error: { message: "Keine Berechtigung" } };
        return { data: stand(a.p_schueler), error: null }; },
      from: (tab) => { const a = { eq: {}, ins: null }; const o = new Proxy({}, { get: (_, k) => {
        if (k === "then") return (f, r) => Promise.resolve((() => {
          if (tab === "fahrschule_einstellungen") return { data: db.einst, error: null };
          if (tab === "schueler_punkte" && a.ins) {
            const z = a.ins; db.aufrufe.push(z);
            if (stand(z.schueler_id) - (z.art === "einloesen" ? z.punkte : 0) < 0) return { data: null, error: { message: "Nicht genug Punkte: Kontostand " + stand(z.schueler_id) + ", gebraucht " + z.punkte } };
            db.punkte.unshift({ art: z.art, punkte: z.art === "einloesen" ? -z.punkte : z.punkte, grund: z.grund, schueler_id: z.schueler_id, erstellt_am: new Date().toISOString(), bearbeiter: "Franz Fahrlehrer" });
            return { data: null, error: null };
          }
          if (tab === "schueler_punkte") return { data: db.punkte.filter((x) => x.schueler_id === a.eq.schueler_id).slice(0, 5), error: null };
          return { data: [], error: null };
        })()).then(f, r);
        return (...x) => { if (k === "eq") a.eq[x[0]] = x[1]; if (k === "insert") a.ins = x[0]; return o; }; } }); return o; } };
    window.getSupa = () => mock;
    const warte = (ms) => new Promise((r) => setTimeout(r, ms));
    const karte = () => (document.querySelector(".punkte-karte") || {}).textContent || "";
    const aus = {};
    // 1. Einstellungen noch nicht geladen / System aus → keine Karte
    await KE.lade(mock, FS); // leer
    routeDetail("a1"); await warte(300); aus.k0 = !!document.querySelector(".punkte-karte");
    setze("punkte.system", { aktiv: false, verschenken: false, bedingungen: "" }); await KE.lade(mock, FS);
    routeDetail("a1"); await warte(300); aus.kAus = !!document.querySelector(".punkte-karte");
    // 2. an, Listen angelegt
    setze("punkte.system", { aktiv: true, verschenken: true, bedingungen: "Nur zum Test." });
    setze("punkte.regeln", { liste: [{ id: "r1", name: "Pünktlich erschienen", punkte: 10 }, { id: "r2", name: "Theorie bestanden", punkte: 50 }] });
    setze("punkte.praemien", { liste: [{ id: "p1", name: "Kleines Geschenk", punkte: 20 }, { id: "p2", name: "Gratis Fahrstunde", punkte: 100 }] });
    await KE.lade(mock, FS);
    routeDetail("a1"); aus.kLaden = karte(); await warte(400); aus.kNull = karte();
    // 3. Geben
    document.querySelector(".punkte-karte button").click(); await warte(200);
    const sh = document.getElementById("sheet");
    aus.sheetGeben = sh.textContent.replace(/\s+/g, " "); aus.wahlHoehe = Math.min(...[...sh.querySelectorAll(".punkte-wahl")].map((b) => b.getBoundingClientRect().height));
    sh.querySelectorAll(".punkte-wahl")[1].click(); await warte(500);   // Theorie bestanden (50)
    aus.kGegeben = karte(); aus.zeilen1 = db.punkte.length;
    // 4. Einlösen zu viel (100) → Hinweis, nichts gebucht
    document.querySelectorAll(".punkte-karte button")[1].click(); await warte(200);
    document.getElementById("sheet").querySelectorAll(".punkte-wahl")[1].click(); await warte(400);
    aus.toastZuViel = (document.getElementById("toast") || {}).textContent; aus.zeilen2 = db.punkte.length; closeSheet();
    // 5. Einlösen 20
    document.querySelectorAll(".punkte-karte button")[1].click(); await warte(200);
    document.getElementById("sheet").querySelectorAll(".punkte-wahl")[0].click(); await warte(500);
    aus.kEingeloest = karte(); aus.zeilen3 = db.punkte.length;
    aus.breit = document.documentElement.scrollWidth <= innerWidth + 1;
    aus.knopfH = Math.min(...[...document.querySelectorAll(".punkte-karte button")].map((b) => b.getBoundingClientRect().height));
    // 6. fremder Schüler: keine Karte
    routeDetail("a2"); await warte(500); aus.kFremd = !!document.querySelector(".punkte-karte");
    // 7. Netzfehler: Hinweis statt Absturz
    delete _punkte.a1; db.fehler = "netz"; routeDetail("a1"); await warte(500); aus.kNetz = karte(); db.fehler = null;
    // 8. ohne Fahrschule (KE leer) → keine Karte
    KE.leeren(); routeDetail("a1"); await warte(300); aus.kOhneFs = !!document.querySelector(".punkte-karte");
    return aus;
  });
  await pruefe("P1", "App: ohne Einstellungen und bei ausgeschaltetem System keine Karte", () => [erg.k0 && "Karte ohne Einstellungen", erg.kAus && "Karte bei System aus"].filter(Boolean));
  await pruefe("P2", "App: System an → Karte „Punkte“ lädt, danach „0 Punkte“", () => [!/Punkte werden geladen/.test(erg.kLaden) && "kein Ladehinweis: " + erg.kLaden, !/0 Punkte/.test(erg.kNull) && "Stand: " + erg.kNull].filter(Boolean));
  await pruefe("P3", "App: „Punkte geben“ zeigt die Liste der Fahrschule (Namen und Punkte), Bedingungen, Knöpfe ≥ 44 px", () => [!/Pünktlich erschienen\s*10/.test(erg.sheetGeben) && "Liste: " + erg.sheetGeben, !/Theorie bestanden\s*50/.test(erg.sheetGeben) && "Liste 2", !/Nur zum Test\./.test(erg.sheetGeben) && "Bedingungen", erg.wahlHoehe < 43.5 && "Knopf nur " + erg.wahlHoehe].filter(Boolean));
  await pruefe("P4", "App: 50 gutgeschrieben → Karte zeigt 50 Punkte und den Verlauf", () => [!/50 Punkte/.test(erg.kGegeben) && "Stand: " + erg.kGegeben, !/Theorie bestanden/.test(erg.kGegeben) && "Verlauf", erg.zeilen1 !== 1 && "Zeilen " + erg.zeilen1].filter(Boolean));
  await pruefe("P5", "App: Einlösen über den Kontostand → Hinweis „Nicht genug Punkte“, nichts gebucht", () => [!/Nicht genug Punkte: 50 vorhanden, 100 nötig/.test(erg.toastZuViel || "") && "Hinweis: " + erg.toastZuViel, erg.zeilen2 !== 1 && "Zeilen " + erg.zeilen2].filter(Boolean));
  await pruefe("P6", "App: Einlösen „Kleines Geschenk“ (20) → Stand 30, Verlauf mit −20", () => [!/30 Punkte/.test(erg.kEingeloest) && "Stand: " + erg.kEingeloest, !/−20/.test(erg.kEingeloest) && "kein −20", erg.zeilen3 !== 2 && "Zeilen " + erg.zeilen3].filter(Boolean));
  await pruefe("P7", "App: Karten-Knöpfe ≥ 44 px, nicht seitlich wischbar (360 px)", () => [erg.knopfH < 43.5 && "Knopf " + erg.knopfH, !erg.breit && "wischbar"].filter(Boolean));
  await pruefe("P8", "App: Schüler, der nicht dem Fahrlehrer gehört → keine Karte", () => (erg.kFremd ? "Karte sichtbar" : null));
  await pruefe("P9", "App: Netzfehler → Hinweis „gerade nicht abrufbar“", () => (/gerade nicht abrufbar/.test(erg.kNetz) ? null : "Text: " + erg.kNetz));
  await pruefe("P10", "App: ohne Fahrschule (keine Einstellungen) keine Karte", () => (erg.kOhneFs ? "Karte sichtbar" : null));
  await pruefe("P11", "keine JS-Fehler (App)", () => (jsF.length ? jsF.slice(0, 3).join(" | ") : null));
  await actx.close(); appServer.close();
} catch (e) { fehlerZahl++; console.log("FEHLER  Test-Ausnahme: " + (e && e.stack || e)); }
finally { await browser.close(); server.close(); }
console.log(`\nPunkte-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
