/* Startseite je Rolle (Werkstatt 16, 🗣 Serband 24.11.2026: „je nachdem, wo man sich anmeldet, kommt dann die richtige Seite“).
   Gemeinsam für die App (index.html) und die Büro-Seite (buero.html), ohne Abhängigkeit von einer der beiden.
   - Fahrlehrer: nur die Fahrlehrer-Ansicht. Öffnet er buero.html, geht es sofort zur App.
   - Büro: nur die Büro-Seite. Öffnet es die App, geht es nach der Anmeldung sofort zu buero.html (Schalter BUERO_NUR_BUEROSEITE).
   - Leitung und Super-Admin wählen ihre Startseite einmal; gewechselt wird nur in den Einstellungen.
   Gespeichert wird je Gerät und Konto nur ein Wort (eigen, gesamt oder buero) unter der Konto-ID, keine Schülerdaten.
   Je Gerät, weil App und Büro-Seite denselben Gerätespeicher teilen (die Büro-Seite lädt den eigenen Stand nicht)
   und weil am Handy oft die Fahrlehrer-Ansicht, am PC das Büro gewünscht ist.
   Schnittstelle (mit Werkstatt 11 abgesprochen): KS_START.einbauen(kasten, profil[, optionen]). */
(function (g) {
  "use strict";
  var KEY = "kompass-startseite";        // { "<konto-id>": "eigen" | "gesamt" | "buero" }
  var WEITER_KEY = "kompass-weiterleitung"; // { nach: "buero" | "app", t: Zeit } – nur in diesem Tab, gegen Schleifen
  var SCHLEIFE_MS = 20000;
  var MAX_KONTEN = 8;
  // Rolle Büro nur auf der Büro-Seite (W16 Teil 3 B, 25.11.2026): an, seit dort alles läuft, was das Büro bisher in der App nutzte
  // (Hauptsitzung 24.11.: „Kristina darf nie eine Seite ohne Urlaub oder Backups bekommen“). Urlaub, Schichtplan, Backups (Teil 2) und
  // Buchungslinks, Erste-Hilfe „bezahlt“, Glocke, Monatsbericht, Provision von Hand, PIN-Ausweg (Teil 3 A) sind auf der Büro-Seite.
  // Ausschalten (false) bringt das alte Verhalten zurück: Büro bleibt in der App, Link zur App auf der Büro-Seite gibt es nicht mehr.
  var BUERO_NUR_BUEROSEITE = true;
  var TEXTE = {
    eigen: { titel: "Fahrlehrer-Ansicht", text: "Deine Schüler und Termine" },
    gesamt: { titel: "Fahrschule", text: "Alle Fahrlehrer und Schüler" },
    buero: { titel: "Büro-Seite", text: "Eigene Seite fürs Büro, gut am PC" }
  };

  // Welche Startseiten eine Person haben kann. Die erste ist die Vorgabe (so startet die App heute schon).
  function erlaubt(p) {
    if (!p || p.aktiv === false || !p.rolle) return [];
    if (p.rolle === "buero") return BUERO_NUR_BUEROSEITE ? ["buero"] : [];
    if (p.rolle === "super_admin") return p.fahrschule_id ? ["eigen", "gesamt", "buero"] : ["eigen", "buero"];
    if (p.rolle === "fahrschule_admin") return p.faehrt_selbst === true ? ["eigen", "gesamt", "buero"] : ["gesamt", "buero"];
    if (p.rolle === "fahrlehrer") return ["eigen"];
    return []; // unbekannte oder leere Rolle: nichts entscheiden, nie weiterleiten
  }
  function standard(p) { return erlaubt(p)[0] || null; }
  function hatWahl(p) { return erlaubt(p).length > 1; }

  function _alle() {
    try {
      var m = JSON.parse(g.localStorage.getItem(KEY) || "{}");
      return m && typeof m === "object" && !Array.isArray(m) ? m : {};
    } catch (e) { return {}; }
  }
  // Gemerkte Startseite; passt sie nicht (mehr) zur Rolle, gilt die Vorgabe.
  function lesen(p) {
    var e = erlaubt(p);
    if (!e.length) return null;
    var w = p.id ? _alle()[p.id] : null;
    return e.indexOf(w) >= 0 ? w : e[0];
  }
  function setzen(p, wert) {
    if (!p || !p.id || erlaubt(p).indexOf(wert) < 0) return false;
    var m = _alle();
    delete m[p.id];
    m[p.id] = wert; // zuletzt gesetzt steht hinten; die ältesten fallen bei mehr als MAX_KONTEN weg
    var k = Object.keys(m);
    while (k.length > MAX_KONTEN) { delete m[k.shift()]; }
    try { g.localStorage.setItem(KEY, JSON.stringify(m)); return true; } catch (e) { return false; }
  }

  function _aufBuero() { return /\/buero(\.html)?$/.test(g.location.pathname); } // auch /buero ohne Endung (GitHub Pages)
  function _perZurueck() {
    try { var n = g.performance && g.performance.getEntriesByType && g.performance.getEntriesByType("navigation")[0]; return !!(n && n.type === "back_forward"); } catch (e) { return false; }
  }
  function _merke(nach) { try { g.sessionStorage.setItem(WEITER_KEY, JSON.stringify({ nach: nach, t: Date.now() })); } catch (e) { /* ohne Merker weiter */ } }

  // Automatische Weiterleitung beim Start (nach = "buero" oder "app"). Gibt false zurück, wenn nicht weitergeleitet wird:
  // - schon auf der Zielseite (z. B. zeigt der Service Worker offline die App unter der Adresse der Büro-Seite),
  // - die Seite wurde mit „Zurück“/„Vor“ geöffnet,
  // - die andere Seite hat in diesem Tab gerade erst hierher geschickt (Schleife, z. B. alter gespeicherter Stand der Rolle).
  // Würde weiter(nach) jetzt weiterleiten? (ohne Nebenwirkung; die App fragt vorher, um nicht umsonst zu sichern)
  function weiterMoeglich(nach) {
    if (nach !== "buero" && nach !== "app") return false;
    if (nach === "buero" ? _aufBuero() : !_aufBuero()) return false;
    // Mit „Zurück“ (oder „Vor“) hierher gekommen: nicht wieder wegschicken, sonst käme man mit Zurück nie mehr von der
    // anderen Seite weg (Bedienungs-Prüfer W16). Die Seite zeigt sich dann selbst, das nächste Zurück verlässt sie.
    if (_perZurueck()) return false;
    var m = null;
    try { m = JSON.parse(g.sessionStorage.getItem(WEITER_KEY) || "null"); } catch (e) { m = null; }
    // Der Merker bleibt stehen (er verfällt nach SCHLEIFE_MS): läuft der Start zweimal, verweigert auch der zweite Lauf
    if (m && m.nach && m.nach !== nach && Date.now() - (m.t || 0) < SCHLEIFE_MS) return false;
    return true;
  }
  function weiter(nach) {
    if (!weiterMoeglich(nach)) return false;
    _merke(nach);
    g.location.replace(nach === "buero" ? "buero.html" : "index.html");
    return true;
  }
  // Bewusster Wechsel (Tipp in den Einstellungen): ohne Schleifen-Sperre, der Merker gilt für diesen Wechsel.
  function gehe(nach) {
    _merke(nach);
    g.location.replace(nach === "buero" ? "buero.html" : "index.html");
  }

  function _esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function _stil() {
    if (g.document.getElementById("ks-start-stil")) return;
    var st = g.document.createElement("style");
    st.id = "ks-start-stil";
    st.textContent =
      ".ks-start{display:grid;gap:10px;text-align:left;}" +
      ".ks-start .ks-kopf b{display:block;font-size:15px;font-weight:800;color:var(--txt,inherit);}" +
      ".ks-start .ks-kopf span{display:block;font-size:13px;line-height:1.4;color:var(--muted,#5a5a65);margin-top:2px;}" +
      ".ks-start .ks-kopf h4{margin:0;}.ks-start .ks-kopf p{margin:4px 0 0;}" +
      ".ks-start .ks-wahl .ks-hier{grid-column:1;font-size:12px;font-weight:700;color:var(--muted,#5a5a65);}" +
      ".ks-start .ks-wahl[aria-pressed=true] .ks-hier{display:none;}" +
      ".ks-start .ks-liste{display:grid;gap:8px;}" +
      ".ks-start .ks-wahl{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:10px;row-gap:1px;width:100%;box-sizing:border-box;min-height:52px;margin:0;padding:8px 14px;" +
      "border-radius:12px;border:1.5px solid var(--line,#cdcdd5);background:var(--surface,transparent);color:var(--txt,inherit);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;}" +
      ".ks-start .ks-wahl .ks-t{grid-column:1;font-weight:700;font-size:15px;line-height:1.25;}" +
      ".ks-start .ks-wahl .ks-s{grid-column:1;font-size:12.5px;line-height:1.35;color:var(--muted,#5a5a65);}" +
      ".ks-start .ks-wahl .ks-haken{grid-column:2;grid-row:1 / span 3;font-size:12.5px;font-weight:800;color:var(--akzent-bright,var(--akzent,#2f6b47));visibility:hidden;white-space:nowrap;}" +
      ".ks-start .ks-wahl[aria-pressed=true]{border-color:var(--akzent,#2f6b47);box-shadow:inset 0 0 0 1.5px var(--akzent,#2f6b47);}" +
      ".ks-start .ks-wahl[aria-pressed=true] .ks-haken{visibility:visible;}" +
      ".ks-start .ks-wahl:focus-visible{outline:3px solid var(--fokus,var(--akzent,#2f6b47));outline-offset:2px;}" +
      ".ks-start .ks-wahl:disabled{opacity:.6;cursor:default;}" +
      ".ks-start.ks-kompakt .ks-wahl{min-height:44px;padding:6px 12px;}" +
      ".ks-start.ks-kompakt .ks-wahl .ks-t{font-size:14px;}" +
      ".ks-start.ks-kompakt .ks-wahl .ks-haken{grid-row:1 / span 2;}" +
      ".ks-start.ks-kompakt .ks-wahl .ks-t{font-weight:600;}" +
      ".ks-start .ks-meldung{margin:0;font-size:13px;line-height:1.4;color:var(--muted,#5a5a65);}" +
      ".ks-start .ks-meldung:empty{display:none;}";
    (g.document.head || g.document.documentElement).appendChild(st);
  }

  // Zeichnet die Wahl in „kasten“. optionen:
  //   hier:     wo man gerade ist ("eigen", "gesamt" oder "buero"); Vorgabe: auf buero.html "buero", sonst die gemerkte Startseite
  //   wechseln: function(wert) – führt den Wechsel aus (die App wechselt die Ansicht); Vorgabe: zur App bzw. auf der Büro-Seite bleiben
  //   kompakt:  true = ohne Erklärzeilen (Fußzeile der Büro-Seite)
  function einbauen(kasten, profil, optionen) {
    if (!kasten) return false;
    var o = optionen || {};
    var wahl = erlaubt(profil);
    if (wahl.length < 2) { kasten.innerHTML = ""; kasten.hidden = true; return false; }
    _stil();
    var aktuell = lesen(profil);
    // Wo man gerade ist (Design-Prüfung W16): z. B. auf der Büro-Seite, obwohl die Startseite die Fahrlehrer-Ansicht ist
    var hier = o.hier || (_aufBuero() ? "buero" : aktuell);
    var kopfId = "ks-kopf-" + Math.random().toString(36).slice(2, 8);
    kasten.hidden = false;
    kasten.innerHTML = '<div class="ks-start' + (o.kompakt ? " ks-kompakt" : "") + '" role="group" aria-labelledby="' + kopfId + '">' +
      (o.kompakt
        ? '<div class="ks-kopf"><b id="' + kopfId + '">Startseite auf diesem Gerät</b><span>Ein Tipp wechselt sofort.</span></div>'
        : '<div class="ks-kopf"><h4 id="' + kopfId + '">🏠 Startseite</h4><p>Wo der Kompass auf diesem Gerät startet. Ein Tipp wechselt sofort dorthin.</p></div>') +
      '<div class="ks-liste">' + wahl.map(function (w) {
        return '<button type="button" class="ks-wahl" data-ks-start="' + w + '" aria-pressed="' + (w === aktuell) + '">' +
          '<span class="ks-t">' + _esc(TEXTE[w].titel) + "</span>" +
          (o.kompakt ? "" : '<span class="ks-s">' + _esc(TEXTE[w].text) + "</span>") +
          (w === hier ? '<span class="ks-hier">du bist hier</span>' : "") +
          '<span class="ks-haken">✓ Startseite</span></button>';
      }).join("") + "</div>" +
      '<p class="ks-meldung" role="status" aria-live="polite"></p></div>';
    var meldung = kasten.querySelector(".ks-meldung");
    var knoepfe = [].slice.call(kasten.querySelectorAll("[data-ks-start]"));
    var laeuft = false;
    knoepfe.forEach(function (b) {
      b.addEventListener("click", function () {
        if (laeuft) return; // Doppeltipp: der erste Wechsel läuft noch
        var wert = b.getAttribute("data-ks-start");
        var vorher = lesen(profil);
        var markiere = function (w) { knoepfe.forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-ks-start") === w)); }); };
        var gemerkt = setzen(profil, wert);
        markiere(wert);
        meldung.textContent = (gemerkt ? "Startseite: " : "Nicht gemerkt (Gerätespeicher voll): ") + TEXTE[wert].titel + (wert === hier ? (gemerkt ? ". Gemerkt." : ".") : ". Wechsle …");
        if (wert === hier) return;
        laeuft = true;
        knoepfe.forEach(function (x) { x.disabled = true; });
        // wechseln() gibt false zurück, wenn der Wechsel abgebrochen wurde (z. B. ungespeicherte Eingabe): dann gilt die alte Startseite wieder
        var fertig = function (ergebnis) {
          laeuft = false; knoepfe.forEach(function (x) { x.disabled = false; });
          if (ergebnis === false) { setzen(profil, vorher); markiere(vorher); meldung.textContent = "Nicht gewechselt. Startseite bleibt: " + TEXTE[vorher].titel + "."; }
        };
        try {
          var r = typeof o.wechseln === "function" ? o.wechseln(wert) : (wert === "buero" ? (_aufBuero() ? null : gehe("buero")) : gehe("app"));
          if (r && typeof r.then === "function") r.then(fertig, function () { fertig(); }); else fertig(r);
        } catch (e) { fertig(); }
      });
    });
    return true;
  }

  g.KS_START = { erlaubt: erlaubt, standard: standard, hatWahl: hatWahl, lesen: lesen, ziel: lesen, setzen: setzen,
    weiter: weiter, weiterMoeglich: weiterMoeglich, gehe: gehe, einbauen: einbauen, TEXTE: TEXTE, KEY: KEY, WEITER_KEY: WEITER_KEY, bueroNurBueroseite: BUERO_NUR_BUEROSEITE };
})(window);
