// Abend 4 · C8: Kapitel 2 Maße und Gewichte, Überladung
const { C, sec, chapter, motion, steps, lkw, lkwHeck, arrow } = require('../gs');

sec('c8m', 'C8  ·  MASSE UND GEWICHTE', C.or, 'bg_or.jpg');

// Maßpfeil mit Endstrichen und Beschriftung (feste Namen für Morph)
function mass(s, x1, y1, x2, y2, txt, on, nm, o = {}) {
  const col = on ? C.or : '5A6576';
  const hor = Math.abs(y2 - y1) < 0.01;
  s.rect(Math.min(x1, x2), Math.min(y1, y2) - (hor ? 0.015 : 0), hor ? Math.abs(x2 - x1) : 0.03, hor ? 0.03 : Math.abs(y2 - y1), { fill: col, name: '!!' + nm + 'L' });
  for (const [k, x, y] of [['a', x1, y1], ['b', x2, y2]]) s.rect(hor ? x - 0.015 : x - 0.12, hor ? y - 0.12 : y - 0.015, hor ? 0.03 : 0.24, hor ? 0.24 : 0.03, { fill: col, name: '!!' + nm + k });
  const tw = o.tw || 2.2;
  s.text(txt, { x: hor ? (x1 + x2) / 2 - tw / 2 : x1 - tw - 0.15, y: hor ? y1 + 0.12 : (y1 + y2) / 2 - 0.2, w: tw, h: 0.4, size: on ? 18 : 14, bold: on, color: on ? C.or : C.mut, align: hor ? 'center' : 'right', name: '!!' + nm + 'T' });
}

module.exports = async (deck) => {
  await chapter(deck, 'c8m', { num: 2, ttl: 'Maße und Gewichte', sub: 'Wie breit, hoch, lang und schwer ein Lkw sein darf.', ico: 'LuRuler', notes:
    '▶ Sagen: „Kapitel 2: Maße und Gewichte. Wer das nicht kennt, bleibt unter einer Brücke hängen – oder zahlt bei der Waage.“\n🖱 Keine Klicks.\n➜ „Erst die Maße.“' });

  // ===== ABMESSUNGEN (Morph) =====
  await steps(deck, 'c8m', {
    kicker: 'Abmessungen', ttl: 'So groß darf ein Lkw sein',
    list: ['Breite 2,55 m', 'Kühlaufbau 2,60 m', 'Höhe 4,00 m', 'Länge 12,00 m'],
    ask: { q: 'Zählen die Außenspiegel zu den 2,55 m Breite?', a: 'Nein – sie ragen darüber hinaus. An engen Stellen daran denken!', at: 1 },
    caps: [
      'Breite höchstens 2,55 m – Fahrzeug und Ladung zusammen.',
      'Kühlaufbauten mit dicken Wänden dürfen 2,60 m breit sein. Spiegel zählen nicht mit – sie stehen noch weiter raus.',
      'Höhe höchstens 4,00 m – mit Ladung. Die eigene Höhe muss man kennen: Brücken, Tankstellen, Tore.',
      'Länge: Einzelfahrzeug höchstens 12 m. Mit Anhänger samt Ladung höchstens 20,75 m (CE).',
    ],
    notes: [
      '▶ Sagen: „Ein Lkw darf höchstens 2,55 Meter breit sein – mit Ladung.“\n✅ § 32 Abs. 1 StVZO; § 22 Abs. 2 StVO (Fahrzeug und Ladung zusammen 2,55 m). Prüfungsfrage 2.7.09-202 (Zahleneingabe).\n➜ „Es gibt eine Ausnahme.“',
      '▶ „Kühlfahrzeuge mit dick isolierten Wänden dürfen 2,60 m breit sein. Und Achtung: Die Außenspiegel zählen nicht zur Breite – sie stehen noch weiter raus.“\n❓ Frage auf der Folie auflösen.\n✅ § 32 Abs. 1 Nr. 4 StVZO (2,60 m bei mindestens 45 mm Wanddicke); Einrichtungen für indirekte Sicht werden nicht mitgemessen. Prüfungsfrage 2.6.06-211: An engen Durchfahrten ragen die Spiegel über die angegebene Breite hinaus, und Aufbauten schwanken auf unebener Fahrbahn.\n➜ „Und nach oben?“',
      '▶ „Höhe: höchstens 4 Meter, mit Ladung. Kennt die Höhe eures Lkw – sie steht oft an einem Schild im Fahrerhaus. Brücken mit Höhenbeschränkung, Tankstellendächer, Hallentore.“\n✅ § 32 Abs. 2 StVZO; § 22 Abs. 2 StVO. Prüfungsfrage 2.7.09-210: 4,0 m.\n➜ „Und die Länge?“',
      '▶ „Ein einzelner Lkw darf höchstens 12 Meter lang sein. Mit Anhänger und Ladung höchstens 20,75 Meter – das kommt in CE.“\n💡 Der Lastzug selbst darf höchstens 18,75 m lang sein (§ 32 Abs. 4 StVZO); bis 20,75 m nur mit überstehender Ladung.\n✅ § 32 Abs. 3 Nr. 1 StVZO (12,00 m). § 22 Abs. 4 StVO und Prüfungsfrage 2.6.06-201: Zug samt Ladung höchstens 20,75 m.\n➜ „Jetzt die Gewichte.“',
    ],
    legend: 'Nicht maßstäblich',
    scene: async (s, i) => {
      const GY = 5.15;
      await lkwHeck(s, {}, { x: 6.9, gy: GY, k: 0.78 });
      // Spiegelköpfe (ragen seitlich über den Aufbau hinaus)
      const rx0 = 6.9, rw = 2.6 * 0.78;
      for (const [nm, x] of [['spL', rx0 - 0.2], ['spR', rx0 + rw + 0.06]]) s.rrect(x, GY - 1.55, 0.14, 0.4, { fill: '2A303A', line: i === 1 ? C.or : '2A303A', lw: 2, rr: 0.3, name: '!!' + nm });
      s.oval(rx0 - 0.4, GY - 1.75, 0.55, 0.8, { line: C.or, lw: 2.5, ft: 100, lt: i === 1 ? 0 : 100, name: '!!spRing' });
      await lkw(s, { L: 5.6, axles: [0.78, 4.05] }, { x: 9.4, gy: GY, k: 0.62 });
      mass(s, rx0, GY + 0.3, rx0 + rw, GY + 0.3, i === 1 ? '2,60 m' : '2,55 m', i <= 1, 'b', { tw: 1.6 });
      const top = GY - (0.75 + 1.9) * 0.78;
      mass(s, rx0 - 0.55, GY, rx0 - 0.55, top, '4,00 m', i === 2, 'h', { tw: 0.75 });
      mass(s, 9.4, GY + 0.3, 9.4 + 5.6 * 0.62, GY + 0.3, '12,00 m', i === 3, 'l', { tw: 1.6 });
      s.text('Von hinten', { x: rx0, y: 1.65, w: rw, h: 0.35, size: 14, color: C.dim, align: 'center', name: '!!vh' });
      s.text('Von der Seite', { x: 9.4, y: 1.65, w: 3.5, h: 0.35, size: 14, color: C.dim, align: 'center', name: '!!vs' });
    },
  });

  // ===== GEWICHTE (Morph) =====
  {
    const T = [
      { ax: [0.78, 4.05], zgm: '18 t', lab: '2 Achsen' },
      { ax: [0.78, 3.62, 4.42], zgm: '25 t / 26 t', lab: '3 Achsen' },
      { ax: [0.72, 1.72, 3.72, 4.52], zgm: '32 t', lab: '4 Achsen' },
      { ax: [0.78, 4.05], zgm: '18 t', lab: 'Achslast' },
    ];
    await steps(deck, 'c8m', {
      kicker: 'Gewichte', ttl: 'So schwer darf ein Lkw sein',
      list: ['2 Achsen: 18 t', '3 Achsen: 25 / 26 t', '4 Achsen: 32 t', 'Je Achse: 10 / 11,5 t'],
      ask: { q: 'Das Gesamtgewicht stimmt, aber alles steht hinten. Geht das?', a: 'Nein – dann ist die Hinterachse überladen. Achslast UND Gesamtgewicht müssen stimmen.', at: 3 },
      caps: [
        'Zweiachser: höchstens 18 t zulässige Gesamtmasse.',
        'Dreiachser: 25 t, mit Luftfederung und Zwillingsreifen an der Antriebsachse 26 t.',
        'Vierachser: höchstens 32 t.',
        'Zusätzlich jede Achse: Einzelachse 10 t, Antriebsachse 11,5 t. Beides muss eingehalten werden.',
      ],
      notes: [
        '▶ Sagen: „Wie schwer ein Lkw sein darf, hängt von der Zahl der Achsen ab. Zweiachser: 18 Tonnen.“\n✅ § 34 Abs. 5 Nr. 1a StVZO.\n💡 Das genaue Höchstgewicht eures Lkw steht in der Zulassungsbescheinigung Teil I (Feld F.2) – es kann niedriger sein. E-Lkw und Lkw mit alternativem Antrieb dürfen etwas schwerer sein (§ 34 Abs. 5b: bis 1 t, emissionsfrei bis 2 t mehr).\n➜ „Drei Achsen.“',
        '▶ „Dreiachser: 25 Tonnen – 26 Tonnen, wenn die Antriebsachse Zwillingsreifen und Luftfederung hat.“\n✅ § 34 Abs. 5 Nr. 2a und 2b StVZO (mit Doppelachslast nach Abs. 4 Nr. 2d).\n➜ „Vier Achsen.“',
        '▶ „Vierachser – zum Beispiel Baustellenkipper: 32 Tonnen.“\n✅ § 34 Abs. 5 Nr. 3 StVZO (mit Bedingungen an Achsabstand und Lenkachsen).\n➜ „Und jede Achse für sich?“',
        '▶ „Jede Achse hat ihre eigene Grenze: Einzelachse 10 Tonnen, angetriebene Achse 11,5 Tonnen. Zusammen wären das 21,5 – aber das Gesamtgewicht bleibt bei 18. Beides muss stimmen.“\n❓ Frage auf der Folie auflösen.\n✅ § 34 Abs. 4 Nr. 1 StVZO. Prüfungsfrage 2.7.09-222: zulässige Gesamtmasse, zulässige Achslasten sowie Höhe, Breite, Lage und Sicherung der Ladung beachten.\n💡 Beim Teilentladen kann sich die Achslast verschieben: Wird hinten abgeladen, wird vorn manchmal mehr belastet.\n➜ „Was passiert, wenn der Lkw zu schwer ist?“',
      ],
      legend: 'Nach § 34 StVZO · eure Fahrzeugpapiere können niedrigere Werte nennen',
      scene: async (s, i) => {
        const t = T[i], GY = 4.55, k = 0.92, X = 6.3;
        await lkw(s, { L: 5.6, axles: t.ax }, { x: X, gy: GY, k, name: '!!lkwG' + (t.ax.length) });
        s.text(t.lab, { x: 5.7, y: 1.55, w: 4, h: 0.55, size: 26, bold: true, color: C.txt, name: '!!lab' });
        s.text(t.zgm, { x: 9.0, y: 1.45, w: 4.05, h: 0.8, size: 44, bold: true, color: C.or, align: 'right', name: '!!zgm' });
        s.text(i === 3 ? 'zulässige Gesamtmasse – trotzdem!' : 'zulässige Gesamtmasse', { x: 8.0, y: 2.25, w: 5.05, h: 0.35, size: 14, color: C.mut, align: 'right', name: '!!zgmt' });
        // Achslast-Pfeile (nur Schritt 4)
        const lab = ['höchstens 10 t', 'höchstens 11,5 t'];
        T[3].ax.forEach((a, q) => {
          const x = X + a * k;
          arrow(s, x, GY + 0.95, x, GY + 0.2, { col: C.or, th: 0.09, head: 0.24, name: 'al' + q, hide: i !== 3 });
          s.text(i === 3 ? lab[q] : '', { x: x - 1.1, y: GY + 0.98, w: 2.2, h: 0.35, size: 15, bold: true, color: C.or, align: 'center', name: '!!alt' + q });
        });
        s.text(i === 3 ? 'Vorderachse' : '', { x: X + T[3].ax[0] * k - 1.1, y: GY + 1.3, w: 2.2, h: 0.3, size: 12, color: C.mut, align: 'center', name: '!!an0' });
        s.text(i === 3 ? 'Antriebsachse' : '', { x: X + T[3].ax[1] * k - 1.1, y: GY + 1.3, w: 2.2, h: 0.3, size: 12, color: C.mut, align: 'center', name: '!!an1' });
      },
    });
  }

  // ===== ÜBERLADUNG AUF DER WAAGE (fließend) =====
  {
    const ROWS = [['2–5 %', '30 €', '35 €'], ['über 5 %', '80 € + 1 P', '140 € + 1 P'], ['über 10 %', '110 € + 1 P', '235 € + 1 P'], ['über 15 %', '140 € + 1 P', '285 € + 1 P'], ['über 20 %', '190 € + 1 P', '380 € + 1 P'], ['über 25 %', '285 € + 1 P', '425 € + 1 P'], ['über 30 %', '380 € + 1 P', '425 € + 1 P']];
    const fr = (w, n, o = {}) => ({ t: { w, n }, ...o });
    const rowOf = p => p > 30 ? 6 : p > 25 ? 5 : p > 20 ? 4 : p > 15 ? 3 : p > 10 ? 2 : p > 5 ? 1 : p > 2 ? 0 : -1;
    await motion(deck, 'c8m', {
      kicker: 'Überladung', ttl: 'Ab auf die Waage', dur: 480, holdDur: 800,
      question: 'Euer 18-Tonner wiegt auf der Waage fast 20 Tonnen. Wer zahlt – und wie viel?',
      answer: 'Fahrer UND Halter. Über 10 %: Fahrer 110 €, Halter 235 €, je 1 Punkt. Weiter geht es erst nach dem Abladen.',
      legend: 'Bußgelder für Kfz über 7,5 t (bussgeldkatalog.de, Stand 07/2026) · P = Punkt in Flensburg',
      frames: [
        fr(14.2, 4, { hold: true, cap: 'Ein 18-Tonner wird beladen. Die Waage zeigt das tatsächliche Gewicht.', note: '▶ Sagen: „Ein 18-Tonner wird beladen. Die Polizei kann ihn jederzeit auf die Waage holen.“\n❓ Frage auf der Folie stellen: Wer zahlt bei Überladung?\n🖱 Klick: Es wird weiter geladen (läuft von selbst).\n➜ „Weiter laden.“' }),
        fr(15.5, 6), fr(16.8, 8),
        fr(18.0, 10, { hold: true, cap: 'Genau 18 t – voll, aber erlaubt.', note: '▶ „Genau 18 Tonnen – erlaubt. Jetzt sagt der Disponent: Die zwei Paletten passen doch noch drauf …“\n🖱 Klick: weiter (läuft von selbst).\n➜ „Noch zwei Paletten.“' }),
        fr(18.6, 11, { cap: 'Mehr als 2 % zu viel: Ab hier wird es teuer.' }), fr(19.3, 12),
        fr(19.9, 13, { hold: true, answer: true, cap: 'Über 10 % zu schwer: Bußgeld und Punkt für Fahrer und Halter – und Abladen, bevor es weitergeht.', note: '▶ „19,9 Tonnen – mehr als 10 Prozent zu viel. Ihr als Fahrer zahlt 110 Euro und bekommt einen Punkt. Der Halter zahlt sogar 235 Euro und bekommt auch einen Punkt. Und weiterfahren dürft ihr erst, wenn abgeladen ist.“\n✅ bussgeldkatalog.de „Überladung Lkw“ (Stand 12.07.2026), Kfz über 7,5 t. Überladung gilt ab mehr als 2 %.\n✅ Prüfungsfrage 2.2.22-203: Überladung feststellen durch Nachwiegen oder eingebaute Achslastmessgeräte – nicht durch eine Bremsprobe.\n💡 Überladung ist gefährlich: längerer Bremsweg, überlastete Reifen und Bremsen, mehr Fliehkraft. Ihr seid verantwortlich – auch wenn der Disponent drängt.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Kapitel 3: Ladung, die herausragt.“' }),
      ],
      scene: async (s, { w, n }) => {
        const GY = 3.85, k = 0.66, X = 5.95, L = 5.6;
        // Waage
        s.rrect(5.75, GY, 4.1, 0.16, { fill: '5A6576', rr: 0.3, name: '!!waage' });
        s.rect(5.75, GY + 0.16, 4.1, 0.08, { fill: '3C4656', name: '!!waage2' });
        const r = await lkw(s, { L, axles: [0.78, 4.05] }, { x: X, gy: GY, k, split: true, lift: -Math.max(0, (w - 14) * 0.012), name: 'lkwW' });
        // Ladung im aufgeschnittenen Aufbau
        const sag = Math.max(0, (w - 14) * 0.012) * k;
        const [bx0, by0] = r.pt(1.58, 0.75 + 1.45), [bx1, by1] = r.pt(L - 0.12, 0.82);
        s.rect(bx0, by0 + sag, bx1 - bx0, by1 - by0, { fill: '1A1F27', ft: 12, name: '!!innen' });
        const cw = (bx1 - bx0 - 0.1) / 7, chh = (by1 - by0 - 0.1) / 2;
        for (let q = 0; q < 14; q++) {
          const col = q % 7, row = Math.floor(q / 7), on = q < n;
          s.rrect(bx0 + 0.05 + col * cw + 0.02, by1 + sag - 0.05 - (row + 1) * chh + 0.03, cw - 0.04, chh - 0.04, { fill: q >= 10 ? 'C96A3A' : 'B9864A', ft: on ? 0 : 100, line: on ? '6E4E2A' : undefined, rr: 0.06, name: '!!pal' + q });
        }
        // Anzeige
        const p = (w / 18 - 1) * 100, row = rowOf(p), col = w <= 18.0001 ? C.gr : (row >= 2 ? C.red : C.or);
        s.rrect(10.1, 1.55, 2.95, 1.5, { fill: '0B1016', line: col, lw: 2, rr: 0.12, name: '!!disp' });
        s.text(w.toFixed(1).replace('.', ',') + ' t', { x: 10.1, y: 1.6, w: 2.95, h: 0.9, size: 40, bold: true, color: col, align: 'center', valign: 'middle', font: 'Consolas', name: '!!disv' });
        s.text(w <= 18.0001 ? 'erlaubt: 18,0 t' : '+' + p.toFixed(1).replace('.', ',') + ' %', { x: 10.1, y: 2.45, w: 2.95, h: 0.45, size: 18, bold: true, color: col, align: 'center', name: '!!disp2' });
        // Bußgeldtabelle
        const TY = 4.22, RH = 0.285;
        s.text('Überladung', { x: 5.8, y: TY, w: 2.2, h: RH, size: 13, bold: true, color: C.mut, valign: 'middle', name: '!!th0' });
        s.text('Fahrer', { x: 8.1, y: TY, w: 2.3, h: RH, size: 13, bold: true, color: C.mut, valign: 'middle', name: '!!th1' });
        s.text('Halter', { x: 10.5, y: TY, w: 2.5, h: RH, size: 13, bold: true, color: C.mut, valign: 'middle', name: '!!th2' });
        s.rrect(5.7, TY + RH + 0.02 + Math.max(0, row) * RH, 7.35, RH, { fill: row >= 2 ? '3A1A1E' : '3A2E14', line: row >= 2 ? C.red : C.or, ft: row >= 0 ? 0 : 100, lt: row >= 0 ? 0 : 100, rr: 0.15, name: '!!hl' });
        ROWS.forEach((rw, q) => {
          const y = TY + RH + 0.02 + q * RH, on = q === row;
          s.text(rw[0], { x: 5.8, y, w: 2.2, h: RH, size: 12.5, bold: on, color: on ? C.txt : C.mut, valign: 'middle', name: '!!r0' + q });
          s.text(rw[1], { x: 8.1, y, w: 2.3, h: RH, size: 12.5, bold: on, color: on ? C.txt : C.mut, valign: 'middle', name: '!!r1' + q });
          s.text(rw[2], { x: 10.5, y, w: 2.5, h: RH, size: 12.5, bold: on, color: on ? C.txt : C.mut, valign: 'middle', name: '!!r2' + q });
        });
      },
    });
  }
};
