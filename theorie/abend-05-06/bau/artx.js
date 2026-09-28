// Zusatzgrafiken: abknickende Vorfahrt (Lichtspur, großes Zusatzzeichen, Regel-Skizzen) und Bühne für die Gruppenvorstellung
const sharp = require('sharp');
const path = require('path');
const { W, H, X } = require('./geo5');
const OUT = path.join(__dirname, 'art');
const PX = 2000;
const png = (n, svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT, n + '.png'));
const jpg = (n, svg) => sharp(Buffer.from(svg)).flatten({ background: '#07080B' }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, n + '.jpg'));
const full = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${PX}" height="${Math.round(PX * H / W)}"><defs>
  <filter id="b1" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="0.09"/></filter>
  <filter id="b2" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="0.025"/></filter>${defs}</defs>${body}</svg>`;

// ---------- Lichtspur entlang der abknickenden Vorfahrtstraße (Süd → West), in zwei Teilen ----------
const r = 0.8;
const pV = `M${X.cx} ${H + 0.2} L${X.cx} ${X.cy + r} Q${X.cx} ${X.cy} ${X.cx - r} ${X.cy}`;
const pH = `M${X.cx - r} ${X.cy} L6.2 ${X.cy}`;
function trail(d, part) {
  const col = '#FFB547', hot = '#FFE2B0';
  const off = X.L / 2;
  // Fahrstreifen: parallele Pfade
  const laneD = (k) => part === 'v'
    ? `M${X.cx + k} ${H + 0.2} L${X.cx + k} ${X.cy + r} Q${X.cx + k} ${X.cy - k} ${X.cx - r} ${X.cy - k}`
    : `M${X.cx - r} ${X.cy + k} L6.2 ${X.cy + k}`;
  let s = `<path d="${d}" stroke="${col}" stroke-width="${2 * X.L + 0.25}" fill="none" opacity="0.22" filter="url(#b1)" stroke-linecap="butt"/>`;
  s += `<path d="${d}" stroke="${col}" stroke-width="${2 * X.L}" fill="none" opacity="0.10"/>`;
  for (const k of [-off, off]) {
    s += `<path d="${laneD(k)}" stroke="${col}" stroke-width="0.12" fill="none" opacity="0.55" filter="url(#b1)"/>`;
    s += `<path d="${laneD(k)}" stroke="${hot}" stroke-width="0.03" fill="none" opacity="0.95" filter="url(#b2)"/>`;
  }
  return s;
}
// Pfeilspitzen (Chevrons) in Fahrtrichtung auf der Achse

// ---------- Zusatzzeichen 1002 groß + Leuchtebenen ----------
const zw = 1.3, zh = 1.0, zcx = zw / 2, zcy = zh / 2 + 0.03, za = 0.36;
const zend = { N: [zcx, zcy - za], S: [zcx, zcy + za], W: [zcx - za * 1.15, zcy], E: [zcx + za * 1.15, zcy] };
const zsvg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.15 -0.15 ${zw + 0.3} ${zh + 0.3}" width="${Math.round((zw + 0.3) * 900)}" height="${Math.round((zh + 0.3) * 900)}"><defs><filter id="g" x="-0.3" y="-0.3" width="1.6" height="1.6" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="0.022"/></filter>${defs}</defs>${body}</svg>`;
const zThick = (col, sw) => `<path d="M${zend.S[0]} ${zend.S[1]} L${zcx} ${zcy} L${zend.W[0]} ${zend.W[1]}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linejoin="round"/>`;
const zThin = (col, sw) => ['N', 'E'].map(d => `<line x1="${zcx}" y1="${zcy}" x2="${zend[d][0]}" y2="${zend[d][1]}" stroke="${col}" stroke-width="${sw}"/>`).join('');
const zPlate = `<rect x="0.02" y="0.02" width="${zw - 0.04}" height="${zh - 0.04}" rx="0.06" fill="#FFFFFF" stroke="#111" stroke-width="0.035"/>` + zThin('#111', 0.045) + zThick('#111', 0.15);

// ---------- Regel-Skizzen (Draufsicht, 3,4 × 2,1) ----------
const DW = 3.4, DH = 2.1, dcx = 1.7, dcy = 1.05, hw = 0.3;
const dsvg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DW} ${DH}" width="${DW * 400}" height="${DH * 400}"><defs>
  <marker id="ah" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker>
  <filter id="g" filterUnits="userSpaceOnUse" x="0" y="0" width="${DW}" height="${DH}"><feGaussianBlur stdDeviation="0.02" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="g2" filterUnits="userSpaceOnUse" x="0" y="0" width="${DW}" height="${DH}"><feGaussianBlur stdDeviation="0.05"/></filter>
  <clipPath id="c"><rect width="${DW}" height="${DH}" rx="0.12"/></clipPath></defs><g clip-path="url(#c)">${body}</g></svg>`;
function dBase(prio = true) {
  let s = `<rect width="${DW}" height="${DH}" fill="#0B1017"/>`;
  s += `<rect x="0" y="${dcy - hw}" width="${DW}" height="${2 * hw}" fill="#1E2733"/><rect x="${dcx - hw}" y="0" width="${2 * hw}" height="${DH}" fill="#1E2733"/>`;
  const dsh = 'stroke="#D9DEE5" stroke-width="0.018" stroke-dasharray="0.12 0.1" opacity="0.7"';
  s += `<line x1="0" y1="${dcy}" x2="${dcx - hw - 0.05}" y2="${dcy}" ${dsh}/><line x1="${dcx + hw + 0.05}" y1="${dcy}" x2="${DW}" y2="${dcy}" ${dsh}/>`;
  s += `<line x1="${dcx}" y1="0" x2="${dcx}" y2="${dcy - hw - 0.05}" ${dsh}/><line x1="${dcx}" y1="${dcy + hw + 0.05}" x2="${dcx}" y2="${DH}" ${dsh}/>`;
  if (prio) {
    const d = `M${dcx} ${DH} L${dcx} ${dcy + 0.2} Q${dcx} ${dcy} ${dcx - 0.2} ${dcy} L0 ${dcy}`;
    s += `<path d="${d}" stroke="#FFB547" stroke-width="${2 * hw + 0.06}" fill="none" opacity="0.2" filter="url(#g2)"/><path d="${d}" stroke="#FFB547" stroke-width="${2 * hw}" fill="none" opacity="0.12"/>`;
  }
  return s;
}
// Auto: Mitte (x,y), Richtung rot (0 = nach Norden)
const car = (x, y, rot, col, blink) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-0.085" y="-0.16" width="0.17" height="0.32" rx="0.05" fill="${col}"/><rect x="-0.065" y="-0.09" width="0.13" height="0.08" rx="0.02" fill="#0B1017" opacity="0.55"/>${blink ? `<circle cx="${blink === 'L' ? -0.08 : 0.08}" cy="-0.15" r="0.035" fill="#FFB400" filter="url(#g)"/><circle cx="${blink === 'L' ? -0.08 : 0.08}" cy="0.15" r="0.035" fill="#FFB400" filter="url(#g)"/>` : ''}</g>`;
const arr = (d, col) => `<path d="${d}" stroke="${col}" stroke-width="0.045" fill="none" stroke-linecap="round" marker-end="url(#ah)" filter="url(#g)"/>`;
const num = (x, y, n, col) => `<circle cx="${x}" cy="${y}" r="0.12" fill="${col}" stroke="#FFFFFF" stroke-width="0.018"/><text x="${x}" y="${y + 0.055}" font-size="0.16" font-weight="700" text-anchor="middle" font-family="Carlito, Calibri, sans-serif" fill="#0A0C10">${n}</text>`;
const O = '#FF7A1A', B = '#6F9BD1', RD = '#E08892';
const nbx = dcx + hw / 2, sbx = dcx - hw / 2, eby = dcy + hw / 2, wby = dcy - hw / 2;
const duLeft = `M${nbx} ${DH - 0.4} L${nbx} ${dcy + 0.12} Q${nbx} ${wby} ${dcx - 0.1} ${wby} L0.45 ${wby}`;
const aRight = `M0.55 ${eby} L${sbx - 0.12} ${eby} Q${sbx} ${eby} ${sbx} ${eby + 0.12} L${sbx} ${DH - 0.2}`;
const RULES = {
  rule_1: dBase() + arr(duLeft, O) + car(nbx, DH - 0.22, 0, O, 'L'),
  rule_2: dBase() + arr(duLeft, O) + arr(aRight, B) + car(nbx, DH - 0.22, 0, O, 'L') + car(0.36, eby, 90, B, 'R'),
  rule_3: dBase() + arr(`M${sbx} 0.42 L${sbx} ${DH - 0.2}`, B) + arr(`M${DW - 0.45} ${wby} L0.25 ${wby}`, RD)
    + car(sbx, 0.24, 180, B) + car(DW - 0.26, wby, 270, RD) + num(sbx - 0.28, 0.26, 1, B) + num(DW - 0.28, wby - 0.3, 2, RD),
};

// ---------- Bühne (Gruppenvorstellung) ----------
function stage() {
  let rr = 5; const rnd = () => { rr = (rr * 9301 + 49297) % 233280; return rr / 233280; };
  let s = `<rect width="${W}" height="${H}" fill="#050507"/>`;
  s += `<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD9A8" stop-opacity="0.34"/><stop offset="1" stop-color="#FF9A3C" stop-opacity="0.04"/></linearGradient>`;
  s += `<radialGradient id="floor" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFB060" stop-opacity="0.35"/><stop offset="1" stop-color="#FFB060" stop-opacity="0"/></radialGradient>`;
  s += `<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.85"/></radialGradient>`;
  s += `<path d="M5.9 -0.2 L7.43 -0.2 L10.6 6.6 L2.73 6.6 Z" fill="url(#beam)" filter="url(#b1)"/>`;
  s += `<ellipse cx="${W / 2}" cy="6.45" rx="4.3" ry="0.75" fill="url(#floor)"/>`;
  for (let i = 0; i < 70; i++) { const y = rnd() * 6.4, sp = 0.2 + (y / 6.6) * 3.9, x = W / 2 + (rnd() * 2 - 1) * sp; s += `<circle cx="${x}" cy="${y}" r="${0.006 + rnd() * 0.018}" fill="#FFE8C8" opacity="${0.15 + rnd() * 0.5}"/>`; }
  s += `<rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  return s;
}

(async () => {
  await png('ov_trail_v', full(trail(pV, 'v')));
  await png('ov_trail_h', full(`<g mask="url(#mh)">${trail(pH, 'h')}</g>`, `<linearGradient id="lh" gradientUnits="userSpaceOnUse" x1="6.2" y1="0" x2="7.6" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="mh" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#lh)"/></mask>`));
  await png('zz_big', zsvg(zPlate));
  await png('zz_thick_glow', zsvg(`<g filter="url(#g)">${zThick('#FFB547', 0.17)}</g>` + zThick('#FF8A1A', 0.15)));
  await png('zz_thin_glow', zsvg(`<g filter="url(#g)">${zThin('#6FA8FF', 0.07)}</g>` + zThin('#4F86E0', 0.045)));
  for (const [k, v] of Object.entries(RULES)) await png(k, dsvg(v));
  await jpg('bg_stage', full(stage()));
  console.log('Zusatzgrafiken fertig');
})().catch(e => { console.error(e); process.exit(1); });
