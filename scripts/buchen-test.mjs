// Test der Buchungsseite buchen.html (Z5: ?lehrer= geht an alle Anfragen, Z11: Meldung ohne Netz / bei Serverfehler).
// Die Buchungs-Schnittstelle wird im Browser nachgebaut, nichts geht ins Netz.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/buchen-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = process.env.APP_ROOT || join(fileURLToPath(new URL(".", import.meta.url)), "..");
const server = createServer(async (req, res) => {
  try { res.writeHead(200, { "Content-Type": "text/html" }); res.end(await readFile(join(ROOT, req.url.split("?")[0]))); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let rot = 0;
const fehler = (t) => { rot++; console.log("ROT   " + t); };
const ok = (t) => console.log("GRÜN  " + t);
const morgen = new Date(Date.now() + 2 * 86400000); const iso = morgen.toISOString().slice(0, 10);

async function seite(modus, url = "buchen.html?typ=schalt&lehrer=kollege-muster") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const page = await ctx.newPage();
  const anfragen = [], js = [];
  page.on("pageerror", (e) => js.push(String(e)));
  await page.route(/functions\/v1\/public-booking/, async (r) => {
    anfragen.push(r.request().url());
    if (modus === "offline") return r.abort("internetdisconnected");
    if (modus === "500") return r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Da ist etwas schiefgelaufen." }) });
    if (modus === "unbekannt") return r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Fahrlehrer nicht gefunden" }) });
    const u = new URL(r.request().url()); const a = u.searchParams.get("action");
    if (a === "availability") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ days: { [iso]: true } }) });
    if (a === "slots") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ slots: [{ von: "10:00", bis: "11:30" }] }) });
    if (a === "book") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, storno_token: "00000000-0000-0000-0000-000000000000" }) });
    return r.fulfill({ status: 400, body: "{}" });
  });
  await page.goto(basis + url);
  await page.waitForTimeout(400);
  return { page, ctx, anfragen, js };
}

// Z5: lehrer an allen drei Anfragen, kein fester Name im Kopf
{
  const { page, ctx, anfragen, js } = await seite("normal");
  if (morgen.getMonth() !== new Date().getMonth()) { await page.click("#mNext"); await page.waitForTimeout(300); }
  await page.click(`.cal-day.frei[data-iso="${iso}"]`); await page.waitForTimeout(300);
  await page.click(".slot-btn"); await page.fill("#fName", "Test Muster"); await page.click("#bookBtn"); await page.waitForTimeout(300);
  const ohne = anfragen.filter((u) => !/[?&]lehrer=kollege-muster(&|$)/.test(u));
  const arten = new Set(anfragen.map((u) => new URL(u).searchParams.get("action")));
  if (ohne.length || !["availability", "slots", "book"].every((a) => arten.has(a))) fehler("Z5 lehrer fehlt an Anfragen: " + JSON.stringify(ohne.length ? ohne : [...arten]));
  else ok("Z5 lehrer geht an alle Anfragen");
  const kopf = await page.textContent(".head");
  if (/Serband/.test(kopf)) fehler("Z5 fester Name im Kopf: " + kopf); else ok("Z5 kein fester Name im Kopf");
  if (!(await page.isVisible("#step4"))) fehler("Buchung nicht abgeschlossen"); else ok("Buchung läuft durch");
  if (js.length) fehler("JS-Fehler: " + js.join(" | "));
  await ctx.close();
}
// Z11: ohne Netz und bei Serverfehler eine Meldung mit „Nochmal“
for (const modus of ["offline", "500"]) {
  const { page, ctx, js } = await seite(modus);
  const t = (await page.isVisible("#monthErr")) ? await page.textContent("#monthErr") : "";
  if (!/nochmal/i.test(t)) fehler(`Z11 (${modus}) keine Meldung im Kalender`); else ok(`Z11 (${modus}) Meldung mit „Nochmal versuchen“`);
  if (js.length) fehler(`Z11 (${modus}) JS-Fehler: ` + js.join(" | "));
  await ctx.close();
}
// Unbekannter Fahrlehrer: „Diesen Buchungslink gibt's nicht“
{
  const { page, ctx } = await seite("unbekannt");
  if (!(await page.isVisible("#stepErr"))) fehler("Unbekannter Fahrlehrer zeigt keinen Hinweis"); else ok("Unbekannter Fahrlehrer: Link-Hinweis");
  await ctx.close();
}
// Ohne lehrer: Anfrage ohne lehrer (Standard-Fahrlehrer wie bisher)
{
  const { ctx, anfragen } = await seite("normal", "buchen.html?typ=automatik");
  if (anfragen.some((u) => /lehrer=/.test(u))) fehler("Ohne lehrer wird trotzdem lehrer geschickt"); else ok("Ohne lehrer: Anfrage wie bisher");
  await ctx.close();
}
await browser.close(); server.close();
console.log(rot ? `Buchen-Test: ${rot} rot.` : "Buchen-Test: alles in Ordnung.");
process.exit(rot ? 1 : 0);
