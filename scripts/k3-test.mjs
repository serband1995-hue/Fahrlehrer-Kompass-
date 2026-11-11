// K3-Test (Kür): Teile der Fahrlehrer-App aus Schritt K3. Lokal, erfundene Daten, kein Netz.
//  (a) BR11: nach dem Video-Tipp eine klare Rückmeldung für jede Antwort der Akademie (auch 403/429 und ohne Netz)
//  (b) BR1/3b: Lernstand „X von Y Videos geöffnet“, Zahlen erzwungen, unmögliche Werte zeigen nichts
//  (c) GK23: Tagesansicht von heute springt zur Jetzt-Linie, andere Tage bleiben oben; Auffrischen hält die Stelle
//  (d) GK16: Eingabefelder (Anmeldung, Schülersuche, Formular) mit 16 px Schrift
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/k3-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const TAG = "2026-11-11";

async function seite(w, h, jetzt) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(new Date(jetzt));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (ok) => ok({ data: [], error: null }) : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    window.__antwort = null;
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer },
      functions: { invoke: async () => {
        const a = window.__antwort; if (a && a.wirf) throw new Error("offline");
        // wie supabase-js bei Status 4xx/5xx: kein data, error.context ist die Antwort
        if (a && a.httpStatus) return { data: null, error: { name: "FunctionsHttpError", message: "Edge Function returned a non-2xx status code", context: new Response(JSON.stringify(a.httpBody), { status: a.httpStatus, headers: { "Content-Type": "application/json" } }) } };
        return a; } } });
  });
  return { ctx, page, jsFehler };
}

// ---------- (d) GK16: vor dem Ausblenden der Anmeldung messen ----------
{
  const { ctx, page, jsFehler } = await seite(390, 844, "2026-11-11T15:40:00+01:00");
  await pruefe("D1", "Felder der Anmeldung, Schülersuche und „Neuer Schüler“ haben mindestens 16 px Schrift", async () => {
    const f = [];
    const login = await page.evaluate(() => [...document.querySelectorAll(".lo-field input")].map((i) => parseFloat(getComputedStyle(i).fontSize)));
    if (!login.length) f.push("keine Anmelde-Felder gefunden");
    login.forEach((px, i) => { if (px < 16) f.push(`Anmeldung Feld ${i + 1}: ${px}px`); });
    const r = await page.evaluate(async () => {
      for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
      ensureDB(); DB.students = [{ id: "s1", name: "Lena Muster", form: "B", created: Date.now(), telefon: "0170 1234567" }];
      const a = [];
      routeHome(); await new Promise((ok) => setTimeout(ok, 300));
      document.querySelectorAll(".search-wrap input").forEach((i) => a.push(["Suche", parseFloat(getComputedStyle(i).fontSize)]));
      return a;
    });
    if (!r.length) f.push("keine Schülersuche gefunden");
    r.forEach(([n, px]) => { if (px < 16) f.push(`${n}: ${px}px`); });
    const basisPx = await page.evaluate(() => { const i = document.createElement("input"); document.body.appendChild(i); const px = parseFloat(getComputedStyle(i).fontSize); i.remove(); return px; });
    if (basisPx < 16) f.push("Grundschrift der Felder " + basisPx + "px");
    return f;
  });
  await pruefe("D2", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
}

// ---------- (a) BR11 und (b) BR1 ----------
{
  const { ctx, page, jsFehler } = await seite(390, 844, "2026-11-11T15:40:00+01:00");
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; } });
  const tipp = async (antwort, s) => page.evaluate(async ({ antwort, s }) => {
    window.__antwort = antwort;
    const t = document.getElementById("toast"); t.textContent = ""; t.classList.remove("show");
    await _pushAkademieVideo(s || { id: "s1", name: "Lena Muster", telefon: "0170 1234567" }, { stufe: "Grundstufe", tag: "t1" });
    return { text: t.textContent, sichtbar: t.classList.contains("show") };
  }, { antwort, s });
  const ctxAntwort = (status, body) => ({ httpStatus: status, httpBody: body });
  const faelle = [
    ["A1", "Push angekommen", { data: { ok: true, push_gesendet_an: 2, empfehlung_gespeichert: true }, error: null }, /Video-Tipp an Lena geschickt/],
    ["A2", "ohne Push-Abo", { data: { ok: true, push_gesendet_an: 0, hinweis: "kein_push_abo", empfehlung_gespeichert: true }, error: null }, /Handy-Nachrichten sind aus.*nächsten Anmelden/],
    ["A3", "kein Zugang (geparkt)", { data: { ok: true, push_gesendet_an: 0, empfehlung_geparkt: true, grund: "kein_zugang" }, error: null }, /noch keinen Akademie-Zugang.*liegt bereit/],
    ["A4", "Zugang gesperrt (geparkt)", { data: { ok: true, push_gesendet_an: 0, empfehlung_geparkt: true, grund: "zugang_gesperrt" }, error: null }, /gesperrt.*liegt bereit/],
    ["A5", "Zugang abgelaufen (geparkt)", { data: { ok: true, push_gesendet_an: 0, empfehlung_geparkt: true, grund: "zugang_abgelaufen" }, error: null }, /abgelaufen.*verlängert/],
    ["A6", "Sperre 2 Minuten (429)", ctxAntwort(429, { ok: false, error: "cooldown_aktiv" }), /nicht geschickt.*2 Minuten/],
    ["A7", "anderer Fahrlehrer (403)", ctxAntwort(403, { ok: false, error: "fahrlehrer_stimmt_nicht" }), /nicht geschickt.*anderen Fahrlehrer/],
    ["A8", "eigenes Konto ohne Fahrschule (403)", ctxAntwort(403, { ok: false, error: "keine_fahrschule" }), /Konto ist für die Akademie nicht freigeschaltet/],
    ["A9", "ohne Netz", { wirf: true }, /nicht geschickt.*nicht erreichbar/],
    ["A10", "Fehler ohne lesbare Antwort", { data: null, error: { name: "FunctionsFetchError" } }, /nicht geschickt.*nicht erreichbar/],
  ];
  for (const [id, n, antwort, muster] of faelle) {
    await pruefe(id, `Video-Tipp: ${n} → klare Meldung`, async () => {
      const r = await tipp(antwort);
      if (!r.sichtbar) return "keine Meldung sichtbar";
      if (!muster.test(r.text)) return "Text: " + r.text;
    });
  }
  await pruefe("A11", "ohne Handynummer: Hinweis statt stillem Abbruch", async () => {
    const r = await tipp({ data: { ok: true, push_gesendet_an: 1 }, error: null }, { id: "s2", name: "Max Muster", telefon: "" });
    if (!/keine Handynummer/.test(r.text) || !/Max/.test(r.text)) return "Text: " + r.text;
  });
  await pruefe("A12", "Name mit Sonderzeichen wird als Text gezeigt (kein HTML)", async () => {
    const r = await tipp({ data: { ok: true, push_gesendet_an: 1 }, error: null }, { id: "s3", name: "<b>Zoë</b> Muster", telefon: "0170 1" });
    const html = await page.evaluate(() => document.getElementById("toast").innerHTML);
    if (/<b>/.test(html)) return "HTML im Toast: " + html;
  });

  const lern = async (fortschritt, ok = true) => page.evaluate(async ({ fortschritt, ok }) => {
    let box = document.getElementById("akademieFortschrittSlot");
    if (!box) { box = document.createElement("div"); box.id = "akademieFortschrittSlot"; document.body.appendChild(box); }
    box.innerHTML = "";
    window.__antwort = { data: { ok, fortschritt }, error: null };
    await _fillAkademieFortschritt({ id: "s1", telefon: "0170 1234567" });
    return box.innerText.replace(/\s+/g, " ").trim();
  }, { fortschritt, ok });
  const lernFaelle = [
    ["B1", "12 von 42", { gesehen: 12, gesamt: 42 }, /^🎓 Fahr-Akademie 12 von 42 Videos geöffnet$/],
    ["B2", "Zahlen als Text", { gesehen: "7", gesamt: "42" }, /7 von 42 Videos geöffnet/],
    ["B3", "alle (überzählt wird geklemmt)", { gesehen: 50, gesamt: 42 }, /Alle 42 Videos geöffnet ✓/],
    ["B4", "gesamt 0", { gesehen: 3, gesamt: 0 }, /^$/],
    ["B5", "kaputte Zahl", { gesehen: "abc", gesamt: 42 }, /^$/],
    ["B6", "negativ", { gesehen: -2, gesamt: 42 }, /^$/],
    ["B7", "Code statt Zahl", { gesehen: "<img src=x onerror=alert(1)>", gesamt: 42 }, /^$/],
  ];
  for (const [id, n, f, muster] of lernFaelle) {
    await pruefe(id, `Lernstand: ${n}`, async () => {
      const t = await lern(f);
      if (!muster.test(t)) return "Text: „" + t + "“";
      if (/gesehen/.test(t)) return "noch „gesehen“: " + t;
    });
  }
  await pruefe("B8", "im ganzen Code kein „Videos gesehen“ mehr", async () => {
    const quelle = await (await fetch(basis + "index.html")).text();
    if (/Videos gesehen/.test(quelle)) return "„Videos gesehen“ steht noch im Code";
  });
  await pruefe("A13", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
}

// ---------- (c) GK23: Tagesansicht ----------
for (const [w, h, n] of [[360, 780, "360 hoch"], [412, 915, "412 hoch"], [740, 360, "quer 740"]]) {
  const { ctx, page, jsFehler } = await seite(w, h, "2026-11-11T15:40:00+01:00");
  await page.evaluate(() => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    ensureDB();
  });
  const lage = () => page.evaluate(() => {
    const v = document.getElementById("view"), now = document.querySelector(".ct-now");
    const vb = v.getBoundingClientRect();
    return { scroll: v.scrollTop, now: now ? now.getBoundingClientRect().top - vb.top : null, hoehe: v.clientHeight };
  });
  await pruefe(`C1 [${n}]`, "heute um 15:40: Jetzt-Linie ist ohne Wischen zu sehen", async () => {
    await page.evaluate((t) => routeKalender("tag", t), TAG); await page.waitForTimeout(250);
    const r = await lage();
    if (r.now === null) return "keine Jetzt-Linie";
    if (r.scroll <= 0) return "nicht gesprungen (scrollTop 0)";
    if (r.now < 0 || r.now > r.hoehe - 20) return `Linie nicht im Bild (bei ${Math.round(r.now)} von ${r.hoehe} px)`;
  });
  await pruefe(`C2 [${n}]`, "Auffrischen hält die Stelle, die der Fahrlehrer gewählt hat", async () => {
    await page.evaluate(() => { document.getElementById("view").scrollTop = 120; routeKalenderRefresh(); }); await page.waitForTimeout(150);
    const r = await lage();
    if (Math.abs(r.scroll - 120) > 2) return "scrollTop " + r.scroll + " statt 120";
  });
  await pruefe(`C3 [${n}]`, "anderer Tag beginnt oben", async () => {
    await page.evaluate(() => routeKalender("tag", "2026-11-12")); await page.waitForTimeout(150);
    const r = await lage();
    if (r.scroll !== 0) return "scrollTop " + r.scroll;
  });
  await pruefe(`C4 [${n}]`, "keine Seite breiter als der Bildschirm, keine JS-Fehler", async () => {
    await page.evaluate((t) => routeKalender("tag", t), TAG); await page.waitForTimeout(150);
    const breit = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    return [...(breit ? ["seitlich wischbar"] : []), ...jsFehler];
  });
  await ctx.close();
}
{
  // Früh am Morgen (vor der Achse) und spät: nichts kaputt, Seite beginnt oben
  const { ctx, page, jsFehler } = await seite(390, 844, "2026-11-11T06:10:00+01:00");
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; } ensureDB(); });
  await pruefe("C5", "06:10 Uhr (vor der Zeitachse): Tagesansicht beginnt oben, keine Fehler", async () => {
    await page.evaluate((t) => routeKalender("tag", t), TAG); await page.waitForTimeout(200);
    const s = await page.evaluate(() => document.getElementById("view").scrollTop);
    return [...(s !== 0 ? ["scrollTop " + s] : []), ...jsFehler];
  });
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\nK3-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
