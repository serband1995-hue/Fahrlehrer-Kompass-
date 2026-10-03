// Abend 6 · CE1: Kapitel 1 Zugarten und Kupplungen (Gliederzug, ZAA, Sattelzug; Bolzenkupplung; Sattelkupplung)
const { C, sec, chapter, motion, steps, photoAsk, quiz, lkw, auflieger, anhaenger, seg, arrow, svgImg } = require('../gs');
const { icon } = require('../lib');

sec('ce1z', 'CE1  ·  ZUGARTEN UND KUPPLUNGEN', C.bl, 'bg_blue.jpg');

// Zug in Seitenansicht zeichnen (Front links bei X, Boden GY, Maßstab K)
async function zug(s, art, { X, GY, K }) {
  if (art === 'sattel') {
    await lkw(s, { L: 3.6, box: 'none', axles: [0.78, 2.75], sattel: 2.45 }, { x: X, gy: GY, k: K, name: '!!zm' });
    const a = await auflieger(s, { L: 8.0, floor: 0.97, legs: 0 }, { x: X + (2.45 - 0.55) * K, gy: GY, k: K, name: 'af' });
    return { kp: [X + 2.45 * K, GY - 0.97 * K], len: (2.45 - 0.55 + 8.0) * K };
  }
  const L = 5.0, gap = art === 'zaa' ? 1.1 : 1.0;
  await lkw(s, { L, box: 'koffer', boxH: 1.45, axles: [0.78, 3.9], hitch: true }, { x: X, gy: GY, k: K, name: '!!lk' });
  const a = await anhaenger(s, art === 'zaa' ? { L: 4.4, axles: [1.75, 2.45], zaa: true } : { L: 4.6 }, { x: X + (L + gap) * K, gy: GY, k: K, name: art === 'zaa' ? 'zaa' : 'ah' });
  const ex = X + (L + 0.02) * K, ey = GY - 0.6 * K;
  seg(s, a.pivot[0], a.pivot[1], ex, ey, { col: '3A4250', th: 0.06, name: '!!dei' });
  return { eye: [ex, ey], pivot: a.pivot, drehkranz: art === 'zaa' ? null : [X + (L + gap + 0.85) * K, GY - 0.8 * K], len: (L + gap + (art === 'zaa' ? 4.4 : 4.6)) * K };
}
const main = async (deck) => {
  await chapter(deck, 'ce1z', { num: 1, ttl: 'Zugarten und Kupplungen', sub: 'Gliederzug, Zentralachsanhänger, Sattelzug – und was sie zusammenhält.', ico: 'LuLink', notes:
    '▶ Sagen: „Kapitel 1: Welche Züge gibt es – und wie hängen sie zusammen?“\n🖱 Keine Klicks.\n➜ „Drei Zugarten.“' });

  // ===== DREI ZUGARTEN (Morph) =====
  {
    const K = 0.62, X = 5.95, GY = 4.45;
    const ART = [
      ['glieder', 'Gliederzug', 'Lkw + Anhänger mit Drehschemel', 'Zwei Drehpunkte: Kupplungsbolzen und Drehkranz. Kaum Stützlast auf dem Lkw.'],
      ['zaa', 'Zentralachsanhänger', 'Achsen nah am Schwerpunkt, starre Deichsel', 'Ein Teil des Gewichts liegt auf der Kupplung des Lkw: die Stützlast.'],
      ['sattel', 'Sattelzug', 'Zugmaschine + Auflieger', 'Ein großer Teil des Aufliegers liegt auf der Zugmaschine: die Sattellast.'],
    ];
    await steps(deck, 'ce1z', {
      kicker: 'Zugarten', ttl: 'Drei Arten von Zügen',
      list: ['Gliederzug', 'Zentralachsanhänger', 'Sattelzug'],
      ask: { q: 'Wie viele Anhänger dürft ihr hinter einem Lkw mitnehmen?', a: 'Nur einen. Hinter einem Sattelzug gar keinen.', at: 2 },
      caps: [
        'Gliederzug: Lkw mit Anhänger. Der Anhänger hat vorn einen Drehschemel – er lenkt mit der Zuggabel.',
        'Zentralachsanhänger: Die Achsen sitzen nah am Schwerpunkt (etwa in der Mitte), die Deichsel ist starr. Er drückt mit der Stützlast auf den Lkw.',
        'Sattelzug: Der Auflieger hat vorn keine Achse. Er liegt mit dem Königszapfen auf der Sattelkupplung der Zugmaschine.',
      ],
      notes: [
        '▶ Sagen: „Erste Zugart: der Gliederzug – ein Lkw mit Anhänger. Der Anhänger hat vorn einen Drehschemel. Er hat zwei Drehpunkte: den Kupplungsbolzen am Lkw und den Drehkranz am Anhänger. Darum kann er doppelt einknicken.“\n✅ DGUV Information 214-080 „Kuppeln – aber sicher!“, Kap. 6: Gliederzug = Lkw + Gelenkdeichsel- oder Starrdeichselanhänger; Gelenkdeichselanhänger gibt keine nennenswerte Stützlast ab.\n➜ „Zweite Zugart.“',
        '▶ „Zweite Art: der Zentralachsanhänger. Die Achsen sitzen nah am Schwerpunkt, die Deichsel ist starr. Ein Teil seines Gewichts drückt auf die Kupplung des Lkw – die Stützlast.“\n✅ DGUV I 214-080, Kap. 6: Zentralachsanhänger, Stützlast höchstens 10 % der Anhängermasse oder 1.000 kg (der kleinere Wert). § 44 Abs. 3 StVZO: Mindeststützlast 4 %.\n➜ „Und die dritte Art?“',
        '▶ „Dritte Art: der Sattelzug. Der Auflieger hat vorn keine Achse. Er liegt mit dem Königszapfen auf der Sattelkupplung – ein großer Teil seines Gewichts liegt auf der Zugmaschine: die Sattellast.“\n❓ Frage auf der Folie auflösen.\n✅ § 32a StVZO: Hinter Kfz nur ein Anhänger, hinter Sattelkraftfahrzeugen keiner. (Zwei Anhänger nur hinter Zugmaschinen.)\n➜ „Wie ist der Anhänger am Lkw befestigt?“',
      ],
      legend: 'Seitenansicht · schematisch',
      scene: async (s, i) => {
        const [art, name, sub, info] = ART[i];
        s.text(name, { x: 5.75, y: 1.45, w: 7.3, h: 0.45, size: 24, bold: true, color: C.bl, name: '!!h' });
        s.text(sub, { x: 5.75, y: 1.9, w: 7.3, h: 0.32, size: 14, color: C.mut, name: '!!sub' });
        s.rect(5.75, GY, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
        const z = await zug(s, art, { X, GY, K });
        // Markierungen
        const P = art === 'glieder' ? [z.eye, z.drehkranz] : art === 'zaa' ? [z.eye] : [z.kp];
        for (let q = 0; q < 2; q++) {
          const p = P[q] || P[0];
          s.oval(p[0] - 0.17, p[1] - 0.17, 0.34, 0.34, { line: C.am, lw: 2.5, ft: 100, fill: C.am, lt: P[q] ? 0 : 100, name: '!!mk' + q });
        }
        const down = art === 'zaa' ? z.eye : art === 'sattel' ? z.kp : null;
        arrow(s, down ? down[0] : 9, (down ? down[1] : 3) - 0.95, down ? down[0] : 9, (down ? down[1] : 3) - 0.22, { col: C.am, th: 0.09, head: 0.24, name: 'last', hide: !down });
        s.text(art === 'zaa' ? 'Stützlast' : art === 'sattel' ? 'Sattellast' : 'Drehpunkte', { x: (down || z.eye)[0] - 0.9, y: down ? down[1] - 1.32 : GY + 0.08, w: 1.8, h: 0.3, size: 13, bold: true, color: C.am, align: 'center', name: '!!lt' });
        s.text(info, { x: 5.75, y: 5.0, w: 7.3, h: 0.7, size: 16, color: C.txt, name: '!!info' });
      },
    });
  }

  // ===== FOTO: BOLZENKUPPLUNG =====
  await photoAsk(deck, 'ce1z', {
    bg: 'k_kupplung_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Anhängekupplung', q: 'Bolzenkupplung: Was seht ihr hier?', qsize: 30, w: 5.05, asize: 15,
    answers: [
      ['LuMagnet', 'Fangmaul', 'führt die Zugöse in die Kupplung.', C.bl],
      ['LuArrowDownToLine', 'Kupplungsbolzen', 'fällt durch die Zugöse und hält sie fest.', C.bl],
      ['LuCircle', 'Zugöse', 'am Ende der Zuggabel, 40 oder 50 mm.', C.bl],
      ['LuCable', 'Leitungen', 'rot und gelb für Luft, schwarz für Strom.', C.bl],
    ],
    notes:
      '▶ Sagen: „So sieht die Kupplung am Lkw aus. Was erkennt ihr?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Teil.\n' +
      '✅ DGUV I 214-080, Kap. 1.3.1: selbsttätige Bolzenkupplung Größe 40 oder 50 (Innendurchmesser der Zugöse in mm). § 43 Abs. 4 StVZO: Anhängekupplungen müssen selbsttätig wirken. Nur genehmigte Bauart – Schweißen oder Bohren an der Kupplung ist verboten.\n' +
      '➜ „Wie schließt so eine Kupplung?“',
  });

  // ===== SO SCHLIESST DIE BOLZENKUPPLUNG (fließend) =====
  {
    const BX = 8.5, EY = 4.05;
    const jaw = await svgImg(
      `<path d="M0 60 L170 60 L170 115 L340 70 L340 100 L170 150 L170 210 L340 260 L340 290 L170 245 L170 300 L0 300 Z" fill="#2E343D" stroke="#4A5361" stroke-width="3"/>` +
      `<rect x="10" y="70" width="40" height="220" fill="#262B33"/>`, 340, 360, 2);
    const fr = (ex, closed, o = {}) => ({ ...o, t: { ex, closed, ...(o.t || {}) } });
    await motion(deck, 'ce1z', {
      kicker: 'Bolzenkupplung', ttl: 'So schließt die Kupplung', dur: 480, holdDur: 650,
      question: 'Woran erkennt ihr sicher, dass die Kupplung wirklich zu ist?',
      answer: 'Am Kontrollstift (oder an der Kontrollleuchte im Führerhaus): Er darf nicht mehr herausstehen. Anrucken allein reicht nicht!',
      legend: 'Seitenansicht · schematisch',
      frames: [
        fr(12.0, 0, { hold: true, cap: 'Die Kupplung ist offen: Bolzen oben, Handhebel oben, der Kontrollstift steht heraus.', note: '▶ Sagen: „Die Kupplung ist geöffnet: Der Handhebel ist oben eingerastet, der Bolzen steht oben, das Fangmaul ist arretiert. Und der Kontrollstift steht heraus – das heißt: offen.“\n❓ Frage auf der Folie stellen.\n🖱 Klick: Die Zugöse fährt ein (läuft von selbst).\n➜ „Der Lkw setzt zurück.“' }),
        fr(10.6, 0, { cap: 'Der Lkw setzt zurück – die Zugöse gleitet ins Fangmaul …' }),
        fr(9.3, 0),
        fr(BX, 0, { cap: 'Die Zugöse stößt hinten an und löst die Sperre …' }),
        fr(BX, 1, { hold: true, answer: true, cap: 'Federkraft drückt den Bolzen durch die Zugöse. Der Kontrollstift ist verschwunden: geschlossen!', note: '▶ „Die Zugöse löst die Sperre, eine Feder drückt den Bolzen nach unten durch die Öse. Jetzt ist die Kupplung zu – und der Kontrollstift ist verschwunden. Das kontrolliert ihr immer: hinsehen, im Dunkeln mit der Hand tasten. Anrucken allein reicht nicht!“\n✅ DGUV I 214-080, Kap. 1.3.1: Kontrollstift steht hervor, solange die Kupplung offen ist; Kontrolle durch Sehen und Tasten oder Fernanzeige im Führerhaus. Prüfungsfrage 2.7.07-312: am Kontrollstift oder an der Kontrollleuchte – „durch kurzes Anrucken“ ist falsch.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und beim Sattelzug?“' }),
      ],
      scene: async (s, { ex, closed }) => {
        s.rect(5.75, 2.0, 0.55, 4.3, { fill: '1F242B', name: '!!traeger' });
        s.text('Lkw', { x: 5.75, y: 6.35, w: 1.0, h: 0.3, size: 12, color: C.dim, name: '!!lkwt' });
        s.img(jaw, { x: 6.3, y: EY - 1.8, w: 3.4, h: 3.6, name: '!!jaw' });
        // Bolzen
        const by0 = closed ? EY - 1.35 : EY - 2.05, bh = closed ? 2.3 : 1.62;
        s.rrect(BX - 0.13, by0, 0.26, bh, { fill: '9AA6B5', line: '6E7886', lw: 1, rr: 0.15, name: '!!bolzen' });
        // Kontrollstift
        s.rect(7.05, closed ? EY - 1.32 : EY - 2.05, 0.1, closed ? 0.12 : 0.85, { fill: closed ? '6E7886' : C.red, name: '!!kstift' });
        // Handhebel
        const ha = (closed ? 130 : 220) * Math.PI / 180;
        seg(s, 6.3, EY - 0.7, 6.3 + Math.cos(ha) * 0.7, EY - 0.7 + Math.sin(ha) * 0.7, { col: C.am, th: 0.09, name: '!!hebel' });
        // Zugöse + Zuggabel
        s.rrect(ex - 0.45, EY - 0.18, 0.9, 0.36, { fill: '596273', line: '9AA6B5', lw: 1.5, rr: 0.4, name: '!!oese' });
        s.lineS(ex - 0.2, EY - 0.18, ex - 0.2, EY + 0.18, { color: C.dark, lw: 1.5, dash: 'dash', name: '!!loch1' });
        s.lineS(ex + 0.2, EY - 0.18, ex + 0.2, EY + 0.18, { color: C.dark, lw: 1.5, dash: 'dash', name: '!!loch2' });
        s.rect(ex + 0.45, EY - 0.1, 13.05 - ex - 0.45, 0.2, { fill: '3A4250', name: '!!gabel' });
        s.text('Zuggabel des Anhängers', { x: 11.0, y: EY + 0.25, w: 2.05, h: 0.3, size: 12, color: C.mut, align: 'right', name: '!!gt' });
        // Beschriftung
        s.text('Kontrollstift', { x: 6.35, y: EY - 2.45, w: 1.6, h: 0.3, size: 12, bold: true, color: closed ? C.mut : C.red, name: '!!kst' });
        s.text('Bolzen', { x: BX + 0.2, y: EY - 2.25, w: 1.2, h: 0.3, size: 12, bold: true, color: C.mut, name: '!!bt' });
        s.text('Fangmaul', { x: 9.75, y: EY - 1.25, w: 1.5, h: 0.3, size: 12, bold: true, color: C.mut, name: '!!ft' });
        s.text('Handhebel', { x: 5.75, y: EY - 1.7, w: 1.3, h: 0.3, size: 12, bold: true, color: C.am, name: '!!ht' });
        s.text(closed ? '✓  geschlossen' : 'offen', { x: 10.5, y: 1.55, w: 2.55, h: 0.45, size: 16, bold: true, color: C.dark, fill: closed ? C.gr : C.am, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!stat' });
      },
    });
  }

  // ===== FOTO: SATTELKUPPLUNG =====
  await photoAsk(deck, 'ce1z', {
    bg: 'k_sattel_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Sattelkupplung', q: 'Woran erkennt ihr, dass die Sattelkupplung zu ist?', qsize: 28, w: 5.05, asize: 15,
    answers: [
      ['LuShieldCheck', 'Sicherung eingefallen', 'Bügel oder Klappe – je nach Hersteller.', C.bl],
      ['LuEyeOff', 'Kontrollstift weg', 'nicht mehr zu sehen und zu tasten.', C.bl],
      ['LuAlignVerticalJustifyEnd', 'Kein Luftspalt', 'Der Auflieger liegt flach auf der Platte.', C.bl],
      ['LuCircleDot', 'Königszapfen passt', '50 oder 90 mm (2 oder 3,5 Zoll).', C.bl],
    ],
    notes:
      '▶ Sagen: „Die Sattelkupplung – die Platte auf der Zugmaschine. Der Königszapfen des Aufliegers fährt hinten in den Schlitz und wird vom Verschlusshaken umfasst. Woran erkennt ihr, dass sie zu ist?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ DGUV I 214-080, Kap. 1.4.1 und S. 15: Verschlusshaken umfasst den Königszapfen, Verschlussriegel sichert; „ordnungsgemäß geschlossen“ je nach Bauart: Sicherungsklappe/-bügel eingefallen, Kontrollstift nicht mehr sichtbar und tastbar oder Karabiner eingehängt – Herstellerangabe beachten. Königszapfen genormt: Größe 50 (DIN 74080) und 90 (DIN 74083). Prüfungsfrage 2.7.07-201: Sattelkupplung regelmäßig abschmieren und Befestigung am Rahmen kontrollieren.\n' +
      '➜ „Eine Prüfungsfrage dazu.“',
  });
  await quiz(deck, 'ce1z', {
    kicker: 'Prüfungsfrage 2.7.07-201', q: 'Welche Kontroll- und Wartungsarbeiten müssen an einer Sattelkupplung regelmäßig vorgenommen werden?', size: 28,
    opts: ['Sattelkupplung abschmieren', 'Befestigung am Rahmen kontrollieren', 'Sattelkupplungen sind immer wartungsfrei'], ok: [0, 1],
    why: 'Die Platte muss geschmiert sein – und die Kupplung muss fest auf dem Rahmen sitzen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.07-201: A und B.\n➜ „Kapitel 2: Wie kuppelt man sicher an?“',
  });
};
module.exports = main; module.exports.zug = zug;
