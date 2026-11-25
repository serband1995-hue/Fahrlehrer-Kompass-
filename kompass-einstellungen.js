/* Fahrlehrer-Kompass – KE: einstellbare Werte je Fahrschule (Tabelle fahrschule_einstellungen)
   Läuft ohne Abhängigkeit (kein KR, kein buero.js), im Browser als window.KE und in node (module.exports).
   Hält immer NUR EINE Fahrschule im Speicher. Lesen dürfen alle Mitglieder, ändern Büro, Leitung, Super-Admin.
   Nie Geheimes hier ablegen (jedes Mitglied der Fahrschule kann es lesen).

   KE.lade(sb, fsId)                         → Promise (wirft nie); danach Ereignis 'ke:geladen' {fsId[, fehler][, ausSpeicher]}
   KE.fsId()                                 → Fahrschule, die gerade im Speicher ist (oder null)
   KE.wert(schluessel, standardObjekt)       → Kopie; gespeicherte Felder überschreiben den Standard feldweise
   KE.zahl(schluessel, feld, std, min, max)  → ganze Zahl, wie die Server-Funktion fahrschule_einstellung_zahl
   KE.setze(sb, fsId, schluessel, objekt)    → Promise; bei Fehler Error mit einfachem deutschem Text, dann KEIN Ereignis
   KE.zuruecksetzen(sb, fsId, schluessel)    → Zeile löschen (= wieder der eingebaute Standard)
   Offline: localStorage 'ke:<fsId>' = {zeit, werte}. */
(function () {
  "use strict";
  var TABELLE = "fahrschule_einstellungen";
  var SCHLUESSEL = /^(fristen|vorlagen|fahrstunden|papierkorb|rueckgaengig)(\.[a-z][a-z0-9_]*)+$/;
  var MAX_ZEICHEN = 16000; // wie die Prüfung fe_groesse in der Datenbank

  var _fs = null;      // Fahrschule im Speicher
  var _werte = {};     // schluessel → Objekt (nur die gespeicherten, ohne Standard)
  var _lauf = 0;       // jüngste lade()-Anfrage gewinnt

  function kopie(x) { return JSON.parse(JSON.stringify(x)); }
  function einfachesObjekt(o) { return Object.prototype.toString.call(o) === "[object Object]"; }
  function speicher() {
    try {
      if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
      if (typeof localStorage !== "undefined") return localStorage;
    } catch (e) { /* gesperrt */ }
    return null;
  }
  function ausSpeicherLesen(fsId) {
    try {
      var s = speicher(); if (!s) return null;
      var roh = s.getItem("ke:" + fsId); if (!roh) return null;
      var o = JSON.parse(roh);
      if (!o || !einfachesObjekt(o.werte)) return null;
      var w = {};
      Object.keys(o.werte).forEach(function (k) { if (SCHLUESSEL.test(k) && einfachesObjekt(o.werte[k])) w[k] = o.werte[k]; });
      return w;
    } catch (e) { return null; }
  }
  function inSpeicherSchreiben() {
    try { var s = speicher(); if (s && _fs) s.setItem("ke:" + _fs, JSON.stringify({ zeit: Date.now(), werte: _werte })); } catch (e) { /* voll/gesperrt: egal */ }
  }
  function ereignis(detail) {
    try {
      if (typeof window !== "undefined" && window.dispatchEvent && typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent("ke:geladen", { detail: detail }));
    } catch (e) { /* ein Zuhörer darf nie das Laden kaputt machen */ }
  }
  function tabelleFehlt(err) {
    var t = err && (err.code || "");
    return t === "42P01" || t === "PGRST205" || /does not exist|schema cache/i.test((err && err.message) || "");
  }
  function netzFehler(err) {
    return !err || /fetch|network|netz|timeout|offline|Failed to|Load failed/i.test(String(err.message || err)) || err.status === 0;
  }
  function fehlerText(err, art) {
    if (err && (err.code === "42501" || err.status === 401 || err.status === 403 || /row-level security|permission denied|not allowed/i.test(err.message || ""))) return "Keine Berechtigung zum Ändern";
    if (tabelleFehlt(err)) return "Die Einstellungen sind noch nicht eingerichtet";
    if (err && (err.code === "23514" || err.code === "22023")) return "Dieser Wert ist nicht erlaubt";
    if (err && err.code && !netzFehler(err)) return "Nicht gespeichert – bitte noch einmal versuchen";
    return art === "loeschen" ? "Keine Verbindung – nicht zurückgesetzt" : "Keine Verbindung – nicht gespeichert";
  }

  var KE = {
    fsId: function () { return _fs; },

    lade: async function (sb, fsId) {
      if (!fsId) return;
      var nr = ++_lauf;
      try {
        var c = null;
        if (_fs !== fsId) { _fs = fsId; c = ausSpeicherLesen(fsId); _werte = c || {}; }
        else if (!Object.keys(_werte).length) { c = ausSpeicherLesen(fsId); if (c) _werte = c; }
        if (c) ereignis({ fsId: fsId, ausSpeicher: true });
      } catch (e) { /* weiter mit der Datenbank */ }
      var neu = null, fehler = null;
      try {
        var r = await sb.from(TABELLE).select("schluessel,wert").eq("fahrschule_id", fsId);
        if (r && r.error) {
          if (tabelleFehlt(r.error)) { neu = {}; fehler = "Die Einstellungen sind noch nicht eingerichtet"; }
          else fehler = netzFehler(r.error) ? "Keine Verbindung – gespeicherte Einstellungen werden genutzt" : "Einstellungen konnten nicht geladen werden";
        } else {
          neu = {};
          ((r && r.data) || []).forEach(function (z) { if (z && SCHLUESSEL.test(z.schluessel) && einfachesObjekt(z.wert)) neu[z.schluessel] = kopie(z.wert); });
        }
      } catch (e) { fehler = "Keine Verbindung – gespeicherte Einstellungen werden genutzt"; }
      if (nr !== _lauf) return; // inzwischen wurde eine andere Fahrschule (oder neu) geladen
      if (neu) { _werte = neu; inSpeicherSchreiben(); }
      var d = { fsId: fsId };
      if (fehler) d.fehler = fehler;
      ereignis(d);
    },

    wert: function (schluessel, standard) {
      var std = einfachesObjekt(standard) ? standard : {};
      var gespeichert = (_fs && _werte[schluessel]) || {};
      return kopie(Object.assign({}, std, gespeichert));
    },

    zahl: function (schluessel, feld, standard, min, max) {
      var o = _fs && _werte[schluessel];
      var v = o && Object.prototype.hasOwnProperty.call(o, feld) ? o[feld] : undefined;
      if (typeof v === "number") v = Number.isFinite(v) ? String(v) : ""; // eine Zahl im JSON zählt wie ihr Text (1.5 und 1e21 fallen dabei durch)
      if (typeof v !== "string" || !/^[0-9]{1,6}$/.test(v)) return standard;
      var n = parseInt(v, 10);
      return n >= min && n <= max ? n : standard;
    },

    setze: async function (sb, fsId, schluessel, objekt) {
      if (!fsId) throw new Error("Keine Fahrschule gewählt");
      if (typeof schluessel !== "string" || !SCHLUESSEL.test(schluessel) || schluessel.length > 80) throw new Error("Unbekannte Einstellung");
      if (!einfachesObjekt(objekt)) throw new Error("Ungültiger Wert");
      var wert;
      try { wert = kopie(objekt); } catch (e) { throw new Error("Ungültiger Wert"); }
      if (JSON.stringify(wert).length > MAX_ZEICHEN) throw new Error("Der Wert ist zu groß");
      var r;
      try {
        r = await sb.from(TABELLE).upsert({ fahrschule_id: fsId, schluessel: schluessel, wert: wert }, { onConflict: "fahrschule_id,schluessel" });
      } catch (e) { throw new Error("Keine Verbindung – nicht gespeichert"); }
      if (r && r.error) throw new Error(fehlerText(r.error, "setzen"));
      if (_fs === fsId) { _werte[schluessel] = wert; inSpeicherSchreiben(); }
      ereignis({ fsId: fsId, geaendert: schluessel });
    },

    zuruecksetzen: async function (sb, fsId, schluessel) {
      if (!fsId) throw new Error("Keine Fahrschule gewählt");
      if (typeof schluessel !== "string" || !SCHLUESSEL.test(schluessel)) throw new Error("Unbekannte Einstellung");
      var r;
      try {
        r = await sb.from(TABELLE).delete().eq("fahrschule_id", fsId).eq("schluessel", schluessel).select("schluessel");
      } catch (e) { throw new Error("Keine Verbindung – nicht zurückgesetzt"); }
      if (r && r.error) throw new Error(fehlerText(r.error, "loeschen"));
      // Die Sicherheitsregel löscht bei fehlendem Recht still nichts: gab es die Zeile, muss sie jetzt auch zurückkommen
      if (_fs === fsId && _werte[schluessel] && r && Array.isArray(r.data) && r.data.length === 0) throw new Error("Keine Berechtigung zum Ändern");
      if (_fs === fsId) { delete _werte[schluessel]; inSpeicherSchreiben(); }
      ereignis({ fsId: fsId, geaendert: schluessel });
    },

    // nur für Tests
    _leeren: function () { _fs = null; _werte = {}; _lauf++; }
  };

  if (typeof window !== "undefined") window.KE = KE;
  if (typeof module !== "undefined" && module.exports) module.exports = KE;
})();
