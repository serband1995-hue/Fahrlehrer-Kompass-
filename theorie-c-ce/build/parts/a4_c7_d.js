// Abend 4 · C7: Kapitel 4 Wind und Wasser, Kapitel 5 Leer oder beladen, Abschluss C7, Pause
const { C, sec, base, kick, title, point, CLICK, svgImg, chapter, motion, steps, veh, lkw, quiz, write, takeaway, arrow } = require('../gs');
const { icon } = require('../lib');
const { wheelSvg } = require('./a4_c7_a');

sec('c7l', 'C7  ·  WIND UND WASSER', C.pu, 'bg_pu.jpg');
sec('c7b', 'C7  ·  LEER ODER BELADEN', 'C9A227', 'bg_am.jpg');
sec('c7e', 'C7  ·  ABSCHLUSS', C.bl, 'bg_blue.jpg');

module.exports = async (deck) => {
  // ===== KAPITEL 4 =====
  await chapter(deck, 'c7l', { num: 4, ttl: 'Wind und Wasser', sub: 'Ein hoher Aufbau ist ein Segel – und Wasser kann die Reifen von der Straße heben.', ico: 'LuWind', notes:
    '▶ Sagen: „Kapitel 4: zwei Kräfte von außen – Wind und Wasser.“\n🖱 Keine Klicks.\n➜ „Zuerst der Seitenwind.“' });

  // ===== SEITENWIND (fließend: Fahrt über eine Brücke) =====
  {
    const RY = 2.95, RH = 1.8, LY = RY + RH * 0.75; // rechter Fahrstreifen (Fahrt nach rechts)
    const BX1 = 8.5, BX2 = 10.5;
    const fr = (x, dr, rot, gust, o = {}) => ({ t: { x, dr, rot, gust }, ...o });
    const baum = (s, cx, cy, r, nm) => s.oval(cx - r, cy - r, 2 * r, 2 * r, { fill: (Math.round(cx * 7 + cy * 3) % 2) ? '1E4A33' : '24573C', line: '163826', lw: 1, name: nm });
    await motion(deck, 'c7l', {
      kicker: 'Seitenwind', ttl: 'Die Böe auf der Brücke', dur: 520, holdDur: 800,
      question: 'Wo erwischt euch Seitenwind besonders – und was tut ihr dann?',
      answer: 'Auf Brücken, an Waldschneisen, beim Überholen von Lastzügen. Langsamer fahren und gegenlenken.',
      legend: 'Draufsicht · schematisch · Pfeile = Windböe',
      frames: [
        fr(6.4, 0, 90, 0, { hold: true, cap: 'Ein leerer Koffer-Lkw auf der Landstraße. Links und rechts Wald – der schützt vor Wind.', note: '▶ Sagen: „Ein leerer Lkw mit hohem Kofferaufbau. Der Aufbau ist wie ein Segel – fast 20 Quadratmeter Seitenfläche. Links und rechts Wald, der bremst den Wind.“\n❓ Frage auf der Folie stellen.\n🖱 Klick: Der Lkw fährt los (läuft von selbst).\n➜ „Gleich kommt eine Brücke.“' }),
        fr(7.1, 0, 90, 0), fr(7.8, 0, 90, 0),
        fr(8.5, 0, 90, 1, { cap: 'Auf der Brücke fehlt der Schutz – eine Böe trifft den Lkw von links.' }),
        fr(9.0, 0.12, 96, 1),
        fr(9.45, 0.22, 98, 1, { hold: true, cap: 'Die Böe drückt den Lkw nach rechts, Richtung Geländer.', note: '▶ „Auf der Brücke ist kein Wald mehr. Die Böe trifft den Lkw voll und schiebt ihn zur Seite.“\n🖱 Klick: Der Fahrer reagiert (läuft von selbst).\n➜ „Was macht der Fahrer?“' }),
        fr(9.95, 0.14, 85, 1, { cap: 'Gegenlenken – ruhig, nicht hektisch – und Gas weg.' }),
        fr(10.6, 0.05, 88, 0), fr(11.3, 0, 90, 0),
        fr(12.0, 0, 90, 0, { hold: true, answer: true, cap: 'Geschafft. Bei Sturm gilt: langsamer fahren, beide Hände ans Lenkrad, auf Böen gefasst sein.', note: '▶ „Gefährlich sind Stellen, an denen der Schutz plötzlich wegfällt: Brücken, Waldschneisen, Lücken in Lärmschutzwänden, Tunnelausfahrten – und beim Überholen, wenn ihr aus dem Windschatten des anderen Lkw kommt.“\n✅ Prüfungsfragen 2.1.03-018 (gegenlenken, Geschwindigkeit herabsetzen – nicht stark beschleunigen) und 2.1.03-020 (Überholen von Lastzügen, Brücken, Waldschneisen). 2.1.07-209: Windböen können ein Fahrzeug auch auf trockener, gerader Straße plötzlich ausbrechen lassen.\n💡 Leerer Lkw mit hoher Plane oder Koffer ist am empfindlichsten. Bei Sturmwarnung Fahrt verschieben oder Strecke ändern.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und das zweite Problem: Wasser auf der Straße.“' }),
      ],
      scene: async (s, { x, dr, rot, gust }) => {
        // Tal unter der Brücke
        s.rrect(BX1, 1.5, BX2 - BX1, 5.05, { fill: '1B2A3D', rr: 0.08, name: '!!tal' });
        // Wald links und rechts der Brücke
        let n = 0;
        for (const [x0, x1] of [[5.7, BX1 - 0.1], [BX2 + 0.1, 13.05]]) for (const [y0, y1] of [[1.55, RY - 0.2], [RY + RH + 0.2, 6.5]]) {
          for (let yy = y0 + 0.28; yy < y1 - 0.2; yy += 0.42) for (let xx = x0 + 0.28 + ((yy * 10) % 3) * 0.08; xx < x1 - 0.2; xx += 0.46) baum(s, xx, yy, 0.25, '!!baum' + (n++));
        }
        // Straße mit Mittellinie, Brückengeländer
        s.rect(5.65, RY, 7.4, RH, { fill: C.road, name: '!!road' });
        for (let k = 0; k < 9; k++) s.rrect(5.85 + k * 0.82, RY + RH / 2 - 0.025, 0.45, 0.05, { fill: C.mark, rr: 0.5, name: '!!rm' + k });
        for (const yy of [RY - 0.12, RY + RH + 0.04]) s.rrect(BX1, yy, BX2 - BX1, 0.08, { fill: '9AA6B5', rr: 0.5, name: '!!gel' + (yy < RY ? 'o' : 'u') });
        s.img(await icon('LuWind', C.bl), { x: BX1 + 0.65, y: 1.6, w: 0.7, h: 0.7, name: '!!wico' });
        // Böen-Pfeile von oben
        for (let k = 0; k < 3; k++) arrow(s, BX1 + 0.45 + k * 0.55, 2.0 + (k % 2) * 0.15, BX1 + 0.45 + k * 0.55, 2.0 + (k % 2) * 0.15 + (gust ? 1.25 : 0.05), { col: C.bl, th: 0.09, head: 0.26, name: 'wind' + k, hide: !gust });
        // Lkw (fährt nach rechts im rechten Fahrstreifen)
        veh(s, 'truck.png', x, LY + dr, rot, '!!tr', { scale: 0.55 });
      },
    });
  }

  // ===== AQUAPLANING (Morph: Wasserkeil) =====
  {
    const wheel = await svgImg(wheelSvg(), 400, 400, 1);
    const R = 1.25, CX = 9.3, GY = 4.7;
    const ST = [{ lift: 0, keil: 0.25, lab: '60 km/h, gutes Profil' }, { lift: 0.04, keil: 0.75, lab: 'Schneller, Profil abgefahren' }, { lift: 0.16, keil: 1.25, lab: 'Aquaplaning!' }];
    await steps(deck, 'c7l', {
      kicker: 'Aquaplaning', ttl: 'Der Reifen schwimmt auf',
      list: ['Profil verdrängt Wasser', 'Wasserkeil wächst', 'Reifen schwimmt'],
      ask: { q: 'Der Lkw schwimmt auf. Was tut ihr?', a: 'Gas weg, auskuppeln, Dauerbremse aus, nicht bremsen, Lenkrad gerade halten – bis die Reifen wieder greifen.', at: 2 },
      caps: [
        'Das Profil leitet das Wasser zur Seite. Der Reifen hat vollen Kontakt zur Straße.',
        'Schneller und abgefahrenes Profil: Das Wasser kommt nicht mehr schnell genug weg. Vor dem Reifen staut sich ein Wasserkeil.',
        'Der Keil schiebt sich unter den Reifen. Er schwimmt – Lenken und Bremsen wirken nicht mehr.',
      ],
      notes: [
        '▶ Sagen: „Bei Regen muss der Reifen das Wasser zur Seite wegdrücken. Das schafft das Profil – wenn es tief genug ist und ihr nicht zu schnell seid.“\n✅ Prüfungsfrage 2.1.03-015: Aquaplaning entsteht durch hohe Geschwindigkeit, abgefahrene Reifen und Spurrillen.\n➜ „Jetzt schneller, und das Profil ist abgefahren.“',
        '▶ „Das Wasser kommt nicht mehr weg. Vor dem Reifen staut sich ein Keil aus Wasser.“\n✅ Prüfungsfrage 2.1.03-101: besonders häufig in Fahrbahnsenken und in Spurrillen.\n💡 Lkw sind schwer und haben einen hohen Reifendruck – sie schwimmen später auf als Autos. In tiefen Spurrillen kann es trotzdem passieren.\n➜ „Und dann?“',
        '▶ „Der Reifen schwimmt auf. Kein Kontakt mehr zur Straße – Lenken und Bremsen wirken nicht.“\n❓ Frage auf der Folie: „Was tut ihr?“\n✅ Prüfungsfrage 2.1.03-034: eingeschränkte Lenkfähigkeit, verringerte Bremsfähigkeit. Verhalten (ADAC/Lehrbuchwissen): Gas weg, auskuppeln, nicht bremsen, Lenkrad gerade halten, bis die Reifen wieder greifen. Beim Lkw zusätzlich: Dauerbremse/Retarder aus – sie wirkt nur auf die Antriebsachse und kann sie blockieren lassen. Vorbeugen: Tempo runter bei starkem Regen, Profil prüfen.\n➜ „Kapitel 5: Leer oder beladen – was ändert sich?“',
      ],
      legend: 'Seitenansicht · schematisch',
      scene: async (s, i) => {
        const st = ST[i];
        s.rrect(5.65, GY, 7.4, 0.55, { fill: C.road, rr: 0.08, name: '!!str' });
        s.rect(5.65, GY - 0.12, 7.4, 0.12, { fill: '3B6EA8', ft: 30, name: '!!film' });
        // Wasserkeil vor dem Reifen (Fahrt nach links)
        const kw = st.keil, kh = 0.12 + st.lift + kw * 0.18;
        s.shape(s.pres.shapes.RIGHT_TRIANGLE, { x: CX - R * 0.55 - kw, y: GY - kh, w: kw, h: kh, fill: '4CC9F0', ft: 15, flipH: true, name: '!!keil' });
        s.img(wheel, { x: CX - R, y: GY - 2 * R - st.lift, w: 2 * R, h: 2 * R, rotate: i * 40, name: '!!rad' });
        // Spritzwasser
        for (let k = 0; k < 4; k++) s.oval(CX - R * 0.7 - 0.2 - k * 0.32 * (i + 1) * 0.6, GY - 0.35 - k * 0.22 * (i + 1) * 0.5, 0.12, 0.12, { fill: C.bl, ft: 30, name: '!!spr' + k });
        s.text(st.lab, { x: 5.7, y: 1.55, w: 5, h: 0.55, size: 26, bold: true, color: i === 2 ? C.red : C.txt, name: '!!lab' });
        s.text('Fahrtrichtung ←', { x: 5.7, y: 5.4, w: 3, h: 0.35, size: 13, color: C.dim, name: '!!fr' });
        s.text(i === 2 ? 'Kontakt zur Straße: keiner' : (i === 1 ? 'Kontakt zur Straße: weniger' : 'Kontakt zur Straße: voll'), { x: 9.0, y: 5.4, w: 4, h: 0.35, size: 15, bold: true, color: i === 2 ? C.red : (i === 1 ? C.or : C.gr), align: 'right', name: '!!kon' });
      },
    });
  }

  // ===== KAPITEL 5 =====
  await chapter(deck, 'c7b', { num: 5, ttl: 'Leer oder beladen', sub: 'Derselbe Lkw fährt sich leer ganz anders als voll.', ico: 'LuPackage', notes:
    '▶ Sagen: „Kapitel 5: Leer oder beladen. Derselbe Lkw – aber ein ganz anderes Fahrzeug.“\n🖱 Keine Klicks.\n➜ „Vergleichen wir.“' });
  {
    const L = 5.6, F = 0.75, BH = 1.5, CAB = 1.42;
    const ROWS = [['Haftung Antriebsachse', [0.3, 0.85, 0.85]], ['Bremsweg', [0.45, 0.85, 0.85]], ['Seitenwind-Empfindlichkeit', [0.85, 0.4, 0.5]], ['Kippgefahr in der Kurve', [0.3, 0.5, 0.95]]];
    const COLS = [[C.or, C.gr, C.gr], [C.gr, C.or, C.or], [C.red, C.gr, C.or], [C.gr, C.or, C.red]];
    await steps(deck, 'c7b', {
      kicker: 'Leer oder beladen', ttl: 'Derselbe Lkw, drei Gesichter',
      list: ['Leer', 'Voll, schwer unten', 'Schwer oben geladen'],
      ask: { q: 'Leer oder voll: Wann drehen die Antriebsräder eher durch?', a: 'Leer – auf der Antriebsachse liegt wenig Gewicht, also wenig Haftung.', at: 1 },
      caps: [
        'Leer: wenig Gewicht auf den Antriebsrädern – sie drehen leicht durch und neigen zum Blockieren (ABS und ALB gleichen das aus). Der hohe Aufbau fängt viel Wind.',
        'Voll, schwere Teile unten: gute Haftung, liegt satt. Aber: mehr Wucht, längerer Bremsweg, mehr Fliehkraft.',
        'Schwere Teile oben: Der Schwerpunkt wandert nach oben – in der Kurve kippt der Lkw viel früher.',
      ],
      notes: [
        '▶ Sagen: „Der leere Lkw: Auf der Antriebsachse liegt kaum Gewicht. Im Winter drehen die Räder leicht durch, beim Bremsen blockieren sie schneller. Und der leere Aufbau ist ein Segel.“\n❓ Frage auf der Folie stellen.\n✅ Lehrbuchwissen. ALB/EBS passen die Bremskraft an die Beladung an (siehe C5).\n➜ „Jetzt voll beladen.“',
        '▶ „Voll beladen und die schweren Teile unten: Der Lkw liegt satt, die Räder haben Haftung. Aber er hat viel mehr Bewegungsenergie – längerer Bremsweg, mehr Fliehkraft in der Kurve.“\n✅ Prüfungsfrage 2.2.22-305: Mit beladenem Fahrzeug muss ich die Geschwindigkeit dem Beladungszustand anpassen und bin verantwortlich, dass die Ladung die Verkehrssicherheit nicht beeinträchtigt.\n➜ „Und wenn falsch geladen ist?“',
        '▶ „Schwere Teile oben auf leichten: Der Schwerpunkt geht hoch, der Lkw kippt in der Kurve viel früher. Deshalb: Schweres immer nach unten und in die Mitte.“\n💡 Auch die Achslasten beachten: Steht alles Schwere vorn oder hinten, kann eine Achse überladen sein, obwohl das Gesamtgewicht stimmt (C8).\n➜ „Schreiben wir das Wichtigste aus C7 auf.“',
      ],
      legend: 'Blick in den Aufbau · grau = schwer, braun = leicht · Balken zeigen die Tendenz, keine Messwerte',
      scene: async (s, i) => {
        const k = 0.78, X = 5.95, GY = 3.75;
        const r = await lkw(s, { L, floor: F, boxH: BH }, { x: X, gy: GY, k, name: '!!lkw' });
        const [bx0, by0] = r.pt(CAB + 0.16, F + BH - 0.05), [bx1, by1] = r.pt(L - 0.12, F + 0.07);
        s.rect(bx0, by0, bx1 - bx0, by1 - by0, { fill: '1A1F27', ft: 12, name: '!!innen' });
        const W = bx1 - bx0, H = by1 - by0;
        // Ladung: Kisten
        for (let q = 0; q < 8; q++) {
          let x = bx0 + 0.08 + (q % 4) * (W - 0.16) / 4, y, w = (W - 0.16) / 4 - 0.06, h, col, show = true;
          if (i === 0) { show = false; y = by1 - 0.3; h = 0.25; col = 'A87A42'; }
          else if (i === 1) { h = q < 4 ? H * 0.32 : H * 0.22; y = q < 4 ? by1 - h - 0.04 : by1 - H * 0.32 - h - 0.08; col = q < 4 ? '6E7888' : 'B9864A'; }
          else { h = q < 4 ? H * 0.3 : H * 0.34; y = q < 4 ? by1 - h - 0.04 : by1 - H * 0.3 - h - 0.08; col = q < 4 ? 'B9864A' : '6E7888'; }
          s.rrect(x, y, w, h, { fill: col, ft: show ? 0 : 100, line: show ? '4A3A25' : undefined, rr: 0.05, name: '!!kiste' + q });
        }
        const hb = i === 2 ? H * 0.3 : H * 0.32, ht = i === 2 ? H * 0.34 : H * 0.22;
        const yb = by1 - 0.04 - hb / 2 - 0.13, yt = by1 - hb - 0.08 - ht / 2 - 0.13;
        s.text(i === 1 ? 'schwer' : (i === 2 ? 'leicht' : ''), { x: bx0, y: yb, w: W, h: 0.26, size: 12, bold: true, color: C.white, align: 'center', name: '!!t1' });
        s.text(i === 1 ? 'leicht' : (i === 2 ? 'schwer' : ''), { x: bx0, y: yt, w: W, h: 0.26, size: 12, bold: true, color: C.white, align: 'center', name: '!!t2' });
        s.text(i === 0 ? 'leer' : '', { x: bx0, y: (by0 + by1) / 2 - 0.15, w: W, h: 0.3, size: 14, bold: true, color: C.mut, align: 'center', name: '!!t0' });
        // Balken
        ROWS.forEach(([lab, v], q) => {
          const y = 4.25 + q * 0.58;
          s.text(lab, { x: 5.7, y, w: 3.3, h: 0.42, size: 14, bold: true, color: C.txt, valign: 'middle', name: '!!rl' + q });
          s.rrect(9.1, y + 0.08, 3.9, 0.26, { fill: '1A212C', line: C.line, rr: 0.5, name: '!!rb' + q });
          s.rrect(9.12, y + 0.1, 3.86 * v[i], 0.22, { fill: COLS[q][i], rr: 0.5, name: '!!rv' + q });
        });
      },
    });
  }

  // ===== ABSCHLUSS C7 =====
  write(deck, 'c7e', {
    ttl: 'Kräfte beim Fahren', labelW: 3.9, size: 17,
    rows: [
      ['Haftung', 'Rollendes Rad bremst stärker als blockiertes – und bleibt lenkbar.'],
      ['Haftungskreis', 'Bremsen und Lenken teilen sich die Haftung.'],
      ['Doppeltes Tempo', '4 × Energie · 4 × Bremsweg · 4 × Fliehkraft'],
      ['Fliehkraft größer', 'durch Tempo, Masse und enge Kurven.'],
      ['Kippen', 'Hoher Schwerpunkt kippt früher – Schweres nach unten.'],
      ['Seitenwind', 'Brücken, Waldschneisen, Überholen: langsamer, gegenlenken.'],
      ['Aquaplaning', 'Tempo, Profil, Spurrillen – Gas weg, Dauerbremse aus, nicht bremsen.'],
    ],
    notes: '▶ Sagen: „Schreibt euch diese sieben Punkte auf.“\n❓ Vor jedem Klick fragen: „Was gehört hierhin?“\n🖱 Klick 1–7: je eine Antwort.\n✅ Zusammenfassung von C7 (Quellen auf den Folien davor).\n➜ „Und jetzt testen wir das mit drei Prüfungsfragen.“',
  });
  quiz(deck, 'c7e', {
    kicker: 'Quiz C7 · 1', q: 'Sie befahren eine Kurve einmal mit 30 km/h und einmal mit 60 km/h. Wie ändert sich die Fliehkraft? Sie ist bei 60 km/h …', size: 28,
    opts: ['… doppelt so groß', '… gleich groß', '… viermal so groß'], ok: 2,
    why: 'Die Fliehkraft wächst mit dem Quadrat der Geschwindigkeit: doppelt so schnell – viermal so groß (Prüfungsfrage 2.7.01-046).',
    notes: '▶ Frage vorlesen, abstimmen lassen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ C.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c7e', {
    kicker: 'Quiz C7 · 2', q: 'Wodurch wird die Fliehkraft bei Kurvenfahrt vergrößert?', size: 34,
    opts: ['Durch höhere Geschwindigkeit', 'Durch höheren Reifenluftdruck', 'Durch kleineren Kurvenradius'], ok: [0, 2],
    why: 'Mehr Tempo und engere Kurven vergrößern die Fliehkraft. Der Reifendruck ändert sie nicht (Prüfungsfrage 2.7.01-047).',
    notes: '▶ Frage vorlesen. Mehrere Antworten können richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und C.\n➜ „Letzte Frage.“',
  });
  quiz(deck, 'c7e', {
    kicker: 'Quiz C7 · 3', q: 'Ihr Fahrzeug wird von starkem Seitenwind erfasst. Wie verhalten Sie sich?', size: 34,
    opts: ['Gegenlenken', 'Stark beschleunigen', 'Geschwindigkeit herabsetzen'], ok: [0, 2],
    why: 'Ruhig gegenlenken und langsamer fahren. Beschleunigen macht es nur gefährlicher (Prüfungsfrage 2.1.03-018).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und C.\n➜ „Das nimmst du aus C7 mit.“',
  });
  await takeaway(deck, 'c7e', {
    items: [
      ['LuCircleDot', 'Die Haftung ist begrenzt –', 'Bremsen und Lenken teilen sie sich. Bei Nässe und Glätte alles sanfter.'],
      ['LuGauge', 'Doppeltes Tempo heißt', 'vierfache Energie, vierfacher Bremsweg, vierfache Fliehkraft.'],
      ['LuCornerUpRight', 'Vor der Kurve bremsen,', 'nicht in der Kurve. Kreisverkehr und Abfahrten langsam.'],
      ['LuLayers', 'Schweres nach unten –', 'ein hoher Schwerpunkt kippt früher.'],
      ['LuWind', 'Wind und Wasser:', 'auf Brücken gegenlenken, bei Starkregen Tempo runter.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C7, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Jetzt 15 Minuten Pause. Danach Lektion C8: Ausrüstung, Gewichte, Sicherheit.“',
  });
  {
    const s = base(deck, 'c7e', { bg: 'f_rast.jpg', ov: 8.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „15 Minuten Pause. Kurz raus, frische Luft.“\n' +
      '💡 Pausenende ansagen (z. B. 19:45 Uhr).\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Willkommen zurück. Lektion C8: Was muss an Bord sein – und wie schwer und groß darf ein Lkw sein?“' });
    s.text('PAUSE', { x: 0.7, y: 2.0, w: 6, h: 0.5, size: 18, bold: true, color: C.gr, cs: 6 }, { fx: 'fade', auto: true, dur: 600 });
    s.text('15 Minuten', { x: 0.7, y: 2.5, w: 6.5, h: 1.4, size: 72, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900, d: 200 });
    s.text('Kurz raus, frische Luft.', { x: 0.7, y: 4.0, w: 6.2, h: 0.9, size: 22, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 600 });
    s.text('Danach: Lektion C8 · Ausrüstung, Beförderung, Sicherheit', { x: 0.7, y: 5.4, w: 6.2, h: 0.9, size: 16, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 900 });
  }
};
