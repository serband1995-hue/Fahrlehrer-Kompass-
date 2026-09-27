// Lektion 11 „Besondere Situationen: Licht & Sicht · Blaulicht · Tunnel“ (Fahrschule Boost · Fahrlehrer Serband)
const pptxgen = require('pptxgenjs');
const path = require('path');
const { Deck, COL, SERIF, W, H, icon, finalize } = require('./lib');
const { X0, SC } = require('./gen11');

// ---------- kleine Bausteine (wie Lektion 12) ----------
function footer(s) {
  s.text('FAHRLEHRER SERBAND', { x: W - 3.3, y: 0.32, w: 2.8, h: 0.25, size: 10, bold: true, cs: 3, color: COL.dim, align: 'right', name: '!!ft' });
}
function kicker(s, t, x, y, o = {}, anim) {
  return s.text(t.toUpperCase(), { x, y, w: o.w || 9, h: 0.35, size: o.size || 13, bold: true, cs: 5, color: o.color || COL.orange, name: o.name, align: o.align }, anim);
}
function title(s, t, x, y, w, h, o = {}, anim) {
  return s.text(t, { x, y, w, h, font: SERIF, size: o.size || 44, bold: o.bold ?? true, color: o.color || COL.txt, lsm: o.lsm || 0.95, name: o.name, align: o.align, valign: o.valign }, anim);
}
const run = (text, o = {}) => ({ text, options: o });
function chip(s, t, x, y, w, o = {}, anim) {
  return s.text(t, { x, y, w, h: o.h || 0.5, size: o.size || 16, bold: o.bold ?? true, color: o.color || COL.txt, fill: o.fill || COL.card2, ft: o.ft, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.25, align: 'center', valign: 'middle', line: o.line, lw: o.lw, name: o.name }, anim);
}
const BLUE = '4A8BFF', GREEN = '3FD17A';

// Quiz: Frage steht, Antwort erst auf Klick
function quiz(s, items, col = COL.orange) {
  items.forEach(([q, a], i) => {
    const y = 2.45 + i * 1.5;
    s.oval(0.8, y + 0.12, 0.72, 0.72, { fill: '1A202B', line: col, lw: 2 });
    s.text(String(i + 1), { x: 0.8, y: y + 0.12, w: 0.72, h: 0.72, font: SERIF, size: 26, bold: true, color: col, align: 'center', valign: 'middle' });
    s.text(q, { x: 1.8, y, w: 5.55, h: 0.96, size: 20, bold: true, valign: 'middle' });
    s.rrect(7.55, y + 0.03, 5.0, 0.9, { fill: col, rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
    s.text(a, { x: 7.8, y: y + 0.03, w: 4.6, h: 0.9, size: 18, bold: true, color: '0B0D10', valign: 'middle' }, { fx: 'rise', dur: 600 });
  });
}
// Kapitel-Opener
function opener(deck, bg, nr, t, sub, notes, col = COL.orange) {
  const s = deck.add({ bg, transition: 'black', footer: false, notes });
  s.text(nr, { x: 0.8, y: 1.2, w: 5, h: 2.6, font: SERIF, size: 200, bold: true, color: col, glow: 18, glowColor: col, glowOp: 0.3 }, { fx: 'fade', auto: true, dur: 900 });
  title(s, t, 0.8, 3.95, 11.5, 1.3, { size: 66 }, { fx: 'rise', auto: true, a: true, dur: 900 });
  s.text(sub, { x: 0.85, y: 5.3, w: 11, h: 0.6, size: 24, color: COL.txt, shadow: true }, { fx: 'fade', auto: true, a: true });
  return s;
}

async function build() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'Lektion 11 – Besondere Situationen';
  pres.author = 'Fahrlehrer Serband · Fahrschule Boost';
  const deck = new Deck(pres);
  const I = {};
  for (const [k, n, c] of [
    ['eye', 'LuEye', COL.orange], ['fog', 'LuCloudFog', COL.orange], ['siren', 'LuSiren', BLUE], ['amb', 'LuAmbulance', BLUE],
    ['tunnel', 'LuTrafficCone', COL.amber], ['flame', 'LuFlame', COL.red], ['door', 'LuDoorOpen', GREEN], ['phone', 'LuPhoneCall', COL.amber],
    ['radio', 'LuRadio', COL.amber], ['glasses', 'LuGlasses', COL.amber], ['key', 'LuKeyRound', GREEN], ['bulb', 'LuLightbulb', COL.amber],
    ['users', 'LuUsers', COL.orange], ['timer', 'LuTimer', COL.orange], ['check', 'LuCircleCheck', GREEN], ['x', 'LuCircleX', COL.red],
    ['undo', 'LuUndo2', COL.amber], ['gap', 'LuMoveRight', COL.amber], ['alert', 'LuTriangleAlert', COL.amber], ['alertR', 'LuTriangleAlert', COL.red],
    ['horn', 'LuVolume2', COL.orange], ['sun', 'LuSun', COL.amber], ['moon', 'LuMoon', COL.orange], ['gauge', 'LuGauge', COL.orange],
    ['hand', 'LuHand', COL.orange], ['brain', 'LuBrain', COL.orange], ['pin', 'LuMapPin', COL.orange], ['coffee', 'LuCoffee', COL.orange],
    ['list', 'LuClipboardList', COL.orange], ['wrench', 'LuWrench', COL.amber], ['rain', 'LuCloudRain', COL.orange], ['lock', 'LuLockOpen', GREEN],
    ['sirenW', 'LuSiren', COL.txt], ['eyeB', 'LuEye', BLUE], ['eyeA', 'LuEye', COL.amber], ['shield', 'LuShieldAlert', COL.orange],
  ]) I[k] = await icon(n, c);

  // ============ 1 · TITEL ============
  {
    const s = deck.add({ bg: 'bg_bokeh.jpg', transition: 'fade', footer: false, notes: `
▶ Begrüßen. Heute geht es um drei Situationen, in denen Sekunden zählen: nachts und bei Nebel, wenn Blaulicht kommt, und im Tunnel.
🖱 Alles baut sich von selbst auf.` });
    s.img('boost_logo.png', { x: 0.8, y: 0.7, w: 2.6, h: 2.6 * 203 / 517, name: '!!logo' }, { fx: 'fade', auto: true, dur: 900 });
    kicker(s, 'Lektion 11 · Grundstoff', 0.8, 2.75, { name: '!!kick' }, { fx: 'float', auto: true, a: true });
    title(s, 'Besondere\nSituationen', 0.75, 3.15, 9, 2.6, { size: 80, name: '!!t' }, { fx: 'rise', auto: true, a: true, dur: 1100 });
    s.text('Licht & Sicht  ·  Blaulicht  ·  Tunnel', { x: 0.8, y: 5.95, w: 9, h: 0.45, size: 22, color: COL.muted, name: '!!sub' }, { fx: 'fade', auto: true, a: true });
  }

  // ---------- Szene Draufsicht Nacht (Hook + Lichtkegel) ----------
  const xAt = m => X0 + SC * m;
  const scene = (s, beam = 'low') => {
    const b = beam === 'low' ? { x: X0, y: 4.35, w: 5.2, h: 1.1 } : { x: X0, y: 4.02, w: 11.5, h: 1.76 };
    s.img('beam.png', { ...b, name: '!!beam' });
    s.img('car_du.png', { x: 0.5, y: 4.4, w: 0.5, h: 1.0, rotate: 90, name: '!!car' });
  };
  const ped = (s, file, m, name, anim) => s.img(file, { x: xAt(m) - 0.13, y: 4.98, w: 0.26, h: 0.52, name }, anim);

  // ============ 2 · HOOK: SIEHST DU IHN? ============
  {
    const s = deck.add({ bg: 'sc_side.jpg', transition: 'black', notes: `
▶ Licht aus im Raum, wenn möglich. Situation schildern: Landstraße, 22 Uhr, du fährst 80 km/h mit Abblendlicht.
❓ Frage: Seht ihr etwas auf der Straße?
🖱 Klick 1: Ein Fußgänger in dunkler Kleidung taucht auf. Viele sehen ihn erst jetzt.
🖱 Klick 2: Die Entfernung: 25 Meter.
➜ Weiter: Schaffst du es noch anzuhalten?` });
    footer(s);
    kicker(s, 'Landstraße · 22 Uhr · 80 km/h', 0.8, 0.9, { name: '!!k' });
    title(s, 'Siehst du ihn?', 0.75, 1.3, 11, 1.2, { size: 54, name: '!!t' });
    scene(s);
    ped(s, 'ped_dark.png', 25, '!!p25', { fx: 'fade', c: true, dur: 1600 });
    chip(s, '25 m', xAt(25) - 0.5, 5.9, 1.0, { size: 16, fill: '1A202B', line: '3A4455', name: '!!l25' }, { fx: 'rise', c: true });
  }

  // ============ 3 · HOOK AUFLÖSUNG (Morph) ============
  {
    const s = deck.add({ bg: 'sc_side.jpg', transition: 'morph', dur: 1100, notes: `
▶ Rechnen wir mit der Faustformel.
🖱 Klick 1: Reaktionsweg: 80 geteilt durch 10, mal 3 = 24 Meter. So weit fährst du, bevor du überhaupt bremst. Der Fußgänger steht bei 25 Metern.
🖱 Klick 2: Selbst mit Gefahrbremsung kommen noch 32 Meter Bremsweg dazu: (80/10)² : 2 = 32. Zusammen 56 Meter.
🖱 Klick 3: Stempel. Keine Chance.
❓ Frage: Was hätte ihm oder dir geholfen? ✅ Langsamer fahren, Fernlicht wenn möglich, und er: helle Kleidung oder Reflektoren. Genau darum geht es jetzt.` });
    footer(s);
    kicker(s, 'Landstraße · 22 Uhr · 80 km/h', 0.8, 0.9, { name: '!!k' });
    title(s, 'Schaffst du es anzuhalten?', 0.75, 1.3, 11, 1.2, { size: 54, name: '!!t' });
    scene(s);
    ped(s, 'ped_dark.png', 25, '!!p25');
    chip(s, '25 m', xAt(25) - 0.5, 5.9, 1.0, { size: 16, fill: '1A202B', line: '3A4455', name: '!!l25' });
    s.rect(X0, 6.55, SC * 24, 0.32, { fill: COL.amber }, { fx: 'wipeR', c: true, dur: 900 });
    s.text('Reaktion 24 m', { x: X0, y: 6.95, w: 2.4, h: 0.35, size: 15, bold: true, color: COL.amber }, { fx: 'fade', dur: 400 });
    s.rect(xAt(24), 6.55, SC * 32, 0.32, { fill: COL.red }, { fx: 'wipeR', c: true, dur: 900 });
    s.text('+ Gefahrbremsung 32 m = 56 m', { x: xAt(24) + 0.1, y: 6.95, w: 4.2, h: 0.35, size: 15, bold: true, color: COL.red }, { fx: 'fade', dur: 400 });
    s.text('KEINE CHANCE', { x: 8.3, y: 6.2, w: 4.2, h: 0.85, size: 34, bold: true, cs: 3, color: 'FFFFFF', fill: COL.red, shape: pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle', rotate: -4, glow: 16, glowColor: COL.red, glowOp: 0.45 }, { fx: 'stamp', c: true, dur: 420 });
  }

  // ============ 4 · HEUTE ============
  {
    const s = deck.add({ bg: 'bg_orange.jpg', transition: 'fade', notes: `
▶ Unser Fahrplan für heute: drei besondere Situationen. Am Ende arbeitet jede Gruppe eines davon aus.
🖱 3 Klicks: je Kapitel eine Karte.` });
    footer(s);
    kicker(s, 'Heute', 0.8, 0.9);
    title(s, 'Drei Situationen, in denen Sekunden zählen', 0.75, 1.3, 12, 1.0, { size: 40 });
    const cards = [['01', 'Licht & Sicht', 'Nacht, Blendung, Nebel, Wild', I.eye], ['02', 'Blaulicht', 'Platz machen, Rettungsgasse', I.siren], ['03', 'Tunnel', 'Stau, Panne, Brand', I.flame]];
    cards.forEach(([n, t, d, ic], i) => {
      const x = 0.8 + i * 3.97;
      s.rrect(x, 2.75, 3.75, 3.4, { fill: COL.card, line: COL.line, rr: 0.14, shadow: true }, { fx: 'rise', c: true, dur: 650 });
      s.text(n, { x: x + 0.35, y: 2.95, w: 1.8, h: 1.1, font: SERIF, size: 60, bold: true, color: COL.orange }, { fx: 'fade', dur: 400 });
      s.img(ic, { x: x + 2.75, y: 3.2, w: 0.7, h: 0.7 }, { fx: 'zoom', dur: 400 });
      s.text(t, { x: x + 0.35, y: 4.25, w: 3.2, h: 0.7, font: SERIF, size: 30, bold: true }, { fx: 'fade', dur: 400 });
      s.text(d, { x: x + 0.35, y: 5.0, w: 3.2, h: 0.8, size: 17, color: COL.muted }, { fx: 'fade', dur: 400 });
    });
    s.img(I.users, { x: 0.8, y: 6.45, w: 0.42, h: 0.42 }, { fx: 'fade', c: true });
    s.text('Danach: Gruppenarbeit, jede Gruppe ein Thema', { x: 1.4, y: 6.45, w: 9, h: 0.42, size: 18, bold: true, color: COL.amber, valign: 'middle' }, { fx: 'fade' });
  }

  // ============ 5 · KAPITEL 1 ============
  opener(deck, 'bg_night.jpg', '01', 'Licht & Sicht', 'Sehen und gesehen werden', `
▶ Kapitel 1. Erst die Lichter am Auto, dann Blendung, Nebel und Wild.`);

  // ============ 6 · SYMBOL-QUIZ: WELCHES LICHT WANN? ============
  {
    const s = deck.add({ bg: 'bg_night.jpg', transition: 'fade', notes: `
▶ Diese Symbole seht ihr im Cockpit.
❓ Frage vor jedem Klick: Welche Leuchte ist das, und wann benutzt man sie?
🖱 5 Klicks, je Symbol die Auflösung:
1. Standlicht: nur zum Halten oder Parken. Mit Standlicht allein darf man nicht fahren (§ 17 Abs. 2 StVO).
2. Abblendlicht: bei Dämmerung, Dunkelheit, erheblicher Sichtbehinderung und im Tunnel (Zeichen 327).
3. Fernlicht: bei Dunkelheit auf Straßen ohne durchgehende Beleuchtung, wenn du niemanden blendest (auch innerorts erlaubt).
4. Nebelscheinwerfer: wenn Nebel, Schnee oder Regen die Sicht erheblich behindern.
5. Nebelschlussleuchte: nur bei Nebel und Sicht unter 50 m (§ 17 Abs. 3 StVO).` });
    footer(s);
    kicker(s, 'Cockpit-Check', 0.8, 0.9);
    title(s, 'Welche Leuchte ist das? Und wann?', 0.75, 1.3, 12, 1.0, { size: 40 });
    const sy = [['sym_stand.png', 'Standlicht', 'Nur Halten oder Parken. Nie zum Fahren.'],
      ['sym_abblend.png', 'Abblendlicht', 'Dämmerung, Dunkelheit, schlechte Sicht, Tunnel'],
      ['sym_fern.png', 'Fernlicht', 'Dunkle Straße ohne Beleuchtung, niemand wird geblendet'],
      ['sym_nebelv.png', 'Nebel­scheinwerfer', 'Nebel, Schnee oder Regen mit starker Sichtbehinderung'],
      ['sym_nebelh.png', 'Nebel­schlussleuchte', 'Nur bei Nebel und Sicht unter 50 m']];
    const cw = 2.25, gap = 0.18, x0 = (W - (5 * cw + 4 * gap)) / 2;
    sy.forEach(([f, t, d], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.6, cw, 4.2, { fill: COL.card, line: COL.line, rr: 0.12 });
      s.img(f, { x: x + 0.43, y: 2.85, w: 1.39, h: 1.26 });
      s.text(t, { x: x + 0.15, y: 4.35, w: cw - 0.3, h: 0.8, font: SERIF, size: 20, bold: true, align: 'center', valign: 'middle' }, { fx: 'rise', c: true, dur: 500 });
      s.text(d, { x: x + 0.15, y: 5.2, w: cw - 0.3, h: 1.45, size: 15, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 500 });
    });
  }

  // ============ 7 · TAGFAHRLICHT-FALLE ============
  {
    const s = deck.add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
▶ Häufiger Fehler: Das Auto ist vorne hell, also denkt man, das Licht ist an.
🖱 Klick 1: Bei vielen Autos bleiben mit Tagfahrlicht die Rückleuchten aus. Von hinten bist du in der Dämmerung, im Regen oder im Tunnel fast unsichtbar.
🖱 Klick 2: Merksatz: Sobald es dunkler wird: Abblendlicht an. Lichtschalter auf AUTO ist gut, aber im Nebel oft nicht genug, dann selbst einschalten.` });
    title(s, 'Tagfahrlicht ist kein Abblendlicht.', 0.8, 1.4, 11.7, 1.3, { size: 58, align: 'center' }, { fx: 'fade', auto: true, dur: 1200 });
    chip(s, 'Vorne hell  ✓', 2.6, 3.9, 3.7, { size: 24, h: 0.8, fill: '12161E', line: GREEN, color: GREEN }, { fx: 'rise', c: true });
    chip(s, 'Hinten oft dunkel  ✗', 7.0, 3.9, 3.7, { size: 24, h: 0.8, fill: '12161E', line: COL.red, color: COL.red }, { fx: 'rise', a: true });
    s.text([run('Wird es dunkler: '), run('Abblendlicht an.', { color: COL.orange })], { x: 0.8, y: 5.25, w: 11.7, h: 0.9, font: SERIF, size: 36, italic: true, align: 'center' }, { fx: 'rise', c: true, dur: 900 });
  }

  // ============ 8 · LICHTKEGEL: ABBLENDLICHT ============
  {
    const s = deck.add({ bg: 'sc_side.jpg', transition: 'fade', notes: `
▶ Das Abblendlicht leuchtet etwa 50 bis 60 Meter weit. Aber wann siehst du einen Menschen darin?
🖱 Klick 1: Dunkle Kleidung: erst bei etwa 25 Metern.
🖱 Klick 2: Helle Kleidung: etwa 40 Meter.
🖱 Klick 3: Mit Reflektoren: bis zu 140 Meter. Also mehr als das Fünffache.
❓ Frage: Was heißt das für euch als Fußgänger oder Radfahrer? ✅ Helle Kleidung und Reflektoren. Gesehen werden ist genauso wichtig wie sehen.
➜ Weiter: Und mit Fernlicht?` });
    footer(s);
    kicker(s, 'Sehen und gesehen werden', 0.8, 0.9, { name: '!!k' });
    title(s, 'Abblendlicht: rund 50–60 m', 0.75, 1.3, 11, 1.2, { size: 48, name: '!!t' });
    scene(s, 'low');
    ped(s, 'ped_dark.png', 25, '!!p25', { fx: 'fade', c: true, dur: 900 });
    chip(s, 'dunkel: 25 m', xAt(25) - 0.85, 5.9, 1.7, { size: 15, fill: '1A202B', line: '3A4455', name: '!!l25' }, { fx: 'rise' });
    ped(s, 'ped_light.png', 40, '!!p40', { fx: 'fade', c: true, dur: 900 });
    chip(s, 'hell: 40 m', xAt(40) - 0.75, 6.5, 1.5, { size: 15, fill: '1A202B', line: '3A4455', name: '!!l40' }, { fx: 'rise' });
    ped(s, 'ped_refl.png', 140, '!!p140', { fx: 'fade', c: true, dur: 900 });
    chip(s, 'Reflektoren: 140 m', 10.2, 5.9, 2.35, { size: 15, fill: '2A2A14', line: 'F7FF9A', color: 'F7FF9A', name: '!!l140' }, { fx: 'rise' });
  }

  // ============ 9 · LICHTKEGEL: FERNLICHT (Morph) ============
  {
    const s = deck.add({ bg: 'sc_side.jpg', transition: 'morph', dur: 1300, notes: `
▶ Fernlicht leuchtet mindestens 100 Meter weit, moderne Scheinwerfer noch weiter. Jetzt siehst du alle drei.
❓ Frage: Wann musst du abblenden? Sammeln.
🖱 3 Klicks: Gegenverkehr. Wenn du dicht hinter jemandem fährst. Und auf Straßen mit ausreichender Beleuchtung ist Fernlicht nicht erlaubt (§ 17 Abs. 2 StVO).` });
    footer(s);
    kicker(s, 'Sehen und gesehen werden', 0.8, 0.9, { name: '!!k' });
    title(s, 'Fernlicht: 100 m und mehr', 0.75, 1.3, 11, 1.2, { size: 48, name: '!!t' });
    scene(s, 'high');
    ped(s, 'ped_dark.png', 25, '!!p25'); ped(s, 'ped_light.png', 40, '!!p40'); ped(s, 'ped_refl.png', 140, '!!p140');
    s.text('ABBLENDEN BEI:', { x: 0.8, y: 6.25, w: 2.4, h: 0.55, size: 15, bold: true, cs: 3, color: COL.orange, valign: 'middle' });
    ['Gegenverkehr', 'Vorausfahrenden', 'beleuchteter Straße'].forEach((t, i) =>
      chip(s, t, 3.25 + i * 3.1, 6.25, 2.9, { size: 17, h: 0.55, fill: '1A202B', line: COL.orange }, { fx: 'rise', c: true }));
  }

  // ============ 10 · GEBLENDET ============
  {
    const s = deck.add({ bg: 'bg_night.jpg', transition: 'fade', notes: `
▶ Jemand blendet dich. Für einige Sekunden bist du praktisch blind.
🖱 3 Klicks:
1. Nicht in die Scheinwerfer schauen, sondern an den rechten Fahrbahnrand.
2. Tempo runter.
3. Wenn nötig anhalten. Nicht zurückblenden, sonst sind zwei Fahrer blind.` });
    footer(s);
    kicker(s, 'Blendung', 0.8, 0.9);
    title(s, 'Geblendet? Drei Schritte.', 0.75, 1.3, 12, 1.0, { size: 44 });
    const st = [[I.eye, 'Blick nach rechts', 'An den rechten Fahrbahnrand schauen, nicht ins Licht'], [I.gauge, 'Tempo runter', 'Du siehst gerade kaum etwas'], [I.hand, 'Notfalls anhalten', 'Nicht zurückblenden!']];
    st.forEach(([ic, t, d], i) => {
      const y = 2.75 + i * 1.3;
      s.rrect(0.8, y, 11.7, 1.1, { fill: COL.card, line: COL.line, rr: 0.12 }, { fx: 'flyL', c: true, dur: 650 });
      s.text(String(i + 1), { x: 1.05, y: y + 0.15, w: 0.8, h: 0.8, font: SERIF, size: 40, bold: true, color: COL.orange, valign: 'middle' }, { fx: 'fade', dur: 300 });
      s.img(ic, { x: 1.9, y: y + 0.3, w: 0.5, h: 0.5 }, { fx: 'fade', dur: 300 });
      s.text(t, { x: 2.7, y: y + 0.15, w: 3.9, h: 0.8, font: SERIF, size: 26, bold: true, valign: 'middle' }, { fx: 'fade', dur: 300 });
      s.text(d, { x: 6.6, y: y + 0.15, w: 5.7, h: 0.8, size: 18, color: COL.muted, valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
  }

  // ============ 11 · FAHREN AUF SICHT ============
  {
    const s = deck.add({ bg: 'bg_night.jpg', transition: 'fade', notes: `
▶ Die wichtigste Regel für die Nacht: Du musst innerhalb der Strecke anhalten können, die du überblickst (§ 3 Abs. 1 StVO). Man sagt: Fahren auf Sicht.
▶ Die gestrichelte Linie ist die Reichweite des Abblendlichts, rund 50 bis 60 Meter.
🖱 3 Klicks: Anhalteweg mit normaler Bremsung (Faustformel).
50 km/h: 15 + 25 = 40 m. Passt.
80 km/h: 24 + 64 = 88 m. Deutlich zu lang.
100 km/h: 30 + 100 = 130 m. Mehr als doppelt so weit wie dein Licht.
🖱 Klick 4: Merksatz.` });
    footer(s);
    kicker(s, 'Fahren auf Sicht · § 3 Abs. 1 StVO', 0.8, 0.9);
    title(s, 'Reicht dein Licht für deinen Anhalteweg?', 0.75, 1.3, 12, 1.0, { size: 40 });
    const bx = 2.5, sc = 0.068; // Zoll pro Meter
    const lx = bx + 55 * sc;
    s.rect(bx, 2.75, 50 * sc, 3.05, { fill: 'FFE8B0', ft: 90 });
    s.rect(bx + 50 * sc, 2.75, 10 * sc, 3.05, { fill: 'FFE8B0', ft: 94 });
    s.lineS(lx, 2.6, lx, 5.95, { color: 'FFE8B0', lw: 2, dash: 'dash' });
    s.text('Abblendlicht ≈ 50–60 m', { x: lx - 1.6, y: 2.25, w: 3.2, h: 0.35, size: 15, bold: true, color: 'FFE8B0', align: 'center' });
    const rows = [[50, 15, 25], [80, 24, 64], [100, 30, 100]];
    rows.forEach(([v, r, b], i) => {
      const y = 3.0 + i * 0.95;
      s.text(`${v} km/h`, { x: 0.8, y, w: 1.55, h: 0.6, size: 20, bold: true, valign: 'middle' }, { fx: 'fade', c: true, dur: 300 });
      s.rect(bx, y + 0.08, r * sc, 0.44, { fill: COL.amber }, { fx: 'wipeR', dur: 500 });
      s.rect(bx + r * sc, y + 0.08, b * sc, 0.44, { fill: r + b > 60 ? COL.red : GREEN }, { fx: 'wipeR', a: true, dur: 700 });
      s.text(`${r + b} m`, { x: bx + (r + b) * sc + 0.12, y, w: 1.2, h: 0.6, size: 20, bold: true, color: r + b > 60 ? COL.red : GREEN, valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
    s.rect(bx, 6.12, 0.3, 0.2, { fill: COL.amber }); s.text('Reaktionsweg', { x: bx + 0.4, y: 6.05, w: 2, h: 0.35, size: 14, color: COL.muted });
    s.rect(bx + 2.3, 6.12, 0.3, 0.2, { fill: GREEN }); s.rect(bx + 2.6, 6.12, 0.3, 0.2, { fill: COL.red }); s.text('Bremsweg (normal): passt / zu lang', { x: bx + 3.0, y: 6.05, w: 4, h: 0.35, size: 14, color: COL.muted });
    s.text([run('Nachts gilt: '), run('Tempo runter, bis du im Licht anhalten kannst.', { color: COL.orange })], { x: 0.8, y: 6.55, w: 11.7, h: 0.55, font: SERIF, size: 24, italic: true }, { fx: 'rise', c: true });
  }

  // ============ 12 · NEBEL-REGLER ============
  {
    const s = deck.add({ bg: 'sc_fog.jpg', transition: 'fade', notes: `
▶ Klare Nacht. Vor dir ein Auto, rechts und links die Leitpfosten.
🖱 Klick 1: Nebel zieht auf. Behindert er die Sicht erheblich: Abblendlicht, auch am Tag. Dann sind auch Nebelscheinwerfer erlaubt (§ 17 Abs. 3 StVO).
🖱 Klick 2: Dichter Nebel. Das Auto vor dir ist weg. Sicht unter 50 m: höchstens 50 km/h (§ 3 Abs. 1 StVO, gilt auch bei Schnee und Regen). Nur bei Nebel darf jetzt die Nebelschlussleuchte an.
🖱 Klick 3: Trick: Leitpfosten stehen auf gerader Strecke alle 50 m (in Kurven dichter). Siehst du nur noch den nächsten, hast du etwa 50 m Sicht.
Wichtig: Nebelschlussleuchte wieder aus, wenn die Sicht besser wird. Sie blendet den Hintermann.` });
    const fog1 = s.img('fog1.png', { x: 0, y: 0, w: W, h: H });
    const fog2 = s.img('fog2.png', { x: 0, y: 0, w: W, h: H });
    // Auto voraus (ca. 70 m)
    const car = s.rrect(6.98, 3.62, 0.58, 0.3, { fill: '0E1116', rr: 0.08 });
    const l1 = s.img('glow_red.png', { x: 6.86, y: 3.6, w: 0.3, h: 0.3 }), l2 = s.img('glow_red.png', { x: 7.38, y: 3.6, w: 0.3, h: 0.3 });
    s.rrect(0.6, 0.55, 7.2, 1.35, { fill: '07080B', ft: 25, rr: 0.12 });
    kicker(s, 'Nebel-Regler', 0.9, 0.72);
    title(s, 'Wie viel siehst du noch?', 0.85, 1.1, 6.8, 0.9, { size: 40 });
    
    const card = (x, col, t, d) => {
      const a = s.rrect(x, 5.95, 3.8, 1.05, { fill: '0B0D11', ft: 8, line: col, lw: 1.5, rr: 0.12 });
      const b = s.text(t, { x: x + 0.2, y: 6.02, w: 3.4, h: 0.4, size: 17, bold: true, color: col });
      const c = s.text(d, { x: x + 0.2, y: 6.4, w: 3.4, h: 0.55, size: 14, color: COL.txt });
      return [a, b, c];
    };
    card(0.6, COL.muted, 'Klare Nacht', 'Abblendlicht, Fernlicht wenn frei');
    const c2 = card(4.77, COL.amber, 'Starke Sichtbehinderung', 'Abblendlicht auch am Tag, Nebelscheinwerfer erlaubt');
    const c3 = card(8.93, COL.red, 'Nebel, Sicht unter 50 m', 'Max. 50 km/h + Nebelschlussleuchte');
    const tip = chip(s, 'Trick: Leitpfosten alle 50 m (gerade Strecke)', 8.53, 0.75, 4.2, { size: 16, h: 0.6, fill: '07080B', ft: 15, line: COL.orange });
    // Reihenfolge der Animationen
    s.reg(fog1, { fx: 'fade', c: true, dur: 1500 }, 'pic');
    c2.forEach((n, i) => s.reg(n, { fx: i === 0 ? 'rise' : 'fade', dur: 500 }, 'sp'));
    s.reg(fog2, { fx: 'fade', c: true, dur: 1500 }, 'pic');
    [car].forEach(n => s.reg(n, { fx: 'out', dur: 1200 }, 'sp'));
    [l1, l2].forEach(n => s.reg(n, { fx: 'out', dur: 1200 }, 'pic'));
    c3.forEach((n, i) => s.reg(n, { fx: i === 0 ? 'rise' : 'fade', dur: 500 }, 'sp'));
    s.reg(tip, { fx: 'rise', c: true }, 'sp');
  }

  // ============ 13 · DIE 50er-REGEL ============
  {
    const s = deck.add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
▶ Eine Zahl für alles: 50.
🖱 3 Klicks: Sicht unter 50 Meter. Dann höchstens 50 km/h (auch bei Schnee oder Regen). Und erst dann darf die Nebelschlussleuchte an, aber nur bei Nebel, nicht bei Regen oder Schnee.
❓ Frage: Gilt das auch auf der Autobahn? ✅ Ja, überall.
🖱 Klick 4: Merksatz.` });
    kicker(s, 'Merk dir eine Zahl', 0.8, 1.0, { w: 11.7, align: 'center' });
    const items = [['50', 'm', 'Sicht unter'], ['50', 'km/h', 'höchstens'], ['DARF AN', '', 'Nebelschlussleuchte']];
    items.forEach(([n, u, t], i) => {
      const x = 1.15 + i * 3.9;
      s.oval(x, 1.9, 3.1, 3.1, { fill: '12161E', line: i === 2 ? COL.red : COL.orange, lw: 4, glow: 12, glowColor: i === 2 ? COL.red : COL.orange, glowOp: 0.3 }, { fx: 'zoom', c: true, dur: 500 });
      s.text(t, { x: x + 0.2, y: 2.35, w: 2.7, h: 0.5, size: 16, bold: true, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 300 });
      s.text([run(n, { fontFace: SERIF, fontSize: n.length > 2 ? 44 : 80, bold: true }), run(u ? ' ' + u : '', { fontSize: 26, bold: true })], { x, y: 2.85, w: 3.1, h: 1.5, align: 'center', valign: 'middle', color: i === 2 ? COL.red : COL.txt }, { fx: 'fade', dur: 300 });
    });
    s.text('Gilt überall. Nebelschlussleuchte nur bei Nebel.', { x: 0.8, y: 5.6, w: 11.7, h: 0.7, font: SERIF, size: 30, italic: true, color: COL.orange, align: 'center' }, { fx: 'rise', c: true });
  }

  // ============ 14 · WILDWECHSEL ============
  {
    const s = deck.add({ bg: 'bg_green.jpg', transition: 'fade', notes: `
▶ Zeichen 142-10: Wildwechsel. Besonders in der Dämmerung, im Herbst und im Frühjahr.
❓ Frage: Ein Reh steht im Licht. Was tust du?
🖱 3 Klicks: Abblenden (Fernlicht macht Tiere orientierungslos). Bremsen. Hupen.
🖱 Klick 4: Stempel. Nicht ausweichen! Wer ausweicht, landet oft am Baum oder im Gegenverkehr. Lenkrad festhalten.
🖱 Klick 5: Wild kommt selten allein. Mit Nachzüglern rechnen.` });
    footer(s);
    s.img('vz_142_10.png', { x: 0.9, y: 1.4, w: 3.6, h: 3.6 * 347 / 400 }, { fx: 'zoom', auto: true, dur: 600 });
    kicker(s, 'Zeichen 142-10 · Wildwechsel', 5.2, 1.2);
    title(s, 'Reh im Licht. Was tust du?', 5.15, 1.6, 7.4, 1.0, { size: 40 });
    ['Abblenden', 'Bremsen', 'Hupen'].forEach((t, i) => {
      s.text(`${i + 1}`, { x: 5.2, y: 2.85 + i * 0.85, w: 0.6, h: 0.7, font: SERIF, size: 34, bold: true, color: COL.orange, valign: 'middle' }, { fx: 'flyR', c: true, dur: 600 });
      s.text(t, { x: 5.85, y: 2.85 + i * 0.85, w: 4, h: 0.7, font: SERIF, size: 32, bold: true, valign: 'middle' }, { fx: 'flyR', dur: 600 });
    });
    s.text('NICHT AUSWEICHEN!', { x: 1.0, y: 5.45, w: 5.2, h: 0.95, size: 34, bold: true, cs: 2, color: 'FFFFFF', fill: COL.red, shape: pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle', rotate: -3, glow: 16, glowColor: COL.red, glowOp: 0.45 }, { fx: 'stamp', c: true, dur: 420 });
    s.text('Wild kommt selten allein.\nMit Nachzüglern rechnen.', { x: 6.7, y: 5.45, w: 5.8, h: 1.0, size: 20, bold: true, color: COL.amber, valign: 'middle' }, { fx: 'rise', c: true });
  }

  // ============ 15 · QUIZ KAPITEL 1 ============
  {
    const s = deck.add({ bg: 'bg_night.jpg', transition: 'fade', notes: `
▶ Kurzer Check. Frage vorlesen, Klasse antworten lassen, dann klicken.
🖱 3 Klicks, je eine Antwort.` });
    footer(s);
    kicker(s, 'Quiz · Licht & Sicht', 0.8, 0.9);
    title(s, 'Drei Fragen, drei Antworten', 0.75, 1.3, 12, 1.0, { size: 40 });
    quiz(s, [['Darfst du mit Standlicht fahren?', 'Nein. Nur zum Halten oder Parken.'],
      ['Wann darf die Nebelschlussleuchte an?', 'Nur bei Nebel und Sicht unter 50 m.'],
      ['Du wirst geblendet. Wohin schaust du?', 'Zum rechten Fahrbahnrand.']]);
  }

  // ============ 16 · KAPITEL 2 ============
  {
    const s = deck.add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
▶ Kapitel 2. Stell dir vor, im Rückspiegel blinkt es blau und du hörst das Horn.
❓ Frage: Was ist euer erster Gedanke? Viele sagen: Panik. Genau das wollen wir heute abstellen.` });
    const g1 = s.img('glow_blue.png', { x: 8.4, y: 0.4, w: 3.8, h: 3.8 });
    const g2 = s.img('glow_blue.png', { x: 10.2, y: 1.6, w: 2.8, h: 2.8 });
    s.text('02', { x: 0.8, y: 1.2, w: 5, h: 2.6, font: SERIF, size: 200, bold: true, color: BLUE, glow: 18, glowColor: BLUE, glowOp: 0.3 }, { fx: 'fade', auto: true, dur: 900 });
    title(s, 'Blaulicht', 0.8, 3.95, 11.5, 1.3, { size: 66 }, { fx: 'rise', auto: true, a: true, dur: 900 });
    s.text('Platz machen, ohne Panik', { x: 0.85, y: 5.3, w: 11, h: 0.6, size: 24, color: COL.muted }, { fx: 'fade', auto: true, a: true });
    s.reg(g1, { fx: 'blink', auto: true, dur: 700 }, 'pic');
    s.reg(g2, { fx: 'blink', auto: true, dur: 700, d: 350 }, 'pic');
  }

  // ============ 17 · BLAU, BLAU + HORN, GELB ============
  {
    const s = deck.add({ bg: 'bg_blue.jpg', transition: 'fade', notes: `
▶ Drei Signale, drei Bedeutungen (§ 38 StVO).
🖱 Klick 1: Blaulicht und Einsatzhorn zusammen: Alle müssen sofort freie Bahn schaffen. Das ist das Wegerecht.
🖱 Klick 2: Blaulicht allein: Warnung, z. B. an einer Unfallstelle oder bei einer Kolonne. Kein Platzmachen vorgeschrieben, aber aufpassen.
🖱 Klick 3: Gelbes Blinklicht: warnt vor Gefahren, z. B. Pannenhilfe, Müllabfuhr, Winterdienst. Kein Vorrecht.` });
    footer(s);
    kicker(s, '§ 38 StVO', 0.8, 0.9, { color: BLUE });
    title(s, 'Welches Licht will was von dir?', 0.75, 1.3, 12, 1.0, { size: 40 });
    const cols = [['glow_blue.png', 'Blaulicht + Horn', 'Sofort freie Bahn schaffen', 'Wegerecht', BLUE, true],
      ['glow_blue.png', 'Blaulicht allein', 'Warnung, z. B. Unfallstelle', 'Aufpassen', BLUE, false],
      ['glow_yellow.png', 'Gelbes Blinklicht', 'Warnt vor Gefahren', 'Kein Vorrecht', COL.amber, false]];
    cols.forEach(([g, t, d, tag, col, horn], i) => {
      const x = 0.8 + i * 3.97;
      s.rrect(x, 2.6, 3.75, 4.1, { fill: COL.card, line: col, lw: 1.5, rr: 0.14 }, { fx: 'rise', c: true, dur: 650 });
      s.img(g, { x: x + 0.95, y: 2.6, w: 1.85, h: 1.85 }, { fx: 'zoom', dur: 450 });
      if (horn) s.img(I.horn, { x: x + 2.85, y: 2.85, w: 0.55, h: 0.55 }, { fx: 'zoom', dur: 450 });
      s.text(t, { x: x + 0.25, y: 4.5, w: 3.25, h: 0.6, font: SERIF, size: 24, bold: true, align: 'center' }, { fx: 'fade', dur: 400 });
      s.text(d, { x: x + 0.25, y: 5.1, w: 3.25, h: 0.7, size: 17, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 400 });
      chip(s, tag, x + 0.7, 5.95, 2.35, { size: 17, h: 0.5, fill: col, color: '0B0D10' }, { fx: 'fade', dur: 400 });
    });
  }

  // ============ 18 · SONDERRECHT vs. WEGERECHT ============
  {
    const s = deck.add({ bg: 'bg_blue2.jpg', transition: 'fade', notes: `
▶ Zwei Begriffe, die oft verwechselt werden.
🖱 Klick 1: Sonderrechte (§ 35 StVO): Polizei, Feuerwehr, Rettungsdienst usw. dürfen im Einsatz von Regeln abweichen, z. B. bei Rot fahren oder schneller fahren. Aber nur mit Rücksicht.
🖱 Klick 2: Wegerecht (§ 38 StVO): Nur mit Blaulicht UND Horn. Dann musst DU Platz machen.
🖱 Klick 3: ❓ Frage: Ein Polizeiauto fährt nur mit Blaulicht, ohne Horn. Musst du Platz machen? ✅ Nein, kein Wegerecht. Aber aufmerksam bleiben und nicht behindern.` });
    footer(s);
    kicker(s, 'Oft verwechselt', 0.8, 0.9, { color: BLUE });
    title(s, 'Sonderrecht oder Wegerecht?', 0.75, 1.3, 12, 1.0, { size: 40 });
    const box = (x, head, law, t, d, col) => {
      s.rrect(x, 2.6, 5.7, 2.7, { fill: COL.card, line: col, lw: 1.5, rr: 0.14 }, { fx: 'flyL', c: true, dur: 650 });
      s.text(head, { x: x + 0.35, y: 2.8, w: 3.6, h: 0.6, font: SERIF, size: 30, bold: true, color: col }, { fx: 'fade', dur: 300 });
      s.text(law, { x: x + 3.9, y: 2.88, w: 1.55, h: 0.5, size: 15, bold: true, color: COL.muted, align: 'right' }, { fx: 'fade', dur: 300 });
      s.text(t, { x: x + 0.35, y: 3.5, w: 5.1, h: 0.6, size: 21, bold: true }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 0.35, y: 4.1, w: 5.0, h: 1.0, size: 17, color: COL.muted }, { fx: 'fade', dur: 300 });
    };
    box(0.8, 'Sonderrecht', '§ 35 StVO', 'Einsatzfahrzeug darf Regeln brechen.', 'z. B. bei Rot fahren, schneller fahren. Nur mit Rücksicht auf andere.', COL.amber);
    box(6.8, 'Wegerecht', '§ 38 StVO', 'DU musst Platz machen.', 'Nur bei Blaulicht UND Einsatzhorn.', BLUE);
    s.rrect(0.8, 5.6, 11.7, 1.2, { fill: '0F1830', line: '2A3F6B', rr: 0.14 }, { fx: 'rise', c: true });
    s.text([run('Nur Blaulicht, kein Horn? ', { bold: true }), run('Kein Wegerecht. Aber aufmerksam bleiben und nicht behindern.', { color: COL.muted })], { x: 1.1, y: 5.7, w: 11.2, h: 1.0, size: 20, valign: 'middle' }, { fx: 'fade', dur: 400 });
  }

  // ============ 19 · SO MACHST DU PLATZ ============
  {
    const s = deck.add({ bg: 'bg_blue.jpg', transition: 'fade', notes: `
▶ Blaulicht und Horn hinter dir. So geht es ruhig und sicher.
🖱 4 Klicks:
1. Ruhe bewahren, Spiegel checken: Woher kommt es?
2. Rechts ran, langsamer werden, notfalls anhalten. Blinker setzen, damit der Fahrer weiß, was du vorhast.
3. An der roten Ampel: nicht in Panik über die Kreuzung. Nur wenn es gar nicht anders geht, vorsichtig vorrollen, ohne jemanden zu gefährden.
4. Nicht direkt hinterherfahren und mit weiteren Einsatzfahrzeugen rechnen.` });
    footer(s);
    kicker(s, 'Blaulicht + Horn hinter dir', 0.8, 0.9, { color: BLUE });
    title(s, 'So machst du Platz', 0.75, 1.3, 12, 1.0, { size: 44 });
    const st = [[I.eyeB, 'Ruhe und Spiegel', 'Woher kommt es? Nicht abrupt bremsen'],
      [I.gap, 'Rechts ran', 'Langsamer, Blinker, notfalls anhalten'],
      [I.alert, 'Rote Ampel?', 'Nur wenn nötig vorsichtig vorrollen, niemanden gefährden'],
      [I.siren, 'Nicht hinterher', 'Oft kommt noch ein zweites Fahrzeug']];
    st.forEach(([ic, t, d], i) => {
      const x = 0.8 + (i % 2) * 5.95, y = 2.6 + Math.floor(i / 2) * 2.1;
      s.rrect(x, y, 5.75, 1.85, { fill: COL.card, line: COL.line, rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
      s.oval(x + 0.3, y + 0.3, 0.9, 0.9, { fill: '16203A' }, { fx: 'fade', dur: 300 });
      s.img(ic, { x: x + 0.5, y: y + 0.5, w: 0.5, h: 0.5 }, { fx: 'fade', dur: 300 });
      s.text(t, { x: x + 1.45, y: y + 0.25, w: 4.1, h: 0.6, font: SERIF, size: 26, bold: true }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 1.45, y: y + 0.85, w: 4.1, h: 0.85, size: 17, color: COL.muted }, { fx: 'fade', dur: 300 });
    });
  }

  // ---------- Rettungsgasse: Autos ----------
  const LANES = [8.3, 9.5, 10.7], CW = 0.864, CH = 1.728;
  const cars = [[0, 0.35, 'car_grau'], [1, 0.35, 'car_blau'], [2, 0.35, 'car_weiss'], [0, 2.2, 'car_rot'], [1, 2.2, 'car_gruen'], [0, 4.05, 'car_blau'], [1, 4.05, 'car_grau']];
  const placeCars = (s, split) => {
    cars.forEach(([l, y, f], i) => {
      const dx = split ? (l === 0 ? -0.36 : 0.36) : 0;
      s.img(f + '.png', { x: LANES[l] - CW / 2 + dx, y, w: CW, h: CH, name: `!!rc${i}` });
    });
    s.img('truck.png', { x: LANES[2] - 0.568 + (split ? 0.36 : 0), y: 2.15, w: 1.136, h: 4.16, name: '!!rtruck' });
  };

  // ============ 20 · RETTUNGSGASSE A ============
  {
    const s = deck.add({ bg: 'sc_highway.jpg', transition: 'fade', notes: `
▶ Stau auf der Autobahn, drei Fahrstreifen. Noch ist kein Blaulicht zu sehen.
❓ Frage: Wann bildest du die Rettungsgasse? Erst wenn du das Horn hörst?
🖱 Klick: ✅ Nein! Sobald der Verkehr nur noch Schritttempo fährt oder steht (§ 11 Abs. 2 StVO). Gilt auf Autobahnen und auf Außerortsstraßen mit mindestens zwei Fahrstreifen pro Richtung.
➜ Weiter: Und wohin fährst du?` });
    
    kicker(s, 'Stau · § 11 Abs. 2 StVO', 0.8, 0.9, { color: BLUE, w: 5.8, name: '!!k' });
    title(s, 'Wann bildest du die Rettungsgasse?', 0.75, 1.3, 5.8, 1.9, { size: 40, name: '!!t' });
    placeCars(s, false);
    s.rrect(0.8, 3.6, 5.6, 1.6, { fill: COL.card, line: BLUE, lw: 1.5, rr: 0.14 }, { fx: 'rise', c: true });
    s.text([run('Sofort', { color: BLUE, fontFace: SERIF, fontSize: 32, bold: true }), run('\nSobald es nur noch Schritttempo ist oder steht. Nicht erst beim Martinshorn.', { fontSize: 19 })], { x: 1.1, y: 3.6, w: 5.1, h: 1.6, valign: 'middle', psa: 6 }, { fx: 'fade', dur: 400 });
  }

  // ============ 21 · RETTUNGSGASSE B (Morph) ============
  {
    const s = deck.add({ bg: 'sc_highway.jpg', transition: 'morph', dur: 1600, notes: `
▶ Die Autos weichen aus. Regel: Wer ganz links fährt, fährt nach links. Alle anderen fahren nach rechts. Die Gasse ist also zwischen der linken Spur und der daneben.
❓ Frage: Wo ist die Gasse bei zwei Spuren? ✅ Genau in der Mitte.
🖱 Klick: Der Rettungswagen fährt durch.
Tipp: Nicht in die Gasse nachrücken und nicht hinterherfahren.` });
    
    kicker(s, 'Stau · § 11 Abs. 2 StVO', 0.8, 0.9, { color: BLUE, w: 5.8, name: '!!k' });
    title(s, 'Die Rettungsgasse', 0.75, 1.3, 5.8, 1.0, { size: 44, name: '!!t' });
    placeCars(s, true);
    const rx = 8.9 - 0.528, ry = 5.15;
    const rtw = s.img('rtw.png', { x: rx, y: ry, w: 1.056, h: 2.3 });
    const b1 = s.img('glow_blue.png', { x: rx - 0.1, y: ry + 0.05, w: 0.6, h: 0.6 });
    const b2 = s.img('glow_blue.png', { x: rx + 0.56, y: ry + 0.05, w: 0.6, h: 0.6 });
    s.rrect(0.8, 2.6, 5.6, 1.35, { fill: COL.card, line: COL.line, rr: 0.14 });
    s.text([run('Ganz links  ', { bold: true, color: BLUE }), run('→ nach links', { bold: true })], { x: 1.1, y: 2.7, w: 5.1, h: 0.55, size: 24, valign: 'middle' });
    s.text([run('Alle anderen  ', { bold: true, color: COL.amber }), run('→ nach rechts', { bold: true })], { x: 1.1, y: 3.25, w: 5.1, h: 0.55, size: 24, valign: 'middle' });
    s.text('Nicht nachrücken. Nicht hinterherfahren.', { x: 0.8, y: 4.25, w: 5.6, h: 0.5, size: 19, color: COL.muted });
    s.reg(b1, { fx: 'blink', auto: true, dur: 600 }, 'pic');
    s.reg(b2, { fx: 'blink', auto: true, dur: 600, d: 300 }, 'pic');
    const mv = { fx: 'move', path: 'M 0 0 L 0 -1.05 E', dur: 2600 };
    s.reg(rtw, { ...mv, c: true }, 'pic');
    s.reg(b1, { ...mv }, 'pic'); s.reg(b2, { ...mv }, 'pic');
  }

  // ============ 22 · WAS ES KOSTET ============
  {
    const s = deck.add({ bg: 'bg_red.jpg', transition: 'fade', notes: `
▶ Kein Kavaliersdelikt. Regelsätze laut Bußgeldkatalog.
🖱 4 Klicks:
1. Keine Rettungsgasse gebildet: 200 € und 2 Punkte.
2. Dadurch ein Einsatzfahrzeug behindert: 240 €, 2 Punkte und 1 Monat Fahrverbot.
3. Selbst durch die Rettungsgasse fahren: 240 €, 2 Punkte, 1 Monat Fahrverbot.
4. Bei Blaulicht und Horn keine freie Bahn geschaffen: 240 €, 2 Punkte, 1 Monat Fahrverbot.
▶ Das Schlimmste ist nicht das Geld: Jede Minute Verzögerung kann ein Leben kosten.` });
    footer(s);
    kicker(s, 'Was es kostet', 0.8, 0.9, { color: COL.red });
    title(s, 'Kein Platz gemacht? Das wird teuer.', 0.75, 1.3, 12, 1.0, { size: 40 });
    const hd = ['', 'Bußgeld', 'Punkte', 'Fahrverbot'];
    const cx = [0.8, 7.2, 9.0, 10.6], cw = [6.2, 1.6, 1.4, 1.9];
    hd.forEach((t, i) => s.text(t.toUpperCase(), { x: cx[i], y: 2.5, w: cw[i], h: 0.35, size: 13, bold: true, cs: 3, color: COL.muted, align: i ? 'center' : 'left' }));
    const rows = [['Keine Rettungsgasse gebildet', '200 €', '2', '–'], ['… und Einsatzfahrzeug behindert', '240 €', '2', '1 Monat'],
      ['Rettungsgasse selbst befahren', '240 €', '2', '1 Monat'], ['Bei Blaulicht + Horn keinen Platz gemacht', '240 €', '2', '1 Monat']];
    rows.forEach((r, i) => {
      const y = 2.95 + i * 0.95;
      s.rrect(0.8, y, 11.7, 0.8, { fill: COL.card, line: COL.line, rr: 0.1 }, { fx: 'flyL', c: true, dur: 600 });
      r.forEach((t, j) => s.text(t, { x: cx[j] + (j ? 0 : 0.3), y, w: cw[j] - (j ? 0 : 0.3), h: 0.8, size: j ? 22 : 20, bold: j > 0, color: j === 3 && t !== '–' ? COL.red : COL.txt, font: j ? SERIF : undefined, align: j ? 'center' : 'left', valign: 'middle' }, { fx: 'fade', dur: 300 }));
    });
    s.text('Regelsätze Bußgeldkatalog (BKatV), Stand 2026', { x: 0.8, y: 6.9, w: 8, h: 0.3, size: 12, color: '9AA3AE' });
  }

  // ============ 23 · QUIZ KAPITEL 2 ============
  {
    const s = deck.add({ bg: 'bg_blue2.jpg', transition: 'fade', notes: `
▶ Kurzer Check zu Blaulicht.
🖱 3 Klicks, je eine Antwort.` });
    footer(s);
    kicker(s, 'Quiz · Blaulicht', 0.8, 0.9, { color: BLUE });
    title(s, 'Drei Fragen, drei Antworten', 0.75, 1.3, 12, 1.0, { size: 40 });
    quiz(s, [['Gelbes Blinklicht: Musst du Platz machen?', 'Nein. Es warnt nur vor einer Gefahr.'],
      ['Stau, 3 Spuren, du bist ganz links. Wohin?', 'Nach links. Alle anderen nach rechts.'],
      ['Wann bildest du die Rettungsgasse?', 'Schon bei Schritttempo oder Stillstand.']], BLUE);
  }

  // ============ 24 · KAPITEL 3 ============
  opener(deck, 'sc_portal.jpg', '03', 'Tunnel', 'Licht an, Abstand, im Notfall raus', `
▶ Kapitel 3. Der Tunnel ist eng, dunkel und man kann nicht einfach ausweichen. Deshalb gelten besondere Regeln.
❓ Frage: Wer fährt ungern durch Tunnel? Kurz Hände heben lassen.`, COL.amber);

  // ============ 25 · VOR UND IM TUNNEL ============
  {
    const s = deck.add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
▶ Fünf Dinge vor und im Tunnel.
🖱 5 Klicks:
1. Abblendlicht an, auch wenn der Tunnel beleuchtet ist (Zeichen 327). Tagfahrlicht reicht nicht.
2. Sonnenbrille ab. Die Augen brauchen Zeit, sich an das Dunkel zu gewöhnen.
3. Radio an: Viele Tunnel senden Durchsagen über den Verkehrsfunk.
4. Genug Abstand halten.
5. Wenden ist verboten (Zeichen 327). Nicht rückwärts fahren, nur im Notfall halten, am besten in der Pannenbucht.` });
    footer(s);
    kicker(s, 'Vor und im Tunnel', 0.8, 0.9, { color: COL.amber });
    title(s, 'Fünf Regeln, bevor es dunkel wird', 0.75, 1.3, 12, 1.0, { size: 40 });
    const r = [[I.bulb, 'Abblendlicht an', 'auch wenn es hell ist'], [I.glasses, 'Sonnenbrille ab', 'Augen brauchen Zeit'], [I.radio, 'Radio an', 'Durchsagen hören'],
      [I.timer, 'Abstand halten', 'auch im Stau'], [I.undo, 'Nicht wenden', 'nicht rückwärts, nur im Notfall halten']];
    const cw = 2.2, gap = 0.175, x0 = 0.8;
    r.forEach(([ic, t, d], i) => {
      const x = x0 + i * (cw + gap);
      s.rrect(x, 2.7, cw, 3.6, { fill: COL.card, line: COL.line, rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
      s.oval(x + 0.6, 3.0, 1.0, 1.0, { fill: '2A2114' }, { fx: 'fade', dur: 300 });
      s.img(ic, { x: x + 0.82, y: 3.22, w: 0.56, h: 0.56 }, { fx: 'fade', dur: 300 });
      s.text(t, { x: x + 0.08, y: 4.25, w: cw - 0.16, h: 0.9, font: SERIF, size: 18, bold: true, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 0.12, y: 5.15, w: cw - 0.24, h: 0.9, size: 16, color: COL.muted, align: 'center' }, { fx: 'fade', dur: 300 });
    });
  }

  // ============ 26 · TUNNEL-BRAND: ENTSCHEIDE DICH ============
  {
    const s = deck.add({ bg: 'sc_tunnel.jpg', transition: 'black', notes: `
▶ Du fährst im Tunnel. Vorne raucht es. Der Rauch kommt auf dich zu.
❓ Frage: A, B oder C? Abstimmen lassen, Hände hoch.
🖱 Klick 1: A ist falsch. Wenden ist im Tunnel verboten und blockiert die Feuerwehr.
🖱 Klick 2: B ist falsch. Rauch ist die größte Gefahr, das Auto schützt dich nicht.
🖱 Klick 3: C ist richtig. Warnblinker, rechts ran, Motor aus, Schlüssel stecken lassen (die Feuerwehr muss das Auto wegfahren können), Tür nicht abschließen. Dann zu Fuß zum nächsten Notausgang, weg vom Rauch. Notausgänge sind grün beleuchtet.` });
    const smoke = s.img('smoke.png', { x: 0, y: 0, w: W, h: H });
    s.reg(smoke, { fx: 'fade', auto: true, dur: 2500 }, 'pic');
    s.rrect(0.6, 0.55, 7.0, 1.35, { fill: '07080B', ft: 20, rr: 0.12 });
    kicker(s, 'Tunnel · Es brennt', 0.9, 0.72, { color: COL.red });
    title(s, 'Vorne raucht es. Was tust du?', 0.85, 1.1, 6.6, 0.9, { size: 34 });
    footer(s);
    const opts = [['A', 'Wenden und zurück raus'], ['B', 'Sitzen bleiben, Fenster zu'], ['C', 'Rechts ran, Motor aus, Schlüssel stecken, zu Fuß zum Notausgang']];
    const ox = [0.6, 4.6, 8.6], ow = [3.8, 3.8, 4.15];
    opts.forEach(([l, t], i) => {
      s.rrect(ox[i], 5.35, ow[i], 1.6, { fill: '0B0D11', ft: 10, line: COL.line, rr: 0.14 });
      s.text(l, { x: ox[i] + 0.2, y: 5.45, w: 0.7, h: 0.7, font: SERIF, size: 36, bold: true, color: COL.amber });
      s.text(t, { x: ox[i] + 0.9, y: 5.45, w: ow[i] - 1.2, h: 1.4, size: 17, bold: true, valign: 'middle' });
    });
    s.img(I.x, { x: ox[0] + ow[0] - 0.75, y: 4.95, w: 0.8, h: 0.8 }, { fx: 'stamp', c: true, dur: 380 });
    s.img(I.x, { x: ox[1] + ow[1] - 0.75, y: 4.95, w: 0.8, h: 0.8 }, { fx: 'stamp', c: true, dur: 380 });
    s.img(I.check, { x: ox[2] + ow[2] - 0.75, y: 4.95, w: 0.8, h: 0.8 }, { fx: 'stamp', c: true, dur: 380 });
    s.rrect(ox[2] - 0.05, 5.3, ow[2] + 0.1, 1.7, { line: GREEN, lw: 3, rr: 0.14, glow: 10, glowColor: GREEN, glowOp: 0.4 }, { fx: 'fade', dur: 400 });
  }

  // ============ 27 · STAU, PANNE, BRAND ============
  {
    const s = deck.add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
▶ Drei Notfälle im Tunnel im Überblick.
▶ Das sind Empfehlungen von ADAC und Autobahn GmbH.
🖱 Klick 1: Stau: Warnblinker, mindestens 5 m Abstand zum Vordermann, Rettungsgasse, bei längerem Stillstand Motor aus.
🖱 Klick 2: Panne: Warnblinker, möglichst in die Pannenbucht, Warnweste, Hilfe über die Notrufstation rufen.
🖱 Klick 3: Brand: Motor aus, Schlüssel stecken lassen, Tür nicht abschließen, weg vom Rauch zum grünen Notausgang.` });
    footer(s);
    kicker(s, 'Notfall im Tunnel', 0.8, 0.9, { color: COL.amber });
    title(s, 'Stau, Panne, Brand', 0.75, 1.3, 12, 1.0, { size: 44 });
    const colz = [[I.alert, 'Stau', COL.amber, ['Warnblinker an', 'Mind. 5 m Abstand', 'Rettungsgasse bilden', 'Längerer Stillstand: Motor aus']],
      [I.wrench, 'Panne', COL.orange, ['Warnblinker an', 'In die Pannenbucht', 'Warnweste an', 'Notrufstation nutzen']],
      [I.flame, 'Brand', COL.red, ['Motor aus', 'Schlüssel stecken lassen', 'Tür nicht abschließen', 'Weg vom Rauch zum Notausgang']]];
    colz.forEach(([ic, t, col, li], i) => {
      const x = 0.8 + i * 3.97;
      s.rrect(x, 2.6, 3.75, 3.6, { fill: COL.card, line: col, lw: 1.5, rr: 0.14 }, { fx: 'rise', c: true, dur: 650 });
      s.img(ic, { x: x + 0.3, y: 2.85, w: 0.6, h: 0.6 }, { fx: 'zoom', dur: 400 });
      s.text(t, { x: x + 1.05, y: 2.82, w: 2.5, h: 0.66, font: SERIF, size: 30, bold: true, color: col, valign: 'middle' }, { fx: 'fade', dur: 400 });
      s.text(li.map((l, j) => ({ text: l, options: { bullet: true, breakLine: j < li.length - 1 } })), { x: x + 0.3, y: 3.75, w: 3.25, h: 2.9, size: 18, psa: 10 }, { fx: 'fade', dur: 400 });
    });
  }

  // ============ 28 · NOTRUFSTATION STATT HANDY ============
  {
    const s = deck.add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
❓ Frage: Warum soll man im Tunnel die Notrufstation nehmen und nicht das Handy?
🖱 Klick: ✅ Weil die Tunnelzentrale sofort sieht, wo du bist. Sie kann den Tunnel sperren, Durchsagen machen und Hilfe genau an die richtige Stelle schicken.` });
    s.img(I.phone, { x: 6.07, y: 1.1, w: 1.2, h: 1.2 }, { fx: 'zoom', auto: true, dur: 600 });
    title(s, 'Notrufstation statt Handy.', 0.8, 2.6, 11.7, 1.2, { size: 58, align: 'center' }, { fx: 'fade', auto: true, a: true, dur: 1000 });
    s.text([run('Die Tunnelzentrale sieht sofort, '), run('wo du bist.', { color: COL.amber })], { x: 0.8, y: 4.1, w: 11.7, h: 1.0, font: SERIF, size: 36, italic: true, align: 'center' }, { fx: 'rise', c: true, dur: 900 });
  }

  // ============ 29 · QUIZ KAPITEL 3 ============
  {
    const s = deck.add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
▶ Letzter Check.
🖱 3 Klicks, je eine Antwort.` });
    footer(s);
    kicker(s, 'Quiz · Tunnel', 0.8, 0.9, { color: COL.amber });
    title(s, 'Drei Fragen, drei Antworten', 0.75, 1.3, 12, 1.0, { size: 40 });
    quiz(s, [['Tunnel hell beleuchtet: Welches Licht?', 'Trotzdem Abblendlicht an.'],
      ['Brand im Tunnel: Wohin mit dem Schlüssel?', 'Stecken lassen, Tür nicht abschließen.'],
      ['Stau im Tunnel: Wie viel Abstand?', 'Mindestens 5 Meter, Warnblinker an.']], COL.amber);
  }

  // ============ 30 · GRUPPENARBEIT ============
  {
    const s = deck.add({ bg: 'bg_orange.jpg', transition: 'fade', notes: `
▶ Drei Gruppen, drei Themen. Jede Gruppe bekommt ein Arbeitsblatt.
🖱 Klick 1–3: Die drei Gruppen.
🖱 Klick 4: 15 Minuten. Danach stellt jede Gruppe ihr Plakat in 1 Minute vor. Nur zwei Personen kommen nach vorne.` });
    footer(s);
    kicker(s, 'Gruppenarbeit', 0.8, 0.9);
    title(s, 'Ihr seid jetzt die Fahrlehrer', 0.75, 1.3, 12, 1.0, { size: 44 });
    const g = [[I.eye, 'Gruppe LICHT', 'Welches Licht wann? Plus Nebel und Blendung.', COL.orange], [I.siren, 'Gruppe BLAULICHT', 'So machst du Platz. Plus Rettungsgasse.', BLUE], [I.flame, 'Gruppe TUNNEL', 'Stau, Panne, Brand: Was tun?', COL.amber]];
    g.forEach(([ic, t, d, col], i) => {
      const x = 0.8 + i * 3.97;
      s.rrect(x, 2.6, 3.75, 2.6, { fill: COL.card, line: col, lw: 1.5, rr: 0.14 }, { fx: 'rise', c: true, dur: 600 });
      s.img(ic, { x: x + 0.3, y: 2.85, w: 0.6, h: 0.6 }, { fx: 'zoom', dur: 400 });
      s.text(t, { x: x + 0.3, y: 3.6, w: 3.2, h: 0.55, font: SERIF, size: 24, bold: true, color: col }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 0.3, y: 4.2, w: 3.2, h: 0.85, size: 17, color: COL.muted }, { fx: 'fade', dur: 300 });
    });
    s.text('15 MIN', { x: 0.8, y: 5.55, w: 3.6, h: 1.1, font: SERIF, size: 60, bold: true, color: COL.orange, glow: 12, glowOp: 0.4 }, { fx: 'stamp', c: true, dur: 420 });
    s.text('Ein Plakat pro Gruppe. Danach 1 Minute Vortrag,\nnur 2 Personen vorne.', { x: 4.3, y: 5.65, w: 8.2, h: 0.9, size: 20, bold: true, valign: 'middle' }, { fx: 'fade', a: true });
  }

  // ============ 31 · MERKSÄTZE ============
  {
    const s = deck.add({ bg: 'bg_center.jpg', transition: 'fade', notes: `
▶ Drei Sätze, die ihr mitnehmt. Gemeinsam laut vorlesen lassen.
🖱 3 Klicks.` });
    footer(s);
    kicker(s, 'Zum Mitnehmen', 0.8, 0.9);
    title(s, 'Drei Sätze für heute', 0.75, 1.3, 12, 1.0, { size: 44 });
    const m = [[I.eye, 'Fahr nur so schnell, dass du im Licht anhalten kannst.', COL.orange], [I.siren, 'Blaulicht + Horn: ruhig Platz machen, Gasse im Stau.', BLUE], [I.door, 'Brand im Tunnel: Schlüssel stecken lassen, zu Fuß raus.', COL.amber]];
    m.forEach(([ic, t, col], i) => {
      const y = 2.65 + i * 1.35;
      s.oval(0.8, y, 1.0, 1.0, { fill: '1A202B', line: col, lw: 2 }, { fx: 'zoom', c: true, dur: 450 });
      s.img(ic, { x: 1.05, y: y + 0.25, w: 0.5, h: 0.5 }, { fx: 'fade', dur: 300 });
      s.text(t, { x: 2.1, y, w: 10.4, h: 1.0, font: SERIF, size: 28, bold: true, valign: 'middle' }, { fx: 'rise', dur: 600 });
    });
  }

  // ============ 32 · AUSBLICK ============
  {
    const s = deck.add({ bg: 'bg_red.jpg', transition: 'fade', notes: `
▶ Zur Lektion 11 gehört laut Rahmenplan noch mehr. Das machen wir in einer eigenen Einheit.
🖱 Klick: Die Themen erscheinen: Verhalten nach einem Unfall, Bußgeld und Fahrverbot, Punkte in Flensburg, Entzug der Fahrerlaubnis, Versicherung und Regress, MPU.
Probezeit und Seminare kennt ihr aus Lektion 12.` });
    footer(s);
    kicker(s, 'Das kommt noch', 0.8, 0.9, { color: COL.red });
    title(s, 'Das gehört auch zu Lektion 11', 0.75, 1.3, 12, 1.0, { size: 44 });
    const t = ['Nach dem Unfall', 'Bußgeld, Fahrverbot, Strafe', 'Punkte in Flensburg', 'Entzug der Fahrerlaubnis', 'Versicherung und Regress', 'MPU'];
    t.forEach((x, i) => chip(s, x, 0.8 + (i % 3) * 3.97, 2.9 + Math.floor(i / 3) * 1.1, 3.75, { size: 19, h: 0.8, fill: COL.card, line: COL.line }, { fx: 'rise', c: i === 0, d: i * 120 }));
    s.text('Probezeit und Seminare: siehe Lektion 12.', { x: 0.8, y: 5.4, w: 11, h: 0.5, size: 19, italic: true, color: COL.muted }, { fx: 'fade', a: true });
  }

  // ============ 33 · PAUSE ============
  {
    const s = deck.add({ bg: 'bg_bokeh.jpg', transition: 'black', footer: false, notes: `
▶ Halbzeit. Pause. Danach geht es weiter mit Lektion 12.` });
    s.img(I.coffee, { x: 6.07, y: 1.5, w: 1.2, h: 1.2 }, { fx: 'zoom', auto: true, dur: 600 });
    title(s, 'Pause', 0.8, 2.9, 11.7, 1.6, { size: 110, align: 'center' }, { fx: 'fade', auto: true, a: true, dur: 1000 });
    s.text('Danach: Lektion 12', { x: 0.8, y: 4.7, w: 11.7, h: 0.7, size: 26, color: COL.muted, align: 'center' }, { fx: 'fade', auto: true, a: true });
  }

  const out = path.join(__dirname, 'out', 'Lektion11_Besondere_Situationen.pptx');
  require('fs').mkdirSync(path.dirname(out), { recursive: true });
  await finalize(deck, out);
  console.log('Fertig:', out, deck.slides.length, 'Folien');
}
build().catch(e => { console.error(e); process.exit(1); });
