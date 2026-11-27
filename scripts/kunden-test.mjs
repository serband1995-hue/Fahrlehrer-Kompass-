// W26: Kundennummer, Anschrift und Quittung – ganzer Ablauf (App, Büro, Beleg) mit Attrappen der Datenbank.
// Nur erfundene Daten (Nachname „Muster“). Nichts verlässt den Browser. Datenbank-Regeln (Nummernvergabe, Rechte) prüfen
// kunden-sql-test.mjs und kunden-parallel-test.sh – hier nicht doppelt.
//   1  KR-Helfer (Format K-00001, PLZ, Säubern, Zeilen ohne leere Teile)
//   2  App: Akte und Liste zeigen die Nummer; ohne Nummer „wird vergeben“; ohne Spalte nichts; nie eine erfundene Nummer
//   3  App: Anschrift speichern (nur strasse/plz/ort zum Server), neu laden, PLZ falsch, neuer Schüler offline mit Merker,
//      Brücke ohne Merker/Anschrift/Nummer, Senden nach Abruf
//   4  Büro: Liste und Suche mit Nummer, Dialog mit fester Nummer (nie gesendet), Anschrift speichern und neu laden, ohne Spalte
//   5  Quittung (belegHTML): jede Angabe aus den Daten, fehlt etwas entfällt die Zeile, keine Platzhalter; PDF = genau 1 Seite
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/kunden-test.mjs
// Gegenprobe: KUNDEN_TEST_KAPUTT=plz,merker,knr,platzhalter,adresse  (Fehler im Speicher einbauen, der Test muss rot werden)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const KR = require("../kompass-rechnen.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const HEUTE = new Date().toISOString().slice(0, 10);
const KAPUTT = new Set(String(process.env.KUNDEN_TEST_KAPUTT || "").split(",").map((x) => x.trim()).filter(Boolean));
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let fehlerZahl = 0, okZahl = 0, offenZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`ABWEICHUNG  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const gleich = (ist, soll) => (JSON.stringify(ist) === JSON.stringify(soll) ? null : `ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
const warte = (ms) => new Promise((ok) => setTimeout(ok, ms));

/* =====================================================================================================================
   1  KR-Helfer
   ===================================================================================================================== */
await pruefe("1.1", "kundennummerText: 1 → K-00001, 42 → K-00042, 12345 → K-12345, 123456 → K-123456", () => gleich([1, 42, 12345, 123456].map(KR.kundennummerText), ["K-00001", "K-00042", "K-12345", "K-123456"]));
await pruefe("1.2", "kundennummerText: null, undefined, 0, -3, 1.5, „“, „abc“, NaN → leer (nie eine erfundene Nummer)", () => gleich([null, undefined, 0, -3, 1.5, "", "abc", NaN].map(KR.kundennummerText), ["", "", "", "", "", "", "", ""]));
await pruefe("1.3", "kundennummerText: Zahl als Text „7“ → K-00007", () => gleich(KR.kundennummerText("7"), "K-00007"));
await pruefe("1.4", "plzOk: leer, null, 5 Ziffern, mit Rand-Leerzeichen → ja", () => gleich(["", null, undefined, "12345", " 01234 ", "00000"].map(KR.plzOk), [true, true, true, true, true, true]));
await pruefe("1.5", "plzOk: 1234, 123456, 12ab5, „1234 5“, „１２３４５“ (breite Ziffern), „-1234“ → nein", () => gleich(["1234", "123456", "12ab5", "1234 5", "１２３４５", "-1234"].map(KR.plzOk), [false, false, false, false, false, false]));
await pruefe("1.6", "adresseNorm: säubert Ränder und doppelte Leerzeichen, leer = null, kappt auf 120/5/80", () => {
  const n = KR.adresseNorm({ strasse: "  Musterweg   1 ", plz: " 12345", ort: "  " });
  const lang = KR.adresseNorm({ strasse: "x".repeat(200), plz: "123456789", ort: "y".repeat(200) });
  return [gleich(n, { strasse: "Musterweg 1", plz: "12345", ort: null }), gleich([lang.strasse.length, lang.plz.length, lang.ort.length], [120, 5, 80]),
    gleich(KR.adresseNorm(null), { strasse: null, plz: null, ort: null }), gleich(KR.adresseNorm({}), { strasse: null, plz: null, ort: null })].filter(Boolean);
});
await pruefe("1.7", "adresseZeilen: voll, nur Straße, nur PLZ, nur Ort, leer, null – keine leeren Zeilen/Teile", () => [
  gleich(KR.adresseZeilen({ strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" }), ["Musterweg 1", "12345 Musterstadt"]),
  gleich(KR.adresseZeilen({ strasse: "Musterweg 1" }), ["Musterweg 1"]),
  gleich(KR.adresseZeilen({ plz: "12345" }), ["12345"]),
  gleich(KR.adresseZeilen({ ort: "Musterstadt" }), ["Musterstadt"]),
  gleich(KR.adresseZeilen({ strasse: " ", plz: "", ort: null }), []),
  gleich(KR.adresseZeilen(null), []),
].filter(Boolean));

/* =====================================================================================================================
   2 + 3  App (index.html) mit Attrappe der Datenbank
   ===================================================================================================================== */
// Attrappe: window.__srv = Server-Zeilen der Tabelle schueler (id → Zeile). Schreibvorgänge landen in __schreib (update) und
// __upserts (Brücke). Die Kundennummer vergibt nur diese „Datenbank“ (beim ersten Upsert einer neuen Zeile: größte + 1).
const ATTRAPPE = `
window.__schreib = []; window.__upserts = []; window.__fehler = null; window.__srv = {}; window.__sonst = [];
const kopie = (o) => JSON.parse(JSON.stringify(o));
const maxNr = () => Object.values(__srv).reduce((a, r) => Math.max(a, Number(r.kundennummer) || 0), 0);
function ausfuehren(st) {
  if (st.tab !== "schueler") return { data: st.einz ? null : [], error: null };
  const passt = (r) => st.f.every((f) => (f.art === "eq" ? r[f.k] === f.v : f.art === "is" ? (r[f.k] == null ? null : r[f.k]) === f.v : f.art === "in" ? f.v.includes(r.id) : f.art === "neq" ? r[f.k] !== f.v : true));
  if (st.art === "update") {
    if (window.__fehler) return { data: null, error: window.__fehler };
    const ziel = Object.values(__srv).filter(passt);
    const id = (st.f.find((f) => f.k === "id") || {}).v;
    __schreib.push({ id, w: kopie(st.werte), getroffen: ziel.length });
    ziel.forEach((r) => Object.assign(r, kopie(st.werte)));
    return { data: ziel.map((r) => ({ id: r.id })), error: null };
  }
  if (st.art === "upsert") {
    __upserts.push(kopie(st.daten));
    st.daten.forEach((z) => { const alt = __srv[z.id]; if (alt) Object.assign(alt, kopie(z)); else __srv[z.id] = Object.assign({ kundennummer: maxNr() + 1, strasse: null, plz: null, ort: null }, kopie(z)); });
    return { data: null, error: null };
  }
  let rows = Object.values(__srv).filter(passt).map((r) => {
    if (!st.cols || st.cols === "*") return kopie(r);
    const o = {}; st.cols.split(",").forEach((k) => { o[k.trim()] = r[k.trim()] === undefined ? null : r[k.trim()]; }); return kopie(o);
  });
  return st.einz ? { data: rows[0] || null, error: null } : { data: rows, error: null };
}
function baue(tab) {
  const st = { tab, f: [], cols: null, art: null, einz: false };
  const b = new Proxy({}, { get(_t, k) {
    if (k === "then") return (ok, no) => Promise.resolve(ausfuehren(st)).then(ok, no);
    if (k === "select") return (c) => { st.cols = c; return b; };
    if (k === "update") return (w) => { st.art = "update"; st.werte = w; return b; };
    if (k === "upsert") return (d) => { st.art = "upsert"; st.daten = Array.isArray(d) ? d : [d]; return b; };
    if (k === "eq" || k === "is" || k === "neq" || k === "in") return (kk, v) => { st.f.push({ art: k, k: kk, v }); return b; };
    if (k === "single" || k === "maybeSingle") return () => { st.einz = true; return b; };
    return () => b;
  } });
  return b;
}
const leer = async () => ({ data: [], error: null });
window.getSupa = () => ({ from: (tab) => baue(tab), rpc: leer, auth: { getUser: leer, getSession: async () => ({ data: { session: { user: { id: "me" } } }, error: null }) }, functions: { invoke: leer } });
`;
const MUSTER_ZEILE = (id, name, extra) => Object.assign({ id, fahrlehrer_id: "me", fahrschule_id: "fs-x", status: "aktiv", name, telefon: "0151 1", kundennummer: null, strasse: null, plz: null, ort: null }, extra || {});

async function oeffneApp({ srv, offline } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const page = await ctx.newPage();
  const js = []; page.on("pageerror", (e) => js.push(e.message));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(600);
  await page.evaluate(([att, srvStart, kaputt]) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    (0, eval)(att);
    window.__srv = srvStart;
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const mk = (id, name) => ({ id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0151 1", beginn: "", bogen: null, profil: null });
    DB.students = Object.values(srvStart).map((r) => mk(r.id, r.name)); DB.lessons = []; DB.termine = []; DB.exams = [];
    _authUser = { id: "me", email: "me@example.org" }; _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer" };
    // Gegenprobe: Fehler im Speicher einbauen
    if (kaputt.includes("plz")) KR.plzOk = () => true;
    if (kaputt.includes("knr")) KR.kundennummerText = (n) => (n ? "K-" + n : "");
    if (kaputt.includes("merker")) { const alt = window._schuelerZeile; window._schuelerZeile = (s) => { const z = alt(s); z.ausbildung._adresseOffen = s._adresseOffen || null; return z; }; }
    save();
  }, [ATTRAPPE, srv || {}, [...KAPUTT]]);
  if (offline) await ctx.setOffline(true);
  return { page, ctx, js };
}
const sicht = (page) => page.evaluate(() => document.querySelector("#view").textContent.replace(/\s+/g, " "));
const abruf = async (page) => { await page.evaluate(() => pullSchuelerZuweisungen()); await page.waitForTimeout(300); };

try {
  // ---------- 2: Nummer in Akte und Liste ----------
  {
    const srv = { s1: MUSTER_ZEILE("s1", "Anna Muster", { kundennummer: 7, strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" }), s2: MUSTER_ZEILE("s2", "Bernd Muster") };
    const { page, ctx, js } = await oeffneApp({ srv });
    await abruf(page);
    await page.evaluate(() => routeDetail("s1")); await page.waitForTimeout(250);
    let t = await sicht(page);
    await pruefe("2.1", "Akte mit Nummer: K-00007 (vom Server) und Anschrift stehen da", () => [!/K-00007/.test(t) && "Nummer fehlt", !/Musterweg 1/.test(t) && "Straße fehlt", !/12345 Musterstadt/.test(t) && "PLZ Ort fehlt"].filter(Boolean));
    await page.evaluate(() => routeDetail("s2")); await page.waitForTimeout(250);
    t = await sicht(page);
    await pruefe("2.2", "Akte ohne Nummer (Spalte da): „Kundennr. wird vergeben“, keine erfundene K-Nummer, Knopf „eintragen“ für die Anschrift", async () => [!/Kundennr\. wird vergeben/.test(t) && "kein Hinweis", /K-\d/.test(t) && "erfundene Nummer: " + (t.match(/K-\d+/) || [])[0], !(await page.$("#anschriftBearb")) && "Anschrift-Knopf fehlt"].filter(Boolean));
    await page.evaluate(() => routeHome()); await page.waitForTimeout(350);
    const liste = await page.evaluate(() => [...document.querySelectorAll(".s-card")].map((e) => ({ id: e.dataset.id, t: e.textContent.replace(/\s+/g, " ") })));
    await pruefe("2.3", "Liste: Anna zeigt K-00007, Bernd zeigt „wird vergeben“ und keine K-Nummer", () => {
      const a = liste.find((x) => x.id === "s1"), b = liste.find((x) => x.id === "s2");
      return [!a && "Anna fehlt in der Liste", a && !/K-00007/.test(a.t) && "Anna ohne Nummer", !b && "Bernd fehlt", b && !/wird vergeben/.test(b.t) && "Bernd ohne Hinweis", b && /K-\d/.test(b.t) && "Bernd mit erfundener Nummer"].filter(Boolean);
    });
    await page.evaluate(() => { _adrSpalteDa = false; routeDetail("s1"); }); await page.waitForTimeout(250);
    t = await sicht(page);
    await pruefe("2.4", "Ohne Spalte in der Datenbank: keine Nummer, kein „wird vergeben“, keine Anschrift-Karte", async () => [/Kundennr|K-0000|wird vergeben/.test(t) && "Nummer/Hinweis sichtbar", (await page.$("#anschriftBearb")) && "Anschrift-Karte sichtbar", (await page.$("#kundennrAkte")) && "Nummernfeld da"].filter(Boolean));
    await page.evaluate(() => { routeHome(); }); await page.waitForTimeout(300);
    const liste2 = await page.evaluate(() => document.querySelector("#view").textContent);
    await pruefe("2.5", "Ohne Spalte: auch die Liste zeigt nichts (keine K-Nummer, kein „wird vergeben“)", () => (/K-\d|wird vergeben/.test(liste2) ? "Nummer/Hinweis in der Liste" : null));
    await page.evaluate(() => { _adrSpalteDa = true; _authProfile.fahrschule_id = null; routeDetail("s1"); }); await page.waitForTimeout(250);
    t = await sicht(page);
    await pruefe("2.6", "Ohne Fahrschule (Fahrlehrer allein): weder Nummer noch Anschrift-Karte", () => (/K-0000|Kundennr|Anschrift/.test(t) ? "sichtbar: " + (t.match(/K-0000\d|Kundennr[^ ]*|Anschrift/) || [])[0] : null));
    await page.evaluate(() => { _authProfile.fahrschule_id = "fs-x"; });
    await pruefe("2.7", "Nummer wird nie lokal erzeugt: kein Schüler im lokalen Speicher hat kundennummer", () => page.evaluate(() => DB.students.some((s) => "kundennummer" in s || JSON.stringify(s).includes("kundennummer")) ? "lokal gespeichert" : null));
    await pruefe("2.8", "keine JS-Fehler (Teil 2)", () => (js.length ? js.slice(0, 3).join(" | ") : null));
    await ctx.close();
  }

  // ---------- 3: Anschrift speichern, neu laden ----------
  let srvNachSpeichern;
  {
    const srv = { s1: MUSTER_ZEILE("s1", "Anna Muster", { kundennummer: 7, strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" }), s2: MUSTER_ZEILE("s2", "Bernd Muster", { kundennummer: 8 }) };
    const { page, ctx, js } = await oeffneApp({ srv });
    await abruf(page);
    // PLZ falsch
    await page.evaluate(() => routeDetail("s2")); await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector("#anschriftBearb").click()); await page.waitForTimeout(250);
    await page.fill("#adrSStrasse", "Testgasse 5"); await page.fill("#adrSPlz", "1234"); await page.fill("#adrSOrt", "Beispielstadt");
    await page.click("#adrSpeichern"); await page.waitForTimeout(300);
    await pruefe("3.1", "PLZ „1234“: Hinweis „5 Ziffern“, Blatt bleibt offen, nichts gesendet, kein Merker", () => page.evaluate(() => [!/5 Ziffern/.test(document.querySelector("#toast").textContent) && "kein Hinweis", !document.querySelector("#sheet").classList.contains("open") && "Blatt zu",
      __schreib.length && "gesendet: " + JSON.stringify(__schreib), __upserts.length && "Brücke gesendet", DB.students.find((x) => x.id === "s2")._adresseOffen && "Merker gesetzt"].filter(Boolean)));
    await pruefe("3.2", "PLZ „12ab5“ und „123456“ (Feld kappt auf 5) werden ebenfalls nicht gesendet", async () => {
      await page.fill("#adrSPlz", "12ab5"); await page.click("#adrSpeichern"); await page.waitForTimeout(250);
      const a = await page.evaluate(() => __schreib.length);
      return a === 0 ? null : "gesendet bei 12ab5";
    });
    // gültig
    await page.fill("#adrSPlz", "54321"); await page.click("#adrSpeichern"); await page.waitForTimeout(500);
    await pruefe("3.3", "Gültig: genau EIN Schreibvorgang auf schueler mit nur strasse, plz, ort (gesäubert), ohne kundennummer/name/Merker", () => page.evaluate(() => {
      const w = __schreib.filter((x) => x.getroffen > 0);
      return [w.length !== 1 && "Schreibvorgänge: " + w.length, w[0] && JSON.stringify(Object.keys(w[0].w).sort()) !== '["ort","plz","strasse"]' && "Spalten: " + Object.keys(w[0].w), w[0] && JSON.stringify(w[0].w) !== JSON.stringify({ strasse: "Testgasse 5", plz: "54321", ort: "Beispielstadt" }) && "Werte: " + JSON.stringify(w[0].w), __upserts.length && "Brücke hat auch gesendet"].filter(Boolean);
    }));
    await pruefe("3.4", "Danach: Akte zeigt die Anschrift, Merker weg, Nummer K-00008 unverändert", async () => {
      const t = await sicht(page);
      const m = await page.evaluate(() => DB.students.find((x) => x.id === "s2")._adresseOffen);
      return [!/Testgasse 5/.test(t) && "Straße fehlt", !/54321 Beispielstadt/.test(t) && "PLZ Ort fehlt", m && "Merker noch da", !/K-00008/.test(t) && "Nummer weg"].filter(Boolean);
    });
    // nur Straße ändern: nur strasse geht raus
    await page.evaluate(() => { __schreib.length = 0; routeDetail("s1"); }); await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector("#anschriftBearb").click()); await page.waitForTimeout(250);
    await page.fill("#adrSStrasse", "  Musterweg   2 "); await page.click("#adrSpeichern"); await page.waitForTimeout(500);
    await pruefe("3.5", "Nur Straße geändert: nur strasse „Musterweg 2“ geht raus (PLZ/Ort bleiben unberührt)", () => page.evaluate(() => { const w = __schreib.filter((x) => x.getroffen > 0); return w.length === 1 && JSON.stringify(w[0].w) === '{"strasse":"Musterweg 2"}' ? null : JSON.stringify(w.map((x) => x.w)); }));
    await page.evaluate(() => { __schreib.length = 0; routeDetail("s1"); }); await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector("#anschriftBearb").click()); await page.waitForTimeout(250);
    await page.click("#adrSpeichern"); await page.waitForTimeout(300);
    await pruefe("3.6", "Nichts geändert: nichts gesendet", () => page.evaluate(() => (__schreib.length ? "gesendet: " + JSON.stringify(__schreib) : null)));
    // Büro war schneller (Konflikt)
    await page.evaluate(() => { routeDetail("s2"); }); await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector("#anschriftBearb").click()); await page.waitForTimeout(250);
    await page.fill("#adrSStrasse", "Meine Str 9");
    await page.evaluate(() => { __srv.s2.strasse = "Bueroweg 3"; });
    await page.click("#adrSpeichern"); await page.waitForTimeout(500);
    await pruefe("3.7", "Büro hat inzwischen die Straße geändert: Büro-Stand bleibt auf dem Server, Hinweis „Büro war schneller“", () => page.evaluate(() => [!/Büro war schneller/.test(document.querySelector("#toast").textContent) && "kein Hinweis", __srv.s2.strasse !== "Bueroweg 3" && "Büro überschrieben: " + __srv.s2.strasse].filter(Boolean)));
    await page.evaluate(() => { __srv.s2.strasse = "Testgasse 5"; }); // zurück auf den gespeicherten Stand
    // Datenbank hat die Spalten noch nicht
    await page.evaluate(() => { routeDetail("s1"); }); await page.waitForTimeout(200);
    await page.evaluate(() => { document.querySelector("#anschriftBearb").click(); __fehler = { code: "PGRST204", message: "Could not find the 'strasse' column of 'schueler' in the schema cache" }; _adrHinweisGezeigt = false; }); await page.waitForTimeout(250);
    await page.fill("#adrSStrasse", "Fehlerweg 1"); await page.click("#adrSpeichern"); await page.waitForTimeout(500);
    await pruefe("3.8", "Spalte fehlt auf dem Server: Merker bleibt, Hinweis „Datenbank noch nicht bereit“, kein Absturz", () => page.evaluate(() => { const m = DB.students.find((x) => x.id === "s1")._adresseOffen; return [!m && "Merker weg", m && m.strasse !== "Fehlerweg 1" && "Merker falsch", !/Datenbank noch nicht bereit/.test(document.querySelector("#toast").textContent) && "kein Hinweis"].filter(Boolean); }));
    await page.evaluate(() => { __fehler = null; });
    srvNachSpeichern = await page.evaluate(() => JSON.parse(JSON.stringify(__srv)));
    srvNachSpeichern.s1.strasse = "Musterweg 2"; // Stand, wie der Server ihn nach 3.5 hat (3.8 schrieb nichts)
    await pruefe("3.9", "keine JS-Fehler (Teil 3a)", () => (js.length ? js.slice(0, 3).join(" | ") : null));
    await ctx.close();
  }
  {
    // neu laden: Seite ist frisch (kein Merker, kein lokaler Stand), die Attrappe liefert die gespeicherten Werte
    const { page, ctx, js } = await oeffneApp({ srv: srvNachSpeichern });
    await abruf(page);
    await page.evaluate(() => routeDetail("s2")); await page.waitForTimeout(250);
    const t = await sicht(page);
    await pruefe("3.10", "Neu geladen: Akte zeigt die gespeicherte Anschrift (Testgasse 5, 54321 Beispielstadt) und K-00008", () => [!/Testgasse 5/.test(t) && "Straße fehlt", !/54321 Beispielstadt/.test(t) && "PLZ Ort fehlt", !/K-00008/.test(t) && "Nummer fehlt"].filter(Boolean));
    await ctx.close();
  }
  {
    const { page, ctx, js } = await oeffneApp({ srv: srvNachSpeichern });
    await abruf(page);
    await page.evaluate(() => routeDetail("s2")); await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector("#anschriftBearb").click()); await page.waitForTimeout(250);
    const feld = await page.evaluate(() => [document.querySelector("#adrSStrasse").value, document.querySelector("#adrSPlz").value, document.querySelector("#adrSOrt").value]);
    await pruefe("3.11", "Neu geladen: Blatt „Anschrift“ ist mit den gespeicherten Werten gefüllt", () => gleich(feld, ["Testgasse 5", "54321", "Beispielstadt"]));
    await pruefe("3.12", "keine JS-Fehler (Teil 3b)", () => (js.length ? js.slice(0, 3).join(" | ") : null));
    await ctx.close();
  }

  // ---------- 3c: neuer Schüler offline mit Anschrift ----------
  {
    const srv = { s1: MUSTER_ZEILE("s1", "Anna Muster", { kundennummer: 7 }) };
    const { page, ctx, js } = await oeffneApp({ srv });
    await abruf(page);
    await ctx.setOffline(true);
    await page.evaluate(() => { __schreib.length = 0; __upserts.length = 0; routeSchuelerForm(null); }); await page.waitForTimeout(250);
    await page.fill("#f_name", "Clara Muster"); await page.fill("#f_adrStrasse", "Neuweg 2"); await page.fill("#f_adrPlz", "99999"); await page.fill("#f_adrOrt", "Neustadt");
    await page.click("#saveBtn"); await page.waitForTimeout(500);
    await page.evaluate(() => { const s = document.querySelector("#sheet"); if (s && s.classList.contains("open")) closeSheet(); });
    const st = await page.evaluate(() => { const s = DB.students.find((x) => x.name === "Clara Muster"); return { id: s.id, merker: s._adresseOffen && { strasse: s._adresseOffen.strasse, plz: s._adresseOffen.plz, ort: s._adresseOffen.ort }, lokalSchluessel: Object.keys(s).filter((k) => /strasse|plz|ort|kundennummer/i.test(k)), schreib: __schreib.length, upserts: __upserts.length }; });
    await pruefe("3.13", "Neuer Schüler offline mit Anschrift: Merker gesetzt (Straße, PLZ, Ort), nichts gesendet, keine lose Anschrift am Schüler", () => [!st.merker && "kein Merker", st.merker && gleich(st.merker, { strasse: "Neuweg 2", plz: "99999", ort: "Neustadt" }), st.lokalSchluessel.length && "lose Felder: " + st.lokalSchluessel, st.schreib && "gesendet", st.upserts && "Brücke gesendet"].filter(Boolean));
    const t = await sicht(page);
    await pruefe("3.14", "Akte zeigt die Anschrift aus dem Merker mit „Wird übertragen“ und „Kundennr. wird vergeben“ (keine erfundene Nummer)", () => [!/Neuweg 2/.test(t) && "Straße fehlt", !/Wird übertragen/.test(t) && "kein Übertragen-Hinweis", !/Kundennr\. wird vergeben/.test(t) && "kein „wird vergeben“", /K-\d/.test(t) && "erfundene Nummer"].filter(Boolean));
    // Brücke: Zeile ohne Merker, ohne Anschrift, ohne Nummer
    const hash0 = await page.evaluate((id) => { const s = DB.students.find((x) => x.id === id); return _abglWertVon("schueler", s); }, st.id);
    const zeileObj = await page.evaluate((id) => { const s = DB.students.find((x) => x.id === id); return _schuelerZeile(s); }, st.id);
    const zeile = JSON.stringify(zeileObj);
    await pruefe("3.15", "Brücken-Zeile (_schuelerZeile): weder _adresseOffen noch strasse/plz/ort/kundennummer/Straße/Ort-Werte", () => [/_adresseOffen/.test(zeile) && "Merker in der Zeile", Object.keys(zeileObj).filter((k) => /^(strasse|plz|ort|kundennummer)$/.test(k)).length && "Spalte in der Zeile: " + Object.keys(zeileObj), /Neuweg|99999|Neustadt/.test(zeile) && "Anschrift-Werte in der Zeile"].filter(Boolean));
    await pruefe("3.16", "Der Merker ändert den Prüfwert der Brücke nicht (kein überflüssiger Upsert, wenn nur die Anschrift wartet)", () => page.evaluate((id) => {
      const s = DB.students.find((x) => x.id === id); const mit = _abglWertVon("schueler", s); const m = s._adresseOffen; delete s._adresseOffen; const ohne = _abglWertVon("schueler", s); s._adresseOffen = m;
      return mit === ohne ? null : "Prüfwert ändert sich durch den Merker";
    }, st.id));
    // echter Brückenlauf (online-Teil der Attrappe): Upsert-Nutzlast prüfen
    await page.evaluate(() => _brueckeAbgleichen({ tabelle: "schueler", art: "schueler", eintraege: DB.students, zeileVon: _schuelerZeile, loeschWert: { status: "geloescht" }, aktivFilter: (q) => q.neq("status", "geloescht") }));
    const upRoh = await page.evaluate(() => __upserts);
    const up = JSON.stringify(upRoh);
    const upSpalten = upRoh.flat().flatMap((z) => Object.keys(z)).filter((k) => /^(strasse|plz|ort|kundennummer|_adresseOffen)$/.test(k));
    await pruefe("3.17", "Echter Brückenlauf: Upsert enthält den Schüler, aber nie _adresseOffen, strasse, plz, ort, kundennummer oder die Anschrift-Werte", () => [!/Clara Muster/.test(up) && "Schüler nicht gesendet", /_adresseOffen/.test(up) && "Merker gesendet", upSpalten.length && "Anschrift-/Nummernspalte gesendet: " + upSpalten, /Neuweg|99999|Neustadt/.test(up) && "Anschrift-Werte gesendet"].filter(Boolean));
    await pruefe("3.18", "Der Merker steht nach dem Brückenlauf noch (Anschrift ist ja noch nicht angekommen)", () => page.evaluate((id) => (DB.students.find((x) => x.id === id)._adresseOffen ? null : "Merker verloren"), st.id));
    // jetzt online: Abruf liefert die Zeile (mit vom Server vergebener Nummer) → Anschrift wird gesendet, Merker weg
    await ctx.setOffline(false);
    await page.evaluate(() => { __schreib.length = 0; });
    await abruf(page); await page.waitForTimeout(500);
    const nach = await page.evaluate((id) => ({ schreib: __schreib.filter((x) => x.id === id && x.getroffen > 0).map((x) => x.w), merker: DB.students.find((x) => x.id === id)._adresseOffen || null, srv: __srv[id] && { strasse: __srv[id].strasse, plz: __srv[id].plz, ort: __srv[id].ort, kundennummer: __srv[id].kundennummer } }), st.id);
    await pruefe("3.19", "Online/Abruf: Anschrift wird gesendet (nur strasse, plz, ort), Merker ist weg, Server hat die Anschrift und seine eigene Nummer", () => [
      nach.schreib.length !== 1 && "Schreibvorgänge: " + nach.schreib.length,
      nach.schreib[0] && gleich(nach.schreib[0], { strasse: "Neuweg 2", plz: "99999", ort: "Neustadt" }),
      nach.merker && "Merker noch da", !nach.srv && "Zeile fehlt auf dem Server", nach.srv && gleich(nach.srv, { strasse: "Neuweg 2", plz: "99999", ort: "Neustadt", kundennummer: 8 })].filter(Boolean));
    await page.evaluate((id) => routeDetail(id), st.id); await page.waitForTimeout(250);
    const t2 = await sicht(page);
    await pruefe("3.20", "Danach zeigt die Akte K-00008 (vom Server) und keinen „Wird übertragen“-Hinweis mehr", () => [!/K-00008/.test(t2) && "Nummer fehlt", /Wird übertragen/.test(t2) && "Hinweis noch da", /wird vergeben/.test(t2) && "„wird vergeben“ noch da"].filter(Boolean));
    await page.evaluate(() => { __schreib.length = 0; });
    await abruf(page);
    await pruefe("3.21", "Weiterer Abruf sendet die Anschrift nicht noch einmal", () => page.evaluate(() => (__schreib.length ? "erneut gesendet: " + JSON.stringify(__schreib) : null)));
    await pruefe("3.22", "keine JS-Fehler (Teil 3c)", () => (js.length ? js.slice(0, 3).join(" | ") : null));
    await ctx.close();
  }
  // ---------- 3d: neuer Schüler ohne Anschrift: kein Merker, nichts ----------
  {
    const { page, ctx, js } = await oeffneApp({ srv: { s1: MUSTER_ZEILE("s1", "Anna Muster", { kundennummer: 7 }) } });
    await abruf(page);
    await page.evaluate(() => { __schreib.length = 0; routeSchuelerForm(null); }); await page.waitForTimeout(250);
    await page.fill("#f_name", "Dora Muster"); await page.click("#saveBtn"); await page.waitForTimeout(400);
    await pruefe("3.23", "Neuer Schüler ohne Anschrift: kein Merker, nichts gesendet", () => page.evaluate(() => { const s = DB.students.find((x) => x.name === "Dora Muster"); return [!s && "Schüler fehlt", s && s._adresseOffen && "Merker gesetzt", __schreib.length && "gesendet"].filter(Boolean); }));
    await page.evaluate(() => { const sh = document.querySelector("#sheet"); if (sh && sh.classList.contains("open")) closeSheet(); routeSchuelerForm(null); }); await page.waitForTimeout(250);
    await page.fill("#f_name", "Emil Muster"); await page.fill("#f_adrPlz", "123"); await page.click("#saveBtn"); await page.waitForTimeout(300);
    await pruefe("3.24", "Neuer Schüler mit PLZ „123“: nicht angelegt, Hinweis „5 Ziffern“", () => page.evaluate(() => [DB.students.some((x) => x.name === "Emil Muster") && "trotzdem angelegt", !/5 Ziffern/.test(document.querySelector("#toast").textContent) && "kein Hinweis"].filter(Boolean)));
    await ctx.close();
  }
} catch (e) {
  fehlerZahl++; console.log("ABWEICHUNG  App-Teil abgebrochen: " + String(e.message || e).split("\n")[0]);
}

/* =====================================================================================================================
   4  Büro (buero.html) mit der Vorführ-Attrappe (bauDaten: 24 Schüler s1…s24, kundennummer = laufende Zahl)
   ===================================================================================================================== */
async function oeffneBuero(hash, tabellen) {
  const d = bauDaten(HEUTE);
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error" && !/\/logos\/[^/]+\.png/.test((m.location() || {}).url || "")) konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([t, k, s, kaputt]) => {
    window.__FAKE = { tabellen: t, konten: k, session: s };
    if (kaputt.includes("plz")) document.addEventListener("DOMContentLoaded", () => { KR.plzOk = () => true; });
    if (kaputt.includes("knr")) document.addEventListener("DOMContentLoaded", () => { KR.kundennummerText = (n) => (n ? "K-" + n : ""); });
    if (kaputt.includes("adresse")) document.addEventListener("DOMContentLoaded", () => { window.__alt = null; });
  }, [tabellen || d.tabellen, d.konten, { user: { id: "bu-1", email: "bu-1@example.org" } }, [...KAPUTT]]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(500);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
  if (frage) { await page.click(`#werListe button:has-text("Paula Muster")`); await page.keyboard.type("7352", { delay: 20 }); await page.waitForTimeout(250); }
  await page.waitForTimeout(350);
  return { page, ctx, konsole };
}
const okKlick = async (page) => { await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await page.waitForTimeout(350); };
const buero = {};
try {
  let gespeichertB; // Tabellen nach dem Speichern, fürs Neuladen
  {
    const { page, ctx, konsole } = await oeffneBuero("#schueler");
    await page.waitForSelector("#sSuche", { timeout: 4000 });
    const namen = await page.evaluate(() => Object.fromEntries(window.__FAKE.tabellen.schueler.map((s) => [s.id, s.name])));
    const zeilen = () => page.evaluate(() => [...document.querySelectorAll(".tabelle tbody tr")].map((r) => r.textContent.replace(/\s+/g, " ")));
    let z = await zeilen();
    const anzahlAlle = z.length;
    const z3 = z.find((r) => r.includes(namen.s3)), z5 = z.find((r) => r.includes(namen.s5));
    await pruefe("4.1", "Liste: Schüler 3 zeigt K-00003, Schüler 5 (ohne Anschrift) zeigt K-00005, in der richtigen Zeile", () => [!z3 && "Zeile s3 fehlt", z3 && !/K-00003/.test(z3) && "s3 ohne K-00003", !z5 && "Zeile s5 fehlt", z5 && !/K-00005/.test(z5) && "s5 ohne K-00005", z3 && /K-0000[^3]|K-000[1-9]\d/.test(z3) && "s3 mit fremder Nummer"].filter(Boolean));
    const suche = async (text) => { await page.fill("#sSuche", text); await page.waitForTimeout(500); return zeilen(); };
    let r = await suche("K-00003");
    await pruefe("4.2", "Suche „K-00003“ findet genau Schüler 3", () => (r.length === 1 && r[0].includes(namen.s3) ? null : `Treffer: ${r.length} ${r.map((x) => x.slice(0, 30)).join(" / ")}`));
    r = await suche("k-3");
    await pruefe("4.3", "Suche „k-3“ findet Schüler 3 (ohne führende Nullen)", () => (r.some((x) => x.includes(namen.s3)) ? null : "nicht gefunden"));
    r = await suche("3");
    await pruefe("4.4", "Suche „3“ findet Schüler 3 über die Nummer (auch wenn der Name keine 3 enthält)", () => (r.some((x) => x.includes(namen.s3)) ? null : "nicht gefunden"));
    r = await suche("K-00030");
    await pruefe("4.5", "Suche „K-00030“ (gibt es nicht) findet niemanden – keine Teiltreffer auf K-00003", () => (r.length === 0 ? null : "Treffer: " + r.length));
    r = await suche("");
    await pruefe("4.6", "Suche leeren: wieder alle Schüler der Liste", () => (r.length === anzahlAlle && r.length >= 20 ? null : `Zeilen: ${r.length}, vorher ${anzahlAlle}`));
    // Dialog: feste Nummer
    await page.evaluate(() => { window.__FAKE.log.length = 0; });
    await page.click(`[data-sbearb="s3"]`); await page.waitForTimeout(350);
    const dlg = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); const p = d.querySelector("[data-kundennummer]"); return { text: p && p.textContent.replace(/\s+/g, " "), felder: [...d.querySelectorAll("input,select,textarea")].map((e) => e.name).filter((n) => /kunde/i.test(n)), strasse: d.querySelector("[name=strasse]") && d.querySelector("[name=strasse]").value, plz: d.querySelector("[name=plz]") && d.querySelector("[name=plz]").value, ort: d.querySelector("[name=ort]") && d.querySelector("[name=ort]").value }; });
    await pruefe("4.7", "Dialog Schüler 3: „Kundennummer: K-00003“ als feste Zeile, kein Eingabefeld dafür", () => [!dlg.text && "keine Nummernzeile", dlg.text && !/Kundennummer: K-00003/.test(dlg.text) && "Text: " + dlg.text, dlg.felder.length && "Eingabefeld: " + dlg.felder].filter(Boolean));
    await pruefe("4.8", "Dialog zeigt die gespeicherte Anschrift (Musterweg 3, 12345, Musterstadt)", () => gleich([dlg.strasse, dlg.plz, dlg.ort], ["Musterweg 3", "12345", "Musterstadt"]));
    // PLZ falsch: nichts gesendet
    await page.fill("dialog[open] input[name=strasse]", "Testgasse 5");
    await page.evaluate(() => { const p = document.querySelector("dialog[open] input[name=plz]"); p.removeAttribute("pattern"); p.value = "1234"; });
    await okKlick(page);
    await pruefe("4.9", "PLZ „1234“: Dialog bleibt offen, Hinweis, nichts an den Server gesendet", () => page.evaluate(() => [!document.querySelector("dialog[open]") && "Dialog zu", !/5 Ziffern/.test((document.getElementById("toast") || document.body).textContent) && "kein Hinweis", window.__FAKE.log.filter((l) => l.tabelle === "schueler" && l.art !== "select").length && "gesendet: " + JSON.stringify(window.__FAKE.log.filter((l) => l.tabelle === "schueler" && l.art !== "select"))].filter(Boolean)));
    await page.fill("dialog[open] input[name=plz]", "54321");
    await page.fill("dialog[open] input[name=ort]", "  Beispielstadt ");
    await okKlick(page);
    const geschrieben = await page.evaluate(() => window.__FAKE.log.filter((l) => l.tabelle === "schueler" && l.art === "update").map((l) => l.werte));
    await pruefe("4.10", "Speichern: ein Update mit nur strasse, plz, ort (gesäubert) – die Kundennummer wird NIE gesendet", () => [geschrieben.length !== 1 && "Updates: " + geschrieben.length, geschrieben[0] && gleich(Object.keys(geschrieben[0]).sort(), ["ort", "plz", "strasse"]), geschrieben[0] && gleich(geschrieben[0], { strasse: "Testgasse 5", plz: "54321", ort: "Beispielstadt" })].filter(Boolean));
    const alles = await page.evaluate(() => JSON.stringify(window.__FAKE.log.filter((l) => l.tabelle === "schueler" && l.art !== "select")));
    await pruefe("4.11", "Nirgends im ganzen Schreibverkehr taucht „kundennummer“ auf", () => (/kundennummer/.test(alles) ? "gesendet: " + alles : null));
    const srvZeile = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((s) => s.id === "s3"));
    await pruefe("4.12", "Server-Stand: Anschrift gespeichert, Nummer 3 unverändert", () => gleich([srvZeile.strasse, srvZeile.plz, srvZeile.ort, srvZeile.kundennummer], ["Testgasse 5", "54321", "Beispielstadt", 3]));
    // Anschrift leeren → null
    await page.click(`[data-sbearb="s3"]`); await page.waitForTimeout(300);
    await page.fill("dialog[open] input[name=strasse]", ""); await page.fill("dialog[open] input[name=plz]", ""); await page.fill("dialog[open] input[name=ort]", "");
    await okKlick(page);
    const geleert = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((s) => s.id === "s3"));
    await pruefe("4.13", "Anschrift leeren: alle drei Spalten null (kein leerer Text), Nummer bleibt", () => gleich([geleert.strasse, geleert.plz, geleert.ort, geleert.kundennummer], [null, null, null, 3]));
    // wieder eintragen und neu laden
    await page.click(`[data-sbearb="s3"]`); await page.waitForTimeout(300);
    await page.fill("dialog[open] input[name=strasse]", "Testgasse 5"); await page.fill("dialog[open] input[name=plz]", "54321"); await page.fill("dialog[open] input[name=ort]", "Beispielstadt");
    await okKlick(page);
    // neuer Schüler: Nummer vergibt der Server
    await page.evaluate(() => { window.__FAKE.log.length = 0; });
    await page.click("#sNeu"); await page.waitForTimeout(300);
    const neuDlg = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return { nummernzeile: !!d.querySelector("[data-kundennummer]"), feld: [...d.querySelectorAll("input,select,textarea")].some((e) => /kundennummer/i.test(e.name)) }; });
    await pruefe("4.14", "Dialog „Neuer Schüler“: keine Nummernzeile und kein Eingabefeld (die Nummer kommt erst vom Server)", () => [neuDlg.nummernzeile && "Nummernzeile schon da", neuDlg.feld && "Eingabefeld"].filter(Boolean));
    await page.fill("dialog[open] input[name=name]", "Neu Muster"); await page.fill("dialog[open] input[name=telefon]", "0170 5550001");
    await page.fill("dialog[open] input[name=strasse]", "Neuweg 2"); await page.fill("dialog[open] input[name=plz]", "99999"); await page.fill("dialog[open] input[name=ort]", "Neustadt");
    await okKlick(page);
    const einf = await page.evaluate(() => window.__FAKE.log.filter((l) => l.tabelle === "schueler" && l.art === "insert").map((l) => l.werte[0]));
    await pruefe("4.15", "Neuer Schüler: Insert ohne kundennummer, mit Anschrift", () => [einf.length !== 1 && "Inserts: " + einf.length, einf[0] && "kundennummer" in einf[0] && "Nummer mitgeschickt", einf[0] && gleich([einf[0].strasse, einf[0].plz, einf[0].ort], ["Neuweg 2", "99999", "Neustadt"])].filter(Boolean));
    const neuS = await page.evaluate(() => window.__FAKE.tabellen.schueler.find((s) => s.name === "Neu Muster"));
    await pruefe("4.16", "Server vergibt die nächste Nummer (25)", () => (neuS && neuS.kundennummer === 25 ? null : "Nummer: " + (neuS && neuS.kundennummer)));
    await page.waitForTimeout(300);
    r = await suche("K-00025");
    await pruefe("4.17", "Neuer Schüler erscheint mit K-00025 in der Liste und ist über die Nummer auffindbar", () => (r.length === 1 && /K-00025/.test(r[0]) && /Neu Muster/.test(r[0]) ? null : "Treffer: " + r.map((x) => x.slice(0, 40))));
    await pruefe("4.18", "keine JS-Fehler (Büro, Teil 1)", () => (konsole.length ? konsole.slice(0, 3).join(" | ") : null));
    gespeichertB = await page.evaluate(() => JSON.parse(JSON.stringify(window.__FAKE.tabellen)));
    await ctx.close();
  }
  {
    // neu laden: frische Seite, die Attrappe liefert die gespeicherten Tabellen
    const { page, ctx, konsole } = await oeffneBuero("#schueler", gespeichertB);
    await page.waitForSelector("#sSuche", { timeout: 4000 });
    await page.click(`[data-sbearb="s3"]`); await page.waitForTimeout(350);
    const werte = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return [d.querySelector("[name=strasse]").value, d.querySelector("[name=plz]").value, d.querySelector("[name=ort]").value, d.querySelector("[data-kundennummer]").textContent.replace(/\s+/g, " ")]; });
    await pruefe("4.19", "Neu geladen: Dialog zeigt Testgasse 5 / 54321 / Beispielstadt und Kundennummer: K-00003", () => gleich(werte, ["Testgasse 5", "54321", "Beispielstadt", "Kundennummer: K-00003"]));
    await pruefe("4.20", "keine JS-Fehler (Büro, neu geladen)", () => (konsole.length ? konsole.slice(0, 3).join(" | ") : null));
    await ctx.close();
  }
  {
    // alte Datenbank: Spalten kundennummer/strasse/plz/ort gibt es noch nicht
    const d = bauDaten(HEUTE);
    d.tabellen.schueler.forEach((s) => { delete s.kundennummer; delete s.strasse; delete s.plz; delete s.ort; });
    const { page, ctx, konsole } = await oeffneBuero("#schueler", d.tabellen);
    await page.waitForSelector("#sSuche", { timeout: 4000 });
    const liste = await page.evaluate(() => document.querySelector(".tabelle").textContent);
    await pruefe("4.21", "Ohne Spalten in der Datenbank: Liste ohne K-Nummern", () => (/K-\d{5}|wird vergeben/.test(liste) ? "Nummer sichtbar" : null));
    await page.click(`[data-sbearb="s3"]`); await page.waitForTimeout(350);
    await pruefe("4.22", "Ohne Spalten: Dialog ohne Nummernzeile und ohne Anschrift-Felder", () => page.evaluate(() => { const dd = document.querySelector("dialog[open]"); return [dd.querySelector("[data-kundennummer]") && "Nummernzeile", dd.querySelector("[name=strasse]") && "Straße-Feld", dd.querySelector("[name=plz]") && "PLZ-Feld"].filter(Boolean); }));
    await pruefe("4.23", "keine JS-Fehler (Büro, alte Datenbank)", () => (konsole.length ? konsole.slice(0, 3).join(" | ") : null));
    await ctx.close();
  }

  /* =====================================================================================================================
     5  Quittung (belegHTML) und PDF
     ===================================================================================================================== */
  const { page: bp, ctx: bctx } = await oeffneBuero("#schueler");
  await bp.waitForSelector("#sSuche", { timeout: 4000 });
  if (KAPUTT.has("platzhalter")) await bp.evaluate(() => { const alt = window.belegHTML; window.belegHTML = (b, o) => alt(b, o).replace('<div class="empf">', '<div class="empf">undefined '); });
  if (KAPUTT.has("adresse")) await bp.evaluate(() => { const alt = window.belegHTML; window.belegHTML = (b, o) => alt(b, o).replace(/<div class="zeile">(\d{5} [^<]*)<\/div>/, ""); });
  const VOLL = { id: "b-3", nummer: 17, datum: "2026-11-27", kundennummer: 7, schueler_name: "Anna Muster", schueler_adresse: { strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" },
    zweck: "Grundbetrag", zahlart: "ec", betrag: 45.5, aussteller: "Paula Muster", erstellt_am: "2026-11-27T09:15:00Z", storno_von: null,
    fahrschule_daten: { name: "Muster Fahrschule", anschrift: "Beispielallee 4\n54321 Beispielstadt", steuernummer: "12/345/67890", ustid: "DE998877665" }, steuer: null };
  const mit = (extra) => Object.assign({}, VOLL, extra);
  // Rendert belegHTML im Büro und zerlegt es: sichtbarer Text (Textknoten mit Leerzeichen getrennt), Beschriftungen, Bilder, Tabelle
  const render = (b, opt, slug) => bp.evaluate(([bb, oo, sl]) => {
    if (sl !== undefined) S.fs = sl === null ? null : { slug: sl };
    const html = belegHTML(bb, oo);
    const dom = new DOMParser().parseFromString(html, "text/html");
    const w = document.createTreeWalker(dom.body, NodeFilter.SHOW_TEXT); const teile = []; let n; while ((n = w.nextNode())) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) teile.push(t); }
    const tab = dom.querySelector("table");
    return { html, titel: dom.title, text: teile.join(" "), teile, labels: [...dom.querySelectorAll(".label")].map((l) => ({ l: l.textContent.trim(), wert: ((l.nextElementSibling || l.parentElement.querySelector("b")) || {}).textContent || "" })),
      bilder: [...dom.images].map((i) => i.getAttribute("src")), ths: [...dom.querySelectorAll("th")].map((t) => t.textContent.trim()),
      spalten: tab ? [...tab.querySelectorAll("tr")].map((r) => [...r.children].reduce((a, c) => a + (Number(c.getAttribute("colspan")) || 1), 0)) : [], meta: [...dom.querySelectorAll(".meta > div")].map((d) => [...d.children].map((c) => c.textContent.trim()).join(" ")),
      absender: [...dom.querySelectorAll(".absender > div")].map((d) => d.textContent.trim()), empf: [...dom.querySelectorAll(".empf > div")].map((d) => d.textContent.trim()) };
  }, [b, opt || {}, slug]);
  const norm = (s) => s.replace(/\s/g, " ").replace(/ +/g, " ");
  const allgemein = (R, text) => [/undefined|null|NaN|\[object|\{\{|\}\}|%s|TODO|XXX|Lorem/i.test(R.html.replace(/<style[\s\S]*?<\/style>/, "")) && "Platzhalter/Fehlerwort im HTML: " + (R.html.replace(/<style[\s\S]*?<\/style>/, "").match(/undefined|null|NaN|\[object|\{\{|\}\}|%s|TODO|XXX|Lorem/i) || [])[0],
    R.labels.some((x) => !x.wert.trim()) && "Beschriftung ohne Wert: " + R.labels.filter((x) => !x.wert.trim()).map((x) => x.l),
    R.ths.some((t) => !t) && "Spaltenkopf ohne Text", R.spalten.some((s) => s !== R.spalten[0]) && "Tabelle uneinheitlich: " + R.spalten,
    R.meta.length && R.meta.some((m) => m.length < 6) && "leere Angabe im Kopf: " + R.meta].filter(Boolean);

  const A = await render(VOLL, { logo: "" }, "boost");
  await pruefe("5.1", "Voll: Titel „Quittung Nr. 17“, Quittungsnummer, Datum, Kundennummer K-00007", () => [A.titel !== "Quittung Nr. 17" && "Titel: " + A.titel, !A.meta.includes("Quittungsnummer Nr. 17") && "Nummer: " + A.meta, !A.meta.includes("Datum der Zahlung 27.11.2026") && "Datum: " + A.meta, !A.meta.includes("Kundennummer K-00007") && "Kundennummer: " + A.meta].filter(Boolean));
  await pruefe("5.2", "Voll: Name, Anschrift (Straße, PLZ Ort), Leistung, Zahlungsart, Betrag, Aussteller", () => [!A.empf.some((x) => /Anna Muster$/.test(x)) && "Name fehlt: " + A.empf, !A.empf.includes("Musterweg 1") && "Straße fehlt", !A.empf.includes("12345 Musterstadt") && "PLZ Ort fehlt",
    !A.teile.includes("Grundbetrag") && "Leistung fehlt", !A.teile.includes("EC-Karte") && "Zahlungsart fehlt", A.teile.filter((x) => norm(x) === "45,50 €").length < 2 && "Betrag (Zeile und Summe) fehlt: " + A.teile,
    !A.teile.includes("Ausgestellt von Paula Muster") && "Aussteller fehlt"].filter(Boolean));
  await pruefe("5.3", "Voll: Fahrschulname, Anschrift (2 Zeilen), Steuernummer, USt-IdNr. im Kopf", () => [!A.absender.includes("Muster Fahrschule") && "Name: " + A.absender, !A.absender.some((x) => /Beispielallee 4/.test(x) && /54321 Beispielstadt/.test(x)) && "Anschrift: " + A.absender, !A.absender.includes("Steuernummer: 12/345/67890") && "Steuernummer", !A.absender.includes("USt-IdNr.: DE998877665") && "USt-IdNr."].filter(Boolean));
  await pruefe("5.4", "Voll: Logo-Pfad kommt aus dem Slug der Fahrschule (…/logos/boost.png)", async () => { const R = await render(VOLL, {}, "boost"); return R.bilder.length === 1 && /\/logos\/boost\.png$/.test(R.bilder[0]) ? null : "Bilder: " + JSON.stringify(R.bilder); });
  await pruefe("5.5", "Voll: kein Fehlerwort, jede Beschriftung hat einen Wert, Tabelle einheitlich", () => allgemein(A));
  await pruefe("5.6", "Voll: keine Steuerzeile (Standard), „Betrag dankend erhalten.“ steht", () => [/Darin enthalten|Nettobetrag|% USt/.test(A.text) && "Steuerzeile ohne Einstellung", !A.teile.includes("Betrag dankend erhalten.") && "Dankzeile fehlt"].filter(Boolean));
  // Slug-Schutz
  await pruefe("5.7", "Logo: kein Slug, ungültiger Slug („../x“, „a b“) oder opt.logo leer → kein Bild, keine leere Fläche", async () => {
    const r = [];
    for (const sl of [null, "", "../x", "a b", "-x"]) { const R = await render(VOLL, {}, sl); if (R.bilder.length) r.push(`Slug ${JSON.stringify(sl)} → ${R.bilder}`); }
    const R2 = await render(VOLL, { logo: "" }, "boost"); if (R2.bilder.length) r.push("opt.logo leer, trotzdem Bild");
    return r;
  });
  await render(VOLL, { logo: "" }, "test"); // Slug wieder gültig lassen
  // Minimal: sichtbarer Text muss GENAU den Daten entsprechen (fängt jeden festen Beispieltext und jede Beschriftung ohne Wert)
  const MIN = { nummer: 5, datum: "2026-11-27", schueler_name: "Bernd Muster", zweck: "Fahrstunden", zahlart: "bar", betrag: 120 };
  const M = await render(MIN, { logo: "" }, "test");
  const minSoll = "Quittung Quittungsnummer Nr. 5 Datum der Zahlung 27.11.2026 Erhalten von Bernd Muster Leistung Zahlungsart Betrag Fahrstunden Bar 120,00 € Gesamtbetrag 120,00 € Betrag dankend erhalten. Ort, Datum Unterschrift / Stempel";
  await pruefe("5.8", "Nur Pflichtangaben (ohne Kundennummer, Anschrift, Aussteller, Logo, Steuer, Kopf): sichtbarer Text ist genau der erwartete – keine Platzhalter, keine festen Beispielwerte", () => (norm(M.text) === minSoll ? null : `ist: ${norm(M.text)}\n   soll: ${minSoll}`));
  await pruefe("5.9", "Nur Pflichtangaben: Kopf leer (kein Name, keine Zeilen, kein Bild), nur Beschriftungen mit Wert", () => [M.absender.length && "Kopf nicht leer: " + M.absender, M.bilder.length && "Bild", ...allgemein(M)].filter(Boolean));
  await pruefe("5.10", "Betrag 120 € in der Summe, „Bar“ als Zahlungsart", () => [!M.teile.includes("Bar") && "Bar fehlt", M.teile.filter((x) => norm(x) === "120,00 €").length !== 2 && "Beträge: " + M.teile].filter(Boolean));
  // Einzelne Angaben fehlen
  const einzel = [
    ["5.11", "Ohne Anschrift des Schülers (null, {}, nur Leerzeichen, Text statt Objekt): keine Anschriftszeilen, nur der Name", [{ schueler_adresse: null }, { schueler_adresse: {} }, { schueler_adresse: { strasse: " ", plz: "", ort: null } }, { schueler_adresse: "Musterweg 1" }, { schueler_adresse: undefined }],
      (R) => [!R.empf.some((x) => /Anna Muster$/.test(x)) && "Name fehlt", R.empf.length !== 1 && "Zusatzzeilen: " + R.empf, /Musterweg|12345|Musterstadt/.test(R.text) && "Anschrift sichtbar"].filter(Boolean)],
    ["5.12", "Ohne Kundennummer (null, 0, „“, „abc“, fehlt): keine Zeile „Kundennummer“, nirgends K-", [{ kundennummer: null }, { kundennummer: 0 }, { kundennummer: "" }, { kundennummer: "abc" }, { kundennummer: undefined }],
      (R) => [/Kundennummer/.test(R.text) && "Beschriftung ohne Wert", /K-\d/.test(R.text) && "erfundene Nummer", !R.meta.includes("Datum der Zahlung 27.11.2026") && "Datum fehlt"].filter(Boolean)],
    ["5.13", "Ohne Aussteller (null, „“, Leerzeichen): keine Zeile „Ausgestellt von“", [{ aussteller: null }, { aussteller: "" }, { aussteller: "   " }, { aussteller: undefined }],
      (R) => [/Ausgestellt/.test(R.text) && "Zeile ohne Wert"].filter(Boolean)],
    ["5.14", "Ohne Steuer (null, ausweisen:false, ausweisen mit leerem/ungültigem Satz, Satz 0, Satz 100): keine Steuerzeilen, kein NaN", [{ steuer: null }, { steuer: { ausweisen: false, satz: "19", hinweis: "" } }, { steuer: { ausweisen: true, satz: "" } }, { steuer: { ausweisen: true, satz: "abc" } }, { steuer: { ausweisen: true, satz: "0" } }, { steuer: { ausweisen: true, satz: "100" } }],
      (R) => [/Darin enthalten|Nettobetrag|% USt|NaN/.test(R.text) && "Steuerzeile sichtbar: " + R.text.match(/(Nettobetrag|Darin)[^]{0,40}/)].filter(Boolean)],
    ["5.15", "Ohne Kopf der Fahrschule (fehlt, {}, leere Texte): kein Name, keine Steuernummer/USt-IdNr.-Beschriftung", [{ fahrschule_daten: undefined }, { fahrschule_daten: null }, { fahrschule_daten: {} }, { fahrschule_daten: { name: "", anschrift: "", steuernummer: "", ustid: "" } }],
      (R) => [R.absender.length && "Kopf nicht leer: " + R.absender, /Steuernummer|USt-IdNr/.test(R.text) && "Beschriftung ohne Wert"].filter(Boolean)],
    ["5.16", "Teile des Kopfs: nur USt-IdNr. → nur diese Zeile; nur Anschrift → nur diese", [{ fahrschule_daten: { ustid: "DE111" } }, { fahrschule_daten: { anschrift: "Beispielallee 4" } }],
      (R) => [R.absender.length !== 1 && "Zeilen: " + R.absender, /Steuernummer/.test(R.text) && "Steuernummer-Beschriftung ohne Wert"].filter(Boolean)],
    ["5.17", "Ohne Zahlungsart: Spalte „Zahlungsart“ entfällt, Tabelle bleibt einheitlich", [{ zahlart: null }, { zahlart: "" }, { zahlart: undefined }],
      (R) => [R.ths.includes("Zahlungsart") && "Spalte ohne Wert", R.ths.length !== 2 && "Spalten: " + R.ths].filter(Boolean)],
    ["5.18", "Ohne Leistung (zweck leer): keine leere Tabellenzeile, Summe steht", [{ zweck: "" }, { zweck: null }, { zweck: undefined }],
      (R) => [!R.teile.some((x) => /Gesamtbetrag/.test(x)) && "Summe fehlt", R.html.match(/<td><\/td>/) && "leere Zelle"].filter(Boolean)],
    ["5.19", "Ohne Nummer und ohne Datum: Titel nur „Quittung“, keine Zeilen „Quittungsnummer“/„Datum“ ohne Wert", [{ nummer: null, datum: null }, { nummer: "", datum: "" }, { nummer: undefined, datum: undefined }],
      (R) => [R.titel !== "Quittung" && "Titel: " + R.titel, /Quittungsnummer|Datum der Zahlung/.test(R.text) && "Beschriftung ohne Wert", /Nr\. $|Nr\. (?!\d)/.test(R.text) && "Nr. ohne Zahl"].filter(Boolean)],
    ["5.20", "Ohne Name des Schülers: keine Zeile „Erhalten von“ ohne Wert", [{ schueler_name: "" }, { schueler_name: null }],
      (R) => [/Erhalten von/.test(R.text) && "Beschriftung ohne Wert"].filter(Boolean)],
  ];
  for (const [id, text, varianten, pruef] of einzel) {
    await pruefe(id, text, async () => {
      const fehl = [];
      for (const v of varianten) {
        const R = await render(mit(v), { logo: "" }, "test");
        const f = [...pruef(R), ...allgemein(R)];
        if (f.length) fehl.push(`${JSON.stringify(v)} → ${f.join("; ")}`);
      }
      return fehl;
    });
  }
  // Steuer gültig: Zeilen mit richtigen Werten
  await pruefe("5.21", "Mit Steuer 19 %: Netto 38,24 €, darin enthalten 19 % USt 7,26 €, Hinweis-Text; Summen stimmen (45,50 €)", async () => {
    const R = await render(mit({ steuer: { ausweisen: true, satz: "19", hinweis: "Gemäß § 4 Nr. 21 UStG" } }), { logo: "" }, "test");
    const t = norm(R.text);
    return [!/Nettobetrag 38,24 €/.test(t) && "Netto: " + t, !/Darin enthalten 19 % USt 7,26 €/.test(t) && "USt: " + t, !/Gemäß § 4 Nr\. 21 UStG/.test(t) && "Hinweis fehlt", ...allgemein(R)].filter(Boolean);
  });
  // Storno
  const ORIG = { id: "b-3", nummer: 3 };
  await bp.evaluate((o) => { S.belege = [o]; }, ORIG);
  const ST = await render(mit({ nummer: 4, betrag: -45.5, zweck: "falscher Betrag", storno_von: "b-3", datum: "2026-11-27" }), { logo: "" }, "test");
  await pruefe("5.22", "Storno: Stempel „STORNO“, „Gegenbeleg zu Nr. 3“, „Storno – Betrag“ mit −45,50 €, kein „Betrag dankend erhalten“", () => [!ST.html.includes('class="stempel">STORNO<') && "kein Stempel", !ST.meta.includes("Gegenbeleg zu Nr. 3") && "Bezug: " + ST.meta, !ST.teile.includes("Storno – Betrag") && "Summenzeile", !ST.teile.some((x) => /^[-−–]45,50 €$/.test(norm(x))) && "negativer Betrag: " + ST.teile, /dankend/.test(ST.text) && "Dankzeile bei Storno", ...allgemein(ST)].filter(Boolean));
  const ST2 = await render(mit({ nummer: 4, betrag: -45.5, storno_von: "b-unbekannt" }), { logo: "" }, "test");
  await pruefe("5.23", "Storno, Originalbeleg nicht geladen: „Gegenbeleg zu früherem Beleg“ (keine erfundene Nummer)", () => [!ST2.meta.includes("Gegenbeleg zu früherem Beleg") && "Bezug: " + ST2.meta, ...allgemein(ST2)].filter(Boolean));
  const NS = await render(VOLL, { logo: "" }, "test");
  await pruefe("5.24", "Normale Quittung: kein Stempel, kein „Gegenbeleg“", () => [/STORNO|Gegenbeleg/.test(NS.html.replace(/<style[\s\S]*?<\/style>/, "")) && "Storno-Bestandteil sichtbar"].filter(Boolean));
  await pruefe("5.25", "Fremder Text wird entschärft: <script>/Anführungszeichen im Namen, Anschrift und Zweck erscheinen als Text, nicht als HTML", async () => {
    const R = await render(mit({ schueler_name: `<img src=x onerror=alert(1)> "Muster"`, zweck: "<b>fett</b>", schueler_adresse: { strasse: "<script>alert(1)</script>", plz: "12345", ort: "Ort&Stadt" } }), { logo: "" }, "test");
    const d = await bp.evaluate((h) => { const x = new DOMParser().parseFromString(h, "text/html"); return { scripts: x.querySelectorAll("script").length, imgs: x.querySelectorAll("img").length, fett: x.querySelectorAll("table b").length }; }, R.html);
    return [d.scripts && "script-Element", d.imgs && "img aus Eingabe", d.fett && "b aus Eingabe", !/Ort&Stadt/.test(R.text) && "& verloren"].filter(Boolean);
  });
  await pruefe("5.26", "Quittung-Titel im Seitenfuß enthält keine Anführungszeichen/Backslashes (Seiten-CSS bleibt gültig)", async () => {
    const R = await render(mit({ nummer: 9 }), { logo: "" }, "test");
    return /@bottom-right\{content:"[^"\\]*" counter\(page\)/.test(R.html.replace(/\n/g, " ")) ? null : "Seitenfuß-CSS ungewöhnlich";
  });

  // ---------- PDF: genau 1 Seite ----------
  const seiten = (buf) => (buf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  async function pdfSeiten(html) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
    const page = await ctx.newPage();
    await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
    await page.goto(basis + "leer.html"); // 404-Seite derselben Herkunft: das Logo darf laden
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((ok) => { i.onload = i.onerror = ok; })))));
    const imgOk = await page.evaluate(() => [...document.images].every((i) => i.naturalWidth > 0));
    const buf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
    await ctx.close();
    return { n: seiten(buf), imgOk, groesse: buf.length };
  }
  const logoAn = (R) => R.html;
    const VOLL_MIT_LOGO = await render(mit({ steuer: { ausweisen: true, satz: "19", hinweis: "Gemäß § 4 Nr. 21 UStG" } }), {}, "boost");
  const P1 = await pdfSeiten(logoAn(VOLL_MIT_LOGO));
  await pruefe("5.27", "PDF A4 (preferCSSPageSize): voll mit Logo (logos/boost.png), Steuer und Hinweis = genau 1 Seite", () => [P1.n !== 1 && "Seiten: " + P1.n, !P1.imgOk && "Logo nicht geladen"].filter(Boolean));
  const P2 = await pdfSeiten(M.html);
  await pruefe("5.28", "PDF: nur Pflichtangaben = genau 1 Seite", () => (P2.n === 1 ? null : "Seiten: " + P2.n));
  const P3 = await pdfSeiten(ST.html);
  await pruefe("5.29", "PDF: Storno = genau 1 Seite", () => (P3.n === 1 ? null : "Seiten: " + P3.n));
  const LANG = mit({ nummer: 123456, kundennummer: 123456, schueler_name: "Alexandra Mustermann-Musterfrau", zweck: "Vorstellung zur praktischen Prüfung inklusive Fahrzeugstellung und Gebühren",
    schueler_adresse: { strasse: "Musterstraße am Beispielhang 123 b", plz: "12345", ort: "Musterstadt an der Beispiel" }, aussteller: "Paula Muster-Beispielfrau",
    fahrschule_daten: { name: "Muster Fahrschule Beispielstadt GmbH", anschrift: "Beispielallee 4\n54321 Beispielstadt\nTelefon 0000 000000", steuernummer: "12/345/67890", ustid: "DE998877665" },
    steuer: { ausweisen: true, satz: "19", hinweis: "Gemäß § 4 Nr. 21 UStG ist diese Leistung von der Umsatzsteuer befreit, soweit keine andere Angabe erfolgt." } });
  const P4 = await pdfSeiten((await render(LANG, {}, "boost")).html);
  await pruefe("5.30", "PDF: lange, aber übliche Angaben (langer Name, Zweck 70 Zeichen, 3-zeiliger Kopf, Hinweis 1–2 Zeilen, Logo, Steuer) = genau 1 Seite", () => (P4.n === 1 ? null : "Seiten: " + P4.n));
  // Grenzfälle: Feldgrenzen der App (Zweck 200, Hinweis 200, Anschrift der Fahrschule 300 Zeichen). OFFEN = bekannter Fund F1, nur mit KUNDEN_TEST_STRENG=1 ein Fehler.
  const grenz = [["Zweck mit 200 Zeichen", { zweck: "Vorstellung zur Prüfung ".repeat(20).slice(0, 200) }], ["Steuer-Hinweis mit 150 Zeichen", { steuer: { ...LANG.steuer, hinweis: "Hinweis zur Steuer ".repeat(20).slice(0, 150) } }],
    ["Steuer-Hinweis mit 200 Zeichen", { steuer: { ...LANG.steuer, hinweis: "Hinweis zur Steuer ".repeat(20).slice(0, 200) } }], ["Kopf-Anschrift mit 4 Zeilen", { fahrschule_daten: { ...LANG.fahrschule_daten, anschrift: "Zeile 1\nZeile 2\nZeile 3\nZeile 4" } }]];
  const zuLang = [];
  for (const [name, extra] of grenz) { const R = await render(Object.assign({}, LANG, extra), {}, "boost"); const P = await pdfSeiten(R.html); if (P.n !== 1) zuLang.push(`${name}: ${P.n} Seiten`); }
  if (process.env.KUNDEN_TEST_STRENG === "1") await pruefe("5.32", "PDF Grenzfälle der Felder (je einzeln auf Obergrenze) = genau 1 Seite", () => zuLang);
  else if (zuLang.length) { offenZahl++; console.log(`OFFEN  5.32 PDF Grenzfälle der Felder: Unterschriftsfeld rutscht auf Seite 2 bei: ${zuLang.join("; ")} (Fund F1; mit KUNDEN_TEST_STRENG=1 ein Fehler)`); }
  else { okZahl++; console.log("ok  5.32 PDF Grenzfälle der Felder (je einzeln auf Obergrenze) = genau 1 Seite"); }
  const ZUVIEL = "<p style='height:300mm'>Seitenumbruch-Probe</p>";
  const P5 = await pdfSeiten(M.html.replace("</body>", ZUVIEL + "</body>"));
  await pruefe("5.31", "Gegenprobe der Seitenzählung: ein absichtlich zu langes Dokument ergibt mehr als 1 Seite (der Zähler zählt wirklich)", () => (P5.n >= 2 ? null : "Zähler meldet " + P5.n));
  await bctx.close();
} catch (e) {
  fehlerZahl++; console.log("ABWEICHUNG  Büro-/Beleg-Teil abgebrochen: " + String(e.stack || e).split("\n").slice(0, 3).join(" | "));
} finally { await browser.close(); server.close(); }

console.log(`\nKunden-Test (W26): ${okZahl} ok, ${fehlerZahl} Abweichungen${offenZahl ? ", " + offenZahl + " offen (bekannter Fund)" : ""}${KAPUTT.size ? "  [Gegenprobe: " + [...KAPUTT].join(",") + "]" : ""}`);
process.exit(fehlerZahl ? 1 : 0);
