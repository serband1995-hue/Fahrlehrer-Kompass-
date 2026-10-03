// C1 Kapitel 2 (Teil 2): Woche, Ruhezeiten, Bußgelder, Mitschreiben
const { C, base, kick, title, card, point, CLICK, ask, quiz, write, foot } = require('../gs');
const { icon } = require('../lib');

module.exports = async (deck) => {
  // ===== WOCHE UND DOPPELWOCHE (Balkendiagramm) =====
  {
    const s = base(deck, 'lz', { notes:
      '▶ Sagen: „Nicht nur der Tag ist begrenzt, auch die Woche. Und sogar zwei Wochen zusammen.“\n' +
      '❓ „Wenn ihr jeden Tag 9 h fahrt, 6 Tage lang – wie viel ist das?“ ✅ 54 h. Mit zwei 10-h-Tagen: 4 × 9 + 2 × 10 = 56 h.\n' +
      '🖱 Klick 1: Woche 1 mit 56 h · Klick 2: Grenze Woche · Klick 3: Woche 2 · Klick 4: Doppelwoche 90 h.\n' +
      '✅ Art. 6 Abs. 2: Wochenlenkzeit höchstens 56 h. Art. 6 Abs. 3: In zwei aufeinanderfolgenden Wochen zusammen höchstens 90 h.\n' +
      '✅ Wer in Woche 1 die vollen 56 h fährt, hat in Woche 2 nur noch 34 h.\n' +
      '💡 Woche heißt Kalenderwoche: Montag 0 Uhr bis Sonntag 24 Uhr (Art. 4 i).\n' +
      '➜ „Testen wir das.“' });
    kick(s, 'Woche und Doppelwoche'); title(s, '56 Stunden – aber nicht jede Woche');
    const y0 = 6.15, k = 0.042; // 1 h = 0,05 Zoll Höhe
    s.rect(1.4, y0, 7.6, 0.02, { fill: C.dim });
    for (const h of [0, 20, 40, 60, 80]) {
      s.text(String(h) + ' h', { x: 0.5, y: y0 - h * k - 0.15, w: 0.8, h: 0.3, size: 12, color: C.dim, align: 'right' });
      if (h) s.rect(1.4, y0 - h * k, 7.6, 0.01, { fill: C.line });
    }
    // Woche 1 / Woche 2 / zusammen
    s.rect(1.9, y0 - 56 * k, 1.5, 56 * k, { fill: C.or }, { fx: 'wipeU', c: true, dur: 700 });
    s.text('56 h', { x: 1.9, y: y0 - 56 * k - 0.45, w: 1.5, h: 0.4, size: 22, bold: true, color: C.or, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('Woche 1', { x: 1.9, y: y0 + 0.08, w: 1.5, h: 0.3, size: 14, color: C.mut, align: 'center' });
    s.lineS(1.6, y0 - 56 * k, 9.0, y0 - 56 * k, { color: C.red, lw: 2, dash: 'dash' }, { fx: 'wipeR', c: true, dur: 500 });
    s.text('Grenze pro Woche: 56 h', { x: 3.45, y: y0 - 56 * k - 0.38, w: 2.4, h: 0.32, size: 13, bold: true, color: C.red, align: 'center' }, { fx: 'fade', dur: 200 });
    s.rect(3.9, y0 - 34 * k, 1.5, 34 * k, { fill: 'C97A20' }, { fx: 'wipeU', c: true, dur: 700 });
    s.text('nur noch 34 h', { x: 3.6, y: y0 - 34 * k - 0.45, w: 2.1, h: 0.4, size: 18, bold: true, color: C.or, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('Woche 2', { x: 3.9, y: y0 + 0.08, w: 1.5, h: 0.3, size: 14, color: C.mut, align: 'center' });
    s.rect(6.6, y0 - 56 * k, 1.5, 56 * k, { fill: C.or }, { fx: 'wipeU', c: true, dur: 500 });
    s.rect(6.6, y0 - 90 * k, 1.5, 34 * k, { fill: 'C97A20' }, { fx: 'wipeU', dur: 500 });
    s.text('90 h', { x: 6.6, y: y0 - 90 * k - 0.45, w: 1.5, h: 0.4, size: 22, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('zusammen', { x: 6.6, y: y0 + 0.08, w: 1.5, h: 0.3, size: 14, color: C.mut, align: 'center' });
    // Merkkasten rechts
    card(s, 9.6, 2.1, 3.03, 3.4, { line: C.or });
    s.text([{ text: 'Merke', options: { bold: true, color: C.or, breakLine: true } }, { text: '9 h pro Tag', options: { breakLine: true } }, { text: '(2 × pro Woche 10 h)', options: { color: C.mut, breakLine: true } }, { text: ' ', options: { breakLine: true, fontSize: 8 } }, { text: '56 h pro Woche', options: { breakLine: true } }, { text: ' ', options: { breakLine: true, fontSize: 8 } }, { text: '90 h in 2 Wochen', options: { breakLine: true } }, { text: ' ', options: { breakLine: true, fontSize: 8 } }, { text: 'Woche = Mo 0 Uhr bis So 24 Uhr', options: { color: C.mut } }],
      { x: 9.8, y: 2.3, w: 2.7, h: 3.0, size: 18, color: C.txt });
  }
  quiz(deck, 'lz', {
    kicker: 'Frage · Doppelwoche', q: 'Letzte Woche bist du 50 Stunden gefahren. Wie viele Stunden darfst du diese Woche höchstens fahren?', size: 28,
    opts: ['56 Stunden', '40 Stunden', '45 Stunden'], ok: 1,
    why: '90 h in zwei Wochen minus 50 h = 40 h. Die 56 h pro Woche wären zwar erlaubt, aber die Doppelwoche begrenzt hier (Art. 6 Abs. 3).',
    notes: '▶ Frage vorlesen, rechnen lassen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B, 40 h. 90 − 50 = 40. Es gilt immer die strengere Grenze.\n💡 Typischer Fehler: A – nur an die 56 h denken.\n➜ „Jetzt zur Ruhe: Wie lange müsst ihr euch erholen?“',
  });
  // ===== TÄGLICHE RUHEZEIT =====
  {
    const s = base(deck, 'lz', { notes:
      '▶ Sagen: „Nach dem Arbeitstag braucht ihr eine tägliche Ruhezeit. Es gibt drei Varianten.“\n' +
      '🖱 Klick 1: regelmäßig 11 h · Klick 2: aufgeteilt 3 + 9 · Klick 3: verkürzt 9 h · Klick 4: die 24-Stunden-Regel.\n' +
      '✅ Regelmäßig: mindestens 11 h am Stück (Art. 4 g, Art. 8).\n' +
      '✅ Aufgeteilt: erst mindestens 3 h, später mindestens 9 h, zusammen also mindestens 12 h. Reihenfolge fest.\n' +
      '✅ Verkürzt: mindestens 9 h, höchstens 3 × zwischen zwei wöchentlichen Ruhezeiten (Art. 8 Abs. 4).\n' +
      '✅ Innerhalb von 24 h nach dem Ende der letzten Ruhezeit muss die neue tägliche Ruhezeit genommen sein (Art. 8 Abs. 2).\n' +
      '💡 Gleiches Prinzip wie bei der Pause: erst der kleine Teil, dann der große.\n' +
      '➜ „Und am Wochenende?“' });
    kick(s, 'Tägliche Ruhezeit'); title(s, 'Erholung ist Pflicht');
    const k = 0.42, x0 = 4.3;
    const R = [
      ['Regelmäßig', [[11, C.bl, '11 h']], 'der Normalfall'],
      ['Aufgeteilt', [[3, C.bl, '3 h'], [2.2, null, 'Arbeit / Fahrt'], [9, C.bl, '9 h']], 'erst 3 h, dann 9 h – zusammen 12 h'],
      ['Verkürzt', [[9, '3A86C8', '9 h']], 'höchstens 3 × zwischen zwei Wochenruhezeiten'],
    ];
    for (let i = 0; i < 3; i++) {
      const y = 2.05 + i * 1.25;
      card(s, 0.7, y, 11.93, 1.08, {}, CLICK);
      s.text(R[i][0], { x: 0.95, y, w: 3.2, h: 1.08, size: 21, bold: true, color: C.bl, valign: 'middle' }, { fx: 'fade', dur: 200 });
      let x = x0;
      for (const [h, col, lab] of R[i][1]) {
        const w = h * k * 0.62;
        if (col) {
          s.rect(x, y + 0.2, w, 0.42, { fill: col }, { fx: 'wipeR', dur: 400 });
          s.text(lab, { x, y: y + 0.2, w, h: 0.42, size: 15, bold: true, color: C.dark, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 150 });
        } else {
          s.text(lab, { x, y: y + 0.2, w, h: 0.42, size: 12, color: C.mut, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 150 });
        }
        x += w;
      }
      s.text(R[i][2], { x: x0, y: y + 0.66, w: 8.2, h: 0.35, size: 14, color: C.mut }, { fx: 'fade', dur: 200 });
    }
    s.text([{ text: '24-Stunden-Regel:  ', options: { bold: true, color: C.bl } }, { text: 'Innerhalb von 24 Stunden nach Ende der letzten Ruhezeit muss die neue tägliche Ruhezeit genommen sein (mindestens 9 h davon in diesen 24 h).', options: { color: C.txt } }],
      { x: 0.7, y: 5.76, w: 11.93, h: 0.92, size: 17, valign: 'middle', fill: C.card2, line: C.bl, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
  }
  // ===== WÖCHENTLICHE RUHEZEIT =====
  {
    const s = base(deck, 'lz', { notes:
      '▶ Sagen: „Einmal pro Woche braucht ihr eine lange Ruhezeit.“\n' +
      '🖱 Klick 1: 45 h regelmäßig · Klick 2: 24 h verkürzt mit Ausgleich · Klick 3: nicht in der Kabine · Klick 4: alle 4 Wochen nach Hause.\n' +
      '✅ Regelmäßig mindestens 45 h, verkürzt mindestens 24 h. In zwei Wochen: zwei regelmäßige oder eine regelmäßige und eine verkürzte. Spätestens nach sechs 24-Stunden-Zeiträumen muss sie beginnen (Art. 8 Abs. 6).\n' +
      '✅ Die Verkürzung muss bis zum Ende der dritten Woche danach am Stück ausgeglichen werden, angehängt an eine Ruhezeit von mindestens 9 h (Art. 8 Abs. 6b, 7).\n' +
      '✅ Regelmäßige wöchentliche Ruhezeiten (und Ausgleich ab 45 h) nicht im Fahrzeug, sondern in einer geeigneten Unterkunft – auf Kosten des Arbeitgebers (Art. 8 Abs. 8).\n' +
      '✅ Der Arbeitgeber plant so, dass ihr spätestens alle 4 Wochen nach Hause oder zum Betrieb zurückkehren könnt (Art. 8 Abs. 8a).\n' +
      '💡 Die verkürzte Wochenruhe (24 h) darf im Fahrzeug verbracht werden – praktisch nur mit Schlafkabine und im Stand.\n' +
      '➜ „Was kostet es, wenn man sich nicht daran hält?“' });
    kick(s, 'Wöchentliche Ruhezeit'); title(s, 'Das Wochenende des Fahrers');
    await point(s, 0.7, 2.05, 11.93, 0.98, 'LuBed', C.bl, '45 h regelmäßig', 'spätestens nach sechs Tagen (sechs 24-Stunden-Zeiträumen).', CLICK, { size: 19 });
    await point(s, 0.7, 3.18, 11.93, 0.98, 'LuHourglass', C.bl, '24 h verkürzt', 'erlaubt – aber die fehlenden Stunden bis Ende der 3. Woche danach nachholen.', CLICK, { size: 19 });
    await point(s, 0.7, 4.31, 11.93, 0.98, 'LuBan', C.red, 'Nicht in der Kabine', 'Die regelmäßige Wochenruhe gehört in eine Unterkunft – der Arbeitgeber zahlt.', CLICK, { size: 19 });
    await point(s, 0.7, 5.44, 11.93, 0.98, 'LuMapPin', C.gr, 'Alle 4 Wochen heim', 'Der Arbeitgeber muss die Touren so planen, dass ihr zurückkehren könnt.', CLICK, { size: 19 });
  }
  // ===== BUSSGELDER =====
  {
    const s = base(deck, 'lz', { notes:
      '▶ Sagen: „Bei einer Kontrolle liest die Polizei oder das Bundesamt eure Fahrerkarte aus. Jeder Verstoß kostet – den Fahrer und den Chef.“\n' +
      '❓ Vor dem Klick: „Was schätzt ihr, wer zahlt mehr – Fahrer oder Unternehmer?“\n' +
      '🖱 Klick 1–3: je eine Zeile (Fahrer und Unternehmer) · Klick 4: Hinweis Punkte.\n' +
      '✅ Regelsätze nach dem Buß- und Verwarnungsgeldkatalog Fahrpersonalrecht (LASI): Lenkzeit über 2 h überschritten: 60 € je angefangene halbe Stunde (Unternehmer 180 €). Fahrtunterbrechung mehr als 15 Min zu kurz: 60 € je angefangene Viertelstunde (Unternehmer 180 €). Tägliche Ruhezeit mehr als 3 h zu kurz: 60 € je angefangene Stunde (Unternehmer 180 €).\n' +
      '✅ Punkte gibt es dafür keine – diese Verstöße stehen nicht in FeV Anlage 13. Aber die Summen werden schnell hoch, und die Polizei kann die Weiterfahrt untersagen, bis die Ruhezeit nachgeholt ist.\n' +
      '💡 Hinweis: Die Beträge können je Bundesland leicht abweichen; Rahmen bis 5.000 € (Fahrer) bzw. 15.000 € (Unternehmer).\n' +
      '➜ „Schreibt euch die Zahlen auf.“' });
    kick(s, 'Was kostet ein Verstoß?'); title(s, 'Fahrer zahlt – Chef zahlt mehr');
    s.text('Verstoß', { x: 0.95, y: 2.0, w: 6, h: 0.4, size: 14, bold: true, color: C.dim, cs: 2 });
    s.text('FAHRER', { x: 7.3, y: 2.0, w: 2.4, h: 0.4, size: 14, bold: true, color: C.dim, cs: 2, align: 'center' });
    s.text('UNTERNEHMER', { x: 9.9, y: 2.0, w: 2.6, h: 0.4, size: 14, bold: true, color: C.dim, cs: 2, align: 'center' });
    const T = [['Lenkzeit mehr als 2 h zu lang', 'je angefangene ½ Stunde', '60 €', '180 €'], ['Pause mehr als 15 Min zu kurz', 'je angefangene ¼ Stunde', '60 €', '180 €'], ['Tägliche Ruhezeit mehr als 3 h zu kurz', 'je angefangene Stunde', '60 €', '180 €']];
    for (let i = 0; i < 3; i++) {
      const y = 2.5 + i * 1.08;
      card(s, 0.7, y, 11.93, 0.92, {}, CLICK);
      s.text([{ text: T[i][0], options: { bold: true, color: C.txt, breakLine: true } }, { text: T[i][1], options: { color: C.mut, fontSize: 14 } }], { x: 0.95, y, w: 6.3, h: 0.92, size: 18, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][2], { x: 7.3, y, w: 2.4, h: 0.92, size: 26, bold: true, color: C.or, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 300 });
      s.text(T[i][3], { x: 9.9, y, w: 2.6, h: 0.92, size: 26, bold: true, color: C.red, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 300 });
    }
    s.text([{ text: 'Gut zu wissen:  ', options: { bold: true, color: C.or } }, { text: 'Kleinere Verstöße kosten je 30 €. Punkte gibt es keine – aber bei der Kontrolle kann die Weiterfahrt untersagt werden, bis die Ruhezeit eingehalten ist.', options: { color: C.txt } }],
      { x: 0.7, y: 5.7, w: 11.93, h: 0.88, size: 16, valign: 'middle', fill: C.card2, line: C.or, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
    foot(s, 'Regelsätze: Buß- und Verwarnungsgeldkatalog Fahrpersonalrecht (LASI LV 48) · keine Punkte (FeV Anlage 13)');
  }
  // ===== MITSCHREIBEN =====
  write(deck, 'lz', {
    ttl: 'Lenk- und Ruhezeiten', labelW: 4.4,
    rows: [
      ['Lenkzeit am Stück', 'höchstens 4,5 h, dann 45 Min Pause (oder 15 + 30)'],
      ['Tageslenkzeit', '9 h, zweimal pro Woche 10 h'],
      ['Wochenlenkzeit', '56 h – in zwei Wochen zusammen höchstens 90 h'],
      ['Tägliche Ruhezeit', '11 h (aufgeteilt 3 + 9, verkürzt 9 h höchstens 3 ×)'],
      ['Wöchentliche Ruhezeit', '45 h (verkürzt 24 h, mit Ausgleich)'],
      ['Wochenruhe nicht …', '… in der Kabine (die regelmäßige) · alle 4 Wochen heim'],
      ['Arbeitszeit (ArbZG)', 'Pause 30 Min nach 6 h, 45 Min nach 9 h Arbeit'],
    ],
    notes: '▶ Sagen: „Schreibt das ab. Das sind die Zahlen, die ihr in der Prüfung und im Beruf jeden Tag braucht.“\n❓ Vor jedem Klick die Klasse fragen: „Was gehört hier hin?“\n🖱 Klick 1–7: je eine Lösung.\n✅ Werte aus VO (EG) 561/2006, Art. 6, 7, 8. Arbeitszeit: § 4 ArbZG (Ruhepause 30 Min bei mehr als 6 h, 45 Min bei mehr als 9 h Arbeitszeit) und § 21a ArbZG (48 h pro Woche, bis 60 h mit Ausgleich).\n💡 Falle: Wer 2 h lädt und dann 4 h fährt, hat 6 h gearbeitet → nach dem Arbeitszeitgesetz ist eine Pause fällig, obwohl die 4,5 h Lenkzeit noch nicht erreicht sind.\n➜ „Wer kontrolliert das alles? Der Fahrtenschreiber.“',
  });
};
