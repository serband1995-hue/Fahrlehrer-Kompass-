/* W23 (27.11.2026, P1.1 „Festigen“): Sync-Punkt – sieht der Fahrlehrer, ob seine Daten in der Cloud und beim Büro angekommen sind?
   Vier Kanäle: „snap“ (der ganze Handy-Stand, Tabelle snapshots) und die drei Brücken zum Büro (Schüler, Termine, Prüfungsergebnisse).
   index.html meldet nur: start / ende / fehlerMerken / offen / ergebnis (einzelne Zeilen) / speicherOk / speicherVoll.
   Hier wird daraus der Punkt oben (grün · gelb · rot), das Fenster mit „Nicht angekommen“ und der Text in den Einstellungen.
   Am Abgleich selbst ändert dieses Modul nichts (außer: nach einem Netzfehler die Brücken erneut anstoßen).
   Keine Schülernamen in Logs: gemerkt werden nur Tabelle, ID, Grund, Zeit. Namen sucht das Fenster beim Anzeigen im eigenen Stand. */
(function () {
  "use strict";
  var KEY = "kompass-sync-v1";
  var KANAELE = ["snap", "schueler", "termine", "pruefungen"];
  var NAMEN = { snap: "Alles auf diesem Handy (Cloud)", schueler: "Schüler", termine: "Termine", pruefungen: "Prüfungsergebnisse" };
  var TABELLE_KANAL = { schueler: "schueler", schueler_privat: "schueler", kalender_termine: "termine", kalender_pruefungen: "pruefungen" };
  /* Gerätespeicher (localStorage): Browser erlauben je Adresse rund 5 Millionen Zeichen (Chrome, Safari, Firefox: ~5 MB).
     Frühe Warnung ab 80 % (4 Mio. Zeichen): Der Stand wächst je Woche nur um wenige zehntausend Zeichen, bei 80 % bleiben also
     noch viele Wochen Zeit – und genug Platz für die Kopie, die beim Speichern kurz zusätzlich entsteht. */
  var GRENZE = 5000000, WARN_AB = 0.8;
  var ROT_NACH_MS = 24 * 3600 * 1000; // so lange darf etwas „warten“ (z. B. offline), danach rot: seit über einem Tag nicht gesichert

  var S = { user: null, letzt: {}, abgelehnt: {}, aus: {} };   // gemerkt (pro Konto)
  var K = {};                                                  // nur zur Laufzeit
  KANAELE.forEach(function (k) { K[k] = { laeuft: 0, offen: false, fehler: null, laufFehler: null, offenSeit: 0, offenAm: 0, startAm: 0 }; });
  var _nr = 0; // Reihenfolge von Speichern und Laufstart (Uhr kann stehen)
  var speicher = { voll: false, nutzung: 0, geprueftAm: 0, nahGemeldet: false };

  function uid() { try { return (typeof _authUser !== "undefined" && _authUser && _authUser.id) || null; } catch (e) { return null; } }
  function laden() {
    var u = uid(); if (S.user === u && S._geladen) return;
    var o = null; try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    S = (o && o.user && o.user === u) ? { user: u, letzt: o.letzt || {}, abgelehnt: o.abgelehnt || {}, aus: o.aus || {} } : { user: u, letzt: {}, abgelehnt: {}, aus: {} };
    S._geladen = true;
  }
  function merken() { if (!S.user) return; try { localStorage.setItem(KEY, JSON.stringify({ user: S.user, letzt: S.letzt, abgelehnt: S.abgelehnt, aus: S.aus })); } catch (e) {} }

  /* ---------- Gründe in einfachen Worten ---------- */
  function kurz(t, n) { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function grund(e) {
    e = e || {}; var msg = String(e.message || e.details || ""), code = String(e.code || "");
    var offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offline) return { art: "netz", text: "Keine Verbindung – wird automatisch gesendet, sobald Internet da ist" };
    if (code === "P0001" && /Zahlung ausstehend/i.test(msg)) return { art: "server", text: "Zahlung ausstehend – das Büro hat gesperrt. Kommt an, sobald das Büro „Bezahlt“ drückt" };
    if (code === "42501" || /row-level security|permission denied/i.test(msg)) return { art: "server", text: "Keine Berechtigung – der Eintrag gehört wohl inzwischen einem anderen Fahrlehrer (vom Büro verschoben)" };
    if (/JWT|token|not authenticated|401/i.test(msg) || code === "401" || code === "PGRST301" || code === "PGRST303") return { art: "server", text: "Anmeldung abgelaufen – bitte einmal ab- und wieder anmelden (vorher Internet an)" };
    if (/zeitlimit|timeout|timed out/i.test(msg)) return { art: "netz", text: "Verbindung zu langsam – wird gleich erneut versucht" };
    if (!code && (!msg || /fetch|network|load failed|netzwerk/i.test(msg))) return { art: "netz", text: "Keine Verbindung – wird automatisch erneut gesendet" };
    if (/^5\d\d$/.test(code) || /^PGRST0/.test(code)) return { art: "netz", text: "Server gerade nicht erreichbar – wird erneut versucht" };
    if (code === "23505") return { art: "server", text: "Vom Server abgelehnt: gibt es dort schon (doppelt)" };
    if (code === "23503") return { art: "server", text: "Vom Server abgelehnt: gehört zu einem Schüler, den der Server nicht kennt" };
    if (code === "23502" || code === "23514" || /^22/.test(code)) return { art: "server", text: "Vom Server abgelehnt: Angaben unvollständig oder ungültig" };
    if (/Nur Fahrschule-Admin/i.test(msg)) return { art: "server", text: "Nur das Büro darf Schüler einem anderen Fahrlehrer geben – bitte im Büro klären" };
    // Eigene Server-Meldungen: der verständliche Satz steht im Hinweis (z. B. W21-Prüfungsfenster), sonst die Meldung selbst
    if (code === "P0001" && (e.hint || msg)) return { art: "server", text: "Vom Server abgelehnt: " + kurz(e.hint && /^W\d+:/.test(msg) || e.hint && !msg ? e.hint : (e.hint ? msg + " – " + e.hint : msg), 140) };
    return { art: "server", text: "Vom Server abgelehnt" + (code ? " (Fehler " + kurz(code, 12) + ")" : "") };
  }

  /* ---------- Meldungen aus index.html ---------- */
  function start(k) { if (!K[k]) return; laden(); if (!K[k].laeuft) { K[k].laufFehler = null; K[k].startAm = ++_nr; } K[k].laeuft++; zeichnen(); }
  function fehlerMerken(k, e, g) { if (!K[k]) return; K[k].laufFehler = g || grund(e); if (!K[k].laeuft) { K[k].fehler = K[k].laufFehler; K[k].laufFehler = null; zeichnen(); } }
  function wartet(k, text) { fehlerMerken(k, null, { art: "wartet", text: text }); }
  // ok: true = angekommen (oder nichts zu tun), false = nicht (Grund aus fehlerMerken, sonst „wartet“)
  function ende(k, ok) {
    if (!K[k]) return; laden();
    K[k].laeuft = Math.max(0, K[k].laeuft - 1); if (K[k].laeuft) return;
    var f = K[k].laufFehler; K[k].laufFehler = null;
    // offen bleibt, wenn nach dem Start dieses Laufs neu gespeichert wurde (der nächste Lauf kommt gleich)
    if (ok && !f) { K[k].fehler = null; if (!(K[k].offenAm > K[k].startAm)) { K[k].offen = false; K[k].offenSeit = 0; } S.letzt[k] = Date.now(); merken(); }
    else { K[k].fehler = f || { art: "wartet", text: "Noch nicht gesendet – wird erneut versucht" }; if (!K[k].offenSeit) K[k].offenSeit = Date.now(); }
    zeichnen();
  }
  function offen(k) { if (!K[k]) return; K[k].offen = true; K[k].offenAm = ++_nr; if (!K[k].offenSeit) K[k].offenSeit = Date.now(); zeichnen(); }
  function zeileWert(r) { var o = {}; Object.keys(r || {}).forEach(function (x) { if (x !== "aktualisiert_am") o[x] = r[x]; }); try { return typeof _abglWert === "function" ? _abglWert(o) : JSON.stringify(o).length + ""; } catch (e) { return ""; } }
  // Ergebnis eines Schreibvorgangs je Zeile: angekommene IDs und abgelehnte [{row, error}]
  function ergebnis(tabelle, okIds, abgelehnt) {
    laden(); var geaendert = false;
    (okIds || []).forEach(function (id) { var key = tabelle + ":" + id; if (S.abgelehnt[key] || S.aus[key]) { delete S.abgelehnt[key]; delete S.aus[key]; geaendert = true; } });
    (abgelehnt || []).forEach(function (a) {
      var id = a.id, key = tabelle + ":" + id, g = grund(a.error), w = zeileWert(a.row);
      if (g.art === "netz") return; // kein Ablehnen, sondern Netz: zählt beim Kanal
      if (S.aus[key] && S.aus[key] !== w) delete S.aus[key]; // geändert seit dem Ausblenden: wieder zeigen
      var alt = S.abgelehnt[key];
      S.abgelehnt[key] = { t: tabelle, id: id, grund: g.text, code: String((a.error && a.error.code) || ""), seit: alt ? alt.seit : Date.now(), w: w };
      geaendert = true;
    });
    if (geaendert) { merken(); zeichnen(); }
  }
  function ausblenden(key) { laden(); var a = S.abgelehnt[key]; if (!a) return; S.aus[key] = a.w || "x"; merken(); zeichnen(); }
  function speicherVoll() { speicher.voll = true; zeichnen(); }
  // Nach erfolgreichem Schreiben: Belegung schätzen (höchstens alle 30 s, alle Einträge dieser Adresse zusammen)
  function speicherOk(zeichen) {
    var warVoll = speicher.voll; speicher.voll = false;
    var jetzt = Date.now();
    if (warVoll || !speicher.geprueftAm || jetzt - speicher.geprueftAm > 30000) {
      speicher.geprueftAm = jetzt;
      var n = 0; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i) || ""; n += k.length + (localStorage.getItem(k) || "").length; } } catch (e) { n = zeichen || 0; }
      speicher.nutzung = n;
      if (n >= GRENZE * WARN_AB && !speicher.nahGemeldet) { speicher.nahGemeldet = true; try { if (typeof toast === "function") toast("⚠ Gerätespeicher fast voll – tippe oben auf den Punkt"); } catch (e) {} }
    }
    if (warVoll || speicherNah()) zeichnen();
  }
  function speicherNah() { return speicher.nutzung >= GRENZE * WARN_AB; }

  /* ---------- Zustand ---------- */
  function aktiv() {
    try { return !!uid() && !(typeof _ohneEigenenStand === "function" && _ohneEigenenStand()) && !(typeof _fsAgg !== "undefined" && _fsAgg); } catch (e) { return false; }
  }
  function brueckenAktiv() { try { return !!(typeof _authProfile !== "undefined" && _authProfile && _authProfile.fahrschule_id); } catch (e) { return false; } }
  function kanaele() { return brueckenAktiv() ? KANAELE : ["snap"]; }
  // Abgelehnte Zeilen, die es auf dem Gerät noch gibt (gelöscht = erledigt) und die nicht ausgeblendet sind
  function eintragVon(a) {
    var P = null; try { P = typeof _persoenlicheDaten === "function" ? _persoenlicheDaten() : (typeof DB !== "undefined" ? DB : null); } catch (e) {}
    if (!P) return undefined; // unbekannt: nicht aufräumen
    var liste = a.t === "kalender_termine" ? P.lessons : a.t === "kalender_pruefungen" ? P.exams : P.students;
    if (!Array.isArray(liste)) return undefined;
    for (var i = 0; i < liste.length; i++) if (liste[i] && liste[i].id === a.id) return liste[i]; // schueler_privat: ID = Schüler-ID
    return null;
  }
  function abgelehnteListe() {
    laden(); var out = [], weg = false;
    Object.keys(S.abgelehnt).forEach(function (key) {
      var a = S.abgelehnt[key], e = eintragVon(a);
      if (e === null) { delete S.abgelehnt[key]; delete S.aus[key]; weg = true; return; }
      if (S.aus[key] && S.aus[key] === a.w) return;
      out.push({ key: key, a: a, e: e });
    });
    if (weg) merken();
    return out.sort(function (x, y) { return (x.a.seit || 0) - (y.a.seit || 0); });
  }
  function zustand() {
    laden();
    var ks = kanaele(), jetzt = Date.now(), gruende = [];
    var abg = abgelehnteListe();
    var rot = false, gelb = false;
    if (speicher.voll) { rot = true; gruende.push("Gerätespeicher voll"); }
    if (abg.length) { rot = true; gruende.push(abg.length === 1 ? "1 Eintrag ist nicht angekommen" : abg.length + " Einträge sind nicht angekommen"); }
    ks.forEach(function (k) {
      var c = K[k];
      if (c.fehler && c.fehler.art === "server") { rot = true; gruende.push(NAMEN[k] + ": " + c.fehler.text); return; }
      if (c.fehler || c.offen || c.laeuft) {
        gelb = true;
        if ((c.fehler || c.offen) && c.offenSeit && jetzt - c.offenSeit > ROT_NACH_MS) { rot = true; gruende.push(NAMEN[k] + ": seit über einem Tag nicht gesichert"); }
        else if (c.fehler) gruende.push(NAMEN[k] + ": " + c.fehler.text);
      }
    });
    if (!rot && speicherNah()) { gelb = true; gruende.push("Gerätespeicher fast voll"); }
    return { farbe: rot ? "rot" : gelb ? "gelb" : "gruen", gruende: gruende, abgelehnt: abg, kanaele: ks };
  }
  function zeit(ts) {
    if (!ts) return null;
    var d = new Date(ts), h = new Date();
    var hm = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === h.toDateString()) return "um " + hm;
    return "am " + d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + " um " + hm;
  }
  function letzteZeit() { laden(); var m = 0; kanaele().forEach(function (k) { if (S.letzt[k] && (!m || S.letzt[k] < m)) m = S.letzt[k]; }); return m; }
  function kurztext() {
    var z = zustand();
    if (z.farbe === "gruen") { var t = zeit(S.letzt.snap); return "Alles in der Cloud und beim Büro angekommen" + (t ? " – zuletzt gesichert " + t : "") + "."; }
    if (z.farbe === "gelb") return z.gruende.length ? "Wartet: " + z.gruende[0] + "." : "Wird gerade gesendet …";
    return "Nicht alles angekommen: " + (z.gruende[0] || "bitte nachsehen") + ". Tippe hier für Einzelheiten.";
  }

  /* ---------- Anzeige ---------- */
  var TITEL = { gruen: "Alles angekommen", gelb: "Wird gesendet oder wartet", rot: "Nicht alles angekommen" };
  function knopf() { return document.getElementById("syncBtn"); }
  var _zeichnenGeplant = false;
  function zeichnen() {
    if (_zeichnenGeplant) return; _zeichnenGeplant = true;
    var f = function () { _zeichnenGeplant = false; try { jetztZeichnen(); } catch (e) {} };
    if (typeof requestAnimationFrame === "function" && !document.hidden) requestAnimationFrame(f); else setTimeout(f, 0);
  }
  function jetztZeichnen() {
    var b = knopf(); var an = aktiv();
    var z = an ? zustand() : null;
    if (b) {
      b.hidden = !an;
      if (an) {
        b.setAttribute("data-sync", z.farbe);
        var lbl = "Datensicherung: " + TITEL[z.farbe] + (z.gruende.length ? " – " + z.gruende[0] : "") + ". Tippen für Einzelheiten.";
        b.setAttribute("aria-label", lbl); b.title = TITEL[z.farbe];
      }
    }
    var ts = document.querySelectorAll("[data-sync-text]");
    for (var i = 0; i < ts.length; i++) { ts[i].textContent = an ? kurztext() : ""; if (z) (ts[i].closest("[data-sync-oeffnen]") || ts[i]).setAttribute("data-sync", z.farbe); }
    var fen = document.getElementById("syncFenster");
    if (fen && an) fen.innerHTML = fensterInhalt(z);
  }
  function e(s) { return typeof esc === "function" ? esc(s) : String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function datumDE(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." : ""; }
  function schuelerName(sid) { try { var P = typeof _persoenlicheDaten === "function" ? _persoenlicheDaten() : DB; var s = (P.students || []).find(function (x) { return x && x.id === sid; }); return s ? s.name || "" : ""; } catch (x) { return ""; } }
  function bezeichnung(a, eintrag) {
    var x = eintrag || {};
    if (a.t === "kalender_termine") { var n = schuelerName(x.sid); return "Termin am " + datumDE(x.date) + (x.von ? " um " + x.von : "") + (n ? " · " + n : ""); }
    if (a.t === "kalender_pruefungen") { var n2 = schuelerName(x.sid); return "Prüfungsergebnis" + (x.date ? " vom " + datumDE(x.date) : "") + (n2 ? " · " + n2 : ""); }
    if (a.t === "schueler_privat") return "Fragebogen" + (x.name ? " · " + x.name : "");
    return "Schüler" + (x.name ? " · " + x.name : "");
  }
  // W23 (Design-Kritik): hat ein Kanal abgelehnte Einträge, ist er rot – nie „angekommen“
  function kanalZeile(k, abg) {
    var c = K[k], t = zeit(S.letzt[k]);
    var n = (abg || []).filter(function (x) { return TABELLE_KANAL[x.a.t] === k; }).length;
    var stand = c.laeuft ? "wird gerade gesendet …" : c.fehler ? (c.fehler.art === "server" ? "nicht angekommen" : c.fehler.art === "netz" ? "wartet auf Internet" : "wartet") : n ? (n === 1 ? "1 Eintrag nicht angekommen" : n + " Einträge nicht angekommen") : c.offen ? "wird gleich gesendet" : "angekommen";
    var farbe = (c.fehler && c.fehler.art === "server") || n ? "rot" : (c.laeuft || c.fehler || c.offen) ? "gelb" : "gruen";
    return '<li class="sync-kanal" data-kanal="' + k + '" data-sync="' + farbe + '"><span class="sync-mini" aria-hidden="true"></span><span class="sync-k-txt"><b>' + e(NAMEN[k]) + "</b><br><small>" +
      (t ? "Zuletzt gesichert " + e(t) : "Noch nicht gesichert") + " · " + e(stand) + "</small></span></li>";
  }
  function fensterInhalt(z) {
    var ks = z.kanaele, h = "";
    h += '<p class="sync-kopf" data-sync="' + z.farbe + '"><span class="sync-mini" aria-hidden="true"></span><b>' + e(TITEL[z.farbe]) + "</b></p>";
    // Nicht angekommen: abgelehnte Einträge + Kanäle mit Fehler – steht direkt unter dem Kopf, wenn etwas fehlt
    var liste = [];
    z.abgelehnt.forEach(function (x) {
      liste.push('<li class="sync-nicht" data-abgelehnt="' + e(x.key) + '"><div><b>' + e(bezeichnung(x.a, x.e)) + "</b><br><small>" + e(x.a.grund) + "</small></div>" +
        '<button type="button" class="btn btn-ghost sync-aus" data-sync-aus="' + e(x.key) + '">Ausblenden</button></li>');
    });
    ks.forEach(function (k) { var c = K[k]; if (c.fehler) liste.push('<li class="sync-nicht" data-kanal-fehler="' + k + '"><div><b>' + e(NAMEN[k]) + "</b><br><small>" + e(c.fehler.text) + "</small></div></li>"); });
    var nicht = '<div class="sync-abschnitt"><b>Nicht angekommen</b>';
    nicht += liste.length ? '<ul class="sync-liste">' + liste.join("") + "</ul>" : '<p class="muted-p">Nichts – alles ist angekommen oder wird gerade gesendet.</p>';
    if (z.abgelehnt.length) nicht += '<p class="muted-p sync-klein">„Ausblenden“ nimmt den Eintrag nur aus dieser Liste. Er bleibt auf deinem Handy und wird bei jedem Speichern erneut gesendet.</p>';
    nicht += "</div>";
    var kan = '<ul class="sync-kanaele">' + ks.map(function (k) { return kanalZeile(k, z.abgelehnt); }).join("") + "</ul>";
    h += liste.length ? nicht + '<div class="sync-abschnitt">' + kan + "</div>" : kan + nicht;
    // Gerätespeicher
    var pz = speicher.nutzung ? Math.min(100, Math.round(speicher.nutzung / GRENZE * 100)) : null;
    if (speicher.voll) h += '<div class="sync-warn" data-sync="rot" role="alert"><b>Gerätespeicher voll</b><p>Neue Änderungen passen nicht mehr in den Speicher dieser App auf dem Handy. Sie werden nur noch in der Cloud gesichert – aber nur, solange Internet da ist.</p><p><b>Was tun:</b> Internet anlassen, bis der Punkt oben grün ist. <b>Nicht abmelden</b> und die App nicht neu installieren. Gib dem Büro Bescheid, damit wir Platz schaffen.</p></div>';
    else if (speicherNah()) h += '<div class="sync-warn" data-sync="gelb" role="status"><b>Gerätespeicher fast voll (' + pz + ' %)</b><p>Noch geht alles. Bitte Internet regelmäßig anlassen und dem Büro Bescheid geben, damit wir rechtzeitig Platz schaffen.</p></div>';
    else if (pz !== null) h += '<p class="muted-p sync-klein">Gerätespeicher: ' + pz + " % belegt.</p>";
    h += '<div class="btn-row"><button type="button" class="btn btn-ghost" id="syncZu" style="flex:0;padding:13px 18px;">Schließen</button><button type="button" class="btn btn-primary" id="syncJetzt">Jetzt erneut senden</button></div>';
    return h;
  }
  function fensterOeffnen() {
    if (!aktiv() || typeof openSheet !== "function") return;
    openSheet('<div class="sheet-h">Datensicherung</div><div id="syncFenster">' + fensterInhalt(zustand()) + "</div>");
  }
  var _sendetBis = 0;
  function jetztSenden() {
    if (Date.now() < _sendetBis) return; _sendetBis = Date.now() + 3000; // Doppeltipp: nicht zweimal senden
    try { if (typeof pushToCloud === "function") pushToCloud(); } catch (x) {}
    try { if (typeof _brueckenSofort === "function") _brueckenSofort(); } catch (x) {}
    zeichnen();
  }
  // Brücken laufen nur beim Speichern: nach einem Netzfehler hier erneut anstoßen (nicht bei Ablehnung durch den Server)
  function nachholen() {
    if (!aktiv() || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    var brauchts = ["schueler", "termine", "pruefungen"].some(function (k) { return K[k].fehler && K[k].fehler.art === "netz" && !K[k].laeuft; }); // nur Netz: „wartet“ holt sich selbst nach, Ablehnungen nicht jede Minute
    if (brauchts) try { if (typeof _brueckenSofort === "function") _brueckenSofort(); } catch (x) {}
  }
  if (typeof document !== "undefined") {
    document.addEventListener("click", function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null; if (!t) return;
      if (t.closest("#syncBtn") || t.closest("[data-sync-oeffnen]")) { fensterOeffnen(); return; }
      if (t.closest("#syncJetzt")) { jetztSenden(); return; }
      if (t.closest("#syncZu")) { try { closeSheet(); } catch (x) {} return; }
      var aus = t.closest("[data-sync-aus]"); if (aus) ausblenden(aus.getAttribute("data-sync-aus"));
    });
    window.addEventListener("online", function () { try { if (aktiv() && typeof pushToCloud === "function") pushToCloud(); } catch (x) {} nachholen(); zeichnen(); });
    window.addEventListener("offline", zeichnen);
    // Zurück in der App: abgelehnte Einträge noch einmal senden (z. B. hat das Büro inzwischen „Bezahlt“ gedrückt)
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || !aktiv() || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
      try { if (abgelehnteListe().length && typeof _brueckenSofort === "function") _brueckenSofort(); } catch (x) {}
    });
    setInterval(function () { nachholen(); zeichnen(); }, 60000);
  }
  // Nach dem Abmelden: zur Laufzeit alles vergessen (der gemerkte Stand wird mit den übrigen Kontodaten gelöscht)
  function vergessen() { S = { user: null, letzt: {}, abgelehnt: {}, aus: {} }; KANAELE.forEach(function (k) { K[k] = { laeuft: 0, offen: false, fehler: null, laufFehler: null, offenSeit: 0, offenAm: 0, startAm: 0 }; }); speicher.voll = false; zeichnen(); }

  var api = { KEY: KEY, GRENZE: GRENZE, WARN_AB: WARN_AB, start: start, ende: ende, fehlerMerken: fehlerMerken, wartet: wartet, offen: offen, ergebnis: ergebnis,
    ausblenden: ausblenden, speicherOk: speicherOk, speicherVoll: speicherVoll, zustand: zustand, kurztext: kurztext, grund: grund, zeichnen: zeichnen,
    fensterOeffnen: fensterOeffnen, jetztSenden: jetztSenden, vergessen: vergessen, kanalVon: function (t) { return TABELLE_KANAL[t] || null; },
    _intern: function () { return { S: S, K: K, speicher: speicher }; } };
  if (typeof window !== "undefined") window.SYNC = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
