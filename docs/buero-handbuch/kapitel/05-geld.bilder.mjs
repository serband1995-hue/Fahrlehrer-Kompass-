// Kapitel 5 „Geld, Quittung und Druck“ – Bilder.
// Erfundene Vorführ-Daten werden vor dem Start in die Attrappe gelegt (vorInit), nichts davon ist echt.
// Druckbilder: Die Druckvorschau entsteht als echtes A4-PDF (Chromium, mit Kopf, Fuß und Seitenzahl), wird zu einem Bild
// gewandelt und im Browser eingeblendet (zeigeBild), damit das Bild-Werkzeug es wie jedes andere Bild fotografiert.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* ---------- Vorführ-Daten (laufen im Browser, vor allen Skripten der Seite) ---------- */
function seedFn(o) {
  const FS = "fs-test-1";
  const hook = (v) => {
    if (!v || !v.tabellen || v.__geld) return;
    v.__geld = true;
    const T = v.tabellen;
    const tab = (n) => (T[n] = T[n] || []);
    const jetzt = "2026-12-02T08:00:00.000Z";
    if (o.slug) T.fahrschulen.forEach((f) => { if (f.id === FS) f.slug = o.slug; });
    if (o.preise) {
      const t = tab("fahrschule_preise");
      const r = (art, klasse, bez, einheit, cent, ab, inhalt) => t.push({ id: "pr-" + t.length, fahrschule_id: FS, art, klasse, bezeichnung: bez, einheit, inhalt: inhalt || null, gueltig_ab: ab, betrag_cent: cent, angelegt_am: ab + "T08:00:00Z", bearbeiter: "Mia Muster", paket_id: null });
      r("grundbetrag", "B", "Grundbetrag", "pauschal", 38000, "2026-01-01");
      r("fahrstunde", "B", "Übungsfahrstunde", "45min", 6200, "2026-01-01");
      r("fahrstunde", "B", "Übungsfahrstunde", "45min", 6500, "2026-07-01");
      r("fahrstunde", "B", "Übungsfahrstunde", "45min", 6800, "2027-01-01");
      r("sonderfahrt", "B", "Überlandfahrt", "45min", 7500, "2026-01-01");
      r("sonderfahrt", "B", "Autobahnfahrt", "45min", 7500, "2026-01-01");
      r("sonderfahrt", "B", "Fahrt bei Dämmerung oder Dunkelheit", "45min", 7500, "2026-01-01");
      r("pruefung_praxis", "B", "Vorstellung zur praktischen Prüfung", "pauschal", 19000, "2026-01-01");
      r("pruefung_theorie", "B", "Vorstellung zur theoretischen Prüfung", "pauschal", 9500, "2026-01-01");
      r("lernapp", null, "Fahr-Akademie Lernapp", "pauschal", 4900, "2026-01-01");
      r("simulator", null, "Simulator", "pauschal", 14900, "2026-01-01");
      r("reaktivierung", null, "Reaktivierung", "pauschal", 12000, "2026-01-01");
    }
    if (o.pakete) {
      const p = tab("fahrschule_pakete");
      p.push({ id: "p-2", fahrschule_id: FS, name: "Boost-Paket 2", reihenfolge: 2, aktiv: true, klasse: "B", aktualisiert_am: jetzt, bearbeiter: "Mia Muster", posten: [
        { art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent_fest: null },
        { art: "lernapp", bezeichnung: "Fahr-Akademie Lernapp", anzahl: 1, preis_cent_fest: null },
        { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 10, preis_cent_fest: null },
        { art: "sonderfahrt", bezeichnung: "Überlandfahrt", anzahl: 5, preis_cent_fest: null },
        { art: "sonderfahrt", bezeichnung: "Autobahnfahrt", anzahl: 4, preis_cent_fest: null },
        { art: "sonderfahrt", bezeichnung: "Fahrt bei Dämmerung oder Dunkelheit", anzahl: 3, preis_cent_fest: null },
        { art: "pruefung_praxis", bezeichnung: "Vorstellung zur praktischen Prüfung", anzahl: 1, preis_cent_fest: 17500 },
      ] });
      p.push({ id: "p-alt", fahrschule_id: FS, name: "Sommer-Paket (alt)", reihenfolge: 3, aktiv: false, klasse: "B", aktualisiert_am: jetzt, bearbeiter: "Mia Muster", posten: [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent_fest: null }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 12, preis_cent_fest: null }] });
      const bp1 = p.find((x) => x.id === "p-1");
      if (bp1) bp1.posten = [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent_fest: null }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent_fest: null }];
    }
    if (o.zahlungsdaten) {
      tab("fahrschule_zahlungsdaten").push({ fahrschule_id: FS, kontoinhaber: "Max Muster", iban: "DE89370400440532013000", bic: "COBADEFFXXX", paypal: "", impressum: "Fahrschule Boost, Musterweg 1, 12345 Musterstadt, Telefon 0170 0000000, max@example.org", modus: o.zahlungsdaten === "echt" ? "echt" : "test", test_email: "test@example.org", geaendert_am: jetzt, geaendert_von: "ad-1", bearbeiter: "Mia Muster" });
    }
    const ein = (k, wert) => tab("fahrschule_einstellungen").push({ fahrschule_id: FS, schluessel: k, wert });
    if (o.belegKopf) {
      ein("beleg.fahrschule", { name: "Fahrschule Boost", anschrift: "Musterweg 1\n12345 Musterstadt", steuernummer: "12/345/67890", ustid: "" });
      if (o.steuer) ein("beleg.steuer", { ausweisen: true, satz: "19", hinweis: "Vorführ-Hinweis: Dies ist ein Beispieltext." });
      if (o.bargeld) ein("beleg.bargeld", { aktiv: true });
    }
    if (o.belege) {
      const b = tab("zahlungsbelege");
      const kopf = { name: "Fahrschule Boost", anschrift: "Musterweg 1\n12345 Musterstadt", steuernummer: "12/345/67890", ustid: "" };
      const adr = { strasse: "Musterweg 1", plz: "12345", ort: "Musterstadt" };
      const z = (nr, datum, sid, name, kn, betrag, zweck, zahlart, extra) => b.push(Object.assign({ id: "bl-" + nr, fahrschule_id: FS, nummer: nr, datum, schueler_id: sid, schueler_name: name, kundennummer: kn, schueler_adresse: adr, betrag, zweck, zahlart, storno_von: null, fahrschule_daten: kopf, steuer: null, erstellt_am: datum + "T09:00:00Z", bearbeiter: "Mia Muster", aussteller: "Mia Muster" }, extra || {}));
      z(1, "2026-11-20", "s1", "Lena Beispiel", 1, 380, "Grundbetrag", "ueberweisung");
      z(2, "2026-11-25", "s2", "Jonas Probe", 2, 65, "Fahrstunden", "ec");
      z(3, "2026-11-28", "s1", "Lena Beispiel", 1, 130, "Fahrstunden", "bar");
      z(4, "2026-11-28", "s2", "Jonas Probe", 2, 70, "Falscher Betrag", "ec");
      z(5, "2026-11-28", "s2", "Jonas Probe", 2, -70, "Storno zu Beleg Nr. 4: falscher Betrag", "ec", { storno_von: "bl-4" });
      z(6, "2026-12-02", "s3", "Greta Vorlage", 3, 190, "Vorstellung zur praktischen Prüfung", "ec");
      z(7, "2026-12-02", "s1", "Lena Beispiel", 1, 65, "Fahrstunden", "ec");
      tab("belege_zaehler_fake").push({ fs: FS, letzte: 7 });
    }
    if (o.punkte) {
      ein("punkte.system", { aktiv: true, verschenken: !!o.verschenken, bedingungen: "Vorführ-Text: Punkte gelten ein Jahr. Eine Auszahlung in Geld gibt es nicht." });
      ein("punkte.regeln", { liste: [{ id: "r1", name: "Theorieprüfung bestanden", punkte: 50 }, { id: "r2", name: "Freunde geworben", punkte: 100 }] });
      ein("punkte.praemien", { liste: [{ id: "q1", name: "Eine Übungsfahrstunde gratis", punkte: 200 }, { id: "q2", name: "Fahrschul-Tasse", punkte: 80 }] });
      if (o.punkteBuchungen) {
        const t = tab("schueler_punkte");
        const bu = (art, punkte, grund, tag) => t.push({ id: "pu-" + t.length, fahrschule_id: FS, schueler_id: "s1", art, punkte, grund, erstellt_am: tag + "T10:00:00Z", bearbeiter: "Mia Muster", gegen_schueler_id: null });
        bu("vergeben", 50, "Theorieprüfung bestanden", "2026-11-20");
        bu("vergeben", 100, "Freunde geworben", "2026-11-24");
        bu("einloesen", -80, "Fahrschul-Tasse", "2026-11-30");
      }
    }
    if (o.lehrerSlug) T.profiles.forEach((x) => { if (x.id === "fl-1") x.slug = "anton-muster"; });
    if (o.sperre) {
      const s = T.schueler.find((x) => x.id === "s2");
      if (s) { s.zahlung_gesperrt_seit = "2026-11-30T10:00:00Z"; s.zahlung_gesperrt_grund = "Rechnung offen"; }
    }
    if (o.email) {
      const s = T.schueler.find((x) => x.id === "s3");
      if (s) s.email = "greta@example.org";
    }
  };
  let f; const prev = Object.getOwnPropertyDescriptor(window, "__FAKE");
  Object.defineProperty(window, "__FAKE", { configurable: true, get: () => (prev && prev.get ? prev.get() : f), set: (v) => { if (prev && prev.set) prev.set(v); else f = v; hook(v); } });
}
const init = (o) => "(" + seedFn.toString() + ")(" + JSON.stringify(o || {}) + ")";

/* ---------- Hilfen für Druckbilder ---------- */
// Webseite (page) als A4-Seite drucken → erstes Blatt als PNG-Bytes
async function pdfZuPng(seite, opt) {
  const ord = mkdtempSync(join(tmpdir(), "hb-geld-"));
  const pdf = join(ord, "x.pdf");
  { const { dpi, ...rest } = opt || {}; writeFileSync(pdf, await seite.pdf({ preferCSSPageSize: true, printBackground: true, ...rest })); }
  execFileSync("pdftoppm", ["-r", String((opt && opt.dpi) || 110), "-png", "-f", "1", "-l", "1", pdf, join(ord, "s")], { stdio: "ignore" });
  const datei = readdirSync(ord).find((f) => f.endsWith(".png"));
  return readFileSync(join(ord, datei));
}
// PNG in der Seite einblenden (grauer Hintergrund wie eine Druckvorschau) – danach mit ausschnitt: "#hbVorschau" fotografieren.
// opt: breite (CSS-Pixel), oben (Anteil der Blatthöhe, der gezeigt wird), punkte [{x,y,nr}] (Anteile 0..1: rote Nummern auf dem Blatt)
async function zeigeBild(page, png, opt) {
  opt = opt || {};
  const b64 = png.toString("base64");
  await page.evaluate(({ b64, opt }) => {
    document.querySelectorAll("dialog").forEach((d) => d.close && d.close());
    const o = document.createElement("div");
    o.id = "hbVorschauRahmen";
    o.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#6b7280;overflow:auto;padding:14px;display:flex;flex-direction:column;align-items:center;gap:10px;";
    const br = opt.breite || 800;
    o.innerHTML = `<div id="hbVorschau" style="position:relative;width:${br}px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.5);overflow:hidden"><img id="hbBild" style="display:block;width:${br}px;height:auto" src="data:image/png;base64,${b64}"></div>`;
    document.body.appendChild(o);
    const img = document.getElementById("hbBild");
    const fertig = () => {
      const box = document.getElementById("hbVorschau");
      if (opt.oben) box.style.height = Math.round(img.getBoundingClientRect().height * opt.oben) + "px";
      (opt.punkte || []).forEach((p) => {
        const n = document.createElement("div");
        n.className = "hb-marke"; n.textContent = p.nr;
        n.style.cssText = `position:absolute;left:${p.x * br - 13}px;top:${p.y * img.getBoundingClientRect().height - 13}px;width:26px;height:26px;border-radius:50%;background:#d6202a;color:#fff;font:700 15px/26px Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff`;
        box.appendChild(n);
      });
    };
    if (img.complete) fertig(); else img.onload = fertig;
  }, { b64, opt });
  await page.waitForFunction(() => { const i = document.getElementById("hbBild"); return i && i.complete && i.naturalWidth > 0; });
  await page.waitForTimeout(300);
}
// Fertiges HTML (Quittung, Bericht …) in einem eigenen Blatt drucken und als Vorschau einblenden
async function htmlBild(page, html, opt) {
  const p2 = await page.context().newPage();
  await p2.setContent(html, { waitUntil: "load" });
  await p2.waitForTimeout(600);
  const png = await pdfZuPng(p2, { dpi: 190 });
  await p2.close();
  await zeigeBild(page, png, opt);
}
// Die Seite so drucken, wie der Knopf „Drucken“ es tut (Kopf wird gefüllt, dann Druckbild)
async function seiteDruckbild(page) {
  await page.evaluate(() => { window.fuelleDruckKopf(); });
  await page.waitForTimeout(300);
  return pdfZuPng(page, { dpi: 190 });
}
// Neues Fenster (window.open) abwarten, Ansicht im Fenster als Bild
async function fensterBild(page, ausloeser, breite = 900, hoehe = 1100) {
  const [pop] = await Promise.all([page.waitForEvent("popup", { timeout: 8000 }), ausloeser()]);
  await pop.setViewportSize({ width: breite, height: hoehe });
  await pop.waitForLoadState("load").catch(() => {});
  await pop.evaluate(() => { window.print = () => {}; });
  await pop.waitForTimeout(1800);
  return pop;
}



const VOLL = { preise: true, pakete: true, zahlungsdaten: "test", belegKopf: true, belege: true, slug: "boost" };



// Fenster öffnen (Knopf), dann entweder Bildschirm-Ansicht des Fensters oder sein Druckbild einblenden
async function popupBild(p, ausloeser, modus, opt) {
  opt = opt || {};
  const logo = await p.evaluate(() => (window.DRUCK && S.fs ? DRUCK.logoUrl(S.fs.slug) : ""));
  const pop = await fensterBild(p, ausloeser, opt.pw || 900, opt.ph || 1100);
  // Im Testlauf wird das Logo im neuen Fenster zu früh verworfen (die Seite wartet nur 1,5 s): hier an derselben Stelle nachreichen
  if (logo) {
    await pop.evaluate((u) => new Promise((ok) => {
      const host = document.querySelector(".dkopf") || document.querySelector(".stand");
      if (!host || host.querySelector("img")) return ok();
      const i = document.createElement("img"); i.className = "dlogo"; i.onload = i.onerror = () => ok(); i.src = u; host.insertBefore(i, host.firstChild);
    }), logo);
  }
  const png = modus === "fenster" ? await pop.screenshot() : await pdfZuPng(pop, { dpi: 190 });
  await pop.close();
  await zeigeBild(p, png, opt);
}

const D = "dialog[open]";
const preise = (extra) => Object.assign({ url: "#preise", geraet: "pc", vorInit: init(VOLL) }, extra);
const pakete = (extra) => Object.assign({ url: "#preise?reiter=pakete", geraet: "pc", vorInit: init(VOLL) }, extra);
const verk = (extra) => Object.assign({ url: "#verkaeufe", geraet: "pc", vorInit: init(VOLL) }, extra);
const belege = (extra) => Object.assign({ url: "#belege", geraet: "pc", vorInit: init(VOLL) }, extra);
const dlgBild = (sel = D) => ({ ausschnitt: { sel, rand: 20 } });

const akte = async (p, h, id) => { await p.evaluate((x) => schuelerDialog(x), id); await h.warte(1000); };
// Rote Nummern auf der Quittungs-Vorschau (Anteile von Breite/Höhe des gezeigten Ausschnitts)
const QP = {
  normal: [{ x: .05, y: .078, nr: 1 }, { x: .665, y: .06, nr: 2 }, { x: .05, y: .272, nr: 3 }, { x: .27, y: .272, nr: 4 }, { x: .475, y: .272, nr: 5 }, { x: .05, y: .355, nr: 6 }, { x: .05, y: .485, nr: 7 }, { x: .05, y: .545, nr: 8 }],
  storno: [{ x: .06, y: .263, nr: 1 }, { x: .64, y: .31, nr: 2 }, { x: .955, y: .578, nr: 3 }],
  steuer: [{ x: .04, y: .525, nr: 1 }, { x: .04, y: .553, nr: 2 }, { x: .04, y: .683, nr: 3 }],
};

const LISTE = [
  /* ---------- Zahlungen und Preise ---------- */
  { id: "05-zahlungen-reiter", ...preise({ ausschnitt: { sel: ".zahl-reiter", rand: 26 } }),
    marken: [{ sel: ".zahl-reiter a:nth-child(1)", nr: 1 }, { sel: ".zahl-reiter a:nth-child(2)", nr: 2 }, { sel: ".zahl-reiter a:nth-child(3)", nr: 3 }, { sel: ".zahl-reiter a:nth-child(4)", nr: 4 }] },
  { id: "05-zahlungen-nav", ...preise({ ausschnitt: { sel: "#nav", rand: 6 } }), marken: [{ sel: "a.nav-punkt[href='#zahlungen']", nr: 1 }] },
  { id: "05-preise-kopf", ...preise({ ausschnitt: { sel: ".pr-kopf", rand: 26 } }),
    marken: [{ sel: "#prNeu", nr: 1 }, { sel: "#prCsv", nr: 2 }, { sel: "#prJson", nr: 3 }] },
  { id: "05-preise-tabelle", ...preise({ hoehe: 1000, ausschnitt: { sel: ".pr-tabelle", rand: 20, maxHoehe: 600 } }),
    marken: [{ sel: ".pr-preis", nr: 1 }, { sel: ".pr-bald", nr: 2 }, { sel: ".pr-verlauf summary", nr: 3 }, { sel: "[data-pr-aendern]", nr: 4 }] },
  { id: "05-preise-verlauf", ...preise({ hoehe: 1000, vorher: async (p, h) => { await p.locator(".pr-verlauf summary").nth(1).click(); await h.warte(300); }, ausschnitt: { sel: ".pr-zeile:has(details[open])", rand: 20 }, marken: [{ sel: "details[open] ul", nr: 1 }] }) },
  { id: "05-preis-neu", ...preise({ vorher: async (p, h) => { await h.klick("#prNeu"); await h.tippe(D + " input[name=betrag]", "65.00"); }, ...dlgBild(),
    marken: [{ sel: D + " select[name=art]", nr: 1 }, { sel: D + " select[name=klasse]", nr: 2 }, { sel: D + " input[name=bezeichnung]", nr: 3 }, { sel: D + " select[name=einheit]", nr: 4 }, { sel: D + " input[name=betrag]", nr: 5 }, { sel: D + " input[name=ab]", nr: 6 }] }) },
  { id: "05-preis-aendern", ...preise({ vorher: async (p, h) => { await p.locator("[data-pr-aendern]").nth(1).click(); await h.warte(500); await h.tippe(D + " input[name=betrag]", "70.00"); }, ...dlgBild(),
    marken: [{ sel: D + " input[name=betrag]", nr: 1 }, { sel: D + " input[name=ab]", nr: 2 }, { sel: D + " .pr-wahl", nr: 3 }] }) },
  { id: "05-preise-handy", ...preise({ geraet: "handy", hoehe: 915 }) },

  /* ---------- Pakete ---------- */
  { id: "05-pakete-liste", ...pakete({ hoehe: 1000, vorher: async (p, h) => { await p.locator("details.bk-archiv summary").click(); await h.warte(300); }, ausschnitt: { sel: ".bk-seite", rand: 20 } }),
    marken: [{ sel: "#bkNeu", nr: 1 }, { sel: ".bk-v-summe", nr: 2 }, { sel: "[data-bk-bearbeiten]", nr: 3 }, { sel: "[data-bk-kopie]", nr: 4 }, { sel: "[data-bk-archiv]", nr: 5 }, { sel: "details.bk-archiv summary", nr: 6 }] },
  { id: "05-paket-neu", ...pakete({ hoehe: 1000, vorher: async (p, h) => { await h.klick("#bkNeu"); await h.tippe(D + " input[name=name]", "Boost-Paket 3"); }, ...dlgBild(),
    marken: [{ sel: D + " input[name=name]", nr: 1 }, { sel: D + " select[name=klasse]", nr: 2 }, { sel: D + " [data-bk-chips]", nr: 3 }] }) },
  { id: "05-paket-posten", ...pakete({ hoehe: 2300, vorher: async (p, h) => { await p.locator("[data-bk-bearbeiten='p-2']").click(); await h.warte(600); }, ...dlgBild(),
    marken: [{ sel: D + " .bk-posten:nth-child(1) .bk-p-titel b", nr: 1 }, { sel: D + " .bk-posten:nth-child(3) .bk-stepper", nr: 2 }, { sel: D + " .bk-posten:nth-child(3) .bk-preisfeld", nr: 3 }, { sel: D + " .bk-posten:nth-child(7) [data-bk-hinweis]", nr: 4 }, { sel: D + " .bk-posten:nth-child(1) .bk-weg", nr: 5 }, { sel: D + " .bk-gesamt", nr: 6 }, { sel: D + " [data-bk-chips]", nr: 7 }] }) },
  { id: "05-paket-kopieren", ...pakete({ hoehe: 1100, vorher: async (p, h) => { await p.locator("[data-bk-kopie='p-1']").click(); await h.warte(600); }, ...dlgBild(), marken: [{ sel: D + " input[name=name]", nr: 1 }] }) },
  { id: "05-paket-archiviert", toast: true, ...pakete({ hoehe: 1000, vorher: async (p, h) => { await p.locator("[data-bk-archiv='p-1']").click(); await h.warte(600); }, ausschnitt: { sel: ".toast.zeigen", rand: 14 } }) },

  /* ---------- Verkäufe & Provision ---------- */
  { id: "05-verkaeufe-ueberblick", ...verk({ hoehe: 1100, ausschnitt: { sel: "#ansicht", rand: 8 } }),
    marken: [{ sel: ".kachel.rot", nr: 1 }, { sel: "#vMonat", nr: 2 }, { sel: "#vLehrer", nr: 3 }, { sel: "#vStatus", nr: 4 }, { sel: "#vNeu", nr: 5 }, { sel: "tbody tr:nth-child(1) .aktionen-box", nr: 6 }] },
  { id: "05-verkauf-neu", ...verk({ vorher: async (p, h) => { await h.klick("#vNeu"); await p.locator(D + " select[name=schueler_id]").selectOption({ index: 3 }); await p.locator(D + " select[name=fahrlehrer_id]").selectOption({ index: 1 }); await h.warte(200); }, ...dlgBild(),
    marken: [{ sel: D + " select[name=schueler_id]", nr: 1 }, { sel: D + " select[name=typ]", nr: 2 }, { sel: D + " select[name=fahrlehrer_id]", nr: 3 }] }) },
  { id: "05-verkauf-bezahlt", ...verk({ vorher: async (p, h) => { await p.locator("[data-vbezahlt]").first().click(); await h.warte(500); }, ...dlgBild(),
    marken: [{ sel: D + " input[name=betrag]", nr: 1 }, { sel: D + " #vSplit", nr: 2 }] }) },
  { id: "05-verkauf-zeilen", ...verk({ hoehe: 1100, ausschnitt: { sel: ".karte:has(table.tabelle) >> nth=0", rand: 10, maxHoehe: 520 } }),
    marken: [{ sel: "[data-vzugang]", nr: 1 }, { sel: "[data-vbezahlt]", nr: 2 }, { sel: "[data-vstorno]", nr: 3 }] },
  { id: "05-provisionen", ...verk({ hoehe: 1100, ausschnitt: { sel: ".karte:has(#pvNeu)", rand: 10 } }), marken: [{ sel: "#pvNeu", nr: 1 }, { sel: "[data-pausz]", nr: 2 }] },
  { id: "05-provision-hand", ...verk({ vorher: async (p, h) => { await h.klick("#pvNeu"); await p.locator(D + " select[name=fahrlehrer_id]").selectOption({ index: 1 }); await h.tippe(D + " input[name=betrag]", "15,00"); }, ...dlgBild(),
    marken: [{ sel: D + " select[name=fahrlehrer_id]", nr: 1 }, { sel: D + " select[name=typ]", nr: 2 }, { sel: D + " input[name=betrag]", nr: 3 }] }) },
  { id: "05-provision-ausgezahlt", ...verk({ vorher: async (p, h) => { await h.klick("[data-pausz]"); }, ...dlgBild("dialog[open]") }) },

  /* ---------- Belege ---------- */
  { id: "05-belege-ueberblick", ...belege({ hoehe: 1100, ausschnitt: { sel: "#ansicht", rand: 8 } }),
    marken: [{ sel: ".kachel:nth-child(1)", nr: 1 }, { sel: ".kachel:nth-child(2)", nr: 2 }, { sel: ".kachel:nth-child(3)", nr: 3 }, { sel: "#belegSuche", nr: 4 }, { sel: "#belegNeu", nr: 5 }] },
  { id: "05-belege-zeilen", ...belege({ hoehe: 1100, vorher: async (p, h) => { await h.tippe("#belegSuche", "Jonas"); await h.warte(700); }, ausschnitt: { sel: ".karte:has(table)", rand: 10, maxHoehe: 560 } }),
    marken: [{ sel: "tbody tr:nth-child(1) td:nth-child(1)", nr: 1 }, { sel: "tbody tr:nth-child(2) .marke-pill", nr: 2 }, { sel: "tbody tr:nth-child(1) [data-belegdruck]", nr: 3 }, { sel: "tbody tr:nth-child(3) [data-belegstorno]", nr: 4 }] },
  { id: "05-beleg-neu", ...belege({ vorher: async (p, h) => { await h.klick("#belegNeu"); await p.locator(D + " select[name=schueler]").selectOption({ label: "Lena Beispiel" }); await h.tippe(D + " input[name=betrag]", "45,00"); await h.tippe(D + " input[name=zweck]", "Fahrstunden"); }, ...dlgBild(),
    marken: [{ sel: D + " select[name=schueler]", nr: 1 }, { sel: D + " input[name=datum]", nr: 2 }, { sel: D + " input[name=betrag]", nr: 3 }, { sel: D + " input[name=zweck]", nr: 4 }, { sel: D + " fieldset", nr: 5 }] }) },
  { id: "05-beleg-neu-warnung", ...Object.assign(belege({ vorInit: init({ ...VOLL, belegKopf: false }) }), { vorher: async (p, h) => { await h.klick("#belegNeu"); }, ...dlgBild(), marks: 0 }),
    marken: [{ sel: D + " .fl-warnung", nr: 1 }] },
  { id: "05-beleg-pruefen", ...belege({ vorher: async (p, h) => { await h.klick("#belegNeu"); await p.locator(D + " select[name=schueler]").selectOption({ label: "Lena Beispiel" }); await h.tippe(D + " input[name=betrag]", "45,00"); await h.tippe(D + " input[name=zweck]", "Fahrstunden"); await p.locator(D + " button.haupt[type=submit]").click(); await h.warte(900); },
    ausschnitt: { sel: "dialog[open]:has(h2:has-text('Beleg erstellen?'))", rand: 20 } }) },
  { id: "05-beleg-storno", ...belege({ vorher: async (p, h) => { await p.locator("[data-belegstorno]").first().click(); await h.warte(500); await h.tippe(D + " input[name=grund]", "falscher Betrag"); }, ...dlgBild(), marken: [{ sel: D + " input[name=grund]", nr: 1 }] }) },
  { id: "05-schueler-beleg-knopf", url: "#schueler", geraet: "pc", vorInit: init(VOLL), hoehe: 800, ausschnitt: { sel: "tbody tr:nth-child(2)", rand: 10 }, marken: [{ sel: "tbody tr:nth-child(2) [data-sbeleg]", nr: 1 }] },

  /* ---------- Quittung (Druckvorschau aus dem echten Beleg-Text) ---------- */
  { id: "05-quittung-normal", ...belege({ vorher: async (p) => { const html = await p.evaluate(() => belegHTML(S.belege.find((b) => b.nummer === 6))); await htmlBild(p, html, { breite: 760, oben: 0.8, punkte: QP.normal }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 }, hoehe: 1000 }) },
  { id: "05-quittung-storno", ...belege({ vorher: async (p) => { const html = await p.evaluate(() => belegHTML(S.belege.find((b) => b.nummer === 5))); await htmlBild(p, html, { breite: 760, oben: 0.62, punkte: QP.storno }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 }, hoehe: 1000 }) },
  { id: "05-quittung-steuer", ...belege({ vorher: async (p) => { const html = await p.evaluate(() => { const b = Object.assign({}, S.belege.find((x) => x.nummer === 7), { nummer: 8, steuer: { ausweisen: true, satz: "19", hinweis: "Vorführ-Hinweis: Dies ist ein Beispieltext." } }); return belegHTML(b); }); await htmlBild(p, html, { breite: 760, oben: 0.7, punkte: QP.steuer }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 }, hoehe: 1000 }) },
  { id: "05-quittung-schlicht", ...belege({ vorher: async (p) => { const html = await p.evaluate(() => { const b = Object.assign({}, S.belege.find((x) => x.nummer === 7), { nummer: 9, kundennummer: null, schueler_adresse: null, fahrschule_daten: { name: "Fahrschule Boost" }, aussteller: "" }); return belegHTML(b); }); await htmlBild(p, html, { breite: 760, oben: 0.55 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 }, hoehe: 1000 }) },
  { id: "05-einst-belege", url: "#einstellungen?thema=belege", geraet: "pc", vorInit: init(VOLL), hoehe: 1750, ausschnitt: { sel: ".es-inhalt", rand: 10 },
    marken: [{ sel: "#belegEinst input[name=name]", nr: 1 }, { sel: "#belegEinst textarea[name=anschrift]", nr: 2 }, { sel: "#belegEinst input[name=steuernummer]", nr: 3 }, { sel: "#belegEinst input[name=ustid]", nr: 4 }, { sel: "#belegEinst input[name=ausweisen]", nr: 5 }, { sel: "#belegEinst input[name=satz]", nr: 6 }, { sel: "#belegEinst input[name=hinweis]", nr: 7 }, { sel: "#belegEinst input[name=bargeld]", nr: 8 }, { sel: "#belegEinst button[type=submit]", nr: 9 }] },
  { id: "05-einst-bargeld-frage", url: "#einstellungen?thema=belege", geraet: "pc", vorInit: init(VOLL), vorher: async (p, h) => { await p.locator("#belegEinst input[name=bargeld]").check(); await p.locator("#belegEinst button[type=submit]").click(); await h.warte(800); }, ...dlgBild() },

  { id: "05-einst-preise", url: "#einstellungen?thema=preise", geraet: "pc", vorInit: init(VOLL), hoehe: 900, ausschnitt: { sel: ".es-inhalt", rand: 10 }, marken: [{ sel: ".es-inhalt .es-satz", nr: 1 }, { sel: "#esReakt", nr: 2 }] },

  /* ---------- Zahlung offen / Bezahlt ---------- */
  { id: "05-akte-zahlung-sperre", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init({ ...VOLL, sperre: true }), vorher: async (p, h) => { await akte(p, h, "s2"); await p.locator("#zahlBlock").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "#zahlBlock", rand: 14 }, marken: [{ sel: "#zahlBlock [data-zahlungtext]", nr: 1 }, { sel: "#zahlBlock [data-zbezahlt]", nr: 2 }] },
  { id: "05-akte-zahlung-offen-dialog", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init(VOLL), vorher: async (p, h) => { await akte(p, h, "s14"); await p.locator("#zahlBlock [data-zsperre]").click(); await h.warte(500); await p.locator("[data-zgrund]").first().click(); await h.warte(200); }, ausschnitt: { sel: "dialog[open]:has(h2:has-text('Zahlung ausstehend:'))", rand: 20 }, marken: [{ sel: "[data-zgrund]", nr: 1 }, { sel: "dialog[open] input[name=grund]", nr: 2 }] },
  { id: "05-liste-zahlung-ausstehend", url: "#schueler", geraet: "pc", hoehe: 800, vorInit: init({ ...VOLL, sperre: true }), vorher: async (p, h) => { await h.tippe("input[type=search]", "Jonas"); await h.warte(600); }, ausschnitt: { sel: "#ansicht table tbody tr", rand: 10 }, marken: [{ sel: "[data-zahlungpill]", nr: 1 }, { sel: "[data-zbezahlt]", nr: 2 }] },

  /* ---------- Pakete an Schüler ---------- */
  { id: "05-akte-paket-wahl", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init(VOLL), vorher: async (p, h) => { await akte(p, h, "s14"); await p.locator("[data-bk-wahl]").selectOption("v:p-2"); await h.warte(500); await p.locator("[data-bk-anm]").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "[data-bk-anm]", rand: 14 },
    marken: [{ sel: "[data-bk-wahl]", nr: 1 }, { sel: ".bk-anm-posten", nr: 2 }, { sel: ".bk-anm-summe", nr: 3 }, { sel: "[data-bk-anpassen]", nr: 4 }] },
  { id: "05-akte-paket-anpassen", url: "#schueler", geraet: "pc", hoehe: 2300, vorInit: init(VOLL), vorher: async (p, h) => { await akte(p, h, "s14"); await p.locator("[data-bk-wahl]").selectOption("v:p-2"); await h.warte(400); await p.locator("[data-bk-anpassen]").click(); await h.warte(700); }, ausschnitt: { sel: "dialog[open]:has(h2:has-text('Paket für'))", rand: 20 }, marken: [{ sel: "dialog[open]:has(h2:has-text('Paket für')) footer .haupt", nr: 1 }] },
  { id: "05-akte-paket-verkauft", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init(VOLL), vorher: async (p, h) => { await akte(p, h, "s14"); await p.locator("[data-bk-wahl]").selectOption("v:p-2"); await h.warte(400); await p.locator("dialog[open] footer .haupt").click(); await h.warte(1800); await akte(p, h, "s14"); await h.warte(1200); await p.locator("[data-bk-anm]").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "[data-bk-anm]", rand: 14 },
    marken: [{ sel: ".bk-anm-verkauft", nr: 1 }, { sel: ".bk-anm-stand", nr: 2 }, { sel: ".bk-anm-summe", nr: 3 }, { sel: "[data-bk-anpassen]", nr: 4 }] },
  { id: "05-akte-paket-normal", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init(VOLL), vorher: async (p, h) => { await akte(p, h, "s14"); await p.locator("[data-bk-anm]").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "[data-bk-anm]", rand: 14 }, marken: [{ sel: "[data-bk-wahl]", nr: 1 }] },

  /* ---------- Zahlung per Mail ---------- */
  { id: "05-einst-zahlungsdaten", url: "#einstellungen?thema=zahlungen", geraet: "pc", hoehe: 1500, vorInit: init(VOLL), ausschnitt: { sel: "#zmEinst", rand: 10 },
    marken: [{ sel: "#zmEinst .zm-aktuell", nr: 1 }, { sel: "#zmEinst .zm-modus-wahl", nr: 2 }, { sel: "#zmEinst input[name=test_email]", nr: 3 }, { sel: "#zmEinst input[name=kontoinhaber]", nr: 4 }, { sel: "#zmEinst input[name=iban]", nr: 5 }, { sel: "#zmEinst input[name=bic]", nr: 6 }, { sel: "#zmEinst input[name=paypal]", nr: 7 }, { sel: "#zmEinst textarea[name=impressum]", nr: 8 }, { sel: "#zmSpeichern", nr: 9 }] },
  { id: "05-einst-zahlungsdaten-fehler", url: "#einstellungen?thema=zahlungen", geraet: "pc", hoehe: 1500, vorInit: init(VOLL), vorher: async (p, h) => { await h.tippe("#zmEinst input[name=iban]", "DE89 3704 0044 0532 0130 01"); await p.locator("#zmEinst input[name=iban]").blur(); await h.warte(300); }, ausschnitt: { sel: "#zmEinst label:has(input[name=iban])", rand: 14 }, marken: [{ sel: "[data-zmiban]", nr: 1 }] },
  { id: "05-akte-zahlung-keine-daten", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init({ ...VOLL, zahlungsdaten: false, email: true }), vorher: async (p, h) => { await akte(p, h, "s3"); await p.locator("#zmBlock").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "#zmBlock", rand: 14 }, marken: [{ sel: "[data-zmohnedaten]", nr: 1 }] },
  { id: "05-akte-zahlung-mail", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init({ ...VOLL, email: true }), vorher: async (p, h) => { await akte(p, h, "s3"); await p.locator("#zmBlock [data-zmoeffne]").first().click(); await h.warte(400); await p.locator("#zmBlock").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "#zmBlock", rand: 14 },
    marks: 0, marken: [{ sel: "#zmBlock .zm-modus-zeile", nr: 1 }, { sel: "#zmBlock [data-zmart='pruefung'] [data-zmoeffne]", nr: 2 }, { sel: "#zmBlock [data-zmbetrag]", nr: 3 }, { sel: "#zmBlock [data-zmwofuer]", nr: 4 }, { sel: "#zmBlock [data-zmsenden]", nr: 5 }, { sel: "#zmBlock [data-zmart='reaktivierung'] [data-zmoeffne]", nr: 6 }] },
  { id: "05-akte-zahlung-echt", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init({ ...VOLL, zahlungsdaten: "echt", email: true }), vorher: async (p, h) => { await akte(p, h, "s3"); await p.locator("#zmBlock").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "#zmBlock", rand: 14 }, marken: [{ sel: "[data-zmecht]", nr: 1 }] },
  { id: "05-akte-zahlung-wartet", toast: true, url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init({ ...VOLL, email: true }), vorher: async (p, h) => { await p.evaluate(() => { window.ZM_WARTE_MS = 60000; }); await akte(p, h, "s3"); await p.locator("#zmBlock [data-zmoeffne]").first().click(); await h.warte(300); await p.locator("#zmBlock [data-zmsenden]").first().click(); await h.warte(900); }, ausschnitt: { sel: ".zm-toast", rand: 14 } },
  { id: "05-akte-zahlung-gesendet", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init({ ...VOLL, email: true }), vorher: async (p, h) => { await p.evaluate(() => { window.ZM_WARTE_MS = 300; }); await akte(p, h, "s3"); await p.locator("#zmBlock [data-zmoeffne]").first().click(); await h.warte(300); await p.locator("#zmBlock [data-zmsenden]").first().click(); await h.warte(2600); await p.locator("#zmBlock").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "#zmBlock", rand: 14 }, marken: [{ sel: ".zm-haken", nr: 1 }] },
  { id: "05-karte-nach-pruefung", toast: true, url: "#pruefungen", geraet: "pc", hoehe: 800, vorInit: init({ ...VOLL, email: true }), vorher: async (p, h) => { await p.evaluate(() => zmNachPruefung(S.pruefungstermine.find((x) => x.id === "pt-1"))); await h.warte(500); }, ausschnitt: { sel: "#zmKarte", rand: 16 }, marken: [{ sel: "[data-zmksenden]", nr: 1 }, { sel: "[data-zmkzu]", nr: 2 }] },
  { id: "05-akte-erinnerung-mail", url: "#schueler", geraet: "pc", hoehe: 1100, vorInit: init({ ...VOLL, email: true }), vorher: async (p, h) => { await akte(p, h, "s11"); await p.locator("#emBlock").scrollIntoViewIfNeeded(); }, ausschnitt: { sel: "#emBlock", rand: 14 }, marken: [{ sel: "#emBlock .zm-modus-zeile", nr: 1 }, { sel: "[data-emsenden]", nr: 2 }] },

  /* ---------- Punkte ---------- */
  { id: "05-einst-punkte", url: "#einstellungen?thema=punkte", geraet: "pc", hoehe: 1700, vorInit: init({ ...VOLL, punkte: true, verschenken: true }), ausschnitt: { sel: ".es-inhalt", rand: 10 },
    marken: [{ sel: "#punkteEinst .hinweis-kasten", nr: 1 }, { sel: "#punkteEinst input[name=aktiv]", nr: 2 }, { sel: "#punkteEinst .punkte-edit[data-art=regeln]", nr: 3 }, { sel: "#punkteEinst [data-neu=regeln]", nr: 4 }, { sel: "#punkteEinst .punkte-edit[data-art=praemien]", nr: 5 }, { sel: "#punkteEinst input[name=verschenken]", nr: 6 }, { sel: "#punkteEinst textarea[name=bedingungen]", nr: 7 }, { sel: "#punkteEinst button[type=submit]", nr: 8 }] },
  { id: "05-einst-punkte-aus", url: "#einstellungen?thema=punkte", geraet: "pc", hoehe: 1100, vorInit: init(VOLL), ausschnitt: { sel: ".es-inhalt", rand: 10 }, marken: [{ sel: "#punkteEinst input[name=aktiv]", nr: 1 }] },
  { id: "05-punkte-liste", url: "#schueler", geraet: "pc", hoehe: 800, vorInit: init({ ...VOLL, punkte: true, punkteBuchungen: true }), vorher: async (p, h) => { await h.tippe("input[type=search]", "Lena"); await h.warte(600); }, ausschnitt: { sel: "#ansicht table tbody tr", rand: 10 }, marken: [{ sel: "[data-spunkte]", nr: 1 }] },
  { id: "05-punkte-dialog", url: "#schueler", geraet: "pc", hoehe: 1500, vorInit: init({ ...VOLL, punkte: true, punkteBuchungen: true, verschenken: true }), vorher: async (p, h) => { await p.evaluate(() => punkteDialog("s1")); await h.warte(900); }, ...dlgBild(),
    marken: [{ sel: D + " #punkteStand", nr: 1 }, { sel: D + " .punkte-liste", nr: 2 }, { sel: D + " fieldset", nr: 3 }, { sel: D + " select[name=eintrag]", nr: 4 }] },
  { id: "05-punkte-eigene", url: "#schueler", geraet: "pc", hoehe: 1500, vorInit: init({ ...VOLL, punkte: true, punkteBuchungen: true, verschenken: true }), vorher: async (p, h) => { await p.evaluate(() => punkteDialog("s1")); await h.warte(900); await p.locator(D + " input[name=aktion][value=frei]").check(); await h.warte(300); }, ...dlgBild(), marken: [{ sel: D + " input[name=anzahl]", nr: 1 }, { sel: D + " input[name=grund]", nr: 2 }, { sel: D + " #punkteRichtungZeile", nr: 3 }] },

  /* ---------- Drucken ---------- */
  { id: "05-druck-knopf", ...preise({ ausschnitt: { sel: ".kopf-rechts", rand: 20 } }), marken: [{ sel: "#drucken", nr: 1 }, { sel: "#neuLaden", nr: 2 }] },
  { id: "05-druck-vorschau-preise", ...preise({ hoehe: 1250, vorher: async (p) => { await zeigeBild(p, await seiteDruckbild(p), { breite: 760 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } }) },
  { id: "05-druck-vorschau-belege", ...belege({ hoehe: 1250, vorher: async (p) => { await zeigeBild(p, await seiteDruckbild(p), { breite: 760 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } }) },
  { id: "05-druck-vorschau-kalender", url: "#kalender?ansicht=woche", geraet: "pc", vorInit: init(VOLL), hoehe: 900, vorher: async (p) => { await zeigeBild(p, await seiteDruckbild(p), { breite: 1100 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
  { id: "05-druck-team", url: "#team", geraet: "pc", vorInit: init(VOLL), hoehe: 1250, vorher: async (p) => { await zeigeBild(p, await seiteDruckbild(p), { breite: 760, oben: 0.3 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
  { id: "05-druck-handy", url: "#preise", geraet: "handy", vorInit: init(VOLL), ausschnitt: { sel: ".kopf", rand: 10 } },

  { id: "05-druck-monatsbericht-fenster", url: "#zahlen", geraet: "pc", vorInit: init(VOLL), hoehe: 1000, vorher: async (p, h) => { await h.klick("#kMonatsbericht"); await popupBild(p, () => p.locator("dialog[open] footer .haupt").click(), "fenster", { breite: 860, pw: 900, ph: 700 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
  { id: "05-druck-monatsbericht-blatt", url: "#zahlen", geraet: "pc", vorInit: init(VOLL), hoehe: 1250, vorher: async (p, h) => { await h.klick("#kMonatsbericht"); await popupBild(p, () => p.locator("dialog[open] footer .haupt").click(), "blatt", { breite: 760 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
  { id: "05-druck-anwesenheit-fenster", url: "#heute", geraet: "pc", vorInit: init(VOLL), hoehe: 1000, vorher: async (p) => { await popupBild(p, () => p.evaluate(() => druckeAnwesenheit("2026-11-29", "7", { fahrlehrer_id: "fl-1", von: "18:00", bis: "21:15" })), "fenster", { breite: 860, pw: 900, ph: 700 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
  { id: "05-druck-anwesenheit-blatt", url: "#heute", geraet: "pc", vorInit: init(VOLL), hoehe: 1250, vorher: async (p) => { await popupBild(p, () => p.evaluate(() => druckeAnwesenheit("2026-11-29", "7", { fahrlehrer_id: "fl-1", von: "18:00", bis: "21:15" })), "blatt", { breite: 760, oben: 0.5 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
  { id: "05-druck-qr-blatt", url: "#heute", geraet: "pc", vorInit: init({ ...VOLL, lehrerSlug: true }), hoehe: 1250, vorher: async (p, h) => { await p.evaluate(() => luBuchungsDialog("fl-1")); await h.warte(600); await popupBild(p, () => p.locator("[data-luqrdruck]").click(), "blatt", { breite: 760, oben: 0.6 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
  { id: "05-druck-nachweis-blatt", url: "#heute", geraet: "pc", vorInit: init(VOLL), hoehe: 1250, vorher: async (p, h) => { await p.evaluate(() => nachweisDialog("s1")); await h.warte(1800); await popupBild(p, () => p.locator("dialog[open] footer .haupt").click(), "blatt", { breite: 760, oben: 0.6 }); }, ausschnitt: { sel: "#hbVorschau", rand: 0 } },
];

// Marken im Fenster: Fenster liegen über allem, darum müssen die roten Rahmen IM Fenster gezeichnet werden
async function markenImFenster(p, liste) {
  const rects = [];
  for (const m of liste) {
    const loc = p.locator(m.sel).first();
    if (!(await loc.count())) { console.log(`   ! Marke ${m.nr} nicht gefunden: ${m.sel}`); continue; }
    const r = await loc.boundingBox();
    if (!r) { console.log(`   ! Marke ${m.nr} unsichtbar: ${m.sel}`); continue; }
    rects.push({ nr: m.nr, x: r.x, y: r.y, w: r.width, h: r.height });
  }
  await p.evaluate((rects) => {
    const dlgs = [...document.querySelectorAll("dialog[open]")];
    const host = dlgs[dlgs.length - 1];
    const cs = getComputedStyle(host);
    const off = cs.transform && cs.transform !== "none" ? host.getBoundingClientRect() : { x: 0, y: 0 };
    for (const r of rects) {
      const box = document.createElement("div");
      Object.assign(box.style, { position: "fixed", left: r.x - 4 - off.x + "px", top: r.y - 4 - off.y + "px", width: r.w + 8 + "px", height: r.h + 8 + "px", border: "3px solid #d6202a", borderRadius: "10px", zIndex: 99999, pointerEvents: "none", boxShadow: "0 0 0 2px rgba(255,255,255,.85)" });
      host.appendChild(box);
      const n = document.createElement("div");
      n.textContent = r.nr;
      Object.assign(n.style, { position: "fixed", left: Math.max(2, r.x - 4 - 15) - off.x + "px", top: Math.max(2, r.y - 4 - 15) - off.y + "px", width: "26px", height: "26px", borderRadius: "50%", background: "#d6202a", color: "#fff", font: "700 15px/26px Arial,sans-serif", textAlign: "center", zIndex: 100000, pointerEvents: "none", boxShadow: "0 0 0 2px #fff" });
      host.appendChild(n);
    }
  }, rects);
}

export const _init = init;
export default LISTE.map((b) => {
  const neu = { ...b };
  neu.vorher = async (p, h) => {
    if (b.ausschnitt) await p.addStyleTag({ content: ".rollen-streifen{display:none !important}" + (b.toast ? "" : " .toast:not(.zm-karte){display:none !important}") });
    if (b.vorher) await b.vorher(p, h);
    if (b.marken && b.marken.length && (await p.locator("dialog[open]").count())) { await markenImFenster(p, b.marken); neu.marken = []; }
  };
  return neu;
});
