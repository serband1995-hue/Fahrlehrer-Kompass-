// Abend 6 · CE2: Kapitel 3 Zweileitungs-Druckluftbremse (Wiederholung Lkw-Bremse, Luft fließt, Ventile, Funktionsprobe)
const { C, sec, base, kick, title, card, chapter, motion, ask } = require('../gs');
const { schema } = require('../ce2schema');

sec('ce2z', 'CE2  ·  ZWEILEITUNGS-DRUCKLUFTBREMSE', C.gr, 'bg_gr.jpg');

// Prüfungsfrage mit langen Antworten: Kästen fast über die ganze Breite, „RICHTIG“-Stempel rechts im Kasten.
// Ablauf wie quiz() aus gs.js: Klick 1 = Antworten, Klick 2 = Lösung mit Begründung.
function quizWide(deck, key, { kicker, q, opts, ok, why, notes, size = 26, osize = 16 }) {
  const s = base(deck, key, { notes });
  kick(s, kicker); title(s, q, { size, h: 1.4 });
  const y0 = 2.75, X = 0.7, W = 11.9;
  opts.forEach((o, i) => {
    const y = y0 + i * 1.0;
    card(s, X, y, W, 0.82, { name: 'qo' + i }, { fx: 'flyL', c: i === 0, dur: 450 });
    s.text(String.fromCharCode(65 + i), { x: 0.92, y: y + 0.17, w: 0.48, h: 0.48, size: 15, bold: true, color: C.dark, fill: s.sec.col, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text(o, { x: 1.6, y, w: 9.0, h: 0.82, size: osize, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
  });
  [].concat(ok).forEach((k, j) => {
    const y = y0 + k * 1.0;
    s.rrect(X, y, W, 0.82, { line: C.gr, lw: 3, rr: 0.1 }, { fx: 'zoom', c: j === 0, dur: 350 });
    s.text('✓  RICHTIG', { x: 10.85, y: y + 0.19, w: 1.6, h: 0.44, size: 14, bold: true, color: C.dark, fill: C.gr, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.25, align: 'center', valign: 'middle', rotate: -3 }, { fx: 'stamp' });
  });
  if (why) s.text(why, { x: 0.7, y: Math.max(y0 + opts.length * 1.0 + 0.15, 5.85), w: 11.9, h: 0.9, size: 16, color: C.txt, valign: 'middle', fill: C.card2, line: C.gr, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [10, 14, 10, 14] }, { fx: 'rise', dur: 400 });
  return s;
}

module.exports = async (deck) => {
  await chapter(deck, 'ce2z', { num: 3, ttl: 'Die Zweileitungs-Druckluftbremse', sub: 'Zwei Leitungen, zwei Aufgaben: Rot bringt die Luft, gelb bringt den Befehl.', ico: 'LuWind', notes:
    '▶ Sagen: „Fast jeder Lkw-Anhänger und jeder Auflieger hat sie: die Zweileitungs-Druckluftbremse. Rot und gelb kennt ihr schon vom Ankuppeln. Jetzt schauen wir, was in den Leitungen passiert.“\n🖱 Keine Klicks.\n➜ „Kurz zurück zur Bremse des Lkw.“' });
  await ask(deck, 'ce2z', {
    kicker: 'Wiederholung aus C5', q: 'Woher kommt die Luft für den Anhänger?', ico: 'LuRotateCcw', qsize: 34,
    answers: [
      ['LuWind', 'Kompressor', 'Er pumpt Luft in die Behälter des Lkw.', C.gr, 17],
      ['LuShieldCheck', 'Vierkreisschutzventil', 'Teilt die Luft auf vier Kreise. Reißt einer, behalten die anderen ihren Druck.', C.gr, 17],
      ['LuLink', 'Kreis 3', 'Versorgt die Feststellbremse – und den Anhänger.', C.or, 17],
      ['LuCircleParking', 'Federspeicher', 'Die Feder bremst, die Luft löst.', C.gr, 17],
    ],
    notes:
      '▶ Sagen: „Kurze Wiederholung aus C5: Woher kommt die Luft? Wer weiß es noch?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Bauteil.\n' +
      '✅ Prüfungsfragen 2.7.02-304 (Vierkreisschutzventil), 2.7.06-213/-214 (Federspeicher: Feder bremst, Luft löst). Kompressor → Druckregler → Lufttrockner → Vierkreisschutzventil; Kreise 1 und 2 Betriebsbremse, Kreis 3 Feststellbremse und Anhänger, Kreis 4 Nebenverbraucher: Lehrbuchwissen (Aufteilung je nach Hersteller verschieden).\n' +
      '➜ „Jetzt zum Anhänger.“',
  });

  // ===== LUFT FLIESST =====
  {
    let ph = 0;
    const fr = (t, o = {}) => ({ ...o, t: { ...t, ph: ph++ } });
    const drive = { red: 'flow', yel: 'empty', fill: true };
    const brake = { red: 'flow', yel: 'flow', fill: true, sup: true, brk: true, cyl: 1, pedal: 1, lkwB: 1 };
    await motion(deck, 'ce2z', {
      kicker: 'So bremst der Anhänger', ttl: 'Luft fließt', dur: 600, holdDur: 600,
      question: 'Mit welcher Luft bremst der Anhänger – mit der Luft vom Lkw?',
      answer: 'Mit seiner eigenen Luft aus dem Behälter im Anhänger. Rot füllt den Behälter auf, gelb sagt nur, wie stark gebremst wird.',
      legend: 'Schema · vereinfacht',
      frames: [
        fr({ ...drive, tank: 0.55, msg: 'Fahren: Rot führt immer Luft und füllt den Behälter im Anhänger.', msgCol: C.red }, { hold: true,
          cap: 'Rot = Vorratsleitung: Sie führt immer Luft. Über das Anhängerbremsventil füllt sie den Behälter im Anhänger.',
          note: '▶ Sagen: „Links der Lkw, rechts der Anhänger. Beim Fahren fließt ständig Luft durch die rote Leitung – die Vorratsleitung. Sie füllt den Luftbehälter im Anhänger. Die gelbe Leitung ist leer.“\n❓ Frage auf der Folie stellen.\n✅ Rot = Vorratsleitung (ständig Druck), gelb = Bremsleitung (nur beim Bremsen): DGUV I 214-080; Prüfungsfragen 2.7.07-319/-320. Anhängersteuerventil wird aus Kreis 3 versorgt (Lehrbuchwissen).\n🖱 Klick: Die Luft fließt weiter, dann tritt der Fahrer auf die Bremse (läuft von selbst).\n➜ „Und jetzt bremst der Fahrer.“' }),
        fr({ ...drive, tank: 0.8, msg: 'Fahren: Rot führt immer Luft und füllt den Behälter im Anhänger.', msgCol: C.red }),
        fr({ ...drive, tank: 1, msg: 'Der Behälter ist voll.', msgCol: C.red }),
        fr({ ...brake, tank: 0.9, hi: 'asv', msg: 'Bremsen: Das Anhängersteuerventil gibt Druck auf gelb.', msgCol: C.am }),
        fr({ ...brake, tank: 0.85, hi: 'abv', msg: 'Gelb meldet den Bremswunsch. Das Anhängerbremsventil schickt Luft aus dem Behälter in die Zylinder.', msgCol: C.am }, { hold: true, answer: true,
          cap: 'Gelb = Bremsleitung: Druck nur beim Bremsen. Das Anhängerbremsventil nimmt Luft aus dem eigenen Behälter und schickt sie in die Bremszylinder.',
          note: '▶ „Der Fahrer bremst. Das Anhängersteuerventil im Lkw gibt Druck auf die gelbe Leitung – je stärker das Pedal, desto mehr Druck. Am Anhänger öffnet das Anhängerbremsventil: Es schickt Luft aus dem eigenen Behälter in die Bremszylinder. Der Anhänger bremst mit seiner eigenen Luft. Rot füllt den Behälter gleich wieder auf.“\n❓ Frage auf der Folie auflösen.\n✅ Lehrbuchwissen (Haldex Trailer Application Guide; ZF): Anhängerbremsventil füllt über ein Rückschlagventil den Behälter aus rot und steuert bei Druck in gelb Vorratsluft in die Zylinder. Heute oft im EBS-Modulator.\n💡 Viele Anhängersteuerventile haben eine Voreilung: Der Anhänger bremst einen Tick früher, damit der Zug gestreckt bleibt (Thema in CE3).\n🖱 Klick: Pedal los (läuft von selbst).\n➜ „Und wenn der Fahrer das Pedal loslässt?“' }),
        fr({ ...drive, tank: 0.9, msg: 'Pedal los: Gelb wird leer, die Bremse löst.', msgCol: C.gr }),
        fr({ ...drive, tank: 1, msg: 'Bis zur nächsten Bremsung ist der Behälter wieder voll.', msgCol: C.gr }, { hold: true,
          cap: 'Pedal los: Gelb wird leer, die Zylinder lösen. Rot füllt den Behälter wieder auf.',
          note: '▶ „Pedal los: Die gelbe Leitung wird leer, die Bremszylinder lösen. Und rot füllt den Behälter wieder auf. So geht das bei jeder Bremsung.“\n✅ Lehrbuchwissen (siehe oben).\n🖱 Nächster Klick: nächste Folie.\n➜ „Wer macht was?“' }),
      ],
      scene: async (s, t) => schema(s, t),
    });
  }

  await ask(deck, 'ce2z', {
    kicker: 'Zum Merken', q: 'Wer macht was in der Druckluftbremse?', ico: 'LuCog', qsize: 34,
    answers: [
      ['LuTruck', 'Anhängersteuerventil (im Lkw)', 'gibt Vorratsluft auf rot und Bremsdruck auf gelb – gesteuert vom Pedal und von der Feststellbremse.', C.or, 17],
      ['LuCog', 'Anhängerbremsventil (am Anhänger)', 'füllt den Behälter aus rot und schickt beim Bremsen Luft in die Zylinder.', C.or, 17],
      ['LuDatabase', 'Luftbehälter (am Anhänger)', 'die eigene Luft für die Bremse des Anhängers.', C.gr, 17],
      ['LuScale', 'ALB oder EBS', 'passt den Bremsdruck an die Beladung an – mehr dazu in CE3.', C.gr, 17],
    ],
    notes:
      '▶ Sagen: „Die vier wichtigsten Teile. Schreibt sie euch auf.“\n' +
      '🖱 Klick 1–4: je ein Bauteil.\n' +
      '✅ Lehrbuchwissen (Haldex Trailer Application Guide; ZF). Prüfungsfrage 2.7.06-321: Feststellbremse im Lkw → Anhänger wird über die Betriebsbremse mit Druckluft gebremst. ALB = automatisch lastabhängige Bremskraftregelung (CE3).\n' +
      '➜ „Wie prüft ihr, ob das Anhängerbremsventil arbeitet?“',
  });
  quizWide(deck, 'ce2z', {
    kicker: 'Prüfungsfrage 2.7.02-303', q: 'Woran können Sie nach dem Lösen der Feststellbremse erkennen, ob das Anhängerbremsventil arbeitet (Luftbehälter gefüllt)?', size: 26, osize: 16,
    opts: ['Beim Abkuppeln der Vorratsleitung (roter Kupplungskopf) gehen die Kolben der Bremszylinder des Anhängers in Bremsstellung', 'Sind Vorrats- und Bremsleitung angekuppelt, gehen die Kolben der Bremszylinder des Anhängers beim Betätigen des Bremspedals in Bremsstellung', 'Beim Abkuppeln der Bremsleitung (gelber Kupplungskopf) gehen die Kolben der Bremszylinder des Anhängers ohne Betätigung des Bremspedals in Bremsstellung'], ok: [0, 1],
    why: 'Rot ab → der Anhänger bremst selbst. Gelb ab → ohne Pedal passiert nichts.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.02-303: A und B.\n💡 Praxis: So macht ihr die Funktionsprobe – mit Keilen gesichert und mit einem Helfer, der schaut.\n➜ „Kapitel 4: Was passiert, wenn eine Leitung reißt?“',
  });
};
module.exports.quizWide = quizWide;
