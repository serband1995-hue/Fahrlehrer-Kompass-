// Abend 5: Titel, Ablauf, Wiederholung Abend 4, Lernziele C9
const { C, sec, base, kick, title, card, CLICK, ask } = require('../gs');
const { icon } = require('../lib');

sec('c9', 'LEKTION C9', C.or, 'bg_kap.jpg');

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE C  ·  ABEND 5';
  // ===== TITEL =====
  {
    const s = base(deck, 'c9', { bg: 'j_lad.jpg', ov: 9.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „Willkommen zu Abend 5 – dem letzten Abend für Klasse C. Heute geht es zuerst darum, wie die Ladung sicher auf dem Lkw bleibt und wie ihr vor der Fahrt den Lkw kontrolliert. Nach der Pause: Wie fahrt ihr sparsam und umweltschonend – und wie plant ihr eine Strecke mit dem Lkw.“\n' +
      '💡 Vorher: Anwesenheit eintragen, Ausbildungsnachweis abzeichnen.\n' +
      '🖱 Keine Klicks, alles läuft von selbst.\n' +
      '➜ „So läuft der Abend.“' });
    s.img('ov_left.png', { x: 0, y: 0, w: 8.0, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('KLASSE C  ·  THEORIE  ·  ABEND 5', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.or, cs: 4 }, { fx: 'fade', auto: true, dur: 700, d: 200 });
    s.text('Sicher geladen, klug gefahren', { x: 0.7, y: 2.7, w: 6.2, h: 1.9, size: 48, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 350 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.or }, { fx: 'wipeR', auto: true, dur: 700, d: 900 });
    s.text([{ text: 'C9  ', options: { bold: true, color: C.or } }, { text: 'Ladungssicherung und Abfahrtkontrolle', options: { color: C.txt, breakLine: true } }, { text: 'C10  ', options: { bold: true, color: C.or } }, { text: 'Wirtschaftlich fahren, Streckenplanung', options: { color: C.txt } }],
      { x: 0.7, y: 5.0, w: 7.0, h: 1.0, size: 18, lsm: 1.2 }, { fx: 'fade', auto: true, dur: 800, d: 1100 });
    s.text('Fahrschule Boost  ·  Offenbach am Main', { x: 0.7, y: 6.7, w: 6, h: 0.35, size: 12, color: C.dim }, { fx: 'fade', auto: true, dur: 800, d: 1400 });
  }
  // ===== ABLAUF =====
  {
    const s = base(deck, 'c9', { notes:
      '▶ Sagen: „Zwei Lektionen: zuerst C9 – Ladungssicherung und Abfahrtkontrolle. Nach der Pause C10 – sparsam fahren und die Strecke planen.“\n' +
      '🖱 Klick 1: Lektion C9 · Klick 2: Pause · Klick 3: Lektion C10.\n' +
      '💡 Zeiten für einen Beginn um 18:00 Uhr.\n' +
      '➜ „Erst ein kurzer Blick zurück auf Abend 4.“' });
    kick(s, 'Heute Abend'); title(s, 'Zwei Lektionen, eine Pause');
    const T = [
      ['18:00', '19:30', 'Lektion C9', 'Ladungssicherung und Abfahrtkontrolle', 'Kräfte auf die Ladung · Sichern · Fahrzeug und Lastverteilung · Be- und Entladen · Abfahrtkontrolle', C.or, 'LuPackage'],
      ['19:30', '19:45', 'Pause', '15 Minuten', '', C.dim, 'LuCoffee'],
      ['19:45', '21:15', 'Lektion C10', 'Wirtschaftlich fahren, Streckenplanung', 'Vorausschauend fahren · Verbrauch und Umwelt · Antriebe und Maut · Karten und Routen', C.gr, 'LuLeaf'],
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
  // ===== WIEDERHOLUNG ABEND 4 =====
  await ask(deck, 'c9', {
    kicker: 'Wiederholung Abend 4', q: 'Drei Fragen vom letzten Mal – wer weiß es noch?', ico: 'LuRotateCcw', qsize: 32,
    answers: [
      ['LuGauge', 'Doppelt so schnell in die Kurve – wie groß wird die Fliehkraft?', 'Viermal so groß. Sie wächst mit dem Quadrat der Geschwindigkeit.'],
      ['LuTriangleAlert', 'Panne auf der Landstraße – wie weit kommt das Warndreieck?', 'Bei schnellem Verkehr etwa 100 m hinter den Lkw.'],
      ['LuFlag', 'Ladung ragt 1,20 m über die Rückstrahler hinaus. Was muss dran?', 'Eine hellrote Fahne oder ein Schild, mindestens 30 × 30 cm.'],
    ],
    notes:
      '▶ Sagen: „Bevor wir anfangen: drei Fragen zu Abend 4.“\n' +
      '❓ Jede Frage vorlesen, Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1–3: je eine Frage mit Antwort.\n' +
      '✅ Prüfungsfrage 2.7.01-046 (Fliehkraft viermal so groß) · § 15 StVO (bei schnellem Verkehr etwa 100 m) · § 22 Abs. 4 StVO (mehr als 1 m über die Rückstrahler: Fahne oder Schild, mindestens 30 × 30 cm).\n' +
      '➜ „Heute geht es weiter mit der Ladung: Wie bleibt sie auf dem Lkw?“',
  });
  // ===== LERNZIELE C9 =====
  {
    const s = base(deck, 'c9', { notes:
      '▶ Sagen: „In C9 lernt ihr, welche Kräfte beim Fahren auf die Ladung wirken, wie man sie richtig sichert, was das Fahrzeug dazu beiträgt – und wie ihr vor jeder Schicht den Lkw kontrolliert.“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: Warum muss Ladung überhaupt gesichert werden?“' });
    kick(s, 'Lektion C9 · Ladungssicherung und Abfahrtkontrolle'); title(s, 'Das lernt ihr in C9');
    const T = [['01', 'Warum sichern?', 'Welche Kräfte beim Bremsen und in der Kurve an der Ladung zerren', '15 Min', C.red], ['02', 'So wird gesichert', 'Formschluss, Nieder- und Direktzurren, Zurrgurte, besondere Ladung', '20 Min', C.or], ['03', 'Fahrzeug und Lastverteilung', 'Stirnwand, Zurrpunkte, Lastverteilungsplan', '15 Min', 'C9A227'], ['04', 'Be- und Entladen', 'Ladebordwand, Ladekran, Stapler', '10 Min', C.bl], ['05', 'Abfahrtkontrolle', 'Der Rundgang vor jeder Schicht, einfache Störungen', '20 Min', C.gr]];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 10 Min Abschluss: Mitschreiben, Quiz und „Das nehmt ihr mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }
};
