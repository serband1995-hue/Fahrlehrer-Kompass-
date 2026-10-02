// Abend 3 · C6: Lernziele, Kapitel 1 Dauerbremsen, Kapitel 2 Bremsweg und Fading
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, steps, svgImg, chapter, lkw } = require('../gs');
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
    s.text('+ 5 Min Abschluss: Quiz und „Das nimmst du mit“', { x: 0.7, y: 6.6, w: 11.93, h: 0.3, size: 13, italic: true, color: C.dim });
  }

  // ===== KAPITEL 1 DAUERBREMSEN =====
  await chapter(deck, 'c6d', { num: 1, ttl: 'Dauerbremsen', sub: 'Bremsen ohne Verschleiß – damit die Betriebsbremse im Gefälle kühl bleibt.', bg: 'h_titel.jpg', notes:
    '▶ Sagen: „Kapitel 1: die Dauerbremsen. Lange Gefälle wie hier im Gebirge – das ist ihre Aufgabe.“\n🖱 Keine Klicks.\n➜ „Wann ist eine Dauerbremse Pflicht?“' });
  {
    const s = base(deck, 'c6d', { notes:
      '▶ Sagen: „Jeder Lkw über 9 Tonnen zulässiger Gesamtmasse muss eine Dauerbremse haben. Was muss sie können?“\n' +
      '🖱 Klick 1: die Prüfstrecke · Klick 2–4: die Punkte.\n' +
      '✅ § 41 Abs. 15 StVZO: Lkw über 9 t zGM. Voll beladen auf einem Gefälle von 7 % und 6 km Länge 30 km/h halten – nur mit der Dauerbremse. Lkw zwischen 7,5 und 9 t brauchen keine.\n' +
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
    s.text('Steigung zur Verdeutlichung überzeichnet', { x: 0.9, y: 6.12, w: 6.0, h: 0.3, size: 11, italic: true, color: C.dim });
    await point(s, 7.35, 2.05, 5.28, 1.4, 'LuWeight', C.or, 'Pflicht:', 'Lkw über 9 t zulässiger Gesamtmasse.', CLICK, { br: true, size: 17 });
    await point(s, 7.35, 3.58, 5.28, 1.4, 'LuShieldCheck', C.gr, 'Verschleißfrei –', 'entlastet die Betriebsbremse. Die bleibt kühl für den Notfall.', CLICK, { br: true, size: 17 });
    await point(s, 7.35, 5.11, 5.28, 1.4, 'LuBan', C.red, 'Bremst nicht bis zum Stand.', 'Bei wenig Tempo wirkt sie kaum – anhalten mit der Betriebsbremse.', CLICK, { br: true, size: 17 });
  }

  // ===== MOTORBREMSE (Morph) =====
  const PY = 3.4;
  await steps(deck, 'c6d', {
    kicker: 'Dauerbremsen', ttl: 'Die Motorbremse',
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
      s.rect(10.2, PY - (zu ? 0.24 : 0.04), zu ? 0.08 : 0.6, zu ? 0.48 : 0.08, { fill: zu ? C.or : '9AA6B5', name: '!!klappe', glow: zu ? 8 : undefined, glowColor: C.or });
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
  // Anhalteweg (Morph, Balken in Metern)
  const SC = 0.075, X0 = 5.9; // Zoll je Meter
  const CASES = [[22, 13, 49, 'eben, 80 km/h'], [22, 13, 59, '8 % Gefälle, 80 km/h'], [11, 7, 12, 'eben, 40 km/h']];
  await steps(deck, 'c6w', {
    kicker: 'Bremsweg', ttl: 'Der Anhalteweg',
    list: ['Eben, 80 km/h', 'Im Gefälle', 'Halbes Tempo'],
    caps: [
      'Reaktion 1 Sekunde, dazu braucht die Druckluft bis zu 0,6 Sekunden, bis sie wirkt. Zusammen etwa 85 Meter.',
      'Im Gefälle schiebt die Last mit. Bei 8 % wird der Bremsweg etwa 10 Meter länger.',
      'Halbes Tempo – nur ein Viertel Bremsweg. Der Anhalteweg schrumpft auf etwa 30 Meter.',
    ],
    notes: [
      '▶ Sagen: „Ein Lkw mit 80 km/h, ihr seht eine Gefahr. Erst die Reaktionszeit – rund 1 Sekunde, das sind 22 Meter. Dann braucht die Druckluft Zeit, bis sie bremst – bis zu 0,6 Sekunden, noch einmal 13 Meter. Dann erst bremst der Lkw – bei guter Bremse etwa 49 Meter.“\n✅ Eigene Rechnung mit 5,0 m/s² (Mindestwert nach § 41 Abs. 4 StVZO) und 0,6 s Ansprech- und Schwellzeit (§ 41 Abs. 12). Ergebnis: rund 85 m.\n➜ „Und bergab?“',
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

  // ===== FADING (Morph) =====
  const DX = 7.9, DY = 3.75;
  await steps(deck, 'c6w', {
    kicker: 'Fading', ttl: 'Wenn die Bremse nachlässt',
    list: ['Bremse kalt', 'Langes Gefälle, nur Fußbremse', 'Fading'],
    caps: [
      'Kalte Bremse: Die Beläge greifen voll. Die Bremse wirkt wie sie soll.',
      'Ein langes Gefälle nur mit der Betriebsbremse: Scheiben und Trommeln werden immer heißer.',
      'Sehr heiße Bremsen greifen schlechter – die Wirkung lässt gefährlich nach. Das heißt Fading.',
    ],
    notes: [
      '▶ Sagen: „Hier eine Bremsscheibe. Kalt bremst sie mit voller Kraft.“\n➜ „Jetzt fahrt ihr einen langen Pass hinunter – nur mit dem Fuß auf der Bremse.“',
      '▶ „Die ganze Bewegungsenergie wird an der Bremse zu Wärme. Ohne Dauerbremse wird sie immer heißer.“\n➜ „Und dann?“',
      '▶ „Die Reibung zwischen Belag und Scheibe sinkt, Trommeln dehnen sich aus – die Bremse wird schwach. Fading.“\n✅ Prüfungsfrage 2.7.06-310: Wird im langen Gefälle ständig nur mit der Betriebsbremse gebremst, werden die Radbremsen so heiß, dass die Bremswirkung gefährlich nachlässt.\n💡 Nach Fading: anhalten, abkühlen lassen, Lkw mit Keilen sichern.\n➜ „Wie fahrt ihr bergab richtig?“',
    ],
    legend: 'Schematisch',
    scene: async (s, i) => {
      const col = ['6E7888', 'E0702A', 'FF3B30'][i];
      s.oval(DX - 1.5, DY - 1.5, 3.0, 3.0, { fill: col, line: '3C4656', lw: 3, name: '!!disc', glow: i ? 18 : undefined, glowColor: col });
      s.oval(DX - 0.65, DY - 0.65, 1.3, 1.3, { fill: '2A3342', name: '!!nabe' });
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; s.oval(DX + 1.05 * Math.cos(a) - 0.06, DY + 1.05 * Math.sin(a) - 0.06, 0.12, 0.12, { fill: '1A1A1A', ft: 40, name: '!!loch' + k }); }
      s.rrect(DX + 1.1, DY - 1.0, 0.55, 2.0, { fill: '3C4656', line: '6E7888', rr: 0.15, name: '!!sattel' });
      // Thermometer + Bremswirkung
      const T = [0.15, 0.6, 0.95][i], W = [1.0, 0.85, 0.35][i];
      s.text('Temperatur', { x: 10.4, y: 1.7, w: 2.6, h: 0.32, size: 14, bold: true, color: C.txt, name: '!!tt' });
      s.rrect(10.4, 2.05, 2.6, 0.32, { fill: '1A212C', line: C.line, rr: 0.15, name: '!!tbg' });
      s.rrect(10.43, 2.08, 2.54 * T, 0.26, { fill: col === '6E7888' ? C.bl : col, rr: 0.15, name: '!!tv' });
      s.text('Bremswirkung', { x: 10.4, y: 2.65, w: 2.6, h: 0.32, size: 14, bold: true, color: C.txt, name: '!!wt' });
      s.rrect(10.4, 3.0, 2.6, 0.32, { fill: '1A212C', line: C.line, rr: 0.15, name: '!!wbg' });
      s.rrect(10.43, 3.03, 2.54 * W, 0.26, { fill: W > 0.6 ? C.gr : C.red, rr: 0.15, name: '!!wv' });
      if (i === 2) s.text('Fading!', { x: 10.4, y: 3.6, w: 2.6, h: 0.6, size: 30, bold: true, color: C.red, name: '!!fad' });
    },
  });
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
