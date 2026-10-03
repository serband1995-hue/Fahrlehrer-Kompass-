// Abend 6 · CE2: Kapitel 4 Wenn eine Leitung reißt (rot reißt, gelb reißt – fließend im Schema), andere Fehler
const { C, sec, chapter, motion, ask, quiz } = require('../gs');
const { schema } = require('../ce2schema');

sec('ce2b', 'CE2  ·  WENN EINE LEITUNG REISST', C.red, 'bg_red.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce2b', { num: 4, ttl: 'Wenn eine Leitung reißt', sub: 'Rot oder gelb – am Ende bremst der Anhänger selbst. Nur der Zeitpunkt ist verschieden.', ico: 'LuUnlink', notes:
    '▶ Sagen: „Was passiert, wenn eine Leitung reißt – zum Beispiel weil sie scheuert oder weil Eis von der Plane fällt? Das ist eine der häufigsten Prüfungsfragen.“\n🖱 Keine Klicks.\n➜ „Zuerst: Die rote Leitung reißt.“' });

  // ===== ROT REISST =====
  {
    let ph = 0;
    const fr = (t, o = {}) => ({ ...o, t: { ...t, ph: ph++ } });
    const drive = { red: 'flow', yel: 'empty', fill: true, tank: 1 };
    await motion(deck, 'ce2b', {
      kicker: 'Rot reißt', ttl: 'Die Vorratsleitung reißt', dur: 600, holdDur: 650,
      question: 'Auf der Autobahn reißt die rote Leitung ab. Was passiert mit Anhänger und Lkw?',
      answer: 'Der Anhänger bremst sofort selbst – mit Luft aus seinem Behälter, der gegen die Leitung abgesperrt wird. Der Lkw bremst nicht automatisch.',
      legend: 'Schema · vereinfacht',
      frames: [
        fr({ ...drive, msg: 'Fahren: Rot führt Luft, gelb ist leer.', msgCol: C.mut }, { hold: true,
          cap: 'Der Zug fährt. Rot füllt den Behälter, gelb ist leer.',
          note: '▶ Sagen: „Der Zug fährt auf der Autobahn. Rot führt Luft, der Behälter im Anhänger ist voll.“\n❓ Frage auf der Folie stellen.\n🖱 Klick: Die rote Leitung reißt (läuft von selbst weiter).\n➜ „Und jetzt – rot reißt ab.“' }),
        fr({ ...drive }),
        fr({ red: 'brk', yel: 'empty', tank: 1, rv: 'zu', hi: 'abv', msg: 'Rot reißt ab: Der Druck in rot fällt sofort.', msgCol: C.red }),
        fr({ red: 'brk', yel: 'empty', tank: 0.9, rv: 'zu', hi: 'abv', sup: true, brk: true, cyl: 1, msg: 'Das Anhängerbremsventil bremst den Anhänger – mit Luft aus dem eigenen Behälter.', msgCol: C.red }, { hold: true,
          cap: 'Rot ist leer: Das Anhängerbremsventil schaltet auf Notbremsung. Es sperrt den Behälter gegen die gerissene Leitung ab und schickt seine Luft in die Zylinder.',
          note: '▶ „Rot reißt – der Druck fällt sofort. Das Anhängerbremsventil merkt das. Es macht zwei Dinge: Es sperrt den Behälter gegen die gerissene Leitung ab, damit die Luft nicht verloren geht. Und es schickt die Luft aus dem Behälter in die Bremszylinder. Der Anhänger bremst sofort von selbst.“\n✅ Prüfungsfrage 2.7.02-302: Das Anhängerbremsventil leitet eine Bremsung des Anhängers ein und schließt den Anhängerluftvorrat gegen die unterbrochene Vorratsleitung ab. § 41 Abs. 9 StVZO: Trennt sich der Anhänger, muss er selbsttätig zum Stehen kommen.\n💡 Bei manchen neuen Anhängern (z. B. mit ZF iEBS) greifen beim Abriss von rot zusätzlich die Federspeicher. In der Prüfung zählt: Das Anhängerbremsventil bremst und sperrt den Vorrat ab (2.7.02-302). Beim Abstellen trotzdem immer roter Knopf und Keile.\n🖱 Klick: Und der Lkw?\n➜ „Bremst der Lkw jetzt auch?“' }),
        fr({ red: 'brk', yel: 'empty', tank: 0.75, rv: 'zu', sup: true, brk: true, cyl: 1, msg: 'Der Lkw bremst nicht automatisch. Warnblinker an, kontrolliert anhalten.', msgCol: C.or }, { hold: true, answer: true,
          cap: 'Der Lkw bremst nicht von selbst. Ihr merkt, dass der Anhänger bremst: Warnblinker an, kontrolliert anhalten, Zug sichern.',
          note: '▶ „Und der Lkw? Der bremst nicht automatisch – das ist die Falle in der Prüfung. Ihr merkt aber, dass der Anhänger bremst. Warnblinker an, kontrolliert anhalten, Zug sichern.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.02-302 (falsch: „löst beim Zugfahrzeug automatisch eine Bremsung aus“).\n💡 Die Notbremsung ist nur ein Mindestschutz: Die Bremsvorschriften (UN-R 13; über § 41 Abs. 18 StVZO die RL 71/320/EWG, Anhang II) verlangen dafür nur eine schwache Mindestwirkung (13,5 % der Gewichtskraft). Und die Luft im Behälter hält nicht ewig. Darum einen abgestellten Anhänger immer mit rotem Knopf und Keilen sichern.\n🖱 Nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage.“' }),
      ],
      scene: async (s, t) => schema(s, t),
    });
  }
  await quiz(deck, 'ce2b', {
    kicker: 'Prüfungsfrage 2.7.02-302', q: 'Welche Auswirkung hat ein Bruch der Vorratsleitung zum Anhänger bei einer Zweileitungs-Bremsanlage? Das Anhängerbremsventil …', size: 26,
    opts: ['… leitet eine Bremsung des Anhängers ein', '… schließt den Anhängerluftvorrat gegen die unterbrochene Vorratsleitung ab', '… löst beim Zugfahrzeug automatisch eine Bremsung aus'], ok: [0, 1],
    why: 'Der Anhänger bremst selbst und hält seine Luft fest. Der Lkw bremst nicht automatisch.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.02-302: A und B.\n➜ „Und wenn gelb reißt?“',
  });

  // ===== GELB REISST =====
  {
    let ph = 0;
    const fr = (t, o = {}) => ({ ...o, t: { ...t, ph: ph++ } });
    await motion(deck, 'ce2b', {
      kicker: 'Gelb reißt', ttl: 'Die Bremsleitung reißt', dur: 600, holdDur: 650,
      question: 'Die gelbe Leitung ist abgerissen. Merkt ihr das beim Fahren?',
      answer: 'Nein – erst beim Bremsen. Dann entlüftet der Lkw die rote Leitung, und der Anhänger wird notgebremst.',
      legend: 'Schema · vereinfacht',
      frames: [
        fr({ red: 'flow', yel: 'brk', fill: true, tank: 1, msg: 'Gelb ist abgerissen – aber gelb ist beim Fahren leer. Nichts passiert.', msgCol: C.am }, { hold: true,
          cap: 'Gelb führt beim Fahren keine Luft. Darum fällt ein Riss zuerst gar nicht auf.',
          note: '▶ Sagen: „Jetzt reißt die gelbe Leitung. Beim Fahren ist sie leer – es passiert gar nichts. Ihr merkt es nicht.“\n❓ Frage auf der Folie stellen.\n✅ Lehrbuchwissen: Die Bremsleitung führt nur beim Bremsen Druck.\n🖱 Klick: Der Fahrer bremst.\n➜ „Bis ihr bremst.“' }),
        fr({ red: 'flow', yel: 'leak', fill: true, tank: 1, pedal: 1, lkwB: 1, hi: 'asv', msg: 'Bremsen: Die Luft aus gelb zischt an der Bruchstelle ins Freie.', msgCol: C.am }, { hold: true,
          cap: 'Der Fahrer bremst. Die Luft für gelb zischt an der Bruchstelle heraus – beim Anhänger kommt kein Bremssignal an.',
          note: '▶ „Jetzt bremst ihr. Das Anhängersteuerventil gibt Druck auf gelb – aber die Luft zischt an der Bruchstelle heraus. Beim Anhänger kommt nichts an.“\n🖱 Klick: Das Anhängersteuerventil reagiert (läuft von selbst weiter).\n➜ „Was macht der Lkw jetzt?“' }),
        fr({ red: 'empty', yel: 'leak', tank: 1, pedal: 1, lkwB: 1, rv: 'zu', vent: 1, hi: 'asv', msg: 'Das Anhängersteuerventil entlüftet die rote Leitung.', msgCol: C.red }),
        fr({ red: 'empty', yel: 'leak', tank: 0.85, pedal: 1, lkwB: 1, rv: 'zu', vent: 1, vksv: 1, sup: true, brk: true, cyl: 1, hi: 'abv', msg: 'Rot ist leer: Der Anhänger wird notgebremst. Der Lkw bremst normal weiter.', msgCol: C.red }, { hold: true, answer: true,
          cap: 'Das Anhängersteuerventil entlüftet rot. Für den Anhänger ist das wie ein Abriss: Er wird notgebremst. Der Lkw bremst normal weiter.',
          note: '▶ „Das Anhängersteuerventil merkt den Druckverlust. Es entlüftet die rote Leitung. Für den Anhänger sieht das aus wie ein Abriss von rot: Er wird notgebremst. Der Lkw bremst ganz normal weiter – seine Kreise schützt das Vierkreisschutzventil.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.06-317: Das Vierkreisschutzventil sichert den Sicherungsdruck für die Betriebsbremsanlage des Zugfahrzeugs; die Vorratsleitung wird automatisch entlüftet und der Anhänger wird gebremst (falsch: Betriebsbremse des Anhängers fällt aus).\n🖱 Nächster Klick: nächste Folie.\n➜ „Prüfungsfrage.“' }),
      ],
      scene: async (s, t) => schema(s, t),
    });
  }
  await quiz(deck, 'ce2b', {
    kicker: 'Prüfungsfrage 2.7.06-317', q: 'Welche Auswirkung hat der Abriss des Bremsschlauchs mit gelbem Kupplungskopf zwischen Zugfahrzeug und Anhänger beim Bremsen?', size: 26, osize: 17,
    opts: ['Das Vierkreisschutzventil sichert den Sicherungsdruck für die Betriebsbremsanlage des Zugfahrzeugs', 'Die Vorratsleitung wird automatisch entlüftet und der Anhänger wird gebremst', 'Die Betriebsbremsanlage des Anhängers fällt aus'], ok: [0, 1],
    why: 'Gelb reißt → beim Bremsen wird rot entlüftet → der Anhänger wird notgebremst.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-317: A und B.\n➜ „Was kann noch passieren?“',
  });
  await ask(deck, 'ce2b', {
    kicker: 'Andere Fehler', q: 'Was kann den Leitungen sonst passieren – und was tut ihr?', ico: 'LuTriangleAlert', qsize: 32,
    answers: [
      ['LuCable', 'Leitungen scheuern oder hängen durch', 'Vor jeder Fahrt prüfen: frei, dicht, Dichtringe heil, in Kurven nicht zu straff.', C.red, 17],
      ['LuMountainSnow', 'Eis auf der Plane', 'Beim Bremsen rutscht es nach vorn – es kann Luft- und Stromleitungen abreißen.', C.red, 17],
      ['LuDisc', 'Bremsleitung am Lkw-Rad bricht', 'Der Lkw bremst schwächer, der Anhänger bremst normal weiter.', C.red, 17],
      ['LuCircleParking', 'Notbremsung ist kein Parken', 'Abgestellt wird nur mit Feststellbremse (roter Knopf) und Keilen.', C.or, 17],
    ],
    notes:
      '▶ Sagen: „Was kann den Leitungen sonst passieren?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Fehler.\n' +
      '✅ DGUV I 214-080, S. 63–65 (Leitungen prüfen: nicht scheuern, nicht durchhängen, Dichtringe). Prüfungsfrage 2.2.23-302: herabfallendes Eis kann beim Bremsen Luft- und Elektroleitungen stark beschädigen. Prüfungsfrage 2.7.06-319: Bremsleitung am rechten Vorderrad bricht → Anhänger-Betriebsbremse bleibt voll funktionsfähig, Bremsleistung des Zugfahrzeugs eingeschränkt. DGUV I 214-080, S. 33: Anhänger nie nur mit der Notbremsfunktion abstellen.\n' +
      '➜ „Kapitel 5: Wie bewegt man einen abgekuppelten Anhänger?“',
  });
};
