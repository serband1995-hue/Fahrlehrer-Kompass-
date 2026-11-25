// Büro-Test Werkstatt 11 Schritt 1 (flache Leiste, Zahlungen, Kalender „+ Termin“, Bewegung) + K18, erfundene Daten, keine Datenbank.
//   L   Leiste: 8 Hauptpunkte + 3 Nebenpunkte, Symbole, Zähler, keine Gruppen
//   U   Unterseiten (#auslastung, #preise, #verkaeufe) markieren den Elternpunkt
//   Z   #zahlungen mit Reitern; K  Kalender „+ Termin“ vorbelegt; A/R  Animation, reduzierte Bewegung
//   G4  Handy 375 px: Menü aufklappen, Seite wechseln, nichts wischt seitlich
//   D1  Doppelbelegung: Knopf „Gesehen“ (>= 44 px) → POST mit richtigem Schlüssel, Eintrag weg, Zähler im Menü weg
//   D2  Hinweis „Rückgängig“ → DELETE, Eintrag wieder da
//   D3  Zeile „N als gesehen markiert“ mit „wer, wann“ und „Wieder anzeigen“
//   D4  Termin ändert sich → Schlüssel neu → Warnung wieder da
//   D5  Tabelle fehlt (Fehler 42P01): kein Knopf, Warnung wie bisher, keine Konsolenfehler
//   D6  Kein confirm/alert
// Aufruf: NODE_PATH=$(npm root -g) node scripts/buero-gruppen-test.mjs
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
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
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
const tag = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const DATEN = `
  const t = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const tt = (id, von, bis) => ({ id, fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: "s1", datum: t(2), von, bis, art: "fahrstunde", fahrzeug: "Golf Muster Doppel", status: "geplant", geloescht: false, payload: {}, buero_fc_status: "offen" });
  F.tabellen.kalender_termine.push(tt("kg-1", "21:10", "21:50"), tt("kg-2", "21:30", "22:10"));
  window.__dlg = 0; window.confirm = () => { window.__dlg++; return true; }; window.alert = () => { window.__dlg++; };
`;
async function oeffne({ hash = "#heute", breite = 1366, hoehe = 900, code = "", vorher = "", nutzer = "ad-1", uhr } = {}) {
  const daten = bauDaten(new Date().toISOString().slice(0, 10));
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  ctx.setDefaultTimeout(8000);
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  page.on("dialog", (d) => { konsole.push("echtes Browser-Fenster: " + d.type()); d.dismiss().catch(() => {}); });
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  if (vorher) await page.addInitScript(vorher);
  await page.addInitScript(([d, s, v]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; (new Function("F", v))(window.__FAKE); }, [daten, session, DATEN + code]);
  if (uhr) await page.clock.install({ time: new Date(uhr) }); // feste Uhr, läuft ab da weiter
  await page.goto(basis + "buero.html" + hash);
  await warte(page, 700);
  return { page, ctx, konsole };
}
const log = (page, tab, art) => page.evaluate(([t, a]) => window.__FAKE.log.filter((x) => x.tabelle === t && x.art === a), [tab, art]);

// ---- Werkstatt 11 Schritt 1: flache Leiste ----
const HAUPT = [["#heute", "Heute"], ["#kalender", "Kalender"], ["#schueler", "Schüler"], ["#pruefungen", "Prüfungen"], ["#fristen", "Fristen"], ["#zahlungen", "Zahlungen"], ["#fahrchecks", "Fahrcheck"], ["#zahlen", "Statistik"]];
const NEBEN = [["#team", "Fahrlehrer & Büro"], ["#flotte", "Fahrzeuge"], ["#neuigkeiten", "Neuigkeiten"]];
const punkte = (page) => page.$$eval("#nav .nav-punkt", (l) => l.map((a) => [a.getAttribute("href"), a.querySelector(".nav-text").textContent.trim(), !!a.querySelector("svg"), Math.round(a.getBoundingClientRect().height), a.getAttribute("aria-current") === "page"]));
const markiert = (page) => page.$$eval('#nav .nav-punkt[aria-current="page"]', (l) => l.map((a) => a.getAttribute("href")).join(","));
{
  const heuteUm = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const { page, ctx, konsole } = await oeffne({ hash: "#heute", uhr: heuteUm(10, 20) });
  const p = await punkte(page);
  const soll = HAUPT.concat(NEBEN).map((x) => x.join("|")).join(" / ");
  pruefe("L1", "Leiste: 8 Hauptpunkte + 3 darunter in der richtigen Reihenfolge, jeder mit Symbol", p.map((x) => x[0] + "|" + x[1]).join(" / ") === soll && p.every((x) => x[2]) ? null : p.map((x) => x[1]).join(", "));
  pruefe("L2", "keine Gruppen mehr (kein Auf-/Zuklappen)", (await page.locator("[data-gruppe], .nav-gruppe").count()) === 0 ? null : "Gruppenknopf da");
  const h = new Set(p.slice(0, 8).map((x) => x[3]));
  pruefe("L3", "alle 8 Hauptpunkte gleich hoch (≥ 40 px)", h.size === 1 && [...h][0] >= 40 ? null : [...h].join(","));
  pruefe("L4", "Heute ist markiert, der Titel heißt „Heute“", (await markiert(page)) === "#heute" && (await page.textContent("#titel")) === "Heute" ? null : await markiert(page));
  pruefe("L5b", "Status: Tooltip „verbunden · Uhrzeit“ am Punkt", /^verbunden/.test(await page.getAttribute("#status", "title")) ? null : await page.getAttribute("#status", "title"));
  const zahlen = await page.$$eval("#nav .nav-punkt .zahl", (z) => z.length);
  pruefe("L5", "Zähler sichtbar (mindestens einer, rot)", zahlen >= 1 ? null : "keine Zähler");
  // Zahlungen-Zähler = Verkäufe „empfohlen“
  const emp = await page.evaluate(() => S.verkaeufe.filter((v) => v.status === "empfohlen").length);
  const zz = await page.evaluate(() => { const z = document.querySelector('#nav .nav-punkt[href="#zahlungen"] .zahl'); return z ? Number(z.textContent) : 0; });
  pruefe("L6", "Zähler bei „Zahlungen“ = Verkäufe „empfohlen“", zz === emp ? null : `Zähler ${zz} / empfohlen ${emp}`);
  const rand = await page.evaluate(() => { const n = document.querySelector("#nav").getBoundingClientRect(), f = document.querySelector(".seite-fuss").getBoundingClientRect(); return { nb: n.bottom, ft: f.top, h: innerHeight }; });
  pruefe("L7", "1366x900: Leiste und Fußzeile überlappen nicht", rand.nb <= rand.ft + 1 ? null : JSON.stringify(rand));
  // Unterseiten markieren den Elternpunkt
  for (const [hash, eltern, titel] of [["#auslastung", "#kalender", "Wer hat Platz?"], ["#preise", "#zahlungen", "Preise & Pakete"], ["#verkaeufe", "#zahlungen", "Verkäufe & Provision"], ["#zahlungen", "#zahlungen", "Zahlungen"], ["#team", "#team", "Fahrlehrer & Büro"]]) {
    await page.evaluate((h) => { location.hash = h; }, hash); await warte(page, 350);
    pruefe("U" + hash.slice(1), `${hash} erreichbar, in der Leiste markiert: ${eltern}`, (await markiert(page)) === eltern && (await page.textContent("#titel")) === titel ? null : `markiert ${await markiert(page)}, Titel ${await page.textContent("#titel")}`);
  }
  // Zahlungen: Reiterzeile in einer Linie. Wartet ein Verkauf („empfohlen“), öffnet #zahlungen „Verkäufe & Provision“, sonst „Preise“.
  const ohneZahl = (t) => t.replace(/\s*\d+$/, "").trim();
  const reiterInfo = () => page.$$eval(".zahl-reiter .tab", (l) => l.map((a) => [a.textContent.trim(), a.getAttribute("href"), a.getAttribute("aria-current") === "page", Math.round(a.getBoundingClientRect().top), !!a.querySelector(".zahl")]));
  const mitPakete = await page.evaluate(() => bkDa());
  const rzSoll = (mitPakete ? ["Preise", "Pakete", "Verkäufe & Provision"] : ["Preise", "Verkäufe & Provision"]).join("|");
  await page.evaluate(() => { location.hash = "#zahlungen"; }); await warte(page, 350);
  let rz = await reiterInfo();
  pruefe("Z1", "#zahlungen mit wartendem Verkauf: EINE Reiterzeile in einer Linie, „Verkäufe & Provision“ aktiv und mit Zahl, keine zweite Reiterzeile", rz.map((x) => ohneZahl(x[0])).join("|") === rzSoll && rz[rz.length - 1][2] && rz[rz.length - 1][4] && rz.slice(0, -1).every((x) => !x[2] && !x[4]) && new Set(rz.map((x) => x[3])).size === 1 && (await page.locator(".bk-reiter").count()) === 0 && (await page.locator("#vMonat").count()) === 1 ? null : JSON.stringify(rz));
  const badge = await page.evaluate(() => [document.querySelector('#nav .nav-punkt[href="#zahlungen"] .zahl').textContent, document.querySelector(".zahl-reiter .tab .zahl").textContent]);
  pruefe("Z1c", "Zahl am Reiter = Zahl in der Leiste", badge[0] === badge[1] && Number(badge[0]) > 0 ? null : JSON.stringify(badge));
  await page.click('.zahl-reiter .tab[href="#preise"]'); await warte(page, 350);
  pruefe("Z2", "Reiter „Preise“ zeigt die Preisseite", (await page.locator("#prNeu").count()) === 1 && (await markiert(page)) === "#zahlungen" ? null : "keine Preisseite");
  if (mitPakete) {
    await page.click('.zahl-reiter .tab[href="#preise?reiter=pakete"]'); await warte(page, 350);
    pruefe("Z1b", "Reiter „Pakete“ zeigt die Pakete, bleibt auf der Seite Zahlungen", (await page.locator("#bkNeu").count()) === 1 && ohneZahl(await page.locator('.zahl-reiter .tab[aria-current=page]').textContent()) === "Pakete" && (await markiert(page)) === "#zahlungen" ? null : "bkNeu " + (await page.locator("#bkNeu").count()));
    await page.evaluate(() => { location.hash = "#zahlungen?reiter=pakete"; }); await warte(page, 350);
    pruefe("Z1d", "#zahlungen?reiter=pakete bleibt bei den Paketen (auch mit wartendem Verkauf)", (await page.locator("#bkNeu").count()) === 1 ? null : "nicht Pakete");
  }
  await page.click('.zahl-reiter .tab[href="#verkaeufe"]'); await warte(page, 350);
  pruefe("Z3", "Reiter „Verkäufe & Provision“ zeigt die Verkäufe, Reiterzeile bleibt, Leiste markiert Zahlungen", (await page.locator("#vMonat").count()) === 1 && (await page.locator(".zahl-reiter .tab").count()) === rzSoll.split("|").length && (await markiert(page)) === "#zahlungen" ? null : "vMonat " + (await page.locator("#vMonat").count()));
  // Der Reiter wird EINMAL beim Öffnen festgelegt und steht dann in der Adresse
  await page.evaluate(() => { location.hash = "#heute"; }); await warte(page, 300);
  const nVor = await page.evaluate(() => buVerlauf.length);
  await page.evaluate(() => { location.hash = "#zahlungen"; }); await warte(page, 350);
  const hash1 = await page.evaluate(() => location.hash);
  pruefe("Z5", "frisch geöffnet mit wartendem Verkauf: Adresse #zahlungen?reiter=verkaeufe (nur ersetzt, kein neuer Verlaufseintrag)", hash1 === "#zahlungen?reiter=verkaeufe" && (await page.evaluate(() => buVerlauf.length)) === nVor + 1 && (await page.evaluate(() => buVerlauf[buVerlauf.length - 1].hash)) === "#zahlungen?reiter=verkaeufe" ? null : hash1);
  await page.evaluate(() => { S.verkaeufe.forEach((v) => { if (v.status === "empfohlen") v.status = "bezahlt"; }); zeichne(); }); await warte(page, 300);
  pruefe("Z6", "letzten Verkauf erledigt + neu zeichnen: bleibt auf „Verkäufe & Provision“ (kein Sprung zu Preise)", (await page.locator("#vMonat").count()) === 1 && (await page.locator("#prNeu").count()) === 0 ? null : "Seite gesprungen");
  // ohne wartenden Verkauf: Preise zuerst, keine Zahl am Reiter
  await page.evaluate(() => { location.hash = "#heute"; }); await warte(page, 300);
  await page.evaluate(() => { location.hash = "#zahlungen"; }); await warte(page, 350);
  rz = await reiterInfo();
  pruefe("Z4", "frisch geöffnet ohne wartenden Verkauf: „Preise“, Adresse #zahlungen?reiter=preise, keine Zahl am Reiter und in der Leiste", (await page.locator("#prNeu").count()) === 1 && rz[0][2] && rz.every((x) => !x[4]) && (await page.locator('#nav .nav-punkt[href="#zahlungen"] .zahl').count()) === 0 && (await page.evaluate(() => location.hash)) === "#zahlungen?reiter=preise" ? null : JSON.stringify(rz));
  await page.evaluate(() => { const v = S.verkaeufe.find((x) => x.status === "bezahlt"); v.status = "empfohlen"; zeichne(); }); await warte(page, 300);
  pruefe("Z7", "Nachladen mit neuer Empfehlung, während „Preise“ offen ist: bleibt auf „Preise“, Zahl erscheint am Reiter und in der Leiste", (await page.locator("#prNeu").count()) === 1 && (await page.locator(".zahl-reiter .tab .zahl").count()) === 1 && (await page.locator('#nav .nav-punkt[href="#zahlungen"] .zahl').count()) === 1 ? null : "Seite gesprungen");
  // Zurück-Schleife: Leiste → Zahlungen (Verkäufe) → Preise → Verkäufe → Zurück muss auf „Preise“ landen
  await page.evaluate(() => { location.hash = "#heute"; }); await warte(page, 300);
  await page.click('#nav .nav-punkt[href="#zahlungen"]'); await warte(page, 350);
  await page.click('.zahl-reiter .tab[href="#preise"]'); await warte(page, 350);
  await page.click('.zahl-reiter .tab[href="#verkaeufe"]'); await warte(page, 350);
  await page.click("#kopfZurueck"); await warte(page, 450);
  const z1 = (await page.locator("#prNeu").count()) === 1;
  await page.click("#kopfZurueck").catch(() => {}); await warte(page, 450);
  const z2 = (await page.locator("#vMonat").count()) === 1 && /^#zahlungen\?reiter=verkaeufe/.test(await page.evaluate(() => location.hash));
  pruefe("Z8", "„‹ Zurück“ von Verkäufe landet auf dem vorigen Reiter (Preise), danach auf dem Ausgangsreiter; keine Schleife", z1 && z2 ? null : `Preise ${z1}, Verkäufe ${z2}`);
  // Filter im Reiter „Verkäufe“ bleiben auf der Seite Zahlungen
  await page.evaluate(() => { location.hash = "#heute"; }); await warte(page, 300);
  await page.evaluate(() => { location.hash = "#zahlungen?reiter=verkaeufe"; }); await warte(page, 350);
  await page.selectOption("#vStatus", "empfohlen"); await warte(page, 350);
  pruefe("Z9", "Filter im Reiter „Verkäufe“: Adresse bleibt #zahlungen?…, Reiter bleibt", /^#zahlungen\?.*reiter=verkaeufe/.test(await page.evaluate(() => location.hash)) && (await page.locator("#vMonat").count()) === 1 ? null : await page.evaluate(() => location.hash));
  // Kalender
  await page.click('#nav .nav-punkt[href="#kalender"]'); await warte(page, 350);
  const kn = await page.$$eval("#kopfAktionen > *", (l) => l.map((a) => [a.textContent.trim(), a.className, Math.round(a.getBoundingClientRect().top), Math.round(a.getBoundingClientRect().height)]));
  pruefe("K1", "Kalender: rechts im Seitenkopf „Wer hat Platz?“ und „+ Termin“ (Akzent) in einer Reihe", kn.length === 2 && kn[0][0] === "Wer hat Platz?" && kn[1][0] === "+ Termin" && /haupt/.test(kn[1][1]) && !/haupt/.test(kn[0][1]) && kn[0][2] === kn[1][2] ? null : JSON.stringify(kn));
  for (const w of [1024, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 800 }); await warte(page, 250);
    const k = await page.evaluate(() => {
      const r = (sel) => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { x: b.left, mitte: Math.round(b.top + b.height / 2), h: Math.round(b.height), w: Math.round(b.width), r: b.right }; };
      const teile = { titel: r("#titel"), status: r("#status"), drucken: r("#drucken"), laden: r("#neuLaden"), platz: r("#kPlatz"), termin: r("#kNeuTermin") };
      return { teile, sw: document.documentElement.scrollWidth, iw: innerWidth, la: document.querySelector("#neuLaden").getAttribute("aria-label"), ld: document.querySelector("#drucken").getAttribute("aria-label"), lt: document.querySelector("#drucken").title, kante: document.querySelector(".inhalt").getBoundingClientRect().right };
    });
    const T = k.teile, mitten = Object.values(T).map((x) => x.mitte);
    const reihenfolge = T.status.x < T.drucken.x && T.drucken.x < T.laden.x && T.laden.x < T.platz.x && T.platz.x < T.termin.x && T.titel.x < T.status.x;
    pruefe("H" + w, `Seitenkopf ${w} px: Titel, Status, Drucken, Aktualisieren, Wer hat Platz?, + Termin in EINER Zeile, in dieser Reihenfolge, Akzentknopf ganz rechts`, Math.max(...mitten) - Math.min(...mitten) <= 4 && reihenfolge && k.sw <= k.iw + 1 && T.termin.r <= k.kante + 1 ? null : JSON.stringify(k));
    if (w <= 1280) pruefe("H" + w + "b", w + " px: Drucken und Aktualisieren als Symbol (≥ 44 px) mit aria-label und title", T.drucken.h >= 44 && T.drucken.w >= 44 && T.laden.h >= 44 && k.la === "Aktualisieren" && k.ld === "Drucken" && k.lt ? null : JSON.stringify(k));
    if (w === 1440) pruefe("H1440b", "1440 px: Drucken und Aktualisieren mit Text", T.drucken.w > 60 && T.laden.w > 100 ? null : JSON.stringify(k));
  }
  await page.setViewportSize({ width: 1366, height: 900 }); await warte(page, 200);
  const rechts = await page.evaluate(() => document.querySelector("#kNeuTermin").getBoundingClientRect().left > innerWidth / 2);
  pruefe("K1b", "die Knöpfe stehen rechts", rechts ? null : "links");
  await page.click("#kNeuTermin"); await warte(page, 400);
  const v = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]"); if (!d) return null;
    const f = (n) => d.querySelector(`[name="${n}"]`).value;
    const aktive = S.lehrer.filter((l) => l.aktiv !== false);
    const h = 11; // feste Uhr 10:20
    return { datum: f("datum"), soll: kTag(), von: f("von"), bis: f("bis"), lehrer: f("fahrlehrer_id"), ersterLehrer: aktive[0].id, h, ks: K_START, ke: K_ENDE, titel: d.querySelector("h2").textContent };
  });
  const vonSoll = v && (v.h * 60 >= v.ks && v.h * 60 < v.ke ? String(v.h).padStart(2, "0") + ":00" : "08:00");
  const bisSoll = v && (() => { const m = Number(vonSoll.slice(0, 2)) * 60 + 90; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); })();
  pruefe("K2a", "feste Uhr: Kalenderzeit enthält 11:00", v && v.ks <= 660 && v.ke > 660 ? null : JSON.stringify(v));
  pruefe("K2", "„+ Termin“ öffnet „Termin anlegen“ mit Tag, nächster voller Stunde (sonst 08:00), Fahrlehrer und Bis = +90 min", v && v.titel === "Termin anlegen" && v.datum === v.soll && v.von === vonSoll && v.bis === bisSoll && v.lehrer === v.ersterLehrer ? null : JSON.stringify([v, vonSoll, bisSoll]));
  await page.keyboard.press("Escape"); await warte(page, 400);
  // spät am Abend: nächste volle Stunde liegt außerhalb der Kalenderzeit → 08:00
  await page.clock.setSystemTime(new Date(heuteUm(23, 10)));
  await page.click("#kNeuTermin"); await warte(page, 300);
  const spaet = await page.evaluate(() => ({ von: document.querySelector('dialog[open] [name="von"]').value, ke: K_ENDE }));
  pruefe("K2b", "23:10 Uhr: Vorgabe 08:00 (23:00 liegt nicht in der Kalenderzeit) und „Bis“ 09:30", spaet.von === (spaet.ke > 23 * 60 ? "23:00" : "08:00") && (await page.inputValue('dialog[open] [name="bis"]')) === (spaet.von === "08:00" ? "09:30" : "23:59") ? null : JSON.stringify(spaet));
  await page.keyboard.press("Escape"); await warte(page, 400);
  await page.clock.setSystemTime(new Date(heuteUm(10, 20)));
  pruefe("K3", "Dialog schließt (nach der Animation kein offenes Fenster)", (await page.locator("dialog[open]").count()) === 0 ? null : "noch offen");
  // gefilterter Fahrlehrer
  const zweiter = await page.evaluate(() => S.lehrer.filter((l) => l.aktiv !== false)[1].id);
  await page.evaluate((id) => { location.hash = "#kalender?lehrer=" + id; }, zweiter); await warte(page, 350);
  await page.click("#kNeuTermin"); await warte(page, 400);
  const lv = await page.evaluate(() => document.querySelector('dialog[open] [name="fahrlehrer_id"]').value);
  pruefe("K4", "Fahrlehrer-Filter im Kalender: „+ Termin“ nimmt diesen Fahrlehrer", lv === zweiter ? null : lv + " ≠ " + zweiter);
  await page.keyboard.press("Escape"); await warte(page, 300);
  await page.click('#kopfAktionen a[href="#auslastung"]'); await warte(page, 350);
  pruefe("K5", "„Wer hat Platz?“ öffnet die Auslastung, Knöpfe nur im Kalender", (await page.locator("#ansicht table").count()) >= 1 && (await page.locator("#kopfAktionen").isHidden()) ? null : "Auslastung/Knöpfe");
  // Bewegung: Seitenwechsel hat eine Einblendung
  await page.evaluate(() => { window.__seiteEin = 0; document.getElementById("ansicht").addEventListener("animationstart", (e) => { if (e.animationName === "seite-ein") window.__seiteEin++; }); location.hash = "#schueler"; });
  await page.waitForFunction(() => window.__seiteEin >= 1, null, { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => { location.hash = "#fristen"; });
  await page.waitForFunction(() => window.__seiteEin >= 2, null, { timeout: 3000 }).catch(() => {});
  const zaehl = await page.evaluate(() => window.__seiteEin);
  pruefe("A1", "jeder Seitenwechsel startet die Einblendung „seite-ein“ neu (2 Wechsel = 2 Starts)", zaehl === 2 ? null : "Starts: " + zaehl);
  await page.evaluate(() => { window.__seiteEin = 0; zeichne(); });
  await warte(page, 300);
  pruefe("A1b", "dieselbe Seite neu zeichnen (Auffrischen) blendet nicht erneut ein", (await page.evaluate(() => window.__seiteEin)) === 0 ? null : "blendet erneut ein");
  await page.evaluate(() => { location.hash = "#heute"; }); await warte(page, 350);
  pruefe("A2", "kurz nach dem Wechsel sofort klickbar (Leiste, Seite)", await page.click('#nav .nav-punkt[href="#kalender"]', { timeout: 1500 }).then(() => true, () => false) ? null : "nicht klickbar");
  pruefe("L9", "keine Konsolenfehler", konsole);
  await ctx.close();
}
// ---- Werkstatt 16: Urlaub, Schichtplan, Backups nur mit ihren Funktionen ----
{
  const { page, ctx, konsole } = await oeffne({ hash: "#urlaub" });
  pruefe("V1", "ohne die Funktionen: kein Eintrag, #urlaub fällt auf Heute zurück", (await page.locator('#nav .nav-punkt[href="#urlaub"], #nav .nav-punkt[href="#schichtplan"], #nav .nav-punkt[href="#backups"]').count()) === 0 && (await page.textContent("#titel")) === "Heute" && (await markiert(page)) === "#heute" ? null : "Titel " + (await page.textContent("#titel")));
  await ctx.close();
  const att = `window.renderUrlaub = () => '<div class="karte" id="attUrlaub">Urlaub-Attrappe</div>'; window.renderSchichtplan = () => '<div class="karte" id="attSchicht">Schichtplan-Attrappe</div>'; window.renderBackups = () => '<div class="karte" id="attBackups">Backups-Attrappe</div>'; window.bindeBackups = () => { window.__backupsGebunden = true; };`;
  const m = await oeffne({ hash: "#schichtplan", vorher: att });
  const p = await punkte(m.page);
  const sollNeben = ["Fahrlehrer & Büro", "Fahrzeuge", "Urlaub", "Schichtplan", "Backups", "Neuigkeiten"].join(" / ");
  pruefe("V2", "mit den Funktionen: Urlaub, Schichtplan, Backups unten nach „Fahrzeuge“ und vor „Neuigkeiten“, mit Symbol", p.slice(8).map((x) => x[1]).join(" / ") === sollNeben && p.length === 14 && p.slice(8).every((x) => x[2]) ? null : p.map((x) => x[1]).join(", "));
  pruefe("V3", "#schichtplan rendert die Seite, Punkt markiert, Titel „Schichtplan“", (await m.page.locator("#attSchicht").count()) === 1 && (await markiert(m.page)) === "#schichtplan" && (await m.page.textContent("#titel")) === "Schichtplan" ? null : await markiert(m.page));
  await m.page.click('#nav .nav-punkt[href="#backups"]'); await warte(m.page, 350);
  pruefe("V4", "Klick auf „Backups“ rendert die Seite und ruft bindeBackups", (await m.page.locator("#attBackups").count()) === 1 && (await m.page.evaluate(() => window.__backupsGebunden === true)) ? null : "nicht gerendert");
  await m.page.click('#nav .nav-punkt[href="#urlaub"]'); await warte(m.page, 350);
  pruefe("V5", "#urlaub rendert die Seite", (await m.page.locator("#attUrlaub").count()) === 1 ? null : "nicht gerendert");
  pruefe("V6", "keine Konsolenfehler", m.konsole);
  await m.ctx.close();
}
// ---- Fenster schließen weich (2), „‹ Zurück“ (3), Backups nur Leitung (6) ----
{
  const zaehl = `window.__an = 0; const _an = Element.prototype.animate; Element.prototype.animate = function (...a) { window.__an++; return _an.apply(this, a); };`;
  const { page, ctx, konsole } = await oeffne({ hash: "#kalender", vorher: zaehl });
  const hosts = () => page.evaluate(() => document.querySelectorAll('body > div[aria-hidden="true"]').length);
  await page.click("#kNeuTermin"); await warte(page, 400);
  await page.evaluate(() => { window.__an = 0; });
  await page.keyboard.press("Escape");
  const sofort = await page.evaluate(() => ({ dlg: document.querySelectorAll("dialog").length, an: window.__an, host: document.querySelectorAll('body > div[aria-hidden="true"]').length, namen: document.querySelectorAll('[name="von"]').length }));
  pruefe("F1", "Fenster schließen: das echte Fenster ist sofort weg (keine doppelten Felder), eine Kopie blendet in einem eigenen Baum aus", sofort.dlg === 0 && sofort.namen === 0 && sofort.an >= 2 && sofort.host === 1 ? null : JSON.stringify(sofort));
  await page.click("#kNeuTermin"); await warte(page, 50);
  const neu2 = await page.evaluate(() => ({ dlg: document.querySelectorAll("dialog[open]").length, von: document.querySelectorAll('dialog [name="von"]').length }));
  pruefe("F2", "sofort neu geöffnetes Fenster kollidiert nicht mit dem ausblendenden (1 Fenster, 1 Feld „von“)", neu2.dlg === 1 && neu2.von === 1 ? null : JSON.stringify(neu2));
  const geklickt = await page.click('dialog[open] button[value=ok]', { trial: true, timeout: 1500 }).then(() => true, () => false);
  pruefe("F3", "Elemente des neuen Fensters sind sofort klickbar (auch mit ausblendender Kopie darüber/darunter)", geklickt ? null : "nicht klickbar");
  await page.keyboard.press("Escape"); await warte(page, 600);
  pruefe("F4", "nach der Ausblendung bleibt nichts zurück", (await hosts()) === 0 ? null : "Kopie bleibt im Dokument");
  await page.evaluate(() => { const k = document.getElementById("kNeuTermin"); k.click(); k.click(); });
  await warte(page, 300);
  pruefe("F5", "zweimal „+ Termin“ kurz nacheinander öffnet nur ein Fenster", (await page.locator("dialog[open]").count()) === 1 ? null : "Fenster: " + (await page.locator("dialog[open]").count()));
  pruefe("F6", "keine Konsolenfehler", konsole);
  await ctx.close();
}
{
  const zaehl = `window.__an = 0; const _an = Element.prototype.animate; Element.prototype.animate = function (...a) { window.__an++; return _an.apply(this, a); };`;
  const { page, ctx } = await oeffne({ hash: "#kalender", vorher: zaehl });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.click("#kNeuTermin"); await warte(page, 200);
  await page.evaluate(() => { window.__an = 0; });
  await page.keyboard.press("Escape"); await warte(page, 60);
  const r = await page.evaluate(() => ({ an: window.__an, host: document.querySelectorAll('body > div[aria-hidden="true"]').length, dlg: document.querySelectorAll("dialog").length }));
  pruefe("F7", "reduzierte Bewegung: Fenster schließt ohne Kopie und ohne Animation", r.an === 0 && r.host === 0 && r.dlg === 0 ? null : JSON.stringify(r));
  await ctx.close();
}
{
  const { page, ctx, konsole } = await oeffne({ hash: "#heute" });
  const zk = () => page.evaluate(() => { const k = document.getElementById("kopfZurueck"); return !!k && !k.hidden; });
  const nav = async (h) => { await page.click(`#nav .nav-punkt[href="${h}"]`); await warte(page, 350); };
  await nav("#kalender");
  const a = await zk();
  await nav("#zahlungen"); const b = await zk();
  await nav("#kalender"); const c = await zk();
  pruefe("Y1", "über die Leiste erreichte Hauptpunkte (Kalender, Zahlungen) zeigen kein „‹ Zurück“", !a && !b && !c ? null : JSON.stringify([a, b, c]));
  await page.click("#kPlatz"); await warte(page, 350);
  pruefe("Y2", "Unterseite #auslastung zeigt „‹ Zurück“, es führt zum Kalender (ohne Zurück dort)", (await zk()) && (await (async () => { await page.click("#kopfZurueck"); await warte(page, 400); return (await page.textContent("#titel")) === "Kalender" && !(await zk()); })()) ? null : "Zurück-Knopf fehlt oder führt falsch");
  await nav("#zahlungen");
  await page.click('.zahl-reiter .tab[href="#preise"]'); await warte(page, 350);
  pruefe("Y3", "Reiter auf Unterseite #preise: „‹ Zurück“ da", (await zk()) ? null : "kein Zurück");
  await nav("#heute");
  const link = page.locator('#ansicht a[href="#fristen"]').first();
  const da = (await link.count()) > 0;
  if (da) { await link.click(); await warte(page, 350); }
  pruefe("Y4", "Sprung per Link aus einer Seite (Heute → Fristen): „‹ Zurück“ da, führt zurück", da && (await zk()) && (await (async () => { await page.click("#kopfZurueck"); await warte(page, 400); return (await page.textContent("#titel")) === "Heute"; })()) ? null : "Link da: " + da);
  pruefe("Y5", "keine Konsolenfehler", konsole);
  await ctx.close();
}
{
  const att = `window.renderUrlaub = () => '<div class="karte">U</div>'; window.renderSchichtplan = () => '<div class="karte">S</div>'; window.renderBackups = () => '<div class="karte">B</div>';`;
  const sicht = async (nutzer) => { const m = await oeffne({ nutzer, vorher: att }); const r = await m.page.evaluate(() => ({ admin: istAdmin(), punkte: [...document.querySelectorAll("#nav .nav-punkt")].map((a) => a.getAttribute("href")) })); await m.ctx.close(); return r; };
  const leitung = await sicht("ad-1"), buero = await sicht("bu-1");
  pruefe("B1", "Leitung (Administrator) sieht Urlaub, Schichtplan und Backups", leitung.admin && ["#urlaub", "#schichtplan", "#backups"].every((h) => leitung.punkte.includes(h)) ? null : JSON.stringify(leitung));
  pruefe("B2", "Büro (kein Administrator) sieht Urlaub und Schichtplan, aber kein Backups", !buero.admin && buero.punkte.includes("#urlaub") && buero.punkte.includes("#schichtplan") && !buero.punkte.includes("#backups") ? null : JSON.stringify(buero));
}
// ---- keine Einblendung beim ersten Zeichnen (CI-Fehler „Text überlappt“: Klick während der Einblendung) ----
{
  const { page, ctx } = await oeffne({ hash: "#pruefungen", vorher: `window.__ae = 0; document.addEventListener("animationstart", (e) => { if (e.animationName === "seite-ein") window.__ae++; }, true);` });
  const nach = () => page.evaluate(() => window.__ae);
  pruefe("A3", "erstes Zeichnen nach dem Laden blendet nicht ein (nichts bewegt sich, während man schon tippt)", (await nach()) === 0 ? null : "Starts: " + (await nach()));
  await page.evaluate(() => { S.fsId = S.fsId; zeichne(); zeichne(); }); await warte(page, 250);
  pruefe("A3b", "dieselbe Seite neu zeichnen: keine Einblendung", (await nach()) === 0 ? null : "Starts: " + (await nach()));
  await page.evaluate(() => { location.hash = "#kalender"; }); await warte(page, 300);
  pruefe("A3c", "Wechsel auf eine andere Seite: genau eine Einblendung", (await nach()) === 1 ? null : "Starts: " + (await nach()));
  await ctx.close();
}
// ---- reduzierte Bewegung ----
{
  const { page, ctx, konsole } = await oeffne({ hash: "#kalender" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => { location.hash = "#schueler"; }); await warte(page, 100);
  const a = await page.evaluate(() => { const c = getComputedStyle(document.getElementById("ansicht")); const n = getComputedStyle(document.querySelector("#nav .nav-punkt")); return [c.animationName, n.transitionDuration]; });
  pruefe("R1", "reduzierte Bewegung: keine Einblendung, keine Übergänge in der Leiste", a[0] === "none" && /^0s(, 0s)*$/.test(a[1]) ? null : JSON.stringify(a));
  await page.evaluate(() => { location.hash = "#kalender"; }); await warte(page, 200);
  await page.click("#kNeuTermin"); 
  const dd = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); const c = getComputedStyle(d); return [c.opacity, c.transitionDuration]; });
  pruefe("R2", "reduzierte Bewegung: Dialog steht sofort da (Deckkraft 1, keine Übergangszeit)", dd[0] === "1" && /^0s(, 0s)*$/.test(dd[1]) ? null : JSON.stringify(dd));
  await page.keyboard.press("Escape");
  pruefe("R3", "reduzierte Bewegung: Dialog schließt sofort", (await page.locator("dialog[open]").count()) === 0 ? null : "noch offen");
  pruefe("R4", "keine Konsolenfehler", konsole);
  await ctx.close();
}
// ---- Handy ----
{
  const { page, ctx, konsole } = await oeffne({ hash: "#flotte", breite: 375, hoehe: 740 });
  await page.click("#menueKnopf"); await warte(page, 200);
  const m = await page.$$eval("#nav .nav-punkt", (l) => l.filter((a) => a.offsetParent).map((a) => Math.round(a.getBoundingClientRect().height)));
  pruefe("G4a", "Handy: Menü auf, 11 Punkte, alle ≥ 44 px", m.length === 11 && m.every((h) => h >= 44) ? null : JSON.stringify(m));
  await page.click('.nav-punkt[href="#pruefungen"]'); await warte(page, 400);
  pruefe("G4b", "Handy: Seite wechseln schließt das Menü", !(await page.evaluate(() => document.body.classList.contains("menue-offen"))) && /Prüfungen/.test(await page.textContent("#menueKnopf")) ? null : "Menü offen");
  pruefe("G4c", "Handy: nichts wischt seitlich", (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) ? null : "seitlich wischbar");
  pruefe("G4k", "keine Konsolenfehler", konsole);
  await ctx.close();
}
// ---- K18 ----
{
  const { page, ctx, konsole } = await oeffne({ hash: "#flotte" });
  const warnZeilen = () => page.locator(".warnkarte tbody tr").count();
  const navZahl = () => page.evaluate(() => { const a = document.querySelector('.nav-punkt[href="#flotte"] .zahl'); return a ? a.textContent.trim() : ""; });
  pruefe("D0", "Warnung zeigt die Doppelbelegung mit Knopf „Gesehen“", (await warnZeilen()) === 1 && (await page.locator("[data-konfgesehen]").count()) === 1 ? null : "Zeilen " + (await warnZeilen()));
  const hoehe = await page.evaluate(() => document.querySelector("[data-konfgesehen]").getBoundingClientRect().height);
  pruefe("D1a", "Knopf „Gesehen“ ist mindestens 44 px hoch und ein type=button", hoehe >= 44 && (await page.getAttribute("[data-konfgesehen]", "type")) === "button" ? null : "Höhe " + hoehe);
  await page.click("[data-konfgesehen]"); await warte(page, 900);
  const erw = ["kg-1|" + tag(2) + "|21:10|21:50|Golf Muster Doppel", "kg-2|" + tag(2) + "|21:30|22:10|Golf Muster Doppel"].sort().join("#");
  const ins = await log(page, "fahrzeug_konflikt_gesehen", "insert");
  pruefe("D1b", "„Gesehen“ schickt POST mit richtigem Schlüssel und fahrschule_id", ins.length === 1 && ins[0].werte[0].schluessel === erw && ins[0].werte[0].fahrschule_id === "fs-test-1" ? null : JSON.stringify(ins.map((x) => x.werte)));
  pruefe("D1c", "Eintrag ist aus der Warnung weg, Zähler im Menü weg", (await page.locator(".warnkarte").count()) === 0 && (await navZahl()) === "" ? null : "Warnkarte " + (await page.locator(".warnkarte").count()) + " Zähler " + (await navZahl()));
  pruefe("D2a", "Hinweis mit „Rückgängig“ da", (await page.isVisible(".toast-undo [data-undo]")) ? null : "kein Rückgängig");
  const zeile = await page.evaluate(() => window.__FAKE.tabellen.fahrzeug_konflikt_gesehen[0]);
  const f3 = [];
  const t3 = await page.locator(".fz-gesehen").innerText().catch(() => "");
  if (!/1 als gesehen markiert/.test(t3)) f3.push("Titel: " + t3.slice(0, 60));
  await page.click(".fz-gesehen summary");
  const voll = await page.locator(".fz-gesehen").innerText();
  if (!/Wieder anzeigen/.test(voll)) f3.push("kein Wieder anzeigen");
  if (!voll.includes(String(zeile.gesehen_am).slice(8, 10) + ".")) f3.push("kein Datum: " + voll.slice(0, 120));
  pruefe("D3a", "Zeile „1 als gesehen markiert“ mit wer/wann und „Wieder anzeigen“", f3);
  await page.click(".toast-undo [data-undo]"); await warte(page, 400);
  const del = await log(page, "fahrzeug_konflikt_gesehen", "delete");
  pruefe("D2b", "„Rückgängig“ löscht den Eintrag (DELETE), Warnung wieder da", del.length === 1 && (await warnZeilen()) === 1 && (await page.locator(".fz-gesehen").count()) === 0 ? null : "DELETE " + del.length + " Zeilen " + (await warnZeilen()));
  await page.click("[data-konfgesehen]"); await warte(page, 900);
  await page.click(".fz-gesehen summary"); await page.click("[data-konfwieder]"); await warte(page, 900);
  pruefe("D3b", "„Wieder anzeigen“ löscht den Eintrag, Warnung wieder da", (await log(page, "fahrzeug_konflikt_gesehen", "delete")).length === 2 && (await warnZeilen()) === 1 ? null : "Zeilen " + (await warnZeilen()));
  await page.click("[data-konfgesehen]"); await warte(page, 900);
  pruefe("D4a", "wieder gesehen: Warnung weg", (await page.locator(".warnkarte").count()) === 0 ? null : "Warnkarte da");
  await page.evaluate(() => { const x = S.termine.find((q) => q.id === "kg-2"); x.von = "21:20"; zeichne(); }); await warte(page, 300);
  pruefe("D4b", "Termin ändert sich (von 21:30 → 21:20): Warnung kommt wieder, alter Eintrag zählt nicht", (await warnZeilen()) === 1 && (await page.locator(".fz-gesehen").count()) === 0 ? null : "Zeilen " + (await warnZeilen()));
  pruefe("D6", "kein confirm, kein alert", (await page.evaluate(() => window.__dlg)) === 0 && !konsole.some((k) => /echtes Browser-Fenster/.test(k)) ? null : "Fenster " + konsole.join("|"));
  pruefe("D1k", "keine Konsolenfehler", konsole);
  await ctx.close();
}
{
  const { page, ctx, konsole } = await oeffne({ hash: "#flotte", code: `F.fehler = { fahrzeug_konflikt_gesehen: 'relation "public.fahrzeug_konflikt_gesehen" does not exist' };` });
  const z = await page.locator(".warnkarte tbody tr").count();
  pruefe("D5", "Tabelle fehlt: Warnung da, kein Knopf „Gesehen“, keine Zeile „gesehen markiert“, keine Fehler", z === 1 && (await page.locator("[data-konfgesehen]").count()) === 0 && (await page.locator(".fz-gesehen").count()) === 0 ? konsole : "Zeilen " + z);
  await ctx.close();
}
// ---- K18 Handy 360, Doppeltipp, Quer ----
{
  const zwei = `const t3 = (id, v, b) => ({ id, fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: "s1", datum: t(3), von: v, bis: b, art: "fahrstunde", fahrzeug: "Polo Muster Doppel", status: "geplant", geloescht: false, payload: {}, buero_fc_status: "offen" });
    F.tabellen.kalender_termine.push(t3("kg-3", "10:00", "10:40"), t3("kg-4", "10:20", "11:00"));`;
  const { page, ctx, konsole } = await oeffne({ hash: "#flotte", breite: 360, hoehe: 740, code: zwei });
  const m = await page.evaluate(() => { const r = document.querySelector("[data-konfgesehen]").getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height, w: innerWidth, sw: document.documentElement.scrollWidth }; });
  pruefe("H1", "Handy 360: Knopf „Gesehen“ liegt ohne Wischen im Bild, 44 px hoch, Seite wischt nicht", m.l >= 0 && m.r <= m.w && m.h >= 44 && m.sw <= m.w + 1 ? null : JSON.stringify(m));
  const kasten = await page.evaluate(() => { const t = document.querySelector(".warnkarte .tabelle"); return t.scrollWidth <= t.clientWidth + 1; });
  pruefe("H2", "Handy 360: Warn-Tabelle wischt nicht in sich", kasten ? null : "wischbar");
  await page.click(".fz-gesehen summary").catch(() => {});
  await page.dblclick("[data-konfgesehen]"); await warte(page, 1200);
  const ins = await log(page, "fahrzeug_konflikt_gesehen", "insert");
  pruefe("H3", "Doppeltipp: genau ein Insert, die zweite Doppelbelegung bleibt", ins.length === 1 && (await page.locator(".warnkarte tbody tr").count()) === 1 ? null : "Inserts " + ins.length + " Zeilen " + (await page.locator(".warnkarte tbody tr").count()));
  await page.click(".fz-gesehen summary");
  const m2 = await page.evaluate(() => { const r = document.querySelector("[data-konfwieder]").getBoundingClientRect(); return { l: r.left, r: r.right, h: r.height, w: innerWidth, sw: document.documentElement.scrollWidth }; });
  pruefe("H4", "Handy 360: „Wieder anzeigen“ im Bild, 44 px hoch", m2.l >= 0 && m2.r <= m2.w && m2.h >= 44 && m2.sw <= m2.w + 1 ? null : JSON.stringify(m2));
  pruefe("H5", "keine Konsolenfehler", konsole);
  await ctx.close();
}
{
  const { page, ctx } = await oeffne({ hash: "#flotte", breite: 740, hoehe: 360 });
  await page.click("#menueKnopf"); await warte(page, 400);
  const sicht = await page.evaluate(() => { const r = document.querySelector('.nav-punkt[aria-current="page"]').getBoundingClientRect(); return { t: r.top, b: r.bottom, h: innerHeight }; });
  pruefe("Q1", "Quer 740x360: aktiver Menüpunkt ist beim Öffnen sichtbar", sicht.t >= 0 && sicht.b <= sicht.h ? null : JSON.stringify(sicht));
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\n${ok} ok, ${bad} Fehler`);
process.exit(bad ? 1 : 0);
