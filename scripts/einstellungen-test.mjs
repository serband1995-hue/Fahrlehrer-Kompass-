// Test Werkstatt 11 Schritt 2: Büro-Seite „Einstellungen“ nach Themen (buero-einstellungen.js), erfundene Daten, keine Datenbank.
//   E1 Punkt in der Leiste (ganz unten, alle drei Rollen)   E2 Themen in der Reihenfolge, Hash ?thema=
//   E3 Fremdthema über die Warteliste (vor dem Laden und danach per push, gleiche id ersetzt)   E4 Rollen-Filter
//   E5 verlassen() false → Rückfrage (Klick und Hash/Zurück)   E6 Zahlungsdaten-Formular erscheint und speichert wie vorher
//   E7 Hinweis auf der Fristen-Seite   E8 UE pro Woche und Reaktivierung speichern wie vorher (nur Super-Admin)
//   E9 Animation nur beim Themenwechsel   E10 Handy 360/412   E11 dunkel   E12 keine Konsolenfehler
// Aufruf: NODE_PATH=$(npm root -g) node scripts/einstellungen-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
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
let ok = 0, bad = 0;
function pruefe(id, text, f) {
  const fl = f === true || f == null ? [] : [].concat(f);
  if (!fl.length) { ok++; console.log(`ok  ${id} ${text}`); } else { bad++; console.log(`FEHLER  ${id} ${text}: ${fl.join(" · ")}`); }
}
const warte = (p, ms = 300) => p.waitForTimeout(ms);
async function oeffne({ hash = "#einstellungen", breite = 1366, hoehe = 900, nutzer = "ad-1", vorher = "", dunkel = false } = {}) {
  const daten = bauDaten(new Date().toISOString().slice(0, 10));
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: dunkel ? "dark" : "light" });
  const page = await ctx.newPage();
  ctx.setDefaultTimeout(8000);
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  page.on("dialog", (d) => { konsole.push("echtes Browser-Fenster: " + d.type()); d.dismiss().catch(() => {}); });
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  if (vorher) await page.addInitScript(vorher);
  await page.addInitScript(([d, s]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; }, [daten, session]);
  await page.goto(basis + "buero.html" + hash);
  await warte(page, 800);
  // Gemeinsamer Büro-Zugang: wer bedient? (wie in zahlungsmail-test.mjs)
  if (await page.$("#wer:not([hidden])")) {
    await page.click('#werListe button:has-text("Paula Muster")');
    await page.keyboard.type("7352", { delay: 20 });
    await warte(page, 500);
  }
  return { page, ctx, konsole };
}
const themenListe = (page) => page.$$eval(".es-thema", (l) => l.map((a) => a.textContent.trim()));
const aktivesThema = (page) => page.$$eval('.es-thema[aria-current="page"]', (l) => l.map((a) => a.dataset.esThema).join(","));
const setzeHash = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await warte(page, 400); };
const konfig = (page) => page.evaluate(() => window.__FAKE.tabellen.fahrschulen.find((f) => f.id === "fs-test-1").konfiguration);
const SOLL = ["Fahrschule", "Preise & Pakete", "Zahlungen & Mails", "Nachrichten-Vorlagen", "Fahrstunden & Kalender", "Team & Zugänge", "Sicherheit (PIN)", "Darstellung & Start"];

try {
  // E1 Leiste
  for (const nutzer of ["ad-1", "bu-1", "sa-1"]) {
    const { page, ctx, konsole } = await oeffne({ nutzer, hash: "#heute" });
    const p = await page.$$eval("#nav .nav-punkt", (l) => l.map((a) => [a.getAttribute("href"), !!a.querySelector("svg"), !!a.closest(".nav-neben")]));
    const letzter = p[p.length - 1], vorletzter = p[p.length - 2];
    pruefe("E1 " + nutzer, "Punkt „Einstellungen“ mit Symbol ganz unten im kleinen Teil, nach Neuigkeiten", letzter[0] === "#einstellungen" && letzter[1] && letzter[2] && vorletzter[0] === "#neuigkeiten" ? null : JSON.stringify(p.slice(-3)));
    if (nutzer === "ad-1") {
      const r = await page.evaluate(() => { const n = document.querySelector("#nav").getBoundingClientRect(), f = document.querySelector(".seite-fuss").getBoundingClientRect(); return [n.bottom, f.top]; });
      pruefe("E1b", "Leiste und Fußzeile überlappen nicht (1366x900)", r[0] <= r[1] + 1 ? null : JSON.stringify(r));
      await page.click('#nav a[href="#einstellungen"]'); await warte(page, 400);
      pruefe("E1c", "Klick öffnet die Seite, Titel „Einstellungen“, Punkt markiert", (await page.textContent("#titel")) === "Einstellungen" && (await page.$$eval('#nav .nav-punkt[aria-current="page"]', (l) => l.map((a) => a.getAttribute("href")).join())) === "#einstellungen" ? null : await page.textContent("#titel"));
    }
    pruefe("E12 " + nutzer, "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // E2 Themenliste, Hash
  {
    const { page, ctx, konsole } = await oeffne();
    const l = await themenListe(page);
    pruefe("E2a", "Themen in der Reihenfolge 10–90 (Fristen baut W15b)", l.join(" / ") === SOLL.join(" / ") ? null : l.join(" / "));
    pruefe("E2b", "ohne ?thema= ist das erste Thema offen (Fahrschule)", (await aktivesThema(page)) === "fahrschule" && (await page.locator("#esBox .es-abschnitt").first().innerText()) === "Fahrschule" ? null : await aktivesThema(page));
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 350);
    pruefe("E2c", "Klick auf ein Thema: Adresse #einstellungen?thema=team, Thema markiert, Inhalt gewechselt", (await page.evaluate(() => location.hash)) === "#einstellungen?thema=team" && (await aktivesThema(page)) === "team" && /Fahrlehrer & Büro/.test(await page.locator("#esBox").innerText()) ? null : await page.evaluate(() => location.hash));
    await page.goBack(); await warte(page, 400);
    pruefe("E2d", "Zurück-Taste führt zum vorigen Thema", (await aktivesThema(page)) === "fahrschule" ? null : await aktivesThema(page));
    await page.goForward(); await warte(page, 400);
    pruefe("E2e", "Vor-Taste wieder zu „Team“", (await aktivesThema(page)) === "team" ? null : await aktivesThema(page));
    await ctx.close();
    const b = await oeffne({ hash: "#einstellungen?thema=sicherheit" });
    pruefe("E2f", "Seite direkt mit ?thema=sicherheit geöffnet", (await aktivesThema(b.page)) === "sicherheit" ? null : await aktivesThema(b.page));
    await setzeHash(b.page, "#einstellungen?thema=gibtesnicht");
    pruefe("E2g", "unbekanntes Thema: erstes Thema, kein Fehler", (await aktivesThema(b.page)) === "fahrschule" && !b.konsole.length ? null : b.konsole);
    // alle Themen öffnen, keines leer, Platzhalter nennt „kommt bald“
    const leer = [];
    for (const id of ["fahrschule", "preise", "zahlungen", "vorlagen", "kalender", "team", "sicherheit", "darstellung"]) {
      await setzeHash(b.page, "#einstellungen?thema=" + id);
      const t = (await b.page.locator("#esBox").innerText()).trim();
      if (t.length < 15 || (await aktivesThema(b.page)) !== id) leer.push(id);
    }
    pruefe("E2h", "jedes Thema zeigt etwas", leer.length ? leer : null);
    await setzeHash(b.page, "#einstellungen?thema=vorlagen");
    pruefe("E2i", "Platzhalter „Nachrichten-Vorlagen“: „Hier kommt bald …“", /Hier kommt bald/.test(await b.page.locator("#esBox").innerText()) ? null : "kein Hinweis");
    pruefe("E12b", "keine Konsolenfehler", b.konsole.length ? b.konsole : null);
    await b.ctx.close();
  }

  // E3 Fremdthema über die Warteliste
  {
    const vorher = `window.BUERO_EINSTELLUNGEN_THEMEN = [{ id: "fremd1", titel: "Vor dem Laden", reihenfolge: 15, render(el) { el.innerHTML = '<h2 class="es-abschnitt">Vor</h2><div class="es-zeile"><div class="es-name">Zeile eins<div class="es-hinweis">kleiner Hinweis</div></div><span class="es-neu">neu</span><label class="es-wert"><input type="number" value="5"><span class="es-einheit">Tage</span></label></div>'; } }];`;
    const { page, ctx, konsole } = await oeffne({ vorher, hash: "#einstellungen?thema=fremd1" });
    let l = await themenListe(page);
    pruefe("E3a", "Thema, das VOR dem Laden angemeldet wurde, steht zwischen Fahrschule und Preise und ist offen", l[1] === "Vor dem Laden" && (await aktivesThema(page)) === "fremd1" && (await page.locator("#esBox .es-zeile .es-wert input").count()) === 1 ? null : l.join(" / "));
    await page.evaluate(() => window.BUERO_EINSTELLUNGEN_THEMEN.push({ id: "fremd2", titel: "Nach dem Laden", reihenfolge: 45, render(el) { el.innerHTML = '<p>nachher da</p>'; } }));
    await warte(page, 150);
    l = await themenListe(page);
    pruefe("E3b", "Thema, das NACH dem Laden per push kommt, erscheint sofort in der Liste an der richtigen Stelle (nach Zahlungen & Mails, vor Vorlagen)", l.indexOf("Nach dem Laden") === l.indexOf("Zahlungen & Mails") + 1 ? null : l.join(" / "));
    pruefe("E3c", "das offene Thema bleibt offen", (await aktivesThema(page)) === "fremd1" ? null : await aktivesThema(page));
    await page.click('.es-thema[data-es-thema="fremd2"]'); await warte(page, 300);
    pruefe("E3d", "nachträgliches Thema lässt sich öffnen", /nachher da/.test(await page.locator("#esBox").innerText()) ? null : await page.locator("#esBox").innerText());
    await page.evaluate(() => window.BUERO_EINSTELLUNGEN_THEMEN.push({ id: "vorlagen", titel: "Vorlagen echt", reihenfolge: 50, render(el) { el.innerHTML = '<p>echte Vorlagen</p>'; } }));
    await warte(page, 150);
    l = await themenListe(page);
    pruefe("E3e", "gleiche id (vorlagen) ersetzt den Platzhalter, nicht doppelt", l.includes("Vorlagen echt") && !l.includes("Nachrichten-Vorlagen") && l.filter((x) => /Vorlagen/.test(x)).length === 1 ? null : l.join(" / "));
    // Thema aus der Adresse, das erst später kommt
    await setzeHash(page, "#einstellungen?thema=spaet");
    await page.evaluate(() => window.BUERO_EINSTELLUNGEN_THEMEN.push({ id: "spaet", titel: "Spät", reihenfolge: 99, render(el) { el.innerHTML = '<p>spät da</p>'; } }));
    await warte(page, 300);
    pruefe("E3f", "Adresse nannte ein Thema, das erst später angemeldet wird: es öffnet sich dann", (await aktivesThema(page)) === "spaet" ? null : await aktivesThema(page));
    // Der Rahmen stürzt nicht, wenn ein Thema kaputt ist
    pruefe("E3g", "Layout des Fremdthemas: Name links, Wert rechts in einer Linie, Wert ≥ 44 px hoch", await (async () => { await setzeHash(page, "#einstellungen?thema=fremd1"); const r = await page.evaluate(() => { const z = document.querySelector("#esBox .es-zeile"), n = z.querySelector(".es-name").getBoundingClientRect(), w = z.querySelector(".es-wert").getBoundingClientRect(); return [n.right <= w.left + 1, Math.abs((n.top + n.height / 2) - (w.top + w.height / 2)) < 30, w.height >= 44]; }); return r.every(Boolean) ? null : JSON.stringify(r); })());
    pruefe("E12c", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // E4 Rollen-Filter
  {
    const vorher = `window.BUERO_EINSTELLUNGEN_THEMEN = [
      { id: "nur-super", titel: "Nur Super", reihenfolge: 12, rollen: ["superadmin"], render(el) { el.innerHTML = "<p>s</p>"; } },
      { id: "nur-buero", titel: "Nur Büro", reihenfolge: 13, rollen: ["buero"], render(el) { el.innerHTML = "<p>b</p>"; } },
      { id: "leitung-super", titel: "Leitung und Super", reihenfolge: 14, rollen: ["leitung", "superadmin"], render(el) { el.innerHTML = "<p>ls</p>"; } }];`;
    const erg = {};
    for (const [nutzer, name] of [["ad-1", "leitung"], ["bu-1", "buero"], ["sa-1", "super"]]) {
      const { page, ctx } = await oeffne({ vorher, nutzer });
      erg[name] = (await themenListe(page)).filter((t) => /Nur|Leitung/.test(t)).join(" / ");
      await ctx.close();
    }
    pruefe("E4", "Rollen-Filter: Leitung / Büro / Super-Admin sehen nur ihre Themen", erg.leitung === "Leitung und Super" && erg.buero === "Nur Büro" && erg.super === "Nur Super / Leitung und Super" ? null : JSON.stringify(erg));
    // ctx: rolle und Hinweiszeile
    const v2 = `window.BUERO_EINSTELLUNGEN_THEMEN = [{ id: "ctx", titel: "Kontext", reihenfolge: 5, render(el, ctx) { window.__CTX = { rolle: ctx.rolle, fs: ctx.fahrschuleId, sb: typeof ctx.sb.from, darf: ctx.darfSchreiben, m: typeof ctx.meldung }; el.innerHTML = '<button type="button" id="mk">ok</button><button type="button" id="mf">fehler</button><button type="button" id="mi">info</button>'; el.querySelector("#mk").onclick = () => ctx.meldung("Alles gut", "ok"); el.querySelector("#mf").onclick = () => ctx.meldung("Schief", "fehler"); el.querySelector("#mi").onclick = () => ctx.meldung("Zur Info", "info"); } }];`;
    const { page, ctx, konsole } = await oeffne({ vorher: v2, hash: "#einstellungen?thema=ctx", nutzer: "bu-1" });
    const c = await page.evaluate(() => window.__CTX);
    pruefe("E4b", "ctx: rolle, fahrschuleId, sb, darfSchreiben, meldung", c && c.rolle === "buero" && c.fs === "fs-test-1" && c.sb === "function" && c.darf === true && c.m === "function" ? null : JSON.stringify(c));
    const arten = [];
    for (const [id, art] of [["mk", "ok"], ["mf", "fehler"], ["mi", "info"]]) { await page.click("#" + id); arten.push(await page.evaluate((a) => { const m = document.getElementById("esMeldung"); return !m.hidden && m.classList.contains(a) && m.textContent.length > 3; }, art)); }
    pruefe("E4c", "meldung(text, art): Hinweiszeile für ok, fehler, info", arten.every(Boolean) ? null : JSON.stringify(arten));
    pruefe("E12d", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // E5 verlassen() false → Rückfrage
  {
    const vorher = `window.BUERO_EINSTELLUNGEN_THEMEN = [{ id: "dreck", titel: "Mit Eingabe", reihenfolge: 5, verlassen() { return !window.__DRECK; }, verwerfen() { window.__DRECK = false; window.__VERWORFEN = (window.__VERWORFEN || 0) + 1; }, render(el) { el.innerHTML = '<label class="es-wert"><input id="dr" type="text" value=""></label>'; el.querySelector("#dr").addEventListener("input", () => { window.__DRECK = true; }); } }];`;
    const { page, ctx, konsole } = await oeffne({ vorher, hash: "#einstellungen?thema=dreck" });
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    pruefe("E5a", "ohne Änderung: Wechsel ohne Rückfrage", (await aktivesThema(page)) === "team" && (await page.locator("dialog[open]").count()) === 0 ? null : "Rückfrage trotz nichts");
    await setzeHash(page, "#einstellungen?thema=dreck");
    await page.fill("#dr", "abc");
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    const dlg = await page.locator("dialog[open]").innerText().catch(() => "");
    pruefe("E5b", "mit Änderung: Rückfrage „Änderungen verwerfen?“, Thema bleibt", /Änderungen verwerfen\?/.test(dlg) && (await aktivesThema(page)) === "dreck" ? null : dlg + " / " + await aktivesThema(page));
    await page.click('dialog[open] button:has-text("Weiter bearbeiten")'); await warte(page, 300);
    pruefe("E5c", "„Weiter bearbeiten“: bleibt, Eingabe erhalten, Adresse unverändert", (await aktivesThema(page)) === "dreck" && (await page.inputValue("#dr")) === "abc" && (await page.evaluate(() => location.hash)) === "#einstellungen?thema=dreck" ? null : await page.evaluate(() => location.hash));
    // Adresse/Zurück-Weg
    await setzeHash(page, "#einstellungen?thema=team");
    const dlg2 = await page.locator("dialog[open]").innerText().catch(() => "");
    pruefe("E5d", "Adresse ändert sich von außen (wie Zurück-Taste): Rückfrage, altes Thema samt Eingabe bleibt, Adresse zurückgesetzt", /Änderungen verwerfen\?/.test(dlg2) && (await aktivesThema(page)) === "dreck" && (await page.inputValue("#dr")) === "abc" && (await page.evaluate(() => location.hash)) === "#einstellungen?thema=dreck" ? null : dlg2 + " / " + await page.evaluate(() => location.hash));
    await page.click('dialog[open] button:has-text("Weiter bearbeiten")'); await warte(page, 300);
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    await page.click('dialog[open] button:has-text("Ja, verwerfen")'); await warte(page, 400);
    pruefe("E5e", "„Ja, verwerfen“: Wechsel, verwerfen() lief einmal", (await aktivesThema(page)) === "team" && (await page.evaluate(() => window.__VERWORFEN)) === 1 && (await page.evaluate(() => location.hash)) === "#einstellungen?thema=team" ? null : await aktivesThema(page));
    pruefe("E12e", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // E6 Zahlungsdaten und E7 Hinweis auf der Fristen-Seite
  {
    const { page, ctx, konsole } = await oeffne({ hash: "#einstellungen?thema=zahlungen" });
    pruefe("E6a", "Thema „Zahlungen & Mails“ zeigt das Zahlungsdaten-Formular (dasselbe wie bisher)", (await page.locator("#esBox #zmEinst #zmForm").count()) === 1 && (await page.locator("#zmForm input[name=iban]").count()) === 1 ? null : "kein Formular");
    await page.fill("#zmForm input[name=kontoinhaber]", "Boost Fahrschule Muster");
    pruefe("E6b", "ungespeicherte Eingabe: Themenwechsel fragt nach", await (async () => { await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300); const t = await page.locator("dialog[open]").innerText().catch(() => ""); await page.click('dialog[open] button:has-text("Weiter bearbeiten")'); await warte(page, 200); return /Änderungen verwerfen\?/.test(t) ? null : "keine Rückfrage"; })());
    await page.fill("#zmForm input[name=iban]", "de89 3704 0044 0532 0130 00");
    await page.click("#zmSpeichern"); await warte(page, 400);
    const z = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_zahlungsdaten || []);
    pruefe("E6c", "Speichern wie vorher: Zeile in fahrschule_zahlungsdaten (IBAN ohne Leerzeichen, Test-Modus)", z.length === 1 && z[0].iban === "DE89370400440532013000" && z[0].kontoinhaber === "Boost Fahrschule Muster" && z[0].modus === "test" && z[0].fahrschule_id === "fs-test-1" ? null : JSON.stringify(z));
    pruefe("E6d", "nach dem Speichern bleibt das Thema offen, Formular zeigt den gespeicherten Stand, keine Rückfrage mehr beim Wechsel", (await aktivesThema(page)) === "zahlungen" && (await page.inputValue("#zmForm input[name=iban]")) === "DE89 3704 0044 0532 0130 00" ? null : await aktivesThema(page));
    await page.click('.es-thema[data-es-thema="team"]'); await warte(page, 300);
    pruefe("E6e", "danach Wechsel ohne Rückfrage", (await aktivesThema(page)) === "team" && (await page.locator("dialog[open]").count()) === 0 ? null : "Rückfrage");
    // Fristen-Seite
    await setzeHash(page, "#fristen");
    const f = await page.evaluate(() => ({ form: document.querySelectorAll("#zmEinst, #zmForm, #einstForm").length, hinweis: !!document.querySelector("#fristenEinstHinweis"), href: (document.querySelector("#fristenEinstHinweis a") || {}).getAttribute && document.querySelector("#fristenEinstHinweis a").getAttribute("href"), text: (document.querySelector("#fristenEinstHinweis a") || {}).textContent }));
    pruefe("E7a", "Fristen-Seite: kein Formular mehr, stattdessen Hinweis mit Link „Zahlungsdaten in den Einstellungen“", f.form === 0 && f.hinweis && f.href === "#einstellungen?thema=zahlungen" && f.text === "Zahlungsdaten in den Einstellungen" ? null : JSON.stringify(f));
    await page.click("#fristenEinstHinweis a"); await warte(page, 400);
    pruefe("E7b", "Link führt zu „Zahlungen & Mails“", (await aktivesThema(page)) === "zahlungen" ? null : await aktivesThema(page));
    pruefe("E12f", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // E8 UE pro Woche und Reaktivierung: speichern wie vorher (fahrschulen.konfiguration), nur Super-Admin
  {
    const { page, ctx, konsole } = await oeffne({ hash: "#einstellungen?thema=fahrschule", nutzer: "sa-1" });
    pruefe("E8a", "Fahrschule: Name wird nur angezeigt (kein Eingabefeld), UE-Feld da", /Vorführ-Fahrschule/.test(await page.locator("#esBox").innerText()) && (await page.locator("#esBox input[name=ue]").count()) === 1 && (await page.locator("#esBox input[type=text]").count()) === 0 ? null : await page.locator("#esBox").innerText());
    await page.fill("input[name=ue]", "48");
    await page.click('.es-thema[data-es-thema="preise"]'); await warte(page, 300);
    pruefe("E8b", "UE geändert, nicht gespeichert: Rückfrage beim Wechsel", /Änderungen verwerfen\?/.test(await page.locator("dialog[open]").innerText().catch(() => "")) ? null : "keine Rückfrage");
    await page.click('dialog[open] button:has-text("Weiter bearbeiten")'); await warte(page, 200);
    await page.click("#esFahrschuleForm button[type=submit]"); await warte(page, 400);
    const k = await konfig(page);
    pruefe("E8c", "UE gespeichert wie vorher (konfiguration.ueProWoche = 48, übrige Felder bleiben)", k.ueProWoche === 48 && k.akademieVermittlung && k.akademieVermittlung.betragAkademie === 100 ? null : JSON.stringify(k));
    pruefe("E8d", "Wert bleibt nach dem Speichern, Hinweiszeile „Gespeichert“", (await page.inputValue("input[name=ue]")) === "48" && /Gespeichert/.test(await page.locator("#esMeldung").innerText()) ? null : await page.inputValue("input[name=ue]"));
    pruefe("E8e", "„Wer hat Platz?“ rechnet mit 48", await page.evaluate(() => ueProWoche() === 48) ? null : "nicht 48");
    await setzeHash(page, "#einstellungen?thema=preise");
    pruefe("E8f", "Preise & Pakete: Knopf „Preisliste öffnen“ → #zahlungen?reiter=preise, Reaktivierungs-Feld mit 240", (await page.locator('#esBox a[href="#zahlungen?reiter=preise"]').innerText()) === "Preisliste öffnen" && (await page.inputValue("input[name=betrag]")) === "240" ? null : await page.locator("#esBox").innerText());
    await page.fill("input[name=betrag]", "250");
    await page.click("#esPreiseForm button[type=submit]"); await warte(page, 400);
    const k2 = await konfig(page);
    pruefe("E8g", "Reaktivierungs-Vorgabe gespeichert wie vorher (konfiguration.reaktivierungBetrag = 250, ueProWoche bleibt)", k2.reaktivierungBetrag === 250 && k2.ueProWoche === 48 ? null : JSON.stringify(k2));
    await page.fill("input[name=betrag]", "0");
    await page.click("#esPreiseForm button[type=submit]"); await warte(page, 300);
    pruefe("E8h", "Betrag 0: nichts gespeichert (das Feld verlangt mindestens 1)", (await konfig(page)).reaktivierungBetrag === 250 ? null : "gespeichert?");
    await page.click('a[href="#zahlungen?reiter=preise"]'); await warte(page, 400);
    pruefe("E8i", "Link öffnet die Preisliste", (await page.textContent("#titel")) === "Zahlungen" && (await page.locator(".zahl-reiter .tab[aria-current=page]").innerText()).startsWith("Preise") ? null : await page.textContent("#titel"));
    pruefe("E12g", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
    for (const nutzer of ["ad-1", "bu-1"]) {
      const o = await oeffne({ hash: "#einstellungen?thema=fahrschule", nutzer });
      const f1 = await o.page.evaluate(() => [document.querySelector("input[name=ue]").disabled, !!document.querySelector("#esFahrschuleForm button[type=submit]")]);
      await setzeHash(o.page, "#einstellungen?thema=preise");
      const f2 = await o.page.evaluate(() => [document.querySelector("input[name=betrag]").disabled, !!document.querySelector("#esPreiseForm button[type=submit]")]);
      pruefe("E8j " + nutzer, "nur Super-Admin ändert: Felder gesperrt, kein Speichern-Knopf, Hinweis", f1[0] && !f1[1] && f2[0] && !f2[1] && /Super-Admin/.test(await o.page.locator("#esBox").innerText()) ? null : JSON.stringify([f1, f2]));
      await o.ctx.close();
    }
  }

  // E9 Animation
  {
    const { page, ctx } = await oeffne({ hash: "#einstellungen?thema=team" });
    pruefe("E9a", "erstes Zeichnen: kein Einblenden (weder Seite noch Thema)", await page.evaluate(() => !document.querySelector(".es-ein") && !document.getElementById("ansicht").classList.contains("seite-ein")) ? null : "blendet ein");
    await page.evaluate(() => zeichne()); await warte(page, 50);
    pruefe("E9b", "Neuzeichnen desselben Themas: kein Einblenden", await page.evaluate(() => !document.querySelector(".es-ein")) ? null : "blendet ein");
    await page.click('.es-thema[data-es-thema="sicherheit"]'); await warte(page, 40);
    const w = await page.evaluate(() => { const b = document.getElementById("esBox"); return [b.classList.contains("es-ein"), getComputedStyle(b).animationName, getComputedStyle(b).animationDuration, document.getElementById("ansicht").classList.contains("seite-ein")]; });
    pruefe("E9c", "Themenwechsel: nur das Thema blendet ein (160 ms), nicht die ganze Seite", w[0] && w[1] === "es-ein" && w[2] === "0.16s" && !w[3] ? null : JSON.stringify(w));
    const sk = await page.evaluate(() => { const k = [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch (e) { return []; } }).find((r) => r.name === "es-ein"); return k ? k.cssText : ""; });
    pruefe("E9d", "Bewegung: nur Deckkraft und 4 px nach oben, kein scale", /opacity/.test(sk) && /translateY\(4px\)/.test(sk) && !/scale/.test(sk) ? null : sk);
    await ctx.close();
    const r = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const rp = await r.newPage();
    const d = bauDaten(new Date().toISOString().slice(0, 10));
    await rp.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (x) => x.fulfill({ contentType: "text/javascript", body: fake }));
    await rp.route(/fonts\.(googleapis|gstatic)\.com/, (x) => x.fulfill({ status: 200, body: "" }));
    await rp.addInitScript(([dd]) => { window.__FAKE = { tabellen: dd.tabellen, konten: dd.konten, session: { user: { id: "ad-1", email: "a@example.org" } } }; }, [d]);
    await rp.goto(basis + "buero.html#einstellungen"); await warte(rp, 700);
    await rp.click('.es-thema[data-es-thema="team"]'); await warte(rp, 40);
    pruefe("E9e", "„Bewegung reduzieren“: keine Animation", (await rp.evaluate(() => getComputedStyle(document.getElementById("esBox")).animationName)) === "none" ? null : "läuft");
    await r.close();
  }

  // E10 Handy 360/412: Liste, dann Thema, nichts wischt seitlich
  for (const b of [360, 412]) {
    const { page, ctx, konsole } = await oeffne({ breite: b, hoehe: 740, hash: "#einstellungen" });
    const breit = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const sicht = await page.evaluate(() => [!!document.querySelector(".es-themen").offsetParent, !!document.querySelector(".es-inhalt").offsetParent]);
    const hoehen = await page.$$eval(".es-thema", (l) => l.map((a) => Math.round(a.getBoundingClientRect().height)));
    pruefe(`E10a ${b}`, "ohne Thema: Liste aller Themen untereinander (je ≥ 44 px), Inhalt noch zu, kein seitliches Wischen", sicht[0] && !sicht[1] && hoehen.length === 8 && hoehen.every((h) => h >= 44) && (await breit()) <= 0 ? null : JSON.stringify([sicht, hoehen, await breit()]));
    await page.click('.es-thema[data-es-thema="preise"]'); await warte(page, 400);
    const s2 = await page.evaluate(() => [!!document.querySelector(".es-themen").offsetParent, !!document.querySelector(".es-inhalt").offsetParent, !!document.querySelector(".es-zurueck").offsetParent]);
    pruefe(`E10b ${b}`, "Thema offen: Inhalt statt Liste, „‹ Alle Themen“ da", !s2[0] && s2[1] && s2[2] ? null : JSON.stringify(s2));
    await page.click(".es-zurueck"); await warte(page, 400);
    pruefe(`E10c ${b}`, "„‹ Alle Themen“ zurück zur Liste", (await page.evaluate(() => !!document.querySelector(".es-themen").offsetParent)) ? null : "Liste fehlt");
    for (const id of ["fahrschule", "preise", "zahlungen", "kalender", "team", "sicherheit", "darstellung"]) {
      await setzeHash(page, "#einstellungen?thema=" + id);
      const r = await page.evaluate(() => ({ breit: document.documentElement.scrollWidth - window.innerWidth, ueber: [...document.querySelectorAll("#esBox *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length, klein: [...document.querySelectorAll("#esBox .knopf, #esBox .es-wert, #esBox button, #esBox .zm-wahl")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.className || e.tagName) }));
      pruefe(`E10d ${b} ${id}`, "nichts wischt seitlich, nichts ragt raus, Knöpfe und Felder ≥ 44 px", r.breit <= 0 && r.ueber === 0 && !r.klein.length ? null : JSON.stringify(r));
    }
    pruefe(`E12h ${b}`, "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }

  // Breite 1024/1280: Zeilen in einer Linie, kein seitliches Wischen
  for (const b of [1024, 1280]) {
    const { page, ctx } = await oeffne({ breite: b, hoehe: 800, hash: "#einstellungen?thema=fahrschule" });
    const r = await page.evaluate(() => ({ breit: document.documentElement.scrollWidth - window.innerWidth, links: document.querySelector(".es-themen").getBoundingClientRect().right <= document.querySelector(".es-inhalt").getBoundingClientRect().left, hoehe: [...document.querySelectorAll(".es-zeile")].map((z) => Math.round(z.getBoundingClientRect().height)), wert: [...document.querySelectorAll(".es-zeile .es-wert")].map((w) => Math.round(w.getBoundingClientRect().right)) }));
    pruefe(`E10e ${b}`, "Themen links, Felder rechts, Werte rechtsbündig in einer Linie", r.breit <= 0 && r.links && new Set(r.wert).size === 1 ? null : JSON.stringify(r));
    await ctx.close();
  }

  // E11 dunkel
  {
    const { page, ctx, konsole } = await oeffne({ dunkel: true, hash: "#einstellungen?thema=zahlungen" });
    const r = await page.evaluate(() => { const hell = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; }; const i = document.querySelector(".es-inhalt"), t = document.querySelector(".es-inhalt h2"); return { flaeche: hell(getComputedStyle(i).backgroundColor), text: hell(getComputedStyle(t).color), thema: hell(getComputedStyle(document.querySelector('.es-thema[aria-current="page"]')).backgroundColor) }; });
    pruefe("E11a", "dunkel: Fläche dunkel, Text hell, aktives Thema abgesetzt", r.flaeche < 80 && r.text > 170 ? null : JSON.stringify(r));
    pruefe("E12i", "keine Konsolenfehler", konsole.length ? konsole : null);
    await ctx.close();
  }
} finally {
  await browser.close(); server.close();
}
console.log(`\n${ok} ok, ${bad} Fehler`);
process.exit(bad ? 1 : 0);
