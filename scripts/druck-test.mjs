// W26 Teil 5: Einheitliches Druckbild (kompass-druck.js) in Büro und App. Erfundene Daten (Nachname „Muster“), nichts verlässt den Browser.
// Prüft je Druckstelle: A4 (hoch/quer wie gewollt), Kopf mit Fahrschulname, keine Knöpfe/Navigation im Druck, nichts breiter als die Seite,
// keine leeren Platzhalter („undefined“, „null“, „NaN“), Tabellen mit wiederholtem Kopf bei mehreren Seiten, Bildschirm-Ansicht unverändert.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/druck-test.mjs        (Option: DRUCK_AUS=/ordner  → schreibt die PDFs dorthin)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const AUS = process.env.DRUCK_AUS || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
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
const mm = (pt) => Math.round(pt / 72 * 25.4);
// Seitengröße und Seitenzahl aus dem PDF lesen (ohne Zusatzprogramm)
function pdfInfo(buf) {
  const t = buf.toString("latin1");
  const seiten = [...t.matchAll(/\/Type\s*\/Page[^s]/g)].length;
  const m = t.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  const b = m ? mm(Number(m[1])) : 0, h = m ? mm(Number(m[2])) : 0;
  return { seiten, breite: b, hoehe: h, quer: b > h, a4: [b, h].sort((x, y) => x - y).join("x") === "210x297" };
}
// Druck-HTML in neuer Seite öffnen, wie ein Druckfenster rendern und prüfen
async function drucke(name, html, erwartung) {
  const p = await browser.newPage();
  const logoAn = !!erwartung.logo;
  await p.route("**/logos/*.png", (r) => (logoAn ? r.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") }) : r.abort()));
  await p.goto(basis + "buero.html?leer");
  await p.setContent(html.replace(/<head>/, `<head><base href="${basis}">`));
  await p.waitForTimeout(250);
  await p.emulateMedia({ media: "print" });
  const dom = await p.evaluate(() => {
    const sichtbar = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
    const zu_breit = [...document.querySelectorAll("body *")].filter((e) => sichtbar(e) && e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map((e) => e.tagName + "." + e.className).slice(0, 4);
    return {
      text: document.body.innerText, knoepfe: [...document.querySelectorAll("button,.nicht-drucken,.leiste,nav")].filter(sichtbar).length,
      zu_breit, kopf: !!document.querySelector(".dkopf,header,.kopf"), bilder: document.images.length,
      thead: [...document.querySelectorAll("table")].every((t) => !t.tHead || getComputedStyle(t.tHead).display === "table-header-group"),
    };
  });
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  if (AUS) await writeFile(join(AUS, name + ".pdf"), pdf);
  await p.close();
  return { dom, info: pdfInfo(pdf) };
}
const pruefeDok = (id, text, name, html, erw) => pruefe(id, text, async () => {
  const { dom, info } = await drucke(name, html, erw);
  const f = [];
  if (!info.a4) f.push(`nicht A4: ${info.breite}x${info.hoehe} mm`);
  if (info.quer !== !!erw.quer) f.push(erw.quer ? "sollte quer sein" : "sollte hoch sein");
  if (erw.seiten && info.seiten < erw.seiten) f.push(`nur ${info.seiten} Seite(n), erwartet ≥ ${erw.seiten}`);
  if (!dom.text.includes(erw.fahrschule)) f.push("Fahrschulname fehlt im Kopf");
  for (const t of erw.enthaelt || []) if (!dom.text.includes(t)) f.push("fehlt: " + t);
  for (const t of erw.ohne || []) if (dom.text.includes(t)) f.push("steht drin: " + t);
  if (/undefined|\bnull\b|NaN|\[object/.test(dom.text)) f.push("leerer Platzhalter im Text");
  if (dom.knoepfe) f.push(`${dom.knoepfe} Knopf/Navigation im Druck sichtbar`);
  if (dom.zu_breit.length) f.push("breiter als die Seite: " + dom.zu_breit.join(","));
  if (!dom.thead) f.push("Tabellenkopf wiederholt sich nicht");
  if (erw.logo && dom.bilder < 1) f.push("Logo fehlt");
  if (!erw.logo && dom.bilder > 0 && !erw.bilderOk) f.push("Bild ohne Logo-Datei bleibt stehen (Lücke)");
  return f;
});

const FS_NAME = "Vorführ-Fahrschule";
const TEST_PIN = "7352";
async function oeffne(nutzer, hash, breite = 1366) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 860 } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error" && !/\/logos\/[^/]+\.png|Failed to load resource/.test(m.text() + (m.location() || {}).url)) konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  const d = bauDaten(HEUTE);
  const s1 = d.tabellen.schueler[0];
  for (let i = 0; i < 40; i++) d.tabellen.schueler.push({ ...s1, id: "dx" + i, name: "Erika Muster-Langername " + (i + 1), telefon: "0151 000" + i });
  await page.addInitScript(([dd, s]) => { window.__FAKE = { tabellen: dd.tabellen, konten: dd.konten, session: s }; }, [d, { user: { id: nutzer, email: nutzer + "@example.org" } }]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
  if (frage) { await page.click(`#werListe button:has-text("Paula Muster")`); await page.keyboard.type(TEST_PIN, { delay: 20 }); await page.waitForTimeout(200); }
  await page.waitForTimeout(500);
  return { page, ctx, konsole };
}

try {
  // ---------- Büro: Listen ----------
  const { page, ctx, konsole } = await oeffne("bu-1", "#schueler");
  await page.evaluate(() => { S.fs.slug = "boost"; });
  const gehe = async (h) => { await page.evaluate((x) => { location.hash = "#" + x; }, h); await page.waitForTimeout(600); };
  const liste = async (h, quer) => {
    await gehe(h);
    const vorher = await page.evaluate(() => { const r = document.getElementById("ansicht").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), document.documentElement.scrollWidth]; });
    const sichtVorher = await page.evaluate(() => getComputedStyle(document.getElementById("druckKopf")).display);
    await page.route("**/logos/boost.png", (r) => r.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") }));
    await page.evaluate(() => fuelleDruckKopf());
    await page.waitForTimeout(150);
    const nach = await page.evaluate(() => { const r = document.getElementById("ansicht").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), document.documentElement.scrollWidth]; });
    const sichtNach = await page.evaluate(() => getComputedStyle(document.getElementById("druckKopf")).display);
    await page.emulateMedia({ media: "print" });
    const dom = await page.evaluate(() => {
      const sichtbar = (s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length > 0).length;
      return { kopf: document.getElementById("druckKopf").innerText, quer: document.documentElement.classList.contains("druck-quer"),
        menue: sichtbar(".seite") + sichtbar("header.kopf") + sichtbar("#drucken") + sichtbar(".toast") + sichtbar("dialog[open]") + sichtbar(".tabs"),
        logo: !!document.querySelector("#druckKopf img.dlogo") };
    });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    if (AUS) await writeFile(join(AUS, "buero-" + h + ".pdf"), pdf);
    await page.emulateMedia({ media: "screen" });
    return { vorher, nach, sichtVorher, sichtNach, dom, info: pdfInfo(pdf) };
  };
  for (const [h, quer, seiten] of [["schueler", false, 3], ["kalender", true, 1], ["zahlen", false, 2], ["heute", false, 1], ["fristen", false, 2]]) {
    const r = await liste(h, quer);
    await pruefe("L-" + h, `Büro #${h}: A4 ${quer ? "quer" : "hoch"}, Kopf mit Fahrschule und Logo, ohne Menü/Knöpfe, ${seiten > 1 ? "mehrere Seiten, " : ""}Bildschirm unverändert`, () => {
      const f = [];
      if (!r.info.a4) f.push(`nicht A4 ${r.info.breite}x${r.info.hoehe}`);
      if (r.info.quer !== quer) f.push(quer ? "sollte quer sein" : "sollte hoch sein");
      if (r.info.seiten < seiten) f.push(`${r.info.seiten} Seiten, erwartet ≥ ${seiten}`);
      if (!r.dom.kopf.includes(FS_NAME)) f.push("Fahrschulname fehlt im Kopf: " + r.dom.kopf.slice(0, 60));
      if (!r.dom.logo) f.push("Logo fehlt");
      if (r.dom.menue) f.push(`${r.dom.menue} Menü/Knopf/Dialog im Druck sichtbar`);
      if (/undefined|\bnull\b|NaN/.test(r.dom.kopf)) f.push("Platzhalter im Kopf");
      if (r.sichtVorher !== "none" || r.sichtNach !== "none") f.push("Druckkopf am Bildschirm sichtbar");
      if (r.vorher.join() !== r.nach.join()) f.push(`Bildschirm-Ansicht verändert: ${r.vorher} → ${r.nach}`);
      return f;
    });
  }
  // Schülerliste: auch die Seitenränder gehören dazu (Seite x von y steht im PDF-Fuß; hier: mehr als eine Seite wird nicht abgeschnitten)

  // ---------- Büro: Druckfenster (HTML wird abgefangen und wie ein Fenster gedruckt) ----------
  await page.evaluate(() => { window.__druck = []; DRUCK.fenster = (t, h) => { window.__druck.push([t, h]); return { document: { getElementById: () => null }, print() {}, close() {} }; }; S.fs.slug = "boost"; });
  const hole = async (js) => { await page.evaluate(js); const r = await page.evaluate(() => window.__druck.pop()); return r ? r[1] : ""; };

  // Anwesenheit (viele Teilnehmer, 2 Lektionen)
  const anw = await hole(() => {
    const ids = S.schueler.slice(0, 45).map((x) => x.id);
    S.theorie = ids.flatMap((id) => [{ schueler_id: id, datum: "2026-11-20", lektion: "3" }, { schueler_id: id, datum: "2026-11-20", lektion: "4" }]);
    druckeAnwesenheit("2026-11-20", "3", { von: "18:00", bis: "19:30" });
  });
  await pruefeDok("F-anw", "Anwesenheitsliste: A4 hoch, Kopf mit Logo, 45 Teilnehmer über mehrere Seiten, Tabellenkopf wiederholt", "anwesenheit", anw, { fahrschule: FS_NAME, logo: true, seiten: 2, enthaelt: ["Anwesenheit Theorieunterricht", "Unterschrift Fahrlehrer", "Lektion 3", "Lektion 4"] });

  // Monatsbericht
  const mb = await hole(() => luMonatsberichtOeffnen(new Date().toISOString().slice(0, 7)));
  await pruefeDok("F-mb", "Monatsbericht (Büro): A4 hoch, Kopf mit Logo, Tabellen vollständig", "monatsbericht", mb, { fahrschule: FS_NAME, logo: true, enthaelt: ["Monatsbericht", "aktive Schüler", "Je Fahrlehrer"] });

  // Ausbildungsnachweis (mit Kundennummer und Anschrift; 60 Fahrten → mehrere Seiten)
  const nw = await hole(() => {
    const x = Object.assign({}, S.schueler.find((y) => y.name && !/Langername/.test(y.name)), { kundennummer: 42, strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" });
    const t0 = S.termine.find((t) => t.schueler_id === x.id) || S.termine[0];
    const aktiv = Array.from({ length: 60 }, (_, i) => Object.assign({}, t0, { id: "nwx" + i, schueler_id: x.id, datum: "2026-0" + (1 + (i % 9)) + "-" + String(1 + (i % 27)).padStart(2, "0"), von: "10:00", bis: "10:45", geloescht: false, payload: Object.assign({}, t0.payload || {}, { art: "uebung" }) }));
    const d = { aktiv, papierkorb: [], spur: [], spurFehlt: false };
    nwDrucken(x, d, nwStand(x, d), false);
  });
  await pruefeDok("F-nw", "Ausbildungsnachweis: A4 hoch, Logo, Kundennummer K-00042 und Anschrift, Tabellenkopf wiederholt", "nachweis", nw, { fahrschule: FS_NAME, logo: true, seiten: 2, enthaelt: ["K-00042", "Musterweg 1, 12345 Musterstadt", "Kundennummer", "Anschrift"] });
  const nwOhne = await hole(() => {
    const x = Object.assign({}, S.schueler[0], { kundennummer: null, strasse: null, plz: null, ort: null });
    const d = { aktiv: [], papierkorb: [], spur: [], spurFehlt: false };
    nwDrucken(x, d, nwStand(x, d), false);
  });
  await pruefeDok("F-nw2", "Ausbildungsnachweis ohne Kundennummer/Anschrift: beide Zeilen entfallen, kein Platzhalter", "nachweis-ohne", nwOhne, { fahrschule: FS_NAME, logo: true, ohne: ["Kundennummer", "Anschrift", "K-"] });

  // Quittung (Vorbild): bleibt A4 hoch, Kopf mit Fahrschul-Angaben
  const bel = await hole(() => {
    const b = { id: "b1", nummer: 12, datum: "2026-11-27", betrag: 450, zweck: "Grundbetrag", zahlart: "ec", schueler_name: "Erika Muster", kundennummer: 12, schueler_adresse: { strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" }, aussteller: "Paula Muster", erstellt_am: "2026-11-27T10:15:00Z", fahrschule_daten: { name: "Vorführ-Fahrschule", anschrift: "Musterstraße 1\n12345 Musterstadt" }, steuer: null };
    window.__druck.push(["Quittung", belegHTML(b)]);
  });
  await pruefeDok("F-bel", "Quittung: A4 hoch, Kopf mit Fahrschule und Logo, Kundennummer, Anschrift, ein Blatt", "quittung", bel, { fahrschule: FS_NAME, logo: true, enthaelt: ["Quittung", "K-00012", "Musterweg 1"], seiten: 1 });
  const belOhneLogo = await hole(() => window.__druck.push(["Quittung", belegHTML({ id: "b2", nummer: 3, datum: "2026-11-20", betrag: 45, zweck: "Fahrstunden", zahlart: "ec", schueler_name: "Max Muster", fahrschule_daten: { name: "Vorführ-Fahrschule" } }, { logo: "" })]));
  await pruefeDok("F-bel2", "Quittung ohne Logo-Datei: kein Bild, keine Lücke", "quittung-ohne", belOhneLogo, { fahrschule: FS_NAME, logo: false });
  // Gemeinsames Druckbild: fehlende Logo-Datei → Bild wird entfernt (keine Lücke)
  await pruefe("F-logo", "Logo fehlt (404): Kopf zeigt keinen leeren Bildplatz", async () => {
    const r = await page.evaluate(async () => {
      const f = document.createElement("iframe"); document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(DRUCK.dokument({ titel: "Test", fahrschule: "Muster", logo: location.origin + "/logos/gibtesnicht.png", body: "<p>x</p>" })); f.contentDocument.close();
      await DRUCK.bereit(f.contentDocument, 1500);
      const n = f.contentDocument.images.length; f.remove(); return n;
    });
    return r === 0 ? null : "Bild bleibt stehen: " + r;
  });
  await pruefe("F-seite", "Randfelder: „Seite x von y“ und „Erstellt am“ im @page", async () => {
    const css = await page.evaluate(() => DRUCK.css({ titel: "Titel \"x\" \\ y" }));
    return [!/@page\{size:A4 portrait/.test(css) && "kein A4-hoch", !/counter\(page\) " von " counter\(pages\)/.test(css) && "keine Seitenzahl", !/Erstellt am/.test(css) && "kein Erstellt am", /Titel x +y/.test(css) ? null : "Anführungszeichen nicht entschärft"].filter(Boolean);
  });
  await pruefe("F-super", "Preise: „Super-Admin“ erscheint nicht als Verfasser", async () => {
    const r = await page.evaluate(() => { S.team = [{ id: "sa1", rolle: "super_admin", name: "" }, { id: "sa2", rolle: "super_admin", name: "Paula Muster" }]; return [prWer("sa1"), prWer("sa2")]; });
    return r[0] === "" && r[1] === "Paula Muster" ? null : JSON.stringify(r);
  });
  await pruefe("K-fehler", "keine JS-Fehler im Büro-Teil", () => konsole);
  await ctx.close();

  // ---------- App: Ausbildungsplan, Gesamtakte, Nutzungsbedingungen, Monatsbericht ----------
  const actx = await browser.newContext({ viewport: { width: 412, height: 800 } });
  const ap = await actx.newPage();
  const akonsole = [];
  ap.on("pageerror", (e) => akonsole.push(String(e)));
  await ap.route(/supabase\.co|googleapis|gstatic/, (r) => r.abort());
  await ap.goto(basis + "index.html"); await ap.waitForTimeout(700);
  const appHtml = await ap.evaluate(() => {
    const out = {}; DRUCK.fenster = (t, h) => { out[t] = h; return {}; };
    _authProfile = { id: "u1", name: "Anna Muster", fahrschule_name: "Fahrschule Muster", fahrschule_slug: "boost", rolle: "fahrlehrer" };
    const s = { id: "t1", name: "Erika Muster", form: "B", beginn: "2026-09-01" };
    _schuelerFristen["t1"] = { kundennummer: 12, strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" };
    ensure(s);
    for (let i = 1; i <= 24; i++) s.plan.stunden[i] = { d: "0" + (i % 9 + 1) + ".10.2026" };
    stufenFor(s).forEach((st) => st.items.forEach((it, k) => { s.plan.ampeln[it.id] = ["rot", "gelb", "gruen"][k % 3]; }));
    printPlan(s); const plan = out["Ausbildungsplan"]; printGesamtakte(s);
    const s2 = { id: "t2", name: "Max Muster", form: "B" }; ensure(s2); out["ohne"] = null; printPlan(s2); out["ohne"] = out["Ausbildungsplan"]; out["Ausbildungsplan"] = plan;
    printDoc("Nutzungsbedingungen & Haftungsausschluss", `<div class="pr-summary">${AGB_HTML}</div>`);
    // Monatsbericht der Fahrschul-Leitung
    _fsAgg = { fahrschule: { name: "Fahrschule Muster", slug: "boost" }, lehrer: [{ id: "l1", name: "Anna Muster" }] };
    try { fsMonatsberichtPDF(); } catch (e) { out["Monatsbericht-FEHLER"] = String(e); }
    return out;
  });
  const AF = "Fahrschule Muster";
  const appErw = { fahrschule: AF, logo: true };
  await pruefeDok("A-plan", "App Ausbildungsplan: A4 hoch, Logo, Kundennummer K-00012 und Anschrift im Kopf", "app-plan", appHtml["Ausbildungsplan"], { ...appErw, enthaelt: ["Erika Muster", "K-00012", "Musterweg 1, 12345 Musterstadt", "Ausbildungsplan"], seiten: 2 });
  await pruefeDok("A-plan2", "App Ausbildungsplan ohne Kundennummer/Anschrift: Zeilen entfallen", "app-plan-ohne", appHtml["ohne"], { ...appErw, ohne: ["Kundennummer", "Anschrift", "K-0"] });
  await pruefeDok("A-akte", "App Gesamtakte: A4 hoch, Logo, Kundennummer und Anschrift, mehrere Seiten", "app-akte", appHtml["Schüler-Gesamtakte"], { ...appErw, enthaelt: ["K-00012", "Musterweg 1", "Fahrstunden", "Sonderfahrten"], seiten: 2 });
  await pruefeDok("A-agb", "App Nutzungsbedingungen: A4 hoch, Kopf mit Fahrschule, mehrere Seiten", "app-agb", appHtml["Nutzungsbedingungen & Haftungsausschluss"], { ...appErw, enthaelt: ["Nutzungsbedingungen"], seiten: 2 });
  await pruefeDok("A-mb", "App Monatsbericht (Fahrschule): A4 hoch, Kopf mit Fahrschule und Logo", "app-monatsbericht", appHtml["Monatsbericht"] || "<html><body>fehlt</body></html>", { ...appErw, enthaelt: ["Monatsbericht", "Aktive Schüler", "Cross-Sell-Quote"], bilderOk: true });
  await pruefe("A-fehler", "keine JS-Fehler in der App", () => [...akonsole, appHtml["Monatsbericht-FEHLER"]].filter(Boolean));

  // ---------- App: Buchungs-QR-Blatt (Kopf mit Fahrschule und Logo, Code bleibt erstes Bild) ----------
  await pruefe("A-qr", "App Buchungs-QR-Blatt: Kopf mit Fahrschulname und Logo, Code als erstes Bild, A4 hoch", async () => {
    await ap.route("**/logos/boost.png", (r) => r.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") }));
    await ap.evaluate(() => { window.print = () => {}; _authProfile = { id: "u1", name: "Anna Muster", fahrschule_name: "Fahrschule Muster", fahrschule_slug: "boost", rolle: "fahrlehrer", slug: "anna" }; _bqDrucken("https://example.org/b?typ=schalt&lehrer=anna", "schalt", "Anna Muster"); });
    await ap.waitForTimeout(500);
    await ap.emulateMedia({ media: "print" });
    const r = await ap.evaluate(() => {
      const d = document.getElementById("bqDruck"), imgs = [...d.querySelectorAll("img")];
      const sicht = [...document.body.children].filter((e) => getComputedStyle(e).display !== "none").map((e) => e.id);
      return { text: d.innerText, erstes: imgs[0] && imgs[0].getBoundingClientRect().width, logo: !!d.querySelector(".bqd-logo"), sicht };
    });
    const pdf = await ap.pdf({ preferCSSPageSize: true, printBackground: true });
    if (AUS) await writeFile(join(AUS, "app-qr.pdf"), pdf);
    await ap.emulateMedia({ media: "screen" });
    const info = pdfInfo(pdf), f = [];
    if (!info.a4 || info.quer) f.push(`Format ${info.breite}x${info.hoehe}`);
    if (info.seiten !== 1) f.push(`${info.seiten} Seiten statt 1`);
    if (!/Fahrschule Muster/.test(r.text)) f.push("Fahrschulname fehlt");
    if (!r.logo) f.push("Logo fehlt");
    if (!(r.erstes > 300)) f.push("Code nicht das erste/große Bild");
    if (r.sicht.join() !== "bqDruck") f.push("sichtbar: " + r.sicht.join(","));
    return f;
  });
  await actx.close();
} finally {
  await browser.close(); server.close();
}
console.log(`\nDruck-Test: ${okZahl} ok, ${fehlerZahl} Fehler.`);
process.exit(fehlerZahl ? 1 : 0);
