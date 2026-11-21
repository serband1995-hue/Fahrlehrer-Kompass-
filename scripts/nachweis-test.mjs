// Test Ausbildungsnachweis im Büro (buero-nachweis.js), im echten Browser mit erfundenen Daten (Attrappe).
// Prüft: Knopf in der Schüler-Akte, Übersicht, Ändern mit Grund (Unterschrift wird ungültig, Spur), Löschen in den
// Papierkorb und zurückholen, Nachtragen, Druckbild A4 (heute mit, ab 01.07.2027 ohne Schüler-Unterschrift), 360 px.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/nachweis-test.mjs [ordner-fuer-fotos]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FOTOS = process.argv[2] || null;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
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
if (FOTOS) await mkdir(FOTOS, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let probleme = 0, ok = 0;
const fehler = (t) => { probleme++; console.log("FEHLER:", t); };
const pruef = (bed, t) => { if (bed) ok++; else fehler(t); };

async function oeffne({ breite = 1366, hoehe = 860, heute }) {
  const tag = heute || new Date().toISOString().slice(0, 10);
  const daten = bauDaten(tag);
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  if (heute) await page.clock.setFixedTime(new Date(heute + "T15:00:00"));
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: "bu-1", email: "bu-1@example.org" } } }; }, [daten]);
  await page.goto(basis + "buero.html#schueler");
  await page.waitForTimeout(400);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1500 }).catch(() => null);
  if (frage) { await page.click('#werListe button:has-text("Paula Muster")'); await page.keyboard.type("7352", { delay: 20 }); await page.waitForTimeout(200); }
  return { page, ctx, konsole };
}
// Schüler mit den meisten vergangenen Fahrstunden und Unterschriften
function testSchueler(heute) {
  const d = bauDaten(heute || new Date().toISOString().slice(0, 10));
  const z = {};
  for (const t of d.tabellen.kalender_termine) if (t.schueler_id && t.datum < (heute || new Date().toISOString().slice(0, 10))) z[t.schueler_id] = (z[t.schueler_id] || 0) + 1;
  const aktiv = new Set(d.tabellen.schueler.filter((s) => !s.inaktiv_seit && s.fahrlehrer_id).map((s) => s.id));
  return Object.entries(z).filter(([id]) => aktiv.has(id)).sort((a, b) => b[1] - a[1])[0][0];
}
const top = (page) => page.locator("dialog[open]").last();

// ---------- 1. Büro am PC: ganzer Ablauf ----------
{
  const sid = testSchueler();
  const { page, ctx, konsole } = await oeffne({});
  await page.click(`[data-sbearb="${sid}"]`);
  await page.waitForSelector("#nwOeffnen");
  pruef(await page.locator("#nwOeffnen").isVisible(), "Knopf Ausbildungsnachweis in der Akte nicht sichtbar");
  await page.click("#nwOeffnen");
  await page.waitForSelector(".nw-kacheln");
  const zeilen = await top(page).locator(".nw-liste").first().locator(".nw-zeile").count();
  pruef(zeilen > 3, "zu wenige gefahrene Stunden in der Übersicht: " + zeilen);
  const gut = await top(page).locator(".nw-liste .marke-pill.gruen:has-text('unterschrieben')").count();
  pruef(gut > 0, "keine unterschriebene Stunde angezeigt");
  pruef(await top(page).locator(".nw-fehlt").count() === 1, "„Noch offen“ fehlt");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "nachweis-uebersicht-1366.png") });

  // Ändern einer unterschriebenen Stunde mit Grund
  const zeile = top(page).locator(".nw-liste .nw-zeile:has(.marke-pill.gruen)").first();
  const tid = await zeile.locator("[data-nwaendern]").getAttribute("data-nwaendern");
  await zeile.locator("[data-nwaendern]").click();
  await page.waitForTimeout(150);
  pruef(await top(page).locator(".fl-warnung:has-text('schon unterschrieben')").count() === 1, "Warnung „schon unterschrieben“ fehlt");
  await top(page).locator("input[name=von]").fill("07:45");
  await top(page).locator("input[name=grund]").fill("Uhrzeit falsch eingetragen");
  await top(page).locator("button[value=ok]").click();
  await page.waitForTimeout(200);
  await top(page).locator("button:has-text('Ja, ändern')").click().catch(() => fehler("Rückfrage „Unterschrift wird ungültig“ fehlt"));
  await page.waitForTimeout(400);
  const t1 = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id), tid);
  pruef(t1.von === "07:45", "Uhrzeit nicht gespeichert");
  pruef(t1.payload.signed === false && t1.payload.signaturUngueltig && t1.payload.signaturUngueltig.snap, "Unterschrift nicht ungültig gemacht / alter Abdruck fehlt");
  pruef(!("korrekturGrund" in t1.payload), "Grund steht noch im Termin");
  const spur = await page.evaluate((id) => (window.__FAKE.tabellen.aenderungsprotokoll || []).filter((p) => p.datensatz_id === id), tid);
  pruef(spur.some((p) => p.feld === "von" && p.grund === "Uhrzeit falsch eingetragen" && p.bearbeiter === "Paula Muster"), "Spur mit Grund und Name fehlt: " + JSON.stringify(spur));
  pruef(await top(page).locator(".marke-pill.rot:has-text('neu unterschreiben')").count() >= 1, "„neu unterschreiben“ nicht angezeigt");
  await top(page).locator(".nw-details summary:has-text('Verlauf')").click();
  pruef(await top(page).locator(".nw-spur li:has-text('Uhrzeit falsch eingetragen')").count() >= 1, "Verlauf zeigt den Grund nicht");

  // Nacht-Sonderfahrt aus der App (art „sonder“ + srcSonder), unterschrieben: unverändert speichern → keine Rückfrage, nichts ungültig
  const nachtId = await page.evaluate((sid) => { const t = window.__FAKE.tabellen.kalender_termine.find((x) => x.schueler_id === sid && x.datum < KR.todayISO() && x.payload && x.payload.signed);
    t.art = "sonder"; t.payload.srcSonder = sid + ":nacht:0"; return t.id; }, sid);
  // Nachweis neu öffnen, damit die geänderten Testdaten frisch geladen werden
  await page.locator("dialog[open]").last().locator("footer [data-schliessen]").click(); await page.waitForTimeout(200);
  await page.click("#nwOeffnen"); await page.waitForSelector(".nw-kacheln");
  await top(page).locator(`[data-nwaendern="${nachtId}"]`).click(); await page.waitForTimeout(150);
  pruef(await top(page).locator("select[name=artwahl]").inputValue() === "nacht", "Nacht-Sonderfahrt der App nicht als Nacht erkannt");
  await top(page).locator("button[value=ok]").click(); await page.waitForTimeout(300);
  pruef(await page.locator("dialog[open] button:has-text('Ja, ändern')").count() === 0, "falsche Rückfrage „Unterschrift wird ungültig“ ohne Änderung");
  const tn = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id), nachtId);
  pruef(tn.art === "sonder" && tn.payload.signed === true, "unverändert gespeichert, aber Art/Unterschrift verändert: " + JSON.stringify([tn.art, tn.payload.signed]));
  // Sonderfahrt ohne Art: Auswahl startet leer, Überland wählen → gespeichert, Warnung weg; Art-Wechsel setzt sonderArt auf null statt zu löschen
  const ohneId = await page.evaluate((sid) => { const t = window.__FAKE.tabellen.kalender_termine.find((x) => x.schueler_id === sid && x.datum < KR.todayISO() && !(x.payload || {}).signed && x.art === "fahrstunde");
    t.art = "sonder"; return t.id; }, sid);
  await page.locator("dialog[open]").last().locator("footer [data-schliessen]").click(); await page.waitForTimeout(200);
  await page.click("#nwOeffnen"); await page.waitForSelector(".nw-kacheln");
  pruef(await top(page).locator(".nw-fehlt li:has-text('ohne Art')").count() === 1, "Warnung „Sonderfahrt ohne Art“ fehlt");
  await top(page).locator(`[data-nwaendern="${ohneId}"]`).click(); await page.waitForTimeout(150);
  pruef(await top(page).locator("select[name=artwahl]").inputValue() === "", "Art-Auswahl startet nicht leer");
  await top(page).locator("select[name=artwahl]").selectOption("ueberland");
  await top(page).locator("button[value=ok]").click(); await page.waitForTimeout(400);
  let to = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id), ohneId);
  pruef(to.art === "sonder" && to.payload.sonderArt === "ueberland", "Art nicht gespeichert: " + JSON.stringify([to.art, to.payload.sonderArt]));
  await top(page).locator(`[data-nwaendern="${ohneId}"]`).click(); await page.waitForTimeout(150);
  await top(page).locator("select[name=artwahl]").selectOption("fahrstunde");
  await top(page).locator("button[value=ok]").click(); await page.waitForTimeout(400);
  to = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id), ohneId);
  pruef(to.art === "fahrstunde" && "sonderArt" in to.payload && to.payload.sonderArt === null, "sonderArt nicht auf null gesetzt: " + JSON.stringify(to.payload));
  // Löschen in den Papierkorb, zurückholen
  const vorher = await top(page).locator(".nw-liste").first().locator(".nw-zeile").count();
  await top(page).locator("[data-nwloeschen]").first().click();
  await page.waitForTimeout(150);
  await top(page).locator("input[name=grund]").fill("doppelt eingetragen");
  await top(page).locator("button[value=ok]").click();
  await page.waitForTimeout(400);
  pruef(await top(page).locator(".nw-liste").first().locator(".nw-zeile").count() === vorher - 1, "Stunde nicht aus der Liste gelöscht");
  pruef(await top(page).locator(".nw-details summary:has-text('Papierkorb (1)')").count() === 1, "Papierkorb zeigt nicht 1");
  const hart = await page.evaluate(() => window.__FAKE.log.filter((l) => l.tabelle === "kalender_termine" && l.art === "delete").length);
  pruef(hart === 0, "hart gelöscht");
  await top(page).locator(".nw-details summary:has-text('Papierkorb')").click();
  await top(page).locator("[data-nwzurueck]").first().click();
  await page.waitForTimeout(400);
  pruef(await top(page).locator(".nw-liste").first().locator(".nw-zeile").count() === vorher, "Wiederherstellen klappt nicht");

  // Nachtragen
  await top(page).locator("#nwNeu").click();
  await page.waitForTimeout(150);
  const gestern = await page.evaluate(() => KR.addDaysISO(KR.todayISO(), -1));
  await top(page).locator("input[name=datum]").fill(gestern);
  await top(page).locator("input[name=von]").fill("06:00");
  await top(page).locator("input[name=bis]").fill("06:45");
  await top(page).locator("select[name=artwahl]").selectOption("autobahn");
  await top(page).locator("input[name=grund]").fill("Fahrlehrer hat vergessen einzutragen");
  await top(page).locator("button[value=ok]").click();
  await page.waitForTimeout(400);
  const neu = await page.evaluate(() => window.__FAKE.tabellen.kalender_termine.find((t) => t.von === "06:00" && t.bis === "06:45"));
  pruef(neu && neu.art === "sonder" && neu.payload.sonderArt === "autobahn" && neu.schueler_id, "Nachtragen falsch: " + JSON.stringify(neu));
  pruef(await top(page).locator(".nw-liste .nw-zeile:has-text('Autobahnfahrt'):has-text('06:00')").count() === 1, "nachgetragene Stunde nicht in der Liste");

  // Druck
  const [popup] = await Promise.all([page.waitForEvent("popup"), top(page).locator("footer button[value=ok]").click()]);
  await popup.waitForLoadState();
  const druck = await popup.evaluate(() => ({ h1: document.querySelector("h1").textContent, zeilen: document.querySelectorAll("tbody tr").length, bilder: document.querySelectorAll("td.us img").length,
    neu: document.querySelectorAll(".neu").length, us: [...document.querySelectorAll("th")].some((th) => /Unterschrift Fahrschüler/.test(th.textContent)), korr: /Korrekturen durch die Fahrschule|Uhrzeit falsch eingetragen/.test(document.body.textContent) }));
  pruef(druck.h1 === "Ausbildungsnachweis", "Titel falsch: " + druck.h1);
  pruef(druck.bilder > 0 && druck.us, "Unterschriften fehlen im Druck");
  pruef(druck.neu === 0, "Korrektur-Hinweis „neu zu unterschreiben“ steht im Druck (soll leer bleiben)");
  pruef(!druck.korr, "Korrekturen stehen noch im Druck (sollen nur im Büro-Verlauf stehen)");
  await popup.emulateMedia({ media: "print" });
  if (FOTOS) { await popup.pdf({ path: join(FOTOS, "nachweis-a4.pdf"), format: "A4", printBackground: true }); await popup.setViewportSize({ width: 794, height: 1123 }); await popup.screenshot({ path: join(FOTOS, "nachweis-druck-a4.png"), fullPage: false }); }
  const breit = await popup.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  pruef(breit, "Druckbild breiter als die Seite");
  await popup.close();
  pruef(!konsole.length, "Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// ---------- 2. Handy 360 px: nichts seitlich wischbar ----------
{
  const sid = testSchueler();
  const { page, ctx, konsole } = await oeffne({ breite: 360, hoehe: 780 });
  const knopf = page.locator(`[data-sbearb="${sid}"]`);
  await knopf.scrollIntoViewIfNeeded(); await knopf.click();
  await page.waitForSelector("#nwOeffnen"); await page.click("#nwOeffnen");
  await page.waitForSelector(".nw-kacheln");
  const r = await page.evaluate(() => { const d = [...document.querySelectorAll("dialog[open]")].pop(); const i = d.querySelector(".dialog-inhalt"); const rand = i.getBoundingClientRect().right; const zu = [...d.querySelectorAll("*")].filter((e) => e.offsetParent && e.getBoundingClientRect().right > rand + 1).slice(0, 3).map((e) => e.tagName + "." + e.className + " „" + e.textContent.trim().slice(0, 20) + "“");
    return { seite: document.documentElement.scrollWidth, innen: i.scrollWidth, breit: i.clientWidth, dlg: d.getBoundingClientRect().right, zu }; });
  pruef(r.seite <= 360 && r.innen <= r.breit + 1 && r.dlg <= 361, "360 px: wischt seitlich " + JSON.stringify(r));
  const klein = await page.evaluate(() => [...[...document.querySelectorAll("dialog[open]")].pop().querySelectorAll("button, summary")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 36).map((b) => b.textContent.trim()));
  pruef(!klein.length, "zu kleine Tippflächen: " + klein.join(", "));
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "nachweis-360.png"), fullPage: false });
  pruef(!konsole.length, "Konsole 360: " + konsole.join(" | "));
  await ctx.close();
}

// ---------- 3. Ab 01.07.2027: ohne Schüler-Unterschrift ----------
{
  const heute = "2027-07-05";
  const sid = testSchueler(heute);
  const { page, ctx, konsole } = await oeffne({ heute });
  await page.click(`[data-sbearb="${sid}"]`);
  await page.waitForSelector("#nwOeffnen"); await page.click("#nwOeffnen");
  await page.waitForSelector(".nw-kacheln");
  pruef(await top(page).locator(".nw-kachel:has-text('Unterschriften')").count() === 0, "2027: Kachel Unterschriften noch da");
  const [popup] = await Promise.all([page.waitForEvent("popup"), top(page).locator("footer button[value=ok]").click()]);
  await popup.waitForLoadState();
  const d = await popup.evaluate(() => ({ h1: document.querySelector("h1").textContent, us: document.body.textContent.includes("Unterschrift Fahrschüler"), bilder: document.querySelectorAll("td.us").length }));
  pruef(d.h1 === "Aufzeichnung über die fahrpraktische Ausbildung" && !d.us && !d.bilder, "2027: Druckbild falsch " + JSON.stringify(d));
  await popup.close();
  pruef(!konsole.length, "Konsole 2027: " + konsole.join(" | "));
  await ctx.close();
}

await browser.close(); server.close();
console.log(`Ausbildungsnachweis: ${ok} Prüfungen bestanden, ${probleme} Fehler`);
process.exit(probleme ? 1 : 0);
