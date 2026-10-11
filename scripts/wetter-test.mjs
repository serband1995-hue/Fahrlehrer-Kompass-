// Wetter-Test (Umbau Schritt 5b): Wetter-Pille oben rechts auf „Heute“ mit eigenem SVG-Bild und leichter Animation.
// Geschrieben VOR dem Bau: gegen den alten Stand sind die neuen Punkte rot. Das ist gewollt.
// Punkte mit „bleibt“ prüfen, was nicht verloren gehen darf: die sind schon heute grün und müssen es bleiben.
// Jeder Prüfpunkt (W0 … W10) gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt etwas, wird der Punkt rot mit Grund, nichts stürzt ab.
// Zeilen „info“ sind nur Messwerte (Maße, Kontrast) für den Bericht, keine Prüfung.
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin).
// Nur erfundene Testdaten. Keine Datenbank und kein Wetterdienst: alle Fremdanfragen (auch api.openweathermap.org) sind blockiert,
// getSupa() ist eine Attrappe. Das Wetter kommt aus dem Zwischenspeicher „serband-weather-cache“ (so wie fetchWeather() ihn liest).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/wetter-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), WETTER_SCHNELL=1 (W10: die anderen Tests nicht mitlaufen lassen).
// W10 läuft auch nicht, wenn dieser Test selbst von einem anderen *-test.mjs gestartet wurde (SEITEN_/HEUTE_/AKTE_/FAHR_SCHNELL
// gesetzt oder der aufrufende Prozess ist ein *-test.mjs) – sonst liefen alle Tests mehrfach ineinander.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const REPO = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const ROOT = process.env.KOMPASS_ROOT || REPO;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
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
const info = (t) => console.log(`info  ${t}`);

// ---------- Feste Zeit und erfundene Testdaten ----------
const TAG = "2026-10-14";       // Mittwoch
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const STADT = "Erfundenstadt,DE";

// Wetter-Kategorien laut Vertrag: OpenWeatherMap-Icon → Klasse am svg.h2-wx
const KATEGORIEN = [
  { k: "wx-sonne", n: "Sonne", icons: ["01d"] },
  { k: "wx-mond", n: "Mond (Nacht klar)", icons: ["01n"] },
  { k: "wx-sonnewolke", n: "Sonne + Wolke", icons: ["02d"] },
  { k: "wx-wolke", n: "Wolke", icons: ["02n", "03d", "03n", "04d", "04n"] },
  { k: "wx-regen", n: "Regen", icons: ["09d", "09n", "10d", "10n"] },
  { k: "wx-gewitter", n: "Gewitter", icons: ["11d", "11n"] },
  { k: "wx-schnee", n: "Schnee", icons: ["13d", "13n"] },
  { k: "wx-nebel", n: "Nebel", icons: ["50d", "50n"] },
];
const ALLE_KLASSEN = KATEGORIEN.map((x) => x.k);
// Beschreibungen wie OpenWeatherMap sie auf Deutsch liefert (klein geschrieben)
const DESC = { "01": "klarer himmel", "02": "ein paar wolken", "03": "mäßig bewölkt", "04": "überwiegend bewölkt", "09": "nieselregen", "10": "leichter regen", "11": "gewitter", "13": "schnee", "50": "nebel" };
const wetterVon = (icon, temp = 14, desc) => ({ temp, desc: desc ?? DESC[icon.slice(0, 2)], icon });

function basisSzenario() {
  return {
    theme: "light",
    students: [
      { id: "w1", name: "Erfundene Wetterperson", telefon: "0170 1234567" },
      { id: "w2", name: "Erfundene Zweitperson", telefon: "0170 2222222" },
    ],
    lessons: [
      { id: "WL1", date: TAG, von: "10:00", bis: "11:30", sid: "w1" },   // läuft gerade (10:30)
      { id: "WL2", date: TAG, von: "13:30", bis: "15:00", sid: "w2" },
    ],
    // apiKey: Schlüssel gesetzt? wetter: Inhalt des Zwischenspeichers (null = kein Speicher), alt: Speicher älter als 30 min
    apiKey: true,
    wetter: wetterVon("01d"),
    alt: false,
    fsAgg: null,
  };
}

async function neueSeite(width, height, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE", reducedMotion: opt.reducedMotion || "no-preference" });
  const page = await ctx.newPage();
  const jsFehler = [], anfragen = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("request", (r) => anfragen.push(r.url()));
  await page.clock.setFixedTime(JETZT);
  // Nur die eigene Seite laden, keine Außenwelt (auch kein Wetterdienst): Fremdanfragen blockieren.
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  if (opt.reducedMotion) await page.emulateMedia({ reducedMotion: opt.reducedMotion });
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
  });
  return { ctx, page, jsFehler, anfragen };
}

// Daten in die App legen und „Heute“ neu zeichnen (oder mit route eine andere Ansicht).
async function setze(page, sz, route = "routeDashboard()") {
  await page.evaluate(({ sz, route, STADT }) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    try { _fsAgg = null; } catch (e) {}
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
    DB.students = sz.students.map((p) => {
      const s = { id: p.id, name: p.name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: p.telefon || "" };
      s.plan.sonder = { ueberland: [], autobahn: [], nacht: [] };
      s.todos = [];
      return s;
    });
    DB.lessons = sz.lessons.map((l) => ({ id: l.id, date: l.date, von: l.von, bis: l.bis, art: "fahrstunde", sid: l.sid, name: "", status: "geplant", note: "", fc: null }));
    DB.termine = []; DB.exams = []; DB.todos = [];
    try { _schuelerFristen = {}; _bueroNotizen = {}; } catch (e) {}
    localStorage.setItem("serband-backup-stamp", String(Date.now()));
    localStorage.removeItem("kompass-fahrstunde");
    localStorage.removeItem("serband-weather-forecast-cache");
    DB.weatherCfg = Object.assign({}, DB.weatherCfg, { apiKey: sz.apiKey ? "erfundener-test-schluessel" : "", city: STADT });
    if (sz.wetter) localStorage.setItem("serband-weather-cache", JSON.stringify({ ts: Date.now() - (sz.alt ? 35 * 60000 : 60000), city: STADT, data: sz.wetter }));
    else localStorage.removeItem("serband-weather-cache");
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    if (sz.fsAgg) _fsAgg = sz.fsAgg;
    (0, eval)(route);
  }, { sz, route, STADT });
  await page.waitForTimeout(450);
}

const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
const da = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const EMOJI = /\p{Extended_Pictographic}|☀|☁|⛅|⛈|❄|️/u;

// Alles, was die Pille ausmacht, auf einmal lesen.
const pille = (page) => page.evaluate(({ ALLE_KLASSEN }) => {
  const b = document.querySelector("#view .heute2 #h2Wetter, #view .heute2 .h2-wetter");
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const svg = b.querySelector("svg.h2-wx");
  const sr = svg ? svg.getBoundingClientRect() : null;
  const tEl = b.querySelector(".h2-wetter-t"), dEl = b.querySelector(".h2-wetter-d");
  const txt = (e) => (e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null);
  const cs = (e) => (e ? getComputedStyle(e) : null);
  const dS = cs(dEl), dFL = dEl ? getComputedStyle(dEl, "::first-letter") : null;
  return {
    text: txt(b), w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
    svg: svg ? { klassen: [...svg.classList], kat: [...svg.classList].filter((k) => ALLE_KLASSEN.includes(k)), w: sr.width, h: sr.height } : null,
    t: txt(tEl), tRect: tEl ? (({ top, bottom, left, right }) => ({ top, bottom, left, right }))(tEl.getBoundingClientRect()) : null,
    d: txt(dEl), dRect: dEl ? (({ top, bottom, left, right, height }) => ({ top, bottom, left, right, height }))(dEl.getBoundingClientRect()) : null,
    dStil: dS ? { ws: dS.whiteSpace, to: dS.textOverflow, ov: dS.overflowX, tt: dS.textTransform, ttFL: dFL ? dFL.textTransform : "", lh: parseFloat(dS.lineHeight) || parseFloat(dS.fontSize) * 1.3, sw: dEl.scrollWidth, cw: dEl.clientWidth } : null,
  };
}, { ALLE_KLASSEN });

// Animationen in der Pille lesen: CSS (computed style), Web Animations (getAnimations) und SVG-SMIL.
const animationen = (page) => page.evaluate(() => {
  const b = document.querySelector("#view .heute2 #h2Wetter, #view .heute2 .h2-wetter");
  if (!b) return null;
  const sek = (d) => { d = String(d).trim(); return d.endsWith("ms") ? parseFloat(d) / 1000 : parseFloat(d); };
  const name = (e) => (typeof e.className === "string" ? e.className : (e.className && e.className.baseVal) || "").trim().split(/\s+/)[0] || e.tagName.toLowerCase();
  const css = [];
  for (const e of [b, ...b.querySelectorAll("*")]) {
    const s = getComputedStyle(e);
    const namen = s.animationName.split(",").map((x) => x.trim()), dauer = s.animationDuration.split(",").map(sek), zust = s.animationPlayState.split(",").map((x) => x.trim());
    namen.forEach((n, i) => { if (n !== "none") css.push({ el: name(e), klassen: typeof e.className === "string" ? e.className : (e.className && e.className.baseVal) || "", anim: n, dauer: dauer[i % dauer.length], zustand: zust[i % zust.length] }); });
  }
  const laufend = (b.getAnimations ? b.getAnimations({ subtree: true }) : []).filter((a) => a.playState === "running").map((a) => {
    const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
    return { name: a.animationName || a.transitionProperty || a.id || "animation", dauer: (Number(t.duration) || 0) / 1000 };
  });
  const svg = b.querySelector("svg");
  const smil = svg ? svg.querySelectorAll("animate, animateTransform, animateMotion, set").length : 0;
  return { css, laufend, smil, smilPausiert: svg && svg.animationsPaused ? svg.animationsPaused() : true };
});
const hatKlasse = (a, k) => (" " + a.klassen + " ").includes(" " + k + " ");

// ---------- Hauptlauf bei 412 × 915 ----------
const haupt = await neueSeite(412, 915);
const { page } = haupt;
await setze(page, basisSzenario());

await pruefe("W0a", "Testaufbau: Uhr steht fest (todayISO() = 2026-10-14, 10:30)", async () => {
  const r = await page.evaluate(() => ({ iso: todayISO(), h: new Date().getHours(), m: new Date().getMinutes() }));
  if (r.iso !== TAG || r.h !== 10 || r.m !== 30) return `todayISO()=${r.iso}, Uhrzeit ${r.h}:${r.m}`;
});
await pruefe("W0b", "Testaufbau: fetchWeather() liefert die erfundenen Daten aus dem Zwischenspeicher, ohne Anfrage an den Wetterdienst", async () => {
  const vorher = haupt.anfragen.length;
  const w = await page.evaluate(() => fetchWeather());
  const f = [];
  if (!w || w.icon !== "01d" || w.temp !== 14) f.push(`fetchWeather() = ${JSON.stringify(w)}`);
  const ow = haupt.anfragen.slice(vorher).filter((u) => /openweathermap/i.test(u));
  if (ow.length) f.push(`${ow.length} Anfrage(n) an den Wetterdienst`);
  return f;
});
await pruefe("W0c", "bleibt: Heute (.heute2) mit Pille #h2Wetter, wenn Schlüssel + Daten da sind", async () => {
  const f = [];
  if ((await titel(page)) !== "Heute") f.push(`Titel „${await titel(page)}“`);
  if (!(await da(page, "#view .heute2"))) f.push("kein .heute2");
  if (!(await pille(page))) f.push("keine Pille #h2Wetter");
  return f;
});

// ----- W1 SVG statt Emoji, Kategorie-Klasse -----
for (const [i, kat] of KATEGORIEN.entries()) {
  await pruefe(`W1${"abcdefgh"[i]}`, `${kat.n} (${kat.icons.join(", ")}): svg.h2-wx mit Klasse „${kat.k}“ (und keiner anderen Kategorie)`, async () => {
    const f = [];
    for (const icon of kat.icons) {
      await setze(page, { ...basisSzenario(), wetter: wetterVon(icon) });
      const p = await pille(page);
      if (!p) { f.push(`${icon}: keine Pille`); continue; }
      if (!p.svg) { f.push(`${icon}: kein svg.h2-wx (Pille zeigt „${p.text}“)`); continue; }
      if (p.svg.kat.length !== 1 || p.svg.kat[0] !== kat.k) f.push(`${icon}: Klassen „${p.svg.klassen.join(" ")}“`);
    }
    return f;
  });
}
await pruefe("W1i", "kein Emoji-Zeichen mehr im Text der Pille (alle Icons)", async () => {
  const f = [];
  for (const kat of KATEGORIEN) for (const icon of kat.icons) {
    await setze(page, { ...basisSzenario(), wetter: wetterVon(icon) });
    const p = await pille(page);
    if (!p) { f.push(`${icon}: keine Pille`); continue; }
    if (EMOJI.test(p.text)) f.push(`${icon}: „${p.text}“`);
  }
  return f.length > 6 ? f.slice(0, 6).concat(`(+${f.length - 6} weitere)`) : f;
});

// ----- W2 leichte Animation -----
async function animBei(icon) { await setze(page, { ...basisSzenario(), wetter: wetterVon(icon) }); return { p: await pille(page), a: await animationen(page) }; }
await pruefe("W2a", "Sonne (01d): .wx-strahlen dreht sich (animation ≠ none, Dauer ≥ 10 s)", async () => {
  const { p, a } = await animBei("01d");
  if (!p) return "keine Pille";
  if (!p.svg) return "kein svg.h2-wx";
  const s = a.css.filter((x) => hatKlasse(x, "wx-strahlen"));
  if (!(await page.evaluate(() => !!document.querySelector("#h2Wetter svg.h2-wx .wx-strahlen")))) return ".wx-strahlen fehlt im SVG";
  if (!s.length) return ".wx-strahlen ohne Animation";
  if (s.some((x) => !(x.dauer >= 10))) return `Dauer ${s.map((x) => x.dauer + " s").join(", ")}`;
});
await pruefe("W2b", "Wolke (03d) und Sonne + Wolke (02d): .wx-wolkenteil bewegt sich (animation ≠ none, Dauer ≥ 3 s)", async () => {
  const f = [];
  for (const icon of ["03d", "02d"]) {
    const { p, a } = await animBei(icon);
    if (!p) { f.push(`${icon}: keine Pille`); continue; }
    if (!p.svg) { f.push(`${icon}: kein svg.h2-wx`); continue; }
    if (!(await page.evaluate(() => !!document.querySelector("#h2Wetter svg.h2-wx .wx-wolkenteil")))) { f.push(`${icon}: .wx-wolkenteil fehlt`); continue; }
    const s = a.css.filter((x) => hatKlasse(x, "wx-wolkenteil"));
    if (!s.length) f.push(`${icon}: .wx-wolkenteil ohne Animation`);
    else if (s.some((x) => !(x.dauer >= 3))) f.push(`${icon}: Dauer ${s.map((x) => x.dauer + " s").join(", ")}`);
  }
  return f;
});
await pruefe("W2c", "Regen (10d) und Schnee (13d): Tropfen/Flocken .wx-fall fallen (animation ≠ none)", async () => {
  const f = [];
  for (const icon of ["10d", "13d"]) {
    const { p, a } = await animBei(icon);
    if (!p) { f.push(`${icon}: keine Pille`); continue; }
    if (!p.svg) { f.push(`${icon}: kein svg.h2-wx`); continue; }
    const n = await page.evaluate(() => document.querySelectorAll("#h2Wetter svg.h2-wx .wx-fall").length);
    if (!n) { f.push(`${icon}: keine .wx-fall`); continue; }
    const s = a.css.filter((x) => hatKlasse(x, "wx-fall"));
    if (!s.length) f.push(`${icon}: .wx-fall ohne Animation`);
  }
  return f;
});
await pruefe("W2d", "nichts Hektisches: keine Animation in der Pille schneller als 1 s pro Durchlauf (alle Kategorien)", async () => {
  const f = [];
  for (const kat of KATEGORIEN) {
    const { p, a } = await animBei(kat.icons[0]);
    if (!p) { f.push(`${kat.icons[0]}: keine Pille`); continue; }
    if (!p.svg) { f.push(`${kat.icons[0]}: kein svg.h2-wx`); continue; }
    for (const x of a.css) if (!(x.dauer >= 1)) f.push(`${kat.icons[0]}: ${x.el} „${x.anim}“ ${x.dauer} s`);
    for (const x of a.laufend) if (x.dauer > 0 && x.dauer < 1) f.push(`${kat.icons[0]}: läuft ${x.name} ${x.dauer} s`);
  }
  return f;
});

// ----- W4 Text -----
await pruefe("W4a", "Temperatur: .h2-wetter-t zeigt „14°“", async () => {
  await setze(page, { ...basisSzenario(), wetter: wetterVon("10d", 14, "leichter regen") });
  const p = await pille(page);
  if (!p) return "keine Pille";
  if (p.t === null) return ".h2-wetter-t fehlt";
  if (p.t !== "14°") return `„${p.t}“`;
});
await pruefe("W4b", "Temperatur gerundet: 13.6 → „14°“, −0.4 → „0°“ (kein „-0°“)", async () => {
  const f = [];
  for (const [temp, soll] of [[13.6, "14°"], [-0.4, "0°"]]) {
    await setze(page, { ...basisSzenario(), wetter: wetterVon("10d", temp, "leichter regen") });
    const p = await pille(page);
    if (!p || p.t === null) { f.push(`${temp}: ${p ? ".h2-wetter-t fehlt" : "keine Pille"}`); continue; }
    if (p.t !== soll) f.push(`${temp} → „${p.t}“ statt „${soll}“`);
  }
  return f;
});
await pruefe("W4c", "Beschreibung: .h2-wetter-d „leichter regen“ → erster Buchstabe groß („Leichter regen“/„Leichter Regen“), unter der Temperatur", async () => {
  await setze(page, { ...basisSzenario(), wetter: wetterVon("10d", 14, "leichter regen") });
  const p = await pille(page);
  if (!p) return "keine Pille";
  if (p.d === null) return ".h2-wetter-d fehlt";
  const f = [];
  // sichtbare Schreibweise: Text plus text-transform (auch über ::first-letter)
  let sicht = p.d;
  if (p.dStil.tt === "uppercase") sicht = sicht.toUpperCase();
  else if (p.dStil.tt === "capitalize") sicht = sicht.replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  if (p.dStil.ttFL === "uppercase" || p.dStil.ttFL === "capitalize") sicht = sicht.charAt(0).toUpperCase() + sicht.slice(1);
  if (sicht.toLowerCase() !== "leichter regen") f.push(`Text „${p.d}“`);
  else if (!["Leichter regen", "Leichter Regen"].includes(sicht)) f.push(`sichtbar „${sicht}“`);
  if (p.tRect && p.dRect && p.dRect.top < p.tRect.bottom - 2) f.push("steht nicht unter der Temperatur");
  return f;
});
await pruefe("W4d", "lange Beschreibung bei 360 px: einzeilig, mit „…“ abgeschnitten (nowrap + ellipsis), Pille im Bild", async () => {
  const s = await neueSeite(360, 740);
  try {
    await setze(s.page, { ...basisSzenario(), wetter: wetterVon("04d", 14, "überwiegend bewölkt mit gelegentlichem leichtem nieselregen am nachmittag") });
    const p = await pille(s.page);
    if (!p) return "keine Pille";
    if (p.d === null) return ".h2-wetter-d fehlt";
    const f = [];
    if (p.dStil.ws !== "nowrap" && p.dStil.ws !== "pre") f.push(`white-space ${p.dStil.ws}`);
    if (p.dStil.to !== "ellipsis") f.push(`text-overflow ${p.dStil.to}`);
    if (p.dStil.ov === "visible") f.push("overflow visible (nichts wird abgeschnitten)");
    if (p.dRect.height > p.dStil.lh * 1.5) f.push(`zwei Zeilen hoch (${Math.round(p.dRect.height)} px)`);
    if (!(p.dStil.sw > p.dStil.cw)) f.push("Text wird nicht gekürzt (Pille wächst mit?)");
    if (p.right > 360 + 1) f.push(`Pille ragt ${Math.round(p.right - 360)} px über den Rand`);
    info(`W4d 360 px lange Beschreibung: Pille ${Math.round(p.w)}×${Math.round(p.h)} px, rechts ${Math.round(p.right)}`);
    return f;
  } finally { await s.ctx.close(); }
});

// ----- W7 Antippen → Wetter, Zurück → Heute -----
await pruefe("W7a", "Tipp auf die Pille öffnet „Wetter“ (routeWetter mit den Daten: Regen-Bühne .wx-cat-rain)", async () => {
  await setze(page, { ...basisSzenario(), wetter: wetterVon("10d", 14, "leichter regen") });
  const loc = page.locator("#view .heute2 #h2Wetter");
  if (!(await loc.count())) return "keine Pille";
  await loc.click(); await page.waitForTimeout(400);
  const f = [];
  const t = await titel(page);
  if (t !== "Wetter") f.push(`Titel „${t}“`);
  else if (!(await da(page, "#view .wx-stage.wx-cat-rain"))) f.push("Wetter-Ansicht ohne .wx-cat-rain");
  return f;
});
await pruefe("W7b", "Zurück aus „Wetter“ führt nach „Heute“ (Knopf in der Ansicht und Zurück-Pfeil oben)", async () => {
  const f = [];
  for (const weg of ["#backBtn", "navZurueck"]) {
    await setze(page, { ...basisSzenario(), wetter: wetterVon("10d") });
    const loc = page.locator("#view .heute2 #h2Wetter");
    if (!(await loc.count())) return "keine Pille";
    await loc.click(); await page.waitForTimeout(400);
    if ((await titel(page)) !== "Wetter") { f.push(`${weg}: „Wetter“ ging nicht auf`); continue; }
    if (weg === "#backBtn") {
      const b = page.locator("#view #backBtn");
      if (!(await b.count())) { f.push("#backBtn fehlt"); continue; }
      await b.click();
    } else {
      const sichtbar = await page.evaluate(() => { const b = document.getElementById("navBackBtn"); return !!b && !b.hidden && b.getBoundingClientRect().width > 0; });
      if (sichtbar) await page.locator("#navBackBtn").click(); else await page.evaluate(() => navZurueck());
    }
    await page.waitForTimeout(400);
    const t = await titel(page);
    if (t !== "Heute" || !(await da(page, "#view .heute2"))) f.push(`${weg}: danach „${t}“`);
  }
  return f;
});

// ----- W8 bleibt -----
await pruefe("W8a", "bleibt: ohne Schlüssel keine Pille und keine Anfrage an den Wetterdienst", async () => {
  const vorher = haupt.anfragen.length;
  await setze(page, { ...basisSzenario(), apiKey: false });
  await page.waitForTimeout(400);
  const f = [];
  if (!(await da(page, "#view .heute2"))) f.push("kein .heute2");
  if (await da(page, "#view #h2Wetter, #view .h2-wetter")) f.push("Pille trotzdem da");
  const ow = haupt.anfragen.slice(vorher).filter((u) => /openweathermap/i.test(u));
  if (ow.length) f.push(`${ow.length} Wetter-Anfrage(n)`);
  return f;
});
await pruefe("W8b", "bleibt: Schlüssel, aber keine Daten (kein bzw. veralteter Zwischenspeicher, Netz blockiert) → Pille verschwindet ohne JS-Fehler", async () => {
  const f = [];
  for (const [n, sz] of [["kein Speicher", { wetter: null }], ["Speicher 35 min alt", { alt: true }]]) {
    const vorher = haupt.jsFehler.length;
    await setze(page, { ...basisSzenario(), ...sz });
    await page.waitForTimeout(800);
    if (!(await da(page, "#view .heute2"))) f.push(`${n}: kein .heute2`);
    if (await da(page, "#view #h2Wetter, #view .h2-wetter")) f.push(`${n}: Pille noch da`);
    if (haupt.jsFehler.length > vorher) f.push(`${n}: JS-Fehler ${haupt.jsFehler[vorher]}`);
  }
  return f;
});
await pruefe("W8c", "bleibt: Einstellungen haben #weatherKeyInput und #weatherCityInput", async () => {
  await setze(page, basisSzenario(), "_settingsAccOpen='app'; routeSettings()");
  await page.waitForTimeout(300);
  const f = [];
  for (const id of ["weatherKeyInput", "weatherCityInput"]) if (!(await da(page, `#view #${id}`))) f.push(`#${id} fehlt`);
  return f;
});
await pruefe("W8d", "bleibt: routeWetter(w) zeigt „Wetter“ (.wx-screen, Temperatur) ohne JS-Fehler für alle Icons", async () => {
  const f = [];
  for (const kat of KATEGORIEN) for (const icon of kat.icons) {
    const vorher = haupt.jsFehler.length;
    await setze(page, basisSzenario(), `routeWetter(${JSON.stringify(wetterVon(icon, 14))})`);
    const t = await titel(page);
    const r = await page.evaluate(() => ({ screen: !!document.querySelector("#view .wx-screen"), temp: (document.querySelector("#view .wx-temp")?.textContent || "").trim() }));
    if (t !== "Wetter" || !r.screen) f.push(`${icon}: Titel „${t}“${r.screen ? "" : ", keine .wx-screen"}`);
    else if (!/14/.test(r.temp)) f.push(`${icon}: Temperatur „${r.temp}“`);
    if (haupt.jsFehler.length > vorher) f.push(`${icon}: JS-Fehler ${haupt.jsFehler[vorher]}`);
  }
  return f;
});

// ----- W9 Fahrstunden-Modus / Gesamtansicht: keine Pille -----
const keinWetter = (p) => p.evaluate(() => [...document.querySelectorAll("#view #h2Wetter, #view .h2-wetter, #view svg.h2-wx")].length);
await pruefe("W9a", "Fahrstunden-Modus (startFahrstunde): keine Wetter-Pille, kein svg.h2-wx", async () => {
  await setze(page, basisSzenario(), "startFahrstunde('WL1')");
  const f = [];
  const t = await titel(page);
  if (t === "Heute") f.push("Fahrstunden-Modus ging nicht auf (Titel „Heute“)");
  const n = await keinWetter(page);
  if (n) f.push(`${n} Wetter-Element(e) im Fahrstunden-Modus`);
  await page.evaluate(() => localStorage.removeItem("kompass-fahrstunde"));
  return f;
});
await pruefe("W9b", "Gesamtansicht (Fahrschule): Heute → Fahrschul-Start ohne Wetter-Pille", async () => {
  await setze(page, { ...basisSzenario(), fsAgg: { fahrschuleId: "x", fahrschule: { name: "Erfundene Fahrschule" }, lehrer: [], pakete: [], fahrzeuge: [] } });
  const f = [];
  const t = await titel(page);
  if (t !== "Start") f.push(`Titel „${t}“ statt „Start“`);
  const n = await keinWetter(page);
  if (n) f.push(`${n} Wetter-Element(e) in der Gesamtansicht`);
  await page.evaluate(() => { _fsAgg = null; });
  return f;
});
await pruefe("W9c", "keine JS-Fehler im Hauptlauf", () => (haupt.jsFehler.length ? `${haupt.jsFehler.length} JS-Fehler, z. B. ${haupt.jsFehler[0]}` : null));
await haupt.ctx.close();

// ----- W3 Weniger Bewegung -----
await pruefe("W3", "prefers-reduced-motion: reduce → keine laufende Animation in der Pille (Sonne, Wolke, Sonne+Wolke, Regen, Schnee, Gewitter)", async () => {
  const s = await neueSeite(412, 915, { reducedMotion: "reduce" });
  try {
    const mq = await s.page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!mq) return "Testaufbau: reducedMotion greift nicht";
    const f = [];
    for (const icon of ["01d", "03d", "02d", "10d", "13d", "11d"]) {
      await setze(s.page, { ...basisSzenario(), wetter: wetterVon(icon) });
      const p = await pille(s.page);
      if (!p) { f.push(`${icon}: keine Pille`); continue; }
      if (!p.svg) { f.push(`${icon}: kein svg.h2-wx`); continue; }
      const a = await animationen(s.page);
      for (const x of a.css) if (x.dauer > 0 && x.zustand !== "paused") f.push(`${icon}: ${x.el} „${x.anim}“ ${x.dauer} s`);
      for (const x of a.laufend) if (x.dauer > 0) f.push(`${icon}: läuft ${x.name}`);
      if (a.smil && !a.smilPausiert) f.push(`${icon}: SVG-Animation (SMIL) läuft`);
    }
    return f;
  } finally { await s.ctx.close(); }
});

// ----- W5/W6 Handy-Größen × hell/dunkel -----
const GROESSEN = [{ n: "360 hoch", w: 360, h: 740 }, { n: "412 hoch", w: 412, h: 915 }, { n: "915 quer", w: 915, h: 412 }];
const w5 = { ueberlapp: [], rand: [], wisch: [], hoehe: [], svg: [], fehler: [], kontrast: [], ohne: [] };
for (const g of GROESSEN) {
  for (const theme of ["light", "dark"]) {
    const s = await neueSeite(g.w, g.h);
    const name = `${g.n} ${theme === "dark" ? "dunkel" : "hell"}`;
    await setze(s.page, { ...basisSzenario(), theme, wetter: wetterVon("04d", 14, "überwiegend bewölkt") });
    const m = await s.page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const out = { W, wisch: document.documentElement.scrollWidth > W + 1, pille: null, ueber: [], rand: [], kontrast: {}, dunkel: !document.body.classList.contains("light"), datumAb: false };
      const b = document.querySelector("#view .heute2 #h2Wetter, #view .heute2 .h2-wetter");
      if (!b) return out;
      const rects = (sel) => { const e = document.querySelector(sel); if (!e) return []; const r = document.createRange(); r.selectNodeContents(e); return [...r.getClientRects()].filter((x) => x.width > 0); };
      const pr = b.getBoundingClientRect();
      const svg = b.querySelector("svg.h2-wx"), sr = svg && svg.getBoundingClientRect();
      out.pille = { w: pr.width, h: pr.height, left: pr.left, right: pr.right, svg: sr ? { w: sr.width, h: sr.height } : null };
      const schneidet = (a, c) => a.left < c.right - 0.5 && a.right > c.left + 0.5 && a.top < c.bottom - 0.5 && a.bottom > c.top + 0.5;
      for (const sel of [".heute2 .h2-titel", ".heute2 .h2-datum"]) for (const r of rects(sel)) if (schneidet(r, pr)) out.ueber.push(sel.replace(".heute2 ", ""));
      const dat = document.querySelector(".heute2 .h2-datum");
      if (dat) out.datumAb = dat.scrollWidth > dat.clientWidth + 1;
      const tit = document.querySelector(".heute2 .h2-titel");
      out.kopf = { titel: tit ? Math.round(tit.getBoundingClientRect().right) : null, datum: dat ? Math.round(Math.max(...rects(".heute2 .h2-datum").map((r) => r.right), 0)) : null, datumZeilen: rects(".heute2 .h2-datum").length };
      for (const e of [b, ...b.querySelectorAll("*"), document.querySelector(".heute2 .h2-titel"), dat]) {
        if (!e) continue; const r = e.getBoundingClientRect(); if (!r.width) continue;
        if (r.right > W + 1) out.rand.push((typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : e.tagName.toLowerCase()) + " +" + Math.round(r.right - W));
      }
      // Kontrast (WCAG): Textfarbe gegen den zusammengesetzten Hintergrund
      const rgb = (c) => { const m = (c || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const hg = (el) => { const eb = []; while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c && c.a > 0) { eb.push(c); if (c.a >= 1) break; } el = el.parentElement; } let f = { r: 255, g: 255, b: 255 }; if (!eb.length || eb[eb.length - 1].a < 1) f = rgb(getComputedStyle(document.body).backgroundColor) || f; for (const c of eb.reverse()) f = { r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a) }; return f; };
      const lum = (c) => { const k = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * k(c.r) + 0.7152 * k(c.g) + 0.0722 * k(c.b); };
      const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      for (const k of ["t", "d"]) {
        const e = b.querySelector(".h2-wetter-" + k);
        if (!e) { out.kontrast[k] = null; continue; }
        const bg = hg(e), c = rgb(getComputedStyle(e).color), o = parseFloat(getComputedStyle(e).opacity) || 1;
        const a = (c ? c.a : 1) * o;
        const cc = { r: c.r * a + bg.r * (1 - a), g: c.g * a + bg.g * (1 - a), b: c.b * a + bg.b * (1 - a) };
        out.kontrast[k] = ratio(cc, bg);
      }
      return out;
    });
    if (!m.pille) { w5.ohne.push(name); await s.ctx.close(); continue; }
    info(`W5 ${name}: Pille ${Math.round(m.pille.w)}×${Math.round(m.pille.h)} px (links ${Math.round(m.pille.left)}, rechts ${Math.round(m.pille.right)} von ${m.W}), SVG ${m.pille.svg ? `${Math.round(m.pille.svg.w)}×${Math.round(m.pille.svg.h)}` : "–"}, Titel bis ${m.kopf.titel}, Datum bis ${m.kopf.datum} (${m.kopf.datumZeilen} Zeile(n)${m.datumAb ? ", abgeschnitten" : ""}), Kontrast Temp ${m.kontrast.t ? m.kontrast.t.toFixed(1) : "–"}:1 / Beschr. ${m.kontrast.d ? m.kontrast.d.toFixed(1) : "–"}:1`);
    if (theme === "dark" && !m.dunkel) w5.kontrast.push(`${name}: Dunkel-Modus greift nicht`);
    if (m.ueber.length) w5.ueberlapp.push(`${name}: Pille überdeckt ${[...new Set(m.ueber)].join(", ")}`);
    if (m.rand.length) w5.rand.push(`${name}: ${m.rand.slice(0, 3).join(", ")}`);
    if (m.wisch) w5.wisch.push(`${name}: seitlich wischbar`);
    if (m.pille.h < 44) w5.hoehe.push(`${name}: ${Math.round(m.pille.h)} px`);
    if (!m.pille.svg) w5.svg.push(`${name}: kein svg.h2-wx`);
    else if (!(m.pille.svg.w >= 32 && m.pille.svg.w <= 44 && m.pille.svg.h >= 32 && m.pille.svg.h <= 44)) w5.svg.push(`${name}: ${Math.round(m.pille.svg.w)}×${Math.round(m.pille.svg.h)} px`);
    for (const [k, n] of [["t", "Temperatur"], ["d", "Beschreibung"]]) {
      if (m.kontrast[k] === null) w5.kontrast.push(`${name}: ${n} (.h2-wetter-${k}) fehlt`);
      else if (m.kontrast[k] < 4.5) w5.kontrast.push(`${name}: ${n} ${m.kontrast[k].toFixed(1)}:1`);
    }
    if (s.jsFehler.length) w5.fehler.push(`${name}: ${s.jsFehler[0]}`);
    await s.ctx.close();
  }
}
const mitOhne = (l) => (w5.ohne.length ? [`keine Pille bei ${w5.ohne.join(", ")}`].concat(l) : l);
await pruefe("W5a", "Kopf 360/412 hoch, 915 quer, hell+dunkel: Pille überlappt Titel „Heute“ und Datum nicht", () => mitOhne(w5.ueberlapp));
await pruefe("W5b", "Kopf: nichts über den rechten Rand, Seite nicht seitlich wischbar", () => mitOhne(w5.rand.concat(w5.wisch)));
await pruefe("W5c", "Pille ≥ 44 px hoch", () => mitOhne(w5.hoehe));
await pruefe("W5d", "SVG in der Pille 32–44 px groß (Breite und Höhe)", () => mitOhne(w5.svg));
await pruefe("W5e", "keine JS-Fehler in den Handy-Größen", () => w5.fehler);
await pruefe("W6", "Kontrast Temperatur und Beschreibung ≥ 4.5:1, hell und dunkel", () => mitOhne(w5.kontrast));

await browser.close();
server.close();

// ---------- W10 Nichts kaputt: die anderen Tests ----------
// Eltern-Prozess ist selbst „node …/xyz-test.mjs“ (nicht die Shell, in der man den Test von Hand startet)?
const elternTest = (() => {
  try {
    const a = readFileSync(`/proc/${process.ppid}/cmdline`, "utf8").split("\0").filter(Boolean);
    return /(^|\/)node(js)?$/.test(a[0] || "") && a.slice(1).some((x) => /-test\.mjs$/.test(x));
  } catch (e) { return false; }
})();
const verschachtelt = ["SEITEN_SCHNELL", "HEUTE_SCHNELL", "AKTE_SCHNELL", "FAHR_SCHNELL"].filter((v) => process.env[v]);
if (process.env.WETTER_SCHNELL) {
  await pruefe("W10", "alle anderen scripts/*-test.mjs grün", () => ({ skip: "WETTER_SCHNELL gesetzt" }));
} else if (elternTest || verschachtelt.length) {
  await pruefe("W10", "alle anderen scripts/*-test.mjs grün", () => ({ skip: `läuft selbst unter einem anderen Test (${elternTest ? "Eltern-Prozess ist ein *-test.mjs" : verschachtelt.join(", ") + " gesetzt"})` }));
} else {
  const dir = join(REPO, "scripts");
  const tests = (await readdir(dir)).filter((n) => n.endsWith("-test.mjs") && n !== "wetter-test.mjs").sort();
  // Die anderen Tests sollen nicht ihrerseits noch einmal alle Tests (oder diesen hier) starten.
  const env = { ...process.env, KOMPASS_ROOT: ROOT, APP_ROOT: ROOT, HEUTE_SCHNELL: "1", AKTE_SCHNELL: "1", FAHR_SCHNELL: "1", SEITEN_SCHNELL: "1", WETTER_SCHNELL: "1" };
  await pruefe("W10", `alle anderen Tests grün (${tests.join(", ")})`, () => {
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
