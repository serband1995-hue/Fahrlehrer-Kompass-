// Abend 2 · C3: Differenzial in der Kurve, Differenzialsperre, Achsformeln, ASR
const { C, base, kick, title, card, point, CLICK, ask, quiz, steps, foot, svgImg, chapter, motion } = require('../gs');
const { icon } = require('../lib');

// Draufsicht einer Antriebsachse in der Kurve: Kurvenmittelpunkt links unten
const CX = 6.0, CY = 6.25;
module.exports = async (deck) => {
  await chapter(deck, 'c3d', { num: 4, ttl: 'Differenzial und Achsen', sub: 'Warum die Räder verschieden schnell drehen – und wann man sperrt.', bg: 'g_bau_r.jpg', bgX: 6.2, notes:
    '▶ Sagen: „Letztes Kapitel von C3: das Differenzial, die Sperre und die Achsformeln wie 6×4 oder 8×4. Auf dem Bild: ein Baustellen-Kipper.“\n🖱 Keine Klicks.\n➜ „Erst die Frage: Warum braucht man überhaupt ein Differenzial?“' });
  // ===== DIFFERENZIAL IN DER KURVE (fließend: Achse fährt durch die Kurve) =====
  {
    const R1 = 3.2, R2 = 4.35, px = 100, IW = 7.4, IH = 5.85, OX = 5.6, OY = 0.9; // Radien innen/außen, Bildfläche
    const cx = (CX - OX) * px, cy = (CY - OY) * px;
    // ein Fahrstreifen ohne Leitlinie (die Achse fährt mittig darauf); unten ein kurzes gerades Stück, damit die Räder im Startbild auf der Fahrbahn stehen
    const ri = (R1 - 0.4) * px, ro = (R2 + 0.4) * px;
    const road = `<path d="M ${cx + ri} ${cy + 45} L ${cx + ri} ${cy} A ${ri} ${ri} 0 0 0 ${cx} ${cy - ri} L ${cx} ${cy - ro} A ${ro} ${ro} 0 0 1 ${cx + ro} ${cy} L ${cx + ro} ${cy + 45} Z" fill="#232A35"/>`;
    const roadImg = await svgImg(road, IW * px, IH * px, 1);
    const arc = (r, a1, col) => `<path d="M ${cx + r * px} ${cy} A ${r * px} ${r * px} 0 0 0 ${cx + r * px * Math.cos(a1)} ${cy - r * px * Math.sin(a1)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`;
    const PH = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 0.98, 1.12];
    const frames = PH.map((f, k) => ({ t: f, hold: k === 0 || k === PH.length - 1, answer: k === PH.length - 1 }));
    frames[0].cap = 'Die Antriebsachse fährt in eine Linkskurve. Achtet auf die beiden Spuren.';
    frames[0].note = '▶ Sagen: „Wir schauen von oben auf die Hinterachse. Sie fährt gleich durch eine Linkskurve.“\n❓ Frage auf der Folie: „Welches Rad muss sich schneller drehen?“ – abstimmen lassen.\n🖱 Klick: Die Achse fährt durch die Kurve (läuft von selbst).\n➜ „Schaut auf die Spuren.“';
    frames[1].cap = 'Das innere Rad (blau) fährt einen kleinen Bogen, das äußere (orange) einen großen.';
    frames[8].cap = 'Gleiche Zeit, aber außen mehr Weg: Das äußere Rad muss schneller drehen. Das Differenzial macht es möglich.';
    frames[8].note = '▶ „In derselben Zeit legt das äußere Rad deutlich mehr Weg zurück – es muss schneller drehen. Das Differenzial, auch Ausgleichsgetriebe, lässt das zu und verteilt trotzdem die Kraft auf beide Räder.“\n💡 Ohne Differenzial würden die Reifen radieren und die Achse verspannen. Der Nachteil kommt gleich: Dreht ein Rad auf Eis durch, bekommt das andere kaum noch Kraft.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und genau dafür gibt es die Differenzialsperre.“';
    await motion(deck, 'c3d', {
      kicker: 'Differenzial', ttl: 'Kurve: zwei Wege', frames, dur: 380, holdDur: 600,
      question: 'Linkskurve: Welches Antriebsrad muss sich schneller drehen?',
      answer: 'Das äußere Rad – es fährt den längeren Weg. Das Differenzial gleicht das aus.',
      legend: 'Draufsicht · schematisch',
      scene: async (s, f) => {
        s.img(roadImg, { x: OX, y: OY, w: IW, h: IH, name: '!!bahn' });
        s.img(await svgImg((f > 0.01 ? arc(R1, f, '#4CC9F0') + arc(R2, f, '#FFB547') : '<rect width="1" height="1" fill="none"/>'), IW * px, IH * px, 1), { x: OX, y: OY, w: IW, h: IH, name: '!!spur' });
        const ca = Math.cos(f), sa = Math.sin(f), rot = Math.round(-f * 180 / Math.PI * 10) / 10;
        const P = r => [CX + r * ca, CY - r * sa];
        const [ax, ay] = P((R1 + R2) / 2), len = R2 - R1;
        s.rrect(ax - len / 2, ay - 0.05, len, 0.1, { fill: '9AA6B5', rr: 0.5, rotate: rot, name: '!!achse' });
        const [x1, y1] = P(R1), [x2, y2] = P(R2);
        s.rrect(x1 - 0.2, y1 - 0.37, 0.4, 0.74, { fill: '1B1F26', line: C.bl, lw: 2.5, rr: 0.3, rotate: rot, name: '!!rad1' });
        s.rrect(x2 - 0.2, y2 - 0.37, 0.4, 0.74, { fill: '1B1F26', line: C.or, lw: 2.5, rr: 0.3, rotate: rot, name: '!!rad2' });
        s.rrect(ax - 0.24, ay - 0.27, 0.48, 0.54, { fill: f > 0.5 ? 'C9A227' : '55606F', line: f > 0.5 ? C.white : '55606F', lw: 2, rr: 0.2, rotate: rot, name: '!!diffk', glow: f > 0.5 ? 10 : undefined, glowColor: 'C9A227' });
        // Wegbalken
        const sc = 1.3;
        s.text('Weg innen', { x: 10.6, y: 1.45, w: 2.5, h: 0.3, size: 13, bold: true, color: C.bl, name: '!!tw1' });
        s.rrect(10.6, 1.8, Math.max(0.05, R1 * f * 0.42), 0.24, { fill: C.bl, rr: 0.5, ft: f > 0.01 ? 0 : 100, name: '!!w1' });
        s.text('Weg außen', { x: 10.6, y: 2.2, w: 2.5, h: 0.3, size: 13, bold: true, color: C.or, name: '!!tw2' });
        s.rrect(10.6, 2.55, Math.max(0.05, R2 * f * 0.42), 0.24, { fill: C.or, rr: 0.5, ft: f > 0.01 ? 0 : 100, name: '!!w2' });
        s.text(f > 0.9 ? 'außen schneller!' : '', { x: 10.6, y: 2.95, w: 2.5, h: 0.4, size: 16, bold: true, color: C.or, name: '!!tsch' });
      },
    });
  }

  // ===== DIFFERENZIALSPERRE =====
  {
    const s = base(deck, 'c3d', { notes:
      '▶ Sagen: „Der Nachteil des Differenzials: Steht ein Rad auf Eis oder im Schlamm, dreht es durch – und das andere Rad mit Grip bekommt kaum Kraft. Ihr steckt fest.“\n' +
      '❓ „Was hilft?“\n' +
      '🖱 Klick 1: Problem · Klick 2: Lösung Sperre · Klick 3–5: die Regeln.\n' +
      '✅ Die Differenzialsperre verbindet beide Räder fest – sie drehen gleich schnell, die Kraft geht auch an das Rad mit Grip. Es gibt Quersperren (zwischen links und rechts) und Längssperren (zwischen Achsen bei mehreren Antriebsachsen).\n' +
      '✅ Regeln aus den Betriebsanleitungen: nur bei Bedarf (lockerer, rutschiger Untergrund), nur im Stand oder in Schrittgeschwindigkeit einlegen, nicht mit durchdrehendem Rad einlegen, nicht auf griffiger Straße und nicht in Kurven fahren (der Lkw lässt sich kaum lenken, Achse und Reifen werden überlastet), sofort wieder ausschalten.\n' +
      '✅ Prüfungsfrage 2.7.03-212 „Wann ist das Einschalten der Differenzialsperre hilfreich?“: richtig, wenn ich mich festgefahren habe und einzelne Antriebsräder durchdrehen, und wenn ich auf glatter Fahrbahn langsam geradeaus fahre – falsch: beim Rangieren auf trockener Fahrbahn. Also: Rad dreht durch → Sperre hilft, aber erst Gas weg und anhalten, dann einlegen.\n' +
      '💡 Kontrollleuchte im Cockpit zeigt: Sperre ist drin.\n' +
      '➜ „Damit zu den Bezeichnungen wie 6×4.“' });
    kick(s, 'Differenzialsperre'); title(s, 'Festgefahren – was tun?');
    await point(s, 0.7, 2.05, 5.85, 1.4, 'LuSnowflake', C.bl, 'Problem', 'Ein Rad auf Eis dreht durch – das andere bekommt kaum Kraft.', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 2.05, 5.85, 1.4, 'LuLock', 'C9A227', 'Sperre', 'verbindet beide Räder fest – die Kraft geht auch an das Rad mit Grip.', CLICK, { br: true, size: 17 });
    await point(s, 0.7, 3.65, 11.93, 0.85, 'LuGauge', C.gr, 'Rad dreht durch?', 'Gas weg, anhalten – dann im Stand oder in Schrittgeschwindigkeit sperren.', CLICK, { size: 17 });
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
      '✅ ASR-Taste (Offroad- oder Tiefschnee-Funktion): nur bei Tiefschnee, losem Untergrund, mit Schneeketten oder zum Freifahren – nur langsam, nach Betriebsanleitung. Bei höherem Tempo nicht: Die Antriebsachse kann ausbrechen. Danach wieder einschalten.\n💡 Praxistipp: am Berg erst unter etwa 25–30 km/h abschalten (eurotransport 2011, Lkw-Fahren im Winter) – Herstellerwerte können abweichen.\n' +
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
    await point(s, 4.55, 4.35, 8.08, 1.0, 'LuPower', C.or, 'ASR-Taste nur bei Tiefschnee, Ketten, losem Boden', '– nur langsam, nach Betriebsanleitung. Danach wieder an.', CLICK, { size: 16 });
    await point(s, 4.55, 5.5, 8.08, 0.95, 'LuLock', C.mut, 'Nicht verwechseln:', 'ASR regelt von selbst – die Sperre verriegelt fest.', CLICK, { size: 16 });
  }
};
