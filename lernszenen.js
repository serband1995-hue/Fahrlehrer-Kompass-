/* ============================================================================
   Fahrlehrer-Kompass · Lernszenen
   Animierte Verkehrssituationen zum Vorführen, Mitdenken und Selbst-Fahren.

   Welt in Metern: x = Fahrtrichtung der Autobahn (nach rechts im Bild),
   y = quer dazu (positiv = rechts in Fahrtrichtung), z = Höhe.
   Rechtsverkehr: Fahrstreifen von links nach rechts = kleinere nach größere y.

   Öffentliche Schnittstelle: window.Lernszenen.open({ onClose }) öffnet die
   Szenenauswahl als Vollbild über der App. Nichts wird gespeichert oder
   hochgeladen - die Szenen sind reine Lernhilfen.
   ============================================================================ */
(function () {
  "use strict";

  // ---------------------------------------------------------------- Grundlagen
  const W = 3.75;            // Fahrstreifenbreite Autobahn (RAA: 3,50–3,75 m)
  const KMH = 3.6;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Polylinie mit kumulierten Längen: Position und Richtung an beliebiger Strecke s
  function pfad(punkte) {
    const pts = punkte.map(p => ({ x: p[0], y: p[1] }));
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    return {
      pts, acc, laenge: acc[acc.length - 1],
      an(s) {
        s = clamp(s, 0, this.laenge);
        let lo = 0, hi = acc.length - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
        const seg = acc[hi] - acc[lo] || 1, t = (s - acc[lo]) / seg;
        const a = pts[lo], b = pts[hi];
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), h: Math.atan2(b.y - a.y, b.x - a.x) };
      },
      // Strecke s zum Punkt mit der x-Koordinate (für geradeaus laufende Pfade)
      sBeiX(x) { for (let i = 1; i < pts.length; i++) if (pts[i].x >= x) { const a = pts[i - 1], b = pts[i]; const t = (x - a.x) / ((b.x - a.x) || 1); return lerp(acc[i - 1], acc[i], clamp(t, 0, 1)); } return this.laenge; }
    };
  }
  // Fahrstreifen-Pfad entlang x mit weichen Fahrstreifenwechseln: wechsel=[{x, y, laenge}]
  function spurPfad(x0, x1, y0, wechsel, schritt) {
    schritt = schritt || 2; const out = [];
    const w = (wechsel || []).slice().sort((a, b) => a.x - b.x);
    for (let x = x0; x <= x1 + 1e-6; x += schritt) {
      let y = y0, yAkt = y0;
      for (const c of w) { const t = (x - c.x) / c.laenge; y = lerp(yAkt, c.y, smooth(t)); if (x >= c.x + c.laenge) yAkt = c.y; else break; }
      out.push([x, y]);
    }
    return out;
  }
  function bezier(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }
  // Seitlich versetzte Linie (für Fahrbahnränder einer Kurve)
  function versatz(punkte, d) {
    return punkte.map((p, i) => {
      const a = punkte[Math.max(0, i - 1)], b = punkte[Math.min(punkte.length - 1, i + 1)];
      const h = Math.atan2(b[1] - a[1], b[0] - a[0]);
      return [p[0] - Math.sin(h) * d, p[1] + Math.cos(h) * d];
    });
  }
  // Band zwischen zwei Linien als Polygon
  const band = (links, rechts) => links.concat(rechts.slice().reverse());

  // Tempo-Profil: [[t, km/h], ...] -> Strecke s(t) (lineare Geschwindigkeit, exakt integriert)
  function tempoProfil(keys) {
    const k = keys.map(([t, v]) => [t, v / KMH]);
    return {
      v(t) { if (t <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (t - k[i - 1][0]) / ((k[i][0] - k[i - 1][0]) || 1)); return k[k.length - 1][1]; },
      s(t) {
        let s = 0;
        if (t <= k[0][0]) return k[0][1] * (t - k[0][0]);
        for (let i = 1; i < k.length; i++) {
          const t0 = k[i - 1][0], t1 = k[i][0], v0 = k[i - 1][1], v1 = k[i][1];
          if (t >= t1) { s += (v0 + v1) / 2 * (t1 - t0); continue; }
          const vt = lerp(v0, v1, (t - t0) / ((t1 - t0) || 1)); s += (v0 + vt) / 2 * (t - t0); return s;
        }
        return s + k[k.length - 1][1] * (t - k[k.length - 1][0]);
      }
    };
  }
  const aktivIn = (liste, t) => (liste || []).find(e => t >= e.von && t < e.bis) || null;

  // ------------------------------------------------------------- Verkehrszeichen
  // Werden einmal als Bild gezeichnet und in beiden Ansichten verwendet.
  const SCHILD_BILD = {};
  function schildBild(typ) {
    if (SCHILD_BILD[typ]) return SCHILD_BILD[typ];
    const c = document.createElement("canvas"); const S = 128; c.width = S; c.height = S;
    const g = c.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle";
    const blau = "#1f5fa8", PI8 = Math.PI / 8;
    const rund = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    if (typ === "z330") { // Autobahn
      rund(6, 6, 116, 116, 12); g.fillStyle = blau; g.fill(); g.lineWidth = 5; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#fff"; g.beginPath(); g.moveTo(64, 26); g.lineTo(56, 26); g.lineTo(30, 104); g.lineTo(52, 104); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(64, 26); g.lineTo(72, 26); g.lineTo(98, 104); g.lineTo(76, 104); g.closePath(); g.fill();
      g.fillStyle = blau; g.fillRect(62, 34, 4, 70); g.fillStyle = "#fff"; g.fillRect(40, 56, 48, 7);
    } else if (typ === "z331") { // Kraftfahrstraße (nicht verwendet, Reserve)
      rund(6, 6, 116, 116, 12); g.fillStyle = blau; g.fill();
    } else if (typ === "z332") { // Ausfahrttafel
      rund(4, 24, 120, 80, 10); g.fillStyle = blau; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 22px sans-serif"; g.fillText("Ausfahrt", 64, 50);
      g.lineWidth = 6; g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(40, 88); g.lineTo(88, 70); g.stroke();
      g.beginPath(); g.moveTo(90, 69); g.lineTo(76, 66); g.lineTo(82, 80); g.closePath(); g.fillStyle = "#fff"; g.fill();
    } else if (typ === "z333") { // Pfeilzeichen Ausfahrt
      rund(10, 10, 108, 108, 10); g.fillStyle = blau; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 17px sans-serif"; g.fillText("Ausfahrt", 64, 34);
      g.lineWidth = 9; g.beginPath(); g.moveTo(40, 100); g.lineTo(84, 58); g.stroke();
      g.beginPath(); g.moveTo(94, 48); g.lineTo(64, 54); g.lineTo(88, 78); g.closePath(); g.fill();
    } else if (typ === "z450_3" || typ === "z450_2" || typ === "z450_1") { // Ankündigungsbaken
      const n = +typ.slice(-1); g.fillStyle = "#fff"; g.fillRect(34, 4, 60, 120); g.strokeStyle = "#999"; g.lineWidth = 2; g.strokeRect(34, 4, 60, 120);
      g.save(); g.beginPath(); g.rect(34, 4, 60, 120); g.clip(); g.strokeStyle = "#d4202a"; g.lineWidth = 12;
      for (let i = 0; i < n; i++) { const y = 26 + i * 34; g.beginPath(); g.moveTo(30, y + 26); g.lineTo(98, y - 8); g.stroke(); }
      g.restore();
    } else if (typ === "vorweg") { // Vorwegweiser Ausfahrt (vereinfachte Darstellung)
      rund(2, 18, 124, 92, 8); g.fillStyle = blau; g.fill(); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 19px sans-serif"; g.fillText("Musterstadt", 64, 46);
      g.font = "bold 22px sans-serif"; g.fillText("1000 m", 64, 82);
    } else if (typ === "weg") {
      rund(2, 18, 124, 92, 8); g.fillStyle = blau; g.fill(); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke();
      g.fillStyle = "#fff"; g.font = "bold 19px sans-serif"; g.fillText("Musterstadt", 64, 46);
      g.font = "bold 22px sans-serif"; g.fillText("500 m", 64, 82);
    } else if (typ.startsWith("z274_")) { // zulässige Höchstgeschwindigkeit
      g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 14; g.strokeStyle = "#d4202a"; g.stroke();
      g.fillStyle = "#111"; g.font = "bold 46px sans-serif"; g.fillText(typ.slice(5), 64, 67);
    } else if (typ === "z224") {                                   // Haltestelle
      g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fillStyle = "#f4c800"; g.fill(); g.lineWidth = 10; g.strokeStyle = "#1f8a4c"; g.stroke();
      g.fillStyle = "#1f8a4c"; g.font = "bold 64px sans-serif"; g.fillText("H", 64, 68);
    } else if (typ === "z276" || typ === "z280") {                 // Überholverbot / Ende
      const ende = typ === "z280";
      g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fillStyle = "#fff"; g.fill(); g.lineWidth = ende ? 4 : 14; g.strokeStyle = ende ? "#333" : "#d4202a"; g.stroke();
      const auto = (x, farbe) => { g.fillStyle = farbe; rund(x - 13, 40, 26, 50, 7); g.fill(); g.fillStyle = "#fff"; g.fillRect(x - 9, 48, 18, 10); g.fillStyle = farbe; g.fillRect(x - 15, 60, 3, 10); g.fillRect(x + 12, 60, 3, 10); };
      auto(46, ende ? "#8a8a8a" : "#d4202a"); auto(82, ende ? "#8a8a8a" : "#111");
      if (ende) { g.strokeStyle = "#333"; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(26 + i * 6, 108 + i * 6); g.lineTo(102 + i * 6, 20 + i * 6); g.stroke(); } }
    } else if (typ === "zone30") {                                  // Zeichen 274.1 Tempo-30-Zone
      rund(10, 4, 108, 120, 8); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#222"; g.stroke();
      g.beginPath(); g.arc(64, 52, 36, 0, 7); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 9; g.strokeStyle = "#d4202a"; g.stroke();
      g.fillStyle = "#111"; g.font = "bold 32px sans-serif"; g.fillText("30", 64, 54); g.font = "bold 22px sans-serif"; g.fillText("ZONE", 64, 108);
    } else if (typ === "z205") {                                   // Vorfahrt gewähren
      g.beginPath(); g.moveTo(8, 14); g.lineTo(120, 14); g.lineTo(64, 118); g.closePath(); g.fillStyle = "#d4202a"; g.fill();
      g.beginPath(); g.moveTo(28, 26); g.lineTo(100, 26); g.lineTo(64, 94); g.closePath(); g.fillStyle = "#fff"; g.fill();
    } else if (typ === "z206") {                                   // Halt! Vorfahrt gewähren
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = PI8 * (2 * i + 1); g.lineTo(64 + 58 * Math.cos(a), 64 + 58 * Math.sin(a)); } g.closePath(); g.fillStyle = "#fff"; g.fill();
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = PI8 * (2 * i + 1); g.lineTo(64 + 53 * Math.cos(a), 64 + 53 * Math.sin(a)); } g.closePath(); g.fillStyle = "#c8202a"; g.fill();
      g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.fillText("STOP", 64, 66);
    } else if (typ === "z215") {                                   // Kreisverkehr
      g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fillStyle = blau; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      g.strokeStyle = "#fff"; g.lineWidth = 9; g.fillStyle = "#fff";
      for (let i = 0; i < 3; i++) { const a0 = -Math.PI / 2 + i * 2 * Math.PI / 3; g.beginPath(); g.arc(64, 64, 30, a0 + 0.35, a0 + 1.6); g.stroke(); const a1 = a0 + 0.35, px = 64 + 30 * Math.cos(a1), py = 64 + 30 * Math.sin(a1); g.beginPath(); g.moveTo(px + 12 * Math.cos(a1), py + 12 * Math.sin(a1)); g.lineTo(px - 12 * Math.cos(a1), py - 12 * Math.sin(a1)); g.lineTo(px + 14 * Math.sin(a1), py - 14 * Math.cos(a1)); g.closePath(); g.fill(); }
    } else if (typ === "z306") {                                   // Vorfahrtstraße
      g.save(); g.translate(64, 64); g.rotate(Math.PI / 4); g.fillStyle = "#fff"; g.fillRect(-42, -42, 84, 84); g.strokeStyle = "#333"; g.lineWidth = 2; g.strokeRect(-42, -42, 84, 84); g.fillStyle = "#f4c800"; g.fillRect(-28, -28, 56, 56); g.restore();
    } else if (typ === "z350") {                                   // Fußgängerüberweg
      rund(8, 8, 112, 112, 10); g.fillStyle = blau; g.fill(); g.lineWidth = 4; g.strokeStyle = "#fff"; g.stroke();
      g.beginPath(); g.moveTo(64, 18); g.lineTo(110, 104); g.lineTo(18, 104); g.closePath(); g.fillStyle = "#fff"; g.fill();
      g.fillStyle = "#111"; for (let i = 0; i < 4; i++) g.fillRect(34 + i * 16, 92, 9, 6);
      g.beginPath(); g.arc(66, 44, 6, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = "#111"; g.lineCap = "round";
      g.beginPath(); g.moveTo(65, 52); g.lineTo(61, 70); g.lineTo(52, 86); g.moveTo(61, 70); g.lineTo(70, 78); g.lineTo(72, 88); g.moveTo(64, 56); g.lineTo(54, 64); g.moveTo(64, 56); g.lineTo(74, 64); g.stroke();
    } else if (typ === "z531") { // Einengungstafel: rechter Fahrstreifen endet
      rund(6, 6, 116, 116, 10); g.fillStyle = "#f4c800"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#333"; g.stroke();
      g.fillStyle = "#111"; g.fillRect(34, 22, 12, 88); g.beginPath(); g.moveTo(74, 110); g.lineTo(86, 110); g.lineTo(86, 64); g.quadraticCurveTo(86, 46, 58, 34); g.lineTo(58, 22); g.lineTo(46, 40); g.lineTo(58, 56); g.lineTo(58, 44); g.quadraticCurveTo(74, 52, 74, 64); g.closePath(); g.fill();
    }
    SCHILD_BILD[typ] = c; return c;
  }
  const SCHILD_NAME = {
    z330: "Zeichen 330.1 · Autobahn", z332: "Zeichen 332 · Ausfahrttafel", z333: "Zeichen 333 · Pfeilzeichen Ausfahrt",
    z450_3: "Zeichen 450 · Ankündigungsbake 300 m", z450_2: "Zeichen 450 · Ankündigungsbake 200 m", z450_1: "Zeichen 450 · Ankündigungsbake 100 m",
    z205: "Zeichen 205 · Vorfahrt gewähren", z206: "Zeichen 206 · Halt. Vorfahrt gewähren", z215: "Zeichen 215 · Kreisverkehr", z306: "Zeichen 306 · Vorfahrtstraße", z350: "Zeichen 350 · Fußgängerüberweg", z274_30: "Zeichen 274 · 30 km/h", zone30: "Zeichen 274.1 · Tempo-30-Zone", z224: "Zeichen 224 · Haltestelle", z276: "Zeichen 276 · Überholverbot für Kraftfahrzeuge aller Art", z280: "Zeichen 280 · Ende des Überholverbots", z274_100: "Zeichen 274 · 100 km/h",
    vorweg: "Zeichen 449 · Vorwegweiser 1000 m", weg: "Zeichen 449 · Vorwegweiser 500 m", z531: "Zeichen 531 · Einengungstafel"
  };

  // ---------------------------------------------------------------- Fahrzeuge
  const TYPEN = {
    pkw: { l: 4.6, b: 1.85, h: 1.45 },
    fahrschule: { l: 4.5, b: 1.8, h: 1.45 },
    lkw: { l: 16.5, b: 2.55, h: 3.8 },
    transporter: { l: 5.9, b: 2.05, h: 2.5 },
    rtw: { l: 6.8, b: 2.3, h: 2.8 },
    polizei: { l: 4.9, b: 1.9, h: 1.5 },
    bus: { l: 12, b: 2.55, h: 3.1 },
    fussgaenger: { l: 0.45, b: 0.6, h: 1.75, person: true },
    kind: { l: 0.35, b: 0.45, h: 1.2, person: true },
    rad: { l: 1.8, b: 0.6, h: 1.75, person: true },
    ball: { l: 0.3, b: 0.3, h: 0.3, person: true }
  };

  // ---------------------------------------------------------------- Szenen
  // Jede Szene liefert: strasse (Flächen, Linien, Schilder), fahrzeuge (Pfad + Tempo + Signale),
  // phasen (Zeitpunkt, Titel, Erklärung, Regel, Frage) und optional "fahren" für den Selbst-fahren-Modus.
  const SZENEN = [];

  // ---- Hilfen für Szenen: gerade Fahrstreifen, Tempo über den Ort, Zeitpunkt an einem Ort
  function gerade(y, x0, x1) { return pfad([[x0 === undefined ? -4000 : x0, y], [x1 === undefined ? 4000 : x1, y]]); }
  // Tempo über den Ort: [[x, km/h], ...] entlang eines Pfads, gleichmäßige Beschleunigung zwischen den Stützstellen.
  // s(t) ist hier die absolute Strecke auf dem Pfad (Start bei sStart).
  function tempoStrecke(p, keys, sStart) {
    const k = keys.map(([x, v]) => [p.sBeiX(x), v / KMH]);
    const vBeiS = s => {
      if (s <= k[0][0]) return k[0][1];
      for (let i = 1; i < k.length; i++) if (s <= k[i][0]) { const t = (s - k[i - 1][0]) / ((k[i][0] - k[i - 1][0]) || 1); return Math.sqrt(Math.max(0, lerp(k[i - 1][1] ** 2, k[i][1] ** 2, t))); }
      return k[k.length - 1][1];
    };
    const DT = 0.02, N = 6000, S = new Float64Array(N + 1), V = new Float64Array(N + 1);
    S[0] = sStart; V[0] = vBeiS(sStart);
    for (let i = 1; i <= N; i++) { const vm = vBeiS(S[i - 1] + vBeiS(S[i - 1]) * DT / 2); S[i] = S[i - 1] + vm * DT; V[i] = vBeiS(S[i]); }
    const at = (A, t) => { const f = clamp(t / DT, 0, N), i = Math.floor(f); return i >= N ? A[N] : lerp(A[i], A[i + 1], f - i); };
    return { v: t => at(V, t), s: t => at(S, t), absolut: true };
  }
  // Fahrzeug mit gleichbleibendem Tempo, das zur Zeit tBei an der Stelle xBei ist
  function konstant(id, typ, farbe, y, kmh, xBei, tBei, extra) {
    const v = kmh / KMH, gegen = !!(extra && extra.gegen);
    const x0 = xBei - (gegen ? -v : v) * tBei;
    return Object.assign({ id, typ, farbe, pfad: gegen ? pfad([[4000, y], [-4000, y]]) : gerade(y), tempo: tempoProfil([[0, kmh]]), start: gegen ? 4000 - x0 : x0 + 4000 }, extra || {});
  }
  // Zeitpunkt, zu dem ein Fahrzeug die Stelle x erreicht (Bisektion, Fahrt in +x-Richtung)
  function tBeiX(f, x) {
    let a = 0, b = 240;
    if (rohPos(f, b).x < x) return b;
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (rohPos(f, m).x < x) a = m; else b = m; }
    return (a + b) / 2;
  }
  // Zwickel zwischen Hauptfahrbahnrand (y = yRand) und einem Rampenrand, dort wo der Abstand kleiner als "breite" ist
  function zwickel(rand, yRand, breite) {
    const innen = rand.filter(p => p[1] - yRand <= breite && p[1] >= yRand - 0.05);
    if (innen.length < 2) return null;
    const xs = innen.map(p => p[0]);
    return innen.concat([[Math.max(...xs), yRand], [Math.min(...xs), yRand]]);
  }
  // Punkt neben einem Pfad (Abstand d nach rechts) an der Stelle x
  function neben(punkte, x, d) { const i = Math.max(0, punkte.findIndex(p => p[0] >= x)); return versatz(punkte, d)[i]; }

  // ---- gemeinsame Autobahn-Bausteine: zweistreifige Richtungsfahrbahn nach Osten
  function autobahnGrund(x0, x1, extra) {
    const flaechen = [], linien = [];
    const yL = -W - 0.75, yR = W + 0.5;                     // Randstreifen links 0,75 m, rechts 0,5 m
    const gL = yL - 4 - 0.75;                               // linker Rand der Gegenfahrbahn-Fahrstreifen (am Mittelstreifen)
    flaechen.push({ art: "gruen", poly: [[x0, yL - 4], [x1, yL - 4], [x1, yL], [x0, yL]] });
    flaechen.push({ art: "asphalt", poly: [[x0, gL - 2 * W - 0.5], [x1, gL - 2 * W - 0.5], [x1, yL - 4], [x0, yL - 4]], gegen: true });
    flaechen.push({ art: "asphalt", poly: [[x0, yL], [x1, yL], [x1, yR], [x0, yR]] });
    // Seitenstreifen (2,5 m) - wo kein Ein-/Ausfädelungsstreifen liegt
    (extra && extra.seitenstreifen || [[x0, x1]]).forEach(([a, b]) => flaechen.push({ art: "asphalt2", poly: [[a, yR], [b, yR], [b, yR + 2.5], [a, yR + 2.5]] }));
    linien.push({ art: "voll", b: 0.25, pts: [[x0, -W - 0.15], [x1, -W - 0.15]] });          // linker Fahrbahnrand (Zeichen 295)
    linien.push({ art: "leit", b: 0.15, pts: [[x0, 0], [x1, 0]] });                        // Leitlinie (Zeichen 340): 6 m Strich, 12 m Lücke
    linien.push({ art: "planke", pts: [[x0, yL - 2], [x1, yL - 2]] });
    linien.push({ art: "voll", b: 0.25, pts: [[x0, gL + 0.15], [x1, gL + 0.15]], gegen: true });
    linien.push({ art: "leit", b: 0.15, pts: [[x0, gL - W], [x1, gL - W]], gegen: true });
    linien.push({ art: "voll", b: 0.25, pts: [[x0, gL - 2 * W - 0.15], [x1, gL - 2 * W - 0.15]], gegen: true });
    if (extra && extra.randRechts) extra.randRechts.forEach(([a, b]) => linien.push({ art: "voll", b: 0.25, pts: [[a, W + 0.15], [b, W + 0.15]] }));
    return { flaechen, linien, yL, yR, gegenInnen: gL - W / 2, gegenAussen: gL - 1.5 * W };
  }

  // ======================= Szene 1: Auffahren auf die Autobahn =======================
  (function () {
    const X0 = -420, X1 = 700, EIN = 0, ENDE = 250, SPITZE = 310;  // Einfädelungsstreifen 0–250 m, Verziehung bis 310 m
    const yE = W * 1.5, yR = W / 2, yLi = -W / 2;             // Mitte Einfädelungsstreifen / rechter / linker Fahrstreifen
    const rampeMitte = bezier([-200, 110], [-130, 40], [-80, yE], [EIN, yE], 60);
    const rampeL = versatz(rampeMitte, -W / 2), rampeR = versatz(rampeMitte, W / 2);
    const zw = zwickel(rampeL, W + 0.15, 3.5);
    const xZw = zw ? Math.min(...zw.map(p => p[0])) : -80;
    const g = autobahnGrund(X0, X1, { seitenstreifen: [[X0, xZw - 10], [SPITZE, X1]], randRechts: [[X0, EIN]] });
    g.flaechen.push({ art: "asphalt", poly: band(rampeL, rampeR) });
    g.flaechen.push({ art: "asphalt", poly: [[EIN, W], [ENDE, W], [SPITZE, W], [ENDE, 2 * W], [EIN, 2 * W]] });
    if (zw) g.flaechen.push({ art: "sperr", poly: zw });      // Sperrfläche (Zeichen 298) im Zwickel
    g.linien.push({ art: "breit", b: 0.3, pts: [[EIN, W + 0.15], [ENDE, W + 0.15]] });     // Breitstrich (Zeichen 340, 6 m/6 m)
    g.linien.push({ art: "voll", b: 0.25, pts: versatz(rampeMitte, W / 2 - 0.15).concat([[ENDE, 2 * W - 0.15], [SPITZE, W + 0.15], [X1, W + 0.15]]) });
    g.linien.push({ art: "voll", b: 0.25, pts: versatz(rampeMitte, -W / 2 + 0.15).filter(p => p[0] <= xZw + 1) });
    const schilder = [{ typ: "z330", x: -175, y: 104, seite: 1 }];

    // Fahrschulauto: Rampe -> Einfädelungsstreifen -> Lücke hinter dem Lkw -> rechter Fahrstreifen
    const fsPfad = pfad(rampeMitte.concat(spurPfad(EIN + 2, X1 + 600, yE, [{ x: 110, y: yR, laenge: 60 }])));
    const fs = { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true, pfad: fsPfad,
      tempo: tempoStrecke(fsPfad, [[-200, 55], [-60, 62], [0, 76], [100, 92], [200, 89], [600, 88]], fsPfad.sBeiX(-130)) };
    const tx = x => tBeiX(fs, x);
    fs.blinker = [{ von: tx(15), bis: tx(178), seite: "links" }];
    fs.schulter = [{ von: tx(86), bis: tx(86) + 0.9, seite: "links" }];
    const tM = tx(140);
    const fahrzeuge = [fs,
      // Lkw auf dem rechten Fahrstreifen: das Fahrschulauto fädelt HINTER ihm ein
      konstant("lkw1", "lkw", "#c9ced6", yR, 88, 140 + 48 + 10.6, tM),
      konstant("lkw2", "lkw", "#d9d2c3", yR, 86, 140 + 48 + 10.6 + 140, tM),
      // Pkw rechts hinten: bleibt auf Abstand, die Lücke ist groß genug
      konstant("pkw1", "pkw", "#b3322c", yR, 88, 140 - 55 - 4.6, tM),
      konstant("pkw2", "pkw", "#2c5aa0", yLi, 125, 150, tx(150) - 0.4),
      konstant("pkw3", "pkw", "#3a3f45", yLi, 130, 40, tx(40) + 3.5),
      konstant("gg1", "pkw", "#7b8a52", g.gegenInnen, 118, 0, 4, { gegen: true }),
      konstant("gg2", "lkw", "#d6c9a8", g.gegenAussen, 85, 120, 9, { gegen: true })
    ];
    SZENEN.push({
      id: "auffahren", kategorie: "autobahn", plan: ["s_ab_ein"], titel: "Auffahren auf die Autobahn", kurz: "Einfädelungsstreifen, Lücke finden, einfädeln",
      dauer: Math.ceil(tx(178) + 5), strasse: { ...g, schilder, bereich: [X0, X1] }, fahrzeuge,
      kamera: { fokus: "fs", zoom: 7 },
      phasen: [
        { t: 0.2, titel: "Anschlussstelle", text: "Die Auffahrt führt in einem eigenen Bogen zur Autobahn. Schon hier den Verkehr auf der Autobahn beobachten: Wie schnell ist er, wo sind Lücken?", regel: "Zeichen 330.1 · § 18 Abs. 2 StVO", frage: { text: "Wer hat gleich beim Einfädeln Vorfahrt?", optionen: ["Ich – ich bin auf dem Beschleunigungsstreifen", "Der Verkehr auf der durchgehenden Fahrbahn", "Wer schneller ist"], richtig: 1, erklaerung: "§ 18 Abs. 3 StVO: Der Verkehr auf der durchgehenden Fahrbahn hat Vorfahrt." } },
        { t: tx(-12), titel: "Einfädelungsstreifen: beschleunigen", text: "Auf dem Einfädelungsstreifen zügig auf das Tempo des Verkehrs beschleunigen. Hier darf man schneller fahren als auf den durchgehenden Fahrstreifen – das ist gewollt.", regel: "§ 7a Abs. 2 StVO", frage: { text: "Was ist jetzt die wichtigste Aufgabe?", optionen: ["Langsam fahren und abwarten", "Zügig auf die Geschwindigkeit des Verkehrs beschleunigen", "Sofort nach links ziehen"], richtig: 1, erklaerung: "Mit ähnlichem Tempo wie der Verkehr lässt es sich sicher einfädeln. Zu langsames Einfädeln zwingt andere zum Bremsen." } },
        { t: tx(15), titel: "Blinker links", text: "Den Fahrstreifenwechsel rechtzeitig und deutlich ankündigen – Blinker links setzen.", regel: "§ 7 Abs. 5 StVO", frage: { text: "Wann blinke ich?", optionen: ["Erst wenn ich schon wechsle", "Rechtzeitig vorher", "Gar nicht, es ist ja klar"], richtig: 1, erklaerung: "Jeder Fahrstreifenwechsel ist rechtzeitig und deutlich anzukündigen (§ 7 Abs. 5 StVO)." } },
        { t: tx(50), titel: "Lücke wählen", text: "Der Lkw fährt rechts vorne, der rote Pkw hat großen Abstand. Die Lücke dahinter passt: Tempo angleichen und genug Abstand halten (Faustregel: halber Tacho in Metern).", regel: "§ 18 Abs. 3 · § 4 Abs. 1 StVO", frage: { text: "Wo fädle ich ein?", optionen: ["Neben dem Lkw", "In die Lücke hinter dem Lkw", "Vor den Lkw, ich gebe Gas"], richtig: 1, erklaerung: "Die Lücke hinter dem Lkw ist groß genug. Vor ihm würde es knapp, und er hat Vorfahrt." } },
        { t: tx(86), titel: "Spiegel und Schulterblick", text: "Kurz vor dem Wechsel: Innen- und Außenspiegel, dann Schulterblick nach links – der tote Winkel ist sonst unsichtbar.", regel: "§ 7 Abs. 5 StVO: Gefährdung ausschließen", frage: { text: "Was kommt direkt vor dem Spurwechsel?", optionen: ["Radio leiser machen", "Spiegel und Schulterblick links", "Hupen"], richtig: 1, erklaerung: "Nur mit Schulterblick siehst du ein Fahrzeug im toten Winkel." } },
        { t: tx(110), titel: "Einfädeln", text: "Über die breite Leitlinie wechseln – nicht über die durchgehende Linie oder die Sperrfläche. Zügig und gleichmäßig hinüberfahren, nicht bis zum Ende des Streifens warten.", regel: "Zeichen 340 · Zeichen 295 · Zeichen 298 · § 7 Abs. 5 StVO" },
        { t: tx(178), titel: "Blinker aus, Abstand halten", text: "Nach dem Wechsel Blinker aus und rechts weiterfahren. Abstand zum Lkw vorne: mindestens halber Tacho in Metern.", regel: "§ 2 Abs. 2 · § 4 Abs. 1 StVO", frage: { text: "Und jetzt?", optionen: ["Gleich links überholen", "Blinker aus, rechts fahren, Abstand halten", "Auf dem Seitenstreifen weiter"], richtig: 1, erklaerung: "Rechtsfahrgebot (§ 2 Abs. 2 StVO) und ausreichender Abstand (§ 4 Abs. 1 StVO)." } },
        { t: tx(178) + 3, titel: "Merke", text: "Beim Auffahren gilt kein Reißverschluss: Wer auffährt, muss die Vorfahrt beachten. Findet sich keine Lücke, notfalls am Ende des Streifens anhalten – nie auf den Seitenstreifen ausweichen.", regel: "§ 18 Abs. 3 StVO · § 7 Abs. 4 gilt hier nicht" }
      ],
      fahren: {
        // Selbst fahren: Start auf der Rampe, Ziel rechter Fahrstreifen
        start: { pfad: pfad(rampeMitte.concat(spurPfad(EIN + 2, SPITZE + 2, yE))), s: pfad(rampeMitte).laenge * 0.35, v: 55 },
        spuren: { einf: yE, rechts: yR, links: yLi }, spurStart: "einf",
        wechselErlaubt: (x, von, nach) => (von === "einf" && nach === "rechts") ? x >= EIN && x <= ENDE + 10 : (von === "rechts" && nach === "links") || (von === "links" && nach === "rechts"),
        wechselHinweis: (x, von) => von === "einf" ? (x < EIN ? "Noch nicht: erst ab der breiten Leitlinie (Zeichen 340) wechseln – nicht über die Sperrfläche." : "Zu spät: Der Streifen ist zu Ende. Anhalten und auf eine große Lücke warten.") : "Hier ist kein Fahrstreifenwechsel möglich.",
        wechselBis: { "einf>rechts": ENDE + 20 },
        grenzeEnde: ENDE + 25, ziel: "rechts",
        // Rechts eine große Lücke, die bei etwa 90 km/h zwischen x = 80 und 200 liegt; dahinter weitere Fahrzeuge
        verkehr: [
          { typ: "lkw", y: yR, x0: 110, v: 84, farbe: "#d9d2c3" }, { typ: "lkw", y: yR, x0: -80, v: 86, farbe: "#c9ced6" },
          { typ: "pkw", y: yR, x0: -228, v: 88, farbe: "#b3322c" }, { typ: "pkw", y: yR, x0: -360, v: 89, farbe: "#5f6f3a" },
          { typ: "transporter", y: yR, x0: -500, v: 88, farbe: "#e7e3d6" },
          { typ: "pkw", y: yLi, x0: 40, v: 128, farbe: "#2c5aa0" }, { typ: "pkw", y: yLi, x0: -170, v: 132, farbe: "#3a3f45" }
        ],
        tipps: [
          { x: -150, text: "Auf der Rampe: Verkehr links beobachten. Wo sind Lücken?" },
          { x: EIN - 10, text: "Einfädelungsstreifen: Gas geben – auf etwa 90 km/h beschleunigen." },
          { x: 40, text: "Blinker links setzen und eine Lücke wählen." },
          { x: 170, text: "Jetzt: Schulterblick links und einfädeln – oder vor dem Ende anhalten." }
        ],
        bewerten: "auffahren"
      }
    });
  })();

  // ======================= Szene 2: Verlassen der Autobahn =======================
  (function () {
    const X0 = -950, X1 = 560, A = 0, AE = 250;                // Ausfädelungsstreifen voll ab 0, Trennung (Spitze) bei 250
    const yA = W * 1.5, yR = W / 2, yLi = -W / 2;
    const rampeMitte = bezier([AE, yA], [AE + 100, yA], [AE + 190, yA + 30], [AE + 270, 150], 50);
    const rampeL = versatz(rampeMitte, -W / 2), rampeR = versatz(rampeMitte, W / 2);
    const zw = zwickel(rampeL, W + 0.15, 3.5);
    const xZw = zw ? Math.max(...zw.map(p => p[0])) : AE + 80;
    const g = autobahnGrund(X0, X1, { seitenstreifen: [[X0, -60], [xZw + 10, X1]], randRechts: [[AE, X1]] });
    g.flaechen.push({ art: "asphalt", poly: [[-60, W], [A, W], [AE, W], [AE, 2 * W], [A, 2 * W], [-60, W + 0.1]] });
    g.flaechen.push({ art: "asphalt", poly: band(rampeL, rampeR) });
    if (zw) g.flaechen.push({ art: "sperr", poly: zw });
    g.linien.push({ art: "voll", b: 0.25, pts: [[X0, W + 0.15], [-60, W + 0.15], [A, 2 * W - 0.15], [AE, 2 * W - 0.15]].concat(versatz(rampeMitte, W / 2 - 0.15)) });
    g.linien.push({ art: "breit", b: 0.3, pts: [[-60, W + 0.15], [AE, W + 0.15]] });
    g.linien.push({ art: "voll", b: 0.25, pts: versatz(rampeMitte, -W / 2 + 0.15).filter(p => p[0] >= AE + 20) });
    const p60 = neben(rampeMitte, AE + 50, W / 2 + 2.2);
    const schilder = [
      { typ: "vorweg", x: -890, y: W + 5.5, seite: 1 }, { typ: "weg", x: -390, y: W + 5.5, seite: 1 },
      { typ: "z450_3", x: -300, y: W + 4, seite: 1 }, { typ: "z450_2", x: -200, y: W + 4, seite: 1 }, { typ: "z450_1", x: -100, y: W + 4, seite: 1 },
      { typ: "z332", x: -20, y: 2 * W + 3.5, seite: 1 }, { typ: "z333", x: xZw + 2, y: W + 3, seite: 1 }, { typ: "z274_60", x: p60[0], y: p60[1], seite: 1 }
    ];
    const fsPfad = pfad(spurPfad(-1100, AE, yLi, [{ x: -800, y: yR, laenge: 90 }, { x: 0, y: yA, laenge: 60 }]).concat(rampeMitte.slice(1)));
    const fs = { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true, pfad: fsPfad,
      tempo: tempoStrecke(fsPfad, [[-1100, 120], [-780, 115], [65, 115], [AE, 60], [AE + 200, 58]], fsPfad.sBeiX(-920)) };
    const tx = x => tBeiX(fs, x);
    fs.blinker = [{ von: tx(-885), bis: tx(-705), seite: "rechts" }, { von: tx(-150), bis: tx(64), seite: "rechts" }];
    fs.schulter = [{ von: tx(-835), bis: tx(-835) + 0.9, seite: "rechts" }, { von: tx(-30), bis: tx(-30) + 0.9, seite: "rechts" }];
    const fahrzeuge = [fs,
      konstant("lkw1", "lkw", "#c9ced6", yR, 85, -750 - 130, tx(-750)),
      konstant("pkw1", "pkw", "#2c5aa0", yLi, 135, -850, tx(-850) + 6),
      konstant("pkw2", "transporter", "#e7e3d6", yR, 100, -750 + 420, tx(-750)),
      konstant("gg1", "pkw", "#7b8a52", g.gegenInnen, 120, -300, 12, { gegen: true }),
      konstant("gg2", "lkw", "#d6c9a8", g.gegenAussen, 85, 100, 22, { gegen: true })
    ];
    SZENEN.push({
      id: "abfahren", kategorie: "autobahn", plan: ["s_ab_aus"], titel: "Verlassen der Autobahn", kurz: "Rechtzeitig einordnen, Ausfädelungsstreifen, erst dort bremsen",
      dauer: Math.ceil(tx(AE + 150)), strasse: { ...g, schilder, bereich: [X0, X1] }, fahrzeuge, kamera: { fokus: "fs", zoom: 6.5 },
      phasen: [
        { t: 0.3, titel: "Ausfahrt angekündigt", text: "Der Vorwegweiser kündigt die Ausfahrt 1000 m vorher an. Jetzt planen: frühzeitig auf den rechten Fahrstreifen – nicht erst in letzter Sekunde von links.", regel: "Zeichen 449 · § 7 Abs. 5 StVO", frage: { text: "Wann wechsle ich nach rechts?", optionen: ["Direkt an der Ausfahrt", "Frühzeitig, spätestens vor den Baken", "Egal, notfalls über die Sperrfläche"], richtig: 1, erklaerung: "Rechtzeitig einordnen, damit der Wechsel ohne Hektik und Gefährdung klappt." } },
        { t: tx(-870), titel: "Blinker, Spiegel, Schulterblick", text: "Blinker rechts, Innen- und Außenspiegel, Schulterblick rechts – dann zügig auf den rechten Fahrstreifen.", regel: "§ 7 Abs. 5 StVO" },
        { t: tx(-690), titel: "Rechts einordnen", text: "Auf dem rechten Fahrstreifen bleiben und Tempo halten. Blinker wieder aus.", regel: "§ 2 Abs. 2 StVO (Rechtsfahrgebot)" },
        { t: tx(-395), titel: "Vorwegweiser 500 m", text: "Die Ausfahrt wird 500 m vorher noch einmal angekündigt. Ab jetzt möglichst nicht mehr überholen.", regel: "Zeichen 449" },
        { t: tx(-305), titel: "Ankündigungsbaken", text: "Baken mit 3, 2, 1 Streifen: noch 300, 200, 100 m bis zum Beginn des Ausfädelungsstreifens.", regel: "Zeichen 450", frage: { text: "Was bedeutet die Bake mit zwei Streifen?", optionen: ["Noch 200 m bis zur Ausfahrt", "Tempo 200", "Zwei Fahrstreifen frei"], richtig: 0, erklaerung: "Zeichen 450: 3 Streifen = 300 m, 2 = 200 m, 1 = 100 m." } },
        { t: tx(-150), titel: "Blinker rechts", text: "Rechtzeitig vor dem Ausfädelungsstreifen rechts blinken – der Verkehr hinter dir muss es früh sehen.", regel: "§ 7 Abs. 5 StVO" },
        { t: tx(-30), titel: "Spiegel, Schulterblick, rüber", text: "Spiegel und Schulterblick rechts, dann über die breite Leitlinie auf den Ausfädelungsstreifen wechseln.", regel: "Zeichen 340 · § 7 Abs. 5 StVO" },
        { t: tx(66), titel: "Erst jetzt bremsen", text: "Die Geschwindigkeit erst auf dem Ausfädelungsstreifen abbauen, nicht vorher auf der Autobahn. Dort darf man nicht schneller fahren als auf den durchgehenden Fahrstreifen.", regel: "§ 7a Abs. 3 StVO", frage: { text: "Wo baue ich die Geschwindigkeit ab?", optionen: ["Schon auf dem rechten Fahrstreifen", "Auf dem Ausfädelungsstreifen", "Erst in der Kurve"], richtig: 1, erklaerung: "Auf der Autobahn bremsen gefährdet die Nachfolgenden – erst auf dem Ausfädelungsstreifen verzögern, vor der Kurve auf die angezeigte Geschwindigkeit." } },
        { t: tx(190), titel: "Kurve und Tacho", text: "Bis zum Zeichen auf die angezeigte Höchstgeschwindigkeit (hier 60 km/h) herunterbremsen, bevor die Kurve enger wird. Nach langer Autobahnfahrt fühlt sich Tempo 60 sehr langsam an – Tacho kontrollieren!", regel: "Zeichen 274 · § 3 Abs. 1 StVO", frage: { text: "Warum auf den Tacho schauen?", optionen: ["Weil man sich nach schnellem Fahren beim Tempo verschätzt", "Wegen der Tankanzeige", "Muss man nicht"], richtig: 0, erklaerung: "Nach Autobahnfahrt unterschätzt man die eigene Geschwindigkeit (Gewöhnung)." } },
        { t: tx(AE + 70), titel: "Merke", text: "Ausfahrt verpasst? Weiterfahren bis zur nächsten. Auf der Autobahn nie rückwärtsfahren oder wenden – auch nicht auf dem Seitenstreifen.", regel: "§ 18 Abs. 7 StVO" }
      ],
      fahren: {
        start: { pfad: pfad(spurPfad(-1100, X1 + 600, yLi)), s: 200, v: 120 },
        spuren: { links: yLi, rechts: yR, aus: yA }, spurStart: "links",
        wechselErlaubt: (x, von, nach) => (von === "rechts" && nach === "aus") ? x >= -60 && x <= AE - 40 : (von === "links" && nach === "rechts") || (von === "rechts" && nach === "links"),
        wechselHinweis: (x, von, nach) => nach === "aus" ? (x < -60 ? "Noch nicht: Der Ausfädelungsstreifen beginnt an der breiten Leitlinie." : "Zu spät für diese Ausfahrt – weiterfahren bis zur nächsten.") : "Hier ist kein Fahrstreifenwechsel möglich.",
        wechselBis: { "rechts>aus": AE - 5 },
        rampe: rampeMitte, rampeAb: AE, kurveX: p60[0], ziel: "aus",
        verkehr: [
          { typ: "lkw", y: yR, x0: -620, v: 85, farbe: "#c9ced6" }, { typ: "transporter", y: yR, x0: -380, v: 100, farbe: "#e7e3d6" },
          { typ: "pkw", y: yLi, x0: -1100, v: 138, farbe: "#2c5aa0" }
        ],
        tipps: [
          { x: -880, text: "Die Ausfahrt kommt: Blinker rechts, Schulterblick, auf den rechten Fahrstreifen." },
          { x: -300, text: "Baken: noch 300 m. Rechts bleiben, Tempo halten." },
          { x: -150, text: "Blinker rechts – gleich beginnt der Ausfädelungsstreifen." },
          { x: -40, text: "Schulterblick rechts und rüber. Erst dort bremsen!" },
          { x: 150, text: "Bis zum Schild „60“ auf 60 km/h herunterbremsen." }
        ],
        bewerten: "abfahren"
      }
    });
  })();

  // ======================= Szene 3: Reißverschluss (Fahrstreifen endet) =======================
  (function () {
    const X0 = -350, X1 = 450, ENG = 120;                       // rechter Fahrstreifen endet bei 120 m
    const g = autobahnGrund(X0, X1, {});
    g.flaechen.push({ art: "baustelle", poly: [[ENG, W + 0.4], [ENG + 50, 0.2], [X1, 0.2], [X1, W + 0.4]] });
    const schilder = [{ typ: "z274_80", x: -230, y: W + 4.2, seite: 1 }, { typ: "z531", x: -150, y: W + 4, seite: 1 }, { typ: "z531", x: -20, y: W + 4, seite: 1 }];
    const yR = W / 2, yLi = -W / 2;
    const fz = [], farben = ["#b3322c", "#2c5aa0", "#3a3f45", "#e0b84a", "#6a7d8f", "#7b8a52", "#d9d2c3", "#8e4b8a"];
    const ABST = 24, WX = ENG - 24, KMH_K = 30;                 // je Fahrstreifen 24 m Abstand; Wechsel unmittelbar vor der Engstelle
    let k = 0;
    for (let i = 0; i < 7; i++) {
      // links: durchgehend; rechts: jeweils genau zwischen zwei links Fahrenden -> einer von links, einer von rechts
      fz.push(konstant("l" + i, i === 3 ? "transporter" : "pkw", farben[k++ % farben.length], yLi, KMH_K, -10 - i * ABST, 0));
      const istFs = i === 2, x0 = -10 - ABST / 2 - i * ABST;
      fz.push({ id: istFs ? "fs" : "r" + i, typ: istFs ? "fahrschule" : "pkw", fokus: istFs, farbe: istFs ? "#f2f2ee" : farben[k++ % farben.length],
        pfad: pfad(spurPfad(-800, X1 + 400, yR, [{ x: WX, y: yLi, laenge: 22 }])), tempo: tempoProfil([[0, KMH_K]]), start: x0 + 800,
        blinker: [{ von: 0, bis: 999, seite: "links", abX: WX - 45, bisX: WX + 22 }],
        schulter: istFs ? [{ von: (WX - 8 - x0) / (KMH_K / KMH), bis: (WX - 8 - x0) / (KMH_K / KMH) + 0.9, seite: "links" }] : undefined });
    }
    const fs = fz.find(f => f.id === "fs"), tx = x => tBeiX(fs, x);
    SZENEN.push({
      id: "reissverschluss", kategorie: "autobahn", plan: ["a_wechsel"], titel: "Reißverschluss bei Fahrstreifen-Ende", kurz: "Beide Fahrstreifen bis zur Engstelle nutzen, dann abwechselnd",
      dauer: Math.ceil(tx(ENG + 60)), strasse: { ...g, schilder, bereich: [X0, X1] }, fahrzeuge: fz, kamera: { fokus: "fs", zoom: 8 },
      phasen: [
        { t: 0.3, titel: "Fahrstreifen endet", text: "Die Einengungstafel kündigt an: Der rechte Fahrstreifen endet. Beide Fahrstreifen werden bis zur Engstelle weiter genutzt.", regel: "Zeichen 531 · § 7 Abs. 4 StVO", frage: { text: "Wann wechsle ich nach links?", optionen: ["Sofort, wenn ich das Schild sehe", "Unmittelbar vor Beginn der Verengung", "Gar nicht, die anderen müssen warten"], richtig: 1, erklaerung: "§ 7 Abs. 4 StVO: Einordnen unmittelbar vor Beginn der Verengung, jeweils im Wechsel." } },
        { t: tx(-5), titel: "Bis vorne fahren", text: "Nicht zu früh wechseln: Wer rechts bis zur Engstelle fährt, nutzt die Straße richtig und hilft, den Stau kurz zu halten.", regel: "§ 7 Abs. 4 StVO" },
        { t: tx(WX - 45), titel: "Blinken und Lücke ansehen", text: "Links blinken, Tempo an die linke Kolonne anpassen und das Fahrzeug suchen, hinter dem man sich einordnet.", regel: "§ 7 Abs. 5 StVO" },
        { t: tx(WX - 8), titel: "Im Wechsel einordnen", text: "Unmittelbar vor der Engstelle: Schulterblick – und im Wechsel nach einem Fahrzeug links einfädeln. Links Fahrende lassen jeweils ein Fahrzeug herein.", regel: "§ 7 Abs. 4 · § 7 Abs. 5 StVO", frage: { text: "Wer muss wen hereinlassen?", optionen: ["Niemand, wer zuerst kommt", "Links Fahrende lassen jeweils ein Fahrzeug im Wechsel herein", "Rechts Fahrende müssen warten, bis alles frei ist"], richtig: 1, erklaerung: "Reißverschluss: abwechselnd, einer von links, einer von rechts." } },
        { t: tx(ENG + 25), titel: "Merke", text: "Reißverschluss gilt, wenn ein Fahrstreifen endet oder blockiert ist. Beim Einfädelungsstreifen einer Autobahnauffahrt gilt er NICHT – dort hat der durchgehende Verkehr Vorfahrt.", regel: "§ 7 Abs. 4 · § 18 Abs. 3 StVO" }
      ]
    });
  })();

  // ======================= Szene 4: Rettungsgasse =======================
  (function () {
    const X0 = -350, X1 = 400;
    // dreistreifige Richtungsfahrbahn
    const flaechen = [], linien = [];
    const yL = -2 * W - 0.75, yR = W + 0.5;
    flaechen.push({ art: "gruen", poly: [[X0, yL - 4], [X1, yL - 4], [X1, yL], [X0, yL]] });
    flaechen.push({ art: "asphalt", poly: [[X0, yL], [X1, yL], [X1, yR], [X0, yR]] });
    flaechen.push({ art: "asphalt2", poly: [[X0, yR], [X1, yR], [X1, yR + 2.5], [X0, yR + 2.5]] });
    linien.push({ art: "voll", b: 0.25, pts: [[X0, -2 * W - 0.15], [X1, -2 * W - 0.15]] });
    linien.push({ art: "leit", b: 0.15, pts: [[X0, -W], [X1, -W]] });
    linien.push({ art: "leit", b: 0.15, pts: [[X0, 0], [X1, 0]] });
    linien.push({ art: "voll", b: 0.25, pts: [[X0, W + 0.15], [X1, W + 0.15]] });
    linien.push({ art: "planke", pts: [[X0, yL - 2], [X1, yL - 2]] });
    const lanes = [-1.5 * W, -0.5 * W, 0.5 * W];
    const ausweich = [-1.5 * W - 1.2, -0.5 * W + 1.25, 0.5 * W + 1.1];   // ganz links nach links, alle anderen nach rechts
    // Stauwelle: weiter hinten Fahrende halten etwas später an (größerer Abstand während der Fahrt)
    const tempoFuer = i => { const d = i * 0.8; return tempoProfil([[0, 40], [5 + d, 20], [8 + d, 6], [11 + d, 3], [12 + d, 0]]); };
    const fz = []; const farben = ["#b3322c", "#2c5aa0", "#3a3f45", "#e0b84a", "#6a7d8f", "#7b8a52", "#d9d2c3", "#8e4b8a", "#c9ced6"];
    let k = 0;
    lanes.forEach((y, li) => {
      let vorne = 70 - li * 4;                                          // Stauende vorne (Fahrzeugfront)
      for (let i = 0; i < 5; i++) {
        const istFs = li === 1 && i === 1;
        const typ = istFs ? "fahrschule" : (li === 2 && i % 2 === 0) ? "lkw" : (li === 0 && i === 3) ? "transporter" : "pkw";
        const L = TYPEN[typ].l, xs = vorne - L / 2;                     // Halteposition (Mitte)
        vorne -= L + 2.5;
        const tempo = tempoFuer(i), D = tempo.s(60);                    // Anhalteweg aus dem Tempo-Profil
        fz.push({ id: istFs ? "fs" : `s${li}_${i}`, typ, fokus: istFs, farbe: istFs ? "#f2f2ee" : typ === "lkw" ? "#c9ced6" : farben[k++ % farben.length],
          // beim Ausrollen seitlich ausweichen - die Gasse entsteht, bevor alle stehen
          pfad: pfad(spurPfad(xs - D - 10, xs + 80, y, [{ x: xs - 22, y: ausweich[li], laenge: 20 }])), tempo, start: 10,
          blinker: [{ von: 5.5 + i * 0.8, bis: 12.5 + i * 0.8, seite: li === 0 ? "links" : "rechts" }] });
      }
    });
    // Rettungswagen mit Blaulicht fährt durch die Gasse zwischen ganz links und Mitte
    const gy = (ausweich[0] + ausweich[1]) / 2;
    const rtw = konstant("rtw", "rtw", "#f5f2e8", gy, 50, 60, 22, { blau: true });
    fz.push(rtw);
    SZENEN.push({
      id: "rettungsgasse", kategorie: "autobahn", titel: "Rettungsgasse", kurz: "Schon bei stockendem Verkehr: ganz links nach links, alle anderen nach rechts",
      dauer: 30, strasse: { flaechen, linien, schilder: [], bereich: [X0, X1] }, fahrzeuge: fz, kamera: { fokus: "fs", zoom: 8 },
      phasen: [
        { t: 0.3, titel: "Verkehr stockt", text: "Der Verkehr wird langsamer. Sobald nur noch Schrittgeschwindigkeit gefahren wird oder alle stehen, muss die Rettungsgasse gebildet werden – nicht erst, wenn das Blaulicht kommt.", regel: "§ 11 Abs. 2 StVO", frage: { text: "Wann wird die Rettungsgasse gebildet?", optionen: ["Erst wenn ich Martinshorn höre", "Sobald Schrittgeschwindigkeit oder Stillstand herrscht", "Nur bei Unfällen vor mir"], richtig: 1, erklaerung: "§ 11 Abs. 2 StVO: bei Schrittgeschwindigkeit oder Stillstand – sofort." } },
        { t: 5.5, titel: "Wohin ausweichen?", text: "Die Gasse entsteht zwischen dem äußerst linken und dem unmittelbar rechts daneben liegenden Fahrstreifen: Wer ganz links fährt, weicht nach links aus – alle anderen nach rechts.", regel: "§ 11 Abs. 2 StVO", frage: { text: "Du fährst auf dem mittleren von drei Fahrstreifen. Wohin?", optionen: ["Nach links", "Nach rechts", "Stehen bleiben, wo ich bin"], richtig: 1, erklaerung: "Alle außer dem ganz linken Fahrstreifen weichen nach rechts aus." } },
        { t: 16, titel: "Einsatzfahrzeug kommt", text: "Blaulicht und Einsatzhorn: sofort freie Bahn schaffen. Stehen bleiben, nicht mehr hin und her rangieren – die Gasse muss gerade und frei sein.", regel: "§ 38 Abs. 1 · § 11 Abs. 2 StVO" },
        { t: 23.5, titel: "Gasse offen lassen", text: "Die Gasse bleibt frei, auch wenn schon ein Einsatzfahrzeug durch ist – oft folgen weitere. Nicht hinterherfahren!", regel: "§ 11 Abs. 2 · § 38 Abs. 1 StVO", frage: { text: "Der Rettungswagen ist vorbei. Und jetzt?", optionen: ["Hinterherfahren, dann geht es schneller", "Gasse offen lassen, es können weitere kommen", "Sofort zurück auf die Spur"], richtig: 1, erklaerung: "Die Rettungsgasse bleibt bestehen, bis der Verkehr wieder fließt." } },
        { t: 27, titel: "Merke", text: "Der Seitenstreifen ist keine Fahrspur für Ungeduldige. Wer die Rettungsgasse nicht bildet oder sie selbst befährt, riskiert Bußgeld, Punkte und Fahrverbot.", regel: "§ 11 Abs. 2 StVO · BKatV" }
      ]
    });
  })();

  // ---------------------------------------------------------------- Zustand
  let root = null, cv = null, ctx = null, dpr = 1, Wpx = 0, Hpx = 0;
  let szene = null, zeit = 0, laeuft = false, tempoFaktor = 1, letzterFrame = 0, raf = 0;
  let kameraModus = "oben";           // oben | 3d | fahrer
  let modus = "vorfuehren";           // vorfuehren | mitdenken | fahren | frei
  let beantwortet = new Set(), punkte = { richtig: 0, gesamt: 0 };
  let versatzFz = {};                  // im Pause-Modus verschobene Fahrzeuge: id -> {dx, dy, frei:true}
  let ansicht = { zoom: 5, px: 0, py: 0, folgen: true };
  let fahr = null;                     // Zustand im Selbst-fahren-Modus
  let onCloseCb = null, beob = null, tippFrage = null;
  const KATEGORIEN = [["innerorts", "Innerorts"], ["ueberland", "Überland"], ["grundfahr", "Grundfahraufgaben"], ["autobahn", "Autobahn"]];
  let katAktiv = "innerorts", nurListe = null;

  // Position eines Fahrzeugs zur Zeit t (Vorführen/Mitdenken)
  function rohPos(f, t) {
    if (f.bahn) {                                   // vorausberechnete Posen (Rangieren: Ausrichtung ≠ Fahrtrichtung)
      const B = f.bahn, u = clamp(t / B.dt, 0, B.n - 1), i = Math.min(B.n - 2, Math.floor(u)), k = u - i, P = B.P, a = i * 5, b = a + 5;
      const dh = Math.atan2(Math.sin(P[b + 2] - P[a + 2]), Math.cos(P[b + 2] - P[a + 2]));
      return { x: lerp(P[a], P[b], k), y: lerp(P[a + 1], P[b + 1], k), h: P[a + 2] + dh * k, v: lerp(P[a + 3], P[b + 3], k), rueck: P[b + 4] < 0 };
    }
    const p = f.pfad.an(f.tempo.absolut ? f.tempo.s(t) : (f.start || 0) + f.tempo.s(t));
    return { x: p.x, y: p.y, h: p.h + (f.rueckwaerts ? Math.PI : 0), v: f.tempo.v(t) };
  }
  function fzPos(f, t) {
    const p = rohPos(f, t), o = versatzFz[f.id];
    return o ? Object.assign({}, p, { x: p.x + o.dx, y: p.y + o.dy }) : p;
  }
  function signale(f, t, pos) {
    let b = aktivIn(f.blinker, t);
    if (b && b.abX !== undefined && pos && !(pos.x >= b.abX && pos.x <= b.bisX)) b = null;
    let bremse = !!aktivIn(f.bremse, t);
    if (!bremse && f.bahn) bremse = Math.abs(rohPos(f, t + 0.3).v) < Math.abs(rohPos(f, t).v) - 0.15;
    else if (!bremse && f.tempo) bremse = f.tempo.v(t + 0.3) < f.tempo.v(t) - 0.4 || (f.bremsStand && f.tempo.v(t) < 0.05 && f.tempo.v(t + 0.6) > 0.05);
    return { blinker: b ? b.seite : null, bremse, schulter: aktivIn(f.schulter, t), rueck: !!(pos && pos.rueck), warn: !!aktivIn(f.warnblink, t) };
  }

  // ---------------------------------------------------------------- Rendering: gemeinsam
  const FARBE = { gruen: "#5f8a45", gruen2: "#6a9a52", insel: "#6c9a50", asphalt: "#4b4f54", asphalt2: "#595d61", sperr: "#4b4f54", baustelle: "#4b4f54", gehweg: "#b9b6ae", weiss: "#f2f2ee", rad: "#b2573c", pflaster: "#8b8d91", parken: "#55595e", beton: "#9a9c9f", himmel1: "#9cc3e4", himmel2: "#dfeaf2" };
  function blinkAn() { return Math.floor(performance.now() / 380) % 2 === 0; }

  function zeichneOben() {
    const s = ansicht.zoom * dpr;
    const cx = Wpx / 2, cy = Hpx / 2;
    const X = x => (x - ansicht.px) * s + cx, Y = y => (y - ansicht.py) * s + cy;
    ctx.fillStyle = szene.strasse.boden || FARBE.gruen; ctx.fillRect(0, 0, Wpx, Hpx);
    // Rasen-Textur dezent
    ctx.globalAlpha = 0.06; ctx.fillStyle = "#000"; for (let i = 0; i < 60; i++) { ctx.fillRect((i * 97) % Wpx, (i * 53) % Hpx, 2 * dpr, 2 * dpr); } ctx.globalAlpha = 1;
    const st = szene.strasse;
    st.flaechen.forEach(f => {
      ctx.beginPath(); f.poly.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath();
      ctx.fillStyle = FARBE[f.art] || FARBE.asphalt; ctx.fill();
      if (f.art === "sperr") schraffur(f.poly, X, Y, s, "#f4f4f0");
      if (f.art === "baustelle") { schraffur(f.poly, X, Y, s, "#f2c230"); }
    });
    st.linien.forEach(l => zeichneLinieOben(l, X, Y, s));
    (st.schilder || []).forEach(sc => {
      const img = schildBild(sc.typ); const gr = 5 * s;
      ctx.fillStyle = "#777"; ctx.fillRect(X(sc.x) - 0.1 * s, Y(sc.y) - 0.1 * s, 0.2 * s, 0.2 * s);
      ctx.drawImage(img, X(sc.x) - gr / 2, Y(sc.y) - gr - 0.4 * s, gr, gr);
    });
    if (szene.overlayUnten) try { szene.overlayUnten(ctx, X, Y, s, zeit, fahr); } catch (e) {}
    if (szene.rangieren && modus === "fahren") zielOben(ctx, X, Y, s);
    if (szene.reaktion && modus === "fahren" && fahr) wegeOben(ctx, X, Y, s, fahr, szene.reaktion.start.y, 1.2);
    (st.objekte || []).filter(o => o.art !== "haus" && o.art !== "baum").forEach(o => objektOben(o, X, Y, s));
    // Fahrzeuge
    const liste = fahrzeugListe();
    liste.forEach(e => zeichneFahrzeugOben(e, X, Y, s));
    (st.objekte || []).filter(o => o.art === "haus" || o.art === "baum").forEach(o => objektOben(o, X, Y, s));
    if (szene.overlay) try { szene.overlay(ctx, X, Y, s, zeit, fahr); } catch (e) {}
    if (modus === "fahren" && fahr && fahr.rang) hilfslinien(ctx, X, Y, s, fahr);
    if (tippFrage) tippFrage.markiert.forEach((id, i) => { const e = liste.find(x => x.f.id === id); if (!e) return; ctx.fillStyle = "#e0b84a"; ctx.beginPath(); ctx.arc(X(e.p.x), Y(e.p.y), Math.max(13 * dpr, 1.4 * s), 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.font = `bold ${Math.max(14 * dpr, 1.6 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), X(e.p.x), Y(e.p.y) + 1); });
  }
  // Ampelfarbe zur Zeit t: phasen = [[bis, "rot"|"rotgelb"|"gruen"|"gelb"|"aus"], ...]
  function ampelFarbe(o, t) { const ph = o.phasen || []; for (const [bis, f] of ph) if (t < bis) return f; return ph.length ? ph[ph.length - 1][1] : "rot"; }
  const LAMPE = { rot: ["#ff3b2f", null, null], rotgelb: ["#ff3b2f", "#ffc21a", null], gelb: [null, "#ffc21a", null], gruen: [null, null, "#39d06a"], aus: [null, null, null] };
  function objektOben(o, X, Y, s) {
    ctx.save(); ctx.translate(X(o.x), Y(o.y)); ctx.rotate(o.h || 0);
    if (o.art === "haus") {
      const L = o.l * s, B = o.b * s;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-L / 2 + 0.8 * s, -B / 2 + 0.8 * s, L, B);
      ctx.fillStyle = o.dach || "#a7553f"; ctx.fillRect(-L / 2, -B / 2, L, B);
      ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(-L / 2, -B / 2, L, B / 2);
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = Math.max(1, 0.12 * s); ctx.strokeRect(-L / 2, -B / 2, L, B); ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
    } else if (o.art === "baum") {
      const r = (o.r || 2.2) * s; ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.arc(0.5 * s, 0.6 * s, r, 0, 7); ctx.fill();
      ctx.fillStyle = "#3f7a34"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.fillStyle = "#5c9a46"; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.6, 0, 7); ctx.fill();
    } else if (o.art === "ampel") {
      const f = LAMPE[ampelFarbe(o, zeit)] || LAMPE.aus, n = o.fuss ? 2 : 3, w = 0.55 * s, hgt = (n * 0.55 + 0.2) * s;
      ctx.fillStyle = "#1c1e21"; rundRect(-w / 2, -hgt / 2, w, hgt, 0.15 * s); ctx.fill();
      const farben = o.fuss ? [f[0], f[2]] : f, leer = o.fuss ? ["#4a1512", "#12401f"] : ["#4a1512", "#4a3a10", "#12401f"];
      for (let i = 0; i < n; i++) { ctx.fillStyle = farben[i] || leer[i]; ctx.beginPath(); ctx.arc(0, -hgt / 2 + 0.38 * s + i * 0.55 * s, 0.2 * s, 0, 7); ctx.fill(); }
      if (o.gruenpfeil) {                                         // Zeichen 720 rechts neben dem Rotlicht (aus Sicht der Ankommenden)
        ctx.rotate(-(o.h || 0)); const rx = Math.sin(o.h || 0), ry = -Math.cos(o.h || 0), gx = rx * 0.75 * s, gy = ry * 0.75 * s;
        ctx.fillStyle = "#1c1e21"; ctx.fillRect(gx - 0.3 * s, gy - 0.25 * s, 0.6 * s, 0.5 * s); ctx.fillStyle = "#2fbf5a"; ctx.font = `bold ${Math.max(8, 0.45 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("➜", gx, gy);
      }
    } else if (o.art === "poller" || o.art === "bake") {
      ctx.fillStyle = o.art === "bake" ? "#d4202a" : "#6d7176"; ctx.beginPath(); ctx.arc(0, 0, 0.25 * s, 0, 7); ctx.fill();
      if (o.art === "bake") { ctx.fillStyle = "#fff"; ctx.fillRect(-0.25 * s, -0.06 * s, 0.5 * s, 0.12 * s); }
    } else if (o.art === "kegel") {
      ctx.fillStyle = "#f07a1a"; ctx.beginPath(); ctx.arc(0, 0, 0.3 * s, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 0.14 * s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function schraffur(poly, X, Y, s, farbe) {
    ctx.save(); ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath(); ctx.clip();
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    ctx.strokeStyle = farbe; ctx.lineWidth = Math.max(1, 0.5 * s);
    for (let x = x0 - (y1 - y0); x < x1 + (y1 - y0); x += 3) { ctx.beginPath(); ctx.moveTo(X(x), Y(y0)); ctx.lineTo(X(x + (y1 - y0)), Y(y1)); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = farbe; ctx.lineWidth = Math.max(1, 0.2 * s); ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath(); ctx.stroke();
  }
  // Zeichen 340 außerorts 6/12, innerorts 3/6, breite Leitlinie 6/6, Wartelinie (Z 341) 0,5/0,25, Schmalstrich 1/1
  function strichMuster(art) { return art === "leit" ? [6, 12] : art === "breit" ? [6, 6] : art === "leit_io" ? [3, 6] : art === "warte" ? [0.5, 0.25] : art === "schmal" ? [1, 1] : null; }
  function zeichneLinieOben(l, X, Y, s) {
    if (l.art === "planke") { ctx.strokeStyle = "#c7cbcf"; ctx.lineWidth = Math.max(2, 0.35 * s); ctx.beginPath(); l.pts.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke(); return; }
    ctx.strokeStyle = l.farbe || "#f4f4f0"; ctx.lineWidth = Math.max(1, (l.b || 0.15) * s);
    const m = strichMuster(l.art); ctx.setLineDash(m ? m.map(v => v * s) : []);
    ctx.beginPath(); l.pts.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke(); ctx.setLineDash([]);
  }
  function fahrzeugListe() {
    if (modus === "fahren" && fahr) return fahr.liste();
    return szene.fahrzeuge.map(f => { const p = fzPos(f, zeit); return { f, p, sig: signale(f, zeit, p) }; });
  }
  function zeichneFahrzeugOben(e, X, Y, s) {
    const { f, p, sig } = e, T = TYPEN[f.typ];
    if (f.unsichtbar && f.unsichtbar(zeit)) return;
    ctx.save(); if (f.geist) ctx.globalAlpha = 0.45; ctx.translate(X(p.x), Y(p.y)); ctx.rotate(p.h);
    const L = T.l * s, B = T.b * s;
    if (T.person) {
      if (f.typ === "ball") { ctx.fillStyle = f.farbe || "#e53935"; ctx.beginPath(); ctx.arc(0, 0, Math.max(2, 0.18 * s), 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-0.05 * s, -0.05 * s, Math.max(1, 0.06 * s), 0, 7); ctx.fill(); ctx.restore(); return; }
      if (f.typ === "rad") { ctx.strokeStyle = "#222"; ctx.lineWidth = Math.max(1.5, 0.12 * s); ctx.beginPath(); ctx.moveTo(-0.85 * s, 0); ctx.lineTo(0.85 * s, 0); ctx.stroke(); ctx.lineWidth = Math.max(1, 0.08 * s); ctx.beginPath(); ctx.moveTo(0.55 * s, -0.3 * s); ctx.lineTo(0.55 * s, 0.3 * s); ctx.stroke(); }
      const k = f.typ === "kind" ? 0.75 : 1;
      ctx.fillStyle = f.farbe || "#3a6ea5"; ctx.beginPath(); ctx.ellipse(0, 0, 0.2 * s * k, 0.3 * s * k, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#e8c4a0"; ctx.beginPath(); ctx.arc(0.02 * s, 0, 0.13 * s * k, 0, 7); ctx.fill();
      ctx.fillStyle = "#4a3426"; ctx.beginPath(); ctx.arc(-0.02 * s, 0, 0.1 * s * k, 0, 7); ctx.fill();
      if (sig.schulter) { ctx.fillStyle = "rgba(255,230,120,.3)"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 5 * s, -0.5, 0.5); ctx.closePath(); ctx.fill(); }
      ctx.restore(); return;
    }
    // Schatten
    ctx.fillStyle = "rgba(0,0,0,.28)"; rundRect(-L / 2 + 0.25 * s, -B / 2 + 0.3 * s, L, B, 0.5 * s); ctx.fill();
    ctx.fillStyle = f.farbe; rundRect(-L / 2, -B / 2, L, B, (f.typ === "lkw" ? 0.25 : 0.6) * s); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = Math.max(1, 0.06 * s); ctx.stroke();
    if (f.typ === "bus") { ctx.fillStyle = f.farbe; ctx.fillRect(-L / 2, -B / 2, L, B); ctx.fillStyle = "#d8dde2"; ctx.fillRect(-L / 2 + 0.3 * s, -B / 2 + 0.3 * s, L - 0.6 * s, B - 0.6 * s); ctx.fillStyle = "#26323d"; ctx.fillRect(L / 2 - 0.8 * s, -B / 2 + 0.2 * s, 0.5 * s, B - 0.4 * s); if (f.schulbus) { ctx.fillStyle = "#f5c518"; ctx.fillRect(-1 * s, -B / 2 + 0.4 * s, 2 * s, B - 0.8 * s); ctx.fillStyle = "#111"; ctx.font = `bold ${Math.max(7, 0.7 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("SCHULBUS", 0, 0); } }
    else if (f.typ === "lkw") { ctx.fillStyle = "#e9e9e9"; ctx.fillRect(-L / 2, -B / 2, L - 2.4 * s, B); ctx.fillStyle = f.farbe; ctx.fillRect(L / 2 - 2.3 * s, -B / 2, 2.3 * s, B); ctx.fillStyle = "#2a3440"; ctx.fillRect(L / 2 - 0.9 * s, -B / 2 + 0.2 * s, 0.5 * s, B - 0.4 * s); }
    else { ctx.fillStyle = "#26323d"; rundRect(L * 0.08, -B / 2 + 0.18 * s, L * 0.2, B - 0.36 * s, 0.2 * s); ctx.fill(); rundRect(-L * 0.36, -B / 2 + 0.22 * s, L * 0.14, B - 0.44 * s, 0.2 * s); ctx.fill(); }
    if (f.typ === "fahrschule") { ctx.fillStyle = "#1f5fa8"; ctx.fillRect(-L * 0.12, -B * 0.28, L * 0.2, B * 0.56); ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.max(8, 0.9 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("L", -L * 0.02, 0); }
    if (f.blau && blinkAn()) { ctx.fillStyle = "#3d7bff"; ctx.fillRect(L * 0.05, -B / 2, 0.5 * s, B); }
    // Licht: Bremse, Blinker
    const hinten = -L / 2, vorn = L / 2;
    ctx.fillStyle = sig.bremse ? "#ff2a2a" : "#8a1c1c"; ctx.fillRect(hinten, -B / 2 + 0.1 * s, 0.25 * s, 0.45 * s); ctx.fillRect(hinten, B / 2 - 0.55 * s, 0.25 * s, 0.45 * s);
    if (sig.rueck) { ctx.fillStyle = "#ffffff"; ctx.fillRect(hinten, -0.25 * s, 0.25 * s, 0.5 * s); ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.moveTo(hinten, -B / 2); ctx.lineTo(hinten - 2.5 * s, -B / 2 - 0.6 * s); ctx.lineTo(hinten - 2.5 * s, B / 2 + 0.6 * s); ctx.lineTo(hinten, B / 2); ctx.closePath(); ctx.fill(); }
    const blSeiten = sig.warn ? ["links", "rechts"] : sig.blinker ? [sig.blinker] : [];
    if (blSeiten.length && blinkAn()) blSeiten.forEach(seite => {
      const yy = seite === "links" ? -B / 2 : B / 2 - 0.4 * s; ctx.fillStyle = "#ffae1a";
      ctx.fillRect(hinten, yy, 0.45 * s, 0.4 * s); ctx.fillRect(vorn - 0.45 * s, yy, 0.45 * s, 0.4 * s);
      ctx.fillStyle = "rgba(255,174,26,.35)"; ctx.beginPath(); ctx.arc(vorn - 0.2 * s, yy + 0.2 * s, 0.9 * s, 0, 7); ctx.arc(hinten + 0.2 * s, yy + 0.2 * s, 0.9 * s, 0, 7); ctx.fill();
    });
    // Schulterblick: Sichtkegel in den toten Winkel
    if (sig.schulter) {
      const seite = sig.schulter.seite === "links" ? -1 : 1;
      ctx.fillStyle = "rgba(255,230,120,.28)"; ctx.beginPath(); ctx.moveTo(0, 0);
      if (sig.schulter.seite === "rundum") ctx.arc(0, 0, 9 * s, 0, 7);
      else if (sig.schulter.seite === "hinten") ctx.arc(0, 0, 12 * s, Math.PI * 0.8, Math.PI * 1.2);
      else ctx.arc(0, 0, 14 * s, seite < 0 ? -Math.PI * 0.95 : Math.PI * 0.62, seite < 0 ? -Math.PI * 0.62 : Math.PI * 0.95, false);
      ctx.closePath(); ctx.fill();
      ctx.rotate(-p.h); ctx.font = `${Math.max(12, 1.6 * s)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("👀", 0, -2.2 * s);
    }
    ctx.restore();
  }
  function rundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ---------------------------------------------------------------- Rendering: 3D
  // Einfache Perspektiv-Projektion mit Clipping an der Nahebene; Straßen liegen flach (z=0),
  // Fahrzeuge sind schattierte Quader, Schilder stehen als Billboards am Rand.
  function kamera3d(fokus) {
    const p = fokus.p;
    if (kameraModus === "fahrer") {
      const h = p.h, dx = Math.cos(h), dy = Math.sin(h);
      return mkCam(p.x + dx * 0.2 + Math.sin(h) * 0.35, p.y + dy * 0.2 - Math.cos(h) * 0.35, 1.2, h, 0.05, 1.05);
    }
    const h = fokus.hGlatt, dx = Math.cos(h), dy = Math.sin(h);
    const ab = 26, hoch = 11;
    return mkCam(p.x - dx * ab, p.y - dy * ab, hoch, h, 0.36, 0.95);
  }
  function mkCam(x, y, z, h, pitch, fovF) {
    const f = [Math.cos(pitch) * Math.cos(h), Math.cos(pitch) * Math.sin(h), -Math.sin(pitch)];
    const r = [-Math.sin(h), Math.cos(h), 0];
    const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
    return { e: [x, y, z], f, r, u, F: Math.min(Wpx, Hpx * 1.5) * fovF, near: 0.4 };
  }
  function zuCam(c, x, y, z) { const d = [x - c.e[0], y - c.e[1], z - c.e[2]]; return [d[0] * c.r[0] + d[1] * c.r[1] + d[2] * c.r[2], d[0] * c.u[0] + d[1] * c.u[1] + d[2] * c.u[2], d[0] * c.f[0] + d[1] * c.f[1] + d[2] * c.f[2]]; }
  function proj(c, q) { return [Wpx / 2 + q[0] / q[2] * c.F, Hpx * 0.42 - q[1] / q[2] * c.F]; }
  function clipNah(poly, near) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ai = a[2] >= near, bi = b[2] >= near;
      if (ai) out.push(a);
      if (ai !== bi) { const t = (near - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), near]); }
    }
    return out;
  }
  function poly3d(c, pts3, fill, stroke) {
    const q = clipNah(pts3.map(p => zuCam(c, p[0], p[1], p[2] || 0)), c.near);
    if (q.length < 3) return;
    ctx.beginPath(); q.forEach((p, i) => { const s = proj(c, p); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  // Fläche in Streifen zerlegen, damit Perspektive und Clipping auch bei langen Polygonen sauber bleiben
  function flaecheStreifen(poly, x0, x1, schritt) {
    const out = [];
    for (let x = x0; x < x1; x += schritt) out.push(clipX(poly, x - 0.3, Math.min(x1, x + schritt + 0.3)));   // leicht überlappend: keine Nahtlinien
    return out.filter(p => p.length >= 3);
  }
  function clipX(poly, a, b) {
    const clip = (pts, test, schnitt) => { const o = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], pi = test(p), qi = test(q); if (pi) o.push(p); if (pi !== qi) o.push(schnitt(p, q)); } return o; };
    let r = clip(poly, p => p[0] >= a, (p, q) => { const t = (a - p[0]) / (q[0] - p[0]); return [a, lerp(p[1], q[1], t)]; });
    r = clip(r, p => p[0] <= b, (p, q) => { const t = (b - p[0]) / (q[0] - p[0]); return [b, lerp(p[1], q[1], t)]; });
    return r;
  }
  function nebel(farbeHex, tiefe) {
    const k = clamp(tiefe / 900, 0, 0.75);
    const c = parseInt(farbeHex.slice(1), 16), r = c >> 16, g = (c >> 8) & 255, b = c & 255;
    const nr = 214, ng = 228, nb = 238;
    return `rgb(${Math.round(lerp(r, nr, k))},${Math.round(lerp(g, ng, k))},${Math.round(lerp(b, nb, k))})`;
  }
  function clipY(poly, a, b) {
    const sw = poly.map(p => [p[1], p[0]]);
    return clipX(sw, a, b).map(p => [p[1], p[0]]);
  }
  function bbox(poly) { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; poly.forEach(p => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }); return [x0, y0, x1, y1]; }
  // Fläche in Kacheln zerlegen (nur um die Kamera herum und nicht hinter ihr), damit Perspektive und Clipping sauber bleiben
  const SICHT = 520;
  function flaecheKacheln(poly, c, S) {
    const [bx0, by0, bx1, by1] = poly._bb || (poly._bb = bbox(poly));
    const ex = c.e[0], ey = c.e[1], fx = c.f[0], fy = c.f[1], fl = Math.hypot(fx, fy) || 1;
    const x0 = Math.max(bx0, ex - SICHT), x1 = Math.min(bx1, ex + SICHT), y0 = Math.max(by0, ey - SICHT), y1 = Math.min(by1, ey + SICHT);
    const out = [];
    if (x0 >= x1 || y0 >= y1) return out;
    const gx0 = Math.floor(x0 / S) * S, gy0 = Math.floor(y0 / S) * S;
    for (let gx = gx0; gx < x1; gx += S) {
      const sx = clipX(poly, Math.max(x0, gx) - 0.2, Math.min(x1, gx + S) + 0.2); if (sx.length < 3) continue;
      for (let gy = gy0; gy < y1; gy += S) {
        const mx = gx + S / 2 - ex, my = gy + S / 2 - ey;
        if ((mx * fx + my * fy) / fl < -S) continue;                  // hinter der Kamera
        const q = clipY(sx, Math.max(y0, gy) - 0.2, Math.min(y1, gy + S) + 0.2);
        if (q.length >= 3) out.push({ q, d: Math.hypot(mx, my) });
      }
    }
    return out;
  }
  const FARBE3D = { asphalt: "#4d5156", asphalt2: "#5d6165", sperr: "#4d5156", baustelle: "#4d5156", gehweg: "#b4b1a9", weiss: "#eeeee8", rad: "#a8553c", pflaster: "#8b8d91", parken: "#575b60", gruen: "#6c9450", gruen2: "#6f9a55", insel: "#6c9450", beton: "#9a9c9f" };
  function zeichne3d() {
    const liste = fahrzeugListe();
    const fokus = liste.find(e => e.f.fokus) || liste[0];
    if (_hGlatt === null) _hGlatt = fokus.p.h;
    else { const d = Math.atan2(Math.sin(fokus.p.h - _hGlatt), Math.cos(fokus.p.h - _hGlatt)); _hGlatt += d * 0.08; }
    fokus.hGlatt = _hGlatt;
    const c = kamera3d(fokus);
    // Himmel und Boden
    const hz = Hpx * 0.42 - (Math.tan(-Math.asin(c.f[2])) * c.F);
    const grad = ctx.createLinearGradient(0, 0, 0, Math.max(10, hz)); grad.addColorStop(0, FARBE.himmel1); grad.addColorStop(1, FARBE.himmel2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, Wpx, Hpx);
    const st = szene.strasse, boden = st.boden3d || "#6c9450";
    ctx.fillStyle = nebel(boden, 700); ctx.fillRect(0, hz, Wpx, Hpx - hz);
    // Boden-Kacheln rund um die Kamera für Tiefenwirkung
    const G = 50, gx0 = Math.floor((c.e[0] - SICHT) / G) * G, gy0 = Math.floor((c.e[1] - SICHT) / G) * G;
    for (let x = gx0; x < c.e[0] + SICHT; x += G) for (let y = gy0; y < c.e[1] + SICHT; y += G) {
      const mx = x + G / 2 - c.e[0], my = y + G / 2 - c.e[1]; if (mx * c.f[0] + my * c.f[1] < -G) continue;
      poly3d(c, [[x - 0.5, y - 0.5], [x + G + 0.5, y - 0.5], [x + G + 0.5, y + G + 0.5], [x - 0.5, y + G + 0.5]], nebel(boden, Math.hypot(mx, my)));
    }
    st.flaechen.forEach((f, fi) => {
      if (f.art === "gruen" && !f.zeigen3d) return;
      const z = 0.01 + (f.z || 0) + fi * 0.0005, farbe = f.farbe || FARBE3D[f.art] || FARBE3D.asphalt;
      flaecheKacheln(f.poly, c, 25).forEach(k => poly3d(c, k.q.map(p => [p[0], p[1], z]), nebel(farbe, k.d)));
      if (f.art === "sperr" || f.art === "baustelle") {
        const [x0, , x1] = f.poly._bb || bbox(f.poly);
        for (let x = x0; x < x1; x += 4) {
          const st2 = clipX(f.poly, x, x + 1.2); if (st2.length >= 3) poly3d(c, st2.map(p => [p[0], p[1], z + 0.01]), f.art === "baustelle" ? "#e9b82a" : "#e9e9e4");
        }
      }
    });
    st.linien.forEach(l => linie3d(c, l));
    // Objekte nach Tiefe sortiert: Fahrzeuge, Schilder, Pfosten, Häuser, Bäume, Ampeln
    const obj = [];
    const nah = (x, y) => { const dx = x - c.e[0], dy = y - c.e[1]; return dx * dx + dy * dy < SICHT * SICHT; };
    liste.forEach(e => { if (nah(e.p.x, e.p.y)) obj.push({ d: zuCam(c, e.p.x, e.p.y, 0.8)[2] - (e.f.geist ? 0.01 : 0), z: () => { if (e.f.geist) ctx.globalAlpha = 0.45; fahrzeug3d(c, e, e === fokus); ctx.globalAlpha = 1; } }); });
    (st.schilder || []).forEach(sc => { if (nah(sc.x, sc.y)) obj.push({ d: zuCam(c, sc.x, sc.y, 2)[2], z: () => schild3d(c, sc) }); });
    (st.objekte || []).forEach(o => { if (nah(o.x, o.y)) obj.push({ d: zuCam(c, o.x, o.y, 1)[2] + (o.art === "haus" ? Math.max(o.l, o.b) * 0.35 : 0), z: () => objekt3d(c, o) }); });
    st.linien.filter(l => l.art === "planke").forEach(l => entlang(l.pts, 8, (x, y) => { if (!nah(x, y)) return; const q = zuCam(c, x, y, 0.4); if (q[2] < c.near) return; obj.push({ d: q[2], z: () => poly3d(c, [[x, y, 0], [x + 0.2, y, 0], [x + 0.2, y, 0.75], [x, y, 0.75]], "#8d9296") }); }));
    obj.filter(o => o.d > c.near).sort((a, b) => b.d - a.d).forEach(o => o.z());
    if (szene.overlay3d) try { szene.overlay3d(c, { poly3d, zuCam, proj }, zeit); } catch (e) {}
    if (kameraModus === "fahrer") cockpit(fokus);
  }
  let _hGlatt = null;
  // Punkte im Abstand d entlang einer Polylinie
  function entlang(pts, d, fn) {
    let rest = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue;
      for (let s = rest; s < L; s += d) fn(lerp(a[0], b[0], s / L), lerp(a[1], b[1], s / L));
      rest = (rest - L) % d; if (rest < 0) rest += d;
    }
  }
  function linie3d(c, l) {
    const pts = l.pts, ex = c.e[0], ey = c.e[1];
    const sichtbar = (x, y) => { const dx = x - ex, dy = y - ey; return dx * dx + dy * dy < SICHT * SICHT && dx * c.f[0] + dy * c.f[1] > -30; };
    if (l.art === "planke") {
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < L; s += 20) { const t0 = s / L, t1 = Math.min(1, (s + 20) / L), x = lerp(a[0], b[0], t0), y = lerp(a[1], b[1], t0), x2 = lerp(a[0], b[0], t1), y2 = lerp(a[1], b[1], t1); if (!sichtbar(x, y) && !sichtbar(x2, y2)) continue; poly3d(c, [[x, y, 0.55], [x2, y2, 0.55], [x2, y2, 0.8], [x, y, 0.8]], nebel("#b7bcc1", Math.hypot(x - ex, y - ey))); } }
      return;
    }
    const b = (l.b || 0.15) / 2, m = strichMuster(l.art), farbe = l.farbe || "#f2f2ee";
    const P = l._P || (l._P = pfad(pts)); const periode = m ? m[0] + m[1] : 10;
    for (let s = 0; s < P.laenge; s += periode) {
      const len = m ? m[0] : Math.min(periode, P.laenge - s);
      const a = P.an(s), e = P.an(Math.min(P.laenge, s + len));
      if (!sichtbar(a.x, a.y) && !sichtbar(e.x, e.y)) continue;
      const nx = -Math.sin(a.h) * b, ny = Math.cos(a.h) * b, mx = -Math.sin(e.h) * b, my = Math.cos(e.h) * b;
      poly3d(c, [[a.x - nx, a.y - ny, 0.04], [e.x - mx, e.y - my, 0.04], [e.x + mx, e.y + my, 0.04], [a.x + nx, a.y + ny, 0.04]], nebel(farbe, Math.hypot(a.x - ex, a.y - ey)));
    }
  }
  function schatt(hex, k) { const c = parseInt(hex.slice(1), 16); const r = c >> 16, g = (c >> 8) & 255, b = c & 255; return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; }
  function quader(c, cx, cy, h, l, b, z0, z1, farbe, lichtK, extra) {
    const ch = Math.cos(h), sh = Math.sin(h);
    const P = (dl, db, z) => [cx + ch * dl - sh * db, cy + sh * dl + ch * db, z];
    const v = [P(-l / 2, -b / 2, z0), P(l / 2, -b / 2, z0), P(l / 2, b / 2, z0), P(-l / 2, b / 2, z0), P(-l / 2, -b / 2, z1), P(l / 2, -b / 2, z1), P(l / 2, b / 2, z1), P(-l / 2, b / 2, z1)];
    const flaechen = [
      { i: [4, 5, 6, 7], n: [0, 0, 1], k: 1.0 }, { i: [1, 2, 6, 5], n: [ch, sh, 0], k: 0.86, name: "vorn" }, { i: [0, 3, 7, 4], n: [-ch, -sh, 0], k: 0.7, name: "hinten" },
      { i: [0, 1, 5, 4], n: [sh, -ch, 0], k: 0.78, name: "links" }, { i: [2, 3, 7, 6], n: [-sh, ch, 0], k: 0.64, name: "rechts" }
    ];
    const sichtbar = flaechen.filter(fl => { const m = fl.i.map(j => v[j]).reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]); const d = [m[0] - c.e[0], m[1] - c.e[1], m[2] - c.e[2]]; return d[0] * fl.n[0] + d[1] * fl.n[1] + d[2] * fl.n[2] < 0; });
    sichtbar.forEach(fl => { poly3d(c, fl.i.map(j => v[j]), schatt(farbe, fl.k * (lichtK || 1))); if (extra) extra(fl, v, P); });
    return v;
  }
  function fahrzeug3d(c, e, istFokus) {
    if (kameraModus === "fahrer" && istFokus) return;
    const { f, p, sig } = e, T = TYPEN[f.typ];
    if (f.unsichtbar && f.unsichtbar(zeit)) return;
    if (T.person) {
      if (f.typ === "ball") { quader(c, p.x, p.y, p.h, 0.3, 0.3, 0, 0.3, f.farbe || "#e53935"); return; }
      const k = f.typ === "kind" ? 0.7 : 1;
      if (f.typ === "rad") { quader(c, p.x, p.y, p.h, 1.75, 0.08, 0.3, 0.75, "#2a2d31"); quader(c, p.x - Math.cos(p.h) * 0.8, p.y - Math.sin(p.h) * 0.8, p.h, 0.05, 0.05, 0, 0.7, "#2a2d31"); }
      const z0 = f.typ === "rad" ? 0.75 : 0;
      quader(c, p.x, p.y, p.h, 0.3 * k, 0.45 * k, z0 + (f.typ === "rad" ? 0 : 0.05), z0 + (f.typ === "rad" ? 0.85 : 1.45 * k), f.farbe || "#3a6ea5");
      quader(c, p.x, p.y, p.h, 0.22 * k, 0.22 * k, z0 + (f.typ === "rad" ? 0.85 : 1.45 * k), z0 + (f.typ === "rad" ? 1.08 : 1.72 * k), "#e8c4a0");
      return;
    }
    // Schatten
    const ch = Math.cos(p.h), sh = Math.sin(p.h), hl = T.l / 2 + 0.3, hb = T.b / 2 + 0.3;
    poly3d(c, [[p.x - ch * hl + sh * hb + 0.4, p.y - sh * hl - ch * hb + 0.4, 0.02], [p.x + ch * hl + sh * hb + 0.4, p.y + sh * hl - ch * hb + 0.4, 0.02], [p.x + ch * hl - sh * hb + 0.4, p.y + sh * hl + ch * hb + 0.4, 0.02], [p.x - ch * hl - sh * hb + 0.4, p.y - sh * hl + ch * hb + 0.4, 0.02]], "rgba(0,0,0,.32)");
    const licht = (fl, v) => {
      if (fl.name !== "hinten" && fl.name !== "vorn") return;
      const hinten = fl.name === "hinten";
      // Leuchten als kleine Flächen an den Ecken der Front-/Heckfläche
      const ecke = (links) => { const a = v[fl.i[links ? 0 : 1]], bb = v[fl.i[links ? 3 : 2]]; return [lerp(a[0], bb[0], 0.3), lerp(a[1], bb[1], 0.3)]; };
      [true, false].forEach(links => {
        const idxBase = hinten ? (links ? 0 : 3) : (links ? 1 : 2);
        const q = v[idxBase]; const z = T.h * 0.38;
        const seiteBlink = (sig.warn || sig.blinker) && blinkAn() && (sig.warn || (sig.blinker === "links") === links);
        const farbe = seiteBlink ? "#ffb21e" : hinten ? (sig.bremse ? "#ff2020" : sig.rueck && !links ? "#ffffff" : "#8a1616") : "#f4f1dd";
        const off = 0.28;
        const dirL = hinten ? [-ch, -sh] : [ch, sh];
        const sx = q[0] + dirL[0] * 0.02, sy = q[1] + dirL[1] * 0.02;
        const tl = [(-sh) * (links ? off : -off), ch * (links ? off : -off)];
        poly3d(c, [[sx, sy, z], [sx + tl[0], sy + tl[1], z], [sx + tl[0], sy + tl[1], z + 0.22], [sx, sy, z + 0.22]], farbe);
      });
    };
    const zb = f.typ === "lkw" ? 0.5 : 0.28;
    if (f.typ === "bus") {
      quader(c, p.x, p.y, p.h, T.l, T.b, 0.35, T.h, f.farbe, 1, (fl, v) => {
        if (fl.name === "links" || fl.name === "rechts" || fl.name === "vorn") { const i = fl.i.map(j => v[j]); poly3d(c, [lerpP(i[0], i[1], .04, .45), lerpP(i[0], i[1], .96, .45), lerpP(i[3], i[2], .96, .85), lerpP(i[3], i[2], .04, .85)], "#2b3945"); }
        licht(fl, v);
      });
      if (f.schulbus) quader(c, p.x, p.y, p.h, 2.2, T.b + 0.02, 2.0, 2.4, "#f5c518");
    } else if (f.typ === "lkw") {
      // Auflieger + Zugmaschine
      const aL = T.l - 3.2; const ax = p.x - ch * (T.l / 2 - aL / 2), ay = p.y - sh * (T.l / 2 - aL / 2);
      quader(c, ax, ay, p.h, aL, T.b, 1.0, T.h, "#e6e6e3", 1, licht);
      const zx = p.x + ch * (T.l / 2 - 1.5), zy = p.y + sh * (T.l / 2 - 1.5);
      quader(c, zx, zy, p.h, 2.9, T.b, zb, 3.1, f.farbe, 1, (fl, v) => { if (fl.name === "vorn") { const a = v[fl.i[0]], b2 = v[fl.i[1]], d = v[fl.i[2]], e2 = v[fl.i[3]]; poly3d(c, [[lerp(a[0], e2[0], .12), lerp(a[1], e2[1], .12), 1.9], [lerp(b2[0], d[0], .12), lerp(b2[1], d[1], .12), 1.9], [lerp(b2[0], d[0], .12), lerp(b2[1], d[1], .12), 2.8], [lerp(a[0], e2[0], .12), lerp(a[1], e2[1], .12), 2.8]], "#26323d"); } licht(fl, v); });
    } else {
      const unten = T.h * 0.55;
      quader(c, p.x, p.y, p.h, T.l, T.b, zb, unten, f.farbe, 1, licht);
      // Kabine (Dach + Scheiben)
      const kL = T.l * (f.typ === "transporter" || f.typ === "rtw" ? 0.8 : 0.52), kx = p.x - ch * T.l * (f.typ === "transporter" || f.typ === "rtw" ? 0.05 : 0.08), ky = p.y - sh * T.l * (f.typ === "transporter" || f.typ === "rtw" ? 0.05 : 0.08);
      quader(c, kx, ky, p.h, kL, T.b * 0.9, unten, T.h, f.farbe, 1, (fl, v) => {
        if (fl.name) { const i = fl.i.map(j => v[j]); poly3d(c, [lerpP(i[0], i[1], .1, .15), lerpP(i[0], i[1], .9, .15), lerpP(i[3], i[2], .9, .85), lerpP(i[3], i[2], .1, .85)], fl.name === "vorn" || fl.name === "hinten" ? "#2b3945" : "#344452"); }
      });
      if (f.typ === "fahrschule") { const dx = p.x - ch * 0.3, dy = p.y - sh * 0.3; quader(c, dx, dy, p.h, 0.9, 0.35, T.h, T.h + 0.28, "#1f5fa8"); }
      if (f.blau) { const on = blinkAn(); quader(c, p.x + ch * 0.8, p.y + sh * 0.8, p.h, 0.4, T.b * 0.7, T.h, T.h + 0.2, on ? "#4d8dff" : "#1b3c80"); }
    }
  }
  function objekt3d(c, o) {
    if (o.art === "haus") {
      quader(c, o.x, o.y, o.h || 0, o.l, o.b, 0, o.hoehe || 7, o.farbe || "#d9cfbf", 1, (fl, v) => {
        if (!fl.name) return; const i = fl.i.map(j => v[j]), n = Math.max(1, Math.round((fl.name === "vorn" || fl.name === "hinten" ? o.b : o.l) / 3.2));
        for (let k = 0; k < n; k++) for (let st2 = 0; st2 < Math.max(1, Math.floor((o.hoehe || 7) / 3)); st2++) {
          const a = (k + 0.3) / n, b = (k + 0.7) / n, z0 = (st2 * 3 + 1) / (o.hoehe || 7), z1 = (st2 * 3 + 2.2) / (o.hoehe || 7);
          if (z1 > 0.95) continue;
          const Wp = (t, zt) => [lerp(i[0][0], i[1][0], t), lerp(i[0][1], i[1][1], t), lerp(i[0][2], i[3][2], zt)];
          poly3d(c, [Wp(a, z0), Wp(b, z0), Wp(b, z1), Wp(a, z1)], "#50606e");
        }
      });
      quader(c, o.x, o.y, o.h || 0, o.l + 0.4, o.b + 0.4, o.hoehe || 7, (o.hoehe || 7) + 0.5, o.dach || "#a7553f");
    } else if (o.art === "baum") {
      quader(c, o.x, o.y, 0, 0.35, 0.35, 0, 2.2, "#6b4a2f");
      const r = o.r || 2.2; quader(c, o.x, o.y, 0.6, r * 1.5, r * 1.5, 2, 2 + r * 1.7, "#3f7a34"); quader(c, o.x, o.y, 0, r, r, 2 + r * 1.2, 2 + r * 2.1, "#4d8a3e");
    } else if (o.art === "ampel") {
      quader(c, o.x, o.y, o.h || 0, 0.14, 0.14, 0, 2.3, "#55595e");
      const n = o.fuss ? 2 : 3, f = LAMPE[ampelFarbe(o, zeit)] || LAMPE.aus, farben = o.fuss ? [f[0], f[2]] : f, leer = o.fuss ? ["#3a1210", "#0f3219"] : ["#3a1210", "#3a2e0c", "#0f3219"];
      const z0 = 2.3, hk = n * 0.33 + 0.1; quader(c, o.x, o.y, o.h || 0, 0.3, 0.35, z0, z0 + hk, "#1c1e21");
      // Lampen auf der Seite, die dem Verkehr zugewandt ist (o.h = Blickrichtung der Ampel)
      const ch = Math.cos(o.h || 0), sh = Math.sin(o.h || 0), fx = o.x + ch * 0.17, fy = o.y + sh * 0.17;
      for (let i = 0; i < n; i++) { const z = z0 + hk - 0.2 - i * 0.33; poly3d(c, [[fx - sh * 0.1, fy + ch * 0.1, z - 0.1], [fx + sh * 0.1, fy - ch * 0.1, z - 0.1], [fx + sh * 0.1, fy - ch * 0.1, z + 0.1], [fx - sh * 0.1, fy + ch * 0.1, z + 0.1]], farben[i] || leer[i]); }
      if (o.gruenpfeil) {                                         // Grünpfeil-Blechschild rechts neben dem Rotlicht
        const rx = sh, ry = -ch, gx = o.x + rx * 0.45 + ch * 0.18, gy = o.y + ry * 0.45 + sh * 0.18, zg = z0 + hk - 0.34;
        poly3d(c, [[gx - rx * 0.18, gy - ry * 0.18, zg - 0.15], [gx + rx * 0.18, gy + ry * 0.18, zg - 0.15], [gx + rx * 0.18, gy + ry * 0.18, zg + 0.15], [gx - rx * 0.18, gy - ry * 0.18, zg + 0.15]], "#111316");
        poly3d(c, [[gx - rx * 0.12, gy - ry * 0.12, zg - 0.03], [gx + rx * 0.06, gy + ry * 0.06, zg - 0.03], [gx + rx * 0.06, gy + ry * 0.06, zg - 0.08], [gx + rx * 0.14, gy + ry * 0.14, zg], [gx + rx * 0.06, gy + ry * 0.06, zg + 0.08], [gx + rx * 0.06, gy + ry * 0.06, zg + 0.03], [gx - rx * 0.12, gy - ry * 0.12, zg + 0.03]], "#2fbf5a");
      }
    } else if (o.art === "poller" || o.art === "bake") {
      quader(c, o.x, o.y, 0, 0.25, 0.25, 0, o.art === "bake" ? 1.0 : 0.9, o.art === "bake" ? "#d4202a" : "#6d7176");
    } else if (o.art === "kegel") { quader(c, o.x, o.y, 0, 0.35, 0.35, 0, 0.5, "#f07a1a"); }
  }
  function lerpP(a, b, t, zt) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], zt)]; }
  function schild3d(c, sc) {
    const img = schildBild(sc.typ); const hoehe = sc.typ.startsWith("z450") ? 1.6 : 2.4;
    const fuss = zuCam(c, sc.x, sc.y, 0), kopf = zuCam(c, sc.x, sc.y, hoehe + 2.2);
    if (fuss[2] < c.near || kopf[2] < c.near) return;
    const pf = proj(c, fuss), pk = proj(c, kopf);
    const gr = hoehe * c.F / kopf[2];
    ctx.strokeStyle = "#8e9398"; ctx.lineWidth = Math.max(1, 0.12 * c.F / fuss[2]); ctx.beginPath(); ctx.moveTo(pf[0], pf[1]); ctx.lineTo(pk[0], pk[1] + gr * 0.5); ctx.stroke();
    ctx.globalAlpha = clamp(1 - kopf[2] / 1200, 0.25, 1); ctx.drawImage(img, pk[0] - gr / 2, pk[1] - gr / 2, gr, gr); ctx.globalAlpha = 1;
  }
  function cockpit(fokus) {
    // Armaturenbrett + Spiegel-Hinweise in der Fahrersicht
    const h = Hpx * 0.2;
    ctx.fillStyle = "#1b1f23"; ctx.beginPath(); ctx.moveTo(0, Hpx); ctx.lineTo(0, Hpx - h * 0.8); ctx.quadraticCurveTo(Wpx / 2, Hpx - h * 1.25, Wpx, Hpx - h * 0.8); ctx.lineTo(Wpx, Hpx); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2c3238"; ctx.lineWidth = 16 * dpr; ctx.beginPath(); ctx.arc(Wpx * 0.3, Hpx + h * 0.2, h * 0.9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    // Innenspiegel
    ctx.fillStyle = "#222"; rundRect(Wpx / 2 - 70 * dpr, 12 * dpr, 140 * dpr, 34 * dpr, 8 * dpr); ctx.fill();
    ctx.fillStyle = "#6f8aa0"; rundRect(Wpx / 2 - 64 * dpr, 16 * dpr, 128 * dpr, 26 * dpr, 6 * dpr); ctx.fill();
  }

  // ---------------------------------------------------------------- Selbst fahren
  function starteFahren() {
    if (szene.rangieren) return starteRangieren();
    if (szene.reaktion) return starteReaktion();
    return starteSpur();
  }
  function starteSpur() {
    const F = szene.fahren;
    const st = {
      t: 0, v: F.start.v / KMH, pfad: F.start.pfad, s: F.start.s || 0, spur: F.spurStart, blinker: null, blinkerSeit: -99, blinkerAusT: null, schulter: [], wechsel: null,
      gas: false, bremse: false, log: [], ende: false, kollision: false, tippIdx: 0, maxV: 0,
      gebremstAufHaupt: false, minVHaupt: Infinity, blinkerVergessen: false, steht: 0,
      verkehr: F.verkehr.map((q, i) => ({ id: "v" + i, typ: q.typ, farbe: q.farbe, x: q.x0, y: q.y, v: q.v / KMH, v0: q.v / KMH, a: 0, gegen: !!q.gegen })),
      minFolge: Infinity, minZeitGegen: Infinity, maxVLinks: 0, verbot: false, ueberholt: false,
      behinderung: 0,
      liste() {
        const pos = this.pos();
        const out = [{ f: { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true }, p: pos, sig: { blinker: this.blinker, bremse: this.bremse, schulter: this.schulter.find(s => this.t >= s.von && this.t < s.bis) || null } }];
        this.verkehr.forEach(q => out.push({ f: { id: q.id, typ: q.typ, farbe: q.farbe }, p: { x: q.x, y: q.y, h: q.gegen ? Math.PI : 0, v: q.v }, sig: { blinker: null, bremse: q.a < -0.8 } }));
        return out;
      },
      pos() { const p = this.pfad.an(this.s); return { x: p.x, y: p.y, h: p.h, v: this.v }; }
    };
    fahr = st; zeit = 0; _hGlatt = null;
  }
  function spurY(n) { return szene.fahren.spuren[n]; }
  // Nächste Fahrzeuge vor und hinter der Stelle x im Fahrstreifen y: Lücke (Stoßstange zu Stoßstange) und Tempo
  function luecken(st, y, x) {
    let vorne = null, hinten = null; const T = TYPEN;
    st.verkehr.forEach(q => { if (q.gegen || Math.abs(q.y - y) > 1.2) return; const d = q.x - x; if (d >= 0 && (!vorne || d < vorne.d)) vorne = { d, q }; if (d < 0 && (!hinten || -d < hinten.d)) hinten = { d: -d, q }; });
    return {
      vorn: vorne ? vorne.d - (T[vorne.q.typ].l + T.fahrschule.l) / 2 : 999, hinten: hinten ? hinten.d - (T[hinten.q.typ].l + T.fahrschule.l) / 2 : 999,
      vVorn: vorne ? vorne.q.v * KMH : 0, vHinten: hinten ? hinten.q.v * KMH : 0
    };
  }
  function wechsleSpur(richtung) {
    const F = szene.fahren, st = fahr; if (!st || st.ende || st.wechsel || !laeuft) return;
    const namen = Object.keys(F.spuren).sort((a, b) => F.spuren[a] - F.spuren[b]);
    const i = namen.indexOf(st.spur), ziel = namen[i + (richtung === "links" ? -1 : 1)];
    if (!ziel) return;
    const p = st.pos();
    if (!F.wechselErlaubt(p.x, st.spur, ziel)) {
      const text = F.wechselHinweis ? F.wechselHinweis(p.x, st.spur, ziel) : "Hier ist kein Fahrstreifenwechsel möglich.";
      st.log.push({ t: st.t, typ: "hinweis", text }); zeigeToast(text); return;
    }
    let L = F.wechselFaktor ? Math.max(25, st.v * F.wechselFaktor) : Math.max(40, st.v * 3.2);
    const grenze = F.wechselBis && F.wechselBis[st.spur + ">" + ziel];
    if (grenze !== undefined) L = clamp(grenze - p.x, 25, L);
    const pts = [[p.x, p.y]].concat(spurPfad(p.x + 2, p.x + L, p.y, [{ x: p.x + 2, y: spurY(ziel), laenge: L - 2 }]).slice(1));
    // danach Zielfahrstreifen bis zum Ende bzw. auf die Rampe
    let rest = spurPfad(p.x + L + 2, szene.strasse.bereich[1] + 400, spurY(ziel));
    if (ziel === "aus" && F.rampe) rest = spurPfad(p.x + L + 2, F.rampeAb, spurY(ziel)).concat(F.rampe.slice(1));
    st.pfad = pfad(pts.concat(rest)); st.s = 0;
    const lk = luecken(st, spurY(ziel), p.x);
    st.wechsel = { typ: "wechsel", t: st.t, von: st.spur, nach: ziel, x: p.x, v: st.v * KMH,
      blinkerDauer: st.blinker === richtung ? st.t - st.blinkerSeit : -1,
      schulter: st.schulter.some(s => s.seite === richtung && st.t - s.von <= 3.5 && st.t >= s.von),
      lueckeVorn: lk.vorn, lueckeHinten: lk.hinten, vVorn: lk.vVorn, vHinten: lk.vHinten };
    st.log.push(st.wechsel);                                      // derselbe Eintrag wird am Ende des Wechsels ergänzt
  }
  function fahrSchritt(dt) {
    if (szene.rangieren) return rangierSchritt(dt);
    if (szene.reaktion) return reaktionSchritt(dt);
    const st = fahr, F = szene.fahren; if (!st || st.ende) return;
    st.t += dt;
    const a = st.gas ? 2.6 : st.bremse ? -6 : -0.35;
    st.v = clamp(st.v + a * dt, 0, 150 / KMH);
    st.s += st.v * dt; st.maxV = Math.max(st.maxV, st.v * KMH);
    const p = st.pos();
    if (st.wechsel && Math.abs(p.y - spurY(st.wechsel.nach)) < 0.15) {
      // Wechsel abgeschlossen: Abstände jetzt noch einmal messen (vorn zählt der Abstand nach dem Einscheren)
      const w = st.wechsel, lk = luecken(st, spurY(w.nach), p.x);
      w.fertig = st.t; w.lueckeVornEnde = lk.vorn; w.lueckeHinten = Math.min(w.lueckeHinten, lk.hinten); w.vHinten = Math.max(w.vHinten, lk.vHinten); if (lk.vVorn) w.vVorn = lk.vVorn;
      st.spur = w.nach; st.letzterWechsel = w; st.wechsel = null; st.log.push({ t: st.t, typ: "fertig", nach: st.spur });
    }
    // Blinker nach einem Wechsel stehen gelassen?
    const lw = st.letzterWechsel;
    if (lw && !st.wechsel && st.blinker && st.t - lw.fertig > 5 && st.blinkerSeit <= lw.t && !(F.bewerten === "abfahren" && st.spur === "rechts" && p.x > -200)) st.blinkerVergessen = true;
    if (F.kurveX !== undefined && st.vKurve === undefined && st.spur === "aus" && p.x >= F.kurveX) st.vKurve = st.v * KMH;
    // Abfahren: auf der durchgehenden Fahrbahn nicht bremsen und nicht unnötig langsam fahren
    if (F.bewerten === "abfahren" && st.spur !== "aus" && p.y < W) {
      if (st.bremse && st.v > 70 / KMH) st.gebremstAufHaupt = true;
      if (p.x > (F.start.pfad.an(F.start.s || 0).x + 60) && p.x < 0) st.minVHaupt = Math.min(st.minVHaupt, st.v * KMH);
    }
    if (F.bewerten === "ueberholen") {
      const vor = st.verkehr.filter(q => !q.gegen && Math.abs(q.y - spurY("rechts")) < 1 && q.x > p.x).sort((a, b) => a.x - b.x)[0];
      if (vor && !st.ueberholt && p.y > 0.5 && st.v > 30 / KMH) st.minFolge = Math.min(st.minFolge, vor.x - p.x - (TYPEN[vor.typ].l + TYPEN.fahrschule.l) / 2);
      if (p.y < 0.9) {                                               // (teilweise) auf der Gegenfahrbahn
        st.maxVLinks = Math.max(st.maxVLinks, st.v * KMH);
        st.verkehr.filter(q => q.gegen && q.x > p.x).forEach(q => { const d = q.x - p.x - (TYPEN[q.typ].l + TYPEN.fahrschule.l) / 2; st.minZeitGegen = Math.min(st.minZeitGegen, d / (st.v + q.v0)); });
        if (p.x >= F.verbotVon && p.x <= F.verbotBis) st.verbot = true;
      }
      if (st.spur === "rechts" && st.log.some(l => l.typ === "fertig" && l.nach === "links")) st.ueberholt = true;
    }
    // Verkehr: jedes Fahrzeug folgt seinem Vordermann (auch dem Fahrschulauto, sobald es in den Fahrstreifen ragt)
    const T = TYPEN;
    st.verkehr.forEach(q => {
      if (q.gegen) { q.x -= q.v0 * dt; q.v = q.v0; return; }        // Gegenverkehr fährt gleichmäßig entgegen
      let gap = Infinity, vVor = q.v0, istFs = false;
      const imStreifen = Math.abs(p.y - q.y) < (T.fahrschule.b + T[q.typ].b) / 2 + 0.3;
      if (imStreifen && p.x > q.x) { gap = p.x - q.x - (T.fahrschule.l + T[q.typ].l) / 2; vVor = st.v; istFs = true; }
      st.verkehr.forEach(o => { if (o === q || o.gegen || Math.abs(o.y - q.y) > 1 || o.x <= q.x) return; const d = o.x - q.x - (T[o.typ].l + T[q.typ].l) / 2; if (d < gap) { gap = d; vVor = o.v; istFs = false; } });
      const soll = 4 + q.v * 1.1;                                  // gewünschter Abstand: 1,1 s + 4 m
      let aq = gap === Infinity ? 0.8 * (q.v0 - q.v) : Math.min(0.8 * (q.v0 - q.v), 0.6 * (gap - soll) + 1.2 * (vVor - q.v));
      aq = clamp(aq, -8, 1.5); q.v = clamp(q.v + aq * dt, 0, q.v0 * 1.02); q.x += q.v * dt; q.a = aq;
      if (istFs && aq < -1.5) st.behinderung = Math.max(st.behinderung, -aq);
    });
    // Kollision
    st.verkehr.forEach(q => { if (Math.abs(q.x - p.x) < (T[q.typ].l + T.fahrschule.l) / 2 - 0.3 && Math.abs(q.y - p.y) < (T[q.typ].b + T.fahrschule.b) / 2 - 0.15) { st.kollision = true; st.ende = true; } });
    // Tipps
    if (F.tipps[st.tippIdx] && p.x >= F.tipps[st.tippIdx].x) { zeigeCoach(F.tipps[st.tippIdx].text); st.tippIdx++; }
    // Ende-Bedingungen (ein laufender Fahrstreifenwechsel wird immer erst zu Ende gefahren)
    st.steht = st.v < 0.5 ? st.steht + dt : 0;
    if (!st.wechsel) {
      if (F.bewerten === "auffahren") {
        if (st.spur === "einf" && p.x >= F.grenzeEnde) { st.ende = true; st.endeGrund = "streifenende"; }
        if (st.spur !== "einf" && lw && st.t - lw.fertig > 4) st.ende = true;
      } else if (F.bewerten === "ueberholen") {
        if (st.ueberholt && lw && lw.nach === "rechts" && st.t - lw.fertig > 5) st.ende = true;
        if (p.x > F.verbotBis + 60) st.ende = true;
      } else {
        if (st.s >= st.pfad.laenge - 1 || (st.spur === "aus" && p.x >= F.rampeAb + 90)) st.ende = true;
        if (st.spur !== "aus" && p.x > szene.strasse.bereich[1] - 40) { st.ende = true; st.endeGrund = "verpasst"; }
        if (st.spur !== "aus" && st.steht > 4) { st.ende = true; st.endeGrund = "angehalten"; }   // Halten auf der Autobahn
      }
    }
    // Sicherheitsnetz: nach 40 s Stillstand oder 3 Minuten endet jede Fahrt
    if (!st.ende && (st.steht > 40 || st.t > 180)) { st.ende = true; st.endeGrund = "abgebrochen"; }
    if (st.ende) { laeuft = false; zeigeAuswertung(bewerte()); }
  }
  function bewerte() {
    if (szene.rangieren) return bewerteRangieren();
    if (szene.reaktion) return bewerteReaktion();
    const st = fahr, F = szene.fahren, P = [];
    const ok = (bed, titel, text, regel) => P.push({ ok: !!bed, titel, text, regel });
    if (st.kollision) ok(false, "Kollision", F.bewerten === "auffahren" ? "Es hat gekracht: Die Lücke war zu klein oder der Fahrstreifen nicht frei." : "Es hat gekracht: zu dicht aufgefahren oder ohne freien Fahrstreifen gewechselt.", F.bewerten === "auffahren" ? "§ 18 Abs. 3 · § 7 Abs. 5 StVO" : "§ 4 Abs. 1 · § 7 Abs. 5 · § 1 Abs. 2 StVO");
    if (st.endeGrund === "abgebrochen") ok(false, "Fahrt nicht beendet", "Die Fahrt hat zu lange gedauert oder das Auto stand zu lange. Einfach noch einmal versuchen.", "§ 18 StVO");
    const wechsel = st.log.filter(l => l.typ === "wechsel");
    const blinkerOk = !st.blinkerVergessen && !(st.blinker && st.letzterWechsel && !st.wechsel && st.blinkerSeit <= st.letzterWechsel.t);
    if (F.bewerten === "ueberholen") {
      const w1 = wechsel.find(x => x.nach === "links"), w2 = wechsel.find(x => x.nach === "rechts" && w1 && x.t > w1.t);
      if (!w1) { if (!st.kollision) P.push({ ok: true, titel: "Nicht überholt", text: "Kein Überholvorgang – das ist richtig, wenn es nicht sicher war. Zum Üben: Lücke im Gegenverkehr abwarten, dann zügig überholen.", regel: "§ 5 Abs. 2 StVO" }); return P; }
      ok(st.minFolge >= 15, "Abstand vor dem Überholen", st.minFolge >= 999 ? "Abstand gehalten." : `Kleinster Abstand zum Lkw ${Math.round(st.minFolge)} m.` + (st.minFolge < 15 ? " Zu dicht – mit Abstand sieht man mehr und kann besser beschleunigen." : ""), "§ 4 Abs. 1 · § 5 Abs. 2 StVO");
      ok(w1.blinkerDauer >= 1.5, "Blinker links", w1.blinkerDauer >= 1.5 ? "Ausscheren rechtzeitig angekündigt." : "Ausscheren nicht oder zu spät angekündigt.", "§ 5 Abs. 4a StVO");
      ok(w1.schulter, "Schulterblick links", w1.schulter ? "Vor dem Ausscheren nach hinten links gesichert." : "Schulterblick links fehlte – vielleicht überholt dich gerade jemand.", "§ 5 Abs. 4 StVO");
      ok(!st.kollision && st.minZeitGegen >= 4, "Gegenverkehr", st.minZeitGegen <= 0.05 ? "Zusammenstoß mit dem Gegenverkehr – die Lücke war viel zu klein." : st.minZeitGegen >= 999 ? "Die Gegenfahrbahn war frei." : `Knappste Zeitlücke zum Gegenverkehr: ${st.minZeitGegen.toFixed(1)} s.` + (st.minZeitGegen < 4 ? " Viel zu knapp – das war eine Gefährdung." : ""), "§ 5 Abs. 2 StVO");
      ok(st.maxVLinks <= 103, "Höchstgeschwindigkeit", `Beim Überholen höchstens ${Math.round(st.maxVLinks)} km/h (erlaubt 100).`, "§ 3 Abs. 3 · § 5 Abs. 2 StVO");
      ok(!st.verbot, "Überholverbot beachtet", st.verbot ? "Im Bereich des Überholverbots (Zeichen 276 / durchgezogene Linie) auf der Gegenfahrbahn gewesen." : "Das Überholverbot wurde beachtet.", "Zeichen 276 · Zeichen 295");
      if (w2) {
        ok(w2.blinkerDauer >= 0.5, "Blinker rechts beim Einordnen", w2.blinkerDauer >= 0.5 ? "Wiedereinordnen angekündigt." : "Beim Wiedereinordnen rechts blinken.", "§ 5 Abs. 4a StVO");
        ok(w2.lueckeHinten >= 15 && st.behinderung < 2, "Mit Abstand eingeschert", `Abstand zum Überholten beim Einscheren ${Math.round(Math.min(w2.lueckeHinten, 999))} m.` + (st.behinderung >= 2 ? " Der Lkw musste bremsen – zu früh eingeschert." : w2.lueckeHinten < 15 ? " Zu knapp – erst einscheren, wenn der Überholte im Innenspiegel ganz zu sehen ist." : ""), "§ 5 Abs. 4 StVO");
        ok(blinkerOk, "Blinker aus", blinkerOk ? "Nach dem Einordnen Blinker aus." : "Blinker nach dem Wechsel ausschalten.", "§ 5 Abs. 4a StVO");
      } else ok(false, "Wieder eingeordnet", "Nicht auf den rechten Fahrstreifen zurückgekehrt.", "§ 5 Abs. 4 · § 2 Abs. 2 StVO");
      return P;
    }
    if (F.bewerten === "auffahren") {
      const w = wechsel.find(x => x.von === "einf" && x.nach === "rechts" && x.fertig);
      if (!w) { ok(false, "Nicht eingefädelt", st.endeGrund === "streifenende" ? "Ende des Einfädelungsstreifens erreicht. Richtig wäre: früher Gas geben und eine Lücke nutzen – notfalls am Ende anhalten und warten." : "Der Wechsel auf die Autobahn hat nicht stattgefunden.", "§ 18 Abs. 3 StVO"); }
      else {
        ok(w.blinkerDauer >= 2, "Blinker links", w.blinkerDauer >= 2 ? `Rechtzeitig geblinkt (${w.blinkerDauer.toFixed(1)} s vorher).` : w.blinkerDauer >= 0 ? "Zu spät geblinkt – mindestens 2–3 Sekunden vor dem Wechsel." : "Nicht geblinkt.", "§ 7 Abs. 5 StVO");
        ok(w.schulter, "Schulterblick links", w.schulter ? "Schulterblick kurz vor dem Wechsel – sehr gut." : "Kein Schulterblick direkt vor dem Wechsel. Der tote Winkel bleibt sonst unsichtbar.", "§ 7 Abs. 5 StVO");
        const ausStand = w.v < 15;                                    // angehalten und gewartet: richtig, wenn keine Lücke da war
        const vRef = w.vVorn || w.vHinten || 90;
        if (ausStand) ok(true, "Angehalten und gewartet", "Keine passende Lücke – angehalten und gewartet. Das ist richtig, wenn es anders nicht geht. Aus dem Stand nur in eine sehr große Lücke einfädeln." + (w.x < F.grenzeEnde - 80 ? " Tipp: dafür bis ans Ende des Streifens vorfahren." : ""), "§ 18 Abs. 3 StVO");
        else ok(Math.abs(w.v - vRef) <= 20 && w.v >= 70, "Geschwindigkeit angepasst", `Beim Einfädeln ${Math.round(w.v)} km/h, Verkehr rechts ca. ${Math.round(vRef)} km/h.` + (w.v < 70 ? " Zu langsam – andere müssen bremsen." : Math.abs(w.v - vRef) > 20 ? " Tempo besser an den Verkehr angleichen." : ""), "§ 7a Abs. 2 · § 18 Abs. 3 StVO");
        const vorn = Math.min(w.lueckeVorn, w.lueckeVornEnde ?? w.lueckeVorn), halbV = Math.max(20, w.v / 2);
        ok(vorn >= halbV * 0.6, "Abstand nach vorn", vorn >= 999 ? "Vor dir war frei." : `Lücke nach vorn ${Math.round(vorn)} m (Faustregel halber Tacho: ${Math.round(halbV)} m).`, "§ 4 Abs. 1 StVO");
        const halbH = w.vHinten / 2;
        const hintenOk = w.lueckeHinten >= Math.max(12, halbH * 0.5) && st.behinderung < 3;
        ok(hintenOk, "Vorfahrt beachtet", (w.lueckeHinten >= 999 ? "Hinter dir war frei." : `Abstand zum Fahrzeug dahinter ${Math.round(w.lueckeHinten)} m bei ${Math.round(w.vHinten)} km/h.`) + (st.behinderung >= 3 ? ` Der Verkehr hinter dir musste stark bremsen (${st.behinderung.toFixed(1)} m/s²) – er hat Vorfahrt.` : hintenOk ? "" : " Zu knapp – er muss bremsen, er hat Vorfahrt."), "§ 18 Abs. 3 StVO");
        ok(blinkerOk, "Blinker aus", blinkerOk ? "Nach dem Einfädeln Blinker aus." : "Blinker nach dem Wechsel ausschalten.", "§ 7 Abs. 5 StVO");
      }
    } else {
      const w1 = wechsel.find(x => x.von === "links" && x.nach === "rechts");
      const w2 = wechsel.find(x => x.von === "rechts" && x.nach === "aus");
      ok(w1 && w1.x <= -300, "Früh eingeordnet", w1 ? (w1.x <= -300 ? "Rechtzeitig vor den Baken rechts eingeordnet." : "Sehr spät nach rechts gewechselt – besser vor der 300-m-Bake.") : "Nicht nach rechts gewechselt.", "§ 7 Abs. 5 StVO");
      if (w1) { ok(w1.blinkerDauer >= 2, "Blinker beim Wechsel nach rechts", w1.blinkerDauer >= 2 ? "Rechtzeitig geblinkt." : "Nicht oder zu spät geblinkt.", "§ 7 Abs. 5 StVO"); ok(w1.schulter, "Schulterblick rechts", w1.schulter ? "Schulterblick gemacht." : "Schulterblick fehlte.", "§ 7 Abs. 5 StVO"); }
      if (w1) ok(!st.blinkerVergessen, "Blinker wieder aus", !st.blinkerVergessen ? "Nach dem Wechsel Blinker aus – erst vor der Ausfahrt wieder setzen." : "Der Blinker blieb nach dem Wechsel an. Andere wissen dann nicht, was du vorhast.", "§ 7 Abs. 5 StVO");
      if (st.minVHaupt < Infinity) ok(st.minVHaupt >= 80, "Tempo gehalten", st.minVHaupt >= 80 ? "Bis zur Ausfahrt zügig weitergefahren." : `Auf der Autobahn bis auf ${Math.round(st.minVHaupt)} km/h verlangsamt. Ohne Grund nicht so langsam fahren – erst auf dem Ausfädelungsstreifen bremsen.`, "§ 3 Abs. 2 · § 7a Abs. 3 StVO");
      if (st.endeGrund === "angehalten") ok(false, "Nicht auf der Autobahn anhalten", "Auf der Autobahn ist Halten verboten – auch auf dem Seitenstreifen nur im Notfall. Gleichmäßig weiterfahren.", "§ 18 Abs. 8 StVO");
      if (!w2) ok(false, "Ausfahrt genommen", st.endeGrund === "verpasst" ? "Ausfahrt verpasst. Richtig: weiterfahren bis zur nächsten Ausfahrt – nie zurücksetzen." : "Nicht auf den Ausfädelungsstreifen gewechselt.", "§ 18 Abs. 7 StVO");
      else {
        ok(w2.blinkerDauer >= 2, "Blinker vor der Ausfahrt", w2.blinkerDauer >= 2 ? "Rechtzeitig rechts geblinkt." : "Blinker zu spät oder nicht gesetzt.", "§ 7 Abs. 5 StVO");
        ok(w2.schulter, "Schulterblick vor der Ausfahrt", w2.schulter ? "Gut gesichert." : "Schulterblick rechts fehlte.", "§ 7 Abs. 5 StVO");
        ok(!st.gebremstAufHaupt, "Erst auf dem Ausfädelungsstreifen gebremst", !st.gebremstAufHaupt ? "Richtig: Geschwindigkeit erst auf dem Ausfädelungsstreifen abgebaut." : "Schon auf der Autobahn gebremst – das gefährdet den Verkehr dahinter.", "§ 7a Abs. 3 StVO");
        ok(st.vKurve !== undefined && st.vKurve <= 65, "Tempo am Zeichen 274", st.vKurve !== undefined ? `Am Zeichen „60“ mit ${Math.round(st.vKurve)} km/h.` + (st.vKurve > 65 ? " Zu schnell – vorher auf dem Ausfädelungsstreifen herunterbremsen." : "") : "Das Zeichen wurde nicht erreicht.", "Zeichen 274 · § 3 Abs. 1 StVO");
      }
    }
    return P;
  }

  // ---------------------------------------------------------------- Rangieren (Grundfahraufgaben)
  // Einspurmodell: Pose = Hinterachsmitte (x, y, h). Pkw 4,5 m lang, Radstand 2,7 m, max. Lenkwinkel ≈ 35°
  // (Wendekreis von Bordstein zu Bordstein ca. 10,5 m).
  const RAD = { L: 2.7, vorn: 0.95, hinten: 0.85, spur: 1.55, dMax: 0.61, breite: 1.8 };
  const MITTE = RAD.L / 2 + (RAD.vorn - RAD.hinten) / 2;          // Hinterachse -> Fahrzeugmitte
  function mitteAus(x, y, h) { return [x + Math.cos(h) * MITTE, y + Math.sin(h) * MITTE]; }
  function achseAus(x, y, h) { return [x - Math.cos(h) * MITTE, y - Math.sin(h) * MITTE]; }
  function ecken(cx, cy, h, l, b) { const c = Math.cos(h), s = Math.sin(h), L = l / 2, B = b / 2; return [[cx + c * L - s * B, cy + s * L + c * B], [cx + c * L + s * B, cy + s * L - c * B], [cx - c * L + s * B, cy - s * L - c * B], [cx - c * L - s * B, cy - s * L + c * B]]; }
  function raeder(x, y, h) {                                     // Radmitten: hinten links/rechts, vorn links/rechts
    const c = Math.cos(h), s = Math.sin(h), q = RAD.spur / 2;
    return [[x + s * q, y - c * q], [x - s * q, y + c * q], [x + c * RAD.L + s * q, y + s * RAD.L - c * q], [x + c * RAD.L - s * q, y + s * RAD.L + c * q]];
  }
  function ueberlapp(A, B) {                                     // Trennachsen-Test zweier konvexer Vierecke
    for (const P of [A, B]) for (let i = 0; i < 4; i++) {
      const a = P[i], b = P[(i + 1) % 4], nx = b[1] - a[1], ny = a[0] - b[0];
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      A.forEach(p => { const d = p[0] * nx + p[1] * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); });
      B.forEach(p => { const d = p[0] * nx + p[1] * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); });
      if (a1 < b0 || b1 < a0) return false;
    }
    return true;
  }
  // Abstand eines Punktes zu einer Bordsteinlinie; negativ = auf dem Gehweg (seite: +1 = Gehweg rechts der Linienrichtung)
  function bordAbstand(pt, bord) {
    let best = Infinity;
    for (let i = 1; i < bord.pts.length; i++) {
      const a = bord.pts[i - 1], b = bord.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      const t = clamp(((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / L2, 0, 1), px = a[0] + dx * t, py = a[1] + dy * t;
      const kreuz = (dx * (pt[1] - a[1]) - dy * (pt[0] - a[0])) / Math.sqrt(L2);   // > 0: rechts der Linie (y nach unten)
      const d = Math.hypot(pt[0] - px, pt[1] - py) * (Math.sign(kreuz) === (bord.seite || 1) ? -1 : 1);
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
    return best;
  }
  // Fahrzeug-Pose simulieren: schritte = [{ gang: 1|-1, lenk: -1..1, v: km/h, bis: (zustand) => bool }, { warte: s, blick: "rundum" }]
  function rangierBahn(start, schritte, opt) {
    opt = opt || {};
    const dt = 0.05, P = [], marken = [];
    let x = start.x, y = start.y, h = start.h, d = start.lenk ? start.lenk * RAD.dMax : 0, t = 0, weg = 0;
    const push = (v, g) => { const m = mitteAus(x, y, h); P.push(m[0], m[1], h, v, g); };
    push(0, 1);
    for (const sc of schritte) {
      marken.push({ t, schritt: sc });
      if (sc.warte) { const n = Math.round(sc.warte / dt); for (let i = 0; i < n; i++) { if (sc.lenk !== undefined) d += clamp(sc.lenk * RAD.dMax - d, -RAD.dMax * dt / 1.4, RAD.dMax * dt / 1.4); t += dt; push(0, sc.gang || 1); } continue; }
      const vMax = (sc.v || 5) / KMH, g = sc.gang;
      let v = 0, s0 = weg, n = 0;
      const zst = () => ({ x, y, h, d, weg: weg - s0, t, mitte: mitteAus(x, y, h) });
      while (!sc.bis(zst()) && n++ < 4000) {
        d += clamp(sc.lenk * RAD.dMax - d, -RAD.dMax * dt / 1.4, RAD.dMax * dt / 1.4);
        v = Math.min(vMax, v + 1.0 * dt);
        x += Math.cos(h) * v * g * dt; y += Math.sin(h) * v * g * dt; h += v * g / RAD.L * Math.tan(d) * dt; weg += v * dt; t += dt;
        push(v * g, g);
      }
      // weich anhalten
      while (v > 0.01) { v = Math.max(0, v - 1.5 * dt); x += Math.cos(h) * v * g * dt; y += Math.sin(h) * v * g * dt; h += v * g / RAD.L * Math.tan(d) * dt; t += dt; push(v * g, g); }
    }
    const n = P.length / 5;
    return { bahn: { dt, n, P: Float32Array.from(P) }, dauer: t, marken, ende: { x, y, h, mitte: mitteAus(x, y, h) } };
  }
  function starteRangieren() {
    const R = szene.rangieren, a = achseAus(R.start.x, R.start.y, R.start.h);
    fahr = {
      rang: true, t: 0, x: a[0], y: a[1], h: R.start.h, v: 0, d: 0, dZiel: 0, gang: 1, gas: false, bremse: false, blinker: null, blinkerSeit: -99,
      schulter: [], blickT: -99, zuege: 0, letzteRichtung: 0, stand: true, starts: [], kontakte: [], bordKontakte: 0, standLenk: 0, ende: false, log: [], hilfslinien: true,
      pos() { const m = mitteAus(this.x, this.y, this.h); return { x: m[0], y: m[1], h: this.h, v: this.v * this.gang, rueck: this.gang < 0 && this.v > 0.01 }; },
      liste() {
        const p = this.pos();
        const out = [{ f: { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true }, p: Object.assign(p, { rueck: this.gang < 0 }), sig: { blinker: this.blinker, bremse: this.bremse || this.v < 0.02, schulter: this.schulter.find(s => this.t >= s.von && this.t < s.bis) || null, rueck: this.gang < 0 } }];
        szene.fahrzeuge.filter(f => !f.fokus).forEach(f => { const q = rohPos(f, 0); out.push({ f, p: q, sig: { blinker: null, bremse: false } }); });
        return out;
      }
    };
    zeit = 0; _hGlatt = null;
    { const l = $("#rLenk"), r = $("#rRad"); if (l) l.value = 0; if (r) r.style.transform = "rotate(0deg)"; }
    aktualisiereRangUI();
  }
  function rangierSchritt(dt) {
    const st = fahr, R = szene.rangieren; if (!st || st.ende) return;
    st.t += dt;
    // Lenkung folgt dem Lenkrad mit begrenzter Geschwindigkeit
    const dAlt = st.d; st.d += clamp(st.dZiel * RAD.dMax - st.d, -RAD.dMax * dt / 1.4, RAD.dMax * dt / 1.4);
    if (st.v < 0.03) st.standLenk += Math.abs(st.d - dAlt);
    // Tempo: Gas = Schrittgeschwindigkeit, loslassen = sanft anhalten
    const vSoll = st.bremse ? 0 : st.gas ? (R.vMax || 5) / KMH : 0;
    const a = st.bremse ? -5 : st.v < vSoll ? 1.0 : -1.5;
    const vNeu = clamp(st.v + a * dt, 0, Math.max(st.v, vSoll));
    if (st.sperre === st.gang) { st.v = 0; return; }             // nach einem Kontakt: in diese Richtung erst nach Gangwechsel weiter
    if (st.v < 0.02 && vNeu >= 0.02) {                          // Anfahren: neuer Zug? Vorher umgeschaut?
      const blick = st.t - st.blickT <= 5;
      if (st.letzteRichtung !== st.gang) { st.zuege++; st.letzteRichtung = st.gang; }
      st.starts.push({ t: st.t, gang: st.gang, blick, zug: st.zuege });
      if (!blick) zeigeToast(st.gang < 0 ? "Vor dem Rückwärtsfahren: Rundumblick!" : "Vor dem Anfahren: Rundumblick!");
    }
    st.v = vNeu;
    const nx = st.x + Math.cos(st.h) * st.v * st.gang * dt, ny = st.y + Math.sin(st.h) * st.v * st.gang * dt, nh = st.h + st.v * st.gang / RAD.L * Math.tan(st.d) * dt;
    // Kontakt mit Fahrzeugen, Hindernissen oder dem Bordstein?
    const m = mitteAus(nx, ny, nh), koerper = ecken(m[0], m[1], nh, 4.5, RAD.breite);
    let stop = null;
    (R.hindernisse || []).forEach(o => { if (ueberlapp(koerper, o.ecken || (o.ecken = ecken(o.x, o.y, o.h || 0, o.l, o.b)))) stop = o.name || "ein Hindernis"; });
    if (!stop) raeder(nx, ny, nh).forEach(rp => (R.bordsteine || []).forEach(b => { if (bordAbstand(rp, b) < 0.1) stop = "den Bordstein"; }));
    if (stop && st.v > 0) {
      st.v = 0; st.sperre = st.gang; st.kontakte.push({ t: st.t, was: stop }); if (stop === "den Bordstein") st.bordKontakte++;
      zeigeToast(`Stopp – Kontakt mit ${stop}! Gang wechseln und neu ansetzen.`); return;
    }
    st.x = nx; st.y = ny; st.h = nh;
    if (st.t > 300) { st.ende = true; st.endeGrund = "zeit"; laeuft = false; zeigeAuswertung(bewerteRangieren()); }
  }
  function rangierFertig() {
    const st = fahr; if (!st || st.ende) return;
    if (st.v > 0.05) { zeigeToast("Erst anhalten."); return; }
    st.ende = true; laeuft = false; zeigeAuswertung(bewerteRangieren());
  }
  function bewerteRangieren() {
    const st = fahr, R = szene.rangieren, P = [];
    const ok = (bed, titel, text, regel) => P.push({ ok: !!bed, titel, text, regel });
    const p = st.pos();
    if (R.ziel) {
      const z = R.ziel, c = Math.cos(z.h), s = Math.sin(z.h), dx = p.x - z.x, dy = p.y - z.y;
      const laengs = dx * c + dy * s, quer = -dx * s + dy * c, dh = Math.abs(Math.atan2(Math.sin(p.h - z.h), Math.cos(p.h - z.h)));
      const lage = Math.abs(laengs) <= (z.tolL || 1) && Math.abs(quer) <= (z.tolQ || 0.5), winkel = dh <= (z.tolH || 0.12);
      ok(lage && winkel, z.titel || "Endposition", lage && winkel ? (z.gut || "Das Fahrzeug steht richtig in der Lücke.") : !lage ? `Noch nicht in der Zielposition (${Math.abs(laengs) > (z.tolL || 1) ? (laengs > 0 ? "zu weit vorn" : "zu weit hinten") : quer > 0 ? "zu weit rechts" : "zu weit links"}).` : `Das Auto steht ${Math.round(dh * 180 / Math.PI)}° schräg. Ziel: parallel ausgerichtet.`, z.regel || "Prüfungsrichtlinie · Grundfahraufgaben");
      if (R.bordAbstand) {
        const rechts = raeder(st.x, st.y, st.h).filter((_, i) => i % 2 === 1);
        const d = Math.min(...rechts.map(rp => Math.min(...R.bordsteine.map(b => bordAbstand(rp, b))))) - 0.1;
        ok(d <= R.bordAbstand && lage, "Abstand zum Bordstein", `Rechte Räder ${Math.max(0, Math.round(d * 100))} cm vom Bordstein (Richtwert: höchstens ${Math.round(R.bordAbstand * 100)} cm).`, "Grundfahraufgaben · Richtwert");
      }
    }
    if (R.zielPruef) R.zielPruef(st, ok, p);
    const ohne = st.starts.filter(x => !x.blick).length;
    ok(st.starts.length && !ohne, "Rundumblick vor jedem Anfahren", !st.starts.length ? "Das Auto hat sich nicht bewegt." : !ohne ? `Vor allen ${st.starts.length} Anfahrvorgängen rundum geschaut – sehr gut.` : `${ohne} von ${st.starts.length} Mal ohne Rundumblick angefahren. Vor jeder Bewegung (besonders rückwärts) rundum schauen.`, "§ 9 Abs. 5 · § 1 Abs. 2 StVO");
    ok(!st.kontakte.length, "Kein Kontakt", !st.kontakte.length ? "Weder Bordstein noch andere Fahrzeuge berührt." : `${st.kontakte.length}× Kontakt (${[...new Set(st.kontakte.map(k => k.was))].join(", ")}). In der Prüfung ist das ein Fehler.`, "§ 1 Abs. 2 StVO");
    if (R.maxZuege) ok(st.zuege <= R.maxZuege, "Anzahl der Züge", `${st.zuege} Züge (Richtwert: höchstens ${R.maxZuege}).` + (st.zuege > R.maxZuege ? " Weniger Korrekturen – dafür früher und genauer lenken." : ""), "Prüfungsrichtlinie · Grundfahraufgaben");
    if (R.blinker) { const bl = st.log.some(l => l.typ === "blink" && l.seite === R.blinker && l.t <= (st.starts[0] ? st.starts[0].t : Infinity)); ok(bl, "Blinker", bl ? `Vor dem Manöver ${R.blinker} geblinkt.` : `Vor dem Manöver ${R.blinker} blinken – andere müssen wissen, was du vorhast.`, "§ 1 Abs. 2 StVO"); }
    if (st.standLenk > RAD.dMax * 1.5) P.push({ ok: true, titel: "Tipp: im Rollen lenken", text: "Viel im Stand gelenkt. Das belastet Reifen und Lenkung – besser lenken, während das Auto langsam rollt.", regel: "Tipp" });
    if (st.endeGrund === "zeit") ok(false, "Zeit", "Die Übung hat sehr lange gedauert.", "Tipp");
    return P;
  }
  // Voraussichtliche Bahn bei aktuellem Lenkeinschlag (wie Hilfslinien einer Rückfahrkamera)
  function hilfslinien(ctx2, X, Y, s, st) {
    if (!st || !st.rang || !st.hilfslinien) return;
    ctx2.save(); ctx2.setLineDash([0.5 * s, 0.4 * s]); ctx2.lineWidth = Math.max(1.5, 0.12 * s);
    [[-1, "rgba(255,210,70,.9)"], [1, "rgba(255,210,70,.9)"]].forEach(([seite, farbe]) => {
      let x = st.x, y = st.y, h = st.h; ctx2.strokeStyle = farbe; ctx2.beginPath();
      for (let i = 0; i <= 40; i++) {
        const c = Math.cos(h), sn = Math.sin(h), vorn = st.gang > 0 ? RAD.L + RAD.vorn : -RAD.hinten;
        const px = x + c * vorn - sn * seite * RAD.breite / 2, py = y + sn * vorn + c * seite * RAD.breite / 2;
        i ? ctx2.lineTo(X(px), Y(py)) : ctx2.moveTo(X(px), Y(py));
        x += c * 0.15 * st.gang; y += sn * 0.15 * st.gang; h += 0.15 * st.gang / RAD.L * Math.tan(st.d);
      }
      ctx2.stroke();
    });
    ctx2.restore();
    // Vorderräder mit Einschlag
    ctx2.save(); ctx2.fillStyle = "#111";
    raeder(st.x, st.y, st.h).forEach((rp, i) => { ctx2.save(); ctx2.translate(X(rp[0]), Y(rp[1])); ctx2.rotate(st.h + (i >= 2 ? st.d : 0)); ctx2.fillRect(-0.33 * s, -0.11 * s, 0.66 * s, 0.22 * s); ctx2.restore(); });
    ctx2.restore();
  }
  function zielOben(ctx2, X, Y, s) {
    const z = szene.rangieren && szene.rangieren.ziel; if (!z || z.zeigen === false) return;
    const E = ecken(z.x, z.y, z.h, 4.5 + 2 * (z.tolL || 1) * 0.5, RAD.breite + 2 * (z.tolQ || 0.5) * 0.5);
    ctx2.save(); ctx2.strokeStyle = "rgba(90,220,130,.9)"; ctx2.fillStyle = "rgba(90,220,130,.14)"; ctx2.lineWidth = Math.max(1.5, 0.12 * s); ctx2.setLineDash([0.6 * s, 0.4 * s]);
    ctx2.beginPath(); E.forEach((p, i) => i ? ctx2.lineTo(X(p[0]), Y(p[1])) : ctx2.moveTo(X(p[0]), Y(p[1]))); ctx2.closePath(); ctx2.fill(); ctx2.stroke(); ctx2.restore();
  }
  function aktualisiereRangUI() {
    const st = fahr; if (!st || !st.rang || !root) return;
    const g = $("#rGang"); if (g) { g.textContent = st.gang > 0 ? "Gang: V" : "Gang: R"; g.classList.toggle("on", st.gang < 0); }
    const hl = $("#rHilf"); if (hl) hl.classList.toggle("on", st.hilfslinien);
    const bl = $("#rBL"), br = $("#rBR"); if (bl) bl.classList.toggle("on", st.blinker === "links"); if (br) br.classList.toggle("on", st.blinker === "rechts");
  }

  // ---------------------------------------------------------------- Reaktion (Gefahrbremsung)
  function starteReaktion(kmh) {
    const R = szene.reaktion, v = (kmh || (fahr && fahr.vWahl) || R.v) / KMH;
    const tGefahr = 2.8 + Math.random() * 3.2, hindPlan = R.start.x + v * tGefahr + 2.25 + R.abstand;
    const sicht = [{ f: { id: "pk1", typ: "transporter", farbe: "#e7e3d6", parkt: true }, p: { x: hindPlan - 5, y: R.gefahrY0 - 2.3, h: 0, v: 0 }, sig: {} }, { f: { id: "pk2", typ: "pkw", farbe: "#6a7d8f", parkt: true }, p: { x: hindPlan + 3.4, y: R.gefahrY0 - 2.2, h: 0, v: 0 }, sig: {} }];
    fahr = {
      reak: true, t: 0, x: R.start.x, y: R.start.y, h: 0, v, vWahl: v * KMH, phase: "fahrt", tGefahr, hindPlan, ende: false, log: [],
      pos() { return { x: this.x, y: this.y, h: 0, v: this.v }; },
      gefahr() { if (this.tG === undefined) return []; const dtg = this.t - this.tG, bx = this.hindX, out = [];
        out.push({ f: { id: "ball", typ: "ball", farbe: "#e53935" }, p: { x: bx, y: R.gefahrY0 - Math.min(dtg * 3.2, R.gefahrY0 - R.gefahrY1), h: -Math.PI / 2, v: 3 }, sig: {} });
        if (dtg > 0.7) out.push({ f: { id: "kind", typ: "kind", farbe: "#f28c28" }, p: { x: bx - 1.2, y: R.gefahrY0 + 0.6 - Math.min((dtg - 0.7) * 2.5, R.gefahrY0 + 0.6 - R.kindY), h: -Math.PI / 2, v: 2 }, sig: {} });
        return out; },
      liste() {
        const out = [{ f: { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true }, p: this.pos(), sig: { bremse: this.phase === "bremsen" || this.phase === "steht" } }];
        return out.concat(sicht, this.gefahr());
      }
    };
    zeit = 0; _hGlatt = null;
    const e = $("#rkInfo"); if (e) e.textContent = `Tempo ${Math.round(v * KMH)} km/h – bremsen, sobald Gefahr droht!`;
  }
  function reaktionSchritt(dt) {
    const st = fahr, R = szene.reaktion; if (!st || st.ende) return;
    st.t += dt;
    if (st.phase === "fahrt" && st.t >= st.tGefahr) { st.phase = "gefahr"; st.tG = st.t; st.xGefahr = st.x; st.hindX = st.hindPlan; }
    if (st.phase === "gefahr" && st.t - st.tG > 3) { st.phase = "bremsen"; st.tDruck = st.t; st.xDruck = st.x; st.keine = true; }
    if (st.phase === "bremsen") st.v = Math.max(0, st.v - R.verz * dt);
    st.x += st.v * dt;
    if (st.hindX !== undefined && st.aufprall === undefined && st.x + 2.25 >= st.hindX - 0.3 && st.v > 0.05) { st.aufprall = st.v * KMH; }
    if (st.phase === "bremsen" && st.v <= 0) { st.phase = "steht"; st.xStop = st.x; st.ende = true; laeuft = false; setTimeout(() => { if (fahr === st && modus === "fahren" && root && $("#lzStage")) zeigeAuswertung(bewerteReaktion()); }, 600); }
  }
  function reaktionBremse() {
    const st = fahr; if (!st || !st.reak || st.ende) return;
    if (!laeuft) { laeuft = true; return; }
    if (st.phase === "fahrt") { zeigeToast("Zu früh – noch keine Gefahr. Nicht raten, beobachten!"); st.fruehstart = (st.fruehstart || 0) + 1; return; }
    if (st.phase === "gefahr") { st.phase = "bremsen"; st.tDruck = st.t; st.xDruck = st.x; }
  }
  function bewerteReaktion() {
    const st = fahr, R = szene.reaktion, P = [], ok = (bed, titel, text, regel) => P.push({ ok: !!bed, titel, text, regel });
    const kmh = Math.round(st.vWahl), rz = st.tDruck - st.tG, rw = st.xDruck - st.xGefahr, bw = st.xStop - st.xDruck, aw = rw + bw;
    const ff = (kmh / 10) * 3, fb = (kmh / 10) ** 2, fg = fb / 2;
    if (st.keine) ok(false, "Keine Reaktion", "Nach 3 Sekunden wurde automatisch gebremst. Bei Gefahr sofort voll bremsen!", "§ 3 Abs. 1 StVO");
    else ok(rz <= 1.0, "Reaktionszeit", `${rz.toFixed(2)} s (gut: unter 1 s).` + (st.fruehstart ? ` ${st.fruehstart}× zu früh gedrückt.` : ""), "Faustregel: 1 s Reaktionszeit");
    ok(!st.aufprall, st.aufprall ? "Zusammenstoß" : "Rechtzeitig gestanden", st.aufprall ? `Das Auto hätte den Ball bzw. das Kind noch mit etwa ${Math.round(st.aufprall)} km/h erreicht.` : `Gestanden ${Math.max(0, st.hindX - st.xStop - 2.25).toFixed(1)} m vor der Gefahrenstelle.`, "§ 3 Abs. 1 · § 3 Abs. 2a StVO");
    P.push({ ok: true, titel: "Deine Wege", text: `Reaktionsweg ${rw.toFixed(1)} m + Bremsweg ${bw.toFixed(1)} m = Anhalteweg ${aw.toFixed(1)} m bei ${kmh} km/h.`, regel: "Messung" });
    P.push({ ok: true, titel: "Faustformeln", text: `Reaktionsweg (${kmh}/10)·3 = ${ff.toFixed(1)} m · Bremsweg (${kmh}/10)² = ${fb.toFixed(1)} m · Gefahrbremsung (${kmh}/10)²/2 = ${fg.toFixed(1)} m · Anhalteweg (Gefahrbremsung) ≈ ${(ff + fg).toFixed(1)} m.`, regel: "Fahrschul-Faustformeln" });
    return P;
  }
  function wegeOben(ctx2, X, Y, s, st, y0, b) {                    // farbige Streifen: Reaktionsweg rot, Bremsweg orange
    if (!st || st.xGefahr === undefined) return;
    const x1 = st.xDruck !== undefined ? st.xDruck : st.x, x2 = st.xStop !== undefined ? st.xStop : st.phase === "bremsen" ? st.x : x1;
    ctx2.save(); ctx2.globalAlpha = 0.45;
    ctx2.fillStyle = "#e53935"; ctx2.fillRect(X(st.xGefahr + 2.25), Y(y0 - b / 2), (x1 - st.xGefahr) * s, b * s);
    if (x2 > x1) { ctx2.fillStyle = "#f5a623"; ctx2.fillRect(X(x1 + 2.25), Y(y0 - b / 2), (x2 - x1) * s, b * s); }
    ctx2.globalAlpha = 1; ctx2.fillStyle = "#fff"; ctx2.font = `bold ${Math.max(11, 0.9 * s)}px sans-serif`; ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
    if (x1 - st.xGefahr > 3) ctx2.fillText(`Reaktion ${(x1 - st.xGefahr).toFixed(1)} m`, X(st.xGefahr + 2.25 + (x1 - st.xGefahr) / 2), Y(y0));
    if (x2 - x1 > 3) ctx2.fillText(`Bremsen ${(x2 - x1).toFixed(1)} m`, X(x1 + 2.25 + (x2 - x1) / 2), Y(y0));
    ctx2.restore();
  }

  // ---------------------------------------------------------------- Schleife
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    // langsame Geräte: bis 0,25 s pro Bild aufholen, im Fahrmodus in kleinen Teilschritten rechnen
    const dt = Math.min(0.25, (ts - (letzterFrame || ts)) / 1000); letzterFrame = ts;
    if (laeuft) {
      if (modus === "fahren") { const n = Math.ceil(dt * tempoFaktor / 0.04) || 1; for (let i = 0; i < n && laeuft; i++) fahrSchritt(dt * tempoFaktor / n); }
      else {
        const vorher = zeit; zeit = Math.min(szene.dauer, zeit + dt * tempoFaktor);
        for (const ph of szene.phasen.filter(p => p.t > vorher && p.t <= zeit)) {
          zeigePhase(ph);
          if (modus === "mitdenken" && ph.frage && !beantwortet.has(ph.t)) { zeit = ph.t; laeuft = false; zeigeFrage(ph); break; }
        }
        if (zeit >= szene.dauer) { laeuft = false; if (modus === "mitdenken") zeigeErgebnisMitdenken(); }
      }
    }
    // Kamera folgt dem Fokus-Fahrzeug
    const fokus = fahrzeugListe().find(e => e.f.fokus);
    if (fokus && ansicht.folgen) {
      let zx, zy;
      if (szene.kamera.fest) { zx = szene.kamera.fest[0]; zy = szene.kamera.fest[1]; }
      else { const vor = (szene.kamera.vor ?? 0.12) * (Wpx / dpr) / ansicht.zoom, hoch = 0.1 * (Hpx / dpr) / ansicht.zoom, hh = szene.kamera.richtung ? fokus.p.h : 0; zx = fokus.p.x + Math.cos(hh) * vor; zy = fokus.p.y + Math.sin(hh) * vor - hoch; }
      ansicht.px += (zx - ansicht.px) * 0.15; ansicht.py += (zy - ansicht.py) * 0.15;
    }
    if (kameraModus === "oben") zeichneOben(); else zeichne3d();
    aktualisiereHud();
  }

  // ---------------------------------------------------------------- Oberfläche
  const CSS = `
  .lz-root{position:fixed;inset:0;z-index:99990;background:#0c1410;color:#eef3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;}
  .lz-root *{box-sizing:border-box;}
  .lz-root [hidden]{display:none!important;}
  .lz-tabs{display:flex;gap:8px;padding:12px 14px 0;flex-wrap:wrap;}
  .lz-anz{display:inline-block;min-width:18px;padding:0 5px;margin-left:4px;border-radius:9px;background:rgba(255,255,255,.12);font-size:11px;}
  .lz-rang{display:flex;flex-direction:column;gap:6px;}
  .lz-lenk{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
  .lz-lenk .lz-btn{touch-action:none;-webkit-touch-callout:none;}
  .lz-rad{flex:1;min-width:160px;display:flex;align-items:center;gap:8px;}
  .lz-rad span{font-size:26px;display:inline-block;transition:transform .08s linear;}
  .lz-rad input{flex:1;accent-color:#e0b84a;height:34px;}
  .lz-reak{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .lz-reak .grow{flex:1;min-width:140px;font-size:13px;color:#b1bfb5;}
  .lz-gross{min-height:64px!important;min-width:180px;font-size:20px!important;font-weight:800!important;touch-action:none;}
  .lz-tipp{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(10,18,14,.94);border:1px solid #e0b84a;border-radius:12px;padding:10px 14px;max-width:min(560px,92%);z-index:5;font-size:14px;}
  .lz-tipp .lz-row{margin-top:8px;}
  .lz-top{display:flex;align-items:center;gap:8px;padding:10px 12px calc(10px) 12px;padding-top:max(10px,env(safe-area-inset-top));background:rgba(12,20,16,.92);border-bottom:1px solid #24413a;z-index:2;}
  .lz-title{font-family:'Anton',sans-serif;text-transform:uppercase;letter-spacing:.02em;font-size:17px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .lz-btn{background:#1a2f28;border:1px solid #2e4a40;color:#eef3ef;border-radius:10px;padding:8px 11px;font-size:13.5px;font-weight:600;cursor:pointer;min-height:40px;}
  .lz-btn.on{background:#3a7350;border-color:#5b9a70;}
  .lz-btn:disabled{opacity:.45;}
  .lz-stage{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;}
  .lz-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
  .lz-caption{position:absolute;left:12px;top:10px;max-width:min(470px,calc(100% - 24px));background:rgba(10,18,14,.88);border:1px solid rgba(120,170,140,.35);border-radius:14px;padding:11px 14px;box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none;transition:opacity .25s;}
  .lz-caption h3{margin:0 0 3px;font-size:15.5px;}
  .lz-caption p{margin:0;font-size:13.5px;line-height:1.45;color:#dce6df;}
  .lz-par{display:inline-block;margin-top:6px;font-size:11.5px;font-weight:700;color:#0c1410;background:#e0b84a;border-radius:6px;padding:2px 7px;}
  .lz-hud{position:absolute;right:12px;bottom:12px;background:rgba(10,18,14,.85);border:1px solid #2e4a40;border-radius:12px;padding:8px 12px;text-align:center;min-width:92px;pointer-events:none;}
  .lz-hud b{font-size:24px;display:block;line-height:1;}
  .lz-hud span{font-size:11px;color:#b1bfb5;}
  .lz-blink{display:flex;justify-content:space-between;font-size:18px;margin-top:4px;color:#3b4a43;}
  .lz-blink .an{color:#ffae1a;}
  .lz-bar{background:rgba(12,20,16,.95);border-top:1px solid #24413a;padding:8px 10px;padding-bottom:max(8px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;z-index:2;}
  .lz-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
  .lz-row .grow{flex:1;}
  .lz-time{position:relative;flex:1;min-width:120px;height:34px;display:flex;align-items:center;}
  .lz-time input{width:100%;accent-color:#3a7350;}
  .lz-mark{position:absolute;top:2px;width:3px;height:8px;background:#e0b84a;border-radius:2px;pointer-events:none;}
  .lz-drive{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;grid-template-areas:"bl sl br2 gas sr br" "wl wl wl wr wr wr";}
  .lz-drive #dBL{grid-area:bl;} .lz-drive #dSL{grid-area:sl;} .lz-drive #dBrems{grid-area:br2;} .lz-drive #dGas{grid-area:gas;} .lz-drive #dSR{grid-area:sr;} .lz-drive #dBR{grid-area:br;} .lz-drive #dWL{grid-area:wl;} .lz-drive #dWR{grid-area:wr;}
  .lz-drive[hidden]{display:none;}
  .lz-drive .lz-btn{min-height:52px;font-size:14px;padding:6px 4px;touch-action:none;-webkit-touch-callout:none;}
  .lz-pedal{font-size:16px!important;}
  .lz-pedal.gas{background:#2f6a44;} .lz-pedal.brems{background:#7a2c28;}
  .lz-sheet{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;z-index:5;}
  .lz-card{background:#132420;border:1px solid #2e4a40;border-radius:18px 18px 0 0;width:100%;max-width:640px;max-height:82%;overflow:auto;padding:16px 16px calc(16px + env(safe-area-inset-bottom));}
  .lz-card h2{margin:0 0 6px;font-family:'Anton',sans-serif;text-transform:uppercase;font-size:20px;letter-spacing:.02em;}
  .lz-opt{display:block;width:100%;text-align:left;margin:7px 0;padding:13px 14px;border-radius:12px;background:#1a2f28;border:1px solid #2e4a40;color:#eef3ef;font-size:14.5px;cursor:pointer;}
  .lz-opt.richtig{background:#23553a;border-color:#4f9a6b;} .lz-opt.falsch{background:#5a2522;border-color:#a44a44;}
  .lz-erkl{margin:10px 0 4px;font-size:13.5px;line-height:1.5;color:#dce6df;}
  .lz-list{list-style:none;padding:0;margin:8px 0;}
  .lz-list li{padding:9px 0;border-bottom:1px solid #24413a;font-size:13.5px;line-height:1.45;}
  .lz-list .ok{color:#7bd49a;font-weight:700;} .lz-list .no{color:#ff8a80;font-weight:700;}
  .lz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:12px;padding:14px;overflow:auto;}
  .lz-tile{background:#132420;border:1px solid #2e4a40;border-radius:16px;padding:12px;cursor:pointer;text-align:left;color:#eef3ef;}
  .lz-tile canvas{width:100%;height:130px;border-radius:10px;display:block;background:#5f8a45;margin-bottom:10px;}
  .lz-tile h3{margin:0 0 4px;font-size:16px;} .lz-tile p{margin:0;font-size:13px;color:#b1bfb5;line-height:1.4;}
  .lz-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;} .lz-chip{font-size:11px;padding:3px 8px;border-radius:20px;background:#1f3a31;color:#b9d9c5;}
  .lz-toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(20,30,26,.95);border:1px solid #4f7a63;border-radius:10px;padding:9px 14px;font-size:13.5px;max-width:90%;z-index:4;pointer-events:none;}
  .lz-coach{position:absolute;left:12px;bottom:12px;max-width:min(62%,420px);background:rgba(224,184,74,.95);color:#1b1b12;border-radius:12px;padding:9px 12px;font-size:13.5px;font-weight:600;pointer-events:none;}
  @media (max-height:520px){ .lz-top{padding-top:6px;padding-bottom:6px;} .lz-btn{min-height:34px;padding:5px 9px;font-size:12.5px;} .lz-bar{padding:5px 8px;gap:5px;} .lz-drive{grid-template-columns:repeat(8,1fr);grid-template-areas:"bl sl br2 br2 gas gas sr br" "wl wl wl wl wr wr wr wr";} .lz-drive .lz-btn{min-height:38px;font-size:12.5px;} .lz-caption{max-width:min(380px,calc(100% - 140px));padding:7px 10px;} .lz-caption p{font-size:12px;} .lz-coach{font-size:12px;max-width:45%;padding:6px 9px;} .lz-hud{padding:5px 9px;} .lz-hud b{font-size:19px;} }
  @media (max-width:560px){ .lz-caption p{font-size:12.8px;} .lz-title{font-size:15px;} .lz-drive{grid-template-columns:repeat(4,1fr);grid-template-areas:"bl sl sr br" "br2 br2 gas gas" "wl wl wr wr";} .lz-drive .lz-btn{min-height:48px;font-size:13px;} }
  `;

  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function $(s) { return root.querySelector(s); }

  function open(opts) {
    onCloseCb = opts && opts.onClose;
    if (!document.getElementById("lzCss")) { const st = document.createElement("style"); st.id = "lzCss"; st.textContent = CSS; document.head.appendChild(st); }
    if (root) root.remove();
    root = el(`<div class="lz-root" role="dialog" aria-label="Lernszenen"></div>`);
    document.body.appendChild(root);
    nurListe = opts && opts.nur ? opts.nur.filter(id => SZENEN.some(x => x.id === id)) : null;
    const ziel = opts && opts.szene && SZENEN.find(x => x.id === opts.szene);
    if (ziel) { katAktiv = ziel.kategorie || "autobahn"; starteSzene(ziel.id); } else zeigeAuswahl();
    window.addEventListener("resize", beiResize);
    window.addEventListener("popstate", beiZurueck, true);
  }
  // Zurücktaste (Android) schließt zuerst ein offenes Fenster, dann die Szene, dann die Lernszenen –
  // die App darunter bekommt das Ereignis nicht (sie würde sonst selbst zurücknavigieren).
  function beiZurueck(e) {
    if (!root) return;
    e.stopImmediatePropagation();
    try { history.pushState(null, "", location.href); } catch (err) {}
    if (root.querySelector(".lz-sheet")) { schliesseSheet(); return; }
    if (szene) zeigeAuswahl(); else schliessen();
  }
  function schliessen() {
    cancelAnimationFrame(raf); raf = 0; laeuft = false; fahr = null; szene = null;
    window.removeEventListener("resize", beiResize);
    window.removeEventListener("popstate", beiZurueck, true);
    if (beob) { beob.disconnect(); beob = null; }
    if (root) root.remove(); root = null;
    if (onCloseCb) try { onCloseCb(); } catch (e) {}
  }
  function zeigeAuswahl() {
    cancelAnimationFrame(raf); raf = 0; laeuft = false; szene = null; fahr = null; versatzFz = {}; tippFrage = null;
    if (beob) { beob.disconnect(); beob = null; }
    const kats = KATEGORIEN.filter(k => SZENEN.some(s => (s.kategorie || "autobahn") === k[0]));
    if (!kats.some(k => k[0] === katAktiv)) katAktiv = kats.length ? kats[0][0] : "autobahn";
    const liste = nurListe && nurListe.length ? SZENEN.filter(s => nurListe.includes(s.id)) : SZENEN.filter(s => (s.kategorie || "autobahn") === katAktiv);
    root.innerHTML = `
      <div class="lz-top"><button class="lz-btn" id="lzZu" aria-label="Schließen">✕</button><div class="lz-title">🎬 Lernszenen</div></div>
      <div class="lz-tabs">${nurListe && nurListe.length ? `<span style="font-size:13px;color:#b1bfb5;padding:8px 2px;">Passend zum Ausbildungspunkt</span><button class="lz-btn" id="lzAlle">Alle Szenen</button>` : ""}${(nurListe && nurListe.length ? [] : kats).map(k => `<button class="lz-btn${k[0] === katAktiv ? " on" : ""}" data-kat="${k[0]}">${esc(k[1])} <span class="lz-anz">${SZENEN.filter(s => (s.kategorie || "autobahn") === k[0]).length}</span></button>`).join("")}</div>
      <div class="lz-grid" id="lzGrid">${liste.map(s => `
        <button class="lz-tile" data-szene="${s.id}"><canvas data-vorschau="${s.id}"></canvas>
          <h3>${esc(s.titel)}</h3><p>${esc(s.kurz)}</p>
          <div class="lz-chips"><span class="lz-chip">Vorführen</span><span class="lz-chip">Mitdenken</span>${s.fahren || s.rangieren || s.reaktion ? `<span class="lz-chip">${s.rangieren ? "Selbst rangieren" : s.reaktion ? "Reaktionstest" : "Selbst fahren"}</span>` : ""}<span class="lz-chip">3D</span></div>
        </button>`).join("")}</div>`;
    $("#lzZu").onclick = schliessen;
    root.querySelectorAll("[data-kat]").forEach(b => b.onclick = () => { katAktiv = b.dataset.kat; zeigeAuswahl(); });
    { const a = root.querySelector("#lzAlle"); if (a) a.onclick = () => { nurListe = null; zeigeAuswahl(); }; }
    root.querySelectorAll("[data-szene]").forEach(b => b.onclick = () => starteSzene(b.dataset.szene));
    // Vorschaubilder
    root.querySelectorAll("canvas[data-vorschau]").forEach(c => {
      const s = SZENEN.find(x => x.id === c.dataset.vorschau); const r = c.getBoundingClientRect();
      const alt = { cv, ctx, Wpx, Hpx, dpr, szene, zeit, ansicht: { ...ansicht }, kameraModus };
      cv = c; dpr = Math.min(2, window.devicePixelRatio || 1); Wpx = c.width = Math.max(200, r.width) * dpr; Hpx = c.height = 130 * dpr; ctx = c.getContext("2d");
      szene = s; zeit = s.dauer * (s.vorschauZeit ?? 0.55); kameraModus = "oben"; const fk = s.fahrzeuge.find(f => f.fokus); const fp = fzPos(fk, zeit);
      ansicht = s.kamera.fest ? { zoom: s.kamera.zoom * 0.42, px: s.kamera.fest[0], py: s.kamera.fest[1], folgen: false } : { zoom: s.kamera.vorschauZoom || 2.4, px: fp.x + (s.kategorie && s.kategorie !== "autobahn" ? 0 : 20), py: fp.y, folgen: false };
      try { zeichneOben(); } catch (e) {}
      ({ cv, ctx, Wpx, Hpx, dpr, szene, zeit, kameraModus } = alt); ansicht = alt.ansicht;
    });
  }
  function starteSzene(id) {
    szene = SZENEN.find(s => s.id === id); zeit = 0; laeuft = false; versatzFz = {}; beantwortet = new Set(); punkte = { richtig: 0, gesamt: 0 }; fahr = null; _hGlatt = null;
    modus = "vorfuehren"; kameraModus = "oben"; tempoFaktor = 1;
    ansicht = { zoom: grundZoom(), px: 0, py: 0, folgen: true };
    const fk = szene.fahrzeuge.find(f => f.fokus); const fp = fzPos(fk, 0); ansicht.px = fp.x; ansicht.py = fp.y;
    root.innerHTML = `
      <div class="lz-top">
        <button class="lz-btn" id="lzZurueck" aria-label="Zur Auswahl">‹</button>
        <div class="lz-title">${esc(szene.titel)}</div>
        <button class="lz-btn" id="lzRegeln">§ Regeln</button>
        <button class="lz-btn" id="lzZu" aria-label="Schließen">✕</button>
      </div>
      <div class="lz-stage" id="lzStage"><canvas id="lzCanvas" aria-label="Animierte Verkehrsszene"></canvas>
        <div class="lz-caption" id="lzCap"><h3>${esc(szene.titel)}</h3><p>Auf ▶ tippen – die Szene spielt sich von selbst ab. Mit ⏸ anhalten und Fahrzeuge verschieben.</p></div>
        <div class="lz-hud" id="lzHud"><b id="lzV">0</b><span>km/h</span><div class="lz-blink"><span id="lzBL">◀</span><span id="lzBR">▶</span></div></div>
      </div>
      <div class="lz-bar">
        <div class="lz-row">
          <button class="lz-btn on" data-modus="vorfuehren">Vorführen</button>
          <button class="lz-btn" data-modus="mitdenken">Mitdenken</button>
          ${szene.fahren || szene.rangieren || szene.reaktion ? `<button class="lz-btn" data-modus="fahren">${szene.rangieren ? "Selbst rangieren" : szene.reaktion ? "Reaktionstest" : "Selbst fahren"}</button>` : ""}
          <span class="grow"></span>
          <button class="lz-btn on" data-kam="oben">Oben</button><button class="lz-btn" data-kam="3d">3D</button><button class="lz-btn" data-kam="fahrer">Fahrer</button>
        </div>
        <div class="lz-row" id="lzPlayRow">
          <button class="lz-btn" id="lzPrev" aria-label="Schritt zurück">⏮</button>
          <button class="lz-btn" id="lzPlay" aria-label="Abspielen" style="min-width:56px;font-size:17px;">▶</button>
          <button class="lz-btn" id="lzNext" aria-label="Nächster Schritt">⏭</button>
          <div class="lz-time" id="lzTime"><input type="range" id="lzSlider" min="0" max="${szene.dauer}" step="0.05" value="0" aria-label="Zeitleiste"></div>
          <button class="lz-btn" id="lzTempo">1×</button>
          <button class="lz-btn" id="lzReset" aria-label="Zurücksetzen">↺</button>
        </div>
        <div class="lz-drive" id="lzDrive" hidden>
          <button class="lz-btn" id="dBL">◀ Blinker</button><button class="lz-btn" id="dSL">👀 links</button>
          <button class="lz-btn lz-pedal brems" id="dBrems">Bremse</button><button class="lz-btn lz-pedal gas" id="dGas">Gas</button>
          <button class="lz-btn" id="dSR">rechts 👀</button><button class="lz-btn" id="dBR">Blinker ▶</button>
          <button class="lz-btn" id="dWL">⇤ Spur wechseln</button><button class="lz-btn" id="dWR">Spur wechseln ⇥</button>
        </div>
        <div class="lz-rang" id="lzRang" hidden>
          <div class="lz-lenk"><button class="lz-btn" id="rLinks">⟲ voll</button><div class="lz-rad"><span id="rRad">☸</span><input type="range" id="rLenk" min="-100" max="100" step="1" value="0" aria-label="Lenkrad"></div><button class="lz-btn" id="rRechts">voll ⟳</button><button class="lz-btn" id="rGerade">gerade</button></div>
          <div class="lz-lenk"><button class="lz-btn" id="rBL">◀ Blinker</button><button class="lz-btn" id="rBlick">👀 Rundumblick</button><button class="lz-btn" id="rGang">Gang: V</button><button class="lz-btn lz-pedal brems" id="rBrems">Bremse</button><button class="lz-btn lz-pedal gas" id="rGas">Gas</button><button class="lz-btn" id="rBR">Blinker ▶</button><button class="lz-btn" id="rHilf">Hilfslinien</button><button class="lz-btn on" id="rFertig">Fertig ✓</button></div>
        </div>
        <div class="lz-reak" id="lzReak" hidden>
          <button class="lz-btn" data-rv="30">30 km/h</button><button class="lz-btn on" data-rv="50">50 km/h</button><span class="grow" id="rkInfo">Starten mit ▶ – bremsen, sobald Gefahr droht!</span>
          <button class="lz-btn lz-pedal brems lz-gross" id="rkBrems">BREMSEN!</button>
        </div>
      </div>`;
    cv = $("#lzCanvas"); ctx = cv.getContext("2d"); beiResize(); ansicht.zoom = grundZoom();
    if (window.ResizeObserver) { beob = new ResizeObserver(() => beiResize()); beob.observe($("#lzStage")); }   // z. B. wenn die Fahrleiste erscheint
    const marks = $("#lzTime"); szene.phasen.forEach(p => { const m = document.createElement("span"); m.className = "lz-mark"; m.style.left = `calc(${(p.t / szene.dauer) * 100}% - 1px)`; marks.appendChild(m); });
    $("#lzZu").onclick = schliessen; $("#lzZurueck").onclick = zeigeAuswahl; $("#lzRegeln").onclick = zeigeRegeln;
    $("#lzPlay").onclick = () => { if ((root.querySelector(".lz-sheet .lz-opt") && !root.querySelector("#lzWeiter")) || tippFrage) return;
      if (modus === "fahren") { const c = $("#lzCap"); if (c) c.hidden = true; }
      if (modus === "fahren" && fahr && fahr.ende) { schliesseSheet(); if (szene.reaktion) starteReaktion(fahr.vWahl); else starteFahren(); } if (!laeuft && zeit >= szene.dauer && modus !== "fahren") { zeit = 0; beantwortet = new Set(); } laeuft = !laeuft; if (laeuft) { schliesseSheet(); ansicht.folgen = true; } };
    const tippZu = () => { if (!tippFrage) return; tippFrage = null; const b = root.querySelector("#lzTipp"); if (b) b.remove(); ansicht.folgen = true; ansicht.zoom = grundZoom(); };
    $("#lzSlider").oninput = e => { tippZu(); zeit = +e.target.value; laeuft = false; const ph = aktuellePhase(); if (ph) zeigePhase(ph); };
    $("#lzPrev").onclick = () => { tippZu(); springe(-1); }; $("#lzNext").onclick = () => { tippZu(); springe(1); };
    $("#lzTempo").onclick = () => { tempoFaktor = tempoFaktor === 1 ? 0.5 : tempoFaktor === 0.5 ? 2 : 1; $("#lzTempo").textContent = (tempoFaktor === 0.5 ? "½" : tempoFaktor) + "×"; };
    $("#lzReset").onclick = () => { schliesseSheet(); tippFrage = null; { const b = root.querySelector("#lzTipp"); if (b) b.remove(); } _hGlatt = null; versatzFz = {}; zeit = 0; laeuft = false; beantwortet = new Set(); punkte = { richtig: 0, gesamt: 0 }; if (modus === "fahren") { starteFahren(); const c = $("#lzCap"); if (c) c.hidden = false; setzeModus("fahren"); } else zeigePhase(szene.phasen[0]); ansicht.folgen = true; };
    root.querySelectorAll("[data-kam]").forEach(b => b.onclick = () => { if (tippFrage) { zeigeToast("Zum Antippen bleibt die Ansicht von oben."); return; } kameraModus = b.dataset.kam; _hGlatt = null; root.querySelectorAll("[data-kam]").forEach(x => x.classList.toggle("on", x === b)); });
    root.querySelectorAll("[data-modus]").forEach(b => b.onclick = () => setzeModus(b.dataset.modus));
    bindeFahren(); bindeZiehen();
    letzterFrame = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function grundZoom() { const b = cv ? cv.getBoundingClientRect().width : window.innerWidth; return szene.kamera.zoom * clamp(b / 1000, 0.55, 1.6); }
  function setzeModus(m) {
    tippFrage = null; { const b = root.querySelector("#lzTipp"); if (b) b.remove(); }
    modus = m; laeuft = false; versatzFz = {}; zeit = 0; beantwortet = new Set(); punkte = { richtig: 0, gesamt: 0 }; schliesseSheet(); _hGlatt = null;
    { const c = $("#lzCap"); if (c) c.hidden = false; }
    root.querySelectorAll("[data-modus]").forEach(x => x.classList.toggle("on", x.dataset.modus === m));
    $("#lzDrive").hidden = !(m === "fahren" && szene.fahren); $("#lzRang").hidden = !(m === "fahren" && szene.rangieren); $("#lzReak").hidden = !(m === "fahren" && szene.reaktion);
    $("#lzPrev").hidden = $("#lzNext").hidden = $("#lzTime").hidden = m === "fahren";
    if (m === "fahren") {
      starteFahren();
      if (szene.fahren) kameraModus = kameraModus === "oben" ? "3d" : kameraModus;
      if (szene.rangieren) { kameraModus = "oben"; ansicht.zoom = grundZoom() * (szene.rangieren.zoomFaktor || 1); }
      root.querySelectorAll("[data-kam]").forEach(x => x.classList.toggle("on", x.dataset.kam === kameraModus));
      if (szene.rangieren) zeigeCap("Selbst rangieren", szene.rangieren.anleitung || "Lenkrad drehen, Gang wählen, Gas halten. Vor jedem Anfahren Rundumblick! Die gelben Hilfslinien zeigen, wohin das Auto mit diesem Lenkeinschlag fährt. Zum Schluss auf „Fertig“.", "Grün markiert: Zielposition");
      else if (szene.reaktion) zeigeCap("Reaktionstest", "Das Auto fährt von selbst. Sobald eine Gefahr auftaucht, so schnell wie möglich auf BREMSEN tippen. Danach siehst du Reaktionsweg, Bremsweg und Anhalteweg.", "Tempo wählen, dann ▶");
      else zeigeCap("Selbst fahren", "Du steuerst das Fahrschulauto: Gas und Bremse halten, Blinker und Schulterblick antippen, dann den Fahrstreifen wechseln. Am Ende gibt es die Auswertung.", "Tippe auf ▶ zum Starten");
    }
    else if (m === "mitdenken") zeigeCap("Mitdenken", "Die Szene hält an jedem wichtigen Schritt an und fragt: Was ist jetzt richtig?", "Tippe auf ▶");
    else zeigePhase(szene.phasen[0]);
  }
  function springe(r) {
    const ph = szene.phasen; let i = ph.findIndex(p => p.t > zeit + 0.01);
    if (i < 0) i = ph.length;
    const ziel = r > 0 ? ph[i] : ph[Math.max(0, i - 2)];
    if (!ziel) return;
    zeit = ziel.t; laeuft = false; zeigePhase(ziel); ansicht.folgen = true;
  }
  function aktuellePhase() { let a = null; szene.phasen.forEach(p => { if (p.t <= zeit + 0.001) a = p; }); return a; }
  function zeigeCap(titel, text, regel) { const c = $("#lzCap"); if (!c) return; c.innerHTML = `<h3>${esc(titel)}</h3><p>${esc(text)}</p>${regel ? `<span class="lz-par">${esc(regel)}</span>` : ""}`; }
  function zeigePhase(p) { zeigeCap(p.titel, p.text, p.regel); }
  function zeigeToast(t) { const s = $("#lzStage"); if (!s) return; const d = el(`<div class="lz-toast">${esc(t)}</div>`); s.appendChild(d); setTimeout(() => d.remove(), 2600); }
  function zeigeCoach(t) { const s = $("#lzStage"); if (!s) return; s.querySelectorAll(".lz-coach").forEach(x => x.remove()); const d = el(`<div class="lz-coach">💡 ${esc(t)}</div>`); s.appendChild(d); setTimeout(() => d.remove(), 6000); }
  function schliesseSheet() { const s = root && root.querySelector(".lz-sheet"); if (s) s.remove(); }
  function sheet(html) { schliesseSheet(); const d = el(`<div class="lz-sheet"><div class="lz-card">${html}</div></div>`); $("#lzStage").appendChild(d); return d; }
  function zeigeFrage(ph) {
    if (ph.frage.art === "reihenfolge") return zeigeReihenfolge(ph);
    const f = ph.frage; const d = sheet(`<h2>Was ist richtig?</h2><p class="lz-erkl" style="margin-top:2px;">${esc(f.text)}</p>${f.optionen.map((o, i) => `<button class="lz-opt" data-i="${i}">${esc(o)}</button>`).join("")}<div id="lzErkl"></div>`);
    d.querySelectorAll(".lz-opt").forEach(b => b.onclick = () => {
      if (beantwortet.has(ph.t)) return; beantwortet.add(ph.t); punkte.gesamt++;
      const i = +b.dataset.i, ok = i === f.richtig; if (ok) punkte.richtig++;
      d.querySelectorAll(".lz-opt").forEach(x => x.classList.add(+x.dataset.i === f.richtig ? "richtig" : +x.dataset.i === i ? "falsch" : "x"));
      d.querySelector("#lzErkl").innerHTML = `<p class="lz-erkl"><b>${ok ? "✓ Richtig." : "✗ Nicht ganz."}</b> ${esc(f.erklaerung)}</p><span class="lz-par">${esc(ph.regel)}</span><div style="margin-top:12px;"><button class="lz-btn on" id="lzWeiter" style="width:100%;">Weiter ▶</button></div>`;
      d.querySelector("#lzWeiter").onclick = () => { schliesseSheet(); laeuft = true; };
    });
  }
  // Frage „Wer fährt zuerst?“: Fahrzeuge in der Draufsicht nacheinander antippen
  function zeigeReihenfolge(ph) {
    const f = ph.frage; schliesseSheet();
    kameraModus = "oben"; root.querySelectorAll("[data-kam]").forEach(x => x.classList.toggle("on", x.dataset.kam === "oben"));
    const ps = f.ids.map(id => szene.fahrzeuge.find(x => x.id === id)).filter(Boolean).map(x => fzPos(x, zeit));
    if (ps.length) { const xs = ps.map(p => p.x), ys = ps.map(p => p.y); ansicht.folgen = false; ansicht.px = (Math.min(...xs) + Math.max(...xs)) / 2; ansicht.py = (Math.min(...ys) + Math.max(...ys)) / 2;
      const r = cv.getBoundingClientRect(); ansicht.zoom = clamp(Math.min(r.width / (Math.max(...xs) - Math.min(...xs) + 24), (r.height - 140) / (Math.max(...ys) - Math.min(...ys) + 24)), 2, 14); }
    tippFrage = { ph, markiert: [] };
    const box = el(`<div class="lz-tipp" id="lzTipp"><b>${esc(f.text)}</b><div class="lz-row"><span id="lzTippStand">0 von ${f.ids.length} angetippt</span><span class="grow"></span><button class="lz-btn" id="lzTippZurueck">↺ neu</button></div></div>`);
    $("#lzStage").appendChild(box);
    $("#lzTippZurueck").onclick = () => { tippFrage.markiert = []; $("#lzTippStand").textContent = `0 von ${f.ids.length} angetippt`; };
  }
  function tippAuf(id) {
    const tf = tippFrage; if (!tf || tf.fertig) return;
    const f = tf.ph.frage; if (!f.ids.includes(id) || tf.markiert.includes(id)) return;
    tf.markiert.push(id); $("#lzTippStand").textContent = `${tf.markiert.length} von ${f.ids.length} angetippt`;
    if (tf.markiert.length < f.ids.length) return;
    tf.fertig = true; const ok = tf.markiert.every((x, i) => x === f.ids[i]);
    beantwortet.add(tf.ph.t); punkte.gesamt++; if (ok) punkte.richtig++;
    const box = $("#lzTipp"); if (box) box.remove();
    const d = sheet(`<h2>${ok ? "✓ Richtig!" : "✗ Nicht ganz."}</h2><p class="lz-erkl">${ok ? "" : `Richtig ist: ${f.ids.map((x, i) => `${i + 1}. ${esc(f.namen && f.namen[x] || x)}`).join(" · ")}. `}${esc(f.erklaerung)}</p><span class="lz-par">${esc(tf.ph.regel)}</span><div style="margin-top:12px;"><button class="lz-btn on" id="lzWeiter" style="width:100%;">Weiter ▶</button></div>`);
    d.querySelector("#lzWeiter").onclick = () => { schliesseSheet(); tippFrage = null; ansicht.folgen = true; ansicht.zoom = grundZoom(); laeuft = true; };
  }
  function zeigeErgebnisMitdenken() {
    const n = szene.phasen.filter(p => p.frage).length, q = n ? Math.round(punkte.richtig / n * 100) : 0;
    const d = sheet(`<h2>${q >= 80 ? "Stark!" : q >= 50 ? "Gut – fast!" : "Nochmal üben"}</h2><p class="lz-erkl">${punkte.richtig} von ${n} Fragen richtig (${q} %).${punkte.gesamt < n ? ` ${n - punkte.gesamt} Frage(n) übersprungen.` : ""}</p>
      <div class="lz-row" style="margin-top:12px;"><button class="lz-btn" id="lzNochmal">↺ Nochmal</button>${szene.fahren || szene.rangieren || szene.reaktion ? `<button class="lz-btn on" id="lzSelbst">${szene.rangieren ? "Jetzt selbst rangieren" : szene.reaktion ? "Reaktionstest starten" : "Jetzt selbst fahren"}</button>` : ""}<button class="lz-btn" id="lzRegelnB">§ Alle Regeln</button></div>`);
    d.querySelector("#lzNochmal").onclick = () => setzeModus("mitdenken");
    const sf = d.querySelector("#lzSelbst"); if (sf) sf.onclick = () => setzeModus("fahren");
    d.querySelector("#lzRegelnB").onclick = zeigeRegeln;
  }
  function zeigeAuswertung(P) {
    const gut = P.filter(p => p.ok).length;
    const d = sheet(`<h2>${gut === P.length ? "Alles richtig gemacht!" : `${gut} von ${P.length} Punkten richtig`}</h2>
      <ul class="lz-list">${P.map(p => `<li><span class="${p.ok ? "ok" : "no"}">${p.ok ? "✓" : "✗"} ${esc(p.titel)}</span><br>${esc(p.text)}<br><span class="lz-par">${esc(p.regel)}</span></li>`).join("")}</ul>
      <div class="lz-row"><button class="lz-btn on" id="lzNeu">↺ Nochmal fahren</button><button class="lz-btn" id="lzVor">Vorführung ansehen</button></div>`);
    d.querySelector("#lzNeu").onclick = () => { schliesseSheet(); if (szene.reaktion) starteReaktion(fahr && fahr.vWahl); else starteFahren(); laeuft = !szene.rangieren; };
    d.querySelector("#lzVor").onclick = () => setzeModus("vorfuehren");
  }
  function zeigeRegeln() {
    const regeln = szene.phasen.map(p => `<li><b>${esc(p.titel)}</b><br>${esc(p.text)}<br><span class="lz-par">${esc(p.regel)}</span></li>`).join("");
    const schilder = [...new Set((szene.strasse.schilder || []).map(s => s.typ))].map(t => SCHILD_NAME[t]).filter(Boolean);
    const d = sheet(`<h2>§ Regeln: ${esc(szene.titel)}</h2><ul class="lz-list">${regeln}</ul>${schilder.length ? `<p class="lz-erkl"><b>Schilder in dieser Szene:</b> ${schilder.map(esc).join(" · ")}</p>` : ""}<button class="lz-btn on" id="lzOk" style="width:100%;margin-top:8px;">Schließen</button>`);
    d.querySelector("#lzOk").onclick = schliesseSheet;
  }
  function aktualisiereHud() {
    if (!root || !szene) return;
    const liste = fahrzeugListe(); const fk = liste.find(e => e.f.fokus); if (!fk) return;
    const v = modus === "fahren" && fahr ? fahr.v * KMH : Math.abs(fk.p.v) * KMH;
    const V = $("#lzV"); if (V) V.textContent = Math.round(v);
    const an = blinkAn(); const bl = $("#lzBL"), br = $("#lzBR");
    if (bl) bl.className = fk.sig.blinker === "links" && an ? "an" : ""; if (br) br.className = fk.sig.blinker === "rechts" && an ? "an" : "";
    const sl = $("#lzSlider"); if (sl && modus !== "fahren" && document.activeElement !== sl) sl.value = zeit;
    const pl = $("#lzPlay"); if (pl) pl.textContent = laeuft ? "⏸" : "▶";
    if (modus === "fahren" && fahr) { const a = $("#dBL"), b = $("#dBR"); if (a) a.classList.toggle("on", fahr.blinker === "links"); if (b) b.classList.toggle("on", fahr.blinker === "rechts"); }
  }
  function bindeRang() {
    const halt = (id, an, aus) => { const b = $(id); if (!b) return; b.addEventListener("contextmenu", e => e.preventDefault()); b.addEventListener("pointerdown", e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) {} an(); b.classList.add("on"); }); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, () => { aus(); b.classList.remove("on"); })); };
    const lenk = $("#rLenk"), setzLenk = v => { if (!fahr || !fahr.rang) return; fahr.dZiel = clamp(v, -1, 1); lenk.value = Math.round(fahr.dZiel * 100); const r = $("#rRad"); if (r) r.style.transform = `rotate(${fahr.dZiel * 540}deg)`; };
    lenk.addEventListener("input", () => setzLenk(+lenk.value / 100));
    $("#rLinks").onclick = () => setzLenk(-1); $("#rRechts").onclick = () => setzLenk(1); $("#rGerade").onclick = () => setzLenk(0);
    halt("#rGas", () => { if (fahr && fahr.rang) { fahr.gas = true; if (!laeuft && !fahr.ende) laeuft = true; } }, () => { if (fahr) fahr.gas = false; });
    halt("#rBrems", () => { if (fahr) fahr.bremse = true; }, () => { if (fahr) fahr.bremse = false; });
    $("#rGang").onclick = () => { if (!fahr || !fahr.rang) return; if (fahr.v > 0.03) { zeigeToast("Gang nur im Stand wechseln."); return; } fahr.gang = -fahr.gang; fahr.sperre = 0; aktualisiereRangUI(); };
    $("#rBlick").onclick = () => { if (!fahr || !fahr.rang) return; if (!laeuft && !fahr.ende) laeuft = true; fahr.blickT = fahr.t; fahr.schulter.push({ von: fahr.t, bis: fahr.t + 1.2, seite: "rundum" }); };
    const blink = seite => () => { if (!fahr || !fahr.rang) return; if (!laeuft && !fahr.ende) laeuft = true; fahr.blinker = fahr.blinker === seite ? null : seite; fahr.log.push({ t: fahr.t, typ: "blink", seite: fahr.blinker }); aktualisiereRangUI(); };
    $("#rBL").onclick = blink("links"); $("#rBR").onclick = blink("rechts");
    $("#rHilf").onclick = () => { if (!fahr || !fahr.rang) return; fahr.hilfslinien = !fahr.hilfslinien; aktualisiereRangUI(); };
    $("#rFertig").onclick = rangierFertig;
    root.querySelectorAll("[data-rv]").forEach(b => b.onclick = () => { root.querySelectorAll("[data-rv]").forEach(x => x.classList.toggle("on", x === b)); laeuft = false; schliesseSheet(); starteReaktion(+b.dataset.rv); });
    const rk = $("#rkBrems"); rk.addEventListener("pointerdown", e => { e.preventDefault(); reaktionBremse(); });
  }
  function bindeFahren() {
    bindeRang();
    const halt = (id, an, aus) => { const b = $(id); if (!b) return; b.addEventListener("contextmenu", e => e.preventDefault()); b.addEventListener("pointerdown", e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) {} an(); b.classList.add("on"); }); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, () => { aus(); b.classList.remove("on"); })); };
    halt("#dGas", () => { if (fahr) { fahr.gas = true; if (!laeuft && !fahr.ende) laeuft = true; } }, () => { if (fahr) fahr.gas = false; });
    halt("#dBrems", () => { if (fahr) fahr.bremse = true; }, () => { if (fahr) fahr.bremse = false; });
    const blink = seite => () => { if (!fahr) return; if (fahr.blinker === seite) { fahr.blinker = null; fahr.blinkerAusT = fahr.t; } else { fahr.blinker = seite; fahr.blinkerSeit = fahr.t; } };
    $("#dBL").onclick = blink("links"); $("#dBR").onclick = blink("rechts");
    const blick = seite => () => { if (!fahr || !laeuft) return; fahr.schulter.push({ von: fahr.t, bis: fahr.t + 1, seite }); };
    $("#dSL").onclick = blick("links"); $("#dSR").onclick = blick("rechts");
    $("#dWL").onclick = () => wechsleSpur("links"); $("#dWR").onclick = () => wechsleSpur("rechts");
  }
  // Anhalten und Fahrzeuge verschieben (Ansicht "Oben"), sonst Karte verschieben / zoomen
  function bindeZiehen() {
    const stage = $("#lzStage"); const zeiger = new Map(); let zug = null, pinch = null;
    const welt = (cx, cy) => { const r = cv.getBoundingClientRect(); const s = ansicht.zoom; return { x: (cx - r.left - r.width / 2) / s + ansicht.px, y: (cy - r.top - r.height / 2) / s + ansicht.py }; };
    stage.addEventListener("pointerdown", e => {
      if (e.target !== cv) return; zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY }); cv.setPointerCapture(e.pointerId);
      if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: ansicht.zoom }; zug = null; return; }
      if (kameraModus !== "oben") return;
      const w = welt(e.clientX, e.clientY);
      if (tippFrage) { const tr = fahrzeugListe().filter(x => tippFrage.ph.frage.ids.includes(x.f.id)).map(x => ({ x, d: Math.hypot(x.p.x - w.x, x.p.y - w.y) })).sort((a, b) => a.d - b.d)[0]; if (tr && tr.d < Math.max(4, 30 / ansicht.zoom)) tippAuf(tr.x.f.id); return; }
      if (!laeuft && modus !== "fahren") {
        const treffer = fahrzeugListe().find(x => { const T = TYPEN[x.f.typ]; return Math.abs(x.p.x - w.x) < T.l / 2 + 1 && Math.abs(x.p.y - w.y) < T.b / 2 + 1; });
        if (treffer) { const o = versatzFz[treffer.f.id] || { dx: 0, dy: 0, frei: false, vx: 0, t0: zeit }; zug = { art: "fz", id: treffer.f.id, o, sx: w.x, sy: w.y, dx0: o.dx, dy0: o.dy }; versatzFz[treffer.f.id] = o; return; }
      }
      zug = { art: "karte", sx: e.clientX, sy: e.clientY, px: ansicht.px, py: ansicht.py }; ansicht.folgen = false;
    });
    stage.addEventListener("pointermove", e => {
      if (!zeiger.has(e.pointerId)) return; zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && zeiger.size === 2) { const [a, b] = [...zeiger.values()]; ansicht.zoom = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, 1, 14); return; }
      if (!zug) return;
      if (zug.art === "fz") { const w = welt(e.clientX, e.clientY); zug.o.dx = zug.dx0 + (w.x - zug.sx); zug.o.dy = zug.dy0 + (w.y - zug.sy); }
      else { ansicht.px = zug.px - (e.clientX - zug.sx) / ansicht.zoom; ansicht.py = zug.py - (e.clientY - zug.sy) / ansicht.zoom; }
    });
    const ende = e => { zeiger.delete(e.pointerId); if (zeiger.size < 2) pinch = null; if (zug && zug.art === "fz" && (Math.abs(zug.o.dx - zug.dx0) > 0.5 || Math.abs(zug.o.dy - zug.dy0) > 0.3)) zeigeToast("Fahrzeug verschoben – ▶ zeigt, wie es weitergeht. ↺ setzt zurück."); zug = null; };
    stage.addEventListener("pointerup", ende); stage.addEventListener("pointercancel", ende);
    stage.addEventListener("wheel", e => { e.preventDefault(); ansicht.zoom = clamp(ansicht.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 1, 14); }, { passive: false });
  }
  function beiResize() {
    if (!cv || !root) return;
    const r = cv.getBoundingClientRect(); dpr = Math.min(2.5, window.devicePixelRatio || 1);
    Wpx = cv.width = Math.max(1, Math.round(r.width * dpr)); Hpx = cv.height = Math.max(1, Math.round(r.height * dpr));
  }

  function registriere(sz) { if (!sz || !sz.id || SZENEN.some(x => x.id === sz.id)) return; SZENEN.push(sz); }
  function szenenFuerPlan(planId) { return SZENEN.filter(x => (x.plan || []).includes(planId)).map(x => ({ id: x.id, titel: x.titel })); }
  const bau = { W, KMH, clamp, lerp, smooth, pfad, spurPfad, bezier, versatz, band, tempoProfil, tempoStrecke, konstant, gerade, tBeiX, rohPos, TYPEN, rangierBahn, mitteAus, achseAus, ecken, raeder, bordAbstand, RAD, wegeOben };
  window.Lernszenen = { open, registriere, szenenFuerPlan, bau, _szenen: SZENEN, _intern: { rohPos, tBeiX, TYPEN, bewerte: () => bewerte(), zustand: () => ({ szene: szene && szene.id, zeit, modus, kameraModus, laeuft, fahr, ansicht: { ...ansicht } }) } };
})();
