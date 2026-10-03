// Abend 6 · CE1: Kapitel 5 Gewichte und Führerschein (Achslast-Waage, Rechnen nach StVZO, Anhängelast, C1E oder CE) + Abschluss CE1 + Pause
const { C, sec, base, chapter, steps, ask, quiz, write, takeaway, lkw, auflieger, anhaenger, seg } = require('../gs');

const GOLD = 'C9A227';
sec('ce1g', 'CE1  ·  GEWICHTE UND FÜHRERSCHEIN', GOLD, 'bg_am.jpg');
sec('ce1e', 'CE1  ·  ABSCHLUSS', C.bl, 'bg_blue.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce1g', { num: 5, ttl: 'Gewichte und Führerschein', sub: 'Wie schwer darf der Zug werden – und wann reicht C1E, wann braucht ihr CE?', ico: 'LuScale', notes:
    '▶ Sagen: „Letztes Kapitel vor der Pause: Gewicht. Wie schwer darf jede Achse und der ganze Zug sein? Und welche Klasse braucht ihr für welchen Zug?“\n✅ § 34 StVZO, § 42 StVZO, § 6 FeV.\n🖱 Keine Klicks.\n➜ „Wir stellen den Sattelzug auf die Waage.“' });

  // ===== ACHSLAST-WAAGE =====
  {
    const x0 = 5.95, K = 0.42, GY = 4.0, xm = m => x0 + m * K;
    const AX = [{ x: xm(1.35), n: 'Lenkachse', max: 10 }, { x: xm(5.05), n: 'Antriebsachse', max: 11.5 }, { x: xm(2.9 + 9.2), n: 'Dreifachachse', max: 24, sub: 'max. 24 t (Abstand über 1,3 m)' }];
    const ST = [
      { w: [5.2, 3.6, 5.7], pal: 0, info: 'Jede Achse hat ihre eigene Grenze: Lenkachse 10 t, Antriebsachse 11,5 t, Dreifachachse 21 t – bei mehr als 1,30 m Achsabstand 24 t. Es gilt immer der kleinere Wert aus Gesetz und Fahrzeugschein.' },
      { w: [7.5, 11.5, 21.0], pal: 1, info: 'Mehr als 4 Achsen: höchstens 40 t. 44 t nur im Kombinierten Verkehr – auf dem Weg zum oder vom Bahnhof oder Hafen, mit Nachweis.' },
      { w: [7.7, 12.6, 22.7], pal: 2, info: 'Mehr als 5 % zu schwer (hier 7,5 %): 80 € und 1 Punkt für den Fahrer – ab 10 % wird es teurer. Dazu: längerer Bremsweg, heiße Bremsen.' },
    ];
    const f1 = v => v.toFixed(1).replace('.', ',');
    await steps(deck, 'ce1g', {
      kicker: 'Achslasten', ttl: 'Der Zug auf der Waage',
      list: ['Leer', 'Beladen: 40 t', 'Überladen: 43 t'],
      ask: { q: 'Euer Sattelzug hat 5 Achsen. Wie schwer darf er insgesamt sein?', a: '40 t. 44 t nur im Kombinierten Verkehr (zum oder vom Bahnhof oder Hafen) – mit Nachweis.', at: 1 },
      caps: [
        'Leer wiegt der Sattelzug etwa 14,5 t. Unter jeder Achse steht eine Waage.',
        'Beladen: 7,5 + 11,5 + 21,0 = 40,0 t. Jede Achse hält ihre Grenze – und die Summe genau 40 t.',
        'Zwei Paletten mehr: 43 t. Die Antriebsachse ist zu schwer – und der ganze Zug auch.',
      ],
      notes: [
        '▶ Sagen: „Wir stellen unseren Sattelzug auf eine Waage – unter jeder Achse eine. Leer wiegt er etwa 14,5 Tonnen. Jede Achse hat ihre eigene Grenze.“\n❓ Frage auf der Folie stellen.\n✅ § 34 Abs. 4 StVZO: Einzelachse 10 t, angetriebene Einzelachse 11,5 t, Dreifachachse 21 t (Abstände bis 1,3 m) bzw. 24 t (über 1,3 bis 1,4 m). Es gilt immer der kleinere Wert aus Gesetz und Zulassungsbescheinigung (§ 34 Abs. 2 und 3). Leergewicht: Beispielwert.\n➜ „Jetzt wird beladen.“',
        '▶ „Beladen: 7,5 plus 11,5 plus 21 – genau 40 Tonnen. Jede Achse hält ihre Grenze, die Summe auch. Mehr als 4 Achsen: höchstens 40 Tonnen.“\n❓ Frage auf der Folie auflösen.\n✅ § 34 Abs. 6 Nr. 5 StVZO: Züge und Sattelkraftfahrzeuge mit mehr als 4 Achsen 40 t. § 34 Abs. 6 Nr. 6 (intermodal, Container oder Wechselaufbauten bis 45 Fuß: 2 + 3 Achsen 42 t, 3 + 2/3 Achsen 44 t) und 53. StVZAusnV § 1 (44 t im Vor- und Nachlauf des Kombinierten Verkehrs: nächstgelegener geeigneter Bahnhof bzw. Hafen bis 150 km Luftlinie; Nachweis mitführen). Ausnahme E-Lkw: bis 2 t mehr für den Antrieb (§ 34 Abs. 6a StVZO). In der Prüfung: 40 t. Prüfungsfrage 2.6.06-302: 40 t. Achslasten: eigene Beispielrechnung.\n➜ „Und wenn noch zwei Paletten dazukommen?“',
        '▶ „Zwei Paletten mehr – 43 Tonnen. Die Antriebsachse trägt jetzt 12,6 Tonnen: zu viel. Und der Zug ist 3 Tonnen zu schwer. Das sind mehr als 5 Prozent: 80 Euro und ein Punkt – für den Fahrer.“\n✅ BKatV Nr. 198.1 (Tabelle 3): Überschreitung der zulässigen Achslast oder Gesamtmasse bei Kfz über 7,5 t bzw. Kfz mit Anhänger über 2 t – mehr als 5 bis 10 %: 80 € und 1 Punkt (ab 10 %: 110 €, ab 15 %: 140 €, ab 20 %: 190 €, ab 25 %: 285 €, ab 30 %: 380 €; 2 bis 5 %: 30 € ohne Punkt); der Halter zahlt zusätzlich (Nr. 199). Punkte: FeV Anlage 13 Nr. 3.5.5. Eigene Beispielrechnung: 43 t ÷ 40 t = 7,5 % zu viel; Antriebsachse 12,6 ÷ 11,5 = 9,6 % zu viel.\n💡 Prüfungsfrage 2.2.22-301: Lkw beladen, Anhänger leer ist sicherer als umgekehrt.\n➜ „Eine Prüfungsfrage.“',
      ],
      legend: 'Seitenansicht · Beispielwerte',
      scene: async (s, i) => {
        const t = ST[i], sum = t.w[0] + t.w[1] + t.w[2], over = sum > 40.05;
        await lkw(s, { L: 5.9, box: 'none', axles: [1.35, 5.05], sattel: 4.5, floor: 1.0, r: 0.5, cabL: 2.3, cabTop: 3.7, top: 3.8 }, { x: x0, gy: GY, k: K, name: '!!zm' });
        await auflieger(s, { L: 13.6, kp: 1.6, lg: 3.4, floor: 1.34, boxH: 2.6, r: 0.5, axles: [7.89, 9.2, 10.51] }, { x: xm(2.9), gy: GY, k: K, name: 'af' });
        // Paletten (Blick in den Aufbau)
        const py = GY - 1.34 * K, ph = 1.18 * K, pw = 1.08 * K;
        for (let k = 0; k < 11; k++) {
          const px = xm(2.9 + 0.25 + k * 1.2);
          s.rrect(px, py - ph, pw, ph, { fill: 'B98A4E', ft: t.pal ? 0 : 100, line: t.pal ? '8A6334' : undefined, lw: 0.75, rr: 0.05, name: '!!pa' + k });
        }
        for (let k = 0; k < 2; k++) {
          const px = xm(2.9 + 0.25 + (4 + k) * 1.2);
          s.rrect(px, py - 2 * ph - 0.02, pw, ph, { fill: 'D9534F', ft: t.pal === 2 ? 0 : 100, line: t.pal === 2 ? 'A33A36' : undefined, lw: 0.75, rr: 0.05, name: '!!px' + k });
        }
        // Waagen
        AX.forEach((a, k) => {
          const bad = t.w[k] > a.max + 0.001, col = bad ? C.red : (t.pal ? C.gr : C.txt);
          s.rect(a.x - 0.62, GY + 0.02, 1.24, 0.06, { fill: '5A6474', name: '!!wp' + k });
          const bw = a.sub ? 2.0 : 1.36;
          s.rrect(a.x - bw / 2, GY + 0.16, bw, 0.82, { fill: bad ? '3A1418' : '0B1119', line: bad ? C.red : '3C4656', lw: 1.5, rr: 0.1, name: '!!wb' + k });
          s.text(f1(t.w[k]) + ' t', { x: a.x - bw / 2, y: GY + 0.18, w: bw, h: 0.46, size: 22, bold: true, color: col, align: 'center', valign: 'middle', name: '!!wv' + k });
          s.text(a.n + '\n' + (a.sub || 'max. ' + f1(a.max).replace(',0', '') + ' t'), { x: a.x - 1.0, y: GY + 0.6, w: 2.0, h: 0.38, size: 10, color: C.mut, align: 'center', valign: 'middle', lsm: 0.9, name: '!!wn' + k });
        });
        // Summe
        s.text([{ text: 'Summe  ', options: { color: C.mut, fontSize: 20 } }, { text: f1(sum) + ' t', options: { bold: true, color: over ? C.red : (t.pal ? C.gr : C.txt) } }], { x: 7.6, y: 1.42, w: 5.45, h: 0.62, size: 36, align: 'right', valign: 'middle', name: '!!sum' });
        s.text(over ? 'erlaubt: 40 t  →  3 t zu viel!' : 'erlaubt: 40 t', { x: 7.6, y: 2.0, w: 5.45, h: 0.32, size: 15, bold: over, color: over ? C.red : C.mut, align: 'right', name: '!!sumn' });
        s.text(t.info, { x: 5.75, y: 5.3, w: 7.3, h: 1.3, size: 15, color: C.txt, valign: 'top', name: '!!info' });
      },
    });
  }
  await quiz(deck, 'ce1g', {
    kicker: 'Prüfungsfrage 2.6.06-302', q: 'Welche zulässige Gesamtmasse darf ein Sattelkraftfahrzeug (zweiachsige Zugmaschine, dreiachsiger Sattelanhänger, kein kombinierter Verkehr) höchstens haben?', size: 26,
    opts: ['40 t', '38 t', '44 t'], ok: [0],
    why: 'Mehr als 4 Achsen: 40 t. 44 t gibt es nur im Kombinierten Verkehr.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.06-302: A. Gleiches gilt für Lkw (2 Achsen) mit Anhänger (3 Achsen): 2.6.06-304 → 40 t.\n➜ „Und wie rechnet man das beim Sattelzug?“',
  });

  // ===== RECHNEN NACH STVZO =====
  await ask(deck, 'ce1g', {
    kicker: 'Rechnen', q: 'Sattelzug mit 5 Achsen, kein Kombinierter Verkehr: Zugmaschine 25 t, Auflieger 34 t, Sattellast 16 t. Wie viel darf er wiegen?', ico: 'LuCalculator', qsize: 26,
    answers: [
      ['LuPlus', 'Addieren und Sattellast abziehen', '25 t + 34 t − 16 t = 43 t. Die Sattellast steckt in beiden Fahrzeugen – sie zählt nur einmal.', GOLD, 17],
      ['LuScale', 'Grenze prüfen', 'Mehr als 4 Achsen: höchstens 40 t. 43 t sind zu viel.', GOLD, 17],
      ['LuMinus', 'Also: 3 t weniger laden', 'Den Auflieger nicht voll beladen – sonst ist der Zug zu schwer.', C.red, 17],
      ['LuLink', 'Gliederzug: einfach addieren', 'Lkw + Anhänger. Zentralachsanhänger: minus Stützlast. Mehr als 4 Achsen: auch hier 40 t (mit 4 Achsen 36 t).', GOLD, 17],
    ],
    notes:
      '▶ Sagen: „Rechenaufgabe aus der Prüfung: Zugmaschine 25 Tonnen, Auflieger 34 Tonnen, Sattellast 16 Tonnen. Was darf der Zug wiegen?“\n' +
      '❓ Rechnen lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Schritt.\n' +
      '✅ § 34 Abs. 7 StVZO: Sattelzug = zGM Zugmaschine + zGM Auflieger − die höhere von Sattellast/Aufliegelast; Zug mit Zentralachsanhänger: Summe − höhere Stützlast; Gliederzug: Summe. Prüfungsfrage 2.6.06-306: zulässig, wenn mindestens 3 t Nutzlast weniger (eigene Rechnung: 25 + 34 − 16 = 43 → 40). Prüfungsfrage 2.6.06-305: zGM Zugmaschine plus zGM Auflieger minus Aufliegelast.\n' +
      '➜ „Und wie schwer darf ein Anhänger hinter dem Lkw sein?“',
  });
  await quiz(deck, 'ce1g', {
    kicker: 'Prüfungsfrage 2.6.03-301', q: 'Wie schwer darf ein Anhänger hinter einem Lkw mit 10 t zulässiger Gesamtmasse bei durchgehender Bremsanlage höchstens sein?', size: 28,
    opts: ['15 t', '10 t', '20 t'], ok: [0],
    why: 'Das 1,5-Fache der zulässigen Gesamtmasse des Lkw – und nie mehr, als der Hersteller erlaubt.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.03-301: A. § 42 Abs. 1 StVZO: Anhängelast hinter Lkw höchstens die zGM des Lkw, bei durchgehender Bremsanlage höchstens das 1,5-Fache (Prüfungsfrage 2.6.03-303) und nicht mehr als vom Hersteller angegeben. Anhängelast = tatsächlich gezogene Last (2.6.03-106).\n➜ „Und welche Klasse braucht ihr dafür?“',
  });

  // ===== C1E ODER CE =====
  {
    const GY = 3.55, K = 0.36, X = 6.1;
    const ST = [
      { l: '7,5 t', a: '4,5 t', sum: '12,0 t', b: 'C1E', col: C.gr, info: 'Der ganze Zug höchstens 12 t: Dafür reicht C1E.' },
      { l: '7,5 t', a: '5,0 t', sum: '12,5 t', b: 'CE', col: C.or, info: 'Mehr als 12 t: CE – auch wenn der Lkw nur 7,5 t hat.' },
      { l: '7,49 t', a: '4,8 t', sum: '12,29 t', b: 'CE', col: C.or, zaa: 1, info: 'Zentralachsanhänger: Beim Führerschein wird die Stützlast nicht abgezogen. Es zählt die volle Summe.' },
      { l: '12 t', a: '1,2 t', sum: '13,2 t', b: 'CE', col: C.or, small: 1, info: 'Lkw über 7,5 t (Klasse C) und Anhänger über 750 kg: immer CE.' },
    ];
    await steps(deck, 'ce1g', {
      kicker: 'Führerschein', ttl: 'C1E oder CE?',
      list: ['7,5 t + 4,5 t', '7,5 t + 5,0 t', 'Mit Zentralachsanhänger', 'Großer Lkw, kleiner Anhänger'],
      ask: { q: 'Reicht C1E für einen 7,49-t-Lkw mit 4,8-t-Zentralachsanhänger?', a: 'Nein. 12,29 t – beim Führerschein zählt die volle Summe. Ihr braucht CE.', at: 2 },
      caps: [
        'C1E: Zug aus C1-Lkw und Anhänger über 750 kg – zusammen höchstens 12 t.',
        'Eine halbe Tonne mehr am Anhänger – und schon ist es CE.',
        'Bei der StVZO wird die Stützlast abgezogen. Beim Führerschein nicht!',
        'CE schließt C1E, BE und T mit ein.',
      ],
      notes: [
        '▶ Sagen: „Welche Klasse braucht ihr? 7,5-Tonnen-Lkw und 4,5-Tonnen-Anhänger: zusammen 12 Tonnen. Das ist C1E.“\n❓ Frage auf der Folie stellen.\n✅ § 6 Abs. 1 FeV: C1E = C1-Zugfahrzeug + Anhänger oder Sattelanhänger über 750 kg, Zug-zGM höchstens 12.000 kg. Beispiel: eigene Rechnung.\n➜ „Und mit einem etwas schwereren Anhänger?“',
        '▶ „Anhänger 5 Tonnen: 12,5 Tonnen. Mehr als 12 – also CE.“\n✅ § 6 Abs. 1 FeV: CE = Zugfahrzeug der Klasse C + Anhänger oder Sattelanhänger über 750 kg (keine Obergrenze im Führerscheinrecht). Bei mehr als 12 t mit C1-Zugfahrzeug: CE. Eigene Rechnung.\n➜ „Jetzt die Fangfrage.“',
        '▶ „Die Fangfrage: 7,49 plus 4,8 Tonnen, Zentralachsanhänger. Manche ziehen die Stützlast ab. Beim Führerschein gilt aber: volle Summe der zulässigen Gesamtmassen. 12,29 Tonnen – also CE.“\n❓ Frage auf der Folie auflösen.\n✅ § 6 Abs. 1 Satz 2 FeV: zGM der Kombination = Summe der zGM der Einzelfahrzeuge, ohne Abzug von Stütz- oder Aufliegelast. Anders § 34 Abs. 7 StVZO (dort wird abgezogen).\n➜ „Und umgekehrt?“',
        '▶ „Großer Lkw, kleiner Anhänger: 12-Tonnen-Lkw ist Klasse C. Dazu ein Anhänger über 750 Kilogramm – das ist immer CE. Bis 750 Kilogramm Anhänger reicht C.“\n✅ § 6 Abs. 1 FeV: C (auch mit Anhänger bis 750 kg), CE (Anhänger über 750 kg). § 6 Abs. 3 Nr. 6 FeV: CE schließt C1E, BE und T ein. § 9 Abs. 2 FeV: CE nur mit Klasse C (Vorbesitz oder gleichzeitig).\n➜ „Das war CE1. Zum Mitschreiben.“',
      ],
      legend: 'Seitenansicht · schematisch · zulässige Gesamtmassen',
      scene: async (s, i) => {
        const t = ST[i];
        await lkw(s, { L: 7.0, box: 'koffer', boxH: 2.0, floor: 0.9, axles: [1.3, 5.4], hitch: true, cabL: 1.9, cabTop: 2.95, top: 3.1, r: 0.42 }, { x: X, gy: GY, k: K, name: '!!lk' });
        const ax = X + 8.0 * K;
        const tr = t.zaa ? { L: 5.0, axles: [2.2, 2.9], zaa: true, floor: 0.9, boxH: 1.9, r: 0.38 } : t.small ? { L: 3.0, axles: [1.5], zaa: true, floor: 0.75, boxH: 0.55, r: 0.3, box: 'pritsche' } : { L: 5.0, axles: [1.0, 4.0], floor: 0.9, boxH: 1.9, r: 0.38 };
        const a = await anhaenger(s, tr, { x: ax, gy: GY, k: K, name: 'ah' });
        seg(s, a.pivot[0], a.pivot[1], X + 7.02 * K, GY - 0.6 * K, { col: '3A4250', th: 0.05, name: '!!dei' });
        // Gewichtsschilder
        const tag = (x, txt, nm, sub) => {
          s.rrect(x - 0.75, 1.62, 1.5, 0.5, { fill: '0B1119', line: GOLD, lw: 1.5, rr: 0.3, name: '!!' + nm + 'b' });
          s.text(txt, { x: x - 0.75, y: 1.62, w: 1.5, h: 0.5, size: 20, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!' + nm + 't' });
          s.text(sub, { x: x - 1.0, y: 2.14, w: 2.0, h: 0.28, size: 11, color: C.mut, align: 'center', name: '!!' + nm + 's' });
        };
        tag(X + 3.5 * K, t.l, 'tl', 'Lkw');
        tag(ax + (t.small ? 1.5 : 2.5) * K, t.a, 'ta', t.zaa ? 'Zentralachsanhänger' : 'Anhänger');
        // Rechnung und Plakette
        s.text([{ text: t.l + '  +  ' + t.a + '  =  ', options: { color: C.txt } }, { text: t.sum, options: { bold: true, color: t.col } }], { x: 5.75, y: 3.85, w: 5.2, h: 0.65, size: 28, valign: 'middle', name: '!!eq' });
        s.text(t.b, { x: 11.15, y: 3.8, w: 1.9, h: 0.78, size: 36, bold: true, color: C.dark, fill: t.col, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle', name: '!!badge' });
        s.text(t.info, { x: 5.75, y: 4.85, w: 7.3, h: 1.0, size: 16, color: C.txt, valign: 'top', name: '!!info' });
      },
    });
  }

  // ===== ABSCHLUSS CE1 =====
  write(deck, 'ce1e', {
    ttl: 'Zusammenstellung von Zügen', labelW: 2.9, size: 17,
    rows: [
      ['Leitungen', 'ankuppeln: gelb, dann rot · abkuppeln: rot, dann gelb · rot nie allein'],
      ['Kupplung zu?', 'Kontrollstift ansehen und tasten – Anrucken reicht nicht'],
      ['Gefahrbereich', 'Lkw zum gesicherten Anhänger rangieren · niemand dazwischen'],
      ['Aufsatteln', 'höchstens 5 cm Luftspalt · danach kein Spalt, Sicherung eingefallen'],
      ['Längen', 'Sattelzug 16,50 m · Lkw mit Anhänger 18,75 m · samt Ladung 20,75 m'],
      ['Kreisring', 'außen 12,50 m · innen mindestens 5,30 m · Ring höchstens 7,20 m'],
      ['Gewicht', 'über 4 Achsen 40 t (44 t nur Kombinierter Verkehr) · Sattelzug: minus Sattellast'],
      ['Führerschein', 'C1E: Zug bis 12 t, volle Summe · Anhänger hinter C-Lkw über 750 kg: CE'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das kommt in der Prüfung.“\n🖱 Klick 1–8: je eine Zeile.\n💡 Erst das Stichwort vorlesen und fragen: „Wer weiß es?“ – dann klicken.\n✅ Quellen: DGUV I 214-080 (Kuppeln, Satteln), Prüfungsfragen 2.7.07-312/-319/-320/-306, § 32 und § 32d StVZO, § 22 Abs. 4 StVO, § 34 Abs. 6 und 7 StVZO, 53. StVZAusnV, § 6 FeV.\n➜ „Drei Prüfungsfragen.“',
  });
  await quiz(deck, 'ce1e', {
    kicker: 'Prüfungsfrage 2.7.07-312', q: 'Wie können Sie erkennen, ob bei einer selbsttätigen Anhängekupplung der Kupplungsbolzen richtig eingerastet ist?', size: 28,
    opts: ['Am Kontrollstift der Kupplung oder an der Kontrollleuchte im Führerhaus', 'An der Stellung des Lösehebels der Kupplung', 'Durch kurzes Anrucken'], ok: [0],
    why: 'Anrucken ist nur ein Vortest. Entscheidend ist der Kontrollstift – oder die Kontrollleuchte.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.07-312: A.\n➜ „Nächste Frage.“',
  });
  await quiz(deck, 'ce1e', {
    kicker: 'Prüfungsfrage 2.2.22-301', q: 'Was ist aus Gründen der Fahrsicherheit besser?', size: 32,
    opts: ['Wenn der Lkw beladen und der Anhänger leer ist', 'Wenn der Anhänger beladen und der Lkw leer ist'], ok: [0],
    why: 'Ein schwerer Anhänger hinter einem leichten Lkw schiebt und kann den Zug einknicken lassen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.22-301: A. Mehr dazu in CE3/CE4 (Fahrdynamik, Einknicken).\n➜ „Letzte Frage.“',
  });
  await quiz(deck, 'ce1e', {
    kicker: 'Prüfungsfrage 2.6.06-305', q: 'Wie können Sie rechnerisch überprüfen, ob durch die Zusammenstellung eines Sattelkraftfahrzeugs (Sattellast = Aufliegelast) die höchstzulässige Gesamtmasse des Zuges überschritten wird?', size: 24,
    opts: ['Zulässige Gesamtmasse der Zugmaschine plus zulässige Gesamtmasse des Sattelanhängers minus Aufliegelast', 'Zulässige Gesamtmasse der Zugmaschine plus zulässige Gesamtmasse des Sattelanhängers', 'Zulässige Gesamtmasse der Zugmaschine plus Nutzlast des Sattelanhängers'], ok: [0],
    why: 'Die Sattellast zählt nur einmal – also abziehen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.06-305: A. § 34 Abs. 7 Nr. 3 StVZO.\n➜ „Das nimmst du aus CE1 mit.“',
  });
  await takeaway(deck, 'ce1e', {
    items: [
      ['LuCircleDot', 'Gelb vor Rot:', 'beim Ankuppeln erst gelb, dann rot. Rot nie allein.'],
      ['LuEye', 'Kontrollstift prüfen:', 'ansehen und tasten. Beim Sattel: kein Spalt, Sicherung eingefallen.'],
      ['LuBan', 'Niemand dazwischen:', 'der Lkw kommt zum gesicherten Anhänger – nie umgekehrt.'],
      ['LuRuler', 'Maße:', '18,75 m für Lkw mit Anhänger, 16,50 m für den Sattelzug, Kreisring 12,50 m.'],
      ['LuScale', 'Gewicht und Klasse:', '40 t bei mehr als 4 Achsen. Über 12 t Zug oder C-Lkw mit Anhänger über 750 kg: CE.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus CE1, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Jetzt 15 Minuten Pause. Danach CE2: Wie bremst ein Zug?“',
  });
  {
    const s = base(deck, 'ce1e', { bg: 'f_pause.jpg', ov: 8.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „15 Minuten Pause. Kurz raus, frische Luft.“\n' +
      '💡 Pausenende ansagen (z. B. 19:45 Uhr).\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Willkommen zurück. Lektion CE2: Wie bremst ein Zug – und was passiert, wenn eine Leitung abreißt?“' });
    s.text('PAUSE', { x: 0.7, y: 2.0, w: 6, h: 0.5, size: 18, bold: true, color: C.bl, cs: 6 }, { fx: 'fade', auto: true, dur: 600 });
    s.text('15 Minuten', { x: 0.7, y: 2.5, w: 6.5, h: 1.4, size: 72, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900, d: 200 });
    s.text('Kurz raus, frische Luft.', { x: 0.7, y: 4.0, w: 6.2, h: 0.9, size: 22, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 600 });
    s.text('Danach: Lektion CE2 · Lastzugbremsen', { x: 0.7, y: 5.4, w: 6.2, h: 0.9, size: 16, color: C.bl }, { fx: 'fade', auto: true, dur: 700, d: 900 });
  }
};
