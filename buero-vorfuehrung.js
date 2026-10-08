/* Kompass Büro – Vorführung und Tests
   Ersetzt die Datenbank durch eine Attrappe im Speicher des Browsers. Nichts wird gespeichert,
   nichts verlässt den Browser. Alle Namen sind erfunden (keine echten Schüler).
   - Vorführung: buero.html?vorfuehrung  (für das Teammeeting, auch ohne Internet-Datenbank)
   - Tests:      scripts/buero-test.mjs setzt vorher window.__FAKE mit eigenen Daten. */
const VORNAMEN = ["Lena", "Jonas", "Mira", "Elias", "Sofia", "Noah", "Emilia", "Ben", "Hanna", "Luca", "Ella", "Finn", "Lia", "Paul", "Ida", "Emil", "Nora", "Theo", "Clara", "Anton", "Maja", "Leon", "Frida", "Karl"];
const NACHNAMEN = ["Testmann", "Beispiel", "Muster", "Probe", "Demo", "Vorlage", "Platzhalter", "Fiktiv"];

function addTage(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function addMonate(iso, n) { const d = new Date(iso + "T12:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); }

function bauDaten(heute) {
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
    { id: "sa-1", name: "Super-Admin", email: "super@example.org", rolle: "super_admin", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
    { id: "fl-x", name: "Fahrlehrerin Elif", email: "fl@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: "1.0" },
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
      fahrschulen: [{ id: FS, name: "Vorführ-Fahrschule", slug: "test", aktiv: true, konfiguration: { akademieVermittlung: { betragAkademie: 100, betragSimulator: 149, splitKollege: { fahrlehrer: 15, fahrschule: 45, plattform: 20, akademie: 20 } } } }, { id: "fs-test-2", name: "Zweite Testschule", slug: "test2", aktiv: true, konfiguration: {} }],
      profiles: [...lehrer, ...buero],
      schueler, kalender_termine: termine, kalender_pruefungen: pruefungen, pruefungstermine,
      fahrschule_fahrzeuge: [
        { id: "fz-1", fahrschule_id: FS, name: "Golf Schalter 1", typ: "schalt", aktiv: true, erstellt_am: "2026-01-01" },
        { id: "fz-2", fahrschule_id: FS, name: "Golf Schalter 2", typ: "schalt", aktiv: true, erstellt_am: "2026-01-02" },
        { id: "fz-3", fahrschule_id: FS, name: "Golf Automatik 1", typ: "automatik", aktiv: true, erstellt_am: "2026-01-03" },
        { id: "fz-4", fahrschule_id: FS, name: "Golf Automatik 2", typ: "automatik", aktiv: true, erstellt_am: "2026-01-04" },
      ],
      fahrschule_pakete: [{ id: "p-1", fahrschule_id: FS, name: "Boost-Paket 1" }, { id: "p-turbo", fahrschule_id: FS, name: "Turboboost" }],
    },
  };
}

if (typeof module !== "undefined" && module.exports) { module.exports = { bauDaten }; } else
(function () {
  "use strict";
  // Ohne Test-Daten: Vorführung mit erfundener Fahrschule, angemeldet als Fahrschul-Leitung
  if (!window.__FAKE) {
    const d = bauDaten(new Date().toISOString().slice(0, 10));
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: { user: { id: "ad-1", email: "leitung@example.org" } }, vorfuehrung: true,
      functions: { "admin-create-account": (b) => ({ email: b.email || "beispiel@example.org", passwort: "Vorfuehrung-1234" }) } };
  }
  const F = window.__FAKE;
  F.log = [];
  F.tabellen = F.tabellen || {};
  F.rpcs = F.rpcs || {};
  F.functions = F.functions || {};
  window.__FAKE = F;

  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function tabelle(name) { if (!F.tabellen[name]) F.tabellen[name] = []; return F.tabellen[name]; }

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
        t.push(...daten);
      } else if (this.art === "upsert") {
        const k = this.konflikt.split(",");
        daten = this.daten.map((r) => {
          const alt = t.find((x) => k.every((s) => x[s] === r[s]));
          if (alt) { Object.assign(alt, kopie(r)); return alt; }
          const neu = Object.assign({ id: r.id || ("fake-" + Math.random().toString(36).slice(2, 10)) }, kopie(r)); t.push(neu); return neu;
        });
      } else if (this.art === "update") {
        daten = t.filter((r) => this.passt(r));
        daten.forEach((r) => Object.assign(r, kopie(this.werte)));
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
    then(ok, nein) { return Promise.resolve(this.ausfuehren()).then(ok, nein); }
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
