// Wetter-Test 2 (Umbau Schritt 6a): Wetter-Seite schöner und flüssiger.
// Geschrieben VOR dem Bau: gegen den alten Stand sind die neuen Punkte rot. Das ist gewollt.
// Punkte mit „bleibt“ prüfen, was nicht verloren gehen darf: die sind schon heute grün und müssen es bleiben.
// Jeder Prüfpunkt (V0 … V10) gibt eine Zeile „ok“ oder „FEHLER“ aus. Fehlt etwas, wird der Punkt rot mit Grund, nichts stürzt ab.
// Zeilen „info“ sind nur Messwerte (Maße, Kontrast, Animationen) für den Bericht, keine Prüfung.
// Die Uhr steht fest auf Mittwoch, 14.10.2026, 10:30 Uhr (Europe/Berlin).
// Nur erfundene Testdaten. Keine Datenbank und kein Wetterdienst: alle Fremdanfragen (auch api.openweathermap.org) sind blockiert,
// getSupa() ist eine Attrappe. Das Wetter kommt aus den Zwischenspeichern „serband-weather-cache“ ({ts,city,data:{temp,desc,icon}})
// und „serband-weather-forecast-cache“ ({ts,city,data:[{date,min,max,icon}]}); city ist immer DB.weatherCfg.city.
// Die Vorschau speichert die App mit zweistelligem Icon-Code („10“, ohne d/n) – so legt auch dieser Test sie ab.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/wetter2-test.mjs
// Optional: KOMPASS_ROOT=/pfad/zur/kopie (anderer Stand), WETTER2_SCHNELL=1 (V10: die anderen Tests nicht mitlaufen lassen).
// V10 läuft auch nicht, wenn dieser Test selbst von einem anderen *-test.mjs gestartet wurde (SEITEN_/HEUTE_/AKTE_/FAHR_/WETTER_SCHNELL
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
  if (Array.isArray(r) && r.length > 8) r = r.slice(0, 8).concat(`(+${r.length - 8} weitere)`);
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const info = (t) => console.log(`info  ${t}`);

// ---------- Feste Zeit und erfundene Testdaten ----------
const TAG = "2026-10-14";       // Mittwoch
const JETZT = new Date("2026-10-14T10:30:00+02:00");
const STADT = "Erfundenstadt,DE";

// Alle Icon-Codes aus dem Vertrag (V9) und die erwartete Bühnen-Kategorie
const ICONS = ["01d", "01n", "02d", "02n", "03d", "04d", "09d", "10d", "11d", "13d", "50d"];
// Bildchen-Klassen am svg.h2-wx (wie auf Heute, Schritt 5b), Schlüssel = die ersten zwei Zeichen des Icon-Codes (Tag)
const BILD = { "01": "wx-sonne", "02": "wx-sonnewolke", "03": "wx-wolke", "04": "wx-wolke", "09": "wx-regen", "10": "wx-regen", "11": "wx-gewitter", "13": "wx-schnee", "50": "wx-nebel" };
const ALLE_BILDER = ["wx-sonne", "wx-mond", "wx-sonnewolke", "wx-wolke", "wx-regen", "wx-gewitter", "wx-schnee", "wx-nebel"];
const DESC = { "01": "klarer himmel", "02": "ein paar wolken", "03": "mäßig bewölkt", "04": "überwiegend bewölkt", "09": "nieselregen", "10": "leichter regen", "11": "gewitter", "13": "schnee", "50": "nebel" };
const wetterVon = (icon, temp = 14, desc) => ({ temp, desc: desc ?? DESC[icon.slice(0, 2)], icon });
// 5 Vorschau-Tage (ab morgen), Icons zweistellig wie in fetchWeatherForecast()
const vorschauVon = (icons) => icons.map((ic, i) => ({ date: `2026-10-${15 + i}`, min: 6 + i, max: 13 + i, icon: ic }));
const VORSCHAU = vorschauVon(["01", "02", "10", "13", "50"]);

function basisSzenario() {
  return {
    theme: "light",
    students: [
      { id: "w1", name: "Erfundene Wetterperson", telefon: "0170 1234567" },
      { id: "w2", name: "Erfundene Zweitperson", telefon: "0170 2222222" },
    ],
    lessons: [
      { id: "WL1", date: TAG, von: "10:00", bis: "11:30", sid: "w1" },
      { id: "WL2", date: TAG, von: "13:30", bis: "15:00", sid: "w2" },
    ],
    apiKey: true,
    wetter: wetterVon("01d"),
    vorschau: VORSCHAU, // null = kein Vorschau-Speicher
  };
}
const wetterSeite = (w) => `routeWetter(${JSON.stringify(w)})`;

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

// Daten in die App legen und „Heute“ neu zeichnen (oder mit route eine andere Ansicht, z. B. die Wetter-Seite).
async function setze(page, sz, route = "routeDashboard()") {
  await page.evaluate(({ sz, route, STADT }) => {
    try { closeSheet(); } catch (e) {}
    try { closeDrawer(); } catch (e) {}
    document.getElementById("bueroNotizPopup")?.remove();
    document.getElementById("v8kopie")?.remove();
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
    DB.weatherCfg = Object.assign({}, DB.weatherCfg, { apiKey: sz.apiKey ? "erfundener-test-schluessel" : "", city: STADT });
    const stadt = DB.weatherCfg.city;
    if (sz.wetter) localStorage.setItem("serband-weather-cache", JSON.stringify({ ts: Date.now() - 60000, city: stadt, data: sz.wetter }));
    else localStorage.removeItem("serband-weather-cache");
    if (sz.vorschau) localStorage.setItem("serband-weather-forecast-cache", JSON.stringify({ ts: Date.now() - 60000, city: stadt, data: sz.vorschau }));
    else localStorage.removeItem("serband-weather-forecast-cache");
    localStorage.setItem(THEME_KEY, sz.theme || "light"); applyTheme();
    (0, eval)(route);
  }, { sz, route, STADT });
  await page.waitForTimeout(450);
}

const titel = (page) => page.evaluate(() => (document.getElementById("tbTitle")?.textContent || "").trim());
const da = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const EMOJI = /\p{Extended_Pictographic}|☀|☁|⛅|⛈|❄|️/u;

// Bühne der Wetter-Seite lesen: Zählungen, Maße, Texte.
const buehne = (page) => page.evaluate(() => {
  const st = document.querySelector("#view .wx-stage");
  if (!st) return null;
  const r = st.getBoundingClientRect(), cs = getComputedStyle(st);
  const n = (s) => st.querySelectorAll(s).length;
  const glow = st.querySelector(".wx2-sonne .wx2-glow");
  const gs = glow ? getComputedStyle(glow) : null;
  const dauernVon = (e) => {
    // Animationen am Element, darin und an den Eltern bis zur Bühne (eine Ebene kann auch ein Wrapper sein)
    let l = e.getAnimations ? e.getAnimations({ subtree: true }) : [];
    for (let p = e.parentElement; p && p !== st.parentElement; p = p.parentElement) l = l.concat(p.getAnimations ? p.getAnimations() : []);
    return l.filter((a) => a.constructor.name !== "CSSTransition").map((a) => Math.round((Number(a.effect.getComputedTiming().duration) || 0) / 100) / 10).filter((d) => d > 0);
  };
  const wolken = [...st.querySelectorAll(".wx2-wolke")];
  const tropfen = [...st.querySelectorAll(".wx2-tropfen")];
  const flocken = [...st.querySelectorAll(".wx2-flocke")];
  return {
    klassen: [...st.classList], w: r.width, h: r.height,
    radius: Math.min(...["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"].map((k) => parseFloat(cs[k]) || 0)),
    text: st.textContent || "",
    alt: { ray: n(".wx-ray"), cloud: n(".wx-cloud"), drop: n(".wx-drop"), flake: n(".wx-flake") },
    sonne: n(".wx2-sonne"), glow: !!glow, glowBild: gs ? gs.backgroundImage : "",
    wolke: wolken.length, wolkeOhneSvg: wolken.filter((e) => e.tagName.toLowerCase() !== "svg" && !e.querySelector("svg")).length,
    wolkenDauern: wolken.map((e) => Math.max(0, ...dauernVon(e))),
    tropfen: tropfen.length, tropfenDauern: tropfen.map((e) => Math.max(0, ...dauernVon(e))),
    blitz: n(".wx2-blitz"), flocke: flocken.length, flockeMitText: flocken.filter((e) => (e.textContent || "").trim()).length,
    nebel: n(".wx2-nebel"), mond: n(".wx2-mond"), sterne: n(".wx-star"),
  };
});

// Alle laufenden Animationen unter sel lesen: Name, Dauer, Zustand, welche Eigenschaften die Keyframes ändern.
// Die Keyframes kommen aus der CSSKeyframesRule, die für den animation-name gilt (gleicher Name mehrfach: die letzte gewinnt, wie im Browser).
const animListe = (page, sel) => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const regeln = {}, anzahl = {};
  const sammle = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSKeyframesRule) { regeln[r.name] = r; anzahl[r.name] = (anzahl[r.name] || 0) + 1; }
      else if (r instanceof CSSMediaRule) { if (matchMedia(r.conditionText || r.media.mediaText).matches) sammle(r.cssRules); }
      else if (typeof CSSSupportsRule !== "undefined" && r instanceof CSSSupportsRule) sammle(r.cssRules);
    }
  };
  for (const sh of document.styleSheets) { try { sammle(sh.cssRules); } catch (e) {} }
  const props = (name) => {
    const r = regeln[name]; if (!r) return null;
    const s = new Set();
    for (const k of r.cssRules) for (let i = 0; i < k.style.length; i++) s.add(k.style[i]);
    return [...s];
  };
  const kname = (e) => { if (!e) return "?"; const c = typeof e.className === "string" ? e.className : (e.className && e.className.baseVal) || ""; return (c.trim().split(/\s+/)[0] && "." + c.trim().split(/\s+/)[0]) || e.tagName.toLowerCase(); };
  const ziele = new Set();
  const liste = (root.getAnimations ? root.getAnimations({ subtree: true }) : []).filter((a) => a.constructor.name !== "CSSTransition").map((a) => {
    const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : {};
    const ziel = a.effect && a.effect.target;
    if (ziel) ziele.add(ziel);
    let p = a.animationName ? props(a.animationName) : null, quelle = "keyframes";
    if (!p) {
      quelle = "getKeyframes";
      try { p = [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !["offset", "computedOffset", "easing", "composite"].includes(k)))]; } catch (e) { p = []; }
    }
    return { el: kname(ziel), name: a.animationName || a.id || "js", dauer: (Number(t.duration) || 0) / 1000, zustand: a.playState, props: p, quelle, doppelt: a.animationName ? anzahl[a.animationName] || 0 : 0 };
  });
  const smil = [...root.querySelectorAll("animate, animateTransform, animateMotion, set")].map((e) => (e.tagName === "animateTransform" ? "transform" : e.tagName === "animateMotion" ? "motion" : e.getAttribute("attributeName") || "?"));
  return { liste, ziele: ziele.size, smil };
}, sel);
// Erlaubt (Vertrag V4): nur transform/opacity; translate/rotate/scale sind die Einzel-Eigenschaften von transform; timing-function ist keine Änderung.
const ERLAUBT = new Set(["transform", "opacity", "translate", "rotate", "scale", "animation-timing-function", "animationTimingFunction"]);
const verboten = (a) => (a.props || []).filter((p) => !ERLAUBT.has(p));

// Pille auf „Heute“ (aus 5b)
const pille = (page) => page.evaluate(({ ALLE_BILDER }) => {
  const b = document.querySelector("#view .heute2 #h2Wetter, #view .heute2 .h2-wetter");
  if (!b) return null;
  const svg = b.querySelector("svg.h2-wx");
  const txt = (e) => (e ? (e.textContent || "").replace(/\s+/g, " ").trim() : null);
  let grad = [], benutzt = 0;
  if (svg) {
    grad = [...svg.querySelectorAll("radialGradient, linearGradient")].map((g) => g.id || "");
    for (const e of svg.querySelectorAll("*")) for (const a of ["fill", "stroke"]) { const v = (e.getAttribute(a) || "") + " " + (e.style ? e.style[a] || "" : ""); if (/url\(/.test(v) && grad.some((id) => id && v.includes("#" + id))) benutzt++; }
  }
  return {
    text: txt(b), html: b.outerHTML,
    svg: svg ? { klassen: [...svg.classList], kat: [...svg.classList].filter((k) => ALLE_BILDER.includes(k)), grad, benutzt } : null,
    t: txt(b.querySelector(".h2-wetter-t")), d: txt(b.querySelector(".h2-wetter-d")),
  };
}, { ALLE_BILDER });

// ---------- Hauptlauf bei 412 × 915 ----------
const haupt = await neueSeite(412, 915);
const { page } = haupt;
await setze(page, basisSzenario());

await pruefe("V0a", "Testaufbau: Uhr steht fest (todayISO() = 2026-10-14, 10:30)", async () => {
  const r = await page.evaluate(() => ({ iso: todayISO(), h: new Date().getHours(), m: new Date().getMinutes() }));
  if (r.iso !== TAG || r.h !== 10 || r.m !== 30) return `todayISO()=${r.iso}, Uhrzeit ${r.h}:${r.m}`;
});
await pruefe("V0b", "Testaufbau: fetchWeather() und fetchWeatherForecast() liefern die erfundenen Daten aus dem Speicher, ohne Anfrage an den Wetterdienst", async () => {
  const vorher = haupt.anfragen.length;
  const r = await page.evaluate(async () => ({ w: await fetchWeather(), v: await fetchWeatherForecast() }));
  const f = [];
  if (!r.w || r.w.icon !== "01d" || r.w.temp !== 14) f.push(`fetchWeather() = ${JSON.stringify(r.w)}`);
  if (!Array.isArray(r.v) || r.v.length !== 5 || r.v[2].icon !== "10") f.push(`fetchWeatherForecast() = ${JSON.stringify(r.v)}`);
  const ow = haupt.anfragen.slice(vorher).filter((u) => /openweathermap/i.test(u));
  if (ow.length) f.push(`${ow.length} Anfrage(n) an den Wetterdienst`);
  return f;
});

// ----- V1 neuer Look -----
await pruefe("V1a", "Wetter-Seite gehört zum neuen Look: #view hat data-seite2=\"routeWetter\"", async () => {
  await setze(page, basisSzenario(), wetterSeite(wetterVon("10d")));
  const r = await page.evaluate(() => document.getElementById("view")?.getAttribute("data-seite2"));
  if ((await titel(page)) !== "Wetter") return `Titel „${await titel(page)}“`;
  if (r !== "routeWetter") return `data-seite2 = ${r === null ? "fehlt" : `„${r}“`}`;
});
const schriften = () => page.evaluate(() => {
  const erst = (s) => { const e = document.querySelector(s); if (!e) return null; return getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim(); };
  return { temp: erst("#view .wx-temp"), desc: erst("#view .wx-desc"), city: erst("#view .wx-city") };
});
await pruefe("V1b", "Schriften: .wx-temp in Playfair Display, .wx-desc und .wx-city in Manrope", async () => {
  await setze(page, basisSzenario(), wetterSeite(wetterVon("10d")));
  const s = await schriften();
  info(`V1b heute: Temperatur „${s.temp}“, Beschreibung „${s.desc}“, Stadt „${s.city}“`);
  const f = [];
  if (s.temp !== "Playfair Display") f.push(`.wx-temp „${s.temp}“`);
  if (s.desc !== "Manrope") f.push(`.wx-desc „${s.desc}“`);
  if (s.city !== "Manrope") f.push(`.wx-city „${s.city}“`);
  return f;
});
await pruefe("V1c", "Beschreibung mit großem Anfangsbuchstaben: „leichter regen“ wird als „Leichter regen“ angezeigt (nicht jedes Wort groß)", async () => {
  await setze(page, basisSzenario(), wetterSeite(wetterVon("10d", 14, "leichter regen")));
  const r = await page.evaluate(() => {
    const e = document.querySelector("#view .wx-desc"); if (!e) return null;
    const t = (e.textContent || "").trim(), tt = getComputedStyle(e).textTransform, fl = getComputedStyle(e, "::first-letter").textTransform;
    let s = tt === "capitalize" ? t.replace(/(^|\s)(\S)/g, (_m, a, b) => a + b.toUpperCase()) : tt === "uppercase" ? t.toUpperCase() : tt === "lowercase" ? t.toLowerCase() : t;
    if (fl === "uppercase") s = s.charAt(0).toUpperCase() + s.slice(1);
    return { roh: t, tt, sichtbar: s };
  });
  if (!r) return ".wx-desc fehlt";
  if (r.sichtbar !== "Leichter regen") return `sichtbar „${r.sichtbar}“ (Text „${r.roh}“, text-transform ${r.tt})`;
});
// V1d (Kontrast) steht nach der Größen-Schleife (V6), weil dort hell/dunkel gemessen wird.

// ----- V2 keine Emojis, Vorschau mit svg.h2-wx -----
await pruefe("V2a", "keine Emojis auf der Wetter-Seite (Bühne und Vorschau), alle Icons", async () => {
  const f = [];
  for (const icon of ICONS) {
    await setze(page, basisSzenario(), wetterSeite(wetterVon(icon)));
    const r = await page.evaluate(() => ({ b: document.querySelector("#view .wx-stage")?.textContent || "", v: document.querySelector("#view #wxForecast")?.textContent || "" }));
    const fund = [];
    if (EMOJI.test(r.b)) fund.push(`Bühne „${[...r.b.matchAll(/\p{Extended_Pictographic}|❄/gu)].map((m) => m[0]).slice(0, 3).join("")}“`);
    if (EMOJI.test(r.v)) fund.push(`Vorschau „${[...r.v.matchAll(/\p{Extended_Pictographic}/gu)].map((m) => m[0]).slice(0, 5).join("")}“`);
    if (fund.length) f.push(`${icon}: ${fund.join(", ")}`);
  }
  return f;
});
const vorschauTage = () => page.evaluate(({ ALLE_BILDER }) => [...document.querySelectorAll("#view #wxForecast .wx-fc-day")].map((d) => {
  const s = [...d.querySelectorAll("svg.h2-wx")];
  return { n: s.length, kat: s[0] ? [...s[0].classList].filter((k) => ALLE_BILDER.includes(k)) : [], text: (d.textContent || "").replace(/\s+/g, " ").trim() };
}), { ALLE_BILDER });
await pruefe("V2b", "Vorschau: je Tag genau ein svg.h2-wx mit Kategorie-Klasse passend zum Icon-Code (alle Codes 01–50)", async () => {
  const f = [];
  for (const satz of [["01", "02", "10", "13", "50"], ["03", "04", "09", "11", "01"]]) {
    await setze(page, { ...basisSzenario(), vorschau: vorschauVon(satz) }, wetterSeite(wetterVon("03d")));
    const tage = await vorschauTage();
    if (tage.length !== 5) { f.push(`${satz.join("/")}: ${tage.length} Tage statt 5`); continue; }
    tage.forEach((t, i) => {
      const soll = BILD[satz[i]];
      if (t.n !== 1) f.push(`Tag ${i + 1} (${satz[i]}): ${t.n} svg.h2-wx`);
      else if (t.kat.length !== 1 || t.kat[0] !== soll) f.push(`Tag ${i + 1} (${satz[i]}): Klasse „${t.kat.join(" ")}“ statt „${soll}“`);
    });
  }
  return f;
});

// ----- V3 neue Bühnen-Elemente -----
const B = {};
for (const icon of ["01d", "01n", "02d", "03d", "04d", "09d", "10d", "11d", "13d", "50d"]) {
  await setze(page, basisSzenario(), wetterSeite(wetterVon(icon)));
  B[icon] = await buehne(page);
}
info(`heutige Bühne: ${["01d", "01n", "03d", "10d", "11d", "13d", "50d"].map((i) => `${i} ${B[i] ? `.${B[i].klassen.join(".")} ray ${B[i].alt.ray}/cloud ${B[i].alt.cloud}/drop ${B[i].alt.drop}/flake ${B[i].alt.flake}/star ${B[i].sterne}` : "keine Bühne"}`).join(" | ")}`);
const ohneB = (icons) => icons.filter((i) => !B[i]).map((i) => `${i}: keine .wx-stage`);
await pruefe("V3a", "alte Deko ist weg: keine .wx-ray, .wx-cloud, .wx-drop, .wx-flake (alle Kategorien)", () => {
  const f = ohneB(Object.keys(B));
  for (const [i, b] of Object.entries(B)) if (b) { const a = Object.entries(b.alt).filter(([, n]) => n).map(([k, n]) => `${n}× .wx-${k}`); if (a.length) f.push(`${i}: ${a.join(", ")}`); }
  return f;
});
await pruefe("V3b", "Sonne (01d): .wx2-sonne mit .wx2-glow (radial-gradient), keine Strich-Strahlen", () => {
  const b = B["01d"]; if (!b) return "keine .wx-stage";
  const f = [];
  if (!b.sonne) f.push("keine .wx2-sonne");
  else if (!b.glow) f.push("keine .wx2-glow in .wx2-sonne");
  else if (!/radial-gradient/.test(b.glowBild)) f.push(`.wx2-glow ohne radial-gradient („${b.glowBild.slice(0, 60)}“)`);
  if (b.alt.ray) f.push(`${b.alt.ray}× .wx-ray`);
  return f;
});
await pruefe("V3c", "Wolken (03d, 04d, 02d): ≥ 2 .wx2-wolke als SVG, mit ≥ 2 verschiedenen Animationsdauern (Tiefe)", () => {
  const f = ohneB(["03d", "04d", "02d"]);
  for (const i of ["03d", "04d", "02d"]) {
    const b = B[i]; if (!b) continue;
    if (b.wolke < 2) { f.push(`${i}: ${b.wolke} .wx2-wolke`); continue; }
    if (b.wolkeOhneSvg) f.push(`${i}: ${b.wolkeOhneSvg} Wolke(n) ohne SVG`);
    const d = new Set(b.wolkenDauern.filter((x) => x > 0));
    if (d.size < 2) f.push(`${i}: Dauern ${b.wolkenDauern.join("/")} s`);
  }
  return f;
});
await pruefe("V3d", "Regen (10d, 09d): ≥ 2 .wx2-wolke, ≥ 24 .wx2-tropfen mit ≥ 3 verschiedenen Animationsdauern", () => {
  const f = ohneB(["10d", "09d"]);
  for (const i of ["10d", "09d"]) {
    const b = B[i]; if (!b) continue;
    if (b.wolke < 2) f.push(`${i}: ${b.wolke} .wx2-wolke`);
    if (b.tropfen < 24) f.push(`${i}: ${b.tropfen} .wx2-tropfen`);
    else { const d = new Set(b.tropfenDauern.filter((x) => x > 0)); if (d.size < 3) f.push(`${i}: nur ${d.size} Tropfen-Dauer(n) (${[...d].join("/")} s)`); }
  }
  return f;
});
await pruefe("V3e", "Gewitter (11d): wie Regen plus .wx2-blitz", () => {
  const b = B["11d"]; if (!b) return "keine .wx-stage";
  const f = [];
  if (b.wolke < 2) f.push(`${b.wolke} .wx2-wolke`);
  if (b.tropfen < 24) f.push(`${b.tropfen} .wx2-tropfen`);
  else { const d = new Set(b.tropfenDauern.filter((x) => x > 0)); if (d.size < 3) f.push(`nur ${d.size} Tropfen-Dauer(n)`); }
  if (!b.blitz) f.push("kein .wx2-blitz");
  return f;
});
await pruefe("V3f", "Schnee (13d): ≥ 18 .wx2-flocke, ohne Text/Emoji darin", () => {
  const b = B["13d"]; if (!b) return "keine .wx-stage";
  const f = [];
  if (b.flocke < 18) f.push(`${b.flocke} .wx2-flocke`);
  if (b.flockeMitText) f.push(`${b.flockeMitText} Flocke(n) mit Text`);
  return f;
});
await pruefe("V3g", "Nebel (50d): ≥ 3 .wx2-nebel", () => {
  const b = B["50d"]; if (!b) return "keine .wx-stage";
  if (b.nebel < 3) return `${b.nebel} .wx2-nebel`;
});
await pruefe("V3h", "Nacht klar (01n): .wx2-mond und ≥ 12 .wx-star", () => {
  const b = B["01n"]; if (!b) return "keine .wx-stage";
  const f = [];
  if (!b.mond) f.push("kein .wx2-mond");
  if (b.sterne < 12) f.push(`${b.sterne} .wx-star`);
  return f;
});

// ----- V4 flüssig -----
const A = {};
for (const icon of ["01d", "01n", "02d", "03d", "10d", "11d", "13d", "50d"]) {
  await setze(page, basisSzenario(), wetterSeite(wetterVon(icon)));
  A[icon] = await animListe(page, "#view .wx-stage");
}
for (const [i, a] of Object.entries(A)) {
  if (!a) continue;
  const kurz = new Map();
  for (const x of a.liste) { const k = `${x.el} ${x.name}${x.doppelt > 1 ? `(${x.doppelt}× definiert)` : ""} [${(x.props || []).join("+")}] ${x.dauer}s`; kurz.set(k, (kurz.get(k) || 0) + 1); }
  info(`V4 heute ${i}: ${a.ziele} animierte Elemente; ${[...kurz].map(([k, n]) => (n > 1 ? `${n}× ` : "") + k).join("; ")}${a.smil.length ? `; SMIL ${a.smil.join(",")}` : ""}`);
}
await pruefe("V4a", "Bühne: alle Animationen ändern nur transform/opacity (Keyframes ohne top/left/width/height/margin/background/box-shadow/filter …)", () => {
  const f = [];
  for (const [i, a] of Object.entries(A)) {
    if (!a) { f.push(`${i}: keine .wx-stage`); continue; }
    const schlecht = new Set();
    for (const x of a.liste) { const v = verboten(x); if (v.length) schlecht.add(`${x.name} [${v.join(",")}]`); }
    for (const s of a.smil) if (!["transform", "opacity"].includes(s)) schlecht.add(`SMIL ${s}`);
    if (schlecht.size) f.push(`${i}: ${[...schlecht].join(", ")}`);
  }
  return f;
});
await pruefe("V4b", "Bühne: keine Animation unter 0.6 s pro Durchlauf", () => {
  const f = [];
  for (const [i, a] of Object.entries(A)) {
    if (!a) { f.push(`${i}: keine .wx-stage`); continue; }
    const schnell = new Set(a.liste.filter((x) => x.dauer > 0 && x.dauer < 0.6).map((x) => `${x.el} ${x.name} ${x.dauer}s`));
    if (schnell.size) f.push(`${i}: ${[...schnell].join(", ")}`);
  }
  return f;
});
await pruefe("V4c", "Bühne: höchstens 120 animierte Elemente", () => {
  const f = [];
  for (const [i, a] of Object.entries(A)) {
    if (!a) { f.push(`${i}: keine .wx-stage`); continue; }
    if (a.ziele > 120) f.push(`${i}: ${a.ziele}`);
  }
  return f;
});
await pruefe("V4d", "Pille auf Heute: Animationen nur transform/opacity und keine unter 0.6 s (alle Bildchen)", async () => {
  const f = [];
  for (const icon of ["01d", "01n", "02d", "03d", "10d", "11d", "13d", "50d"]) {
    await setze(page, { ...basisSzenario(), wetter: wetterVon(icon) });
    const a = await animListe(page, "#view .heute2 #h2Wetter");
    if (!a) { f.push(`${icon}: keine Pille`); continue; }
    const schlecht = new Set();
    for (const x of a.liste) {
      const v = verboten(x); if (v.length) schlecht.add(`${x.name} [${v.join(",")}]`);
      if (x.dauer > 0 && x.dauer < 0.6) schlecht.add(`${x.name} ${x.dauer}s`);
    }
    for (const s of a.smil) if (!["transform", "opacity"].includes(s)) schlecht.add(`SMIL ${s}`);
    if (schlecht.size) f.push(`${icon}: ${[...schlecht].join(", ")}`);
  }
  return f;
});

// ----- V7 keine doppelte Zurück-Zeile, Zurück → Heute -----
async function wetterVonHeute() {
  await setze(page, { ...basisSzenario(), wetter: wetterVon("10d") });
  const loc = page.locator("#view .heute2 #h2Wetter");
  if (!(await loc.count())) return "keine Pille";
  await loc.click(); await page.waitForTimeout(450);
  if ((await titel(page)) !== "Wetter") return `„Wetter“ ging nicht auf (Titel „${await titel(page)}“)`;
  return null;
}
const pfeilSichtbar = () => page.evaluate(() => { const b = document.getElementById("navBackBtn"); return !!b && !b.hidden && b.getBoundingClientRect().width > 0; });
await pruefe("V7a", "keine doppelte Zurück-Zeile: Pfeil oben (#navBackBtn) sichtbar → Zurück-Zeile in der Seite ausgeblendet", async () => {
  const fehl = await wetterVonHeute(); if (fehl) return fehl;
  if (!(await pfeilSichtbar())) return "Testaufbau: Pfeil oben nicht sichtbar";
  const r = await page.evaluate(() => [...document.querySelectorAll("#view .back-row, #view #backBtn")].filter((e) => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; }).map((e) => (e.textContent || "").trim()));
  if (r.length) return `Zurück-Zeile sichtbar („${r[0]}“)`;
});
await pruefe("V7b", "Zurück (Pfeil oben und navZurueck) führt von „Wetter“ nach „Heute“", async () => {
  const f = [];
  for (const weg of ["Pfeil", "navZurueck"]) {
    const fehl = await wetterVonHeute(); if (fehl) { f.push(`${weg}: ${fehl}`); continue; }
    if (weg === "Pfeil") {
      if (!(await pfeilSichtbar())) { f.push("Pfeil oben nicht sichtbar"); continue; }
      await page.locator("#navBackBtn").click();
    } else await page.evaluate(() => navZurueck());
    await page.waitForTimeout(450);
    const t = await titel(page);
    if (t !== "Heute" || !(await da(page, "#view .heute2"))) f.push(`${weg}: danach „${t}“`);
  }
  return f;
});

// ----- V8 Pille auf Heute -----
await pruefe("V8a", "bleibt: Pille mit svg.h2-wx + Kategorie-Klasse, Kurzwort und gerundeter Temperatur", async () => {
  const f = [];
  for (const [icon, temp, kat, wort, t] of [["01d", 14, "wx-sonne", "Sonnig", "14°"], ["10d", 13.6, "wx-regen", "Regen", "14°"], ["03d", -0.4, "wx-wolke", "Bewölkt", "0°"], ["01n", 8, "wx-mond", "Klar", "8°"]]) {
    await setze(page, { ...basisSzenario(), wetter: wetterVon(icon, temp) });
    const p = await pille(page);
    if (!p) { f.push(`${icon}: keine Pille`); continue; }
    if (!p.svg) { f.push(`${icon}: kein svg.h2-wx`); continue; }
    if (p.svg.kat.length !== 1 || p.svg.kat[0] !== kat) f.push(`${icon}: Klassen „${p.svg.klassen.join(" ")}“`);
    if (p.d !== wort) f.push(`${icon}: Kurzwort „${p.d}“`);
    if (p.t !== t) f.push(`${icon}: Temperatur „${p.t}“ statt „${t}“`);
  }
  return f;
});
await pruefe("V8b", "Pille: Sonne mit Farbverlauf (01d und 02d: radialGradient/linearGradient im svg, auch benutzt)", async () => {
  const f = [];
  for (const icon of ["01d", "02d"]) {
    await setze(page, { ...basisSzenario(), wetter: wetterVon(icon) });
    const p = await pille(page);
    if (!p || !p.svg) { f.push(`${icon}: ${p ? "kein svg.h2-wx" : "keine Pille"}`); continue; }
    if (!p.svg.grad.length) f.push(`${icon}: kein Gradient im svg`);
    else if (!p.svg.benutzt) f.push(`${icon}: Gradient da, aber kein fill/stroke=url(#…) darauf`);
  }
  return f;
});
await pruefe("V8c", "Pille: Wolke mit Farbverlauf (wx-wolke 03d, wx-sonnewolke 02d, wx-regen 10d)", async () => {
  const f = [];
  for (const icon of ["03d", "02d", "10d"]) {
    await setze(page, { ...basisSzenario(), wetter: wetterVon(icon) });
    const p = await pille(page);
    if (!p || !p.svg) { f.push(`${icon}: ${p ? "kein svg.h2-wx" : "keine Pille"}`); continue; }
    const wolkeGrad = await page.evaluate(() => {
      const svg = document.querySelector("#h2Wetter svg.h2-wx"); if (!svg) return false;
      const ids = [...svg.querySelectorAll("radialGradient, linearGradient")].map((g) => g.id).filter(Boolean);
      // die Wolkenfläche (Klasse wx-wolke-f o. ä. oder Pfad in .wx-wolkenteil) nutzt einen Verlauf
      const kand = svg.querySelectorAll("[class*='wolke'], [class*='wolke'] *");
      return [...kand].some((e) => { const v = (e.getAttribute("fill") || "") + " " + getComputedStyle(e).fill; return ids.some((id) => v.includes("#" + id)); });
    });
    if (!p.svg.grad.length) f.push(`${icon}: kein Gradient im svg`);
    else if (!wolkeGrad) f.push(`${icon}: Wolkenfläche ohne Verlauf (fill=url(#…))`);
  }
  return f;
});
await pruefe("V8d", "Verlaufs-IDs eindeutig: Pille + 5 Vorschau-Bildchen gleichzeitig im Dokument → keine doppelten id-Attribute", async () => {
  await setze(page, { ...basisSzenario(), wetter: wetterVon("02d") });
  const p = await pille(page);
  if (!p) return "keine Pille";
  await setze(page, { ...basisSzenario(), vorschau: vorschauVon(["02", "02", "01", "10", "03"]) }, wetterSeite(wetterVon("02d")));
  const r = await page.evaluate((html) => {
    document.body.insertAdjacentHTML("beforeend", `<div id="v8kopie" style="position:absolute;left:-9999px;top:0">${html}</div>`);
    const svgs = [...document.querySelectorAll("svg.h2-wx")];
    const ids = svgs.flatMap((s) => [...s.querySelectorAll("[id]")].map((e) => e.id));
    const grad = svgs.reduce((n, s) => n + s.querySelectorAll("radialGradient, linearGradient").length, 0);
    const doppelt = [...new Set(ids)].filter((id) => document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length > 1);
    const r = { svgs: svgs.length, grad, doppelt };
    document.getElementById("v8kopie")?.remove();
    return r;
  }, p.html);
  const f = [];
  if (r.svgs < 6) f.push(`nur ${r.svgs} svg.h2-wx im Dokument (erwartet Pille + 5 Vorschau)`);
  if (r.grad < 2) f.push(`nur ${r.grad} Verläufe gefunden – nichts zu vergleichen`);
  if (r.doppelt.length) f.push(`doppelte IDs: ${r.doppelt.slice(0, 5).join(", ")}`);
  return f;
});

// ----- V9 bleibt -----
await pruefe("V9a", "bleibt: routeWetter(w) zeigt „Wetter“ mit Temperatur ohne JS-Fehler für alle Icons (01d … 50d)", async () => {
  const f = [];
  for (const icon of ICONS) {
    const vorher = haupt.jsFehler.length;
    await setze(page, basisSzenario(), wetterSeite(wetterVon(icon, 14)));
    const t = await titel(page);
    const r = await page.evaluate(() => ({ stage: !!document.querySelector("#view .wx-stage"), temp: (document.querySelector("#view .wx-temp")?.textContent || "").trim() }));
    if (t !== "Wetter" || !r.stage) f.push(`${icon}: Titel „${t}“${r.stage ? "" : ", keine .wx-stage"}`);
    else if (!/14/.test(r.temp)) f.push(`${icon}: Temperatur „${r.temp}“`);
    if (haupt.jsFehler.length > vorher) f.push(`${icon}: JS-Fehler ${haupt.jsFehler[vorher]}`);
  }
  return f;
});
await pruefe("V9b", "bleibt: ohne Vorschau-Daten (kein Speicher, Netz blockiert; oder leere Liste) kein JS-Fehler, Vorschau leer oder Hinweis", async () => {
  const f = [];
  for (const [n, v] of [["kein Speicher", null], ["leere Liste", []]]) {
    const vorher = haupt.jsFehler.length;
    await setze(page, { ...basisSzenario(), vorschau: v }, wetterSeite(wetterVon("10d")));
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => { const e = document.querySelector("#view #wxForecast"); return { tage: document.querySelectorAll("#view .wx-fc-day").length, text: e ? (e.textContent || "").trim() : "" }; });
    if (r.tage) f.push(`${n}: ${r.tage} Vorschau-Tage`);
    if (/lädt/i.test(r.text)) f.push(`${n}: bleibt bei „${r.text}“ hängen`);
    if (haupt.jsFehler.length > vorher) f.push(`${n}: JS-Fehler ${haupt.jsFehler[vorher]}`);
  }
  return f;
});
await pruefe("V9c", "bleibt: Einstellungen haben #weatherKeyInput und #weatherCityInput", async () => {
  await setze(page, basisSzenario(), "_settingsAccOpen='app'; routeSettings()");
  await page.waitForTimeout(300);
  const f = [];
  for (const id of ["weatherKeyInput", "weatherCityInput"]) if (!(await da(page, `#view #${id}`))) f.push(`#${id} fehlt`);
  return f;
});
await pruefe("V9d", "keine JS-Fehler im Hauptlauf", () => (haupt.jsFehler.length ? `${haupt.jsFehler.length} JS-Fehler, z. B. ${haupt.jsFehler[0]}` : null));
await haupt.ctx.close();

// ----- V5 Weniger Bewegung -----
await pruefe("V5", "prefers-reduced-motion: reduce → keine laufende Animation auf der Wetter-Seite und in der Pille", async () => {
  const s = await neueSeite(412, 915, { reducedMotion: "reduce" });
  try {
    const mq = await s.page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!mq) return "Testaufbau: reducedMotion greift nicht";
    const f = [];
    const laeuft = (a) => a.liste.filter((x) => x.zustand === "running" && x.dauer > 0.01);
    for (const icon of ["01d", "01n", "02d", "03d", "10d", "11d", "13d", "50d"]) {
      await setze(s.page, basisSzenario(), wetterSeite(wetterVon(icon)));
      const a = await animListe(s.page, "#view .wx-screen");
      if (!a) { f.push(`${icon}: keine Wetter-Seite`); continue; }
      const l = laeuft(a);
      if (l.length) f.push(`${icon} Seite: ${[...new Set(l.map((x) => `${x.el} ${x.name} ${x.dauer}s`))].slice(0, 3).join(", ")}`);
      if (a.smil.length) f.push(`${icon} Seite: SMIL`);
      await setze(s.page, { ...basisSzenario(), wetter: wetterVon(icon) });
      const p = await animListe(s.page, "#view .heute2 #h2Wetter");
      if (!p) { f.push(`${icon}: keine Pille`); continue; }
      const lp = laeuft(p);
      if (lp.length) f.push(`${icon} Pille: ${[...new Set(lp.map((x) => `${x.el} ${x.name}`))].join(", ")}`);
    }
    if (s.jsFehler.length) f.push(`JS-Fehler: ${s.jsFehler[0]}`);
    return f;
  } finally { await s.ctx.close(); }
});

// ----- V6 + V1d: Handy-Größen × hell/dunkel -----
const GROESSEN = [{ n: "360 hoch", w: 360, h: 740 }, { n: "412 hoch", w: 412, h: 915 }, { n: "915 quer", w: 915, h: 412 }];
const v6 = { wisch: [], rand: [], fcWisch: [], fehler: [], hoehe: [], radius: [], kontrast: [], ohne: [] };
for (const g of GROESSEN) {
  for (const theme of ["light", "dark"]) {
    const s = await neueSeite(g.w, g.h);
    const name = `${g.n} ${theme === "dark" ? "dunkel" : "hell"}`;
    await setze(s.page, { ...basisSzenario(), theme }, wetterSeite(wetterVon("10d", 14, "leichter regen")));
    await s.page.waitForTimeout(400); // fade-up der Seite abwarten
    const m = await s.page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const out = { W, wisch: document.documentElement.scrollWidth > W + 1 || document.body.scrollWidth > W + 1, dunkel: !document.body.classList.contains("light"), rand: [], kontrast: {}, stage: null, fc: null };
      const scr = document.querySelector("#view .wx-screen") || document.querySelector("#view .view-inner");
      const st = document.querySelector("#view .wx-stage");
      if (!scr || !st) return out;
      const r = st.getBoundingClientRect(), cs = getComputedStyle(st);
      out.stage = { w: r.width, h: r.height, radius: Math.min(...["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"].map((k) => parseFloat(cs[k]) || 0)) };
      const fc = document.querySelector("#view #wxForecast");
      if (fc) out.fc = { sw: fc.scrollWidth, cw: fc.clientWidth, tage: fc.querySelectorAll(".wx-fc-day").length };
      // Über den Rand: alles in der Seite, außer Deko innerhalb der Bühne (die schneidet selbst ab) und Tage in einer Scroll-Reihe (eigener Punkt)
      for (const e of [scr, ...scr.querySelectorAll("*")]) {
        if (e !== st && st.contains(e)) continue;
        if (fc && e !== fc && fc.contains(e)) continue;
        const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue;
        if (b.right > W + 1 || b.left < -1) out.rand.push((typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/)[0] : e.tagName.toLowerCase()) + ` ${Math.round(b.left)}…${Math.round(b.right)}`);
      }
      const rgb = (c) => { const m = (c || "").match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const hg = (el) => { const eb = []; while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c && c.a > 0) { eb.push(c); if (c.a >= 1) break; } el = el.parentElement; } let f = { r: 255, g: 255, b: 255 }; if (!eb.length || eb[eb.length - 1].a < 1) f = rgb(getComputedStyle(document.body).backgroundColor) || f; for (const c of eb.reverse()) f = { r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a) }; return f; };
      const lum = (c) => { const k = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * k(c.r) + 0.7152 * k(c.g) + 0.0722 * k(c.b); };
      const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      for (const k of ["temp", "desc", "city"]) {
        const e = document.querySelector("#view .wx-" + k);
        if (!e) { out.kontrast[k] = null; continue; }
        const bg = hg(e), c = rgb(getComputedStyle(e).color);
        let o = 1; for (let p = e; p && p !== document.body; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity) || 1;
        const a = (c ? c.a : 1) * o;
        const cc = { r: c.r * a + bg.r * (1 - a), g: c.g * a + bg.g * (1 - a), b: c.b * a + bg.b * (1 - a) };
        out.kontrast[k] = { v: ratio(cc, bg), farbe: getComputedStyle(e).color, hg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` };
      }
      return out;
    });
    if (!m.stage) { v6.ohne.push(name); if (s.jsFehler.length) v6.fehler.push(`${name}: ${s.jsFehler[0]}`); await s.ctx.close(); continue; }
    const k = (x) => (m.kontrast[x] ? `${m.kontrast[x].v.toFixed(1)}:1 (${m.kontrast[x].farbe} auf ${m.kontrast[x].hg})` : "–");
    info(`V6 ${name}: Bühne ${Math.round(m.stage.w)}×${Math.round(m.stage.h)} px, Radius ${m.stage.radius} px, Vorschau ${m.fc ? `${m.fc.tage} Tage, ${m.fc.sw}/${m.fc.cw} px` : "–"}; Kontrast Temp ${k("temp")}, Beschr. ${k("desc")}, Stadt ${k("city")}`);
    if (theme === "dark" && !m.dunkel) v6.kontrast.push(`${name}: Dunkel-Modus greift nicht`);
    if (m.wisch) v6.wisch.push(`${name}: Seite seitlich wischbar`);
    if (m.rand.length) v6.rand.push(`${name}: ${m.rand.slice(0, 3).join(", ")}`);
    if (m.fc && m.fc.sw > m.fc.cw + 1) v6.fcWisch.push(`${name}: Vorschau ${m.fc.sw} px Inhalt in ${m.fc.cw} px`);
    if (!(m.stage.h >= 220 && m.stage.h <= 360)) v6.hoehe.push(`${name}: ${Math.round(m.stage.h)} px`);
    if (!(m.stage.radius >= 18)) v6.radius.push(`${name}: ${m.stage.radius} px`);
    for (const [x, n, min] of [["temp", "Temperatur", 3], ["desc", "Beschreibung", 4.5], ["city", "Stadt", 4.5]]) {
      if (!m.kontrast[x]) v6.kontrast.push(`${name}: ${n} fehlt`);
      else if (m.kontrast[x].v < min) v6.kontrast.push(`${name}: ${n} ${m.kontrast[x].v.toFixed(1)}:1 (< ${min})`);
    }
    if (s.jsFehler.length) v6.fehler.push(`${name}: ${s.jsFehler[0]}`);
    await s.ctx.close();
  }
}
const mitOhne = (l) => (v6.ohne.length ? [`keine Wetter-Bühne bei ${v6.ohne.join(", ")}`].concat(l) : l);
await pruefe("V1d", "Kontrast: Beschreibung und Stadt ≥ 4.5:1, Temperatur ≥ 3:1, hell und dunkel (360/412 hoch, 915 quer)", () => mitOhne(v6.kontrast));
await pruefe("V6a", "Seite nicht seitlich wischbar, nichts über den Rand (360/412 hoch, 915 quer, hell+dunkel)", () => mitOhne(v6.wisch.concat(v6.rand)));
await pruefe("V6b", "Vorschau-Reihe nicht seitlich wischbar (alle 5 Tage passen in die Breite)", () => mitOhne(v6.fcWisch));
await pruefe("V6c", "Bühne 220–360 px hoch", () => mitOhne(v6.hoehe));
await pruefe("V6d", "Bühne abgerundet (border-radius ≥ 18 px)", () => mitOhne(v6.radius));
await pruefe("V6e", "keine JS-Fehler in den Handy-Größen", () => v6.fehler);

await browser.close();
server.close();

// ---------- V10 Nichts kaputt: die anderen Tests ----------
// Eltern-Prozess ist selbst „node …/xyz-test.mjs“ (nicht die Shell, in der man den Test von Hand startet)?
const elternTest = (() => {
  try {
    const a = readFileSync(`/proc/${process.ppid}/cmdline`, "utf8").split("\0").filter(Boolean);
    return /(^|\/)node(js)?$/.test(a[0] || "") && a.slice(1).some((x) => /-test\.mjs$/.test(x));
  } catch (e) { return false; }
})();
const verschachtelt = ["SEITEN_SCHNELL", "HEUTE_SCHNELL", "AKTE_SCHNELL", "FAHR_SCHNELL", "WETTER_SCHNELL"].filter((v) => process.env[v]);
if (process.env.WETTER2_SCHNELL) {
  await pruefe("V10", "alle anderen scripts/*-test.mjs grün", () => ({ skip: "WETTER2_SCHNELL gesetzt" }));
} else if (elternTest || verschachtelt.length) {
  await pruefe("V10", "alle anderen scripts/*-test.mjs grün", () => ({ skip: `läuft selbst unter einem anderen Test (${elternTest ? "Eltern-Prozess ist ein *-test.mjs" : verschachtelt.join(", ") + " gesetzt"})` }));
} else {
  const dir = join(REPO, "scripts");
  const tests = (await readdir(dir)).filter((n) => n.endsWith("-test.mjs") && n !== "wetter2-test.mjs").sort();
  // Die anderen Tests sollen nicht ihrerseits noch einmal alle Tests (oder diesen hier) starten.
  const env = { ...process.env, KOMPASS_ROOT: ROOT, APP_ROOT: ROOT, HEUTE_SCHNELL: "1", AKTE_SCHNELL: "1", FAHR_SCHNELL: "1", SEITEN_SCHNELL: "1", WETTER_SCHNELL: "1", WETTER2_SCHNELL: "1" };
  await pruefe("V10", `alle anderen Tests grün (${tests.join(", ")})`, () => {
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
