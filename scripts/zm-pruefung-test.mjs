// Test W15c: Karte „Zahlungsaufforderung senden“ direkt nach dem Eintragen einer Prüfung (buero-zahlungsmail.js zmNachPruefung).
// 🗣 Serband 26.11.2026: „ein Tipp direkt beim Eintragen“. Echter Browser, erfundene Daten (Attrappe); es wird nichts verschickt.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/zm-pruefung-test.mjs
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
const PIN = { "Paula Muster": "7352" };
const KRtag = (n) => { const d = new Date(HEUTE + "T12:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

async function oeffne({ nutzer, hash = "#einstellungen?thema=zahlungen", vorbereiten, breite = 1366, hoehe = 860 }) {
  const daten = bauDaten(HEUTE);
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s };
    window.ZM_WARTE_MS = 500; // statt 5 Sekunden
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
  return { page, ctx, konsole };
}

const ZD = { fahrschule_id: "fs-test-1", kontoinhaber: "Boost Fahrschule Muster", iban: "DE89370400440532013000", bic: "COBADEFFXXX", paypal: "boostmuster",
  impressum: "Boost Fahrschule Muster, Beispielstraße 1, 12345 Beispielstadt, Tel. 000 0000, info@example.org", modus: "test", test_email: "test@example.org",
  geaendert_am: "2026-11-20T10:00:00Z", bearbeiter: "Mia Muster" };
// Vorbereitung: Zahlungsdaten (oder keine), Preis für die praktische Prüfung Klasse B (Theorie hat keinen Preis), s12 mit „Zahlung ausstehend“
const vor = (o = {}) => new Function("F", `
  ${o.daten === false ? "" : `F.tabellen.fahrschule_zahlungsdaten = [Object.assign(${JSON.stringify(ZD)}, { modus: ${JSON.stringify(o.modus || "test")} })];`}
  F.tabellen.fahrschule_preise = [{ id: "pz1", fahrschule_id: "fs-test-1", art: "pruefung_praxis", klasse: "B", bezeichnung: "Vorstellung zur praktischen Prüfung", einheit: "pauschal", betrag_cent: 12000, gueltig_ab: "2026-01-01", angelegt_von: "ad-1", angelegt_am: "2026-01-01T10:00:00Z" }];
  const s12 = F.tabellen.schueler.find((x) => x.id === "s12"); s12.zahlung_gesperrt_seit = ${JSON.stringify(HEUTE)}; s12.zahlung_gesperrt_grund = "Rechnung offen";
  // W15 S4: s3 (Prüfungs-Mail) und s12 (Zahlung offen) stehen hier für genau eine Mail-Art; ihre Reaktivierung (sonst bald
  // fällig, dann gäbe es zusätzlich die Erinnerung) weit weg. Die Erinnerung prüft Z14.
  ${o.s3reakt === false ? "" : `F.tabellen.schueler.find((x) => x.id === "s3").reakt_bezahlt_bis = "2099-12-31";`}
  F.tabellen.schueler.find((x) => x.id === "s12").reakt_bezahlt_bis = "2099-12-31";
  ${o.extra || ""}
`);
const jsFehler = (konsole, ausser) => konsole.filter((k) => !(ausser && ausser.test(k)));
const arten = (page, id) => page.evaluate((i) => zmAngebote(S.schueler.find((s) => s.id === i)).map((a) => a.art), id);
const oeffneAkte = async (page, id) => { await page.evaluate((i) => schuelerDialog(i), id); await page.waitForSelector("dialog[open]"); await page.waitForTimeout(100); };
const schliesseAlle = async (page) => { await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close())); await page.waitForTimeout(100); };
const anrufe = (page) => page.evaluate(() => window.__FAKE.log.filter((l) => l.function === "zahlungs-mail"));

// Schüler ohne geplante Prüfung, aktiv, Klasse B (aus den erfundenen Daten)
const waehle = (page) => page.evaluate(() => {
  const x = S.schueler.find((s) => istAktiv(s) && klasseVon(s) === "B" && !S.pruefungstermine.some((p) => p.schueler_id === s.id) && !S.pruefungen.some((p) => p.schueler_id === s.id && !p.result));
  return x ? x.id : null;
});
// Prüfung über das echte Fenster „Prüfung planen“ eintragen
async function plane(page, sid, { art = "praxis", tage = 10, id = null, absagen = false } = {}) {
  await page.evaluate((i) => pruefungDialog(i || undefined), id);
  const dlg = page.locator("dialog[open]").last();
  if (!id) {
    await dlg.locator('select[name="schueler_id"]').selectOption(sid);
    await dlg.locator('select[name="art"]').selectOption(art);
    await dlg.locator('select[name="klasse"]').selectOption("B").catch(() => {});
    await dlg.locator('input[name="datum"]').fill(KRtag(tage));
  }
  if (absagen) await dlg.locator('input[name="absagen"]').check();
  await dlg.locator("footer button[value=ok]").click();
  await page.waitForTimeout(500);
}
const karte = (page) => page.locator("#zmKarte");

// P1–P3: Test-Modus, Preis da → Knopf mit Betrag; Tipp → genau ein Aufruf nach „Rückgängig“-Zeit
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#pruefungen", vorbereiten: vor() });
  const sid = await waehle(page);
  pruefe("P0 Testschüler gefunden", !!sid);
  await plane(page, sid);
  pruefe("P1 Karte steht nach dem Speichern", await karte(page).isVisible());
  const knopf = karte(page).locator("[data-zmksenden]");
  pruefe("P1b Knopf „Zahlungsaufforderung senden (Test) · 120,00 €“", /Zahlungsaufforderung senden \(Test\) · 120,00\s€/.test(await knopf.innerText()), await karte(page).innerText());
  pruefe("P1c Fenster ist zu", (await page.locator("dialog[open]").count()) === 0);
  pruefe("P1d nichts automatisch gesendet", (await anrufe(page)).length === 0);
  const kb = await karte(page).boundingBox();
  pruefe("P1f Karte kompakt: höchstens 150 px hoch (PC)", kb && kb.height <= 150, JSON.stringify(kb));
  const h = await knopf.boundingBox();
  pruefe("P1e Knopf mindestens 44 px hoch", h && h.height >= 44, JSON.stringify(h));
  await knopf.click(); await page.waitForTimeout(1300);
  const a = await anrufe(page);
  pruefe("P2 genau ein Aufruf: Prüfung, 120 €, „Praktische Prüfung Klasse B“, Test", a.length === 1 && a[0].body.art === "pruefung" && a[0].body.betrag_cent === 12000 && a[0].body.wofuer === "Praktische Prüfung Klasse B" && a[0].body.schueler_id === sid, JSON.stringify(a.map((x) => x.body)));
  pruefe("P2b Karte ist weg", (await karte(page).count()) === 0);
  // P3 Haken: dieselbe Prüfung absagen und neu planen → für die neue Prüfung gilt die Mail schon (keine Prüfung dazwischen)
  const pid = await page.evaluate((s) => S.pruefungstermine.find((p) => p.schueler_id === s).id, sid);
  await plane(page, sid, { id: pid, absagen: true });
  pruefe("P3a Absagen zeigt keine Karte", (await karte(page).count()) === 0);
  await plane(page, sid, { tage: 12 });
  pruefe("P3 Haken statt Knopf: „✓ Zahlungsaufforderung gesendet am …“", (await karte(page).locator("[data-zmkhaken]").count()) === 1 && (await karte(page).locator("[data-zmksenden]").count()) === 0, await karte(page).innerText().catch(() => ""));
  // P3d W20: von Hand geändertes „Wofür“ („Prüfungsgebühr“) behält den Haken; steht dort „Theorie…“, zählt die Mail nicht für die Praxisprüfung
  const unklar = await page.evaluate((s) => {
    const p = S.pruefungstermine.find((x) => x.schueler_id === s && x.status === "geplant" && x.art !== "theorie");
    const m = S.zahlungsMails.filter((x) => x.schueler_id === s && x.art === "pruefung"), alt = m.map((x) => x.wofuer);
    m.forEach((x) => { x.wofuer = "Prüfungsgebühr"; }); const frei = !!zmFuerPruefungGesendet(p);
    m.forEach((x) => { x.wofuer = "Theorieprüfung Klasse B"; }); const theorie = !!zmFuerPruefungGesendet(p);
    m.forEach((x) => { x.wofuer = "Fahrpruefung Klasse B"; }); const ohneUmlaut = !!zmFuerPruefungGesendet(p);
    m.forEach((x) => { x.wofuer = "Praxisprüfung nach der Theorie"; }); const beides = !!zmFuerPruefungGesendet(p);
    // freier Text, aber seit der Mail gab es eine Theorieprüfung (schon vorbei): die Mail war wohl für die Theorie → Knopf statt Haken
    m.forEach((x) => { x.wofuer = "Prüfungsgebühr"; });
    const t = { id: "zm-test-theorie", schueler_id: s, art: "theorie", status: "bestanden", datum: KR.todayISO() };
    S.pruefungstermine.push(t); const freiNachTheorie = !!zmFuerPruefungGesendet(p);
    S.pruefungstermine.splice(S.pruefungstermine.indexOf(t), 1);
    m.forEach((x, i) => { x.wofuer = alt[i]; });
    return { n: m.length, frei, theorie, ohneUmlaut, beides, freiNachTheorie };
  }, sid);
  pruefe("P3d freier Text behält den Haken, „Theorie…“ zählt nicht für Praxis", unklar.n >= 1 && unklar.frei === true && unklar.theorie === false, JSON.stringify(unklar));
  pruefe("P3e „Fahrpruefung“ (ohne ü) zählt für Praxis; „Praxis … Theorie“ gilt als unklar (Haken nur ohne Theorieprüfung)", unklar.ohneUmlaut === true && unklar.beides === true, JSON.stringify(unklar));
  pruefe("P3f freier Text zählt nicht, wenn seit der Mail eine Theorieprüfung war", unklar.freiNachTheorie === false, JSON.stringify(unklar));
  // P4 Bearbeiten einer bestehenden Prüfung: keine Karte
  await page.evaluate(() => zmKarteZu());
  const pid2 = await page.evaluate((s) => S.pruefungstermine.filter((p) => p.schueler_id === s && p.status === "geplant")[0].id, sid);
  await plane(page, sid, { id: pid2 });
  pruefe("P4 Bearbeiten zeigt keine Karte", (await karte(page).count()) === 0);
  pruefe("P4b nach wie vor genau ein Aufruf", (await anrufe(page)).length === 1);
  // P3b andere geplante Praxisprüfung (B +12 Tage, Mail gesendet) → neue frühere Prüfung C (+5) bekommt den Knopf, keinen Haken (Prüf-Team Daten)
  await page.evaluate(() => zmKarteZu());
  await plane(page, sid, { tage: 5 });
  pruefe("P3b weitere geplante Prüfung derselben Art: Knopf statt Haken", (await karte(page).locator("[data-zmksenden]").count()) === 1 && (await karte(page).locator("[data-zmkhaken]").count()) === 0, await karte(page).innerText().catch(() => ""));
  // P3c Theorieprüfung: die Praxis-Mail zählt nicht (Art passt nicht) → kein Haken
  await page.evaluate(() => zmKarteZu());
  await plane(page, sid, { art: "theorie", tage: 7 });
  pruefe("P3c Theorie: Praxis-Mail gilt nicht als gesendet", (await karte(page).locator("[data-zmkhaken]").count()) === 0, await karte(page).innerText().catch(() => ""));
  pruefe("P5 keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
  await ctx.close();
}
// P6 Rückgängig: nichts geht raus
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#pruefungen", vorbereiten: vor() });
  await page.evaluate(() => { window.ZM_WARTE_MS = 3000; });
  const sid = await waehle(page);
  await plane(page, sid);
  await karte(page).locator("[data-zmksenden]").click(); await page.waitForTimeout(300);
  pruefe("P6a Rückgängig-Hinweis steht unten, am Ort der Karte (nicht oben wie in der Akte)", await page.evaluate(() => { const u = document.querySelector(".toast-undo:not(.zm-karte)"); return !!u && !u.classList.contains("zm-toast") && u.getBoundingClientRect().top > innerHeight / 2; }));
  await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(3300);
  pruefe("P6 Rückgängig: kein Aufruf", (await anrufe(page)).length === 0);
  // P6c ein anderer Rückgängig-Hinweis schließt die Karte (nie übereinander, Prüf-Team Bedienung); P6d Escape schließt die Karte
  await plane(page, await waehle(page));
  pruefe("P6c Karte steht wieder", (await karte(page).count()) === 1);
  await page.evaluate(() => toastUndo("Anderer Hinweis", () => {}));
  pruefe("P6c anderer Rückgängig-Hinweis → Karte zu", (await karte(page).count()) === 0);
  await page.evaluate(() => undoAblaufen());
  await plane(page, await waehle(page));
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
  pruefe("P6d Escape schließt die Karte", (await karte(page).count()) === 0);
  pruefe("P6b keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
  await ctx.close();
}
// P11 Handy 360 px: Karte höchstens 150 px hoch, nichts ragt heraus
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#pruefungen", vorbereiten: vor({ daten: false }), breite: 360, hoehe: 780 });
  await plane(page, await waehle(page));
  const kb = await karte(page).boundingBox();
  pruefe("P11 360 px: Karte (mit Grund + Link) höchstens 150 px hoch und ganz im Bild", kb && kb.height <= 150 && kb.x >= 0 && kb.x + kb.width <= 360, JSON.stringify(kb));
  pruefe("P11b keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
  await ctx.close();
}
// P7 Theorieprüfung ohne Preis: Karte sagt, was fehlt, Link zu den Preisen
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#pruefungen", vorbereiten: vor() });
  const sid = await waehle(page);
  await plane(page, sid, { art: "theorie" });
  pruefe("P7 „Kein Preis für diese Prüfung in der Preisliste“ + Link „Preis eintragen“", /Kein Preis/.test(await karte(page).innerText()) && (await karte(page).locator('[data-zmklink][href="#zahlungen?reiter=preise"]').count()) === 1 && (await karte(page).locator("[data-zmksenden]").count()) === 0);
  await karte(page).locator("[data-zmklink]").click(); await page.waitForTimeout(400);
  pruefe("P7b Link führt zu Zahlungen › Preise, Karte zu", /zahlungen\?reiter=preise/.test(page.url()) && (await karte(page).count()) === 0, page.url());
  pruefe("P7c keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
  await ctx.close();
}
// P8 ohne Zahlungsdaten: Hinweis + Link
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#pruefungen", vorbereiten: vor({ daten: false }) });
  const sid = await waehle(page);
  await plane(page, sid);
  pruefe("P8 „Zahlungsdaten fehlen“ + Link zu den Zahlungsdaten", /Zahlungsdaten fehlen/.test(await karte(page).innerText()) && (await karte(page).locator('[data-zmklink][href="#einstellungen?thema=zahlungen"]').count()) === 1);
  pruefe("P8b kein Aufruf", (await anrufe(page)).length === 0);
  pruefe("P8c keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
  await ctx.close();
}
// P9 Echt-Modus: Knopf ohne „(Test)“; P10 Prüfung in der Vergangenheit: keine Karte
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#pruefungen", vorbereiten: vor({ modus: "echt" }) });
  const sid = await waehle(page);
  await plane(page, sid);
  const t = await karte(page).innerText().catch(() => "");
  pruefe("P9 Echt: „Zahlungsaufforderung senden · 120,00 €“ oder Grund (E-Mail fehlt)", /Zahlungsaufforderung senden · 120,00/.test(t) || /Keine E-Mail-Adresse/.test(t), t);
  await page.evaluate(() => zmKarteZu());
  const sid2 = await waehle(page);
  await plane(page, sid2, { tage: -3 });
  pruefe("P10 Prüfung in der Vergangenheit: keine Karte", (await karte(page).count()) === 0);
  pruefe("P10b keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\nZahlungsaufforderung-nach-Prüfung-Test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
