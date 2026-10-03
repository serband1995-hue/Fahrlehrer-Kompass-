// Abend 4: Titel, Ablauf, Wiederholung Abend 3, Lernziele C7
const { C, sec, base, kick, title, card, CLICK, ask } = require('../gs');
const { icon } = require('../lib');

sec('c7', 'LEKTION C7', C.bl, 'bg_kap.jpg');

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE C  ·  ABEND 4';
  // ===== TITEL =====
  {
    const s = base(deck, 'c7', { bg: 'i_titel.jpg', ov: 9.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „Willkommen zu Abend 4. Heute geht es um Physik – aber keine Angst, ohne Formeln zum Auswendiglernen. Ihr lernt, welche Kräfte an einem Lkw ziehen und drücken: in der Kurve, beim Bremsen, bei Wind. Nach der Pause: Was muss an Bord sein, wie schwer und wie groß darf ein Lkw sein – und wie arbeitet ihr sicher.“\n' +
      '💡 Vorher: Anwesenheit eintragen, Ausbildungsnachweis abzeichnen.\n' +
      '🖱 Keine Klicks, alles läuft von selbst.\n' +
      '➜ „So läuft der Abend.“' });
    s.img('ov_left.png', { x: 0, y: 0, w: 8.0, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('KLASSE C  ·  THEORIE  ·  ABEND 4', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.bl, cs: 4 }, { fx: 'fade', auto: true, dur: 700, d: 200 });
    s.text('Kräfte, die am Lkw ziehen', { x: 0.7, y: 2.7, w: 6.0, h: 1.9, size: 48, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 350 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.bl }, { fx: 'wipeR', auto: true, dur: 700, d: 900 });
    s.text([{ text: 'C7  ', options: { bold: true, color: C.bl } }, { text: 'Wirkung von Kräften beim Fahren', options: { color: C.txt, breakLine: true } }, { text: 'C8  ', options: { bold: true, color: C.bl } }, { text: 'Ausrüstung, Beförderung, Sicherheit', options: { color: C.txt } }],
      { x: 0.7, y: 5.0, w: 7.0, h: 1.0, size: 18, lsm: 1.2 }, { fx: 'fade', auto: true, dur: 800, d: 1100 });
    s.text('Fahrschule Boost  ·  Offenbach am Main', { x: 0.7, y: 6.7, w: 6, h: 0.35, size: 12, color: C.dim }, { fx: 'fade', auto: true, dur: 800, d: 1400 });
  }
  // ===== ABLAUF =====
  {
    const s = base(deck, 'c7', { notes:
      '▶ Sagen: „Zwei Lektionen: zuerst C7 – welche Kräfte beim Fahren wirken. Nach der Pause C8 – Pflichtausrüstung, Maße und Gewichte, Gefahrgut und Arbeitssicherheit.“\n' +
      '🖱 Klick 1: Lektion C7 · Klick 2: Pause · Klick 3: Lektion C8.\n' +
      '💡 Zeiten für einen Beginn um 18:00 Uhr.\n' +
      '➜ „Erst ein kurzer Blick zurück auf Abend 3.“' });
    kick(s, 'Heute Abend'); title(s, 'Zwei Lektionen, eine Pause');
    const T = [
      ['18:00', '19:30', 'Lektion C7', 'Wirkung von Kräften beim Fahren', 'Haftung · Widerstände und Energie · Fliehkraft und Kippen · Wind und Wasser · Ladung', C.bl, 'LuMagnet'],
      ['19:30', '19:45', 'Pause', '15 Minuten', '', C.dim, 'LuCoffee'],
      ['19:45', '21:15', 'Lektion C8', 'Ausrüstung, Beförderung, Sicherheit', 'Pflichtausrüstung · Abschleppen · Maße und Gewichte · Ladung · Gefahrgut · Arbeitssicherheit', C.gr, 'LuShieldCheck'],
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
  // ===== WIEDERHOLUNG ABEND 3 =====
  await ask(deck, 'c7', {
    kicker: 'Wiederholung Abend 3', q: 'Drei Fragen von letztem Mal – wer weiß es noch?', ico: 'LuRotateCcw', qsize: 32,
    answers: [
      ['LuGauge', 'Der Lkw stand übers Wochenende. Wann losfahren?', 'Erst wenn genug Luft im System ist – die Druckwarnung muss aus sein.'],
      ['LuThermometer', 'Was ist Fading?', 'Die Bremse wird zu heiß und lässt nach. Dagegen: zurückschalten, Dauerbremse nutzen.'],
      ['LuMountain', 'Ab wann ist eine Dauerbremse Pflicht?', 'Bei Lkw über 9 t zulässiger Gesamtmasse.'],
    ],
    notes:
      '▶ Sagen: „Bevor wir anfangen: drei Fragen zu Abend 3.“\n' +
      '❓ Jede Frage vorlesen, Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1–3: je eine Frage mit Antwort.\n' +
      '✅ Prüfungsfrage 2.7.01-238 (losfahren erst, wenn die Druckwarnung aufgehört hat) · 2.7.06-310 (Fading; CE-Frage, Inhalt gilt auch für C) · § 41 Abs. 15 StVZO (Dauerbremse über 9 t).\n' +
      '➜ „Gut. Heute geht es um die Kräfte, die dabei wirken. Was lernt ihr in C7?“',
  });
  // ===== LERNZIELE C7 =====
  {
    const s = base(deck, 'c7', { notes:
      '▶ Sagen: „In C7 versteht ihr, warum ein Lkw anders fährt als ein Auto: Er ist schwer, hoch und groß. Das merkt man beim Bremsen, in der Kurve und bei Wind.“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: Wie hält ein Lkw überhaupt auf der Straße?“' });
    kick(s, 'Lektion C7 · Wirkung von Kräften beim Fahren'); title(s, 'Das lernt ihr in C7');
    const T = [['01', 'Haftung', 'Reifen und Straße, Bremsen und Lenken zugleich', '20 Min', C.bl], ['02', 'Widerstände und Energie', 'Rollen, Luft, Steigung – und die Wucht der Masse', '20 Min', C.or], ['03', 'Fliehkraft und Kippen', 'Kurve, Schwerpunkt, Kippgefahr', '25 Min', C.red], ['04', 'Wind und Wasser', 'Seitenwind und Aquaplaning', '10 Min', C.pu], ['05', 'Leer oder beladen', 'Was die Ladung am Fahrverhalten ändert', '10 Min', 'C9A227']];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nimmst du mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }
};
