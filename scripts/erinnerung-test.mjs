// W15 Schritt 5: „Erinnerung schicken“ für Fristen ohne Zahlung im Büro (Theorie, Antrag, Frist der Behörde, Umschreiber),
// echter Browser mit erfundenen Daten (Attrappe buero-vorfuehrung.js, die Funktion „erinnerungs-mail“ ist dort nachgebaut, nichts wird verschickt).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/erinnerung-test.mjs
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

const KRmon = (iso, m) => { const [j, mo, t] = iso.split("-").map(Number); const z = new Date(j, mo - 1 + m, 1); const l = new Date(z.getFullYear(), z.getMonth() + 1, 0).getDate(); z.setDate(Math.min(t, l)); return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, "0")}-${String(z.getDate()).padStart(2, "0")}`; };
const ZD = { fahrschule_id: "fs-test-1", kontoinhaber: "Boost Fahrschule Muster", iban: "DE89370400440532013000", modus: "test", test_email: "test@example.org", geaendert_am: "2026-11-20T10:00:00Z" };
// s5: Frist der Behörde in 20 Tagen; s6: Antrag läuft in 30 Tagen ab; s7: Theorieunterricht läuft in 25 Tagen ab; s8: Umschreiber (Türkei) in 10 Tagen
const vor = (o = {}) => new Function("F", `
  ${o.daten === false ? "" : `F.tabellen.fahrschule_zahlungsdaten = [Object.assign(${JSON.stringify(ZD)}, { modus: ${JSON.stringify(o.modus || "test")} })];`}
  const s = (id) => F.tabellen.schueler.find((x) => x.id === id);
  for (const id of ["s5", "s6", "s7", "s8"]) Object.assign(s(id), { theorie_frist_bis: null, antrag_am: null, theorie_abgeschlossen_am: null, theorie_bestanden_am: null, auslands_fs: [], ausbildungsart: "ersterwerb", wohnsitz_de_seit: null });
  s("s5").theorie_frist_bis = ${JSON.stringify(KRtag(20))};
  s("s6").antrag_am = ${JSON.stringify(KRmon(KRtag(30), -12))};
  s("s7").theorie_abgeschlossen_am = ${JSON.stringify(KRmon(KRtag(25), -12))};
  Object.assign(s("s8"), { ausbildungsart: "umschreibung", auslands_fs: [{ land: "Türkei" }], wohnsitz_de_seit: ${JSON.stringify(KRmon(KRtag(10), -6))} });
  ${o.extra || ""}
`);
const jsFehler = (konsole) => konsole.filter(Boolean);
const anrufe = (page) => page.evaluate(() => window.__FAKE.log.filter((l) => l.function === "erinnerungs-mail"));
const schliesseAlle = async (page) => { await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close())); await page.waitForTimeout(100); };
const zeile = (page, sid, art) => page.locator(`[data-baldliste] tr[data-bald="${art}"]`, { has: page.locator(`[data-balderinnern="${sid}"][data-baldart="${art}"]`) });

try {
  // E1 Liste: Knopf bei jeder Frist ohne Zahlung, die bald abläuft; Fahrlehrer-Fristen ohne Knopf
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#fristen?ansicht=bald", vorbereiten: vor() });
    for (const [sid, art] of [["s5", "behoerde"], ["s6", "antrag"], ["s7", "theorie"], ["s8", "umschreiber"]])
      pruefe(`E1 ${art}: Knopf „Erinnerung schicken“ in „Läuft bald ab“`, (await zeile(page, sid, art).count()) === 1);
    pruefe("E1b Fahrlehrer-Fristen ohne Knopf", (await page.locator('[data-baldliste] tr[data-bald="fahrlehrer"] [data-balderinnern]').count()) === 0);
    const h = await zeile(page, "s5", "behoerde").locator("[data-balderinnern]").evaluate((e) => e.getBoundingClientRect().height);
    pruefe("E1c Knopf mindestens 44 px", h >= 44, String(h));
    // E2 Klick öffnet die Akte bei der Zeile der Frist
    await zeile(page, "s5", "behoerde").locator("[data-balderinnern]").click();
    await page.waitForSelector("dialog[open] #emBlock"); await page.waitForTimeout(150);
    const dlg = page.locator("dialog[open]").last(), r = dlg.locator('#emBlock [data-emart="behoerde"]');
    const fristDE = KRtag(20).split("-").reverse().join(".");
    pruefe("E2a Akte offen mit „Erinnerung per Mail“, Zeile der Behörden-Frist mit Datum", (await r.count()) === 1 && (await r.innerText()).includes("Frist der Behörde) " + fristDE), await r.innerText().catch(() => ""));
    pruefe("E2b Knopf im Fokus", await page.evaluate(() => !!(document.activeElement && document.activeElement.matches('[data-emsenden="behoerde"]'))));
    pruefe("E2c Test-Modus deutlich", (await dlg.locator("[data-emtest]").innerText()) === "Test-Modus: Mail geht an die Test-Adresse" && (await r.locator("[data-emsenden]").innerText()) === "Test-Erinnerung schicken");
    // E3 Rückgängig: kein Aufruf
    await r.locator("[data-emsenden]").click();
    await page.locator(".toast-undo").waitFor({ timeout: 2000 });
    pruefe("E3a Hinweis „Test-Erinnerung wird gesendet · Name“ mit Rückgängig", /^Test-Erinnerung wird gesendet · /.test(await page.locator(".toast-undo .toast-text").innerText()));
    pruefe("E3b während des Wartens ist der Knopf gesperrt", await dlg.locator('[data-emsenden="behoerde"]').isDisabled());
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(800);
    pruefe("E3c Rückgängig: kein Aufruf, Knopf wieder frei", (await anrufe(page)).length === 0 && await dlg.locator('[data-emsenden="behoerde"]').isEnabled());
    // E4 Senden
    await dlg.locator('[data-emsenden="behoerde"]').click(); await page.waitForTimeout(1300);
    const a = await anrufe(page);
    pruefe("E4a genau ein Aufruf: Schüler, Art, Modus (kein Betrag, keine Adresse)", a.length === 1 && a[0].body.schueler_id === "s5" && a[0].body.art === "behoerde" && a[0].body.erwarteter_modus === "test" && !("betrag_cent" in a[0].body), JSON.stringify(a));
    pruefe("E4b Haken „✓ erinnert am … Test“ in der Akte", /✓ erinnert am \d\d\.\d\d\.\d{4} \d\d:\d\d\s*Test/.test(await dlg.locator('[data-emhaken="behoerde"]').innerText()));
    pruefe("E4c Bestätigung „Erinnerung gesendet an … (Test …)“", /Erinnerung gesendet an .* ✓ \(Test/.test(await page.locator("#toast").innerText()));
    await schliesseAlle(page); await page.evaluate(() => zeichne()); await page.waitForTimeout(150);
    pruefe("E4d Liste: „✓ erinnert am … (Test)“", /✓ erinnert am \d\d\.\d\d\.\d{4} \(Test\)/.test(await page.locator('[data-baldliste] tr[data-bald="behoerde"] [data-balderinnert]').first().innerText()));
    // E5 Fehler vom Server: verständlicher Text im Block
    await zeile(page, "s6", "antrag").locator("[data-balderinnern]").click();
    await page.waitForSelector("dialog[open] #emBlock"); await page.waitForTimeout(150);
    const d2 = page.locator("dialog[open]").last();
    for (const [code, text] of [["nicht_faellig", /noch nicht in der Warnzeit/], ["abgelaufen", /schon abgelaufen/], ["zu_viele", /Heute schon 5 Mails/], ["keine_frist", /gibt es diese Frist nicht/], ["netz", /Versand gerade nicht möglich/]]) {
      await page.evaluate((c) => { window.__FAKE.fehler = { "erinnerungs-mail": c }; }, code);
      await d2.locator('[data-emsenden="antrag"]').click(); await page.waitForTimeout(1300);
      const t = await page.locator('dialog[open] [data-emart="antrag"] [data-emmeldung]').innerText().catch(() => "");
      pruefe(`E5 Fehler ${code}: verständlicher Text`, text.test(t), t);
    }
    await page.evaluate(() => { window.__FAKE.fehler = {}; });
    pruefe("E5z keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E6 Spur-Tabelle fehlt (Datenbank-Update noch nicht da): keine Knöpfe, kein Block
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#fristen?ansicht=bald", vorbereiten: vor({ extra: `F.fehler = Object.assign(F.fehler || {}, { erinnerungs_mails: 'relation "erinnerungs_mails" does not exist' });` }) });
    pruefe("E6a ohne Spur-Tabelle: keine Erinnerungs-Knöpfe bei Fristen ohne Zahlung", (await page.locator('[data-balderinnern]:not([data-baldart="reaktivierung"])').count()) === 0);
    await page.evaluate(() => schuelerDialog("s5")); await page.waitForSelector("dialog[open]"); await page.waitForTimeout(100);
    pruefe("E6b kein Block in der Akte", (await page.locator("dialog[open] #emBlock").count()) === 0);
    pruefe("E6c keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E7 Echt-Modus: Empfänger sichtbar; ohne E-Mail gesperrt mit Hinweis
  {
    const { page, ctx } = await oeffne({ nutzer: "ad-1", hash: "#fristen?ansicht=bald", vorbereiten: vor({ modus: "echt", extra: `s("s5").email = "lena@example.org"; s("s7").email = ""; s("s7").ausbildung = Object.assign({}, s("s7").ausbildung, { email: "" });` }) });
    await page.evaluate(() => schuelerDialog("s5")); await page.waitForSelector("dialog[open] #emBlock"); await page.waitForTimeout(100);
    pruefe("E7a Echt: „Echt: Mail geht an lena@example.org“, Knopf „Erinnerung schicken“", (await page.locator("dialog[open] [data-emecht]").innerText()) === "Echt: Mail geht an lena@example.org" && (await page.locator('dialog[open] [data-emsenden="behoerde"]').innerText()) === "Erinnerung schicken");
    await page.locator('dialog[open] [data-emsenden="behoerde"]').click(); await page.waitForTimeout(1300);
    const a = await anrufe(page);
    pruefe("E7b Echt: Aufruf mit den erwarteten Empfängern (Server prüft sie)", a.length === 1 && JSON.stringify(a[0].body.erwartete_empfaenger) === '["lena@example.org"]' && a[0].body.erwarteter_modus === "echt");
    await schliesseAlle(page);
    await page.evaluate(() => schuelerDialog("s7")); await page.waitForSelector("dialog[open] #emBlock"); await page.waitForTimeout(100);
    pruefe("E7c Echt ohne E-Mail: Knopf gesperrt, Hinweis", await page.locator('dialog[open] [data-emsenden="theorie"]').isDisabled() && /Keine E-Mail-Adresse in der Akte/.test(await page.locator("dialog[open] #emBlock").innerText()));
    await ctx.close();
  }
  // E8 Büro-Person (Recht wie Leitung) sieht die Knöpfe; Handy 360 px ohne seitliches Wischen
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#fristen?ansicht=bald", vorbereiten: vor(), breite: 360, hoehe: 740 });
    pruefe("E8a Büro: Knöpfe da", (await page.locator('[data-balderinnern][data-baldart="behoerde"]').count()) === 1);
    pruefe("E8b 360 px: kein seitliches Wischen", (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
    const klein = await page.evaluate(() => [...document.querySelectorAll("[data-balderinnern]")].filter((e) => e.getBoundingClientRect().height < 44).length);
    pruefe("E8c 360 px: Knöpfe mindestens 44 px", klein === 0);
    await page.evaluate(() => schuelerDialog("s8")); await page.waitForSelector("dialog[open] #emBlock"); await page.waitForTimeout(100);
    const ueber = await page.evaluate(() => [...document.querySelectorAll("dialog[open] #emBlock *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length);
    pruefe("E8d 360 px: Block „Erinnerung per Mail“ ragt nicht heraus, Umschreiber-Zeile da", ueber === 0 && (await page.locator('dialog[open] [data-emart="umschreiber"]').count()) === 1);
    pruefe("E8e keine JS-Fehler", jsFehler(konsole).length === 0, konsole.join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\nErinnerung-Test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
