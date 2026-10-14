// Lkw-Test (Schritt 6, 14.10.2026): Klassen C1, C1E, C, CE in der Fahrlehrer-App.
// Prüft Sonderfahrten nach Anlage 4 FahrschAusbO je Klasse und Weg, den Lkw-Lehrplan (amtliche Grundfahraufgaben,
// Abfahrtkontrolle, Verbinden/Trennen), Prüfungsdauer 85 Minuten, Klasse aus dem Büro, und dass die Pkw-Werte bleiben.
// Dazu Schritt 3: „Praxisprüfung bestanden (Büro)“ in der Akte und der einmalige Hinweis.
// Nur erfundene Testdaten. Keine Datenbank: alle Fremdanfragen blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lkw-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
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
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

let fehler = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { console.log(`ok  ${id} ${text}`); return; }
  fehler++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}

const HILFEN = `
window.__t = {
  setze() {
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const mk = (id, name, form, weg) => { const s = { id, name, form, lkwWeg: weg, created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }; ensure(s); return s; };
    DB.students = [mk("b1", "Bea Erfunden", "B"), mk("c1", "Carl Erfunden", "C"), mk("ce1", "Cem Erfunden", "CE"), mk("ce2", "Cora Erfunden", "CE", "C+CE"), mk("c1e", "Cid Erfunden", "C1E")];
    DB.lessons = []; DB.termine = []; DB.exams = [];
    save();
  },
  stud: (id) => DB.students.find((x) => x.id === id),
};`;

const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(600);
await page.evaluate((h) => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
  (0, eval)(h);
  __t.setze();
}, HILFEN);

await pruefe("L1", "Sonderfahrten je Klasse (Anlage 4): B 5/4/3, C 5/2/3, CE 5/2/3, C+CE 8/3/3, C1E 3/1/1", () => page.evaluate(() => {
  const w = (id) => sonderWerte(__t.stud(id)).join("/");
  const ist = { b1: w("b1"), c1: w("c1"), ce1: w("ce1"), ce2: w("ce2"), c1e: w("c1e") };
  const soll = { b1: "5/4/3", c1: "5/2/3", ce1: "5/2/3", ce2: "8/3/3", c1e: "3/1/1" };
  return Object.keys(soll).filter((k) => ist[k] !== soll[k]).map((k) => `${k}: ${ist[k]} statt ${soll[k]}`);
}));
await pruefe("L2", "Lehrplan: CE hat CE-Grundfahraufgaben und Verbinden/Trennen, C hat Abfahrtkontrolle, B bleibt Pkw", () => page.evaluate(() => {
  const ids = (id) => stufenFor(__t.stud(id)).flatMap((st) => st.items.map((it) => it.id));
  const ce = ids("ce1"), c = ids("c1"), b = ids("b1"), f = [];
  if (!ce.includes("lk_gfa_ce_ecke") || ce.includes("lk_gfa_rampe_r") || !ce.includes("lk_vt_an") || ce.includes("lk_ak_fts")) f.push("CE falsch");
  if (!c.includes("lk_gfa_rampe_r") || !c.includes("lk_ak_fts") || c.includes("lk_vt_an")) f.push("C falsch");
  if (!b.includes("gf_laengs") || b.some((x) => x.startsWith("lk_"))) f.push("B verändert");
  if (!ce.includes("s_ab_ein")) f.push("Sonderfahrten fehlen bei CE");
  return f;
}));
await pruefe("L3", "Prüfungsdauer: Lkw 85 Minuten, Pkw 55 Minuten", () => page.evaluate(() => {
  const r = [pruefMinFuer(__t.stud("ce1")), pruefMinFuer(__t.stud("b1"))].join("/");
  return r === "85/55" ? null : r;
}));
await pruefe("L4", "Klasse aus dem Büro: B78 → Automatik, CE bleibt CE, BKF → B", () => page.evaluate(() => {
  const r = ["B78", "CE", "C1", "BKF", "B+BE"].map(formAusKlasse).join(",");
  return r === "Automatik,CE,C1,B,B" ? null : r;
}));
await pruefe("L5", "Akte eines CE-Schülers: öffnet ohne Fehler, Weg wählbar, Sonderfahrten passen sich an", async () => {
  await page.evaluate(() => routeDetail("ce1"));
  await page.waitForTimeout(300);
  const f = [];
  const weg = await page.$$eval("#dashLkwWeg .pill", (b) => b.map((x) => x.textContent));
  if (weg.join("|") !== "von C nach CE|C und CE zusammen") f.push("Weg-Knöpfe: " + weg.join("|"));
  await page.click('#dashLkwWeg .pill[data-weg="C+CE"]');
  await page.waitForTimeout(250);
  if ((await page.evaluate(() => __t.stud("ce1").lkwWeg)) !== "C+CE") f.push("Weg wird nicht gespeichert");
  if ((await page.evaluate(() => sfOffen(__t.stud("ce1"), "ueberland"))) !== 8) f.push("Überland-Soll nicht 8");
  const breite = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (breite > 1) f.push("seitlich wischbar um " + breite + " px");
  return f;
});
await pruefe("L6", "Bei 360 px und quer: Akte CE ohne seitliches Wischen", async () => {
  const f = [];
  for (const [w, h] of [[360, 780], [780, 360]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => routeDetail("ce2"));
    await page.waitForTimeout(250);
    const b = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (b > 1) f.push(`${w}×${h}: ${b} px zu breit`);
  }
  await page.setViewportSize({ width: 412, height: 915 });
  return f;
});
await pruefe("L7", "Praxisprüfung bestanden (Büro) steht grün in der Akte", () => page.evaluate(() => {
  _schuelerFristen.b1 = { praxis_bestanden_am: "2026-10-12", theorie_bestanden_am: "2026-09-01" };
  const h = fristenHinweisHTML("b1");
  return /Praxisprüfung bestanden am 12\.10\./.test(h) && /Theorieprüfung bestanden/.test(h) ? null : "fehlt: " + h.slice(0, 120);
}));
await pruefe("L8", "Hinweis „Vom Büro eingetragen“ nur bei neuen Ergebnissen, nicht beim ersten Abgleich", () => page.evaluate(() => {
  Object.keys(localStorage).filter((k) => k.startsWith("serband-buero-ergebnisse")).forEach((k) => localStorage.removeItem(k));
  const meldungen = []; const alt = window.toast; window.toast = (m) => meldungen.push(m);
  _meldeBueroErgebnisse([{ id: "b1", name: "Bea Erfunden", theorie_bestanden_am: "2026-09-01" }]);
  const nachErstem = meldungen.length;
  _meldeBueroErgebnisse([{ id: "b1", name: "Bea Erfunden", theorie_bestanden_am: "2026-09-01", praxis_bestanden_am: "2026-10-12" }]);
  _meldeBueroErgebnisse([{ id: "b1", name: "Bea Erfunden", theorie_bestanden_am: "2026-09-01", praxis_bestanden_am: "2026-10-12" }]);
  window.toast = alt;
  if (nachErstem !== 0) return "Hinweis schon beim ersten Abgleich";
  if (meldungen.length !== 1 || !/Praxisprüfung bestanden/.test(meldungen[0])) return "Hinweise: " + JSON.stringify(meldungen);
  return null;
}));
await pruefe("L8b", "erstes Büro-Ergebnis wird gemeldet, auch wenn beim ersten Abgleich noch keins da war", () => page.evaluate(() => {
  Object.keys(localStorage).filter((k) => k.startsWith("serband-buero-ergebnisse")).forEach((k) => localStorage.removeItem(k));
  const meldungen = []; const alt = window.toast; window.toast = (m) => meldungen.push(m);
  _meldeBueroErgebnisse([{ id: "b1", name: "Bea Erfunden" }]);
  _meldeBueroErgebnisse([{ id: "b1", name: "Bea Erfunden", praxis_bestanden_am: "2026-10-13" }]);
  window.toast = alt;
  return meldungen.length === 1 ? null : "Hinweise: " + JSON.stringify(meldungen);
}));
await pruefe("L10", "C und CE zusammen: Grundfahraufgaben C und Abfahrtkontrolle gehören dazu; Zugwahl blendet 2 CE-Aufgaben aus", () => page.evaluate(() => {
  const ids = (s) => lkwStufen(s).flatMap((st) => st.items.map((it) => it.id));
  const allein = ids({ form: "CE", lkwWeg: "C" }), zusammen = ids({ form: "CE", lkwWeg: "C+CE" });
  if (allein.includes("lk_gfa_rampe_r") || allein.includes("lk_ak_fts")) return "CE allein hat C-Aufgaben";
  if (!zusammen.includes("lk_gfa_rampe_r") || !zusammen.includes("lk_ak_fts") || !zusammen.includes("lk_vt_an")) return "C+CE unvollständig";
  const c1e = ids({ form: "C1E", lkwWeg: "C1+C1E" });
  if (!c1e.includes("lk_gfa_laengs") || !c1e.includes("lk_ak_brems")) return "C1+C1E unvollständig";
  const sattel = ids({ form: "CE", lkwWeg: "C", lkwZug: "sattel" });
  if (!sattel.includes("lk_gfa_ce_ecke") || sattel.includes("lk_gfa_ce_umk")) return "Sattelzug falsch";
  const glieder = ids({ form: "CE", lkwWeg: "C", lkwZug: "glieder" });
  if (glieder.includes("lk_gfa_ce_ecke") || !glieder.includes("lk_gfa_ce_gerade")) return "Gliederzug falsch";
  if (ids({ form: "CE" }).filter((i) => i.startsWith("lk_gfa_ce_")).length !== 4) return "ohne Wahl nicht alle 4";
  return null;
}));
await pruefe("L11", "erster Abgleich nach dem Update: Büro-Klasse B überschreibt Automatik/BE/B197 nicht; spätere Büro-Änderung und Lkw-Klasse wirken", () => page.evaluate(async () => {
  const altSupa = window.getSupa, altUser = _authUser, altProfil = _authProfile, altStudents = DB.students;
  const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
  const mk = (id, name, form) => { const s = { id, name, form, created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }; ensure(s); return s; };
  DB.students = [mk("x1", "Anna Erfunden", "Automatik"), mk("x2", "Ben Erfunden", "BE"), mk("x3", "Cem Erfunden", "B197"), mk("x4", "Dana Erfunden", "B")];
  let rows = [["x1", "B"], ["x2", "B"], ["x3", "B"], ["x4", "CE"]].map(([id, klasse]) => ({ id, name: "Erfunden", klasse, status: "aktiv", fahrlehrer_id: "me" }));
  const mkq = (tab) => { const res = async () => ({ data: tab === "schueler" ? rows : [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (ok, no) => res().then(ok, no) : k === "single" || k === "maybeSingle" ? res : () => q), apply: () => q }); return q; };
  window.getSupa = () => ({ from: (t) => mkq(t), rpc: async () => ({ data: null, error: null }), auth: { getUser: async () => ({ data: {}, error: null }), getSession: async () => ({ data: {}, error: null }) }, functions: { invoke: async () => ({}) } });
  _authUser = { id: "me", email: "me@example.org" }; _authProfile = { id: "me", fahrschule_id: "fs-x", rolle: "fahrlehrer" };
  let fehler = null;
  try {
    await pullSchuelerZuweisungen();
    const erst = DB.students.map((s) => s.form).join(",");
    if (erst !== "Automatik,BE,B197,CE") fehler = "erster Abgleich: " + erst;
    else {
      rows = rows.map((r) => r.id === "x1" ? Object.assign({}, r, { klasse: "BE" }) : r);
      await pullSchuelerZuweisungen();
      const dann = DB.students.map((s) => s.form).join(",");
      if (dann !== "BE,BE,B197,CE") fehler = "nach Büro-Änderung: " + dann;
    }
  } catch (e) { fehler = "Ausnahme: " + e.message; }
  window.getSupa = altSupa; _authUser = altUser; _authProfile = altProfil; DB.students = altStudents; save();
  return fehler;
}));
await pruefe("L9", "keine JS-Fehler", () => (jsFehler.length ? jsFehler.slice(0, 5) : null));

await browser.close();
server.close();
console.log(fehler ? `Lkw-Test: ${fehler} Fehler.` : "Lkw-Test: alles in Ordnung.");
process.exit(fehler ? 1 : 0);
