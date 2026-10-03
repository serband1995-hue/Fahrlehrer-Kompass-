// Abend 6: Titel, Ablauf, Wiederholung Abend 5, Lernziele CE1
const { C, sec, base, kick, title, card, CLICK, ask } = require('../gs');
const { icon } = require('../lib');

sec('ce1', 'LEKTION CE1', C.bl, 'bg_kap.jpg');

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE CE  ·  ABEND 6';
  // ===== TITEL =====
  {
    const s = base(deck, 'ce1', { bg: 'k_titel.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Willkommen zu Abend 6 – dem ersten Abend für Klasse CE. Ab heute geht es um Lkw mit Anhänger und um Sattelzüge. Zuerst: Wie stellt man einen Zug zusammen – Kuppeln, Satteln, Maße und Gewichte. Nach der Pause: Wie bremst ein Zug – die Lastzugbremse.“\n' +
      '💡 Vorher: Anwesenheit eintragen, Ausbildungsnachweis abzeichnen.\n' +
      '🖱 Keine Klicks, alles läuft von selbst.\n' +
      '➜ „So läuft der Abend.“' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.6, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('KLASSE CE  ·  THEORIE  ·  ABEND 6', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.bl, cs: 4 }, { fx: 'fade', auto: true, dur: 700, d: 200 });
    s.text('Mit Anhänger unterwegs', { x: 0.7, y: 2.7, w: 6.0, h: 1.9, size: 48, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 350 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.bl }, { fx: 'wipeR', auto: true, dur: 700, d: 900 });
    s.text([{ text: 'CE1  ', options: { bold: true, color: C.bl } }, { text: 'Zusammenstellung von Zügen', options: { color: C.txt, breakLine: true } }, { text: 'CE2  ', options: { bold: true, color: C.bl } }, { text: 'Lastzugbremsen', options: { color: C.txt } }],
      { x: 0.7, y: 5.0, w: 6.5, h: 1.0, size: 18, lsm: 1.2 }, { fx: 'fade', auto: true, dur: 800, d: 1100 });
    s.text('Fahrschule Boost  ·  Offenbach am Main', { x: 0.7, y: 6.7, w: 6, h: 0.35, size: 12, color: C.dim }, { fx: 'fade', auto: true, dur: 800, d: 1400 });
  }
  // ===== ABLAUF =====
  {
    const s = base(deck, 'ce1', { notes:
      '▶ Sagen: „Zwei Lektionen: zuerst CE1 – wie man Lkw und Anhänger oder Zugmaschine und Auflieger richtig zusammenstellt. Nach der Pause CE2 – wie die Bremse am Zug funktioniert.“\n' +
      '🖱 Klick 1: Lektion CE1 · Klick 2: Pause · Klick 3: Lektion CE2.\n' +
      '💡 Zeiten für einen Beginn um 18:00 Uhr.\n' +
      '➜ „Erst ein kurzer Blick zurück auf Abend 5.“' });
    kick(s, 'Heute Abend'); title(s, 'Zwei Lektionen, eine Pause');
    const T = [
      ['18:00', '19:30', 'Lektion CE1', 'Zusammenstellung von Zügen', 'Zugarten und Kupplungen · Ankuppeln · Auf- und Absatteln · Maße und Kurvenlauf · Gewichte und Führerschein', C.bl, 'LuLink'],
      ['19:30', '19:45', 'Pause', '15 Minuten', '', C.dim, 'LuCoffee'],
      ['19:45', '21:15', 'Lektion CE2', 'Lastzugbremsen', 'Auflaufbremse · Zweileitungs-Druckluftbremse · Leitungsbruch · Rangieren mit dem Löseventil', C.or, 'LuDisc'],
    ];
    for (let i = 0; i < 3; i++) {
      const t = T[i], h = i === 1 ? 1.0 : 1.32, yy = [2.05, 3.55, 4.73][i];
      card(s, 0.7, yy, 11.93, h, { line: t[5] }, CLICK);
      s.text(t[0] + ' – ' + t[1], { x: 0.95, y: yy, w: 2.0, h, size: 18, bold: true, color: t[5], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.oval(3.05, yy + (h - 0.62) / 2, 0.62, 0.62, { fill: t[5], line: t[5] }, { fx: 'zoom', dur: 250 });
      s.img(await icon(t[6], C.dark), { x: 3.19, y: yy + (h - 0.62) / 2 + 0.14, w: 0.34, h: 0.34 }, { fx: 'fade', dur: 150 });
      s.text([{ text: t[2] + '  ', options: { bold: true, color: C.txt } }, { text: t[3], options: { color: C.txt, breakLine: !!t[4] } }, ...(t[4] ? [{ text: t[4], options: { color: C.mut, fontSize: 15 } }] : [])],
        { x: 3.9, y: yy, w: 8.6, h, size: 19, valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
  }
  // ===== WIEDERHOLUNG ABEND 5 =====
  await ask(deck, 'ce1', {
    kicker: 'Wiederholung Abend 5', q: 'Drei Fragen vom letzten Mal – wer weiß es noch?', ico: 'LuRotateCcw', qsize: 32,
    answers: [
      ['LuBox', 'Wie viel hält eine normale Stirnwand (Code L)?', '40 % der Nutzlast – höchstens 5.000 daN (so viel, wie 5 t wiegen). Nach vorn drückt die Ladung mit bis zu 80 %.'],
      ['LuTag', 'Welcher Wert auf dem Zurrgurt zählt beim Niederzurren?', 'Die STF – die Vorspannkraft. Die LC zählt beim Direktzurren.'],
      ['LuClock', 'Mit welchem Schnitt plant ihr einen Lkw über 7,5 t auf der Autobahn?', 'Mit 70 km/h – nicht mit 80.'],
    ],
    notes:
      '▶ Sagen: „Bevor wir anfangen: drei Fragen zu Abend 5.“\n' +
      '❓ Jede Frage vorlesen, Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1–3: je eine Frage mit Antwort.\n' +
      '✅ DIN EN 12642 Code L (Stirnwand 0,4 × Nutzlast, höchstens 5.000 daN) · DIN EN 12195-2 / BG BAU 2021 (STF beim Niederzurren, LC beim Direktzurren) · Prüfungsfrage 2.6.07-214 (70 km/h).\n' +
      '➜ „Heute kommt ein Anhänger dazu.“',
  });
  // ===== LERNZIELE CE1 =====
  {
    const s = base(deck, 'ce1', { notes:
      '▶ Sagen: „In CE1 lernt ihr, welche Züge es gibt und wie sie verbunden sind, wie man sicher ankuppelt und aufsattelt, wie lang und schwer ein Zug sein darf – und welche Führerscheinklasse ihr braucht.“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: Welche Züge gibt es?“' });
    kick(s, 'Lektion CE1 · Zusammenstellung von Zügen'); title(s, 'Das lernt ihr in CE1');
    const T = [['01', 'Zugarten und Kupplungen', 'Gliederzug, Zentralachsanhänger, Sattelzug · Bolzen- und Sattelkupplung', '15 Min', C.bl], ['02', 'An- und Abkuppeln', 'Schritt für Schritt · gelb vor rot · Kontrollstift', '25 Min', C.or], ['03', 'Auf- und Absatteln', 'Höhe, Einrasten, Sicherung · Stützen', '15 Min', C.gr], ['04', 'Maße und Kurvenlauf', '16,50 m · 18,75 m · Kreisring 12,50 m', '15 Min', C.pu], ['05', 'Gewichte und Führerschein', '40 t, 44 t, Sattellast · C1E oder CE', '15 Min', 'C9A227']];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nehmt ihr mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }
};
