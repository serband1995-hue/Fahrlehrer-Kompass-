// Schema der Zweileitungs-Druckluftbremse (Lkw links, Anhänger rechts) mit wandernden Luftpunkten.
// Alle Teile haben feste Namen, damit Morph sie von Bild zu Bild gleiten lässt.
// st.ph = Takt (steigt je Bild um 1) · red: flow|full|brk|empty · yel: flow|empty|brk|leak
// fill/sup/brk: true = Luft fließt · tank 0..1 · cyl 0/1 · pedal 0/1 · lkwB 0/1 · rv 'zu' · vent 0/1 · hi: Bauteil hervorheben
const { C, seg } = require('./gs');

const RED = C.red, YEL = C.am, BLU = '4C8DF0';
const DIM = { [RED]: '5A2A2E', [YEL]: '4A4224', [BLU]: '23344F' };
const KX = 8.75, RY = 2.72, YY = 3.75;
const P = {
  ra: [[7.0, RY], [7.78, RY]], ra2: [[7.78, RY], [KX, RY]], rb: [[KX, RY], [9.35, RY]],
  ya: [[8.25, YY], [KX, YY]], yb: [[KX, YY], [9.35, YY]],
  f: [[10.35, RY], [10.85, RY]],
  s: [[11.3, 3.02], [11.3, 3.35], [10.35, 3.35]],
  b: [[9.85, 4.05], [9.85, 4.95], [12.75, 4.95]],
  c: [[6.55, 4.35], [6.55, YY], [7.3, YY]],
};
const len = p => p.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
function at(p, u) {
  let d = Math.max(0, Math.min(1, u)) * len(p);
  for (let i = 1; i < p.length; i++) {
    const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (d <= l || i === p.length - 1) { const t = l ? Math.min(1, d / l) : 0; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]; }
    d -= l;
  }
}
function line(s, p, col, on, nm) {
  for (let i = 1; i < p.length; i++) seg(s, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], { col: on ? col : DIM[col], th: 0.08, rr: 0.5, name: `!!${nm}${i}` });
}
// Punkte wandern entlang p (Abstand ca. 0,32 Zoll); sichtbar nur bei on und im Bereich [u0, u1]
function dots(s, p, col, on, nm, ph, u0 = 0, u1 = 1, back = false) {
  const L = len(p), n = Math.max(2, Math.round(L / 0.32)), k0 = -8;
  for (let j = k0; j < n; j++) {
    let u = (j + ph) / n; const vis = on && u > u0 + 0.02 && u < u1 - 0.02;
    u = Math.max(0, Math.min(1, u));
    const [x, y] = at(p, back ? 1 - u : u);
    s.oval(x - 0.055, y - 0.055, 0.11, 0.11, { fill: 'FFFFFF', ft: vis ? 0 : 100, line: col, lw: 1.5, lt: vis ? 0 : 100, name: `!!${nm}d${j - k0}` });
  }
}
function box(s, x, y, w, h, txt, nm, hi, hiCol) {
  s.rrect(x, y, w, h, { fill: '16202E', line: hi ? hiCol : '4A5668', lw: hi ? 2.5 : 1.25, rr: 0.12, glow: hi ? 6 : undefined, glowColor: hiCol, name: '!!' + nm });
  s.text(txt, { x, y, w, h, size: 11, bold: true, color: hi ? C.txt : C.mut, align: 'center', valign: 'middle', lsm: 0.9, name: '!!' + nm + 't' });
}

function schema(s, st) {
  const ph = st.ph || 0, hi = st.hi || '';
  // Bereiche
  s.rrect(5.75, 1.62, 2.7, 4.1, { fill: '0E1520', line: '2A3B52', rr: 0.08, name: '!!zl' });
  s.rrect(9.05, 1.62, 4.0, 4.1, { fill: '0E1520', line: '2A3B52', rr: 0.08, name: '!!za' });
  s.text('LKW', { x: 5.9, y: 1.68, w: 2.0, h: 0.3, size: 12, bold: true, color: C.dim, cs: 3, name: '!!zlt' });
  s.text('ANHÄNGER', { x: 9.2, y: 1.68, w: 2.5, h: 0.3, size: 12, bold: true, color: C.dim, cs: 3, name: '!!zat' });
  // Leitungen
  const red = st.red || 'full', yel = st.yel || 'empty';
  line(s, P.ra, RED, true, 'ra');
  line(s, P.ra2, RED, red !== 'empty', 'rx');
  line(s, P.rb, RED, red === 'flow' || red === 'full', 'rb');
  line(s, P.ya, YEL, yel === 'flow' || yel === 'leak', 'ya');
  line(s, P.yb, YEL, yel === 'flow', 'yb');
  line(s, P.f, RED, !!st.fill || (st.tank ?? 1) > 0.05, 'f');
  line(s, P.s, BLU, !!st.sup, 's');
  line(s, P.b, BLU, !!st.brk || !!st.cyl, 'b');
  seg(s, P.c[0][0], P.c[0][1], P.c[1][0], P.c[1][1], { col: st.pedal ? C.txt : '3A4656', th: 0.05, name: '!!c1' });
  seg(s, P.c[1][0], P.c[1][1], P.c[2][0], P.c[2][1], { col: st.pedal ? C.txt : '3A4656', th: 0.05, name: '!!c2' });
  // Luftpunkte
  const R = [P.ra[0], P.ra2[0], P.ra2[1], P.rb[1]], Y = [...P.ya, P.yb[1]];
  dots(s, R, RED, red === 'flow' || red === 'brk', 'r', ph, 0, red === 'brk' ? 0.62 : 1);
  dots(s, Y, YEL, yel === 'flow' || yel === 'leak', 'y', ph, 0, yel === 'leak' ? 0.45 : 1);
  dots(s, P.f, RED, !!st.fill, 'f', ph);
  dots(s, P.s, BLU, !!st.sup, 's', ph);
  dots(s, P.b, BLU, !!st.brk, 'b', ph);
  // Bauteile (über den Leitungen)
  box(s, 5.95, 2.42, 1.05, 0.6, 'Vorrat\n(Kreis 3)', 'vl', hi === 'vl', C.gr);
  box(s, 7.3, 2.4, 0.95, 1.65, 'Anhänger-\nsteuer-\nventil', 'asv', hi === 'asv', C.or);
  box(s, 9.35, 2.4, 1.0, 1.65, 'Anhänger-\nbrems-\nventil', 'abv', hi === 'abv', C.or);
  // Behälter Anhänger mit Füllstand
  const tk = Math.max(0, Math.min(1, st.tank ?? 1));
  s.rrect(10.85, 2.42, 2.0, 0.6, { fill: '0B1119', line: hi === 'tank' ? C.or : '4A5668', lw: hi === 'tank' ? 2.5 : 1.25, rr: 0.3, name: '!!tk' });
  s.rrect(10.88, 2.45, Math.max(0.06, 1.94 * tk), 0.54, { fill: BLU, ft: tk > 0.02 ? 25 : 100, rr: 0.3, name: '!!tkf' });
  s.text('Luftbehälter', { x: 10.85, y: 2.42, w: 2.0, h: 0.6, size: 11, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!tkt' });
  // Rückschlagventil
  const rz = st.rv === 'zu';
  s.oval(10.5, RY - 0.11, 0.22, 0.22, { fill: rz ? C.red : '16202E', line: rz ? C.red : '7A8494', lw: 1.5, name: '!!rv' });
  s.text(rz ? 'abgesperrt' : '', { x: 10.2, y: 2.05, w: 1.6, h: 0.3, size: 11, bold: true, color: C.red, name: '!!rvt' });
  // Bremszylinder
  [11.2, 12.4].forEach((x, k) => {
    seg(s, x, 4.95, x, 5.12, { col: st.cyl ? BLU : DIM[BLU], th: 0.08, name: '!!cz' + k });
    s.rrect(x - 0.28, 5.1, 0.56, 0.3, { fill: st.cyl ? '1F3A63' : '16202E', line: st.cyl ? BLU : '4A5668', lw: 1.5, rr: 0.2, name: '!!cy' + k });
    seg(s, x, 5.4, x, st.cyl ? 5.66 : 5.46, { col: 'B3BBC6', th: 0.07, name: '!!cr' + k });
  });
  s.text(st.cyl ? 'Bremszylinder: bremsen' : 'Bremszylinder: frei', { x: 9.2, y: 5.18, w: 1.75, h: 0.4, size: 11, bold: true, color: st.cyl ? C.txt : C.dim, lsm: 0.9, name: '!!cyt' });
  // Kupplungsköpfe
  s.oval(KX - 0.14, RY - 0.14, 0.28, 0.28, { fill: RED, line: C.dark, lw: 1.5, name: '!!kr' });
  s.oval(KX - 0.14, YY - 0.14, 0.28, 0.28, { fill: YEL, line: C.dark, lw: 1.5, name: '!!ky' });
  // Bruchstellen und Zischen
  const mark = (on, y, nm, txt, col) => s.text(on ? txt : '', { x: KX - 0.8, y: y - 0.62, w: 1.6, h: 0.32, size: 13, bold: true, color: col, align: 'center', name: '!!' + nm });
  mark(red === 'brk', RY, 'mr', '✕ abgerissen', C.red);
  mark(yel === 'brk' || yel === 'leak', YY + 0.92, 'my', yel === 'leak' ? '✕ zischt!' : '✕ abgerissen', YEL);
  s.text(st.vent ? 'entlüftet rot' : '', { x: 7.0, y: 2.08, w: 1.6, h: 0.3, size: 11, bold: true, color: C.red, align: 'center', name: '!!vt' });
  // Pedal
  s.rrect(6.25, 4.35, 0.6, 0.14, { fill: st.pedal ? C.txt : '7A8494', rr: 0.3, rotate: st.pedal ? 8 : -18, name: '!!pd' });
  s.text(st.pedal ? 'Bremspedal: getreten' : 'Bremspedal', { x: 5.85, y: 4.6, w: 2.5, h: 0.3, size: 11, bold: !!st.pedal, color: st.pedal ? C.txt : C.dim, name: '!!pdt' });
  // Lkw bremst / Vierkreisschutzventil
  s.text(st.lkwB ? 'Lkw bremst' : '', { x: 5.95, y: 5.05, w: 2.3, h: 0.36, size: 13, bold: true, color: C.dark, fill: st.lkwB ? C.red : undefined, ft: st.lkwB ? 0 : 100, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!lb' });
  s.text(st.vksv ? '✓ Vierkreisschutzventil schützt den Lkw' : '', { x: 5.85, y: 3.15, w: 1.45, h: 0.75, size: 10, bold: true, color: C.gr, lsm: 0.9, name: '!!vk' });
  // Statuszeile
  s.text(st.msg || '', { x: 5.75, y: 5.85, w: 7.3, h: 0.75, size: 16, bold: true, color: st.msgCol || C.txt, align: 'center', valign: 'middle', name: '!!msg' });
}
module.exports = { schema };
