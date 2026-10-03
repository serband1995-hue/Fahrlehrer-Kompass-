// Abend 2: Titel, Ablauf, Wiederholung Abend 1, Lernziele C3, Kapitel 1 (Weg der Kraft)
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, chapter } = require('../gs');
const { icon } = require('../lib');

sec('c3', 'LEKTION C3', C.or, 'bg_kap.jpg');
sec('c3k', 'C3  ·  KRAFTSTRANG', C.or, 'bg_or.jpg');
sec('c3m', 'C3  ·  MOTOR', C.red, 'bg_red.jpg');
sec('c3g', 'C3  ·  KUPPLUNG UND GETRIEBE', C.pu, 'bg_pu.jpg');
sec('c3d', 'C3  ·  DIFFERENZIAL UND ACHSEN', 'C9A227', 'bg_am.jpg');

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE C  ·  ABEND 2';
  // ===== TITEL =====
  {
    const s = base(deck, 'c3', { bg: 'g_titel.jpg', ov: 9.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „Willkommen zu Abend 2 von 5 für Klasse C. Heute geht es um die Technik: Wie kommt die Kraft vom Motor auf die Straße – und worauf rollt, federt und leuchtet ein Lkw?“\n' +
      '💡 Vorher: Anwesenheit eintragen, Ausbildungsnachweis abzeichnen.\n' +
      '🖱 Keine Klicks, alles läuft von selbst.\n' +
      '➜ „So läuft der Abend.“' });
    s.img('ov_left.png', { x: 0, y: 0, w: 8.0, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('KLASSE C  ·  THEORIE  ·  ABEND 2', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.or, cs: 4 }, { fx: 'fade', auto: true, dur: 700, d: 200 });
    s.text('Technik, die man versteht', { x: 0.7, y: 2.7, w: 5.6, h: 1.9, size: 50, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 350 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.or }, { fx: 'wipeR', auto: true, dur: 700, d: 900 });
    s.text([{ text: 'C3  ', options: { bold: true, color: C.or } }, { text: 'Kraftstrang', options: { color: C.txt, breakLine: true } }, { text: 'C4  ', options: { bold: true, color: C.or } }, { text: 'Fahrwerk / Elektrische Anlagen', options: { color: C.txt } }],
      { x: 0.7, y: 5.0, w: 7.0, h: 1.0, size: 18, lsm: 1.2 }, { fx: 'fade', auto: true, dur: 800, d: 1100 });
    s.text('Fahrschule Boost  ·  Offenbach am Main', { x: 0.7, y: 6.7, w: 6, h: 0.35, size: 12, color: C.dim }, { fx: 'fade', auto: true, dur: 800, d: 1400 });
  }
  // ===== ABLAUF =====
  {
    const s = base(deck, 'c3', { notes:
      '▶ Sagen: „Zwei Lektionen: zuerst C3 – Motor, Kupplung, Getriebe, Differenzial. Nach der Pause C4 – Federung, Reifen, Aufbauten, Elektrik und Licht.“\n' +
      '🖱 Klick 1: Lektion C3 · Klick 2: Pause · Klick 3: Lektion C4.\n' +
      '💡 Zeiten für einen Beginn um 18:00 Uhr.\n' +
      '➜ „Erst ein kurzer Blick zurück auf Abend 1.“' });
    kick(s, 'Heute Abend'); title(s, 'Zwei Lektionen, eine Pause');
    const T = [
      ['18:00', '19:30', 'Lektion C3', 'Kraftstrang', 'Weg der Kraft · Motor und Abgas · Kupplung und Getriebe · Differenzial, Sperre, ASR', C.or, 'LuCog'],
      ['19:30', '19:45', 'Pause', '15 Minuten', '', C.dim, 'LuCoffee'],
      ['19:45', '21:15', 'Lektion C4', 'Fahrwerk / Elektrische Anlagen', 'Federung · Räder, Reifen, Schneeketten · Aufbauten · Batterie · Licht und Warnleuchten', C.bl, 'LuZap'],
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
  // ===== WIEDERHOLUNG ABEND 1 =====
  await ask(deck, 'c3', {
    kicker: 'Wiederholung Abend 1', q: 'Drei Fragen vom letzten Mal – wer weiß es noch?', ico: 'LuRotateCcw', qsize: 32,
    answers: [
      ['LuClock', 'Wie lange am Stück fahren?', '4,5 h Lenkzeit, dann 45 Minuten Pause – oder erst 15, dann 30 Minuten.'],
      ['LuEyeOff', 'Rechtsabbiegen innerorts über 3,5 t?', 'Schrittgeschwindigkeit – Radfahrer und Fußgänger im toten Winkel.'],
      ['LuCalendarX', 'Sonntagsfahrverbot?', '0 bis 22 Uhr im gewerblichen Güterverkehr: Lkw über 7,5 t und Lkw mit Anhänger – auch Leerfahrten.'],
    ],
    notes:
      '▶ Sagen: „Bevor wir anfangen: drei Fragen zu Abend 1.“\n' +
      '❓ Jede Frage vorlesen, Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1–3: je eine Frage mit Antwort.\n' +
      '✅ Art. 7 VO 561/2006 · § 9 Abs. 6 StVO, BKat Nr. 45 (70 €, 1 Punkt) · § 30 Abs. 3 StVO.\n' +
      '➜ „Gut. Jetzt zur Technik: Was lernt ihr heute in C3?“',
  });
  // ===== LERNZIELE C3 =====
  {
    const s = base(deck, 'c3', { notes:
      '▶ Sagen: „In C3 geht es um den Kraftstrang – alles, was die Kraft vom Motor zu den Rädern bringt. Ihr müsst nicht reparieren können. Aber ihr müsst verstehen, bedienen, kontrollieren – und merken, wenn etwas nicht stimmt.“\n' +
      '🖱 Klick 1–4: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: der Weg der Kraft.“' });
    kick(s, 'Lektion C3 · Kraftstrang'); title(s, 'Das lernt ihr in C3');
    const T = [['01', 'Der Weg der Kraft', 'vom Motor bis zum Rad', '10 Min', C.or], ['02', 'Motor und Abgas', 'Diesel, Turbo, Drehzahl, AdBlue, Partikelfilter, Kontrollen', '30 Min', C.red], ['03', 'Kupplung und Getriebe', 'schonend fahren, 12 Gänge, Automatik, Wandler', '20 Min', C.pu], ['04', 'Differenzial und Achsen', 'Sperre, Achsformeln, Antriebs-Schlupf-Regelung', '25 Min', 'C9A227']];
    for (let i = 0; i < 4; i++) {
      const y = 2.05 + i * 1.1;
      card(s, 0.7, y, 11.93, 0.95, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.95, size: 34, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1], options: { bold: true, color: C.txt, breakLine: true } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.95, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.95, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nehmt ihr mit“', { x: 0.7, y: 6.5, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }
  await chapter(deck, 'c3k', { num: 1, ttl: 'Der Weg der Kraft', sub: 'Vom Diesel im Tank bis zum Reifen auf der Straße.', ico: 'LuRoute', notes:
    '▶ Sagen: „Kapitel 1: Wie kommt die Kraft auf die Straße?“\n🖱 Keine Klicks.\n➜ „Wir schauen von oben auf das Fahrgestell.“' });
};
