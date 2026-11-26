// W19 „Lohn folgt Fahrcheck-Abgabe“ (Entscheidung 08.11., 🗣 Serband 26.11.2026: „Erst Lohn bei Abgabe“).
// Teil A (ohne Browser): KR.lohnStand – Grenzfälle 45/90/135 Min, vergessen, nachgereicht, Abgabe über die Monatsgrenze,
//   unter 45 Min mit altem Vermerk, Stunden vor dem Stichtag (alte Regel), ohne Fahrschule (alte Regel).
// Teil B (Browser, Uhr auf 10.01.2027, erfundener Schüler „Muster“, keine Datenbank): Verdienst der App (ueRange), Karte „Verdienst“,
//   Liste „FC vergessen“, Fahrcheck-Menü.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lohn-fc-test.mjs      (nur Teil A:  LOHN_NUR_A=1 node scripts/lohn-fc-test.mjs)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const KR = require(join(ROOT, "kompass-rechnen.js"));
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const AN = { regelAktiv: true };
const st = (o, opt) => { const r = KR.lohnStand(Object.assign({ art: "fahrstunde", status: "gefahren" }, o), opt === undefined ? AN : opt); return r ? `${r.stand}/${r.anteil}/${r.datum}` : "null"; };
const soll = (id, text, ist, erwartet) => pruefe(id, text, () => (ist === erwartet ? null : `ist ${ist}, soll ${erwartet}`));

// ---------- Teil A ----------
await soll("A0", "Stichtag ist der 01.12.2026", KR.LOHN_FC_AB, "2026-12-01");
// 45 / 90 / 135 Minuten ohne Vermerk
await soll("A1", "45 Min, Büro abgegeben → zählt", st({ datum: "2026-12-02", von: "10:00", bis: "10:45", bueroFc: "abgegeben" }), "zaehlt/1/2026-12-02");
await soll("A1", "45 Min, Büro noch nicht geprüft → wartet", st({ datum: "2026-12-02", von: "10:00", bis: "10:45", bueroFc: "offen" }), "wartet/0/2026-12-02");
await soll("A1", "45 Min, Büro-Stand unbekannt → wartet", st({ datum: "2026-12-02", von: "10:00", bis: "10:45" }), "wartet/0/2026-12-02");
await soll("A2", "90 Min, Büro 2 abgegeben → zählt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", bueroFc: "abgegeben", bueroFcAnzahl: 2 }), "zaehlt/1/2026-12-02");
await soll("A2", "90 Min, Büro nur 1 abgegeben → Fahrcheck fehlt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", bueroFc: "abgegeben", bueroFcAnzahl: 1 }), "fehlt/0/2026-12-02");
await soll("A3", "135 Min, Büro 3 abgegeben → zählt", st({ datum: "2026-12-02", von: "10:00", bis: "12:15", bueroFc: "abgegeben", bueroFcAnzahl: 3 }), "zaehlt/1/2026-12-02");
await soll("A3", "135 Min, Büro 2 abgegeben → Fahrcheck fehlt (kein Lohn)", st({ datum: "2026-12-02", von: "10:00", bis: "12:15", bueroFc: "abgegeben", bueroFcAnzahl: 2 }), "fehlt/0/2026-12-02");
await soll("A3", "80 Min (1 FC), Büro abgegeben → zählt", st({ datum: "2026-12-02", von: "10:00", bis: "11:20", bueroFc: "abgegeben" }), "zaehlt/1/2026-12-02");
// vergessen: kein halber Lohn mehr
await soll("A4", "45 Min „1 vergessen“, Büro offen → fehlt (nicht halb)", st({ datum: "2026-12-02", von: "10:00", bis: "10:45", fc: "v1", bueroFc: "offen" }), "fehlt/0/2026-12-02");
await soll("A4", "90 Min „1 vergessen“, Abgabe mit 1 (Zahl vom Büro) → fehlt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "v1", bueroFc: "abgegeben", bueroFcAnzahl: 1 }), "fehlt/0/2026-12-02");
await soll("A4", "90 Min „1 vergessen“, Abgabe ohne Zahl (Vermerk = 1) → fehlt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "v1", bueroFc: "abgegeben" }), "fehlt/0/2026-12-02");
await soll("A4", "90 Min „2 vergessen“ → fehlt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "v2" }), "fehlt/0/2026-12-02");
await soll("A4", "Büro „fehlt“ ohne Vermerk → fehlt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", bueroFc: "fehlt" }), "fehlt/0/2026-12-02");
await soll("A4", "Vermerk „FC offen“ → fehlt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "offen" }), "fehlt/0/2026-12-02");
// nachgereicht
await soll("A5", "nachgereicht (Fahrlehrer), Büro hat erst 1 von 2 → fehlt noch", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "nachgereicht", nachAm: "2026-12-20", bueroFc: "abgegeben", bueroFcAnzahl: 1 }), "fehlt/0/2026-12-02");
await soll("A5", "nachgereicht, Büro noch nicht geprüft → wartet", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "nachgereicht", nachAm: "2026-12-20", bueroFc: "offen" }), "wartet/0/2026-12-02");
await soll("A5", "nachgereicht, Büro bestätigt 2 → voller Lohn am Tag des Nachreichens", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "nachgereicht", nachAm: "2026-12-20", bueroFc: "abgegeben", bueroFcAnzahl: 2 }), "zaehlt/1/2026-12-20");
await soll("A5", "Büro „Nachgereicht“ (Datum vom Büro, Vermerk noch v1) → voller Lohn am Tag des Büros", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "v1", bueroFc: "abgegeben", bueroFcAnzahl: 2, bueroFcNachAm: "2026-12-18" }), "zaehlt/1/2026-12-18");
await soll("A5", "zwei Daten: das spätere zählt", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "nachgereicht", nachAm: "2026-12-20", bueroFc: "abgegeben", bueroFcAnzahl: 2, bueroFcNachAm: "2027-01-04" }), "zaehlt/1/2027-01-04");
// Abgabe über die Monatsgrenze
await soll("A6", "Stunde 30.12., Abgabe erst im Januar (nicht nachgereicht) → zählt im Dezember", st({ datum: "2026-12-30", von: "10:00", bis: "11:30", bueroFc: "abgegeben", bueroFcAnzahl: 2 }), "zaehlt/1/2026-12-30");
await soll("A6", "Stunde 28.12. vergessen, nachgereicht 05.01. → zählt im Januar", st({ datum: "2026-12-28", von: "10:00", bis: "11:30", fc: "nachgereicht", nachAm: "2027-01-05", bueroFc: "abgegeben", bueroFcAnzahl: 2 }), "zaehlt/1/2027-01-05");
// unter 45 Minuten
await soll("A7", "30 Min ohne Vermerk → zählt sofort (kein Fahrcheck)", st({ datum: "2026-12-02", von: "10:00", bis: "10:30" }), "zaehlt/1/2026-12-02");
await soll("A7", "30 Min mit altem „vergessen“ → zählt voll, Vermerk wirkt nicht", st({ datum: "2026-12-02", von: "10:00", bis: "10:30", fc: "v2" }), "zaehlt/1/2026-12-02");
await soll("A7", "44 Min mit „1 vergessen“ → zählt voll", st({ datum: "2026-12-02", von: "10:00", bis: "10:44", fc: "v1" }), "zaehlt/1/2026-12-02");
// Einigungen
await soll("A8", "90 Min „1 FC als abgeschlossen“, Büro 1 abgegeben → voller Lohn", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "eins_ok", bueroFc: "abgegeben", bueroFcAnzahl: 1 }), "zaehlt/1/2026-12-02");
await soll("A8", "45 Min „Kein FC als abgeschlossen“ → voller Lohn sofort", st({ datum: "2026-12-02", von: "10:00", bis: "10:45", fc: "eins_ok" }), "zaehlt/1/2026-12-02");
await soll("A8", "90 Min „nur 1 FC bewusst“, Büro 1 abgegeben → halber Lohn (kein Fehler)", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "halb_bewusst", bueroFc: "abgegeben", bueroFcAnzahl: 1 }), "zaehlt/0.5/2026-12-02");
await soll("A8", "90 Min „nur 1 FC bewusst“, Büro offen → wartet", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "halb_bewusst", bueroFc: "offen" }), "wartet/0/2026-12-02");
await soll("A8", "geschenkt → kein Lohn, wartet auf nichts", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", fc: "geschenkt" }), "keiner/0/2026-12-02");
// ausgefallen / keine Fahrstunde
await soll("A9", "nicht erschienen → null (No-Show-Regel bleibt)", st({ datum: "2026-12-02", von: "10:00", bis: "11:30", status: "nicht erschienen" }), "null");
await soll("A9", "Theorie → null", st({ art: "theorie", datum: "2026-12-02", von: "10:00", bis: "11:30" }), "null");
// alte Regel: vor dem Stichtag, ohne Fahrschule
await soll("A10", "vor dem Stichtag: „1 vergessen“ = halb (wie bisher)", st({ datum: "2026-11-30", von: "10:00", bis: "11:30", fc: "v1" }), "zaehlt/0.5/2026-11-30");
await soll("A10", "vor dem Stichtag: ohne Haken voll (wie bisher)", st({ datum: "2026-11-30", von: "10:00", bis: "11:30" }), "zaehlt/1/2026-11-30");
await soll("A10", "vor dem Stichtag: nachgereicht voll im Monat des Nachreichens", st({ datum: "2026-11-20", von: "10:00", bis: "11:30", fc: "nachgereicht", nachAm: "2026-12-03" }), "zaehlt/1/2026-12-03");
await soll("A10", "vor dem Stichtag: unter 45 Min mit „vergessen“ wirkt wie bisher (halb)", st({ datum: "2026-11-12", von: "10:00", bis: "10:30", fc: "v1" }), "zaehlt/0.5/2026-11-12");
await soll("A11", "ohne Fahrschule (kein Büro): alte Regel, ohne Haken voll", st({ datum: "2026-12-05", von: "10:00", bis: "11:30" }, { regelAktiv: false }), "zaehlt/1/2026-12-05");
await soll("A11", "ohne Fahrschule: „1 vergessen“ halb", st({ datum: "2026-12-05", von: "10:00", bis: "11:30", fc: "v1" }, { regelAktiv: false }), "zaehlt/0.5/2026-12-05");

// ---------- Teil B: App im Browser ----------
if (!process.env.LOHN_NUR_A) {
  const { chromium } = require("playwright");
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
  const server = createServer(async (req, res) => {
    try {
      const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
      const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
      res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const basis = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date("2027-01-10T12:00:00+01:00"));
    const jsFehler = [];
    page.on("pageerror", (e) => jsFehler.push(e.message));
    await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
    await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await page.waitForTimeout(600);
    await page.evaluate(() => {
      for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
      ensureAusbildungsplaene(); ensureDB();
      const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
      const s = { id: "m1", name: "Mia Muster", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0123" };
      try { ensure(s); } catch (e) {}
      DB.students = [s]; DB.exams = []; DB.termine = [];
      DB.verdienst = { proUE: 10, fixum: 0, fixUE: 0, bonusUE: 0, bonus: 0, startUE: 0, startMonth: "2026-06" };
      const L = (id, date, von, bis, extra) => Object.assign({ id, sid: "m1", date, von, bis, art: "fahrstunde", status: "gefahren" }, extra || {});
      DB.lessons = [
        L("A", "2026-12-02", "10:00", "11:30"),                                  // Büro 2 abgegeben → zählt 2 UE
        L("B", "2026-12-03", "10:00", "11:30"),                                  // Büro offen → wartet 2 UE
        L("C", "2026-12-04", "10:00", "10:45", { fc: "v1" }),                     // 45 Min vergessen → fehlt 1 UE
        L("D", "2026-12-05", "10:00", "12:15", { fc: "v1" }),                     // 135 Min, 2 von 3 → fehlt 3 UE
        L("E", "2026-12-06", "10:00", "10:30", { fc: "v1" }),                     // 30 Min, alter Vermerk → zählt 0,67 UE
        L("F", "2026-11-10", "10:00", "11:30", { fc: "v1" }),                     // vor dem Stichtag → halb (1 UE)
        L("H", "2026-12-28", "10:00", "11:30", { fc: "nachgereicht", nachAm: "2027-01-05" }), // → Januar 2 UE
        L("I", "2026-12-30", "10:00", "11:30"),                                  // Abgabe im Januar → Dezember 2 UE
        L("J", "2026-11-12", "10:00", "10:30", { fc: "v1" }),                     // alt, unter 45 Min mit Vermerk → sichtbar
      ];
      _authUser = { id: "u-muster" }; _authProfile = { id: "u-muster", fahrschule_id: "fs-muster", rolle: "fahrlehrer" };
      _bfcAusZeilen([
        { id: "A", art: "fahrstunde", datum: "2026-12-02", buero_fc_status: "abgegeben", buero_fc_anzahl: 2 },
        { id: "B", art: "fahrstunde", datum: "2026-12-03", buero_fc_status: "offen" },
        { id: "C", art: "fahrstunde", datum: "2026-12-04", buero_fc_status: "offen" },
        { id: "D", art: "fahrstunde", datum: "2026-12-05", buero_fc_status: "abgegeben", buero_fc_anzahl: 2 },
        { id: "H", art: "fahrstunde", datum: "2026-12-28", buero_fc_status: "abgegeben", buero_fc_anzahl: 2 },
        { id: "I", art: "fahrstunde", datum: "2026-12-30", buero_fc_status: "abgegeben", buero_fc_anzahl: 2 },
        { id: "F", art: "fahrstunde", datum: "2026-11-10", buero_fc_status: "offen" },
      ]);
    });
    const r = (von, bis) => page.evaluate(([a, b]) => { const x = ueRange(a, b); return { done: Math.round(x.fcDone * 100) / 100, counted: Math.round(x.fcCounted * 100) / 100, wartet: Math.round(x.fcWartet * 100) / 100, fehlt: Math.round(x.fcFehlt * 100) / 100 }; }, [von, bis]);
    const dez = await r("2026-12-01", "2026-12-31"), jan = await r("2027-01-01", "2027-01-31"), nov = await r("2026-11-01", "2026-11-30");
    await soll("B1", "Dezember verdient = A 2 + E 0,67 + I 2 = 4,67 UE", dez.done, 4.67);
    await soll("B1", "Dezember wartet auf den Haken = B 2 UE", dez.wartet, 2);
    await soll("B1", "Dezember Fahrcheck fehlt = C 1 + D 3 = 4 UE", dez.fehlt, 4);
    await soll("B1", "Dezember voraussichtlich = verdient + wartet = 6,67 UE", dez.counted, 6.67);
    await soll("B2", "Januar: nachgereichte Stunde vom 28.12. = 2 UE", jan.done, 2);
    await soll("B3", "November (alte Regel): F halb 1 + J halb 0,335 = 1,34 UE", nov.done, 1.34);
    // Büro bestätigt B später (Monatsgrenze: zählt im Dezember, nicht im Januar)
    await page.evaluate(() => { const m = _bfcStand().m; m.B = { s: "abgegeben", n: 2, nach: null }; });
    const dez2 = await r("2026-12-01", "2026-12-31"), jan2 = await r("2027-01-01", "2027-01-31");
    await soll("B4", "Büro bestätigt B im Januar → Dezember 6,67 UE, Januar unverändert 2", `${dez2.done}/${dez2.wartet}/${jan2.done}`, "6.67/0/2");
    // Verdienst-Karte Dezember
    const karte = await page.evaluate(() => { _vdMonthOffset = -1; const h = _verdienstModulHTMLContent(); _vdMonthOffset = 0; const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " "); });
    await pruefe("B5", "Karte: „Fahrcheck fehlt“ mit 40 € und „mit Fahrcheck bestätigt“", () => [!/4 UE: Fahrcheck fehlt/.test(karte) && "kein Fehlt-Hinweis", !/40 €/.test(karte) && "nicht 40 €", !/mit Fahrcheck bestätigt/.test(karte) && "nicht „mit Fahrcheck bestätigt“", /warten auf den Fahrcheck-Haken/.test(karte) && "Warte-Hinweis, obwohl nichts wartet"].filter(Boolean));
    await page.evaluate(() => { const m = _bfcStand().m; m.B = { s: "offen", n: null, nach: null }; });
    const karte2 = await page.evaluate(() => { _vdMonthOffset = -1; const h = _verdienstModulHTMLContent(); _vdMonthOffset = 0; const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " "); });
    await pruefe("B5", "Karte: „2 UE … warten auf den Fahrcheck-Haken vom Büro · 20 €“", () => (/2 UE gefahren, warten auf den Fahrcheck-Haken vom Büro · 20 €/.test(karte2) ? null : karte2.slice(0, 400)));
    // FC vergessen: C 10 + D 30 (ganz, nicht halb) + F 10 (alt halb) + J 3,33 (alt, unter 45) = 53 €
    const vergessen = await page.evaluate(() => { routeFCMissing(); return { eur: fcForgottenEuro(), text: document.getElementById("view").textContent.replace(/\s+/g, " "), n: fcForgottenLessons().map((l) => l.id).sort().join(",") }; });
    await soll("B6", "FC vergessen: C, D, F, J (E ab Stichtag unter 45 Min nicht)", vergessen.n, "C,D,F,J");
    await soll("B6", "FC vergessen: 53 € entgehen (ab Stichtag ganzer Lohn, vorher halb)", vergessen.eur, 53);
    await pruefe("B6", "FC vergessen: Hinweis „keinen Lohn, bis …“ und „unter 45 Min · alter Vermerk“", () => [!/keinen Lohn, bis der Fahrcheck nachgereicht ist/.test(vergessen.text) && "kein Lohn-Hinweis", !/unter 45 Min · alter Vermerk/.test(vergessen.text) && "J ohne Hinweis"].filter(Boolean));
    // Fahrcheck-Menü
    const menue = (id) => page.evaluate((id) => { try { closeSheet(); } catch (e) {} openFCMenu(id); return document.getElementById("sheet").textContent.replace(/\s+/g, " "); }, id);
    const mC = await menue("C"), mA = await menue("A"), mF = await menue("F"), mB = await menue("B");
    await pruefe("B7", "Menü C (45 Min vergessen): „kein Lohn, bis nachgereicht“, Lohn-Zeile „Fahrcheck fehlt“", () => [!/kein Lohn, bis nachgereicht/.test(mC) && "kein neuer Text", /nur \d+ €/.test(mC) && "noch „nur … €“", !/Lohn: Fahrcheck fehlt/.test(mC) && "keine Lohn-Zeile"].filter(Boolean));
    await pruefe("B7", "Menü A: „Lohn: zählt ✓“; Menü B: „wartet auf den Fahrcheck-Haken“", () => [!/Lohn: zählt/.test(mA) && "A ohne „zählt“", !/Lohn: wartet auf den Fahrcheck-Haken vom Büro/.test(mB) && "B ohne „wartet“"].filter(Boolean));
    await pruefe("B7", "Menü F (vor dem Stichtag): alter Text „nur 10 €“, keine Lohn-Zeile", () => [!/nur 10 €/.test(mF) && "kein „nur 10 €“", /Lohn:/.test(mF) && "Lohn-Zeile bei alter Stunde"].filter(Boolean));
    // ohne Fahrschule: alte Regel
    await page.evaluate(() => { try { closeSheet(); } catch (e) {} _authProfile = { id: "u-muster", rolle: "fahrlehrer" }; });
    const solo = await r("2026-12-01", "2026-12-31");
    await soll("B8", "ohne Fahrschule: alte Regel (A2+B2+C0,5+D1,5+E0,335+I2 = 8,34 UE)", solo.done, 8.34);
    await soll("B8", "ohne Fahrschule: nichts wartet", solo.wartet, 0);
    await pruefe("B9", "keine JS-Fehler", () => jsFehler.length ? jsFehler.slice(0, 3).join(" | ") : null);
  } finally { await browser.close(); server.close(); }
}
console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
