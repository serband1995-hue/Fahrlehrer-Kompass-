// Stil-Bausteine Klasse C/CE (gleicher Look wie Klasse B: dunkel, Karten, Kicker, Fußzeile, Morph-Schritte)
const { W, H, icon } = require('./lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const C = { txt: 'F3F5F8', mut: 'A9B6C6', dim: '738296', card: '111B28', line: '2A3B52', card2: '172538', red: 'FF5C5C', or: 'FFB547', bl: '4CC9F0', gr: '38D98A', pu: '7AA2FF', am: 'F2C230', kap: 'FF8A3D', dark: '070B12', road: '232A35', road2: '2B3340', curb: '3C4656', mark: 'D9DEE6', white: 'FFFFFF' };
// Kapitel: Name in der Fußzeile, Akzentfarbe, Hintergrund
const SEC = {};
function sec(key, name, col, bg) { SEC[key] = { name, col, bg }; }
const P = { car: [0.594, 1.188], bike: [0.3575, 0.6875], ped: [0.58, 0.5], truck: [0.78, 2.86] };

function base(deck, key, { notes = '', bg, transition = 'fade', noGlide = false, footer = true, ov = false, dur, bgX = 0, adv } = {}) {
  const S = SEC[key];
  const s = deck.add({ transition, notes, footer: false, noGlide, dur, adv });
  if (bgX) s.img(SEC[key].bg, { x: 0, y: 0, w: W, h: H, name: '!!bg0' });
  s.img(bg || S.bg, { x: bgX, y: 0, w: bgX ? W - bgX : W, h: H, name: '!!bg' });
  if (ov) s.img('ov_left.png', { x: 0, y: 0, w: ov === true ? W : ov, h: H, name: '!!ov' });
  if (footer) {
    s.text(deck.ftLabel + '  ·  ' + S.name, { x: 0.6, y: 7.02, w: 9, h: 0.28, size: 10, color: C.dim, cs: 2, name: '!!ftL' });
    s.text(String(s.idx), { x: 12.13, y: 7.02, w: 0.6, h: 0.28, size: 10, color: C.dim, align: 'right', name: '!!ftR' });
  }
  s.sec = S; s.deck = deck;
  return s;
}
const kick = (s, t, o = {}) => s.text(t.toUpperCase(), { x: o.x ?? 0.7, y: o.y ?? 0.6, w: o.w ?? 11, h: 0.35, size: 13, bold: true, color: o.col || s.sec.col, cs: 3, name: o.name }, o.anim);
const title = (s, t, o = {}) => s.text(t, { x: o.x ?? 0.7, y: o.y ?? 0.95, w: o.w ?? 12, h: o.h ?? 0.8, size: o.size ?? 40, bold: true, color: o.col || C.txt, name: o.name, lsm: 0.95 }, o.anim);
const card = (s, x, y, w, h, o = {}, anim) => s.rrect(x, y, w, h, { fill: o.fill || C.card, line: o.line || C.line, lw: o.lw || 1, rr: o.rr ?? 0.16, name: o.name }, anim);
const CLICK = { fx: 'flyL', c: true, dur: 450 };
async function badge(s, x, y, d, col, ico, anim) {
  s.oval(x, y, d, d, { fill: col, line: col }, anim);
  const i = d * 0.52;
  s.img(await icon(ico, C.dark), { x: x + (d - i) / 2, y: y + (d - i) / 2, w: i, h: i }, anim ? { fx: 'fade', dur: 200 } : undefined);
}
// Verkehrszeichen aus den amtlichen SVG-Daten (OSM-Bibliothek) als PNG
const SIGND = path.join(__dirname, 'node_modules/@osm-traffic-signs/converter/dist/data-svgs/DE/svgs');
const signCache = {};
async function signImg(code) {
  if (signCache[code]) return signCache[code];
  const buf = await sharp(fs.readFileSync(path.join(SIGND, 'DE_' + code + '.svg')), { density: 300 }).png().toBuffer();
  return (signCache[code] = 'image/png;base64,' + buf.toString('base64'));
}
async function sign(s, code, x, y, w, h, anim, o = {}) { return s.img(await signImg(code), { x, y, w, h: h ?? w, name: o.name }, anim); }

// Mehrfachwahl: Frage steht, Klick 1 = Antworten, Klick 2 = Lösung, (Begründung kommt mit der Lösung)
function quiz(deck, key, { kicker, q, opts, ok, why, notes, size = 32, osize = 19 }) {
  const s = base(deck, key, { notes });
  kick(s, kicker); title(s, q, { size, h: 1.4 });
  const y0 = 2.75;
  opts.forEach((o, i) => {
    const y = y0 + i * 1.0;
    card(s, 0.7, y, 8.2, 0.82, { name: 'qo' + i }, { fx: 'flyL', c: i === 0, dur: 450 });
    s.text(String.fromCharCode(65 + i), { x: 0.92, y: y + 0.17, w: 0.48, h: 0.48, size: 15, bold: true, color: C.dark, fill: s.sec.col, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text(o, { x: 1.6, y, w: 7.2, h: 0.82, size: osize, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
  });
  const oks = [].concat(ok);
  oks.forEach((k, j) => {
    const y = y0 + k * 1.0;
    s.rrect(0.7, y, 8.2, 0.82, { line: C.gr, lw: 3, rr: 0.1 }, { fx: 'zoom', c: j === 0, dur: 350 });
    s.text('✓  RICHTIG', { x: 9.2, y: y + 0.13, w: 2.0, h: 0.56, size: 16, bold: true, color: C.dark, fill: C.gr, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.25, align: 'center', valign: 'middle', rotate: -3 }, { fx: 'stamp' });
  });
  if (why) {
    const yw = y0 + opts.length * 1.0 + 0.15;
    s.text(why, { x: 0.7, y: Math.max(yw, 5.85), w: 11.9, h: 0.9, size: 16, color: C.txt, valign: 'middle', fill: C.card2, line: C.gr, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [10, 14, 10, 14] }, { fx: 'rise', dur: 400 });
  }
  return s;
}
// Frage an die Klasse: große Frage, Klick = Antwortkarte(n) nacheinander
async function ask(deck, key, { kicker, q, answers, notes, ico = 'LuMessageCircleQuestion', qsize = 34, foot: ft }) {
  const s = base(deck, key, { notes });
  kick(s, kicker);
  await badge(s, 0.7, 1.05, 0.8, s.sec.col, ico);
  s.text(q, { x: 1.75, y: 0.98, w: 10.9, h: 1.5, size: qsize, bold: true, color: C.txt, valign: 'middle', lsm: 0.95 });
  const n = answers.length, gap = 0.18, top = 2.85, avail = 6.55 - top;
  const h = Math.min(1.25, (avail - gap * (n - 1)) / n);
  for (let i = 0; i < n; i++) {
    const a = answers[i];
    await point(s, 0.7, top + i * (h + gap), 11.93, h, a[0], a[3] || s.sec.col, a[1], a[2], CLICK, { size: a[4] || 19 });
  }
  if (ft) foot(s, ft);
  return s;
}
// Morph-Schrittfolge: links Schrittliste, unten Erklärung, rechts Szene (Objekte mit festen !!-Namen)
async function steps(deck, key, { kicker, ttl, list, caps, scene, notes, legend, listY = 1.7, dur, ask }) {
  const out = [];
  for (let i = 0; i < caps.length; i++) {
    const ML = '🖱 Keine Animation auf dieser Folie – nächster Klick = nächster Schritt (Morph).';
    const nt = /🖱/.test(notes[i]) ? notes[i] : (notes[i].includes('\n➜') ? notes[i].replace('\n➜', '\n' + ML + '\n➜') : notes[i] + '\n' + ML);
    const s = base(deck, key, { notes: nt, transition: i ? 'morph' : 'fade', noGlide: true, dur });
    const col = s.sec.col;
    s.text(kicker.toUpperCase(), { x: 0.7, y: 0.55, w: 5.2, h: 0.35, size: 13, bold: true, color: col, cs: 3, name: '!!k' });
    s.text(ttl, { x: 0.7, y: 0.88, w: 5.2, h: 0.6, size: 30, bold: true, color: C.txt, name: '!!t' });
    const hi = Math.min(i, list.length - 1);
    s.rect(0.62, listY + hi * 0.5 - 0.04, 4.6, 0.44, { fill: col, name: '!!hl', ft: 0 });
    list.forEach((l, k) => {
      const on = k === hi, done = k < hi;
      s.text(String(k + 1), { x: 0.7, y: listY + k * 0.5, w: 0.34, h: 0.34, size: 12, bold: true, color: on ? C.dark : (done ? C.dark : C.mut), fill: on ? col : (done ? C.mut : C.line), shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!b' + k });
      s.text(l, { x: 1.2, y: listY - 0.04 + k * 0.5, w: 3.95, h: 0.4, size: 16, bold: on, color: on ? C.dark : (done ? C.mut : C.dim), valign: 'middle', name: '!!l' + k });
    });
    if (ask) {
      const ans = i >= ask.at, top = listY + list.length * 0.5 + 0.12, hq = 5.05 - top;
      s.rrect(0.62, top, 4.6, hq, { fill: ans ? '12301F' : '1F1A33', line: ans ? C.gr : C.pu, lw: 1.5, rr: 0.12, name: '!!askbox' });
      s.text([{ text: ans ? '✓ Antwort  ' : '❓ Frage an die Klasse  ', options: { bold: true, color: ans ? C.gr : C.pu, breakLine: true } }, { text: ans ? ask.a : ask.q, options: { color: C.txt } }], { x: 0.8, y: top + 0.05, w: 4.3, h: hq - 0.1, size: 14, valign: 'middle', name: '!!asktxt' });
    }
    s.rrect(0.62, 5.15, 4.6, 1.65, { fill: C.card2, line: C.line, rr: 0.12, name: '!!capbox' });
    s.text(caps[i], { x: 0.82, y: 5.2, w: 4.25, h: 1.55, size: 15, color: C.txt, valign: 'middle', name: '!!cap' });
    if (legend) s.text(legend, { x: 5.6, y: 6.72, w: 7, h: 0.28, size: 10, italic: true, color: C.dim, name: '!!leg' });
    await scene(s, i);
    out.push(s);
  }
  return out;
}
// Fließende Bewegung: viele Bilder, die per Morph ineinander gleiten. frames: [{ t, hold, cap, note, answer }]
// Bilder ohne hold laufen von selbst weiter (advTm=0). Links: Frage-Karte, die bei answer:true zur Antwort wird.
async function motion(deck, key, { kicker, ttl, frames, scene, question, answer, legend, dur = 420, holdDur = 900 }) {
  let cap = '', ans = false;
  for (let k = 0; k < frames.length; k++) {
    const f = frames[k], last = k === frames.length - 1;
    if (f.cap) cap = f.cap;
    if (f.answer) ans = true;
    const auto = !f.hold && !last;
    const autoNote = '▶ Die Bewegung läuft – zuschauen lassen.\n🖱 Kein Klick – die Folie läuft von selbst weiter.\n➜ (läuft weiter)';
    let nt = f.note || autoNote;
    if (!/🖱/.test(nt)) nt = nt.includes('\n➜') ? nt.replace('\n➜', '\n🖱 Klick: Die Bewegung läuft weiter.\n➜') : nt + '\n🖱 Klick: Die Bewegung läuft weiter.';
    const prevHold = k > 0 && (frames[k - 1].hold);
    const s = base(deck, key, { notes: nt, transition: k ? 'morph' : 'fade', noGlide: true, dur: k ? (prevHold ? holdDur : dur) : undefined, adv: auto ? 0 : undefined });
    const col = s.sec.col;
    s.text(kicker.toUpperCase(), { x: 0.7, y: 0.55, w: 5.2, h: 0.35, size: 13, bold: true, color: col, cs: 3, name: '!!k' });
    s.text(ttl, { x: 0.7, y: 0.88, w: 5.0, h: 0.6, size: 30, bold: true, color: C.txt, name: '!!t' });
    if (question) {
      s.rrect(0.62, 1.75, 4.6, 1.5, { fill: '1F1A33', line: C.pu, lw: 1.5, rr: 0.12, name: '!!qbox' });
      s.text([{ text: '❓ Frage an die Klasse', options: { bold: true, color: C.pu, breakLine: true } }, { text: question, options: { color: C.txt } }], { x: 0.8, y: 1.8, w: 4.3, h: 1.4, size: 15, valign: 'middle', name: '!!qtxt' });
      s.rrect(0.62, 3.4, 4.6, 1.6, { fill: ans ? '12301F' : '0D141E', line: ans ? C.gr : C.line, lw: 1.5, rr: 0.12, name: '!!abox' });
      s.text(ans ? [{ text: '✓ Antwort', options: { bold: true, color: C.gr, breakLine: true } }, { text: answer, options: { color: C.txt } }] : [{ text: 'Antwort folgt …', options: { italic: true, color: C.dim } }], { x: 0.8, y: 3.45, w: 4.3, h: 1.5, size: 15, valign: 'middle', name: '!!atxt' });
    }
    s.rrect(0.62, 5.15, 4.6, 1.65, { fill: C.card2, line: C.line, rr: 0.12, name: '!!capbox' });
    s.text(cap, { x: 0.82, y: 5.2, w: 4.25, h: 1.55, size: 15, color: C.txt, valign: 'middle', name: '!!cap' });
    if (legend) s.text(legend, { x: 5.6, y: 6.72, w: 7, h: 0.28, size: 10, italic: true, color: C.dim, name: '!!leg' });
    await scene(s, f.t, k);
  }
}
// Straßen-Bausteine (Draufsicht). Alle Teile bekommen feste Namen, damit Morph sie wiedererkennt.
function roadH(s, x, y, w, h, o = {}) {
  const nm = o.name || 'road';
  s.rect(x, y, w, h, { fill: o.fill || C.road, name: '!!' + nm });
  if (o.center !== false) {
    const cy = o.cy ?? (y + h / 2 - 0.02);
    for (let k = 0, xx = x + 0.2; xx < x + w - 0.3; xx += 0.75, k++) s.rect(xx, cy, 0.42, 0.045, { fill: C.mark, name: `!!${nm}_m${k}` });
  }
  if (o.curbs !== false) { s.rect(x, y - 0.12, w, 0.12, { fill: C.curb, name: `!!${nm}_c1` }); s.rect(x, y + h, w, 0.12, { fill: C.curb, name: `!!${nm}_c2` }); }
}
function roadV(s, x, y, w, h, o = {}) {
  const nm = o.name || 'roadv';
  s.rect(x, y, w, h, { fill: o.fill || C.road, name: '!!' + nm });
  if (o.center !== false) {
    const cx = o.cx ?? (x + w / 2 - 0.02);
    for (let k = 0, yy = y + 0.2; yy < y + h - 0.3; yy += 0.75, k++) s.rect(cx, yy, 0.045, 0.42, { fill: C.mark, name: `!!${nm}_m${k}` });
  }
  if (o.curbs !== false) { s.rect(x - 0.12, y, 0.12, h, { fill: C.curb, name: `!!${nm}_c1` }); s.rect(x + w, y, 0.12, h, { fill: C.curb, name: `!!${nm}_c2` }); }
}
// Fahrzeug-Sprite (Front zeigt nach oben bei rot=0). cx/cy = Mittelpunkt
function veh(s, file, cx, cy, rot, name, o = {}) {
  const [w, h] = o.size || (file.startsWith('truck') ? P.truck : file.startsWith('bike') || file.startsWith('moto') ? P.bike : file.startsWith('ped') ? P.ped : P.car);
  const sc = o.scale || 1;
  return s.img(file, { x: cx - (w * sc) / 2, y: cy - (h * sc) / 2, w: w * sc, h: h * sc, rotate: rot, name, transparency: o.tr }, o.anim);
}
// Karte mit Symbol, fett gedrucktem Stichwort und Erklärung
async function point(s, x, y, w, h, ico, col, head, body, anim = CLICK, o = {}) {
  card(s, x, y, w, h, { fill: o.fill || C.card, line: o.line || C.line }, anim);
  const d = Math.min(0.62, h - 0.3);
  s.oval(x + 0.22, y + (h - d) / 2, d, d, { fill: col, line: col }, anim ? { fx: 'zoom', dur: 250 } : undefined);
  s.img(await icon(ico, C.dark), { x: x + 0.22 + d * 0.22, y: y + (h - d) / 2 + d * 0.22, w: d * 0.56, h: d * 0.56 }, anim ? { fx: 'fade', dur: 150 } : undefined);
  s.text([{ text: head + (body ? (o.br ? '' : '  ') : ''), options: { bold: true, color: C.txt, breakLine: !!o.br } }, ...(body ? [{ text: body, options: { color: o.bodyCol || C.mut } }] : [])], { x: x + d + 0.45, y, w: w - d - 0.6, h, size: o.size || 17, valign: 'middle' }, anim ? { fx: 'fade', dur: 200 } : undefined);
}
function foot(s, t) { s.text(t, { x: 0.7, y: 6.62, w: 11.9, h: 0.3, size: 11, italic: true, color: C.dim }); }

// Kapitel-Trennfolie: große Nummer, Titel, Unterzeile, Foto rechts mit Verlauf
async function chapter(deck, key, { num, ttl, sub, bg, notes, ico = 'LuTruck', bgX = 0 }) {
  const s = base(deck, key, { notes, bg, bgX, ov: bg && !bgX ? 9.5 : false, transition: 'black', footer: true });
  const col = s.sec.col;
  if (bg && !bgX) s.img('ov_left.png', { x: 0, y: 0, w: 8.0, h: H, name: '!!ov2' });
  if (!bg) { s.oval(8.3, 1.4, 4.4, 4.4, { fill: col, ft: 90, line: col, lt: 60, lw: 2 }, { fx: 'zoom', auto: true, dur: 900 }); s.img(await icon(ico, col), { x: 9.4, y: 2.5, w: 2.2, h: 2.2 }, { fx: 'fade', auto: true, dur: 900, d: 200 }); }
  s.text(String(num).padStart(2, '0'), { x: 0.6, y: 1.2, w: 5, h: 2.2, size: 150, bold: true, color: col, name: 'chN' }, { fx: 'rise', auto: true, dur: 900 });
  s.rect(0.75, 3.55, 1.4, 0.07, { fill: col }, { fx: 'wipeR', auto: true, dur: 600, d: 300 });
  s.text(ttl, { x: 0.7, y: 3.8, w: bgX ? bgX - 0.9 : 6.3, h: 1.6, size: 44, bold: true, color: C.txt, lsm: 0.92 }, { fx: 'float', auto: true, dur: 700, d: 350 });
  if (sub) s.text(sub, { x: 0.7, y: 5.45, w: bgX ? Math.min(5.6, bgX - 1.0) : 5.6, h: 0.9, size: 19, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 650 });
  return s;
}
// Zum Mitschreiben: Zeilen mit Stichwort, Lösung erscheint je Klick (Frage → Lösung)
function write(deck, key, { kicker = 'Zum Mitschreiben', ttl, rows, notes, size = 19, labelW = 4.2 }) {
  const s = base(deck, key, { notes });
  kick(s, kicker); title(s, ttl, { size: 36 });
  s.text('✎', { x: 11.9, y: 0.55, w: 0.8, h: 0.8, size: 36, color: s.sec.col, align: 'right' });
  const n = rows.length, top = 2.0, rh = Math.min(0.78, (6.6 - top) / n);
  rows.forEach((r, i) => {
    const y = top + i * rh;
    s.rect(0.7, y + rh - 0.06, 11.93, 0.015, { fill: C.line });
    s.text(r[0], { x: 0.7, y, w: labelW, h: rh - 0.08, size, bold: true, color: s.sec.col, valign: 'middle' });
    s.text(r[1], { x: 0.7 + labelW + 0.2, y, w: 11.93 - labelW - 0.2, h: rh - 0.08, size, color: C.txt, valign: 'middle' }, { fx: 'wipeR', c: true, dur: 450 });
  });
  return s;
}
// Das nimmst du mit: Punkte je Klick
async function takeaway(deck, key, { ttl = 'Das nimmst du mit', items, notes }) {
  const s = base(deck, key, { notes });
  kick(s, 'Zusammenfassung'); title(s, ttl, { size: 40 });
  const n = items.length, top = 2.0, gap = 0.14, h = Math.min(0.95, (6.6 - top - gap * (n - 1)) / n);
  for (let i = 0; i < n; i++) await point(s, 0.7, top + i * (h + gap), 11.93, h, items[i][0], s.sec.col, items[i][1], items[i][2], CLICK, { size: 18 });
  return s;
}
// Foto-Folie mit Frage links, Auflösung auf Klick
async function photoAsk(deck, key, o) {
  const { bg, kicker, q, answers, notes, ov = 7.2, w = 5.9, qsize = 38, bgX = 0 } = o;
  const s = base(deck, key, { bg, ov, notes, bgX });
  s.img('ov_left.png', { x: 0, y: 0, w: ov, h: H, name: '!!ov2' });
  kick(s, kicker);
  title(s, q, { w, h: 2.0, size: qsize });
  const n = answers.length, top = 3.25, gap = 0.16, h = Math.min(1.15, (6.6 - top - gap * (n - 1)) / n);
  for (let i = 0; i < n; i++) await point(s, 0.7, top + i * (h + gap), w, h, answers[i][0], answers[i][3] || s.sec.col, answers[i][1], answers[i][2], CLICK, { br: true, size: o.asize || 16 });
  return s;
}
module.exports = { motion, C, SEC, sec, P, base, kick, title, card, badge, quiz, ask, steps, roadH, roadV, veh, foot, point, chapter, write, takeaway, photoAsk, sign, signImg, CLICK };
// Eigene Symbole als SVG → PNG (z. B. Fahrtenschreiber-Symbole)
const svgCache = {};
async function svgImg(svg, w = 512, h = 512, sc = 1) {
  const key = svg + '|' + sc;
  if (svgCache[key]) return svgCache[key];
  const buf = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w * sc}" height="${h * sc}" viewBox="0 0 ${w} ${h}">${svg}</svg>`)).png().toBuffer();
  return (svgCache[key] = 'image/png;base64,' + buf.toString('base64'));
}
// Detaillierter Lkw (Seitenansicht, Front links) auf die Folie: x = Front, gy = Boden, k = Maßstab.
// split: Aufbau und Räder getrennt (für Morph beim Heben/Senken), lift = Aufbau um so viel (Zoll, unskaliert) angehoben
async function lkw(s, o = {}, { x, gy, k = 1, name = 'lkw', split = false, lift = 0, anim, rot } = {}) {
  const { lkwSide } = require('./lkw');
  const r = lkwSide(o), w = r.W / 100 * k, h = r.H / 100 * k, X0 = x - r.pad * k, Y0 = gy - r.Ht * k;
  if (split) {
    s.img(await svgImg(r.wheels, r.W, r.H, 2.5), { x: X0, y: Y0, w, h, name: '!!' + name + 'W' }, anim);
    s.img(await svgImg(r.upper, r.W, r.H, 2.5), { x: X0, y: Y0 - lift * k, w, h, name: '!!' + name + 'U' }, anim);
  } else s.img(await svgImg(r.upper + r.wheels, r.W, r.H, 2.5), { x: X0, y: Y0, w, h, rotate: rot, name: name.startsWith('!!') ? name : undefined }, anim);
  return { pt: (nx, ny) => [x + nx * k, gy - ny * k], r };
}
async function lkwHeck(s, o = {}, { x, gy, k = 1, anim } = {}) {
  const { lkwRear } = require('./lkw');
  const r = lkwRear(o), w = r.W / 100 * k, h = r.H / 100 * k;
  s.img(await svgImg(r.svg, r.W, r.H, 2.5), { x: x - r.pad * k, y: gy - r.Ht * k, w, h }, anim);
  return { pt: (nx, ny) => [x + nx * k, gy - ny * k], r };
}
// Die vier Symbole des Fahrtenschreibers (Lenken, andere Arbeit, Bereitschaft, Ruhe)
function tachoSym(kind, col = '#F3F5F8') {
  const st = `fill="none" stroke="${col}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"`;
  if (kind === 'lenken') return `<circle cx="256" cy="256" r="190" ${st}/><circle cx="256" cy="256" r="42" fill="${col}"/><path d="M80 236 L214 250 M298 250 L432 236 M256 298 L256 446" ${st}/>`;
  if (kind === 'arbeit') return `<path d="M120 400 L340 180 M392 400 L172 180" ${st}/><path d="M290 110 L390 210 L430 170 L330 70 Z" fill="${col}"/><path d="M222 110 L122 210 L82 170 L182 70 Z" fill="${col}"/>`;
  if (kind === 'bereit') return `<rect x="96" y="96" width="320" height="320" ${st}/><path d="M96 416 L416 96" ${st}/>`;
  if (kind === 'ruhe') return `<path d="M70 120 L70 420 M70 330 L442 330 L442 420" ${st}/><circle cx="150" cy="260" r="42" fill="${col}"/><path d="M210 300 L210 230 Q210 210 230 210 L400 210 Q442 210 442 252 L442 300" ${st}/>`;
}
module.exports.svgImg = svgImg; module.exports.lkw = lkw; module.exports.lkwHeck = lkwHeck; module.exports.tachoSym = tachoSym;
// Pfeil als Schaft + Dreieckspitze (morph-fähig über feste Namen): von (x1,y1) nach (x2,y2)
function arrow(s, x1, y1, x2, y2, o = {}) {
  const col = o.col || C.red, th = o.th || 0.11, hd = o.head || 0.3, nm = o.name || 'pf';
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), deg = a * 180 / Math.PI;
  const hide = L < 0.05 || o.hide;
  const ls = Math.max(0.02, L - hd * 0.8), mx = x1 + Math.cos(a) * ls / 2, my = y1 + Math.sin(a) * ls / 2;
  s.rrect(mx - ls / 2, my - th / 2, ls, th, { fill: col, ft: hide ? 100 : 0, rr: 0.5, rotate: Math.round(deg * 10) / 10, name: '!!' + nm + 'S', glow: o.glow, glowColor: col });
  const hx = x2 - Math.cos(a) * hd / 2, hy = y2 - Math.sin(a) * hd / 2;
  s.shape(s.pres.shapes.ISOSCELES_TRIANGLE, { x: hx - hd / 2, y: hy - hd / 2, w: hd, h: hd, fill: col, ft: hide ? 100 : 0, rotate: Math.round((deg + 90) * 10) / 10, name: '!!' + nm + 'H' });
}
module.exports.arrow = arrow;
// Gerades Band (Gurt, Kette, Stange) von (x1,y1) nach (x2,y2), morph-fähig über festen Namen
function seg(s, x1, y1, x2, y2, o = {}) {
  const L = Math.max(0.02, Math.hypot(x2 - x1, y2 - y1)), deg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI, th = o.th || 0.07;
  return s.rrect((x1 + x2) / 2 - L / 2, (y1 + y2) / 2 - th / 2, L, th, { fill: o.col || C.or, ft: o.hide ? 100 : (o.ft || 0), rr: o.rr ?? 0.3, rotate: Math.round(deg * 10) / 10, name: o.name, line: o.line, lw: o.lw, glow: o.glow, glowColor: o.col || C.or });
}
module.exports.seg = seg;
// Sattelauflieger (Seitenansicht, Front links bei x): Aufbau und Stützwinden als getrennte Bilder (!!name / !!nameL)
async function auflieger(s, o = {}, { x, gy, k = 1, name = 'af', rot } = {}) {
  const { aufliegerSide } = require('./lkw');
  const r = aufliegerSide(o), w = r.W / 100 * k, h = r.H / 100 * k, X0 = x - r.pad * k, Y0 = gy - r.Ht * k;
  s.img(await svgImg(r.body, r.W, r.H, 2.5), { x: X0, y: Y0, w, h, rotate: rot, name: '!!' + name });
  s.img(await svgImg(r.legs, r.W, r.H, 2.5), { x: X0, y: Y0, w, h, rotate: rot, name: '!!' + name + 'L' });
  return { pt: (nx, ny) => [x + nx * k, gy - ny * k], r };
}
// Deichselanhänger (Seitenansicht, Front links bei x); pivot = Drehpunkt der Deichsel in Folienkoordinaten
async function anhaenger(s, o = {}, { x, gy, k = 1, name = 'ah' } = {}) {
  const { anhaengerSide } = require('./lkw');
  const r = anhaengerSide(o), w = r.W / 100 * k, h = r.H / 100 * k;
  s.img(await svgImg(r.body, r.W, r.H, 2.5), { x: x - r.pad * k, y: gy - r.Ht * k, w, h, name: '!!' + name });
  return { pt: (nx, ny) => [x + nx * k, gy - ny * k], pivot: [x + r.pivot[0] * k, gy - r.pivot[1] * k], r };
}
module.exports.auflieger = auflieger; module.exports.anhaenger = anhaenger;
