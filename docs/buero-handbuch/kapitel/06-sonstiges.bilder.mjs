// Kapitel 6: Team, Statistik und Einstellungen – Bilder
// Marken liegen sonst unter geöffneten Fenstern (oberste Ebene des Browsers): sie werden in das Fenster verschoben
const dlgInit = () => {
  const mo = new MutationObserver(() => {
    const d = document.querySelector("dialog[open]"); if (!d) return;
    document.querySelectorAll("body > .hb-marke").forEach((n) => { const r = d.getBoundingClientRect(); d.appendChild(n); n.style.left = (parseFloat(n.style.left) - scrollX - r.left - d.clientLeft) + "px"; n.style.top = (parseFloat(n.style.top) - scrollY - r.top - d.clientTop) + "px"; });
  });
  mo.observe(document, { childList: true, subtree: true });
};
const alle = (liste) => liste.map((b) => ({ ...b, vorInit: "(" + dlgInit + ")();" + (b.vorInit ? "(" + b.vorInit + ")();" : ""),
  // Bei Ausschnitten verdeckt der mitlaufende Rollen-Streifen sonst die erste Zeile
  vorher: b.ausschnitt && b.geraet !== "handy" && !/streifen/.test(b.id) ? async (page, h) => { if (b.vorher) await b.vorher(page, h); await page.evaluate(() => { const s = document.getElementById("rollenStreifen"); if (s) s.style.visibility = "hidden"; }); } : b.vorher }));
const dlg = "dialog[open]";
const ok = `${dlg} footer button[value=ok]`;
const SLUG = async (page, h) => {
  await page.evaluate(() => { for (const l of S.lehrer) { if (!l.slug) l.slug = String(l.name || "x").toLowerCase().replace(/[^a-z]+/g, "-"); } for (const l of S.team) { if (!l.slug && l.rolle === "fahrlehrer") l.slug = String(l.name || "x").toLowerCase().replace(/[^a-z]+/g, "-"); } zeichne(); });
  await h.warte(300);
};
const TEL = (page) => page.evaluate(() => { S.personen.forEach((p) => { if (p.telefon) p.telefon = "0170 0000000"; }); zeichne(); });
const einst = (thema) => `#einstellungen?thema=${thema}`;
const mehrere = (sel) => ({ sel, nr: 0 });

// ---------------------------------------------------------------- Statistik
const statistik = [
  { id: "06-statistik-ganz", geraet: "pc", url: "#zahlen", marken: [{ sel: ".filterzeile", nr: 1 }, { sel: ".kacheln", nr: 2 }, { sel: ".raster.zwei >> nth=0", nr: 3 }, { sel: ".karte:has-text('Offenes Geld und Verkäufe')", nr: 4 }, { sel: "#luQuoteLehrer", nr: 5 }, { sel: "#awKarte", nr: 6 }], hoehe: 1700 },
  { id: "06-statistik-kopf", geraet: "pc", url: "#zahlen", marken: [{ sel: "#kMonatsbericht", nr: 1 }], ausschnitt: { sel: "header.kopf", rand: 18 } },
  { id: "06-statistik-reiter", geraet: "pc", url: "#fehler", marken: [{ sel: ".aw-reiter a[href='#zahlen']", nr: 1 }, { sel: ".aw-reiter a[href='#fehler']", nr: 2 }, { sel: ".aw-reiter a[href='#verlauf']", nr: 3 }], ausschnitt: { sel: ".aw-reiter", rand: 18 } },
  { id: "06-statistik-filter", geraet: "pc", url: "#zahlen", marken: [{ sel: "#zZr", nr: 1 }, { sel: "#zKlasse", nr: 2 }, { sel: "#zLehrer", nr: 3 }], ausschnitt: { sel: ".filterzeile", rand: 16 } },
  { id: "06-statistik-filter-aktiv", geraet: "pc", url: "#zahlen?klasse=B&lehrer=fl-1", marken: [{ sel: "#zKlasse", nr: 1 }, { sel: "#zLehrer", nr: 2 }, { sel: ".filterzeile a.knopf", nr: 3 }], ausschnitt: { sel: ".filterzeile", rand: 16 } },
  { id: "06-statistik-kacheln", geraet: "pc", url: "#zahlen", marken: [{ sel: ".kacheln .kachel >> nth=0", nr: 1 }, { sel: ".kacheln .kachel >> nth=1", nr: 2 }, { sel: ".kacheln .kachel >> nth=2", nr: 3 }, { sel: ".kacheln .kachel >> nth=3", nr: 4 }, { sel: ".kacheln .kachel >> nth=4", nr: 5 }], ausschnitt: { sel: ".kacheln", rand: 20 } },
  { id: "06-statistik-anmeldungen", geraet: "pc", url: "#zahlen", marken: [{ sel: ".karte:has(h2:text-is('Anmeldungen je Monat')) .diagramm", nr: 1 }, { sel: ".karte:has(h2:text-is('Anmeldungen je Monat')) summary", nr: 2 }], ausschnitt: { sel: ".karte:has(h2:text-is('Anmeldungen je Monat'))", rand: 16 } },
  { id: "06-statistik-tooltip", geraet: "pc", url: "#zahlen", vorher: async (page, h) => { const g = page.locator(".karte:has(h2:text-is('Anmeldungen je Monat')) .d-punkt").nth(10); await g.scrollIntoViewIfNeeded(); await g.hover(); await h.warte(300); },
    ausschnitt: { sel: ".raster.zwei >> nth=0", rand: 30, maxHoehe: 520 } },
  { id: "06-statistik-tabelle", geraet: "pc", url: "#zahlen", vorher: async (page, h) => { await page.evaluate(() => { document.querySelectorAll("details.als-tabelle").forEach((d, i) => { d.open = i === 1; }); }); await h.warte(300); },
    marken: [{ sel: ".karte:has(h2:text-is('Bestehensquote Praxis')) summary", nr: 1 }, { sel: ".karte:has(h2:text-is('Bestehensquote Praxis')) table", nr: 2 }], ausschnitt: { sel: ".karte:has(h2:text-is('Bestehensquote Praxis'))", rand: 16, maxHoehe: 1400 } },
  { id: "06-statistik-praxis", geraet: "pc", url: "#zahlen", marken: [{ sel: ".karte:has(h2:text-is('Bestehensquote Praxis')) .diagramm", nr: 1 }], ausschnitt: { sel: ".karte:has(h2:text-is('Bestehensquote Praxis'))", rand: 16 } },
  { id: "06-statistik-theorie", geraet: "pc", url: "#zahlen", marken: [{ sel: ".karte:has(h2:text-is('Bestehensquote Theorie')) .diagramm", nr: 1 }, { sel: ".karte:has(h2:text-is('Bestehensquote Theorie')) .leise.klein >> nth=-1", nr: 2 }], ausschnitt: { sel: ".karte:has(h2:text-is('Bestehensquote Theorie'))", rand: 16 } },
  { id: "06-statistik-auslastung", geraet: "pc", url: "#zahlen", marken: [{ sel: ".karte:has(h2:has-text('Auslastung der Fahrlehrer')) .hbalken", nr: 1 }], ausschnitt: { sel: ".karte:has(h2:has-text('Auslastung der Fahrlehrer'))", rand: 16 } },
  { id: "06-statistik-geld", geraet: "pc", url: "#zahlen", marken: [{ sel: ".karte:has-text('Offenes Geld und Verkäufe') tr >> nth=0", nr: 1 }, { sel: ".karte:has-text('Offenes Geld und Verkäufe') tr >> nth=2", nr: 2 }, { sel: ".karte:has-text('Offenes Geld und Verkäufe') tr >> nth=3", nr: 3 }, { sel: ".karte:has-text('Offenes Geld und Verkäufe') tr >> nth=4", nr: 4 }], ausschnitt: { sel: ".karte:has-text('Offenes Geld und Verkäufe')", rand: 16 } },
  { id: "06-statistik-quote-lehrer", geraet: "pc", url: "#zahlen", marken: [{ sel: "#luQuoteLehrer table", nr: 1 }], ausschnitt: { sel: "#luQuoteLehrer", rand: 16 } },
  { id: "06-statistik-pruefer", geraet: "pc", url: "#zahlen", vorher: async (page, h) => { await page.evaluate(() => { S.pruefungstermine.forEach((p, i) => { if (p.art === "praxis") p.pruefer = ["M. Prüfer", "K. Beispiel", "m. prüfer"][i % 3]; }); zeichne(); }); await h.warte(300); }, marken: [{ sel: "#luPruefer table", nr: 1 }], ausschnitt: { sel: "#luPruefer", rand: 16 } },
  { id: "06-statistik-weitere", geraet: "pc", url: "#zahlen", marken: [{ sel: "#awKarte a[href='#fehler']", nr: 1 }, { sel: "#awKarte a[href='#verlauf']", nr: 2 }], ausschnitt: { sel: "#awKarte", rand: 16 } },
  { id: "06-liste-anmeldungen", geraet: "pc", url: "#zahlen?liste=anmeldungen&monat=2026-11", marken: [{ sel: ".karte-kopf a.knopf", nr: 1 }, { sel: ".marke-pill >> nth=0", nr: 2 }, { sel: "[data-zschueler] >> nth=0", nr: 3 }], ausschnitt: { sel: "#ansicht", rand: 14, maxHoehe: 1300 } },
  { id: "06-liste-praxis", geraet: "pc", url: "#zahlen?liste=praxis&monat=2026-10..2026-12", marken: [{ sel: ".kacheln", nr: 1 }, { sel: "table.tabelle >> nth=0", nr: 2 }, { sel: "h3.abstand-oben", nr: 3 }], ausschnitt: { sel: "#ansicht", rand: 14, maxHoehe: 1500 } },
  { id: "06-liste-theorie", geraet: "pc", url: "#zahlen?liste=theorie&monat=2026-10..2026-12", marken: [{ sel: ".kacheln", nr: 1 }], ausschnitt: { sel: "#ansicht", rand: 14, maxHoehe: 1500 } },
  { id: "06-liste-ue", geraet: "pc", url: "#zahlen?liste=ue&monat=2026-12", marken: [{ sel: ".karte > p.leise.klein", nr: 1 }, { sel: "table.tabelle", nr: 2 }], ausschnitt: { sel: "#ansicht", rand: 14, maxHoehe: 1300 } },
  { id: "06-statistik-handy", geraet: "handy", url: "#zahlen" },
  { id: "06-monatsbericht-dialog", geraet: "pc", url: "#zahlen", hoehe: 700, vorher: async (page, h) => { await h.klick("#kMonatsbericht"); await h.warte(400); },
    marken: [{ sel: `${dlg} select[name=monat]`, nr: 1 }, { sel: ok, nr: 2 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-monatsbericht-pdf", geraet: "pc", url: "#zahlen", hoehe: 1100, vorher: async (page, h) => {
      const html = await page.evaluate(() => luMonatsberichtHTML(luMonatsberichtDaten(KR.todayISO().slice(0, 7))));
      await page.setContent(html); await h.warte(500); },
    ausschnitt: null },
  { id: "06-fehler", geraet: "pc", url: "#fehler", marken: [{ sel: ".aw-kacheln", nr: 1 }, { sel: ".aw-grund", nr: 2 }, { sel: ".karte:has(h2:text-is('Häufigste Durchfallgründe')) details summary", nr: 3 }], ausschnitt: { sel: "#ansicht", rand: 14, maxHoehe: 1500 } },
  { id: "06-fehler-filter", geraet: "pc", url: "#fehler", marken: [{ sel: "#awZeit", nr: 1 }, { sel: "#awLehrer", nr: 2 }], ausschnitt: { sel: ".filterzeile", rand: 24 } },
  { id: "06-verlauf", geraet: "pc", url: "#verlauf", marken: [{ sel: "#awVerlauf", nr: 1 }], ausschnitt: { sel: "#ansicht", rand: 14, maxHoehe: 1300 } },
];

// ---------------------------------------------------------------- Fahrlehrer & Büro
const team = [
  { id: "06-team-ganz", geraet: "pc", url: "#team", vorher: SLUG, marken: [{ sel: ".karte:has(h2:has-text('Fahrlehrer (')) .karte-kopf", nr: 1 }, { sel: ".karte:has(h2:text-is('Büro und Leitung'))", nr: 2 }, { sel: ".karte:has(h2:has-text('Büro-Personen und PIN'))", nr: 3 }], ausschnitt: { sel: "#ansicht", rand: 16, maxHoehe: 3600 } },
  { id: "06-team-fahrlehrer", geraet: "pc", url: "#team", hoehe: 1000, vorher: async (page, h) => { await SLUG(page, h); await page.evaluate(() => { for (const l of [...S.lehrer, ...S.team]) if (l.id === "fl-1") { l.fortbildung_bis = "2026-12-20"; } zeichne(); }); await h.warte(300); },
    marken: [{ sel: "#tNeuFl", nr: 1 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=0 >> td >> nth=0", nr: 2 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=0 >> .fl-frist >> nth=0", nr: 3 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=0 >> td >> nth=2", nr: 4 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=0 >> td >> nth=4", nr: 5 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=0 >> .aktionen-box", nr: 6 }],
    ausschnitt: { sel: ".karte:has(h2:has-text('Fahrlehrer ('))", rand: 14, maxHoehe: 1100 } },
  { id: "06-team-aktionen", geraet: "pc", url: "#team", vorher: SLUG, marken: [{ sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=1 >> [data-flakte] >> nth=1", nr: 1 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=1 >> [data-buchlink]", nr: 2 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=1 >> [data-einladung]", nr: 3 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=1 >> [data-pwreset]", nr: 4 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=1 >> [data-zbearb]", nr: 5 }, { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=1 >> [data-zloesch]", nr: 6 }],
    ausschnitt: { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=1", rand: 18 } },
  { id: "06-team-fl-anlegen", geraet: "pc", url: "#team", hoehe: 900, vorher: async (page, h) => { await h.klick("#tNeuFl"); await h.tippe(`${dlg} input[name=name]`, "Max Muster"); await h.tippe(`${dlg} input[name=email]`, "max@example.org"); await h.warte(200); },
    marken: [{ sel: `${dlg} input[name=name]`, nr: 1 }, { sel: `${dlg} input[name=ohneapp]`, nr: 2 }, { sel: `${dlg} input[name=email]`, nr: 3 }, { sel: `${dlg} .klassen-wahl`, nr: 4 }, { sel: ok, nr: 5 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-fl-ohneapp", geraet: "pc", url: "#team", hoehe: 900, vorher: async (page, h) => { await h.klick("#tNeuFl"); await h.tippe(`${dlg} input[name=name]`, "Max Muster"); await page.locator(`${dlg} input[name=ohneapp]`).check(); await h.warte(300); },
    marken: [{ sel: `${dlg} input[name=ohneapp]`, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-buero-anlegen", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("#tNeuBu"); await h.tippe(`${dlg} input[name=name]`, "Erika Muster"); await h.tippe(`${dlg} input[name=email]`, "erika@example.org"); await h.warte(200); },
    marken: [{ sel: `${dlg} input[name=name]`, nr: 1 }, { sel: `${dlg} input[name=email]`, nr: 2 }, { sel: ok, nr: 3 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-akte", geraet: "pc", url: "#team", hoehe: 1500, vorher: async (page, h) => { await h.klick("[data-flakte] >> nth=0"); await h.warte(700); },
    marken: [{ sel: `${dlg} .fl-kacheln`, nr: 1 }, { sel: `${dlg} fieldset >> nth=0`, nr: 2 }, { sel: `${dlg} fieldset >> nth=1`, nr: 3 }, { sel: `${dlg} input[name=fuehrerschein_c_bis]`, nr: 4 }, { sel: `${dlg} fieldset >> nth=2`, nr: 5 }, { sel: `${dlg} #protokoll`, nr: 6 }, { sel: ok, nr: 7 }], ausschnitt: { sel: dlg, rand: 14, maxHoehe: 1500 } },
  { id: "06-team-akte-warnung", geraet: "pc", url: "#team", hoehe: 1500, vorher: async (page, h) => { await page.evaluate(() => { const p = S.team.find((x) => x.id === "fl-1"); const q = S.lehrer.find((x) => x.id === "fl-1"); for (const x of [p, q]) if (x) { x.fortbildung_bis = "2026-12-20"; x.sz95_bis = "2026-11-01"; } zeichne(); }); await h.klick("[data-flakte] >> nth=0"); await h.warte(600); },
    marken: [{ sel: `${dlg} .fl-warnung >> nth=0`, nr: 1 }, { sel: `${dlg} .fl-warnung >> nth=1`, nr: 2 }], ausschnitt: { sel: `${dlg}`, rand: 14, maxHoehe: 700 } },
  { id: "06-team-buchungslinks", geraet: "pc", url: "#team", hoehe: 1000, vorher: async (page, h) => { await SLUG(page, h); await h.klick("[data-buchlink] >> nth=0"); await h.warte(500); },
    marken: [{ sel: `${dlg} .lu-link >> nth=0`, nr: 1 }, { sel: `${dlg} [data-lukopie] >> nth=0`, nr: 2 }, { sel: `${dlg} .lu-wahl`, nr: 3 }, { sel: `${dlg} .lu-qr-bild`, nr: 4 }, { sel: `${dlg} [data-luqrdruck]`, nr: 5 }, { sel: `${dlg} [data-luqrbild]`, nr: 6 }], ausschnitt: { sel: dlg, rand: 14, maxHoehe: 1000 } },
  { id: "06-team-qr-blatt", geraet: "pc", url: "#team", vorher: async (page, h) => { await SLUG(page, h); const url = await page.evaluate(() => luQrBlatt(luBuchLink("anton-muster", "schalt"), "schalt", "Anton Muster")); await page.setContent(`<body style="margin:0;background:#fff"><img id="qr" src="${url}" style="width:480px;display:block;border:1px solid #bbb"></body>`); await h.warte(300); },
    ausschnitt: { sel: "#qr", rand: 0 } },
  { id: "06-team-bearbeiten", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("[data-zbearb] >> nth=0"); await h.warte(500); },
    marken: [{ sel: `${dlg} input[name=name]`, nr: 1 }, { sel: `${dlg} select[name=rolle]`, nr: 2 }, { sel: `${dlg} #zbKlassen`, nr: 3 }, { sel: ok, nr: 4 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-bearbeiten-ohneapp", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("tr:has-text('Dario Muster') [data-zbearb]"); await h.warte(500); },
    marken: [{ sel: `${dlg} input[name=email]`, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-loeschen", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick(".karte:has(h2:text-is('Büro und Leitung')) [data-zloesch] >> nth=0"); await h.warte(700); },
    marken: [{ sel: ok, nr: 1 }, { sel: `${dlg} footer button >> nth=0`, nr: 2 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-loeschen-offen", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("[data-zloesch] >> nth=0"); await h.warte(700); },
    marken: [{ sel: ok, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-passwort", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("[data-pwreset] >> nth=0"); await h.warte(500); },
    marken: [{ sel: ok, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-zugangsdaten", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await page.evaluate(() => zeigePasswort("max@example.org", "Beispiel-Passwort-123")); await h.warte(500); },
    marken: [{ sel: `${dlg} input >> nth=0`, nr: 1 }, { sel: `${dlg} #pwFeld`, nr: 2 }, { sel: ok, nr: 3 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-einladung", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("[data-einladung] >> nth=0"); await h.warte(500); },
    marken: [{ sel: ok, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-sperren", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await page.evaluate(() => { S.profil.rolle = "super_admin"; zeichne(); }); await h.warte(300); await h.klick("[data-sperren] >> nth=0"); await h.warte(500); },
    marken: [{ sel: ok, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-team-sperren-knopf", geraet: "pc", url: "#team", hoehe: 900, vorher: async (page, h) => { await page.evaluate(() => { S.profil.rolle = "super_admin"; zeichne(); }); await h.warte(300); },
    marken: [{ sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=0 >> [data-sperren]", nr: 1 }], ausschnitt: { sel: ".karte:has(h2:has-text('Fahrlehrer (')) tbody tr >> nth=0", rand: 18 } },
  { id: "06-team-buero-karte", geraet: "pc", url: "#team", marken: [{ sel: "#tNeuBu", nr: 1 }, { sel: ".karte:has(h2:text-is('Büro und Leitung')) table", nr: 2 }], ausschnitt: { sel: ".karte:has(h2:text-is('Büro und Leitung'))", rand: 16 } },
  { id: "06-team-ohne-recht", geraet: "pc", rolle: "buero", pin: true, vorher: async (page, h) => { await page.evaluate(() => { S.sitzung = { token: "x", id: "bp-3", name: "Paula Muster", verwalten: false }; S.werAnzeige = "Paula Muster"; zeichne(); }); await h.geh("#team"); await TEL(page); await h.warte(500); },
    marken: [{ sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) .leise.klein >> nth=-1", nr: 1 }], ausschnitt: { sel: ".karte:has(h2:has-text('Büro-Personen und PIN'))", rand: 16 } },
  // ---- Büro-Personen und PIN
  { id: "06-personen", geraet: "pc", url: "#team", vorher: async (page, h) => { await TEL(page); await h.warte(300); }, marken: [{ sel: "#pNeu", nr: 1 }, { sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) tbody tr >> nth=0 >> td >> nth=2", nr: 2 }, { sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) tbody tr >> nth=0 >> td >> nth=3", nr: 3 }, { sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) tbody tr >> nth=0 >> [data-pbearb]", nr: 4 }, { sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) tbody tr >> nth=0 >> [data-preset]", nr: 5 }, { sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) tbody tr >> nth=3 >> [data-preset]", nr: 6 }], ausschnitt: { sel: ".karte:has(h2:has-text('Büro-Personen und PIN'))", rand: 16 } },
  { id: "06-person-neu", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("#pNeu"); await h.tippe(`${dlg} input[name=name]`, "Erika"); await h.tippe(`${dlg} input[name=telefon]`, "0170 0000000"); await h.warte(200); },
    marken: [{ sel: `${dlg} input[name=name]`, nr: 1 }, { sel: `${dlg} input[name=telefon]`, nr: 2 }, { sel: `${dlg} input[name=verwalten]`, nr: 3 }, { sel: ok, nr: 4 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-person-bearbeiten", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await TEL(page); await h.klick("[data-pbearb] >> nth=2"); await h.warte(500); },
    marken: [{ sel: `${dlg} #pAustritt`, nr: 1 }, { sel: ok, nr: 2 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-person-austritt", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await TEL(page); await h.klick("[data-pbearb] >> nth=2"); await h.klick("#pAustritt"); await h.warte(600); },
    marken: [{ sel: ok, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-person-pin-zuruecksetzen", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick("[data-preset] >> nth=0"); await h.warte(600); },
    marken: [{ sel: ok, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-person-pin-freigeben", geraet: "pc", url: "#team", hoehe: 800, vorher: async (page, h) => { await h.klick(".karte:has(h2:has-text('Büro-Personen und PIN')) tr:has-text('Tom Muster') [data-preset]"); await h.warte(600); },
    marken: [{ sel: ok, nr: 1 }], ausschnitt: { sel: dlg, rand: 14 } },
  { id: "06-person-zurueck", geraet: "pc", url: "#team", vorher: async (page, h) => { await page.evaluate(() => { S.personen.find((p) => p.id === "bp-3").aktiv = false; }); await TEL(page); await h.warte(300); },
    marken: [{ sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) [data-pzurueck]", nr: 1 }, { sel: ".karte:has(h2:has-text('Büro-Personen und PIN')) .marke-pill:has-text('ausgetreten')", nr: 2 }], ausschnitt: { sel: ".karte:has(h2:has-text('Büro-Personen und PIN'))", rand: 16 } },
];

// ---------------------------------------------------------------- Einstellungen
const einstellungen = [
  { id: "06-einst-uebersicht", geraet: "pc", url: "#einstellungen", marken: [{ sel: ".es-themen", nr: 1 }, { sel: ".es-themen .es-thema[aria-current]", nr: 2 }, { sel: ".es-inhalt", nr: 3 }], ausschnitt: { sel: "#ansicht", rand: 16, maxHoehe: 1100 }, hoehe: 900 },
  { id: "06-einst-liste", geraet: "pc", url: "#einstellungen", hoehe: 900, marken: [{ sel: ".es-themen", nr: 1 }], ausschnitt: { sel: ".es-themen", rand: 16 } },
  { id: "06-einst-handy-liste", geraet: "handy", url: "#einstellungen" },
  { id: "06-einst-handy-thema", geraet: "handy", url: einst("fristen"), marken: [{ sel: ".es-zurueck", nr: 1 }] },
  { id: "06-einst-buero-liste", geraet: "pc", rolle: "buero", pin: true, url: "#einstellungen", hoehe: 900, marken: [{ sel: ".es-themen", nr: 1 }], ausschnitt: { sel: ".es-themen", rand: 16 } },
  { id: "06-einst-fahrschule", geraet: "pc", url: einst("fahrschule"), marken: [{ sel: ".es-zeile >> nth=0", nr: 1 }, { sel: "#esUe", nr: 2 }, { sel: ".es-fuss", nr: 3 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 900 } },
  { id: "06-einst-preise", geraet: "pc", url: einst("preise"), hoehe: 900, marken: [{ sel: ".es-link >> nth=0", nr: 1 }, { sel: ".es-link >> nth=1", nr: 2 }, { sel: "#esReakt", nr: 3 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1100 } },
  { id: "06-einst-zahlungen", geraet: "pc", url: einst("zahlungen"), hoehe: 1500, marken: [{ sel: "#zmForm fieldset", nr: 1 }, { sel: "#zmForm input[name=test_email]", nr: 2 }, { sel: "#zmForm input[name=kontoinhaber]", nr: 3 }, { sel: "#zmForm input[name=iban]", nr: 4 }, { sel: "#zmForm textarea[name=impressum]", nr: 5 }, { sel: "#zmSpeichern", nr: 6 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1500 } },
  { id: "06-einst-belege", geraet: "pc", url: einst("belege"), hoehe: 1500, marken: [{ sel: "#belegEinst input[name=name]", nr: 1 }, { sel: "#belegEinst input[name=steuernummer]", nr: 2 }, { sel: "#belegEinst input[name=ausweisen]", nr: 3 }, { sel: "#belegEinst input[name=bargeld]", nr: 4 }, { sel: "#belegEinst button[type=submit]", nr: 5 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1500 } },
  { id: "06-einst-punkte", geraet: "pc", url: einst("punkte"), hoehe: 1300, marken: [{ sel: "#punkteEinst input[name=aktiv]", nr: 1 }, { sel: "#punkteEinst [data-neu=regeln]", nr: 2 }, { sel: "#punkteEinst [data-neu=praemien]", nr: 3 }, { sel: "#punkteEinst input[name=verschenken]", nr: 4 }, { sel: "#punkteEinst textarea[name=bedingungen]", nr: 5 }, { sel: "#punkteEinst button[type=submit]", nr: 6 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1400 } },
  { id: "06-einst-punkte-eintrag", geraet: "pc", url: einst("punkte"), hoehe: 1300, vorher: async (page, h) => { await h.klick("[data-neu=regeln]"); await h.tippe(".punkte-edit[data-art=regeln] [data-feld=name]", "Theorie bestanden"); await h.tippe(".punkte-edit[data-art=regeln] [data-feld=punkte]", "50"); await h.klick("[data-neu=praemien]"); await h.tippe(".punkte-edit[data-art=praemien] [data-feld=name]", "Eine Fahrstunde gratis"); await h.tippe(".punkte-edit[data-art=praemien] [data-feld=punkte]", "500"); },
    marken: [{ sel: ".punkte-edit[data-art=regeln]", nr: 1 }, { sel: ".punkte-edit[data-art=regeln] [data-weg]", nr: 2 }, { sel: ".punkte-edit[data-art=praemien]", nr: 3 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1400 } },
  { id: "06-einst-fristen", geraet: "pc", url: einst("fristen"), hoehe: 1250, marken: [{ sel: ".esf-zeile >> nth=0 >> .esf-text", nr: 1 }, { sel: "#esf-reaktivierung-monate", nr: 2 }, { sel: "#esf-reaktivierung-bald_tage", nr: 3 }, { sel: "#esf-reaktivierung-vorwarn_tage", nr: 4 }, { sel: ".esf-par >> nth=0", nr: 5 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 600 } },
  { id: "06-einst-fristen-ganz", geraet: "pc", url: einst("fristen"), hoehe: 1250, marken: [{ sel: "[data-esf-speichern]", nr: 1 }, { sel: "[data-esf-status]", nr: 2 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1400 } },
  { id: "06-einst-fristen-geaendert", geraet: "pc", url: einst("fristen"), hoehe: 1250, vorher: async (page, h) => { await h.tippe("#esf-reaktivierung-monate", "9"); await page.locator("#esf-reaktivierung-monate").dispatchEvent("input"); await h.warte(300); },
    marken: [{ sel: "#esf-reaktivierung-monate", nr: 1 }, { sel: "[data-esf-warn=reaktivierung]", nr: 2 }, { sel: "[data-esf-standard=reaktivierung]", nr: 3 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 600 } },
  { id: "06-einst-fristen-fehler", geraet: "pc", url: einst("fristen"), hoehe: 1250, vorher: async (page, h) => { await h.tippe("#esf-theorie-bald_tage", "999"); await page.locator("#esf-theorie-bald_tage").dispatchEvent("input"); await h.warte(300); },
    marken: [{ sel: "[data-esf-fehler=theorie]", nr: 1 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 800 } },
  { id: "06-einst-vorlagen", geraet: "pc", url: einst("vorlagen"), hoehe: 1300, marken: [{ sel: "[data-esv-gruppe=zahlungen]", nr: 1 }, { sel: "[data-esv-kopf=pruefung]", nr: 2 }, { sel: "[data-esv-gruppe=erinnerungen]", nr: 3 }, { sel: "[data-esv-speichern]", nr: 4 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1600 } },
  { id: "06-einst-vorlage-offen", geraet: "pc", url: einst("vorlagen"), hoehe: 1500, vorher: async (page, h) => { await h.klick("[data-esv-kopf=pruefung]"); await h.warte(400); },
    marken: [{ sel: "[data-esv-feld=text]", nr: 1 }, { sel: ".esv-platz", nr: 2 }, { sel: "[data-esv-feld=text_eltern]", nr: 3 }, { sel: ".esv-schalter", nr: 4 }, { sel: "[data-esv-vorschau]", nr: 5 }, { sel: "[data-esv-standard]", nr: 6 }, { sel: "[data-esv-speichern-hier]", nr: 7 }], ausschnitt: { sel: ".esv-eintrag:has([data-esv-kopf=pruefung])", rand: 14, maxHoehe: 1700 } },
  { id: "06-einst-vorlage-geaendert", geraet: "pc", url: einst("vorlagen"), hoehe: 1500, vorher: async (page, h) => { await h.klick("[data-esv-kopf=pruefung]"); await page.locator("[data-esv-platz=Vorname]").click(); await h.warte(300); },
    marken: [{ sel: "[data-esv-marken=pruefung]", nr: 1 }, { sel: "[data-esv-feld=text]", nr: 2 }], ausschnitt: { sel: ".esv-eintrag:has([data-esv-kopf=pruefung])", rand: 14, maxHoehe: 700 } },
  { id: "06-einst-kalender", geraet: "pc", url: einst("kalender"), hoehe: 900, marken: [{ sel: "#esMinuten", nr: 1 }, { sel: "form[data-es-ke=minuten] button[type=submit]", nr: 2 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 900 } },
  { id: "06-einst-kalender-fehler", geraet: "pc", url: einst("kalender"), hoehe: 900, vorher: async (page, h) => { await h.tippe("#esMinuten", "500"); await h.klick("form[data-es-ke=minuten] button[type=submit]"); await h.warte(500); },
    marken: [{ sel: "#esMinutenFehler", nr: 1 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 900 } },
  { id: "06-einst-loeschen", geraet: "pc", url: einst("loeschen"), hoehe: 1000, marks: 0, marken: [{ sel: "#esTage", nr: 1 }, { sel: "#esSekunden", nr: 2 }, { sel: "form[data-es-ke=tage] button[type=submit]", nr: 3 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 1200 } },
  { id: "06-einst-team", geraet: "pc", url: einst("team"), hoehe: 800, marken: [{ sel: ".es-link >> nth=0", nr: 1 }, { sel: ".es-link >> nth=1", nr: 2 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 700 } },
  { id: "06-einst-sicherheit", geraet: "pc", rolle: "buero", pin: true, url: einst("sicherheit"), hoehe: 800, marken: [{ sel: "[data-es-pin]", nr: 1 }, { sel: "[data-es-sperren]", nr: 2 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 700 } },
  { id: "06-einst-sicherheit-leitung", geraet: "pc", url: einst("sicherheit"), hoehe: 800, marken: [{ sel: ".es-leer", nr: 1 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 700 } },
  { id: "06-einst-backups", geraet: "pc", url: einst("backups"), hoehe: 800, marken: [{ sel: ".es-link", nr: 1 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 700 } },
  { id: "06-einst-darstellung", geraet: "pc", url: einst("darstellung"), hoehe: 900, marken: [{ sel: ".es-zeile >> nth=0", nr: 1 }, { sel: ".ks-start", nr: 2 }, { sel: "[data-ks-start=buero]", nr: 3 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 900 } },
  { id: "06-einst-darstellung-buero", geraet: "pc", rolle: "buero", pin: true, url: einst("darstellung"), hoehe: 800, marken: [{ sel: ".es-satz", nr: 1 }], ausschnitt: { sel: ".es-inhalt", rand: 14, maxHoehe: 700 } },
];

// ---------------------------------------------------------------- Backups
const BACKUPS = () => {
  const z = { schueler: 24, kalender_termine: 311, kalender_pruefungen: 18, pruefungstermine: 22, zahlungsbelege: 37, fahrschule_einstellungen: 6, schueler_notizen: 4, schueler_aufgaben: 7, fahrschule_pakete: 2, fahrschule_preise: 9 };
  const mk = (id, vor, anlass, auto, extra) => ({ id, erstellt_am: new Date(Date.now() - vor * 3600000).toISOString(), automatisch: auto, format: 2, anlass, zaehlung: z, arten: {}, groesse_bytes: 412000, ...(extra || {}) });
  return [mk("b1", 8, "nacht", true), mk("b2", 20, "hand", false), mk("b3", 32, "nacht", true), mk("b4", 56, "nacht", true), mk("b5", 80, "vor_wiederherstellung", false), { ...mk("b6", 200, null, true), format: 1, zaehlung: { schueler: 20, kalender_termine: 250 } }];
};
const backupSetzen = async (page, h) => {
  await page.evaluate((b) => { VW.backups = b; VW.fsId = S.fsId; VW.stand.backups = Date.now(); zeichne(); }, BACKUPS());
  await h.warte(400);
};
const backups = [
  { id: "06-backups", geraet: "pc", url: "#backups", hoehe: 1000, vorher: async (page, h) => { await h.geh("#backups"); await backupSetzen(page, h); },
    marken: [{ sel: ".karte-kopf h2", nr: 1 }, { sel: "#vwBackupJetzt", nr: 2 }, { sel: ".vw-warn", nr: 3 }, { sel: ".vw-backups tbody tr >> nth=0 >> td >> nth=1", nr: 4 }, { sel: "[data-vwbackupsieh] >> nth=0", nr: 5 }, { sel: "[data-vwbackuplade] >> nth=0", nr: 6 }], ausschnitt: { sel: "#ansicht", rand: 16, maxHoehe: 1400 } },
  { id: "06-backups-leer", geraet: "pc", url: "#backups", hoehe: 700, vorher: async (page, h) => { await h.geh("#backups"); await page.evaluate(() => { VW.backups = []; VW.fsId = S.fsId; VW.stand.backups = Date.now(); zeichne(); }); await h.warte(300); },
    marken: [{ sel: ".leer", nr: 1 }], ausschnitt: { sel: "#ansicht", rand: 16, maxHoehe: 700 } },
  { id: "06-backup-ansehen", geraet: "pc", url: "#backups", hoehe: 1200, vorher: async (page, h) => { await h.geh("#backups"); await backupSetzen(page, h); await h.klick("[data-vwbackupsieh] >> nth=0"); await h.warte(400); },
    marken: [{ sel: `${dlg} .vw-inhalt >> nth=0`, nr: 1 }, { sel: `${dlg} .vw-modus`, nr: 2 }, { sel: ok, nr: 3 }], ausschnitt: { sel: dlg, rand: 14, maxHoehe: 1200 } },
  { id: "06-backup-vorschau", geraet: "pc", url: "#backups", hoehe: 1300, vorher: async (page, h) => {
      await h.geh("#backups"); await backupSetzen(page, h);
      await page.evaluate(() => { __FAKE.rpcs.fahrschule_backup_vorschau = ({ modus }) => ({ ok: true, wiederherstellbar: true, darf_wiederherstellen: true, modus, einfuegen: 2, aendern: 1, loeschen: 0, code: "K7M2QX", bleibt_fest: 0,
        tabellen: [{ tabelle: "schueler", einfuegen: 2, aendern: 1, loeschen: 0, art: "normal", gewaehlt: true, zuviel: 0 }] }); });
      await h.klick("[data-vwbackupsieh] >> nth=0"); await h.klick(ok); await h.warte(600); },
    marken: [{ sel: `${dlg} #vwVorschau b >> nth=0`, nr: 1 }, { sel: `${dlg} .vw-code`, nr: 2 }, { sel: `${dlg} input[name=code]`, nr: 3 }, { sel: ok, nr: 4 }], ausschnitt: { sel: dlg, rand: 14, maxHoehe: 1300 } },
  { id: "06-backup-handy", geraet: "handy", url: "#backups", vorher: async (page, h) => { await h.geh("#backups"); await backupSetzen(page, h); } },
];

export default alle([...statistik, ...team, ...einstellungen, ...backups]);
