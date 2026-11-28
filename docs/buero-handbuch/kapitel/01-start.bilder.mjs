// Kapitel 1: Start und Anmeldung – Bilder
// Marken liegen sonst unter geöffneten Fenstern (oberste Ebene des Browsers): sie werden in das Fenster verschoben
const dlgInit = () => {
  const mo = new MutationObserver(() => {
    const d = document.querySelector("dialog[open]"); if (!d) return;
    document.querySelectorAll("body > .hb-marke").forEach((n) => { const r = d.getBoundingClientRect(); d.appendChild(n); n.style.left = (parseFloat(n.style.left) - scrollX - r.left - d.clientLeft) + "px"; n.style.top = (parseFloat(n.style.top) - scrollY - r.top - d.clientTop) + "px"; });
  });
  mo.observe(document, { childList: true, subtree: true });
};
const alle = (liste) => liste.map((b) => ({ ...b, vorInit: b.vorInit ? () => { dlgInit(); b.vorInit(); } : dlgInit,
  // Bei Ausschnitten verdeckt der mitlaufende Rollen-Streifen sonst die erste Zeile
  vorher: b.ausschnitt && b.geraet !== "handy" && !/streifen/.test(b.id) ? async (page, h) => { if (b.vorher) await b.vorher(page, h); await page.evaluate(() => { const s = document.getElementById("rollenStreifen"); if (s) s.style.visibility = "hidden"; }); } : b.vorher }));
const zeigeLogin = async (page) => {
  await page.evaluate(() => {
    for (const id of ["app", "wer", "hinweis", "rollenStreifen"]) { const e = document.getElementById(id); if (e) e.hidden = true; }
    document.getElementById("login").hidden = false;
  });
};
const zeigeHinweis = (titel, text, knoepfe) => async (page) => {
  await page.evaluate(([t, x, k]) => { zeigeHinweis(t, x, k || undefined); }, [titel, text, knoepfe || ""]);
};

const teil1 = [
  // ---- Anmeldung ----
  { id: "01-login", geraet: "pc", vorher: async (page, h) => { await zeigeLogin(page); await h.tippe("#loginMail", "buero@example.org"); await h.tippe("#loginPw", "Beispiel-Passwort"); },
    marken: [{ sel: "#loginMail", nr: 1 }, { sel: "#loginPw", nr: 2 }, { sel: "#loginZeig", nr: 3 }, { sel: "#loginKnopf", nr: 4 }], ausschnitt: { sel: ".login-karte", rand: 14 } },
  { id: "01-login-zeigen", geraet: "pc", vorher: async (page, h) => { await zeigeLogin(page); await h.tippe("#loginMail", "buero@example.org"); await h.tippe("#loginPw", "Beispiel-Passwort"); await page.locator("#loginZeig").check(); await h.warte(200); },
    marken: [{ sel: "#loginPw", nr: 1 }, { sel: "#loginZeig", nr: 2 }], ausschnitt: { sel: ".login-karte", rand: 14 } },
  { id: "01-login-fehler", geraet: "pc", vorher: async (page, h) => { await zeigeLogin(page); await h.tippe("#loginMail", "buero@example.org"); await h.tippe("#loginPw", "falsches-Passwort");
      await page.evaluate(() => { document.getElementById("loginFehler").textContent = loginFehlerText({ message: "Invalid login credentials" }); }); },
    marken: [{ sel: "#loginFehler", nr: 1 }], ausschnitt: { sel: ".login-karte", rand: 14 } },
  { id: "01-login-links", geraet: "pc", vorher: async (page) => { await zeigeLogin(page); },
    marken: [{ sel: ".login-karte > a.leise", nr: 1 }, { sel: ".login-wechsel a.knopf", nr: 2 }], ausschnitt: { sel: ".login-karte", rand: 14 } },
  { id: "01-login-handy", geraet: "handy", vorher: async (page) => { await zeigeLogin(page); } },
  // ---- Hinweis-Seiten ----
  { id: "01-hinweis-gesperrt", geraet: "pc", vorher: zeigeHinweis("Zugang gesperrt", "Dein Zugang ist aktuell gesperrt. Bitte wende dich an die Fahrschul-Leitung oder an Serband."),
    marken: [{ sel: "#hinweisKnoepfe .knopf", nr: 1 }], ausschnitt: { sel: ".login-karte:has(#hinweisTitel)", rand: 14 } },
  { id: "01-hinweis-rolle", geraet: "pc", vorher: zeigeHinweis("Nur für das Büro", "Diese Seite ist für Büro und Fahrschul-Leitung. Als Fahrlehrer arbeitest du in der Kompass-App.",
      '<a class="knopf haupt" href="index.html">Zur Kompass-App</a><button class="knopf" type="button" data-abmelden>Abmelden</button>'),
    marken: [{ sel: "#hinweisKnoepfe a", nr: 1 }, { sel: "#hinweisKnoepfe button", nr: 2 }], ausschnitt: { sel: ".login-karte:has(#hinweisTitel)", rand: 14 } },
  { id: "01-hinweis-agb", geraet: "pc", vorher: zeigeHinweis("Nutzungsbedingungen", "Bitte melde dich einmal in der Kompass-App an und bestätige dort die Nutzungsbedingungen. Danach funktioniert auch die Büro-Seite.",
      '<a class="knopf haupt" href="index.html">Zur Kompass-App</a><button class="knopf" type="button" data-abmelden>Abmelden</button>'),
    marken: [{ sel: "#hinweisKnoepfe a", nr: 1 }, { sel: "#hinweisKnoepfe button", nr: 2 }], ausschnitt: { sel: ".login-karte:has(#hinweisTitel)", rand: 14 } },
  { id: "01-hinweis-verbindung", geraet: "pc", vorher: zeigeHinweis("Keine Verbindung", "Das Profil konnte nicht geladen werden. Bitte Internet prüfen und die Seite neu laden.",
      '<button class="knopf haupt" type="button" onclick="location.reload()">Neu laden</button><button class="knopf" type="button" data-abmelden>Abmelden</button>'),
    marken: [{ sel: "#hinweisKnoepfe button:first-child", nr: 1 }, { sel: "#hinweisKnoepfe button:last-child", nr: 2 }], ausschnitt: { sel: ".login-karte:has(#hinweisTitel)", rand: 14 } },
  { id: "01-hinweis-fahrschule", geraet: "pc", vorher: zeigeHinweis("Fahrschule deaktiviert", "Diese Fahrschule ist aktuell deaktiviert. Bitte wende dich an die Fahrschul-Leitung."),
    ausschnitt: { sel: ".login-karte:has(#hinweisTitel)", rand: 14 } },
];

const teil2 = [
  // ---- Rollen-Streifen ----
  { id: "01-streifen-leitung", geraet: "handy", marken: [{ sel: "#rollenStreifen", nr: 1 }], ausschnitt: { sel: "body", rand: 0, maxHoehe: 150 } },
  { id: "01-streifen-buero", geraet: "handy", rolle: "buero", pin: true, marken: [{ sel: "#rollenStreifen", nr: 1 }], ausschnitt: { sel: "body", rand: 0, maxHoehe: 150 } },
  // ---- Wer bedient gerade? ----
  { id: "01-wer-namen", geraet: "pc", rolle: "buero", marken: [{ sel: '#werListe [data-wer="bp-1"]', nr: 1 }, { sel: '#werListe [data-wer="bp-4"]', nr: 2 }, { sel: ".wer-ganz-ab", nr: 3 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-pin", geraet: "pc", rolle: "buero", vorher: async (page, h) => {
      await page.locator('#werListe [data-wer="bp-1"]').click(); await h.warte(700);
      for (const z of "59") { await page.locator(`#pinFeld [data-ziffer="${z}"]`).click(); await h.warte(180); } },
    marks: undefined, marken: [{ sel: "#pinPunkte", nr: 1 }, { sel: "#pinFeld", nr: 2 }, { sel: "#pinLoeschen", nr: 3 }, { sel: "#pinZurueck", nr: 4 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-pin-falsch", geraet: "pc", rolle: "buero", vorher: async (page, h) => {
      await page.locator('#werListe [data-wer="bp-1"]').click(); await h.warte(700);
      for (const z of "1357") { await page.locator(`#pinFeld [data-ziffer="${z}"]`).click(); await h.warte(150); } await h.warte(500); },
    marken: [{ sel: "#pinFehler", nr: 1 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-gesperrt", geraet: "pc", rolle: "buero", vorher: async (page, h) => {
      for (let i = 0; i < 5; i++) {
        await page.locator('#werListe [data-wer="bp-3"]').click(); await h.warte(700);
        for (const z of "1357") { await page.locator(`#pinFeld [data-ziffer="${z}"]`).click(); await h.warte(120); } await h.warte(500);
        if (i < 4) { await page.locator("#pinZurueck").click(); await h.warte(400); }
      } await h.warte(500); },
    marken: [{ sel: "#pinFehler", nr: 1 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-gesperrt-liste", geraet: "pc", rolle: "buero", vorher: async (page, h) => {
      for (let i = 0; i < 5; i++) {
        await page.locator('#werListe [data-wer="bp-3"]').click(); await h.warte(700);
        for (const z of "1357") { await page.locator(`#pinFeld [data-ziffer="${z}"]`).click(); await h.warte(120); } await h.warte(500);
        if (i < 4) { await page.locator("#pinZurueck").click(); await h.warte(400); }
      }
      await page.locator("#pinZurueck").click(); await h.warte(600); },
    marken: [{ sel: '#werListe [data-wer="bp-3"]', nr: 1 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-festlegen1", geraet: "pc", rolle: "buero", vorher: async (page, h) => { await page.locator('#werListe [data-wer="bp-4"]').click(); await h.warte(700); },
    marken: [{ sel: "#pinTitel", nr: 1 }, { sel: "#pinHinweis", nr: 2 }, { sel: "#pinFeld", nr: 3 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-festlegen2", geraet: "pc", rolle: "buero", vorher: async (page, h) => {
      await page.locator('#werListe [data-wer="bp-4"]').click(); await h.warte(700);
      for (const z of "4826") { await page.locator(`#pinFeld [data-ziffer="${z}"]`).click(); await h.warte(180); } await h.warte(700); },
    marken: [{ sel: "#pinHinweis", nr: 1 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-zueinfach", geraet: "pc", rolle: "buero", vorher: async (page, h) => {
      await page.locator('#werListe [data-wer="bp-4"]').click(); await h.warte(700);
      for (const z of "1234") { await page.locator(`#pinFeld [data-ziffer="${z}"]`).click(); await h.warte(180); } await h.warte(500); },
    marken: [{ sel: "#pinFehler", nr: 1 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-ausweg", geraet: "pc", rolle: "buero", vorher: async (page, h) => {
      await page.evaluate(async () => { S.personen.forEach((p) => { p.hat_pin = false; p.pin_frei_bis = null; }); await zeigeWer(false, false); }); await h.warte(300); },
    marken: [{ sel: "#werAusweg", nr: 1 }, { sel: "#werNochmal", nr: 2 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-knoepfe", geraet: "pc", rolle: "buero", pin: true, marken: [{ sel: "#werAnzeige", nr: 1 }, { sel: "#werSperren", nr: 2 }, { sel: "#werWechseln", nr: 3 }, { sel: "#werPinAendern", nr: 4 }], ausschnitt: { sel: "aside.seite", rand: 6, maxHoehe: 300 } },
  { id: "01-wer-kopf", geraet: "pc", rolle: "buero", pin: true, marken: [{ sel: "#kopfWer", nr: 1 }], ausschnitt: { sel: "header.kopf", rand: 18 } },
  { id: "01-wer-wechseln", geraet: "pc", rolle: "buero", pin: true, vorher: async (page, h) => { await h.klick("#werWechseln"); await h.warte(500); },
    marken: [{ sel: '#werListe [data-wer="bp-2"]', nr: 1 }, { sel: "#werZu", nr: 2 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  { id: "01-wer-gesperrt-seite", geraet: "pc", rolle: "buero", pin: true, vorher: async (page, h) => { await h.klick("#werSperren"); await h.warte(700); } },
  { id: "01-wer-pin-aendern", geraet: "pc", rolle: "buero", pin: true, vorher: async (page, h) => { await h.klick("#werPinAendern"); await h.warte(700); },
    marken: [{ sel: "#pinTitel", nr: 1 }, { sel: "#pinFeld", nr: 2 }, { sel: "#pinZurueck", nr: 3 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
  // ---- Menü ----
  { id: "01-menue", geraet: "pc", marken: [{ sel: '.nav-punkt[href="#heute"]', nr: 1 }, { sel: '.nav-punkt[href="#schueler"] .zahl', nr: 2 }, { sel: ".nav-neben", nr: 3 }, { sel: "#abmelden", nr: 4 }], ausschnitt: { sel: "aside.seite", rand: 6 } },
  { id: "01-menue-zahlen", geraet: "pc", marken: [{ sel: '.nav-punkt[href="#heute"] .zahl', nr: 1 }, { sel: '.nav-punkt[href="#schueler"] .zahl', nr: 2 }, { sel: '.nav-punkt[href="#pruefungen"] .zahl', nr: 3 }, { sel: '.nav-punkt[href="#fristen"] .zahl', nr: 4 }], ausschnitt: { sel: ".nav-haupt", rand: 8 } },
  { id: "01-handy-menue-zu", geraet: "handy", marken: [{ sel: "#menueKnopf", nr: 1 }] },
  { id: "01-handy-menue-offen", geraet: "handy", vorher: async (page, h) => { await h.klick("#menueKnopf"); await h.warte(500); }, marken: [{ sel: "#menueKnopf", nr: 1 }, { sel: '.nav-punkt[href="#kalender"]', nr: 2 }] },
  { id: "01-schulwahl", geraet: "pc", vorher: async (page, h) => {
      await page.evaluate(() => { S.schulen = [{ id: "fs-test-1", name: "Vorführ-Fahrschule", aktiv: true }, { id: "fs-test-2", name: "Zweite Testschule", aktiv: true }]; document.getElementById("schulWahl").innerHTML = S.schulen.map((x) => `<option value="${x.id}">${x.name}</option>`).join(""); document.getElementById("schulWahlWrap").hidden = false; }); await h.warte(200); },
    marken: [{ sel: "#schulWahl", nr: 1 }], ausschnitt: { sel: "aside.seite", rand: 6 } },
  // ---- Kopfzeile ----
  { id: "01-kopf", geraet: "pc", vorher: async (page, h) => { await h.geh("#schueler"); },
    marken: [{ sel: "#kopfZurueck", nr: 1 }, { sel: "#titel", nr: 2 }, { sel: "#status", nr: 3 }, { sel: "#drucken", nr: 4 }, { sel: "#neuLaden", nr: 5 }], ausschnitt: { sel: "header.kopf", rand: 18 } },
  { id: "01-kopf-fehler", geraet: "pc", vorher: async (page, h) => { await page.evaluate(() => setStatus("fehler", "Nicht aktuell · Stand 09:12")); await h.warte(200); },
    marken: [{ sel: "#status", nr: 1 }], ausschnitt: { sel: "header.kopf", rand: 18 } },
  { id: "01-kopf-druck", geraet: "pc", vorher: async (page, h) => { await page.evaluate(() => fuelleDruckKopf()); await page.emulateMedia({ media: "print" }); await h.warte(400); }, ausschnitt: null },
];
const dlgSel = "dialog[open]";
const teil3 = [
  // ---- Glocke ----
  { id: "01-glocke", geraet: "pc", marken: [{ sel: "#glocke", nr: 1 }], ausschnitt: { sel: ".marke", rand: 18 } },
  { id: "01-glocke-fenster", geraet: "pc", vorher: async (page, h) => { await h.klick("#glocke"); await h.warte(500); },
    marken: [{ sel: ".lu-gl-titel >> nth=0", nr: 1 }, { sel: ".lu-gl-titel >> nth=1", nr: 2 }, { sel: "[data-lugesendet] >> nth=0", nr: 3 }], ausschnitt: { sel: dlgSel, rand: 10, maxHoehe: 900 }, hoehe: 1000 },
  // ---- Seite Heute ----
  { id: "01-heute-ganz", geraet: "pc", rolle: "buero", pin: true, hoehe: 768,
    marken: [{ sel: ".fuer-dich", nr: 1 }, { sel: ".karte:has-text('Fristen und Warnungen')", nr: 2 }, { sel: ".karte:has-text('Termine heute')", nr: 3 }, { sel: ".kacheln", nr: 4 }] },
  { id: "01-heute-aufgaben", geraet: "pc", rolle: "buero", pin: true,
    marken: [{ sel: ".fuer-dich h2", nr: 1 }, { sel: ".fuer-dich .tabs", nr: 2 }, { sel: "#agNeu", nr: 3 }, { sel: ".fuer-dich .aufgabe-zeile.rot >> nth=0", nr: 4 }, { sel: ".fuer-dich .legende", nr: 5 }], ausschnitt: { sel: ".fuer-dich", rand: 14, maxHoehe: 1400 } },
  { id: "01-heute-zeile", geraet: "pc", rolle: "buero", pin: true,
    marken: [{ sel: ".fuer-dich .aufgabe-zeile.rot >> nth=1 >> .marke-pill", nr: 1 }, { sel: ".fuer-dich .aufgabe-zeile.rot >> nth=1 >> [data-hagschueler]", nr: 2 }, { sel: ".fuer-dich .aufgabe-zeile.rot >> nth=1 >> .unter", nr: 3 }, { sel: ".fuer-dich .aufgabe-zeile.rot >> nth=1 >> [data-hagbearb]", nr: 4 }, { sel: ".fuer-dich .aufgabe-zeile.rot >> nth=1 >> [data-hagweg]", nr: 5 }, { sel: ".fuer-dich .aufgabe-zeile.rot >> nth=1 >> [data-hagerledigt]", nr: 6 }],
    ausschnitt: { sel: ".fuer-dich .aufgabe-zeile.rot >> nth=1", rand: 20 } },
  { id: "01-heute-leitung", geraet: "pc", marken: [{ sel: ".fuer-dich h2", nr: 1 }, { sel: ".fuer-dich .tabs", nr: 2 }], ausschnitt: { sel: ".fuer-dich .karte-kopf", rand: 16 } },
  { id: "01-heute-alle", geraet: "pc", rolle: "buero", pin: true, url: "#heute?alle=1",
    marken: [{ sel: ".fuer-dich .tabs a[aria-current]", nr: 1 }], ausschnitt: { sel: ".fuer-dich", rand: 14, maxHoehe: 1500 } },
  { id: "01-aufgabe-neu", geraet: "pc", rolle: "buero", pin: true, hoehe: 800, vorher: async (page, h) => {
      await h.klick("#agNeu"); await h.warte(400);
      await h.tippe(`${dlgSel} textarea[name=text]`, "Beispiel: Werkstatt wegen Termin anrufen");
      await page.locator(`${dlgSel} select[name=fuer]`).selectOption({ label: "Noah Muster" });
      await page.locator(`${dlgSel} input[name=faellig]`).fill("2026-12-04");
      await page.locator(`${dlgSel} input[name=dringend]`).check(); await h.warte(200); },
    marken: [{ sel: `${dlgSel} textarea[name=text]`, nr: 1 }, { sel: `${dlgSel} select[name=fuer]`, nr: 2 }, { sel: `${dlgSel} input[name=faellig]`, nr: 3 }, { sel: `${dlgSel} select[name=schueler]`, nr: 4 }, { sel: `${dlgSel} input[name=dringend]`, nr: 5 }, { sel: `${dlgSel} footer button[value=ok]`, nr: 6 }],
    ausschnitt: { sel: dlgSel, rand: 14 } },
  { id: "01-aufgabe-bearbeiten", geraet: "pc", rolle: "buero", pin: true, hoehe: 800, vorher: async (page, h) => { await h.klick(".fuer-dich [data-hagbearb] >> nth=0"); await h.warte(400); },
    marken: [{ sel: `${dlgSel} textarea[name=text]`, nr: 1 }, { sel: `${dlgSel} select[name=fuer]`, nr: 2 }, { sel: `${dlgSel} input[name=faellig]`, nr: 3 }, { sel: `${dlgSel} input[name=dringend]`, nr: 4 }, { sel: `${dlgSel} footer button[value=ok]`, nr: 5 }], ausschnitt: { sel: dlgSel, rand: 14 } },
  { id: "01-aufgabe-erledigt", geraet: "pc", rolle: "buero", pin: true, vorher: async (page, h) => { await h.klick(".fuer-dich [data-hagerledigt] >> nth=0"); await h.warte(300); },
    marken: [{ sel: ".toast-undo", nr: 1 }, { sel: ".toast-undo [data-undo]", nr: 2 }] },
  { id: "01-aufgabe-geloescht", geraet: "pc", rolle: "buero", pin: true, vorher: async (page, h) => { await h.klick(".fuer-dich [data-hagweg] >> nth=0"); await h.warte(300); },
    marken: [{ sel: ".toast-undo", nr: 1 }, { sel: ".toast-undo [data-undo]", nr: 2 }] },
  { id: "01-heute-erledigt", geraet: "pc", rolle: "buero", pin: true, vorher: async (page, h) => { await page.evaluate(() => { document.querySelectorAll(".fuer-dich details.von-mir").forEach((d) => { d.open = true; }); }); await h.warte(300); },
    marken: [{ sel: ".fuer-dich details.von-mir >> nth=0 >> summary", nr: 1 }, { sel: "[data-hagoeffnen] >> nth=0", nr: 2 }], ausschnitt: { sel: ".fuer-dich", rand: 14, maxHoehe: 1800 } },
  { id: "01-heute-vonmir", geraet: "pc", vorher: async (page, h) => {
      await page.evaluate(() => { S.sitzung = { token: "x", id: "bp-2", name: "Noah Muster", verwalten: true }; zeichne(); });
      await page.evaluate(() => { document.querySelectorAll(".fuer-dich details.von-mir").forEach((d) => { d.open = true; }); }); await h.warte(300); },
    marken: [{ sel: ".fuer-dich details.von-mir >> nth=0 >> summary", nr: 1 }], ausschnitt: { sel: ".fuer-dich", rand: 14, maxHoehe: 1800 } },
  { id: "01-aufgabe-fuer-dich", geraet: "pc", rolle: "buero", hoehe: 800, vorher: async (page, h) => { await h.pin("Paula Muster", "7352"); await h.warte(600); },
    marken: [{ sel: `${dlgSel} .notizliste`, nr: 1 }, { sel: `${dlgSel} footer button[value=ok]`, nr: 2 }], ausschnitt: { sel: dlgSel, rand: 14 } },
  { id: "01-heute-warnungen", geraet: "pc", vorher: async (page, h) => { await page.evaluate(() => { S.termine.push({ id: "eh1", fahrschule_id: S.fsId, art: "ersthilfe", datum: KR.addDaysISO(KR.todayISO(), -10), von: "18:00", bis: "21:30", fahrlehrer_id: S.lehrer[0].id, schueler_id: "s4", kurs_bezahlt: false, geloescht: false, payload: {} }); zeichne(); }); await h.warte(300); }, marken: [{ sel: ".aufgaben .aufgabe.rot >> nth=0", nr: 1 }, { sel: ".aufgaben .aufgabe.gelb >> nth=0", nr: 2 }, { sel: "[data-luliste=ersthilfe]", nr: 3 }], ausschnitt: { sel: ".karte:has-text('Fristen und Warnungen')", rand: 16, maxHoehe: 1400 } },
  { id: "01-heute-ersthilfe", geraet: "pc", hoehe: 800, vorher: async (page, h) => { await page.evaluate(() => { const l = S.lehrer[0].id; S.termine.push({ id: "eh1", fahrschule_id: S.fsId, art: "ersthilfe", datum: KR.addDaysISO(KR.todayISO(), -10), von: "18:00", bis: "21:30", fahrlehrer_id: l, schueler_id: "s4", kurs_bezahlt: false, geloescht: false, payload: {} }, { id: "eh2", fahrschule_id: S.fsId, art: "ersthilfe", datum: KR.addDaysISO(KR.todayISO(), -3), von: "18:00", bis: "21:30", fahrlehrer_id: l, schueler_id: "s7", kurs_bezahlt: false, geloescht: false, payload: {} }); zeichne(); }); await h.klick("[data-luliste=ersthilfe]"); await h.warte(400); },
    marken: [{ sel: "[data-luehbezahlt] >> nth=0", nr: 1 }], ausschnitt: { sel: dlgSel, rand: 14 } },
  { id: "01-heute-ohnefahrt", geraet: "pc", hoehe: 900, vorher: async (page, h) => { await page.evaluate(() => { S.termine = S.termine.filter((t) => !["s1", "s2", "s3"].includes(t.schueler_id)); S.schueler.forEach((x) => { if (["s1", "s2", "s3"].includes(x.id)) { x.fahrlehrer_id = x.fahrlehrer_id || "fl-1"; x.praxis_bestanden_am = null; x.vertrag_am = "2026-08-01"; } }); zeichne(); }); await h.klick("[data-luliste=ohnefahrt]"); await h.warte(400); },
    marken: [{ sel: "[data-luakte] >> nth=0", nr: 1 }], ausschnitt: { sel: dlgSel, rand: 14, maxHoehe: 900 } },
  { id: "01-heute-notizwarnung", geraet: "pc", marken: [{ sel: ".aufgaben a.aufgabe:has-text('Notiz')", nr: 1 }], ausschnitt: { sel: ".aufgaben a.aufgabe:has-text('Notiz')", rand: 30 } },
  { id: "01-heute-termine", geraet: "pc", marken: [{ sel: ".karte:has-text('Termine heute') h2", nr: 1 }, { sel: ".karte:has-text('Termine heute') table", nr: 2 }], ausschnitt: { sel: ".karte:has-text('Termine heute')", rand: 14, maxHoehe: 1200 } },
  { id: "01-heute-kacheln", geraet: "pc", marken: [{ sel: ".kacheln .kachel >> nth=0", nr: 1 }, { sel: ".kacheln .kachel >> nth=1", nr: 2 }, { sel: ".kacheln .kachel >> nth=2", nr: 3 }, { sel: ".kacheln .kachel >> nth=3", nr: 4 }], ausschnitt: { sel: ".kacheln", rand: 18 } },
  { id: "01-heute-handy", geraet: "handy", rolle: "buero", pin: true, ganzeSeite: false },
  // ---- Neuigkeiten ----
  { id: "01-neuigkeiten", geraet: "pc", url: "#neuigkeiten", marken: [{ sel: ".nz-e >> nth=0 >> .nz-kopf", nr: 1 }, { sel: ".nz-e >> nth=0 >> .nz-titel", nr: 2 }, { sel: ".nz-e >> nth=0 >> .nz-p", nr: 3 }, { sel: ".nz-e >> nth=0 >> .nz-ver", nr: 4 }], ausschnitt: { sel: ".nz-e >> nth=0", rand: 22 } },
  { id: "01-neuigkeiten-seite", geraet: "pc", url: "#neuigkeiten", marken: [{ sel: '.nav-punkt[href="#neuigkeiten"]', nr: 1 }] },
  { id: "01-neuigkeiten-hinweis", geraet: "pc", vorInit: () => { try { localStorage.setItem("buero-neu-gesehen", "2026.01.01.1"); } catch (e) {} }, vorher: async (page, h) => { await h.warte(3000); },
    marken: [{ sel: "#toast.zeigen", nr: 1 }] },
  // ---- Als App installieren, Abmelden ----
  { id: "01-installieren", geraet: "pc", vorher: async (page, h) => { await page.evaluate(() => { document.getElementById("installieren").hidden = false; }); await h.warte(200); },
    marken: [{ sel: "#installieren", nr: 1 }], ausschnitt: { sel: "aside.seite", rand: 6 } },
  { id: "01-abmelden", geraet: "pc", marken: [{ sel: ".nutzer-name", nr: 1 }, { sel: ".nutzer-rolle", nr: 2 }, { sel: "#abmelden", nr: 3 }], ausschnitt: { sel: ".seite-fuss", rand: 16 } },
  { id: "01-abmelden-buero", geraet: "pc", rolle: "buero", pin: true, marken: [{ sel: ".nutzer-name", nr: 1 }, { sel: "#abmelden", nr: 2 }], ausschnitt: { sel: ".seite-fuss", rand: 16 } },
  { id: "01-index-hinweis", geraet: "pc", vorher: async (page, h) => { await page.goto(page.url().replace(/buero\.html.*$/, "index.html")); await page.waitForTimeout(2500); await page.evaluate(() => { _zeigeBueroHinweis(); }); await h.warte(400); },
    marken: [{ sel: "#bhOeffnen", nr: 1 }, { sel: "#bhAbmelden", nr: 2 }], ausschnitt: { sel: "#bueroHinweis > div", rand: 30 } },
  { id: "01-wer-ganz-abmelden", geraet: "pc", rolle: "buero", marken: [{ sel: ".wer-ganz-ab", nr: 1 }], ausschnitt: { sel: ".wer-karte", rand: 14 } },
];
export default alle([...teil1, ...teil2, ...teil3]);
