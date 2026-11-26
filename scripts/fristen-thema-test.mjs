// W15 Schritt 3: Thema „Fristen“ der Büro-Einstellungen (buero-fristen.js) im echten Browser, erfundene Daten, ohne Netz.
// Teil T: das Thema in einem kleinen Testgerüst (buero.css + kompass-rechnen.js + Attrappe von KE) – alle Einzelheiten.
// Teil B (W15 PR 3): im echten Rahmen von Werkstatt 11 auf buero.html mit der Büro-Attrappe (buero-vorfuehrung.js, echtes KE):
// Liste der Themen, Speichern in fahrschule_einstellungen, Rückgängig, Eingaben beim Neuzeichnen behalten, Rückfrage beim Verlassen,
// „Läuft bald ab“ rechnet mit den gespeicherten Warnzeiten, gespeicherte Werte beim Start, Büro-Rolle, Handy.
// Teil A (W15 PR 3): die App (index.html) übernimmt die Fristen der Fahrschule aus KE, andere Fahrschule = Standard, Abmelden = Standard.
// Prüft: Tabelle, gesetzliche Fristen fest (Paragraf), Speichern + Rückgängig, Prüfung der Eingaben, „Standard“, nur Lesen, Fehler beim
// Speichern, Warnung wenn der Server andere Monate rechnet, ke:geladen, Handy 360/412 hoch und quer (Tippflächen ≥ 44 px).
// Aufruf: NODE_PATH=$(npm root -g) node scripts/fristen-thema-test.mjs   (Bilder: FRISTEN_BILDER=/pfad)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { bauDaten } = require("../buero-vorfuehrung.js");
const d0 = new Date(); const HEUTE = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
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
const wurzel = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
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
// Wie ein Mensch tippen: Playwright „fill“ kürzt im Testgerüst manche Werte („70“ → „7“), echtes Tippen nicht
const tippe = async (page, art, f, v) => { const i = feld(page, art, f); await i.click(); await i.press("Control+A"); if (v === "") await i.press("Delete"); else await i.pressSequentially(v); };
const fristen = (page) => page.evaluate(() => KR.holeFristen());

try {
  // ---------- 1. Tabelle ----------
  {
    const { page, ctx, jsFehler } = await oeffne();
    pruefe("T1a 8 Zeilen (7 Fristen + Praxisprüfung)", (await page.locator("[data-esf-zeile]").count()) === 8);
    pruefe("T1b Kopfzeile sichtbar (Frist | Dauer | Warnung | Vorwarnung)", await page.locator(".esf-kopf").isVisible() && /Dauer[\s\S]*Warnung \(gelb\)[\s\S]*Vorwarnung \(blau\)/.test(await page.locator(".esf-kopf").innerText()));
    pruefe("T1c Standardwerte in den Feldern", (await feld(page, "theorie", "monate").inputValue()) === "12" && (await feld(page, "antrag", "bald_tage").inputValue()) === "60" && (await feld(page, "fahrlehrer", "bald_tage").inputValue()) === "90");
    const praxis = page.locator('[data-esf-zeile="theorie-anzeigen"]'), um = page.locator('[data-esf-zeile="umschreiber"]');
    pruefe("T1d Praxisprüfung fest (Paragraf-Marke), 12 Monate, § 18 FeV, ohne Eingabe", /12 Monate/.test(await praxis.innerText()) && /§ 18 FeV/.test(await praxis.innerText()) && (await praxis.locator("input").count()) === 0 && (await praxis.getAttribute("class")).includes("esf-gesetz"));
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
    await tippe(page, "theorie", "monate", "6");
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
    await tippe(page, "behoerde", "bald_tage", "14"); await tippe(page, "fahrlehrer", "bald_tage", "60");
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
    await tippe(page, "antrag", "monate", "0");
    pruefe("T3a 0 Monate: rot, Hinweis, Speichern aus", (await feld(page, "antrag", "monate").getAttribute("aria-invalid")) === "true" && /1 bis 60/.test(await page.locator('[data-esf-fehler="antrag"]').innerText()) && await page.locator("[data-esf-speichern]").isDisabled());
    await tippe(page, "antrag", "monate", "61");
    pruefe("T3b 61 Monate abgelehnt", /1 bis 60/.test(await page.locator('[data-esf-fehler="antrag"]').innerText()));
    await tippe(page, "antrag", "monate", "1,5");
    pruefe("T3c Kommazahl abgelehnt", (await feld(page, "antrag", "monate").getAttribute("aria-invalid")) === "true");
    await tippe(page, "antrag", "monate", "18");
    pruefe("T3d gültig: Hinweis weg, Speichern an", await page.locator('[data-esf-fehler="antrag"]').isHidden() && await page.locator("[data-esf-speichern]").isEnabled());
    await tippe(page, "theorie", "bald_tage", "70");
    pruefe("T3e Vorwarnung vor Warnung: Hinweis, Speichern aus", /Vorwarnung \(blau\) kommt vor der Warnung/.test(await page.locator('[data-esf-fehler="theorie"]').innerText()) && await page.locator("[data-esf-speichern]").isDisabled());
    await tippe(page, "theorie", "bald_tage", "30");
    await tippe(page, "fahrlehrer", "bald_tage", "366");
    pruefe("T3f 366 Tage abgelehnt", /1 bis 365/.test(await page.locator('[data-esf-fehler="fahrlehrer"]').innerText()));
    await tippe(page, "fahrlehrer", "bald_tage", "120");
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
    await tippe(page, "fc_zettel", "monate", "6");
    await page.locator("[data-esf-speichern]").click();
    await page.waitForFunction(() => MELDUNGEN.some((m) => m[0] === "fehler"));
    pruefe("T4b Fehler: Meldung, Eingabe bleibt stehen, Rechnung unverändert", (await feld(page, "fc_zettel", "monate").inputValue()) === "6" && (await fristen(page)).fc_zettel.monate === 12 && (await page.locator(".toast-undo").count()) === 0);
    await page.evaluate(() => { FEHLER_BEIM_SPEICHERN = false; });
    await page.locator("[data-esf-speichern]").click();
    await page.waitForSelector(".toast-undo");
    pruefe("T4c zweiter Versuch klappt", (await fristen(page)).fc_zettel.monate === 6);
    // Server (Datenbank-Update fehlt) rechnet noch mit 12 Monaten
    await page.evaluate(() => { SERVER_MONATE = 12; });
    await tippe(page, "reaktivierung", "monate", "24");
    await page.locator("[data-esf-speichern]").click();
    await page.waitForFunction(() => MELDUNGEN.some((m) => m[0] === "warnung"));
    pruefe("T4d Warnung: Datenbank rechnet noch mit 12 Monaten", /noch mit 12 Monaten/.test((await page.evaluate(() => MELDUNGEN.find((m) => m[0] === "warnung")))[1]));
    await page.evaluate(() => { SERVER_MONATE = null; MELDUNGEN.length = 0; });
    await tippe(page, "reaktivierung", "monate", "18");
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
      const klein = [...document.querySelectorAll("[data-esf] input, [data-esf] button")].map((e) => (e.tagName === "INPUT" && e.closest(".es-wert")) || e).filter((e) => { const r = e.getBoundingClientRect(); /* Tippfläche eines Felds = seine Hülle .es-wert (wie in den anderen Themen) */ return r.width > 0 && getComputedStyle(e).visibility !== "hidden" && r.height < 44; }).map((e) => e.id || e.textContent);
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
    await tippe(page, "theorie", "monate", "9");
    pruefe(`T5 ${b}: Speichern erreichbar`, await page.locator("[data-esf-speichern]").isEnabled());
    if (BILDER) await page.screenshot({ path: join(BILDER, `fristen-${b}x${h}-${schema}.png`), fullPage: true });
    pruefe(`T5 ${b}: keine JS-Fehler`, !jsFehler.length, jsFehler.join(" | "));
    await ctx.close();
  }

  // ---------- B. Im echten Rahmen (buero.html, Werkstatt 11) ----------
  const oeffneBuero = async ({ nutzer = "ad-1", hash = "#einstellungen?thema=fristen", breite = 1366, hoehe = 900, vorbereiten = "" } = {}) => {
    const daten = bauDaten(HEUTE), session = { user: { id: nutzer, email: nutzer + "@example.org" } };
    const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
    const page = await ctx.newPage(), konsole = [];
    page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
    page.on("pageerror", (e) => konsole.push(String(e)));
    await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
    await page.addInitScript(([d, s, v]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; if (v) (new Function("F", v))(window.__FAKE); }, [daten, session, vorbereiten]);
    await page.goto(wurzel + "buero.html" + hash);
    await page.waitForTimeout(400);
    const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
    if (frage) { await page.click('#werListe button:has-text("Paula Muster")'); await page.keyboard.type("7352", { delay: 20 }); await page.waitForTimeout(400); }
    await page.waitForFunction(() => { const a = document.getElementById("ansicht"); return a && !/Daten werden geladen/.test(a.textContent); }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    return { page, ctx, konsole };
  };
  const zeilenEinst = (page) => page.evaluate(() => (window.__FAKE.tabellen.fahrschule_einstellungen || []).filter((z) => /^fristen\./.test(z.schluessel)).map((z) => ({ fs: z.fahrschule_id, k: z.schluessel, w: z.wert })));
  const themenListe = (page) => page.$$eval(".es-thema", (l) => l.map((a) => a.textContent.trim()));
  {
    const { page, ctx, konsole } = await oeffneBuero();
    const l = await themenListe(page);
    pruefe("B1a Liste: „Fristen“ nach „Zahlungen & Mails“, vor „Nachrichten-Vorlagen“", l.indexOf("Fristen") > l.indexOf("Zahlungen & Mails") && l.indexOf("Fristen") < l.indexOf("Nachrichten-Vorlagen") && l.slice(l.indexOf("Zahlungen & Mails") + 1, l.indexOf("Fristen")).every((t) => /^(Belege & Quittungen|Punktesystem)$/.test(t)), l.join(" / "));
    pruefe("B1b Thema offen im Rahmen: Überschrift „Fristen“, 8 Zeilen", (await page.locator("#esBox > h2.es-abschnitt").first().innerText()) === "Fristen" && (await page.locator("#esBox [data-esf-zeile]").count()) === 8);
    pruefe("B1c die Hinweise sind keine Überschrift (Schrift höchstens 16 px)", (await page.locator("#esBox [data-esf] > .es-hinweis").evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) <= 16);
    // Speichern → Zeile in fahrschule_einstellungen, KR rechnet sofort damit
    await tippe(page, "theorie", "bald_tage", "45");
    await page.locator("[data-esf-speichern]").click(); await page.waitForTimeout(500);
    let z = await zeilenEinst(page);
    pruefe("B2a gespeichert als fristen.theorie der eigenen Fahrschule (ganzes Objekt)", z.length === 1 && z[0].k === "fristen.theorie" && z[0].fs === "fs-test-1" && JSON.stringify(z[0].w) === JSON.stringify({ monate: 12, bald_tage: 45, vorwarn_tage: 60 }), JSON.stringify(z));
    pruefe("B2b gilt sofort (KR) und Hinweis mit „Rückgängig“", (await fristen(page)).theorie.bald_tage === 45 && await page.locator(".toast-undo [data-undo]").isVisible());
    pruefe("B2c Zeile „geändert“ markiert", await page.locator('[data-esf-zeile="theorie"].esf-geaendert').count() === 1);
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(500);
    z = await zeilenEinst(page);
    pruefe("B3 Rückgängig: Eintrag gelöscht (= Standard), KR wieder 30, Feld wieder 30", z.length === 0 && (await fristen(page)).theorie.bald_tage === 30 && (await feld(page, "theorie", "bald_tage").inputValue()) === "30", JSON.stringify(z));
    // ungespeicherte Eingabe übersteht das Neuzeichnen des Rahmens (Auffrischen der Daten)
    await tippe(page, "antrag", "bald_tage", "70");
    await tippe(page, "theorie", "vorwarn_tage", "abc");
    await page.evaluate(() => zeichne()); await page.waitForTimeout(200);
    await page.evaluate(() => ladeDaten()); await page.waitForTimeout(700);
    pruefe("B4 Neuzeichnen und Neuladen: Eingaben bleiben (auch die fehlerhafte), Fehler weiter sichtbar, Speichern gesperrt",
      (await feld(page, "antrag", "bald_tage").inputValue()) === "70" && (await feld(page, "theorie", "vorwarn_tage").inputValue()) === "abc"
      && await page.locator('[data-esf-fehler="theorie"]').isVisible() && await page.locator("[data-esf-speichern]").isDisabled());
    // Verlassen mit ungespeicherter Eingabe → Rückfrage; „verwerfen“ → beim Zurückkommen gespeicherter Stand
    await page.click('.es-thema[data-es-thema="preise"]'); await page.waitForTimeout(400);
    const frage = await page.locator("dialog[open]").last().innerText().catch(() => "");
    pruefe("B5a Verlassen mit Eingabe: Rückfrage „Änderungen verwerfen?“", /Änderungen verwerfen\?/.test(frage), frage.slice(0, 80));
    await page.locator('dialog[open] button:has-text("Ja, verwerfen")').click(); await page.waitForTimeout(400);
    await page.click('.es-thema[data-es-thema="fristen"]'); await page.waitForTimeout(400);
    pruefe("B5b zurück im Thema: gespeicherter Stand, nichts geändert", (await feld(page, "antrag", "bald_tage").inputValue()) === "60" && (await feld(page, "theorie", "vorwarn_tage").inputValue()) === "60" && await page.locator("[data-esf-speichern]").isDisabled());
    pruefe("B5c keine JS-Fehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // B6 „Läuft bald ab“ rechnet mit der gespeicherten Warnzeit (Antrag: Warnung 200 statt 60 Tage)
  {
    const KRn = require("../kompass-rechnen.js");
    const antragAm = KRn.addMonthsISO(KRn.addDaysISO(HEUTE, 150), -12); // Antrag läuft in 150 Tagen ab
    const vor = `const s = F.tabellen.schueler.find((x) => x.id === "s6"); Object.assign(s, { antrag_am: ${JSON.stringify(antragAm)}, theorie_bestanden_am: null });`;
    const { page, ctx, konsole } = await oeffneBuero({ hash: "#fristen?ansicht=bald", vorbereiten: vor });
    const zeile = () => page.locator('[data-baldliste] tr[data-bald="antrag"]', { has: page.locator('[data-baldakte="s6"]') }).count();
    pruefe("B6a ohne Einstellung: Antrag in 150 Tagen steht nicht in „Läuft bald ab“", (await zeile()) === 0);
    await page.evaluate(() => { location.hash = "#einstellungen?thema=fristen"; }); await page.waitForTimeout(500);
    await tippe(page, "antrag", "bald_tage", "200");
    await page.locator("[data-esf-speichern]").click(); await page.waitForTimeout(500);
    await page.evaluate(() => { location.hash = "#fristen?ansicht=bald"; }); await page.waitForTimeout(500);
    pruefe("B6b nach dem Speichern (Warnung 200 Tage): Antrag steht in „Läuft bald ab“", (await zeile()) === 1);
    pruefe("B6c keine JS-Fehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // B7 gespeicherte Werte beim Start; Büro-Rolle darf ändern; Wechsel der Fahrschule nimmt keine Werte mit
  {
    const vor = `F.tabellen.fahrschule_einstellungen = [{ fahrschule_id: "fs-test-1", schluessel: "fristen.theorie", wert: { bald_tage: 10 } }];`;
    const { page, ctx, konsole } = await oeffneBuero({ nutzer: "bu-1", vorbereiten: vor });
    pruefe("B7a gespeicherter Wert gilt nach dem Start (KR und Feld), Zeile „geändert“", (await fristen(page)).theorie.bald_tage === 10 && (await feld(page, "theorie", "bald_tage").inputValue()) === "10" && await page.locator('[data-esf-zeile="theorie"].esf-geaendert').count() === 1);
    pruefe("B7b Büro darf ändern (Felder frei, Speichern-Knopf da)", await feld(page, "theorie", "bald_tage").isEnabled() && await page.locator("[data-esf-speichern]").count() === 1);
    await page.evaluate(() => { const w = document.getElementById("schulWahl"); if (w) { w.innerHTML += '<option value="fs-andere">Andere</option>'; w.value = "fs-andere"; w.dispatchEvent(new Event("change")); } else { S.fsId = "fs-andere"; } });
    await page.waitForTimeout(150);
    pruefe("B7c Wechsel der Fahrschule: sofort wieder Standard (keine Werte der vorigen)", (await fristen(page)).theorie.bald_tage === 30 || !(await page.evaluate(() => !!document.getElementById("schulWahl"))));
    pruefe("B7d keine JS-Fehler", !konsole.filter((k) => !/fs-andere|Failed to load resource|Fahrschule: keine Zeile/.test(k)).length, konsole.join(" | "));
    await ctx.close();
  }
  // B8 Handy im echten Rahmen: nichts ragt heraus, Speichern erreichbar
  for (const [b, h] of [[360, 740], [740, 360]]) {
    const { page, ctx, konsole } = await oeffneBuero({ breite: b, hoehe: h });
    const m = await page.evaluate(() => ({ breit: document.documentElement.scrollWidth, sicht: document.documentElement.clientWidth,
      raus: [...document.querySelectorAll("#esBox *")].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map((e) => e.className || e.tagName).slice(0, 4) }));
    pruefe(`B8 ${b}×${h} im Rahmen: kein seitliches Wischen, nichts ragt heraus`, m.breit <= m.sicht && !m.raus.length, JSON.stringify(m));
    await tippe(page, "antrag", "bald_tage", "61");
    await page.locator("[data-esf-speichern]").scrollIntoViewIfNeeded();
    pruefe(`B8 ${b}×${h}: Speichern erreichbar und frei`, await page.locator("[data-esf-speichern]").isEnabled() && await page.locator("[data-esf-speichern]").isVisible());
    if (BILDER) await page.screenshot({ path: join(BILDER, `rahmen-${b}x${h}.png`), fullPage: true });
    pruefe(`B8 ${b}×${h}: keine JS-Fehler`, !konsole.length, konsole.join(" | "));
    await ctx.close();
  }

  // B9 (Prüf-Team PR 3): Rückgängig nach Themenwechsel lässt keinen alten Wert stehen; Warnung, wenn die Reaktivierung kürzer wird
  {
    const { page, ctx, konsole } = await oeffneBuero();
    await tippe(page, "reaktivierung", "monate", "6");
    pruefe("B9a Reaktivierung kürzer: Warnung sichtbar", await page.locator('[data-esf-warn="reaktivierung"]').isVisible() && /sofort fällig/.test(await page.locator('[data-esf-warn="reaktivierung"]').innerText()));
    await tippe(page, "reaktivierung", "monate", "18");
    pruefe("B9b Reaktivierung länger: keine Warnung", await page.locator('[data-esf-warn="reaktivierung"]').isHidden());
    await tippe(page, "reaktivierung", "monate", "12");
    await tippe(page, "antrag", "bald_tage", "77");
    await page.locator("[data-esf-speichern]").click(); await page.waitForTimeout(400);
    await page.click('.es-thema[data-es-thema="preise"]'); await page.waitForTimeout(300);
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(500);
    await page.click('.es-thema[data-es-thema="fristen"]'); await page.waitForTimeout(400);
    pruefe("B9c Speichern, anderes Thema, Rückgängig, zurück: Feld 60, nichts „geändert“, Speichern aus, Eintrag weg",
      (await feld(page, "antrag", "bald_tage").inputValue()) === "60" && await page.locator("[data-esf-speichern]").isDisabled() && (await zeilenEinst(page)).length === 0 && (await fristen(page)).antrag.bald_tage === 60);
    await page.click('.es-thema[data-es-thema="preise"]'); await page.waitForTimeout(300);
    pruefe("B9d danach keine Rückfrage beim Verlassen", (await page.locator("dialog[open]").count()) === 0);
    await page.click('.es-thema[data-es-thema="fristen"]'); await page.waitForTimeout(400);
    await tippe(page, "theorie", "bald_tage", "25");
    await page.locator("[data-esf-speichern]").click(); await page.waitForTimeout(400);
    await tippe(page, "fc_zettel", "bald_tage", "50");
    await page.locator(".toast-undo [data-undo]").click(); await page.waitForTimeout(500);
    pruefe("B9f Speichern, in einer anderen Frist weitertippen, Rückgängig: Getipptes bleibt, Gespeichertes ist zurück",
      (await feld(page, "fc_zettel", "bald_tage").inputValue()) === "50" && (await feld(page, "theorie", "bald_tage").inputValue()) === "30" && await page.locator("[data-esf-speichern]").isEnabled());
    pruefe("B9e keine JS-Fehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }
  // B10 (Prüf-Team PR 3, Daten Muss 1+2): Wechsel der Fahrschule nimmt keine Eingaben mit, Rückgängig schreibt in die Fahrschule, in der gespeichert wurde
  {
    const { page, ctx, konsole } = await oeffneBuero({ nutzer: "sa-1" });
    const wechsle = (id) => page.evaluate((fs) => { const w = document.getElementById("schulWahl"); if (![...w.options].some((o) => o.value === fs)) w.innerHTML += `<option value="${fs}">${fs}</option>`; w.value = fs; w.dispatchEvent(new Event("change")); }, id);
    // Rahmen zeichnet das Thema für die neue Fahrschule (die Attrappe hat nur eine, darum direkt nachgestellt)
    const zeichneFuer = (id, fs) => page.evaluate(([i, f]) => { const t = window.BUERO_EINSTELLUNGEN_THEMEN.find((x) => x.id === i), box = document.createElement("div"); box.id = "probeBox"; document.body.appendChild(box); t.render(box, { sb: supa, fahrschuleId: f, rolle: "superadmin", darfSchreiben: true, meldung() {} }); }, [id, fs]);
    const alle = () => page.evaluate(() => (window.__FAKE.tabellen.fahrschule_einstellungen || []).map((z) => z.fahrschule_id + "|" + z.schluessel).sort().join(","));
    if (!(await page.locator("#esBox [data-esf]").count())) { await page.evaluate(() => { location.hash = "#einstellungen?thema=fristen"; }); await page.waitForTimeout(400); }
    await tippe(page, "antrag", "bald_tage", "70");
    // Der Rahmen zeichnet das Thema für die neue Fahrschule (ctx.fahrschuleId) – hier direkt nachgestellt, weil die Attrappe nur eine Fahrschule hat
    const nachWechsel = await page.evaluate(() => {
      const t = window.BUERO_EINSTELLUNGEN_THEMEN.find((x) => x.id === "fristen"), box = document.createElement("div");
      document.body.appendChild(box);
      t.render(box, { sb: supa, fahrschuleId: "fs-andere", rolle: "superadmin", darfSchreiben: true, meldung() {} });
      const r = [box.querySelector('input[data-art="antrag"][data-feld="bald_tage"]').value, box.querySelector("[data-esf-speichern]").disabled];
      box.remove(); zeichne(); return r;
    });
    pruefe("B10a andere Fahrschule: Eingabe der vorigen nicht übernommen (Feld Standard 60, Speichern aus)", nachWechsel[0] === "60" && nachWechsel[1] === true, JSON.stringify(nachWechsel));
    await page.waitForTimeout(300);
    if (!(await page.locator("#esBox [data-esf]").count())) { await page.evaluate(() => { location.hash = "#einstellungen?thema=fristen"; }); await page.waitForTimeout(400); }
    await tippe(page, "antrag", "bald_tage", "70");
    await page.locator("[data-esf-speichern]").click(); await page.waitForTimeout(400);
    const vorUndo = await alle();
    await wechsle("fs-andere"); await page.waitForTimeout(500); await zeichneFuer("fristen", "fs-andere");
    await page.locator(".toast-undo [data-undo]").click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500);
    const nachUndo = await alle();
    await page.evaluate(() => document.getElementById("probeBox")?.remove());
    pruefe("B10b Speichern in Fahrschule 1, Wechsel, Rückgängig: Eintrag in Fahrschule 1 weg, nichts in der anderen", vorUndo === "fs-test-1|fristen.antrag" && nachUndo === "", vorUndo + " → " + nachUndo);
    pruefe("B10c in der anderen Fahrschule rechnet das Büro weiter mit Standard", (await fristen(page)).antrag.bald_tage === 60);
    await wechsle("fs-test-1"); await page.waitForTimeout(700);
    await page.evaluate(() => { location.hash = "#fristen"; }); await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = "#einstellungen?thema=fristen"; }); await page.waitForTimeout(500);
    await tippe(page, "theorie", "bald_tage", "20");
    await page.locator("[data-esf-speichern]").click(); await page.waitForTimeout(400);
    await page.click('.es-thema[data-es-thema="preise"]'); await page.waitForTimeout(300); // Thema nicht mehr offen
    await wechsle("fs-andere"); await page.waitForTimeout(500);
    await page.locator(".toast-undo [data-undo]").click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500);
    pruefe("B10f erst anderes Thema, dann Wechsel, Rückgängig: in der neuen Fahrschule weiter Standard, Eintrag der ersten weg", (await fristen(page)).theorie.bald_tage === 30 && (await alle()).indexOf("fristen.theorie") < 0, JSON.stringify((await fristen(page)).theorie) + " " + (await alle()));
    // dasselbe für die Vorlagen
    await wechsle("fs-test-1"); await page.waitForTimeout(700);
    await page.evaluate(() => { location.hash = "#einstellungen?thema=vorlagen"; }); await page.waitForTimeout(500);
    await page.click('[data-esv-kopf="pruefung"]'); await page.waitForTimeout(200);
    const ta = page.locator('[data-esv-feld="text"]');
    await ta.click(); await ta.press("Control+A"); await ta.pressSequentially("Bitte zahlen: {Betrag}");
    await page.locator("[data-esv-speichern]").click(); await page.waitForTimeout(400);
    const vVor = await alle();
    await wechsle("fs-andere"); await page.waitForTimeout(500); await zeichneFuer("vorlagen", "fs-andere");
    await page.locator(".toast-undo [data-undo]").click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500);
    const vNach = await alle();
    pruefe("B10d Vorlage: Speichern, Wechsel, Rückgängig: Eintrag in Fahrschule 1 weg, nichts in der anderen", vVor === "fs-test-1|vorlagen.pruefung" && vNach === "", vVor + " → " + vNach);
    pruefe("B10e keine JS-Fehler", !konsole.filter((k) => !/fs-andere|Failed to load resource|Fahrschule: keine Zeile/.test(k)).length, konsole.join(" | "));
    await ctx.close();
  }

  // B11 (Richter PR 3): Vorlagen am Handy – „Speichern“ liegt direkt unter der offenen Vorlage (nicht erst unter allen anderen)
  {
    const { page, ctx, konsole } = await oeffneBuero({ hash: "#einstellungen?thema=vorlagen", breite: 360, hoehe: 740 });
    await page.click('[data-esv-kopf="pruefung"]'); await page.waitForTimeout(250);
    const ta = page.locator('[data-esv-feld="text"]');
    await ta.click(); await ta.press("End"); await ta.pressSequentially(" Danke!");
    const hier = page.locator('[data-esv-art="pruefung"] [data-esv-speichern-hier]');
    const lage = await page.evaluate(() => { const h = document.querySelector('[data-esv-art="pruefung"] [data-esv-speichern-hier]').getBoundingClientRect(), n = document.querySelector('[data-esv-kopf="reaktivierung_bald"]').getBoundingClientRect(); return { hier: Math.round(h.bottom), naechste: Math.round(n.top), hoehe: Math.round(h.height) }; });
    pruefe("B11a 360×740: Speichern in der offenen Vorlage, vor der nächsten Vorlage, frei, ≥ 44 px", (await hier.count()) === 1 && await hier.isEnabled() && lage.hier <= lage.naechste && lage.hoehe >= 44, JSON.stringify(lage));
    await hier.scrollIntoViewIfNeeded(); await hier.click(); await page.waitForTimeout(400);
    const z = await page.evaluate(() => (window.__FAKE.tabellen.fahrschule_einstellungen || []).filter((x) => x.schluessel === "vorlagen.pruefung").length);
    pruefe("B11b Speichern dort speichert (Eintrag da, beide Knöpfe wieder aus)", z === 1 && await hier.isDisabled() && await page.locator("[data-esv-speichern]").isDisabled());
    if (BILDER) await page.screenshot({ path: join(BILDER, "vorlagen-speichern-360.png") });
    pruefe("B11c keine JS-Fehler", !konsole.length, konsole.join(" | "));
    await ctx.close();
  }

  // ---------- A. App (index.html) übernimmt die Fristen aus KE ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const p = await ctx.newPage(), jsF = [];
    p.on("pageerror", (e) => jsF.push(String(e)));
    await p.route("**/*", (r) => (r.request().url().startsWith(wurzel) ? r.continue() : r.abort()));
    await p.goto(wurzel + "index.html", { waitUntil: "load", timeout: 20000 });
    await p.waitForTimeout(600);
    const r = await p.evaluate(async () => {
      if (!window.KE || typeof _fristenAusKE !== "function") return { fehlt: true };
      const sb = (zeilen) => ({ from: () => { const q = { select: () => q, eq: async () => ({ data: zeilen, error: null }) }; return q; } });
      const o = [];
      await KE.lade(sb([{ schluessel: "fristen.antrag", wert: { bald_tage: 200 } }, { schluessel: "fristen.theorie", wert: { monate: 18 } }]), "fs-a");
      o.push([KR.holeFristen().antrag.bald_tage, KR.holeFristen().theorie.monate]);
      const heute = KR.todayISO(), am = KR.addMonthsISO(KR.addDaysISO(heute, 150), -12);
      o.push(KR.antragInfo({ antrag_am: am }, heute).stufe);
      await KE.lade(sb([]), "fs-b"); o.push([KR.holeFristen().antrag.bald_tage, KR.holeFristen().theorie.monate]);
      await KE.lade(sb([{ schluessel: "fristen.antrag", wert: { bald_tage: 5000 } }]), "fs-c"); o.push(KR.holeFristen().antrag.bald_tage);
      await KE.lade(sb([{ schluessel: "fristen.antrag", wert: { bald_tage: 90 } }]), "fs-d");
      KE.leeren(); _fristenAusKE(); o.push(KR.holeFristen().antrag.bald_tage);
      try { ["fs-a", "fs-b", "fs-c", "fs-d"].forEach((f) => localStorage.removeItem("ke:" + f)); } catch (e) {}
      return { o };
    });
    pruefe("A1 App: Fristen der Fahrschule gelten nach dem Laden, Antrag in 150 Tagen wird gelb; andere Fahrschule = Standard; ungültig = Standard; Abmelden = Standard",
      !r.fehlt && JSON.stringify(r.o) === JSON.stringify([[200, 18], "bald", [60, 12], 60, 60]), JSON.stringify(r));
    pruefe("A2 App: keine JS-Fehler", !jsF.length, jsF.join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\nFristen-Thema-Test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
