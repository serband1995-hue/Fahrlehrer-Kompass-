// Test Werkstatt 13 Paket-Baukasten im Büro (buero-pakete.js), echter Browser mit erfundenen Daten (Attrappe).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/baukasten-test.mjs
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

async function oeffne({ nutzer, hash = "#preise?reiter=pakete", vorbereiten, breite = 1366, hoehe = 860 }) {
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

try {
  // B1 Reiter und Liste
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", vorbereiten: preise });
    pruefe("B1a Reiter „Preise | Pakete“ da, „Pakete“ gewählt", await page.locator('.bk-reiter a[aria-current="page"]').innerText() === "Pakete" && await page.locator(".bk-reiter a").count() === 2);
    const t = await page.locator("#ansicht").innerText();
    pruefe("B1b Vorlagen in Reihenfolge (Turboboost zuerst)", t.indexOf("Turboboost") >= 0 && t.indexOf("Turboboost") < t.indexOf("Boost-Paket 1"), t.slice(0, 300));
    pruefe("B1c Summe aus der Preisliste: 350 + 20 × 65 = 1.650,00 €", /1\.650,00\s*€/.test(t), t.slice(0, 400));
    pruefe("B1d Turboboost „noch leer“", /noch leer/.test(t));
    await page.click('.bk-reiter a:has-text("Preise")'); await page.waitForTimeout(200);
    pruefe("B1e Reiter „Preise“ zeigt die Preisliste", await page.locator("#prNeu").count() === 1 && await page.locator("#bkNeu").count() === 0);
    pruefe("B1f keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // B2 Neues Paket bauen: Chips, Stepper, eigener Preis, zurück zur Preisliste, Sonstiges, Gesamtpreis, Speichern
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: preise });
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    await d.locator('input[name="name"]').fill("Test-Paket B");
    pruefe("B2a leer: Gesamtpreis 0,00 €", /0,00\s*€/.test(await gesamt(page)));
    await chip(page, "Grundbetrag"); await chip(page, "Übungsstunden");
    pruefe("B2b Grundbetrag + 10 Übungsstunden = 350 + 650 = 1.000,00 €", /1\.000,00\s*€/.test(await gesamt(page)), await gesamt(page));
    await d.locator('[data-bk-plus="1"]').click(); await d.locator('[data-bk-plus="1"]').click();
    pruefe("B2c Plus zweimal → 12 Stunden, 1.130,00 €", (await d.locator('[data-bk-anzahl="1"]').inputValue()) === "12" && /1\.130,00\s*€/.test(await gesamt(page)), await gesamt(page));
    await d.locator('[data-bk-minus="1"]').click();
    await d.locator('[data-bk-anzahl="1"]').fill("20"); await d.locator('[data-bk-anzahl="1"]').dispatchEvent("change");
    pruefe("B2d Anzahl eintippen (20) → 1.650,00 €", /1\.650,00\s*€/.test(await gesamt(page)), await gesamt(page));
    await d.locator('[data-bk-preis="0"]').fill("399");
    pruefe("B2e eigener Preis 399 → „eigener Preis“, 1.699,00 €", /Eigener Preis/.test(await d.locator('[data-bk-hinweis="0"]').innerText()) && /1\.699,00\s*€/.test(await gesamt(page)), await gesamt(page));
    await d.locator('[data-bk-liste="0"]').click();
    pruefe("B2f „zurück zur Preisliste“ → 350 €, 1.650,00 €", (await d.locator('[data-bk-preis="0"]').inputValue()) === "350,00" && /1\.650,00\s*€/.test(await gesamt(page)), await d.locator('[data-bk-preis="0"]').inputValue());
    await chip(page, "Sonderfahrt");
    const s0 = await d.locator('[data-bk-sonder="2"]').inputValue();
    pruefe("B2g erste Sonderfahrt: Überland, 5 Stück, Preis fehlt (nur Autobahn steht in der Liste)", s0 === "Überlandfahrt" && (await d.locator('[data-bk-anzahl="2"]').inputValue()) === "5" && /Preis fehlt/.test(await d.locator('[data-bk-hinweis="2"]').innerText()));
    await chip(page, "Sonderfahrt");
    pruefe("B2h zweite Sonderfahrt: Autobahn 4 × 80 € aus der Liste", (await d.locator('[data-bk-sonder="3"]').inputValue()) === "Autobahnfahrt" && (await d.locator('[data-bk-preis="3"]').inputValue()) === "80,00");
    pruefe("B2i Gesamt „ab 1.970,00 €“ mit Hinweis „1 Posten ohne Preis“", /1 Posten ohne Preis/.test(await d.locator("[data-bk-gesamt-hinweis]").innerText()) && /^ab 1\.970,00\s*€/.test(await gesamt(page)), await gesamt(page));
    await d.locator('[data-bk-preis="2"]').fill("85,5");
    await chip(page, "Lernapp");
    pruefe("B2j Lernapp ohne Klasse in der Liste → 79 € (Paket Klasse B)", (await d.locator('[data-bk-preis="4"]').inputValue()) === "79,00");
    await chip(page, "Sonstiges");
    await page.keyboard.type("Erste-Hilfe-Kurs");
    await d.locator('[data-bk-preis="5"]').fill("45");
    // Speichern ohne Fehler
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(300);
    const neu = (await pakete(page)).find((p) => p.name === "Test-Paket B");
    const erwartet = [
      { art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent_fest: null },
      { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent_fest: null },
      { art: "sonderfahrt", bezeichnung: "Überlandfahrt", anzahl: 5, preis_cent_fest: 8550 },
      { art: "sonderfahrt", bezeichnung: "Autobahnfahrt", anzahl: 4, preis_cent_fest: null },
      { art: "lernapp", bezeichnung: "Fahr-Akademie Lernapp", anzahl: 1, preis_cent_fest: null },
      { art: "sonstiges", bezeichnung: "Erste-Hilfe-Kurs", anzahl: 1, preis_cent_fest: 4500 },
    ];
    pruefe("B2k gespeichert: Posten genau so (Cent, fest nur wo eingetippt)", !!neu && JSON.stringify(neu.posten) === JSON.stringify(erwartet), neu && JSON.stringify(neu.posten));
    pruefe("B2l Klasse B, aktiv, Reihenfolge hinten, Bearbeiter aus der PIN", !!neu && neu.klasse === "B" && neu.aktiv === true && neu.reihenfolge === 2 && neu.bearbeiter === "Paula Muster", neu && JSON.stringify([neu.klasse, neu.aktiv, neu.reihenfolge, neu.bearbeiter]));
    const t = await page.locator("#ansicht").innerText();
    // 350 + 1300 + 5×85,50 + 4×80 + 79 + 45 = 2.521,50
    pruefe("B2m Liste zeigt das neue Paket mit 2.521,50 €", /Test-Paket B/.test(t) && /2\.521,50\s*€/.test(t), t.slice(0, 600));
    pruefe("B2n keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // B3 Posten entfernen mit Rückgängig, Pflichtfelder, Preisliste ändert sich → Paket folgt
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: preise });
    await page.locator('[data-bk-bearbeiten="p-1"]').click(); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    await d.locator('[data-bk-weg="0"]').click(); await page.waitForTimeout(100);
    pruefe("B3a ✕ entfernt den Grundbetrag ohne Rückfrage", await d.locator(".bk-posten").count() === 1 && await page.locator(dlgSel).count() === 1);
    await page.locator(dlgSel).last().locator("[data-undo]").click(); await page.waitForTimeout(100);
    pruefe("B3b Rückgängig holt ihn an dieselbe Stelle zurück", await d.locator(".bk-posten").count() === 2 && /Grundbetrag/.test(await d.locator('.bk-posten[data-i="0"]').innerText()));
    await chip(page, "Sonstiges");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(200);
    pruefe("B3c „Sonstiges“ ohne Namen wird nicht gespeichert", await page.locator(dlgSel).count() === 1 && /Namen/.test(await d.innerText()));
    await d.locator('[data-bk-weg="2"]').click(); await page.waitForTimeout(80);
    await d.locator('input[name="name"]').fill("");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(200);
    pruefe("B3d ohne Paketnamen wird nicht gespeichert", await page.locator(dlgSel).count() === 1);
    await d.locator('input[name="name"]').fill("Boost-Paket 1 neu");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(250);
    const p1 = (await pakete(page)).find((p) => p.id === "p-1");
    pruefe("B3e Umbenennen gespeichert", p1.name === "Boost-Paket 1 neu");
    await page.locator("[data-undo]").last().click(); await page.waitForTimeout(250);
    pruefe("B3f Rückgängig nach Speichern: alter Name zurück", (await pakete(page)).find((p) => p.id === "p-1").name === "Boost-Paket 1");
    // Preisliste ändert sich (neuer Grundbetrag 400 €) → Paket rechnet neu
    await page.evaluate(() => { S.preise.push({ id: "p9", fahrschule_id: S.fsId, art: "grundbetrag", klasse: "B", bezeichnung: "Grundbetrag", einheit: "pauschal", betrag_cent: 40000, gueltig_ab: KR.todayISO(), angelegt_von: "ad-1", angelegt_am: new Date().toISOString() }); zeichne(); });
    pruefe("B3g neuer Preis in der Preisliste → Paket folgt (400 + 1.300 = 1.700,00 €)", /1\.700,00\s*€/.test(await page.locator("#ansicht").innerText()));
    await ctx.close();
  }
  // B4 Archivieren mit Rückgängig, Zurückholen, Kopieren, Turboboost-Name fest
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: preise });
    await page.locator('[data-bk-archiv="p-1"]').click(); await page.waitForTimeout(250);
    pruefe("B4a Archivieren ohne Rückfrage, Paket im „Archiv (1)“", (await pakete(page)).find((p) => p.id === "p-1").aktiv === false && /Archiv \(1\)/.test(await page.locator("#ansicht").innerText()) && await page.locator("dialog[open]").count() === 0);
    await page.locator("[data-undo]").last().click(); await page.waitForTimeout(250);
    pruefe("B4b Rückgängig: wieder aktiv", (await pakete(page)).find((p) => p.id === "p-1").aktiv === true && !/Archiv \(/.test(await page.locator("#ansicht").innerText()));
    await page.locator('[data-bk-archiv="p-1"]').click(); await page.waitForTimeout(250);
    await page.locator(".bk-archiv summary").click();
    await page.locator('[data-bk-zurueck="p-1"]').click(); await page.waitForTimeout(250);
    pruefe("B4c „Zurückholen“ aus dem Archiv", (await pakete(page)).find((p) => p.id === "p-1").aktiv === true);
    await page.locator('[data-bk-kopie="p-1"]').click(); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    pruefe("B4d Kopieren: Name „… (Kopie)“, gleiche Posten", (await d.locator('input[name="name"]').inputValue()) === "Boost-Paket 1 (Kopie)" && await d.locator(".bk-posten").count() === 2);
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(250);
    const alle = await pakete(page);
    pruefe("B4e Kopie ist eine neue Vorlage, das Original bleibt", alle.length === 3 && alle.find((p) => p.id === "p-1").name === "Boost-Paket 1" && alle.some((p) => p.name === "Boost-Paket 1 (Kopie)" && p.id !== "p-1"));
    await page.waitForTimeout(500); // nach dem Schließen nimmt die Liste kurz keine Tipps an (Geister-Tipp)
    await page.locator('[data-bk-bearbeiten="p-turbo"]').click(); await page.waitForTimeout(150);
    const dt = page.locator(dlgSel).last();
    pruefe("B4f Turboboost: Name nicht änderbar (⚡ hängt am Namen)", await dt.locator('input[name="name"]').getAttribute("readonly") !== null && /bleibt so/.test(await dt.innerText()));
    await dt.locator("[data-schliessen]").first().click();
    pruefe("B4g keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // B5 Alte Datenbank: kein Reiter, keine neuen Preis-Arten, kein Fehler
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", vorbereiten: altDb });
    pruefe("B5a alte DB: kein Reiter, #preise?reiter=pakete zeigt die Preise", await page.locator(".bk-reiter").count() === 0 && await page.locator("#prNeu").count() === 1 && await page.locator("#bkNeu").count() === 0);
    await page.click("#prNeu"); await page.waitForTimeout(150);
    const arten = await page.locator(dlgSel).last().locator('select[name="art"] option').evaluateAll((o) => o.map((x) => x.value));
    pruefe("B5b alte DB: „Lernapp“ und „Simulator“ nicht wählbar", !arten.includes("lernapp") && !arten.includes("simulator") && arten.includes("grundbetrag"), arten.join(","));
    pruefe("B5c alte DB: keine Konsolenfehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // B6 Neue DB: Preis „Simulator“ anlegen, Baukasten nimmt ihn
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", hash: "#preise" });
    await page.click("#prNeu"); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    await d.locator('select[name="art"]').selectOption("simulator");
    pruefe("B6a Simulator wählbar, Bezeichnung vorgeschlagen, keine Klasse", (await d.locator('input[name="bezeichnung"]').inputValue()) === "Simulator" && await d.locator('select[name="klasse"]').isDisabled());
    await d.locator('input[name="betrag"]').fill("49");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(250);
    await page.click('.bk-reiter a:has-text("Pakete")'); await page.waitForTimeout(200);
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    await chip(page, "Simulator");
    pruefe("B6b Baukasten: Simulator 49 € aus der Preisliste", (await page.locator(dlgSel).last().locator('[data-bk-preis="0"]').inputValue()) === "49,00");
    await ctx.close();
  }
  // B7 Speichern scheitert an fehlender Spalte (DB-Stand gemischt): Reiter verschwindet, kein Absturz
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: function () { F.tabellen.fahrschule_pakete = []; F.fehlerPakete = true; } });
    await page.evaluate(() => { window.__FAKE.fehler = { fahrschule_pakete: 'column "posten" of relation "fahrschule_pakete" does not exist' }; });
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    await d.locator('input[name="name"]').fill("X");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(250);
    pruefe("B7 fehlende Spalte: Meldung, danach kein Reiter „Pakete“ mehr", /noch nicht eingerichtet/.test(await page.locator("body").innerText()) && await page.locator(".bk-reiter").count() === 0);
    await ctx.close();
  }
  // B8 Handy 360 und 412 px: nichts ragt heraus, Tippflächen ≥ 44 px
  for (const [b, h] of [[360, 740], [412, 900], [740, 360]]) {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: preise, breite: b, hoehe: h });
    const breitL = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.locator('[data-bk-bearbeiten="p-1"]').click(); await page.waitForTimeout(150);
    await chip(page, "Sonderfahrt"); await chip(page, "Sonstiges");
    const m = await page.evaluate(() => {
      const d = [...document.querySelectorAll("dialog[open]")].pop();
      const inh = d.querySelector(".dialog-inhalt");
      const zuBreit = [...d.querySelectorAll(".bk-posten *, .bk-gesamt *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > d.getBoundingClientRect().right + 1; }).map((e) => e.className || e.tagName);
      const klein = [...d.querySelectorAll(".bk-posten button, .bk-chip, .bk-stepper input, .bk-preisfeld input")].filter((e) => e.getBoundingClientRect().height < 43.5 || (e.tagName === "BUTTON" && e.getBoundingClientRect().width < 43.5)).map((e) => e.textContent || e.tagName);
      return { scroll: inh.scrollWidth - inh.clientWidth, zuBreit, klein };
    });
    pruefe(`B8 ${b}×${h}: Liste ohne Querscrollen, Fenster ohne Überstand, Tippflächen ≥ 44 px`, breitL <= b && m.scroll <= 1 && !m.zuBreit.length && !m.klein.length, JSON.stringify({ breitL, ...m }));
    if (b === 360) await page.screenshot({ path: (process.env.BK_BILDER || "/tmp") + "/bk-360.png" });
    await ctx.close();
  }
  // B9 Schüler-Dialog: archivierte Pakete nicht mehr zur Auswahl (außer dem, das der Schüler hat)
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", hash: "#schueler", vorbereiten: function () { F.tabellen.fahrschule_pakete.push({ id: "p-alt", fahrschule_id: F.tabellen.fahrschulen[0].id, name: "Altes Paket", reihenfolge: 5, aktiv: false, klasse: null, posten: [] }); } });
    const ok1 = await page.evaluate(() => { schuelerDialog(null); const d = [...document.querySelectorAll("dialog[open]")].pop(); const o = [...d.querySelectorAll('select[name="paket_id"] option, [data-bk-wahl] option')].map((x) => x.textContent); return o; });
    pruefe("B9 neuer Schüler: „Altes Paket“ (archiviert) nicht in der Auswahl", !ok1.some((o) => o.startsWith("Altes Paket")) && ok1.some((o) => o.startsWith("Turboboost")), ok1.join(","));
    await ctx.close();
  }
  // B11 Zwei Personen an derselben Vorlage: die zweite Speicherung überschreibt nicht still
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: preise });
    await page.locator('[data-bk-bearbeiten="p-1"]').click(); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    // inzwischen speichert jemand anderes (andere Posten, neuer Zeitstempel)
    await page.evaluate(() => { const p = window.__FAKE.tabellen.fahrschule_pakete.find((x) => x.id === "p-1"); p.name = "Von Kollegin"; p.posten = [{ art: "simulator", bezeichnung: "Simulator", anzahl: 2, preis_cent_fest: 5000 }]; p.aktualisiert_am = "2026-11-24T09:00:00.000Z"; });
    await d.locator('input[name="name"]').fill("Meine Änderung");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(400);
    const p1 = (await pakete(page)).find((p) => p.id === "p-1");
    pruefe("B11 gleichzeitig geändert: nichts überschrieben, Hinweis, neu geladen", p1.name === "Von Kollegin" && p1.posten.length === 1 && /Jemand anderes/.test(await page.locator("body").innerText()), JSON.stringify([p1.name, p1.posten.length]));
    pruefe("B11b nach dem Hinweis ist das Fenster zu (kein Speichern mehr auf altem Stand)", await page.locator(dlgSel).count() === 0);
    await ctx.close();
  }
  // B12 Preis mit Komma und Tausenderpunkt, unlesbarer Preis sperrt; B13 Hinweis nennt die verwendete Preisposition
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: preise });
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    await d.locator('input[name="name"]').fill("Komma-Test");
    await chip(page, "Grundbetrag"); await chip(page, "Übungsstunden");
    pruefe("B13 Hinweis: „aus der Preisliste (Übungsfahrstunde)“", /aus der Preisliste \(Übungsfahrstunde\)/.test(await d.locator('[data-bk-hinweis="1"]').innerText()), await d.locator('[data-bk-hinweis="1"]').innerText());
    await d.locator('[data-bk-preis="0"]').fill("abc");
    pruefe("B12a „abc“: rot markiert, Gesamt mit „ab“", (await d.locator('[data-bk-preis="0"]').getAttribute("aria-invalid")) === "true" && /^ab /.test(await gesamt(page)));
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(200);
    pruefe("B12b unlesbarer Preis: nicht gespeichert", await page.locator(dlgSel).count() === 1 && !(await pakete(page)).some((p) => p.name === "Komma-Test"));
    await d.locator('[data-bk-preis="0"]').fill("65,");
    pruefe("B12d „65,“ beim Tippen ist nicht rot", (await d.locator('[data-bk-preis="0"]').getAttribute("aria-invalid")) === "false");
    await d.locator('[data-bk-preis="0"]').fill("1.299,00");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(300);
    const neu = (await pakete(page)).find((p) => p.name === "Komma-Test");
    pruefe("B12c „1.299,00“ → 129900 Cent", !!neu && neu.posten[0].preis_cent_fest === 129900, neu && JSON.stringify(neu.posten[0]));
    await ctx.close();
  }
  // B14 Alte Datenbank und gar keine Vorlagen: Nachfrage erkennt die fehlende Spalte, kein Reiter
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: function () { F.tabellen.fahrschule_pakete = []; } });
    pruefe("B14a ohne Vorlagen (neue DB): Reiter da", await page.locator(".bk-reiter").count() === 1);
    await page.evaluate(async () => { window.__FAKE.fehler = { fahrschule_pakete: 'column fahrschule_pakete.posten does not exist' }; S.bkFehlt = false; await bkPruefeSpalten(); });
    await page.waitForTimeout(150);
    pruefe("B14b ohne Vorlagen (alte DB): Spalte fehlt erkannt, Reiter weg", await page.locator(".bk-reiter").count() === 0);
    await ctx.close();
  }
  // B15 Namen: kein zweites „Turboboost“, keine doppelten Namen, zweite Kopie bekommt „(Kopie 2)“; Geister-Tipp nach Speichern
  {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", vorbereiten: preise });
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    let d = page.locator(dlgSel).last();
    await d.locator('input[name="name"]').fill("turboboost");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(200);
    pruefe("B15a „turboboost“ als neuer Name abgelehnt", await page.locator(dlgSel).count() === 1 && (await pakete(page)).length === 2);
    await d.locator('input[name="name"]').fill("Boost-Paket 1");
    await d.locator("button[value=ok]").click(); await page.waitForTimeout(200);
    pruefe("B15b doppelter Name abgelehnt", await page.locator(dlgSel).count() === 1 && (await pakete(page)).length === 2);
    await d.locator("[data-schliessen]").first().click(); await page.waitForTimeout(100);
    if (await page.locator(dlgSel).count()) { await page.locator(dlgSel).last().locator("button[value=ok]").click(); await page.waitForTimeout(150); }
    await page.waitForTimeout(600);
    await page.locator('[data-bk-kopie="p-1"]').click(); await page.waitForTimeout(150);
    await page.locator(dlgSel).last().locator("button[value=ok]").click(); await page.waitForTimeout(700);
    await page.locator('[data-bk-kopie="p-1"]').click(); await page.waitForTimeout(150);
    pruefe("B15c zweite Kopie: „Boost-Paket 1 (Kopie 2)“", (await page.locator(dlgSel).last().locator('input[name="name"]').inputValue()) === "Boost-Paket 1 (Kopie 2)");
    // Geister-Tipp: Speichern und sofort danach auf „Archivieren“ (liegt darunter)
    await page.locator(dlgSel).last().locator("button[value=ok]").click();
    await page.waitForTimeout(60);
    await page.locator('[data-bk-archiv="p-1"]').click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
    pruefe("B15d Tipp direkt nach dem Schließen archiviert nichts", (await pakete(page)).every((p) => p.aktiv !== false));
    await ctx.close();
  }
  // B16 Fenster verrutscht nicht, wenn Posten dazukommen (Vorlese-Text hängt am Preisfeld)
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: preise, breite: 412, hoehe: 800 });
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    for (const c of ["Grundbetrag", "Übungsstunden", "Sonderfahrt", "Sonderfahrt", "Lernapp", "Simulator", "Sonstiges"]) await chip(page, c);
    const m = await page.evaluate(() => { const d = [...document.querySelectorAll("dialog[open]")].pop(); return { oben: d.scrollTop, ueber: d.scrollHeight - d.clientHeight, kopf: d.querySelector("header").getBoundingClientRect().top >= d.getBoundingClientRect().top - 1 }; });
    pruefe("B16 Fenster bleibt oben (Kopfzeile mit ✕ sichtbar, Fenster selbst scrollt nicht)", m.oben === 0 && m.ueber <= 1 && m.kopf, JSON.stringify(m));
    await ctx.close();
  }
  // B17 (Fable) Enter im Preisfeld speichert nicht; Sonderfahrt-Preis bei klein geschriebener Preisliste; doppelte Sonderfahrt
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: function () {
      const fs = F.tabellen.fahrschulen[0].id;
      F.tabellen.fahrschule_preise = [{ id: "pu", fahrschule_id: fs, art: "sonderfahrt", klasse: "B", bezeichnung: "überlandfahrt", einheit: "45min", betrag_cent: 9900, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" }];
    } });
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    const d = page.locator(dlgSel).last();
    await d.locator('input[name="name"]').fill("Enter-Test");
    await chip(page, "Sonderfahrt"); await chip(page, "Sonderfahrt");
    pruefe("B17a „überlandfahrt“ (klein) gilt für Überland, nicht für Autobahn", (await d.locator('[data-bk-preis="0"]').inputValue()) === "99,00" && (await d.locator('[data-bk-preis="1"]').inputValue()) === "", [await d.locator('[data-bk-preis="0"]').inputValue(), await d.locator('[data-bk-preis="1"]').inputValue()]);
    await d.locator('[data-bk-preis="1"]').fill("88");
    await d.locator('[data-bk-preis="1"]').press("Enter"); await page.waitForTimeout(200);
    pruefe("B17b Enter im Preisfeld: Fenster bleibt offen, nichts gespeichert", await page.locator(dlgSel).count() === 1 && !(await pakete(page)).some((p) => p.name === "Enter-Test"));
    await d.locator('[data-bk-sonder="1"]').selectOption("Überlandfahrt"); await page.waitForTimeout(100);
    pruefe("B17c dieselbe Sonderfahrt zweimal wird abgelehnt", (await d.locator('[data-bk-sonder="1"]').inputValue()) === "Autobahnfahrt");
    await ctx.close();
  }
  // B18 Kein Posten hat einen Preis: unten steht „Preis fehlt“, nicht „ab 0,00 €“
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: function () { F.tabellen.fahrschule_preise = []; } });
    await page.click("#bkNeu"); await page.waitForTimeout(150);
    await chip(page, "Grundbetrag"); await chip(page, "Übungsstunden");
    pruefe("B18 alle Preise fehlen: „Preis fehlt“", (await gesamt(page)) === "Preis fehlt", await gesamt(page));
    await ctx.close();
  }
  // B10 Migration (statisch): Büro ohne Löschrecht, feste Kopie, Rückweg
  {
    const sql = await readFile(join(ROOT, "supabase/migrations/20261124_paket_01_baukasten.sql"), "utf8");
    pruefe("B10a Büro: anlegen und ändern, keine Lösch-Regel", /"Buero legt Pakete an"[^;]*for INSERT/.test(sql) && /"Buero aendert Pakete"[^;]*for UPDATE/.test(sql) && !/Buero[^"]*" on public.fahrschule_pakete[^;]*for DELETE/i.test(sql));
    pruefe("B10b verkaufte Pakete: kein Löschen, ein aktives je Schüler", !/on public.schueler_pakete for delete/i.test(sql) && /schueler_pakete_ein_aktives[^;]*where storniert_am is null/.test(sql) && !/grant[^;]*delete[^;]*schueler_pakete/i.test(sql));
    pruefe("B10c Preis-Arten lernapp und simulator", /'lernapp','simulator'/.test(sql));
    pruefe("B10d Rückweg vorhanden", (await readFile(join(ROOT, "supabase/rueckweg/20261124_paket_rueckweg.sql"), "utf8")).includes("drop table if exists public.schueler_pakete"));
  }
} catch (e) { schlecht++; console.log("FEHLER  Test-Ausnahme: " + (e && e.stack || e)); }
await browser.close(); server.close();
console.log(`\n${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
