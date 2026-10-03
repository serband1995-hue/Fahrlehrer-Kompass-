// Abend 4 · C8: Lernziele, Kapitel 1 Pflichtausrüstung, Panne absichern, Unterlegkeile, Abschleppen
const { C, sec, base, kick, title, card, point, CLICK, chapter, motion, steps, veh, lkw, photoAsk, ask, svgImg } = require('../gs');
const { lkwSide } = require('../lkw');

sec('c8', 'LEKTION C8', C.gr, 'bg_kap.jpg');
sec('c8a', 'C8  ·  PFLICHTAUSRÜSTUNG', C.gr, 'bg_gr.jpg');

module.exports = async (deck) => {
  // ===== LERNZIELE C8 =====
  {
    const s = base(deck, 'c8', { transition: 'black', notes:
      '▶ Sagen: „Willkommen zurück. In C8 geht es um Regeln, die ihr bei jeder Fahrt erfüllen müsst: Was an Bord sein muss, wie groß und schwer ein Lkw sein darf, wie Ladung herausragen darf, was bei Gefahrgut und Abfall gilt – und wie ihr bei der Arbeit am Lkw gesund bleibt.“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '💡 Geschwindigkeitsbegrenzer (Rahmenplan C8 c): in Abend 3 behandelt – kurz wiederholen: Lkw über 3,5 t haben einen Begrenzer, eingestellt auf höchstens 90 km/h (§ 57c StVZO).\n' +
      '➜ „Kapitel 1: Was muss an Bord sein?“' });
    kick(s, 'Lektion C8 · Ausrüstung, Beförderung, Sicherheit'); title(s, 'Das lernt ihr in C8');
    const T = [['01', 'Pflichtausrüstung', 'Warndreieck, Warnleuchte, Warnweste, Verbandkasten, Keile, Abschleppen', '15 Min', C.gr], ['02', 'Maße und Gewichte', 'Breite, Höhe, Länge, Achslasten, Überladung', '20 Min', C.or], ['03', 'Ladung', 'Was herausragen darf, wer verantwortlich ist', '15 Min', 'C9A227'], ['04', 'Besondere Güter', 'Gefahrgut, Abfall, Tiere', '15 Min', C.red], ['05', 'Arbeitssicherheit', 'Aussteigen, Einweiser, Schutzkleidung', '15 Min', C.bl]];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 10 Min Abschluss: Mitschreiben, Quiz und „Das nehmt ihr mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }

  // ===== KAPITEL 1 =====
  await chapter(deck, 'c8a', { num: 1, ttl: 'Pflichtausrüstung', sub: 'Was in eurem Lkw an Bord sein muss – und wie ihr es richtig benutzt.', bg: 'i_ausr_r.jpg', bgX: 6.0, notes:
    '▶ Sagen: „Kapitel 1: Pflichtausrüstung. Auf dem Bild seht ihr schon fast alles.“\n🖱 Keine Klicks.\n➜ „Was genau muss an Bord sein?“' });
  await photoAsk(deck, 'c8a', {
    bg: 'i_ausr_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Pflichtausrüstung', q: 'Was muss in jedem Lkw über 3,5 t an Bord sein?', qsize: 30, w: 5.2, asize: 14, top: 2.45,
    answers: [
      ['LuTriangleAlert', 'Warndreieck und Warnleuchte', 'getrennt voneinander – die Leuchte mit gelbem Blinklicht, unabhängig von der Lichtanlage.', C.red],
      ['LuShirt', 'Warnweste', 'nach EN ISO 20471 – griffbereit in der Kabine.', C.am],
      ['LuBriefcaseMedical', 'Verbandkasten', 'nach DIN 13164, geschützt vor Staub und Feuchtigkeit.', C.gr],
      ['LuTriangleRight', 'Unterlegkeile', 'über 4 t mindestens einer, ab drei Achsen zwei, fest in einer Halterung.', C.or],
    ],
    notes:
      '▶ Sagen: „Was muss an Bord sein?“\n' +
      '❓ Erst sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Teil.\n' +
      '✅ § 53a Abs. 2 StVZO: Kfz über 3,5 t: Warndreieck und getrennt davon eine Warnleuchte; in Lkw eine Warnweste. § 35h Abs. 3 StVZO: Erste-Hilfe-Material nach DIN 13164. § 41 Abs. 14 StVZO: Unterlegkeile – mindestens einer bei Kfz über 4 t, zwei bei drei- und mehrachsigen Fahrzeugen; Halterung gegen Verlieren und Klappern, keine Haken oder Ketten.\n' +
      '💡 Feuerlöscher ist beim normalen Lkw nicht vorgeschrieben (nur in Bussen und bei Gefahrgut – Kapitel 4). Empfehlenswert ist er trotzdem.\n' +
      '💡 Park-Warntafeln (rot-weiß, vorn und hinten) sind keine Pflicht-Ausrüstung. Abgestellt innerorts auf der Fahrbahn muss ein Lkw über 3,5 t bei Dunkelheit aber beleuchtet oder mit Park-Warntafeln gekennzeichnet sein.\n' +
      '✅ § 17 Abs. 4 StVO, § 51c StVZO (Park-Warntafel), Prüfungsfrage 2.2.17-202: gilt für Lkw und Wohnmobile über 3,5 t zulässige Gesamtmasse und für Anhänger – nicht für Pkw.\n' +
      '➜ „Und wie benutzt ihr das bei einer Panne?“',
  });

  // ===== PANNE ABSICHERN (fließend) =====
  {
    const RY = 3.0, RH = 1.4, SC = 0.05; // 1 m = 0.05 Zoll
    const TL = 12 * SC, TW = 0.22; // Lkw 12 m lang, im selben Maßstab wie die Abstände (Breite etwas überzeichnet)
    const TRX = 12.39 - TL / 2, TRY = RY + RH * 0.75 + 0.1; // Lkw steht rechts am Rand, Front bei x 12,39
    const REAR = TRX - TL / 2; // Heck (Lkw zeigt nach rechts)
    const fr = (t, o = {}) => ({ t, ...o });
    await motion(deck, 'c8a', {
      kicker: 'Panne', ttl: 'Panne – was jetzt?', dur: 480, holdDur: 800,
      question: 'Der Lkw bleibt auf der Landstraße liegen. Was macht ihr – und wie weit muss das Warndreieck weg?',
      answer: 'Warnblinklicht an, Warnweste an, Warndreieck bei schnellem Verkehr etwa 100 m hinter den Lkw – und die Warnleuchte dazu.',
      legend: 'Draufsicht · Lkw (12 m) und Abstände im gleichen Maßstab · Verkehr kommt von links',
      frames: [
        fr({ x: 8.6, y: RY + RH * 0.75, bl: 0, d: -1 }, { hold: true, cap: 'Landstraße mit schnellem Verkehr. Plötzlich verliert der Motor Leistung …', note: '▶ Sagen: „Ihr fahrt auf der Landstraße, der Motor geht in Notlauf. Ihr müsst anhalten.“\n❓ Frage auf der Folie stellen: Was macht ihr zuerst?\n🖱 Klick: Der Lkw rollt an den Rand (läuft von selbst).\n➜ „Ihr rollt rechts ran.“' }),
        fr({ x: 10.0, y: RY + RH * 0.75 + 0.05, bl: 0, d: -1 }), fr({ x: TRX, y: TRY, bl: 1, d: -1 }, { cap: 'So weit rechts wie möglich anhalten – sofort Warnblinklicht an.' }),
        fr({ x: TRX, y: TRY, bl: 0, d: -1 }), fr({ x: TRX, y: TRY, bl: 1, d: -1, weste: 1 }, { hold: true, cap: 'Warnweste anziehen, bevor ihr aussteigt – rechts aussteigen, wenn möglich.', note: '▶ „Zuerst Warnblinklicht. Dann Warnweste anziehen – noch in der Kabine – und möglichst auf der rechten Seite aussteigen.“\n✅ § 15 StVO: sofort Warnblinklicht einschalten. Warnweste: § 53a Abs. 2 Nr. 3 StVZO (mitführen). DGUV Vorschrift 70 § 56 Abs. 5: Wer als Beschäftigter im fließenden Verkehr am Fahrzeug arbeitet (z. B. Radwechsel), muss Warnkleidung tragen.\n🖱 Klick: Das Warndreieck wird aufgestellt (läuft von selbst).\n➜ „Jetzt das Warndreieck.“' }),
        fr({ x: TRX, y: TRY, bl: 0, d: 0, weste: 1 }, { cap: 'Das Warndreieck wandert nach hinten – gegen die Fahrtrichtung …' }),
        fr({ x: TRX, y: TRY, bl: 1, d: 20, weste: 1 }), fr({ x: TRX, y: TRY, bl: 0, d: 40, weste: 1 }), fr({ x: TRX, y: TRY, bl: 1, d: 60, weste: 1 }), fr({ x: TRX, y: TRY, bl: 0, d: 80, weste: 1 }),
        fr({ x: TRX, y: TRY, bl: 1, d: 100, weste: 1 }, { hold: true, answer: true, cap: 'Etwa 100 m bei schnellem Verkehr. Steht der Lkw hinter einer Kurve oder Kuppe: Dreieck schon davor aufstellen.', note: '▶ „Das Warndreieck kommt bei schnellem Verkehr etwa 100 Meter hinter den Lkw. Steht der Lkw hinter einer Kurve oder Kuppe, kommt das Dreieck schon vor die Kurve – damit die anderen rechtzeitig gewarnt sind.“\n✅ § 15 StVO: Warnzeichen gut sichtbar in ausreichender Entfernung, bei schnellem Verkehr in etwa 100 m. Prüfungsfragen 2.2.15-106 (Straße mit schnellem Verkehr: etwa 100 m) und 2.2.15-113 (Fahrzeug steht hinter einer Kurve: Warnblinklicht, hinter dem Fahrzeug ein auffällig warnendes Zeichen, Warnweste). Passend auch 2.2.15-201 (Seitenstreifen der Autobahn). Nicht abgesichert und dadurch jemand gefährdet: 60 € und 1 Punkt (BKat Nr. 66, FeV Anlage 13).\n💡 Faustregel aus der Fahrschule: innerorts etwa 50 m, Autobahn deutlich weiter – lieber zu weit als zu nah. Beim Gehen am Fahrbahnrand das Dreieck vor sich halten.\n🖱 Klick: die Warnleuchte (läuft von selbst).\n➜ „Und die Warnleuchte?“' }),
        fr({ x: TRX, y: TRY, bl: 0, d: 100, weste: 1, wl: 1 }),
        fr({ x: TRX, y: TRY, bl: 1, d: 100, weste: 1, wl: 1 }, { hold: true, cap: 'Dazu die Warnleuchte mit gelbem Blinklicht – zusätzlich, gut sichtbar am Fahrbahnrand.', note: '▶ „Über 3,5 t habt ihr zusätzlich eine Warnleuchte mit gelbem Blinklicht. Die stellt ihr zusätzlich am Fahrbahnrand auf, gut sichtbar – das Warndreieck bleibt Pflicht. Danach hinter die Schutzplanke oder weit weg vom Verkehr warten.“\n✅ § 53a Abs. 1 und 2 StVZO (Warnleuchte: gelbes Blinklicht, unabhängig von der Lichtanlage; auch eine tragbare Blinkleuchte nach § 53b Abs. 5 ist erlaubt). Prüfungsfrage 2.2.15-201: Warnleuchte in ausreichender Entfernung aufstellen.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und wenn der Lkw im Gefälle steht?“' }),
      ],
      scene: async (s, t) => {
        s.rect(5.65, RY, 7.4, RH, { fill: C.road, name: '!!road' });
        s.rect(5.65, RY - 0.05, 7.4, 0.05, { fill: C.mark, ft: 30, name: '!!rand1' });
        s.rect(5.65, RY + RH, 7.4, 0.05, { fill: C.mark, ft: 30, name: '!!rand2' });
        s.rect(5.65, RY + RH + 0.05, 7.4, 0.55, { fill: '2E4A30', name: '!!bank' });
        for (let k = 0; k < 9; k++) s.rrect(5.85 + k * 0.82, RY + RH / 2 - 0.025, 0.45, 0.05, { fill: C.mark, rr: 0.5, name: '!!rm' + k });
        // Lkw (zeigt nach rechts)
        veh(s, 'truck.png', t.x, t.y, 90, '!!tr', { size: [TW, TL] });
        const L = TL / 2, Wd = TW / 2, BD = 0.07;
        for (const [nm, dx, dy] of [['bl1', -L - 0.01, -Wd - 0.01], ['bl2', -L - 0.01, Wd - BD + 0.01], ['bl3', L - BD + 0.01, -Wd - 0.01], ['bl4', L - BD + 0.01, Wd - BD + 0.01]]) s.oval(t.x + dx, t.y + dy, BD, BD, { fill: C.am, ft: t.bl ? 0 : 100, glow: t.bl ? 8 : undefined, glowColor: C.am, name: '!!' + nm });
        // Warnweste
        s.text(t.weste ? 'Warnweste an' : '', { x: 11.3, y: 1.6, w: 1.75, h: 0.42, size: 14, bold: true, color: C.dark, fill: t.weste ? 'D7F000' : undefined, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!weste' });
        // Warndreieck wandert nach hinten (nach links)
        const show = t.d >= 0, dx = REAR - Math.max(0, t.d) * SC;
        s.shape(s.pres.shapes.ISOSCELES_TRIANGLE, { x: dx - 0.17, y: RY + RH - 0.42, w: 0.34, h: 0.3, fill: 'FFFFFF', ft: show ? 0 : 100, line: show ? C.red : undefined, lw: 3, name: '!!wd' });
        // Maßpfeil
        const ml = Math.max(0.02, Math.max(0, t.d) * SC);
        s.rrect(REAR - ml, RY + RH + 0.22, ml, 0.06, { fill: C.txt, ft: t.d > 0 ? 0 : 100, rr: 0.5, name: '!!mass' });
        s.text(t.d > 0 ? Math.round(t.d) + ' m' : '', { x: REAR - ml / 2 - 0.6, y: RY + RH + 0.3, w: 1.2, h: 0.32, size: 15, bold: true, color: C.txt, align: 'center', name: '!!masst' });
        // Warnleuchte
        s.oval(REAR - 1.9, RY + RH - 0.35, 0.22, 0.22, { fill: C.am, ft: t.wl ? (t.bl ? 0 : 55) : 100, glow: t.wl && t.bl ? 12 : undefined, glowColor: C.am, name: '!!wl' });
        s.text(t.wl ? 'Warnleuchte' : '', { x: REAR - 1.6, y: RY + RH - 0.39, w: 1.4, h: 0.3, size: 12, bold: true, color: C.am, valign: 'middle', name: '!!wlt' });   // rechts neben der Leuchte, nicht auf der Mittellinie
        s.text('Verkehr →', { x: 5.75, y: RY + RH * 0.55, w: 1.6, h: 0.35, size: 13, color: C.dim, name: '!!vk' });
      },
    });
  }

  // ===== UNTERLEGKEIL IM GEFÄLLE (Morph) =====
  {
    const o = { L: 5.0, axles: [0.72, 3.65], boxH: 1.4, floor: 0.72 }, k = 0.82, deg = 8, a = deg * Math.PI / 180;
    const r = lkwSide(o), w = r.W / 100 * k, h = r.H / 100 * k;
    const SX = 9.2, SY = 4.75;
    await steps(deck, 'c8a', {
      kicker: 'Unterlegkeile', ttl: 'Sicher abstellen im Gefälle',
      list: ['Feststellbremse anziehen', 'Keil vor ein Hinterrad', 'Talseite beachten'],
      ask: { q: 'Wohin kommt der Keil, wenn der Lkw bergab steht?', a: 'Talseitig vor ein Hinterrad – dorthin, wohin der Lkw rollen würde.', at: 2 },
      caps: [
        'Erst die Feststellbremse. Die Dauerbremse hält den Lkw nicht fest.',
        'Dann den Unterlegkeil vor ein Hinterrad legen.',
        'Der Keil gehört auf die Talseite des Rads – dorthin, wohin der Lkw rollen würde.',
      ],
      notes: [
        '▶ Sagen: „Ein Lkw steht im starken Gefälle, die Front zeigt nach unten. Zuerst: Feststellbremse.“\n✅ Prüfungsfrage 2.2.23-201: Feststellbremse anziehen und Unterlegkeil vor ein Hinterrad legen – NICHT die Dauerbremse betätigen.\n➜ „Dann der Keil.“',
        '▶ „Dann den Keil vor ein Hinterrad.“\n💡 Hinterrad, weil dort die Feststellbremse (Federspeicher) wirkt und das Rad sich nicht lenken lässt.\n➜ „Aber auf welche Seite?“',
        '▶ „Talseitig – dorthin, wohin der Lkw rollen würde. Hier zeigt die Front bergab, also kommt der Keil vor das Hinterrad, auf die Seite zur Front hin.“\n❓ Frage auf der Folie auflösen.\n✅ § 41 Abs. 14 StVZO: Keile müssen leicht zugänglich in einer Halterung sein.\n➜ „Und wenn der Lkw gar nicht mehr fährt – abschleppen.“',
      ],
      legend: 'Neigung überzeichnet · Front zeigt bergab',
      scene: async (s, i) => {
        const RW = 7.6, RH = 1.1;
        const cx = SX - RH / 2 * Math.sin(-a), cy = SY + RH / 2 * Math.cos(a);
        s.rect(cx - RW / 2, cy - RH / 2, RW, RH, { fill: C.road, rotate: -deg, name: '!!hang' });
        // Lkw: Front links unten (bergab nach links)
        const DN = 0.025;   // Lkw etwas tiefer: Räder stehen auf der Fahrbahn (nicht darüber schweben)
        const cxx = SX + (h / 2 - DN) * Math.sin(-a), cyy = SY - (h / 2 - DN) * Math.cos(a);
        await lkw(s, o, { x: cxx - w / 2 + r.pad * k, gy: cyy + h / 2, k, name: '!!lkwK', rot: -deg });
        // Hinterrad-Position (Achse 2) auf dem Hang
        const ax = (o.axles[1] - (o.L / 2)) * k; // Abstand von der Mitte nach rechts
        const hx = SX + ax * Math.cos(a), hy = SY - ax * Math.sin(a);
        const rw = 0.3 * k; // Radradius
        // Keil liegt auf der schrägen Fahrbahn (gleiche Neigung), senkrechte Seite am Reifen (Höhe des Radmittelpunkts)
        const KW = 0.36, KH = 0.3, th = -a;
        const qx = hx - (rw + 0.01) * Math.cos(a), qy = hy + (rw + 0.01) * Math.sin(a);   // Ecke unten rechts, auf der Fahrbahn
        const kcx = qx - (KW / 2 * Math.cos(th) - KH / 2 * Math.sin(th)), kcy = qy - (KW / 2 * Math.sin(th) + KH / 2 * Math.cos(th));
        const kx = kcx - KW / 2, ky = kcy - KH / 2;
        s.shape(s.pres.shapes.RIGHT_TRIANGLE, { x: kx, y: ky, w: KW, h: KH, fill: C.am, ft: i >= 1 ? 0 : 100, line: i >= 1 ? '8A6A10' : undefined, rotate: -deg, flipH: true, name: '!!keil' });
        s.oval(kx - 0.1, ky - 0.1, 0.56, 0.5, { line: C.gr, lw: 2.5, ft: 100, lt: i >= 2 ? 0 : 100, name: '!!keilring' });
        s.text('P', { x: 11.9, y: 1.6, w: 0.7, h: 0.7, size: 32, bold: true, color: C.white, fill: i >= 0 ? C.red : C.line, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!pb' });
        s.text(['Feststellbremse', 'Keil talseitig', 'Talseite = Rollrichtung'][i], { x: 8.4, y: 1.7, w: 3.4, h: 0.5, size: 20, bold: true, color: C.txt, align: 'right', name: '!!lab' });
        s.text(i >= 2 ? '← bergab' : '', { x: 5.8, y: 2.3, w: 2.2, h: 0.4, size: 16, bold: true, color: C.or, name: '!!berg' });
      },
    });
  }

  // ===== ABSCHLEPPEN =====
  await ask(deck, 'c8a', {
    kicker: 'Abschleppen', q: 'Euer Lkw muss abgeschleppt werden. Was gilt?', ico: 'LuLink', qsize: 34,
    answers: [
      ['LuTriangleAlert', 'Warnblinklicht an beiden Fahrzeugen', 'während des ganzen Abschleppens.', C.am],
      ['LuSignpost', 'Auf der Autobahn liegen geblieben?', 'Bei der nächsten Ausfahrt runter. Außerhalb liegen geblieben: nicht auf die Autobahn.', C.bl],
      ['LuLink', 'Beim schweren Lkw: Abschleppstange', 'statt Seil – höchstens 5 m Abstand, gut kennzeichnen. Am besten ein Abschleppdienst.', C.gr],
      ['LuWind', 'Keine Luft mehr in der Anlage?', 'Federspeicher erst nach dem Sichern mit Keilen lösen (siehe C5).', C.red],
    ],
    notes:
      '▶ Sagen: „Ein Lkw ist schwer. Abschleppen ist Sache von Profis – aber die Regeln müsst ihr kennen.“\n' +
      '❓ Antworten sammeln, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ § 15a StVO: Abs. 1 Autobahn bei der nächsten Ausfahrt verlassen; Abs. 2 nicht in die Autobahn einfahren; Abs. 3 beide Fahrzeuge Warnblinklicht. § 43 Abs. 3 StVZO und Prüfungsfrage 2.2.15-109: Abstand zwischen den Fahrzeugen höchstens 5 m, Abschleppseil oder -stange deutlich kennzeichnen (z. B. roter Lappen).\n' +
      '💡 Abschleppstange und Federspeicher lösen: Lehrbuchwissen. Ohne Luft wirkt beim geschleppten Lkw die Betriebsbremse nicht – mit Seil gibt es dann keine Möglichkeit zu bremsen. Prüfungsfrage 2.7.06-215: Federspeicher zum Abschleppen mit der Hilfslöseeinrichtung lösen.\n' +
      '💡 Ohne laufenden Motor geht die Lenkung sehr schwer, und die Bremse braucht viel mehr Kraft (Prüfungsfragen 2.2.15-105, -111). Vorher die Herstellerangaben beachten (z. B. Gelenkwelle trennen). Fahrerlaubnis: Die Klasse des ziehenden Fahrzeugs genügt (§ 6 Abs. 1 FeV; Prüfungsfrage 2.2.15-114).\n' +
      '➜ „Kapitel 2: Wie groß und wie schwer darf ein Lkw sein?“',
  });
};
