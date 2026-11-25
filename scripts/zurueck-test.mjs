// Zurück-Test (K10, 🗣 22.11.2026): „Auf jeder Seite ein Knopf, der eine Seite zurückspringt.“
// App: Pfeil oben links auf jeder Seite, sobald es eine vorige Seite gibt (auch Hauptseiten); Zurück führt an dieselbe Stelle,
// Android-Zurück ebenso; die doppelte Zurück-Zeile in der Seite ist dann weg; erste Seite nach dem Start ohne Pfeil.
// Büro: „‹ Zurück“ links neben dem Titel, sobald es eine vorige Seite gibt; führt an dieselbe Stelle mit denselben offenen Listen,
// Browser-/Handy-Zurück ebenso. Nur erfundene Daten (Büro: Vorführung). Aufruf: NODE_PATH=$(npm root -g) node scripts/zurueck-test.mjs
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
const warte = (p, ms = 350) => p.waitForTimeout(ms);

async function seite(url, w = 360, h = 740) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, locale: "de-DE" });
  await ctx.addInitScript(() => { try { localStorage.setItem("serband-theme", "light"); localStorage.removeItem("serband-app-version"); localStorage.removeItem("buero-neu-gesehen"); } catch (e) {} });
  const page = await ctx.newPage(); const js = [];
  page.on("pageerror", (e) => js.push(e.message)); page.on("dialog", (d) => { js.push("Dialog: " + d.message()); d.dismiss(); });
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + url, { waitUntil: "load" }); await warte(page, 600);
  return { ctx, page, js };
}

// ---------- App ----------
const a = await seite("index.html");
const p = a.page;
await p.evaluate(() => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const leer = async () => ({ data: [], error: null });
  const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
  window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: leer } });
  document.getElementById("bueroNotizPopup")?.remove();
  _navStack.length = 0; routeDashboard();
});
await warte(p);
const pfeil = () => p.evaluate(() => { const b = document.getElementById("navBackBtn"); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left }; });
const titel = () => p.evaluate(() => document.getElementById("tbTitle").textContent);
const y = () => p.evaluate(() => document.getElementById("view").scrollTop);

await pruefe("Z1", "erste Seite nach dem Start: kein Pfeil (es gibt keine vorige Seite)", async () => { if (await pfeil()) return "Pfeil sichtbar"; });

await pruefe("Z2", "Einstellungen weit unten → Reiter „Schüler“ → Pfeil oben links (≥ 44 px) → zurück an dieselbe Stelle, gleicher Bereich offen", async () => {
  const f = [];
  await p.evaluate(() => { _settingsAccOpen = "app"; routeSettings(); }); await warte(p);
  await p.evaluate(() => { document.getElementById("view").scrollTop = 600; }); await warte(p, 150);
  const vor = await y(); if (vor < 400) f.push("Testaufbau: nur " + vor + " px gescrollt");
  await p.click('#tabbar [data-tab="schueler"]'); await warte(p);
  if ((await titel()) !== "Schüler") f.push("Reiter öffnet " + (await titel()));
  const pf = await pfeil();
  if (!pf) f.push("kein Pfeil auf der Hauptseite Schüler"); else { if (pf.h < 44 || pf.w < 44) f.push(`Pfeil ${pf.w}×${pf.h}`); if (pf.x > 80) f.push("Pfeil nicht links"); }
  const ansage = await p.evaluate(() => document.getElementById("navBackBtn").getAttribute("aria-label"));
  if (ansage !== "Zurück zu Einstellungen") f.push("Ansage „" + ansage + "“");
  await p.click("#navBackBtn"); await warte(p, 600);
  if ((await titel()) !== "Einstellungen") f.push("zurück zu " + (await titel()));
  const nach = await y(); if (Math.abs(nach - vor) > 3) f.push(`Stelle ${vor} → ${nach}`);
  if (!(await p.evaluate(() => document.querySelector('.set-acc[data-acckey="app"]')?.classList.contains("open")))) f.push("Bereich „App“ nicht mehr offen");
  return f;
});

await pruefe("Z3", "Android-Zurück (Verlauf) führt ebenso an dieselbe Stelle", async () => {
  const f = [];
  await p.evaluate(() => { document.getElementById("view").scrollTop = 450; }); await warte(p, 150);
  const vor = await y();
  await p.evaluate(() => routePlanVorlagen()); await warte(p);
  await p.evaluate(() => window.dispatchEvent(new PopStateEvent("popstate"))); await warte(p, 600);
  if ((await titel()) !== "Einstellungen") f.push("zurück zu " + (await titel()));
  const nach = await y(); if (Math.abs(nach - vor) > 3) f.push(`Stelle ${vor} → ${nach}`);
  return f;
});

await pruefe("Z4", "Unterseite: Pfeil oben da, doppelte Zurück-Zeile in der Seite ausgeblendet", async () => {
  await p.evaluate(() => routePlanVorlagen()); await warte(p);
  const r = await p.evaluate(() => ({ pfeil: !document.getElementById("navBackBtn").hidden,
    zeile: [...document.querySelectorAll("#view .back-row .back-btn, #view #backBtn")].filter((e) => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.display !== "none" && b.width > 0; }).length }));
  const f = []; if (!r.pfeil) f.push("kein Pfeil"); if (r.zeile) f.push(r.zeile + " Zurück-Knopf in der Seite sichtbar"); return f;
});

await pruefe("Z5", "neue Seiten bekommen den Pfeil von selbst (jede route*-Seite, die nach einer anderen geöffnet wird)", async () => {
  const r = await p.evaluate(() => {
    const ohne = [];
    for (const n of ["routeTodos", "routeStats", "routeArchive", "routeNeuigkeiten", "routeKalender", "routePruefungen"]) {
      if (typeof window[n] !== "function") continue; routeDashboard(); window[n]();
      if (document.getElementById("navBackBtn").hidden) ohne.push(n);
    }
    return ohne;
  });
  if (r.length) return "ohne Pfeil: " + r.join(", ");
});

await pruefe("Z6", "quer 740×360: Pfeil sichtbar und antippbar", async () => {
  await p.setViewportSize({ width: 740, height: 360 }); await p.evaluate(() => { routeDashboard(); routeTodos(); }); await warte(p);
  const pf = await pfeil(); await p.setViewportSize({ width: 360, height: 740 });
  if (!pf || pf.h < 44) return "Pfeil " + JSON.stringify(pf);
});
await pruefe("Z8", "Prüfung eintragen, Schritt 2: Pfeil geht einen Schritt zurück (Auswahl bestanden/nicht bestanden), nicht aus der Prüfung", async () => {
  const f = [];
  const da = await p.evaluate(() => {
    ensureAusbildungsplaene(); ensureDB();
    const c = DB.ausbildungsplaene.find((x) => x.standard) || DB.ausbildungsplaene[0];
    const st = { id: "zt1", name: "Erfundene Testperson", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" };
    st.plan.sonder = { ueberland: [], autobahn: [], nacht: [] }; st.todos = []; DB.students = [st]; DB.exams = [];
    routeDetail("zt1"); routeExam("zt1"); return !!document.getElementById("pickPass");
  });
  if (!da) return "Prüfung Schritt 1 nicht erreicht";
  await p.click("#pickPass"); await warte(p, 250);
  if (!(await p.$("#saveExam"))) return "Schritt 2 nicht erreicht";
  await p.click("#navBackBtn"); await warte(p, 300);
  if (!(await p.$("#pickPass"))) f.push("Pfeil verlässt die Prüfung (Titel " + (await titel()) + ")");
  await p.click("#navBackBtn"); await warte(p, 300);
  if (await p.$("#pickPass")) f.push("zweiter Pfeil bleibt in der Prüfung");
  return f;
});

await pruefe("Z9", "Zurück auf die Akte eines Schülers, den es nicht mehr gibt: wird übersprungen, keine falsche Stelle", async () => {
  const f = [];
  await p.evaluate(() => { _navStack.length = 0; routeHome(); });
  await warte(p, 200);
  await p.evaluate(() => { routeDetail("zt1"); document.getElementById("view").scrollTop = 300; routeTodos(); DB.students = []; });
  await p.click("#navBackBtn"); await warte(p, 400);
  const t = await titel();
  if (t === "To-Dos") f.push("Pfeil ohne Wirkung");
  if (/Schülerdatei/.test(t)) f.push("zeigt gelöschte Akte");
  if (await y() > 5) f.push("falsche Stelle " + (await y()));
  return f;
});
await pruefe("Z10", "Wechsel eigene Ansicht ↔ ganze Fahrschule: Pfeil überspringt Seiten der anderen Ansicht (kein toter Tipp)", async () => {
  const r = await p.evaluate(() => {
    _navStack.length = 0; routeDashboard(); routeKalender();
    _navStack.push({ name: "routeFahrschuleDashboard", fn: () => {}, args: [], agg: true }); // Seite der Gesamtansicht
    routeTodos(); const vor = document.getElementById("tbTitle").textContent;
    navZurueck(); return { vor, nach: document.getElementById("tbTitle").textContent, len: _navStack.length };
  });
  if (r.nach !== "Kalender") return `nach Zurück „${r.nach}“ statt „Kalender“`;
});
await pruefe("Z11", "Kalender blättern ist keine neue Seite: Pfeil führt sofort zurück, Kalender kommt mit der zuletzt gezeigten Woche wieder; Woche → Tag bleibt ein Schritt", async () => {
  const f = [];
  await p.evaluate(() => { _navStack.length = 0; routeDashboard(); _calView = "woche"; _calDate = todayISO(); routeKalender(); });
  await warte(p, 300);
  const len0 = await p.evaluate(() => _navStack.length);
  for (let i = 0; i < 3; i++) { await p.evaluate(() => document.getElementById("calNext").click()); await warte(p, 150); }
  const nachBlaettern = await p.evaluate(() => ({ len: _navStack.length, datum: _calDate }));
  if (nachBlaettern.len !== len0) f.push(`Blättern legt ${nachBlaettern.len - len0} Zurück-Einträge an`);
  await p.click("#navBackBtn"); await warte(p, 300);
  if ((await titel()) !== "Heute") f.push("Pfeil führt nicht sofort aus dem Kalender (" + (await titel()) + ")");
  await p.click('#tabbar [data-tab="kalender"]'); await warte(p, 300);
  if ((await p.evaluate(() => _calDate)) !== nachBlaettern.datum) f.push("Kalender kommt nicht mit der zuletzt gezeigten Woche");
  // Woche → Tag (antippen) bleibt ein eigener Schritt
  await p.evaluate(() => document.querySelector("[data-calday]")?.click()); await warte(p, 300);
  await p.click("#navBackBtn"); await warte(p, 300);
  if ((await p.evaluate(() => _calView)) !== "woche" || (await titel()) !== "Kalender") f.push("Tag → Zurück: nicht wieder Woche");
  return f;
});
await pruefe("Z12", "E1: Knopf „Prüfer“ (Klick-Ereignis als Argument) → Prüfer-Liste → Pfeil führt zurück zu Prüfungen, kein Ereignis im Verlauf", async () => {
  const f = [];
  await p.evaluate(() => { _navStack.length = 0; routeDashboard(); routePruefungen(); }); await warte(p, 300);
  const t0 = await titel();
  await p.evaluate(() => document.getElementById("openPruefer").click()); await warte(p, 300);
  const eintrag = await p.evaluate(() => { const e = _navStack[_navStack.length - 1]; return { name: e && e.name, args: e ? e.args.length : -1 }; });
  if (eintrag.name !== "routePrueferListe") f.push("Prüfer-Liste nicht offen (" + eintrag.name + ")");
  if (eintrag.args !== 0) f.push(`Verlauf hat ${eintrag.args} Argument(e) statt 0`);
  await p.click("#navBackBtn"); await warte(p, 300);
  if ((await titel()) !== t0) f.push(`Pfeil führt nicht zurück zu „${t0}“ (${await titel()})`);
  // Fable: Statistik → „Prüfer“ (routePruefer leitet weiter) → ein Tipp zurück reicht
  await p.evaluate(() => { _navStack.length = 0; routeDashboard(); routeStats(); }); await warte(p, 300);
  const s0 = await titel(), n0 = await p.evaluate(() => _navStack.length);
  await p.evaluate(() => document.getElementById("toPruefer").click()); await warte(p, 300);
  const n1 = await p.evaluate(() => _navStack.length);
  if (n1 !== n0 + 1) f.push(`Statistik → Prüfer legt ${n1 - n0} Einträge an statt 1`);
  await p.click("#navBackBtn"); await warte(p, 300);
  if ((await titel()) !== s0) f.push(`Statistik → Prüfer → Zurück: nicht bei „${s0}“ (${await titel()})`);
  return f;
});
await pruefe("Z7", "App: keine JS-Fehler, kein Dialog", () => a.js);
await a.ctx.close();

// ---------- Büro ----------
for (const [w, h, n] of [[360, 740, "Handy"], [1024, 768, "Tablet quer"], [1280, 800, "PC"]]) {
  const b = await seite("buero.html?vorfuehrung", w, h);
  const q = b.page;
  await q.waitForFunction(() => window.S && S.geladenAm, null, { timeout: 8000 }).catch(() => {});
  const knopf = () => q.evaluate(() => { const k = document.getElementById("kopfZurueck"); if (!k || k.hidden) return null; const r = k.getBoundingClientRect(); return { h: r.height, w: r.width }; });
  await pruefe(`B1 [${n}]`, "Büro: beim Start kein Zurück-Knopf; Tipp auf „Heute“ (dieselbe Seite) auch nicht", async () => {
    if (await knopf()) return "Knopf sichtbar";
    await q.evaluate(() => { location.hash = "heute"; }); await warte(q, 300);
    if (await knopf()) return "Knopf nach Tipp auf die Startseite sichtbar";
  });
  await pruefe(`B2 [${n}]`, "Büro: Bereich mit Liste, weit unten, Liste offen → anderer Bereich → „‹ Zurück“ → gleiche Stelle, Liste offen", async () => {
    const f = [];
    const ids = await q.evaluate(() => BEREICHE.map((x) => x.id));
    let mitListe = null;
    for (const id of ids) { await q.evaluate((id) => { location.hash = id; }, id); await warte(q, 250); if (await q.evaluate(() => [...document.querySelectorAll("#ansicht details")].some((d) => !d.open))) { mitListe = id; break; } }
    if (!mitListe) return "kein Bereich mit Klapp-Liste in der Vorführung";
    await q.evaluate(() => { [...document.querySelectorAll("#ansicht details")].find((d) => !d.open).open = true; document.body.style.minHeight = "4000px"; window.scrollTo(0, 300); });
    await warte(q, 150); const vor = await q.evaluate(() => window.scrollY);
    const anderer = ids.find((x) => x !== mitListe);
    await q.evaluate((id) => { location.hash = id; }, anderer); await warte(q, 300);
    const k = await knopf(); if (!k) f.push("kein Zurück-Knopf"); else if (k.h < 44) f.push("Knopf " + k.h + " px hoch");
    await q.click("#kopfZurueck"); await warte(q, 500);
    if ((await q.evaluate(() => document.body.dataset.bereich)) !== mitListe) f.push("zurück zu " + (await q.evaluate(() => document.body.dataset.bereich)));
    const nach = await q.evaluate(() => window.scrollY); if (Math.abs(nach - vor) > 3) f.push(`Stelle ${vor} → ${nach}`);
    if (!(await q.evaluate(() => [...document.querySelectorAll("#ansicht details")].some((d) => d.open)))) f.push("Liste wieder zu");
    // Browser-/Handy-Zurück ebenso
    await q.evaluate((id) => { window.scrollTo(0, 200); location.hash = id; }, anderer); await warte(q, 300);
    await q.goBack(); await warte(q, 500);
    if ((await q.evaluate(() => document.body.dataset.bereich)) !== mitListe) f.push("Browser-Zurück landet falsch");
    const nach2 = await q.evaluate(() => window.scrollY); if (Math.abs(nach2 - 200) > 3) f.push(`Browser-Zurück Stelle 200 → ${nach2}`);
    const quer = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (quer > 0) f.push(quer + " px zu breit");
    // Kopfzeile: Zurück-Knopf und Titel stoßen nicht mit dem Vorführungs-Schild zusammen
    await q.evaluate(() => { location.hash = "fristen"; }); await warte(q, 300);
    const ueber = await q.evaluate(() => { const rc = (id) => document.getElementById(id)?.getBoundingClientRect(); const v = rc("vorfuehrung");
      const x = (a, b) => a && b && b.width && a.width && !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      return x(rc("titel"), v) || x(rc("kopfZurueck"), v); });
    if (ueber) f.push("Kopfzeile überlappt");
    // Titel bricht nicht mitten im Wort um (auch mit Zurück-Knopf daneben)
    await q.evaluate(() => { location.hash = "neuigkeiten"; }); await warte(q, 300);
    const zeilen = await q.evaluate(() => { const h = document.getElementById("titel"); const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.2; return Math.round(h.getBoundingClientRect().height / lh); });
    if (zeilen > 1) f.push(`Titel „Neuigkeiten“ in ${zeilen} Zeilen`);
    return f;
  });
  await pruefe(`B4 [${n}]`, "Büro: Suche/Filter ändern die Adresse → anderer Bereich → Zurück: Suche und Stelle wieder da", async () => {
    const f = [];
    await q.evaluate(() => { location.hash = "fristen"; }); await warte(q, 300);
    await q.fill("#fristenSuche", "zz"); await warte(q, 500);
    await q.evaluate(() => { document.body.style.minHeight = "4000px"; window.scrollTo(0, 250); }); await warte(q, 100);
    const hashVor = await q.evaluate(() => location.hash);
    if (!/suche=zz/.test(hashVor)) f.push("Testaufbau: Suche nicht in der Adresse (" + hashVor + ")");
    await q.evaluate(() => { location.hash = "kalender"; }); await warte(q, 300);
    await q.click("#kopfZurueck"); await warte(q, 500);
    const r = await q.evaluate(() => ({ hash: location.hash, y: window.scrollY, suche: document.getElementById("fristenSuche")?.value }));
    if (r.hash !== hashVor) f.push("Adresse " + r.hash);
    if (Math.abs(r.y - 250) > 3) f.push("Stelle 250 → " + r.y);
    if (r.suche !== "zz") f.push("Suche weg");
    return f;
  });
  await pruefe(`B5 [${n}]`, "Büro: A → B → Menü A ist kein Zurück (Seite neu, Zurück-Knopf bleibt, führt zu B)", async () => {
    const f = [];
    await q.evaluate(() => { location.hash = "kalender"; }); await warte(q, 300);
    await q.evaluate(() => { window.scrollTo(0, 300); location.hash = "schueler"; }); await warte(q, 300);
    await q.evaluate(() => { location.hash = "kalender"; }); await warte(q, 400);
    if (!(await knopf())) f.push("kein Zurück-Knopf nach Menü-Tipp");
    await q.click("#kopfZurueck"); await warte(q, 400);
    if ((await q.evaluate(() => document.body.dataset.bereich)) !== "schueler") f.push("Zurück führt zu " + (await q.evaluate(() => document.body.dataset.bereich)));
    return f;
  });
  await pruefe(`B6 [${n}]`, "Büro: Kalender blättern ist keine neue Seite; „‹ Zurück“ führt sofort zum vorigen Bereich; über das Menü kommt der zuletzt gezeigte Tag", async () => {
    const f = [];
    await q.evaluate(() => { location.hash = "schueler"; }); await warte(q, 300);
    await q.evaluate(() => { location.hash = "kalender"; }); await warte(q, 300);
    const vor = await q.evaluate(() => location.hash);
    for (let i = 0; i < 3; i++) { const ok = await q.evaluate(() => { const k = [...document.querySelectorAll("#ansicht [data-ktag]")].pop(); if (!k) return false; k.click(); return true; }); if (!ok) { f.push("kein Blätter-Knopf"); break; } await warte(q, 200); }
    const geblaettert = await q.evaluate(() => location.hash);
    if (geblaettert === vor) f.push("Testaufbau: Blättern ändert nichts");
    await q.click("#kopfZurueck"); await warte(q, 400);
    if ((await q.evaluate(() => document.body.dataset.bereich)) !== "schueler") f.push("Zurück führt zu " + (await q.evaluate(() => location.hash)));
    await q.evaluate(() => { location.hash = "kalender"; }); await warte(q, 400);
    if ((await q.evaluate(() => location.hash)) !== geblaettert) f.push("Menü: nicht der zuletzt gezeigte Tag (" + (await q.evaluate(() => location.hash)) + ")");
    return f;
  });
  await pruefe(`B3 [${n}]`, "Büro: keine JS-Fehler, kein Dialog", () => b.js);
  await b.ctx.close();
}

await browser.close(); server.close();
console.log(`\nZurück-Test: ${ok} ok, ${fehler} Fehler.`);
process.exit(fehler ? 1 : 0);
