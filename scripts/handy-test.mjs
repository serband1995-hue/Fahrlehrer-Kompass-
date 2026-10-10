// Handy-Test: öffnet jede Seite bei 360 und 412 px (hoch) und quer
// und meldet Seiten, die seitlich wischbar sind oder Elemente über den Rand schieben.
// Danach alle Hauptansichten der App (Titel abgeschnitten, Knöpfe über den Rand, JS-Fehler).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/handy-test.mjs [seite.html ...]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const SEITEN = process.argv.length > 2
  ? process.argv.slice(2)
  : ["index.html", "buchen.html", "storno.html", "check.html", "reaktion.html", "quiz.html", "quiz-lehrer.html", "quiz-tafel.html", "quiz-loesungen.html"];
const GROESSEN = [
  { name: "360 hoch", width: 360, height: 740 },
  { name: "412 hoch", width: 412, height: 915 },
  { name: "412 quer", width: 915, height: 412 },
];

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
let probleme = 0;

for (const seite of SEITEN) {
  for (const g of GROESSEN) {
    const ctx = await browser.newContext({ viewport: { width: g.width, height: g.height }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const jsFehler = [];
    page.on("pageerror", (e) => jsFehler.push(e.message));
    // Nur die eigene Seite laden, keine Außenwelt: Fremdanfragen blockieren.
    await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
    try {
      await page.goto(basis + seite, { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(600);
      const messung = await page.evaluate(() => {
        const breite = document.documentElement.clientWidth;
        const rand = [];
        for (const el of document.body.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          if (r.width === 0 || s.visibility === "hidden" || s.display === "none" || s.position === "fixed") continue;
          if (r.right > breite + 1 && !el.closest("[style*='overflow']")) {
            rand.push((el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : "")) + " +" + Math.round(r.right - breite) + "px");
          }
        }
        return { breite, scrollBreite: document.documentElement.scrollWidth, rand: rand.slice(0, 5) };
      });
      const wischbar = messung.scrollBreite > messung.breite + 1;
      if (wischbar || jsFehler.length) {
        probleme++;
        console.log(`PROBLEM  ${seite} @ ${g.name}: ${wischbar ? `seitlich wischbar (${messung.scrollBreite} > ${messung.breite})` : ""} ${jsFehler.length ? "JS-Fehler: " + jsFehler[0] : ""}`);
        if (messung.rand.length) console.log("         Verdacht: " + messung.rand.join(", "));
      } else {
        console.log(`ok       ${seite} @ ${g.name}`);
      }
    } catch (e) {
      probleme++;
      console.log(`FEHLER   ${seite} @ ${g.name}: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }
}

// App-Ansichten (index.html): jede Hauptseite mit einem Test-Schüler öffnen. Geprüft wird: kein seitliches Wischen,
// keine Knöpfe über den rechten Rand, Titel oben passt ganz hinein, keine JS-Fehler.
if (process.argv.length <= 2) {
  const ANSICHTEN = ["routeDashboard()", "routeHome()", "routeDetail('t1')", "routePlan('t1')", "routeHistorie('t1')", "routeNotes('t1')", "routeExam('t1')",
    "routeWaitlist()", "routeKalender()", "routePruefungen()", "routeStats()", "routeSettings()", "routeTodos()", "routeArchive()", "routeArbeitszeit()"];
  const APPGROESSEN = [GROESSEN[0], { name: "384 hoch", width: 384, height: 830 }, { name: "393 hoch", width: 393, height: 850 }, GROESSEN[1], GROESSEN[2]];
  for (const g of APPGROESSEN) {
    const ctx = await browser.newContext({ viewport: { width: g.width, height: g.height }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const jsFehler = [];
    page.on("pageerror", (e) => jsFehler.push(e.message));
    await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
    await page.goto(basis + "index.html", { waitUntil: "load" });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
      ensureAusbildungsplaene(); ensureDB();
      const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
      DB.students.push({ id: "t1", name: "Erfundene Testperson Lang", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "0123" });
    });
    for (const a of ANSICHTEN) {
      const m = await page.evaluate(async (a) => {
        try { if (typeof eval(a.split("(")[0]) !== "function") return { fehlt: true }; eval(a); } catch (e) { return { fehler: String(e) }; }
        await new Promise((k) => setTimeout(k, 250));
        const W = document.documentElement.clientWidth;
        const t = document.getElementById("tbTitle");
        const ueber = [...document.querySelectorAll("#view button, #view a")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !e.closest("[style*='overflow'],.cal-chips,.fc-scroll"); }).map((e) => e.textContent.trim().slice(0, 20));
        return { wisch: document.documentElement.scrollWidth > W + 1, titelAb: t && (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) ? t.textContent : "", ueber: ueber.slice(0, 3) };
      }, a);
      if (m.fehlt) continue;
      const f = [m.fehler, m.wisch && "seitlich wischbar", m.titelAb && "Titel abgeschnitten: " + m.titelAb, m.ueber && m.ueber.length && "über den Rand: " + m.ueber.join(", ")].filter(Boolean);
      if (f.length) { probleme++; console.log(`PROBLEM  ${a} @ ${g.name}: ${f.join(" · ")}`); } else console.log(`ok       ${a} @ ${g.name}`);
    }
    if (jsFehler.length) { probleme++; console.log(`PROBLEM  App-Ansichten @ ${g.name}: JS-Fehler: ${jsFehler[0]}`); }
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(probleme ? `\n${probleme} Problem(e) gefunden.` : "\nAlles in Ordnung.");
process.exit(probleme ? 1 : 0);
