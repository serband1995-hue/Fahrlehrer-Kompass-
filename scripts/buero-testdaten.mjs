// Erfundene Testdaten für die Büro-Seite (keine echten Personen).
// Wird von scripts/buero-test.mjs genutzt; „heute“ wird übergeben, damit Fristen immer passen.

const VORNAMEN = ["Lena", "Jonas", "Mira", "Elias", "Sofia", "Noah", "Emilia", "Ben", "Hanna", "Luca", "Ella", "Finn", "Lia", "Paul", "Ida", "Emil", "Nora", "Theo", "Clara", "Anton", "Maja", "Leon", "Frida", "Karl"];
const NACHNAMEN = ["Testmann", "Beispiel", "Muster", "Probe", "Demo", "Vorlage", "Platzhalter", "Fiktiv"];

function addTage(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function addMonate(iso, n) { const d = new Date(iso + "T12:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); }

export function bauDaten(heute) {
  const FS = "fs-test-1";
  const lehrer = [
    { id: "fl-1", name: "Fahrlehrer Anton", email: "anton@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-2", name: "Fahrlehrerin Berta", email: "berta@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-3", name: "Fahrlehrer Cem", email: "cem@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-4", name: "Fahrlehrer Dario (extern)", email: "dario@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
  ];
  const buero = [
    { id: "bu-1", name: "Büro Testperson", email: "buero@example.org", rolle: "buero", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "ad-1", name: "Leitung Testperson", email: "leitung@example.org", rolle: "fahrschule_admin", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "sa-1", name: "Super Admin Test", email: "super@example.org", rolle: "super_admin", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-x", name: "Nur Fahrlehrer", email: "fl@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "gesperrt-1", name: "Gesperrt Test", email: "gesperrt@example.org", rolle: "buero", fahrschule_id: FS, aktiv: false, agb_akzeptiert_version: "1.0" },
    { id: "agb-1", name: "Ohne AGB", email: "agb@example.org", rolle: "buero", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: null },
  ];
  const schueler = [];
  let n = 0;
  for (const nach of NACHNAMEN) for (const vor of VORNAMEN.slice(0, 3)) {
    n++;
    const fl = n % 9 === 0 ? null : lehrer[n % lehrer.length].id;
    schueler.push({
      id: "s" + n, fahrschule_id: FS, fahrlehrer_id: fl, name: `${vor} ${nach}`, telefon: "0170 000" + String(n).padStart(4, "0"),
      status: "aktiv", paket_id: n % 4 === 0 ? "p-turbo" : (n % 2 ? "p-1" : null), hat_simulator: n % 5 === 0, hat_theorie_app: n % 3 === 0,
      bogen_ausgefuellt: true,
      vertrag_am: n % 7 === 0 ? null : addTage(heute, -[400, 380, 370, 350, 340, 200, 90, 30, 500, 366, 330, 100][n % 12]),
      reakt_status: n % 10 === 0 ? "befreit" : (n % 3 === 0 ? "bezahlt" : "pruefen"),
      reakt_bezahlt_bis: n % 3 === 0 && n % 10 !== 0 ? addTage(heute, [-20, 15, 200][n % 3 === 0 ? (n / 3) % 3 : 0]) : null,
      reakt_notiz: n % 10 === 0 ? "Prüfung bestanden" : null,
      ausbildungsart: n % 11 === 0 ? "umschreibung" : "neu", klasse: n % 8 === 0 ? "CE" : "B",
      theorie_abgeschlossen_am: n % 4 === 0 ? addTage(heute, -[340, 100, 380][n % 3]) : null,
      theorie_bestanden_am: n % 8 === 0 ? addTage(heute, -50) : null,
      erstellt_am: addMonate(heute, -((n % 14) + 1)) + "T10:00:00Z", ausbildung: { form: n % 6 === 0 ? "B197" : "B" },
    });
  }
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
          art: zi === 5 && tag % 4 === 0 ? "sonder" : (zi === 2 ? "fahrstunde" : "fahrstunde"), fahrzeug: li % 2 ? "Golf Automatik" : "Golf Schalter",
          status: "geplant", geloescht: false, payload: t % 13 === 0 ? { fc: "v1" } : (t % 17 === 0 ? { fc: "v2" } : {}), buero_fc_status: "offen",
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
  const jetztMonat = heute.slice(0, 7) + "-03T10:00:00Z";
  const fahrschule_empfehlungen = [
    { id: "e1", fahrschule_id: FS, schueler_id: "s4", schueler_name: "Jonas Muster", fahrlehrer_id: "fl-1", fahrlehrer_name: "Fahrlehrer Anton", typ: "akademie", status: "empfohlen", erstellt_am: jetztMonat },
    { id: "e2", fahrschule_id: FS, schueler_id: "s6", schueler_name: "Jonas Beispiel", fahrlehrer_id: "fl-2", fahrlehrer_name: "Fahrlehrerin Berta", typ: "simulator", status: "zugangsdaten_ausgegeben", erstellt_am: jetztMonat },
    { id: "e3", fahrschule_id: FS, schueler_id: "s10", schueler_name: "Lena Demo", fahrlehrer_id: "fl-1", fahrlehrer_name: "Fahrlehrer Anton", typ: "akademie", status: "bezahlt", betrag: 100, aufteilung: { fahrlehrer: 15, fahrschule: 45, plattform: 20, akademie: 20 }, erstellt_am: jetztMonat, aktualisiert_am: jetztMonat },
  ];
  const provisionen = [{ id: "pv1", fahrlehrer_id: "fl-1", fahrschule_id: FS, typ: "akademie", schueler_id: "s10", betrag: 15, status: "offen", erstellt_am: jetztMonat }];
  return {
    FS,
    konten: [...lehrer, ...buero].map((p) => ({ id: p.id, email: p.email, password: "test1234" })),
    tabellen: {
      fahrschule_empfehlungen, provisionen,
      fahrschulen: [{ id: FS, name: "Fahrschule Testhausen", slug: "test", aktiv: true, konfiguration: { akademieVermittlung: { betragAkademie: 100, betragSimulator: 149, splitKollege: { fahrlehrer: 15, fahrschule: 45, plattform: 20, akademie: 20 } } } }, { id: "fs-test-2", name: "Zweite Testschule", slug: "test2", aktiv: true, konfiguration: {} }],
      profiles: [...lehrer, ...buero],
      schueler, kalender_termine: termine, kalender_pruefungen: pruefungen, pruefungstermine,
      fahrschule_fahrzeuge: [
        { id: "fz-1", fahrschule_id: FS, name: "Golf Schalter", typ: "schalt", aktiv: true, erstellt_am: "2026-01-01" },
        { id: "fz-2", fahrschule_id: FS, name: "Golf Automatik", typ: "automatik", aktiv: true, erstellt_am: "2026-01-02" },
      ],
      fahrschule_pakete: [{ id: "p-1", fahrschule_id: FS, name: "Boost-Paket 1" }, { id: "p-turbo", fahrschule_id: FS, name: "Turboboost" }],
    },
  };
}
