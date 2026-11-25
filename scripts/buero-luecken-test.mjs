// Büro-Lücken-Test (Werkstatt 16 Teil 3, 25.11.2026): was das Büro bisher nur in der App hatte, gibt es jetzt auf der Büro-Seite.
// Geprüft mit der Attrappe (buero-vorfuehrung.js, erfundene Namen „Muster“):
//   L1 Buchungslinks und QR je Fahrlehrer (Fahrlehrer & Büro) · L2 Erste Hilfe „Kurs bezahlt“ im Termin-Fenster
//   L3 Interessent (Name, Telefon) bei Beratung · L4 Monatsbericht (Druckfenster, ohne Schülernamen)
//   L5 Provision von Hand (leer, 0, negativ abgelehnt; Rückgängig = storniert) · L6 Quote je Fahrlehrer und Prüfer-Statistik
//   L7 Ausweg ohne gültige PIN (keine Person, keine PIN/Freigabe, „Nochmal prüfen“) · L8 Urlaubs-Warnung bei Prüfung, Fahrlehrerwechsel, Nachweis
//   L9 keine Browser-Bestätigungsfenster, keine JS-Fehler, nichts ragt am Handy heraus, Knöpfe ≥ 44 px
// Rollen: Büro ohne Verwalten-Recht (Paula), Büro mit Verwalten-Recht (Mia, Handy), Leitung, Super-Admin.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/buero-luecken-test.mjs
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

// nutzer: Konto (bu-1 Büro, ad-1 Leitung, sa-1 Super-Admin). personen: eigene Liste der Büro-Personen (L7).
async function oeffne({ breite = 1366, hoehe = 860, nutzer = "bu-1", person = ["Paula Muster", "7352"], personen = null, hash = "#heute" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  const konsole = [], dialoge = [];
  page.on("pageerror", (e) => konsole.push(String(e)));
  page.on("dialog", (d) => { dialoge.push(d.message()); d.dismiss().catch(() => {}); });
  await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, nutzer, personen, heute]) => {
    d.tabellen.fahrschule_urlaub = []; d.tabellen.fahrschule_schichten = []; d.tabellen.fahrschule_backups = [];
    // Büro-Spalten, die die echte Datenbank hat (die Attrappe kennt sie sonst nicht)
    d.tabellen.kalender_termine.forEach((t) => Object.assign(t, { kurs_bezahlt: false, interessent_name: null, interessent_telefon: null }));
    d.tabellen.profiles.forEach((p) => { if (p.id === "fl-1") p.slug = "anton-muster"; });
    d.tabellen.kalender_pruefungen = (d.tabellen.kalender_pruefungen || []);
    if (personen) d.tabellen.buero_personen = personen;
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: nutzer, email: nutzer + "@example.org" } }, rpcs: {}, fehler: {} };
  }, [bauDaten(HEUTE), nutzer, personen, HEUTE]);
  if (process.env.DEBUG) console.log("goto", nutzer);
  await page.goto(basis + "buero.html" + hash);
  if (process.env.DEBUG) console.log("geladen");
  await warte(page, 600);
  if (person) {
    const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1500 }).catch(() => null);
    if (frage) { await page.click(`#werListe button:has-text("${person[0]}")`); await page.keyboard.type(person[1], { delay: 20 }); await warte(page, 600); }
  }
  return { page, ctx, konsole, dialoge };
}
const tab = (page, t) => page.evaluate((t) => JSON.parse(JSON.stringify(window.__FAKE.tabellen[t] || [])), t);
const gehe = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await warte(page, 600); };
const offenText = (page) => page.evaluate(() => { const d = [...document.querySelectorAll("dialog[open]")].pop(); return d ? d.textContent : ""; });
const alleZu = async (page) => { await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close())); await warte(page, 300); };
const speichern = async (page) => { await page.locator("dialog[open]").last().locator("footer button[value=ok]").click(); await warte(page, 700); };

const NUR = process.env.NUR || ""; // z. B. NUR=L8 für einen schnellen Lauf
const ROLLEN = NUR && NUR !== "L1" ? [] : [
  ["PC, Büro ohne Verwalten-Recht", { nutzer: "bu-1", person: ["Paula Muster", "7352"] }],
  ["Handy, Büro mit Verwalten-Recht", { nutzer: "bu-1", person: ["Mia Muster", "5917"], breite: 360, hoehe: 780 }],
  ["PC, Leitung", { nutzer: "ad-1", person: null }],
  ["PC, Super-Admin", { nutzer: "sa-1", person: null }],
];
for (const [n, opt] of ROLLEN) {
  const P = `[${n}]`;
  const { page, ctx, konsole, dialoge } = await oeffne(opt);
  const handy = (opt.breite || 1366) < 500;

  // L1 Buchungslinks und QR
  await gehe(page, "#team");
  const knopfDa = await page.locator('[data-buchlink="fl-1"]').count();
  const ohneSlug = await page.locator('[data-buchlink="fl-2"]').count();
  if (knopfDa) { await page.locator('[data-buchlink="fl-1"]').first().click(); await warte(page, 500); }
  await pruefe("L1", `${P} Buchungslinks: Knopf nur mit Link, Schalter- und Automatik-Link, QR-Bild`, async () => {
    const f = [];
    if (!knopfDa) return "kein Knopf „Buchungslinks“ bei Anton Muster";
    if (ohneSlug) f.push("Knopf auch ohne Buchungslink");
    const werte = await page.$$eval("dialog[open] .lu-link input", (l) => l.map((i) => i.value));
    if (!werte.includes("https://serband1995-hue.github.io/Fahrlehrer-Kompass-/buchen.html?typ=schalt&lehrer=anton-muster")) f.push("Schalter-Link fehlt: " + werte.join(" | "));
    if (!werte.some((w) => /typ=automatik&lehrer=anton-muster$/.test(w))) f.push("Automatik-Link fehlt");
    const bild = await page.$eval("dialog[open] .lu-qr-bild", (i) => i.naturalWidth).catch(() => 0);
    if (!bild) f.push("kein QR-Bild");
    return f;
  });
  if (knopfDa) {
    await page.click('dialog[open] [data-luqrtyp="automatik"]'); await warte(page, 400);
    await pruefe("L1", `${P} QR auf Automatik umschalten`, async () => (/Automatik/.test(await page.$eval("dialog[open] .lu-qr-bild", (i) => i.alt).catch(() => "")) ? null : "QR nicht auf Automatik"));
    await pruefe("L1", `${P} Knöpfe im Fenster mindestens 44 px hoch`, () => page.evaluate(() => [...document.querySelectorAll("dialog[open] .lu-link .knopf, dialog[open] .lu-qr .knopf")].filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.textContent + " " + Math.round(b.getBoundingClientRect().height) + " px")));
    if (handy) await pruefe("L1", `${P} Fenster ragt nicht seitlich heraus`, () => page.evaluate(() => { const d = document.querySelector("dialog[open]"); return d && d.scrollWidth > d.clientWidth + 1 ? "Fenster " + d.scrollWidth + " px Inhalt" : null; }));
    await alleZu(page);
  }

  // L2 Erste Hilfe bezahlt, L3 Beratung mit Interessent
  await gehe(page, "#kalender");
  const tag = plus(HEUTE, 12);
  await page.evaluate((t) => terminDialog(null, { datum: t, von: "18:00", fahrlehrer_id: "fl-3" }), tag); await warte(page, 300);
  await page.selectOption("dialog[open] select[name=art]", "ersthilfe"); await warte(page, 150);
  const ehSicht = await page.isVisible("dialog[open] #kursBezahltFeld");
  if (ehSicht) await page.check("dialog[open] input[name=kurs_bezahlt]");
  await speichern(page); await alleZu(page);
  await pruefe("L2", `${P} Erste Hilfe: Kästchen „Kurs bezahlt“ sichtbar und gespeichert`, async () => {
    const t = (await tab(page, "kalender_termine")).find((x) => x.datum === tag && x.art === "ersthilfe");
    if (!ehSicht) return "Kästchen nicht sichtbar";
    return t && t.kurs_bezahlt === true ? null : "gespeichert: " + JSON.stringify(t && { kurs_bezahlt: t.kurs_bezahlt });
  });
  await page.evaluate((t) => terminDialog(null, { datum: t, von: "16:00", fahrlehrer_id: "fl-3" }), tag); await warte(page, 300);
  const ehBeiFahrstunde = await page.isVisible("dialog[open] #kursBezahltFeld");
  await page.selectOption("dialog[open] select[name=art]", "beratung"); await warte(page, 150);
  const berSicht = await page.isVisible("dialog[open] #beratungFeld");
  if (berSicht) { await page.fill("dialog[open] input[name=interessent_name]", "  Nina Muster "); await page.fill("dialog[open] input[name=interessent_telefon]", "0171 1234567"); }
  await speichern(page); await alleZu(page);
  await pruefe("L3", `${P} Beratung: Name und Telefon des Interessenten gespeichert (getrimmt); bei Fahrstunde kein Bezahlt-Kästchen`, async () => {
    const t = (await tab(page, "kalender_termine")).find((x) => x.datum === tag && x.art === "beratung");
    const f = [];
    if (ehBeiFahrstunde) f.push("Bezahlt-Kästchen bei Fahrstunde");
    if (!berSicht) return f.concat("Felder nicht sichtbar");
    if (!t || t.interessent_name !== "Nina Muster" || t.interessent_telefon !== "0171 1234567") f.push("gespeichert: " + JSON.stringify(t && [t.interessent_name, t.interessent_telefon]));
    if (t && "kurs_bezahlt" in t && t.kurs_bezahlt) f.push("kurs_bezahlt bei Beratung gesetzt");
    return f;
  });
  // L2b bestehenden Erste-Hilfe-Termin: Häkchen wieder weg
  const ehId = (await tab(page, "kalender_termine")).find((x) => x.datum === tag && x.art === "ersthilfe").id;
  await page.evaluate((id) => terminDialog(id), ehId); await warte(page, 300);
  const warAn = await page.isChecked("dialog[open] input[name=kurs_bezahlt]").catch(() => false);
  await page.uncheck("dialog[open] input[name=kurs_bezahlt]").catch(() => {});
  await speichern(page); await alleZu(page);
  await pruefe("L2", `${P} Erste Hilfe: Häkchen beim Öffnen gesetzt, abwählen speichert „nicht bezahlt“`, async () => {
    const t = (await tab(page, "kalender_termine")).find((x) => x.id === ehId);
    return warAn && t.kurs_bezahlt === false ? null : `beim Öffnen ${warAn}, danach ${t.kurs_bezahlt}`;
  });

  // L5 Provision von Hand
  await gehe(page, "#verkaeufe");
  const pvKnopf = await page.locator("#pvNeu").count();
  const vorher = (await tab(page, "provisionen")).length;
  const pvVersuch = async (lehrer, betrag) => {
    await page.click("#pvNeu"); await warte(page, 300);
    if (lehrer) await page.selectOption("dialog[open] select[name=fahrlehrer_id]", lehrer);
    await page.fill("dialog[open] input[name=betrag]", betrag);
    await speichern(page);
    const offen = await page.locator("dialog[open]").count();
    return offen;
  };
  const r1 = pvKnopf ? await pvVersuch("", "15") : 0; await alleZu(page);
  const r2 = pvKnopf ? await pvVersuch("fl-2", "0") : 0; await alleZu(page);
  const r3 = pvKnopf ? await pvVersuch("fl-2", "-5") : 0; await alleZu(page);
  const r4 = pvKnopf ? await pvVersuch("fl-2", "") : 0; await alleZu(page);
  const nachFalsch = (await tab(page, "provisionen")).length;
  const r5 = pvKnopf ? await pvVersuch("fl-2", "12,50") : 1;
  const neu = (await tab(page, "provisionen")).find((p) => p.fahrlehrer_id === "fl-2" && Number(p.betrag) === 12.5);
  const inListe = /Berta Muster/.test(await page.textContent("#ansicht"));
  await pruefe("L5", `${P} Provision von Hand: ohne Fahrlehrer, 0, negativ, leer abgelehnt; 12,50 € gespeichert und in der Liste`, () => {
    const f = [];
    if (!pvKnopf) return "kein Knopf „+ Provision von Hand“";
    if (!r1 || !r2 || !r3 || !r4) f.push("Fenster ging trotz falscher Eingabe zu");
    if (nachFalsch !== vorher) f.push("falsche Eingabe gespeichert");
    if (r5) f.push("Fenster bleibt offen");
    if (!neu || neu.status !== "offen" || neu.fahrschule_id !== "fs-test-1" || neu.typ !== "simulator" || neu.schueler_id) f.push("gespeichert: " + JSON.stringify(neu));
    if (!inListe) f.push("nicht unter offenen Provisionen");
    return f;
  });
  if (neu) {
    await page.click("[data-undo]").catch(() => {}); await warte(page, 800);
    await pruefe("L5", `${P} Rückgängig: Provision storniert (nicht gelöscht)`, async () => { const p = (await tab(page, "provisionen")).find((x) => x.id === neu.id); return p && p.status === "storniert" ? null : "Stand: " + JSON.stringify(p); });
  }

  // L6 Quote je Fahrlehrer und Prüfer
  await gehe(page, "#zahlen");
  await pruefe("L6", `${P} Statistik: Quote je Fahrlehrer und Prüfer-Statistik`, async () => {
    const f = [];
    const q = await page.textContent("#luQuoteLehrer").catch(() => "");
    if (!/Anton Muster/.test(q) || !/Berta Muster/.test(q)) f.push("Quote je Fahrlehrer: " + q.slice(0, 160));
    if (!(await page.locator("#luPruefer").count())) f.push("Prüfer-Statistik fehlt");
    return f;
  });

  // L4 Monatsbericht
  const mbKnopf = await page.locator("#kMonatsbericht").count();
  let mbText = "";
  if (mbKnopf) {
    await page.click("#kMonatsbericht"); await warte(page, 300);
    const neuSeite = ctx.waitForEvent("page", { timeout: 4000 }).catch(() => null);
    await speichern(page);
    const w = await neuSeite;
    if (w) { await warte(w, 300); mbText = await w.textContent("body"); await w.close(); }
  }
  await pruefe("L4", `${P} Monatsbericht: Knopf in der Statistik, Druckfenster mit Zahlen, ohne Schülernamen`, async () => {
    if (!mbKnopf) return "kein Knopf „Monatsbericht (PDF)“";
    const f = [];
    if (!/Monatsbericht/.test(mbText) || !/aktive Schüler/.test(mbText) || !/Anton Muster/.test(mbText)) f.push("Inhalt: " + mbText.slice(0, 160));
    const namen = await page.evaluate(() => S.schueler.map((x) => x.name));
    const drin = namen.filter((nm) => mbText.includes(nm));
    if (drin.length) f.push("Schülernamen im Bericht: " + drin.length);
    if (await page.locator("dialog[open]").count()) f.push("Fenster blieb offen");
    return f;
  });

  if (handy) for (const h of ["#team", "#verkaeufe", "#zahlen"]) {
    await gehe(page, h);
    await pruefe("L9", `${P} ${h}: nichts ragt seitlich heraus`, () => page.evaluate(() => (document.documentElement.scrollWidth <= innerWidth + 1 ? null : "Seite " + document.documentElement.scrollWidth + " px breit")));
  }
  await pruefe("L9", `${P} keine Browser-Bestätigungsfenster`, () => dialoge);
  await pruefe("L9", `${P} keine JS-Fehler`, () => konsole);
  await ctx.close();
}

// L7 Ausweg ohne gültige PIN
const pers = (id, name, extra) => Object.assign({ id, fahrschule_id: "fs-test-1", name, telefon: null, hat_pin: false, _pin: null, pin_frei_bis: null, darf_verwalten: false, aktiv: true, gesperrt_bis: null, fehlversuche: 0 }, extra);
for (const [fall, personen, erwartet] of NUR && NUR !== "L7" ? [] : [
  ["niemand mit PIN oder Freigabe", [pers("bp-a", "Eva Muster"), pers("bp-b", "Udo Muster", { darf_verwalten: true })], /Gerade kann sich niemand anmelden[\s\S]*PIN freigeben/],
  ["keine Büro-Personen", [], /Noch keine Büro-Personen[\s\S]*Fahrschul-Leitung/],
  ["eine Person mit Freigabe (kein Kasten)", [pers("bp-a", "Eva Muster", { pin_frei_bis: new Date(Date.now() + 3600e3).toISOString() })], null],
]) {
  const { page, ctx, konsole, dialoge } = await oeffne({ person: null, personen });
  await warte(page, 400);
  await pruefe("L7", `[${fall}] Hinweis-Kasten passt`, async () => {
    const sicht = await page.isVisible("#werAusweg");
    const text = sicht ? await page.textContent("#werAusweg") : "";
    if (!erwartet) return sicht ? "Kasten ohne Grund: " + text : null;
    if (!sicht || !erwartet.test(text)) return "Kasten: " + (text || "nicht sichtbar");
    const ab = await page.isVisible("#wer [data-abmelden]");
    return ab ? null : "kein Abmelden sichtbar";
  });
  if (erwartet && personen.length) {
    // Leitung gibt inzwischen eine PIN frei: „Nochmal prüfen“ lädt neu, der Kasten verschwindet
    await page.evaluate(() => { window.__FAKE.tabellen.buero_personen[0].pin_frei_bis = new Date(Date.now() + 3600e3).toISOString(); });
    await page.click("#werNochmal"); await warte(page, 600);
    await pruefe("L7", `[${fall}] „Nochmal prüfen“ lädt neu: Kasten weg, Person kann PIN festlegen`, async () => {
      const f = [];
      if (await page.isVisible("#werAusweg")) f.push("Kasten noch da");
      if (!/neu: PIN festlegen/.test(await page.textContent("#werListe"))) f.push("Liste nicht neu: " + (await page.textContent("#werListe")));
      const h = await page.evaluate(() => { const b = document.querySelector("#werNochmal"); return b ? b.getBoundingClientRect().height : 44; });
      if (h < 44) f.push("Knopf " + h + " px");
      return f;
    });
  }
  await pruefe("L7", `[${fall}] App-Seite bleibt gesperrt (PIN nie umgangen)`, () => page.evaluate(() => (document.getElementById("app").inert ? null : "Seite bedienbar")));
  await pruefe("L7", `[${fall}] keine JS-Fehler, keine Browser-Fenster`, () => konsole.concat(dialoge));
  await ctx.close();
}

// L8 Urlaubs-Warnung bei Prüfung, Fahrlehrerwechsel und Nachweis
if (!NUR || NUR === "L8") {
  const { page, ctx, konsole, dialoge } = await oeffne({});
  await page.evaluate(([von, bis]) => {
    window.__FAKE.tabellen.fahrschule_urlaub.push({ id: "u-l8", fahrschule_id: S.fsId, fahrlehrer_id: "fl-2", mitarbeiter_name: "Berta Muster", von, bis, erstellt_von: "bu-1" });
    VW.stand.urlaub = 0;
  }, [plus(HEUTE, 3), plus(HEUTE, 30)]);
  // Prüfung
  const pAnz = async () => (await tab(page, "pruefungstermine")).length;
  const p0 = await pAnz();
  const pruefungVersuch = async (ja, lehrer) => {
    await page.evaluate(() => pruefungDialog(null)); await warte(page, 300);
    await page.selectOption("dialog[open] select[name=schueler_id]", "s5");
    await page.fill("dialog[open] input[name=datum]", plus(HEUTE, 7));
    await page.fill("dialog[open] input[name=von]", "09:00");
    await page.selectOption("dialog[open] select[name=fahrlehrer_id]", lehrer);
    await speichern(page);
    const t = await offenText(page);
    if (/Urlaub/.test(t)) { if (ja) await speichern(page); else { await page.keyboard.press("Escape"); await warte(page, 500); } }
    await alleZu(page);
    return t;
  };
  const tp1 = await pruefungVersuch(false, "fl-2"); const p1 = await pAnz();
  const tp2 = await pruefungVersuch(true, "fl-2"); const p2 = await pAnz();
  const tp3 = await pruefungVersuch(false, "fl-3"); const p3 = await pAnz();
  await pruefe("L8", "Praxisprüfung im Urlaub: Warnung, Abbrechen speichert nichts, Trotzdem speichert; anderer Fahrlehrer ohne Warnung", () => {
    const f = [];
    if (!/Berta Muster hat vom .* Urlaub/.test(tp1) || p1 !== p0) f.push("Abbrechen: " + tp1.slice(0, 80) + " / " + (p1 - p0));
    if (!/Urlaub/.test(tp2) || p2 !== p0 + 1) f.push("Trotzdem: " + (p2 - p0));
    if (/Urlaub/.test(tp3) || p3 !== p0 + 2) f.push("ohne Urlaub: " + tp3.slice(0, 80));
    return f;
  });
  // Fahrlehrerwechsel: Schüler s1 (fl-1) mit künftigen Terminen zu Berta (fl-2) → Warnung; Abbrechen = Termine bleiben bei Anton
  const kuenftig = async (sid) => (await tab(page, "kalender_termine")).filter((t) => t.schueler_id === sid && !t.geloescht && t.datum >= HEUTE);
  const sid = await page.evaluate(([von, bis]) => { const x = S.schueler.find((y) => y.fahrlehrer_id === "fl-1" && S.termine.some((t) => t.schueler_id === y.id && t.fahrlehrer_id === "fl-1" && t.datum >= von && t.datum <= bis)); return x && x.id; }, [plus(HEUTE, 3), plus(HEUTE, 30)]);
  let wText = "";
  if (sid) {
    await page.evaluate((id) => { verschiebeSchueler(S.schueler.find((y) => y.id === id), "fl-2"); }, sid); await warte(page, 600);
    wText = await offenText(page);
    if (/Urlaub/.test(wText)) { await page.keyboard.press("Escape"); await warte(page, 700); }
    await alleZu(page);
  }
  const nach = sid ? await kuenftig(sid) : [];
  const sNeu = sid ? (await tab(page, "schueler")).find((x) => x.id === sid) : null;
  await pruefe("L8", "Fahrlehrerwechsel: Warnung nennt den Urlaub; Abbrechen lässt die Termine beim alten Fahrlehrer, Schüler wechselt trotzdem", () => {
    if (!sid) return "kein passender Testschüler";
    const f = [];
    if (!/Berta Muster hat vom .* Urlaub[\s\S]*Trotzdem übertragen/.test(wText)) f.push("Warnung: " + wText.slice(0, 120));
    if (nach.some((t) => t.fahrlehrer_id === "fl-2")) f.push("Termine trotzdem übertragen");
    if (!sNeu || sNeu.fahrlehrer_id !== "fl-2") f.push("Schüler nicht gewechselt");
    return f;
  });
  // Nachweis: Stunde nachtragen an einem Urlaubstag
  const nAnz = async () => (await tab(page, "kalender_termine")).filter((t) => t.schueler_id === "s3" && t.datum === plus(HEUTE, 4)).length;
  const n0 = await nAnz();
  await page.evaluate((d) => { const x = S.schueler.find((y) => y.id === "s3"); window.__nwAlle = true; nwStundeDialog(x, null, () => {}); }, null); await warte(page, 400);
  await page.fill("dialog[open] input[name=datum]", plus(HEUTE, 4));
  await page.selectOption("dialog[open] select[name=fahrlehrer_id]", "fl-2");
  await page.fill("dialog[open] input[name=von]", "10:00"); await page.fill("dialog[open] input[name=bis]", "10:45");
  await page.selectOption("dialog[open] select[name=artwahl]", { index: 1 });
  await speichern(page);
  const nText = await offenText(page);
  if (/Urlaub/.test(nText)) { await page.keyboard.press("Escape"); await warte(page, 600); }
  await alleZu(page);
  const n1 = await nAnz();
  await pruefe("L8", "Nachweis: Stunde nachtragen im Urlaub warnt, Abbrechen speichert nichts", () => {
    const f = [];
    if (!/Berta Muster hat vom .* Urlaub/.test(nText)) f.push("keine Warnung: " + nText.slice(0, 100));
    if (n1 !== n0) f.push("trotzdem gespeichert");
    return f;
  });
  await pruefe("L8", "keine JS-Fehler, keine Browser-Fenster", () => konsole.concat(dialoge));
  await ctx.close();
}

// L10 Glocke: Geburtstag heute, Fahrstunden und Prüfungen morgen mit WhatsApp-Link (nur Link, nichts verschickt)
if (!NUR || NUR === "L10") for (const [n, opt] of [["PC, Büro", {}], ["Handy, Leitung", { nutzer: "ad-1", person: null, breite: 360, hoehe: 780 }]]) {
  const P = `[${n}]`;
  const { page, ctx, konsole, dialoge } = await oeffne(Object.assign({ hash: "#kalender" }, opt));
  // gleich nach dem Laden sichtbar (ohne eigenes Neuzeichnen: die Datei muss vor dem ersten Zeichnen geladen sein)
  await pruefe("L10", `${P} Glocke nach dem Laden im Kopf sichtbar`, async () => (await page.isVisible("#glocke") ? null : "Glocke versteckt"));
  const erwartet = await page.evaluate((md) => {
    const x = S.schueler.find((y) => y.id === "s3"); x.geburtsdatum = "2008-" + md; x.telefon = "0170 0000003";
    const morgen = KR.addDaysISO(KR.todayISO(), 1);
    const t = S.termine.filter((y) => y.datum === morgen && !y.geloescht && y.schueler_id && y.art !== "block").length;
    const p = S.pruefungstermine.filter((y) => y.datum === morgen && y.status === "geplant").length;
    zeichne();
    return { t, p };
  }, HEUTE.slice(5));
  const zahl = await page.textContent("#glockeZahl").catch(() => "");
  await page.click("#glocke"); await warte(page, 400);
  const info = await page.evaluate(() => {
    const d = document.querySelector("dialog[open]"); if (!d) return null;
    const links = [...d.querySelectorAll("a[href^='https://wa.me/']")];
    return { text: d.textContent, links: links.map((a) => ({ href: a.href, ziel: a.target, rel: a.rel, h: a.getBoundingClientRect().height })), breit: d.scrollWidth > d.clientWidth + 1 };
  });
  await pruefe("L10", `${P} Glocke: Zähler, Geburtstag heute, Termine morgen mit WhatsApp-Link`, () => {
    if (!info) return "kein Fenster";
    const f = [];
    if (Number(zahl) < 1 + erwartet.t) f.push(`Zähler ${zahl}, erwartet mindestens ${1 + erwartet.t}`);
    if (!/hat heute Geburtstag/.test(info.text) || !/Jonas|s3|Muster|Beispiel|Probe|Vorlage/.test(info.text)) f.push("Geburtstag fehlt");
    if (erwartet.t && info.links.length < erwartet.t) f.push(`${info.links.length} Links für ${erwartet.t} Termine`);
    const geb = info.links.find((l) => /wa\.me\/491700000003\?text=/.test(l.href));
    if (!geb) f.push("Nummer nicht wie in der App umgeschrieben (0170… → 49170…)");
    if (info.links.some((l) => l.ziel !== "_blank" || !/noopener/.test(l.rel))) f.push("Link ohne neues Fenster/noopener");
    if (info.links.some((l) => l.h < 44)) f.push("Knopf unter 44 px");
    if (!info.links.some((l) => /Kurze%20Erinnerung%3A%20morgen/.test(l.href))) f.push("Erinnerungstext fehlt");
    if (info.breit) f.push("Fenster ragt seitlich heraus");
    return f;
  });
  await alleZu(page);
  await pruefe("L10", `${P} keine JS-Fehler, keine Browser-Fenster`, () => konsole.concat(dialoge));
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
