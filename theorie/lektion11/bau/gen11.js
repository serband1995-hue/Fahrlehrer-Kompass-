// Grafiken für Lektion 11 „Licht & Sicht · Blaulicht · Tunnel“ (SVG -> JPG/PNG via sharp)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { spriteSvg, carSvg, truckSvg } = require('./sprites');
const OUT = path.join(__dirname, 'art');
fs.mkdirSync(OUT, { recursive: true });

const W = 13.333, H = 7.5, PX = 1920;
const DEFS = `<defs>
 <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="7" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.07"/></feComponentTransfer></filter>
 <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.75"/></radialGradient>
 <filter id="soft"><feGaussianBlur stdDeviation="0.07"/></filter>
 <filter id="blur2"><feGaussianBlur stdDeviation="0.025"/></filter>
 <filter id="blur4"><feGaussianBlur stdDeviation="0.12"/></filter>
</defs>`;
const wrap = (body, grain = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${PX}" height="${Math.round(PX * H / W)}">${DEFS}${body}${grain ? `<rect width="${W}" height="${H}" filter="url(#grain)"/><rect width="${W}" height="${H}" fill="url(#vig)"/>` : ''}</svg>`;
const glow = (id, col, cx, cy, r, op) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${col}" stop-opacity="${op}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
const jpg = (name, svg, q = 82) => sharp(Buffer.from(svg)).flatten({ background: '#07080B' }).jpeg({ quality: q, mozjpeg: true }).toFile(path.join(OUT, name + '.jpg'));
const png = (name, svg, w) => { let p = sharp(Buffer.from(svg)); if (w) p = p.resize(w); return p.png({ compressionLevel: 9 }).toFile(path.join(OUT, name + '.png')); };
const base = `<rect width="${W}" height="${H}" fill="#07080B"/>`;
let rs = 11; const rnd = () => { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };

// ---------- Draufsicht Landstraße bei Nacht (waagerecht, Fahrtrichtung rechts) ----------
// Maßstab: x = 1.2 + 0.08 * Meter  (0 m = Front deines Autos)
const X0 = 1.2, SC = 0.08;
function sideRoad() {
  let b = `<rect width="${W}" height="${H}" fill="#05070A"/>`;
  // Gras/Bankett
  b += `<rect x="0" y="3.15" width="${W}" height="0.55" fill="#0B120E"/><rect x="0" y="5.3" width="${W}" height="0.55" fill="#0B120E"/>`;
  b += `<rect x="0" y="3.7" width="${W}" height="1.6" fill="#141A22"/>`;
  b += `<line x1="0" y1="3.74" x2="${W}" y2="3.74" stroke="#C9CFD8" stroke-width="0.025" opacity="0.55"/><line x1="0" y1="5.26" x2="${W}" y2="5.26" stroke="#C9CFD8" stroke-width="0.025" opacity="0.55"/>`;
  b += `<line x1="0" y1="4.5" x2="${W}" y2="4.5" stroke="#D9DEE5" stroke-width="0.035" stroke-dasharray="0.36 0.52" opacity="0.6"/>`;
  // Bäume (Draufsicht) oben und unten
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, top = rnd() > 0.5, y = top ? 2.1 + rnd() * 0.9 : 5.95 + rnd() * 0.9, r = 0.28 + rnd() * 0.3;
    b += `<circle cx="${x}" cy="${y}" r="${r}" fill="#0A110D" opacity="0.95"/><circle cx="${x - r * 0.25}" cy="${y - r * 0.25}" r="${r * 0.55}" fill="#0E1712" opacity="0.8"/>`;
  }
  // Leitpfosten alle 50 m (beide Seiten)
  for (let m = 0; m <= 150; m += 50) {
    const x = X0 + m * SC;
    b += `<rect x="${x - 0.03}" y="3.53" width="0.06" height="0.1" fill="#E8ECF0" opacity="0.5"/><rect x="${x - 0.03}" y="5.37" width="0.06" height="0.1" fill="#E8ECF0" opacity="0.5"/>`;
  }
  return wrap(b + glow('m', '#22314A', 0.5, 0.0, 0.8, 0.30));
}
// Lichtkegel (von links nach rechts, hell an der Quelle)
function beamSvg(col = '#FFE8B0') {
  const w = 12, h = 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="2400" height="400"><defs>
   <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${col}" stop-opacity="0.75"/><stop offset="0.55" stop-color="${col}" stop-opacity="0.35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>
   <filter id="b"><feGaussianBlur stdDeviation="0.09"/></filter></defs>
   <path d="M0.05 0.8 L${w - 0.2} 0.12 Q${w} ${h / 2} ${w - 0.2} ${h - 0.12} L0.05 1.2 Z" fill="url(#g)" filter="url(#b)"/></svg>`;
}
// Fußgänger (Frontansicht, Symbolfigur)
function pedFig(body, { refl = false, glowCol = null } = {}) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 2" width="200" height="400"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.06"/></filter></defs>
   ${glowCol ? `<ellipse cx="0.5" cy="1.05" rx="0.48" ry="0.95" fill="${glowCol}" opacity="0.35" filter="url(#g)"/>` : ''}
   <circle cx="0.5" cy="0.28" r="0.17" fill="${body}"/>
   <rect x="0.26" y="0.5" width="0.48" height="0.72" rx="0.14" fill="${body}"/>
   <rect x="0.14" y="0.55" width="0.12" height="0.55" rx="0.06" fill="${body}"/><rect x="0.74" y="0.55" width="0.12" height="0.55" rx="0.06" fill="${body}"/>
   <rect x="0.3" y="1.15" width="0.16" height="0.75" rx="0.07" fill="${body}"/><rect x="0.54" y="1.15" width="0.16" height="0.75" rx="0.07" fill="${body}"/>
   ${refl ? `<rect x="0.26" y="0.78" width="0.48" height="0.07" fill="#F7FF9A"/><rect x="0.26" y="0.98" width="0.48" height="0.07" fill="#F7FF9A"/><rect x="0.3" y="1.62" width="0.4" height="0.06" fill="#F7FF9A"/><rect x="0.14" y="0.9" width="0.12" height="0.05" fill="#F7FF9A"/><rect x="0.74" y="0.9" width="0.12" height="0.05" fill="#F7FF9A"/>` : ''}
  </svg>`;
  return s;
}

// ---------- Perspektive Landstraße im Nebel ----------
const HZ = 2.9, K = 92, D0 = 20, VX = W / 2;
const yOf = d => HZ + K / (d + D0);
const sOf = d => (yOf(d) - HZ) / (H - HZ);
function fogRoad() {
  let b = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0E15"/><stop offset="1" stop-color="#1A2230"/></linearGradient><rect width="${W}" height="${HZ + 0.02}" fill="url(#sky)"/>`;
  b += `<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="#0C120F"/>`;
  // Hügel-Silhouette
  b += `<path d="M0 ${HZ} Q2 ${HZ - 0.5} 4 ${HZ - 0.25} T8 ${HZ - 0.35} T${W} ${HZ - 0.2} L${W} ${HZ + 0.02} L0 ${HZ + 0.02} Z" fill="#0B1016"/>`;
  const half = 5.4; // halbe Straßenbreite am unteren Rand
  b += `<path d="M${VX} ${HZ} L${VX + half} ${H} L${VX - half} ${H} Z" fill="#171D26"/>`;
  // Randlinien und Mittellinie
  b += `<path d="M${VX} ${HZ} L${VX + half * 0.93} ${H}" stroke="#C9CFD8" stroke-width="0.04" opacity="0.6"/><path d="M${VX} ${HZ} L${VX - half * 0.93} ${H}" stroke="#C9CFD8" stroke-width="0.04" opacity="0.6"/>`;
  for (let d = 0; d < 400; d += 12) {
    const y1 = yOf(d), y2 = yOf(d + 6);
    b += `<path d="M${VX - 0.07 * sOf(d)} ${y1} L${VX + 0.07 * sOf(d)} ${y1} L${VX + 0.07 * sOf(d + 6)} ${y2} L${VX - 0.07 * sOf(d + 6)} ${y2} Z" fill="#D9DEE5" opacity="0.55"/>`;
  }
  // Leitpfosten alle 50 m (rechts und links)
  for (const d of [10, 60, 110, 160, 210]) {
    const s = sOf(d), y = yOf(d), hh = 1.35 * s, ww = 0.16 * s;
    for (const side of [1, -1]) {
      const x = VX + side * half * 1.02 * s;
      b += `<rect x="${x - ww / 2}" y="${y - hh}" width="${ww}" height="${hh}" fill="#E6EAEE"/><rect x="${x - ww / 2}" y="${y - hh * 0.92}" width="${ww}" height="${hh * 0.14}" fill="#141414"/>`;
      b += `<rect x="${x - ww * 0.35}" y="${y - hh * 0.9}" width="${ww * 0.7}" height="${hh * 0.1}" fill="${side > 0 ? '#FFFFFF' : '#FFFFFF'}" opacity="0.9"/>`;
    }
  }
  // Scheinwerferlicht auf der Fahrbahn
  b += `<radialGradient id="hl" cx="0.5" cy="1" r="0.9"><stop offset="0" stop-color="#FFE9B8" stop-opacity="0.22"/><stop offset="1" stop-color="#FFE9B8" stop-opacity="0"/></radialGradient><path d="M${VX - 4} ${H} L${VX - 0.6} ${yOf(60)} L${VX + 1.2} ${yOf(60)} L${VX + 5} ${H} Z" fill="url(#hl)"/>`;
  return wrap(b, true);
}
// Nebel als Schleier: Deckkraft wächst mit der Entfernung (Sichtweite V)
function fogSvg(V, col = '#7E868F') {
  let stops = '';
  for (let i = 0; i <= 60; i++) {
    const y = HZ - 0.3 + (H - HZ + 0.3) * i / 60;
    const d = y <= HZ + 0.001 ? 1e6 : K / (y - HZ) - D0;
    const a = Math.min(1, 1 - Math.exp(-3 * Math.max(0, d) / V));
    stops += `<stop offset="${(y / H).toFixed(4)}" stop-color="${col}" stop-opacity="${(a * 0.97).toFixed(3)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${PX}" height="${Math.round(PX * H / W)}"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity="0.97"/>${stops}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#f)"/></svg>`;
}

// ---------- Autobahn Draufsicht (Rettungsgasse) ----------
// Fahrstreifen: 7.7–8.9 | 8.9–10.1 | 10.1–11.3 | Seitenstreifen 11.3–12.2
function highway() {
  let b = base;
  b += `<rect x="6.9" y="0" width="5.9" height="${H}" fill="#0C1016"/>`;
  b += `<rect x="7.25" y="0" width="5.1" height="${H}" fill="#161C25"/>`;
  b += `<rect x="7.05" y="0" width="0.12" height="${H}" fill="#6B7585"/>`; // Schutzplanke Mitte
  b += `<line x1="7.62" y1="0" x2="7.62" y2="${H}" stroke="#D9DEE5" stroke-width="0.05" opacity="0.8"/>`;
  b += `<line x1="11.3" y1="0" x2="11.3" y2="${H}" stroke="#D9DEE5" stroke-width="0.07" opacity="0.8"/>`;
  for (const x of [8.9, 10.1]) b += `<line x1="${x}" y1="-0.2" x2="${x}" y2="${H}" stroke="#D9DEE5" stroke-width="0.05" stroke-dasharray="0.75 1.1" opacity="0.7"/>`;
  b += `<rect x="12.35" y="0" width="0.5" height="${H}" fill="#0B120E"/>`;
  b += glow('a', '#5B8CFF', 0.2, 0.0, 0.7, 0.16);
  return wrap(b);
}
// Rettungswagen Draufsicht
const RTW = { w: 2.1, l: 6.0, pad: 0.6 };
function rtwSvg() {
  const p = RTW.pad, w = RTW.w, l = RTW.l, x = p, y = p;
  return spriteSvg(w + 2 * p, l + 2 * p, `
   <rect x="${x + 0.08}" y="${y + 0.15}" width="${w}" height="${l}" rx="0.3" fill="#000" opacity="0.55" filter="url(#sh)"/>
   <rect x="${x}" y="${y}" width="${w}" height="${l}" rx="0.35" fill="#F2F4F7"/>
   <rect x="${x + 0.2}" y="${y + 0.25}" width="${w - 0.4}" height="0.6" rx="0.12" fill="#0A1018"/>
   <rect x="${x}" y="${y + 1.5}" width="${w}" height="0.28" fill="#E23B3B"/>
   <rect x="${x + 0.25}" y="${y + 2.1}" width="${w - 0.5}" height="${l - 2.5}" rx="0.15" fill="#E4E8EE"/>
   <rect x="${x + w / 2 - 0.2}" y="${y + 3.0}" width="0.4" height="1.4" fill="#E23B3B"/><rect x="${x + w / 2 - 0.7}" y="${y + 3.5}" width="1.4" height="0.4" fill="#E23B3B"/>
   <rect x="${x + 0.1}" y="${y + 1.05}" width="0.55" height="0.32" rx="0.1" fill="#3B7BFF"/><rect x="${x + w - 0.65}" y="${y + 1.05}" width="0.55" height="0.32" rx="0.1" fill="#3B7BFF"/>
   <rect x="${x + 0.1}" y="${y + l - 0.5}" width="0.45" height="0.3" rx="0.1" fill="#3B7BFF"/><rect x="${x + w - 0.55}" y="${y + l - 0.5}" width="0.45" height="0.3" rx="0.1" fill="#3B7BFF"/>
   <rect x="${x + 0.15}" y="${y + 0.03}" width="0.45" height="0.12" rx="0.05" fill="#fff"/><rect x="${x + w - 0.6}" y="${y + 0.03}" width="0.45" height="0.12" rx="0.05" fill="#fff"/>`);
}
const radial = (col, op = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="400" height="400"><defs><radialGradient id="r"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${op}"/><stop offset="0.18" stop-color="${col}" stop-opacity="${op}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><circle cx="0.5" cy="0.5" r="0.5" fill="url(#r)"/></svg>`;

// ---------- Tunnel ----------
function tunnelPortal() {
  let b = `<rect width="${W}" height="${H}" fill="#07090D"/>`;
  b += `<path d="M0 3.2 Q2.5 1.2 5 1.9 Q7 0.9 9.5 1.6 Q11.5 1.0 ${W} 2.4 L${W} ${H} L0 ${H} Z" fill="#0D1410"/>`;
  b += `<path d="M0 3.9 Q3 2.7 6.6 2.9 Q10 2.6 ${W} 3.6 L${W} ${H} L0 ${H} Z" fill="#101812"/>`;
  // Portal
  b += `<path d="M3.1 7.5 L3.1 4.2 Q3.1 1.9 6.67 1.9 Q10.2 1.9 10.2 4.2 L10.2 7.5 Z" fill="#2A2F36"/>`;
  b += `<path d="M3.55 7.5 L3.55 4.3 Q3.55 2.35 6.67 2.35 Q9.8 2.35 9.8 4.3 L9.8 7.5 Z" fill="#050608"/>`;
  // Lampen im Inneren (Fluchtlinie)
  const vx = 6.67, vy = 4.6;
  for (let i = 1; i <= 14; i++) {
    const t = 1 / (1 + i * 0.55), lx = vx + (9.5 - vx) * t, rx = vx - (vx - 3.85) * t, y = vy + (2.75 - vy) * t, r = 0.13 * t + 0.015;
    b += `<ellipse cx="${lx}" cy="${y}" rx="${r * 1.6}" ry="${r * 0.6}" fill="#FFB547" opacity="${0.35 + 0.6 * t}"/><ellipse cx="${rx}" cy="${y}" rx="${r * 1.6}" ry="${r * 0.6}" fill="#FFB547" opacity="${0.35 + 0.6 * t}"/>`;
  }
  b += `<radialGradient id="lt" cx="0.5" cy="0.62" r="0.3"><stop offset="0" stop-color="#FFB547" stop-opacity="0.35"/><stop offset="1" stop-color="#FFB547" stop-opacity="0"/></radialGradient><rect x="3.55" y="2.35" width="6.25" height="5.15" fill="url(#lt)"/>`;
  b += `<ellipse cx="${vx}" cy="${vy}" rx="0.22" ry="0.14" fill="#FFE3B0" opacity="0.8" filter="url(#soft)"/>`;
  // Straße in den Tunnel
  b += `<path d="M${vx - 0.12} ${vy + 0.1} L${vx + 0.12} ${vy + 0.1} L11.8 ${H} L1.5 ${H} Z" fill="#1A1F27"/>`;
  b += `<path d="M${vx} ${vy + 0.1} L${vx} ${H}" stroke="#D9DEE5" stroke-width="0.05" stroke-dasharray="0.3 0.35" opacity="0.6"/>`;
  return wrap(b + glow('a', '#FF9A3C', 0.5, 0.55, 0.45, 0.10));
}
function tunnelInside() {
  const vx = 6.67, vy = 3.6;
  let b = `<rect width="${W}" height="${H}" fill="#0A0B0D"/>`;
  // Wände, Decke, Fahrbahn als Fluchtflächen
  b += `<path d="M0 0 L${vx - 0.45} ${vy - 0.35} L${vx - 0.45} ${vy + 0.3} L0 ${H} Z" fill="#1C1B19"/>`;
  b += `<path d="M${W} 0 L${vx + 0.45} ${vy - 0.35} L${vx + 0.45} ${vy + 0.3} L${W} ${H} Z" fill="#1C1B19"/>`;
  b += `<path d="M0 0 L${W} 0 L${vx + 0.45} ${vy - 0.35} L${vx - 0.45} ${vy - 0.35} Z" fill="#121210"/>`;
  b += `<path d="M1.2 ${H} L${vx - 0.3} ${vy + 0.3} L${vx + 0.3} ${vy + 0.3} L${W - 1.2} ${H} Z" fill="#1E2229"/>`;
  b += `<path d="M0 ${H} L1.2 ${H} L${vx - 0.3} ${vy + 0.3} L${vx - 0.45} ${vy + 0.3} Z" fill="#26241F"/><path d="M${W} ${H} L${W - 1.2} ${H} L${vx + 0.3} ${vy + 0.3} L${vx + 0.45} ${vy + 0.3} Z" fill="#26241F"/>`;
  b += `<path d="M${vx} ${vy + 0.3} L${vx} ${H}" stroke="#D9DEE5" stroke-width="0.06" stroke-dasharray="0.35 0.4" opacity="0.55"/>`;
  // Lichterband an der Decke (Natriumdampf)
  for (let i = 0; i < 22; i++) {
    const t = 1 / (1 + i * 0.35);
    for (const s of [-1, 1]) {
      const x = vx + s * (5.2 * t + 0.25), y = vy - 0.3 - (3.1 * t);
      b += `<ellipse cx="${x}" cy="${y}" rx="${0.28 * t + 0.02}" ry="${0.08 * t + 0.01}" fill="#FFB547" opacity="${0.4 + 0.55 * t}"/>`;
    }
  }
  b += `<radialGradient id="amb" cx="0.5" cy="0.35" r="0.7"><stop offset="0" stop-color="#FF9A3C" stop-opacity="0.18"/><stop offset="1" stop-color="#FF9A3C" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#amb)"/>`;
  // Notausgang rechts (grün beleuchtete Tür) und Notrufnische links
  const t = 1 / (1 + 2 * 0.35), dx = vx + 5.0 * t + 0.4, dy = vy + 0.1;
  b += `<path d="M${dx} ${dy - 1.25 * t - 0.2} L${dx + 0.5 * t + 0.1} ${dy - 1.35 * t - 0.25} L${dx + 0.5 * t + 0.1} ${dy + 0.9 * t + 0.1} L${dx} ${dy + 0.75 * t + 0.08} Z" fill="#1E9E57"/>`;
  b += `<path d="M${dx} ${dy - 1.25 * t - 0.2} L${dx + 0.5 * t + 0.1} ${dy - 1.35 * t - 0.25} L${dx + 0.5 * t + 0.1} ${dy + 0.9 * t + 0.1} L${dx} ${dy + 0.75 * t + 0.08} Z" fill="#35E07F" opacity="0.4" filter="url(#blur4)"/>`;
  const nx = vx - 5.0 * t - 0.9;
  b += `<path d="M${nx} ${dy - 1.0 * t - 0.1} L${nx + 0.5 * t + 0.1} ${dy - 0.9 * t - 0.08} L${nx + 0.5 * t + 0.1} ${dy + 0.6 * t} L${nx} ${dy + 0.7 * t + 0.05} Z" fill="#E6892A"/>`;
  return wrap(b);
}
function smokeSvg() {
  let b = '';
  for (let i = 0; i < 40; i++) {
    const x = 5.2 + rnd() * 3.0, y = 1.2 + rnd() * 3.0, r = 0.5 + rnd() * 1.4;
    b += `<circle cx="${x}" cy="${y}" r="${r}" fill="${rnd() > 0.5 ? '#2B2B2C' : '#3A3A3B'}" opacity="${0.25 + rnd() * 0.35}"/>`;
  }
  b += `<ellipse cx="6.67" cy="3.9" rx="0.8" ry="0.4" fill="#FF6A13" opacity="0.8"/><ellipse cx="6.67" cy="3.8" rx="1.8" ry="1" fill="#FF6A13" opacity="0.25"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${PX}" height="${Math.round(PX * H / W)}"><defs><filter id="s"><feGaussianBlur stdDeviation="0.35"/></filter></defs><g filter="url(#s)">${b}</g></svg>`;
}

// ---------- Kontrollleuchten-Symbole (vereinfacht, ISO-Stil) ----------
function lampSym(kind) {
  const C = { abblend: '#3FD17A', fern: '#4A8BFF', nebelv: '#3FD17A', nebelh: '#FFB02E', stand: '#3FD17A' }[kind];
  const sw = 0.09;
  const lampL = (x) => `<path d="M${x} 0.25 Q${x + 0.75} 0.25 ${x + 0.75} 1 Q${x + 0.75} 1.75 ${x} 1.75 Z" fill="none" stroke="${C}" stroke-width="${sw}" stroke-linejoin="round"/>`; // flache Seite links
  const lampR = (x) => `<path d="M${x} 0.25 Q${x - 0.75} 0.25 ${x - 0.75} 1 Q${x - 0.75} 1.75 ${x} 1.75 Z" fill="none" stroke="${C}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const rays = (x0, x1, dy, n = 5) => Array.from({ length: n }, (_, i) => { const y = 0.45 + i * 0.28; return `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y + dy}" stroke="${C}" stroke-width="${sw}" stroke-linecap="round"/>`; }).join('');
  const wave = (x) => `<path d="M${x} 0.2 Q${x + 0.12} 0.45 ${x} 0.7 Q${x - 0.12} 0.95 ${x} 1.2 Q${x + 0.12} 1.45 ${x} 1.7" fill="none" stroke="${C}" stroke-width="${sw * 0.8}"/>`;
  let body = '';
  if (kind === 'abblend') body = lampL(1.2) + rays(1.05, 0.35, 0.28, 4);
  if (kind === 'fern') body = `<path d="M1.2 0.25 Q1.95 0.25 1.95 1 Q1.95 1.75 1.2 1.75 Z" fill="${C}"/>` + rays(1.05, 0.3, 0, 5);
  if (kind === 'nebelv') body = lampL(1.25) + rays(1.1, 0.35, 0.22, 3) + wave(0.72);
  if (kind === 'nebelh') body = lampR(0.8) + rays(0.95, 1.7, 0, 3) + wave(1.33);
  if (kind === 'stand') body = `<g transform="translate(0.05 0.35) scale(0.65)">${lampL(0.55)}${rays(0.4, 0.02, 0, 3).replace(/stroke-width="[\d.]+"/g, 'stroke-width="0.12"')}</g><g transform="translate(1.1 0.35) scale(0.65)">${lampR(1.05)}${rays(1.2, 1.58, 0, 3).replace(/stroke-width="[\d.]+"/g, 'stroke-width="0.12"')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2.2 2" width="440" height="400">${body}</svg>`;
}

async function main() {
  // Hintergründe
  await jpg('bg_orange', wrap(base + glow('a', '#FF6A13', 0.92, 0.05, 0.8, 0.30) + glow('b', '#2A3B55', 0.05, 1.0, 0.7, 0.45)));
  await jpg('bg_center', wrap(base + glow('a', '#FF7A1A', 0.5, 0.55, 0.55, 0.22) + glow('b', '#1B2538', 0.5, 1.1, 0.8, 0.5)));
  await jpg('bg_red', wrap(base + glow('a', '#FF3B3B', 0.9, 0.0, 0.75, 0.22) + glow('b', '#1A1F2B', 0.1, 1.0, 0.7, 0.4)));
  await jpg('bg_blue', wrap(base + glow('a', '#3B6BFF', 0.9, 0.0, 0.8, 0.28) + glow('b', '#FF7A1A', 0.0, 1.05, 0.6, 0.10)));
  await jpg('bg_blue2', wrap(base + glow('a', '#3B6BFF', 0.1, 0.0, 0.8, 0.26) + glow('b', '#FFB547', 1.0, 1.05, 0.6, 0.10)));
  await jpg('bg_amber', wrap(`<rect width="${W}" height="${H}" fill="#0A0806"/>` + glow('a', '#FF9A3C', 0.88, 0.05, 0.85, 0.28) + glow('b', '#2A3B55', 0.05, 1.0, 0.7, 0.35)));
  await jpg('bg_night', wrap(base + glow('a', '#FFE8B0', 0.85, 0.05, 0.8, 0.14) + glow('b', '#22314A', 0.05, 1.0, 0.8, 0.45)));
  await jpg('bg_green', wrap(`<rect width="${W}" height="${H}" fill="#060C0A"/>` + glow('a', '#3A7350', 0.85, 0.05, 0.85, 0.40) + glow('b', '#C9A227', 0.05, 1.0, 0.6, 0.14)));
  await jpg('bg_black', wrap(`<rect width="${W}" height="${H}" fill="#030304"/>` + glow('a', '#FFFFFF', 0.5, 0.45, 0.6, 0.035)));
  let bk = base;
  const cols = ['#FF7A1A', '#FFB547', '#FF5C5C', '#FFE3B0', '#5B8CFF', '#FF9A3C'];
  for (let i = 0; i < 60; i++) { const x = rnd() * W, y = 2.0 + rnd() * 5.5, r = 0.12 + rnd() * 0.6; bk += `<circle cx="${x}" cy="${y}" r="${r}" fill="${cols[Math.floor(rnd() * cols.length)]}" opacity="${0.06 + rnd() * 0.22}" filter="url(#soft)"/>`; }
  await jpg('bg_bokeh', wrap(bk + `<rect width="${W}" height="${H}" fill="#07080B" opacity="0.35"/>` + glow('a', '#FF6A13', 0.5, 1.1, 0.7, 0.25)));

  // Szenen
  await jpg('sc_side', sideRoad(), 84);
  await png('beam', beamSvg());
  await png('ped_dark', pedFig('#20252D'));
  await png('ped_light', pedFig('#E9E4DA'));
  await png('ped_refl', pedFig('#20252D', { refl: true, glowCol: '#F7FF9A' }));
  await jpg('sc_fog', fogRoad(), 84);
  await png('fog1', fogSvg(160));
  await png('fog2', fogSvg(42));
  await jpg('sc_highway', highway(), 84);
  await jpg('sc_portal', tunnelPortal(), 84);
  await jpg('sc_tunnel', tunnelInside(), 84);
  await png('smoke', smokeSvg());

  // Fahrzeuge
  await png('car_du', carSvg('#FF8A2A', '#FFD0A0'));
  await png('car_grau', carSvg('#8A9BB0', '#C9D3DF'));
  await png('car_blau', carSvg('#4F78A8', '#9DB8D8'));
  await png('car_rot', carSvg('#B84A55', '#E09AA2'));
  await png('car_weiss', carSvg('#D9DFE7', '#FFFFFF'));
  await png('car_gruen', carSvg('#4B8A64', '#A7D1B6'));
  await png('truck', truckSvg());
  await png('rtw', rtwSvg());
  await png('glow_blue', radial('#3B7BFF'));
  await png('glow_yellow', radial('#FFB02E'));
  await png('glow_red', radial('#FF2A2A'));

  // Symbole
  for (const k of ['abblend', 'fern', 'nebelv', 'nebelh', 'stand']) await png('sym_' + k, lampSym(k));
  // Amtliches Verkehrszeichen 142-10 (Wildwechsel)
  const SIGNS = path.join(__dirname, 'node_modules/@osm-traffic-signs/converter/dist/data-svgs/DE/svgs');
  await sharp(path.join(SIGNS, 'DE_142_10.svg'), { density: 300 }).resize(600).png().toFile(path.join(OUT, 'vz_142_10.png'));
  fs.copyFileSync(path.join(__dirname, 'boost_logo.png'), path.join(OUT, 'boost_logo.png'));
  console.log('Grafiken fertig:', fs.readdirSync(OUT).length);
}
module.exports = { X0, SC, yOf, sOf, RTW };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
