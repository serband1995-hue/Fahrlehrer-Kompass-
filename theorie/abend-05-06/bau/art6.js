// Lektion 6 · Grafiken: Schilderwald, Szenen (Markierungen, Baustelle, Bahnübergang, Nebel), Verkehrseinrichtungen, Zug
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'art');
const W = 13.333, H = 7.5, PX = 2000;
const S = path.join(__dirname, 'node_modules/@osm-traffic-signs/converter/dist/data-svgs/DE/svgs');
const C = { bg: '#070B12', asphalt: '#1A222D', mark: '#D9DEE5', walk: '#252E3B', block: '#0C1119', curb: '#3A4658', grass: '#0C1712', yellow: '#F2C230' };

const defs = `<defs>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.10"/></feComponentTransfer></filter>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></radialGradient>
  <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}" stop-opacity="0.96"/><stop offset="0.8" stop-color="${C.bg}" stop-opacity="0.8"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  <linearGradient id="leftfade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.bg}" stop-opacity="0.97"/><stop offset="0.72" stop-color="${C.bg}" stop-opacity="0.84"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  <radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD9A0" stop-opacity="0.2"/><stop offset="1" stop-color="#FFC878" stop-opacity="0"/></radialGradient>
</defs>`;
const wrap = (body, w = W, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(PX * w / W)}" height="${Math.round(PX * h / W)}">${defs}${body}</svg>`;
const rect = (x, y, w, h, f, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${e}/>`;
const line = (x1, y1, x2, y2, c, sw, e = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}" ${e}/>`;
const grain = () => rect(0, 0, W, H, 'none', 'filter="url(#grain)"').replace('fill="none"', '');
const vig = () => rect(0, 0, W, H, 'url(#vig)');
const lamp = (x, y, r = 1.3) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#lamp)"/>`;
function blocks(x, y, w, h, seed = 1) {
  if (w <= 0 || h <= 0) return '';
  let s = rect(x, y, w, h, C.block), r = seed * 9301;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (let i = 0; i < Math.max(2, Math.round(w * h / 1.6)); i++) { const bw = 0.6 + rnd() * 1.4, bh = 0.5 + rnd() * 1.2; s += rect(x + rnd() * Math.max(0.01, w - bw), y + rnd() * Math.max(0.01, h - bh), Math.min(bw, w), Math.min(bh, h), rnd() > 0.5 ? '#111822' : '#0F151E', 'rx="0.04" stroke="#18212D" stroke-width="0.02"'); }
  return s;
}
const jpg = (n, svg, q = 84) => sharp(Buffer.from(svg)).flatten({ background: C.bg }).jpeg({ quality: q, mozjpeg: true }).toFile(path.join(OUT, n + '.jpg'));
const png = (n, svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT, n + '.png'));

// Geometrie (in build6 gespiegelt)
const G = { k: 0.3 };
G.L = 3.25 * G.k;                         // 0,975
// Markierungs-Szene: Straße waagerecht
G.my0 = 3.0; G.my1 = G.my0 + 2 * G.L; G.mcy = G.my0 + G.L;
// Baustelle: zwei Fahrstreifen gleiche Richtung + Seitenstreifen
G.by0 = 2.6; G.by1 = G.by0 + 2 * G.L; G.bsh = G.by1 + 0.75;
// Bahnübergang: Straße senkrecht, Gleis waagerecht
G.cx = 8.6; G.x0 = G.cx - G.L; G.x1 = G.cx + G.L; G.ty = 3.55;

function sceneMark() {
  const y0 = G.my0, y1 = G.my1, cy = G.mcy;
  let s = rect(0, 0, W, H, C.bg) + rect(0, 0, W, H, C.grass, 'opacity="0.9"');
  s += rect(0, y0 - 0.1, W, y1 - y0 + 0.2, '#20262C') + rect(0, y0, W, y1 - y0, C.asphalt);
  s += line(0, y0 + 0.05, W, y0 + 0.05, C.mark, 0.035, 'opacity="0.85"') + line(0, y1 - 0.05, W, y1 - 0.05, C.mark, 0.035, 'opacity="0.85"');
  // Abschnitt 1: Leitlinie (Z 340) · Abschnitt 2: Fahrstreifenbegrenzung (Z 295) · Abschnitt 3: einseitige (Z 296)
  s += line(0, cy, 4.3, cy, C.mark, 0.05, 'stroke-dasharray="0.9 0.45" opacity="0.9"');
  s += line(4.45, cy, 8.85, cy, C.mark, 0.055, 'opacity="0.95"');
  s += line(9.0, cy - 0.06, W, cy - 0.06, C.mark, 0.05, 'opacity="0.95"') + line(9.0, cy + 0.06, W, cy + 0.06, C.mark, 0.05, 'stroke-dasharray="0.9 0.45" opacity="0.9"');
  let rr = 5; const rnd = () => { rr = (rr * 9301 + 49297) % 233280; return rr / 233280; };
  for (let i = 0; i < 30; i++) { const x = rnd() * W, top = rnd() > 0.5, y = top ? y0 - 0.7 - rnd() * 1.6 : y1 + 0.9 + rnd() * 1.6, r = 0.25 + rnd() * 0.3; s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#07100A" opacity="0.9"/>`; }
  s += grain() + vig() + rect(0, 0, W, 2.4, 'url(#topfade)');
  return s;
}
function sceneBau() {
  const y0 = G.by0, y1 = G.by1, sh = G.bsh, cy = y0 + G.L;
  let s = rect(0, 0, W, H, C.grass);
  s += rect(0, y0 - 0.1, W, sh - y0 + 0.2, '#20262C') + rect(0, y0, W, y1 - y0, C.asphalt) + rect(0, y1, W, sh - y1, '#1D2530');
  // weiße Markierung (bleibt sichtbar)
  s += line(0, y0 + 0.05, W, y0 + 0.05, C.mark, 0.035, 'opacity="0.7"') + line(0, cy, W, cy, C.mark, 0.05, 'stroke-dasharray="0.9 0.45" opacity="0.7"') + line(0, y1, W, y1, C.mark, 0.04, 'opacity="0.7"');
  // Baustelle auf dem linken Fahrstreifen
  s += rect(6.2, y0 + 0.12, 4.6, G.L - 0.3, '#3A2C12', 'rx="0.05"');
  for (let i = 0; i < 8; i++) s += rect(6.4 + i * 0.55, y0 + 0.22, 0.35, 0.3, '#6B5220', 'rx="0.04"');
  s += grain() + vig() + rect(0, 0, W, 2.3, 'url(#topfade)');
  return s;
}
function yellowLines() {
  const y0 = G.by0, y1 = G.by1, sh = G.bsh, d = 0.75, cy = y0 + G.L;
  const pl = (y) => `M 3.6 ${y} C 4.8 ${y} 4.8 ${y + d} 6.0 ${y + d} L 11.0 ${y + d} C 12.2 ${y + d} 12.2 ${y} 13.4 ${y}`;
  return wrap(`<path d="${pl(y0 + 0.05)}" stroke="${C.yellow}" stroke-width="0.06" fill="none"/>
    <path d="${pl(cy)}" stroke="${C.yellow}" stroke-width="0.06" fill="none" stroke-dasharray="0.9 0.45"/>
    <path d="${pl(y1)}" stroke="${C.yellow}" stroke-width="0.06" fill="none"/>`);
}
function sceneBahn() {
  const x0 = G.x0, x1 = G.x1, ty = G.ty, wk = 0.45;
  let s = rect(0, 0, W, H, C.grass);
  // Gleisbett
  s += rect(0, ty - 0.55, W, 1.1, '#2B2A28') ;
  for (let x = 0; x < W; x += 0.18) s += rect(x, ty - 0.4, 0.07, 0.8, '#4A3A2C');
  s += rect(0, ty - 0.24, W, 0.045, '#A9B2BD') + rect(0, ty + 0.2, W, 0.045, '#A9B2BD');
  // Häuser/ Felder
  s += blocks(0, 0, x0 - wk, ty - 0.9, 71) + blocks(x1 + wk, 0, W, ty - 0.9, 72) + blocks(0, ty + 0.9, x0 - wk, H, 73) + blocks(x1 + wk, ty + 0.9, W, H, 74);
  s += rect(x0 - wk, 0, wk, H, C.walk) + rect(x1, 0, wk, H, C.walk);
  s += rect(x0, 0, 2 * G.L, H, C.asphalt);
  // Überweg-Belag
  s += rect(x0, ty - 0.55, 2 * G.L, 1.1, '#2E353F');
  s += rect(x0, ty - 0.24, 2 * G.L, 0.045, '#A9B2BD') + rect(x0, ty + 0.2, 2 * G.L, 0.045, '#A9B2BD');
  s += line(G.cx, 0, G.cx, ty - 1.2, C.mark, 0.035, 'stroke-dasharray="0.66 0.66" opacity="0.85"') + line(G.cx, ty + 1.2, G.cx, H, C.mark, 0.035, 'stroke-dasharray="0.66 0.66" opacity="0.85"');
  // Haltlinien vor dem Andreaskreuz
  s += line(G.cx, ty + 1.15, x1, ty + 1.15, C.mark, 0.07) + line(x0, ty - 1.15, G.cx, ty - 1.15, C.mark, 0.07);
  s += lamp(x1 + 0.6, ty + 1.4) + lamp(x0 - 0.6, ty - 1.4);
  s += grain() + vig() + rect(0, 0, 6.3, H, 'url(#leftfade)');
  return s;
}
// Landstraße mit Kreuzung (Streckenverbote)
function sceneStrecke() {
  const y0 = G.my0, y1 = G.my1, cy = G.mcy, sx = 6.6, sw = 2 * G.L;
  let s = rect(0, 0, W, H, C.grass);
  s += rect(sx - 0.1, 0, sw + 0.2, H, '#20262C') + rect(sx, 0, sw, H, C.asphalt);
  s += rect(0, y0 - 0.1, W, y1 - y0 + 0.2, '#20262C') + rect(0, y0, W, y1 - y0, C.asphalt);
  s += line(0, cy, sx - 0.3, cy, C.mark, 0.05, 'stroke-dasharray="0.9 0.45" opacity="0.9"') + line(sx + sw + 0.3, cy, W, cy, C.mark, 0.05, 'stroke-dasharray="0.9 0.45" opacity="0.9"');
  s += line(0, y0 + 0.05, sx - 0.1, y0 + 0.05, C.mark, 0.035, 'opacity="0.8"') + line(sx + sw + 0.1, y0 + 0.05, W, y0 + 0.05, C.mark, 0.035, 'opacity="0.8"');
  s += line(0, y1 - 0.05, sx - 0.1, y1 - 0.05, C.mark, 0.035, 'opacity="0.8"') + line(sx + sw + 0.1, y1 - 0.05, W, y1 - 0.05, C.mark, 0.035, 'opacity="0.8"');
  s += line(sx + G.L, 0, sx + G.L, y0 - 0.4, C.mark, 0.05, 'stroke-dasharray="0.9 0.45" opacity="0.9"') + line(sx + G.L, y1 + 0.4, sx + G.L, H, C.mark, 0.05, 'stroke-dasharray="0.9 0.45" opacity="0.9"');
  let rr = 9; const rnd = () => { rr = (rr * 9301 + 49297) % 233280; return rr / 233280; };
  for (let i = 0; i < 34; i++) { const x = rnd() * W, top = rnd() > 0.5, y = top ? y0 - 0.7 - rnd() * 2.0 : y1 + 0.8 + rnd() * 2.0, r = 0.22 + rnd() * 0.32; if (Math.abs(x - sx - G.L) > 1.4) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#07100A" opacity="0.9"/><circle cx="${x - r * 0.2}" cy="${y - r * 0.2}" r="${r * 0.6}" fill="#0B170F" opacity="0.8"/>`; }
  s += grain() + vig() + rect(0, 0, W, 2.4, 'url(#topfade)');
  return s;
}
// Nebel-Szene: Landstraße in Perspektive mit Leitpfosten alle 50 m
function sceneNebel() {
  const hz = 3.1, f = 30, h = 1.2, cx = 6.67, camX = 0.9;
  const P = (X, z) => [cx + f * (X - camX) / z, hz + f * h / z];
  let s = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070B"/><stop offset="1" stop-color="#101722"/></linearGradient>` + rect(0, 0, W, H, 'url(#sky)');
  s += rect(0, hz, W, H - hz, '#0A120D');
  const zN = 8, zF = 900;
  const road = [P(-3.5, zN), P(3.5, zN), P(3.5, zF), P(-3.5, zF)];
  s += `<path d="M${road.map(p => p.join(' ')).join(' L')} Z" fill="#1A2029"/>`;
  // Randlinien und Leitlinie
  for (const X of [-3.3, 3.3]) { const a = P(X, zN), b = P(X, zF); s += line(a[0], a[1], b[0], b[1], '#C9D1DC', 0.03, 'opacity="0.7"'); }
  for (let z = 10; z < 500; z += 12) { const a = P(0, z), b = P(0, z + 6); s += line(a[0], a[1], b[0], b[1], '#D9DEE5', Math.max(0.006, 0.6 / z), 'opacity="0.8"'); }
  // Scheinwerferkegel
  s += `<radialGradient id="hl" cx="0.5" cy="1" r="0.8"><stop offset="0" stop-color="#FFF1CF" stop-opacity="0.22"/><stop offset="1" stop-color="#FFF1CF" stop-opacity="0"/></radialGradient>`;
  const hl = [P(-2.5, zN), P(4.5, zN), P(3.0, 90), P(0.2, 90)];
  s += `<path d="M${hl.map(p => p.join(' ')).join(' L')} Z" fill="url(#hl)"/>`;
  // Leitpfosten: rechts rechteckiger, links zwei runde Rückstrahler
  for (let z = 50; z <= 600; z += 50) {
    for (const side of [1, -1]) {
      const X = side * 4.2, [x, y] = P(X, z), ph = f * 1.0 / z, pw = f * 0.12 / z;
      s += rect(x - pw / 2, y - ph, pw, ph, '#E9EDF2') + rect(x - pw / 2, y - ph * 0.72, pw, ph * 0.25, '#11151B');
      const gl = Math.max(0.012, f * 0.06 / z);
      if (side > 0) s += rect(x - pw * 0.3, y - ph * 0.68, pw * 0.6, ph * 0.17, '#FFFFFF', 'opacity="0.95"') + `<circle cx="${x}" cy="${y - ph * 0.6}" r="${gl * 2.5}" fill="#FFF6D8" opacity="0.18"/>`;
      else s += `<circle cx="${x}" cy="${y - ph * 0.66}" r="${pw * 0.28}" fill="#FFFFFF"/><circle cx="${x}" cy="${y - ph * 0.52}" r="${pw * 0.28}" fill="#FFFFFF"/>`;
    }
  }
  s += grain() + vig();
  return s;
}
// Nebel-Overlays: Sichtweite ca. 150 m bzw. ca. 50 m
function fog(dist) {
  const hz = 3.1, f = 30, h = 1.2, y = hz + f * h / dist;
  return wrap(`<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E97A3" stop-opacity="0.96"/><stop offset="${(y / H) * 0.98}" stop-color="#8E97A3" stop-opacity="0.93"/><stop offset="${Math.min(1, y / H + 0.18)}" stop-color="#8E97A3" stop-opacity="0.35"/><stop offset="1" stop-color="#8E97A3" stop-opacity="0.12"/></linearGradient><rect width="${W}" height="${H}" fill="url(#fg)"/>`);
}
// Zug von oben (fährt nach rechts)
function trainSvg() {
  const len = 52, wd = 3.0, M = 40;
  let s = `<rect x="0.3" y="0.35" width="${len}" height="${wd}" rx="0.6" fill="#000" opacity="0.5"/>`;
  for (let i = 0; i < 2; i++) {
    const x = i * 26.2;
    s += `<rect x="${x}" y="0.1" width="25.8" height="${wd}" rx="${i === 1 ? 1.2 : 0.4}" fill="#C8102E"/>`;
    s += `<rect x="${x + 0.6}" y="0.55" width="24.6" height="${wd - 0.9}" rx="0.3" fill="#B00D27"/>`;
    s += `<rect x="${x + 1}" y="1.35" width="23.8" height="0.5" rx="0.2" fill="#E9EDF2" opacity="0.85"/>`;
    for (let k = 0; k < 6; k++) s += `<rect x="${x + 2 + k * 3.9}" y="0.75" width="1.6" height="0.35" rx="0.1" fill="#1A1F28"/>`;
  }
  s += `<rect x="${len - 1.4}" y="0.5" width="1.1" height="${wd - 0.8}" rx="0.4" fill="#10151C"/>`;
  s += `<circle cx="${len - 0.3}" cy="0.8" r="0.35" fill="#FFF6D8"/><circle cx="${len - 0.3}" cy="${wd - 0.6}" r="0.35" fill="#FFF6D8"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${len + 0.6} ${wd + 0.6}" width="${Math.round((len + 0.6) * M)}" height="${Math.round((wd + 0.6) * M)}">${s}</svg>`;
}
// Halbschranke von oben: Drehpunkt in der Bildmitte (für Spin), Arm nach links
function barrierSvg(right = false) {
  const L = 3.6, M = 120;
  let s = '';
  for (let i = 0; i < 6; i++) s += `<rect x="${(right ? L : 0) + i * L / 6}" y="0.03" width="${L / 6}" height="0.14" fill="${i % 2 ? '#FFFFFF' : '#E02020'}"/>`;
  s += `<circle cx="${L}" cy="0.1" r="0.16" fill="#3A4252"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${2 * L} 0.2" width="${Math.round(2 * L * M)}" height="${Math.round(0.2 * M)}">${s}</svg>`;
}
// Verkehrseinrichtungen (nachgezeichnet, Anlage 4 StVO)
const VE = {
  schranke: () => { let s = ''; for (let i = 0; i < 8; i++) s += `<rect x="${0.1 + i * 0.4}" y="0.5" width="0.4" height="0.36" fill="${i % 2 ? '#FFFFFF' : '#D32F2F'}"/>`; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3.4 1.6" width="1020" height="480"><rect x="0.1" y="0.5" width="3.2" height="0.36" fill="#fff"/>${s}<rect x="0.2" y="0.86" width="0.08" height="0.7" fill="#9AA3AE"/><rect x="3.12" y="0.86" width="0.08" height="0.7" fill="#9AA3AE"/><circle cx="0.3" cy="0.3" r="0.18" fill="#FFB400"/><circle cx="3.1" cy="0.3" r="0.18" fill="#FFB400"/></svg>`; },
  bake: (dir = -1) => { // Schraffen fallen zur Seite, an der vorbeizufahren ist (dir -1: links)
    let st = ''; for (let i = -3; i < 6; i++) { const y = i * 0.5; st += `<path d="M0 ${y} L1 ${y - 0.6} L1 ${y - 0.35} L0 ${y + 0.25} Z" fill="#D32F2F"/>`; }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 2.6" width="300" height="780"><clipPath id="c"><rect width="1" height="2.6" rx="0.06"/></clipPath><rect width="1" height="2.6" rx="0.06" fill="#FFFFFF"/><g clip-path="url(#c)" transform="${dir < 0 ? '' : 'translate(1 0) scale(-1 1)'}">${st}</g><rect width="1" height="2.6" rx="0.06" fill="none" stroke="#333" stroke-width="0.02"/></svg>`;
  },
  kegel: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1.2 1.6" width="360" height="480"><path d="M0.45 0.05 L0.75 0.05 L1.02 1.4 L0.18 1.4 Z" fill="#E8551B"/><path d="M0.36 0.5 L0.84 0.5 L0.9 0.78 L0.3 0.78 Z" fill="#FFFFFF"/><rect x="0.05" y="1.38" width="1.1" height="0.16" rx="0.04" fill="#2A2F38"/></svg>`,
  pfostenR: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0.5 2" width="150" height="600"><rect x="0.1" y="0" width="0.3" height="1.9" rx="0.04" fill="#F2F4F7"/><rect x="0.1" y="0.3" width="0.3" height="0.5" fill="#111"/><rect x="0.17" y="0.36" width="0.16" height="0.38" fill="#FFFFFF"/><rect x="0" y="1.9" width="0.5" height="0.08" fill="#4B5563"/></svg>`,
  pfostenL: () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0.5 2" width="150" height="600"><rect x="0.1" y="0" width="0.3" height="1.9" rx="0.04" fill="#F2F4F7"/><rect x="0.1" y="0.3" width="0.3" height="0.5" fill="#111"/><circle cx="0.25" cy="0.43" r="0.07" fill="#FFFFFF"/><circle cx="0.25" cy="0.64" r="0.07" fill="#FFFFFF"/><rect x="0" y="1.9" width="0.5" height="0.08" fill="#4B5563"/></svg>`,
  // Baken vor Bahnübergängen (drei-, zwei-, einstreifig), nachgezeichnet
  bahnbake: (n) => { let st = ''; for (let i = 0; i < n; i++) { const y = 0.35 + i * 0.62; st += `<path d="M0 ${y + 0.45} L1 ${y} L1 ${y + 0.28} L0 ${y + 0.73} Z" fill="#D32F2F"/>`; } return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 2.4" width="300" height="720"><clipPath id="c"><rect width="1" height="2.4" rx="0.05"/></clipPath><rect width="1" height="2.4" rx="0.05" fill="#FFFFFF"/><g clip-path="url(#c)">${st}</g><rect width="1" height="2.4" rx="0.05" fill="none" stroke="#333" stroke-width="0.02"/></svg>`; },
};

async function build() {
  // Schilder
  const want = ['101', '101_15', '103_10', '108_10', '110_10', '136_10', '138_10', '142_10', '201_51', '220_10', '222', '237', '239', '240', '241_30', '250', '251', '253', '254', '260', '262__5_5__', '264__2__', '267', '268', '274_30', '274_50', '274_70', '274_80', '274_100', '276', '277', '278_70', '283', '286', '306', '314', '325_1', '330_1', '331_1', '350_10', '357', '626_20', '1020_30', '1053_35', '1040_30__16_00_18_00__', '1004_30__100__', '1001_30__800__', '205', '206', '102', '301', '215'];
  const dims = JSON.parse(fs.readFileSync(path.join(OUT, 'signs.json')));
  for (const z of want) {
    const f = path.join(OUT, 'sign_' + z.replace(/__.*$/, '') + '.png');
    await sharp(fs.readFileSync(path.join(S, 'DE_' + z + '.svg'))).resize({ height: 420 }).png().toFile(f);
    const m = await sharp(f).metadata(); dims[z.replace(/__.*$/, '')] = m.width / m.height;
  }
  // Andreaskreuz ohne Maßangabe (Beschriftung unten abschneiden)
  {
    await sharp(fs.readFileSync(path.join(OUT, 'a201.svg')), { density: 150 }).trim().resize({ height: 420 }).png().toFile(path.join(OUT, 'sign_201.png'));
    const m2 = await sharp(path.join(OUT, 'sign_201.png')).metadata(); dims['201'] = m2.width / m2.height;
  }
  // Nachgezeichnete Einrichtungen
  for (const [n, svg] of [['ve_schranke', VE.schranke()], ['ve_bake_l', VE.bake(-1)], ['ve_bake_r', VE.bake(1)], ['ve_kegel', VE.kegel()], ['ve_pfosten_r', VE.pfostenR()], ['ve_pfosten_l', VE.pfostenL()], ['bb3', VE.bahnbake(3)], ['bb2', VE.bahnbake(2)], ['bb1', VE.bahnbake(1)]]) {
    await png(n, svg); const m = await sharp(path.join(OUT, n + '.png')).metadata(); dims[n] = m.width / m.height;
  }
  fs.writeFileSync(path.join(OUT, 'signs.json'), JSON.stringify(dims));
  // Szenen
  await jpg('sc_mark', wrap(sceneMark()));
  await jpg('sc_bau', wrap(sceneBau()));
  await png('ov_yellow', yellowLines());
  await jpg('sc_bahn', wrap(sceneBahn()));
  await jpg('sc_nebel', wrap(sceneNebel()), 88);
  await png('ov_fog150', fog(150)); await png('ov_fog50', fog(50));
  await png('train', trainSvg()); await png('barrier', barrierSvg()); await png('barrier_r', barrierSvg(true));
  await jpg('sc_strecke', wrap(sceneStrecke()));
  // Schilderwald (Titel): unscharfe Schilder im Dunkeln
  {
    const pick = ['101', '103_10', '108_10', '136_10', '142_10', '205', '206', '237', '250', '267', '274_70', '276', '283', '306', '314', '330_1', '350_10', '357', '201', '215', '102', '301', '138_10', '222'];
    let r = 11; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    const Wp = 1920, Hp = 1080, comps = [];
    for (let i = 0; i < 34; i++) {
      const z = pick[i % pick.length], sz = Math.round(90 + rnd() * 230), blur = 1 + rnd() * 9;
      const buf = await sharp(path.join(OUT, 'sign_' + z + '.png')).resize({ height: sz }).blur(blur).modulate({ brightness: 0.35 + rnd() * 0.3 }).png().toBuffer();
      const m = await sharp(buf).metadata();
      comps.push({ input: buf, left: Math.round(700 + rnd() * (Wp - 700 - m.width)), top: Math.round(rnd() * (Hp - m.height)) });
    }
    const base = await sharp({ create: { width: Wp, height: Hp, channels: 3, background: '#05070B' } }).composite(comps).png().toBuffer();
    const over = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Wp}" height="${Hp}"><defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#05070B" stop-opacity="1"/><stop offset="0.45" stop-color="#05070B" stop-opacity="0.8"/><stop offset="1" stop-color="#05070B" stop-opacity="0.15"/></linearGradient><radialGradient id="v" cx="50%" cy="50%" r="75%"><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient><radialGradient id="o" cx="0.8" cy="0.2" r="0.6"><stop offset="0" stop-color="#FF7A1A" stop-opacity="0.18"/><stop offset="1" stop-color="#FF7A1A" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#l)"/><rect width="100%" height="100%" fill="url(#o)"/><rect width="100%" height="100%" fill="url(#v)"/></svg>`);
    await sharp(base).composite([{ input: over }]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, 'bg_schilder.jpg'));
  }
  console.log('Lektion-6-Grafiken fertig');
}
module.exports = { G };
if (require.main === module) build().catch(e => { console.error(e); process.exit(1); });
