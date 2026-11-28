// Büro-Handbuch: Screenshots der Büro-Seite im Vorführ-Modus (nur erfundene Daten, keine Datenbank, nichts wird gespeichert).
// Aufruf (vom Repo-Ordner aus):  NODE_PATH=$(npm root -g) node docs/buero-handbuch/bilder.mjs [kapitelnummer ...] [--nur=bild-id]
// Jedes Kapitel beschreibt seine Bilder in kapitel/NN-*.bilder.mjs (export default [ {...}, ... ]).
//
// Ein Bild:
//   { id: "02-schueler-liste",      // Dateiname bilder/<id>.png
//     url: "#schueler",              // Hash der Büro-Seite (Vorführ-Modus wird automatisch gesetzt)
//     geraet: "pc" | "handy",        // pc = 1366×768, handy = 412×915 (beide mit deviceScaleFactor 2)
//     rolle: "leitung" | "buero",    // leitung = Fahrschul-Leitung (Standard der Vorführung), buero = gemeinsames Büro-Konto mit PIN
//     pin: true,                     // nur rolle "buero": vorher als „Mia Muster“ mit PIN anmelden (sonst bleibt der PIN-Dialog offen)
//     vorher: async (page, h) => {}, // Klicks/Eingaben vor dem Bild (h = Helfer, siehe unten)
//     marken: [ { sel: "#glocke", nr: 1 }, { sel: "text=Speichern", nr: 2, nurRahmen: false } ],
//     ausschnitt: "#ansicht" | { sel, rand: 16 } | null,   // nur diesen Bereich fotografieren (sonst ganzes Fenster)
//     hoehe: 1100,                   // optional: höheres Fenster (nur pc), z. B. für lange Formulare
//   }
// Marken: roter Rahmen um das Element plus Nummer im Kreis. Die Nummern passen zu den Schritten im Text.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const HIER = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(HIER, "..", "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

const args = process.argv.slice(2);
const nurKapitel = args.filter((a) => /^\d+$/.test(a)).map((a) => a.padStart(2, "0"));
const nurBild = (args.find((a) => a.startsWith("--nur=")) || "").slice(6);

const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;

// Feste Uhrzeit/Datum, damit die Bilder bei jedem Lauf gleich aussehen: Mittwoch, 02.12.2026, 09:30 Uhr deutscher Zeit
const FEST = new Date("2026-12-02T09:30:00+01:00").getTime();

// Deutsche Anzeige auch in Datums- und Zeitfeldern (sonst mm/dd/yyyy und AM/PM)
const browser = await chromium.launch({ args: ["--lang=de-DE"], env: { ...process.env, LANG: "de_DE.UTF-8", LANGUAGE: "de_DE", LC_ALL: "de_DE.UTF-8" } });

// Helfer für vorher(): kurze Wartezeiten, Klick per Text, Formulare
function helfer(page) {
  return {
    warte: (ms = 400) => page.waitForTimeout(ms),
    klick: async (sel, opt = {}) => { await page.locator(sel).first().click(opt); await page.waitForTimeout(opt.warte ?? 450); },
    tippe: async (sel, text) => { await page.locator(sel).first().fill(text); await page.waitForTimeout(150); },
    geh: async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(700); },
    pin: async (name = "Mia Muster", pin = "5917") => {
      await page.locator("#werListe").getByText(name, { exact: false }).first().click();
      await page.waitForTimeout(700); // die PIN-Tasten nehmen erst nach 0,4 s Eingaben an (Doppelklick-Schutz)
      for (const z of pin) { await page.locator(`#pinFeld [data-ziffer="${z}"]`).click(); await page.waitForTimeout(180); }
      await page.waitForTimeout(900);
    },
    scrolle: async (sel) => { await page.locator(sel).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(250); },
  };
}

async function marken(page, liste) {
  if (!liste || !liste.length) return;
  const rects = [];
  for (const m of liste) {
    const loc = page.locator(m.sel).first();
    if (!(await loc.count())) { console.log(`   ! Marke ${m.nr} nicht gefunden: ${m.sel}`); continue; }
    const b = await loc.boundingBox();
    if (!b) { console.log(`   ! Marke ${m.nr} unsichtbar: ${m.sel}`); continue; }
    const sc = await page.evaluate(() => [scrollX, scrollY]);
    rects.push({ ...m, x: b.x + sc[0], y: b.y + sc[1], w: b.width, h: b.height });
  }
  await page.evaluate((rects) => {
    // Offenes Fenster (<dialog> im Vordergrund): Marken müssen IM Fenster liegen, sonst verdeckt es sie
    const dlg = [...document.querySelectorAll("dialog[open]")].pop();
    const ziel = dlg || document.body;
    for (const r of rects) {
      if (dlg) { r.x -= scrollX; r.y -= scrollY; }
      const pad = 4;
      if (!r.nurNummer) {
        const box = document.createElement("div");
        box.className = "hb-marke";
        Object.assign(box.style, { position: dlg ? "fixed" : "absolute", left: r.x - pad + "px", top: r.y - pad + "px", width: r.w + pad * 2 + "px", height: r.h + pad * 2 + "px", border: "3px solid #d6202a", borderRadius: "10px", zIndex: 2147483646, pointerEvents: "none", boxShadow: "0 0 0 2px rgba(255,255,255,.85)" });
        ziel.appendChild(box);
      }
      if (r.nr != null) {
        const n = document.createElement("div");
        n.className = "hb-marke";
        n.textContent = r.nr;
        const s = 26;
        let lx = r.x - pad - s / 2 - 2, ly = r.y - pad - s / 2 - 2;
        if (lx < 2) lx = 2; if (ly < 2) ly = 2;
        Object.assign(n.style, { position: dlg ? "fixed" : "absolute", left: lx + "px", top: ly + "px", width: s + "px", height: s + "px", lineHeight: s + "px", borderRadius: "50%", background: "#d6202a", color: "#fff", font: "700 15px/26px Arial, sans-serif", textAlign: "center", zIndex: 2147483647, pointerEvents: "none", boxShadow: "0 0 0 2px #fff" });
        ziel.appendChild(n);
      }
    }
  }, rects);
}

async function einBild(b) {
  const handy = b.geraet === "handy";
  const vp = handy ? { width: 412, height: b.hoehe || 915 } : { width: 1366, height: b.hoehe || 768 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: handy, hasTouch: handy, locale: "de-DE", timezoneId: "Europe/Berlin" });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  // Nichts nach außen: nur die eigene Seite (keine Datenbank, keine Schriften aus dem Netz)
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.clock.install({ time: FEST });
  await page.clock.resume();
  if (b.rolle === "buero") {
    // Vorführung als gemeinsames Büro-Konto statt als Leitung (nur die Sitzung der Attrappe ändert sich)
    await page.addInitScript(() => {
      let f;
      Object.defineProperty(window, "__FAKE", { configurable: true, get: () => f, set: (v) => { if (v && v.session && v.session.user && v.session.user.id === "ad-1") v.session = { user: { id: "bu-1", email: "buero@example.org" } }; f = v; } });
    });
  }
  if (b.vorInit) await page.addInitScript(b.vorInit);
  await page.goto(basis + "buero.html?vorfuehrung" + (b.url || "#heute"), { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const h = helfer(page);
  if (b.rolle === "buero" && b.pin) await h.pin();
  if (b.url && b.rolle === "buero" && b.pin) await h.geh(b.url);
  if (b.vorher) await b.vorher(page, h);
  await page.waitForTimeout(300);
  await marken(page, b.marken);
  const datei = join(HIER, "bilder", b.id + ".png");
  let aus = b.ausschnitt, bereich;
  if (typeof aus === "string") aus = { sel: aus };
  if (aus) {
    const loc = page.locator(aus.sel).first();
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const r = await loc.boundingBox();
    if (!r) throw new Error("Ausschnitt nicht gefunden: " + aus.sel);
    const rand = aus.rand ?? 12;
    // Marken liegen auf der Seite; boundingBox ist relativ zum Fenster -> mit fullPage arbeiten
    const sc = await page.evaluate(() => [scrollX, scrollY]);
    const clip = { x: Math.max(0, r.x + sc[0] - rand), y: Math.max(0, r.y + sc[1] - rand), width: r.width + rand * 2, height: Math.min(r.height + rand * 2, aus.maxHoehe || 2400) };
    await page.screenshot({ path: datei, clip, fullPage: true });
    bereich = clip;
  } else {
    await page.screenshot({ path: datei, fullPage: !!b.ganzeSeite });
    bereich = b.ganzeSeite ? await page.evaluate(() => ({ x: 0, y: 0, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))
      : await page.evaluate(() => ({ x: scrollX, y: scrollY, width: innerWidth, height: innerHeight }));
  }
  // Prüfung: Jede rote Nummer muss ganz im Bild liegen (sonst verweist der Text auf eine Stelle, die man nicht sieht)
  const draussen = await page.evaluate((r) => [...document.querySelectorAll(".hb-marke")].filter((n) => n.textContent.trim()).filter((n) => {
    const b = n.getBoundingClientRect(), x = b.left + scrollX, y = b.top + scrollY;
    return x < r.x - 1 || y < r.y - 1 || x + b.width > r.x + r.width + 1 || y + b.height > r.y + r.height + 1;
  }).map((n) => n.textContent.trim()), bereich);
  await ctx.close();
  if (draussen.length) throw new Error(`Marke ${draussen.join(", ")} liegt (teilweise) außerhalb des Bildes`);
  return fehler;
}

const dateien = (await readdir(join(HIER, "kapitel"))).filter((f) => f.endsWith(".bilder.mjs")).sort();
await mkdir(join(HIER, "bilder"), { recursive: true });
let anzahl = 0, probleme = 0;
for (const f of dateien) {
  if (nurKapitel.length && !nurKapitel.includes(f.slice(0, 2))) continue;
  const liste = (await import(pathToFileURL(join(HIER, "kapitel", f)).href)).default;
  for (const b of liste) {
    if (nurBild && b.id !== nurBild) continue;
    try {
      const fehler = await einBild(b);
      anzahl++;
      console.log(`ok   ${b.id}${fehler.length ? "  (JS-Fehler: " + fehler[0] + ")" : ""}`);
    } catch (e) {
      probleme++;
      console.log(`FEHL ${b.id}: ${e.message.split("\n")[0]}`);
    }
  }
}
await browser.close();
server.close();
console.log(`\n${anzahl} Bilder, ${probleme} Fehler`);
process.exit(probleme ? 1 : 0);
