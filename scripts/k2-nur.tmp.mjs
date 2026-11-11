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

async function oeffne({ nutzer, breite = 1366, hoehe = 860, hash = "", dunkel = false, vorbereiten, wer = "Paula Muster" }) {
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
const TEST_PIN = { "Mia Muster": "5917", "Noah Muster": "2846", "Paula Muster": "7352" };
async function meldePinAn(page, name, pin) {
  await page.click(`#werListe button:has-text("${name}")`);
  await page.keyboard.type(pin || TEST_PIN[name], { delay: 20 });
  await page.waitForTimeout(150);
}
// „Eingaben verwerfen?“ im obersten Fenster mit Ja beantworten
async function verwerfenJa(page) {
  await page.locator("dialog[open]").last().locator("button[value=ok]").click();
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
    // Mehrere Fenster übereinander: nur das oberste ist zu sehen, die darunter liegenden zählen nicht
    const fenster = [...document.querySelectorAll("dialog[open]")], oberstes = fenster[fenster.length - 1];
    const walker = document.createTreeWalker(ueber || document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode;
      if (oberstes && t.parentElement && t.parentElement.closest("dialog[open]") && t.parentElement.closest("dialog[open]") !== oberstes) continue;
      if (!t.textContent.trim() || !t.parentElement || !sichtbar(t.parentElement) || t.parentElement.closest("#toast, .toast-undo, #tip, svg, dialog:not([open]), option, select, details:not([open]) > :not(summary)") || gewolltGekuerzt(t.parentElement)) continue;
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

// ===== K2 Handy: Büro-Seite bis 900 px (Menü zum Aufklappen, Inhalt oben, nichts breiter als der Bildschirm) =====
async function oeffneVorfuehrung({ breite, hoehe, dunkel = false, hash = "#heute" }) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: dunkel ? "dark" : "light" });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.goto(basis + "buero.html?vorfuehrung" + hash);
  await page.waitForTimeout(500);
  return { page, ctx, konsole };
}
async function k2Breite(page, name) {
  const r = await page.evaluate(() => {
    const w = window.innerWidth, v = document.getElementById("vorfuehrung");
    const vb = v && !v.hidden ? v.getBoundingClientRect() : null;
    return { sw: document.documentElement.scrollWidth, w, vorf: vb && vb.width > 0 ? Math.round(vb.right) : 0 };
  });
  if (r.sw > r.w) fehler(`K2 ${name}: Seite ${r.sw} px breit bei ${r.w} px Bildschirm`);
  if (r.vorf > r.w) fehler(`K2 ${name}: Vorführ-Hinweis steht über (${r.vorf} px)`);
}
async function k2TitelImBild(page, name, erwartet) {
  const r = await page.evaluate(() => {
    const t = document.getElementById("titel").getBoundingClientRect(), st = document.getElementById("rollenStreifen");
    const oben = st && !st.hidden ? st.getBoundingClientRect().bottom : 0;
    return { top: t.top, bottom: t.bottom, oben, h: window.innerHeight, text: document.getElementById("titel").textContent };
  });
  if (r.top < r.oben - 1 || r.bottom > r.h) fehler(`K2 ${name}: Seitentitel nach Tipp nicht im Bild (oben ${Math.round(r.top)} px, Kopfleiste bis ${Math.round(r.oben)} px, Höhe ${r.h})`);
  if (erwartet && r.text !== erwartet) fehler(`K2 ${name}: falscher Titel „${r.text}“ statt „${erwartet}“`);
}
// Wichtige Fenster: Schüler-Fenster, Rückfrage „Eingaben verwerfen?“, Termin-Fenster
async function k2Fenster(page, name) {
  const zu = async () => { for (let i = 0; i < 3 && await page.locator("dialog[open]").count(); i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(150); if (await page.locator("dialog[open] button[value=ok]").count() && /verwerfen/i.test(await page.locator("dialog[open]").last().textContent())) await verwerfenJa(page); } };
  await page.evaluate(() => { location.hash = "#schueler"; }); await page.waitForTimeout(300);
  await page.locator("[data-sbearb]").first().click(); await page.waitForTimeout(250);
  if (!(await page.locator("dialog[open]").count())) fehler(`K2 ${name}: Schüler-Fenster geht nicht auf`);
  await k2Breite(page, name + " Schüler-Fenster");
  await page.locator("dialog[open] input[name=name]").first().fill("Geänderter Name Muster");
  await page.keyboard.press("Escape"); await page.waitForTimeout(250);
  if (await page.locator("dialog[open]").count() < 2) fehler(`K2 ${name}: Rückfrage beim Schließen fehlt`);
  await k2Breite(page, name + " Rückfrage");
  await verwerfenJa(page); await zu();
  await page.evaluate(() => { location.hash = "#kalender"; }); await page.waitForTimeout(400);
  const termin = page.locator(".k-termin:not(.block)").first();
  if (await termin.count()) {
    await termin.click(); await page.waitForTimeout(250);
    if (!(await page.locator("dialog[open]").count())) fehler(`K2 ${name}: Termin-Fenster geht nicht auf`);
    await k2Breite(page, name + " Termin-Fenster");
    await zu();
  } else fehler(`K2 ${name}: kein Termin im Kalender zum Antippen`);
}
{
  const GROESSEN = [[360, 740], [412, 915], [740, 360], [768, 1024]];
  const MODI = [["bu-1", "Büro"], ["ad-1", "Leitung"], ["vorf", "Vorführung"], ["vorf-dunkel", "Vorführung dunkel"]];
  for (const [w, h] of GROESSEN) for (const [modus, mname] of MODI) {
    if (modus === "vorf-dunkel" && w !== 412) continue; // dunkel einmal am Handy reicht
    const name = `${mname} ${w}×${h}`;
    const { page, ctx, konsole } = modus.startsWith("vorf") ? await oeffneVorfuehrung({ breite: w, hoehe: h, dunkel: modus === "vorf-dunkel" })
      : await oeffne({ nutzer: modus, breite: w, hoehe: h, hash: "#heute", wer: modus === "bu-1" ? "Paula Muster" : null });
    // Start: Inhalt (Seitentitel) höchstens etwa 200 px unter dem oberen Rand (Hochformat), Menü zu, „Drucken“ weg
    const start = await page.evaluate(() => ({ top: document.getElementById("titel").getBoundingClientRect().top, offen: document.body.classList.contains("menue-offen"), drucken: !!document.getElementById("drucken").offsetParent, menue: !!document.getElementById("menueKnopf").offsetParent }));
    if (h > w && start.top > 200) fehler(`K2 ${name}: Inhalt beginnt erst bei ${Math.round(start.top)} px`);
    if (start.offen) fehler(`K2 ${name}: Menü ist beim Start offen`);
    if (!start.menue) fehler(`K2 ${name}: Knopf „Menü“ fehlt`);
    if (start.drucken) fehler(`K2 ${name}: „Drucken“ ist sichtbar`);
    if (!/Menü · Heute zu tun/.test(await page.textContent("#menueKnopf"))) fehler(`K2 ${name}: Menü-Knopf nennt den Bereich nicht`);
    // Tippflächen mindestens 44 px (Menü offen: Menüpunkte und Gruppen; Kopf-Knöpfe)
    await page.click("#menueKnopf"); await page.waitForTimeout(100);
    const klein = await page.evaluate(() => [...document.querySelectorAll(".nav-punkt, .nav-gruppe, .kopf .knopf, #menueKnopf")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 43.5).map((e) => e.textContent.trim().slice(0, 20)));
    if (klein.length) fehler(`K2 ${name}: Tippflächen unter 44 px: ${klein.join(", ")}`);
    await k2Breite(page, name + " Menü offen");
    const bereiche = await page.$$eval(".nav-punkt", (l) => l.map((a) => [a.getAttribute("href"), a.textContent.replace(/\d+$/, "").trim()]));
    if (bereiche.length < 8) fehler(`K2 ${name}: nur ${bereiche.length} Menüpunkte`);
    for (const [href, titel] of bereiche) {
      if (!(await page.evaluate(() => document.body.classList.contains("menue-offen")))) await page.click("#menueKnopf");
      await page.click(`.nav-punkt[href="${href}"]`); await page.waitForTimeout(300);
      const zu = await page.evaluate(() => !document.body.classList.contains("menue-offen"));
      if (!zu) fehler(`K2 ${name} ${href}: Menü bleibt nach dem Tipp offen`);
      await k2TitelImBild(page, `${name} ${href}`, titel);
      await k2Breite(page, `${name} ${href}`);
      if (href === "#schueler") {
        const z = await page.evaluate(() => [...document.querySelectorAll(".schuelertab tbody td.namenspalte")].map((td) => { const b = td.querySelector("b"); return { w: td.getBoundingClientRect().width, zeilen: b ? b.getClientRects().length : 0, hoch: b ? b.getBoundingClientRect().height : 0, n: b ? b.textContent : "" }; }));
        if (!z.length) fehler(`K2 ${name}: keine Namenszellen in der Schüler-Tabelle`);
        const schmal = z.filter((x) => x.w < 150), mehrzeilig = z.filter((x) => x.zeilen !== 1 || x.hoch > 32);
        if (schmal.length) fehler(`K2 ${name}: Namensspalte schmaler als 150 px (${Math.round(schmal[0].w)} px)`);
        if (mehrzeilig.length) fehler(`K2 ${name}: Name auf mehreren Zeilen: ${mehrzeilig[0].n}`);
      }
      if (href === "#heute" && modus.startsWith("vorf")) await page.evaluate(() => window.scrollTo(0, 0));
    }
    if (w !== 768 || modus === "bu-1") await k2Fenster(page, name);
    if (FOTOS && (modus === "vorf" || modus === "vorf-dunkel")) { await page.evaluate(() => { location.hash = "#schueler"; }); await page.waitForTimeout(300); await page.screenshot({ path: join(FOTOS, `k2-${modus}-schueler-${w}x${h}.png`) }); }
    if (konsole.length) fehler(`K2 ${name}: Konsole: ${konsole.join(" | ")}`);
    await ctx.close();
  }
  // Tablet: Menü offen, quer drehen (über 900 px), Bereich wechseln, zurückdrehen → Menü ist zu
  {
    const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1", breite: 768, hoehe: 1024, hash: "#heute" });
    await page.click("#menueKnopf"); await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1024, height: 768 }); await page.waitForTimeout(150);
    await page.click('.nav-punkt[href="#schueler"]'); await page.waitForTimeout(300);
    await page.setViewportSize({ width: 768, height: 1024 }); await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({ offen: document.body.classList.contains("menue-offen"), aria: document.getElementById("menueKnopf").getAttribute("aria-expanded"), titel: document.getElementById("titel").textContent }));
    if (r.offen || r.aria !== "false") fehler("K2 Drehen: Menü bleibt nach Bereichswechsel offen");
    if (r.titel !== "Schüler") fehler("K2 Drehen: Bereich nicht gewechselt (" + r.titel + ")");
    if (konsole.length) fehler("K2 Drehen: Konsole: " + konsole.join(" | "));
    await ctx.close();
  }
  // PC: Menü wie bisher sichtbar, kein Menü-Knopf, „Drucken“ da (ab 901 px)
  for (const [w, h] of [[901, 800], [1366, 860]]) {
    const { page, ctx } = await oeffne({ nutzer: "bu-1", breite: w, hoehe: h, hash: "#heute" });
    const r = await page.evaluate(() => ({ nav: [...document.querySelectorAll(".nav-punkt")].filter((a) => a.offsetParent).length, menue: !!document.getElementById("menueKnopf").offsetParent, drucken: !!document.getElementById("drucken").offsetParent, wer: !!document.getElementById("werZeile").offsetParent, seite: Math.round(document.querySelector(".seite").getBoundingClientRect().width) }));
    if (r.nav < 8) fehler(`K2 PC ${w}: Menü nicht sichtbar (${r.nav} Punkte)`);
    if (r.menue) fehler(`K2 PC ${w}: Knopf „Menü“ sichtbar`);
    if (!r.drucken) fehler(`K2 PC ${w}: „Drucken“ fehlt`);
    if (!r.wer) fehler(`K2 PC ${w}: „Bedient gerade“ fehlt in der Seitenleiste`);
    if (w === 1366 && r.seite !== 272) fehler(`K2 PC 1366: Seitenleiste ${r.seite} px statt 272 px`);
    await ctx.close();
  }
  // Vorführung: nur erfundene Büro-Personen „… Muster“, keine Test-Konten, „Heute zu tun“ mit Aufgaben, Notizen und Quittungen
  {
    const { page, ctx, konsole } = await oeffneVorfuehrung({ breite: 1366, hoehe: 900 });
    const aufgaben = await page.locator(".fuer-dich > .notizliste li").count();
    if (aufgaben < 4) fehler(`K2 Vorführung: „Heute zu tun“ zeigt nur ${aufgaben} Aufgaben`);
    const d = await page.evaluate(() => ({ personen: window.__FAKE.tabellen.buero_personen.map((p) => p.name), notizen: (window.__FAKE.tabellen.schueler_notizen || []).length, quitt: (window.__FAKE.tabellen.fc_abgaben || []).length }));
    if (!d.personen.length || d.personen.some((n) => !/^\S+ Muster$/.test(n))) fehler("K2 Vorführung: Büro-Personen nicht alle „… Muster“: " + d.personen.length);
    if (d.notizen < 3 || d.quitt < 1) fehler(`K2 Vorführung: zu wenig Notizen (${d.notizen}) oder Quittungen (${d.quitt})`);
    if (!/noch nicht gelesen/.test(await page.textContent("#ansicht"))) fehler("K2 Vorführung: Hinweis auf ungelesene Notizen fehlt");
    // Quittungen: im letzten abgeschlossenen Zeitraum, „Erwartet“ wie die Seite rechnet, eine vollständig, eine mit einem fehlenden Zettel
    const q = await page.evaluate(() => { const [von] = KR.fcVorZeitraum(KR.fcZeitraum(KR.todayISO())[0]); return S.fcAbgaben.map((x) => ({ id: x.id, imZeitraum: x.zeitraum_von === von, soll: x.soll, ist: x.ist, rech: fcFuerLehrer(x.fahrlehrer_id, x.zeitraum_von, x.zeitraum_bis).soll, fehlend: (x.fehlend || []).length })); });
    if (q.length !== 2) fehler("K2 Vorführung: erwartet 2 Quittungen, da sind " + q.length);
    for (const x of q) {
      if (!x.imZeitraum) fehler(`K2 Vorführung: Quittung ${x.id} nicht im letzten Zeitraum`);
      if (x.soll !== x.rech || !x.soll) fehler(`K2 Vorführung: Quittung ${x.id} sagt ${x.soll} erwartet, die Seite rechnet ${x.rech}`);
      if (x.ist !== x.soll && !x.fehlend) fehler(`K2 Vorführung: Quittung ${x.id} mit Fehlbetrag ohne fehlende Stunde`);
    }
    if (!q.some((x) => x.ist === x.soll) || !q.some((x) => x.ist < x.soll)) fehler("K2 Vorführung: Quittungen nicht einmal vollständig und einmal mit Fehlbetrag");
    // Notizen passen zum Schüler: „Prüfungstermin bestätigt“ nur bei Schüler mit Praxisprüfung, „Reaktivierung“ nur bei fälliger Reaktivierung
    const nz = await page.evaluate(() => S.notizen.map((n) => { const s = S.schueler.find((x) => x.id === n.schueler_id); return { t: n.text, reakt: KR.reaktInfo(s, KR.todayISO()).stufe, praxis: S.pruefungstermine.some((p) => p.schueler_id === s.id && p.art === "praxis" && p.datum >= KR.todayISO()) }; }));
    for (const n of nz) {
      if (/Prüfungstermin/.test(n.t) && !n.praxis) fehler("K2 Vorführung: Notiz zum Prüfungstermin bei Schüler ohne Praxisprüfung");
      if (/Reaktivierung/.test(n.t) && !["gesperrt", "pruefen_faellig"].includes(n.reakt)) fehler("K2 Vorführung: Notiz zur Reaktivierung bei Schüler ohne fällige Reaktivierung (" + n.reakt + ")");
    }
    await page.evaluate(() => { location.hash = "#team"; }); await page.waitForTimeout(400);
    const team = await page.textContent("#ansicht");
    if (/Gesperrt Test|Ohne AGB|Super-Admin|Elif/.test(team)) fehler("K2 Vorführung: Test-Konten oder Super-Admin in „Fahrlehrer & Zugänge“ sichtbar");
    await page.evaluate(() => { location.hash = "#kalender"; }); await page.waitForTimeout(400);
    if (/Super-Admin|Elif/.test(await page.textContent("#ansicht"))) fehler("K2 Vorführung: Super-Admin oder Test-Fahrlehrerin im Kalender");
    const zeilen = await page.$$eval("#ansicht table.tabelle tbody tr td:first-child", (l) => l.map((x) => x.textContent.trim()));
    if (zeilen.some((t) => /Testperson|Gesperrt|Ohne AGB/.test(t))) fehler("K2 Vorführung: Test-Name in der Zugangsliste");
    await page.evaluate(() => { location.hash = "#fahrchecks"; }); await page.waitForTimeout(400);
    if (!/Letzte Quittungen/.test(await page.textContent("#ansicht"))) fehler("K2 Vorführung: keine Fahrcheck-Quittung zu sehen");
    if (!(await page.isVisible("#vorfuehrung")) || !/erfundene Daten/.test(await page.textContent("#vorfuehrung"))) fehler("K2 Vorführung: Hinweis „erfundene Daten“ fehlt");
    if (konsole.length) fehler("K2 Vorführung: Konsole: " + konsole.join(" | "));
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(probleme ? `Büro-Test: ${probleme} Problem(e).` : "Büro-Test: alles in Ordnung.");
process.exit(probleme ? 1 : 0);
