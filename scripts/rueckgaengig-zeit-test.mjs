// Test Werkstatt 11 Schritt 3 (App): wie lange der „Rückgängig“-Hinweis steht, kommt aus den Einstellungen (rueckgaengig.sekunden, 4–30, Vorgabe 6).
//   R1 _undoMs() ohne KE-Wert = 6000, mit Wert = Sekunden × 1000, außerhalb der Grenzen = 6000
//   R2 toastUndo-Aufrufer ohne ms: Hinweis steht so lange (Zeitgeber), alle früheren festen 6000 sind weg
//   R3 Absage-Prüfung gekoppelt: _loeschenMitRueckgaengig startet nachAblauf erst nach Sekunden + 300 ms
//   R4 Sonderfälle bleiben (15000 „Meine nehmen“, 10000 „Backup eingespielt“)   R5 keine JS-Fehler
// Aufruf: NODE_PATH=$(npm root -g) node scripts/rueckgaengig-zeit-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const basis = `http://127.0.0.1:${server.address().port}/`;
const quelle = await readFile(join(ROOT, "index.html"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let ok = 0, bad = 0;
function pruefe(id, text, f) { if (f === true || f == null) { ok++; console.log(`ok  ${id} ${text}`); } else { bad++; console.log(`FEHLER  ${id} ${text}: ${f}`); } }

try {
  // R2 (Quelltext): keine festen 6000 mehr hinter toastUndo, die 6300 ist gekoppelt
  const feste = quelle.split("\n").map((z, i) => [i + 1, z]).filter(([, z]) => /toastUndo\(/.test(z) && /,6000\)/.test(z)).map(([i]) => i);
  const rest6000 = quelle.split("\n").map((z, i) => [i + 1, z]).filter(([, z]) => /^\s*(\},|\)?,)6000\);/.test(z) || /\},6000\); *\}?\)?;?\s*$/.test(z)).map(([i]) => i);
  pruefe("R2a", "kein toastUndo mehr mit festen 6000 (Zeile)", feste.length ? "Zeilen " + feste.join(",") : null);
  pruefe("R2b", "keine Zeile endet mehr auf „},6000);“", rest6000.length ? "Zeilen " + rest6000.join(",") : null);
  pruefe("R3a", "gekoppelte Absage-Prüfung: setTimeout(pruef,_undoMs()+300)", /setTimeout\(pruef,_undoMs\(\)\+300\)/.test(quelle) && !/setTimeout\(pruef,6300\)/.test(quelle) ? null : "fehlt");
  pruefe("R4a", "„Meine nehmen“ (15000) und „Backup eingespielt“ (10000) bleiben", /15000/.test(quelle) && /Alter Stand wiederhergestellt"\); *\},10000\)/.test(quelle) ? null : "fehlt");

  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage(); const js = [];
  page.on("pageerror", (e) => js.push(e.message));
  page.on("dialog", (d) => { js.push("Dialog: " + d.message().slice(0, 60)); d.dismiss().catch(() => {}); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await page.waitForTimeout(800);
  const sb = (wert) => `({ from: () => ({ select: () => ({ eq: async () => ({ data: ${JSON.stringify(wert)}, error: null }) }) }) })`;
  const laden = (wert, fs) => page.evaluate(async ([w, f]) => { KE._leeren(); await KE.lade({ from: () => ({ select: () => ({ eq: async () => ({ data: w, error: null }) }) }) }, f); return _undoMs(); }, [wert, fs]);
  pruefe("R1a", "ohne Wert in der Datenbank: 6000", (await laden([], "fs-a")) === 6000 ? null : "anders");
  const v12 = await laden([{ schluessel: "rueckgaengig.sekunden", wert: { sekunden: 12 } }], "fs-a");
  pruefe("R1b", "12 Sekunden gespeichert: 12000", v12 === 12000 ? null : String(v12));
  pruefe("R1c", "unter 4 (3) und über 30 (31) gelten nicht: 6000", (await laden([{ schluessel: "rueckgaengig.sekunden", wert: { sekunden: 3 } }], "fs-a")) === 6000 && (await laden([{ schluessel: "rueckgaengig.sekunden", wert: { sekunden: 31 } }], "fs-a")) === 6000 ? null : "anders");
  pruefe("R1d", "Grenzen 4 und 30 gelten", (await laden([{ schluessel: "rueckgaengig.sekunden", wert: { sekunden: 4 } }], "fs-a")) === 4000 && (await laden([{ schluessel: "rueckgaengig.sekunden", wert: { sekunden: 30 } }], "fs-a")) === 30000 ? null : "anders");
  pruefe("R1e", "KE.leeren() (Gesamtansicht ohne eigene Fahrschule): wieder 6000", await page.evaluate(() => { KE.leeren(); return _undoMs() === 6000; }) ? null : "anders");

  // R2c Hinweis steht wirklich so lange (Zeitgeber des Hinweises)
  await laden([{ schluessel: "rueckgaengig.sekunden", wert: { sekunden: 9 } }], "fs-a");
  const zeiten = await page.evaluate(() => { const w = []; const alt = window.setTimeout; window.setTimeout = function (f, m) { w.push(m); return alt.apply(window, arguments); }; toastUndo("Test gelöscht", () => {}, _undoMs()); window.setTimeout = alt; return w; });
  pruefe("R2c", "toastUndo mit _undoMs(): Zeitgeber 9000", zeiten.includes(9000) ? null : JSON.stringify(zeiten));

  // R3b nachAblauf erst nach Sekunden + 300 ms
  const t = await page.evaluate(async () => {
    const eintrag = { id: "x1" }; DB.films = [eintrag]; const start = Date.now(); let lief = null;
    _loeschenMitRueckgaengig(() => DB.films, eintrag, "Film gelöscht", null, () => { lief = Date.now() - start; });
    await new Promise((r) => setTimeout(r, 9000 + 300 + 900));
    return lief;
  });
  pruefe("R3b", "Absage (nachAblauf) kommt nicht vor 9,3 s und bald danach", t != null && t >= 9250 && t < 10400 ? null : String(t));
  pruefe("R5", "keine JS-Fehler, kein Browser-Dialog", js.length ? js.join(" | ") : null);
  await ctx.close();
} finally {
  await browser.close(); server.close();
}
console.log(`\n${ok} ok, ${bad} Fehler`);
process.exit(bad ? 1 : 0);
