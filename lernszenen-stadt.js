/* ============================================================================
   Fahrlehrer-Kompass · Lernszenen: Innerorts und Grundfahraufgaben
   Baut auf lernszenen.js auf (window.Lernszenen.bau / registriere).
   Welt in Metern: x nach Osten, y nach Süden (Bild nach unten). Rechtsverkehr.
   Fahrtrichtung Norden = h −π/2, Süden = +π/2, Osten = 0, Westen = π.
   ============================================================================ */
(function () {
  "use strict";
  const LZ = window.Lernszenen; if (!LZ || !LZ.bau) return;
  const { KMH, clamp, lerp, pfad, bezier, tempoProfil, rangierBahn, achseAus, ecken, TYPEN, wegeOben } = LZ.bau, spurPfad2 = LZ.bau.spurPfad;
  const PI = Math.PI, N = -PI / 2, S = PI / 2, O = 0, WE = PI;

  // ------------------------------------------------------------ Bausteine
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const bogen = (cx, cy, r, a0, a1, n) => { const o = []; for (let i = 0; i <= (n || 12); i++) { const a = a0 + (a1 - a0) * i / (n || 12); o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
  const KIND_FARBEN = ["#b3322c", "#2c5aa0", "#3a3f45", "#e0b84a", "#6a7d8f", "#7b8a52", "#d9d2c3", "#8e4b8a", "#c9ced6", "#4f7a63"];
  // Fahrzeug auf einem Weg: Zeitprofil [[t, km/h]], zur Zeit tBei an der Wegstelle sBei (Meter ab Wegbeginn)
  function fahrt(id, typ, farbe, punkte, keys, sBei, tBei, extra) {
    const tempo = tempoProfil(keys); let p = pfad(punkte), start = (sBei || 0) - tempo.s(tBei || 0);
    if (start < 0) {                                              // Weg nach hinten verlängern
      const a = p.pts[0], b = p.pts[1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, d = -start + 5;
      p = pfad([[a.x - (b.x - a.x) / L * d, a.y - (b.y - a.y) / L * d]].concat(punkte)); start += d;
    }
    return Object.assign({ id, typ, farbe, pfad: p, tempo, start }, extra || {});
  }
  function parkt(id, typ, farbe, x, y, h, extra) {
    return Object.assign({ id, typ, farbe, parkt: true, pfad: pfad([[x - Math.cos(h), y - Math.sin(h)], [x + Math.cos(h), y + Math.sin(h)]]), tempo: tempoProfil([[0, 0]]), start: 1 }, extra || {});
  }
  // Person: geht Wegpunkte mit Zeitprofil ab (km/h, Gehen ≈ 4,5)
  const person = (id, typ, farbe, punkte, keys, extra) => fahrt(id, typ, farbe, punkte, keys, 0, 0, extra);
  // Zeitpunkt, zu dem ein Fahrzeug die Wegstrecke s (ab Wegbeginn) erreicht
  function tBeiS(f, s) { let a = 0, b = 200; const w = t => f.start + f.tempo.s(t); if (w(b) < s) return b; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (w(m) < s) a = m; else b = m; } return (a + b) / 2; }

  // Kreuzung: Mittelpunkt (0,0), halbe Fahrbahnbreiten bNS (Nord-Süd-Straße) und bOW (Ost-West-Straße), Eckradius R, Gehweg g, Armlänge L.
  // arme: welche Arme vorhanden sind (für T-Einmündungen einen weglassen).
  function kreuzung(o) {
    const b = o.b || 3.25, R = o.R || 6, g = o.g || 2.5, L = o.L || 90, arme = o.arme || { N: 1, S: 1, O: 1, W: 1 }, bN = o.bNS || b, bO = o.bOW || b;
    const fl = [], li = [], obj = [], bord = [];
    fl.push({ art: "gehweg", poly: rect(-L, -L, L, L) });
    if (arme.O || arme.W) fl.push({ art: "asphalt", poly: rect(arme.W ? -L : -bN, -bO, arme.O ? L : bN, bO) });
    if (arme.N || arme.S) fl.push({ art: "asphalt", poly: rect(-bN, arme.N ? -L : -bO, bN, arme.S ? L : bO) });
    [[1, 1, "S", "O"], [-1, 1, "S", "W"], [1, -1, "N", "O"], [-1, -1, "N", "W"]].forEach(([sx, sy, av, ah]) => {
      const cx = sx * (bN + R), cy = sy * (bO + R), aA = Math.atan2(0, -sx);
      let aE = Math.atan2(-sy, 0); if (aE - aA > PI) aE -= 2 * PI; if (aE - aA < -PI) aE += 2 * PI;   // immer der kurze Viertelbogen
      if (arme[av] && arme[ah]) {                                  // Ecke zwischen zwei Armen: ausgerundet
        fl.push({ art: "asphalt", poly: [[sx * bN, sy * bO], [sx * bN, sy * (bO + R)]].concat(bogen(cx, cy, R, aA, aE, 10)).concat([[sx * (bN + R), sy * bO]]) });
        const rb = Math.max(0.5, R - g);
        fl.push({ art: "gruen2", zeigen3d: true, poly: [[sx * (bN + g), sy * L], [sx * (bN + g), sy * (bO + R)]].concat(bogen(cx, cy, rb, aA, aE, 10)).concat([[sx * (bN + R), sy * (bO + g)], [sx * L, sy * (bO + g)], [sx * L, sy * L]]) });
        bord.push({ pts: [[sx * bN, sy * L], [sx * bN, sy * (bO + R)]].concat(bogen(cx, cy, R, aA, aE, 10)).concat([[sx * (bN + R), sy * bO], [sx * L, sy * bO]]), seite: sx * sy > 0 ? 1 : -1 });
      } else if (!arme[av] && arme[ah]) {                          // T: senkrechter Arm fehlt -> gerader Rand der Querstraße
        fl.push({ art: "gruen2", zeigen3d: true, poly: rect(sx > 0 ? 0 : -L, sy > 0 ? bO + g : -L, sx > 0 ? L : 0, sy > 0 ? L : -(bO + g)) });
      } else if (arme[av] && !arme[ah]) {
        fl.push({ art: "gruen2", zeigen3d: true, poly: rect(sx > 0 ? bN + g : -L, sy > 0 ? 0 : -L, sx > 0 ? L : -(bN + g), sy > 0 ? L : 0) });
      }
    });
    if (!arme.N) bord.push({ pts: [[-L, -bO], [L, -bO]], seite: -1 });
    if (!arme.S) bord.push({ pts: [[-L, bO], [L, bO]], seite: 1 });
    return { flaechen: fl, linien: li, objekte: obj, bordsteine: bord, b, bN, bO, R, g, L };
  }
  // Fahrplan: fährt einen Weg ab, hält an Haltepunkten (Wegstrecke s) bis zu einer Zeit, Tempo-Grenzen je Abschnitt.
  // Ergebnis: Zeitprofil [[t, km/h]] für fahrt(); halte = [{ s, bis }] (bis = Uhrzeit, ab der weitergefahren wird)
  function fahrplan(o) {
    const dt = 0.05, keys = [], a = o.a || 1.6, b = o.b || 2.5, grenzen = o.grenzen || [];
    let s = o.s0 || 0, v = (o.v0 ?? o.vMax) / KMH, t = 0, hi = 0; const halte = (o.halte || []).slice().sort((x, y) => x.s - y.s);
    const vGrenze = x => { let m = o.vMax; grenzen.forEach(gz => { if (x >= gz.von && x <= gz.bis) m = Math.min(m, gz.v); }); return m / KMH; };
    for (let n = 0; t < (o.dauer || 60) && n < 20000; n++) {
      keys.push([t, v * KMH]);
      const h = halte[hi]; let ziel = vGrenze(s + v * 1.2);
      if (h) {
        const rest = h.s - s;
        if (rest <= 0.35 && v < 0.8) { if (v > 0) { s += v / 2 * dt; v = 0; keys.push([t + dt, 0]); } if (t >= h.bis) { hi++; } t += dt; continue; }
        if (rest <= v * v / (2 * b) + 0.3) ziel = 0;
      }
      const vAlt = v;
      v = ziel > v ? Math.min(ziel, v + a * dt) : Math.max(ziel, v - b * dt);
      if (h && ziel === 0) v = Math.min(v, Math.sqrt(Math.max(0, 2 * b * Math.max(0, h.s - s))));
      s += (vAlt + v) / 2 * dt; t += dt;                          // Trapez: passt exakt zum Zeitprofil
    }
    // Zeitprofil so glätten, dass die integrierte Strecke der simulierten entspricht (Trapez statt Rechteck)
    keys.push([t, v * KMH]);
    return keys;
  }
  // Wegstrecke des Punktes auf dem Weg, der (x, y) am nächsten liegt
  function sNahe(punkte, x, y) { const p = pfad(punkte); let best = 0, bd = Infinity; for (let s2 = 0; s2 <= p.laenge; s2 += 0.25) { const q = p.an(s2), d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = s2; } } return best; }
  function haeuser(obj, liste) { liste.forEach(([x, y, l, b, hoehe, farbe, dach]) => obj.push({ art: "haus", x, y, l, b, hoehe: hoehe || 7, farbe: farbe || "#d9cfbf", dach: dach || "#a7553f" })); }
  function baeume(obj, liste) { liste.forEach(([x, y, r]) => obj.push({ art: "baum", x, y, r: r || 2.2 })); }
  // Weg durch eine Kreuzung: von Arm A nach Arm B (Arm = Richtung, aus der man kommt bzw. in die man fährt)
  const EIN = { S: N, N: S, O: WE, W: O };                       // Fahrtrichtung beim Einfahren aus Arm
  function armPunkt(arm, abstand, q, raus) {
    const h = raus ? EIN[arm] + PI : EIN[arm], dx = Math.cos(h), dy = Math.sin(h), rx = -dy, ry = dx;
    const s = raus ? abstand : -abstand; return [dx * s + rx * q, dy * s + ry * q];
  }
  function route(von, nach, o) {
    o = o || {}; const q = o.q ?? 1.625, q2 = o.q2 ?? q, e = o.e ?? 8, e2 = o.e2 ?? e, L = o.L ?? 70, L2 = o.L2 ?? 200, k = o.k ?? 0.55;
    const a0 = armPunkt(von, L, q), a1 = armPunkt(von, e, q), b1 = armPunkt(nach, e2, q2, true), b0 = armPunkt(nach, L2, q2, true);
    const h1 = EIN[von], h2 = EIN[nach] + PI;
    const d = Math.hypot(b1[0] - a1[0], b1[1] - a1[1]) * k;
    const c1 = [a1[0] + Math.cos(h1) * d, a1[1] + Math.sin(h1) * d], c2 = [b1[0] - Math.cos(h2) * d, b1[1] - Math.sin(h2) * d];
    return [a0].concat(bezier(a1, c1, c2, b1, 24)).concat([b0]);
  }
  const s0 = (von, L) => L ?? 70;                                 // Wegstrecke bis zum Kreuzungs-Rand = L − e

  LZ.stadt = { fahrplan, sNahe, tBeiS, route, kreuzung };
  // ============================================================ GRUNDFAHRAUFGABEN
  // gemeinsame Wohnstraße entlang x: Bordstein Süd bei ySued, Nord bei yNord
  function wohnstrasse(ySued, yNord, x0, x1, o) {
    o = o || {}; const fl = [], li = [], obj = [];
    fl.push({ art: "gehweg", poly: rect(x0, yNord - 3, x1, ySued + 3) });
    fl.push({ art: "asphalt", poly: rect(x0, yNord, x1, ySued) });
    fl.push({ art: "gruen2", poly: rect(x0, ySued + 3, x1, ySued + 30), zeigen3d: true });
    fl.push({ art: "gruen2", poly: rect(x0, yNord - 30, x1, yNord - 3), zeigen3d: true });
    li.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[x0, ySued], [x1, ySued]] });
    li.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[x0, yNord], [x1, yNord]] });
    const bord = [{ pts: [[x0, ySued], [x1, ySued]], seite: 1 }, { pts: [[x0, yNord], [x1, yNord]], seite: -1 }];
    for (let x = x0 + 6; x < x1 - 6; x += 13) { haeuser(obj, [[x, ySued + 3 + 7, 9, 8, 6 + (x % 3), ["#d9cfbf", "#e3d7c3", "#cdd3d8"][Math.abs(Math.round(x)) % 3]], [x + 4, yNord - 3 - 7, 9, 8, 7 - (x % 2), ["#e3d7c3", "#d4c7b6", "#dadcd6"][Math.abs(Math.round(x)) % 3]]]); }
    baeume(obj, [[x0 + 12, ySued + 1.6, 1.8], [x1 - 14, yNord - 1.6, 1.8]]);
    return { flaechen: fl, linien: li, objekte: obj, bordsteine: bord, boden: "#6a9a52", boden3d: "#6f9a55" };
  }
  function grundfahrSzene(sz) { sz.kategorie = "grundfahr"; LZ.registriere(sz); }
  // Pose (Fahrzeugmitte) der Vorführung zur Zeit t – Startpunkt für „Selbst rangieren“
  function poseBei(fz, t) { const p = LZ.bau.rohPos(fz, t); return { x: p.x, y: p.y, h: p.h }; }

  // ---- Längsparken rückwärts
  (function () {
    const CURB = 5.4, PY = 4.35, st = wohnstrasse(CURB, -3.6, -60, 60);
    const pk = [["p1", -2.7, "#2c5aa0"], ["p2", 9.3, "#b3322c"], ["p3", -8.6, "#3a3f45"], ["p4", 15.8, "#6a7d8f"], ["p5", 22.3, "#e0b84a"], ["p6", -15, "#7b8a52"]];
    const a = achseAus(-15, 1.85, 0);
    const r = rangierBahn({ x: a[0], y: a[1], h: 0 }, [
      { gang: 1, lenk: 0, v: 8, bis: z => z.mitte[0] >= 7.5 }, { warte: 2.2 },
      { gang: -1, lenk: 1, v: 4, bis: z => z.h <= -0.4 }, { gang: -1, lenk: 0, v: 4, bis: z => z.weg >= 1.75 },
      { gang: -1, lenk: -1, v: 4, bis: z => z.h >= -0.2 }, { gang: -1, lenk: 0, v: 3, bis: z => z.weg >= 0.6 },
      { warte: 1.2 }, { gang: 1, lenk: 0, v: 3, bis: z => z.mitte[0] >= 3.3 }, { warte: 1 }]);
    const m = r.marken.map(x => x.t);                               // Beginn der einzelnen Schritte
    const fs = { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true, bahn: r.bahn,
      blinker: [{ von: 0.5, bis: m[8], seite: "rechts" }], schulter: [{ von: m[1] + 0.3, bis: m[1] + 1.8, seite: "rundum" }, { von: m[2] + 0.2, bis: m[2] + 1.5, seite: "hinten" }, { von: m[4] - 0.4, bis: m[4] + 0.6, seite: "rundum" }, { von: m[6] + 0.1, bis: m[6] + 1.1, seite: "rundum" }] };
    const hind = pk.map(([id, x]) => ({ name: "das parkende Auto", x, y: PY, h: 0, l: TYPEN.pkw.l, b: TYPEN.pkw.b }));
    grundfahrSzene({
      id: "laengs", plan: ["gf_laengs"], titel: "Rückwärts einparken (längs)", kurz: "Seitlich in eine Parklücke am Straßenrand",
      dauer: Math.ceil(r.dauer + 1), strasse: Object.assign(st, { schilder: [], bereich: [-60, 60] }), kamera: { fest: [3, 2], zoom: 16 },
      fahrzeuge: [fs].concat(pk.map(([id, x, f]) => parkt(id, "pkw", f, x, PY, 0))),
      phasen: [
        { t: 0.2, titel: "Lücke prüfen", text: "Passt die Lücke? Als Faustregel brauchst du eine gute Autolänge plus etwa eineinhalb Meter. Blinke früh rechts, dann weiß der Verkehr hinter dir Bescheid.", regel: "§ 1 Abs. 2 · § 12 StVO", frage: { text: "Wann setzt du den Blinker?", optionen: ["Erst beim Rückwärtsfahren", "Schon beim Heranfahren an die Lücke", "Gar nicht, ich parke ja nur"], richtig: 1, erklaerung: "Blinke früh rechts. So versteht der Verkehr hinter dir, warum du anhältst." } },
        { t: m[1], titel: "Neben dem Auto halten", text: "Halte parallel neben dem vorderen Auto an, mit etwa fünfzig Zentimeter bis einem Meter Seitenabstand. Dein Heck steht etwa auf Höhe von seinem Heck.", regel: "Grundfahraufgabe Längsparken", frage: { text: "Was kommt vor dem Rückwärtsfahren?", optionen: ["Ich setze sofort zurück", "Ich schaue rundum, besonders nach hinten", "Ich hupe"], richtig: 1, erklaerung: "Schau vor jeder Bewegung rundum. Beim Rückwärtsfahren drehst du den Körper und schaust durch die Heckscheibe." } },
        { t: m[2], titel: "Voll rechts einschlagen", text: "Du rollst langsam zurück und lenkst dabei voll nach rechts. Dein Heck schwenkt in die Lücke. Schau nach hinten. Deine Front schwenkt links in die Fahrbahn, also schau vorher nochmal, ob jemand kommt.", regel: "§ 9 Abs. 5 · § 1 Abs. 2 StVO" },
        { t: m[3], titel: "Gerade zurück", text: "Dann stellst du das Lenkrad gerade und rollst ein Stück gerade zurück. So kommt das Auto näher an den Bordstein.", regel: "Grundfahraufgabe Längsparken" },
        { t: m[4], titel: "Gegenlenken", text: "Ist deine rechte vordere Ecke am Heck des Autos vor dir vorbei, lenkst du voll nach links. Dann dreht sich das Auto parallel zum Bordstein.", regel: "Grundfahraufgabe Längsparken", frage: { text: "Wann lenkst du nach links?", optionen: ["Sofort am Anfang", "Wenn meine Front am Auto vor mir vorbei ist", "Gar nicht"], richtig: 1, erklaerung: "Lenkst du zu früh gegen, stößt du vorne an. Lenkst du zu spät, kommt das Heck an den Bordstein." } },
        { t: m[7], titel: "Ausrichten", text: "Am Ende rollst du ein kleines Stück vor, bis vorn und hinten ähnlich viel Platz ist. Du stehst parallel und nah am Bordstein, als Richtwert bis etwa dreißig Zentimeter. Berühren darfst du ihn nicht.", regel: "Grundfahraufgabe Längsparken", frage: { text: "Wie weit darf das Auto vom Bordstein entfernt sein?", optionen: ["Egal", "Nah dran, Richtwert bis etwa 30 Zentimeter", "Mindestens 1 Meter"], richtig: 1, erklaerung: "Gut eingeparkt heißt parallel und nah am Bordstein, aber ohne Berührung." } }
      ],
      rangieren: { start: poseBei(fs, m[1]), ziel: { x: 3.5, y: 4.3, h: 0, tolL: 0.9, tolQ: 0.35, tolH: 0.1, titel: "In der Lücke", gut: "Das Auto steht parallel in der Lücke." },
        bordAbstand: 0.3, maxZuege: 4, blinker: "rechts", hindernisse: hind, bordsteine: st.bordsteine, zoomFaktor: 1,
        anleitung: "Du stehst neben dem Auto vor der Lücke. Blinker rechts, rundum schauen, Rückwärtsgang rein. Halte Gas gedrückt und lenke erst voll rechts, dann gerade, dann voll links. Die gelben Linien zeigen dir den Weg." },
      overlayUnten: (c, X, Y, s) => { c.save(); c.strokeStyle = "rgba(255,255,255,.35)"; c.setLineDash([0.4 * s, 0.4 * s]); c.lineWidth = Math.max(1, 0.08 * s); c.strokeRect(X(0), Y(3.4), 7 * s, 2 * s); c.restore(); }
    });
  })();

  // ---- Querparken rückwärts und vorwärts
  function querSzene(id, vorwaerts) {
    const st = wohnstrasse(9.2, -3.5, -45, 45);
    st.flaechen.splice(2, 0, { art: "parken", poly: rect(-45, 4, 45, 9.2) });
    for (let x = -11.25; x <= 11.25; x += 2.5) st.linien.push({ art: "voll", b: 0.12, pts: [[x, 4.2], [x, 9.1]] });
    const belegt = [[-2.5, "#2c5aa0", S], [2.5, "#b3322c", N], [-7.5, "#3a3f45", N], [7.5, "#e0b84a", S], [-10, "#6a7d8f", S]];
    let r;
    if (!vorwaerts) {
      const a = achseAus(-15, 1.5, 0);
      r = rangierBahn({ x: a[0], y: a[1], h: 0 }, [{ gang: 1, lenk: 0, v: 8, bis: z => z.mitte[0] >= 4 }, { warte: 2.2 }, { gang: -1, lenk: 1, v: 4, bis: z => z.h <= -PI / 2 + 0.15 }, { gang: -1, lenk: 0, v: 3, bis: z => z.mitte[1] >= 6.6 }, { warte: 1 }]);
    } else {
      const a = achseAus(-25, -1.5, 0);
      r = rangierBahn({ x: a[0], y: a[1], h: 0 }, [{ gang: 1, lenk: 0, v: 8, bis: z => z.mitte[0] >= -7.25 }, { warte: 2.0 }, { gang: 1, lenk: -0.5, v: 4, bis: z => z.weg >= 1 }, { gang: 1, lenk: 1, v: 4, bis: z => z.h >= PI / 2 - 0.2 }, { gang: 1, lenk: 0, v: 3, bis: z => z.mitte[1] >= 6.6 }, { warte: 1 }]);
    }
    const m = r.marken.map(x => x.t);
    const fs = { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true, bahn: r.bahn,
      blinker: [{ von: 0.5, bis: m[vorwaerts ? 4 : 3], seite: "rechts" }], schulter: vorwaerts ? [{ von: m[1] + 0.2, bis: m[1] + 1.6, seite: "rundum" }, { von: m[3] - 0.3, bis: m[3] + 0.7, seite: "rechts" }] : [{ von: m[1] + 0.2, bis: m[1] + 1.8, seite: "rundum" }, { von: m[2] + 0.2, bis: m[2] + 1.6, seite: "hinten" }] };
    const hind = belegt.map(([x]) => ({ name: "das parkende Auto", x, y: 6.6, h: S, l: TYPEN.pkw.l, b: TYPEN.pkw.b }));
    grundfahrSzene({
      id, plan: ["gf_quer"], titel: vorwaerts ? "Vorwärts einparken (quer)" : "Rückwärts einparken (quer)", kurz: vorwaerts ? "Vorwärts in eine Querparklücke, mit Ausholen" : "Rückwärts in eine Querparklücke, später vorwärts mit guter Sicht hinaus",
      dauer: Math.ceil(r.dauer + 1), strasse: Object.assign(st, { schilder: [], bereich: [-45, 45] }), kamera: { fest: [0, 3.5], zoom: 15 },
      fahrzeuge: [fs].concat(belegt.map(([x, f, h], i) => parkt("q" + i, "pkw", f, x, 6.6, h))),
      phasen: vorwaerts ? [
        { t: 0.2, titel: "Vorbeifahren und ausholen", text: "Fahr langsam auf der Fahrgasse an die Lücke heran und blinke rechts. Hole etwas nach links aus, damit der Bogen in die Lücke passt.", regel: "§ 1 Abs. 2 StVO", frage: { text: "Warum holst du vor dem Vorwärtseinparken aus?", optionen: ["Damit der Bogen in die schmale Lücke passt", "Weil es schneller geht", "Das muss ich nicht"], richtig: 0, erklaerung: "Beim Vorwärtsfahren schneiden die Hinterräder die Kurve nach innen. Mit Ausholen streift das Heck das Nachbarauto nicht." } },
        { t: m[3], titel: "Voll einschlagen", text: "Ist die Mitte der Lücke etwa auf Höhe deines Außenspiegels, lenkst du voll nach rechts. Achte auf die Ecken der Nachbarautos und mach einen Schulterblick nach rechts.", regel: "Grundfahraufgabe Querparken" },
        { t: m[4], titel: "Gerade hinein", text: "Jetzt stellst du das Lenkrad gerade und rollst mittig in die Lücke, bis die Front kurz vor dem Ende steht. Auf beiden Seiten muss man aussteigen können.", regel: "Prüfungsrichtlinie · Grundfahraufgaben", frage: { text: "Was ist später beim Ausparken der Nachteil?", optionen: ["Keiner", "Rückwärts heraus, mit schlechter Sicht auf den Verkehr", "Ich brauche mehr Benzin"], richtig: 1, erklaerung: "Deshalb empfiehlt man das Rückwärtseinparken. Dann fährst du später vorwärts hinaus und siehst gut." } }
      ] : [
        { t: 0.2, titel: "An der Lücke vorbei", text: "Fahr langsam auf der Fahrgasse, blinke rechts und fahr an der Lücke vorbei, bis dein Heck etwa ein bis zwei Meter hinter ihr ist.", regel: "§ 1 Abs. 2 StVO" },
        { t: m[1], titel: "Rundumblick", text: "Bevor du zurückfährst, schaust du rundum. Achte auf Fußgänger und Autos auf der Fahrgasse!", regel: "§ 9 Abs. 5 StVO", frage: { text: "Warum fährst du rückwärts in die Querlücke?", optionen: ["Später beim Herausfahren habe ich gute Sicht nach vorn", "Es ist vorgeschrieben", "Weil es schneller geht"], richtig: 0, erklaerung: "Rückwärts hinein kannst du enger lenken. Und beim Ausparken siehst du den Querverkehr." } },
        { t: m[2], titel: "Voll einschlagen", text: "Jetzt rollst du langsam zurück und lenkst voll nach rechts. Schau nach hinten und auf die Ecken der Nachbarautos.", regel: "Grundfahraufgabe Querparken" },
        { t: m[3], titel: "Gerade zurück", text: "Steht das Auto parallel zu den Nachbarn, stellst du das Lenkrad gerade. Dann rollst du mittig bis zum Ende der Lücke zurück.", regel: "Prüfungsrichtlinie · Grundfahraufgaben", frage: { text: "Wann stellst du das Lenkrad gerade?", optionen: ["Sobald ich in der Lücke bin", "Wenn das Auto parallel zu den Nachbarautos steht", "Nie"], richtig: 1, erklaerung: "Dann fährst du gerade weiter, sonst steht das Auto schräg." } }
      ],
      rangieren: { start: poseBei(fs, m[1]), ziel: { x: 0, y: 6.7, h: vorwaerts ? S : N, tolL: 0.6, tolQ: 0.3, tolH: 0.1, titel: "Mittig in der Lücke", gut: "Mittig und gerade in der Lücke. So kannst du auf beiden Seiten aussteigen." },
        maxZuege: vorwaerts ? 3 : 3, blinker: "rechts", hindernisse: hind, bordsteine: st.bordsteine,
        anleitung: vorwaerts ? "Vorwärts einparken. Hole leicht nach links aus, dann lenke voll rechts und fahr gerade in die Lücke. Schau vor dem Anfahren rundum." : "Rückwärts einparken. Schau rundum, leg den Rückwärtsgang ein und lenke voll rechts. Steht das Auto parallel, fahr gerade zurück." }
    });
  }
  querSzene("quer_rueck", false); querSzene("quer_vor", true);

  // ---- Wenden in drei Zügen (Umkehren)
  (function () {
    const st = wohnstrasse(3.5, -3.5, -50, 50);
    const minB = (z, idx) => { const w = LZ.bau.raeder(z.x, z.y, z.h); return Math.min(...idx.map(i => Math.min(...st.bordsteine.map(b => LZ.bau.bordAbstand(w[i], b))))); };
    const a = achseAus(0, 2.3, 0);
    const r = rangierBahn({ x: a[0], y: a[1], h: 0 }, [{ warte: 2.5 },
      { gang: 1, lenk: -1, v: 4, bis: z => z.weg > 1 && minB(z, [2, 3]) <= 0.6 }, { warte: 1.8, lenk: 1 },
      { gang: -1, lenk: 1, v: 3, bis: z => z.weg > 1 && minB(z, [0, 1]) <= 0.8 }, { warte: 1.8, lenk: -1 },
      { gang: 1, lenk: -1, v: 4, bis: z => Math.cos(z.h) <= -Math.cos(0.7) }, { gang: 1, lenk: -0.3, v: 5, bis: z => z.weg >= 6 }, { gang: 1, lenk: 0, v: 5, bis: z => z.weg >= 4 }]);
    const m = r.marken.map(x => x.t);
    const fs = { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true, bahn: r.bahn,
      blinker: [{ von: 0.3, bis: m[1] + 2, seite: "links" }], schulter: [{ von: 0.8, bis: 2.2, seite: "rundum" }, { von: m[2] + 0.2, bis: m[2] + 1.6, seite: "rundum" }, { von: m[4] + 0.2, bis: m[4] + 1.6, seite: "rundum" }] };
    grundfahrSzene({
      id: "wenden", plan: ["gf_wenden"], titel: "Wenden in drei Zügen", kurz: "Umkehren mit Vorwärts und Rückwärts in einer engen Straße",
      dauer: Math.ceil(r.dauer + 1), strasse: Object.assign(st, { schilder: [], bereich: [-50, 50] }), kamera: { fest: [-2, 0], zoom: 15 },
      fahrzeuge: [fs, parkt("w1", "pkw", "#2c5aa0", -14, 2.4, 0), parkt("w2", "pkw", "#7b8a52", 14, -2.4, WE)],
      phasen: [
        { t: 0.2, titel: "Vorbereiten", text: "Halte am rechten Rand an. Prüfe, ob Wenden hier erlaubt und übersichtlich ist. Blinke links und schau in beide Richtungen.", regel: "§ 9 Abs. 5 StVO", frage: { text: "Was ist beim Wenden das Wichtigste?", optionen: ["Möglichst wenige Züge", "Vor jedem Zug in beide Richtungen schauen", "Schnell fertig werden"], richtig: 1, erklaerung: "Beim Wenden darf niemand gefährdet werden. Gutes Schauen ist das Wichtigste." } },
        { t: m[1], titel: "Erster Zug, vorwärts voll links", text: "Und jetzt der erste Zug. Roll langsam an und lenke dabei voll nach links, bis kurz vor den Bordstein gegenüber. Kurz vor dem Halt lenkst du schon nach rechts um.", regel: "Grundfahraufgabe Umkehren" },
        { t: m[3], titel: "Zweiter Zug, rückwärts voll rechts", text: "Zweiter Zug. Leg den Rückwärtsgang ein und schau nochmal rundum. Roll langsam zurück und lenke voll nach rechts, bis kurz vor den Bordstein hinter dir.", regel: "§ 9 Abs. 5 StVO", frage: { text: "In welche Richtung lenkst du beim Zurücksetzen?", optionen: ["Links", "Rechts, das Heck soll nach rechts", "Gar nicht"], richtig: 1, erklaerung: "Rückwärts lenkst du das Lenkrad dorthin, wohin das Heck soll." } },
        { t: m[5], titel: "Dritter Zug, vorwärts links heraus", text: "Dritter Zug. Schau nochmal rundum, lenke voll links und fahr in die neue Richtung. Ordne dich dann rechts ein.", regel: "§ 2 Abs. 2 StVO" },
        { t: m[6] + 2, titel: "Zum Merken", text: "Ganz wichtig, lenke nicht im Stand, sondern während das Auto langsam rollt. Wie viele Züge du brauchst, ist nicht so wichtig. Den Bordstein darfst du nicht berühren.", regel: "Prüfungsrichtlinie · Grundfahraufgaben" }
      ],
      rangieren: { start: poseBei(fs, 0), zielPruef: (fz, ok, p) => {
          const dh = Math.abs(Math.atan2(Math.sin(p.h - PI), Math.cos(p.h - PI))), rechts = p.y < -0.3;
          ok(dh < 0.35 && rechts, "Umgekehrt", dh < 0.35 && rechts ? "Das Auto fährt jetzt in die Gegenrichtung auf der rechten Fahrbahnseite." : dh >= 0.35 ? "Noch nicht vollständig gewendet." : "Nach dem Wenden rechts einordnen.", "§ 2 Abs. 2 StVO");
        }, maxZuege: 5, blinker: "links", hindernisse: [{ name: "das parkende Auto", x: -14, y: 2.4, h: 0, l: 4.5, b: 1.8 }, { name: "das parkende Auto", x: 14, y: -2.4, h: 0, l: 4.5, b: 1.8 }], bordsteine: st.bordsteine,
        anleitung: "Wenden in drei Zügen. Blinker links, rundum schauen, vorwärts voll links. Dann rückwärts voll rechts, dann vorwärts nach links heraus. Berühr den Bordstein nicht!" }
    });
  })();

  // ---- Rückwärts um eine Ecke nach rechts
  (function () {
    const fl = [], li = [], obj = [];
    const R = 5, OST = { pts: [[60, 3.5], [12, 3.5]].concat(bogen(12, 8.5, R, -PI / 2, -PI, 12)).concat([[7, 8.5], [7, 60]]), seite: -1 };
    const WEST = { pts: [[-60, 3.5], [-5, 3.5]].concat(bogen(-5, 8.5, R, -PI / 2, 0, 12)).concat([[0, 8.5], [0, 60]]), seite: 1 };
    const NORD = { pts: [[-60, -3.5], [60, -3.5]], seite: -1 };
    fl.push({ art: "gehweg", poly: rect(-60, -6.5, 60, 60) });
    fl.push({ art: "asphalt", poly: rect(-60, -3.5, 60, 3.5) }, { art: "asphalt", poly: rect(0, 3, 7, 60) });
    fl.push({ art: "asphalt", poly: [[7, 3.5], [12, 3.5]].concat(bogen(12, 8.5, R, -PI / 2, -PI, 12)) }, { art: "asphalt", poly: [[0, 3.5], [0, 8.5]].concat(bogen(-5, 8.5, R, 0, -PI / 2, 12)) });
    fl.push({ art: "gruen2", poly: [[10, 60], [10, 8.5]].concat(bogen(12, 8.5, 2, -PI, -PI / 2, 8)).concat([[60, 6.5], [60, 60]]), zeigen3d: true });
    fl.push({ art: "gruen2", poly: [[-60, 6.5], [-5, 6.5]].concat(bogen(-5, 8.5, 2, -PI / 2, 0, 8)).concat([[-3, 60], [-60, 60]]), zeigen3d: true });
    fl.push({ art: "gruen2", poly: rect(-60, -40, 60, -6.5), zeigen3d: true });
    [OST, WEST, NORD].forEach(b => li.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: b.pts }));
    haeuser(obj, [[22, 13, 10, 9, 7], [34, 13, 9, 9, 6, "#e3d7c3"], [-16, 13, 10, 9, 8, "#cdd3d8"], [-30, 13, 9, 9, 6], [20, 15 + 20, 9, 12, 7, "#e3d7c3"], [-14, 32, 9, 12, 7], [0, -14, 12, 9, 8, "#e3d7c3"], [20, -14, 10, 9, 6], [-22, -14, 10, 9, 7, "#cdd3d8"]]);
    baeume(obj, [[14.5, 22, 1.8], [-2.2, 26, 1.7]]);
    const a = achseAus(22, 2.3, 0);
    const r = rangierBahn({ x: a[0], y: a[1], h: 0 }, [{ warte: 2.5 }, { gang: -1, lenk: 0, v: 4, bis: z => z.x <= 11 }, { gang: -1, lenk: 0.9, v: 3, bis: z => z.h <= -PI / 2 + 0.1 }, { gang: -1, lenk: 0, v: 3, bis: z => z.mitte[1] >= 20 }, { warte: 1 }]);
    const m = r.marken.map(x => x.t);
    const fs = { id: "fs", typ: "fahrschule", farbe: "#f2f2ee", fokus: true, bahn: r.bahn, schulter: [{ von: 0.6, bis: 2.2, seite: "rundum" }, { von: m[2] - 0.8, bis: m[2] + 0.6, seite: "rundum" }] };
    grundfahrSzene({
      id: "ecke", plan: ["gf_rueck"], titel: "Rückwärts um die Ecke nach rechts", kurz: "Rückwärts in eine Seitenstraße, immer nah am Bordstein",
      dauer: Math.ceil(r.dauer + 1), strasse: { flaechen: fl, linien: li, objekte: obj, bordsteine: [OST, WEST, NORD], schilder: [], bereich: [-60, 60], boden: "#6a9a52", boden3d: "#6f9a55" },
      kamera: { fest: [10, 9], zoom: 12 },
      fahrzeuge: [fs, parkt("e1", "pkw", "#2c5aa0", 34, 2.4, 0), fahrt("e2", "pkw", "#b3322c", [[-70, -1.8], [70, -1.8]].map(p => p).reverse(), [[0, 30]], 10, 0)],
      phasen: [
        { t: 0.2, titel: "Hinter der Einmündung anhalten", text: "So, jetzt hältst du rechts am Fahrbahnrand an, etwa zwei bis drei Autolängen hinter der Einmündung. Schau einmal rundum. Der Verkehr hat Vorrang.", regel: "§ 9 Abs. 5 StVO", frage: { text: "Was ist beim Rückwärtsfahren am wichtigsten?", optionen: ["Ich fahre möglichst schnell", "Ich fahre langsam und schaue rundum", "Ich schaue nur in den Innenspiegel"], richtig: 1, erklaerung: "Rückwärts darf niemand in Gefahr kommen. Du fährst langsam und schaust nach hinten und rundum." } },
        { t: m[1], titel: "Gerade zurück", text: "Dreh den Oberkörper und schau durch die Heckscheibe. Dann rollst du gerade zurück, mit etwa fünfzig Zentimetern Abstand zum Bordstein.", regel: "Grundfahraufgabe Rückwärtsfahren" },
        { t: m[2], titel: "Um die Ecke lenken", text: "Sobald das Hinterrad die Ecke erreicht, lenkst du nach rechts. So folgt das Auto dem Bogen des Bordsteins. Die Front schwenkt dabei nach links auf die Fahrbahn. Schau vorher nochmal rundum.", regel: "§ 9 Abs. 5 StVO", frage: { text: "In welche Richtung lenkst du, damit das Heck nach rechts geht?", optionen: ["Ich lenke nach rechts", "Ich lenke nach links"], richtig: 0, erklaerung: "Beim Rückwärtsfahren drehst du das Lenkrad dorthin, wohin das Heck soll." } },
        { t: m[3], titel: "Gerade weiter", text: "Wenn das Auto parallel zum Bordstein der Seitenstraße steht, drehst du das Lenkrad gerade. Dann fährst du noch etwa eine Autolänge zurück.", regel: "Prüfungsrichtlinie · Grundfahraufgaben" }
      ],
      rangieren: { start: poseBei(fs, 0), ziel: { x: 5.8, y: 20, h: N, tolL: 6, tolQ: 0.45, tolH: 0.12, titel: "In der Seitenstraße", gut: "Gerade und nah am rechten Bordstein in der Seitenstraße." }, bordAbstand: 0.5, maxZuege: 2,
        hindernisse: [{ name: "das parkende Auto", x: 34, y: 2.4, h: 0, l: 4.5, b: 1.8 }], bordsteine: [OST, WEST, NORD], zoomFaktor: 1,
        anleitung: "Rückwärtsgang rein, rundum schauen, gerade zurück. An der Ecke lenkst du nach rechts und folgst dem Bordstein. Dann gerade in die Seitenstraße." }
    });
  })();

  // ---- Gefahrbremsung: 30 und 50 km/h im Vergleich
  (function () {
    const st = wohnstrasse(5.2, -5.2, -80, 140);
    st.linien.push({ art: "leit_io", b: 0.12, pts: [[-80, 0], [140, 0]] });
    const Y = 1.8, Y2 = -1.8, xG = 40, VZ = 8;                   // Gefahrenstelle (Ball) bei x = 40; Verzögerung 8 m/s² (ABS, trocken)
    // beide erreichen die Gefahr zur selben Zeit t0 bei x = 40 − 28 (28 m Abstand), reagieren nach 1 s
    const t0 = 3, tr = 1, abst = 20;
    function wagen(id, farbe, y, kmh, fokus) {
      const v = kmh / KMH, tb = t0 + tr, tStop = tb + v / VZ;
      const tempo = tempoProfil([[0, kmh], [tb, kmh], [tStop, 0], [60, 0]]);
      const f = fahrt(id, fokus ? "fahrschule" : "pkw", farbe, [[-200, y], [200, y]], [[0, kmh], [tb, kmh], [tStop, 0], [60, 0]], 200 + (xG - abst - 2.25), t0, { fokus });
      f.kmh = kmh; f.tb = tb; f.tStop = tStop; return f;
    }
    const A = wagen("fs", "#f2f2ee", Y, 50, true), B = wagen("v30", "#2c5aa0", Y, 30, false); B.geist = true;   // gleiche Spur, halbtransparent
    const pos = (f, t) => LZ.bau.rohPos(f, t).x;
    const kind = person("kind", "kind", "#f28c28", [[xG - 1.5, 6.4], [xG - 1.5, 4.4]], [[0, 0], [t0 + 0.6, 0], [t0 + 0.7, 7], [t0 + 1.6, 7], [t0 + 1.8, 0]]);
    const vRest = Math.sqrt(Math.max(0, (50 / KMH) ** 2 - 2 * VZ * Math.max(0, abst - 50 / KMH * tr))) * KMH;   // ≈ 35: steht in der Phase „Das Ergebnis“ als Wort „fünfunddreißig“ – ändert sich die Szene, Text anpassen
    const ball = person("ball", "ball", "#e53935", [[xG, 6.4], [xG, -6]], [[0, 0], [t0, 0], [t0 + 0.05, 12], [t0 + 3.5, 12], [t0 + 3.6, 0]]);
    const verd = [parkt("g1", "transporter", "#e7e3d6", xG - 5, 4.1, 0), parkt("g2", "pkw", "#6a7d8f", xG + 3.4, 4.2, 0)];
    const zeigeWege = (c, X, Y0, s, t) => {
      [A, B].forEach(f => {
        if (t < t0) return; const xg = pos(f, t0), xr = pos(f, Math.min(t, f.tb)), xs = pos(f, Math.min(t, f.tStop)), yy = LZ.bau.rohPos(f, 0).y;
        const st2 = { xGefahr: xg, xDruck: xr, xStop: t >= f.tStop ? xs : undefined, x: xs, phase: t >= f.tb ? "bremsen" : "gefahr" };
        if (t < f.tb) st2.xDruck = undefined;
        wegeOben(c, X, Y0, s, st2, yy, 1.2);
      });
    };
    grundfahrSzene({
      id: "gefahr", plan: ["gf_gefahr"], titel: "Gefahrbremsung: 30 oder 50?", kurz: "Reaktionsweg und Bremsweg zusammen sind der Anhalteweg, dazu ein Reaktionstest",
      dauer: 11, strasse: Object.assign(st, { schilder: [], bereich: [-80, 140] }), kamera: { fokus: "fs", zoom: 10, vor: 0.22 },
      fahrzeuge: [A, B, kind, ball].concat(verd),
      overlayUnten: zeigeWege,
      phasen: [
        { t: 0.2, titel: "Zwei Autos, gleiche Reaktion", text: "Zwei Fahrten auf derselben Spur. Du fährst Tempo fünfzig. Das durchsichtige Auto zeigt dich mit Tempo dreißig. Gleich rollt ein Ball zwischen parkenden Autos auf die Straße. Ein Kind läuft hinterher.", regel: "§ 3 Abs. 1 · § 3 Abs. 2a StVO" },
        { t: t0, titel: "Gefahr und Reaktionszeit", text: "Bis dein Fuß auf der Bremse ist, vergeht etwa eine Sekunde. In dieser Zeit fährt das Auto ungebremst weiter. Bei Tempo fünfzig sind das fast vierzehn Meter, bei Tempo dreißig gut acht Meter.", regel: "Faustformel Reaktionsweg: (km/h ÷ 10) · 3", frage: { text: "Wie lang ist der Reaktionsweg bei 50 Kilometern pro Stunde, nach der Faustformel?", optionen: ["Ich rechne mit 5 Metern", "Ich rechne mit 15 Metern", "Ich rechne mit 25 Metern"], richtig: 1, erklaerung: "Die Rechnung heißt 50 geteilt durch 10, mal 3. Das sind 15 Meter. Genau gerechnet sind es etwa 14 Meter pro Sekunde." } },
        { t: t0 + tr, titel: "Vollbremsung", text: "Jetzt trittst du Bremse und Kupplung gleichzeitig voll durch und hältst den Druck. Das Antiblockiersystem rattert, das ist gewollt. Bleib locker am Lenkrad, damit du ausweichen kannst.", regel: "Faustformel Gefahrbremsung: (km/h ÷ 10)² ÷ 2", frage: { text: "Wie lang ist der Bremsweg bei einer Gefahrbremsung aus 50 Kilometern pro Stunde, nach der Faustformel?", optionen: ["Ich rechne mit 12,5 Metern", "Ich rechne mit 25 Metern", "Ich rechne mit 50 Metern"], richtig: 0, erklaerung: "50 geteilt durch 10 ergibt 5. 5 mal 5 sind 25, geteilt durch 2 sind das 12,5 Meter. Ein normaler Bremsweg ohne Gefahr ist 25 Meter lang." } },
        { t: 7.5, titel: "Das Ergebnis", text: "Das Auto mit Tempo dreißig steht rechtzeitig. Mit Tempo fünfzig reicht der Weg nicht. Wo der Ball liegt, wäre es noch etwa fünfunddreißig Kilometer pro Stunde schnell. Tempo dreißig rettet Leben.", regel: "§ 3 Abs. 1 · § 3 Abs. 2a StVO", frage: { text: "Warum ist Tempo 30 vor Schulen so wichtig?", optionen: ["Ich denke an die Lautstärke", "Der Anhalteweg ist viel kürzer. Mit 50 bin ich an der Stelle, wo ich mit 30 schon stehe, noch fast so schnell wie beim Start", "Ich denke, das ist nur eine Empfehlung"], richtig: 1, erklaerung: "Je schneller du fährst, desto länger wird der Bremsweg. Er wächst mit dem Quadrat des Tempos." } }
      ],
      reaktion: { start: { x: -40, y: Y }, v: 50, abstand: abst, verz: VZ, gefahrY0: 6.4, gefahrY1: -3, kindY: 4.4 }
    });
  })();


  // ============================================================ ÜBERLAND
  // ---- Überholen auf der Landstraße
  (function () {
    const X0 = -400, X1 = 1900, b = 3.5, fl = [], li = [], obj = [];
    fl.push({ art: "asphalt", poly: rect(X0, -b - 0.3, X1, b + 0.3) });
    li.push({ art: "voll", b: 0.15, pts: [[X0, b - 0.1], [X1, b - 0.1]] }, { art: "voll", b: 0.15, pts: [[X0, -b + 0.1], [X1, -b + 0.1]] });
    // Vorführung: Fahrschule hinter einem Lkw (60 km/h), Gegenverkehr mit 100 km/h
    const yR = b / 2, yL = -b / 2, vL = 60 / KMH, vG = 100 / KMH;
    const lkwX = t => 30 + vL * t;
    const keys = [[0, 60], [6.2, 60], [10.8, 100], [60, 100]];
    const tp = tempoProfil(keys), fx = t => -10.5 + tp.s(t);            // Fahrschule (Weg ≈ x, Querversatz vernachlässigbar)
    const tA = 6.0, xA = fx(tA);                                         // Beginn Ausscheren
    let tB = tA; while (fx(tB) - lkwX(tB) < 20 + (4.6 + 16.5) / 2 + 12) tB += 0.05;   // Einscheren, wenn der Lkw weit genug zurück ist
    const xB = fx(tB), tE = tB + 1.6;
    const xV0 = Math.round(fx(tE + 5) + 400), xV1 = xV0 + 320;             // Überholverbot danach
    li.push({ art: "leit", b: 0.15, pts: [[X0, 0], [xV0 - 150, 0]] }, { art: "voll", b: 0.15, pts: [[xV0 - 150, 0], [xV1, 0]] }, { art: "leit", b: 0.15, pts: [[xV1, 0], [X1, 0]] });
    for (let x = X0 + 20; x < X1; x += 50) { obj.push({ art: "poller", x, y: b + 1.2 }, { art: "poller", x: x + 25, y: -b - 1.2 }); }
    for (let x = X0 + 40; x < X1; x += 37) { if ((x / 37 | 0) % 3) obj.push({ art: "baum", x, y: (x / 37 | 0) % 2 ? b + 7 : -b - 7, r: 2.4 }); }
    const schilder = [{ typ: "z274_100", x: -60, y: b + 1 }, { typ: "z276", x: xV0 - 150, y: b + 1 }, { typ: "z280", x: xV1, y: b + 1 }].map(sc => Object.assign(sc, { aussen: [0, 1], blick: [-1, 0] }));   // rechts, 1,5 m neben der Fahrbahn (beim Öffnen gestellt)
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", spurPfad2(-400, X1 + 300, yR, [{ x: xA, y: yL, laenge: 38 }, { x: xB, y: yR, laenge: 38 }]), keys, 400 - 10.5, 0, { fokus: true,
      blinker: [{ von: tA - 1.8, bis: tA + 1.6, seite: "links" }, { von: tB - 0.8, bis: tE, seite: "rechts" }], schulter: [{ von: tA - 1.1, bis: tA - 0.3, seite: "links" }] });
    const lkw = fahrt("lkw", "lkw", "#c9ced6", [[-400, yR], [X1 + 500, yR]], [[0, 60]], 430, 0);
    const g1 = fahrt("g1", "pkw", "#2c5aa0", [[X1 + 500, yL], [-900, yL]], [[0, 100]], X1 + 500 - (fx(3.8) + vG * 3.8), 0);
    const g2 = fahrt("g2", "transporter", "#e7e3d6", [[X1 + 900, yL], [-900, yL]], [[0, 95]], X1 + 900 - (fx(tE + 3.5) + 95 / KMH * (tE + 3.5)), 0);
    const tV = (() => { let t = tE; while (fx(t) < xV0 - 150 && t < 60) t += 0.1; return t; })();
    LZ.registriere({
      id: "ueberholen", kategorie: "ueberland", plan: ["s_ueb_ueber", "s_ueb_voraus"], titel: "Überholen auf der Landstraße", kurz: "Sicht prüfen, Gegenverkehr abwarten, zügig überholen, mit Abstand einscheren",
      dauer: Math.ceil(tV + 4), strasse: { flaechen: fl, linien: li, objekte: obj, schilder, bereich: [X0, X1], boden: "#6a9a52", boden3d: "#6f9a55" }, kamera: { fokus: "fs", zoom: 5, vor: 0.25 },
      fahrzeuge: [fs, lkw, g1, g2],
      phasen: [
        { t: 0.2, titel: "Langsamer Lastwagen vorne", text: "Schau mal, außerorts sind hundert Kilometer pro Stunde erlaubt. Vor dir fährt ein Lastwagen mit sechzig. Halte genug Abstand. So siehst du an ihm vorbei und kannst Anlauf nehmen.", regel: "§ 4 Abs. 1 · § 5 Abs. 2 StVO", frage: { text: "Wann darfst du überholen?", optionen: ["Ich überhole immer, wenn ich schneller bin", "Nur wenn ich überblicken kann, dass der Gegenverkehr die ganze Zeit nicht behindert wird, und ich wesentlich schneller bin", "Ich überhole nur rechts"], richtig: 1, erklaerung: "Du darfst nur überholen, wenn der Gegenverkehr sicher nicht behindert wird und du wesentlich schneller bist." } },
        { t: 2.2, titel: "Gegenverkehr", text: "Ein Auto kommt entgegen. Schere jetzt nicht aus, warte ab.", regel: "§ 5 Abs. 2 StVO", frage: { text: "Wie viel freie Strecke brauchst du ungefähr, um einen Lastwagen mit 60 bei 100 Kilometern pro Stunde zu überholen?", optionen: ["Ich brauche etwa 100 Meter", "Ich brauche etwa 250 Meter. Der Gegenverkehr kommt in der Zeit noch einmal so weit entgegen. Ich brauche also rund 500 Meter Sicht", "Ich brauche etwa 50 Meter"], richtig: 1, erklaerung: "Die Fahrzeuglängen und der Abstand davor und danach ergeben etwa 100 Meter. Das rechnest du mal 100 und teilst durch 40, den Unterschied im Tempo. So kommst du auf etwa 250 Meter. In derselben Zeit kommt der Gegenverkehr noch einmal so weit entgegen." } },
        { t: tA - 1.8, titel: "Spiegel, Blinker, Schulterblick", text: "Ist alles frei und übersichtlich, ohne durchgezogene Linie? Dann schau in den Innenspiegel und in den Außenspiegel und blinke links. Direkt vor dem Ausscheren machst du den Schulterblick nach links.", regel: "§ 5 Abs. 4 · § 5 Abs. 4a StVO" },
        { t: tA, titel: "Zügig vorbei", text: "So, jetzt schere aus und beschleunige zügig. Die Höchstgeschwindigkeit bleibt trotzdem die Grenze. Halte genug Seitenabstand zum Lastwagen.", regel: "§ 5 Abs. 2 · § 5 Abs. 4 · § 3 Abs. 3 StVO", frage: { text: "Der Lastwagen wird beim Überholen schneller. Darf er das?", optionen: ["Ja, das darf er", "Nein. Wer überholt wird, darf nicht schneller werden"], richtig: 1, erklaerung: "Wer überholt wird, darf seine Geschwindigkeit nicht erhöhen." } },
        { t: tB - 0.8, titel: "Blinker rechts, wieder einordnen", text: "Siehst du den Lastwagen im Innenspiegel ganz, blinkst du rechts und ordnest dich wieder rechts ein. Schere nicht knapp vor ihm ein.", regel: "§ 5 Abs. 4 · § 5 Abs. 4a StVO" },
        { t: Math.min(tV - 1, tE + 3), titel: "Überholverbot voraus", text: "Und hier stehen das Schild Überholverbot und eine durchgezogene Linie. Überholen ist hier verboten, etwa vor Kuppen und Kurven. Ein Überholen, das du begonnen hast, musst du vorher beenden.", regel: "Zeichen 276 · Zeichen 295", frage: { text: "Darfst du die durchgezogene Mittellinie zum Überholen überfahren?", optionen: ["Ja, kurz darf ich sie überfahren", "Nein, ich darf sie nicht überfahren", "Nur bei Traktoren darf ich sie überfahren"], richtig: 1, erklaerung: "Die durchgezogene Linie darfst du nicht überfahren." } }
      ].sort((a, b2) => a.t - b2.t),
      fahren: {
        start: { pfad: pfad(spurPfad2(-400, X1 + 400, yR)), s: 400 - 10.5, v: 60 },
        spuren: { links: yL, rechts: yR }, spurStart: "rechts", wechselFaktor: 1.4, verbotVon: xV0 - 150, verbotBis: xV1, bewerten: "ueberholen",
        wechselErlaubt: (x, von, nach) => nach === "rechts" || x < xV0 - 150 || x > xV1,
        wechselHinweis: () => "Hier ist Überholen verboten, die Linie ist durchgezogen.",
        verkehr: [
          { typ: "lkw", y: yR, x0: 30, v: 60, farbe: "#c9ced6" },
          { typ: "pkw", y: yL, x0: 170, v: 100, farbe: "#2c5aa0", gegen: true }, { typ: "pkw", y: yL, x0: 470, v: 100, farbe: "#b3322c", gegen: true },
          { typ: "transporter", y: yL, x0: 1550, v: 95, farbe: "#e7e3d6", gegen: true }, { typ: "pkw", y: yL, x0: 2200, v: 100, farbe: "#3a3f45", gegen: true }
        ],
        tipps: [{ x: -5, text: "Halte Abstand zum Lastwagen. Beobachte den Gegenverkehr: Wo ist eine große Lücke?" }, { x: 130, text: "Das zweite Auto ist nah, die Lücke ist zu klein. Warten!" }]
      }
    });
  })();

  // ---- Schulbus mit Warnblinklicht an der Haltestelle
  (function () {
    const st = wohnstrasse(3.6, -3.6, -80, 140);                                  // Tempo-30-Zone: keine Leitlinie (§ 45 Abs. 1c StVO)
    st.schilder = [{ typ: "z224", x: 55, y: 5.2, aussen: [0, 1], blick: [-1, 0] }, { typ: "zone30", x: -60, y: 5.2, aussen: [0, 1], blick: [-1, 0] }];
    const yR = 1.8, yL = -1.8, xBus = 46;                                      // Bus hält mit der Mitte bei x = 46 (Front bei 52)
    // Bus: Ankunft ermitteln, dann alle Zeiten daran ausrichten
    let busPlan = fahrplan({ vMax: 30, halte: [{ s: 120 + xBus, bis: 999 }], dauer: 70, s0: 120 - 40 });
    let bus = fahrt("bus", "bus", "#f2c230", [[-120, yR], [300, yR]], busPlan, 120 - 40, 0);
    const tBus = tBeiS(bus, 120 + xBus - 0.4), tAb = tBus + 43;
    busPlan = fahrplan({ vMax: 30, halte: [{ s: 120 + xBus, bis: tAb }], dauer: 80, s0: 120 - 40 });
    bus = fahrt("bus", "bus", "#f2c230", [[-120, yR], [300, yR]], busPlan, 120 - 40, 0, { schulbus: true, warnblink: [{ von: 1.2, bis: tAb - 1.5 }], blinker: [{ von: tAb - 1.5, bis: tAb + 3, seite: "links" }] });
    // Fahrschule: bleibt hinter dem Bus, hält, fährt dann mit Schrittgeschwindigkeit vorbei und wartet auf das Kind
    const halt1 = xBus - 6 - 8 - 2.25, xAus = halt1 + 1.5;
    const fsWeg = [[-120, yR], [xAus, yR], [xAus + 7, yL + 0.1], [xBus + 12, yL + 0.1], [xBus + 19, yR], [300, yR]];
    const sBei = x => sNahe(fsWeg, x, x < xAus + 7 || x > xBus + 19 ? yR : yL + 0.1);
    const t1 = tBus + 13, t2 = tBus + 31.8;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", fsWeg, fahrplan({ vMax: 28, grenzen: [{ von: sBei(xAus) - 2, bis: sBei(xBus + 16), v: 6 }], halte: [{ s: sBei(halt1), bis: t1 }, { s: sBei(xBus + 7.5 - 2.25 - 2.5), bis: t2 }], dauer: 90, s0: 120 - 62 }), 120 - 62, 0, { fokus: true, bremsStand: true,
      blinker: [{ von: t1 - 1.8, bis: t1 + 3.5, seite: "links" }] });
    { const tR = tBeiS(fs, sBei(xBus + 12)); fs.blinker.push({ von: tR - 1.5, bis: tR + 3, seite: "rechts" }); }
    // Gegenverkehr: ebenfalls nur Schrittgeschwindigkeit am haltenden Schulbus – vorbei, bevor die Fahrschule ausschert
    const gS0 = 260 - (xBus + 10);                                                // Zonenbeginn auf dem Weg des Gegenverkehrs
    const gS00 = gS0 - 30 / KMH * (tBus + 1);                                    // so, dass der Zonenbeginn um tBus + 1 erreicht wird
    const g = fahrt("g", "pkw", "#2c5aa0", [[260, yL], [-200, yL]], fahrplan({ vMax: 30, grenzen: [{ von: gS0, bis: gS0 + 20, v: 7 }], dauer: 90, s0: gS00 }), gS00, 0, { bremsStand: true });
    const imBus = t0 => t => t < t0;                                               // Kinder sind bis zum Aussteigen im Bus
    const kinder = [0, 1, 2].map(i => person("k" + i, "kind", ["#e53935", "#1e88e5", "#43a047"][i], [[xBus + 3 - i * 1.2, 3.3], [xBus + 3 - i * 1.2, 6.2 - i * 0.7], [xBus - 8 - i * 3, 6.2 - i * 0.7]], [[0, 0], [tBus + 1.5 + i * 0.9, 0], [tBus + 1.7 + i * 0.9, 3.5], [90, 3.5]], { unsichtbar: imBus(tBus + 1.2 + i * 0.9) }));
    // ein Kind läuft vor dem Bus über die Straße
    const renner = person("k3", "kind", "#f28c28", [[xBus + 4.5, 3.9], [xBus + 7.5, 3.9], [xBus + 7.5, -7]], [[0, 0], [tBus + 25.2, 0], [tBus + 25.4, 6.5], [90, 6.5]], { unsichtbar: imBus(tBus + 2) });
    innerortsSzene({
      id: "schulbus", plan: ["a_stadt"], titel: "Schulbus mit Warnblinklicht", kurz: "Nicht überholen, nur Schritttempo, auch im Gegenverkehr, und mit Kindern rechnen",
      dauer: Math.ceil(tAb + 5), strasse: Object.assign(st, { bereich: [-80, 140] }), kamera: { fest: [40, 1], zoom: 9 },
      fahrzeuge: [fs, bus, g, renner].concat(kinder),
      phasen: [
        { t: 0.2, titel: "Schulbus mit Warnblinklicht", text: "Schau mal, der Schulbus fährt mit Warnblinklicht auf die Haltestelle zu. Du darfst ihn jetzt nicht überholen.", regel: "§ 20 Abs. 3 StVO", frage: { text: "Darfst du den Bus überholen, solange er mit Warnblinklicht auf die Haltestelle zufährt?", optionen: ["Ja, wenn frei ist, überhole ich", "Nein, ich überhole nicht", "Ich überhole nur mit Hupe"], richtig: 1, erklaerung: "Linienbusse und Schulbusse, die mit Warnblinklicht auf eine Haltestelle zufahren, darfst du nicht überholen." } },
        { t: tBus, titel: "Bus hält, Kinder steigen aus", text: "Der Bus hält, die Kinder steigen aus. Halte am besten erst mal mit Abstand hinter dem Bus. Kinder sind unberechenbar. Sie können hinter oder vor dem Bus auf die Straße laufen.", regel: "§ 20 Abs. 4 · § 3 Abs. 2a StVO" },
        { t: t1 - 1.8, titel: "Schritttempo", text: "Dann fährst du nur im Schritttempo vorbei, also etwa vier bis sieben Kilometer pro Stunde. Halte so viel Abstand, dass niemand in Gefahr kommt. Das gilt auch für den Gegenverkehr.", regel: "§ 20 Abs. 4 StVO", frage: { text: "Gilt das Schritttempo auch für den Gegenverkehr?", optionen: ["Nein, ich fahre nur in meiner Richtung im Schritttempo", "Ja, auch im Gegenverkehr auf derselben Fahrbahn fahre ich nur im Schritttempo", "Ich fahre nur an Schultagen im Schritttempo"], richtig: 1, erklaerung: "Das Schritttempo gilt auch für den Gegenverkehr auf derselben Fahrbahn." } },
        { t: tBus + 26.4, titel: "Kind läuft auf die Straße", text: "Pass auf, vor dem Bus läuft ein Kind über die Straße. Halte sofort an. Wenn nötig, wartest du.", regel: "§ 20 Abs. 4 StVO", frage: { text: "Was tust du?", optionen: ["Ich weiche aus und fahre weiter", "Ich halte an und warte, bis das Kind sicher drüben ist", "Ich hupe"], richtig: 1, erklaerung: "Wenn nötig, wartest du. Du musst sicher sein, dass niemand in Gefahr kommt, auch die Fahrgäste nicht." } },
        { t: tAb - 1.5, titel: "Bus fährt ab", text: "Der Bus blinkt jetzt links, weil er von der Haltestelle abfahren will. Lass ihn losfahren. Wenn nötig, wartest du.", regel: "§ 20 Abs. 5 StVO" }
      ]
    });
  })();

  // ============================================================ INNERORTS
  function innerortsSzene(sz) { sz.kategorie = "innerorts"; if (!sz.kamera) sz.kamera = { fest: [0, 0], zoom: 11 }; LZ.registriere(sz); }
  // Standard-Kreuzung mit Häusern
  function stadtKreuzung(o) {
    o = o || {}; const K = kreuzung(o);
    const d = (K.bN || K.b) + K.g + 8, e = (K.bO || K.b) + K.g + 8;
    if (o.haeuser !== false) {
      haeuser(K.objekte, [[d + 4, e + 3, 11, 9, 9, "#d9cfbf"], [d + 18, e + 4, 10, 10, 7, "#e3d7c3", "#8a4a36"], [-d - 4, e + 3, 11, 9, 8, "#cdd3d8", "#6d5a4a"], [-d - 18, e + 3, 10, 9, 10, "#e3d7c3"],
        [d + 4, -e - 3, 11, 9, 8, "#e3d7c3"], [d + 18, -e - 4, 10, 10, 10, "#d4c7b6", "#6d5a4a"], [-d - 4, -e - 3, 11, 9, 7, "#d9cfbf", "#8a4a36"], [-d - 18, -e - 3, 10, 9, 9, "#cdd3d8"],
        [d + 3, e + 18, 10, 10, 8, "#dadcd6"], [-d - 3, e + 18, 10, 10, 7, "#e3d7c3"], [d + 3, -e - 18, 10, 10, 9, "#d9cfbf"], [-d - 3, -e - 18, 10, 10, 8, "#cdd3d8"]].filter(h => {
          if (!(o.arme || {}).N && o.arme && h[1] < 0 && Math.abs(h[0]) < 20) return true; return true; }));
      baeume(K.objekte, [[K.bN + K.g - 0.7, e + 6, 1.6], [-K.bN - K.g + 0.7, -e - 6, 1.6], [d + 10, K.bO + K.g - 0.7, 1.6], [-d - 10, K.bO + K.g - 0.7, 1.6]]);
    }
    return Object.assign(K, { schilder: [], bereich: [-K.L, K.L], boden: "#6a9a52", boden3d: "#6f9a55" });
  }

  // ---- Rechts vor links in der Tempo-30-Zone
  (function () {
    const K = stadtKreuzung({ b: 3.0, R: 5 });
    K.schilder.push({ typ: "zone30", x: 4.8, y: 38, aussen: [1, 0], blick: [0, 1] });
    // Ankunft: alle drei halten an der Kreuzung. Reihenfolge: B (von Osten, hat niemanden rechts) → Fahrschule (von Süden) → C (von Westen)
    const e = 8.2;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", route("S", "N", { q: 1.5, e }), [[0, 30], [2.5, 22], [4.2, 0], [7.8, 0], [10, 25], [20, 30]], 70 - e, 4.2, { fokus: true, bremsStand: true });
    const bO = fahrt("b", "pkw", "#2c5aa0", route("O", "W", { q: 1.5, e }), [[0, 30], [2.6, 20], [4.4, 0], [4.9, 0], [7, 25], [20, 30]], 70 - e, 4.4, { bremsStand: true });
    const cW = fahrt("c", "pkw", "#b3322c", route("W", "N", { q: 1.5, e, k: 0.6 }), [[0, 30], [2.8, 18], [4.6, 0], [10.8, 0], [13, 18], [20, 25]], 70 - e, 4.6, { bremsStand: true, blinker: [{ von: 1.5, bis: 16, seite: "links" }] });
    innerortsSzene({
      id: "rvl", plan: ["a_30", "g_abb1"], titel: "Rechts vor links (Tempo-30-Zone)", kurz: "Wer darf zuerst? Drei Autos an einer Kreuzung ohne Schilder",
      dauer: 18, strasse: K, kamera: { fest: [0, 2], zoom: 9 },
      fahrzeuge: [fs, bO, cW],
      phasen: [
        { t: 0.2, titel: "Kreuzung ohne Schilder", text: "Schau mal, in einer Zone mit Tempo dreißig gibt es fast nie Vorfahrtschilder. Hier gilt rechts vor links. Fahr langsam heran, damit du anhalten kannst.", regel: "Zeichen 274.1 · § 8 Abs. 1 StVO", frage: { text: "Welche Regel gilt an dieser Kreuzung?", optionen: ["Ich denke, es gilt rechts vor links", "Ich denke, die breitere Straße hat Vorfahrt", "Ich denke, wer zuerst da ist, fährt"], richtig: 0, erklaerung: "Ohne Schilder, Ampel oder Polizei gilt rechts vor links. Wer von rechts kommt, hat Vorfahrt." } },
        { t: 4.5, titel: "Wer fährt zuerst?", text: "So, jetzt stehen alle drei. Jeder schaut nach rechts. Wer dort niemanden hat, darf zuerst fahren.", regel: "§ 8 Abs. 1 · § 8 Abs. 2 StVO", frage: { art: "reihenfolge", text: "Tippe die Autos in der Reihenfolge an, in der sie fahren dürfen.", ids: ["b", "fs", "c"], namen: { b: "Blau, von rechts", fs: "Du", c: "Rot, biegt links ab" }, erklaerung: "Blau hat rechts niemanden und fährt zuerst. Dann kommst du, denn Blau stand rechts von dir. Rot kommt zuletzt, denn rechts von Rot standest du." } },
        { t: 5, titel: "Blau fährt", text: "Das blaue Auto hat niemanden von rechts. Es fährt als Erstes.", regel: "§ 8 Abs. 1 StVO" },
        { t: 8, titel: "Dann du", text: "Jetzt ist rechts von dir frei. Du fährst geradeaus über die Kreuzung.", regel: "§ 8 Abs. 1 StVO" },
        { t: 11, titel: "Zuletzt Rot", text: "Zuletzt fährt Rot und biegt links ab. Es musste warten, weil du von rechts kamst.", regel: "§ 8 Abs. 1 StVO" },
        { t: 14.5, titel: "Zum Merken", text: "Und noch etwas Wichtiges. Musst du warten, zeig das rechtzeitig. Fahr dazu mäßig schnell heran. Stehen an allen vier Seiten Autos, verständigt euch. Einer verzichtet.", regel: "§ 8 Abs. 2 · § 11 Abs. 3 StVO" }
      ]
    });
  })();

  // ---- Linksabbiegen: Gegenverkehr hat Vorrang (und entgegenkommende Rechtsabbieger)
  (function () {
    const K = stadtKreuzung({ b: 3.25, R: 6 });
    K.linien.push({ art: "leit_io", b: 0.12, pts: [[0, 70], [0, 12]] }, { art: "leit_io", b: 0.12, pts: [[0, -12], [0, -70]] }, { art: "leit_io", b: 0.12, pts: [[-70, 0], [-12, 0]] }, { art: "leit_io", b: 0.12, pts: [[12, 0], [70, 0]] });
    const e = 9;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", route("S", "W", { q: 1.2, e: 2.2, e2: 7, k: 0.62 }), [[0, 35], [3, 18], [5.2, 0], [16.8, 0], [18.7, 18], [26, 30]], 70 - 2.2, 5.2, { fokus: true, bremsStand: true, blinker: [{ von: 0.8, bis: 21, seite: "links" }], schulter: [{ von: 15.9, bis: 16.7, seite: "links" }] });
    const g1 = fahrt("g1", "pkw", "#2c5aa0", route("N", "S", { q: 1.625, e }), [[0, 40]], 70, 6.0);
    const g3 = fahrt("g3", "pkw", "#b3322c", route("N", "W", { q: 1.625, e: 7, e2: 7, k: 0.5 }), [[0, 30], [6, 30], [8.6, 16], [11, 20], [20, 25]], 70 - 7, 9.4, { blinker: [{ von: 0, bis: 11, seite: "rechts" }] });
    const g2 = fahrt("g2", "transporter", "#e7e3d6", route("N", "S", { q: 1.625, e }), [[0, 38]], 70, 12.0);
    const fg = person("fg1", "fussgaenger", "#3a6ea5", [[-9.5, 9], [-9.5, -9]], [[0, 0], [7.6, 0], [7.8, 4.6], [40, 4.6]]);
    innerortsSzene({
      id: "links_gegen", plan: ["l_links", "g_abb1"], titel: "Linksabbiegen mit Gegenverkehr", kurz: "Der Gegenverkehr und entgegenkommende Rechtsabbieger haben Vorrang",
      dauer: 24, strasse: K, kamera: { fest: [-2, 2], zoom: 9 },
      fahrzeuge: [fs, g1, g2, g3, fg],
      phasen: [
        { t: 0.2, titel: "Einordnen", text: "Zuerst schaust du in den Spiegel, blinkst links und ordnest dich zur Mitte ein. Achte vorher auf den Verkehr hinter dir.", regel: "§ 9 Abs. 1 StVO", frage: { text: "Wo ordnest du dich zum Linksabbiegen ein?", optionen: ["Ich ordne mich ganz rechts ein", "Ich ordne mich bis zur Mitte der Fahrbahn ein", "Ich ordne mich auf der Gegenfahrbahn ein"], richtig: 1, erklaerung: "Zum Linksabbiegen ordnest du dich bis zur Mitte ein. In Einbahnstraßen fährst du möglichst weit links." } },
        { t: 5.3, titel: "In der Kreuzung warten", text: "Dann fährst du bis in die Kreuzung vor und wartest. Die Räder stehen gerade. Wirst du von hinten angestoßen, rollst du nicht in den Gegenverkehr.", regel: "§ 9 Abs. 3 StVO", frage: { art: "reihenfolge", text: "Tippe an, in welcher Reihenfolge die Fahrzeuge fahren dürfen.", ids: ["g1", "g3", "g2", "fs"], namen: { g1: "Blau, geradeaus", g3: "Rot, biegt rechts ab", g2: "Transporter, geradeaus", fs: "Du, links abbiegend" }, erklaerung: "Wer links abbiegt, lässt den Gegenverkehr durch, auch den Rechtsabbieger von gegenüber. Du fährst zuletzt." } },
        { t: 6.5, titel: "Gegenverkehr durchlassen", text: "Der Gegenverkehr geradeaus hat Vorrang, und der Rechtsabbieger von gegenüber auch. Biege erst ab, wenn alles frei ist und kein Fußgänger mehr die Straße quert.", regel: "§ 9 Abs. 3 · § 9 Abs. 4 StVO" },
        { t: 12.6, titel: "Fußgänger beachten", text: "Siehst du, in der Straße, in die du abbiegst, geht ein Fußgänger über die Fahrbahn. Nimm besonders Rücksicht und warte, bis er drüben ist.", regel: "§ 9 Abs. 3 StVO", frage: { text: "Der Fußgänger ist noch auf der Fahrbahn. Was tust du?", optionen: ["Ich hupe", "Ich warte, bis er vorbei ist", "Ich fahre knapp hinter ihm durch"], richtig: 1, erklaerung: "Beim Abbiegen nimmst du besonders Rücksicht auf Fußgänger. Wenn nötig, wartest du." } },
        { t: 15.9, titel: "Schulterblick links", text: "Direkt vor dem Abbiegen machst du den Schulterblick nach links. Da können Radfahrer sein oder jemand, der dich überholt. Dann biegst du zügig in einem weiten Bogen ab.", regel: "§ 9 Abs. 1 StVO" }

      ]
    });
  })();

  // ---- Zwei Linksabbieger: voreinander abbiegen
  (function () {
    const K = stadtKreuzung({ b: 3.5, R: 9 });
    K.linien.push({ art: "leit_io", b: 0.12, pts: [[0, 70], [0, 13]] }, { art: "leit_io", b: 0.12, pts: [[0, -13], [0, -70]] }, { art: "leit_io", b: 0.12, pts: [[-70, 0], [-13, 0]] }, { art: "leit_io", b: 0.12, pts: [[13, 0], [70, 0]] });
    const RB = 9.5, wegS = [[1.75, 70], [1.75, RB - 1.75]].concat(bogen(1.75 - RB, RB - 1.75, RB, 0, -PI / 2, 24)).concat([[-70, -1.75]]);
    const wegN = wegS.map(([x, y]) => [-x, -y]);
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", wegS, [[0, 30], [3, 15], [4.8, 0], [6, 0], [8.5, 15], [16, 30]], 70 - (RB - 1.75) - 2.5, 4.8, { fokus: true, bremsStand: true, blinker: [{ von: 0.5, bis: 12, seite: "links" }] });
    const g = fahrt("g", "pkw", "#b3322c", wegN, [[0, 30], [3, 15], [4.8, 0], [6.1, 0], [8.6, 15], [16, 30]], 70 - (RB - 1.75) - 2.5, 4.8, { bremsStand: true, blinker: [{ von: 0.5, bis: 12, seite: "links" }] });
    innerortsSzene({
      id: "voreinander", plan: ["l_links"], titel: "Zwei Linksabbieger: voreinander", kurz: "Wer sich gegenübersteht und links abbiegt, biegt voreinander ab",
      dauer: 14, strasse: K, kamera: { fest: [0, 0], zoom: 10 },
      fahrzeuge: [fs, g],
      phasen: [
        { t: 0.2, titel: "Zwei Linksabbieger", text: "Schau mal, du und das rote Auto wollt beide nach links abbiegen. Ihr steht euch gegenüber.", regel: "§ 9 Abs. 4 StVO", frage: { text: "Wie biegen die beiden ab?", optionen: ["Wir biegen voreinander ab. Jeder biegt vor dem anderen ab", "Wir biegen umeinander herum ab", "Ich biege zuerst ab, wenn ich zuerst da bin"], richtig: 0, erklaerung: "Entgegenkommende Linksabbieger biegen voreinander ab. Anders nur, wenn die Verkehrslage oder die Form der Kreuzung es verlangt." } },
        { t: 6, titel: "Voreinander abbiegen", text: "Ihr fahrt gleichzeitig los und biegt voreinander ab, rechts an rechts vorbei. Das spart Zeit. Aber das rote Auto verdeckt dir die Sicht auf den Gegenverkehr dahinter. Sei besonders aufmerksam.", regel: "§ 9 Abs. 4 StVO" },
        { t: 10.5, titel: "Zum Merken", text: "Und merk dir noch eins. Umeinander herum biegt ihr nur ab, wenn Markierungen, die Ampel oder die Form der Kreuzung es verlangen.", regel: "§ 9 Abs. 4 StVO" }
      ]
    });
  })();

  // ---- Rechtsabbiegen: Radfahrer auf dem Radweg hat Vorrang
  (function () {
    const K = stadtKreuzung({ b: 3.25, R: 6, g: 4.2 });
    // Radweg (rot) entlang der Nord-Süd-Straße, rechts neben der Fahrbahn
    K.flaechen.push({ art: "rad", poly: rect(3.6, 11, 5.4, 90) }, { art: "rad", poly: rect(3.6, -90, 5.4, -11) }, { art: "rad", poly: rect(3.6, -11, 5.4, 11), farbe: "#b2573c" });
    for (let y = -10.5; y < 11; y += 1) K.flaechen.push({ art: "weiss", poly: rect(3.6, y, 3.75, y + 0.5) }, { art: "weiss", poly: rect(5.25, y, 5.4, y + 0.5) });
    K.linien.push({ art: "leit_io", b: 0.12, pts: [[0, 70], [0, 12]] });
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", route("S", "O", { q: 1.9, e: 8.5, e2: 8.5, k: 0.5 }), [[0, 30], [3, 15], [5, 5], [5.8, 0], [7.8, 0], [9.5, 12], [15, 25]], 70 - 8.5, 5.8, { fokus: true, bremsStand: true, blinker: [{ von: 0.5, bis: 11, seite: "rechts" }], schulter: [{ von: 4.4, bis: 5.3, seite: "rechts" }] });
    const rad = fahrt("rad", "rad", "#2c5aa0", [[4.5, 60], [4.5, -60]], [[0, 18]], 60 - 8, 6.2, {});
    const rad2 = fahrt("rad2", "rad", "#7b8a52", [[4.5, 80], [4.5, -60]], [[0, 16]], 80 - 8, 13, {});
    innerortsSzene({
      id: "rechts_rad", plan: ["g_abb1", "g_abb2", "a_stadt"], titel: "Rechtsabbiegen mit Radweg", kurz: "Schulterblick, der Radfahrer geradeaus hat Vorrang",
      dauer: 16, strasse: K, kamera: { fest: [4, 6], zoom: 10 },
      fahrzeuge: [fs, rad, rad2],
      phasen: [
        { t: 0.2, titel: "Rechts einordnen und blinken", text: "Zuerst schaust du in den Spiegel, blinkst rechts und ordnest dich möglichst weit rechts ein. Rechts neben der Fahrbahn verläuft ein Radweg.", regel: "§ 9 Abs. 1 StVO", frage: { text: "Wer hat hier Vorrang?", optionen: ["Ich habe Vorrang, ich bin schneller", "Der Radfahrer, der geradeaus fährt, hat Vorrang", "Ich habe Vorrang, wenn ich die Kreuzung zuerst erreiche"], richtig: 1, erklaerung: "Wer abbiegt, muss Radfahrer durchfahren lassen, die neben der Fahrbahn in gleicher Richtung fahren." } },
        { t: 4.4, titel: "Schulterblick rechts", text: "Direkt vor dem Abbiegen schaust du noch einmal in den Spiegel und über die rechte Schulter. Ein Radfahrer kann im toten Winkel sein.", regel: "§ 9 Abs. 1 · § 9 Abs. 3 StVO" },
        { t: 5.8, titel: "Warten", text: "Pass auf, der Radfahrer kommt von hinten und fährt geradeaus. Halte an und lass ihn durch. Erst danach biegst du in einem engen Bogen nach rechts ab.", regel: "§ 9 Abs. 3 StVO", frage: { text: "Was tust du jetzt?", optionen: ["Ich biege vor dem Radfahrer schnell ab", "Ich halte an und lasse ihn durch", "Ich hupe, damit er bremst"], richtig: 1, erklaerung: "Der Radfahrer hat Vorrang. Unfälle beim Rechtsabbiegen mit Radfahrern gehören zu den schwersten im Stadtverkehr." } },
        { t: 8, titel: "Abbiegen und weiter beobachten", text: "Du biegst erst ab, wenn alles frei ist. Schau beim Abbiegen weiter nach Radfahrern und Fußgängern. Der nächste Radfahrer kommt schon.", regel: "§ 9 Abs. 3 StVO" }
      ]
    });
  })();

  // ---- Doppelspuriges Linksabbiegen
  (function () {
    const K = stadtKreuzung({ bNS: 6.5, bOW: 6.5, R: 7, g: 3 });
    // Zufahrt von Süden: zwei Linksabbiegestreifen (x 0..3 und 3..6?) – hier: links 0–3,25 und 3,25–6,5 beide nach links; Gegenfahrbahn −6,5..0
    K.linien.push({ art: "voll", b: 0.12, pts: [[0, 90], [0, 7]] }, { art: "voll", b: 0.12, pts: [[3.25, 30], [3.25, 7]] }, { art: "leit_io", b: 0.12, pts: [[3.25, 90], [3.25, 30]] });
    K.linien.push({ art: "voll", b: 0.12, pts: [[0, -7], [0, -90]] }, { art: "leit_io", b: 0.12, pts: [[-3.25, -7], [-3.25, -90]] });
    K.linien.push({ art: "voll", b: 0.12, pts: [[-90, 0], [-7, 0]] }, { art: "leit_io", b: 0.12, pts: [[-90, -3.25], [-7, -3.25]] }, { art: "voll", b: 0.12, pts: [[7, 0], [90, 0]] }, { art: "leit_io", b: 0.12, pts: [[7, 3.25], [90, 3.25]] });
    K.linien.push({ art: "voll", b: 0.5, pts: [[0.2, 12.2], [6.3, 12.2]] });
    K.objekte.push({ art: "ampel", x: 7.4, y: 12.6, h: PI / 2, phasen: [[99, "gruen"]] }, { art: "ampel", x: -7.4, y: -12.6, h: -PI / 2, phasen: [[99, "rot"]] }, { art: "ampel", x: -12.6, y: 7.4, h: PI, phasen: [[99, "rot"]] }, { art: "ampel", x: 12.6, y: -7.4, h: 0, phasen: [[99, "rot"]] });
    // Leitlinien im Knoten für die beiden Abbiegespuren
    const kn = bezier([3.25, 7], [3.25, 0], [0, -3.25], [-7, -3.25], 20); K.linien.push({ art: "leit_io", b: 0.12, pts: kn });
    // Pfeile (Zeichen 297) als weiße Flächen
    const pfeilL = (x, y) => [[x - 0.12, y + 2.2], [x + 0.12, y + 2.2], [x + 0.12, y + 0.4], [x - 0.5, y + 0.4], [x - 0.5, y + 0.1], [x - 1.0, y + 0.55], [x - 0.5, y + 1.0], [x - 0.5, y + 0.7], [x - 0.12, y + 0.7]];
    K.flaechen.push({ art: "weiss", poly: pfeilL(1.9, 15) }, { art: "weiss", poly: pfeilL(5.1, 15) });
    const a = [[1.625, 90], [1.625, 7]].concat(bezier([1.625, 7], [1.625, -1], [-2, -1.625], [-7, -1.625], 20)).concat([[-90, -1.625]]);
    const b = [[4.875, 90], [4.875, 7]].concat(bezier([4.875, 7], [4.875, -2.5], [-2, -4.875], [-7, -4.875], 20)).concat([[-90, -4.875]]);
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", b, [[0, 30], [4, 20], [10, 20], [16, 35]], 83, 5.5, { fokus: true, blinker: [{ von: 0, bis: 9, seite: "links" }] });
    const n = fahrt("n", "pkw", "#2c5aa0", a, [[0, 30], [4, 20], [10, 20], [16, 35]], 83, 5.3, { blinker: [{ von: 0, bis: 9, seite: "links" }] });
    const h1 = fahrt("h1", "pkw", "#3a3f45", b, [[0, 30], [4, 20], [10, 20], [16, 35]], 83, 7.9, { blinker: [{ von: 0, bis: 12, seite: "links" }] });
    innerortsSzene({
      id: "doppel", plan: ["a_doppel"], titel: "Doppelspuriges Linksabbiegen", kurz: "Zwei Abbiegespuren. Jeder bleibt in seiner Spur.",
      dauer: 14, strasse: K, kamera: { fest: [0, 2], zoom: 8 },
      fahrzeuge: [fs, n, h1],
      phasen: [
        { t: 0.2, titel: "Zwei Spuren nach links", text: "Schau mal, beide Spuren führen nach links. Die Pfeile auf der Straße zeigen es. Die Ampel ist grün. Schau in den Spiegel, blinke und ordne dich rechtzeitig ein. Dann bleib in deiner Spur.", regel: "Zeichen 297 · § 9 Abs. 1 StVO", frage: { text: "Du bist auf der rechten der beiden Linksabbiegespuren. In welche Spur biegst du ein?", optionen: ["Ich biege in die rechte Spur der Zielstraße ein", "Ich biege in die linke Spur ein", "Das ist egal"], richtig: 0, erklaerung: "Links bleibt links, rechts bleibt rechts. So kommt ihr euch nicht in die Quere." } },
        { t: 5, titel: "Im Bogen in der Spur bleiben", text: "So, jetzt biegt ihr gleichmäßig nebeneinander ab. Die gestrichelten Linien in der Kreuzung zeigen dir den Weg. In der Kreuzung wechselst du nie die Spur.", regel: "Zeichen 297" },
        { t: 9, titel: "Nach dem Abbiegen", text: "Und erst hinter der Kreuzung darfst du die Spur wechseln, wenn nötig. Schau in den Spiegel, blinke und mach den Schulterblick.", regel: "§ 7 Abs. 5 StVO" }
      ]
    });
  })();

  // ---- Kreisverkehr: nicht blinken beim Einfahren, blinken beim Ausfahren
  (function () {
    const fl = [], li = [], obj = [], RA = 16, RI = 8.5, L = 80, b = 3.25;
    fl.push({ art: "gehweg", poly: rect(-L, -L, L, L) });
    const kreis = r => bogen(0, 0, r, 0, 2 * PI, 48);
    fl.push({ art: "asphalt", poly: rect(RA - 2, -b, L, b) }, { art: "asphalt", poly: rect(-L, -b, -RA + 2, b) }, { art: "asphalt", poly: rect(-b, RA - 2, b, L) }, { art: "asphalt", poly: rect(-b, -L, b, -RA + 2) });
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => fl.push({ art: "gruen2", zeigen3d: true, poly: [[sx * (b + 2.5), sy * L], [sx * (b + 2.5), sy * (RA + 7)], [sx * (RA + 7), sy * (b + 2.5)], [sx * L, sy * (b + 2.5)], [sx * L, sy * L]] }));
    fl.push({ art: "asphalt", poly: kreis(RA + 0.5) }, { art: "pflaster", poly: kreis(RI + 1.3) }, { art: "insel", poly: kreis(RI), zeigen3d: true });
    // Fahrbahnteiler in den Armen
    const arm = (sx, sy) => (a, q) => sx ? [sx * a, q] : [q, sy * a];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([sx, sy]) => { const t = arm(sx, sy); fl.push({ art: "insel", zeigen3d: true, poly: [t(RA + 1.5, 0), t(RA + 6, -0.6), t(RA + 14, -0.3), t(RA + 14, 0.3), t(RA + 6, 0.6)] }); });
    // Wartelinien (Zeichen 341) auf der Zufahrtseite
    li.push({ art: "warte", b: 0.4, pts: [[0.4, RA + 0.9], [b - 0.1, RA + 0.9]] }, { art: "warte", b: 0.4, pts: [[-0.4, -RA - 0.9], [-b + 0.1, -RA - 0.9]] }, { art: "warte", b: 0.4, pts: [[RA + 0.9, -0.4], [RA + 0.9, -b + 0.1]] }, { art: "warte", b: 0.4, pts: [[-RA - 0.9, 0.4], [-RA - 0.9, b - 0.1]] });
    // Zebrastreifen an der Westausfahrt
    for (let y = -3; y < 3.2; y += 1) fl.push({ art: "weiss", poly: rect(-RA - 12, y, -RA - 8.5, y + 0.5) });
    haeuser(obj, [[32, 30, 12, 10, 9], [-32, 30, 12, 10, 8, "#cdd3d8"], [32, -30, 12, 10, 10, "#e3d7c3"], [-32, -30, 12, 10, 7, "#d9cfbf", "#6d5a4a"]]);
    baeume(obj, [[0, 0, 3], [3.5, -3, 1.8], [-3, 2.8, 1.6]]);
    // An jeder Zufahrt 205 mit 215 darunter (§ 8 Abs. 1a StVO, VwV zu Zeichen 215 Rn. 3), rechts in Fahrtrichtung; 350 am Zebrastreifen der Westausfahrt
    const schilder = [{ typ: "z205_215", x: b + 1, y: RA + 9.5, aussen: [1, 0], blick: [0, 1] }, { typ: "z205_215", x: -b - 1, y: -RA - 9.5, aussen: [-1, 0], blick: [0, -1] }, { typ: "z205_215", x: RA + 9.5, y: -b - 1, aussen: [0, -1], blick: [1, 0] }, { typ: "z205_215", x: -RA - 9.5, y: b + 1, aussen: [0, 1], blick: [-1, 0] }, { typ: "z350", x: -RA - 8.6, y: -b - 1, aussen: [0, -1], blick: [1, 0] }];
    // Kreisfahrbahn gegen den Uhrzeigersinn (von oben gesehen) = im Bild mit abnehmendem Winkel. Armachsen: S +π/2, O 0, N −π/2, W π.
    const rk = (RA + RI + 1.3) / 2 + 0.4, AX = { S: PI / 2, O: 0, N: -PI / 2, W: PI };
    const ringPt = a => [rk * Math.cos(a), rk * Math.sin(a)];
    function kreisWeg(von, nach) {
      const aIn = AX[von] - 0.55; let aOut = AX[nach] + 0.55; while (aOut >= aIn - 0.3) aOut -= 2 * PI;
      const zu = armPunkt(von, RA + 5, 1.6), weg0 = armPunkt(von, L, 1.6), ab = armPunkt(nach, RA + 5, 1.6, true), weg1 = armPunkt(nach, L, 1.6, true);
      const hIn = EIN[von], hOut = EIN[nach] + PI, p0 = ringPt(aIn), p1 = ringPt(aOut);
      const tanIn = [Math.sin(aIn), -Math.cos(aIn)], tanOut = [Math.sin(aOut), -Math.cos(aOut)];
      const ring = []; for (let a = aIn; a >= aOut; a -= 0.06) ring.push(ringPt(a));
      return [weg0].concat(bezier(zu, [zu[0] + Math.cos(hIn) * 3, zu[1] + Math.sin(hIn) * 3], [p0[0] - tanIn[0] * 3, p0[1] - tanIn[1] * 3], p0, 10)).concat(ring.slice(1))
        .concat(bezier(p1, [p1[0] + tanOut[0] * 3, p1[1] + tanOut[1] * 3], [ab[0] - Math.cos(hOut) * 3, ab[1] - Math.sin(hOut) * 3], ab, 10)).concat([weg1]);
    }
    const wegFS = kreisWeg("S", "W"), wegK = kreisWeg("W", "N");
    const sWarte = L - RA - 2.2 - 2.25;                                          // Front an der Wartelinie
    const sZebra = sNahe(wegFS, -RA - 7.9, -1.6) - 2.25;                       // Front vor dem Zebrastreifen (Heck außerhalb der Kreisfahrbahn)
    const plan = (b1, b2) => fahrplan({ vMax: 30, grenzen: [{ von: sWarte - 5, bis: sZebra + 20, v: 22 }], halte: [{ s: sWarte, bis: b1 }, { s: sZebra, bis: b2 }], dauer: 40, s0: 8 });
    let fs = fahrt("fs", "fahrschule", "#f2f2ee", wegFS, plan(99, 99), 8, 0);
    const tA = tBeiS(fs, sWarte - 0.4);                                        // Ankunft an der Wartelinie
    fs = fahrt("fs", "fahrschule", "#f2f2ee", wegFS, plan(tA + 2.4, 99), 8, 0);
    const tZ0 = tBeiS(fs, sZebra - 0.4);                                       // Ankunft vor dem Zebrastreifen
    fs = fahrt("fs", "fahrschule", "#f2f2ee", wegFS, plan(tA + 2.4, tZ0 + 7.2), 8, 0, { fokus: true, bremsStand: true });
    // Blinker rechts ab der Ausfahrt Norden (vorletzte Ausfahrt)
    const tBl = tBeiS(fs, sNahe(wegFS, ringPt(-PI / 2)[0], ringPt(-PI / 2)[1]));
    fs.blinker = [{ von: tBl, bis: tBeiS(fs, sNahe(wegFS, -RA - 3, -1.6)), seite: "rechts" }];
    const sKs = sNahe(wegK, ringPt(PI / 2)[0], ringPt(PI / 2)[1]);           // Kreis-Pkw an der Einfahrt Süd, während die Fahrschule wartet
    const k = fahrt("k", "pkw", "#2c5aa0", wegK, fahrplan({ vMax: 28, grenzen: [{ von: 50, bis: 200, v: 24 }], dauer: 40 }), sKs, tA + 1.1, { blinker: [] });
    k.blinker = [{ von: tBeiS(k, sNahe(wegK, ringPt(0)[0], ringPt(0)[1])), bis: 40, seite: "rechts" }];
    const tZ = tZ0;
    const fg = person("fg", "fussgaenger", "#8e4b8a", [[-RA - 10.25, -6.8], [-RA - 10.25, 8]], [[0, 0], [tZ - 1.7, 0], [tZ - 1.5, 4.5], [60, 4.5]]);
    innerortsSzene({
      id: "kreisel", plan: ["l_kreisel"], titel: "Kreisverkehr", kurz: "Einfahren ohne Blinker. Im Kreis gilt Vorfahrt. Beim Ausfahren blinkst du.",
      dauer: Math.ceil(tBeiS(fs, sZebra + 25)), strasse: { flaechen: fl, linien: li, objekte: obj, schilder, bereich: [-L, L], boden: "#6a9a52", boden3d: "#6f9a55" }, kamera: { fest: [-2, 2], zoom: 6.5 },
      fahrzeuge: [fs, k, fg],
      phasen: [
        { t: 0.2, titel: "Das Schild Kreisverkehr", text: "Vor dem Kreisverkehr siehst du das Schild Vorfahrt gewähren und darunter das Schild Kreisverkehr. Wer schon im Kreis fährt, hat Vorfahrt. Fahr langsam heran und schau nach links.", regel: "Zeichen 215 · Zeichen 205 · § 8 Abs. 1a StVO", frage: { text: "Blinkst du beim Einfahren in den Kreisverkehr?", optionen: ["Ja, ich blinke rechts", "Ja, ich blinke links", "Nein, beim Einfahren darf ich nicht blinken"], richtig: 2, erklaerung: "Beim Einfahren ist Blinken nicht erlaubt." } },
        { t: tA + 0.1, titel: "Vorfahrt gewähren", text: "Siehst du das blaue Auto? Es ist schon im Kreis und hat Vorfahrt. Halte an der Wartelinie und lass es vorbei.", regel: "§ 8 Abs. 1a StVO · Zeichen 341" },
        { t: tA + 2.5, titel: "Einfahren", text: "Wenn dann frei ist, fährst du ohne Blinker ein. Im Kreis fährst du gegen den Uhrzeigersinn. Und dort darfst du nicht halten.", regel: "§ 8 Abs. 1a StVO · Zeichen 215" },
        { t: tBl, titel: "Blinker rechts zum Ausfahren", text: "Jetzt kommt das Ausfahren. Nach der Ausfahrt vor deiner schaust du in den Spiegel und blinkst rechts. Direkt vor dem Ausfahren Schulterblick nach rechts. Achte auf Radfahrer und Fußgänger.", regel: "§ 9 Abs. 1 StVO", frage: { text: "Wann blinkst du zum Ausfahren?", optionen: ["Ich blinke gar nicht", "Ich blinke nach der Ausfahrt vor meiner, rechtzeitig vor dem Ausfahren", "Ich blinke schon beim Einfahren"], richtig: 1, erklaerung: "Du kündigst das Ausfahren an. Blinke rechts, sobald du an der Ausfahrt vor deiner vorbei bist." } },
        { t: tZ + 0.1, titel: "Fußgänger am Zebrastreifen", text: "Pass auf, hinter der Ausfahrt liegt ein Zebrastreifen. Wer ihn benutzen will, hat Vorrang. Fahr nur mäßig schnell heran und warte.", regel: "§ 26 Abs. 1 StVO", frage: { text: "Die Fußgängerin will über den Zebrastreifen. Wer hat Vorrang?", optionen: ["Ich, ich komme aus dem Kreisverkehr", "Die Fußgängerin hat Vorrang", "Wer schneller ist, hat Vorrang"], richtig: 1, erklaerung: "Wer erkennbar über den Zebrastreifen will, muss hinüber können. Du lässt die Fußgängerin gehen." } }
      ]
    });
  })();

  // ---- Zebrastreifen
  (function () {
    const st = wohnstrasse(4.5, -4.5, -80, 80); st.linien.push({ art: "leit_io", b: 0.12, pts: [[-80, 0], [-12, 0]] }, { art: "leit_io", b: 0.12, pts: [[12, 0], [80, 0]] });
    for (let y = -4.2; y < 4.3; y += 1) st.flaechen.push({ art: "weiss", poly: rect(-2, y, 2, y + 0.5) });
    st.schilder = [{ typ: "z350", x: -2.4, y: 5.6, aussen: [0, 1], blick: [-1, 0] }, { typ: "z350", x: 2.4, y: -5.6, aussen: [0, -1], blick: [1, 0] }];
    const vor = fahrt("v", "pkw", "#2c5aa0", [[-150, 2.2], [150, 2.2]], [[0, 40], [3, 30], [5.3, 12], [6.5, 0], [12.3, 0], [14.8, 25], [22, 40]], 150 - 4.8, 6.5, { bremsStand: true });
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", [[-150, 2.2], [150, 2.2]], [[0, 40], [3, 30], [5.8, 12], [7.2, 0], [12.9, 0], [15.5, 25], [22, 40]], 150 - 11.5, 7.2, { fokus: true, bremsStand: true });
    const fg = person("fg", "fussgaenger", "#b3322c", [[0.5, 9], [0.5, -9]], [[0, 4.5], [2.95, 4.5], [3.05, 0], [4.8, 0], [5, 4.5], [40, 4.5]]);
    const kind = person("kd", "kind", "#e0b84a", [[-0.6, 9.5], [-0.6, -9]], [[0, 5], [2.95, 5], [3.05, 0], [5, 0], [5.2, 5], [40, 5]]);
    const gg = fahrt("gg", "pkw", "#7b8a52", [[150, -2.2], [-150, -2.2]], [[0, 40], [3.5, 25], [5.4, 0], [12.4, 0], [14.5, 30], [22, 40]], 150 - 5, 5.4, { bremsStand: true });
    innerortsSzene({
      id: "zebra", plan: ["l_zebra"], titel: "Fußgängerüberweg (Zebrastreifen)", kurz: "Vorausschauen und bremsbereit sein. Wer hinüber will, hat Vorrang.",
      dauer: 20, strasse: Object.assign(st, { bereich: [-80, 80] }), kamera: { fokus: "fs", zoom: 9, vor: 0.16 },
      fahrzeuge: [fs, vor, fg, kind, gg],
      phasen: [
        { t: 0.2, titel: "Zebrastreifen voraus", text: "Da vorne kommt ein Zebrastreifen. Geh früh vom Gas und schau auf die Gehwege. Will jemand hinüber? Kinder sind klein und schwer zu sehen.", regel: "Zeichen 350 · § 26 Abs. 1 StVO", frage: { text: "Wie fährst du an einen Zebrastreifen heran, wenn jemand erkennbar hinüber will?", optionen: ["Ich fahre normal weiter, er muss warten", "Ich fahre nur mäßig schnell heran und warte, wenn nötig", "Ich hupe und fahre durch"], richtig: 1, erklaerung: "Du lässt die Fußgänger hinüber. Fahr nur mäßig schnell heran und warte, wenn nötig." } },
        { t: 6.6, titel: "Anhalten", text: "Siehst du, die Fußgänger gehen los. Halte vor dem Zebrastreifen an, nicht auf ihm. Am wartenden Auto darfst du nicht vorbeifahren und nicht überholen.", regel: "§ 26 Abs. 1 StVO", frage: { text: "Das Auto vor dir hält am Zebrastreifen. Darfst du es links überholen?", optionen: ["Ja, wenn ich schnell bin", "Nein, am Zebrastreifen darf ich nicht überholen", "Ja, wenn ich dabei hupe"], richtig: 1, erklaerung: "Am Zebrastreifen darf niemand überholen." } },
        { t: 12.4, titel: "Erst wenn frei ist", text: "Und fahr erst weiter, wenn alle den Zebrastreifen sicher verlassen haben, auch auf der Gegenseite. Blickkontakt hilft dabei.", regel: "§ 26 Abs. 1 StVO" },
        { t: 16, titel: "Zum Merken", text: "Noch etwas zum Merken. Stockt der Verkehr hinter dem Zebrastreifen, dann fahr nicht drauf, wenn du dort warten müsstest.", regel: "§ 26 Abs. 2 StVO" }
      ]
    });
  })();

  // ---- Engstelle: Hindernis auf der eigenen Seite
  (function () {
    const st = wohnstrasse(3.3, -3.3, -80, 80);
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", [[-150, 1.65], [-13, 1.65], [-7.5, -1.3], [12.5, -1.3], [18, 1.65], [150, 1.65]], [[0, 30], [3, 20], [5.2, 0], [9.3, 0], [11.5, 18], [22, 30]], 150 - 14, 5.2, { fokus: true, bremsStand: true, schulter: [{ von: 8.6, bis: 9.3, seite: "links" }] });
    { const tE = tBeiS(fs, 150 + 12); fs.blinker = [{ von: 9.2, bis: 11.2, seite: "links" }, { von: tE - 0.6, bis: tE + 1.4, seite: "rechts" }]; fs._tE = tE; }
    const lkw = parkt("lkw", "lkw", "#c9ced6", 2.5, 1.9, 0, { warnblink: [{ von: 0, bis: 99 }] });
    const g1 = fahrt("g1", "pkw", "#b3322c", [[150, -1.65], [-150, -1.65]], [[0, 30]], 150 - 30, 3);
    const g2 = fahrt("g2", "pkw", "#2c5aa0", [[150, -1.65], [-150, -1.65]], [[0, 30]], 150 - 5, 6.8);
    innerortsSzene({
      id: "eng", plan: ["l_eng"], titel: "Engstelle: Hindernis auf deiner Seite", kurz: "Wer am Hindernis vorbei muss, lässt zuerst den Gegenverkehr durch.",
      dauer: 17, strasse: Object.assign(st, { bereich: [-80, 80] }), kamera: { fokus: "fs", zoom: 9, vor: 0.12 },
      fahrzeuge: [fs, lkw, g1, g2],
      phasen: [
        { t: 0.2, titel: "Hindernis voraus", text: "Schau mal, ein Lastwagen steht mit Warnblinklicht auf deiner Seite. Die Straße ist zu schmal für zwei Fahrzeuge nebeneinander.", regel: "§ 6 StVO", frage: { text: "Wer darf zuerst durch die Engstelle?", optionen: ["Ich, ich war zuerst da", "Der Gegenverkehr, das Hindernis ist auf meiner Seite", "Wer schneller ist, fährt zuerst"], richtig: 1, erklaerung: "Wer links am Hindernis vorbei will, lässt den Gegenverkehr zuerst durch." } },
        { t: 5.2, titel: "Mit Abstand warten", text: "Halte also rechtzeitig und mit Abstand zum Hindernis. So bleibt Platz zum Vorbeifahren, und du siehst den Gegenverkehr besser.", regel: "§ 6 StVO" },
        { t: 8.6, titel: "Ausscheren ankündigen", text: "Und wenn frei ist, schaust du in den Spiegel und blinkst links. Dann Schulterblick nach links und mit genug Seitenabstand am Lastwagen vorbei. Achte auf Leute, die aussteigen.", regel: "§ 6 StVO" },
        { t: fs._tE - 0.6, titel: "Wieder einordnen", text: "So, jetzt bist du vorbei. Hinter dem Hindernis blinkst du rechts und ordnest dich wieder rechts ein.", regel: "§ 6 · § 2 Abs. 2 StVO" }
      ]
    });
  })();

  // ---- Stoppschild (Zeichen 206)
  (function () {
    const K = stadtKreuzung({ b: 3.25, R: 6, arme: { N: 0, S: 1, O: 1, W: 1 } });
    K.linien.push({ art: "voll", b: 0.5, pts: [[0.1, 9.8], [3.2, 9.8]] }, { art: "leit_io", b: 0.12, pts: [[-90, 0], [-11, 0]] }, { art: "leit_io", b: 0.12, pts: [[11, 0], [90, 0]] }, { art: "leit_io", b: 0.12, pts: [[0, 90], [0, 12]] });
    K.schilder.push({ typ: "z206", x: 4.8, y: 11, aussen: [1, 0], blick: [0, 1] }, { typ: "z306", x: -12, y: 4.8, aussen: [0, 1], blick: [-1, 0] });
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", route("S", "O", { q: 1.625, e: 12.1, e2: 8, k: 0.5 }), [[0, 30], [3, 12], [4.8, 0], [6.5, 0], [7.3, 4], [8.2, 0], [11.6, 0], [13.5, 15], [20, 30]], 70 - 12.1, 4.8, { fokus: true, bremsStand: true, blinker: [{ von: 0.5, bis: 15, seite: "rechts" }] });
    const q1 = fahrt("q1", "pkw", "#2c5aa0", route("W", "O", { q: 1.625, e: 10 }), [[0, 45]], 70, 9.5);
    const q2 = fahrt("q2", "transporter", "#e7e3d6", route("O", "W", { q: 1.625, e: 10 }), [[0, 42]], 70, 10.3);
    innerortsSzene({
      id: "stop", plan: ["l_stop"], titel: "Stoppschild", kurz: "Immer ganz an der Haltlinie anhalten, dann vortasten.",
      dauer: 17, strasse: K, kamera: { fest: [3, 4], zoom: 9 },
      fahrzeuge: [fs, q1, q2],
      phasen: [
        { t: 0.2, titel: "Halt, Vorfahrt gewähren", text: "Hier steht ein Stoppschild. Du hältst an der Haltlinie an, und zwar immer, auch wenn frei ist. Danach gewährst du Vorfahrt.", regel: "Zeichen 206 · Zeichen 294", frage: { text: "Musst du am Stoppschild auch anhalten, wenn du siehst, dass frei ist?", optionen: ["Nein, langsames Rollen genügt", "Ja, ich halte immer ganz an", "Nur nachts muss ich anhalten"], richtig: 1, erklaerung: "Anhalten ist Pflicht. Die Räder müssen stillstehen." } },
        { t: 4.8, titel: "Stillstand an der Haltlinie", text: "So, jetzt steht das Auto an der Haltlinie und die Räder stehen still. Von hier siehst du oft noch nicht genug.", regel: "Zeichen 206 · Zeichen 294" },
        { t: 6.6, titel: "Vortasten", text: "Darum rollst du langsam bis zur Sichtlinie vor und hältst erneut an. Schau links, rechts, links.", regel: "§ 8 Abs. 2 StVO", frage: { text: "Die Sicht ist an der Haltlinie verdeckt. Was nun?", optionen: ["Ich fahre einfach los", "Ich taste mich langsam vor und schaue erneut", "Ich hupe"], richtig: 1, erklaerung: "Nach dem Halt an der Haltlinie darfst du dich vorsichtig bis zur Sichtlinie vortasten." } },
        { t: 9, titel: "Querverkehr durchlassen", text: "Die beiden Fahrzeuge auf der Vorfahrtstraße haben Vorfahrt. Erst wenn frei ist, biegst du rechts ab.", regel: "§ 8 Abs. 2 StVO" }
      ]
    });
  })();

  // ---- Grünpfeil (Zeichen 720): bei Rot nach dem Anhalten rechts abbiegen
  (function () {
    const K = stadtKreuzung({ b: 3.25, R: 6 });
    const HL = 16;                                                              // Haltlinie der Zufahrt Süd
    K.linien.push({ art: "voll", b: 0.5, pts: [[0.1, HL], [3.2, HL]] }, { art: "leit_io", b: 0.12, pts: [[0, 90], [0, HL + 1]] }, { art: "leit_io", b: 0.12, pts: [[0, -14], [0, -90]] }, { art: "leit_io", b: 0.12, pts: [[-90, 0], [-14, 0]] }, { art: "leit_io", b: 0.12, pts: [[14, 0], [90, 0]] });
    // Fußgängerfurt über die Zufahrt Süd (zwischen Haltlinie und Kreuzung)
    for (let x = -3.2; x < 3.2; x += 1) K.flaechen.push({ art: "weiss", poly: rect(x, 11.3, x + 0.5, 11.6) }, { art: "weiss", poly: rect(x, 14.6, x + 0.5, 14.9) });
    const rot = [[99, "rot"]], gruen = [[99, "gruen"]];
    // h = Richtung, in die die Lampen leuchten (zum ankommenden Verkehr hin)
    K.objekte.push({ art: "ampel", x: 4.2, y: HL + 0.3, h: PI / 2, phasen: rot, gruenpfeil: true }, { art: "ampel", x: -4.2, y: -HL, h: -PI / 2, phasen: rot },
      { art: "ampel", x: -12.8, y: 4.2, h: PI, phasen: gruen }, { art: "ampel", x: 12.8, y: -4.2, h: 0, phasen: gruen },
      { art: "ampel", fuss: true, x: -4.5, y: 13.9, h: 0, phasen: gruen }, { art: "ampel", fuss: true, x: 4.5, y: 12.1, h: PI, phasen: gruen });
    const weg = route("S", "O", { q: 1.625, e: 10.2, e2: 9, k: 0.45 });
    const sHalt = 70 - HL - 2.4, sSicht = 70 - 10.4;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", weg, fahrplan({ vMax: 30, grenzen: [{ von: sHalt - 1, bis: sSicht + 1, v: 10 }], halte: [{ s: sHalt, bis: 12.9 }, { s: sSicht, bis: 18.8 }], dauer: 40 }), 0, 0, { fokus: true, bremsStand: true, blinker: [{ von: 0.5, bis: 24, seite: "rechts" }], schulter: [{ von: 17.9, bis: 18.8, seite: "rechts" }] });
    const q1 = fahrt("q1", "pkw", "#2c5aa0", route("W", "O", { q: 1.625, e: 10 }), [[0, 40]], 70, 17.6);
    const fg = person("fg", "fussgaenger", "#8e4b8a", [[-7, 13], [9, 13]], [[0, 0], [3.2, 0], [3.4, 4.5], [40, 4.5]]);
    innerortsSzene({
      id: "gruenpfeil", plan: ["a_pfeil"], titel: "Grünpfeil bei Rot", kurz: "Erst anhalten, dann vorsichtig rechts. Wer Grün hat, geht vor.",
      dauer: 26, strasse: K, kamera: { fest: [4, 8], zoom: 9 },
      fahrzeuge: [fs, q1, fg],
      phasen: [
        { t: 0.2, titel: "Rot und ein Schild mit grünem Pfeil", text: "Schau mal, die Ampel zeigt Rot. Rechts daneben hängt ein Schild mit grünem Pfeil auf schwarzem Blech. Das ist kein leuchtender Pfeil in der Ampel.", regel: "§ 37 Abs. 2 Nr. 1 StVO · Zeichen 720", frage: { text: "Was verlangt der Grünpfeil zuerst?", optionen: ["Ich rolle langsam durch", "Ich halte an der Haltlinie ganz an", "Nichts, er zeigt ja Grün"], richtig: 1, erklaerung: "Nach dem Anhalten darfst du bei Rot rechts abbiegen. Anhalten ist Pflicht." } },
        { t: 5.5, titel: "Anhalten an der Haltlinie", text: "Also hältst du ganz an. Vor dir überquert eine Fußgängerin bei Grün die Straße.", regel: "§ 37 Abs. 2 Nr. 1 StVO", frage: { text: "Wer darf zuerst?", optionen: ["Ich, ich habe den Pfeil", "Die Fußgänger und der Querverkehr mit Grün", "Wer zuerst da war"], richtig: 1, erklaerung: "Du darfst niemanden behindern oder gefährden. Das gilt vor allem für Fußgänger und für den Verkehr, der Grün hat." } },
        { t: 13, titel: "Vortasten bis zur Sichtlinie", text: "Jetzt ist der Fußgängerübergang frei. Roll langsam bis zur Sichtlinie vor und halte erneut an.", regel: "§ 37 Abs. 2 Nr. 1 StVO" },
        { t: 16.8, titel: "Querverkehr hat Grün", text: "Aber Vorsicht, von links kommt ein Auto mit Grün. Du darfst es nicht behindern oder gefährden. Also wartest du.", regel: "§ 37 Abs. 2 Nr. 1 StVO" },
        { t: 18.8, titel: "Abbiegen", text: "So, das blaue Auto ist vorbei. Mach den Schulterblick nach rechts und biege langsam ab. Das geht nur aus der rechten Spur.", regel: "§ 37 Abs. 2 Nr. 1 StVO" },
        { t: 23, titel: "Zum Merken", text: "Noch zum Merken. Ein leuchtender grüner Pfeil in der Ampel ist eine eigene Grünphase. Beim Schild mit grünem Pfeil hältst du erst an. Dann biegst du mit größter Vorsicht ab.", regel: "§ 37 Abs. 2 StVO" }
      ]
    });
  })();
})();
