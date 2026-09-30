/* Fahrlehrer-Kompass – Live-Quiz „Lernzielkontrolle“: gemeinsame Bausteine für Tafel, Handy und Lehrer-Handy.
   Der Ablauf liegt komplett in Supabase (Tabellen quiz_*). Punkte und Zeiten rechnet nur der Server aus. */

const QUIZ_SUPA_URL = "https://oectrvkjunntzsggyhxv.supabase.co";
const QUIZ_SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RydmtqdW5udHpzZ2d5aHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1ODkyMjYsImV4cCI6MjA5ODE2NTIyNn0.8zmIzvyKh9x_WvykSO9LJczhff_eztl3rSycqmlPHPY";

const Quiz = (() => {
  let supa = null;
  let versatz = 0; // Serverzeit minus Gerätezeit in ms

  function db() {
    if (!supa) {
      supa = window.supabase.createClient(QUIZ_SUPA_URL, QUIZ_SUPA_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 20 } }
      });
    }
    return supa;
  }

  async function rpc(name, args) {
    const { data, error } = await db().rpc(name, args || {});
    if (error) {
      const e = new Error(error.message || "Fehler");
      e.code = (error.message || "").match(/[A-Z_]{5,}/) ? error.message.match(/[A-Z_]{5,}/)[0] : "";
      throw e;
    }
    return data;
  }

  /* Uhr mit dem Server abgleichen (3 Messungen, die mit der kürzesten Laufzeit zählt). */
  async function uhrAbgleichen() {
    let best = null;
    for (let i = 0; i < 3; i++) {
      try {
        const t0 = Date.now();
        const s = await rpc("quiz_zeit");
        const t1 = Date.now();
        const rtt = t1 - t0;
        if (!best || rtt < best.rtt) best = { rtt, v: new Date(s).getTime() - (t0 + rtt / 2) };
      } catch (e) { /* nächster Versuch */ }
    }
    if (best) versatz = best.v;
    else setTimeout(uhrAbgleichen, 5000);
    return versatz;
  }
  const jetzt = () => Date.now() + versatz;

  async function laden(raumId) {
    const [r, s] = await Promise.all([
      db().from("quiz_raeume").select("*").eq("id", raumId).maybeSingle(),
      db().from("quiz_spieler").select("*").eq("raum_id", raumId)
    ]);
    if (r.error) throw r.error;
    if (s.error) throw s.error;
    return { raum: r.data, spieler: s.data || [] };
  }

  /* Hört auf Änderungen am Raum (und auf Wunsch an den Spielern). Realtime für Tempo, Abfrage alle paar Sekunden
     als Netz darunter (z. B. wenn das WLAN kurz weg war). onDaten bekommt immer den vollständigen Stand.
     Handys hören nur auf den Raum (mitSpielern = false), sonst lädt bei 40 Leuten jedes Handy bei jeder Antwort neu. */
  function beobachten(raumId, onDaten, intervallMs, mitSpielern) {
    let aus = false, laeuft = false, nochmal = false;
    async function holen() {
      if (aus) return;
      if (laeuft) { nochmal = true; return; }
      laeuft = true;
      try { const d = await laden(raumId); if (!aus) onDaten(d); }
      catch (e) { /* beim nächsten Mal */ }
      laeuft = false;
      if (nochmal) { nochmal = false; holen(); }
    }
    let t = null;
    const bald = () => { clearTimeout(t); t = setTimeout(holen, 80); };
    let kanal = db().channel("quiz-" + raumId + "-" + Math.random().toString(36).slice(2, 8))
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_raeume", filter: "id=eq." + raumId }, bald);
    if (mitSpielern !== false) {
      kanal = kanal.on("postgres_changes", { event: "*", schema: "public", table: "quiz_spieler", filter: "raum_id=eq." + raumId }, bald);
    }
    kanal.subscribe((status) => { if (status === "SUBSCRIBED") bald(); });
    const timer = setInterval(holen, intervallMs || 3000);
    const sichtbar = () => { if (!document.hidden) { uhrAbgleichen(); holen(); } };
    document.addEventListener("visibilitychange", sichtbar);
    window.addEventListener("online", holen);
    holen();
    return {
      jetzt: holen,
      stop() {
        aus = true; clearInterval(timer); clearTimeout(t);
        document.removeEventListener("visibilitychange", sichtbar);
        window.removeEventListener("online", holen);
        db().removeChannel(kanal);
      }
    };
  }

  /* Rangliste: Punkte, dann schneller bei richtigen Antworten, dann schneller insgesamt, dann wer zuerst drin war.
     So gibt es immer genau einen Sieger. */
  function rangliste(spieler) {
    return spieler.slice().sort((a, b) =>
      (b.punkte - a.punkte) ||
      (a.zeit_richtig_ms - b.zeit_richtig_ms) ||
      (a.zeit_gesamt_ms - b.zeit_gesamt_ms) ||
      (new Date(a.beigetreten) - new Date(b.beigetreten)));
  }

  /* Warum steht a vor b, obwohl gleich viele Punkte? Passt in „… weil Lena ___ war“ und als Kurzhinweis. */
  function gleichstandGrund(a, b) {
    if (!a || !b || a.punkte !== b.punkte) return "";
    if (a.zeit_richtig_ms !== b.zeit_richtig_ms) {
      const d = b.zeit_richtig_ms - a.zeit_richtig_ms;
      return d < 50 ? "hauchdünn schneller" : sek(d) + " s schneller";
    }
    if (a.zeit_gesamt_ms !== b.zeit_gesamt_ms) return "insgesamt schneller";
    return "früher beigetreten";
  }

  const sek = (ms) => (Math.max(0, ms) / 1000).toFixed(1).replace(".", ",");
  const zahl = (n) => Number(n || 0).toLocaleString("de-DE");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Weiche Trennstellen (\u00AD) in langen Wörtern: bricht sauber mit Bindestrich um, statt zu schrumpfen */
  const TRENNUNG = ["Zulassungs|bescheinigung", "Schritt|geschwindigkeit", "Beifahrer|airbag", "Fahrerlaubnis|behörde",
    "Verwarnungs|geld", "Supermarkt|parkplatz", "Nebelschluss|leuchte", "Wäsche|aufhängen", "Radfahr|streifen",
    "Schutz|streifen", "Seiten|streifen", "Vorfahrt|straße", "Vorfahrt|schild", "Fahrrad|verleih", "Rechts|abbieger",
    "ein|geschaltetem", "Straßenverkehrs|system", "Verkehrs|einrichtungen", "Bahn|übergänge", "Verkehrs|teilnehmer",
    "Solokraft|fahrzeuge", "Rahmen|bedingungen", "Kraftfahrt|straße", "Rückhalte|einrichtung"];
  const trennen = (html) => TRENNUNG.reduce((t, w) => t.split(w.replace("|", "")).join(w.replace("|", "\u00AD")), html);

  /* Antwortfarben mit Formen (auch bei Farbschwäche unterscheidbar) */
  const FORMEN = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 22 20H2z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 22 12 12 22 2 12z"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'
  ];
  const BUCHSTABEN = ["A", "B", "C", "D"];

  function lektion(nr) {
    return (window.QUIZ_LEKTIONEN || []).find((l) => l.lektion === Number(nr));
  }

  function seite(datei) {
    return new URL(datei, location.href).href.split("#")[0];
  }

  function qrSvg(text, farbe) {
    const qr = window.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    return farbe ? svg.replace(/fill="black"/g, 'fill="' + farbe + '"').replace(/fill:black/g, "fill:" + farbe) : svg;
  }

  /* ---------- Töne (ohne Dateien, direkt im Browser erzeugt) ---------- */
  const Ton = (() => {
    let ctx = null, an = true;
    try { an = localStorage.getItem("quiz_ton") !== "aus"; } catch (e) {}
    function c() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function ton(freq, start, dauer, typ, laut) {
      const a = c(); if (!a || !an) return;
      const o = a.createOscillator(), g = a.createGain();
      o.type = typ || "sine"; o.frequency.value = freq;
      const t = a.currentTime + (start || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(laut || 0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + dauer + 0.05);
    }
    return {
      get an() { return an; },
      umschalten() { an = !an; try { localStorage.setItem("quiz_ton", an ? "an" : "aus"); } catch (e) {} if (an) c(); return an; },
      wecken() { c(); },
      tick(hoch) { ton(hoch ? 1320 : 880, 0, 0.08, "square", 0.06); },
      beitritt() { ton(660, 0, 0.12, "triangle", 0.12); ton(990, 0.08, 0.16, "triangle", 0.12); },
      start() { [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.09, 0.22, "triangle", 0.15)); },
      aufloesung() { ton(784, 0, 0.18, "sine", 0.2); ton(1175, 0.12, 0.45, "sine", 0.2); },
      richtig() { ton(880, 0, 0.12, "triangle", 0.15); ton(1320, 0.1, 0.3, "triangle", 0.15); },
      falsch() { ton(220, 0, 0.25, "sawtooth", 0.08); ton(165, 0.18, 0.35, "sawtooth", 0.08); },
      trommel(sek) {
        const a = c(); if (!a || !an) return;
        const n = Math.floor((sek || 2.5) / 0.07);
        for (let i = 0; i < n; i++) ton(110 + Math.random() * 30, i * 0.07, 0.06, "square", 0.03 + 0.07 * (i / n));
      },
      fanfare() {
        const f = [[523, 0, .18], [659, .18, .18], [784, .36, .18], [1047, .54, .5], [784, 1.08, .18], [1047, 1.26, .9]];
        f.forEach(([hz, s, d]) => { ton(hz, s, d, "triangle", 0.16); ton(hz / 2, s, d, "sine", 0.08); });
      }
    };
  })();

  /* ---------- Konfetti ---------- */
  function konfetti(dauerMs) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas");
    cv.className = "konfetti";
    document.body.appendChild(cv);
    const g = cv.getContext("2d");
    const farben = ["#e2574c", "#2f7dd1", "#e0a92a", "#3f9c5a", "#f4f1e8", "#c9a227"];
    let w, h;
    const groesse = () => { w = cv.width = innerWidth * devicePixelRatio; h = cv.height = innerHeight * devicePixelRatio; };
    groesse(); addEventListener("resize", groesse);
    const teile = Array.from({ length: Math.min(260, Math.round(innerWidth / 5)) }, () => ({
      x: Math.random() * w, y: -Math.random() * h, r: (4 + Math.random() * 6) * devicePixelRatio,
      vy: (2 + Math.random() * 3) * devicePixelRatio, vx: (Math.random() - .5) * 2 * devicePixelRatio,
      rot: Math.random() * 6, vr: (Math.random() - .5) * .3, f: farben[(Math.random() * farben.length) | 0]
    }));
    const ende = performance.now() + (dauerMs || 6000);
    (function schritt(t) {
      g.clearRect(0, 0, w, h);
      teile.forEach((p) => {
        p.y += p.vy; p.x += p.vx + Math.sin(p.y / 40); p.rot += p.vr;
        if (p.y > h && t < ende) { p.y = -20; p.x = Math.random() * w; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.f;
        g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore();
      });
      if (t < ende + 4000 && cv.isConnected) requestAnimationFrame(schritt);
      else { cv.remove(); removeEventListener("resize", groesse); }
    })(performance.now());
  }

  /* Zahl hochzählen lassen */
  function zaehlen(el, von, bis, ms) {
    const t0 = performance.now();
    (function s(t) {
      const p = Math.min(1, (t - t0) / (ms || 900));
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = zahl(Math.round(von + (bis - von) * e));
      if (p < 1) requestAnimationFrame(s);
    })(t0);
  }

  function fehlertext(e) {
    const c = e && e.code;
    return ({
      RAUM_UNBEKANNT: "Diesen Code gibt es nicht. Schau noch mal auf die Tafel.",
      RAUM_BEENDET: "Dieses Quiz ist schon vorbei.",
      RAUM_VOLL: "Der Raum ist voll.",
      NAME_FEHLT: "Bitte gib deinen Namen ein.",
      ZU_SPAET: "Zu spät – die Zeit ist abgelaufen.",
      ZU_FRUEH: "Noch nicht – gleich geht's los.",
      SPIELER_UNBEKANNT: "Du bist nicht mehr im Raum.",
      KEIN_ZUGRIFF: "Keine Berechtigung für diesen Raum."
    })[c] || "Verbindung hakt – bitte noch einmal versuchen.";
  }

  return { db, rpc, uhrAbgleichen, jetzt, laden, beobachten, rangliste, gleichstandGrund, sek, zahl, esc,
           FORMEN, BUCHSTABEN, trennen, lektion, seite, qrSvg, Ton, konfetti, zaehlen, fehlertext };
})();
