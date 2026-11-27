// Test W21 (Büro): Prüfungstage mit festen 55-Minuten-Fenstern in der Prüfungstafel (buero-pruefungstage.js).
// Echter Browser, erfundene Daten (Attrappe buero-vorfuehrung.js). Es wird nichts verschickt, keine Datenbank berührt.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/pruefungstage-buero-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FOTOS = process.env.FOTOS || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const d0 = new Date(); const HEUTE = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
const KRtag = (n) => { const d = new Date(HEUTE + "T12:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

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

async function oeffne({ breite = 1280, hoehe = 900, hash = "#pruefungen", vorbereiten, daten, nutzer }) {
  const d = daten || bauDaten(HEUTE);
  const session = { user: { id: nutzer || "ad-1", email: "leitung@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([dd, s, v]) => {
    window.__FAKE = { tabellen: dd.tabellen, konten: dd.konten, session: s };
    window.ZM_WARTE_MS = 500;
    if (v) (new Function("F", v))(window.__FAKE);
  }, [d, session, vorbereiten || ""]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
  if (frage) {
    await page.click(`#werListe button:has-text("Paula Muster")`);
    await page.keyboard.type("7352", { delay: 20 });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => { const a = document.getElementById("ansicht"); return a && !/Daten werden geladen/.test(a.textContent); }, null, { timeout: 8000 }).catch(() => {});
  return { page, ctx, konsole };
}
const VOR = `
  F.tabellen.fahrschule_zahlungsdaten = [{ fahrschule_id: "fs-test-1", kontoinhaber: "Boost Fahrschule Muster", iban: "DE89370400440532013000", bic: "COBADEFFXXX", paypal: "boostmuster", impressum: "Boost Fahrschule Muster, Beispielstraße 1, 12345 Beispielstadt, Tel. 000 0000, info@example.org", modus: "test", test_email: "test@example.org", geaendert_am: "2026-11-20T10:00:00Z", bearbeiter: "Mia Muster" }];
  F.tabellen.fahrschule_preise = [{ id: "pz1", fahrschule_id: "fs-test-1", art: "pruefung_praxis", klasse: "B", bezeichnung: "Vorstellung", einheit: "pauschal", betrag_cent: 12000, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" }];
  F.tabellen.schueler.forEach((s) => { s.reakt_bezahlt_bis = "2099-12-31"; });
  F.tabellen.pruefungstermine.length = 0;
`;
const dlg = (page) => page.locator("dialog[open]").last();
const fertig = (page) => page.waitForTimeout(450);
const db = (page, f) => page.evaluate(f);
// B-Schüler ohne Sperre, die noch keine Prüfung haben
const kandidaten = (page, n, datum) => page.evaluate(([n, datum]) => S.schueler.filter((s) => istAktiv(s) && !bueroGesperrt(s) && (klasseVon(s) === "B" || klasseVon(s) === "B78" || klasseVon(s) === "B197") && !S.pruefungstermine.some((p) => p.schueler_id === s.id && p.datum === datum)).slice(0, n).map((s) => s.id), [n, datum]);
const kartenText = (page, tagId) => page.locator(`[data-pttagkarte="${tagId}"]`).first().innerText();
const ueberlauf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function tagAnlegen(page, datum, pruefer, start) {
  await page.click("#ptNeu");
  const d = dlg(page);
  await d.locator('input[name="datum"]').fill(datum);
  await d.locator('input[name="pruefer"]').fill(pruefer);
  if (start) await d.locator('input[name="start"]').fill(start);
  await d.locator("footer button[value=ok]").click();
  await fertig(page);
}

{
  const { page, ctx, konsole } = await oeffne({ vorbereiten: VOR, hoehe: 3600 });
  pruefe("T0 „Tage“ ist die Standardansicht", (await page.locator('.tabs .tab[aria-current="page"]').first().innerText()).trim() === "Tage");
  pruefe("T0b ohne Tag: freundlicher Text", /Noch kein Prüfungstag/.test(await page.locator("#ansicht").innerText()));

  // --- Tag A anlegen, neun Schüler auf einmal
  await tagAnlegen(page, KRtag(5), "ab");
  const tagA = await db(page, () => window.__FAKE.tabellen.pruefungstage[0]);
  pruefe("T1 Tag angelegt (Prüfer groß, Start 08:00)", !!tagA && tagA.pruefer === "AB" && String(tagA.start).slice(0, 5) === "08:00", JSON.stringify(tagA));
  let txt = await kartenText(page, tagA.id);
  pruefe("T1b Kopf: „0 geplant, 9 frei“, 9 Fenster-Zeilen 08:00 … 15:20–16:15", /0 geplant, 9 frei/.test(txt) && /08:00–08:55/.test(txt) && /15:20–16:15/.test(txt) && (await page.locator(`[data-pttabelle="${tagA.id}"] tr.pt-zeile`).count()) === 9, txt.slice(0, 200));
  const neun = await kandidaten(page, 9, tagA.datum);
  pruefe("T2 neun passende Schüler vorhanden", neun.length === 9);
  await page.click(`[data-ptmehrere="${tagA.id}"]`);
  const dd = dlg(page);
  await dd.locator("input[name=sid]:checked").evaluateAll((l) => l.forEach((i) => i.click()));
  for (const id of neun) await dd.locator(`input[name=sid][value="${id}"]`).check();
  pruefe("T2b Zähler: 9 ausgewählt, 9 Fenster frei", /9 ausgewählt, 9 Fenster frei/.test(await dd.locator("#ptZaehl").innerText()));
  await dd.locator("footer button[value=ok]").click();
  await fertig(page);
  txt = await kartenText(page, tagA.id);
  pruefe("T3 9 geplant, 0 frei", /9 geplant, 0 frei/.test(txt), txt.slice(0, 160));
  const reihe = await db(page, () => window.__FAKE.tabellen.pruefungstermine.filter((p) => p.pruefungstag_id === window.__FAKE.tabellen.pruefungstage[0].id).sort((a, b) => a.fenster - b.fenster).map((p) => p.fenster + "@" + String(p.von).slice(0, 5)));
  pruefe("T3b Fenster 0–8 der Reihe nach, Zeiten 55 Minuten auseinander", reihe.join(",") === "0@08:00,1@08:55,2@09:50,3@10:45,4@11:40,5@12:35,6@13:30,7@14:25,8@15:20", reihe.join(","));
  pruefe("T3c „Mehrere einplanen“ ist bei vollem Tag aus", await page.locator(`[data-ptmehrere="${tagA.id}"]`).isDisabled());
  const kal = await db(page, () => window.__FAKE.tabellen.kalender_termine.filter((t) => t.payload && t.payload.pruefungstermin_id && window.__FAKE.tabellen.pruefungstermine.some((p) => p.id === t.payload.pruefungstermin_id && p.pruefungstag_id)).length);
  const mitFl = await db(page, () => window.__FAKE.tabellen.pruefungstermine.filter((p) => p.pruefungstag_id && p.fahrlehrer_id).length);
  pruefe("T3d der Server legt die Kalender-Einträge an (einer je Prüfung mit Fahrlehrer), der Browser schreibt keine", kal === mitFl && kal >= 8, kal + " von " + mitFl);
  pruefe("T3e Hinweis D: neun neue Prüfungen warten auf die Zahlungsaufforderung", /9 neue Prüfungen – Zahlungsaufforderung offen/.test(await page.locator("[data-pthinweisd]").innerText().catch(() => "")), await page.locator("[data-pthinweisd]").innerText().catch(() => "keine Karte"));
  pruefe("T3f nichts automatisch gesendet", (await db(page, () => window.__FAKE.log.filter((l) => l.function === "zahlungs-mail").length)) === 0);
  await page.locator("[data-pthinweisd] summary").click(); // Liste ist eingeklappt (eine Zeile)
  await page.locator("[data-ptzm]").first().click();
  await page.waitForTimeout(200);
  pruefe("T3g Knopf öffnet die Karte „Zahlungsaufforderung“", (await page.locator("#zmKarte").count()) === 1);
  await page.evaluate(() => zmKarteZu());

  // --- Tag B: sieben, dann ziehen
  await tagAnlegen(page, KRtag(6), "CD");
  const tagB = await db(page, () => window.__FAKE.tabellen.pruefungstage.find((t) => t.pruefer === "CD"));
  const sieben = await kandidaten(page, 7, tagB.datum);
  await page.click(`[data-ptmehrere="${tagB.id}"]`);
  const d2 = dlg(page);
  await d2.locator("input[name=sid]:checked").evaluateAll((l) => l.forEach((i) => i.click()));
  for (const id of sieben) await d2.locator(`input[name=sid][value="${id}"]`).check();
  await d2.locator("footer button[value=ok]").click();
  await fertig(page);
  txt = await kartenText(page, tagB.id);
  pruefe("T4 Tag B: 7 geplant, 2 frei", /7 geplant, 2 frei/.test(txt), txt.slice(0, 120));
  const zeile = (i) => page.locator(`[data-pttabelle="${tagB.id}"] tr.pt-zeile[data-ptfenster="${i}"]`);
  const idIn = (i) => zeile(i).getAttribute("data-ptid");
  const id0 = await idIn(0), id1 = await idIn(1), id2 = await idIn(2);
  // Ziehen auf freies Fenster 8
  await zeile(0).dragTo(zeile(8), { sourcePosition: { x: 8, y: 8 } });
  await fertig(page);
  let f = await db(page, () => Object.fromEntries(window.__FAKE.tabellen.pruefungstermine.map((p) => [p.id, p.fenster + "@" + String(p.von).slice(0, 5)])));
  pruefe("T5 Ziehen auf freies Fenster 8 = verschoben (15:20), Server rechnet die Zeit", f[id0] === "8@15:20", f[id0]);
  pruefe("T5b Fenster 0 ist jetzt frei", (await zeile(0).getAttribute("class")).includes("pt-frei"));
  // Ziehen auf belegtes Fenster = tauschen
  await zeile(1).dragTo(zeile(2), { sourcePosition: { x: 8, y: 8 } });
  await fertig(page);
  f = await db(page, () => Object.fromEntries(window.__FAKE.tabellen.pruefungstermine.map((p) => [p.id, p.fenster + "@" + String(p.von).slice(0, 5)])));
  pruefe("T6 Ziehen auf belegtes Fenster = getauscht (1↔2, Zeiten 09:50 / 08:55)", f[id1] === "2@09:50" && f[id2] === "1@08:55", f[id1] + " / " + f[id2]);
  // Fahrlehrer in der Zeile ändern
  const sel = page.locator(`[data-ptfl="${id1}"]`);
  await sel.selectOption("fl-3");
  await fertig(page);
  const fl = await db(page, () => window.__FAKE.tabellen.pruefungstermine.map((p) => [p.id, p.fahrlehrer_id]));
  const kt = await db(page, () => window.__FAKE.tabellen.kalender_termine.filter((t) => t.art === "pruefung" && t.fahrlehrer_id === "fl-3" && !t.geloescht).length);
  pruefe("T7 Fahrlehrer in der Zeile geändert, Kalender beim neuen Fahrlehrer (Server)", fl.find((x) => x[0] === id1)[1] === "fl-3" && kt >= 1, JSON.stringify(fl.find((x) => x[0] === id1)));
  // „+ Schüler“ in freiem Fenster
  const [eine] = await kandidaten(page, 1, tagB.datum);
  await page.locator(`[data-ptplus="${tagB.id}|0"]`).click();
  await dlg(page).locator('select[name="schueler_id"]').selectOption(eine);
  pruefe("T8 Fahrlehrer/Klasse vom Schüler vorgeschlagen", (await dlg(page).locator('select[name="klasse"]').inputValue()) === "B");
  await dlg(page).locator("footer button[value=ok]").click();
  await fertig(page);
  pruefe("T8b „+ Schüler“ belegt Fenster 0", (await page.evaluate((s) => window.__FAKE.tabellen.pruefungstermine.some((p) => p.schueler_id === s && p.fenster === 0), eine)) && /8 geplant, 1 frei/.test(await kartenText(page, tagB.id)));
  await page.evaluate(() => zmKarteZu());

  // --- Startzeit 09:00: Zeiten rücken mit, Hinweis „Schüler informieren“
  await page.locator(`[data-ptbearb="${tagA.id}"]`).click();
  await dlg(page).locator('input[name="start"]').fill("09:00");
  await dlg(page).locator("footer button[value=ok]").click();
  await fertig(page);
  const spaet = await db(page, () => window.__FAKE.tabellen.pruefungstermine.filter((p) => p.pruefungstag_id === window.__FAKE.tabellen.pruefungstage[0].id).sort((a, b) => a.fenster - b.fenster).map((p) => String(p.von).slice(0, 5)));
  pruefe("T9 Start 09:00: Zeiten rücken (09:00 … 16:20)", spaet[0] === "09:00" && spaet[8] === "16:20", spaet.join(","));
  txt = await kartenText(page, tagA.id);
  pruefe("T9b Anzeige: 09:00–09:55 und Hinweis „Uhrzeit geändert – Schüler informieren“", /09:00–09:55/.test(txt) && /Uhrzeit geändert – Schüler informieren/.test(txt), txt.slice(0, 200));
  await page.locator(`[data-ptinfo="${tagA.id}"]`).click();
  pruefe("T9c „Erledigt“ blendet den Hinweis aus", !/Uhrzeit geändert/.test(await kartenText(page, tagA.id)));

  // --- Prüfung planen: Prüfungstag + Fenster statt Uhrzeit
  await page.click("#pNeu");
  const dp = dlg(page);
  pruefe("T10 Dialog: Zeitfenster-Auswahl statt Uhrzeit-Feld (Datum/Uhrzeit versteckt)", (await dp.locator('select[name="tag_id"]').isVisible()) && !(await dp.locator('input[name="von"]').isVisible()));
  await dp.locator('select[name="art"]').selectOption("theorie");
  pruefe("T10b Theorie: freie Uhrzeit", (await dp.locator('input[name="von"]').isVisible()) && !(await dp.locator('select[name="tag_id"]').isVisible()));
  await dp.locator('select[name="art"]').selectOption("praxis");
  const [noch] = await kandidaten(page, 1, tagB.datum);
  await dp.locator('select[name="schueler_id"]').selectOption(noch);
  const optT = await dp.locator('select[name="tag_id"] option').allInnerTexts();
  pruefe("T10c Tage mit „x geplant, y frei“ in der Auswahl", optT.some((t) => /1 geplant, 8 frei|\d geplant, \d frei/.test(t)), optT.join(" | "));
  await dp.locator('select[name="tag_id"]').selectOption(tagB.id);
  const optF = await dp.locator('select[name="fenster"] option').allInnerTexts();
  pruefe("T10d Fenster-Auswahl zeigt nur freie Fenster (hier 1)", optF.length === 1, optF.join(","));
  await dp.locator("footer button[value=ok]").click();
  await fertig(page);
  const neuP2 = await page.evaluate(([s, t]) => window.__FAKE.tabellen.pruefungstermine.find((p) => p.schueler_id === s && p.pruefungstag_id === t), [noch, tagB.id]);
  pruefe("T11 über den Dialog ins Fenster eingetragen: erstes freies Fenster (7), von 14:25", neuP2 && neuP2.pruefungstag_id === tagB.id && neuP2.datum === tagB.datum && neuP2.fenster === 7 && String(neuP2.von).slice(0, 5) === "14:25", JSON.stringify(neuP2));
  await page.evaluate(() => zmKarteZu());
  pruefe("T11c Tag B jetzt voll", /9 geplant, 0 frei/.test(await kartenText(page, tagB.id)));

  // --- Freie Uhrzeit bleibt möglich (und alte Zeile erscheint)
  await page.click("#pNeu");
  const dq = dlg(page);
  const [noch2] = await kandidaten(page, 1, KRtag(20));
  await dq.locator('select[name="schueler_id"]').selectOption(noch2);
  await dq.locator('select[name="zeitart"]').selectOption("frei");
  await dq.locator('input[name="datum"]').fill(KRtag(20));
  await dq.locator('input[name="von"]').fill("10:15");
  await dq.locator("footer button[value=ok]").click();
  await fertig(page);
  const frei = await page.evaluate((s) => window.__FAKE.tabellen.pruefungstermine.find((p) => p.schueler_id === s && !p.pruefungstag_id), noch2);
  pruefe("T12 freie Uhrzeit gespeichert ohne Prüfungstag", frei && !frei.pruefungstag_id && String(frei.von).slice(0, 5) === "10:15", JSON.stringify(frei));
  pruefe("T12b erscheint unter „Prüfungen mit freier Uhrzeit“", /freier Uhrzeit/.test(await page.locator("#ansicht").innerText()) && /10:15/.test(await page.locator("#ansicht").innerText()));
  await page.evaluate(() => zmKarteZu());

  // --- Tag löschen: nur wenn leer
  await tagAnlegen(page, KRtag(30), "XY");
  const tagC = await db(page, () => window.__FAKE.tabellen.pruefungstage.find((t) => t.pruefer === "XY"));
  pruefe("T13 „Tag löschen“ nur beim leeren Tag", (await page.locator(`[data-pttagkarte="${tagC.id}"] [data-ptloesch]`).count()) === 1 && (await page.locator(`[data-pttagkarte="${tagA.id}"] [data-ptloesch]`).count()) === 0);
  await page.locator(`[data-ptloesch="${tagC.id}"]`).click();
  await page.waitForSelector("dialog[open]"); await dlg(page).locator("footer button[value=ok]").click();
  await fertig(page);
  pruefe("T13b leerer Tag gelöscht", (await page.locator(`[data-pttagkarte="${tagC.id}"]`).count()) === 0);

  // Neu laden mit gespeicherten Daten prüft scripts/w21-pruefungsfenster-test.mjs (Fall 10)
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungstage-1280.png"), fullPage: true });
  pruefe("T99 keine JS-Fehler", konsole.length === 0, konsole.join(" | ").slice(0, 400));
  await ctx.close();
}

// ---- Layout, Ergebnisse, Tausch ohne Maus, Hinweis „aus der App“ (zweite Sitzung, heute als Prüfungstag)
{
  const vor = VOR + `
    const heute = ${JSON.stringify(HEUTE)};
    F.tabellen.pruefungstage = [{ id: "tg-h", fahrschule_id: "fs-test-1", datum: heute, start: "08:00", fenster_zahl: 9, pruefer: "EF", geloescht: false, erstellt_von: "ad-1" }];
    const mk = (id, sid, fl, fen, extra) => Object.assign({ id, fahrschule_id: "fs-test-1", schueler_id: sid, fahrlehrer_id: fl, art: "praxis", klasse: "B", status: "geplant", pruefungstag_id: "tg-h", fenster: fen, fenster_anzahl: 1, datum: heute, von: ["08:00","08:55","09:50","10:45","11:40","12:35","13:30","14:25","15:20"][fen], quelle: "buero", entgelt_bezahlt: false, tuev_gutschein: false, as_portal: false }, extra || {});
    F.tabellen.pruefungstermine = [mk("h1", "s1", "fl-1", 0), mk("h2", "s2", "fl-2", 1), mk("h3", "s3", "fl-1", 2),
      mk("h4", "s4", "fl-2", 4, { klasse: "CE", fenster_anzahl: 2, von: "11:40" }),
      mk("a1", "s5", "fl-3", null, { pruefungstag_id: null, fenster: null, datum: ${JSON.stringify(KRtag(3))}, von: "10:00", quelle: "app" }),
      mk("a2", "s7", "fl-3", null, { pruefungstag_id: null, fenster: null, datum: ${JSON.stringify(KRtag(4))}, von: "11:00", quelle: "app" })];
  `;
  for (const b of [1024, 1280, 1920]) {
    const { page, ctx, konsole } = await oeffne({ vorbereiten: vor, breite: b, hoehe: 900 });
    const ue = await ueberlauf(page);
    pruefe(`L${b} Seite nicht seitlich wischbar`, ue <= 0, String(ue));
    const raus = await page.evaluate(() => [...document.querySelectorAll(".pt-karte .pt-tabelle")].filter((t) => t.getBoundingClientRect().right > t.closest(".pt-karte").getBoundingClientRect().right + 1).length);
    pruefe(`L${b} Tabellen ragen nicht aus der Karte`, raus === 0, String(raus));
    if (b === 1280) {
      const t = await page.locator("#ansicht").innerText();
      pruefe("L1 Lkw braucht zwei Fenster: Folgezeile da", /gehört zur Prüfung darüber/.test(t) && /11:40–13:30/.test(t), t.slice(0, 300));
      pruefe("L2 heutiger Tag: Kopf „5 geplant“ wird so gezählt (4 Prüfungen im Tag)", /4 geplant, 4 frei/.test(t), t.slice(0, 200));
      pruefe("L3 Hinweis „2 neue Prüfungen aus der App – Zahlungsaufforderung offen“", /2 neue Prüfungen aus der App – Zahlungsaufforderung offen/.test(t), t.slice(0, 400));
      // Ergebnis direkt: bestanden / nicht bestanden
      await page.locator('[data-eja="h1"]').click(); await fertig(page);
      await page.locator('[data-enein="h2"]').click(); await fertig(page);
      const st = await db(page, () => Object.fromEntries(window.__FAKE.tabellen.pruefungstermine.map((p) => [p.id, p.status])));
      pruefe("E1 ✓ = bestanden, ✗ = nicht bestanden", st.h1 === "bestanden" && st.h2 === "nicht_bestanden", JSON.stringify(st));
      const kl = await page.evaluate(() => [document.querySelector('tr[data-ptid="h1"]').className, document.querySelector('tr[data-ptid="h2"]').className]);
      pruefe("E2 Farben: bestanden grün, nicht bestanden rot", /pt-st-gruen/.test(kl[0]) && /pt-st-rot/.test(kl[1]), kl.join(" | "));
      const ak = await db(page, () => ({ s1: S.schueler.find((x) => x.id === "s1").praxis_bestanden_am, aufg: S.aufgaben.some((a) => a.schueler_id === "s2" && /Neuen Termin/.test(a.text)), kp: window.__FAKE.tabellen.kalender_pruefungen.filter((k) => k.schueler_id === "s1" && k.datum === S.pruefungstermine.find((p) => p.id === "h1").datum && k.result === "pass").length }));
      pruefe("E3 Akte: Datum bestanden; Aufgabe „Neuen Termin planen“; Server spiegelt in die App", !!ak.s1 && ak.aufg && ak.kp >= 1, JSON.stringify(ak));
      pruefe("E4 Rückgängig bleibt möglich", (await page.locator('[data-erueck="h1"]').count()) === 1);
      // Ziehen: bestandene Prüfung lässt sich nicht verschieben (nicht ziehbar)
      pruefe("E5 mit Ergebnis nicht verschiebbar? Zeile bleibt, Fenster-Platz bleibt belegt", (await page.locator('tr[data-ptid="h1"]').getAttribute("data-ptfenster")) === "0");
      // Tauschen ohne Maus (Bearbeiten-Dialog): h3 mit h4 (Lkw, 2 Fenster) geht nicht -> Fehlertext; h3 mit freier Auswahl
      await page.locator('[data-pbearb="h3"]').click();
      const d = dlg(page);
      pruefe("E6 Bearbeiten: Tag und Fenster wählbar, „Mit einem anderen Schüler tauschen“ vorhanden", (await d.locator('select[name="tag_id"]').isVisible()) && (await d.locator('select[name="tauschen_mit"]').count()) === 1);
      await d.locator('select[name="fenster"]').selectOption({ index: 1 });
      const wahl = await d.locator('select[name="fenster"] option:checked').innerText();
      await d.locator("footer button[value=ok]").click(); await fertig(page);
      const h3 = await db(page, () => window.__FAKE.tabellen.pruefungstermine.find((p) => p.id === "h3"));
      pruefe("E7 Verschieben im Dialog (erstes freies Fenster)", h3.fenster !== 2 && wahl.includes(String(h3.von).slice(0, 5)), `${h3.fenster} ${h3.von} ${wahl}`);
      // Hinweis D: Knopf pro Prüfung
      pruefe("D1 je Prüfung ein Knopf", (await page.locator("[data-ptzm]").count()) === 2);
      pruefe("D2 Tag mit Lkw: freie Fenster zeigen „+ Schüler“", (await page.locator("[data-ptplus]").count()) >= 4);
      if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungstage-heute-1280.png"), fullPage: true });
    }
    pruefe(`L${b} keine JS-Fehler`, konsole.length === 0, konsole.join(" | ").slice(0, 300));
    await ctx.close();
  }
}


// ---- Prüf-Team-Funde F1/F2/F3/F7/F8 (Ergebnis aus der App, Spiegelzeilen, Super-Admin, Ansicht „Tage“, Rückschau)
{
  const vor = VOR + `
    const heute = ${JSON.stringify(HEUTE)};
    const K = (n) => { const d = new Date(heute + "T12:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
    F.tabellen.pruefungstage = [
      { id: "tg-a", fahrschule_id: "fs-test-1", datum: K(10), start: "08:00", fenster_zahl: 9, pruefer: "AA", geloescht: false, erstellt_von: "ad-1" },
      { id: "tg-old", fahrschule_id: "fs-test-1", datum: K(-200), start: "08:00", fenster_zahl: 9, pruefer: "OO", geloescht: false, erstellt_von: "ad-1" }];
    const mk = (id, sid, fl, extra) => Object.assign({ id, fahrschule_id: "fs-test-1", schueler_id: sid, fahrlehrer_id: fl, art: "praxis", klasse: "B", status: "geplant", pruefungstag_id: null, fenster: null, fenster_anzahl: 1, quelle: "buero", ergebnis_uebernommen: true, entgelt_bezahlt: false, tuev_gutschein: false, as_portal: false }, extra);
    F.tabellen.pruefungstermine = [
      mk("r1", "s1", "fl-1", { status: "bestanden", ergebnis_uebernommen: false, quelle: "app", datum: K(-1), von: "09:00:00" }),
      mk("r2", "s2", "fl-2", { status: "nicht_bestanden", ergebnis_uebernommen: false, quelle: "app", datum: K(-1), von: "10:00:00" }),
      mk("r3", "s8", "fl-1", { art: "theorie", klasse: "CE", status: "bestanden", ergebnis_uebernommen: false, quelle: "app", datum: K(-2), von: "08:00:00" }),
      mk("th1", "s3", null, { art: "theorie", datum: K(2), von: "10:00:00" }),
      mk("pr1", "s4", "fl-1", { datum: K(-3), von: "09:00:00" }),
      mk("ap1", "s9", "fl-3", { quelle: "app", datum: K(4), von: "11:00:00" }),
      mk("alt1", "s5", "fl-3", { quelle: "app_alt", datum: K(3), von: "12:00:00" }),
      mk("sp1", "s7", "fl-2", { datum: K(6), von: "14:00:00", kalender_termin_id: "kt-sp1" }),
      mk("p-old", "s6", "fl-1", { status: "bestanden", pruefungstag_id: "tg-old", fenster: 3, datum: K(-200), von: "10:45:00" })];
    F.tabellen.kalender_termine.push({ id: "kt-sp1", fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-2", schueler_id: "s7", datum: K(6), von: "14:00", bis: "15:30", art: "pruefung", fahrzeug: null, status: "geplant", geloescht: false, payload: { pruefungstermin_id: "sp1" } });
  `;
  const { page, ctx, konsole } = await oeffne({ vorbereiten: vor, hoehe: 1600 });
  const name = (sid) => page.evaluate((x) => S.schueler.find((s) => s.id === x).name, sid);
  const txt0 = await page.locator("#ansicht").innerText();
  // F7: „Tage“ zeigt auch Theorie (blaue Marke) und die Warnkarte „ohne Ergebnis“
  const uhr = await page.locator(".pt-uhrzeit").first().innerText().catch(() => "");
  pruefe("F7a Ansicht „Tage“ zeigt die Theorieprüfung mit freier Uhrzeit", (await page.locator(".pt-uhrzeit").evaluateAll((l) => l.map((x) => x.innerText).join(" "))).includes(await name("s3")) && (await page.locator(".pt-uhrzeit .marke-pill.blau").count()) >= 1, uhr.slice(0, 200));
  pruefe("F7b Ansicht „Tage“ zeigt die Warnkarte „Prüfung ohne Ergebnis“", /1 Prüfung ohne Ergebnis/.test(txt0), txt0.slice(0, 300));
  // Hinweis D: nur quelle „app“, nicht „app_alt“
  const hd = await page.locator("[data-pthinweisd]").innerText().catch(() => "");
  pruefe("D3 Hinweis D zählt nur „app“ (1 Prüfung), „app_alt“ nicht", /1 neue Prüfung aus der App/.test(hd) && (await page.locator("[data-ptzm]").count()) === 1, hd.slice(0, 120));
  // F1: Hinweiszeile, Kennzeichnung, Zähler
  const hz = page.locator("[data-ergapphinweis]");
  pruefe("F1a eine Hinweiszeile „3 Ergebnisse aus der App – in die Akte übernehmen“ mit „Alle übernehmen“", (await hz.count()) === 1 && /3 Ergebnisse aus der App – in die Akte übernehmen/.test(await hz.innerText()) && (await hz.locator("[data-eueball]").count()) === 1, await hz.innerText().catch(() => "keine"));
  const hh = await hz.evaluate((e) => [e.open, Math.round(e.getBoundingClientRect().height)]); const zh = await page.locator("[data-pthinweisd]").evaluate((e) => Math.round(e.getBoundingClientRect().height));
  pruefe("F1b Hinweiszeile ist eingeklappt und nicht höher als die Zahlungs-Hinweiszeile", !hh[0] && hh[1] <= zh + 4, JSON.stringify(hh) + " Zahlung " + zh);
  pruefe("F1c Tage-Karte kennzeichnet die Zeile mit „aus der App“", /aus der App/.test(await page.locator(".pt-uhrzeit").first().innerText().catch(() => "")) || /aus der App/.test(await page.locator("#ansicht").innerText()));
  const tabTxt = await page.locator(".tabs .tab").allInnerTexts();
  pruefe("F1d Reiter „Ergebnisse eintragen (4)“ zählt App-Ergebnisse und offene Prüfung mit", tabTxt.some((t) => /Ergebnisse eintragen \(4\)/.test(t)), tabTxt.join(","));
  // F1: Reiter „Ergebnisse eintragen“, einzeln übernehmen (Theorie)
  await page.goto(page.url().split("#")[0] + "#pruefungen?ansicht=ergebnis"); await fertig(page);
  const et = await page.locator("#ansicht").innerText();
  pruefe("F1e Reiter zeigt „Ergebnis aus der App“ mit Knopf „In die Akte übernehmen“ (3 Zeilen)", /Ergebnis aus der App/.test(et) && (await page.locator(".ergebnis-tabelle [data-eueb]").count()) === 3, et.slice(0, 300));
  await page.locator('.ergebnis-tabelle [data-eueb="r3"]').click(); await fertig(page);
  let ak = await db(page, () => ({ th: S.schueler.find((x) => x.id === "s8").theorie_bestanden_am, flag: window.__FAKE.tabellen.pruefungstermine.find((p) => p.id === "r3").ergebnis_uebernommen }));
  pruefe("F1f einzeln übernommen: Theorie-Datum in der Akte, Merker gesetzt", !!ak.th && ak.flag === true, JSON.stringify(ak));
  await page.goto(page.url().split("#")[0] + "#pruefungen"); await fertig(page);
  pruefe("F1g Hinweiszeile zählt jetzt „2 Ergebnisse“", /2 Ergebnisse aus der App/.test(await page.locator("[data-ergapphinweis]").innerText()));
  // F1: Alle übernehmen (Praxis bestanden + nicht bestanden)
  await page.locator("[data-eueball]").click(); await page.waitForTimeout(700);
  ak = await db(page, () => ({
    s1: S.schueler.find((x) => x.id === "s1").praxis_bestanden_am, reakt: S.schueler.find((x) => x.id === "s1").reakt_status,
    aufg: S.aufgaben.some((a) => a.schueler_id === "s2" && /Neuen Termin/.test(a.text)),
    flags: window.__FAKE.tabellen.pruefungstermine.filter((p) => ["r1", "r2", "r3"].includes(p.id)).map((p) => p.ergebnis_uebernommen).join(),
  }));
  pruefe("F1h „Alle übernehmen“: Akte (bestanden am, befreit), Aufgabe „Neuen Termin planen“, Merker gesetzt", !!ak.s1 && ak.reakt === "befreit" && ak.aufg && ak.flags === "true,true,true", JSON.stringify(ak));
  pruefe("F1i bei bestandener Praxis kommt die Archiv-Frage wie heute", (await page.locator("dialog[open]").count()) >= 1 && /Archiv/.test(await dlg(page).innerText()));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  while ((await page.locator("dialog[open]").count()) > 0) { await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
  pruefe("F1j Hinweiszeile ist weg", (await page.locator("[data-ergapphinweis]").count()) === 0);

  // F2: Spiegelzeile im Kalender
  await page.evaluate(() => terminDialog("kt-sp1")); await page.waitForTimeout(200);
  const td = dlg(page);
  pruefe("F2a Spiegelzeile: Hinweis „bitte unter Prüfungen ändern“, Datum gesperrt, kein „Termin absagen“", /unter „Prüfungen“ ändern/.test(await td.innerText()) && await td.locator('input[name="datum"]').isDisabled() && (await td.locator('input[name="absagen"]').count()) === 0);
  await td.locator("[data-zurtafel]").click(); await page.waitForTimeout(300);
  pruefe("F2b Knopf führt zur Prüfungstafel", /#pruefungen/.test(await page.evaluate(() => location.hash)) && (await page.locator("dialog[open]").count()) === 0);
  // Archiv-Frage: sagt die Prüfung ab, nicht die Kalenderzeile
  const fr = page.evaluate(async () => { const x = S.schueler.find((s) => s.id === "s7"); const l = await frageKuenftigeTermine(x); if (l === null) return null; await sageTermineAb(l, "Test abgesagt"); return l.map((t) => (t._pruefung ? "P:" : "T:") + t.id); });
  await page.waitForSelector("dialog[open]");
  const ft = await dlg(page).innerText();
  await dlg(page).locator("footer button.haupt, footer button[value=ok]").first().click().catch(async () => { await dlg(page).locator("button:has-text('Ja')").first().click(); });
  const lst = await fr; await fertig(page);
  const sp = await db(page, () => ({ p: window.__FAKE.tabellen.pruefungstermine.find((p) => p.id === "sp1").status, k: window.__FAKE.tabellen.kalender_termine.find((t) => t.id === "kt-sp1").geloescht }));
  pruefe("F2c Archiv-Frage nennt die Prüfung und sagt über die Prüfung ab (Kalender zieht der Server nach)", /Prüfung/.test(ft) && (lst || []).some((x) => x === "P:sp1") && !(lst || []).includes("T:kt-sp1") && sp.p === "abgesagt" && sp.k === true, ft.slice(0, 120) + " | " + JSON.stringify(lst) + JSON.stringify(sp));
  await page.evaluate(() => { location.hash = "#pruefungen"; }); await fertig(page);

  // F8: Rückschau und fehlender Tag
  pruefe("F8a Rückschau: ein 200 Tage alter Prüfungstag wird geladen", await page.evaluate(() => S.pruefungstage.some((t) => t.id === "tg-old")));
  await page.evaluate(() => { S.pruefungstage = S.pruefungstage.filter((t) => t.id !== "tg-old"); });
  await page.evaluate(() => pruefungDialog("p-old")); await page.waitForTimeout(200);
  const d8 = dlg(page);
  pruefe("F8b Tag fehlt: Auswahl „Prüfungstag“ ist leer, es wird kein anderer vorgewählt", (await d8.locator('select[name="tag_id"]').inputValue()) === "");
  await d8.locator('input[name="notiz"]').fill("nur Notiz");
  await d8.locator("footer button[value=ok]").click(); await fertig(page);
  const po = await db(page, () => window.__FAKE.tabellen.pruefungstermine.find((p) => p.id === "p-old"));
  pruefe("F8c Speichern verschiebt nichts (Tag, Fenster, Datum, Uhrzeit gleich), Notiz gespeichert", po.notiz === "nur Notiz" && po.pruefungstag_id === "tg-old" && po.fenster === 3 && String(po.von).slice(0, 5) === "10:45", JSON.stringify(po));
  pruefe("F8d keine JS-Fehler", konsole.length === 0, konsole.join(" | ").slice(0, 300));
  await ctx.close();
}
// F3: Super-Admin wählt eine andere Fahrschule: deren Prüfungstage kommen (RPC mit Fahrschule)
{
  const vor = VOR + `
    F.tabellen.pruefungstage = [{ id: "tg-z2", fahrschule_id: "fs-test-2", datum: "${KRtag(5)}", start: "08:00", fenster_zahl: 9, pruefer: "ZZ", geloescht: false, erstellt_von: "sa-1" }];
  `;
  const { page, ctx, konsole } = await oeffne({ vorbereiten: vor, nutzer: "sa-1" });
  await page.selectOption("#schulWahl", "fs-test-2"); await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({ fs: S.fsId, tage: S.pruefungstage.map((t) => t.id) }));
  pruefe("F3 Super-Admin: Prüfungstage der gewählten Fahrschule geladen", r.fs === "fs-test-2" && r.tage.includes("tg-z2"), JSON.stringify(r));
  pruefe("F3b keine JS-Fehler", konsole.length === 0, konsole.join(" | ").slice(0, 300));
  await ctx.close();
}

// ---- Alte Datenbank ohne Migration: alte Tafel wie bisher
{
  const { page, ctx, konsole } = await oeffne({ vorbereiten: `F.rpcs = F.rpcs || {}; F.rpcs.pruefungstage_belegung = () => { throw new Error('function does not exist'); };` });
  const t = await page.locator(".tabs .tab").allInnerTexts();
  pruefe("A1 ohne Migration: kein Reiter „Tage“, Standard „Kommende“", !t.includes("Tage") && (await page.locator('.tabs .tab[aria-current="page"]').first().innerText()).trim() === "Kommende", t.join(","));
  await page.click("#pNeu");
  pruefe("A2 ohne Migration: Dialog wie bisher (Uhrzeit-Feld, keine Fenster-Auswahl)", (await dlg(page).locator('input[name="von"]').isVisible()) && (await dlg(page).locator('select[name="tag_id"]').count()) === 0);
  pruefe("A3 keine JS-Fehler", konsole.length === 0, konsole.join(" | ").slice(0, 300));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\nPrüfungstage-Büro-Test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
