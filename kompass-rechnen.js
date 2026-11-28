/* Fahrlehrer-Kompass – gemeinsame Rechenregeln
   Wird von der Büro-Seite (buero.html) genutzt. Die Regeln sind 1:1 aus index.html übernommen,
   damit Büro und Fahrlehrer dieselben Zahlen sehen. Ein Test (scripts/rechnen-test.mjs) prüft,
   dass beide Fassungen gleich rechnen. Wer hier etwas ändert, muss index.html mit ändern. */
(function (root) {
  "use strict";

  // Büro-Kategorien sind keine bezahlten Fahrstunden-UE (index.html: FS_BUERO_ARTEN)
  const FS_BUERO_ARTEN = ["beratung", "ersthilfe", "vortest", "simulator", "mpu"];
  // W28: nur im Büro – nicht in App, Lohn, UE, Fahrcheck, Statistik, Nachweis, Monatsbericht (index.html: NUR_BUERO_ARTEN)
  const NUR_BUERO_ARTEN = ["vortest", "simulator", "beratung", "mpu"];
  function istNurBueroArt(art) { return NUR_BUERO_ARTEN.indexOf(art) >= 0; }

  function pad2(n) { return String(n).padStart(2, "0"); }
  function hm2min(hm) { const p = ("" + hm).split(":"); return (+p[0]) * 60 + (+(p[1] || 0)); }
  function parseISO(iso) { const p = ("" + iso).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dateISO(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function todayISO() { return dateISO(new Date()); }

  // Unterrichtseinheiten eines Termins (identisch mit ueOf in index.html)
  function ueOf(art, von, bis, tatsaechlicheDauer) {
    if (art === "block") return 0;
    if (FS_BUERO_ARTEN.includes(art)) return 0;
    if (art === "schalt") return 0.33;
    if (art === "pruefung") return 2;
    if (typeof tatsaechlicheDauer === "number" && tatsaechlicheDauer >= 0) { return Math.round((tatsaechlicheDauer / 90) * 2 * 100) / 100; }
    if (art === "theorie") { if (von && bis) { const dur = hm2min(bis) - hm2min(von); return Math.round((dur / 90) * 2 * 100) / 100; } return 4; }
    if ((art === "fahrstunde" || art === "sonder" || art === "nacht") && von && bis) { const dur = hm2min(bis) - hm2min(von); if (dur > 0) return Math.round((dur / 45) * 100) / 100; }
    return 2;
  }

  // Datum + Monate. Fällt der Tag weg (31. → Februar), gilt der letzte Tag des Zielmonats.
  function addMonthsISO(iso, monate) {
    const d = parseISO(iso);
    const tag = d.getDate();
    const ziel = new Date(d.getFullYear(), d.getMonth() + monate, 1);
    const letzter = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
    ziel.setDate(Math.min(tag, letzter));
    return dateISO(ziel);
  }
  // Tage von a bis b (b später = positiv), unabhängig von Sommerzeit
  function daysBetweenISO(a, b) {
    const da = parseISO(a), db = parseISO(b);
    return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000);
  }
  function addDaysISO(iso, tage) { const d = parseISO(iso); d.setDate(d.getDate() + tage); return dateISO(d); }

  /* ----- Fristen (Fahrschule Boost, laut Serband 08.10.2026) -----
     Reaktivierung: 12 Monate nach Vertragsabschluss fällig, danach jedes Jahr.
     reakt_bezahlt_bis = nächste Fälligkeit; ist sie vorbei, ist die Reaktivierung offen.
     Eine Zahlung verschiebt die Fälligkeit um genau 12 Monate (auch bei später Zahlung,
     wer zwei Jahre im Rückstand ist, bleibt nach einer Zahlung weiter überfällig). */
  /* W15 (🗣 Serband 24.11.2026): Regel der Fahrschule vom Server (rpc reakt_regel, gleiche Regel wie die Sperre in der
     Datenbank, supabase/migrations/20261126_w15_01): { monate, frei: [{ ab, bis }] } – Zeiträume, in denen die Reaktivierung
     laut Preisliste entfällt oder 0 € kostet (ohne Beträge). Frei heute ODER am Vertragstag = Stufe „entfaellt“ (keine
     Fälligkeit, keine Sperre). Ohne Regel (null) rechnet alles wie vorher: 12 Monate, nie frei.
     Büro und App setzen die Regel einmal mit setzeReaktRegel; ein drittes Argument „regel“ geht vor (Tests, Attrappe). */
  const REAKT_MONATE_STANDARD = 12;
  const ISO_TAG = /^\d{4}-\d{2}-\d{2}$/;
  /* W15 S3 (🗣 Serband 24.11.2026: „Alles ist einstellbar … unterteilt in Themen“): Dauer und Warnzeiten der Fristen je
     Fahrschule aus den Einstellungen (Tabelle fahrschule_einstellungen, Schlüssel „fristen.<art>“, Thema „Fristen“ im Büro).
     Büro und App setzen sie einmal mit setzeFristen({ theorie: { monate, bald_tage, vorwarn_tage }, … }); fehlt etwas oder
     ist es ungültig, gilt der Standard (= die Zahlen von vorher). Ein Argument „fr“ geht vor (Tests).
     bald_tage = gelb („bald“), vorwarn_tage = blau („demnächst“, nur wo es zwei Stufen gibt).
     Die MONATE der Reaktivierung kommen NICHT von hier, sondern aus reakt_regel (danach sperrt der Server;
     Migration 20261127_w15_02). fristen.reaktivierung.monate steht hier nur für die Anzeige im Büro.
     Gesetzlich fest (Entscheidung 4a), nur die Warnzeit ist einstellbar: Praxisprüfung 12 Monate nach der
     Theorieprüfung (§ 18 FeV, gilt auch für den Antrag nach bestandener Theorie), Umschreiber 6 Monate (§ 29 FeV). */
  const FRISTEN_STANDARD = Object.freeze({
    reaktivierung: Object.freeze({ monate: 12, bald_tage: 30, vorwarn_tage: 60 }),
    theorie: Object.freeze({ monate: 12, bald_tage: 30, vorwarn_tage: 60 }),
    antrag: Object.freeze({ monate: 12, bald_tage: 60 }),
    fc_zettel: Object.freeze({ monate: 12, bald_tage: 60 }),
    behoerde: Object.freeze({ bald_tage: 30, vorwarn_tage: 60 }),
    umschreiber: Object.freeze({ bald_tage: 30 }),
    fahrlehrer: Object.freeze({ bald_tage: 90 }),
  });
  // Grenzen wie der Server (fahrschule_einstellung_zahl: ganze Zahl, sonst oder außerhalb = Standard)
  const FRISTEN_GRENZEN = Object.freeze({ monate: [1, 60], bald_tage: [1, 365], vorwarn_tage: [1, 365] });
  const PRAXIS_NACH_THEORIE_MONATE = 12; // § 18 FeV, fest
  function fristZahl(v, standard, min, max) {
    if (typeof v !== "number" && typeof v !== "string") return standard;
    const t = String(v);
    if (!/^[0-9]{1,6}$/.test(t)) return standard;
    const n = Number(t);
    return n >= min && n <= max ? n : standard;
  }
  function normFristen(w) {
    const out = {};
    for (const art of Object.keys(FRISTEN_STANDARD)) {
      const std = FRISTEN_STANDARD[art], ein = w && typeof w === "object" && w[art] && typeof w[art] === "object" ? w[art] : {}, f = {};
      for (const feld of Object.keys(std)) f[feld] = fristZahl(ein[feld], std[feld], FRISTEN_GRENZEN[feld][0], FRISTEN_GRENZEN[feld][1]);
      if (f.vorwarn_tage !== undefined && f.vorwarn_tage < f.bald_tage) f.vorwarn_tage = f.bald_tage; // blau nie vor gelb
      out[art] = Object.freeze(f);
    }
    return Object.freeze(out);
  }
  // Zeilen der Tabelle fahrschule_einstellungen ({ schluessel: "fristen.theorie", wert: {…} }) → Eingabe für setzeFristen
  function fristenAusZeilen(zeilen) {
    const w = {};
    for (const z of zeilen || []) {
      const m = z && /^fristen\.([a-z_]+)$/.exec(String(z.schluessel || ""));
      if (m && FRISTEN_STANDARD[m[1]] && z.wert && typeof z.wert === "object") w[m[1]] = z.wert;
    }
    return w;
  }
  // Aus den Einstellungen von Werkstatt 11 (KE.wert(schluessel, standard)); ohne KE = null (Standard). KE als Argument, damit
  // diese Datei ohne KE läuft (Tests).
  function fristenAusKE(ke) {
    if (!ke || typeof ke.wert !== "function") return null;
    const w = {};
    for (const art of Object.keys(FRISTEN_STANDARD)) { try { w[art] = ke.wert("fristen." + art, Object.assign({}, FRISTEN_STANDARD[art])); } catch (e) { /* Standard */ } }
    return w;
  }
  let fristenAktiv = normFristen(null);
  function setzeFristen(w) { fristenAktiv = normFristen(w); return fristenAktiv; }
  function holeFristen() { return fristenAktiv; }
  function fristenVon(fr) { return fr === undefined ? fristenAktiv : normFristen(fr); }
  // Stufe nach Warnzeiten: bald (≤ bald_tage) | demnaechst (≤ vorwarn_tage, nur mit Vorwarnung) | ok
  function warnStufe(tage, f) { return tage <= f.bald_tage ? "bald" : (f.vorwarn_tage !== undefined && tage <= f.vorwarn_tage ? "demnaechst" : "ok"); }
  function normReaktRegel(r) {
    if (!r || typeof r !== "object") return null;
    const m = Number(r.monate);
    const frei = (Array.isArray(r.frei) ? r.frei : [])
      .map((z) => ({ ab: z && String(z.ab || "").slice(0, 10), bis: z && z.bis ? String(z.bis).slice(0, 10) : null }))
      .filter((z) => ISO_TAG.test(z.ab) && (z.bis === null || ISO_TAG.test(z.bis)));
    return { monate: Number.isInteger(m) && m >= 1 && m <= 120 ? m : REAKT_MONATE_STANDARD, frei };
  }
  let reaktRegelAktiv = null;
  function setzeReaktRegel(r) { reaktRegelAktiv = normReaktRegel(r); return reaktRegelAktiv; }
  function holeReaktRegel() { return reaktRegelAktiv; }
  function reaktRegelVon(regel) { return regel === undefined ? reaktRegelAktiv : normReaktRegel(regel); }
  function reaktMonate(regel) { const r = reaktRegelVon(regel); return r ? r.monate : REAKT_MONATE_STANDARD; }
  function reaktFreiAm(regel, tag) {
    const r = reaktRegelVon(regel), t = tag ? String(tag).slice(0, 10) : "";
    return !!(r && ISO_TAG.test(t) && r.frei.some((z) => z.ab <= t && (z.bis === null || t <= z.bis)));
  }
  /* Gleiche Rechnung wie reakt_regel in der Datenbank, aus Zeilen der Preisliste (Attrappe und SQL-Test).
     Je „gültig ab“-Tag gilt die zuletzt angelegte Zeile; frei = betrag_cent null (entfällt) oder 0. */
  function reaktRegelAusPreisen(zeilen, monate) {
    const zeit = (r) => { const t = Date.parse(r.angelegt_am || ""); return isNaN(t) ? 0 : t; };
    const eigene = (zeilen || []).filter((r) => r && r.art === "reaktivierung" && !r.klasse && ISO_TAG.test(String(r.gueltig_ab || "").slice(0, 10)))
      .slice().sort((a, b) => (a.gueltig_ab < b.gueltig_ab ? -1 : a.gueltig_ab > b.gueltig_ab ? 1 : zeit(a) - zeit(b) || String(a.id || "").localeCompare(String(b.id || ""))));
    const tage = [];
    for (const r of eigene) {
      const tag = String(r.gueltig_ab).slice(0, 10), frei = r.betrag_cent == null || Number(r.betrag_cent) === 0;
      if (tage.length && tage[tage.length - 1].ab === tag) tage[tage.length - 1].frei = frei; else tage.push({ ab: tag, frei });
    }
    const frei = tage.map((t, i) => ({ ab: t.ab, bis: tage[i + 1] ? addDaysISO(tage[i + 1].ab, -1) : null, f: t.frei }))
      .filter((t) => t.f).map((t) => ({ ab: t.ab, bis: t.bis }));
    return { monate: monate == null ? REAKT_MONATE_STANDARD : monate, frei };
  }
  function reaktFaellig(s, regel) {
    if (!s || s.reakt_status === "befreit") return null;
    if (s.reakt_bezahlt_bis) return s.reakt_bezahlt_bis;
    if (s.vertrag_am) return addMonthsISO(s.vertrag_am, reaktMonate(regel));
    return null;
  }
  function reaktNachZahlung(s, regel) {
    const f = reaktFaellig(s, regel);
    return f ? addMonthsISO(f, reaktMonate(regel)) : null;
  }
  // Reaktivierung für diesen Schüler frei? Frei heute oder am Vertragstag (Entscheidung 1a der Hauptsitzung, 24.11.2026)
  function reaktEntfaellt(s, heute, regel) {
    return reaktFreiAm(regel, heute || todayISO()) || !!(s && s.vertrag_am && reaktFreiAm(regel, s.vertrag_am));
  }
  // stufe: befreit | entfaellt | ohne_datum | gesperrt | pruefen_faellig | bald (≤30 Tage) | demnaechst (≤60) | ok
  // (Warnzeiten aus den Einstellungen, fristen.reaktivierung)
  function reaktInfo(s, heute, regel, fr) {
    heute = heute || todayISO();
    if (s && s.reakt_status === "befreit") return { stufe: "befreit", faellig: null, tage: null, gesperrt: false };
    if (reaktEntfaellt(s, heute, regel)) return { stufe: "entfaellt", faellig: null, tage: null, gesperrt: false };
    const faellig = reaktFaellig(s, regel);
    if (!faellig) return { stufe: "ohne_datum", faellig: null, tage: null, gesperrt: false };
    const tage = daysBetweenISO(heute, faellig);
    const stufe = tage < 0 ? (s.reakt_status === "pruefen" ? "pruefen_faellig" : "gesperrt") : warnStufe(tage, fristenVon(fr).reaktivierung);
    return { stufe, faellig, tage, gesperrt: stufe === "gesperrt" };
  }
  /* Theorie: gilt 12 Monate nach Abschluss des Unterrichts (Regel der Fahrschule, einstellbar: fristen.theorie.monate).
     Wer in dieser Zeit die Theorieprüfung besteht, hat ab dem Prüfungstag 12 Monate für die Praxisprüfung (§ 18 FeV, fest). */
  function theorieInfo(s, heute, fr) {
    heute = heute || todayISO();
    const f = fristenVon(fr).theorie;
    let ablauf = null, grund = null;
    if (s && s.theorie_bestanden_am) { ablauf = addMonthsISO(s.theorie_bestanden_am, PRAXIS_NACH_THEORIE_MONATE); grund = "praxis"; }
    else if (s && s.theorie_abgeschlossen_am) { ablauf = addMonthsISO(s.theorie_abgeschlossen_am, f.monate); grund = "unterricht"; }
    if (!ablauf) return { stufe: "ohne_datum", ablauf: null, tage: null, grund: null };
    const tage = daysBetweenISO(heute, ablauf);
    const stufe = tage < 0 ? "abgelaufen" : warnStufe(tage, f);
    return { stufe, ablauf, tage, grund };
  }

  /* ----- Fahrchecks (FC) -----
     Papier-Wertmarke: 1 FC je VOLLE 45 Minuten Fahrstunde/Sonderfahrt/Nachtfahrt (90 Min = 2 FC, 80 Min = 1 FC).
     Vermerke des Fahrlehrers (wie index.html, setFC): v1/halb_bewusst/eins_ok = 1 FC weniger,
     v2 = 2 vergessen, geschenkt = keiner, offen = FC fehlt noch, nachgereicht = zählt im
     Zeitraum von nachAm. Ohne Vermerk = alle FC erhalten.
     Gezählt wird die gebuchte Zeit (von–bis), nicht eine verschenkte Restzeit.
     Nicht erschienen / abgebrochen = keine FC. */
  const FC_ARTEN = ["fahrstunde", "sonder", "nacht"];
  /* W13 PR 3: EINE Stelle für die Rundung in 45-Minuten-Stücken.
     geld     = Fahrchecks und Paket (was bezahlt und abgegeben wird)
     nachweis = Ausbildungsplan und Ausbildungsnachweis (Pflicht-Sonderfahrten, volle Einheiten)
     W17 (🗣 Serband 26.11.2026: „Es gibt nur 45, 90, 135 min, immer nur volle 45 min. Alle vollen 45 min sind 1 Fahrcheck.“):
     beide zählen nur volle 45 Minuten (44 → 0, 80 → 1, 89 → 1, 90 → 2, 134 → 2, 135 → 3), für Fahrstunde, Sonder- und Nachtfahrt gleich.
     UE und Lohn (ueOf) rechnen weiter anteilig nach Minuten (HS7 26.11.: in diesem Schritt nicht ändern). */
  const RUNDUNG = { geld: Math.floor, nachweis: Math.floor };
  function einheitenGeld(min) { return min > 0 ? RUNDUNG.geld(min / 45) : 0; }
  function einheitenNachweis(min, einheit) { return min > 0 ? RUNDUNG.nachweis(min / (einheit || 45)) : 0; }
  function fcGebucht(t) {
    if (!t || !FC_ARTEN.includes(t.art) || !t.von || !t.bis) return 0;
    return einheitenGeld(terminMinuten(t.von, t.bis)); // W13 PR 3: über Mitternacht zählt mit (bis 6 Std.)
  }
  // Fahrchecks, die das Büro für diesen Termin in der Hand haben soll: wie fcErhalten, ein nachgereichter zählt wieder voll.
  // Daran hängt der Büro-Haken fürs Paket (🗣 Serband 24.11.2026). Ausgefallen = 0.
  function fcFuersBuero(t) {
    if (t && t.fc === "nachgereicht") return t.status === "abgebrochen" || t.status === "nicht erschienen" ? 0 : fcGebucht(t);
    return fcErhalten(t);
  }
  // Was zählt, wenn das Büro abgehakt hat: die Zahl, die das Büro gewählt hat (bueroFcAnzahl = kalender_termine.buero_fc_anzahl,
  // 🗣 Serband 25.11.2026: „Wenn 90 min eingetragen ist, muss Kristina abhaken: 2 Fahrchecks abgegeben oder 1“), höchstens die
  // gebuchten; ohne gewählte Zahl der Vermerk des Fahrlehrers (fcFuersBuero).
  function fcVomBuero(t) {
    if (t && (t.status === "abgebrochen" || t.status === "nicht erschienen")) return 0; // ausgefallen: nie, auch mit Zahl (Richter W13)
    const n = t ? t.bueroFcAnzahl : null;
    if (n != null && n !== "" && isFinite(+n)) return Math.max(0, Math.min(Math.round(+n), fcGebucht(t)));
    return fcFuersBuero(t);
  }
  function fcErhalten(t) {
    const voll = fcGebucht(t);
    if (!voll || t.status === "abgebrochen" || t.status === "nicht erschienen") return 0;
    // eins_ok = „1 FC (abgeschlossen)“: bezahlt wird voll, im Umschlag liegt aber nur 1 FC weniger
    if (t.fc === "v1" || t.fc === "halb_bewusst" || t.fc === "eins_ok") return Math.max(voll - 1, 0);
    if (t.fc === "v2" || t.fc === "geschenkt" || t.fc === "offen" || t.fc === "nachgereicht") return 0;
    return voll;
  }

  /* ----- Lohn folgt Fahrcheck-Abgabe (W19, Entscheidung 08.11., 🗣 Serband 26.11.2026: „Erst Lohn bei Abgabe“) -----
     Ab LOHN_FC_AB zählt der Lohn einer Fahrstunde/Sonder-/Nachtfahrt erst, wenn das Büro ihre Fahrchecks als abgegeben
     bestätigt hat (kalender_termine.buero_fc_status = „abgegeben“, Zahl buero_fc_anzahl bzw. Vermerk). Fehlt ein Fahrcheck:
     kein Lohn für diese Stunde, bis er nachgereicht ist; dann voller Lohn im Monat des Nachreichens. Den halben Lohn bei
     „1 FC vergessen“ gibt es ab dann nicht mehr. Die Höhe bleibt anteilig nach Minuten (ueOf), nur der Zeitpunkt ändert sich.
     Stunden unter 45 Minuten haben keinen Fahrcheck: voller Lohn sofort, ein alter Vermerk wirkt nicht.
     Vor LOHN_FC_AB gilt die alte Regel unverändert (v1/bewusst halb, v2/geschenkt 0, nachgereicht voll im Monat des Nachreichens),
     damit schon abgerechnete Monate gleich bleiben. Ohne Fahrschule (kein Büro) gilt immer die alte Regel (regelAktiv = false).
     t: {art, datum|date, von, bis, status, fc, nachAm, bueroFc, bueroFcAnzahl, bueroFcNachAm}
     Liefert null (keine Fahrstunde / ausgefallen) oder {stand, anteil, datum}:
       stand  = "zaehlt" | "wartet" (Büro hat noch nicht bestätigt) | "fehlt" (Fahrcheck fehlt) | "keiner" (geschenkt)
       anteil = Teil der UE, der zählt (1, 0,5 oder 0)
       datum  = Tag, an dem der Lohn zählt (Tag der Stunde; nachgereicht: Tag des Nachreichens) */
  const LOHN_FC_AB = "2026-12-01";
  function lohnNachDatum(t, datum) {
    let d = null;
    for (const x of [t.bueroFcNachAm, t.fc === "nachgereicht" ? t.nachAm : null]) {
      const v = x ? String(x).slice(0, 10) : "";
      if (/^\d{4}-\d\d-\d\d$/.test(v) && v > datum && (!d || v > d)) d = v;
    }
    return d;
  }
  function lohnStand(t, opt) {
    if (!t || !FC_ARTEN.includes(t.art)) return null;
    if (t.status === "abgebrochen" || t.status === "nicht erschienen") return null;
    const datum = String(t.datum || t.date || "").slice(0, 10);
    const regel = !!(opt && opt.regelAktiv) && datum >= LOHN_FC_AB;
    if (!regel) {
      // Alte Regel (bis zum Stichtag, wie bisher in index.html ueRange)
      if (t.fc === "v1" || t.fc === "halb_bewusst") return { stand: "zaehlt", anteil: 0.5, datum };
      if (t.fc === "v2" || t.fc === "geschenkt") return { stand: "keiner", anteil: 0, datum };
      if (t.fc === "nachgereicht") return t.nachAm ? { stand: "zaehlt", anteil: 1, datum: String(t.nachAm).slice(0, 10) } : { stand: "keiner", anteil: 0, datum };
      return { stand: "zaehlt", anteil: 1, datum };
    }
    const voll = fcGebucht(t);
    if (!voll) return { stand: "zaehlt", anteil: 1, datum }; // unter 45 Minuten: kein Fahrcheck, nichts abzuwarten
    if (t.fc === "geschenkt") return { stand: "keiner", anteil: 0, datum };
    const erwartet = t.fc === "eins_ok" || t.fc === "halb_bewusst" ? voll - 1 : voll;
    const anteil = t.fc === "halb_bewusst" ? 0.5 : 1; // bewusst weniger: bleibt halb (kein Fehler, war so geplant)
    if (!erwartet) return { stand: "zaehlt", anteil, datum }; // nichts abzugeben
    const hat = t.bueroFc === "abgegeben" ? fcVomBuero(t) : 0;
    if (hat >= erwartet) return { stand: "zaehlt", anteil, datum: lohnNachDatum(t, datum) || datum };
    // Als nachgereicht vermerkt: der Fahrcheck ist da, das Büro muss ihn nur noch bestätigen (nächste Abgabe) → wartet
    if (t.fc === "nachgereicht") return { stand: "wartet", anteil: 0, datum };
    if (t.bueroFc === "abgegeben" || t.bueroFc === "fehlt" || t.fc === "v1" || t.fc === "v2" || t.fc === "offen") return { stand: "fehlt", anteil: 0, datum };
    return { stand: "wartet", anteil: 0, datum };
  }

  /* ----- Sonderfahrt-Einheit (W13 PR 2) -----
     Ein Kästchen im Ausbildungsplan (Überland, Autobahn, Nacht) ist eine Sonderfahrt-Einheit, Vorgabe 45 Minuten.
     Ein Termin von 90 Minuten füllt also 2 Kästchen. Der Wert kann je Fahrschule eingestellt werden.
     Gelesen wird er NUR über sonderMinuten(). Gesetzt wird er beim Laden der Fahrschule (setzeSonderMinuten).
     Fahrchecks und UE bleiben fest bei 45 Minuten (fcGebucht, ueOf). */
  const SONDER_MIN_STANDARD = 45;
  let sonderMinAktiv = null;
  function normSonderMin(n) {
    if (n === null || n === undefined || n === "") return null;
    const z = Number(n);
    return Number.isInteger(z) && z >= 30 && z <= 90 ? z : null;
  }
  function setzeSonderMinuten(n) { sonderMinAktiv = normSonderMin(n); return sonderMinuten(); }
  function sonderMinuten() { return sonderMinAktiv || SONDER_MIN_STANDARD; }
  // Dauer eines Termins in Minuten. Eine Fahrt über Mitternacht (22:30–00:00) zählt mit, aber nur bis 6 Stunden:
  // „10:00–09:00“ ist ein Tippfehler und keine Fahrt von 23 Stunden (dann 0).
  function terminMinuten(von, bis) {
    if (!von || !bis) return 0;
    const d = hm2min(bis) - hm2min(von);
    if (d >= 0) return d;
    return d + 1440 <= 360 ? d + 1440 : 0;
  }
  // Ende eines Termins in Minuten ab Mitternacht SEINES Tages: 22:30–00:00 endet bei 1440 (morgen 0 Uhr), nicht bei 0
  // (sonst gälte eine Nachtfahrt schon am Morgen als vorbei; Prüfer Büro W13 PR 3).
  function terminEndeMin(von, bis) {
    if (!bis) return 0;
    const b = hm2min(bis);
    return von && b < hm2min(von) && terminMinuten(von, bis) > 0 ? b + 1440 : b;
  }
  // Wie viele Kästchen ein Sonder-Termin belegt: volle Einheiten (abgerundet wie Büro und Nachweis, Fable F4), mindestens 1
  // (wie bisher auch kurze oder unvollständige Termine). 90 Min = 2, 80 Min = 1, 135 Min = 3.
  function sonderEinheiten(von, bis) {
    return Math.max(1, einheitenNachweis(terminMinuten(von, bis), sonderMinuten()));
  }
  // Volle Sonderfahrt-Einheiten in einer Summe von Minuten (Büro: Ausbildungsnachweis, Zähler ohne App). Abgerundet wie bisher.
  function sonderEinheitenAusMinuten(min) { return einheitenNachweis(min, sonderMinuten()); }
  // Führerscheinantrag bei der Führerscheinstelle: 12 Monate ab Antragsdatum (einstellbar: fristen.antrag.monate); nach
  // bestandener Theorieprüfung gilt er 12 Monate ab Prüfungsdatum (wie die Theorie, § 18 FeV, fest; Kristina, 09.10.2026).
  // stufe: ohne_datum | abgelaufen | bald (≤60 Tage, fristen.antrag.bald_tage) | ok
  function antragInfo(s, heute, fr) {
    heute = heute || todayISO();
    if (!s || !s.antrag_am) return { stufe: "ohne_datum", ablauf: null, tage: null, grund: null };
    const f = fristenVon(fr).antrag;
    let ablauf = addMonthsISO(s.antrag_am, f.monate), grund = "antrag";
    if (s.theorie_bestanden_am) {
      const v = addMonthsISO(s.theorie_bestanden_am, PRAXIS_NACH_THEORIE_MONATE);
      if (v > ablauf) { ablauf = v; grund = "theorie"; }
    }
    const tage = daysBetweenISO(heute, ablauf);
    return { stufe: tage < 0 ? "abgelaufen" : warnStufe(tage, f), ablauf, tage, grund };
  }
  // Theorie-Frist der Behörde (schueler.theorie_frist_bis, 🗣 Serband 14.10.2026): bis dahin muss die Theorieprüfung bestanden sein.
  // stufe: ohne_datum | erledigt (Theorie bestanden) | abgelaufen | bald (≤30 Tage) | demnaechst (≤60 Tage) | ok (fristen.behoerde)
  function theorieFristInfo(s, heute, fr) {
    heute = heute || todayISO();
    if (s && s.theorie_bestanden_am) return { stufe: "erledigt", ablauf: s.theorie_frist_bis || null, tage: null };
    if (!s || !s.theorie_frist_bis) return { stufe: "ohne_datum", ablauf: null, tage: null };
    const ablauf = String(s.theorie_frist_bis).slice(0, 10), tage = daysBetweenISO(heute, ablauf);
    return { stufe: tage < 0 ? "abgelaufen" : warnStufe(tage, fristenVon(fr).behoerde), ablauf, tage };
  }
  // Umschreiber mit Führerschein aus einem Drittstaat (nicht EU/EWR): Er darf in Deutschland nur 6 Monate ab Wohnsitz
  // mit dem ausländischen Führerschein fahren (§ 29 Abs. 1 FeV). EU/EWR-Führerscheine gelten weiter.
  const EU_EWR = ["Belgien", "Bulgarien", "Dänemark", "Estland", "Finnland", "Frankreich", "Griechenland", "Irland", "Italien", "Kroatien",
    "Lettland", "Litauen", "Luxemburg", "Malta", "Niederlande", "Österreich", "Polen", "Portugal", "Rumänien", "Schweden", "Slowakei",
    "Slowenien", "Spanien", "Tschechien", "Ungarn", "Zypern", "Island", "Liechtenstein", "Norwegen"];
  const UMSCHREIB_MONATE = 6;
  // Ländernamen vergleichen: Groß/klein, Umlaute (ae/oe/ue), Leerzeichen und ein paar übliche andere Namen egal
  const LAND_NAMEN = { "tschechische republik": "tschechien", "holland": "niederlande", "slowakische republik": "slowakei", "republik zypern": "zypern",
    "grossbritannien": "vereinigtes koenigreich", "england": "vereinigtes koenigreich", "usa": "vereinigte staaten", "amerika": "vereinigte staaten",
    "bosnien": "bosnien und herzegowina", "mazedonien": "nordmazedonien", "moldawien": "moldau" };
  function landKey(land) {
    let l = String(land || "").trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/\s+/g, " ");
    return LAND_NAMEN[l] || l;
  }
  function istEuEwr(land) { const l = landKey(land); return !!l && EU_EWR.some((x) => landKey(x) === l); }
  // Länder außerhalb der EU/des EWR, die als Herkunft von Umschreibern vorkommen (unbekannte Namen → „Land prüfen“ statt Alarm)
  const DRITTSTAATEN = ["Schweiz", "Vereinigtes Königreich", "Türkei", "Syrien", "Afghanistan", "Irak", "Iran", "Ukraine", "Russland",
    "Serbien", "Bosnien und Herzegowina", "Kosovo", "Albanien", "Nordmazedonien", "Montenegro", "Moldau", "Georgien", "Marokko", "Tunesien",
    "Algerien", "Ägypten", "Eritrea", "Äthiopien", "Somalia", "Nigeria", "Ghana", "Indien", "Pakistan", "Sri Lanka", "Vietnam", "China",
    "Philippinen", "Vereinigte Staaten", "Kanada", "Brasilien", "Libanon", "Jordanien", "Belarus", "Armenien", "Aserbaidschan", "Kasachstan",
    "Japan", "Südkorea", "Australien", "Neuseeland", "Südafrika", "Bangladesch", "Thailand", "Kolumbien", "Mexiko", "Argentinien", "Chile", "Peru"];
  function istDrittstaat(land) { const l = landKey(land); return !!l && DRITTSTAATEN.some((x) => landKey(x) === l); }
  // stufe: kein (kein Umschreiber oder ohne Führerschein-Angabe) | eu (EU/EWR, keine Frist) | land_pruefen (Land unbekannt/Tippfehler)
  //        | ohne_datum (Drittstaat, Wohnsitz fehlt) | abgelaufen | bald (≤30 Tage, fristen.umschreiber) | ok
  function umschreibInfo(s, heute, fr) {
    heute = heute || todayISO();
    const fs = (s && Array.isArray(s.auslands_fs)) ? s.auslands_fs.filter((f) => f && f.land) : [];
    // W22: Zeile aus der Datenbank (Feld ausbildungsart vorhanden) → nur die Büro-Spalte zählt; ausbildung.umschreiber ist dort
    // nur das Echo der Fahrlehrer-App. Ohne Spalte (z. B. reine App-Daten) zählt das Merkmal der App wie bisher.
    const umschreiber = s && (s.ausbildungsart === "umschreibung" || (!("ausbildungsart" in s) && !!(s.ausbildung && s.ausbildung.umschreiber)));
    if (!umschreiber || !fs.length) return { stufe: "kein", bis: null, tage: null, drittstaat: false };
    if (fs.some((f) => istEuEwr(f.land))) return { stufe: "eu", bis: null, tage: null, drittstaat: false }; // ein EU/EWR-Führerschein gilt weiter
    if (!fs.some((f) => istDrittstaat(f.land))) return { stufe: "land_pruefen", bis: null, tage: null, drittstaat: false };
    if (!s.wohnsitz_de_seit) return { stufe: "ohne_datum", bis: null, tage: null, drittstaat: true };
    const bis = addMonthsISO(String(s.wohnsitz_de_seit).slice(0, 10), UMSCHREIB_MONATE), tage = daysBetweenISO(heute, bis);
    return { stufe: tage < 0 ? "abgelaufen" : warnStufe(tage, fristenVon(fr).umschreiber), bis, tage, drittstaat: true };
  }
  /* Theorieunterricht: Soll nach FahrschAusbO (🗣 Serband 14.10.2026, Antwort 1a „automatisch nach Gesetz“).
     § 4 Abs. 3: Grundstoff 12 Doppelstunden, mit vorhandener Fahrerlaubnis 6. Anlage 2.8 (Zusatzstoff): B 2, C1 6,
     C 10 (mit C1: 4), CE 4. BE und C1E: nur praktische Prüfung (§ 15 Abs. 2 FeV), keine Theorie. Umschreibung und
     Neuerteilung: keine Ausbildungspflicht (§ 7 Abs. 1). Lektionen: 1–12 Grundstoff, 13–14 Zusatzstoff B (Degener),
     C1–C10 Klasse C/C1, CE1–CE4 Klasse CE (Serbands Folien). */
  const LEKT_GRUND = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], LEKT_B = ["13", "14"];
  const LEKT_C = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"], LEKT_CE = ["CE1", "CE2", "CE3", "CE4"];
  // Weg der Lkw-Ausbildung aus dem Vorbesitz (gleiche Regel wie lkwWegVon in index.html)
  function lkwWegAusVorbesitz(form, vorbesitz) {
    const vb = vorbesitz || [];
    if (form === "C") return vb.includes("C1") ? "C1" : "B";
    if (form === "CE") return vb.includes("C") ? "C" : (vb.length ? "C+CE" : "C");
    if (form === "C1E") return vb.some((k) => ["C1", "C", "CE"].includes(k)) ? "C1" : (vb.length ? "C1+C1E" : "C1"); // C schließt C1 ein
    return null;
  }
  // o: { klasse | form, weg, vorbesitz, ausbildungsart } → { pflicht, grund, teile: [{ key, titel, lektionen, soll }] }
  function theorieSoll(o) {
    o = o || {};
    const art = !o.ausbildungsart || o.ausbildungsart === "neu" ? "ersterwerb" : o.ausbildungsart;
    if (art === "auffrischung") return { pflicht: false, grund: "Auffrischung: keine Pflicht-Theorie", teile: [] };
    if (art === "umschreibung" || art === "neuerteilung") return { pflicht: false, grund: art === "umschreibung" ? "Umschreibung: keine Pflicht-Theorie" : "Neuerteilung: keine Pflicht-Theorie", teile: [] };
    let k = String(o.klasse || o.form || "B");
    if (["B78", "Automatik", "B197", "B96", "B+BE"].includes(k)) k = "B";
    const vb = o.vorbesitz || [];
    // Weg nur nehmen, wenn er zur Klasse passt (gleiche Regel wie lkwWegVon in index.html)
    const weg = ({ C: ["B", "C1"], CE: ["C", "C+CE"], C1E: ["C1", "C1+C1E"] }[k] || []).includes(o.weg) ? o.weg : lkwWegAusVorbesitz(k, vb);
    if (k === "BE" || (k === "C1E" && weg !== "C1+C1E")) return { pflicht: false, grund: "Anhängerklasse: nur praktische Prüfung", teile: [] };
    if (k === "BKF" || !["B", "C1", "C1E", "C", "CE"].includes(k)) return { pflicht: false, grund: "keine Regel hinterlegt", teile: [] };
    const lkw = k !== "B"; // Lkw-Klassen setzen Klasse B voraus
    const teile = [{ key: "grund", titel: "Grundstoff", lektionen: LEKT_GRUND, soll: lkw || vb.length || art === "erweiterung" ? 6 : 12 }]; // Erweiterung: er hat schon eine Fahrerlaubnis (§ 4 Abs. 3 FahrschAusbO)
    if (k === "B") teile.push({ key: "B", titel: "Zusatzstoff B", lektionen: LEKT_B, soll: 2 });
    if (k === "C1" || k === "C1E") teile.push({ key: "C", titel: "Klasse C1", lektionen: LEKT_C, soll: 6 });
    if (k === "C" || (k === "CE" && weg === "C+CE")) teile.push({ key: "C", titel: "Klasse C", lektionen: LEKT_C, soll: vb.includes("C1") || (k === "C" && weg === "C1") ? 4 : 10 });
    if (k === "CE") teile.push({ key: "CE", titel: "Klasse CE", lektionen: LEKT_CE, soll: 4 });
    return { pflicht: true, grund: null, teile };
  }
  // besucht: Liste der Lektionen (z. B. ["1", "2", "C3"]) → Ist je Teil, fehlende Lektionen (nur wenn alle Lektionen des Teils Pflicht sind)
  function theorieStand(soll, besucht) {
    const b = new Set((besucht || []).map(String));
    const teile = (soll.teile || []).map((t) => {
      const da = t.lektionen.filter((l) => b.has(l));
      return Object.assign({}, t, { ist: Math.min(da.length, t.soll), fehlt: t.soll === t.lektionen.length ? t.lektionen.filter((l) => !b.has(l)) : null });
    });
    const ist = teile.reduce((a, t) => a + t.ist, 0), sollSumme = teile.reduce((a, t) => a + t.soll, 0);
    return { pflicht: soll.pflicht, grund: soll.grund, teile, ist, soll: sollSumme, fertig: soll.pflicht && ist >= sollSumme };
  }
  /* Sonderfahrten nach Anlage 4 FahrschAusbO (Überland / Autobahn / Nacht, je 45 Minuten) – gleiche Werte wie
     SONDER_SOLL und LKW_WEGE in index.html (scripts/rechnen-test.mjs prüft das). Für das Büro bei Fahrlehrern ohne App. */
  const SONDER_SOLL = { B: [5, 4, 3], B197: [5, 4, 3], Automatik: [5, 4, 3], BE: [3, 1, 1], C1: [3, 1, 1] };
  const LKW_WEGE = { C: [["B", [5, 2, 3]], ["C1", [3, 1, 1]]], CE: [["C", [5, 2, 3]], ["C+CE", [8, 3, 3]]], C1E: [["C1", [3, 1, 1]], ["C1+C1E", [4, 2, 2]]] };
  function sonderSoll(form, weg) {
    const f = form === "B78" ? "Automatik" : (form || "B");
    if (LKW_WEGE[f]) { const w = LKW_WEGE[f].find((x) => x[0] === weg) || LKW_WEGE[f][0]; return w[1]; }
    return SONDER_SOLL[f] || SONDER_SOLL.B;
  }
  /* Fahrlehrer-Akte (🗣 Serband 14.10.2026): Fahrlehrerlaubnis → was er ausbilden darf (FahrlG § 1 Abs. 2),
     Fristen: Führerschein C/CE und D (§ 23 FeV, 5 Jahre), Schlüsselzahl 95 (§ 5 BKrFQG), Fortbildung (FahrlG § 53). */
  const FAHRLEHRERLAUBNIS = { BE: ["B", "BE"], A: ["A"], CE: ["C1", "C1E", "C", "CE"], DE: ["D1", "D1E", "D", "DE"] };
  function ausbildungsKlassen(fl) { return [...new Set((fl || []).flatMap((k) => FAHRLEHRERLAUBNIS[k] || []))]; }
  // stufe je Frist: abgelaufen | bald (≤90 Tage, fristen.fahrlehrer) | ok
  function fahrlehrerFristen(p, heute, fr) {
    heute = heute || todayISO();
    const f = fristenVon(fr).fahrlehrer;
    const liste = [["fuehrerschein_c_bis", "Führerschein C/CE"], ["fuehrerschein_d_bis", "Führerschein D"], ["sz95_bis", "Schlüsselzahl 95"], ["fortbildung_bis", "Fortbildung"]];
    return liste.filter(([k]) => p && p[k]).map(([k, titel]) => {
      const bis = String(p[k]).slice(0, 10), tage = daysBetweenISO(heute, bis);
      return { key: k, titel, bis, tage, stufe: tage < 0 ? "abgelaufen" : warnStufe(tage, f) };
    });
  }
  // Fahrcheck-Zettel (Übungs-, Sonder- und Testfahrten) verfallen 12 Monate nach dem Datum der Stunde (Kristina, 09.10.2026;
  // einstellbar: fristen.fc_zettel.monate)
  function fcGueltigBis(datum, fr) { return datum ? addMonthsISO(datum, fristenVon(fr).fc_zettel.monate) : null; }
  // stufe: verfallen | bald (≤60 Tage, fristen.fc_zettel.bald_tage) | ok
  function fcGueltigkeit(datum, heute, fr) {
    heute = heute || todayISO();
    const f = fristenVon(fr).fc_zettel, bis = fcGueltigBis(datum, fr);
    if (!bis) return { stufe: "ok", bis: null, tage: null };
    const tage = daysBetweenISO(heute, bis);
    return { stufe: tage < 0 ? "verfallen" : warnStufe(tage, f), bis, tage };
  }
  // Halbmonat: 1.–15. und 16.–Monatsende (zwei Abgaben im Monat)
  function fcZeitraum(iso) {
    const d = parseISO(iso), j = d.getFullYear(), m = d.getMonth();
    if (d.getDate() <= 15) return [dateISO(new Date(j, m, 1)), dateISO(new Date(j, m, 15))];
    return [dateISO(new Date(j, m, 16)), dateISO(new Date(j, m + 1, 0))];
  }
  function fcVorZeitraum(von) { return fcZeitraum(addDaysISO(von, -1)); }
  /* termine: Objekte mit datum (oder date), von, bis, art, status, fc, nachAm.
     Ergebnis: soll = Fahrchecks, die der Fahrlehrer für den Zeitraum abgeben muss. */
  function fcSoll(termine, von, bis, heute, jetztMin) {
    heute = heute || todayISO();
    // Heutige Termine zählen erst, wenn sie vorbei sind (sonst stünde die Abend-Fahrstunde schon mittags im Soll).
    if (typeof jetztMin !== "number") { const d = new Date(); jetztMin = heute === todayISO() ? d.getHours() * 60 + d.getMinutes() : 24 * 60; }
    const ende = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t.bis || ""); return m ? terminEndeMin(t.von, t.bis) : 0; }; // über Mitternacht: morgen
    const posten = [];
    let soll = 0;
    for (const t of termine || []) {
      const datum = t.datum || t.date;
      if (!datum) continue;
      if (datum >= von && datum <= bis && (datum < heute || (datum === heute && ende(t) <= jetztMin))) {
        const n = fcErhalten(t);
        const fehlt = fcGebucht(t) - n;
        if (n || fehlt) posten.push({ id: t.id, datum, von: t.von, n, fehlt, fc: t.fc || null, sid: t.sid || t.schueler_id || null });
        soll += n;
      }
      if (t.fc === "nachgereicht" && t.nachAm) {
        const am = String(t.nachAm).slice(0, 10);
        if (am >= von && am <= bis && am <= heute) {
          const n = fcGebucht(t);
          soll += n;
          posten.push({ id: t.id, datum, von: t.von, n, fehlt: 0, fc: "nachgereicht", nachAm: am, sid: t.sid || t.schueler_id || null });
        }
      }
    }
    posten.sort((a, b) => (a.datum + (a.von || "")).localeCompare(b.datum + (b.von || "")));
    return { soll, posten, fehlend: posten.filter((p) => p.fehlt > 0) };
  }

  /* ----- Warteliste (Serband, 09.10.2026) -----
     Ein Schüler „wartet“, solange er keine Fahrstunden braucht. Er zählt dann nicht in der Auslastung des Fahrlehrers.
       theorie       : Fahrlehrer hat „Pausiert – wartet auf Theorie“ gesetzt, Theorie noch nicht bestanden
       nach_theorie  : Theorie bestanden (Pause war gesetzt), aber noch keine neue Fahrstunde gebucht
       praxis        : auf der Praxis-Warteliste (prüfungsreif), weder Fahrstunde danach noch Prüfungstermin
     Sobald ein Prüfungstermin (Praxis) oder eine Fahrstunde nach dem Wartezeitpunkt eingetragen ist, ist er wieder aktiv
     (Ausnahme „theorie“: die Pause endet, wenn der Fahrlehrer sie in der App aufhebt oder die Theorie als bestanden einträgt).
     a = Feld „ausbildung“ des Schülers; k = { pruefungstermin: Ja/Nein, fahrstundeNach(lokaleMinute „JJJJ-MM-TTTHH:MM“): Ja/Nein }. */
  const FAHR_ARTEN = ["fahrstunde", "sonder", "nacht"];
  // Zeitpunkt (UTC-Text aus der App) als lokale Minute „JJJJ-MM-TTTHH:MM“; so lassen sich Fahrstunden am selben Tag richtig einordnen
  function lokalMinute(v) {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v).slice(0, 10) + "T00:00";
    return dateISO(d) + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }
  function wartetInfo(a, k) {
    k = k || {};
    if (!a || a.passed) return "";
    const nach = (v) => typeof k.fahrstundeNach === "function" && k.fahrstundeNach(lokalMinute(v));
    // theorieBestanden: Büro hat „Theorie bestanden“ eingetragen (schueler.theorie_bestanden_am), auch wenn der
    // Ausbildungsstand des Fahrlehrers das noch nicht weiß (T1)
    if (a.theorieWait && !a.theoryPassed && !k.theorieBestanden) return "theorie";
    if (k.pruefungstermin) return "";
    if (a.theorieWaitBis && !nach(a.theorieWaitBis)) return "nach_theorie";
    if (a.ready && !nach(a.ready)) return "praxis";
    return "";
  }

  /* ----- Verkauf: Aufteilung eines Betrags nach Prozent (Einstellung akademieVermittlung.splitKollege).
     Jeder Anteil auf ganze Euro gerundet; der Rundungsrest geht an die Fahrschule, damit die Summe
     immer genau dem Betrag entspricht. null, wenn die Prozente fehlen oder nicht 100 ergeben. */
  function aufteilung(betrag, split) {
    const teile = ["fahrlehrer", "fahrschule", "plattform", "akademie"];
    if (!split || teile.some((k) => split[k] == null || isNaN(Number(split[k])))) return null;
    const summe = teile.reduce((a, k) => a + Number(split[k]), 0);
    if (Math.abs(summe - 100) > 0.001) return null;
    const out = {};
    for (const k of teile) out[k] = Math.round((Number(betrag) || 0) * Number(split[k]) / 100);
    out.fahrschule += (Number(betrag) || 0) - teile.reduce((a, k) => a + out[k], 0);
    return out;
  }

  /* ----- Paket-Baukasten, Schritt 2 (Werkstatt 13): „noch offen“ je Posten eines verkauften Pakets.
     Gleiche Rechnung in App und Büro. quelle = was der Schüler schon hatte:
       fahrstunden (Unterrichtseinheiten à 45 Minuten, wie ueOf), sonder { ueberland, autobahn, nacht } (je 45 Minuten),
       pruefungen (vorbei, Praxis), simulator (Termine). Fehlt ein Wert, bleibt der Posten ohne Zähler.
     Grundbetrag, Lernapp und Sonstiges haben keinen Zähler (verbraucht null).
     Gibt es dieselbe Art zweimal (z. B. zwei Zeilen Übungsstunden), wird der Verbrauch der Reihe nach verteilt;
     was über alle Zeilen hinausgeht, steht als „mehr“ an der letzten Zeile. */
  const PAKET_SONDER = { "Überlandfahrt": "ueberland", "Autobahnfahrt": "autobahn", "Fahrt bei Dämmerung oder Dunkelheit": "nacht" };
  function paketSchluessel(p) {
    if (!p) return null;
    if (p.art === "sonderfahrt") return PAKET_SONDER[p.bezeichnung] || null;
    return ["fahrstunde", "pruefung_praxis", "simulator"].includes(p.art) ? p.art : null;
  }
  function paketVerbrauch(posten, quelle) {
    const q = quelle || {}, sd = q.sonder || {};
    const ist = { fahrstunde: q.fahrstunden, pruefung_praxis: q.pruefungen, simulator: q.simulator, ueberland: sd.ueberland, autobahn: sd.autobahn, nacht: sd.nacht };
    const liste = (posten || []).map((p) => ({ anzahl: Number(p && p.anzahl) || 0, verbraucht: null, offen: null, mehr: 0, schluessel: paketSchluessel(p) }));
    for (const k of Object.keys(ist)) {
      if (typeof ist[k] !== "number" || !isFinite(ist[k])) continue;
      const zeilen = liste.filter((z) => z.schluessel === k);
      let rest = Math.max(0, Math.round(ist[k] * 100) / 100);
      zeilen.forEach((z, i) => {
        const v = Math.min(z.anzahl, rest);
        rest = Math.round((rest - v) * 100) / 100;
        z.verbraucht = v; z.offen = Math.round((z.anzahl - v) * 100) / 100;
        if (i === zeilen.length - 1) z.mehr = rest;
      });
    }
    return liste;
  }
  /* Verbrauch aus Kalender-Terminen ({art, datum, von, bis, status, sonderArt, srcSonder, fc, bueroFc, bueroFcAnzahl}).
     🗣 Serband 24.11.2026: „Eine Fahrstunde zählt erst dann, wenn sie von Kristina abgehakt wird, dass die Fahrchecks da sind. Wird
     der Termin gelöscht, weil der Schüler nicht da war, zählt das natürlich nicht.“ Darum zählen Fahrstunde, Sonder- und Nachtfahrt
     nur mit Büro-Haken (bueroFc = kalender_termine.buero_fc_status = „abgegeben“), und zwar je Fahrcheck, der beim Büro ist
     (fcFuersBuero: 45 min = 1, Vermerk fc des Fahrlehrers wie in der Fahrcheck-Kontrolle, nachgereicht = voll).
     Ohne Haken (offen, fehlt) zählt der Termin bei „ohneHaken“ (Hinweis „warten noch auf den Haken vom Büro“).
     Sonderfahrt ohne Art (weder sonderArt noch srcSonder): bei „ohneArt“ (Hinweis), keinem Posten zuzuordnen.
     Nie: Zukunft, heute vor dem Ende, abgebrochen/nicht erschienen/abgesagt/geplatzt (gelöschte Termine kommen gar nicht erst an).
     Der Ausbildungsplan der App zählt fürs Paket nicht: dort hakt niemand vom Büro ab.
     extra.pruefDaten: Tage mit Ergebnis einer Praxisprüfung (App oder Prüfungstafel). Kalendertermin und Ergebnis bis 3 Tage danach
     sind dieselbe Prüfung (wie dayEvents); eine Wiederholung liegt frühestens 2 Wochen später. jetztMin = Minuten seit Mitternacht. */
  const PAKET_NICHT = ["abgebrochen", "nicht erschienen", "abgesagt", "geplatzt"];
  function paketSonderArt(t) {
    if (t.art === "nacht") return "nacht";
    if (["ueberland", "autobahn", "nacht"].includes(t.sonderArt)) return t.sonderArt;
    const g = String(t.srcSonder || "").split(":")[1] || "";
    return ["ueberland", "autobahn", "nacht"].includes(g) ? g : "";
  }
  function paketPruefZahl(tage) {
    let n = 0, anker = null;
    for (const d of Array.from(new Set(tage)).sort()) {
      if (anker && daysBetweenISO(anker, d) <= 3) continue;
      n++; anker = d;
    }
    return n;
  }
  function paketQuelleAusTerminen(termine, heute, jetztMin, extra) {
    const q = { fahrstunden: 0, sonder: { ueberland: 0, autobahn: 0, nacht: 0 }, pruefungen: 0, simulator: 0, ohneHaken: 0, ohneArt: 0 };
    const ex = extra || {}, pTage = [];
    for (const t of termine || []) {
      if (!t || !t.datum || !t.von || !t.bis || t.datum > heute) continue;
      if (t.datum === heute && terminEndeMin(t.von, t.bis) > jetztMin) continue; // über Mitternacht: erst morgen vorbei
      if (PAKET_NICHT.includes(t.status)) continue;
      if (FC_ARTEN.includes(t.art)) {
        // Gezählt wird, was an Fahrchecks beim Büro ist (fcFuersBuero): „1 vergessen“ = einer weniger, nachgereicht = voll,
        // geschenkt oder beide vergessen = keiner (dann wartet auch nichts auf den Haken).
        // Mit Haken zählt die Zahl, die das Büro gewählt hat (fcVomBuero), sonst der Vermerk des Fahrlehrers.
        const abgehakt = t.bueroFc === "abgegeben", n = abgehakt ? fcVomBuero(t) : fcFuersBuero(t);
        if (!n) continue;
        const a = t.art === "fahrstunde" ? "" : paketSonderArt(t);
        if (t.art !== "fahrstunde" && !a) { q.ohneArt++; continue; } // Sonderfahrt ohne Art: keinem Posten zuzuordnen, mit Hinweis
        if (!abgehakt) { q.ohneHaken++; continue; }
        if (t.art === "fahrstunde") q.fahrstunden += n; else q.sonder[a] += n;
      } else if (t.art === "pruefung") pTage.push(t.datum);
      else if (t.art === "simulator") q.simulator += 1;
    }
    for (const d of ex.pruefDaten || []) if (d && String(d).slice(0, 10) <= heute) pTage.push(String(d).slice(0, 10));
    q.pruefungen = paketPruefZahl(pTage);
    return q;
  }
  // Hinweise unter dem Paket, gleich in Büro-Akte und App-Karte (Text, ohne HTML)
  function paketHinweise(q) {
    const h = [];
    if (!q) return h;
    if (q.ohneHaken === 1) h.push("1 Termin wartet noch auf den Fahrcheck-Haken vom Büro. Erst danach zählt er im Paket.");
    else if (q.ohneHaken > 1) h.push(q.ohneHaken + " Termine warten noch auf den Fahrcheck-Haken vom Büro. Erst danach zählen sie im Paket.");
    if (q.ohneArt === 1) h.push("1 Sonderfahrt hat keine Art (Überland, Autobahn oder Nacht) und zählt darum nicht. Das Büro kann die Art am Termin eintragen.");
    else if (q.ohneArt > 1) h.push(q.ohneArt + " Sonderfahrten haben keine Art (Überland, Autobahn oder Nacht) und zählen darum nicht. Das Büro kann die Art am Termin eintragen.");
    return h;
  }
  // heute (freiwillig): nur Fahrten bis heute zählen; ein für nächste Woche eingetragenes Feld ist noch nicht gefahren (Fable W5)
  function paketSonderAusPlan(plan, heute) {
    const sd = plan && plan.sonder;
    if (!sd || typeof sd !== "object") return null;
    const zaehle = (a) => (Array.isArray(a) ? a.filter((o) => !!(o && o.iso) && (!heute || String(o.iso).slice(0, 10) <= heute)).length : 0);
    return { ueberland: zaehle(sd.ueberland), autobahn: zaehle(sd.autobahn), nacht: zaehle(sd.nacht) };
  }
  /* W26 (27.11.2026): Kundennummer und Anschrift – gleiche Anzeige in App, Büro und Quittung.
     Die Nummer vergibt NUR der Server (Spalte schueler.kundennummer, je Fahrschule fortlaufend). Hier nur die Schreibweise. */
  function kundennummerText(n) {
    const z = Number(n);
    return Number.isInteger(z) && z > 0 ? "K-" + String(z).padStart(5, "0") : "";
  }
  // PLZ: leer ist erlaubt (nichts ist Pflicht), sonst genau 5 Ziffern
  function plzOk(v) { const t = String(v == null ? "" : v).trim(); return t === "" || /^\d{5}$/.test(t); }
  // Anschrift säubern: {strasse, plz, ort} ohne Leerzeichen am Rand, leer = null
  function adresseNorm(a) {
    const t = (v, n) => { const x = String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); return x || null; };
    a = a || {};
    return { strasse: t(a.strasse, 120), plz: t(a.plz, 5), ort: t(a.ort, 80) };
  }
  // Zeilen für Anzeige und Druck: ["Musterweg 1", "12345 Musterstadt"], fehlende Teile entfallen
  function adresseZeilen(a) {
    const n = adresseNorm(a);
    return [n.strasse, [n.plz, n.ort].filter(Boolean).join(" ")].filter(Boolean);
  }

  // P1.4a (W25): Überschneidung von Terminen – EIN Prüf-Baustein für App und Büro (nur Hinweis, nie Sperre).
  // Termin-Form (beide Seiten wandeln vorher um): { id, datum, von, bis, art, status, fahrlehrer, schueler, fahrzeug, geloescht }
  // Konflikt = gleicher Tag, Zeiten überlappen (Ende = Anfang ist KEIN Konflikt) und gleicher Fahrlehrer, Schüler oder Fahrzeug.
  // Abgesagte, abgebrochene, geplatzte und gelöschte Termine zählen nicht. Fahrzeug über den Namen (Groß/Klein, Leerzeichen egal).
  const KONFLIKT_AUS = ["abgesagt", "abgebrochen", "geplatzt", "storniert"];
  function fahrzeugNorm(n) { return String(n == null ? "" : n).trim().toLowerCase().replace(/\s+/g, " "); }
  function terminZaehltFuerKonflikt(t) {
    return !!t && !t.geloescht && !!t.datum && !!t.von && !!t.bis && KONFLIKT_AUS.indexOf(t.status || "") < 0 && hm2min(t.bis) > hm2min(t.von);
  }
  function terminUeberlappt(a, b) {
    return a.datum === b.datum && hm2min(a.von) < hm2min(b.bis) && hm2min(a.bis) > hm2min(b.von);
  }
  // Gründe, warum a und b kollidieren (leer = kein Konflikt). Reihenfolge: fahrlehrer, schueler, fahrzeug
  function konfliktGruende(a, b) {
    if (!terminZaehltFuerKonflikt(a) || !terminZaehltFuerKonflikt(b) || (a.id != null && a.id === b.id) || !terminUeberlappt(a, b)) return [];
    const g = [];
    if (a.fahrlehrer != null && a.fahrlehrer !== "" && a.fahrlehrer === b.fahrlehrer) g.push("fahrlehrer"); // unbekannter Fahrlehrer (null) vergleicht nicht
    if (a.schueler && a.schueler === b.schueler) g.push("schueler");
    const fa = fahrzeugNorm(a.fahrzeug);
    if (fa && fa === fahrzeugNorm(b.fahrzeug)) g.push("fahrzeug");
    return g;
  }
  // Alle Termine aus liste, die mit neu kollidieren: [{ t, gruende }], nach Anfangszeit
  function terminKonflikte(neu, liste) {
    const out = [];
    for (const t of liste || []) { const g = konfliktGruende(neu, t); if (g.length) out.push({ t, gruende: g }); }
    return out.sort((x, y) => hm2min(x.t.von) - hm2min(y.t.von));
  }
  // Ids aller Termine eines Tages (oder mehrerer), die mit mindestens einem anderen kollidieren (für das Warnzeichen)
  function konfliktIds(liste) {
    const ids = new Set(), l = (liste || []).filter(terminZaehltFuerKonflikt);
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      if (konfliktGruende(l[i], l[j]).length) { ids.add(l[i].id); ids.add(l[j].id); }
    }
    return ids;
  }
  const KONFLIKT_WORTE = { fahrlehrer: "gleicher Fahrlehrer", schueler: "gleicher Schüler", fahrzeug: "gleiches Fahrzeug" };
  // Eine Zeile je Konflikt, z. B. „10:00–11:30 Max (gleicher Fahrlehrer, gleiches Fahrzeug)“; name(t) liefert den Namen
  function konfliktText(konflikte, name, mitDatum) {
    return (konflikte || []).slice(0, 4).map((k) => {
      const n = name ? name(k.t) : "";
      return (mitDatum ? k.t.datum.slice(8, 10) + "." + k.t.datum.slice(5, 7) + ". " : "") + k.t.von + "–" + k.t.bis + (n ? " " + n : "") + " (" + k.gruende.map((g) => KONFLIKT_WORTE[g]).join(", ") + ")";
    }).join("\n") + ((konflikte || []).length > 4 ? "\n… und " + (konflikte.length - 4) + " weitere" : "");
  }
  // P1.4b (W25): Spalten für überlappende Termine in einer Tagesspalte. items: [{ id, von, bis }] (HH:MM).
  // Ergebnis: Map id → { spalte, spalten } – Termine, die sich (auch über Ketten) überlappen, teilen sich die Breite.
  function spaltenLayout(items) {
    const l = (items || []).filter((x) => x && x.von && x.bis).map((x) => ({ id: x.id, a: hm2min(x.von), b: Math.max(hm2min(x.bis), hm2min(x.von) + 1) }))
      .sort((x, y) => x.a - y.a || y.b - x.b);
    const res = new Map();
    let gruppe = [], ende = -1, enden = [];
    const abschliessen = () => { const n = enden.length || 1; gruppe.forEach((g) => res.set(g.id, { spalte: g.s, spalten: n })); gruppe = []; enden = []; };
    for (const x of l) {
      if (gruppe.length && x.a >= ende) { abschliessen(); ende = -1; }
      let s = enden.findIndex((e) => e <= x.a);
      if (s < 0) { s = enden.length; enden.push(x.b); } else enden[s] = x.b;
      gruppe.push({ id: x.id, s }); ende = Math.max(ende, x.b);
    }
    abschliessen();
    return res;
  }
  const api = { NUR_BUERO_ARTEN, istNurBueroArt, KONFLIKT_AUS, fahrzeugNorm, terminZaehltFuerKonflikt, terminUeberlappt, konfliktGruende, terminKonflikte, konfliktIds, konfliktText, spaltenLayout, paketVerbrauch, terminEndeMin, einheitenGeld, einheitenNachweis, RUNDUNG, sonderMinuten, setzeSonderMinuten, sonderEinheiten, sonderEinheitenAusMinuten, terminMinuten, SONDER_MIN_STANDARD, paketQuelleAusTerminen, paketHinweise, paketSonderAusPlan, PAKET_SONDER, FS_BUERO_ARTEN, pad2, hm2min, parseISO, dateISO, todayISO, ueOf, addMonthsISO, addDaysISO, daysBetweenISO, reaktFaellig, reaktNachZahlung, reaktInfo,
    setzeReaktRegel, holeReaktRegel, reaktMonate, reaktFreiAm, reaktEntfaellt, reaktRegelAusPreisen, REAKT_MONATE_STANDARD,
    FRISTEN_STANDARD, FRISTEN_GRENZEN, PRAXIS_NACH_THEORIE_MONATE, fristZahl, normFristen, fristenAusZeilen, fristenAusKE, setzeFristen, holeFristen, theorieInfo, antragInfo, theorieFristInfo, umschreibInfo, istEuEwr, EU_EWR, UMSCHREIB_MONATE, theorieSoll, theorieStand, sonderSoll, FAHRLEHRERLAUBNIS,
    kundennummerText, plzOk, adresseNorm, adresseZeilen, ausbildungsKlassen, fahrlehrerFristen, lkwWegAusVorbesitz, LEKT_GRUND, LEKT_B, LEKT_C, LEKT_CE, fcGebucht, fcErhalten, fcFuersBuero, fcVomBuero, lohnStand, LOHN_FC_AB, fcGueltigBis, fcGueltigkeit, fcZeitraum, fcVorZeitraum, fcSoll, aufteilung, FAHR_ARTEN, wartetInfo, istDrittstaat, landKey, DRITTSTAATEN, LAND_NAMEN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KR = api;
})(typeof self !== "undefined" ? self : this);
