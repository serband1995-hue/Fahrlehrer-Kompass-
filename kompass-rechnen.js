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
     Vermerke des Fahrlehrers (wie index.html, setFC): v1/halb_bewusst = 1 FC vergessen,
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
    if (t.fc === "v1" || t.fc === "halb_bewusst") return Math.max(voll - 1, 0);
    if (t.fc === "v2" || t.fc === "geschenkt" || t.fc === "offen" || t.fc === "nachgereicht") return 0;
    return voll;
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
  function fcSoll(termine, von, bis, heute) {
    heute = heute || todayISO();
    const posten = [];
    let soll = 0;
    for (const t of termine || []) {
      const datum = t.datum || t.date;
      if (!datum) continue;
      if (datum >= von && datum <= bis && datum <= heute) {
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

  const api = { FS_BUERO_ARTEN, pad2, hm2min, parseISO, dateISO, todayISO, ueOf, addMonthsISO, addDaysISO, daysBetweenISO, reaktFaellig, reaktNachZahlung, reaktInfo, theorieInfo, fcGebucht, fcErhalten, fcZeitraum, fcVorZeitraum, fcSoll };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KR = api;
})(typeof self !== "undefined" ? self : this);
