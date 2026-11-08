// Test der Büro-Seite "Fahrstunden verwalten" (nur Fahrschul-Leitung) im echten Browser, mit erfundenen Daten.
// Prüft: Sichtbarkeit je Rolle, Deckel (156 UE, Deckel 140 -> 16 markiert), Vorschau-Dialog mit Sicherungen,
// Entfernen, Übertragen, Fehlerfall, Konsole, Layout bei 412 px. Bildschirmfotos nach <ordner> (nicht im Repo).
// Die Datenbank-Funktionen fahrstunden_entfernen / fahrstunden_uebertragen werden hier als Attrappe nachgebaut
// (Vertrag: supabase/migrations/20261108_fahrstunden_verwalten_leitung.sql, Rückgabe = Anzahl geänderter Termine).
// Annahme: 1 UE = ein Termin zu 45 Minuten (die Testdaten haben nur 45-Minuten-Termine, damit es eindeutig ist).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/fahrstunden-verwalten-test.mjs [ordner-fuer-fotos]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FOTOS = process.argv[2] || "/home/user/entwuerfe-fahrstunden/test";
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
await mkdir(FOTOS, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

const TEST_PIN = { Jelena: "6204", Murat: "7391", Kristina: "4826" };

/* ---------- Testdaten: Fahrlehrer fl-1 mit 156 UE (45-Minuten-Termine) im aktuellen Monat, fl-2 mit 20 ---------- */
function datenSkript() {
  return `
    const FS = "fs-test-1", MON = ${JSON.stringify(HEUTE.slice(0, 7))};
    const termine = []; let n = 0;
    function mach(lehrer, anzahl, praefix) {
      let tag = 1, im = 0;
      while (im < anzahl) {
        const d = new Date(MON + "-" + String(tag).padStart(2, "0") + "T12:00:00");
        if (d.getMonth() !== new Date(MON + "-01T12:00:00").getMonth()) break;
        if (d.getDay() !== 0) {
          for (let k = 0; k < 8 && im < anzahl; k++, im++) {
            const m0 = 8 * 60 + k * 45, m1 = m0 + 45, f = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
            termine.push({ id: praefix + (++n), fahrschule_id: FS, fahrlehrer_id: lehrer, schueler_id: null, datum: MON + "-" + String(tag).padStart(2, "0"), von: f(m0), bis: f(m1), art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: false, payload: {}, aktualisiert_am: "2026-01-01T00:00:00Z" });
          }
        }
        tag++;
      }
    }
    mach("fl-1", 156, "MU-"); mach("fl-2", 20, "MV-");
    F.tabellen.kalender_termine = termine;
    const T = () => F.tabellen.kalender_termine;
    F.rpcs = F.rpcs || {};
    F.rpcs.fahrstunden_entfernen = ({ p_ids }) => {
      if (F.rpcFehler) throw new Error(F.rpcFehler);
      let z = 0; T().forEach((t) => { if (p_ids.includes(t.id) && !t.geloescht && !t.admin_entfernt_am) { t.geloescht = true; t.admin_entfernt_am = new Date().toISOString(); z++; } });
      return z;
    };
    F.rpcs.fahrstunden_uebertragen = ({ p_ids, p_ziel }) => {
      if (F.rpcFehler) throw new Error(F.rpcFehler);
      let z = 0; T().forEach((t) => { if (p_ids.includes(t.id) && !t.geloescht && !t.admin_entfernt_am) { t.fahrlehrer_id = p_ziel; z++; } });
      return z;
    };
  `;
}

let probleme = 0;
function fehler(text) { probleme++; console.log("   - " + text); }

async function oeffne({ nutzer, breite = 1280, hoehe = 900, hash = "", wer = "Kristina", ohneDaten = false }) {
  const daten = bauDaten(HEUTE);
  const session = nutzer ? { user: { id: nutzer, email: nutzer + "@example.org" } } : null;
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s };
    if (v) (new Function("F", v))(window.__FAKE);
  }, [daten, session, ohneDaten ? "" : datenSkript()]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  if (wer && nutzer) {
    const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
    if (frage) {
      await page.click(`#werListe button:has-text("${wer}")`);
      await page.keyboard.type(TEST_PIN[wer], { delay: 20 });
      await page.waitForTimeout(150);
    }
  }
  return { page, ctx, konsole };
}

// Findet die Seite über die Navigation (Name der Route ist Sache von team-frontend).
async function seiteLink(page) {
  return page.evaluate(() => {
    const a = [...document.querySelectorAll("#nav a")].find((x) => /Fahrstunden verwalten/i.test(x.textContent));
    return a ? a.getAttribute("href") : null;
  });
}
async function gehZurSeite(page) {
  const href = await seiteLink(page);
  if (!href) return false;
  await page.evaluate((h) => { location.hash = h; }, href);
  await page.waitForSelector("#fv-seite", { timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(250);
  return !!(await page.$("#fv-seite"));
}
const zahlIn = async (page, sel) => { const t = (await page.textContent(sel).catch(() => "")) || ""; const m = t.match(/\d+/); return m ? Number(m[0]) : NaN; };
// Die Zahlen zählen animiert hoch/runter: bis zu 2,5 s auf den erwarteten Wert warten, sonst den letzten Wert liefern.
async function erwarte(page, sel, soll) {
  let z = NaN;
  for (let i = 0; i < 25; i++) { z = await zahlIn(page, sel); if (z === soll) return z; await page.waitForTimeout(100); }
  return z;
}
async function setzeDeckel(page, n) {
  await page.fill("#fv-deckel-zahl", String(n));
  await page.dispatchEvent("#fv-deckel-zahl", "change");
  await page.waitForTimeout(150);
}
async function waehleLehrer(page, id) {
  await page.click(`.fv-lehrer[data-id="${id}"]`);
  await page.waitForTimeout(200);
}
const tabelle = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__FAKE.tabellen.kalender_termine)));
// Angehakte Stunden im Vorschau-Dialog
const haken = (page) => page.$$eval("#fv-vorschau .fv-haken", (l) => l.map((h) => ({ id: h.dataset.id, an: !!h.checked })));
// Vorschau-Dialog öffnen mit Leitung, Fahrlehrer fl-1, Deckel 140
async function bereitMitLeitung(opts = {}) {
  const o = await oeffne({ nutzer: "ad-1", ...opts });
  const da = await gehZurSeite(o.page);
  if (da) { await waehleLehrer(o.page, "fl-1"); await setzeDeckel(o.page, 140); }
  return Object.assign(o, { da });
}
async function bestaetigeDialog(page, anzahl) {
  if (await page.$("#fv-geprueft")) await page.check("#fv-geprueft");
  if (anzahl != null && (await page.$("#fv-anzahl"))) await page.fill("#fv-anzahl", String(anzahl));
  await page.waitForTimeout(100);
}

/* ---------- Fälle ---------- */
const faelle = [];
const fall = (name, fn) => faelle.push({ name, fn });

fall("1  Büro: Seite weder in der Navigation noch erreichbar", async () => {
  const { page, ctx, konsole } = await oeffne({ nutzer: "bu-1" });
  if (await seiteLink(page)) fehler("Seite „Fahrstunden verwalten“ steht in der Navigation des Büros");
  for (const h of ["#fahrstunden", "#fahrstunden-verwalten", "#fahrstundenverwalten", "#verwalten"]) {
    await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(250);
    if (await page.$("#fv-seite")) fehler("Büro erreicht die Seite über " + h);
  }
  // Auch als Büro-Person MIT Verwalten-Recht (Jelena) ist es keine Leitung
  await ctx.close();
  const j = await oeffne({ nutzer: "bu-1", wer: "Jelena" });
  if (await seiteLink(j.page)) fehler("Büro-Person mit Verwalten-Recht (Jelena) sieht die Seite - sie ist nicht Leitung");
  await j.ctx.close();
  if (konsole.length) fehler("Konsole: " + konsole.join(" | ").slice(0, 300));
});

fall("2  Leitung: Seite sichtbar, 156 UE, Deckel 140 -> 16 markiert, Regler/Zahl synchron, Tag-Klick", async () => {
  const { page, ctx, da } = await bereitMitLeitung();
  if (!da) { await ctx.close(); return fehler("Seite „Fahrstunden verwalten“ nicht in der Navigation der Leitung oder #fv-seite fehlt"); }
  const gesamt = await zahlIn(page, "#fv-gesamt");
  if (gesamt !== 156) fehler("#fv-gesamt zeigt " + gesamt + " statt 156");
  { const m = await erwarte(page, "#fv-markiert", 16); if (m !== 16) fehler("#fv-markiert zeigt " + (await page.textContent("#fv-markiert")).trim() + " statt 16"); }
  if (await page.$$eval(".fv-woche", (l) => l.length) < 3) fehler("Weniger als 3 Wochen (.fv-woche) sichtbar");
  const tage = await page.$$eval(".fv-tag", (l) => l.length);
  if (tage < 20) fehler("Nur " + tage + " Tage (.fv-tag)");
  // Regler und Zahlenfeld synchron
  await page.evaluate(() => { const r = document.getElementById("fv-regler"); r.value = "120"; r.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.waitForTimeout(150);
  if ((await page.inputValue("#fv-deckel-zahl")) !== "120") fehler("Regler 120 -> Zahlenfeld zeigt " + (await page.inputValue("#fv-deckel-zahl")));
  { const m = await erwarte(page, "#fv-markiert", 36); if (m !== 36) fehler("Deckel 120 -> #fv-markiert " + (await page.textContent("#fv-markiert")).trim() + " statt 36"); }
  await setzeDeckel(page, 140);
  if ((await page.inputValue("#fv-regler")) !== "140") fehler("Zahlenfeld 140 -> Regler zeigt " + (await page.inputValue("#fv-regler")));
  if (await erwarte(page, "#fv-markiert", 16) !== 16) fehler("Zurück auf 140 -> #fv-markiert nicht 16");
  // Tag-Klick: markiert/entmarkiert (Tage mit weniger als 6 UE im Monat gibt es kaum - nimm den ersten Tag)
  const vor = await erwarte(page, "#fv-markiert", 16);
  const ersterTag = page.locator(".fv-tag").first();
  const tagUE = await ersterTag.evaluate((b) => Number((b.querySelector(".fv-tag-ue").textContent || "").replace(",", ".")));
  await ersterTag.click();
  const nach1 = await erwarte(page, "#fv-markiert", vor + tagUE);
  if (nach1 !== vor + tagUE) fehler("Tag-Klick: #fv-markiert " + vor + " -> " + nach1 + " statt " + (vor + tagUE));
  await ersterTag.click();
  const nach2 = await erwarte(page, "#fv-markiert", vor);
  if (nach2 !== vor) fehler("Zweiter Tag-Klick stellt nicht zurück: " + vor + " -> " + nach1 + " -> " + nach2);
  // Fahrlehrer-Chip: fl-2 hat 20 UE, unter dem Deckel -> nichts markiert
  await waehleLehrer(page, "fl-2");
  if (await erwarte(page, "#fv-gesamt", 20) !== 20) fehler("fl-2: #fv-gesamt nicht 20");
  if (await erwarte(page, "#fv-markiert", 0) !== 0) fehler("fl-2 (20 UE) hat markierte Stunden unter dem Deckel");
  const aus = await page.$eval("#fv-entfernen", (b) => b.disabled).catch(() => null);
  if (aus === false) fehler("#fv-entfernen ist bei 0 markierten Stunden nicht gesperrt");
  // Monat vor/zurück ist erreichbar
  if (!(await page.$("#fv-monat-zurueck")) || !(await page.$("#fv-monat-vor"))) fehler("Monatsknöpfe fehlen");
  else {
    await page.click("#fv-monat-zurueck"); await page.waitForTimeout(200);
    { const g = await erwarte(page, "#fv-gesamt", 0); if (g !== 0) fehler("Vormonat: #fv-gesamt " + (await page.textContent("#fv-gesamt")).trim().slice(0, 40) + " statt 0 (Testdaten nur im aktuellen Monat)"); }
    await page.click("#fv-monat-vor"); await page.waitForTimeout(200);
  }
  await ctx.close();
});

fall("2b Reine Funktion fahrstundenUeberDeckel(liste, deckel)", async () => {
  const { page, ctx } = await oeffne({ nutzer: "ad-1" });
  const r = await page.evaluate(() => {
    if (typeof fahrstundenUeberDeckel !== "function") return { fehlt: true };
    const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: "x" + i, datum: "2026-11-" + String(1 + Math.floor(i / 6)).padStart(2, "0"), von: "0" + (8 + (i % 6)) + ":00", bis: "0" + (8 + (i % 6)) + ":45", art: "fahrstunde", ue: 1 }));
    const l = mk(156), kopie = JSON.stringify(l);
    const a = fahrstundenUeberDeckel(l, 140), b = fahrstundenUeberDeckel(l, 200), c = fahrstundenUeberDeckel(l, 0), d = fahrstundenUeberDeckel([], 140), e = fahrstundenUeberDeckel(l, 156);
    const laenge = (x) => (Array.isArray(x) ? x.length : x && x.size != null ? x.size : typeof x === "number" ? x : NaN);
    return { a: laenge(a), b: laenge(b), c: laenge(c), d: laenge(d), e: laenge(e), unveraendert: JSON.stringify(l) === kopie };
  });
  await ctx.close();
  if (r.fehlt) return fehler("Globale Funktion fahrstundenUeberDeckel fehlt");
  if (r.a !== 16) fehler("156 UE, Deckel 140 -> " + r.a + " statt 16");
  if (r.b !== 0) fehler("Deckel 200 -> " + r.b + " statt 0");
  if (r.c !== 156) fehler("Deckel 0 -> " + r.c + " statt 156");
  if (r.d !== 0) fehler("Leere Liste -> " + r.d + " statt 0");
  if (r.e !== 0) fehler("Deckel = Anzahl -> " + r.e + " statt 0");
  if (!r.unveraendert) fehler("Die Funktion verändert die übergebene Liste");
});

fall("3  Vorschau: Liste = Markierung, Abwählen senkt die Zahl, Bestätigen gesperrt ohne Prüf-Haken / ohne richtige Zahl", async () => {
  const { page, ctx, da } = await bereitMitLeitung();
  if (!da) { await ctx.close(); return fehler("Seite fehlt"); }
  await page.click("#fv-entfernen"); await page.waitForTimeout(250);
  if (!(await page.$eval("#fv-vorschau", (d) => d.open).catch(() => false))) { await ctx.close(); return fehler("Dialog #fv-vorschau ging nicht auf"); }
  const zeilen = await page.$$eval("#fv-vorschau .fv-zeile", (l) => l.length);
  if (zeilen !== 16) fehler("Vorschau zeigt " + zeilen + " Zeilen statt 16");
  const h = await haken(page);
  if (h.length !== 16 || !h.every((x) => x.an)) fehler("Nicht alle 16 Stunden sind angehakt: " + h.filter((x) => x.an).length + " von " + h.length);
  const bestaetigen = () => page.$eval("#fv-bestaetigen", (b) => b.disabled);
  if (!(await bestaetigen())) fehler("#fv-bestaetigen ist ohne alles freigegeben");
  // Nur Prüf-Haken, ohne Zahl (16 >= 5): weiter gesperrt
  await page.check("#fv-geprueft"); await page.waitForTimeout(100);
  if (!(await bestaetigen())) fehler("Mit #fv-geprueft aber ohne eingetippte Zahl ist Bestätigen schon frei (ab 5 Stunden)");
  // Falsche Zahl
  await page.fill("#fv-anzahl", "15"); await page.waitForTimeout(100);
  if (!(await bestaetigen())) fehler("Falsche Zahl (15 statt 16) schaltet Bestätigen frei");
  // Richtige Zahl, aber ohne Prüf-Haken
  await page.uncheck("#fv-geprueft"); await page.fill("#fv-anzahl", "16"); await page.waitForTimeout(100);
  if (!(await bestaetigen())) fehler("Richtige Zahl ohne #fv-geprueft schaltet Bestätigen frei");
  await page.check("#fv-geprueft"); await page.waitForTimeout(100);
  if (await bestaetigen()) fehler("Haken + richtige Zahl (16): Bestätigen bleibt gesperrt");
  // Eine Stunde abwählen -> 15, Zahl 16 passt nicht mehr
  await page.uncheck("#fv-vorschau .fv-haken >> nth=0"); await page.waitForTimeout(150);
  const an = (await haken(page)).filter((x) => x.an).length;
  if (an !== 15) fehler("Nach Abwählen sind " + an + " statt 15 angehakt");
  if (!/\b15\b/.test(await page.textContent("#fv-vorschau"))) fehler("Dialog nennt nach Abwählen nicht die Zahl 15");
  if (!(await bestaetigen())) fehler("Nach Abwählen (15) ist Bestätigen noch frei (Prüf-Haken/Zahl müssen neu bestätigt werden)");
  await page.fill("#fv-anzahl", "16"); await page.check("#fv-geprueft"); await page.waitForTimeout(100);
  if (!(await bestaetigen())) fehler("Nach Abwählen (15) mit eingetippter 16 ist Bestätigen frei");
  await page.fill("#fv-anzahl", "15"); await page.waitForTimeout(100);
  if (await bestaetigen()) fehler("Mit 15 und Zahl 15 bleibt Bestätigen gesperrt");
  // Auf 4 Stunden abwählen: unter der Schwelle von 5 genügt der Haken (Zahl nicht nötig) - Spezifikation: "ab 5 Stunden"
  const alle = await haken(page);
  for (let i = 0; i < alle.length; i++) { if (alle[i].an && (await haken(page)).filter((x) => x.an).length > 4) await page.uncheck(`#fv-vorschau .fv-haken >> nth=${i}`); }
  await page.waitForTimeout(150);
  const rest = (await haken(page)).filter((x) => x.an).length;
  if (rest !== 4) fehler("Vorbereitung für Schwelle: " + rest + " statt 4 angehakt");
  else {
    await page.fill("#fv-anzahl", "").catch(() => {});
    await page.check("#fv-geprueft").catch(() => {}); await page.waitForTimeout(100);
    if (await bestaetigen()) fehler("Bei 4 Stunden (unter 5) bleibt Bestätigen trotz #fv-geprueft gesperrt (Schwelle ist ab 5)");
  }
  // Auf 0 abwählen -> gesperrt
  for (let i = 0; i < 16; i++) { if ((await haken(page))[i].an) await page.uncheck(`#fv-vorschau .fv-haken >> nth=${i}`); }
  await page.waitForTimeout(150);
  if (!(await bestaetigen())) fehler("Bei 0 angehakten Stunden ist Bestätigen frei");
  // Schließen ändert nichts
  const vorher = await tabelle(page);
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  if (JSON.stringify(await tabelle(page)) !== JSON.stringify(vorher)) fehler("Abbrechen hat Termine verändert");
  await ctx.close();
});

fall("4  Bestätigen: Stunden geloescht=true, Erfolgskarte „140“, Seite zeigt 140 UE", async () => {
  const { page, ctx, konsole, da } = await bereitMitLeitung();
  if (!da) { await ctx.close(); return fehler("Seite fehlt"); }
  await page.screenshot({ path: join(FOTOS, "1280-seite-markiert.png"), fullPage: true });
  await page.click("#fv-entfernen"); await page.waitForTimeout(250);
  const ids = (await haken(page)).filter((x) => x.an).map((x) => x.id);
  await page.screenshot({ path: join(FOTOS, "1280-vorschau.png") });
  await bestaetigeDialog(page, ids.length);
  await page.click("#fv-bestaetigen"); await page.waitForTimeout(500);
  const t = await tabelle(page);
  const weg = t.filter((x) => x.geloescht === true).map((x) => x.id).sort();
  if (weg.join() !== ids.slice().sort().join()) fehler("Entfernt wurden " + weg.length + " Termine, erwartet genau die " + ids.length + " markierten");
  if (t.filter((x) => x.fahrlehrer_id === "fl-1" && !x.geloescht).length !== 140) fehler("Nicht genau 140 Termine von fl-1 übrig");
  if (t.some((x) => x.fahrlehrer_id === "fl-2" && x.geloescht)) fehler("Termine von fl-2 wurden mitentfernt");
  const erfolg = (await page.textContent("#fv-erfolg").catch(() => "")) || "";
  if (!(await page.isVisible("#fv-erfolg").catch(() => false))) fehler("#fv-erfolg ist nicht sichtbar");
  if (!/140/.test(erfolg)) fehler("Erfolgskarte nennt nicht „140“: " + erfolg.trim().slice(0, 120));
  await page.screenshot({ path: join(FOTOS, "1280-erfolg.png"), fullPage: true });
  if (await page.$eval("#fv-vorschau", (d) => d.open).catch(() => false)) fehler("Dialog ist nach dem Erfolg noch offen");
  if (await erwarte(page, "#fv-gesamt", 140) !== 140) fehler("Seite zeigt danach " + (await page.textContent("#fv-gesamt")).trim() + " statt 140 UE");
  if (await erwarte(page, "#fv-markiert", 0) !== 0) fehler("Danach sind noch " + (await page.textContent("#fv-markiert")).trim() + " Stunden markiert");
  const rpcs = await page.evaluate(() => window.__FAKE.log.filter((x) => x.rpc).map((x) => x.rpc + ":" + ((x.args && x.args.p_ids) || []).length));
  if (rpcs.filter((x) => x.startsWith("fahrstunden_entfernen")).join() !== "fahrstunden_entfernen:16") fehler("RPC-Aufrufe: " + rpcs.join(","));
  if (konsole.length) fehler("Konsole: " + konsole.join(" | ").slice(0, 300));
  await ctx.close();
});

fall("5  Übertragen: Stunden wandern zum Ziel-Fahrlehrer, Ziel nicht der gleiche", async () => {
  const { page, ctx, da } = await bereitMitLeitung();
  if (!da) { await ctx.close(); return fehler("Seite fehlt"); }
  await page.click("#fv-uebertragen-oeffnen"); await page.waitForTimeout(300);
  const optionen = await page.$$eval("#fv-ziel option", (l) => l.map((o) => o.value).filter(Boolean));
  if (!optionen.length) return fehler("#fv-ziel hat keine Ziele");
  if (optionen.includes("fl-1")) fehler("Ziel-Auswahl enthält den gleichen Fahrlehrer (fl-1)");
  if (!optionen.includes("fl-2")) fehler("fl-2 fehlt in der Ziel-Auswahl: " + optionen);
  if (optionen.some((o) => /^(bu-|ad-|sa-)/.test(o))) fehler("Ziel-Auswahl enthält Nicht-Fahrlehrer: " + optionen.filter((o) => /^(bu-|ad-|sa-)/.test(o)));
  // Ohne Ziel gesperrt
  await page.selectOption("#fv-ziel", "").catch(() => {});
  const ohneZiel = await page.$eval("#fv-uebertragen", (b) => b.disabled).catch(() => null);
  if (ohneZiel === false) fehler("#fv-uebertragen ist ohne gewähltes Ziel nicht gesperrt");
  await page.selectOption("#fv-ziel", "fl-2"); await page.waitForTimeout(150);
  const markiert = (await tabelle(page)).filter((x) => x.fahrlehrer_id === "fl-1").length; // 156
  const idsDialog = (await haken(page)).filter((x) => x.an).length;
  if (idsDialog !== 16) fehler("Übertragen-Vorschau zeigt " + idsDialog + " statt 16 Stunden");
  await page.screenshot({ path: join(FOTOS, "1280-uebertragen.png") });
  await page.click("#fv-uebertragen"); await page.waitForTimeout(500);
  const t = await tabelle(page);
  const bei1 = t.filter((x) => x.fahrlehrer_id === "fl-1" && !x.geloescht).length;
  const bei2 = t.filter((x) => x.fahrlehrer_id === "fl-2" && !x.geloescht).length;
  if (bei1 !== 140) fehler("fl-1 hat danach " + bei1 + " statt 140 (vorher " + markiert + ")");
  if (bei2 !== 36) fehler("fl-2 hat danach " + bei2 + " statt 36 (20 + 16)");
  if (t.some((x) => x.geloescht)) fehler("Beim Übertragen wurden Termine als gelöscht markiert");
  const erfolg = (await page.textContent("#fv-erfolg").catch(() => "")) || "";
  if (!/16/.test(erfolg)) fehler("Erfolgskarte nennt nicht „16“: " + erfolg.trim().slice(0, 120));
  if (await erwarte(page, "#fv-gesamt", 140) !== 140) fehler("Seite zeigt nach dem Übertragen nicht 140 UE");
  await ctx.close();
});

fall("6  Fehlerfall: RPC antwortet mit Fehler -> Meldung im Dialog, nichts geändert", async () => {
  const { page, ctx, da } = await bereitMitLeitung();
  if (!da) { await ctx.close(); return fehler("Seite fehlt"); }
  await page.evaluate(() => { window.__FAKE.rpcFehler = "Nur die Fahrschul-Leitung darf Fahrstunden entfernen."; });
  const vorher = JSON.stringify(await tabelle(page));
  await page.click("#fv-entfernen"); await page.waitForTimeout(250);
  await bestaetigeDialog(page, 16);
  await page.click("#fv-bestaetigen"); await page.waitForTimeout(500);
  if (JSON.stringify(await tabelle(page)) !== vorher) fehler("Termine wurden trotz Fehler verändert");
  if (!(await page.$eval("#fv-vorschau", (d) => d.open).catch(() => false))) fehler("Dialog wurde bei Fehler geschlossen (Meldung sollte im Dialog stehen)");
  const text = (await page.textContent("#fv-vorschau").catch(() => "")) || "";
  if (!/Nur die Fahrschul-Leitung/.test(text)) fehler("Fehlermeldung steht nicht im Dialog: " + text.replace(/\s+/g, " ").slice(-160));
  if (await page.isVisible("#fv-erfolg").catch(() => false)) fehler("#fv-erfolg zeigt trotz Fehler Erfolg");
  await page.screenshot({ path: join(FOTOS, "1280-fehler.png") });
  // Nach Behebung lässt sich erneut bestätigen
  await page.evaluate(() => { window.__FAKE.rpcFehler = null; });
  if (await page.$eval("#fv-bestaetigen", (b) => b.disabled)) { await bestaetigeDialog(page, 16); }
  if (!(await page.$eval("#fv-bestaetigen", (b) => b.disabled))) {
    await page.click("#fv-bestaetigen"); await page.waitForTimeout(500);
    if ((await tabelle(page)).filter((x) => x.geloescht).length !== 16) fehler("Zweiter Versuch nach dem Fehler entfernt nicht 16 Stunden");
  } else fehler("Nach dem Fehler bleibt Bestätigen gesperrt - kein zweiter Versuch möglich");
  await ctx.close();
});

fall("6b Übertragen mit Fehler: Meldung, nichts geändert", async () => {
  const { page, ctx, da } = await bereitMitLeitung();
  if (!da) { await ctx.close(); return fehler("Seite fehlt"); }
  await page.evaluate(() => { window.__FAKE.rpcFehler = "Ziel-Fahrlehrer nicht gefunden oder nicht aktiv."; });
  const vorher = JSON.stringify(await tabelle(page));
  await page.click("#fv-uebertragen-oeffnen"); await page.waitForTimeout(300);
  await page.selectOption("#fv-ziel", "fl-2"); await page.waitForTimeout(100);
  await page.click("#fv-uebertragen"); await page.waitForTimeout(500);
  if (JSON.stringify(await tabelle(page)) !== vorher) fehler("Termine wurden trotz Fehler verändert");
  if (!(await page.$eval("#fv-vorschau", (d) => d.open).catch(() => false))) fehler("Dialog wurde bei Fehler geschlossen");
  const sichtbar = (await page.textContent("#fv-vorschau").catch(() => "")) || "";
  if (!/Ziel-Fahrlehrer nicht gefunden/.test(sichtbar)) fehler("Fehlermeldung des Übertragens ist nirgends sichtbar");
  await ctx.close();
});

fall("7  Keine JS-Fehler in der Konsole (Seite, Dialog, Hilfe)", async () => {
  const { page, ctx, konsole, da } = await bereitMitLeitung();
  if (!da) { await ctx.close(); return fehler("Seite fehlt"); }
  if (!(await page.$("#fv-hilfe"))) fehler("#fv-hilfe fehlt");
  else { await page.click("#fv-hilfe").catch(() => {}); await page.waitForTimeout(200); await page.keyboard.press("Escape"); }
  await page.click("#fv-entfernen"); await page.waitForTimeout(200);
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  await page.evaluate(() => { location.hash = "#heute"; }); await page.waitForTimeout(200);
  if (konsole.length) fehler("Konsole: " + konsole.join(" | ").slice(0, 400));
  await ctx.close();
});

fall("8  Layout bei 412 px: kein seitlicher Überlauf (Seite, Dialog, Erfolg)", async () => {
  const { page, ctx, da } = await bereitMitLeitung({ breite: 412, hoehe: 860 });
  if (!da) { await ctx.close(); return fehler("Seite fehlt"); }
  const breite = (label) => page.evaluate((l) => {
    const de = document.documentElement, b = document.body;
    const raus = [...document.querySelectorAll("#fv-seite *, dialog[open] *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).slice(0, 3).map((e) => e.tagName + "." + String(e.className).split(" ")[0] + "#" + e.id);
    return { l, sw: Math.max(de.scrollWidth, b.scrollWidth), iw: innerWidth, raus };
  }, label);
  let r = await breite("Seite");
  if (r.sw > r.iw + 1) fehler("Seite: seitlich wischbar (scrollWidth " + r.sw + " > " + r.iw + ") " + r.raus.join(", "));
  else if (r.raus.length) fehler("Seite: ragt über den Rand: " + r.raus.join(", "));
  await page.screenshot({ path: join(FOTOS, "412-seite.png"), fullPage: true });
  await page.click("#fv-entfernen"); await page.waitForTimeout(250);
  r = await breite("Dialog");
  if (r.sw > r.iw + 1) fehler("Dialog: seitlich wischbar (scrollWidth " + r.sw + ")");
  else if (r.raus.length) fehler("Dialog: ragt über den Rand: " + r.raus.join(", "));
  await page.screenshot({ path: join(FOTOS, "412-vorschau.png") });
  await bestaetigeDialog(page, 16);
  await page.click("#fv-bestaetigen"); await page.waitForTimeout(500);
  r = await breite("Erfolg");
  if (r.sw > r.iw + 1) fehler("Erfolg: seitlich wischbar (scrollWidth " + r.sw + ")");
  else if (r.raus.length) fehler("Erfolg: ragt über den Rand: " + r.raus.join(", "));
  await page.screenshot({ path: join(FOTOS, "412-erfolg.png"), fullPage: true });
  // Tippflächen mindestens 40 px hoch (Handy-Regel)
  const klein = await page.$$eval("#fv-seite button, #fv-seite select, #fv-seite .fv-lehrer", (l) => l.filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 36; }).map((e) => e.id || e.className).slice(0, 4));
  if (klein.length) fehler("Zu kleine Tippflächen (<36 px hoch): " + klein.join(", "));
  await ctx.close();
});

/* ---------- Ausführen ---------- */
let rot = 0;
for (const { name, fn } of faelle) {
  const vorher = probleme;
  try { await fn(); } catch (e) { fehler("Testfehler: " + String(e.message || e).split("\n")[0]); }
  if (probleme > vorher) { rot++; console.log("ROT   " + name); } else console.log("GRÜN  " + name);
}
await browser.close(); server.close();
console.log(rot ? `Fahrstunden-verwalten-Test: ${rot} von ${faelle.length} Fall/Fälle rot.` : "Fahrstunden-verwalten-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
