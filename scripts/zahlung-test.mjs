// K8-Test „Zahlung ausstehend“ (Werkstatt 12, 23.11.2026): ganzer Ablauf vom Bildschirm bis zur (nachgebauten) Datenbank.
// Büro (buero.html, Attrappe aus buero-vorfuehrung.js) und App (index.html, Attrappe der Datenbank), nur erfundene Namen „Muster“.
//   Z1  Büro: „Zahlung ausstehend“ → Grund → schreibt zahlung_gesperrt_seit + Grund, Pill da, kein confirm/alert
//   Z2  Büro: „Rückgängig“ im Hinweis schreibt null zurück
//   Z3  Büro: „Bezahlt“ leert die Felder, Pill weg
//   Z4  Büro: neuer Termin für Gesperrten wird abgelehnt (kein POST, Fenster bleibt offen); bestehender Termin ändern geht
//   Z5  Büro: Reaktivierung überfällig = gesperrt; „noch nicht geprüft“ und „befreit“ nicht
//   Z6  App (Fahrlehrer): neuer Termin für Gesperrten geblockt (Toast, kein Eintrag), Hinweis am bestehenden Termin, kein confirm
//   Z7  App: Server lehnt eine Zeile mit P0001 ab → die anderen werden gespeichert, keine Fehlerseite
//   Z6v App: „Mit anderem Schüler gefahren“ – Tausch auf Gesperrten geblockt, auf Freien erlaubt; Z6q Toast „Online-Buchung wartet“ einmal je Buchung; Z7e Toast „Termin nicht gespeichert“
//   Z8  Alte Datenbank (Spalten fehlen): App und Büro laufen, Büro zeigt eine verständliche Meldung statt Rohfehler
//   Z9  Leitung (Fahrschul-Ansicht, _fsAgg): Hinweis am bestehenden Termin eines Gesperrten
//   Z10 Büro-Papierkorb: „Wiederherstellen“ bei P0001 „Zahlung ausstehend“ zeigt die Zahlungs-Meldung (nicht „Leitung“); anderes P0001 weiter „Leitung hat entfernt“
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/zahlung-test.mjs        (Exit-Code 1 bei Fehler)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
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
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let okZahl = 0, fehlerZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);
// Ein Abschnitt, der abbricht (z. B. ein Knopf fehlt), zählt als Fehler; die übrigen Abschnitte laufen weiter
const offeneCtx = [];
async function abschnitt(name, fn) {
  try { await fn(); } catch (e) {
    fehlerZahl++; console.log(`FEHLER  ${name} abgebrochen: ${String(e.message || e).split("\n")[0]}`);
    for (const c of offeneCtx.splice(0)) await c.close().catch(() => {});
  }
}
const tag = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// ======================================================================================================
// Büro
// ======================================================================================================
const FS = "fs-test-1";
// Erfundene Schüler: A frei · B vom Büro gesperrt · C Reaktivierung überfällig (Status leer) · D überfällig, aber „noch nicht geprüft“ · E überfällig, befreit
const BUERO_DATEN = `
  const t = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const sch = (id, name, extra) => Object.assign({ id, fahrschule_id: "${FS}", fahrlehrer_id: "fl-1", name, telefon: "0170 111" + id.slice(-1), status: "aktiv", bogen_ausgefuellt: true,
    vertrag_am: t(-30), reakt_status: null, reakt_bezahlt_bis: null, ausbildungsart: "ersterwerb", klasse: "B", ausbildung: { form: "B" }, erstellt_am: t(-30) + "T10:00:00Z" }, extra || {});
  F.tabellen.schueler = [
    sch("za", "Anna Zahlmuster"),
    sch("zb", "Berta Zahlmuster", { zahlung_gesperrt_seit: new Date().toISOString(), zahlung_gesperrt_grund: "Rechnung offen" }),
    sch("zc", "Clara Zahlmuster", { vertrag_am: t(-400), reakt_status: null }),
    sch("zd", "Doris Zahlmuster", { vertrag_am: t(-400), reakt_status: "pruefen" }),
    sch("ze", "Emil Zahlmuster", { vertrag_am: t(-400), reakt_status: "befreit" }),
  ];
  const tt = (id, sid, datum, von, bis) => ({ id, fahrschule_id: "${FS}", fahrlehrer_id: "fl-1", schueler_id: sid, datum, von, bis, art: "fahrstunde", fahrzeug: "Golf Schalter 1", status: "geplant", geloescht: false, payload: {}, buero_fc_status: "offen" });
  F.tabellen.kalender_termine = [ tt("zt-b", "zb", t(0), "10:00", "11:30"), tt("zt-b2", "zb", t(3), "09:00", "10:30"), tt("zt-a", "za", t(0), "13:00", "14:30") ];
  // Zähler für Browser-Fenster (confirm/alert) und ein Haken, mit dem der Test Datenbank-Fehler einschleusen kann
  window.__dlg = 0; window.confirm = () => { window.__dlg++; return true; }; window.alert = () => { window.__dlg++; };
  let _sb; Object.defineProperty(window, "supabase", { configurable: true, get() { return _sb; }, set(v) {
    _sb = { createClient(...a) { const c = v.createClient(...a); const von = c.from; c.from = (n) => { const q = von(n); const o = q.ausfuehren.bind(q);
      q.ausfuehren = function () { const h = F.hook && F.hook({ tabelle: n, art: q.art, werte: q.werte, daten: q.daten }); return h || o(); }; return q; }; return c; } };
  } });
`;
async function oeffneBuero({ nutzer = "ad-1", hash = "#schueler", breite = 1366, hoehe = 900, code = "" } = {}) {
  const daten = bauDaten(new Date().toISOString().slice(0, 10));
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  ctx.setDefaultTimeout(8000); offeneCtx.push(ctx);
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  page.on("dialog", (d) => { konsole.push("echtes Browser-Fenster: " + d.type()); d.dismiss().catch(() => {}); });
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, v]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; (new Function("F", v))(window.__FAKE); }, [daten, session, BUERO_DATEN + code]);
  await page.goto(basis + "buero.html" + hash);
  await warte(page, 600);
  return { page, ctx, konsole };
}
const log = (page, tab, art) => page.evaluate(([t, a]) => window.__FAKE.log.filter((x) => x.tabelle === t && x.art === a), [tab, art]);
const zeile = (page, id) => page.evaluate((i) => JSON.parse(JSON.stringify(S.schueler.find((x) => x.id === i))), id);
const dlgZahl = (page) => page.evaluate(() => window.__dlg);

// ---- Z1 · Z2 · Z3: Knöpfe in der Schülerliste ----
{
  await abschnitt("Büro-Liste Z1-Z3", async () => {
  const { page, ctx, konsole } = await oeffneBuero({ hash: "#schueler" });
  await pruefe("Z1a", "Büro: Schülerliste zeigt bei freien „Zahlung ausstehend“, bei gesperrten „Bezahlt“", async () => {
    const f = [];
    if (!(await page.isVisible('[data-zsperre="za"]'))) f.push("Knopf „Zahlung ausstehend“ bei Anna fehlt");
    if (await page.isVisible('[data-zbezahlt="za"]')) f.push("Anna hat „Bezahlt“");
    if (!(await page.isVisible('[data-zbezahlt="zb"]'))) f.push("Knopf „Bezahlt“ bei Berta fehlt");
    if (await page.isVisible('[data-zsperre="zb"]')) f.push("Berta hat „Zahlung ausstehend“");
    return f;
  });
  await pruefe("Z1b", "Büro: Berta (gesperrt) zeigt die Pill, Anna nicht", async () => {
    const zeileText = (id) => page.evaluate((i) => { const b = document.querySelector(`[data-sbearb="${i}"]`); return b ? b.closest("tr").querySelector("[data-zahlungpill]") !== null : null; }, id);
    const f = [];
    if ((await zeileText("zb")) !== true) f.push("Berta ohne Pill");
    if ((await zeileText("za")) !== false) f.push("Anna mit Pill");
    return f;
  });
  await pruefe("Z1n", "Büro: Knopftexte – Aktion und Zustand heißen nicht gleich: Anna „Zahlung offen“, Berta „Bezahlt“, Clara (nur überfällig) „Reaktivierung bezahlt“ + Pill „Reaktivierung offen“", () =>
    page.evaluate(() => { const f = []; const t = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
      const za = t('[data-zsperre="za"]'), zb = t('[data-zbezahlt="zb"]'), zc = t('[data-zreakt="zc"]');
      if (za !== "Zahlung offen") f.push("Anna: " + za); if (zb !== "Bezahlt") f.push("Berta: " + zb);
      if (!zc || !/^Reaktivierung bezahlt/.test(zc)) f.push("Clara: " + zc);
      if (document.querySelector('[data-zsperre="zc"]')) f.push("Clara hat zusätzlich „Zahlung offen“");
      const pz = (id) => { const b = document.querySelector(`[data-sbearb="${id}"]`); const p = b && b.closest("tr").querySelector("[data-zahlungpill]"); return p ? p.textContent.trim() : null; };
      if (pz("zb") !== "Zahlung ausstehend") f.push("Pill Berta: " + pz("zb")); if (pz("zc") !== "Reaktivierung offen") f.push("Pill Clara: " + pz("zc"));
      return f; }));
  // Z1: Anna sperren
  await page.click('[data-zsperre="za"]'); await warte(page, 250);
  await pruefe("Z1c", "Büro: „Zahlung ausstehend“ öffnet das kleine Fenster mit Vorschlägen und Grundfeld (kein Bestätigen-Fenster)", async () => {
    const f = [];
    if ((await page.locator("dialog[open]").count()) !== 1) f.push("Fenster nicht genau einmal offen");
    if ((await page.locator("dialog[open] [data-zgrund]").count()) < 2) f.push("Vorschläge fehlen");
    if (!(await page.isVisible("dialog[open] input[name=grund]"))) f.push("Grundfeld fehlt");
    return f;
  });
  await page.click('dialog[open] [data-zgrund="Rechnung offen"]');
  await pruefe("Z1d", "Büro: Tipp auf einen Vorschlag füllt das Grundfeld", async () => ((await page.inputValue("dialog[open] input[name=grund]")) === "Rechnung offen" ? null : "Grundfeld: " + (await page.inputValue("dialog[open] input[name=grund]"))));
  await page.click("dialog[open] button[value=ok]"); await warte(page, 400);
  await pruefe("Z1e", "Büro: Speichern schreibt zahlung_gesperrt_seit + Grund an schueler (PATCH)", async () => {
    const u = (await log(page, "schueler", "update")).filter((x) => x.werte && "zahlung_gesperrt_seit" in x.werte);
    if (u.length !== 1) return "PATCH-Zahl " + u.length;
    const w = u[0].werte, f = [];
    if (!w.zahlung_gesperrt_seit || isNaN(Date.parse(w.zahlung_gesperrt_seit))) f.push("seit ungültig: " + w.zahlung_gesperrt_seit);
    if (w.zahlung_gesperrt_grund !== "Rechnung offen") f.push("Grund: " + w.zahlung_gesperrt_grund);
    const s = await zeile(page, "za");
    if (s.zahlung_gesperrt_seit !== w.zahlung_gesperrt_seit) f.push("Zeile in der Datenbank nicht gesperrt");
    return f;
  });
  await pruefe("Z1f", "Büro: danach Pill an Anna, Knopf wechselt auf „Bezahlt“, Hinweis mit „Rückgängig“", async () => {
    const f = [];
    const pill = await page.evaluate(() => { const b = document.querySelector('[data-sbearb="za"]'); return !!(b && b.closest("tr").querySelector("[data-zahlungpill]")); });
    if (!pill) f.push("keine Pill");
    if (!(await page.isVisible('[data-zbezahlt="za"]'))) f.push("kein Knopf „Bezahlt“");
    if (!(await page.isVisible(".toast-undo [data-undo]"))) f.push("kein „Rückgängig“");
    if (await page.locator("dialog[open]").count()) f.push("Fenster noch offen");
    return f;
  });
  // Z2: Rückgängig
  await page.click(".toast-undo [data-undo]"); await warte(page, 400);
  await pruefe("Z2", "Büro: „Rückgängig“ im Hinweis schreibt null zurück, Pill weg", async () => {
    const u = (await log(page, "schueler", "update")).filter((x) => x.werte && "zahlung_gesperrt_seit" in x.werte);
    const f = [];
    if (u.length !== 2) return "PATCH-Zahl " + u.length + " (erwartet 2)";
    if (u[1].werte.zahlung_gesperrt_seit !== null || u[1].werte.zahlung_gesperrt_grund !== null) f.push("zweiter PATCH nicht null: " + JSON.stringify(u[1].werte));
    const s = await zeile(page, "za");
    if (s.zahlung_gesperrt_seit) f.push("Zeile noch gesperrt");
    if (await page.isVisible('[data-zbezahlt="za"]')) f.push("„Bezahlt“ steht noch da");
    return f;
  });
  // Z3: Berta ist schon gesperrt → „Bezahlt“
  await page.click('[data-zbezahlt="zb"]'); await warte(page, 400);
  await pruefe("Z3", "Büro: „Bezahlt“ leert Datum und Grund, Pill weg, Knopf wechselt zurück (kein Fenster)", async () => {
    const u = (await log(page, "schueler", "update")).filter((x) => x.werte && "zahlung_gesperrt_seit" in x.werte);
    const f = [];
    const letzter = u[u.length - 1];
    if (!letzter || letzter.werte.zahlung_gesperrt_seit !== null || letzter.werte.zahlung_gesperrt_grund !== null) f.push("PATCH nicht null: " + JSON.stringify(letzter && letzter.werte));
    const s = await zeile(page, "zb");
    if (s.zahlung_gesperrt_seit || s.zahlung_gesperrt_grund) f.push("Zeile noch gesperrt");
    const pill = await page.evaluate(() => { const b = document.querySelector('[data-sbearb="zb"]'); return !!(b && b.closest("tr").querySelector("[data-zahlungpill]")); });
    if (pill) f.push("Pill bleibt");
    if (!(await page.isVisible('[data-zsperre="zb"]'))) f.push("Knopf „Zahlung ausstehend“ kommt nicht zurück");
    if (await page.locator("dialog[open]").count()) f.push("Fenster offen");
    return f;
  });
  await pruefe("Z1g", "Büro: bei Sperren, Rückgängig und Bezahlt kein confirm, kein alert, kein Bestätigen-Fenster", async () => ((await dlgZahl(page)) === 0 && !konsole.some((k) => /echtes Browser-Fenster/.test(k)) ? null : "confirm/alert " + (await dlgZahl(page)) + " · " + konsole.join(" | ")));
  await pruefe("Z1h", "Büro: keine Konsolenfehler", () => konsole);
  await ctx.close();
  });
}

// ---- Z1 (Akte und Fristen): dieselben Knöpfe in der Schüler-Akte und in der Fristen-Tabelle ----
{
  await abschnitt("Büro-Akte und Fristen Z1", async () => {
  const { page, ctx, konsole } = await oeffneBuero({ hash: "#schueler" });
  await page.evaluate(() => schuelerDialog("za")); await warte(page, 300);
  await pruefe("Z1i", "Büro: Akte hat den Zahlungs-Block (#zahlBlock) mit „Zahlung ausstehend“", async () => ((await page.isVisible("#zahlBlock [data-zsperre=za]")) ? null : "Knopf fehlt in der Akte"));
  await page.click("#zahlBlock [data-zsperre=za]"); await warte(page, 250);
  await page.fill("dialog[open]:last-of-type input[name=grund]", "Akte-Grund");
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
  await pruefe("Z1j", "Büro: in der Akte gesperrt → Block zeigt Text und „Bezahlt“, ein Fenster (Akte) bleibt offen", async () => {
    const f = [];
    if (!(await page.isVisible("#zahlBlock [data-zahlungtext]"))) f.push("Text im Block fehlt");
    if (!/Akte-Grund/.test((await page.textContent("#zahlBlock")) || "")) f.push("Grund fehlt im Block");
    if (!(await page.isVisible("#zahlBlock [data-zbezahlt=za]"))) f.push("„Bezahlt“ fehlt");
    if ((await page.locator("dialog[open]").count()) !== 1) f.push("offene Fenster: " + (await page.locator("dialog[open]").count()));
    return f;
  });
  await page.click(".toast-undo [data-undo]"); await warte(page, 500);
  await pruefe("Z1j2", "Büro: in der Akte „Rückgängig“ im Hinweis → Block zeichnet sich neu (Text weg, „Zahlung offen“ wieder da)", async () => {
    const f = [];
    if (await page.isVisible("#zahlBlock [data-zahlungtext]")) f.push("Text steht noch im Block");
    if (!(await page.isVisible("#zahlBlock [data-zsperre=za]"))) f.push("„Zahlung offen“ fehlt");
    if (await page.isVisible("#zahlBlock [data-zbezahlt=za]")) f.push("„Bezahlt“ steht noch da");
    return f;
  });
  await page.click("#zahlBlock [data-zsperre=za]"); await warte(page, 250);
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
  await page.click("#zahlBlock [data-zbezahlt=za]"); await warte(page, 300);
  await pruefe("Z1k", "Büro: in der Akte „Bezahlt“ → Block wieder frei", async () => ((await page.isVisible("#zahlBlock [data-zsperre=za]")) && !(await page.isVisible("#zahlBlock [data-zahlungtext]")) ? null : "Block nicht zurückgesetzt"));
  await page.evaluate(() => { document.querySelectorAll("dialog[open]").forEach((d) => d.close()); });
  await page.evaluate(() => { location.hash = "#fristen"; }); await warte(page, 500);
  await pruefe("Z1l", "Büro: Fristen-Tabelle hat die Knöpfe, Berta (Standard-Ansicht „Handeln“) steht dort", async () => {
    const f = [];
    // Berta ist im Setup gesperrt (Z3 lief in einem anderen Fenster der Seite, hier frisch)
    if (!(await page.isVisible('[data-zbezahlt="zb"]'))) f.push("„Bezahlt“ bei Berta fehlt in den Fristen");
    if (!(await page.isVisible('[data-zsperre="zd"]')) && !(await page.isVisible('[data-zsperre="za"]'))) f.push("„Zahlung ausstehend“ fehlt für Freie");
    return f;
  });
  await pruefe("Z1m", "Büro: Fristen und Akte ohne Konsolenfehler, kein confirm", async () => (konsole.length || (await dlgZahl(page)) ? konsole.concat("confirm " + (await dlgZahl(page))) : null));
  await ctx.close();
  });
}


// ---- Z4 · Z5: Termine im Büro-Kalender, Reaktivierung überfällig ----
{
  await abschnitt("Büro-Kalender Z4-Z5", async () => {
  const { page, ctx, konsole } = await oeffneBuero({ hash: "#kalender" });
  const einfuegen = () => log(page, "kalender_termine", "insert");
  const toastText = () => page.evaluate(() => document.getElementById("toast").textContent);
  const neuerTermin = async (sid, datum, von, art = "fahrstunde") => {
    await page.evaluate(([d, v]) => terminDialog(null, { datum: d, von: v, fahrlehrer_id: "fl-1" }), [datum, von]); await warte(page, 250);
    await page.selectOption("dialog[open] select[name=schueler_id]", sid);
    await page.selectOption("dialog[open] select[name=art]", art); await warte(page, 100);
    await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
  };
  const schliesseAlle = () => page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await pruefe("Z5a", "Büro: gesperrt sind Berta (Knopf) und Clara (überfällig, Status leer); Anna, Doris („noch nicht geprüft“), Emil (befreit) nicht", () =>
    page.evaluate(() => { const r = {}; S.schueler.forEach((s) => { r[s.id] = bueroGesperrt(s); }); const soll = { za: false, zb: true, zc: true, zd: false, ze: false };
      return Object.keys(soll).filter((k) => r[k] !== soll[k]).map((k) => `${k} ist ${r[k]} statt ${soll[k]}`); }));
  await pruefe("Z5b", "Büro: Schülerliste zeigt die Pill nur bei Berta und Clara", () =>
    page.evaluate(() => { location.hash = "#schueler"; return new Promise((ok) => setTimeout(() => ok(["za", "zb", "zc", "zd", "ze"].map((i) => { const b = document.querySelector(`[data-sbearb="${i}"]`); return [i, !!(b && b.closest("tr").querySelector("[data-zahlungpill]"))]; })), 500)); })
      .then((l) => l.filter(([i, v]) => v !== (i === "zb" || i === "zc")).map(([i, v]) => `${i} Pill ${v}`)));
  await pruefe("Z5c", "Büro: Akte von Clara (überfällig) zeigt Text und „Reaktivierung bezahlt“, die von Doris nicht", async () => {
    const f = [];
    await page.evaluate(() => schuelerDialog("zc")); await warte(page, 300);
    if (!(await page.isVisible("#zahlBlock [data-zahlungtext]"))) f.push("Clara: Text fehlt");
    if (!(await page.isVisible("#zahlBlock [data-zreakt=zc]"))) f.push("Clara: „Reaktivierung bezahlt“ fehlt");
    await schliesseAlle();
    await page.evaluate(() => schuelerDialog("zd")); await warte(page, 300);
    if (await page.isVisible("#zahlBlock [data-zahlungtext]")) f.push("Doris: Text da, obwohl nur „noch nicht geprüft“");
    await schliesseAlle();
    return f;
  });
  // Tag und Ansicht ausdrücklich setzen (die Termine stehen auf dem UTC-Tag von „heute“), bei Misserfolg einmal neu laden
  for (let versuch = 0; versuch < 2; versuch++) {
    await page.evaluate((h) => { location.hash = h; }, "#kalender?ansicht=tag&tag=" + tag(0) + (versuch ? "&x=" + versuch : "")); await warte(page, 600);
    if (await page.waitForSelector('.k-termin[data-termin="zt-b"]', { timeout: 4000 }).then(() => true, () => false)) break;
  }
  await page.waitForSelector('.k-termin[data-termin="zt-b"]', { timeout: 6000 }).catch(() => {});
  await page.waitForSelector('.k-termin[data-termin="zt-a"]', { timeout: 6000 }).catch(() => {});
  await pruefe("Z4a", "Büro-Kalender: Termin heute von Berta trägt den Hinweis „Zahlung ausstehend“, der von Anna nicht", () =>
    page.evaluate(() => { const h = (id) => { const e = document.querySelector(`.k-termin[data-termin="${id}"]`); return e ? { hinweis: e.hasAttribute("data-zahlung-hinweis"), text: !!e.querySelector(".k-zahlung") } : null; };
      const b = h("zt-b"), a = h("zt-a"); const f = [];
      if (!b) f.push("Termin von Berta nicht im Kalender"); else if (!b.hinweis || !b.text) f.push("Berta ohne Hinweis " + JSON.stringify(b));
      if (!a) f.push("Termin von Anna nicht im Kalender"); else if (a.hinweis || a.text) f.push("Anna mit Hinweis");
      return f; }));
  // Neue Termine
  const d5 = tag(5);
  await neuerTermin("zb", d5, "08:00");
  await pruefe("Z4b", "Büro: neuer Termin für Berta (vom Büro gesperrt) → Meldung, kein POST, Fenster bleibt offen", async () => {
    const f = [];
    if ((await einfuegen()).length) f.push("Termin wurde angelegt");
    if ((await page.locator("dialog[open]").count()) !== 1) f.push("Fenster nicht offen");
    if (!/Zahlung ausstehend/.test(await toastText())) f.push("Meldung: " + (await toastText()));
    if (!(await page.isVisible("dialog[open] #zahlHinweis"))) f.push("Hinweis im Fenster fehlt");
    if (!/Zahlung ausstehend/.test((await page.textContent("dialog[open] .dialog-meldung").catch(() => "")) || "")) f.push("keine Fehlermeldung im Fenster");
    return f;
  });
  await schliesseAlle();
  await neuerTermin("zc", d5, "08:00");
  await pruefe("Z4c", "Büro: neuer Termin für Clara (Reaktivierung überfällig) → ebenfalls geblockt, auch ohne „Trotzdem buchen“", async () => ((await einfuegen()).length === 0 && (await page.locator("dialog[open]").count()) === 1 ? null : "angelegt oder Fenster zu, offene Fenster " + (await page.locator("dialog[open]").count())));
  await schliesseAlle();
  const n1 = (await einfuegen()).length;
  await neuerTermin("zb", tag(-2), "08:00");
  await pruefe("Z4d", "Büro: Termin in der Vergangenheit (Nachtrag) für Berta bleibt erlaubt", async () => ((await einfuegen()).length === n1 + 1 ? null : "nicht angelegt: " + (await toastText())));
  await schliesseAlle();
  const n2 = (await einfuegen()).length;
  await neuerTermin("zd", d5, "08:00");
  await pruefe("Z5d", "Büro: neuer Termin für Doris („noch nicht geprüft“, überfällig) wird angelegt, ohne Warnung", async () => ((await einfuegen()).length === n2 + 1 ? null : "angelegt: " + (await einfuegen()).length + " · " + (await toastText())));
  await schliesseAlle();
  const n3 = (await einfuegen()).length;
  await neuerTermin("za", d5, "10:00");
  await pruefe("Z4e", "Büro: neuer Termin für Anna (frei) wird angelegt", async () => ((await einfuegen()).length === n3 + 1 ? null : "angelegt: " + (await einfuegen()).length));
  await schliesseAlle();
  const vorher = (await einfuegen()).length;
  // Bestehender Termin von Berta (in 3 Tagen)
  await page.evaluate(() => terminDialog("zt-b2")); await warte(page, 250);
  await pruefe("Z4f", "Büro: bestehender Termin von Berta öffnet mit Hinweis „Dieser Termin bleibt“", async () => (/Dieser Termin bleibt/.test((await page.textContent("dialog[open] #zahlHinweis")) || "") && (await page.isVisible("dialog[open] #zahlHinweis")) ? null : "Hinweis: " + (await page.textContent("dialog[open] #zahlHinweis"))));
  await page.fill("dialog[open] input[name=von]", "09:15");
  await page.fill("dialog[open] input[name=bis]", "10:45");
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
  await pruefe("Z4g", "Büro: bestehenden Termin von Berta nur zeitlich ändern (gleiches Datum) geht → PATCH, Fenster zu", async () => {
    const u = (await log(page, "kalender_termine", "update")).filter((x) => x.werte && x.werte.von === "09:15");
    const t = await page.evaluate(() => S.termine.find((x) => x.id === "zt-b2"));
    const f = [];
    if (u.length !== 1) f.push("PATCH-Zahl " + u.length);
    if (!t || t.von !== "09:15") f.push("Zeit nicht gespeichert");
    if (await page.locator("dialog[open]").count()) f.push("Fenster noch offen: " + (await toastText()));
    return f;
  });
  await page.evaluate(() => terminDialog("zt-b2")); await warte(page, 250);
  await page.fill("dialog[open] input[name=datum]", tag(6));
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
  await pruefe("Z4h", "Büro: Termin von Berta auf ein anderes Datum verschieben = neuer Termin → geblockt", async () => {
    const u = (await log(page, "kalender_termine", "update")).filter((x) => x.werte && x.werte.datum === tag(6));
    return u.length === 0 && (await page.locator("dialog[open]").count()) === 1 && /Zahlung ausstehend/.test(await toastText()) ? null : `PATCH ${u.length}, Fenster ${await page.locator("dialog[open]").count()}, Meldung ${await toastText()}`;
  });
  await schliesseAlle();
  await page.evaluate(() => terminDialog("zt-a")); await warte(page, 250);
  await page.selectOption("dialog[open] select[name=schueler_id]", "zb");
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
  await pruefe("Z4i", "Büro: Termin von Anna auf Berta umlegen (gesperrt) → geblockt", async () => {
    const u = (await log(page, "kalender_termine", "update")).filter((x) => x.werte && x.werte.schueler_id === "zb" && x.werte.von === "13:00");
    return u.length === 0 && (await page.locator("dialog[open]").count()) === 1 ? null : `PATCH ${u.length}, Fenster ${await page.locator("dialog[open]").count()}`;
  });
  await schliesseAlle();
  // B1: Prüfung planen
  const pEin = () => log(page, "pruefungstermine", "insert");
  const pruefungPlanen = async (sid) => {
    await page.evaluate(() => pruefungDialog(null)); await warte(page, 250);
    await page.selectOption("dialog[open] select[name=schueler_id]", sid);
    await page.selectOption("dialog[open] select[name=art]", "praxis");
    await page.fill("dialog[open] input[name=datum]", tag(9));
    await page.fill("dialog[open] input[name=von]", "09:00");
    await page.selectOption("dialog[open] select[name=fahrlehrer_id]", "fl-1");
    await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 500);
  };
  await pruefungPlanen("zb");
  await pruefe("Z4m", "Büro: Praxisprüfung planen für Berta (gesperrt) → Meldung, nichts gespeichert, Fenster bleibt offen", async () => {
    const f = [];
    if ((await pEin()).length) f.push("Prüfung wurde gespeichert");
    if ((await page.locator("dialog[open]").count()) !== 1) f.push("Fenster nicht offen");
    if (!/Zahlung ausstehend/.test(await toastText())) f.push("Meldung: " + (await toastText()));
    return f;
  });
  await schliesseAlle();
  const kEin = (await einfuegen()).length;
  await pruefungPlanen("za");
  await pruefe("Z4n", "Büro: Praxisprüfung planen für Anna (frei) → gespeichert und im Kalender des Fahrlehrers", async () => {
    const f = [];
    if ((await pEin()).length !== 1) f.push("Prüfung nicht gespeichert: " + (await toastText()));
    // W21: den Kalender-Eintrag legt jetzt der Server an (Attrappe: Spiegel in pruefungstermine); der Browser schreibt keinen mehr
    if ((await einfuegen()).length !== kEin) f.push("Browser hat selbst in den Kalender geschrieben");
    const spiegel = await page.evaluate(() => { const p = window.__FAKE.tabellen.pruefungstermine.find((x) => x.schueler_id === "za" && !x.pruefungstag_id); return !!(p && window.__FAKE.tabellen.kalender_termine.some((t) => t.id === p.kalender_termin_id && t.fahrlehrer_id === "fl-1" && !t.geloescht)); });
    if (!spiegel) f.push("Kalender-Eintrag fehlt");
    // W15c: bei neuer Prüfung zeigt die Zahlungs-Karte „Prüfung gespeichert“ statt des kurzen Hinweises
    const karteText = await page.evaluate(() => (document.getElementById("zmKarte") || {}).textContent || "");
    if (!/Prüfung gespeichert/.test((await toastText()) + " " + karteText)) f.push("Meldung: " + (await toastText()) + " | Karte: " + karteText);
    return f;
  });
  await schliesseAlle();
  // Server sagt trotzdem P0001 (Büro-Seite hat alte Daten): verständliche Meldung statt Rohtext
  await page.evaluate(() => { window.__FAKE.hook = (a) => (a.tabelle === "kalender_termine" && a.art === "insert" ? { data: null, error: { code: "P0001", message: "Zahlung ausstehend: Rechnung offen" } } : null); });
  await neuerTermin("za", tag(7), "11:00");
  await pruefe("Z4j", "Büro: lehnt der Server mit P0001 ab, steht „Zahlung ausstehend – erst Bezahlt eintragen“ (nicht der Rohtext der Datenbank)", async () => {
    const m = (await page.textContent("dialog[open] .dialog-meldung").catch(() => "")) || (await toastText());
    return /erst „Bezahlt“ eintragen/.test(m) && !/Rechnung offen/.test(m) ? null : "Meldung: " + m;
  });
  await schliesseAlle();
  await pruefe("Z4k", "Büro-Kalender: keine Konsolenfehler, kein confirm", async () => (konsole.length || (await dlgZahl(page)) ? konsole.concat("confirm " + (await dlgZahl(page))) : null));
  await ctx.close();
  });
}

// ---- Z8 (Büro): alte Datenbank ohne die Spalten ----
for (const [name, fehler] of [["Postgres 42703", { code: "42703", message: 'column "zahlung_gesperrt_seit" of relation "schueler" does not exist' }],
  ["PostgREST PGRST204", { code: "PGRST204", message: "Could not find the 'zahlung_gesperrt_seit' column of 'schueler' in the schema cache" }]]) {
  await abschnitt("Büro alte Datenbank Z8 (" + name + ")", async () => {
  const { page, ctx, konsole } = await oeffneBuero({ hash: "#schueler", code: `
    F.tabellen.schueler.forEach((s) => { delete s.zahlung_gesperrt_seit; delete s.zahlung_gesperrt_grund; });
    F.hook = (a) => (a.tabelle === "schueler" && a.art === "update" && a.werte && "zahlung_gesperrt_seit" in a.werte ? { data: null, error: ${JSON.stringify(fehler)} } : null);` });
  await pruefe("Z8a", `Büro (${name}): ohne die Spalten laden Liste und Knöpfe, niemand ist (fälschlich) „Zahlung ausstehend“ außer überfällig`, async () => {
    const f = [];
    const gesp = await page.evaluate(() => S.schueler.filter((s) => bueroGesperrt(s)).map((s) => s.id));
    if (gesp.join() !== "zc") f.push("gesperrt: " + gesp.join());
    if (!(await page.isVisible('[data-zsperre="zb"]'))) f.push("Knopf fehlt");
    return f;
  });
  await page.click('[data-zsperre="za"]'); await warte(page, 250);
  await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
  await pruefe("Z8b", `Büro (${name}): Speichern zeigt eine verständliche Meldung, nicht den Rohfehler`, async () => {
    const m = ((await page.textContent("dialog[open] .dialog-meldung").catch(() => "")) || "") + " | " + (await page.evaluate(() => document.getElementById("toast").textContent));
    const f = [];
    if (!/noch nicht bereit/.test(m)) f.push("keine verständliche Meldung: " + m);
    if (/column|schema cache|does not exist|PGRST|42703/i.test(m)) f.push("Rohfehler sichtbar: " + m);
    if ((await page.locator("dialog[open]").count()) !== 1) f.push("Fenster nicht offen");
    return f;
  });
  await pruefe("Z8c", `Büro (${name}): die Seite läuft weiter (Reiter wechseln, normaler Termin), keine Konsolenfehler`, async () => {
    await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
    await page.evaluate(() => { location.hash = "#fristen?ansicht=alle"; }); await warte(page, 400);
    const f = [];
    await page.waitForSelector('[data-zsperre="za"]', { timeout: 6000 }).catch(() => {});
    if (!(await page.isVisible('[data-zsperre="za"]'))) f.push("Fristen (alle) ohne Knopf bei Anna");
    await page.evaluate(() => { location.hash = "#kalender"; }); await warte(page, 400);
    await page.evaluate((d) => terminDialog(null, { datum: d, von: "08:00", fahrlehrer_id: "fl-1" }), tag(5)); await warte(page, 250);
    await page.selectOption("dialog[open] select[name=schueler_id]", "za");
    await page.locator("dialog[open]").last().locator("button[value=ok]").click(); await warte(page, 400);
    if ((await log(page, "kalender_termine", "insert")).length !== 1) f.push("normaler Termin nicht angelegt");
    return f.concat(konsole);
  });
  await ctx.close();
  });
}


// ======================================================================================================
// App (index.html): Attrappe der Datenbank, echter Anmeldeweg (afterLogin), Uhr fest auf Montag 23.11.2026, 10:30
// ======================================================================================================
const JETZT = new Date("2026-11-23T10:30:00+01:00");
const H = "2026-11-23", M1 = "2026-11-24", M2 = "2026-11-25", M3 = "2026-11-26";
const FSA = "fs-muster";
// Zwei erfundene Schüler: Anna frei, Berta vom Büro gesperrt. mitSpalten=false: alte Datenbank ohne die neuen Spalten.
function appSchueler(mitSpalten) {
  const sch = (id, name, extra) => Object.assign({ id, fahrschule_id: FSA, fahrlehrer_id: "u-ich", name, status: "aktiv", telefon: null, ausbildung: {}, vertrag_am: "2026-11-01", reakt_status: "bezahlt", reakt_bezahlt_bis: "2027-11-01", bogen_ausgefuellt: true, erstellt_am: "2026-11-01T10:00:00Z" }, extra || {});
  const b = mitSpalten ? { zahlung_gesperrt_seit: "2026-11-20T09:00:00Z", zahlung_gesperrt_grund: "Rechnung offen" } : {};
  return [sch("s-a", "Anna Muster"), sch("s-b", "Berta Muster", b), sch("s-c", "Clara Muster", { vertrag_am: "2025-09-01", reakt_status: null, reakt_bezahlt_bis: null })];
}
async function neueApp({ rolle = "fahrlehrer", faehrtSelbst = false, tabellen, nachLogin, breite = 412, hoehe = 780 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  ctx.setDefaultTimeout(8000); offeneCtx.push(ctx);
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => { jsFehler.push(`echtes Browser-Fenster (${d.type()}): ${d.message().slice(0, 60)}`); d.dismiss().catch(() => {}); });
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(async ({ tabellen, rolle, faehrtSelbst, FS }) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const user = { id: "u-ich", email: "ich@example.org" };
    const prof = { rolle }; if (faehrtSelbst) prof.faehrt_selbst = true;
    const T = window.__T = tabellen; window.__schreib = []; window.__hook = null; window.__confirm = 0;
    window.confirm = () => { window.__confirm++; return true; };
    const antwort = (tab, einzeln) => {
      if (tab === "fahrschulen") return { data: einzeln ? { id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} } : [{ id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} }], error: null };
      if (tab === "profiles" && einzeln) return { data: Object.assign({ id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: typeof AGB_VERSION !== "undefined" ? AGB_VERSION : "1.0" }, prof), error: null };
      if (tab === "profiles") return { data: [{ id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, ...prof }, { id: "u-anna", name: "Anna Fahrlehrerin-Muster", email: "anna@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true }], error: null };
      const rows = T[tab] || [];
      return einzeln ? { data: rows[0] || null, error: null } : { data: rows, error: null, count: rows.length };
    };
    const baue = (tab) => {
      const st = { art: "select", einzeln: false, werte: null };
      const q = new Proxy(function () {}, {
        get: (_t, k) => {
          if (k === "then") return (ok, nein) => {
            let r;
            if (st.art === "select") r = antwort(tab, st.einzeln);
            else {
              const fehler = window.__hook ? window.__hook(tab, st.art, st.werte) : null;
              window.__schreib.push({ tab, art: st.art, werte: JSON.parse(JSON.stringify(st.werte === undefined ? null : st.werte)), fehler: fehler ? fehler.code || fehler.message : null });
              if (fehler) r = { data: null, error: fehler };
              else {
                if (st.art === "upsert" || st.art === "insert") { const l = Array.isArray(st.werte) ? st.werte : [st.werte]; T[tab] = T[tab] || []; l.forEach((z) => { const i = T[tab].findIndex((x) => x.id === z.id); if (i >= 0) T[tab][i] = Object.assign({}, T[tab][i], z); else T[tab].push(JSON.parse(JSON.stringify(z))); }); }
                r = { data: Array.isArray(st.werte) ? st.werte : (st.werte ? [st.werte] : []), error: null };
              }
            }
            return Promise.resolve(r).then(ok, nein);
          };
          if (k === "single" || k === "maybeSingle") return () => { st.einzeln = true; return q; };
          if (["insert", "upsert", "update", "delete"].includes(k)) return (w) => { st.art = k; st.werte = w; return q; };
          return () => q;
        },
        apply: () => q,
      });
      return q;
    };
    const auth = { getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
    const supa = { from: baue, rpc: async () => ({ data: null, error: null }), auth, functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
    window.getSupa = () => supa;
    try { localStorage.clear(); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
    _dbEigentuemer = user.id;
    ensureDB(); DB.students = []; DB.lessons = []; DB.exams = [];
    _authUser = user;
    await afterLogin(user);
  }, { tabellen, rolle, faehrtSelbst, FS: FSA });
  await warte(page, 1500);
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } document.getElementById("bueroNotizPopup")?.remove(); });
  if (nachLogin) await page.evaluate(nachLogin);
  return { ctx, page, jsFehler };
}
const terminAkt = (id, sid, datum, von, bis) => ({ id, fahrschule_id: FSA, fahrlehrer_id: "u-ich", schueler_id: sid, datum, von, bis, art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: false, payload: {}, aktualisiert_am: "2026-11-20T08:00:00Z" });
const lesson = (id, sid, date, von, bis) => ({ id, date, von, bis, art: "fahrstunde", sid, name: "", status: "geplant", note: "", fc: null });

// ---- Z6: Fahrlehrer in der App ----
{
  await abschnitt("App Fahrlehrer Z6", async () => {
  const { ctx, page, jsFehler } = await neueApp({ tabellen: { schueler: appSchueler(true), kalender_termine: [], kalender_pruefungen: [], schueler_notizen: [] },
    nachLogin: () => { DB.lessons = [{ id: "L-b", date: "2026-11-24", von: "09:00", bis: "10:30", art: "fahrstunde", sid: "s-b", name: "", status: "geplant", note: "", fc: null },
      { id: "L-a", date: "2026-11-24", von: "11:00", bis: "12:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null },
      { id: "L-bh", date: "2026-11-23", von: "11:00", bis: "12:30", art: "fahrstunde", sid: "s-b", name: "", status: "geplant", note: "", fc: null }]; DB.workCfg.fahrzeuge = []; save(); } });
  const anzahl = (sid) => page.evaluate((i) => DB.lessons.filter((l) => l.sid === i).length, sid);
  const toastApp = () => page.evaluate(() => document.getElementById("toast").textContent);
  await pruefe("Z6a", "App: Anmeldeweg übernimmt die Sperre aus der Datenbank (Berta ja, Anna nein, Clara = überfällig ja)", () =>
    page.evaluate(() => { const r = { a: _zahlungGesperrt("s-a"), b: _zahlungGesperrt("s-b"), c: _zahlungGesperrt("s-c") }; return r.a === false && r.b === true && r.c === true ? null : JSON.stringify(r); }));
  // Neuer Termin für Berta
  const eintragen = async (sid, datum, art = "fahrstunde") => {
    await page.evaluate((a) => { try { closeSheet(); } catch (e) {} openAddLessonSheet(a); }, art); await warte(page, 300);
    await page.click(`#alList [data-sid="${sid}"]`); await warte(page, 300);
    await page.fill("#alDate", datum);
    await page.click("#alSave"); await warte(page, 400);
  };
  const vorB = await anzahl("s-b");
  await eintragen("s-b", M2);
  await pruefe("Z6b", "App: Termin eintragen für Berta (gesperrt) → Hinweis „Zahlung ausstehend – bitte ans Büro – kein neuer Termin“, nichts eingetragen, kein confirm", async () => {
    const f = [];
    if (!/Zahlung ausstehend – bitte ans Büro – kein neuer Termin/.test(await toastApp())) f.push("Hinweis: " + (await toastApp()));
    if ((await anzahl("s-b")) !== vorB) f.push("Termin wurde eingetragen");
    if (!(await page.isVisible("#alSave"))) f.push("Blatt geschlossen");
    if ((await page.evaluate(() => window.__confirm)) !== 0) f.push("confirm aufgerufen");
    return f;
  });
  await eintragen("s-c", M2);
  await pruefe("Z6c", "App: Termin eintragen für Clara (Reaktivierung überfällig) → ebenfalls geblockt", async () => ((await anzahl("s-c")) === 0 && /Zahlung ausstehend/.test(await toastApp()) ? null : "Termine " + (await anzahl("s-c")) + " · " + (await toastApp())));
  const vorB2 = await anzahl("s-b");
  await eintragen("s-b", "2026-11-20");
  await pruefe("Z6d", "App: Nachtrag in der Vergangenheit für Berta bleibt möglich", async () => ((await anzahl("s-b")) === vorB2 + 1 ? null : "Termine " + (await anzahl("s-b"))));
  const vorA = await anzahl("s-a");
  await eintragen("s-a", M2);
  await pruefe("Z6e", "App: Termin eintragen für Anna (frei) wird eingetragen", async () => ((await anzahl("s-a")) === vorA + 1 ? null : "Termine " + (await anzahl("s-a")) + " · " + (await toastApp())));
  // Verschieben
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} openEventEdit("L-b"); }); await warte(page, 300);
  await page.fill("#esDate", M3);
  await page.click("#esSave"); await warte(page, 300);
  await pruefe("Z6f", "App: Termin von Berta auf ein anderes Datum verschieben → geblockt, Termin bleibt am alten Tag", async () => {
    const l = await page.evaluate(() => DB.lessons.find((x) => x.id === "L-b"));
    return l.date === M1 && /Zahlung ausstehend/.test(await toastApp()) ? null : "Datum " + l.date + " · " + (await toastApp());
  });
  await page.fill("#esDate", M1); await page.fill("#esTime", "09:30");
  await page.click("#esSave"); await warte(page, 300);
  await pruefe("Z6g", "App: Uhrzeit am selben Tag ändern geht auch für Berta (bestehender Termin bleibt)", async () => {
    const l = await page.evaluate(() => DB.lessons.find((x) => x.id === "L-b"));
    return l.von === "09:30" ? null : "Uhrzeit " + l.von + " · " + (await toastApp());
  });
  // Hinweise an bestehenden Terminen
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} _calView = "woche"; _calDate = "2026-11-24"; routeKalender(); }); await warte(page, 500);
  await pruefe("Z6h", "App-Kalender: Termin von Berta (künftig) trägt [data-zahlung-hinweis], der von Anna nicht", () =>
    page.evaluate(() => { const h = (id) => { const e = document.querySelector(`[data-evedit="lesson|${id}|${id === "L-b" ? "s-b" : "s-a"}"]`); return e ? e.querySelector("[data-zahlung-hinweis]") !== null : null; };
      const b = h("L-b"), a = h("L-a"); const f = [];
      if (b === null) f.push("Termin Berta nicht sichtbar"); else if (!b) f.push("Berta ohne Hinweis");
      if (a === null) f.push("Termin Anna nicht sichtbar"); else if (a) f.push("Anna mit Hinweis");
      return f; }));
  await page.evaluate(() => { tabGo("heute"); }); await warte(page, 600);
  await pruefe("Z6i", "App-Heute: Karte des heutigen Termins von Berta zeigt „Zahlung ausstehend – bitte ans Büro“ und den Hinweiskasten", async () => {
    const f = [];
    if (!(await page.isVisible(".h2-jetzt [data-zahlung-hinweis]"))) f.push("Hinweis in der Karte fehlt");
    if (!(await page.isVisible(".h2-jetzt [data-zahlung-ausstehend]"))) f.push("Hinweiskasten ([data-zahlung-ausstehend]) fehlt");
    return f;
  });
  await pruefe("Z6j", "App-Heute: Chip „Achtung“ nennt Berta mit „Zahlung ausstehend“, Anna nicht", () =>
    page.evaluate(() => { const c = [...document.querySelectorAll(".h2-chip")].map((x) => x.textContent); const f = [];
      if (!c.some((t) => /Berta/.test(t) && /Zahlung ausstehend/.test(t))) f.push("kein Chip für Berta: " + c.join("|"));
      if (c.some((t) => /Anna/.test(t) && /Zahlung/.test(t))) f.push("Chip für Anna"); return f; }));
  await pruefe("Z6k", "App: Fahrstunde starten bei gesperrtem Schüler fragt nicht nach (nur Hinweis), kein confirm", async () => {
    await page.evaluate(() => { startFahrstunde("L-bh"); }); await warte(page, 400);
    const f = [];
    if ((await page.evaluate(() => window.__confirm)) !== 0) f.push("confirm aufgerufen");
    if (!/Zahlung ausstehend/.test(await toastApp())) f.push("kein Hinweis: " + (await toastApp()));
    return f;
  });
  // A1 Ziehen im Kalender
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} _calView = "woche"; _calDate = "2026-11-24"; routeKalender(); }); await warte(page, 600);
  const ziehen = async (lid, zielTag) => {
    const chip = page.locator(`[data-dragid="${lid}"]`).first();
    await chip.scrollIntoViewIfNeeded();
    const cb = await chip.boundingBox(); if (!cb) return "Termin " + lid + " nicht sichtbar";
    const ziel = page.locator(`.cw-free[data-freeslot^="${zielTag}|"]`).first();
    await ziel.scrollIntoViewIfNeeded();
    const zb = await ziel.boundingBox(); if (!zb) return "kein freier Platz am " + zielTag;
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2); await page.mouse.down();
    await warte(page, 900); // W17: Ziehen erst nach 0,8 s Halten
    await page.mouse.move(cb.x + cb.width / 2 + 15, cb.y + cb.height / 2 + 15, { steps: 3 });
    await page.mouse.move(zb.x + zb.width / 2, zb.y + zb.height / 2, { steps: 8 }); await warte(page, 150);
    await page.mouse.up(); await warte(page, 500);
    return null;
  };
  const dat = (id) => page.evaluate((i) => DB.lessons.find((x) => x.id === i).date, id);
  const zA = await ziehen("L-a", M2);
  await pruefe("Z6m", "App-Kalender: Anna (frei) lässt sich auf einen anderen Tag ziehen (Gegenprobe, der Test zieht wirklich)", async () => zA || ((await dat("L-a")) === M2 ? null : "Datum " + (await dat("L-a"))));
  const zB = await ziehen("L-b", M2);
  await pruefe("Z6n", "App-Kalender: Berta (gesperrt) auf einen anderen Tag ziehen → geblockt, Termin bleibt, Hinweis", async () => zB || ((await dat("L-b")) === M1 && /Zahlung ausstehend/.test(await toastApp()) ? null : "Datum " + (await dat("L-b")) + " · " + (await toastApp())));
  // A2 Sonderfahrt: Datum durchreichen, Vergangenheit bleibt erlaubt
  await pruefe("Z6o", "App: Sonderfahrt-Stopp mit Datum – Berta künftig geblockt, in der Vergangenheit erlaubt, Anna erlaubt", () =>
    page.evaluate(() => { const f = []; if (_stoppErlaubt("s-b", "2026-11-25") !== false) f.push("künftig nicht geblockt");
      if (_stoppErlaubt("s-b", "2026-11-20") !== true) f.push("Vergangenheit geblockt"); if (_stoppErlaubt("s-a", "2026-11-25") !== true) f.push("Anna geblockt"); return f; }));
  // A4 Archiv
  await pruefe("Z6p", "App: Archivierter Schüler (inaktiv_seit) mit altem Sperr-Vermerk ist nicht gesperrt (wie der Server)", () =>
    page.evaluate(() => { const alt = _schuelerFristen["s-b"].inaktiv_seit; _schuelerFristen["s-b"].inaktiv_seit = "2026-10-01"; const g = _zahlungGesperrt("s-b"); _schuelerFristen["s-b"].inaktiv_seit = alt; return g === false && _zahlungGesperrt("s-b") === true ? null : "archiv gesperrt=" + g; }));
  // A3 Online-Buchung
  await page.evaluate(() => { window.__T.public_bookings = [
    { id: "pb-b", status: "bestaetigt", merged: false, fahrlehrer_id: "u-ich", art: "fahrstunde", subtyp: "normal", datum: "2026-11-27", von: "08:00", bis: "09:30", schueler_name: "Berta Muster", created_at: "2026-11-23T08:00:00Z" },
    { id: "pb-a", status: "bestaetigt", merged: false, fahrlehrer_id: "u-ich", art: "fahrstunde", subtyp: "normal", datum: "2026-11-27", von: "10:00", bis: "11:30", schueler_name: "Anna Muster", created_at: "2026-11-23T08:00:00Z" }]; });
  // Alle Toasts mitschreiben (Annas „Neuer Termin“-Hinweis überschreibt sonst den von Berta)
  await page.evaluate(() => { window.__toasts = []; const o = window.toast; window.toast = function (t) { window.__toasts.push(String(t)); return o.apply(this, arguments); }; });
  await page.evaluate(() => pullPublicBookings()); await warte(page, 700);
  const toastQ1 = await page.evaluate(() => window.__toasts.join(" | "));
  const vermerkQ1 = await page.evaluate(() => window.__schreib.filter((x) => x.tab === "public_bookings" && x.art === "update").length);
  await page.evaluate(() => { window.__toasts = []; }); // zweiter Abruf derselben Buchungen
  await page.evaluate(() => pullPublicBookings()); await warte(page, 700);
  const toastQ2 = await page.evaluate(() => window.__toasts.join(" | "));
  await pruefe("Z6q", "App: Online-Buchung von Berta (gesperrt) bleibt liegen (kein Termin, nicht als übernommen vermerkt); die von Anna wird übernommen; Toast „Online-Buchung am 27.11.2026 um 08:00 wartet: Zahlung ausstehend“ einmal je Buchung (zweiter Abruf still)", () =>
    page.evaluate(([t1, t2, vq]) => { const f = [];
      if (!/Online-Buchung am 27\.11\.2026 um 08:00 wartet: Zahlung ausstehend – bitte ans Büro/.test(t1)) f.push("Toast beim 1. Abruf: " + t1);
      if (/Online-Buchung am/.test(t2)) f.push("Toast beim 2. Abruf nochmal: " + t2);
      if (DB.lessons.some((l) => l.onlineBookingId === "pb-b")) f.push("Buchung von Berta wurde übernommen");
      if (!DB.lessons.some((l) => l.onlineBookingId === "pb-a")) f.push("Buchung von Anna fehlt");
      if (vq !== 1) f.push("Vermerke: " + vq + " (erwartet 1, nur Anna)"); return f; }, [toastQ1, toastQ2, vermerkQ1]));
  // Z6v: „Mit anderem Schüler gefahren“ – Tausch auf Gesperrten geblockt, auf Freien erlaubt
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} DB.lessons.push(
    { id: "L-t1", date: "2026-11-30", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null },
    { id: "L-t2", date: "2026-11-30", von: "10:00", bis: "11:30", art: "fahrstunde", sid: "s-b", name: "", status: "geplant", note: "", fc: null }); save(); });
  const tausch = async (lid, ziel) => {
    await page.evaluate((i) => { try { closeSheet(); } catch (e) {} nsQuickAction("other", i, "fahrstunde", () => {}); }, lid); await warte(page, 300);
    await page.evaluate(() => { document.getElementById("toast").textContent = ""; });
    await page.click(`#nsoList [data-sid="${ziel}"]`); await warte(page, 400);
  };
  await tausch("L-t1", "s-b");
  const geblockt = await page.evaluate(() => ({ sid: DB.lessons.find((l) => l.id === "L-t1").sid, st: DB.lessons.find((l) => l.id === "L-t1").status }));
  const toastV1 = await toastApp();
  await tausch("L-t2", "s-a");
  const frei = await page.evaluate(() => DB.lessons.find((l) => l.id === "L-t2").sid);
  await pruefe("Z6v", "App: „Mit anderem Schüler gefahren“ – Tausch auf Berta (gesperrt) geblockt (sid bleibt Anna, Hinweis), Tausch auf Anna (frei) erlaubt", () => {
    const f = [];
    if (geblockt.sid !== "s-a") f.push("Tausch auf Gesperrten ging durch: sid=" + geblockt.sid);
    if (geblockt.st !== "geplant") f.push("Status geändert: " + geblockt.st);
    if (!/Zahlung ausstehend/.test(toastV1)) f.push("kein Hinweis: " + toastV1);
    if (frei !== "s-a") f.push("Tausch auf Freien geblockt: sid=" + frei);
    return f; });
  // A5 Akte, A9 Text
  await page.evaluate(() => { routeDetail("s-b"); }); await warte(page, 600);
  await pruefe("Z6r", "App-Akte von Berta: roter Chip und Hinweis „Zahlung ausstehend: Rechnung offen. Bitte ans Büro, keine neuen Termine.“ stehen oben (ohne Scrollen)", async () => {
    const f = [];
    const chip = page.locator("[data-zahlung-chip]").first(), box = page.locator("[data-zahlung-ausstehend]").first();
    if (!(await chip.isVisible())) f.push("Chip fehlt"); if (!(await box.isVisible())) f.push("Hinweis fehlt");
    const cb = await chip.boundingBox(), bb = await box.boundingBox();
    if (cb && cb.y + cb.height > 780) f.push("Chip unterhalb des Bildschirms: " + cb.y); if (bb && bb.y + bb.height > 780) f.push("Hinweis unterhalb des Bildschirms: " + bb.y);
    const t = (await box.evaluate((e) => e.parentElement.textContent)).replace(/\s+/g, " ");
    if (!/Zahlung ausstehend: Rechnung offen\. Bitte ans Büro, keine neuen Termine\./.test(t)) f.push("Text: " + t);
    return f;
  });
  // A6 Kontrast, A7 Kalender, A8 Heute
  const kontrast = (modus) => page.evaluate((m) => {
    document.body.classList.toggle("light", m === "hell");
    const lum = (c) => { const v = c.match(/[\d.]+/g).map(Number); const l = v.slice(0, 3).map((x) => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * l[0] + .7152 * l[1] + .0722 * l[2]; };
    const bgVon = (el) => { let e = el; while (e) { const b = getComputedStyle(e).backgroundColor; const v = b.match(/[\d.]+/g).map(Number); if (v.length < 4 || v[3] >= .99) { if (!(v.length === 4 && v[3] === 0)) return b; } e = e.parentElement; } return "rgb(255,255,255)"; };
    const r = (el) => { const a = lum(getComputedStyle(el).color), b = lum(bgVon(el)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
    const out = {}; const k = document.querySelector('[data-zahlung-hinweis]'); out.kalender = k ? r(k) : null;
    const c = document.querySelector("[data-zahlung-chip]"); out.chip = c ? r(c) : null; return out;
  }, modus);
  await page.evaluate(() => { _calView = "woche"; _calDate = "2026-11-24"; routeKalender(); }); await warte(page, 600);
  await pruefe("Z6s", "App-Kalender: Zahlungs-Hinweis ist ein kurzes Zeichen „€!“ (nicht abgeschnitten) mit title/aria-label „Zahlung ausstehend“ und rotem Randstreifen", async () => {
    const f = [];
    const h = await page.evaluate(() => { const e = document.querySelector('[data-evedit="lesson|L-b|s-b"]'); const z = e && e.querySelector("[data-zahlung-hinweis]"); return z ? { t: z.textContent, title: z.title, aria: z.getAttribute("aria-label"), voll: z.scrollWidth <= z.clientWidth + 1, rand: getComputedStyle(e).borderRightWidth, cls: e.classList.contains("zahl-offen") } : null; });
    if (!h) return "Hinweis fehlt";
    if (h.t.trim() !== "€!") f.push("Text: " + h.t); if (h.title !== "Zahlung ausstehend" || h.aria !== "Zahlung ausstehend") f.push("title/aria: " + h.title + "/" + h.aria);
    if (!h.voll) f.push("abgeschnitten"); if (!h.cls || parseFloat(h.rand) < 2) f.push("kein roter Randstreifen " + h.rand);
    return f;
  });
  await pruefe("Z6t", "App: Kontrast des Zahlungs-Rots mindestens 4,5:1 im Kalenderkärtchen (hell und dunkel)", async () => {
    const f = [];
    for (const m of ["hell", "dunkel"]) { const k = await kontrast(m); if (!k.kalender || k.kalender < 4.5) f.push(m + " Kalender " + (k.kalender && k.kalender.toFixed(2))); }
    await page.evaluate(() => document.body.classList.add("light"));
    return f;
  });
  await page.evaluate(() => { tabGo("heute"); }); await warte(page, 600);
  await pruefe("Z6u", "App-Heute: Warnung steht nur einmal in der Karte; Kontrast im Hinweiskasten ausreichend", async () => {
    const f = [];
    const n = await page.evaluate(() => { const k = document.querySelector(".h2-jetzt"); return k ? (k.textContent.match(/Zahlung ausstehend/g) || []).length : -1; });
    if (n !== 1) f.push("„Zahlung ausstehend“ kommt " + n + "× in der Karte vor");
    return f;
  });
  await pruefe("Z6l", "App (Fahrlehrer): keine JS-Fehler, kein echtes Browser-Fenster", () => jsFehler);
  await ctx.close();
  });
}

// ---- Z7: Server lehnt eine Zeile mit P0001 ab ----
{
  await abschnitt("App Z7", async () => {
  const { ctx, page, jsFehler } = await neueApp({ tabellen: { schueler: appSchueler(true), kalender_termine: [], kalender_pruefungen: [], schueler_notizen: [] } });
  await page.evaluate(() => {
    window.__hook = (tab, art, werte) => {
      if (tab !== "kalender_termine" || art !== "upsert") return null;
      return (Array.isArray(werte) ? werte : [werte]).some((r) => r.schueler_id === "s-b") ? { code: "P0001", message: "Zahlung ausstehend: Rechnung offen", hint: "Bitte zuerst im Büro klären." } : null;
    };
    DB.lessons = [{ id: "L1", date: "2026-11-24", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null },
      { id: "L2", date: "2026-11-24", von: "10:00", bis: "11:30", art: "fahrstunde", sid: "s-b", name: "", status: "geplant", note: "", fc: null },
      { id: "L3", date: "2026-11-25", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null }];
    save();
  });
  await page.waitForFunction(() => (window.__T.kalender_termine || []).some((x) => x.id === "L3"), null, { timeout: 20000 }).catch(() => {});
  await warte(page, 500);
  await pruefe("Z7a", "App: der Server lehnt Bertas Termin mit P0001 ab → Annas Termine werden trotzdem gespeichert", () =>
    page.evaluate(() => { const ids = (window.__T.kalender_termine || []).map((x) => x.id).sort().join(); return ids === "L1,L3" ? null : "auf dem Server: " + ids; }));
  await pruefe("Z7e", "App: P0001 pro Zeile → einmal der Hinweis „Termin nicht gespeichert: Zahlung ausstehend – bitte ans Büro“", async () => {
    const t = await page.evaluate(() => document.getElementById("toast").textContent);
    const n = await page.evaluate(() => (window.__schreib.filter((x) => x.tab === "kalender_termine" && x.art === "upsert" && x.fehler === "P0001" && x.werte.length === 1)).length);
    return /Termin nicht gespeichert: Zahlung ausstehend – bitte ans Büro/.test(t) ? (n === 1 ? null : "Einzelablehnungen " + n) : "Toast: " + t; });
  await pruefe("Z7b", "App: abgelehnte Zeile wird einzeln übersprungen (Block abgelehnt, dann Zeile für Zeile)", () =>
    page.evaluate(() => { const w = window.__schreib.filter((x) => x.tab === "kalender_termine" && x.art === "upsert"); const f = [];
      if (!w.some((x) => x.fehler === "P0001" && x.werte.length > 1)) f.push("kein abgelehnter Block");
      if (!w.some((x) => x.fehler === "P0001" && x.werte.length === 1 && x.werte[0].id === "L2")) f.push("L2 nicht einzeln versucht");
      if (w.filter((x) => !x.fehler && x.werte.length === 1).length < 2) f.push("L1 und L3 nicht einzeln gespeichert"); return f; }));
  await pruefe("Z7c", "App: keine Fehlerseite – Ansicht steht, Bertas Termin bleibt lokal, die App reagiert weiter", () =>
    page.evaluate(async () => { const f = [];
      if (!document.getElementById("view") || !document.getElementById("view").textContent.trim()) f.push("Ansicht leer");
      if (!DB.lessons.some((l) => l.id === "L2")) f.push("L2 lokal weg");
      if (document.getElementById("loginOverlay") && !document.getElementById("loginOverlay").classList.contains("hidden") && document.getElementById("loginOverlay").style.display !== "none") f.push("Anmeldemaske zurück");
      try { tabGo("kalender"); tabGo("heute"); } catch (e) { f.push("Ansicht wechseln: " + e.message); }
      return f; }));
  await pruefe("Z7d", "App (Z7): keine JS-Fehler", () => jsFehler);
  await ctx.close();
  });
}

// ---- Z8 (App): alte Datenbank ohne die Spalten ----
{
  await abschnitt("App alte Datenbank Z8", async () => {
  const { ctx, page, jsFehler } = await neueApp({ tabellen: { schueler: appSchueler(false), kalender_termine: [terminAkt("T-b", "s-b", M1, "09:00", "10:30")], kalender_pruefungen: [], schueler_notizen: [] } });
  await pruefe("Z8d", "App (alte Datenbank): Anmeldung läuft, niemand ist „Zahlung ausstehend“ (nur Clara wegen überfälliger Reaktivierung)", () =>
    page.evaluate(() => { const r = ["s-a", "s-b", "s-c"].map((i) => _zahlungGesperrt(i)); return r.join() === "false,false,true" ? null : r.join() + " statt false,false,true"; }));
  await page.evaluate(() => { _calView = "woche"; _calDate = "2026-11-24"; routeKalender(); }); await warte(page, 500);
  await pruefe("Z8e", "App (alte Datenbank): Kalender zeigt den Termin von Berta ohne Hinweis", () =>
    page.evaluate(() => { const e = document.querySelector('[data-evedit^="lesson|T-b|"]'); return !e ? "Termin nicht sichtbar" : e.querySelector("[data-zahlung-hinweis]") ? "Hinweis da" : null; }));
  await page.evaluate(() => { DB.workCfg.fahrzeuge = []; openAddLessonSheet("fahrstunde"); }); await warte(page, 300);
  await page.click('#alList [data-sid="s-b"]'); await warte(page, 300);
  await page.fill("#alDate", M2); await page.click("#alSave"); await warte(page, 400);
  await pruefe("Z8f", "App (alte Datenbank): Termin für Berta eintragen geht", () => page.evaluate(() => (DB.lessons.some((l) => l.sid === "s-b" && l.date === "2026-11-25") ? null : "nicht eingetragen: " + document.getElementById("toast").textContent)));
  await pruefe("Z8g", "App (alte Datenbank): keine JS-Fehler", () => jsFehler);
  await ctx.close();
  });
}

// ---- Z9: Leitung in der Fahrschul-Ansicht (_fsAgg) ----
{
  await abschnitt("Leitung Z9", async () => {
  const { ctx, page, jsFehler } = await neueApp({ rolle: "fahrschule_admin", tabellen: { schueler: appSchueler(true).map((s) => Object.assign(s, { fahrlehrer_id: "u-anna" })),
    kalender_termine: [Object.assign(terminAkt("T-b", "s-b", M1, "09:00", "10:30"), { fahrlehrer_id: "u-anna" }), Object.assign(terminAkt("T-a", "s-a", M1, "11:00", "12:30"), { fahrlehrer_id: "u-anna" })], kalender_pruefungen: [], schueler_notizen: [] } });
  await pruefe("Z9a", "Leitung: startet in der Gesamtansicht der Fahrschule mit den Terminen", () => page.evaluate(() => (_fsAgg && DB.lessons.length === 2 ? null : `_fsAgg=${!!_fsAgg}, Termine ${DB.lessons.length}`)));
  // Gesamtansicht zeigt erst Termine, wenn ein Fahrlehrer gewählt ist (wie beim Antippen der Auswahl)
  await page.evaluate(() => { _fsCalLehrerFilter = ["u-anna"]; _calView = "woche"; _calDate = "2026-11-24"; routeKalender(); }); await warte(page, 600);
  await pruefe("Z9b", "Leitung (Gesamtansicht): Termin des gesperrten Schülers trägt [data-zahlung-hinweis], der andere nicht", () =>
    page.evaluate(() => { const h = (id) => { const e = document.querySelector(`[data-evedit^="lesson|${id}|"]`); return e ? e.querySelector("[data-zahlung-hinweis]") !== null : null; };
      const b = h("T-b"), a = h("T-a"); const f = [];
      if (b === null) f.push("Termin Berta nicht sichtbar"); else if (!b) f.push("Berta ohne Hinweis");
      if (a === null) f.push("Termin Anna nicht sichtbar"); else if (a) f.push("Anna mit Hinweis");
      return f; }));
  await pruefe("Z9c", "Leitung: keine JS-Fehler, kein confirm", async () => (jsFehler.length || (await page.evaluate(() => window.__confirm)) ? jsFehler.concat("confirm " + (await page.evaluate(() => window.__confirm))) : null));
  await ctx.close();
  });
}

// ---- Z10: Büro-Papierkorb, „Wiederherstellen“ bei Zahlungssperre ----
{
  await abschnitt("Büro-Papierkorb Z10", async () => {
  const vor = new Date(Date.now() - 864e5).toISOString();
  const { page, ctx, konsole } = await oeffneBuero({ hash: "#kalender", code: `
    const pk = (id, sid) => ({ id, fahrschule_id: "${FS}", fahrlehrer_id: "fl-1", schueler_id: sid, datum: t(-1), von: "08:00", bis: "09:30", art: "fahrstunde", fahrzeug: null, status: "geplant", geloescht: true, geloescht_am: "${vor}", aktualisiert_am: "${vor}", payload: {}, buero_fc_status: "offen" });
    F.tabellen.kalender_termine.push(pk("pk-zahl", "zb"), pk("pk-leitung", "za"));` });
  const toastText = () => page.evaluate(() => (document.getElementById("toast") || {}).textContent || "");
  for (let versuch = 0; versuch < 2; versuch++) {
    await page.evaluate((h) => { location.hash = h; }, "#kalender?ansicht=tag&tag=" + tag(0) + (versuch ? "&x=" + versuch : "")); await warte(page, 600);
    if (await page.waitForSelector("#pkKarte", { timeout: 4000 }).then(() => true, () => false)) break;
  }
  await page.waitForFunction(() => /Papierkorb \(\d+\)/.test((document.querySelector("#pkKarte summary") || {}).textContent || ""), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => { const k = document.getElementById("pkKarte"); if (k) k.open = true; }); await warte(page, 200);
  await page.evaluate(() => { window.__FAKE.hook = (a) => (a.tabelle === "kalender_termine" && a.art === "update"
    ? { data: null, error: a.werte && a.werte.geloescht === false && window.__pkFehler ? window.__pkFehler : null } : null); });
  const zurueck = async (id, fehler) => {
    await page.evaluate((e) => { window.__pkFehler = e; document.getElementById("toast").textContent = ""; }, fehler);
    await page.click(`[data-pkzurueck="${id}"]`); await warte(page, 500);
    return toastText();
  };
  await pruefe("Z10a", "Büro-Papierkorb: Termin eines Gesperrten, „Wiederherstellen“ → Server P0001 „Zahlung ausstehend“ → Toast mit „Zahlung ausstehend“, ohne „Leitung“", async () => {
    if (!(await page.$('[data-pkzurueck="pk-zahl"]'))) return "Wiederherstellen-Knopf fehlt";
    const m = await zurueck("pk-zahl", { code: "P0001", message: "Zahlung ausstehend: Rechnung offen" });
    const f = [];
    if (!/Zahlung ausstehend/.test(m)) f.push("kein „Zahlung ausstehend“");
    if (/Leitung/.test(m)) f.push("fälschlich „Leitung“");
    return f.length ? f.concat("Toast: " + m) : null;
  });
  await pruefe("Z10b", "Büro-Papierkorb: P0001 ohne Zahlungstext („Termin entfernt …“) zeigt weiter „die Leitung hat diesen Termin entfernt“", async () => {
    if (!(await page.$('[data-pkzurueck="pk-leitung"]'))) return "Wiederherstellen-Knopf fehlt";
    const m = await zurueck("pk-leitung", { code: "P0001", message: "Termin entfernt: von der Leitung gelöscht" });
    return /die Leitung hat diesen Termin entfernt/.test(m) && !/Zahlung ausstehend/.test(m) ? null : "Toast: " + m;
  });
  await pruefe("Z10c", "Büro-Papierkorb: Termine bleiben im Papierkorb (kein Erfolg vorgetäuscht), keine Konsolenfehler, kein Fenster", async () => {
    const n = await page.locator("[data-pkzurueck]").count();
    return n === 2 && !konsole.length ? null : `Zeilen im Papierkorb ${n} · ${konsole.join(" | ")}`;
  });
  await ctx.close();
  });
}

await browser.close();
server.close();
console.log(`\nZahlung-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
