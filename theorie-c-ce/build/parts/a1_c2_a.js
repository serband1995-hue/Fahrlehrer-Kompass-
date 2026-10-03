// C2 Teil A: Titel, Lernziele, Geschwindigkeit, Abstand, Überholen, Fahrstreifen, Verbotszeichen
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, chapter, foot, sign, signImg, veh, photoAsk } = require('../gs');
const { icon, W } = require('../lib');

sec('c2', 'LEKTION C2', C.bl, 'bg_blue.jpg');
sec('tmp', 'C2  ·  GESCHWINDIGKEIT UND ABSTAND', C.bl, 'bg_blue.jpg');
sec('ueb', 'C2  ·  ÜBERHOLEN UND FAHRSTREIFEN', C.or, 'bg_or.jpg');
const mv = (dx, dy) => `M 0 0 L ${(dx / W).toFixed(4)} ${(dy / 7.5).toFixed(4)} E`;

module.exports = async (deck) => {
  deck.ftLabel = 'KLASSE C  ·  ABEND 1';
  // ===== TITEL C2 =====
  {
    const s = base(deck, 'c2', { bg: 'f_land.jpg', ov: 9.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „Lektion C2: Welche Verkehrsregeln sind für Lkw anders als für Pkw? Tempo, Abstand, Überholen, Bahnübergang, Parken, Fahrverbote – und zum Schluss Papiere und Maut.“\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Hier der Plan für die nächsten 90 Minuten.“' });
    s.img('ov_left.png', { x: 0, y: 0, w: 8.0, h: 7.5, name: '!!ov2' });
    s.text('KLASSE C  ·  LEKTION C2', { x: 0.7, y: 2.2, w: 8, h: 0.4, size: 15, bold: true, color: C.bl, cs: 4 }, { fx: 'fade', auto: true, dur: 700 });
    s.text('Besondere Vorschriften aus der StVO / Transportvorschriften', { x: 0.7, y: 2.55, w: 7.0, h: 2.1, size: 40, bold: true, color: C.txt, lsm: 0.9 }, { fx: 'rise', auto: true, dur: 1000, d: 250 });
    s.rect(0.75, 4.75, 1.6, 0.07, { fill: C.bl }, { fx: 'wipeR', auto: true, dur: 700, d: 800 });
    s.text('Tempo, Abstand, Überholen, Bahnübergang, Parken, Fahrverbote, Papiere', { x: 0.7, y: 4.95, w: 6.4, h: 0.8, size: 20, color: C.mut }, { fx: 'fade', auto: true, dur: 800, d: 1000 });
  }
  // ===== LERNZIELE C2 =====
  {
    const s = base(deck, 'c2', { notes:
      '▶ Sagen: „Sechs Themen, alle mit einer Gemeinsamkeit: Für Lkw gelten eigene Regeln.“\n' +
      '🖱 Klick 1–6: je ein Kapitel mit Zeit.\n' +
      '💡 Zeiten sind Richtwerte, zusammen mit Abschluss 90 Minuten.\n' +
      '➜ „Kapitel 1: Wie schnell darf ein Lkw fahren?“' });
    kick(s, 'Lektion C2 · Besondere Vorschriften'); title(s, 'Das lernt ihr in C2');
    const T = [['01', 'Geschwindigkeit und Abstand', '15 Min', C.bl], ['02', 'Überholen, Fahrstreifen, Verbotszeichen', '15 Min', C.or], ['03', 'Bahnübergänge', '10 Min', C.red], ['04', 'Halten und Parken', '10 Min', C.pu], ['05', 'Fahrverbote, Mitfahrer, Unterfahrschutz', '15 Min', C.am], ['06', 'Papiere und Maut', '15 Min', C.gr]];
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2), x = 0.7 + col * 6.08, y = 2.05 + row * 1.35;
      card(s, x, y, 5.85, 1.15, { line: T[i][3] }, CLICK);
      s.text(T[i][0], { x: x + 0.2, y, w: 0.9, h: 1.15, size: 30, bold: true, color: T[i][3], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][1], { x: x + 1.15, y, w: 3.4, h: 1.15, size: 18, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][2], { x: x + 4.45, y, w: 1.2, h: 1.15, size: 16, bold: true, color: T[i][3], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 10 Min Abschluss: Mitschreiben, Quiz und „Das nehmt ihr mit“', { x: 0.7, y: 6.15, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }
  await chapter(deck, 'tmp', { num: 1, ttl: 'Geschwindigkeit und Abstand', sub: 'Mehr Masse heißt: langsamer fahren, mehr Platz lassen.', ico: 'LuGauge', notes:
    '▶ Sagen: „Kapitel 1: Tempo und Abstand.“\n🖱 Keine Klicks.\n➜ „Wer weiß, wie schnell ein Lkw außerorts fahren darf?“' });
  // ===== TEMPO-TABELLE =====
  {
    const s = base(deck, 'tmp', { notes:
      '▶ Sagen: „Die Höchstgeschwindigkeit hängt davon ab, wie schwer der Lkw ist und ob ein Anhänger dran ist.“\n' +
      '❓ Vor jeder Zeile fragen: „Wie schnell innerorts? Außerorts? Autobahn?“\n' +
      '🖱 Klick 1: Zeile 3,5–7,5 t · Klick 2: Zeile über 7,5 t · Klick 3: Zeile mit Anhänger · Klick 4: Begrenzer.\n' +
      '✅ § 3 Abs. 3 Nr. 2 StVO: Kfz über 3,5 t bis 7,5 t außerorts 80 km/h; Kfz über 7,5 t und Kfz mit Anhänger (außer Pkw und Lkw bis 3,5 t) außerorts 60 km/h. § 18 Abs. 5 StVO: auf Autobahnen und auf Kraftfahrstraßen mit baulich getrennten Richtungsfahrbahnen 80 km/h. Auf einer Kraftfahrstraße ohne Mitteltrennung gilt § 3 Abs. 3 (über 7,5 t oder mit Anhänger: 60) – typische Prüfungsfalle.\n' +
      '✅ Innerorts 50 km/h für alle (§ 3 Abs. 3 Nr. 1).\n' +
      '✅ Geschwindigkeitsbegrenzer: Lkw über 3,5 t auf 90 km/h begrenzt (§ 57c StVZO). Er schützt euch nicht davor, 80 zu überschreiten!\n' +
      '💡 Häufiger Irrtum: „Lkw außerorts immer 60.“ Bis 7,5 t ohne Anhänger sind es 80.\n' +
      '💡 Mit Schneeketten höchstens 50 (§ 3 Abs. 4); Sichtweite unter 50 m höchstens 50 (§ 3 Abs. 1).\n' +
      '➜ „Warum sind die Grenzen für Lkw so niedrig?“' });
    kick(s, 'Höchstgeschwindigkeit · § 3 und § 18 StVO'); title(s, 'Wie schnell darf ein Lkw?');
    const cx = [5.3, 7.75, 10.2], hy = 2.05;
    s.text('innerorts', { x: cx[0], y: hy, w: 2.2, h: 0.4, size: 15, bold: true, color: C.dim, align: 'center', cs: 1 });
    s.text('außerorts', { x: cx[1], y: hy, w: 2.2, h: 0.4, size: 15, bold: true, color: C.dim, align: 'center', cs: 1 });
    s.text('Autobahn', { x: cx[2], y: hy, w: 2.2, h: 0.4, size: 15, bold: true, color: C.dim, align: 'center', cs: 1 });
    const R = [['über 3,5 t bis 7,5 t', 'ohne Anhänger', ['50', '80', '80']], ['über 7,5 t', '', ['50', '60', '80']], ['mit Anhänger', 'jeder Lkw über 3,5 t', ['50', '60', '80']]];
    for (let i = 0; i < 3; i++) {
      const y = 2.55 + i * 1.12;
      card(s, 0.7, y, 11.93, 0.98, {}, CLICK);
      s.img(await icon('LuTruck', C.bl), { x: 0.95, y: y + 0.24, w: 0.5, h: 0.5 }, { fx: 'fade', dur: 150 });
      s.text([{ text: R[i][0], options: { bold: true, color: C.txt, breakLine: !!R[i][1] } }, ...(R[i][1] ? [{ text: R[i][1], options: { color: C.mut, fontSize: 14 } }] : [])], { x: 1.6, y, w: 3.6, h: 0.98, size: 19, valign: 'middle' }, { fx: 'fade', dur: 150 });
      for (let j = 0; j < 3; j++) {
        s.oval(cx[j] + 0.68, y + 0.08, 0.84, 0.84, { fill: 'FFFFFF', line: 'D52B1E', lw: 5 }, { fx: 'zoom', dur: 300, d: j * 120 });
        s.text(R[i][2][j], { x: cx[j] + 0.68, y: y + 0.08, w: 0.84, h: 0.84, size: 26, bold: true, color: '111111', align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200, d: j * 120 });
      }
    }
    s.text([{ text: 'Geschwindigkeitsbegrenzer:  ', options: { bold: true, color: C.bl } }, { text: 'Lkw über 3,5 t sind bei 90 km/h abgeregelt (§ 57c StVZO). Erlaubt sind trotzdem nur 80! Länger als 5 Minuten mit 90: 140 €, 1 Punkt.', options: { color: C.txt } }],
      { x: 0.7, y: 5.9, w: 11.93, h: 0.88, size: 17, valign: 'middle', fill: C.card2, line: C.bl, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
  }
  // ===== WUCHT: BEWEGUNGSENERGIE =====
  {
    const s = base(deck, 'tmp', { notes:
      '▶ Sagen: „Warum sind die Grenzen für Lkw so niedrig? Wegen der Masse. Ein Lkw hat bei gleichem Tempo ein Vielfaches an Bewegungsenergie.“\n' +
      '❓ „Ein 18-t-Lkw mit 80 km/h – wie schnell müsste ein Pkw mit 1,5 t fahren, um genauso viel Wucht zu haben?“ Schätzen lassen!\n' +
      '🖱 Klick 1: Pkw 80 km/h · Klick 2: Lkw 18 t mit 80 km/h · Klick 3: Auflösung.\n' +
      '✅ Bewegungsenergie = ½ · Masse · Geschwindigkeit². Lkw 18 t ist 12-mal so schwer wie ein Pkw mit 1,5 t → 12-fache Energie bei gleichem Tempo. Ein Pkw bräuchte dafür 80 · √12 ≈ 277 km/h.\n' +
      '💡 Diese Energie muss beim Bremsen in Wärme umgewandelt werden – mehr dazu in C7 (Physik) und C5/C6 (Bremsen).\n' +
      '➜ „Und was kostet es, wenn ihr zu schnell seid?“' });
    kick(s, 'Warum langsamer?'); title(s, 'Masse macht Wucht');
    const x0 = 3.6, k = 0.68; // 1 Einheit Energie = k Zoll
    s.text('Pkw 1,5 t · 80 km/h', { x: 0.7, y: 2.35, w: 2.8, h: 0.7, size: 17, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', c: true, dur: 200 });
    s.rect(x0, 2.45, 1 * k, 0.5, { fill: C.mut }, { fx: 'wipeR', dur: 500 });
    s.text('1 ×', { x: x0 + k + 0.15, y: 2.45, w: 1, h: 0.5, size: 18, bold: true, color: C.mut, valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text('Lkw 18 t · 80 km/h', { x: 0.7, y: 3.35, w: 2.8, h: 0.7, size: 17, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', c: true, dur: 200 });
    s.rect(x0, 3.45, 12 * k, 0.5, { fill: C.bl }, { fx: 'wipeR', dur: 1000 });
    s.text('12 ×', { x: x0 + 12 * k - 1.1, y: 3.45, w: 1.0, h: 0.5, size: 18, bold: true, color: C.dark, align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200, d: 700 });
    card(s, 0.7, 4.5, 11.93, 1.75, { line: C.bl }, { fx: 'rise', c: true, dur: 450 });
    s.text([{ text: 'Gleiche Wucht wie der Lkw hätte ein Pkw erst bei', options: { color: C.txt, breakLine: true } }, { text: 'etwa 277 km/h', options: { bold: true, color: C.bl, fontSize: 40 } }], { x: 1.0, y: 4.55, w: 11.4, h: 1.65, size: 20, valign: 'middle', align: 'center' }, { fx: 'fade', dur: 250 });
    foot(s, 'Bewegungsenergie E = ½ · m · v²  –  doppelte Masse = doppelte Energie, doppeltes Tempo = vierfache Energie');
  }
  // ===== BUSSGELDER TEMPO =====
  {
    const s = base(deck, 'tmp', { notes:
      '▶ Sagen: „Für Lkw über 3,5 t gibt es eine eigene, teurere Tabelle im Bußgeldkatalog.“\n' +
      '❓ „Lkw, außerorts 21 km/h zu schnell – was schätzt ihr?“\n' +
      '🖱 Klick 1–4: je eine Zeile.\n' +
      '✅ BKat Nr. 11.1 mit Tabelle 1 Buchstabe a (Kfz über 3,5 t, Kfz mit Anhänger): außerorts 16–20 km/h 140 €, 1 Punkt · 21–25 km/h 150 €, 1 Punkt · 26–30 km/h 175 €, 1 Punkt · 31–40 km/h 255 €, 1 Monat Fahrverbot, 2 Punkte.\n' +
      '✅ Innerorts teurer: 16–20 km/h 160 € · 21–25 km/h 175 € · 26–30 km/h 235 €, 1 Monat Fahrverbot, 2 Punkte.\n' +
      '💡 Zum Vergleich Pkw außerorts 21–25 km/h: 100 €, 1 Punkt.\n' +
      '➜ „Neben dem Tempo zählt der Abstand.“' });
    kick(s, 'Zu schnell mit dem Lkw · BKat Tabelle 1a'); title(s, 'Außerorts zu schnell – was kostet es?', { size: 36 });
    s.text('ZU SCHNELL', { x: 0.95, y: 2.0, w: 3, h: 0.4, size: 14, bold: true, color: C.dim, cs: 2 });
    s.text('BUSSGELD', { x: 5.0, y: 2.0, w: 2.4, h: 0.4, size: 14, bold: true, color: C.dim, cs: 2, align: 'center' });
    s.text('PUNKTE', { x: 7.6, y: 2.0, w: 2.0, h: 0.4, size: 14, bold: true, color: C.dim, cs: 2, align: 'center' });
    s.text('FAHRVERBOT', { x: 9.8, y: 2.0, w: 2.6, h: 0.4, size: 14, bold: true, color: C.dim, cs: 2, align: 'center' });
    const T = [['16–20 km/h', '140 €', '1', '–'], ['21–25 km/h', '150 €', '1', '–'], ['26–30 km/h', '175 €', '1', '–'], ['31–40 km/h', '255 €', '2', '1 Monat']];
    for (let i = 0; i < 4; i++) {
      const y = 2.5 + i * 0.95;
      card(s, 0.7, y, 11.93, 0.8, {}, CLICK);
      s.text(T[i][0], { x: 0.95, y, w: 3.5, h: 0.8, size: 22, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 150 });
      s.text(T[i][1], { x: 5.0, y, w: 2.4, h: 0.8, size: 24, bold: true, color: C.bl, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 250 });
      s.text(T[i][2], { x: 7.6, y, w: 2.0, h: 0.8, size: 24, bold: true, color: C.or, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 250 });
      s.text(T[i][3], { x: 9.8, y, w: 2.6, h: 0.8, size: 20, bold: true, color: i === 3 ? C.red : C.dim, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 250 });
    }
    foot(s, 'BKat Nr. 11.1 i. V. m. Tabelle 1 Buchstabe a – außerorts. Innerorts jeweils teurer.');
  }
  // ===== 50 M ABSTAND (Draufsicht mit Bewegung) =====
  {
    const s = base(deck, 'tmp', { notes:
      '▶ Sagen: „Auf der Autobahn gibt es für Lkw eine feste Regel: mindestens 50 Meter Abstand zum Vordermann.“\n' +
      '❓ „Woran erkennt ihr 50 Meter?“ ✅ An den Leitpfosten: auf gerader Strecke alle 50 m.\n' +
      '🖱 Klick 1: „zu dicht!“ · Klick 2: der hintere Lkw fällt zurück auf 50 m · Klick 3: die Regel.\n' +
      '✅ § 4 Abs. 3 StVO: Lkw über 3,5 t zGM und Busse müssen auf Autobahnen bei mehr als 50 km/h mindestens 50 m Abstand halten. Verstoß: 80 €, 1 Punkt (BKat Nr. 15).\n' +
      '✅ Landstraße mit einem Fahrstreifen je Richtung (§ 4 Abs. 2): Lkw über 3,5 t und Züge über 7 m lassen so viel Platz, dass ein Überholer davor einscheren kann. Auf der Autobahn gilt stattdessen die 50-m-Regel.\n' +
      '💡 Bei 80 km/h sind 50 m nur gut 2 Sekunden. Bei Nässe oder schwerer Ladung lieber mehr.\n' +
      '➜ „Kurze Frage zum Tempo.“' });
    kick(s, 'Abstand · § 4 Abs. 3 StVO'); title(s, 'Autobahn: mindestens 50 m');
    const ry = 2.35, rh = 2.0;
    s.rect(0, ry, W, rh, { fill: C.road });
    s.rect(0, ry - 0.1, W, 0.1, { fill: C.curb }); s.rect(0, ry + rh, W, 0.1, { fill: C.curb });
    for (let x = 0.1; x < W; x += 0.75) s.rect(x, ry + rh / 2 - 0.02, 0.42, 0.045, { fill: C.mark });
    // Leitpfosten alle 50 m (1 m = 0,09 Zoll → 50 m = 4,5 Zoll)
    for (let k = 0, x = 0.8; x < W; x += 4.5, k++) {
      s.rect(x - 0.03, ry + rh + 0.2, 0.06, 0.32, { fill: 'E8ECF2' });
      s.rect(x - 0.03, ry + rh + 0.24, 0.06, 0.08, { fill: C.dark });
    }
    s.text('Leitpfosten: alle 50 m', { x: 0.7, y: ry + rh + 0.6, w: 4, h: 0.3, size: 13, italic: true, color: C.dim });
    veh(s, 'truck.png', 10.6, ry + rh * 0.75, 90, undefined, { size: [0.44, 1.6] });   // maßstäblich: rund 18 m
    const back = veh(s, 'truck.png', 8.1, ry + rh * 0.75, 90, 'trB', { size: [0.44, 1.6] });   // erst rund 10 m dahinter
    // Klick 1: zu dicht! · Klick 2: zurückfallen auf 50 m
    const ring = s.text('zu dicht!', { x: 8.45, y: ry + rh + 0.55, w: 1.8, h: 0.4, size: 18, bold: true, color: C.red, align: 'center' }, { fx: 'stamp', c: true, dur: 380 });
    s.anims.push({ name: back, kind: 'pic', fx: 'move', c: true, dur: 1600, path: mv(-3.6, 0) });
    s.anims.push({ name: ring, kind: 'sp', fx: 'out', dur: 300 });
    s.lineS(5.3, ry + 0.3, 9.8, ry + 0.3, { color: C.gr, lw: 2.5, beginArrow: 'triangle', endArrow: 'triangle' }, { fx: 'wipeR', dur: 500, a: true });
    s.text('50 m', { x: 6.75, y: ry - 0.15, w: 1.6, h: 0.4, size: 18, bold: true, color: C.gr, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text([{ text: 'Lkw über 3,5 t, Autobahn, schneller als 50 km/h:  ', options: { bold: true, color: C.bl } }, { text: 'mindestens 50 m Abstand · sonst 80 €, 1 Punkt', options: { color: C.txt } }],
      { x: 0.7, y: 5.75, w: 11.93, h: 0.75, size: 17, valign: 'middle', fill: C.card2, line: C.bl, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
  }
  quiz(deck, 'tmp', {
    kicker: 'Frage · Geschwindigkeit', q: 'Lkw mit 7,49 t zulässiger Gesamtmasse, ohne Anhänger, auf der Landstraße. Wie schnell dürft ihr höchstens fahren?', size: 28,
    opts: ['60 km/h', '80 km/h', '100 km/h'], ok: 1,
    why: '§ 3 Abs. 3 StVO: Kfz über 3,5 t bis 7,5 t außerorts 80 km/h. Erst über 7,5 t oder mit Anhänger sind es 60 km/h.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B, 80 km/h.\n💡 Fangfrage: Viele sagen 60. Das gilt erst über 7,5 t oder mit Anhänger.\n➜ „Kapitel 2: Überholen.“',
  });
  // ================= KAPITEL 2: ÜBERHOLEN =================
  await chapter(deck, 'ueb', { num: 2, ttl: 'Überholen und Fahrstreifen', sub: 'Elefantenrennen, linke Spur und die Verbotsschilder für Lkw.', bg: 'f_elefant.jpg', notes:
    '▶ Sagen: „Kapitel 2: Überholen. Jeder kennt das von der Autobahn …“\n🖱 Keine Klicks.\n➜ „Schaut euch das Bild an.“' });
  await photoAsk(deck, 'ueb', {
    bg: 'f_elefant.jpg', kicker: 'Was ist hier los?', q: 'Was machen die zwei Lkw falsch?', w: 4.7, ov: 7.0, qsize: 36, asize: 15,
    answers: [
      ['LuGauge', '„Elefantenrennen“', 'Überholen ist nur mit wesentlich höherer Geschwindigkeit erlaubt.'],
      ['LuTimer', 'Viel zu lange nebeneinander', 'Dahinter staut sich der Verkehr.'],
      ['LuEuro', '80 € und 1 Punkt', 'für den Überholenden (BKat Nr. 18).'],
    ],
    notes:
      '▶ Sagen: „Schaut euch das Bild an. Was ist hier los?“\n' +
      '❓ Sammeln lassen.\n' +
      '🖱 Klick 1: Elefantenrennen · Klick 2: zu lange nebeneinander · Klick 3: Bußgeld.\n' +
      '✅ § 5 Abs. 2 Satz 2 StVO: Überholen darf nur, wer mit wesentlich höherer Geschwindigkeit als der zu Überholende fährt. Verstoß: 80 €, 1 Punkt (BKat Nr. 18).\n' +
      '💡 Faustregel der Rechtsprechung (OLG Hamm, 4 Ss OWi 629/08): höchstens 45 Sekunden; unter 10 km/h Unterschied gilt es als deutliche Behinderung. Ist der Unterschied nur 2–3 km/h, wird es nichts – dann lieber hinten bleiben.\n' +
      '➜ „Rechnen wir mal: Wie lange dauert so ein Überholvorgang?“',
  });
  // ===== WIE LANGE DAUERT ÜBERHOLEN? (Diagramm) =====
  {
    const s = base(deck, 'ueb', { notes:
      '▶ Sagen: „Warum ist das Elefantenrennen so ein Problem? Rechnen wir.“\n' +
      '❓ „Ihr seid 2 km/h schneller als der Lkw vor euch. Wie lange dauert das Überholen?“ Schätzen lassen.\n' +
      '🖱 Klick 1: 2 km/h schneller · Klick 2: 10 km/h schneller · Klick 3: Merksatz.\n' +
      '✅ Annahme: Ihr müsst rund 80 m mehr zurücklegen als der andere (Abstand davor, zwei Lkw-Längen, Abstand danach). 2 km/h = 0,56 m/s → 80 m dauern rund 144 Sekunden, fast zweieinhalb Minuten. 10 km/h = 2,8 m/s → rund 29 Sekunden.\n' +
      '💡 Faustregel der Rechtsprechung (OLG Hamm, 4 Ss OWi 629/08): höchstens 45 Sekunden; unter 10 km/h Unterschied gilt es als deutliche Behinderung.\n' +
      '➜ „Oft ist Überholen für Lkw aber ohnehin verboten. Welche Schilder kennt ihr?“' });
    kick(s, 'Rechenbeispiel'); title(s, 'Wie lange dauert das Überholen?', { size: 36 });
    const x0 = 3.9, k = 0.058; // 1 s = k Zoll
    s.text('2 km/h schneller', { x: 0.7, y: 2.35, w: 3.1, h: 0.8, size: 19, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', c: true, dur: 200 });
    s.rect(x0, 2.45, 144 * k, 0.6, { fill: C.red }, { fx: 'wipeR', dur: 1000 });
    s.text('≈ 144 Sekunden', { x: x0 + 144 * k - 2.6, y: 2.45, w: 2.5, h: 0.6, size: 18, bold: true, color: C.white, align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200, d: 800 });
    s.text('10 km/h schneller', { x: 0.7, y: 3.45, w: 3.1, h: 0.8, size: 19, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', c: true, dur: 200 });
    s.rect(x0, 3.55, 29 * k, 0.6, { fill: C.gr }, { fx: 'wipeR', dur: 600 });
    s.text('≈ 29 Sekunden', { x: x0 + 29 * k + 0.15, y: 3.55, w: 2.5, h: 0.6, size: 18, bold: true, color: C.gr, valign: 'middle' }, { fx: 'fade', dur: 200, d: 400 });
    s.lineS(x0 + 45 * k, 2.2, x0 + 45 * k, 4.4, { color: C.or, lw: 2, dash: 'dash' });
    s.text('45 s – Richtwert der Gerichte', { x: x0 + 45 * k - 0.4, y: 4.42, w: 3.4, h: 0.3, size: 13, bold: true, color: C.or });
    s.text([{ text: 'Merke:  ', options: { bold: true, color: C.or } }, { text: 'Nur überholen, wenn ihr deutlich schneller seid – sonst hinten bleiben. Sonst staut sich der Verkehr hinter euch.', options: { color: C.txt } }],
      { x: 0.7, y: 5.1, w: 11.93, h: 0.97, size: 18, valign: 'middle', fill: C.card2, line: C.or, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
    foot(s, 'Annahme: rund 80 m Weg mehr als der Überholte (Abstände + zwei Lkw-Längen)');
  }
  // ===== VERBOTSZEICHEN =====
  {
    const s = base(deck, 'ueb', { notes:
      '▶ Sagen: „Diese Schilder betreffen euch als Lkw-Fahrer besonders. Was bedeuten sie?“\n' +
      '❓ Vor jedem Klick auf das nächste Schild zeigen und fragen.\n' +
      '🖱 Klick 1–7: je ein Schild mit Bedeutung.\n' +
      '✅ Zeichen 277: Überholverbot für Kfz über 3,5 t zulässiger Gesamtmasse (einschließlich ihrer Anhänger) und für Zugmaschinen – ausgenommen Pkw und Busse. Nur mit Zusatzzeichen gilt es auch für Busse und Pkw mit Anhänger. Verstoß 70 €, 1 Punkt (BKat Nr. 153a).\n' +
      '✅ Zeichen 253: Verbot für Kfz über 3,5 t zulässiger Gesamtmasse (inkl. Anhänger). Verstoß 100 € (BKat 141.1), laut FeV Anlage 13 kein Punkt.\n' +
      '✅ Zeichen 262: tatsächliche Masse über Angabe · 263: tatsächliche Achslast · 264: Breite · 265: Höhe · 266: Länge (jeweils einschließlich Ladung). Verstoß 40 € (BKat Nr. 142).\n✅ Zeichen 264: Breite einschließlich Außenspiegel (Anlage 2 lfd. Nr. 38) – mit Spiegeln ist euer Lkw deutlich breiter als 2,55 m!\n' +
      '💡 Wichtig: Bei 253 zählt die ZULÄSSIGE Gesamtmasse, bei 262 und 263 die TATSÄCHLICHE (was wirklich drauf ist).\n' +
      '💡 Höhe ist der Klassiker: Brücke 3,8 m, euer Koffer 4 m – das endet mit abgerissenem Dach.\n' +
      '➜ „Was ändert sich, wenn ein Zusatzzeichen darunter hängt?“' });
    kick(s, 'Verkehrszeichen für Lkw'); title(s, 'Was bedeuten diese Schilder?');
    const S = [['277', 'Überholverbot für Kfz über 3,5 t (nicht Pkw, Busse)'], ['253', 'Verbot für Kfz über 3,5 t zGM und Zugmaschinen (nicht Pkw, Busse)'], ['262__5_5__', 'tatsächliche Masse über 5,5 t verboten'], ['263__8__', 'Achslast über 8 t verboten'], ['264__2__', 'breiter als 2 m verboten'], ['265__3_8__', 'höher als 3,8 m verboten'], ['266__10__', 'länger als 10 m verboten']];
    for (let i = 0; i < 7; i++) {
      const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4;
      const x = col ? 6.85 : 0.7, y = (col ? 2.6 : 2.05) + row * 1.12;
      card(s, x, y, 5.78, 0.98, {}, i === 0 ? undefined : undefined);
      await sign(s, S[i][0], x + 0.12, y + 0.07, 0.84, 0.84);
      s.text(S[i][1], { x: x + 1.15, y, w: 4.5, h: 0.98, size: 17, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', c: true, dur: 300 });
    }
  }
  // ===== ZUSATZZEICHEN =====
  {
    const s = base(deck, 'ueb', { notes:
      '▶ Sagen: „Oft hängt unter dem Schild noch ein Zusatzzeichen. Das ändert alles. Gilt das jeweils für euch mit eurem 12-t-Lkw?“\n' +
      '❓ Bei jedem Schild fragen, abstimmen lassen, dann klicken.\n' +
      '🖱 Klick 1: links · Klick 2: Mitte · Klick 3: rechts.\n' +
      '✅ Links: 60 km/h mit Sinnbild Lkw – gilt für Kfz über 3,5 t (auch mit Anhänger) und Zugmaschinen, nicht für Pkw und Busse. Also: ja, für euch.\n' +
      '✅ Mitte: Zeichen 277 mit Zusatzzeichen „7,5 t“ – das Überholverbot gilt erst über 7,5 t. Mit 12 t: ja. Mit einem 7-t-Lkw ohne Anhänger: nein. Mit Anhänger zählt die zulässige Gesamtmasse des ganzen Zuges (mehr dazu in CE4).\n' +
      '✅ Rechts: Zeichen 253 mit „Anlieger frei“ – Durchfahrt verboten, aber wer dort etwas abholt oder liefert, darf hinein.\n' +
      '💡 In der Prüfung oft gefragt: Bei Zeichen 253 zählt die zulässige Gesamtmasse – auch der leere Lkw darf nicht hinein.\n' +
      '➜ „Und welche Spur dürft ihr auf der Autobahn benutzen?“' });
    kick(s, 'Zusatzzeichen'); title(s, 'Gilt das für euren 12-t-Lkw?', { size: 36 });
    const S = [['274_60', '1010_51', 'Ja – 60 gilt für Lkw über 3,5 t', 'nicht für Pkw und Busse'], ['277', '1053_33', 'Ja – Überholverbot erst über 7,5 t', 'mit 7 t dürftet ihr überholen'], ['253', '1020_30', 'Nur als Anlieger', 'wer dort lädt oder liefert, darf hinein']];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 4.1;
      card(s, x, 1.95, 3.85, 4.7, {});
      await sign(s, S[i][0], x + 1.0, 2.15, 1.85, 1.85);
      s.img(await signImg(S[i][1]), { x: x + 0.95, y: 4.05, w: 1.95, h: 0.95, sizing: 'contain' });
      s.text([{ text: S[i][2], options: { bold: true, color: C.or, breakLine: true } }, { text: S[i][3], options: { color: C.mut, fontSize: 14 } }], { x: x + 0.15, y: 5.15, w: 3.55, h: 1.35, size: 17, align: 'center', valign: 'middle' }, { fx: 'rise', c: true, dur: 400 });
    }
  }
  // ===== FAHRSTREIFEN (Draufsicht 3 Spuren) =====
  {
    const s = base(deck, 'ueb', { notes:
      '▶ Sagen: „Auf einer Autobahn mit drei Fahrstreifen: Welche Spuren dürft ihr mit dem Lkw benutzen?“\n' +
      '❓ Abstimmen lassen.\n' +
      '🖱 Klick 1: rechte und mittlere Spur erlaubt · Klick 2: linke Spur verboten · Klick 3: Sicht bis 50 m und Glätte · Klick 4: Überholverbot bei Sicht unter 50 m.\n' +
      '✅ § 7 Abs. 3c Satz 3 StVO: Bei drei markierten Fahrstreifen je Richtung dürfen Lkw über 3,5 t zGM und alle Kfz mit Anhänger den linken Fahrstreifen nicht benutzen (außer zum Linksabbiegen). 15 € (BKat Nr. 31b), mit Behinderung 20 €.\n' +
      '✅ § 18 Abs. 11 StVO: Lkw über 7,5 t (auch mit Anhänger) und Zugmaschinen dürfen, wenn die Sicht durch erheblichen Schneefall oder Regen auf 50 m oder weniger eingeschränkt ist, sowie bei Schneeglätte oder Glatteis den äußerst linken Fahrstreifen nicht benutzen. 80 €, 1 Punkt (BKat Nr. 87a).\n' +
      '✅ § 5 Abs. 3a StVO: Kfz über 7,5 t dürfen bei Sichtweite unter 50 m nicht überholen. 120 €, 1 Punkt (BKat Nr. 21).\n' +
      '💡 Merke: Die Spur-Regel bei drei Streifen gilt schon ab 3,5 t – nicht erst ab 7,5 t.\n' +
      '➜ „Testen wir das Überholen.“' });
    kick(s, 'Fahrstreifen · § 7 und § 18 StVO'); title(s, 'Drei Spuren – zwei für euch');
    const x0 = 0.7, w = 7.0, y0 = 2.1, lw = 1.05;
    s.rect(x0, y0, w, lw * 3, { fill: C.road });
    s.rect(x0, y0 - 0.1, w, 0.1, { fill: C.curb }); s.rect(x0, y0 + 3 * lw, w, 0.1, { fill: C.curb });
    for (const k of [1, 2]) for (let x = x0 + 0.1; x < x0 + w - 0.3; x += 0.75) s.rect(x, y0 + k * lw - 0.02, 0.42, 0.045, { fill: C.mark });
    s.text('links', { x: x0 + w + 0.1, y: y0 + 0.3, w: 1, h: 0.4, size: 13, color: C.dim });
    s.text('Mitte', { x: x0 + w + 0.1, y: y0 + lw + 0.3, w: 1, h: 0.4, size: 13, color: C.dim });
    s.text('rechts', { x: x0 + w + 0.1, y: y0 + 2 * lw + 0.3, w: 1, h: 0.4, size: 13, color: C.dim });
    s.rect(x0, y0 + lw + 0.05, w, 2 * lw - 0.1, { fill: C.gr, ft: 75 }, { fx: 'fade', c: true, dur: 400 });
    veh(s, 'truck.png', x0 + 2.2, y0 + 2.5 * lw, 90, undefined, { scale: 0.9, anim: { fx: 'flyL', dur: 600 } });
    veh(s, 'truck.png', x0 + 4.8, y0 + 1.5 * lw, 90, undefined, { scale: 0.9, anim: { fx: 'flyL', dur: 600 } });
    s.rect(x0, y0 + 0.05, w, lw - 0.1, { fill: C.red, ft: 65 }, { fx: 'fade', c: true, dur: 400 });
    s.text('✗  Lkw über 3,5 t und Kfz mit Anhänger: nicht links', { x: x0 + 0.2, y: y0 + 0.05, w: w - 0.4, h: lw - 0.1, size: 16, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
    await point(s, 8.7, 2.05, 3.93, 1.55, 'LuSnowflake', C.bl, 'Sicht ≤ 50 m durch Schnee/Regen, Glätte', 'über 7,5 t: äußerst linke Spur tabu (80 €, 1 Punkt)', CLICK, { br: true, size: 15 });
    await point(s, 8.7, 3.75, 3.93, 1.55, 'LuEyeOff', C.or, 'Sicht unter 50 m (auch Nebel)', 'über 7,5 t: Überholverbot (120 €, 1 Punkt)', CLICK, { br: true, size: 15 });
    foot(s, '§ 7 Abs. 3c (15 €) · § 18 Abs. 11 (BKat 87a) · § 5 Abs. 3a (BKat 21)');
  }
  quiz(deck, 'ueb', {
    kicker: 'Frage · Überholen', q: 'Ihr fahrt 80 km/h, der Lkw vor euch 78 km/h. Dürft ihr überholen?', size: 32,
    opts: ['Ja, ich bin ja schneller', 'Nein – Überholen nur mit wesentlich höherer Geschwindigkeit', 'Ja, wenn ich den Blinker lange genug setze'], ok: 1,
    why: '§ 5 Abs. 2 StVO. 2 km/h Unterschied ist kein „wesentlich höher“ – das wird ein Elefantenrennen (80 €, 1 Punkt).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Rechnung zum Staunen: Bei 2 km/h Unterschied dauert das Überholen eines Sattelzugs mit Abständen rund zweieinhalb Minuten (siehe Rechenbeispiel).\n➜ „Kapitel 3: der Bahnübergang – hier geht es um Leben und Tod.“',
  });
};
