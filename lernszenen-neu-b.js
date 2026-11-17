/* ============================================================================
   Fahrlehrer-Kompass · Lernszenen Block 6 (b): Bahnübergang, Straßenbahn, Sicherheitsabstand,
   Halten und Parken, Einsatzfahrzeug. Baut auf lernszenen.js und lernszenen-stadt.js auf.
   Welt in Metern: x nach Osten, y nach Süden. Rechtsverkehr. Fahrtrichtung Osten = Winkel 0.
   Neu: Fahrzeugtypen "strassenbahn" und "zug", Objekt "bue" (Blinklicht + Halbschranke),
   Zeichen 201 / 283 / 286. Alles auf dem Canvas gezeichnet, keine Bilder, keine Bibliotheken.
   ============================================================================ */
(function () {
  "use strict";
  const LZ = window.Lernszenen; if (!LZ || !LZ.bau || !LZ.stadt || !LZ.bau.EXT) return;
  const { KMH, lerp, pfad, tempoProfil, rohPos, TYPEN, EXT, H } = LZ.bau, { fahrplan, tBeiS, kreuzung } = LZ.stadt;
  const PI = Math.PI;
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const aktiv = (a, t) => (a || []).some(([v, b]) => t >= v && t < b);
  const dprVon = c => c.canvas.width / (c.canvas.getBoundingClientRect().width || c.canvas.width);
  // Beschriftung als Pille (Schrift in Bildschirmpixeln, bleibt im Bild); liefert [links, rechts, Höhe]
  function pille(c, text, cx, cy, bg, fg, gr) {
    const d = dprVon(c), f = Math.round((gr || 12) * d); c.save(); c.font = "bold " + f + "px sans-serif";
    const w = c.measureText(text).width + 14 * d, h = f + 8 * d; cx = Math.max(w / 2 + 4 * d, Math.min(c.canvas.width - w / 2 - 4 * d, cx));
    c.fillStyle = bg; c.beginPath(); if (c.roundRect) c.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); else c.rect(cx - w / 2, cy - h / 2, w, h); c.fill();
    c.fillStyle = fg || "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, cx, cy + 0.5 * d); c.restore(); return [cx - w / 2, cx + w / 2, h];
  }
  const SCHIENE = "#eef1f4";

  // ------------------------------------------------------------ Fahrzeug- und Personen-Helfer
  function fahrt(id, typ, farbe, punkte, keys, sBei, tBei, extra) {
    const tempo = tempoProfil(keys); let p = pfad(punkte), start = (sBei || 0) - tempo.s(tBei || 0);
    if (start < 0) { const a = p.pts[0], b = p.pts[1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, d = -start + 5; p = pfad([[a.x - (b.x - a.x) / L * d, a.y - (b.y - a.y) / L * d]].concat(punkte)); start += d; }
    return Object.assign({ id, typ, farbe, pfad: p, tempo, start }, extra || {});
  }
  const person = (id, typ, farbe, punkte, keys, extra) => fahrt(id, typ, farbe, punkte, keys, 0, 0, extra);
  const parkt = (id, typ, farbe, x, y, h) => ({ id, typ, farbe, parkt: true, pfad: pfad([[x - Math.cos(h), y - Math.sin(h)], [x + Math.cos(h), y + Math.sin(h)]]), tempo: tempoProfil([[0, 0]]), start: 1 });
  const haeuser = (obj, liste) => liste.forEach(([x, y, l, b, hoehe, farbe, dach]) => obj.push({ art: "haus", x, y, l, b, hoehe: hoehe || 7, farbe: farbe || "#d9cfbf", dach: dach || "#a7553f" }));
  const baeume = (obj, liste) => liste.forEach(([x, y, r]) => obj.push({ art: "baum", x, y, r: r || 2.2 }));
  const szene = (sz) => { sz.kategorie = "innerorts"; LZ.registriere(sz); };
  const wiese = (x0, x1) => [{ art: "gruen2", poly: rect(x0, -45, x1, -9), zeigen3d: true }, { art: "gruen2", poly: rect(x0, 9, x1, 45), zeigen3d: true }];

  // ------------------------------------------------------------ neue Schilder (128 x 128)
  function schild(typ, name, zeichne) {
    if (H.SCHILD_BILD[typ]) return; const c = document.createElement("canvas"); c.width = c.height = 128; zeichne(c.getContext("2d")); H.SCHILD_BILD[typ] = c; H.SCHILD_NAME[typ] = name;
  }
  schild("z201", "Zeichen 201 · Andreaskreuz", g => {
    g.translate(64, 64); g.rotate(PI / 4);
    [[150, 28, "#d02a28"], [138, 17, "#fff"]].forEach(([l, b, f]) => { g.fillStyle = f; g.fillRect(-l / 2, -b / 2, l, b); g.fillRect(-b / 2, -l / 2, b, l); });
  });
  schild("z224g", "Zeichen 224 · Haltestelle", g => { g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fillStyle = "#f4c800"; g.fill(); g.lineWidth = 5; g.strokeStyle = "#333"; g.stroke(); g.fillStyle = "#1e8a3c"; g.font = "bold 104px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", 64, 70); });
  const haltverbot = (g, kreuz) => {
    g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fillStyle = "#d02a28"; g.fill(); g.beginPath(); g.arc(64, 64, 46, 0, 7); g.fillStyle = "#1f5fa8"; g.fill();
    g.strokeStyle = "#d02a28"; g.lineWidth = 11; g.lineCap = "butt"; g.beginPath(); g.moveTo(34, 34); g.lineTo(94, 94); if (kreuz) { g.moveTo(94, 34); g.lineTo(34, 94); } g.stroke();
  };
  schild("z283", "Zeichen 283 · Absolutes Haltverbot", g => haltverbot(g, true));
  schild("z286", "Zeichen 286 · Eingeschränktes Haltverbot", g => haltverbot(g, false));

  // ------------------------------------------------------------ Schienenfahrzeuge: Typen, Bild (oben), Körper (3D)
  TYPEN.strassenbahn = { l: 27, b: 2.4, h: 3.4 }; TYPEN.zug = { l: 26, b: 2.95, h: 4.1 };
  EXT.bild.strassenbahn = EXT.bild.zug = function (g, f, T) {
    const l = T.l, b = T.b, hw = b / 2, zug = f.typ === "zug", n = zug ? 2 : 3, sl = l / n, col = f.farbe, rot = zug ? "#c4151c" : "#e0b020";
    for (let i = 0; i < n; i++) {
      const x0 = -l / 2 + i * sl + (i ? 0.14 : 0), w = sl - (i ? 0.14 : 0) - (i < n - 1 ? 0.14 : 0);
      H.rrg(g, x0, -hw, w, b, 0.4); g.fillStyle = H.quer(g, col, hw, 0.05); g.fill(); g.lineWidth = 0.05; g.strokeStyle = "rgba(0,0,0,.45)"; g.stroke();
      g.save(); H.rrg(g, x0, -hw, w, b, 0.4); g.clip();
      g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(x0 + 0.7, -hw * 0.42, w - 1.4, hw * 0.84);
      g.fillStyle = rot; g.fillRect(x0, -hw, w, 0.2); g.fillRect(x0, hw - 0.2, w, 0.2);
      g.fillStyle = "rgba(24,34,48,.82)"; for (let x = x0 + 0.6; x < x0 + w - 1.4; x += 1.9) { g.fillRect(x, -hw + 0.28, 1.3, 0.2); g.fillRect(x, hw - 0.48, 1.3, 0.2); }
      g.restore();
    }
    g.fillStyle = "#26292d"; for (let i = 1; i < n; i++) g.fillRect(-l / 2 + i * sl - 0.2, -hw * 0.78, 0.4, b * 0.78);
    for (const sd of [-1, 1]) { g.fillStyle = "rgba(24,34,48,.92)"; H.rrg(g, sd > 0 ? l / 2 - 1.0 : -l / 2 + 0.25, -hw * 0.78, 0.75, b * 0.78, 0.2); g.fill();
      for (const q of [-1, 1]) { const gx = sd * (l / 2 - 0.05), gy = q * hw * 0.55, gl = g.createRadialGradient(gx, gy, 0.05, gx, gy, 1.5); gl.addColorStop(0, "rgba(255,248,200,.85)"); gl.addColorStop(1, "rgba(255,248,200,0)"); g.fillStyle = gl; g.beginPath(); g.arc(gx, gy, 1.5, 0, 7); g.fill(); g.fillStyle = "#fffbe6"; g.beginPath(); g.ellipse(sd * (l / 2 - 0.12), gy, 0.16, 0.26, 0, 0, 7); g.fill(); } }
    g.strokeStyle = "#555a60"; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-l / 2 + sl * 0.55, -0.55); g.lineTo(-l / 2 + sl * 0.55 + 0.9, 0); g.lineTo(-l / 2 + sl * 0.55, 0.55); g.stroke();   // Stromabnehmer
  };
  EXT.k3d.strassenbahn = EXT.k3d.zug = function (c, p, f, T) {
    const n = f.typ === "zug" ? 2 : 3, sl = T.l / n, ch = Math.cos(p.h), sh = Math.sin(p.h), rot = f.typ === "zug" ? "#c4151c" : "#e0b020";
    for (let i = 0; i < n; i++) {
      const d = (i - (n - 1) / 2) * sl;
      H.quader(c, p.x + ch * d, p.y + sh * d, p.h, sl - 0.3, T.b, 0.5, T.h, f.farbe, 1, (fl, v) => {
        if (!fl.name || fl.name === "links" && false) return;
        const a = fl.i.map(j => v[j]), z0 = a[0][2], dz = a[3][2] - z0, P = (t, zt) => [lerp(a[0][0], a[1][0], t), lerp(a[0][1], a[1][1], t), z0 + dz * zt];
        const seite = fl.name === "links" || fl.name === "rechts";
        H.poly3d(c, [P(0, 0.08), P(1, 0.08), P(1, 0.2), P(0, 0.2)], rot);
        if (seite || (fl.name === "vorn" && i === n - 1) || (fl.name === "hinten" && i === 0)) H.poly3d(c, [P(0.04, 0.45), P(0.96, 0.45), P(0.96, 0.82), P(0.04, 0.82)], "#2b3945");
      });
    }
  };

  // ------------------------------------------------------------ Objekt "bue": Blinklicht + Halbschranke
  // Felder: x, y (Mast), h (Richtung, in die die Lichter zeigen), arm (Richtung der Schranke zur Fahrbahnmitte), L (Länge),
  //         an: [[von,bis]] Blinklicht, schr: [zu0, zu1, auf0, auf1] (Senken und Heben der Schranke)
  function schrWinkel(o, t) {
    const k = o.schr; let a = 90;
    if (k) a = t < k[0] ? 90 : t < k[1] ? 90 * (1 - (t - k[0]) / (k[1] - k[0])) : t < k[2] ? 0 : t < k[3] ? 90 * (t - k[2]) / (k[3] - k[2]) : 90;
    return a * PI / 180;
  }
  EXT.objekt.bue = {
    oben(ctx, o, X, Y, s, t) {
      const al = schrWinkel(o, t), L = Math.max(0.5, o.L * Math.cos(al)), dx = Math.cos(o.arm), dy = Math.sin(o.arm), x0 = X(o.x), y0 = Y(o.y), on = aktiv(o.an, t), alt = H.blinkAn();
      ctx.save(); ctx.lineCap = "butt";
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 0.34 * s; ctx.beginPath(); ctx.moveTo(x0 + 0.2 * s, y0 + 0.25 * s); ctx.lineTo(x0 + 0.2 * s + dx * L * s, y0 + 0.25 * s + dy * L * s); ctx.stroke();
      const st = Math.max(2, Math.round(L / 0.9));
      for (let i = 0; i < st; i++) { ctx.strokeStyle = i % 2 ? "#f4f4f0" : "#d02a28"; ctx.lineWidth = 0.3 * s; ctx.beginPath(); ctx.moveTo(x0 + dx * L * s * i / st, y0 + dy * L * s * i / st); ctx.lineTo(x0 + dx * L * s * (i + 1) / st, y0 + dy * L * s * (i + 1) / st); ctx.stroke(); }
      ctx.fillStyle = "#3a3e43"; ctx.beginPath(); ctx.arc(x0, y0, 0.32 * s, 0, 7); ctx.fill();
      const hx = Math.cos(o.h), hy = Math.sin(o.h), px = -hy, py = hx;
      [-1, 1].forEach((sd, i) => { const lx = x0 + hx * 0.6 * s + px * sd * 0.6 * s, ly = y0 + hy * 0.6 * s + py * sd * 0.6 * s, an = on && (i === 0) === alt;
        ctx.fillStyle = an ? "#ff3b2f" : "#4a1512"; ctx.beginPath(); ctx.arc(lx, ly, 0.42 * s, 0, 7); ctx.fill(); ctx.strokeStyle = "#1c1e21"; ctx.lineWidth = Math.max(1, 0.08 * s); ctx.stroke(); if (an) H.leuchte(lx, ly, 3 * s, "#ff3b2f", 0.9); });
      ctx.restore();
    },
    d3(c, o, t) {
      const al = schrWinkel(o, t), dx = Math.cos(o.arm), dy = Math.sin(o.arm), on = aktiv(o.an, t), alt = H.blinkAn(), hx = Math.cos(o.h), hy = Math.sin(o.h), px = -hy, py = hx;
      H.quader(c, o.x, o.y, 0, 0.18, 0.18, 0, 3.4, "#8a8f94"); H.quader(c, o.x, o.y, o.h, 0.3, 1.5, 2.4, 3.4, "#1c1e21");
      [-1, 1].forEach((sd, i) => { const cx = o.x + hx * 0.17 + px * sd * 0.4, cy = o.y + hy * 0.17 + py * sd * 0.4, an = on && (i === 0) === alt;
        H.poly3d(c, [[cx - px * 0.15, cy - py * 0.15, 3.05], [cx + px * 0.15, cy + py * 0.15, 3.05], [cx + px * 0.15, cy + py * 0.15, 3.3], [cx - px * 0.15, cy - py * 0.15, 3.3]], an ? "#ff3b2f" : "#4a1512"); });
      const N = 6, ex = (k) => [o.x + dx * o.L * Math.cos(al) * k, o.y + dy * o.L * Math.cos(al) * k, 1.0 + o.L * Math.sin(al) * k];
      for (let i = 0; i < N; i++) { const a = ex(i / N), b = ex((i + 1) / N); H.poly3d(c, [[a[0], a[1], a[2] - 0.12], [b[0], b[1], b[2] - 0.12], [b[0], b[1], b[2] + 0.12], [a[0], a[1], a[2] + 0.12]], i % 2 ? "#f4f4f0" : "#d02a28"); }
    }
  };

  // ============================================================ 1. BAHNÜBERGANG
  (function () {
    const fl = [{ art: "gehweg", poly: rect(-90, -7, 90, 7) }, { art: "asphalt", poly: rect(-90, -3.3, 90, 3.3) }].concat(wiese(-90, 90)), li = [], obj = [], sch = [];
    fl.push({ art: "beton", poly: rect(-1.9, -45, 1.9, 45) }, { art: "asphalt2", poly: rect(-1.9, -3.3, 1.9, 3.3) });
    li.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-90, -3.3], [90, -3.3]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-90, 3.3], [90, 3.3]] },
      { art: "leit_io", b: 0.12, pts: [[-90, 0], [-10, 0]] }, { art: "leit_io", b: 0.12, pts: [[10, 0], [90, 0]] },
      { art: "warte", b: 2.6, farbe: "#6d5a48", pts: [[0, -45], [0, -7]] }, { art: "warte", b: 2.6, farbe: "#6d5a48", pts: [[0, 7], [0, 45]] },
      { art: "voll", b: 0.2, farbe: SCHIENE, pts: [[-0.72, -45], [-0.72, 45]] }, { art: "voll", b: 0.2, farbe: SCHIENE, pts: [[0.72, -45], [0.72, 45]] });
    sch.push({ typ: "z201", x: -5.6, y: 9.6, seite: 1 }, { typ: "z201", x: 5.6, y: -5.2, seite: 1 });
    const T_AN = 3.0, T_AUS = 22.0, SCHR = [5.0, 7.5, 19.0, 21.5], TZ = 13.5;
    obj.push({ art: "bue", x: -5.0, y: 5.0, h: PI, arm: -PI / 2, L: 4.7, an: [[T_AN, T_AUS]], schr: SCHR }, { art: "bue", x: 5.0, y: -5.0, h: 0, arm: PI / 2, L: 4.7, an: [[T_AN, T_AUS]], schr: SCHR });
    haeuser(obj, [[-30, 14, 11, 9, 7], [-14, 15, 9, 9, 6, "#e3d7c3"], [24, 15, 10, 9, 8, "#cdd3d8"], [-28, -14, 10, 9, 7, "#e3d7c3"], [20, -14, 11, 9, 6]]); baeume(obj, [[-8, 10, 1.8], [10, -10, 1.8], [30, 9, 1.8]]);
    const WEG = [[-120, 1.65], [120, 1.65]], sHalt = -9.75 + 120;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", WEG, fahrplan({ vMax: 25, v0: 15, grenzen: [{ von: 0, bis: sHalt + 1, v: 15 }], halte: [{ s: sHalt, bis: 22.6 }], dauer: 30, s0: 90 }), 90, 0, { fokus: true, bremsStand: true, blinker: [] });
    const g = fahrt("g", "pkw", "#b3322c", [[120, -1.65], [-120, -1.65]], fahrplan({ vMax: 25, v0: 15, grenzen: [{ von: 0, bis: 111, v: 15 }], halte: [{ s: 120 - 9.9, bis: 22.8 }], dauer: 30, s0: 94 }), 94, 0, { bremsStand: true });
    const zug = fahrt("zug", "zug", "#e4e4e6", [[0, 300], [0, -300]], [[0, 50]], 300, TZ);
    szene({
      id: "bahnuebergang", plan: ["l_bahn"], titel: "Bahnübergang (Andreaskreuz)", kurz: "Rotes Blinklicht und Schranke bedeuten warten, auch nach dem Zug nicht um die Schranke herum",
      dauer: 29, strasse: { flaechen: fl, linien: li, objekte: obj, schilder: sch, bordsteine: [], bereich: [-90, 90], boden: "#6a9a52", boden3d: "#6f9a55" }, kamera: { fest: [-2, -4], zoom: 11, quer: { immer: true, zeige: ["g", "zug"], radius: 70 } },
      fahrzeuge: [fs, g, zug],
      phasen: [
        { t: 0.2, titel: "Andreaskreuz, Schienenfahrzeuge haben Vorrang", text: "Vor dem Bahnübergang steht ein Andreaskreuz. Fahr langsamer, bleib bremsbereit und schau nach beiden Seiten auf das Gleis.", regel: "Zeichen 201 · § 19 Abs. 1 StVO", frage: { text: "Was bedeutet das Andreaskreuz?", optionen: ["Schienenfahrzeuge haben Vorrang", "Ich habe Vorfahrt, der Zug muss bremsen", "Hier gilt rechts vor links"], richtig: 0, erklaerung: "Das Andreaskreuz zeigt, dass Schienenfahrzeuge Vorrang haben. Ein Zug kann nicht ausweichen und bremst nur sehr langsam." } },
        { t: 3.2, titel: "Rotes Blinklicht, anhalten", text: "Das rote Licht blinkt. Das heißt Halt. Halte rechtzeitig vor dem Andreaskreuz an. Fahr nicht noch schnell drüber.", regel: "§ 19 Abs. 2 StVO", frage: { text: "Das rote Licht beginnt zu blinken. Was tust du?", optionen: ["Schnell noch drüberfahren", "Vor dem Andreaskreuz anhalten", "Hupen und durchrollen"], richtig: 1, erklaerung: "Rotes Blinklicht heißt warten. Wer noch schnell hinüberfährt, riskiert sein Leben und das der Mitfahrer." } },
        { t: 5.6, titel: "Die Schranke senkt sich", text: "Die Halbschranke geht herunter. Du hältst mit Abstand davor an. Nicht auf den Gleisen, nicht unter der Schranke, nicht daneben.", regel: "§ 19 Abs. 2 StVO" },
        { t: 10.6, titel: "Der Zug kommt", text: "Von Süden kommt ein Zug. Er ist schnell und kann nicht anhalten. Du bleibst ruhig stehen und wartest.", regel: "§ 19 Abs. 2 StVO" },
        { t: 15.4, titel: "Zug vorbei, trotzdem warten", text: "Die Schranke ist noch unten und das Licht blinkt noch. Auf einem zweiten Gleis kann ein weiterer Zug kommen. Fahr erst, wenn die Schranke offen ist.", regel: "§ 19 Abs. 2 StVO", frage: { text: "Der Zug ist vorbei, die Schranke ist noch unten. Darfst du um die Schranke herumfahren?", optionen: ["Ja, der Zug ist ja weg", "Nein, warten, bis die Schranke offen ist", "Ja, aber nur langsam"], richtig: 1, erklaerung: "Fahr nie um Schranken herum oder unter ihnen hindurch. Erst wenn die Schranke offen ist und das Licht ausgeht, ist der Weg frei." } },
        { t: 19.4, titel: "Die Schranke geht auf", text: "Die Schranke hebt sich, das Blinklicht ist noch an. Warte noch einen Moment, bis es aus ist.", regel: "§ 19 Abs. 2 StVO" },
        { t: 22.3, titel: "Frei, Platz dahinter prüfen", text: "Licht aus, Schranke offen. Bevor du fährst, schau, ob hinter dem Gleis Platz ist. Du fährst nur los, wenn du den Bahnübergang ganz verlassen kannst.", regel: "§ 19 Abs. 3 StVO · § 12 Abs. 1 StVO", frage: { text: "Hinter dem Übergang staut sich der Verkehr. Fährst du auf den Übergang?", optionen: ["Ja, es geht gleich weiter", "Nein, nur fahren, wenn ich den Übergang ganz verlassen kann", "Ja, die Schranke ist ja offen"], richtig: 1, erklaerung: "Auf dem Bahnübergang darfst du nicht halten. Wer im Stau auf dem Gleis stehen bleibt, ist in Lebensgefahr." } },
        { t: 25.6, titel: "Wenn das Auto liegen bleibt", text: "Bleibt das Auto auf dem Gleis stehen, lass sofort alle aussteigen. Geht alle vom Gleis weg. Ruf den Notruf 112 an oder die Nummer auf dem Schild am Bahnübergang. Das Auto räumst du zuletzt vom Gleis, wenn es geht.", regel: "Zum Merken" }
      ]
    });
  })();

  // ============================================================ 2. STRASSENBAHN UND HALTESTELLE
  (function () {
    const fl = [{ art: "gehweg", poly: rect(-80, -8.5, 80, 8.5) }, { art: "asphalt", poly: rect(-80, -4.85, 80, 4.85) }, { art: "pflaster", poly: rect(-80, -1.55, 80, 1.55) }].concat([{ art: "gruen2", zeigen3d: true, poly: rect(-80, -45, 80, -8.5) }, { art: "gruen2", zeigen3d: true, poly: rect(-80, 8.5, 80, 45) }]), obj = [], li = [];
    li.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-80, -4.85], [80, -4.85]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-80, 4.85], [80, 4.85]] },
      { art: "voll", b: 0.2, farbe: SCHIENE, pts: [[-80, -0.72], [80, -0.72]] }, { art: "voll", b: 0.2, farbe: SCHIENE, pts: [[-80, 0.72], [80, 0.72]] });
    haeuser(obj, [[-20, 14, 11, 9, 8], [-4, 14, 10, 9, 7, "#e3d7c3"], [16, 14, 11, 9, 9, "#cdd3d8"], [34, 14, 10, 9, 7], [-10, -14, 11, 9, 7, "#e3d7c3"], [14, -14, 10, 9, 8]]); baeume(obj, [[-12, 6.6, 1.5], [26, 6.6, 1.5]]);
    // Bahn: hält mit der Mitte bei x = 8 (Weg ab x = -150)
    const WT = [[-150, 0], [150, 0]];
    const planT = bis => fahrplan({ vMax: 30, v0: 24, b: 1.7, halte: [{ s: 158, bis }], dauer: 26, s0: 118 });
    let tram = fahrt("tram", "strassenbahn", "#e9e6dc", WT, planT(99), 118, 0, { bremsStand: true });
    const tAnk = tBeiS(tram, 157.6), tAb = tAnk + 11.5;
    tram = fahrt("tram", "strassenbahn", "#e9e6dc", WT, planT(tAb), 118, 0, { bremsStand: true, warnblink: [{ von: tAnk - 0.6, bis: tAb }] });
    // Fahrschule: hält vor der Fahrgast-Furt (Mitte x = -3), fährt erst frei, dann Schritttempo
    const WF = [[-100, 3.2], [100, 3.2]], tFrei = tAnk + 8.6;
    const planF = bis => fahrplan({ vMax: 24, v0: 18, grenzen: [{ von: 0, bis: 97, v: 18 }, { von: 98, bis: 125, v: 6 }], halte: [{ s: 97, bis }], dauer: 28, s0: 84 });
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", WF, planF(tFrei), 84, 0, { fokus: true, bremsStand: true });
    // Fahrgäste: zwei steigen ein, zwei steigen aus – alle laufen über die Fahrspur der Fahrschule
    const ein = (id, typ, farbe, x, t0) => person(id, typ, farbe, [[x, 7.4], [x, 1.9]], [[0, 0], [t0, 0], [t0 + 0.2, 4.5], [t0 + 4.6, 4.5], [t0 + 4.7, 0], [99, 0]], { unsichtbar: t => t > t0 + 5.2 });
    const aus = (id, typ, farbe, x, t0) => person(id, typ, farbe, [[x, 1.9], [x, 7.4], [x + 9, 7.4]], [[0, 0], [t0, 0], [t0 + 0.2, 4.5], [99, 4.5]], { unsichtbar: t => t < t0 });
    const p1 = ein("fa", "fussgaenger", "#b3322c", 3, tAnk + 1.6), p2 = ein("fb", "kind", "#e0b84a", 4.6, tAnk + 2.4), p3 = aus("fc", "fussgaenger", "#3a6ea5", 12.5, tAnk + 1.8), p4 = aus("fd", "fussgaenger", "#8e4b8a", 10.2, tAnk + 2.6);
    const gg = fahrt("gg", "pkw", "#2c5aa0", [[150, -3.2], [-150, -3.2]], [[0, 35]], 150 - 40, 0);
    szene({
      id: "strassenbahn", plan: ["a_stadt"], titel: "Straßenbahn an der Haltestelle", kurz: "Wenn die Bahn hält, laufen Fahrgäste über die Fahrbahn. Du hältst an und fährst dann nur im Schritttempo",
      dauer: Math.ceil(tAb + 3.5), strasse: { flaechen: fl, linien: li, objekte: obj, schilder: [{ typ: "z224g", x: -7, y: 9.6, seite: 1 }], bordsteine: [{ pts: [[-80, 4.85], [80, 4.85]], seite: 1 }, { pts: [[-80, -4.85], [80, -4.85]], seite: -1 }], bereich: [-80, 80], boden: "#6a9a52", boden3d: "#6f9a55" },
      kamera: { fest: [6, -6], zoom: 13, quer: { immer: true, zeige: ["tram", "gg", "fa", "fb", "fc", "fd"], radius: 30 }, }, fahrzeuge: [fs, tram, gg, p1, p2, p3, p4], overlay: (c, X, Y, s, t) => { const d = dprVon(c); [p1, p2, p3, p4].forEach(f => { if (f.unsichtbar && f.unsichtbar(t)) return; const p = rohPos(f, t), r = Math.max(0.8 * s, 9 * d); c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.arc(X(p.x), Y(p.y), r, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = Math.max(2, 2 * d); c.stroke(); c.fillStyle = f.farbe; c.beginPath(); c.arc(X(p.x), Y(p.y), r * 0.42, 0, 7); c.fill(); }); },
      phasen: [
        { t: 0.2, titel: "Haltestelle mit Straßenbahn", text: "Die Straßenbahn fährt auf ihren Gleisen in der Mitte der Fahrbahn. Du lässt sie auf ihren Gleisen durchfahren. An der Haltestelle fährst du nur vorsichtig vorbei. Rechne mit Fahrgästen auf der Fahrbahn.", regel: "Zeichen 224 · § 20 Abs. 1 StVO", frage: { text: "Die Bahn bremst vor der Haltestelle. Was erwartest du?", optionen: ["Fahrgäste, die zur Bahn und von ihr weg über die Fahrbahn laufen", "Nichts, die Bahn fährt ja auf Schienen", "Freie Fahrt für mich"], richtig: 0, erklaerung: "An Haltestellen steigen Fahrgäste ein und aus und laufen oft über die Fahrspur. Darauf stellst du dich schon beim Heranfahren ein." } },
        { t: tAnk - 0.2, titel: "Bahn hält mit Warnblinklicht", text: "Die Bahn steht und hat Warnblinklicht an. Fahrgäste steigen ein und aus und kommen über deine Fahrspur. Du hältst an und lässt sie durch.", regel: "§ 20 Abs. 2 StVO", frage: { text: "Fahrgäste laufen über deine Fahrspur. Was tust du?", optionen: ["Hupen und durchfahren", "Anhalten und warten, bis die Fahrgäste auf dem Gehweg oder in der Bahn sind", "Langsam an ihnen vorbeidrängeln"], richtig: 1, erklaerung: "Wenn nötig, wartest du. Du darfst Fahrgäste nicht gefährden, auch wenn sie es eilig haben." } },
        { t: tAnk + 3.8, titel: "Kinder besonders beachten", text: "Ein Kind rennt noch zur Bahn. Kinder laufen oft plötzlich los. Du bleibst stehen, bis alle sicher sind. Fahr nicht zu früh an.", regel: "§ 20 Abs. 2 StVO · § 3 Abs. 2a StVO" },
        { t: tFrei - 0.4, titel: "Schritttempo vorbei", text: "Die Fahrgäste sind weg. An der haltenden Bahn fährst du vorsichtig vorbei. Solange Fahrgäste ein- oder aussteigen, rechts nur im Schritttempo und mit Abstand. Wenn nötig, hältst du wieder an.", regel: "§ 20 Abs. 2 StVO", frage: { text: "Wie schnell darfst du rechts an der haltenden Bahn vorbeifahren, wenn Fahrgäste ein- oder aussteigen?", optionen: ["30 Kilometer pro Stunde", "Höchstens Schritttempo", "So schnell wie erlaubt"], richtig: 1, erklaerung: "Steigen Fahrgäste ein oder aus, darfst du rechts an der haltenden Bahn nur im Schritttempo und mit Abstand vorbeifahren. Wenn nötig, wartest du." } },
        { t: tAb + 0.2, titel: "Bahn fährt an", text: "Die Bahn fährt an. Halte die Gleise frei und lass die Bahn durchfahren. Das gilt auch, wenn du abbiegen willst und dabei über die Gleise fährst.", regel: "§ 2 Abs. 3 StVO · § 9 Abs. 3 StVO" }
      ]
    });
  })();

  // ============================================================ 3. SICHERHEITSABSTAND
  (function () {
    const V0 = 50 / 3.6, A = 8, TB = 5, TR = 1.0, LZ_ = 4.6;
    // Vordermann bremst bei TB, der Folgende reagiert nach TR; bei Berührung stoppt er sofort (Auffahren)
    function sim(luecke) {
      let xl = luecke + LZ_, xf = 0, vl = V0, vf = V0, ct = null; const kl = [], kf = [];
      for (let t = 0; t <= 14; t += 0.05) {
        kl.push([+t.toFixed(2), vl * KMH]); kf.push([+t.toFixed(2), vf * KMH]);
        if (t >= TB) vl = Math.max(0, vl - A * 0.05); if (!ct && t >= TB + TR) vf = Math.max(0, vf - A * 0.05);
        xl += vl * 0.05; xf += vf * 0.05;
        if (!ct && xl - xf - LZ_ <= 0) { ct = { t: t + 0.05, v: vf * KMH }; vf = 0; }
      }
      return { kl, kf, ct, rest: xl - xf - LZ_ };
    }
    const sR = sim(25), sF = sim(10), yN = -4.6, yS = 4.6, X0 = 300;
    const WN = [[-X0, yN], [700, yN]], WS = [[-X0, yS], [700, yS]];
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", WN, sR.kf, X0, 0);
    const lr = fahrt("lr", "pkw", "#2c5aa0", WN, sR.kl, X0 + 25 + LZ_, 0), f2 = fahrt("f2", "pkw", "#b3322c", WS, sF.kf, X0, 0, { fokus: true }), lf = fahrt("lf", "pkw", "#e7e3d6", WS, sF.kl, X0 + 10 + LZ_, 0);
    const fl = [{ art: "gruen2", poly: rect(-300, -40, 700, 40), zeigen3d: true }, { art: "asphalt", poly: rect(-300, -6.4, 700, -2.8) }, { art: "asphalt", poly: rect(-300, 2.8, 700, 6.4) }];
    const li = []; [yN, yS].forEach(y => { li.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-300, y - 1.8], [700, y - 1.8]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-300, y + 1.8], [700, y + 1.8]] }); });
    const obj = []; for (let x = -280; x < 700; x += 40) obj.push({ art: "baum", x, y: 0, r: 1.8 });
    // Overlay: Abstandsklammer (live), Anhalteweg als Balken neben dem Auto (Reaktion gelb, Bremsen rot), je Spur eine Pille, Aufprall
    const paar = [{ f: fs, l: lr, y: yN, yb: yN + 1.45, yt: -1.4, s: sR, n: "Richtig", farbe: "#1f9d4d" }, { f: f2, l: lf, y: yS, yb: yS - 1.45, yt: 1.4, s: sF, n: "Zu dicht", farbe: "#c62f26" }];
    const unten = (c, X, Y, s, t) => { if (t < TB) return; paar.forEach(p => { const x0 = rohPos(p.f, TB).x + TYPEN[p.f.typ].l / 2, r = V0 * TR, b = V0 * V0 / (2 * A), yy = p.y + (p.y < 0 ? -1.35 : 1.35), h = 0.6 * s;
      c.globalAlpha = 0.85; c.fillStyle = "#e0a800"; c.fillRect(X(x0), Y(yy) - h / 2, r * s, h); c.fillStyle = "#d8392d"; c.fillRect(X(x0 + r), Y(yy) - h / 2, b * s, h); c.globalAlpha = 1; }); };
    const oben = (c, X, Y, s, t) => {
      const d = dprVon(c); let mitte = 0, n = 0;
      paar.forEach(p => {
        const a = rohPos(p.f, t).x + TYPEN[p.f.typ].l / 2, b = rohPos(p.l, t).x - TYPEN[p.l.typ].l / 2, g = Math.max(0, b - a), v = rohPos(p.f, t).v, ct = p.s.ct;
        c.strokeStyle = p.farbe; c.lineWidth = Math.max(2, 2 * d); c.beginPath(); c.moveTo(X(a), Y(p.yb)); c.lineTo(X(b), Y(p.yb)); c.moveTo(X(a), Y(p.yb) - 4 * d); c.lineTo(X(a), Y(p.yb) + 4 * d); c.moveTo(X(b), Y(p.yb) - 4 * d); c.lineTo(X(b), Y(p.yb) + 4 * d); c.stroke();
        if (ct && t >= ct.t) { const px = X(rohPos(p.f, ct.t).x + 2.25), py = Y(p.y); c.fillStyle = "rgba(255,90,40,.9)"; c.beginPath(); for (let i = 0; i < 16; i++) { const r = (i % 2 ? 0.8 : 1.6) * s, an = i * PI / 8; c.lineTo(px + Math.cos(an) * r, py + Math.sin(an) * r); } c.fill(); }
        if (LZ.bau.vorschau.an) return;
        const txt = ct && t >= ct.t ? "Aufprall mit ca. " + Math.round(ct.v) + " km/h" : t < TB ? p.n + ": " + Math.round(g) + " m Abstand" : v > 0.05 ? "Reaktion 14 m + Bremsen 12 m" : "Stillstand, " + Math.round(g) + " m Abstand";
        pille(c, txt, X((a + b) / 2), Y(p.yt), p.farbe); mitte += X((a + b) / 2); n++;
      });
      if (!LZ.bau.vorschau.an) pille(c, "Vergleich: beide fahren nach rechts →", c.canvas.width * 0.3, Y(yS + 4.6), "rgba(30,34,40,.85)", "#fff", 11);
    };
    const aufprall = Math.round(sF.ct ? sF.ct.v : 0);
    szene({
      id: "abstand", plan: ["s_ueb_abstand", "s_ab_abst"], titel: "Sicherheitsabstand", kurz: "Halber Tachowert als Abstand. Wer zu dicht fährt, fährt auf, wenn der Vordermann bremst",
      dauer: 17, strasse: { flaechen: fl, linien: li, objekte: obj, schilder: [], bordsteine: [], bereich: [-300, 700], boden: "#6a9a52", boden3d: "#6f9a55" }, kamera: { fokus: "f2", zoom: 13.5, vor: 0.2, quer: { immer: true, zeige: ["fs", "lr", "lf"], radius: 60, pad: 4 } },
      fahrzeuge: [fs, lr, f2, lf], overlayUnten: unten, overlay: oben,
      phasen: [
        { t: 0.2, titel: "Halber Tachowert", text: "Zwei Fahrer folgen ihrem Vordermann mit Tempo 50. Faustregel für den Abstand ist der halbe Tachowert in Metern. Bei Tempo 50 sind das 25 Meter, bei Tempo 100 sind es 50 Meter.", regel: "§ 4 Abs. 1 StVO", frage: { text: "Du fährst Tempo 80. Wie groß ist der Abstand nach der Faustregel?", optionen: ["8 Meter", "40 Meter", "80 Meter"], richtig: 1, erklaerung: "Halber Tachowert heißt 80 geteilt durch 2, also 40 Meter. Bei Regen und Nässe deutlich mehr." } },
        { t: 2.8, titel: "Das rote Auto hängt zu dicht", text: "Das rote Auto fährt nur 10 Meter hinter dem weißen Auto. Bei Tempo 50 ist das weniger als eine Sekunde Abstand. Es sieht gut aus, solange nichts passiert.", regel: "§ 4 Abs. 1 StVO" },
        { t: TB - 0.1, titel: "Der Vordermann bremst", text: "Die beiden Autos vorn bremsen plötzlich. Bis du reagierst, vergeht etwa eine Sekunde. Bei Tempo 50 rollt das Auto dabei rund 14 Meter weiter, die gelbe Strecke. Erst dann beginnt der Bremsweg einer Gefahrbremsung, die rote Strecke.", regel: "§ 4 Abs. 1 StVO", frage: { text: "Wie weit rollt dein Auto bei Tempo 50 während einer Sekunde Reaktionszeit?", optionen: ["Etwa 5 Meter", "Etwa 14 Meter", "Etwa 25 Meter"], richtig: 1, erklaerung: "Tempo 50 sind rund 14 Meter pro Sekunde. In der Reaktionszeit rollst du also schon 14 Meter, ohne zu bremsen." } },
        { t: TB + 1.8, titel: "Reaktionsweg plus Bremsweg", text: "Du bremst mit 25 Metern Abstand und bleibst mit Platz stehen. Beim roten Auto reicht der Abstand nicht. Sein Anhalteweg ist länger als die Lücke.", regel: "§ 4 Abs. 1 StVO" },
        { t: TB + 4.5, titel: "Zu dicht heißt Auffahrunfall", text: "Das rote Auto, dessen Tacho du siehst, fährt mit etwa " + aufprall + " Kilometern pro Stunde auf. Dein Abstand muss so groß sein, dass du auch bei plötzlichem Bremsen des Vordermanns noch hinter ihm halten kannst.", regel: "§ 4 Abs. 1 StVO" },
        { t: 12.2, titel: "Die Zwei-Sekunden-Regel", text: "Zähl einundzwanzig, zweiundzwanzig, sobald der Vordermann an einer Stelle vorbei ist. Erst dann darfst du dort sein. Halber Tachowert heißt 25 Meter bei Tempo 50, 50 Meter bei Tempo 100. Bei Nässe, Dunkelheit und mit Anhänger mehr.", regel: "§ 4 Abs. 1 StVO" }
      ]
    });
  })();

  // ============================================================ 4. HALTEN UND PARKEN VERBOTEN
  (function () {
    const X0 = -120, X1 = 260, KANTE = 5.5;
    const fl = [{ art: "gehweg", poly: rect(X0, -6.5, X1, 11) }, { art: "asphalt", poly: rect(X0, -3.3, X1, 3.3) }, { art: "gruen2", poly: rect(X0, 11, X1, 45), zeigen3d: true }, { art: "gruen2", poly: rect(X0, -45, X1, -6.5), zeigen3d: true }];
    const li = [{ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[X0, -3.3], [X1, -3.3]] }, { art: "leit_io", b: 0.12, pts: [[X0, 0], [X1, 0]] }];
    const obj = [], sch = [];
    // Seitenstraße (Einmündung von Süden), Zebrastreifen, Grundstückseinfahrt
    const EM = [38, 44], ZE = [74, 78], EF = [96, 101], EM2 = [166, 172];
    fl.push({ art: "asphalt", poly: rect(EM[0], 3.3, EM[1], 45) }, { art: "asphalt", poly: rect(EM2[0], 3.3, EM2[1], 45) }, { art: "parken", poly: rect(X0, 3.3, EM[0], KANTE) }, { art: "parken", poly: rect(EM[1], 3.3, EM2[0], KANTE) }, { art: "parken", poly: rect(EM2[1], 3.3, X1, KANTE) }, { art: "pflaster", poly: rect(EF[0], KANTE, EF[1], 16) });
    li.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[EM[0], 3.3], [EM[0], 45]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[EM[1], 3.3], [EM[1], 45]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[EM2[0], 3.3], [EM2[0], 45]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[EM2[1], 3.3], [EM2[1], 45]] });
    for (let y = -3; y < 5.4; y += 1) fl.push({ art: "weiss", poly: rect(ZE[0], y, ZE[1], y + 0.5) });
    haeuser(obj, [[EF[0] - 12, 17, 10, 9, 7], [EF[1] + 8, 17, 10, 9, 6, "#e3d7c3"], [10, 17, 11, 9, 8, "#cdd3d8"], [60, 17, 10, 9, 7], [140, 17, 12, 9, 8], [-10, -14, 11, 9, 7, "#e3d7c3"], [60, -14, 11, 9, 8], [140, -14, 11, 9, 7]]);
    baeume(obj, [[28, 8, 1.7], [86, 8, 1.7], [118, 8, 1.7], [200, 8, 1.7]]);
    sch.push({ typ: "z350", x: ZE[0] - 1, y: 9.8, seite: 1 }, { typ: "z283", x: 120, y: 9.8, seite: 1 }, { typ: "z286", x: 144, y: 9.8, seite: 1 });
    const ZONEN = [
      { a: EM[0] - 5, b: EM[0], nurP: 1, titel: "Einmündung", text: "Vor und hinter einer Einmündung oder Kreuzung darfst du nicht parken, jeweils 5 Meter ab dem Schnittpunkt der Fahrbahnkanten. Kurz halten ist dort erlaubt, parken nicht.", regel: "§ 12 StVO", fr: { text: "Wie weit vor und hinter einer Einmündung darfst du nicht parken?", optionen: ["1 Meter", "5 Meter", "20 Meter"], richtig: 1, erklaerung: "Je 5 Meter vor und hinter dem Schnittpunkt der Fahrbahnkanten darfst du nicht parken. Das gilt an Kreuzungen und Einmündungen." } },
      { a: EM[1], b: EM[1] + 5, nurP: 1 },
      { a: ZE[0] - 5, b: ZE[1], rot: 1, titel: "Zebrastreifen", text: "Auf dem Zebrastreifen und bis 5 Meter davor darfst du nicht halten. Wer dort steht, nimmt Fußgängern und Autofahrern die Sicht.", regel: "Zeichen 293 · Zeichen 350", fr: { text: "Darfst du 3 Meter vor dem Zebrastreifen kurz halten, um jemanden aussteigen zu lassen?", optionen: ["Ja, nur kurz", "Nein, bis 5 Meter davor darf man nicht halten", "Ja, mit Warnblinker"], richtig: 1, erklaerung: "Vor dem Zebrastreifen gilt auf den letzten 5 Metern ein Haltverbot. Auch kurzes Halten ist nicht erlaubt." } },
      { a: EF[0], b: EF[1], nurP: 1, titel: "Grundstückseinfahrt", text: "Vor einer Einfahrt oder Ausfahrt eines Grundstücks darfst du nicht parken. Kurzes Halten ist erlaubt. Wer dort parkt, sperrt die Anwohner ein oder aus.", regel: "§ 12 StVO" },
      { a: 120, b: 138, rot: 1, titel: "Absolutes Haltverbot", text: "Ab dem Schild darfst du nicht halten und nicht parken. Auch nicht kurz zum Aussteigen.", regel: "Zeichen 283 · § 12 StVO", fr: { text: "Darfst du im absoluten Haltverbot kurz zum Aussteigen halten?", optionen: ["Ja, bis 3 Minuten", "Nein, Halten ist nicht erlaubt", "Ja, mit Warnblinker"], richtig: 1, erklaerung: "Das Schild verbietet das Halten ganz. Anhalten darfst du hier nur, wenn der Verkehr dich dazu zwingt." } },
      { a: 144, b: 160, orange: 1, titel: "Eingeschränktes Haltverbot", text: "Hier darfst du bis zu 3 Minuten halten. Zum Ein- und Aussteigen oder zum Be- und Entladen auch länger, aber ohne Verzögerung. Stehst du sonst länger oder gehst weg, parkst du. Und das ist hier verboten. Das Haltverbot gilt bis zur nächsten Einmündung.", regel: "Zeichen 286 · § 12 StVO", fr: { text: "Wie lange darfst du im eingeschränkten Haltverbot halten?", optionen: ["Gar nicht", "Bis zu 3 Minuten", "So lange du willst"], richtig: 1, erklaerung: "Im eingeschränkten Haltverbot darfst du bis zu 3 Minuten halten. Zum Ein- und Aussteigen oder zum Be- und Entladen auch länger, aber ohne Verzögerung. Stehst du sonst länger oder gehst weg, parkst du. Und das ist hier verboten." } },
      { a: 161, b: 166, nurP: 1 },
      { a: 172, b: 177, nurP: 1 },
      { a: 180, b: 196, gruen: 1, titel: "Hier darfst du halten", text: "Die Einmündung hat das Haltverbot beendet. Keine Einmündung, kein Zebrastreifen, keine Einfahrt und kein Schild mehr. Hier darfst du halten und parken. Blink rechts, fahr an den Rand und halte an.", regel: "§ 12 StVO" }
    ];
    const parked = [[28, "#2c5aa0"], [56, "#b3322c"], [112, "#6a7d8f"]];  // stehen nur an erlaubten Stellen
    const mitten = 185, sStop = mitten - X0;
    const grenzen = [{ von: 0, bis: sStop + 1, v: 12 }];
    const plan = fahrplan({ vMax: 12, v0: 12, grenzen, halte: [{ s: sStop, bis: 999 }], dauer: 75, s0: 100 });
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", [[X0, 1.65], [X1, 1.65]], plan, 100, 0, { fokus: true });
    fs.blinker = [{ von: tBeiS(fs, sStop - 22), bis: 999, seite: "rechts" }];
    const tZu = x => tBeiS(fs, x - X0);
    const ph = [{ t: 0.2, titel: "Wo darfst du halten?", text: "Du suchst einen Platz zum Parken. Rot heißt, kein Halten und kein Parken. Rosa heißt, nur Parken ist verboten, kurzes Halten ist erlaubt. Du fährst die Strecke jetzt Schritt für Schritt ab.", regel: "§ 12 StVO" }];
    let letzte = null;
    ZONEN.forEach(z => { if (z.titel) { z.tp = Math.max(1, tZu(z.a - 12)); ph.push({ t: z.tp, titel: z.titel, text: z.text, regel: z.regel, frage: z.fr }); } else { z.tp = letzte.tp; } letzte = z; });
    const tp = z => z.tp;
    const farbe = z => z.rot ? "255,60,48" : z.nurP ? "235,90,160" : z.orange ? "255,170,30" : "50,200,100";
    function zonenOben(c, X, Y, s, t) {
      ZONEN.forEach(z => {
        const akt = t >= z.tp, vorbei = t > z.tp + 9, a = akt ? (vorbei ? 0.28 : 0.46) : 0.14;
        c.fillStyle = "rgba(" + farbe(z) + "," + a + ")"; c.fillRect(X(z.a), Y(3.4), (z.b - z.a) * s, (KANTE - 3.4) * s);
        c.strokeStyle = "rgba(" + farbe(z) + "," + (akt ? 0.95 : 0.3) + ")"; c.lineWidth = Math.max(1.5, 0.18 * s); c.strokeRect(X(z.a), Y(3.4), (z.b - z.a) * s, (KANTE - 3.4) * s);
      });
    }
    const KURZ = z => z.rot ? "kein Halten" : z.nurP ? "kein Parken" : z.orange ? "Halten ≤ 3 min" : "frei", FPUNKT = ["255,60,48", "235,90,160", "255,170,30", "50,200,100"], FTEXT = ["kein Halten/Parken", "nur kein Parken", "Halten bis 3 min", "frei"];
    function obenText(c, X, Y, s, t) {
      if (LZ.bau.vorschau.an) return; const d = dprVon(c);
      c.save(); c.font = "bold " + Math.round(11 * d) + "px sans-serif"; const breite = tx => c.measureText(tx).width + 14 * d; c.restore(); const reihen = [-1e9, -1e9, -1e9];
      ZONEN.forEach(z => { if (!z.titel || t < z.tp || t > z.tp + 9) return; const mx = X((z.a + z.b) / 2), w = breite(KURZ(z)), links = Math.max(4 * d, mx - w / 2); let reihe = reihen.findIndex(rr => links >= rr + 6 * d); if (reihe < 0) reihe = 2; const r = pille(c, KURZ(z), mx, Y(6.7 + reihe * 2), "rgba(" + farbe(z) + ",.95)", z.orange || z.gruen ? "#111" : "#fff", 11); reihen[reihe] = r[1]; });
      // feste Mini-Legende unten: einzeilig, wenn sie in die Breite passt (Querformat), sonst 2 × 2 bzw. untereinander
      const W = c.canvas.width, H = c.canvas.height, zh = 15 * d; c.save(); c.font = "bold " + Math.round(11 * d) + "px sans-serif"; c.textBaseline = "middle"; c.textAlign = "left";
      const ws = FTEXT.map(tx => c.measureText(tx).width + 26 * d), eine = ws.reduce((a, b) => a + b, 0) + 6 * d <= W - 12 * d, zw = eine ? 4 : H / d < 330 ? 2 : 1, cw = 138 * d, rows = Math.ceil(4 / zw), bx = 6 * d, by = H - 6 * d - rows * zh - 4 * d;
      c.fillStyle = "rgba(20,24,28,.78)"; c.fillRect(bx, by, eine ? ws.reduce((a, b) => a + b, 0) + 6 * d : zw * cw + 6 * d, rows * zh + 8 * d);
      let xs = 0; FTEXT.forEach((tx, i) => { const cx = bx + 6 * d + (eine ? xs : zw > 1 ? (i % zw) * cw : 0), cy = by + 4 * d + (eine ? 0 : zw === 2 ? Math.floor(i / 2) : i) * zh + zh / 2; xs += ws[i]; c.fillStyle = "rgb(" + FPUNKT[i] + ")"; c.beginPath(); c.arc(cx + 5 * d, cy, 4.5 * d, 0, 7); c.fill(); c.fillStyle = "#fff"; c.fillText(tx, cx + 14 * d, cy); });
      c.restore();
    }
    function zonen3d(c, h, t) { ZONEN.forEach(z => { const akt = t >= z.tp; h.poly3d(c, [[z.a, 3.4, 0.03], [z.b, 3.4, 0.03], [z.b, KANTE, 0.03], [z.a, KANTE, 0.03]], "rgba(" + farbe(z) + "," + (akt ? 0.5 : 0.18) + ")"); }); }
    szene({
      id: "halteverbot", plan: ["gf_laengs"], titel: "Halten und Parken verboten", kurz: "Entlang einer Straße. Wo darfst du halten und wo nicht?",
      dauer: Math.ceil(tBeiS(fs, sStop - 0.5) + 3), strasse: { flaechen: fl, linien: li, objekte: obj, schilder: sch, bordsteine: [{ pts: [[X0, 3.3], [X1, 3.3]], seite: 1 }], bereich: [X0, X1], boden: "#6a9a52", boden3d: "#6f9a55" },
      kamera: { fokus: "fs", zoom: 15, vor: 0.2, quer: { immer: true, zeige: [], pad: 14 } }, fahrzeuge: [fs].concat(parked.map(([x, f], i) => parkt("p" + i, "pkw", f, x, 4.4, 0))),
      overlayUnten: zonenOben, overlay: obenText, overlay3d: (c, h, t) => zonen3d(c, h, t),
      phasen: ph.concat([{ t: tBeiS(fs, sStop - 0.5) - 1.5, titel: "Zum Merken", text: "Zum Parken brauchst du Abstand zu Kreuzungen, Zebrastreifen und Einfahrten, und es darf kein Haltverbotsschild stehen. Bist du unsicher, fahr lieber einen Meter weiter.", regel: "§ 12 StVO" }])
    });
  })();

  // ============================================================ 5. EINSATZFAHRZEUG MIT BLAULICHT UND EINSATZHORN
  (function () {
    const K = kreuzung({ b: 3.25, R: 6 }), d = 3.25 + K.g + 8;
    haeuser(K.objekte, [[d + 4, d + 3, 11, 9, 9, "#d9cfbf"], [d + 18, d + 4, 10, 10, 7, "#e3d7c3", "#8a4a36"], [-d - 4, d + 3, 11, 9, 8, "#cdd3d8", "#6d5a4a"], [-d - 18, d + 3, 10, 9, 10, "#e3d7c3"], [d + 4, -d - 3, 11, 9, 8, "#e3d7c3"], [d + 18, -d - 4, 10, 10, 10, "#d4c7b6", "#6d5a4a"], [-d - 4, -d - 3, 11, 9, 7, "#d9cfbf", "#8a4a36"], [-d - 18, -d - 3, 10, 9, 9, "#cdd3d8"]]);
    K.linien.push({ art: "leit_io", b: 0.12, pts: [[-90, 0], [-12, 0]] }, { art: "leit_io", b: 0.12, pts: [[12, 0], [90, 0]] }, { art: "leit_io", b: 0.12, pts: [[0, 90], [0, 12]] }, { art: "leit_io", b: 0.12, pts: [[0, -12], [0, -90]] });
    Object.assign(K, { schilder: [], bereich: [-K.L, K.L], boden: "#6a9a52", boden3d: "#6f9a55" });
    TYPEN.rtwb = { l: 8.8, b: 3.0, h: 3.5 };                                  // Rettungswagen, größer und besser zu erkennen
    EXT.bild.rtwb = function (g, f, T) {
      const l = T.l, b = T.b, hw = b / 2; H.rrg(g, -l / 2, -hw, l, b, 0.5); g.fillStyle = H.quer(g, f.farbe, hw, 0.05); g.fill(); g.lineWidth = 0.06; g.strokeStyle = "rgba(0,0,0,.5)"; g.stroke();
      g.fillStyle = "#e0c000"; g.fillRect(-l / 2 + 0.2, -hw + 0.25, l * 0.7, 0.32); g.fillRect(-l / 2 + 0.2, hw - 0.57, l * 0.7, 0.32);
      g.fillStyle = "#d02a28"; g.fillRect(-l * 0.3, -0.3, 1.5, 0.6); g.fillRect(-l * 0.3 + 0.45, -0.75, 0.6, 1.5);
      H.rrg(g, l / 2 - 1.7, -hw * 0.82, 1.1, b * 0.82, 0.25); g.fillStyle = "rgba(24,36,50,.92)"; g.fill();
      for (const sd of [-1, 1]) { g.fillStyle = "#1b3f9a"; H.rrg(g, 0.9, sd * hw * 0.4 - 0.32, 0.9, 0.64, 0.12); g.fill(); g.fillStyle = "#6f9bff"; H.rrg(g, 1.0, sd * hw * 0.4 - 0.2, 0.7, 0.4, 0.1); g.fill(); }
      g.fillStyle = "#fffbe6"; for (const q of [-1, 1]) { g.beginPath(); g.ellipse(l / 2 - 0.1, q * hw * 0.62, 0.12, 0.22, 0, 0, 7); g.fill(); }
    };
    EXT.k3d.rtwb = function (c, p, f, T) {
      const ch = Math.cos(p.h), sh = Math.sin(p.h), on = H.blinkAn();
      H.quader(c, p.x, p.y, p.h, T.l, T.b, 0.5, T.h, f.farbe, 1, (fl, v) => { if (fl.name === "vorn" || fl.name === "links" || fl.name === "rechts") { const a = fl.i.map(j => v[j]), z0 = a[0][2], dz = a[3][2] - z0, P = (t, zt) => [lerp(a[0][0], a[1][0], t), lerp(a[0][1], a[1][1], t), z0 + dz * zt]; H.poly3d(c, [P(0.04, 0.5), P(0.96, 0.5), P(0.96, 0.85), P(0.04, 0.85)], "#2b3945"); H.poly3d(c, [P(0, 0.08), P(1, 0.08), P(1, 0.22), P(0, 0.22)], "#e0c000"); } });
      H.quader(c, p.x + ch * 1.4, p.y + sh * 1.4, p.h, 0.6, T.b * 0.75, T.h, T.h + 0.3, on ? "#6f9bff" : "#1b3c80");
    };
    const XS = -17;                                                           // Halteposition der Fahrschule (Mitte): weit vor der Kreuzung
    const WF = [[-150, 1.625], [-34, 1.625], [-24, 2.15], [150, 2.15]], sS = XS + 150;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", WF, fahrplan({ vMax: 20, v0: 20, b: 2.8, halte: [{ s: sS, bis: 9.2 }], dauer: 20, s0: 120 }), 120, 0, { fokus: true, bremsStand: true, blinker: [{ von: 0.8, bis: 11.5, seite: "rechts" }] });
    const rtw = fahrt("rtw", "rtwb", "#f5f2e8", [[-300, 1.625], [-52, 1.625], [-40, -1.6], [300, -1.6]], [[0, 18], [7, 46], [30, 46]], 300 - 44, 0, { blau: true });
    const q = fahrt("q", "pkw", "#2c5aa0", [[1.625, 150], [1.625, -150]], fahrplan({ vMax: 30, v0: 30, halte: [{ s: 150 - 15.2, bis: 7.6 }], dauer: 20, s0: 113 }), 113, 0, { bremsStand: true });
    const tBeiX = xz => { let a = 0, b = 30; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (rohPos(rtw, m).x < xz) a = m; else b = m; } return a; };
    const tMitte = tBeiX(0), tFs = tBeiX(XS);
    // Einsatzhorn: Schallringe und wechselndes Blaulicht um den Rettungswagen
    const ringe = (c, X, Y, s, t) => {
      const p = rohPos(rtw, t); if (t > tMitte + 4.5) return; const d = dprVon(c), px = X(p.x), py = Y(p.y);
      c.save(); c.lineWidth = Math.max(3 * d, 0.4 * s); for (let i = 0; i < 3; i++) { const ph = (t * 0.9 + i / 3) % 1; c.strokeStyle = "rgba(70,130,255," + (0.85 * (1 - ph)).toFixed(2) + ")"; c.beginPath(); c.arc(px, py, (3 + ph * 15) * s, 0, 7); c.stroke(); }
      const w = Math.floor(performance.now() / 190) % 2; H.leuchte(px + Math.cos(p.h) * 1.4 * s - Math.sin(p.h) * (w ? 1.1 : -1.1) * s, py + Math.sin(p.h) * 1.4 * s + Math.cos(p.h) * (w ? 1.1 : -1.1) * s, 4.5 * s, "#3d7bff", 0.95); c.restore();
      if (!LZ.bau.vorschau.an) {
        const ab = Math.max(2.8 * s, 20 * d), kasten = document.querySelector("#lzCap"); let cy = py - ab;
        if (kasten && !kasten.hidden) {                      // Pille darf den Erklärkasten nicht schneiden: sonst unter den RTW
          const cr = kasten.getBoundingClientRect(), vr = c.canvas.getBoundingClientRect(); c.save(); c.font = "bold " + Math.round(13 * d) + "px sans-serif";
          const w = c.measureText("Blaulicht + Einsatzhorn").width + 14 * d, h = Math.round(13 * d) + 8 * d, lx = Math.max(w / 2 + 4 * d, Math.min(c.canvas.width - w / 2 - 4 * d, px)); c.restore();
          if (lx + w / 2 > (cr.left - vr.left) * d && lx - w / 2 < (cr.right - vr.left) * d && cy - h / 2 < (cr.bottom - vr.top) * d + 16 * d) cy = py + ab;
        }
        const pr = pille(c, "Blaulicht + Einsatzhorn", px, cy, "rgba(20,50,140,.92)", "#fff", 13); LZ._pillen = LZ._pillen || {}; LZ._pillen.einsatz = [pr[0] / d, (cy - pr[2] / 2) / d, pr[1] / d, (cy + pr[2] / 2) / d];   // für den Test
      }
    };
    szene({
      id: "einsatz", plan: ["a_stadt"], titel: "Einsatzfahrzeug mit Blaulicht", kurz: "Bei Blaulicht und Einsatzhorn schaffst du sofort freie Bahn. Du hältst rechts und blockierst die Kreuzung nicht",
      dauer: 14, strasse: K, kamera: { fest: [-12, 4], zoom: 8.5, quer: { immer: true, zeige: ["rtw", "q"], radius: 80 } }, fahrzeuge: [fs, rtw, q], overlay: ringe,
      phasen: [
        { t: 0.2, titel: "Blaulicht und Einsatzhorn", text: "Hinter dir nähert sich ein Rettungswagen mit Blaulicht und Einsatzhorn. Das heißt, alle anderen müssen sofort freie Bahn schaffen. Egal, wer sonst Vorfahrt hätte.", regel: "§ 38 Abs. 1 StVO", frage: { text: "Hinter dir kommt ein Rettungswagen mit Blaulicht und Einsatzhorn. Was tust du?", optionen: ["Weiterfahren und Gas geben", "Ruhig bleiben, rechts blinken, an den rechten Rand fahren und anhalten", "Mitten auf der Fahrbahn stehen bleiben"], richtig: 1, erklaerung: "Schaff sofort freie Bahn. Blink rechts, fahr so weit rechts wie möglich und halte an, damit der Rettungswagen vorbei kann." } },
        { t: 1.2, titel: "Rechts heranfahren", text: "Blink rechts, fahr an den rechten Rand und halte an. Aber vor der Kreuzung, nicht mittendrin. Wer in der Kreuzung steht, versperrt dem Einsatzfahrzeug den Weg.", regel: "§ 38 Abs. 1 StVO" },
        { t: tFs - 0.8, titel: "Der Rettungswagen überholt", text: "Er fährt auch auf der Gegenspur an dir vorbei. Du bleibst stehen, bewegst dich nicht mehr und fährst ihm nicht hinterher.", regel: "§ 38 Abs. 1 StVO" },
        { t: tMitte - 1.0, titel: "An der Kreuzung wartet auch der Querverkehr", text: "Das blaue Auto kommt von rechts und hätte sonst Vorfahrt. Jetzt muss es warten. Das Einsatzfahrzeug hat freie Bahn.", regel: "§ 38 Abs. 1 StVO", frage: { text: "Das blaue Auto kommt von rechts. Darf es vor dem Rettungswagen in die Kreuzung fahren?", optionen: ["Ja, rechts vor links", "Nein, der Rettungswagen hat freie Bahn", "Ja, wenn es schnell ist"], richtig: 1, erklaerung: "Blaulicht mit Einsatzhorn heißt freie Bahn. Alle anderen warten, auch wer sonst Vorfahrt hätte." } },
        { t: 9.3, titel: "Erst wenn alles frei ist", text: "Der Rettungswagen ist durch. Bevor du losfährst, schau, ob noch ein zweites Einsatzfahrzeug kommt. Dann blinkst du und ordnest dich mit Schulterblick wieder ein.", regel: "§ 38 Abs. 1 StVO" }
      ]
    });
  })();
})();
