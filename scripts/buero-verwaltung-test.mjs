// Büro-Verwaltung-Test (Werkstatt 16, 24.11.2026): Urlaub, Schichtplan und Backups auf der Büro-Seite.
// Anlass: W16 Teil 2 (25.11.2026) bringt diese drei auf die Büro-Seite (bisher nur in der App-Gesamtansicht), damit das Büro später nur noch sie braucht.
// Geprüft mit der Attrappe (buero-vorfuehrung.js, erfundene Namen „Muster“), am PC (1366) und am Handy (360):
//   V1 Urlaub für einen Fahrlehrer: mit Fahrlehrer-ID gespeichert, in der Liste · V2 andere Person: ohne ID, „keine Sperre“
//   V3 falsche Eingabe (bis vor von): Fenster bleibt offen, nichts gespeichert · V4 Löschen ohne Rückfrage, „Rückgängig“ holt ihn zurück
//   V5 Schichtplan: 14 Tage, Eintrag mit Status, Löschen · V6 Backups: jetzt sichern, Liste, Herunterladen
//   V7 Ladefehler: Hinweis mit „Nochmal laden“ · V8 kein seitliches Verrutschen am Handy · V9 keine JS-Fehler
//   V11 Löschen ganz unten: die Seite springt nicht nach oben
//   V10 Termin auf einen Urlaubstag: Warnung im Termin-Fenster (die Büro-Seite kennt keine blockierten Tage wie die App)
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/buero-verwaltung-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const { bauDaten } = require("../buero-vorfuehrung.js");
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "buero.html" : p)); res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" }); res.end(d); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let ok = 0, fehler = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r == null || r === true || (Array.isArray(r) && !r.length)) { ok++; console.log(`ok  ${id} ${text}`); return; }
  fehler++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (p, ms = 250) => p.waitForTimeout(ms);
const HEUTE = new Date().toISOString().slice(0, 10);
const plus = (iso, t) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + t); return d.toISOString().slice(0, 10); };

// person: wer am Büro-PC sitzt (PIN). Paula hat kein Verwalten-Recht, Mia hat es: beide sehen Urlaub, Schichtplan und Backups (W11/W16).
async function oeffne({ breite, hoehe, ladefehler = false, person = ["Paula Muster", "7352"] }) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, acceptDownloads: true });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, ladefehler]) => {
    d.tabellen.fahrschule_urlaub = []; d.tabellen.fahrschule_schichten = []; d.tabellen.fahrschule_backups = [];
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: "bu-1", email: "bu-1@example.org" } },
      rpcs: { fahrschule_backup_erstellen: (a, F) => { F.tabellen.fahrschule_backups.push({ id: "bk-" + F.tabellen.fahrschule_backups.length, fahrschule_id: a.fs_id, erstellt_am: new Date().toISOString(), automatisch: !!a.ist_automatisch, daten: { schueler: [{ name: "Muster" }] } }); return null; } },
      fehler: ladefehler ? { fahrschule_urlaub: "Testfehler" } : {} };
  }, [bauDaten(HEUTE), ladefehler]);
  await page.goto(basis + "buero.html#urlaub");
  await warte(page, 500);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1500 }).catch(() => null);
  if (frage) { await page.click(`#werListe button:has-text("${person[0]}")`); await page.keyboard.type(person[1], { delay: 20 }); await warte(page, 500); }
  return { page, ctx, konsole };
}
const fs = (page, t) => page.evaluate((t) => JSON.parse(JSON.stringify(window.__FAKE.tabellen[t] || [])), t);
const gehe = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await warte(page, 600); };

for (const [n, w, h, person] of [["PC, Büro ohne Verwalten-Recht", 1366, 860, ["Paula Muster", "7352"]], ["Handy, Büro mit Verwalten-Recht", 360, 780, ["Mia Muster", "5917"]]]) {
  const P = `[${n}]`;
  const { page, ctx, konsole } = await oeffne({ breite: w, hoehe: h, person });
  await pruefe("V0", `${P} Leiste: Urlaub, Schichtplan und Backups da`, () => page.evaluate(() => { const h = [...document.querySelectorAll("#nav .nav-punkt")].map((a) => a.getAttribute("href")); const f = ["#urlaub", "#schichtplan", "#backups"].filter((x) => !h.includes(x)); return f.length ? "fehlt: " + f.join(", ") : null; }));
  await gehe(page, "#urlaub");
  // V1 Urlaub für einen Fahrlehrer
  await page.click("#vwUrlaubNeu");
  await warte(page, 300);
  const lid = await page.evaluate(() => { const s = document.querySelector("dialog[open] select[name=wer]"); const o = [...s.options].find((x) => /Anton Muster/.test(x.textContent)); return o && o.value; });
  await page.selectOption("dialog[open] select[name=wer]", lid || "");
  await page.fill("dialog[open] input[name=von]", plus(HEUTE, 3)); await page.fill("dialog[open] input[name=bis]", plus(HEUTE, 5));
  await page.click("dialog[open] footer button[value=ok]"); await warte(page, 700);
  await pruefe("V1", `${P} Urlaub für einen Fahrlehrer: mit Fahrlehrer-ID gespeichert und in der Liste`, async () => {
    const t = await fs(page, "fahrschule_urlaub"), f = [];
    const u = t.find((x) => x.fahrlehrer_id === lid);
    if (!lid) f.push("Fahrlehrer fehlt in der Auswahl");
    if (!u || u.mitarbeiter_name !== "Anton Muster" || u.von !== plus(HEUTE, 3) || u.bis !== plus(HEUTE, 5)) f.push("gespeichert: " + JSON.stringify(t));
    if (await page.locator("dialog[open]").count()) f.push("Fenster noch offen");
    if (!/Anton Muster/.test(await page.textContent("#ansicht"))) f.push("nicht in der Liste");
    return f;
  });
  // V2 andere Person (keine Sperre)
  await page.click("#vwUrlaubNeu"); await warte(page, 300);
  await page.selectOption("dialog[open] select[name=wer]", "_andere");
  await page.fill("dialog[open] input[name=name]", "Kim Muster");
  await page.click("dialog[open] footer button[value=ok]"); await warte(page, 700);
  await pruefe("V2", `${P} andere Person: ohne Fahrlehrer-ID, „keine Sperre“`, async () => {
    const t = await fs(page, "fahrschule_urlaub");
    const u = t.find((x) => x.mitarbeiter_name === "Kim Muster");
    if (!u || u.fahrlehrer_id !== null) return "gespeichert: " + JSON.stringify(u);
    return /Kim Muster[\s\S]*keine Sperre/.test(await page.textContent("#ansicht")) ? null : "Hinweis „keine Sperre“ fehlt";
  });
  // V3 bis vor von
  await page.click("#vwUrlaubNeu"); await warte(page, 300);
  await page.selectOption("dialog[open] select[name=wer]", lid || "");
  await page.fill("dialog[open] input[name=von]", plus(HEUTE, 9)); await page.fill("dialog[open] input[name=bis]", plus(HEUTE, 8));
  const vorher = (await fs(page, "fahrschule_urlaub")).length;
  await page.click("dialog[open] footer button[value=ok]"); await warte(page, 500);
  await pruefe("V3", `${P} „bis“ vor „von“: Fenster bleibt offen, Hinweis, nichts gespeichert`, async () => {
    const f = [];
    if ((await fs(page, "fahrschule_urlaub")).length !== vorher) f.push("trotzdem gespeichert");
    if (!(await page.locator("dialog[open]").count())) f.push("Fenster zu");
    else if (!/Bis/.test((await page.textContent("dialog[open] .dialog-meldung").catch(() => "")) || "")) f.push("kein Hinweis im Fenster");
    return f;
  });
  await page.evaluate(() => { const d = [...document.querySelectorAll("dialog[open]")].pop(); if (d) d.close(); }); await warte(page, 300);
  // V4 Löschen ohne Rückfrage, Rückgängig
  let dialoge = 0; page.on("dialog", (d) => { dialoge++; d.dismiss().catch(() => {}); });
  const kimId = (await fs(page, "fahrschule_urlaub")).find((x) => x.mitarbeiter_name === "Kim Muster").id;
  await page.click(`[data-vwurlaubweg="${kimId}"]`); await warte(page, 700);
  const weg = !(await fs(page, "fahrschule_urlaub")).some((x) => x.id === kimId);
  await page.click("[data-undo]").catch(() => {}); await warte(page, 800);
  await pruefe("V4", `${P} Löschen ohne Rückfrage, „Rückgängig“ holt den Eintrag zurück`, async () => {
    const f = [];
    if (!weg) f.push("nicht gelöscht");
    if (dialoge) f.push("Bestätigen-Fenster");
    const t = await fs(page, "fahrschule_urlaub");
    if (!t.some((x) => x.mitarbeiter_name === "Kim Muster" && x.fahrlehrer_id === null)) f.push("nicht zurückgeholt");
    if (!/Kim Muster/.test(await page.textContent("#ansicht"))) f.push("nicht wieder in der Liste");
    return f;
  });
  // V5 Schichtplan
  await gehe(page, "#schichtplan");
  const tage = await page.locator("[data-vwschichtneu]").count();
  await page.click(`[data-vwschichtneu="${HEUTE}"]`); await warte(page, 300);
  const vorschlag = await page.inputValue("dialog[open] input[name=name]");
  await page.selectOption("dialog[open] select[name=status]", "krank");
  await page.fill("dialog[open] input[name=notiz]", "Arzttermin");
  await page.click("dialog[open] footer button[value=ok]"); await warte(page, 700);
  const sch = await fs(page, "fahrschule_schichten");
  await pruefe("V5", `${P} Schichtplan: 14 Tage, Eintrag mit Status und Notiz (Name vorgeschlagen), Löschen`, async () => {
    const f = [];
    if (tage !== 14) f.push(tage + " Tage statt 14");
    if (vorschlag !== person[0]) f.push("Name nicht vorgeschlagen: " + vorschlag); // wer gerade am Büro-PC sitzt
    const e = sch.find((x) => x.datum === HEUTE);
    if (!e || e.status !== "krank" || e.notiz !== "Arzttermin" || e.mitarbeiter_name !== person[0]) f.push("gespeichert: " + JSON.stringify(sch));
    if (!new RegExp(person[0] + "[\\s\\S]*krank").test(await page.textContent("#ansicht"))) f.push("nicht im Plan");
    if (e) { await page.click(`[data-vwschichtweg="${e.id}"]`); await warte(page, 700); if ((await fs(page, "fahrschule_schichten")).length) f.push("nicht gelöscht"); }
    return f;
  });
  // V6 Backups
  await gehe(page, "#backups");
  await page.click("#vwBackupJetzt"); await warte(page, 800);
  const zeilen = await page.locator("[data-vwbackuplade]").count();
  const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await page.click("[data-vwbackuplade]").catch(() => {});
  const d = await dl;
  await pruefe("V6", `${P} Backups: jetzt sichern, in der Liste, herunterladen`, async () => {
    const f = [];
    if (zeilen !== 1) f.push(zeilen + " Zeilen");
    if (!d) f.push("kein Herunterladen");
    else if (!/^fahrschule-backup-\d{4}-\d{2}-\d{2}\.json$/.test(d.suggestedFilename())) f.push("Dateiname " + d.suggestedFilename());
    return f;
  });
  // V8 kein seitliches Verrutschen, Knöpfe groß genug am Handy
  for (const b of ["#urlaub", "#schichtplan", "#backups"]) {
    await gehe(page, b);
    await pruefe("V8", `${P} ${b}: nichts ragt seitlich heraus`, () => page.evaluate(() => (document.documentElement.scrollWidth <= innerWidth + 1 ? null : "Seite " + document.documentElement.scrollWidth + " px breit")));
  }
  await pruefe("V9", `${P} keine JS-Fehler`, () => konsole);
  await ctx.close();
}
// V7 Ladefehler
{
  const { page, ctx, konsole } = await oeffne({ breite: 1366, hoehe: 860, ladefehler: true });
  await gehe(page, "#urlaub");
  await pruefe("V7", "[PC] Ladefehler: Hinweis mit „Nochmal laden“, danach geladen", async () => {
    const f = [];
    if (!(await page.locator('[data-vwneu="urlaub"]').count())) return "kein „Nochmal laden“: " + (await page.textContent("#ansicht")).slice(0, 120);
    await page.evaluate(() => { window.__FAKE.fehler = {}; });
    await page.click('[data-vwneu="urlaub"]'); await warte(page, 700);
    if (!/Noch nichts eingetragen/.test(await page.textContent("#ansicht"))) f.push("nach „Nochmal laden“ nicht geladen");
    return f.concat(konsole);
  });
  await ctx.close();
}
// V10 Termin auf einen Urlaubstag (Daten-Prüfer W16 Teil 2): das Termin-Fenster warnt, „Abbrechen“ speichert nichts, „Trotzdem“ speichert
{
  const { page, ctx, konsole } = await oeffne({ breite: 1366, hoehe: 860 });
  const tag = plus(HEUTE, 4);
  const lid = await page.evaluate(([von, bis]) => {
    const l = S.lehrer.find((x) => /Anton Muster/.test(x.name || ""));
    window.__FAKE.tabellen.fahrschule_urlaub.push({ id: "u-v10", fahrschule_id: S.fsId, fahrlehrer_id: l.id, mitarbeiter_name: l.name, von, bis, erstellt_von: "bu-1" });
    VW.stand.urlaub = 0; // Liste gilt als alt: das Termin-Fenster lädt sie frisch
    return l.id;
  }, [plus(HEUTE, 3), plus(HEUTE, 5)]);
  const anzahl = () => page.evaluate((t) => window.__FAKE.tabellen.kalender_termine.filter((x) => x.datum === t && x.art === "block").length, tag);
  const vorher = await anzahl();
  const versuch = async (ja) => {
    await page.evaluate(([t, l]) => terminDialog(null, { datum: t, von: "20:00", fahrlehrer_id: l }), [tag, lid]); await warte(page, 250);
    await page.selectOption("dialog[open] select[name=art]", "block");
    await page.click("dialog[open] footer button[value=ok]"); await warte(page, 600);
    const text = await page.evaluate(() => { const d = [...document.querySelectorAll("dialog[open]")].pop(); return d ? d.textContent : ""; });
    if (/Urlaub/.test(text)) {
      if (ja) await page.locator("dialog[open]").last().locator("footer button[value=ok]").click();
      else await page.keyboard.press("Escape");
      await warte(page, 700);
    }
    await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close())); await warte(page, 300); // übrige Fenster zu
    return text;
  };
  const t1 = await versuch(false);
  const nachNein = await anzahl();
  const t2 = await versuch(true);
  const nachJa = await anzahl();
  await pruefe("V10", "Termin auf einen Urlaubstag: Warnung nennt den Urlaub, Abbrechen speichert nichts, Trotzdem speichert", () => {
    const f = [];
    if (!/Anton Muster hat vom .* Urlaub/.test(t1)) f.push("keine Warnung: " + t1.slice(0, 120));
    if (nachNein !== vorher) f.push("trotz Abbrechen gespeichert");
    if (!/Urlaub/.test(t2) || nachJa !== vorher + 1) f.push(`„Trotzdem“: ${nachJa - vorher} gespeichert`);
    return f;
  });
  // Gegenprobe: anderer Tag ohne Urlaub → keine Warnung
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await page.evaluate(([t, l]) => terminDialog(null, { datum: t, von: "20:00", fahrlehrer_id: l }), [plus(HEUTE, 9), lid]); await warte(page, 250);
  await page.selectOption("dialog[open] select[name=art]", "block");
  await page.click("dialog[open] footer button[value=ok]"); await warte(page, 700);
  await pruefe("V10", "Tag ohne Urlaub: keine Warnung, gespeichert", async () => (/Urlaub/.test(await page.evaluate(() => [...document.querySelectorAll("dialog[open]")].map((d) => d.textContent).join(" "))) ? "Warnung ohne Urlaub" : (await page.evaluate((t) => window.__FAKE.tabellen.kalender_termine.some((x) => x.datum === t && x.art === "block"), plus(HEUTE, 9))) ? null : "nicht gespeichert"));
  await pruefe("V10", "keine JS-Fehler", () => konsole);
  await ctx.close();
}
// V11 Löschen ganz unten im Schichtplan: die Seite bleibt, wo sie ist (Bedienungs-Prüfer W16 Teil 2: sprang nach oben)
{
  const { page, ctx, konsole } = await oeffne({ breite: 360, hoehe: 780 });
  await gehe(page, "#schichtplan");
  const letzter = await page.evaluate(() => vwSchichtZeitraum().bis);
  await page.click(`[data-vwschichtneu="${letzter}"]`); await warte(page, 300);
  await page.click("dialog[open] footer button[value=ok]"); await warte(page, 800);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await warte(page, 300);
  const vorher = await page.evaluate(() => window.scrollY);
  const id = await page.evaluate((t) => (window.__FAKE.tabellen.fahrschule_schichten.find((x) => x.datum === t) || {}).id, letzter);
  await page.click(`[data-vwschichtweg="${id}"]`); await warte(page, 900);
  const nachher = await page.evaluate(() => window.scrollY);
  await pruefe("V11", "Löschen ganz unten: Seite springt nicht nach oben", () => (vorher > 200 && Math.abs(vorher - nachher) < 120 ? null : `vorher ${Math.round(vorher)} px, danach ${Math.round(nachher)} px`));
  await pruefe("V11", "keine JS-Fehler", () => konsole);
  await ctx.close();
}
await browser.close();
server.close();
console.log(`\nBüro-Verwaltung-Test: ${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
