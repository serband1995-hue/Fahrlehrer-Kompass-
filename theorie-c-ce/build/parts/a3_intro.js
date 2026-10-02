// Abend 3: Titel, Ablauf, Wiederholung Abend 2, Lernziele C5
const { C, sec, base, kick, title, card, CLICK, ask } = require('../gs');
const { icon } = require('../lib');

sec('c5', 'LEKTION C5', C.red, 'bg_kap.jpg');
sec('c5a', 'C5  ·  BREMSANLAGEN', C.or, 'bg_or.jpg');
sec('c5d', 'C5  ·  DRUCKLUFT', C.bl, 'bg_blue.jpg');
sec('c5z', 'C5  ·  ZWEIKREIS-BREMSE', C.pu, 'bg_pu.jpg');
sec('c5l', 'C5  ·  ALB UND EBS', 'C9A227', 'bg_am.jpg');
sec('c5f', 'C5  ·  FESTSTELLBREMSE', C.red, 'bg_red.jpg');

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE C  ·  ABEND 3';
  // ===== TITEL =====
  {
    const s = base(deck, 'c5', { bg: 'h_titel.jpg', ov: 9.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „Willkommen zu Abend 3 von 5 für Klasse C. Heute geht es um das Wichtigste am Lkw: die Bremsen. Bis zu 32 Tonnen bergab – da muss man wissen, wie die Bremse funktioniert und wie man sie schont.“\n' +
      '💡 Vorher: Anwesenheit eintragen, Ausbildungsnachweis abzeichnen.\n' +
      '🖱 Keine Klicks, alles läuft von selbst.\n' +
      '➜ „So läuft der Abend.“' });
    s.img('ov_left.png', { x: 0, y: 0, w: 8.0, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('KLASSE C  ·  THEORIE  ·  ABEND 3', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.red, cs: 4 }, { fx: 'fade', auto: true, dur: 700, d: 200 });
    s.text('Bremsen, auf die man sich verlässt', { x: 0.7, y: 2.7, w: 6.0, h: 1.9, size: 48, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 350 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.red }, { fx: 'wipeR', auto: true, dur: 700, d: 900 });
    s.text([{ text: 'C5  ', options: { bold: true, color: C.red } }, { text: 'Lkw-Bremsen', options: { color: C.txt, breakLine: true } }, { text: 'C6  ', options: { bold: true, color: C.red } }, { text: 'Dauerbremsen, Untersuchungen, Begrenzer', options: { color: C.txt } }],
      { x: 0.7, y: 5.0, w: 7.0, h: 1.0, size: 18, lsm: 1.2 }, { fx: 'fade', auto: true, dur: 800, d: 1100 });
    s.text('Fahrschule Boost  ·  Offenbach am Main', { x: 0.7, y: 6.7, w: 6, h: 0.35, size: 12, color: C.dim }, { fx: 'fade', auto: true, dur: 800, d: 1400 });
  }
  // ===== ABLAUF =====
  {
    const s = base(deck, 'c5', { notes:
      '▶ Sagen: „Zwei Lektionen: zuerst C5 – wie eine Druckluftbremse aufgebaut ist und funktioniert. Nach der Pause C6 – Dauerbremsen, ABS, Kontrolle der Bremse, Hauptuntersuchung und Geschwindigkeitsbegrenzer.“\n' +
      '🖱 Klick 1: Lektion C5 · Klick 2: Pause · Klick 3: Lektion C6.\n' +
      '💡 Zeiten für einen Beginn um 18:00 Uhr.\n' +
      '➜ „Erst ein kurzer Blick zurück auf Abend 2.“' });
    kick(s, 'Heute Abend'); title(s, 'Zwei Lektionen, eine Pause');
    const T = [
      ['18:00', '19:30', 'Lektion C5', 'Lkw-Bremsen', 'Bremsanlagen · Druckluft · Zweikreis-Bremse · ALB und EBS · Feststellbremse', C.red, 'LuOctagonAlert'],
      ['19:30', '19:45', 'Pause', '15 Minuten', '', C.dim, 'LuCoffee'],
      ['19:45', '21:15', 'Lektion C6', 'Dauerbremsen, Untersuchungen, Begrenzer', 'Motorbremse und Retarder · Bremsweg und Fading · ABS · Kontrolle · HU und SP · Begrenzer', C.bl, 'LuMountain'],
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
  // ===== WIEDERHOLUNG ABEND 2 =====
  await ask(deck, 'c5', {
    kicker: 'Wiederholung Abend 2', q: 'Drei Fragen von letztem Mal – wer weiß es noch?', ico: 'LuRotateCcw', qsize: 32,
    answers: [
      ['LuDroplet', 'AdBlue-Tank leer – was passiert?', 'Erst weniger Leistung, zuletzt Kriechmodus mit höchstens 20 km/h.'],
      ['LuLock', 'Wann die Differenzialsperre einlegen?', 'Nur im Stand oder im Schritttempo – nie in Kurven, sofort wieder raus.'],
      ['LuSnowflake', 'Winterreifen beim Lkw – wo mindestens?', 'Auf den Antriebsachsen und den vorderen Lenkachsen, mit Alpine-Symbol.'],
    ],
    notes:
      '▶ Sagen: „Bevor wir anfangen: drei Fragen zu Abend 2.“\n' +
      '❓ Jede Frage vorlesen, Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1–3: je eine Frage mit Antwort.\n' +
      '✅ VO (EU) 582/2011 Anhang XIII · Prüfungsfrage 2.7.03-213 · § 2 Abs. 3a StVO.\n' +
      '➜ „Gut. Jetzt zu den Bremsen: Was lernt ihr heute in C5?“',
  });
  // ===== LERNZIELE C5 =====
  {
    const s = base(deck, 'c5', { notes:
      '▶ Sagen: „In C5 lernt ihr, wie die Druckluftbremse aufgebaut ist: Woher kommt die Luft, wie wird sie verteilt, was passiert, wenn ein Kreis ausfällt – und wie die Feststellbremse mit einer Feder arbeitet.“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: Welche Bremsen hat ein Lkw?“' });
    kick(s, 'Lektion C5 · Lkw-Bremsen'); title(s, 'Das lernt ihr in C5');
    const T = [['01', 'Bremsanlagen', 'Betriebs-, Feststell-, Dauerbremse – was das Gesetz verlangt', '10 Min', C.or], ['02', 'Druckluft', 'Kompressor, Trockner, Vierkreisschutzventil, Druck, Entwässern', '25 Min', C.bl], ['03', 'Zweikreis-Bremse', 'zwei Kreise, Bremszylinder, Kreisausfall', '20 Min', C.pu], ['04', 'ALB und EBS', 'Bremskraft nach Beladung, Elektronik', '10 Min', 'C9A227'], ['05', 'Feststellbremse', 'Feder bremst, Luft löst – Notlösen, Kontrollstellung', '20 Min', C.red]];
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
