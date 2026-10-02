// Bausteine im Stil der Grundstoff-9+10-Präsentation (Farben, Schriften, Fußzeile, Karten, Quiz, Morph-Schritte)
const { W, H, icon } = require('./lib');
const C = { txt: 'F3F5F8', mut: 'A9B6C6', dim: '738296', card: '111B28', line: '2A3B52', card2: '172538', red: 'FF5C5C', or: 'FFB547', bl: '4CC9F0', gr: '38D98A', pu: '7AA2FF', dark: '070B12', road: '232A35', road2: '2B3340', curb: '3C4656', mark: 'D9DEE6' };
const SEC = {
  ueb: { name: 'ÜBERHOLEN', col: C.bl, bg: 'bg_ueb.jpg' },
  wei: { name: 'WEITERE FAHRMANÖVER', col: C.gr, bg: 'bg_wei.jpg' },
  ruh: { name: 'RUHENDER VERKEHR', col: C.pu, bg: 'bg_ruh.jpg' },
  pan: { name: 'RUHENDER VERKEHR', col: C.red, bg: 'bg_red.jpg' },
  tra: { name: 'TRANSFER & LERNCHECK', col: C.or, bg: 'bg_kap.jpg' },
  kap: { name: 'KAPITEL', col: C.or, bg: 'bg_kap.jpg' },
};
const P = { car: [0.594, 1.188], bike: [0.3575, 0.6875], ped: [0.58, 0.5], truck: [0.78, 2.86] };

function base(deck, sec, { notes = '', bg, transition = 'fade', noGlide = false, footer = true, ov = false } = {}) {
  const S = SEC[sec];
  const s = deck.add({ transition, notes, footer: false, noGlide });
  s.img(bg || S.bg, { x: 0, y: 0, w: W, h: H, name: '!!bg' });
  if (ov) s.img('ov_left.png', { x: 0, y: 0, w: ov === true ? W : ov, h: H, name: '!!ov' });
  if (footer) {
    s.text('GRUNDSTOFF 9 + 10  ·  ' + S.name, { x: 0.6, y: 7.02, w: 7, h: 0.28, size: 10, color: C.dim, cs: 2, name: '!!ftL' });
    s.text('00', { x: 12.13, y: 7.02, w: 0.6, h: 0.28, size: 10, color: C.dim, align: 'right', name: '!!ftR' });
  }
  s.sec = S;
  return s;
}
const kick = (s, t, o = {}) => s.text(t.toUpperCase(), { x: 0.7, y: o.y ?? 0.6, w: o.w ?? 11, h: 0.35, size: 13, bold: true, color: o.col || s.sec.col, cs: 3, name: o.name }, o.anim);
const title = (s, t, o = {}) => s.text(t, { x: 0.7, y: o.y ?? 0.95, w: o.w ?? 12, h: o.h ?? 0.8, size: o.size ?? 40, bold: true, color: C.txt, name: o.name, lsm: 0.95 }, o.anim);
const card = (s, x, y, w, h, o = {}, anim) => s.rrect(x, y, w, h, { fill: o.fill || C.card, line: o.line || C.line, lw: o.lw || 1, rr: o.rr ?? 0.1, name: o.name }, anim);
async function badge(s, x, y, d, col, ico, anim) {
  s.oval(x, y, d, d, { fill: col, line: col }, anim);
  const i = d * 0.52;
  s.img(await icon(ico, C.dark), { x: x + (d - i) / 2, y: y + (d - i) / 2, w: i, h: i }, anim ? { fx: 'fade', dur: 200 } : undefined);
}
// Mehrfachwahl: Frage steht, Klick 1 = Antworten, Klick 2 = Lösung (Regel 1 der Didaktik)
function quiz(deck, sec, { kicker, q, opts, ok, why, notes, size = 32 }) {
  const s = base(deck, sec, { notes });
  kick(s, kicker); title(s, q, { size, h: 1.4 });
  const y0 = 2.75;
  opts.forEach((o, i) => {
    const y = y0 + i * 1.0;
    card(s, 0.7, y, 8.2, 0.82, { name: 'qo' + i }, { fx: 'flyL', c: i === 0, dur: 450 });
    s.text(String.fromCharCode(65 + i), { x: 0.92, y: y + 0.17, w: 0.48, h: 0.48, size: 15, bold: true, color: C.dark, fill: s.sec.col, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text(o, { x: 1.6, y, w: 7.2, h: 0.82, size: 19, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
  });
  const y = y0 + ok * 1.0;
  s.rrect(0.7, y, 8.2, 0.82, { line: C.gr, lw: 3, rr: 0.1 }, { fx: 'zoom', c: true, dur: 350 });
  s.text('✓  RICHTIG', { x: 9.2, y: y + 0.13, w: 2.0, h: 0.56, size: 16, bold: true, color: C.dark, fill: C.gr, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.25, align: 'center', valign: 'middle', rotate: -3 }, { fx: 'stamp' });
  if (why) {
    s.rrect(0.7, 5.95, 11.9, 0.82, { fill: C.card2, line: C.gr, rr: 0.1 }, { fx: 'rise', dur: 400 });
    s.text(why, { x: 0.95, y: 5.95, w: 11.5, h: 0.82, size: 16, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 250 });
  }
  return s;
}
// Morph-Schrittfolge: links Schrittliste, unten Erklärung, rechts Szene (Objekte mit festen !!-Namen)
async function steps(deck, sec, { kicker, ttl, list, caps, scene, notes, legend }) {
  const out = [];
  for (let i = 0; i < caps.length; i++) {
    const s = base(deck, sec, { notes: notes[i], transition: i ? 'morph' : 'fade', noGlide: true });
    const col = s.sec.col;
    s.text(kicker.toUpperCase(), { x: 0.7, y: 0.55, w: 5.2, h: 0.35, size: 13, bold: true, color: col, cs: 3, name: '!!k' });
    s.text(ttl, { x: 0.7, y: 0.88, w: 5.2, h: 0.6, size: 30, bold: true, color: C.txt, name: '!!t' });
    const hi = Math.min(i, list.length - 1);
    s.rect(0.62, 1.7 + hi * 0.5 - 0.04, 4.6, 0.44, { fill: col, name: '!!hl', ft: 0 });
    list.forEach((l, k) => {
      const on = k === hi, done = k < hi;
      s.text(String(k + 1), { x: 0.7, y: 1.7 + k * 0.5, w: 0.34, h: 0.34, size: 12, bold: true, color: on ? C.dark : (done ? C.dark : C.mut), fill: on ? col : (done ? C.mut : C.line), shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!b' + k });
      s.text(l, { x: 1.2, y: 1.66 + k * 0.5, w: 3.95, h: 0.4, size: 16.5, bold: on, color: on ? C.dark : (done ? C.mut : C.dim), valign: 'middle', name: '!!l' + k });
    });
    s.rrect(0.62, 5.25, 4.6, 1.55, { fill: C.card2, line: C.line, rr: 0.08, name: '!!capbox' });
    s.text(caps[i], { x: 0.82, y: 5.3, w: 4.25, h: 1.45, size: 15, color: C.txt, valign: 'middle', name: '!!cap' });
    if (legend) s.text(legend, { x: 5.6, y: 6.72, w: 7, h: 0.28, size: 10, italic: true, color: C.dim, name: '!!leg' });
    await scene(s, i);
    out.push(s);
  }
  return out;
}
// Straßen-Bausteine (Draufsicht). Alle Teile bekommen feste Namen, damit Morph sie wiedererkennt.
function roadH(s, x, y, w, h, o = {}) {
  s.rect(x, y, w, h, { fill: o.fill || C.road, name: o.name || '!!road' });
  if (o.center !== false) {
    const cy = y + h / 2 - 0.02;
    for (let k = 0, xx = x + 0.2; xx < x + w - 0.3; xx += 0.75, k++) s.rect(xx, cy, 0.42, 0.045, { fill: C.mark, name: `!!${o.name || 'road'}_m${k}` });
  }
  if (o.curbs !== false) { s.rect(x, y - 0.12, w, 0.12, { fill: C.curb, name: `!!${o.name || 'road'}_c1` }); s.rect(x, y + h, w, 0.12, { fill: C.curb, name: `!!${o.name || 'road'}_c2` }); }
}
// Fahrzeug-Sprite (Front zeigt nach oben bei rot=0). cx/cy = Mittelpunkt
function veh(s, file, cx, cy, rot, name, o = {}) {
  const [w, h] = o.size || (file.startsWith('truck') ? P.truck : file.startsWith('bike') || file.startsWith('moto') ? P.bike : file.startsWith('ped') ? P.ped : P.car);
  const sc = o.scale || 1;
  return s.img(file, { x: cx - (w * sc) / 2, y: cy - (h * sc) / 2, w: w * sc, h: h * sc, rotate: rot, name, transparency: o.tr }, o.anim);
}
// Karte mit Symbol, fett gedrucktem Stichwort und Erklärung (eine Zeile oder zwei)
async function point(s, x, y, w, h, ico, col, head, body, anim = { fx: 'flyL', c: true, dur: 450 }, o = {}) {
  card(s, x, y, w, h, { fill: o.fill || C.card, line: o.line || C.line }, anim);
  const d = Math.min(0.62, h - 0.3);
  s.oval(x + 0.22, y + (h - d) / 2, d, d, { fill: col, line: col }, { fx: 'zoom', dur: 250 });
  s.img(await icon(ico, C.dark), { x: x + 0.22 + d * 0.22, y: y + (h - d) / 2 + d * 0.22, w: d * 0.56, h: d * 0.56 }, { fx: 'fade', dur: 150 });
  s.text([{ text: head + (body ? '  ' : ''), options: { bold: true, color: C.txt, breakLine: !!o.br } }, ...(body ? [{ text: body, options: { color: o.bodyCol || C.mut } }] : [])], { x: x + d + 0.45, y, w: w - d - 0.6, h, size: o.size || 17, valign: 'middle' }, { fx: 'fade', dur: 200 });
}
function foot(s, t) { s.text(t, { x: 0.7, y: 6.62, w: 11.9, h: 0.3, size: 11, italic: true, color: C.dim }); }
module.exports = { C, SEC, P, base, kick, title, card, badge, quiz, steps, roadH, veh, foot, point };
