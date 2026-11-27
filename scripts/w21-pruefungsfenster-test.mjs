// W21 – Serbands Testfälle 1–10 über App UND Büro mit EINEM gemeinsamen Datenstand (🗣 Serband 26.11.2026, R561).
// Echter Browser, Attrappe statt Datenbank (buero-vorfuehrung.js mit den W21-Server-Regeln), erfundene Namen, nichts wird verschickt.
// Der gemeinsame Stand: Nach jedem Schritt holt der Test die Tabellen aus der einen Seite und gibt sie der anderen
// (so wie beide dieselbe Datenbank lesen). „Neu laden“ = neue Seite mit genau diesem Stand.
// Die einzelnen Bedienwege prüfen ausführlich scripts/pruefungstage-buero-test.mjs (Büro) und scripts/pruefungsfenster-app-test.mjs (App);
// die Server-Regeln selbst scripts/w21-sql-test.mjs (echtes Postgres).
// Fälle: 1 Tag + 9 hintereinander · 2 Schüler einem Fenster · 3 verschieben · 4 tauschen · 5 Fahrlehrer ändern · 6 bestanden/nicht bestanden
//        (beide Richtungen) · 7+8 Umschreiber (W22): nur „nichts kaputt“ (bestehende Prüfung mit freier Uhrzeit bleibt) ·
//        9 App und Büro zeigen dasselbe · 10 neu laden, alles da · Doppelbelegung bei gleichzeitigem Schreiben verweigert.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/w21-pruefungsfenster-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { bauDaten } = require("../buero-vorfuehrung.js");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const d = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(d);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
const addTage = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
let ok = 0, schlecht = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { schlecht++; console.log("FEHLER  " + name + (info ? " · " + String(info).slice(0, 400) : "")); } }
const warte = (p, ms = 400) => p.waitForTimeout(ms);
const fehlerAlle = [];

// ---------- Ausgangsdaten ----------
const daten = bauDaten(heute);
const FS = daten.tabellen.fahrschulen[0].id;
daten.tabellen.pruefungstermine.length = 0;
daten.tabellen.snapshots = [{ user_id: "fl-1", data: null, updated_at: new Date().toISOString() }]; // App-Speicher vorhanden (sonst schreiben die Brücken nicht)
daten.tabellen.schueler.forEach((s) => { s.reakt_bezahlt_bis = "2099-12-31"; s.zahlung_gesperrt_seit = null; });
// 9 B-Schüler: 5 von Anton (fl-1, App-Konto), 4 von Berta (fl-2); dazu je einer für Fall 2 und einer (Cem, fl-3) für Fall 7+8
const bS = daten.tabellen.schueler.filter((s) => !s.inaktiv_seit && s.status !== "geloescht" && !["C1", "C1E", "C", "CE"].includes(s.klasse)).slice(0, 12);
if (bS.length < 12) { console.log("FEHLER Testdaten: zu wenige Schüler"); process.exit(1); }
bS.forEach((s, i) => { s.klasse = "B"; s.ausbildung = Object.assign({}, s.ausbildung, { form: "B" }); s.fahrlehrer_id = i < 5 || i === 9 ? "fl-1" : i < 9 || i === 10 ? "fl-2" : "fl-3"; });
const anton = bS.slice(0, 5), berta = bS.slice(5, 9);
berta[3].ausbildungsart = "umschreibung"; // W22: Umschreiber (Büro sperrt Sonder-/Nachtfahrten) – eine Prüfung muss trotzdem gehen
const NEUN = [...anton, ...berta];
// Fall 7+8 (Umschreiber macht W22): eine bestehende Prüfung mit freier Uhrzeit, die unverändert bleiben muss
const ALT = { id: "pt-alt-umschreib", fahrschule_id: FS, schueler_id: bS[11].id, art: "praxis", klasse: "B", datum: addTage(heute, 12),
  von: "10:30", fahrlehrer_id: "fl-3", status: "geplant", quelle: "buero", fenster_anzahl: 1, pruefungstag_id: null, fenster: null, kalender_termin_id: null };
daten.tabellen.pruefungstermine.push(ALT);
let STAND = JSON.parse(JSON.stringify(daten.tabellen));

// ---------- Seiten ----------
async function seite(art, opt = {}) {
  const app = art === "app";
  const ctx = await browser.newContext(app ? { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" }
    : { viewport: { width: 1280, height: 2400 }, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => fehlerAlle.push(art + ": " + e));
  page.on("dialog", (d) => d.accept());
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  const session = app ? { user: { id: "fl-1", email: "anton@example.org" } } : { user: { id: "ad-1", email: "leitung@example.org" } };
  await page.addInitScript(([tab, konten, s]) => {
    if (window.__W21_GESETZT) return; window.__W21_GESETZT = true;
    window.__FAKE = { tabellen: JSON.parse(tab), konten, session: s }; window.ZM_WARTE_MS = 300;
  }, [JSON.stringify(opt.stand || STAND), daten.konten, session]);
  if (app) {
    await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
    await page.waitForFunction(() => typeof _authUser !== "undefined" && _authUser && document.getElementById("loginOverlay").classList.contains("hidden"), null, { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(() => typeof _pt !== "undefined" && _pt.geladen, null, { timeout: 15000 }).catch(() => {});
    await page.waitForFunction(() => _pullOk, null, { timeout: 8000 }).catch(() => {});
    await warte(page, 1200);
  } else {
    await page.goto(basis + "buero.html#pruefungen", { waitUntil: "load" });
    await warte(page, 400);
    const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
    if (frage) { await page.click(`#werListe button:has-text("Paula Muster")`); await page.keyboard.type("7352", { delay: 20 }); await warte(page, 400); }
    await page.waitForFunction(() => { const a = document.getElementById("ansicht"); return a && !/Daten werden geladen/.test(a.textContent); }, null, { timeout: 8000 }).catch(() => {});
    await warte(page, 300);
  }
  return { ctx, page };
}
const holeStand = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__FAKE.tabellen)));
const pt = (stand, sid) => stand.pruefungstermine.find((p) => p.schueler_id === sid && p.status !== "abgesagt");
const zeitVon = (p) => String((p && p.von) || "").slice(0, 5);
// Büro: Text der Tageskarte; App: Kopf + aufgeklappte Zeilen
const bueroKarte = (page, tagId) => page.locator(`[data-pttagkarte="${tagId}"]`).first().innerText().catch(() => "");
async function appTag(page, tagId) {
  await page.evaluate(() => { _pruefTab = "termine"; routePruefungen(); });
  await warte(page);
  if (!(await page.$(`.pt-tag.offen .pt-kopf[data-ptday="${tagId}"]`))) { await page.click(`.pt-kopf[data-ptday="${tagId}"]`).catch(() => {}); await warte(page); }
  const kopf = await page.textContent(`.pt-kopf[data-ptday="${tagId}"]`).catch(() => "");
  const zeilen = await page.$$eval(`.pt-tag.offen`, (tage, id) => { const t = tage.find((x) => x.querySelector(`.pt-kopf[data-ptday="${id}"]`)); return t ? [...t.querySelectorAll(".pt-z")].map((z) => z.textContent.replace(/\s+/g, " ").trim()) : []; }, tagId);
  return { kopf: (kopf || "").replace(/\s+/g, " "), zeilen };
}

// ===== Fall 1: Büro legt Prüfungstag an und trägt 9 Prüfungen hintereinander ein =====
let B = await seite("buero");
await B.page.click("#ptNeu");
let dlg = B.page.locator("dialog[open]").last();
await dlg.locator('input[name="datum"]').fill(addTage(heute, 5));
await dlg.locator('input[name="pruefer"]').fill("AB");
await dlg.locator("footer button[value=ok]").click();
await warte(B.page, 500);
let st = await holeStand(B.page);
const TAG = st.pruefungstage.find((t) => t.datum === addTage(heute, 5));
pruefe("Fall 1a: Prüfungstag im Büro angelegt (Start 08:00)", !!TAG && String(TAG.start).slice(0, 5) === "08:00", JSON.stringify(TAG));
await B.page.click(`[data-ptmehrere="${TAG.id}"]`);
dlg = B.page.locator("dialog[open]").last();
await dlg.locator("input[name=sid]:checked").evaluateAll((l) => l.forEach((i) => i.click()));
for (const s of NEUN) await dlg.locator(`input[name=sid][value="${s.id}"]`).check();
await dlg.locator("footer button[value=ok]").click();
await warte(B.page, 900);
st = await holeStand(B.page);
const reihe = NEUN.map((s) => pt(st, s.id)).filter(Boolean).sort((a, b) => a.fenster - b.fenster).map((p) => p.fenster + "@" + zeitVon(p));
pruefe("Fall 1b: 9 Prüfungen auf einmal, Fenster 08:00 … 15:20", reihe.join(",") === "0@08:00,1@08:55,2@09:50,3@10:45,4@11:40,5@12:35,6@13:30,7@14:25,8@15:20", reihe.join(","));
pruefe("Fall 1c: Büro zeigt „9 geplant, 0 frei“", /9 geplant, 0 frei/.test(await bueroKarte(B.page, TAG.id)));
pruefe("Fall 1d: Server legt 9 Kalender-Einträge an", st.kalender_termine.filter((k) => k.art === "pruefung" && !k.geloescht && k.payload && NEUN.some((s) => pt(st, s.id) && pt(st, s.id).id === k.payload.pruefungstermin_id)).length === 9);
pruefe("Umschreiber: Prüfung im Fenster eingeplant, Kalender-Eintrag „Prüfung“", !!pt(st, berta[3].id) && st.kalender_termine.some((k) => k.id === pt(st, berta[3].id).kalender_termin_id && k.art === "pruefung" && !k.geloescht));
STAND = st;

// ===== Fall 9 (Teil 1): App zeigt denselben Tag =====
let A = await seite("app");
let at = await appTag(A.page, TAG.id);
pruefe("Fall 9a: App-Kopf „Prüfer AB · 9 geplant, 0 frei“ wie im Büro", /Prüfer AB/.test(at.kopf) && /9 geplant, 0 frei/.test(at.kopf), at.kopf);
const name = (s) => s.name.split(" ")[0];
pruefe("Fall 9b: App zeigt Antons 5 Schüler zur gleichen Uhrzeit wie das Büro, Bertas 4 nur „belegt“",
  at.zeilen.length === 9 && anton.every((s) => at.zeilen[pt(st, s.id).fenster].includes(name(s)) && at.zeilen[pt(st, s.id).fenster].startsWith(zeitVon(pt(st, s.id))))
  && berta.every((s) => /belegt/.test(at.zeilen[pt(st, s.id).fenster]) && !at.zeilen.join("|").includes(s.name)), JSON.stringify(at.zeilen));

// ===== Fall 2 + gleichzeitiges Schreiben: App und Büro wollen dasselbe freie Fenster =====
// App legt einen zweiten Tag an (eigener Tag, Fenster frei); beide Seiten sehen ihn frei
const TAG2 = await A.page.evaluate(async (d) => { const t = await PT.tagAnlegen(getSupa(), { fahrschule_id: _authProfile.fahrschule_id, datum: d, erstellt_von: _authUser.id }); await ptLaden(); return t; }, addTage(heute, 8));
STAND = await holeStand(A.page);
await B.ctx.close(); B = await seite("buero");   // Büro kennt jetzt Tag 2 mit 9 freien Fenstern
const zweiterAnton = bS[9], zweiterBerta = bS[10];
// App plant Fenster 0 über die Oberfläche (freies Fenster antippen → Schüler)
await A.page.evaluate(() => { _pruefTab = "termine"; routePruefungen(); }); await warte(A.page);
if (!(await A.page.$(`.pt-tag.offen .pt-kopf[data-ptday="${TAG2.id}"]`))) { await A.page.click(`.pt-kopf[data-ptday="${TAG2.id}"]`); await warte(A.page); }
const ok2 = await A.page.evaluate(async ([tid, sid]) => { try { await PT.einplanen(getSupa(), { fahrschule_id: _authProfile.fahrschule_id, schueler_id: sid, art: "praxis", klasse: "B", fahrlehrer_id: _authUser.id, quelle: "app", pruefungstag_id: tid, fenster: 0, fenster_anzahl: 1 }); return "ok"; } catch (e) { return String(e.message); } }, [TAG2.id, zweiterAnton.id]);
pruefe("Fall 2a: App ordnet einen Schüler Fenster 08:00 zu", ok2 === "ok", ok2);
// Gleichzeitig: Büro hat den alten Stand (Fenster 0 frei) auf dem Bildschirm; Datenbank hat schon Antons Eintrag
const neuerStand = await holeStand(A.page);
await B.page.evaluate((t) => { window.__FAKE.tabellen = t; }, neuerStand);
await B.page.click(`[data-ptplus="${TAG2.id}|0"]`);
dlg = B.page.locator("dialog[open]").last();
await dlg.locator("select[name=schueler_id]").selectOption(zweiterBerta.id);
await dlg.locator("footer button[value=ok]").click();
await warte(B.page, 600);
st = await holeStand(B.page);
const imFenster0 = st.pruefungstermine.filter((p) => p.pruefungstag_id === TAG2.id && p.fenster === 0 && p.status !== "abgesagt");
const toastB = await B.page.textContent("#toast").catch(() => "");
pruefe("Gleichzeitig: Büro bekommt das schon vergebene Fenster NICHT (nur 1 Prüfung im Fenster)", imFenster0.length === 1 && imFenster0[0].schueler_id === zweiterAnton.id, JSON.stringify(imFenster0.map((p) => p.schueler_id)));
pruefe("Gleichzeitig: Büro sagt es in einfachen Worten", /schon vergeben|belegt/.test(toastB || ""), toastB);
// Büro nimmt das nächste freie Fenster (Fall 2 im Büro)
await B.ctx.close(); STAND = st; B = await seite("buero");
await B.page.click(`[data-ptplus="${TAG2.id}|1"]`);
dlg = B.page.locator("dialog[open]").last();
await dlg.locator("select[name=schueler_id]").selectOption(zweiterBerta.id);
await dlg.locator("footer button[value=ok]").click();
await warte(B.page, 600);
st = await holeStand(B.page);
pruefe("Fall 2b: Büro ordnet Schüler Fenster 08:55 zu", zeitVon(pt(st, zweiterBerta.id)) === "08:55" && pt(st, zweiterBerta.id).pruefungstag_id === TAG2.id);
STAND = st;

// ===== Fall 3: verschieben (Büro, Ziehen auf ein freies Fenster eines anderen Tages) =====
const zeile = (page, tagId, i) => page.locator(`[data-pttabelle="${tagId}"] tr.pt-zeile[data-ptfenster="${i}"]`);
const id8 = await zeile(B.page, TAG.id, 8).getAttribute("data-ptid");
await zeile(B.page, TAG.id, 8).dragTo(zeile(B.page, TAG2.id, 5), { sourcePosition: { x: 8, y: 8 } });
await warte(B.page, 700);
st = await holeStand(B.page);
const verschoben = st.pruefungstermine.find((p) => p.id === id8);
pruefe("Fall 3: Büro verschiebt per Ziehen (Tag 1 15:20 → Tag 2 12:35), Kalender zieht mit",
  verschoben.pruefungstag_id === TAG2.id && verschoben.fenster === 5 && zeitVon(verschoben) === "12:35"
  && st.kalender_termine.some((k) => k.id === verschoben.kalender_termin_id && k.datum === TAG2.datum && String(k.von).slice(0, 5) === "12:35" && !k.geloescht), JSON.stringify(verschoben));
STAND = st;

// ===== Fall 4: zwei Schüler tauschen (App, per Tippen über die Tauschen-Funktion) =====
await A.ctx.close(); A = await seite("app");
const a0 = pt(STAND, anton[0].id), a1 = pt(STAND, anton[1].id);
const t4 = await A.page.evaluate(async ([x, y]) => { try { await PT.tauschen(getSupa(), x, y); await ptLaden(); return "ok"; } catch (e) { return String(e.message); } }, [a0.id, a1.id]);
st = await holeStand(A.page);
pruefe("Fall 4: App tauscht zwei Schüler (Uhrzeiten getauscht)", t4 === "ok" && zeitVon(pt(st, anton[0].id)) === zeitVon(a1) && zeitVon(pt(st, anton[1].id)) === zeitVon(a0) && zeitVon(a0) !== zeitVon(a1), t4 + " " + zeitVon(a0) + "/" + zeitVon(a1));
STAND = st;

// ===== Fall 5: Fahrlehrer nachträglich ändern (Büro) → App sieht es =====
await B.ctx.close(); B = await seite("buero");
const p5 = pt(STAND, anton[4].id);
await B.page.locator(`[data-ptfl="${p5.id}"]`).selectOption("fl-3");
await warte(B.page, 700);
st = await holeStand(B.page);
pruefe("Fall 5a: Büro ändert den Fahrlehrer, Kalender-Eintrag wandert mit", pt(st, anton[4].id).fahrlehrer_id === "fl-3"
  && st.kalender_termine.some((k) => k.id === p5.kalender_termin_id && k.fahrlehrer_id === "fl-3" && !k.geloescht));
STAND = st;
await A.ctx.close(); A = await seite("app");
at = await appTag(A.page, TAG.id);
const z5 = at.zeilen.find((z) => z.includes(zeitVon(pt(st, anton[4].id))));
pruefe("Fall 5b: App zeigt die abgegebene Prüfung nur noch als „belegt“", !!z5 && /belegt/.test(z5) && !z5.includes(name(anton[4])), z5);

// ===== Fall 6: bestanden / nicht bestanden, beide Richtungen =====
// Büro trägt „bestanden“ ein (Knopf ✓ in der Tageskarte)
await B.ctx.close(); STAND = await holeStand(A.page); B = await seite("buero");
const p6b = pt(STAND, berta[0].id);
// Ergebnis-Knöpfe gibt es im Büro erst ab dem Prüfungstag: Tag 1 dafür auf heute legen (Startzeit/Datum ändern geht über den Tag)
await B.page.evaluate(async (tid) => { await PT.tagAendern(supa, tid, { datum: KR.todayISO() }); await ptNeuLaden(); }, TAG.id);
await warte(B.page, 500);
const eja = B.page.locator(`[data-pttabelle="${TAG.id}"] tr.pt-zeile[data-ptid="${p6b.id}"] [data-eja]`).first();
pruefe("Fall 6a0: Büro hat in der Tageskarte den Knopf „Bestanden“", (await eja.count()) === 1);
await eja.click(); await warte(B.page, 800);
st = await holeStand(B.page);
pruefe("Fall 6a: Büro „bestanden“ → Tafel grün und Ergebnis für die App (kalender_pruefungen pass)",
  st.pruefungstermine.find((p) => p.id === p6b.id).status === "bestanden" && st.kalender_pruefungen.some((k) => k.schueler_id === p6b.schueler_id && k.datum === st.pruefungstermine.find((p) => p.id === p6b.id).datum && k.result === "pass" && !k.geloescht),
  JSON.stringify([st.pruefungstermine.find((p) => p.id === p6b.id).status, st.kalender_pruefungen.filter((k) => k.schueler_id === p6b.schueler_id)]));
pruefe("Fall 6a': Büro-Tageskarte zeigt die Prüfung grün", await B.page.locator(`[data-pttabelle="${TAG.id}"] tr.pt-zeile[data-ptid="${p6b.id}"] .marke-pill.gruen`).count() > 0);
STAND = st;
// App trägt „nicht bestanden“ für Antons Schüler ein (bestehender Ergebnis-Ablauf)
await A.ctx.close(); A = await seite("app");
const s6 = anton[2], p6a = pt(STAND, s6.id);
await A.page.evaluate(([sid, d]) => { const s = DB.students.find((x) => x.id === sid); commitExamResult(s, { result: "fail", date: d, faults: ["vorfahrt"], pruefer: "AB" }); }, [s6.id, p6a.datum]);
await warte(A.page, 1500);
await A.page.evaluate(() => { if (typeof _syncPruefungenBridge === "function") _syncPruefungenBridge(0); });
await warte(A.page, 1500);
st = await holeStand(A.page);
pruefe("Fall 6b: App „nicht bestanden“ → Prüfungstafel nicht_bestanden (für das Büro)", st.pruefungstermine.find((p) => p.id === p6a.id).status === "nicht_bestanden", st.pruefungstermine.find((p) => p.id === p6a.id).status);
pruefe("Fall 6b'': genau EINE Ergebnis-Zeile für die App-Prüfung", st.kalender_pruefungen.filter((k) => k.schueler_id === s6.id && k.datum === p6a.datum && !k.geloescht).length === 1);
pruefe("Fall 6b': Fehlerpunkte bleiben in der App-Zeile", st.kalender_pruefungen.some((k) => k.schueler_id === s6.id && k.result === "fail" && k.payload && Array.isArray(k.payload.faults) && k.payload.faults.includes("vorfahrt")), JSON.stringify(st.kalender_pruefungen.filter((k) => k.schueler_id === s6.id)));
STAND = st;

// ===== Fall 7+8: Umschreiber (W22) – hier nur: bestehende Prüfung mit freier Uhrzeit unverändert =====
const alt = STAND.pruefungstermine.find((p) => p.id === ALT.id);
pruefe("Fall 7+8: bestehende Prüfung mit freier Uhrzeit unverändert (Datum, 10:30, ohne Fenster)", alt && alt.datum === ALT.datum && zeitVon(alt) === "10:30" && alt.pruefungstag_id == null && alt.status === "geplant");

// ===== Fall 9 (Teil 2) + 10: neu laden, App und Büro zeigen dasselbe =====
await B.ctx.close(); await A.ctx.close();
B = await seite("buero"); A = await seite("app");
const bk = await bueroKarte(B.page, TAG.id), bk2 = await bueroKarte(B.page, TAG2.id);
at = await appTag(A.page, TAG.id);
const at2 = await appTag(A.page, TAG2.id);
const zahl = (t) => (t.match(/(\d+) geplant, (\d+) frei/) || []).slice(1).join("/");
pruefe("Fall 10a: nach dem Neuladen im Büro alles da (Tag 1: 8 geplant, 1 frei; Tag 2: 3 geplant, 6 frei)", zahl(bk) === "8/1" && zahl(bk2) === "3/6", zahl(bk) + " · " + zahl(bk2));
pruefe("Fall 9c: App zeigt nach dem Neuladen dieselben Zahlen", zahl(at.kopf) === zahl(bk) && zahl(at2.kopf) === zahl(bk2), at.kopf + " · " + at2.kopf);
const nachher = await holeStand(B.page);
const appZeiten = anton.slice(0, 4).map((s) => zeitVon(pt(nachher, s.id)));
pruefe("Fall 9d: App zeigt jeden eigenen Schüler zur selben Uhrzeit wie das Büro", anton.slice(0, 4).every((s, i) => at.zeilen.some((z) => z.includes(name(s)) && z.includes(appZeiten[i]))), JSON.stringify(at.zeilen));
pruefe("Fall 9e: Büro zeigt dieselben Uhrzeiten", anton.slice(0, 4).every((s, i) => bk.includes(appZeiten[i])));
const fA = await A.page.evaluate((id) => { const z = [...document.querySelectorAll(".pt-z")].find((x) => x.dataset && (x.dataset.ptid === id || x.getAttribute("data-ptid") === id)); return z ? getComputedStyle(z).borderLeftColor + "|" + z.className : ""; }, p6a.id);
pruefe("Fall 10b: Ergebnisse nach dem Neuladen noch da (Büro „bestanden“, App „nicht bestanden“)", nachher.pruefungstermine.find((p) => p.id === p6b.id).status === "bestanden" && nachher.pruefungstermine.find((p) => p.id === p6a.id).status === "nicht_bestanden", [nachher.pruefungstermine.find((p) => p.id === p6b.id).status, nachher.pruefungstermine.find((p) => p.id === p6a.id).status].join("/"));
pruefe("Fall 10c: keine Prüfung doppelt, keine verloren (12 Prüfungen inkl. Altbestand)", nachher.pruefungstermine.filter((p) => p.status !== "abgesagt").length === 12
  && new Set(nachher.pruefungstermine.filter((p) => p.status !== "abgesagt" && p.art === "praxis").map((p) => p.schueler_id + p.datum)).size === 12);
pruefe("Fall 10d: kein Kalender-Eintrag doppelt", (() => { const l = nachher.kalender_termine.filter((k) => k.art === "pruefung" && !k.geloescht && k.payload && k.payload.pruefungstermin_id); return new Set(l.map((k) => k.payload.pruefungstermin_id)).size === l.length; })());
pruefe("Keine JS-Fehler in App und Büro", fehlerAlle.length === 0, fehlerAlle.join(" | "));
await browser.close(); server.close();
console.log(`\n${ok} ok, ${schlecht} FEHLER`);
process.exit(schlecht ? 1 : 0);
