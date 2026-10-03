// Abend 3 · C6: Lernziele, Kapitel 1 Dauerbremsen, Kapitel 2 Bremsweg und Fading
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, steps, svgImg, chapter, lkw, motion } = require('../gs');
const { icon } = require('../lib');

sec('c6', 'LEKTION C6', C.bl, 'bg_kap.jpg');
sec('c6d', 'C6  ·  DAUERBREMSEN', C.or, 'bg_or.jpg');
sec('c6w', 'C6  ·  BREMSWEG UND FADING', C.red, 'bg_red.jpg');

module.exports = async (deck) => {
  // ===== LERNZIELE C6 =====
  {
    const s = base(deck, 'c6', { transition: 'black', notes:
      '▶ Sagen: „Willkommen zurück. In C6 geht es darum, wie ihr die Bremse im Alltag schont und prüft: Dauerbremsen, Bremsweg, ABS, Kontrolle – und wer den Lkw regelmäßig untersucht.“\n' +
      '🖱 Klick 1–6: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: die Dauerbremsen.“' });
    kick(s, 'Lektion C6 · Dauerbremsen, Untersuchungen, Begrenzer'); title(s, 'Das lernt ihr in C6');
    const T = [['01', 'Dauerbremsen', 'Motorbremse, Retarder, Grenzen, Glätte', '20 Min', C.or], ['02', 'Bremsweg und Fading', 'Anhalteweg, Gefälle, heiße Bremsen', '15 Min', C.red], ['03', 'ABS', 'Funktion, Kontrollleuchte, richtig bremsen', '10 Min', C.bl], ['04', 'Kontrolle', 'Abfahrtkontrolle, Dichtheit, Bremsprobe', '15 Min', C.pu], ['05', 'HU und SP', 'Fristen, Plakette, Mängel, Bußgelder', '15 Min', 'C9A227'], ['06', 'Begrenzer und Fahrtenschreiber', '90 km/h, Einbauschild, Prüfungen', '10 Min', C.gr]];
    for (let i = 0; i < 6; i++) {
      const y = 1.95 + i * 0.76;
      card(s, 0.7, y, 11.93, 0.66, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.66, size: 24, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.66, size: 19, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.66, size: 17, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nehmt ihr mit“', { x: 0.7, y: 6.6, w: 11.93, h: 0.3, size: 13, italic: true, color: C.dim });
  }

  // ===== KAPITEL 1 DAUERBREMSEN =====
  await chapter(deck, 'c6d', { num: 1, ttl: 'Dauerbremsen', sub: 'Bremsen ohne Verschleiß – damit die Betriebsbremse im Gefälle kühl bleibt.', bg: 'h_titel.jpg', notes:
    '▶ Sagen: „Kapitel 1: die Dauerbremsen. Lange Gefälle wie hier im Gebirge – das ist ihre Aufgabe.“\n🖱 Keine Klicks.\n➜ „Wann ist eine Dauerbremse Pflicht?“' });
  {
    const s = base(deck, 'c6d', { notes:
      '▶ Sagen: „Jeder Lkw über 9 Tonnen zulässiger Gesamtmasse muss eine Dauerbremse haben. Was muss sie können?“\n' +
      '🖱 Klick 1: die Prüfstrecke · Klick 2–4: die Punkte.\n' +
      '✅ § 41 Abs. 15 StVZO: Lkw über 9 t zGM. Voll beladen auf einem Gefälle von 7 % und 6 km Länge 30 km/h halten – nur mit der Dauerbremse. Lkw zwischen 7,5 und 9 t brauchen keine.\n💡 Genau genommen verweist § 41 Abs. 18 bei Lkw über 25 km/h auf das EU-/UN-Bremsenrecht; dort ist die Dauerbremsprüfung für schwere Lkw vorgeschrieben, die schwere Anhänger ziehen dürfen. Für den Unterricht gilt die einfache Regel: über 9 t Dauerbremse.\n' +
      '✅ Prüfungsfrage 2.7.06-234: Motorbremse und Retarder arbeiten ohne nennenswerten Verschleiß. 2.7.06-239: Dauerbremse nutzen, weil verschleißfrei und weil sie die Betriebsbremse entlastet – sie bremst aber NICHT bis zum Stillstand.\n' +
      '➜ „Welche Dauerbremsen gibt es? Zuerst die Motorbremse.“' });
    kick(s, 'Dauerbremsen'); title(s, 'Pflicht über 9 Tonnen');
    // Gefälle-Skizze
    card(s, 0.7, 2.05, 6.4, 4.45, {});
    s.img(await svgImg('<path d="M 0 250 L 600 40 L 600 300 L 0 300 Z" fill="#232A35"/><path d="M 0 250 L 600 40" stroke="#55606F" stroke-width="6"/>', 600, 300, 1), { x: 0.9, y: 3.0, w: 6.0, h: 3.0 }, CLICK);
    await lkw(s, { L: 2.6, axles: [0.42, 1.95], floor: 0.48, boxH: 0.95, r: 0.19, cabTop: 1.22 }, { x: 2.6, gy: 4.63, k: 0.62, rot: -19, anim: { fx: 'fade', dur: 300 } });
    s.text('7 %', { x: 4.7, y: 4.6, w: 1.2, h: 0.5, size: 26, bold: true, color: C.or }, { fx: 'fade', dur: 200 });
    s.text('6 km lang', { x: 4.3, y: 5.4, w: 2.2, h: 0.45, size: 20, bold: true, color: C.txt }, { fx: 'fade', dur: 200 });
    s.text('voll beladen 30 km/h halten – nur mit der Dauerbremse', { x: 0.95, y: 2.2, w: 5.9, h: 0.7, size: 16, bold: true, color: C.or }, { fx: 'fade', dur: 200 });
    s.text('Steigung zur Verdeutlichung überzeichnet', { x: 0.9, y: 6.12, w: 6.0, h: 0.3, size: 12, italic: true, color: C.dim });
    await point(s, 7.35, 2.05, 5.28, 1.4, 'LuWeight', C.or, 'Pflicht:', 'Lkw über 9 t zulässiger Gesamtmasse.', CLICK, { br: true, size: 17 });
    await point(s, 7.35, 3.58, 5.28, 1.4, 'LuShieldCheck', C.gr, 'Verschleißfrei –', 'entlastet die Betriebsbremse. Die bleibt kühl für den Notfall.', CLICK, { br: true, size: 17 });
    await point(s, 7.35, 5.11, 5.28, 1.4, 'LuBan', C.red, 'Bremst nicht bis zum Stand.', 'Bei wenig Tempo wirkt sie kaum – anhalten mit der Betriebsbremse.', CLICK, { br: true, size: 17 });
  }

  // ===== MOTORBREMSE (Morph) =====
  const PY = 3.4;
  await steps(deck, 'c6d', {
    kicker: 'Dauerbremsen', ttl: 'Die Motorbremse',
    ask: { q: 'Warum schaltet man vor dem Gefälle zurück?', a: 'Die Motorbremse wirkt bei hoher Drehzahl am stärksten.', at: 3 },
    list: ['Fahren: Klappe offen', 'Auspuffklappe zu', 'Konstantdrossel dazu', 'Drehzahl hoch halten'],
    caps: [
      'Beim normalen Fahren strömt das Abgas frei durch den Auspuff.',
      'Motorbremse an: Eine Klappe im Auspuff schließt. Der Motor muss gegen den Druck arbeiten – das bremst.',
      'Die Konstantdrossel öffnet ein kleines Ventil im Zylinder. Die zusammengedrückte Luft entweicht – noch mehr Bremswirkung.',
      'Je höher die Drehzahl, desto stärker bremst der Motor. Darum vor dem Gefälle zurückschalten.',
    ],
    notes: [
      '▶ Sagen: „Die Motorbremse nutzt den Motor als Bremse. Beim Fahren strömt das Abgas frei.“\n➜ „Jetzt schaltet ihr die Motorbremse ein.“',
      '▶ „Eine Klappe im Auspuff schließt – die Staudruckbremse. Der Motor muss das Abgas gegen den Druck hinausschieben. Das bremst – aber nicht sehr stark.“\n✅ Auspuffklappe = Staudruckbremse (Herstellerangaben, z. B. Cummins/Jacobs).\n➜ „Darum kommt meist noch etwas dazu.“',
      '▶ „Die Konstantdrossel: Ein kleines Ventil im Zylinderkopf bleibt offen. Die Luft, die der Kolben zusammendrückt, entweicht – die Arbeit fürs Verdichten ist verloren. Das bremst deutlich mehr.“\n💡 Bezeichnungen und Leistung sind herstellerabhängig (z. B. Dekompressionsbremse).\n➜ „Wovon hängt die Bremswirkung ab?“',
      '▶ „Von der Drehzahl. Hohe Drehzahl – viel Bremswirkung. Im großen Gang dreht der Motor zu langsam.“\n✅ Prüfungsfrage 2.7.01-257: Betriebsbremse im Gefälle schonen → rechtzeitig zurückschalten, Dauerbremse benutzen. 2.7.01-127: Gefälle nicht mit getretener Kupplung – sonst fehlt die Motorbremswirkung.\n➜ „Die zweite Dauerbremse: der Retarder.“',
    ],
    legend: 'Schematisch',
    scene: async (s, i) => {
      // Motorblock mit einem Zylinder
      s.rrect(5.8, PY - 1.2, 2.2, 2.4, { fill: '2A1A1E', line: C.red, lw: 2, rr: 0.1, name: '!!mot' });
      s.rect(6.4, PY - 0.9, 1.0, 1.6, { fill: '1A212C', line: '6E7888', lw: 1.5, name: '!!zyl' });
      s.rect(6.45, PY + 0.2, 0.9, 0.4, { fill: 'B8C2CF', name: '!!kolb' });
      const kd = i >= 2;
      s.rect(6.85, PY - 1.2, 0.1, 0.3, { fill: kd ? C.or : '6E7888', name: '!!kdv' });
      if (kd) s.text('Luft entweicht', { x: 6.1, y: PY - 1.75, w: 1.6, h: 0.35, size: 13, bold: true, color: C.or, align: 'center', name: '!!tkd' });
      s.text('Motor', { x: 5.8, y: PY + 1.25, w: 2.2, h: 0.35, size: 14, bold: true, color: C.red, align: 'center', name: '!!tmot' });
      // Auspuff mit Klappe
      s.rect(8.0, PY - 0.25, 4.9, 0.5, { fill: '3C4656', name: '!!rohr' });
      const zu = i >= 1;
      s.rrect(10.2, PY - 0.045, 0.5, 0.09, { fill: zu ? C.or : '9AA6B5', rr: 0.5, rotate: zu ? 90 : 0, name: '!!klappe', glow: zu ? 8 : undefined, glowColor: C.or });
      s.text('Auspuffklappe', { x: 9.6, y: PY + 0.35, w: 1.9, h: 0.35, size: 13, bold: true, color: zu ? C.or : C.dim, align: 'center', name: '!!tkl' });
      // Abgasströmung
      if (!zu) for (let k = 0; k < 3; k++) s.lineS(8.3 + k * 1.5, PY, 9.1 + k * 1.5, PY, { color: C.mut, lw: 3, endArrow: 'triangle', name: '!!g' + k });
      else { s.lineS(8.3, PY, 9.9, PY, { color: C.red, lw: 3, endArrow: 'triangle', name: '!!g0' }); s.text('Druck staut sich', { x: 8.2, y: PY - 0.75, w: 2.0, h: 0.35, size: 13, bold: true, color: C.red, align: 'center', name: '!!tstau' }); }
      // Drehzahl-Balken
      const rpm = [0.45, 0.45, 0.45, 0.85][i];
      s.text('Bremswirkung', { x: 8.2, y: 4.6, w: 2.0, h: 0.32, size: 13, bold: true, color: C.txt, name: '!!tbw' });
      s.rrect(10.2, 4.62, 2.7, 0.3, { fill: '1A212C', line: C.line, rr: 0.15, name: '!!bwbg' });
      const bw = [0.04, 0.35, 0.65, 0.95][i];
      s.rrect(10.23, 4.65, 2.64 * bw, 0.24, { fill: C.or, rr: 0.15, name: '!!bw' });
      s.text('Drehzahl', { x: 8.2, y: 5.1, w: 2.0, h: 0.32, size: 13, bold: true, color: C.txt, name: '!!tdz' });
      s.rrect(10.2, 5.12, 2.7, 0.3, { fill: '1A212C', line: C.line, rr: 0.15, name: '!!dzbg' });
      s.rrect(10.23, 5.15, 2.64 * rpm, 0.24, { fill: C.gr, rr: 0.15, name: '!!dz' });
      if (i === 3) s.text('zurückgeschaltet', { x: 10.2, y: 5.45, w: 2.7, h: 0.32, size: 12, italic: true, color: C.gr, align: 'right', name: '!!tzr' });
    },
  });

  // ===== RETARDER =====
  {
    const s = base(deck, 'c6d', { notes:
      '▶ Sagen: „Der Retarder ist eine zusätzliche Bremse im Antriebsstrang. Ein Rad wirbelt Öl oder Wasser gegen ein feststehendes Rad – die Bewegung wird zu Wärme, das Kühlsystem führt sie ab.“\n' +
      '🖱 Klick 1: Primärretarder · Klick 2: Sekundärretarder · Klick 3: Bedienung · Klick 4: Wärme.\n' +
      '✅ Primärretarder sitzt motorseitig und wirkt auch bei wenig Tempo. Sekundärretarder sitzt am Getriebeausgang – bei wenig Tempo bringt er wenig (eurotransport). Beispiele (Herstellerangaben): ZF-Intarder bis 4.000 Nm, bis zu 90 % der Bremsungen ohne Betriebsbremse; Mercedes Actros Wasserretarder 3.500 Nm.\n' +
      '✅ Wird das Kühlmittel zu heiß, regelt der Retarder zurück (herstellerabhängig).\n' +
      '➜ „Und wann wird die Dauerbremse gefährlich?“' });
    kick(s, 'Dauerbremsen'); title(s, 'Der Retarder');
    const P = [['Motor', 0.7, C.red], ['Getriebe', 4.95, C.pu], ['Gelenkwelle', 9.2, '9AA6B5']];
    for (const [t, x, col] of P) { s.rrect(x, 2.15, 2.4, 1.0, { fill: C.card, line: col, lw: 2, rr: 0.1 }); s.text(t, { x, y: 2.15, w: 2.4, h: 1.0, size: 18, bold: true, color: C.txt, align: 'center', valign: 'middle' }); }
    s.rrect(3.2, 2.35, 1.65, 0.6, { fill: '3A2A12', line: C.or, lw: 2, rr: 0.3 }, CLICK);
    s.text('Primär-retarder', { x: 3.2, y: 2.35, w: 1.65, h: 0.6, size: 12, bold: true, color: C.or, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text('wirkt auch bei wenig Tempo', { x: 2.6, y: 3.25, w: 2.8, h: 0.35, size: 13, color: C.or, align: 'center' }, { fx: 'fade', dur: 200 });
    s.rrect(7.45, 2.35, 1.65, 0.6, { fill: '3A2A12', line: C.or, lw: 2, rr: 0.3 }, CLICK);
    s.text('Sekundär-retarder', { x: 7.45, y: 2.35, w: 1.65, h: 0.6, size: 12, bold: true, color: C.or, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text('bei wenig Tempo schwach', { x: 6.85, y: 3.25, w: 2.8, h: 0.35, size: 13, color: C.or, align: 'center' }, { fx: 'fade', dur: 200 });
    await point(s, 0.7, 3.95, 11.93, 1.1, 'LuSlidersHorizontal', C.or, 'Bedienung:', 'Hebel am Lenkrad in Stufen – oder automatisch mit dem Tempomat bergab (je nach Lkw).', CLICK, { size: 17 });
    await point(s, 0.7, 5.25, 11.93, 1.1, 'LuThermometer', C.red, 'Wärme:', 'Der Retarder macht aus Bewegung Wärme. Wird das Kühlwasser zu heiß, bremst er weniger – Temperatur im Blick behalten.', CLICK, { size: 17 });
  }

  // ===== GLÄTTE =====
  await ask(deck, 'c6d', {
    kicker: 'Dauerbremsen · Glätte', q: 'Glatte Straße, Kurve – und der Retarder steht auf voller Stufe. Was droht?', qsize: 30, ico: 'LuSnowflake',
    answers: [
      ['LuTriangleAlert', 'Die Antriebsachse kann blockieren –', 'die Dauerbremse bremst nur sie. Der Lkw bricht aus, ein Zug kann einknicken.', C.red],
      ['LuSlidersHorizontal', 'Bei Glätte:', 'Dauerbremse auf kleine Stufe oder aus – und nie voll in der Kurve.', C.bl],
      ['LuPlus', 'Betriebsbremse zusätzlich treten?', 'Dann wird die Antriebsachse noch stärker gebremst – Vorsicht.', C.or],
    ],
    notes:
      '▶ Sagen: „Die Dauerbremse wirkt nur auf die Antriebsachse. Auf trockener Straße kein Problem. Auf Glätte schon.“\n' +
      '❓ „Was passiert, wenn nur die Hinterachse bremst und die Straße glatt ist?“\n' +
      '🖱 Klick 1–3: je eine Antwort.\n' +
      '✅ Prüfungsfrage 2.7.06-108: Einknick- und Schleudergefahr besonders groß, wenn der Retarder in der Kurve voll betätigt wird. 2.7.06-230: Dauerbremse an und Betriebsbremse dazu → die Antriebsachse wird stärker abgebremst; die Dauerbremse schaltet NICHT automatisch ab.\n' +
      '💡 Mit ABS wird die integrierte Dauerbremse bei Blockierneigung abgeschaltet (EU-Bremsenrecht) – verlassen darf man sich darauf nicht.\n' +
      '➜ „Und wenn die Dauerbremse im Gefälle nicht reicht?“',
  });
  quiz(deck, 'c6d', {
    kicker: 'Dauerbremsen', q: 'Starkes Gefälle: Trotz Dauerbremse wird der Lkw immer schneller. Was tun?', size: 32,
    opts: ['In einen höheren Gang schalten', 'Mit der Betriebsbremse abbremsen und in einen niedrigeren Gang schalten', 'Die Dauerbremse ausschalten, damit sie nicht überhitzt'], ok: 1,
    why: 'Erst die Geschwindigkeit mit der Betriebsbremse verringern, dann herunterschalten – im kleinen Gang bremsen Motor und Retarder stärker (Prüfungsfrage 2.7.06-236).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Besser: schon vor dem Gefälle den kleinen Gang wählen.\n➜ „Kapitel 2: Bremsweg und Fading.“',
  });

  // ===== KAPITEL 2 BREMSWEG UND FADING =====
  await chapter(deck, 'c6w', { num: 2, ttl: 'Bremsweg und Fading', sub: 'Wie lang der Anhalteweg wirklich ist – und warum heiße Bremsen nachlassen.', ico: 'LuThermometer', notes:
    '▶ Sagen: „Kapitel 2: Wie weit fährt ein Lkw, bis er steht?“\n🖱 Keine Klicks.\n➜ „Rechnen wir es aus.“' });
  // ===== ANHALTEWEG ALS FAHRT (fließend) =====
  {
    const SCm = 0.06, XS = 11.25, RY = 3.05; // Start der Front rechts, Fahrt nach links
    const fr = (d, v, o = {}) => ({ t: { d, v }, ...o });
    const tau = [0.25, 0.5, 0.75, 1].map(x => 35 + 49 * (1 - (1 - x) * (1 - x)));
    await motion(deck, 'c6w', {
      kicker: 'Bremsweg', ttl: 'Bis der Lkw steht', dur: 520, holdDur: 700,
      question: 'Ihr fahrt 80 km/h und seht eine Gefahr. Wie weit fährt der Lkw noch, bis er steht?',
      answer: 'Etwa 85 Meter – fast eine ganze Fußballfeld-Länge.',
      legend: 'Mindest-Bremsverzögerung 5,0 m/s² · gerundet · eigene Rechnung',
      frames: [
        fr(0, 80, { hold: true, cap: 'Gefahr erkannt! Jetzt beginnt die Reaktionszeit.', note: '▶ Sagen: „Ein Lkw mit 80 km/h, vorn eine Gefahr.“\n❓ Frage auf der Folie: „Wie weit fährt er noch, bis er steht?“ – Schätzungen sammeln und an die Tafel schreiben.\n🖱 Klick: Die Fahrt beginnt (läuft von selbst bis zum nächsten Halt).\n➜ „Erst reagiert ihr …“' }),
        fr(11, 80, { cap: 'Reaktion: rund 1 Sekunde – der Lkw fährt ungebremst weiter.' }),
        fr(22, 80, { hold: true, note: '▶ „1 Sekunde Reaktion – bei 80 km/h sind das 22 Meter, ohne dass irgendetwas bremst.“\n🖱 Klick: weiter.\n➜ „Jetzt tretet ihr auf die Bremse – aber …“' }),
        fr(28.5, 80, { cap: 'Die Druckluft braucht bis zu 0,6 Sekunden, bis sie in den Zylindern wirkt.' }),
        fr(35, 80, { hold: true, note: '▶ „… die Druckluft muss erst in die Bremszylinder strömen. Bis zu 0,6 Sekunden – noch einmal 13 Meter.“\n✅ § 41 Abs. 12 StVZO: Ansprech- und Schwellzeit höchstens 0,6 s.\n🖱 Klick: Der Lkw bremst.\n➜ „Und jetzt bremst er.“' }),
        fr(tau[0], 60, { cap: 'Jetzt bremst der Lkw – erst schnell, dann immer langsamer.' }), fr(tau[1], 40), fr(tau[2], 20),
        fr(84, 0, { hold: true, answer: true, cap: 'Bremsweg rund 49 Meter. Zusammen: etwa 85 Meter Anhalteweg.', note: '▶ „Bremsweg rund 49 Meter. Zusammen etwa 85 Meter – fast ein Fußballfeld. Und das mit einer Bremse, die gerade das gesetzliche Minimum schafft, auf trockener Straße.“\n✅ Eigene Rechnung: 80 km/h = 22,2 m/s; Reaktion 1 s = 22 m; 0,6 s = 13 m; Bremsweg v²/(2 · 5,0 m/s²) = 49 m.\n🖱 Keine Animation mehr – nächster Klick: Vergleich mit Gefälle und halbem Tempo.\n➜ „Was ändert sich im Gefälle – und bei halbem Tempo?“' }),
      ],
      scene: async (s, { d, v }) => {
        // Straße
        s.rrect(5.75, RY - 1.35, 7.35, 1.55, { fill: C.road, rr: 0.12, name: '!!road' });
        for (let k = 0; k < 9; k++) s.rrect(5.95 + k * 0.82, RY - 0.6, 0.45, 0.05, { fill: C.mark, rr: 0.5, name: '!!rm' + k });
        // Gefahr links
        s.oval(5.8, RY - 1.2, 0.55, 0.55, { fill: C.red, glow: 8, glowColor: C.red, name: '!!gef' });
        s.text('!', { x: 5.8, y: RY - 1.2, w: 0.55, h: 0.55, size: 22, bold: true, color: C.white, align: 'center', valign: 'middle', name: '!!tgef' });
        // Lkw (Front links) fährt nach links
        const xf = XS - d * SCm;
        await lkw(s, { L: 4.4, axles: [0.62, 3.3], floor: 0.62, boxH: 1.2 }, { x: xf, gy: RY + 0.05, k: 0.42, name: '!!lkwA' });
        // Weg-Balken unter der Straße (von rechts nach links)
        const seg = (nm, from, to, col) => { const a = Math.min(d, to), w = Math.max(0, a - from) * SCm; s.rrect(XS - from * SCm - Math.max(w, 0.02), RY + 0.45, Math.max(w, 0.02), 0.42, { fill: col, ft: w < 0.02 ? 100 : 0, rr: 0.5, name: '!!' + nm }); };
        seg('br', 0, 22, '6E7888'); seg('bs', 22, 35, C.am); seg('bb', 35, 84, C.red);
        const lab = (nm, from, to, txt, col) => s.text(d >= to ? txt : '', { x: XS - to * SCm, y: RY + 0.95, w: (to - from) * SCm, h: 0.35, size: 13, bold: true, color: col, align: 'center', name: '!!' + nm });
        lab('lr', 0, 22, '22 m', C.mut); lab('ls', 22, 35, '13 m', C.am); lab('lb', 35, 84, '49 m', C.red);
        // Tacho und Summe
        s.text(String(v), { x: 11.1, y: 4.55, w: 1.2, h: 0.75, size: 40, bold: true, color: v ? C.txt : C.gr, align: 'right', name: '!!kmh' });
        s.text('km/h', { x: 12.35, y: 4.85, w: 0.8, h: 0.4, size: 15, color: C.mut, name: '!!kmhl' });
        s.text([{ text: 'gefahren: ', options: { color: C.mut } }, { text: Math.round(d) + ' m', options: { bold: true, color: C.txt } }], { x: 5.8, y: 4.65, w: 4.5, h: 0.6, size: 24, name: '!!dist' });
        const L = [['6E7888', 'Reaktion'], [C.am, 'Druckluft wirkt'], [C.red, 'Bremsen']];
        L.forEach(([c, tx], k) => { s.rrect(5.8 + k * 2.1, 5.55, 0.28, 0.28, { fill: c, rr: 0.3, name: '!!lg' + k }); s.text(tx, { x: 6.15 + k * 2.1, y: 5.52, w: 1.8, h: 0.34, size: 13, color: C.mut, name: '!!lgt' + k }); });
      },
    });
  }

  // Anhalteweg (Morph, Balken in Metern)
  const SC = 0.075, X0 = 5.9; // Zoll je Meter
  const CASES = [[22, 13, 49, 'eben, 80 km/h'], [22, 13, 59, '8 % Gefälle, 80 km/h'], [11, 7, 12, 'eben, 40 km/h']];
  await steps(deck, 'c6w', {
    kicker: 'Bremsweg', ttl: 'Drei Fälle im Vergleich',
    list: ['Eben, 80 km/h', 'Im Gefälle', 'Halbes Tempo'],
    caps: [
      'Reaktion 1 Sekunde, dazu braucht die Druckluft bis zu 0,6 Sekunden, bis sie wirkt. Zusammen etwa 85 Meter.',
      'Im Gefälle schiebt die Last mit. Bei 8 % wird der Bremsweg etwa 10 Meter länger.',
      'Halbes Tempo – nur ein Viertel Bremsweg. Der Anhalteweg schrumpft auf etwa 30 Meter.',
    ],
    notes: [
      '▶ Sagen: „Noch einmal als Balken zum Vergleich: Erst die Reaktionszeit – rund 1 Sekunde, das sind 22 Meter. Dann braucht die Druckluft Zeit, bis sie bremst – bis zu 0,6 Sekunden, noch einmal 13 Meter. Dann erst bremst der Lkw – mit der gesetzlichen Mindest-Bremswirkung etwa 49 Meter.“\n✅ Eigene Rechnung mit 5,0 m/s² (Mindestwert nach § 41 Abs. 4 StVZO) und 0,6 s Ansprech- und Schwellzeit (§ 41 Abs. 12). Ergebnis: rund 85 m.\n➜ „Und bergab?“',
      '▶ „Im Gefälle schiebt die Hangabtriebskraft mit. Bei 8 % Gefälle fehlen etwa 0,8 m/s² Verzögerung – aus 49 Metern Bremsweg werden etwa 59.“\n✅ Prüfungsfrage 2.7.01-042: Der Bremsweg verlängert sich im Gefälle und mit schwerer Last – NICHT bei Gegenwind. Eigene Rechnung.\n➜ „Was bringt es, langsamer zu fahren?“',
      '▶ „Der Bremsweg wächst mit dem Quadrat der Geschwindigkeit. Halbes Tempo – ein Viertel Bremsweg.“\n✅ Physik: Bremsweg = v² / (2 · a). Bei 40 km/h: 11 + 7 + 12 = rund 30 m.\n💡 Nasse Bremsen nach langer Standzeit bei Feuchtigkeit: Erste Bremsungen können schwächer sein oder blockieren (2.7.01-040).\n➜ „Und was passiert mit der Bremse auf einer langen Abfahrt?“',
    ],
    legend: 'Gerundete Werte · eigene Rechnung mit Mindest-Bremsverzögerung',
    scene: async (s, i) => {
      const [r, sw, b, lab] = CASES[i];
      const Y = 3.0, H = 0.7;
      s.text(lab, { x: X0, y: 1.6, w: 7, h: 0.45, size: 22, bold: true, color: C.txt, name: '!!lab' });
      s.rect(X0, Y, r * SC, H, { fill: '6E7888', name: '!!r' });
      s.rect(X0 + r * SC, Y, sw * SC, H, { fill: C.am, name: '!!sw' });
      s.rect(X0 + (r + sw) * SC, Y, b * SC, H, { fill: C.red, name: '!!b' });
      s.text(String(r) + ' m', { x: X0, y: Y, w: Math.max(r * SC, 0.6), h: H, size: 14, bold: true, color: C.dark, align: 'center', valign: 'middle', name: '!!tr' });
      s.text(String(sw), { x: X0 + r * SC, y: Y, w: sw * SC, h: H, size: 13, bold: true, color: C.dark, align: 'center', valign: 'middle', name: '!!tsw' });
      s.text(String(b) + ' m', { x: X0 + (r + sw) * SC, y: Y, w: b * SC, h: H, size: 15, bold: true, color: C.dark, align: 'center', valign: 'middle', name: '!!tb' });
      // Legende
      const L = [['6E7888', 'Reaktion (1 s)'], [C.am, 'Druckluft wirkt (bis 0,6 s)'], [C.red, 'Bremsweg']];
      L.forEach(([c, t], k) => { s.rect(X0 + k * 2.45, 4.0, 0.3, 0.3, { fill: c, name: '!!lg' + k }); s.text(t, { x: X0 + 0.38 + k * 2.45, y: 3.97, w: 2.1, h: 0.36, size: 12, color: C.mut, name: '!!lt' + k }); });
      // Summe
      const tot = r + sw + b;
      s.text([{ text: 'Anhalteweg ', options: { color: C.mut } }, { text: 'etwa ' + (Math.round(tot / 5) * 5) + ' m', options: { bold: true, color: C.txt } }], { x: X0, y: 4.65, w: 7, h: 0.6, size: 28, name: '!!sum' });
      s.lineS(X0, 2.75, X0 + tot * SC, 2.75, { color: C.txt, lw: 1.5, beginArrow: 'triangle', endArrow: 'triangle', name: '!!pf' });
    },
  });

  // ===== FADING (fließend: Scheibe dreht sich und wird heiß) =====
  {
    const DX = 8.2, DY = 3.9, R = 1.65;
    let disc = `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="40%" stop-color="#8E99A8"/><stop offset="100%" stop-color="#5F6A79"/></radialGradient></defs><circle cx="200" cy="200" r="196" fill="url(#g)" stroke="#3C4656" stroke-width="6"/><circle cx="200" cy="200" r="86" fill="#2A3342"/>`;
    for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; disc += `<circle cx="${200 + 140 * Math.cos(a)}" cy="${200 + 140 * Math.sin(a)}" r="9" fill="#2C3440"/>`; }
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + 0.15; disc += `<circle cx="${200 + 60 * Math.cos(a)}" cy="${200 + 60 * Math.sin(a)}" r="11" fill="#9AA6B5"/>`; }
    const discImg = await svgImg(disc, 400, 400, 1.2);
    const fr = (t, o = {}) => ({ t, ...o });
    await motion(deck, 'c6w', {
      kicker: 'Fading', ttl: 'Wenn die Bremse nachlässt', dur: 500, holdDur: 700,
      question: 'Ein langer Pass, die ganze Zeit nur die Fußbremse. Was passiert mit der Bremse?',
      answer: 'Sie wird so heiß, dass sie schlechter greift – die Bremswirkung lässt gefährlich nach (Fading).',
      legend: 'Bremsscheibe · schematisch',
      frames: [
        fr(0, { hold: true, cap: 'Kalte Bremse: Die Beläge greifen voll. Die Bremse wirkt wie sie soll.', note: '▶ Sagen: „Hier eine Bremsscheibe. Kalt bremst sie mit voller Kraft.“\n❓ Frage auf der Folie vorlesen, Antworten sammeln.\n🖱 Klick: Die Abfahrt beginnt (läuft von selbst).\n➜ „Jetzt fahrt ihr einen langen Pass hinunter – nur mit dem Fuß auf der Bremse.“' }),
        fr(0.15, { cap: 'Langes Gefälle, nur Betriebsbremse: Die Scheibe wird immer heißer …' }), fr(0.3), fr(0.45),
        fr(0.6, { hold: true, note: '▶ „Die ganze Bewegungsenergie wird an der Bremse zu Wärme. Ohne Dauerbremse wird sie immer heißer.“\n🖱 Klick: weiter.\n➜ „Und dann?“' }),
        fr(0.75, { cap: 'Sehr heiß: Belag und Scheibe greifen schlechter – die Wirkung lässt nach.' }), fr(0.88),
        fr(1, { hold: true, answer: true, cap: 'Fading! Gegenmittel: vor dem Gefälle zurückschalten und die Dauerbremse arbeiten lassen.', note: '▶ „Die Reibung zwischen Belag und Scheibe sinkt, Trommeln dehnen sich aus – die Bremse wird schwach. Das heißt Fading.“\n✅ Prüfungsfrage 2.7.06-310 (Lastzug-Frage, gilt sinngemäß auch für C): Wird im langen Gefälle ständig nur mit der Betriebsbremse gebremst, werden die Radbremsen so heiß, dass die Bremswirkung gefährlich nachlässt.\n💡 Nach Fading: anhalten, abkühlen lassen, Lkw mit Keilen sichern.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Wie fahrt ihr bergab richtig?“' }),
      ],
      scene: async (s, t) => {
        const heat = ['6E7888', 'B9772F', 'E0702A', 'FF5A2A', 'FF3B30'][Math.min(4, Math.round(t * 4))];
        s.oval(DX - R - 0.08, DY - R - 0.08, (R + 0.08) * 2, (R + 0.08) * 2, { fill: heat, ft: 100 - Math.round(t * 70), name: '!!glut', glow: t > 0.2 ? Math.round(6 + t * 18) : undefined, glowColor: heat });
        s.img(discImg, { x: DX - R, y: DY - R, w: R * 2, h: R * 2, rotate: Math.round(t * 1080) % 360, name: '!!disc' });
        s.oval(DX - R, DY - R, R * 2, R * 2, { fill: heat, ft: 100 - Math.round(t * 62), name: '!!heiss' });
        s.rrect(DX + R - 0.55, DY - 1.0, 0.75, 2.0, { fill: '3C4656', line: '6E7888', rr: 0.3, name: '!!sattel' });
        s.text('Bremssattel', { x: DX + R - 0.6, y: DY + 1.05, w: 1.6, h: 0.3, size: 12, color: C.dim, name: '!!tsat' });
        const W = 1 - Math.max(0, t - 0.45) * 1.18;
        s.text('Temperatur', { x: 10.6, y: 1.75, w: 2.5, h: 0.32, size: 14, bold: true, color: C.txt, name: '!!tt' });
        s.rrect(10.6, 2.1, 2.5, 0.32, { fill: '1A212C', line: C.line, rr: 0.5, name: '!!tbg' });
        s.rrect(10.63, 2.13, Math.max(0.1, 2.44 * (0.1 + t * 0.9)), 0.26, { fill: t < 0.2 ? C.bl : heat, rr: 0.5, name: '!!tv' });
        s.text('Bremswirkung', { x: 10.6, y: 2.7, w: 2.5, h: 0.32, size: 14, bold: true, color: C.txt, name: '!!wt' });
        s.rrect(10.6, 3.05, 2.5, 0.32, { fill: '1A212C', line: C.line, rr: 0.5, name: '!!wbg' });
        s.rrect(10.63, 3.08, 2.44 * W, 0.26, { fill: W > 0.65 ? C.gr : (W > 0.45 ? C.or : C.red), rr: 0.5, name: '!!wv' });
        s.text(t >= 1 ? 'Fading!' : '', { x: 10.6, y: 3.6, w: 2.5, h: 0.6, size: 30, bold: true, color: C.red, name: '!!fad' });
      },
    });
  }
  {
    const s = base(deck, 'c6w', { notes:
      '▶ Sagen: „So fahrt ihr ein langes Gefälle richtig.“\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Faustregel (Lehrbuchwissen): bergab den Gang, den man bergauf bräuchte. Dauerbremse nutzen (2.7.01-257). Betriebsbremse nicht dauernd schleifen lassen – lieber kurz und kräftig bremsen und wieder lösen. Nie im Leerlauf oder mit getretener Kupplung rollen (2.7.01-127).\n' +
      '➜ „Kapitel 3: das ABS.“' });
    kick(s, 'Bremsen bergab'); title(s, 'Lange Gefälle richtig fahren');
    await point(s, 0.7, 2.05, 5.85, 2.0, 'LuArrowDown01', C.pu, 'Vor dem Gefälle zurückschalten', 'Faustregel: den Gang, den ihr bergauf bräuchtet.', CLICK, { br: true, size: 18 });
    await point(s, 6.78, 2.05, 5.85, 2.0, 'LuMountain', C.or, 'Dauerbremse arbeiten lassen', 'Motorbremse und Retarder halten das Tempo.', CLICK, { br: true, size: 18 });
    await point(s, 0.7, 4.25, 5.85, 2.0, 'LuOctagonAlert', C.red, 'Betriebsbremse kurz und kräftig', 'statt lange schleifen lassen – dann wieder lösen und abkühlen lassen.', CLICK, { br: true, size: 18 });
    await point(s, 6.78, 4.25, 5.85, 2.0, 'LuBan', C.red, 'Nie im Leerlauf rollen', 'und nie mit getretener Kupplung – dann fehlt die Motorbremse.', CLICK, { br: true, size: 18 });
  }
};
