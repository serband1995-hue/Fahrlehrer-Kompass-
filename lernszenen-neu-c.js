/* ============================================================================
   Fahrlehrer-Kompass · Lernszenen Block 6 (c): Einbahnstraße, Fahrradstraße, verkehrsberuhigter Bereich,
   Verbot der Einfahrt. Baut auf lernszenen.js und lernszenen-stadt.js auf.
   Welt in Metern: x nach Osten, y nach Süden. Rechtsverkehr. Fahrtrichtung Osten = 0, Norden = −π/2.
   Schilder nach amtlicher Vorlage (schilderNeu): { typ, x, y, aussen: Seite weg von der Fahrbahn, blick: Richtung, aus der der Verkehr kommt }.
   Neue Schild-Typen (Zeichnungen folgen in lernszenen.js; links: true = zweites Schild auf der linken Seite): z220_20, z220_10, z220_20_rad, z220_10_rad, z267, z267_rad, z250,
   z244_1, z244_1_anl, z244_1_kfz, z244_2, z325_1, z325_2.
   ============================================================================ */
(function () {
  "use strict";
  const LZ = window.Lernszenen; if (!LZ || !LZ.bau || !LZ.stadt) return;
  const { pfad, tempoProfil, bezier } = LZ.bau, { fahrplan, sNahe, tBeiS } = LZ.stadt;
  const PI = Math.PI;

  // ------------------------------------------------------------ Bausteine
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const bogen = (cx, cy, r, a0, a1, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
  function fahrt(id, typ, farbe, punkte, keys, sBei, tBei, extra) {
    const tempo = tempoProfil(keys); let p = pfad(punkte), start = (sBei || 0) - tempo.s(tBei || 0);
    if (start < 0) { const a = p.pts[0], b = p.pts[1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, d = -start + 5; p = pfad([[a.x - (b.x - a.x) / L * d, a.y - (b.y - a.y) / L * d]].concat(punkte)); start += d; }
    return Object.assign({ id, typ, farbe, pfad: p, tempo, start }, extra || {});
  }
  const parkt = (id, typ, farbe, x, y, h) => ({ id, typ, farbe, parkt: true, pfad: pfad([[x - Math.cos(h), y - Math.sin(h)], [x + Math.cos(h), y + Math.sin(h)]]), tempo: tempoProfil([[0, 0]]), start: 1 });
  const haeuser = (obj, l) => l.forEach(([x, y, a, b, h, f, d]) => obj.push({ art: "haus", x, y, l: a, b, hoehe: h || 7, farbe: f || "#d9cfbf", dach: d || "#a7553f" }));
  const baeume = (obj, l) => l.forEach(([x, y, r]) => obj.push({ art: "baum", x, y, r: r || 2.2 }));
  const leit = (st, ...p) => p.forEach(l => st.linien.push({ art: "leit_io", b: 0.12, pts: l }));
  function neu(sz) { sz.kategorie = "innerorts"; sz.schilderNeu = true; LZ.registriere(sz); }

  // Rechteck mit abgerundeten Ecken (r je Ecke: [oben links, oben rechts, unten rechts, unten links]; oben = Norden)
  function rrect(x0, y0, x1, y1, r) {
    const [a, b, c, d] = Array.isArray(r) ? r : [r, r, r, r], o = [];
    const ecke = (cx, cy, rr, a0) => { if (rr > 0) o.push(...bogen(cx, cy, rr, a0, a0 + PI / 2, 8)); else o.push([cx, cy]); };
    ecke(a ? x0 + a : x0, a ? y0 + a : y0, a, PI); ecke(b ? x1 - b : x1, b ? y0 + b : y0, b, -PI / 2);
    ecke(c ? x1 - c : x1, c ? y1 - c : y1, c, 0); ecke(d ? x0 + d : x0, d ? y1 - d : y1, d, PI / 2);
    return o;
  }
  // Straßennetz aus Blöcken: Asphalt überall, darauf je Block Gehweg (abgerundet an Kreuzungen), Grün dahinter, Bordstein am Blockrand.
  // bloecke: [x0, y0, x1, y1, r] mit r = Eckradius (Zahl oder [ol, or, ur, ul]); g = Gehwegbreite
  function netz(bereich, bloecke, g) {
    const st = { flaechen: [{ art: "asphalt", poly: rect(...bereich) }], linien: [], objekte: [], bordsteine: [], schilder: [] };
    bloecke.forEach(([x0, y0, x1, y1, r]) => {
      const rr = Array.isArray(r) ? r : [r, r, r, r], ri = rr.map(v => v > 0 ? Math.max(0.5, v - g) : 0), au = rrect(x0, y0, x1, y1, rr);
      st.flaechen.push({ art: "gehweg", poly: au }, { art: "gruen2", zeigen3d: true, poly: rrect(x0 + g, y0 + g, x1 - g, y1 - g, ri) });
      st.bordsteine.push({ pts: au.concat([au[0]]), seite: 1 });
    });
    return Object.assign(st, { bereich: [bereich[0], bereich[2]], boden: "#6a9a52", boden3d: "#6f9a55" });
  }

  // ============================================================ 1. Einbahnstraße (Zeichen 220), links einordnen, Radfahrer in Gegenrichtung
  (function () {
    // Straße A (Nord-Süd, x = 0) mit Einmündung der Einbahnstraße nach Osten (y −3,5 … 3,5, nur Richtung Osten);
    // Kreuzung B bei x = 50 (Nord-Süd-Straße), östlich davon wieder Verkehr in beide Richtungen.
    const R = 6, g = 2.5, bA = 3.25, bE = 3.5, XB = 50, bB = 3.25;
    const st = netz([-90, -90, 140, 90], [
      [-90, -90, -bA, 90, 0],
      [bA, -90, XB - bB, -bE, [0, 0, R, R]], [bA, bE, XB - bB, 90, [R, R, 0, 0]],
      [XB + bB, -90, 140, -bE, [0, 0, 0, R]], [XB + bB, bE, 140, 90, [R, 0, 0, 0]]
    ], g);
    leit(st, [[0, 90], [0, 12]], [[0, -12], [0, -90]], [[XB, 90], [XB, 12]], [[XB, -12], [XB, -90]], [[XB + 12, 0], [140, 0]]);
    haeuser(st.objekte, [[-14, -30, 10, 12, 8], [-14, -8, 10, 12, 7, "#e3d7c3"], [-14, 14, 10, 12, 9, "#cdd3d8", "#6d5a4a"], [-14, 36, 10, 12, 7],
      [16, -16, 10, 9, 8, "#e3d7c3", "#8a4a36"], [32, -16, 10, 9, 7], [16, 16, 10, 9, 7, "#cdd3d8"], [32, 16, 10, 9, 9, "#d4c7b6", "#6d5a4a"],
      [66, -16, 10, 9, 8], [82, -16, 10, 9, 7, "#e3d7c3"], [66, 16, 10, 9, 7, "#d4c7b6"], [82, 16, 10, 9, 8, "#cdd3d8"]]);
    baeume(st.objekte, [[24, -7.5, 1.6], [24, 7.5, 1.6], [74, 7.5, 1.6], [-7.5, 26, 1.6]]);
    // Schilder: Zeichen 220 an der Einmündung (für beide Richtungen der Straße A), Zeichen 267 am Ende der Einbahnstraße (Kreuzung B)
    st.schilder.push(
      { typ: "z220_20_rad", x: bA + R + 1.5, y: bE + 0.5, aussen: [0, 1], blick: [0, 1] },
      { typ: "z220_10_rad", x: bA + R + 1.5, y: -bE - 0.5, aussen: [0, -1], blick: [0, -1] },
      { typ: "z267_rad", x: XB - bB - R - 1, y: -bE - 0.5, aussen: [0, -1], blick: [1, 0] },
      { typ: "z267_rad", x: XB - bB - R - 1, y: bE + 0.5, aussen: [0, 1], blick: [1, 0], links: true });
    // Weg der Fahrschule: von Süden, rechts in die Einbahnstraße (Bogen um die Ecke), links einordnen, an B links nach Norden
    const yR = 1.9, yL = -0.7, xHalt = 41.5, xN = XB + 1.625;
    const pts = [[1.65, 90], [1.65, 9.5]].concat(bogen(bA + R, bE + R, 7.6, PI, 1.5 * PI, 12)).concat([[19, yR]])
      .concat(bezier([19, yR], [26, yR], [26, yL], [33, yL], 12)).concat([[xHalt, yL]])
      .concat(bezier([xHalt, yL], [47, yL], [xN, -6.5], [xN, -12], 14)).concat([[xN, -90]]);
    const sStop = sNahe(pts, xHalt, yL), sEin = sNahe(pts, 16, yR), S0 = 56;
    const mk = bis => fahrt("fs", "fahrschule", "#f2f2ee", pts, fahrplan({ vMax: 30, v0: 22, a: 1.6, grenzen: [{ von: 68, bis: sEin, v: 12 }, { von: sEin, bis: sStop + 30, v: 22 }], halte: [{ s: sStop, bis }], dauer: 50, s0: S0 }), S0, 0, { fokus: true, bremsStand: true });
    const tStop = tBeiS(mk(99), sStop - 0.4);
    // Radfahrer in Gegenrichtung: kommt von Osten, fährt am Nordrand der Einbahnstraße nach Westen, biegt an A rechts nach Norden
    const yRad = -2.8, radPts = [[140, -2.5], [XB + 8, -2.5], [XB - 6, yRad], [bA + R, yRad]].concat(bogen(bA + R, -bE - R, bE + R + yRad, PI / 2, PI, 10)).concat([[bA + R - (bE + R + yRad), -90]]);
    const rad = fahrt("rad", "rad", "#2c5aa0", radPts, [[0, 16]], sNahe(radPts, xHalt + 2.25, yRad), tStop + 2);
    const tGo = tStop + 2 + 3.4 / (16 / 3.6) + 0.6;
    const fs = mk(tGo), tA = tBeiS(fs, sEin - 2);
    fs.blinker = [{ von: 0.3, bis: tA, seite: "rechts" }, { von: tA + 0.3, bis: tBeiS(fs, sStop + 16), seite: "links" }];
    fs.schulter = [{ von: tBeiS(fs, 66), bis: tBeiS(fs, 66) + 0.9, seite: "rechts" }, { von: tA + 0.5, bis: tA + 1.4, seite: "links" }, { von: tGo - 1.1, bis: tGo - 0.2, seite: "links" }];
    const pRad = Math.max(tA + 4.2, tStop - 2.2);
    neu({
      id: "einbahn", plan: ["a_einbahn"], titel: "Einbahnstraße", kurz: "Nur in Pfeilrichtung fahren. Zum Linksabbiegen links einordnen und Radfahrer in Gegenrichtung durchlassen",
      dauer: Math.ceil(tGo + 7), strasse: st, kamera: { fokus: "fs", zoom: 14, vor: 0.15, quer: { immer: true, zeige: ["rad"], radius: 34, pad: 5 } },
      fahrzeuge: [fs, rad],
      phasen: [
        { t: 0.2, titel: "Das Schild Einbahnstraße", text: "Schau mal, das blaue Schild mit dem weißen Pfeil heißt Einbahnstraße. Du darfst sie nur in Pfeilrichtung befahren. Hier biegst du rechts hinein.", regel: "Zeichen 220 StVO", frage: { text: "Was bedeutet das blaue Schild mit dem weißen Pfeil?", optionen: ["Ich darf die Straße nur in Pfeilrichtung befahren", "Ich habe in dieser Straße Vorfahrt", "Ich muss in diese Straße abbiegen"], richtig: 0, erklaerung: "Das Schild zeigt eine Einbahnstraße. Fahrzeuge dürfen sie nur in Richtung des Pfeils befahren." } },
        { t: tA - 0.5, titel: "Links einordnen", text: "An der nächsten Kreuzung willst du links abbiegen. In der Einbahnstraße ordnest du dich dafür möglichst weit links ein. Vorher Spiegel, Blinker links und Schulterblick.", regel: "§ 9 Abs. 1 StVO", frage: { text: "Du willst in der Einbahnstraße links abbiegen. Wo ordnest du dich ein?", optionen: ["Ich ordne mich zur Mitte ein, wie sonst auch", "Ich ordne mich möglichst weit links ein", "Ich bleibe ganz rechts"], richtig: 1, erklaerung: "Auf Fahrbahnen für eine Richtung ordnest du dich zum Linksabbiegen möglichst weit links ein." } },
        { t: pRad, titel: "Radfahrer in Gegenrichtung", text: "Unter dem Einbahnstraßenschild hängt ein Zusatzzeichen. Es zeigt, hier fahren Radfahrer in beide Richtungen. Da kommt dir schon einer entgegen. Beim Abbiegen rechnest du immer mit ihnen.", regel: "Zeichen 220 mit Zusatzzeichen", frage: { text: "Ein Radfahrer kommt dir in der Einbahnstraße entgegen. Darf er das?", optionen: ["Nein, er fährt falsch herum", "Ja, Radfahrer dürfen hier in Gegenrichtung fahren, das zeigt das Zusatzzeichen", "Nur wenn er sein Rad schiebt"], richtig: 1, erklaerung: "Diese Einbahnstraße ist für Radfahrer in Gegenrichtung freigegeben. Das Zusatzzeichen am Einbahnstraßenschild weist darauf hin. Rechne mit Gegenverkehr auf zwei Rädern, besonders beim Abbiegen." } },
        { t: tStop + 0.3, titel: "Gegenverkehr durchlassen", text: "Du stehst links eingeordnet und wartest. Lass dabei links genug Platz für Radfahrer von vorn. Wer links abbiegt, lässt entgegenkommende Fahrzeuge durchfahren, auch den Radfahrer.", regel: "§ 9 Abs. 3 StVO", frage: { text: "Der Radfahrer kommt dir entgegen, du willst links abbiegen. Wer fährt zuerst?", optionen: ["Ich, ich fahre ja in Pfeilrichtung", "Der Radfahrer, ich lasse ihn durch", "Wer zuerst an der Kreuzung ist"], richtig: 1, erklaerung: "Beim Abbiegen lässt du entgegenkommende Fahrzeuge durchfahren. Auch Radfahrer in Gegenrichtung sind Gegenverkehr." } },
        { t: tGo + 0.2, titel: "Abbiegen und merken", text: "Jetzt ist frei, du biegst links ab. Übrigens, in einer Einbahnstraße darfst du auch links halten und parken. Wer von der anderen Seite kommt, sieht das Schild Verbot der Einfahrt.", regel: "§ 12 Abs. 4 StVO · Zeichen 267" }
      ]
    });
  })();

  // ============================================================ 2. Fahrradstraße (Zeichen 244.1 / 244.2)
  (function () {
    const g = 2.5, b = 3.25, X0 = -150, X1 = 300, XA = 0, XE = 150;
    const st = netz([X0, -60, X1, 60], [[X0, -60, X1, -b, 0], [X0, b, X1, 60, 0]], g);
    st.bordsteine = [{ pts: [[X0, -b], [X1, -b]], seite: -1 }, { pts: [[X0, b], [X1, b]], seite: 1 }];
    leit(st, [[X0, 0], [XA - 6, 0]], [[XE + 6, 0], [X1, 0]]);                       // in der Fahrradstraße keine Leitlinie
    for (let x = XA + 14; x < XE - 6; x += 32) st.flaechen.push({ art: "weiss", poly: rect(x, 1.0, x + 2.4, 1.25) }, { art: "weiss", poly: rect(x + 0.4, -1.25, x + 2.0, -1.0) });
    haeuser(st.objekte, [[-40, 12, 12, 9, 8], [-15, 12, 10, 9, 7, "#e3d7c3"], [10, 12, 11, 9, 9, "#cdd3d8", "#6d5a4a"], [35, 12, 10, 9, 7], [60, 12, 12, 9, 8, "#d4c7b6"], [88, 12, 10, 9, 7, "#e3d7c3", "#8a4a36"], [115, 12, 11, 9, 8], [142, 12, 10, 9, 7, "#cdd3d8"], [170, 12, 12, 9, 8],
      [-30, -12, 11, 9, 7, "#e3d7c3"], [-2, -12, 10, 9, 8], [24, -12, 12, 9, 7, "#cdd3d8"], [50, -12, 10, 9, 9, "#d4c7b6", "#6d5a4a"], [76, -12, 11, 9, 7], [102, -12, 10, 9, 8, "#e3d7c3"], [128, -12, 12, 9, 7], [156, -12, 10, 9, 8, "#cdd3d8"]]);
    baeume(st.objekte, [[-26, 5.9, 1.5], [22, 5.9, 1.5], [74, 5.9, 1.5], [128, 5.9, 1.5], [-6, -5.9, 1.5], [62, -5.9, 1.5], [114, -5.9, 1.5]]);
    st.schilder.push(
      { typ: "z244_1_kfz", x: XA, y: b + 0.5, aussen: [0, 1], blick: [-1, 0] }, { typ: "z244_2", x: XA - 1, y: -b - 0.5, aussen: [0, -1], blick: [1, 0] },
      { typ: "z244_2", x: XE, y: b + 0.5, aussen: [0, 1], blick: [-1, 0] }, { typ: "z244_1_kfz", x: XE + 1, y: -b - 0.5, aussen: [0, -1], blick: [1, 0] });
    // zwei Radfahrer nebeneinander (15 km/h), Fahrschule (höchstens 30) bleibt dahinter, bis der Gegenverkehr vorbei ist, dann Überholen mit 1,5 m Abstand
    const yA = 1.625, yU = -1.3, xU0 = 48, xU1 = 90;
    const pts = [[X0, yA], [xU0, yA]].concat(bezier([xU0, yA], [xU0 + 6, yA], [xU0 + 6, yU], [xU0 + 12, yU], 12)).concat([[xU1, yU]])
      .concat(bezier([xU1, yU], [xU1 + 6, yU], [xU1 + 6, yA], [xU1 + 12, yA], 12)).concat([[X1, yA]]);
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", pts, [[0, 30], [7, 30], [9, 15], [13, 15], [15, 30], [60, 30]], 110, 0, { fokus: true, bremsStand: true });
    const r1 = fahrt("r1", "rad", "#2c5aa0", [[X0, 2.55], [X1, 2.55]], [[0, 15]], 152.3, 0);
    const r2 = fahrt("r2", "rad", "#b3322c", [[X0, 1.55], [X1, 1.55]], [[0, 15]], 152.6, 0);
    const r3 = fahrt("r3", "rad", "#7b8a52", [[X1, -2.4], [X0, -2.4]], [[0, 16]], X1 - 39, 11);
    const tBei = x => tBeiS(fs, sNahe(pts, x, x < xU0 || x > xU1 + 12 ? yA : yU));
    const tZur = tBei(xU1 - 1.5), tEnde = tBei(XE - 14);
    fs.blinker = [{ von: 12.1, bis: 14.2, seite: "links" }, { von: tZur - 0.4, bis: tZur + 1.4, seite: "rechts" }];
    fs.schulter = [{ von: 12.0, bis: 12.9, seite: "links" }, { von: tZur - 1.2, bis: tZur - 0.4, seite: "rechts" }];
    neu({
      id: "fahrradstrasse", plan: ["l_fahrrad"], titel: "Fahrradstraße", kurz: "Die Straße gehört den Radfahrern. Autos nur mit Zusatzzeichen, höchstens Tempo dreißig, Radfahrer nicht gefährden oder behindern",
      dauer: Math.ceil(tEnde + 4.5), strasse: st, kamera: { fokus: "fs", zoom: 13, vor: 0.18, quer: { immer: true, zeige: ["r1", "r2", "r3"], radius: 30, pad: 5 } },
      fahrzeuge: [fs, r1, r2, r3],
      phasen: [
        { t: 0.2, titel: "Beginn der Fahrradstraße", text: "Schau mal, hier beginnt eine Fahrradstraße. Sie ist für Radfahrer da. Mit dem Auto darfst du nur hinein, weil darunter Kraftfahrzeuge frei steht.", regel: "Zeichen 244.1 StVO", frage: { text: "Darfst du mit dem Auto in eine Fahrradstraße fahren?", optionen: ["Ja, ich darf immer hinein", "Ich darf nur hinein, wenn ein Zusatzzeichen das erlaubt", "Nein, ich darf nie hinein"], richtig: 1, erklaerung: "Außer Fahrrädern und Elektrorollern dürfen andere Fahrzeuge die Fahrradstraße nur benutzen, wenn ein Zusatzzeichen das erlaubt." } },
        { t: 2.6, titel: "Anlieger frei oder Kraftfahrzeuge frei", text: "Steht dort Anlieger frei, darfst du nur hinein, wenn du hier ein Ziel hast. Zum Beispiel, wenn du hier wohnst oder jemanden besuchst. Kraftfahrzeuge frei erlaubt auch die Durchfahrt.", regel: "Zeichen 244.1 mit Zusatzzeichen", frage: { text: "Unter dem Schild steht Anlieger frei. Du willst nur abkürzen. Darfst du hineinfahren?", optionen: ["Ja, ich darf, das gilt für alle", "Nein, ich darf nur hinein, wenn ich dort ein Ziel habe", "Ja, ich darf, wenn ich langsam fahre"], richtig: 1, erklaerung: "Anlieger frei heißt, nur wer dort ein Ziel hat, darf hineinfahren. Bei Kraftfahrzeuge frei dürfen alle Kraftfahrzeuge auch durchfahren." } },
        { t: 5.6, titel: "Tempo dreißig, nebeneinander erlaubt", text: "Hier gilt für alle höchstens Tempo dreißig. Radfahrer dürfen nebeneinander fahren. Du darfst sie weder gefährden noch behindern. Wenn nötig, fährst du noch langsamer.", regel: "Zeichen 244.1 StVO", frage: { text: "Die beiden Radfahrer fahren nebeneinander. Dürfen sie das?", optionen: ["Nein, sie müssen hintereinander fahren", "Ja, in der Fahrradstraße dürfen sie das", "Nur wenn kein Auto kommt"], richtig: 1, erklaerung: "In der Fahrradstraße ist das Nebeneinanderfahren mit Fahrrädern erlaubt. Du passt dich an und fährst wenn nötig langsamer." } },
        { t: 9.4, titel: "Gegenverkehr, noch nicht überholen", text: "Von vorn kommt ein Radfahrer. Zum Überholen ist jetzt kein Platz. Du bleibst mit Abstand hinter den beiden und passt dein Tempo an.", regel: "§ 5 Abs. 2 StVO" },
        { t: 12.2, titel: "Überholen mit Abstand", text: "Jetzt ist frei. Spiegel, Blinker links, Schulterblick. Dann überholst du mit mindestens eineinhalb Metern Abstand zu den Radfahrern.", regel: "§ 5 Abs. 4 StVO", frage: { text: "Wie viel Seitenabstand brauchst du innerorts, wenn du Radfahrer überholst?", optionen: ["Ich denke, mindestens einen halben Meter", "Ich denke, mindestens eineinhalb Meter", "Ich denke, mindestens drei Meter"], richtig: 1, erklaerung: "Beim Überholen von Radfahrern brauchst du innerorts mindestens eineinhalb Meter Seitenabstand, außerorts mindestens zwei Meter." } },
        { t: tEnde, titel: "Ende der Fahrradstraße", text: "Hier endet die Fahrradstraße, das Schild ist durchgestrichen. Ab hier gelten wieder die üblichen Regeln. Auf Radfahrer achtest du natürlich weiter.", regel: "Zeichen 244.2 StVO" }
      ]
    });
  })();

  // ============================================================ 3. Verkehrsberuhigter Bereich (Zeichen 325.1 / 325.2)
  (function () {
    const g = 2.5, b = 3.25, W = 5.75, YQ = -21.25, yE = YQ + b, YB = 8;   // Querstraße (Mitte YQ), Bereich zwischen yE (Nordrand) und YB (Beginn)
    const st = { flaechen: [], linien: [], objekte: [], bordsteine: [], schilder: [] };
    st.flaechen.push({ art: "gruen2", zeigen3d: true, poly: rect(-60, -60, 60, 90) },
      { art: "gehweg", poly: rect(-60, YQ - b - g, 60, yE + g) }, { art: "asphalt", poly: rect(-60, YQ - b, 60, yE) },
      { art: "gehweg", poly: rect(-b - g, YB, b + g, 90) }, { art: "asphalt", poly: rect(-b, YB, b, 90) },
      { art: "pflaster", poly: rect(-W, yE, W, YB) }, { art: "parken", poly: rect(-W, -13.5, -W + 2.2, -6) });
    st.linien.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-W + 2.2, -13.5], [-W + 2.2, -6]] });
    leit(st, [[-60, YQ], [60, YQ]]);
    st.bordsteine.push({ pts: [[-60, YQ - b], [60, YQ - b]], seite: -1 }, { pts: [[-60, yE], [-W, yE]], seite: 1 }, { pts: [[W, yE], [60, yE]], seite: 1 },
      { pts: [[-b, 90], [-b, YB]], seite: 1 }, { pts: [[b, YB], [b, 90]], seite: 1 });
    haeuser(st.objekte, [[-12, -9, 10, 11, 8, "#e3d7c3"], [-12, 3, 10, 9, 7], [12, -10, 10, 10, 7, "#cdd3d8", "#6d5a4a"], [12, 2, 10, 9, 9], [-14, 22, 10, 10, 8, "#d4c7b6"], [14, 22, 10, 10, 7, "#e3d7c3", "#8a4a36"],
      [-20, -34, 12, 9, 8], [4, -34, 12, 9, 7, "#cdd3d8"], [28, -34, 12, 9, 8, "#e3d7c3"]]);
    baeume(st.objekte, [[4.6, -9.5, 1.1], [-4.7, 1.5, 1.1], [24, -13, 1.8], [-26, -12, 1.8]]);
    Object.assign(st, { bereich: [-60, 60], boden: "#6a9a52", boden3d: "#6f9a55" });
    st.schilder.push({ typ: "z325_1", x: b + 0.5, y: YB + 0.5, aussen: [1, 0], blick: [0, 1] }, { typ: "z325_2", x: -b - 0.5, y: YB + 0.5, aussen: [-1, 0], blick: [0, -1] },
      { typ: "z325_2", x: W + 0.5, y: yE + 2.8, aussen: [1, 0], blick: [0, 1] }, { typ: "z325_1", x: -W - 0.5, y: yE + 2.8, aussen: [-1, 0], blick: [0, -1] });
    // Fahrschule: Schrittgeschwindigkeit, hält für Kind mit Ball, am Ende Vorrang der anderen (§ 10), dann rechts auf die Querstraße
    const xF = 1.4, yO = YQ + 1.625, r = 4, yHaltE = yE + 2.25;
    const pts = [[xF, 90], [xF, yO + r]].concat(bogen(xF + r, yO + r, r, PI, 1.5 * PI, 10)).concat([[60, yO], [200, yO]]);
    const yBall = -5, S0 = 57, sBall = sNahe(pts, xF, yBall + 4 + 2.25), sAus = sNahe(pts, xF, yHaltE), sB = 90 - YB;
    const mk = (b1, b2) => fahrt("fs", "fahrschule", "#f2f2ee", pts, fahrplan({ vMax: 25, v0: 25, a: 1.4, grenzen: [{ von: sB - 7, bis: sAus + 2, v: 7 }], halte: [{ s: sBall, bis: b1 }, { s: sAus, bis: b2 }], dauer: 60, s0: S0 }), S0, 0, { fokus: true, bremsStand: true });
    const tB0 = tBeiS(mk(99, 99), sBall - 0.4), tBall = tB0 - 1.6;
    const ball = fahrt("ball", "ball", "#e8402a", [[-4.4, yBall], [W - 0.6, yBall + 0.3]], [[0, 0], [tBall, 0], [tBall + 0.1, 11], [tBall + 2.6, 9], [tBall + 3.4, 0], [99, 0]], 0, 0, {});
    const kind = fahrt("kd", "kind", "#ff8a00", [[-4.8, yBall + 0.9], [-3.6, yBall + 0.4], [W - 1.2, yBall + 0.2]], [[0, 0], [tBall + 0.5, 0], [tBall + 0.8, 7.5], [tBall + 4.6, 7.5], [tBall + 5.2, 0], [99, 0]], 0, 0, { gr: 2.2, rand: true });
    const tKind = tBall + 4.6, go1 = tKind + 0.8;
    const fs1 = mk(go1, 99), tAus = tBeiS(fs1, sAus - 0.4);
    const fg = fahrt("fg", "fussgaenger", "#2f7de1", [[-2.8, yE + 1], [-2.8, YB - 3], [-4.5, YB], [-4.5, 40]], [[0, 0], [go1 - 3, 0], [go1 - 2.8, 4.5], [99, 4.5]], 0, 0, { gr: 2.4, rand: true });
    const tLinks = tAus + 1.6, tRechts = tAus + 3.4, vQ = 30 / 3.6;
    const bl = fahrt("b", "pkw", "#2c5aa0", [[-150, yO], [150, yO]], [[0, 30]], 150 + xF, tLinks);
    const rt = fahrt("c", "pkw", "#b3322c", [[150, YQ - 1.625], [-150, YQ - 1.625]], [[0, 30]], 150 - xF, tRechts);
    const tGo = tRechts + 6 / vQ + 0.9, fs = mk(go1, tGo);
    fs.blinker = [{ von: tAus - 2, bis: tGo + 5, seite: "rechts" }]; fs.schulter = [{ von: tGo - 1.0, bis: tGo - 0.2, seite: "rechts" }];
    const parker = parkt("p", "pkw", "#6a7d8f", -W + 1.1, -9.75, -PI / 2);
    const P = (c, X, Y, s) => { c.save(); c.fillStyle = "rgba(255,255,255,.85)"; c.font = `bold ${Math.max(9, 1.4 * s)}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("P", X(-W + 1.1), Y(-5.2)); c.restore(); };
    neu({
      id: "verkehrsberuhigt", plan: ["l_beruhigt"], titel: "Verkehrsberuhigter Bereich", kurz: "Schrittgeschwindigkeit, Fußgänger und spielende Kinder überall. Am Ende haben die anderen Vorrang",
      dauer: Math.ceil(tGo + 6), strasse: st, kamera: { fokus: "fs", zoom: 18, vor: 0.1, quer: { immer: true, zeige: ["kd", "fg", "b", "c"], radius: 22, pad: 4 } },
      fahrzeuge: [fs, ball, kind, fg, bl, rt, parker], overlayUnten: P,
      phasen: [
        { t: 0.2, titel: "Verkehrsberuhigter Bereich", text: "Schau mal, das blaue Schild mit Haus, Kind und Auto. Hier beginnt ein verkehrsberuhigter Bereich. Ab jetzt fährst du nur noch Schrittgeschwindigkeit.", regel: "Zeichen 325.1 StVO", frage: { text: "Wie schnell darfst du im verkehrsberuhigten Bereich fahren?", optionen: ["Ich fahre höchstens dreißig", "Ich fahre Schrittgeschwindigkeit", "Ich fahre höchstens zwanzig"], richtig: 1, erklaerung: "Im verkehrsberuhigten Bereich fährst du Schrittgeschwindigkeit, also etwa so schnell, wie ein Mensch geht." } },
        { t: tBall - 0.2, titel: "Kinder dürfen überall spielen", text: "Kinder dürfen hier überall spielen, auch mitten auf der Straße. Da rollt ein Ball und das Kind läuft hinterher. Du hältst an und wartest.", regel: "Zeichen 325.1 StVO", frage: { text: "Ein Ball rollt vor dir über die Straße, ein Kind läuft hinterher. Was tust du?", optionen: ["Ich hupe, damit das Kind stehen bleibt", "Ich halte an und warte", "Ich fahre langsam um das Kind herum"], richtig: 1, erklaerung: "Du darfst Fußgänger weder gefährden noch behindern. Wenn nötig, wartest du." } },
        { t: go1 - 0.4, titel: "Fußgänger auf der ganzen Breite", text: "Fußgänger dürfen hier die ganze Straße benutzen. Du darfst sie weder gefährden noch behindern. Wenn nötig, wartest du. Sie dürfen dich aber auch nicht unnötig aufhalten.", regel: "Zeichen 325.1 StVO" },
        { t: go1 + 4.2, titel: "Parken nur auf markierten Flächen", text: "Parken darfst du hier nur auf den gekennzeichneten Flächen, wie links mit dem P. Sonst darfst du nur kurz halten, zum Einsteigen, Aussteigen, Beladen und Entladen auch länger.", regel: "Zeichen 325.1 StVO", frage: { text: "Darfst du im verkehrsberuhigten Bereich vor einem Haus parken?", optionen: ["Ja, ich darf überall parken", "Nein, parken darf ich nur auf gekennzeichneten Flächen", "Ja, ich darf, wenn ich den Warnblinker einschalte"], richtig: 1, erklaerung: "Außerhalb der gekennzeichneten Flächen darfst du nicht parken. Kurz halten darfst du, zum Einsteigen und Aussteigen oder Beladen und Entladen auch länger." } },
        { t: tAus - 1.6, titel: "Ende, die anderen haben Vorrang", text: "Am Ende steht das Schild mit dem roten Strich. Fährst du jetzt auf die Straße, haben alle anderen Vorrang. Auch das Auto von links.", regel: "Zeichen 325.2 · § 10 StVO", frage: { text: "Du fährst aus dem verkehrsberuhigten Bereich, ein Auto kommt von links. Wer darf zuerst?", optionen: ["Ich, es gilt rechts vor links", "Das Auto von links, ich muss alle durchlassen", "Wer zuerst da ist"], richtig: 1, erklaerung: "Wer aus einem verkehrsberuhigten Bereich auf die Straße fährt, muss so fahren, dass niemand gefährdet wird. Rechts vor links gilt hier nicht." } },
        { t: tRechts + 0.9, titel: "Erst wenn beide Seiten frei sind", text: "Auch von rechts kommt noch ein Auto. Du wartest, bis beide Seiten frei sind. Dann biegst du rechts ab und kommst zügig auf Tempo.", regel: "§ 10 StVO" }
      ]
    });
  })();

  // ============================================================ 4. Verbot der Einfahrt (Zeichen 267) und Verbot für Fahrzeuge aller Art (Zeichen 250)
  (function () {
    const R = 6, g = 2.5, b = 3.25, XK = 30, bS = 2.75, XT = 100, bT = 3.25;
    // Hauptstraße Ost-West; bei XK: Süd-Arm = Ende einer Einbahnstraße (Verkehr nur nach Norden), Nord-Arm = gesperrt für Fahrzeuge aller Art; bei XT: normale Straße nach Süden
    const st = netz([-90, -90, 150, 90], [
      [-90, -90, XK - bS, -b, [0, 0, R, 0]], [XK + bS, -90, 150, -b, [0, 0, 0, R]],
      [-90, b, XK - bS, 90, [0, R, 0, 0]], [XK + bS, b, XT - bT, 90, [R, R, 0, 0]], [XT + bT, b, 150, 90, [R, 0, 0, 0]]
    ], g);
    leit(st, [[-90, 0], [XK - 11, 0]], [[XK + 11, 0], [XT - 12, 0]], [[XT + 12, 0], [150, 0]], [[XT, 12], [XT, 90]]);
    haeuser(st.objekte, [[0, -16, 12, 10, 8], [16, -16, 10, 10, 7, "#e3d7c3"], [46, -16, 10, 10, 9, "#cdd3d8", "#6d5a4a"], [64, -16, 12, 10, 7], [86, -16, 10, 10, 8, "#e3d7c3", "#8a4a36"], [116, -16, 12, 10, 7],
      [0, 16, 12, 10, 7, "#d4c7b6"], [16, 18, 9, 10, 8], [48, 16, 10, 10, 7, "#e3d7c3"], [66, 16, 12, 10, 8, "#cdd3d8"], [84, 18, 9, 10, 7], [118, 16, 12, 10, 8, "#d4c7b6", "#6d5a4a"]]);
    baeume(st.objekte, [[-20, 5.9, 1.5], [56, 5.9, 1.5], [124, -5.9, 1.5], [-10, -5.9, 1.5]]);
    st.flaechen.push({ art: "sperr", poly: rect(XK - bS, -40, XK + bS, -38.5) });                 // Sperre weiter hinten im gesperrten Nord-Arm
    st.schilder.push(
      { typ: "z267_rad", x: XK - bS - 0.5, y: b + R + 1, aussen: [-1, 0], blick: [0, -1] }, { typ: "z267_rad", x: XK + bS + 0.5, y: b + R + 1, aussen: [1, 0], blick: [0, -1], links: true },
      { typ: "z250", x: XK + bS + 0.5, y: -b - R - 1, aussen: [1, 0], blick: [0, 1] }, { typ: "z250", x: XK - bS - 0.5, y: -b - R - 1, aussen: [-1, 0], blick: [0, 1], links: true });
    // Fahrschule: wollte zuerst rechts abbiegen, erkennt das Verbot, fährt geradeaus und biegt bei XT rechts ab
    const yA = 1.625, cx = XT - bT - R, cy = b + R, rr = cy - yA, xS = cx + rr;
    const pts = [[-150, yA], [cx, yA]].concat(bogen(cx, cy, rr, -PI / 2, 0, 12)).concat([[xS, 90]]);
    const sT = sNahe(pts, cx, yA), S0 = 130;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", pts, fahrplan({ vMax: 30, v0: 20, a: 1.4, grenzen: [{ von: 0, bis: sNahe(pts, XK + 6, yA), v: 20 }, { von: sT - 14, bis: sT + 14, v: 13 }], dauer: 40, s0: S0 }), S0, 0, { fokus: true, bremsStand: true });
    const tbx = x => tBeiS(fs, sNahe(pts, x, yA));
    // Radfahrer: darf mit Zusatzzeichen in die Einbahnstraße gegen die Fahrtrichtung; blaues Auto kommt dort richtig heraus und biegt links ab
    const yR = 2.6, rcx = XK - bS - R, rcy = b + R, rrr = rcy - yR, xRad = rcx + rrr;
    const radPts = [[-150, yR], [rcx, yR]].concat(bogen(rcx, rcy, rrr, -PI / 2, 0, 10)).concat([[xRad, 90]]);
    const rad = fahrt("rad", "rad", "#2c5aa0", radPts, [[0, 15], [4, 15], [5.2, 11], [7.5, 11], [8.5, 15], [40, 15]], 155, 0);
    const xB = XK + 1.35, blPts = [[xB, 90], [xB, 9]].concat(bezier([xB, 9], [xB, 2], [XK - 2, -1.625], [XK - 9, -1.625], 14)).concat([[-150, -1.625]]);
    const bl = fahrt("b", "pkw", "#2c5aa0", blPts, [[0, 18], [1.2, 18], [2.4, 14], [5, 14], [7, 28], [40, 30]], 90 - 15, 0, { blinker: [{ von: 0, bis: 4.2, seite: "links" }] });
    const tAus = 3.0, pRad = 5.4, tKreuz = Math.max(pRad + 2.4, tbx(XK - 12)), tWeiter = Math.max(tKreuz + 2.6, tbx(XK + 22));
    fs.blinker = [{ von: 0.3, bis: tAus, seite: "rechts" }, { von: tWeiter, bis: tbx(cx) + 4, seite: "rechts" }];
    fs.schulter = [{ von: tbx(cx) - 1.6, bis: tbx(cx) - 0.7, seite: "rechts" }];
    neu({
      id: "einfahrt_verboten", plan: ["l_einfahrt"], titel: "Verbot der Einfahrt", kurz: "Rund, rot mit weißem Balken: hier nicht hineinfahren. Rund, weiß mit rotem Rand: gesperrt für alle Fahrzeuge",
      dauer: Math.ceil(tbx(cx) + 7), strasse: st, kamera: { fokus: "fs", zoom: 12, vor: 0.18, quer: { immer: true, zeige: ["rad", "b"], radius: 32, pad: 5 } },
      fahrzeuge: [fs, rad, bl],
      phasen: [
        { t: 0.2, titel: "Das Schild Verbot der Einfahrt", text: "Du willst rechts in die nächste Straße. Aber schau, dort steht ein rundes rotes Schild mit weißem Balken. Das heißt Verbot der Einfahrt. Hier darfst du nicht hinein.", regel: "Zeichen 267 StVO", frage: { text: "Was bedeutet das runde rote Schild mit dem weißen Balken?", optionen: ["Ich darf hier nicht hineinfahren", "Ich darf hier nur kurz halten", "Ich habe hier Vorfahrt"], richtig: 0, erklaerung: "Das Schild heißt Verbot der Einfahrt. Mit einem Fahrzeug darfst du hier nicht hineinfahren." } },
        { t: tAus - 0.4, titel: "Ende einer Einbahnstraße", text: "Das Schild steht oft am Ende einer Einbahnstraße. Von dort kommt dir der Verkehr entgegen, wie das blaue Auto. Mach den Blinker gleich aus, sonst verlässt sich jemand darauf.", regel: "Zeichen 267 StVO" },
        { t: pRad, titel: "Radverkehr frei", text: "Unter dem Schild steht ein Zusatzzeichen, Radverkehr frei. Darum darf der Radfahrer hier hineinfahren. Für dich mit dem Auto gilt das Verbot weiter.", regel: "Zeichen 267 mit Zusatzzeichen", frage: { text: "Der Radfahrer biegt in die Straße mit dem Verbot der Einfahrt ein. Darf er das?", optionen: ["Nein, das Verbot gilt für alle", "Ja, das Zusatzzeichen erlaubt es dem Radverkehr", "Nur wenn er klingelt"], richtig: 1, erklaerung: "Mit dem Zusatzzeichen Radverkehr frei dürfen Radfahrer hineinfahren. Für alle anderen Fahrzeuge gilt das Verbot." } },
        { t: tKreuz, titel: "Verbot für Fahrzeuge aller Art", text: "Links steht ein anderes Schild, weiß mit rotem Rand. Das ist Verbot für Fahrzeuge aller Art. Da darf kein Fahrzeug hinein, auch kein Fahrrad. Schieben darfst du Fahrrad und Motorrad.", regel: "Zeichen 250 StVO", frage: { text: "Was ist der Unterschied zwischen den beiden runden Schildern?", optionen: ["Ich denke, es gibt keinen Unterschied", "Das weiße sperrt die Straße für alle Fahrzeuge, das rote verbietet nur die Einfahrt von hier", "Das weiße gilt nur für Lastwagen"], richtig: 1, erklaerung: "Beim Verbot der Einfahrt fährt der Verkehr aus der anderen Richtung normal. Beim Verbot für Fahrzeuge aller Art ist die Straße für alle Fahrzeuge gesperrt. Fahrräder und Krafträder dürfen dort geschoben werden." } },
        { t: tWeiter, titel: "Wo das Schild oft steht", text: "Das Verbot der Einfahrt findest du oft am Ende von Einbahnstraßen, an Autobahnausfahrten und an Ausfahrten von Parkplätzen. Du fährst geradeaus weiter und biegst erst an der nächsten Straße rechts ab.", regel: "Zeichen 267 StVO", frage: { text: "Wo findest du das Verbot der Einfahrt oft?", optionen: ["Am Ende einer Einbahnstraße", "Vor jeder Schule", "An jedem Zebrastreifen"], richtig: 0, erklaerung: "Am Ende einer Einbahnstraße verhindert das Schild, dass jemand falsch herum hineinfährt." } }
      ]
    });
  })();
})();
