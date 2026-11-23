// Test Werkstatt 11 Zahlungsaufforderung per Mail im Büro (buero-zahlungsmail.js), echter Browser mit erfundenen Daten (Attrappe).
// Es wird nichts verschickt: die Funktion „zahlungs-mail“ ist in buero-vorfuehrung.js nachgebaut.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/zahlungsmail-test.mjs
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

async function oeffne({ nutzer, hash = "#fristen", vorbereiten, breite = 1366, hoehe = 860 }) {
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
  ${o.extra || ""}
`);
const jsFehler = (konsole, ausser) => konsole.filter((k) => !(ausser && ausser.test(k)));
const arten = (page, id) => page.evaluate((i) => zmAngebote(S.schueler.find((s) => s.id === i)).map((a) => a.art), id);
const oeffneAkte = async (page, id) => { await page.evaluate((i) => schuelerDialog(i), id); await page.waitForSelector("dialog[open]"); await page.waitForTimeout(100); };
const schliesseAlle = async (page) => { await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close())); await page.waitForTimeout(100); };
const anrufe = (page) => page.evaluate(() => window.__FAKE.log.filter((l) => l.function === "zahlungs-mail"));

try {
  // Z1 Einstellungen: speichern, IBAN-Prüfung, „Echt“ nur mit Daten
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", vorbereiten: vor({ daten: false }) });
    pruefe("Z1a Abschnitt „Zahlungsdaten für Mails“ ist da (Leitung)", await page.locator("#zmEinst h2").innerText() === "Zahlungsdaten für Mails");
    pruefe("Z1b Vorgabe ist „Test“", await page.locator('#zmForm input[name=modus][value=test]').isChecked());
    const hoehen = await page.evaluate(() => [...document.querySelectorAll(".zm-wahl")].map((l) => l.getBoundingClientRect().height));
    pruefe("Z1c zwei große Auswahlflächen (je mindestens 44 px)", hoehen.length === 2 && hoehen.every((h) => h >= 44), JSON.stringify(hoehen));
    // IBAN falsch (Prüfziffer)
    await page.fill("#zmForm input[name=kontoinhaber]", "Boost Fahrschule Muster");
    await page.fill("#zmForm input[name=iban]", "DE89 3704 0044 0532 0130 01");
    await page.click("#zmSpeichern"); await page.waitForTimeout(200);
    pruefe("Z1d falsche IBAN: freundlicher Hinweis, nichts gespeichert", /stimmt nicht/.test(await page.locator("[data-zmiban]").innerText()) && (await page.evaluate(() => (window.__FAKE.tabellen.fahrschule_zahlungsdaten || []).length)) === 0);
    // „Echt“ ohne IBAN geht nicht
    await page.fill("#zmForm input[name=iban]", "");
    await page.locator("#zmForm .zm-wahl:has(input[value=echt])").click();
    await page.click("#zmSpeichern"); await page.waitForTimeout(200);
    pruefe("Z1e „Echt“ ohne gültige IBAN: Hinweis, nichts gespeichert", /Echt.*erst/.test(await page.locator("[data-zmmodus]").innerText()) && (await page.evaluate(() => (window.__FAKE.tabellen.fahrschule_zahlungsdaten || []).length)) === 0);
    // richtig
    await page.fill("#zmForm input[name=iban]", "de89 3704 0044 0532 0130 00");
    await page.fill("#zmForm input[name=paypal]", "boostmuster");
    await page.fill("#zmForm textarea[name=impressum]", "Boost Fahrschule Muster\nBeispielstraße 1\n12345 Beispielstadt");
    await page.click("#zmSpeichern"); await page.waitForTimeout(300);
    const z = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_zahlungsdaten || []);
    pruefe("Z1f richtige IBAN mit Leerzeichen: gespeichert (ohne Leerzeichen, groß), Echt", z.length === 1 && z[0].iban === "DE89370400440532013000" && z[0].modus === "echt" && z[0].kontoinhaber === "Boost Fahrschule Muster" && z[0].fahrschule_id === "fs-test-1", JSON.stringify(z));
    pruefe("Z1g „Zuletzt geändert am TT.MM.JJJJ HH:MM“ (Leitung ohne PIN-Person: kein Name)", /Zuletzt geändert am \d\d\.\d\d\.\d{4} \d\d:\d\d\./.test(await page.locator("[data-zmzuletzt]").innerText()), await page.locator("[data-zmzuletzt]").innerText());
    pruefe("Z1h nach dem Speichern zeigt das Formular die gespeicherten Werte (Echt, IBAN gruppiert)", (await page.locator("#zmForm input[name=iban]").inputValue()) === "DE89 3704 0044 0532 0130 00" && await page.locator("#zmForm input[name=modus][value=echt]").isChecked());
    // Test-Adresse, zurück auf Test
    await page.locator("#zmForm .zm-wahl:has(input[value=test])").click();
    await page.fill("#zmForm input[name=test_email]", "test@example.org");
    await page.click("#zmSpeichern"); await page.waitForTimeout(300);
    const z2 = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_zahlungsdaten);
    pruefe("Z1i zweites Speichern ändert dieselbe Zeile (upsert): eine Zeile, Test, Test-Adresse", z2.length === 1 && z2[0].modus === "test" && z2[0].test_email === "test@example.org", JSON.stringify(z2));
    pruefe("Z1j keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
    await ctx.close();
  }

  // Z2 Rollen: Büro und Super-Admin sehen den Abschnitt, Fahrlehrer nicht
  {
    for (const nutzer of ["bu-1", "sa-1"]) {
      const { page, ctx } = await oeffne({ nutzer, vorbereiten: vor() });
      pruefe(`Z2 ${nutzer}: Abschnitt sichtbar`, await page.locator("#zmEinst").count() === 1);
      await ctx.close();
    }
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: vor() });
    await page.evaluate(() => { S.profil.rolle = "fahrlehrer"; zeichne(); });
    pruefe("Z2c Fahrlehrer: kein Abschnitt in den Einstellungen", await page.locator("#zmEinst").count() === 0);
    pruefe("Z2d Fahrlehrer: kein Block in der Akte (HTML leer)", await page.evaluate(() => zmBlockHTML("s3") === ""));
    await ctx.close();
  }

  // Z3 Akte: Knopf nur mit geplanter Prüfung, Betrag aus der Preisliste, Pflichtfeld, Rückgängig, Senden, Haken, Erinnerung
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", vorbereiten: vor() });
    const kein = await page.evaluate(() => S.schueler.find((s) => istAktiv(s) && !zmAngebote(s).length && !zahlungSperre(s)).id);
    pruefe("Z3a Schüler ohne geplante Prüfung, ohne Sperre: kein Block", (await (async () => { await oeffneAkte(page, kein); return page.locator("#zmBlock").count(); })()) === 0);
    await schliesseAlle(page);
    // s3: Praxisprüfung Klasse B in 2 Tagen (Tafel), Preis 120 €
    pruefe("Z3b s3 hat genau den Knopf „Prüfung“", JSON.stringify(await arten(page, "s3")) === '["pruefung"]');
    await oeffneAkte(page, "s3");
    const dlg = page.locator("dialog[open]").last();
    pruefe("Z3c Block „Zahlung per Mail“ mit Knopf „Zahlungsaufforderung verschicken“", /Zahlung per Mail/.test(await dlg.locator("#zmBlock h3").innerText()) && (await dlg.locator('[data-zmoeffne=pruefung]').innerText()) === "Zahlungsaufforderung verschicken");
    pruefe("Z3d Test-Modus deutlich: „Test-Modus: Mail geht an die Test-Adresse“", (await dlg.locator("[data-zmtest]").innerText()) === "Test-Modus: Mail geht an die Test-Adresse");
    const knopfH = await dlg.locator('[data-zmoeffne=pruefung]').evaluate((e) => e.getBoundingClientRect().height);
    pruefe("Z3e Knopf mindestens 44 px hoch", knopfH >= 44, String(knopfH));
    await dlg.locator('[data-zmoeffne=pruefung]').click();
    pruefe("Z3f Betrag aus der Preisliste vorbelegt (120,00), Wofür „Praktische Prüfung Klasse B“",
      (await dlg.locator("[data-zmbetrag]").inputValue()) === "120,00" && (await dlg.locator("[data-zmwofuer]").inputValue()) === "Praktische Prüfung Klasse B");
    // Enter im Feld speichert nicht die Akte und schließt nichts
    // Pflicht: leerer Betrag
    await dlg.locator("[data-zmbetrag]").fill("");
    await dlg.locator("[data-zmsenden]").click();
    pruefe("Z3g leerer Betrag: Hinweis, kein Aufruf", /Betrag/.test(await dlg.locator("[data-zmmeldung]").innerText()) && (await anrufe(page)).length === 0);
    await dlg.locator("[data-zmbetrag]").fill("0,50"); await dlg.locator("[data-zmsenden]").click();
    pruefe("Z3h Betrag unter 1 € wird abgelehnt", (await dlg.locator("[data-zmmeldung]").isVisible()) && (await anrufe(page)).length === 0);
    await dlg.locator("[data-zmbetrag]").fill("10001"); await dlg.locator("[data-zmsenden]").click();
    pruefe("Z3i Betrag über 10.000 € wird abgelehnt", (await dlg.locator("[data-zmmeldung]").isVisible()) && (await anrufe(page)).length === 0);
    await dlg.locator("[data-zmbetrag]").fill("120,00"); await dlg.locator("[data-zmwofuer]").fill("");
    await dlg.locator("[data-zmsenden]").click();
    pruefe("Z3j leeres „Wofür“: Hinweis, kein Aufruf", /wofür/.test(await dlg.locator("[data-zmmeldung]").innerText()) && (await anrufe(page)).length === 0);
    await dlg.locator("[data-zmwofuer]").fill("Praktische Prüfung Klasse B");
    // Enter im Betragsfeld sendet nur diese Mail (Hinweis „Mail wird gesendet“), die Akte bleibt offen
    // Senden, dann Rückgängig innerhalb der Wartezeit
    await dlg.locator("[data-zmsenden]").click();
    const s3name = await page.evaluate(() => S.schueler.find((x) => x.id === "s3").name);
    await page.locator(".toast-undo").waitFor({ timeout: 2000 });
    pruefe("Z3k nach „Senden“: Hinweis „Wird gesendet · 120,00 € · Name“ mit „Rückgängig“", (await page.locator(".toast-undo .toast-text").innerText()).replace(/\s+/g, " ") === `Wird gesendet · 120,00 € · ${s3name}`, await page.locator(".toast-undo .toast-text").innerText());
    pruefe("Z3k2 Rückgängig-Knopf mindestens 44 px, „Senden“ während des Wartens gesperrt mit Grund", (await page.locator(".toast-undo [data-undo]").evaluate((e) => e.getBoundingClientRect().height)) >= 44 && await dlg.locator("[data-zmsenden]").isDisabled() && /Gerade wird gesendet/.test(await dlg.locator("[data-zmgrund]").first().innerText()));
    pruefe("Z3l während des Wartens noch kein Aufruf", (await anrufe(page)).length === 0);
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(800);
    pruefe("Z3m Rückgängig: nie ein Aufruf, nichts gespeichert, kein Haken", (await anrufe(page)).length === 0 && (await page.evaluate(() => (window.__FAKE.tabellen.zahlungs_mails || []).length)) === 0 && await dlg.locator("[data-zmhaken]").count() === 0);
    pruefe("Z3n nach Rückgängig ist „Senden“ wieder frei, Eingaben bleiben", await dlg.locator("[data-zmsenden]").isEnabled() && (await dlg.locator("[data-zmbetrag]").inputValue()) === "120,00");
    // wirklich senden (Enter im Feld)
    pruefe("Z3n2 nach Rückgängig bleibt das Formular offen", await dlg.locator("[data-zmform]").isVisible());
    await dlg.locator("[data-zmbetrag]").press("Enter");
    await page.locator(".toast-undo").waitFor({ timeout: 2000 });
    pruefe("Z3o Enter im Feld schließt die Akte nicht (sendet nur die Mail)", await page.locator("dialog[open]").count() >= 1 && await page.locator(".toast-undo").count() === 1);
    await page.waitForTimeout(1300);
    const a = await anrufe(page);
    pruefe("Z3p nach der Wartezeit genau ein Aufruf mit Schüler, Art, Betrag in Cent, Wofür", a.length === 1 && a[0].body.schueler_id === "s3" && a[0].body.art === "pruefung" && a[0].body.betrag_cent === 12000 && a[0].body.wofuer === "Praktische Prüfung Klasse B" && a[0].body.erwarteter_modus === "test", JSON.stringify(a));
    pruefe("Z3q der Browser schickt keinen Empfänger", a.length === 1 && !("an" in a[0].body) && !("email" in a[0].body) && !("empfaenger" in a[0].body));
    const haken = await dlg.locator("[data-zmhaken=pruefung]").innerText();
    pruefe("Z3r Haken: „✓ gesendet am TT.MM.JJJJ HH:MM · 120,00 € · Wofür“ mit eigener Pill „Test“", /^✓ gesendet am \d\d\.\d\d\.\d{4} \d\d:\d\d · 120,00\s*€ · Praktische Prüfung Klasse B\s*Test$/.test(haken) && (await dlg.locator("[data-zmhaken] .zm-pill-test").innerText()) === "Test", haken);
    pruefe("Z3s Knopf heißt jetzt „Erinnerung schicken“", (await dlg.locator('[data-zmoeffne=pruefung]').innerText()) === "Erinnerung schicken");
    pruefe("Z3t Spur lokal und in der Tabelle, Erfolgs-Toast", (await page.evaluate(() => S.zahlungsMails.length)) === 1 && (await page.evaluate(() => window.__FAKE.tabellen.zahlungs_mails.length)) === 1 && await page.evaluate(() => [...document.querySelectorAll(".toast")].some((t) => /Gesendet an .+ ✓ \(Test: an die Test-Adresse\)/.test(t.textContent))));
    // Haken bleibt nach Neuladen der Daten (Spur kommt aus der Tabelle)
    await page.evaluate(async () => { await ladeDaten(); });
    await schliesseAlle(page); await oeffneAkte(page, "s3");
    pruefe("Z3u nach dem Neuladen der Daten steht der Haken noch da", await page.locator("[data-zmhaken=pruefung]").count() === 1);
    // zu_viele
    await page.evaluate(() => { window.__FAKE.fehler = { "zahlungs-mail": "zu_viele" }; });
    await page.locator('[data-zmoeffne=pruefung]').click();
    await page.locator("[data-zmbetrag]").fill("50");
    await page.locator("[data-zmsenden]").click(); await page.waitForTimeout(1300);
    pruefe("Z3v Fehler zu_viele: „Heute schon 5 Mails an diesen Schüler“ im Block", new RegExp(`^Mail an ${s3name}: Heute schon 5 Mails an diesen Schüler`).test(await page.locator("[data-zmmeldung]").innerText()));
    pruefe("Z3w Fehler: Formular bleibt offen, kein neuer Haken-Eintrag", await page.locator("[data-zmform]").isVisible() && (await page.evaluate(() => S.zahlungsMails.length)) === 1);
    await page.evaluate(() => { window.__FAKE.fehler = { "zahlungs-mail": "netz" }; });
    await page.locator("[data-zmsenden]").click(); await page.waitForTimeout(1300);
    pruefe("Z3x Funktion nicht erreichbar: „Versand gerade nicht möglich“", /Versand gerade nicht möglich/.test(await page.locator("[data-zmmeldung]").innerText()));
    for (const [code, text] of [["zahlungsdaten_fehlen", /Zahlungsdaten eintragen/], ["zu_viele_schule", /schon 100 Mails/], ["ungueltige_anfrage", /Versand gerade nicht möglich/], ["keine_email", /Keine E-Mail-Adresse in der Akte/], ["keine_testadresse", /Test-Adresse/], ["betrag", /Betrag/]]) {
      await page.evaluate((c) => { window.__FAKE.fehler = { "zahlungs-mail": c }; }, code);
      await page.locator("[data-zmsenden]").click(); await page.waitForTimeout(1200);
      pruefe(`Z3y Fehlercode ${code}: verständlicher Text`, text.test(await page.locator("[data-zmmeldung]").innerText()), await page.locator("[data-zmmeldung]").innerText());
    }
    pruefe("Z3z keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
    await ctx.close();
  }

  // Z4 Theorieprüfung ohne Preis: Betrag leer und Pflicht; Reaktivierung und „Zahlung offen“ nur in ihrem Fall
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", vorbereiten: vor() });
    await oeffneAkte(page, "s7");
    let dlg = page.locator("dialog[open]").last();
    await dlg.locator('[data-zmoeffne=pruefung]').click();
    pruefe("Z4a Theorieprüfung ohne Preis: Betrag leer, Wofür „Theorieprüfung Klasse B“",
      (await dlg.locator("[data-zmbetrag]").inputValue()) === "" && (await dlg.locator("[data-zmwofuer]").inputValue()) === "Theorieprüfung Klasse B");
    await dlg.locator("[data-zmsenden]").click();
    pruefe("Z4b ohne Betrag nicht sendbar (Pflicht)", /Betrag/.test(await dlg.locator("[data-zmmeldung]").innerText()) && (await anrufe(page)).length === 0);
    await schliesseAlle(page);
    // Reaktivierung
    const reakt = await page.evaluate(() => { const s = S.schueler.find((x) => JSON.stringify(zmAngebote(x).map((a) => a.art)) === '["reaktivierung"]'); return s ? s.id : null; });
    pruefe("Z4c es gibt einen Schüler mit nur „Reaktivierung fällig“", !!reakt);
    if (reakt) {
      await oeffneAkte(page, reakt);
      dlg = page.locator("dialog[open]").last();
      pruefe("Z4d nur der Knopf „Reaktivierung fällig“", (await dlg.locator("[data-zmoeffne]").count()) === 1 && (await dlg.locator("[data-zmoeffne]").innerText()) === "Reaktivierung fällig");
      await dlg.locator("[data-zmoeffne]").click();
      const erwartet = await page.evaluate((i) => (reaktBetrag(S.schueler.find((s) => s.id === i))).toFixed(2).replace(".", ","), reakt);
      pruefe("Z4e Betrag = Reaktivierungsbetrag (alter Betrag 240,00), Wofür „Reaktivierung“", (await dlg.locator("[data-zmbetrag]").inputValue()) === erwartet && erwartet === "240,00" && (await dlg.locator("[data-zmwofuer]").inputValue()) === "Reaktivierung", erwartet);
      await dlg.locator("[data-zmsenden]").click(); await page.waitForTimeout(1300);
      pruefe("Z4f gesendet: Haken bei Reaktivierung, Betrag 240,00 €", /gesendet am .* 240,00\s*€ · Reaktivierung\s*Test/.test(await dlg.locator("[data-zmhaken=reaktivierung]").innerText()));
      await schliesseAlle(page);
    }
    // Zahlung ausstehend (K8): s12
    pruefe("Z4g s12 hat genau den Knopf „Zahlung offen“", JSON.stringify(await arten(page, "s12")) === '["zahlung_offen"]');
    await oeffneAkte(page, "s12");
    dlg = page.locator("dialog[open]").last();
    pruefe("Z4h Knopf „Zahlung ausstehend, Termine gesperrt“", (await dlg.locator("[data-zmoeffne]").innerText()) === "Zahlung ausstehend, Termine gesperrt");
    await dlg.locator("[data-zmoeffne]").click();
    pruefe("Z4i Betrag leer (Pflicht), Wofür aus dem Grund „Rechnung offen“", (await dlg.locator("[data-zmbetrag]").inputValue()) === "" && (await dlg.locator("[data-zmwofuer]").inputValue()) === "Rechnung offen");
    await dlg.locator("[data-zmbetrag]").fill("1.250,50");
    await dlg.locator("[data-zmsenden]").click(); await page.waitForTimeout(1300);
    const a = await anrufe(page);
    pruefe("Z4j „1.250,50“ wird als 125050 Cent gesendet (Art zahlung_offen)", a.filter((x) => x.body.art === "zahlung_offen").length === 1 && a.find((x) => x.body.art === "zahlung_offen").body.betrag_cent === 125050, JSON.stringify(a.map((x) => x.body)));
    pruefe("Z4k keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
    await ctx.close();
  }

  // Z5 Zahlungsdaten fehlen / Echt-Modus ohne E-Mail / Echt mit E-Mail
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: vor({ daten: false }) });
    await oeffneAkte(page, "s3");
    let dlg = page.locator("dialog[open]").last();
    pruefe("Z5a ohne Zahlungsdaten: Hinweis mit Link „Einstellungen“, Knopf grau", /Zahlungsdaten eintragen/.test(await dlg.locator("[data-zmohnedaten]").innerText()) && await dlg.locator("[data-zmeinst]").count() === 1 && await dlg.locator("[data-zmoeffne]").isDisabled());
    await dlg.locator("[data-zmeinst]").click(); await page.waitForTimeout(400);
    pruefe("Z5b Link führt zu den Einstellungen (Fenster zu, Fristen-Seite)", (await page.locator("dialog[open]").count()) === 0 && /#fristen/.test(await page.evaluate(() => location.hash)));
    await ctx.close();
    const e = await oeffne({ nutzer: "ad-1", vorbereiten: vor({ modus: "echt" }) });
    await oeffneAkte(e.page, "s3");
    dlg = e.page.locator("dialog[open]").last();
    pruefe("Z5c Echt-Modus ohne E-Mail: Knopf grau, Hinweis „Keine E-Mail-Adresse in der Akte“", await dlg.locator("[data-zmoeffne]").isDisabled() && /Keine E-Mail-Adresse in der Akte/.test(await dlg.locator("[data-zmkeinemail]").innerText()));
    pruefe("Z5d Echt-Modus: kein Test-Hinweis, Knopf „Mail an Schüler senden“", await dlg.locator("[data-zmtest]").count() === 0);
    await schliesseAlle(e.page);
    await e.page.evaluate(() => { S.schueler.find((s) => s.id === "s3").email = "schueler@example.org"; window.__FAKE.tabellen.schueler.find((s) => s.id === "s3").email = "schueler@example.org"; });
    await oeffneAkte(e.page, "s3");
    dlg = e.page.locator("dialog[open]").last();
    pruefe("Z5d2 Echt-Zeile kräftig: „Echt: Mail geht an schueler@example.org“", (await dlg.locator("[data-zmecht]").innerText()) === "Echt: Mail geht an schueler@example.org");
    await dlg.locator("[data-zmoeffne]").click();
    pruefe("Z5d3 Senden-Knopf heißt „Mail an Schüler senden“", (await dlg.locator("[data-zmsenden]").innerText()) === "Mail an Schüler senden");
    await dlg.locator("[data-zmbetrag]").fill("120");
    await dlg.locator("[data-zmsenden]").click(); await e.page.waitForTimeout(1300);
    const haken = await dlg.locator("[data-zmhaken=pruefung]").innerText();
    pruefe("Z5e Echt mit E-Mail: Haken ohne „Test“", /^✓ gesendet am .* 120,00\s*€ · Praktische Prüfung Klasse B$/.test(haken), haken);
    await e.ctx.close();
  }

  // Z6 alte Datenbank ohne die Tabellen: Hinweis, kein Block, nichts kaputt
  {
    const fehlt = (n) => `relation "public.${n}" does not exist`;
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", vorbereiten: new Function("F", `${vor().toString().replace(/^[^{]*{/, "").replace(/}\s*$/, "")}\n F.fehler = { fahrschule_zahlungsdaten: ${JSON.stringify(fehlt("fahrschule_zahlungsdaten"))}, zahlungs_mails: ${JSON.stringify(fehlt("zahlungs_mails"))} };`) });
    pruefe("Z6a Einstellungen: „Noch nicht eingerichtet“, kein Formular", /Noch nicht eingerichtet/.test(await page.locator("#zmEinst").innerText()) && await page.locator("#zmForm").count() === 0);
    await oeffneAkte(page, "s3");
    pruefe("Z6b Akte öffnet sich, kein Block „Zahlung per Mail“", await page.locator("#zmBlock").count() === 0 && await page.locator("dialog[open]").count() === 1);
    pruefe("Z6c Seite funktioniert weiter (Einstellung Reaktivierung da) und keine JS-Fehler (außer dem erwarteten Ladefehler)", await page.locator("#einstForm").count() === 1 && jsFehler(konsole, /fahrschule_zahlungsdaten|zahlungs_mails/).length === 0, konsole.join(" | "));
    // kurzer Netzfehler beim Laden: letzter Stand bleibt
    await ctx.close();
    const n = await oeffne({ nutzer: "sa-1", vorbereiten: vor() });
    await n.page.evaluate(async () => { window.__FAKE.fehler = { fahrschule_zahlungsdaten: "Failed to fetch", zahlungs_mails: "Failed to fetch" }; await ladeDaten(); });
    pruefe("Z6d Netzfehler beim Neuladen: Zahlungsdaten bleiben, Abschnitt bleibt", await n.page.evaluate(() => !!S.zahlungsdaten && S.zmFehlt === false) && await n.page.locator("#zmForm").count() === 1);
    // Schulwechsel leert
    await n.page.evaluate(() => { window.__FAKE.fehler = { fahrschule_zahlungsdaten: "Failed to fetch", zahlungs_mails: "Failed to fetch" }; });
    const nachWechsel = await n.page.evaluate(async () => { const sel = document.getElementById("schulWahl"); sel.value = "fs-test-2"; sel.dispatchEvent(new Event("change")); await new Promise((r) => setTimeout(r, 600)); return [S.fsId, S.zahlungsdaten, S.zahlungsMails.length]; });
    pruefe("Z6e Schulwechsel (mit Ladefehler): Zahlungsdaten und Spur der vorigen Schule sind weg", nachWechsel[0] === "fs-test-2" && nachWechsel[1] === null && nachWechsel[2] === 0, JSON.stringify(nachWechsel));
    await n.ctx.close();
  }

  // Z7 Handy 360 px: nichts wischt seitlich, Auswahlflächen und Knöpfe groß genug
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", vorbereiten: vor(), breite: 360, hoehe: 740 });
    const breit = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    pruefe("Z7a Einstellungen 360 px: kein seitliches Wischen", (await breit()) <= 0, String(await breit()));
    const klein = await page.evaluate(() => [...document.querySelectorAll("#zmForm .zm-wahl, #zmSpeichern")].filter((e) => e.getBoundingClientRect().height < 44).length);
    pruefe("Z7b Auswahlflächen und Speichern-Knopf mindestens 44 px", klein === 0);
    const ueber = await page.evaluate(() => [...document.querySelectorAll("#zmEinst *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length);
    pruefe("Z7c nichts ragt rechts aus dem Bild (Einstellungen)", ueber === 0, String(ueber));
    await oeffneAkte(page, "s12");
    const dlg = page.locator("dialog[open]").last();
    await dlg.locator("[data-zmoeffne]").click();
    await dlg.locator("[data-zmbetrag]").fill("50");
    await dlg.locator("[data-zmsenden]").click(); await page.locator(".toast-undo").waitFor({ timeout: 2000 });
    const dl = await dlg.evaluate((d) => [d.scrollWidth, d.clientWidth, document.documentElement.scrollWidth - window.innerWidth, [...d.querySelectorAll("#zmBlock *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length]);
    pruefe("Z7d Akte mit offenem Formular 360 px: kein seitliches Wischen", dl[0] <= dl[1] + 1 && dl[2] <= 0 && dl[3] === 0, JSON.stringify(dl));
    const hohe = await dlg.evaluate((d) => [...d.querySelectorAll("[data-zmoeffne], [data-zmsenden], [data-zmbetrag], [data-zmwofuer]")].filter((e) => e.getBoundingClientRect().height < 44).length);
    pruefe("Z7e Knöpfe und Felder im Block mindestens 44 px", hohe === 0, String(hohe));
    const lage = await page.evaluate(() => { const t = document.querySelector(".toast-undo").getBoundingClientRect(), f = document.querySelector("dialog[open] footer").getBoundingClientRect(); return [t.bottom, f.top, t.left, t.right]; });
    pruefe("Z7e2 Rückgängig-Hinweis liegt nicht über „Abbrechen/Speichern“ (360 px) und ragt nicht seitlich hinaus", lage[0] <= lage[1] && lage[2] >= 0 && lage[3] <= 360, JSON.stringify(lage));
    await page.waitForTimeout(1200);
    pruefe("Z7f keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
    await ctx.close();
  }

  // Z8 dunkel: Block lesbar (Variablen), Hinweisfarben nicht weiß auf weiß
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", vorbereiten: vor() });
    await page.emulateMedia({ colorScheme: "dark" });
    await oeffneAkte(page, "s3");
    const farben = await page.evaluate(() => { const t = document.querySelector("[data-zmtest]"), a = document.querySelector(".zm-art"); return [getComputedStyle(t).color, getComputedStyle(t).backgroundColor, getComputedStyle(a).backgroundColor]; });
    pruefe("Z8 dunkel: Test-Hinweis hat Text- und Hintergrundfarbe aus den Variablen (nicht gleich)", farben[0] !== farben[1], JSON.stringify(farben));
    await ctx.close();
  }

  // Z9 Nachbesserung: Modus geändert, Haken je Modus, Ladefehler, Konflikt beim Speichern, Entwürfe, nur eine Mail zugleich
  {
    // a) Modus inzwischen umgestellt: Server lehnt ab, nichts gesendet, Bildschirm zieht nach
    const a = await oeffne({ nutzer: "ad-1", vorbereiten: vor() });
    await oeffneAkte(a.page, "s3");
    let dlg = a.page.locator("dialog[open]").last();
    await dlg.locator("[data-zmoeffne]").click();
    await a.page.evaluate(() => { window.__FAKE.tabellen.fahrschule_zahlungsdaten[0].modus = "echt"; });
    await dlg.locator("[data-zmsenden]").click(); await a.page.waitForTimeout(1500);
    const t = await dlg.locator("[data-zmmeldung]").innerText();
    pruefe("Z9a Modus inzwischen Echt: „Der Modus wurde inzwischen auf Echt umgestellt. Es wurde nichts gesendet …“ mit Namen", /^Mail an .+: Der Modus wurde inzwischen auf Echt umgestellt\. Es wurde nichts gesendet\. Bitte prüfen und noch einmal senden\.$/.test(t), t);
    pruefe("Z9b nichts gesendet, Bildschirm zeigt jetzt Echt (Zeile und Knopf)", (await a.page.evaluate(() => (window.__FAKE.tabellen.zahlungs_mails || []).length)) === 0 && await dlg.locator("[data-zmecht]").count() === 1 && (await dlg.locator("[data-zmsenden]").innerText()) === "Mail an Schüler senden" && await a.page.evaluate(() => S.zahlungsdaten.modus === "echt"));
    pruefe("Z9b2 Fehler steht nur einmal (kein Toast-Duplikat)", await a.page.evaluate(() => [...document.querySelectorAll(".toast.fehler.zeigen")].filter((x) => /Mail an/.test(x.textContent)).length) === 0);
    await a.ctx.close();
    // b) Haken nur im aktuellen Modus: Test-Mail alt, Modus Echt → kein Haken, Knopf nicht „Erinnerung“
    const b = await oeffne({ nutzer: "ad-1", vorbereiten: vor({ modus: "echt", extra: `F.tabellen.schueler.find((x) => x.id === "s3").email = "schueler@example.org"; F.tabellen.zahlungs_mails = [{ id: "m1", fahrschule_id: "fs-test-1", schueler_id: "s3", art: "pruefung", betrag_cent: 12000, wofuer: "Praktische Prüfung Klasse B", modus: "test", status: "gesendet", angelegt_am: new Date().toISOString(), gesendet_am: new Date().toISOString() }];` }) });
    await oeffneAkte(b.page, "s3");
    dlg = b.page.locator("dialog[open]").last();
    pruefe("Z9c Echt-Modus: Test-Haken erscheint nicht, Knopf heißt nicht „Erinnerung schicken“", await dlg.locator("[data-zmhaken]").count() === 0 && (await dlg.locator("[data-zmoeffne]").innerText()) === "Zahlungsaufforderung verschicken");
    await b.ctx.close();
    // c) Ladefehler (nicht „Tabelle fehlt“)
    const c = await oeffne({ nutzer: "ad-1", vorbereiten: vor({ extra: `F.fehler = { fahrschule_zahlungsdaten: "Failed to fetch" };` }) });
    pruefe("Z9d Ladefehler: Einstellungen zeigen Hinweis statt Formular", /Zahlungsdaten konnten nicht geladen werden\. Bitte Seite neu laden\./.test(await c.page.locator("#zmEinst").innerText()) && await c.page.locator("#zmForm").count() === 0);
    await oeffneAkte(c.page, "s3");
    dlg = c.page.locator("dialog[open]").last();
    pruefe("Z9e Ladefehler: Akte mit demselben Hinweis, Knopf gesperrt", /nicht geladen werden/.test(await dlg.locator("[data-zmladefehler]").innerText()) && await dlg.locator("[data-zmoeffne]").isDisabled());
    await c.page.evaluate(() => { window.__FAKE.fehler = {}; });
    await c.page.evaluate(async () => { await ladeDaten(); });
    pruefe("Z9f später erfolgreich geladen: Hinweis weg, Formular da", await c.page.locator("#zmForm").count() === 1);
    await c.ctx.close();
    // d) Konflikt beim Speichern + Entwurf übersteht Neuzeichnen
    const d = await oeffne({ nutzer: "ad-1", vorbereiten: vor() });
    await d.page.fill("#zmForm input[name=kontoinhaber]", "Neuer Entwurf Muster");
    await d.page.evaluate(() => zeichne());
    pruefe("Z9g ungespeicherte Eingabe überlebt das Neuzeichnen", (await d.page.locator("#zmForm input[name=kontoinhaber]").inputValue()) === "Neuer Entwurf Muster");
    await d.page.evaluate(() => { window.__FAKE.tabellen.fahrschule_zahlungsdaten[0].geaendert_am = "2026-11-22T08:00:00Z"; window.__FAKE.tabellen.fahrschule_zahlungsdaten[0].kontoinhaber = "Andere Person"; });
    await d.page.click("#zmSpeichern"); await d.page.waitForTimeout(300);
    pruefe("Z9h Jemand anderes hat geändert: Hinweis, nichts überschrieben", /inzwischen von jemand anderem geändert/.test(await d.page.locator("[data-zmspeicher]").innerText()) && (await d.page.evaluate(() => window.__FAKE.tabellen.fahrschule_zahlungsdaten[0].kontoinhaber)) === "Andere Person");
    await d.ctx.close();
    // e) nur eine Mail zugleich; Entwurf bleibt nach Rückgängig
    const e = await oeffne({ nutzer: "ad-1", vorbereiten: vor({ extra: `const q = F.tabellen.schueler.find((x) => x.id === "s3"); q.zahlung_gesperrt_seit = ${JSON.stringify(HEUTE)};` }) });
    await oeffneAkte(e.page, "s3");
    dlg = e.page.locator("dialog[open]").last();
    await dlg.locator("[data-zmoeffne=pruefung]").click();
    await dlg.locator('[data-zmart=pruefung] [data-zmbetrag]').fill("88");
    await dlg.locator("[data-zmsenden=pruefung]").click(); await e.page.locator(".toast-undo").waitFor({ timeout: 2000 });
    const anderes = dlg.locator("[data-zmart=zahlung_offen]");
    pruefe("Z9i andere Art während der Wartezeit gesperrt: „Erst die laufende Mail abwarten“", await anderes.locator("[data-zmoeffne]").isDisabled() && /Erst die laufende Mail abwarten/.test(await anderes.locator("[data-zmgrund]").first().innerText()));
    await e.page.locator(".toast-undo [data-undo]").click(); await e.page.waitForTimeout(400);
    pruefe("Z9j nach Rückgängig sind beide wieder frei, Betrag „88“ bleibt stehen", await anderes.locator("[data-zmoeffne]").isEnabled() && (await dlg.locator('[data-zmart=pruefung] [data-zmbetrag]').inputValue()) === "88");
    // Akte zu und wieder auf, während die Mail wartet: Block wird neu gefunden
    await dlg.locator("[data-zmsenden=pruefung]").click(); await e.page.locator(".toast-undo").waitFor({ timeout: 2000 });
    await schliesseAlle(e.page); await oeffneAkte(e.page, "s3");
    await e.page.waitForTimeout(1500);
    pruefe("Z9k Akte zu und wieder auf während des Wartens: Mail geht raus, Haken erscheint im neuen Fenster", await e.page.locator("[data-zmhaken=pruefung]").count() === 1 && (await anrufe(e.page)).length === 1);
    await e.ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
