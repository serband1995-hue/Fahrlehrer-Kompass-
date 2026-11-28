// Kapitel 4: Prüfungen, Fristen und Fahrcheck
const KARTE = ".karte:not(.warnkarte):not(.pt-karte):not(.pt-hinweis-karte)";
const DLG = "dialog[open]";
// Prüfungstag anlegen (Dialog „Prüfungstag anlegen“), Prüfer „AB“
const tagAnlegen = async (page, h) => {
  await h.klick("#ptNeu");
  await h.tippe(`${DLG} input[name=pruefer]`, "AB");
  await h.klick(`${DLG} footer button[value=ok]`, { warte: 900 });
};
// Zwei Schüler in den ersten Fenstern des Tages
const schuelerEinplanen = async (page, h, n = 1) => {
  for (let i = 0; i < n; i++) {
    await h.klick("[data-ptplus]");
    const opt = await page.locator(`${DLG} select[name=schueler_id] option`).nth(1 + i).getAttribute("value");
    await page.locator(`${DLG} select[name=schueler_id]`).selectOption(opt);
    await h.warte(300);
    await h.klick(`${DLG} footer button[value=ok]`, { warte: 1000 });
    await page.keyboard.press("Escape").catch(() => {});
    await h.warte(300);
  }
};
const frisch = async (page, h) => { await h.klick("#neuLaden", { warte: 900 }); };
const filt = (a) => ({ ansicht: a });

const seed = async (p, h) => { await p.evaluate(() => { const F = window.__FAKE; const fs = F.tabellen.fahrschulen[0].id; (F.tabellen.fahrschule_zahlungsdaten = F.tabellen.fahrschule_zahlungsdaten || []).push({ fahrschule_id: fs, kontoinhaber: "Fahrschule Muster", iban: "DE89370400440532013000", modus: "test", test_adresse: "test@example.org" }); }); await frisch(p, h); };
const anzahlDa = async (p, h) => { await p.evaluate(() => { for (const t of window.__FAKE.tabellen.kalender_termine) if (!("buero_fc_anzahl" in t)) t.buero_fc_anzahl = null; }); await frisch(p, h); };
const LISTE = [
  // ---------- Prüfungen ----------
  { id: "04-pr-uebersicht", url: "#pruefungen", geraet: "pc", hoehe: 1500, ausschnitt: "#ansicht",
    marken: [{ sel: "#ansicht .kacheln", nr: 1 }, { sel: "#ansicht .warnkarte", nr: 2 }, { sel: `${KARTE} .tabs`, nr: 3 }] },
  { id: "04-pr-menue", url: "#pruefungen", geraet: "pc", ausschnitt: { sel: '#nav a[href="#pruefungen"]', rand: 8 }, marken: [{ sel: '#nav a[href="#pruefungen"] .zahl, #nav a[href="#pruefungen"] span:last-child', nr: 1 }] },
  { id: "04-pr-kacheln", url: "#pruefungen", geraet: "pc", ausschnitt: "#ansicht .kacheln" },
  { id: "04-pr-warnkarte", url: "#pruefungen", geraet: "pc", ausschnitt: "#ansicht .warnkarte",
    marken: [{ sel: "#ansicht .warnkarte .haupt >> nth=0", nr: 1 }, { sel: "#ansicht .warnkarte [data-ergebnis]", nr: 2 }, { sel: "#ansicht .warnkarte [data-pbearb]", nr: 3 }] },
  { id: "04-pr-knoepfe", url: "#pruefungen", geraet: "pc", ausschnitt: { sel: `${KARTE} .karte-kopf`, rand: 26 },
    marken: [{ sel: `${KARTE} .tabs .tab >> nth=0`, nr: 1 }, { sel: "a[href='#pruefungen?gross=1']", nr: 2 }, { sel: "#ptNeu", nr: 3 }, { sel: "#pNeu", nr: 4 }] },
  { id: "04-pr-haken-legende", url: "#pruefungen?ansicht=kommend", geraet: "pc", ausschnitt: ".legende", marken: [{ sel: ".legende span:nth-child(1) .haken", nr: 1 }, { sel: ".legende span:nth-child(2) .haken", nr: 2 }, { sel: ".legende span:nth-child(3) .haken", nr: 3 }] },

  // Reiter Tage
  { id: "04-pr-tage-leer", url: "#pruefungen", geraet: "pc", hoehe: 1000, ausschnitt: { sel: KARTE, maxHoehe: 1000 }, marken: [{ sel: "#ptNeu", nr: 1 }] },
  { id: "04-pr-tag-dialog", url: "#pruefungen", geraet: "pc", hoehe: 900,
    vorher: async (p, h) => { await h.klick("#ptNeu"); await h.tippe(`${DLG} input[name=pruefer]`, "AB"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} input[name=datum]`, nr: 1 }, { sel: `${DLG} input[name=start]`, nr: 2 }, { sel: `${DLG} input[name=pruefer]`, nr: 3 }, { sel: `${DLG} footer .haupt`, nr: 4 }] },
  { id: "04-pr-tag-neu", url: "#pruefungen", geraet: "pc", hoehe: 1300, vorher: tagAnlegen, ausschnitt: ".pt-karte",
    marken: [{ sel: ".pt-kopf h3", nr: 1 }, { sel: ".pt-kopf-info", nr: 2 }, { sel: "[data-ptbearb]", nr: 3 }, { sel: "[data-ptmehrere]", nr: 4 }, { sel: "[data-ptloesch]", nr: 5 }, { sel: "[data-ptplus] >> nth=0", nr: 6 }] },
  { id: "04-pr-tag-bearb", url: "#pruefungen", geraet: "pc", hoehe: 1100,
    vorher: async (p, h) => { await tagAnlegen(p, h); await h.klick("[data-ptbearb]"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} input[name=datum]`, nr: 1 }, { sel: `${DLG} input[name=start]`, nr: 2 }, { sel: `${DLG} input[name=pruefer]`, nr: 3 }] },
  { id: "04-pr-plus-dialog", url: "#pruefungen", geraet: "pc", hoehe: 1100,
    vorher: async (p, h) => { await tagAnlegen(p, h); await h.klick("[data-ptplus]"); await p.locator(`${DLG} select[name=schueler_id]`).selectOption({ index: 1 }); await h.warte(300); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} select[name=schueler_id]`, nr: 1 }, { sel: `${DLG} select[name=klasse]`, nr: 2 }, { sel: `${DLG} select[name=fahrlehrer_id]`, nr: 3 }, { sel: `${DLG} footer .haupt`, nr: 4 }] },
  { id: "04-pr-tag-belegt", url: "#pruefungen", geraet: "pc", hoehe: 1500,
    vorher: async (p, h) => { await tagAnlegen(p, h); await schuelerEinplanen(p, h, 2); },
    ausschnitt: ".pt-karte", marken: [{ sel: ".pt-belegt .pt-griff >> nth=0", nr: 1 }, { sel: "select.pt-fl >> nth=0", nr: 2 }, { sel: ".pt-belegt .pt-status >> nth=0", nr: 3 }, { sel: ".pt-belegt .haken-reihe >> nth=0", nr: 4 }, { sel: ".pt-belegt [data-pbearb] >> nth=0", nr: 5 }] },
  { id: "04-pr-mehrere", url: "#pruefungen", geraet: "pc", hoehe: 1200,
    vorher: async (p, h) => { await tagAnlegen(p, h); await h.klick("[data-ptmehrere]"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} #ptSuche`, nr: 1 }, { sel: `${DLG} .pt-gruppe >> nth=0`, nr: 2 }, { sel: `${DLG} #ptZaehl`, nr: 3 }, { sel: `${DLG} footer .haupt`, nr: 4 }] },
  { id: "04-pr-mehrere-fertig", url: "#pruefungen", geraet: "pc", hoehe: 1700,
    vorher: async (p, h) => { await tagAnlegen(p, h); await h.klick("[data-ptmehrere]"); await h.klick(`${DLG} footer button[value=ok]`, { warte: 1500 }); },
    ausschnitt: "[data-pttagkarte]", marken: [{ sel: ".pt-kopf-info .pt-zahl", nr: 1 }] },
  { id: "04-pr-tausch-hinweis", url: "#pruefungen", geraet: "pc", hoehe: 1500,
    vorher: async (p, h) => { await tagAnlegen(p, h); await schuelerEinplanen(p, h, 2); await h.scrolle(".pt-tipp"); },
    ausschnitt: ".pt-tipp", marken: [] },
  { id: "04-pr-tag-loeschen", url: "#pruefungen", geraet: "pc", hoehe: 1100,
    vorher: async (p, h) => { await tagAnlegen(p, h); await h.klick("[data-ptloesch]"); },
    ausschnitt: DLG },
  { id: "04-pr-fruehere-tage", url: "#pruefungen", geraet: "pc", hoehe: 1100, vorher: async (p, h) => { await tagAnlegen(p, h); await h.scrolle("a[href*='frueher']"); }, ausschnitt: { sel: "a[href*='frueher']", rand: 60 }, marken: [{ sel: "a[href*='frueher']", nr: 1 }] },

  // Weitere Reiter
  { id: "04-pr-kommende", url: "#pruefungen?ansicht=kommend", geraet: "pc", hoehe: 1500, ausschnitt: { sel: KARTE, maxHoehe: 1000 },
    marken: [{ sel: `${KARTE} .tabs .tab[aria-current]`, nr: 1 }, { sel: `${KARTE} .tabs .tab:nth-of-type(n) ~ .trenner + .tab`, nr: 2 }, { sel: "#pSuche", nr: 3 }, { sel: "#pVon", nr: 4 }, { sel: "#pSort", nr: 5 }] },
  { id: "04-pr-filter", url: "#pruefungen?ansicht=kommend&suche=muster", geraet: "pc", ausschnitt: ".filterzeile", marken: [{ sel: "#pSuche", nr: 1 }, { sel: "#pVon", nr: 2 }, { sel: "#pBis", nr: 3 }, { sel: "#pSort", nr: 4 }, { sel: ".filterzeile a.knopf", nr: 5 }] },
  { id: "04-pr-arten", url: "#pruefungen?ansicht=kommend", geraet: "pc", ausschnitt: { sel: `${KARTE} .karte-kopf .tabs`, rand: 26 }, marken: [{ sel: `${KARTE} .tabs .trenner + .tab`, nr: 1 }] },
  { id: "04-pr-ergebnisse", url: "#pruefungen?ansicht=ergebnis", geraet: "pc", hoehe: 1300, ausschnitt: "#ansicht",
    marken: [{ sel: "[data-eja]", nr: 1 }, { sel: "[data-enein]", nr: 2 }, { sel: ".tab[aria-current]", nr: 3 }] },
  { id: "04-pr-ergebnis-ja", url: "#pruefungen?ansicht=ergebnis", geraet: "pc", hoehe: 1300, vorher: async (p, h) => { await h.klick("[data-eja]", { warte: 900 }); },
    ausschnitt: ".ergebnis-tabelle", marken: [{ sel: ".ergebnis-knoepfe .marke-pill >> nth=0", nr: 1 }, { sel: "[data-erueck]", nr: 2 }, { sel: "[data-earchiv]", nr: 3 }] },
  { id: "04-pr-wiederholung", url: "#pruefungen?ansicht=ergebnis", geraet: "pc", hoehe: 1300, vorher: async (p, h) => { await h.klick("[data-enein]", { warte: 900 }); await h.geh("#pruefungen?ansicht=vergangen"); },
    ausschnitt: { sel: KARTE, maxHoehe: 700 }, marken: [{ sel: ".marke-pill.rot >> nth=0", nr: 1 }, { sel: ".wiederholung-hinweis >> nth=0", nr: 2 }] },
  { id: "04-pr-archiv-frage", url: "#pruefungen?ansicht=ergebnis", geraet: "pc", hoehe: 1000, vorher: async (p, h) => { await h.klick("[data-eja]", { warte: 900 }); await h.klick("[data-earchiv]"); }, ausschnitt: DLG },
  { id: "04-pr-ergebnis-dialog", url: "#pruefungen", geraet: "pc", hoehe: 1100, vorher: async (p, h) => { await h.klick("[data-ergebnis]"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} input[value=bestanden]`, nr: 1 }, { sel: `${DLG} input[value=nicht_bestanden]`, nr: 2 }, { sel: `${DLG} footer .haupt`, nr: 3 }] },
  { id: "04-pr-vergangene", url: "#pruefungen?ansicht=vergangen", geraet: "pc", hoehe: 1200, ausschnitt: { sel: KARTE, maxHoehe: 1000 }, marken: [{ sel: ".marke-pill:text-is(\"bestanden\") >> nth=0", nr: 1 }, { sel: "#pSort", nr: 2 }] },
  { id: "04-pr-alle", url: "#pruefungen?ansicht=alle", geraet: "pc", hoehe: 1500, ausschnitt: { sel: KARTE, maxHoehe: 1000 } },
  { id: "04-pr-gross", url: "#pruefungen?gross=1", geraet: "pc", hoehe: 1000, ausschnitt: "#ansicht", marken: [{ sel: ".kiosk-kopf .knopf", nr: 1 }] },

  // Prüfung planen / bearbeiten
  { id: "04-pr-planen", url: "#pruefungen", geraet: "pc", hoehe: 1700, vorher: async (p, h) => { await tagAnlegen(p, h); await h.klick("#pNeu"); await p.locator(`${DLG} select[name=schueler_id]`).selectOption({ index: 1 }); await h.warte(300); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} select[name=schueler_id]`, nr: 1 }, { sel: `${DLG} select[name=art]`, nr: 2 }, { sel: `${DLG} select[name=klasse]`, nr: 3 }, { sel: `${DLG} select[name=zeitart]`, nr: 4 }, { sel: `${DLG} select[name=tag_id]`, nr: 5 }, { sel: `${DLG} select[name=fenster]`, nr: 6 }, { sel: `${DLG} select[name=fahrlehrer_id]`, nr: 7 }, { sel: `${DLG} input[name=pruefer]`, nr: 8 }, { sel: `${DLG} fieldset`, nr: 9 }, { sel: `${DLG} input[name=notiz]`, nr: 10 }, { sel: `${DLG} footer .haupt`, nr: 11 }] },
  { id: "04-pr-planen-frei", url: "#pruefungen", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("#pNeu"); await p.locator(`${DLG} select[name=schueler_id]`).selectOption({ index: 1 }); await p.locator(`${DLG} select[name=zeitart]`).selectOption("frei"); await h.warte(300); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} select[name=zeitart]`, nr: 1 }, { sel: `${DLG} input[name=datum]`, nr: 2 }, { sel: `${DLG} input[name=von]`, nr: 3 }] },
  { id: "04-pr-planen-theorie", url: "#pruefungen", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("#pNeu"); await p.locator(`${DLG} select[name=schueler_id]`).selectOption({ index: 1 }); await p.locator(`${DLG} select[name=art]`).selectOption("theorie"); await h.warte(300); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} select[name=art]`, nr: 1 }, { sel: `${DLG} select[name=zeitart]`, nr: 2 }] },
  { id: "04-pr-bearbeiten", url: "#pruefungen?ansicht=kommend", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("[data-pbearb] >> nth=0"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} input[name=absagen]`, nr: 1 }, { sel: `${DLG} footer .haupt`, nr: 2 }] },
  { id: "04-pr-korrigieren", url: "#pruefungen?ansicht=vergangen", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("tr.pt-st-gruen [data-pbearb] >> nth=0"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} select[name=status]`, nr: 1 }] },
  { id: "04-pr-handy", url: "#pruefungen?ansicht=kommend", geraet: "handy", vorher: async (p, h) => { await h.scrolle(`${KARTE} .tabs`); } },
  { id: "04-pr-handy-ergebnis", url: "#pruefungen?ansicht=ergebnis", geraet: "handy", vorher: async (p, h) => { await h.scrolle(".ergebnis-tabelle"); } },

  // ---------- Fristen ----------
  { id: "04-fr-uebersicht", url: "#fristen", geraet: "pc", hoehe: 1500, ausschnitt: "#ansicht",
    marken: [{ sel: "#ansicht .kacheln", nr: 1 }, { sel: `${KARTE} .tabs`, nr: 2 }, { sel: "#fristenSuche", nr: 3 }] },
  { id: "04-fr-menue", url: "#fristen", geraet: "pc", ausschnitt: { sel: '#nav a[href="#fristen"]', rand: 2 } },
  { id: "04-fr-kacheln", url: "#fristen", geraet: "pc", hoehe: 1000, ausschnitt: "#ansicht .kacheln",
    marken: [{ sel: "#ansicht .kachel >> nth=0", nr: 1 }, { sel: "#ansicht .kachel >> nth=1", nr: 2 }, { sel: "#ansicht .kachel >> nth=2", nr: 3 }, { sel: "#ansicht .kachel >> nth=3", nr: 4 }, { sel: "#ansicht .kachel >> nth=4", nr: 5 }, { sel: "[data-kachelbald]", nr: 6 }] },
  { id: "04-fr-handeln", url: "#fristen", geraet: "pc", hoehe: 2000, ausschnitt: { sel: KARTE, maxHoehe: 1000 }, marken: [{ sel: `${KARTE} .tab[aria-current]`, nr: 1 }, { sel: `${KARTE} tbody tr:first-child .marke-pill >> nth=0`, nr: 2 }] },
  { id: "04-fr-zeile", url: "#fristen", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.scrolle(`${KARTE} tbody tr`); }, ausschnitt: `${KARTE} tbody tr:nth-child(3)`,
    marken: [{ sel: `${KARTE} tbody tr:nth-child(3) td:nth-child(4) .marke-pill`, nr: 1 }, { sel: `${KARTE} tbody tr:nth-child(3) td:nth-child(5) .marke-pill`, nr: 2 }, { sel: `${KARTE} tbody tr:nth-child(3) [data-zahlung]`, nr: 3 }, { sel: `${KARTE} tbody tr:nth-child(3) [data-fristen]`, nr: 4 }] },
  { id: "04-fr-bald", url: "#fristen?ansicht=bald", geraet: "pc", hoehe: 1500, ausschnitt: { sel: KARTE, maxHoehe: 1000 },
    marken: [{ sel: ".tab[aria-current]", nr: 1 }, { sel: "[data-baldliste] .bald-wer >> nth=0", nr: 2 }, { sel: "[data-baldliste] .bald-noch >> nth=0", nr: 3 }, { sel: "[data-baldakte] >> nth=0", nr: 4 }, { sel: "[data-balderinnern] >> nth=0", nr: 5 }] },
  { id: "04-fr-alle", url: "#fristen?ansicht=alle", geraet: "pc", hoehe: 1500, ausschnitt: { sel: KARTE, maxHoehe: 1000 } },
  { id: "04-fr-ohne", url: "#fristen?ansicht=ohne", geraet: "pc", hoehe: 1100, ausschnitt: { sel: KARTE, maxHoehe: 1000 }, marken: [{ sel: "tbody tr:first-child td:nth-child(4) .marke-pill", nr: 1 }, { sel: "[data-ohnehinweis]", nr: 2 }] },
  { id: "04-fr-theorie", url: "#fristen?ansicht=theorie", geraet: "pc", hoehe: 1500, ausschnitt: { sel: KARTE, maxHoehe: 1000 } },
  { id: "04-fr-antrag", url: "#fristen?ansicht=antrag", geraet: "pc", hoehe: 1500, ausschnitt: { sel: KARTE, maxHoehe: 1000 }, marken: [{ sel: "[data-antragneu] >> nth=0", nr: 1 }, { sel: `${KARTE} [data-fristen] >> nth=0`, nr: 2 }] },
  { id: "04-fr-antrag-neu", url: "#fristen?ansicht=antrag", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("[data-antragneu]", { warte: 700 }); }, ausschnitt: "#ansicht" },
  { id: "04-fr-umschreiber", url: "#fristen?ansicht=umschreiber", geraet: "pc", hoehe: 1100, ausschnitt: { sel: KARTE, maxHoehe: 1000 } },
  { id: "04-fr-suche", url: "#fristen?ansicht=alle&suche=anna", geraet: "pc", hoehe: 900, ausschnitt: { sel: `${KARTE} .karte-kopf`, rand: 26 }, marken: [{ sel: "#fristenSuche", nr: 1 }] },
  { id: "04-fr-regel", url: "#fristen", geraet: "pc", hoehe: 2000, vorher: async (p, h) => { await h.scrolle("[data-reaktregel]"); }, ausschnitt: { sel: "[data-reaktregel]", rand: 30 }, marken: [{ sel: "[data-reaktregel]", nr: 1 }] },

  // Dialoge
  { id: "04-fr-dialog", url: "#fristen", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("[data-fristen] >> nth=0"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} input[name=vertrag_am]`, nr: 1 }, { sel: `${DLG} fieldset`, nr: 2 }, { sel: `${DLG} input[name=antrag_am]`, nr: 3 }, { sel: `${DLG} input[name=theorie_frist_bis]`, nr: 4 }, { sel: `${DLG} input[name=theorie_abgeschlossen_am]`, nr: 5 }, { sel: `${DLG} input[name=theorie_bestanden_am]`, nr: 6 }, { sel: `${DLG} footer .haupt`, nr: 7 }] },
  { id: "04-fr-zahlung", url: "#fristen", geraet: "pc", hoehe: 1300, vorher: async (p, h) => { await h.klick("[data-zahlung] >> nth=0"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} input[name=betrag]`, nr: 1 }, { sel: `${DLG} input[name=am]`, nr: 2 }, { sel: `${DLG} select[name=absprache]`, nr: 3 }, { sel: `${DLG} input[name=notiz]`, nr: 4 }, { sel: `${DLG} footer .haupt`, nr: 5 }] },
  { id: "04-fr-nichtbezahlt", url: "#fristen", geraet: "pc", hoehe: 1100, vorher: async (p, h) => { await h.klick("[data-nichtbezahlt] >> nth=0"); }, ausschnitt: DLG },
  { id: "04-fr-zahlungoffen", url: "#fristen", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("[data-zsperre] >> nth=0"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} [data-zgrund] >> nth=0`, nr: 1 }, { sel: `${DLG} input[name=grund]`, nr: 2 }, { sel: `${DLG} footer .haupt`, nr: 3 }] },
  { id: "04-fr-bezahlt", url: "#fristen?ansicht=alle", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await h.klick("[data-zsperre] >> nth=0"); await h.klick(`${DLG} footer button[value=ok]`, { warte: 1000 }); },
    ausschnitt: { sel: KARTE, maxHoehe: 1000 }, marks: null, marken: [{ sel: "[data-zbezahlt] >> nth=0", nr: 1 }, { sel: "[data-zsperre] >> nth=0", nr: 2 }, { sel: "[data-zahlung] >> nth=0", nr: 3 }] },
  { id: "04-fr-akte-zahlblock", url: "#fristen", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await p.evaluate(() => window.schuelerDialog("s9")); await h.warte(800); await h.scrolle("#zahlBlock"); await dm(p, [{ sel: "#zahlBlock [data-zreakt]", nr: 1 }]); },
    ausschnitt: { sel: "#zahlBlock", rand: 40 } },
    { id: "04-fr-handy", url: "#fristen", geraet: "handy", vorher: async (p, h) => { await h.scrolle(`${KARTE} tbody tr`); } },
  { id: "04-fr-handy-bald", url: "#fristen?ansicht=bald", geraet: "handy", vorher: async (p, h) => { await h.scrolle("[data-baldliste]"); } },

  // ---------- Fahrcheck ----------
  { id: "04-fc-uebersicht", url: "#fahrchecks", geraet: "pc", hoehe: 1700, ausschnitt: "#ansicht", marken: [{ sel: "#ansicht .kacheln", nr: 1 }, { sel: `${KARTE} .tabs`, nr: 2 }, { sel: ".filterzeile", nr: 3 }] },
  { id: "04-fc-menue", url: "#fahrchecks", geraet: "pc", ausschnitt: { sel: '#nav a[href="#fahrchecks"]', rand: 2 } },
  { id: "04-fc-kacheln", url: "#fahrchecks", geraet: "pc", ausschnitt: "#ansicht .kacheln", marken: [{ sel: "#ansicht .kachel >> nth=0", nr: 1 }, { sel: "#ansicht .kachel >> nth=1", nr: 2 }, { sel: "#ansicht .kachel >> nth=2", nr: 3 }] },
  { id: "04-fc-filter", url: "#fahrchecks", geraet: "pc", ausschnitt: ".filterzeile", marken: [{ sel: "#fcSuche", nr: 1 }, { sel: "#fcLehrer", nr: 2 }, { sel: "#fcZeitraum", nr: 3 }, { sel: "#fcStatus", nr: 4 }] },
  { id: "04-fc-tabelle", url: "#fahrchecks", geraet: "pc", hoehe: 1700, vorher: async (p, h) => { await h.scrolle(`${KARTE} table`); }, ausschnitt: { sel: KARTE, rand: 20 }, marken: [{ sel: `${KARTE} tbody tr:first-child td:nth-child(1)`, nr: 1 }, { sel: `${KARTE} tbody tr:first-child td:nth-child(2)`, nr: 2 }, { sel: `${KARTE} tbody tr:first-child td:nth-child(4)`, nr: 3 }, { sel: "[data-fcabgabe] >> nth=0", nr: 4 }, { sel: `${KARTE} tbody tr:first-child a[href*="ansicht=stunden"]`, nr: 5 }] },
  { id: "04-fc-abgabe", url: "#fahrchecks", geraet: "pc", hoehe: 1600, vorher: async (p, h) => { await h.klick("[data-fcabgabe] >> nth=0"); await h.tippe(`${DLG} input[name=ist]`, "5"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} .soll-ist > div:first-child`, nr: 1 }, { sel: `${DLG} input[name=ist]`, nr: 2 }, { sel: `${DLG} #fcErgebnis`, nr: 3 }, { sel: `${DLG} input[name=fehlt] >> nth=0`, nr: 4 }, { sel: `${DLG} input[name=notiz]`, nr: 5 }, { sel: `${DLG} footer .haupt`, nr: 6 }] },
  { id: "04-fc-abgabe-stimmt", url: "#fahrchecks", geraet: "pc", hoehe: 1600, vorher: async (p, h) => { await h.klick("[data-fcabgabe] >> nth=0"); await h.tippe(`${DLG} input[name=ist]`, "6"); },
    ausschnitt: ".soll-ist", marken: [{ sel: "#fcErgebnis", nr: 1 }] },
  { id: "04-fc-abgabe-fertig", url: "#fahrchecks", geraet: "pc", hoehe: 1700, vorher: async (p, h) => { await h.klick("[data-fcabgabe] >> nth=0"); await h.tippe(`${DLG} input[name=ist]`, "6"); await h.klick(`${DLG} footer button[value=ok]`, { warte: 1000 }); await p.evaluate(() => { S.fcAbgaben.forEach((q) => { if (!q.bestaetigt_am) q.bestaetigt_am = new Date().toISOString(); }); zeichne(); }); await h.warte(400); },
    ausschnitt: `${KARTE} table`, marken: [{ sel: `${KARTE} tbody tr:first-child .marke-pill.gruen`, nr: 1 }, { sel: "[data-fcabgabe] >> nth=0", nr: 2 }] },
  { id: "04-fc-verlauf", url: "#fahrchecks", geraet: "pc", hoehe: 2200, vorher: async (p, h) => { await h.scrolle(".karte:last-of-type h2"); }, ausschnitt: ".karte:last-of-type" },
  { id: "04-fc-lohn", url: "#fahrchecks", geraet: "pc", hoehe: 1700, ausschnitt: { sel: `${KARTE} tbody tr:first-child`, rand: 10 }, marken: [{ sel: `${KARTE} tbody tr:first-child td:nth-child(4) .marke-pill.gelb`, nr: 1 }, { sel: `${KARTE} tbody tr:first-child td:nth-child(4) .marke-pill.rot`, nr: 2 }] },
  { id: "04-fc-stunden", url: "#fahrchecks?ansicht=stunden", geraet: "pc", ausschnitt: { sel: "#ansicht", maxHoehe: 1000 }, marken: [{ sel: ".tab[aria-current]", nr: 1 }, { sel: "#ansicht .kacheln", nr: 2 }, { sel: ".filterzeile", nr: 3 }] },
  { id: "04-fc-stunden-filter", url: "#fahrchecks?ansicht=stunden", geraet: "pc", ausschnitt: ".filterzeile", marken: [{ sel: "#fcSuche", nr: 1 }, { sel: "#fcLehrer", nr: 2 }, { sel: "#fcArt", nr: 3 }, { sel: "#fcTyp", nr: 4 }, { sel: "#fcStatus", nr: 5 }, { sel: "#fcGueltig", nr: 6 }, { sel: "#fcVon", nr: 7 }, { sel: "#fcSort", nr: 8 }] },
  { id: "04-fc-stunden-zeilen", url: "#fahrchecks?ansicht=stunden", geraet: "pc", vorher: async (p, h) => { await anzahlDa(p, h); await h.scrolle(".tabelle"); }, ausschnitt: { sel: ".tabelle", maxHoehe: 560 }, marken: [{ sel: "[data-fcstatus=abgegeben] >> nth=0", nr: 1 }, { sel: "[data-fcstatus=fehlt] >> nth=0", nr: 2 }, { sel: "[data-fcbearb] >> nth=0", nr: 3 }] },
  { id: "04-fc-abgehakt", url: "#fahrchecks?ansicht=stunden", geraet: "pc", vorher: async (p, h) => { await anzahlDa(p, h); await h.klick("[data-fcstatus=abgegeben] >> nth=0", { warte: 900 }); await h.scrolle(".tabelle"); }, ausschnitt: { sel: ".tabelle", maxHoehe: 560 }, marken: [{ sel: ".marke-pill:text-is(\"abgegeben\") >> nth=0", nr: 1 }] },
  { id: "04-fc-stunde-dialog", url: "#fahrchecks?ansicht=stunden", geraet: "pc", hoehe: 1500, vorher: async (p, h) => { await anzahlDa(p, h); await h.klick("[data-fcbearb] >> nth=0"); },
    ausschnitt: DLG, marken: [{ sel: `${DLG} select[name=status]`, nr: 1 }, { sel: `${DLG} input[name=nach]`, nr: 2 }, { sel: `${DLG} select[name=anzahl]`, nr: 3 }, { sel: `${DLG} footer .haupt`, nr: 4 }] },
  { id: "04-fc-typen", url: "#fahrchecks?ansicht=stunden&typ=eins", geraet: "pc", ausschnitt: { sel: ".tabelle", maxHoehe: 460 }, marken: [{ sel: ".tabelle .marke-pill.gelb >> nth=0", nr: 1 }] },
  { id: "04-fc-handy", url: "#fahrchecks", geraet: "handy", vorher: async (p, h) => { await h.scrolle(`${KARTE} table`); } },
  { id: "04-fc-handy-stunden", url: "#fahrchecks?ansicht=stunden", geraet: "handy", vorher: async (p, h) => { await h.scrolle(".tabelle"); } },
  // Zusätzliche Bilder
  { id: "04-pr-appergebnis", url: "#pruefungen?ansicht=kommend", geraet: "pc", hoehe: 1200,
    vorher: async (p, h) => { await p.evaluate(() => { const t = window.__FAKE.tabellen.pruefungstermine.find((x) => x.id === "pt-5"); t.ergebnis_uebernommen = false; }); await frisch(p, h); await p.evaluate(() => { const d = document.querySelector("[data-ergapphinweis]"); if (d) d.open = true; }); await h.warte(300); },
    ausschnitt: "[data-ergapphinweis]", marken: [{ sel: "[data-eueball]", nr: 1 }, { sel: "[data-ergapphinweis] li [data-eueb] >> nth=0", nr: 2 }] },
  { id: "04-pr-zahlhinweis", url: "#pruefungen?ansicht=kommend", geraet: "pc", hoehe: 1200,
    vorher: async (p, h) => { await p.evaluate(() => { const t = window.__FAKE.tabellen.pruefungstermine.find((x) => x.id === "pt-1"); t.quelle = "app"; t.entgelt_bezahlt = false; }); await frisch(p, h); await p.evaluate(() => { const d = document.querySelector("[data-pthinweisd]"); if (d) d.open = true; }); await h.warte(300); },
    ausschnitt: "[data-pthinweisd]", marken: [{ sel: "[data-ptzm] >> nth=0", nr: 1 }] },
  { id: "04-pr-tag-uhrzeit", url: "#pruefungen", geraet: "pc", hoehe: 1500,
    vorher: async (p, h) => { await tagAnlegen(p, h); await schuelerEinplanen(p, h, 1); await h.klick("[data-ptbearb]"); await h.tippe(`${DLG} input[name=start]`, "09:00"); await h.klick(`${DLG} footer button[value=ok]`, { warte: 1200 }); },
    ausschnitt: ".pt-karte", marken: [{ sel: ".pt-hinweis", nr: 1 }, { sel: "[data-ptinfo]", nr: 2 }] },
  { id: "04-pr-freie", url: "#pruefungen", geraet: "pc", hoehe: 1200, ausschnitt: ".pt-karte >> nth=0", marken: [{ sel: ".pt-uhrzeit .pt-zeile.pt-belegt >> nth=1", nr: 1 }] },
  { id: "04-pr-akte", url: "#pruefungen", geraet: "pc", hoehe: 1500,
    vorher: async (p, h) => { await p.evaluate(() => window.schuelerDialog("s9")); await h.warte(800); await h.scrolle(".pruef-akte"); await dm(p, [{ sel: ".pruef-akte li >> nth=0", nr: 1 }]); },
    ausschnitt: { sel: ".pruef-akte", rand: 70 } },
  { id: "04-pr-durchfall", url: "#fehler", geraet: "pc", hoehe: 1100, ausschnitt: "#ansicht" },
  { id: "04-pr-menue-fristen-zahl", url: "#pruefungen", geraet: "pc", ausschnitt: "#nav", marken: [{ sel: '#nav a[href="#pruefungen"]', nr: 1 }, { sel: '#nav a[href="#fristen"]', nr: 2 }, { sel: '#nav a[href="#fahrchecks"]', nr: 3 }] },
  { id: "04-fr-akte-mail", url: "#fristen?ansicht=bald", geraet: "pc", hoehe: 1700, vorInit: () => { window.ZM_WARTE_MS = 300; },
    vorher: async (p, h) => { await seed(p, h); await h.klick("[data-baldart=reaktivierung] >> nth=0", { warte: 1200 }); await h.scrolle("#zmBlock"); await dm(p, [{ sel: "#zmBlock [data-zmbetrag]", nr: 1 }, { sel: "#zmBlock [data-zmwofuer]", nr: 2 }, { sel: "#zmBlock [data-zmsenden]", nr: 3 }]); },
    ausschnitt: { sel: "#zmBlock", rand: 40 } },
  { id: "04-fr-erinnern-akte", url: "#fristen?ansicht=bald", geraet: "pc", hoehe: 1700, vorInit: () => { window.ZM_WARTE_MS = 300; },
    vorher: async (p, h) => { await seed(p, h); await h.klick("[data-baldart=theorie] >> nth=0", { warte: 1200 }); await h.scrolle("#emBlock"); await dm(p, [{ sel: "#emBlock .zm-art-kopf", nr: 1 }, { sel: "#emBlock [data-emsenden]", nr: 2 }]); },
    ausschnitt: { sel: "#emBlock", rand: 40 } },
  { id: "04-fr-erinnert", url: "#fristen?ansicht=bald", geraet: "pc", hoehe: 1700, vorInit: () => { window.ZM_WARTE_MS = 300; },
    vorher: async (p, h) => { await seed(p, h); await h.klick("[data-baldart=theorie] >> nth=0", { warte: 1200 }); await h.klick("#emBlock [data-emsenden]", { warte: 2500 }); await h.scrolle("#emBlock"); await dm(p, [{ sel: "#emBlock [data-emhaken]", nr: 1 }]); },
    ausschnitt: { sel: "#emBlock", rand: 40 } },
  { id: "04-fr-erinnert-liste", url: "#fristen?ansicht=bald&suche=finn", geraet: "pc", hoehe: 1700, vorInit: () => { window.ZM_WARTE_MS = 300; },
    vorher: async (p, h) => { await seed(p, h); await h.klick("[data-baldart=theorie] >> nth=0", { warte: 1200 }); await h.klick("#emBlock [data-emsenden]", { warte: 2500 }); await p.keyboard.press("Escape"); await h.warte(700); },
    ausschnitt: { sel: KARTE, maxHoehe: 900 }, marken: [{ sel: "[data-balderinnert] >> nth=0", nr: 1 }] },
  { id: "04-fr-erinnern-knopf", url: "#fristen?ansicht=bald", geraet: "pc", hoehe: 1200, ausschnitt: { sel: KARTE, maxHoehe: 420 }, marken: [{ sel: "[data-balderinnern] >> nth=0", nr: 1 }] },
  { id: "04-fc-gueltigkeit", url: "#fahrchecks?ansicht=stunden", geraet: "pc", ausschnitt: { sel: ".tabelle tbody tr:first-child", rand: 10 }, marken: [{ sel: ".tabelle tbody tr:first-child td:first-child .unter >> nth=1", nr: 1 }] },
];

// Marken in Fenstern (Dialoge liegen über allem): die Marken werden im Dialog selbst gesetzt
const dm = async (page, liste) => {
  const rects = [];
  for (const m of liste) {
    const loc = page.locator(m.sel).first();
    if (!(await loc.count())) { console.log(`   ! Dialog-Marke ${m.nr} nicht gefunden: ${m.sel}`); continue; }
    const b = await loc.boundingBox();
    if (!b) { console.log(`   ! Dialog-Marke ${m.nr} unsichtbar: ${m.sel}`); continue; }
    rects.push({ nr: m.nr, x: b.x, y: b.y, w: b.width, h: b.height });
  }
  await page.evaluate((rects) => {
    const dlg = document.querySelector("dialog[open]");
    for (const r of rects) {
      const pad = 4;
      const box = document.createElement("div");
      Object.assign(box.style, { position: "fixed", left: r.x - pad + "px", top: r.y - pad + "px", width: r.w + pad * 2 + "px", height: r.h + pad * 2 + "px", border: "3px solid #d6202a", borderRadius: "10px", zIndex: 99999, pointerEvents: "none", boxShadow: "0 0 0 2px rgba(255,255,255,.85)" });
      dlg.appendChild(box);
      const n = document.createElement("div");
      n.textContent = r.nr;
      Object.assign(n.style, { position: "fixed", left: Math.max(2, r.x - pad - 15) + "px", top: Math.max(2, r.y - pad - 15) + "px", width: "26px", height: "26px", borderRadius: "50%", background: "#d6202a", color: "#fff", font: "700 15px/26px Arial, sans-serif", textAlign: "center", zIndex: 100000, pointerEvents: "none", boxShadow: "0 0 0 2px #fff" });
      dlg.appendChild(n);
    }
  }, rects);
};
export default LISTE.map((b) => {
  if (b.ausschnitt === DLG && b.marken && b.marken.length) {
    const m = b.marken, v = b.vorher;
    return Object.assign({}, b, { marken: undefined, vorher: async (p, h) => { if (v) await v(p, h); await dm(p, m); } });
  }
  return b;
});
