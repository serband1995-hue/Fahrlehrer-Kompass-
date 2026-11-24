// Büro-Test K16 + K18 (Werkstatt 12, 23.11.2026), erfundene Daten, keine Datenbank.
//   G1  Start: alle Gruppen der Seitenleiste zu, nur die der offenen Seite auf (auch mit altem localStorage „buero-nav-zu“)
//   G2  Seitenwechsel klappt die Zielgruppe auf, die alte bleibt wie sie war
//   G3  Von Hand auf- und zuklappen (auch die aktive Gruppe)
//   G4  Handy 375 px: Menü aufklappen, Gruppen zu, Seite wechseln klappt Zielgruppe auf, nichts wischt seitlich
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
async function oeffne({ hash = "#heute", breite = 1366, hoehe = 900, code = "", vorher = "" } = {}) {
  const daten = bauDaten(new Date().toISOString().slice(0, 10));
  const session = { user: { id: "ad-1", email: "ad-1@example.org" } };
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
  await page.goto(basis + "buero.html" + hash);
  await warte(page, 700);
  return { page, ctx, konsole };
}
const gruppen = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-gruppe]")].map((b) => [b.dataset.gruppe, b.getAttribute("aria-expanded") === "true" && !b.nextElementSibling.hidden])));
const offene = (g) => Object.entries(g).filter(([, v]) => v).map(([k]) => k).join(",");
const log = (page, tab, art) => page.evaluate(([t, a]) => window.__FAKE.log.filter((x) => x.tabelle === t && x.art === a), [tab, art]);

// ---- K16 Desktop ----
{
  // alter Merker aus früherer Version darf den neuen Start nicht stören
  const { page, ctx, konsole } = await oeffne({ hash: "#kalender", vorher: `try { localStorage.setItem("buero-nav-zu", JSON.stringify(["Planung"])); } catch (e) {}` });
  let g = await gruppen(page);
  pruefe("G1", "Start auf #kalender: nur „Planung“ ist auf (alter Merker stört nicht)", Object.keys(g).length >= 4 && offene(g) === "Planung" ? null : "offen: " + offene(g) + " von " + Object.keys(g));
  await page.evaluate(() => { location.hash = "#zahlen"; }); await warte(page);
  g = await gruppen(page);
  pruefe("G2", "Seitenwechsel auf „Zahlen“ klappt „Geld“ auf, „Planung“ bleibt auf", offene(g) === "Planung,Geld" ? null : "offen: " + offene(g));
  await page.click('[data-gruppe="Planung"]'); await warte(page, 150);
  g = await gruppen(page);
  pruefe("G3a", "Von Hand zuklappen geht", offene(g) === "Geld" ? null : "offen: " + offene(g));
  await page.click('[data-gruppe="Verwaltung"]'); await warte(page, 150);
  g = await gruppen(page);
  pruefe("G3b", "Von Hand aufklappen geht", offene(g) === "Geld,Verwaltung" ? null : "offen: " + offene(g));
  await page.click('[data-gruppe="Geld"]'); await warte(page, 150);
  await page.evaluate(() => { location.hash = "#verkaeufe"; }); await warte(page);
  g = await gruppen(page);
  pruefe("G3c", "Von Hand zugeklappte Gruppe bleibt zu, solange man die Gruppe nicht verlässt", offene(g) === "Verwaltung" ? null : "offen: " + offene(g));
  await page.evaluate(() => { location.hash = "#heute"; }); await warte(page);
  g = await gruppen(page);
  pruefe("G3d", "Wechsel in eine andere Gruppe klappt deren Gruppe auf", g.Arbeit ? null : "offen: " + offene(g));
  pruefe("G1k", "keine Konsolenfehler", konsole);
  await ctx.close();
}
// ---- K16 Handy ----
{
  const { page, ctx, konsole } = await oeffne({ hash: "#flotte", breite: 375, hoehe: 740 });
  await page.click("#menueKnopf"); await warte(page, 200);
  let g = await gruppen(page);
  pruefe("G4a", "Handy: Menü auf, nur „Verwaltung“ ist auf", offene(g) === "Verwaltung" ? null : "offen: " + offene(g));
  await page.click('[data-gruppe="Arbeit"]'); await warte(page, 150);
  await page.click('.nav-punkt[href="#pruefungen"]'); await warte(page, 400);
  g = await gruppen(page);
  pruefe("G4b", "Handy: Seite wechseln klappt „Arbeit“ auf, Menü geht zu", g.Arbeit && !(await page.evaluate(() => document.body.classList.contains("menue-offen"))) ? null : "offen: " + offene(g));
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
