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
    if (frage) { await page.click(`[data-wer="${wer}"]`); await page.waitForTimeout(100); }
  }
  return { page, ctx, konsole };
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
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
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
  // „Wer bist du“ merkt sich der Browser-Tab (auch nach Neuladen), bis 20 Minuten nichts angeklickt wurde
  await page.evaluate(() => { setzeWer("Isra"); S.wer = ""; starteWer(); });
  if (await page.isVisible("#wer:not([hidden])")) fehler("Wer bist du: Name wird nach Neuladen nicht übernommen");
  await page.goto(page.url().split("#")[0] + "#zahlen");
  await page.waitForTimeout(300);
  if ((await sichtbar()) !== alle) fehler("Seitenleiste: Seite in zugeklappter Gruppe öffnet die Gruppe nicht");
  await pruefeLayout(page, "Seitenleiste");
  // Wer bedient: Name und Kopfzeile
  const wer = await page.evaluate(() => ({ s: S.wer, an: document.getElementById("werAnzeige").textContent }));
  if (wer.s !== "Isra" || wer.an !== "Isra") fehler("Wer bist du: Name nicht übernommen " + JSON.stringify(wer));
  const kopf = await page.evaluate(() => { window.__echt = window.fetch; window.fetch = (u, o) => ({ h: [...new Headers(o.headers)].filter(([k]) => k === "x-buero-bearbeiter").map(([, v]) => v), u }); S.wer = "Jelena"; const r = [bueroFetch("https://x/rest/v1/schueler", {}), bueroFetch("https://x/auth/v1/token", {})]; window.fetch = window.__echt; return r; });
  if (kopf[0].h[0] !== "Jelena" || kopf[1].h.length) fehler("Wer bist du: Kopfzeile falsch " + JSON.stringify(kopf));
  await page.evaluate(() => { S.wer = "Isra"; });
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
  if (!/Inaktiv/.test(await page.textContent("#aktivText"))) fehler("Aktiv-Schalter zeigt nicht „Inaktiv“");
  await page.click("dialog button[value=ok]");
  await page.waitForTimeout(400);
  const ina = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((x) => x.name === "Test Schüler").inaktiv_seit);
  if (ina !== HEUTE) fehler("Inaktiv nicht gespeichert: " + ina);
  if ((await page.$$eval(".schuelertab tbody tr", (r) => r.length)) !== 0) fehler("Inaktiver Schüler steht noch in der aktiven Liste");
  await page.goto(page.url().split("#")[0] + "#schueler?sicht=inaktiv");
  await page.waitForTimeout(400);
  const inaktive = await page.$$eval(".schuelertab tbody tr", (r) => r.length);
  if (inaktive < 1) fehler("Reiter „Inaktiv“ zeigt keine Schüler");
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
  // „Wer bedient“: bewusst wechseln lässt sich abbrechen (Knopf und Esc)
  await page.click("#werWechseln");
  if (!(await page.isVisible("#werZu"))) fehler("Wer bist du: kein Abbrechen beim Wechseln");
  await page.click("#werZu");
  if (await page.isVisible("#wer:not([hidden])")) fehler("Wer bist du: Abbrechen schließt nicht");
  await page.click("#werWechseln");
  await page.keyboard.press("Escape");
  if (await page.isVisible("#wer:not([hidden])")) fehler("Wer bist du: Esc schließt nicht");
  // Fokus bleibt in der Seitenleiste
  await page.focus('[data-gruppe="Geld"]');
  await page.keyboard.press("Enter");
  if ((await page.evaluate(() => document.activeElement && document.activeElement.dataset.gruppe)) !== "Geld") fehler("Seitenleiste: Fokus geht beim Zuklappen verloren");
  await page.keyboard.press("Enter");
  if (konsole.length) fehler("Fehlersuche-Fälle: Konsole: " + konsole.join(" | "));
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
