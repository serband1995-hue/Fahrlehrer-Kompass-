// W15 Schritt 2: Reiter „Läuft bald ab“ auf der Fristen-Seite im Büro (echter Browser, erfundene Daten).
// Die erwartete Liste rechnet der Test selbst mit kompass-rechnen.js aus den Attrappen-Daten (unabhängig von buero.js).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/laeuft-ab-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const KR = require("../kompass-rechnen.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const d0 = new Date(); const HEUTE = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
const tag = (n) => KR.addDaysISO(HEUTE, n);

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
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let ok = 0, schlecht = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { schlecht++; console.log("FEHLER  " + name + (info ? " · " + info : "")); } }

// Zusatz für die Attrappe: ein Fahrlehrer mit Führerschein C/CE in 40 Tagen, ein Schüler mit Reaktivierung heute, eine abgelaufene Frist
const ZUSATZ = (fs) => {
  const p = fs.tabellen.profiles.find((x) => x.rolle === "fahrlehrer" && x.aktiv !== false);
  p.fuehrerschein_c_bis = "__IN40";
  const s3 = fs.tabellen.schueler.find((x) => x.id === "s3"); s3.reakt_status = "bezahlt"; s3.reakt_bezahlt_bis = "__HEUTE";
  const s4 = fs.tabellen.schueler.find((x) => x.id === "s4"); s4.theorie_frist_bis = "__VOR3"; s4.theorie_bestanden_am = null;
  return p.id;
};
const zusatzCode = (code) => code.toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "").replace(/return p\.id;/, "").replaceAll("fs.", "F.")
  .replaceAll("__IN40", tag(40)).replaceAll("__HEUTE", HEUTE).replaceAll("__VOR3", tag(-3));

async function oeffne({ hash = "#fristen?ansicht=bald", vorbereiten = "", breite = 1366 }) {
  const daten = bauDaten(HEUTE);
  const ctx = await browser.newContext({ viewport: { width: breite, height: 860 } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: "ad-1", email: "leitung@example.org" } } };
    if (v) (new Function("F", v))(window.__FAKE);
  }, [daten, vorbereiten]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  await page.waitForFunction(() => { const a = document.getElementById("ansicht"); return a && !/Daten werden geladen/.test(a.textContent); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(200);
  return { page, ctx, konsole };
}
const zeilenLesen = (page) => page.$$eval("[data-baldliste] tbody tr", (trs) => trs.map((tr) => ({ art: tr.dataset.bald, name: tr.querySelector("td b").textContent, am: tr.children[2].textContent.trim(), noch: tr.children[3].textContent.trim() })));

// Erwartung aus den Attrappen-Daten (gleiche Regeln, unabhängig gerechnet)
function erwartet(daten) {
  const out = [];
  const de = (iso) => iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(0, 4);
  for (const s of daten.tabellen.schueler.filter((x) => !x.inaktiv_seit && x.status !== "geloescht")) {
    const r = KR.reaktInfo(s, HEUTE), t = KR.theorieInfo(s, HEUTE), a = KR.antragInfo(s, HEUTE), tf = KR.theorieFristInfo(s, HEUTE), u = KR.umschreibInfo(s, HEUTE);
    if (["bald", "demnaechst"].includes(r.stufe)) out.push({ art: "reaktivierung", name: s.name, d: r.faellig });
    if (["bald", "demnaechst"].includes(t.stufe)) out.push({ art: "theorie", name: s.name, d: t.ablauf });
    if (a.stufe === "bald" && a.tage >= 0) out.push({ art: "antrag", name: s.name, d: a.ablauf });
    if (["bald", "demnaechst"].includes(tf.stufe)) out.push({ art: "behoerde", name: s.name, d: tf.ablauf });
    if (u.stufe === "bald") out.push({ art: "umschreiber", name: s.name, d: u.bis });
  }
  return out.map((x) => ({ art: x.art, name: x.name, am: de(x.d) }));
}

try {
  const daten = bauDaten(HEUTE);
  const F = { tabellen: daten.tabellen };
  (new Function("F", zusatzCode(ZUSATZ)))(F);
  const erw = erwartet(daten);
  const flName = daten.tabellen.profiles.find((x) => x.fuehrerschein_c_bis).name;

  // L1 Reiter da, Liste vollständig und nach Datum
  {
    const { page, ctx, konsole } = await oeffne({ vorbereiten: zusatzCode(ZUSATZ) });
    const tab = await page.locator('.tabs a[href="#fristen?ansicht=bald"]').getAttribute("aria-current");
    pruefe("L1a Reiter „Läuft bald ab“ ist offen", tab === "page");
    const z = await zeilenLesen(page);
    const sch = z.filter((x) => x.art !== "fahrlehrer").map((x) => x.art + "|" + x.name + "|" + x.am).sort();
    const soll = erw.map((x) => x.art + "|" + x.name + "|" + x.am).sort();
    pruefe("L1b alle Schüler-Fristen wie unabhängig gerechnet (" + soll.length + ")", JSON.stringify(sch) === JSON.stringify(soll), "ist " + sch.length + ": " + sch.join(" ; ") + " · soll: " + soll.join(" ; "));
    pruefe("L1c mehrere Arten in einer Liste", new Set(z.map((x) => x.art)).size >= 3, [...new Set(z.map((x) => x.art))].join(","));
    const iso = z.map((x) => x.am.split(".").reverse().join("-"));
    pruefe("L1d nach Datum sortiert", iso.every((d, i) => i === 0 || iso[i - 1] <= d), iso.join(","));
    pruefe("L1e nichts Abgelaufenes (Behörden-Frist vor 3 Tagen fehlt)", iso.every((d) => d >= HEUTE) && !z.some((x) => x.art === "behoerde" && x.am === tag(-3).split("-").reverse().join(".")));
    pruefe("L1f Reaktivierung heute fällig: „heute“", z.some((x) => x.art === "reaktivierung" && x.noch === "heute"));
    pruefe("L1g Fahrlehrer mit Führerschein C/CE in 40 Tagen", z.some((x) => x.art === "fahrlehrer" && x.name === flName && x.noch === "in 40 Tagen"), JSON.stringify(z.filter((x) => x.art === "fahrlehrer")));
    const kachel = await page.locator("[data-kachelbald] .wert").innerText();
    pruefe("L1h Kachel zählt dieselben Einträge", Number(kachel) === z.length, kachel + " vs " + z.length);
    const zaehler = await page.evaluate(() => zaehleFristen().laeuftAb);
    pruefe("L1i zaehleFristen().laeuftAb (für die Leiste von W11)", zaehler === z.length, zaehler + " vs " + z.length);
    // Akte öffnen: Schüler und Fahrlehrer
    await page.locator('[data-baldwer="schueler"]').first().click();
    await page.waitForTimeout(300);
    pruefe("L2a „Akte öffnen“ öffnet die Schüler-Akte", await page.locator("dialog[open]").count() === 1);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    if (await page.locator("dialog[open]").count()) { await page.locator("dialog[open] [data-schliessen]").first().click().catch(() => {}); await page.waitForTimeout(200); }
    await page.locator('[data-baldwer="fahrlehrer"]').first().click();
    await page.waitForTimeout(300);
    const flTitel = await page.locator("dialog[open]").last().innerText().catch(() => "");
    pruefe("L2b „Akte öffnen“ beim Fahrlehrer öffnet seine Akte", flTitel.includes(flName), flTitel.slice(0, 80));
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    const groesse = await page.locator('[data-baldakte]').first().boundingBox();
    pruefe("L2c Knopf mindestens 44 px hoch", groesse && groesse.height >= 44, groesse && groesse.height);
    const kachelKlasse = await page.locator("[data-kachelbald]").getAttribute("class");
    pruefe("L2e Kachel ohne gelbe Fläche (Design-Kritiker)", !/gold|gelb/.test(kachelKlasse || ""), kachelKlasse);
    pruefe("L2d keine Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // L3 Suche filtert
  {
    const ziel = erw[0];
    const { page, ctx } = await oeffne({ hash: "#fristen?ansicht=bald&suche=" + encodeURIComponent(ziel.name.split(" ")[0].toLowerCase()), vorbereiten: zusatzCode(ZUSATZ) });
    const z = await zeilenLesen(page);
    pruefe("L3 Suche: nur passende Namen", z.length >= 1 && z.every((x) => x.name.toLowerCase().includes(ziel.name.split(" ")[0].toLowerCase())), JSON.stringify(z));
    await ctx.close();
  }
  // L4 Reaktivierung entfällt (Schritt 1): keine Reaktivierungs-Zeilen mehr
  {
    const preis = `F.tabellen.fahrschule_preise = [{ id: "rp", fahrschule_id: F.tabellen.fahrschulen[0].id, art: "reaktivierung", klasse: null, bezeichnung: "Reaktivierung", einheit: "pauschal", betrag_cent: null, gueltig_ab: "${tag(-1)}", angelegt_von: "ad-1", angelegt_am: "${tag(-1)}T10:00:00Z" }];`;
    const { page, ctx } = await oeffne({ vorbereiten: zusatzCode(ZUSATZ) + preis });
    const z = await zeilenLesen(page);
    pruefe("L4 Reaktivierung entfällt: keine Reaktivierungs-Zeilen", !z.some((x) => x.art === "reaktivierung") && z.length > 0, JSON.stringify(z.map((x) => x.art)));
    await ctx.close();
  }
  // L5 leer
  {
    const { page, ctx } = await oeffne({ vorbereiten: "F.tabellen.schueler = []; F.tabellen.profiles.forEach((p) => { p.fuehrerschein_c_bis = null; p.fuehrerschein_d_bis = null; p.sz95_bis = null; p.fortbildung_bis = null; });" });
    const t = await page.locator("#ansicht").innerText();
    pruefe("L5 nichts da: „In den nächsten Wochen läuft nichts ab.“", /In den nächsten Wochen läuft nichts ab\./.test(t));
    await ctx.close();
  }
  // L6 Handy 360 und 412 px, hoch und quer, Tablet: kein waagrechtes Scrollen, Reiter erreichbar
  for (const [b, h] of [[360, 740], [412, 860], [740, 360], [820, 1180], [1024, 768]]) { // dazu Tablet hoch und quer (Prüf-Team W15 PR 2)
    const { page, ctx, konsole } = await oeffne({ breite: b, vorbereiten: zusatzCode(ZUSATZ) });
    await page.setViewportSize({ width: b, height: h });
    await page.waitForTimeout(200);
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    pruefe(`L6 ${b}×${h}: kein waagrechtes Scrollen`, ueber <= 1, "überstand " + ueber + " px");
    // Prüf-Team W15: jeder Knopf „Akte öffnen“ und jede „Noch“-Pill liegt ganz im Bild (nicht abgeschnitten, ohne Wischen)
    const imBild = await page.evaluate(() => {
      const w = document.documentElement.clientWidth, raus = [];
      document.querySelectorAll("[data-baldliste] [data-baldakte], [data-baldliste] [data-balderinnern], [data-baldliste] .bald-noch .marke-pill, [data-baldliste] .bald-am").forEach((el) => {
        const r = el.getBoundingClientRect(); if (r.left < 0 || r.right > w + 0.5 || r.width === 0) raus.push(el.className + ":" + Math.round(r.right));
      });
      return raus;
    });
    pruefe(`L6 ${b}×${h}: Knopf, Datum und „Noch“ ganz sichtbar`, imBild.length === 0, imBild.slice(0, 4).join(" "));
    await page.locator("[data-baldakte]").first().scrollIntoViewIfNeeded();
    await page.locator("[data-baldakte]").first().click({ timeout: 3000 });
    await page.waitForTimeout(250);
    pruefe(`L6 ${b}×${h}: „Akte öffnen“ antippbar`, await page.locator("dialog[open]").count() === 1);
    pruefe(`L6 ${b}×${h}: keine Konsolenfehler`, konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
} catch (e) {
  schlecht++; console.log("FEHLER  Abbruch: " + (e && e.stack || e));
} finally {
  await browser.close();
  server.close();
}
console.log(`\nLäuft-bald-ab-Test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
