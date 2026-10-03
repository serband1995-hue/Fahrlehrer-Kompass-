// Abend 7 · CE4: Abschluss (Mitschreiben, Quiz, Das nimmst du mit) und Ende der Klasse CE
const { C, sec, quiz, write, takeaway, base } = require('../gs');

sec('ce4e', 'CE4  ·  ABSCHLUSS', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  write(deck, 'ce4e', {
    ttl: 'Fahren mit Zügen', labelW: 3.0, size: 17,
    rows: [
      ['Abfahrtkontrolle', 'Kupplung · Leitungen mit ABS-Stecker · Anhänger frei · Licht · Bremsprobe'],
      ['Wo blockiert es?', 'Lkw blockiert → Zug knickt ein · Anhänger blockiert → bricht aus'],
      ['Pendeln', 'Gas weg, Lenkrad ruhig halten, erst gestreckt bremsen'],
      ['Rückwärts', 'Sattelzug: Lenkrad links → Aufliegerheck rechts · Einweiser weg → Stopp'],
      ['Rechts abbiegen', 'Anhänger schneidet die Kurve · innerorts Schrittgeschwindigkeit'],
      ['Winter', 'Ketten höchstens 50 · Sicht unter 50 m: 50 und über 7,5 t nicht überholen'],
      ['Tempo mit Anhänger', 'innerorts 50 · Landstraße 60 · Autobahn 80 · Zeichen 277: Zug-Summe'],
      ['Abstand', 'außerorts Platz zum Einscheren (Zug über 7 m) · Autobahn mindestens 50 m'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus CE4.“\n🖱 Klick 1–8: je eine Zeile.\n💡 Erst das Stichwort vorlesen und fragen: „Wer weiß es?“ – dann klicken.\n✅ Quellen: DGUV Grundsatz 314-002; Prüfungsfragen 2.7.06-107, -108, -314, 2.6.03-102, -001, 2.7.01-310, 2.2.09-201; § 3, § 4, § 5, § 9 Abs. 6, § 18 StVO; StVO Anlage 2 lfd. Nr. 53–54.\n➜ „Drei Prüfungsfragen.“',
  });
  await quiz(deck, 'ce4e', {
    kicker: 'Prüfungsfrage 2.2.23-212', q: 'Wie kann die Gefährdung, die vom toten Winkel ausgeht, reduziert werden?', size: 32, osize: 18,
    opts: ['Durch Beobachtung des rückwärtigen Verkehrs in kurzen Zeitabständen', 'Erst abbiegen, wenn sichergestellt ist, dass sich neben dem Fahrzeug kein Verkehrsteilnehmer befindet', 'Durch zügiges Abbiegen'], ok: [0, 1],
    why: 'Zügig ist falsch – langsam und mit Blick in die Spiegel bis zum Schluss.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.23-212: A und B.\n➜ „Nächste Frage.“',
  });
  await quiz(deck, 'ce4e', {
    kicker: 'Prüfungsfrage 2.2.05-202', q: 'Sie fahren außerorts. Starker Regen schränkt die Sicht auf knapp 50 m ein. Was gilt in dieser Situation?', size: 30, osize: 18,
    opts: ['Mit Kraftfahrzeugen über 7,5 t zulässiger Gesamtmasse ist das Überholen verboten', 'Die zulässige Höchstgeschwindigkeit beträgt 50 km/h', 'Die Nebelschlussleuchte muss eingeschaltet werden'], ok: [0, 1],
    why: 'Die Nebelschlussleuchte ist nur bei Nebel unter 50 m Sicht erlaubt – bei Regen nicht.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.05-202: A und B. § 5 Abs. 3a, § 3 Abs. 1, § 17 Abs. 3 StVO.\n➜ „Letzte Frage.“',
  });
  await quiz(deck, 'ce4e', {
    kicker: 'Prüfungsfrage 2.2.04-306', q: 'Welche Kraftfahrzeuge müssen außerhalb geschlossener Ortschaften in der Regel einen so großen Abstand zum vorausfahrenden Fahrzeug einhalten, dass ein überholendes Kraftfahrzeug einscheren kann?', size: 26, osize: 18,
    opts: ['Lastkraftwagen über 3,5 t zulässiger Gesamtmasse', 'Fahrzeugkombinationen, die länger als 7 m sind', 'Kraftfahrzeuge bis 3,5 t zulässiger Gesamtmasse'], ok: [0, 1],
    why: 'Euer Zug ist beides: Lkw über 3,5 t und länger als 7 m.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.04-306: A und B. § 4 Abs. 2 StVO.\n➜ „Das nimmst du aus CE4 mit.“',
  });
  await takeaway(deck, 'ce4e', {
    items: [
      ['LuClipboardCheck', 'Rundgang:', 'vor jeder Schicht und nach jedem Kuppeln einmal um den ganzen Zug.'],
      ['LuWaves', 'Gestreckt bremsen:', 'vor der Kurve, nicht in der Kurve. Pendelt der Anhänger: Gas weg, ruhig halten.'],
      ['LuUndo2', 'Rückwärts:', 'Der Auflieger lenkt andersrum. Einweiser nicht mehr zu sehen = sofort anhalten.'],
      ['LuBike', 'Rechts abbiegen:', 'Der Anhänger schneidet die Kurve. Schritt fahren, Spiegel bis zum Schluss.'],
      ['LuGauge', 'Zahlen:', '50 – 60 – 80 km/h, Ketten 50, Autobahn-Abstand 50 m. Zeichen 277 zählt den ganzen Zug.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus CE4, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Und damit ist die Theorie für Klasse CE geschafft.“',
  });
  // ===== ENDE =====
  {
    const s = base(deck, 'ce4e', { bg: 'm_titel_r.jpg', bgX: 3.3, ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 7 – und damit die ganze Theorie für Klasse CE. Ihr wisst jetzt, wie ein Zug bremst, wie ihr ihn sicher abstellt und wie ihr mit ihm fahrt: rückwärts, beim Abbiegen, im Winter. Jetzt heißt es: Prüfungsfragen üben und in der Praxis umsetzen. Danke fürs Mitmachen und viel Erfolg in der Prüfung!“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen. Als Hausaufgabe die Prüfungsfragen 2.7.06 (Bremsen), 2.6.03 (Anhänger) und 2.2.04/2.2.05 (Abstand, Überholen) üben.\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.6, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Klasse CE geschafft!', { x: 0.7, y: 1.7, w: 4.9, h: 1.8, size: 46, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 900 });
    s.text('Abend 7: CE3 Lastzugbremsen · CE4 Fahren mit Zügen', { x: 0.7, y: 3.6, w: 4.8, h: 0.8, size: 18, color: C.or }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Jetzt seid ihr dran:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'Prüfungsfragen üben', options: { color: C.txt, breakLine: true } }, { text: 'in der Praxis umsetzen', options: { color: C.txt, breakLine: true } }, { text: 'Viel Erfolg in der Prüfung!', options: { color: C.or, bold: true } }], { x: 0.7, y: 4.65, w: 4.9, h: 1.7, size: 16 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
