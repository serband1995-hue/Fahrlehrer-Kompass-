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

  const api = { FS_BUERO_ARTEN, pad2, hm2min, parseISO, dateISO, todayISO, ueOf, addMonthsISO, addDaysISO, daysBetweenISO, reaktFaellig, reaktNachZahlung, reaktInfo, theorieInfo };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.KR = api;
})(typeof self !== "undefined" ? self : this);
