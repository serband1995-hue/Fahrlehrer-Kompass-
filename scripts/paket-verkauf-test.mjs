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
    pruefe("V3a Akte: Auswahl „… · seit 01.10.“, darunter „Verkauft am 01.10.2026“, feste Preise (Gesamt 1.500,00 € statt Liste 1.650,00 €)", /· seit 01\.10\.$/.test((await d.locator("[data-bk-wahl] option:checked").innerText()).trim()) && /^Verkauft am 01\.10\.2026/.test((await d.locator(".bk-anm-verkauft").innerText()).trim()) && /1\.500,00\s*€/.test(t) && !/1\.650/.test(t), t);
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
    pruefe("V4d „Paket ändern“: feste Preise als eigene Preise (300 €, 60 €)", (await e.locator('[data-bk-preis="0"]').inputValue()).startsWith("300") && (await e.locator('[data-bk-preis="1"]').inputValue()).startsWith("60") && /Eigener Preis/.test(await e.locator('[data-bk-hinweis="0"]').innerText()));
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
    const t5 = await d.innerText();
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(350);
    pruefe("V5b leere Vorlage (Turboboost): nur zugeordnet wie bisher, kein Verkauf, paket_id gesetzt", /nur zugeordnet/.test(t5) && (await rpcs(page, "schueler_paket_verkaufen")).length === 0 && await page.locator(dlgSel).count() === 0 && (await schueler(page, S1)).paket_id === "p-turbo", [t5.slice(0, 200), (await schueler(page, S1)).paket_id]);
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
  // V9 Schritt 2: „noch offen“ je Posten aus dem Büro-Kalender (Fahrlehrer ohne App → Sonderfahrten aus dem Kalender)
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(function () {
      F.tabellen.schueler_pakete.push({ id: "sp-alt", fahrschule_id: F.tabellen.fahrschulen[0].id, schueler_id: "s1", vorlage_id: "p-1", name: "Boost-Paket 1", klasse: "B",
        posten: [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent: 30000 }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6000 }, { art: "sonderfahrt", bezeichnung: "Überlandfahrt", anzahl: 5, preis_cent: 7000 }],
        gesamt_cent: 185000, verkauft_am: "2026-10-01T10:00:00Z", bearbeiter: "Mia Muster", storniert_am: null });
      const s = F.tabellen.schueler.find((x) => x.id === "s1"); s.paket_id = "p-1"; s.ausbildung = {};
      const fl = F.tabellen.profiles.find((p) => p.id === s.fahrlehrer_id); if (fl) fl.ohne_app = true;
      const tag = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
      F.tabellen.kalender_termine = F.tabellen.kalender_termine.filter((t) => t.schueler_id !== "s1").concat([
        { id: "kt-a", fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(5), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, buero_fc_status: "abgegeben", payload: {} },
        { id: "kt-b", fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(4), von: "10:00", bis: "10:45", status: "geplant", geloescht: false, payload: { status: "abgebrochen" } },
        { id: "kt-c", fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "sonder", datum: tag(3), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, buero_fc_status: "abgegeben", payload: { sonderArt: "ueberland" } },
        { id: "kt-e", fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(2), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, buero_fc_status: "offen", payload: {} },
        { id: "kt-d", fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(-3), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, payload: {} },
      ]);
    }) });
    const d = await oeffneAkte(page, S1);
    const t = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V9b Termin ohne Fahrcheck-Haken zählt nicht, Hinweis „1 Termin wartet“", /1 Termin wartet noch auf den Fahrcheck-Haken vom Büro/.test(t), t);
    pruefe("V9 Akte: „2 von 20 gefahren · noch 18 offen“ und „2 von 5 gefahren · noch 3 offen“, Grundbetrag ohne Zähler", /2 von 20 gefahren · noch 18 offen/.test(t) && /2 von 5 gefahren · noch 3 offen/.test(t) && !/Grundbetrag[^\n]*(gefahren|offen)/.test(t), t);
    await ctx.close();
  }
  // V9c Fable W1: nachgereicht, geschenkt, „1 vergessen“, Sonderfahrt ohne Art; Haken über den Knopf der Fahrcheck-Kontrolle, dann Akte
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", hash: "#fahrchecks?ansicht=stunden&von=2000-01-01", vorbereiten: vb(function () {
      F.tabellen.schueler_pakete.push({ id: "sp-w1", fahrschule_id: F.tabellen.fahrschulen[0].id, schueler_id: "s1", vorlage_id: "p-1", name: "Boost-Paket 1", klasse: "B",
        posten: [{ art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6000 }, { art: "sonderfahrt", bezeichnung: "Überlandfahrt", anzahl: 5, preis_cent: 7000 }],
        gesamt_cent: 155000, verkauft_am: "2026-10-01T10:00:00Z", bearbeiter: "Mia Muster", storniert_am: null });
      const s = F.tabellen.schueler.find((x) => x.id === "s1"); s.paket_id = "p-1"; s.ausbildung = {};
      const tag = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
      const z = (id, n, x) => Object.assign({ id, fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(n), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, buero_fc_status: "offen", payload: {} }, x);
      F.tabellen.kalender_termine = F.tabellen.kalender_termine.filter((t) => t.schueler_id !== "s1").concat([
        z("kt-n", 6, { payload: { fc: "nachgereicht", nachAm: tag(1) } }),          // nachgereicht, noch ohne Haken: wartet
        z("kt-g", 5, { payload: { fc: "geschenkt" } }),                              // geschenkt: zählt nicht, wartet nicht
        z("kt-v1", 4, { buero_fc_status: "abgegeben", payload: { fc: "v1" } }),     // 1 von 2 Fahrchecks da: zählt 1
        z("kt-s", 3, { art: "sonder", buero_fc_status: "abgegeben" }),              // Sonderfahrt ohne Art: Hinweis
        z("kt-x", 2, { geloescht: true, buero_fc_status: "abgegeben" }),            // gelöscht: nie
      ]);
    }) });
    const knopf = page.locator('#ansicht [data-fcstatus="abgegeben"][data-id="kt-n"]');
    pruefe("V9c Fahrcheck-Kontrolle: nachgereichte Stunde hat den Knopf „Abgegeben“", (await knopf.count()) === 1);
    let d = await oeffneAkte(page, S1);
    let t = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V9d „1 vergessen“ zählt 1, geschenkt und gelöscht nicht: „1 von 20 gefahren“; nur die nachgereichte wartet", /(^|\D)1 von 20 gefahren · noch 19 offen/.test(t) && /1 Termin wartet noch auf den Fahrcheck-Haken vom Büro\. Erst danach zählt er im Paket\./.test(t), t);
    pruefe("V9e Sonderfahrt ohne Art: Hinweis statt still nichts", /1 Sonderfahrt hat keine Art/.test(t), t);
    await page.evaluate(() => { const x = [...document.querySelectorAll("dialog[open]")]; x.forEach((e) => e.close()); });
    if (await knopf.count()) { await knopf.click(); await page.waitForTimeout(300); }
    const st = await page.evaluate(() => (S.termine.find((x) => x.id === "kt-n") || {}).buero_fc_status);
    const zeile = await page.evaluate(() => { const b = document.querySelector('#ansicht [data-fcbearb="kt-n"]'); return b ? b.closest("tr").innerText : ""; });
    pruefe("V9g Fahrcheck-Kontrolle: nachgereichte Stunde zeigt nach dem Haken „abgegeben“ (nicht „–“)", /abgegeben/.test(zeile), zeile);
    d = await oeffneAkte(page, S1);
    t = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V9f Haken über den Knopf gesetzt → Akte: nachgereichte zählt voll („3 von 20 gefahren“), kein Warte-Hinweis mehr", st === "abgegeben" && /(^|\D)3 von 20 gefahren · noch 17 offen/.test(t) && !/wartet noch/.test(t), { st, t });
    await ctx.close();
  }
  // V9h 🗣 Serband 25.11.2026: Bei 90 Minuten wählt Kristina „2 abgegeben“ oder „1 abgegeben“; im Paket zählt genau das.
  //      V9k: alte Datenbank ohne Spalte buero_fc_anzahl → nur „Abgegeben“ wie bisher, es wird keine Zahl geschrieben.
  for (const mitSpalte of [true, false]) {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", hash: "#fahrchecks?ansicht=stunden&von=2000-01-01", vorbereiten: vb(new Function(`const mitSpalte = ${mitSpalte};
      F.tabellen.schueler_pakete.push({ id: "sp-z", fahrschule_id: F.tabellen.fahrschulen[0].id, schueler_id: "s1", vorlage_id: "p-1", name: "Boost-Paket 1", klasse: "B",
        posten: [{ art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6000 }], gesamt_cent: 120000, verkauft_am: "2026-10-01T10:00:00Z", bearbeiter: "Mia Muster", storniert_am: null });
      const s = F.tabellen.schueler.find((x) => x.id === "s1"); s.paket_id = "p-1"; s.ausbildung = {};
      const tag = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
      F.tabellen.kalender_termine = F.tabellen.kalender_termine.filter((t) => t.schueler_id !== "s1");
      if (!mitSpalte) F.tabellen.kalender_termine.forEach((t) => { delete t.buero_fc_anzahl; });
      const z = (id, n, x) => Object.assign({ id, fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(n), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, buero_fc_status: "offen", payload: {} }, mitSpalte ? { buero_fc_anzahl: null } : {}, x);
      F.tabellen.kalender_termine.push(z("kz-1", 4), z("kz-2", 3, { von: "12:00", bis: "12:45" }));
    `)) });
    const zl = () => page.evaluate(() => { const b = document.querySelector('#ansicht [data-fcbearb="kz-1"]'); return b ? b.closest("tr").innerText : ""; });
    const k2 = page.locator('#ansicht [data-fcstatus="abgegeben"][data-anzahl="2"][data-id="kz-1"]'), k1 = page.locator('#ansicht [data-fcstatus="abgegeben"][data-anzahl="1"][data-id="kz-1"]');
    const kNorm = page.locator('#ansicht [data-fcstatus="abgegeben"]:not([data-anzahl])[data-id="kz-1"]'), k45 = page.locator('#ansicht [data-fcstatus="abgegeben"][data-id="kz-2"]');
    if (mitSpalte) {
      pruefe("V9h 90 Minuten: Knöpfe „2 abgegeben“ und „1 abgegeben“, 45 Minuten nur „Abgegeben“", (await k2.count()) === 1 && (await k1.count()) === 1 && (await kNorm.count()) === 0 && (await k45.count()) === 1 && !(await k45.getAttribute("data-anzahl")));
      await k1.click(); await page.waitForTimeout(300);
      const r = await page.evaluate(() => { const t = S.termine.find((x) => x.id === "kz-1"); return { st: t.buero_fc_status, n: t.buero_fc_anzahl }; });
      const z1 = await zl();
      pruefe("V9i „1 abgegeben“ gespeichert, Zeile zeigt „1 von 2“ und bietet „2 abgegeben“ an", r.st === "abgegeben" && r.n === 1 && /1 von 2/.test(z1) && (await k2.count()) === 1 && (await k1.count()) === 0, { r, z1 });
      let d = await oeffneAkte(page, S1); let t = await d.locator("[data-bk-anm-info]").innerText();
      pruefe("V9j Akte zählt die gewählte Zahl: „1 von 20 gefahren“, die 45-Minuten-Stunde wartet", /(^|\D)1 von 20 gefahren · noch 19 offen/.test(t) && /1 Termin wartet/.test(t), t);
      await page.evaluate(() => [...document.querySelectorAll("dialog[open]")].forEach((e) => e.close()));
      await page.locator('#ansicht [data-fcstatus="fehlt"][data-id="kz-1"]').click(); await page.waitForTimeout(300);
      const r2 = await page.evaluate(() => { const t = S.termine.find((x) => x.id === "kz-1"); return { st: t.buero_fc_status, n: t.buero_fc_anzahl }; });
      pruefe("V9l „Fehlt“ leert die Zahl", r2.st === "fehlt" && r2.n === null, r2);
    } else {
      pruefe("V9k alte Datenbank: nur „Abgegeben“, keine Zahl-Knöpfe", (await kNorm.count()) === 1 && (await k2.count()) === 0 && (await k1.count()) === 0);
      await kNorm.click(); await page.waitForTimeout(300);
      const r = await page.evaluate(() => { const t = S.termine.find((x) => x.id === "kz-1"); return { st: t.buero_fc_status, hat: "buero_fc_anzahl" in t }; });
      pruefe("V9m alte Datenbank: „Abgegeben“ speichert ohne Zahl-Spalte", r.st === "abgegeben" && !r.hat, r);
    }
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
  // V10 Preisliste: alte feste Paketpreise sind als „nur zur Übersicht“ gekennzeichnet (beim Verkauf gilt der Baukasten)
  {
    const paketPreis = function () { const fs = F.tabellen.fahrschulen[0].id; F.tabellen.fahrschule_preise.push({ id: "pp", fahrschule_id: fs, art: "paket", klasse: "B", bezeichnung: "Komfort", einheit: "paket", betrag_cent: 199900, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" }); };
    const { page, ctx } = await oeffne({ nutzer: "ad-1", hash: "#preise", vorbereiten: vb(paketPreis) });
    const t = await page.locator("#ansicht").innerText();
    pruefe("V10a Gruppe „Pakete“: Hinweis, dass der Baukasten gilt", /Beim Verkauf gilt der Gesamtpreis aus dem Reiter „Pakete“/.test(t));
    await ctx.close();
    const paketPreisAlt = function () { const fs = F.tabellen.fahrschulen[0].id; F.tabellen.fahrschule_preise.push({ id: "pp", fahrschule_id: fs, art: "paket", klasse: "B", bezeichnung: "Komfort", einheit: "paket", betrag_cent: 199900, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" }); F.tabellen.fahrschule_pakete.forEach((p) => { delete p.posten; delete p.klasse; delete p.aktualisiert_am; delete p.bearbeiter; }); };
    const alt = await oeffne({ nutzer: "ad-1", hash: "#preise", vorbereiten: vb(paketPreisAlt) });
    pruefe("V10b alte Datenbank: kein Hinweis", !/Beim Verkauf gilt/.test(await alt.page.locator("#ansicht").innerText()));
    await alt.ctx.close();
  }
  // V11 (Fable W1) Vorlage archiviert: „Paket ändern“ verkauft als freies Paket statt für immer zu scheitern
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(function () {
      F.tabellen.schueler_pakete.push({ id: "sp-alt", fahrschule_id: F.tabellen.fahrschulen[0].id, schueler_id: "s1", vorlage_id: "p-1", name: "Boost-Paket 1", klasse: "B",
        posten: [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent: 30000 }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6000 }],
        gesamt_cent: 150000, verkauft_am: "2026-10-01T10:00:00Z", bearbeiter: "Mia Muster", storniert_am: null });
      F.tabellen.schueler.find((s) => s.id === "s1").paket_id = "p-1";
      F.tabellen.fahrschule_pakete.find((p) => p.id === "p-1").aktiv = false;
    }) });
    const d = await oeffneAkte(page, S1);
    await d.locator("[data-bk-anpassen]").click(); await page.waitForTimeout(150);
    const e = page.locator(dlgSel).last();
    await e.locator('[data-bk-anzahl="1"]').fill("25"); await e.locator('[data-bk-anzahl="1"]').dispatchEvent("change");
    await e.locator("button[value=ok]").click(); await page.waitForTimeout(150);
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(400);
    const aufrufe = await rpcs(page, "schueler_paket_verkaufen"), aktiv = (await sp(page)).filter((x) => !x.storniert_am);
    pruefe("V11 archivierte Vorlage: verkauft ohne Vorlage, 25 Stunden, kein Fehler", aufrufe.length === 1 && aufrufe[0].p_vorlage === null && aktiv.length === 1 && aktiv[0].posten[1].anzahl === 25 && !/nicht verkauft/.test(await page.locator("body").innerText()), [aufrufe, aktiv.map((x) => x.posten)]);
    await ctx.close();
  }
  // V12 (Fable W2) Nur zugeordnet (z. B. Turboboost), versehentlich verkauft, Rückgängig: die Zuordnung ist wieder da
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(function () { F.tabellen.schueler.find((s) => s.id === "s1").paket_id = "p-2"; }) });
    const d = await oeffneAkte(page, S1);
    await waehle(d, "Boost-Paket 1");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(400);
    const nach = (await schueler(page, S1)).paket_id;
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(400);
    pruefe("V12 Rückgängig nach Verkauf: kein aktives Paket, Zuordnung „Boost-Paket 2“ zurück", nach === "p-1" && (await sp(page)).every((x) => x.storniert_am) && (await schueler(page, S1)).paket_id === "p-2", [nach, (await schueler(page, S1)).paket_id]);
    await ctx.close();
  }
  // V13 (Fable W7) „Paket ändern“ und „Übernehmen“ ohne Änderung: nichts wird neu verkauft
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitVerkauftem) });
    const d = await oeffneAkte(page, S1);
    await d.locator("[data-bk-anpassen]").click(); await page.waitForTimeout(150);
    await page.locator(dlgSel).last().locator("button[value=ok]").click(); await page.waitForTimeout(150);
    pruefe("V13a Hinweis „Nichts geändert“, Auswahl bleibt beim verkauften Paket", /Nichts geändert/.test(await page.locator("body").innerText()) && (await d.locator("[data-bk-wahl]").inputValue()) === "bleibt");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(350);
    pruefe("V13b kein neuer Verkauf", (await rpcs(page, "schueler_paket_verkaufen")).length === 0 && (await sp(page)).length === 1);
    await ctx.close();
  }
  // V14 (Prüfer Büro 1) Schülerliste zeigt das verkaufte Paket, auch wenn ein alter App-Stand paket_id überschrieben hat
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(function () {
      F.tabellen.schueler_pakete.push({ id: "sp-alt", fahrschule_id: F.tabellen.fahrschulen[0].id, schueler_id: "s1", vorlage_id: "p-1", name: "Boost-Paket 1", klasse: "B",
        posten: [{ art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6000 }], gesamt_cent: 120000, verkauft_am: "2026-10-01T10:00:00Z", storniert_am: null });
      F.tabellen.schueler.find((s) => s.id === "s1").paket_id = "p-2";
    }) });
    const name = (await schueler(page, S1)).name;
    const zeile = await page.locator("tr", { hasText: name }).first().innerText();
    pruefe("V14 Liste: „Boost-Paket 1“ (verkauft), nicht „Boost-Paket 2“", /Boost-Paket 1/.test(zeile) && !/Boost-Paket 2/.test(zeile), zeile);
    await ctx.close();
  }
  // V15 (mit W14) Konflikt in einem anderen Feld: Fenster bleibt offen, das Paket ist schon verkauft, zweites Speichern verkauft nicht noch einmal
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb() });
    const d = await oeffneAkte(page, S1);
    await waehle(d, "Boost-Paket 2");
    await d.locator('input[name="telefon"]').fill("0151 1111111");
    await page.evaluate(() => { window.__FAKE.tabellen.schueler.find((s) => s.id === "s1").telefon = "0151 2222222"; }); // inzwischen woanders geändert
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(500);
    const offen = await page.locator(dlgSel).count();
    const n1 = (await rpcs(page, "schueler_paket_verkaufen")).length;
    if (offen) { await page.locator(dlgSel).last().locator("button[value=ok]").click(); await page.waitForTimeout(500); }
    const n2 = (await rpcs(page, "schueler_paket_verkaufen")).length;
    pruefe("V15 Konflikt beim Telefon: Fenster bleibt offen, Paket einmal verkauft, zweites Speichern verkauft nicht neu", offen === 1 && n1 === 1 && n2 === 1 && (await sp(page)).filter((x) => !x.storniert_am).length === 1, [offen, n1, n2]);
    const kasten = await page.locator("dialog[open] [data-aktekonflikt]").allInnerTexts().catch(() => []);
    pruefe("V15b nach dem zweiten Speichern: paket_id bleibt beim verkauften Paket, kein Konflikt-Hinweis zum Paket", (await schueler(page, S1)).paket_id === "p-2" && !kasten.some((t) => /Paket/.test(t)), [(await schueler(page, S1)).paket_id, kasten]);
    await ctx.close();
  }
  // V16 Verkauftes Paket, dann Turboboost (ohne Posten) wählen: verkauftes wird storniert, Turboboost zugeordnet; Rückgängig holt das verkaufte zurück
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitVerkauftem) });
    const d = await oeffneAkte(page, S1);
    await waehle(d, "Turboboost");
    const t16 = await d.locator("[data-bk-anm-info]").innerText();
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(450);
    const nachZu = { aktiv: (await sp(page)).filter((x) => !x.storniert_am).length, paket: (await schueler(page, S1)).paket_id };
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(400);
    const nachUndo = { aktiv: (await sp(page)).filter((x) => !x.storniert_am).map((x) => x.id), paket: (await schueler(page, S1)).paket_id };
    pruefe("V16 Turboboost statt verkauftem Paket: Hinweis Storno, danach zugeordnet; Rückgängig: verkauftes wieder aktiv", /storniert/.test(t16) && /nur zugeordnet/.test(t16) && nachZu.aktiv === 0 && nachZu.paket === "p-turbo" && nachUndo.aktiv.join() === "sp-alt" && nachUndo.paket === "p-1", [nachZu, nachUndo]);
    await ctx.close();
  }
  // V17 (Richter) Nur das Paket gewählt, sonst nichts geändert: kein „Nichts geändert“ neben „verkauft“
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb() });
    const d = await oeffneAkte(page, S1);
    await waehle(d, "Boost-Paket 2");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(450);
    const t17 = await page.locator("body").innerText();
    pruefe("V17 nur Verkauf: „verkauft“ ja, „Nichts geändert“ nein", /verkauft/.test(t17) && !/Nichts geändert/.test(t17), t17.slice(-300));
    await ctx.close();
  }
  // V18 (Folgeauftrag) „noch offen“ zählt die ganze Ausbildung, nicht nur die geladenen DATEN_TAGE Tage; ✕ mindestens 44×44 px
  const mitAltenTerminen = function () {
    F.tabellen.schueler_pakete.push({ id: "sp-alt", fahrschule_id: F.tabellen.fahrschulen[0].id, schueler_id: "s1", vorlage_id: "p-1", name: "Boost-Paket 1", klasse: "B",
      posten: [{ art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6000 }, { art: "pruefung_praxis", bezeichnung: "Vorstellung zur praktischen Prüfung", anzahl: 2, preis_cent: 20000 }],
      gesamt_cent: 160000, verkauft_am: "2025-01-10T10:00:00Z", storniert_am: null });
    const s = F.tabellen.schueler.find((x) => x.id === "s1"); s.paket_id = "p-1"; s.ausbildung = {};
    const tag = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    F.tabellen.kalender_termine = F.tabellen.kalender_termine.filter((t) => t.schueler_id !== "s1").concat([
      { id: "kt-neu", fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(10), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, buero_fc_status: "abgegeben", payload: {} },
      { id: "kt-alt", fahrschule_id: s.fahrschule_id, fahrlehrer_id: s.fahrlehrer_id, schueler_id: "s1", art: "fahrstunde", datum: tag(500), von: "10:00", bis: "11:30", status: "geplant", geloescht: false, buero_fc_status: "abgegeben", payload: {} },
    ]);
    F.tabellen.kalender_pruefungen = (F.tabellen.kalender_pruefungen || []).filter((p) => p.schueler_id !== "s1"); // nur die alte Tafel-Prüfung zählt
    F.tabellen.pruefungstermine = (F.tabellen.pruefungstermine || []).filter((p) => p.schueler_id !== "s1").concat([
      { id: "pt-alt", fahrschule_id: s.fahrschule_id, schueler_id: "s1", fahrlehrer_id: s.fahrlehrer_id, art: "praxis", status: "nicht_bestanden", datum: tag(450), von: "09:00", klasse: "B" },
    ]);
  };
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitAltenTerminen) });
    const geladen = await page.evaluate(() => (S.termine || []).some((t) => t.id === "kt-alt"));
    const d = await oeffneAkte(page, S1);
    await page.waitForTimeout(300);
    const t = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V18a alter Termin (500 Tage) ist nicht im Büro geladen, zählt aber: „4 von 20 gefahren · noch 16 offen“", !geladen && /4 von 20 gefahren · noch 16 offen/.test(t), [geladen, t]);
    pruefe("V18b alte Prüfung von der Tafel zählt: „1 von 2 vorgestellt“", /1 von 2 vorgestellt/.test(t), t);
    const x = await d.locator("header [data-schliessen]").boundingBox();
    pruefe("V18c ✕ im Fenster mindestens 44×44 px", x && x.width >= 44 && x.height >= 44, x);
    pruefe("V18d keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    // V18h (Prüf-Team Daten) Termin im geladenen Zeitraum inzwischen abgesagt (aus S.termine weg): der beim Öffnen geladene Verlauf bringt ihn nicht zurück
    const nachAbsage = await page.evaluate(() => {
      const x = S.schueler.find((y) => y.id === "s1"), t = S.termine.find((y) => y.id === "kt-neu");
      const voll = { termine: [Object.assign({}, t)], tafel: [] };
      S.termine = S.termine.filter((y) => y.id !== "kt-neu");
      return bkVerbrauchQuelle(x, voll).fahrstunden;
    });
    pruefe("V18h abgesagter Termin zählt nicht mehr (Verlauf nur vor der 400-Tage-Grenze)", nachAbsage === 0, nachAbsage);
    await ctx.close();
  }
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitAltenTerminen) });
    await page.evaluate(() => { window.bkVerlaufLaden = async () => null; }); // älterer Verlauf nicht ladbar
    const d = await oeffneAkte(page, S1);
    await page.waitForTimeout(300);
    const t = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V18e nicht ladbar: Stand der letzten Tage mit gelbem Hinweis", /2 von 20 gefahren/.test(t) && /Ältere Termine fehlen/.test(t) && await d.locator("[data-bk-voll-fehlt].bk-anm-warn").count() === 1, t);
    await ctx.close();
  }
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitAltenTerminen) });
    await page.evaluate(() => { window.alleSeiten = async () => ({ data: null, error: { message: "Netz weg" } }); }); // echter Fehlerweg (Fable W4)
    const d = await oeffneAkte(page, S1);
    await page.waitForTimeout(300);
    pruefe("V18f Abfrage scheitert: gelber Hinweis, keine Konsolenfehler", await d.locator("[data-bk-voll-fehlt]").count() === 1 && !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitAltenTerminen) });
    await page.evaluate(() => { const echt = window.bkVerlaufLaden; window.bkVerlaufLaden = async (sid) => { await new Promise((r) => setTimeout(r, 1500)); return echt(sid); }; });
    const d = await oeffneAkte(page, S1);
    await page.waitForTimeout(300);
    const waehrend = await d.locator("[data-bk-anm-info]").innerText();
    await page.waitForTimeout(1600);
    const danach = await d.locator("[data-bk-anm-info]").innerText();
    pruefe("V18g während des Ladens keine (zu hohe) Zahl, sondern „wird gezählt“; danach die volle Zahl", /wird gezählt/.test(waehrend) && !/von 20 gefahren/.test(waehrend) && /4 von 20 gefahren/.test(danach) && !/wird gezählt/.test(danach), [waehrend, danach]);
    await ctx.close();
  }
  // V19 (Folgeauftrag) Ein anderes Fenster hat das Paket schon storniert: Meldung statt Stille
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitVerkauftem) });
    const d = await oeffneAkte(page, S1);
    await page.evaluate(() => { window.__FAKE.tabellen.schueler_pakete.find((x) => x.id === "sp-alt").storniert_am = new Date().toISOString(); });
    await waehle(d, "Normale Anmeldung");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(450);
    const t19 = await page.locator("body").innerText();
    pruefe("V19 schon storniert: Meldung „war schon storniert“, kein zweites Stornieren", /war schon storniert/.test(t19) && (await rpcs(page, "schueler_paket_aktivieren")).length === 0, t19.slice(-200));
    await ctx.close();
  }
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: vb(mitVerkauftem) });
    const d = await oeffneAkte(page, S1);
    await page.evaluate(() => { window.__FAKE.tabellen.schueler_pakete.find((x) => x.id === "sp-alt").storniert_am = new Date().toISOString(); window.__FAKE.tabellen.schueler.find((s) => s.id === "s1").paket_id = null; });
    await waehle(d, "Turboboost");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(450);
    const t19b = await page.locator("body").innerText();
    pruefe("V19b zuordnen, Paket schon storniert: Meldung, Turboboost zugeordnet", /zugeordnet\. Das verkaufte Paket war schon storniert/.test(t19b) && (await schueler(page, S1)).paket_id === "p-turbo", [t19b.slice(-200), (await schueler(page, S1)).paket_id]);
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
    // Attrappe: schueler_pakete (für _ladePakete) und kalender_termine (die Akte lädt beim Öffnen diesen einen Schüler über getSupa).
    // Jede Kette gibt sich selbst zurück; kalender_termine liefert nur, was zu den Filtern passt (ohne eq geloescht=false auch Gelöschte).
    let ktRows = [], ktFehler = false, ktOhneSpalte = false; const ktAufrufe = [];
    const antwort = (tab, a, pak, fehler) => {
      if (fehler) return { data: null, error: { message: 'relation "public.schueler_pakete" does not exist' } };
      if (tab === "kalender_termine" && ktOhneSpalte && /buero_fc_anzahl/.test(a.sel)) return { data: null, error: { message: "column kalender_termine.buero_fc_anzahl does not exist" } };
      if (tab === "kalender_termine") { ktAufrufe.push(a); return ktFehler ? { data: null, error: { message: "Failed to fetch" } } : { data: ktRows.filter((r) => r.schueler_id === a.eq.schueler_id && (a.eq.geloescht === false ? !r.geloescht : true)), error: null }; }
      return { data: tab === "schueler_pakete" ? pak : [], error: null };
    };
    const mock = (pak, fehler) => ({ from: (tab) => { const a = { sel: "", eq: {} }; const o = new Proxy({}, { get: (_, k) => k === "then" ? (f, r) => Promise.resolve(antwort(tab, a, pak, fehler)).then(f, r)
      : (...x) => { if (k === "select") a.sel = x[0]; if (k === "eq") a.eq[x[0]] = x[1]; return o; } }); return o; } });
    const q = (fehler) => mock(zeilen, fehler);
    const altSupa0 = window.getSupa; window.getSupa = () => mock(zeilen, false);
    const warte = (ms) => new Promise((r) => setTimeout(r, ms));
    const karte = () => (document.querySelector(".paket-karte") || {}).textContent || "";
    // Zeilen, wie PostgREST sie für die Auswahl mit pst:payload->>status, sonderArt:…, srcSonder:…, fc:… liefert
    const kt = (id, datum, von, bis, x) => Object.assign({ id, schueler_id: "a1", art: "fahrstunde", datum, von, bis, status: "geplant", buero_fc_status: "abgegeben", pst: null, sonderArt: null, srcSonder: null, fc: null, geloescht: false }, x || {});
    await _ladePakete(q(false), ["a1", "a2"]);
    routeDetail("a1"); const k0 = karte(); await warte(300);
    const t1 = karte();
    routeDetail("a2"); await warte(200);
    const k2 = !!document.querySelector(".paket-karte");
    _paketVerkauft = null;
    await _ladePakete(q(true), ["a1"]);
    routeDetail("a1"); await warte(200);
    const k3 = !!document.querySelector(".paket-karte");
    // Schritt 2: Termine vom Server mit Büro-Haken → „2 von 20“, „Überland 2 von 5“; ohne Haken zählt nicht (Hinweis), Plan zählt nicht
    const gestern = KR.addDaysISO(KR.todayISO(), -1);
    DB.lessons = [{ id: "l-lokal", sid: "a1", art: "fahrstunde", date: gestern, von: "13:00", bis: "14:30", status: "" }]; // nur auf dem Gerät: zählt nicht
    DB.students.find((x) => x.id === "a1").plan.sonder = { ueberland: [{ iso: gestern }, { iso: gestern }, { iso: gestern }], autobahn: [], nacht: [] };
    ktRows = [kt("k1", gestern, "10:00", "11:30"), kt("k2", gestern, "15:00", "16:30", { art: "sonder", sonderArt: "ueberland" }),
      kt("k3", gestern, "17:00", "17:45", { buero_fc_status: "offen" }), kt("k4", gestern, "18:00", "18:45", { status: "geplatzt" }),
      kt("k5", gestern, "19:00", "20:30", { geloescht: true }), kt("k6", gestern, "08:00", "09:30", { fc: "geschenkt" }), kt("k7", gestern, "06:00", "06:45", { pst: "abgebrochen" }),
      kt("k8", gestern, "20:30", "21:15", { schueler_id: "a2" })];
    _paketVerkauft = null; await _ladePakete(q(false), ["a1"]); delete _paketTermine.a1;
    routeDetail("a1"); await warte(300);
    const k4 = karte(), aufruf = ktAufrufe[ktAufrufe.length - 1] || { eq: {}, sel: "" };
    const nAufrufe = ktAufrufe.length; routeDetail("a1"); await warte(200);
    const nochmal = ktAufrufe.length - nAufrufe; // frisch geladen: kein zweiter Abruf binnen einer Minute
    // W13: Zahl vom Büro (buero_fc_anzahl) zählt; alte Datenbank ohne die Spalte → einmal ohne fragen, gleiche Zahlen
    const ktVorher = ktRows; ktRows = [kt("z1", gestern, "10:00", "11:30", { buero_fc_anzahl: 1 }), kt("z2", gestern, "12:00", "13:30")];
    delete _paketTermine.a1; routeDetail("a1"); await warte(300); const kZahl = karte(), mitSpalteSel = (ktAufrufe[ktAufrufe.length - 1] || {}).sel || "";
    ktOhneSpalte = true; ktRows = [kt("z1", gestern, "10:00", "11:30"), kt("z2", gestern, "12:00", "13:30")].map((x) => { delete x.buero_fc_anzahl; return x; });
    delete _paketTermine.a1; routeDetail("a1"); await warte(300); const kOhne = karte(), spalteDanach = _fcAnzahlSpalte;
    ktOhneSpalte = false; _fcAnzahlSpalte = true; ktRows = ktVorher;
    // nicht ladbar → Hinweis, „–“ statt Paketgröße
    ktFehler = true; delete _paketTermine.a1; routeDetail("a1"); await warte(300);
    const k4f = karte(); ktFehler = false;
    // Fahrlehrer sieht nur eigene Termine → ehrlicher Hinweis
    const altProfil = _authProfile; _authProfile = { rolle: "fahrlehrer" }; delete _paketTermine.a1; routeDetail("a1"); await warte(300);
    const k4l = karte(); _authProfile = altProfil;
    // Gesamtansicht (Leitung, Büro): Termine samt Haken aus DB.lessons, kein eigener Abruf
    _fsAgg = { fahrschuleId: "fs-test" }; const nVorAgg = ktAufrufe.length;
    DB.lessons = [{ id: "g1", sid: "a1", art: "fahrstunde", date: gestern, von: "10:00", bis: "11:30", status: "geplant", buero_fc_status: "abgegeben" },
      { id: "g2", sid: "a1", art: "fahrstunde", date: gestern, von: "12:00", bis: "12:45", status: "geplant", buero_fc_status: "offen" },
      { id: "g3", sid: "a1", art: "fahrstunde", date: gestern, von: "14:00", bis: "15:30", status: "geplant", buero_fc_status: "abgegeben", fc: "nachgereicht" },
      { id: "g4", sid: "a2", art: "fahrstunde", date: gestern, von: "16:00", bis: "17:30", status: "geplant", buero_fc_status: "abgegeben" },
      { id: "g5", sid: "a1", art: "fahrstunde", date: gestern, von: "18:00", bis: "19:30", status: "geplant", buero_fc_status: "abgegeben", buero_fc_anzahl: 1 }];
    const box = document.createElement("div"); box.innerHTML = paketCard(DB.students.find((x) => x.id === "a1")); await warte(150);
    const kAgg = box.textContent, aggAbruf = ktAufrufe.length - nVorAgg; _fsAgg = null; DB.lessons = [];
    // Richter: Gerät hat nach dem Update noch die alte kompass-rechnen.js → keine Zahl statt Absturz
    const kF = KR.fcFuersBuero; delete KR.fcFuersBuero; let kAlt = "";
    try { const b2 = document.createElement("div"); b2.innerHTML = paketCard(DB.students.find((x) => x.id === "a1")); kAlt = b2.textContent; } catch (e) { kAlt = "AUSNAHME " + e.message; }
    KR.fcFuersBuero = kF;
    // A6/A8/A9: mehr als im Paket (+2), Grundbetrag „enthalten“, Prüfung mit Ergebnis zählt
    const zeilen2 = [{ schueler_id: "a1", name: "Boost-Paket B", vorlage_id: "v1", posten: [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent: 30000 }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent: 6500 }, { art: "pruefung_praxis", bezeichnung: "Vorstellung zur praktischen Prüfung", anzahl: 1, preis_cent: 15000 }] }];
    ktRows = Array.from({ length: 11 }, (_, i) => kt("m" + i, KR.addDaysISO(KR.todayISO(), -2 - i), "10:00", "11:30"));
    DB.exams = [{ id: "e1", sid: "a1", date: gestern, result: "fail" }];
    _paketVerkauft = null; await _ladePakete(mock(zeilen2, false), ["a1"]); delete _paketTermine.a1;
    routeDetail("a1"); await warte(300);
    const k5 = karte();
    window.getSupa = altSupa0;
    // A7: Leitung kann ein im Büro verkauftes Paket in der App nicht überschreiben
    let geschrieben = false; const altSupa = window.getSupa;
    window.getSupa = () => ({ from: () => { geschrieben = true; return { update: () => ({ eq: () => Promise.resolve({}) }) }; } });
    await schuelerPaketSetzen("a1", "v2");
    window.getSupa = altSupa;
    return { kZahl, mitSpalteSel, kOhne, spalteDanach, k0, t1, k2, k3, k4, k4f, k4l, kAgg, kAlt, aggAbruf, aufruf, nochmal, k5, geschrieben, breit: document.documentElement.scrollWidth <= innerWidth + 1 };
  });
  pruefe("A1 App: Karte „Paket: Boost-Paket B“ mit Posten und Stand (noch nichts gefahren: „0 von 20“)", /Paket: Boost-Paket B/.test(erg.t1) && /Übungsstunden\s*0 von 20/.test(erg.t1) && /Überlandfahrt\s*0 von 5/.test(erg.t1), erg.t1);
  pruefe("A2 App: keine Preise für den Fahrlehrer", !/€|65|80,00/.test(erg.t1), erg.t1);
  pruefe("A3 App: Schüler ohne Paket → keine Karte", erg.k2 === false);
  pruefe("A4 App: alte Datenbank (Tabelle fehlt) → keine Karte, kein Fehler", erg.k3 === false && !jsF.length, jsF.join(" | "));
  pruefe("A5 App: nur mit Büro-Haken: „Übungsstunden 2 von 20“, „Überlandfahrt 2 von 5“ (Plan, Gerät, geplatzt, abgebrochen, geschenkt, gelöscht, anderer Schüler zählen nicht)", /Übungsstunden\s*2 von 20/.test(erg.k4) && /Überlandfahrt\s*2 von 5/.test(erg.k4), erg.k4);
  pruefe("A5b App: Hinweis „1 Termin wartet noch auf den Fahrcheck-Haken“", /1 Termin wartet noch auf den Fahrcheck-Haken vom Büro/.test(erg.k4), erg.k4);
  pruefe("A0 App: beim Öffnen „Stand wird gezählt …“ und „–“ statt der Paketgröße", /Stand wird gezählt/.test(erg.k0) && /Übungsstunden\s*–/.test(erg.k0) && !/20 ×/.test(erg.k0), erg.k0);
  pruefe("A5c App: Abruf nur für diesen Schüler, ohne gelöschte (eq geloescht=false), ohne die ganze Nutzlast", erg.aufruf.eq.schueler_id === "a1" && erg.aufruf.eq.geloescht === false && /buero_fc_status/.test(erg.aufruf.sel) && /fc:payload->>fc/.test(erg.aufruf.sel) && !/(^|,)payload(,|$)/.test(erg.aufruf.sel), erg.aufruf);
  pruefe("A5d App: frisch geladen → kein zweiter Abruf binnen einer Minute", erg.nochmal === 0, erg.nochmal);
  pruefe("A5e App: nicht ladbar → „Stand gerade nicht abrufbar“, „–“ statt Zahlen", /Stand gerade nicht abrufbar/.test(erg.k4f) && /Übungsstunden\s*–/.test(erg.k4f), erg.k4f);
  pruefe("A5f App: Fahrlehrer → Hinweis „Du siehst nur deine eigenen Fahrten“ (Leitung/Büro nicht)", /Du siehst nur deine eigenen Fahrten/.test(erg.k4l) && !/eigenen Fahrten/.test(erg.k4), erg.k4l);
  pruefe("A5g App-Gesamtansicht: Termine samt Haken aus DB.lessons (2 + nachgereicht 2 + Büro wählt 1 = 5, 1 wartet), kein eigener Abruf", /Übungsstunden\s*5 von 20/.test(erg.kAgg) && /1 Termin wartet/.test(erg.kAgg) && erg.aggAbruf === 0 && !/eigenen Fahrten/.test(erg.kAgg), { t: erg.kAgg, n: erg.aggAbruf });
  pruefe("A5i App: vom Büro gewählte Zahl zählt (1 + 2 = „3 von 20“), Abfrage fragt buero_fc_anzahl ab", /Übungsstunden\s*3 von 20/.test(erg.kZahl) && /buero_fc_anzahl/.test(erg.mitSpalteSel), { t: erg.kZahl, sel: erg.mitSpalteSel });
  pruefe("A5j App: alte Datenbank ohne Spalte → zweiter Versuch ohne, Stand trotzdem da („4 von 20“)", /Übungsstunden\s*4 von 20/.test(erg.kOhne) && erg.spalteDanach === false, { t: erg.kOhne, s: erg.spalteDanach });
  pruefe("A5h App: alte kompass-rechnen.js im Zwischenspeicher → „nicht abrufbar“, kein Absturz", /Stand gerade nicht abrufbar/.test(erg.kAlt) && !/AUSNAHME/.test(erg.kAlt), erg.kAlt);
  pruefe("A6 App: 22 von 20 Einheiten → „20 von 20 ✓ · +2“", /Übungsstunden\s*20 von 20 ✓ · \+2/.test(erg.k5), erg.k5);
  pruefe("A7 App: verkauftes Paket lässt sich in der App nicht überschreiben", erg.geschrieben === false);
  pruefe("A8 App: Grundbetrag „enthalten“", /Grundbetrag\s*enthalten/.test(erg.k5), erg.k5);
  pruefe("A9 App: Prüfung mit Ergebnis zählt („1 von 1 ✓“)", /Vorstellung zur praktischen Prüfung\s*1 von 1 ✓/.test(erg.k5), erg.k5);
  await ctx.close(); appServer.close();
} catch (e) { schlecht++; console.log("FEHLER  App-Test-Ausnahme: " + (e && e.stack || e)); }
await browser.close(); server.close();
console.log(`\n${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
