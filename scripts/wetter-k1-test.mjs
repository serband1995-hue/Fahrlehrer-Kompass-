// Wetter-K1-Test (🗣 22.11.2026): Jeder Fahrlehrer sieht sofort das Wetter für Offenbach, ohne eigenen Schlüssel.
// Quelle: Deutscher Wetterdienst über api.brightsky.dev; Ort pro Nutzer änderbar (Suche über nominatim.openstreetmap.org).
// Beide Dienste werden hier NACHGESTELLT (page.route), es geht keine Anfrage ins Netz. Keine Datenbank, keine Schülerdaten.
// K1a Neuer Nutzer: Offenbach mit Koordinaten, Pille auf „Heute“ zeigt die Temperatur, Anfrage an brightsky mit Offenbach.
// K1b Wetter-Seite: 5 Tage Vorschau, Höchst-/Tiefstwerte richtig, Quelle „Deutscher Wetterdienst“ sichtbar.
// K1c Alter Nutzer mit Ortsname ohne Koordinaten (früher OpenWeatherMap): Ort wird einmal gesucht und gemerkt.
// K1d Einstellungen: Ort ändern → gespeichert, Zwischenspeicher geleert, Hinweis ohne Knopf, kein Dialog.
// K1e Unbekannter Ort: Hinweis, nichts geändert. K1f Ausschalten: keine Pille, keine Anfrage, Seite springt nicht.
// K1i Abgleich-sicher (Start schreibt nichts außer Schlüssel-Wegfall). K1j Suche scheitert: kein falsches Wetter, eine Suche, 10 min Pause.
// K1m Kein Netz bei der Ortssuche → kein falscher Hinweis.
// K1l Ort nicht gefunden → leiser Hinweis auf „Heute“ und in den Einstellungen.
// K1k Enter speichert, kein Netz → eigener Hinweis.
// K1g Symbole: Bright-Sky-Symbole → bisherige Wetter-Codes. K1h 360 px: Einstellungen ohne Querscrollen, keine JS-Fehler.
// Aufruf: NODE_PATH=$(npm root -g) node scripts/wetter-k1-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
let fehler = 0, ok = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (Array.isArray(r)) r = r.length ? r.join("; ") : undefined;
  if (r === undefined || r === true) { ok++; console.log(`ok  ${id} ${text}`); } else { fehler++; console.log(`FEHLER  ${id} ${text}: ${r}`); }
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const d = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(d);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const JETZT = new Date("2026-11-22T10:30:00+01:00");

// Nachgestellte Dienste (erfundene Werte)
const ORTE = { darmstadt: { name: "Darmstadt", lat: "49.872775", lon: "8.651177" }, hanau: { name: "Hanau", lat: "50.132881", lon: "8.916689" } };
function vorschau(von, bis) {
  const w = []; let d = new Date(von + "T00:00:00+01:00"); const ende = new Date(bis + "T23:00:00+01:00"); let tag = 0;
  while (d <= ende) {
    const iso = new Date(d.getTime() + 3600000).toISOString().slice(0, 10);
    for (let h = 0; h < 24; h++) {
      const t = (tag + 1) + (h >= 12 && h <= 15 ? 6 : 0) - (h < 5 ? 3 : 0); // Tag 1 (n=0): Tiefst -2°, Höchst 7°
      w.push({ timestamp: `${iso}T${String(h).padStart(2, "0")}:00:00+01:00`, temperature: t, icon: tag % 2 ? "rain" : "partly-cloudy-day", condition: tag % 2 ? "rain" : "dry" });
    }
    d = new Date(d.getTime() + 86400000); tag++;
  }
  return { weather: w };
}

async function seite(width = 360, height = 740) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, locale: "de-DE", timezoneId: "Europe/Berlin" });
  await ctx.addInitScript(() => { try { localStorage.setItem("serband-theme", "light"); localStorage.removeItem("serband-app-version"); } catch (e) {} });
  const page = await ctx.newPage(); const js = [], anfragen = [];
  page.on("pageerror", (e) => js.push(e.message));
  page.on("dialog", (d) => { js.push("Dialog: " + d.message()); d.dismiss(); });
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", async (r) => {
    const u = r.request().url();
    if (u.startsWith(basis)) return r.continue();
    if (/api\.brightsky\.dev|nominatim\.openstreetmap\.org/.test(u)) anfragen.push(u);
    const q = new URL(u);
    if (q.host === "api.brightsky.dev" && q.pathname === "/current_weather")
      return r.fulfill({ json: { weather: { timestamp: "2026-11-22T10:30:00+01:00", temperature: 7.4, icon: "rain", condition: "rain" } } });
    if (q.host === "api.brightsky.dev" && q.pathname === "/weather")
      return r.fulfill({ json: vorschau(q.searchParams.get("date"), q.searchParams.get("last_date")) });
    if (q.host === "nominatim.openstreetmap.org") {
      if ((q.searchParams.get("q") || "").toLowerCase() === "mainz") return r.abort(); // kein Netz
      const o = ORTE[(q.searchParams.get("q") || "").toLowerCase()];
      return r.fulfill({ json: o ? [o] : [] });
    }
    return r.abort();
  });
  await page.goto(basis + "index.html", { waitUntil: "load" });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
    document.getElementById("bueroNotizPopup")?.remove();
  });
  return { ctx, page, js, anfragen };
}
const leereSpeicher = (page) => page.evaluate(() => { localStorage.removeItem("serband-weather-cache"); localStorage.removeItem("serband-weather-forecast-cache"); });

const s = await seite();
const { page } = s;

await pruefe("K1a", "neuer Nutzer: Offenbach voreingestellt, Pille auf „Heute“ zeigt 7° ohne Schlüssel", async () => {
  const f = [];
  await leereSpeicher(page);
  const cfg = await page.evaluate(() => { DB.weatherCfg = undefined; ensureDB(); return DB.weatherCfg; });
  if (cfg.city !== "Offenbach" || "lat" in cfg) f.push("Vorgabe falsch: " + JSON.stringify(cfg));
  if ("apiKey" in cfg) f.push("apiKey noch da");
  const vorher = s.anfragen.length;
  await page.evaluate(() => routeDashboard());
  await page.waitForFunction(() => { const t = document.querySelector("#h2Wetter .h2-wetter-t"); return t && /\d/.test(t.textContent); }, null, { timeout: 5000 }).catch(() => f.push("Pille ohne Temperatur"));
  const t = await page.evaluate(() => document.querySelector("#h2Wetter .h2-wetter-t")?.textContent || "");
  if (!/7/.test(t)) f.push("Temperatur: " + t);
  const bs = s.anfragen.slice(vorher).filter((u) => /current_weather/.test(u));
  if (!bs.length) f.push("keine Anfrage an brightsky");
  else if (!/lat=50\.1006&lon=8\.7665/.test(bs[0])) f.push("falscher Ort: " + bs[0]);
  if (s.anfragen.slice(vorher).some((u) => /nominatim/.test(u))) f.push("unnötige Ortssuche");
  return f;
});

await pruefe("K1b", "Wetter-Seite: 5 Tage Vorschau mit richtigen Werten, Quelle sichtbar", async () => {
  const f = [];
  await page.evaluate(async () => { routeWetter(await fetchWeather()); });
  await page.waitForSelector("#wxForecast .wx-fc-day", { timeout: 5000 }).catch(() => f.push("keine Vorschau"));
  const tage = await page.$$eval("#wxForecast .wx-fc-day", (els) => els.map((e) => e.querySelector(".wx-fc-t").textContent));
  if (tage.length !== 5) f.push(`${tage.length} statt 5 Tage`);
  if (tage[0] !== "7°-2°") f.push("Tag 1: " + tage[0] + " (erwartet 7° / -2°)");
  const roh = await page.evaluate(() => JSON.parse(localStorage.getItem("serband-weather-forecast-cache")).data);
  if (roh[0].date !== "2026-11-23") f.push("erster Tag " + roh[0].date);
  if (roh[0].icon !== "02" || roh[1].icon !== "10") f.push("Symbole " + roh[0].icon + "/" + roh[1].icon);
  const q = await page.evaluate(() => document.querySelector(".wx-quelle")?.textContent || "");
  if (!/Deutscher Wetterdienst/.test(q)) f.push("Quelle fehlt");
  return f;
});

await pruefe("K1c", "alter Nutzer „Hanau,DE“ ohne Koordinaten: Ort einmal gesucht, nur auf dem Gerät gemerkt (DB unverändert)", async () => {
  const f = [];
  await leereSpeicher(page);
  await page.evaluate(() => { localStorage.removeItem("serband-wetter-ort"); DB.weatherCfg = { apiKey: "alt", city: "Hanau,DE" }; ensureDB(); });
  const vorher = s.anfragen.length;
  const w = await page.evaluate(() => fetchWeather());
  if (!w || w.temp !== 7) f.push("kein Wetter: " + JSON.stringify(w));
  const cfg = await page.evaluate(() => DB.weatherCfg);
  if (JSON.stringify(cfg) !== JSON.stringify({ city: "Hanau,DE" })) f.push("DB verändert: " + JSON.stringify(cfg));
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem("serband-wetter-ort") || "null"));
  if (!m || m.q !== "Hanau" || m.lat !== 50.1329) f.push("nicht gemerkt: " + JSON.stringify(m));
  const neu = s.anfragen.slice(vorher);
  if (neu.filter((u) => /nominatim/.test(u)).length !== 1) f.push("Ortssuchen: " + neu.filter((u) => /nominatim/.test(u)).length);
  if (!neu.some((u) => /lat=50\.1329&lon=8\.9167/.test(u))) f.push("Wetter nicht für Hanau geholt");
  await leereSpeicher(page);
  const v2 = s.anfragen.length; await page.evaluate(() => fetchWeather());
  if (s.anfragen.slice(v2).some((u) => /nominatim/.test(u))) f.push("zweite Ortssuche");
  return f;
});

await pruefe("K1i", "Abgleich-sicher: Start auf einem alten Stand schreibt außer dem Wegfall des Schlüssels nichts in die Daten", async () => {
  const f = [];
  for (const alt of [{ apiKey: "k", city: "Offenbach,DE" }, { apiKey: "", city: "Hanau,DE" }, { city: "Darmstadt", lat: 49.8728, lon: 8.6512 }, { city: "Offenbach", aus: true }]) {
    const r = await page.evaluate((a) => { DB.weatherCfg = JSON.parse(JSON.stringify(a)); ensureDB(); return DB.weatherCfg; }, alt);
    const soll = { ...alt }; delete soll.apiKey;
    if (JSON.stringify(r) !== JSON.stringify(soll)) f.push(JSON.stringify(alt) + " → " + JSON.stringify(r));
  }
  for (const kaputt of [{ city: 123 }, { city: { a: 1 } }, []]) {
    const r = await page.evaluate((a) => { DB.weatherCfg = a; ensureDB(); return DB.weatherCfg.city; }, kaputt);
    if (r !== "Offenbach") f.push("kaputt " + JSON.stringify(kaputt) + " → " + r);
  }
  return f;
});

await pruefe("K1j", "Ortssuche scheitert: kein Wetter (statt Offenbach unter falschem Namen), eine Suche gleichzeitig, 10 min Pause", async () => {
  const f = [];
  await leereSpeicher(page);
  await page.evaluate(() => { localStorage.removeItem("serband-wetter-ort"); DB.weatherCfg = { city: "Xyzqw,DE" }; });
  const vorher = s.anfragen.length;
  const r = await page.evaluate(() => Promise.all([fetchWeather(), fetchWeather(), fetchWeatherForecast()]));
  if (r[0] !== null || r[1] !== null || r[2].length) f.push("trotzdem Wetter: " + JSON.stringify(r).slice(0, 80));
  const neu = s.anfragen.slice(vorher);
  if (neu.filter((u) => /nominatim/.test(u)).length !== 1) f.push(neu.filter((u) => /nominatim/.test(u)).length + " Ortssuchen gleichzeitig");
  if (neu.some((u) => /brightsky/.test(u))) f.push("Wetter für falschen Ort geholt");
  if (await page.evaluate(() => localStorage.getItem("serband-weather-cache"))) f.push("falsches Wetter gespeichert");
  const v2 = s.anfragen.length; await page.evaluate(() => fetchWeather());
  if (s.anfragen.length > v2) f.push("neue Suche innerhalb der Pause");
  await page.evaluate(() => { localStorage.removeItem("serband-wetter-ort"); DB.weatherCfg = { city: "Offenbach" }; });
  return f;
});

await pruefe("K1l", "Ort nicht gefunden: „Heute“ zeigt leisen Hinweis, Tipp führt zum Ortsfeld; Einstellungen zeigen den Hinweis", async () => {
  const f = [];
  await leereSpeicher(page);
  await page.evaluate(() => { DB.weatherCfg = { city: "Xyzqw" }; localStorage.setItem("serband-wetter-ort", JSON.stringify({ q: "Xyzqw", fehlTs: Date.now() })); routeDashboard(); });
  await page.waitForTimeout(600);
  const p = await page.evaluate(() => { const b = document.getElementById("h2Wetter"); return b ? { text: b.textContent.replace(/\s+/g, " ").trim(), vis: getComputedStyle(b).visibility, label: b.getAttribute("aria-label") } : null; });
  if (!p || !/Ort prüfen/.test(p.text) || p.vis === "hidden") f.push("kein Hinweis: " + JSON.stringify(p));
  if (p && !/Einstellungen/.test(p.label || "")) f.push("Vorlesetext ohne Weg");
  const abgeschnitten = await page.evaluate(() => [...document.querySelectorAll("#h2Wetter .h2-wetter-t, #h2Wetter .h2-wetter-d")].some((e) => e.scrollWidth > e.clientWidth + 1));
  if (abgeschnitten) f.push("Text in der Pille abgeschnitten");
  await page.click("#h2Wetter"); await page.waitForTimeout(300);
  if (!(await page.$("#weatherCityInput"))) f.push("Tipp führt nicht zum Ortsfeld");
  if (!(await page.$(".wx-ort-fehlt"))) f.push("Einstellungen ohne Hinweis");
  await page.evaluate(() => { localStorage.removeItem("serband-wetter-ort"); DB.weatherCfg = { city: "Offenbach" }; });
  return f;
});

await pruefe("K1m", "kein Netz bei der Ortssuche: kein falscher Hinweis „Ort prüfen“, Pille verschwindet, 10 min Pause", async () => {
  const f = [];
  await leereSpeicher(page);
  await page.evaluate(() => { localStorage.removeItem("serband-wetter-ort"); DB.weatherCfg = { city: "Mainz" }; routeDashboard(); });
  await page.waitForTimeout(700);
  if (await page.$("#h2Wetter")) f.push("Pille bleibt: " + (await page.textContent("#h2Wetter")).replace(/\s+/g, " ").trim());
  const m = await page.evaluate(() => JSON.parse(localStorage.getItem("serband-wetter-ort") || "null"));
  if (!m || !m.netzTs || m.fehlTs) f.push("Merker falsch: " + JSON.stringify(m));
  if (await page.evaluate(() => _wetterOrtFehlt())) f.push("gilt als „nicht gefunden“");
  const v = s.anfragen.length; await page.evaluate(() => fetchWeather());
  if (s.anfragen.length > v) f.push("neue Suche innerhalb der Pause");
  await page.evaluate(() => { localStorage.removeItem("serband-wetter-ort"); DB.weatherCfg = { city: "Offenbach" }; });
  return f;
});

async function einstellungen() {
  await page.evaluate(() => { _settingsAccOpen = "app"; routeSettings(); });
  await page.waitForSelector("#weatherCityInput");
  await page.locator("#weatherCityInput").scrollIntoViewIfNeeded();
}
await pruefe("K1d", "Einstellungen: Ort „Darmstadt“ speichern → gemerkt, Speicher geleert, Hinweis ohne Knopf", async () => {
  const f = [];
  await page.evaluate(() => { DB.weatherCfg = { city: "Offenbach", lat: 50.1006, lon: 8.7665 }; localStorage.setItem("serband-weather-cache", JSON.stringify({ ts: Date.now(), city: "Offenbach", data: { temp: 1, desc: "x", icon: "01d" } })); });
  await einstellungen();
  if (await page.$("#weatherKeyInput")) f.push("Schlüssel-Feld noch da");
  await page.fill("#weatherCityInput", "Darmstadt");
  await page.click("#weatherSaveBtn");
  await page.waitForFunction(() => DB.weatherCfg.city === "Darmstadt", null, { timeout: 4000 }).catch(() => f.push("nicht gespeichert"));
  const cfg = await page.evaluate(() => DB.weatherCfg);
  if (cfg.lat !== 49.8728 || cfg.lon !== 8.6512) f.push("Koordinaten " + cfg.lat + "/" + cfg.lon);
  if (await page.evaluate(() => localStorage.getItem("serband-weather-cache"))) f.push("alter Speicher noch da");
  const t = await page.evaluate(() => { const t = document.getElementById("toast"); return { text: t?.textContent || "", knopf: !!t?.querySelector("button") }; });
  if (!/Darmstadt/.test(t.text) || t.knopf) f.push("Hinweis: " + JSON.stringify(t));
  if (await page.inputValue("#weatherCityInput") !== "Darmstadt") f.push("Feld nicht aktualisiert");
  return f;
});

await pruefe("K1e", "unbekannter Ort: Hinweis, Einstellung bleibt", async () => {
  const f = [];
  await page.fill("#weatherCityInput", "Xyzqw");
  await page.click("#weatherSaveBtn");
  await page.waitForFunction(() => /nicht gefunden/.test(document.getElementById("toast")?.textContent || ""), null, { timeout: 4000 }).catch(() => f.push("kein Hinweis"));
  if ((await page.evaluate(() => DB.weatherCfg.city)) !== "Darmstadt") f.push("Ort trotzdem geändert");
  if (await page.$eval("#weatherSaveBtn", (b) => b.disabled)) f.push("Knopf bleibt gesperrt");
  return f;
});

await pruefe("K1k", "Enter im Ortsfeld speichert; kein Netz → „Keine Verbindung“ statt „nicht gefunden“", async () => {
  const f = [];
  await einstellungen();
  await page.fill("#weatherCityInput", "Hanau");
  await page.press("#weatherCityInput", "Enter");
  await page.waitForFunction(() => DB.weatherCfg.city === "Hanau", null, { timeout: 4000 }).catch(() => f.push("Enter speichert nicht"));
  await page.fill("#weatherCityInput", "Mainz");
  await page.click("#weatherSaveBtn");
  await page.waitForFunction(() => /Keine Verbindung/.test(document.getElementById("toast")?.textContent || ""), null, { timeout: 4000 }).catch(() => f.push("kein Verbindungs-Hinweis"));
  if ((await page.evaluate(() => DB.weatherCfg.city)) !== "Hanau") f.push("Ort trotz Fehler geändert");
  await page.evaluate(() => { DB.weatherCfg = { city: "Darmstadt", lat: 49.8728, lon: 8.6512 }; });
  return f;
});

await pruefe("K1f", "Ausschalten: Schalter wechselt ohne Neuzeichnen, danach keine Pille und keine Anfrage; Einschalten geht wieder", async () => {
  const f = [];
  await einstellungen();
  const y0 = await page.evaluate(() => document.getElementById("view").scrollTop);
  await page.click("#weatherOnToggle");
  const nach = await page.evaluate(() => ({ y: document.getElementById("view").scrollTop, on: document.getElementById("weatherOnToggle").classList.contains("on"), aus: DB.weatherCfg.aus }));
  if (nach.on || nach.aus !== true) f.push("nicht ausgeschaltet: " + JSON.stringify(nach));
  if (Math.abs(nach.y - y0) > 2) f.push(`Seite gesprungen ${y0} → ${nach.y}`);
  await leereSpeicher(page);
  const vorher = s.anfragen.length;
  await page.evaluate(() => routeDashboard()); await page.waitForTimeout(600);
  if (await page.$("#h2Wetter")) f.push("Pille trotz aus");
  if (s.anfragen.length > vorher) f.push("Anfrage trotz aus");
  await einstellungen(); await page.click("#weatherOnToggle");
  if (await page.evaluate(() => DB.weatherCfg.aus)) f.push("lässt sich nicht wieder einschalten");
  return f;
});

await pruefe("K1g", "Symbole: Bright Sky → bisherige Wetter-Codes (Tag/Nacht, unbekannt)", async () => {
  const r = await page.evaluate(() => [
    _bsIcon("clear-day", "dry", "2026-11-22T12:00:00+01:00").icon, _bsIcon("clear-night", "dry", "2026-11-22T23:00:00+01:00").icon,
    _bsIcon("cloudy", "dry", "2026-11-22T12:00:00+01:00").icon, _bsIcon("cloudy", "dry", "2026-11-22T21:00:00+01:00").icon, _bsIcon("cloudy", "dry", "2026-06-22T19:30:00+02:00").icon,
    _bsIcon("rain", "rain", "2026-11-22T12:00:00+01:00").icon, _bsIcon("thunderstorm", "", "2026-11-22T12:00:00+01:00").icon,
    _bsIcon("snow", "", "2026-11-22T12:00:00+01:00").icon, _bsIcon("fog", "", "2026-11-22T12:00:00+01:00").icon,
    _bsIcon(null, "rain", "2026-11-22T12:00:00+01:00").icon, _bsIcon(null, null, "").icon,
    _bsIcon("rain", "rain", "2026-11-22T12:00:00+01:00").desc]);
  const soll = ["01d", "01n", "04d", "04n", "04d", "10d", "11d", "13d", "50d", "10d", "03d", "Regen"];
  return r.map((x, i) => (x === soll[i] ? null : `${i}: ${x} statt ${soll[i]}`)).filter(Boolean);
});

await pruefe("K1h", "360 px: Einstellungen und Wetter-Seite ohne Querscrollen, keine JS-Fehler, kein Dialog", async () => {
  const f = [];
  await einstellungen();
  const q1 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (q1 > 0) f.push("Einstellungen " + q1 + " px zu breit");
  const h = await page.$eval("#weatherSaveBtn", (b) => b.getBoundingClientRect().height);
  if (h < 44) f.push("Knopf " + h + " px hoch");
  await page.evaluate(async () => { localStorage.removeItem("serband-weather-cache"); routeWetter(await fetchWeather()); });
  await page.waitForTimeout(400);
  const q2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (q2 > 0) f.push("Wetter-Seite " + q2 + " px zu breit");
  if (s.js.length) f.push(s.js.slice(0, 2).join(" / "));
  return f;
});

await s.ctx.close();
await browser.close();
server.close();
console.log(`\nWetter-K1-Test: ${ok} ok, ${fehler} Fehler.`);
process.exit(fehler ? 1 : 0);
