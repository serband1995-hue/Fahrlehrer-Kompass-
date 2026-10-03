// Abend 6 · CE1: Kapitel 2 An- und Abkuppeln (Ankuppeln-Ablauf, Kupplungsköpfe, gelb vor rot, Reihenfolge, Abkuppeln)
const { C, sec, base, kick, title, card, CLICK, chapter, motion, steps, ask, photoAsk, quiz, lkw, anhaenger, seg } = require('../gs');
const { icon } = require('../lib');

sec('ce1k', 'CE1  ·  AN- UND ABKUPPELN', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce1k', { num: 2, ttl: 'An- und Abkuppeln', sub: 'Kuppelunfälle gehören zu den häufigsten tödlichen Unfällen mit Lkw. Fast immer war es ein Fehler im Ablauf.', ico: 'LuLink2', notes:
    '▶ Sagen: „Kapitel 2: An- und Abkuppeln. Das klingt einfach – aber Kuppelunfälle gehören zu den häufigsten tödlichen Unfällen mit Nutzfahrzeugen. Die Ursache ist fast immer ein Fehler im Ablauf, nicht die Technik.“\n✅ DGUV Information 214-080 „Kuppeln – aber sicher!“ (2020), S. 5.\n🖱 Keine Klicks.\n➜ „Schauen wir uns das Ankuppeln an.“' });

  // ===== ANKUPPELN (fließend) =====
  {
    const K = 0.62, GY = 4.75, L = 5.0, TX = 9.35, EYE_C = GY - 0.6 * K, EYE_LOW = GY - 0.36 * K;
    const XC = TX - (1.0 + 0.02) * K - (L + 0.02) * K + 0.02 * K; // Lkw-X, wenn gekuppelt (Kupplung = Zugöse)
    const fr = (dx, o = {}) => ({ ...o, t: { dx, ...(o.t || {}) } });
    await motion(deck, 'ce1k', {
      kicker: 'Ankuppeln', ttl: 'Der Lkw kommt zum Anhänger', dur: 520, holdDur: 650,
      question: 'Wer bewegt sich beim Ankuppeln – und wo darf niemand stehen?',
      answer: 'Der Lkw setzt zum gesicherten Anhänger zurück. Zwischen den Fahrzeugen darf niemand stehen – auch nicht, um die Zuggabel zu halten.',
      legend: 'Seitenansicht · schematisch',
      frames: [
        fr(-1.6, { hold: true, t: { secured: 1 }, cap: 'Zuerst den Anhänger sichern: Feststellbremse (roter Knopf ziehen) und Unterlegkeile.', note: '▶ Sagen: „Bevor irgendetwas passiert: Der Anhänger wird gesichert. Feststellbremse – der rote Knopf am Anhänger wird gezogen – und Unterlegkeile an die starre Achse.“\n❓ Frage auf der Folie stellen.\n✅ DGUV I 214-080, Kap. 2.2: Anhänger sichern (Feststellbremse, Unterlegkeile – nie an Drehschemel-, Lenk- oder Liftachse). Prüfungsfrage 2.7.07-309: vor dem Ankuppeln prüfen, ob der Anhänger gegen Wegrollen gesichert ist und ob die Zuggabel richtig eingestellt ist.\n🖱 Klick: Der Lkw fährt heran.\n➜ „Jetzt kommt der Lkw.“' }),
        fr(-0.45, { hold: true, t: { secured: 1, hee: 1, zone: 1 }, cap: 'Bis etwa 1 m heranfahren. Zuggabel mit der Höheneinstellung auf Kupplungshöhe bringen, Kupplung öffnen.', note: '▶ „Der Lkw fährt bis etwa einen Meter vor die Zugöse. Dann wird die Zuggabel mit der Höheneinstellung auf die Höhe des Fangmauls gebracht, und die Kupplung wird geöffnet. Bei einem Drehschemelanhänger wird jetzt die Vorderachsbremse gelöst – erst wenn die Feststellbremse angezogen ist.“\n✅ DGUV I 214-080, Kap. 2.2. Prüfungsfrage 2.7.07-327: Die Zuggabel wird von der Höheneinstellvorrichtung des Anhängers auf Höhe gehalten – nicht von einer Person.\n🖱 Klick: Der Lkw setzt zurück (läuft von selbst).\n➜ „Und jetzt zurücksetzen.“' }),
        fr(-0.2, { t: { secured: 1, hee: 1, zone: 1 }, cap: 'Langsam zurücksetzen. Zwischen den Fahrzeugen ist Gefahrbereich – niemand dazwischen!' }),
        fr(0, { hold: true, answer: true, t: { secured: 1, hee: 1, coupled: 1 }, cap: 'Eingerastet. Feststellbremse im Lkw ziehen, aussteigen – dann den Kontrollstift prüfen.', note: '▶ „Klack – eingerastet. Jetzt Feststellbremse im Lkw ziehen, erst dann aussteigen. Und dann: Kontrollstift ansehen, im Dunkeln tasten.“\n✅ Prüfungsfrage 2.7.07-306: Das Zugfahrzeug wird zum Anhänger rangiert. 2.6.03-307: gegen Wegrollen sichern; keine Personen zwischen den Fahrzeugen. 2.7.01-128: Einweiser steht im Sichtbereich des Fahrers – er hält nicht die Zuggabel. DGUV I 214-080, S. 27: Anhänger zum Kuppeln auflaufen lassen ist ohne Ausnahme verboten.\n🖱 Klick: Leitungen anschließen.\n➜ „Und dann die Leitungen.“' }),
        fr(0, { hold: true, t: { hee: 0, coupled: 1, lines: 1 }, cap: 'Leitungen: gelb, dann rot, dazu Strom und ABS. Höheneinstellung lösen, Anhänger-Feststellbremse lösen, Keile weg.', note: '▶ „Jetzt die Leitungen: erst gelb, dann rot – gleich schauen wir, warum. Dazu der Stecker für Licht und der ABS/EBS-Stecker. Dann Höheneinstellung lösen, Feststellbremse am Anhänger lösen, Keile wegnehmen und verstauen. Zum Schluss: Abfahrtkontrolle.“\n✅ DGUV I 214-080, Kap. 2.2, Schritte 10–13.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Welche Leitung ist welche?“' }),
      ],
      scene: async (s, { dx, secured = 0, hee = 0, zone = 0, coupled = 0, lines = 0 }) => {
        const X = XC + dx;
        s.rect(5.75, GY, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
        // Gefahrbereich
        const z0 = X + (L + 0.05) * K, z1 = TX;
        s.rect(Math.min(z0, z1 - 0.05), GY - 1.6, Math.max(0.05, z1 - z0), 1.6, { fill: C.red, ft: zone ? 72 : 100, name: '!!zone' });
        s.text(zone ? 'Gefahrbereich – niemand dazwischen!' : '', { x: 7.3, y: 1.55, w: 4.6, h: 0.4, size: 15, bold: true, color: C.red, align: 'center', name: '!!zt' });
        await lkw(s, { L, box: 'koffer', boxH: 1.45, axles: [0.78, 3.9], hitch: true }, { x: X, gy: GY, k: K, name: '!!lk' });
        const a = await anhaenger(s, { L: 4.6 }, { x: TX, gy: GY, k: K, name: 'ah' });
        const ex = TX - 1.0 * K, ey = hee ? EYE_C : EYE_LOW;
        seg(s, a.pivot[0], a.pivot[1], ex, ey, { col: '3A4250', th: 0.06, name: '!!dei' });
        s.oval(ex - 0.06, ey - 0.06, 0.12, 0.12, { fill: '9AA6B5', name: '!!oese' });
        // Keile + Feststellbremse
        const rw = TX + (4.6 - 0.85) * K;
        s.shape(s.pres.shapes.RIGHT_TRIANGLE, { x: rw + 0.2, y: GY - 0.17, w: 0.2, h: 0.17, fill: C.am, ft: secured ? 0 : 100, name: '!!keil' });
        s.text('P', { x: TX + 2.0 * K - 0.17, y: GY - 1.45, w: 0.34, h: 0.34, size: 13, bold: true, color: C.white, fill: C.red, ft: secured ? 0 : 100, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!P' });
        s.text(secured ? 'roter Knopf gezogen, Keil' : '', { x: TX + 2.0 * K + 0.25, y: GY - 1.45, w: 2.4, h: 0.34, size: 12, bold: true, color: C.am, valign: 'middle', name: '!!pt' });
        // Leitungen
        const lx0 = X + (L - 0.05) * K, lx1 = TX + 0.02;
        seg(s, lx0, GY - 1.0 * K, lx1, GY - 0.95 * K, { col: C.am, th: 0.05, hide: !lines, name: '!!lgelb' });
        seg(s, lx0, GY - 1.08 * K, lx1, GY - 1.03 * K, { col: C.red, th: 0.05, hide: !lines, name: '!!lrot' });
        s.text(coupled ? '✓  eingerastet' : '', { x: 10.5, y: 5.05, w: 2.55, h: 0.42, size: 15, bold: true, color: C.dark, fill: coupled ? C.gr : undefined, ft: coupled ? 0 : 100, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!stat' });
        s.text(hee && !coupled ? 'Zuggabel auf Kupplungshöhe' : '', { x: 6.3, y: 5.05, w: 3.6, h: 0.35, size: 13, bold: true, color: C.mut, name: '!!heet' });
      },
    });
  }

  // ===== FOTO: KUPPLUNGSKÖPFE =====
  await photoAsk(deck, 'ce1k', {
    bg: 'k_koepfe_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Leitungen', q: 'Rot, gelb, schwarz – was ist was?', qsize: 30, w: 5.05, asize: 15,
    answers: [
      ['LuCircle', 'Rot: Vorratsleitung', 'immer Druck – füllt den Luftbehälter des Anhängers.', C.red],
      ['LuCircle', 'Gelb: Bremsleitung', 'nur beim Bremsen Druck – meldet den Bremswunsch.', C.am],
      ['LuPlug', 'Schwarz: ABS/EBS-Stecker', 'Strom und Daten für die Anhängerbremse.', '8A95A6'],
      ['LuBan', 'Farben nie vertauschen', 'Verschiedenfarbige Teile nicht verbinden.', C.or],
    ],
    notes:
      '▶ Sagen: „Drei Anschlüsse vorn am Anhänger. Was ist was?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Anschluss.\n' +
      '✅ Rot = Vorratsleitung, gelb = Bremsleitung (DGUV I 214-080; Prüfungsfragen 2.7.07-319/-320). Prüfungsfrage 2.7.07-321: verschiedenfarbige Kupplungsteile nicht miteinander verbinden. ABS/EBS-Verbindung nach ISO 7638 (RL 71/320/EWG Anhang X). Mehr dazu nach der Pause in CE2.\n' +
      '➜ „Und welche schließt ihr zuerst an?“',
  });

  // ===== GELB VOR ROT (Morph) =====
  {
    const ST = [
      { y: 0, r: 0, cyl: 'fest (Federspeicher)', ok: 'Anhänger steht sicher: roter Knopf gezogen, Keile liegen.', col: C.gr, tank: 0.5 },
      { y: 1, r: 0, cyl: 'bremst (über gelb)', ok: 'Gelb angeschlossen: Es zischt kurz – die Feststellbremse im Lkw schickt Luft in gelb.', col: C.gr, tank: 0.5 },
      { y: 1, r: 1, cyl: 'bremst (über gelb)', ok: 'Dann rot: Der Behälter füllt sich. Der Anhänger hängt jetzt am Bremswunsch des Fahrers.', col: C.gr, tank: 1 },
      { y: 0, r: 1, cyl: 'GELÖST!', ok: 'Falsch: nur rot. Rot löst die Anhängerbremse – gelb sagt nichts. Der Anhänger kann wegrollen!', col: C.red, tank: 1 },
    ];
    await steps(deck, 'ce1k', {
      kicker: 'Leitungen', ttl: 'Gelb vor Rot',
      list: ['Vorher: nichts verbunden', 'Zuerst gelb', 'Dann rot', 'Falsch: nur rot'],
      ask: { q: 'Welche Leitung schließt ihr zuerst an – und warum?', a: 'Gelb, dann rot. Rot allein löst die Anhängerbremse. Abkuppeln: zuerst rot, dann gelb. Rot nie allein!', at: 2 },
      caps: [
        'Vorher: Der Anhänger ist abgekuppelt und mit Feststellbremse und Keilen gesichert.',
        'Zuerst gelb, die Bremsleitung. Die Feststellbremse im Lkw belüftet gelb – der Anhänger wird gebremst. Kein Zischen? Feststellbremse im Lkw prüfen!',
        'Dann rot, die Vorratsleitung. Der Luftbehälter im Anhänger füllt sich. Jetzt bremst der Anhänger, wann der Fahrer bremst.',
        'Wer nur rot anschließt, löst die Anhängerbremse – ohne gelb gibt es kein Signal zum Bremsen. Merksatz: „Rot nie allein!“',
      ],
      notes: [
        '▶ Sagen: „Links der Lkw mit seinen Kupplungsköpfen, rechts der Anhänger mit Luftbehälter und Bremszylinder. Noch ist nichts verbunden. Der Anhänger steht mit Feststellbremse und Keilen.“\n❓ Frage auf der Folie stellen.\n➜ „Was kommt zuerst?“',
        '▶ „Zuerst gelb, die Bremsleitung. Weil im Lkw die Feststellbremse gezogen ist, schickt der Lkw Luft in die gelbe Leitung – es zischt kurz, und der Anhänger wird gebremst. Zischt es nicht, prüft ihr die Feststellbremse im Lkw.“\n✅ DGUV I 214-080, S. 28/29: Ankuppeln – zuerst Bremsleitung (gelb), dann Vorratsleitung (rot); ist beim Anschließen von gelb kein Zischen zu hören, prüfen, ob die Feststellbremse im Zugfahrzeug betätigt ist. Prüfungsfrage 2.7.07-320.\n➜ „Dann rot.“',
        '▶ „Jetzt rot, die Vorratsleitung. Der Behälter im Anhänger füllt sich. Ab jetzt bremst der Anhänger, wenn der Fahrer bremst – oder die Feststellbremse im Lkw zieht.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfragen 2.7.07-320 (zuerst gelb; kombinierte Köpfe gleichzeitig) und 2.7.07-319 (abkuppeln: zuerst rot).\n➜ „Und was passiert, wenn man es falsch macht?“',
        '▶ „Der Fehler: nur rot. Das Anschließen von rot löst die Notbremse des Anhängers. Ohne gelb bekommt er aber kein Bremssignal. Ist dann auch die Feststellbremse am Anhänger nicht gezogen – rollt er weg. Darum: Rot nie allein!“\n✅ DGUV I 214-080, S. 20 und 28: Das Anschließen der roten Leitung löst die Betriebsbremse des Anhängers. Notfall-Tipp (S. 29): Rollt der Zug los, rote Leitung trennen – nie versuchen, ins Führerhaus zu kommen.\n💡 Kombinierte Kupplungsköpfe (beide Leitungen in einer Einheit) vermeiden Verwechslungen.\n➜ „Die ganze Reihenfolge beim Ankuppeln.“',
      ],
      legend: 'Schema · vereinfacht',
      scene: async (s, i) => {
        const t = ST[i];
        // Lkw-Seite
        s.rrect(5.8, 2.1, 1.7, 3.0, { fill: '1A2230', line: C.line, rr: 0.08, name: '!!lkwb' });
        s.text('Lkw', { x: 5.8, y: 2.15, w: 1.7, h: 0.35, size: 15, bold: true, color: C.mut, align: 'center', name: '!!lkwt' });
        s.text('P', { x: 6.45, y: 4.35, w: 0.4, h: 0.4, size: 15, bold: true, color: C.white, fill: C.red, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!lp' });
        s.text('Feststellbremse gezogen', { x: 5.8, y: 4.75, w: 1.7, h: 0.3, size: 10, color: C.mut, align: 'center', name: '!!lpt' });
        // Anhänger-Seite
        s.rrect(10.8, 2.1, 2.25, 3.0, { fill: '1A2230', line: C.line, rr: 0.08, name: '!!ahb' });
        s.text('Anhänger', { x: 10.8, y: 2.15, w: 2.25, h: 0.35, size: 15, bold: true, color: C.mut, align: 'center', name: '!!aht' });
        s.rrect(11.05, 2.65, 1.75, 0.6, { fill: '0B1119', line: '4A5668', rr: 0.3, name: '!!tank' });
        s.rrect(11.05, 2.65, Math.max(0.05, 1.75 * t.tank), 0.6, { fill: '4C8DF0', rr: 0.3, name: '!!tankf' });
        s.text('Luftbehälter', { x: 11.05, y: 3.27, w: 1.75, h: 0.28, size: 11, color: C.mut, align: 'center', name: '!!tankt' });
        s.text([{ text: 'Bremse: ', options: { color: C.mut } }, { text: t.cyl, options: { bold: true, color: t.col } }], { x: 10.85, y: 3.7, w: 2.15, h: 0.6, size: 13, align: 'center', valign: 'middle', name: '!!cyl' });
        // Leitungen
        const ln = (yy, col, on, nm) => {
          s.oval(7.45, yy - 0.13, 0.26, 0.26, { fill: col, name: '!!kk' + nm });
          seg(s, 7.6, yy, on ? 10.8 : 8.6, on ? yy : yy + 0.45, { col, th: 0.08, name: '!!lt' + nm });
          s.oval(on ? 10.68 : 8.48, (on ? yy : yy + 0.45) - 0.12, 0.24, 0.24, { fill: col, line: C.dark, lw: 1, name: '!!kh' + nm });
        };
        ln(2.95, C.am, t.y, 'g');
        ln(3.85, C.red, t.r, 'r');
        s.text('gelb = Bremse', { x: 8.3, y: 2.55, w: 2.2, h: 0.3, size: 12, bold: true, color: C.am, align: 'center', name: '!!gtx' });
        s.text('rot = Vorrat', { x: 8.3, y: 4.25, w: 2.2, h: 0.3, size: 12, bold: true, color: C.red, align: 'center', name: '!!rtx' });
        s.text(t.ok, { x: 5.8, y: 5.4, w: 7.25, h: 0.75, size: 16, bold: true, color: t.col, align: 'center', valign: 'middle', name: '!!ok' });
      },
    });
  }

  // ===== REIHENFOLGE ANKUPPELN =====
  {
    const s = base(deck, 'ce1k', { notes:
      '▶ Sagen: „Hier die ganze Reihenfolge. Die schreibt ihr euch am besten ab.“\n' +
      '🖱 Klick 1–7: je ein Schritt.\n' +
      '✅ DGUV Information 214-080, Kap. 2.2, und BG-Verkehr-Flyer „Kuppeln – aber sicher!“ (2020). Prüfungsfragen 2.7.07-309 (Anhänger gesichert, Zuggabel eingestellt), 2.7.07-312 (Kontrollstift), 2.7.07-320 (gelb zuerst), 2.7.07-321 (nach dem Ankuppeln Feststellbremse lösen und Keile entfernen), 2.6.03-308 (elektrische Verbindung prüfen, Beleuchtung vor Fahrtantritt prüfen).\n' +
      '➜ „Und das Abkuppeln?“' });
    kick(s, 'Ankuppeln'); title(s, 'Die Reihenfolge');
    const T = [
      ['Passt der Anhänger?', 'Anhängelast, Kupplungsgröße, Höhe'],
      ['Anhänger sichern', 'roter Knopf, Keile – dann Vorderachsbremse lösen'],
      ['Zuggabel auf Höhe', 'Kupplung öffnen, Fangmaul prüfen'],
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
  }

  // ===== ABKUPPELN =====
  await ask(deck, 'ce1k', {
    kicker: 'Abkuppeln', q: 'Abkuppeln: Was ist anders?', ico: 'LuUnlink', qsize: 34,
    answers: [
      ['LuMoveHorizontal', 'Gestreckt abstellen', 'Davor Platz lassen – etwa doppelt so lang wie der Lkw.', C.or, 17],
      ['LuCircleParking', 'Beide Feststellbremsen und Keile', 'Lkw und Anhänger (roter Knopf). Nie nur mit abgezogener roter Leitung abstellen!', C.or, 17],
      ['LuUnlink2', 'Erst rot, dann gelb trennen', 'In die Parkdosen stecken, Schutzkappen drauf.', C.or, 17],
      ['LuTriangleAlert', 'Kupplung verspannt?', 'Nicht ruckeln – Lebensgefahr! Auf ebener Fläche kurz über die Kontrollstellung entspannen.', C.red, 17],
      ['LuArrowLeft', 'Vorziehen, Kupplung schließen', 'Ohne Anhänger: Kupplung zu, Schutzkappen auf die Kupplungsköpfe.', C.or, 17],
    ],
    notes:
      '▶ Sagen: „Beim Abkuppeln ist es fast umgekehrt. Was ist wichtig?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–5: je ein Schritt.\n' +
      '✅ DGUV I 214-080, Kap. 2.2 (Abkuppeln), S. 32–37: gestreckt abstellen, vorn etwa doppelte Zugfahrzeuglänge frei; beide Feststellbremsen; Keile; Leitungen rot, dann gelb; bei Verspannung nicht ruckeln, auf ebener Fläche Anhängerbremse kurz über die Kontrollstellung entlüften. S. 33: Anhänger nie nur mit der Notbremsfunktion (abgezogene rote Leitung) abstellen – die Luft entweicht mit der Zeit. Prüfungsfrage 2.7.07-319: zuerst die Vorratsleitung (rot) trennen.\n' +
      '➜ „Zwei Prüfungsfragen.“',
  });
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
