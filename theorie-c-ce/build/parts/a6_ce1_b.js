// Abend 6 · CE1: Kapitel 2 An- und Abkuppeln (Ankuppeln-Ablauf, Kupplungsköpfe, gelb vor rot, Reihenfolge, Abkuppeln)
const { C, sec, base, kick, title, card, CLICK, chapter, motion, steps, photoAsk, quiz, lkw, anhaenger, seg, point, badge, foot } = require('../gs');
const { icon } = require('../lib');

sec('ce1k', 'CE1  ·  AN- UND ABKUPPELN', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce1k', { num: 2, ttl: 'An- und Abkuppeln', sub: 'Kuppelunfälle gehören zu den häufigsten tödlichen Unfällen mit Lkw. Fast immer war es ein Fehler im Ablauf.', ico: 'LuLink2', notes:
    '▶ Sagen: „Kapitel 2: An- und Abkuppeln. Das klingt einfach – aber Kuppelunfälle gehören zu den häufigsten tödlichen Unfällen mit Nutzfahrzeugen. Die Ursache ist fast immer ein Fehler im Ablauf, nicht die Technik.“\n✅ DGUV Information 214-080 „Kuppeln – aber sicher!“ (2020), S. 5.\n🖱 Keine Klicks.\n➜ „Schauen wir uns das Ankuppeln an.“' });

  // ===== ANKUPPELN (fließend) =====
  {
    const K = 0.55, GY = 4.75, L = 5.0, TX = 10.4, EYE_C = GY - 0.6 * K, EYE_LOW = GY - 0.36 * K;
    const XC = TX - (1.0 + 0.02) * K - (L + 0.02) * K + 0.02 * K; // Lkw-X, wenn gekuppelt (Kupplung = Zugöse)
    const fr = (dx, o = {}) => ({ ...o, t: { dx, ...(o.t || {}) } });
    await motion(deck, 'ce1k', {
      kicker: 'Ankuppeln', ttl: 'So wird angekuppelt', dur: 520, holdDur: 650,
      question: 'Wer bewegt sich beim Ankuppeln – und wo darf niemand stehen?',
      answer: 'Der Lkw setzt zum gesicherten Anhänger zurück. Zwischen den Fahrzeugen darf niemand stehen – auch nicht, um die Zuggabel zu halten.',
      legend: 'Seitenansicht · schematisch',
      frames: [
        fr(-1.6, { hold: true, t: { secured: 1 }, cap: 'Zuerst den Anhänger sichern: Feststellbremse (roter Knopf ziehen) und Unterlegkeile.', note: '▶ Sagen: „Bevor irgendetwas passiert: Der Anhänger wird gesichert. Feststellbremse – der rote Knopf am Anhänger wird gezogen – und Unterlegkeile an die starre Achse.“\n❓ Frage auf der Folie stellen.\n✅ DGUV I 214-080, Kap. 2.2: Anhänger sichern (Feststellbremse, Unterlegkeile – nie an Drehschemel-, Lenk- oder Liftachse). Prüfungsfrage 2.7.07-309: vor dem Ankuppeln prüfen, ob der Anhänger gegen Wegrollen gesichert ist und ob die Zuggabel richtig eingestellt ist.\n🖱 Klick: Der Lkw fährt heran.\n➜ „Jetzt kommt der Lkw.“' }),
        fr(-0.45, { hold: true, t: { secured: 1, hee: 1, zone: 1 }, cap: 'Bis etwa 1 m heranfahren. Zuggabel mit der Höheneinstellung auf Kupplungshöhe bringen, Kupplung öffnen.', note: '▶ „Der Lkw fährt bis etwa einen Meter vor die Zugöse. Dann wird die Zuggabel mit der Höheneinstellung auf die Höhe des Fangmauls gebracht, und die Kupplung wird geöffnet. Bei einem Drehschemelanhänger wird jetzt die Vorderachsbremse gelöst – mit dem Vorderachslöseventil oder dem schwarzen Knopf, und nie vor dem roten Knopf.“\n✅ DGUV I 214-080, Kap. 2.2; S. 21: bei Anhängern ohne Vorderachslöseventil erst Feststellbremse betätigen, dann Betriebsbremse lösen (schwarzer Knopf), nie umgekehrt. Prüfungsfrage 2.7.07-327: Die Zuggabel wird von der Höheneinstellvorrichtung des Anhängers auf Höhe gehalten – nicht von einer Person.\n🖱 Klick: Der Lkw setzt zurück (läuft von selbst).\n➜ „Und jetzt zurücksetzen.“' }),
        fr(-0.2, { t: { secured: 1, hee: 1, zone: 1 }, cap: 'Langsam zurücksetzen. Zwischen den Fahrzeugen ist Gefahrbereich – niemand dazwischen!' }),
        fr(0, { hold: true, answer: true, t: { secured: 1, hee: 1, coupled: 1 }, cap: 'Eingerastet. Feststellbremse im Lkw ziehen, aussteigen – dann den Kontrollstift prüfen.', note: '▶ „Klack – eingerastet. Jetzt Feststellbremse im Lkw ziehen, erst dann aussteigen. Und dann: Kontrollstift ansehen, im Dunkeln tasten.“\n✅ Prüfungsfrage 2.7.07-306: Das Zugfahrzeug wird zum Anhänger rangiert. 2.6.03-307: gegen Wegrollen sichern; keine Personen zwischen den Fahrzeugen. 2.7.01-128: Einweiser steht im Sichtbereich des Fahrers – er hält nicht die Zuggabel. DGUV I 214-080, S. 27: Anhänger zum Kuppeln auflaufen lassen ist ohne Ausnahme verboten.\n🖱 Klick: Leitungen anschließen.\n➜ „Und dann die Leitungen.“' }),
        fr(0, { hold: true, t: { hee: 0, coupled: 1, lines: 1 }, cap: 'Leitungen: gelb, dann rot, dazu Licht- und ABS/EBS-Stecker. Höheneinstellung lösen, Anhänger-Feststellbremse lösen, Keile weg.', note: '▶ „Jetzt die Leitungen: erst gelb, dann rot – gleich schauen wir, warum. Dazu der Stecker für Licht und der ABS/EBS-Stecker. Dann Höheneinstellung lösen, Feststellbremse am Anhänger lösen, Keile wegnehmen und verstauen. Zum Schluss: Abfahrtkontrolle.“\n✅ DGUV I 214-080, Kap. 2.2, Schritte 11–14.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Welche Leitung ist welche?“' }),
      ],
      scene: async (s, { dx, secured = 0, hee = 0, zone = 0, coupled = 0, lines = 0 }) => {
        const X = XC + dx;
        s.rect(5.75, GY, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
        // Gefahrbereich
        const z0 = X + (L + 0.05) * K, z1 = TX;
        s.rect(Math.min(z0, z1 - 0.05), GY - 1.6, Math.max(0.05, z1 - z0), 1.6, { fill: C.red, ft: zone ? 55 : 100, line: zone ? C.red : undefined, lw: 1.5, name: '!!zone' });
        const zc = (z0 + z1) / 2;
        s.text(zone ? 'Gefahrbereich – niemand dazwischen!' : '', { x: zc - 2.0, y: GY - 2.12, w: 4.0, h: 0.4, size: 15, bold: true, color: 'FF6B6B', align: 'center', name: '!!zt' });
        await lkw(s, { L, box: 'koffer', boxH: 1.45, axles: [0.78, 3.9], hitch: true }, { x: X, gy: GY, k: K, name: '!!lk' });
        const a = await anhaenger(s, { L: 4.6 }, { x: TX, gy: GY, k: K, name: 'ah' });
        const ex = TX - 1.0 * K, ey = hee || coupled ? EYE_C : EYE_LOW;   // eingekuppelt: Zugöse bleibt im Kupplungsmaul
        seg(s, a.pivot[0], a.pivot[1], ex, ey, { col: '3A4250', th: 0.06, name: '!!dei' });
        s.oval(ex - 0.06, ey - 0.06, 0.12, 0.12, { fill: '9AA6B5', name: '!!oese' });
        // Keile + Feststellbremse
        const rw = TX + (4.6 - 0.85) * K;
        s.shape(s.pres.shapes.RIGHT_TRIANGLE, { x: rw + 0.2, y: GY - 0.17, w: 0.2, h: 0.17, fill: C.am, ft: secured ? 0 : 100, name: '!!keil' });
        s.text(secured ? 'P' : '', { x: 9.4, y: 5.62, w: 0.34, h: 0.34, size: 13, bold: true, color: C.white, fill: C.red, ft: secured ? 0 : 100, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!P' });
        s.text(secured ? 'Anhänger gesichert: Feststellbremse + Keil' : '', { x: 9.82, y: 5.6, w: 3.3, h: 0.38, size: 12, bold: true, color: C.am, valign: 'middle', name: '!!pt' });
        // Leitungen
        const lx0 = X + (L - 0.05) * K, lx1 = TX + 0.02;
        seg(s, lx0, GY - 1.0 * K, lx1, GY - 0.95 * K, { col: C.am, th: 0.05, hide: !lines, name: '!!lgelb' });
        seg(s, lx0, GY - 1.08 * K, lx1, GY - 1.03 * K, { col: C.red, th: 0.05, hide: !lines, name: '!!lrot' });
        s.text(coupled ? '✓  eingerastet' : '', { x: 10.5, y: 5.05, w: 2.55, h: 0.42, size: 15, bold: true, color: C.dark, fill: coupled ? C.gr : undefined, ft: coupled ? 0 : 100, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!stat' });
        s.text(hee && !coupled ? 'Zuggabel auf Kupplungshöhe' : '', { x: TX - 3.2, y: 5.05, w: 3.0, h: 0.35, size: 13, bold: true, color: C.mut, align: 'right', name: '!!heet' });
      },
    });
  }

  // ===== FOTO: KUPPLUNGSKÖPFE =====
  await photoAsk(deck, 'ce1k', {
    bg: 'k_koepfe_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Leitungen', q: 'Rot, gelb und zwei Stecker – was ist was?', qsize: 30, w: 5.05, asize: 15, top: 2.75,
    answers: [
      ['LuCircle', 'Rot: Vorratsleitung', 'immer Druck – füllt den Behälter im Anhänger.', C.red],
      ['LuCircle', 'Gelb: Bremsleitung', 'Druck nur beim Bremsen – auch bei gezogener Feststellbremse im Lkw.', C.am],
      ['LuPlug', 'Stecker: Licht und ABS/EBS', 'Strom für die Lampen – Strom und Daten für die Anhängerbremse.', '8A95A6'],
      ['LuBan', 'Farben nie vertauschen', 'Verschiedenfarbige Teile nicht verbinden.', C.or],
    ],
    notes:
      '▶ Sagen: „Vier Anschlüsse vorn am Anhänger: zwei Luftkupplungen, der Lichtstecker und der ABS/EBS-Stecker. Was ist was?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '💡 Im Foto ist nur ein Stecker zu sehen. Der Lichtstecker (24 V) ist ein eigener Stecker – das Licht kommt nicht über den ABS/EBS-Stecker.\n' +
      '✅ Rot = Vorratsleitung, gelb = Bremsleitung (DGUV I 214-080; Prüfungsfragen 2.7.07-319/-320). Gelb führt auch Druck, wenn im Lkw die Feststellbremse gezogen ist (Prüfungsfrage 2.7.06-321; siehe „Gelb vor Rot“). DGUV I 214-080, S. 28: Anschlüsse für Druckluft, Elektrik und ABS herstellen. Prüfungsfrage 2.7.02-306: ohne elektrische Verbindung sind das EBS und die Beleuchtung ohne Funktion. Prüfungsfrage 2.7.07-321: verschiedenfarbige Kupplungsteile nicht miteinander verbinden. ABS/EBS-Verbindung nach ISO 7638 (RL 71/320/EWG Anhang X). Mehr dazu nach der Pause in CE2.\n' +
      '➜ „Und welche schließt ihr zuerst an?“',
  });

  // ===== GELB VOR ROT (Morph) =====
  {
    const ST = [
      { y: 0, r: 0, bb: 'Notbremsung', bbc: C.gr, fs: 'fest', ok: 'Anhänger steht sicher: roter Knopf gezogen, Keile liegen.', col: C.gr, tank: 0.5 },
      { y: 1, r: 0, bb: 'Notbremsung', bbc: C.gr, fs: 'fest', sig: 1, ok: 'Gelb angeschlossen: Es zischt kurz – das Bremssignal aus dem Lkw liegt an.', col: C.gr, tank: 0.5 },
      { y: 1, r: 1, bb: 'bremst (Signal über gelb)', bbc: C.gr, fs: 'fest', sig: 1, ok: 'Dann rot: Der Behälter füllt sich. Der Anhänger bleibt gebremst – und hängt jetzt am Bremswunsch des Fahrers.', col: C.gr, tank: 1 },
      { y: 0, r: 1, bb: 'GELÖST!', bbc: C.red, fs: 'hält nur, wenn der\nrote Knopf gezogen ist', fsc: C.am, ok: 'Falsch: nur rot. Rot löst die Betriebsbremse – gelb sagt nichts. Ist der rote Knopf nicht gezogen, rollt der Anhänger weg!', col: C.red, tank: 1 },
    ];
    await steps(deck, 'ce1k', {
      kicker: 'Leitungen', ttl: 'Gelb vor Rot',
      list: ['Vorher: nichts verbunden', 'Zuerst gelb', 'Dann rot', 'Falsch: nur rot'],
      ask: { q: 'Welche Leitung schließt ihr zuerst an – und warum?', a: 'Gelb, dann rot. Rot allein löst die Betriebsbremse des Anhängers. Abkuppeln: zuerst rot, dann gelb. Rot nie allein!', at: 2 },
      caps: [
        'Vorher: Der Anhänger ist abgekuppelt und mit Feststellbremse und Keilen gesichert.',
        'Zuerst gelb, die Bremsleitung. Die Feststellbremse im Lkw gibt Druck auf gelb – das Bremssignal liegt an. Kommt gleich rot dazu, bleibt der Anhänger gebremst. Kein Zischen? Feststellbremse im Lkw prüfen!',
        'Dann rot, die Vorratsleitung. Der Luftbehälter im Anhänger füllt sich. Jetzt bremst der Anhänger, wenn der Fahrer bremst.',
        'Wer nur rot anschließt, löst die Betriebsbremse – ohne gelb kein Bremssignal. Ist der rote Knopf am Anhänger nicht gezogen, rollt er weg! Merksatz: „Rot nie allein!“',
      ],
      notes: [
        '▶ Sagen: „Links der Lkw mit seinen Kupplungsköpfen, rechts der Anhänger mit Luftbehälter und Bremszylinder. Noch ist nichts verbunden. Der Anhänger steht mit Feststellbremse und Keilen.“\n❓ Frage auf der Folie stellen.\n➜ „Was kommt zuerst?“',
        '▶ „Zuerst gelb, die Bremsleitung. Weil im Lkw die Feststellbremse gezogen ist, schickt der Lkw Luft in die gelbe Leitung – es zischt kurz, das Bremssignal liegt an. Gebremst wird damit noch nichts Neues: Der Anhänger steht ja noch mit Notbremsung und rotem Knopf. Aber wenn gleich rot dazukommt, bleibt er gebremst. Zischt es nicht, prüft ihr die Feststellbremse im Lkw.“\n✅ DGUV I 214-080, S. 28/29: Ankuppeln – zuerst Bremsleitung (gelb), dann Vorratsleitung (rot); ist beim Anschließen von gelb kein Zischen zu hören, prüfen, ob die Feststellbremse im Zugfahrzeug betätigt ist. Prüfungsfrage 2.7.07-320.\n➜ „Dann rot.“',
        '▶ „Jetzt rot, die Vorratsleitung. Der Behälter im Anhänger füllt sich, die Notbremsung ist aufgehoben – aber weil das Signal aus gelb anliegt, bleibt der Anhänger gebremst. Ab jetzt bremst er, wenn der Fahrer bremst – oder die Feststellbremse im Lkw zieht.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfragen 2.7.07-320 (zuerst gelb; kombinierte Köpfe gleichzeitig) und 2.7.07-319 (abkuppeln: zuerst rot).\n➜ „Und was passiert, wenn man es falsch macht?“',
        '▶ „Der Fehler: nur rot. Das Anschließen von rot löst die Betriebsbremse des Anhängers – die Notbremsung ist weg. Ohne gelb bekommt er aber kein Bremssignal. Der Federspeicher hält nur, wenn der rote Knopf gezogen ist. Ist er nicht gezogen – rollt der Anhänger weg. Darum: Rot nie allein!“\n✅ DGUV I 214-080, S. 20 und 28: Das Anschließen der roten Leitung löst die Betriebsbremse des Anhängers; den Federspeicher (Feststellbremse) betätigt die rote Leitung nicht. Notfall-Tipp (S. 29): Rollt der Zug los, rote Leitung trennen – nie versuchen, ins Führerhaus zu kommen.\n💡 Kombinierte Kupplungsköpfe (beide Leitungen in einer Einheit) vermeiden Verwechslungen.\n➜ „Die ganze Reihenfolge beim Ankuppeln.“',
      ],
      legend: 'Schema · vereinfacht',
      scene: async (s, i) => {
        const t = ST[i];
        // Lkw-Seite
        s.rrect(5.8, 2.1, 1.7, 3.0, { fill: '1A2230', line: C.line, rr: 0.08, name: '!!lkwb' });
        s.text('Lkw', { x: 5.8, y: 2.15, w: 1.7, h: 0.35, size: 15, bold: true, color: C.mut, align: 'center', name: '!!lkwt' });
        s.text('P', { x: 6.45, y: 4.1, w: 0.4, h: 0.4, size: 15, bold: true, color: C.white, fill: C.red, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!lp' });
        s.text('Feststellbremse\ngezogen', { x: 5.8, y: 4.54, w: 1.7, h: 0.44, size: 12, color: C.mut, align: 'center', lsm: 0.9, name: '!!lpt' });
        // Anhänger-Seite
        s.rrect(10.8, 2.1, 2.25, 3.0, { fill: '1A2230', line: C.line, rr: 0.08, name: '!!ahb' });
        s.text('Anhänger', { x: 10.8, y: 2.15, w: 2.25, h: 0.35, size: 15, bold: true, color: C.mut, align: 'center', name: '!!aht' });
        s.rrect(11.05, 2.65, 1.75, 0.6, { fill: '0B1119', line: '4A5668', rr: 0.3, name: '!!tank' });
        s.rrect(11.05, 2.65, Math.max(0.05, 1.75 * t.tank), 0.6, { fill: '4C8DF0', rr: 0.3, name: '!!tankf' });
        s.text('Luftbehälter', { x: 11.05, y: 3.27, w: 1.75, h: 0.28, size: 12, color: C.mut, align: 'center', name: '!!tankt' });
        s.text([{ text: 'Betriebsbremse: ', options: { color: C.mut, breakLine: true } }, { text: t.bb, options: { bold: true, color: t.bbc, breakLine: true } }, { text: 'Federspeicher: ', options: { color: C.mut, breakLine: true } }, { text: t.fs, options: { bold: true, color: t.fsc || C.gr } }], { x: 10.85, y: 3.55, w: 2.15, h: 1.45, size: 12, align: 'center', valign: 'middle', lsm: 0.95, name: '!!cyl' });
        // Leitungen
        const ln = (yy, col, on, nm) => {
          s.oval(7.45, yy - 0.13, 0.26, 0.26, { fill: col, name: '!!kk' + nm });
          seg(s, 7.6, yy, on ? 10.8 : 8.6, on ? yy : yy + 0.45, { col, th: 0.08, name: '!!lt' + nm });
          s.oval(on ? 10.68 : 8.48, (on ? yy : yy + 0.45) - 0.12, 0.24, 0.24, { fill: col, line: C.dark, lw: 1, name: '!!kh' + nm });
        };
        ln(2.95, C.am, t.y, 'g');
        ln(3.85, C.red, t.r, 'r');
        s.text('gelb = Bremse', { x: 8.3, y: 2.55, w: 2.2, h: 0.3, size: 12, bold: true, color: C.am, align: 'center', name: '!!gtx' });
        s.text('rot = Vorrat', { x: 8.3, y: t.r ? 4.0 : 4.25, w: 2.2, h: 0.3, size: 12, bold: true, color: C.red, align: 'center', name: '!!rtx' });
        s.text(t.ok, { x: 5.8, y: 5.4, w: 7.25, h: 0.75, size: 16, bold: true, color: t.col, align: 'center', valign: 'middle', name: '!!ok' });
      },
    });
  }

  // ===== REIHENFOLGE ANKUPPELN =====
  {
    const s = base(deck, 'ce1k', { notes:
      '▶ Sagen: „Hier die ganze Reihenfolge. Die schreibt ihr euch am besten ab.“\n' +
      '🖱 Klick 1–7: je ein Schritt.\n' +
      '💡 Unten rechts steht von Anfang an: Schutzausrüstung beim Kuppeln – Handschuhe, Warnweste, feste Schuhe. Gleich zu Beginn ansprechen.\n' +
      '✅ DGUV Information 214-080, Kap. 2.2, und BG-Verkehr-Flyer „Kuppeln – aber sicher!“ (2020). Prüfungsfragen 2.7.07-309 (Anhänger gesichert, Zuggabel eingestellt), 2.7.07-312 (Kontrollstift), 2.7.07-320 (gelb zuerst), 2.7.07-321 (nach dem Ankuppeln Feststellbremse lösen und Keile entfernen), 2.6.03-308 (alle drei: Stecker heil, Bordspannung passt, Licht vor der Fahrt prüfen), 2.7.07-322 (Bolzen eingerastet, Kontrollstift – das Fangmaul darf nach dem Einrasten schwenken). DGUV I 214-080, S. 21: Vorderachsbremse beim Drehschemelanhänger erst nach dem roten Knopf lösen; S. 25: Fangmaul bei offener Kupplung durch kräftiges Drücken nach rechts und links prüfen – es muss arretiert sein. S. 17: Schutzausrüstung beim Kuppeln – Handschutz, Warnkleidung, geeignetes Schuhwerk.\n' +
      '➜ „Und das Abkuppeln?“' });
    kick(s, 'Ankuppeln'); title(s, 'Die Reihenfolge');
    const T = [
      ['Passt der Anhänger?', 'Anhängelast, Kupplungsgröße, Höhe'],
      ['Anhänger sichern', 'roter Knopf, Keile – beim Drehschemelanhänger dann Vorderachsbremse lösen'],
      ['Zuggabel auf Höhe', 'Kupplung öffnen – offen muss das Fangmaul fest stehen'],
      ['Zurücksetzen', 'niemand zwischen den Fahrzeugen'],
      ['Lkw-Feststellbremse, aussteigen', 'Kontrollstift ansehen, tasten'],
      ['Gelb, dann rot', 'dazu Licht- und ABS/EBS-Stecker'],
      ['Losmachen', 'Höhe lösen, Anhänger-Feststellbremse lösen, Keile weg, Abfahrtkontrolle'],
    ];
    for (let i = 0; i < 7; i++) {
      const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4, x = 0.7 + col * 6.05, y = 1.95 + row * 1.15, w = 5.85, h = 1.0;
      card(s, x, y, w, h, { line: C.or }, CLICK);
      s.text(String(i + 1), { x: x + 0.2, y: y + 0.22, w: 0.56, h: 0.56, size: 20, bold: true, color: C.dark, fill: C.or, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 250 });
      s.text([{ text: T[i][0], options: { bold: true, color: C.txt, breakLine: true } }, { text: T[i][1], options: { color: C.mut, fontSize: 14 } }], { x: x + 0.95, y, w: w - 1.1, h, size: 18, valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    // Schutzausrüstung: gilt vor Schritt 1, darum ohne Klick sichtbar
    await point(s, 6.75, 1.95 + 3 * 1.15, 5.85, 1.0, 'LuHardHat', C.gr, 'Beim Kuppeln immer:', 'Handschuhe, Warnweste, feste Schuhe.', null, { size: 17, br: true, line: C.gr });
  }

  // ===== ABKUPPELN =====
  // ===== ABKUPPELN (zwei Spalten, damit die Symbole groß genug sind) =====
  {
    const s = base(deck, 'ce1k', {
      notes:
      '▶ Sagen: „Beim Abkuppeln ist es fast umgekehrt. Was ist wichtig?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–6: je ein Schritt.\n' +
      '✅ DGUV I 214-080, Kap. 2.2 (Abkuppeln), S. 32–37: gestreckt abstellen, vorn mindestens die doppelte Zugfahrzeuglänge frei; Starrdeichsel- und Zentralachsanhänger: Stütze absenken, bis die Zugöse leicht vom Fangmaulgrund frei ist (S. 35, 72) – sonst kann die Deichsel hochschlagen (negative Stützlast) oder herabfallen; beide Feststellbremsen; Keile; Leitungen rot, dann gelb; bei Verspannung nicht ruckeln, auf ebener Fläche Anhängerbremse kurz über die Kontrollstellung entlüften. S. 33: Anhänger nie nur mit der Notbremsfunktion (abgezogene rote Leitung) abstellen – die Luft entweicht mit der Zeit. Prüfungsfrage 2.7.07-319: zuerst die Vorratsleitung (rot) trennen.\n' +
      '➜ „Zwei Prüfungsfragen.“' });
    kick(s, 'Abkuppeln');
    await badge(s, 0.7, 1.33, 0.8, C.or, 'LuUnlink');
    s.text('Abkuppeln: Was ist anders?', { x: 1.75, y: 0.98, w: 10.9, h: 1.5, size: 34, bold: true, color: C.txt, valign: 'middle', lsm: 0.95 });
    const A = [
      ['LuMoveHorizontal', 'Gestreckt abstellen', 'Davor mindestens die doppelte Lkw-Länge frei lassen.', C.or],
      ['LuCircleParking', 'Beide Feststellbremsen und Keile', 'Lkw und Anhänger (roter Knopf). Nie nur mit abgezogenem Rot abstellen!', C.or],
      ['LuArrowDownToLine', 'Zentralachsanhänger: Stütze ab', 'vor dem Öffnen – sonst schlägt die Deichsel hoch oder fällt herunter.', C.or],
      ['LuUnlink2', 'Erst rot, dann gelb trennen', 'In die Parkdosen stecken, Schutzkappen drauf.', C.or],
      ['LuTriangleAlert', 'Kupplung verspannt?', 'Nicht ruckeln – Lebensgefahr! Eben stehen, kurz die Kontrollstellung einlegen.', C.red],
      ['LuArrowLeft', 'Vorziehen, Kupplung schließen', 'Ohne Anhänger: Kupplung zu, Schutzkappen auf die Kupplungsköpfe.', C.or],
    ];
    const gap = 0.18, top = 2.85, h = (6.55 - top - 2 * gap) / 3, w = (11.93 - 0.2) / 2;
    for (let i = 0; i < 6; i++) {
      const col = Math.floor(i / 3), row = i % 3;
      await point(s, 0.7 + col * (w + 0.2), top + row * (h + gap), w, h, A[i][0], A[i][3], A[i][1], A[i][2], CLICK, { size: 16, br: true });
    }
  }
  await quiz(deck, 'ce1k', {
    kicker: 'Prüfungsfrage 2.7.07-320', q: 'Was müssen Sie beim Ankuppeln eines Anhängers beachten?', size: 32,
    opts: ['Zuerst die Bremsleitung anschließen (gelber Kupplungskopf)', 'Bei kombinierten Kupplungsköpfen beide Leitungen gleichzeitig anschließen', 'Zuerst die Vorratsleitung anschließen (roter Kupplungskopf)'], ok: [0, 1],
    why: 'Gelb zuerst – rot nie allein. Beim Abkuppeln ist es umgekehrt: zuerst rot.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.07-320: A und B. (Gegenstück 2.7.07-319: Abkuppeln – zuerst rot.)\n➜ „Nächste Frage.“',
  });
  await quiz(deck, 'ce1k', {
    kicker: 'Prüfungsfrage 2.7.07-306', q: 'Was ist beim Ankuppeln eines Mehrachsanhängers richtig?', size: 32,
    opts: ['Das Zugfahrzeug wird zum Anhänger rangiert', 'Der Anhänger wird zum Zugfahrzeug geschoben', 'Beide Fahrzeuge werden gleichzeitig aufeinander zubewegt'], ok: [0],
    why: 'Der Anhänger steht gesichert – nur der Lkw bewegt sich. Auflaufen lassen ist verboten.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.07-306: A.\n➜ „Kapitel 3: Auf- und Absatteln.“',
  });
};
