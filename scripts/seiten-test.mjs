// Seiten-Test (Umbau Schritt 5a): die übrigen Seiten (Kalender, Prüfungen, To-dos, Statistik, Archiv, Einstellungen,
// Warteliste, Arbeitszeit, Akte-Seiten, Historie, Prüfung eintragen) im neuen Look wie Heute/Schülerliste/Akte-Kopf.
// Geschrieben VOR dem Bau: gegen den alten Stand sind die neuen Punkte rot. Das ist gewollt.
// Punkte mit „bleibt“ prüfen, was nicht verloren gehen darf: die sind schon heute grün und müssen es bleiben.
// Jeder Prüfpunkt (S0 … Z2) gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt etwas, wird der Punkt rot mit Grund, nichts stürzt ab.
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin).
// Nur erfundene Testdaten. Keine Datenbank: alle Fremdanfragen blockiert, getSupa() ist eine Attrappe.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/seiten-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), SEITEN_SCHNELL=1 (Z2: die anderen Tests nicht mitlaufen lassen),
//           SEITEN_DETAILS=1 (alle Fundstellen ungekürzt), SEITEN_AUSLESEN=1 (gibt die Bedien-Haken des Stands als JSON aus – so wurde BEDIEN unten gewonnen)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const REPO = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ROOT = process.env.KOMPASS_ROOT || REPO;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

let fehlerZahl = 0, okZahl = 0, uebersprungen = 0;
// fn liefert: nichts/true/[] = ok, Text/Liste = Fehlergrund, { skip: "Grund" } = übersprungen
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r && typeof r === "object" && !Array.isArray(r) && r.skip) { uebersprungen++; console.log(`übersprungen  ${id} ${text}: ${r.skip}`); return; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const DETAILS = !!process.env.SEITEN_DETAILS;   // SEITEN_DETAILS=1: alle Fundstellen ausgeben (Bauliste), nicht gekürzt
const kurz = (l, n = 8) => (!DETAILS && l.length > n ? l.slice(0, n).concat(`(+${l.length - n} weitere)`) : l);
const erste = (l, n) => (DETAILS ? l : l.slice(0, n)).join(", ") + (!DETAILS && l.length > n ? ` (+${l.length - n})` : "");

// ---------- Feste Zeit und erfundene Testdaten ----------
const TAG = "2026-10-14";       // Mittwoch
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const plusTage = (n) => { const d = new Date(Date.UTC(2026, 9, 14 + n)); return d.toISOString().slice(0, 10); };

function basisSzenario() {
  return {
    theme: "light",
    students: [
      // s1: aktiv, Theorie ✓, eigene Aufgabe, Notiz
      { id: "s1", name: "Anna Erfunden", telefon: "0170 1111111", anteil: 0.6, theorie: true, notiz: "Alte erfundene Notiz", todos: [{ id: "st1", text: "Erfundene Schüleraufgabe", done: false }] },
      // s2: prüfungsreif, steht auf der Warteliste, hat Prüfungstermin morgen
      { id: "s2", name: "Bernd Erfunden", telefon: "0170 2222222", anteil: 0.95, theorie: true, theoryPassed: "2026-09-20T08:00:00.000Z", ready: "2026-10-01T08:00:00.000Z" },
      // s3: wartet auf die Theorie (Reiter „Wartet auf Theorie“)
      { id: "s3", name: "Clara Erfunden", telefon: "", anteil: 0.2, theorieWait: "2026-10-01T08:00:00.000Z" },
      // s4: prüfungsreif, ohne Termin (Warteliste)
      { id: "s4", name: "Dieter Erfunden", telefon: "0170 4444444", anteil: 0.95, theorie: true, theoryPassed: "2026-09-25T08:00:00.000Z", ready: "2026-10-05T08:00:00.000Z" },
      // s5/s6: bestanden → Archiv
      { id: "s5", name: "Emma Erfunden", telefon: "0170 5555555", anteil: 1, passed: "2026-09-30", profil: "gruen" },
      { id: "s6", name: "Felix Erfunden", telefon: "0170 6666666", anteil: 1, passed: "2026-08-12", profil: "blau" },
    ],
    lessons: [
      { id: "a1", date: "2026-10-12", von: "08:00", bis: "09:30", sid: "s1" },
      { id: "a2", date: TAG, von: "08:00", bis: "09:30", sid: "s1" },
      { id: "a3", date: TAG, von: "14:00", bis: "15:30", sid: "s1" },
      { id: "a4", date: plusTage(1), von: "10:00", bis: "11:30", sid: "s3" },
      { id: "a5", date: plusTage(2), von: "16:00", bis: "17:30", sid: "s4", art: "sonder" },
      { id: "a6", date: "2026-10-05", von: "10:00", bis: "11:30", sid: "s2" },
      { id: "a7", date: "2026-09-21", von: "10:00", bis: "11:30", sid: "s1" },
      { id: "a8", date: "2026-09-07", von: "12:00", bis: "13:30", sid: "s5" },
    ],
    termine: [{ id: "P1", date: plusTage(1), von: "09:00", slots: ["s2", null] }, { id: "P2", date: plusTage(8), von: "11:00", slots: [null] }],
    exams: [
      { id: "E1", sid: "s5", name: "Emma Erfunden", date: "2026-09-30", von: "09:00", result: "pass", pruefer: "XY", note: "", attempt: 1, faults: [], eingriff: false, earnAt: "2026-09-30" },
      { id: "E2", sid: "s2", name: "Bernd Erfunden", date: "2026-10-02", von: "09:00", result: "fail", pruefer: "XY", note: "", attempt: 1, faults: "FEHLER2", eingriff: true, earnAt: "2026-10-02" },
      { id: "E3", sid: "s6", name: "Felix Erfunden", date: "2026-08-12", von: "11:00", result: "pass", pruefer: "ZW", note: "", attempt: 2, faults: [], eingriff: false, earnAt: "2026-08-12" },
    ],
    todos: [{ id: "t1", text: "Erfundene Aufgabe Eins", done: false }, { id: "t2", text: "Erfundene Aufgabe Zwei", done: true }],
    start: "routeHome",
  };
}

// Die Seiten von Schritt 5a. vor = Zustand vor dem Aufruf (Reiter, Ansicht …), auf = Route-Aufruf.
// Die Varianten (Kalender Tag/Monat, Prüfungen-Reiter, Einstellungen-Abschnitte) zeigen dieselbe Seite in anderem Zustand.
const SEITEN = [
  { k: "kalender", n: "Kalender (Woche)", vor: "_calView='woche';_calDate=null;_calFilter='alle';", auf: "routeKalender()" },
  { k: "kalender-tag", n: "Kalender (Tag)", vor: "_calView='tag';_calDate=null;_calFilter='alle';", auf: "routeKalender()" },
  { k: "kalender-monat", n: "Kalender (Monat)", vor: "_calView='monat';_calDate=null;_calFilter='alle';", auf: "routeKalender()" },
  { k: "pruefungen", n: "Prüfungen (Termine)", vor: "window._pruefTab='termine';", auf: "routePruefungen()" },
  { k: "pruefungen-wait", n: "Prüfungen (Wartet auf Theorie)", vor: "window._pruefTab='wait';", auf: "routePruefungen()" },
  { k: "pruefungen-praxis", n: "Prüfungen (Bereit)", vor: "window._pruefTab='praxis';", auf: "routePruefungen()" },
  { k: "pruefwoche", n: "Prüfungen diese Woche", vor: "", auf: "routePruefungenWoche()" },
  { k: "todos", n: "To-dos (Allgemein)", vor: "_todoTab='global';_todoStudent=null;", auf: "routeTodos()" },
  { k: "todos-schueler", n: "To-dos (Pro Schüler)", vor: "_todoTab='student';_todoStudent='s1';", auf: "routeTodos()" },
  { k: "stats", n: "Statistik", vor: "", auf: "routeStats()", ms: 1300 },
  { k: "archiv", n: "Archiv", vor: "_archFormFilter=[];_archColorFilter=[];", auf: "routeArchive()" },
  { k: "settings", n: "Einstellungen", vor: "_settingsAccOpen=null;", auf: "routeSettings()" },
  { k: "settings-app", n: "Einstellungen (App anpassen offen)", vor: "_settingsAccOpen='app';", auf: "routeSettings()", ms: 700 },
  { k: "settings-kal", n: "Einstellungen (Kalender & Arbeit offen)", vor: "_settingsAccOpen='kal';", auf: "routeSettings()", ms: 700 },
  { k: "settings-geld", n: "Einstellungen (Verdienst offen)", vor: "_settingsAccOpen='geld';", auf: "routeSettings()", ms: 700 },
  { k: "settings-daten", n: "Einstellungen (Daten offen)", vor: "_settingsAccOpen='daten';", auf: "routeSettings()", ms: 700 },
  { k: "settings-sonst", n: "Einstellungen (Sonstiges offen)", vor: "_settingsAccOpen='sonst';", auf: "routeSettings()", ms: 700 },
  { k: "warteliste", n: "Warteliste", vor: "", auf: "routeWaitlist()" },
  { k: "arbeitszeit", n: "Arbeitszeit", vor: "", auf: "routeArbeitszeit()" },
  { k: "detail", n: "Akte Überblick", vor: "", auf: "routeDetail('s1')" },
  { k: "plan", n: "Akte Plan", vor: "", auf: "routePlan('s1')" },
  { k: "notes", n: "Akte Notizen", vor: "", auf: "routeNotes('s1')" },
  { k: "historie", n: "Historie", vor: "", auf: "routeHistorie('s1')" },
  { k: "exam", n: "Prüfung eintragen", vor: "", auf: "routeExam('s2')" },
  // Zweiter Schritt von „Prüfung eintragen“: Nicht bestanden, Prüfer gewählt, erste Fehlergruppe offen, ein Fehler gewählt
  { k: "exam-fail", n: "Prüfung eintragen (Nicht bestanden)", vor: "", auf: "routeExam('s2')",
    nach: "document.getElementById('pickFail')?.click(); document.querySelector('#prWrap .pr-chip[data-pr]')?.click(); document.querySelector('#faultAcc .facc-h')?.click(); document.querySelector('#faultAcc .f-chip')?.click();", ms: 700 },
];
// Die 14 Route-Aufrufe aus dem Auftrag (für S1a)
const ROUTEN = ["routeKalender()", "routePruefungen()", "routePruefungenWoche()", "routeTodos()", "routeStats()", "routeArchive()", "routeSettings()",
  "routeWaitlist()", "routeArbeitszeit()", "routeDetail('s1')", "routePlan('s1')", "routeNotes('s1')", "routeHistorie('s1')", "routeExam('s2')"];

// ---------- Feste Ausnahmen (mit Grund) ----------
// Tippflächen < 44 px, die so bleiben dürfen. Selektor wird mit el.matches() geprüft.
const AUSNAHMEN_TIPP = [
  // (noch keine: die Klassen aus dem Vertrag – .btn, .pill, .f-chip, .pr-chip, .pt-tab, .mini-btn, .seg-i, .chip, .back-btn –
  //  kommen in Kalender-Raster und Ampel-Punkten nicht vor; die haben eigene Klassen und werden hier gar nicht gemessen)
];
// Text-Überlappungen, die gewollt sind. a/b = Selektoren der beiden Textträger (Reihenfolge egal).
const AUSNAHMEN_UEBERLAPP = [
  // keine. (Kalender-Termine mit „…“ werden schon richtig gemessen: Text, den ein Kästchen abschneidet, zählt nicht.)
  // Form: { a: "Selektor", b: "Selektor", grund: "…" }
];
// Texte mit zu wenig Kontrast, die so bleiben dürfen.
const AUSNAHMEN_KONTRAST = [
  // Ausgegraute/abgeschaltete Dinge sind absichtlich blass (WCAG nimmt deaktivierte Bedienelemente aus).
  { sel: "button:disabled, button:disabled *, [aria-disabled=true], [aria-disabled=true] *", grund: "deaktiviert" },
  // Erledigte To-dos sind absichtlich durchgestrichen und blass.
  { sel: ".todo-item.done .todo-txt", grund: "erledigte Aufgabe (durchgestrichen)" },
  // Abgeschaltete Zeitblöcke in den Arbeitszeiten (Nachtfahrt/Samstag aus): absichtlich auf 40 % ausgegraut.
  { sel: ".az-times[style*='pointer-events:none'] *", grund: "abgeschaltet (Schalter aus)" },
  // Prozent-Kreis im Plan: weiße Zahl auf der Ampelfarbe des Stands (Ampelfarben bleiben unverändert), 4.0:1.
  { sel: ".prog-badge", grund: "Ampelfarbe als Kreis, Farbe bleibt" },
];

// ---------- Messung im Browser (eine Funktion, wird als Ganzes in die Seite geschickt) ----------
function messenImBrowser(arg) {
  const v = document.getElementById("view");
  const W = document.documentElement.clientWidth;
  const cs = (e) => getComputedStyle(e);
  const sel = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
  const kurzT = (t, n = 18) => String(t || "").replace(/\s+/g, " ").trim().slice(0, n);
  const passt = (e, liste) => liste.some((s) => { try { return e.matches(s); } catch (x) { return false; } });
  // Sichtbar: nicht display:none/visibility:hidden/opacity 0, und nach Abschneiden durch Vorfahren (overflow) noch Fläche übrig.
  // #view selbst ist der Blätter-Bereich und schneidet nicht (sonst zählte nur der sichtbare Bildschirmausschnitt).
  const schnittRect = (e, r) => {
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    for (let p = e; p && p !== v && p !== document.body; p = p.parentElement) {   // auch das Element selbst (Auslassungspunkte)
      const s = cs(p);
      if (s.overflowX !== "visible" || s.overflowY !== "visible") {
        const q = p.getBoundingClientRect();
        if (s.overflowX !== "visible") { x1 = Math.max(x1, q.left); x2 = Math.min(x2, q.right); }
        if (s.overflowY !== "visible") { y1 = Math.max(y1, q.top); y2 = Math.min(y2, q.bottom); }
      }
    }
    return { left: x1, top: y1, right: x2, bottom: y2, width: x2 - x1, height: y2 - y1 };
  };
  const unsichtbarKette = (e) => {
    for (let p = e; p && p !== document.documentElement; p = p.parentElement) {
      const s = cs(p); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return true;
      // Inhalt eines zugeklappten <details> (außer der <summary>) ist nicht zu sehen, liefert aber Maße
      if (p.parentElement && p.parentElement.tagName === "DETAILS" && !p.parentElement.open && p.tagName !== "SUMMARY") return true;
    }
    return false;
  };
  const sicht = (e) => { if (!e || unsichtbarKette(e)) return false; const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; const c = schnittRect(e, r); return c.width > 0.5 && c.height > 0.5; };
  const hatText = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const inSvg = (e) => !!e.closest("svg");
  const FORM = "textarea, select, option, input, script, style, noscript";

  const out = { fehler: null };
  if (!v) { out.fehler = "#view fehlt"; return out; }
  const inner = v.querySelector(".view-inner") || v;

  // --- S1 / S2
  out.seite2 = v.hasAttribute("data-seite2");
  out.bodyBg = cs(document.body).backgroundColor;
  out.light = document.body.classList.contains("light");

  // --- Textträger (Elemente mit eigenem Text) in #view
  const traeger = [...v.querySelectorAll("*")].filter((e) => !inSvg(e) && !e.matches(FORM) && !e.closest(FORM) && hatText(e) && sicht(e));

  // --- S3 Titel
  const TITEL = "h1, h2, .sec-h, .display, .detail-name, .plan-title";
  out.titel = [...v.querySelectorAll(TITEL)].filter(sicht).map((t) => {
    const farben = new Set([cs(t).color]);
    for (const d of t.querySelectorAll("*")) if (hatText(d) && !inSvg(d)) farben.add(cs(d).color);
    return { sel: sel(t), text: kurzT(t.textContent, 30), font: cs(t).fontFamily, farben: [...farben] };
  });

  // --- S4 Schrift im Text (Titel und große Zahlen ≥ 22 px dürfen Playfair sein)
  const TITEL_ERLAUBT = "h1, h2, h3, h4, .sec-h, .display, .detail-name, .plan-title, .ak-name";
  out.schrift = [];
  for (const e of traeger) {
    if (!inner.contains(e)) continue;
    const f = cs(e).fontFamily.replace(/["']/g, "").trim();
    if (/^Manrope\b/i.test(f)) continue;
    const titelArtig = e.closest(TITEL_ERLAUBT) || parseFloat(cs(e).fontSize) >= 22;
    if (titelArtig && /^Playfair Display\b/i.test(f)) continue;
    out.schrift.push(`„${kurzT(e.textContent)}“ ${sel(e)} ${f.split(",")[0]}`);
  }

  // --- S5 Karten
  const KARTEN = ".s-card, .res-block, .acc, .tile, .toggle-row, .d-tile, .stat, .mini-stat, .termin-card, .wait-card, .month-bars, .na-card";
  out.karten = [...v.querySelectorAll(KARTEN)].filter(sicht).map((k) => {
    const s = cs(k);
    return { sel: sel(k), text: kurzT(k.textContent, 16), bg: s.backgroundColor, bgImg: s.backgroundImage,
      rand: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth], randArt: s.borderTopStyle, radius: parseFloat(s.borderTopLeftRadius) };
  });

  // --- S6 aktive Chips
  out.chipsOn = [...v.querySelectorAll(".pill.on, .f-chip.on, .pr-chip.on, .pt-tab.on, .seg-i.on")].filter(sicht).map((c) => ({ sel: sel(c), text: kurzT(c.textContent, 16), bg: cs(c).backgroundColor, farbe: cs(c).color }));

  // --- S7 Tippflächen
  out.tipp = [];
  for (const b of v.querySelectorAll(".btn, .pill, .f-chip, .pr-chip, .pt-tab, .mini-btn, .seg-i, .chip, .back-btn")) {
    if (!sicht(b)) continue;
    if (b.matches(".chip") && !(b.matches("button, a, [role=button], [onclick]") || cs(b).cursor === "pointer")) continue;
    if (passt(b, arg.ausnahmenTipp)) continue;
    const h = b.getBoundingClientRect().height;
    if (h < 43.5) out.tipp.push(`„${kurzT(b.textContent, 14) || b.getAttribute("aria-label") || ""}“ ${sel(b)} ${Math.round(h)}px`);
  }

  // --- S8 Text über Text: Rechtecke der Textzeilen (Range), abgeschnitten wie sichtbar
  const zeilen = [];
  for (const e of traeger) {
    for (const n of e.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        const c = schnittRect(e, r);
        if (c.width > 1 && c.height > 1) zeilen.push({ e, n, r: c });
      }
    }
  }
  out.ueberlapp = [];
  const ausnahmeU = (a, b) => arg.ausnahmenUeberlapp.some((x) => (a.matches(x.a) && b.matches(x.b)) || (a.matches(x.b) && b.matches(x.a)));
  for (let i = 0; i < zeilen.length; i++) for (let j = i + 1; j < zeilen.length; j++) {
    const A = zeilen[i], B = zeilen[j];
    if (A.n === B.n) continue;
    const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
    const h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
    if (w > 2 && h > 2 && !ausnahmeU(A.e, B.e)) out.ueberlapp.push(`„${kurzT(A.n.textContent, 12)}“ ${sel(A.e)} × „${kurzT(B.n.textContent, 12)}“ ${sel(B.e)} (${Math.round(w)}×${Math.round(h)})`);
  }

  // --- S9 seitlich wischen / über den rechten Rand
  out.wisch = document.documentElement.scrollWidth > W + 1 || v.scrollWidth > v.clientWidth + 1;
  const inScroller = (e) => { for (let p = e.parentElement; p && p !== v; p = p.parentElement) { if (/(auto|scroll)/.test(cs(p).overflowX)) return true; } return false; };
  out.rand = [];
  for (const el of v.querySelectorAll("*")) {
    if (inSvg(el) || !sicht(el) || inScroller(el) || cs(el).position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.right > W + 1) out.rand.push(`${sel(el)} +${Math.round(r.right - W)}px`);
  }

  // --- S10 Kopfleisten-Titel: kein Umbruch mitten im Wort, höchstens 2 Zeilen, nicht abgeschnitten
  const tb = document.getElementById("tbTitle");
  out.tb = null;
  if (tb && sicht(tb)) {
    const txt = tb.textContent;
    const tops = [];   // je Zeichen die Zeilen-Oberkante
    const walker = document.createTreeWalker(tb, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      for (let i = 0; i < n.textContent.length; i++) {
        const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1);
        const r = [...rg.getClientRects()].filter((x) => x.width > 0)[0];
        tops.push({ ch: n.textContent[i], top: r ? Math.round(r.top) : null });
      }
    }
    const zeilenTops = [];
    for (const t of tops) if (t.top !== null && !zeilenTops.some((z) => Math.abs(z - t.top) <= 3)) zeilenTops.push(t.top);
    const zeileVon = (top) => zeilenTops.findIndex((z) => Math.abs(z - top) <= 3);
    // Wörter: getrennt durch Leerraum; nach Bindestrich darf umbrochen werden
    const gebrochen = [];
    let wort = [];
    const fertig = () => { const zs = new Set(wort.filter((t) => t.top !== null).map((t) => zeileVon(t.top))); if (zs.size > 1) gebrochen.push(wort.map((t) => t.ch).join("")); wort = []; };
    for (const t of tops) {
      if (/\s/.test(t.ch)) { fertig(); continue; }
      wort.push(t);
      if (/[-–]/.test(t.ch)) fertig();
    }
    fertig();
    out.tb = { text: txt.trim(), zeilen: zeilenTops.length, gebrochen, ab: tb.scrollWidth > tb.clientWidth + 1 || tb.scrollHeight > tb.clientHeight + 1 };
  }

  // --- S11 Kontrast
  const rgb = (c) => { const m = (c || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const hg = (el) => {
    const ebenen = [];
    while (el) {
      const s = cs(el);
      let c = rgb(s.backgroundColor);
      if ((!c || c.a === 0) && s.backgroundImage && s.backgroundImage !== "none") c = rgb(s.backgroundImage); // Verlauf: erste Farbe
      if (c && c.a > 0) { ebenen.push(c); if (c.a >= 1) break; }
      el = el.parentElement;
    }
    let f = { r: 255, g: 255, b: 255 };
    if (!ebenen.length || ebenen[ebenen.length - 1].a < 1) f = rgb(cs(document.documentElement).backgroundColor) || f;
    for (const c of ebenen.reverse()) f = { r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a) };
    return f;
  };
  const lum = (c) => { const q = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * q(c.r) + 0.7152 * q(c.g) + 0.0722 * q(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  out.kontrast = [];
  for (const e of traeger) {
    if (passt(e, arg.ausnahmenKontrast)) continue;
    const s = cs(e);
    if (/^[\s -⯿\u{1F000}-\u{1FAFF}️✓✕›‹·•–—|]*$/u.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))) continue; // nur Zeichen/Emoji
    const b = hg(e), c = rgb(s.color); if (!c) continue;
    let deck = c.a; for (let p = e; p && p !== document.body; p = p.parentElement) deck *= +cs(p).opacity;
    const cc = { r: c.r * deck + b.r * (1 - deck), g: c.g * deck + b.g * (1 - deck), b: c.b * deck + b.b * (1 - deck) };
    const q = ratio(cc, b), min = parseFloat(s.fontSize) >= 24 ? 3 : 4.5;
    if (q < min) out.kontrast.push(`„${kurzT(e.textContent, 16)}“ ${sel(e)} ${q.toFixed(1)}:1`);
  }

  // --- S12 Reiterleiste unten
  out.tabbar = [...document.querySelectorAll(".tabbar .tab-i, .tabbar .tab-i *")].filter((e) => hatText(e) || e.matches(".tab-i")).map((e) => cs(e).fontFamily.replace(/["']/g, "")).filter((f) => !/^Manrope\b/i.test(f));
  out.tabbarDa = !!document.querySelector(".tabbar .tab-i");

  // --- S13 Archiv-Chips einzeilig
  out.archivChips = [...v.querySelectorAll("[data-archform], [data-archcolor]")].filter(sicht).map((c) => {
    const tops = new Set();
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 0) tops.add(Math.round(r.top / 4)); }
    const s = cs(c), lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.25;
    const innen = c.getBoundingClientRect().height - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom) - parseFloat(s.borderTopWidth) - parseFloat(s.borderBottomWidth);
    return { text: kurzT(c.textContent, 16), zeilen: tops.size, innen: Math.round(innen), lh: Math.round(lh), h: Math.round(c.getBoundingClientRect().height) };
  });

  // --- nur beim Auslesen: kartenartige Kästen, die (noch) nicht in der Karten-Liste stehen
  if (arg.auslesen) {
    const art = new Set();
    for (const e of v.querySelectorAll("*")) {
      if (inSvg(e) || e.matches(KARTEN) || !sicht(e)) continue;
      const s = cs(e), r = e.getBoundingClientRect();
      if (r.height < 36 || r.width < 120 || parseFloat(s.borderTopWidth) === 0 || parseFloat(s.borderTopLeftRadius) < 6) continue;
      art.add(`${sel(e).replace(/#[^.]+/, "")} ${s.backgroundColor} ${s.borderTopWidth} r${s.borderTopLeftRadius}`);
    }
    out.kartenArtig = [...art];
  }

  // --- Bedien-Haken (für „bleibt“)
  const BEDIEN = "button, a, [role=button], [onclick], input, select, textarea, label, [tabindex]";
  const ids = [...new Set([...v.querySelectorAll("[id]")].map((e) => e.id))].sort();
  const daten = new Set();
  // Bedien-Elemente: Knöpfe/Links/Felder und alles, was per Zeiger antippbar ist (cursor: pointer, z. B. Kalender-Termine, freie Plätze)
  for (const e of v.querySelectorAll("*")) {
    if (inSvg(e) || !(e.matches(BEDIEN) || cs(e).cursor === "pointer")) continue;
    for (const a of e.getAttributeNames()) if (a.startsWith("data-")) daten.add(a);
  }
  out.bedien = { ids, daten: [...daten].sort(), knoepfe: v.querySelectorAll("button").length };
  return out;
}

// ---------- Seite öffnen, Daten setzen ----------
async function neueSeite(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer }, functions: { invoke: leer } });
    window.__offen = []; window.open = (u) => { window.__offen.push(String(u)); return null; };
  });
  return { ctx, page, jsFehler };
}

async function setze(page, sz) {
  await page.evaluate((sz) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    _fsAgg = null;
    try { _fsSetDrawer(false); } catch (e) {}
    ensureAusbildungsplaene(); ensureDB(); ensureTodos();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    const fehlerIds = Object.keys(FAULT_LABEL || {});
    DB.students = sz.students.map((p) => {
      const s = { id: p.id, name: p.name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: p.telefon || "" };
      if (p.theorie) s.plan.theorie = true;
      for (const k of ["theoryPassed", "ready", "theorieWait", "passed", "profil", "notiz"]) if (p[k]) s[k] = p[k];
      if (p.todos) s.todos = JSON.parse(JSON.stringify(p.todos));
      s.plan.sonder = { ueberland: [], autobahn: [], nacht: [] };
      ensure(s);
      const ids = evalSkillsFor(s), k = Math.round(ids.length * (p.anteil || 0));
      ids.slice(0, k).forEach((id) => { s.plan.ampeln[id] = "gruen"; });
      return s;
    });
    DB.lessons = sz.lessons.map((l) => ({ id: l.id, date: l.date, von: l.von, bis: l.bis, art: l.art || "fahrstunde", sid: l.sid || null, name: "", status: l.status || "geplant", note: "", fc: null }));
    DB.termine = sz.termine.map((t) => ({ id: t.id, date: t.date, plaetze: t.slots.length, slots: t.slots.slice(), von: t.von, bis: min2hm(hm2min(t.von) + PRUEF_MIN) }));
    DB.exams = JSON.parse(JSON.stringify(sz.exams)).map((e) => ({ ...e, faults: e.faults === "FEHLER2" ? fehlerIds.slice(0, 2) : e.faults }));
    DB.todos = JSON.parse(JSON.stringify(sz.todos));
    DB.pruefer = ["XY", "ZW"];
    DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Testauto", typ: "schalt" }];
    if (!DB.workCfg.pausen || !DB.workCfg.pausen.length) DB.workCfg.pausen = [{ days: [0, 1, 2, 3, 4], von: "12:00", bis: "12:30" }];
    localStorage.setItem("serband-backup-stamp", String(Date.now()));
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    _calView = "woche"; _calDate = null; _calFilter = "alle"; window._pruefTab = "termine"; _todoTab = "global"; _todoStudent = null;
    _archFormFilter = []; _archColorFilter = []; _settingsAccOpen = null;
    _navStack = [];
    if (sz.fsAgg) _fsAgg = sz.fsAgg;
    window[sz.start]();
  }, sz);
  await warte(page, 350);
}

const warte = (page, ms = 250) => page.waitForTimeout(ms);
const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
const da = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const seite2 = (page) => page.evaluate(() => !!document.getElementById("view")?.hasAttribute("data-seite2"));
async function klick(page, sel, ms = 400) {
  const loc = page.locator(sel);
  if (!(await loc.count())) return `„${sel}“ fehlt`;
  await loc.first().click();
  await warte(page, ms);
  return null;
}
// Seite aufrufen; liefert Fehlertext oder null
async function oeffne(page, s) {
  const err = await page.evaluate((s) => {
    try { closeSheet(); } catch (e) {}
    const fn = s.auf.split("(")[0];
    if (typeof window[fn] !== "function") return `${fn} fehlt`;
    try { (0, eval)(s.vor); (0, eval)(s.auf); if (s.nach) (0, eval)(s.nach); return null; } catch (e) { return `${s.auf}: ${String(e)}`; }
  }, s);
  await warte(page, s.ms || 450);
  return err;
}
const messen = (page) => page.evaluate(messenImBrowser, { auslesen: !!process.env.SEITEN_AUSLESEN, ausnahmenTipp: AUSNAHMEN_TIPP.map((x) => x.sel || x), ausnahmenUeberlapp: AUSNAHMEN_UEBERLAPP, ausnahmenKontrast: AUSNAHMEN_KONTRAST.map((x) => x.sel) });

// ---------- Bedien-Haken des alten Stands (412 × 915, hell) – gewonnen mit SEITEN_AUSLESEN=1 ----------
// ids = Element-IDs im #view, daten = data-*-Attributnamen an Bedien-Elementen (Knopf, Link, Feld, onclick, cursor:pointer), knoepfe = Anzahl <button> im #view.
// Nach dem Umbau muss jede ID und jedes Attribut noch da sein; die Zahl der Knöpfe darf nicht sinken.
const BEDIEN = {
  "kalender": { knoepfe: 42, daten: ["data-calday", "data-f", "data-freeslot"], ids: ["calBody", "calFilterBtn", "calFilters", "calGear", "calKW", "calNext", "calPrev", "calSearch", "calTitle", "calToday", "calViewBtn"] },
  "kalender-tag": { knoepfe: 15, daten: ["data-evedit", "data-f", "data-freeslot"], ids: ["calBody", "calFilterBtn", "calFilters", "calGear", "calKW", "calNext", "calPrev", "calSearch", "calTitle", "calToday", "calViewBtn"] },
  "kalender-monat": { knoepfe: 11, daten: ["data-f"], ids: ["calBody", "calFilterBtn", "calFilters", "calGear", "calKW", "calNext", "calPrev", "calSearch", "calTitle", "calToday", "calViewBtn"] },
  "pruefungen": { knoepfe: 14, daten: ["data-del", "data-id", "data-pt", "data-result", "data-slot", "data-tedit", "data-tid"], ids: ["addTermin", "openPruefWoche", "openPruefer"] },
  "pruefungen-wait": { knoepfe: 8, daten: ["data-id", "data-pt"], ids: ["addTheorieWait", "openPruefWoche", "openPruefer"] },
  "pruefungen-praxis": { knoepfe: 9, daten: ["data-id", "data-pt"], ids: ["addTermin", "openPruefWoche", "openPruefer"] },
  "pruefwoche": { knoepfe: 1, daten: [], ids: ["backBtn"] },
  "todos": { knoepfe: 7, daten: ["data-tcheck", "data-tdel", "data-tt"], ids: ["todoAdd"] },
  "todos-schueler": { knoepfe: 5, daten: ["data-tcheck", "data-tdel", "data-tt"], ids: ["todoAdd", "todoStudSel"] },
  "stats": { knoepfe: 12, daten: ["data-period"], ids: ["toNichtBesteher", "toPruefer", "vdGear", "vdModWrap", "vdYearWrap"] },
  "archiv": { knoepfe: 13, daten: ["data-archcolor", "data-archform", "data-id", "data-letter", "data-name"], ids: ["alpha-arch-E", "alpha-arch-F", "archAlphaNav", "archGrid", "archNoHit", "archSearch", "archSearchClear"] },
  "settings": { knoepfe: 23, daten: ["data-vis"], ids: ["allDevicesLogoutBtn", "expBtn", "impBtn", "impFile", "qrAusgabe", "qrEingabe", "qrErzeugen", "weatherCityInput", "weatherKeyInput", "weatherSaveBtn"] },
  "settings-app": { knoepfe: 23, daten: ["data-vis"], ids: ["allDevicesLogoutBtn", "expBtn", "impBtn", "impFile", "qrAusgabe", "qrEingabe", "qrErzeugen", "weatherCityInput", "weatherKeyInput", "weatherSaveBtn"] },
  "settings-kal": { knoepfe: 23, daten: ["data-vis"], ids: ["allDevicesLogoutBtn", "expBtn", "impBtn", "impFile", "qrAusgabe", "qrEingabe", "qrErzeugen", "weatherCityInput", "weatherKeyInput", "weatherSaveBtn"] },
  "settings-geld": { knoepfe: 23, daten: ["data-vis"], ids: ["allDevicesLogoutBtn", "expBtn", "impBtn", "impFile", "qrAusgabe", "qrEingabe", "qrErzeugen", "weatherCityInput", "weatherKeyInput", "weatherSaveBtn"] },
  "settings-daten": { knoepfe: 23, daten: ["data-vis"], ids: ["allDevicesLogoutBtn", "expBtn", "impBtn", "impFile", "qrAusgabe", "qrEingabe", "qrErzeugen", "weatherCityInput", "weatherKeyInput", "weatherSaveBtn"] },
  "settings-sonst": { knoepfe: 23, daten: ["data-vis"], ids: ["allDevicesLogoutBtn", "expBtn", "impBtn", "impFile", "qrAusgabe", "qrEingabe", "qrErzeugen", "weatherCityInput", "weatherKeyInput", "weatherSaveBtn"] },
  "warteliste": { knoepfe: 6, daten: ["data-examplan-id", "data-id", "data-remove-id"], ids: [] },
  "arbeitszeit": { knoepfe: 6, daten: ["data-pdel"], ids: ["azAddPause", "azAxisBis", "azAxisVon", "azNachBis", "azNachVon", "azNachtAn", "azNachtBis", "azNachtTimes", "azNachtVon", "azPausen", "azSaAn", "azSaBis", "azSaTimes", "azSaVon", "azSave", "azThSaBis", "azThSaVon", "azThWBis", "azThWVon", "azVorBis", "azVorVon", "backBtn"] },
  "detail": { knoepfe: 23, daten: ["data-akte", "data-form", "data-go"], ids: ["akadOn", "akademieFortschrittSlot", "backBtn", "dashEmpfehlungen", "dashFormPills", "dashTheoToggle", "dashUmschreiberToggle", "delBtn", "editBtn", "pruefReifBtn", "sehhilfeBtn", "shareStandBtn", "simOn", "theoEdit", "theoFill", "theoPct", "waKontaktBtn"] },
  "plan": { knoepfe: 323, daten: ["data-akte", "data-done", "data-faid", "data-info", "data-lz", "data-lzalle", "data-note", "data-sn", "data-std", "data-v"], ids: ["backBtn", "c_autobahn", "c_nacht", "c_ueberland", "pdfPlanBtn", "planActions", "planPrognose", "planRing", "readyForce", "readyLk", "stdGrid", "stufenWrap"] },
  "notes": { knoepfe: 8, daten: ["data-akte"], ids: ["backBtn", "noteArea", "saveNote"] },
  "historie": { knoepfe: 3, daten: [], ids: ["backBtn", "histAddBtn", "histInput"] },
  "exam": { knoepfe: 4, daten: [], ids: ["backBtn", "pickFail", "pickPass", "pickPlan"] },
  "exam-fail": { knoepfe: 40, daten: ["data-acc", "data-cnt", "data-f", "data-pr"], ids: ["backBtn", "eingNote", "eingToggle", "exDate", "exNote", "faultAcc", "prAdd", "prWrap", "saveExam"] },
};

// ======================= Hauptlauf =======================
const sammel = {};   // id → Liste von Fundstellen
const merk = (id, t) => { (sammel[id] = sammel[id] || []).push(t); };
const GROESSEN = [{ n: "360", w: 360, h: 740 }, { n: "412", w: 412, h: 915 }];
const auslesen = {};

const haupt = await neueSeite(412, 915);
await setze(haupt.page, basisSzenario());
await pruefe("S0", "Uhr steht fest: todayISO() = 2026-10-14, 10:30; Testdaten geladen (6 Schüler, 2 im Archiv, 2 auf der Warteliste)", async () => {
  const r = await haupt.page.evaluate(() => ({ iso: todayISO(), h: new Date().getHours(), m: new Date().getMinutes(), n: DB.students.length, arch: DB.students.filter((s) => s.passed).length, wl: waitlist().length }));
  const f = [];
  if (r.iso !== TAG || r.h !== 10 || r.m !== 30) f.push(`todayISO()=${r.iso}, ${r.h}:${r.m}`);
  if (r.n !== 6 || r.arch !== 2 || r.wl !== 2) f.push(`Schüler ${r.n}, Archiv ${r.arch}, Warteliste ${r.wl}`);
  return f;
});

for (const g of GROESSEN) {
  for (const theme of ["light", "dark"]) {
    const s = g.w === 412 && theme === "light" ? haupt : await neueSeite(g.w, g.h);
    const sz = basisSzenario(); sz.theme = theme;
    await setze(s.page, sz);
    const wo0 = `${g.n} ${theme === "dark" ? "dunkel" : "hell"}`;
    for (const seite of SEITEN) {
      const wo = `${wo0} ${seite.n}`;
      const vorher = s.jsFehler.length;
      const e = await oeffne(s.page, seite);
      if (e) { merk("S9b", `${wo}: ${e}`); continue; }
      let m;
      try { m = await messen(s.page); } catch (x) { merk("S9b", `${wo}: Messung fehlgeschlagen: ${String(x.message || x).split("\n")[0]}`); continue; }
      if (m.fehler) { merk("S9b", `${wo}: ${m.fehler}`); continue; }
      if (s.jsFehler.length > vorher) merk("S9b", `${wo}: JS-Fehler: ${s.jsFehler[vorher]}`);
      if (g.w === 412 && theme === "light") {
        if (!m.seite2) merk("S1a", seite.n);
        auslesen[seite.k] = m.bedien;
        if (process.env.SEITEN_AUSLESEN && m.kartenArtig.length) console.log(`KARTENARTIG ${seite.n}: ${m.kartenArtig.join(" | ")}`);
      }
      if (theme === "light" && !/^rgb\(243, 245, 241\)$/.test(m.bodyBg)) merk("S2", `${wo}: ${m.bodyBg}`);
      for (const t of m.titel) {
        const f = [];
        if (!/^["']?Playfair Display/i.test(t.font)) f.push(`Schrift ${t.font.split(",")[0]}`);
        if (t.farben.length > 1) f.push(`zweifarbig ${t.farben.join(" / ")}`);
        if (f.length) merk("S3", `${wo}: ${t.sel} „${t.text}“ ${f.join(", ")}`);
      }
      if (m.schrift.length) merk("S4", `${wo}: ${m.schrift.length}× z. B. ${erste(m.schrift, 2)}`);
      for (const k of m.karten) {
        if (theme === "light") {
          const f = [];
          if (k.bg !== "rgb(255, 255, 255)") f.push(`Grund ${k.bg}`);
          if (k.rand.some((x) => x !== "1px") || k.randArt === "none") f.push(`Rahmen ${[...new Set(k.rand)].join("/")} ${k.randArt}`);
          if (!(k.radius >= 14 && k.radius <= 24)) f.push(`Ecke ${k.radius}px`);
          if (f.length) merk("S5a", `${wo}: ${k.sel} „${k.text}“ ${f.join(", ")}`);
        } else if (k.bg === "rgb(255, 255, 255)") merk("S5b", `${wo}: ${k.sel} „${k.text}“ weiß`);
      }
      if (theme === "light") for (const c of m.chipsOn) if (c.bg !== "rgb(20, 33, 26)" || c.farbe !== "rgb(255, 255, 255)") merk("S6", `${wo}: ${c.sel} „${c.text}“ Grund ${c.bg}, Schrift ${c.farbe}`);
      if (m.tipp.length) merk("S7", `${wo}: ${erste(m.tipp, 4)}`);
      if (m.ueberlapp.length) merk("S8", `${wo}: ${erste(m.ueberlapp, 3)}`);
      if (m.wisch) merk("S9a", `${wo}: seitlich wischbar`);
      if (m.rand.length) merk("S9a", `${wo}: über den Rand ${m.rand.slice(0, 2).join(", ")}`);
      if (!m.tb) merk("S10", `${wo}: #tbTitle nicht sichtbar`);
      else {
        const f = [];
        if (m.tb.gebrochen.length) f.push(`Wort umbrochen: ${m.tb.gebrochen.join(", ")}`);
        if (m.tb.zeilen > 2) f.push(`${m.tb.zeilen} Zeilen`);
        if (m.tb.ab) f.push("abgeschnitten");
        if (f.length) merk("S10", `${wo}: „${m.tb.text}“ ${f.join(", ")}`);
      }
      if (m.kontrast.length) merk("S11", `${wo}: ${erste(m.kontrast, 3)}`);
      if (!m.tabbarDa) merk("S12", `${wo}: .tabbar .tab-i fehlt`);
      else if (m.tabbar.length) merk("S12", `${wo}: ${[...new Set(m.tabbar)].map((f) => f.split(",")[0]).join(", ")}`);
      if (seite.k === "archiv") {
        if (!m.archivChips.length) merk("S13", `${wo}: keine Archiv-Chips ([data-archform]/[data-archcolor])`);
        for (const c of m.archivChips) if (c.zeilen > 1) merk("S13", `${wo}: „${c.text}“ ${c.zeilen} Zeilen, ${c.h}px hoch`);
      }
    }
    if (s !== haupt) await s.ctx.close();
  }
}

if (process.env.SEITEN_AUSLESEN) console.log("BEDIEN = " + JSON.stringify(auslesen, null, 1));

// ===== S1 Kennzeichen data-seite2 =====
await pruefe("S1a", "#view hat data-seite2 nach jedem der 14 Route-Aufrufe (alle Varianten)", () => kurz(sammel.S1a || [], 30));
await pruefe("S1b", "Heute (routeDashboard) und Schülerliste (routeHome) haben KEIN data-seite2, aber ihre Klassen heute2/schueler2", async () => {
  const p = haupt.page, f = [];
  await setze(p, basisSzenario());
  for (const [fn, kl] of [["routeKalender", null], ["routeDashboard", "heute2"], ["routeKalender", null], ["routeHome", "schueler2"]]) {
    await p.evaluate((fn) => window[fn](), fn); await warte(p, 300);
    if (!kl) continue;
    const r = await p.evaluate((kl) => ({ a: document.getElementById("view").hasAttribute("data-seite2"), k: !!document.querySelector("#view ." + kl) }), kl);
    if (r.a) f.push(`${fn}: data-seite2 gesetzt`);
    if (!r.k) f.push(`${fn}: .${kl} fehlt`);
  }
  return f;
});
await pruefe("S1c", "data-seite2 bleibt nach internem Neuzeichnen (To-do abhaken, Kalender Woche weiter, Prüfungen-Reiter, Einstellungen aufklappen, Archiv-Chip, Akte-Reiter)", async () => {
  const p = haupt.page, f = [];
  await setze(p, basisSzenario());
  const schritte = [
    ["To-do abhaken", "routeTodos()", '#view [data-tcheck="t1"]'],
    ["Kalender Woche weiter", "routeKalender()", "#calNext"],
    ["Kalender Heute", "routeKalender()", "#calToday"],
    ["Prüfungen-Reiter Bereit", "routePruefungen()", '#view .pt-tab[data-pt="praxis"]'],
    ["Einstellungen aufklappen", "routeSettings()", '#view .set-acc[data-acckey="kal"] > .acc-h'],
    ["Archiv-Chip B", "routeArchive()", '#view [data-archform="B"]'],
    ["Akte-Reiter Plan", "routeDetail('s1')", '#view .ak-r[data-akte="plan"]'],
    ["Akte-Reiter Notizen", "routePlan('s1')", '#view .ak-r[data-akte="notizen"]'],
  ];
  for (const [n, auf, sel] of schritte) {
    await p.evaluate((a) => (0, eval)(a), auf); await warte(p, 300);
    const e = await klick(p, sel, 350);
    if (e) { f.push(`${n}: ${e}`); continue; }
    if (!(await seite2(p))) f.push(`${n}: data-seite2 fehlt danach`);
  }
  await setze(p, basisSzenario());
  return f;
});
await pruefe("S1d", "Wechsel zu Heute nimmt data-seite2 weg (Kalender → Heute, Einstellungen → Heute, Akte → Heute)", async () => {
  const p = haupt.page, f = [];
  for (const auf of ["routeKalender()", "routeSettings()", "routeDetail('s1')"]) {
    await setze(p, basisSzenario());
    await p.evaluate((a) => (0, eval)(a), auf); await warte(p, 250);
    const vor = await seite2(p);
    await p.evaluate(() => routeDashboard()); await warte(p, 300);
    if (!vor) f.push(`${auf}: data-seite2 schon vorher nicht da`);
    else if (await seite2(p)) f.push(`${auf} → Heute: data-seite2 bleibt`);
  }
  return f;
});
// S1e (Fund Prüfer Büro): Zurück-Pfeil/Android-Zurück ruft die Seite ohne Hülle auf – das Merkmal muss trotzdem stimmen.
await pruefe("S1e", "Zurück (navZurueck) setzt data-seite2 passend: Kalender → Heute → Zurück = an; Heute → Akte → Zurück = aus", async () => {
  const p = haupt.page, f = [];
  await setze(p, basisSzenario());
  await p.evaluate(() => { routeKalender(); routeDashboard(); }); await warte(p, 250);
  await p.evaluate(() => navZurueck()); await warte(p, 300);
  if (!(await seite2(p))) f.push("Heute → Zurück auf Kalender: data-seite2 fehlt");
  await p.evaluate(() => { routeDashboard(); routeDetail("s1"); }); await warte(p, 250);
  await p.evaluate(() => navZurueck()); await warte(p, 300);
  if (await seite2(p)) f.push("Akte → Zurück auf Heute: data-seite2 bleibt stehen");
  return f;
});
await pruefe("S2", "hell: Grund von body rgb(243, 245, 241) auf allen Seiten", () => kurz(sammel.S2 || []));
await pruefe("S3", "Seitentitel (h1/h2/.sec-h/.display/.detail-name/.plan-title) in Playfair Display und einfarbig (.o wie der Rest)", () => kurz(sammel.S3 || []));
await pruefe("S4", "Text in #view .view-inner in Manrope (Playfair nur Titel/große Zahlen ≥ 22 px)", () => kurz(sammel.S4 || []));
await pruefe("S5a", "hell: Karten weiß, Rahmen 1px, Ecken 14–24 px", () => kurz(sammel.S5a || [], 12));
await pruefe("S5b", "dunkel: Karten nicht weiß", () => kurz(sammel.S5b || []));
await pruefe("S6", "hell: aktive Chips/Reiter (.pill/.f-chip/.pr-chip/.pt-tab/.seg-i .on) Grund rgb(20, 33, 26), Schrift weiß", () => kurz(sammel.S6 || []));
await pruefe("S7", "Tippflächen (.btn/.pill/.f-chip/.pr-chip/.pt-tab/.mini-btn/.seg-i/.chip/.back-btn) ≥ 44 px", () => kurz(sammel.S7 || [], 12));
await pruefe("S8", "kein Text über anderem Text (> 2 px)", () => kurz(sammel.S8 || [], 12));

// ===== S9 Querformat: nur Rand/Wischen =====
for (const theme of ["light", "dark"]) {
  const s = await neueSeite(915, 412);
  const sz = basisSzenario(); sz.theme = theme;
  await setze(s.page, sz);
  for (const seite of SEITEN) {
    const wo = `915 quer ${theme === "dark" ? "dunkel" : "hell"} ${seite.n}`;
    const vorher = s.jsFehler.length;
    const e = await oeffne(s.page, seite);
    if (e) { merk("S9b", `${wo}: ${e}`); continue; }
    const m = await s.page.evaluate(messenImBrowser, { ausnahmenTipp: [], ausnahmenUeberlapp: AUSNAHMEN_UEBERLAPP, ausnahmenKontrast: [] }).catch((x) => ({ fehler: String(x.message || x).split("\n")[0] }));
    if (m.fehler) { merk("S9b", `${wo}: ${m.fehler}`); continue; }
    if (m.wisch) merk("S9a", `${wo}: seitlich wischbar`);
    if (m.rand.length) merk("S9a", `${wo}: über den Rand ${m.rand.slice(0, 2).join(", ")}`);
    if (s.jsFehler.length > vorher) merk("S9b", `${wo}: JS-Fehler: ${s.jsFehler[vorher]}`);
  }
  await s.ctx.close();
}
await pruefe("S9a", "360/412 hoch und 915 quer, hell+dunkel: nicht seitlich wischbar, nichts über den rechten Rand", () => kurz(sammel.S9a || []));
await pruefe("S9b", "keine JS-Fehler, jede Seite öffnet sich", () => kurz(sammel.S9b || []));
await pruefe("S10", "Kopfleisten-Titel #tbTitle: kein Wort mitten im Wort umbrochen, höchstens 2 Zeilen, nicht abgeschnitten", () => kurz(sammel.S10 || []));
await pruefe("S11", "Kontrast Text gegen Grund ≥ 4.5:1 (≥ 24 px: 3:1), hell und dunkel", () => kurz(sammel.S11 || [], 12));
await pruefe("S12", "Reiterleiste unten (.tabbar .tab-i): Schrift Manrope", () => kurz([...new Set((sammel.S12 || []).map((x) => x.replace(/^\S+ \S+ [^:]+: /, "")))].map((x) => "alle Seiten: " + x)));
await pruefe("S13", "Archiv: Filter-Chips stehen einzeilig", () => kurz(sammel.S13 || []));

// ===== S14 Gesamtansicht: routeDashboard → routeFahrschuleDashboard, ein Zurück genügt =====
await pruefe("S14", "Gesamtansicht: Schüler → Heute (leitet auf Fahrschul-Start um) legt EINEN Eintrag an; ein Zurück führt zu „Schüler“", async () => {
  const p = haupt.page;
  const sz = basisSzenario();
  sz.fsAgg = { fahrschuleId: "x", fahrschule: { name: "Erfundene Fahrschule" }, lehrer: [{ id: "lA", name: "Lehrer Alpha" }], pakete: [], fahrzeuge: [] };
  await setze(p, sz);
  const r = await p.evaluate(async () => {
    const w = (ms) => new Promise((k) => setTimeout(k, ms));
    _navStack = []; routeHome(); await w(150);
    routeDashboard(); await w(250);
    const stapel = _navStack.map((x) => x.name);
    const t1 = $("#tbTitle").textContent.trim();
    navZurueck(); await w(250);
    return { stapel, t1, t2: $("#tbTitle").textContent.trim() };
  });
  await setze(p, basisSzenario());
  const f = [];
  if (r.t1 !== "Start") f.push(`nach routeDashboard Titel „${r.t1}“ statt „Start“ (Fahrschul-Start)`);
  for (let i = 1; i < r.stapel.length; i++) if (r.stapel[i] === r.stapel[i - 1]) f.push(`zweimal ${r.stapel[i]} hintereinander`);
  const iF = r.stapel.lastIndexOf("routeFahrschuleDashboard");
  if (iF > 0 && r.stapel[iF - 1] === "routeDashboard") f.push("routeDashboard liegt zusätzlich vor routeFahrschuleDashboard");
  if (r.t2 !== "Schüler") f.push(`ein Zurück → „${r.t2}“ statt „Schüler“`);
  if (f.length) f.push(`Stapel [${r.stapel.join(", ")}]`);
  return f;
});

// ===== B „bleibt“: Bedien-Haken und Klicks =====
await pruefe("B1", "bleibt: jede Element-ID und jedes data-*-Attribut an Bedien-Elementen des alten Stands ist noch da, Knopfzahl sinkt nicht (412 hell)", () => {
  if (!Object.keys(BEDIEN).length) return { skip: "BEDIEN leer (Auslese-Lauf)" };
  const f = [];
  for (const [k, soll] of Object.entries(BEDIEN)) {
    const ist = auslesen[k];
    const n = (SEITEN.find((x) => x.k === k) || { n: k }).n;
    if (!ist) { f.push(`${n}: nicht gemessen`); continue; }
    const ids = soll.ids.filter((x) => !ist.ids.includes(x));
    const dat = soll.daten.filter((x) => !ist.daten.includes(x));
    if (ids.length) f.push(`${n}: IDs fehlen ${ids.slice(0, 5).join(", ")}${ids.length > 5 ? " …" : ""}`);
    if (dat.length) f.push(`${n}: Attribute fehlen ${dat.join(", ")}`);
    if (ist.knoepfe < soll.knoepfe) f.push(`${n}: ${ist.knoepfe} Knöpfe statt ≥ ${soll.knoepfe}`);
  }
  return f;
});

const p = haupt.page;
await pruefe("B2a", "bleibt: To-do abhaken ändert DB.todos (t1 erledigt) und zeigt es als erledigt; nochmal tippen hebt es auf", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { _todoTab = "global"; routeTodos(); }); await warte(p, 300);
  let e = await klick(p, '#view [data-tcheck="t1"]'); if (e) return e;
  const r1 = await p.evaluate(() => ({ db: DB.todos.find((t) => t.id === "t1").done, ui: !!document.querySelector('#view .todo-item.done[data-tid="t1"]') }));
  e = await klick(p, '#view [data-tcheck="t1"]'); if (e) return e;
  const r2 = await p.evaluate(() => DB.todos.find((t) => t.id === "t1").done);
  const f = [];
  if (r1.db !== true) f.push("DB.todos t1 nicht erledigt");
  if (!r1.ui) f.push("nicht als erledigt angezeigt");
  if (r2 !== false) f.push("zweites Tippen hebt nicht auf");
  return f;
});
await pruefe("B2b", "bleibt: To-dos „Pro Schüler“ → Schüler wählen zeigt seine Aufgabe; „+ Aufgabe“ öffnet das Fenster", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { _todoTab = "global"; routeTodos(); }); await warte(p, 300);
  let e = await klick(p, '#view [data-tt="student"]'); if (e) return e;
  e = await klick(p, '#view [data-tstud="s1"]'); if (e) return e;
  const f = [];
  const t = await p.evaluate(() => document.getElementById("view").textContent);
  if (!t.includes("Erfundene Schüleraufgabe")) f.push("Aufgabe von Anna fehlt");
  e = await klick(p, "#todoAdd"); if (e) f.push(e);
  else if (!(await p.evaluate(() => document.getElementById("sheet")?.classList.contains("open")))) f.push("Fenster nicht offen");
  await p.evaluate(() => { try { closeSheet(); } catch (x) {} _todoTab = "global"; _todoStudent = null; });
  return f;
});
await pruefe("B2c", "bleibt: Notiz speichern schreibt s.notiz", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => routeNotes("s1")); await warte(p, 300);
  if (!(await da(p, "#noteArea"))) return "#noteArea fehlt";
  await p.fill("#noteArea", "Neue erfundene Notiz");
  const e = await klick(p, "#saveNote"); if (e) return e;
  const n = await p.evaluate(() => DB.students.find((s) => s.id === "s1").notiz);
  if (n !== "Neue erfundene Notiz") return `s.notiz = „${n}“`;
});
await pruefe("B2d", "bleibt: Kalender Woche vor (+7 Tage), zurück, „Heute“ springt auf heute; Titel ändert sich", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { _calView = "woche"; _calDate = null; routeKalender(); }); await warte(p, 300);
  const f = [];
  const t0 = await p.evaluate(() => ({ d: _calDate, t: document.getElementById("calTitle")?.textContent }));
  let e = await klick(p, "#calNext"); if (e) return e;
  const t1 = await p.evaluate(() => ({ d: _calDate, t: document.getElementById("calTitle")?.textContent }));
  if (t1.d !== plusTage(7)) f.push(`vor: _calDate ${t1.d} statt ${plusTage(7)}`);
  if (t1.t === t0.t) f.push("vor: Titel gleich");
  e = await klick(p, "#calPrev"); if (e) return e;
  e = await klick(p, "#calPrev"); if (e) return e;
  const t2 = await p.evaluate(() => _calDate);
  if (t2 !== plusTage(-7)) f.push(`2× zurück: ${t2} statt ${plusTage(-7)}`);
  e = await klick(p, "#calToday"); if (e) return e;
  const t3 = await p.evaluate(() => ({ d: _calDate, t: document.getElementById("calTitle")?.textContent }));
  if (t3.d !== TAG) f.push(`Heute: ${t3.d}`);
  if (t3.t !== t0.t) f.push(`Heute: Titel „${t3.t}“ statt „${t0.t}“`);
  return f;
});
await pruefe("B2e", "bleibt: Kalender Filter-Chip „Prüfungen“ und Termin-Tipp öffnen das Termin-Fenster", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { _calView = "woche"; _calDate = null; routeKalender(); }); await warte(p, 300);
  const f = [];
  let e = await klick(p, '#view #calFilters [data-f="pruefung"]'); if (e) f.push(e);
  else if ((await p.evaluate(() => _calFilter)) !== "pruefung") f.push("Filter nicht umgestellt");
  await p.evaluate(() => { _calFilter = "alle"; routeKalender(); }); await warte(p, 300);
  e = await klick(p, '#view [data-evedit*="a3"]'); if (e) f.push(e);
  else if (!(await p.evaluate(() => document.getElementById("sheet")?.classList.contains("open")))) f.push("Termin-Fenster nicht offen");
  await p.evaluate(() => { try { closeSheet(); } catch (x) {} });
  return f;
});
await pruefe("B2f", "bleibt: Prüfungen-Reiter schalten um (Bereit → Wartet auf Theorie → Termine), genau ein Reiter aktiv", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { window._pruefTab = "termine"; routePruefungen(); }); await warte(p, 300);
  const f = [];
  for (const [k, wer] of [["praxis", "Bernd Erfunden"], ["wait", "Clara Erfunden"], ["termine", "Dieter Erfunden"]]) {
    const e = await klick(p, `#view .pt-tab[data-pt="${k}"]`); if (e) { f.push(e); continue; }
    const r = await p.evaluate(() => ({ t: window._pruefTab, on: [...document.querySelectorAll("#view .pt-tab.on")].map((b) => b.dataset.pt), text: document.getElementById("view").textContent }));
    if (r.t !== k || r.on.join(",") !== k) f.push(`${k}: _pruefTab ${r.t}, aktiv [${r.on}]`);
    if (!r.text.includes(wer)) f.push(`${k}: ${wer} fehlt`);
  }
  return f;
});
await pruefe("B2g", "bleibt: Prüfungen „Diese Woche“ öffnet die Wochenansicht, ihr Zurück-Knopf führt zu „Prüfungen“", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { window._pruefTab = "termine"; routePruefungen(); }); await warte(p, 300);
  let e = await klick(p, "#openPruefWoche"); if (e) return e;
  const t1 = await titel(p);
  const f = [];
  if (!(await p.evaluate(() => document.getElementById("view").textContent.includes("Bernd Erfunden")))) f.push("Wochenansicht ohne Bernd (Prüfung morgen)");
  // Seit 5a steht dort nur noch der Zurück-Pfeil oben (keine doppelte Zurück-Zeile); ohne Pfeil oben gibt es die Zeile in der Seite.
  const oben = await p.evaluate(() => { const b = document.getElementById("navBackBtn"); return !!b && !b.hidden; });
  e = await klick(p, oben ? "#navBackBtn" : "#view #backBtn"); if (e) f.push(e);
  else if ((await titel(p)) !== "Prüfungen") f.push(`Zurück → „${await titel(p)}“ (vorher „${t1}“)`);
  return f;
});
await pruefe("B2h", "bleibt: Einstellungen-Abschnitt klappt auf (.set-acc.open) und wieder zu, nur einer offen", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { _settingsAccOpen = null; routeSettings(); }); await warte(p, 300);
  const f = [];
  let e = await klick(p, '#view .set-acc[data-acckey="kal"] > .acc-h'); if (e) return e;
  const r1 = await p.evaluate(() => [...document.querySelectorAll("#view .set-acc.open")].map((a) => a.dataset.acckey));
  if (r1.join(",") !== "kal") f.push(`nach Tippen offen [${r1}]`);
  e = await klick(p, '#view .set-acc[data-acckey="daten"] > .acc-h'); if (e) return e;
  const r2 = await p.evaluate(() => [...document.querySelectorAll("#view .set-acc.open")].map((a) => a.dataset.acckey));
  if (r2.join(",") !== "daten") f.push(`nach zweitem Abschnitt offen [${r2}]`);
  e = await klick(p, '#view .set-acc[data-acckey="daten"] > .acc-h'); if (e) return e;
  const r3 = await p.evaluate(() => document.querySelectorAll("#view .set-acc.open").length);
  if (r3) f.push("schließt nicht");
  return f;
});
await pruefe("B2i", "bleibt: Einstellungen-Schalter (Dashboard-Karte) ändert DB.sichtbarkeit", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => { _settingsAccOpen = "app"; routeSettings(); }); await warte(p, 500);
  const vor = await p.evaluate(() => sichtbar("dash_capacity"));
  const e = await klick(p, '#view [data-vis="dash_capacity"]'); if (e) return e;
  const nach = await p.evaluate(() => sichtbar("dash_capacity"));
  await p.evaluate(() => { _settingsAccOpen = null; });
  if (vor === nach) return `dash_capacity bleibt ${vor}`;
});
await pruefe("B2j", "bleibt: Archiv-Chip „B“ filtert (_archFormFilter), Tipp auf Ehemalige öffnet die Akte", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => routeArchive()); await warte(p, 300);
  const f = [];
  let e = await klick(p, '#view [data-archform="B"]'); if (e) return e;
  const r = await p.evaluate(() => ({ fil: _archFormFilter.slice(), on: !!document.querySelector('#view [data-archform="B"].on'), n: document.querySelectorAll("#view .wait-card").length }));
  if (r.fil.join(",") !== "B") f.push(`_archFormFilter [${r.fil}]`);
  if (!r.on) f.push("Chip nicht als aktiv markiert");
  if (r.n !== 2) f.push(`${r.n} Ehemalige statt 2`);
  e = await klick(p, '#view .wait-card[data-id="s5"]'); if (e) f.push(e);
  else if ((await titel(p)) !== "Schülerdatei") f.push(`Tipp → „${await titel(p)}“`);
  await p.evaluate(() => { _archFormFilter = []; });
  return f;
});
await pruefe("B2k", "bleibt: Warteliste zeigt Bernd und Dieter, Tipp auf eine Karte öffnet die Akte", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => routeWaitlist()); await warte(p, 300);
  const ids = await p.evaluate(() => [...document.querySelectorAll("#view .wait-card[data-id]")].map((c) => c.dataset.id).sort().join(","));
  const f = [];
  if (ids !== "s2,s4") f.push(`Karten [${ids}]`);
  const e = await klick(p, '#view .wait-card[data-id="s4"]'); if (e) f.push(e);
  else if ((await titel(p)) !== "Schülerdatei") f.push(`Tipp → „${await titel(p)}“`);
  return f;
});
await pruefe("B2l", "bleibt: Statistik-Zeitraum (.seg-i[data-period]) schaltet um", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => routeStats()); await warte(p, 500);
  const ks = await p.evaluate(() => [...document.querySelectorAll("#view .seg-i[data-period]")].map((b) => b.dataset.period));
  if (ks.length < 2) return `Zeitraum-Knöpfe [${ks}]`;
  const ziel = ks.find((k) => k !== "cur");
  const e = await klick(p, `#view .seg-i[data-period="${ziel}"]`, 600); if (e) return e;
  const r = await p.evaluate(() => ({ p: _curStatPeriod, on: [...document.querySelectorAll("#view .seg-i.on")].map((b) => b.dataset.period) }));
  if (r.p !== ziel || r.on.join(",") !== ziel) return `Zeitraum ${r.p}, aktiv [${r.on}] statt ${ziel}`;
});
await pruefe("B2m", "bleibt: Akte-Reiter (.ak-r) wechseln Überblick → Plan → Notizen → Überblick (Titel je Reiter)", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => routeDetail("s1")); await warte(p, 300);
  const f = [];
  for (const [k, soll] of [["plan", "Ausbildungsplan"], ["notizen", "Notizen"], ["termine", "Termine"], ["pruefung", "Prüfung"], ["ueberblick", "Schülerdatei"]]) {
    const e = await klick(p, `#view .ak-r[data-akte="${k}"]`); if (e) { f.push(e); break; }
    const t = await titel(p);
    if (t !== soll) f.push(`${k} → „${t}“ statt „${soll}“`);
  }
  return f;
});
await pruefe("B2n", "bleibt: Prüfung eintragen: „Nicht bestanden“ → Prüfer-Chip und Fehler-Chip schalten (.on), Speichern legt DB.exams an", async () => {
  await setze(p, basisSzenario());
  await p.evaluate(() => routeExam("s2")); await warte(p, 300);
  const f = [];
  if ((await titel(p)) !== "Prüfung eintragen") f.push(`Titel „${await titel(p)}“`);
  let e = await klick(p, "#pickFail"); if (e) return f.concat(e);
  e = await klick(p, '#prWrap .pr-chip[data-pr="XY"]', 250); if (e) return f.concat(e);
  if (!(await da(p, '#prWrap .pr-chip.on[data-pr="XY"]'))) f.push("Prüfer-Chip nicht aktiv");
  e = await klick(p, "#faultAcc .facc-h", 300); if (e) return f.concat(e);
  e = await klick(p, "#faultAcc .f-chip", 250); if (e) return f.concat(e);
  if (!(await da(p, "#faultAcc .f-chip.on"))) f.push("Fehler-Chip nicht aktiv");
  const vor = await p.evaluate(() => DB.exams.length);
  e = await klick(p, "#saveExam", 500); if (e) return f.concat(e);
  const r = await p.evaluate((vor) => { const x = DB.exams.slice(vor); return x.map((y) => ({ sid: y.sid, res: y.result, pr: y.pruefer, n: (y.faults || []).length })); }, vor);
  if (r.length !== 1 || r[0].sid !== "s2" || r[0].res !== "fail" || r[0].pr !== "XY" || r[0].n !== 1) f.push(`neue Prüfungen ${JSON.stringify(r)}`);
  await setze(p, basisSzenario());
  return f;
});
await pruefe("Z1", "keine JS-Fehler im Hauptlauf (Klick-Prüfungen)", () => (haupt.jsFehler.length ? `${haupt.jsFehler.length} JS-Fehler, z. B. ${haupt.jsFehler[0]}` : null));
await haupt.ctx.close();
await browser.close();
server.close();

// ---------- Z2 Nichts kaputt: die anderen Tests ----------
if (process.env.SEITEN_SCHNELL) {
  await pruefe("Z2", "alle anderen scripts/*-test.mjs grün", () => ({ skip: "SEITEN_SCHNELL gesetzt" }));
} else {
  const dir = join(REPO, "scripts");
  const tests = (await readdir(dir)).filter((n) => n.endsWith("-test.mjs") && n !== "seiten-test.mjs").sort();
  // Die anderen Tests sollen nicht ihrerseits noch einmal alle Tests starten.
  const env = { ...process.env, KOMPASS_ROOT: ROOT, APP_ROOT: ROOT, HEUTE_SCHNELL: "1", AKTE_SCHNELL: "1", FAHR_SCHNELL: "1", SEITEN_SCHNELL: "1" };
  await pruefe("Z2", `alle anderen Tests grün (${tests.join(", ")})`, () => {
    const f = [];
    for (const n of tests) {
      const r = spawnSync(process.execPath, [join(dir, n)], { cwd: ROOT, env, encoding: "utf8", timeout: 900000 });
      if (r.status !== 0) f.push(`${n} Exit ${r.status}${r.signal ? " " + r.signal : ""}: ${((r.stdout || "") + (r.stderr || "")).split("\n").filter((z) => /FEHLER|PROBLEM|Error/.test(z)).slice(0, 2).join(" / ")}`);
    }
    return f;
  });
}

console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler${uebersprungen ? `, ${uebersprungen} übersprungen` : ""}.`);
process.exit(fehlerZahl ? 1 : 0);
