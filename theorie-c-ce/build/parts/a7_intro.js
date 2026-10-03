// Abend 7: Titel, Ablauf, Wiederholung Abend 6, Lernziele CE3
const { C, sec, base, kick, title, card, CLICK, ask } = require('../gs');
const { icon } = require('../lib');

sec('ce3', 'LEKTION CE3', C.bl, 'bg_kap.jpg');

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE CE  ·  ABEND 7';
  // ===== TITEL =====
  {
    const s = base(deck, 'ce3', { bg: 'm_titel_r.jpg', bgX: 3.3, ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Willkommen zu Abend 7 – dem letzten Abend für Klasse CE. Zuerst noch einmal Bremsen: Wie bremst ein Zug, damit er gerade bleibt? Was passiert, wenn der ABS-Stecker fehlt? Und wie sichert ihr den Zug am Berg? Nach der Pause geht es ums Fahren: Einknicken, Rückwärtsfahren, Abbiegen, Wetter, Tempo und Abstand.“\n' +
      '💡 Vorher: Anwesenheit eintragen, Ausbildungsnachweis abzeichnen.\n' +
      '🖱 Keine Klicks, alles läuft von selbst.\n' +
      '➜ „So läuft der Abend.“' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.6, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('KLASSE CE  ·  THEORIE  ·  ABEND 7', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.bl, cs: 4 }, { fx: 'fade', auto: true, dur: 700, d: 200 });
    s.text('Mit dem Zug sicher fahren', { x: 0.7, y: 2.7, w: 5.6, h: 1.9, size: 46, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 350 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.bl }, { fx: 'wipeR', auto: true, dur: 700, d: 900 });
    s.text([{ text: 'CE3  ', options: { bold: true, color: C.bl } }, { text: 'Lastzugbremsen', options: { color: C.txt, breakLine: true } }, { text: 'CE4  ', options: { bold: true, color: C.bl } }, { text: 'Fahren mit Zügen', options: { color: C.txt } }],
      { x: 0.7, y: 5.0, w: 6.5, h: 1.0, size: 18, lsm: 1.2 }, { fx: 'fade', auto: true, dur: 800, d: 1100 });
    s.text('Fahrschule Boost  ·  Offenbach am Main', { x: 0.7, y: 6.7, w: 6, h: 0.35, size: 12, color: C.dim }, { fx: 'fade', auto: true, dur: 800, d: 1400 });
  }
  // ===== ABLAUF =====
  {
    const s = base(deck, 'ce3', { notes:
      '▶ Sagen: „Zwei Lektionen: zuerst CE3 – wie die Bremse im Zug zusammenspielt. Nach der Pause CE4 – wie ihr den Zug sicher fahrt.“\n' +
      '🖱 Klick 1: Lektion CE3 · Klick 2: Pause · Klick 3: Lektion CE4.\n' +
      '💡 Zeiten für einen Beginn um 18:00 Uhr.\n' +
      '➜ „Erst ein kurzer Blick zurück auf Abend 6.“' });
    kick(s, 'Heute Abend'); title(s, 'Zwei Lektionen, eine Pause');
    const T = [
      ['18:00', '19:30', 'Lektion CE3', 'Lastzugbremsen', 'Abstimmung Lkw und Anhänger · Lastanpassung und EBS · ABS-Stecker · Kontrollstellung · Dauerbremse und Prüffristen', C.bl, 'LuDisc'],
      ['19:30', '19:45', 'Pause', '15 Minuten', '', C.dim, 'LuCoffee'],
      ['19:45', '21:15', 'Lektion CE4', 'Fahren mit Zügen', 'Abfahrtkontrolle · Einknicken und Pendeln · Rückwärts und Abbiegen · Gefälle und Wetter · Tempo, Abstand, Schwertransport', C.or, 'LuTruck'],
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
  // ===== WIEDERHOLUNG ABEND 6 =====
  await ask(deck, 'ce3', {
    kicker: 'Wiederholung Abend 6', q: 'Drei Fragen vom letzten Mal – wer weiß es noch?', ico: 'LuRotateCcw', qsize: 32,
    answers: [
      ['LuLink', 'Welche Leitung schließt ihr beim Ankuppeln zuerst an?', 'Gelb, die Bremsleitung – dann rot. Rot nie allein!'],
      ['LuUnlink', 'Die rote Leitung reißt ab. Was passiert?', 'Der Anhänger bremst sofort selbst. Der Lkw bremst nicht automatisch.'],
      ['LuRuler', 'Wie lang darf ein Lkw mit Anhänger sein?', '18,75 m – mit Ladung, die hinten übersteht, höchstens 20,75 m.'],
    ],
    notes:
      '▶ Sagen: „Bevor wir anfangen: drei Fragen zu Abend 6.“\n' +
      '❓ Jede Frage vorlesen, Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1–3: je eine Frage mit Antwort.\n' +
      '✅ Prüfungsfragen 2.7.07-320 (gelb zuerst), 2.7.02-302 (Bruch der Vorratsleitung), 2.6.06-301 (18,75 m); § 22 Abs. 4 StVO (20,75 m).\n' +
      '➜ „Heute: Wie bremst der ganze Zug zusammen?“',
  });
  // ===== LERNZIELE CE3 =====
  {
    const s = base(deck, 'ce3', { notes:
      '▶ Sagen: „In CE3 schauen wir, wie die Bremse im Zug zusammenspielt: Wer bremst wie stark? Wie merkt der Anhänger, wie schwer er ist? Was passiert ohne ABS-Stecker? Wie sichert ihr den Zug am Berg? Und warum ist die Dauerbremse im Zug heikel?“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Grundlagen (ALB, EBS, Federspeicher, Retarder, HU und SP) kennen alle aus C5 und C6 – heute geht es um das, was beim Zug anders ist.\n' +
      '➜ „Kapitel 1: Jedes Fahrzeug bremst sich selbst.“' });
    kick(s, 'Lektion CE3 · Lastzugbremsen'); title(s, 'Das lernt ihr in CE3');
    const T = [['01', 'Jedes Fahrzeug bremst sich selbst', 'Koppelkraft · Einknicken · Voreilung', '15 Min', C.bl], ['02', 'Lastanpassung und EBS', 'Wie der Anhänger seine Last kennt · zwei Wege zum Anhänger', '20 Min', C.gr], ['03', 'Der ABS-Stecker', 'Was ohne Stecker passiert · Warnleuchte · Klicken', '15 Min', C.or], ['04', 'Feststellbremse im Zug', 'Anhänger hält nur mit Luft · Kontrollstellung · 12 %', '15 Min', C.pu], ['05', 'Dauerbremse und Prüffristen', 'Retarder schiebt · HU, SP und UVV am Anhänger', '20 Min', 'C9A227']];
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
