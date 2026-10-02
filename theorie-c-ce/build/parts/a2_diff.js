// Abend 2 · C3: Differenzial in der Kurve, Differenzialsperre, Achsformeln, ASR
const { C, base, kick, title, card, point, CLICK, ask, quiz, steps, foot, svgImg, chapter } = require('../gs');
const { icon } = require('../lib');

// Draufsicht einer Antriebsachse in der Kurve: Kurvenmittelpunkt links unten
const CX = 6.0, CY = 6.6;
module.exports = async (deck) => {
  await chapter(deck, 'c3d', { num: 4, ttl: 'Differenzial und Achsen', sub: 'Warum die Räder verschieden schnell drehen – und wann man sperrt.', bg: 'g_bau_r.jpg', bgX: 6.2, notes:
    '▶ Sagen: „Letztes Kapitel von C3: das Differenzial, die Sperre und die Achsformeln wie 6×4 oder 8×4. Auf dem Bild: ein Baustellen-Kipper mit vier Achsen.“\n🖱 Keine Klicks.\n➜ „Erst die Frage: Warum braucht man überhaupt ein Differenzial?“' });
  // ===== DIFFERENZIAL IN DER KURVE (Morph) =====
  const R1 = 3.2, R2 = 4.35; // innerer / äußerer Radius (Zoll)
  await steps(deck, 'c3d', {
    kicker: 'Differenzial', ttl: 'Kurve: zwei Wege',
    list: ['Geradeaus: gleich schnell', 'Kurve: innen kurzer Weg', 'Außen langer Weg', 'Differenzial gleicht aus'],
    caps: [
      'Geradeaus legen beide Antriebsräder den gleichen Weg zurück – sie drehen gleich schnell.',
      'In der Kurve fährt das innere Rad einen kleinen Bogen …',
      '… das äußere Rad einen großen Bogen. Es muss in derselben Zeit mehr Weg schaffen.',
      'Das Differenzial lässt die Räder verschieden schnell drehen. Ohne es würden die Reifen radieren und die Achse verspannen.',
    ],
    notes: [
      '▶ Sagen: „Stellt euch die Hinterachse von oben vor. Geradeaus: beide Räder gleich schnell.“\n❓ „Was passiert in der Kurve?“\n➜ „Schauen wir genau hin.“',
      '▶ „Das innere Rad fährt einen kleinen Bogen.“\n➜ „Und das äußere?“',
      '▶ „Das äußere Rad einen viel größeren. In derselben Zeit – also muss es schneller drehen.“\n➜ „Wer sorgt dafür?“',
      '▶ „Das Differenzial, auch Ausgleichsgetriebe. Es verteilt die Kraft und erlaubt verschiedene Drehzahlen.“\n💡 Der Nachteil kommt gleich: Dreht ein Rad auf Eis durch, bekommt das andere kaum noch Kraft.\n➜ „Und genau dafür gibt es die Differenzialsperre.“',
    ],
    legend: 'Draufsicht · schematisch',
    scene: async (s, i) => {
      const curve = i >= 1;
      // Fahrbahn: gerade oder gebogen (als Bild)
      const W = 7.4, Hh = 5.4, px = 100;
      let svg = '';
      if (!curve) svg = `<rect x="${(CX + R1 - 0.4 - 5.6) * px}" y="0" width="${(R2 - R1 + 0.8) * px}" height="${Hh * px}" fill="#232A35"/>`;
      else {
        const cx = (CX - 5.6) * px, cy = (CY - 1.25) * px;
        svg = `<path d="M ${cx + (R1 - 0.4) * px} ${cy} A ${(R1 - 0.4) * px} ${(R1 - 0.4) * px} 0 0 0 ${cx} ${cy - (R1 - 0.4) * px} L ${cx} ${cy - (R2 + 0.4) * px} A ${(R2 + 0.4) * px} ${(R2 + 0.4) * px} 0 0 1 ${cx + (R2 + 0.4) * px} ${cy} Z" fill="#232A35"/>`;
        if (i >= 1) svg += `<path d="M ${cx + R1 * px} ${cy} A ${R1 * px} ${R1 * px} 0 0 0 ${cx + R1 * px * Math.cos(1.2)} ${cy - R1 * px * Math.sin(1.2)}" fill="none" stroke="#4CC9F0" stroke-width="10" stroke-dasharray="20 12"/>`;
        if (i >= 2) svg += `<path d="M ${cx + R2 * px} ${cy} A ${R2 * px} ${R2 * px} 0 0 0 ${cx + R2 * px * Math.cos(1.2)} ${cy - R2 * px * Math.sin(1.2)}" fill="none" stroke="#FFB547" stroke-width="10" stroke-dasharray="20 12"/>`;
      }
      s.img(await svgImg(svg, W * px, Hh * px), { x: 5.6, y: 1.25, w: W, h: Hh, name: '!!bahn' });
      // Achse mit zwei Rädern
      const ax = CX + R1 - 0.05;
      const y0 = CY - 0.35;
      const len = R2 - R1;
      s.rect(ax, y0, len, 0.1, { fill: '9AA6B5', name: '!!achse' });
      s.rrect(ax - 0.2, y0 - 0.32, 0.4, 0.74, { fill: '1B1F26', line: C.bl, lw: 2, rr: 0.2, name: '!!rad1' });
      s.rrect(ax + len - 0.2, y0 - 0.32, 0.4, 0.74, { fill: '1B1F26', line: C.or, lw: 2, rr: 0.2, name: '!!rad2' });
      s.rrect(ax + len / 2 - 0.22, y0 - 0.22, 0.44, 0.54, { fill: i === 3 ? 'C9A227' : '55606F', line: i === 3 ? C.white : '55606F', lw: 2, rr: 0.1, name: '!!diffk', glow: i === 3 ? 10 : undefined, glowColor: 'C9A227' });
      // Tachowerte
      const v1 = curve ? (i >= 1 ? 'langsam' : '') : 'gleich', v2 = curve ? (i >= 2 ? 'schnell' : '') : 'gleich';
      s.text('innen: ' + v1, { x: 10.9, y: 1.6, w: 2.4, h: 0.4, size: 17, bold: true, color: C.bl, name: '!!v1' });
      s.text('außen: ' + v2, { x: 10.9, y: 2.05, w: 2.4, h: 0.4, size: 17, bold: true, color: C.or, name: '!!v2' });
    },
  });
  // ===== DIFFERENZIALSPERRE =====
  {
    const s = base(deck, 'c3d', { notes:
      '▶ Sagen: „Der Nachteil des Differenzials: Steht ein Rad auf Eis oder im Schlamm, dreht es durch – und das andere Rad mit Grip bekommt kaum Kraft. Ihr steckt fest.“\n' +
      '❓ „Was hilft?“\n' +
      '🖱 Klick 1: Problem · Klick 2: Lösung Sperre · Klick 3–5: die Regeln.\n' +
      '✅ Die Differenzialsperre verbindet beide Räder fest – sie drehen gleich schnell, die Kraft geht auch an das Rad mit Grip. Es gibt Quersperren (zwischen links und rechts) und Längssperren (zwischen Achsen bei mehreren Antriebsachsen).\n' +
      '✅ Regeln aus den Betriebsanleitungen: nur bei Bedarf (lockerer, rutschiger Untergrund), nur im Stand oder in Schrittgeschwindigkeit einlegen, nicht mit durchdrehendem Rad einlegen, nicht auf griffiger Straße und nicht in Kurven fahren (der Lkw lässt sich kaum lenken, Achse und Reifen werden überlastet), sofort wieder ausschalten.\n' +
      '💡 Kontrollleuchte im Cockpit zeigt: Sperre ist drin.\n' +
      '➜ „Damit zu den Bezeichnungen wie 6×4.“' });
    kick(s, 'Differenzialsperre'); title(s, 'Festgefahren – was tun?');
    await point(s, 0.7, 2.05, 5.85, 1.4, 'LuSnowflake', C.bl, 'Problem', 'Ein Rad auf Eis dreht durch – das andere bekommt kaum Kraft.', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 2.05, 5.85, 1.4, 'LuLock', 'C9A227', 'Sperre', 'verbindet beide Räder fest – die Kraft geht auch an das Rad mit Grip.', CLICK, { br: true, size: 17 });
    await point(s, 0.7, 3.65, 11.93, 0.85, 'LuGauge', C.gr, 'Nur im Stand oder im Schritttempo einlegen', '– nicht, wenn ein Rad schon durchdreht.', CLICK, { size: 17 });
    await point(s, 0.7, 4.65, 11.93, 0.85, 'LuBan', C.red, 'Nicht auf griffiger Straße, nicht in Kurven', '– der Lkw lässt sich kaum lenken, die Achse wird überlastet.', CLICK, { size: 17 });
    await point(s, 0.7, 5.65, 11.93, 0.85, 'LuCircleCheck', C.or, 'Sofort wieder ausschalten,', 'wenn ihr frei seid. Kontrollleuchte beachten.', CLICK, { size: 17 });
  }
  // ===== ACHSFORMELN (Draufsichten) =====
  {
    const s = base(deck, 'c3d', { notes:
      '▶ Sagen: „Im Fahrzeugschein oder im Gespräch hört ihr: 4×2, 6×4, 8×4. Was heißt das?“\n' +
      '❓ „Wer weiß es?“\n' +
      '🖱 Klick 1–5: je eine Achsformel.\n' +
      '✅ Erste Zahl: Anzahl der Radstellen (Räder von außen gezählt, Zwillingsräder zählen als eine). Zweite Zahl: davon angetrieben. Also: 4×2 = zwei Achsen, eine angetrieben · 6×2 = drei Achsen, eine angetrieben (dazu Nachlauf- oder Vorlaufachse) · 6×4 = drei Achsen, zwei angetrieben · 8×4 = vier Achsen, zwei angetrieben, meist zwei Lenkachsen vorn (Baustelle) · 6×6 = Allrad.\n' +
      '💡 Mehr angetriebene Achsen = mehr Zugkraft im Gelände, aber mehr Gewicht und Verbrauch.\n' +
      '➜ „Und noch ein Helfer beim Anfahren: die ASR.“' });
    kick(s, 'Achsformeln'); title(s, 'Was heißt 6 × 4?');
    s.text([{ text: 'Radstellen', options: { bold: true, color: C.txt } }, { text: '  ×  ', options: { color: C.dim } }, { text: 'davon angetrieben', options: { bold: true, color: C.or } }], { x: 0.7, y: 1.75, w: 11.9, h: 0.45, size: 20 });
    const F = [['4 × 2', [0, 1], [1]], ['6 × 2', [0, 1, 2], [1]], ['6 × 4', [0, 1, 2], [1, 2]], ['8 × 4', [0, 1, 2, 3], [2, 3]], ['6 × 6', [0, 1, 2], [0, 1, 2]]];
    for (let k = 0; k < 5; k++) {
      const x = 0.7 + k * 2.42, w = 2.25;
      card(s, x, 2.4, w, 4.1, {}, CLICK);
      s.text(F[k][0], { x, y: 2.5, w, h: 0.55, size: 26, bold: true, color: C.or, align: 'center' }, { fx: 'fade', dur: 200 });
      // Draufsicht: Fahrzeug senkrecht, Front oben
      const cx = x + w / 2, top = 3.25, L = 2.9;
      s.rrect(cx - 0.32, top, 0.64, 0.55, { fill: 'D9DEE6', rr: 0.15 }, { fx: 'fade', dur: 200 });
      s.rect(cx - 0.28, top + 0.6, 0.56, L - 0.6, { fill: '3C4656' }, { fx: 'fade', dur: 200 });
      const n = F[k][1].length;
      const ys = n === 2 ? [top + 0.35, top + L - 0.3] : n === 3 ? [top + 0.35, top + L - 0.75, top + L - 0.2] : [top + 0.3, top + 0.85, top + L - 0.75, top + L - 0.2];
      for (let a = 0; a < n; a++) {
        const drv = F[k][2].includes(a), twin = a > 0 && !(k === 3 && a === 1);
        const col = drv ? C.or : '6E7888';
        for (const sx of [-1, 1]) s.rrect(cx + sx * 0.52 - (twin ? 0.17 : 0.11), ys[a] - 0.18, twin ? 0.34 : 0.22, 0.36, { fill: col, rr: 0.15 }, { fx: 'fade', dur: 200 });
        s.rect(cx - 0.42, ys[a] - 0.03, 0.84, 0.06, { fill: col }, { fx: 'fade', dur: 200 });
      }
    }
    foot(s, 'Orange = angetriebene Achse · Zwillingsräder zählen als eine Radstelle · schematisch');
  }
  // ===== ASR =====
  {
    const s = base(deck, 'c3d', { notes:
      '▶ Sagen: „Die ASR – Antriebs-Schlupf-Regelung – verhindert, dass die Antriebsräder beim Anfahren durchdrehen. Sie arbeitet automatisch mit den Sensoren des ABS.“\n' +
      '❓ „Beim Anfahren blinkt die ASR-Leuchte. Was heißt das für euch?“\n' +
      '🖱 Klick 1: was ASR macht · Klick 2: Leuchte blinkt · Klick 3: ASR-Taste · Klick 4: Unterschied zur Sperre.\n' +
      '✅ ASR bremst das durchdrehende Rad und/oder nimmt Motorleistung zurück. Blinkt die Leuchte, regelt die ASR gerade: Die Straße ist glatt – Gas zurück. Leuchtet sie dauernd: ASR aus oder gestört (je nach Hersteller).\n' +
      '✅ ASR-Taste (Offroad- oder Tiefschnee-Funktion): nur bei Tiefschnee, losem Untergrund, mit Schneeketten oder zum Freifahren – am Berg erst, wenn ihr langsamer als etwa 25–30 km/h seid. Bei höherem Tempo nicht: Die Antriebsachse kann ausbrechen. Danach wieder einschalten (Quelle: eurotransport, Lkw-Fahren im Winter; Betriebsanleitung).\n' +
      '➜ „Damit ist Kapitel 4 geschafft. Zeit zum Mitschreiben.“' });
    kick(s, 'Antriebs-Schlupf-Regelung (ASR)'); title(s, 'Der automatische Helfer beim Anfahren');
    // Kontrollleuchte (schematisch)
    card(s, 0.7, 2.05, 3.6, 4.4, {});
    s.rrect(1.3, 2.6, 2.4, 1.6, { fill: '0A0F16', line: '3C4656', lw: 2, rr: 0.12 });
    s.text('ASR', { x: 1.3, y: 2.6, w: 2.4, h: 1.6, size: 44, bold: true, color: C.am, align: 'center', valign: 'middle', glow: 12, glowColor: C.am });
    s.text('Kontrollleuchte', { x: 0.8, y: 4.35, w: 3.4, h: 0.4, size: 16, bold: true, color: C.txt, align: 'center' });
    s.text('Aussehen je nach Hersteller', { x: 0.8, y: 4.75, w: 3.4, h: 0.35, size: 13, italic: true, color: C.dim, align: 'center' });
    s.text('blinkt = ASR regelt gerade', { x: 0.8, y: 5.4, w: 3.4, h: 0.7, size: 15, bold: true, color: C.am, align: 'center' });
    await point(s, 4.55, 2.05, 8.08, 1.0, 'LuCog', 'C9A227', 'Was macht ASR?', 'bremst das durchdrehende Rad und nimmt Gas weg – automatisch.', CLICK, { size: 16 });
    await point(s, 4.55, 3.2, 8.08, 1.0, 'LuSnowflake', C.bl, 'Leuchte blinkt:', 'die Straße ist glatt – Gas zurücknehmen.', CLICK, { size: 16 });
    await point(s, 4.55, 4.35, 8.08, 1.0, 'LuPower', C.or, 'ASR-Taste nur bei Tiefschnee, Ketten, losem Boden –', 'langsamer als etwa 25–30 km/h. Danach wieder an.', CLICK, { size: 16 });
    await point(s, 4.55, 5.5, 8.08, 0.95, 'LuLock', C.mut, 'Nicht verwechseln:', 'ASR regelt von selbst – die Sperre verriegelt fest.', CLICK, { size: 16 });
  }
};
