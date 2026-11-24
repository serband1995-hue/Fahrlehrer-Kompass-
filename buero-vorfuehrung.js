/* Kompass Büro – Vorführung und Tests
   Ersetzt die Datenbank durch eine Attrappe im Speicher des Browsers. Nichts wird gespeichert,
   nichts verlässt den Browser. Alle Namen sind erfunden (keine echten Schüler).
   - Vorführung: buero.html?vorfuehrung  (für das Teammeeting, auch ohne Internet-Datenbank)
   - Tests:      scripts/buero-test.mjs setzt vorher window.__FAKE mit eigenen Daten. */
// 24 verschiedene Vornamen, keiner gleich oder ähnlich wie bei Fahrlehrern oder Büro-Personen der Vorführung
const VORNAMEN = ["Lena", "Jonas", "Greta", "Elias", "Sofia", "Max", "Emilia", "Ben", "Hanna", "Luca", "Ella", "Finn", "Lia", "Jakob", "Ida", "Emil", "Nora", "Theo", "Clara", "Oskar", "Maja", "Leon", "Frida", "Karl"];
// Nachnamen, die die Schüler klar als erfunden kennzeichnen (im Wechsel)
const NACHNAMEN = ["Beispiel", "Probe", "Vorlage", "Muster"];

// Ein erfundener Unterschrift-Strich als PNG (keine echte Unterschrift)
const UNTERSCHRIFT_PROBE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAAoCAAAAAAQgWH5AAAAr0lEQVR42u3W2wqAIAwG4P8h9v6vWoRBarqDjkWwXUWDfXZwE8dHgYQTTjjhK6hENExPhMJESzI82Oo6Cu4sgwxP1yJj01Xc8oeHiFaGs6uWodoqJoCRqxSUO3Sx/LucDFMX/O8sZvsyYNlZM5ZaxXCh7T3IDal9ft1EYJfNwNy7UvZk9ktN4Gll0ywQFgqDW7L2ucXv4zu/MNI3TyBr49wVDj9zBap5vE044YR/CZ9VC4/Y4oFrmgAAAABJRU5ErkJggg==";
function addTage(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function addMonate(iso, n) { const d = new Date(iso + "T12:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); }

function bauDaten(heute) {
  const FS = "fs-test-1";
  const lehrer = [
    { id: "fl-1", name: "Anton Muster", email: "anton@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0", klassen: ["B", "BE"] },
    { id: "fl-2", name: "Berta Muster", email: "berta@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-3", name: "Cem Muster", email: "cem@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-4", name: "Dario Muster (extern)", email: "dario@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0", klassen: ["C1", "C1E", "C", "CE"], ohne_app: true },
  ];
  const buero = [
    { id: "bu-1", name: "Büro Muster", email: "buero@example.org", rolle: "buero", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "ad-1", name: "Leitung Muster", email: "leitung@example.org", rolle: "fahrschule_admin", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "sa-1", name: "Super-Admin", email: "super@example.org", rolle: "super_admin", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-x", name: "Elif Muster", email: "fl@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "gesperrt-1", name: "Gesperrt Test", email: "gesperrt@example.org", rolle: "buero", fahrschule_id: FS, aktiv: false, agb_akzeptiert_version: "1.0" },
    { id: "agb-1", name: "Ohne AGB", email: "agb@example.org", rolle: "buero", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: null },
  ];
  const schueler = [];
  let n = 0;
  for (let i = 0; i < 24; i++) {
    n++;
    const vor = VORNAMEN[i], nach = NACHNAMEN[i % NACHNAMEN.length];
    const fl = n % 9 === 0 ? null : lehrer[n % lehrer.length].id;
    schueler.push({
      id: "s" + n, fahrschule_id: FS, fahrlehrer_id: fl, name: `${vor} ${nach}`, telefon: "0170 000" + String(n).padStart(4, "0"),
      status: "aktiv", paket_id: n % 4 === 0 ? "p-turbo" : (n % 2 ? "p-1" : null), hat_simulator: n % 5 === 0, hat_theorie_app: n % 3 === 0,
      bogen_ausgefuellt: true,
      vertrag_am: n % 7 === 0 ? null : addTage(heute, -[400, 380, 370, 350, 340, 200, 90, 30, 500, 366, 330, 100][n % 12]),
      reakt_status: n % 10 === 0 ? "befreit" : (n % 3 === 0 ? "bezahlt" : "pruefen"),
      reakt_bezahlt_bis: n % 3 === 0 && n % 10 !== 0 ? addTage(heute, [-20, 15, 200][n % 3 === 0 ? (n / 3) % 3 : 0]) : null,
      reakt_notiz: n % 10 === 0 ? "Prüfung bestanden" : null,
      ausbildungsart: n % 11 === 0 ? "umschreibung" : (n % 13 === 0 ? "neuerteilung" : "ersterwerb"), klasse: n % 8 === 0 ? "CE" : (n % 6 === 0 ? "B197" : (n % 5 === 0 ? "B78" : "B")),
      antrag_am: n % 7 === 1 ? addTage(heute, -400) : (n % 9 === 2 ? addTage(heute, -330) : (n % 3 === 0 ? addTage(heute, -90) : null)),
      b197_testfahrt_am: n % 6 === 0 && n % 12 === 0 ? addTage(heute, -12) : null, reakt_betrag: null, inaktiv_seit: n === 10 || n === 20 ? addTage(heute, -30) : null,
      theorie_abgeschlossen_am: n % 4 === 0 ? addTage(heute, -[340, 100, 380][n % 3]) : null,
      theorie_bestanden_am: n % 8 === 0 ? addTage(heute, -50) : null,
      erstellt_am: addMonate(heute, -((n % 14) + 1)) + "T10:00:00Z", ausbildung: { form: n % 6 === 0 ? "B197" : "B" },
    });
  }
  const FAHRZEUGE = ["Golf Schalter 1", "Golf Schalter 2", "Golf Automatik 1", "Golf Automatik 2"];
  const termine = [];
  const zeiten = [["07:30", "09:00"], ["09:15", "10:45"], ["11:00", "11:45"], ["12:30", "14:00"], ["14:15", "15:45"], ["16:00", "17:30"]];
  let t = 0;
  for (let tag = -20; tag <= 10; tag++) {
    const datum = addTage(heute, tag);
    lehrer.forEach((l, li) => {
      zeiten.forEach(([von, bis], zi) => {
        if ((zi + li + tag) % 3 === 0) return;
        const s = schueler[(t * 7) % schueler.length];
        t++;
        termine.push({
          id: "t" + t, fahrschule_id: FS, fahrlehrer_id: l.id, schueler_id: s.id, datum, von, bis,
          art: zi === 5 && tag % 4 === 0 ? "sonder" : "fahrstunde", fahrzeug: FAHRZEUGE[li],
          status: "geplant", geloescht: false, payload: Object.assign(t % 13 === 0 ? { fc: "v1" } : (t % 17 === 0 ? { fc: "v2" } : {}),
            // erfundene Unterschrift (kleines Strich-Bild) bei jeder zweiten vergangenen Stunde: für den Ausbildungsnachweis
            tag < 0 && tag % 2 === 0 ? { signed: true, signedAt: datum, signatureSnap: UNTERSCHRIFT_PROBE } : {}), buero_fc_status: "offen",
        });
      });
    });
  }
  const pruefungen = [
    { id: "pr-1", fahrschule_id: FS, fahrlehrer_id: "fl-1", schueler_id: "s1", datum: addTage(heute, -14), result: "bestanden", attempt: 1, geloescht: false, payload: {} },
    { id: "pr-2", fahrschule_id: FS, fahrlehrer_id: "fl-2", schueler_id: "s2", datum: addTage(heute, -9), result: "nicht_bestanden", attempt: 1, geloescht: false, payload: {} },
  ];
  const pruefungstermine = [
    { id: "pt-1", fahrschule_id: FS, schueler_id: "s3", fahrlehrer_id: "fl-1", art: "praxis", klasse: "B", datum: addTage(heute, 2), von: "08:00", status: "geplant", entgelt_bezahlt: true, tuev_gutschein: false, as_portal: false },
    { id: "pt-2", fahrschule_id: FS, schueler_id: "s5", fahrlehrer_id: "fl-2", art: "praxis", klasse: "B", datum: addTage(heute, 2), von: "09:15", status: "geplant", entgelt_bezahlt: true, tuev_gutschein: true, as_portal: true },
    { id: "pt-3", fahrschule_id: FS, schueler_id: "s7", fahrlehrer_id: null, art: "theorie", klasse: "B", datum: addTage(heute, 5), von: "13:00", status: "geplant", entgelt_bezahlt: false, tuev_gutschein: false, as_portal: false },
    { id: "pt-4", fahrschule_id: FS, schueler_id: "s8", fahrlehrer_id: "fl-3", art: "praxis", klasse: "CE", datum: addTage(heute, -1), von: "10:00", status: "geplant", entgelt_bezahlt: true, tuev_gutschein: true, as_portal: true },
    { id: "pt-5", fahrschule_id: FS, schueler_id: "s9", fahrlehrer_id: "fl-1", art: "praxis", klasse: "B", datum: addTage(heute, -6), von: "10:00", status: "bestanden", entgelt_bezahlt: true, tuev_gutschein: true, as_portal: true },
  ];
  const sName = (id) => (schueler.find((x) => x.id === id) || {}).name || "";
  const jetztMonat = heute.slice(0, 7) + "-03T10:00:00Z";
  const fahrschule_empfehlungen = [
    { id: "e1", fahrschule_id: FS, schueler_id: "s4", schueler_name: sName("s4"), fahrlehrer_id: "fl-1", fahrlehrer_name: "Anton Muster", typ: "akademie", status: "empfohlen", erstellt_am: jetztMonat },
    { id: "e2", fahrschule_id: FS, schueler_id: "s6", schueler_name: sName("s6"), fahrlehrer_id: "fl-2", fahrlehrer_name: "Berta Muster", typ: "simulator", status: "zugangsdaten_ausgegeben", erstellt_am: jetztMonat },
    { id: "e3", fahrschule_id: FS, schueler_id: "s10", schueler_name: sName("s10"), fahrlehrer_id: "fl-1", fahrlehrer_name: "Anton Muster", typ: "akademie", status: "bezahlt", betrag: 100, aufteilung: { fahrlehrer: 15, fahrschule: 45, plattform: 20, akademie: 20 }, erstellt_am: jetztMonat, aktualisiert_am: jetztMonat },
  ];
  const provisionen = [{ id: "pv1", fahrlehrer_id: "fl-1", fahrschule_id: FS, typ: "akademie", schueler_id: "s10", betrag: 15, status: "offen", erstellt_am: jetztMonat }];
  return {
    FS,
    konten: [...lehrer, ...buero].map((p) => ({ id: p.id, email: p.email, password: "test1234" })),
    tabellen: {
      fahrschule_empfehlungen, provisionen,
      fahrschulen: [{ id: FS, name: "Vorführ-Fahrschule", slug: "test", aktiv: true, konfiguration: { akademieVermittlung: { betragAkademie: 100, betragSimulator: 149, splitKollege: { fahrlehrer: 15, fahrschule: 45, plattform: 20, akademie: 20 } } } }, { id: "fs-test-2", name: "Zweite Testschule", slug: "test2", aktiv: true, konfiguration: {} }],
      profiles: [...lehrer, ...buero],
      schueler, kalender_termine: termine, kalender_pruefungen: pruefungen, pruefungstermine,
      // Theorie-Besuch (14.10.2026): s1 hat 13 von 14 Lektionen (es fehlt 14), s2 hat Lektion 7 + 8 am selben Abend
      theorie_teilnahme: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"].map((l, i) => ({ id: "tt-" + i, fahrschule_id: FS, schueler_id: "s1", lektion: l, datum: addTage(heute, -40 + i), bearbeiter: "Anton Muster", entfernt_am: null }))
        .concat([{ id: "tt-a", fahrschule_id: FS, schueler_id: "s2", lektion: "7", datum: addTage(heute, -3), bearbeiter: "Anton Muster", entfernt_am: null }, { id: "tt-b", fahrschule_id: FS, schueler_id: "s2", lektion: "8", datum: addTage(heute, -3), bearbeiter: "Anton Muster", entfernt_am: null }]),
      fahrschule_fahrzeuge: [
        { id: "fz-1", fahrschule_id: FS, name: "Golf Schalter 1", typ: "schalt", aktiv: true, erstellt_am: "2026-01-01" },
        { id: "fz-2", fahrschule_id: FS, name: "Golf Schalter 2", typ: "schalt", aktiv: true, erstellt_am: "2026-01-02" },
        { id: "fz-3", fahrschule_id: FS, name: "Golf Automatik 1", typ: "automatik", aktiv: true, erstellt_am: "2026-01-03" },
        { id: "fz-4", fahrschule_id: FS, name: "Golf Automatik 2", typ: "automatik", aktiv: true, erstellt_am: "2026-01-04" },
      ],
      // Werkstatt 13: mit Klasse und Posten (Paket-Baukasten). Ohne „posten“ gilt die Datenbank als alt (Reiter „Pakete“ verborgen).
      fahrschule_pakete: [
        { id: "p-1", fahrschule_id: FS, name: "Boost-Paket 1", reihenfolge: 1, aktiv: true, klasse: "B", posten: [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent_fest: null }, { art: "fahrstunde", bezeichnung: "Übungsstunden", anzahl: 20, preis_cent_fest: null }], aktualisiert_am: null, bearbeiter: null },
        { id: "p-turbo", fahrschule_id: FS, name: "Turboboost", reihenfolge: 0, aktiv: true, klasse: null, posten: [], aktualisiert_am: null, bearbeiter: null },
      ],
      // Büro-Personen (erfunden). _pin gibt es nur in der Attrappe; die echte Datenbank speichert die PIN verschlüsselt.
      buero_personen: [
        { id: "bp-1", fahrschule_id: FS, name: "Mia Muster", telefon: null, hat_pin: true, _pin: "5917", darf_verwalten: true, aktiv: true, gesperrt_bis: null, fehlversuche: 0 },
        { id: "bp-2", fahrschule_id: FS, name: "Noah Muster", telefon: null, hat_pin: true, _pin: "2846", darf_verwalten: true, aktiv: true, gesperrt_bis: null, fehlversuche: 0 },
        { id: "bp-3", fahrschule_id: FS, name: "Paula Muster", telefon: "0171 3920012", hat_pin: true, _pin: "7352", darf_verwalten: false, aktiv: true, gesperrt_bis: null, fehlversuche: 0 },
        { id: "bp-4", fahrschule_id: FS, name: "Tom Muster", telefon: null, hat_pin: false, _pin: null, pin_frei_bis: new Date(Date.now() + 24 * 3600000).toISOString(), darf_verwalten: false, aktiv: true, gesperrt_bis: null, fehlversuche: 0 },
      ],
    },
  };
}

/* Nur für die sichtbare Vorführung (buero.html?vorfuehrung ohne Test-Daten): ohne Test-Sonderfälle,
   dafür mit ein paar Aufgaben, Notizen und Fahrcheck-Quittungen, damit „Heute zu tun“ nach echtem Alltag aussieht.
   Die Tests (scripts/buero-test.mjs) nutzen bauDaten ohne diesen Zusatz und legen ihre Fälle selbst an. */
// Test-Sonderfälle (gesperrt, ohne AGB, Fahrlehrer-Konto im Büro) und der Super-Admin: in der Vorführung nicht zeigen
const TEST_KONTEN = ["gesperrt-1", "agb-1", "fl-x", "sa-1"];
function vorfuehrZusatz(tab, heute) {
  const FS = "fs-test-1";
  tab.profiles = tab.profiles.filter((p) => !TEST_KONTEN.includes(p.id));
  const jetzt = Date.now();
  const vor = (tage, uhr) => { const t = new Date(addTage(heute, -tage) + "T" + uhr + ":00").getTime(); return new Date(Math.min(t, jetzt - 3600000)).toISOString(); };
  const lehrerVon = (sid) => (tab.schueler.find((s) => s.id === sid) || {}).fahrlehrer_id || null;
  // Aufgaben: überfällig, heute, dringend, an eine Büro-Person, ohne Datum, eine für später, eine gestern erledigt
  tab.schueler_aufgaben = [
    { id: "va-1", fahrschule_id: FS, schueler_id: "s3", text: "Zurückrufen wegen Termin für die Praxisprüfung", heute: false, faellig_am: addTage(heute, -2), fuer_person_id: null, von_person_id: "bp-1", bearbeiter: "Mia Muster", dringend: false, erstellt_am: vor(4, "09:10") },
    { id: "va-2", fahrschule_id: FS, schueler_id: "s6", text: "Sehtest und Erste-Hilfe-Nachweis nachfordern", heute: true, faellig_am: heute, fuer_person_id: null, von_person_id: "bp-2", bearbeiter: "Noah Muster", dringend: false, erstellt_am: vor(1, "15:40") },
    { id: "va-3", fahrschule_id: FS, schueler_id: "s13", text: "Antrag bei der Führerscheinstelle abgeben", heute: false, faellig_am: null, fuer_person_id: null, von_person_id: "bp-1", bearbeiter: "Mia Muster", dringend: true, erstellt_am: vor(1, "11:05") },
    { id: "va-4", fahrschule_id: FS, schueler_id: null, text: "Rechnung der Werkstatt für Golf Schalter 2 prüfen", heute: false, faellig_am: null, fuer_person_id: "bp-3", von_person_id: "bp-2", bearbeiter: "Noah Muster", dringend: false, erstellt_am: vor(2, "10:20") },
    { id: "va-5", fahrschule_id: FS, schueler_id: null, text: "Ordner mit den Verträgen vom Oktober ablegen", heute: false, faellig_am: null, fuer_person_id: null, von_person_id: "bp-3", bearbeiter: "Paula Muster", dringend: false, erstellt_am: vor(3, "08:45") },
    { id: "va-6", fahrschule_id: FS, schueler_id: "s7", text: "Nach der Theorieprüfung fragen", heute: false, faellig_am: addTage(heute, 6), fuer_person_id: null, von_person_id: "bp-1", bearbeiter: "Mia Muster", dringend: false, erstellt_am: vor(1, "16:30") },
    { id: "va-7", fahrschule_id: FS, schueler_id: "s2", text: "Ratenplan an die Eltern schicken", heute: false, faellig_am: addTage(heute, -1), fuer_person_id: null, von_person_id: "bp-2", bearbeiter: "Noah Muster", dringend: false, erstellt_am: vor(5, "13:00"), erledigt_am: vor(1, "12:15"), erledigt_bearbeiter: "Paula Muster" },
  ];
  // Notizen an die Fahrlehrer: eine gelesen, zwei noch nicht gelesen, eine erledigt
  tab.schueler_notizen = [
    { id: "vn-1", fahrschule_id: FS, schueler_id: "s2", text: "Reaktivierung wird gerade geprüft. Bitte vorerst keine neuen Fahrstunden planen.", art: "stopp", bearbeiter: "Mia Muster", erstellt_am: vor(1, "09:30"), erledigt_am: null },
    { id: "vn-2", fahrschule_id: FS, schueler_id: "s4", text: "Hat eine neue Handynummer, steht schon im Profil.", art: "info", bearbeiter: "Paula Muster", erstellt_am: vor(2, "14:10"), erledigt_am: null },
    { id: "vn-3", fahrschule_id: FS, schueler_id: "s5", text: "Prüfungstermin bestätigt. Bitte an die Brille erinnern.", art: "info", bearbeiter: "Noah Muster", erstellt_am: vor(0, "08:20"), erledigt_am: null },
    { id: "vn-4", fahrschule_id: FS, schueler_id: "s12", text: "Mutter ruft wegen Ratenzahlung an, bitte kurz Bescheid geben.", art: "info", bearbeiter: "Mia Muster", erstellt_am: vor(6, "11:00"), erledigt_am: vor(3, "17:45"), erledigt_bearbeiter: "Paula Muster" },
  ];
  tab.schueler_notiz_gelesen = [{ notiz_id: "vn-2", fahrlehrer_id: lehrerVon("s4"), gelesen_am: vor(1, "18:05") }];
  /* Fahrcheck-Quittungen im letzten abgeschlossenen Zeitraum: Anton vollständig, Berta mit einem fehlenden Zettel.
     „Erwartet“ kommt aus derselben Rechnung wie auf der Seite (KR.fcSoll). KR wird erst nach dieser Datei geladen,
     deshalb entstehen die Quittungen beim ersten Lesen der Tabelle. */
  const am = (bis) => { const t = new Date(addTage(bis, 1) + "T09:30:00").getTime(); return new Date(Math.min(t, jetzt - 3600000)).toISOString(); };
  const quittungen = () => {
    if (typeof KR === "undefined") return null;
    const [von, bis] = KR.fcVorZeitraum(KR.fcZeitraum(KR.todayISO())[0]);
    const liste = [];
    for (const [id, lid, fehltEiner] of [["vq-1", "fl-1", false], ["vq-2", "fl-2", true]]) {
      // wie fcTermin in buero.js
      const termine = tab.kalender_termine.filter((t) => t.fahrlehrer_id === lid && !t.geloescht).map((t) => { const p = t.payload || {}; return { id: t.id, datum: t.datum, von: t.von, bis: t.bis, art: t.art, status: p.status || t.status, fc: p.fc || null, nachAm: p.nachAm || null, schueler_id: t.schueler_id }; });
      const r = KR.fcSoll(termine, von, bis);
      if (!r.soll) continue;
      const mit = r.posten.filter((x) => x.n && x.fc !== "nachgereicht");
      const weg = fehltEiner ? (mit.find((x) => x.n === 1) || mit[0]) : null;
      const ist = weg ? r.soll - weg.n : r.soll;
      liste.push({ id, fahrschule_id: FS, fahrlehrer_id: lid, zeitraum_von: von, zeitraum_bis: bis, soll: r.soll, ist, fehlend: weg ? [weg.id] : [], notiz: weg ? "Ein Zettel kommt nach." : null, bestaetigt_von: "bu-1", bestaetigt_am: am(bis) });
      // Büro-Status der Stunden wie nach „Abgabe bestätigen“
      for (const x of mit) { const t = tab.kalender_termine.find((y) => y.id === x.id); if (t) t.buero_fc_status = weg && weg.id === x.id ? "fehlt" : "abgegeben"; }
    }
    return liste;
  };
  let fcListe = null;
  Object.defineProperty(tab, "fc_abgaben", { configurable: true, enumerable: true,
    get() { if (!fcListe) fcListe = quittungen(); return fcListe || []; }, set(v) { fcListe = v; } });
  return tab;
}

// Konten-Funktion der Vorführung (und der Tests): ahmt admin-create-account vereinfacht nach, ohne Rechteprüfung.
function vorfuehrKonto(b, F) {
  const profile = (F && F.tabellen && F.tabellen.profiles) || [];
  const ziel = b && b.target_user_id ? profile.find((p) => p.id === b.target_user_id) : null;
  const heute = new Date().toISOString().slice(0, 10);
  if (b && (b.action === "check_delete" || b.action === "delete_account")) {
    if (!ziel) throw new Error("Zugang nicht gefunden");
    const sch = ((F.tabellen.schueler) || []).filter((x) => x.fahrlehrer_id === ziel.id && x.status !== "geloescht" && !x.inaktiv_seit).length; // Archiv zählt nicht (wie der Server)
    const ter = ((F.tabellen.kalender_termine) || []).filter((x) => x.fahrlehrer_id === ziel.id && !x.geloescht && x.art !== "block" && x.datum > heute).length;
    const offen = sch || ter;
    const hinweis = offen ? `${ziel.name || "Dieser Fahrlehrer"} hat noch ${[sch ? sch + " Schüler" : "", ter ? ter + " künftige Termine" : ""].filter(Boolean).join(", ")}. Bitte zuerst einem anderen Fahrlehrer geben (Schüler öffnen und den Fahrlehrer wechseln), dann noch einmal löschen.` : null;
    if (b.action === "check_delete") return { ok: !offen, hinweis };
    if (offen) throw new Error(hinweis);
    Object.assign(ziel, { rolle: "entfernt", aktiv: false, email: "entfernt-" + ziel.id + "@entfernt.invalid", slug: null });
    return { ok: true, geloescht: true };
  }
  if (b && b.action === "update_account") {
    if (!ziel) throw new Error("Zugang nicht gefunden");
    const neu = {};
    if (b.name !== undefined) neu.name = String(b.name).trim();
    if (b.rolle) neu.rolle = b.rolle;
    if (Array.isArray(b.klassen)) neu.klassen = b.klassen.slice().sort();
    if (b.email) { neu.email = b.email; neu.ohne_app = false; }
    Object.assign(ziel, neu);
    return b.email ? { ok: true, geaendert: true, email: b.email, mail_gesendet: true } : { ok: true, geaendert: true };
  }
  return { email: (b && b.email) || "beispiel@example.org", passwort: "Vorfuehrung-1234" };
}
if (typeof module !== "undefined" && module.exports) { module.exports = { bauDaten, vorfuehrZusatz, vorfuehrKonto }; } else
(function () {
  "use strict";
  // Ohne Test-Daten: Vorführung mit erfundener Fahrschule, angemeldet als Fahrschul-Leitung
  if (!window.__FAKE) {
    const h = new Date().toISOString().slice(0, 10);
    const d = bauDaten(h);
    window.__FAKE = { tabellen: vorfuehrZusatz(d.tabellen, h), konten: d.konten, session: { user: { id: "ad-1", email: "leitung@example.org" } }, vorfuehrung: true,
      functions: { "admin-create-account": vorfuehrKonto } };
  }
  const F = window.__FAKE;
  F.log = [];
  F.tabellen = F.tabellen || {};
  F.rpcs = F.rpcs || {};
  F.functions = F.functions || {};
  // Zahlungsaufforderung (Werkstatt 11): ahmt die Funktion zahlungs-mail nach (Prüfungen wie der Server, kein Versand). Steuerbar:
  // F.fehler["zahlungs-mail"] = "zu_viele" (oder anderer Code) → Antwort { fehler: code }; F.fehler["zahlungs-mail"] = "netz" → Funktion nicht erreichbar.
  if (!F.functions["zahlungs-mail"]) F.functions["zahlungs-mail"] = (b) => {
    const f = F.fehler && F.fehler["zahlungs-mail"];
    if (f === "netz") throw new Error("Failed to fetch");
    if (f && f !== "zweite") return { fehler: f };
    const profile = F.tabellen.profiles || [];
    const ich = F.session && profile.find((p) => p.id === F.session.user.id);
    if (!ich) return { fehler: "nicht_angemeldet" };
    if (!["buero", "fahrschule_admin", "super_admin"].includes(ich.rolle)) return { fehler: "keine_berechtigung" };
    const s = (F.tabellen.schueler || []).find((x) => x.id === b.schueler_id && x.fahrschule_id === ich.fahrschule_id);
    if (!s) return { fehler: "kein_schueler" };
    if (!["pruefung", "reaktivierung", "zahlung_offen"].includes(b.art)) return { fehler: "art_unbekannt" };
    if (!Number.isInteger(b.betrag_cent) || b.betrag_cent < 100 || b.betrag_cent > 1000000) return { fehler: "betrag" };
    const w = String(b.wofuer || "").trim();
    if (!w || w.length > 80) return { fehler: "wofuer" };
    const z = (F.tabellen.fahrschule_zahlungsdaten || []).find((x) => x.fahrschule_id === ich.fahrschule_id);
    if (!z || !z.kontoinhaber || !z.iban) return { fehler: "zahlungsdaten_fehlen" };
    if (b.art === "zahlung_offen" && !s.zahlung_gesperrt_seit) return { fehler: "nicht_gesperrt" }; // wie der Server (409): die Sperre ist inzwischen weg
    if (b.erwarteter_modus !== "test" && b.erwarteter_modus !== "echt") return { fehler: "ungueltige_anfrage" }; // Pflichtfeld seit Commit 963ac7d
    if (b.erwarteter_modus !== z.modus) return { fehler: "modus_geaendert", modus: z.modus }; // wie der Server (409): nichts wird gesendet
    const heute = new Date().toISOString().slice(0, 10);
    const mails = F.tabellen.zahlungs_mails || (F.tabellen.zahlungs_mails = []);
    const echt = z.modus === "echt", heuteMails = mails.filter((m) => String(m.angelegt_am || "").slice(0, 10) === heute);
    if (heuteMails.length >= 100) return { fehler: "zu_viele_schule" };
    if (heuteMails.filter((m) => m.schueler_id === s.id && m.modus === (echt ? "echt" : "test")).length >= 5) return { fehler: "zu_viele" }; // je Schüler, Test und Echt getrennt
    // W14: Empfänger nach der Wahl in der Akte (schueler_eltern), wie der Server; Test: nur die Test-Adresse
    const anS = String(s.email || (s.ausbildung || {}).email || "").trim().toLowerCase();
    const el = (F.tabellen.schueler_eltern || []).find((e) => e.schueler_id === s.id) || {}, anE = String(el.email || "").trim().toLowerCase();
    const wahl = anE ? (["schueler", "eltern", "beide"].includes(el.mail_an) ? el.mail_an : "beide") : "schueler";
    const alle = [];
    if ((wahl === "schueler" || wahl === "beide") && anS) alle.push(anS);
    if ((wahl === "eltern" || wahl === "beide") && anE && !alle.includes(anE)) alle.push(anE);
    const liste = echt ? alle : [z.test_email || "betreiber@example.org"];
    if (echt && !liste.length) return { fehler: "keine_email" };
    if (echt && Array.isArray(b.erwartete_empfaenger) && b.erwartete_empfaenger.map((x) => String(x).toLowerCase()).sort().join(",") !== liste.slice().sort().join(",")) return { fehler: "empfaenger_geaendert" }; // wie der Server (409)
    F.letzteEmpfaenger = liste.slice(); // für Tests: an wen die Mail ginge (je Adresse eine eigene Mail, wie der Server)
    const nichtAn = f === "zweite" && liste.length === 2 ? ["Eltern"] : undefined; // Tests: zweite Mail scheitert
    const jetzt = new Date().toISOString(), id = "zm-" + Math.random().toString(36).slice(2, 10);
    const kurz = liste.map((an) => an.slice(0, 1) + "***@" + (an.split("@")[1] || "")).join(", ");
    mails.push({ id, fahrschule_id: ich.fahrschule_id, schueler_id: s.id, art: b.art, betrag_cent: b.betrag_cent, wofuer: w, modus: echt ? "echt" : "test", empfaenger_kurz: kurz, status: "gesendet", gesendet_von: ich.id, bearbeiter: ich.name, angelegt_am: jetzt, gesendet_am: jetzt });
    return { ok: true, id, modus: echt ? "echt" : "test", gesendet_am: jetzt, empfaenger_kurz: kurz, nicht_an: nichtAn };
  };
  // PIN-Funktionen wie in der Datenbank (vereinfacht). Der Schlüssel kommt hier aus dem Tab-Speicher statt aus der Kopfzeile.
  F.sitzungen = F.sitzungen || {};
  const zuEinfach = (p) => {
    if (!/^[0-9]{4}$/.test(p)) return true;
    const d = p.split("").map(Number);
    if (d.every((x) => x === d[0])) return true;
    let auf = true, ab = true;
    for (let i = 0; i < 3; i++) { if (d[i + 1] !== (d[i] + 1) % 10) auf = false; if (d[i + 1] !== (d[i] + 9) % 10) ab = false; }
    return auf || ab || (d[0] === d[2] && d[1] === d[3]) || (d[0] === d[1] && d[2] === d[3]);
  };
  const personen = () => tabelle("buero_personen");
  const meineSitzung = () => {
    let t = null;
    try { t = sessionStorage.getItem("buero-abmelden") || (JSON.parse(sessionStorage.getItem("buero-sitzung") || "null") || {}).token; } catch (e) { /* keine */ }
    return t && F.sitzungen[t] ? Object.assign({ token: t }, F.sitzungen[t]) : null;
  };
  const meinProfil = () => (F.tabellen.profiles || []).find((p) => F.session && p.id === F.session.user.id) || {};
  const darfVerwalten = () => { const r = meinProfil().rolle; if (r === "super_admin" || r === "fahrschule_admin") return true; const s = meineSitzung(); const p = s && personen().find((x) => x.id === s.person); return !!(p && p.darf_verwalten); };
  // Wie schueler_paket_verkaufen / schueler_paket_aktivieren (Migration 20261124_paket_01): Rolle prüfen, altes Paket stornieren,
  // neues als feste Kopie (Gesamt rechnet der Server), schueler.paket_id = Vorlage. Fehler werden wie in der Datenbank geworfen.
  const paketRolle = () => { const r = meinProfil().rolle; if (!["buero", "fahrschule_admin", "super_admin"].includes(r)) throw new Error("Pakete verkauft nur das Büro oder die Leitung."); };
  const paketBearbeiter = () => { const si = meineSitzung(); const p = si && personen().find((x) => x.id === si.person); return p ? p.name : null; };
  const R = {
    schueler_paket_verkaufen: ({ p_schueler, p_vorlage, p_name, p_klasse, p_posten }) => {
      paketRolle();
      if (!Array.isArray(p_posten) || !p_posten.length) throw new Error("Das Paket hat noch keine Posten.");
      const s = tabelle("schueler").find((x) => x.id === p_schueler);
      if (!s) throw new Error("Schüler nicht gefunden");
      if (p_vorlage && tabelle("fahrschule_pakete").some((v) => v.id === p_vorlage && v.aktiv === false)) throw new Error("Diese Vorlage ist archiviert.");
      for (const e of p_posten) if (!Number.isInteger(e.preis_cent) || !Number.isInteger(e.anzahl) || e.anzahl < 1) throw new Error('new row for relation "schueler_pakete" violates check constraint "schueler_pakete_posten_check"');
      const jetzt = new Date().toISOString();
      tabelle("schueler_pakete").filter((x) => x.schueler_id === p_schueler && !x.storniert_am).forEach((x) => { x.storniert_am = jetzt; });
      const zeile = { id: "sp-" + Math.random().toString(36).slice(2, 10), fahrschule_id: s.fahrschule_id, schueler_id: p_schueler, vorlage_id: p_vorlage || null,
        name: String(p_name || "").trim(), klasse: p_klasse || null, posten: JSON.parse(JSON.stringify(p_posten)),
        gesamt_cent: p_posten.reduce((a, e) => a + e.anzahl * e.preis_cent, 0), verkauft_am: jetzt, verkauft_von: F.session && F.session.user.id, bearbeiter: paketBearbeiter(), storniert_am: null, storniert_von: null };
      tabelle("schueler_pakete").push(zeile);
      s.paket_id = p_vorlage || null;
      return JSON.parse(JSON.stringify(zeile));
    },
    schueler_paket_aktivieren: ({ p_schueler, p_paket }) => {
      paketRolle();
      let v = null;
      if (p_paket) { const z = tabelle("schueler_pakete").find((x) => x.id === p_paket && x.schueler_id === p_schueler); if (!z) throw new Error("Paket nicht gefunden"); v = z.vorlage_id; }
      const jetzt = new Date().toISOString();
      tabelle("schueler_pakete").filter((x) => x.schueler_id === p_schueler && !x.storniert_am && x.id !== p_paket).forEach((x) => { x.storniert_am = jetzt; });
      if (p_paket) tabelle("schueler_pakete").filter((x) => x.id === p_paket).forEach((x) => { x.storniert_am = null; });
      const s = tabelle("schueler").find((x) => x.id === p_schueler); if (s) s.paket_id = v;
      return null;
    },
    buero_pin_anmelden: ({ p_person, p_pin, p_erste }) => {
      const p = personen().find((x) => x.id === p_person && x.aktiv !== false);
      if (!p) return { fehler: "unbekannt" };
      if (p.gesperrt_bis && new Date(p.gesperrt_bis) > new Date()) return { fehler: "gesperrt", bis: p.gesperrt_bis };
      if (!/^[0-9]{4}$/.test(p_pin || "")) return { fehler: "format" };
      let erst = false;
      if (!p._pin) {
        if (!p_erste) return { fehler: "keine_pin" };
        if (!p.pin_frei_bis || new Date(p.pin_frei_bis) < new Date()) return { fehler: "nicht_freigegeben" };
        if (zuEinfach(p_pin)) return { fehler: "zu_einfach" };
        p._pin = p_pin; p.hat_pin = true; p.pin_frei_bis = null; erst = true;
      } else if (p_erste) return { fehler: "hat_pin" };
      else if (p._pin !== p_pin) {
        p.fehlversuche = (p.fehlversuche || 0) + 1;
        if (p.fehlversuche >= 5) { p.fehlversuche = 0; p.gesperrt_bis = new Date(Date.now() + 15 * 60000).toISOString(); return { fehler: "gesperrt", bis: p.gesperrt_bis }; }
        return { fehler: "falsch", rest: 5 - p.fehlversuche };
      }
      p.fehlversuche = 0;
      const token = "tok-" + p.id + "-" + Math.random().toString(36).slice(2, 8);
      F.sitzungen[token] = { person: p.id, nurPin: !!p.pin_neu_noetig };
      return { token, id: p.id, name: p.name, pin_neu_noetig: !!p.pin_neu_noetig, darf_verwalten: !!p.darf_verwalten, erste_pin: erst };
    },
    buero_sitzung_pruefen: () => { const s = meineSitzung(); const p = s && personen().find((x) => x.id === s.person && x.aktiv !== false); return p ? { gueltig: true, id: p.id, name: p.name, pin_neu_noetig: s.nurPin, darf_verwalten: p.darf_verwalten } : { gueltig: false }; },
    buero_sitzung_beenden: () => { const s = meineSitzung(); if (s) delete F.sitzungen[s.token]; return { ok: true }; },
    buero_pin_aendern: ({ p_neu }) => {
      const s = meineSitzung(); if (!s) return { fehler: "keine_sitzung" };
      if (zuEinfach(p_neu || "")) return { fehler: "zu_einfach" };
      const p = personen().find((x) => x.id === s.person);
      if (p._pin === p_neu) return { fehler: "gleich" };
      p._pin = p_neu; p.hat_pin = true; p.pin_neu_noetig = false; F.sitzungen[s.token].nurPin = false; return { ok: true };
    },
    buero_person_speichern: ({ p_id, p_fahrschule, p_name, p_telefon, p_darf_verwalten, p_aktiv }) => {
      if (!darfVerwalten()) return { fehler: "keine_berechtigung" };
      const name = String(p_name || "").trim(); if (!name || name.length > 30) return { fehler: "name" };
      if (p_aktiv !== false && personen().some((x) => x.aktiv !== false && x.id !== p_id && x.name.toLowerCase() === name.toLowerCase())) return { fehler: "doppelt" };
      const chef = ["super_admin", "fahrschule_admin"].includes(meinProfil().rolle);
      if (!p_id) { const n = { id: "bp-" + Math.random().toString(36).slice(2, 8), fahrschule_id: p_fahrschule, name, telefon: p_telefon || null, hat_pin: false, _pin: null, darf_verwalten: chef && !!p_darf_verwalten, aktiv: true, gesperrt_bis: null, fehlversuche: 0 }; personen().push(n); return { ok: true, id: n.id }; }
      const p = personen().find((x) => x.id === p_id); if (!p) return { fehler: "unbekannt" };
      Object.assign(p, { name, telefon: p_telefon || null, aktiv: p_aktiv !== false });
      if (chef && p_darf_verwalten != null) p.darf_verwalten = !!p_darf_verwalten;
      return { ok: true, id: p.id };
    },
    buero_fahrlehrer_akte: ({ p_id, p_daten }) => {
      if (!darfVerwalten()) return { fehler: "keine_berechtigung" };
      const p = (F.tabellen.profiles || []).find((x) => x.id === p_id); if (!p) return { fehler: "unbekannt" };
      const fl = (p_daten.fahrlehrerlaubnis || []).filter((k) => ["A", "BE", "CE", "DE"].includes(k)).sort();
      // wie in der Datenbank: ohne Fahrlehrerlaubnis bleiben die bisherigen Klassen (Altbestand)
      const kl = fl.length ? [...new Set(fl.flatMap((k) => ({ BE: ["B", "BE"], A: ["A"], CE: ["C1", "C1E", "C", "CE"], DE: ["D1", "D1E", "D", "DE"] })[k]))].sort() : (p.klassen || []);
      Object.assign(p, p_daten, { fahrlehrerlaubnis: fl, klassen: kl }); return { ok: true, klassen: kl };
    },
    buero_fahrlehrer_klassen: ({ p_id, p_klassen }) => {
      if (!darfVerwalten()) return { fehler: "keine_berechtigung" }; // wie in der Datenbank: nur mit Verwalten-Recht
      const p = (F.tabellen.profiles || []).find((x) => x.id === p_id); if (!p) return { fehler: "unbekannt" };
      p.klassen = [...new Set(p_klassen || [])].sort(); return { ok: true };
    },
    buero_pin_zuruecksetzen: ({ p_person }) => {
      if (!darfVerwalten()) return { fehler: "keine_berechtigung" };
      const p = personen().find((x) => x.id === p_person); if (!p) return { fehler: "unbekannt" };
      Object.assign(p, { _pin: null, hat_pin: false, pin_neu_noetig: false, fehlversuche: 0, gesperrt_bis: null, pin_frei_bis: new Date(Date.now() + 24 * 3600000).toISOString() });
      for (const [t, s] of Object.entries(F.sitzungen)) if (s.person === p.id) delete F.sitzungen[t];
      return { ok: true, name: p.name };
    },
  };
  for (const [k, f] of Object.entries(R)) if (!F.rpcs[k]) F.rpcs[k] = f;
  window.__FAKE = F;

  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function tabelle(name) { if (!F.tabellen[name]) F.tabellen[name] = []; return F.tabellen[name]; }

  // Wie der Trigger trg_termin_zz_nachweis_spur (supabase/migrations/20261121_nachweis_01_termin_spur.sql)
  function terminSpur(alt, r) {
    const p = r.payload || {}; const grund = p.korrekturGrund || null; delete p.korrekturGrund;
    const si = meineSitzung(); const per = si && personen().find((x) => x.id === si.person);
    const zeile = (feld, a, n) => tabelle("aenderungsprotokoll").push({ id: tabelle("aenderungsprotokoll").length + 1, fahrschule_id: r.fahrschule_id, tabelle: "kalender_termine", datensatz_id: r.id, feld, alt: a, neu: n, geaendert_von: (F.session && F.session.user && F.session.user.id) || null, geaendert_am: new Date().toISOString(), bearbeiter: per ? per.name : null, grund });
    if (!alt) { zeile("angelegt", null, `${r.datum} ${r.von || ""}–${r.bis || ""}`); return; }
    const ap = alt.payload || {};
    if (ap.signed && ["datum", "von", "bis", "art", "schueler_id"].some((k) => alt[k] !== r[k])) {
      Object.assign(p, { signed: false, signatureSnap: null, signaturUngueltig: { am: new Date().toISOString(), alt: { datum: alt.datum, von: alt.von, bis: alt.bis, art: alt.art }, signedAt: ap.signedAt || null, snap: ap.signatureSnap || null } });
    }
    r.payload = p;
    for (const k of ["datum", "von", "bis", "art", "schueler_id", "fahrlehrer_id", "geloescht", "status"]) if (String(alt[k] ?? "") !== String(r[k] ?? "")) zeile(k, alt[k] == null ? null : String(alt[k]), r[k] == null ? null : String(r[k]));
    for (const k of ["sonderArt", "signed"]) { const a = k === "signed" ? String(!!ap[k]) : ap[k] ?? null, n = k === "signed" ? String(!!p[k]) : p[k] ?? null; if (a !== n) zeile(k, a, n); }
  }
  // Wie der Trigger fahrschule_pakete_stempel (supabase/migrations/20261124_paket_01_baukasten.sql)
  function paketStempel(zeilen) {
    const si = meineSitzung(); const p = si && personen().find((x) => x.id === si.person);
    zeilen.forEach((r) => { r.name = String(r.name || "").trim(); r.klasse = r.klasse ? String(r.klasse).trim() || null : null; r.aktualisiert_am = new Date().toISOString(); r.bearbeiter = p ? p.name : null; if (!Array.isArray(r.posten)) r.posten = []; if (r.aktiv == null) r.aktiv = true; });
  }
  class Abfrage {
    constructor(name) { this.name = name; this.filter = []; this.art = "select"; this.einzeln = null; this.sort = []; this.grenze = null; this.nachher = false; }
    select() { if (this.art !== "select") this.nachher = true; return this; }
    eq(k, v) { this.filter.push((r) => r[k] === v); return this; }
    neq(k, v) { this.filter.push((r) => r[k] !== v); return this; }
    in(k, l) { this.filter.push((r) => l.includes(r[k])); return this; }
    gte(k, v) { this.filter.push((r) => r[k] != null && r[k] >= v); return this; }
    lte(k, v) { this.filter.push((r) => r[k] != null && r[k] <= v); return this; }
    lt(k, v) { this.filter.push((r) => r[k] != null && r[k] < v); return this; }
    gt(k, v) { this.filter.push((r) => r[k] != null && r[k] > v); return this; }
    is(k, v) { this.filter.push((r) => (r[k] == null ? null : r[k]) === v); return this; }
    not(k, op, v) { if (op === "is") this.filter.push((r) => (r[k] == null ? null : r[k]) !== v); return this; }
    order(k, o) { this.sort.push([k, !(o && o.ascending === false)]); return this; }
    limit(n) { this.grenze = n; return this; }
    range(a, b) { this.ab = a; this.grenze = b - a + 1; return this; }
    single() { this.einzeln = "single"; return this; }
    maybeSingle() { this.einzeln = "maybe"; return this; }
    insert(rows) { this.art = "insert"; this.daten = Array.isArray(rows) ? rows : [rows]; return this; }
    upsert(rows, opt) { this.art = "upsert"; this.daten = Array.isArray(rows) ? rows : [rows]; this.konflikt = (opt && opt.onConflict) || "id"; return this; }
    update(werte) { this.art = "update"; this.werte = werte; return this; }
    delete() { this.art = "delete"; return this; }
    passt(r) { return this.filter.every((f) => f(r)); }
    ausfuehren() {
      const t = tabelle(this.name);
      if (F.fehler && F.fehler[this.name]) return { data: null, error: { message: F.fehler[this.name] } };
      let daten;
      if (this.art === "insert") {
        daten = this.daten.map((r) => Object.assign({ id: r.id || ("fake-" + Math.random().toString(36).slice(2, 10)), erstellt_am: new Date().toISOString() }, kopie(r)));
        // wie der Trigger in der Datenbank: wer die Aufgabe anlegt, kommt aus der PIN-Sitzung
        if (this.name === "schueler_aufgaben") { const si = meineSitzung(); const p = si && personen().find((x) => x.id === si.person); daten.forEach((r) => { r.von_person_id = si ? si.person : null; r.bearbeiter = p ? p.name : null; }); }
        // wie der Schutz-Trigger der Preisliste (K9): Verfasser und Zeit vom Server
        if (this.name === "fahrschule_preise") { const si = meineSitzung(); const p = si && personen().find((x) => x.id === si.person); daten.forEach((r) => { r.angelegt_von = (F.session && F.session.user && F.session.user.id) || null; r.angelegt_am = new Date().toISOString(); r.bearbeiter = p ? p.name : null; }); }
        t.push(...daten);
        // wie der Schutz-Trigger von fahrzeug_konflikt_gesehen (K18): wer und wann kommen vom Server
        if (this.name === "fahrzeug_konflikt_gesehen") { const si = meineSitzung(); const p = si && personen().find((x) => x.id === si.person); daten.forEach((r) => { r.gesehen_von = (F.session && F.session.user && F.session.user.id) || null; r.gesehen_am = new Date().toISOString(); r.bearbeiter = p ? p.name : null; }); }
        if (this.name === "zahlungs_mails") daten.forEach((r) => { r.angelegt_am = r.angelegt_am || new Date().toISOString(); });
        if (this.name === "fahrschule_pakete") paketStempel(daten);
        if (this.name === "kalender_termine") daten.forEach((r) => terminSpur(null, r));
      } else if (this.art === "upsert") {
        const k = this.konflikt.split(",");
        daten = this.daten.map((r) => {
          const alt = t.find((x) => k.every((s) => x[s] === r[s]));
          // wie der Schutz-Trigger der Zahlungsdaten (Werkstatt 11): Zeit und Bearbeiter kommen vom Server
          const spur = (z) => { if (this.name === "fahrschule_zahlungsdaten") { const si = meineSitzung(); const p = si && personen().find((x) => x.id === si.person); z.geaendert_am = new Date().toISOString(); z.geaendert_von = (F.session && F.session.user && F.session.user.id) || null; z.bearbeiter = p ? p.name : null; } return z; };
          if (alt) { Object.assign(alt, kopie(r)); return spur(alt); }
          const neu = Object.assign(this.name === "fahrschule_zahlungsdaten" ? {} : { id: r.id || ("fake-" + Math.random().toString(36).slice(2, 10)) }, kopie(r)); t.push(neu); return spur(neu);
        });
      } else if (this.art === "update") {
        daten = t.filter((r) => this.passt(r));
        daten.forEach((r) => { const alt = kopie(r); Object.assign(r, kopie(this.werte)); if (this.name === "kalender_termine") terminSpur(alt, r); });
        if (this.name === "fahrschule_pakete") paketStempel(daten);
      } else if (this.art === "delete") {
        daten = t.filter((r) => this.passt(r));
        F.tabellen[this.name] = t.filter((r) => !this.passt(r));
      } else {
        daten = t.filter((r) => this.passt(r));
        for (const [k, auf] of this.sort.slice().reverse()) {
          daten = daten.slice().sort((a, b) => { const x = a[k], y = b[k]; if (x == y) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : 1) * (auf ? 1 : -1); });
        }
        if (this.grenze != null) daten = daten.slice(this.ab || 0, (this.ab || 0) + this.grenze);
      }
      F.log.push({ tabelle: this.name, art: this.art, anzahl: daten.length, werte: this.werte || this.daten || null });
      daten = kopie(daten);
      if (this.einzeln) {
        if (daten.length === 0) return this.einzeln === "single" ? { data: null, error: { message: "keine Zeile" } } : { data: null, error: null };
        return { data: daten[0], error: null };
      }
      return { data: (this.art === "select" || this.nachher) ? daten : null, error: null };
    }
    then(ok, nein) { return (F.verzoegerung ? new Promise((r) => setTimeout(r, F.verzoegerung)).then(() => this.ausfuehren()) : Promise.resolve(this.ausfuehren())).then(ok, nein); }
  }

  window.supabase = {
    createClient() {
      return {
        from: (name) => new Abfrage(name),
        rpc: async (name, args) => {
          F.log.push({ rpc: name, args });
          const f = F.rpcs[name];
          if (!f) return { data: null, error: { message: "rpc fehlt: " + name } };
          try { return { data: await f(args, F), error: null }; } catch (e) { return { data: null, error: { message: e.message } }; }
        },
        functions: {
          invoke: async (name, opt) => {
            F.log.push({ function: name, body: opt && opt.body });
            const f = F.functions[name];
            if (!f) return { data: null, error: { message: "function fehlt: " + name } };
            try { return { data: await f(opt && opt.body, F), error: null }; } catch (e) { return { data: null, error: { message: e.message } }; }
          }
        },
        auth: {
          getSession: async () => ({ data: { session: F.session }, error: null }),
          getUser: async () => ({ data: { user: F.session && F.session.user }, error: null }),
          signInWithPassword: async ({ email, password }) => {
            const k = (F.konten || []).find((x) => x.email === email && x.password === password);
            if (!k) return { data: {}, error: { message: "Invalid login credentials" } };
            F.session = { user: { id: k.id, email } };
            return { data: { user: F.session.user, session: F.session }, error: null };
          },
          signOut: async () => { F.session = null; return { error: null }; },
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        },
      };
    },
  };
})();
