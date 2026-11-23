// Test K9 Preisliste im Büro (buero-preise.js), echter Browser mit erfundenen Daten (Attrappe).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/preisliste-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const d0 = new Date(); const HEUTE = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
function tag(n) { const d = new Date(HEUTE + "T12:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}); // wie die anderen Tests: in GitHub ohne festen Pfad
let ok = 0, schlecht = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { schlecht++; console.log("FEHLER  " + name + (info ? " · " + info : "")); } }
const PIN = { "Paula Muster": "7352" };

async function oeffne({ nutzer, hash = "#preise", vorbereiten, breite = 1366 }) {
  const daten = bauDaten(HEUTE);
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: 860 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s };
    if (v) (new Function("F", v))(window.__FAKE);
  }, [daten, session, vorbereiten ? vorbereiten.toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "") : ""]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
  if (frage) {
    await page.click(`#werListe button:has-text("Paula Muster")`);
    await page.keyboard.type(PIN["Paula Muster"], { delay: 20 });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => { const a = document.getElementById("ansicht"); return a && !/Daten werden geladen/.test(a.textContent); }, null, { timeout: 8000 }).catch(() => {});
  if (process.env.PR_DEBUG) console.log("KONSOLE", konsole.join(" | "));
  return { page, ctx, konsole };
}
const FS = "fs-1";
function preisZeilen(F) {
  // Reaktivierung: alt 240 (vor allem), ab vorgestern 260 (Super-Admin hat rückdatiert), ab in 10 Tagen 280
  F.tabellen.fahrschule_preise = [
    { id: "p1", fahrschule_id: F.tabellen.fahrschulen[0].id, art: "reaktivierung", klasse: null, bezeichnung: "Reaktivierung", einheit: "pauschal", betrag_cent: 26000, gueltig_ab: "__VOR2", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" },
    { id: "p2", fahrschule_id: F.tabellen.fahrschulen[0].id, art: "reaktivierung", klasse: null, bezeichnung: "Reaktivierung", einheit: "pauschal", betrag_cent: 28000, gueltig_ab: "__IN10", angelegt_von: "ad-1", angelegt_am: "2026-01-02T10:00:00Z" },
    { id: "p3", fahrschule_id: F.tabellen.fahrschulen[0].id, art: "fahrstunde", klasse: "B", bezeichnung: "Übungsfahrstunde", einheit: "45min", betrag_cent: 6500, gueltig_ab: "__VOR2", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" },
    { id: "p4", fahrschule_id: F.tabellen.fahrschulen[0].id, art: "fahrstunde", klasse: "B", bezeichnung: "Übungsfahrstunde", einheit: "45min", betrag_cent: 6000, gueltig_ab: "__VOR2", angelegt_von: "ad-1", angelegt_am: "2026-01-01T09:00:00Z" },
  ];
}
const vorb = (vor2, in10) => new Function("F", preisZeilen.toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "").replaceAll("__VOR2", vor2).replaceAll("__IN10", in10));
const mitPreisen = vorb(tag(-2), tag(10));

try {
  // P1 Leitung sieht die Seite, leere Liste, Knöpfe
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1" });
    const txt = await page.locator("#ansicht").innerText();
    pruefe("P1a Seite „Preisliste“ in der Leiste (Gruppe Geld)", await page.locator('nav a[href="#preise"]').count() === 1);
    pruefe("P1b leer: Hinweis „Noch keine Preise“", /Noch keine Preise eingetragen/.test(txt), txt.slice(0, 200));
    pruefe("P1c Leitung hat „Neuer Preis“", await page.locator("#prNeu").count() === 1);
    // P2 neuen Preis anlegen
    await page.click("#prNeu");
    const dlg = page.locator("dialog[open]").last();
    await dlg.locator("select[name=art]").selectOption("fahrstunde");
    pruefe("P2a Art Fahrstunde schlägt Einheit „je 45 Minuten“ und Bezeichnung vor",
      (await dlg.locator("select[name=einheit]").inputValue()) === "45min" && (await dlg.locator("input[name=bezeichnung]").inputValue()) === "Übungsfahrstunde");
    await dlg.locator("select[name=klasse]").selectOption("B");
    await dlg.locator("input[name=betrag]").fill("65,50".replace(",", "."));
    await dlg.locator("footer button[value=ok]").click();
    await page.waitForTimeout(300);
    const zeilen = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_preise || []);
    pruefe("P2b gespeichert: eine Zeile, 6550 Cent, Klasse B, gültig ab heute", zeilen.length === 1 && zeilen[0].betrag_cent === 6550 && zeilen[0].klasse === "B" && zeilen[0].gueltig_ab === HEUTE, JSON.stringify(zeilen));
    const t2 = await page.locator("#ansicht").innerText();
    pruefe("P2c Liste zeigt 65,50 € unter „Übungsfahrstunde“", /Übungsfahrstunde[\s\S]*65,50\s*€/.test(t2), t2.slice(0, 300));
    // P3 doppelt anlegen geht nicht
    await page.click("#prNeu");
    const d3 = page.locator("dialog[open]").last();
    await d3.locator("select[name=art]").selectOption("fahrstunde");
    await d3.locator("select[name=klasse]").selectOption("B");
    await d3.locator("input[name=betrag]").fill("70");
    await d3.locator("footer button[value=ok]").click();
    await page.waitForTimeout(300);
    pruefe("P3 gleichen Preis nochmal anlegen → abgelehnt, Fenster bleibt offen", (await page.evaluate(() => window.__FAKE.tabellen.fahrschule_preise.length)) === 1 && await page.locator("dialog[open]").count() === 1);
    // Fenster mit Eingaben schließen: ✕ → „Eingaben verwerfen?“ → Ja
    await page.locator("dialog[open]").last().locator("[data-schliessen]").first().click(); await page.waitForTimeout(200);
    if (await page.locator("dialog[open]").count()) { await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await page.waitForTimeout(200); }
    pruefe("P3b Fenster lässt sich schließen", await page.locator("dialog[open]").count() === 0);
    // P4 ändern ab später: alte Zeile bleibt, neue Zeile
    await page.locator("[data-pr-aendern]").first().click();
    const d4 = page.locator("dialog[open]").last();
    await d4.locator("input[name=betrag]").fill("70");
    await d4.locator("input[name=ab]").fill(tag(7));
    await d4.locator("footer button[value=ok]").click();
    await page.waitForTimeout(300);
    const z4 = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_preise);
    pruefe("P4a Ändern legt neue Zeile an, alte bleibt (Verlauf)", z4.length === 2 && z4[0].betrag_cent === 6550 && z4[1].betrag_cent === 7000 && z4[1].gueltig_ab === tag(7));
    const t4 = await page.locator("#ansicht").innerText();
    pruefe("P4b heute weiter 65,50 €, „Geplant“ zeigt 70,00 €", /65,50\s*€/.test(t4) && /ab \d\d\.\d\d\.\d{4}: 70,00\s*€/.test(t4), t4.slice(0, 400));
    // P5 Rückdatieren als Leitung abgelehnt
    await page.locator("[data-pr-aendern]").first().click();
    const d5 = page.locator("dialog[open]").last();
    await d5.locator("input[name=betrag]").fill("50");
    await d5.evaluate((el) => { const i = el.querySelector("input[name=ab]"); i.removeAttribute("min"); });
    await d5.locator("input[name=ab]").fill(tag(-3));
    await d5.locator("footer button[value=ok]").click();
    await page.waitForTimeout(300);
    pruefe("P5 Leitung: „gültig ab“ in der Vergangenheit → nicht gespeichert", (await page.evaluate(() => window.__FAKE.tabellen.fahrschule_preise.length)) === 2);
    pruefe("P1d keine Fehler in der Konsole", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // P6 Büro sieht und darf ändern (🗣 Serband)
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: mitPreisen });
    pruefe("P6a Büro: „Neuer Preis“ und „Ändern“ da", await page.locator("#prNeu").count() === 1 && await page.locator("[data-pr-aendern]").count() >= 1);
    const t = await page.locator("#ansicht").innerText();
    pruefe("P6b gleicher Tag zwei Zeilen: die zuletzt eingetragene gilt (65,00 € statt 60,00 €)", /Übungsfahrstunde[\s\S]*65,00\s*€/.test(t) && !/60,00\s*€\s*\n?\s*je 45/.test(t), t.slice(0, 500));
    pruefe("P6c Reaktivierung heute 260 €, geplant 280 €", /260,00\s*€/.test(t) && /280,00\s*€/.test(t));
    // P7 Export
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#prJson")]);
    const pfad = await dl.path();
    const j = JSON.parse(await readFile(pfad, "utf8"));
    const reakt = j.preise.filter((r) => r.art === "reaktivierung");
    const fahr = j.preise.filter((r) => r.art === "fahrstunde");
    pruefe("P7a JSON: Format, Version, Stichtag", j.format === "fahrlehrer-kompass/preisliste" && j.version === 1 && j.stichtag === HEUTE);
    pruefe("P7b Reaktivierung zwei Stände mit „gültig bis“ = Tag vor dem nächsten", reakt.length === 2 && reakt[0].betrag === 260 && reakt[0].gueltig_bis === tag(9) && reakt[1].gueltig_bis === null && reakt[0].gilt_heute === true && reakt[1].gilt_heute === false, JSON.stringify(reakt));
    pruefe("P7c gleicher Tag: nur die zuletzt eingetragene Zeile in der Ausgabe", fahr.length === 1 && fahr[0].betrag === 65, JSON.stringify(fahr));
    const [dl2] = await Promise.all([page.waitForEvent("download"), page.click("#prCsv")]);
    const csv = await readFile(await dl2.path(), "utf8");
    pruefe("P7d CSV mit Semikolon, Komma-Beträgen, Kopfzeile", csv.startsWith("﻿art;art_name;klasse") && /;260,00;nein;/.test(csv), csv.slice(0, 200));
    // P8 Reaktivierung in den Fristen nimmt die Preisliste
    await page.goto(basis + "buero.html#fristen"); await page.waitForTimeout(600);
    const f = await page.locator("#ansicht").innerText();
    pruefe("P8a Fristen: „Reaktivierung heute 260 €“ mit Verweis auf die Preisliste", /Reaktivierung heute:\s*260\s*€/.test(f) && await page.locator('#ansicht a[href="#preise"]').count() >= 1, f.slice(-600));
    const betrag = await page.evaluate(() => [reaktBetrag(), reaktBetrag({ vertrag_am: "2000-01-01" }), reaktBetrag({ vertrag_am: new Date(Date.now() + 40 * 864e5).toISOString().slice(0, 10) })]);
    pruefe("P8b alter Vertrag (vor der Preisliste) → alter Betrag 240; heute 260; Vertrag nach Erhöhung 280", betrag[0] === 260 && betrag[1] === 240 && betrag[2] === 280, JSON.stringify(betrag));
    // P6e Büro ändert: Verlauf zeigt die PIN-Person
    await page.goto(basis + "buero.html#preise"); await page.waitForTimeout(600);
    await page.locator("[data-pr-aendern]").first().click();
    const d6 = page.locator("dialog[open]").last();
    await d6.locator("input[name=betrag]").fill("99");
    await d6.locator("input[name=ab]").fill(tag(20));
    await d6.locator("footer button[value=ok]").click();
    await page.waitForTimeout(300);
    const neu = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_preise.slice(-1)[0]);
    pruefe("P6e Büro ändert: Zeile mit PIN-Person, Verlauf zeigt „von Paula Muster“", neu && neu.bearbeiter === "Paula Muster" && /von Paula Muster/.test(await page.locator("#ansicht").textContent()), JSON.stringify(neu));
    pruefe("P6d keine Fehler in der Konsole", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // P9 alte Datenbank: Tabelle fehlt
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: function () { F.fehler = { fahrschule_preise: 'relation "public.fahrschule_preise" does not exist' }; } });
    const t = await page.locator("#ansicht").innerText();
    pruefe("P9a ohne Tabelle: Hinweis statt Fehler", /noch nicht eingerichtet/.test(t), t.slice(0, 200));
    await page.goto(basis + "buero.html#fristen"); await page.waitForTimeout(600);
    pruefe("P9b Fristen: altes Feld „Standardbetrag Reaktivierung“ bleibt, Betrag 240", await page.evaluate(() => reaktBetrag()) === 240 && /Standardbetrag Reaktivierung/.test(await page.locator("#ansicht").innerText()));
    pruefe("P9c keine Fehler in der Konsole (außer dem erwarteten Ladefehler)", konsole.filter((k) => !/fahrschule_preise/.test(k)).length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // P10 Handybreite: nichts seitlich wischbar
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: mitPreisen, breite: 390 });
    const breit = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    pruefe("P10 390 px: nichts seitlich wischbar", breit <= 1, "über " + breit + " px");
    await ctx.close();
  }
  // P11 Migration (statisch): kein update, Schutz-Trigger, Rückdatieren nur Super-Admin
  {
    const sql = await readFile(join(ROOT, "supabase/migrations/20261123_k9_01_preisliste.sql"), "utf8");
    pruefe("P11a keine update-Regel und kein update-Recht", !/for update/i.test(sql) && !/grant[^;]*update/i.test(sql));
    pruefe("P11b Anlegen nur Büro/Leitung/Super-Admin", /Preise anlegen Buero Leitung[\s\S]*is_fahrschule_admin\(auth.uid\(\)\) or is_buero/.test(sql));
    pruefe("P11c Rückdatieren nur Super-Admin", /gueltig_ab < \(now\(\) at time zone 'Europe\/Berlin'\)::date and not coalesce\(is_super_admin/.test(sql));
    pruefe("P11d Rückweg vorhanden", (await readFile(join(ROOT, "supabase/rueckweg/20261123_k9_rueckweg.sql"), "utf8")).includes("drop table if exists public.fahrschule_preise"));
  }
} catch (e) { schlecht++; console.log("FEHLER  Test-Ausnahme: " + (e && e.stack || e)); }
await browser.close(); server.close();
console.log(`\n${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
