// W14 (24.11.2026): Büro-Akte und Fristen-Fenster überschreiben keine neueren Änderungen mehr.
// Ein Fenster zeigt den Stand beim Öffnen. Ändern App oder anderer PC inzwischen etwas, darf Speichern das nicht
// zurückdrehen: gesendet wird nur, was im Fenster geändert wurde; hat jemand dasselbe Feld geändert, bleibt sein
// Stand, das Fenster zeigt den Unterschied mit „Meine Eingabe nehmen“.
// Nur erfundene Testdaten (buero-vorfuehrung.js), keine Datenbank.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/akte-konflikt-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const HEUTE = new Date().toISOString().slice(0, 10);
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let probleme = 0, okZahl = 0;
async function fall(name, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = ["Ausnahme: " + String(e.message || e).split("\n")[0]]; }
  if (!r || !r.length) { okZahl++; console.log("ok  " + name); } else { probleme++; console.log("FEHLER  " + name + ": " + r.join(" · ")); }
}

async function oeffne(breite = 1366, hoehe = 860) {
  const daten = bauDaten(HEUTE);
  // Testfall „Paket nicht mehr in der Liste“: s2 hat ein Paket, das es in fahrschule_pakete nicht gibt
  const s2 = daten.tabellen.schueler.find((x) => x.id === "s2"); if (s2) s2.paket_id = "p-alt-weg";
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s]) => { window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s }; }, [daten, { user: { id: "bu-1", email: "bu-1@example.org" } }]);
  await page.goto(basis + "buero.html#schueler");
  await page.waitForTimeout(400);
  const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1500 }).catch(() => null);
  if (frage) { await page.click('#werListe button:has-text("Paula Muster")'); await page.keyboard.type("7352", { delay: 20 }); await page.waitForTimeout(200); }
  await page.waitForFunction(() => typeof S === "object" && S.schueler && S.schueler.length > 2, null, { timeout: 4000 });
  return { page, ctx, konsole };
}
const server_ = (page, id) => page.evaluate((sid) => JSON.parse(JSON.stringify(window.__FAKE.tabellen.schueler.find((x) => x.id === sid))), id);
// „App oder anderer PC“ ändert die Zeile direkt in der Datenbank-Attrappe (das Fenster weiß davon nichts)
const woanders = (page, id, werte) => page.evaluate(([sid, w]) => Object.assign(window.__FAKE.tabellen.schueler.find((x) => x.id === sid), w), [id, werte]);
const speichern = async (page) => { await page.locator("dialog[open] button[value=ok]").last().click(); await page.waitForTimeout(350); };
const offen = (page) => page.evaluate(() => document.querySelectorAll("dialog[open]").length);
const updates = (page, id) => page.evaluate((sid) => (window.__FAKE.log || []).filter((l) => l.tabelle === "schueler" && l.art === "update" && l.werte).map((l) => l.werte), id);

const { page, ctx, konsole } = await oeffne();

await fall("A1 Akte: nur Paket geändert – Telefon/Name aus der App bleiben", async () => {
  const f = [];
  await page.evaluate(() => schuelerDialog("s1"));
  await woanders(page, "s1", { telefon: "0151 0000001", name: "Lena Beispiel-Neu" });
  // Werkstatt 13: Mit verkauften Paketen heißt die Auswahl „Anmeldung“; Turboboost (ohne Posten) wird dort wie bisher nur zugeordnet
  if (await page.locator("dialog[open] [data-bk-wahl]").count()) await page.selectOption("dialog[open] [data-bk-wahl]", "v:p-turbo");
  else await page.selectOption("dialog[open] select[name=paket_id]", "p-turbo");
  await speichern(page);
  const s = await server_(page, "s1");
  if (s.telefon !== "0151 0000001") f.push("Telefon überschrieben: " + s.telefon);
  if (s.name !== "Lena Beispiel-Neu") f.push("Name überschrieben: " + s.name);
  if (s.paket_id !== "p-turbo") f.push("Paket nicht gespeichert");
  if (await offen(page)) f.push("Fenster blieb offen");
  const letzte = (await updates(page)).pop() || {};
  if (Object.keys(letzte).join(",") !== "paket_id") f.push("gesendet: " + Object.keys(letzte).join(","));
  return f;
});

await fall("A2 Akte: dasselbe Feld woanders geändert – neuer Stand bleibt, Hinweis, Rest gespeichert", async () => {
  const f = [];
  await page.evaluate(() => schuelerDialog("s1"));
  await woanders(page, "s1", { telefon: "0151 0000002" });
  await page.fill("dialog[open] input[name=telefon]", "0160 9999999");
  await page.fill("dialog[open] input[name=email]", "neu@example.org");
  await speichern(page);
  let s = await server_(page, "s1");
  if (s.telefon !== "0151 0000002") f.push("Telefon der App überschrieben: " + s.telefon);
  if (s.email !== "neu@example.org") f.push("E-Mail nicht gespeichert");
  if (!(await offen(page))) f.push("Fenster zu, Hinweis fehlt");
  const box = await page.textContent("dialog[open] [data-aktekonflikt]").catch(() => "");
  if (!/Telefon/.test(box) || !/0151 0000002/.test(box) || !/0160 9999999/.test(box)) f.push("Hinweis unklar: " + box);
  if ((await page.inputValue("dialog[open] input[name=telefon]")) !== "0151 0000002") f.push("Feld zeigt nicht den neuen Stand");
  // Meine Eingabe nehmen → Speichern → gilt
  await page.click("dialog[open] [data-meinenehmen]");
  if ((await page.inputValue("dialog[open] input[name=telefon]")) !== "0160 9999999") f.push("Meine Eingabe nicht zurück im Feld");
  await speichern(page);
  s = await server_(page, "s1");
  if (s.telefon !== "0160 9999999") f.push("Meine Eingabe nicht gespeichert: " + s.telefon);
  if (await offen(page)) f.push("Fenster nach zweitem Speichern offen");
  return f;
});

await fall("A3 Akte: ohne Änderung wird nichts geschrieben", async () => {
  const f = [];
  const vorher = (await updates(page)).length;
  await page.evaluate(() => schuelerDialog("s3"));
  await woanders(page, "s3", { telefon: "0151 0000003", klasse: "BE" });
  await speichern(page);
  const s = await server_(page, "s3");
  if ((await updates(page)).length !== vorher) f.push("trotzdem geschrieben");
  if (s.telefon !== "0151 0000003" || s.klasse !== "BE") f.push("überschrieben");
  if (await offen(page)) f.push("Fenster blieb offen");
  return f;
});

await fall("A4 Akte: Fahrlehrer woanders gewechselt – kein Zurückschieben, Hinweis", async () => {
  const f = [];
  const x = await server_(page, "s4");
  const andere = await page.evaluate((alt) => S.lehrer.filter((l) => l.id !== alt && l.aktiv !== false).map((l) => l.id), x.fahrlehrer_id);
  if (andere.length < 2) return ["zu wenig Fahrlehrer in den Testdaten"];
  await page.evaluate(() => schuelerDialog("s4"));
  await woanders(page, "s4", { fahrlehrer_id: andere[0] });
  await page.selectOption("dialog[open] select[name=fahrlehrer_id]", andere[1]);
  await speichern(page);
  const s = await server_(page, "s4");
  if (s.fahrlehrer_id !== andere[0]) f.push("verschoben trotz Änderung woanders: " + s.fahrlehrer_id);
  const box = await page.textContent("dialog[open] [data-aktekonflikt]").catch(() => "");
  if (!/Fahrlehrer/.test(box)) f.push("kein Hinweis zum Fahrlehrer");
  const verschoben = await page.evaluate(() => (window.__FAKE.tabellen.schueler_verschiebungen || []).filter((v) => v.schueler_id === "s4").length);
  if (verschoben) f.push("Übergabe-Eintrag geschrieben");
  await page.click("dialog[open] [data-schliessen]"); await page.waitForTimeout(150);
  if (await offen(page)) { await page.locator("dialog[open] button[value=ok]").last().click(); await page.waitForTimeout(150); }
  return f;
});

await fall("A5 Akte: Paket fehlt in der Liste – Speichern löscht es nicht", async () => {
  const f = [];
  await page.evaluate(() => schuelerDialog("s2"));
  await page.fill("dialog[open] input[name=buero_notiz]", "Testnotiz");
  await speichern(page);
  const s = await server_(page, "s2");
  if (s.paket_id !== "p-alt-weg") f.push("Paket gelöscht: " + s.paket_id);
  if (s.buero_notiz !== "Testnotiz") f.push("Notiz nicht gespeichert");
  return f;
});

await fall("F1 Fristen: Theorie bestanden aus der App bleibt beim Speichern des Antrags", async () => {
  const f = [];
  await page.evaluate(() => fristenDialog("s5"));
  await woanders(page, "s5", { theorie_bestanden_am: HEUTE });
  await page.fill("dialog[open] input[name=antrag_am]", HEUTE);
  await speichern(page);
  const s = await server_(page, "s5");
  if (s.theorie_bestanden_am !== HEUTE) f.push("Theorie bestanden zurückgedreht: " + s.theorie_bestanden_am);
  if (s.antrag_am !== HEUTE) f.push("Antrag nicht gespeichert");
  if (await offen(page)) f.push("Fenster blieb offen");
  return f;
});

await fall("F2 Fristen: dasselbe Feld – Hinweis, Fenster bleibt offen", async () => {
  const f = [];
  await page.evaluate(() => fristenDialog("s6"));
  await woanders(page, "s6", { reakt_notiz: "vom anderen PC" });
  await page.fill("dialog[open] input[name=reakt_notiz]", "von mir");
  await speichern(page);
  const s = await server_(page, "s6");
  if (s.reakt_notiz !== "vom anderen PC") f.push("überschrieben: " + s.reakt_notiz);
  const box = await page.textContent("dialog[open] [data-aktekonflikt]").catch(() => "");
  if (!/vom anderen PC/.test(box)) f.push("Hinweis fehlt: " + box);
  return f;
});

await fall("A6 Akte: zwei Felder woanders geändert, eins davon auch hier – zweites Speichern dreht das andere nicht zurück", async () => {
  const f = [];
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close())); // Fenster aus F2 schließen
  await page.evaluate(() => schuelerDialog("s7"));
  await woanders(page, "s7", { telefon: "0151 0000007", email: "neu7@example.org" });
  await page.fill("dialog[open] input[name=telefon]", "0160 7777777");
  await speichern(page);
  if ((await page.inputValue("dialog[open] input[name=email]")) !== "neu7@example.org") f.push("E-Mail-Feld zeigt nicht den neuen Stand");
  await page.click("dialog[open] [data-meinenehmen]");
  await speichern(page);
  const s = await server_(page, "s7");
  if (s.email !== "neu7@example.org") f.push("E-Mail beim zweiten Speichern zurückgedreht: " + s.email);
  if (s.telefon !== "0160 7777777") f.push("Meine Eingabe nicht gespeichert: " + s.telefon);
  if (await offen(page)) f.push("Fenster blieb offen");
  return f;
});

await fall("F3 Fristen: zwei Felder woanders, eins davon auch hier – zweites Speichern dreht das andere nicht zurück", async () => {
  const f = [];
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await page.evaluate(() => fristenDialog("s8"));
  await woanders(page, "s8", { reakt_notiz: "anderer PC", antrag_am: "2026-01-02" });
  await page.fill("dialog[open] input[name=reakt_notiz]", "ich");
  await speichern(page);
  await page.click("dialog[open] [data-meinenehmen]");
  await speichern(page);
  const s = await server_(page, "s8");
  if (s.antrag_am !== "2026-01-02") f.push("Antrag zurückgedreht: " + s.antrag_am);
  if (s.reakt_notiz !== "ich") f.push("Meine Eingabe nicht gespeichert: " + s.reakt_notiz);
  return f;
});

await fall("F4 Fristen: Reaktivierung woanders auf „befreit“ – mein „bezahlt bis“ wird nicht dazugemischt", async () => {
  const f = [];
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  const vorher = (await server_(page, "s9")).reakt_bezahlt_bis || null;
  await page.evaluate(() => fristenDialog("s9"));
  await woanders(page, "s9", { reakt_status: "befreit", reakt_notiz: "Härtefall" });
  await page.locator("dialog[open] input[name=reakt_status][value=bezahlt]").last().check();
  await page.fill("dialog[open] input[name=reakt_bezahlt_bis]", "2027-03-01");
  await speichern(page);
  const s = await server_(page, "s9");
  if (s.reakt_status !== "befreit") f.push("Status überschrieben: " + s.reakt_status);
  if ((s.reakt_bezahlt_bis || null) !== vorher) f.push("„bezahlt bis“ dazugemischt: " + s.reakt_bezahlt_bis);
  const box = await page.textContent("dialog[open] [data-aktekonflikt]").catch(() => "");
  if (!/Reaktivierung/.test(box)) f.push("Hinweis fehlt: " + box);
  return f;
});

await fall("F5 Fristen: „bestanden“ vor dem woanders eingetragenen Unterrichtsende wird nicht gespeichert", async () => {
  const f = [];
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await page.evaluate(() => fristenDialog("s11"));
  await woanders(page, "s11", { theorie_abgeschlossen_am: "2026-11-01", theorie_bestanden_am: null });
  await page.fill("dialog[open] input[name=theorie_bestanden_am]", "2026-10-20");
  await speichern(page);
  const s = await server_(page, "s11");
  if (s.theorie_bestanden_am === "2026-10-20") f.push("unplausibles Datum gespeichert");
  const box = await page.textContent("dialog[open] [data-aktekonflikt]").catch(() => "");
  if (!/Theorieprüfung bestanden/.test(box)) f.push("Hinweis fehlt: " + box);
  return f;
});

await fall("B1 Akte offen, App ändert Telefon, Büro tippt „Zahlung ausstehend“ im Fenster, ändert Notiz – Telefon bleibt (Fable)", async () => {
  const f = [];
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await page.evaluate(() => schuelerDialog("s12"));
  await woanders(page, "s12", { telefon: "0151 0000042" });
  const ok = await page.evaluate(() => setzeZahlungSperre("s12", KR.todayISO(), "Test", "vermerkt")); // kopiert die frische Zeile nach S.schueler
  if (!ok) f.push("Sperre nicht gesetzt");
  await page.fill("dialog[open] input[name=buero_notiz]", "nur Notiz");
  await speichern(page);
  const s = await server_(page, "s12");
  if (s.telefon !== "0151 0000042") f.push("Telefon der App überschrieben: " + s.telefon);
  const letzte = (await updates(page)).filter((w) => "buero_notiz" in w).pop() || {};
  if (Object.keys(letzte).join(",") !== "buero_notiz") f.push("gesendet: " + JSON.stringify(letzte));
  return f;
});

await fall("B2 Fristen offen, App setzt Theorie bestanden, Büro tippt „Zahlung ausstehend“ – Theorie bleibt (Fable)", async () => {
  const f = [];
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await page.evaluate(() => fristenDialog("s13"));
  await woanders(page, "s13", { theorie_bestanden_am: "2026-11-20" });
  await page.evaluate(() => setzeZahlungSperre("s13", KR.todayISO(), "Test", "vermerkt"));
  await page.fill("dialog[open] input[name=antrag_am]", "2026-11-21");
  await speichern(page);
  const s = await server_(page, "s13");
  if (s.theorie_bestanden_am !== "2026-11-20") f.push("Theorie bestanden zurückgedreht: " + s.theorie_bestanden_am);
  if (s.antrag_am !== "2026-11-21") f.push("Antrag nicht gespeichert");
  return f;
});

await fall("K1 keine Fehler in der Konsole", async () => konsole.length ? [konsole.slice(0, 3).join(" | ")] : []);
await ctx.close();
await browser.close();
server.close();
console.log(probleme ? `\n${probleme} FEHLER, ${okZahl} ok` : `\nAlles grün (${okZahl} Fälle)`);
process.exit(probleme ? 1 : 0);
