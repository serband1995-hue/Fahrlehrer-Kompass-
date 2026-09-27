// Lektion 5 · Teil 2: Rechts vor links, Einfahren, Zeichen, abknickende Vorfahrt, Kreisverkehr
const { together } = require('./drive5');
module.exports = async function (H5) {
  const { COL, SERIF, W, H, run, footer, kicker, title, chip, body, src, sign, signW, stampNum, tag, banner, smallLight, armPos, carAt, go, vanish, flash, X, R, K, Actor, add, I, pres } = H5;
  const TAGCOL = { blau: '6F9BD1', rot: 'E08892', gruen: '7FD1A3', weiss: 'E6EAF0', du: COL.orange };
  const rotv = (v, h) => { const a = h * Math.PI / 180; return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]; };
  const HD = { S: 0, W: 90, N: 180, E: 270 };
  const near = (arm, v) => { const [x, y] = armPos(arm); const o = rotv(v, HD[arm]); return [x + o[0], y + o[1]]; };

  // ---------- Quiz-Folie „Wer fährt zuerst?“ ----------
  function quiz({ round, bg = 'sc_x.jpg', cars, order, lines, answer, notes, extra }) {
    const s = add({ bg, transition: 'fade', notes });
    footer(s);
    kicker(s, `Runde ${round} von 5`, 0.8, 0.9);
    title(s, 'Wer fährt\nzuerst?', 0.75, 1.3, 5, 2.0, { size: 52 });
    s.text(lines.map((l, j) => ({ text: l, options: { breakLine: j < lines.length - 1 } })), { x: 0.8, y: 3.4, w: 4.4, h: 1.3, size: 18, color: COL.muted, lsm: 1.12 });
    if (extra) extra(s);
    const A = {};
    for (const c of cars) {
      A[c.id] = carAt(s, 'car_' + c.col + '.png', c.arm);
      const [tx, ty] = near(c.arm, [0.62, 0.35]);
      tag(s, c.id, tx, ty, TAGCOL[c.col]);
      if (c.blink) A[c.id].blink(c.blink, { auto: true });
    }
    chip(s, 'Abstimmen: ' + cars.map(c => c.id).join(' · ') + ' ?', 0.8, 4.85, 3.6, { size: 18, fill: COL.orange, color: '0A0C10' }, { fx: 'stamp', c: true, dur: 380 });
    let n = 0;
    order.forEach((grp) => {
      grp.forEach((id, j) => {
        const c = cars.find(q => q.id === id);
        const [sx, sy] = near(c.arm, [0.62, 1.0]);
        stampNum(s, grp.pos || ++n, sx, sy, { fx: 'stamp', c: j === 0 });
      });
      grp.forEach((id, j) => {
        const c = cars.find(q => q.id === id);
        go(A[id], c.move, j === 0 ? { a: true } : {}, { ext: c.ext, vanish: false });
      });
      grp.forEach((id, j) => vanish(A[id], j === 0 ? { a: true } : {}));
    });
    s.text(answer, { x: 0.8, y: 5.55, w: 5.0, h: 1.1, size: 17, color: COL.txt, lsm: 1.1, fill: '12161E', line: '2A3342', shape: pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: 8, valign: 'middle' }, { fx: 'rise', c: true, dur: 600 });
    return s;
  }

  // ================= AKT 3 · RECHTS VOR LINKS =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kapitel: Rechts vor links. Die Grundregel der Vorfahrt (§ 8 Abs. 1 StVO).
🖱 Baut sich von selbst auf.
▶ Wichtig: Sie gilt immer dann, wenn nichts anderes geregelt ist. Keine Ampel, kein Polizist, kein Vorfahrtsschild.` });
    kicker(s, 'Kapitel 1', 0.8, 1.4, { w: 11.7, align: 'center' }, { fx: 'fade', auto: true });
    title(s, 'Rechts vor links', 0.8, 1.9, 11.7, 1.6, { size: 88, align: 'center' }, { fx: 'rise', auto: true, a: true, dur: 1100 });
    s.lineS(4.4, 4.2, 8.9, 4.2, { color: COL.orange, lw: 5, endArrow: 'triangle', glow: 10 }, { fx: 'wipeR', auto: true, a: true, dur: 900 });
    s.text('Die Grundregel. Sie gilt, wenn nichts anderes geregelt ist.', { x: 0.8, y: 4.75, w: 11.7, h: 0.6, size: 24, color: COL.muted, align: 'center' }, { fx: 'fade', auto: true, a: true });
    src(s, '§ 8 Abs. 1 StVO', { x: 0.8, y: 6.4 });
  }
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
❓ Frage an die Klasse: Wo gilt rechts vor links? Erst sammeln, dann klicken.
✅ Überall, wo nichts anderes geregelt ist.
🖱 Klick 1: An Kreuzungen und Einmündungen ohne Regelung durch Schilder, Ampel oder Polizei. Auch an ganz kleinen Einmündungen.
🖱 Klick 2: In Tempo-30-Zonen gilt an Kreuzungen und Einmündungen grundsätzlich rechts vor links (§ 45 Abs. 1c StVO). Typisch für Wohngebiete, auch hier in Offenbach.
🖱 Klick 3: Das Warnzeichen 102 kündigt eine Kreuzung mit rechts vor links an. Es muss aber nicht stehen! Keine Schilder heißt: rechts vor links.
❓ Frage: Gilt rechts vor links auch für Radfahrer? ✅ Ja. Die Vorfahrtsregeln gelten für alle Fahrzeuge.` });
    footer(s);
    kicker(s, 'Wo gilt die Grundregel?', 0.8, 0.9, { color: COL.amber });
    title(s, 'Wo gilt rechts vor links?', 0.75, 1.3, 12, 1.0, { size: 44 });
    const tiles = [[I.car, 'Kreuzungen und Einmündungen', 'ohne Schild, ohne Ampel, ohne Polizei. Auch an kleinen Seitenstraßen.'],
      [I.baby, 'Tempo-30-Zonen', 'Dort gilt an Kreuzungen grundsätzlich rechts vor links (§ 45 Abs. 1c StVO).'],
      [null, 'Zeichen 102', 'kündigt rechts vor links an. Es muss aber nicht stehen.']];
    const cw = 3.7, gap = 0.3, x0 = (W - (3 * cw + 2 * gap)) / 2;
    tiles.forEach(([ic, t, d], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.7, cw, 3.7, { fill: COL.card, line: '2A3342', rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 650 });
      if (ic) s.img(ic, { x: x + 0.35, y: 3.0, w: 0.75, h: 0.75 }, { fx: 'zoom', a: true, dur: 350 });
      else sign(s, '102', x + 0.35, 2.95, 0.85, { fx: 'zoom', a: true, dur: 350 });
      s.text(t, { x: x + 0.35, y: 4.0, w: cw - 0.6, h: 0.95, font: SERIF, size: 23, bold: true }, { fx: 'fade', dur: 350 });
      s.text(d, { x: x + 0.35, y: 4.95, w: cw - 0.6, h: 1.3, size: 16, color: COL.muted }, { fx: 'fade', dur: 350 });
    });
    body(s, 'Gilt für alle Fahrzeuge, auch für Radfahrer.', 0.8, 6.6, 11.7, 0.4, { size: 17, italic: true, align: 'center' }, { fx: 'fade', c: true });
  }
  // Einmündung: die kleine Straße von rechts
  {
    const s = add({ bg: 'sc_t.jpg', transition: 'fade', notes: `
Einmündung (T-Kreuzung) ohne Schilder. Du fährst auf der durchgehenden Straße, A kommt aus der Seitenstraße von rechts und will nach links abbiegen.
❓ Frage: Wer fährt? Viele sagen: „Ich bin auf der großen Straße.“
🖱 Klick 1: ✅ A fährt zuerst, denn A kommt von rechts. Auch an Einmündungen gilt rechts vor links, egal wie klein die Straße aussieht.
🖱 Klick 2: Du fährst weiter.
Merke: Eine breitere oder besser ausgebaute Straße gibt dir keine Vorfahrt. Nur Schilder tun das.` });
    footer(s);
    kicker(s, 'Einmündung', 0.8, 0.9);
    title(s, 'Die kleine Straße\nvon rechts', 0.75, 1.3, 5, 2.0, { size: 46 });
    body(s, 'Du fährst geradeaus.\nA kommt aus der Seitenstraße und will links abbiegen. Wer fährt?', 0.8, 3.4, 4.4, 1.2, { size: 19 });
    const du = new Actor(s, 'car_du.png', 6.3, X.eb, 90, { k: X.k });
    const a = carAt(s, 'car_blau.png', 'S');
    a.blink('L', { auto: true });
    tag(s, 'A', ...near('S', [0.62, 0.35]), TAGCOL.blau);
    s.text('DU', { x: 5.95, y: X.eb + 0.45, w: 0.7, h: 0.4, size: 16, bold: true, color: COL.orange });
    banner(s, 'A zuerst: kommt von rechts!', 0.8, 4.85, 4.6, COL.orange, { fx: 'stamp', c: true });
    go(a, 'left', { a: true }, { ext: 1.6 });
    body(s, 'Größere Straße heißt nicht Vorfahrt.\nNur Schilder regeln das anders.', 0.8, 5.75, 4.4, 0.9, { size: 17, color: COL.txt }, { fx: 'fade', c: true });
    du.drive([['S', 7.5]], { a: true }); vanish(du);
  }
  // Quiz-Intro
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Das Kreuzungs-Duell. Fünf Runden, die Klasse stimmt jedes Mal per Handzeichen ab.
Tipp: In zwei Teams aufteilen (Fensterseite gegen Türseite), Punkte an die Tafel. Wer mehr Runden richtig hat, gewinnt.
🖱 1 Klick: Die Spielregel.` });
    kicker(s, 'Das Kreuzungs-Duell', 0.8, 1.5, { w: 11.7, align: 'center' }, { fx: 'fade', auto: true });
    title(s, 'Wer fährt zuerst?', 0.8, 2.0, 11.7, 1.5, { size: 80, align: 'center' }, { fx: 'stamp', auto: true, a: true, dur: 500 });
    s.text([run('5 Runden. '), run('Ihr entscheidet.', { color: COL.orange })], { x: 0.8, y: 3.7, w: 11.7, h: 0.8, font: SERIF, size: 36, italic: true, align: 'center' }, { fx: 'fade', auto: true, a: true });
    ['Situation ansehen', 'Hand hoch: A, B, C?', 'Autos fahren los'].forEach((t, i) => chip(s, t, 1.9 + i * 3.35, 5.1, 3.05, { size: 19, h: 0.65, fill: COL.card2, line: '3A4455' }, { fx: 'rise', c: i === 0, a: i > 0, dur: 450 }));
  }
  quiz({ round: 1, cars: [{ id: 'A', col: 'blau', arm: 'S', move: 'straight' }, { id: 'B', col: 'rot', arm: 'E', move: 'straight', ext: 3.6 }],
    order: [['B'], ['A']], lines: ['Keine Schilder, keine Ampel.', 'A und B wollen geradeaus.'],
    answer: 'B kommt für A von rechts. B fährt zuerst.', notes: `
Runde 1, zum Warmwerden.
🖱 Klick 1: Abstimmen. 🖱 Klick 2: B fährt (Nummer 1). 🖱 Klick 3: A fährt. 🖱 Klick 4: Begründung.
✅ B, dann A. B kommt für A von rechts.` });
  quiz({ round: 2, cars: [{ id: 'A', col: 'blau', arm: 'S', move: 'straight' }, { id: 'B', col: 'rot', arm: 'E', move: 'straight', ext: 3.6 }, { id: 'C', col: 'gruen', arm: 'W', move: 'straight', ext: 6.8 }],
    order: [['B'], ['A'], ['C']], lines: ['Keine Schilder, keine Ampel.', 'Alle wollen geradeaus.'],
    answer: 'B kommt für A von rechts, A kommt für C von rechts. Also B, A, C.', notes: `
Runde 2: drei Autos, alle geradeaus.
✅ B, dann A, dann C. Denkweg: Jeder schaut nach rechts. B hat rechts niemanden. A hat B rechts. C hat A rechts.
🖱 Klick 1: Abstimmen. 🖱 Klicks 2–4: B, A, C fahren. 🖱 Klick 5: Begründung.` });
  quiz({ round: 3, cars: [{ id: 'A', col: 'blau', arm: 'S', move: 'left', blink: 'L' }, { id: 'B', col: 'rot', arm: 'N', move: 'straight' }, { id: 'C', col: 'gruen', arm: 'E', move: 'straight', ext: 3.6 }],
    order: [['B'], ['C'], ['A']], lines: ['Keine Schilder, keine Ampel.', 'A will links abbiegen (blinkt).', 'B und C wollen geradeaus.'],
    answer: 'B kommt für C von rechts. C kommt für A von rechts. A biegt links ab und lässt den Gegenverkehr B durch.', notes: `
Runde 3: jetzt mit Linksabbieger.
✅ B, dann C, dann A.
Denkweg: B hat rechts niemanden (von B aus rechts ist links im Bild, da steht keiner). C hat B rechts. A hat C rechts und muss als Linksabbieger den Gegenverkehr B durchlassen (§ 9 Abs. 3 StVO).
🖱 Klick 1: Abstimmen. 🖱 Klicks 2–4: B, C, A. 🖱 Klick 5: Begründung.` });
  quiz({ round: 4, cars: [{ id: 'A', col: 'blau', arm: 'S', move: 'straight' }, { id: 'B', col: 'rot', arm: 'E', move: 'straight', ext: 3.6 }, { id: 'C', col: 'gruen', arm: 'N', move: 'straight' }, { id: 'D', col: 'weiss', arm: 'W', move: 'straight', ext: 6.8 }],
    order: [['A'], ['D'], ['C'], ['B']], lines: ['Keine Schilder, keine Ampel.', 'Vier Autos, alle geradeaus.'],
    answer: 'Patt! Keiner hat Vorfahrt. Verständigen: Einer verzichtet per Handzeichen (hier fährt A). Danach wieder rechts vor links: D, C, B.', notes: `
Runde 4: der Klassiker. Vier Autos, alle geradeaus. Jeder hat jemanden von rechts, also dürfte keiner fahren.
❓ Frage: Was jetzt? ✅ Verständigen. Einer verzichtet deutlich, z. B. per Handzeichen, und lässt einen anderen fahren (§ 11 Abs. 3, § 1 StVO). Auf den Verzicht darf man sich nur verlassen, wenn man sich wirklich verständigt hat.
Danach gilt wieder rechts vor links: Ist A weg, hat D rechts niemanden mehr. Dann C, dann B.
🖱 Klick 1: Abstimmen. 🖱 Klick 2: A fährt nach Verständigung. 🖱 Klicks 3–5: D, C, B. 🖱 Klick 6: Begründung.` });

  // Hineintasten
  {
    const s = add({ bg: 'sc_t.jpg', transition: 'fade', notes: `
Du kommst aus einer Nebenstraße mit Zeichen 205 und willst links abbiegen. Hecken versperren die Sicht.
▶ Wer warten muss, zeigt das früh durch mäßige Geschwindigkeit (§ 8 Abs. 2 StVO).
🖱 Klick 1: Du rollst an die Einmündung. Der Blick reicht nicht (kurze Kegel).
🖱 Klick 2: Hineintasten: ganz langsam vorrollen, bis du die Straße überblickst. Jetzt siehst du weit.
🖱 Klick 3: Ein Auto von rechts kommt. Warten.
🖱 Klick 4: Frei. Du biegst links ab.
Merke: Du darfst erst fahren, wenn du sicher bist, dass du niemanden gefährdest oder wesentlich behinderst.` });
    footer(s);
    kicker(s, 'Schlechte Sicht', 0.8, 0.9);
    title(s, 'Hineintasten', 0.75, 1.3, 5, 1.0, { size: 50 });
    body(s, 'Wer warten muss, zeigt es früh: langsam heranfahren.\nSiehst du nichts? Zentimeter für Zentimeter vorrollen, bis du alles überblickst.', 0.8, 2.4, 4.4, 1.9, { size: 18 });
    s.img('ov_hedge.png', { x: 0, y: 0, w: W, h: H });
    sign(s, '205', X.x1 + 0.05, X.y1 + 0.2, 0.5);
    const du = new Actor(s, 'car_du.png', X.nb, 6.45, 0, { k: X.k });
    du.blink('L', { auto: true });
    const b = carAt(s, 'car_rot.png', 'E', { back: 1.8 });
    du.drive([['S', 0.9]], { c: true });
    const c1 = s.img('ov_cone_short.png', { x: 0, y: 0, w: W, h: H }, { fx: 'fade', a: true, dur: 400 });
    banner(s, 'Ich sehe nichts!', 0.8, 4.6, 3.6, COL.red, { fx: 'stamp', a: true });
    du.drive([['S', 0.55]], { c: true }, { speed: 0.3 });
    s.reg(c1, { fx: 'out', dur: 300 }, 'pic');
    s.img('ov_cone_long.png', { x: 0, y: 0, w: W, h: H }, { fx: 'fade', a: true, dur: 500 });
    banner(s, 'Jetzt sehe ich alles.', 0.8, 5.35, 3.6, COL.green, { fx: 'stamp', a: true });
    b.drive([['S', 5.8]], { c: true }); vanish(b);
    du.drive([['S', 0.4375], ['T', -90, 1.3], ['S', 1.4]], { c: true }); vanish(du);
  }

  // ================= AKT 4 · EINFAHREN (§ 10) =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kapitel: Einfahren. Die Falle, in die jedes Jahr viele tappen.
🖱 1 Klick: der zweite Satz.` });
    kicker(s, 'Kapitel 2 · Einfahren', 0.8, 1.6, { w: 11.7, align: 'center' }, { fx: 'fade', auto: true });
    title(s, 'Sieht aus wie eine Straße.', 0.8, 2.2, 11.7, 1.2, { size: 60, align: 'center' }, { fx: 'fade', auto: true, a: true, dur: 1200 });
    s.text('Ist aber keine.', { x: 0.8, y: 3.5, w: 11.7, h: 1.1, font: SERIF, size: 56, bold: true, color: COL.orange, align: 'center', glow: 12, glowOp: 0.35 }, { fx: 'rise', c: true, dur: 900 });
  }
  {
    const s = add({ bg: 'sc_bord.jpg', transition: 'fade', notes: `
Zwei Autos kommen von rechts. Beide sehen ähnlich aus. Aber nur eines hat Vorfahrt.
🖱 Klick 1: Du fährst bis zur ersten Einmündung.
❓ Frage: A kommt aus einer Straße von rechts. Wer fährt? 🖱 Klick 2: ✅ A, rechts vor links. A biegt ab.
🖱 Klick 3: Du fährst weiter bis zur Hofeinfahrt.
❓ Frage: B kommt auch von rechts. Wer fährt jetzt? Abstimmen lassen!
🖱 Klick 4: ✅ Du! B kommt über einen abgesenkten Bordstein aus einem Grundstück. Wer einfährt, muss alle vorlassen und darf niemanden gefährden (§ 10 StVO). B muss auch blinken.
🖱 Klick 5: Du fährst, dann B.
Erkennungszeichen: Der Gehweg läuft durch, die Bordsteinkante ist nur abgesenkt.` });
    footer(s);
    kicker(s, 'Achtung, Falle', 0.8, 0.9);
    title(s, 'Zwei von rechts. Wer darf?', 0.75, 1.3, 7.3, 0.9, { size: 40 });
    const du = new Actor(s, 'car_du.png', 1.2, R.eb, 90, { k: R.k });
    const a = new Actor(s, 'car_blau.png', R.aX0 + 1.5 * R.L, 5.9, 0, { k: R.k });
    const b = new Actor(s, 'car_rot.png', 10.6, 6.35, 0, { k: R.k });
    a.blink('L', { auto: true }); b.blink('L', { auto: true });
    tag(s, 'A', R.aX0 + 1.5 * R.L + 0.62, 6.25, TAGCOL.blau); tag(s, 'B', 11.22, 6.7, TAGCOL.rot);
    du.drive([['G', R.aX0 - 0.975, R.eb]], { c: true });
    banner(s, 'A zuerst: rechts vor links', 8.3, 0.85, 4.3, COL.orange, { fx: 'stamp', c: true }, { size: 19 });
    s.text('Straße', { x: R.aX0 - 1.75, y: 6.6, w: 1.6, h: 0.4, size: 17, bold: true, color: COL.txt, align: 'right' }, { fx: 'fade', dur: 400 });
    a.drive([['S', 1.3625], ['T', -90, 1.3], ['S', 3.2]], { a: true }); vanish(a);
    du.drive([['G', R.bX0 - 0.975, R.eb]], { c: true });
    banner(s, 'Du zuerst! B fährt ein (§ 10)', 8.3, 1.6, 4.3, COL.green, { fx: 'stamp', c: true }, { size: 19 });
    s.text('Hofeinfahrt', { x: 11.6, y: 5.3, w: 1.6, h: 0.4, size: 17, bold: true, color: COL.txt }, { fx: 'fade', dur: 400 });
    du.drive([['S', 5]], { c: true }); vanish(du);
    b.drive([['S', 1.8125], ['T', -90, 1.3], ['S', 3.5]], { a: true }); vanish(b);
  }
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'fade', notes: `
Die Lupe auf den Bordstein.
▶ Links: normaler Bordstein, hohe Kante. Endet der Gehweg und läuft die Fahrbahn weiter, ist das eine Einmündung: rechts vor links.
▶ Rechts: abgesenkter Bordstein. Der Gehweg läuft durch. Wer da rausfährt, ist Einfahrer und muss alle vorlassen.
🖱 1 Klick: der Merksatz.` });
    footer(s);
    kicker(s, 'Die Lupe', 0.8, 0.9);
    title(s, 'Schau auf den Bordstein', 0.75, 1.3, 12, 1.0, { size: 44 });
    s.img('curb_section.png', { x: 0.8, y: 2.4, w: 11.7, h: 11.7 * 2.2 / 6 }, { fx: 'grow', auto: true, dur: 900 });
    s.text([run('Gehweg läuft durch, Kante abgesenkt: '), run('Du bist Einfahrer. Alle anderen zuerst.', { color: COL.orange, bold: true })], { x: 0.8, y: 6.55, w: 11.7, h: 0.55, font: SERIF, size: 24, align: 'center' }, { fx: 'rise', c: true });
  }
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
§ 10 StVO: Wer von hier auf die Straße fährt, muss sich so verhalten, dass eine Gefährdung anderer ausgeschlossen ist. Wenn nötig: einweisen lassen. Und: rechtzeitig und deutlich blinken.
🖱 6 Klicks, je eine Kachel: Grundstück (Parkplatz, Tankstelle, Hof, Garage) · abgesenkter Bordstein · verkehrsberuhigter Bereich · Fußgängerbereich · andere Straßenteile (z. B. Parkstreifen, Seitenstreifen) · Anfahren vom Fahrbahnrand.
🖱 Klick 7: Dazu: Wer aus einem Feld- oder Waldweg kommt, hat ebenfalls keine Vorfahrt (§ 8 Abs. 1 Satz 2 StVO).` });
    footer(s);
    kicker(s, 'Höchste Sorgfalt · § 10 StVO', 0.8, 0.9, { color: COL.amber });
    title(s, 'Wer von hier kommt, lässt alle vor', 0.75, 1.3, 12, 1.0, { size: 42 });
    const t = [[I.park, 'Grundstück', 'Parkplatz, Tankstelle, Hof, Garage'], [I.cone, 'Abgesenkter Bordstein', 'Gehweg läuft durch'], [null, 'Verkehrsberuhigter Bereich', 'beim Verlassen (Zeichen 325.2)', '325_2'],
      [null, 'Fußgängerbereich', 'z. B. Zeichen 242.1', '242_1'], [I.car, 'Andere Straßenteile', 'Parkstreifen, Seitenstreifen'], [I.refresh, 'Anfahren', 'vom Fahrbahnrand']];
    const cw = 3.75, ch = 1.55, gx = 0.225, gy = 0.25, x0 = (W - (3 * cw + 2 * gx)) / 2;
    t.forEach(([ic, a, d, sg], i) => {
      const x = x0 + (i % 3) * (cw + gx), y = 2.55 + Math.floor(i / 3) * (ch + gy);
      s.rrect(x, y, cw, ch, { fill: COL.card, line: '2A3342', rr: 0.12 }, { fx: 'zoom', c: true, dur: 400 });
      if (ic) s.img(ic, { x: x + 0.25, y: y + 0.42, w: 0.7, h: 0.7 }, { fx: 'fade', dur: 300 });
      else sign(s, sg, x + 0.2, y + 0.42, 0.55, { fx: 'fade', dur: 300 });
      s.text(a, { x: x + 1.1, y: y + 0.14, w: cw - 1.2, h: 0.72, size: 18, bold: true, valign: 'top', lsm: 0.95 }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 1.1, y: y + 0.9, w: cw - 1.2, h: 0.55, size: 15, color: COL.muted }, { fx: 'fade', dur: 300 });
    });
    s.text([run('Immer: '), run('blinken', { color: COL.orange }), run(' · niemanden gefährden · notfalls einweisen lassen')], { x: 0.8, y: 6.2, w: 11.7, h: 0.5, font: SERIF, size: 24, bold: true, align: 'center' }, { fx: 'rise', c: true });
    src(s, 'Auch wer aus einem Feld- oder Waldweg kommt, hat keine Vorfahrt (§ 8 Abs. 1 Satz 2 StVO).', { y: 6.85 });
  }
  // Verkehrsberuhigter Bereich
  {
    const s = add({ bg: 'sc_vb.jpg', transition: 'fade', notes: `
Du kommst aus einem verkehrsberuhigten Bereich (Zeichen 325.1/325.2, umgangssprachlich oft „Spielstraße“ genannt; rechtlich ist eine Spielstraße aber Zeichen 250 mit Zusatzzeichen) und willst links abbiegen.
❓ Frage: Wer fährt zuerst? ✅ Alle anderen. Rausfahren ist Einfahren nach § 10.
▶ Drinnen gilt: Schrittgeschwindigkeit, Fußgänger dürfen die ganze Straße nutzen, Kinder dürfen überall spielen (Zeichen 325.1).
▶ Rausfahren (Zeichen 325.2) ist Einfahren nach § 10: Du musst alle vorlassen. Auch den von links. Und blinken.
🖱 Klick 1: Du rollst vor bis zur Straße.
🖱 Klick 2: Auflösung, dann fahren A (von links) und B (von rechts), dann der Radfahrer.
🖱 Klick 3: Jetzt du.` });
    footer(s);
    kicker(s, 'Verkehrsberuhigter Bereich', 0.8, 0.9);
    title(s, 'Raus aus dem verkehrs-\nberuhigten Bereich. Wer darf?', 0.75, 1.3, 7.3, 0.9, { size: 30, lsm: 1.0 });
    sign(s, '325_2', R.vX1 + 0.2, R.y1 + 0.12, 0.55);
    const du = new Actor(s, 'car_du.png', (R.vX0 + R.vX1) / 2, 6.5, 0, { k: R.k });
    du.blink('L', { auto: true });
    const a = new Actor(s, 'car_blau.png', 3.3, R.eb, 90, { k: R.k });
    const b = new Actor(s, 'car_rot.png', 12.6, R.wb, 270, { k: R.k });
    const bike = new Actor(s, 'bike.png', 2.2, R.eb + 0.12, 90, { k: R.k, kind: 'bike' });
    tag(s, 'A', 3.3, R.eb + 0.7, TAGCOL.blau); tag(s, 'B', 12.6, R.wb - 0.7, TAGCOL.rot);
    du.drive([['G', (R.vX0 + R.vX1) / 2, 5.5]], { c: true });
    banner(s, 'Alle anderen zuerst! (§ 10)', 8.3, 0.85, 4.3, COL.orange, { fx: 'stamp', c: true }, { size: 19 });
    a.drive([['S', 10.5]], { a: true }); b.drive([['S', 9.2]], {}); vanish(a); vanish(b, {});
    bike.drive([['S', 11.5]], { a: true }, { speed: 2.2 }); vanish(bike);
    du.drive([['S', 0.9625], ['T', -90, 1.3], ['S', 3.0]], { c: true }); vanish(du);
  }
  // Mythos oder Fakt
  {
    const s = add({ bg: 'bg_orange.jpg', transition: 'fade', notes: `
Mythos oder Fakt? Jeweils erst abstimmen lassen, dann klicken.
1. Supermarkt-Parkplatz, rechts vor links? ✅ Meist NICHT. Der BGH hat 2022 entschieden: Auf Parkplätzen gilt rechts vor links nur, wenn die Fahrgassen eindeutig wie eine Straße wirken. Sonst gilt gegenseitige Rücksicht (§ 1 StVO). Bei Unfällen wird die Schuld dann oft geteilt. (BGH, Urteil vom 22.11.2022, VI ZR 344/21)
2. Feldweg ohne Vorfahrt? ✅ FAKT (§ 8 Abs. 1 Satz 2 StVO).
3. Tempo-30-Zone: rechts vor links? ✅ FAKT, grundsätzlich (§ 45 Abs. 1c StVO).
4. Aus der Hofeinfahrt ohne Blinker? ✅ MYTHOS. Beim Einfahren muss man blinken (§ 10 StVO).
🖱 Pro Aussage 2 Klicks: 1. Aussage gleitet herein, abstimmen lassen. 2. Stempel und Begründung.` });
    footer(s);
    kicker(s, 'Mythos oder Fakt?', 0.8, 0.9);
    title(s, 'Stimmt das?', 0.75, 1.3, 12, 1.0, { size: 46 });
    const q = [['Auf dem Supermarkt-Parkplatz gilt rechts vor links.', 'MEIST NICHT', COL.red, 'Nur wenn die Fahrgassen klar wie Straßen wirken (BGH 2022). Sonst: Rücksicht.'],
      ['Wer aus einem Feldweg kommt, hat keine Vorfahrt.', 'FAKT', COL.green, '§ 8 Abs. 1 Satz 2 StVO'],
      ['In einer Tempo-30-Zone gilt meist rechts vor links.', 'FAKT', COL.green, 'grundsätzlich, § 45 Abs. 1c StVO'],
      ['Aus der Hofeinfahrt muss ich nicht blinken.', 'MYTHOS', COL.red, 'Einfahren heißt blinken (§ 10 StVO).']];
    q.forEach(([t, st, col, why], i) => {
      const y = 2.5 + i * 1.08;
      s.rrect(0.8, y, 11.7, 0.9, { fill: COL.card, line: '2A3342', rr: 0.12 }, { fx: 'flyL', c: true, dur: 600 });
      s.text(t, { x: 1.1, y: y + 0.08, w: 5.6, h: 0.74, size: 19, bold: true, valign: 'middle' }, { fx: 'fade', dur: 400 });
      s.text(why, { x: 6.9, y: y + 0.06, w: 3.6, h: 0.78, size: 15, color: COL.muted, valign: 'middle' }, { fx: 'fade', c: true, dur: 300 });
      banner(s, st, 10.6, y + 0.16, 1.75, col, { fx: 'stamp', dur: 380 }, { size: 16, h: 0.58, rotate: -4 });
    });
  }

  await require('./build5c')(H5);
};
