// Lektion 5 · Teil 4: Ampel, Grünpfeil, Dauerlicht, Polizei, Gruppenarbeit, Finale
const { together } = require('./drive5');
module.exports = async function (H5) {
  const { COL, SERIF, W, H, run, footer, kicker, title, chip, body, src, sign, signW, stampNum, tag, banner, smallLight, armPos, carAt, go, vanish, flash, MOVES, X, K, Actor, add, I, pres } = H5;
  const TAGCOL = { blau: '6F9BD1', rot: 'E08892', gruen: '7FD1A3', weiss: 'E6EAF0' };
  const rotv = (v, h) => { const a = h * Math.PI / 180; return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]; };
  const HD = { S: 0, W: 90, N: 180, E: 270 };
  const near = (arm, v) => { const [x, y] = armPos(arm); const o = rotv(v, HD[arm]); return [x + o[0], y + o[1]]; };
  const LCOL = { r: 'FF3B30', y: 'FFB400', g: '2EE071' };
  const STOPBACK = 0.57; // Autos hinter der Haltlinie (sc_x_stop)

  // ================= AKT 8 · AMPEL =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kapitel: Ampel (Wechsellichtzeichen, § 37 StVO). Ampeln gehen Vorfahrtregeln und Vorfahrtschildern vor.
Die Ampel schaltet per Klick. Immer zuerst fragen: ❓ Was bedeutet diese Farbe? Dann mit dem nächsten Klick auflösen.
Start: Grün leuchtet. 🖱 Klick 1: ✅ „Der Verkehr ist freigegeben.“ (§ 37 Abs. 2 StVO)
🖱 Klick 2: Gelb. 🖱 Klick 3: ✅ „Vor der Kreuzung auf das nächste Zeichen warten.“ Wer nicht mehr gefahrlos halten kann, fährt zügig weiter.
🖱 Klick 4: Rot. 🖱 Klick 5: ✅ „Halt vor der Kreuzung.“
🖱 Klick 6: Rot und Gelb. 🖱 Klick 7: ✅ Gleich kommt Grün, aber noch nicht losfahren. (Für Rot + Gelb gibt es in der StVO keine eigene Anordnung, es ist nur Teil der Farbfolge.)
🖱 Klick 8: Wieder Grün, dazu die Farbfolge. Einmal laut mit der Klasse aufsagen.` });
    kicker(s, 'Kapitel 6 · Ampel', 0.8, 0.9);
    title(s, 'Was die Ampel dir sagt', 0.75, 1.3, 8, 1.0, { size: 44 });
    // große Ampel
    const hx = 9.45, hy = 0.8, hw = 1.75, hh = 5.2, lr = 1.3, lx = hx + hw / 2 - lr / 2;
    s.rect(hx + hw / 2 - 0.1, hy + hh, 0.2, H - hy - hh, { fill: '2A3140' });
    s.rrect(hx, hy, hw, hh, { fill: '0B0D12', line: '3A4252', lw: 2, rr: 0.18, shadow: true });
    const ly = { r: hy + 0.35, y: hy + 0.35 + 1.62, g: hy + 0.35 + 3.24 };
    for (const k of ['r', 'y', 'g']) s.oval(lx, ly[k], lr, lr, { fill: '181B22', line: '262B35', lw: 1 });
    const lamp = (k) => s.oval(lx, ly[k], lr, lr, { fill: LCOL[k], glow: 28, glowColor: LCOL[k], glowOp: 0.75 });
    const P = [['Grün', '„Der Verkehr ist freigegeben.“', 'Fahren. Wer abbiegt, achtet auf Gegenverkehr, Fußgänger und Radfahrer.', 'g'],
      ['Gelb', '„Vor der Kreuzung auf das nächste Zeichen warten.“', 'Kannst du nicht mehr gefahrlos anhalten, fährst du zügig weiter.', 'y'],
      ['Rot', '„Halt vor der Kreuzung.“', 'An der Haltlinie anhalten.', 'r'],
      ['Rot + Gelb', 'Gleich kommt Grün.', 'Bereit machen, aber noch nicht losfahren.', 'ry']];
    const lampN = { g: lamp('g') };
    s.reg(lampN.g, { fx: 'fade', auto: true, dur: 400 }, 'sp');
    let prev = null;
    const texts = P.map(([n, q, d, k], i) => {
      const col = k === 'g' ? '2EE071' : k === 'y' ? 'FFB400' : k === 'r' ? 'FF3B30' : 'FF8A2A';
      return [s.text(n, { x: 0.8, y: 2.6, w: 8, h: 1.2, font: SERIF, size: 72, bold: true, color: col, glow: 14, glowColor: col, glowOp: 0.35 }),
        s.text(q, { x: 0.8, y: 3.95, w: 8.2, h: 1.1, font: SERIF, size: 30, italic: true, color: COL.txt }),
        s.text(d, { x: 0.8, y: 5.15, w: 8.2, h: 0.9, size: 20, color: COL.muted })];
    });
    const nameIn = (i, trig) => s.reg(texts[i][0], { fx: 'rise', dur: 600, ...trig }, 'sp');
    const meanIn = (i) => { s.reg(texts[i][1], { fx: 'rise', c: true, dur: 600 }, 'sp'); s.reg(texts[i][2], { fx: 'fade', dur: 600, d: 250 }, 'sp'); };
    nameIn(0, { auto: true });
    meanIn(0);
    // Gelb
    s.reg(lampN.g, { fx: 'out', c: true, dur: 200 }, 'sp'); texts[0].forEach(n => s.reg(n, { fx: 'out', dur: 250 }, 'sp'));
    lampN.y = lamp('y'); s.reg(lampN.y, { fx: 'fade', dur: 250 }, 'sp'); nameIn(1, {}); meanIn(1);
    // Rot
    s.reg(lampN.y, { fx: 'out', c: true, dur: 200 }, 'sp'); texts[1].forEach(n => s.reg(n, { fx: 'out', dur: 250 }, 'sp'));
    lampN.r = lamp('r'); s.reg(lampN.r, { fx: 'fade', dur: 250 }, 'sp'); nameIn(2, {}); meanIn(2);
    // Rot + Gelb
    texts[2].forEach((n, j) => s.reg(n, { fx: 'out', dur: 250, c: j === 0 }, 'sp'));
    lampN.y2 = lamp('y'); s.reg(lampN.y2, { fx: 'fade', dur: 250 }, 'sp'); nameIn(3, {}); meanIn(3);
    // Grün + Reihenfolge
    s.reg(lampN.r, { fx: 'out', c: true, dur: 200 }, 'sp'); s.reg(lampN.y2, { fx: 'out', dur: 200 }, 'sp'); texts[3].forEach(n => s.reg(n, { fx: 'out', dur: 250 }, 'sp'));
    const g2 = lamp('g'); s.reg(g2, { fx: 'fade', dur: 250 }, 'sp');
    s.text([run('Grün', { color: '2EE071' }), run('  ›  '), run('Gelb', { color: 'FFB400' }), run('  ›  '), run('Rot', { color: 'FF3B30' }), run('  ›  '), run('Rot + Gelb', { color: 'FF8A2A' }), run('  ›  '), run('Grün', { color: '2EE071' })],
      { x: 0.8, y: 3.0, w: 8.3, h: 0.9, font: SERIF, size: 34, bold: true }, { fx: 'rise', dur: 700 });
    s.text('Ampeln gehen Vorfahrtschildern und rechts vor links vor.', { x: 0.8, y: 4.2, w: 8.3, h: 0.6, size: 20, color: COL.muted }, { fx: 'fade', a: true });
    src(s, '§ 37 Abs. 1 und 2 StVO', { y: 6.9, w: 8 });
  }
  // Gelb: Gas oder Bremse?
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Das Gelb-Dilemma. Jeder kennt es: Gelb springt an. Gas oder Bremse?
❓ Klick 1 vorher fragen: Wie lange dauert Gelb bei Tempo 50? 🖱 Klick 1: ✅ Meist 3 Sekunden (Richtlinie für Ampeln, RiLSA).
❓ Wie weit fährst du in 3 Sekunden? 🖱 Klick 2: ✅ Rund 42 Meter (50 km/h ≈ 14 m pro Sekunde).
❓ Wie lang ist dein Anhalteweg bei 50? 🖱 Klick 3: ✅ Reaktionsweg 15 m + Bremsweg 25 m = rund 40 m (Faustformel, normale Bremsung).
❓ Gas oder Bremse? 🖱 Klick 4: ✅ Grüne Zone: Weiter weg als etwa 40 m, du schaffst es: anhalten.
🖱 Klick 5: ✅ Rote Zone: Schon näher dran, du kannst nicht mehr gefahrlos halten: zügig weiterfahren. Eine Gefahrbremsung musst du nicht machen.
Merke: Wer sich an Tempo 50 hält, kommt bei Gelb in der Regel sicher raus. Wer zu schnell ist, landet in der Falle.` });
    footer(s);
    kicker(s, 'Gelb springt an', 0.8, 0.9, { color: COL.amber });
    title(s, 'Gas oder Bremse?', 0.75, 1.3, 12, 1.0, { size: 46 });
    const x0 = 11.8, m = 0.2, ry = 4.1;
    s.rect(0.8, ry, 11.7, 1.0, { fill: '1A222D' });
    s.lineS(0.8, ry + 0.5, 11.6, ry + 0.5, { color: 'D9DEE5', lw: 1.5, dash: 'dash' });
    s.rect(x0, ry, 0.07, 1.0, { fill: 'FFFFFF' });
    const lt = smallLight(s, x0 + 0.2, ry - 0.95, { w: 0.34 }); lt.lamp('y');
    const du = new Actor(s, 'car_du.png', x0 - 43 * m, ry + 0.5, 90, { k: m });
    const chips = ['Gelb bei 50 km/h: meist 3 Sekunden', '3 s × 14 m/s ≈ 42 m', 'Anhalteweg: 15 m + 25 m = 40 m'];
    chips.forEach((t, i) => chip(s, t, 0.8 + i * 3.95, 2.55, 3.75, { size: 16, h: 0.6, fill: COL.card2, line: '3A4455' }, { fx: 'rise', c: true, dur: 500 }));
    const zone = (xa, xb, col, t, d, anim) => {
      s.rect(xa, ry - 0.02, xb - xa, 1.04, { fill: col, ft: 72 }, anim);
      s.text(t, { x: xa, y: ry + 1.15, w: xb - xa, h: 0.5, size: 22, bold: true, color: col, align: 'center' }, { fx: 'fade', dur: 300 });
      s.text(d, { x: xa, y: ry + 1.6, w: xb - xa, h: 0.5, size: 16, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 300 });
    };
    zone(0.8, x0 - 40 * m, '2EE071', 'Anhalten!', 'mehr als ca. 40 m weg', { fx: 'wipeR', c: true, dur: 600 });
    zone(x0 - 40 * m, x0, 'FF4D4D', 'Zügig weiter', 'näher als ca. 40 m: kein sicherer Halt mehr', { fx: 'wipeL', c: true, dur: 600 });
    [[0, '0 m'], [40, '40 m']].forEach(([d, t]) => s.text(t, { x: x0 - d * m - 0.5, y: ry - 0.45, w: 1.0, h: 0.35, size: 15, bold: true, color: COL.muted, align: 'center' }));
    src(s, 'Gelbzeiten nach RiLSA (50 km/h: 3 s) · Faustformeln: Reaktionsweg (v/10)·3, Bremsweg (v/10)²', { y: 6.85 });
  }
  // Die 1-Sekunde-Ampel
  {
    const s = add({ bg: 'bg_redglow.jpg', transition: 'fade', notes: `
Die 1-Sekunde-Ampel. Die Zeit läuft ab dem Moment, in dem die Ampel Rot zeigt, bis du über die Haltlinie fährst.
🖱 Klick 1: Der Zähler läuft in Zeitlupe bis 1 Sekunde. Mitzählen lassen!
❓ Vor Klick 2 und 3 fragen: Was kostet das?
🖱 Klick 2: ✅ Unter 1 Sekunde: 90 € und 1 Punkt.
🖱 Klick 3: ✅ Über 1 Sekunde („qualifizierter Rotlichtverstoß“): 200 €, 2 Punkte, 1 Monat Fahrverbot.
🖱 Klick 4: In der Probezeit ist jeder Rotlichtverstoß ein A-Verstoß: Aufbauseminar, Probezeit +2 Jahre.
Mit Gefährdung oder Unfall wird es teurer, dann gibt es auch unter 1 Sekunde ein Fahrverbot.
Erinnerung: In 1 Sekunde fährst du bei 50 km/h 14 Meter.` });
    footer(s);
    kicker(s, 'Rot ist Rot', 0.8, 0.9, { color: COL.red });
    title(s, 'Die 1-Sekunde-Ampel', 0.75, 1.3, 12, 1.0, { size: 46 });
    const L = smallLight(s, 0.95, 2.4, { w: 0.68 }); L.lamp('r');
    const tx = 2.3, ty = 2.35;
    const vals = Array.from({ length: 11 }, (_, i) => (i / 10).toFixed(1).replace('.', ',') + ' s');
    const names = vals.map((v, i) => s.text(v, { x: tx, y: ty, w: 5.2, h: 1.9, font: SERIF, size: 110, bold: true, color: i === 10 ? COL.red : COL.txt, valign: 'middle', glow: i === 10 ? 18 : undefined, glowColor: COL.red, glowOp: 0.5 }));
    s.reg(names[0], { fx: 'fade', auto: true, dur: 300 }, 'sp');
    names.forEach((n, i) => {
      if (i < 10) s.reg(n, { fx: 'out', dur: 1, d: (i + 1) * 320 - 1, c: i === 0 }, 'sp');
      if (i > 0) s.reg(n, { fx: 'fade', dur: 1, d: i * 320 }, 'sp');
    });
    banner(s, 'Ab jetzt: qualifiziert', 7.9, 3.0, 4.4, COL.red, { fx: 'stamp', a: true }, { size: 22, color: 'FFFFFF' });
    const cards = [['Unter 1 Sekunde', '90 €', '1 Punkt'], ['Über 1 Sekunde', '200 €', '2 Punkte · 1 Monat Fahrverbot']];
    cards.forEach(([t, v, d], i) => {
      const x = 0.8 + i * 6.0;
      s.rrect(x, 4.55, 5.7, 1.6, { fill: COL.card, line: i ? COL.red : '3A2A2A', lw: i ? 2 : 1, rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
      s.text(t, { x: x + 0.3, y: 4.68, w: 5.1, h: 0.4, size: 17, bold: true, color: COL.muted }, { fx: 'fade', dur: 300 });
      s.text(v, { x: x + 0.3, y: 5.05, w: 2.0, h: 0.9, font: SERIF, size: 44, bold: true, color: COL.red, valign: 'middle' }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 2.3, y: 5.05, w: 3.3, h: 0.9, size: 19, bold: true, valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
    s.text([run('Probezeit: ', { bold: true, color: COL.orange }), run('jeder Rotlichtverstoß ist ein A-Verstoß → Aufbauseminar, +2 Jahre')], { x: 0.8, y: 6.3, w: 11.7, h: 0.45, size: 18 }, { fx: 'fade', c: true });
    src(s, 'Bußgeldkatalog (BKatV), Stand 2026 · § 2a StVG', { y: 6.85 });
  }
  // Linksabbiegen bei Grün
  {
    const s = add({ bg: 'sc_x_stop.jpg', transition: 'fade', notes: `
Links abbiegen an der Ampel. ❓ Frage: Grün! Was machst du? ✅ Vorfahren bis etwa zur Mitte, Gegenverkehr durchlassen, Fußgänger beachten, dann abbiegen.
🖱 Klick 1: Du fährst bei Grün in die Kreuzung vor, bis etwa zur Mitte, und wartest dort.
🖱 Klick 2: Der Gegenverkehr B fährt geradeaus. Er hat Vorrang (§ 9 Abs. 3 StVO).
🖱 Klick 3: In der Straße, in die du abbiegst, gehen Fußgänger bei Grün. Auch sie haben Vorrang.
🖱 Klick 4: Jetzt biegst du ab.
Wichtig: Wird es Rot, während du in der Kreuzung wartest, fährst du zügig raus (Kreuzung räumen). Die anderen müssen dich rauslassen.
🖱 Klick 5: Merksatz Kreuzung räumen.` });
    footer(s);
    kicker(s, 'Ampel · Abbiegen', 0.8, 0.9);
    title(s, 'Links abbiegen\nbei Grün', 0.75, 1.3, 5, 2.0, { size: 48 });
    body(s, 'Grün! Du willst links abbiegen.\nWas machst du?', 0.8, 3.4, 4.4, 1.0, { size: 19 });
    smallLight(s, X.x1 + 0.2, X.y1 + 0.55).lamp('g');
    smallLight(s, X.x0 - 0.46, X.y0 - 1.25).lamp('g');
    const du = new Actor(s, 'car_du.png', X.nb, X.y1 + 0.62 + STOPBACK + 0.2, 0, { k: X.k });
    du.blink('L', { auto: true });
    const b = new Actor(s, 'car_rot.png', X.sb, X.y0 - 0.62 - STOPBACK - 0.2, 180, { k: X.k });
    tag(s, 'B', X.sb - 0.62, X.y0 - 1.75, TAGCOL.rot);
    const ped = new Actor(s, 'ped.png', X.x0 - 0.08 - 0.21, X.y0 - 0.2, 180, { k: 0.3, kind: 'ped' });
    du.drive([['G', X.nb, 4.3]], { c: true });
    banner(s, 'Gegenverkehr zuerst', 0.8, 4.85, 3.6, COL.orange, { fx: 'stamp', c: true });
    b.drive([['S', 6.5]], { a: true }); vanish(b);
    banner(s, 'Fußgänger zuerst', 0.8, 5.55, 3.6, COL.orange, { fx: 'stamp', c: true });
    ped.drive([['S', 2.4]], { a: true }, { speed: 1.0 }); vanish(ped);
    du.drive([['T', -90, 1.0375], ['S', 1.5]], { c: true }); vanish(du);
    body(s, 'Kommt Rot, während du wartest: Kreuzung zügig räumen.', 0.8, 6.3, 4.6, 0.6, { size: 17, color: COL.txt, bold: true }, { fx: 'rise', c: true });
  }
  // Voreinander abbiegen
  {
    const s = add({ bg: 'sc_x_stop.jpg', transition: 'fade', notes: `
Zwei Linksabbieger, die sich gegenüberstehen. Wie fahren sie?
✅ Voreinander abbiegen: Jeder biegt vor dem anderen ab, ihr fahrt nicht erst aneinander vorbei (§ 9 Abs. 4 StVO). Das spart Platz und Zeit.
Nur wenn die Kreuzung es verlangt, z. B. durch Markierungen, oder die Verkehrslage es erfordert, fährt man erst aneinander vorbei und biegt dann hinter dem anderen ab.
Achtung: Der andere verdeckt dir die Sicht auf den Gegenverkehr dahinter. Also langsam und aufmerksam.
❓ Frage vorher: Wie biegen die beiden ab? Vorbei und dann hintereinander, oder voreinander?
🖱 Klick 1: Beide biegen gleichzeitig ab, Stempel. 🖱 Klick 2: Erklärung.` });
    footer(s);
    kicker(s, 'Zwei Linksabbieger', 0.8, 0.9);
    title(s, 'Voreinander\nabbiegen', 0.75, 1.3, 5, 2.0, { size: 48 });
    body(s, 'Ihr wollt beide links abbiegen.\nWie fahrt ihr?', 0.8, 3.4, 4.4, 1.0, { size: 19 });
    smallLight(s, X.x1 + 0.2, X.y1 + 0.55).lamp('g');
    smallLight(s, X.x0 - 0.46, X.y0 - 1.25).lamp('g');
    const y0 = X.y1 + 0.62 + STOPBACK + 0.2;
    const du = new Actor(s, 'car_du.png', X.nb, y0, 0, { k: X.k });
    const a = new Actor(s, 'car_blau.png', X.sb, 7.5 - y0, 180, { k: X.k });
    du.blink('L', { auto: true }); a.blink('L', { auto: true });
    tag(s, 'A', X.sb - 0.62, 7.5 - y0 - 0.35, TAGCOL.blau);
    together([[du, [['G', X.nb, 4.7], ['T', -90, 0.65], ['C', 7.9, 4.05, 7.2, X.wb, 6.6, X.wb, -90]]], [a, [['G', X.sb, 2.8], ['T', -90, 0.65], ['C', 9.3, 3.45, 10.0, X.eb, 10.6, X.eb, 90]]]], { c: true });
    vanish(du); vanish(a, {});
    banner(s, 'Voreinander!', 0.8, 4.6, 3.0, COL.green, { fx: 'stamp', a: true });
    body(s, 'Jeder biegt vor dem anderen ab.\nAchtung: Der andere verdeckt dir die Sicht auf den Gegenverkehr.', 0.8, 5.4, 4.5, 1.2, { size: 17, color: COL.txt }, { fx: 'fade', c: true });
  }
  // Grünpfeil-Test
  {
    const s = add({ bg: 'sc_x_stop.jpg', transition: 'fade', notes: `
Der Grünpfeil-Test. Deine Ampel zeigt Rot, daneben hängt das Grünpfeil-Schild (Zeichen 720). Du willst rechts abbiegen.
❓ Frage vorher: Was machst du, und in welcher Reihenfolge? Antworten sammeln, dann Schritt für Schritt auflösen.
✅ Richtige Reihenfolge:
🖱 Klick 1 · Anhalten! Immer, an der Haltlinie. Die Räder müssen stillstehen.
🖱 Klick 2 · Fußgänger in der Straße, in die du abbiegst, haben Grün. Sie gehen zuerst.
🖱 Klick 3 · Der Querverkehr von links hat Grün. Er fährt zuerst.
🖱 Klick 4 · Jetzt vorsichtig abbiegen.
Nur aus dem rechten Fahrstreifen. Niemand darf behindert oder gefährdet werden, vor allem nicht Fußgänger und Fahrzeuge, die Grün haben (§ 37 Abs. 2 StVO).` });
    footer(s);
    kicker(s, 'Rot mit Grünpfeil', 0.8, 0.9, { color: COL.green });
    title(s, 'Der Grünpfeil-\nTest', 0.75, 1.3, 5, 2.0, { size: 48 });
    body(s, 'Rot, aber Grünpfeil. Was tust du, und in welcher Reihenfolge?', 0.8, 3.35, 4.4, 0.8, { size: 18 });
    const lS = smallLight(s, X.x1 + 0.2, X.y1 + 0.55); lS.lamp('r');
    sign(s, '720', X.x1 + 0.52, X.y1 + 0.72, 0.36);
    smallLight(s, X.x0 - 0.9, X.y1 + 0.15).lamp('g');
    const du = new Actor(s, 'car_du.png', X.nb, 7.05, 0, { k: X.k });
    du.blink('R', { auto: true });
    const c = new Actor(s, 'car_rot.png', X.x0 - 0.62 - STOPBACK - 0.1, X.eb, 90, { k: X.k });
    const ped = new Actor(s, 'ped_b.png', X.x1 + 0.08 + 0.21, X.y0 - 0.45, 180, { k: 0.3, kind: 'ped' });
    du.drive([['G', X.nb, X.y1 + 0.62 + 0.1 + 0.675]], { c: true }, { speed: 1.2 });
    du.brake({ a: true });
    banner(s, '1 · Anhalten!', 0.8, 4.2, 3.4, COL.red, { fx: 'stamp' }, { size: 20, h: 0.55 });
    banner(s, '2 · Fußgänger zuerst', 0.8, 4.85, 3.4, COL.orange, { fx: 'stamp', c: true }, { size: 20, h: 0.55 });
    ped.drive([['S', 2.9]], { a: true }, { speed: 1.1 }); vanish(ped);
    banner(s, '3 · Querverkehr zuerst', 0.8, 5.5, 3.4, COL.orange, { fx: 'stamp', c: true }, { size: 20, h: 0.55 });
    c.drive([['S', 7.4]], { a: true }); vanish(c);
    banner(s, '4 · Jetzt abbiegen', 0.8, 6.15, 3.4, COL.green, { fx: 'stamp', c: true }, { size: 20, h: 0.55 });
    du.brakeOff({ a: true });
    du.drive([['G', X.nb, X.eb + 0.8], ['T', 90, 0.8], ['S', 3.2]], {}); vanish(du);
  }
  {
    const s = add({ bg: 'bg_green.jpg', transition: 'fade', notes: `
Nicht verwechseln! Jeweils erst das Bild zeigen, fragen, dann auflösen.
🖱 Klick 1: Schild erscheint. ❓ Was erlaubt es? 🖱 Klick 2: ✅ Grünpfeil-Schild (Zeichen 720), hängt neben dem roten Licht: nach dem Anhalten trotz Rot rechts abbiegen, nur aus dem rechten Fahrstreifen, wer Grün hat, geht vor.
🖱 Klick 3: Pfeil in der Ampel erscheint. ❓ Und der? 🖱 Klick 4: ✅ Grüner Pfeil als Lichtzeichen: Frei ist nur die Richtung, in die er zeigt.
🖱 Klick 5: Zeichen 721. ❓ Was ist anders? 🖱 Klick 6: ✅ Grünpfeil nur für Radfahrer (seit 2020).
🖱 Klick 7 · ✅ Bußgeld (je 1 Punkt): nicht angehalten 70 € · mit Gefährdung 100 € · mit Sachbeschädigung 120 €.` });
    footer(s);
    kicker(s, 'Nicht verwechseln', 0.8, 0.9, { color: COL.green });
    title(s, 'Schild oder Licht?', 0.75, 1.3, 12, 1.0, { size: 46 });
    s.rrect(0.8, 2.5, 5.7, 2.95, { fill: COL.card, line: '2E5A40', rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
    sign(s, '720', 1.1, 2.85, 1.2, { fx: 'zoom', dur: 400 });
    s.text('Grünpfeil-Schild', { x: 3.0, y: 2.85, w: 3.4, h: 0.5, size: 22, bold: true }, { fx: 'rise', c: true, dur: 450 });
    s.text('Zeichen 720. Bei Rot nach dem Anhalten rechts abbiegen erlaubt.', { x: 3.0, y: 3.4, w: 3.3, h: 1.1, size: 16, color: COL.muted }, { fx: 'fade', dur: 300 });
    s.text('Anhalten · rechter Fahrstreifen · Grün geht vor.', { x: 1.1, y: 4.75, w: 5.2, h: 0.5, size: 16, bold: true, color: COL.green }, { fx: 'fade', dur: 300 });
    s.rrect(6.85, 2.5, 5.7, 2.95, { fill: COL.card, line: '2A3342', rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
    s.oval(7.2, 2.85, 1.2, 1.2, { fill: '0B0D12', line: '3A4252', lw: 2 }, { fx: 'zoom', dur: 400 });
    s.shape(pres.shapes.RIGHT_ARROW, { x: 7.42, y: 3.18, w: 0.76, h: 0.54, fill: '2EE071', glow: 10, glowColor: '2EE071', glowOp: 0.7 }, { fx: 'zoom', dur: 400 });
    s.text('Grüner Pfeil als Licht', { x: 8.7, y: 2.85, w: 3.7, h: 0.5, size: 22, bold: true }, { fx: 'rise', c: true, dur: 450 });
    s.text('Leuchtet in der Ampel. Frei ist nur die Richtung, in die der Pfeil zeigt.', { x: 8.7, y: 3.4, w: 3.6, h: 1.1, size: 16, color: COL.muted }, { fx: 'fade', dur: 300 });
    sign(s, '721', 0.8, 5.75, 0.8, { fx: 'zoom', c: true, dur: 400 });
    s.text('Zeichen 721: Grünpfeil nur für Radfahrer (seit 2020).', { x: 1.55, y: 5.85, w: 4.9, h: 0.6, size: 16, color: COL.muted, valign: 'middle' }, { fx: 'rise', c: true, dur: 450 });
    s.text([run('Bußgeld, je 1 Punkt: ', { bold: true, color: COL.txt }), run('nicht angehalten 70 € · mit Gefährdung 100 € · mit Sachschaden 120 €')], { x: 6.85, y: 5.8, w: 5.7, h: 0.75, size: 16, color: COL.muted, valign: 'middle' }, { fx: 'fade', c: true });
  }
  // Stromausfall
  {
    const s = add({ bg: 'sc_x_stop.jpg', transition: 'fade', notes: `
Stromausfall! Oder nachts abgeschaltet.
🖱 Klick 1: Die Ampeln gehen aus, es blinkt nur noch Gelb.
❓ Frage: Was gilt jetzt? Viele sagen: rechts vor links.
🖱 Klick 2: ✅ Erst die Schilder! An vielen Ampelkreuzungen hängen Vorfahrtschilder mit am Mast. Die gelten, sobald die Ampel aus ist. Gelbes Blinklicht warnt nur, es regelt nichts.
Erst wenn es auch keine Schilder gibt, gilt rechts vor links.
🖱 Klick 3: Du hast 306 und fährst zuerst, dann A.` });
    footer(s);
    kicker(s, 'Ampel aus', 0.8, 0.9, { color: COL.amber });
    title(s, 'Stromausfall.\nWas gilt jetzt?', 0.75, 1.3, 5.2, 2.0, { size: 46 });
    const lS = smallLight(s, X.x1 + 0.2, X.y1 + 0.55), lE = smallLight(s, X.x1 + 0.7, X.y0 - 1.05);
    const r1 = lS.lamp('r'), g1 = lE.lamp('g');
    const s306 = sign(s, '306', X.x1 + 0.14, X.y1 + 1.35, 0.45);
    const s205 = sign(s, '205', X.x1 + 1.08, X.y0 - 1.0, 0.45);
    const du = new Actor(s, 'car_du.png', X.nb, X.y1 + 0.62 + STOPBACK + 0.2, 0, { k: X.k });
    const a = new Actor(s, 'car_blau.png', X.x1 + 0.62 + STOPBACK + 0.2, X.wb, 270, { k: X.k });
    tag(s, 'A', X.x1 + 1.45, X.wb - 0.6, TAGCOL.blau);
    s.reg(r1, { fx: 'out', c: true, dur: 300 }, 'sp'); s.reg(g1, { fx: 'out', dur: 300 }, 'sp');
    const y1 = lS.lamp('y'), y2 = lE.lamp('y');
    s.reg(y1, { fx: 'fade', dur: 200 }, 'sp'); s.reg(y2, { fx: 'fade', dur: 200 }, 'sp'); s.reg(y1, { fx: 'blink', dur: 1100 }, 'sp'); s.reg(y2, { fx: 'blink', dur: 1100 }, 'sp');
    banner(s, 'Gelbes Blinklicht: nur Warnung', 0.8, 3.55, 4.6, COL.amber, { fx: 'stamp', a: true }, { size: 19 });
    const ringS = s.oval(X.x1 + 0.14 - 0.12, X.y1 + 1.35 - 0.12, signW('306', 0.45) + 0.24, 0.69, { line: COL.orange, lw: 3, glow: 10 });
    const ringE = s.oval(X.x1 + 1.08 - 0.12, X.y0 - 1.0 - 0.12, signW('205', 0.45) + 0.24, 0.69, { line: COL.orange, lw: 3, glow: 10 });
    s.reg(ringS, { fx: 'zoom', c: true, dur: 400 }, 'sp'); s.reg(ringE, { fx: 'zoom', dur: 400 }, 'sp');
    banner(s, 'Jetzt gelten die Schilder', 0.8, 4.3, 4.6, COL.orange, { fx: 'stamp', a: true }, { size: 19 });
    body(s, 'Keine Schilder da? Dann rechts vor links.', 0.8, 5.1, 4.8, 0.5, { size: 17, italic: true }, { fx: 'fade', a: true });
    du.drive([['S', 7.0]], { c: true }); vanish(du);
    a.drive([['S', 4.3]], { a: true }); vanish(a);
    if (s306 && s205) {}
  }
  // Dauerlichtzeichen
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'fade', notes: `
Dauerlichtzeichen hängen über einzelnen Fahrstreifen, z. B. in Tunneln, auf Brücken oder Autobahnen (§ 37 Abs. 3 StVO).
Pro Signal 2 Klicks: 1. Signal erscheint, ❓ „Was bedeutet das?“ 2. Auflösung.
✅ Rotes Kreuz: Dieser Fahrstreifen ist gesperrt, nicht benutzen.
✅ Grüner Pfeil nach unten: Der Fahrstreifen ist freigegeben.
✅ Gelb blinkender Schrägpfeil: Fahrstreifen in Pfeilrichtung wechseln.` });
    footer(s);
    kicker(s, 'Dauerlichtzeichen', 0.8, 0.9);
    title(s, 'Signale über dem Fahrstreifen', 0.75, 1.3, 12, 1.0, { size: 44 });
    s.rect(0.8, 2.55, 11.7, 0.22, { fill: '2A3140' });
    const D = [['dauer_x.png', 'Gesperrt', 'Diesen Fahrstreifen nicht benutzen.', 'FF3030'], ['dauer_down.png', 'Frei', 'Der Fahrstreifen ist freigegeben.', '35E07F'], ['dauer_diag.png', 'Wechseln', 'Fahrstreifen in Pfeilrichtung wechseln. Blinkt gelb.', 'FFC21A']];
    D.forEach(([f, t, d, col], i) => {
      const x = 1.4 + i * 3.95;
      const im = s.img(f, { x: x + 0.45, y: 2.9, w: 2.0, h: 2.0 }, { fx: 'zoom', c: true, dur: 500 });
      if (i === 2) s.reg(im, { fx: 'blink', dur: 900, a: true }, 'pic');
      s.text(t, { x, y: 5.05, w: 2.9, h: 0.6, font: SERIF, size: 30, bold: true, color: col, align: 'center' }, { fx: 'rise', c: true, dur: 450 });
      s.text(d, { x: x - 0.2, y: 5.65, w: 3.3, h: 0.8, size: 16, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 300 });
    });
    src(s, 'z. B. in Tunneln, auf Brücken und Autobahnen · § 37 Abs. 3 StVO', { y: 6.85 });
  }

  // ================= AKT 9 · POLIZEI =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kapitel: Polizei. Ganz oben im Turm.
▶ Zeichen und Weisungen der Polizei gehen allen anderen Anordnungen und Regeln vor. Auch der Ampel (§ 36 Abs. 1 StVO). Deine Sorgfaltspflicht bleibt trotzdem.
🖱 1 Klick: der zweite Satz.` });
    kicker(s, 'Kapitel 7 · Polizei', 0.8, 1.6, { w: 11.7, align: 'center' }, { fx: 'fade', auto: true });
    title(s, 'Wenn die Polizei regelt,', 0.8, 2.2, 11.7, 1.2, { size: 58, align: 'center' }, { fx: 'fade', auto: true, a: true, dur: 1100 });
    s.text('hat die Ampel Pause.', { x: 0.8, y: 3.45, w: 11.7, h: 1.1, font: SERIF, size: 56, bold: true, color: COL.blue, align: 'center', glow: 12, glowColor: COL.blue, glowOp: 0.35 }, { fx: 'rise', c: true, dur: 900 });
    src(s, '§ 36 Abs. 1 StVO: Zeichen und Weisungen der Polizei gehen allen anderen Anordnungen und Regeln vor.', { y: 6.4 });
  }
  {
    const s = add({ bg: 'bg_blue.jpg', transition: 'fade', notes: `
Die Handzeichen (§ 36 Abs. 2 StVO). MITMACH-MOMENT: Mach die Zeichen vorne selbst vor. Die Klasse zeigt: Daumen hoch = fahren, flache Hand = halten.
Pro Figur 2 Klicks: 1. Figur erscheint, ❓ „Fahren oder halten?“ (Daumen/Hand zeigen lassen). 2. Auflösung.
✅ Arme seitlich ausgestreckt, du siehst Brust oder Rücken: HALT vor der Kreuzung.
✅ Du siehst die Seite: FAHREN, der Querverkehr ist freigegeben.
✅ Ein Arm hoch: Alle warten vor der Kreuzung auf das nächste Zeichen. Wer schon in der Kreuzung ist, räumt sie. Wie Gelb.
🖱 Letzter Klick · Merksatz. Dann 3–4 Mal schnell abfragen: Dreh dich, zeig ein Zeichen, Klasse reagiert.` });
    footer(s);
    kicker(s, 'Handzeichen · § 36 Abs. 2 StVO', 0.8, 0.9, { color: COL.blue });
    title(s, 'Lies den Polizisten', 0.75, 1.3, 12, 1.0, { size: 46 });
    const cw = 3.75, gap = 0.225, x0 = (W - (3 * cw + 2 * gap)) / 2;
    const C3 = [[['copf_front.png', 'copf_back.png'], 'Brust oder Rücken', 'HALT', COL.red], [['copf_side.png'], 'Seite', 'FAHREN', COL.green], [['copf_up.png'], 'Arm hoch', 'WARTEN · RÄUMEN', COL.amber]];
    C3.forEach(([imgs, t, v, col], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.45, cw, 4.0, { fill: COL.card, line: '2A3342', rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
      imgs.forEach((f, j) => { const w = 1.5, h = w * 1.4, n = imgs.length; s.img(f, { x: x + cw / 2 - (n * w + (n - 1) * 0.1) / 2 + j * (w + 0.1), y: 2.65, w, h }, { fx: 'fade', dur: 300 }); });
      s.text(t, { x, y: 4.85, w: cw, h: 0.5, font: SERIF, size: 24, bold: true, align: 'center' }, { fx: 'fade', dur: 300 });
      chip(s, v, x + 0.35, 5.5, cw - 0.7, { size: 18, fill: col, color: '0A0C10', h: 0.6 }, { fx: 'stamp', c: true, dur: 380 });
    });
    s.text('Brust und Rücken: Halt. Seite: frei. Arm hoch: wie Gelb.', { x: 0.8, y: 6.6, w: 11.7, h: 0.5, font: SERIF, size: 24, bold: true, color: COL.blue, align: 'center' }, { fx: 'rise', c: true });
  }
  {
    const s = add({ bg: 'sc_x.jpg', transition: 'fade', notes: `
Der Polizist auf der Kreuzung. Er schaut nach oben, die Arme zeigen nach links und rechts.
❓ Frage: Wer darf fahren? ✅ A und C sehen seine Seite: Sie fahren. Du und B seht Brust oder Rücken: Ihr haltet.
🖱 Klick 1: A und C fahren.
🖱 Klick 2: Der Polizist dreht sich um 90 Grad.
❓ Frage: Und jetzt? ✅ Jetzt sehen du und B die Seite.
🖱 Klick 3: Du und B fahrt.` });
    footer(s);
    kicker(s, 'Polizei auf der Kreuzung', 0.8, 0.9, { color: COL.blue });
    title(s, 'Wer darf\nfahren?', 0.75, 1.3, 5, 2.0, { size: 52 });
    body(s, 'Die Arme zeigen nach links und rechts.\nWer sieht Brust oder Rücken? Wer die Seite?', 0.8, 3.4, 4.4, 1.2, { size: 18 });
    s.oval(X.cx - 0.5, X.cy - 0.5, 1.0, 1.0, { fill: '5B8CFF', ft: 80, glow: 18, glowColor: '5B8CFF', glowOp: 0.5 });
    const cop = new Actor(s, 'cop_out.png', X.cx, X.cy, 0, { kind: 'cop', k: 0.3 });
    const du = carAt(s, 'car_du.png', 'S'), a = carAt(s, 'car_blau.png', 'E'), b = carAt(s, 'car_rot.png', 'N'), c = carAt(s, 'car_gruen.png', 'W');
    tag(s, 'A', ...near('E', [0.62, 0.35]), TAGCOL.blau); tag(s, 'B', ...near('N', [0.62, 0.35]), TAGCOL.rot); tag(s, 'C', ...near('W', [0.62, 0.35]), TAGCOL.gruen);
    banner(s, 'A und C sehen die Seite', 0.8, 4.85, 4.3, COL.green, { fx: 'stamp', c: true }, { size: 19 });
    together([[a, [['S', 3.6]]], [c, [['S', 6.8]]]], { a: true }); vanish(a); vanish(c, {});
    cop.turn(90, { c: true }, 1200);
    banner(s, 'Jetzt du und B', 0.8, 5.6, 4.3, COL.green, { fx: 'stamp', c: true }, { size: 19 });
    together([[du, [['S', 5.2]]], [b, [['S', 5.8]]]], { a: true }); vanish(du); vanish(b, {});
  }
  {
    const s = add({ bg: 'bg_blue.jpg', transition: 'fade', notes: `
Die Polizei darf dich zur Verkehrskontrolle anhalten (§ 36 Abs. 5 StVO). Das Zeichen dazu: Winkerkelle, rote Leuchte oder Anzeige am Streifenwagen („Stop Polizei“, „Bitte folgen“). So kann auch ein Auto vor dir angehalten werden.
Was tun? Blinken, rechts ran, anhalten, Anweisungen befolgen. Führerschein und Fahrzeugschein dabeihaben.
🖱 3 Klicks, je ein Zeichen.` });
    footer(s);
    kicker(s, 'Verkehrskontrolle', 0.8, 0.9, { color: COL.blue });
    title(s, 'So hält dich die Polizei an', 0.75, 1.3, 12, 1.0, { size: 44 });
    const cw = 3.75, gap = 0.225, x0 = (W - (3 * cw + 2 * gap)) / 2;
    [0, 1, 2].forEach(i => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.5, cw, 3.3, { fill: COL.card, line: '2A3342', rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
      if (i === 0) { s.rect(x + cw / 2 - 0.05, 3.6, 0.1, 0.55, { fill: '5B6474' }, { fx: 'fade', dur: 300 }); s.oval(x + cw / 2 - 0.55, 2.7, 1.1, 1.1, { fill: 'D32F2F', line: 'FFFFFF', lw: 6 }, { fx: 'fade', dur: 300 }); s.oval(x + cw / 2 - 0.3, 2.95, 0.6, 0.6, { fill: 'FFFFFF' }, { fx: 'fade', dur: 300 }); }
      if (i === 1) s.oval(x + cw / 2 - 0.55, 2.8, 1.1, 1.1, { fill: 'FF2E2E', glow: 24, glowColor: 'FF2E2E', glowOp: 0.8 }, { fx: 'fade', dur: 300 });
      if (i === 2) s.text('STOP\nPOLIZEI', { x: x + 0.5, y: 2.75, w: cw - 1.0, h: 1.3, size: 30, bold: true, color: 'FF3030', fill: '0A0A0A', align: 'center', valign: 'middle', glow: 8, glowColor: 'FF3030', glowOp: 0.6, shape: pres.shapes.ROUNDED_RECTANGLE, rr: 0.1 }, { fx: 'fade', dur: 300 });
      s.text(['Winkerkelle', 'Rote Leuchte', 'Anzeige am Streifenwagen'][i], { x: x + 0.2, y: 4.3, w: cw - 0.4, h: 0.5, size: 21, bold: true, align: 'center' }, { fx: 'fade', dur: 300 });
      s.text(['aus der Hand oder aus dem Auto', 'auch aus dem fahrenden Auto', '„Stop Polizei“ oder „Bitte folgen“'][i], { x: x + 0.2, y: 4.85, w: cw - 0.4, h: 0.7, size: 16, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 300 });
    });
    s.text('Blinken, rechts ran, anhalten. Führerschein und Fahrzeugschein dabeihaben.', { x: 0.8, y: 6.1, w: 11.7, h: 0.5, font: SERIF, size: 22, bold: true, color: COL.blue, align: 'center' }, { fx: 'fade', c: true });
    src(s, '§ 36 Abs. 5 StVO', { y: 6.85 });
  }

  // Gruppenarbeit: am Abend 5+6 in Lektion 6 (siehe build6.js)
  // ================= AKT 11 · FINALE =================
  {
    const s = add({ bg: 'sc_x.jpg', transition: 'fade', notes: `
Zurück zum Rätsel vom Anfang. Tafel mit der Abstimmung zeigen: Wer lag richtig?
🖱 Klick 1: A fährt zuerst. A ist auf der Vorfahrtstraße und folgt dem Knick (mit Blinker).
🖱 Klick 2: B fährt. B und C sind auf Nebenstraßen, untereinander gilt rechts vor links. B kommt für C von rechts.
🖱 Klick 3: C fährt.
🖱 Klick 4: Begründung. Kurz loben, wer es am Anfang schon richtig hatte.` });
    footer(s);
    kicker(s, 'Das Rätsel des Abends', 0.8, 0.9);
    title(s, 'Die Auflösung', 0.75, 1.3, 5, 1.0, { size: 50 });
    s.img('ov_abk.png', { x: 0, y: 0, w: W, h: H });
    sign(s, '306', X.x1 + 0.64, X.y1 + 0.2, 0.5); s.img('zz_SW.png', { x: X.x1 + 0.61, y: X.y1 + 0.74, w: 0.65, h: 0.5 });
    sign(s, '205', X.x1 + 0.3, X.y0 - 0.62, 0.5); sign(s, '205', X.x0 - 0.12 - signW('205', 0.5), X.y0 - 0.62, 0.5);
    const A = carAt(s, 'car_blau.png', 'S'), B = carAt(s, 'car_rot.png', 'N'), Cc = carAt(s, 'car_gruen.png', 'E');
    A.blink('L', { auto: true });
    tag(s, 'A', ...near('S', [0.62, 0.35]), TAGCOL.blau); tag(s, 'B', ...near('N', [0.62, 0.35]), TAGCOL.rot); tag(s, 'C', ...near('E', [0.62, 0.35]), TAGCOL.gruen);
    stampNum(s, 1, ...near('S', [0.62, 1.0]), { fx: 'stamp', c: true }); go(A, 'left', { a: true });
    stampNum(s, 2, ...near('N', [0.62, 1.0]), { fx: 'stamp', c: true }); go(B, 'straight', { a: true });
    stampNum(s, 3, ...near('E', [0.62, 1.0]), { fx: 'stamp', c: true }); go(Cc, 'straight', { a: true }, { ext: 3.6 });
    s.text('A ist auf der Vorfahrtstraße. B und C sind auf Nebenstraßen: rechts vor links, B kommt für C von rechts.', { x: 0.8, y: 2.6, w: 5.0, h: 1.3, size: 18, color: COL.txt, lsm: 1.1, fill: '12161E', line: '2A3342', shape: pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: 8, valign: 'middle' }, { fx: 'rise', c: true, dur: 600 });
    chip(s, 'A · B · C', 0.8, 4.2, 2.6, { size: 24, fill: COL.orange, color: '0A0C10', h: 0.7 }, { fx: 'stamp', a: true });
  }
  {
    const s = add({ bg: 'bg_bokeh.jpg', transition: 'fade', notes: `
Die Merksätze des Abends. Einzeln einblenden und von der Klasse ergänzen lassen, bevor du klickst („Rechts vor links gilt, wenn …?“).
🖱 6 Klicks.` });
    footer(s);
    kicker(s, 'Zum Mitnehmen', 0.8, 0.9);
    title(s, 'Sechs Sätze für die Kreuzung', 0.75, 1.3, 12, 1.0, { size: 44 });
    const M = [['Polizei › Ampel › Schild › rechts vor links.', I.shield], ['Rechts vor links gilt, wenn nichts anderes geregelt ist.', I.car],
      ['Wer einfährt, lässt alle vor und blinkt.', I.park], ['Abknickende Vorfahrt: Wer dem Knick folgt, blinkt.', I.refresh],
      ['Kreisverkehr: rein ohne, raus mit Blinker.', I.cone], ['Grünpfeil: erst anhalten, dann alle mit Grün vorlassen.', I.ok]];
    M.forEach(([t, ic], i) => {
      const x = 0.8 + (i % 2) * 6.0, y = 2.55 + Math.floor(i / 2) * 1.3;
      s.rrect(x, y, 5.7, 1.1, { fill: COL.card, line: '3A4455', rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 500 });
      s.img(ic, { x: x + 0.3, y: y + 0.27, w: 0.56, h: 0.56 }, { fx: 'zoom', dur: 300 });
      s.text(t, { x: x + 1.1, y: y + 0.08, w: 4.45, h: 0.94, size: 19, bold: true, valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
  }
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Schlusssatz. Langsam, dann Pause.
▶ Das Schild heißt „Vorfahrt gewähren“. Nicht „Vorfahrt nehmen“. Vorfahrt ist etwas, das dir ein anderer lässt. Verlass dich nie blind darauf.
🖱 1 Klick: zweiter Satz.
➜ Überleitung zur Pause.` });
    title(s, 'Vorfahrt wird gewährt.', 0.8, 2.3, 11.7, 1.2, { size: 64, align: 'center' }, { fx: 'fade', auto: true, dur: 1400 });
    s.text('Nicht genommen.', { x: 0.8, y: 3.7, w: 11.7, h: 1.2, font: SERIF, size: 60, bold: true, color: COL.orange, align: 'center', glow: 14, glowOp: 0.35 }, { fx: 'fade', c: true, dur: 1400 });
  }
  {
    const s = add({ bg: 'bg_bokeh.jpg', transition: 'fade', footer: false, notes: `
Pause nach 90 Minuten. Fenster auf, kurz bewegen, Handys dürfen raus.
Tipp: Die Pausenfolie stehen lassen, dann sehen alle, wann es weitergeht.
Nach der Pause geht es direkt weiter mit Lektion 6 (Verkehrszeichen, Verkehrseinrichtungen und Bahnübergänge).` });
    s.img(I.coffee, { x: W / 2 - 0.6, y: 1.3, w: 1.2, h: 1.2 }, { fx: 'zoom', auto: true, dur: 700 });
    title(s, '15 Minuten Pause', 0.8, 2.65, 11.7, 1.4, { size: 80, align: 'center' }, { fx: 'rise', auto: true, a: true, dur: 900 });
    s.text('Es geht gleich weiter.', { x: 0.8, y: 4.15, w: 11.7, h: 0.8, font: SERIF, size: 40, italic: true, color: COL.orange, align: 'center', glow: 10, glowOp: 0.3 }, { fx: 'fade', auto: true, a: true, dur: 900 });
    s.text('Danach: Lektion 6 · Verkehrszeichen, Verkehrseinrichtungen und Bahnübergänge', { x: 0.8, y: 5.35, w: 11.7, h: 0.5, size: 20, color: COL.muted, align: 'center' }, { fx: 'fade', auto: true, a: true });
  }
};
