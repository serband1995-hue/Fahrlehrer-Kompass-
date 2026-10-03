// Draufsicht Lkw mit Anhänger (Gliederzug) als Schema aus Rechtecken – für fließende Morph-Folien.
// Maße in Metern, Maßstab S (Zoll je Meter). H = Kupplungspunkt am Heck des Lkw (Zoll).
// a = Fahrtrichtung Lkw, b = Richtung Anhänger (Grad, 0 = nach rechts, positiv = gegen den Uhrzeigersinn).
const { seg } = require('./gs');
const D = Math.PI / 180;
const uv = a => [Math.cos(a * D), -Math.sin(a * D)];
const lf = u => [u[1], -u[0]];                       // links vom Fahrer
const norm = d => Math.round(((d % 360) + 360) % 360 * 10) / 10;
// Rechtecke sehen nach 180° gleich aus: Winkel in [rb – 90, rb + 90) legen, damit Morph nie über 0/360 springt
const rep = (d, rb = 180) => { while (d < rb - 90) d += 180; while (d >= rb + 90) d -= 180; return norm(d); };
const at = (H, u, n, d, l, S) => [H[0] + (u[0] * d + n[0] * l) * S, H[1] + (u[1] * d + n[1] * l) * S];

// Maße (m): Lkw 9,7 m vor der Kupplung, Anhänger-Aufbau 1,2 … 8,7 m dahinter → Zug gut 18,4 m
const LKW = { front: 9.7, rear: -0.3, cab: 2.3, axles: [8.1, 2.3, 1.0] };
const AH = { front: -1.2, rear: -8.7, axles: [-2.4, -7.4] };
const WID = 2.55;

function box(s, c, len, wid, a, o) {
  const { rb, ...st } = o;
  s.rrect(c[0] - len / 2, c[1] - wid / 2, len, wid, { rr: 0.1, ...st, rotate: rep(-a, rb) });
}
// Lage der Räder (für Bremsspuren): [links, rechts] je Achse
// Vorderachse des Anhängers (Drehschemel) am Ende der Deichsel; bd = Richtung der Deichsel (Standard: wie der Anhänger)
const tAx = (H, b, S, bd) => { const w = uv(bd ?? b); return [H[0] - w[0] * 2.4 * S, H[1] - w[1] * 2.4 * S]; };
function wheelsAh(H, b, S, bd) {
  const v = uv(b), n = lf(v), w = uv(bd ?? b), nw = lf(w), T = tAx(H, b, S, bd);
  return [at(T, w, nw, 0, 1.05, S), at(T, w, nw, 0, -1.05, S), at(T, v, n, -5.0, 1.05, S), at(T, v, n, -5.0, -1.05, S)];
}
function wheelsLkw(H, a, S) {
  const u = uv(a), n = lf(u);
  return LKW.axles.flatMap(d => [at(H, u, n, d, 1.05, S), at(H, u, n, d, -1.05, S)]);
}

// o: { H, a, b, S, nm, trailAh: [{H, b}, …] + nTrail (Bremsspur Anhänger), trailLkw: [{H, a}, …] + nTrailL (Spur Antriebsräder), hl/hlL: Rahmenfarbe Anhänger/Lkw }
function zugTop(s, o) {
  const { H, a = 0, b = 0, S = 0.2, nm = 'z', bd, rb = 180 } = o;
  const u = uv(a), nu = lf(u), v = uv(b), nv = lf(v);
  // Bremsspuren (unter allem)
  const sk = (from, to, k, show, tag) => seg(s, from[0], from[1], to[0], to[1], { col: '0B0E13', th: 0.05, hide: !show, rb, name: `!!${nm}${tag}${k}` });
  const wa = wheelsAh(H, b, S, bd);
  if (o.trailAh) {
    // Spur als Polylinie über frühere Lagen: o.trailAh = [{H, b}, …] (älteste zuerst), immer o.nTrail Abschnitte
    const P = [...o.trailAh.map(q => wheelsAh(q.H, q.b, S, q.bd)), wa];
    for (let j = 0; j < o.nTrail; j++) wa.forEach((p, k) => {
      const on = j < P.length - 1, A = on ? P[j][k] : p, B = on ? P[j + 1][k] : p;
      sk(A, B, k + '_' + j, on, 'sa');
    });
  }
  const wl = wheelsLkw(H, a, S);
  if (o.trailLkw) {
    // Spur der Antriebsräder (Hinterachsen des Lkw): o.trailLkw = [{H, a}, …], immer o.nTrailL Abschnitte
    const P = [...o.trailLkw.map(q => wheelsLkw(q.H, q.a, S)), wl];
    for (let j = 0; j < o.nTrailL; j++) [2, 3, 4, 5].forEach(k => {
      const on = j < P.length - 1, A = on ? P[j][k] : wl[k], B = on ? P[j + 1][k] : wl[k];
      sk(A, B, k + '_' + j, on, 'sl');
    });
  }
  // Räder
  const wheel = (p, ang, k, tag) => box(s, p, 1.0 * S, 0.42 * S, ang, { fill: '0B0E13', rr: 0.3, rb, name: `!!${nm}${tag}${k}` });
  wa.forEach((p, k) => wheel(p, k < 2 ? (bd ?? b) : b, k, 'wa'));
  wl.forEach((p, k) => wheel(p, a, k, 'wl'));
  // Deichsel
  const T = tAx(H, b, S, bd);
  seg(s, H[0], H[1], T[0], T[1], { col: '5E6876', th: 0.05, rb, name: `!!${nm}db` });
  // Anhänger-Aufbau (1,2 m vor bis 6,3 m hinter der Vorderachse)
  box(s, at(T, v, nv, -2.55, 0, S), (AH.front - AH.rear) * S, WID * S, b, { fill: 'C9D0DA', line: o.hl || '97A1AE', lw: o.hl ? 2.25 : 1, rb, name: `!!${nm}ab` });
  // Lkw: Aufbau und Fahrerhaus
  const bl = LKW.front - LKW.cab - 0.25 - LKW.rear;
  box(s, at(H, u, nu, LKW.rear + bl / 2, 0, S), bl * S, WID * S, a, { fill: 'C9D0DA', line: o.hlL || '97A1AE', lw: o.hlL ? 2.25 : 1, rb, name: `!!${nm}lb` });
  box(s, at(H, u, nu, LKW.front - LKW.cab / 2, 0, S), LKW.cab * S, WID * S, a, { fill: 'E4E8EE', line: 'AEB6C2', lw: 1, rr: 0.18, rb, name: `!!${nm}lc` });
  // Spiegel (links und rechts am Fahrerhaus)
  [1, -1].forEach((sd, k) => box(s, at(H, u, nu, LKW.front - 0.55, sd * 1.5, S), 0.25 * S, 0.5 * S, a, { fill: '5E6876', rr: 0.2, rb, name: `!!${nm}sp${k}` }));
  return { T, rear: at(T, v, nv, -6.3, 0, S), front: at(H, u, nu, LKW.front, 0, S), wa, wl };
}

// Draufsicht Sattelzug. P = Mitte Hinterachse Zugmaschine (Zoll), a = Richtung Zugmaschine, b = Richtung Auflieger.
// Zugmaschine: Radstand 3,8 m, Sattelkupplung 0,5 m vor der Hinterachse. Auflieger 13,6 m, Königszapfen 1,6 m hinter der Front, Achsmitte 7,6 m dahinter.
const SZ = { wb: 3.8, c: 0.5, fo: 1.2, ro: 0.9, kp: 1.6, ax: 7.6, len: 13.6 };
function satTop(s, o) {
  const { P, a = 0, b = 0, S = 0.2, nm = 's', rb = 180 } = o;
  const u = uv(a), nu = lf(u), v = uv(b), nv = lf(v), K = at(P, u, nu, SZ.c, 0, S);
  const sk = (from, to, k, show, tag) => seg(s, from[0], from[1], to[0], to[1], { col: o.trailCol || 'FF5C5C', th: 0.035, hide: !show, rb, name: `!!${nm}${tag}${k}` });
  // Spur der Aufliegerachsen (Mitte außen links/rechts)
  const wA = (q) => { const vv = uv(q.b), nn = lf(vv), KK = at(q.P, uv(q.a), lf(uv(q.a)), SZ.c, 0, S); return [at(KK, vv, nn, -SZ.ax, 1.05, S), at(KK, vv, nn, -SZ.ax, -1.05, S)]; };
  if (o.trail) {
    const Pp = [...o.trail.map(wA), wA({ P, a, b })];
    for (let j = 0; j < o.nTrail; j++) [0, 1].forEach(k => {
      const on = j < Pp.length - 1, A = on ? Pp[j][k] : Pp[Pp.length - 1][k], B = on ? Pp[j + 1][k] : A;
      sk(A, B, k + '_' + j, on, 'tr');
    });
  }
  const wheel = (p, ang, k, tag) => box(s, p, 1.0 * S, 0.42 * S, ang, { fill: '0B0E13', rr: 0.3, rb, name: `!!${nm}${tag}${k}` });
  [-SZ.ax - 1.31, -SZ.ax, -SZ.ax + 1.31].forEach((d, i) => [1, -1].forEach((sd, j) => wheel(at(K, v, nv, d, sd * 1.05, S), b, i * 2 + j, 'wa')));
  [0, SZ.wb].forEach((d, i) => [1, -1].forEach((sd, j) => wheel(at(P, u, nu, d, sd * 1.05, S), a + (i ? (o.steer || 0) : 0), i * 2 + j, 'wz')));
  // Zugmaschine (Rahmen + Fahrerhaus), darüber der Auflieger
  box(s, at(P, u, nu, (SZ.wb + SZ.fo - 2.3 - SZ.ro) / 2, 0, S), (SZ.wb + SZ.fo - 2.3 + SZ.ro) * S, 2.2 * S, a, { fill: '3A4250', rr: 0.1, rb, name: `!!${nm}zr` });
  box(s, at(P, u, nu, SZ.wb + SZ.fo - 1.15, 0, S), 2.3 * S, WID * S, a, { fill: 'E4E8EE', line: 'AEB6C2', lw: 1, rr: 0.18, rb, name: `!!${nm}zc` });
  [1, -1].forEach((sd, k) => box(s, at(P, u, nu, SZ.wb + SZ.fo - 0.55, sd * 1.5, S), 0.25 * S, 0.5 * S, a, { fill: '5E6876', rr: 0.2, rb, name: `!!${nm}sp${k}` }));
  box(s, at(K, v, nv, SZ.kp - SZ.len / 2, 0, S), SZ.len * S, WID * S, b, { fill: 'C9D0DA', line: o.hl || '97A1AE', lw: o.hl ? 2.25 : 1, rb, name: `!!${nm}ab` });
  s.oval(K[0] - 0.035, K[1] - 0.035, 0.07, 0.07, { fill: o.kpCol || '5E6876', ft: o.kpCol ? 0 : 100, name: `!!${nm}kp` });
  return { K, rear: at(K, v, nv, SZ.kp - SZ.len, 0, S), wA: wA({ P, a, b }) };
}
// Kinematik (Einspurmodell, m und Grad, y nach oben). Schritt ds (< 0 = rückwärts), Lenkwinkel d (> 0 = links).
// st: { x, y, a, b } mit (x, y) = Hinterachse Zugfahrzeug; c = Kupplung vor (+) / hinter (–) der Hinterachse; L = Kupplung bis Anhängerachse
function stepSattel(st, ds, d, wb = SZ.wb, c = SZ.c, L = SZ.ax) {
  const R = Math.PI / 180, th = st.a * R, ph = st.b * R;
  const dth = ds / wb * Math.tan(d * R);
  const dph = (ds * Math.sin(th - ph) + c * dth * Math.cos(th - ph)) / L;
  return { x: st.x + ds * Math.cos(th), y: st.y + ds * Math.sin(th), a: (th + dth) / R, b: (ph + dph) / R };
}
// Gliederzug: (x, y) = Mitte Tandem Lkw, a = Lkw, bd = Deichsel, b = Anhänger. Kupplung 1,65 m hinter dem Tandem, Radstand 6,45 m,
// Deichsel 2,4 m (Kupplung bis Drehschemel), Anhänger-Radstand 5,0 m (passt zu zugTop).
function stepGlieder(st, ds, d, wb = 6.45, c = -1.65, Ld = 2.4, Lb = 5.0) {
  const R = Math.PI / 180, th = st.a * R, ps = st.bd * R, ph = st.b * R;
  const dth = ds / wb * Math.tan(d * R);
  const dP = [ds * Math.cos(th), ds * Math.sin(th)];
  const dQ = [dP[0] - c * dth * Math.sin(th), dP[1] + c * dth * Math.cos(th)];
  const dps = (-dQ[0] * Math.sin(ps) + dQ[1] * Math.cos(ps)) / Ld;
  const dT = [dQ[0] + Ld * dps * Math.sin(ps), dQ[1] - Ld * dps * Math.cos(ps)];
  const dph = (-dT[0] * Math.sin(ph) + dT[1] * Math.cos(ph)) / Lb;
  return { x: st.x + dP[0], y: st.y + dP[1], a: (th + dth) / R, bd: (ps + dps) / R, b: (ph + dph) / R };
}
// Lage für zugTop: Kupplung H (m) aus dem Zustand
const hitchG = st => [st.x - 1.65 * Math.cos(st.a * Math.PI / 180), st.y - 1.65 * Math.sin(st.a * Math.PI / 180)];
module.exports = { zugTop, satTop, stepSattel, stepGlieder, hitchG, LKW, AH, SZ, uv, lf, at };
