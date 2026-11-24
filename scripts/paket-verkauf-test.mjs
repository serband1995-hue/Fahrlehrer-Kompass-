// Test Werkstatt 13 Paket verkaufen (Schritt 1, Teil B): Büro-Schülerfenster „Normale Anmeldung“ oder Paket, Wechsel, Storno, Rückgängig;
// App zeigt das verkaufte Paket nur lesend. Echter Browser mit erfundenen Daten (Attrappe), keine Datenbank.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/paket-verkauf-test.mjs
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

async function oeffne({ nutzer, hash = "#schueler", vorbereiten, breite = 1366, hoehe = 860 }) {
  const daten = bauDaten(HEUTE);
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, acceptDownloads: true });
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
  if (process.env.BK_DEBUG) console.log("KONSOLE", konsole.join(" | "));
  return { page, ctx, konsole };
}

// Preise (erfunden): Fahrstunde B 65 €, Grundbetrag B 350 €, Lernapp ohne Klasse 79 €; Überland B 80 €
function preise(F) {
  const fs = F.tabellen.fahrschulen[0].id, a = "2026-01-01T10:00:00Z";
  F.tabellen.fahrschule_preise = [
    { id: "p3", fahrschule_id: fs, art: "fahrstunde", klasse: "B", bezeichnung: "Übungsfahrstunde", einheit: "45min", betrag_cent: 6500, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: a },
    { id: "p5", fahrschule_id: fs, art: "grundbetrag", klasse: "B", bezeichnung: "Grundbetrag", einheit: "pauschal", betrag_cent: 35000, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: a },
    { id: "p6", fahrschule_id: fs, art: "lernapp", klasse: null, bezeichnung: "Fahr-Akademie Lernapp", einheit: "pauschal", betrag_cent: 7900, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: a },
    { id: "p7", fahrschule_id: fs, art: "sonderfahrt", klasse: "B", bezeichnung: "Autobahnfahrt", einheit: "45min", betrag_cent: 8000, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: a },
  ];
}
const altDb = function () { F.tabellen.fahrschule_pakete.forEach((p) => { delete p.posten; delete p.klasse; delete p.aktualisiert_am; delete p.bearbeiter; }); };
const dlgSel = "dialog[open]";
async function chip(page, text) { await page.locator(dlgSel).last().locator(`[data-bk-dazu]`, { hasText: text }).first().click(); await page.waitForTimeout(80); }
async function gesamt(page) { return (await page.locator(dlgSel).last().locator("[data-bk-gesamt]").innerText()).replace(/\s/g, " ").trim(); }
const pakete = (page) => page.evaluate(() => window.__FAKE.tabellen.fahrschule_pakete);

const S1 = "s1";
const sp = (page) => page.evaluate(() => window.__FAKE.tabellen.schueler_pakete || []);
const rpcs = (page, n) => page.evaluate((n) => window.__FAKE.log.filter((x) => x.rpc === n).map((x) => x.args), n);
const schueler = (page, id) => page.evaluate((id) => window.__FAKE.tabellen.schueler.find((s) => s.id === id), id);
async function oeffneAkte(page, id) { await page.evaluate((id) => schuelerDialog(id), id); await page.waitForTimeout(150); return page.locator(dlgSel).last(); }
async function waehle(d, text) {
  const v = await d.locator("[data-bk-wahl] option").evaluateAll((o, t) => { const x = o.find((y) => y.value.startsWith("v:") && y.textContent.includes(t)) || o.find((y) => y.textContent.includes(t)); return x ? x.value : null; }, text);
  if (v == null) throw new Error("Option fehlt: " + text);
  await d.locator("[data-bk-wahl]").selectOption(v); await d.page().waitForTimeout(100);
}
const mitVerkauf = function () {
  preise(F);
  const fs = F.tabellen.fahrschulen[0].id;
  F.tabellen.fahrschule_pakete.push({ id: "p-einzel", fahrschule_id: fs, name: "Einzelabrechnung (ohne Paket)", reihenfolge: 3, aktiv: true, klasse: null, posten: [] });
  F.tabellen.fahrschule_pakete.push({ id: "p-2", fahrschule_id: fs, name: "Boost-Paket 2", reihenfolge: 2, aktiv: true, klasse: "B", posten: [{ art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 30, preis_cent_fest: 6000 }] });
  F.tabellen.schueler_pakete = [];
};
const mitVerkauftem = function () {
  F.tabellen.schueler_pakete.push({ id: "sp-alt", fahrschule_id: F.tabellen.fahrschulen[0].id, schueler_id: "s1", vorlage_id: "p-1", name: "Boost-Paket 1", klasse: "B",
    posten: [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent: 30000 }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6000 }],
    gesamt_cent: 150000, verkauft_am: "2026-10-01T10:00:00Z", verkauft_von: "bu-1", bearbeiter: "Mia Muster", storniert_am: null });
  F.tabellen.schueler.find((s) => s.id === "s1").paket_id = "p-1";
};
// Vorbereitungen als eine Funktion (preise + Zusatz)
function vb(zusatz) {
  const p = preise.toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "");
  const m = mitVerkauf.toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "").replace("preise(F);", "{" + p + "}");
  const z = zusatz ? zusatz.toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "") : "";
  return new Function("F", "{" + m + "}\n{" + z + "}");
}

try {
  // V1 Neuer Schüler mit Paket aus der Vorlage, Preise werden festgeschrieben, Rückgängig storniert
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: vb() });
    await page.evaluate(() => schuelerDialog(null)); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    pruefe("V1a Schüler anlegen: „Anmeldung“ statt alter Paket-Auswahl, Vorgabe „Normale Anmeldung“", await d.locator('select[name="paket_id"]').count() === 0 && /Normale Anmeldung/.test(await d.locator("[data-bk-wahl] option:checked").innerText()));
    const opt = await d.locator("[data-bk-wahl] option").allInnerTexts();
    pruefe("V1b Auswahl: Vorlagen in Reihenfolge, ohne „Einzelabrechnung“, ohne archivierte", !opt.some((o) => /Einzelabrechnung/.test(o)) && opt.findIndex((o) => /Boost-Paket 1/.test(o)) < opt.findIndex((o) => /Boost-Paket 2/.test(o)), opt.join(" | "));
    await d.locator('input[name="name"]').fill("Erika Erfunden");
    await waehle(d, "Boost-Paket 1");
    const info = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V1c Info: Posten mit Preisen aus der Liste und Gesamt 1.650,00 €", /20 × Übungsstunden/.test(info) && /1\.300,00/.test(info) && /1\.650,00\s*€/.test(info) && /beim Speichern verkauft/.test(info), info);
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(400);
    const neu = (await page.evaluate(() => window.__FAKE.tabellen.schueler)).find((s) => s.name === "Erika Erfunden");
    const r = await rpcs(page, "schueler_paket_verkaufen");
    pruefe("V1d gespeichert: ein Verkauf mit festen Preisen in Cent", !!neu && r.length === 1 && r[0].p_schueler === neu.id && r[0].p_vorlage === "p-1"
      && JSON.stringify(r[0].p_posten) === JSON.stringify([{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent: 35000 }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6500 }]), JSON.stringify(r));
    pruefe("V1e Schüler zeigt auf die Vorlage, Paket aktiv, Gesamt 165000 Cent", !!neu && neu.paket_id === "p-1" && (await sp(page)).filter((x) => !x.storniert_am && x.schueler_id === neu.id && x.gesamt_cent === 165000).length === 1);
    pruefe("V1f kein Fenster offen, Hinweis „verkauft“ mit Rückgängig", await page.locator(dlgSel).count() === 0 && /verkauft/.test(await page.locator(".toast-undo").innerText()));
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(300);
    pruefe("V1g Rückgängig: Paket storniert, Schüler ohne Paket", (await sp(page)).filter((x) => !x.storniert_am).length === 0 && (await schueler(page, neu.id)).paket_id === null);
    pruefe("V1h keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // V2 Preis fehlt: Speichern gesperrt, „Anpassen“ im Baukasten, eigener Preis wird verkauft
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: vb(function () { F.tabellen.fahrschule_preise = F.tabellen.fahrschule_preise.filter((p) => p.art !== "grundbetrag"); }) });
    const d = await oeffneAkte(page, S1);
    await waehle(d, "Boost-Paket 1");
    pruefe("V2a Hinweis „Preis fehlt bei: Grundbetrag“", /Preis fehlt bei: Grundbetrag/.test(await d.locator("[data-bk-anm-info]").innerText()));
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(250);
    pruefe("V2b Speichern gesperrt (kein Verkauf, Fenster bleibt offen)", (await rpcs(page, "schueler_paket_verkaufen")).length === 0 && await page.locator(dlgSel).count() === 1);
    await d.locator("[data-bk-anpassen]").click(); await page.waitForTimeout(150);
    const e = page.locator(dlgSel).last();
    pruefe("V2c Baukasten öffnet sich mit „Übernehmen“", /Übernehmen/.test(await e.locator("button[value=ok]").innerText()) && await e.locator(".bk-posten").count() === 2);
    await e.locator("button[value=ok]").click(); await page.waitForTimeout(150);
    pruefe("V2d Übernehmen ohne Preis geht nicht", await page.locator(dlgSel).count() === 2);
    await e.locator('[data-bk-preis="0"]').fill("299");
    await e.locator('input[name="name"]').fill("Boost-Paket 1 Sonderpreis");
    await e.locator("button[value=ok]").click(); await page.waitForTimeout(150);
    pruefe("V2e zurück im Schülerfenster: „(angepasst)“ gewählt, Gesamt 1.599,00 €", await page.locator(dlgSel).count() === 1 && /angepasst/.test(await d.locator("[data-bk-wahl] option:checked").innerText()) && /1\.599,00\s*€/.test(await d.locator("[data-bk-anm-info]").innerText()));
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(400);
    const r = await rpcs(page, "schueler_paket_verkaufen");
    pruefe("V2f verkauft mit eigenem Namen und Preis (Vorlage bleibt verknüpft)", r.length === 1 && r[0].p_name === "Boost-Paket 1 Sonderpreis" && r[0].p_vorlage === "p-1" && r[0].p_posten[0].preis_cent === 29900, JSON.stringify(r));
    const vorlage = (await page.evaluate(() => window.__FAKE.tabellen.fahrschule_pakete)).find((p) => p.id === "p-1");
    pruefe("V2g Vorlage selbst unverändert", vorlage.name === "Boost-Paket 1" && vorlage.posten[0].preis_cent_fest === null);
    await ctx.close();
  }
  // V3 Verkauftes Paket bleibt fest; Normale Anmeldung storniert; Rückgängig holt es zurück
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitVerkauftem) });
    const d = await oeffneAkte(page, S1);
    const t = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V3a Akte: „verkauft am 01.10.2026“, feste Preise (Gesamt 1.500,00 € statt Liste 1.650,00 €)", /verkauft am 01\.10\.2026/.test(await d.locator("[data-bk-wahl] option:checked").innerText()) && /1\.500,00\s*€/.test(t) && !/1\.650/.test(t), t);
    await d.locator('input[name="telefon"]').fill("0151 0000000");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(350);
    pruefe("V3b anderes Feld speichern: Paket bleibt (kein Aufruf, paket_id gleich)", (await rpcs(page, "schueler_paket_verkaufen")).length === 0 && (await rpcs(page, "schueler_paket_aktivieren")).length === 0 && (await schueler(page, S1)).paket_id === "p-1");
    const d2 = await oeffneAkte(page, S1);
    await waehle(d2, "Normale Anmeldung");
    pruefe("V3c Hinweis: wird storniert, Rückgängig möglich", /storniert/.test(await d2.locator("[data-bk-anm-info]").innerText()));
    await d2.locator("button[value=ok]").click(); await page.waitForTimeout(350);
    pruefe("V3d Storno: kein aktives Paket, paket_id leer", (await sp(page)).every((x) => x.storniert_am) && (await schueler(page, S1)).paket_id === null);
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(300);
    pruefe("V3e Rückgängig: altes Paket wieder aktiv, paket_id zurück", (await sp(page)).find((x) => x.id === "sp-alt").storniert_am === null && (await schueler(page, S1)).paket_id === "p-1");
    pruefe("V3f keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // V4 Wechsel auf ein anderes Paket, Rückgängig; „Paket ändern“ übernimmt die festen Preise
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: vb(mitVerkauftem) });
    const d = await oeffneAkte(page, S1);
    await waehle(d, "Boost-Paket 2");
    pruefe("V4a Hinweis „ersetzt „Boost-Paket 1““", /ersetzt „Boost-Paket 1“/.test(await d.locator("[data-bk-anm-info]").innerText()));
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(350);
    const aktiv = (await sp(page)).filter((x) => !x.storniert_am);
    pruefe("V4b Wechsel: genau ein aktives Paket (Boost-Paket 2, 1.800,00 €), altes storniert", aktiv.length === 1 && aktiv[0].name === "Boost-Paket 2" && aktiv[0].gesamt_cent === 180000 && (await schueler(page, S1)).paket_id === "p-2");
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(300);
    const aktiv2 = (await sp(page)).filter((x) => !x.storniert_am);
    pruefe("V4c Rückgängig: wieder Boost-Paket 1", aktiv2.length === 1 && aktiv2[0].id === "sp-alt" && (await schueler(page, S1)).paket_id === "p-1");
    const d2 = await oeffneAkte(page, S1);
    await d2.locator("[data-bk-anpassen]").click(); await page.waitForTimeout(150);
    const e = page.locator(dlgSel).last();
    pruefe("V4d „Paket ändern“: feste Preise als eigene Preise (300 €, 60 €)", (await e.locator('[data-bk-preis="0"]').inputValue()).startsWith("300") && (await e.locator('[data-bk-preis="1"]').inputValue()).startsWith("60") && /eigener Preis/.test(await e.locator('[data-bk-hinweis="0"]').innerText()));
    await e.locator("[data-schliessen]").first().click(); await page.waitForTimeout(100);
    await ctx.close();
  }
  // V5 Leere Vorlage (Turboboost) und archivierte Vorlage
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(function () { F.tabellen.fahrschule_pakete.find((p) => p.id === "p-2").aktiv = false; }) });
    const d = await oeffneAkte(page, S1);
    const opt = await d.locator("[data-bk-wahl] option").allInnerTexts();
    pruefe("V5a archiviertes Paket nicht in der Auswahl", !opt.some((o) => /Boost-Paket 2/.test(o)), opt.join(" | "));
    await waehle(d, "Turboboost");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(250);
    pruefe("V5b leere Vorlage: Hinweis, Speichern gesperrt", /noch keine Posten/.test(await d.innerText()) && (await rpcs(page, "schueler_paket_verkaufen")).length === 0 && await page.locator(dlgSel).count() === 1);
    await ctx.close();
  }
  // V6 Alte Datenbank (Tabelle schueler_pakete fehlt): alte Paket-Auswahl wie bisher
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(function () { F.fehler = { schueler_pakete: 'relation "public.schueler_pakete" does not exist' }; }) });
    const d = await oeffneAkte(page, S1);
    pruefe("V6a alte DB: alte Auswahl „Paket“, keine Anmeldung", await d.locator('select[name="paket_id"]').count() === 1 && await d.locator("[data-bk-anm]").count() === 0);
    await d.locator('select[name="paket_id"]').selectOption("p-1");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(300);
    pruefe("V6b alte DB: Paket wird wie bisher direkt zugeordnet", (await schueler(page, S1)).paket_id === "p-1" && (await rpcs(page, "schueler_paket_verkaufen")).length === 0);
    pruefe("V6c alte DB: keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // V7 Handy 360 px: Schülerfenster mit Paket ohne Überstand
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitVerkauftem), breite: 360, hoehe: 740 });
    const d = await oeffneAkte(page, S1);
    const m = await page.evaluate(() => { const d = [...document.querySelectorAll("dialog[open]")].pop(); const b = d.querySelector("[data-bk-anm]"); const r = b.getBoundingClientRect(); const knopf = b.querySelector("[data-bk-anpassen]"); return { rechts: r.right <= d.getBoundingClientRect().right + 1, scroll: d.querySelector(".dialog-inhalt").scrollWidth - d.querySelector(".dialog-inhalt").clientWidth, knopf: knopf ? knopf.getBoundingClientRect().height : 0 }; });
    pruefe("V7 360 px: Block passt, kein Querscrollen, Knopf ≥ 44 px", m.rechts && m.scroll <= 1 && m.knopf >= 43.5, JSON.stringify(m));
    await ctx.close();
  }
  // V8 Fahrschulwechsel setzt die verkauften Pakete zurück (keine fremden Pakete in der neuen Schule)
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitVerkauftem) });
    const vorher = await page.evaluate(() => (S.verkauft || []).length);
    const src = await readFile(join(ROOT, "buero.js"), "utf8");
    pruefe("V8 geladen: 1 aktives Paket; Schulwechsel setzt S.verkauft = null", vorher === 1 && /S\.bkFehlt = false; S\.verkauft = null;/.test(src));
    await ctx.close();
  }
} catch (e) { schlecht++; console.log("FEHLER  Test-Ausnahme: " + (e && e.stack || e)); }

// App: Karte „Paket“ in der Akte des Fahrlehrers (nur lesen, ohne Preise)
try {
  const appServer = createServer(async (req, res) => {
    try {
      const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
      const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
      res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => appServer.listen(0, "127.0.0.1", ok));
  const ab = `http://127.0.0.1:${appServer.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const page = await ctx.newPage();
  const jsF = []; page.on("pageerror", (e) => jsF.push(e.message));
  await page.route("**/*", (r) => (r.request().url().startsWith(ab) ? r.continue() : r.abort()));
  await page.goto(ab + "index.html", { waitUntil: "load", timeout: 20000 }); await page.waitForTimeout(600);
  const erg = await page.evaluate(async () => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students = ["a1", "a2"].map((id) => ({ id, name: id === "a1" ? "Anna Erfunden" : "Arne Erfunden", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }));
    DB.lessons = []; DB.termine = []; DB.exams = []; save();
    // Attrappe: schueler_pakete (eine Zeile für a1, mit Preisen – die App zeigt sie nicht)
    const zeilen = [{ schueler_id: "a1", name: "Boost-Paket B", posten: [{ art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6500 }, { art: "sonderfahrt", bezeichnung: "Überlandfahrt", anzahl: 5, preis_cent: 8000 }] }];
    const q = (fehler) => { const o = { select: () => o, in: () => o, is: () => o, then: (f) => f(fehler ? { data: null, error: { message: 'relation "public.schueler_pakete" does not exist' } } : { data: zeilen, error: null }) }; return o; };
    await _ladePakete({ from: () => q(false) }, ["a1", "a2"]);
    routeDetail("a1"); await new Promise((r) => setTimeout(r, 300));
    const k1 = document.querySelector(".paket-karte"); const t1 = k1 ? k1.textContent : "";
    routeDetail("a2"); await new Promise((r) => setTimeout(r, 200));
    const k2 = !!document.querySelector(".paket-karte");
    _paketVerkauft = null;
    await _ladePakete({ from: () => q(true) }, ["a1"]);
    routeDetail("a1"); await new Promise((r) => setTimeout(r, 200));
    const k3 = !!document.querySelector(".paket-karte");
    return { t1, k2, k3, breit: document.documentElement.scrollWidth <= innerWidth + 1 };
  });
  pruefe("A1 App: Karte „Paket: Boost-Paket B“ mit Posten und Anzahl", /Paket: Boost-Paket B/.test(erg.t1) && /Übungsstunden\s*20/.test(erg.t1) && /Überlandfahrt\s*5/.test(erg.t1), erg.t1);
  pruefe("A2 App: keine Preise für den Fahrlehrer", !/€|65|80,00/.test(erg.t1), erg.t1);
  pruefe("A3 App: Schüler ohne Paket → keine Karte", erg.k2 === false);
  pruefe("A4 App: alte Datenbank (Tabelle fehlt) → keine Karte, kein Fehler", erg.k3 === false && !jsF.length, jsF.join(" | "));
  await ctx.close(); appServer.close();
} catch (e) { schlecht++; console.log("FEHLER  App-Test-Ausnahme: " + (e && e.stack || e)); }
await browser.close(); server.close();
console.log(`\n${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
