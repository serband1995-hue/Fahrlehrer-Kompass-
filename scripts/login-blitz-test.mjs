// Login-Blitz-Test (Block 3, Wunsch Serband 15.11.2026): Von der Theorie zurück in die App darf die Anmeldeseite nicht kurz aufblitzen.
// Mit lokal gespeicherter Sitzung ist #loginOverlay schon beim Parsen (vor dem load-Ereignis) versteckt; ohne Sitzung bleibt sie sichtbar.
// Nur erfundene Daten, kein Netz (alle Fremdanfragen blockiert).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/login-blitz-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.KOMPASS_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "index.html" : p)); res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let fehler = 0;
const ok = (t) => console.log("ok  " + t); const bad = (t) => { fehler++; console.log("FEHLER  " + t); };
async function lauf(mitSitzung) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, locale: "de-DE" });
  const page = await ctx.newPage();
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  if (mitSitzung) await page.addInitScript(() => { try { localStorage.setItem("serband-data-owner", "u-erfunden"); localStorage.setItem("sb-test-auth-token", JSON.stringify({ access_token: "x", refresh_token: "y", user: { id: "u-erfunden", email: "test@example.org" } })); } catch (e) {} });
  // Zustand der Anmeldeseite zu jedem Zeitpunkt vor dem load-Ereignis festhalten
  await page.addInitScript(() => { window.__sichtbar = []; const m = () => { const o = document.getElementById("loginOverlay"); if (o) window.__sichtbar.push(getComputedStyle(o).display !== "none"); }; document.addEventListener("DOMContentLoaded", m); const iv = setInterval(m, 20); window.addEventListener("load", () => { m(); setTimeout(() => clearInterval(iv), 3000); }); });
  await page.goto(basis + "index.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({ nachLaden: getComputedStyle(document.getElementById("loginOverlay")).display !== "none", jemalsSichtbar: window.__sichtbar.some(Boolean), proben: window.__sichtbar.length }));
  await ctx.close();
  return r;
}
const mit = await lauf(true);
if (mit.jemalsSichtbar) bad("mit gespeicherter Sitzung war die Anmeldeseite sichtbar (Blitz): " + JSON.stringify(mit)); else ok("mit gespeicherter Sitzung: Anmeldeseite nie sichtbar (" + mit.proben + " Proben vor/um das Laden)");
// Netz fehlt, Sitzung lässt sich nicht prüfen → Sicherheitsnetz/Fehlerpfad muss die Anmeldeseite wieder zeigen (nicht leere App)
const ohne = await lauf(false);
if (!ohne.nachLaden) bad("ohne Sitzung fehlt die Anmeldeseite: " + JSON.stringify(ohne)); else ok("ohne gespeicherte Sitzung: Anmeldeseite sichtbar");
await browser.close(); server.close();
console.log(fehler ? `${fehler} Fehler` : "Login-Blitz-Test: alles in Ordnung.");
process.exit(fehler ? 1 : 0);
