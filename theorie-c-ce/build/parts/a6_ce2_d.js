// Abend 6 · CE2: Kapitel 5 Anhänger rangieren (roter und schwarzer Knopf, Löseventil) + Abschluss CE2 + Ende
const { C, sec, base, chapter, steps, photoAsk, quiz, write, takeaway, seg } = require('../gs');

sec('ce2k', 'CE2  ·  ANHÄNGER RANGIEREN', C.pu, 'bg_pu.jpg');
sec('ce2e', 'CE2  ·  ABSCHLUSS', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce2k', { num: 5, ttl: 'Anhänger rangieren', sub: 'Roter Knopf, schwarzer Knopf – wer sie verwechselt, hat einen rollenden Anhänger.', ico: 'LuCircleParking', notes:
    '▶ Sagen: „Letztes Kapitel: Ein abgekuppelter Anhänger steht auf dem Hof und soll ein Stück bewegt werden. Dafür gibt es zwei Knöpfe.“\n🖱 Keine Klicks.\n➜ „Schaut mal.“' });
  await photoAsk(deck, 'ce2k', {
    bg: 'k_knoepfe_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Am Anhänger', q: 'Zwei Knöpfe am Anhänger – was machen sie?', qsize: 30, w: 5.05, asize: 15,
    answers: [
      ['LuCircleParking', 'Roter Knopf: Feststellbremse', 'gezogen = fest. Drücken löst (nur mit Luft).', C.red],
      ['LuCircle', 'Schwarzer Knopf: Löseventil', 'löst die Notbremsung ohne Leitung.', '8A95A6'],
      ['LuRotateCcw', 'Springt von selbst heraus', 'wenn rot wieder angeschlossen wird.', C.pu],
      ['LuTriangleAlert', 'Beide gedrückt = frei', 'Dann bremst der Anhänger gar nicht mehr!', C.or],
    ],
    notes:
      '▶ Sagen: „Zwei Knöpfe an der Seite des Anhängers. Was machen sie?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ DGUV I 214-080, S. 19, 21 und 39: roter Knopf = Feststellbremse (Federspeicher), schwarzer Knopf = Löseventil. Haldex Trailer Application Guide: Drücken des roten Knopfs löst die Federspeicher nur mit Druck im Anhängerbehälter. UN-R 13 / RL 71/320/EWG Anhang I Nr. 2.2.2.11: Das Löseventil muss beim Anschließen der Vorratsleitung automatisch in die Betriebsstellung zurückkehren.\n' +
      '💡 Neuere Anhänger haben oft nur einen roten Knopf mit drei Stellungen: Parken – Fahren – Lösen. Herstellerangabe beachten.\n' +
      '➜ „Wie rangiert ihr damit?“',
  });

  // ===== RANGIEREN SCHRITT FÜR SCHRITT =====
  {
    const ST = [
      { r: 1, b: 1, fs: 'fest', nb: 'fest', safe: 'Keile liegen', st: 'Der Anhänger steht – doppelt gebremst.', stc: C.gr, info: 'Abgekuppelt: Federspeicher fest (roter Knopf gezogen) und Notbremsung fest (keine rote Leitung).' },
      { r: 0, b: 1, fs: 'gelöst', nb: 'fest', safe: 'Rangierfahrzeug angekuppelt', st: 'Noch hält die Notbremsung.', stc: C.am, info: 'Erst sichern: Rangierfahrzeug dran. Dann roter Knopf drücken – die Federspeicher lösen mit Luft aus dem Behälter.' },
      { r: 0, b: 0, fs: 'gelöst', nb: 'gelöst', safe: 'Rangierfahrzeug angekuppelt', st: 'Der Anhänger rollt frei – nur gesichert bewegen!', stc: C.red, info: 'Schwarzer Knopf drücken: Die Notbremsung löst. Jetzt bremst der Anhänger nicht mehr selbst.' },
      { r: 1, b: 0, fs: 'fest', nb: 'gelöst', safe: 'Keile liegen', st: 'Der Anhänger steht wieder fest.', stc: C.gr, info: 'Danach: roter Knopf ziehen, Keile legen. Kommt die rote Leitung wieder dran, springt der schwarze Knopf von selbst heraus.' },
    ];
    await steps(deck, 'ce2k', {
      kicker: 'Rangieren', ttl: 'Rot und schwarz',
      list: ['Abgestellt', 'Rot drücken', 'Schwarz drücken', 'Danach'],
      ask: { q: 'Der abgekuppelte Anhänger soll ein Stück bewegt werden. Welche Knöpfe – und was vorher?', a: 'Erst sichern. Dann rot drücken und schwarz drücken – nur mit vollem Behälter. Danach wieder rot ziehen und Keile.', at: 3 },
      caps: [
        'Abgestellt ist der Anhänger doppelt gebremst: Federspeicher und Notbremsung.',
        'Erst sichern! Dann roter Knopf: Die Feststellbremse löst – die Notbremsung hält noch.',
        'Schwarzer Knopf: Die Notbremsung löst. Jetzt rollt der Anhänger frei.',
        'Fertig rangiert: roter Knopf ziehen, Keile legen.',
      ],
      notes: [
        '▶ Sagen: „Der Anhänger ist abgekuppelt. Er ist doppelt gebremst: Der rote Knopf ist gezogen – die Federspeicher halten. Und weil die rote Leitung fehlt, wirkt die Notbremsung mit Luft aus dem Behälter.“\n❓ Frage auf der Folie stellen.\n✅ DGUV I 214-080, S. 19/39; Lehrbuchwissen (Haldex).\n💡 Bei manchen neuen Anhängern (z. B. ZF iEBS mit Park-Löse-Ventil) greift ohne rote Leitung zusätzlich der Federspeicher – Herstellerangabe beachten.\n➜ „Wie bekommen wir ihn frei?“',
        '▶ „Zuerst sichern: Rangierfahrzeug ankuppeln – oder wenigstens Keile. Dann den roten Knopf drücken. Die Federspeicher lösen – mit Luft aus dem Behälter. Aber die Notbremsung hält noch.“\n✅ Haldex: Lösen der Federspeicher nur mit Druck im Behälter. Ist der Behälter leer: Fremdluft oder mechanische Hilfslöseeinrichtung.\n➜ „Und jetzt?“',
        '▶ „Jetzt der schwarze Knopf – das Löseventil. Die Notbremsung löst. Ab jetzt bremst der Anhänger gar nicht mehr selbst! Darum nur, wenn er gesichert ist.“\n✅ Prüfungsfrage 2.7.06-306: Löseventil betätigen, wenn der Anhänger bei gefüllten Luftbehältern und nicht angeschlossenen Bremsleitungen rangiert werden soll.\n💡 Gefahr: Löseventil gedrückt und Feststellbremse gelöst = Anhänger ungebremst.\n➜ „Und wenn er steht?“',
        '▶ „Fertig rangiert: roter Knopf ziehen, Keile legen. Den schwarzen Knopf müsst ihr nicht ziehen – er springt von selbst heraus, sobald die rote Leitung wieder angeschlossen wird.“\n❓ Frage auf der Folie auflösen.\n✅ UN-R 13 / RL 71/320/EWG Anhang I Nr. 2.2.2.11 (automatische Rückstellung des Löseventils). DGUV I 214-080, S. 33: nie nur mit der Notbremsfunktion abstellen.\n➜ „Prüfungsfrage.“',
      ],
      legend: 'Schema · Knöpfe von der Seite',
      scene: async (s, i) => {
        const t = ST[i];
        // Bedienteil mit zwei Knöpfen (von der Seite)
        s.rrect(8.55, 1.85, 0.32, 2.65, { fill: '8C96A4', line: '6E7886', lw: 1, rr: 0.1, name: '!!pl' });
        const knob = (y, out, col, edge, nm) => {
          const L = out ? 0.62 : 0.12;
          s.rect(8.55 - L, y - 0.09, L, 0.18, { fill: 'B3BBC6', name: '!!' + nm + 's' });
          s.rrect(8.55 - L - 0.34, y - 0.27, 0.36, 0.54, { fill: col, line: edge, lw: 1.5, rr: 0.3, name: '!!' + nm + 'c' });
        };
        knob(2.55, t.r, C.red, 'A33A36', 'kr');
        knob(3.75, t.b, '1A1F27', '6E7886', 'kb');
        s.text([{ text: 'Roter Knopf\n', options: { bold: true, color: C.red } }, { text: t.r ? 'gezogen' : 'gedrückt', options: { color: C.txt } }], { x: 5.8, y: 2.2, w: 1.75, h: 0.7, size: 13, valign: 'middle', name: '!!krt' });
        s.text([{ text: 'Schwarzer Knopf\n', options: { bold: true, color: C.mut } }, { text: t.b ? 'draußen' : 'gedrückt', options: { color: C.txt } }], { x: 5.8, y: 3.4, w: 1.75, h: 0.7, size: 13, valign: 'middle', name: '!!kbt' });
        // Anzeigen
        const row = (y, lab, val, bad, nm) => {
          s.text(lab, { x: 9.3, y, w: 2.2, h: 0.42, size: 14, color: C.mut, valign: 'middle', name: '!!' + nm + 'l' });
          s.text(val, { x: 11.5, y, w: 1.5, h: 0.42, size: 14, bold: true, color: C.dark, fill: bad ? C.red : C.gr, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!' + nm + 'v' });
        };
        row(1.95, 'Federspeicher', t.fs, t.fs === 'fest', 'fs');
        row(2.55, 'Notbremsung', t.nb, t.nb === 'fest', 'nb');
        s.text('Luftbehälter', { x: 9.3, y: 3.15, w: 2.2, h: 0.42, size: 14, color: C.mut, valign: 'middle', name: '!!tkl' });
        s.rrect(11.5, 3.2, 1.5, 0.32, { fill: '4C8DF0', ft: 25, line: '4A5668', rr: 0.3, name: '!!tk' });
        s.text('voll', { x: 11.5, y: 3.2, w: 1.5, h: 0.32, size: 12, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!tkt' });
        s.text('Rote Leitung', { x: 9.3, y: 3.75, w: 2.2, h: 0.42, size: 14, color: C.mut, valign: 'middle', name: '!!rll' });
        s.text('nicht dran', { x: 11.5, y: 3.75, w: 1.5, h: 0.42, size: 13, color: C.mut, align: 'center', valign: 'middle', name: '!!rlv' });
        seg(s, 9.3, 4.35, 13.0, 4.35, { col: '2A3B52', th: 0.02, name: '!!sep' });
        s.text('✓  ' + t.safe, { x: 9.3, y: 4.5, w: 3.7, h: 0.4, size: 14, bold: true, color: C.gr, valign: 'middle', name: '!!safe' });
        s.text(t.st, { x: 5.75, y: 4.95, w: 7.3, h: 0.5, size: 18, bold: true, color: t.stc, align: 'center', valign: 'middle', name: '!!st' });
        s.text(t.info, { x: 5.75, y: 5.5, w: 7.3, h: 1.05, size: 15, color: C.txt, align: 'center', valign: 'top', name: '!!info' });
      },
    });
  }
  await quiz(deck, 'ce2k', {
    kicker: 'Prüfungsfrage 2.7.06-306', q: 'In welchen Fällen müssen Sie das Löseventil betätigen?', size: 32, osize: 17,
    opts: ['Wenn der Anhänger bei gefüllten Luftbehältern und nicht angeschlossenen Bremsleitungen rangiert werden soll', 'Vor Antritt der Fahrt, damit die Luftbehälter des Anhängers aufgefüllt werden können', 'Vor Antritt der Fahrt, damit die Feststellbremse des Anhängers gelöst wird'], ok: [0],
    why: 'Schwarz = Löseventil, nur zum Rangieren. Die Feststellbremse ist der rote Knopf.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-306: A.\n➜ „Das war CE2. Zum Mitschreiben.“',
  });

  // ===== ABSCHLUSS CE2 =====
  write(deck, 'ce2e', {
    ttl: 'Lastzugbremsen', labelW: 2.9, size: 17,
    rows: [
      ['Eigene Bremse', 'über 0,75 t Achslast · ein Pedal oder Auflaufbremse · bremst bei Abriss selbst'],
      ['Auflaufbremse', 'bremst erst beim Auflaufen · bis 3,5 t · nie am Auflieger · Abreißseil an den Lkw'],
      ['Rot', 'Vorratsleitung: immer Druck, füllt den Behälter im Anhänger'],
      ['Gelb', 'Bremsleitung: Druck nur beim Bremsen, meldet den Bremswunsch'],
      ['Rot reißt', 'Anhänger bremst sofort selbst, Behälter wird abgesperrt · Lkw bremst nicht automatisch'],
      ['Gelb reißt', 'erst beim Bremsen: Lkw entlüftet rot → Anhänger wird notgebremst'],
      ['Roter Knopf', 'Feststellbremse (Federspeicher) des Anhängers'],
      ['Schwarzer Knopf', 'Löseventil: Notbremsung lösen zum Rangieren · springt beim Anschließen heraus'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das kommt in der Prüfung.“\n🖱 Klick 1–8: je eine Zeile.\n💡 Erst das Stichwort vorlesen und fragen: „Wer weiß es?“ – dann klicken.\n✅ Quellen: § 41 Abs. 9 und 10 StVZO, UN-R 13 / RL 71/320/EWG, DGUV I 214-080, Prüfungsfragen 2.7.06-105, 2.7.02-302, 2.7.06-317, 2.7.06-306.\n➜ „Drei Prüfungsfragen.“',
  });
  await quiz(deck, 'ce2e', {
    kicker: 'Prüfungsfrage 2.7.07-321', q: 'Was müssen Sie beim Ankuppeln eines Anhängers beachten?', size: 32,
    opts: ['Verschiedenfarbige Kupplungsteile dürfen nicht miteinander verbunden werden', 'Nach dem Ankuppeln Feststellbremse lösen und Unterlegkeile entfernen', 'Zuerst die Vorratsleitung anschließen'], ok: [0, 1],
    why: 'Rot an rot, gelb an gelb – und zuerst gelb. Nach dem Ankuppeln: roter Knopf rein, Keile weg.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.07-321: A und B.\n➜ „Nächste Frage.“',
  });
  await quiz(deck, 'ce2e', {
    kicker: 'Prüfungsfrage 2.7.06-319', q: 'Sie fahren ein Zugfahrzeug mit Druckluftbremsanlage. Die Bremsleitung am rechten Vorderrad bricht. Wie wirkt sich das im Anhängerbetrieb aus?', size: 26,
    opts: ['Beim Anhänger bleibt die Betriebsbremse voll funktionsfähig', 'Die Bremsleistung des Zugfahrzeugs ist eingeschränkt', 'Der Anhänger wird sofort selbsttätig gebremst'], ok: [0, 1],
    why: 'Der Kreis am Lkw ist kaputt, die anderen behalten ihren Druck. Der Anhänger bremst normal.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-319: A und B.\n➜ „Letzte Frage.“',
  });
  await quiz(deck, 'ce2e', {
    kicker: 'Prüfungsfrage 2.2.23-302', q: 'Die Plane Ihres Anhängers ist vereist. Was kann passieren, wenn Sie mit dem Anhänger eine Fahrt beginnen? Durch herabfallende Eisplatten können …', size: 26, osize: 17,
    opts: ['… beim Bremsen Luft- und Elektroleitungen am Fahrzeug stark beschädigt werden', '… Personen lebensgefährlich verletzt werden', '… andere Fahrzeuge erheblich beschädigt werden'], ok: [0, 1, 2],
    why: 'Alle drei. Eis vor der Fahrt entfernen – oder nicht losfahren.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.23-302: A, B und C.\n➜ „Das nehmt ihr aus CE2 mit.“',
  });
  await takeaway(deck, 'ce2e', {
    items: [
      ['LuMoveHorizontal', 'Auflaufbremse:', 'bremst erst, wenn der Anhänger aufläuft. Abreißseil immer an den Lkw.'],
      ['LuWind', 'Rot und gelb:', 'rot bringt die Luft, gelb den Bremswunsch. Der Anhänger bremst mit eigener Luft.'],
      ['LuUnlink', 'Rot reißt:', 'der Anhänger bremst sofort selbst – der Lkw nicht.'],
      ['LuTriangleAlert', 'Gelb reißt:', 'merkt ihr erst beim Bremsen – dann wird der Anhänger notgebremst.'],
      ['LuCircleParking', 'Abstellen:', 'roter Knopf ziehen und Keile. Schwarz nur zum Rangieren.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus CE2, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Damit ist Abend 6 geschafft.“',
  });

  // ===== ENDE =====
  {
    const s = base(deck, 'ce2e', { bg: 'k_titel.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 6. Ihr wisst jetzt, wie man einen Zug richtig zusammenstellt und wie seine Bremse arbeitet. Beim nächsten Mal geht es weiter mit der Bremse – Bremskraftregelung, ABS, Feststellbremse mit Kontrollstellung und Dauerbremse – und dann mit dem Fahren mit Zügen. Danke fürs Mitmachen, kommt gut nach Hause.“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen. Prüfungsfragen 2.7.07 (Kuppeln) und 2.7.06 (Bremsen) als Hausaufgabe üben.\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.6, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Abend 6 geschafft!', { x: 0.7, y: 1.7, w: 4.9, h: 1.8, size: 46, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 900 });
    s.text('CE1 + CE2: Züge zusammenstellen und bremsen', { x: 0.7, y: 3.6, w: 4.8, h: 0.8, size: 18, color: C.or }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Nächstes Mal – Abend 7:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'CE3  Bremsen: ABS, Feststellbremse, Dauerbremse', options: { color: C.txt, breakLine: true } }, { text: 'CE4  Fahren mit Zügen', options: { color: C.txt } }], { x: 0.7, y: 4.65, w: 4.9, h: 1.5, size: 16 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
