/* Fahrlehrer-Kompass – Prüfungstage mit festen 55-Minuten-Fenstern (W21, 🗣 Serband 26.11.2026)
   EINE Quelle für App (index.html) und Büro (buero.html): Tabelle pruefungstermine (+ pruefungstage).
   Regeln, die der Server ohnehin durchsetzt (supabase/migrations/20261203_w21_01_pruefungstage.sql), stehen hier nur,
   damit beide Seiten vorher dasselbe anzeigen (frei/belegt, Uhrzeit). Entscheidet am Ende immer der Server.
   - Fenster i beginnt um start + i·55 Min (Standard 08:00 → 08:00, 08:55, … 15:20; letztes endet 16:15).
   - Nur Klassen B und BE (auch B78/B197/Automatik) bekommen Fenster. Lkw (C1, C1E, C, CE) an einem B-Tag: zwei Fenster.
   - Ein Prüfungstag = ein Prüfer. Zwei Prüfer am selben Datum = zwei Tage.
   Globale: window.PT */
(function (root) {
  "use strict";
  const FENSTER_MIN = 55, FENSTER_ZAHL = 9, START = "08:00";
  const LKW = ["C1", "C1E", "C", "CE"];
  const FENSTER_KLASSEN = ["B", "BE", "B78", "B197", "B+BE", "AUTOMATIK"];

  function pad2(n) { return String(n).padStart(2, "0"); }
  function hm2min(hm) { const p = String(hm || "0:0").split(":"); return (+p[0]) * 60 + (+(p[1] || 0)); }
  function min2hm(m) { m = Math.max(0, Math.min(23 * 60 + 59, Math.round(m))); return pad2(Math.floor(m / 60)) + ":" + pad2(m % 60); }
  function hm(x) { return x ? String(x).slice(0, 5) : ""; }

  function istLkwKlasse(k) { return LKW.includes(String(k || "").toUpperCase()); }
  // Bekommt diese Klasse Fenster? Ohne Klasse: ja (Standard ist B).
  function istFensterKlasse(k) { const x = String(k || "B").toUpperCase(); return FENSTER_KLASSEN.includes(x) || istLkwKlasse(x); }
  function nurFreieUhrzeit(k) { return !istFensterKlasse(k); }
  function fensterAnzahlFuer(k) { return istLkwKlasse(k) ? 2 : 1; }
  function dauerFuer(k) { return istLkwKlasse(k) ? 85 : FENSTER_MIN; }

  function tagStart(tag) { return hm(tag && tag.start) || START; }
  function tagZahl(tag) { return (tag && Number(tag.fenster_zahl)) || FENSTER_ZAHL; }
  function fensterVon(tag, i) { return min2hm(hm2min(tagStart(tag)) + i * FENSTER_MIN); }
  function fensterBis(tag, i, anzahl) { return min2hm(hm2min(tagStart(tag)) + (i + (anzahl || 1)) * FENSTER_MIN); }
  // [{i, von, bis}] für alle Fenster des Tages
  function fensterListe(tag) { const out = []; for (let i = 0; i < tagZahl(tag); i++) out.push({ i, von: fensterVon(tag, i), bis: fensterBis(tag, i, 1) }); return out; }

  // Belegung eines Tages. termine: Prüfungen des Tages (Zeilen aus pruefungstermine oder belegt[] aus der Belegung)
  // Ergebnis: Array je Fenster: null (frei) oder {t, erstes} (erstes = Anfang eines Lkw-Doppelfensters)
  function belegung(tag, termine) {
    const z = tagZahl(tag), out = new Array(z).fill(null);
    (termine || []).forEach((t) => {
      if (!t || t.status === "abgesagt" || t.fenster == null) return;
      const n = Number(t.fenster_anzahl || t.anzahl || 1);
      for (let k = 0; k < n; k++) if (t.fenster + k < z) out[t.fenster + k] = { t, erstes: k === 0 };
    });
    return out;
  }
  // Passt eine Prüfung mit `anzahl` Fenstern ab Fenster i? (ignoriere = id einer Prüfung, die gerade verschoben wird)
  function passt(tag, termine, i, anzahl, ignoriere) {
    const b = belegung(tag, (termine || []).filter((t) => !ignoriere || t.id !== ignoriere));
    if (i < 0 || i + (anzahl || 1) > b.length) return false;
    for (let k = 0; k < (anzahl || 1); k++) if (b[i + k]) return false;
    return true;
  }
  // Passt ein Tausch von a und b? (Lkw braucht zwei Fenster: am Platz des anderen muss genug frei sein)
  function tauschPasst(tagA, termineA, a, tagB, termineB, b) {
    const na = Number(a.fenster_anzahl || a.anzahl || 1), nb = Number(b.fenster_anzahl || b.anzahl || 1);
    const ohne = (l) => (l || []).filter((t) => t.id !== a.id && t.id !== b.id);
    if (tagA && tagB && tagA.id === tagB.id) {
      const L = ohne(termineA);
      if (!passt(tagA, L, a.fenster, nb)) return false;
      return passt(tagA, L.concat([{ id: "_b", fenster: a.fenster, fenster_anzahl: nb, status: "geplant" }]), b.fenster, na);
    }
    return passt(tagA, ohne(termineA), a.fenster, nb) && passt(tagB, ohne(termineB), b.fenster, na);
  }
  // Startzeit: das letzte Fenster muss am selben Tag enden (spätestens 23:59)
  function startOk(start, zahl) { const m = hm2min(start); return /^\d\d:\d\d/.test(String(start || "")) && m + (zahl || FENSTER_ZAHL) * FENSTER_MIN <= 23 * 60 + 59; }
  function startMax(zahl) { return min2hm(23 * 60 + 59 - (zahl || FENSTER_ZAHL) * FENSTER_MIN); }
  function freieFenster(tag, termine, anzahl, ignoriere) {
    const out = []; for (let i = 0; i < tagZahl(tag); i++) if (passt(tag, termine, i, anzahl, ignoriere)) out.push(i); return out;
  }
  // „x geplant, y frei“
  function zaehle(tag, termine) {
    const b = belegung(tag, termine);
    return { geplant: (termine || []).filter((t) => t && t.status !== "abgesagt" && t.fenster != null).length, frei: b.filter((x) => !x).length, fenster: b.length };
  }
  function zaehlText(tag, termine) { const z = zaehle(tag, termine); return `${z.geplant} geplant, ${z.frei} frei`; }

  // Farben je Status (vorhandene Farbnamen: gelb/neutral, grün, rot)
  const STATUS = {
    geplant: { farbe: "gelb", text: "ausstehend" },
    bestanden: { farbe: "gruen", text: "bestanden" },
    nicht_bestanden: { farbe: "rot", text: "nicht bestanden" },
    abgesagt: { farbe: "grau", text: "abgesagt" },
  };
  function statusInfo(s) { return STATUS[s] || STATUS.geplant; }

  // Fehler des Servers in einfache Worte
  function fehlerText(e) {
    const m = String((e && (e.message || e.details || e.hint)) || e || "");
    if (/W21:fenster_belegt/.test(m) || /pruefungstermine_fenster_frei|duplicate key/.test(m)) return "Dieses Zeitfenster ist gerade schon vergeben worden. Bitte ein anderes wählen.";
    if (/W21:schueler_doppelt/.test(m)) return "Der Schüler hat an diesem Tag schon eine Prüfung.";
    if (/W21:fenster_ungueltig/.test(m)) return "Dieses Zeitfenster gibt es an dem Tag nicht.";
    if (/W21:tag_fehlt/.test(m)) return "Diesen Prüfungstag gibt es nicht mehr.";
    if (/W21:tag_nicht_leer/.test(m)) return "Erst alle Prüfungen des Tages verschieben oder absagen.";
    if (/W21:tag_fremde_pruefungen/.test(m)) return "An diesem Tag prüfen auch Schüler anderer Fahrlehrer. Bitte das Büro fragen.";
    if (/W21:nur_fenster/.test(m)) return "Tauschen geht nur zwischen Zeitfenstern.";
    if (/W21:tag_hat_ergebnisse/.test(m)) return "An diesem Tag stehen schon Ergebnisse. Datum und Uhrzeit bleiben deshalb, wie sie sind.";
    if (/W21:tausch_passt_nicht/.test(m)) return "Tauschen geht nicht: Eine Lkw-Prüfung braucht zwei freie Fenster hintereinander.";
    if (/W21:start_zu_spaet/.test(m)) return "So spät geht nicht: Das letzte Fenster muss vor Mitternacht enden (Start spätestens " + startMax() + ").";
    if (/W21:(nicht_gefunden|keine_berechtigung)/.test(m) || /row-level security|permission denied/i.test(m)) return "Dafür fehlt die Berechtigung.";
    if (/Zahlung ausstehend/.test(m)) return m.replace(/^.*?(Zahlung ausstehend)/, "$1") + " – bitte zuerst im Büro klären.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Keine Verbindung. Bitte gleich nochmal versuchen.";
    return m || "Nicht gespeichert.";
  }

  // ---------- Datenzugriff (supa = Supabase-Client) ----------
  // fs: nur für den Super-Admin auf der Büro-Seite (gewählte Fahrschule); sonst weglassen
  async function ladeBelegung(supa, von, bis, fs) {
    const arg = { p_von: von, p_bis: bis }; if (fs) arg.p_fahrschule = fs;
    const { data, error } = await supa.rpc("pruefungstage_belegung", arg);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }
  async function tagAnlegen(supa, werte) {
    const zeile = { fahrschule_id: werte.fahrschule_id, datum: werte.datum, start: werte.start || START, pruefer: werte.pruefer || null, notiz: werte.notiz || null };
    if (werte.erstellt_von) zeile.erstellt_von = werte.erstellt_von;
    const { data, error } = await supa.from("pruefungstage").insert(zeile).select("*");
    if (error || !data || !data.length) throw error || new Error("keine Berechtigung");
    return data[0];
  }
  async function tagAendern(supa, id, werte) {
    const { data, error } = await supa.from("pruefungstage").update(Object.assign({}, werte)).eq("id", id).select("*");
    if (error || !data || !data.length) throw error || new Error("keine Berechtigung");
    return data[0];
  }
  async function tagLoeschen(supa, id) { return tagAendern(supa, id, { geloescht: true }); }
  // Eine Prüfung in ein Fenster (oder mit freier Uhrzeit, wenn tag fehlt)
  async function einplanen(supa, w) {
    const zeile = {
      fahrschule_id: w.fahrschule_id, schueler_id: w.schueler_id, art: w.art || "praxis", klasse: w.klasse || null,
      fahrlehrer_id: w.fahrlehrer_id || null, status: "geplant", aktualisiert_am: new Date().toISOString(),
    };
    if (w.quelle) zeile.quelle = w.quelle;
    if (w.pruefungstag_id) Object.assign(zeile, { pruefungstag_id: w.pruefungstag_id, fenster: w.fenster, fenster_anzahl: w.fenster_anzahl || fensterAnzahlFuer(w.klasse) });
    else Object.assign(zeile, { datum: w.datum, von: w.von || null });
    if (w.pruefer) zeile.pruefer = w.pruefer;
    const { data, error } = await supa.from("pruefungstermine").insert(zeile).select("*");
    if (error || !data || !data.length) throw error || new Error("keine Berechtigung");
    return data[0];
  }
  async function aendern(supa, id, werte) {
    const { data, error } = await supa.from("pruefungstermine").update(Object.assign({ aktualisiert_am: new Date().toISOString() }, werte)).eq("id", id).select("*");
    if (error || !data || !data.length) throw error || new Error("keine Berechtigung");
    return data[0];
  }
  const verschieben = (supa, id, tagId, fenster) => aendern(supa, id, { pruefungstag_id: tagId, fenster });
  const fahrlehrerAendern = (supa, id, fl) => aendern(supa, id, { fahrlehrer_id: fl || null });
  const ergebnis = (supa, id, status) => aendern(supa, id, { status });
  const absagen = (supa, id) => aendern(supa, id, { status: "abgesagt" });
  async function tauschen(supa, a, b) {
    const { error } = await supa.rpc("pruefung_tauschen", { a, b });
    if (error) throw error;
    return true;
  }
  // Mehrere Schüler hintereinander: füllt die freien Fenster der Reihe nach (ab Fenster `ab`). Liefert {ok:[zeile], fehler:[{sid,text}]}
  async function mehrereEinplanen(supa, tag, termine, schueler, basis) {
    const liste = (termine || []).slice(), ok = [], fehler = [];
    for (const s of schueler) {
      const anzahl = fensterAnzahlFuer(s.klasse);
      const frei = freieFenster(tag, liste, anzahl);
      if (!frei.length) { fehler.push({ sid: s.id, text: "Kein freies Fenster mehr an diesem Tag." }); continue; }
      try {
        const z = await einplanen(supa, Object.assign({}, basis, { schueler_id: s.id, klasse: s.klasse, fahrlehrer_id: s.fahrlehrer_id, pruefungstag_id: tag.id, fenster: frei[0], fenster_anzahl: anzahl }));
        ok.push(z); liste.push(z);
      } catch (e) { fehler.push({ sid: s.id, text: fehlerText(e) }); }
    }
    return { ok, fehler };
  }

  const PT = {
    FENSTER_MIN, FENSTER_ZAHL, START,
    hm2min, min2hm, hm, istLkwKlasse, istFensterKlasse, nurFreieUhrzeit, fensterAnzahlFuer, dauerFuer,
    tagStart, tagZahl, fensterVon, fensterBis, fensterListe, belegung, passt, tauschPasst, startOk, startMax, freieFenster, zaehle, zaehlText, statusInfo, STATUS, fehlerText,
    ladeBelegung, tagAnlegen, tagAendern, tagLoeschen, einplanen, aendern, verschieben, fahrlehrerAendern, ergebnis, absagen, tauschen, mehrereEinplanen,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = PT;
  root.PT = PT;
})(typeof window !== "undefined" ? window : globalThis);
