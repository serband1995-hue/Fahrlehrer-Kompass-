// Abend 5 · C9: Kapitel 3 Fahrzeug und Lastverteilung (Aufbau-Festigkeit, Zurrpunkte, Lastverteilungsplan)
const { C, sec, chapter, motion, steps, ask, quiz, svgImg, lkw } = require('../gs');

sec('c9f', 'C9  ·  FAHRZEUG UND LASTVERTEILUNG', 'C9A227', 'bg_am.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'c9f', { num: 3, ttl: 'Fahrzeug und Lastverteilung', sub: 'Was hält der Aufbau aus – und wo darf die Ladung stehen?', ico: 'LuScale', notes:
    '▶ Sagen: „Kapitel 3: Was trägt das Fahrzeug selbst zur Sicherung bei? Und warum ist es nicht egal, wo die Ladung steht?“\n🖱 Keine Klicks.\n➜ „Zuerst: Wie stark ist der Aufbau?“' });

  // ===== WIE STARK IST DER AUFBAU? (Morph, Draufsicht) =====
  {
    const WALL = [
      { k: 'front', lab: 'Stirnwand', L: 40, XL: 50, need: 80, dir: 'nach vorn' },
      { k: 'side', lab: 'Seitenwand', L: 30, XL: 40, need: 50, dir: 'zur Seite' },
      { k: 'rear', lab: 'Rückwand', L: 25, XL: 30, need: 50, dir: 'nach hinten' },
    ];
    await steps(deck, 'c9f', {
      kicker: 'Aufbau', ttl: 'Wie viel hält der Aufbau?',
      list: ['Stirnwand', 'Seitenwände', 'Rückwand', 'Verstärkt: Code XL'],
      ask: { q: 'Hält eine normale Stirnwand die Ladung bei einer Vollbremsung allein?', a: 'Nein. Sie hält nur 40 % der Nutzlast – höchstens 5 t. Nach vorn drücken bis 80 %.', at: 1 },
      caps: [
        'Normaler Aufbau: Die Stirnwand hält 40 % der Nutzlast – höchstens 5 Tonnen. Nach vorn drückt die Ladung mit bis zu 80 %.',
        'Die Seitenwände halten 30 % der Nutzlast. Zur Seite drückt die Ladung mit bis zu 50 %.',
        'Die Rückwand hält 25 % – höchstens 3,1 Tonnen. Nach hinten drückt die Ladung mit bis zu 50 %.',
        'Verstärkter Aufbau „Code XL“: 50 % vorn, 40 % seitlich, 30 % hinten. Das steht im Zertifikat des Aufbaus.',
      ],
      notes: [
        '▶ Sagen: „Wir schauen von oben auf einen Lkw mit Kofferaufbau. Wie viel hält die Stirnwand vorn? Bei einem normalen Aufbau: 40 Prozent der Nutzlast – aber höchstens 5 Tonnen.“\n❓ Frage auf der Folie stellen.\n✅ DIN EN 12642, Code L (Standardaufbau): Stirnwand 0,4 × Nutzlast, höchstens 5.000 daN.\n➜ „Und die Seitenwände?“',
        '▶ „Die Antwort: Nein. Die Stirnwand allein reicht nicht – den Rest müssen Gurte schaffen. Seitenwände: 30 Prozent der Nutzlast.“\n✅ DIN EN 12642, Code L: Seitenwände 0,3 × Nutzlast.\n➜ „Und hinten?“',
        '▶ „Die Rückwand – also die Türen – halten 25 Prozent, höchstens 3,1 Tonnen. Ladung nie einfach gegen die Türen fallen lassen – beim Öffnen kann sie herausstürzen!“\n✅ DIN EN 12642, Code L: Rückwand 0,25 × Nutzlast, höchstens 3.100 daN.\n➜ „Es gibt auch stärkere Aufbauten.“',
        '▶ „Verstärkte Aufbauten heißen Code XL: Stirnwand 50, Seiten 40, Rückwand 30 Prozent. Ob euer Aufbau XL ist, steht im Zertifikat. Auch dann gilt: Die Wände helfen nur, wenn die Ladung lückenlos dran steht.“\n✅ DIN EN 12642, Code XL: Stirnwand 0,5 P, Seitenwände 0,4 P, Rückwand 0,3 P (BG BAU „Ladungssicherung“ 2021, Tabelle 3). Werte gelten bei gleichmäßig verteilter Last; Aufbauten vor 2002: nur Herstellerangaben.\n💡 Rechenbeispiel: 24 t Nutzlast, Code L – die Stirnwand hält höchstens 5.000 daN, die Vollbremsung erzeugt bis 19.200 daN.\n➜ „Und wo befestigt man die Gurte?“',
      ],
      legend: 'Draufsicht · Anteile der Nutzlast (DIN EN 12642) · gerundet',
      scene: async (s, i) => {
        const xl = i === 3, on = k => xl || (k === 'front' && i === 0) || (k === 'side' && i === 1) || (k === 'rear' && i === 2);
        const col = k => on(k) ? (xl ? C.gr : 'C9A227') : '5A6576';
        // Fahrerhaus + Aufbau
        s.rrect(6.75, 1.55, 2.1, 0.85, { fill: 'D4D9E1', line: '9AA4B1', lw: 1, rr: 0.25, name: '!!cab' });
        s.rect(6.6, 2.55, 2.4, 3.8, { fill: '1A2230', name: '!!box' });
        [[6.85, 2.85], [7.85, 2.85], [6.85, 3.85], [7.85, 3.85]].forEach(([x, y], q) => s.rect(x, y, 0.9, 0.9, { fill: 'B9864A', line: '6E4E2A', lw: 1, name: '!!p' + q }));
        const th = k => on(k) ? 0.16 : 0.1;
        s.rect(6.6, 2.55, 2.4, th('front'), { fill: col('front'), glow: on('front') ? 8 : undefined, glowColor: col('front'), name: '!!wF' });
        s.rect(6.6, 2.55, th('side'), 3.8, { fill: col('side'), glow: on('side') ? 8 : undefined, glowColor: col('side'), name: '!!wSL' });
        s.rect(9.0 - th('side'), 2.55, th('side'), 3.8, { fill: col('side'), glow: on('side') ? 8 : undefined, glowColor: col('side'), name: '!!wSR' });
        s.rect(6.6, 6.35 - th('rear'), 2.4, th('rear'), { fill: col('rear'), glow: on('rear') ? 8 : undefined, glowColor: col('rear'), name: '!!wR' });
        s.text('Fahrtrichtung ↑', { x: 5.75, y: 1.6, w: 0.95, h: 0.7, size: 12, color: C.dim, name: '!!fr' });
        // Beschriftung an den Wänden
        const lab = (w, x, y, q) => s.text([{ text: w.lab + '  ', options: { bold: true, color: on(w.k) ? C.txt : C.mut } }, { text: (xl ? w.XL : w.L) + ' %', options: { bold: true, color: col(w.k) } }], { x, y, w: 2.3, h: 0.4, size: 15, valign: 'middle', name: '!!wl' + q });
        lab(WALL[0], 9.15, 2.42, 0); lab(WALL[1], 9.15, 4.25, 1); lab(WALL[2], 9.15, 6.05, 2);
        // Vergleich rechts: hält / gebraucht
        const w = WALL[Math.min(i, 2) === 3 ? 0 : (xl ? 0 : i)], held = xl ? w.XL : w.L, B = 6.2, SC = 0.04;
        s.text(xl ? 'Code XL · vorn' : 'Code L · ' + w.dir, { x: 10.85, y: 1.6, w: 2.2, h: 0.35, size: 14, bold: true, color: C.mut, align: 'center', name: '!!vh' });
        [[w.need, 'gebraucht', C.red], [held, 'Wand hält', xl ? C.gr : 'C9A227']].forEach(([v, t, c], q) => {
          const x = 11.0 + q * 1.05;
          s.rrect(x, B - v * SC, 0.8, v * SC, { fill: c, rr: 0.08, name: '!!vb' + q });
          s.text(v + ' %', { x: x - 0.2, y: B - v * SC - 0.42, w: 1.2, h: 0.38, size: 18, bold: true, color: c, align: 'center', name: '!!vv' + q });
          s.text(t, { x: x - 0.25, y: B + 0.05, w: 1.3, h: 0.32, size: 12, color: C.mut, align: 'center', name: '!!vt' + q });
        });
      },
    });
  }

  // ===== LASTVERTEILUNGSPLAN (fließend) =====
  {
    // Beispiel-Lkw 18 t: leer VA 4,5 t / HA 3,0 t, Achslast VA max 8 t, HA max 11,5 t, Nutzlast max 10,5 t,
    // Radstand 5,5 m, Stirnwand 0,9 m hinter der Vorderachse, Lenkachse mind. 20 % (DGUV V 70 § 37 DA)
    const WB = 5.5, OFF = 0.9, P0 = 8;
    const lim = d => {
      const x = OFF + d, r = x / WB;
      let p = 10.5;
      if (r < 1) p = Math.min(p, 3.5 / (1 - r));
      p = Math.min(p, 8.5 / r);
      if (r > 0.8) p = Math.min(p, 3.0 / (r - 0.8));
      return p;
    };
    const axle = d => { const r = (OFF + d) / WB; return { va: 4.5 + P0 * (1 - r), ha: 3.0 + P0 * r }; };
    const CX0 = 6.7, CXS = 0.87, CY0 = 6.38, CYS = 0.165;
    const cx = d => CX0 + d * CXS, cy = p => CY0 - p * CYS;
    let pts = [];
    for (let d = 0; d <= 7.001; d += 0.05) pts.push([(d * CXS * 100).toFixed(1), ((11 - lim(d)) * CYS * 100).toFixed(1)]);
    const Wp = (7 * CXS * 100).toFixed(1), Hp = (11 * CYS * 100).toFixed(1);
    const curve = await svgImg(`<path d="M0 ${Hp} ${pts.map(p => 'L' + p[0] + ' ' + p[1]).join(' ')} L${Wp} ${Hp} Z" fill="#38D98A" fill-opacity="0.18"/><path d="M${pts.map(p => p[0] + ' ' + p[1]).join(' L')}" fill="none" stroke="#38D98A" stroke-width="4" stroke-linejoin="round"/>`, 7 * CXS * 100, 11 * CYS * 100, 2);
    const L = 6.4, K = 1.05, X = 6.0, GY = 3.45, BED0 = 1.42, MS = (L - 0.05 - BED0) / 7;
    const fr = (d, o = {}) => ({ ...o, t: { d, ...(o.t || {}) } });
    await motion(deck, 'c9f', {
      kicker: 'Lastverteilungsplan', ttl: 'Wo darf die Ladung stehen?', dur: 450, holdDur: 650,
      question: '8 Tonnen auf einem 18-Tonner: Ist es egal, wo die Ladung auf der Ladefläche steht?',
      answer: 'Nein! Zu weit vorn: Vorderachse überlastet. Zu weit hinten: Hinterachse überlastet und die Lenkachse zu leicht.',
      legend: 'Beispiel 18-t-Lkw · waagerecht: Abstand Ladungsschwerpunkt – Stirnwand · senkrecht: zulässige Ladung',
      frames: [
        fr(0.5, { hold: true, cap: 'Die 8 Tonnen stehen ganz vorn an der Stirnwand. Gut für den Formschluss – aber was sagt der Plan?', note: '▶ Sagen: „8 Tonnen auf einem 18-Tonner. Wir stellen sie ganz nach vorn an die Stirnwand – das ist doch gut für den Formschluss, oder?“\n❓ Frage auf der Folie stellen.\n💡 Unten ist der Lastverteilungsplan: Die grüne Fläche zeigt, wie viel Ladung an welcher Stelle erlaubt ist. Der Punkt zeigt unsere 8 Tonnen.\n🖱 Klick: Die Ladung wandert nach hinten (läuft von selbst bis zur Mitte).\n➜ „Vorne ist die Vorderachse überlastet. Schieben wir sie nach hinten.“' }),
        fr(1.3, { cap: 'Wir schieben die Ladung nach hinten …' }), fr(2.1),
        fr(3.1, { hold: true, cap: 'In der Mitte passt alles: Beide Achsen sind im grünen Bereich.', note: '▶ „Jetzt passt es: Der Punkt liegt in der grünen Fläche. Vorder- und Hinterachse sind unter ihrer Grenze.“\n🖱 Klick: Die Ladung wandert weiter nach hinten.\n➜ „Und ganz hinten?“' }),
        fr(4.0), fr(5.0),
        fr(6.2, { hold: true, answer: true, cap: 'Ganz hinten: Die Hinterachse ist überlastet – und die Vorderachse zu leicht. Der Lkw lenkt und bremst schlecht.', note: '▶ „Ganz hinten ist die Hinterachse überlastet. Und vorne fehlt Gewicht – die Lenkachse wird zu leicht, der Lkw lenkt schlecht.“\n✅ Prüfungsfragen 2.2.22-217 (Lastverteilungsplan einhalten: Achslastüberschreitungen vermeiden, Lenkfähigkeit gewährleisten), 2.2.22-218 (auch Achslastunterschreitungen vermeiden), 2.2.22-219 (Folgen: Reifenschäden, Lenkfähigkeit, Bremsverhalten), 2.2.22-220 (Angaben zum Ladungsschwerpunkt bei maximal zulässiger Last).\n✅ DGUV Vorschrift 70 § 37 (Durchführungsanweisung): Die gelenkte Achse muss mindestens 20 % des Fahrzeuggewichts tragen.\n💡 Bei Stückgut-Touren wandert der Schwerpunkt nach jedem Abladen – dann neu prüfen und ggf. umstauen.\n💡 Steht die Ladung wegen des Plans nicht an der Stirnwand, muss die Lücke nach vorn gesichert werden (Füllmittel, Sperrbalken oder Direktzurren).\n💡 Zahlen sind ein Beispiel – jeder Lkw hat seinen eigenen Plan (vom Aufbauhersteller).\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Kurz zur Prüfung.“' }),
      ],
      scene: async (s, { d }) => {
        const { va, ha } = axle(d), ok = P0 <= lim(d) + 1e-6, vaOver = va > 8, haOver = ha > 11.5, light = va < 0.2 * (7.5 + P0);
        // Lkw (Pritsche) + Ladung
        s.rect(5.75, GY, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
        await lkw(s, { L, floor: 0.75, boxH: 0.38, box: 'pritsche', axles: [0.78, 0.78 + WB * MS], top: 1.95 }, { x: X, gy: GY, k: K, name: '!!lkwL' });
        const bx = X + (BED0 + (d - 0.5) * MS) * K, bw = MS * K, by = GY - 0.82 * K;
        s.rect(bx, by - 0.72, bw, 0.72, { fill: 'B9864A', line: '6E4E2A', lw: 1.5, name: '!!last' });
        s.text('8 t', { x: bx, y: by - 0.72, w: bw, h: 0.72, size: 16, bold: true, color: '3A2A15', align: 'center', valign: 'middle', name: '!!lastT' });
        s.text(ok ? '✓  passt' : vaOver ? 'Vorderachse überlastet!' : haOver && light ? 'Hinterachse überlastet, Lenkachse zu leicht!' : 'Hinterachse überlastet!', { x: 8.6, y: 1.2, w: 4.45, h: 0.42, size: 15, bold: true, color: C.dark, fill: ok ? C.gr : C.red, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!stat' });
        // Achslast-Balken
        [['Vorderachse', va, 8, vaOver || light, 3.62], ['Hinterachse', ha, 11.5, haOver, 3.97]].forEach(([t, v, m, bad, y], q) => {
          s.text(t, { x: 5.75, y, w: 1.5, h: 0.28, size: 12, bold: true, color: C.mut, valign: 'middle', name: '!!al' + q });
          s.rrect(7.3, y + 0.05, 14 * 0.27, 0.18, { fill: '1A2433', line: C.line, rr: 0.5, name: '!!ab' + q });
          s.rrect(7.3, y + 0.05, Math.max(0.05, v * 0.27), 0.18, { fill: bad ? C.red : C.gr, rr: 0.5, name: '!!af' + q });
          s.rect(7.3 + m * 0.27 - 0.015, y, 0.03, 0.28, { fill: C.txt, name: '!!am' + q });
          s.text(v.toFixed(1).replace('.', ',') + ' / ' + String(m).replace('.', ',') + ' t', { x: 11.15, y, w: 1.9, h: 0.28, size: 13, bold: true, color: bad ? C.red : C.txt, align: 'right', valign: 'middle', name: '!!av' + q });
        });
        // Diagramm
        s.rect(CX0, cy(11), 0.015, 11 * CYS, { fill: '4A5668', name: '!!yAx' });
        s.rect(CX0, CY0, 7 * CXS, 0.015, { fill: '4A5668', name: '!!xAx' });
        s.img(curve, { x: CX0, y: cy(11), w: 7 * CXS, h: 11 * CYS, name: '!!kurve' });
        [5, 10].forEach(p => s.text(p + ' t', { x: 5.95, y: cy(p) - 0.13, w: 0.68, h: 0.26, size: 10, color: C.dim, align: 'right', name: '!!yt' + p }));
        [0, 2, 4, 6].forEach(m => s.text(m + ' m', { x: cx(m) - 0.3, y: CY0 + 0.03, w: 0.6, h: 0.24, size: 10, color: C.dim, align: 'center', name: '!!xt' + m }));
        s.lineS(CX0, cy(P0), CX0 + 7 * CXS, cy(P0), { color: C.mut, lw: 1.25, dash: 'dash', name: '!!l8' });
        s.text('8 t', { x: CX0 + 7 * CXS + 0.05, y: cy(P0) - 0.14, w: 0.5, h: 0.28, size: 11, bold: true, color: C.mut, name: '!!l8t' });
        s.text('Vorderachse zu schwer', { x: CX0 + 0.08, y: cy(10.9), w: 2.1, h: 0.26, size: 10, italic: true, color: 'E58A8A', name: '!!zv' });
        s.text('Hinterachse zu schwer,\nLenkachse zu leicht', { x: 10.75, y: cy(10.9), w: 2.05, h: 0.42, size: 10, italic: true, color: 'E58A8A', align: 'right', name: '!!zh' });
        s.rect(cx(d) - 0.008, cy(11), 0.016, 11 * CYS, { fill: ok ? C.gr : C.red, ft: 40, name: '!!vl' });
        s.oval(cx(d) - 0.13, cy(P0) - 0.13, 0.26, 0.26, { fill: ok ? C.gr : C.red, line: C.white, lw: 2, glow: 8, glowColor: ok ? C.gr : C.red, name: '!!pt' });
      },
    });
  }

  await quiz(deck, 'c9f', {
    kicker: 'Prüfungsfrage 2.2.22-219', q: 'Was kann die Folge sein, wenn die Beladung nicht dem Lastverteilungsplan entspricht?',
    opts: ['Ein Schaden an den Reifen', 'Eine Beeinflussung der Lenkfähigkeit', 'Eine Beeinträchtigung des Bremsverhaltens'], ok: [0, 1, 2],
    why: 'Alle drei! Überlastete Achsen überhitzen Reifen und Bremsen – und eine zu leichte Lenkachse lenkt schlecht.',
    notes: '▶ Sagen: „Eine Prüfungsfrage zum Lastverteilungsplan.“\n❓ Abstimmen lassen: Wer nimmt A, B, C?\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.22-219: alle drei Antworten richtig.\n➜ „Kapitel 4: Be- und Entladen.“',
  });
};
