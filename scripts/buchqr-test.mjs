// Buchungs-QR-Test (K3, 🗣 22.11.2026): „Mein Buchungs-QR fürs Auto“ mit eigenem Buchungslink, Schalter/Automatik, druckfertig.
// Q1 Seite über Mehr: großer Code, Link = eigener Buchungslink (Schalter). Q2 Umschalten auf Automatik: Link wechselt, Wahl gemerkt, Stelle bleibt.
// Q3 Nur Automatik-Fahrzeuge → Automatik voreingestellt. Q4 „Bild speichern“ liefert ein PNG mit Code. Q5 Drucken: nur das Druckblatt sichtbar, danach weg.
// Q6 Ohne Buchungslink: Hinweis statt Code. Q7 Leitung/Büro: Code eines anderen Fahrlehrers, eigene Wahl bleibt unberührt.
// Q8 Einstellungen: Verweis da, allgemeiner QR-Ersteller klar als „für andere Links“ beschriftet. Q9 360 px hell/dunkel: kein Querscrollen, Knöpfe ≥ 44 px, Code auf Weiß.
// Nur erfundene Daten, keine Datenbank. Aufruf: NODE_PATH=$(npm root -g) node scripts/buchqr-test.mjs
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
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "index.html" : p));
    res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const SLUG = "erfundener-testlehrer";

async function seite(theme = "light") {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, locale: "de-DE", acceptDownloads: true });
  await ctx.addInitScript((t) => { try { localStorage.setItem("serband-theme", t); localStorage.removeItem("serband-app-version"); localStorage.removeItem("kompass-bq-typ"); } catch (e) {} }, theme);
  const page = await ctx.newPage(); const js = [];
  page.on("pageerror", (e) => js.push(e.message)); page.on("dialog", (d) => { js.push("Dialog: " + d.message()); d.dismiss(); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load" }); await page.waitForTimeout(500);
  await page.evaluate((slug) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
    document.getElementById("bueroNotizPopup")?.remove();
    _authProfile = { id: "erfunden", rolle: "fahrlehrer", slug, name: "Erfundene Lehrkraft", aktiv: true };
    ensureDB(); DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Auto", typ: "schalt" }];
  }, SLUG);
  return { ctx, page, js };
}
const s = await seite();
const { page } = s;
const linkText = () => page.evaluate(() => document.querySelector(".bq-link")?.textContent || "");

await pruefe("Q1", "Mehr › Buchungs-QR fürs Auto: großer Code, Link = eigener Buchungslink (Schalter)", async () => {
  const f = [];
  await page.evaluate(() => tabGo("mehr")); await page.waitForTimeout(300);
  const knopf = await page.$('.drawer-nav [data-nav="buchqr"]');
  if (!knopf) return "kein Menüpunkt";
  await knopf.click(); await page.waitForTimeout(400);
  if ((await page.textContent("#tbTitle")) !== "Buchungs-QR") f.push("Titel " + (await page.textContent("#tbTitle")));
  const l = await linkText();
  if (l !== `https://serband1995-hue.github.io/Fahrlehrer-Kompass-/buchen.html?typ=schalt&lehrer=${SLUG}`) f.push("Link " + l);
  const b = await page.evaluate(() => { const i = document.querySelector(".bq-bild"); return i ? { src: i.src.slice(0, 22), w: i.getBoundingClientRect().width } : null; });
  if (!b || b.src !== "data:image/png;base64," || b.w < 240) f.push("Code fehlt/zu klein " + JSON.stringify(b));
  return f;
});

await pruefe("Q2", "Automatik antippen: Link wechselt, Wahl gemerkt, Seite springt nicht", async () => {
  const f = [];
  await page.evaluate(() => { document.getElementById("view").scrollTop = 60; });
  const y = await page.evaluate(() => document.getElementById("view").scrollTop);
  await page.evaluate(() => document.querySelector('[data-bqtyp="automatik"]').click()); await page.waitForTimeout(200); // ohne automatisches Hinscrollen von Playwright
  if (!/typ=automatik/.test(await linkText())) f.push("Link nicht Automatik");
  if ((await page.evaluate(() => localStorage.getItem("kompass-bq-typ"))) !== "automatik") f.push("Wahl nicht gemerkt");
  if (!(await page.evaluate(() => document.querySelector('[data-bqtyp="automatik"]').classList.contains("on")))) f.push("Knopf nicht markiert");
  const y2 = await page.evaluate(() => document.getElementById("view").scrollTop);
  if (Math.abs(y2 - y) > 2) f.push(`Seite gesprungen ${y} → ${y2}`);
  if (!/Automatik/.test(await page.textContent(".bq-unter"))) f.push("Unterzeile nicht Automatik");
  return f;
});

await pruefe("Q3", "nur Automatik-Fahrzeuge, keine Wahl gemerkt → Automatik voreingestellt", async () => {
  await page.evaluate(() => { localStorage.removeItem("kompass-bq-typ"); _bqWahl = null; DB.workCfg.fahrzeuge = [{ id: "a", name: "Erfundenes Auto", typ: "automatik" }]; routeBuchungsQR(); });
  const l = await linkText();
  await page.evaluate(() => { DB.workCfg.fahrzeuge = [{ id: "fz1", name: "Erfundenes Auto", typ: "schalt" }]; localStorage.removeItem("kompass-bq-typ"); _bqWahl = null; routeBuchungsQR(); });
  if (!/typ=automatik/.test(l)) return "voreingestellt: " + l;
});

await pruefe("Q4", "„Bild speichern“: PNG-Datei mit Code (viele dunkle Punkte, Rand weiß)", async () => {
  const f = [];
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 4000 }).catch(() => null), page.click("#bqBild")]);
  if (!dl) f.push("kein Download"); else if (!/^Buchungs-QR-(Schalter|Automatik)\.png$/.test(dl.suggestedFilename())) f.push("Dateiname " + dl.suggestedFilename());
  const r = await page.evaluate(async () => {
    const url = _bqBildDatei(_bqLink("x", "schalt"), "schalt", "");
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const d = x.getImageData(150, 300, 900, 900).data; let dunkel = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 60) dunkel++;
    const ecke = x.getImageData(5, 5, 1, 1).data[0];
    return { w: img.width, h: img.height, anteil: dunkel / (900 * 900), ecke };
  });
  if (r.w !== 1200 || r.h !== 1500) f.push(`Größe ${r.w}×${r.h}`);
  if (r.anteil < 0.2 || r.anteil > 0.7) f.push("Code fehlt im Bild (Anteil dunkel " + r.anteil.toFixed(2) + ")");
  if (r.ecke < 250) f.push("Rand nicht weiß");
  return f;
});

await pruefe("Q5", "Drucken: nur das Druckblatt mit Code sichtbar, danach wieder weg, kein Dialog", async () => {
  const f = [];
  await page.evaluate(() => { window._gedruckt = 0; window.print = () => { window._gedruckt++; }; });
  await page.click("#bqDrucken"); await page.waitForTimeout(300);
  if ((await page.evaluate(() => window._gedruckt)) !== 1) f.push("print nicht aufgerufen");
  await page.emulateMedia({ media: "print" });
  const r = await page.evaluate(() => {
    const sichtbar = [...document.body.children].filter((e) => getComputedStyle(e).display !== "none").map((e) => e.id || e.tagName);
    const img = document.querySelector("#bqDruck img"); return { sichtbar, img: !!img && img.getBoundingClientRect().width > 300, text: document.getElementById("bqDruck")?.textContent || "" };
  });
  await page.emulateMedia({ media: "screen" });
  if (r.sichtbar.join() !== "bqDruck") f.push("beim Drucken sichtbar: " + r.sichtbar.join(","));
  if (!r.img) f.push("Code im Druck zu klein/fehlt");
  if (!/Fahrstunde buchen/.test(r.text) || !/Schalter/.test(r.text)) f.push("Drucktext: " + r.text.slice(0, 60));
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint"))); await page.waitForTimeout(100);
  if (await page.$("#bqDruck")) f.push("Druckblatt bleibt");
  if (await page.evaluate(() => document.body.classList.contains("bq-drucken"))) f.push("Druck-Klasse bleibt");
  return f;
});

await pruefe("Q5b", "dreimal schnell Drucken: ein Blatt, danach sauber weg; langer Name passt aufs Bild", async () => {
  const f = [];
  await page.evaluate(() => { window.print = () => {}; routeBuchungsQR(); });
  for (let i = 0; i < 3; i++) await page.evaluate(() => document.getElementById("bqDrucken").click());
  await page.waitForTimeout(300);
  if ((await page.$$("#bqDruck")).length !== 1) f.push("nicht genau ein Druckblatt");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint"))); await page.waitForTimeout(100);
  if (await page.$("#bqDruck") || (await page.evaluate(() => document.body.classList.contains("bq-drucken")))) f.push("bleibt nach afterprint");
  const breite = await page.evaluate(async () => {
    const img = new Image(); img.src = _bqBildDatei(_bqLink("x", "schalt"), "schalt", "Maximilian Alexander von Hohenzollern-Sigmaringen"); await img.decode();
    const c = document.createElement("canvas"); c.width = 1200; c.height = 1500; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const z = x.getImageData(0, 1300, 1200, 80).data; let links = 0, rechts = 0;
    for (let yy = 0; yy < 80; yy++) { if (z[(yy * 1200 + 10) * 4] < 128) links++; if (z[(yy * 1200 + 1189) * 4] < 128) rechts++; }
    return { links, rechts };
  });
  if (breite.links || breite.rechts) f.push("langer Name am Rand abgeschnitten");
  return f;
});

await pruefe("Q6", "ohne Buchungslink: Hinweis statt Code", async () => {
  const r = await page.evaluate(() => { const alt = _authProfile.slug; _authProfile.slug = null; routeBuchungsQR(); const t = document.getElementById("view").textContent; const img = !!document.querySelector(".bq-bild"); _authProfile.slug = alt; return { t, img }; });
  if (r.img || !/noch kein Buchungslink/.test(r.t)) return "Hinweis fehlt";
  const v = await page.evaluate(() => { const alt = _authProfile.slug; _authProfile.slug = null; openDrawer(); const h = document.querySelector('#drawer [data-nav="buchqr"]').hidden; _authProfile.slug = alt; openDrawer(); const h2 = document.querySelector('#drawer [data-nav="buchqr"]').hidden; closeDrawer(); return { h, h2 }; });
  if (!v.h || v.h2) return "Menüpunkt-Sichtbarkeit falsch " + JSON.stringify(v);
});

await pruefe("Q7", "Leitung/Büro: Code eines anderen Fahrlehrers mit Name, eigene Wahl bleibt unberührt", async () => {
  const f = [];
  await page.evaluate(() => { localStorage.setItem("kompass-bq-typ", "schalt"); routeBuchungsQR("anderer-erfunden", "Andere Lehrkraft"); });
  if (!/lehrer=anderer-erfunden/.test(await linkText())) f.push("falscher Link");
  if (!/Andere Lehrkraft/.test(await page.textContent("#view"))) f.push("Name fehlt");
  await page.click('[data-bqtyp="automatik"]'); await page.waitForTimeout(150);
  if (!/lehrer=anderer-erfunden/.test(await linkText()) || !/typ=automatik/.test(await linkText())) f.push("Umschalten verliert den Fahrlehrer");
  if ((await page.evaluate(() => localStorage.getItem("kompass-bq-typ"))) !== "schalt") f.push("eigene Wahl überschrieben");
  // danach den eigenen Code öffnen: bleibt Schalter (keine Vermischung mit der Wahl für den Kollegen)
  await page.evaluate(() => routeBuchungsQR()); await page.waitForTimeout(150);
  if (!/typ=schalt/.test(await linkText()) || !new RegExp("lehrer=" + "erfundener-testlehrer").test(await linkText())) f.push("eigener Code übernimmt fremde Wahl: " + (await linkText()));
  // anderer fremder Fahrlehrer: Standard Schalter, nicht die Wahl des ersten Kollegen
  await page.evaluate(() => routeBuchungsQR("dritter-erfunden", "")); await page.waitForTimeout(150);
  if (!/typ=schalt/.test(await linkText())) f.push("Wahl springt auf anderen Kollegen über");
  return f;
});

await pruefe("Q7b", "sehr langer Link: Hinweis statt Absturz, Drucken/Bild gesperrt, Link bleibt sichtbar", async () => {
  const f = [];
  await page.evaluate(() => routeBuchungsQR("x".repeat(400), "")); await page.waitForTimeout(150);
  const r = await page.evaluate(() => ({ titel: document.getElementById("tbTitle").textContent, hinweis: !!document.querySelector(".bq-zulang"), druck: document.getElementById("bqDrucken")?.disabled, link: (document.querySelector(".bq-link")?.textContent || "").length }));
  if (!r.hinweis) f.push("kein Hinweis"); if (!r.druck) f.push("Drucken nicht gesperrt"); if (r.link < 400) f.push("Link fehlt");
  return f;
});

await pruefe("Q8", "Einstellungen: Verweis auf den Buchungs-QR, allgemeiner QR-Ersteller „für andere Links“", async () => {
  const f = [];
  await page.evaluate(() => { _settingsAccOpen = "geld"; routeSettings(); }); await page.waitForTimeout(300);
  const t = await page.textContent("#view");
  if (!/Mein Buchungs-QR fürs Auto/.test(t)) f.push("Verweis fehlt");
  if (!/QR-Code für andere Links/.test(t) || !/Nicht für Buchungen/.test(t)) f.push("allgemeiner QR-Ersteller nicht klar beschriftet");
  return f;
});

await pruefe("Q9", "360 px hell und dunkel: kein Querscrollen, Knöpfe ≥ 44 px, Code auf weißem Grund", async () => {
  const f = [];
  for (const theme of ["light", "dark"]) {
    const t = theme === "light" ? s : await seite("dark");
    await t.page.evaluate(() => routeBuchungsQR()); await t.page.waitForTimeout(300);
    const r = await t.page.evaluate(() => ({
      quer: document.documentElement.scrollWidth - window.innerWidth,
      klein: [...document.querySelectorAll(".bq-knoepfe .btn, .bq-w")].filter((b) => b.getBoundingClientRect().height < 44).length,
      grund: getComputedStyle(document.querySelector(".bq-karte")).backgroundColor,
    }));
    if (r.quer > 0) f.push(`${theme}: ${r.quer} px zu breit`);
    if (r.klein) f.push(`${theme}: ${r.klein} Knöpfe unter 44 px`);
    if (r.grund !== "rgb(255, 255, 255)") f.push(`${theme}: Kartengrund ${r.grund}`);
    if (t !== s) { if (t.js.length) f.push("dunkel: " + t.js[0]); await t.ctx.close(); }
  }
  if (s.js.length) f.push(s.js.slice(0, 2).join(" / "));
  return f;
});

await s.ctx.close(); await browser.close(); server.close();
console.log(`\nBuchungs-QR-Test: ${ok} ok, ${fehler} Fehler.`);
process.exit(fehler ? 1 : 0);
