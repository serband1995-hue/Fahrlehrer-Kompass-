// Lektion 5 „Grundregel, Vorfahrt und Verkehrsregelungen“ (Fahrschule Boost · Fahrlehrer Serband)
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { Deck, finalize } = require('./lib5');
const { storyboard } = require('./drive5');
const Hh = require('./h5');
const { COL, SERIF, W, H, run, footer, kicker, title, chip, body, src, sign, signW, stampNum, tag, banner, smallLight, armPos, carAt, go, vanish, flash, X, R, K, Actor, icon } = Hh;

async function build() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'Lektion 5 – Grundregel, Vorfahrt und Verkehrsregelungen';
  pres.author = 'Fahrlehrer Serband · Fahrschule Boost';
  const deck = new Deck(pres);
  const add = (o) => { const s = deck.add(o); s.bgFile = o.bg; return s; };
  const I = {};
  for (const [k, n, c] of [
    ['car', 'LuCar', COL.orange], ['alert', 'LuTriangleAlert', COL.orange], ['house', 'LuHouse', COL.orange], ['park', 'LuSquareParking', COL.orange],
    ['fuel', 'LuFuel', COL.orange], ['garage', 'LuWarehouse', COL.orange], ['feet', 'LuFootprints', COL.orange], ['tree', 'LuTreePine', COL.orange],
    ['tractor', 'LuTractor', COL.orange], ['baby', 'LuBaby', COL.orange], ['hand', 'LuHand', COL.orange], ['timer', 'LuTimer', COL.orange],
    ['eye', 'LuEye', COL.orange], ['shield', 'LuShieldCheck', COL.orange], ['siren', 'LuSiren', COL.orange], ['bike', 'LuBike', COL.orange],
    ['ped', 'LuPersonStanding', COL.orange], ['ok', 'LuCircleCheck', COL.green], ['no', 'LuCircleX', COL.red], ['cone', 'LuTrafficCone', COL.orange],
    ['pencil', 'LuPencil', COL.orange], ['note', 'LuStickyNote', COL.orange], ['pres', 'LuPresentation', COL.orange], ['ruler', 'LuRuler', COL.orange],
    ['palette', 'LuPalette', COL.orange], ['scale', 'LuScale', COL.orange], ['gavel', 'LuGavel', COL.orange], ['zap', 'LuZap', COL.orange],
    ['mapPin', 'LuMapPin', COL.orange], ['q', 'LuMessageCircleQuestion', COL.orange], ['coffee', 'LuCoffee', COL.orange], ['hands', 'LuHeartHandshake', COL.orange],
    ['refresh', 'LuRefreshCw', COL.orange], ['flash', 'LuFlashlight', COL.orange], ['users', 'LuUsers', COL.orange], ['brain', 'LuBrain', COL.orange],
    ['okW', 'LuCircleCheck', '0A0C10'], ['blueShield', 'LuShield', COL.blue], ['eyeB', 'LuEye', COL.blue], ['handB', 'LuHand', COL.blue],
  ]) I[k] = await icon(n, c);
  const H5 = { ...Hh, I, pres, deck, add };

  // ================= AKT 0 · ERÖFFNUNG =================
  // 1 · TITEL
  {
    const s = add({ bg: 'sc_title.jpg', transition: 'fade', footer: false, notes: `
Begrüßung. Heute geht es um die Frage, die an jeder Kreuzung gestellt wird: Wer fährt zuerst?
Ablauf heute (90 Minuten): Vorfahrt, rechts vor links, Einfahren, Verkehrszeichen, abknickende Vorfahrt, Kreisverkehr, Ampel, Grünpfeil, Polizei. Dazu viele Szenen zum Mitraten und eine Gruppenarbeit.
🖱 Alles baut sich von selbst auf.` });
    s.img('boost_logo.png', { x: 0.8, y: 0.7, w: 2.6, h: 2.6 * 203 / 517, name: '!!logo' }, { fx: 'fade', auto: true, dur: 900 });
    kicker(s, 'Lektion 5 · Grundstoff', 0.8, 2.75, {}, { fx: 'float', auto: true, a: true });
    title(s, 'Wer fährt\nzuerst?', 0.75, 3.15, 7, 2.6, { size: 80 }, { fx: 'rise', auto: true, a: true, dur: 1100 });
    s.text('Grundregel, Vorfahrt und Verkehrsregelungen', { x: 0.8, y: 5.75, w: 7, h: 0.45, size: 22, bold: true, color: COL.txt }, { fx: 'fade', auto: true, a: true });
    s.text('Theorieunterricht Klasse B  ·  Fahrlehrer Serband', { x: 0.8, y: 6.25, w: 7, h: 0.4, size: 18, color: COL.muted }, { fx: 'fade', auto: true });
  }

  // 2 · 124 PRO TAG
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Ruhig anfangen, Licht etwas dunkler. Die Zahl wirken lassen.
▶ Rund 124-mal am Tag stellt die Polizei bei einem Unfall mit Verletzten oder Toten fest: Hier hat jemand die Vorfahrt oder den Vorrang missachtet.
Hintergrund: 2024 waren es 45.489 solcher Fehler (Destatis, Unfälle mit Personenschaden). 45.489 ÷ 366 Tage ≈ 124.
➜ Weiterklicken: Die Zahl wandert nach oben, zwei Fakten kommen dazu.` });
    kicker(s, 'Jeden Tag in Deutschland', 0.8, 1.0, { w: 11.7, align: 'center', name: '!!k' }, { fx: 'fade', auto: true });
    s.text('124', { x: 0.8, y: 1.45, w: 11.7, h: 2.9, font: SERIF, size: 200, bold: true, color: COL.orange, align: 'center', valign: 'middle', glow: 20, glowOp: 0.35, name: '!!num' }, { fx: 'stamp', auto: true, a: true, dur: 520 });
    s.text('Mal wird bei einem Unfall mit Verletzten oder Toten\ndie Vorfahrt oder der Vorrang missachtet.', { x: 0.8, y: 4.55, w: 11.7, h: 1.2, font: SERIF, size: 30, align: 'center', lsm: 1.1, name: '!!sub' }, { fx: 'fade', auto: true, a: true, dur: 1000 });
    src(s, 'Statistisches Bundesamt (Destatis) 2024: 45.489 Vorfahrt- und Vorrangfehler bei Unfällen mit Personenschaden · ÷ 366 Tage ≈ 124', { name: '!!src', align: 'center' });
  }
  // 3 · PLATZ 2 / INNERORTS (Morph)
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'morph', dur: 1200, footer: false, notes: `
🖱 Klick 1: Platz 2. Missachtete Vorfahrt ist die zweithäufigste Ursache für Unfälle mit Personenschaden (13,4 % der Ursachen, 2024).
🖱 Klick 2: Drei von vier passieren innerorts (34.324 von 45.489). Also genau da, wo wir hier in Offenbach jeden Tag fahren.
❓ Frage: Warum gerade in der Stadt? ✅ Viele Kreuzungen, viele Regeln auf engem Raum, Ablenkung, Zeitdruck.
➜ Überleitung: Heute Abend lernt ihr, wer wann fährt, und zwar so, dass ihr es nie wieder vergesst.` });
    kicker(s, 'Jeden Tag in Deutschland', 0.8, 0.8, { name: '!!k' });
    s.text('124', { x: 0.75, y: 1.15, w: 3.2, h: 1.5, font: SERIF, size: 96, bold: true, color: COL.orange, valign: 'middle', glow: 14, glowOp: 0.3, name: '!!num' });
    s.text('Mal wird bei einem Unfall mit Verletzten oder Toten\ndie Vorfahrt oder der Vorrang missachtet.', { x: 4.0, y: 1.35, w: 8.5, h: 1.1, font: SERIF, size: 24, lsm: 1.1, valign: 'middle', name: '!!sub' });
    const cards = [['Platz 2', 'der Unfallursachen bei Unfällen mit Verletzten oder Toten', I.alert], ['3 von 4', 'dieser Fehler passieren innerorts', I.mapPin]];
    cards.forEach(([big, t, ic], i) => {
      const x = 0.8 + i * 6.0;
      s.rrect(x, 3.2, 5.7, 3.1, { fill: COL.card, line: '2A3342', rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 700 });
      s.img(ic, { x: x + 0.4, y: 3.55, w: 0.7, h: 0.7 }, { fx: 'zoom', a: true, dur: 350 });
      s.text(big, { x: x + 0.4, y: 4.3, w: 5.0, h: 1.1, font: SERIF, size: 58, bold: true, color: COL.orange }, { fx: 'fade', dur: 350 });
      s.text(t, { x: x + 0.4, y: 5.4, w: 5.0, h: 0.8, size: 20, color: COL.muted }, { fx: 'fade', dur: 350 });
    });
    src(s, 'Destatis 2024 · „Runter vom Gas“ (BMV/DVR): 45.489 Vorfahrt-/Vorrangfehler, davon 34.324 innerorts', { name: '!!src' });
  }

  // 4 · RÄTSEL DES ABENDS
  const raetsel = (s, solve) => {
    s.img('ov_abk.png', { x: 0, y: 0, w: W, h: H }, solve ? undefined : { fx: 'fade', auto: true, dur: 800 });
    sign(s, '306', X.x1 + 0.64, X.y1 + 0.2, 0.5); s.img('zz_SW.png', { x: X.x1 + 0.61, y: X.y1 + 0.74, w: 0.5 * 1.3, h: 0.5 });
    sign(s, '205', X.x1 + 0.3, X.y0 - 0.62, 0.5); sign(s, '205', X.x0 - 0.12 - signW('205', 0.5), X.y0 - 0.62, 0.5);
    const A = carAt(s, 'car_blau.png', 'S'), B = carAt(s, 'car_rot.png', 'N'), Cc = carAt(s, 'car_gruen.png', 'E');
    const [ax, ay] = armPos('S'), [bx, by] = armPos('N'), [cx, cy] = armPos('E');
    tag(s, 'A', ax + 0.62, ay + 0.35, '6F9BD1'); tag(s, 'B', bx - 0.62, by - 0.35, 'E08892'); tag(s, 'C', cx + 0.35, cy - 0.62, '7FD1A3');
    return { A, B, Cc, pos: { ax, ay, bx, by, cx, cy } };
  };
  {
    const s = add({ bg: 'sc_x.jpg', transition: 'fade', notes: `
Das Rätsel des Abends. Nur zeigen, NICHT auflösen. Die Auflösung kommt ganz am Ende.
▶ Blaues Auto A kommt von unten und will der Vorfahrtstraße nach links folgen. Rotes Auto B kommt von oben und will geradeaus. Grünes Auto C kommt von rechts und will geradeaus.
🖱 Klick 1: Abstimmen lassen, Ergebnis an die Tafel schreiben (z. B. „A–B–C: 7 Stimmen“).
➜ Sagen: Am Ende der Lektion schauen wir, wer recht hatte.
(Lösung für dich: A, dann B, dann C. A ist auf der Vorfahrtstraße. B und C sind auf Nebenstraßen, untereinander gilt rechts vor links: B kommt für C von rechts.)` });
    footer(s);
    kicker(s, 'Das Rätsel des Abends', 0.8, 0.9);
    title(s, 'Wer fährt\nzuerst?', 0.75, 1.3, 5, 2.0, { size: 52 });
    body(s, 'A folgt der Vorfahrtstraße nach links.\nB und C wollen geradeaus.', 0.8, 3.45, 4.9, 0.9, { size: 19 });
    raetsel(s, false);
    ['A · B · C ?', 'Stimmt ab!'].forEach((t, i) => chip(s, t, 0.8, 4.7 + i * 0.7, 3.2, { size: 20, fill: i ? COL.orange : COL.card2, color: i ? '0A0C10' : COL.txt, line: i ? undefined : '3A4455' }, { fx: 'rise', c: i === 0, a: i > 0, dur: 500 }));
    body(s, 'Die Auflösung gibt es am Ende der Lektion.', 0.8, 6.25, 5, 0.4, { size: 16, italic: true }, { fx: 'fade', a: true });
  }

  // ================= AKT 1 · GRUNDREGEL (kurz) =================
  {
    const s = add({ bg: 'bg_blue.jpg', transition: 'fade', notes: `
Kurz halten, nur als Fundament.
🖱 Klick 1 · § 1 Abs. 1 StVO: ständige Vorsicht und gegenseitige Rücksicht.
🖱 Klick 2 · § 1 Abs. 2 StVO: niemand darf geschädigt, gefährdet oder mehr als unvermeidbar behindert oder belästigt werden.
🖱 Klick 3 · Vertrauensgrundsatz (aus der Rechtsprechung, nicht wörtlich im Gesetz): Du darfst darauf vertrauen, dass sich andere richtig verhalten. Aber nicht, wenn du siehst, dass jemand das nicht tut. Gegenüber Kindern, Hilfsbedürftigen und älteren Menschen musst du eine Gefährdung ausschließen (§ 3 Abs. 2a StVO).
➜ Das ist der Rahmen. Jetzt geht es um die konkreten Vorfahrtsregeln.` });
    footer(s);
    kicker(s, 'Das Fundament · § 1 StVO', 0.8, 0.9, { color: COL.blue });
    title(s, 'Bevor es losgeht: zwei Sätze,\ndie über allem stehen', 0.75, 1.3, 11.5, 1.7, { size: 40 });
    const rows = [[I.eyeB, 'Vorsicht und Rücksicht', 'Ständige Vorsicht und gegenseitige Rücksicht.', '§ 1 Abs. 1'],
      [I.blueShield, 'Niemand kommt zu Schaden', 'Niemand darf geschädigt, gefährdet oder mehr als unvermeidbar behindert oder belästigt werden.', '§ 1 Abs. 2'],
      [I.handB, 'Vertrauen, aber nicht blind', 'Du darfst dich auf andere verlassen. Nicht, wenn du Fehler erkennst. Bei Kindern, Hilfsbedürftigen, Älteren: Gefährdung ausschließen.', '§ 3 Abs. 2a']];
    rows.forEach(([ic, t, d, p], i) => {
      const y = 3.25 + i * 1.2;
      s.rrect(0.8, y, 11.7, 1.02, { fill: COL.card, line: '2A3342', rr: 0.12 }, { fx: 'flyL', c: true, dur: 650 });
      s.oval(1.05, y + 0.16, 0.7, 0.7, { fill: '1E2635' }, { fx: 'fade', dur: 300 });
      s.img(ic, { x: 1.2, y: y + 0.31, w: 0.4, h: 0.4 }, { fx: 'fade', dur: 300 });
      s.text(t, { x: 2.0, y: y + 0.12, w: 3.6, h: 0.8, font: SERIF, size: 22, bold: true, valign: 'middle' }, { fx: 'fade', dur: 300 });
      s.text(d, { x: 5.6, y: y + 0.08, w: 5.4, h: 0.88, size: 16, color: COL.muted, valign: 'middle' }, { fx: 'fade', dur: 300 });
      s.text(p, { x: 11.0, y: y + 0.12, w: 1.3, h: 0.8, size: 13, bold: true, color: COL.blue, align: 'right', valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
  }
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Statement. Langsam lesen.
🖱 1 Klick: Wer Vorrang hat, muss darauf verzichten, wenn die Verkehrslage es erfordert. Und: Auf einen Verzicht darf man nur vertrauen, wenn man sich verständigt hat, z. B. per Handzeichen oder Blickkontakt (§ 11 Abs. 3 StVO).
Beispiel: Ein Kind läuft los, ein Rettungswagen kommt, jemand hat dich übersehen. Recht haben nützt dir im Krankenhaus nichts.` });
    title(s, 'Vorfahrt ist ein Recht.', 0.8, 2.0, 11.7, 1.2, { size: 64, align: 'center' }, { fx: 'fade', auto: true, dur: 1200 });
    s.text('Aber kein Freifahrtschein.', { x: 0.8, y: 3.3, w: 11.7, h: 1.0, font: SERIF, size: 48, italic: true, color: COL.orange, align: 'center', glow: 10, glowOp: 0.3 }, { fx: 'rise', auto: true, a: true, dur: 1000 });
    s.text('Wer Vorrang hat, muss darauf verzichten, wenn die Verkehrslage es erfordert.\nAuf einen Verzicht darf man sich nur verlassen, wenn man sich verständigt hat.', { x: 1.3, y: 4.9, w: 10.7, h: 1.0, size: 20, color: COL.muted, align: 'center', lsm: 1.1 }, { fx: 'fade', c: true });
    src(s, '§ 11 Abs. 3 StVO', { y: 6.4, x: 0.8 });
  }

  // ================= AKT 2 · VORFAHRT, VORRANG, RANGFOLGE =================
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Zwei Begriffe, die oft verwechselt werden.
🖱 Klick 1 · Vorfahrt: gibt es nur an Kreuzungen und Einmündungen (§ 8 StVO).
🖱 Klick 2 · Vorrang: überall sonst, wo jemand zuerst darf. Beispiele: Engstellen (Zeichen 208 und 308), Fußgänger am Zebrastreifen (§ 26), wer einfährt, muss alle anderen vorlassen (§ 10).
❓ Frage: Ein Auto parkt aus und ihr kommt angefahren. Vorfahrt oder Vorrang? ✅ Vorrang. Keine Kreuzung, sondern Einfahren (§ 10).` });
    footer(s);
    kicker(s, 'Zwei Begriffe', 0.8, 0.9, { color: COL.amber });
    title(s, 'Vorfahrt oder Vorrang?', 0.75, 1.3, 12, 1.0, { size: 46 });
    const cols = [['Vorfahrt', 'An Kreuzungen und Einmündungen.', ['Rechts vor links', 'Vorfahrt durch Verkehrszeichen', 'Ampel und Polizei regeln sie neu'], '§ 8 StVO', I.car],
      ['Vorrang', 'Überall sonst, wo einer zuerst darf.', ['Engstelle (Zeichen 208 / 308)', 'Fußgänger am Zebrastreifen (§ 26)', 'Einfahren: alle anderen zuerst (§ 10)'], 'z. B. §§ 10, 26 StVO', I.cone]];
    cols.forEach(([t, sub, list, p, ic], i) => {
      const x = 0.8 + i * 6.0;
      s.rrect(x, 2.6, 5.7, 3.9, { fill: COL.card, line: i ? '4A3B24' : COL.orange, lw: i ? 1 : 1.5, rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 650 });
      s.img(ic, { x: x + 0.4, y: 2.9, w: 0.65, h: 0.65 }, { fx: 'zoom', a: true, dur: 350 });
      s.text(t, { x: x + 1.25, y: 2.85, w: 4.2, h: 0.75, font: SERIF, size: 34, bold: true, valign: 'middle' }, { fx: 'fade', dur: 350 });
      s.text(sub, { x: x + 0.4, y: 3.75, w: 5.0, h: 0.5, size: 19, bold: true, color: COL.orange }, { fx: 'fade', dur: 350 });
      s.text(list.map((l, j) => ({ text: l, options: { bullet: { code: '25B8' }, breakLine: j < list.length - 1 } })), { x: x + 0.4, y: 4.35, w: 5.0, h: 1.6, size: 17, color: COL.txt, psa: 6 }, { fx: 'fade', dur: 350 });
      s.text(p, { x: x + 0.4, y: 5.95, w: 5.0, h: 0.35, size: 13, bold: true, color: COL.amber }, { fx: 'fade', dur: 350 });
    });
  }

  // RANGFOLGE-TURM (4 Folien, Morph)
  await require('./turm5')(H5);

  // Rest in Teil 2
  await require('./build5b')(H5);
  // Lektion 6 nach der Pause
  if (!process.env.NUR5) await require('./build6')(H5);

  if (process.env.KEYS) deck.slides.forEach((c, i) => console.log(i + 1, '|', c.key, '|', (c.tkey || '').replace(/\n/g, ' ')));
  require('./trans5')(deck);
  const out = path.join(__dirname, process.env.NUR5 ? 'Lektion05_Vorfahrt_und_Verkehrsregelungen.pptx' : 'Abend_Lektion05_06.pptx');
  await finalize(deck, out);
  console.log('Folien:', deck.slides.length, '·', (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
  if (process.env.SB) { await storyboard(deck, path.join(__dirname, 'sb')); console.log('Storyboard fertig'); }
}
build().catch(e => { console.error(e); process.exit(1); });
