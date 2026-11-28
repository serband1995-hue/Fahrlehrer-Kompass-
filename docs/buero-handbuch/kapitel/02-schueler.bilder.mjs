// Kapitel 2: Schüler und Akte. Marken in Fenstern setzt mk() selbst (die eingebauten Marken liegen hinter dem Fenster).
const TOP = "dialog[open]:last-of-type";
const zeile = (n) => `tr:has-text("${n}")`;
const akte = (n) => async (p, h) => { await h.klick(`${zeile(n)} [data-sbearb]`); };
// Marken im obersten Fenster: Rahmen + Nummer, fest an der Fensterstelle
async function mk(p, liste, wurzel = TOP) {
  await p.evaluate(({ liste, wurzel }) => {
    const w = document.querySelector(wurzel) || document.body;
    for (const m of liste) {
      const e = document.querySelector(m.sel) || [...document.querySelectorAll(m.sel.startsWith("text=") ? "*" : "x")].find(() => false);
      if (!e) { console.log("Marke fehlt " + m.sel); continue; }
      const b = e.getBoundingClientRect(), pad = 4;
      const box = document.createElement("div");
      Object.assign(box.style, { position: "fixed", left: b.left - pad + "px", top: b.top - pad + "px", width: b.width + pad * 2 + "px", height: b.height + pad * 2 + "px", border: "3px solid #d6202a", borderRadius: "10px", zIndex: 2147483646, pointerEvents: "none", boxShadow: "0 0 0 2px rgba(255,255,255,.85)" });
      w.appendChild(box);
      const n = document.createElement("div"); n.textContent = m.nr; const s = 26;
      Object.assign(n.style, { position: "fixed", left: Math.max(2, b.left - pad - s / 2 - 2) + "px", top: Math.max(2, b.top - pad - s / 2 - 2) + "px", width: s + "px", height: s + "px", borderRadius: "50%", background: "#d6202a", color: "#fff", font: "700 15px/26px Arial, sans-serif", textAlign: "center", zIndex: 2147483647, pointerEvents: "none", boxShadow: "0 0 0 2px #fff" });
      w.appendChild(n);
    }
  }, { liste, wurzel });
}
const seite = (extra) => async (p, h) => { await h.warte(200); if (extra) await extra(p, h); };
const inDlg = async (p, sel) => { await p.locator(`${TOP} ${sel}`).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(250); };
const PK = "#ansicht .karte";
// Nachweis kürzen: nur die ersten 3 gefahrenen Stunden zeigen (die Liste wiederholt sich), Verlauf-Einträge als Beispiel
async function nwKurz(p, h, mitSpur) {
  await p.evaluate((mitSpur) => {
    document.querySelectorAll("dialog[open] #nwInhalt > .nw-liste .nw-zeile").forEach((z, i) => { if (i >= 3) z.style.display = "none"; });
    if (mitSpur) { /* nur Anzeige: Beispielzeilen im Verlauf */
      const ul = document.querySelector("dialog[open] .nw-spur");
      const det = [...document.querySelectorAll("dialog[open] .nw-details")].find((d) => /Verlauf/.test(d.textContent));
      if (det) { det.open = true; const t = det.querySelector("p.leise"); const li = (x) => `<li>${x}</li>`; const html = `<ul class="nw-spur">${li("02.12.2026, 09:12 · Mia Muster: Stunde vom 30.11.2026 · Beginn 07:30 → 07:45 · Grund: „Uhrzeit war falsch eingetragen“")}${li("02.12.2026, 09:05 · Mia Muster: Stunde vom 27.11.2026 · Fahrstunde nachgetragen (Übungsfahrt (Grundausbildung))")}${li("01.12.2026, 16:40 · Noah Muster: Stunde vom 28.11.2026 · Unterschrift ungültig oder entfernt")}</ul>`; if (t) t.outerHTML = html; else if (!ul) det.insertAdjacentHTML("beforeend", html); }
    }
    document.querySelectorAll("dialog[open] .nw-details").forEach((d) => { d.open = true; });
  }, mitSpur);
  await h.warte(300);
}
// Punktesystem für die Bilder einschalten (Vorführung: Einstellungen im Speicher), Regeln und Prämien als Beispiel
async function punkteAn(p, h) {
  await p.evaluate(async () => {
    await KE.setze(supa, S.fsId, "punkte.system", { aktiv: true, verschenken: true, bedingungen: "Punkte verfallen nach 12 Monaten." });
    await KE.setze(supa, S.fsId, "punkte.regeln", { liste: [{ id: "r1", name: "Theorie bestanden", punkte: 50 }, { id: "r2", name: "Freund geworben", punkte: 100 }] });
    await KE.setze(supa, S.fsId, "punkte.praemien", { liste: [{ id: "p1", name: "Eine Fahrstunde gratis", punkte: 200 }] });
    await supa.from("schueler_punkte").insert({ fahrschule_id: S.fsId, schueler_id: "s4", art: "vergeben", punkte: 50, grund: "Theorie bestanden" });
    await supa.from("schueler_punkte").insert({ fahrschule_id: S.fsId, schueler_id: "s4", art: "vergeben", punkte: 100, grund: "Freund geworben" });
    zeichne();
  });
  await h.warte(500);
}

export default [
  // ---------- Liste ----------
  { id: "02-liste", url: "#schueler", hoehe: 900, ausschnitt: { sel: PK, maxHoehe: 640 },
    marken: [{ sel: ".tabs", nr: 1 }, { sel: "#sKlasse", nr: 2 }, { sel: "#sNotiz", nr: 3 }, { sel: "#sLehrer", nr: 4 }, { sel: "#sSuche", nr: 5 }, { sel: "#sNeu", nr: 6 }] },
  { id: "02-liste-kopf", url: "#schueler", hoehe: 900, ausschnitt: { sel: ".schuelertab thead", rand: 10 },
    marken: [{ sel: ".schuelertab th:nth-child(1)", nr: 1 }, { sel: ".schuelertab th:nth-child(2)", nr: 2 }, { sel: ".schuelertab th:nth-child(4)", nr: 3 }, { sel: ".schuelertab th:nth-child(6)", nr: 4 }] },
  { id: "02-liste-zeile", url: "#schueler?suche=Jonas", hoehe: 700, ausschnitt: { sel: ".schuelertab tbody tr", rand: 10 },
    marken: [{ sel: ".schuelertab tbody tr .name-zeile", nr: 1 }, { sel: ".schuelertab tbody tr .kundennr", nr: 2 }, { sel: ".schuelertab tbody tr td:nth-child(2)", nr: 3 }, { sel: ".schuelertab tbody tr td:nth-child(4)", nr: 4 }, { sel: ".schuelertab tbody tr td:nth-child(6)", nr: 5 }, { sel: ".schuelertab tbody tr [data-sbearb]", nr: 6 }] },
  { id: "02-liste-gesperrt", url: "#schueler?suche=Ben", hoehe: 700, ausschnitt: { sel: ".schuelertab tbody tr", rand: 10 },
    marken: [{ sel: ".schuelertab tbody tr td:nth-child(6) .marke-pill", nr: 1 }, { sel: "[data-zsperre]", nr: 2 }, { sel: "[data-sbeleg]", nr: 3 }] },
  { id: "02-liste-ohne-lehrer", url: "#schueler?lehrer=ohne", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 560 },
    marken: [{ sel: "#sLehrer", nr: 1 }, { sel: ".schuelertab tbody tr .marke-pill.rot", nr: 2 }] },
  { id: "02-menue-zahl", url: "#schueler", hoehe: 900, ausschnitt: { sel: "#nav", rand: 6, maxHoehe: 420 }, marken: [{ sel: '.nav-punkt[href="#schueler"] .zahl', nr: 1 }] },
  { id: "02-filter-klasse", url: "#schueler?klasse=CE", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 520 }, marken: [{ sel: "#sKlasse", nr: 1 }] },
  { id: "02-filter-notiz", url: "#schueler?notiz=offen", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 560 }, marken: [{ sel: "#sNotiz", nr: 1 }, { sel: ".notiz-pill, .schuelertab tbody tr .marke-pill.rot", nr: 2 }] },
  { id: "02-filter-theorie", url: "#schueler?notiz=theorie", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 520 }, marken: [{ sel: "#sNotiz", nr: 1 }] },
  { id: "02-suche", url: "#schueler", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 520 },
    vorher: async (p, h) => { await h.tippe("#sSuche", "K-00019"); await h.warte(700); }, marken: [{ sel: "#sSuche", nr: 1 }] },
  { id: "02-reiter-archiv", url: "#schueler?sicht=inaktiv", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 560 }, marken: [{ sel: ".tabs a:nth-child(3)", nr: 1 }, { sel: ".schuelertab tbody tr .unter", nr: 2 }] },
  { id: "02-reiter-warte", url: "#schueler?sicht=warte", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 460 }, marken: [{ sel: ".tabs a:nth-child(2)", nr: 1 }] },
  { id: "02-reiter-alle", url: "#schueler?sicht=alle", hoehe: 700, ausschnitt: { sel: PK, maxHoehe: 460 }, marken: [{ sel: ".tabs a:nth-child(4)", nr: 1 }] },
  { id: "02-testfahrt", url: "#schueler?suche=Max", hoehe: 700, ausschnitt: { sel: ".schuelertab tbody tr", rand: 10 },
    marken: [{ sel: ".schuelertab tbody tr .marke-pill.gelb", nr: 1 }, { sel: "[data-testfahrt]", nr: 2 }] },
  { id: "02-liste-handy", url: "#schueler", geraet: "handy", hoehe: 915 },
  { id: "02-druck-liste", url: "#schueler?klasse=B78", hoehe: 900, vorher: async (p, h) => { await p.emulateMedia({ media: "print" }); await p.evaluate(() => fuelleDruckKopf()); await h.warte(300); } },
  { id: "02-druck-knopf", url: "#schueler", hoehe: 700, ausschnitt: { sel: "header, .kopf", rand: 10, maxHoehe: 160 }, marken: [{ sel: "#drucken", nr: 1 }] },

  // ---------- Schüler anlegen ----------
  { id: "02-neu-oben", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await h.klick("#sNeu"); await mk(p, [
      { sel: `${TOP} [name=name]`, nr: 1 }, { sel: `${TOP} [name=strasse]`, nr: 2 }, { sel: `${TOP} [name=plz]`, nr: 3 }, { sel: `${TOP} [name=ort]`, nr: 4 }, { sel: `${TOP} [name=telefon]`, nr: 5 }, { sel: `${TOP} [name=email]`, nr: 6 },
      { sel: `${TOP} [name=eltern_email]`, nr: 7 }, { sel: `${TOP} [name=fahrlehrer_id]`, nr: 8 }, { sel: `${TOP} [name=ausbildungsart]`, nr: 9 }, { sel: `${TOP} [name=klasse]`, nr: 10 }, { sel: `${TOP} [name=vertrag_am]`, nr: 11 }]); } },
  { id: "02-neu-unten", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await h.klick("#sNeu"); await inDlg(p, ".dialog-inhalt p.leise:last-child"); await mk(p, [
      { sel: `${TOP} .bk-anmeldung`, nr: 1 }, { sel: `${TOP} #umschreiberFeld, ${TOP} fieldset.raster-feld`, nr: 2 }, { sel: `${TOP} [name=buero_notiz]`, nr: 3 }, { sel: `${TOP} footer button[value=ok]`, nr: 4 }, { sel: `${TOP} footer button:not([value])`, nr: 5 }]); } },
  { id: "02-neu-behoerde", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} fieldset.raster-feld`, rand: 14 }, vorher: async (p, h) => { await h.klick("#sNeu"); await inDlg(p, "fieldset.raster-feld"); await mk(p, [
      { sel: `${TOP} [name=bewerbernummer]`, nr: 1 }, { sel: `${TOP} [name=theorie_frist_bis]`, nr: 2 }, { sel: `${TOP} [name=sehhilfe]`, nr: 3 }, { sel: `${TOP} .vorbesitz-wahl`, nr: 4 }]); } },
  { id: "02-neu-umschreibung", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #umschreiberFeld`, rand: 14 }, vorher: async (p, h) => { await h.klick("#sNeu"); await p.selectOption(`${TOP} [name=ausbildungsart]`, "umschreibung"); await p.fill(`${TOP} [data-afs=land]`, "Türkei"); await p.fill(`${TOP} [data-afs=klasse]`, "B"); await h.warte(300); await inDlg(p, "#umschreiberFeld"); await mk(p, [
      { sel: `${TOP} .afs-zeile`, nr: 1 }, { sel: `${TOP} #afsNeu`, nr: 2 }, { sel: `${TOP} [name=wohnsitz_de_seit]`, nr: 3 }, { sel: `${TOP} [name=uebersetzung_vorhanden]`, nr: 4 }, { sel: `${TOP} #afsHinweis`, nr: 5 }]); } },
  { id: "02-neu-b197", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #b197Feld`, rand: 20 }, vorher: async (p, h) => { await h.klick("#sNeu"); await p.selectOption(`${TOP} [name=klasse]`, "B197"); await p.check(`${TOP} [name=testfahrt]`); await h.warte(250); await inDlg(p, "#b197Feld"); await mk(p, [{ sel: `${TOP} [name=testfahrt]`, nr: 1 }, { sel: `${TOP} [name=testfahrt_am]`, nr: 2 }]); } },
  { id: "02-neu-doppelt", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await h.klick("#sNeu"); await p.fill(`${TOP} [name=name]`, "Max Muster"); await p.fill(`${TOP} [name=telefon]`, "0170 0000008"); await h.klick(`${TOP} footer button[value=ok]`, { warte: 700 }); } },
  { id: "02-neu-plz-fehler", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await h.klick("#sNeu"); await p.fill(`${TOP} [name=name]`, "Max Muster"); await p.fill(`${TOP} [name=plz]`, "123"); await p.evaluate(() => { document.querySelector("dialog[open] [name=plz]").removeAttribute("pattern"); }); await h.klick(`${TOP} footer button[value=ok]`, { warte: 600 }); } },
  { id: "02-neu-fertig", url: "#schueler", hoehe: 900, ausschnitt: { sel: PK, maxHoehe: 640 }, vorher: async (p, h) => {
      await h.klick("#sNeu"); await p.fill(`${TOP} [name=name]`, "Max Muster"); await p.fill(`${TOP} [name=strasse]`, "Musterweg 1"); await p.fill(`${TOP} [name=plz]`, "12345"); await p.fill(`${TOP} [name=ort]`, "Musterstadt");
      await p.fill(`${TOP} [name=telefon]`, "0170 0000000"); await p.fill(`${TOP} [name=email]`, "max@example.org");
      await h.klick(`${TOP} footer button[value=ok]`, { warte: 900 }); await h.tippe("#sSuche", "Max Muster"); await h.warte(700); } },
  { id: "02-neu-handy", url: "#schueler", geraet: "handy", hoehe: 915, vorher: async (p, h) => { await h.klick("#sNeu"); } },
  // ---------- Akte ----------
  { id: "02-akte-kopf", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} header`, rand: 8 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await p.evaluate(() => { const d = document.querySelector("dialog[open] .dialog-inhalt"); }); await mk(p, [{ sel: `${TOP} header h2`, nr: 1 }, { sel: `${TOP} header [data-schliessen]`, nr: 2 }]); } },
  { id: "02-akte-kundennummer", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .dialog-inhalt`, maxHoehe: 280 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await mk(p, [{ sel: `${TOP} [data-kundennummer]`, nr: 1 }, { sel: `${TOP} [name=name]`, nr: 2 }]); } },
  { id: "02-akte-ganz", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Elias Muster")(p, h); } },
  { id: "02-akte-fahrlehrer", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} label:has([name=fahrlehrer_id])`, rand: 24 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await mk(p, [{ sel: `${TOP} [name=fahrlehrer_id]`, nr: 1 }]); } },
  { id: "02-akte-lehrerwechsel", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => {
      const name = await p.evaluate(() => { const heute = KR.todayISO(); const s = S.schueler.find((x) => x.fahrlehrer_id && istAktiv(x) && S.termine.some((t) => t.schueler_id === x.id && t.fahrlehrer_id === x.fahrlehrer_id && t.datum >= heute)); return s.name + "|" + s.fahrlehrer_id; });
      const [n, lid] = name.split("|");
      await akte(n)(p, h);
      const neu = await p.evaluate((lid) => [...document.querySelectorAll("dialog[open] [name=fahrlehrer_id] option")].find((o) => o.value && o.value !== lid && /Muster/.test(o.textContent)).value, lid);
      await p.selectOption(`${TOP} [name=fahrlehrer_id]`, neu);
      await h.klick(`${TOP} footer button[value=ok]`, { warte: 1500 }); await mk(p, [{ sel: `${TOP} footer button[value=ok]`, nr: 1 }, { sel: `${TOP} footer button:not([value=ok])`, nr: 2 }]); } },
  { id: "02-akte-aktiv", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .schalter-zeile`, rand: 20 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await inDlg(p, ".schalter-zeile"); await mk(p, [{ sel: `${TOP} .schalter-bahn`, nr: 1 }, { sel: `${TOP} #aktivText`, nr: 2 }]); } },
  { id: "02-akte-archivieren", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await p.evaluate(() => { const c = document.querySelector("dialog[open] [name=aktiv]"); c.click(); }); await h.klick(`${TOP} footer button[value=ok]`, { warte: 900 }); await mk(p, [{ sel: `${TOP} footer button[value=ok]`, nr: 1 }, { sel: `${TOP} footer [data-nein]`, nr: 2 }, { sel: `${TOP} footer button:not([value]):not([data-nein])`, nr: 3 }]); } },
  { id: "02-akte-im-archiv", url: "#schueler?sicht=inaktiv", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await h.klick(`${zeile("Karl")} [data-sbearb], tbody tr [data-sbearb]`); await inDlg(p, ".schalter-zeile"); await mk(p, [{ sel: `${TOP} .schalter-bahn`, nr: 1 }]); } },
  { id: "02-akte-zahlung", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #zahlBlock`, rand: 20 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await h.klick(`${TOP} [data-zsperre]`, { warte: 600 }); await p.fill(`${TOP} [name=grund]`, "Rechnung offen"); await h.klick(`${TOP} footer button[value=ok]`, { warte: 900 }); await inDlg(p, "#zahlBlock"); await mk(p, [{ sel: `${TOP} [data-zahlungtext]`, nr: 1 }, { sel: `${TOP} [data-zbezahlt]`, nr: 2 }]); } },
  { id: "02-akte-zahlung-offen", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await h.klick(`${TOP} [data-zsperre]`, { warte: 600 }); await mk(p, [{ sel: `${TOP} [data-zgrund]`, nr: 1 }, { sel: `${TOP} [name=grund]`, nr: 2 }, { sel: `${TOP} footer button[value=ok]`, nr: 3 }]); } },
  { id: "02-akte-akademie", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .akademie-zugang`, rand: 20 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await inDlg(p, ".akademie-zugang"); await mk(p, [{ sel: `${TOP} #akSprache`, nr: 1 }, { sel: `${TOP} #akZugangKnopf`, nr: 2 }]); } },
  { id: "02-akte-nachweis-knopf", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .nw-akte`, rand: 30, maxHoehe: 190 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await inDlg(p, ".nw-akte"); await mk(p, [{ sel: `${TOP} #nwOeffnen`, nr: 1 }, { sel: `${TOP} [data-luserie]`, nr: 2 }]); } },
  { id: "02-akte-pruefungen", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .voll:has(> h3):has(.pruef-akte)`, rand: 16 }, vorher: async (p, h) => { await akte("Sofia Beispiel")(p, h); await inDlg(p, ".pruef-akte"); } },
  { id: "02-akte-theorie", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .voll:has(.theorie-teile)`, rand: 16 }, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await inDlg(p, ".theorie-teile"); await p.locator(`${TOP} .voll:has(.theorie-teile) details`).first().evaluate((e) => { e.open = true; }); await h.warte(200); await mk(p, [{ sel: `${TOP} .theorie-teile`, nr: 1 }, { sel: `${TOP} .voll:has(.theorie-teile) details summary`, nr: 2 }]); } },
  { id: "02-akte-sonder", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .voll:has(h3:has-text("Sonderfahrten"))`, rand: 16 }, vorher: async (p, h) => { await akte("Clara Vorlage")(p, h); await inDlg(p, ".voll:has(h3:has-text('Sonderfahrten'))"); } },
  { id: "02-akte-zahlungsmail", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #zmBlock`, rand: 16 }, vorher: async (p, h) => { await akte("Ben Muster")(p, h); await inDlg(p, "#zmBlock"); } },
  { id: "02-akte-notiz", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #notizBlock`, rand: 16 }, vorher: async (p, h) => { await akte("Jonas Probe")(p, h); await inDlg(p, "#notizBlock"); await mk(p, [{ sel: `${TOP} #nzArt`, nr: 1 }, { sel: `${TOP} #nzText`, nr: 2 }, { sel: `${TOP} #nzSenden`, nr: 3 }, { sel: `${TOP} #notizBlock .notiz .marke-pill.rot`, nr: 4 }, { sel: `${TOP} [data-notizbearb]`, nr: 5 }, { sel: `${TOP} [data-notizweg]`, nr: 6 }, { sel: `${TOP} [data-notizerledigt]`, nr: 7 }]); } },
  { id: "02-akte-notiz-stopp", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #notizBlock`, rand: 16, maxHoehe: 330 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await inDlg(p, "#notizBlock"); await p.selectOption(`${TOP} #nzArt`, "stopp"); await p.fill(`${TOP} #nzText`, "Zahlung offen, bitte keine Fahrstunden anbieten"); await mk(p, [{ sel: `${TOP} #nzArt`, nr: 1 }, { sel: `${TOP} #nzText`, nr: 2 }, { sel: `${TOP} #nzSenden`, nr: 3 }]); } },
  { id: "02-akte-notiz-bearbeiten", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Jonas Probe")(p, h); await inDlg(p, "#notizBlock"); await h.klick(`${TOP} [data-notizbearb]`, { warte: 600 }); await mk(p, [{ sel: `${TOP} [name=art]`, nr: 1 }, { sel: `${TOP} [name=text]`, nr: 2 }, { sel: `${TOP} footer button[value=ok]`, nr: 3 }]); } },
  { id: "02-akte-aufgaben", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #aufgabenBlock`, rand: 16 }, vorher: async (p, h) => { await akte("Greta Vorlage")(p, h); await inDlg(p, "#aufgabenBlock"); await mk(p, [{ sel: `${TOP} #agText`, nr: 1 }, { sel: `${TOP} #agDatum`, nr: 2 }, { sel: `${TOP} #agFuer`, nr: 3 }, { sel: `${TOP} #agDringend`, nr: 4 }, { sel: `${TOP} #agSpeichern`, nr: 5 }, { sel: `${TOP} #agHeute`, nr: 6 }, { sel: `${TOP} [data-agerledigt]`, nr: 7 }, { sel: `${TOP} [data-agbearb]`, nr: 8 }]); } },
  { id: "02-akte-aufgabe-bearbeiten", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Greta Vorlage")(p, h); await inDlg(p, "#aufgabenBlock"); await h.klick(`${TOP} [data-agbearb]`, { warte: 600 }); await mk(p, [{ sel: `${TOP} [name=text]`, nr: 1 }, { sel: `${TOP} [name=fuer]`, nr: 2 }, { sel: `${TOP} [name=faellig]`, nr: 3 }, { sel: `${TOP} [name=dringend]`, nr: 4 }]); } },
  { id: "02-akte-aufgabe-erledigt", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #aufgabenBlock details`, rand: 24 }, vorher: async (p, h) => { await akte("Jonas Probe")(p, h); await p.locator(`${TOP} #aufgabenBlock details`).first().evaluate((e) => { e.open = true; }); await inDlg(p, "#aufgabenBlock details"); await h.warte(500); await mk(p, [{ sel: `${TOP} #aufgabenBlock details summary`, nr: 1 }, { sel: `${TOP} [data-agoeffnen]`, nr: 2 }]); } },
  { id: "02-akte-paket", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .bk-anmeldung`, rand: 20 }, vorher: async (p, h) => { await akte("Jonas Probe")(p, h); await inDlg(p, ".bk-anmeldung"); await p.selectOption(`${TOP} [data-bk-wahl]`, "v:p-1"); await h.warte(400); await mk(p, [{ sel: `${TOP} [data-bk-wahl]`, nr: 1 }, { sel: `${TOP} [data-bk-anm-info]`, nr: 2 }, { sel: `${TOP} [data-bk-anpassen]`, nr: 3 }]); } },
  { id: "02-akte-eltern", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} .eltern-block`, rand: 20 }, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await p.fill(`${TOP} [name=eltern_email]`, "eltern@example.org"); await h.warte(250); await mk(p, [{ sel: `${TOP} [name=eltern_email]`, nr: 1 }, { sel: `${TOP} #elternWahl`, nr: 2 }]); } },
  { id: "02-akte-testfahrt", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} #b197Feld`, rand: 20 }, vorher: async (p, h) => { await akte("Max Probe")(p, h); await inDlg(p, "#b197Feld"); await mk(p, [{ sel: `${TOP} [name=testfahrt]`, nr: 1 }, { sel: `${TOP} [name=testfahrt_am]`, nr: 2 }]); } },
  { id: "02-akte-verwerfen", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await p.fill(`${TOP} [name=name]`, "Elias Muster-Probe"); await h.klick(`${TOP} header [data-schliessen]`, { warte: 600 }); await mk(p, [{ sel: `${TOP} footer button.haupt`, nr: 1 }, { sel: `${TOP} footer button[value=ok]`, nr: 2 }]); } },
  { id: "02-akte-speichern", url: "#schueler", hoehe: 700, vorher: async (p, h) => { await akte("Elias Muster")(p, h); await p.fill(`${TOP} [name=telefon]`, "0170 1234567"); await h.klick(`${TOP} footer button[value=ok]`, { warte: 700 }); await mk(p, [{ sel: "#toast", nr: 1 }], "body"); } },
  { id: "02-akte-konflikt", url: "#schueler", hoehe: 1800, ausschnitt: { sel: `${TOP} [data-aktekonflikt]`, rand: 30 }, vorher: async (p, h) => {
      await akte("Elias Muster")(p, h);
      await p.evaluate(() => { const z = window.__FAKE.tabellen.schueler.find((x) => x.id === "s4"); z.telefon = "0171 9999999"; });
      await p.fill(`${TOP} [name=telefon]`, "0170 1234567"); await h.klick(`${TOP} footer button[value=ok]`, { warte: 1000 }); await p.locator(`${TOP} .dialog-inhalt`).evaluate((e) => { e.scrollTop = 0; }); await mk(p, [{ sel: `${TOP} [data-aktekonflikt]`, nr: 1 }, { sel: `${TOP} [data-meinenehmen]`, nr: 2 }]); } },
  { id: "02-akte-handy", url: "#schueler", geraet: "handy", hoehe: 915, vorher: async (p, h) => { await akte("Elias Muster")(p, h); } },
  { id: "02-akte-verlauf", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await p.evaluate(() => { const t = window.__FAKE.tabellen.aenderungsprotokoll || (window.__FAKE.tabellen.aenderungsprotokoll = []); const z = (n, feld, a, b, w, tag) => t.push({ id: 900 + n, fahrschule_id: S.fsId, tabelle: "schueler", datensatz_id: "s4", feld, alt: a, neu: b, geaendert_von: "bu-1", bearbeiter: w, geaendert_am: tag + "T10:15:00Z" }); z(1, "klasse", "B", "B78", "Mia Muster", "2026-11-25"); z(2, "vertrag_am", "2025-12-20", "2025-12-27", "Noah Muster", "2026-11-27"); z(3, "bewerbernummer", null, "12345678", "Mia Muster", "2026-12-01"); fristenDialog("s4"); }); await h.warte(900); await inDlg(p, "#protokoll"); } },

  // ---------- Punkte ----------
  { id: "02-punkte-knopf", url: "#schueler?suche=Elias", hoehe: 700, ausschnitt: { sel: ".schuelertab tbody tr", rand: 10 }, vorher: async (p, h) => { await punkteAn(p, h); await h.tippe("#sSuche", "Elias"); await h.warte(700); await mk(p, [{ sel: "[data-spunkte]", nr: 1 }], "body"); } },
  { id: "02-punkte-dialog", url: "#schueler", hoehe: 1500, ausschnitt: TOP, vorher: async (p, h) => { await punkteAn(p, h); await h.klick(`${zeile("Elias Muster")} [data-spunkte]`, { warte: 900 }); await mk(p, [{ sel: `${TOP} #punkteStand`, nr: 1 }, { sel: `${TOP} .punkte-liste`, nr: 2 }, { sel: `${TOP} fieldset.voll`, nr: 3 }, { sel: `${TOP} [name=eintrag]`, nr: 4 }, { sel: `${TOP} footer button[value=ok]`, nr: 5 }]); } },
  { id: "02-punkte-eigene", url: "#schueler", hoehe: 1500, ausschnitt: TOP, vorher: async (p, h) => { await punkteAn(p, h); await h.klick(`${zeile("Elias Muster")} [data-spunkte]`, { warte: 900 }); await p.check(`${TOP} input[name=aktion][value=frei]`); await h.warte(300); await mk(p, [{ sel: `${TOP} [name=anzahl]`, nr: 1 }, { sel: `${TOP} [name=grund]`, nr: 2 }, { sel: `${TOP} #punkteRichtungZeile`, nr: 3 }]); } },
  // ---------- Ausbildungsnachweis ----------
  { id: "02-nw-uebersicht", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 }); await mk(p, [{ sel: `${TOP} .nw-kacheln`, nr: 1 }, { sel: `${TOP} .nw-fehlt`, nr: 2 }, { sel: `${TOP} #nwNeu`, nr: 3 }, { sel: `${TOP} .nw-liste .nw-zeile`, nr: 4 }]); } },
  { id: "02-nw-unten", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 }); await nwKurz(p, h, true); await inDlg(p, "#nwTeil"); await mk(p, [{ sel: `${TOP} .nw-details:nth-of-type(1) summary`, nr: 1 }, { sel: `${TOP} .nw-details:nth-of-type(2) summary`, nr: 2 }, { sel: `${TOP} #nwTeil`, nr: 3 }, { sel: `${TOP} footer button[value=ok]`, nr: 4 }]); } },
  { id: "02-nw-aendern", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 }); await h.klick(`${TOP} [data-nwaendern]`, { warte: 700 }); await mk(p, [{ sel: `${TOP} [name=datum]`, nr: 1 }, { sel: `${TOP} [name=fahrlehrer_id]`, nr: 2 }, { sel: `${TOP} [name=von]`, nr: 3 }, { sel: `${TOP} [name=bis]`, nr: 4 }, { sel: `${TOP} [name=artwahl]`, nr: 5 }, { sel: `${TOP} [name=grund]`, nr: 6 }]); } },
  { id: "02-nw-nachtragen", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 }); await h.klick(`${TOP} #nwNeu`, { warte: 700 }); await p.fill(`${TOP} [name=von]`, "10:00"); await p.fill(`${TOP} [name=bis]`, "10:45"); await mk(p, [{ sel: `${TOP} [name=datum]`, nr: 1 }, { sel: `${TOP} [name=von]`, nr: 2 }, { sel: `${TOP} [name=artwahl]`, nr: 3 }, { sel: `${TOP} [name=grund]`, nr: 4 }, { sel: `${TOP} footer button[value=ok]`, nr: 5 }]); } },
  { id: "02-nw-stornieren", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 }); await h.klick(`${TOP} [data-nwloeschen]`, { warte: 700 }); await mk(p, [{ sel: `${TOP} [name=grund]`, nr: 1 }, { sel: `${TOP} footer button[value=ok]`, nr: 2 }]); } },
  { id: "02-nw-papierkorb", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 }); await h.klick(`${TOP} [data-nwloeschen]`, { warte: 700 }); await p.fill(`${TOP} [name=grund]`, "falsch eingetragen"); await h.klick(`${TOP} footer button[value=ok]`, { warte: 1200 }); await nwKurz(p, h, false); await inDlg(p, ".nw-details"); await mk(p, [{ sel: `${TOP} [data-nwzurueck]`, nr: 1 }]); } },
  { id: "02-nw-verlauf", url: "#schueler", hoehe: 1800, ausschnitt: TOP, vorher: async (p, h) => { await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 }); await nwKurz(p, h, true); await inDlg(p, "#nwTeil"); await mk(p, [{ sel: `${TOP} .nw-spur`, nr: 1 }]); } },
  { id: "02-nw-druck", url: "#schueler", hoehe: 1500, vorher: async (p, h) => {
      await akte("Lena Beispiel")(p, h); await h.klick(`${TOP} #nwOeffnen`, { warte: 1500 });
      const [pop] = await Promise.all([p.context().waitForEvent("page"), h.klick(`${TOP} footer button[value=ok]`, { warte: 900 })]);
      await pop.waitForLoadState("load").catch(() => {}); const html = await pop.content(); await pop.close().catch(() => {});
      await p.evaluate((html) => { document.querySelectorAll("dialog").forEach((d) => d.close && d.close()); const f = document.createElement("iframe"); f.srcdoc = html; Object.assign(f.style, { position: "fixed", inset: "0", width: "100%", height: "100%", border: "0", background: "#fff", zIndex: 99999 }); document.body.appendChild(f); }, html);
      await h.warte(900); } },
  // ---------- Papierkorb der Fahrschule (Kalender) ----------
  { id: "02-pk-kalender", url: "#kalender", hoehe: 900, ausschnitt: { sel: "#buPapierkorb", rand: 14, maxHoehe: 700 }, vorher: async (p, h) => { await h.warte(2500); await p.evaluate(() => { const k = document.querySelector("#pkKarte"); if (k) { k.open = true; k.scrollIntoView({ block: "center" }); } }); await h.warte(300); await mk(p, [{ sel: "#pkKarte summary", nr: 1 }], "body"); } },
];
