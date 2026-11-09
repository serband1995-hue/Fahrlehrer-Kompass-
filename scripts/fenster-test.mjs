// Paket 2: Fenster-Stapel, Zurück, Rückfrage bei Eingaben, Rückgängig, Korrigieren (App, index.html).
// Erfundene Testdaten, keine Datenbank (Supabase-Bibliothek gesperrt).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/fenster-test.mjs
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
    const body = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(body);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let rot = 0, gruen = 0;
const fall = async (name, fn) => {
  let p = [];
  try { p = (await fn()) || []; } catch (e) { p = ["Testfehler: " + String(e.message || e).split("\n")[0]]; }
  if (js.length) { p.push("JS-Fehler: " + js.join(" | ").slice(0, 300)); js.length = 0; }
  if (p.length) { rot++; console.log("ROT   " + name); p.forEach((x) => console.log("        - " + x)); } else { gruen++; console.log("GRÜN  " + name); }
};
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
const page = await ctx.newPage();
const js = [];
let dialogAntwort = true;
page.on("pageerror", (e) => js.push(String(e)));
page.on("dialog", (d) => (dialogAntwort ? d.accept() : d.dismiss()).catch(() => {}));
await page.route(/cdn\.jsdelivr|fonts\.(googleapis|gstatic)/, (r) => r.abort());
await page.goto(basis + "index.html"); await page.waitForTimeout(1200);

const vorbereiten = () => page.evaluate(() => {
  const h = todayISO(), m = addDays(h, 2);
  ensureAusbildungsplaene(); const c = DB.ausbildungsplaene[0];
  DB.students = [{ id: "s1", name: "Anna Muster", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0151 1111111" }];
  DB.lessons = [
    { id: "L1", sid: "s1", date: m, von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant", note: "" },
    { id: "L2", sid: "s1", date: addDays(h, -3), von: "10:00", bis: "11:30", art: "fahrstunde", status: "geplant", note: "" }];
  DB.exams = []; DB.termine = [];
  DB.workCfg.fahrzeuge = [{ id: "fzA", name: "Testauto", typ: "schalt" }];
  save(); closeSheet(); _navStack = []; routeDashboard();
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
});
const zur = () => page.evaluate(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
const w = (ms = 120) => page.waitForTimeout(ms);
const sheetTitel = () => page.evaluate(() => { const s = document.getElementById("sheet"); return s.classList.contains("open") ? (s.querySelector(".sheet-h")?.textContent || "(ohne Titel)") : "ZU"; });

await vorbereiten();
await fall("A6a Termin → Bearbeiten → Zurück: wieder im Termin-Fenster, dann zu", async () => {
  const f = [];
  await page.evaluate(() => openEventSheet("lesson", "L1", "s1")); await w();
  const t1 = await sheetTitel();
  await page.click("#esEdit"); await w();
  const t2 = await sheetTitel();
  await zur(); await w(300);
  const t3 = await sheetTitel();
  await zur(); await w(300);
  const t4 = await sheetTitel();
  if (t2 === t1) f.push("Bearbeiten öffnet kein neues Fenster");
  if (t3 !== t1) f.push("Zurück aus Bearbeiten: „" + t3 + "“ statt „" + t1 + "“");
  if (t4 !== "ZU") f.push("zweites Zurück schließt nicht: " + t4);
  return f;
});
await fall("A6b Fahrstunde → Fahrzeug → Zurück: Eingaben in Schritt 2 noch da", async () => {
  const f = [];
  await page.evaluate(() => openAddLessonSheet("fahrstunde")); await w();
  await page.click('#alList .as-item[data-sid="s1"]'); await w();
  await page.fill("#alNote", "Treffpunkt Bahnhof");
  await page.click("#alSave"); await w();
  if (!(await page.$(".fz-opt"))) f.push("Fahrzeugwahl nicht offen");
  await zur(); await w(300);
  const note = await page.evaluate(() => document.getElementById("alNote")?.value ?? "(weg)");
  if (note !== "Treffpunkt Bahnhof") f.push("Notiz nach Zurück: " + note);
  dialogAntwort = true; await zur(); await w(300); // Schritt 2 hat Eingaben → Rückfrage (angenommen) → Schritt 1
  if (!(await page.$("#alList"))) f.push("Zweites Zurück führt nicht zu „mit wem?“: " + (await sheetTitel()));
  await zur(); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("drittes Zurück schließt nicht");
  return f;
});
await fall("A9 Tippen daneben mit Eingabe fragt nach; „Nein“ lässt das Fenster offen", async () => {
  const f = [];
  await page.evaluate(() => openTodoAdd()); await w();
  const inp = await page.$("#sheet input[type=text], #sheet textarea");
  if (!inp) return ["kein Eingabefeld in „Aufgabe“"];
  await inp.fill("Bremsen üben");
  dialogAntwort = false; await page.evaluate(() => document.getElementById("sheetScrim").click()); await w(300);
  if ((await sheetTitel()) === "ZU") f.push("Fenster ohne Rückfrage zu");
  dialogAntwort = true; await page.evaluate(() => document.getElementById("sheetScrim").click()); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("nach „Verwerfen“ nicht zu");
  return f;
});
await fall("A20 ✕ und Esc schließen eine Ebene, Griff ist da", async () => {
  const f = [];
  await page.evaluate(() => openEventSheet("lesson", "L1", "s1")); await w();
  if (!(await page.$("#sheet .sheet-griff"))) f.push("kein Griff");
  const x = await page.$("#sheet .sheet-x"); if (!x) return ["kein ✕"];
  const bb = await x.boundingBox(); if (bb.width < 44 || bb.height < 44) f.push("✕ kleiner als 44 px");
  await page.click("#esEdit"); await w();
  await page.keyboard.press("Escape"); await w(300);
  if (!(await page.$("#esEdit"))) f.push("Esc ging nicht genau eine Ebene zurück: " + (await sheetTitel()));
  await page.click("#sheet .sheet-x"); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("✕ schließt nicht");
  return f;
});
await fall("G2 Neuer Termin → Andere Art → Zurück: wieder bei „Neuer Termin“", async () => {
  const f = [];
  await page.evaluate(() => openNeuerTerminSheet()); await w();
  const t1 = await sheetTitel();
  await page.click("#ntAndere"); await w(300);
  const t2 = await sheetTitel();
  await zur(); await w(300);
  const t3 = await sheetTitel();
  if (t2 === t1) f.push("„Andere Art“ öffnet kein Unterfenster");
  if (t3 !== t1) f.push("Zurück: „" + t3 + "“ statt „" + t1 + "“");
  await page.evaluate(() => closeSheet());
  return f;
});
await fall("Nach dem Speichern kein veraltetes Fenster im Stapel", async () => {
  const f = [];
  await page.evaluate(() => openEventSheet("lesson", "L1", "s1")); await w();
  await page.click("#esEdit"); await w();
  await page.evaluate(() => save());
  await page.evaluate(() => openVehiclePicker({}, () => {})); await w();
  await zur(); await w(300);
  if ((await sheetTitel()) !== "ZU") f.push("nach save() führt Zurück in ein altes Fenster: " + (await sheetTitel()));
  return f;
});

const titel = () => page.evaluate(() => document.getElementById("tbTitle").textContent.trim());
await fall("A7 Neuer Schüler → Zurück: zurück zur Schülerliste, mit Rückfrage bei Eingabe", async () => {
  const f = [];
  await vorbereiten();
  await page.evaluate(() => { routeHome(); routeSchuelerForm(null); }); await w();
  await page.fill("#f_name", "Ida Muster");
  dialogAntwort = false; await zur(); await w(200);
  if ((await titel()) !== "Neuer Schüler") f.push("ohne Rückfrage verlassen: " + (await titel()));
  dialogAntwort = true; await zur(); await w(200);
  if ((await titel()) !== "Schüler") f.push("Zurück führt nicht zur Schülerliste: " + (await titel()));
  await page.evaluate(() => { routeDetail("s1"); routeSchuelerForm("s1"); }); await w();
  await zur(); await w(200);
  if ((await titel()) !== "Schülerdatei") f.push("Bearbeiten → Zurück: " + (await titel()) + " statt Schülerdatei");
  return f;
});
await fall("A7 Ergebnis eintragen: Zurück aus Schritt 2 → Schritt 1 → vorige Seite", async () => {
  const f = [];
  await vorbereiten();
  await page.evaluate(() => { DB.pruefer = ["Prüfer X"]; routePruefungen(); routeErgebnis("s1"); }); await w();
  await page.evaluate(() => { document.querySelector('[data-pr="Prüfer X"]')?.click(); }); await w();
  await page.evaluate(() => document.getElementById("pickFail")?.click()); await w();
  const schritt2 = await page.evaluate(() => !!document.querySelector("#view [data-entwurf]"));
  await zur(); await w(200);
  const schritt1 = await page.evaluate(() => !!document.getElementById("pickFail"));
  await zur(); await w(200);
  if (!schritt2) f.push("Schritt 2 nicht erreicht");
  if (!schritt1) f.push("Zurück aus Schritt 2 landet nicht in Schritt 1");
  if ((await titel()) !== "Prüfungen") f.push("Zurück aus Schritt 1: " + (await titel()) + " statt Prüfungen");
  return f;
});
await fall("A24 Kalender Woche → Tag → Zurück: wieder Woche", async () => {
  const f = [];
  await vorbereiten();
  await page.evaluate(() => { _calView = "woche"; _calDate = todayISO(); routeKalender(); }); await w();
  await page.evaluate(() => document.querySelector("[data-calday]")?.click()); await w();
  const tag = await page.evaluate(() => _calView);
  await zur(); await w(200);
  const danach = await page.evaluate(() => [_calView, document.getElementById("tbTitle").textContent.trim()]);
  if (tag !== "tag") f.push("Vorbereitung: nicht in der Tagesansicht");
  if (danach[0] !== "woche" || danach[1] !== "Kalender") f.push("Zurück: " + danach.join("/"));
  return f;
});
await fall("A8 Notiz wird beim Tippen gespeichert (auch bei Zurück)", async () => {
  await vorbereiten();
  await page.evaluate(() => { routeDetail("s1"); routeNotes("s1"); }); await w();
  await page.fill("#noteArea", "Mag klare Ansagen");
  await zur(); await w(200);
  const n = await page.evaluate(() => DB.students.find((x) => x.id === "s1").notiz || "");
  return n === "Mag klare Ansagen" ? [] : ["Notiz nach Zurück: „" + n + "“"];
});
await fall("A18 Termin löschen: sofort weg, „Rückgängig“ holt ihn zurück", async () => {
  const f = [];
  await vorbereiten();
  await page.evaluate(() => { routeKalender(); openEventSheet("lesson", "L1", "s1"); }); await w();
  await page.evaluate(() => document.getElementById("esDelete").click()); await w(200);
  const weg = await page.evaluate(() => !DB.lessons.some((l) => l.id === "L1"));
  const knopf = await page.$("#toast .ut-btn");
  if (!weg) f.push("Termin nicht gelöscht");
  if (!knopf) return f.concat(["kein Rückgängig-Knopf"]);
  await knopf.click(); await w(200);
  if (!(await page.evaluate(() => DB.lessons.some((l) => l.id === "L1")))) f.push("Rückgängig holt den Termin nicht zurück");
  return f;
});
await fall("D1/D7 Schüler „bei mir ausblenden“: bleibt in DB, künftige Termine abgesagt, Einblenden geht", async () => {
  const f = [];
  await vorbereiten();
  dialogAntwort = true;
  await page.evaluate(() => { routeDetail("s1"); }); await w();
  await page.evaluate(() => document.getElementById("delBtn").click()); await w(300);
  const r = await page.evaluate(() => ({ da: DB.students.some((x) => x.id === "s1"), aus: !!(DB.students.find((x) => x.id === "s1") || {}).ausgeblendetAm,
    liste: activeStudents().some((x) => x.id === "s1"), L1: DB.lessons.some((l) => l.id === "L1"), L2: DB.lessons.some((l) => l.id === "L2"),
    zeile: _schuelerZeile ? true : false }));
  if (!r.da || !r.aus) f.push("Schüler nicht nur ausgeblendet: " + JSON.stringify(r));
  if (r.liste) f.push("ausgeblendeter Schüler noch in der Liste");
  if (r.L1) f.push("künftiger Termin nicht abgesagt");
  if (!r.L2) f.push("vergangener Termin wurde gelöscht");
  await page.evaluate(() => { routeArchive(); }); await w();
  const ein = await page.$('[data-einblenden="s1"]');
  if (!ein) f.push("Archiv zeigt den Schüler nicht unter „Ausgeblendet“");
  else { await page.evaluate(() => document.querySelector('[data-einblenden="s1"]').click()); await w(); if (!(await page.evaluate(() => activeStudents().some((x) => x.id === "s1")))) f.push("Einblenden geht nicht"); }
  return f;
});
await fall("A4 Prüfungsergebnis in der Akte ändern und löschen", async () => {
  const f = [];
  await vorbereiten();
  await page.evaluate(() => { DB.pruefer = ["Prüfer X", "Prüfer Y"]; const s = DB.students[0]; s.attempts = 1;
    DB.exams = [{ id: "E1", sid: "s1", name: s.name, date: addDays(todayISO(), -2), result: "fail", pruefer: "Prüfer X", attempt: 1, earnAt: addDays(todayISO(), -2), faults: [] }]; save(); routeAktePruefung("s1"); }); await w();
  const zeile = await page.$('#view .ap-erg[data-exid="E1"]');
  if (!zeile) return ["Ergebniszeile nicht antippbar"];
  await zeile.click(); await w();
  await page.evaluate(() => document.querySelector('#sheet [data-erg="pass"]').click());
  await page.selectOption("#ekPruefer", "Prüfer Y");
  await page.evaluate(() => document.getElementById("ekSpeichern").click()); await w(200);
  const r = await page.evaluate(() => { const e = DB.exams.find((x) => x.id === "E1"), s = DB.students[0]; return { res: e.result, pr: e.pruefer, passed: !!s.passed, att: s.attempts || 0, n: DB.exams.length }; });
  if (r.res !== "pass" || r.pr !== "Prüfer Y") f.push("nicht geändert: " + JSON.stringify(r));
  if (!r.passed || r.att !== 0) f.push("Archiv/Versuche nicht angepasst: " + JSON.stringify(r));
  if (r.n !== 1) f.push("zweiter Eintrag angelegt");
  await page.evaluate(() => routeAktePruefung("s1")); await w();
  await page.evaluate(() => document.querySelector('#view .ap-erg[data-exid="E1"]').click()); await w();
  dialogAntwort = true; await page.evaluate(() => document.getElementById("ekLoeschen").click()); await w(200);
  const r2 = await page.evaluate(() => ({ n: DB.exams.length, passed: !!DB.students[0].passed }));
  if (r2.n !== 0 || r2.passed) f.push("Löschen: " + JSON.stringify(r2));
  return f;
});
await fall("A13 Urlaub über ein Wochenende: ein Zeitraum, ganz löschen inkl. Sonntag, ändern", async () => {
  const f = [];
  await vorbereiten();
  const r = await page.evaluate(() => {
    let d = todayISO(); while (new Date(d + "T12:00").getDay() !== 5) d = addDays(d, 1); // Freitag
    const n = _blockAnlegen(d, addDays(d, 3), "Urlaub", "urlaub", "G1");
    const l = DB.lessons.find((x) => x.art === "block" && x.date === d);
    openEventSheet("lesson", l.id, null);
    return { n, d, titel: document.querySelector("#sheet .sheet-h").textContent };
  }); await w();
  if (r.n !== 4) f.push("nicht 4 Tage angelegt: " + r.n);
  if (!/Urlaub/.test(r.titel)) f.push("Titel zeigt nicht den Grund: " + r.titel);
  await page.evaluate(() => document.getElementById("blAendern").click()); await w();
  await page.evaluate((d) => { document.getElementById("bzBis").value = addDays(d, 1); document.getElementById("bzSpeichern").click(); }, r.d); await w(200);
  const n2 = await page.evaluate(() => DB.lessons.filter((x) => x.art === "block").length);
  if (n2 !== 2) f.push("Ändern auf 2 Tage ergibt " + n2);
  await page.evaluate((d) => { const l = DB.lessons.find((x) => x.art === "block" && x.date === d); openEventSheet("lesson", l.id, null); }, r.d); await w();
  await page.evaluate(() => document.getElementById("blAlleWeg").click()); await w(200);
  const n3 = await page.evaluate(() => DB.lessons.filter((x) => x.art === "block").length);
  if (n3 !== 0) f.push("Ganzer Zeitraum nicht gelöscht: " + n3);
  return f;
});

await fall("A13 Sperrzeit mit Uhrzeit (Büro) bleibt eigener Termin, wird kein Ganztags-Zeitraum", async () => {
  await vorbereiten();
  const r = await page.evaluate(() => { const d = addDays(todayISO(), 3);
    DB.lessons.push({ id: "B1", date: d, von: "13:00", bis: "15:00", art: "block", sid: null, name: "", status: "geplant" }); save();
    openEventSheet("lesson", "B1", null); return { zeitraum: !!document.getElementById("blAendern"), loeschen: !!document.getElementById("esDelete") }; });
  return (!r.zeitraum && r.loeschen) ? [] : ["Sperrzeit mit Uhrzeit falsch behandelt: " + JSON.stringify(r)];
});

await fall("Neuer Schüler gespeichert → Zurück führt nicht wieder ins Formular", async () => {
  await vorbereiten();
  await page.evaluate(() => { routeHome(); routeSchuelerForm(null); }); await w();
  await page.fill("#f_name", "Zora Neu");
  await page.evaluate(() => document.getElementById("saveBtn").click()); await w(200);
  await zur(); await w(200); // schließt Fragebogen-Fenster
  await zur(); await w(200);
  const t = await titel();
  return t === "Neuer Schüler" ? ["Zurück führt wieder ins Formular"] : [];
});
await fall("Zwei Löschungen hintereinander: ein Rückgängig holt beide zurück", async () => {
  await vorbereiten();
  await page.evaluate(() => { DB.lessons.push({ id: "L3", sid: "s1", date: addDays(todayISO(), 4), von: "12:00", bis: "13:30", art: "fahrstunde", status: "geplant", note: "" }); save(); routeKalender();
    deleteLessonMitRueckgaengig("L1", () => routeKalender()); deleteLessonMitRueckgaengig("L3", () => routeKalender()); }); await w(200);
  await page.evaluate(() => document.querySelector("#toast .ut-btn").click()); await w(200);
  const r = await page.evaluate(() => ["L1", "L3"].filter((id) => DB.lessons.some((l) => l.id === id)).length);
  return r === 2 ? [] : ["nur " + r + " von 2 zurück"];
});
await fall("✕ bleibt beim Scrollen im Fenster sichtbar", async () => {
  await vorbereiten();
  await page.setViewportSize({ width: 360, height: 560 });
  await page.evaluate(() => openEventSheet("lesson", "L1", "s1")); await w();
  const r = await page.evaluate(() => { const sh = document.getElementById("sheet"); sh.scrollTop = 9999; const x = sh.querySelector(".sheet-x").getBoundingClientRect(), s = sh.getBoundingClientRect(); return { x: Math.round(x.top), s: Math.round(s.top), scroll: sh.scrollTop }; });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.evaluate(() => closeSheet());
  if (!r.scroll) return []; // Fenster nicht scrollbar: nichts zu prüfen
  return r.x >= r.s - 2 ? [] : ["✕ aus dem Bild: " + JSON.stringify(r)];
});

await browser.close(); server.close();
console.log(rot ? `Fenster-Test: ${rot} rot, ${gruen} grün.` : `Fenster-Test: alles in Ordnung (${gruen} Fälle).`);
process.exit(rot ? 1 : 0);
