// Abend 1: Titel, Ablauf des Abends, Einstieg C1
const { C, sec, base, kick, title, card, badge, point, CLICK, ask } = require('../gs');
const { icon } = require('../lib');

sec('c1', 'LEKTION C1', C.or, 'bg_kap.jpg');

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE C  ·  ABEND 1';
  // ===== TITEL =====
  {
    const s = base(deck, 'c1', { bg: 'f_titel.jpg', ov: 9.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „Herzlich willkommen zur Theorie für den Lkw-Führerschein, Klasse C. Heute ist Abend 1 von 5 für Klasse C. Wir machen zwei Lektionen: C1 und C2, dazwischen 15 Minuten Pause.“\n' +
      '💡 Vorher: Anwesenheit eintragen, Ausbildungsnachweis abzeichnen.\n' +
      '🖱 Keine Klicks, alles läuft von selbst.\n' +
      '➜ „Schauen wir, was heute Abend auf uns zukommt.“' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('KLASSE C  ·  THEORIE  ·  ABEND 1', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.or, cs: 4 }, { fx: 'fade', auto: true, dur: 700, d: 200 });
    s.text('Lkw fahren beginnt im Kopf', { x: 0.7, y: 2.7, w: 5.6, h: 1.9, size: 54, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 350 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.or }, { fx: 'wipeR', auto: true, dur: 700, d: 900 });
    s.text([{ text: 'C1  ', options: { bold: true, color: C.or } }, { text: 'Persönliche Voraussetzungen und Arbeitsplatz', options: { color: C.txt, breakLine: true } },
      { text: 'C2  ', options: { bold: true, color: C.or } }, { text: 'Besondere Vorschriften aus der StVO / Transportvorschriften', options: { color: C.txt } }],
      { x: 0.7, y: 5.0, w: 7.8, h: 1.0, size: 18, lsm: 1.2 }, { fx: 'fade', auto: true, dur: 800, d: 1100 });
    s.text('Fahrschule Boost  ·  Offenbach am Main', { x: 0.7, y: 6.7, w: 6, h: 0.35, size: 12, color: C.dim }, { fx: 'fade', auto: true, dur: 800, d: 1400 });
  }
  // ===== ABLAUF DES ABENDS =====
  {
    const s = base(deck, 'c1', { notes:
      '▶ Sagen: „Heute habt ihr zwei Lektionen zu je 90 Minuten. Zuerst C1: Was müsst ihr persönlich mitbringen, wie lange dürft ihr fahren, und wie sieht euer Arbeitsplatz aus. Nach der Pause C2: welche Verkehrsregeln für Lkw anders sind als für Pkw.“\n' +
      '🖱 Klick 1: Lektion C1 · Klick 2: Pause · Klick 3: Lektion C2.\n' +
      '💡 Zeiten für einen Beginn um 18:00 Uhr. Wenn ihr später anfangt, einfach verschieben.\n' +
      '➜ „Bevor wir anfangen: Was ist eigentlich anders, wenn man Lkw fährt?“' });
    kick(s, 'Heute Abend'); title(s, 'Zwei Lektionen, eine Pause');
    const T = [
      ['18:00', '19:30', 'Lektion C1', 'Persönliche Voraussetzungen und Arbeitsplatz', 'Führerschein · Lenk- und Ruhezeiten · Fahrtenschreiber · Spiegel und toter Winkel', C.or, 'LuIdCard'],
      ['19:30', '19:45', 'Pause', '15 Minuten', 'Kurz raus, frische Luft – wie bei der Fahrtunterbrechung', C.dim, 'LuCoffee'],
      ['19:45', '21:15', 'Lektion C2', 'Besondere Vorschriften aus der StVO / Transportvorschriften', 'Tempo und Abstand · Überholen · Bahnübergang · Parken · Fahrverbote · Papiere und Maut', C.bl, 'LuTruck'],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 2.05 + i * 1.5, t = T[i], h = i === 1 ? 1.0 : 1.32;
      const yy = i === 2 ? y - 0.32 : y;
      card(s, 0.7, yy, 11.93, h, { line: t[5] }, CLICK);
      s.text(t[0] + ' – ' + t[1], { x: 0.95, y: yy, w: 2.0, h, size: 18, bold: true, color: t[5], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.oval(3.05, yy + (h - 0.62) / 2, 0.62, 0.62, { fill: t[5], line: t[5] }, { fx: 'zoom', dur: 250 });
      s.img(await icon(t[6], C.dark), { x: 3.19, y: yy + (h - 0.62) / 2 + 0.14, w: 0.34, h: 0.34 }, { fx: 'fade', dur: 150 });
      s.text([{ text: t[2] + '  ', options: { bold: true, color: C.txt } }, { text: t[3], options: { color: C.txt, breakLine: i !== 1 } }, ...(i !== 1 ? [{ text: t[4], options: { color: C.mut, fontSize: 15 } }] : [])],
        { x: 3.9, y: yy, w: 8.6, h, size: 19, valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
  }
  // ===== EINSTIEG =====
  await ask(deck, 'c1', {
    kicker: 'Einstieg', q: 'Ihr fahrt schon Auto. Was ist beim Lkw anders?', ico: 'LuTruck',
    answers: [
      ['LuWeight', 'Masse:', 'bis 40 t statt 1,5 t. Längerer Bremsweg, viel mehr Wucht beim Aufprall.'],
      ['LuEyeOff', 'Sicht:', 'hoch oben, aber große tote Winkel. Rechts neben euch kann ein ganzer Radfahrer verschwinden.'],
      ['LuClock', 'Arbeitsplatz:', 'Lenk- und Ruhezeiten, Fahrtenschreiber. Wer fährt, wird kontrolliert.'],
      ['LuShieldCheck', 'Verantwortung:', 'Ladung, Fahrzeugzustand, Papiere. Ihr seid Profis auf der Straße.'],
    ],
    notes:
      '▶ Sagen: „Die meisten von euch fahren schon Auto. Was ändert sich, wenn ihr in einem Lkw sitzt?“\n' +
      '❓ Sammeln lassen, ruhig 2–3 Minuten. Dann klicken.\n' +
      '🖱 Klick 1: Masse · Klick 2: Sicht · Klick 3: Arbeitsplatz · Klick 4: Verantwortung.\n' +
      '✅ Ein voll beladener Sattelzug wiegt bis 40 t (§ 34 StVZO), ein Pkw etwa 1,5 t. Bei gleichem Tempo hat der Lkw vielfach mehr Bewegungsenergie.\n' +
      '💡 Genau diese vier Punkte ziehen sich durch die ganze Ausbildung C.\n' +
      '➜ „Was lernt ihr in der ersten Lektion genau?“',
  });
};
