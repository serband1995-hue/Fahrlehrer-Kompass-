// Abend 4 · C7: Kapitel 3 Fliehkraft und Kippen
const { C, sec, base, kick, title, point, CLICK, svgImg, chapter, motion, veh, sign, foot, arrow } = require('../gs');
const { lkwRear } = require('../lkw');

sec('c7f', 'C7  ·  FLIEHKRAFT UND KIPPEN', C.red, 'bg_red.jpg');

// Kurve (Draufsicht): Mittelpunkt und Radien in Zoll auf der Folie
const KX = 6.0, KY = 7.25, RI = 4.15, RM = 4.6, RO = 5.05, RW = 1.8;
const IX = 5.6, IY = 1.55, IW = 7.6, IH = 5.05; // Bildausschnitt der Straße
function kurveSvg() {
  const cx = (KX - IX) * 100, cy = (KY - IY) * 100;
  const arc = (r, a1, a2) => { const p = a => [cx + r * 100 * Math.cos(a * Math.PI / 180), cy - r * 100 * Math.sin(a * Math.PI / 180)]; const [x1, y1] = p(a1), [x2, y2] = p(a2); return `M ${x1} ${y1} A ${r * 100} ${r * 100} 0 0 1 ${x2} ${y2}`; };
  let s = '';
  s += `<path d="${arc(RM, 100, -10)}" fill="none" stroke="#3C4656" stroke-width="${RW * 100 + 24}"/>`;
  s += `<path d="${arc(RM, 100, -10)}" fill="none" stroke="#232A35" stroke-width="${RW * 100}"/>`;
  s += `<path d="${arc(RM, 100, -10)}" fill="none" stroke="#D9DEE6" stroke-width="5" stroke-dasharray="42 34"/>`;
  s += `<path d="${arc(RO + 0.32, 100, -10)}" fill="none" stroke="#D9DEE6" stroke-opacity="0.6" stroke-width="4"/>`;
  s += `<path d="${arc(RI - 0.32, 100, -10)}" fill="none" stroke="#D9DEE6" stroke-opacity="0.6" stroke-width="4"/>`;
  // Leitpfosten außen
  for (let a = 95; a > -5; a -= 12) { const r = (RO + 0.62) * 100; s += `<circle cx="${cx + r * Math.cos(a * Math.PI / 180)}" cy="${cy - r * Math.sin(a * Math.PI / 180)}" r="7" fill="#F3F5F8" stroke="#FF5C5C" stroke-width="4"/>`; }
  return s;
}
// Rückansicht mit aufgeschnittenem Aufbau: Ladung hoch (Kisten bis unters Dach) oder tief (Stahlplatten)
function heckSvg(hoch) {
  const r = lkwRear({});
  const X = x => ((x + r.pad) * 100).toFixed(1), Y = y => ((r.Ht - y) * 100).toFixed(1), S = v => (v * 100).toFixed(1);
  const rect = (x, y, w, h, st) => `<rect x="${X(x)}" y="${Y(y + h)}" width="${S(w)}" height="${S(h)}" ${st}/>`;
  const f = 0.75, Wd = 2.6, bh = 1.9;
  let s = r.svg + rect(0.08, f + 0.06, Wd - 0.16, bh - 0.12, `fill="#1A1F27" fill-opacity="0.92"`);
  if (hoch) {
    for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) s += rect(0.14 + col * 0.59, f + 0.1 + row * 0.345, 0.55, 0.32, `rx="3" fill="${(row + col) % 2 ? '#B9864A' : '#A87A42'}" stroke="#6E4E2A" stroke-width="2"`);
  } else {
    for (let k = 0; k < 4; k++) s += rect(0.2, f + 0.08 + k * 0.075, Wd - 0.4, 0.065, `fill="#8C96A4" stroke="#5E6876" stroke-width="2"`);
  }
  return { svg: s, W: r.W, H: r.H, pad: r.pad, Ht: r.Ht };
}

module.exports = async (deck) => {
  // ===== KAPITEL 3 =====
  await chapter(deck, 'c7f', { num: 3, ttl: 'Fliehkraft und Kippen', sub: 'Warum ein Lkw in der Kurve viel früher an seine Grenze kommt als ein Auto.', ico: 'LuRotateCw', notes:
    '▶ Sagen: „Kapitel 3: die Kurve. Hier passieren viele Lkw-Unfälle ohne fremde Beteiligung – der Lkw rutscht oder kippt.“\n🖱 Keine Klicks.\n➜ „Was drückt den Lkw in der Kurve nach außen?“' });

  // ===== FLIEHKRAFT: zwei Durchfahrten (fließend) =====
  const kurve = await svgImg(kurveSvg(), IW * 100, IH * 100, 1);
  const scene = (L, speed, mal) => async (s, { th, dr = 0 }) => {
    s.img(kurve, { x: IX, y: IY, w: IW, h: IH, name: '!!kurve' });
    await sign(s, '103_20', 11.75, 1.4, 1.0, 0.89, undefined, { name: '!!zkurve' });
    const R = RI + dr, a = th * Math.PI / 180;
    const cx = KX + R * Math.cos(a), cy = KY - R * Math.sin(a);
    // Fliehkraft-Pfeil nach außen
    const ux = Math.cos(a), uy = -Math.sin(a);
    arrow(s, cx + ux * 0.4, cy + uy * 0.4, cx + ux * (0.4 + L), cy + uy * (0.4 + L), { col: C.red, th: 0.12, head: 0.32, name: 'fk', glow: 6 });
    veh(s, 'truck.png', cx, cy, Math.round(180 - th - dr * 10), '!!tr', { scale: 0.55 });
    s.text(speed + ' km/h', { x: 5.75, y: 5.05, w: 2.6, h: 0.6, size: 30, bold: true, color: C.txt, name: '!!v' });
    s.text([{ text: 'Fliehkraft  ', options: { color: C.mut } }, { text: mal, options: { bold: true, color: C.red } }], { x: 5.75, y: 5.65, w: 2.8, h: 0.45, size: 20, name: '!!fkt' });
  };
  const Q = 'Ihr fahrt doppelt so schnell durch dieselbe Kurve. Wie viel stärker drückt es den Lkw nach außen?';
  const A = 'Viermal so stark. Die Fliehkraft wächst mit dem Quadrat der Geschwindigkeit.';
  const fr = (th, o = {}) => ({ t: { th, dr: o.dr || 0 }, ...o });
  await motion(deck, 'c7f', {
    kicker: 'Fliehkraft', ttl: 'Die Kurve drückt nach außen', dur: 650, holdDur: 800, question: Q, answer: A,
    legend: 'Draufsicht · schematisch · Pfeil = Fliehkraft',
    frames: [
      fr(88, { hold: true, cap: '30 km/h in eine Rechtskurve.', note: '▶ Sagen: „Ein Lkw fährt mit 30 km/h in eine Rechtskurve. Der rote Pfeil ist die Fliehkraft – sie drückt den Lkw nach außen.“\n❓ Frage auf der Folie stellen, Tipps sammeln („doppelt so stark?“).\n🖱 Klick: Der Lkw fährt durch die Kurve (läuft von selbst).\n➜ „Schauen wir zu.“' }),
      fr(78, { cap: 'Die Reifen halten dagegen – die Seitenführungskraft.' }), fr(68), fr(58),
      fr(48, { hold: true, cap: 'Kleiner Pfeil: Die Reifen halten den Lkw locker in der Spur.', note: '▶ „Die Fliehkraft will den Lkw geradeaus weiterschieben. Die Reifen halten dagegen – das nennt man Seitenführungskraft. Bei 30 km/h kein Problem.“\n🖱 Klick: weiter.\n➜ „Durch.“' }),
      fr(38), fr(28),
      fr(18, { hold: true, cap: 'Sauber durch die Kurve.', note: '▶ „Sauber durch. Jetzt dieselbe Kurve mit 60 km/h – doppelt so schnell.“\n🖱 Keine Animation mehr – nächster Klick: die zweite Durchfahrt.\n➜ „Doppelt so schnell.“' }),
    ],
    scene: scene(0.42, 30, '× 1'),
  });
  await motion(deck, 'c7f', {
    kicker: 'Fliehkraft', ttl: 'Die Kurve drückt nach außen', dur: 330, holdDur: 800, question: Q, answer: A,
    legend: 'Draufsicht · schematisch · Pfeil = Fliehkraft',
    frames: [
      fr(88, { hold: true, cap: 'Dieselbe Kurve mit 60 km/h – doppelt so schnell.', note: '▶ Sagen: „Jetzt mit 60 km/h. Schaut auf den Pfeil.“\n🖱 Klick: Die Durchfahrt beginnt (läuft von selbst – schneller als eben).\n➜ „Los.“' }),
      fr(78, { cap: 'Der Pfeil ist viermal so lang …' }), fr(68), fr(58, { dr: 0.08 }),
      fr(48, { dr: 0.2, hold: true, answer: true, cap: 'Viermal so viel Fliehkraft. Der Lkw drängt nach außen.', note: '▶ „Doppelt so schnell – viermal so viel Fliehkraft. Der Lkw drängt nach außen, Richtung Gegenverkehr.“\n✅ Physik: Fliehkraft = Masse · Geschwindigkeit² / Radius. (60/30)² = 4. Beispiel Radius 50 m: 30 km/h → etwa 1,4 m/s² Querbeschleunigung, 60 km/h → etwa 5,6 m/s² (≈ 0,57 g). Das ist weniger als die Haftung trocken (0,8), aber mehr als die Kippgrenze eines hoch beladenen Lkw (Beispiel: halbe Spurweite 1,0 m ÷ Schwerpunkthöhe 2,0 m = 0,5 g) – er würde hier kippen, bevor er rutscht.\n🖱 Klick: weiter.\n➜ „Und wenn die Reifen das nicht mehr halten?“' }),
      fr(38, { dr: 0.5, cap: 'Reicht die Haftung nicht, wird der Lkw aus der Kurve getragen.' }), fr(28, { dr: 0.8 }),
      fr(20, { dr: 1.2, hold: true, cap: 'Aus der Kurve getragen – oder, bei hohem Schwerpunkt, vorher umgekippt.', note: '▶ „Reicht die Haftung nicht, rutscht der Lkw nach außen – in den Gegenverkehr oder in den Graben. Ein hoch beladener Lkw kippt oft schon, bevor er rutscht. Das schauen wir uns gleich an.“\n💡 Merksatz: Vor der Kurve bremsen, in der Kurve nicht mehr stark bremsen, am Kurvenausgang wieder Gas.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Wovon hängt die Fliehkraft noch ab?“' }),
    ],
    scene: scene(1.68, 60, '× 4'),
  });

  // ===== DREI STELLSCHRAUBEN DER FLIEHKRAFT =====
  {
    const s = base(deck, 'c7f', { notes:
      '▶ Sagen: „Die Fliehkraft hängt von drei Dingen ab: Tempo, Masse und Kurvenradius.“\n' +
      '❓ „Was davon könnt ihr als Fahrer beeinflussen?“ – Antwort: vor allem das Tempo.\n' +
      '🖱 Klick 1: Tempo · Klick 2: Masse · Klick 3: Kurve.\n' +
      '✅ Physik: Fliehkraft = m · v² / r. Doppelte Geschwindigkeit → vierfache Kraft. Doppelte Masse → doppelte Kraft. Halber Radius (engere Kurve) → doppelte Kraft.\n' +
      '💡 Mit der Masse wächst auch die Haftung – ein voller Lkw rutscht deshalb kaum früher als ein leerer. Gefährlich ist beim vollen Lkw vor allem der höhere Schwerpunkt (Kippen) und der längere Bremsweg.\n' +
      '➜ „Und warum kippt ein Lkw, ein Auto aber nicht?“' });
    kick(s, 'Fliehkraft'); title(s, 'Wovon die Fliehkraft abhängt');
    await point(s, 0.7, 2.05, 11.93, 1.3, 'LuGauge', C.red, 'Doppeltes Tempo – vierfache Kraft.', 'Das Tempo zählt im Quadrat. Hier habt ihr den größten Hebel.', CLICK, { size: 20 });
    await point(s, 0.7, 3.5, 11.93, 1.3, 'LuWeight', C.or, 'Doppelte Masse – doppelte Kraft.', 'Mehr Masse drückt stärker nach außen. Die Reifen haften zwar auch besser – aber der Schwerpunkt liegt meist höher.', CLICK, { size: 20 });
    await point(s, 0.7, 4.95, 11.93, 1.3, 'LuCornerUpRight', C.bl, 'Halber Kurvenradius – doppelte Kraft.', 'Enge Kurven, Kreisverkehre und Abfahrten sind besonders gefährlich.', CLICK, { size: 20 });
    foot(s, 'Fliehkraft = Masse · Geschwindigkeit² ÷ Kurvenradius');
  }

  // ===== KIPPEN (fließend: zwei Lkw von hinten) =====
  {
    const k = 1.02, GY = 5.25;
    const hi = heckSvg(true), lo = heckSvg(false);
    const imgH = await svgImg(hi.svg, hi.W, hi.H, 2.5), imgL = await svgImg(lo.svg, lo.W, lo.H, 2.5);
    const w = hi.W / 100 * k, h = hi.H / 100 * k;
    const TR = [{ x: 6.35, img: imgH, cog: 1.75, nm: 'H', lab: 'Hoher Schwerpunkt', sub: 'Kisten bis unters Dach' }, { x: 10.1, img: imgL, cog: 0.95, nm: 'L', lab: 'Niedriger Schwerpunkt', sub: 'schwere Platten unten' }];
    const rotP = (px, py, vx, vy, ang) => { const p = ang * Math.PI / 180, c = Math.cos(p), s = Math.sin(p); return [px + vx * c - vy * s, py + vx * s + vy * c]; };
    const fr = (f, tilt, o = {}) => ({ t: { f, tilt }, ...o });
    await motion(deck, 'c7f', {
      kicker: 'Kippen', ttl: 'Hoch oder tief geladen', dur: 480, holdDur: 800,
      question: 'Gleiche Kurve, gleiches Tempo: Welcher Lkw kippt zuerst?',
      answer: 'Der mit dem hohen Schwerpunkt. Seine Kraftlinie zeigt schon früh über das äußere Rad hinaus.',
      legend: 'Ansicht von hinten in einer Rechtskurve · schematisch · Punkt = Schwerpunkt',
      frames: [
        fr(0, 0, { hold: true, cap: 'Zwei gleiche Lkw, gleich schwer. Links Kisten bis unters Dach, rechts schwere Platten unten.', note: '▶ Sagen: „Zwei Lkw, von hinten gesehen, gleich schwer. Links ist die Ladung bis unters Dach gestapelt, rechts liegen schwere Stahlplatten unten. Der Punkt ist jeweils der Schwerpunkt.“\n❓ Frage auf der Folie: „Welcher kippt zuerst?“\n🖱 Klick: Beide fahren in die Rechtskurve (läuft von selbst).\n➜ „Jetzt in die Kurve.“' }),
        fr(0.2, 0, { cap: 'Rechtskurve: Die Fliehkraft drückt beide nach links, nach außen.' }), fr(0.4, 0),
        fr(0.55, 0, { hold: true, cap: 'Die schwarze Linie zeigt, wohin die Kraft drückt. Solange sie zwischen den Rädern landet, bleibt der Lkw stehen.', note: '▶ „Die Fliehkraft drückt zur Seite, das Gewicht nach unten. Zusammen ergibt das die schräge Linie. Solange sie zwischen den Rädern auf die Straße trifft, bleibt der Lkw auf allen Rädern.“\n🖱 Klick: Etwas schneller (läuft von selbst).\n➜ „Jetzt etwas schneller.“' }),
        fr(0.68, 0, { cap: 'Links trifft die Linie das äußere Rad – die Kippgrenze.' }), fr(0.75, 3), fr(0.75, 8), fr(0.75, 13),
        fr(0.75, 18, { hold: true, answer: true, cap: 'Der hohe Lkw kippt. Der niedrige steht noch sicher – bei gleichem Tempo.', note: '▶ „Beim hohen Lkw zeigt die Linie über das Rad hinaus – er kippt. Der niedrige steht noch sicher, obwohl beide genau gleich schnell sind.“\n✅ Physik: Ein Fahrzeug kippt, wenn die Querbeschleunigung im Verhältnis zur Erdbeschleunigung größer wird als halbe Spurweite ÷ Schwerpunkthöhe. Hoher Schwerpunkt → kleinere Kippgrenze. Lehrbuchwissen; echte Lkw kippen wegen Federung und Reifen noch früher als in diesem einfachen Modell.\n💡 Gefährlich: schwere Ladung oben, hoch gestapelte Ladung, hängende Lasten (z. B. Fleischhälften), Flüssigkeiten in teilgefüllten Tanks.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Was heißt das für die Fahrpraxis?“' }),
      ],
      scene: async (s, { f, tilt }) => {
        s.rrect(5.6, GY, 7.45, 0.14, { fill: '3C4656', rr: 0.5, name: '!!boden' });
        for (const T of TR) {
          const ang = T.nm === 'H' ? -tilt : 0;
          const X0 = T.x, Y0 = GY - h;
          const P = [X0 + (0.12 + hi.pad) * k, GY];
          const c0 = [X0 + w / 2 - P[0], Y0 + h / 2 - P[1]];
          const [cx, cy] = rotP(P[0], P[1], c0[0], c0[1], ang);
          s.img(T.img, { x: cx - w / 2, y: cy - h / 2, w, h, rotate: ang, name: '!!heck' + T.nm });
          // Schwerpunkt
          const g0 = [X0 + (1.3 + hi.pad) * k - P[0], GY - T.cog * k - P[1]];
          const [gx, gy] = rotP(P[0], P[1], g0[0], g0[1], ang);
          // Kraftlinie zum Boden: trifft bei gx - f * (Höhe über Boden)
          const hh = GY - gy, hx = gx - f * hh;
          const L = Math.hypot(gx - hx, hh), a = Math.atan2(hh, hx - gx) * 180 / Math.PI;
          const out = hx < P[0] - 0.01;
          s.rrect((gx + hx) / 2 - L / 2, (gy + GY) / 2 - 0.03, L, 0.06, { fill: out ? C.red : C.dark, line: out ? C.red : C.txt, lw: 1, rr: 0.5, rotate: Math.round(a * 10) / 10, name: '!!lin' + T.nm });
          s.oval(hx - 0.1, GY - 0.1, 0.2, 0.2, { fill: out ? C.red : C.gr, name: '!!hit' + T.nm });
          // Fliehkraft-Pfeil nach links
          arrow(s, gx - 0.12, gy, gx - 0.12 - f * 1.3, gy, { col: C.red, th: 0.1, head: 0.26, name: 'fk' + T.nm, hide: !f });
          s.oval(gx - 0.16, gy - 0.16, 0.32, 0.32, { fill: C.am, line: C.dark, lw: 2, glow: 8, glowColor: C.am, name: '!!sp' + T.nm });
          // Kipppunkt
          s.oval(P[0] - 0.07, GY - 0.07, 0.14, 0.14, { fill: C.txt, name: '!!kp' + T.nm });
          s.text(T.lab, { x: T.x - 0.2, y: GY + 0.25, w: w + 0.4, h: 0.35, size: 15, bold: true, color: C.txt, align: 'center', name: '!!lab' + T.nm });
          s.text(T.sub, { x: T.x - 0.2, y: GY + 0.6, w: w + 0.4, h: 0.3, size: 12, color: C.mut, align: 'center', name: '!!sub' + T.nm });
        }
        s.text(tilt > 10 ? 'KIPPT!' : '', { x: 8.6, y: 1.6, w: 2.0, h: 0.6, size: 30, bold: true, color: C.red, name: '!!kippt' });
      },
    });
  }

  // ===== FAHRPRAXIS KURVE =====
  {
    const s = base(deck, 'c7f', { notes:
      '▶ Sagen: „Was heißt das für euch am Steuer?“\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Lehrbuchwissen. Kreisverkehre und Autobahnabfahrten mit engem Radius sind typische Kipp-Stellen. Plötzliche Ausweichmanöver bringen den Lkw ins Schaukeln – erst nach links, dann nach rechts: Beim Zurücklenken kippt er besonders leicht.\n' +
      '💡 Flüssigkeiten in teilgefüllten Tanks schwappen nach außen und verstärken das Kippen.\n' +
      '➜ „Kapitel 4: Wind und Wasser.“' });
    kick(s, 'Fliehkraft und Kippen'); title(s, 'So bleibt der Lkw auf den Rädern');
    await point(s, 0.7, 2.05, 5.85, 2.0, 'LuArrowDownToLine', C.red, 'Vor der Kurve bremsen', 'nicht in der Kurve. Am Kurvenausgang wieder Gas geben.', CLICK, { br: true, size: 18 });
    await point(s, 6.78, 2.05, 5.85, 2.0, 'LuRefreshCw', C.or, 'Kreisverkehr und Abfahrt', 'langsam: enger Radius, große Fliehkraft.', CLICK, { br: true, size: 18 });
    await point(s, 0.7, 4.25, 5.85, 2.0, 'LuLayers', C.am, 'Hohe Ladung = langsamer', 'schwere Teile immer nach unten laden.', CLICK, { br: true, size: 18 });
    await point(s, 6.78, 4.25, 5.85, 2.0, 'LuMoveHorizontal', C.bl, 'Ruckartiges Ausweichen vermeiden', 'Der Lkw schaukelt sich auf – beim Zurücklenken kippt er leicht.', CLICK, { br: true, size: 18 });
  }
};
