// Löschen-Test (K7, 🗣 Serband 22.11.2026: „keine Meldungen, wo ich etwas bestätigen soll“ / „kein unnötiger Ballast“).
// Regel: Fehleintrag (noch nicht gelaufen, nie unterschrieben) → sofort weg, 6 s „Rückgängig“, kein Dialog.
//        Gelaufene oder (je) unterschriebene Fahrstunde → nicht löschen, nur „Stornieren“ mit Grund; bleibt aufbewahrt.
// App (Handy 360 px, Attrappe der Datenbank im Arbeitsspeicher, nur erfundene „Muster“-Namen):
//   L1 künftige Stunde löschen ohne Dialog + Rückgängig      L2 gelaufene Stunde → Stornieren, Grund, Brücke schreibt Storno-Zeile
//   L3 unterschriebene künftige Stunde → Stornieren (+ Rückgängig nimmt Storno zurück)
//   L4 online gebucht: Absage erst nach Ablauf, nach Rückgängig gar nicht      L5 Schüler ausblenden ohne Dialog, Termine bleiben, Rückgängig
//   L6 Leitung in der Fahrschul-Ansicht storniert eine gelaufene Stunde → Storno-Zeile
//   L7 Büro: Papierkorb im Kalender (zu, aufklappen, Resttage, „Storniert, bleibt aufbewahrt“, Wiederherstellen), Nachweis-Storno mit Pflicht-Grund
//   L8 keine JS-Fehler, kein Dialog
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/loeschen-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { bauDaten } = require("../buero-vorfuehrung.js");
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fakeBuero = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let fehler = 0, ok = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (Array.isArray(r)) r = r.length ? r.join("; ") : undefined;
  if (r === undefined || r === null || r === true) { ok++; console.log(`ok  ${id} ${text}`); } else { fehler++; console.log(`FEHLER  ${id} ${text}: ${r}`); }
}
const warte = (p, ms = 300) => p.waitForTimeout(ms);
const FS = "fs-muster";

// ---------- App mit Attrappe ----------
async function starteApp(prof, tabellen) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  await ctx.addInitScript(() => { try { localStorage.setItem("serband-theme", "light"); } catch (e) {} });
  const page = await ctx.newPage(); const js = [];
  page.on("pageerror", (e) => js.push(e.message));
  page.on("dialog", (d) => { js.push("Dialog: " + d.message().slice(0, 60)); d.dismiss().catch(() => {}); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await warte(page, 600);
  await page.evaluate(async ({ prof, FS, tabellen }) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    window.__schreib = []; window.__rpc = []; window.__T = tabellen;
    const user = { id: "u-ich", email: "ich@example.org" };
    const profil = () => Object.assign({ id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: typeof AGB_VERSION !== "undefined" ? AGB_VERSION : "1.0" }, prof);
    const kopie = (x) => JSON.parse(JSON.stringify(x));
    function laufen(s) {
      const T = window.__T; const rows = (T[s.tab] = T[s.tab] || []);
      if (s.art === "select") {
        if (s.tab === "fahrschulen") return { data: s.einzeln ? { id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} } : [], error: null };
        if (s.tab === "profiles") return { data: s.einzeln ? profil() : [profil(), { id: "u-anna", name: "Anna Muster", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true }], error: null };
        let l = rows.filter((r) => s.filt.every((f) => f(r)));
        if (s.bereich) l = l.slice(s.bereich[0], s.bereich[1] + 1);
        l = kopie(l);
        if (s.einzeln) return l.length ? { data: l[0], error: null } : (s.einzeln === "single" ? { data: null, error: { message: "keine Zeile" } } : { data: null, error: null });
        return { data: l, error: null, count: l.length };
      }
      let betroffen = [];
      if (s.art === "update") { betroffen = rows.filter((r) => s.filt.every((f) => f(r))); betroffen.forEach((r) => Object.assign(r, kopie(s.werte))); }
      else if (s.art === "delete") { betroffen = rows.filter((r) => s.filt.every((f) => f(r))); T[s.tab] = rows.filter((r) => !betroffen.includes(r)); }
      else {
        const liste = Array.isArray(s.werte) ? s.werte : [s.werte];
        for (const w of liste) {
          const alt = s.art === "upsert" ? rows.find((r) => r.id === w.id) : null;
          if (alt) { Object.assign(alt, kopie(w)); betroffen.push(alt); } else { const n = kopie(w); rows.push(n); betroffen.push(n); }
        }
      }
      window.__schreib.push({ tab: s.tab, art: s.art, werte: kopie(s.werte), ids: betroffen.map((r) => r.id) });
      return { data: s.nachher ? kopie(betroffen) : null, error: null };
    }
    const baue = (tab) => {
      const s = { tab, art: "select", filt: [], einzeln: null, werte: null, nachher: false, bereich: null };
      const q = new Proxy({}, { get: (_t, k) => {
        if (k === "then") return (ok, nein) => Promise.resolve(laufen(s)).then(ok, nein);
        if (k === "select") return () => { if (s.art !== "select") s.nachher = true; return q; };
        if (k === "eq") return (c, v) => { s.filt.push((r) => r[c] === v); return q; };
        if (k === "neq") return (c, v) => { s.filt.push((r) => r[c] !== v); return q; };
        if (k === "in") return (c, l) => { s.filt.push((r) => l.includes(r[c])); return q; };
        if (k === "gte") return (c, v) => { s.filt.push((r) => r[c] != null && r[c] >= v); return q; };
        if (k === "range") return (a, b) => { s.bereich = [a, b]; return q; };
        if (k === "single") return () => { s.einzeln = "single"; return q; };
        if (k === "maybeSingle") return () => { s.einzeln = "maybe"; return q; };
        if (["insert", "upsert", "update"].includes(k)) return (w) => { s.art = k; s.werte = w; return q; };
        if (k === "delete") return () => { s.art = "delete"; return q; };
        return () => q;
      } });
      return q;
    };
    const auth = { getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
    const supa = { from: baue, rpc: async (n, a) => { window.__rpc.push(n); return { data: n === "termine_nicht_mehr_meine" ? [] : null, error: null }; }, auth, functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
    window.getSupa = () => supa;
    try { localStorage.clear(); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
    _dbEigentuemer = user.id;
    ensureDB(); DB.students = []; DB.lessons = []; DB.exams = [];
    _authUser = user;
    window.__abs = [];
    window._notifyOnlineBookingChange = (id, typ) => { window.__abs.push([id, typ]); };
    await afterLogin(user);
  }, { prof, FS, tabellen });
  await warte(page, 1000);
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } document.getElementById("bueroNotizPopup")?.remove(); });
  return { ctx, page, js };
}
// erfundener Schüler mit Plan (Ausbildung ohne id/name/telefon)
const ausbildungJS = () => { ensureAusbildungsplaene(); const c = DB.ausbildungsplaene.find((x) => x.standard) || DB.ausbildungsplaene[0];
  return { form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), todos: [] }; };
const tagJS = (n) => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

// ---------- Eigene Ansicht: Fahrlehrer mit Fahrschule ----------
const A = await starteApp({ rolle: "fahrlehrer" }, {});
const p = A.page;
await p.evaluate(({ ausb, g, m }) => {
  const a = eval("(" + ausb + ")")();
  const tag = eval("(" + m + ")");
  DB.students = [Object.assign({ id: "sm1", name: "Erika Muster", telefon: "" }, a)];
  window.__tag = tag; _pullOk = true; _termineAbgerufen = true;
}, { ausb: ausbildungJS.toString(), g: 0, m: tagJS.toString() });
const stunde = (id, o) => p.evaluate(([id, o]) => {
  const l = Object.assign({ id, sid: "sm1", date: window.__tag(1), von: "10:00", bis: "11:30", art: "fahrstunde", name: "", status: "geplant", note: "", fc: null }, o || {});
  if (typeof l.date === "number") l.date = window.__tag(l.date);
  DB.lessons.push(l); save(); return l.id;
}, [id, o]);
const lokal = (id) => p.evaluate((id) => (DB.lessons || []).some((l) => l.id === id), id);
const storno = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem("kompass-storno-offen") || "{}"); } catch (e) { return {}; } });
const toastText = () => p.evaluate(() => { const t = document.getElementById("toast"); return t && t.classList.contains("show") ? ((t.querySelector(".ut-txt") || t).textContent || "") : ""; });
const toastRueck = () => p.evaluate(() => { const t = document.getElementById("toast"); return !!(t && t.classList.contains("show") && t.querySelector(".ut-btn")); });
const sheetKnopf = () => p.evaluate(() => { const b = document.getElementById("esDelete"); return b ? b.textContent.trim() : null; });
const oeffneStunde = async (id) => { await p.evaluate((id) => { closeSheet(); openEventSheet("lesson", id, "sm1"); }, id); await warte(p, 350); };
const schreibzeilen = (id) => p.evaluate((id) => window.__schreib.filter((x) => x.tab === "kalender_termine" && (x.ids || []).includes(id)), id);
const bruecke = async (id) => { await p.evaluate(() => _syncTermineBridge(0)); await p.waitForFunction((id) => window.__schreib.some((x) => x.tab === "kalender_termine" && x.art === "upsert" && (x.ids || []).includes(id)), id, { timeout: 8000 }).catch(() => {}); };
const toastWeg = () => p.waitForFunction(() => { const t = document.getElementById("toast"); return !t || !t.classList.contains("show"); }, null, { timeout: 9000 }).catch(() => {});
const dialoge = () => A.js.filter((x) => /^Dialog/.test(x)).length;

await pruefe("L1", "künftige Stunde: „Termin löschen“ ohne Dialog, sofort weg, Hinweis mit „Rückgängig“; Rückgängig holt sie zurück, kein Storno", async () => {
  const f = []; const d0 = dialoge(); await toastWeg();
  await stunde("l1", { date: 1 }); await oeffneStunde("l1");
  const k = await sheetKnopf(); if (k !== "Termin löschen") f.push("Knopf heißt „" + k + "“");
  await p.click("#esDelete"); await warte(p, 400);
  if (await lokal("l1")) f.push("Stunde noch da");
  if (!(await toastRueck())) f.push("kein Hinweis mit Rückgängig (" + (await toastText()) + ")");
  if (!/gelöscht/.test(await toastText())) f.push("Hinweis: " + (await toastText()));
  if (await p.evaluate(() => !!document.querySelector("#stoGruende"))) f.push("Storno-Fenster erschien für Fehleintrag");
  if ((await storno()).l1) f.push("Storno-Eintrag für Fehleintrag");
  await p.click("#toast .ut-btn"); await warte(p, 400);
  if (!(await lokal("l1"))) f.push("Rückgängig holt die Stunde nicht zurück");
  if (dialoge() !== d0) f.push("Dialog erschienen");
  return f;
});

await pruefe("L2", "gelaufene Stunde: Knopf „Stornieren“, Fenster mit Grund-Knöpfen und Freitext, weg aus DB.lessons, Brücke schreibt Storno-Zeile mit Grund", async () => {
  const f = []; const d0 = dialoge(); await toastWeg();
  await stunde("l2", { date: -1 }); await bruecke("l2"); await p.evaluate(() => { window.__schreib.length = 0; });
  await oeffneStunde("l2");
  const k = await sheetKnopf(); if (k !== "Stornieren") f.push("Knopf heißt „" + k + "“");
  await p.click("#esDelete"); await warte(p, 450);
  const so = await p.evaluate(() => ({ titel: (document.querySelector("#sheet .sheet-h") || {}).textContent, gruende: document.querySelectorAll("[data-stogrund]").length, text: !!document.getElementById("stoText"), los: !!document.getElementById("stoLos"), losAus: (document.getElementById("stoLos") || {}).disabled }));
  if (so.titel !== "Stunde stornieren") f.push("Fenster „" + so.titel + "“");
  if (so.gruende !== 3) f.push(so.gruende + " Grund-Knöpfe statt 3");
  if (!so.text || !so.los) f.push("Freitext oder Knopf fehlt");
  if (!so.losAus) f.push("Stornieren ohne Grund nicht gesperrt");
  if (!(await lokal("l2"))) f.push("Stunde schon vor der Wahl des Grundes weg");
  await p.fill("#stoText", "Schüler krank"); await p.click("#stoLos"); await warte(p, 400);
  if (await lokal("l2")) f.push("Stunde noch in DB.lessons");
  const s = (await storno()).l2; if (!s || s.grund !== "Schüler krank") f.push("kein Storno-Eintrag mit Grund: " + JSON.stringify(s));
  if (!/storniert/.test(await toastText())) f.push("Hinweis: " + (await toastText()));
  // Brücke (4 s) schreibt genau für diese id die Storno-Zeile
  await p.waitForFunction(() => window.__schreib.some((x) => x.tab === "kalender_termine" && x.art === "update" && x.werte && x.werte.payload && x.werte.payload.storno), null, { timeout: 12000 }).catch(() => {});
  const z = await schreibzeilen("l2"); const u = z.find((x) => x.art === "update" && x.werte.payload && x.werte.payload.storno);
  if (!u) f.push("keine Storno-Zeile geschrieben: " + JSON.stringify(z.map((x) => x.art + ":" + JSON.stringify(x.werte).slice(0, 80))));
  else {
    if (u.werte.geloescht !== true) f.push("geloescht nicht true");
    if (u.werte.payload.storno.grund !== "Schüler krank") f.push("Grund " + u.werte.payload.storno.grund);
    if (u.werte.payload.korrekturGrund !== "Schüler krank") f.push("korrekturGrund fehlt");
    if (!u.werte.payload.storno.am || !u.werte.payload.storno.von) f.push("am/von fehlt: " + JSON.stringify(u.werte.payload.storno));
    if (u.ids.length !== 1) f.push("Zeile trifft " + u.ids.length + " Einträge");
  }
  const ohne = z.filter((x) => x.art === "update" && x.werte.geloescht === true && !(x.werte.payload && x.werte.payload.storno));
  if (ohne.length) f.push("zusätzlich ein Löschen ohne Storno-Vermerk");
  if ((await storno()).l2) f.push("Storno-Eintrag bleibt nach dem Abgleich liegen");
  const t = await p.evaluate(() => window.__T.kalender_termine.find((r) => r.id === "l2")); if (!t || t.geloescht !== true) f.push("Zeile in der Datenbank nicht im Papierkorb");
  if (dialoge() !== d0) f.push("Dialog erschienen");
  return f;
});

await pruefe("L3", "unterschriebene künftige Stunde: „Stornieren“, Grund-Knopf genügt; Rückgängig nimmt Storno zurück (kein Eintrag, nichts geschrieben)", async () => {
  const f = []; const d0 = dialoge(); await toastWeg();
  await stunde("l3", { date: 2, signed: true, signatureSnap: "data:image/png;base64,AAAA", signedAt: "2026-11-20" }); await bruecke("l3"); await p.evaluate(() => { window.__schreib.length = 0; });
  const hist0 = await p.evaluate(() => (DB.students[0].hist || []).filter((h) => h.typ === "storno").length);
  await oeffneStunde("l3");
  const k = await sheetKnopf(); if (k !== "Stornieren") f.push("Knopf heißt „" + k + "“");
  await p.click("#esDelete"); await warte(p, 450);
  await p.click('[data-stogrund="0"]'); await warte(p, 400);
  if (await lokal("l3")) f.push("Stunde noch da");
  const s = (await storno()).l3; if (!s || s.grund !== "Falsch eingetragen") f.push("Storno-Eintrag: " + JSON.stringify(s && s.grund));
  const hist = await p.evaluate(() => (DB.students[0].hist || []).filter((h) => h.typ === "storno").length); if (hist !== hist0 + 1) f.push("Verlauf: " + hist + " Storno-Einträge statt " + (hist0 + 1));
  await p.click("#toast .ut-btn"); await warte(p, 400);
  if (!(await lokal("l3"))) f.push("Rückgängig holt die Stunde nicht zurück");
  if ((await storno()).l3) f.push("Rückgängig lässt den Storno-Eintrag liegen");
  const hist2 = await p.evaluate(() => (DB.students[0].hist || []).filter((h) => h.typ === "storno").length); if (hist2 !== hist0) f.push("Verlauf nach Rückgängig: " + hist2 + " (vorher " + hist0 + ", nach Storno " + hist + ")");
  await bruecke("l3"); await warte(p, 500);
  const z = await schreibzeilen("l3"); if (z.some((x) => x.art === "update" && x.werte.geloescht === true)) f.push("trotz Rückgängig in den Papierkorb geschrieben");
  if (dialoge() !== d0) f.push("Dialog erschienen");
  return f;
});

await pruefe("L4", "online gebucht: ohne Dialog gelöscht; Absage geht erst nach Ablauf (> 6 s), nach Rückgängig gar nicht", async () => {
  const f = []; const d0 = dialoge(); await toastWeg();
  await p.evaluate(() => { window.__abs.length = 0; });
  // A: Rückgängig → keine Absage
  await stunde("l4a", { date: 3, onlineBookingId: "ob-a" }); await oeffneStunde("l4a");
  await p.click("#esDelete"); await warte(p, 400);
  if (!/Absage/.test(await toastText())) f.push("Hinweis nennt die Absage nicht: " + (await toastText()));
  if (!(await toastRueck())) f.push("kein Rückgängig");
  if (await p.evaluate(() => window.__abs.length)) f.push("Absage sofort verschickt");
  await p.click("#toast .ut-btn"); await warte(p, 300);
  if (!(await lokal("l4a"))) f.push("Rückgängig holt Stunde nicht zurück");
  // B: Ablauf → genau eine Absage, erst danach
  await stunde("l4b", { date: 4, onlineBookingId: "ob-b" }); await oeffneStunde("l4b");
  await p.click("#esDelete"); await warte(p, 400);
  // Fehlersucher Daten: Absage überlebt Schließen der App → bis zum Ablauf gemerkt
  if (!(await p.evaluate(() => (JSON.parse(localStorage.getItem("kompass-absage-offen") || "[]")).some((x) => x.id === "l4b")))) f.push("offene Absage nicht gemerkt");
  await warte(p, 2100);
  if (await p.evaluate(() => window.__abs.length)) f.push("Absage schon nach 2,5 s");
  await warte(p, 4500);
  if (await p.evaluate(() => localStorage.getItem("kompass-absage-offen"))) f.push("gemerkte Absage nach dem Senden nicht gelöscht");
  const abs = await p.evaluate(() => window.__abs);
  if (abs.length !== 1 || abs[0][0] !== "l4b" || abs[0][1] !== "cancelled") f.push("Absagen nach Ablauf: " + JSON.stringify(abs));
  if (dialoge() !== d0) f.push("Dialog erschienen");
  return f;
});

await pruefe("L4c", "Sammel-Rückgängig: zweite Löschung verlängert das Rückgängig – Absage der ersten geht erst nach dem Ende raus, nach Rückgängig gar nicht", async () => {
  const f = []; await toastWeg();
  await p.evaluate(() => { window.__abs.length = 0; });
  await stunde("l4c1", { date: 7, onlineBookingId: "ob-c" }); await stunde("l4c2", { date: 8 });
  await oeffneStunde("l4c1"); await p.click("#esDelete"); await warte(p, 4000);
  await oeffneStunde("l4c2"); await p.click("#esDelete"); await warte(p, 3000); // 7 s nach der ersten Löschung
  if (await p.evaluate(() => window.__abs.length)) f.push("Absage raus, obwohl Rückgängig noch angeboten wird");
  if (!(await toastRueck())) f.push("kein Rückgängig mehr");
  await p.click("#toast .ut-btn"); await warte(p, 1500);
  if (!(await lokal("l4c1")) || !(await lokal("l4c2"))) f.push("Rückgängig holt nicht beide zurück");
  if (await p.evaluate(() => window.__abs.length)) f.push("Absage trotz Rückgängig: " + JSON.stringify(await p.evaluate(() => window.__abs)));
  return f;
});
await pruefe("L5", "Schüler ausblenden: kein Dialog, künftige Termine bleiben im Kalender (Hinweis sagt es), keine Absage; Rückgängig blendet wieder ein", async () => {
  const f = []; const d0 = dialoge(); await toastWeg();
  await p.evaluate(() => { DB.lessons = []; window.__abs.length = 0; });
  await stunde("l5a", { date: 5 }); await stunde("l5b", { date: 6, onlineBookingId: "ob-5" });
  await p.evaluate(() => routeDetail("sm1")); await warte(p, 400);
  if (!(await p.$("#delBtn"))) return "Knopf „Bei mir ausblenden“ nicht gefunden";
  await p.click("#delBtn"); await warte(p, 500);
  const r = await p.evaluate(() => ({ aus: !!DB.students.find((s) => s.id === "sm1").ausgeblendetAm, n: DB.lessons.length }));
  if (!r.aus) f.push("Schüler nicht ausgeblendet"); if (r.n !== 2) f.push(`künftige Termine: ${r.n} statt 2 im Kalender`);
  if (!(await toastRueck())) f.push("kein Rückgängig-Hinweis: " + (await toastText()));
  if (!/Termine bleiben/.test(await toastText())) f.push("Hinweis nennt die Termine nicht: " + (await toastText()));
  if (await p.evaluate(() => window.__abs.length)) f.push("Absage verschickt");
  await p.click("#toast .ut-btn"); await warte(p, 400);
  const r2 = await p.evaluate(() => ({ aus: !!DB.students.find((s) => s.id === "sm1").ausgeblendetAm, ids: DB.lessons.map((l) => l.id).sort().join(",") }));
  if (r2.aus) f.push("Rückgängig blendet den Schüler nicht wieder ein"); if (r2.ids !== "l5a,l5b") f.push("Termine nach Rückgängig: " + r2.ids);
  if (dialoge() !== d0) f.push("Dialog erschienen");
  return f;
});
await pruefe("L8a", "App (Fahrlehrer): keine JS-Fehler, kein Dialog", () => A.js);
await A.ctx.close();

// ---------- Leitung, Fahrschul-Ansicht ----------
{
  const ausb = await (async () => { const c = await browser.newContext(); const q = await c.newPage(); await q.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort())); await q.goto(basis + "index.html", { waitUntil: "load" }); await warte(q, 400);
    const a = await q.evaluate((fn) => eval("(" + fn + ")")(), ausbildungJS.toString()); await c.close(); return a; })();
  const heute = (n) => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const tabellen = {
    schueler: [{ id: "gs1", fahrschule_id: FS, fahrlehrer_id: "u-anna", name: "Gerda Muster", telefon: null, status: "aktiv", ausbildung: ausb }],
    kalender_termine: [{ id: "gt1", fahrschule_id: FS, fahrlehrer_id: "u-anna", schueler_id: "gs1", datum: heute(-1), von: "10:00", bis: "11:30", art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: false, payload: {}, aktualisiert_am: new Date().toISOString() }],
  };
  const L = await starteApp({ rolle: "fahrschule_admin" }, tabellen);
  const q = L.page;
  await pruefe("L6", "Leitung (Fahrschul-Ansicht): gelaufene Stunde → „Stornieren“, Grund; geschrieben wird genau diese Stunde mit Storno-Vermerk und Grund", async () => {
    const f = []; const d0 = L.js.filter((x) => /^Dialog/.test(x)).length;
    const agg = await q.evaluate(() => ({ agg: !!_fsAgg, n: (DB.lessons || []).length })); if (!agg.agg) return "nicht in der Fahrschul-Ansicht";
    if (agg.n !== 1) return "Termin der Fahrschule nicht geladen (" + agg.n + ")";
    await q.evaluate(() => { window.__schreib.length = 0; closeSheet(); openEventSheet("lesson", "gt1", "gs1"); }); await warte(q, 400);
    const k = await q.evaluate(() => (document.getElementById("esDelete") || {}).textContent); if ((k || "").trim() !== "Stornieren") f.push("Knopf heißt „" + (k || "").trim() + "“");
    await q.click("#esDelete"); await warte(q, 450);
    if (!(await q.$("#stoGruende"))) return f.concat("Storno-Fenster fehlt");
    await q.click('[data-stogrund="2"]'); await warte(q, 400);
    if (await q.evaluate(() => DB.lessons.some((l) => l.id === "gt1"))) f.push("Stunde noch in der Ansicht");
    await q.waitForFunction(() => window.__schreib.some((x) => x.tab === "kalender_termine" && x.art === "update"), null, { timeout: 12000 }).catch(() => {});
    const z = await q.evaluate(() => window.__schreib.filter((x) => x.tab === "kalender_termine"));
    const u = z.find((x) => x.art === "update" && x.werte.payload && x.werte.payload.storno);
    if (!u) f.push("keine Storno-Zeile: " + JSON.stringify(z.map((x) => x.art + ":" + JSON.stringify(x.werte).slice(0, 90))));
    else {
      if (u.werte.geloescht !== true) f.push("geloescht nicht true");
      if (u.werte.payload.storno.grund !== "Hat nicht stattgefunden") f.push("Grund " + u.werte.payload.storno.grund);
      if (u.werte.payload.korrekturGrund !== "Hat nicht stattgefunden") f.push("korrekturGrund fehlt");
      if (u.ids.join() !== "gt1") f.push("trifft " + u.ids.join());
    }
    if (z.some((x) => x.art === "update" && x.werte.geloescht === true && !(x.werte.payload && x.werte.payload.storno))) f.push("zusätzlich ein Löschen ohne Storno-Vermerk");
    if (z.some((x) => x.art === "delete")) f.push("hart gelöscht");
    if (L.js.filter((x) => /^Dialog/.test(x)).length !== d0) f.push("Dialog erschienen");
    return f;
  });
  await pruefe("L8b", "App (Leitung, Fahrschul-Ansicht): keine JS-Fehler, kein Dialog", () => L.js);
  await L.ctx.close();
}

// ---------- Büro ----------
{
  const tag = new Date().toISOString().slice(0, 10);
  const daten = bauDaten(tag);
  const tt = daten.tabellen.kalender_termine;
  const vorTagen = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const addT = (d) => { const o = new Date(tag + "T12:00:00"); o.setDate(o.getDate() + d); return o.toISOString().slice(0, 10); };
  const mk = (id, ab, extra) => Object.assign({ id, fahrschule_id: "fs-test-1", fahrlehrer_id: "fl-1", schueler_id: "s2", datum: addT(ab), von: "08:00", bis: "09:30", art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: true, payload: {}, buero_fc_status: "offen" }, extra);
  tt.push(mk("pk-fehl", 3, { geloescht_am: vorTagen(5), aktualisiert_am: vorTagen(5) }));
  tt.push(mk("pk-storno", -2, { geloescht_am: vorTagen(1), aktualisiert_am: vorTagen(1), payload: { storno: { grund: "Schüler krank", am: vorTagen(1), von: "Anton Muster" } } }));
  tt.push(mk("pk-unterschr", -3, { geloescht_am: vorTagen(2), aktualisiert_am: vorTagen(2), payload: { signed: true, signatureSnap: "data:image/png;base64,AAAA" } }));
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, locale: "de-DE" });
  const b = await ctx.newPage(); const js = [];
  b.on("pageerror", (e) => js.push(e.message)); b.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) js.push("konsole: " + m.text().slice(0, 120)); });
  b.on("dialog", (d) => { js.push("Dialog: " + d.message().slice(0, 60)); d.dismiss().catch(() => {}); });
  await b.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fakeBuero }));
  await b.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await b.addInitScript(([d]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: "bu-1", email: "bu-1@example.org" } } }; }, [daten]);
  await b.goto(basis + "buero.html#kalender"); await warte(b, 500);
  const frage = await b.waitForSelector("#wer:not([hidden])", { timeout: 1500 }).catch(() => null);
  if (frage) { await b.click('#werListe button:has-text("Paula Muster")'); await b.keyboard.type("7352", { delay: 20 }); await warte(b, 300); }
  await b.waitForSelector("#pkKarte", { timeout: 8000 }).catch(() => {});
  await b.waitForFunction(() => /Papierkorb \(\d+\)/.test((document.querySelector("#pkKarte summary") || {}).textContent || ""), null, { timeout: 8000 }).catch(() => {});

  await pruefe("L7a", "Büro-Kalender: „Papierkorb (3)“ unten, zu; ruft papierkorb_leeren genau einmal", async () => {
    const f = [];
    const k = await b.evaluate(() => { const e = document.getElementById("pkKarte"); return e ? { offen: e.open, kopf: e.querySelector("summary").textContent.trim(), unten: e.getBoundingClientRect().top > (document.querySelector("#ansicht") ? 0 : 0) } : null; });
    if (!k) return "Papierkorb-Karte fehlt";
    if (k.offen) f.push("Papierkorb ist offen"); if (k.kopf !== "Papierkorb (3)") f.push("Kopf „" + k.kopf + "“");
    // Seite neu aufbauen (anderer Bereich und zurück): kein zweiter Aufruf
    await b.evaluate(() => { location.hash = "schueler"; }); await warte(b, 300); await b.evaluate(() => { PK.zeit = 0; location.hash = "kalender"; }); await warte(b, 600);
    const n = await b.evaluate(() => window.__FAKE.log.filter((l) => l.rpc === "papierkorb_leeren").length); if (n !== 1) f.push("papierkorb_leeren " + n + "×");
    const quer = await b.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (quer > 0) f.push(quer + " px zu breit");
    return f;
  });
  await pruefe("L7b", "aufklappen: Fehleintrag mit „wird in 25 Tagen endgültig gelöscht“; Unterliste „Storniert, bleibt aufbewahrt (2)“ mit Grund", async () => {
    const f = [];
    await b.evaluate(() => { document.getElementById("pkKarte").open = true; }); await warte(b, 200);
    const t = await b.evaluate(() => document.getElementById("pkKarte").innerText);
    if (!/wird in 25 Tagen endgültig gelöscht/.test(t)) f.push("Resttage fehlen: " + t.replace(/\s+/g, " ").slice(0, 200));
    const u = await b.evaluate(() => { const s = document.getElementById("pkStorno"); return s ? { kopf: s.querySelector("summary").textContent.trim(), zeilen: s.querySelectorAll("li").length, text: s.textContent.replace(/\s+/g, " ") } : null; });
    if (!u) return f.concat("Unterliste „Storniert“ fehlt");
    if (!/^Storniert, bleibt aufbewahrt \(2\)$/.test(u.kopf)) f.push("Unterkopf „" + u.kopf + "“");
    if (!/Schüler krank/.test(u.text)) f.push("Grund „Schüler krank“ fehlt"); if (!/unterschrieben · bleibt aufbewahrt/.test(u.text)) f.push("unterschriebene Stunde nicht als „bleibt aufbewahrt“");
    if (/endgültig gelöscht/.test(u.text)) f.push("aufbewahrte Stunde mit Löschfrist");
    const hoch = await b.evaluate(() => [...document.querySelectorAll("#pkKarte [data-pkzurueck]")].map((x) => Math.round(x.getBoundingClientRect().height)));
    if (hoch.some((h) => h < 40)) f.push("Wiederherstellen-Knopf nur " + Math.min(...hoch) + " px hoch");
    return f;
  });
  await pruefe("L7c", "Wiederherstellen: schreibt geloescht:false, Eintrag verschwindet aus dem Papierkorb, kein Dialog", async () => {
    const f = [];
    await b.evaluate(() => { window.__FAKE.log.length = 0; });
    await b.click('[data-pkzurueck="pk-fehl"]'); await warte(b, 500);
    const w = await b.evaluate(() => window.__FAKE.log.filter((l) => l.tabelle === "kalender_termine" && l.art === "update"));
    if (w.length !== 1 || !w[0].werte || w[0].werte.geloescht !== false) f.push("Schreiben: " + JSON.stringify(w.map((x) => x.werte)));
    const r = await b.evaluate(() => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === "pk-fehl")); if (!r || r.geloescht !== false) f.push("Zeile bleibt im Papierkorb");
    const kopf = await b.evaluate(() => document.querySelector("#pkKarte summary").textContent.trim()); if (kopf !== "Papierkorb (2)") f.push("Kopf danach „" + kopf + "“");
    if (await b.$('[data-pkzurueck="pk-fehl"]')) f.push("Zeile noch in der Liste");
    return f;
  });
  await pruefe("L7d", "Büro-Nachweis: gelaufene Stunde → Knopf „Stornieren“, Pflicht-Grund (leer geht nicht), schreibt payload.storno, hart nichts gelöscht", async () => {
    const f = [];
    // Schüler mit den meisten vergangenen Fahrstunden (wie nachweis-test)
    const sid = await b.evaluate((tag) => { const z = {}; for (const t of window.__FAKE.tabellen.kalender_termine) if (!t.geloescht && t.schueler_id && t.datum < tag && t.art !== "block") z[t.schueler_id] = (z[t.schueler_id] || 0) + 1; return Object.entries(z).sort((a, c) => c[1] - a[1])[0][0]; }, tag);
    await b.evaluate(() => { location.hash = "schueler"; }); await warte(b, 400);
    await b.click(`[data-sbearb="${sid}"]`); await b.waitForSelector("#nwOeffnen", { timeout: 5000 });
    await b.click("#nwOeffnen"); await b.waitForSelector(".nw-kacheln", { timeout: 5000 });
    const top = b.locator("dialog[open]").last();
    const knopf = top.locator("[data-nwloeschen]").first();
    const txt = (await knopf.textContent() || "").trim(); if (txt !== "Stornieren") f.push("Knopf heißt „" + txt + "“");
    const id = await knopf.getAttribute("data-nwloeschen");
    const vorher = await top.locator(".nw-liste").first().locator(".nw-zeile").count();
    await b.evaluate(() => { window.__FAKE.log.length = 0; });
    await knopf.click(); await warte(b, 200);
    const titel = await b.evaluate(() => (document.querySelectorAll("dialog[open]")[document.querySelectorAll("dialog[open]").length - 1].querySelector("h2,h3,header") || {}).textContent || "");
    if (!/stornieren/i.test(titel)) f.push("Dialog-Titel „" + titel.trim() + "“");
    await top.locator("button[value=ok]").click(); await warte(b, 300); // ohne Grund
    if ((await b.evaluate(() => window.__FAKE.log.filter((l) => l.tabelle === "kalender_termine" && l.art === "update").length)) !== 0) f.push("ohne Grund geschrieben");
    if (!(await top.locator("input[name=grund]").count())) { f.push("Dialog ohne Grund geschlossen"); return f; }
    await top.locator("input[name=grund]").fill("doppelt eingetragen"); await top.locator("button[value=ok]").click(); await warte(b, 500);
    const row = await b.evaluate((id) => window.__FAKE.tabellen.kalender_termine.find((t) => t.id === id), id);
    if (!row || row.geloescht !== true) f.push("Zeile nicht im Papierkorb");
    else { const s = (row.payload || {}).storno; if (!s || s.grund !== "doppelt eingetragen" || s.von !== "Büro" || !s.am) f.push("storno: " + JSON.stringify(s)); }
    if ((await b.evaluate(() => window.__FAKE.log.filter((l) => l.tabelle === "kalender_termine" && l.art === "delete").length)) !== 0) f.push("hart gelöscht");
    if ((await top.locator(".nw-liste").first().locator(".nw-zeile").count()) !== vorher - 1) f.push("Stunde nicht aus der Liste weg");
    const hinw = await b.evaluate(() => { const t = document.querySelector(".toast-undo .toast-text"); return t ? t.textContent : ""; }); if (!/storniert/.test(hinw)) f.push("Hinweis: " + hinw.slice(0, 60));
    await top.locator(".nw-details summary:has-text('Papierkorb')").click(); await warte(b, 150);
    const pk = await top.locator(".nw-details", { hasText: "Papierkorb" }).first().innerText();
    if (!/storniert: „doppelt eingetragen“ · bleibt aufbewahrt/.test(pk)) f.push("Nachweis-Papierkorb zeigt kein „storniert“: " + pk.replace(/\s+/g, " ").slice(0, 160));
    return f;
  });
  await pruefe("L8c", "Büro: keine JS-Fehler, kein Dialog", () => js);
  await ctx.close();
}

await browser.close(); server.close();
console.log(`\nLöschen-Test: ${ok} ok, ${fehler} Fehler.`);
process.exit(fehler ? 1 : 0);
