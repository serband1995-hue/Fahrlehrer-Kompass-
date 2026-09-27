// Gemeinsame Folien-Bausteine für Lektion 5
const fs = require('fs');
const path = require('path');
const { COL, SERIF, W, H, icon } = require('./lib5');
const { X, R, K } = require('./geo5');
const { Actor } = require('./drive5');
const SIGN = JSON.parse(fs.readFileSync(path.join(__dirname, 'art', 'signs.json')));

const run = (text, o = {}) => ({ text, options: o });
function footer(s) { s.text('FAHRLEHRER SERBAND', { x: W - 3.3, y: 0.32, w: 2.8, h: 0.25, size: 10, bold: true, cs: 3, color: COL.dim, align: 'right', name: '!!ft' }); }
function kicker(s, t, x, y, o = {}, anim) { s.key = s.key || t; return s.text(t.toUpperCase(), { x, y, w: o.w || 9, h: 0.35, size: o.size || 13, bold: true, cs: 5, color: o.color || COL.orange, name: o.name, align: o.align }, anim); }
function title(s, t, x, y, w, h, o = {}, anim) { s.tkey = s.tkey || t; return s.text(t, { x, y, w, h, font: SERIF, size: o.size || 44, bold: o.bold ?? true, color: o.color || COL.txt, lsm: o.lsm || 0.95, name: o.name, align: o.align, valign: o.valign, italic: o.italic }, anim); }
function chip(s, t, x, y, w, o = {}, anim) {
  return s.text(t, { x, y, w, h: o.h || 0.5, size: o.size || 16, bold: o.bold ?? true, color: o.color || COL.txt, fill: o.fill || COL.card2, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: o.rr ?? 0.25, align: 'center', valign: 'middle', line: o.line, lw: o.lw, name: o.name, glow: o.glow, glowColor: o.glowColor, glowOp: o.glowOp, rotate: o.rotate }, anim);
}
function body(s, t, x, y, w, h, o = {}, anim) { return s.text(t, { x, y, w, h, size: o.size || 19, color: o.color || COL.muted, lsm: o.lsm || 1.08, bold: o.bold, italic: o.italic, align: o.align, valign: o.valign, name: o.name, font: o.font }, anim); }
function src(s, t, o = {}) { return s.text(t, { x: o.x ?? 0.8, y: o.y ?? 6.95, w: o.w ?? 11.7, h: 0.3, size: 11.5, color: '8C95A3', name: o.name }); }
// Verkehrszeichen (amtliche Grafik), Höhe h
function sign(s, id, x, y, h, anim, o = {}) { const w = h * (SIGN[id] || 1); return s.img('sign_' + id + '.png', { x, y, w, h, name: o.name, alt: 'Verkehrszeichen ' + id.replace('_', '.') }, anim); }
function signW(id, h) { return h * (SIGN[id] || 1); }
// Nummern-Stempel
function stampNum(s, n, x, y, anim = { fx: 'stamp', a: true }, o = {}) {
  return s.text(String(n), { x: x - 0.3, y: y - 0.3, w: 0.6, h: 0.6, font: SERIF, size: 26, bold: true, color: '1A0E05', fill: o.fill || COL.orange, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', glow: 12, glowColor: o.fill || COL.orange, glowOp: 0.55, name: o.name }, anim);
}
// Buchstaben-Marke neben Fahrzeug
function tag(s, t, x, y, col, anim, name) {
  return s.text(t, { x: x - 0.24, y: y - 0.24, w: 0.48, h: 0.48, size: 20, bold: true, color: '0A0C10', fill: col, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', line: 'FFFFFF', lw: 1.5, name }, anim);
}
// Stempel-Banner (z. B. „STOPP!“)
function banner(s, t, x, y, w, col = COL.orange, anim = { fx: 'stamp', c: true }, o = {}) {
  return s.text(t, { x, y, w, h: o.h || 0.62, size: o.size || 22, bold: true, cs: 1, color: o.color || '0A0C10', fill: col, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle', rotate: o.rotate ?? -3, glow: 14, glowColor: col, glowOp: 0.45, name: o.name }, anim);
}
// Kleine Ampel (Draufsicht-Szenen) – Gehäuse ohne Animation, Lampen als eigene Objekte
function smallLight(s, x, y, o = {}) {
  const w = o.w || 0.26, h = w * 2.6, r = w * 0.62;
  s.rrect(x, y, w, h, { fill: '07090D', line: '4A5261', lw: 1, rr: 0.25, name: o.name ? o.name + 'h' : undefined });
  const ys = { r: y + h * 0.18, y: y + h * 0.5, g: y + h * 0.82 };
  const cols = { r: 'FF3B30', y: 'FFB400', g: '2EE071' };
  for (const k of ['r', 'y', 'g']) s.oval(x + w / 2 - r / 2, ys[k] - r / 2, r, r, { fill: '1B1F27', name: o.name ? o.name + 'd' + k : undefined });
  const lamp = (k, anim) => s.oval(x + w / 2 - r / 2, ys[k] - r / 2, r, r, { fill: cols[k], glow: 8, glowColor: cols[k], glowOp: 0.8, name: o.name ? o.name + k : undefined }, anim);
  return { lamp, x, y, w, h };
}
// Fahrzeuge an Kreuzungs-Armen (X-Szenen). arm: S|N|E|W
const ARM = { S: 0, W: 90, N: 180, E: 270 };
const rot = (v, h) => { const a = h * Math.PI / 180; return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]; };
function armPos(arm, back = 0, geo = X) {
  const h = ARM[arm], v = rot([geo.L / 2, geo.L + 0.825 + back], h);
  return [geo.cx + v[0], geo.cy + v[1], h];
}
function carAt(s, sprite, arm, o = {}) { const [x, y, h] = armPos(arm, o.back || 0); return new Actor(s, sprite, x, y, h, { k: X.k, name: o.name, anim: o.anim }); }
// Standard-Manöver (relativ, gelten für jeden Arm)
const MOVES = {
  straight: (ext = 5.0) => [['S', ext]],
  right: (ext = 3.2) => [['S', 0.5125], ['T', 90, 0.8], ['S', ext]],
  left: (ext = 1.6) => [['S', 0.9875], ['T', -90, 1.3], ['S', ext]],
};
function go(actor, move, trig = { c: true }, o = {}) {
  actor.drive(MOVES[move](o.ext), trig, o);
  if (o.vanish !== false) vanish(actor);
  return actor;
}
function vanish(actor, trig = { a: true }) {
  actor.parts.filter(p => p.live).forEach((p, i) => actor.s.reg(p.name, { fx: 'out', dur: 350, ...(i === 0 ? trig : {}) }, 'pic'));
  actor.parts.forEach(p => { p.live = false; });
  actor.blinkPart = null;
}
// Rote Blitz-Überblendung (Unfall)
function flash(s, trig = {}) {
  const n = s.rect(0, 0, W, H, { fill: 'FF1E1E', ft: 55 });
  s.reg(n, { fx: 'fade', dur: 120, ...trig }, 'sp');
  s.reg(n, { fx: 'out', dur: 700, a: true }, 'sp');
  return n;
}
module.exports = { COL, SERIF, W, H, run, footer, kicker, title, chip, body, src, sign, signW, stampNum, tag, banner, smallLight, armPos, carAt, go, vanish, flash, MOVES, X, R, K, Actor, icon };
