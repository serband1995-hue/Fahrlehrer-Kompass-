// Abend 5 · C9: Kapitel 1 Warum sichern? (Vollbremsung, Kräfte, Reibung)
const { C, sec, base, kick, title, point, CLICK, chapter, motion, steps, lkw, veh, ask, arrow, foot } = require('../gs');

sec('c9k', 'C9  ·  WARUM SICHERN?', C.red, 'bg_red.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'c9k', { num: 1, ttl: 'Warum sichern?', sub: 'Die Ladung will weiter, wenn der Lkw bremst – und nach außen, wenn er lenkt.', ico: 'LuPackageOpen', notes:
    '▶ Sagen: „Kapitel 1: Warum muss Ladung überhaupt gesichert werden? Sie ist doch schwer genug, oder?“\n🖱 Keine Klicks.\n➜ „Schauen wir eine Vollbremsung an.“' });

  // ===== VOLLBREMSUNG: ungesichert / gesichert (fließend) =====
  const L = 5.6, k = 0.95, X = 6.35, GY = 4.25;
  let D = 0;
  const scene = (secured) => async (s, t, idx) => {
    const { v, brake = 0, off = 0, hit = 0 } = t;
    if (idx === 0) D = 0;
    D += v * 0.02;
    // Straße
    s.rrect(5.65, GY, 7.4, 0.5, { fill: C.road, rr: 0.1, name: '!!road' });
    for (let j = -260; j < 12; j++) { const x = 5.6 + j * 0.9 + D; if (x > 5.7 && x < 12.6) s.rrect(x, GY + 0.22, 0.45, 0.05, { fill: C.mark, rr: 0.5, name: '!!d' + j }); }
    const r = await lkw(s, { L, axles: [0.78, 4.05] }, { x: X, gy: GY + 0.05, k, name: '!!lkwV' });
    // aufgeschnittener Aufbau
    const [bx0, by0] = r.pt(1.6, 0.75 + 1.43), [bx1, by1] = r.pt(L - 0.12, 0.83);
    s.rect(bx0, by0, bx1 - bx0, by1 - by0, { fill: '1A1F27', ft: 10, name: '!!innen' });
    // Stirnwand
    s.rect(bx0 - 0.07, by0, 0.09, by1 - by0, { fill: hit ? C.red : '9AA4B1', glow: hit ? 10 : undefined, glowColor: C.red, name: '!!stirn' });
    // Ladung: zwei Paletten mit Kartons
    const SW = 0.92, gap = secured ? 0.02 : 0.95, step = secured ? SW - 0.06 : SW + 0.04;   // gesichert: Kartons stehen lückenlos aneinander
    for (let q = 0; q < 2; q++) {
      const x0 = bx0 + gap + q * step + off;
      s.rect(x0, by1 - 0.13, SW, 0.13, { fill: '9A6B3A', name: '!!pal' + q });
      for (let b = 0; b < 3; b++) s.rrect(x0 + 0.03, by1 - 0.13 - (b + 1) * 0.36 + 0.02, SW - 0.06, 0.34, { fill: b % 2 ? 'C69A5B' : 'B9864A', line: '6E4E2A', lw: 1, rr: 0.04, name: '!!box' + q + b });
      // Zurrgurte (nur gesichert)
      s.rect(x0 + SW / 2 - 0.035, by1 - 0.13 - 3 * 0.36 + 0.02, 0.07, 3 * 0.36 + 0.11, { fill: C.or, ft: secured ? 0 : 100, name: '!!gurt' + q });
    }
    // Kraftpfeil nach vorn (Fahrtrichtung links)
    const cy = by0 - 0.32, cx = bx0 + gap + SW + 0.02 + off;
    arrow(s, cx + 0.6, cy, cx - 0.9, cy, { col: C.red, th: 0.1, head: 0.28, name: 'kraft', hide: !brake, glow: 6 });
    s.text(brake ? '80 % des Gewichts' : '', { x: cx + 0.7, y: cy - 0.2, w: 2.4, h: 0.4, size: 16, bold: true, color: C.red, name: '!!kraftt' });
    // Anzeige
    s.text(String(v), { x: 10.6, y: 4.95, w: 1.6, h: 0.8, size: 46, bold: true, color: C.txt, align: 'right', name: '!!kmh' });
    s.text('km/h', { x: 12.25, y: 5.3, w: 0.8, h: 0.4, size: 15, color: C.mut, name: '!!kmhl' });
    s.text(brake ? 'VOLLBREMSUNG' : '', { x: 5.75, y: 5.98, w: 3.6, h: 0.5, size: 20, bold: true, color: C.white, fill: brake ? C.red : undefined, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!vb' });
    s.text(secured ? 'gesichert: Formschluss + Gurte' : 'ungesichert', { x: 5.75, y: 5.05, w: 5, h: 0.4, size: 18, bold: true, color: secured ? C.gr : C.red, name: '!!st' });
    s.text(hit ? 'Aufprall auf die Stirnwand!' : '', { x: 5.75, y: 5.5, w: 6, h: 0.4, size: 16, bold: true, color: C.red, name: '!!hit' });
  };
  const fr = (v, o = {}) => ({ ...o, t: { v, ...(o.t || {}) } });
  await motion(deck, 'c9k', {
    kicker: 'Vollbremsung', ttl: 'Die Ladung will weiter', dur: 420, holdDur: 800,
    question: 'Vollbremsung: Mit wie viel Kraft schiebt eine Ladung von 10\u00A0Tonnen nach vorn?',
    answer: 'Mit bis zu 8.000 daN – so viel, wie 8 Tonnen wiegen: rund 80 % ihres Gewichts. Egal ob aus 30 oder 80 km/h.',
    legend: 'Blick in den Aufbau · schematisch',
    frames: [
      fr(80, { hold: true, cap: 'Zwei Paletten stehen mitten im Aufbau – ohne Gurte. „Die sind doch schwer genug …“', note: '▶ Sagen: „Zwei schwere Paletten, einfach draufgestellt. Viele denken: Die bewegen sich schon nicht, die sind ja schwer.“\n❓ Frage auf der Folie stellen, schätzen lassen.\n🖱 Klick: Die Fahrt läuft (von selbst bis zur Bremsung).\n➜ „Und jetzt: Vollbremsung!“' }),
      fr(80), fr(80),
      fr(60, { t: { brake: 1, off: -0.12 }, cap: 'Vollbremsung! Der Lkw wird langsamer – die Ladung will mit 80 km/h weiter.' }),
      fr(40, { t: { brake: 1, off: -0.4 } }), fr(20, { t: { brake: 1, off: -0.72 } }),
      fr(0, { t: { brake: 1, off: -0.92, hit: 1 }, hold: true, answer: true, cap: 'Die Ladung schlägt mit voller Wucht gegen die Stirnwand – oder durch sie hindurch ins Fahrerhaus.', note: '▶ „Die Ladung rutscht nach vorn und knallt gegen die Stirnwand. Beim Bremsen drückt sie mit bis zu 80 Prozent ihres Gewichts nach vorn – eine 10-Tonnen-Ladung also mit rund 8.000 daN, so viel, wie 8 Tonnen wiegen. Das hängt von der Bremsung ab, nicht vom Tempo: Aus 30 km/h ist die Kraft genauso groß, sie dauert nur kürzer.“\n✅ DIN EN 12195-1 / VDI 2700: Bemessung der Ladungssicherung im Straßenverkehr nach vorn mit 0,8 g (80 % der Gewichtskraft). § 22 Abs. 1 StVO: Ladung muss selbst bei Vollbremsung und plötzlicher Ausweichbewegung gesichert sein.\n🖱 Keine Animation mehr – nächster Klick: dieselbe Bremsung mit gesicherter Ladung.\n➜ „Jetzt richtig gesichert.“' }),
    ],
    scene: scene(false),
  });
  await motion(deck, 'c9k', {
    kicker: 'Vollbremsung', ttl: 'Die Ladung will weiter', dur: 420, holdDur: 800,
    question: 'Was hilft dagegen?',
    answer: 'Ladung lückenlos an die Stirnwand (Formschluss) und mit genug Gurten niederzurren – dann bleibt sie stehen.',
    legend: 'Blick in den Aufbau · schematisch',
    frames: [
      fr(80, { hold: true, cap: 'Dieselbe Ladung – jetzt direkt an der Stirnwand und mit Gurten niedergezurrt.', note: '▶ Sagen: „Jetzt dieselbe Ladung – aber direkt an die Stirnwand gestellt und mit Gurten niedergezurrt.“\n❓ „Was passiert jetzt bei der Vollbremsung?“\n🖱 Klick: Die Fahrt läuft (von selbst bis zur Bremsung).\n➜ „Vollbremsung.“' }),
      fr(80), fr(80),
      fr(60, { t: { brake: 1 }, cap: 'Vollbremsung – die Kraft ist genauso groß …' }), fr(40, { t: { brake: 1 } }), fr(20, { t: { brake: 1 } }),
      fr(0, { t: { brake: 1 }, hold: true, answer: true, cap: '… aber Stirnwand und Gurte halten – weil genug Gurte gespannt sind. Die Ladung bleibt stehen.', note: '▶ „Die Kraft ist genauso groß. Aber die Ladung steht schon an der Stirnwand – sie kann keinen Schwung holen. Und die Gurte pressen sie auf die Ladefläche. Wichtig: Es müssen genug Gurte sein – wie viele, das wird berechnet.“\n✅ Formschluss (lückenlos an Stirnwand und Seitenwände) plus Kraftschluss (Niederzurren) – die üblichen Methoden nach VDI 2700. Die Stirnwand allein hält nur einen Teil der Nutzlast: Bei 10 t drückt die Ladung mit bis zu 8.000 daN nach vorn, eine normale Stirnwand (Code L) hält höchstens 5.000 daN (BG BAU 2021, Tab. 1 und Tab. 3; Kapitel 3). Den Rest müssen genug Gurte schaffen – Zahl der Gurte nach DIN EN 12195-1 berechnen.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und nicht nur nach vorn wirken Kräfte.“' }),
    ],
    scene: scene(true),
  });

  // ===== KRÄFTE IN ALLE RICHTUNGEN (Morph, Draufsicht) =====
  {
    const CX = 9.3, CY = 4.05;
    const DIRS = [['vorn', 0.8, -1, 0], ['seitlich', 0.5, 0, 1], ['hinten', 0.5, 1, 0]];
    await steps(deck, 'c9k', {
      kicker: 'Kräfte auf die Ladung', ttl: 'In alle Richtungen',
      list: ['Bremsen: nach vorn', 'Kurve: zur Seite', 'Anfahren: nach hinten'],
      ask: { q: 'In welche Richtung drückt die Ladung am stärksten?', a: 'Nach vorn beim Bremsen – bis 80 % ihres Gewichts. Zur Seite und nach hinten bis 50 %.', at: 2 },
      caps: [
        'Beim Bremsen schiebt die Ladung nach vorn – mit bis zu 80 % ihres Gewichts.',
        'In der Kurve und beim Ausweichen drückt sie zur Seite – bis zu 50 %.',
        'Beim Anfahren und am Berg drückt sie nach hinten – bis zu 50 %.',
      ],
      notes: [
        '▶ Sagen: „Wir schauen von oben auf den Lkw. Beim Bremsen drückt die Ladung nach vorn – bis zu 80 Prozent ihres Gewichts.“\n✅ DIN EN 12195-1: Beschleunigungsbeiwerte Straßenverkehr – vorn 0,8 g.\n➜ „In der Kurve?“',
        '▶ „In der Kurve und beim Ausweichen drückt sie zur Seite – bis zu 50 Prozent.“\n✅ DIN EN 12195-1:2011 (BG BAU „Ladungssicherung“ 2021, Tab. 1): seitlich 0,5 g, kippgefährdet 0,6 g. Ältere Rechnung nach VDI 2700: 0,7 g (IHK Stuttgart 2016, S. 17).\n➜ „Und nach hinten?“',
        '▶ „Beim Anfahren, beim Schalten und am Berg drückt sie nach hinten – bis zu 50 Prozent.“\n❓ Frage auf der Folie auflösen.\n✅ DIN EN 12195-1: nach hinten 0,5 g, bei kippgefährdeter Ladung 0,6 g (BG BAU 2021, Tab. 1).\n💡 Die Ladung muss in ALLE Richtungen gesichert sein – nicht nur nach vorn.\n➜ „Hält nicht schon die Reibung?“',
      ],
      legend: 'Draufsicht · Pfeillänge = Anteil der Gewichtskraft (DIN EN 12195-1)',
      scene: async (s, i) => {
        veh(s, 'truck.png', CX, CY, 0, '!!tr', { scale: 1.45 });
        s.rrect(CX - 0.38, CY - 0.6, 0.76, 1.6, { fill: 'B9864A', line: '6E4E2A', lw: 1.5, rr: 0.05, name: '!!ladung' });
        DIRS.forEach(([lab, f, dy, dx], q) => {
          const on = q === i, len = f * 2.2;
          const sx = CX + dx * 0.45, sy = CY + 0.2 + dy * 0.85;
          arrow(s, sx, sy, sx + dx * len, sy + dy * len, { col: on ? C.red : '5A6576', th: on ? 0.14 : 0.08, head: on ? 0.36 : 0.24, name: 'a' + q, glow: on ? 6 : undefined });
          const tx = sx + dx * (len + 0.25), ty = sy + dy * (len + 0.3);
          s.text((f * 100) + ' %', { x: tx - (dx ? 0 : 0.6), y: ty - 0.25, w: 1.2, h: 0.5, size: on ? 24 : 16, bold: true, color: on ? C.red : C.mut, align: dx ? 'left' : 'center', name: '!!t' + q });
        });
        s.text('Fahrtrichtung ↑', { x: 5.75, y: 1.6, w: 3, h: 0.35, size: 14, color: C.dim, name: '!!fr' });
      },
    });
  }

  // ===== REIBUNG =====
  await ask(deck, 'c9k', {
    kicker: 'Reibung', q: '„Die Ladung ist doch schwer – die rutscht schon nicht.“ Stimmt das?', ico: 'LuWeight', qsize: 32,
    answers: [
      ['LuX', 'Nein!', 'Schwere Ladung hält zwar mit mehr Reibung – aber sie drückt beim Bremsen auch mit mehr Kraft nach vorn.', C.red],
      ['LuLayers', 'Reibung hält nur einen Teil', 'Holz auf Holz: trocken nur 20–50 % des Gewichts, fettig noch viel weniger. Gebraucht werden 80 %.', C.or],
      ['LuSquareStack', 'Antirutschmatten helfen', 'Sie erhöhen die Reibung stark – ersetzen aber keine Gurte und keinen Formschluss.', C.gr],
    ],
    notes:
      '▶ Sagen: „Viele glauben: Schweres rutscht nicht. Falsch! Je schwerer die Ladung, desto größer auch die Kraft, mit der sie beim Bremsen nach vorn drückt.“\n' +
      '❓ Erst sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–3: je eine Karte.\n' +
      '✅ Reibkraft und Massenkraft wachsen beide mit dem Gewicht – das Gewicht allein sichert nicht (Prüfungsfrage 2.2.22-117: „Ladung mit hohem Gewicht muss nicht gesichert werden“ ist falsch). Reibbeiwerte (BG BAU „Ladungssicherung“ 2021, nach VDI 2700 Blatt 14): Holz/Holz trocken 0,2–0,5, nass 0,2–0,25, fettig 0,05–0,15; Metall/Holz 0,2–0,5; Antirutschmatte 0,6.\n' +
      '➜ „Und wer ist dafür verantwortlich?“',
  });

  // ===== VERANTWORTUNG UND BUSSGELD =====
  await ask(deck, 'c9k', {
    kicker: 'Verantwortung', q: 'Wer ist verantwortlich – und was kostet schlecht gesicherte Ladung?', ico: 'LuScale', qsize: 30,
    answers: [
      ['LuTruck', 'Fahrer', 'Ladung nicht verkehrssicher (Lkw): 60 € und 1 Punkt · mit Gefährdung 75 € und 1 Punkt.', C.red, 17],
      ['LuForklift', 'Verlader', 'Muss die Ladung beförderungssicher laden, stauen und befestigen.', C.or, 17],
      ['LuBuilding2', 'Halter', 'Lässt er den Lkw trotzdem fahren und leidet die Sicherheit wesentlich: 270 € und 1 Punkt.', C.or, 17],
      ['LuTriangleAlert', 'Unterwegs ein wesentlicher Mangel?', 'Lässt er sich nicht gleich beheben: auf dem kürzesten Weg aus dem Verkehr.', C.gr, 17],
    ],
    notes:
      '▶ Sagen: „Wer ist verantwortlich, wenn die Ladung nicht hält? Nicht nur einer!“\n' +
      '❓ Erst sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je eine Karte.\n' +
      '✅ § 22 Abs. 1 und § 23 Abs. 1 StVO (Fahrer); BKat Nr. 102.1: Lkw, Bus oder Anhänger 60 € · Nr. 102.1.1 mit Gefährdung 75 € (je 1 Punkt, FeV Anlage 13 Nr. 3.2.14). § 412 Abs. 1 HGB: Der Absender hat das Gut beförderungssicher zu verladen. § 31 Abs. 2 StVZO + BKat Nr. 189.3.1: Halter 270 € und 1 Punkt – nur wenn die Verkehrssicherheit durch die Ladung wesentlich litt (FeV Anlage 13 Nr. 3.5.2). § 23 Abs. 2 StVO: Mangel nicht alsbald zu beheben → auf dem kürzesten Weg aus dem Verkehr. Prüfungsfragen 2.2.22-221 (Fahrer und Verlader) und 2.2.22-214 (Fahrer und Halter).\n' +
      '💡 Die Werte gelten für Lkw. Beim Pkw ist es weniger (35 €).\n' +
      '➜ „Kapitel 2: Wie sichert man richtig?“',
  });
};
