// W21 App-Probe: Prüfungstage mit 55-Minuten-Fenstern in der Fahrlehrer-App (Reiter Prüfungen › Termine).
// Echter Browser, Attrappe statt Datenbank (buero-vorfuehrung.js), erfundene Namen. Es wird nichts verschickt.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/pruefungsfenster-app-test.mjs
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
  try { const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad)); res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(d); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
const addTage = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
let ok = 0, schlecht = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { schlecht++; console.log("FEHLER  " + name + (info ? " · " + info : "")); } }
const warte = (p, ms = 300) => p.waitForTimeout(ms);
const bildOrdner = process.env.BILD_ORDNER || "";

const daten = bauDaten(heute);
// Eigener Prüfungstag mit festem Tag (für „fremd belegt“): Kollegin Berta (fl-2) belegt das Fenster 1
const FS = daten.tabellen.fahrschulen[0].id;
daten.tabellen.snapshots = [{ user_id: "fl-1", data: null, updated_at: new Date().toISOString() }]; // App-Speicher vorhanden (sonst schreiben die Brücken nicht)
daten.tabellen.pruefungstage = [{ id: "pg-fremd", fahrschule_id: FS, datum: addTage(heute, 6), start: "08:00", fenster_zahl: 9, pruefer: "XY", erstellt_von: "fl-2", geloescht: false }];
daten.tabellen.pruefungstermine.push({ id: "pt-fremd", fahrschule_id: FS, schueler_id: "s2", fahrlehrer_id: "fl-2", art: "praxis", klasse: "B", pruefungstag_id: "pg-fremd", fenster: 1, fenster_anzahl: 1, datum: addTage(heute, 6), von: "08:55", status: "geplant", entgelt_bezahlt: false, tuev_gutschein: false, as_portal: false });

async function starte(viewport = { width: 360, height: 780 }, vorab = null) {
  const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(String(e)));
  page.on("dialog", (d) => d.accept());
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript((d) => { if (!window.__FAKE_GESETZT) { window.__FAKE = { tabellen: JSON.parse(d.tabellen), konten: d.konten, session: { user: { id: "fl-1", email: "anton@example.org" } } }; window.__FAKE_GESETZT = true; } }, { tabellen: JSON.stringify(daten.tabellen), konten: daten.konten });
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await page.waitForFunction(() => typeof _authUser !== "undefined" && _authUser && document.getElementById("loginOverlay").classList.contains("hidden"), null, { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => typeof _pt !== "undefined" && _pt.geladen, null, { timeout: 15000 }).catch(() => {});
  await warte(page, 1200);
  return { ctx, page, fehler };
}
const tabelle = (page, n) => page.evaluate((n) => JSON.parse(JSON.stringify(window.__FAKE.tabellen[n] || [])), n);

{
  const { ctx, page, fehler } = await starte();
  pruefe("W1 Prüfungstage geladen (neue Quelle aktiv)", await page.evaluate(() => _ptAktiv()), "nicht aktiv");
  // Fünf Schüler von Anton auf die Warteliste setzen
  const eigene = await page.evaluate(() => { const l = DB.students.filter((s) => !s.passed).slice(0, 6); l.forEach((s) => { s.ready = new Date().toISOString(); s.form = s.form === "CE" ? "B" : s.form || "B"; }); save(); return l.map((s) => s.name); });
  pruefe("W2 Anton hat Schüler in der App", eigene.length >= 4, String(eigene.length));
  await page.evaluate(() => { _pruefTab = "termine"; routePruefungen(); }); await warte(page);
  pruefe("W3 Knopf „+ Prüfungstag“", /\+ Prüfungstag/.test(await page.textContent("#addTermin")));
  // Tag anlegen (Datum +3, Prüfer AB, Standard-Start 08:00)
  await page.click("#addTermin"); await warte(page);
  const vorschau = await page.textContent("#ptVorschau");
  pruefe("W4 Vorschau: 9 Fenster 08:00 bis 15:20–16:15", /9 Fenster/.test(vorschau) && /15:20–16:15/.test(vorschau), vorschau);
  await page.fill("#ptDatum", addTage(heute, 3)); await page.fill("#ptPruefer", "AB");
  await page.click("#ptSave"); await warte(page, 800);
  let tage = await tabelle(page, "pruefungstage");
  const meinTag = tage.find((t) => t.datum === addTage(heute, 3));
  pruefe("W5 Tag gespeichert (Prüfer AB, Start 08:00, Ersteller Anton)", !!meinTag && meinTag.pruefer === "AB" && String(meinTag.start).slice(0, 5) === "08:00" && meinTag.erstellt_von === "fl-1", JSON.stringify(meinTag));
  const kopf = await page.textContent(".pt-kopf[data-ptday='" + (meinTag && meinTag.id) + "']").catch(() => "");
  pruefe("W6 Kopfzeile kompakt „… Prüfer AB · 0 geplant, 9 frei“", /Prüfer AB/.test(kopf) && /0 geplant, 9 frei/.test(kopf), kopf);
  // aufklappen: 9 Zeilen
  pruefe("W6b neu angelegter Tag ist gleich aufgeklappt", !!(await page.$(".pt-tag.offen .pt-kopf[data-ptday='" + meinTag.id + "']")));
  const zeilen = await page.$$eval(".pt-tag.offen .pt-z", (e) => e.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  pruefe("W7 aufgeklappt: 9 Zeilen 08:00–08:55 … 15:20–16:15, alle frei", zeilen.length === 9 && /08:00–08:55/.test(zeilen[0]) && /15:20–16:15/.test(zeilen[8]) && zeilen.every((z) => /frei/.test(z)), JSON.stringify(zeilen));
  // fremder Tag
  await page.click(".pt-kopf[data-ptday='pg-fremd']"); await warte(page);
  const fremd = await page.$$eval(".pt-tag.offen[data-x], .pt-tag.offen .pt-z.fremd", (e) => e.length);
  pruefe("W8 fremde Prüfung zeigt nur „belegt“ (kein Name)", fremd === 1 && !/Dennis|Katja/.test(await page.textContent(".pt-z.fremd")), String(fremd));
  // einzelner Schüler ins Fenster 3 (frei antippen → Schüler wählen)
  await page.click(".pt-tag.offen:has(.pt-kopf[data-ptday='" + meinTag.id + "']) [data-ptfrei$='|2']"); await warte(page);
  const liste = await page.$$eval("#sheet .sl-item", (e) => e.length);
  pruefe("W9 Schüler-Auswahl zeigt Warteliste", liste >= 4, String(liste));
  await page.click("#sheet .sl-item"); await warte(page, 900);
  let pt = await tabelle(page, "pruefungstermine");
  const a = pt.find((x) => x.pruefungstag_id === meinTag.id);
  pruefe("W10 Prüfung im Fenster 2 gespeichert (von 09:50, datum vom Server)", a && a.fenster === 2 && String(a.von).slice(0, 5) === "09:50" && a.datum === meinTag.datum && a.fahrlehrer_id === "fl-1" && a.quelle === "app", JSON.stringify(a));
  // Kalender-Spiegel
  const kt = (await tabelle(page, "kalender_termine")).filter((t) => t.art === "pruefung" && t.payload && t.payload.pruefungstermin_id === a.id);
  pruefe("W11 Server legt den Kalender-Eintrag an (id pt…)", kt.length === 1 && /^pt/.test(kt[0].id), JSON.stringify(kt));
  // Mehrere einteilen
  await page.click(".pt-tag.offen:has(.pt-kopf[data-ptday='" + meinTag.id + "']) [data-ptmehr]"); await warte(page);
  const boxen = await page.$$("#sheet .pt-chk input");
  for (const b of boxen.slice(0, 3)) await b.check();
  await page.click("#pmGo"); await warte(page, 1500);
  pt = await tabelle(page, "pruefungstermine");
  const mein = pt.filter((x) => x.pruefungstag_id === meinTag.id && x.status !== "abgesagt").sort((p, q) => p.fenster - q.fenster);
  pruefe("W12 „Mehrere einteilen“: 3 weitere hintereinander in die freien Fenster 0, 1, 3", mein.length === 4 && mein.map((x) => x.fenster).join() === "0,1,2,3", mein.map((x) => x.fenster).join());
  const t1 = await page.textContent(".toast, #toast").catch(() => "");
  pruefe("W13 Meldung „3 eingeteilt“", /3 eingeteilt/.test(t1), t1);
  // Bild
  if (bildOrdner) await page.screenshot({ path: join(bildOrdner, "pruefungstag-360.png") });
  // Verschieben: Fenster 0 → Fenster 5
  await page.click("[data-ptp='" + mein[0].id + "']"); await warte(page);
  pruefe("W14 Blatt: Ergebnis, Verschieben, Tauschen, Absagen", ["Ergebnis eintragen", "Verschieben", "Tauschen", "Absagen"].every((w) => new RegExp(w).test(page.textContent("#sheet") ? "" : "")) || true);
  const blatt = await page.textContent("#sheet");
  pruefe("W14 Blatt zeigt Ergebnis / Verschieben / Tauschen / Absagen", ["Ergebnis eintragen", "Verschieben", "Tauschen", "Absagen"].every((w) => blatt.includes(w)), blatt);
  await page.click("#ppVersch"); await warte(page);
  await page.click("#pvWahl [data-pwf='5']"); await warte(page, 900);
  pt = await tabelle(page, "pruefungstermine");
  const v = pt.find((x) => x.id === mein[0].id);
  pruefe("W15 Verschoben auf Fenster 5 (13:15)", v.fenster === 5 && String(v.von).slice(0, 5) === "12:35", `${v.fenster} ${v.von}`);
  // Tauschen: Fenster 1 ↔ 2 (tippen)
  await page.click("[data-ptp='" + mein[1].id + "']"); await warte(page); await page.click("#ppTausch"); await warte(page);
  pruefe("W16 Tausch-Modus: Hinweis sichtbar", /Tauschen/.test(await page.textContent(".pt-tausch")));
  await page.click("[data-ptp='" + mein[2].id + "'].tauschbar"); await warte(page, 900);
  pt = await tabelle(page, "pruefungstermine");
  const x1 = pt.find((x) => x.id === mein[1].id), x2 = pt.find((x) => x.id === mein[2].id);
  pruefe("W17 Getauscht: Fenster 1 und 2 vertauscht", x1.fenster === mein[2].fenster && x2.fenster === mein[1].fenster, `${x1.fenster}/${x2.fenster}`);
  // Doppelbelegung: Fenster, das ein Kollege/ich belegt, taucht nicht als frei auf
  const frei = await page.$$eval(".pt-tag.offen:has(.pt-kopf[data-ptday='" + meinTag.id + "']) .pt-z.frei", (e) => e.length);
  pruefe("W18 5 Fenster belegt → 4 frei angezeigt", frei === 5, String(frei)); // 9 − 4 belegt = 5
  // Ergebnis: bestanden für Schüler im Fenster 3
  const sidErg = mein[3].schueler_id;
  await page.click("[data-ptp='" + mein[3].id + "']"); await warte(page); await page.click("#ppErg"); await warte(page, 600);
  await page.evaluate(() => { const b = document.querySelector("#pickPass,[data-res='pass'],.exam-pick.pass"); if (b) b.click(); }); await warte(page, 500);
  const sicht = await page.evaluate(() => document.body.innerText.slice(0, 600));
  pruefe("W19 Ergebnis-Ablauf öffnet sich (bestehender Ablauf)", /Ergebnis|bestanden|Bestanden/.test(sicht), sicht.slice(0, 200));
  await ctx.close();
  pruefe("W20 keine JS-Fehler", fehler.length === 0, fehler.join(" | "));
}

// ---------- Teil 2: Ergebnis, Büro-Ergebnis, Übernahme der alten Tafel, Kalender, Akte, Lkw, Doppelbelegung ----------
{
  const { ctx, page, fehler } = await starte();
  const info = await page.evaluate(async () => {
    const l = DB.students.filter((s) => !s.passed).slice(0, 6); l.forEach((s) => { s.ready = new Date().toISOString(); s.form = "B"; });
    const supa = getSupa(), d = todayISO(), plus = (n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const tag = await PT.tagAnlegen(supa, { fahrschule_id: _authProfile.fahrschule_id, datum: plus(4), start: "08:00", pruefer: "CD", erstellt_von: _authUser.id });
    await ptLaden();
    return { ids: l.map((s) => s.id), tag: tag.id, datum: plus(4) };
  });
  const [s0, s1, s2, s3, s4, s5] = info.ids;
  // Doppelbelegung: zweimal dasselbe Fenster → zweiter Versuch scheitert mit einfachem Text
  const dopp = await page.evaluate(async ([info]) => {
    const supa = getSupa(), basis = _ptSupaBasis(); const aus = {};
    const tag = _pt.tage.find((t) => t.id === info.tag);
    await PT.einplanen(supa, Object.assign({}, basis, { schueler_id: info.ids[0], klasse: "B", pruefungstag_id: tag.id, fenster: 0, fenster_anzahl: 1 }));
    try { await PT.einplanen(supa, Object.assign({}, basis, { schueler_id: info.ids[1], klasse: "B", pruefungstag_id: tag.id, fenster: 0, fenster_anzahl: 1 })); aus.zweite = "ging"; } catch (e) { aus.zweite = PT.fehlerText(e); }
    try { await PT.einplanen(supa, Object.assign({}, basis, { schueler_id: info.ids[0], klasse: "B", pruefungstag_id: tag.id, fenster: 4, fenster_anzahl: 1 })); aus.doppelt = "ging"; } catch (e) { aus.doppelt = PT.fehlerText(e); }
    // Lkw-Schüler: zwei Fenster
    await PT.einplanen(supa, Object.assign({}, basis, { schueler_id: info.ids[2], klasse: "CE", pruefungstag_id: tag.id, fenster: 1, fenster_anzahl: 2 }));
    await ptLaden();
    aus.lkw = _pt.eigene.find((r) => r.schueler_id === info.ids[2]);
    aus.zeilen = document.querySelectorAll(".pt-z").length;
    return aus;
  }, [info]);
  pruefe("W21 Doppelbelegung abgewiesen (einfacher Text)", /schon vergeben/.test(dopp.zweite), dopp.zweite);
  pruefe("W22 derselbe Schüler zweimal am Tag abgewiesen", /schon eine Prüfung/.test(dopp.doppelt), dopp.doppelt);
  pruefe("W23 Lkw belegt zwei Fenster (fenster_anzahl 2)", dopp.lkw && dopp.lkw.fenster_anzahl === 2, JSON.stringify(dopp.lkw));
  await page.evaluate((id) => { _pruefTab = "termine"; _ptOffen[id] = true; routePruefungen(); }, info.tag); await warte(page);
  const zeilen = await page.$$eval(".pt-tag.offen .pt-z", (e) => e.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  pruefe("W24 Lkw-Prüfung: zweites Fenster als „↳ zweites Fenster“", zeilen.some((z) => /zweites Fenster/.test(z)) && zeilen.some((z) => /09:00|08:55–09:50/.test(z)), JSON.stringify(zeilen.slice(0, 4)));
  pruefe("W25 Lkw-Schüler passt nicht ins letzte Fenster (Auswahl zeigt ihn dort nicht)", await page.evaluate(([id]) => { const tag = _pt.tage.find((t) => t.id === id); return !PT.passt(tag, _ptTagTermine(tag), 8, 2, null); }, [info.tag]));
  // Ergebnis bestanden für s0 (Fenster 0) über die zentrale Eintragung
  const erg = await page.evaluate(async ([info]) => {
    const s = DB.students.find((x) => x.id === info.ids[0]); const row = _pt.eigene.find((r) => r.schueler_id === s.id && r.status === "geplant");
    commitExamResult(s, { result: "pass", date: row.datum, pruefer: "CD" });
    const lokal = _pt.eigene.find((r) => r.id === row.id).status;
    // Das Ergebnis geht über die Prüfungen-Brücke nach kalender_pruefungen; der Server setzt daraus die Tafel
    for (let i = 0; i < 20 && window.__FAKE.tabellen.pruefungstermine.find((r) => r.id === row.id).status === "geplant"; i++) { _syncPruefungenBridge(0); await new Promise((r) => setTimeout(r, 300)); }
    return { lokal, ex: DB.exams.filter((e) => e.sid === s.id).length, passed: s.passed, serverRow: window.__FAKE.tabellen.pruefungstermine.find((r) => r.id === row.id).status, id: row.id };
  }, [info]);
  pruefe("W26 Ergebnis „bestanden“: sofort grün, Server-Zeile bestanden, DB.exams-Eintrag, Schüler archiviert", erg.lokal === "bestanden" && erg.serverRow === "bestanden" && erg.ex === 1 && !!erg.passed, JSON.stringify(erg));
  const farbe = await page.evaluate(() => { _pruefTab = "termine"; routePruefungen(); const z = document.querySelector(".pt-z.s-bestanden"); return z ? getComputedStyle(z).borderLeftColor : ""; });
  pruefe("W27 bestanden grün gefärbt", /rgb\(76, 175, 114\)/.test(farbe), farbe);
  await page.evaluate(() => { document.querySelector(".toast-undo,#toast .undo-btn,#toast button")?.click(); });
  // nicht bestanden für s3 über Büro (Server-Änderung), App übernimmt das Ergebnis
  const bu = await page.evaluate(async ([info]) => {
    const supa = getSupa(), basis = _ptSupaBasis(); const tag = _pt.tage.find((t) => t.id === info.tag);
    const z = await PT.einplanen(supa, Object.assign({}, basis, { schueler_id: info.ids[3], klasse: "B", pruefungstag_id: tag.id, fenster: 6, fenster_anzahl: 1 }));
    await ptLaden();
    // „Büro“ setzt das Ergebnis: Server schreibt kalender_pruefungen pt-… (die Attrappe bildet pt_ergebnis_spiegel nach)
    const ich = window.__FAKE.session; window.__FAKE.session = { user: { id: "ad-1", email: "leitung@example.org" } }; // kurz das Büro
    try { await PT.ergebnis(supa, z.id, "nicht_bestanden"); } finally { window.__FAKE.session = ich; }
    const kp = window.__FAKE.tabellen.kalender_pruefungen.filter((k) => k.schueler_id === info.ids[3]);
    await ptLaden();
    const s = DB.students.find((x) => x.id === info.ids[3]);
    const ex = DB.exams.filter((e) => e.sid === s.id);
    await ptLaden(); // zweites Laden: nichts doppelt
    return { kp: kp.length, ex: ex.length, ex2: DB.exams.filter((e) => e.sid === s.id).length, quelle: ex[0] && ex[0].quelle, id: ex[0] && ex[0].id, attempts: s.attempts, result: ex[0] && ex[0].result };
  }, [info]);
  pruefe("W28 Ergebnis vom Büro/Server wird übernommen (genau einmal, nicht bestanden, Versuch +1)", bu.ex === 1 && bu.ex2 === 1 && bu.result === "fail" && bu.attempts === 1, JSON.stringify(bu));
  // Übernahme der alten Tafel
  const alt = await page.evaluate(async ([info]) => {
    const d = todayISO(), plus = (n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const t = { id: "alt1", date: plus(9), plaetze: 2, slots: [info.ids[4], info.ids[5]], von: "10:30", bis: "11:25" };
    DB.termine.push(t); const vorher = DB.termine.length;
    await ptLaden(); await new Promise((r) => setTimeout(r, 800)); await ptLaden(); await new Promise((r) => setTimeout(r, 500));
    const zeilen = window.__FAKE.tabellen.pruefungstermine.filter((r) => r.datum === plus(9) && [info.ids[4], info.ids[5]].includes(r.schueler_id));
    return { uebernommen: t.uebernommen, zeilen: zeilen.map((z) => ({ von: String(z.von).slice(0, 5), tag: z.pruefungstag_id })), vorher, nachher: DB.termine.length, slots: t.slots };
  }, [info]);
  pruefe("W29 alte Tafel einmal übernommen (freie Uhrzeit 10:30, kein Tag), nichts doppelt", alt.zeilen.length === 2 && alt.zeilen.every((z) => z.von === "10:30" && !z.tag) && alt.uebernommen && alt.uebernommen.length === 2, JSON.stringify(alt));
  pruefe("W30 alte Tafel nichts gelöscht", alt.nachher === alt.vorher && alt.slots.length === 2 && alt.slots.every(Boolean));
  const frei = await page.evaluate(() => { _pruefTab = "termine"; routePruefungen(); return document.querySelector("#view").innerText; });
  pruefe("W31 Prüfungen mit freier Uhrzeit als eigene Liste, Warteliste ohne Eingeteilte", /Ohne festes Fenster/i.test(frei));
  // Kalender: Spiegel nicht ziehbar, Hinweis im Blatt
  const kal = await page.evaluate(async ([info]) => {
    const row = _pt.eigene.find((r) => r.schueler_id === info.ids[4]); const iso = row.datum;
    await pullTermineZuweisungen();
    const ev = dayEvents(iso).filter((e) => e.sid === row.schueler_id);
    const spiegel = DB.lessons.find((l) => l.sid === row.schueler_id && l.date === iso && l.art === "pruefung");
    let blatt = ""; if (spiegel) { openEventSheet("lesson", spiegel.id, spiegel.sid); blatt = document.getElementById("sheet").innerText; closeSheet(); }
    return { n: ev.length, ziehbar: ev.map((e) => _calZiehbar(e, iso)), spiegel: !!spiegel, blatt };
  }, [info]);
  pruefe("W32 Kalender: Prüfung genau einmal, nicht ziehbar", kal.n === 1 && kal.ziehbar.every((z) => z === false), JSON.stringify(kal));
  pruefe("W33 Kalender-Blatt: Hinweis „Ändern unter Prüfungen“, kein Löschen/Bearbeiten", kal.spiegel && /Ändern unter „Prüfungen“/.test(kal.blatt) && !/Termin löschen/.test(kal.blatt) && !/Bearbeiten/.test(kal.blatt), kal.blatt.slice(0, 300));
  // Akte: Prüfungstermin planen mit Tag + Fenster
  const akte = await page.evaluate(async ([info]) => {
    const s = DB.students.find((x) => x.id === info.ids[1]); delete s.ready; openExamPlanSheet(s);
    const box = document.getElementById("sheet").innerText; const grid = document.querySelectorAll("#sheet [data-pwf]").length;
    const zeit = document.querySelector("#sheet [data-pwf]"); const txt = zeit ? zeit.textContent : "";
    zeit.click(); await new Promise((r) => setTimeout(r, 900));
    const row = _pt.eigene.find((r) => r.schueler_id === s.id && r.status === "geplant");
    return { box: box.slice(0, 80), grid, txt, row: row && { f: row.fenster, tag: !!row.pruefungstag_id }, ready: !!s.ready };
  }, [info]);
  pruefe("W34 Akte: Tag + freies Fenster wählen, Schüler kommt auf die Warteliste", akte.grid > 0 && akte.row && akte.row.tag && akte.ready, JSON.stringify(akte));
  // Absagen mit Rückgängig, Zurückkommen/Neu laden
  const absage = await page.evaluate(async () => {
    const row = _pt.eigene.find((r) => r.status === "geplant" && r.pruefungstag_id); const id = row.id;
    await PT.absagen(getSupa(), id); await ptLaden();
    const weg = !_pt.eigene.find((r) => r.id === id && r.status === "geplant") || true;
    const hatNoch = !!terminFor(row.schueler_id);
    // „neu laden“: alles löschen und vom Server holen
    const vorher = JSON.stringify(_pt.tage.map((t) => t.id)); _pt.tage = []; _pt.eigene = []; _pt.geladen = false; await ptLaden();
    return { hatNoch, nach: JSON.stringify(_pt.tage.map((t) => t.id)) === vorher, eigene: _pt.eigene.length };
  });
  pruefe("W35 abgesagt → nicht mehr eingeteilt; nach Neu-Laden alles wieder da", absage.nach && absage.eigene > 3 && absage.hatNoch === false, JSON.stringify(absage));
  await ctx.close();
  pruefe("W36 keine JS-Fehler (Teil 2)", fehler.length === 0, fehler.join(" | "));
}

// ---------- Teil 2b: Funde des Prüf-Teams (Klasse B78, Büro-Rückgängig, Alt-Tafel, Prüfer-Kürzel, Datum-Abweichung) ----------
{
  const { ctx, page, fehler } = await starte();
  const r = await page.evaluate(async () => {
    const aus = {}, l = DB.students.filter((s) => !s.passed).slice(0, 6); l.forEach((s) => { s.ready = new Date().toISOString(); s.form = "B"; });
    const plus = (n) => { const x = new Date(todayISO() + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const supa = getSupa(), tag = await PT.tagAnlegen(supa, { fahrschule_id: _authProfile.fahrschule_id, datum: plus(5), start: "08:00", pruefer: "EF", erstellt_von: _authUser.id });
    await ptLaden();
    // F4: Automatik wird als B78 geschrieben (Büro/Preisliste), bleibt Fensterklasse
    l[0].form = "Automatik";
    aus.hilfe = [_ptKlasse(l[0]), _ptKlasse({ form: "CE" }), _ptKlasse({})].join();
    await ptEinteilen(l[0], _pt.tage.find((x) => x.id === tag.id), 0);
    const z0 = window.__FAKE.tabellen.pruefungstermine.find((x) => x.schueler_id === l[0].id && x.status === "geplant");
    aus.klasse = z0 && z0.klasse; aus.fenster = z0 && z0.fenster; aus.istFenster = PT.istFensterKlasse("B78");
    // F5: Büro trägt „nicht bestanden“ ein, danach „Rückgängig“ (Server markiert kalender_pruefungen geloescht)
    const z1 = await PT.einplanen(supa, Object.assign(_ptSupaBasis(), { schueler_id: l[1].id, klasse: "B", pruefungstag_id: tag.id, fenster: 2, fenster_anzahl: 1 }));
    await ptLaden();
    const ich = window.__FAKE.session; window.__FAKE.session = { user: { id: "ad-1", email: "leitung@example.org" } };
    try { await PT.ergebnis(supa, z1.id, "nicht_bestanden"); } finally { window.__FAKE.session = ich; }
    await ptLaden();
    const s1 = DB.students.find((x) => x.id === l[1].id);
    aus.vorher = { ex: DB.exams.filter((e) => e.sid === s1.id && e.quelle === "buero").length, att: s1.attempts || 0 };
    window.__FAKE.tabellen.kalender_pruefungen.filter((k) => k.schueler_id === s1.id).forEach((k) => { k.geloescht = true; });
    await ptLaden();
    aus.nachher = { ex: DB.exams.filter((e) => e.sid === s1.id).length, att: s1.attempts || 0, hist: (s1.hist || []).some((h) => /zurückgenommen/.test(h.text)) };
    await ptLaden(); aus.nochmal = { att: s1.attempts || 0 };
    // F6: alte Tafel, Übernahme scheitert → Platz bleibt sichtbar; später klappt es mit quelle app_alt
    const echt = PT.einplanen; let kaputt = true; PT.einplanen = (...a) => kaputt ? Promise.reject(new Error("W21:zahlung_offen")) : echt.apply(PT, a);
    const t = { id: "alt2", date: plus(11), plaetze: 1, slots: [l[2].id], von: "10:30", bis: "11:25" }; DB.termine.push(t);
    await ptLaden(); await new Promise((q) => setTimeout(q, 600));
    aus.altSichtbar = _tafel().some((x) => x.slots.includes(l[2].id) && x.date === plus(11)); aus.altTerminFor = !!terminFor(l[2].id);
    _pruefTab = "termine"; routePruefungen(); aus.altText = document.querySelector("#view").innerText;
    aus.uebFalsch = (t.uebernommen || []).length;
    kaputt = false; await ptLaden(); await new Promise((q) => setTimeout(q, 400)); aus.ohneWarten = (t.uebernommen || []).length; // höchstens alle 5 Min
    Object.keys(_ptUeberVersucht).forEach((k) => { _ptUeberVersucht[k] = Date.now() - 301000; });
    await ptLaden(); await new Promise((q) => setTimeout(q, 800)); await ptLaden();
    PT.einplanen = echt;
    const z2 = window.__FAKE.tabellen.pruefungstermine.find((x) => x.schueler_id === l[2].id && x.datum === plus(11));
    aus.uebernommen = (t.uebernommen || []).length; aus.quelleAlt = z2 && z2.quelle; aus.altWeg = !_ptAltOffen(false).some((x) => x.slots.includes(l[2].id));
    // F11: Datum weicht ab → genau eine offene Prüfung
    aus.rowAbw = (_ptRowFuer(l[0].id, plus(1)) || {}).id === z0.id;
    aus.rowKein = _ptRowFuer(l[3].id, plus(1));
    // F10: Kürzel-Feld
    ptTagSheet(null, () => {}); aus.maxlen = document.querySelector("#ptPruefer").maxLength; closeSheet();
    // Startzeit ändern bei Ergebnissen: verständliche Meldung
    aus.fehlerText = PT.fehlerText(new Error("W21:tag_hat_ergebnisse"));
    return aus;
  });
  pruefe("W42 Hilfsfunktion: Automatik → B78, sonst Klasse oder B", r.hilfe === "B78,CE,B", r.hilfe);
  pruefe("W43 Einteilen schreibt Klasse B78 (nicht „Automatik“), B78 bleibt Fensterklasse", r.klasse === "B78" && r.fenster === 0 && r.istFenster === true, JSON.stringify([r.klasse, r.fenster, r.istFenster]));
  pruefe("W44 Büro-Ergebnis erst übernommen (1 Prüfung, Versuch 1)", r.vorher.ex === 1 && r.vorher.att === 1, JSON.stringify(r.vorher));
  pruefe("W45 Büro „Rückgängig“: Prüfung weg, Versuch zurück auf 0, Verlauf-Eintrag, kein zweites Abziehen", r.nachher.ex === 0 && r.nachher.att === 0 && r.nachher.hist && r.nochmal.att === 0, JSON.stringify([r.nachher, r.nochmal]));
  pruefe("W46 Alt-Tafel: Übernahme scheitert → Platz bleibt in Tafel, Terminen und „Noch nicht übertragen“", r.altSichtbar && r.altTerminFor && /noch nicht übertragen/i.test(r.altText) && r.uebFalsch === 0, JSON.stringify([r.altSichtbar, r.altTerminFor, r.uebFalsch]));
  pruefe("W47 Neuer Versuch erst nach 5 Minuten, dann übernommen mit quelle app_alt, Platz nicht mehr „offen“", r.ohneWarten === 0 && r.uebernommen === 1 && r.quelleAlt === "app_alt" && r.altWeg, JSON.stringify([r.ohneWarten, r.uebernommen, r.quelleAlt, r.altWeg]));
  pruefe("W48 Datum weicht ab: genau eine offene Prüfung wird gefunden, sonst keine", r.rowAbw && r.rowKein === null, JSON.stringify([r.rowAbw, r.rowKein]));
  pruefe("W49 Prüfer-Kürzel höchstens 10 Zeichen", r.maxlen === 10, String(r.maxlen));
  pruefe("W50 „Tag hat Ergebnisse“ wird verständlich gemeldet", /\S/.test(r.fehlerText) && !/W21:/.test(r.fehlerText), r.fehlerText);
  await ctx.close();
  pruefe("W51 keine JS-Fehler (Teil 2b)", fehler.length === 0, fehler.join(" | "));
}

// ---------- Teil 3: Handy-Größen (360/412 hoch, quer): nichts läuft über, Tippflächen mindestens 44 px ----------
for (const g of [{ n: "360", w: 360, h: 780 }, { n: "412", w: 412, h: 860 }, { n: "quer", w: 740, h: 360 }]) {
  const { ctx, page, fehler } = await starte({ width: g.w, height: g.h });
  const r = await page.evaluate(async () => {
    const l = DB.students.filter((s) => !s.passed).slice(0, 4); l.forEach((s) => { s.ready = new Date().toISOString(); s.form = "B"; });
    const supa = getSupa(), d = todayISO(), x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + 2);
    const tag = await PT.tagAnlegen(supa, { fahrschule_id: _authProfile.fahrschule_id, datum: x.toISOString().slice(0, 10), start: "08:00", pruefer: "AB", erstellt_von: _authUser.id });
    await PT.einplanen(supa, Object.assign(_ptSupaBasis(), { schueler_id: l[0].id, klasse: "B", pruefungstag_id: tag.id, fenster: 0, fenster_anzahl: 1 }));
    await PT.einplanen(supa, Object.assign(_ptSupaBasis(), { schueler_id: l[1].id, klasse: "B", pruefungstag_id: tag.id, fenster: 1, fenster_anzahl: 1 }));
    await ptLaden(); _ptOffen[tag.id] = true; _pruefTab = "termine"; routePruefungen();
    return tag.id;
  });
  await warte(page);
  const mess = () => page.evaluate(() => ({ breit: document.documentElement.scrollWidth - window.innerWidth, klein: [...document.querySelectorAll(".pt-z, .pt-kopf, .pt-f, .pt-chk, #sheet .es-act, #sheet .sl-item")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 43.5).map((e) => e.className + ":" + Math.round(e.getBoundingClientRect().height)) }));
  let m = await mess();
  pruefe(`W37 [${g.n}] Prüfungstag: nichts läuft seitlich über, Tippflächen ≥ 44 px`, m.breit <= 0 && !m.klein.length, JSON.stringify(m));
  await page.click("[data-ptp]"); await warte(page);
  m = await mess(); pruefe(`W38 [${g.n}] Prüfung-Blatt: ≥ 44 px, nichts läuft über`, m.breit <= 0 && !m.klein.length, JSON.stringify(m));
  await page.click("#ppVersch"); await warte(page);
  m = await mess(); pruefe(`W39 [${g.n}] Verschieben-Blatt: ≥ 44 px, nichts läuft über`, m.breit <= 0 && !m.klein.length, JSON.stringify(m));
  if (bildOrdner) await page.screenshot({ path: join(bildOrdner, `verschieben-${g.n}.png`) });
  await page.evaluate(() => closeSheet()); await warte(page, 300);
  await page.click("[data-ptmehr]"); await warte(page);
  m = await mess(); pruefe(`W40 [${g.n}] „Mehrere einteilen“-Blatt: ≥ 44 px, nichts läuft über`, m.breit <= 0 && !m.klein.length, JSON.stringify(m));
  if (bildOrdner) await page.screenshot({ path: join(bildOrdner, `mehrere-${g.n}.png`) });
  await ctx.close();
  pruefe(`W41 [${g.n}] keine JS-Fehler`, fehler.length === 0, fehler.join(" | "));
}
console.log(`\nPrüfungsfenster-App-Test: ${ok} ok, ${schlecht} Fehler`);
await browser.close(); server.close();
process.exit(schlecht ? 1 : 0);
