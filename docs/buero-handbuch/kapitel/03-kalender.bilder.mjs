// Kapitel 3: Kalender und Termine (nur erfundene Vorführ-Daten)
const KAL = "#kalender";
// kleine Helfer, die in mehreren Bildern gebraucht werden
const DLG = "dialog[open]";
const oeffneNeu = async (page, h, v = {}) => {
  await h.klick("#kNeuTermin");
  if (v.art) await page.locator(`${DLG} select[name=art]`).selectOption(v.art);
  if (v.lehrer) await page.locator(`${DLG} select[name=fahrlehrer_id]`).selectOption(v.lehrer);
  if (v.von) await page.locator(`${DLG} input[name=von]`).fill(v.von);
  if (v.bis) await page.locator(`${DLG} input[name=bis]`).fill(v.bis);
  if (v.datum) await page.locator(`${DLG} input[name=datum]`).fill(v.datum);
  await page.waitForTimeout(250);
};
// Die Vorführ-Datenbank kennt die neuen Büro-Spalten noch nicht: für das Bild eintragen (nur im Browser, nichts wird gespeichert)
const spaltenDa = (page) => page.evaluate(() => { for (const t of S.termine) { if (!("interessent_name" in t)) { t.interessent_name = null; t.interessent_telefon = null; t.kurs_bezahlt = false; } } });
// ein Termin von heute bei einem Fahrlehrer
const heuteTermin = (page, lid, nr = 0) => page.evaluate(([lid, nr]) => { const l = S.termine.filter((t) => t.datum === KR.todayISO() && t.fahrlehrer_id === lid && t.art !== "block").sort((a, b) => a.von.localeCompare(b.von)); return l[nr] ? { id: l[nr].id, von: l[nr].von, bis: l[nr].bis, fz: l[nr].fahrzeug } : null; }, [lid, nr]);

const LISTE = [
  // ---------- Überblick, Kopf, Knöpfe ----------
  { id: "03-kalender-tag", url: KAL, geraet: "pc", hoehe: 900,
    marken: [{ sel: "#ansicht .tabs", nr: 1 }, { sel: "#ansicht .k-titel", nr: 2 }, { sel: "#ansicht .knopfreihe", nr: 3 }, { sel: "#kDatum", nr: 4 }, { sel: "#kSuche", nr: 5 }, { sel: "#ansicht .chips >> nth=0", nr: 6 }, { sel: ".k-art-filter", nr: 7 }, { sel: "#kopfAktionen", nr: 8 }] },
  { id: "03-kopfknoepfe", url: KAL, geraet: "pc", marken: [{ sel: "#kPlatz", nr: 1 }, { sel: "#kUrlaub", nr: 2 }, { sel: "#kNeuTermin", nr: 3 }], ausschnitt: { sel: "#kopfAktionen", rand: 14 } },
  { id: "03-tag-kopf", url: KAL, geraet: "pc", marken: [{ sel: "#ansicht .knopfreihe button >> nth=0", nr: 1 }, { sel: "#ansicht .knopfreihe button >> nth=2", nr: 1 }, { sel: "#ansicht .knopfreihe button >> nth=1", nr: 2 }, { sel: "#kDatum", nr: 3 }], ausschnitt: { sel: "#ansicht .karte", rand: 0, maxHoehe: 190 }, hoehe: 900 },
  { id: "03-tag-spalten", url: KAL, geraet: "pc", hoehe: 900, marken: [{ sel: ".k-kopf >> nth=0", nr: 1 }, { sel: ".k-stunde >> nth=1", nr: 2 }, { sel: ".k-termin >> nth=0", nr: 3 }], ausschnitt: { sel: ".kalender", rand: 8, maxHoehe: 520 } },
  { id: "03-terminkarte", url: KAL, geraet: "pc", hoehe: 900, marken: [{ sel: ".k-termin >> nth=0", nr: 1 }], ausschnitt: { sel: ".k-termin >> nth=0", rand: 16 } },
  { id: "03-heute-springen", url: KAL + "?tag=2026-12-15", geraet: "pc", marken: [], ausschnitt: { sel: "#ansicht .karte", rand: 0, maxHoehe: 190 }, hoehe: 900 },
  { id: "03-datum-springen", url: KAL, geraet: "pc", marken: [], ausschnitt: { sel: "#ansicht .filterzeile", rand: 10 }, hoehe: 900 },
  { id: "03-suche", url: KAL, geraet: "pc", hoehe: 900, marken: [{ sel: "#kSuche", nr: 1 }, { sel: ".k-suche-erg", nr: 2 }],
    vorher: async (page, h) => { await h.tippe("#kSuche", "a"); await page.waitForTimeout(900); }, ausschnitt: { sel: "#ansicht .filterzeile", rand: 20, maxHoehe: 900 } },

  // ---------- Ansichten ----------
  { id: "03-ansicht-woche", url: KAL + "?ansicht=woche", geraet: "pc", hoehe: 900, marken: [{ sel: "#ansicht .tabs", nr: 1 }, { sel: "#kWoLehrer", nr: 2 }, { sel: ".k-spalte.heute", nr: 3 }, { sel: "#ansicht .k-titel", nr: 4 }] },
  { id: "03-woche-lehrer", url: KAL + "?ansicht=woche", geraet: "pc", marken: [], ausschnitt: { sel: "#ansicht .filterzeile >> nth=1", rand: 10 }, hoehe: 900 },
  { id: "03-ansicht-monat", url: KAL + "?ansicht=monat", geraet: "pc", hoehe: 900, marken: [] },
  { id: "03-monat-zelle", url: KAL + "?ansicht=monat", geraet: "pc", hoehe: 900, marken: [{ sel: ".m-nr >> nth=10", nr: 1 }, { sel: ".m-anz >> nth=10", nr: 2 }, { sel: ".m-ue >> nth=10", nr: 3 }], ausschnitt: { sel: ".m-raster", rand: 6, maxHoehe: 300 } },
  { id: "03-ansicht-jahr", url: KAL + "?ansicht=jahr", geraet: "pc", hoehe: 900, marken: [{ sel: ".j-titel >> nth=11", nr: 1 }, { sel: ".j-tag.heute", nr: 2 }], ganzeSeite: true },
  
  // ---------- Filter ----------
  { id: "03-filter-lehrer", url: KAL + "?lehrer=fl-1,fl-2", geraet: "pc", hoehe: 900, marken: [], ausschnitt: { sel: "#ansicht .karte", rand: 8, maxHoehe: 700 } },
  { id: "03-filter-lehrer-chips", url: KAL + "?lehrer=fl-1,fl-2", geraet: "pc", hoehe: 900, marken: [{ sel: "[data-klehrer=fl-1]", nr: 1 }, { sel: "[data-klehrer=fl-3]", nr: 2 }], ausschnitt: { sel: "#ansicht .chips >> nth=0", rand: 10 } },
  { id: "03-filter-arten-zu", url: KAL, geraet: "pc", hoehe: 900, marken: [{ sel: ".k-art-filter summary", nr: 1 }], ausschnitt: { sel: ".k-art-filter", rand: 20 } },
  { id: "03-filter-arten-offen", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick(".k-art-filter summary"); }, marken: [{ sel: "[data-kartalle]", nr: 3 }, { sel: "[data-kart=simulator]", nr: 2 }, { sel: ".k-art-nb >> nth=0", nr: 5 }], ausschnitt: { sel: ".k-art-filter", rand: 3 } },
  { id: "03-filter-arten-gewaehlt", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick(".k-art-filter summary"); await h.klick("[data-kart=sonder]"); await h.klick("[data-kart=pruefung]"); }, marken: [{ sel: ".k-art-aktiv", nr: 4 }], ausschnitt: { sel: ".k-art-filter", rand: 3 } },

  // ---------- Termin anlegen ----------
  { id: "03-termin-neu-klick", url: KAL, geraet: "pc", hoehe: 900, marken: [{ sel: ".k-flaeche >> nth=2", nr: 1 }], ausschnitt: { sel: ".kalender", rand: 6, maxHoehe: 460 } },
  { id: "03-termin-neu-dialog", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await oeffneNeu(page, h); },
    marken: [{ sel: `${DLG} select[name=schueler_id]`, nr: 2 }, { sel: `${DLG} select[name=art]`, nr: 3 }, { sel: `${DLG} select[name=fahrlehrer_id]`, nr: 4 }, { sel: `${DLG} input[name=datum]`, nr: 5 }, { sel: `${DLG} select[name=fahrzeug]`, nr: 6 }, { sel: `${DLG} input[name=von]`, nr: 7 }, { sel: `${DLG} input[name=bis]`, nr: 8 }, { sel: `${DLG} footer button[value=ok]`, nr: 9 }],
    ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-neu-gespeichert", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => {
      await oeffneNeu(page, h, { von: "17:45", bis: "19:15" });
      await page.locator(`${DLG} select[name=schueler_id]`).selectOption({ index: 3 });
      await page.locator(`${DLG} select[name=fahrzeug]`).selectOption({ index: 1 });
      await h.klick(`${DLG} footer button[value=ok]`, { warte: 900 });
    }, marken: [{ sel: "#toast", nr: 10 }], ausschnitt: { sel: "#toast", rand: 30 } },
  { id: "03-termin-art-liste", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await oeffneNeu(page, h); await page.evaluate(() => { const s = document.querySelector("dialog[open] select[name=art]"); s.size = 12; s.style.height = "auto"; }); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-simulator", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await oeffneNeu(page, h, { art: "simulator" }); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }, { sel: "#nurBueroHinweis", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-vortest", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await oeffneNeu(page, h, { art: "vortest" }); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }, { sel: "#nurBueroHinweis", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-mpu", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await oeffneNeu(page, h, { art: "mpu" }); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }, { sel: "#nurBueroHinweis", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-beratung", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await spaltenDa(page); await oeffneNeu(page, h, { art: "beratung" }); await page.locator(`${DLG} input[name=interessent_name]`).fill("Max Muster"); await page.locator(`${DLG} input[name=interessent_telefon]`).fill("0170 0000000"); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }, { sel: "#nurBueroHinweis", nr: 2 }, { sel: "#beratungFeld", nr: 3 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-ersthilfe", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await spaltenDa(page); await oeffneNeu(page, h, { art: "ersthilfe" }); await page.locator(`${DLG} input[name=kurs_bezahlt]`).check(); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }, { sel: "#kursBezahltFeld", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-sonder-ohneapp", url: KAL, geraet: "pc", hoehe: 1100,
    vorher: async (page, h) => { await oeffneNeu(page, h, { art: "sonder", lehrer: "fl-4" }); await page.locator(`${DLG} select[name=schueler_id]`).selectOption({ index: 2 }); await page.waitForTimeout(300); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }, { sel: `${DLG} select[name=fahrlehrer_id]`, nr: 2 }, { sel: "#ohneAppFeld", nr: 3 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-block", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await oeffneNeu(page, h, { art: "block", von: "12:00", bis: "13:00" }); },
    marken: [{ sel: `${DLG} select[name=art]`, nr: 3 }], ausschnitt: { sel: DLG, rand: 10 } },
];

// Fenster liegen über der Seite: Marken müssen ins Fenster selbst (sonst verdeckt das Fenster sie)
const dlgMarken = (page, liste) => page.evaluate((liste) => {
  const dlg = [...document.querySelectorAll("dialog[open]")].pop();
  if (!dlg) return;
  const dr = dlg.getBoundingClientRect();
  for (const m of liste) {
    const el = dlg.querySelector(m.sel.replace(/^dialog\[open\]\s*/, ""));
    if (!el || !el.getBoundingClientRect().width) { console.log("Marke fehlt " + m.sel); continue; }
    const r = el.getBoundingClientRect(), pad = 4;
    const x = r.left - dr.left - pad, y = r.top - dr.top - pad;
    const box = document.createElement("div");
    Object.assign(box.style, { position: "absolute", left: x + "px", top: y + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px", border: "3px solid #d6202a", borderRadius: "10px", zIndex: 99, pointerEvents: "none", boxShadow: "0 0 0 2px rgba(255,255,255,.85)" });
    dlg.appendChild(box);
    const n = document.createElement("div");
    n.textContent = m.nr;
    Object.assign(n.style, { position: "absolute", left: Math.max(2, x - 11) + "px", top: Math.max(2, y - 11) + "px", width: "26px", height: "26px", borderRadius: "50%", background: "#d6202a", color: "#fff", font: "700 15px/26px Arial, sans-serif", textAlign: "center", zIndex: 100, pointerEvents: "none", boxShadow: "0 0 0 2px #fff" });
    dlg.appendChild(n);
  }
}, liste);
const dlgWrap = (b) => {
  if (!b.ausschnitt || ![DLG, LAST].includes(b.ausschnitt.sel) || !b.marken) return b;
  const m = b.marken, v = b.vorher;
  return Object.assign({}, b, { marken: [], vorher: async (page, h) => { if (v) await v(page, h); await page.waitForTimeout(200); await dlgMarken(page, m); } });
};
const LAST = "body > dialog:last-of-type";
const oeffneId = (page, h, id) => page.evaluate((id) => terminDialog(id), id).then(() => page.waitForTimeout(500));
const schuelerNr = async (page, id) => page.evaluate((id) => S.schueler.find((x) => x.id === id).name, id);
const waehleSchueler = async (page, name) => { const v = await page.evaluate((name) => [...document.querySelectorAll("dialog[open] select[name=schueler_id] option")].find((o) => o.textContent.includes(name)).value, name); await page.locator("dialog[open] select[name=schueler_id]").selectOption(v); await page.waitForTimeout(250); };
const speichern = (h) => h.klick(`${DLG} footer button[value=ok]`, { warte: 800 });
// Nur-Büro-Termine für die Bilder in den Kalender legen (nur im Browser)
const bueroTermine = (page) => page.evaluate(() => {
  const heute = KR.todayISO();
  const mk = (id, l, art, von, bis, extra) => S.termine.push(Object.assign({ id, fahrschule_id: S.fsId, fahrlehrer_id: l, schueler_id: null, datum: heute, von, bis, art, fahrzeug: "", status: "geplant", geloescht: false, payload: {}, interessent_name: null, interessent_telefon: null, kurs_bezahlt: false }, extra || {}));
  S.termine = S.termine.filter((t) => !(t.datum === heute && ["fl-1", "fl-3"].includes(t.fahrlehrer_id)));
  mk("bx1", "fl-1", "simulator", "08:00", "09:30", { schueler_id: "s3" });
  mk("bx2", "fl-1", "beratung", "10:00", "10:45", { interessent_name: "Max Muster", interessent_telefon: "0170 0000000" });
  mk("bx3", "fl-1", "vortest", "13:00", "14:00", { schueler_id: "s4" });
  mk("bx4", "fl-3", "mpu", "09:00", "10:30", { schueler_id: "s5" });
  mk("bx5", "fl-3", "ersthilfe", "13:00", "17:00", { kurs_bezahlt: true });
  mk("bx6", "fl-3", "block", "11:00", "12:00", {});
  zeichne();
});
const urlaubEintragen = async (page, h, wer = "fl-1") => {
  await h.geh("#urlaub");
  await h.klick("#vwUrlaubNeu");
  await page.locator(`${DLG} select[name=wer]`).selectOption(wer);
  await h.klick(`${DLG} footer button[value=ok]`, { warte: 900 });
};

const LISTE2 = [
  // ---------- Termin bearbeiten ----------
  { id: "03-termin-bearbeiten", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 0); await oeffneId(page, h, t.id); },
    marken: [{ sel: "select[name=schueler_id]", nr: 1 }, { sel: "input[name=datum]", nr: 2 }, { sel: "input[name=von]", nr: 3 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-verschieben", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 0); await oeffneId(page, h, t.id); await page.locator(`${DLG} input[name=datum]`).fill("2026-12-03"); await page.locator(`${DLG} input[name=von]`).fill("14:00"); await page.locator(`${DLG} input[name=bis]`).fill("15:30"); await page.locator(`${DLG} select[name=fahrlehrer_id]`).selectOption("fl-3"); },
    marken: [{ sel: "select[name=fahrlehrer_id]", nr: 4 }, { sel: "input[name=datum]", nr: 2 }, { sel: "input[name=von]", nr: 3 }, { sel: "input[name=bis]", nr: 5 }, { sel: "footer button[value=ok]", nr: 6 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-absagen-haken", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 2); await oeffneId(page, h, t.id); await page.locator(`${DLG} [name=absagen]`).check(); },
    marken: [{ sel: "[name=absagen]", nr: 1 }, { sel: "footer button[value=ok]", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-absagen-rueckgaengig", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 2); await oeffneId(page, h, t.id); await page.locator(`${DLG} [name=absagen]`).check(); await speichern(h); }, marken: [{ sel: ".toast-undo [data-undo]", nr: 3 }], ausschnitt: { sel: ".toast-undo", rand: 14 } },
  { id: "03-papierkorb", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 2); await oeffneId(page, h, t.id); await page.locator(`${DLG} [name=absagen]`).check(); await speichern(h); await page.waitForTimeout(1500); await page.evaluate(() => { const d = document.querySelector("#pkKarte"); if (d) d.open = true; }); await h.scrolle("#buPapierkorb"); },
    marken: [{ sel: "#pkKarte summary", nr: 4 }], ausschnitt: { sel: "#buPapierkorb", rand: 12, maxHoehe: 500 } },
  { id: "03-termin-link", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 0); await oeffneId(page, h, t.id); },
    marken: [{ sel: ".k-link-zeile", nr: 1 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-link-offen", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 1); await h.geh("#termin=" + t.id); await page.waitForTimeout(1200); },
    marken: [], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-link-weg", url: KAL, geraet: "pc", hoehe: 700,
    vorher: async (page, h) => { await h.geh("#termin=gibtsnicht"); await page.waitForTimeout(1500); },
    ausschnitt: { sel: DLG, rand: 10 } },

  // ---------- Warnungen und Sperren ----------
  { id: "03-konflikt-frage", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-1", 0); await oeffneNeu(page, h, { lehrer: "fl-1", von: t.von, bis: t.bis }); await speichern(h); await page.waitForTimeout(500); },
    ausschnitt: { sel: LAST, rand: 10 } },
  { id: "03-konflikt-zeichen", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page) => { await page.evaluate(() => { const t = S.termine.find((x) => x.datum === KR.todayISO() && x.fahrlehrer_id === "fl-1" && x.art === "fahrstunde"); S.termine.push(Object.assign({}, t, { id: "dbl1", von: t.von, bis: t.bis, schueler_id: "s9" })); zeichne(); }); },
    marken: [{ sel: ".kf-ueber >> nth=0", nr: 1 }, { sel: ".kf-zeichen >> nth=0", nr: 2 }], ausschnitt: { sel: ".k-spalte >> nth=0", rand: 24, maxHoehe: 420 } },
  { id: "03-urlaub-frage", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await urlaubEintragen(page, h, "fl-1"); await h.geh("#kalender"); await oeffneNeu(page, h, { lehrer: "fl-1" }); await speichern(h); await page.waitForTimeout(600); },
    ausschnitt: { sel: LAST, rand: 10 } },
  { id: "03-zahlung-karte", url: KAL, geraet: "pc", hoehe: 900,
    marken: [{ sel: ".k-termin.gesperrt >> nth=0", nr: 1 }], ausschnitt: { sel: ".k-spalte >> nth=0", rand: 6, maxHoehe: 400 } },
  { id: "03-zahlung-sperre", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await oeffneNeu(page, h); await waehleSchueler(page, "Hanna Beispiel"); await speichern(h); },
    marken: [{ sel: "#zahlHinweis", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-umschreiber-sonder", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await oeffneNeu(page, h, { art: "sonder" }); await waehleSchueler(page, await schuelerNr(page, "s11")); },
    marken: [{ sel: "#umSfHinweis", nr: 3 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-stopp-notiz", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await page.evaluate(() => { S.notizen.push({ id: "nx1", schueler_id: "s2", art: "stopp", text: "Erst Rechnung klären", erledigt_am: null, erstellt_am: new Date().toISOString() }); }); await oeffneNeu(page, h, { von: "17:45", bis: "19:15" }); await waehleSchueler(page, await schuelerNr(page, "s2")); await speichern(h); await page.waitForTimeout(500); },
    ausschnitt: { sel: LAST, rand: 10 } },
  { id: "03-vergangen-unterschrieben", url: KAL, geraet: "pc", hoehe: 1100,
    vorher: async (page, h) => { const id = await page.evaluate(() => S.termine.find((t) => t.payload && t.payload.signed && t.art !== "block").id); await oeffneId(page, h, id); },
    marken: [{ sel: `${DLG} .fl-warnung:visible`, nr: 1 }, { sel: "[name=absagen]", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-termin-theorie", url: KAL, geraet: "pc", hoehe: 1100,
    vorher: async (page, h) => { const id = await page.evaluate(() => { const z = S.theorie.find((x) => x.lektion); S.termine.push({ id: "th1", fahrschule_id: S.fsId, fahrlehrer_id: "fl-1", schueler_id: null, datum: z.datum, von: "18:00", bis: "19:30", art: "theorie", fahrzeug: "", status: "geplant", geloescht: false, payload: { lektion: String(z.lektion) } }); return "th1"; }); await oeffneId(page, h, id); },
    marken: [{ sel: ".anwesenheit", nr: 1 }, { sel: "[data-anwdruck]", nr: 2 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-vergangen-heute-stornieren", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { const t = await heuteTermin(page, "fl-2", 0); await oeffneId(page, h, t.id); await page.locator(`${DLG} [name=absagen]`).check(); await speichern(h); await page.waitForTimeout(700); },
    ausschnitt: { sel: LAST, rand: 10 } },
  { id: "03-vergangen-stornieren", url: KAL, geraet: "pc", hoehe: 1100,
    vorher: async (page, h) => { const id = await page.evaluate(() => S.termine.find((t) => t.payload && t.payload.signed && t.art !== "block").id); await oeffneId(page, h, id); await page.locator(`${DLG} [name=absagen]`).check(); await speichern(h); await page.waitForTimeout(700); },
    ausschnitt: { sel: LAST, rand: 10 } },
  { id: "03-vergangen-bueroart", url: KAL, geraet: "pc", hoehe: 1100,
    vorher: async (page, h) => { const id = await page.evaluate(() => S.termine.find((t) => t.payload && t.payload.signed && t.art !== "block").id); await oeffneId(page, h, id); await page.locator(`${DLG} select[name=art]`).selectOption("simulator"); await speichern(h); await page.waitForTimeout(400); },
    marken: [{ sel: "#toast", nr: 3 }], ausschnitt: { sel: "#toast", rand: 14 } },
  { id: "03-pruefung-im-kalender", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page) => { await page.evaluate(() => { S.termine.push({ id: "tp1", fahrschule_id: S.fsId, fahrlehrer_id: "fl-1", schueler_id: "s3", datum: KR.todayISO(), von: "12:30", bis: "14:00", art: "pruefung", fahrzeug: "", status: "geplant", geloescht: false, payload: { pruefungstermin_id: "pt-1" } }); const p = S.pruefungstermine.find((x) => x.id === "pt-1"); p.datum = KR.todayISO(); p.kalender_termin_id = "tp1"; zeichne(); }); },
    marken: [{ sel: ".k-termin[data-termin=tp1]", nr: 1 }], ausschnitt: { sel: ".k-spalte >> nth=0", rand: 20, maxHoehe: 700 } },
  { id: "03-pruefung-dialog", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await page.evaluate(() => { S.termine.push({ id: "tp1", fahrschule_id: S.fsId, fahrlehrer_id: "fl-1", schueler_id: "s3", datum: KR.todayISO(), von: "12:30", bis: "14:00", art: "pruefung", fahrzeug: "", status: "geplant", geloescht: false, payload: { pruefungstermin_id: "pt-1" } }); const p = S.pruefungstermine.find((x) => x.id === "pt-1"); p.datum = KR.todayISO(); p.kalender_termin_id = "tp1"; zeichne(); }); await oeffneId(page, h, "tp1"); },
    marken: [{ sel: "#spiegelHinweis", nr: 2 }, { sel: "[data-zurtafel]", nr: 3 }, { sel: "select[name=fahrzeug]", nr: 4 }], ausschnitt: { sel: DLG, rand: 10 } },

  // ---------- Büro-Terminarten im Kalender ----------
  { id: "03-bueroarten-kalender", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page) => { await bueroTermine(page); },
    marken: [{ sel: ".k-termin[data-termin=bx1]", nr: 4 }, { sel: ".k-termin[data-termin=bx2]", nr: 5 }, { sel: ".k-termin[data-termin=bx3]", nr: 6 }, { sel: ".k-termin[data-termin=bx4]", nr: 7 }, { sel: ".k-termin[data-termin=bx5]", nr: 8 }, { sel: ".k-termin[data-termin=bx6]", nr: 9 }], ausschnitt: { sel: ".kalender", rand: 6, maxHoehe: 560 } },
  { id: "03-bueroarten-filter", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await bueroTermine(page); await h.klick(".k-art-filter summary"); await h.klick("[data-kart=simulator]"); await h.klick("[data-kart=beratung]"); },
    marken: [], ausschnitt: { sel: "#ansicht .karte", rand: 6, maxHoehe: 560 } },
  { id: "03-bueroarten-beratung-dialog", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await bueroTermine(page); await oeffneId(page, h, "bx2"); },
    marken: [], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-art-farben", url: KAL, geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick(".k-art-filter summary"); },
    marken: [], ausschnitt: { sel: ".k-art-filter .chips", rand: 8 } },
  
  // ---------- Handy ----------
  { id: "03-handy-tag", url: KAL, geraet: "handy", marken: [{ sel: "#ansicht .tabs", nr: 1 }, { sel: "#ansicht .k-titel", nr: 2 }] },
  { id: "03-handy-woche", url: KAL + "?ansicht=woche", geraet: "handy", marken: [] },
  { id: "03-handy-monat", url: KAL + "?ansicht=monat", geraet: "handy", marken: [] },
  { id: "03-handy-termin", url: KAL, geraet: "handy", hoehe: 915,
    vorher: async (page, h) => { await h.klick("#kNeuTermin"); }, ausschnitt: { sel: DLG, rand: 4 } },

  // ---------- Wer hat Platz? ----------
  { id: "03-auslastung", url: "#auslastung", geraet: "pc", hoehe: 1000, marken: [{ sel: ".kacheln .kachel >> nth=0", nr: 1 }, { sel: ".kacheln .kachel >> nth=1", nr: 2 }, { sel: ".kacheln .kachel >> nth=2", nr: 3 }, { sel: ".karte .karte-kopf .knopf", nr: 4 }] },
  { id: "03-auslastung-tabelle", url: "#auslastung", geraet: "pc", hoehe: 1000, marken: [{ sel: ".tabelle thead th >> nth=0", nr: 1 }, { sel: ".tabelle thead th >> nth=1", nr: 2 }, { sel: ".tabelle thead th >> nth=2", nr: 3 }, { sel: ".tabelle thead th >> nth=5", nr: 4 }], ausschnitt: { sel: ".tabelle", rand: 10 } },
  { id: "03-auslastung-reiter", url: "#auslastung", geraet: "pc", marks: [], marken: [{ sel: ".plan-reiter .tab >> nth=0", nr: 1 }, { sel: ".plan-reiter .tab >> nth=1", nr: 2 }, { sel: ".plan-reiter .tab >> nth=2", nr: 3 }], ausschnitt: { sel: ".plan-reiter", rand: 12 } },
  { id: "03-auslastung-regel", url: "#auslastung", geraet: "pc", hoehe: 1000, marken: [{ sel: ".karte > p.leise", nr: 5 }], ausschnitt: { sel: ".karte > p.leise", rand: 12 } },
  { id: "03-auslastung-ohne-lehrer", url: "#auslastung", geraet: "pc", hoehe: 1000, marken: [], ausschnitt: { sel: ".karte .karte-kopf", rand: 12 } },
  { id: "03-handy-auslastung", url: "#auslastung", geraet: "handy" },

  // ---------- Urlaub ----------
  { id: "03-urlaub-leer", url: "#urlaub", geraet: "pc", hoehe: 800, marken: [{ sel: "#vwUrlaubNeu", nr: 5 }] },
  { id: "03-urlaub-dialog", url: "#urlaub", geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick("#vwUrlaubNeu"); await page.locator(`${DLG} select[name=wer]`).selectOption("fl-2"); },
    marken: [{ sel: "select[name=wer]", nr: 1 }, { sel: "input[name=von]", nr: 2 }, { sel: "input[name=bis]", nr: 3 }, { sel: "footer button[value=ok]", nr: 4 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-urlaub-andere", url: "#urlaub", geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick("#vwUrlaubNeu"); await page.locator(`${DLG} select[name=wer]`).selectOption("_andere"); await page.locator(`${DLG} input[name=name]`).fill("Max Muster"); },
    marken: [{ sel: "input[name=name]", nr: 6 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-urlaub-liste", url: "#urlaub", geraet: "pc", hoehe: 800,
    vorher: async (page, h) => { await urlaubEintragen(page, h, "fl-2"); await page.waitForTimeout(500); },
    marken: [{ sel: ".vw-liste td >> nth=0", nr: 7 }, { sel: ".vw-liste td >> nth=1", nr: 8 }], ausschnitt: { sel: "#ansicht .karte", rand: 8 } },
  { id: "03-urlaub-loeschen", url: "#urlaub", geraet: "pc", hoehe: 800,
    vorher: async (page, h) => { await urlaubEintragen(page, h, "fl-2"); await page.waitForTimeout(500); await h.klick("[data-vwurlaubweg]"); }, marken: [{ sel: ".toast-undo [data-undo]", nr: 1 }], ausschnitt: { sel: ".toast-undo", rand: 14 } },
  { id: "03-urlaub-gestern", url: "#urlaub", geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick("#vwUrlaubNeu"); await page.locator(`${DLG} select[name=wer]`).selectOption("fl-2"); await page.locator(`${DLG} input[name=von]`).fill("2026-11-20"); await page.locator(`${DLG} input[name=bis]`).fill("2026-11-25"); await speichern(h); },
    marken: [], ausschnitt: { sel: "#toast", rand: 14 } },

  // ---------- Schichtplan ----------
  { id: "03-schichtplan", url: "#schichtplan", geraet: "pc", hoehe: 1000, marken: [{ sel: ".vw-plan tr.heute", nr: 1 }, { sel: "[data-vwschichtneu] >> nth=1", nr: 2 }, { sel: ".plan-reiter", nr: 3 }] },
  { id: "03-schicht-dialog", url: "#schichtplan", geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick("[data-vwschichtneu] >> nth=1"); await page.locator(`${DLG} input[name=name]`).fill("Mia Muster"); await page.locator(`${DLG} select[name=status]`).selectOption("krank"); await page.locator(`${DLG} input[name=notiz]`).fill("bis Freitag"); },
    marken: [{ sel: "input[name=name]", nr: 4 }, { sel: "select[name=status]", nr: 5 }, { sel: "input[name=notiz]", nr: 6 }, { sel: "footer button[value=ok]", nr: 7 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-schicht-liste", url: "#schichtplan", geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => {
      for (const [i, st] of [[1, "arbeitet"], [1, "frei"], [2, "krank"]]) { await h.klick(`[data-vwschichtneu] >> nth=${i}`); await page.locator(`${DLG} input[name=name]`).fill(["Mia Muster", "Noah Muster", "Paula Muster"][[1, 1, 2].indexOf(i) + (st === "frei" ? 1 : 0)] || "Mia Muster"); await page.locator(`${DLG} select[name=status]`).selectOption(st); await speichern(h); await page.waitForTimeout(400); }
    },
    marken: [{ sel: ".vw-schicht >> nth=0", nr: 8 }, { sel: "[data-vwschichtweg] >> nth=0", nr: 9 }], ausschnitt: { sel: ".vw-plan", rand: 8, maxHoehe: 520 } },
  { id: "03-schicht-loeschen", url: "#schichtplan", geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await h.klick("[data-vwschichtneu] >> nth=1"); await page.locator(`${DLG} input[name=name]`).fill("Mia Muster"); await speichern(h); await page.waitForTimeout(500); await h.klick("[data-vwschichtweg]"); },
    marken: [{ sel: ".toast-undo [data-undo]", nr: 10 }], ausschnitt: { sel: ".toast-undo", rand: 14 } },

  // ---------- Fahrzeuge ----------
  { id: "03-flotte", url: "#flotte", geraet: "pc", hoehe: 900, marken: [{ sel: ".tabelle thead th >> nth=0", nr: 1 }, { sel: ".tabelle thead th >> nth=1", nr: 2 }, { sel: ".tabelle thead th >> nth=2", nr: 3 }, { sel: "#fzNeu", nr: 4 }, { sel: "[data-fzbearb] >> nth=0", nr: 5 }, { sel: "[data-fzweg] >> nth=0", nr: 6 }] },
  { id: "03-flotte-dialog", url: "#flotte", geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick("#fzNeu"); await page.locator(`${DLG} input[name=name]`).fill("Golf Schalter 3"); },
    marken: [{ sel: "input[name=name]", nr: 1 }, { sel: "select[name=typ]", nr: 2 }, { sel: "select[name=klasse]", nr: 3 }, { sel: "footer button[value=ok]", nr: 4 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-flotte-umbenennen", url: "#flotte", geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick("[data-fzbearb] >> nth=0"); await page.locator(`${DLG} input[name=name]`).fill("Golf Schalter Rot"); await speichern(h); await page.waitForTimeout(500); },
    ausschnitt: { sel: LAST, rand: 10 } },
  { id: "03-flotte-entfernen", url: "#flotte", geraet: "pc", hoehe: 900,
    vorher: async (page, h) => { await h.klick("[data-fzweg] >> nth=3"); await page.waitForTimeout(400); await page.evaluate(() => { const d = document.querySelector(".fz-weg"); if (d) d.open = true; }); },
    marken: [{ sel: ".fz-weg summary", nr: 5 }, { sel: "[data-fzzurueck]", nr: 6 }, { sel: ".toast-undo [data-undo]", nr: 7 }], ganzeSeite: true },
  { id: "03-flotte-konflikt", url: "#flotte", geraet: "pc", hoehe: 1000,
    vorher: async (page) => { await page.evaluate(() => { const d = KR.addDaysISO(KR.todayISO(), 1); for (const [id, l, v, b] of [["fk1", "fl-1", "09:00", "10:30"], ["fk2", "fl-2", "10:00", "11:30"]]) S.termine.push({ id, fahrschule_id: S.fsId, fahrlehrer_id: l, schueler_id: "s3", datum: d, von: v, bis: b, art: "fahrstunde", fahrzeug: "Golf Schalter 1", status: "geplant", geloescht: false, payload: {} }); zeichne(); }); },
    marken: [{ sel: ".warnkarte h2", nr: 1 }, { sel: ".konf-tab td >> nth=1", nr: 2 }, { sel: "[data-konfgesehen]", nr: 3 }, { sel: ".nav-punkt[href=\"#flotte\"] .zahl", nr: 4 }] },
  { id: "03-flotte-gesehen", url: "#flotte", geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await page.evaluate(() => { const d = KR.addDaysISO(KR.todayISO(), 1); for (const [id, l, v, b] of [["fk1", "fl-1", "09:00", "10:30"], ["fk2", "fl-2", "10:00", "11:30"]]) S.termine.push({ id, fahrschule_id: S.fsId, fahrlehrer_id: l, schueler_id: "s3", datum: d, von: v, bis: b, art: "fahrstunde", fahrzeug: "Golf Schalter 1", status: "geplant", geloescht: false, payload: {} }); S.konfGesehen = S.konfGesehen || []; zeichne(); }); await h.klick("[data-konfgesehen]", { warte: 900 }); await page.evaluate(() => { const d = document.querySelector(".fz-gesehen"); if (d) d.open = true; }); },
    marken: [{ sel: ".fz-gesehen summary", nr: 5 }, { sel: "[data-konfwieder]", nr: 6 }], ausschnitt: { sel: "#ansicht", rand: 6, maxHoehe: 700 } },
  { id: "03-flotte-fahrzeug-im-termin", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await oeffneNeu(page, h); await page.locator(`${DLG} select[name=fahrzeug]`).selectOption({ index: 2 }); },
    marken: [{ sel: "select[name=fahrzeug]", nr: 8 }], ausschnitt: { sel: DLG, rand: 10 } },
  { id: "03-handy-flotte", url: "#flotte", geraet: "handy" },
  { id: "03-handy-schichtplan", url: "#schichtplan", geraet: "handy" },
  { id: "03-handy-urlaub", url: "#urlaub", geraet: "handy" },

  // ---------- Drucken ----------
  { id: "03-druck-knopf", url: KAL, geraet: "pc", marken: [{ sel: "#drucken", nr: 1 }], ausschnitt: { sel: ".kopf-rechts", rand: 14 } },
  { id: "03-druck-vorschau", url: KAL, geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await page.evaluate(() => { fuelleDruckKopf(); }); await page.emulateMedia({ media: "print" }); await page.waitForTimeout(500); } },
  { id: "03-druck-woche", url: KAL + "?ansicht=woche", geraet: "pc", hoehe: 1000,
    vorher: async (page, h) => { await page.evaluate(() => { fuelleDruckKopf(); }); await page.emulateMedia({ media: "print" }); await page.waitForTimeout(500); } },
];
// Bei Ausschnitten: gelber Streifen und mitlaufender Kopf weg, sonst liegen sie im Bild
const ohneStreifen = (b) => {
  if (!b.ausschnitt || [DLG, LAST].includes(b.ausschnitt.sel)) return b;
  const v = b.vorher;
  return Object.assign({}, b, { vorher: async (page, h) => { await page.addStyleTag({ content: "#rollenStreifen{display:none!important}.kopf{position:static!important}" }); if (v) await v(page, h); } });
};
export default LISTE.concat(LISTE2).map(dlgWrap).map(ohneStreifen);
