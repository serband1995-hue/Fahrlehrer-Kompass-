// Detaillierte Lkw-Seitenansicht als SVG (Front links). Maße in Zoll auf der Folie, 100 px je Zoll.
// lkwSide(o) → { upper, wheels, H, pad }  · upper = alles, was auf der Federung sitzt; wheels = Räder (stehen fest)
// Einbau: s.img(await svgImg(r.upper, r.W, r.H), { x: X - r.pad, y: GY - r.H / 100, w: r.W / 100, h: r.H / 100 })
// Spiegel: Arm oben an der A-Säule nach vorn, Spiegelkopf senkrecht vor dem Seitenfenster (Fahrer schaut nach vorn hinein).

function lkwSide(o = {}) {
  const L = o.L ?? 5.6;                 // Gesamtlänge
  const f = o.floor ?? 0.75;            // Oberkante Rahmen über Boden
  const r = o.r ?? 0.3;                 // Radradius
  const ax = o.axles ?? [0.78, L - 1.55];
  const boxH = o.boxH ?? 1.5;
  const box = o.box ?? 'koffer';
  const pad = 0.15, Ht = (o.top ?? (f + boxH + 0.25)) + 0.1;
  const W = Math.round((L + 2 * pad) * 100), H = Math.round(Ht * 100);
  const X = x => ((x + pad) * 100).toFixed(1), Y = y => ((Ht - y) * 100).toFixed(1), S = v => (v * 100).toFixed(1);
  const rect = (x, y, w, h, st) => `<rect x="${X(x)}" y="${Y(y + h)}" width="${S(w)}" height="${S(h)}" ${st}/>`;
  const line = (x1, y1, x2, y2, st) => `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" ${st}/>`;
  const circ = (x, y, rr, st) => `<circle cx="${X(x)}" cy="${Y(y)}" r="${S(rr)}" ${st}/>`;
  const path = (pts, st) => `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join(' ')} Z" ${st}/>`;
  const cabCol = o.cabCol || '#E4E8EE', boxCol = o.boxCol || '#C9D0DA', dark = '#1A1F27', metal = '#7D8898';
  const cabB = f - 0.22, cabT = o.cabTop ?? (f + 1.12), cabL = o.cabL ?? 1.32;
  const wB = Math.max(f + 0.52, cabT - 0.95), xf = 0.1 + 0.1 * (wB - f - 0.5) / Math.max(0.1, cabT - 0.62 - f); // Fensterunterkante, Frontlinie dort
  let u = '';
  // Rahmen
  u += rect(0.25, f - 0.13, L - 0.4, 0.13, `fill="#3A4250"`);
  // Kraftstofftank + AdBlue-Tank (am Rahmen)
  const tx = ax[0] + r + 0.25;
  if (tx + 0.85 < ax[ax.length - 1] - r - 0.1) {
    u += rect(tx, f - 0.5, 0.75, 0.34, `rx="6" fill="#8C96A4" stroke="#5E6876" stroke-width="2"`);
    u += line(tx + 0.12, f - 0.33, tx + 0.63, f - 0.33, `stroke="#6E7886" stroke-width="2"`);
    u += rect(tx + 0.58, f - 0.2, 0.1, 0.05, `fill="#3A4250"`);
    u += rect(tx + 0.8, f - 0.42, 0.22, 0.26, `rx="4" fill="#7F8A98"`);
    u += rect(tx + 0.86, f - 0.18, 0.09, 0.04, `fill="#2F6FE0"`);
  }
  // Seitlicher Unterfahrschutz zwischen den Achsen
  const sx1 = Math.max(tx + 1.1, ax[0] + r + 0.2), sx2 = ax[ax.length > 2 ? ax.length - 2 : ax.length - 1] - r - 0.12;
  if (sx2 - sx1 > 0.4) for (const hh of [0.3, 0.48]) u += rect(sx1, hh, sx2 - sx1, 0.045, `fill="#9AA6B5"`);
  // Kotflügel hinten
  for (const a of ax.slice(1)) u += `<path d="M ${X(a - r - 0.06)} ${Y(r + 0.02)} A ${S(r + 0.07)} ${S(r + 0.07)} 0 0 1 ${X(a + r + 0.06)} ${Y(r + 0.02)}" fill="none" stroke="#2A303A" stroke-width="7"/>`;
  // Aufbau
  if (box !== 'none') {
    const bx = cabL + 0.1, bw = L - bx - 0.05;
    u += rect(bx, f, bw, 0.07, `fill="#4A5361"`);                       // Hilfsrahmen
    if (box === 'koffer') {
      u += rect(bx, f + 0.07, bw, boxH - 0.07, `fill="${boxCol}" stroke="#97A1AE" stroke-width="2"`);
      for (let x = bx + 0.42; x < bx + bw - 0.2; x += 0.42) u += line(x, f + 0.1, x, f + boxH - 0.04, `stroke="#B3BBC6" stroke-width="2"`);
      u += rect(bx, f + boxH - 0.07, bw, 0.07, `fill="#A9B2BE"`);
      u += rect(bx + bw - 0.06, f + 0.07, 0.06, boxH - 0.07, `fill="#9AA4B1"`);  // Türrahmen hinten
    } else if (box === 'pritsche') {
      u += rect(bx, f + 0.07, bw, boxH - 0.07, `fill="#8C96A4" stroke="#6E7886" stroke-width="2"`);
      for (let x = bx + 0.6; x < bx + bw - 0.2; x += 0.6) u += line(x, f + 0.09, x, f + boxH - 0.02, `stroke="#6E7886" stroke-width="3"`);
      u += rect(bx, f + boxH - 0.05, bw, 0.05, `fill="#A9B2BE"`);
    } else {
      u += rect(bx, f + 0.07, bw, boxH - 0.07, `fill="#5B7BA6" stroke="#46658F" stroke-width="2"`);
      for (let x = bx + 0.5; x < bx + bw - 0.2; x += 0.5) u += line(x, f + 0.1, x, f + boxH - 0.04, `stroke="#4D6D97" stroke-width="2"`);
      u += rect(bx, f + 0.07, bw, 0.22, `fill="#8C96A4"`);                // Bordwand
    }
    // Rückleuchte + Unterfahrschutz hinten
    u += rect(L - 0.12, f - 0.22, 0.1, 0.12, `fill="#C0392B"`);
    u += rect(L - 0.2, 0.3, 0.06, f - 0.42, `fill="#5E6876"`);
    u += rect(L - 0.26, 0.26, 0.22, 0.09, `fill="#9AA6B5"`);
  }
  // Sattelzugmaschine: Rückleuchte am Rahmenende und Sattelkupplung (o.sattel = Mitte der Platte)
  if (box === 'none') {
    u += rect(L - 0.14, f - 0.24, 0.1, 0.12, `fill="#C0392B"`);
    u += rect(L - 0.2, 0.36, 0.06, f - 0.48, `fill="#5E6876"`);
  }
  if (o.sattel) {
    const sx = o.sattel;
    u += rect(sx - 0.42, f, 0.84, 0.06, `fill="#2E343D"`);                         // Montageplatte
    u += path([[sx - 0.3, f + 0.06], [sx + 0.3, f + 0.06], [sx + 0.22, f + 0.13], [sx - 0.22, f + 0.13]], `fill="#3C4350"`); // Lagerbock
    u += rect(sx - 0.55, f + 0.13, 1.1, 0.07, `rx="3" fill="#1F242B" stroke="#4A5361" stroke-width="2"`); // Platte
    u += rect(sx + 0.38, f + 0.07, 0.2, 0.03, `fill="#E0A31A"`);                   // Entriegelungsgriff
  }
  // Anhängekupplung (Bolzenkupplung) am hinteren Querträger
  if (o.hitch) {
    u += rect(L - 0.3, 0.42, 0.22, 0.3, `fill="#2E343D"`);
    u += path([[L - 0.08, 0.44], [L + 0.05, 0.4], [L + 0.05, 0.74], [L - 0.08, 0.7]], `fill="#3C4350" stroke="#596273" stroke-width="2"`); // Fangmaul
    u += rect(L - 0.03, 0.47, 0.04, 0.32, `fill="#9AA6B5"`);                        // Kupplungsbolzen
  }
  // Fahrerhaus
  u += path([[0.04, cabB], [0.04, f + 0.38], [0.1, f + 0.5], [0.2, cabT - 0.12], [0.34, cabT], [cabL, cabT], [cabL, cabB]], `fill="${cabCol}" stroke="#AEB6C2" stroke-width="2"`);
  // Radkasten-Ausschnitt vorn
  u += `<path d="M ${X(ax[0] - r - 0.07)} ${Y(cabB)} A ${S(r + 0.08)} ${S(r + 0.08)} 0 0 1 ${X(ax[0] + r + 0.07)} ${Y(cabB)} Z" fill="#11151B"/>`;
  // Windschutzscheibe (seitlich gesehen) und Seitenfenster
  u += path([[xf + 0.01, wB + 0.03], [0.22, cabT - 0.14], [0.3, cabT - 0.07], [xf + 0.15, wB + 0.03]], `fill="#26354A"`);
  u += path([[0.36, wB], [0.36, cabT - 0.15], [1.0, cabT - 0.15], [1.0, wB]], `fill="#2B3B52"`);
  u += line(0.38, cabT - 0.2, 0.98, wB + 0.04, `stroke="#3D5170" stroke-width="3"`);
  // Tür, Griff, Trittstufen
  const db = 2 * r + 0.1; // Türunterkante über dem Radkasten
  u += path([[0.3, db], [0.3, cabT - 0.1], [1.05, cabT - 0.1], [1.05, db]], `fill="none" stroke="#AEB6C2" stroke-width="2"`);
  u += rect(0.9, f + 0.38, 0.1, 0.035, `fill="#6E7888"`);
  u += rect(0.08, cabB - 0.02, 0.24, 0.04, `fill="#6E7888"`);
  u += rect(0.1, cabB - 0.2, 0.22, 0.04, `fill="#6E7888"`);
  // Stoßfänger, Scheinwerfer, Blinker
  u += rect(0.0, cabB - 0.06, 0.12, f + 0.06 - cabB + 0.06, `fill="#3A4250"`);
  u += rect(0.02, f - 0.02, 0.07, 0.09, `fill="#F4F1E1"`);
  u += rect(0.02, f + 0.08, 0.07, 0.04, `fill="#F2A33A"`);
  // Dachspoiler / Luftleitblech
  if (box !== 'none') u += path([[0.45, cabT], [cabL, cabT], [cabL, Math.min(f + boxH, cabT + 0.35)], [0.75, cabT + 0.08]], `fill="#D2D8E0" stroke="#AEB6C2" stroke-width="2"`);
  // Außenspiegel: Arm oben an der A-Säule nach vorn, Spiegelköpfe senkrecht vor dem Seitenfenster
  u += `<path d="M ${X(0.34)} ${Y(cabT - 0.06)} Q ${X(0.2)} ${Y(cabT + 0.04)} ${X(0.08)} ${Y(cabT - 0.08)}" fill="none" stroke="#2A303A" stroke-width="5"/>`;
  u += rect(0.02, cabT - 0.55, 0.1, 0.46, `rx="4" fill="#2A303A"`);
  u += rect(0.035, cabT - 0.53, 0.07, 0.42, `rx="3" fill="#5D7A9C"`);
  u += rect(0.025, cabT - 0.72, 0.09, 0.14, `rx="4" fill="#2A303A"`);
  // Räder
  let w = '';
  for (const a of ax) {
    w += circ(a, r, r, `fill="#252A33" stroke="#68717F" stroke-width="5"`);   // Reifen: heller Rand, damit er sich vom dunklen Grund abhebt
    w += circ(a, r, r - 0.06, `fill="none" stroke="#333944" stroke-width="5"`);
    w += circ(a, r, r * 0.58, `fill="#A7B1BE" stroke="#7D8898" stroke-width="2"`);
    w += circ(a, r, r * 0.22, `fill="#6E7888"`);
    for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; w += circ(a + r * 0.38 * Math.cos(t), r + r * 0.38 * Math.sin(t), 0.018, `fill="#5A6472"`); }
  }
  return { upper: u, wheels: w, W, H, pad, Ht };
}

// Rückansicht eines Koffer-Lkw: Türen, Verschlussstangen, Leuchten, Kennzeichen, Unterfahrschutz, Zwillingsräder
function lkwRear(o = {}) {
  const Wd = o.w ?? 2.6, f = o.floor ?? 0.75, boxH = o.boxH ?? 1.9, r = o.r ?? 0.3;
  const pad = 0.1, Ht = f + boxH + 0.1, W = Math.round((Wd + 2 * pad) * 100), H = Math.round(Ht * 100);
  const X = x => ((x + pad) * 100).toFixed(1), Y = y => ((Ht - y) * 100).toFixed(1), S = v => (v * 100).toFixed(1);
  const rect = (x, y, w, h, st) => `<rect x="${X(x)}" y="${Y(y + h)}" width="${S(w)}" height="${S(h)}" ${st}/>`;
  let s = '';
  // Zwillingsräder (unten sichtbar)
  for (const x of [0.12, 0.42, Wd - 0.72, Wd - 0.42]) s += rect(x, 0, 0.28, 2 * r, `rx="6" fill="#252A33" stroke="#68717F" stroke-width="4"`);
  s += rect(0.7, r - 0.04, Wd - 1.4, 0.08, `fill="#3A4250"`);
  // Kasten mit zwei Türen
  s += rect(0, f, Wd, boxH, `fill="#C9D0DA" stroke="#97A1AE" stroke-width="3"`);
  s += rect(Wd / 2 - 0.01, f + 0.05, 0.02, boxH - 0.1, `fill="#8C96A4"`);
  for (const x of [Wd * 0.22, Wd * 0.4, Wd * 0.6, Wd * 0.78]) {
    s += rect(x - 0.02, f + 0.08, 0.04, boxH - 0.16, `fill="#9AA4B1"`);          // Verschlussstangen
    s += rect(x - 0.06, f + boxH * 0.42, 0.12, 0.05, `fill="#6E7888"`);           // Hebel
  }
  for (const y of [f + 0.25, f + boxH / 2, f + boxH - 0.3]) for (const x of [0.02, Wd - 0.08]) s += rect(x, y, 0.06, 0.12, `fill="#6E7888"`); // Scharniere
  // Leuchtenträger, Leuchten, Kennzeichen
  s += rect(0.05, f - 0.28, Wd - 0.1, 0.22, `fill="#2A303A"`);
  for (const x of [0.12, Wd - 0.62]) { s += rect(x, f - 0.25, 0.5, 0.16, `rx="3" fill="#B0302A"`); s += rect(x + (x < 1 ? 0 : 0.36), f - 0.25, 0.14, 0.16, `fill="#E59A2E"`); s += rect(x + (x < 1 ? 0.36 : 0), f - 0.25, 0.14, 0.16, `fill="#EDEDED"`); }
  s += rect(Wd / 2 - 0.26, f - 0.25, 0.52, 0.12, `rx="2" fill="#F1F1EA" stroke="#2A303A" stroke-width="2"`);
  // Unterfahrschutz
  s += rect(0.2, 0.3, Wd - 0.4, 0.1, `fill="#9AA6B5"`);
  for (const x of [0.6, Wd - 0.66]) s += rect(x, 0.4, 0.06, f - 0.68, `fill="#5E6876"`);
  return { svg: s, W, H, pad, Ht };
}

// Sattelauflieger (Seitenansicht, Front links bei x = 0). Gibt Aufbau und Stützwinden getrennt zurück (für Morph).
function aufliegerSide(o = {}) {
  const L = o.L ?? 8.0, fl = o.floor ?? 0.98, boxH = o.boxH ?? 1.45, r = o.r ?? 0.3, kp = o.kp ?? 0.55, lg = o.lg ?? 1.75;
  const ax = o.axles ?? [L - 2.55, L - 1.8, L - 1.05], legs = o.legs ?? 0;
  const pad = 0.15, Ht = fl + boxH + 0.15;
  const W = Math.round((L + 2 * pad) * 100), H = Math.round(Ht * 100);
  const X = x => ((x + pad) * 100).toFixed(1), Y = y => ((Ht - y) * 100).toFixed(1), S = v => (v * 100).toFixed(1);
  const rect = (x, y, w, h, st) => `<rect x="${X(x)}" y="${Y(y + h)}" width="${S(w)}" height="${S(h)}" ${st}/>`;
  const circ = (x, y, rr, st) => `<circle cx="${X(x)}" cy="${Y(y)}" r="${S(rr)}" ${st}/>`;
  const col = o.col || '#C9D0DA';
  let u = '';
  u += rect(0, fl - 0.14, L, 0.14, `fill="#3A4250"`);                                   // Rahmen
  u += rect(kp - 0.05, fl - 0.24, 0.1, 0.1, `fill="#9AA6B5"`);                           // Königszapfen
  u += rect(0, fl, L, boxH, `fill="${col}" stroke="#97A1AE" stroke-width="2"`);          // Koffer
  for (let x = 0.45; x < L - 0.2; x += 0.45) u += `<line x1="${X(x)}" y1="${Y(fl + 0.04)}" x2="${X(x)}" y2="${Y(fl + boxH - 0.04)}" stroke="#B3BBC6" stroke-width="2"/>`;
  u += rect(0, fl + boxH - 0.07, L, 0.07, `fill="#A9B2BE"`);
  u += rect(L - 0.06, fl, 0.06, boxH, `fill="#9AA4B1"`);
  // seitlicher Unterfahrschutz, Kotflügel, Rückleuchte, Unterfahrschutz hinten
  for (const hh of [0.32, 0.5]) u += rect(lg + 0.35, hh, ax[0] - r - lg - 0.5, 0.045, `fill="#9AA6B5"`);
  u += rect(ax[0] - r - 0.08, r * 2 + 0.06, ax[ax.length - 1] - ax[0] + 2 * r + 0.16, 0.06, `fill="#2A303A"`);
  u += rect(L - 0.14, fl - 0.3, 0.1, 0.12, `fill="#C0392B"`);
  u += rect(L - 0.22, 0.3, 0.06, fl - 0.44, `fill="#5E6876"`);
  u += rect(L - 0.3, 0.26, 0.26, 0.09, `fill="#9AA6B5"`);
  // Räder
  let w = '';
  for (const a of ax) {
    w += circ(a, r, r, `fill="#252A33" stroke="#68717F" stroke-width="5"`);
    w += circ(a, r, r - 0.06, `fill="none" stroke="#333944" stroke-width="5"`);
    w += circ(a, r, r * 0.58, `fill="#A7B1BE" stroke="#7D8898" stroke-width="2"`);
    w += circ(a, r, r * 0.22, `fill="#6E7888"`);
  }
  // Stützwinden: legs = 1 ausgefahren (Fuß am Boden), 0 eingefahren
  const foot = 0.04 + (1 - legs) * 0.4;
  let g = rect(lg - 0.06, foot + 0.06, 0.12, fl - 0.14 - foot - 0.06, `fill="#E0A31A"`) + rect(lg - 0.13, foot, 0.26, 0.06, `fill="#8A6A14"`) + rect(lg + 0.07, fl - 0.5, 0.12, 0.05, `fill="#5E6876"`);
  return { body: u + w, legs: g, W, H, pad, Ht };
}

// Deichselanhänger (Drehschemel, Front links bei x = 0). Deichsel getrennt (Drehpunkt an der Vorderachse, für Morph).
function anhaengerSide(o = {}) {
  const L = o.L ?? 4.6, fl = o.floor ?? 0.88, boxH = o.boxH ?? 1.45, r = o.r ?? 0.3, ax = o.axles ?? [0.85, L - 0.85];
  const pad = 0.15, Ht = fl + boxH + 0.15;
  const W = Math.round((L + 2 * pad) * 100), H = Math.round(Ht * 100);
  const X = x => ((x + pad) * 100).toFixed(1), Y = y => ((Ht - y) * 100).toFixed(1), S = v => (v * 100).toFixed(1);
  const rect = (x, y, w, h, st) => `<rect x="${X(x)}" y="${Y(y + h)}" width="${S(w)}" height="${S(h)}" ${st}/>`;
  const circ = (x, y, rr, st) => `<circle cx="${X(x)}" cy="${Y(y)}" r="${S(rr)}" ${st}/>`;
  const col = o.col || '#C9D0DA';
  let u = '';
  u += rect(0.1, fl - 0.14, L - 0.2, 0.14, `fill="#3A4250"`);
  if (!o.zaa) u += rect(ax[0] - 0.42, fl - 0.24, 0.84, 0.1, `fill="#2E343D"`);         // Drehschemel
  if (o.box === 'pritsche') {                                                           // offene Pritsche mit Rungen
    u += rect(0, fl, L, boxH, `fill="#8C96A4" stroke="#6E7886" stroke-width="2"`);
    for (let x = 0.6; x < L - 0.2; x += 0.6) u += `<line x1="${X(x)}" y1="${Y(fl + 0.03)}" x2="${X(x)}" y2="${Y(fl + boxH + 0.12)}" stroke="#6E7886" stroke-width="4"/>`;
    u += rect(0, fl + boxH - 0.05, L, 0.05, `fill="#A9B2BE"`);
  } else {
    u += rect(0, fl, L, boxH, `fill="${col}" stroke="#97A1AE" stroke-width="2"`);
    for (let x = 0.45; x < L - 0.2; x += 0.45) u += `<line x1="${X(x)}" y1="${Y(fl + 0.04)}" x2="${X(x)}" y2="${Y(fl + boxH - 0.04)}" stroke="#B3BBC6" stroke-width="2"/>`;
    u += rect(0, fl + boxH - 0.07, L, 0.07, `fill="#A9B2BE"`);
    u += rect(L - 0.06, fl, 0.06, boxH, `fill="#9AA4B1"`);
  }
  u += rect(L - 0.14, fl - 0.3, 0.1, 0.12, `fill="#C0392B"`);
  u += rect(L - 0.22, 0.3, 0.06, fl - 0.44, `fill="#5E6876"`);
  for (const a of ax) u += rect(a - r - 0.08, r * 2 + 0.06, 2 * r + 0.16, 0.06, `fill="#2A303A"`);
  let w = '';
  for (const a of ax) {
    w += circ(a, r, r, `fill="#252A33" stroke="#68717F" stroke-width="5"`);
    w += circ(a, r, r - 0.06, `fill="none" stroke="#333944" stroke-width="5"`);
    w += circ(a, r, r * 0.58, `fill="#A7B1BE" stroke="#7D8898" stroke-width="2"`);
    w += circ(a, r, r * 0.22, `fill="#6E7888"`);
  }
  return { body: u + w, W, H, pad, Ht, pivot: o.zaa ? [0.05, fl - 0.2] : [ax[0], 0.55] };
}
module.exports = { lkwSide, lkwRear, aufliegerSide, anhaengerSide };
