// K14-Test: grüner Knopf „Theorie bestanden“ in „Wartet auf Theorie“ (🗣 Serband 23.11.2026).
//   W1 Knopf neben jedem Namen (≥ 44 px hoch, Typ button)
//   W2 ein Tipp = gleicher Stand wie der Schalter in der Akte (Feld für Feld), 20 % sofort, Schüler weg, kein Bestätigen-Fenster
//   W3 Rückgängig stellt den alten Stand her (auch „wartet“ wieder an, Liste wieder da)
//   W4 360 px und quer: nichts ragt seitlich heraus, keine JS-Fehler
// Nur erfundene Daten, kein Netz. Aufruf: NODE_PATH=$(npm root -g) node scripts/theorie-wartet-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
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
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 300) => page.waitForTimeout(ms);

async function starte({ w = 360, h = 780 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [], dialoge = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => { dialoge.push(d.message()); d.dismiss().catch(() => {}); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
    ensureAusbildungsplaene(); ensureDB();
    const mk = (id, name, anteil) => { const s = { id, name, form: "B", created: Date.now(), plan: newPlan(), telefon: "" }; ensure(s);
      const ids = evalSkillsFor(s); ids.slice(0, Math.round(ids.length * anteil)).forEach((x) => { s.plan.ampeln[x] = "gruen"; }); return s; };
    const a = mk("w1", "Anna Wartet", 0.5), b = mk("w2", "Ben Wartet", 0.9), c = mk("w3", "Cara Frei", 0.3);
    a.theorieWait = "2026-11-01T08:00:00.000Z"; b.theorieWait = "2026-11-05T08:00:00.000Z";
    DB.students = [a, b, c]; DB.lessons = []; DB.termine = []; DB.exams = [];
    _navStack = []; _pruefTab = "wait"; routePruefungen();
  });
  await warte(page, 400);
  return { ctx, page, jsFehler, dialoge };
}
const breit = (page) => page.evaluate(() => { const d = document.documentElement; return d.scrollWidth > d.clientWidth + 1 ? "scrollWidth " + d.scrollWidth + " > " + d.clientWidth : null; });
const namen = (page) => page.evaluate(() => [...document.querySelectorAll(".wait-card .wait-name")].map((e) => e.textContent));
const zustand = (page, id) => page.evaluate((id) => { const r = DB.students.find((s) => s.id === id); return { theorie: !!r.plan.theorie, wait: !!r.theorieWait, waitBis: !!r.theorieWaitBis, passed: !!r.theoryPassed, ready: !!r.ready, hist: (r.hist || []).filter((h) => (h.typ || h.type) === "theorie").length, stand: stand(r) }; }, id);

{
  const { ctx, page, jsFehler, dialoge } = await starte();
  await pruefe("W1", "Knopf „Theorie bestanden“ neben jedem Namen, button, ≥ 44 px", () => page.evaluate(() => {
    const k = [...document.querySelectorAll("[data-theo-ok]")]; if (k.length !== 2) return "Knöpfe: " + k.length;
    for (const b of k) { if (b.tagName !== "BUTTON" || b.type !== "button") return "kein type=button"; const r = b.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) return "zu klein " + r.width + "x" + r.height; if (!/Theorie bestanden/.test(b.textContent)) return "Text " + b.textContent; }
    return null;
  }));
  // Referenz: der Schalter in der Akte (Soll-Stand) an einer Kopie von Ben; danach alles zurück
  const vorher = (await zustand(page, "w2")).stand;
  const soll = await page.evaluate(() => {
    const echt = DB.students.find((s) => s.id === "w2"); const kopie = JSON.parse(JSON.stringify(echt));
    routeDetail("w2"); document.getElementById("dashTheoToggle").click();
    const r = DB.students.find((s) => s.id === "w2");
    const out = { theorie: !!r.plan.theorie, wait: !!r.theorieWait, waitBis: !!r.theorieWaitBis, passed: !!r.theoryPassed, ready: !!r.ready, hist: (r.hist || []).filter((h) => (h.typ || h.type) === "theorie").length, stand: stand(r) };
    DB.students = DB.students.map((s) => (s.id === "w2" ? kopie : s)); _pruefTab = "wait"; routePruefungen();
    return out;
  });
  await page.click('[data-theo-ok="w2"]'); await warte(page, 400);
  const ist = await zustand(page, "w2");
  await pruefe("W2a", "ein Tipp setzt dieselben Felder wie der Schalter in der Akte", () => (JSON.stringify(ist) === JSON.stringify(soll) ? null : "ist " + JSON.stringify(ist) + " soll " + JSON.stringify(soll)));
  await pruefe("W2b", "Datum heute, „wartet“ aus, 20 % sofort", () => page.evaluate((v) => {
    const r = DB.students.find((s) => s.id === "w2"); const heute = new Date().toISOString().slice(0, 10);
    return (r.theoryPassed || "").slice(0, 10) === heute && !r.theorieWait && r.plan.theorie && stand(r) > v ? null : JSON.stringify({ p: r.theoryPassed, w: r.theorieWait, s: stand(r), v });
  }, vorher));
  await pruefe("W2c", "Schüler verschwindet aus der Liste, Hinweis mit Rückgängig, kein Bestätigen-Fenster", async () => {
    const n = await namen(page); if (n.join() !== "Anna Wartet") return "Liste: " + n.join();
    const t = await page.evaluate(() => { const e = document.getElementById("toast"); return { text: e.textContent, undo: e.classList.contains("undo") }; });
    if (!t.undo || !/Rückgängig/i.test(t.text)) return "Hinweis: " + JSON.stringify(t);
    return dialoge.length ? "Fenster: " + dialoge.join("|") : null;
  });
  await pruefe("W2d", "Cloud-Zeile (ausbildung) trägt Stand, theoryPassed, Theorie ✓ – ohne „wartet“", () => page.evaluate(() => {
    _authProfile = { fahrschule_id: "fs-muster" }; _authUser = { id: "u-ich" };
    const z = _schuelerZeile(DB.students.find((s) => s.id === "w2")).ausbildung;
    return z.theoryPassed && z.plan.theorie && !z.theorieWait && z.standPct === stand(DB.students.find((s) => s.id === "w2")) ? null : JSON.stringify({ p: z.theoryPassed, w: z.theorieWait, pct: z.standPct });
  }));
  await page.evaluate(() => { const b = document.getElementById("toast").querySelector("button"); if (b) b.click(); }); await warte(page, 400);
  await pruefe("W3", "Rückgängig: alter Stand (wartet wieder an, 20 % weg, Liste wieder da)", async () => {
    const z = await page.evaluate(() => { const r = DB.students.find((s) => s.id === "w2"); return { theorie: !!r.plan.theorie, wait: r.theorieWait, passed: r.theoryPassed, ready: r.ready, waitBis: r.theorieWaitBis, hist: (r.hist || []).filter((h) => (h.typ || h.type) === "theorie").length, stand: stand(r) }; });
    if (z.theorie || z.passed || z.ready || z.waitBis || z.hist) return "Rest: " + JSON.stringify(z);
    if (z.wait !== "2026-11-05T08:00:00.000Z" || z.stand !== vorher) return "Stand: " + JSON.stringify(z) + " vorher " + vorher;
    const n = await namen(page); return n.join() === "Anna Wartet,Ben Wartet" ? null : "Liste: " + n.join();
  });
  await pruefe("W4", "keine JS-Fehler", () => jsFehler);
  await pruefe("W4b", "360 px: nichts ragt heraus", () => breit(page));
  await ctx.close();
}
{
  const { ctx, page, jsFehler } = await starte({ w: 740, h: 360 });
  await pruefe("W5", "quer: nichts ragt heraus, Knopf ≥ 44 px", async () => (await breit(page)) || page.evaluate(() => { const b = document.querySelector("[data-theo-ok]"); return b && b.getBoundingClientRect().height >= 43.5 ? null : "Knopf klein/fehlt"; }));
  await pruefe("W5b", "keine JS-Fehler (quer)", () => jsFehler);
  await ctx.close();
}
// Werkstatt 12: „Theorie bestanden“ der App setzt auch das Büro-Häkchen (schueler.theorie_bestanden_am), als einzelnes Update
{
  const { ctx, page, jsFehler } = await starte();
  await page.evaluate(() => {
    _authUser = { id: "u-ich" }; _authProfile = { fahrschule_id: "fs-muster" };
    window._rec = []; window._modus = "ok";
    ["w1", "w2", "w3"].forEach((i) => { _schuelerFristen[i] = { theorie_bestanden_am: null, vorbesitz: [] }; });
    window.getSupa = () => ({ from: (tab) => ({ update: (v) => ({ eq: (c, id) => { window._rec.push({ tab, v, c, id, modus: window._modus });
      const antwort = () => {
        if (window._modus === "netz") return { error: { message: "Failed to fetch" } };
        if (window._modus === "buero") return { error: { code: "P0001", message: "Fristen, Reaktivierung und Aktiv-Status darf nur das Büro ändern." } };
        if (window._modus === "neu") return { error: { code: "P0001", message: "Das Datum „Theorie bestanden“ kann nur das Büro ändern." } };
        if (window._modus === "leer") return { data: [], error: null };
        return { data: [{ id }], error: null };
      };
      return { select: () => Promise.resolve(antwort()) }; } }) }) });
    localStorage.removeItem("kompass-theorie-offen");
  });
  const heute = await page.evaluate(() => todayISO());
  const rec = () => page.evaluate(() => window._rec.map((r) => ({ tab: r.tab, v: r.v, id: r.id })));
  const setzeModus = (m) => page.evaluate((m) => { window._modus = m; }, m);
  const tipp = async (id) => { await page.click(`[data-theo-ok="${id}"]`); await warte(page, 350); };
  const schlange = () => page.evaluate(() => localStorage.getItem("kompass-theorie-offen"));
  await tipp("w2");
  await pruefe("T1a", "grüner Knopf sendet ein Update an schueler mit theorie_bestanden_am = heute", async () => {
    const r = await rec(); return r.length === 1 && r[0].tab === "schueler" && r[0].v.theorie_bestanden_am === heute && r[0].id === "w2" && Object.keys(r[0].v).length === 1 ? null : JSON.stringify(r);
  });
  await pruefe("T1b", "Akte zeigt ohne „vom Büro“", () => page.evaluate(() => { routeDetail("w2"); const h = fristenHinweisHTML("w2"); return /Theorieprüfung bestanden am/.test(h) && !/vom Büro/.test(h) ? null : h.slice(0, 200); }));
  await pruefe("T3", "Schalter aus in der Akte sendet null", async () => {
    await page.evaluate(() => document.getElementById("dashTheoToggle").click()); await warte(page, 350);
    const r = await rec(); return r.length === 2 && r[1].v.theorie_bestanden_am === null && r[1].id === "w2" ? null : JSON.stringify(r);
  });
  await pruefe("T1c", "Schalter an in der Akte sendet heute", async () => {
    await page.evaluate(() => { routeDetail("w2"); document.getElementById("dashTheoToggle").click(); }); await warte(page, 350);
    const r = await rec(); return r.length === 3 && r[2].v.theorie_bestanden_am === heute ? null : JSON.stringify(r);
  });
  await page.evaluate(() => { _pruefTab = "wait"; routePruefungen(); });
  await tipp("w1");
  await pruefe("T2", "Rückgängig sendet den alten Wert (null)", async () => {
    const n0 = (await rec()).length;
    await page.evaluate(() => { const b = document.getElementById("toast").querySelector("button"); if (b) b.click(); }); await warte(page, 400);
    const r = await rec(); return r.length === n0 + 1 && r[n0].v.theorie_bestanden_am === null && r[n0].id === "w1" ? null : JSON.stringify(r.slice(n0 - 1));
  });
  await pruefe("T2b", "Schlange danach leer", async () => (await schlange()) === null ? null : await schlange());
  // Ohne Netz: Schlange, später gesendet; nur der letzte Wert je Schüler
  await setzeModus("netz");
  await page.evaluate(() => { _pruefTab = "wait"; routePruefungen(); });
  await tipp("w1");
  await pruefe("T4a", "ohne Netz: Änderung liegt in kompass-theorie-offen", async () => { const s = await schlange(); return s && JSON.parse(s).w1.v === heute ? null : String(s); });
  await pruefe("T4b", "später (Netz da) wird sie gesendet und die Schlange geleert", async () => {
    await setzeModus("ok"); const n0 = (await rec()).length;
    await page.evaluate(() => _theorieOffenNachholen()); await warte(page, 300);
    const r = await rec(); const letzte = r[r.length - 1];
    return r.length > n0 && letzte.id === "w1" && letzte.v.theorie_bestanden_am === heute && (await schlange()) === null ? null : JSON.stringify(r.slice(n0)) + " Schlange " + (await schlange());
  });
  // Server lehnt ab: still verwerfen
  await page.evaluate(() => { localStorage.setItem("kompass-theorie-offen", JSON.stringify({ w3: "2026-11-24" })); });
  await setzeModus("buero");
  await pruefe("T5", "Server: „nur das Büro“ – keine Meldung, Eintrag weg", async () => {
    await page.evaluate(() => _theorieOffenNachholen()); await warte(page, 300);
    const z = await page.evaluate(() => { const e = document.getElementById("toast"); return { an: e.classList.contains("show") && /Büro|Fehler|nicht/i.test(e.textContent), text: e.textContent }; });
    return (await schlange()) === null && !z.an ? null : "Schlange " + (await schlange()) + " Meldung " + JSON.stringify(z);
  });
  // --- Nachbesserung: Abmelden, fremde Einträge, leere Antwort, Ablehnung, veralteter Abruf, Berlin-Datum ---
  const setzeSchlange = (o) => page.evaluate((o) => { localStorage.setItem("kompass-theorie-offen", JSON.stringify(o)); }, o);
  const nachholen = async () => { await page.evaluate(() => _theorieOffenNachholen({ sofort: true })); await warte(page, 300); };
  const toastText = () => page.evaluate(() => { const e = document.getElementById("toast"); return e.classList.contains("show") ? e.textContent : ""; });
  await setzeModus("ok");
  await pruefe("N1", "Abmelden löscht die Schlange (kompass-theorie-offen)", async () => {
    await setzeSchlange({ w3: { v: "2026-11-20", uid: "u-ich", t: Date.now(), n: 0 } });
    await page.evaluate(() => { const a = _authUser, p = _authProfile; _lokaleNutzerdatenLoeschen(); _authUser = a; _authProfile = p; });
    return (await schlange()) === null ? null : await schlange();
  });
  await pruefe("N2", "fremder uid-Eintrag wird nicht gesendet, verworfen; eigener und alter Format-Eintrag gehen raus", async () => {
    const n0 = (await rec()).length;
    await setzeSchlange({ w3: { v: heute, uid: "u-anderer", t: Date.now(), n: 0 } });
    await nachholen();
    const r1 = (await rec()).length - n0; if (r1 !== 0 || (await schlange()) !== null) return "fremd: gesendet " + r1 + " Schlange " + (await schlange());
    await setzeSchlange({ w3: heute }); // altes Format = eigener Eintrag
    await nachholen();
    const r = await rec(); return r.length === n0 + 1 && r[n0].id === "w3" && r[n0].v.theorie_bestanden_am === heute && (await schlange()) === null ? null : "altes Format: " + JSON.stringify(r.slice(n0));
  });
  await pruefe("N3", "0 Zeilen: Eintrag bleibt, Fristen unverändert; später (Schüler da) gesendet", async () => {
    await page.evaluate(() => { const s = DB.students.find((x) => x.id === "w3"); delete s.theorieVonApp; delete s.theorieBuero; _schuelerFristen.w3.theorie_bestanden_am = null; });
    await setzeModus("leer");
    await page.evaluate(() => { const s = DB.students.find((x) => x.id === "w3"); ensure(s); theorieBestandenSetzen(s, true, true); });
    await warte(page, 300);
    const z = await page.evaluate(() => ({ f: _schuelerFristen.w3.theorie_bestanden_am, b: DB.students.find((x) => x.id === "w3").theorieBuero || null, q: JSON.parse(localStorage.getItem("kompass-theorie-offen") || "{}").w3 }));
    if (z.f || z.b) return "Fristen verändert " + JSON.stringify(z);
    if (!z.q || z.q.v !== heute || z.q.n !== 1) return "Schlange " + JSON.stringify(z.q);
    await setzeModus("ok"); const n0 = (await rec()).length;
    await nachholen();
    const z2 = await page.evaluate(() => ({ f: _schuelerFristen.w3.theorie_bestanden_am, b: DB.students.find((x) => x.id === "w3").theorieBuero }));
    return (await schlange()) === null && z2.f === heute && z2.b === heute && (await rec()).length === n0 + 1 ? null : "später " + JSON.stringify(z2) + " Schlange " + (await schlange());
  });
  await pruefe("N3b", "nach 20 Versuchen wird verworfen", async () => {
    await setzeModus("leer"); await setzeSchlange({ w3: { v: heute, uid: "u-ich", t: Date.now(), n: 19, l: 0 } });
    await nachholen(); await setzeModus("ok");
    return (await schlange()) === null ? null : await schlange();
  });
  // Ablehnung: eigener Wert wird zurückgenommen, Server sagt nein
  await page.evaluate(() => { const s = DB.students.find((x) => x.id === "w3"); s.theorieVonApp = "2026-11-20"; _schuelerFristen.w3.theorie_bestanden_am = "2026-11-20"; s.theorieBuero = "2026-11-20"; s.plan.theorie = true; });
  await pruefe("N4", "abgelehnte Rücknahme (neue Datenbank): ruhiger Hinweis, theorieVonApp bleibt, Akte ehrlich", async () => {
    await setzeModus("neu");
    await page.evaluate(() => { const s = DB.students.find((x) => x.id === "w3"); theorieBestandenSetzen(s, false, true); });
    let tx = ""; for (let i = 0; i < 25 && !/Theorie bleibt/.test(tx); i++) { await warte(page, 400); tx = await toastText(); } // ein laufendes Rückgängig hält den Hinweis zurück
    if (!/Theorie bleibt bestanden – das Datum steht im Büro/.test(tx)) return "Hinweis: " + JSON.stringify(tx);
    const z = await page.evaluate(() => { const s = DB.students.find((x) => x.id === "w3"); return { v: s.theorieVonApp, f: _schuelerFristen.w3.theorie_bestanden_am, h: fristenHinweisHTML("w3") }; });
    if (z.v !== "2026-11-20" || z.f !== "2026-11-20") return "Zustand " + JSON.stringify({ v: z.v, f: z.f });
    if (/vom Büro eingetragen/.test(z.h) || !/bestanden am/.test(z.h)) return "Akte: " + z.h.slice(0, 200);
    return (await schlange()) === null ? null : "Schlange " + (await schlange());
  });
  await pruefe("N4a", "abgelehnte Rücknahme: Schalter wieder an, plan.theorie=true, 20 % da, kein zweiter Verlauf", () => page.evaluate(() => {
    const s = DB.students.find((x) => x.id === "w3"); const n = (s.hist || []).filter((h) => (h.typ || h.type) === "theorie").length;
    return s.plan.theorie === true && (s.theoryPassed || "").slice(0, 10) === "2026-11-20" && n <= 1 ? null : JSON.stringify({ t: s.plan.theorie, p: s.theoryPassed, n });
  }));
  await pruefe("N4b", "am selben Tag für denselben Schüler nur einmal", async () => {
    await page.evaluate(() => { document.getElementById("toast").classList.remove("show"); const s = DB.students.find((x) => x.id === "w3"); theorieBestandenSetzen(s, false, true); });
    await warte(page, 350); const tx = await toastText(); return tx ? "zweiter Hinweis: " + tx : null;
  });
  await pruefe("N4c", "Hinweis wartet, solange ein Rückgängig-Hinweis läuft; Knopf bleibt sichtbar, Hinweis kommt danach", async () => {
    await page.evaluate(() => { delete _theorieHinweisTag.w3; const s = DB.students.find((x) => x.id === "w3"); s.plan.theorie = true; s.theorieVonApp = "2026-11-20"; _schuelerFristen.w3.theorie_bestanden_am = "2026-11-20";
      toastUndo("Test zurück", () => {}, 5000); window._h = () => _theorieAbgelehntHinweis("w3", "Theorie bleibt bestanden – das Datum steht im Büro. Ändern kann es nur das Büro."); window._h(); });
    await warte(page, 600);
    const mitten = await page.evaluate(() => { const e = document.getElementById("toast"); return { undo: e.classList.contains("undo"), knopf: !!e.querySelector("button"), text: e.textContent }; });
    if (!mitten.undo || !mitten.knopf || /Theorie bleibt/.test(mitten.text)) return "mitten " + JSON.stringify(mitten);
    await warte(page, 5500);
    const danach = await toastText(); return /Theorie bleibt bestanden/.test(danach) ? null : "danach " + JSON.stringify(danach);
  });
  await pruefe("N5", "alte Datenbank („Fristen, Reaktivierung … nur das Büro“): kein Hinweis", async () => {
    await setzeModus("buero");
    await page.evaluate(() => { document.getElementById("toast").classList.remove("show"); delete _theorieHinweisTag.w3; const s = DB.students.find((x) => x.id === "w3"); theorieBestandenSetzen(s, false, true); });
    await warte(page, 350); const tx = await toastText(); return tx ? "Hinweis: " + tx : null;
  });
  await pruefe("N6", "Neustart-Nachholen (Eintrag in der Schlange) zeigt nie einen Hinweis", async () => {
    await setzeModus("neu"); await page.evaluate(() => { document.getElementById("toast").classList.remove("show"); delete _theorieHinweisTag.w3; _theorieHinweisSids.clear(); });
    await setzeSchlange({ w3: { v: null, uid: "u-ich", t: Date.now(), n: 0 } }); await nachholen();
    const tx = await toastText(); return tx || (await schlange()) !== null ? "Hinweis " + tx + " Schlange " + (await schlange()) : null;
  });
  await pruefe("N7", "veralteter Abruf schaltet nach schnellem An/Aus nicht wieder an", async () => {
    await setzeModus("ok");
    const r = await page.evaluate(async () => {
      const s = DB.students.find((x) => x.id === "w3"); ensure(s);
      s.theorieBuero = null; s.plan.theorie = false; delete s.theorieVonApp; _schuelerFristen.w3.theorie_bestanden_am = null;
      const row = { id: "w3", theorie_bestanden_am: "2026-11-20", fahrlehrer_id: "u-ich", status: "aktiv" };
      const gen = (rows) => ({ then: (ok) => ok({ data: rows, error: null }), select() { return gen(rows); }, eq() { return gen(rows); }, neq() { return gen(rows); }, in() { return gen(rows); }, order() { return gen(rows); }, limit() { return gen(rows); }, maybeSingle() { return Promise.resolve({ data: null, error: null }); }, single() { return Promise.resolve({ data: null, error: null }); } });
      const alt = window.getSupa;
      window.getSupa = () => ({ from: (tab) => (tab === "schueler" ? gen([row]) : gen([])), rpc: async () => ({ data: [], error: null }), auth: { getUser: async () => ({ data: {}, error: null }), getSession: async () => ({ data: {}, error: null }) }, functions: { invoke: async () => ({ data: null, error: null }) } });
      // 1) eigene Änderung offen: veralteter Abruf darf nicht wieder anschalten
      localStorage.setItem("kompass-theorie-offen", JSON.stringify({ w3: { v: null, uid: "u-ich", t: Date.now(), n: 0, l: Date.now() } }));
      _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
      const a = { an: !!s.plan.theorie, jung: _theorieJung("w3") };
      // 2) nichts offen, aber eben gesendet (< 2 Min.): ebenfalls überspringen
      localStorage.removeItem("kompass-theorie-offen"); _theorieZuletzt.w3 = Date.now();
      _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
      const b = { an: !!s.plan.theorie };
      // 3) lange her: der Abruf gilt wieder
      _theorieZuletzt.w3 = Date.now() - 300000; s.theorieBuero = null;
      _schuelerAbrufLaeuft = false; await pullSchuelerZuweisungen();
      const c = { an: !!s.plan.theorie };
      window.getSupa = alt; return { a, b, c };
    });
    return !r.a.an && r.a.jung && !r.b.an && r.c.an ? null : JSON.stringify(r);
  });
  await pruefe("N8", "Berliner Datum: _berlinHeute() = JJJJ-MM-TT (Berlin)", () => page.evaluate(() => {
    const d = _berlinHeute(); const soll = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && d === soll ? null : d + " / " + soll;
  }));
  await pruefe("T6", "normaler Upsert (_schuelerZeile) enthält theorie_bestanden_am nicht", () => page.evaluate(() => {
    const z = _schuelerZeile(DB.students.find((s) => s.id === "w2")); return !("theorie_bestanden_am" in z) && !JSON.stringify(z).includes("theorie_bestanden_am") ? null : "enthalten";
  }));
  await pruefe("T7", "Rückkehr desselben Werts vom Abruf: kein zweiter Verlauf, Stand bleibt", () => page.evaluate(() => {
    const s = DB.students.find((x) => x.id === "w2"); ensure(s); const h0 = (s.hist || []).length, pl0 = !!s.plan.theorie;
    _theorieVomBuero(s, s.theorieVonApp || todayISO()); return (s.hist || []).length === h0 && !!s.plan.theorie === pl0 && !s.theoryVomBuero ? null : "Verlauf " + h0 + "->" + (s.hist || []).length;
  }));
  await pruefe("T8", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\nTheorie-wartet-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
