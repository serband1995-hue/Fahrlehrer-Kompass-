// Lektion 5 · Grafiken: Hintergründe, Draufsicht-Szenen, Fahrzeuge, Polizist, amtliche Verkehrszeichen
// Basis: art.js (Lektion 9+10) und gen.js (Lektion 12)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { W, H, X, R, K, CAR, BIKE, PED, TRUCK, COP } = require('./geo5');
const OUT = path.join(__dirname, 'art');
fs.mkdirSync(OUT, { recursive: true });
const PX = 2000;

const C = {
  bg: '#070B12', asphalt: '#1A222D', asphalt2: '#161D27', mark: '#D9DEE5', walk: '#252E3B', walk2: '#2B3544',
  block: '#0C1119', curb: '#3A4658', radweg: '#6E2A2E', grass: '#0E1A14', amber: '#FFB547', red: '#FF5C5C',
  green: '#38D98A', cyan: '#4CC9F0', white: '#F3F5F8', orange: '#FF7A1A', paver: '#2A2F38', paver2: '#323843'
};

const defs = `
<defs>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="9" numOctaves="2" seed="3" result="n"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.10"/></feComponentTransfer>
  </filter>
  <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#FFD9A0" stop-opacity="0.20"/><stop offset="0.5" stop-color="#FFC878" stop-opacity="0.07"/><stop offset="1" stop-color="#FFC878" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></radialGradient>
  <linearGradient id="leftfade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.bg}" stop-opacity="0.97"/><stop offset="0.72" stop-color="${C.bg}" stop-opacity="0.84"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}" stop-opacity="0.96"/><stop offset="0.8" stop-color="${C.bg}" stop-opacity="0.78"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  <marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.04" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="13.333" height="7.5"><feGaussianBlur stdDeviation="0.06"/></filter>
  <filter id="blur2" filterUnits="userSpaceOnUse" x="0" y="0" width="13.333" height="7.5"><feGaussianBlur stdDeviation="0.035"/></filter>
</defs>`;
const svgWrap = (body, w = W, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(PX * w / W)}" height="${Math.round(PX * h / W)}">${defs}${body}</svg>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, col, sw, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${sw}" ${extra}/>`;
const dash = (x1, y1, x2, y2, sw = 0.035, d = '0.66 0.66') => line(x1, y1, x2, y2, C.mark, sw, `stroke-dasharray="${d}" opacity="0.85"`);
const solid = (x1, y1, x2, y2, sw = 0.035) => line(x1, y1, x2, y2, C.mark, sw, 'opacity="0.85"');
const lamp = (x, y, r = 1.3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#lamp)"/>`;
const grainAll = () => `<rect x="0" y="0" width="${W}" height="${H}" filter="url(#grain)"/>`;
const vignette = () => `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#vig)"/>`;
function blocks(x, y, w, h, seed = 1) {
  if (w <= 0 || h <= 0) return '';
  let s = rect(x, y, w, h, C.block);
  let r = seed * 9301;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < Math.max(2, Math.round(w * h / 1.6)); i++) {
    const bw = 0.6 + rnd() * 1.4, bh = 0.5 + rnd() * 1.2;
    const bx = x + rnd() * Math.max(0.01, w - bw), by = y + rnd() * Math.max(0.01, h - bh);
    s += rect(bx, by, Math.min(bw, w), Math.min(bh, h), rnd() > 0.5 ? '#111822' : '#0F151E', `rx="0.04" stroke="#18212D" stroke-width="0.02"`);
  }
  return s;
}
// Pflaster-Textur
function pavers(x, y, w, h, s1 = 0.13) {
  let s = rect(x, y, w, h, C.paver);
  let row = 0;
  for (let yy = y; yy < y + h; yy += s1, row++) {
    for (let xx = x - (row % 2) * s1 / 2; xx < x + w; xx += s1) {
      const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + s1 - 0.012);
      if (x1 > x0) s += rect(x0, yy, x1 - x0, Math.min(s1 - 0.012, y + h - yy), C.paver2, 'opacity="0.55"');
    }
  }
  return s;
}
async function png(name, svg) { await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT, name + '.png')); }
async function jpg(name, svg, q = 84) { await sharp(Buffer.from(svg)).flatten({ background: C.bg }).jpeg({ quality: q, mozjpeg: true }).toFile(path.join(OUT, name + '.jpg')); }

// ---------- Sprites (Front nach oben) ----------
const M = 70;
function spriteSvg(wm, hm, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wm} ${hm}" width="${Math.round(wm * M)}" height="${Math.round(hm * M)}">
  <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.12"/></filter>
   <radialGradient id="bl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE3A3" stop-opacity="1"/><stop offset="0.25" stop-color="#FFB547" stop-opacity="0.95"/><stop offset="1" stop-color="#FF9A1F" stop-opacity="0"/></radialGradient>
   <radialGradient id="hl" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#FFF4D6" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF4D6" stop-opacity="0"/></radialGradient>
  </defs>${body}</svg>`;
}
function carBody(col, col2, { label = '', lights = false } = {}) {
  const p = CAR.pad, w = CAR.w, l = CAR.l, x = p, y = p;
  const wh = (cx, cy) => `<rect x="${cx - 0.13}" y="${cy - 0.34}" width="0.26" height="0.68" rx="0.08" fill="#05070A"/>`;
  return `
  <rect x="${x + 0.05}" y="${y + 0.12}" width="${w}" height="${l}" rx="0.5" fill="#000" opacity="0.55" filter="url(#sh)"/>
  ${wh(x + 0.02, y + 1.05)}${wh(x + w - 0.02, y + 1.05)}${wh(x + 0.02, y + l - 1.0)}${wh(x + w - 0.02, y + l - 1.0)}
  <rect x="${x}" y="${y}" width="${w}" height="${l}" rx="0.55" fill="${col}"/>
  <rect x="${x + 0.12}" y="${y + 0.1}" width="${w - 0.24}" height="${l - 0.2}" rx="0.45" fill="${col2}" opacity="0.35"/>
  <path d="M${x + 0.2} ${y + 1.55} Q${x + w / 2} ${y + 1.2} ${x + w - 0.2} ${y + 1.55} L${x + w - 0.3} ${y + 2.05} L${x + 0.3} ${y + 2.05} Z" fill="#0A1018" opacity="0.92"/>
  <rect x="${x + 0.3}" y="${y + 2.05}" width="${w - 0.6}" height="1.25" rx="0.12" fill="${col2}" opacity="0.55"/>
  <path d="M${x + 0.32} ${y + 3.3} L${x + w - 0.32} ${y + 3.3} L${x + w - 0.24} ${y + 3.75} Q${x + w / 2} ${y + 3.9} ${x + 0.24} ${y + 3.75} Z" fill="#0A1018" opacity="0.9"/>
  <rect x="${x - 0.12}" y="${y + 1.5}" width="0.16" height="0.22" rx="0.05" fill="${col}"/><rect x="${x + w - 0.04}" y="${y + 1.5}" width="0.16" height="0.22" rx="0.05" fill="${col}"/>
  <rect x="${x + 0.18}" y="${y + 0.05}" width="0.42" height="0.14" rx="0.06" fill="#FFFFFF"/><rect x="${x + w - 0.6}" y="${y + 0.05}" width="0.42" height="0.14" rx="0.06" fill="#FFFFFF"/>
  <rect x="${x + 0.18}" y="${y + l - 0.17}" width="0.44" height="0.12" rx="0.05" fill="#FF3B3B"/><rect x="${x + w - 0.62}" y="${y + l - 0.17}" width="0.44" height="0.12" rx="0.05" fill="#FF3B3B"/>
  ${label ? `<circle cx="${x + w / 2}" cy="${y + 2.68}" r="0.52" fill="#0A1018" opacity="0.85"/><text x="${x + w / 2}" y="${y + 2.93}" font-family="Carlito, Calibri, Arial" font-weight="700" font-size="0.72" text-anchor="middle" fill="#FFFFFF">${label}</text>` : ''}`;
}
const carSvg = (col, col2, opt) => spriteSvg(CAR.w + 2 * CAR.pad, CAR.l + 2 * CAR.pad, carBody(col, col2, opt));
function blinkSvg(side) {
  const p = CAR.pad, w = CAR.w, l = CAR.l, pts = [];
  if (side === 'L' || side === 'B') pts.push([p + 0.12, p + 0.12], [p + 0.12, p + l - 0.12]);
  if (side === 'R' || side === 'B') pts.push([p + w - 0.12, p + 0.12], [p + w - 0.12, p + l - 0.12]);
  return spriteSvg(w + 2 * p, l + 2 * p, pts.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="0.42" fill="url(#bl)"/>`).join(''));
}
// Bremslicht-Glühen
function brakeSvg() {
  const p = CAR.pad, w = CAR.w, l = CAR.l;
  return spriteSvg(w + 2 * p, l + 2 * p, `<radialGradient id="br" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF6A6A" stop-opacity="1"/><stop offset="0.3" stop-color="#FF2E2E" stop-opacity="0.8"/><stop offset="1" stop-color="#FF2E2E" stop-opacity="0"/></radialGradient>
   <circle cx="${p + 0.4}" cy="${p + l - 0.1}" r="0.4" fill="url(#br)"/><circle cx="${p + w - 0.4}" cy="${p + l - 0.1}" r="0.4" fill="url(#br)"/>`);
}
function bikeSvg(col = '#2EC4B6') {
  const p = BIKE.pad, w = BIKE.w, l = BIKE.l, cx = p + w / 2, y = p;
  return spriteSvg(w + 2 * p, l + 2 * p, `
   <ellipse cx="${cx + 0.04}" cy="${y + l / 2 + 0.08}" rx="0.4" ry="0.95" fill="#000" opacity="0.5" filter="url(#sh)"/>
   <rect x="${cx - 0.05}" y="${y}" width="0.1" height="0.62" rx="0.05" fill="#0B0F14"/><rect x="${cx - 0.05}" y="${y + l - 0.62}" width="0.1" height="0.62" rx="0.05" fill="#0B0F14"/>
   <rect x="${cx - 0.34}" y="${y + 0.42}" width="0.68" height="0.07" rx="0.03" fill="#6B7785"/>
   <ellipse cx="${cx}" cy="${y + 0.95}" rx="0.33" ry="0.2" fill="${col}"/><ellipse cx="${cx}" cy="${y + 1.12}" rx="0.19" ry="0.3" fill="${col}" opacity="0.85"/>
   <circle cx="${cx}" cy="${y + 0.86}" r="0.15" fill="#F3F5F8"/>`);
}
function pedSvg(col = '#FF7AA8') {
  const p = PED.pad, w = PED.w, l = PED.l, cx = p + w / 2, cy = p + l / 2;
  return spriteSvg(w + 2 * p, l + 2 * p, `
   <ellipse cx="${cx + 0.03}" cy="${cy + 0.05}" rx="0.36" ry="0.26" fill="#000" opacity="0.55" filter="url(#sh)"/>
   <ellipse cx="${cx}" cy="${cy}" rx="0.32" ry="0.18" fill="${col}" stroke="#FFFFFF" stroke-width="0.035"/>
   <circle cx="${cx}" cy="${cy}" r="0.13" fill="#F3E3D3" stroke="#3A2A20" stroke-width="0.02"/>`);
}
function truckSvg() {
  const p = TRUCK.pad, w = TRUCK.w, l = TRUCK.l, x = p, y = p;
  return spriteSvg(w + 2 * p, l + 2 * p, `
   <rect x="${x + 0.08}" y="${y + 0.15}" width="${w}" height="${l}" rx="0.25" fill="#000" opacity="0.55" filter="url(#sh)"/>
   <rect x="${x}" y="${y}" width="${w}" height="2.3" rx="0.35" fill="#C9D1DC"/>
   <rect x="${x + 0.2}" y="${y + 0.15}" width="${w - 0.4}" height="0.55" rx="0.1" fill="#0A1018"/>
   <rect x="${x}" y="${y + 2.45}" width="${w}" height="${l - 2.45}" rx="0.15" fill="#E6EAF0"/>
   <rect x="${x + 0.15}" y="${y + 2.6}" width="${w - 0.3}" height="${l - 2.75}" rx="0.1" fill="#D5DBE3"/>
   ${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${x + 0.15}" y1="${y + 3.6 + i * 1.2}" x2="${x + w - 0.15}" y2="${y + 3.6 + i * 1.2}" stroke="#C3CAD4" stroke-width="0.05"/>`).join('')}`);
}
// Polizist von oben, schaut nach oben (Norden). arms: 'out' (seitlich ausgestreckt) | 'down'
function copSvg(arms = 'out') {
  const p = COP.pad, w = COP.w, l = COP.l, cx = p + w / 2, cy = p + l / 2;
  const arm = arms === 'out' ? `<rect x="${p}" y="${cy - 0.09}" width="${w}" height="0.18" rx="0.09" fill="#274A86"/>
    <circle cx="${p + 0.08}" cy="${cy}" r="0.12" fill="#FFFFFF"/><circle cx="${p + w - 0.08}" cy="${cy}" r="0.12" fill="#FFFFFF"/>` : '';
  return spriteSvg(w + 2 * p, l + 2 * p, `
   <ellipse cx="${cx + 0.04}" cy="${cy + 0.06}" rx="${arms === 'out' ? w / 2 : 0.45}" ry="0.35" fill="#000" opacity="0.5" filter="url(#sh)"/>
   ${arm}
   <ellipse cx="${cx}" cy="${cy}" rx="0.42" ry="0.26" fill="#2F5BA8" stroke="#E8EEF8" stroke-width="0.03"/>
   <rect x="${cx - 0.34}" y="${cy - 0.05}" width="0.68" height="0.1" fill="#F2F2F2" opacity="0.8"/>
   <circle cx="${cx}" cy="${cy}" r="0.19" fill="#F5F7FA" stroke="#1B2A44" stroke-width="0.025"/>
   <path d="M${cx - 0.14} ${cy - 0.13} Q${cx} ${cy - 0.32} ${cx + 0.14} ${cy - 0.13} Z" fill="#12213D"/>`);
}

// ---------- Szenen ----------
// Kreuzung (4 Arme) – opts: t (nur Einmündung: kein Nordarm), stop (Haltlinien + Furten), fade
function sceneX({ t = false, stop = false, fade = true, lamps = true } = {}) {
  const r = X, wk = r.walk;
  let s = rect(0, 0, W, H, C.bg);
  s += blocks(0, 0, r.x0 - wk, r.y0 - wk, 11) + blocks(r.x1 + wk, 0, W, r.y0 - wk, 12);
  s += blocks(0, r.y1 + wk, r.x0 - wk, H, 13) + blocks(r.x1 + wk, r.y1 + wk, W, H, 14);
  if (t) s += blocks(r.x0 - wk, 0, 2 * r.L + 2 * wk, r.y0 - wk, 15);
  s += rect(0, r.y0 - wk, W, wk, C.walk) + rect(0, r.y1, W, wk, C.walk);
  s += rect(r.x0 - wk, t ? r.y0 : 0, wk, t ? H - r.y0 : H, C.walk) + rect(r.x1, t ? r.y0 : 0, wk, t ? H - r.y0 : H, C.walk);
  // Bordsteinkanten
  s += rect(0, r.y0 - 0.03, W, 0.03, C.curb) + rect(0, r.y1, W, 0.03, C.curb);
  s += rect(0, r.y0, W, 2 * r.L, C.asphalt) + rect(r.x0, t ? r.y0 : 0, 2 * r.L, t ? H - r.y0 : H, C.asphalt);
  if (t) s += rect(r.x0, r.y0 - 0.03, 2 * r.L, 0.03, C.curb);
  const g = stop ? 0.95 : 0.3;
  if (!t) s += dash(r.cx, 0, r.cx, r.y0 - g);
  s += dash(r.cx, r.y1 + g, r.cx, H) + dash(0, r.cy, r.x0 - g, r.cy) + dash(r.x1 + g, r.cy, W, r.cy);
  if (t) s += dash(r.x0 - g, r.cy, r.x1 + g, r.cy);
  if (stop) {
    // Furten (gestrichelte Begrenzung) und Haltlinien (Z 294) je Zufahrt, rechte Hälfte
    const fw = 0.42, sl = 0.62;
    const furtV = (y) => dash(r.x0, y, r.x1, y, 0.03, '0.12 0.1') + dash(r.x0, y + fw, r.x1, y + fw, 0.03, '0.12 0.1');
    const furtH = (x) => dash(x, r.y0, x, r.y1, 0.03, '0.12 0.1') + dash(x + fw, r.y0, x + fw, r.y1, 0.03, '0.12 0.1');
    s += furtV(r.y1 + 0.08) + furtV(r.y0 - 0.08 - fw) + furtH(r.x1 + 0.08) + furtH(r.x0 - 0.08 - fw);
    s += solid(r.cx, r.y1 + sl, r.x1, r.y1 + sl, 0.07);            // Süd-Zufahrt (nach Norden)
    s += solid(r.x0, r.y0 - sl, r.cx, r.y0 - sl, 0.07);            // Nord-Zufahrt
    s += solid(r.x1 + sl, r.y0, r.x1 + sl, r.cy, 0.07);            // Ost-Zufahrt
    s += solid(r.x0 - sl, r.cy, r.x0 - sl, r.y1, 0.07);            // West-Zufahrt
    // Leitlinien bis zur Haltlinie durchgezogen (Fahrstreifenbegrenzung)
    s += solid(r.cx, r.y1 + sl, r.cx, r.y1 + sl + 1.2, 0.035) + solid(r.cx, r.y0 - sl - 1.2, r.cx, r.y0 - sl, 0.035);
    s += solid(r.x1 + sl, r.cy, r.x1 + sl + 1.2, r.cy, 0.035) + solid(r.x0 - sl - 1.2, r.cy, r.x0 - sl, r.cy, 0.035);
  }
  if (lamps) s += lamp(r.x0 - 0.5, r.y0 - 0.5) + lamp(r.x1 + 0.5, r.y1 + 0.5) + lamp(5.2, r.y1 + 0.3) + lamp(12.0, r.y0 - 0.3);
  s += grainAll() + vignette();
  if (fade) s += rect(0, 0, 6.3, H, 'url(#leftfade)');
  return s;
}
// Waagerechte Straße mit echter Einmündung (links) und Grundstückszufahrt mit abgesenktem Bordstein (rechts)
function sceneBord() {
  const r = R;
  let s = rect(0, 0, W, H, C.bg);
  s += blocks(0, 0, W, r.y0 - r.walk, 41);
  s += rect(0, r.y0 - r.walk, W, r.walk, C.walk) + rect(0, r.y0 - 0.03, W, 0.03, C.curb);
  // Süd-Gehweg mit Unterbrechung für die echte Einmündung
  s += rect(0, r.y1, r.aX0, r.walk, C.walk) + rect(r.aX1, r.y1, W - r.aX1, r.walk, C.walk);
  s += rect(0, r.y1, r.aX0, 0.035, C.curb) + rect(r.aX1, r.y1, r.bX0 - r.aX1, 0.035, C.curb) + rect(r.bX1, r.y1, W - r.bX1, 0.035, C.curb);
  // Häuser südlich
  s += blocks(0, r.y1 + r.walk, r.aX0 - r.walk, H, 42);
  s += blocks(r.aX1 + r.walk, r.y1 + r.walk, r.bX0 - 0.35 - (r.aX1 + r.walk), H, 43);
  s += blocks(r.bX1 + 0.35, r.y1 + r.walk, W, H, 44);
  // Einmündung: Gehwege entlang der Seitenstraße
  s += rect(r.aX0 - r.walk, r.y1 + r.walk - 0.001, r.walk, H, C.walk) + rect(r.aX1, r.y1 + r.walk - 0.001, r.walk, H, C.walk);
  s += rect(r.aX0 - 0.03, r.y1, 0.03, H, C.curb) + rect(r.aX1, r.y1, 0.03, H, C.curb);
  // Fahrbahnen
  s += rect(0, r.y0, W, 2 * r.L, C.asphalt) + rect(r.aX0, r.y1 - 0.01, 2 * r.L, H, C.asphalt);
  s += dash(0, r.cy, 4.62, r.cy) + dash(r.aX1 + 0.3, r.cy, W, r.cy) + dash(r.aX0 + r.L, r.y1 + 0.3, r.aX0 + r.L, H);
  // Grundstückszufahrt: Hof mit Pflaster, abgesenkter Bordstein (heller Streifen mit Rampe)
  s += pavers(r.bX0 - 0.35, r.y1 + r.walk, r.bX1 - r.bX0 + 0.7, H - r.y1 - r.walk, 0.14);
  s += rect(r.bX0, r.y1, r.bX1 - r.bX0, 0.06, '#8E99A8');
  for (let x = r.bX0 + 0.04; x < r.bX1; x += 0.12) s += rect(x, r.y1 + 0.01, 0.05, 0.04, '#B9C3CF', 'opacity="0.6"');
  // Parkbuchten im Hof
  for (let i = 0; i < 3; i++) s += line(r.bX0 - 0.3 + i * 0.85, 6.0, r.bX0 - 0.3 + i * 0.85, 7.5, '#C7CED8', 0.025, 'opacity="0.5"');
  s += lamp(3.2, r.y0 - 0.3) + lamp(8.0, r.y1 + 0.3) + lamp(12.2, r.y0 - 0.3);
  s += grainAll() + vignette();
  s += rect(0, 0, W, 2.25, 'url(#topfade)');
  return s;
}
// Verkehrsberuhigter Bereich (Seitenstraße nach Süden, gepflastert, niveaugleich)
function sceneVB() {
  const r = R;
  let s = rect(0, 0, W, H, C.bg);
  s += blocks(0, 0, W, r.y0 - r.walk, 51);
  s += rect(0, r.y0 - r.walk, W, r.walk, C.walk) + rect(0, r.y0 - 0.03, W, 0.03, C.curb);
  s += rect(0, r.y1, r.vX0 - 0.1, r.walk, C.walk) + rect(r.vX1 + 0.1, r.y1, W, r.walk, C.walk);
  s += rect(0, r.y1, r.vX0 - 0.1, 0.035, C.curb) + rect(r.vX1 + 0.1, r.y1, W, 0.035, C.curb);
  s += blocks(0, r.y1 + r.walk, r.vX0 - 0.6, H, 52) + blocks(r.vX1 + 0.6, r.y1 + r.walk, W, H, 53);
  // Mischfläche: gepflastert über ganze Breite, mit Pflanzkübeln
  s += pavers(r.vX0 - 0.6, r.y1 + 0.001, r.vX1 - r.vX0 + 1.2, H - r.y1, 0.12);
  s += rect(r.vX0 - 0.1, r.y1, r.vX1 - r.vX0 + 0.2, 0.05, '#8E99A8');
  const tub = (x, y) => `<circle cx="${x}" cy="${y}" r="0.2" fill="#3B2E22"/><circle cx="${x}" cy="${y}" r="0.15" fill="#1E4A2C"/><circle cx="${x - 0.05}" cy="${y - 0.04}" r="0.07" fill="#2E6B40"/>`;
  s += tub(r.vX0 - 0.35, 6.2) + tub(r.vX1 + 0.35, 6.9) + tub(r.vX1 + 0.3, 5.6);
  s += rect(0, r.y0, W, 2 * r.L, C.asphalt) + dash(0, r.cy, W, r.cy);
  s += lamp(3.2, r.y0 - 0.3) + lamp(r.vX0 - 0.6, r.y1 + 0.6) + lamp(12.2, r.y0 - 0.3);
  s += grainAll() + vignette();
  s += rect(0, 0, W, 2.25, 'url(#topfade)');
  return s;
}
// Kreisverkehr mit vier Armen, Fahrbahnteilern und Zebrastreifen
function sceneKreis({ fade = true } = {}) {
  const r = K, cx = r.cx, cy = r.cy, L = r.L, wk = 0.4;
  let s = rect(0, 0, W, H, C.bg);
  s += blocks(0, 0, cx - L - wk, cy - L - wk, 61) + blocks(cx + L + wk, 0, W, cy - L - wk, 62) + blocks(0, cy + L + wk, cx - L - wk, H, 63) + blocks(cx + L + wk, cy + L + wk, W, H, 64);
  // Gehwege der Arme
  s += rect(0, cy - L - wk, W, wk, C.walk) + rect(0, cy + L, W, wk, C.walk) + rect(cx - L - wk, 0, wk, H, C.walk) + rect(cx + L, 0, wk, H, C.walk);
  // Platz um den Kreis
  s += `<circle cx="${cx}" cy="${cy}" r="${r.rOut + wk}" fill="${C.walk}"/>`;
  s += rect(0, cy - L, W, 2 * L, C.asphalt) + rect(cx - L, 0, 2 * L, H, C.asphalt);
  s += `<circle cx="${cx}" cy="${cy}" r="${r.rOut}" fill="${C.asphalt}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r.rOut + 0.02}" fill="none" stroke="${C.curb}" stroke-width="0.03"/>`;
  // Innenring (überfahrbar, gepflastert) und Mittelinsel
  s += `<circle cx="${cx}" cy="${cy}" r="${r.rApr}" fill="${C.paver2}"/>`;
  for (let a = 0; a < 360; a += 8) { const rad = a * Math.PI / 180; s += line(cx + r.rIsl * Math.cos(rad), cy + r.rIsl * Math.sin(rad), cx + r.rApr * Math.cos(rad), cy + r.rApr * Math.sin(rad), '#262B33', 0.02); }
  s += `<circle cx="${cx}" cy="${cy}" r="${r.rIsl}" fill="#10261A" stroke="${C.curb}" stroke-width="0.04"/>`;
  let rr = 3; const rnd = () => { rr = (rr * 9301 + 49297) % 233280; return rr / 233280; };
  for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, d = rnd() * 0.6; s += `<circle cx="${cx + d * Math.cos(a)}" cy="${cy + d * Math.sin(a)}" r="${0.08 + rnd() * 0.14}" fill="${rnd() > 0.5 ? '#173A25' : '#1D4A2E'}"/>`; }
  // Fahrbahnteiler (Tropfen) an jedem Arm
  const isl = (ang) => { // ang: 0=Ost, 90=Süd, 180=West, 270=Nord (Bildschirm)
    const a = ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const p = (d, o) => `${cx + ux * d + px * o} ${cy + uy * d + py * o}`;
    return `<path d="M${p(r.rOut + 0.12, 0)} L${p(r.rOut + 0.95, 0.12)} Q${p(r.rOut + 1.2, 0)} ${p(r.rOut + 0.95, -0.12)} Z" fill="${C.walk2}" stroke="${C.curb}" stroke-width="0.025"/>`;
  };
  s += isl(0) + isl(90) + isl(180) + isl(270);
  // Mittellinien der Arme (außerhalb der Teiler)
  s += dash(cx, 0, cx, cy - r.rOut - 1.3) + dash(cx, cy + r.rOut + 1.3, cx, H) + dash(0, cy, cx - r.rOut - 1.3, cy) + dash(cx + r.rOut + 1.3, cy, W, cy);
  // Zebrastreifen (Z 293) auf Süd- und Ostarm
  const zeb = (x0, y0, horiz) => { let z = ''; for (let i = 0; i < 7; i++) z += horiz ? rect(x0 + i * 0.2, y0, 0.1, 0.42, C.mark, 'opacity="0.85"') : rect(x0, y0 + i * 0.2, 0.42, 0.1, C.mark, 'opacity="0.85"'); return z; };
  s += zeb(cx - L + 0.05, cy + r.rOut + 0.3, true) + zeb(cx + r.rOut + 0.3, cy - L + 0.05, false);
  // Wartelinien (Z 342, gestrichelt breit) an den Einfahrten
  const wl = (ang) => { const a = ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, d = r.rOut + 0.02;
    return line(cx + ux * d - px * 0.14, cy + uy * d - py * 0.14, cx + ux * d - px * L, cy + uy * d - py * L, C.mark, 0.05, 'stroke-dasharray="0.1 0.08" opacity="0.8"'); };
  s += wl(0) + wl(90) + wl(180) + wl(270);
  s += lamp(cx - 2.3, cy - 2.2) + lamp(cx + 2.3, cy + 2.2) + lamp(cx + 2.4, cy - 2.3);
  s += grainAll() + vignette();
  if (fade) s += rect(0, 0, 6.3, H, 'url(#leftfade)');
  return s;
}
// Titelbild: Kreuzung mit Lichtspuren (Langzeitbelichtung)
function trails() {
  const r = X;
  const tr = (d, col, w, op) => `<path d="${d}" stroke="${col}" stroke-width="${w * 3}" fill="none" stroke-linecap="round" opacity="${op * 0.35}" filter="url(#soft)"/><path d="${d}" stroke="${col}" stroke-width="${w * 1.3}" fill="none" stroke-linecap="round" opacity="${Math.min(1, op * 1.25)}" filter="url(#blur2)"/>`;
  let s = '';
  const white = '#FFF1D6', red = '#FF3B3B';
  // Nord-Süd
  for (const o of [-0.1, 0.1]) { s += tr(`M${r.nb + o} ${H} L${r.nb + o} 0`, red, 0.035, 0.75); s += tr(`M${r.sb + o} 0 L${r.sb + o} ${H}`, white, 0.035, 0.7); }
  // Ost-West
  for (const o of [-0.1, 0.1]) { s += tr(`M${W} ${r.wb + o} L0 ${r.wb + o}`, red, 0.035, 0.7); s += tr(`M0 ${r.eb + o} L${W} ${r.eb + o}`, white, 0.035, 0.65); }
  // Abbieger-Bögen
  s += tr(`M${r.nb + 0.1} ${H} L${r.nb + 0.1} ${r.y1} Q${r.nb + 0.1} ${r.eb - 0.1} ${r.x1} ${r.eb - 0.1} L${W} ${r.eb - 0.1}`, red, 0.03, 0.6);
  s += tr(`M${W} ${r.wb - 0.1} L${r.x1} ${r.wb - 0.1} Q${r.cx} ${r.wb} ${r.cx - 0.1} ${r.cy} T${r.sb - 0.1} ${H}`, red, 0.03, 0.5);
  return s;
}

// Didaktische Overlays
const arrowPath = (d, col, sw = 0.06, dashA = '') => `<path d="${d}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" ${dashA ? `stroke-dasharray="${dashA}"` : ''} marker-end="url(#ah)" filter="url(#glow)"/>`;
const cone = (x, y, ang, spread, len, col, op = 0.28) => {
  const a1 = (ang - spread / 2 - 90) * Math.PI / 180, a2 = (ang + spread / 2 - 90) * Math.PI / 180;
  const p1 = [x + len * Math.cos(a1), y + len * Math.sin(a1)], p2 = [x + len * Math.cos(a2), y + len * Math.sin(a2)];
  return `<path d="M${x} ${y} L${p1[0]} ${p1[1]} A${len} ${len} 0 0 1 ${p2[0]} ${p2[1]} Z" fill="${col}" opacity="${op}"/>`;
};

// Zusatzzeichen 1002 (Verlauf der Vorfahrtstraße), nachgezeichnet: dick = Vorfahrtstraße
function zz1002(main = ['S', 'W'], side = ['N', 'E']) {
  const w = 1.3, h = 1.0, cx = w / 2, cy = h / 2 + 0.03, a = 0.36;
  const end = { N: [cx, cy - a], S: [cx, cy + a], W: [cx - a * 1.15, cy], E: [cx + a * 1.15, cy] };
  let s = `<rect x="0.02" y="0.02" width="${w - 0.04}" height="${h - 0.04}" rx="0.06" fill="#FFFFFF" stroke="#111" stroke-width="0.035"/>`;
  for (const d of side) s += `<line x1="${cx}" y1="${cy}" x2="${end[d][0]}" y2="${end[d][1]}" stroke="#111" stroke-width="0.045" stroke-linecap="butt"/>`;
  s += `<path d="M${end[main[0]][0]} ${end[main[0]][1]} L${cx} ${cy} L${end[main[1]][0]} ${end[main[1]][1]}" stroke="#111" stroke-width="0.15" fill="none" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * 300)}" height="${Math.round(h * 300)}">${s}</svg>`;
}

// Dauerlichtzeichen (§ 37 Abs. 3 StVO), Signalgeber frontal
function dauerSvg(kind) {
  const sz = 1;
  let s = `<rect x="0" y="0" width="1" height="1" rx="0.08" fill="#0A0C10" stroke="#3A4252" stroke-width="0.03"/>`;
  if (kind === 'x') s += `<g stroke="#FF3030" stroke-width="0.14" stroke-linecap="round" filter="url(#g)"><line x1="0.25" y1="0.25" x2="0.75" y2="0.75"/><line x1="0.75" y1="0.25" x2="0.25" y2="0.75"/></g>`;
  if (kind === 'down') s += `<g fill="#35E07F" filter="url(#g)"><rect x="0.43" y="0.18" width="0.14" height="0.4"/><path d="M0.26 0.52 L0.74 0.52 L0.5 0.84 Z"/></g>`;
  if (kind === 'diag') s += `<g fill="#FFC21A" filter="url(#g)" transform="rotate(-45 0.5 0.5)"><rect x="0.43" y="0.18" width="0.14" height="0.4"/><path d="M0.26 0.52 L0.74 0.52 L0.5 0.84 Z"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}" width="400" height="400"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.02" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${s}</svg>`;
}

// Polizist frontal: pose 'front' (Brust, Arme seitlich), 'back', 'side' (Seite), 'up' (Arm hoch)
function copFront(pose) {
  const blue = '#274A86', dark = '#16284A', skin = '#E9C9A8';
  const head = `<circle cx="1" cy="0.62" r="0.2" fill="${skin}"/><path d="M0.74 0.5 Q1 0.26 1.26 0.5 L1.3 0.56 L0.7 0.56 Z" fill="#F4F6F9"/><rect x="0.7" y="0.52" width="0.6" height="0.07" fill="${dark}"/>`;
  const headBack = `<circle cx="1" cy="0.62" r="0.2" fill="#6B4A32"/><path d="M0.74 0.5 Q1 0.26 1.26 0.5 L1.3 0.56 L0.7 0.56 Z" fill="#F4F6F9"/><rect x="0.7" y="0.52" width="0.6" height="0.07" fill="${dark}"/>`;
  const torso = `<path d="M0.66 0.86 Q1 0.78 1.34 0.86 L1.3 1.75 L0.7 1.75 Z" fill="${blue}"/>`;
  const legs = `<rect x="0.72" y="1.72" width="0.24" height="0.95" rx="0.06" fill="${dark}"/><rect x="1.04" y="1.72" width="0.24" height="0.95" rx="0.06" fill="${dark}"/><rect x="0.7" y="2.62" width="0.28" height="0.1" rx="0.04" fill="#0A0C10"/><rect x="1.02" y="2.62" width="0.28" height="0.1" rx="0.04" fill="#0A0C10"/>`;
  const glove = (x, y) => `<circle cx="${x}" cy="${y}" r="0.09" fill="#FFFFFF"/>`;
  let s = '';
  if (pose === 'front' || pose === 'back') {
    s += `<rect x="0.1" y="0.88" width="1.8" height="0.17" rx="0.08" fill="${blue}"/>` + glove(0.1, 0.965) + glove(1.9, 0.965);
    s += legs + torso + (pose === 'front' ? head + `<rect x="0.9" y="1.0" width="0.2" height="0.13" rx="0.02" fill="#E4C04A"/>` : headBack);
    if (pose === 'front') s += `<rect x="0.7" y="1.25" width="0.6" height="0.07" fill="#DDE3EC" opacity="0.8"/>`;
  } else if (pose === 'side') {
    // Profil: Arm zeigt verkürzt auf den Betrachter
    s += `<rect x="0.86" y="1.72" width="0.28" height="0.95" rx="0.06" fill="${dark}"/><rect x="0.84" y="2.62" width="0.42" height="0.1" rx="0.04" fill="#0A0C10"/>`;
    s += `<path d="M0.8 0.86 Q1 0.8 1.2 0.86 L1.2 1.75 L0.8 1.75 Z" fill="${blue}"/>`;
    s += `<circle cx="1" cy="0.62" r="0.2" fill="${skin}"/><path d="M0.78 0.5 Q1 0.3 1.28 0.52 L1.36 0.58 L0.78 0.56 Z" fill="#F4F6F9"/><rect x="0.78" y="0.52" width="0.58" height="0.07" fill="${dark}"/>`;
    s += `<circle cx="1.02" cy="0.98" r="0.15" fill="${blue}" stroke="${dark}" stroke-width="0.02"/>` + glove(1.02, 0.98);
  } else if (pose === 'up') {
    s += `<rect x="1.28" y="0.1" width="0.17" height="0.9" rx="0.08" fill="${blue}"/>` + glove(1.365, 0.1);
    s += `<rect x="0.58" y="0.9" width="0.16" height="0.85" rx="0.08" fill="${blue}"/>`;
    s += legs + torso + head + `<rect x="0.9" y="1.0" width="0.2" height="0.13" rx="0.02" fill="#E4C04A"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2.8" width="500" height="700">${s}</svg>`;
}

// Bordstein im Schnitt (Lupe): hoch vs. abgesenkt
function curbSection() {
  const w = 6, h = 2.2;
  let s = `<rect width="${w}" height="${h}" fill="#0B0F15"/>`;
  const base = 1.45;
  // links: hoher Bordstein
  s += `<path d="M0.2 ${base} L1.6 ${base} L1.6 ${base - 0.42} L2.7 ${base - 0.42} L2.7 ${base + 0.4} L0.2 ${base + 0.4} Z" fill="#3A4658"/>`;
  s += `<rect x="0.2" y="${base}" width="1.4" height="0.4" fill="#1A222D"/><rect x="1.6" y="${base - 0.42}" width="1.1" height="0.82" fill="#4A5568"/>`;
  s += `<text x="1.45" y="0.42" font-family="Carlito, Calibri" font-size="0.22" font-weight="700" fill="#F5F2EC" text-anchor="middle">Normaler Bordstein</text>`;
  s += `<text x="1.45" y="0.72" font-family="Carlito, Calibri" font-size="0.18" fill="#A7B0BD" text-anchor="middle">Kante ca. 10–15 cm</text>`;
  // rechts: abgesenkt (Rampe)
  const o = 3.2;
  s += `<path d="M${o} ${base} L${o + 1.3} ${base} L${o + 1.7} ${base - 0.12} L${o + 2.6} ${base - 0.12} L${o + 2.6} ${base + 0.4} L${o} ${base + 0.4} Z" fill="#4A5568"/>`;
  s += `<rect x="${o}" y="${base}" width="1.3" height="0.4" fill="#1A222D"/>`;
  s += `<path d="M${o + 1.3} ${base} L${o + 1.7} ${base - 0.12}" stroke="#FFB547" stroke-width="0.05"/>`;
  s += `<text x="${o + 1.3}" y="0.42" font-family="Carlito, Calibri" font-size="0.22" font-weight="700" fill="#FFB547" text-anchor="middle">Abgesenkter Bordstein</text>`;
  s += `<text x="${o + 1.3}" y="0.72" font-family="Carlito, Calibri" font-size="0.18" fill="#A7B0BD" text-anchor="middle">flach, zum Überfahren</text>`;
  s += `<text x="0.3" y="${base + 0.3}" font-family="Carlito, Calibri" font-size="0.15" fill="#8A93A2">Fahrbahn</text><text x="${o + 0.1}" y="${base + 0.3}" font-family="Carlito, Calibri" font-size="0.15" fill="#8A93A2">Fahrbahn</text>`;
  s += `<text x="1.75" y="${base - 0.5}" font-family="Carlito, Calibri" font-size="0.15" fill="#8A93A2">Gehweg</text><text x="${o + 1.8}" y="${base - 0.2}" font-family="Carlito, Calibri" font-size="0.15" fill="#8A93A2">Gehweg</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="3300" height="${Math.round(3300 * h / w)}">${s}</svg>`;
}

async function build() {
  // Hintergründe (wie Lektion 12)
  const PXb = 1920;
  const wrapB = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${PXb}" height="${Math.round(PXb * H / W)}">
<defs><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="7" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.07"/></feComponentTransfer></filter>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient>
<filter id="soft"><feGaussianBlur stdDeviation="0.07"/></filter></defs>${body}<rect width="${W}" height="${H}" filter="url(#grain)"/><rect width="${W}" height="${H}" fill="url(#vig)"/></svg>`;
  const glow = (id, col, cx, cy, r, op) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${col}" stop-opacity="${op}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  const jb = (name, svg) => sharp(Buffer.from(svg)).flatten({ background: '#07080B' }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, name + '.jpg'));
  const base = `<rect width="${W}" height="${H}" fill="#07080B"/>`;
  await jb('bg_orange', wrapB(base + glow('a', '#FF6A13', 0.92, 0.05, 0.8, 0.30) + glow('b', '#2A3B55', 0.05, 1.0, 0.7, 0.45)));
  await jb('bg_center', wrapB(base + glow('a', '#FF7A1A', 0.5, 0.55, 0.55, 0.22) + glow('b', '#1B2538', 0.5, 1.1, 0.8, 0.5)));
  await jb('bg_red', wrapB(base + glow('a', '#FF3B3B', 0.9, 0.0, 0.75, 0.22) + glow('b', '#1A1F2B', 0.1, 1.0, 0.7, 0.4)));
  await jb('bg_blue', wrapB(base + glow('a', '#5B8CFF', 0.9, 0.0, 0.8, 0.20) + glow('b', '#FF7A1A', 0.0, 1.05, 0.6, 0.12)));
  await jb('bg_green', wrapB(`<rect width="${W}" height="${H}" fill="#060C0A"/>` + glow('a', '#38D98A', 0.85, 0.05, 0.85, 0.22) + glow('b', '#1B2538', 0.05, 1.0, 0.6, 0.4)));
  await jb('bg_amber', wrapB(`<rect width="${W}" height="${H}" fill="#0B0A08"/>` + glow('a', '#FFB547', 0.88, 0.05, 0.85, 0.26) + glow('b', '#2A3B55', 0.05, 1.0, 0.7, 0.35)));
  await jb('bg_black', wrapB(`<rect width="${W}" height="${H}" fill="#030304"/>` + glow('a', '#FFFFFF', 0.5, 0.45, 0.6, 0.035)));
  await jb('bg_redglow', wrapB(`<rect width="${W}" height="${H}" fill="#050203"/>` + glow('a', '#FF2A2A', 0.5, 0.5, 0.65, 0.22)));
  let bk = base, rr = 7; const rnd = () => { rr = (rr * 9301 + 49297) % 233280; return rr / 233280; };
  const cols = ['#FF7A1A', '#FFB547', '#FF5C5C', '#FFE3B0', '#38D98A'];
  for (let i = 0; i < 55; i++) { const x = rnd() * W, y = 2.2 + rnd() * 5.3, r = 0.12 + rnd() * 0.6; bk += `<circle cx="${x}" cy="${y}" r="${r}" fill="${cols[Math.floor(rnd() * cols.length)]}" opacity="${0.06 + rnd() * 0.22}" filter="url(#soft)"/>`; }
  await jb('bg_bokeh', wrapB(bk + `<rect width="${W}" height="${H}" fill="#07080B" opacity="0.35"/>` + glow('a', '#FF6A13', 0.5, 1.1, 0.7, 0.25)));

  // Szenen
  await jpg('sc_x', svgWrap(sceneX()));
  await jpg('sc_x_stop', svgWrap(sceneX({ stop: true })));
  await jpg('sc_t', svgWrap(sceneX({ t: true })));
  await jpg('sc_bord', svgWrap(sceneBord()));
  await jpg('sc_vb', svgWrap(sceneVB()));
  await jpg('sc_kreis', svgWrap(sceneKreis()));
  await jpg('sc_title', svgWrap(sceneX({ fade: false }).replace(/<rect x="0" y="0" width="13.333" height="7.5" filter="url\(#grain\)"\/>/, m => trails() + m)
    + `<rect width="${W}" height="${H}" fill="#05070B" opacity="0.35"/>` + rect(0, 0, 7.5, H, 'url(#leftfade)')), 86);

  // Sprites
  await png('car_du', carSvg('#FF7A1A', '#FFD2A8'));
  await png('car_blau', carSvg('#4F78A8', '#9DB8D8'));
  await png('car_rot', carSvg('#B84A55', '#E09AA2'));
  await png('car_weiss', carSvg('#D9DFE7', '#FFFFFF'));
  await png('car_grau', carSvg('#8A9BB0', '#C9D3DF'));
  await png('car_gruen', carSvg('#3E9E6A', '#9FD8B6'));
  for (const [l, c1, c2] of [['A', '#4F78A8', '#9DB8D8'], ['B', '#B84A55', '#E09AA2'], ['C', '#3E9E6A', '#9FD8B6'], ['D', '#D9DFE7', '#FFFFFF']]) await png('car_' + l, carSvg(c1, c2, { label: l }));
  await png('car_du_label', carSvg('#FF7A1A', '#FFD2A8', { label: 'DU' }));
  await png('blink_L', blinkSvg('L')); await png('blink_R', blinkSvg('R')); await png('brake', brakeSvg());
  await png('bike', bikeSvg()); await png('ped', pedSvg()); await png('ped_b', pedSvg('#B08CFF')); await png('truck', truckSvg());
  await png('cop_out', copSvg('out')); await png('cop_down', copSvg('down'));
  for (const p of ['front', 'back', 'side', 'up']) await png('copf_' + p, copFront(p));
  await png('curb_section', curbSection());
  for (const k of ['x', 'down', 'diag']) await png('dauer_' + k, dauerSvg(k));
  await png('zz_SW', zz1002(['S', 'W'], ['N', 'E']));

  // Overlays
  // Abknickende Vorfahrt S -> W hervorheben
  await png('ov_abk', svgWrap(`<path d="M${X.cx} ${H} L${X.cx} ${X.cy + 0.3} Q${X.cx} ${X.cy} ${X.cx - 0.3} ${X.cy} L6.3 ${X.cy}" stroke="#FFB547" stroke-width="${2 * X.L + 0.1}" fill="none" opacity="0.13"/>
    <path d="M${X.cx} ${H} L${X.cx} ${X.cy + 0.3} Q${X.cx} ${X.cy} ${X.cx - 0.3} ${X.cy} L6.3 ${X.cy}" stroke="#FFB547" stroke-width="0.05" fill="none" stroke-dasharray="0.25 0.2" opacity="0.9" filter="url(#glow)"/>`));
  // Blickkegel beim Hineintasten (T-Einmündung, Auto aus Süden)
  await png('ov_cone_short', svgWrap(cone(X.nb, X.y1 + 0.55, 300, 40, 1.4, C.amber, 0.25) + cone(X.nb, X.y1 + 0.55, 60, 40, 1.4, C.amber, 0.25)));
  await png('ov_cone_long', svgWrap(cone(X.nb, X.y1 + 0.02, 285, 50, 3.6, C.amber, 0.22) + cone(X.nb, X.y1 + 0.02, 75, 50, 3.6, C.amber, 0.22)));
  // Sichtbehinderung Hineintasten: Hecke/Mauer an den Ecken
  await png('ov_hedge', svgWrap(`<rect x="${X.x0 - X.walk - 1.6}" y="${X.y1 + 0.12}" width="${1.6}" height="1.3" rx="0.1" fill="#12301E"/><rect x="${X.x1 + X.walk}" y="${X.y1 + 0.12}" width="1.6" height="1.3" rx="0.1" fill="#12301E"/>` +
    [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${X.x0 - X.walk - 1.45 + i * 0.2}" cy="${X.y1 + 0.3 + (i % 2) * 0.15}" r="0.16" fill="#1C4A2E"/><circle cx="${X.x1 + X.walk + 0.15 + i * 0.2}" cy="${X.y1 + 0.3 + (i % 3) * 0.12}" r="0.16" fill="#1C4A2E"/>`).join('')));
  // Kollision: Blitz
  await png('ov_crash', svgWrap(`<g filter="url(#glow)"><path d="M0 -0.5 L0.14 -0.16 L0.5 -0.22 L0.24 0.04 L0.46 0.34 L0.1 0.2 L0 0.52 L-0.1 0.2 L-0.46 0.34 L-0.24 0.04 L-0.5 -0.22 L-0.14 -0.16 Z" fill="#FF3B3B" stroke="#FFD2A8" stroke-width="0.03"/></g>`, 1.1, 1.1).replace('viewBox="0 0 1.1 1.1"', 'viewBox="-0.55 -0.55 1.1 1.1"'));

  // Amtliche Verkehrszeichen (npm @osm-traffic-signs/converter)
  const S = path.join(__dirname, 'node_modules/@osm-traffic-signs/converter/dist/data-svgs/DE/svgs');
  const dims = {};
  for (const z of ['102', '205', '206', '301', '306', '307', '215', '720', '721', '325_1', '325_2', '242_1']) {
    const f = path.join(OUT, 'sign_' + z + '.png');
    await sharp(fs.readFileSync(path.join(S, 'DE_' + z + '.svg'))).resize({ height: 420 }).png().toFile(f);
    const m = await sharp(f).metadata(); dims[z] = m.width / m.height;
  }
  const mz = await sharp(path.join(OUT, 'zz_SW.png')).metadata(); dims.zz_SW = mz.width / mz.height;
  fs.writeFileSync(path.join(OUT, 'signs.json'), JSON.stringify(dims));
  console.log('Grafiken fertig:', fs.readdirSync(OUT).length);
}
module.exports = { C };
if (require.main === module) build().catch(e => { console.error(e); process.exit(1); });
