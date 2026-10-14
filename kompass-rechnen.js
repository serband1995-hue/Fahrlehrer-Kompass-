/* Fahrlehrer-Kompass – gemeinsame Rechenregeln
   Wird von der Büro-Seite (buero.html) genutzt. Die Regeln sind 1:1 aus index.html übernommen,
   damit Büro und Fahrlehrer dieselben Zahlen sehen. Ein Test (scripts/rechnen-test.mjs) prüft,
   dass beide Fassungen gleich rechnen. Wer hier etwas ändert, muss index.html mit ändern. */
(function (root) {
  "use strict";

  // Büro-Kategorien sind keine bezahlten Fahrstunden-UE (index.html: FS_BUERO_ARTEN)
  const FS_BUERO_ARTEN = ["beratung", "ersthilfe", "vortest", "simulator"];

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
  function reaktFaellig(s) {
    if (!s || s.reakt_status === "befreit") return null;
    if (s.reakt_bezahlt_bis) return s.reakt_bezahlt_bis;
    if (s.vertrag_am) return addMonthsISO(s.vertrag_am, 12);
    return null;
  }
  function reaktNachZahlung(s) {
    const f = reaktFaellig(s);
    return f ? addMonthsISO(f, 12) : null;
  }
  // stufe: befreit | ohne_datum | gesperrt | pruefen_faellig | bald (≤30 Tage) | demnaechst (≤60) | ok
  function reaktInfo(s, heute) {
    heute = heute || todayISO();
    if (s && s.reakt_status === "befreit") return { stufe: "befreit", faellig: null, tage: null, gesperrt: false };
    const faellig = reaktFaellig(s);
    if (!faellig) return { stufe: "ohne_datum", faellig: null, tage: null, gesperrt: false };
    const tage = daysBetweenISO(heute, faellig);
    let stufe;
    if (tage < 0) stufe = s.reakt_status === "pruefen" ? "pruefen_faellig" : "gesperrt";
    else if (tage <= 30) stufe = "bald";
    else if (tage <= 60) stufe = "demnaechst";
    else stufe = "ok";
    return { stufe, faellig, tage, gesperrt: stufe === "gesperrt" };
  }
  /* Theorie: gilt 12 Monate nach Abschluss des Unterrichts. Wer in dieser Zeit die
     Theorieprüfung besteht, hat ab dem Prüfungstag 12 Monate für die Praxisprüfung. */
  function theorieInfo(s, heute) {
    heute = heute || todayISO();
    let ablauf = null, grund = null;
    if (s && s.theorie_bestanden_am) { ablauf = addMonthsISO(s.theorie_bestanden_am, 12); grund = "praxis"; }
    else if (s && s.theorie_abgeschlossen_am) { ablauf = addMonthsISO(s.theorie_abgeschlossen_am, 12); grund = "unterricht"; }
    if (!ablauf) return { stufe: "ohne_datum", ablauf: null, tage: null, grund: null };
    const tage = daysBetweenISO(heute, ablauf);
    const stufe = tage < 0 ? "abgelaufen" : tage <= 30 ? "bald" : tage <= 60 ? "demnaechst" : "ok";
    return { stufe, ablauf, tage, grund };
  }

  /* ----- Fahrchecks (FC) -----
     Papier-Wertmarke: 1 FC je 45 Minuten Fahrstunde/Sonderfahrt/Nachtfahrt (90 Min = 2 FC).
     Vermerke des Fahrlehrers (wie index.html, setFC): v1/halb_bewusst/eins_ok = 1 FC weniger,
     v2 = 2 vergessen, geschenkt = keiner, offen = FC fehlt noch, nachgereicht = zählt im
     Zeitraum von nachAm. Ohne Vermerk = alle FC erhalten.
     Gezählt wird die gebuchte Zeit (von–bis), nicht eine verschenkte Restzeit.
     Nicht erschienen / abgebrochen = keine FC. */
  const FC_ARTEN = ["fahrstunde", "sonder", "nacht"];
  function fcGebucht(t) {
    if (!t || !FC_ARTEN.includes(t.art) || !t.von || !t.bis) return 0;
    const min = hm2min(t.bis) - hm2min(t.von);
    return min > 0 ? Math.round(min / 45) : 0;
  }
  function fcErhalten(t) {
    const voll = fcGebucht(t);
    if (!voll || t.status === "abgebrochen" || t.status === "nicht erschienen") return 0;
    // eins_ok = „1 FC (abgeschlossen)“: bezahlt wird voll, im Umschlag liegt aber nur 1 FC weniger
    if (t.fc === "v1" || t.fc === "halb_bewusst" || t.fc === "eins_ok") return Math.max(voll - 1, 0);
    if (t.fc === "v2" || t.fc === "geschenkt" || t.fc === "offen" || t.fc === "nachgereicht") return 0;
    return voll;
  }
  // Führerscheinantrag bei der Führerscheinstelle: 12 Monate ab Antragsdatum; nach bestandener Theorieprüfung gilt er
  // 12 Monate ab Prüfungsdatum (wie die Theorie; Kristina, 09.10.2026). stufe: ohne_datum | abgelaufen | bald (≤60 Tage) | ok
  function antragInfo(s, heute) {
    heute = heute || todayISO();
    if (!s || !s.antrag_am) return { stufe: "ohne_datum", ablauf: null, tage: null, grund: null };
    let ablauf = addMonthsISO(s.antrag_am, 12), grund = "antrag";
    if (s.theorie_bestanden_am) {
      const v = addMonthsISO(s.theorie_bestanden_am, 12);
      if (v > ablauf) { ablauf = v; grund = "theorie"; }
    }
    const tage = daysBetweenISO(heute, ablauf);
    return { stufe: tage < 0 ? "abgelaufen" : (tage <= 60 ? "bald" : "ok"), ablauf, tage, grund };
  }
  // Theorie-Frist der Behörde (schueler.theorie_frist_bis, 🗣 Serband 14.10.2026): bis dahin muss die Theorieprüfung bestanden sein.
  // stufe: ohne_datum | erledigt (Theorie bestanden) | abgelaufen | bald (≤30 Tage) | demnaechst (≤60 Tage) | ok
  function theorieFristInfo(s, heute) {
    heute = heute || todayISO();
    if (s && s.theorie_bestanden_am) return { stufe: "erledigt", ablauf: s.theorie_frist_bis || null, tage: null };
    if (!s || !s.theorie_frist_bis) return { stufe: "ohne_datum", ablauf: null, tage: null };
    const ablauf = String(s.theorie_frist_bis).slice(0, 10), tage = daysBetweenISO(heute, ablauf);
    return { stufe: tage < 0 ? "abgelaufen" : tage <= 30 ? "bald" : tage <= 60 ? "demnaechst" : "ok", ablauf, tage };
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
  //        | ohne_datum (Drittstaat, Wohnsitz fehlt) | abgelaufen | bald (≤30 Tage) | ok
  function umschreibInfo(s, heute) {
    heute = heute || todayISO();
    const fs = (s && Array.isArray(s.auslands_fs)) ? s.auslands_fs.filter((f) => f && f.land) : [];
    const umschreiber = s && (s.ausbildungsart === "umschreibung" || !!(s.ausbildung && s.ausbildung.umschreiber)); // auch nur in der App markiert
    if (!umschreiber || !fs.length) return { stufe: "kein", bis: null, tage: null, drittstaat: false };
    if (fs.some((f) => istEuEwr(f.land))) return { stufe: "eu", bis: null, tage: null, drittstaat: false }; // ein EU/EWR-Führerschein gilt weiter
    if (!fs.some((f) => istDrittstaat(f.land))) return { stufe: "land_pruefen", bis: null, tage: null, drittstaat: false };
    if (!s.wohnsitz_de_seit) return { stufe: "ohne_datum", bis: null, tage: null, drittstaat: true };
    const bis = addMonthsISO(String(s.wohnsitz_de_seit).slice(0, 10), UMSCHREIB_MONATE), tage = daysBetweenISO(heute, bis);
    return { stufe: tage < 0 ? "abgelaufen" : tage <= 30 ? "bald" : "ok", bis, tage, drittstaat: true };
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
  // Fahrcheck-Zettel (Übungs-, Sonder- und Testfahrten) verfallen 12 Monate nach dem Datum der Stunde (Kristina, 09.10.2026)
  function fcGueltigBis(datum) { return datum ? addMonthsISO(datum, 12) : null; }
  // stufe: verfallen | bald (≤60 Tage) | ok
  function fcGueltigkeit(datum, heute) {
    heute = heute || todayISO();
    const bis = fcGueltigBis(datum);
    if (!bis) return { stufe: "ok", bis: null, tage: null };
    const tage = daysBetweenISO(heute, bis);
    return { stufe: tage < 0 ? "verfallen" : (tage <= 60 ? "bald" : "ok"), bis, tage };
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
    const ende = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t.bis || ""); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
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
    if (a.theorieWait && !a.theoryPassed) return "theorie";
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

  const api = { FS_BUERO_ARTEN, pad2, hm2min, parseISO, dateISO, todayISO, ueOf, addMonthsISO, addDaysISO, daysBetweenISO, reaktFaellig, reaktNachZahlung, reaktInfo, theorieInfo, antragInfo, theorieFristInfo, umschreibInfo, istEuEwr, EU_EWR, UMSCHREIB_MONATE, theorieSoll, theorieStand, lkwWegAusVorbesitz, LEKT_GRUND, LEKT_B, LEKT_C, LEKT_CE, fcGebucht, fcErhalten, fcGueltigBis, fcGueltigkeit, fcZeitraum, fcVorZeitraum, fcSoll, aufteilung, FAHR_ARTEN, wartetInfo, istDrittstaat, landKey, DRITTSTAATEN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KR = api;
})(typeof self !== "undefined" ? self : this);
