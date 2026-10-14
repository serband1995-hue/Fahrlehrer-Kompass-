// Test der Büro-Seite im echten Browser, mit erfundenen Daten statt Datenbank.
// Prüft Anmeldung, Rollen, jeden Bereich bei 1024/1366/1920 px (nichts seitlich wischbar,
// keine Fehler in der Konsole) und speichert Bildschirmfotos.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/buero-test.mjs [ordner-fuer-fotos]
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
const HEUTE = new Date().toISOString().slice(0, 10);

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
if (FOTOS) await mkdir(FOTOS, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let probleme = 0;
function fehler(text) { probleme++; console.log("FEHLER:", text); }

async function oeffne({ nutzer, breite = 1366, hoehe = 860, hash = "", dunkel = false, vorbereiten, wer = "Kristina" }) {
  const daten = bauDaten(HEUTE);
  const session = nutzer ? { user: { id: nutzer, email: nutzer + "@example.org" } } : null;
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: dunkel ? "dark" : "light" });
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
  // Gemeinsamer Büro-Zugang: „Wer bedient gerade?“ beantworten (Super-Admin wird nicht gefragt)
  if (wer && nutzer) {
    const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
    if (frage) { await meldePinAn(page, wer); }
  }
  return { page, ctx, konsole };
}
// Büro-Personen der Attrappe und ihre PINs (erfunden, siehe buero-vorfuehrung.js)
const TEST_PIN = { Jelena: "6204", Murat: "7391", Kristina: "4826" };
async function meldePinAn(page, name, pin) {
  await page.click(`#werListe button:has-text("${name}")`);
  await page.keyboard.type(pin || TEST_PIN[name], { delay: 20 });
  await page.waitForTimeout(150);
}
// Sauberes Layout: nichts ragt aus seinem Kästchen, kein Text überlappt anderen Text,
// kein Text wird ungewollt abgeschnitten (gewolltes „…“ nur in Kalender-Kacheln und Kalenderköpfen).
async function pruefeLayout(page, name) {
  const r = await page.evaluate(() => {
    const sichtbar = (el) => { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); return b.width > 0 && b.height > 0 && st.visibility !== "hidden" && st.display !== "none"; };
    const gewolltGekuerzt = (el) => !!el.closest(".k-termin, .k-kopf, .hb-name, details:not([open])");
    const probleme = [];
    // 1) Inhalt ragt aus Kästchen
    for (const box of document.querySelectorAll(".kachel, .karte, .dialog-form, .aufgabe, .login-karte, .seite")) {
      if (!sichtbar(box)) continue;
      const b = box.getBoundingClientRect();
      for (const el of box.querySelectorAll("*")) {
        if (!sichtbar(el) || gewolltGekuerzt(el) || el.closest(".dialog-inhalt") && box.classList.contains("dialog-form")) continue;
        const e = el.getBoundingClientRect();
        if (e.left < b.left - 1 || e.right > b.right + 1) { probleme.push("ragt seitlich aus " + box.className.split(" ")[0] + ": " + el.tagName + "." + String(el.className).split(" ")[0] + " „" + (el.textContent || "").trim().slice(0, 30) + "“"); break; }
      }
    }
    // 1b) Knöpfe und Marken ragen über den Rand ihrer Tabellenzelle
    for (const el of document.querySelectorAll("td .knopf, td .marke-pill, td .haken, td select, td input")) {
      if (!sichtbar(el) || gewolltGekuerzt(el)) continue;
      const z = el.closest("td").getBoundingClientRect(), e = el.getBoundingClientRect();
      if (e.right > z.right + 1 || e.left < z.left - 1) { probleme.push("ragt aus Tabellenzelle: " + el.tagName + " „" + (el.textContent || "").trim().slice(0, 25) + "“"); break; }
    }
    // 2) Abgeschnittener Text
    for (const el of document.querySelectorAll("td, th, .knopf, .tab, .marke-pill, .name, .wert, .nav-punkt, .unter, h1, h2, h3, label, .chip, .aufgabe")) {
      if (!sichtbar(el) || gewolltGekuerzt(el)) continue;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") probleme.push("Text abgeschnitten: " + el.tagName + " „" + el.textContent.trim().slice(0, 30) + "“");
    }
    // 3) Text überlappt Text
    const blaetter = [];
    // Ein offenes Vollbild-Fenster (PIN) verdeckt die Seite absichtlich: dann nur das Fenster prüfen
    const ueber = document.querySelector("#wer:not([hidden])");
    const walker = document.createTreeWalker(ueber || document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode;
      if (!t.textContent.trim() || !t.parentElement || !sichtbar(t.parentElement) || t.parentElement.closest("#toast, #tip, svg, dialog:not([open]), option, select, details:not([open]) > :not(summary)") || gewolltGekuerzt(t.parentElement)) continue;
      // Text, der in einem Scrollbereich gerade verdeckt ist, zählt nicht
      let clip = null;
      for (let a = t.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowY; if (o === "auto" || o === "scroll" || o === "hidden") { clip = a.getBoundingClientRect(); break; } }
      const rg = document.createRange(); rg.selectNodeContents(t);
      for (const q of rg.getClientRects()) {
        if (q.width <= 2 || q.height <= 2) continue;
        if (clip && (q.top < clip.top - 1 || q.bottom > clip.bottom + 1)) continue;
        blaetter.push({ q, t: t.textContent.trim().slice(0, 25), el: t.parentElement });
      }
    }
    for (let i = 0; i < blaetter.length; i++) for (let j = i + 1; j < blaetter.length; j++) {
      const a = blaetter[i].q, b = blaetter[j].q;
      const ueber = Math.min(a.right, b.right) - Math.max(a.left, b.left), hoch = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ueber > 3 && hoch > 3 && blaetter[i].el !== blaetter[j].el) {
        // Dialog liegt bewusst über der Seite
        const dlgA = !!blaetter[i].el.closest("dialog[open]"), dlgB = !!blaetter[j].el.closest("dialog[open]");
        if (dlgA !== dlgB) continue;
        probleme.push(`Text überlappt: „${blaetter[i].t}“ / „${blaetter[j].t}“`);
      }
    }
    return [...new Set(probleme)].slice(0, 6);
  });
  for (const p of r) fehler(`${name}: ${p}`);
}
async function pruefeBreite(page, name) {
  const r = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const zuBreit = [...document.querySelectorAll("body *")].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.right > w + 1 && getComputedStyle(el).position !== "fixed";
    }).slice(0, 3).map((el) => el.tagName + "." + el.className);
    return { wisch: document.documentElement.scrollWidth > w + 1, zuBreit };
  });
  if (r.wisch) fehler(`${name}: Seite ist seitlich wischbar`);
  if (r.zuBreit.length) fehler(`${name}: über den Rand: ${r.zuBreit.join(", ")}`);
}

// 1) Ohne Sitzung: Anmeldung sichtbar, falsches Passwort meldet Fehler, richtiges öffnet die App
{
  const { page, ctx, konsole } = await oeffne({});
  if (!(await page.isVisible("#loginForm"))) fehler("Anmeldung nicht sichtbar");
  await page.fill("#loginMail", "buero@example.org");
  await page.fill("#loginPw", "falsch");
  await page.click("#loginKnopf");
  await page.waitForTimeout(200);
  if (!/stimmt nicht/.test(await page.textContent("#loginFehler"))) fehler("falsches Passwort ohne Meldung");
  await page.fill("#loginPw", "test1234");
  await page.click("#loginKnopf");
  await page.waitForTimeout(500);
  if (!(await page.isVisible("#app"))) fehler("nach Anmeldung keine App");
  if (konsole.length) fehler("Konsole (Anmeldung): " + konsole.join(" | "));
  await ctx.close();
}

// 2) Rollen und Sperren
for (const [nutzer, erwartet] of [["fl-x", "Nur für das Büro"], ["gesperrt-1", "Zugang gesperrt"], ["agb-1", "Nutzungsbedingungen"]]) {
  const { page, ctx } = await oeffne({ nutzer });
  const titel = await page.textContent("#hinweisTitel").catch(() => "");
  if (titel !== erwartet) fehler(`${nutzer}: erwartet „${erwartet}“, bekommen „${titel}“`);
  if (await page.isVisible("#app")) fehler(`${nutzer}: App trotzdem sichtbar`);
  await ctx.close();
}

// 3) Jeder Bereich bei drei Breiten, hell und dunkel
const bereiche = ["heute", "pruefungen", "fahrchecks", "fristen", "kalender", "schueler", "verkaeufe", "zahlen", "team", "flotte"];
for (const [breite, hoehe] of [[1920, 1080], [1366, 768], [1024, 768]]) {
  for (const b of bereiche) {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", breite, hoehe, hash: "#" + b, dunkel: breite === 1024 });
    await page.waitForTimeout(150);
    const titel = await page.textContent("#titel");
    if (!titel) fehler(`${b}@${breite}: kein Titel`);
    await pruefeBreite(page, `${b}@${breite}`);
    await pruefeLayout(page, `${b}@${breite}`);
    if (konsole.length) fehler(`${b}@${breite}: Konsole: ${konsole.join(" | ")}`);
    if (FOTOS && (breite === 1920 || breite === 1024)) await page.screenshot({ path: join(FOTOS, `${b}-${breite}.png`), fullPage: true });
    await ctx.close();
  }
}

// 4) Fristen: Zahlung erfassen, Bearbeiten-Dialog, Prüfungen der Eingaben
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#fristen" });
  const vorher = await page.$$eval("[data-zahlung]", (b) => b.length);
  if (!vorher) fehler("Fristen: keine Zahlungs-Knöpfe in den Testdaten");
  const id = await page.getAttribute("[data-zahlung]", "data-zahlung");
  await page.click(`[data-zahlung="${id}"]`);
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(250);
  const gespeichert = await page.evaluate((sid) => window.__FAKE.tabellen.schueler.find((s) => s.id === sid), id);
  if (gespeichert.reakt_status !== "bezahlt" || !gespeichert.reakt_bezahlt_bis) fehler("Fristen: Zahlung nicht gespeichert");
  // Bearbeiten: „befreit“ ohne Grund muss abgelehnt werden
  await page.click("[data-fristen]");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "fristen-dialog.png") });
  await pruefeLayout(page, "Fristen-Dialog");
  await page.check("dialog input[value=befreit]");
  await page.fill("dialog input[name=reakt_notiz]", "");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(150);
  if (!(await page.isVisible("dialog"))) fehler("Fristen: „befreit“ ohne Grund wurde gespeichert");
  await page.fill("dialog input[name=reakt_notiz]", "Test-Grund");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(250);
  if (await page.isVisible("dialog")) fehler("Fristen: Dialog bleibt nach gültigem Speichern offen");
  // Suche
  await page.goto(page.url().split("#")[0] + "#fristen?ansicht=alle");
  await page.waitForTimeout(300);
  const alle = await page.$$eval(".tabelle tbody tr", (r) => r.length);
  await page.fill("#fristenSuche", "Lena");
  await page.waitForTimeout(500);
  const gefiltert = await page.$$eval(".tabelle tbody tr", (r) => r.length);
  if (!(gefiltert > 0 && gefiltert < alle)) fehler(`Fristen: Suche filtert nicht (${alle} → ${gefiltert})`);
  if (konsole.length) fehler("Fristen: Konsole: " + konsole.join(" | "));
  await ctx.close();
}
// Speichern ohne Berechtigung meldet einen Fehler statt „gespeichert“
{
  const { page, ctx } = await oeffne({ nutzer: "bu-1", hash: "#fristen", vorbereiten: function () { F.fehler = { schueler: "permission denied" }; } });
  await page.waitForTimeout(200);
  // Laden schlägt fehl -> Statusanzeige rot
  const status = await page.getAttribute("#status", "class");
  if (!/fehler/.test(status)) fehler("Fehlerfall: Status nicht rot");
  await ctx.close();
}

// 4b) Prüfungstafel: Haken setzen, planen (mit Kalender), Ergebnis, Großansicht
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#pruefungen", breite: 1920, hoehe: 1080 });
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungen-tafel.png"), fullPage: true });
  await page.click('[data-id="pt-1"][data-haken="tuev_gutschein"]');
  await page.waitForTimeout(200);
  const pt1 = await page.evaluate(() => window.__FAKE.tabellen.pruefungstermine.find((p) => p.id === "pt-1"));
  if (!pt1.tuev_gutschein) fehler("Prüfungstafel: Haken nicht gespeichert");
  await page.click("#pNeu");
  await page.selectOption("dialog select[name=schueler_id]", "s2");
  await page.fill("dialog input[name=von]", "11:30");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungen-dialog.png") });
  await pruefeLayout(page, "Prüfungs-Dialog");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const neu = await page.evaluate(() => window.__FAKE.tabellen.pruefungstermine.find((p) => p.schueler_id === "s2"));
  if (!neu) fehler("Prüfungstafel: neue Prüfung nicht gespeichert");
  else {
    if (!neu.fahrlehrer_id) fehler("Prüfungstafel: Fahrlehrer nicht vom Schüler übernommen");
    const kt = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id), neu.kalender_termin_id);
    if (!kt || kt.art !== "pruefung" || kt.bis !== "13:00") fehler("Prüfungstafel: kein passender Kalendertermin für den Fahrlehrer " + JSON.stringify(kt));
  }
  // Ergebnis für die gestrige Prüfung
  await page.click('[data-ergebnis="pt-4"]');
  await page.check("dialog input[value=bestanden]");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(700);
  // Nach „bestanden“ fragt die Seite, ob der Schüler inaktiv werden soll: hier „Nein“
  if (!(await page.isVisible("dialog[open]"))) fehler("Prüfungstafel: keine Frage „auf inaktiv setzen?“ nach bestandener Praxis");
  else { await page.click("dialog [data-schliessen]"); await page.waitForTimeout(200); }
  const s8 = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((s) => s.id === "s8"));
  if (s8.reakt_status !== "befreit") fehler("Prüfungstafel: bestandene Praxis befreit nicht von der Reaktivierung");
  await page.goto(page.url().split("#")[0] + "#pruefungen?gross=1");
  await page.waitForTimeout(300);
  if (await page.isVisible(".seite")) fehler("Großansicht: Menü noch sichtbar");
  await pruefeBreite(page, "Großansicht");
  await pruefeLayout(page, "Großansicht");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pruefungen-gross.png"), fullPage: true });
  if (konsole.length) fehler("Prüfungstafel: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4c) Schüler anlegen, Fahrlehrer wechseln
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#schueler", breite: 1920, hoehe: 1080 });
  await page.click("#sNeu");
  await page.fill("dialog input[name=name]", "Neu Testschüler");
  await page.fill("dialog input[name=telefon]", "0170 1234567");
  await page.selectOption("dialog select[name=fahrlehrer_id]", "fl-2");
  await page.selectOption("dialog select[name=ausbildungsart]", "umschreibung");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(300);
  const neu = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((s) => s.name === "Neu Testschüler"));
  if (!neu || neu.fahrlehrer_id !== "fl-2" || !neu.ausbildung.umschreiber || !/^[A-Za-z0-9_-]{1,64}$/.test(neu.id)) fehler("Schüler anlegen falsch: " + JSON.stringify(neu));
  await page.selectOption("#sLehrer", "ohne");
  await page.waitForTimeout(200);
  const ohne = await page.$$eval(".tabelle tbody tr", (r) => r.length);
  if (ohne < 1) fehler("Schüler: Filter ohne Fahrlehrer leer");
  await page.click("[data-sbearb]");
  await page.selectOption("dialog select[name=fahrlehrer_id]", "fl-1");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const v = await page.evaluate(() => (window.__FAKE.tabellen.schueler_verschiebungen || []).length);
  if (v !== 1) fehler("Schüler verschieben: kein Übergabe-Eintrag");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "schueler.png") });
  if (konsole.length) fehler("Schüler: Konsole: " + konsole.join(" | "));
  await ctx.close();
}
// 4d) Kalender: Termin anlegen per Klick, verschieben, absagen
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#kalender", breite: 1920, hoehe: 1080 });
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "kalender.png"), fullPage: true });
  const flaeche = await page.$('.k-flaeche[data-lehrer="fl-1"]');
  const box = await flaeche.boundingBox();
  await flaeche.click({ position: { x: 10, y: box.height - 20 } }); // ganz unten = später Abend, sicher frei
  await page.waitForSelector("dialog");
  await page.selectOption("dialog select[name=schueler_id]", "s1");
  await page.fill("dialog input[name=von]", "20:00");
  await page.fill("dialog input[name=bis]", "20:45");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => window.__FAKE.tabellen.kalender_termine.find((x) => x.von === "20:00" && x.fahrlehrer_id === "fl-1"));
  if (!t || t.schueler_id !== "s1") fehler("Kalender: Termin nicht angelegt");
  else {
    await page.click(`[data-termin="${t.id}"]`);
    await page.fill("dialog input[name=von]", "19:00");
    await page.fill("dialog input[name=bis]", "19:30");
    await page.click("dialog button[value=ok]");
    await page.waitForTimeout(300);
    const t2 = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((x) => x.id === id), t.id);
    if (t2.von !== "19:00") fehler("Kalender: Verschieben nicht gespeichert");
    await page.click(`[data-termin="${t.id}"]`);
    await page.check("dialog input[name=absagen]");
    await page.click("dialog button[value=ok]");
    await page.click("dialog >> nth=1 >> button[value=ok]");
    await page.waitForTimeout(300);
    const t3 = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((x) => x.id === id), t.id);
    if (!t3.geloescht) fehler("Kalender: Absagen nicht gespeichert");
  }
  if (konsole.length) fehler("Kalender: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4e) Fahrcheck-Abgabe: Soll stimmt mit der Rechenregel überein, Quittung wird gespeichert
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#fahrchecks?z=vor", breite: 1920, hoehe: 1080 });
  await page.click('[data-fcabgabe="fl-1"]');
  const soll = Number(await page.textContent("dialog .gross-zahl"));
  if (!(soll > 0)) fehler("Fahrchecks: kein Soll für Fahrlehrer Anton");
  await page.fill("dialog input[name=ist]", String(soll - 2));
  const meldung = await page.textContent("#fcErgebnis");
  if (!/fehlen 2/.test(meldung)) fehler("Fahrchecks: Differenz nicht angezeigt: " + meldung);
  const kaesten = await page.$$("dialog input[name=fehlt]");
  await kaesten[0].check();
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "fahrchecks-dialog.png") });
  await pruefeLayout(page, "Fahrcheck-Dialog");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const q = await page.evaluate(() => (window.__FAKE.tabellen.fc_abgaben || [])[0]);
  if (!q || q.soll !== soll || q.ist !== soll - 2 || q.fehlend.length !== 1) fehler("Fahrchecks: Quittung falsch " + JSON.stringify(q));
  const st = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id).buero_fc_status, q && q.fehlend[0]);
  if (st !== "fehlt") fehler("Fahrchecks: Stunde nicht als fehlend markiert");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "fahrchecks.png"), fullPage: true });
  if (konsole.length) fehler("Fahrchecks: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4e2) Fahrchecks: alle Stunden suchen, filtern, ändern, nachtragen
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#fahrchecks?ansicht=stunden&von=2000-01-01", breite: 1366, hoehe: 900 });
  const zeilen = async () => page.$$eval(".karte table.tabelle tbody tr", (r) => r.filter((x) => !x.querySelector(".leer")).length);
  const alle = await zeilen();
  if (!(alle > 20)) fehler("Fahrchecks-Stunden: zu wenige Zeilen (" + alle + ")");
  for (const breite of [1024, 1366, 1920]) {
    await page.setViewportSize({ width: breite, height: 900 });
    await pruefeLayout(page, "Fahrcheck-Stunden@" + breite);
    await pruefeBreite(page, "Fahrcheck-Stunden@" + breite);
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  // Fahrlehrer filtern
  await page.selectOption("#fcLehrer", "fl-1");
  await page.waitForTimeout(200);
  const nurAnton = await page.$$eval(".karte table.tabelle tbody tr td.nur-sehr-breit:nth-child(3)", (c) => [...new Set(c.map((x) => x.textContent.trim()))]);
  if (nurAnton.length !== 1) fehler("Fahrchecks-Stunden: Fahrlehrer-Filter zeigt " + JSON.stringify(nurAnton));
  const nachFilter = await zeilen();
  if (!(nachFilter > 0 && nachFilter < alle)) fehler(`Fahrchecks-Stunden: Filter ${alle} -> ${nachFilter}`);
  // Fahrcheck-Typ filtern
  await page.selectOption("#fcLehrer", "");
  await page.selectOption("#fcTyp", "eins");
  await page.waitForTimeout(200);
  const eins = await page.$$eval(".karte table.tabelle tbody tr", (r) => r.filter((x) => !x.querySelector(".leer")).map((x) => x.textContent));
  if (!eins.length || eins.some((t) => !/1 FC fehlt/.test(t))) fehler("Fahrchecks-Stunden: Typ-Filter falsch (" + eins.length + ")");
  await page.selectOption("#fcTyp", "");
  // Suche nach Unsinn
  await page.fill("#fcSuche", "zzzqqq");
  await page.waitForTimeout(500);
  if (!(await page.isVisible(".leer"))) fehler("Fahrchecks-Stunden: Suche ohne Treffer zeigt keinen Hinweis");
  await page.fill("#fcSuche", "");
  await page.waitForTimeout(500);
  // Abgegeben setzen, ändern, nachreichen
  const erste = await page.$eval("[data-fcstatus=abgegeben]", (b) => b.dataset.id);
  await page.click(`[data-fcstatus=abgegeben][data-id="${erste}"]`);
  await page.waitForTimeout(300);
  let t = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((x) => x.id === id), erste);
  if (t.buero_fc_status !== "abgegeben") fehler("Fahrchecks-Stunden: Abgegeben nicht gespeichert");
  await page.click(`[data-fcbearb="${erste}"]`);
  await page.selectOption("dialog select[name=status]", "fehlt");
  await pruefeLayout(page, "Fahrcheck-Ändern-Dialog");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(300);
  t = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((x) => x.id === id), erste);
  if (t.buero_fc_status !== "fehlt") fehler("Fahrchecks-Stunden: Ändern nicht gespeichert");
  if ("aktualisiert_am" in t && t.aktualisiert_am === new Date().toISOString().slice(0, 10)) fehler("Fahrchecks-Stunden: aktualisiert_am verändert");
  await page.click(`[data-fcnach="${erste}"]`);
  await page.waitForTimeout(300);
  t = await page.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((x) => x.id === id), erste);
  if (t.buero_fc_status !== "abgegeben" || t.buero_fc_nachgereicht_am !== HEUTE) fehler("Fahrchecks-Stunden: Nachgereicht falsch " + JSON.stringify([t.buero_fc_status, t.buero_fc_nachgereicht_am]));
  // früherer Zeitraum wählbar
  await page.goto(page.url().split("#")[0] + "#fahrchecks");
  await page.waitForTimeout(300);
  const optionen = await page.$$eval("#fcZeitraum option", (o) => o.length);
  if (optionen < 10) fehler("Fahrchecks: Zeitraum-Auswahl hat nur " + optionen + " Einträge");
  if (konsole.length) fehler("Fahrchecks-Stunden: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4e3) Prüfungstafel: suchen und nach Datum sortieren/eingrenzen
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#pruefungen?ansicht=alle", breite: 1366, hoehe: 900 });
  const daten = async () => page.$$eval(".karte table.ptabelle", (t) => t.length);
  const alle = await daten();
  if (!alle) fehler("Prüfungstafel: keine Tage in Ansicht „Alle“");
  const tage = async () => page.$$eval(".tag-titel", (h) => h.map((x) => x.textContent));
  const auf = await tage();
  await page.selectOption("#pSort", "ab");
  await page.waitForTimeout(200);
  const ab = await tage();
  if (auf.length > 1 && auf[0] !== ab[ab.length - 1]) fehler("Prüfungstafel: Sortierung dreht die Reihenfolge nicht um");
  await page.fill("#pSuche", "zzzqqq");
  await page.waitForTimeout(500);
  if (!(await page.isVisible(".leer"))) fehler("Prüfungstafel: Suche ohne Treffer zeigt keinen Hinweis");
  await page.fill("#pSuche", "");
  await page.waitForTimeout(500);
  await page.fill("#pVon", "2099-01-01");
  await page.dispatchEvent("#pVon", "change");
  await page.waitForTimeout(300);
  if (await daten()) fehler("Prüfungstafel: Datumsfilter „von“ ohne Wirkung");
  for (const breite of [1024, 1366, 1920]) {
    await page.setViewportSize({ width: breite, height: 900 });
    await pruefeLayout(page, "Prüfungstafel-Filter@" + breite);
  }
  if (konsole.length) fehler("Prüfungstafel-Filter: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4e4) Anmeldung: eigener Büro-Bereich, Rückweg zur App, Logo mit runden Ecken
{
  const { page, ctx, konsole } = await oeffne({ nutzer: null, breite: 1366, hoehe: 860 });
  if (!/Büro-Anmeldung/.test(await page.textContent("#login h1"))) fehler("Anmeldung: Überschrift „Büro-Anmeldung“ fehlt");
  if (!(await page.$('#login a[href="index.html"].knopf'))) fehler("Anmeldung: Link zur Fahrlehrer-Anmeldung fehlt");
  await page.check("#loginZeig");
  if ((await page.getAttribute("#loginPw", "type")) !== "text") fehler("Anmeldung: Passwort anzeigen geht nicht");
  const radius = await page.$eval(".login-logo", (i) => parseFloat(getComputedStyle(i).borderTopLeftRadius));
  if (!(radius >= 8)) fehler("Logo: Ecken nicht abgerundet (" + radius + ")");
  await pruefeLayout(page, "Büro-Anmeldung");
  if (konsole.length) fehler("Anmeldung: Konsole: " + konsole.join(" | "));
  await ctx.close();
  const b = await oeffne({ nutzer: "ad-1", breite: 1366, hoehe: 860 });
  if (!(await b.page.isVisible("#zurApp"))) fehler("Rückweg: Link zur Fahrlehrer-Ansicht fehlt in der Seitenleiste");
  const r2 = await b.page.$eval(".marke img", (i) => parseFloat(getComputedStyle(i).borderTopLeftRadius));
  if (!(r2 >= 8)) fehler("Logo in der Seitenleiste: Ecken nicht abgerundet");
  await b.ctx.close();
}

// 4g) Fenster lassen sich immer schließen (auch bei leeren Pflichtfeldern), auf jeder Seite
{
  const faelle = [
    ["#fahrchecks?z=vor", '[data-fcabgabe="fl-1"]', "Fahrcheck-Abgabe"],
    ["#schueler", "#sNeu", "Schüler anlegen"],
    ["#pruefungen", "#pNeu", "Prüfung planen"],
    ["#fristen?ansicht=alle", "[data-fristen]", "Fristen"],
    ["#fristen?ansicht=alle", "[data-zahlung]", "Reaktivierung bezahlt"],
    ["#verkaeufe", "[data-vbezahlt]", "Verkauf bezahlt"],
    ["#team", "#tNeuBu", "Zugang anlegen"],
    ["#kalender", ".k-flaeche", "Kalender: neuer Termin"],
    ["#fahrchecks?ansicht=stunden&von=2000-01-01", "[data-fcbearb]", "Fahrcheck ändern"],
  ];
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", breite: 1366, hoehe: 900 });
  for (const [hash, knopf, name] of faelle) {
    await page.goto(page.url().split("#")[0] + hash);
    await page.waitForTimeout(500);
    for (const weg of ["Abbrechen", "Kreuz", "Esc", "Rand"]) {
      const el = await page.$(knopf);
      if (!el) { fehler(`Fenster „${name}“: Knopf ${knopf} nicht gefunden`); break; }
      if (knopf === ".k-flaeche") { const b = await el.boundingBox(); await page.mouse.click(b.x + 60, b.y + 200); } else await el.click();
      await page.waitForTimeout(250);
      if (!(await page.isVisible("dialog[open]"))) { fehler(`Fenster „${name}“ ließ sich nicht öffnen (${weg})`); break; }
      if (weg === "Abbrechen") await page.click("dialog footer [data-schliessen]");
      else if (weg === "Kreuz") await page.click("dialog header [data-schliessen]");
      else if (weg === "Esc") await page.keyboard.press("Escape");
      else await page.mouse.click(3, 3);
      await page.waitForTimeout(250);
      if (await page.isVisible("dialog[open]")) { fehler(`Fenster „${name}“ lässt sich nicht schließen per ${weg}`); await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
    }
  }
  if (konsole.length) fehler("Fenster schließen: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4h) Seitenleiste einklappbar, Reaktivierung 240 € mit Absprache, Ausbildungsart/Klasse, Aktiv/Inaktiv, B197-Testfahrt
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#heute", breite: 1366, hoehe: 900 });
  // Seitenleiste
  const sichtbar = () => page.$$eval(".nav-liste:not([hidden]) .nav-punkt", (a) => a.length);
  const alle = await sichtbar();
  await page.click('[data-gruppe="Geld"]');
  if ((await sichtbar()) !== alle - 2) fehler("Seitenleiste: Gruppe „Geld“ klappt nicht zu");
  await page.evaluate(() => zeichneNav());
  if ((await sichtbar()) !== alle - 2) fehler("Seitenleiste: zugeklappte Gruppe wird nicht gemerkt");
  // PIN-Anmeldung merkt sich der Browser-Tab (auch nach Neuladen), bis 20 Minuten nichts angeklickt wurde
  await page.evaluate(async () => { S.sitzung = null; S.wer = ""; await starteWer(); });
  if (await page.isVisible("#wer:not([hidden])")) fehler("PIN: Anmeldung wird nach Neuladen nicht übernommen");
  await page.goto(page.url().split("#")[0] + "#zahlen");
  await page.waitForTimeout(300);
  if ((await sichtbar()) !== alle) fehler("Seitenleiste: Seite in zugeklappter Gruppe öffnet die Gruppe nicht");
  await pruefeLayout(page, "Seitenleiste");
  // Wer bedient: Name und Kopfzeile
  const wer = await page.evaluate(() => ({ s: S.wer, an: document.getElementById("werAnzeige").textContent }));
  if (wer.s !== "Kristina" || wer.an !== "Kristina") fehler("PIN: Name nicht übernommen " + JSON.stringify(wer));
  // Kopfzeile: nur der Sitzungsschlüssel, nur an die Datenbank, kein frei getippter Name mehr
  const kopf = await page.evaluate(() => { window.__echt = window.fetch; window.fetch = (u, o) => ({ h: [...new Headers(o.headers)].filter(([k]) => k.startsWith("x-buero")), u }); const r = [bueroFetch("https://x/rest/v1/schueler", {}), bueroFetch("https://x/auth/v1/token", {})]; window.fetch = window.__echt; return { r, tok: S.sitzung.token }; });
  if (kopf.r[0].h.length !== 1 || kopf.r[0].h[0][0] !== "x-buero-sitzung" || kopf.r[0].h[0][1] !== kopf.tok || kopf.r[1].h.length) fehler("PIN: Kopfzeile falsch " + JSON.stringify(kopf));
  // Ausbildungsart und Klasse
  await page.goto(page.url().split("#")[0] + "#schueler");
  await page.waitForTimeout(400);
  await page.click("#sNeu");
  const arten = await page.$$eval("dialog select[name=ausbildungsart] option", (o) => o.map((x) => x.textContent));
  if (arten.join("|") !== "Ersterwerb|Fahrschulwechsel|Umschreibung|Neuerteilung|Auffrischung|Erweiterung") fehler("Ausbildungsart: " + arten.join("|"));
  const klassen = await page.$$eval("dialog select[name=klasse] option", (o) => o.slice(0, 4).map((x) => x.textContent));
  if (klassen.join("|") !== "–|B (Schalter)|B78 (Automatik)|B197 (Schaltkompetenz)") fehler("Klassen: " + klassen.join("|"));
  if (await page.isVisible("#b197Feld")) fehler("B197-Feld sichtbar, obwohl Klasse B");
  await page.selectOption("dialog select[name=klasse]", "B197");
  if (!(await page.isVisible("#b197Feld"))) fehler("B197-Feld erscheint nicht bei Klasse B197");
  await page.fill("dialog input[name=name]", "Test Schüler");
  await page.check("dialog input[name=testfahrt]");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const neu = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((x) => x.name === "Test Schüler"));
  if (!neu || neu.ausbildungsart !== "ersterwerb" || neu.klasse !== "B197" || neu.b197_testfahrt_am !== HEUTE) fehler("Neuer Schüler: " + JSON.stringify(neu && [neu.ausbildungsart, neu.klasse, neu.b197_testfahrt_am]));
  // Aktiv/Inaktiv
  await page.fill("#sSuche", "Test Schüler");
  await page.waitForTimeout(500);
  await page.click("[data-sbearb]");
  if (await page.isVisible("dialog input[name=aktiv]") === false && !(await page.$("dialog input[name=aktiv]"))) fehler("Aktiv-Schalter fehlt");
  await page.click("dialog .schalter-bahn");
  if (!/Archiv/.test(await page.textContent("#aktivText"))) fehler("Aktiv-Schalter zeigt nicht „Im Archiv“");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const ina = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((x) => x.name === "Test Schüler").inaktiv_seit);
  if (ina !== HEUTE) fehler("Inaktiv nicht gespeichert: " + ina);
  if ((await page.$$eval(".schuelertab tbody tr", (r) => r.length)) !== 0) fehler("Inaktiver Schüler steht noch in der aktiven Liste");
  await page.goto(page.url().split("#")[0] + "#schueler?sicht=inaktiv");
  await page.waitForTimeout(400);
  const inaktive = await page.$$eval(".schuelertab tbody tr", (r) => r.length);
  if (inaktive < 1) fehler("Reiter „Archiv“ zeigt keine Schüler");
  await pruefeLayout(page, "Schüler inaktiv");
  // Wieder aktiv
  await page.fill("#sSuche", "Test Schüler");
  await page.waitForTimeout(500);
  await page.click("[data-sbearb]");
  await page.click("dialog .schalter-bahn");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  if ((await page.evaluate(() => window.__FAKE.tabellen.schueler.find((x) => x.name === "Test Schüler").inaktiv_seit)) !== null) fehler("Wieder aktiv: inaktiv_seit nicht geleert");
  // Reaktivierung bezahlt: Standard 240, Abweichung braucht Absprache
  await page.goto(page.url().split("#")[0] + "#fristen?ansicht=alle");
  await page.waitForTimeout(500);
  const bez = await page.$("[data-zahlung]");
  if (!bez) fehler("Fristen: kein Schüler mit „erhalten“-Knopf"); else {
    const sid = await bez.getAttribute("data-zahlung");
    await bez.click();
    if ((await page.inputValue("dialog input[name=betrag]")) !== "240") fehler("Reaktivierung: Standardbetrag nicht 240");
    await page.fill("dialog input[name=betrag]", "200");
    await page.click("dialog button[value=ok]");
    await page.waitForTimeout(300);
    if (!(await page.isVisible("dialog[open]"))) fehler("Reaktivierung: abweichender Betrag ohne Absprache wurde gespeichert");
    await page.selectOption("dialog select[name=absprache]", "Murat");
    await pruefeLayout(page, "Reaktivierung-Dialog");
    await page.click("dialog button[value=ok]");
    await page.waitForTimeout(400);
    const z = await page.evaluate((id) => window.__FAKE.tabellen.schueler.find((x) => x.id === id), sid);
    if (z.reakt_betrag !== 200 || !/Absprache mit Murat/.test(z.reakt_notiz) || z.reakt_status !== "bezahlt") fehler("Reaktivierung gespeichert falsch: " + JSON.stringify([z.reakt_betrag, z.reakt_notiz, z.reakt_status]));
  }
  // Einstellungen: nur Super-Admin ändert
  if (!(await page.$("#einstForm input[name=betrag][disabled]"))) fehler("Einstellungen: Büro darf den Standardbetrag ändern");
  if (konsole.length) fehler("Runde 2: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4i) Fahrcheck-Zettel: 12 Monate gültig
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#fahrchecks?ansicht=stunden&gueltig=verfallen", breite: 1366, hoehe: 900,
    vorbereiten: function () {
      const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
      const alt = F.tabellen.kalender_termine[0];
      F.tabellen.kalender_termine.push(Object.assign({}, alt, { id: "t-alt", datum: d(-380), von: "09:00", bis: "10:30", art: "fahrstunde", status: "geplant", payload: {}, buero_fc_status: "offen" }));
      F.tabellen.kalender_termine.push(Object.assign({}, alt, { id: "t-bald", datum: d(-330), von: "09:00", bis: "10:30", art: "sonder", status: "geplant", payload: {}, buero_fc_status: "offen" }));
    } });
  const zeilen = await page.$$eval(".karte table.tabelle tbody tr", (r) => r.filter((x) => !x.querySelector(".leer")).map((x) => x.textContent));
  if (zeilen.length !== 1 || !/verfallen/.test(zeilen[0])) fehler("Fahrchecks verfallen: " + zeilen.length + " Zeilen");
  await page.selectOption("#fcGueltig", "bald");
  await page.waitForTimeout(300);
  const bald = await page.$$eval(".karte table.tabelle tbody tr", (r) => r.filter((x) => !x.querySelector(".leer")).map((x) => x.textContent));
  if (bald.length !== 1 || !/läuft bald ab/.test(bald[0])) fehler("Fahrchecks läuft bald ab: " + bald.length);
  for (const b of [1024, 1366, 1920]) { await page.setViewportSize({ width: b, height: 900 }); await pruefeLayout(page, "Fahrcheck-Gültigkeit@" + b); }
  if (konsole.length) fehler("Fahrcheck-Gültigkeit: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4j) Fehler aus der Fehlersuche (09.10.2026): Enter speichert, kein „undefined“ in Fenstern, lange Namen, Großansicht, Wer-bist-du abbrechbar
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#schueler", breite: 1366, hoehe: 900 });
  // Enter speichert (und schließt nicht still)
  await page.click("#sNeu");
  const lang = "Langername".repeat(10);
  await page.fill("dialog input[name=name]", lang);
  await page.press("dialog input[name=name]", "Enter");
  await page.waitForTimeout(400);
  if (!(await page.evaluate((n) => window.__FAKE.tabellen.schueler.some((x) => x.name === n), lang))) fehler("Enter im Dialog speichert nicht");
  await pruefeLayout(page, "Schüler mit sehr langem Namen");
  await pruefeBreite(page, "Schüler mit sehr langem Namen");
  for (const sicht of ["alle", "inaktiv"]) for (const b of [1024, 1366]) {
    await page.setViewportSize({ width: b, height: 900 });
    await page.goto(page.url().split("#")[0] + "#schueler?sicht=" + sicht);
    await page.waitForTimeout(300);
    await pruefeLayout(page, `Schüler ${sicht}@${b}`);
    await pruefeBreite(page, `Schüler ${sicht}@${b}`);
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  // Kein „undefined“/„NaN“ in Fenstern
  for (const [hash, knopf, name] of [["#schueler", "#sNeu", "Schüler"], ["#pruefungen", "#pNeu", "Prüfung"], ["#kalender", ".k-flaeche", "Kalender"], ["#verkaeufe", "#vNeu", "Verkauf"]]) {
    await page.goto(page.url().split("#")[0] + hash);
    await page.waitForTimeout(400);
    const el = await page.$(knopf);
    if (!el) continue;
    if (knopf === ".k-flaeche") { const b = await el.boundingBox(); await page.mouse.click(b.x + 60, b.y + 200); } else await el.click();
    await page.waitForTimeout(250);
    const text = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return d ? d.innerText + [...d.querySelectorAll("option")].map((o) => o.textContent).join(" ") : ""; });
    if (/undefined|NaN|\[object/.test(text)) fehler(`Fenster „${name}“ zeigt „undefined/NaN“`);
    await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  }
  // Großansicht: wirklich nur 14 Tage
  await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 40); window.__FAKE.tabellen.pruefungstermine.push({ id: "pt-fern", fahrschule_id: window.__FAKE.tabellen.pruefungstermine[0].fahrschule_id, schueler_id: window.__FAKE.tabellen.schueler[0].id, art: "praxis", datum: d.toISOString().slice(0, 10), von: "09:00", status: "geplant" }); });
  await page.goto(page.url().split("#")[0] + "#heute"); await page.waitForTimeout(200);
  await page.evaluate(() => ladeDaten()); await page.waitForTimeout(500);
  await page.goto(page.url().split("#")[0] + "#pruefungen?gross=1");
  await page.waitForTimeout(400);
  const fern = await page.$$eval(".tag-titel", (h) => h.map((x) => x.textContent).join("|"));
  const grenze = new Date(); grenze.setDate(grenze.getDate() + 14);
  const fernDE = (() => { const d = new Date(); d.setDate(d.getDate() + 40); return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); })();
  if (fern.includes(fernDE)) fehler("Großansicht zeigt eine Prüfung in 40 Tagen");
  await page.goto(page.url().split("#")[0] + "#heute");
  // Fokus bleibt in der Seitenleiste
  await page.focus('[data-gruppe="Geld"]');
  await page.keyboard.press("Enter");
  if ((await page.evaluate(() => document.activeElement && document.activeElement.dataset.gruppe)) !== "Geld") fehler("Seitenleiste: Fokus geht beim Zuklappen verloren");
  await page.keyboard.press("Enter");
  if (konsole.length) fehler("Fehlersuche-Fälle: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4k) Zweite Hälfte: Notizen, Antrag, Auslastung, Kalender-Ansichten, Drucken
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#kalender", breite: 1366, hoehe: 900 });
  // Kalender: alle vier Ansichten, Springen, Suche
  for (const ans of ["woche", "monat", "jahr", "tag"]) for (const b of [1024, 1366, 1920]) {
    await page.setViewportSize({ width: b, height: 900 });
    await page.goto(page.url().split("#")[0] + "#kalender" + (ans === "tag" ? "" : "?ansicht=" + ans));
    await page.waitForTimeout(300);
    await pruefeLayout(page, `Kalender ${ans}@${b}`);
    await pruefeBreite(page, `Kalender ${ans}@${b}`);
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(page.url().split("#")[0] + "#kalender?ansicht=woche"); await page.waitForTimeout(300);
  if ((await page.$$(".k-spalte")).length !== 7) fehler("Kalender Woche: nicht 7 Tage");
  if ((await page.$$(".k-termin")).length < 3) fehler("Kalender Woche: zu wenige Termine");
  await page.click('[data-ktag]:has-text("→")'); await page.waitForTimeout(250);
  await page.goto(page.url().split("#")[0] + "#kalender?ansicht=monat"); await page.waitForTimeout(300);
  if ((await page.$$(".m-tag")).length < 28) fehler("Kalender Monat: zu wenige Tage");
  await page.click(".m-tag:not(.fremd) >> nth=14"); await page.waitForTimeout(300);
  if (!/^#kalender/.test(await page.evaluate(() => location.hash)) || /ansicht=/.test(await page.evaluate(() => location.hash))) fehler("Kalender Monat: Klick auf Tag öffnet nicht die Tagesansicht");
  await page.fill("#kDatum", "2027-03-05"); await page.dispatchEvent("#kDatum", "change"); await page.waitForTimeout(300);
  if (!/5\. März 2027/.test(await page.textContent(".k-titel"))) fehler("Kalender: Datum springen geht nicht: " + await page.textContent(".k-titel"));
  await page.goto(page.url().split("#")[0] + "#kalender"); await page.waitForTimeout(300);
  const name = await page.evaluate(() => { const t = window.__FAKE.tabellen.kalender_termine.find((x) => x.schueler_id && x.datum >= new Date().toISOString().slice(0, 10)); return window.__FAKE.tabellen.schueler.find((x) => x.id === t.schueler_id).name; });
  await page.fill("#kSuche", name); await page.waitForTimeout(600);
  if (!(await page.$(".k-suche-erg [data-ksprung]"))) fehler("Kalender: Schülersuche findet keine Termine für " + name);
  await pruefeLayout(page, "Kalender-Suche");
  // Auslastung
  await page.goto(page.url().split("#")[0] + "#auslastung"); await page.waitForTimeout(300);
  if ((await page.$$(".karte table tbody tr")).length < 3) fehler("Auslastung: zu wenige Fahrlehrer");
  for (const b of [1024, 1366, 1920]) { await page.setViewportSize({ width: b, height: 900 }); await pruefeLayout(page, "Auslastung@" + b); await pruefeBreite(page, "Auslastung@" + b); }
  await page.setViewportSize({ width: 1366, height: 900 });
  // Führerscheinantrag
  await page.goto(page.url().split("#")[0] + "#fristen?ansicht=antrag"); await page.waitForTimeout(300);
  await pruefeLayout(page, "Fristen Antrag");
  const neuBtn = await page.$("[data-antragneu]");
  if (neuBtn) { const sid = await neuBtn.getAttribute("data-antragneu"); await neuBtn.click(); await page.waitForTimeout(300); if ((await page.evaluate((id) => window.__FAKE.tabellen.schueler.find((x) => x.id === id).antrag_am, sid)) !== HEUTE) fehler("Antrag: „Neu eingereicht“ nicht gespeichert"); }
  else fehler("Antrag: kein Schüler mit abgelaufenem oder bald ablaufendem Antrag in den Testdaten");
  // Notiz an Fahrlehrer
  await page.goto(page.url().split("#")[0] + "#schueler"); await page.waitForTimeout(300);
  await page.click("[data-sbearb] >> nth=0");
  await page.fill("#nzText", "Bitte keine Fahrstunden anbieten");
  await page.selectOption("#nzArt", "stopp");
  await pruefeLayout(page, "Notiz-Block");
  await page.click("#nzSenden"); await page.waitForTimeout(300);
  const nz = await page.evaluate(() => window.__FAKE.tabellen.schueler_notizen || []);
  if (nz.length !== 1 || nz[0].art !== "stopp") fehler("Notiz nicht gespeichert: " + JSON.stringify(nz));
  if (!/noch nicht gelesen/.test(await page.textContent("#notizBlock"))) fehler("Notiz: „noch nicht gelesen“ fehlt");
  await page.click("[data-notizerledigt]"); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => window.__FAKE.tabellen.schueler_notizen[0].erledigt_am))) fehler("Notiz „Erledigt“ nicht gespeichert");
  await page.click("dialog [data-schliessen] >> nth=0");
  // Interne Aufgaben je Schüler und „Heute zu tun“
  await page.click("[data-sbearb] >> nth=0");
  await page.fill("#agText", "Unterlagen nachfordern");
  await pruefeLayout(page, "Aufgaben-Block");
  await page.click("#agHeute"); await page.waitForTimeout(300);
  await page.fill("#agText", "Später anrufen");
  await page.fill("#agDatum", "2999-01-01");
  await page.click("#agSpeichern"); await page.waitForTimeout(300);
  const ag = await page.evaluate(() => (window.__FAKE.tabellen.schueler_aufgaben || []).map((a) => [a.text, a.heute, a.faellig_am]));
  if (ag.length !== 2 || !ag.some((a) => a[0] === "Unterlagen nachfordern" && a[1] === true)) fehler("Aufgaben nicht gespeichert: " + JSON.stringify(ag));
  await page.fill("#agText", "Nicht gespeichert");
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(200);
  if (!(await page.isVisible("dialog[open]"))) fehler("Fenster schließt trotz ungespeicherter Aufgabe");
  await page.fill("#agText", "");
  await page.click("dialog [data-schliessen] >> nth=0");
  await page.goto(page.url().split("#")[0] + "#heute"); await page.waitForTimeout(350);
  const heuteText = await page.textContent("#ansicht");
  if (!/Unterlagen nachfordern/.test(heuteText)) fehler("„Heute zu tun“ zeigt die Aufgabe nicht");
  if (/Später anrufen/.test(heuteText)) fehler("Aufgabe mit Datum in der Zukunft steht schon unter „Heute zu tun“");
  await pruefeLayout(page, "Heute zu tun mit Aufgabe");
  await page.click("[data-hagerledigt]"); await page.waitForTimeout(300);
  if ((await page.$$("[data-hagerledigt]")).length !== 0) fehler("Erledigte Aufgabe steht noch unter „Heute zu tun“");
  if (!(await page.evaluate(() => window.__FAKE.tabellen.schueler_aufgaben.find((a) => a.text === "Unterlagen nachfordern").erledigt_am))) fehler("Aufgabe „Erledigt“ nicht gespeichert");
  // Warteliste: Regel und Anzeige
  const warte = await page.evaluate((h) => {
    const alt = "2026-01-10T10:00:00Z", zu = (a) => { wartIndex = null; return wartetArt({ id: "wt", ausbildung: a }); };
    const fs = (datum) => ({ schueler_id: "wt", art: "fahrstunde", datum, status: "geplant" });
    const out = [zu({ theorieWait: alt }), zu({ ready: alt })];
    S.termine.push(fs("2026-02-01")); out.push(zu({ ready: alt }));
    S.termine.pop(); S.termine.push(fs("2999-01-01")); out.push(zu({ ready: alt }), zu({ theorieWaitBis: alt, theoryPassed: alt }));
    S.termine.pop(); S.termine.push({ schueler_id: "wt", art: "pruefung", datum: "2999-01-01", status: "geplant" }); out.push(zu({ ready: alt }));
    S.termine.pop(); wartIndex = null;
    return out.join();
  }, HEUTE);
  if (warte !== "theorie,praxis,,,,") fehler("Warteliste-Regel falsch: " + warte);
  await page.evaluate(() => { const x = window.__FAKE.tabellen.schueler.find((s) => !s.inaktiv_seit); x.ausbildung = Object.assign({}, x.ausbildung, { theorieWait: "2026-01-10T10:00:00Z" }); window.__wartId = x.id; return ladeDaten(); });
  await page.waitForTimeout(500);
  await page.goto(page.url().split("#")[0] + "#schueler?sicht=warte"); await page.waitForTimeout(400);
  if ((await page.$$eval(".schuelertab tbody tr", (r) => r.length)) < 1) fehler("Reiter „Warteliste“ zeigt keinen Schüler");
  if (!/Warteliste \(\d+\)/.test(await page.textContent(".tabs"))) fehler("Reiter „Warteliste“ fehlt");
  await pruefeLayout(page, "Schüler Warteliste");
  await page.goto(page.url().split("#")[0] + "#auslastung"); await page.waitForTimeout(400);
  await pruefeLayout(page, "Auslastung mit Warteliste");
  // Drucken: weißes Papier, kein Menü, nichts ragt heraus (A4 quer)
  await page.setViewportSize({ width: 1047, height: 740 });
  for (const hash of ["#heute", "#pruefungen?ansicht=alle", "#fahrchecks", "#fahrchecks?ansicht=stunden&von=2000-01-01", "#fristen?ansicht=alle", "#kalender", "#kalender?ansicht=monat", "#schueler", "#verkaeufe", "#zahlen", "#flotte", "#auslastung"]) {
    await page.emulateMedia({ media: "screen" });
    await page.goto(page.url().split("#")[0] + hash); await page.waitForTimeout(350);
    await page.emulateMedia({ media: "print", colorScheme: "dark" });
    await page.evaluate(() => fuelleDruckKopf());
    const r = await page.evaluate(() => ({
      menue: getComputedStyle(document.querySelector(".seite")).display !== "none",
      knopf: [...document.querySelectorAll("#ansicht .knopf")].some((k) => getComputedStyle(k).display !== "none"),
      bg: getComputedStyle(document.body).backgroundColor, breite: document.documentElement.scrollWidth, fenster: window.innerWidth,
      kopf: document.getElementById("druckKopf").textContent.length,
    }));
    if (r.menue) fehler(`Drucken ${hash}: Menü sichtbar`);
    if (r.knopf) fehler(`Drucken ${hash}: Knöpfe sichtbar`);
    if (r.bg !== "rgb(255, 255, 255)") fehler(`Drucken ${hash}: Hintergrund nicht weiß (${r.bg})`);
    if (r.breite > r.fenster + 2) fehler(`Drucken ${hash}: breiter als Papier (${r.breite} > ${r.fenster})`);
    if (r.kopf < 10) fehler(`Drucken ${hash}: Kopfzeile fehlt`);
    if (FOTOS && hash === "#pruefungen?ansicht=alle") await page.screenshot({ path: join(FOTOS, "druck-pruefungen.png"), fullPage: true });
    if (FOTOS && hash === "#schueler") await page.screenshot({ path: join(FOTOS, "druck-schueler.png"), fullPage: true });
  }
  await page.emulateMedia({ media: "screen" });
  if (konsole.length) fehler("Zweite Hälfte: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4l) Fehler aus der zweiten Fehlersuche (09.10.2026)
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#schueler", breite: 1366, hoehe: 900 });
  // Schüler-Dialog läuft nicht seitlich über (neu und bestehend)
  for (const b of [1024, 1366, 1920]) {
    await page.setViewportSize({ width: b, height: 900 });
    for (const knopf of ["#sNeu", "[data-sbearb] >> nth=0"]) {
      await page.click(knopf); await page.waitForTimeout(150);
      const r = await page.evaluate(() => { const i = document.querySelector("dialog[open] .dialog-inhalt"); return [i.scrollWidth, i.clientWidth]; });
      if (r[0] > r[1] + 1) fehler(`Schüler-Dialog läuft über (${r[0]} > ${r[1]}) bei ${b} px`);
      await pruefeLayout(page, `Schüler-Dialog@${b}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    }
  }
  // Doppelklick auf „Speichern“ legt nur einen Schüler an
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate(() => { const alt = window.__FAKE; window.__FAKE.verzoegerung = 120; });
  await page.click("#sNeu");
  await page.fill("dialog input[name=name]", "Doppelklick Test");
  await page.dblclick("dialog button[value=ok]");
  await page.waitForTimeout(600);
  const anzahl = await page.evaluate(() => window.__FAKE.tabellen.schueler.filter((x) => x.name === "Doppelklick Test").length);
  if (anzahl !== 1) fehler(`Doppelklick legt ${anzahl} Schüler an`);
  // Ungesendeter Notiztext geht nicht still verloren
  await page.fill("#sSuche", "Doppelklick"); await page.waitForTimeout(500);
  await page.click("[data-sbearb]");
  await page.fill("#nzText", "noch nicht gesendet");
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(300);
  if (!(await page.isVisible("dialog[open]"))) fehler("Ungesendete Notiz: Fenster schließt ohne Warnung");
  await page.click("#nzSenden"); await page.waitForTimeout(300);
  await page.click("dialog [data-schliessen] >> nth=0"); await page.waitForTimeout(200);
  if (!/Notiz/.test(await page.textContent(".schuelertab tbody"))) fehler("Schülerliste zeigt die neue Notiz nicht sofort");
  // Kalender: Termine vor 7 und nach 21 Uhr bleiben sichtbar; gesperrter Fahrlehrer fehlt in der Tagesansicht
  const tag = await page.evaluate(() => {
    const T = window.__FAKE.tabellen, d = new Date(); d.setDate(d.getDate() + 3); const datum = d.toISOString().slice(0, 10);
    const fl = T.profiles.find((p) => p.rolle === "fahrlehrer");
    T.kalender_termine.push({ id: "t-nacht", fahrschule_id: fl.fahrschule_id, fahrlehrer_id: fl.id, schueler_id: null, datum, von: "21:15", bis: "22:45", art: "nacht", status: "geplant", geloescht: false, payload: {}, buero_fc_status: "offen" });
    T.kalender_termine.push({ id: "t-frueh", fahrschule_id: fl.fahrschule_id, fahrlehrer_id: fl.id, schueler_id: null, datum, von: "05:30", bis: "06:45", art: "fahrstunde", status: "geplant", geloescht: false, payload: {}, buero_fc_status: "offen" });
    const g = T.profiles.find((p) => p.rolle === "fahrlehrer" && p.id !== fl.id); g.aktiv = false; window.__gesperrt = g.name;
    return datum;
  });
  await page.evaluate(() => ladeDaten()); await page.waitForTimeout(500);
  await page.goto(page.url().split("#")[0] + "#kalender?tag=" + tag); await page.waitForTimeout(400);
  const sicht = await page.$$eval('.k-termin[data-termin="t-nacht"], .k-termin[data-termin="t-frueh"]', (b) => b.length);
  if (sicht !== 2) fehler("Kalender: Termine vor 07:00 oder nach 21:00 sind nicht sichtbar (" + sicht + " von 2)");
  const gesperrtName = await page.evaluate(() => window.__gesperrt);
  const koepfe = await page.$$eval(".k-lname", (e) => e.map((x) => x.textContent));
  if (koepfe.includes(gesperrtName)) fehler("Kalender Tag zeigt gesperrten Fahrlehrer " + gesperrtName);
  // Jahr: Farben unterscheiden sich
  await page.goto(page.url().split("#")[0] + "#kalender?ansicht=jahr"); await page.waitForTimeout(400);
  const farben = await page.$$eval(".j-tag", (e) => [...new Set(e.map((x) => getComputedStyle(x).backgroundColor))].length);
  if (farben < 2) fehler("Kalender Jahr: Auslastungsfarben fehlen (" + farben + " Farben)");
  // Blättern legt Verlaufseinträge an (Zurück zeigt den vorigen Monat)
  await page.goto(page.url().split("#")[0] + "#kalender?ansicht=monat&tag=2026-05-15"); await page.waitForTimeout(300);
  await page.click('[data-ktag] >> nth=2'); await page.waitForTimeout(250);
  if (!/Juni 2026/.test(await page.textContent(".k-titel"))) fehler("Monat →: " + await page.textContent(".k-titel"));
  await page.goBack(); await page.waitForTimeout(300);
  if (!/Mai 2026/.test(await page.textContent(".k-titel"))) fehler("Zurück im Browser springt nicht zum vorigen Monat: " + await page.textContent(".k-titel"));
  // Druck als PDF: keine leere Zusatzseite bei kurzer Liste
  await page.goto(page.url().split("#")[0] + "#kalender?ansicht=monat"); await page.waitForTimeout(300);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ landscape: true, format: "A4", preferCSSPageSize: true });
  const seiten = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  if (seiten !== 1) fehler("Druck Monatsansicht hat " + seiten + " Seiten statt 1");
  await page.emulateMedia({ media: "screen" });
  if (konsole.length) fehler("Fehlersuche 2: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4f) Verkäufe: bezahlt bucht Provision, ausgezahlt
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#verkaeufe", breite: 1920, hoehe: 1080 });
  await page.click('[data-vbezahlt="e1"]');
  await page.waitForSelector("#vSplit table");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const e1 = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_empfehlungen.find((e) => e.id === "e1"));
  if (e1.status !== "bezahlt" || e1.betrag !== 100 || e1.aufteilung.fahrlehrer !== 15) fehler("Verkauf: bezahlt falsch " + JSON.stringify(e1));
  const pv = await page.evaluate(() => window.__FAKE.tabellen.provisionen.filter((p) => p.fahrlehrer_id === "fl-1" && p.status === "offen").length);
  if (pv !== 2) fehler("Verkauf: Provision nicht gebucht (" + pv + ")");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "verkaeufe.png"), fullPage: true });
  await page.click('[data-pausz="fl-1"]');
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(300);
  const offen = await page.evaluate(() => window.__FAKE.tabellen.provisionen.filter((p) => p.status === "offen").length);
  if (offen !== 0) fehler("Provision: ausgezahlt nicht gespeichert");
  if (konsole.length) fehler("Verkäufe: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4g) Team und Fahrzeuge (Leitung)
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "ad-1", hash: "#team", breite: 1920, hoehe: 1080 });
  await page.click('[data-sperren="fl-3"]');
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(300);
  const fl3 = await page.evaluate(() => window.__FAKE.tabellen.profiles.find((p) => p.id === "fl-3"));
  if (fl3.aktiv !== false) fehler("Team: Sperren nicht gespeichert");
  await page.goto(page.url().split("#")[0] + "#flotte");
  await page.waitForTimeout(300);
  await page.click("#fzNeu");
  await page.fill("dialog input[name=name]", "Test-Lkw");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(300);
  const fz = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_fahrzeuge.find((f) => f.name === "Test-Lkw"));
  if (!fz) fehler("Flotte: Fahrzeug nicht angelegt");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "flotte.png"), fullPage: true });
  if (konsole.length) fehler("Team/Flotte: Konsole: " + konsole.join(" | "));
  await ctx.close();
}
{
  const { page, ctx } = await oeffne({ nutzer: "bu-1", hash: "#team" });
  if (await page.isVisible("#tNeuFl")) fehler("Team: Büro darf keine Fahrlehrer anlegen");
  await ctx.close();
}

// 4k) PIN je Büro-Person (13.10.2026): Namen antippen, PIN, falsche PIN, Sperre, erste PIN, Wechsel, Sperren, Verwalten
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#heute", breite: 1366, hoehe: 900, wer: null });
  if (!(await page.isVisible("#wer:not([hidden])"))) fehler("PIN: Büro wird nicht nach der Person gefragt");
  if (await page.isVisible("#werAnderer, #werName")) fehler("PIN: frei getippter Name ist noch möglich");
  const kacheln = await page.$$eval("#werListe button", (b) => b.map((x) => x.textContent.trim()));
  if (kacheln.length !== 4 || !kacheln.some((t) => t.includes("Isra") && t.includes("PIN festlegen"))) fehler("PIN: Namenskacheln falsch " + JSON.stringify(kacheln));
  if (!(await page.evaluate(() => document.getElementById("app").inert))) fehler("PIN: Seite hinter dem PIN-Fenster ist bedienbar");
  // Doppelklick auf den Namen tippt keine Ziffer mit
  await page.dblclick('#werListe button:has-text("Kristina")'); await page.waitForTimeout(150);
  if ((await page.$$eval("#pinPunkte .voll", (x) => x.length)) !== 0) fehler("PIN: Doppelklick auf den Namen gibt eine Ziffer ein");
  await page.keyboard.press("Escape");
  await pruefeLayout(page, "PIN Namen");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pin-namen.png") });
  // Falsche PIN: Hinweis mit Restversuchen, Seite bleibt gesperrt
  await page.click('#werListe button:has-text("Kristina")');
  await page.waitForTimeout(100);
  if (!(await page.isVisible("#werPin"))) fehler("PIN: Ziffernfeld erscheint nicht");
  await pruefeLayout(page, "PIN Ziffernfeld");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pin-ziffern.png") });
  await page.waitForTimeout(400); // Schutz gegen Doppelklick: Ziffern-Klicks erst nach 0,4 s
  for (const z of "1357") await page.click(`#pinFeld [data-ziffer="${z}"]`);
  await page.waitForTimeout(150);
  let t = await page.textContent("#pinFehler");
  if (!/Noch 4 Versuche/.test(t)) fehler("PIN: falsche PIN ohne Hinweis: " + t);
  if (await page.evaluate(() => !!S.sitzung)) fehler("PIN: falsche PIN meldet trotzdem an");
  // Löschtaste und Zurück
  await page.keyboard.type("48"); await page.keyboard.press("Backspace");
  if ((await page.$$eval("#pinPunkte .voll", (x) => x.length)) !== 1) fehler("PIN: Löschtaste geht nicht");
  await page.keyboard.press("Escape");
  if (!(await page.isVisible("#werNamen"))) fehler("PIN: Esc führt nicht zurück zu den Namen");
  // Richtige PIN
  await meldePinAn(page, "Kristina");
  if (await page.isVisible("#wer:not([hidden])")) fehler("PIN: richtige PIN öffnet nicht");
  if (await page.evaluate(() => document.getElementById("app").inert)) fehler("PIN: Seite bleibt nach der Anmeldung gesperrt");
  if ((await page.textContent("#werAnzeige")) !== "Kristina" || (await page.textContent("#nutzerName")) !== "Kristina") fehler("PIN: Name in der Seitenleiste fehlt");
  if ((await page.textContent("#kopfWer")) !== "🔒 Sperren") fehler("PIN: Sperren-Knopf oben fehlt");
  // Kristina darf nicht verwalten
  await page.goto(page.url().split("#")[0] + "#team"); await page.waitForTimeout(300);
  if (await page.isVisible("#pNeu, [data-preset]")) fehler("PIN: Kristina sieht Verwalten-Knöpfe");
  // Wechseln mit Abbrechen
  await page.click("#werWechseln");
  if (!(await page.isVisible("#werZu"))) fehler("PIN: kein Abbrechen beim Wechseln");
  await page.click("#werZu");
  if (await page.isVisible("#wer:not([hidden])")) fehler("PIN: Abbrechen schließt nicht");
  await page.click("#werWechseln"); await page.keyboard.press("Escape");
  if (await page.isVisible("#wer:not([hidden])")) fehler("PIN: Esc schließt nicht");
  // Wechsel zu Jelena: alte Sitzung endet, Jelena darf verwalten
  const altTok = await page.evaluate(() => S.sitzung.token);
  await page.click("#werWechseln");
  await meldePinAn(page, "Jelena");
  const w = await page.evaluate((a) => ({ name: S.sitzung && S.sitzung.name, alt: !!window.__FAKE.sitzungen[a] }), altTok);
  if (w.name !== "Jelena" || w.alt) fehler("PIN: Wechsel falsch " + JSON.stringify(w));
  await page.waitForTimeout(200);
  if (!(await page.isVisible("#pNeu"))) fehler("PIN: Jelena sieht „+ Person“ nicht");
  await pruefeLayout(page, "Team mit Personen");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "pin-team.png"), fullPage: true });
  // Person anlegen (doppelter Name wird abgelehnt)
  await page.click("#pNeu"); await page.fill("dialog input[name=name]", "kristina"); await page.click("dialog button[value=ok]"); await page.waitForTimeout(200);
  if (!(await page.isVisible("dialog[open]"))) fehler("PIN: doppelter Name wurde angenommen");
  await page.fill("dialog input[name=name]", "Testperson"); await page.click("dialog button[value=ok]"); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => S.personen.some((p) => p.name === "Testperson")))) fehler("PIN: Person nicht angelegt");
  if (await page.isVisible("dialog input[name=verwalten]")) fehler("PIN: Büro-Person darf Verwalten-Recht vergeben");
  // Neue Person ohne Freigabe kann keine PIN festlegen (sonst könnte jeder sie übernehmen)
  await page.click("#werWechseln"); await page.click('#werListe button:has-text("Testperson")'); await page.waitForTimeout(100);
  await page.keyboard.type("3817"); await page.waitForTimeout(150);
  if (!/noch keine PIN/.test(await page.textContent("#pinFehler")) || (await page.$$eval("#pinPunkte .voll", (x) => x.length)) !== 0) fehler("PIN: Person ohne Freigabe kann PIN festlegen");
  await page.keyboard.press("Escape"); await page.click("#werZu");
  // PIN von Kristina zurücksetzen
  await page.click(`[data-preset="bp-3"]`); await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(300);
  if (await page.evaluate(() => window.__FAKE.tabellen.buero_personen.find((p) => p.id === "bp-3").hat_pin)) fehler("PIN: Zurücksetzen wirkt nicht");
  // Sperren: Sitzung endet, Namen erscheinen ohne Abbrechen
  await page.click("#werSperren"); await page.waitForTimeout(150);
  if (!(await page.isVisible("#werNamen")) || (await page.isVisible("#werZu")) || (await page.evaluate(() => !!S.sitzung))) fehler("PIN: Sperren geht nicht");
  // Isra: erste PIN festlegen (zu einfach → abgelehnt, verschieden → von vorn, dann gespeichert)
  await page.click('#werListe button:has-text("Isra")');
  await page.keyboard.type("1234"); await page.waitForTimeout(100);
  if (!/zu leicht/.test(await page.textContent("#pinFehler"))) fehler("PIN: 1234 wird als erste PIN angenommen");
  await page.keyboard.type("3817"); await page.waitForTimeout(100);
  if (!/noch einmal/.test(await page.textContent("#pinHinweis"))) fehler("PIN: keine Bestätigung der ersten PIN");
  await page.keyboard.type("3818"); await page.waitForTimeout(150);
  if (!/verschieden/.test(await page.textContent("#pinFehler"))) fehler("PIN: verschiedene Eingaben nicht erkannt");
  await page.keyboard.type("3817"); await page.keyboard.type("3817"); await page.waitForTimeout(200);
  const isra = await page.evaluate(() => ({ s: S.sitzung && S.sitzung.name, pin: window.__FAKE.tabellen.buero_personen.find((p) => p.id === "bp-4")._pin }));
  if (isra.s !== "Isra" || isra.pin !== "3817") fehler("PIN: erste PIN nicht gespeichert " + JSON.stringify(isra));
  // Eigene PIN ändern, mit Abbrechen
  await page.click("#werPinAendern");
  if (!(await page.isVisible("#werPin"))) fehler("PIN ändern: Feld fehlt");
  await page.click("#pinZurueck");
  if (await page.isVisible("#wer:not([hidden])")) fehler("PIN ändern: Abbrechen geht nicht");
  await page.click("#werPinAendern");
  await page.keyboard.type("5096"); await page.keyboard.type("5096"); await page.waitForTimeout(200);
  if (await page.evaluate(() => window.__FAKE.tabellen.buero_personen.find((p) => p.id === "bp-4")._pin) !== "5096") fehler("PIN ändern: nicht gespeichert");
  // 5 falsche Versuche → gesperrt, auch die richtige PIN geht dann nicht
  await page.click("#werSperren"); await page.waitForTimeout(100);
  await page.click('#werListe button:has-text("Murat")');
  for (let i = 0; i < 5; i++) { await page.keyboard.type("0" + (i + 1) + "00"); await page.waitForTimeout(80); }
  t = await page.textContent("#pinFehler");
  if (!/gesperrt bis/.test(t) || !/Jelena/.test(t) || /Murat/.test(t) || !(await page.evaluate(() => document.getElementById("werPin").classList.contains("pin-gesperrt")))) fehler("PIN: Sperre nach 5 Versuchen fehlt: " + t);
  await page.keyboard.type(TEST_PIN.Murat); await page.waitForTimeout(150);
  if (await page.evaluate(() => !!S.sitzung)) fehler("PIN: gesperrte Person kommt trotzdem rein");
  // Leerlauf: nach 20 Minuten endet die Sitzung von selbst
  await page.keyboard.press("Escape");
  await meldePinAn(page, "Jelena");
  await page.evaluate(() => { letzteAktion = Date.now() - 21 * 60 * 1000; });
  await page.waitForTimeout(31000);
  if (!(await page.isVisible("#werNamen")) || (await page.evaluate(() => !!S.sitzung))) fehler("PIN: Leerlauf beendet die Sitzung nicht");
  // Leerlauf auch bei offen gelassenem „Wechseln“ (Fund Richter 14.10.2026)
  await meldePinAn(page, "Jelena");
  await page.click("#werWechseln");
  await page.evaluate(() => { letzteAktion = Date.now() - 21 * 60 * 1000; });
  await page.waitForTimeout(31000);
  if ((await page.isVisible("#werZu")) || (await page.evaluate(() => !!S.sitzung))) fehler("PIN: offenes „Wechseln“ verhindert das Ende nach 20 Minuten");
  if (konsole.length) fehler("PIN: Konsole: " + konsole.join(" | "));
  await ctx.close();
}
// 4l) Aufgaben der Büroleute untereinander (13.10.2026): an eine Person, Fälligkeit, dringend, Hinweis nach der PIN
{
  const gestern = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#heute", breite: 1366, hoehe: 900, wer: "Jelena", vorbereiten: function () {
    const g = new Date(); g.setDate(g.getDate() - 1);
    F.tabellen.schueler_aufgaben = [
      { id: "ag-1", fahrschule_id: "fs-test-1", schueler_id: null, text: "Rechnung Werkstatt anrufen", heute: false, faellig_am: g.toISOString().slice(0, 10), fuer_person_id: "bp-3", von_person_id: "bp-1", dringend: false, erstellt_am: new Date().toISOString() },
      { id: "ag-2", fahrschule_id: "fs-test-1", schueler_id: null, text: "Ordner sortieren", heute: false, faellig_am: null, fuer_person_id: null, von_person_id: "bp-2", dringend: false, erstellt_am: new Date().toISOString() },
      { id: "ag-3", fahrschule_id: "fs-test-1", schueler_id: null, text: "Nur für Murat", heute: false, faellig_am: null, fuer_person_id: "bp-2", von_person_id: "bp-1", dringend: false, erstellt_am: new Date().toISOString() },
    ];
  } });
  // Jelena schickt Kristina eine dringende Aufgabe für heute
  await page.click("#agNeu");
  await page.fill("dialog textarea[name=text]", "Mutter von Lena zurückrufen");
  await page.selectOption("dialog select[name=fuer]", "bp-3");
  await page.fill("dialog input[name=faellig]", HEUTE);
  await page.check("dialog input[name=dringend]");
  await pruefeLayout(page, "Neue Aufgabe");
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(300);
  const neu = await page.evaluate(() => window.__FAKE.tabellen.schueler_aufgaben.find((a) => a.text === "Mutter von Lena zurückrufen"));
  if (!neu || neu.fuer_person_id !== "bp-3" || !neu.dringend || neu.von_person_id !== "bp-1" || neu.schueler_id !== null) fehler("Aufgabe an Kollegin falsch gespeichert: " + JSON.stringify(neu));
  // Jelena sieht sie unter „Von dir vergeben“ als „noch nicht gelesen“, nicht in ihrer eigenen Liste
  let t = await page.textContent(".fuer-dich");
  if (!/noch nicht gelesen/.test(t)) fehler("Aufgaben: „noch nicht gelesen“ fehlt bei der Absenderin");
  if (/Nur für Murat/.test((await page.$$eval(".fuer-dich > .notizliste li", (l) => l.map((x) => x.textContent))).join("|"))) fehler("Aufgaben: fremde Aufgabe in „Für mich“");
  // Kristina meldet sich an: Hinweis-Fenster mit beiden Aufgaben, dringend/überfällig rot
  await page.click("#werWechseln"); await meldePinAn(page, "Kristina"); await page.waitForTimeout(250);
  if (!(await page.isVisible("dialog[open]")) || !/2 neue Aufgaben/.test(await page.textContent("dialog[open]"))) fehler("Aufgaben: kein Hinweis-Fenster nach der PIN");
  await pruefeLayout(page, "Hinweis neue Aufgaben");
  if (await page.$("dialog[open] [data-hagschueler]")) fehler("Aufgaben: Hinweis-Fenster hat einen Knopf ohne Wirkung");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "aufgaben-hinweis.png") });
  await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(250);
  const gel = await page.evaluate(() => window.__FAKE.tabellen.schueler_aufgaben.filter((a) => a.gelesen_am).map((a) => a.id).sort().join());
  if (!/ag-1/.test(gel) || gel.split(",").length !== 2) fehler("Aufgaben: „Gelesen“ nicht gespeichert " + gel);
  const zeilen = await page.$$eval(".fuer-dich > .notizliste li", (l) => l.map((x) => x.className.split(" ").pop() + ":" + x.querySelector(".notiz-text").textContent));
  if (zeilen.length !== 3 || !zeilen[0].startsWith("rot") || !zeilen[1].startsWith("rot") || !zeilen[2].includes("Ordner")) fehler("Aufgaben: Reihenfolge/Farbe falsch " + JSON.stringify(zeilen));
  if ((await page.$$eval(".nav-punkt[href='#heute'] .zahl, a[href='#heute'] .zahl", (z) => z.map((x) => x.textContent).join())) !== "3") fehler("Aufgaben: Zahl in der Seitenleiste ≠ sichtbare Liste");
  if (!/für dich \(3\)/.test(await page.textContent(".fuer-dich h2"))) fehler("Aufgaben: Zahl in der Überschrift ≠ sichtbare Liste");
  await pruefeLayout(page, "Für dich");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "aufgaben-heute.png"), fullPage: true });
  // Erledigen
  await page.click(".fuer-dich [data-hagerledigt] >> nth=0"); await page.waitForTimeout(300);
  if ((await page.$$(".fuer-dich > .notizliste li")).length !== 2) fehler("Aufgaben: Erledigt entfernt die Aufgabe nicht");
  // Endprüfung 14.10.: versehentlich erledigt → unter „Kürzlich erledigt“ wieder öffnen
  await page.click(".fuer-dich details summary:has-text('Kürzlich erledigt')"); await page.waitForTimeout(150);
  await page.click(".fuer-dich [data-hagoeffnen] >> nth=0"); await page.waitForTimeout(300);
  if ((await page.$$(".fuer-dich > .notizliste li")).length !== 3) fehler("Aufgaben: „Wieder öffnen“ bringt die Aufgabe nicht zurück");
  await page.click(".fuer-dich [data-hagerledigt] >> nth=0"); await page.waitForTimeout(300);
  // Alle offenen
  await page.click('.fuer-dich a.tab[href="#heute?alle=1"]'); await page.waitForTimeout(250);
  if (!/Nur für Murat/.test(await page.textContent(".fuer-dich"))) fehler("Aufgaben: „Alle offenen“ zeigt nicht alle");
  if (konsole.length) fehler("Aufgaben: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4m) Prüfungsergebnisse eintragen (13.10.2026): Haken je Prüfung, landet in der Akte, Rückgängig, Korrektur
{
  const gestern = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#pruefungen?ansicht=ergebnis", breite: 1366, hoehe: 900, vorbereiten: function () {
    const h = new Date().toISOString().slice(0, 10), g = new Date(); g.setDate(g.getDate() - 1);
    F.tabellen.pruefungstermine.push(
      { id: "pt-6", fahrschule_id: "fs-test-1", schueler_id: "s11", fahrlehrer_id: "fl-1", art: "theorie", klasse: "B", datum: h, von: "08:00", status: "geplant" },
      { id: "pt-7", fahrschule_id: "fs-test-1", schueler_id: "s12", fahrlehrer_id: "fl-2", art: "praxis", klasse: "B", datum: g.toISOString().slice(0, 10), von: "11:00", status: "geplant" });
  } });
  const zeilen = await page.$$("[data-eja]");
  if (zeilen.length !== 3) fehler("Ergebnisse: erwartet 3 offene Prüfungen, gefunden " + zeilen.length);
  await pruefeLayout(page, "Ergebnisse eintragen");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "ergebnisse.png"), fullPage: true });
  const schueler = (id) => page.evaluate((i) => Object.assign({}, window.__FAKE.tabellen.schueler.find((x) => x.id === i)), id);
  const vorher = (await schueler("s11")).theorie_bestanden_am || null;
  await page.click('[data-eja="pt-6"]'); await page.waitForTimeout(300);
  if ((await schueler("s11")).theorie_bestanden_am !== HEUTE) fehler("Ergebnisse: Theorie bestanden nicht in der Akte");
  if (!(await page.isVisible('[data-erueck="pt-6"]'))) fehler("Ergebnisse: kein Rückgängig");
  await page.click('[data-erueck="pt-6"]'); await page.waitForTimeout(300);
  const pt6 = await page.evaluate(() => window.__FAKE.tabellen.pruefungstermine.find((p) => p.id === "pt-6").status);
  if (pt6 !== "geplant" || ((await schueler("s11")).theorie_bestanden_am || null) !== vorher) fehler("Ergebnisse: Rückgängig stellt nicht wieder her");
  await page.click('[data-enein="pt-7"]'); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => (window.__FAKE.tabellen.schueler_aufgaben || []).some((a) => a.schueler_id === "s12" && /Praxisprüfung planen/.test(a.text))))) fehler("Ergebnisse: keine Aufgabe „Neuen Termin planen“");
  await page.click('[data-eja="pt-4"]'); await page.waitForTimeout(300);
  const s8 = await schueler("s8");
  if (s8.praxis_bestanden_am !== gestern || s8.reakt_status !== "befreit") fehler("Ergebnisse: Praxis bestanden nicht in der Akte " + JSON.stringify([s8.praxis_bestanden_am, s8.reakt_status]));
  if (!(await page.isVisible('[data-earchiv="s8"]'))) fehler("Ergebnisse: „Ins Archiv“ fehlt");
  // Korrektur über „Bearbeiten“: bestanden → nicht bestanden nimmt das Datum aus der Akte
  await page.goto(page.url().split("#")[0] + "#pruefungen?ansicht=vergangen"); await page.waitForTimeout(300);
  await page.click('[data-pbearb="pt-4"] >> nth=0');
  await page.selectOption("dialog select[name=status]", "nicht_bestanden");
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(300);
  if ((await schueler("s8")).praxis_bestanden_am) fehler("Ergebnisse: Korrektur ändert die Akte nicht");
  // Akte zeigt die Prüfungen
  await page.evaluate(() => schuelerDialog("s8")); await page.waitForTimeout(200);
  const akte = await page.textContent("dialog[open]");
  if (!/Prüfungen/.test(akte) || !/Versuche: Theorie \d+, Praxis \d+/.test(akte)) fehler("Akte: Prüfungsblock fehlt");
  await pruefeLayout(page, "Akte mit Prüfungen");
  if (konsole.length) fehler("Ergebnisse: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4n) Zahlen zum Anklicken (13.10.2026): Balken → Detailseite mit Namen, Filter, Zurück
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#zahlen", breite: 1366, hoehe: 900 });
  const balken = await page.$$(".d-punkt.klickbar");
  if (balken.length < 12) fehler("Zahlen: Balken sind nicht anklickbar (" + balken.length + ")");
  await pruefeLayout(page, "Zahlen mit Filtern");
  // Anmeldungen: letzter Balken mit Wert
  const ziel = await page.$$eval(".diagramm >> nth=0", () => null).catch(() => null);
  const links = await page.$$eval(".d-punkt.klickbar", (g) => g.map((x) => x.dataset.link));
  const anmLink = links.find((l) => /liste=anmeldungen/.test(l));
  await page.evaluate((l) => { document.querySelector(`.d-punkt[data-link="${l}"]`).dispatchEvent(new MouseEvent("click", { bubbles: true })); }, anmLink);
  await page.waitForTimeout(300);
  if (!/liste=anmeldungen/.test(page.url()) || !(await page.isVisible("text=← Zurück zu Zahlen"))) fehler("Zahlen: Klick auf Balken öffnet keine Detailseite");
  await pruefeLayout(page, "Zahlen Anmeldungen");
  // Praxis-Quote über die Kachel
  await page.goto(page.url().split("#")[0] + "#zahlen"); await page.waitForTimeout(250);
  await page.click('a.kachel[href*="liste=praxis"]'); await page.waitForTimeout(300);
  const txt = await page.textContent("#ansicht");
  if (!/Praxisprüfungen/.test(txt) || !/bestanden/.test(txt) || !/Je Fahrlehrer/.test(txt)) fehler("Zahlen: Detailseite Praxis unvollständig");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "zahlen-praxis.png"), fullPage: true });
  await pruefeLayout(page, "Zahlen Praxis");
  // Name anklicken öffnet die Akte
  const n = await page.$("[data-zschueler]");
  if (n) { await n.click(); await page.waitForTimeout(200); if (!(await page.isVisible("dialog[open]"))) fehler("Zahlen: Name öffnet die Akte nicht"); await page.keyboard.press("Escape"); }
  // Zurück und Filter
  await page.click("text=← Zurück zu Zahlen"); await page.waitForTimeout(250);
  if (/liste=/.test(page.url())) fehler("Zahlen: Zurück geht nicht");
  await page.selectOption("#zKlasse", "CE"); await page.waitForTimeout(250);
  if (!/klasse=CE/.test(page.url())) fehler("Zahlen: Filter Klasse wirkt nicht");
  await page.click('a.kachel[href*="liste=anmeldungen"]'); await page.waitForTimeout(250);
  const klassen = await page.$$eval("#ansicht tbody tr td:nth-child(3)", (t) => [...new Set(t.map((x) => x.textContent.trim()))]);
  if (klassen.some((k) => k !== "CE")) fehler("Zahlen: Filter Klasse gilt nicht auf der Detailseite " + klassen.join());
  // Auslastung: Balken je Fahrlehrer
  await page.goto(page.url().split("#")[0] + "#zahlen"); await page.waitForTimeout(250);
  await page.click(".hb-zeile.klickbar >> nth=0"); await page.waitForTimeout(250);
  if (!/liste=ue/.test(page.url()) || !/Unterrichtseinheiten/.test(await page.textContent("#ansicht"))) fehler("Zahlen: Auslastung öffnet keine Termine");
  if (konsole.length) fehler("Zahlen: Konsole: " + konsole.join(" | "));
  await ctx.close();
}
// Endprüfung 14.10.: Kachel UE mit Fahrlehrer-Filter = Detailseite, auch bei zwei Prüfungsterminen am selben Tag; Druck mit Namen; falscher Monat
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#zahlen?lehrer=fl-1", vorbereiten: function () {
    const h = new Date().toISOString().slice(0, 10), sid = F.tabellen.schueler.find((x) => x.fahrlehrer_id === "fl-1").id;
    F.tabellen.kalender_termine.push({ id: "pd1", fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: sid, datum: h, von: "06:00", bis: "06:45", art: "pruefung", status: "geplant", geloescht: false, payload: {} },
      { id: "pd2", fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: sid, datum: h, von: "06:45", bis: "07:30", art: "pruefung", status: "geplant", geloescht: false, payload: {} });
  } });
  const ueKachel = (await page.textContent('a.kachel[href*="liste=ue"] .wert')).trim();
  await page.click('a.kachel[href*="liste=ue"]'); await page.waitForTimeout(300);
  const ueDetail = ((await page.textContent("#ansicht h2")).match(/\(([\d.,]+) UE\)/) || [])[1] || "";
  if (ueDetail.replace(/,0$/, "") !== ueKachel) fehler(`Zahlen: UE-Kachel ${ueKachel} ≠ Detailseite ${ueDetail} (Fahrlehrer-Filter/doppelte Prüfung)`);
  await page.emulateMedia({ media: "print" });
  if (!(await page.isVisible("#ansicht .namenknopf >> nth=0"))) fehler("Zahlen: im Druck fehlen die Schülernamen");
  await page.emulateMedia({ media: "screen" });
  await page.goto(page.url().split("#")[0] + "#zahlen?liste=praxis&monat=quark"); await page.waitForTimeout(250);
  if (/Invalid/.test(await page.textContent("#ansicht"))) fehler("Zahlen: ungültiger Monat zeigt „Invalid Date“");
  if (konsole.length) fehler("Zahlen: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// Schritt 1+2 (14.10.2026): Behörde (Bewerbernummer, Theorie-Frist, Sehhilfe, Vorbesitz) und Umschreiber (ausländischer Führerschein)
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#schueler", breite: 1366, hoehe: 900 });
  const sx = (id) => page.evaluate((i) => window.__FAKE.tabellen.schueler.find((x) => x.id === i), id);
  await page.evaluate(() => schuelerDialog("s7")); await page.waitForTimeout(200);
  await page.fill("dialog[open] input[name=bewerbernummer]", "RL 4711-08");
  await page.selectOption("dialog[open] select[name=sehhilfe]", "ja");
  await page.check('dialog[open] input[name=vorbesitz][value="B"]');
  const frist = await page.evaluate(() => KR.addDaysISO(KR.todayISO(), 20));
  await page.fill("dialog[open] input[name=theorie_frist_bis]", frist);
  if (!(await page.isHidden("dialog[open] #umschreiberFeld"))) fehler("Umschreiber-Feld ist sichtbar, obwohl keine Umschreibung");
  await page.selectOption("dialog[open] select[name=ausbildungsart]", "umschreibung"); await page.waitForTimeout(100);
  if (await page.isHidden("dialog[open] #umschreiberFeld")) fehler("Umschreiber-Feld erscheint nicht bei Umschreibung");
  await page.fill('dialog[open] .afs-zeile [data-afs="land"]', "Syrien");
  await page.fill('dialog[open] .afs-zeile [data-afs="klasse"]', "B");
  await page.fill('dialog[open] .afs-zeile [data-afs="nummer"]', "SY-123456");
  const wohnsitz = await page.evaluate(() => KR.addDaysISO(KR.todayISO(), -170));
  await page.fill("dialog[open] input[name=wohnsitz_de_seit]", wohnsitz); await page.waitForTimeout(100);
  const hinweis = await page.textContent("#afsHinweis");
  if (!/nur noch bis/.test(hinweis)) fehler("Umschreiber: Hinweis zur 6-Monats-Frist fehlt: " + hinweis);
  await page.click("#afsNeu"); await page.fill('dialog[open] .afs-zeile >> nth=1 >> [data-afs="land"]', "Türkei");
  await pruefeLayout(page, "Schüler mit Behörde und Umschreiber");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "schueler-behoerde.png"), fullPage: true });
  await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(400);
  const s7 = await sx("s7");
  if (s7.bewerbernummer !== "RL 4711-08" || s7.sehhilfe !== true || JSON.stringify(s7.vorbesitz) !== '["B"]' || s7.theorie_frist_bis !== frist) fehler("Behörde: nicht gespeichert " + JSON.stringify({ b: s7.bewerbernummer, s: s7.sehhilfe, v: s7.vorbesitz, f: s7.theorie_frist_bis }));
  if (!Array.isArray(s7.auslands_fs) || s7.auslands_fs.length !== 2 || s7.auslands_fs[0].nummer !== "SY-123456" || s7.wohnsitz_de_seit !== wohnsitz) fehler("Umschreiber: nicht gespeichert " + JSON.stringify(s7.auslands_fs));
  // Fristen: Umschreiber-Ansicht und Theorie-Frist
  await page.goto(page.url().split("#")[0] + "#fristen?ansicht=umschreiber"); await page.waitForTimeout(300);
  const um = await page.textContent("#ansicht");
  if (!/Syrien/.test(um) || !/darf bald nicht mehr fahren/.test(um)) fehler("Fristen: Umschreiber-Ansicht zeigt die Frist nicht");
  await pruefeLayout(page, "Fristen Umschreiber");
  await page.goto(page.url().split("#")[0] + "#fristen?ansicht=antrag"); await page.waitForTimeout(300);
  if (!/Behörden-Frist Theorie bald/.test(await page.textContent("#ansicht"))) fehler("Fristen: Theorie-Frist fehlt in „Antrag & Behörden-Frist“");
  await page.goto(page.url().split("#")[0] + "#heute"); await page.waitForTimeout(300);
  if (await page.$("dialog[open] button[value=ok]")) { await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(200); }
  const heuteTxt = await page.textContent("#ansicht");
  if (!/Theorie-Frist/.test(heuteTxt) || !/Umschreiber/.test(heuteTxt)) fehler("Heute: Warnung Theorie-Frist/Umschreiber fehlt");
  // Suche nach Bewerbernummer
  await page.goto(page.url().split("#")[0] + "#schueler"); await page.waitForTimeout(300);
  await page.fill("#sSuche", "4711"); await page.waitForTimeout(500);
  if (!(await page.textContent("#ansicht")).includes((await sx("s7")).name)) fehler("Suche nach Bewerbernummer findet den Schüler nicht");
  // Richter R1: „noch nicht bekannt“ → „nein“ wird gespeichert (nein ist nicht dasselbe wie unbekannt)
  await page.evaluate(() => { for (const x of [window.__FAKE.tabellen.schueler.find((y) => y.id === "s7"), S.schueler.find((y) => y.id === "s7")]) x.sehhilfe = null; });
  await page.evaluate(() => schuelerDialog("s7")); await page.waitForTimeout(200);
  await page.selectOption("dialog[open] select[name=sehhilfe]", "nein");
  await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(400);
  if ((await sx("s7")).sehhilfe !== false) fehler("Sehhilfe: „nein“ nach „noch nicht bekannt“ nicht gespeichert: " + (await sx("s7")).sehhilfe);
  // Richter R2: Die Datenbank liefert jsonb-Schlüssel in eigener Reihenfolge. Ein Führerschein, den die App inzwischen
  // ergänzt hat, darf beim Speichern einer anderen Angabe (Telefon) nicht verloren gehen.
  await page.evaluate(() => { const afs = () => [{ land: "Syrien", klasse: "B", nummer: "SY-1", behoerde: "Damaskus", erteilt_am: "2020-01-01" }];
    for (const x of [window.__FAKE.tabellen.schueler.find((y) => y.id === "s7"), S.schueler.find((y) => y.id === "s7")]) x.auslands_fs = afs(); });
  await page.evaluate(() => schuelerDialog("s7")); await page.waitForTimeout(200);
  await page.evaluate(() => window.__FAKE.tabellen.schueler.find((y) => y.id === "s7").auslands_fs.push({ land: "Türkei", klasse: "B" }));
  await page.fill("dialog[open] input[name=telefon]", "0170 5550001");
  await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(400);
  if (((await sx("s7")).auslands_fs || []).length !== 2) fehler("Umschreiber: Führerschein aus der App ging beim Speichern verloren " + JSON.stringify((await sx("s7")).auslands_fs));
  if (konsole.length) fehler("Behörde: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// Schritt 3 (14.10.2026): Theorie-Besuch – Stand in der Akte, Filter, Anwesenheit im Theorie-Termin, Druck, Hinweis bei Theorieprüfung
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#schueler", breite: 1366, hoehe: 900, vorbereiten: function () {
    const h = new Date(); h.setDate(h.getDate() - 3); const d = h.toISOString().slice(0, 10);
    F.tabellen.kalender_termine.push({ id: "th-1", fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: null, datum: d, von: "18:00", bis: "19:30", art: "theorie", status: "geplant", geloescht: false, payload: { lektion: 7 } });
  } });
  await page.evaluate(() => schuelerDialog("s1")); await page.waitForTimeout(200);
  const akte = await page.textContent("dialog[open]");
  if (!/Theorieunterricht/.test(akte) || !/13\/14/.test(akte) || !/fehlt: 14/.test(akte)) fehler("Theorie: Akte zeigt 13/14 und „fehlt: 14“ nicht");
  await pruefeLayout(page, "Akte mit Theorie-Besuch");
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  await page.goto(page.url().split("#")[0] + "#schueler?notiz=theorie"); await page.waitForTimeout(300);
  const liste = await page.textContent("#ansicht");
  const s2 = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((x) => x.id === "s2").name);
  if (!liste.includes(s2)) fehler("Theorie: Filter „Theorie noch nicht vollständig“ zeigt den Schüler nicht");
  // Theorie-Termin: Anwesenheit und Druck
  await page.evaluate(() => terminDialog("th-1")); await page.waitForTimeout(200);
  const td = await page.textContent("dialog[open]");
  if (!/Anwesenheit · 1 Teilnehmer/.test(td) || !td.includes(s2) || !/Lektion 7 \+ 8/.test(td)) fehler("Theorie: Termin zeigt die Anwesenheit nicht: " + td.slice(0, 160));
  const gedruckt = await page.evaluate(() => { let html = ""; const alt = window.open; window.open = () => ({ document: { write: (x) => { html += x; }, close() {} }, focus() {}, print() {} }); document.querySelector("dialog[open] [data-anwdruck]").click(); window.open = alt; return html; });
  if (!gedruckt.includes(s2) || !/Unterschrift/.test(gedruckt)) fehler("Theorie: Druckliste unvollständig");
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  // Theorieprüfung planen für s2 (2/14) → Hinweis
  await page.evaluate(() => pruefungDialog(null)); await page.waitForTimeout(200);
  await page.selectOption("dialog[open] select[name=schueler_id]", "s2");
  await page.selectOption("dialog[open] select[name=art]", "theorie"); await page.waitForTimeout(100);
  if (!/erst 2 von 14/.test(await page.textContent("#pTheorieHinweis"))) fehler("Theorie: Hinweis bei Theorieprüfung fehlt");
  await page.keyboard.press("Escape");
  if (konsole.length) fehler("Theorie: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// Endprüfung 14.10.: Korrektur einer bestandenen Praxisprüfung über „Bearbeiten“ räumt die Akte auf (auch Status + Datum zugleich)
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#pruefungen?ansicht=alle", wer: "Jelena", vorbereiten: function () {
    const pt = F.tabellen.pruefungstermine.find((x) => x.id === "pt-5"); const s = F.tabellen.schueler.find((x) => x.id === "s9");
    const [j, m, t] = pt.datum.split("-"); s.praxis_bestanden_am = pt.datum; s.reakt_status = "befreit"; s.reakt_notiz = `Praxisprüfung bestanden am ${t}.${m}.${j}`;
  } });
  if (await page.$("dialog[open] button[value=ok]")) { await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(250); }
  const s9 = () => page.evaluate(() => { const s = window.__FAKE.tabellen.schueler.find((x) => x.id === "s9"); return { pb: s.praxis_bestanden_am || null, rs: s.reakt_status }; });
  const offen = () => page.evaluate(() => window.__FAKE.tabellen.schueler_aufgaben.filter((a) => a.schueler_id === "s9" && !a.erledigt_am && /Neuen Termin/.test(a.text)).length);
  const bearbeite = async (status, datum) => {
    await page.evaluate(() => pruefungDialog("pt-5")); await page.waitForTimeout(200);
    if (datum) await page.fill("dialog[open] input[name=datum]", datum);
    if (status) await page.selectOption("dialog[open] select[name=status]", status);
    await page.click("dialog[open] button[value=ok]"); await page.waitForTimeout(400);
  };
  await bearbeite("nicht_bestanden");
  let z = await s9();
  if (z.pb || z.rs !== "pruefen" || (await offen()) !== 1) fehler("Korrektur bestanden→nicht: " + JSON.stringify(z) + " Aufgaben " + (await offen()));
  await bearbeite("bestanden");
  z = await s9();
  if (!z.pb || z.rs !== "befreit" || (await offen()) !== 0) fehler("Korrektur nicht→bestanden: " + JSON.stringify(z) + " Aufgaben " + (await offen()));
  const d1 = await page.evaluate(() => KR.addDaysISO(KR.todayISO(), -5));
  await bearbeite(null, d1);
  if ((await s9()).pb !== d1) fehler("Korrektur Datum zieht nicht mit: " + JSON.stringify(await s9()));
  await bearbeite("nicht_bestanden", await page.evaluate(() => KR.addDaysISO(KR.todayISO(), -4)));
  z = await s9();
  if (z.pb || z.rs !== "pruefen") fehler("Korrektur Status + Datum zugleich lässt „bestanden“ stehen: " + JSON.stringify(z));
  if (konsole.length) fehler("Korrektur: Konsole: " + konsole.join(" | "));
  await ctx.close();
}

// 4o) Gabriel und Lkw-Klassen (13.10.2026): Fahrlehrer ohne App, Klassen je Fahrlehrer, Lkw-Fahrzeuge
{
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", hash: "#team", breite: 1366, hoehe: 900, wer: "Jelena", vorbereiten: function () {
    F.functions = F.functions || {};
    F.functions["admin-create-account"] = (b) => {
      F.letzteAnlage = b;
      if (b.ohne_app) { F.tabellen.profiles.push({ id: "fl-g", name: b.name, email: "ohne-app@ohne-app.invalid", rolle: "fahrlehrer", fahrschule_id: "fs-test-1", aktiv: true, ohne_app: true, klassen: b.klassen }); return { ohne_app: true, id: "fl-g" }; }
      return { email: b.email, passwort: "Test-1234" };
    };
  } });
  if (!(await page.isVisible("#tNeuFl"))) fehler("Gabriel: Jelena (Verwalten-Recht) kann keinen Fahrlehrer anlegen");
  await page.click("#tNeuFl");
  await page.fill("dialog input[name=name]", "Gabriel");
  await page.check("dialog input[name=ohneapp]");
  if (await page.isVisible("dialog input[name=email]")) fehler("Gabriel: E-Mail-Feld bleibt bei „ohne App“ sichtbar");
  for (const k of ["B"]) await page.uncheck(`dialog input[name=kl][value="${k}"]`);
  for (const k of ["C1", "C1E", "C", "CE"]) await page.check(`dialog input[name=kl][value="${k}"]`);
  await pruefeLayout(page, "Fahrlehrer ohne App anlegen");
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(500);
  const an = await page.evaluate(() => window.__FAKE.letzteAnlage);
  if (!an || an.ohne_app !== true || an.email || an.klassen.join() !== "C1,C1E,C,CE" || !an.buero_sitzung) fehler("Gabriel: Anlage falsch " + JSON.stringify(an));
  if (await page.isVisible("dialog[open]")) fehler("Gabriel: es erscheint ein Passwort-Fenster");
  const t = await page.textContent("#ansicht");
  if (!/Gabriel/.test(t) || !/ohne App/.test(t)) fehler("Gabriel: steht nicht in der Liste");
  // Klassen eines Fahrlehrers ändern
  await page.click('[data-klassen="fl-2"]'); await page.check('dialog input[name=kl][value="BE"]');
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(300);
  if (!(await page.evaluate(() => (window.__FAKE.tabellen.profiles.find((p) => p.id === "fl-2").klassen || []).includes("BE")))) fehler("Klassen: nicht gespeichert");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "team-klassen.png"), fullPage: true });
  // Schüler mit Klasse CE: Fahrlehrer ohne CE stehen mit Hinweis unten, Form in der App bleibt CE
  await page.goto(page.url().split("#")[0] + "#schueler"); await page.waitForTimeout(300);
  await page.click("#sNeu");
  await page.fill("dialog input[name=name]", "Test Lkw");
  await page.selectOption("dialog select[name=klasse]", "CE");
  const opts = await page.$$eval("dialog select[name=fahrlehrer_id] option", (o) => o.map((x) => x.textContent));
  if (!opts.some((o) => /Anton.*\(nicht CE\)/.test(o)) || /nicht CE/.test(opts[1] || "")) fehler("Klassen: Auswahl der Fahrlehrer nicht nach Klasse " + JSON.stringify(opts));
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(300);
  const neu = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((x) => x.name === "Test Lkw"));
  if (!neu || neu.klasse !== "CE" || neu.ausbildung.form !== "CE") fehler("Klassen: CE wird in der App zu " + (neu && neu.ausbildung.form));
  // Lkw als Fahrzeug
  await page.goto(page.url().split("#")[0] + "#flotte"); await page.waitForTimeout(300);
  await page.click("#fzNeu"); await page.fill("dialog input[name=name]", "Actros");
  await page.selectOption("dialog select[name=typ]", "lkw");
  if ((await page.inputValue("dialog select[name=klasse]")) !== "C") fehler("Fahrzeuge: Lkw schlägt nicht Klasse C vor");
  await page.click("dialog button[value=ok]"); await page.waitForTimeout(300);
  const fz = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_fahrzeuge.find((f) => f.name === "Actros"));
  if (!fz || fz.typ !== "lkw" || fz.klasse !== "C") fehler("Fahrzeuge: Lkw falsch gespeichert " + JSON.stringify(fz));
  await pruefeLayout(page, "Fahrzeuge mit Lkw");
  if (konsole.length) fehler("Gabriel/Klassen: Konsole: " + konsole.join(" | "));
  await ctx.close();
}
// Endprüfung 14.10.: ohne Verwalten-Recht kein Knopf „Klassen“ (die Datenbank lehnt es ohnehin ab)
{
  const { page, ctx } = await oeffne({ nutzer: "bu-1", hash: "#team", wer: "Kristina" });
  if (await page.$("[data-klassen]")) fehler("Klassen: Kristina (ohne Verwalten-Recht) sieht den Knopf „Klassen“");
  await ctx.close();
}

// Leitung und Super-Admin haben eigene Konten: keine PIN-Abfrage
for (const nutzer of ["ad-1", "sa-1"]) {
  const { page, ctx } = await oeffne({ nutzer, wer: null });
  if (await page.isVisible("#wer:not([hidden])")) fehler("PIN: " + nutzer + " wird nach PIN gefragt");
  await ctx.close();
}

// 4h) Vorführung: ohne Anmeldung, erfundene Daten, Hinweis sichtbar, echte Bibliothek wird nicht geladen
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const konsole = []; let cdn = false;
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/**", (r) => { cdn = true; r.abort(); });
  await page.route(/fonts\./, (r) => r.fulfill({ body: "" }));
  await page.goto(basis + "buero.html?vorfuehrung#heute");
  await page.waitForTimeout(600);
  if (!(await page.isVisible("#vorfuehrung"))) fehler("Vorführung: Hinweis fehlt");
  if (!(await page.isVisible("#app"))) fehler("Vorführung: App startet nicht");
  if (cdn) fehler("Vorführung: lädt die echte Datenbank-Bibliothek");
  if (FOTOS) await page.screenshot({ path: join(FOTOS, "vorfuehrung-heute.png"), fullPage: true });
  if (konsole.length) fehler("Vorführung: " + konsole.join(" | "));
  await ctx.close();
}

// 5) Super-Admin sieht die Auswahl der Fahrschule
{
  const { page, ctx } = await oeffne({ nutzer: "sa-1" });
  if (!(await page.isVisible("#schulWahlWrap"))) fehler("Super-Admin: keine Fahrschul-Auswahl");
  await ctx.close();
}
{
  const { page, ctx } = await oeffne({ nutzer: "bu-1" });
  if (await page.isVisible("#schulWahlWrap")) fehler("Büro: Fahrschul-Auswahl sichtbar");
  await ctx.close();
}

await browser.close();
server.close();
console.log(probleme ? `Büro-Test: ${probleme} Problem(e).` : "Büro-Test: alles in Ordnung.");
process.exit(probleme ? 1 : 0);
