// Lektion 6 „Verkehrszeichen, Verkehrseinrichtungen und Bahnübergänge“ (Abend 5+6, nach der Pause)
const fs = require('fs');
const path = require('path');
const { together } = require('./drive5');
const SIGN = JSON.parse(fs.readFileSync(path.join(__dirname, 'art', 'signs.json')));
module.exports = async function (H5) {
  const { COL, SERIF, W, H, run, footer, kicker, title, chip, body, src, sign, signW, stampNum, tag, banner, smallLight, Actor, vanish, add, I, pres } = H5;
  const { G } = require('./art6');
  const vimg = (s, name, x, y, h, anim, o = {}) => s.img(name + '.png', { x, y, w: h * (SIGN[name] || 1), h, name: o.name, alt: o.alt }, anim);
  const vw = (name, h) => h * (SIGN[name] || 1);
  const cap = (s, t, x, y, w, anim, o = {}) => s.text(t, { x, y, w, h: o.h || 0.7, size: o.size || 16, bold: o.bold ?? true, color: o.color || COL.txt, align: o.align || 'center', valign: 'top', lsm: 1.0 }, anim);
  const ans = (s, t, x, y, w, anim, o = {}) => s.text(t, { x, y, w, h: o.h || 0.8, size: o.size || 15, color: o.color || COL.orange, bold: true, align: o.align || 'center', valign: 'top', lsm: 1.0 }, anim || { fx: 'rise', c: true, dur: 450 });
  const I6 = {};
  for (const [k, n, c] of [['warn', 'LuTriangleAlert', COL.red], ['train', 'LuTrainFront', COL.orange], ['phone', 'LuPhoneCall', COL.orange], ['run', 'LuPersonStanding', COL.orange], ['hand', 'LuHand', COL.orange], ['ear', 'LuEar', COL.orange], ['light', 'LuSiren', COL.orange], ['bar', 'LuConstruction', COL.orange], ['engine', 'LuLeaf', COL.green], ['push', 'LuMoveRight', COL.orange], ['eye', 'LuEye', COL.orange], ['book', 'LuBookOpen', COL.orange], ['sign', 'LuSignpost', COL.orange], ['fog', 'LuCloudFog', COL.orange]]) {
    try { I6[k] = await H5.icon(n, c); } catch (e) { I6[k] = I.alert; }
  }
  const LANE = (y0) => ({ s: y0 + 1.5 * G.L, n: y0 + 0.5 * G.L });
  // Spurwechsel mit leichtem Lenkwinkel (zwei Bézier-Stücke)
  const laneChange = (x, yA, yB, len = 1.3) => {
    const dy = yB - yA, sgn = Math.sign(dy), mid = [x + len / 2, (yA + yB) / 2], a = 90 + sgn * 22, d = [Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180)];
    return [['C', x + len * 0.25, yA, mid[0] - 0.25 * d[0], mid[1] - 0.25 * d[1], mid[0], mid[1], a], ['C', mid[0] + 0.25 * d[0], mid[1] + 0.25 * d[1], x + len * 0.75, yB, x + len, yB, 90]];
  };

  // ================= TITEL =================
  {
    const s = add({ bg: 'bg_schilder.jpg', transition: 'black', footer: false, notes: `
Willkommen zurück aus der Pause. Zweite Hälfte des Abends: Lektion 6.
▶ Heute lernt ihr, die Straße zu lesen: Schilder, Linien, Baken, Leitpfosten und den Bahnübergang.
Am Ende gibt es eine Gruppenarbeit mit Plakaten.
🖱 Alles baut sich von selbst auf.` });
    s.img('boost_logo.png', { x: 0.8, y: 0.7, w: 2.6, h: 2.6 * 203 / 517 }, { fx: 'fade', auto: true, dur: 900 });
    kicker(s, 'Lektion 6 · Grundstoff', 0.8, 2.75, {}, { fx: 'float', auto: true, a: true });
    title(s, 'Lesen, was\ndie Straße sagt', 0.75, 3.15, 7.5, 2.6, { size: 72 }, { fx: 'rise', auto: true, a: true, dur: 1100 });
    s.text('Verkehrszeichen, Verkehrseinrichtungen und Bahnübergänge', { x: 0.8, y: 5.75, w: 7.5, h: 0.45, size: 21, bold: true }, { fx: 'fade', auto: true, a: true });
    s.text('Theorieunterricht Klasse B  ·  Fahrlehrer Serband', { x: 0.8, y: 6.25, w: 7, h: 0.4, size: 18, color: COL.muted }, { fx: 'fade', auto: true });
  }
  // ================= BLITZ-TEST =================
  const BL = [['142_10', 'Wildwechsel'], ['267', 'Verbot der Einfahrt'], ['276', 'Überholverbot'], ['350_10', 'Fußgängerüberweg'], ['136_10', 'Kinder'], ['357', 'Sackgasse']];
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Der Blitz-Test. Wach werden nach der Pause!
▶ Sagen: „Jedes Schild ist nur eine Sekunde zu sehen. Ruft laut, was es bedeutet.“
🖱 Klick 1: Sechs Schilder blitzen nacheinander auf (je gut 1 Sekunde).
🖱 Klick 2: Alle sechs nebeneinander. Fragen: Welche waren schwer?
🖱 Klick 3: ✅ Auflösung: Wildwechsel · Verbot der Einfahrt · Überholverbot · Fußgängerüberweg · Kinder · Sackgasse.
▶ Pointe: Auf der Straße hast du oft auch nur eine Sekunde. Darum lernt man Schilder nicht auswendig, man lernt sie zu lesen.` });
    kicker(s, 'Der Blitz-Test', 0.8, 0.8, { w: 11.7, align: 'center' });
    title(s, 'Eine Sekunde pro Schild.', 0.8, 1.2, 11.7, 1.0, { size: 48, align: 'center' });
    body(s, 'Ruft laut, was es bedeutet!', 0.8, 2.15, 11.7, 0.5, { size: 22, align: 'center', color: COL.orange, italic: true });
    const hs = 3.0;
    BL.forEach(([id], i) => {
      const w = signW(id, hs), n = sign(s, id, W / 2 - w / 2, 2.95, hs);
      s.reg(n, { fx: 'zoom', dur: 180, d: i * 1400, c: i === 0 }, 'pic');
      s.reg(n, { fx: 'out', dur: 150, d: i * 1400 + 1150 }, 'pic');
    });
    const hs2 = 1.35, gap = 0.45, tw = BL.reduce((a, [id]) => a + Math.max(1.5, signW(id, hs2)), 0) + gap * 5;
    let x = (W - tw) / 2;
    BL.forEach(([id, t], i) => {
      const cw = Math.max(1.5, signW(id, hs2)), w = signW(id, hs2);
      sign(s, id, x + (cw - w) / 2, 3.2, hs2, { fx: 'rise', c: i === 0, dur: 500, d: i * 90 });
      ans(s, t, x - 0.2, 4.75, cw + 0.4, i === 0 ? { fx: 'rise', c: true, dur: 450 } : { fx: 'rise', dur: 450, d: i * 90 }, { size: 17 });
      x += cw + gap;
    });
  }
  // ================= STATEMENT =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kernbotschaft der Lektion. Langsam sprechen.
🖱 1 Klick: der zweite Satz.
▶ Über 600 Zeichen auswendig lernen? Keine Chance. Aber jedes Zeichen verrät durch Form und Farbe, was es will.` });
    title(s, 'Du musst sie nicht auswendig lernen.', 0.8, 2.2, 11.7, 1.2, { size: 50, align: 'center' }, { fx: 'fade', auto: true, dur: 1200 });
    s.text('Du musst sie lesen können.', { x: 0.8, y: 3.55, w: 11.7, h: 1.1, font: SERIF, size: 52, bold: true, color: COL.orange, align: 'center', glow: 12, glowOp: 0.35 }, { fx: 'rise', c: true, dur: 1000 });
  }
  // ================= FORMEN =================
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Die Sprache der Formen. Zu jeder Form zuerst fragen: ❓ Was will mir diese Form sagen?
🖱 Klick 1: ✅ Dreieck = Gefahrzeichen (§ 40 StVO): Achtung, Gefahr! Aufmerksam sein, Tempo runter.
🖱 Klick 2: ✅ Kreis = Vorschriftzeichen (§ 41 StVO): Blau = Gebot (du musst), rot umrandet = Verbot (du darfst nicht).
🖱 Klick 3: ✅ Rechteck = Richtzeichen (§ 42 StVO): Hinweise, z. B. Autobahn, Sackgasse. Können auch Anordnungen enthalten.
🖱 Klick 4: Zusatzzeichen: weiß, rechteckig, hängen darunter und gelten nur für dieses Zeichen.
▶ Die Ausnahmen kennt ihr schon aus Lektion 5: 205 (Dreieck auf der Spitze), 206 (Achteck), 306 (Raute). Dazu das Andreaskreuz (201), ein Vorschriftzeichen.` });
    footer(s);
    kicker(s, 'Die Logik der Schilder', 0.8, 0.9, { color: COL.amber });
    title(s, 'Die Form verrät, was es will', 0.75, 1.3, 12, 1.0, { size: 44 });
    const cols = [['Dreieck', '142_10', 'Gefahrzeichen', 'Achtung, Gefahr!\nAufmerksam sein, Tempo runter.', '§ 40'], ['Kreis', '274_70', 'Vorschriftzeichen', 'Blau: Gebot, du musst.\nRot umrandet: Verbot.', '§ 41'], ['Rechteck', '357', 'Richtzeichen', 'Hinweise und Infos.\nManchmal auch Anordnungen.', '§ 42']];
    const cw = 3.75, gap = 0.225, x0 = (W - (3 * cw + 2 * gap)) / 2;
    cols.forEach(([form, id, t, d, p], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.5, cw, 3.55, { fill: COL.card, line: '2A3342', rr: 0.14, shadow: true });
      s.text(form, { x, y: 2.65, w: cw, h: 0.45, size: 18, bold: true, cs: 3, color: COL.muted, align: 'center' });
      const sw = signW(id, 1.2); sign(s, id, x + cw / 2 - sw / 2, 3.15, 1.2);
      s.text(t, { x, y: 4.5, w: cw, h: 0.5, font: SERIF, size: 23, bold: true, align: 'center' }, { fx: 'rise', c: true, dur: 450 });
      s.text(d, { x: x + 0.2, y: 5.0, w: cw - 0.4, h: 0.8, size: 16, color: COL.orange, bold: true, align: 'center' }, { fx: 'fade', dur: 450 });
      s.text(p, { x, y: 5.72, w: cw, h: 0.3, size: 13, color: COL.amber, bold: true, align: 'center' }, { fx: 'fade', dur: 450 });
    });
    sign(s, '1053_35', 0.8, 6.15, 0.75, { fx: 'zoom', c: true, dur: 400 });
    s.text('Zusatzzeichen: weiß, eckig, darunter. Gilt nur für das Zeichen darüber.', { x: 1.8, y: 6.3, w: 10, h: 0.45, size: 18, bold: true, valign: 'middle' }, { fx: 'fade', dur: 400 });
  }
  // ================= SORTIER-SPIEL =================
  {
    const s = add({ bg: 'bg_center.jpg', transition: 'fade', notes: `
Das Sortier-Spiel. Vor jedem Klick die Klasse rufen lassen: ❓ Gefahr, Vorschrift oder Richtung?
🖱 9 Klicks, je ein Schild fliegt in seine Kiste.
✅ 1 Wildwechsel → Gefahrzeichen · 2 Tempo 70 → Vorschriftzeichen · 3 Autobahn → Richtzeichen · 4 Radfahrer → Gefahrzeichen · 5 Verbot der Einfahrt → Vorschriftzeichen · 6 Sackgasse → Richtzeichen · 7 Gefälle → Gefahrzeichen · 8 Radweg → Vorschriftzeichen (Gebot) · 9 Verkehrsberuhigter Bereich → Richtzeichen.
▶ Wer alle neun richtig hatte, hat die Logik verstanden.` });
    footer(s);
    kicker(s, 'Sortier-Spiel', 0.8, 0.9);
    title(s, 'Wohin gehört es?', 0.75, 1.3, 12, 1.0, { size: 44 });
    const L = [['142_10', 0], ['274_70', 1], ['330_1', 2], ['138_10', 0], ['267', 1], ['357', 2], ['108_10', 0], ['237', 1], ['325_1', 2]];
    const bins = ['Gefahrzeichen', 'Vorschriftzeichen', 'Richtzeichen'], bw = 3.75, bg = 0.225, bx0 = (W - (3 * bw + 2 * bg)) / 2, by = 4.15;
    bins.forEach((b, i) => {
      const x = bx0 + i * (bw + bg);
      s.rrect(x, by, bw, 2.55, { fill: '10141B', line: [COL.red, COL.blue, '4A9B6E'][i], lw: 2, rr: 0.14 });
      s.text(b, { x, y: by + 0.12, w: bw, h: 0.45, font: SERIF, size: 21, bold: true, align: 'center', color: [COL.red, '8FB3FF', '7FD1A3'][i] });
    });
    const hs = 0.95, slotW = 1.2, rowY = 2.55, rowW = L.reduce((a, [id]) => a + Math.max(0.95, signW(id, hs)) + 0.3, -0.3);
    let rx = (W - rowW) / 2;
    const cnt = [0, 0, 0];
    L.forEach(([id, b], i) => {
      const w = signW(id, hs), cw = Math.max(0.95, w), x = rx + (cw - w) / 2;
      const n = sign(s, id, x, rowY, hs);
      const k = cnt[b]++, tx = bx0 + b * (bw + bg) + 0.2 + k * slotW + (slotW - w) / 2, ty = by + 0.95;
      s.reg(n, { fx: 'move', c: true, dur: 900, path: `M 0 0 C 0 ${(-0.4 / H).toFixed(4)} ${((tx - x) / W).toFixed(4)} ${((ty - rowY - 0.8) / H).toFixed(4)} ${((tx - x) / W).toFixed(4)} ${((ty - rowY) / H).toFixed(4)} E` }, 'pic');
      rx += cw + 0.3;
    });
  }
  // ================= GEFAHRZEICHEN: ABSTAND =================
  {
    const s = add({ bg: 'bg_red.jpg', transition: 'fade', notes: `
Gefahrzeichen: Wo stehen sie, und was tue ich?
❓ Klick 1 vorher fragen: Wie weit vor der Gefahr steht das Schild außerorts? 🖱 Klick 1: ✅ Im Allgemeinen 150 bis 250 m vorher (§ 40 Abs. 2 StVO).
❓ Und innerorts? 🖱 Klick 2: ✅ Im Allgemeinen kurz vor der Gefahrstelle (§ 40 Abs. 3).
🖱 Klick 3: Steht das Schild deutlich näher an der Gefahr, zeigt ein Zusatzzeichen die Entfernung, z. B. „100 m“. Eine lange Gefahrstrecke zeigt „800 m“ mit Pfeilen (§ 40 Abs. 2 und 4).
❓ Was tust du? 🖱 Klick 4: ✅ Gefahrzeichen mahnen zu erhöhter Aufmerksamkeit, vor allem Tempo verringern (§ 40 Abs. 1 StVO). Also: Fuß vom Gas, bremsbereit.` });
    footer(s);
    kicker(s, 'Gefahrzeichen', 0.8, 0.9, { color: COL.red });
    title(s, 'Wo steht es? Was tust du?', 0.75, 1.3, 12, 1.0, { size: 44 });
    const ry = 3.3;
    s.rect(0.8, ry, 11.7, 0.7, { fill: '1A222D' });
    s.lineS(0.8, ry + 0.35, 12.5, ry + 0.35, { color: 'D9DEE5', lw: 1.5, dash: 'dash' });
    sign(s, '142_10', 1.5, ry + 0.8, 0.95);
    s.img(I.alert, { x: 10.9, y: ry - 0.95, w: 0.8, h: 0.8 });
    s.text('Gefahrstelle', { x: 10.3, y: ry - 1.45, w: 2.0, h: 0.4, size: 16, bold: true, color: COL.red, align: 'center' });
    s.lineS(2.65, ry + 1.25, 11.3, ry + 1.25, { color: COL.orange, lw: 3, beginArrow: 'triangle', endArrow: 'triangle' }, { fx: 'wipeR', c: true, dur: 700 });
    s.text('außerorts: 150 bis 250 m', { x: 4.3, y: ry + 1.35, w: 5.4, h: 0.5, font: SERIF, size: 26, bold: true, color: COL.orange, align: 'center' }, { fx: 'fade', dur: 400 });
    s.text('innerorts: kurz davor', { x: 4.3, y: ry + 1.9, w: 5.4, h: 0.45, size: 21, bold: true, align: 'center' }, { fx: 'rise', c: true });
    sign(s, '1004_30', 0.8, 5.7, 0.55, { fx: 'zoom', c: true, dur: 400 });
    sign(s, '1001_30', 0.8 + signW('1004_30', 0.55) + 0.2, 5.7, 0.55, { fx: 'zoom', dur: 400 });
    s.text('Deutlich näher oder lange Gefahrstrecke? Steht auf dem Zusatzzeichen.', { x: 3.4, y: 5.72, w: 5.0, h: 0.55, size: 16, color: COL.muted, valign: 'middle' }, { fx: 'fade', dur: 400 });
    banner(s, 'Fuß vom Gas, bremsbereit!', 8.6, 5.7, 3.9, COL.orange, { fx: 'stamp', c: true }, { size: 19 });
    src(s, '§ 40 Abs. 1–4 StVO', { y: 6.85 });
  }
  // ================= GEFAHRZEICHEN-QUIZ =================
  {
    const s = add({ bg: 'bg_red.jpg', transition: 'fade', notes: `
Die vier wichtigsten Gefahrzeichen. Pro Schild fragen: ❓ Was bedeutet es, und was tust du? Dann klicken.
✅ Gefahrstelle (Zeichen 101): allgemeine Warnung, oft erklärt ein Zusatzzeichen die Gefahr.
✅ Gefälle 10 %: früh runterschalten, Motorbremse nutzen, nicht dauernd bremsen.
✅ Kinder: bremsbereit, Kinder können plötzlich auf die Straße laufen.
✅ Wildwechsel: Tempo runter, besonders in der Dämmerung. Steht ein Tier auf der Straße: abblenden, hupen, bremsen, nicht riskant ausweichen.` });
    footer(s);
    kicker(s, 'Gefahrzeichen', 0.8, 0.9, { color: COL.red });
    title(s, 'Was sagt es? Was tust du?', 0.75, 1.3, 12, 1.0, { size: 44 });
    const Q = [['101', 'Gefahrstelle', 'Allgemeine Warnung. Oft sagt ein Zusatzzeichen, welche.'], ['108_10', 'Gefälle 10 %', 'Früh runterschalten, Motorbremse nutzen.'], ['136_10', 'Kinder', 'Bremsbereit, Kinder laufen plötzlich los.'], ['142_10', 'Wildwechsel', 'Tempo runter. Tier da: bremsen, nicht riskant ausweichen.']];
    const cw = 2.8, gap = 0.2, x0 = (W - (4 * cw + 3 * gap)) / 2;
    Q.forEach(([id, t, d], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.5, cw, 4.0, { fill: COL.card, line: '3A2A2A', rr: 0.14, shadow: true });
      const sw = signW(id, 1.5); sign(s, id, x + cw / 2 - sw / 2, 2.75, 1.5);
      s.text(t, { x, y: 4.45, w: cw, h: 0.5, font: SERIF, size: 22, bold: true, align: 'center' }, { fx: 'rise', c: true, dur: 450 });
      s.text(d, { x: x + 0.2, y: 5.0, w: cw - 0.4, h: 1.3, size: 16, bold: true, color: COL.orange, align: 'center' }, { fx: 'fade', dur: 450 });
    });
  }
  // ================= VORSCHRIFTZEICHEN =================
  {
    const s = add({ bg: 'bg_blue.jpg', transition: 'fade', notes: `
Vorschriftzeichen: Gebote und Verbote.
❓ Klick 1 vorher: Was haben die linken Schilder gemeinsam? 🖱 Klick 1: ✅ Blau und rund = Gebot: Du musst.
🖱 Klick 2: ✅ Radweg (Radfahrer müssen ihn benutzen, Autos dürfen nicht drauf) · Gemeinsamer Geh- und Radweg.
❓ Und die rechten? 🖱 Klick 3: ✅ Rot umrandet = Verbot: Du darfst nicht.
🖱 Klick 4: ✅ Verbot für Fahrzeuge aller Art · Verbot der Einfahrt · Überholverbot (wer ein Fahrzeug führt, darf mehrspurige Kraftfahrzeuge und Krafträder mit Beiwagen nicht überholen; das gilt auch für Radfahrer) · Höchstgeschwindigkeit 50.
Nur die wichtigsten. Die übrigen Verbote folgen immer derselben Logik: rot umrandet = verboten.` });
    footer(s);
    kicker(s, 'Vorschriftzeichen · § 41 StVO', 0.8, 0.9, { color: COL.blue });
    title(s, 'Du musst. Du darfst nicht.', 0.75, 1.3, 12, 1.0, { size: 44 });
    const col = (x, w, head, rule, list, rc) => {
      s.rrect(x, 2.45, w, 2.75, { fill: COL.card, line: '2A3342', rr: 0.14 });
      s.text(head, { x: x + 0.3, y: 2.6, w: w - 0.6, h: 0.5, font: SERIF, size: 26, bold: true, color: rc }, { fx: 'rise', c: true, dur: 450 });
      s.text(rule, { x: x + 0.3, y: 3.1, w: w - 0.6, h: 0.4, size: 17, bold: true, color: COL.muted }, { fx: 'fade', dur: 450 });
      const per = Math.min(4, list.length), sw = (w - 0.4) / per;
      list.forEach(([id, t], i) => {
        const cx = x + 0.2 + (i % per) * sw + sw / 2, y = 3.65 + Math.floor(i / per) * 1.5, ww = signW(id, 0.8);
        sign(s, id, cx - ww / 2, y, 0.8);
        s.text(t, { x: cx - sw / 2 + 0.04, y: y + 0.85, w: sw - 0.08, h: 0.6, size: 15.5, bold: true, color: COL.txt, align: 'center', lsm: 0.95 }, i === 0 ? { fx: 'fade', c: true, dur: 400 } : { fx: 'fade', dur: 400, d: i * 60 });
      });
    };
    col(0.8, 4.2, 'Gebote', 'Blau und rund: Du musst.', [['237', 'Radweg'], ['240', 'Geh- und Radweg']], '8FB3FF');
    col(5.2, 7.3, 'Verbote', 'Rot umrandet: Du darfst nicht.', [['250', 'Fahrzeuge aller Art'], ['267', 'Keine Einfahrt'], ['276', 'Überholverbot'], ['274_50', 'Höchstens 50']], COL.red);
  }
  // ================= STRECKENVERBOT-SZENE =================
  {
    const s = add({ bg: 'sc_strecke.jpg', transition: 'fade', notes: `
Tempo 70 auf der Landstraße, dann kommt eine Kreuzung.
🖱 Klick 1: Du fährst bis zur Kreuzung.
❓ Frage: Gilt die 70 nach der Kreuzung noch? Abstimmen lassen!
🖱 Klick 2: ✅ Ja! Ein Streckenverbot endet nicht an der Kreuzung. Du fährst weiter.
🖱 Klick 3: ✅ Hier endet es: Aufhebungszeichen (Ende 70).
➜ Nächste Folie: die drei Wege, wie ein Streckenverbot endet.` });
    footer(s);
    kicker(s, 'Streckenverbote', 0.8, 0.9);
    title(s, 'Gilt die 70 noch?', 0.75, 1.3, 7, 1.0, { size: 44 });
    const ls = G.my0 + 1.5 * G.L;
    sign(s, '274_70', 1.7, G.my1 + 0.2, 0.9);
    sign(s, '278_70', 10.9, G.my1 + 0.2, 0.9);
    const du = new Actor(s, 'car_du.png', 0.9, ls, 90, { k: 0.3 });
    du.drive([['G', 5.55, ls]], { c: true });
    banner(s, 'Ja! Gilt weiter.', 3.1, 5.35, 3.1, COL.green, { fx: 'stamp', c: true });
    s.text('Streckenverbote enden nicht an der Kreuzung.', { x: 0.8, y: 6.2, w: 5.6, h: 0.45, size: 17, bold: true, align: 'center' }, { fx: 'fade' });
    du.drive([['G', 10.2, ls]], { a: true });
    banner(s, 'Hier endet sie.', 9.0, 6.3, 3.2, COL.orange, { fx: 'stamp', c: true });
    du.drive([['S', 4]], { a: true }); vanish(du);
  }
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Wie endet ein Streckenverbot (z. B. Tempo 70 oder Überholverbot)? Vor jedem Klick fragen.
🖱 Klick 1 · ✅ Mit einem Aufhebungszeichen (weiß mit schwarzen Streifen).
🖱 Klick 2 · ✅ Wenn auf einem Zusatzzeichen die Länge steht (z. B. „800 m“ mit Pfeil): nach dieser Strecke.
🖱 Klick 3 · ✅ Steht es zusammen mit einem Gefahrzeichen, endet es ohne Schild dort, wo die Gefahr erkennbar vorbei ist (Anlage 2 StVO).
🖱 Klick 4 · Vorsicht Unterschied: Das Haltverbot (Zeichen 283) gilt nur bis zur nächsten Kreuzung oder Einmündung auf dieser Straßenseite.` });
    footer(s);
    kicker(s, 'Merken', 0.8, 0.9, { color: COL.amber });
    title(s, 'So endet ein Streckenverbot', 0.75, 1.3, 12, 1.0, { size: 44 });
    const R = [[['278_70'], 'Aufhebungszeichen', 'Das Ende steht auf einem eigenen Schild.'], [['274_70', '1001_30'], 'Länge auf Zusatzzeichen', 'Nach der angegebenen Strecke ist Schluss.'], [['274_70', '142_10'], 'Mit Gefahrzeichen', 'Endet dort, wo die Gefahr erkennbar vorbei ist.']];
    const cw = 3.75, gap = 0.225, x0 = (W - (3 * cw + 2 * gap)) / 2;
    R.forEach(([ids, t, d], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.45, cw, 3.2, { fill: COL.card, line: '4A3B24', rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 500 });
      let tot = ids.reduce((a, id) => a + signW(id, id.startsWith('10') ? 0.45 : 0.95) + 0.15, -0.15), sx = x + cw / 2 - tot / 2;
      ids.forEach(id => { const h = id.startsWith('10') ? 0.45 : 0.95; sign(s, id, sx, 2.7 + (0.95 - h) / 2, h, { fx: 'zoom', dur: 350 }); sx += signW(id, h) + 0.15; });
      s.text(t, { x: x + 0.2, y: 3.85, w: cw - 0.4, h: 0.5, font: SERIF, size: 21, bold: true, align: 'center' }, { fx: 'fade', dur: 350 });
      s.text(d, { x: x + 0.25, y: 4.4, w: cw - 0.5, h: 1.0, size: 16, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 350 });
    });
    s.rrect(0.8, 5.9, 11.7, 0.85, { fill: '1E1410', line: COL.red, lw: 1.5, rr: 0.12 }, { fx: 'flyB', c: true, dur: 600 });
    sign(s, '283', 1.0, 5.98, 0.7, { fx: 'zoom', dur: 300 });
    s.text([run('Achtung, Unterschied: ', { bold: true, color: COL.red }), run('Das Haltverbot gilt nur bis zur nächsten Kreuzung oder Einmündung.')], { x: 1.9, y: 5.95, w: 10.4, h: 0.75, size: 18, valign: 'middle' }, { fx: 'fade', dur: 300 });
  }
  // ================= ZUSATZZEICHEN =================
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Zusatzzeichen gelten nur für das Zeichen, unter dem sie hängen. Zu jeder Kombination fragen: ❓ Wann gilt das?
🖱 Klick 1: ✅ Tempo 80 bei Nässe: nur wenn die Fahrbahn nass ist, also ein durchgehender Wasserfilm darauf liegt. Nur feucht oder einzelne Pfützen reicht nicht. Bei anhaltendem Regen ist das aber meist erfüllt.
🖱 Klick 2: ✅ Verbot für Fahrzeuge aller Art, Anlieger frei: Durchfahren verboten, außer du hast dort etwas zu erledigen (wohnen, besuchen, liefern).
🖱 Klick 3: ✅ Absolutes Haltverbot nur von 16 bis 18 Uhr.` });
    footer(s);
    kicker(s, 'Zusatzzeichen', 0.8, 0.9, { color: COL.amber });
    title(s, 'Wann gilt das?', 0.75, 1.3, 12, 1.0, { size: 44 });
    const C3 = [['274_80', '1053_35', 'Nur bei nasser Fahrbahn', 'Wasserfilm auf der Straße, nicht bloß feucht.'], ['250', '1020_30', 'Nur Anlieger dürfen rein', 'Wer dort wohnt, besucht oder liefert.'], ['283', '1040_30', 'Haltverbot nur 16 bis 18 Uhr', 'Sonst darfst du hier halten.']];
    const cw = 3.75, gap = 0.225, x0 = (W - (3 * cw + 2 * gap)) / 2;
    C3.forEach(([a, b, t, d], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.45, cw, 4.25, { fill: COL.card, line: '2A3342', rr: 0.14, shadow: true });
      const wa = signW(a, 1.25); sign(s, a, x + cw / 2 - wa / 2, 2.65, 1.25);
      const hb = b === '1053_35' ? 1.05 : 0.6, wb = (SIGN[b] || 1.5) * hb;
      s.img('sign_' + b + '.png', { x: x + cw / 2 - wb / 2, y: 3.95, w: wb, h: hb });
      s.text(t, { x: x + 0.2, y: 5.15, w: cw - 0.4, h: 0.5, size: 19, bold: true, color: COL.orange, align: 'center' }, { fx: 'rise', c: true, dur: 450 });
      s.text(d, { x: x + 0.25, y: 5.65, w: cw - 0.5, h: 0.9, size: 15, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 450 });
    });
  }
  // ================= RICHTZEICHEN =================
  {
    const s = add({ bg: 'bg_green.jpg', transition: 'fade', notes: `
Richtzeichen geben Hinweise. Manche enthalten aber auch Anordnungen (§ 42 StVO).
Pro Schild: erst fragen, dann klicken.
Nur die vier wichtigsten.
✅ Autobahn · Fußgängerüberweg (Fußgängern das Überqueren ermöglichen, § 26) · Einbahnstraße (nur in Pfeilrichtung fahren) · Sackgasse.` });
    footer(s);
    kicker(s, 'Richtzeichen · § 42 StVO', 0.8, 0.9, { color: COL.green });
    title(s, 'Hinweise, manchmal mit Pflicht', 0.75, 1.3, 12, 1.0, { size: 44 });
    const R = [['330_1', 'Autobahn'], ['350_10', 'Fußgängerüberweg'], ['220_10', 'Einbahnstraße'], ['357', 'Sackgasse']];
    const cw = 2.8, ch = 3.0, gx = 0.2, x0 = (W - (4 * cw + 3 * gx)) / 2;
    R.forEach(([id, t], i) => {
      const x = x0 + i * (cw + gx), y = 2.8;
      s.rrect(x, y, cw, ch, { fill: COL.card, line: '2E5A40', rr: 0.12 });
      const h = id === '220_10' ? 0.75 : 1.6, w = signW(id, h); sign(s, id, x + cw / 2 - w / 2, y + 0.3 + (1.6 - h) / 2, h);
      ans(s, t, x + 0.1, y + 2.2, cw - 0.2, { fx: 'rise', c: true, dur: 450 }, { size: 19, color: COL.txt });
    });
  }
  {
    const s = add({ bg: 'bg_blue.jpg', transition: 'fade', notes: `
Wegweiser haben ein Farbsystem. ❓ Frage vorher: Warum sind Wegweiser unterschiedlich farbig? ✅ Damit du in Sekunden erkennst, wo du bist und wohin es geht.
🖱 Klick 1: ✅ Blau: Ziele über die Autobahn.
🖱 Klick 2: ✅ Gelb: Ziele außerorts, z. B. über Bundesstraßen.
🖱 Klick 3: ✅ Weiß: Ziele im Ort.
🖱 Klick 4: ✅ Braun: touristische Ziele.
Achtung: Die Farbe zeigt die Art des Ziels, nicht, wo du gerade bist. Gelbe Wegweiser stehen z. B. auch innerorts.
Die Tafeln hier sind vereinfachte Beispiele.` });
    footer(s);
    kicker(s, 'Wegweiser', 0.8, 0.9, { color: COL.blue });
    title(s, 'Die Farbe zeigt, wohin es geht', 0.75, 1.3, 12, 1.0, { size: 44 });
    const F = [['1F4FA3', 'FFFFFF', 'A 3  Frankfurt', 'Blau', 'über die Autobahn'], ['F2C230', '111111', 'B 43  Hanau', 'Gelb', 'Ziele außerorts'], ['FFFFFF', '111111', 'Zentrum', 'Weiß', 'Ziele im Ort'], ['6B3E1E', 'FFFFFF', 'Schloss', 'Braun', 'touristische Ziele']];
    const cw = 2.8, gap = 0.2, x0 = (W - (4 * cw + 3 * gap)) / 2;
    F.forEach(([bgc, fg, t, c, d], i) => {
      const x = x0 + i * (cw + gap);
      s.shape(pres.shapes.PENTAGON, { x, y: 2.8, w: cw, h: 1.0, fill: bgc, line: '222222', lw: 1 }, { fx: 'flyL', c: true, dur: 600 });
      s.text(t, { x: x + 0.15, y: 2.8, w: cw - 0.6, h: 1.0, size: 22, bold: true, color: fg, valign: 'middle' }, { fx: 'fade', dur: 400 });
      s.text(c, { x, y: 4.1, w: cw, h: 0.55, font: SERIF, size: 26, bold: true, align: 'center' }, { fx: 'fade', dur: 400 });
      s.text(d, { x, y: 4.65, w: cw, h: 0.45, size: 18, bold: true, color: COL.orange, align: 'center' }, { fx: 'fade', dur: 400 });
    });
    body(s, 'Vereinfachte Beispiele.', 0.8, 6.6, 11.7, 0.35, { size: 13, align: 'center' });
  }

  // ================= MARKIERUNGEN =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kapitel: Markierungen. Nicht nur Schilder sprechen, auch die Straße selbst.
🖱 1 Klick: der zweite Satz.` });
    kicker(s, 'Markierungen', 0.8, 1.6, { w: 11.7, align: 'center' }, { fx: 'fade', auto: true });
    title(s, 'Auch die Straße spricht.', 0.8, 2.2, 11.7, 1.2, { size: 62, align: 'center' }, { fx: 'fade', auto: true, a: true, dur: 1200 });
    s.text('Man muss nur hinschauen.', { x: 0.8, y: 3.55, w: 11.7, h: 1.0, font: SERIF, size: 44, italic: true, color: COL.orange, align: 'center' }, { fx: 'rise', c: true, dur: 900 });
  }
  {
    const s = add({ bg: 'sc_mark.jpg', transition: 'fade', notes: `
Drei Linien, drei Regeln. Du fährst auf dem rechten Fahrstreifen. Vor jedem Abschnitt fragen: ❓ Darf ich rüber?
🖱 Klick 1: ✅ Gestrichelte Leitlinie (Zeichen 340): Ja, du darfst sie überfahren, z. B. zum Überholen. Du wechselst und kommst zurück.
🖱 Klick 2: ✅ Durchgezogene Fahrstreifenbegrenzung (Zeichen 295): Nein! Nicht überfahren, auch nicht ein bisschen.
🖱 Klick 3: ✅ Einseitige Fahrstreifenbegrenzung (Zeichen 296): Von der gestrichelten Seite darfst du rüber, von der durchgezogenen Seite nicht. Du bist auf der gestrichelten Seite, also darfst du.` });
    footer(s);
    kicker(s, 'Linien lesen', 0.8, 0.9);
    title(s, 'Darf ich rüber?', 0.75, 1.3, 7, 0.9, { size: 44 });
    const L2 = LANE(G.my0);
    const du = new Actor(s, 'car_du.png', 0.9, L2.s, 90, { k: 0.3 });
    const lab = (t, x, w, col, anim) => s.text(t, { x, y: G.my1 + 0.25, w, h: 0.95, size: 16, bold: true, color: col, align: 'center', lsm: 1.0 }, anim);
    banner(s, 'Ja!', 1.6, 5.9, 1.4, COL.green, { fx: 'stamp', c: true });
    lab('Leitlinie\ndarfst du überfahren', 0.3, 4.0, '7FD1A3', { fx: 'fade' });
    du.drive([...laneChange(1.3, L2.s, L2.n), ['G', 2.9, L2.n], ...laneChange(2.9, L2.n, L2.s)], { a: true });
    du.drive([['G', 5.7, L2.s]], { c: true });
    banner(s, 'Nein!', 5.9, 5.9, 1.6, COL.red, { fx: 'stamp', a: true });
    lab('Fahrstreifenbegrenzung\nnicht überfahren', 4.5, 4.3, COL.red, { fx: 'fade' });
    du.drive([['G', 9.4, L2.s]], { c: true });
    banner(s, 'Von hier: Ja!', 9.7, 5.9, 2.6, COL.green, { fx: 'stamp', a: true }, { size: 20 });
    lab('Einseitig: nur von der\ngestrichelten Seite', 8.9, 4.3, '7FD1A3', { fx: 'fade' });
    du.drive([...laneChange(9.4, L2.s, L2.n), ['S', 3.2]], { a: true }); vanish(du);
  }
  {
    const s = add({ bg: 'sc_bau.jpg', transition: 'fade', notes: `
Baustelle! Weiße und gelbe Linien gleichzeitig.
❓ Frage: Welche Linie gilt? Abstimmen lassen.
🖱 Klick 1: Die gelben Linien leuchten auf. ✅ Gelb schlägt Weiß: Gelbe Markierungen gelten vorübergehend und heben die weißen auf (§ 39 Abs. 5 StVO). Die weißen müssen dafür nicht entfernt werden.
🖱 Klick 2: Beide Autos folgen den gelben Linien an der Baustelle vorbei.` });
    footer(s);
    kicker(s, 'Baustelle', 0.8, 0.9);
    title(s, 'Weiß oder Gelb: Was gilt?', 0.75, 1.3, 8, 0.9, { size: 40 });
    body(s, 'Zwei Fahrstreifen, beide in eine Richtung →', 0.8, 2.05, 7, 0.4, { size: 16 });
    for (let i = 0; i < 5; i++) vimg(s, 've_bake_l', 6.0 + i * 1.1, G.by0 + G.L - 0.62, 0.5);
    const yl = s.img('ov_yellow.png', { x: 0, y: 0, w: W, h: H });
    s.reg(yl, { fx: 'wipeR', c: true, dur: 1200 }, 'pic');
    banner(s, 'Gelb schlägt Weiß!', 0.8, 5.95, 3.8, 'F2C230', { fx: 'stamp', a: true });
    const Ls = G.by0 + 1.5 * G.L, Ln = G.by0 + 0.5 * G.L, d = 0.75;
    const du = new Actor(s, 'car_du.png', 1.2, Ls, 90, { k: 0.3 }), a = new Actor(s, 'car_blau.png', 2.6, Ln, 90, { k: 0.3 });
    const path = (y, x0) => [['G', 3.6, y], ...laneChange(3.6, y, y + d, 2.4), ['G', 11.0, y + d], ...laneChange(11.0, y + d, y, 2.4)];
    together([[du, path(Ls)], [a, [['G', 3.6 + 1.4, Ln], ...laneChange(5.0, Ln, Ln + d, 1.4), ['G', 11.3, Ln + d], ...laneChange(11.3, Ln + d, Ln, 2.0)]]], { c: true });
    vanish(du); vanish(a, {});
  }
  // ================= VERKEHRSEINRICHTUNGEN =================
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Verkehrseinrichtungen (§ 43 StVO, Anlage 4). Ihre Regeln gehen den allgemeinen Verkehrsregeln vor.
Zu jedem Teil fragen: ❓ Was sagt es dir? Dann klicken.
✅ Absperrschranke: Hier ist gesperrt, nicht durchfahren.
✅ Leitbake: leitet dich vorbei. Die Streifen fallen zu der Seite, auf der du vorbeifährst.
✅ Leitkegel: markiert vorübergehend gesperrte Flächen, z. B. Baustelle oder Unfall.
✅ Leitpfosten: zeigen den Straßenverlauf, meist alle 50 m.
✅ Leitplatte: markiert Hindernisse, z. B. Verkehrsinseln.
Die Darstellungen sind vereinfacht nachgezeichnet (außer der Leitplatte).` });
    footer(s);
    kicker(s, 'Verkehrseinrichtungen · § 43 StVO', 0.8, 0.9, { color: COL.amber });
    title(s, 'Die stummen Helfer', 0.75, 1.3, 12, 1.0, { size: 44 });
    const E = [['ve_schranke', 'Absperrschranke', 'Gesperrt. Nicht durchfahren.', 0.9], ['ve_bake_l', 'Leitbake', 'Leitet dich vorbei.', 1.7], ['ve_kegel', 'Leitkegel', 'Fläche vorübergehend gesperrt.', 1.2], ['ve_pfosten_r', 'Leitpfosten', 'Zeigt den Straßenverlauf.', 1.7], ['sign_626_20', 'Leitplatte', 'Markiert Hindernisse.', 1.4]];
    const cw = 2.26, gap = 0.1, x0 = (W - (5 * cw + 4 * gap)) / 2;
    E.forEach(([f, t, d, h], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.45, cw, 4.2, { fill: COL.card, line: '2A3342', rr: 0.12 });
      const key = f === 'sign_626_20' ? '626_20' : f, w = h * (SIGN[key] || 1);
      s.img(f + '.png', { x: x + cw / 2 - w / 2, y: 2.7 + (1.8 - h) / 2, w, h });
      s.text(t, { x, y: 4.7, w: cw, h: 0.5, size: 18, bold: true, align: 'center' }, { fx: 'rise', c: true, dur: 450 });
      s.text(d, { x: x + 0.12, y: 5.2, w: cw - 0.24, h: 1.2, size: 15, bold: true, color: COL.orange, align: 'center' }, { fx: 'fade', dur: 450 });
    });
  }
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'fade', notes: `
Zwei Rätsel zum Mitdenken.
❓ Leitbaken: Wo fährst du vorbei? 🖱 Klick 1 und 2: ✅ Auf der Seite, zu der die Streifen nach unten fallen. Links: links vorbei. Rechts: rechts vorbei.
❓ Leitpfosten: Welcher steht rechts, welcher links? 🖱 Klick 3 und 4: ✅ Rechts: ein rechteckiger Rückstrahler. Links: zwei runde. Eselsbrücke: Rechts = Rechteck.
Nützlich nachts oder im Nebel: Du erkennst sofort, auf welcher Seite der Straße ein Pfosten steht.` });
    footer(s);
    kicker(s, 'Mitdenken', 0.8, 0.9);
    title(s, 'Wo lang? Welche Seite?', 0.75, 1.3, 12, 1.0, { size: 44 });
    // Baken
    [['ve_bake_l', 'links vorbei', -1], ['ve_bake_r', 'rechts vorbei', 1]].forEach(([f, t, dir], i) => {
      const x = 1.2 + i * 2.6;
      vimg(s, f, x, 2.55, 2.3);
      const ax = dir < 0 ? x - 0.75 : x + 0.95, n = s.shape(dir < 0 ? pres.shapes.LEFT_ARROW : pres.shapes.RIGHT_ARROW, { x: ax, y: 3.4, w: 0.7, h: 0.5, fill: COL.green, glow: 8, glowColor: COL.green, glowOp: 0.6 }, { fx: 'zoom', c: true, dur: 400 });
      ans(s, t, x - 0.6, 5.0, 2.1, { fx: 'fade', dur: 400 }, { size: 19, color: '7FD1A3' });
    });
    s.text('Leitbaken', { x: 0.9, y: 5.9, w: 4.3, h: 0.5, font: SERIF, size: 24, bold: true, align: 'center' });
    // Pfosten
    [['ve_pfosten_r', 'rechts', 'ein Rechteck'], ['ve_pfosten_l', 'links', 'zwei Punkte']].forEach(([f, t, d], i) => {
      const x = 8.1 + i * 2.4;
      vimg(s, f, x, 2.55, 2.3);
      ans(s, t, x - 0.6, 5.0, 1.8, { fx: 'rise', c: true, dur: 450 }, { size: 22, color: COL.orange });
      s.text(d, { x: x - 0.6, y: 5.42, w: 1.8, h: 0.4, size: 17, bold: true, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 450 });
    });
    s.text('Leitpfosten', { x: 7.3, y: 5.9, w: 4.9, h: 0.5, font: SERIF, size: 24, bold: true, align: 'center' });
    s.text('Eselsbrücke: Rechts = Rechteck.', { x: 0.8, y: 6.5, w: 11.7, h: 0.45, size: 19, bold: true, italic: true, color: COL.orange, align: 'center' }, { fx: 'fade', c: true });
  }
  // ================= NEBEL =================
  {
    const s = add({ bg: 'sc_nebel.jpg', transition: 'black', footer: false, notes: `
Leitpfosten als Maßband. Außerorts stehen sie meist alle 50 m.
▶ Nachts auf der Landstraße. Klare Sicht.
🖱 Klick 1: Nebel kommt. Du siehst noch etwa drei Pfosten, also rund 150 m.
🖱 Klick 2: Dichter Nebel. Nur noch ein Pfosten zu sehen: Sichtweite etwa 50 m.
❓ Frage: Wie schnell darfst du jetzt noch fahren? 🖱 Klick 3: ✅ Bei Sichtweite unter 50 m durch Nebel, Schnee oder Regen: höchstens 50 km/h, auch auf der Autobahn (§ 3 Abs. 1 StVO). Das ist eine Obergrenze, oft ist langsamer nötig. Die Nebelschlussleuchte darf nur bei Nebel und Sicht unter 50 m an (§ 17 Abs. 3 StVO).
Faustregel: Siehst du den nächsten Pfosten kaum noch, bist du unter 50 m.` });
    s.text('Nachts. Landstraße.', { x: 0.8, y: 0.6, w: 7, h: 0.6, font: SERIF, size: 34, bold: true });
    s.text('Die Leitpfosten stehen meist alle 50 m.', { x: 0.8, y: 1.2, w: 7, h: 0.5, size: 20, color: COL.muted });
    const f1 = s.img('ov_fog150.png', { x: 0, y: 0, w: W, h: H }); s.reg(f1, { fx: 'fade', c: true, dur: 2500 }, 'pic');
    const t1 = s.text('Noch 3 Pfosten: ca. 150 m Sicht', { x: 0.8, y: 5.6, w: 7, h: 0.6, size: 24, bold: true, color: '1A1F28' }); s.reg(t1, { fx: 'fade', dur: 800, d: 1200 }, 'sp');
    const f2 = s.img('ov_fog50.png', { x: 0, y: 0, w: W, h: H }); s.reg(f2, { fx: 'fade', c: true, dur: 2500 }, 'pic');
    s.reg(t1, { fx: 'out', dur: 400 }, 'sp');
    const t2 = s.text('Nur noch 1 Pfosten: ca. 50 m Sicht', { x: 0.8, y: 5.6, w: 7, h: 0.6, size: 24, bold: true, color: '1A1F28' }); s.reg(t2, { fx: 'fade', dur: 800, d: 1200 }, 'sp');
    s.text('HÖCHSTENS 50 KM/H', { x: 2.4, y: 2.2, w: 8.5, h: 1.3, font: SERIF, size: 54, bold: true, color: 'FFFFFF', fill: 'C62828', shape: pres.shapes.ROUNDED_RECTANGLE, rr: 0.15, align: 'center', valign: 'middle', rotate: -3, glow: 20, glowColor: 'FF3B3B', glowOp: 0.5 }, { fx: 'stamp', c: true, dur: 450 });
    s.text('auch auf der Autobahn · jetzt erst Nebelschlussleuchte an', { x: 1.5, y: 3.8, w: 10.3, h: 0.5, size: 22, bold: true, color: '1A1F28', align: 'center' }, { fx: 'fade', a: true });
  }

  // ================= BAHNÜBERGANG =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kapitel: Bahnübergang. Langsam, eindringlich.
▶ Ein Zug fährt auf Schienen. Er kann nicht ausweichen und kaum bremsen.
🖱 1 Klick: ✅ Ein Zug mit 100 km/h braucht bei einer Vollbremsung rund 1.000 Meter. Ein Auto aus 100 km/h rund 40 bis 50 Meter.
❓ Frage: Was folgt daraus? ✅ Der Zug hat immer Vorrang (§ 19 Abs. 1 StVO).` });
    kicker(s, 'Bahnübergang', 0.8, 1.4, { w: 11.7, align: 'center' }, { fx: 'fade', auto: true });
    title(s, 'Ein Zug kann nicht ausweichen.', 0.8, 1.9, 11.7, 1.2, { size: 58, align: 'center' }, { fx: 'fade', auto: true, a: true, dur: 1200 });
    s.text([run('Bremsweg bei 100 km/h: '), run('rund 1.000 Meter.', { color: COL.red, bold: true })], { x: 0.8, y: 3.4, w: 11.7, h: 0.9, font: SERIF, size: 40, align: 'center' }, { fx: 'rise', c: true, dur: 900 });
    s.text('Ein Auto braucht dafür rund 40 bis 50 Meter.', { x: 0.8, y: 4.4, w: 11.7, h: 0.6, size: 22, color: COL.muted, align: 'center' }, { fx: 'fade', a: true });
    src(s, 'Deutsche Bahn / „Runter vom Gas“ (BMV, DVR) · § 19 StVO', { y: 6.4 });
  }
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'fade', notes: `
Wie kündigt sich ein Bahnübergang an?
▶ Angekündigt wird er durch das Gefahrzeichen „Bahnübergang“ über einer dreistreifigen Bake (zusammen Zeichen 156), dann folgen Baken mit 2 und 1 Streifen. Ohne Baken steht das Zeichen 151.
❓ Klick 1 vorher: Was bedeuten die Streifen? 🖱 Klick 1: ✅ Die Entfernung: 3 Streifen etwa 240 m, 2 Streifen etwa 160 m, 1 Streifen etwa 80 m.
🖱 Klick 2: Am Übergang das Andreaskreuz (Zeichen 201): Der Zug hat Vorrang.
❓ Darfst du hier überholen? 🖱 Klick 3: ✅ Nein. Kraftfahrzeuge nicht überholen: ab dem Zeichen 151 bzw. 156 bis über den Übergang (§ 19 Abs. 1). Nähere dich nur mit mäßiger Geschwindigkeit.
Die Baken sind vereinfacht nachgezeichnet.` });
    footer(s);
    kicker(s, 'Bahnübergang', 0.8, 0.9);
    title(s, 'So kündigt er sich an', 0.75, 1.3, 12, 1.0, { size: 44 });
    const ry = 3.3, xE = 11.6, m = 0.038; // 240 m ≈ 9,1 Zoll
    s.rect(0.8, ry, 11.7, 0.55, { fill: '1A222D' });
    s.lineS(0.8, ry + 0.27, 12.5, ry + 0.27, { color: 'D9DEE5', lw: 1.2, dash: 'dash' });
    s.rect(xE, ry - 0.08, 0.3, 0.71, { fill: '3A3430' });
    s.rect(xE + 0.06, ry - 0.08, 0.04, 0.71, { fill: 'A9B2BD' }); s.rect(xE + 0.2, ry - 0.08, 0.04, 0.71, { fill: 'A9B2BD' });
    [['bb3', 240], ['bb2', 160], ['bb1', 80]].forEach(([f, d], i) => {
      const x = xE - d * m;
      vimg(s, f, x - 0.25, ry + 0.75, 1.2);
      s.text(`ca. ${d} m`, { x: x - 0.7, y: ry - 0.5, w: 1.4, h: 0.4, size: 18, bold: true, color: COL.orange, align: 'center' }, i === 0 ? { fx: 'rise', c: true, dur: 400 } : { fx: 'rise', dur: 400, d: i * 150 });
    });
    vimg(s, 'sign_201', xE - 0.55, ry + 0.7, 1.3, { fx: 'zoom', c: true, dur: 500 });
    s.text('Andreaskreuz: Zug hat Vorrang', { x: 8.3, y: ry - 1.05, w: 4.2, h: 0.45, size: 18, bold: true, align: 'right' }, { fx: 'fade', dur: 400 });
    s.lineS(xE - 240 * m, ry + 2.35, xE + 0.15, ry + 2.35, { color: COL.red, lw: 3, beginArrow: 'oval', endArrow: 'triangle' }, { fx: 'wipeR', c: true, dur: 800 });
    s.text('Kraftfahrzeuge nicht überholen', { x: 3.0, y: ry + 2.5, w: 7.6, h: 0.5, font: SERIF, size: 24, bold: true, color: COL.red, align: 'center' }, { fx: 'fade', dur: 400 });
    src(s, 'Baken: 3 / 2 / 1 Streifen ≈ 240 / 160 / 80 m · § 19 Abs. 1 StVO', { y: 6.9 });
  }
  // Szene: Schranke und Zug
  const bahnScene = (s) => {
    const x0 = G.x0, x1 = G.x1, ty = G.ty;
    vimg(s, 'sign_201', x1 + 0.15, ty + 0.95, 0.75);
    vimg(s, 'sign_201', x0 - 0.15 - vw('sign_201', 0.75), ty - 0.95 - 0.75, 0.75);
    return { x0, x1, ty };
  };
  {
    const s = add({ bg: 'sc_bahn.jpg', transition: 'fade', notes: `
Bahnübergang mit Halbschranken. Du kommst von unten.
🖱 Klick 1: Die roten Lichter blinken, die Schranken senken sich. Du hältst vor dem Andreaskreuz an der Haltlinie.
🖱 Klick 2: Der Zug kommt. (Hier kurz Stille: So schnell ist ein Zug da.)
🖱 Klick 3: Schranken offen, Lichter aus. Jetzt darfst du fahren.
❓ Frage: Darf man bei sich senkender Schranke noch schnell durch? ✅ Nein. Sobald die Schranken sich senken oder die Lichter blinken: warten (§ 19 Abs. 2 StVO).` });
    footer(s);
    kicker(s, 'Bahnübergang', 0.8, 0.9);
    title(s, 'Die Schranke\nsenkt sich', 0.75, 1.3, 5, 2.0, { size: 48 });
    body(s, 'Du kommst an den Bahnübergang.\nDie Lichter blinken. Was tust du?', 0.8, 3.4, 4.4, 1.0, { size: 19 });
    const { x0, x1, ty } = bahnScene(s);
    // rote Blinklichter
    const lights = [[x1 + 0.95, ty + 1.2], [x0 - 1.05, ty - 1.3]].map(([x, y]) => { s.oval(x, y, 0.3, 0.3, { fill: '1B1F27', line: '4A5261', lw: 1 }); return s.oval(x, y, 0.3, 0.3, { fill: 'FF2E2E', glow: 14, glowColor: 'FF2E2E', glowOp: 0.9 }); });
    const bw = 2 * 3.6 * 0.3, bh = 0.2 * 0.3;
    const bS = s.img('barrier.png', { x: x1 + 0.08 - bw / 2, y: ty + 0.78 - bh / 2, w: bw, h: bh });
    const bN = s.img('barrier_r.png', { x: x0 - 0.08 - bw / 2, y: ty - 0.78 - bh / 2, w: bw, h: bh });
    const train = s.img('train.png', { x: -16.5, y: ty - 0.54, w: 15.78, h: 1.08, noGlide: true });
    const du = new Actor(s, 'car_du.png', G.cx + G.L / 2, 7.0, 0, { k: 0.3 });
    // Klick 1: Lichter + Schranken + Anhalten
    lights.forEach((n, i) => { s.reg(n, { fx: 'fade', dur: 150, c: i === 0 }, 'sp'); s.reg(n, { fx: 'blink', dur: 900 }, 'sp'); });
    s.reg(bS, { fx: 'wipeR', dur: 2200, d: 800 }, 'pic'); s.reg(bN, { fx: 'wipeL', dur: 2200, d: 800 }, 'pic');
    du.drive([['G', G.cx + G.L / 2, ty + 1.2 + 0.1 + 0.675]], {}, { speed: 1.1 });
    banner(s, 'Warten vor dem Andreaskreuz!', 0.8, 4.55, 4.6, COL.orange, { fx: 'stamp', a: true }, { size: 19 });
    // Klick 2: Zug
    s.reg(train, { fx: 'move', c: true, dur: 3800, ease: 'lin', path: `M 0 0 L ${(31.5 / W).toFixed(4)} 0 E` }, 'pic');
    // Klick 3: frei
    lights.forEach((n, i) => s.reg(n, { fx: 'out', dur: 300, c: i === 0 }, 'sp'));
    s.reg(bS, { fx: 'out', dur: 900 }, 'pic'); s.reg(bN, { fx: 'out', dur: 900 }, 'pic');
    banner(s, 'Frei. Jetzt fahren.', 0.8, 5.3, 3.6, COL.green, { fx: 'stamp', a: true }, { size: 19 });
    du.drive([['S', 7.5]], { a: true }); vanish(du);
  }
  {
    const s = add({ bg: 'bg_red.jpg', transition: 'fade', notes: `
Wann musst du vor dem Andreaskreuz warten? (§ 19 Abs. 2 StVO). Erst sammeln lassen, dann Punkt für Punkt auflösen.
🖱 Klick 1–5: ✅ Ein Zug nähert sich · rotes Blinklicht oder gelbes bzw. rotes Lichtzeichen · Schranken senken sich oder sind geschlossen · ein Bahnmitarbeiter zeigt Halt · ein hörbares Signal, z. B. das Pfeifen des Zuges.
🖱 Klick 6 · Umwelt: Wartest du länger, Motor aus. Unnötiges Laufenlassen ist verboten (§ 30 Abs. 1 StVO).` });
    footer(s);
    kicker(s, 'Warten · § 19 Abs. 2 StVO', 0.8, 0.9, { color: COL.red });
    title(s, 'Wann musst du warten?', 0.75, 1.3, 12, 1.0, { size: 44 });
    const P = [[I6.train, 'Ein Zug nähert sich'], [I6.light, 'Rotes Blinklicht, gelbes oder rotes Licht'], [I6.bar, 'Schranken senken sich oder sind zu'], [I6.hand, 'Ein Bahnmitarbeiter zeigt Halt'], [I6.ear, 'Ein Signal ist zu hören, z. B. der Zug pfeift']];
    P.forEach(([ic, t], i) => {
      const y = 2.45 + i * 0.78;
      s.rrect(0.8, y, 11.7, 0.66, { fill: COL.card, line: '3A2A2A', rr: 0.12 }, { fx: 'flyL', c: true, dur: 550 });
      s.img(ic, { x: 1.05, y: y + 0.12, w: 0.42, h: 0.42 }, { fx: 'fade', dur: 300 });
      s.text(t, { x: 1.7, y, w: 10.5, h: 0.66, size: 21, bold: true, valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
    s.img(I6.engine, { x: 0.85, y: 6.45, w: 0.42, h: 0.42 }, { fx: 'zoom', c: true, dur: 350 });
    s.text('Längere Wartezeit? Motor aus.', { x: 1.4, y: 6.43, w: 8, h: 0.45, size: 19, bold: true, color: '7FD1A3', valign: 'middle' }, { fx: 'fade', dur: 350 });
  }
  {
    const s = add({ bg: 'sc_bahn.jpg', transition: 'fade', notes: `
Die Stau-Falle. Die Schranke ist offen, aber hinter dem Übergang steht ein Stau.
❓ Frage: Darfst du jetzt über die Gleise? Abstimmen!
🖱 Klick 1: ✅ Nein! Wenn du nicht zügig und ohne anzuhalten ganz rüberkommst, wartest du vor dem Andreaskreuz (§ 19 Abs. 3 StVO). Sonst stehst du plötzlich auf den Gleisen, wenn die Schranke zugeht.
🖱 Klick 2: Der Stau löst sich auf.
🖱 Klick 3: Jetzt ist Platz. Du fährst rüber.` });
    footer(s);
    kicker(s, 'Die Stau-Falle', 0.8, 0.9, { color: COL.red });
    title(s, 'Schranke offen.\nDarfst du rüber?', 0.75, 1.3, 5.2, 2.0, { size: 46 });
    body(s, 'Hinter den Gleisen staut es sich.', 0.8, 3.4, 4.4, 0.6, { size: 19 });
    bahnScene(s);
    const lx = G.cx + G.L / 2;
    const q = [1.95, 0.5, -0.95].map((y, i) => new Actor(s, ['car_grau.png', 'car_blau.png', 'car_weiss.png'][i], lx, y, 0, { k: 0.3 }));
    const du = new Actor(s, 'car_du.png', lx, 7.0, 0, { k: 0.3 });
    du.drive([['G', lx, G.ty + 1.2 + 0.1 + 0.675]], { c: true }, { speed: 1.1 });
    banner(s, 'Nein! Vor dem Kreuz warten.', 0.8, 4.3, 4.6, COL.red, { fx: 'stamp', a: true }, { size: 19 });
    together(q.map(c => [c, [['S', 4.5]]]), { c: true }); q.forEach((c, i) => vanish(c, i ? {} : { a: true }));
    banner(s, 'Jetzt ist Platz.', 0.8, 5.05, 3.4, COL.green, { fx: 'stamp', c: true }, { size: 19 });
    du.drive([['S', 7.5]], { a: true }); vanish(du);
  }
  {
    const s = add({ bg: 'bg_red.jpg', transition: 'fade', notes: `
Notfall: Das Auto bleibt auf den Gleisen liegen. ❓ Frage vorher: Was tust du? Antworten sammeln.
🖱 Klick 1: ✅ Sofort alle raus und weg von den Gleisen.
🖱 Klick 2: ✅ Notruf 112 oder 110 wählen. Gibt es am Übergang eine Notrufnummer der Bahn, auch diese.
🖱 Klick 3: ✅ Nur wenn kein Zug in Sicht ist: Auto von den Gleisen schieben.
🖱 Klick 4: ✅ Zwischen zwei Vollschranken eingeschlossen? Durchfahren! Die Schranken geben nach. (Bei Halbschranken kann man nicht eingeschlossen werden.)
Quellen: Deutsche Bahn und „Runter vom Gas“ (Punkte 1–3), ACV (Punkt 4).` });
    footer(s);
    kicker(s, 'Notfall', 0.8, 0.9, { color: COL.red });
    title(s, 'Auf den Gleisen liegen geblieben', 0.75, 1.3, 12, 1.0, { size: 42 });
    const P = [[I6.run, 'Sofort alle raus, weg von den Gleisen'], [I6.phone, 'Notruf 112 oder 110'], [I6.push, 'Kein Zug in Sicht? Auto runterschieben'], [I6.bar, 'Zwischen Schranken gefangen? Durchfahren, sie geben nach']];
    P.forEach(([ic, t], i) => {
      const x = 0.8 + (i % 2) * 6.0, y = 2.55 + Math.floor(i / 2) * 1.9;
      s.rrect(x, y, 5.7, 1.65, { fill: COL.card, line: '3A2A2A', rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 550 });
      s.text(String(i + 1), { x: x + 0.3, y: y + 0.45, w: 0.75, h: 0.75, font: SERIF, size: 30, bold: true, color: '1A0E05', fill: COL.red, shape: pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 300 });
      s.text(t, { x: x + 1.3, y: y + 0.15, w: 4.2, h: 1.35, size: 21, bold: true, valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
  }
  {
    const s = add({ bg: 'bg_redglow.jpg', transition: 'fade', notes: `
Was kostet es? Vor jedem Klick schätzen lassen.
🖱 Klick 1: ✅ Rotes Blinklicht, Schranke senkt sich oder ein Bahnmitarbeiter zeigt Halt, und du fährst trotzdem: 240 €, 2 Punkte, 1 Monat Fahrverbot.
🖱 Klick 2: ✅ Bei geschlossener Schranke drüber: 700 €, 2 Punkte, 3 Monate Fahrverbot. Dazu droht ein Strafverfahren (gefährlicher Eingriff in den Bahnverkehr, § 315 StGB).
🖱 Klick 3: ✅ In der Probezeit sind das A-Verstöße: Aufbauseminar, Probezeit +2 Jahre.` });
    footer(s);
    kicker(s, 'Folgen', 0.8, 0.9, { color: COL.red });
    title(s, 'Was es kostet', 0.75, 1.3, 12, 1.0, { size: 44 });
    const C2 = [['Blinklicht an oder Schranke senkt sich', '240 €', '2 Punkte · 1 Monat Fahrverbot'], ['Schranke geschlossen', '700 €', '2 Punkte · 3 Monate Fahrverbot']];
    C2.forEach(([t, v, d], i) => {
      const x = 0.8 + i * 6.0;
      s.rrect(x, 2.6, 5.7, 2.6, { fill: COL.card, line: i ? COL.red : '3A2A2A', lw: i ? 2 : 1, rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
      s.text(t, { x: x + 0.35, y: 2.8, w: 5.0, h: 0.5, size: 19, bold: true, color: COL.muted }, { fx: 'fade', dur: 300 });
      s.text(v, { x: x + 0.35, y: 3.35, w: 5.0, h: 1.1, font: SERIF, size: 66, bold: true, color: COL.red }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 0.35, y: 4.5, w: 5.0, h: 0.5, size: 20, bold: true }, { fx: 'fade', dur: 300 });
    });
    s.text([run('Probezeit: ', { bold: true, color: COL.orange }), run('A-Verstoß → Aufbauseminar, +2 Jahre')], { x: 0.8, y: 5.55, w: 11.7, h: 0.5, size: 20 }, { fx: 'fade', c: true });
    src(s, 'Bußgeldkatalog (BKatV), Stand 2026 · § 19 StVO · § 2a StVG', { y: 6.85 });
  }

  // ================= GRUPPENARBEIT =================
  {
    const s = add({ bg: 'bg_center.jpg', transition: 'zoom', notes: `
Gruppenarbeit. Arbeitsblätter austeilen, drei Gruppen bilden.
Gruppe 1 · Schilder-Detektive · Gruppe 2 · Linien und Helfer · Gruppe 3 · Bahnübergang.
🖱 Klick 1: Der Auftrag. 🖱 Klick 2: Timer 15 Minuten.
Auftrag: Jede Gruppe baut ein Rätsel für die Klasse (Szene von oben oder Schilder zum Einordnen), dazu 3 Regeln und 1 Merksatz. Bei der Vorstellung rät zuerst die Klasse, dann löst die Gruppe auf.
Material: Plakat, dicke Stifte (Schwarz, Rot, Blau, Gelb), Klebezettel, Schere und Kleber für die Schilder-Streifen auf den Blättern.
Du gehst herum. Hängt eine Gruppe, stell eine Frage von ihrem Blatt, gib keine Lösung.` });
    footer(s);
    kicker(s, 'Gruppenarbeit', 0.8, 0.9);
    title(s, 'Ihr baut das Rätsel.', 0.75, 1.3, 12, 1.0, { size: 46 });
    const GR = [['1', 'Schilder-Detektive', 'Formen, Farben, Gefahr-, Vorschrift- und Richtzeichen'], ['2', 'Linien und Helfer', 'Markierungen, Gelb vor Weiß, Leitbaken, Leitpfosten'], ['3', 'Bahnübergang', 'Baken, Warten, Stau-Falle, Notfall']];
    GR.forEach(([n, t, d], i) => {
      const x = 0.8 + i * 3.97;
      s.rrect(x, 2.5, 3.75, 2.3, { fill: COL.card, line: '2A3342', rr: 0.14, shadow: true }, { fx: 'rise', auto: true, a: i > 0, dur: 550 });
      s.text('Gruppe ' + n, { x: x + 0.3, y: 2.7, w: 3.2, h: 0.4, size: 15, bold: true, cs: 3, color: COL.orange }, { fx: 'fade', auto: true, dur: 300 });
      s.text(t, { x: x + 0.3, y: 3.1, w: 3.2, h: 0.9, font: SERIF, size: 23, bold: true }, { fx: 'fade', auto: true, dur: 300 });
      s.text(d, { x: x + 0.3, y: 3.95, w: 3.2, h: 0.8, size: 16, color: COL.muted }, { fx: 'fade', auto: true, dur: 300 });
    });
    s.text([run('Auftrag: '), run('Baut ein Rätsel für die Klasse.', { color: COL.orange, bold: true }), run(' Dazu 3 Regeln und 1 Merksatz.')], { x: 0.8, y: 5.05, w: 8.4, h: 0.9, size: 20 }, { fx: 'fade', c: true });
    s.img(I.timer, { x: 9.6, y: 5.2, w: 0.8, h: 0.8 }, { fx: 'zoom', c: true, dur: 400 });
    s.text('15 MIN', { x: 10.5, y: 5.05, w: 2.2, h: 1.1, valign: 'middle', font: SERIF, size: 50, bold: true, color: COL.orange, glow: 12, glowOp: 0.4 }, { fx: 'stamp', a: true, dur: 420 });
    body(s, 'Dann 2 Minuten pro Gruppe: Die Klasse rät zuerst, ihr löst auf.', 0.8, 6.35, 11.7, 0.45, { size: 17, italic: true }, { fx: 'fade', a: true });
  }
  {
    const s = add({ bg: 'bg_center.jpg', transition: 'fade', notes: `
So baut ihr das Plakat. Einmal kurz durchgehen, dann starten.
🖱 4 Klicks, je ein Schritt.
Tipp: Die Schilder-Streifen auf den Arbeitsblättern ausschneiden und aufkleben. Autos als Klebezettel kann man bei der Vorstellung verschieben.
Farbcode für alle gleich: Grün = darf, Rot = verboten.` });
    footer(s);
    kicker(s, 'So geht euer Plakat', 0.8, 0.9);
    title(s, '4 Schritte zum Plakat', 0.75, 1.3, 6.3, 1.0, { size: 42 });
    const st = [[I.ruler, 'Szene oder Tabelle zeichnen', 'Groß, mit Lineal. Straße von oben oder drei Spalten.'], [I.note, 'Schilder aufkleben', 'Streifen vom Blatt ausschneiden. Autos als Klebezettel.'], [I.palette, 'Farben nutzen', 'Grün: darf, Rot: verboten. Pfeile zeigen den Weg.'], [I.pres, 'Merksatz unten', 'Höchstens 8 Wörter. Groß.']];
    st.forEach(([ic, t, d], i) => {
      const y = 2.5 + i * 1.08;
      s.oval(0.8, y, 0.8, 0.8, { fill: '241A12', line: COL.orange, lw: 2 }, { fx: 'zoom', c: true, dur: 350 });
      s.img(ic, { x: 0.98, y: y + 0.18, w: 0.44, h: 0.44 }, { fx: 'fade', dur: 250 });
      s.text(t, { x: 1.8, y: y - 0.02, w: 5.2, h: 0.45, size: 21, bold: true }, { fx: 'fade', dur: 250 });
      s.text(d, { x: 1.8, y: y + 0.42, w: 5.2, h: 0.42, size: 16, color: COL.muted }, { fx: 'fade', dur: 250 });
    });
    const px = 7.45, py = 1.35, pw = 5.1, ph = 5.35;
    s.rrect(px, py, pw, ph, { fill: 'F4EFE6', rr: 0.05, shadow: true }, { fx: 'rise', auto: true, dur: 800 });
    s.text('WOHIN GEHÖRT ES?', { x: px + 0.2, y: py + 0.15, w: pw - 0.4, h: 0.5, size: 20, bold: true, color: '1F2A3A', align: 'center' }, { fx: 'fade', auto: true });
    [['Gefahr', 'C62828'], ['Vorschrift', '1F4FA3'], ['Richtung', '2E7D4F']].forEach(([t, c], i) => {
      const x = px + 0.25 + i * 1.57;
      s.rect(x, py + 0.8, 1.45, 3.2, { fill: 'FFFFFF', line: c, lw: 2 }, { fx: 'fade', auto: true });
      s.text(t, { x, y: py + 0.85, w: 1.45, h: 0.35, size: 15, bold: true, color: c, align: 'center' }, { fx: 'fade', auto: true });
    });
    [['142_10', 0, 1.35], ['138_10', 0, 2.35], ['267', 1, 1.35], ['274_70', 1, 2.35], ['357', 2, 1.35], ['330_1', 2, 2.35]].forEach(([id, c, dy]) => { const h = 0.75, w = signW(id, h); sign(s, id, px + 0.25 + c * 1.57 + 0.725 - w / 2, py + dy, h, { fx: 'zoom', auto: true, a: true, dur: 250 }); });
    s.text('MERKSATZ: ______________', { x: px + 0.3, y: py + 4.55, w: pw - 0.6, h: 0.45, size: 16, bold: true, color: 'C0501A' }, { fx: 'fade', auto: true });
  }

  // ================= FINALE =================
  {
    const s = add({ bg: 'bg_bokeh.jpg', transition: 'fade', notes: `
Die Merksätze von Lektion 6. Vor jedem Klick die Klasse den Satz ergänzen lassen.
🖱 6 Klicks.` });
    footer(s);
    kicker(s, 'Zum Mitnehmen', 0.8, 0.9);
    title(s, 'Sechs Sätze zum Lesen der Straße', 0.75, 1.3, 12, 1.0, { size: 42 });
    const M = [['Dreieck warnt, Kreis regelt, Rechteck informiert.', I6.sign], ['Zusatzzeichen gelten nur für das Zeichen darüber.', I6.book],
      ['Streckenverbote enden nicht an der Kreuzung.', I.car], ['Gelb schlägt Weiß.', I6.bar],
      ['Nur ein Leitpfosten zu sehen? Höchstens 50 km/h.', I6.fog], ['Am Bahnübergang hat der Zug immer Vorrang.', I6.train]];
    M.forEach(([t, ic], i) => {
      const x = 0.8 + (i % 2) * 6.0, y = 2.55 + Math.floor(i / 2) * 1.3;
      s.rrect(x, y, 5.7, 1.1, { fill: COL.card, line: '3A4455', rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 500 });
      s.img(ic, { x: x + 0.3, y: y + 0.27, w: 0.56, h: 0.56 }, { fx: 'zoom', dur: 300 });
      s.text(t, { x: x + 1.1, y: y + 0.08, w: 4.45, h: 0.94, size: 19, bold: true, valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
  }
  {
    const s = add({ bg: 'bg_schilder.jpg', transition: 'black', footer: false, notes: `
Schluss des Abends. Langsam, dann Pause.
▶ Ihr habt heute gelernt, wer zuerst fahren darf und wie man die Straße liest. Beides gehört zusammen: Wer die Zeichen früh liest, muss selten scharf bremsen.
🖱 1 Klick: Verabschiedung.
Plakate aufhängen lassen. Nächstes Mal: Lektion 7 und 8.` });
    title(s, 'Wer lesen kann,\nsieht die Gefahr zuerst.', 0.8, 1.9, 8, 2.6, { size: 58 }, { fx: 'fade', auto: true, dur: 1500 });
    s.text('Danke für heute. Bis zum nächsten Mal.', { x: 0.8, y: 4.75, w: 8, h: 0.8, font: SERIF, size: 32, italic: true, color: COL.orange }, { fx: 'rise', c: true, dur: 1000 });
  }
};
