// Abend 2 · C3 Kapitel 2: Motor und Abgas
const { C, base, kick, title, card, point, CLICK, ask, quiz, steps, foot, svgImg, chapter, motion } = require('../gs');
const { icon } = require('../lib');

module.exports = async (deck) => {
  await chapter(deck, 'c3m', { num: 2, ttl: 'Motor und Abgas', sub: 'Diesel, Turbo, Drehzahl, AdBlue, Partikelfilter – und was ihr kontrolliert.', ico: 'LuFlame', notes:
    '▶ Sagen: „Kapitel 2: der Motor. Ihr müsst ihn nicht reparieren – aber verstehen, richtig bedienen und merken, wenn etwas nicht stimmt.“\n🖱 Keine Klicks.\n➜ „Zuerst: Wie funktioniert ein Diesel?“' });

  // ===== VIERTAKT-DIESEL (fließend: Kurbelwelle dreht, Nockenwelle öffnet die Ventile) =====
  {
    const ZX = 7.55, ZW = 2.3, ZT = 2.55, ZB = 4.75;           // Zylinder (Brennraum oben bei ZT)
    const KX = ZX + ZW / 2, KY = 5.75, R = 0.62, LR = 1.95;    // Kurbelwelle, Pleuellänge
    const PTOP = 0.12, PIN = 0.45, PH = 0.72;                   // Kolben: Abstand OT, Bolzen, Höhe
    const sOT = R + LR;
    const kin = th => { const a = th * Math.PI / 180, sx = R * Math.sin(a), sy = R * Math.cos(a), s = sy + Math.sqrt(LR * LR - sx * sx); const pin = KY - s; return { pinY: pin, top: pin - PIN, cx: KX + sx, cy: KY - sy }; };
    const top0 = kin(0).top, shift = (ZT + PTOP) - top0;      // Kolben im OT knapp unter dem Kopf
    // Nocken (Ei-Form, Spitze zeigt nach oben bei Drehung 0)
    const camImg = await svgImg('<path d="M 100 18 C 140 18 165 70 165 110 C 165 150 135 180 100 180 C 65 180 35 150 35 110 C 35 70 60 18 100 18 Z" fill="#8E99A8" stroke="#55606F" stroke-width="6"/><circle cx="100" cy="115" r="16" fill="#3C4656"/>', 200, 200, 1);
    const phase = th => th < 180 ? 0 : th < 360 ? 1 : th < 540 ? 2 : 3;
    const gasCol = th => th < 180 ? '4CC9F0' : th < 330 ? 'FFB547' : th < 480 ? 'FF5C5C' : th < 540 ? 'B9772F' : '738296';
    const TN = ['1  Ansaugen', '2  Verdichten', '3  Arbeiten', '4  Ausstoßen'];
    const VN = ['Einlass offen', 'beide Ventile zu', 'beide Ventile zu', 'Auslass offen'];
    const CAP = [
      'Ansaugen: Der Kolben geht nach unten, das Einlassventil ist offen – es kommt nur Luft hinein, kein Kraftstoff.',
      'Verdichten: Beide Ventile zu, der Kolben drückt die Luft stark zusammen. Dabei wird sie sehr heiß.',
      'Arbeiten: Diesel wird eingespritzt und entzündet sich in der heißen Luft von selbst. Der Druck treibt den Kolben nach unten.',
      'Ausstoßen: Das Auslassventil öffnet, der Kolben schiebt das Abgas hinaus. Danach beginnt alles von vorn.',
    ];
    const NOTE = {
      0: '▶ Sagen: „Ein Lkw-Motor ist ein Dieselmotor. Wir schauen in einen Zylinder – oben die Nockenwelle, sie öffnet die Ventile. Unten die Kurbelwelle.“\n❓ Frage auf der Folie: „Was fehlt beim Diesel im Vergleich zum Benziner?“ – Antworten sammeln.\n🖱 Klick: Die Kurbelwelle dreht sich – Ansaugen (läuft von selbst bis zum nächsten Halt).\n➜ „Erster Takt: Ansaugen.“',
      180: '▶ „Der Kolben war unten, der Zylinder ist voll Luft. Seht ihr: Die Nocke hat das Einlassventil aufgedrückt – jetzt schließt es.“\n🖱 Klick: Verdichten.\n➜ „Jetzt wird es eng.“',
      360: '▶ „Oben angekommen: Die Luft ist stark verdichtet und sehr heiß. Jetzt spritzt die Düse Diesel ein – er entzündet sich von selbst. Darum heißt der Diesel Selbstzünder.“\n✅ Prüfungsfrage 2.7.03-201. Die Antwort auf die Frage steht jetzt auf der Folie: Es gibt keine Zündkerze.\n🖱 Klick: Arbeitstakt.\n➜ „Der Druck treibt den Kolben nach unten.“',
      540: '▶ „Das war der Arbeitstakt – nur er liefert Kraft. Jetzt öffnet das Auslassventil.“\n🖱 Klick: Ausstoßen.\n➜ „Das Abgas muss raus.“',
      720: '▶ „Der Kolben schiebt das Abgas hinaus. Zwei Umdrehungen der Kurbelwelle, eine Umdrehung der Nockenwelle – und alles beginnt von vorn.“\n💡 Merksatz: Ansaugen – Verdichten – Arbeiten – Ausstoßen. Die Nockenwelle dreht halb so schnell wie die Kurbelwelle.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Wie bekommt man mehr Luft in den Zylinder? Mit dem Turbo.“',
    };
    const frames = [];
    for (let th = 0; th <= 720; th += 30) {
      const hold = th % 180 === 0;
      frames.push({ t: th, hold, cap: CAP[Math.min(3, phase(th === 720 ? 719 : th))], note: hold ? NOTE[th] : undefined, answer: th >= 360 });
    }
    await motion(deck, 'c3m', {
      kicker: 'Dieselmotor', ttl: 'Der Selbstzünder', frames, dur: 300, holdDur: 600,
      question: 'Was fehlt beim Diesel im Vergleich zum Benziner?',
      answer: 'Die Zündkerze. Der Diesel entzündet sich in der heißen, verdichteten Luft von selbst.',
      legend: 'Ein Zylinder im Schnitt · schematisch',
      scene: async (s, th) => {
        const k = kin(th), ph = phase(th === 720 ? 719 : th);
        const ptop = k.top + shift, pin = k.pinY + shift, cpx = k.cx, cpy = k.cy;
        const vin = th > 0 && th < 180 ? Math.sin(th * Math.PI / 180) : 0;
        const vex = th > 540 && th < 720 ? Math.sin((th - 540) * Math.PI / 180) : 0;
        // Zylinderkopf mit Kanälen, Wände mit Kühlmantel
        s.rrect(ZX - 0.35, ZT - 0.6, ZW + 0.7, 0.6, { fill: '55606F', rr: 0.15, name: '!!kopf' });
        s.rrect(ZX - 0.35, ZT - 0.5, 0.75, 0.22, { fill: '0E1520', rr: 0.4, name: '!!kanal1' });
        s.rrect(ZX + ZW - 0.4, ZT - 0.5, 0.75, 0.22, { fill: '0E1520', rr: 0.4, name: '!!kanal2' });
        s.rrect(ZX - 0.32, ZT, 0.32, ZB - ZT, { fill: '55606F', rr: 0.1, name: '!!wl' });
        s.rrect(ZX + ZW, ZT, 0.32, ZB - ZT, { fill: '55606F', rr: 0.1, name: '!!wr' });
        s.rrect(ZX - 0.23, ZT + 0.12, 0.13, ZB - ZT - 0.35, { fill: '1D3B57', rr: 0.4, name: '!!kw1' });
        s.rrect(ZX + ZW + 0.1, ZT + 0.12, 0.13, ZB - ZT - 0.35, { fill: '1D3B57', rr: 0.4, name: '!!kw2' });
        // Gas über dem Kolben
        const burn = th >= 360 && th < 450;
        s.rect(ZX, ZT, ZW, Math.max(ptop - ZT, 0.02), { fill: gasCol(th), ft: burn ? 12 : 50, name: '!!gas', glow: burn ? 16 : undefined, glowColor: C.red });
        // Nockenwelle (dreht halb so schnell) und Ventile
        const camR = th / 2;
        const cams = [[ZX + 0.42, (camR + 135) % 360, vin, C.bl, 'ein'], [ZX + ZW - 0.42, ((camR - 135) % 360 + 360) % 360, vex, C.mut, 'aus']];
        for (const [cx, rot, lift, col, nm] of cams) {
          s.img(camImg, { x: cx - 0.28, y: ZT - 1.42, w: 0.56, h: 0.56, rotate: Math.round(rot), name: '!!cam' + nm });
          const d = lift * 0.24;
          s.rrect(cx - 0.05, ZT - 0.88 + d, 0.1, 0.78, { fill: 'A9B6C6', rr: 0.4, name: '!!vs' + nm });
          s.rrect(cx - 0.27, ZT - 0.13 + d, 0.54, 0.11, { fill: lift > 0.05 ? col : 'A9B6C6', rr: 0.4, name: '!!vt' + nm });
        }
        s.text('Nockenwelle', { x: ZX + ZW / 2 - 0.8, y: ZT - 1.35, w: 1.6, h: 0.3, size: 11, italic: true, color: C.dim, align: 'center', name: '!!tnw' });
        // Einspritzdüse und Strahl
        const inj = th >= 345 && th <= 390;
        s.rrect(ZX + ZW / 2 - 0.08, ZT - 0.75, 0.16, 0.7, { fill: inj ? C.or : '8A96A6', rr: 0.4, name: '!!duese' });
        s.shape(deck.pres.shapes.ISOSCELES_TRIANGLE, { x: ZX + ZW / 2 - 0.5, y: ZT - 0.05, w: 1.0, h: 0.55, fill: C.or, ft: inj ? 10 : 100, name: '!!strahl' });
        // Kolben mit Ringen und Bolzen
        s.rrect(ZX + 0.04, ptop, ZW - 0.08, PH, { fill: 'B8C2CF', line: '8A96A6', rr: 0.08, name: '!!kolben' });
        s.rect(ZX + 0.04, ptop + 0.11, ZW - 0.08, 0.05, { fill: '6E7888', name: '!!ring1' });
        s.rect(ZX + 0.04, ptop + 0.22, ZW - 0.08, 0.05, { fill: '6E7888', name: '!!ring2' });
        // Kurbelwelle mit Gegengewicht, Pleuel
        s.oval(KX - 0.95, KY - 0.95, 1.9, 1.9, { fill: '1A212C', line: '3C4656', lw: 2, name: '!!kurb' });
        const ga = (th + 180) * Math.PI / 180;
        s.oval(KX + 0.55 * Math.sin(ga) - 0.5, KY - 0.55 * Math.cos(ga) - 0.3, 1.0, 0.6, { fill: '3C4656', rotate: Math.round(th % 180), name: '!!gegen' });
        s.oval(KX - 0.14, KY - 0.14, 0.28, 0.28, { fill: '55606F', name: '!!welle' });
        const rl = Math.hypot(cpx - KX, cpy - pin), ra = Math.atan2(cpy - pin, cpx - KX) * 180 / Math.PI;
        s.rrect((KX + cpx) / 2 - rl / 2, (pin + cpy) / 2 - 0.09, rl, 0.18, { fill: '8A96A6', rr: 0.5, rotate: Math.round(ra * 10) / 10, name: '!!pleuel' });
        s.oval(cpx - 0.2, cpy - 0.2, 0.4, 0.4, { fill: '9AA6B5', line: '6E7888', lw: 2, name: '!!zapfen' });
        s.oval(KX - 0.11, pin - 0.11, 0.22, 0.22, { fill: '6E7888', name: '!!bolzen' });
        s.text('Kurbelwelle', { x: KX + 0.95, y: KY - 0.18, w: 1.6, h: 0.35, size: 12, italic: true, color: C.dim, name: '!!tkw' });
        // Pfeile Luft rein / Abgas raus
        s.text('Luft', { x: ZX - 1.55, y: ZT - 0.8, w: 1.1, h: 0.35, size: 15, bold: vin > 0, color: vin > 0 ? C.bl : C.dim, align: 'right', name: '!!tluft' });
        s.rrect(ZX - 1.0, ZT - 0.42, 0.85, 0.06, { fill: vin > 0 ? C.bl : C.line, rr: 0.5, name: '!!pluft' });
        s.text('Abgas', { x: ZX + ZW + 0.5, y: ZT - 0.8, w: 1.2, h: 0.35, size: 15, bold: vex > 0, color: vex > 0 ? C.txt : C.dim, name: '!!tab' });
        s.rrect(ZX + ZW + 0.4, ZT - 0.42, 0.85, 0.06, { fill: vex > 0 ? C.mut : C.line, rr: 0.5, name: '!!pab' });
        // Takt rechts
        s.text(TN[ph], { x: 10.75, y: 2.75, w: 2.4, h: 0.5, size: 20, bold: true, color: ph === 2 ? C.red : C.txt, name: '!!takt' });
        s.text(VN[ph], { x: 10.75, y: 3.25, w: 2.4, h: 0.4, size: 15, color: C.mut, name: '!!vent' });
        s.text('Kurbelwelle: ' + th + '°', { x: 10.75, y: 3.7, w: 2.4, h: 0.4, size: 14, color: C.dim, name: '!!grad' });
      },
    });
  }

  // ===== TURBO UND LADELUFTKÜHLER (Aufbau per Klick) =====
  {
    const s = base(deck, 'c3m', { notes:
      '▶ Sagen: „Mehr Luft im Zylinder heißt: mehr Diesel kann verbrennen, mehr Kraft. Dafür sorgt der Turbolader.“\n' +
      '🖱 Klick 1: Abgas treibt die Turbine · Klick 2: der Verdichter drückt Luft · Klick 3: Ladeluftkühler · Klick 4: in den Motor · Klick 5: Tipp für die Praxis.\n' +
      '✅ Das Abgas dreht ein Turbinenrad. Auf derselben Welle sitzt das Verdichterrad, es drückt Frischluft in den Motor. Der Ladeluftkühler kühlt die dabei heiß gewordene Luft – kalte Luft enthält mehr Sauerstoff.\n' +
      '❓ „Woran merkt ihr, dass mit dem Turbo etwas nicht stimmt?“\n' +
      '✅ Weniger Leistung, Pfeifen, blauer oder schwarzer Rauch, Öl am Ladeluftschlauch → Werkstatt.\n' +
      '➜ „Wie fahre ich den Motor richtig? Ein Blick auf den Drehzahlmesser.“' });
    kick(s, 'Turbolader'); title(s, 'Abgas pustet Luft in den Motor');
    // Motor
    card(s, 0.7, 2.3, 2.4, 3.0, { line: C.red, fill: '2A1A1E' });
    s.img(await icon('LuFlame', C.red), { x: 1.45, y: 3.0, w: 0.9, h: 0.9 });
    s.text('Motor', { x: 0.7, y: 4.1, w: 2.4, h: 0.5, size: 22, bold: true, color: C.txt, align: 'center' });
    // Turbolader (zwei Räder auf einer Welle)
    const TX = 6.2, TY = 2.35;
    s.lineS(4.3 + 0.55, TY + 0.6, 4.3 + 2.95, TY + 0.6, { color: '9AA6B5', lw: 5 });
    // 1 Abgas → Turbine
    s.lineS(3.1, 4.6, 7.0, 4.6, { color: C.mut, lw: 4, endArrow: 'triangle' }, CLICK);
    s.lineS(7.0, 4.6, 7.0, TY + 1.25, { color: C.mut, lw: 4, endArrow: 'triangle' }, { fx: 'fade', dur: 250 });
    s.oval(6.4, TY, 1.2, 1.2, { fill: '3C4656', line: C.mut, lw: 2 }, { fx: 'zoom', dur: 300 });
    s.img(await icon('LuFan', C.mut), { x: 6.65, y: TY + 0.25, w: 0.7, h: 0.7 }, [{ fx: 'fade', dur: 200 }]);
    s.text('Turbine', { x: 6.0, y: TY - 0.5, w: 2.0, h: 0.4, size: 16, bold: true, color: C.mut, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('Abgas', { x: 3.7, y: 4.65, w: 1.6, h: 0.4, size: 15, color: C.mut }, { fx: 'fade', dur: 200 });
    s.lineS(7.6, TY + 0.6, 8.6, TY + 0.6, { color: C.mut, lw: 4, endArrow: 'triangle' }, { fx: 'fade', dur: 200 });
    s.text('zum Auspuff und zur Abgasreinigung', { x: 8.7, y: TY + 0.38, w: 3.9, h: 0.45, size: 14, color: C.dim }, { fx: 'fade', dur: 200 });
    // 2 Verdichter
    s.oval(4.3, TY, 1.2, 1.2, { fill: '173048', line: C.bl, lw: 2 }, CLICK);
    s.img(await icon('LuFan', C.bl), { x: 4.55, y: TY + 0.25, w: 0.7, h: 0.7 }, { fx: 'fade', dur: 200 });
    s.text('Verdichter', { x: 3.9, y: TY - 0.5, w: 2.0, h: 0.4, size: 16, bold: true, color: C.bl, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('gleiche Welle', { x: 5.05, y: TY + 0.66, w: 1.9, h: 0.3, size: 11, color: C.dim, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('Frischluft', { x: 3.15, y: TY + 0.12, w: 1.15, h: 0.35, size: 14, color: C.bl, align: 'center' }, { fx: 'fade', dur: 200 });
    s.lineS(3.25, TY + 0.6, 4.3, TY + 0.6, { color: C.bl, lw: 3, endArrow: 'triangle' }, { fx: 'fade', dur: 200 });
    // 3 Ladeluftkühler
    s.lineS(4.9, TY + 1.2, 4.9, 5.85, { color: C.or, lw: 4 }, CLICK);
    s.rrect(4.2, 5.85, 1.4, 0.75, { fill: '173048', line: C.bl, lw: 2, rr: 0.08 }, { fx: 'zoom', dur: 300 });
    s.img(await icon('LuSnowflake', C.bl), { x: 4.65, y: 5.97, w: 0.5, h: 0.5 }, { fx: 'fade', dur: 200 });
    s.text('heiße, verdichtete Luft', { x: 5.05, y: 4.95, w: 2.4, h: 0.35, size: 13, color: C.or }, { fx: 'fade', dur: 200 });
    s.text('Ladeluftkühler', { x: 5.75, y: 5.95, w: 2.3, h: 0.5, size: 16, bold: true, color: C.bl, valign: 'middle' }, { fx: 'fade', dur: 200 });
    // 4 in den Motor
    s.lineS(4.2, 6.22, 2.2, 6.22, { color: C.bl, lw: 4 }, CLICK);
    s.lineS(2.2, 6.22, 2.2, 5.35, { color: C.bl, lw: 4, endArrow: 'triangle' }, { fx: 'fade', dur: 200 });
    s.text('kühle Luft = mehr Sauerstoff = mehr Kraft', { x: 0.5, y: 6.35, w: 3.6, h: 0.35, size: 13, bold: true, color: C.bl }, { fx: 'fade', dur: 200 });
    // 5 Praxis
    await point(s, 8.6, 3.95, 4.0, 2.65, 'LuTimer', C.or, 'Praxis:', 'nach Bergfahrt oder Vollgas den Motor kurz im Leerlauf nachlaufen lassen – der Lader ist sehr heiß. Viele Lkw regeln das selbst: Betriebsanleitung.', CLICK, { br: true, size: 15 });
  }

  // ===== DREHZAHLMESSER (Morph) =====
  const GX = 9.3, GY = 3.75, GR = 2.15;          // Mittelpunkt und Radius des Instruments
  const A0 = 225, A1 = -45, MAX = 2500;           // 0 bis 2500 /min über 270°
  const ang = n => (A0 - (n / MAX) * (A0 - A1)) * Math.PI / 180;
  const pt = (n, r) => [GX + r * Math.cos(ang(n)), GY - r * Math.sin(ang(n))];
  const arc = (n1, n2, r, col, wdt) => {
    const px = 100, [x1, y1] = pt(n1, r), [x2, y2] = pt(n2, r);
    const big = Math.abs(ang(n1) - ang(n2)) > Math.PI ? 1 : 0;
    return `<path d="M ${(x1 - GX + GR + 0.3) * px} ${(y1 - GY + GR + 0.3) * px} A ${r * px} ${r * px} 0 ${big} 1 ${(x2 - GX + GR + 0.3) * px} ${(y2 - GY + GR + 0.3) * px}" fill="none" stroke="${col}" stroke-width="${wdt}"/>`;
  };
  let dial = arc(0, MAX, GR, '#3C4656', 14) + arc(1000, 1400, GR - 0.05, '#38D98A', 30) + arc(2100, MAX, GR - 0.05, '#FF5C5C', 30);
  for (let n = 0; n <= MAX; n += 500) {
    const [a, b] = pt(n, GR - 0.25), [c, d] = pt(n, GR + 0.05);
    dial += `<line x1="${(a - GX + GR + 0.3) * 100}" y1="${(b - GY + GR + 0.3) * 100}" x2="${(c - GX + GR + 0.3) * 100}" y2="${(d - GY + GR + 0.3) * 100}" stroke="#A9B6C6" stroke-width="6"/>`;
  }
  const dialImg = await svgImg(dial, (GR + 0.3) * 200, (GR + 0.3) * 200);
  const RPM = [600, 1200, 1900, 1200];
  await steps(deck, 'c3m', {
    kicker: 'Drehzahl', ttl: 'Im grünen Bereich',
    ask: { q: 'Wofür steht der grüne Bereich im Drehzahlmesser?', a: 'Viel Kraft bei wenig Verbrauch – dort fahren.', at: 1 },
    list: ['Leerlauf', 'Grüner Bereich', 'Zu hoch gedreht', 'Wirtschaftlich fahren'],
    caps: [
      'Im Leerlauf dreht der Motor langsam. Unnötig laufen lassen ist verboten.',
      'Im grünen Bereich hat der Motor viel Kraft und braucht wenig Diesel – grob 1.000 bis 1.400 /min, je nach Motor.',
      'Zu hohe Drehzahl kostet Diesel, macht Lärm und verschleißt den Motor. Früher hochschalten.',
      'Vorausschauend rollen lassen, Tempomat nutzen, mit Motorbremse und Retarder verzögern.',
    ],
    notes: [
      '▶ Sagen: „Der Drehzahlmesser ist euer Spar-Instrument. Hier: Leerlauf.“\n❓ „Was steht im Drehzahlmesser eines Lkw, was im Pkw fehlt?“\n✅ Ein grüner Bereich (je nach Hersteller auch markiert oder im Display angezeigt).\n➜ „Wofür steht Grün?“',
      '▶ „Im grünen Bereich hat der Motor viel Drehmoment bei wenig Verbrauch. Bei modernen Lkw grob 1.000 bis 1.400 Umdrehungen – schaut immer auf euer Instrument, jeder Motor ist anders.“\n✅ Herstellerangaben; Lehrbuchwissen zum wirtschaftlichen Fahren.\n➜ „Und wenn ich zu hoch drehe?“',
      '▶ „Zu hoch: mehr Verbrauch, mehr Lärm, mehr Verschleiß. Mit dem automatisierten Getriebe schaltet der Lkw meist selbst richtig – aber nur, wenn ihr nicht dauernd Vollgas gebt.“\n➜ „Was heißt wirtschaftlich fahren noch?“',
      '▶ „Vorausschauend fahren: früh vom Gas, rollen lassen, Tempomat und vorausschauenden Tempomat nutzen. Verzögern mit Motorbremse und Retarder – das schont die Betriebsbremse.“\n💡 Details zu den Dauerbremsen kommen in der Bremsen-Lektion.\n➜ „Jetzt zur Abgasreinigung: AdBlue.“',
    ],
    legend: 'Drehzahlmesser · Werte sind Beispiele, maßgeblich ist euer Fahrzeug',
    scene: async (s, i) => {
      s.oval(GX - GR - 0.45, GY - GR - 0.45, (GR + 0.45) * 2, (GR + 0.45) * 2, { fill: '0D141E', line: '2A3B52', lw: 2, name: '!!gface' });
      s.img(dialImg, { x: GX - GR - 0.3, y: GY - GR - 0.3, w: (GR + 0.3) * 2, h: (GR + 0.3) * 2, name: '!!dial' });
      for (let n = 0; n <= MAX; n += 500) {
        const [x, y] = pt(n, GR - 0.62);
        s.text(String(n / 100), { x: x - 0.3, y: y - 0.18, w: 0.6, h: 0.36, size: 14, bold: true, color: C.mut, align: 'center', valign: 'middle', name: '!!z' + n });
      }
      s.text('× 100 /min', { x: GX - 0.8, y: GY + 0.55, w: 1.6, h: 0.3, size: 12, color: C.dim, align: 'center', name: '!!einheit' });
      // Zeiger: dünnes Rechteck um die Mitte gedreht
      const n = RPM[i], deg = 90 - ang(n) * 180 / Math.PI;
      const L = GR - 0.2;
      s.rect(GX - L / 2 + (L / 2) * Math.cos(ang(n)), GY - 0.035 - (L / 2) * Math.sin(ang(n)), L, 0.07, { fill: C.or, rotate: -ang(n) * 180 / Math.PI, name: '!!zeiger', glow: 6, glowColor: C.or });
      s.oval(GX - 0.18, GY - 0.18, 0.36, 0.36, { fill: '55606F', name: '!!nabe' });
      const lab = ['Leerlauf', 'grün: Kraft und sparen', 'zu hoch', 'grün halten'][i];
      const lc = [C.mut, C.gr, C.red, C.gr][i];
      s.text(lab, { x: GX - 1.5, y: GY + 1.45, w: 3.0, h: 0.45, size: 18, bold: true, color: lc, align: 'center', name: '!!glab' });
      void deg;
    },
  });

  // ===== ADBLUE =====
  {
    const s = base(deck, 'c3m', { notes:
      '▶ Sagen: „Moderne Lkw erfüllen die Abgasnorm Euro VI. Dafür brauchen sie AdBlue – eine Harnstoff-Lösung, die im Abgas die Stickoxide unschädlich macht.“\n' +
      '❓ „Am Lkw sind zwei Einfüllstutzen. Welcher ist für AdBlue?“\n' +
      '🖱 Klick 1: Beschriftung der Stutzen · Klick 2–4: je ein Punkt.\n' +
      '✅ AdBlue: 32,5 % Harnstoff in Wasser (ISO 22241), eigener Tank, kleiner Stutzen mit blauem Deckel. Verbrauch etwa 3–6 % des Diesels (je nach Motor). Gefriert bei etwa −11 °C, darum ist der Tank beheizt. Nie verwechseln – bei falsch getankt: Motor nicht starten, Werkstatt (Herstellerangaben).\n' +
      '✅ Euro VI für neue schwere Lkw seit 31.12.2013 (VO (EG) 595/2009).\n' +
      '➜ „Was passiert, wenn der AdBlue-Tank leer ist?“' });
    kick(s, 'Abgas · AdBlue'); title(s, 'Zwei Tanks, zwei Deckel');
    // Foto: Dieseltank und AdBlue-Tank am Rahmen
    s.img('g_tank_c.jpg', { x: 0.7, y: 2.05, w: 5.3, h: 3.23 });
    s.rrect(0.7, 2.05, 5.3, 3.23, { line: C.line, lw: 1, rr: 0.04 });
    s.lineS(1.95, 3.35, 2.69, 2.82, { color: C.txt, lw: 2 }, CLICK);
    s.text('Diesel', { x: 1.0, y: 3.35, w: 1.3, h: 0.42, size: 17, bold: true, color: C.dark, fill: C.txt, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 250 });
    s.lineS(5.0, 3.75, 5.36, 3.1, { color: '6FA8FF', lw: 2 }, { fx: 'fade', dur: 200 });
    s.text('AdBlue', { x: 4.35, y: 3.75, w: 1.3, h: 0.42, size: 17, bold: true, color: C.white, fill: '2563C7', shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 250 });
    s.text([{ text: 'Diesel: ', options: { bold: true, color: C.txt } }, { text: 'großer Tank, schwarzer Deckel', options: { color: C.mut, breakLine: true } }, { text: 'AdBlue: ', options: { bold: true, color: '6FA8FF' } }, { text: 'eigener Tank, kleiner Stutzen, blauer Deckel', options: { color: C.mut } }], { x: 0.75, y: 5.4, w: 5.25, h: 0.95, size: 15 }, { fx: 'fade', dur: 200 });
    await point(s, 6.3, 2.05, 6.33, 1.38, 'LuDroplet', C.bl, 'Was ist AdBlue?', '32,5 % Harnstoff in Wasser. Im Abgas macht es aus Stickoxiden Stickstoff und Wasser.', CLICK, { br: true, size: 16 });
    await point(s, 6.3, 3.58, 6.33, 1.38, 'LuSnowflake', C.pu, 'Eigener Tank, beheizt', 'Verbrauch etwa 3–6 % vom Diesel. Gefriert bei etwa −11 °C.', CLICK, { br: true, size: 16 });
    await point(s, 6.3, 5.11, 6.33, 1.38, 'LuBan', C.red, 'Nie verwechseln!', 'AdBlue nie in den Dieseltank – und umgekehrt. Falsch getankt: Motor nicht starten.', CLICK, { br: true, size: 16 });
  }

  // ===== ADBLUE LEER: STUFEN =====
  {
    const s = base(deck, 'c3m', { notes:
      '▶ Sagen: „Der AdBlue-Tank ist fast leer – und ihr fahrt einfach weiter. Was macht der Lkw?“\n' +
      '❓ Antworten sammeln.\n' +
      '🖱 Klick 1: Warnung · Klick 2: weniger Leistung · Klick 3: Kriechmodus · Klick 4: Manipulation.\n' +
      '✅ Das EU-Recht schreibt dieses „Aufforderungssystem“ vor: erst Warnung, dann Leistungsdrosselung, zuletzt höchstens 20 km/h (VO (EU) 582/2011 Anhang XIII i. V. m. UN-Regelung Nr. 49 Anhang 11). Die Drosselstufe davor: Drehmoment −25 %.\n' +
      '✅ Manipulation (z. B. AdBlue-Emulator) ist verboten: Die Betriebserlaubnis erlischt.\n' +
      '➜ „Der zweite Abgasreiniger: der Partikelfilter.“' });
    kick(s, 'Abgas · AdBlue'); title(s, 'AdBlue leer – was passiert?');
    const St = [['LuTriangleAlert', C.am, 'Warnung', 'Anzeige im Display: AdBlue nachfüllen.'], ['LuTrendingDown', C.or, 'Weniger Leistung', 'Der Motor wird gedrosselt: 25 % weniger Drehmoment.'], ['LuSnail', C.red, 'Kriechmodus', 'höchstens 20 km/h']];
    for (let k = 0; k < 3; k++) {
      const x = 0.7 + k * 4.13;
      card(s, x, 2.15, 3.7, 3.0, { line: St[k][1] }, CLICK);
      s.oval(x + 1.35, 2.45, 1.0, 1.0, { fill: St[k][1], line: St[k][1] }, { fx: 'zoom', dur: 250 });
      s.img(await icon(St[k][0], C.dark), { x: x + 1.6, y: 2.7, w: 0.5, h: 0.5 }, { fx: 'fade', dur: 150 });
      s.text(St[k][2], { x, y: 3.65, w: 3.7, h: 0.55, size: 24, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
      s.text(St[k][3], { x: x + 0.2, y: 4.2, w: 3.3, h: 0.8, size: k === 2 ? 22 : 17, bold: k === 2, color: k === 2 ? C.red : C.mut, align: 'center', valign: 'top' }, { fx: 'fade', dur: 200 });
      if (k < 2) s.text('➜', { x: x + 3.7, y: 3.3, w: 0.43, h: 0.6, size: 28, bold: true, color: C.dim, align: 'center' }, { fx: 'fade', dur: 200 });
    }
    await point(s, 0.7, 5.45, 11.93, 1.0, 'LuShieldAlert', C.red, 'Abgasanlage manipulieren ist verboten', '– z. B. mit einem AdBlue-Emulator. Die Betriebserlaubnis erlischt.', CLICK, { size: 17 });
  }

  // ===== PARTIKELFILTER =====
  await ask(deck, 'c3m', {
    kicker: 'Abgas · Partikelfilter', q: 'Die Leuchte fordert eine Standregeneration. Worauf achtest du?', qsize: 30, ico: 'LuFilter',
    answers: [
      ['LuRefreshCw', 'Normalfall', 'Der Filter sammelt Ruß und brennt ihn bei längerer Fahrt selbst frei – automatisch.'],
      ['LuFlame', 'Sehr heißes Abgas', 'Nicht über trockenem Gras oder anderem Brennbaren abstellen, nicht in einer Halle.'],
      ['LuBookOpen', 'So wie in der Betriebsanleitung', 'starten, meist per Taste – und nicht unnötig abbrechen.', C.gr],
    ],
    notes:
      '▶ Sagen: „Der Dieselpartikelfilter fängt den Ruß. Er muss ab und zu freigebrannt werden – das heißt Regeneration.“\n' +
      '❓ „Ihr fahrt viel Kurzstrecke im Verteilerverkehr. Plötzlich fordert die Leuchte eine Standregeneration. Worauf achtet ihr?“\n' +
      '🖱 Klick 1–3: je eine Antwort.\n' +
      '✅ Bei langer Fahrt regeneriert der Filter von selbst. Bei viel Kurzstrecke kann eine Standregeneration nötig werden. Dabei tritt sehr heißes Abgas aus: nicht über brennbarem Untergrund, nicht in Hallen. Nach Betriebsanleitung starten, nicht unnötig abbrechen (Herstellerangaben, z. B. DAF, Mercedes-Benz).\n' +
      '➜ „Jetzt zu dem, was ihr selbst kontrolliert: Öl und Kühlmittel.“',
  });

  // ===== ÖL UND KÜHLMITTEL =====
  {
    const s = base(deck, 'c3m', { notes:
      '▶ Sagen: „Vor der Fahrt kontrolliert ihr Öl und Kühlmittel. Das gehört auch zur Abfahrtkontrolle in der Prüfung.“\n' +
      '❓ „Wann darf ich den Kühlmittel-Behälter öffnen?“\n' +
      '✅ Nur bei kaltem Motor – heißes Kühlmittel steht unter Druck, Verbrühungsgefahr.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Ölstand auf ebener Fläche, Messstab oder Anzeige im Display. Nur Öl mit Freigabe des Herstellers (Prüfungsfragen 2.7.04-206, 2.7.03-207: Mehrbereichsöl deckt den größten Temperaturbereich ab). Frostschutz vor dem Winter prüfen – gefrierendes Wasser kann Kühler und Motorblock sprengen (2.7.03-206). Rote Temperaturwarnung: so schnell wie möglich an geeigneter Stelle anhalten, nach Betriebsanleitung handeln (2.7.02-216).\n' +
      '➜ „Und was kommt in den Tank, wenn es kalt wird?“' });
    kick(s, 'Kontrolle'); title(s, 'Öl und Kühlmittel');
    await point(s, 0.7, 2.05, 5.85, 2.0, 'LuDroplet', C.or, 'Ölstand', 'Lkw steht eben. Messstab oder Anzeige im Display. Nur Öl mit Freigabe des Herstellers nachfüllen.', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 2.05, 5.85, 2.0, 'LuThermometer', C.bl, 'Kühlmittel nur kalt öffnen', 'Heißes Kühlmittel steht unter Druck – Verbrühungsgefahr!', CLICK, { br: true, size: 17 });
    await point(s, 0.7, 4.25, 5.85, 2.0, 'LuSnowflake', C.pu, 'Frostschutz vor dem Winter', 'Gefrierendes Wasser dehnt sich aus und kann Kühler oder Motor sprengen.', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 4.25, 5.85, 2.0, 'LuTriangleAlert', C.red, 'Rote Temperatur-Warnung', 'So schnell wie möglich an geeigneter Stelle anhalten. Betriebsanleitung beachten.', CLICK, { br: true, size: 17 });
  }

  // ===== WINTERDIESEL (Zeitleiste) =====
  {
    const s = base(deck, 'c3m', { notes:
      '▶ Sagen: „Diesel enthält Paraffin. Bei Kälte bildet es Kristalle und verstopft den Filter – der Motor bekommt keinen Kraftstoff mehr.“\n' +
      '❓ „Ab wann gibt es an der Tankstelle Winterdiesel?“\n' +
      '🖱 Klick 1: Übergangsdiesel · Klick 2: Winterdiesel · Klick 3: Praxis.\n' +
      '✅ Nach DIN EN 590: ab 1. Oktober Übergangsdiesel (bis −10 °C filtrierbar), vom 16. November bis 28. Februar Winterdiesel (bis −20 °C). Im Frühjahr wieder Übergangsware.\n' +
      '✅ Springt der Diesel im Winter nicht an, kann ausgeschiedenes Paraffin den Filter verstopft haben (Prüfungsfrage 2.7.03-208 – amtliche Antwort: „Es befindet sich noch Sommerdieselkraftstoff im Tank“).\n' +
      '💡 Kein Benzin beimischen – das schadet modernen Motoren. Vor Fahrten nach Skandinavien oder in die Alpen rechtzeitig Winterdiesel tanken.\n' +
      '➜ „Noch eine Frage zum Leerlauf.“' });
    kick(s, 'Kraftstoff'); title(s, 'Winterdiesel – ab wann?');
    const M = ['Sep', 'Okt', 'Nov', 'Dez', 'Jan', 'Feb', 'Mär'];
    const X0 = 0.9, MW = 1.65, Y = 2.6;
    M.forEach((m, k) => {
      s.rect(X0 + k * MW, Y, MW - 0.04, 0.5, { fill: C.card2 });
      s.text(m, { x: X0 + k * MW, y: Y, w: MW - 0.04, h: 0.5, size: 17, bold: true, color: C.mut, align: 'center', valign: 'middle' });
    });
    const xd = (mon, day) => X0 + mon * MW + (day - 1) / 30 * MW; // mon: 0 = Sep
    // Sommer
    s.rrect(X0, Y + 0.7, xd(1, 1) - X0 - 0.04, 0.9, { fill: '3A3220', line: C.am, rr: 0.08 });
    s.text('Sommer', { x: X0, y: Y + 0.7, w: xd(1, 1) - X0, h: 0.9, size: 16, bold: true, color: C.am, align: 'center', valign: 'middle' });
    // Übergang
    s.rrect(xd(1, 1), Y + 0.7, xd(2, 16) - xd(1, 1) - 0.04, 0.9, { fill: '1C2E44', line: C.bl, rr: 0.08 }, CLICK);
    s.text([{ text: 'Übergang', options: { bold: true, breakLine: true } }, { text: 'bis −10 °C', options: {} }], { x: xd(1, 1), y: Y + 0.7, w: xd(2, 16) - xd(1, 1), h: 0.9, size: 16, color: C.bl, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text('ab 1.10.', { x: xd(1, 1) - 0.5, y: Y + 1.7, w: 1.4, h: 0.4, size: 16, bold: true, color: C.bl }, { fx: 'fade', dur: 200 });
    // Winter
    s.rrect(xd(2, 16), Y + 0.7, xd(6, 1) - xd(2, 16) - 0.04, 0.9, { fill: '23284A', line: C.pu, lw: 2, rr: 0.08, glow: 8, glowColor: C.pu }, CLICK);
    s.text([{ text: 'Winterdiesel  ', options: { bold: true } }, { text: 'bis −20 °C', options: {} }], { x: xd(2, 16), y: Y + 0.7, w: xd(6, 1) - xd(2, 16), h: 0.9, size: 20, color: C.txt, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    s.text('16.11. – 28.2.', { x: xd(2, 16) - 0.2, y: Y + 1.7, w: 2.4, h: 0.4, size: 16, bold: true, color: C.pu }, { fx: 'fade', dur: 200 });
    s.rrect(xd(6, 1), Y + 0.7, X0 + 7 * MW - xd(6, 1) - 0.04, 0.9, { fill: '1C2E44', line: C.bl, rr: 0.08 }, { fx: 'fade', dur: 200 });
    s.text('Übergang', { x: xd(6, 1), y: Y + 0.7, w: X0 + 7 * MW - xd(6, 1), h: 0.9, size: 15, bold: true, color: C.bl, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
    // Praxis
    await point(s, 0.7, 4.75, 5.85, 1.65, 'LuSnowflake', C.bl, 'Springt nicht an?', 'Paraffin-Kristalle können den Filter verstopfen.', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 4.75, 5.85, 1.65, 'LuBan', C.red, 'Kein Benzin beimischen!', 'Das schadet modernen Dieselmotoren.', { fx: 'flyL', dur: 450 }, { br: true, size: 17 });
    foot(s, 'Zeiträume nach DIN EN 590 · Grenzwerte: Filtrierbarkeit (CFPP)');
  }

  // ===== WARMLAUFEN / LEERLAUF =====
  await ask(deck, 'c3m', {
    kicker: 'Motor · Leerlauf', q: 'Morgens bei −5 °C: den Motor erst 10 Minuten warmlaufen lassen?', qsize: 30, ico: 'LuThermometer',
    answers: [
      ['LuX', 'Nein!', 'Sofort losfahren – die ersten Kilometer ohne Vollgas und ohne hohe Drehzahl.', C.red],
      ['LuScale', 'Verboten:', 'Motor unnötig laufen lassen (§ 30 Abs. 1 StVO) – 80 € Bußgeld.'],
      ['LuHeater', 'Zum Heizen oder Kühlen in der Pause', 'gibt es Standheizung und Standklimaanlage. Beim Be- und Entladen Motor aus – außer er treibt Kran, Kipper oder Pumpe an.', C.gr],
    ],
    notes:
      '▶ Sagen: „Viele glauben: Diesel muss warmlaufen. Stimmt das?“\n' +
      '❓ Abstimmen lassen: Wer würde warmlaufen lassen?\n' +
      '🖱 Klick 1–3: je eine Antwort.\n' +
      '✅ Nein. Warmlaufen im Stand verschleißt den Motor und kostet Diesel. § 30 Abs. 1 StVO: unnötiger Lärm und vermeidbare Abgasbelästigungen sind verboten, insbesondere Motoren unnötig laufen lassen. BKat Nr. 117: 80 €, kein Punkt.\n' +
      '💡 Bei längerem Stillstand (Bahnübergang, Stau, Laderampe) Motor aus. Viele Lkw haben dafür Start-Stopp oder Leerlaufabschaltung.\n' +
      '➜ „Kurzes Quiz zum Motor.“',
  });

  quiz(deck, 'c3m', {
    kicker: 'Quiz Motor', q: 'Warum nennt man den Dieselmotor auch Selbstzündungsmotor?', size: 32,
    opts: ['Weil eine Zündkerze den Diesel entzündet', 'Weil sich der Diesel in der stark verdichteten, heißen Luft selbst entzündet', 'Weil der Motor ohne Anlasser startet'], ok: 1,
    why: 'Die Luft wird beim Verdichten so heiß, dass sich der eingespritzte Diesel von selbst entzündet (Prüfungsfrage 2.7.03-201).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Vorglühen hilft nur beim Kaltstart – es zündet den Diesel nicht.\n➜ „Weiter zu Kapitel 3: Kupplung und Getriebe.“',
  });
};
