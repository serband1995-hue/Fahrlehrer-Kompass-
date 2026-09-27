// Fahrzeug-Sprites (Draufsicht, Front nach oben), übernommen aus art.js (Lektion 9+10)

// ---------- Fahrzeuge (Draufsicht, Front nach oben) ----------
// Maße in Metern; Zeichenfläche mit Rand m
const M = 70; // px pro Meter für Sprites
function spriteSvg(wm, hm, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wm} ${hm}" width="${Math.round(wm * M)}" height="${Math.round(hm * M)}">
  <defs>
   <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.12"/></filter>
   <radialGradient id="bl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE3A3" stop-opacity="1"/><stop offset="0.25" stop-color="#FFB547" stop-opacity="0.95"/><stop offset="1" stop-color="#FF9A1F" stop-opacity="0"/></radialGradient>
  </defs>${body}</svg>`;
}
const CAR = { w: 1.8, l: 4.5, pad: 0.45 };
function carBody(col, col2, { wheels = 0, label = '', show = false } = {}) {
  const p = CAR.pad, w = CAR.w, l = CAR.l;
  const x = p, y = p;
  const wh = (cx, cy, ang) => `<rect x="${cx - 0.13}" y="${cy - 0.34}" width="0.26" height="0.68" rx="0.08" fill="#05070A" transform="rotate(${ang} ${cx} ${cy})"/>`;
  return `
  <rect x="${x + 0.05}" y="${y + 0.12}" width="${w}" height="${l}" rx="0.5" fill="#000" opacity="0.55" filter="url(#sh)"/>
  ${wh(x + 0.02, y + 1.05, wheels)}${wh(x + w - 0.02, y + 1.05, wheels)}${wh(x + 0.02, y + l - 1.0, 0)}${wh(x + w - 0.02, y + l - 1.0, 0)}
  <rect x="${x}" y="${y}" width="${w}" height="${l}" rx="0.55" fill="${col}"/>
  <rect x="${x + 0.12}" y="${y + 0.1}" width="${w - 0.24}" height="${l - 0.2}" rx="0.45" fill="${col2}" opacity="0.35"/>
  <path d="M${x + 0.2} ${y + 1.55} Q${x + w / 2} ${y + 1.2} ${x + w - 0.2} ${y + 1.55} L${x + w - 0.3} ${y + 2.05} L${x + 0.3} ${y + 2.05} Z" fill="#0A1018" opacity="0.92"/>
  <rect x="${x + 0.3}" y="${y + 2.05}" width="${w - 0.6}" height="1.25" rx="0.12" fill="${col2}" opacity="0.55"/>
  <path d="M${x + 0.32} ${y + 3.3} L${x + w - 0.32} ${y + 3.3} L${x + w - 0.24} ${y + 3.75} Q${x + w / 2} ${y + 3.9} ${x + 0.24} ${y + 3.75} Z" fill="#0A1018" opacity="0.9"/>
  <rect x="${x - 0.12}" y="${y + 1.5}" width="0.16" height="0.22" rx="0.05" fill="${col}"/><rect x="${x + w - 0.04}" y="${y + 1.5}" width="0.16" height="0.22" rx="0.05" fill="${col}"/>
  <rect x="${x + 0.18}" y="${y + 0.05}" width="0.42" height="0.14" rx="0.06" fill="#FFFFFF"/><rect x="${x + w - 0.6}" y="${y + 0.05}" width="0.42" height="0.14" rx="0.06" fill="#FFFFFF"/>
  <rect x="${x + 0.18}" y="${y + l - 0.17}" width="0.44" height="0.12" rx="0.05" fill="#FF3B3B"/><rect x="${x + w - 0.62}" y="${y + l - 0.17}" width="0.44" height="0.12" rx="0.05" fill="#FF3B3B"/>
  ${show ? `<g stroke="#FFFFFF" stroke-width="0.07">${wh(x + 0.3, y + 1.05, wheels)}${wh(x + w - 0.3, y + 1.05, wheels)}</g><line x1="${x + 0.3}" y1="${y + 1.05}" x2="${x + w - 0.3}" y2="${y + 1.05}" stroke="#0A1018" stroke-width="0.08"/>` : ''}
  ${label ? `<text x="${x + w / 2}" y="${y + 2.95}" font-family="Carlito, Calibri, Arial" font-weight="700" font-size="0.62" text-anchor="middle" fill="#0A1018">${label}</text>` : ''}`;
}
function carSvg(col, col2, opt) { return spriteSvg(CAR.w + 2 * CAR.pad, CAR.l + 2 * CAR.pad, carBody(col, col2, opt)); }
// Blinker-Leuchten auf gleicher Zeichenfläche
function blinkSvg(side, dims = CAR) {
  const p = dims.pad, w = dims.w, l = dims.l;
  const pts = [];
  if (side === 'L' || side === 'B') pts.push([p + 0.12, p + 0.12], [p + 0.12, p + l - 0.12]);
  if (side === 'R' || side === 'B') pts.push([p + w - 0.12, p + 0.12], [p + w - 0.12, p + l - 0.12]);
  const g = pts.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="0.42" fill="url(#bl)"/>`).join('');
  return spriteSvg(w + 2 * p, l + 2 * p, g);
}
const TRUCK = { w: 2.55, l: 12, pad: 0.5 };
function truckSvg() {
  const p = TRUCK.pad, w = TRUCK.w, l = TRUCK.l, x = p, y = p;
  return spriteSvg(w + 2 * p, l + 2 * p, `
   <rect x="${x + 0.08}" y="${y + 0.15}" width="${w}" height="${l}" rx="0.25" fill="#000" opacity="0.55" filter="url(#sh)"/>
   <rect x="${x}" y="${y}" width="${w}" height="2.3" rx="0.35" fill="#C9D1DC"/>
   <rect x="${x + 0.2}" y="${y + 0.15}" width="${w - 0.4}" height="0.55" rx="0.1" fill="#0A1018"/>
   <rect x="${x - 0.28}" y="${y + 0.55}" width="0.3" height="0.45" rx="0.06" fill="#9AA6B5"/><rect x="${x + w - 0.02}" y="${y + 0.55}" width="0.3" height="0.45" rx="0.06" fill="#9AA6B5"/>
   <rect x="${x}" y="${y + 2.45}" width="${w}" height="${l - 2.45}" rx="0.15" fill="#E6EAF0"/>
   <rect x="${x + 0.15}" y="${y + 2.6}" width="${w - 0.3}" height="${l - 2.75}" rx="0.1" fill="#D5DBE3"/>
   ${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${x + 0.15}" y1="${y + 3.6 + i * 1.2}" x2="${x + w - 0.15}" y2="${y + 3.6 + i * 1.2}" stroke="#C3CAD4" stroke-width="0.05"/>`).join('')}
   <rect x="${x + 0.15}" y="${y + 0.02}" width="0.45" height="0.12" rx="0.05" fill="#fff"/><rect x="${x + w - 0.6}" y="${y + 0.02}" width="0.45" height="0.12" rx="0.05" fill="#fff"/>
   <rect x="${x + 0.15}" y="${y + l - 0.14}" width="0.5" height="0.12" rx="0.04" fill="#FF3B3B"/><rect x="${x + w - 0.65}" y="${y + l - 0.14}" width="0.5" height="0.12" rx="0.04" fill="#FF3B3B"/>`);
}
const BUS = { w: 2.55, l: 12, pad: 0.5 };
module.exports = { M, spriteSvg, CAR, carBody, carSvg, TRUCK, truckSvg };
