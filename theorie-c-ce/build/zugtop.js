// Draufsicht Lkw mit Anhänger (Gliederzug) als Schema aus Rechtecken – für fließende Morph-Folien.
// Maße in Metern, Maßstab S (Zoll je Meter). H = Kupplungspunkt am Heck des Lkw (Zoll).
// a = Fahrtrichtung Lkw, b = Richtung Anhänger (Grad, 0 = nach rechts, positiv = gegen den Uhrzeigersinn).
const { seg } = require('./gs');
const D = Math.PI / 180;
const uv = a => [Math.cos(a * D), -Math.sin(a * D)];
const lf = u => [u[1], -u[0]];                       // links vom Fahrer
const norm = d => Math.round(((d % 360) + 360) % 360 * 10) / 10;
const at = (H, u, n, d, l, S) => [H[0] + (u[0] * d + n[0] * l) * S, H[1] + (u[1] * d + n[1] * l) * S];

// Maße (m): Lkw 9,7 m vor der Kupplung, Anhänger-Aufbau 1,2 … 8,7 m dahinter → Zug gut 18,4 m
const LKW = { front: 9.7, rear: -0.3, cab: 2.3, axles: [8.1, 2.3, 1.0] };
const AH = { front: -1.2, rear: -8.7, axles: [-2.4, -7.4] };
const WID = 2.55;

function box(s, c, len, wid, a, o) {
  s.rrect(c[0] - len / 2, c[1] - wid / 2, len, wid, { rr: 0.1, ...o, rotate: norm(-a) });
}
// Lage der Räder (für Bremsspuren): [links, rechts] je Achse
function wheelsAh(H, b, S) {
  const v = uv(b), n = lf(v);
  return AH.axles.flatMap(d => [at(H, v, n, d, 1.05, S), at(H, v, n, d, -1.05, S)]);
}
function wheelsLkw(H, a, S) {
  const u = uv(a), n = lf(u);
  return LKW.axles.flatMap(d => [at(H, u, n, d, 1.05, S), at(H, u, n, d, -1.05, S)]);
}

// o: { H, a, b, S, nm, trailAh: [{H, b}, …] + nTrail (Bremsspur Anhänger), skidLkw: {H, a} | null, hl/hlL: Rahmenfarbe Anhänger/Lkw }
function zugTop(s, o) {
  const { H, a = 0, b = 0, S = 0.2, nm = 'z' } = o;
  const u = uv(a), nu = lf(u), v = uv(b), nv = lf(v);
  // Bremsspuren (unter allem)
  const sk = (from, to, k, show, tag) => seg(s, from[0], from[1], to[0], to[1], { col: '0B0E13', th: 0.05, hide: !show, name: `!!${nm}${tag}${k}` });
  const wa = wheelsAh(H, b, S);
  if (o.trailAh) {
    // Spur als Polylinie über frühere Lagen: o.trailAh = [{H, b}, …] (älteste zuerst), immer o.nTrail Abschnitte
    const P = [...o.trailAh.map(q => wheelsAh(q.H, q.b, S)), wa];
    for (let j = 0; j < o.nTrail; j++) wa.forEach((p, k) => {
      const on = j < P.length - 1, A = on ? P[j][k] : p, B = on ? P[j + 1][k] : p;
      sk(A, B, k + '_' + j, on, 'sa');
    });
  }
  const wl = wheelsLkw(H, a, S), wl0 = o.skidLkw ? wheelsLkw(o.skidLkw.H, o.skidLkw.a, S) : wl;
  [2, 3, 4, 5].forEach(k => sk(wl0[k], wl[k], k, !!o.skidLkw, 'sl'));
  // Räder
  const wheel = (p, ang, k, tag) => box(s, p, 1.0 * S, 0.42 * S, ang, { fill: '0B0E13', rr: 0.3, name: `!!${nm}${tag}${k}` });
  wa.forEach((p, k) => wheel(p, b, k, 'wa'));
  wl.forEach((p, k) => wheel(p, a, k, 'wl'));
  // Deichsel
  const T = at(H, v, nv, AH.axles[0], 0, S);
  seg(s, H[0], H[1], T[0], T[1], { col: '5E6876', th: 0.05, name: `!!${nm}db` });
  // Anhänger-Aufbau
  box(s, at(H, v, nv, (AH.front + AH.rear) / 2, 0, S), (AH.front - AH.rear) * S, WID * S, b, { fill: 'C9D0DA', line: o.hl || '97A1AE', lw: o.hl ? 2.25 : 1, name: `!!${nm}ab` });
  // Lkw: Aufbau und Fahrerhaus
  const bl = LKW.front - LKW.cab - 0.25 - LKW.rear;
  box(s, at(H, u, nu, LKW.rear + bl / 2, 0, S), bl * S, WID * S, a, { fill: 'C9D0DA', line: o.hlL || '97A1AE', lw: o.hlL ? 2.25 : 1, name: `!!${nm}lb` });
  box(s, at(H, u, nu, LKW.front - LKW.cab / 2, 0, S), LKW.cab * S, WID * S, a, { fill: 'E4E8EE', line: 'AEB6C2', lw: 1, rr: 0.18, name: `!!${nm}lc` });
  // Spiegel (links und rechts am Fahrerhaus)
  [1, -1].forEach((sd, k) => box(s, at(H, u, nu, LKW.front - 0.55, sd * 1.5, S), 0.25 * S, 0.5 * S, a, { fill: '5E6876', rr: 0.2, name: `!!${nm}sp${k}` }));
  return { T, rear: at(H, v, nv, AH.rear, 0, S), front: at(H, u, nu, LKW.front, 0, S) };
}
module.exports = { zugTop, LKW, AH, uv, lf, at };
