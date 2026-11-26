// Zugang bearbeiten / löschen (🗣 Serband 21.11.2026) im echten Browser, mit erfundenen Daten (Nachname „Muster“).
// Teil A: Fahrlehrer-App (index.html), Leitungs-Sicht „Fahrlehrer“ bei 360 px hoch, 740×360 quer und 1366 px:
//   Knöpfe Bearbeiten/Löschen da (nicht beim Super-Admin, nicht bei sich selbst, nicht für Büro und Fahrlehrer),
//   Bearbeiten schickt update_account, Löschen mit offenen Schülern blockiert verständlich, sonst Sicherheitsfrage mit Namen.
// Teil B: Büro-Seite (buero.html) bei 1366 px: Leitung sieht die Knöpfe, Büro ohne Verwalten-Recht nicht, Büro mit Recht
//   nur bei Fahrlehrern und ohne Rollenwahl; Löschen eines Fahrlehrers ohne Schüler nimmt ihn aus der Liste.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/zugang-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { bauDaten } = require("../buero-vorfuehrung.js");
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
const warte = (page, ms = 250) => page.waitForTimeout(ms);
const ev = (page, code) => page.evaluate((c) => (0, eval)("(async()=>{" + c + "})()"), code);
async function zuBreit(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth, sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return sw > w + 1 ? `Seite ${sw} px breit bei ${w} px` : null;
  });
}

// ---------------- Teil A: App ----------------
const GROESSEN = [{ n: "360 hoch", w: 360, h: 780, mobil: true }, { n: "quer 740", w: 740, h: 360, mobil: true }, { n: "PC 1366", w: 1366, h: 900, mobil: false }];
for (const g of GROESSEN) {
  const ctx = await browser.newContext({ viewport: { width: g.w, height: g.h }, isMobile: g.mobil, hasTouch: g.mobil, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  const P = `[App ${g.n}]`;
  const setze = (rolle) => page.evaluate((rolle) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    try { closeSheet(); } catch (e) {}
    window.__aufrufe = [];
    const leer = async () => ({ data: [], error: null });
    const q = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (ok) => ok({ data: [], error: null }) : k === "single" || k === "maybeSingle" ? leer : () => q), apply: () => q });
    const antwort = (b) => {
      if (b.action === "check_delete") return b.target_user_id === "L1" ? { ok: false, hinweis: "Anna Muster hat noch 2 Schüler. Bitte zuerst einem anderen Fahrlehrer geben (Schüler öffnen und den Fahrlehrer wechseln), dann noch einmal löschen." } : { ok: true };
      if (b.action === "delete_account") return { ok: true, geloescht: true };
      if (b.action === "update_account") return { ok: true, geaendert: true };
      return { error: "unbekannt" };
    };
    window.getSupa = () => ({ from: () => q, rpc: leer, auth: { getUser: leer, getSession: async () => ({ data: { session: { access_token: "x" } } }) },
      functions: { invoke: async (name, opt) => { window.__aufrufe.push(opt.body); return { data: antwort(opt.body), error: null }; } } });
    window._fsRefreshAggData = async () => {};
    _authUser = { id: "u1" };
    _authProfile = { id: "u1", rolle, fahrschule_id: "f1", name: "Leitung Muster" };
    _fsAgg = { fahrschuleId: "f1", fahrschule: { name: "Fahrschule Muster" }, fahrzeuge: [], pakete: [],
      lehrer: [{ id: "L1", name: "Anna Muster", email: "anna@muster.invalid", aktiv: true, slug: null, rolle: "fahrlehrer", klassen: ["B"] },
               { id: "L2", name: "Bernd Muster", email: "bernd@muster.invalid", aktiv: true, slug: null, rolle: "fahrlehrer", klassen: ["B"], fahrlehrerlaubnis: ["BE"] },
               { id: "u1", name: "Leitung Muster", email: "leitung@muster.invalid", aktiv: true, slug: null, rolle: "fahrlehrer" },
               { id: "SA", name: "Betreiber Muster", email: "sa@muster.invalid", aktiv: true, slug: null, rolle: "super_admin" }] };
    DB.students = []; DB.exams = [];
    view.innerHTML = ""; // W17: Büro und Fahrlehrer bekommen diese Seite gar nicht mehr (kein alter Stand im Bild)
    routeFahrschuleLehrer();
  }, rolle);

  await setze("fahrschule_admin"); await warte(page);
  await pruefe("A1", `${P} Leitung: Bearbeiten/Löschen bei Anna und Bernd, nicht bei sich selbst und beim Super-Admin`, async () => {
    const r = await page.evaluate(() => [...document.querySelectorAll(".fs-card")].map((c) => ({ n: c.querySelector(".fs-name").textContent, b: !!c.querySelector("button[onclick^=fahrlehrerBearbeitenSheet]"), l: !!c.querySelector("button[onclick^=fahrlehrerLoeschenSheet]") })));
    const f = [];
    for (const x of r) {
      const soll = /Anna|Bernd/.test(x.n);
      if (x.b !== soll || x.l !== soll) f.push(`${x.n}: Bearbeiten ${x.b}, Löschen ${x.l}`);
    }
    return f;
  });
  await pruefe("A2", `${P} Knöpfe mindestens 44 px hoch und nicht breiter als die Karte`, () => page.evaluate(() => {
    const f = [];
    for (const b of document.querySelectorAll("button[onclick^=fahrlehrerBearbeitenSheet],button[onclick^=fahrlehrerLoeschenSheet]")) {
      const r = b.getBoundingClientRect(), k = b.closest(".fs-card").getBoundingClientRect();
      if (r.height < 43.5) f.push(b.textContent.trim() + " " + Math.round(r.height) + " px hoch");
      if (r.right > k.right + 1) f.push(b.textContent.trim() + " ragt aus der Karte");
    }
    return f;
  }));
  await pruefe("A3", `${P} nichts seitlich wischbar`, () => zuBreit(page));

  // Bearbeiten
  await page.click(".fs-card:has-text('Anna') button[onclick^=fahrlehrerBearbeitenSheet]"); await warte(page, 400);
  await pruefe("A4", `${P} Bearbeiten-Fenster: Name, Rolle (ohne Leitung), Klassen`, () => page.evaluate(() => {
    const f = [];
    if (!document.querySelector("#sheet.open #flbName")) f.push("kein Namensfeld");
    if (document.querySelector("#flbName").value !== "Anna Muster") f.push("Name nicht vorbelegt");
    const opts = [...document.querySelectorAll("#flbRolle option")].map((o) => o.value).join(",");
    if (opts !== "fahrlehrer,buero") f.push("Rollen: " + opts);
    if (document.querySelectorAll(".flbKl").length !== 6) f.push("Klassen-Haken fehlen");
    const sh = document.getElementById("sheet"); if (sh.scrollWidth > sh.clientWidth + 1) f.push("Fenster seitlich wischbar");
    return f;
  }));
  await page.fill("#flbName", "Anna Muster-Neu");
  await page.check(".flbKl[value=BE]");
  await page.click("#flbSpeichern"); await warte(page, 400);
  await pruefe("A5", `${P} Speichern schickt update_account mit Name, Rolle und Klassen`, () => page.evaluate(() => {
    const b = window.__aufrufe.find((x) => x.action === "update_account");
    if (!b) return "kein Aufruf";
    return b.target_user_id === "L1" && b.name === "Anna Muster-Neu" && b.rolle === "fahrlehrer" && JSON.stringify(b.klassen) === '["B","BE"]' && b.requester_token === "x" ? null : JSON.stringify(b);
  }));
  // Rolle → Büro: Klassen weg, Hinweis da
  await page.click(".fs-card:has-text('Anna') button[onclick^=fahrlehrerBearbeitenSheet]"); await warte(page, 400);
  await page.selectOption("#flbRolle", "buero"); await warte(page, 100);
  await pruefe("A6", `${P} Rolle Büro: Klassen ausgeblendet, Übergabe-Hinweis sichtbar`, () => page.evaluate(() => document.getElementById("flbKlassen").hidden && !document.getElementById("flbRolleHinweis").hidden ? null : "falsch"));
  await page.click("#flbAbbr"); await warte(page, 300);
  // Bernd hat Fahrlehrerlaubnis: Klassen nur lesen
  await page.click(".fs-card:has-text('Bernd') button[onclick^=fahrlehrerBearbeitenSheet]"); await warte(page, 400);
  await pruefe("A7", `${P} mit Fahrlehrerlaubnis: Klassen nur als Hinweis, kein Haken`, () => page.evaluate(() => document.querySelectorAll(".flbKl").length === 0 && /Fahrlehrerlaubnis/.test(document.getElementById("flbKlassen").textContent) ? null : "Haken da"));
  await page.click("#flbAbbr"); await warte(page, 300);

  // Löschen blockiert
  await page.click(".fs-card:has-text('Anna') button[onclick^=fahrlehrerLoeschenSheet]"); await warte(page, 500);
  await pruefe("A8", `${P} Löschen mit Schülern: klarer Hinweis, kein Löschen`, () => page.evaluate(() => {
    const t = document.getElementById("sheet").textContent;
    if (!/Noch nicht löschen/.test(t) || !/2 Schüler/.test(t)) return "Hinweis fehlt: " + t.slice(0, 120);
    return window.__aufrufe.some((x) => x.action === "delete_account") ? "delete_account trotzdem aufgerufen" : null;
  }));
  await page.click("#fllOk"); await warte(page, 300);
  // Löschen frei: Sicherheitsfrage mit Namen
  await page.click(".fs-card:has-text('Bernd') button[onclick^=fahrlehrerLoeschenSheet]"); await warte(page, 500);
  await pruefe("A9", `${P} Sicherheitsfrage nennt den Namen, Abbrechen löscht nichts`, async () => {
    const t = await page.evaluate(() => document.getElementById("fllJa") && document.getElementById("fllJa").textContent);
    if (t !== "Ja, Bernd Muster löschen") return "Knopf: " + t;
    await page.click("#fllAbbr"); await warte(page, 300);
    return page.evaluate(() => window.__aufrufe.some((x) => x.action === "delete_account") ? "gelöscht trotz Abbrechen" : null);
  });
  await page.click(".fs-card:has-text('Bernd') button[onclick^=fahrlehrerLoeschenSheet]"); await warte(page, 500);
  await page.click("#fllJa"); await warte(page, 400);
  await pruefe("A10", `${P} Ja: delete_account für Bernd`, () => page.evaluate(() => window.__aufrufe.filter((x) => x.action === "delete_account").map((x) => x.target_user_id).join(",") === "L2" ? null : JSON.stringify(window.__aufrufe)));

  // Zurück-Taste in der Löschfrage schließt ganz (kein leeres „Prüfe …“-Fenster), Doppeltipp prüft nur einmal
  await page.evaluate(() => { window.__aufrufe = []; });
  await page.evaluate(() => { const b = document.querySelector(".fs-card:nth-child(3) button[onclick^=fahrlehrerLoeschenSheet]") || [...document.querySelectorAll("button[onclick^=fahrlehrerLoeschenSheet]")][1]; b.click(); b.click(); });
  await warte(page, 500);
  await pruefe("A14", `${P} Doppeltipp auf Löschen: nur eine Prüfung`, () => page.evaluate(() => window.__aufrufe.filter((x) => x.action === "check_delete").length === 1 ? null : JSON.stringify(window.__aufrufe)));
  await page.evaluate(() => history.back()); await warte(page, 500);
  await pruefe("A15", `${P} Zurück in der Löschfrage schließt das Fenster ganz`, () => page.evaluate(() => document.getElementById("sheet").classList.contains("open") ? "noch offen: " + document.getElementById("sheet").textContent.slice(0, 60) : null));
  // Zurück während der Prüfung: danach keine Frage aufdrängen
  await page.evaluate(() => {
    const alt = window.getSupa;
    window.getSupa = () => { const s = alt(); const inv = s.functions.invoke; s.functions.invoke = async (n, o) => { await new Promise((r) => setTimeout(r, 600)); return inv(n, o); }; return s; };
    [...document.querySelectorAll("button[onclick^=fahrlehrerLoeschenSheet]")][1].click();
  });
  await warte(page, 150); await page.evaluate(() => history.back()); await warte(page, 900);
  await pruefe("A16", `${P} Zurück während der Prüfung: keine Löschfrage danach`, () => page.evaluate(() => document.getElementById("sheet").classList.contains("open") ? "Fenster ging wieder auf" : null));

  // Büro und Fahrlehrer sehen keine Knöpfe
  for (const rolle of ["buero", "fahrlehrer"]) {
    await setze(rolle); await warte(page);
    await pruefe("A11", `${P} Rolle ${rolle}: keine Bearbeiten/Löschen-Knöpfe`, () => page.evaluate(() => document.querySelectorAll("button[onclick^=fahrlehrerBearbeitenSheet],button[onclick^=fahrlehrerLoeschenSheet]").length ? "Knöpfe sichtbar" : null));
  }
  // Super-Admin: Leitung als Rolle wählbar
  await setze("super_admin"); await warte(page);
  await page.click(".fs-card:has-text('Anna') button[onclick^=fahrlehrerBearbeitenSheet]"); await warte(page, 400);
  await pruefe("A12", `${P} Super-Admin kann Leitung wählen`, () => page.evaluate(() => [...document.querySelectorAll("#flbRolle option")].some((o) => o.value === "fahrschule_admin") ? null : "fehlt"));
  // „Fährt selbst“ (🗣 21.11., Jelena): Haken nur bei Rolle Leitung, Klassen dann sichtbar, Speichern schickt faehrt_selbst
  await page.evaluate(() => { window.__aufrufe = []; });
  await pruefe("A17", `${P} „Fährt selbst“ erst bei Rolle Leitung sichtbar`, () => page.evaluate(() => document.getElementById("flbFaehrtZeile") && document.getElementById("flbFaehrtZeile").hidden ? null : "sichtbar bei Fahrlehrer"));
  await page.selectOption("#flbRolle", "fahrschule_admin"); await warte(page, 100);
  await pruefe("A18", `${P} Leitung ohne Haken: Klassen aus, Übergabe-Hinweis an`, () => page.evaluate(() => !document.getElementById("flbFaehrtZeile").hidden && document.getElementById("flbKlassen").hidden && !document.getElementById("flbRolleHinweis").hidden ? null : "falsch"));
  await page.check("#flbFaehrt"); await warte(page, 100);
  await pruefe("A19", `${P} Leitung mit Haken: Klassen an, kein Übergabe-Hinweis`, () => page.evaluate(() => !document.getElementById("flbKlassen").hidden && document.getElementById("flbRolleHinweis").hidden ? null : "falsch"));
  await page.click("#flbSpeichern"); await warte(page, 400);
  await pruefe("A20", `${P} Speichern schickt rolle Leitung + faehrt_selbst + Klassen`, () => page.evaluate(() => {
    const b = window.__aufrufe.find((x) => x.action === "update_account");
    return b && b.rolle === "fahrschule_admin" && b.faehrt_selbst === true && Array.isArray(b.klassen) ? null : JSON.stringify(b);
  }));
  // Ansicht: Leitung mit Kennzeichen hat eine eigene Ansicht wie der Betreiber, reine Leitung nicht.
  // W16 (24.11.2026): kein Umschalter und kein Streifen mehr; gewechselt wird über die Startseite in den Einstellungen.
  await pruefe("A21", `${P} Leitung fährt selbst: eigene Ansicht + Startseite (3 Möglichkeiten), kein Umschalter; reine Leitung nur Gesamtansicht`, () => page.evaluate(() => {
    const f = [];
    _fsAgg = null;
    _authProfile = { id: "u1", rolle: "fahrschule_admin", fahrschule_id: "f1", name: "Leitung Muster", faehrt_selbst: true };
    if (_nurGesamtansicht()) f.push("fährt selbst gilt als nur Gesamtansicht");
    _fsSetDrawer(false); _zeigeSaStreifen();
    if (/Admin-Gesamtübersicht|Zu meiner Fahrlehrer-Ansicht/.test(document.querySelector(".drawer-nav").textContent)) f.push("Umschalter im Menü");
    if (document.getElementById("saStreifen")) f.push("Streifen oben noch da");
    if (KS_START.erlaubt(_authProfile).join() !== "eigen,gesamt,buero") f.push("Startseite: " + KS_START.erlaubt(_authProfile).join());
    _authProfile = { id: "u1", rolle: "fahrschule_admin", fahrschule_id: "f1", name: "Leitung Muster", faehrt_selbst: false };
    if (!_nurGesamtansicht()) f.push("reine Leitung nicht nur Gesamtansicht");
    _fsSetDrawer(false); _zeigeSaStreifen();
    if (/Admin-Gesamtübersicht|Zu meiner Fahrlehrer-Ansicht/.test(document.querySelector(".drawer-nav").textContent)) f.push("reine Leitung hat Umschalter");
    if (KS_START.erlaubt(_authProfile).join() !== "gesamt,buero") f.push("Startseite reine Leitung: " + KS_START.erlaubt(_authProfile).join());
    _authProfile = { id: "u2", rolle: "buero", fahrschule_id: "f1" };
    // W17 (🗣 Serband 26.11.2026): Büro nie in die Gesamtansicht, hat aber auch keinen eigenen Stand
    if (_nurGesamtansicht() || _fsDarfGesamt()) f.push("Büro darf in die Gesamtansicht");
    if (!_ohneEigenenStand()) f.push("Büro hätte einen eigenen Stand");
    const r = _fsNurUnterrichtende({ data: [{ rolle: "fahrlehrer" }, { rolle: "fahrschule_admin", faehrt_selbst: true }, { rolle: "fahrschule_admin" }, { rolle: "super_admin" }] });
    if (r.data.length !== 3) f.push("Fahrlehrer-Liste: " + r.data.length);
    return f;
  }));
  await pruefe("A13", `${P} keine JS-Fehler`, () => jsFehler);
  await ctx.close();
}

// ---------------- Teil B: Büro-Seite ----------------
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const TEST_PIN = { "Mia Muster": "5917", "Paula Muster": "7352" };
async function buero(nutzer, wer) {
  const daten = bauDaten(new Date().toISOString().slice(0, 10));
  // Ein Fahrlehrer ohne Schüler und ohne Termine, der gelöscht werden darf
  daten.tabellen.profiles.push({ id: "fl-9", name: "Frei Muster", email: "frei@example.org", rolle: "fahrlehrer", fahrschule_id: daten.FS, aktiv: true, agb_akzeptiert_version: "1.0", klassen: ["B"] });
  // Eine Leitung, die selbst fährt: steht auch in der Fahrlehrer-Liste
  daten.tabellen.profiles.push({ id: "ad-2", name: "Jule Muster", email: "jule@example.org", rolle: "fahrschule_admin", faehrt_selbst: true, fahrschule_id: daten.FS, aktiv: true, agb_akzeptiert_version: "1.0" });
  // Ein schon gelöschter Fahrlehrer mit einem alten Termin (gestern): Name und Zuordnung müssen bleiben
  daten.tabellen.profiles.push({ id: "fl-8", name: "Weg Muster", email: "entfernt-fl-8@entfernt.invalid", rolle: "entfernt", fahrschule_id: daten.FS, aktiv: false });
  const gestern = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  daten.tabellen.kalender_termine.push({ id: "t-weg", fahrschule_id: daten.FS, fahrlehrer_id: "fl-8", schueler_id: null, datum: gestern, von: "08:00", bis: "09:30", art: "fahrstunde", status: "geplant", geloescht: false, payload: {}, buero_fc_status: "offen" });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, k]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s, functions: { "admin-create-account": (b, F) => (new Function("return " + k)())(b, F) } };
  }, [daten, { user: { id: nutzer, email: nutzer + "@example.org" } }, (require("../buero-vorfuehrung.js").vorfuehrKonto).toString()]);
  await page.goto(basis + "buero.html#team");
  await warte(page, 500);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1500 }).catch(() => null);
  if (frage && wer) { await page.click(`#werListe button:has-text("${wer}")`); await page.keyboard.type(TEST_PIN[wer], { delay: 20 }); await warte(page, 300); }
  await page.evaluate(() => { location.hash = "#team"; }); await warte(page, 400);
  return { page, ctx, konsole };
}
const knoepfe = (page) => page.evaluate(() => [...document.querySelectorAll("[data-zbearb]")].map((b) => b.closest("tr").querySelector("b").textContent.trim()));

{
  const { page, ctx, konsole } = await buero("ad-1", "Mia Muster");
  await pruefe("B1", "[Büro Leitung] Bearbeiten/Löschen bei Fahrlehrern und Büro, nicht bei sich selbst und beim Super-Admin", async () => {
    const n = await knoepfe(page);
    const f = [];
    for (const soll of ["Anton Muster", "Frei Muster", "Büro Muster"]) if (!n.includes(soll)) f.push("fehlt bei " + soll);
    for (const nie of ["Leitung Muster", "Super-Admin"]) if (n.includes(nie)) f.push("darf nicht bei " + nie);
    return f;
  });
  await page.click("tr:has-text('Anton Muster') [data-zloesch]"); await warte(page, 400);
  await pruefe("B2", "[Büro Leitung] Anton hat Schüler: „Noch nicht löschen“ mit Hinweis", () => page.evaluate(() => {
    const d = [...document.querySelectorAll("dialog[open]")].pop();
    return d && /Noch nicht löschen/.test(d.textContent) && /Schüler/.test(d.textContent) ? null : "kein Hinweis";
  }));
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 300);
  await page.click("tr:has-text('Frei Muster') [data-zloesch]"); await warte(page, 400);
  await pruefe("B3", "[Büro Leitung] Sicherheitsfrage nennt den Namen, „Abbrechen“ ist der Hauptknopf", () => page.evaluate(() => {
    const d = [...document.querySelectorAll("dialog[open]")].pop();
    if (!d) return "kein Fenster";
    const ja = [...d.querySelectorAll("footer button")].find((b) => /löschen/.test(b.textContent));
    if (!ja || ja.textContent.trim() !== "Ja, Frei Muster löschen") return "Knopf: " + (ja && ja.textContent);
    return ja.classList.contains("haupt") ? "Löschen ist Hauptknopf (Enter löscht)" : null;
  }));
  await page.locator("dialog[open]").last().locator("button:has-text('Ja, Frei Muster löschen')").click(); await warte(page, 600);
  await pruefe("B4", "[Büro Leitung] nach dem Löschen nicht mehr in der Liste", () => page.evaluate(() => [...document.querySelectorAll("table.tabelle tr")].some((tr) => /Frei Muster/.test(tr.textContent)) ? "steht noch in der Tabelle" : null));
  // Bearbeiten: Name ändern
  await page.click("tr:has-text('Berta Muster') [data-zbearb]"); await warte(page, 400);
  await pruefe("B5", "[Büro Leitung] Bearbeiten-Fenster mit Rolle Fahrlehrer/Büro und Klassen", () => page.evaluate(() => {
    const d = [...document.querySelectorAll("dialog[open]")].pop();
    const opts = [...d.querySelectorAll("select[name=rolle] option")].map((o) => o.value).join(",");
    return opts === "fahrlehrer,buero" && d.querySelectorAll("input[name=kl]").length === 6 ? null : "Rollen " + opts;
  }));
  await page.locator("dialog[open] input[name=name]").fill("Berta Muster-Neu");
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 600);
  await pruefe("B6", "[Büro Leitung] neuer Name steht in der Liste", () => page.evaluate(() => /Berta Muster-Neu/.test(document.body.textContent) ? null : "nicht da"));
  await pruefe("B12", "[Büro Leitung] gelöschter Fahrlehrer steht nicht in der Fahrlehrer-Liste", () => page.evaluate(() => [...document.querySelectorAll("table.tabelle tr")].some((tr) => /Weg Muster/.test(tr.textContent)) ? "steht da" : null));
  await page.evaluate(() => terminDialog("t-weg")); await warte(page, 400);
  await pruefe("B13", "[Büro Leitung] alter Termin eines Gelöschten behält ihn als Fahrlehrer", () => page.evaluate(() => {
    const sel = [...document.querySelectorAll("dialog[open] select[name=fahrlehrer_id]")].pop();
    if (!sel) return "kein Termin-Fenster";
    return sel.value === "fl-8" && /Weg Muster \(gelöscht\)/.test(sel.selectedOptions[0].textContent) ? null : "Auswahl: " + sel.value + " " + sel.selectedOptions[0].textContent;
  }));
  await page.keyboard.press("Escape"); await warte(page, 200);
  await pruefe("B14", "[Büro Leitung] Leitung, die selbst fährt, steht in der Fahrlehrer-Tabelle; reine Leitung nicht", () => page.evaluate(() => {
    const t = document.querySelector("table.tabelle"); const txt = t ? t.textContent : "";
    return /Jule Muster/.test(txt) && !/Leitung Muster/.test(txt) ? null : "Fahrlehrer-Tabelle: " + txt.slice(0, 200);
  }));
  await pruefe("B7", "[Büro Leitung] keine Fehler in der Konsole", () => konsole);
  await ctx.close();
}
{
  const { page, ctx } = await buero("bu-1", "Paula Muster");   // Büro ohne Verwalten-Recht
  await pruefe("B8", "[Büro ohne Recht] keine Bearbeiten/Löschen-Knöpfe", async () => ((await knoepfe(page)).length ? "Knöpfe sichtbar" : null));
  await ctx.close();
}
{
  const { page, ctx, konsole } = await buero("bu-1", "Mia Muster");    // Büro mit Verwalten-Recht
  await pruefe("B9", "[Büro mit Recht] Knöpfe nur bei Fahrlehrern", async () => {
    const n = await knoepfe(page);
    if (!n.includes("Anton Muster")) return "fehlt bei Anton";
    return n.includes("Büro Muster") || n.includes("Leitung Muster") ? "auch bei Büro/Leitung: " + n.join(", ") : null;
  });
  await page.click("tr:has-text('Anton Muster') [data-zbearb]"); await warte(page, 400);
  await pruefe("B10", "[Büro mit Recht] keine Rollenwahl", () => page.evaluate(() => document.querySelector("dialog[open] select[name=rolle]") ? "Rollenwahl da" : null));
  await pruefe("B11", "[Büro mit Recht] keine Fehler in der Konsole", () => konsole);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
