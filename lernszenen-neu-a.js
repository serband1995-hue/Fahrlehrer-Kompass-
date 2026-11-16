/* ============================================================================
   Fahrlehrer-Kompass · Lernszenen Block 6 (a): abknickende Vorfahrt, Vorfahrt gewähren,
   Rechtsabbiegen mit Fußgängern, Einfahren aus Grundstück, Ampel Gelb / Rot-Gelb.
   Baut auf lernszenen.js und lernszenen-stadt.js auf. Welt in Metern: x nach Osten, y nach Süden.
   Fahrtrichtung Norden = −π/2, Osten = 0, Süden = π/2, Westen = π.
   ============================================================================ */
(function () {
  "use strict";
  const LZ = window.Lernszenen; if (!LZ || !LZ.bau || !LZ.stadt) return;
  const { KMH, pfad, tempoProfil, bezier, rohPos } = LZ.bau, { route, kreuzung, fahrplan, sNahe, tBeiS } = LZ.stadt;
  const PI = Math.PI;

  // ------------------------------------------------------------ Bausteine
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  function fahrt(id, typ, farbe, punkte, keys, sBei, tBei, extra) {
    const tempo = tempoProfil(keys); let p = pfad(punkte), start = (sBei || 0) - tempo.s(tBei || 0);
    if (start < 0) { const a = p.pts[0], b = p.pts[1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, d = -start + 5; p = pfad([[a.x - (b.x - a.x) / L * d, a.y - (b.y - a.y) / L * d]].concat(punkte)); start += d; }
    return Object.assign({ id, typ, farbe, pfad: p, tempo, start }, extra || {});
  }
  const person = (id, typ, farbe, punkte, keys, extra) => fahrt(id, typ, farbe, punkte, keys, 0, 0, extra);
  const haeuser = (obj, l) => l.forEach(([x, y, a, b, h, f, d]) => obj.push({ art: "haus", x, y, l: a, b, hoehe: h || 7, farbe: f || "#d9cfbf", dach: d || "#a7553f" }));
  const baeume = (obj, l) => l.forEach(([x, y, r]) => obj.push({ art: "baum", x, y, r: r || 2.2 }));
  function stadtK(o) {
    const K = kreuzung(o), d = K.bN + K.g + 8, e = K.bO + K.g + 8;
    haeuser(K.objekte, [[d + 4, e + 3, 11, 9, 9], [d + 18, e + 4, 10, 10, 7, "#e3d7c3", "#8a4a36"], [-d - 4, e + 3, 11, 9, 8, "#cdd3d8", "#6d5a4a"], [-d - 18, e + 3, 10, 9, 10, "#e3d7c3"],
      [d + 4, -e - 3, 11, 9, 8, "#e3d7c3"], [d + 18, -e - 4, 10, 10, 10, "#d4c7b6", "#6d5a4a"], [-d - 4, -e - 3, 11, 9, 7, "#d9cfbf", "#8a4a36"], [-d - 18, -e - 3, 10, 9, 9, "#cdd3d8"]]);
    baeume(K.objekte, [[K.bN + K.g - 0.7, e + 6, 1.6], [-K.bN - K.g + 0.7, -e - 6, 1.6], [d + 10, K.bO + K.g - 0.7, 1.6]]);
    return Object.assign(K, { schilder: [], bereich: [-K.L, K.L], boden: "#6a9a52", boden3d: "#6f9a55" });
  }
  const leit = (K, ...p) => p.forEach(l => K.linien.push({ art: "leit_io", b: 0.12, pts: l }));
  function neu(sz) { sz.kategorie = "innerorts"; LZ.registriere(sz); }

  // ------------------------------------------------------------ eigene Verkehrszeichen (Zeichen 306 + Zusatzzeichen)
  function zusatzSchild(links) {
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    g.save(); g.translate(64, 33); g.rotate(PI / 4); g.fillStyle = "#fff"; g.fillRect(-22, -22, 44, 44); g.strokeStyle = "#333"; g.lineWidth = 2; g.strokeRect(-22, -22, 44, 44); g.fillStyle = "#f4c800"; g.fillRect(-15, -15, 30, 30); g.restore();
    g.fillStyle = "#fff"; g.fillRect(6, 68, 116, 58); g.strokeStyle = "#333"; g.lineWidth = 3; g.strokeRect(6, 68, 116, 58);
    const x1 = links ? 20 : 108; g.lineCap = "butt"; g.lineJoin = "miter";
    g.strokeStyle = "#9a9a9a"; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 98); g.lineTo(64, 74); g.moveTo(links ? 108 : 20, 98); g.lineTo(64, 98); g.stroke();
    g.strokeStyle = "#111"; g.lineWidth = 16; g.beginPath(); g.moveTo(64, 126); g.lineTo(64, 98); g.lineTo(x1, 98); g.stroke();
    return c;
  }
  if (LZ.bau.schildBilder) {
    LZ.bau.schildBilder.z306_zr = zusatzSchild(false); LZ.bau.schildBilder.z306_zl = zusatzSchild(true);
    if (LZ.bau.schildNamen) LZ.bau.schildNamen.z306_zr = LZ.bau.schildNamen.z306_zl = "Zeichen 306 mit Zusatzzeichen · Verlauf der Vorfahrtstraße";
  }

  // ============================================================ 1. Abknickende Vorfahrt
  (function () {
    const K = stadtK({ b: 3.25, R: 6 });
    leit(K, [[0, 90], [0, 12]], [[0, -12], [0, -90]], [[-90, 0], [-12, 0]], [[12, 0], [90, 0]]);
    K.schilder.push({ typ: "z306_zr", x: 4.9, y: 15 }, { typ: "z306_zl", x: 15, y: -4.9 }, { typ: "z205", x: -14, y: 4.9 }, { typ: "z205", x: -4.9, y: -14 });
    const e = 9;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", route("S", "O", { q: 1.625, e, e2: 8, k: 0.5 }), [[0, 30], [3, 26], [5.5, 22], [8, 22], [11, 26], [19, 34]], 70 - e, 5.5, { fokus: true, blinker: [{ von: 1, bis: 11, seite: "rechts" }], schulter: [{ von: 3.6, bis: 4.6, seite: "rechts" }] });
    const bl = fahrt("b", "pkw", "#2c5aa0", route("O", "S", { q: 1.625, e, e2: 8, k: 0.62 }), [[0, 30], [3, 26], [5.8, 20], [8, 22], [11, 26], [19, 34]], 70 - e, 5.8, { blinker: [{ von: 1.6, bis: 11, seite: "links" }] });
    const rot = fahrt("c", "pkw", "#b3322c", route("W", "O", { q: 1.625, e: 10.5 }), [[0, 30], [1.2, 20], [2.6, 0], [10.2, 0], [12.2, 15], [20, 30]], 70 - 10.5, 2.6, { bremsStand: true });
    const gelb = pfad(bezier([0, 8], [0, 0.2], [0.2, 0], [8, 0], 14));                 // gelbes Band: Verlauf der Vorfahrtstraße
    neu({
      id: "abknick", plan: ["a_stadt", "a_30"], titel: "Abknickende Vorfahrtstraße", kurz: "Die Vorfahrtstraße macht eine Kurve: wer ihr folgt, blinkt und hat Vorfahrt",
      dauer: 15, strasse: K, kamera: { fest: [3, 3], zoom: 17, quer: { zeige: ["b", "c"], radius: 40, punkte: [[4.9, 9.6], [4.9, 15]] } },
      fahrzeuge: [fs, bl, rot],
      overlayUnten: (c, X, Y, s) => {
        const P = [[0, 60], [0, 8]].concat(gelb.pts.map(q => [q.x, q.y])).concat([[8, 0], [60, 0]]);
        c.save(); c.globalAlpha = 0.5; c.strokeStyle = "#f4c800"; c.lineWidth = 0.9 * s; c.lineJoin = c.lineCap = "round"; c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); c.restore();
      },
      phasen: [
        { t: 0.2, titel: "Die Vorfahrtstraße knickt ab", text: "Das gelbe Band zeigt die Vorfahrtstraße: Sie führt von Süden nach Osten. Das Zusatzzeichen unter Zeichen 306 zeigt den Verlauf. Wer ihr folgt, hat auch in der Kurve Vorfahrt.", regel: "Zeichen 306 · § 8 Abs. 1 StVO", frage: { text: "Wer hat hier Vorfahrt?", optionen: ["Alle, die dem Verlauf der Vorfahrtstraße folgen", "Wer von rechts kommt", "Wer zuerst da ist"], richtig: 0, erklaerung: "Zeichen 306 mit dem Zusatzzeichen gilt für den ganzen Verlauf: Wer der Vorfahrtstraße folgt, hat Vorfahrt." } },
        { t: 2.8, titel: "Rot muss warten", text: "Rot kommt aus der Seitenstraße (Zeichen 205). Er hat Wartepflicht und lässt erkennen, dass er wartet. Er will geradeaus, gerät damit in den Weg beider Fahrzeuge auf der Vorfahrtstraße.", regel: "§ 8 Abs. 2 StVO", frage: { text: "Rot will geradeaus. Wer muss warten?", optionen: ["Rot, er kommt aus der Seitenstraße", "Die Fahrschule", "Das blaue Auto"], richtig: 0, erklaerung: "Die Fahrzeuge auf der Vorfahrtstraße gehen vor, auch wenn sie abbiegen." } },
        { t: 5.0, titel: "Auch hier: Blinken", text: "Die Fahrschule bleibt auf der Vorfahrtstraße. Die StVO schreibt beim Zusatzzeichen vor: Wer dem Verlauf folgt, muss blinken. Auf Fußgänger besonders achten.", regel: "Zeichen 306 mit Zusatzzeichen", frage: { text: "Die Fahrschule folgt der Vorfahrtstraße nach rechts. Muss sie blinken?", optionen: ["Nein, sie bleibt ja auf der Vorfahrtstraße", "Ja, sie biegt ab", "Nur bei Dunkelheit"], richtig: 1, erklaerung: "Beim Zusatzzeichen (Verlauf der Vorfahrtstraße) gilt: Wer dem Verlauf folgt, muss blinken. Der Blinker zeigt dem Wartepflichtigen, was du vorhast." } },
        { t: 7.4, titel: "Gegenrichtung der Vorfahrtstraße", text: "Das blaue Auto kommt aus Osten und folgt der Vorfahrtstraße nach links, mit Blinker. Auch Blau hat Vorfahrt. Beide bleiben rechts und begegnen sich wie Gegenverkehr.", regel: "Zeichen 306 mit Zusatzzeichen" },
        { t: 10.4, titel: "Jetzt darf Rot", text: "Erst wenn niemand mehr auf der Vorfahrtstraße kommt, fährt Rot los. Beim Einbiegen lieber einmal mehr nach beiden Seiten schauen.", regel: "§ 8 Abs. 2 StVO" }
      ]
    });
  })();

  // ============================================================ 2. Vorfahrt gewähren (Zeichen 205)
  (function () {
    const K = stadtK({ b: 3.25, R: 6, arme: { N: 0, S: 1, O: 1, W: 1 } });
    leit(K, [[-90, 0], [-11, 0]], [[11, 0], [90, 0]]);
    K.linien.push({ art: "leit_io", b: 0.12, pts: [[0, 90], [0, 12]] });
    K.schilder.push({ typ: "z205", x: 4.9, y: 11.5 }, { typ: "z306", x: -12, y: 4.9 }, { typ: "z306", x: 12, y: -4.9 });
    haeuser(K.objekte, [[-9.3, 9.6, 5.6, 5, 2.2, "#cdd3d8", "#6d5a4a"]]);          // Garage: verdeckt die Sicht nach links
    const e = 9;
    const wegF = route("S", "O", { q: 1.625, e, e2: 8, k: 0.5 });
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", wegF, [[0, 30], [3, 14], [5.2, 6], [7, 5], [8, 0], [10.6, 0], [12.4, 12], [18, 28]], 70 - 7.2, 8, { fokus: true, bremsStand: true, blinker: [{ von: 0.5, bis: 15, seite: "rechts" }], schulter: [{ von: 9.7, bis: 10.5, seite: "links" }, { von: 10.1, bis: 10.6, seite: "rechts" }] });
    const bl = fahrt("b", "pkw", "#2c5aa0", [[-150, 1.625], [150, 1.625]], [[0, 45]], 150, 7.6);
    const rt = fahrt("c", "pkw", "#b3322c", [[150, -1.625], [-150, -1.625]], [[0, 40]], 150, 9.2);
    neu({
      id: "vorfahrt_gewaehren", plan: ["l_stop", "a_30"], titel: "Vorfahrt gewähren (Zeichen 205)", kurz: "Langsam herantasten, Sicht prüfen, Querverkehr durchlassen",
      dauer: 18, strasse: K, kamera: { fest: [3, 4], zoom: 17, quer: { zeige: ["b", "c"], radius: 30 } },
      fahrzeuge: [fs, bl, rt],
      phasen: [
        { t: 0.2, titel: "Zeichen 205: Vorfahrt gewähren", text: "Das Dreieck heißt: Vorfahrt gewähren. Anders als beim Stoppschild muss man nicht immer anhalten, aber so langsam heranfahren, dass man jederzeit anhalten kann. Die Garage links verdeckt die Sicht.", regel: "Zeichen 205 · § 8 Abs. 2 StVO", frage: { text: "Was ist der Unterschied zu Zeichen 206 (Stopp)?", optionen: ["Kein Unterschied", "Bei 205 halte ich nur, wenn Verkehr kommt; bei Stopp immer", "Bei 205 habe ich Vorfahrt"], richtig: 1, erklaerung: "Zeichen 206: Anhalten ist immer Pflicht. Zeichen 205: Vorfahrt gewähren, anhalten nur wenn nötig." } },
        { t: 3.2, titel: "Tempo rausnehmen", text: "Früh vom Gas und bremsbereit. Schon jetzt nach links und rechts schauen: Ein Auto kann auch hinter der Garage schon nah sein.", regel: "§ 8 Abs. 2 StVO" },
        { t: 5.4, titel: "Langsam vortasten", text: "Die Sicht nach links ist verdeckt: Schritt für Schritt vorrollen, bis man weit genug sieht, und im Notfall sofort anhalten. Nicht blind einfahren.", regel: "§ 8 Abs. 2 StVO", frage: { text: "Du siehst nach links nichts, weil die Garage im Weg ist. Was tust du?", optionen: ["Gas geben, Vorfahrt wird mir schon gewährt", "Langsam vortasten, bis ich sehen kann", "Hupen und fahren"], richtig: 1, erklaerung: "Wer nicht erkennen kann, ob er die Vorfahrt achten muss, darf sich vorsichtig in die Kreuzung hineintasten." } },
        { t: 7.4, titel: "Querverkehr durchlassen", text: "Von links kommt Blau, gleich danach von rechts Rot. Beide haben Vorfahrt, die Fahrschule steht und lässt beide durch.", regel: "Zeichen 205 · § 8 Abs. 2 StVO", frage: { text: "Von beiden Seiten kommt Verkehr. Wann fahre ich los?", optionen: ["Sobald der erste vorbei ist", "Wenn von beiden Seiten frei ist", "Wenn ich hupe"], richtig: 1, erklaerung: "Erst wenn von links und rechts niemand mehr kommt, den ich behindern würde." } },
        { t: 10.6, titel: "Schulterblick und abbiegen", text: "Jetzt ist frei: Blinker war schon an, noch einmal Schulterblick, dann zügig auf die Straße und Tempo anpassen.", regel: "§ 9 Abs. 1 StVO" }
      ]
    });
  })();

  // ============================================================ 3. Rechtsabbiegen mit Fußgängern
  (function () {
    const K = stadtK({ b: 3.25, R: 6, g: 4 });
    const HL = 16, rot = [[99, "rot"]], gruen = [[99, "gruen"]];
    leit(K, [[0, 90], [0, HL + 1]], [[0, -14], [0, -90]], [[-90, 0], [-14, 0]], [[14, 0], [90, 0]]);
    K.linien.push({ art: "voll", b: 0.5, pts: [[0.1, HL], [3.2, HL]] });
    for (let y = -3.2; y < 3.2; y += 1) K.flaechen.push({ art: "weiss", poly: rect(11.3, y, 11.6, y + 0.5) }, { art: "weiss", poly: rect(14.6, y, 14.9, y + 0.5) });
    K.objekte.push({ art: "ampel", x: 4.4, y: HL + 0.3, h: PI / 2, phasen: gruen }, { art: "ampel", x: -4.4, y: -HL, h: -PI / 2, phasen: gruen },
      { art: "ampel", x: -12.8, y: 4.4, h: PI, phasen: rot }, { art: "ampel", x: 12.8, y: -4.4, h: 0, phasen: rot },
      { art: "ampel", fuss: true, x: 11.5, y: -4.6, h: PI / 2, phasen: gruen }, { art: "ampel", fuss: true, x: 14.7, y: 4.6, h: -PI / 2, phasen: gruen });
    const pts = route("S", "O", { q: 1.625, e: 8.5, e2: 6.5, k: 0.5, L: 22 }), sRand = 22 - 8.5, sStop = sNahe(pts, 8.4, 1.625), T0 = 3.4;
    const mk = bis => fahrt("fs", "fahrschule", "#f2f2ee", pts, fahrplan({ vMax: 20, v0: 0, a: 1.6, grenzen: [{ von: sRand - 12, bis: 999, v: 9 }], halte: [{ s: 0.2, bis: T0 }, { s: sStop, bis }], dauer: 60 }), 0, 0, { fokus: true, bremsStand: true, pfeilDx: -3, pfeilDy: 0.6, pfeilK: 0.7 });
    const tStop = tBeiS(mk(99), sStop - 0.45), tR = tBeiS(mk(99), sRand);
    const v = 1.3, w1 = tStop - 5.5 + 0.6, w2 = w1 + 3, ende2 = w2 + 8.9 / v, tGo = ende2 + 0.6;       // Fußgänger: Weg −7 → +3,4 m, 4,7 km/h
    const fs = mk(tGo); fs.blinker = [{ von: 0.5, bis: tGo + 6, seite: "rechts" }]; fs.schulter = [{ von: tR - 2.2, bis: tR - 1.2, seite: "rechts" }];
    const f1 = person("fg", "fussgaenger", "#2f7de1", [[13.1, -5.5], [13.1, 7]], [[0, 0], [w1, 0], [w1 + 0.2, 4.7], [60, 4.7]], { gr: 2.5, rand: true });
    const f2 = person("kd", "kind", "#ff8a00", [[13.7, -5.5], [13.7, 7]], [[0, 0], [w2, 0], [w2 + 0.2, 4.3], [60, 4.3]], { gr: 2.2, rand: true });
    neu({
      id: "rechts_fussg", plan: ["g_abb1", "g_abb2", "a_stadt"], titel: "Rechtsabbiegen mit Fußgängern", kurz: "Grün gilt auch für die Fußgänger in der Querstraße: sie haben Vorrang",
      dauer: Math.ceil(tGo + 7), strasse: K, kamera: { fest: [9, 3], zoom: 22, quer: { immer: true, zeige: ["fg", "kd"], radius: 70 } },
      fahrzeuge: [fs, f1, f2],
      phasen: [
        { t: 0.2, titel: "Grün für beide", text: "Ich habe Grün und will rechts abbiegen. Die Fußgänger in der Querstraße haben gleichzeitig Grün. Wer abbiegt, lässt sie durch.", regel: "§ 37 Abs. 2 · § 9 Abs. 3 StVO", frage: { text: "Ich habe Grün. Wer hat auf dem Überweg der Querstraße Vorrang?", optionen: ["Ich, ich habe Grün", "Die Fußgänger, die bei Grün gehen", "Wer schneller ist"], richtig: 1, erklaerung: "Beim Abbiegen müssen Fußgänger durchgelassen werden, auch wenn man selbst Grün hat." } },
        { t: Math.max(T0 + 1.6, tR - 2.4), titel: "Schulterblick rechts, langsam", text: "Vor dem Abbiegen: Spiegel, Schulterblick nach rechts (Radfahrer im toten Winkel). Dann sehr langsam abbiegen und schon in der Kurve auf den Überweg achten.", regel: "§ 9 Abs. 1 StVO" },
        { t: tStop - 1.6, titel: "Vor dem Überweg warten", text: "Die ersten Fußgänger sind schon auf dem Überweg. Ich halte davor an und lasse sie in Ruhe gehen. Nicht hupen, nicht drängeln.", regel: "§ 9 Abs. 3 StVO", frage: { text: "Fußgänger sind noch auf dem Überweg. Was tue ich?", optionen: ["Schnell davor vorbeifahren", "Anhalten und sie durchlassen", "Hupen, damit sie schneller gehen"], richtig: 1, erklaerung: "Auf Fußgänger ist besondere Rücksicht zu nehmen; wenn nötig, wird gewartet." } },
        { t: w2 + 1.5, titel: "Auch der Nächste kommt", text: "Ein Kind folgt ein Stück später. Kinder und ältere Menschen sind langsamer. Erst losfahren, wenn wirklich alle drüben sind.", regel: "§ 9 Abs. 3 StVO" },
        { t: tGo - 0.6, titel: "Erst wenn die Furt frei ist", text: "Alle sind auf dem Gehweg. Jetzt noch einmal kurz schauen und langsam anfahren. Auch hier gilt: Fußgänger gehen vor.", regel: "§ 9 Abs. 3 StVO" }
      ]
    });
  })();

  // ============================================================ 4. Einfahren aus Grundstück auf die Straße
  (function () {
    const YS = 4.5, YN = -4.5, st = { flaechen: [], linien: [], objekte: [], bordsteine: [] };
    st.flaechen.push({ art: "gehweg", poly: rect(-80, YN - 3, 80, YS + 3) }, { art: "asphalt", poly: rect(-80, YN, 80, YS) }, { art: "gruen2", poly: rect(-80, YS + 3, 80, YS + 30), zeigen3d: true }, { art: "gruen2", poly: rect(-80, YN - 30, 80, YN - 3), zeigen3d: true },
      { art: "pflaster", poly: rect(-1.6, YS + 3, 1.6, 28) }, { art: "gehweg", poly: rect(-1.6, YS, 1.6, YS + 3) });
    st.linien.push({ art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-80, YS], [-1.6, YS]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[1.6, YS], [80, YS]] }, { art: "voll", b: 0.12, farbe: "#d8d6d0", pts: [[-80, YN], [80, YN]] });
    st.bordsteine.push({ pts: [[-80, YS], [-1.6, YS]], seite: 1 }, { pts: [[1.6, YS], [80, YS]], seite: 1 }, { pts: [[-80, YN], [80, YN]], seite: -1 });
    haeuser(st.objekte, [[-7.5, 13.5, 11, 9, 2.4, "#cdd3d8", "#6d5a4a"], [-22, 15, 10, 9, 7], [12, 15, 9, 8, 6, "#e3d7c3", "#8a4a36"], [26, 15, 10, 9, 7, "#d4c7b6"], [-10, -14, 10, 9, 7, "#e3d7c3"], [10, -14, 10, 9, 8], [28, -14, 10, 9, 7, "#cdd3d8"]]);
    baeume(st.objekte, [[4.3, 8.8, 1.7], [-34, 8, 1.8], [-16, -8, 1.8]]);
    Object.assign(st, { schilder: [], bereich: [-80, 80], boden: "#6a9a52", boden3d: "#6f9a55" });
    const weg = [[0.15, 30], [0.15, 6.2]].concat(bezier([0.15, 6.2], [0.15, 4.0], [1.95, 2.2], [4.15, 2.2], 14)).concat([[150, 2.2]]);
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", weg, [[0, 0], [1.2, 0], [2.8, 7], [4.2, 7], [5.6, 0], [9, 0], [10, 5], [11.6, 5], [12, 0], [15.4, 0], [18, 15], [24, 26]], 19.8, 5.6,
      { fokus: true, bremsStand: true, pfeilDx: -3, pfeilDy: 0.6, pfeilK: 0.7, blinker: [{ von: 0.4, bis: 21, seite: "rechts" }], schulter: [{ von: 0.4, bis: 1.4, seite: "rundum" }, { von: 14, bis: 15.3, seite: "links" }] });
    const ew = person("ew", "fussgaenger", "#ff9f1a", [[2.9, 7.3], [2.9, 6.9]], [[0, 0]], { gr: 2.3, rand: true });
    const ped = person("fg", "fussgaenger", "#2f7de1", [[-9, 5.6], [20, 5.6]], [[0, 4.5]], { gr: 2.5, rand: true });
    const bl = fahrt("b", "pkw", "#2c5aa0", [[-150, 2.2], [150, 2.2]], [[0, 40]], 150, 13.6);
    const rt = fahrt("c", "pkw", "#b3322c", [[150, -2.2], [-150, -2.2]], [[0, 35]], 150, 15.2);
    neu({
      id: "grundstueck", plan: ["g_anfahr", "a_stadt"], titel: "Aus der Einfahrt auf die Straße", kurz: "Vorrang hat der fließende Verkehr, auch Fußgänger auf dem Gehweg",
      dauer: 22, strasse: st, kamera: { fest: [2, 6], zoom: 22, quer: { immer: true, zeige: ["b", "c", "fg", "ew"], radius: 30 } },
      fahrzeuge: [fs, ew, ped, bl, rt],
      phasen: [
        { t: 0.2, titel: "Rundumblick, Blinker", text: "Ich stehe auf dem Grundstück und will auf die Straße. Erst Blinker rechts, dann Rundumblick. Wer so einfährt, darf niemanden gefährden: Der Verkehr auf Gehweg und Straße hat Vorrang.", regel: "§ 10 StVO", frage: { text: "Wer hat Vorrang: ich aus der Einfahrt oder der Verkehr auf Gehweg und Straße?", optionen: ["Ich, ich war zuerst da", "Der fließende Verkehr, auch Fußgänger auf dem Gehweg", "Der, der lauter hupt"], richtig: 1, erklaerung: "Wer aus einem Grundstück einfährt, muss eine Gefährdung anderer ausschließen. Vorrang hat der Verkehr auf Gehweg und Straße." } },
        { t: 2.6, titel: "Sicht verdeckt: Einweiser", text: "Die Mauer links verdeckt den Gehweg, die Straße sehe ich noch nicht. Ich fahre im Schritttempo. Wenn die Sicht schlecht bleibt, lasse ich mich einweisen (hier: der Einweiser steht am Rand, orange).", regel: "§ 10 StVO" },
        { t: 5.6, titel: "Fußgänger auf dem Gehweg", text: "Hinter der Mauer kommt ein Fußgänger. Er geht auf dem Gehweg an der Einfahrt vorbei. Ich halte vor dem Gehweg an und lasse ihn vorbei.", regel: "§ 10 StVO", frage: { text: "Ein Fußgänger kommt auf dem Gehweg an meiner Einfahrt vorbei. Was tue ich?", optionen: ["Vor ihm noch schnell durchfahren", "Anhalten und ihn vorbeilassen", "Hupen"], richtig: 1, erklaerung: "Der Fußgänger hat Vorrang. Das Auto bleibt stehen, bis er vorbei ist." } },
        { t: 9.2, titel: "Langsam vortasten", text: "Der Gehweg ist frei. Jetzt rolle ich ganz langsam bis zur Bordsteinkante vor, bis ich die Straße in beide Richtungen einsehen kann.", regel: "§ 10 StVO" },
        { t: 12.2, titel: "Fließender Verkehr zuerst", text: "Von links kommt Blau, kurz danach von rechts Rot. Beide fahren vorbei, ich warte, bis die Straße in beide Richtungen frei ist.", regel: "§ 10 StVO", frage: { text: "Wann fahre ich auf die Straße?", optionen: ["Wenn die Lücke groß genug ist, dass niemand bremsen muss", "Sobald das erste Auto vorbei ist", "Wenn ich hupe"], richtig: 0, erklaerung: "Niemand darf wegen mir bremsen oder ausweichen müssen. Sonst warte ich." } },
        { t: 14, titel: "Schulterblick links und einfädeln", text: "Frei! Schulterblick links (Radfahrer), nach rechts abbiegen und zügig auf Tempo kommen. Den Blinker erst ausschalten, wenn ich auf der Fahrbahn bin.", regel: "§ 10 · § 9 Abs. 1 StVO" }
      ]
    });
  })();

  // ============================================================ 5. Ampel: Gelb und Rot-Gelb
  (function () {
    const K = stadtK({ b: 3.25, R: 6 }), HL = 14, tY = 3, tRot = tY + 3.2, tCg = tRot + 1.5, tCy = tCg + 2.3, tCr = tCy + 3, tRg = tCr + 1, tG = tRg + 2.2;
    leit(K, [[0, 90], [0, HL + 1]], [[0, -14], [0, -90]], [[-90, 0], [-14, 0]], [[14, 0], [90, 0]]);
    K.linien.push({ art: "voll", b: 0.5, pts: [[0.1, HL], [3.2, HL]] });
    // Phasenlisten: [bis, Farbe]. Fahrtrichtung Nord (S-Zufahrt): Grün bis tY, Gelb bis tRot, Rot bis tRg, Rot-Gelb bis tG, dann Grün. Querverkehr gegengleich.
    const sPh = [[tY, "gruen"], [tRot, "gelb"], [tRg, "rot"], [tG, "rotgelb"], [99, "gruen"]], qPh = [[tCg, "rot"], [tCy, "gruen"], [tCr, "gelb"], [99, "rot"]], gross = 4;
    K.objekte.push({ art: "ampel", k: gross, k3d: 4, x: 4.4, y: HL + 0.3, h: PI / 2, phasen: sPh }, { art: "ampel", k: gross, x: -4.4, y: -HL, h: -PI / 2, phasen: sPh },
      { art: "ampel", k: gross, x: -12.8, y: 4.4, h: PI, phasen: qPh }, { art: "ampel", k: gross, x: 12.8, y: -4.4, h: 0, phasen: qPh });
    const A = 25, tB = 15 / (50 / KMH);                    // Bremsweg 25 m, Reaktionszeit ≈ 1,08 s (15 m bei 50 km/h)
    const vS = 50 / KMH, tD = tY + tB, tStop = tD + vS / (vS * vS / (2 * A));
    const yL = 1.625, yHalt = HL + 5 + 2.25;               // Mitte des Autos beim Halt: 5 m Reserve vor der Haltlinie
    const weg = [[yL, 100], [yL, -100]], sH = 100 - yHalt;
    const fs = fahrt("fs", "fahrschule", "#f2f2ee", weg, [[0, 50], [tD, 50], [tStop, 0], [tG + 0.7, 0], [tG + 3.4, 30], [40, 40]], sH, tStop, { fokus: true, bremsStand: true });
    const bl = fahrt("b", "pkw", "#2c5aa0", weg, [[0, 50]], 100 - (HL + 18 + 2.3), tY);
    const q = fahrt("q", "transporter", "#e7e3d6", [[-150, 1.625], [150, 1.625]], [[0, 40]], 150, tCg + 1.3);
    const yF = rohPos(fs, tY).y - 2.25;                      // Front der Fahrschule beim Umschalten auf Gelb
    function pille(c, x, y, text, s) {                       // Beschriftung links neben dem Streifen, auf dunklem Grund
      c.font = `bold ${Math.max(11, 0.9 * s)}px sans-serif`; c.textAlign = "right"; c.textBaseline = "middle";
      const w = c.measureText(text).width + 14, h = Math.max(11, 0.9 * s) + 8;
      c.fillStyle = "rgba(10,18,14,.88)"; c.fillRect(x - w, y - h / 2, w, h); c.fillStyle = "#fff"; c.fillText(text, x - 7, y + 1);
    }
    neu({
      id: "ampel_gelb", plan: ["g_brems", "a_stadt"], titel: "Ampel: Gelb und Rot-Gelb", kurz: "Bei Gelb vor der Kreuzung halten, wenn es sicher geht. Rot-Gelb ist noch Rot",
      dauer: Math.ceil(tG + 5), strasse: K, kamera: { fokus: "fs", zoom: 8, vor: 0.16, kam3d: { ab: 40, hoch: 11, nick: -0.2, nickF: -0.4, quer: { ab: 46, hoch: 11, nick: -0.14, nickF: -0.35 } }, quer: { immer: true, zeige: ["b", "q"], radius: 45, punkte: [[4.4, 14.3]] } },
      fahrzeuge: [fs, bl, q],
      overlayUnten: (c, X, Y, s, z) => {
        if (z < tY || z > tRg) return;
        c.save(); c.globalAlpha = 0.45; c.fillStyle = "#e53935"; c.fillRect(X(yL - 1.2), Y(yF - 15), 2.4 * s, 15 * s); c.fillStyle = "#f5a623"; c.fillRect(X(yL - 1.2), Y(yF - 40), 2.4 * s, 25 * s); c.globalAlpha = 1;
        pille(c, X(yL - 1.5), Y(yF - 7.5), "Reaktion 15 m", s); pille(c, X(yL - 1.5), Y(yF - 27.5), "Bremsen 25 m", s); c.restore();
      },
      phasen: [
        { t: 0.2, titel: "Grün, aber bremsbereit", text: "Ich fahre mit 50 km/h auf eine Ampel zu. Sie ist noch Grün, aber ich beobachte sie schon: Wie lange ist sie schon Grün? Der Fuß bleibt nah an der Bremse.", regel: "§ 37 Abs. 2 StVO" },
        { t: tY, titel: "Gelb: Entscheidung", text: "Die Ampel springt auf Gelb. Gelb heißt: vor der Kreuzung warten. Ich bin etwa 45 m von der Haltlinie entfernt. Reicht das zum Anhalten?", regel: "§ 37 Abs. 2 StVO", frage: { text: "Gelb, die Haltlinie ist noch etwa 45 m weg, ich fahre 50 km/h. Was tue ich?", optionen: ["Gas geben, ich schaffe es noch", "Bremsen, ich kann sicher anhalten", "Gelb ist wie Grün"], richtig: 1, erklaerung: "Gelb heißt: vor der Kreuzung warten. 45 m reichen hier zum Anhalten." } },
        { t: tY + 2.6, titel: "Blau war schon zu nah", text: "Blau war bei Gelb nur noch etwa 18 m von der Linie weg: Der Anhalteweg reicht nicht, eine Vollbremsung wäre gefährlich. Wer nicht mehr sicher anhalten kann, fährt weiter.", regel: "§ 37 Abs. 2 StVO", frage: { text: "Blau ist bei Gelb nur noch 18 m von der Haltlinie entfernt. Was ist richtig?", optionen: ["Voll bremsen, egal was dahinter passiert", "Weiterfahren, sicheres Anhalten ist nicht mehr möglich", "Noch Gas geben, um schneller drüber zu sein"], richtig: 1, erklaerung: "Nur wer nicht mehr sicher anhalten kann, darf durchfahren. Im Zweifel gilt: bremsen." } },
        { t: tRot + 2.2, titel: "Rot: Halt und Anhalteweg", text: "Die Fahrschule steht vor der Haltlinie, mit 5 m Reserve. Anhalteweg bei 50 km/h: Reaktionsweg etwa 15 m plus Bremsweg etwa 25 m, zusammen etwa 40 m. Der Querverkehr hat jetzt Grün.", regel: "Faustformel: Reaktionsweg (km/h ÷ 10) · 3, Bremsweg (km/h ÷ 10)²", frage: { text: "Wie lang ist der Anhalteweg bei 50 km/h (Faustformel)?", optionen: ["Etwa 15 m", "Etwa 40 m", "Etwa 100 m"], richtig: 1, erklaerung: "(50 ÷ 10) · 3 = 15 m Reaktionsweg plus (50 ÷ 10)² = 25 m Bremsweg: etwa 40 m." } },
        { t: tRg + 0.1, titel: "Rot-Gelb: noch Rot", text: "Rot und Gelb zugleich heißt: gleich wird es Grün, aber ich muss noch warten. Jetzt Kupplung treten und den ersten Gang einlegen, aber noch nicht losfahren.", regel: "§ 37 Abs. 2 StVO", frage: { text: "Die Ampel zeigt Rot-Gelb. Was gilt?", optionen: ["Losfahren, gleich ist Grün", "Noch warten, es ist noch Rot", "Rückwärts fahren"], richtig: 1, erklaerung: "Rot-Gelb gilt noch als Rot. Erst bei Grün darf man fahren." } },
        { t: tG + 0.3, titel: "Grün: anfahren", text: "Grün: einmal links und rechts schauen, ob jemand noch durch will, dann zügig anfahren.", regel: "§ 37 Abs. 2 StVO" }
      ]
    });
  })();
})();
