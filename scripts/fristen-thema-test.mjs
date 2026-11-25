// W15 Schritt 3: Thema „Fristen“ der Büro-Einstellungen (buero-fristen.js) im echten Browser, erfundene Daten, ohne Netz.
// Bis der Einstellungs-Rahmen von Werkstatt 11 (KE, BUERO_EINSTELLUNGEN_THEMEN) auf main ist, läuft das Thema in einem kleinen
// Testgerüst: buero.css + kompass-rechnen.js + Attrappe von KE (gleiche Schnittstelle wie W11: wert/setze/zuruecksetzen).
// Prüft: Tabelle, gesetzliche Fristen grau, Speichern + Rückgängig, Prüfung der Eingaben, „Standard“, nur Lesen, Fehler beim
// Speichern, Warnung wenn der Server andere Monate rechnet, ke:geladen, Handy 360/412 hoch und quer (Tippflächen ≥ 44 px).
// Aufruf: NODE_PATH=$(npm root -g) node scripts/fristen-thema-test.mjs   (Bilder: FRISTEN_BILDER=/pfad)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const GERUEST = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="buero.css"></head><body><main class="inhalt" style="padding:16px"><div class="karte"><div class="karte-kopf"><h2>Fristen</h2></div><div id="ziel"></div></div></main>
<script src="kompass-rechnen.js"></script>
<script>
  // Attrappe von KE (Werkstatt 11): gleiche Aufrufe, Werte nur im Speicher
  window.AUFRUFE = []; window.MELDUNGEN = []; window.FEHLER_BEIM_SPEICHERN = false; window.SERVER_MONATE = null;
  const ablage = {};
  window.KE = {
    wert(k, std) { return Object.assign({}, std, ablage[k] || {}); },
    async setze(sb, fs, k, obj) { AUFRUFE.push(["setze", fs, k, obj]); if (FEHLER_BEIM_SPEICHERN) return { data: null, error: { message: "Netz weg" } }; ablage[k] = obj; return { data: null, error: null }; },
    async zuruecksetzen(sb, fs, k) { AUFRUFE.push(["zuruecksetzen", fs, k]); delete ablage[k]; return { data: null, error: null }; },
    _ablage: ablage,
  };
  // wie buero.js: Rückgängig-Hinweis und Regel vom Server
  window.toast = (t) => MELDUNGEN.push(["toast", t]);
  window.toastUndo = (text, zurueck) => { document.querySelectorAll(".toast-undo").forEach((x) => x.remove());
    const el = document.createElement("div"); el.className = "toast toast-undo zeigen"; el.innerHTML = '<span class="toast-text"></span><button type="button" class="toast-knopf" data-undo>Rückgängig</button>';
    el.querySelector(".toast-text").textContent = text; document.body.appendChild(el);
    el.querySelector("[data-undo]").addEventListener("click", async () => { el.remove(); await zurueck(); }); };
  window.ladeReaktRegelNeu = async () => { const m = SERVER_MONATE ?? (KE._ablage["fristen.reaktivierung"] || {}).monate ?? 12; KR.setzeReaktRegel({ monate: m, frei: [] }); };
  KR.setzeReaktRegel({ monate: 12, frei: [] });
</script>
<script src="buero-fristen.js"></script>
<script>
  window.zeige = (darf) => { const t = BUERO_EINSTELLUNGEN_THEMEN.find((x) => x.id === "fristen");
    t.render(document.getElementById("ziel"), { sb: {}, fahrschuleId: "fs-1", rolle: "buero", darfSchreiben: darf !== false, meldung: (text, art) => MELDUNGEN.push([art, text]) }); return t; };
</script></body></html>`;

const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    if (pfad === "/" || pfad === "/geruest.html") { res.writeHead(200, { "Content-Type": "text/html" }); res.end(GERUEST); return; }
    const datei = await readFile(join(ROOT, pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/geruest.html`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const BILDER = process.env.FRISTEN_BILDER || "";
if (BILDER) await mkdir(BILDER, { recursive: true });
let ok = 0, schlecht = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { schlecht++; console.log("FEHLER  " + name + (info ? " · " + info : "")); } }

async function oeffne({ breite = 1366, hoehe = 900, darf = true, schema = "light" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: schema });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(String(e)));
  await page.goto(basis);
  await page.evaluate((d) => window.zeige(d), darf);
  return { page, ctx, jsFehler };
}
const feld = (page, art, f) => page.locator(`input[data-art="${art}"][data-feld="${f}"]`);
const fristen = (page) => page.evaluate(() => KR.holeFristen());

try {
  // ---------- 1. Tabelle ----------
  {
    const { page, ctx, jsFehler } = await oeffne();
    pruefe("T1a 8 Zeilen (7 Fristen + Praxisprüfung)", (await page.locator("[data-esf-zeile]").count()) === 8);
    pruefe("T1b Kopfzeile sichtbar (Frist | Dauer | Warnung | Vorwarnung)", await page.locator(".esf-kopf").isVisible() && /Dauer[\s\S]*Warnung \(gelb\)[\s\S]*Vorwarnung \(blau\)/.test(await page.locator(".esf-kopf").innerText()));
    pruefe("T1c Standardwerte in den Feldern", (await feld(page, "theorie", "monate").inputValue()) === "12" && (await feld(page, "antrag", "bald_tage").inputValue()) === "60" && (await feld(page, "fahrlehrer", "bald_tage").inputValue()) === "90");
    const praxis = page.locator('[data-esf-zeile="theorie-anzeigen"]'), um = page.locator('[data-esf-zeile="umschreiber"]');
    pruefe("T1d Praxisprüfung grau, 12 Monate, § 18 FeV, ohne Eingabe", /12 Monate/.test(await praxis.innerText()) && /§ 18 FeV/.test(await praxis.innerText()) && (await praxis.locator("input").count()) === 0 && (await praxis.getAttribute("class")).includes("esf-gesetz"));
    pruefe("T1e Umschreiber: 6 Monate § 29 FeV fest, nur Warnzeit einstellbar", /6 Monate/.test(await um.innerText()) && /§ 29 FeV/.test(await um.innerText()) && (await um.locator("input").count()) === 1 && (await um.locator('input[data-feld="bald_tage"]').count()) === 1);
    pruefe("T1f Behörden-Frist ohne Dauer (Datum aus der Akte)", (await page.locator('input[data-art="behoerde"][data-feld="monate"]').count()) === 0 && /Datum aus der Akte/.test(await page.locator('[data-esf-zeile="behoerde"]').innerText()));
    pruefe("T1g Speichern aus, „Nichts geändert.“", await page.locator("[data-esf-speichern]").isDisabled() && (await page.locator("[data-esf-status]").innerText()) === "Nichts geändert.");
    pruefe("T1h alle Standard-Knöpfe aus", (await page.locator("[data-esf-standard]:not([disabled])").count()) === 0);
    pruefe("T1i Felder haben eine Beschriftung für Vorlese-Programme", (await page.$$eval("[data-esf] input", (l) => l.every((i) => /bis/.test(i.getAttribute("aria-label") || "")))));
    if (BILDER) await page.screenshot({ path: join(BILDER, "fristen-1366.png"), fullPage: true });
    pruefe("T1z keine JS-Fehler", !jsFehler.length, jsFehler.join(" | "));
    await ctx.close();
  }
  // ---------- 2. Speichern und Rückgängig ----------
  {
    const { page, ctx, jsFehler } = await oeffne();
    await feld(page, "theorie", "monate").fill("6");
    pruefe("T2a nach Eingabe: Speichern an, „1 Frist geändert“", await page.locator("[data-esf-speichern]").isEnabled() && /1 Frist geändert/.test(await page.locator("[data-esf-status]").innerText()));
    pruefe("T2b verlassen() meldet ungesicherte Änderung", (await page.evaluate(() => BUERO_EINSTELLUNGEN_THEMEN.find((x) => x.id === "fristen").verlassen())) === false);
    pruefe("T2c noch nichts gespeichert, Rechnung unverändert", (await page.evaluate(() => AUFRUFE.length)) === 0 && (await fristen(page)).theorie.monate === 12);
    await page.locator("[data-esf-speichern]").click();
    await page.waitForSelector(".toast-undo");
    const a = await page.evaluate(() => AUFRUFE);
    pruefe("T2d genau eine Frist geschrieben (ganzes Objekt)", JSON.stringify(a) === JSON.stringify([["setze", "fs-1", "fristen.theorie", { monate: 6, bald_tage: 30, vorwarn_tage: 60 }]]), JSON.stringify(a));
    pruefe("T2e Rechnung sofort mit 6 Monaten", (await fristen(page)).theorie.monate === 6);
    pruefe("T2f Hinweis mit Rückgängig, kein Bestätigen-Fenster", /Theorieunterricht“ gespeichert/.test(await page.locator(".toast-undo").innerText()));
    pruefe("T2g Zeile als geändert markiert, Standard-Knopf an", (await page.locator('[data-esf-zeile="theorie"]').getAttribute("class")).includes("esf-geaendert") && await page.locator('[data-esf-standard="theorie"]').isEnabled());
    pruefe("T2h verlassen() nach dem Speichern frei", (await page.evaluate(() => BUERO_EINSTELLUNGEN_THEMEN.find((x) => x.id === "fristen").verlassen())) === true);
    await page.locator(".toast-undo [data-undo]").click();
    await page.waitForFunction(() => AUFRUFE.length === 2);
    const b = await page.evaluate(() => AUFRUFE[1]);
    pruefe("T2i Rückgängig: zurück auf Standard = Eintrag löschen", JSON.stringify(b) === JSON.stringify(["zuruecksetzen", "fs-1", "fristen.theorie"]), JSON.stringify(b));
    pruefe("T2j Rückgängig: Rechnung und Feld wieder 12", (await fristen(page)).theorie.monate === 12 && (await feld(page, "theorie", "monate").inputValue()) === "12");
    // zwei Fristen auf einmal
    await feld(page, "behoerde", "bald_tage").fill("14"); await feld(page, "fahrlehrer", "bald_tage").fill("60");
    await page.locator("[data-esf-speichern]").click();
    await page.waitForFunction(() => AUFRUFE.length === 4);
    pruefe("T2k zwei Fristen gespeichert, Meldung „2 Fristen gespeichert“", /2 Fristen gespeichert/.test(await page.locator(".toast-undo").innerText()) && (await fristen(page)).behoerde.bald_tage === 14 && (await fristen(page)).fahrlehrer.bald_tage === 60);
    pruefe("T2l Behörden-Frist: Vorwarnung bleibt 60", JSON.stringify((await page.evaluate(() => AUFRUFE[2]))[3]) === JSON.stringify({ bald_tage: 14, vorwarn_tage: 60 }));
    pruefe("T2z keine JS-Fehler", !jsFehler.length, jsFehler.join(" | "));
    await ctx.close();
  }
  // ---------- 3. Eingaben prüfen, Standard ----------
  {
    const { page, ctx, jsFehler } = await oeffne();
    await feld(page, "antrag", "monate").fill("0");
    pruefe("T3a 0 Monate: rot, Hinweis, Speichern aus", (await feld(page, "antrag", "monate").getAttribute("aria-invalid")) === "true" && /1 bis 60/.test(await page.locator('[data-esf-fehler="antrag"]').innerText()) && await page.locator("[data-esf-speichern]").isDisabled());
    await feld(page, "antrag", "monate").fill("61");
    pruefe("T3b 61 Monate abgelehnt", /1 bis 60/.test(await page.locator('[data-esf-fehler="antrag"]').innerText()));
    await feld(page, "antrag", "monate").fill("1,5");
    pruefe("T3c Kommazahl abgelehnt", (await feld(page, "antrag", "monate").getAttribute("aria-invalid")) === "true");
    await feld(page, "antrag", "monate").fill("18");
    pruefe("T3d gültig: Hinweis weg, Speichern an", await page.locator('[data-esf-fehler="antrag"]').isHidden() && await page.locator("[data-esf-speichern]").isEnabled());
    await feld(page, "theorie", "bald_tage").fill("70");
    pruefe("T3e Vorwarnung vor Warnung: Hinweis, Speichern aus", /Vorwarnung \(blau\) kommt vor der Warnung/.test(await page.locator('[data-esf-fehler="theorie"]').innerText()) && await page.locator("[data-esf-speichern]").isDisabled());
    await feld(page, "theorie", "bald_tage").fill("30");
    await feld(page, "fahrlehrer", "bald_tage").fill("366");
    pruefe("T3f 366 Tage abgelehnt", /1 bis 365/.test(await page.locator('[data-esf-fehler="fahrlehrer"]').innerText()));
    await feld(page, "fahrlehrer", "bald_tage").fill("120");
    pruefe("T3g Standard-Knopf an, sobald etwas abweicht", await page.locator('[data-esf-standard="fahrlehrer"]').isEnabled());
    await page.locator('[data-esf-standard="fahrlehrer"]').click();
    pruefe("T3h Standard setzt die Felder zurück (90), Knopf wieder aus", (await feld(page, "fahrlehrer", "bald_tage").inputValue()) === "90" && await page.locator('[data-esf-standard="fahrlehrer"]').isDisabled());
    pruefe("T3i nichts gespeichert ohne Speichern", (await page.evaluate(() => AUFRUFE.length)) === 0);
    pruefe("T3z keine JS-Fehler", !jsFehler.length, jsFehler.join(" | "));
    await ctx.close();
  }
  // ---------- 4. Nur lesen, Fehler beim Speichern, Server rechnet anders, ke:geladen ----------
  {
    const { page, ctx } = await oeffne({ darf: false });
    pruefe("T4a ohne Recht: alle Felder gesperrt, kein Speichern-Knopf", (await page.locator("[data-esf] input:not([disabled])").count()) === 0 && (await page.locator("[data-esf-speichern]").count()) === 0 && /Ändern dürfen Büro, Leitung/.test(await page.locator("[data-esf]").innerText()));
    await ctx.close();
  }
  {
    const { page, ctx, jsFehler } = await oeffne();
    await page.evaluate(() => { FEHLER_BEIM_SPEICHERN = true; });
    await feld(page, "fc_zettel", "monate").fill("6");
    await page.locator("[data-esf-speichern]").click();
    await page.waitForFunction(() => MELDUNGEN.some((m) => m[0] === "fehler"));
    pruefe("T4b Fehler: Meldung, Eingabe bleibt stehen, Rechnung unverändert", (await feld(page, "fc_zettel", "monate").inputValue()) === "6" && (await fristen(page)).fc_zettel.monate === 12 && (await page.locator(".toast-undo").count()) === 0);
    await page.evaluate(() => { FEHLER_BEIM_SPEICHERN = false; });
    await page.locator("[data-esf-speichern]").click();
    await page.waitForSelector(".toast-undo");
    pruefe("T4c zweiter Versuch klappt", (await fristen(page)).fc_zettel.monate === 6);
    // Server (Datenbank-Update fehlt) rechnet noch mit 12 Monaten
    await page.evaluate(() => { SERVER_MONATE = 12; });
    await feld(page, "reaktivierung", "monate").fill("24");
    await page.locator("[data-esf-speichern]").click();
    await page.waitForFunction(() => MELDUNGEN.some((m) => m[0] === "warnung"));
    pruefe("T4d Warnung: Datenbank rechnet noch mit 12 Monaten", /noch mit 12 Monaten/.test((await page.evaluate(() => MELDUNGEN.find((m) => m[0] === "warnung")))[1]));
    await page.evaluate(() => { SERVER_MONATE = null; MELDUNGEN.length = 0; });
    await feld(page, "reaktivierung", "monate").fill("18");
    await page.locator("[data-esf-speichern]").click();
    await page.waitForFunction(() => KR.reaktMonate() === 18);
    pruefe("T4e Server rechnet gleich: keine Warnung", !(await page.evaluate(() => MELDUNGEN.some((m) => m[0] === "warnung"))));
    // Einstellungen neu geladen (andere Fahrschule / anderes Gerät): ke:geladen übernimmt sie
    await page.evaluate(() => { KE._ablage["fristen.umschreiber"] = { bald_tage: 45 }; window.dispatchEvent(new Event("ke:geladen")); });
    pruefe("T4f ke:geladen: Rechnung übernimmt neue Werte", (await fristen(page)).umschreiber.bald_tage === 45);
    await page.evaluate(() => { KE._ablage["fristen.umschreiber"] = { bald_tage: 9999 }; window.dispatchEvent(new Event("ke:geladen")); });
    pruefe("T4g ke:geladen mit ungültigem Wert: Standard", (await fristen(page)).umschreiber.bald_tage === 30);
    pruefe("T4z keine JS-Fehler", !jsFehler.length, jsFehler.join(" | "));
    await ctx.close();
  }
  // ---------- 5. Handy und Tablet: nichts abgeschnitten, Tippflächen ≥ 44 px, hell/dunkel ----------
  for (const [b, h, schema] of [[360, 780, "light"], [412, 900, "dark"], [780, 360, "light"], [915, 412, "dark"], [768, 1024, "light"], [1024, 768, "light"], [1180, 820, "dark"], [1366, 900, "light"]]) {
    const { page, ctx, jsFehler } = await oeffne({ breite: b, hoehe: h, schema });
    const m = await page.evaluate(() => {
      const breit = document.documentElement.scrollWidth, sicht = document.documentElement.clientWidth;
      const klein = [...document.querySelectorAll("[data-esf] input, [data-esf] button")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).visibility !== "hidden" && r.height < 44; }).map((e) => e.id || e.textContent);
      const raus = [...document.querySelectorAll("[data-esf] *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > sicht + 1; }).map((e) => e.className || e.tagName).slice(0, 5);
      // Kein Text liegt auf einem Feld (Tablet: Namensspalte zu schmal)
      const ueber = [];
      document.querySelectorAll("[data-esf-zeile]").forEach((z) => {
        const t = z.querySelector(".esf-text").getBoundingClientRect();
        z.querySelectorAll("input, .esf-fest").forEach((e) => { const r = e.getBoundingClientRect();
          if (r.left < t.right - 1 && r.right > t.left + 1 && r.top < t.bottom - 1 && r.bottom > t.top + 1) ueber.push(z.dataset.esfZeile); });
      });
      const schmal = [...document.querySelectorAll(".esf-text")].filter((e) => e.getBoundingClientRect().width < 200).length;
      return { breit, sicht, klein, raus, ueber, schmal };
    });
    pruefe(`T5 ${b}×${h} ${schema}: keine Seitwärts-Rolle`, m.breit <= m.sicht, JSON.stringify(m));
    pruefe(`T5 ${b}×${h}: nichts ragt rechts heraus`, !m.raus.length, m.raus.join(", "));
    pruefe(`T5 ${b}×${h}: Felder und Knöpfe ≥ 44 px hoch`, !m.klein.length, m.klein.join(", "));
    pruefe(`T5 ${b}×${h}: kein Text liegt auf einem Feld`, !m.ueber.length, m.ueber.join(", "));
    pruefe(`T5 ${b}×${h}: Namensspalte mindestens 200 px breit`, !m.schmal, String(m.schmal));
    if (b < 700) pruefe(`T5 ${b}: Beschriftung je Feld sichtbar (Kopfzeile aus)`, await page.locator(".esf-kopf").isHidden() && await page.locator('label[for="esf-theorie-monate"] .esf-label').isVisible());
    await feld(page, "theorie", "monate").fill("9");
    pruefe(`T5 ${b}: Speichern erreichbar`, await page.locator("[data-esf-speichern]").isEnabled());
    if (BILDER) await page.screenshot({ path: join(BILDER, `fristen-${b}x${h}-${schema}.png`), fullPage: true });
    pruefe(`T5 ${b}: keine JS-Fehler`, !jsFehler.length, jsFehler.join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\nFristen-Thema-Test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
