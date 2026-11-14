// Start der App: Z3 (ohne Profil nicht weiter, „Nochmal“; mit gespeichertem Profil offline weiter) und
// G5 (Startbild kurz und nicht blockierend, Logo-Tipp blockiert nicht).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/start-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.APP_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let rot = 0;
const fehler = (t) => { rot++; console.log("ROT   " + t); };
const ok = (t) => console.log("GRÜN  " + t);

const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
const js = [];
page.on("pageerror", (e) => js.push(String(e)));
page.on("dialog", (d) => d.dismiss().catch(() => {}));
await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());

// G5: zweiter Start (gleiche Version) – Startbild nach unter 1 s weg
await page.goto(basis + "index.html"); await page.waitForTimeout(2500);
const t0 = Date.now();
await page.reload();
await page.waitForFunction(() => { const s = document.getElementById("splash"); return !s || s.classList.contains("hide"); }, null, { timeout: 5000 });
const dauer = Date.now() - t0;
if (dauer > 1500) fehler("G5 Startbild beim zweiten Start " + dauer + " ms"); else ok("G5 Startbild beim zweiten Start nach " + dauer + " ms weg");
// Logo-Tipp (14.11.2026, Serband: „Animation 1,5 Sekunden“): Startbild blockiert nie, die Animation läuft wirklich
// und das Bild ist nach ca. 1,5 s weg; Doppeltipp startet sauber neu; Weg zum Dashboard bleibt
const logo = await page.evaluate(async () => {
  const w = (ms) => new Promise((k) => setTimeout(k, ms));
  const sp = document.getElementById("splash"); replaySplash();
  const pe = getComputedStyle(sp).pointerEvents; const t = performance.now();
  await w(300);
  const tile = document.getElementById("splashTile");
  const laeuft = tile ? tile.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length : 0;
  while (!sp.classList.contains("hide") && performance.now() - t < 5000) await w(20);
  const ms = Math.round(performance.now() - t);
  // Strasse ist beim Ausblenden fertig (Zeichen komplett), nicht mitten im Aufbau abgeschnitten
  const str = document.querySelector("#splashTile .t-strasse");
  const strFertig = !str || str.getAnimations().every((a) => a.playState === "finished");
  return { pe, ms, laeuft, strFertig };
});
if (logo.pe !== "none") fehler("G5 Logo-Tipp: Startbild fängt Tipps ab (" + logo.pe + ")"); else ok("G5 Logo-Tipp: Tippen geht durch");
if (logo.ms < 1400 || logo.ms > 1700) fehler("Logo-Tipp: Startbild " + logo.ms + " ms statt ca. 1500"); else ok("Logo-Tipp: Animation " + logo.ms + " ms sichtbar (Ziel 1,5 s)");
if (logo.laeuft < 3) fehler("Logo-Tipp: Animation läuft nicht (" + logo.laeuft + " laufende Teile nach 0,3 s)"); else ok("Logo-Tipp: Animation läuft (" + logo.laeuft + " Teile)");
if (!logo.strFertig) fehler("Logo-Tipp: Straße beim Ausblenden noch nicht fertig"); else ok("Logo-Tipp: Zeichen beim Ausblenden fertig");
const doppel = await page.evaluate(async () => {
  const w = (ms) => new Promise((k) => setTimeout(k, ms));
  const sp = document.getElementById("splash");
  replaySplash(); await w(1600);           // gerade ausgeblendet, „kurz entfernen“ steht noch aus
  replaySplash(); await w(400);            // zweiter Tipp: läuft neu, darf nicht blockieren
  const r = { sichtbar: !sp.classList.contains("hide"), pe: getComputedStyle(sp).pointerEvents };
  replaySplash(); await w(200); replaySplash(); // schneller Doppeltipp mitten in der Animation
  const t = performance.now(); while (!sp.classList.contains("hide") && performance.now() - t < 5000) await w(20);
  r.ms2 = Math.round(performance.now() - t); await w(400); r.kurzWeg = !sp.classList.contains("kurz");
  return r;
});
if (!doppel.sichtbar || doppel.pe !== "none") fehler("G5 Doppeltipp: Startbild " + JSON.stringify(doppel)); else ok("G5 Doppeltipp nach dem Ausblenden: läuft neu, Tippen geht durch");
if (doppel.ms2 < 1400 || doppel.ms2 > 1700 || !doppel.kurzWeg) fehler("Doppeltipp mitten in der Animation: " + JSON.stringify(doppel)); else ok("Doppeltipp mitten in der Animation: startet neu, wieder 1,5 s");
// Echter Tipp auf das Logo: Dashboard kommt, und ein Tipp während der Animation erreicht die Seite darunter
const weg = await page.evaluate(async () => {
  const w = (ms) => new Promise((k) => setTimeout(k, ms));
  for (const id of ["loginOverlay"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  document.getElementById("homeBtn").click(); await w(300);
  const sp = document.getElementById("splash"), mitte = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  const r = { titel: document.getElementById("tbTitle").textContent, durch: !!mitte && !sp.contains(mitte), offen: !sp.classList.contains("hide") };
  await w(1700); return r;
});
if (!weg.offen || !weg.durch) fehler("Logo-Tipp: Startbild nicht sichtbar oder fängt den Tipp " + JSON.stringify(weg)); else ok("Logo-Tipp: während der Animation trifft ein Tipp die Seite darunter");
if (weg.titel !== "Heute") fehler("Logo-Tipp: kein Dashboard (" + weg.titel + ")"); else ok("Logo-Tipp: Dashboard („" + weg.titel + "“)");
{
  // Bewegung reduzieren (Bedienungshilfe): kein Warten auf eine Animation, die nicht läuft
  const c2 = await browser.newContext({ viewport: { width: 390, height: 780 }, reducedMotion: "reduce" });
  const p2 = await c2.newPage();
  await p2.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p2.goto(basis + "index.html"); await p2.waitForTimeout(2500);
  const rm = await p2.evaluate(async () => { const sp = document.getElementById("splash"); replaySplash(); const pe = getComputedStyle(sp).pointerEvents; const t = performance.now(); while (!sp.classList.contains("hide") && performance.now() - t < 5000) await new Promise((k) => setTimeout(k, 20)); return { ms: Math.round(performance.now() - t), pe }; });
  if (rm.ms > 900 || rm.pe !== "none") fehler("Bewegung reduziert: Startbild " + JSON.stringify(rm)); else ok("Bewegung reduziert: Standbild nur " + rm.ms + " ms, Tippen geht durch");
  await c2.close();
}

// T6: neuer Nutzer ohne fremde Vorgaben; gespeicherte Werte bleiben. T7: Absender aus dem Profil.
await page.evaluate(() => { localStorage.clear(); });
await page.reload(); await page.waitForTimeout(900);
const t6 = await page.evaluate(async () => {
  const w = (ms) => new Promise((k) => setTimeout(k, ms));
  const v = DB.verdienst, fz = DB.workCfg.fahrzeuge.length, vorgabe = !!DB.workCfg.zeitenVorgabe, fehlt = _vertragFehlt();
  routeStats("cur"); await w(150);
  const stat = document.getElementById("view").innerText;
  routeDashboard(); await w(150);
  const heute = document.getElementById("view").innerText;
  routeArbeitszeit(); await w(80);
  const az = document.getElementById("view").innerText;
  document.getElementById("azFzName").value = "Golf 8"; document.getElementById("azFzAdd").click(); await w(50);
  const fzNeu = DB.workCfg.fahrzeuge.map((f) => f.name + "/" + f.typ).join();
  return { proUE: v.proUE, fixum: v.fixum, fz, vorgabe, fehlt, stat2100: /2\.100/.test(stat), statHinweis: /Vertrag eintragen/.test(stat), heuteHinweis: /Vertrag fehlt/.test(heute), azHinweis: /noch nicht eingetragen/.test(az), fzNeu };
});
if (t6.proUE || t6.fixum || t6.stat2100) fehler("T6 neuer Nutzer sieht fremden Vertrag: " + JSON.stringify(t6)); else ok("T6 kein fremder Vertrag als Vorgabe");
if (!t6.fehlt || !t6.statHinweis || !t6.heuteHinweis) fehler("T6 Hinweis „Vertrag eintragen“ fehlt: " + JSON.stringify(t6)); else ok("T6 Hinweis „Vertrag eintragen“ auf Statistik und Heute");
if (t6.fz) fehler("T6 fest eingebaute Fahrzeuge für neuen Nutzer"); else ok("T6 keine fest eingebauten Fahrzeuge");
if (!t6.vorgabe || !t6.azHinweis) fehler("T6 Hinweis Arbeitszeiten fehlt"); else ok("T6 Hinweis „Arbeitszeiten noch nicht eingetragen“");
if (t6.fzNeu !== "Golf 8/schalt") fehler("T6 Fahrzeug anlegen klappt nicht: " + t6.fzNeu); else ok("T6 eigenes Fahrzeug anlegen");
const t6b = await page.evaluate(() => {
  DB.verdienst = { proUE: 23, fixum: 2100, fixUE: 140, bonusUE: 240, bonus: 500, ziel: 240, startUE: 0, startMonth: "2026-06" };
  DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Audi Q5", typ: "automatik" }]; delete DB.workCfg.zeitenVorgabe; save();
  return true;
});
await page.reload(); await page.waitForTimeout(900);
const t6c = await page.evaluate(() => ({ v: DB.verdienst.proUE + "/" + DB.verdienst.fixum, fz: DB.workCfg.fahrzeuge.map((f) => f.name).join(), vorgabe: !!DB.workCfg.zeitenVorgabe, fehlt: _vertragFehlt() }));
if (t6c.v !== "23/2100" || t6c.fz !== "Audi Q5" || t6c.vorgabe || t6c.fehlt) fehler("T6 gespeicherte Werte verändert: " + JSON.stringify(t6c)); else ok("T6 gespeicherte Werte bestehender Nutzer bleiben");
const fix = await page.evaluate(async () => { const alt = DB.verdienst; DB.verdienst = Object.assign({}, alt, { proUE: 0, fixum: 2000 }); routeDashboard(); await new Promise((k) => setTimeout(k, 150));
  const t = document.getElementById("view").innerText; DB.verdienst = alt; return { gefahren: /Diese Woche gefahren/.test(t), nullEuro: /Diese Woche verdient\s*0 €/.test(t) }; });
if (!fix.gefahren || fix.nullEuro) fehler("Nur-Fixum-Vertrag zeigt 0 € statt gefahrener UE: " + JSON.stringify(fix)); else ok("Nur-Fixum-Vertrag: Heute zeigt gefahrene UE statt 0 €");
const t7 = await page.evaluate(() => { const alt = _authProfile; _authProfile = { name: "Anna Muster", fahrschule_name: "Testfahrschule" }; const a = _druckAbsender(); _authProfile = null; const b = _druckAbsender(); _authProfile = alt; return { a, b }; });
if (t7.a !== "Testfahrschule · Fahrlehrer Anna Muster" || /Serband|Boost/.test(t7.b)) fehler("T7 Absender falsch: " + JSON.stringify(t7)); else ok("T7 Absender aus dem Profil, ohne festen Namen");

// A1/A12: keine Doppelanlage nach Zurück auf der Fragebogen-Frage, Warnung bei gleichem Namen
const a1 = await page.evaluate(async () => {
  const w = (ms) => new Promise((k) => setTimeout(k, ms));
  const zur = async () => { window.dispatchEvent(new PopStateEvent("popstate")); await w(80); };
  formView(null); await w(50);
  document.getElementById("f_name").value = "Gustav Muster";
  document.getElementById("saveBtn").click(); await w(80);
  const sheetOffen = document.getElementById("sheet").classList.contains("open");
  await zur();
  const titel = document.getElementById("tbTitle").textContent;
  const formularDa = !!document.getElementById("saveBtn");
  formView(null); await w(50);
  document.getElementById("f_name").value = "gustav  muster";
  document.getElementById("saveBtn").click(); await w(80); // Rückfrage wird im Test abgelehnt
  const anzahl = DB.students.filter((x) => x.name.toLowerCase().replace(/\s+/g, " ") === "gustav muster").length;
  // A12: Schnell-Anlage, Fragebogen-Fenster mit Zurück schließen → Abschluss läuft trotzdem
  let fertigId = null;
  openQuickNewStudentSheet((id) => { fertigId = id; });
  document.getElementById("qnsName").value = "Hanna Muster";
  document.getElementById("qnsSave").click(); await w(80);
  await zur();
  return { sheetOffen, titel, formularDa, anzahl, fertig: !!fertigId };
});
if (!a1.sheetOffen) fehler("A1 Vorbereitung: Fragebogen-Fenster nicht offen");
if (a1.formularDa || !/Schülerdatei/.test(a1.titel)) fehler("A1 nach Zurück steht das Formular noch da (" + a1.titel + ")"); else ok("A1 nach dem Anlegen gleich in der Akte");
if (a1.anzahl !== 1) fehler("A1 Schüler " + a1.anzahl + "× angelegt"); else ok("A1 gleicher Name: Warnung, kein zweiter Eintrag");
if (!a1.fertig) fehler("A12 Zurück auf der Fragebogen-Frage: Termin-Abschluss läuft nicht"); else ok("A12 Abschluss läuft auch nach Zurück");

// Z3: Profil-Abfrage scheitert
const fakeEinbauen = () => {
  const antwort = { data: null, error: { message: "503 Service Unavailable" } };
  const kette = () => new Proxy(function () {}, {
    get: (_, k) => (k === "then" ? (ok, no) => Promise.resolve(antwort).then(ok, no) : () => kette()),
    apply: () => kette(),
  });
  window.getSupa = () => ({ from: () => kette(), rpc: () => kette(), auth: { signOut: async () => ({}), getSession: async () => ({ data: { session: null } }) }, channel: () => kette(), removeChannel: () => {} });
  try { getSupa = window.getSupa; } catch (e) {}
};
await page.evaluate(fakeEinbauen);
const r1 = await page.evaluate(async () => {
  try { localStorage.removeItem("kompass-profil-cache"); localStorage.setItem(OWNER_KEY, "u-z3"); } catch (e) {}
  _continueLoginFlow = (() => { window.__weiter = true; });
  await afterLogin({ id: "u-z3", email: "z3@example.org" });
  return { nochmal: !!document.getElementById("loNochmal"), weiter: !!window.__weiter, profil: _authProfile };
});
if (!r1.nochmal) fehler("Z3 kein Knopf „Nochmal“ bei Profilfehler"); else ok("Z3 Meldung mit „Nochmal“");
if (r1.weiter || r1.profil) fehler("Z3 App läuft ohne Profil weiter"); else ok("Z3 ohne Profil nicht weiter");
// Mit gespeichertem, gesperrtem Profil: Sperre greift auch offline
const r2 = await page.evaluate(async () => {
  window.__weiter = false;
  localStorage.setItem("kompass-profil-cache", JSON.stringify({ id: "u-z3", aktiv: false, rolle: "fahrlehrer", agb_akzeptiert_version: AGB_VERSION }));
  await afterLogin({ id: "u-z3", email: "z3@example.org" });
  return { weiter: !!window.__weiter, text: document.getElementById("loErr").textContent };
});
if (r2.weiter || !/gesperrt/.test(r2.text)) fehler("Z3 gesperrtes Konto (gespeichert) kommt rein: " + r2.text); else ok("Z3 gespeichertes gesperrtes Profil bleibt gesperrt");
// Mit gespeichertem, aktivem Profil: offline weiter
const r3 = await page.evaluate(async () => {
  window.__weiter = false;
  localStorage.setItem("kompass-profil-cache", JSON.stringify({ id: "u-z3", aktiv: true, rolle: "fahrlehrer", email: "z3@example.org", agb_akzeptiert_version: AGB_VERSION }));
  await afterLogin({ id: "u-z3", email: "z3@example.org" });
  return { weiter: !!window.__weiter, nochmal: !!document.getElementById("loNochmal") };
});
if (!r3.weiter || r3.nochmal) fehler("Z3 mit gespeichertem Profil offline nicht weiter"); else ok("Z3 mit gespeichertem Profil offline weiter");
if (js.length) fehler("JS-Fehler: " + js.join(" | ").slice(0, 300));
await browser.close(); server.close();
console.log(rot ? `Start-Test: ${rot} rot.` : "Start-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
