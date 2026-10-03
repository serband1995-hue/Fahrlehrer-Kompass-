// Abend 5 · C10: Lernziele, Kapitel 1 Vorausschauend fahren (Ampel, Drehzahl, Rollen, Leerlauf)
const { C, sec, base, kick, title, card, CLICK, chapter, motion, ask, quiz, veh, svgImg } = require('../gs');
const { icon } = require('../lib');

sec('c10', 'LEKTION C10', C.gr, 'bg_kap.jpg');
sec('c10f', 'C10  ·  VORAUSSCHAUEND FAHREN', C.gr, 'bg_gr.jpg');

module.exports = async (deck) => {
  // ===== LERNZIELE C10 =====
  {
    const s = base(deck, 'c10', { transition: 'black', notes:
      '▶ Sagen: „Willkommen zurück. In C10 geht es ums Geld und um die Umwelt: Wie fahrt ihr sparsam? Was kostet Diesel, CO₂ und Maut? Und wie plant ihr eine Strecke und einen Arbeitstag mit dem Lkw?“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: vorausschauend fahren.“' });
    kick(s, 'Lektion C10 · Wirtschaftlich fahren, Streckenplanung'); title(s, 'Das lernt ihr in C10');
    const T = [['01', 'Vorausschauend fahren', 'Rollen statt bremsen, grüner Drehzahlbereich, Motor aus', '25 Min', C.gr], ['02', 'Fahrzeug und Wartung', 'Reifendruck, Luftleitteile, Gewicht, Luftfilter', '10 Min', C.bl], ['03', 'Umwelt, Antriebe, Maut', 'CO₂, Lärm, E-Lkw und HVO, was die Maut kostet', '15 Min', 'C9A227'], ['04', 'Strecke planen', 'Karte und Maßstab, Lkw-Navi, Höhen und Verbote', '20 Min', C.pu], ['05', 'Zeit planen', 'Durchschnitt 70 km/h, Pausen, Fahrverbote', '15 Min', C.or]];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nehmt ihr mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }

  await chapter(deck, 'c10f', { num: 1, ttl: 'Vorausschauend fahren', sub: 'Wer weit nach vorn schaut, bremst weniger – und spart Diesel.', ico: 'LuLeaf', notes:
    '▶ Sagen: „Kapitel 1: vorausschauend fahren. Ein Sattelzug braucht rund 30 Liter auf 100 Kilometer, euer C-Lkw etwas weniger. Wer geschickt fährt, spart davon einiges.“\n✅ Richtwert 40-t-Sattelzug Fernverkehr: ca. 25–35 l/100 km (Sekundärquellen, große Streuung; siehe FAKTEN_C9_C10).\n🖱 Keine Klicks.\n➜ „Schauen wir zwei Lkw an einer Ampel zu.“' });

  // ===== AMPEL: SPÄT BREMSEN vs. ROLLEN (fließend) =====
  {
    const RD = [{ y: 1.95, lab: 'A · Gas bis zuletzt, dann bremsen', col: C.red }, { y: 3.45, lab: 'B · früh vom Gas, rollen lassen', col: C.gr }], RH = 0.65, SL = 11.6, TS = 0.55, HL = 2.86 * TS / 2;
    const fr = (a, b, o = {}) => ({ ...o, t: { a, b, ...(o.t || {}) } });
    await motion(deck, 'c10f', {
      kicker: 'Vorausschauend fahren', ttl: 'Zwei Lkw, eine Ampel', dur: 520, holdDur: 700,
      question: 'Die Ampel ist rot. Wer von beiden verbraucht weniger Diesel – und warum?',
      answer: 'B: Er rollt früh ohne Gas, muss nicht anhalten und nicht wieder 26 Tonnen aus dem Stand beschleunigen.',
      legend: 'Draufsicht · schematisch · Verbrauchsbalken ohne Maßstab',
      frames: [
        fr(6.7, 6.7, { hold: true, t: { fa: 0, fb: 0, sa: 'Gas', sb: 'Gas' }, cap: 'Zwei gleiche Lkw, beide mit 50 km/h. Vorne ist die Ampel rot.', note: '▶ Sagen: „Zwei gleiche Lkw, je 26 Tonnen, beide mit 50 km/h. Vorne: rote Ampel. Fahrer A fährt mit Gas bis kurz davor. Fahrerin B geht früh vom Gas.“\n❓ Frage auf der Folie stellen – abstimmen lassen.\n🖱 Klick: Die Fahrt läuft (von selbst bis A steht).\n➜ „Los geht’s.“' }),
        fr(7.9, 7.7, { t: { fa: 0.12, fb: 0.03, sa: 'Gas', sb: 'rollt – kein Diesel' }, cap: 'B geht schon jetzt vom Gas. Mit eingelegtem Gang spritzt der Motor keinen Diesel ein.' }),
        fr(9.1, 8.6, { t: { fa: 0.24, fb: 0.04, sa: 'Gas', sb: 'rollt – kein Diesel' } }),
        fr(10.3, 9.4, { t: { fa: 0.28, fb: 0.05, sa: 'bremst hart!', sb: 'rollt', brk: 1 }, cap: 'A bremst hart. Die Bewegungsenergie, die vorher Diesel gekostet hat, wird an den Bremsen zu Wärme.' }),
        fr(10.8, 10.0, { hold: true, t: { fa: 0.29, fb: 0.06, sa: 'steht', sb: 'rollt langsam', brk: 1 }, cap: 'A steht an der roten Ampel. B rollt noch langsam heran.', note: '▶ „A steht. Die ganze Bewegungsenergie ist in den Bremsen verpufft. B rollt noch langsam – und hat dabei fast keinen Diesel gebraucht.“\n💡 Die Schubabschaltung wirkt, solange der Motor über Leerlaufdrehzahl dreht. Wird der Lkw sehr langsam, spritzt der Motor wieder ein – dann zurückschalten.\n🖱 Klick: Die Ampel wird grün (läuft von selbst).\n➜ „Und jetzt wird es grün.“' }),
        fr(10.85, 10.9, { t: { fa: 0.33, fb: 0.07, sa: 'fährt aus dem Stand an …', sb: 'rollt durch', green: 1 }, cap: 'Grün! B rollt einfach durch. A muss 26 Tonnen aus dem Stand beschleunigen.' }),
        fr(11.2, 11.7, { t: { fa: 0.52, fb: 0.2, sa: 'beschleunigt', sb: 'Gas', green: 1 } }),
        fr(11.6, 12.25, { hold: true, answer: true, t: { fa: 0.7, fb: 0.4, sa: 'beschleunigt', sb: 'Gas', green: 1 }, cap: 'B ist weiter – und hat weniger Diesel verbraucht. Anfahren aus dem Stand kostet am meisten.', note: '▶ „B ist schon weiter und hat weniger verbraucht. Das Anfahren aus dem Stand kostet beim schweren Lkw am meisten Diesel. Und A hat auch noch Bremsen und Reifen verschlissen.“\n✅ Schubabschaltung: Rollen mit eingelegtem Gang ohne Gas → keine Einspritzung (Lehrbuchwissen). Prüfungsfrage 2.5.01-015: Verbrauch senken durch vorausschauende Fahrweise, Luftleiteinrichtungen, spezielle Reifen (alle drei richtig).\n💡 Großer Abstand zum Vordermann macht vorausschauendes Fahren erst möglich.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Zweites Werkzeug: der Drehzahlmesser.“' }),
      ],
      scene: async (s, { a, b, fa, fb, sa, sb, brk = 0, green = 0 }) => {
        for (let q = 0; q < 2; q++) {
          const r = RD[q], cy = r.y + RH / 2, x = q ? b : a;
          s.text(r.lab, { x: 5.75, y: r.y - 0.42, w: 4.4, h: 0.36, size: 15, bold: true, color: r.col, valign: 'middle', name: '!!rl' + q });
          s.text(q ? sb : sa, { x: 10.15, y: r.y - 0.42, w: 2.9, h: 0.36, size: 14, bold: true, color: C.txt, align: 'right', valign: 'middle', name: '!!st' + q });
          s.rect(5.75, r.y, 7.3, RH, { fill: C.road, name: '!!road' + q });
          for (let j = 0; j < 9; j++) s.rect(5.9 + j * 0.85, r.y + 0.03, 0.4, 0.03, { fill: '5A6576', name: '!!rm' + q + j });
          s.rect(SL, r.y, 0.07, RH, { fill: C.mark, name: '!!sl' + q });
          // Ampel am Rand
          s.rrect(11.7, r.y + RH + 0.04, 0.62, 0.3, { fill: '161B23', line: '3C4656', lw: 1, rr: 0.4, name: '!!amp' + q });
          s.oval(11.75, r.y + RH + 0.07, 0.24, 0.24, { fill: green ? '4A1C1C' : C.red, glow: green ? undefined : 8, glowColor: C.red, name: '!!ar' + q });
          s.oval(12.03, r.y + RH + 0.07, 0.24, 0.24, { fill: green ? C.gr : '173A2A', glow: green ? 8 : undefined, glowColor: C.gr, name: '!!ag' + q });
          veh(s, 'truck.png', x, cy, 90, '!!tr' + q, { scale: TS });
          const rb = q === 0 && brk;
          [-0.13, 0.13].forEach((o, k) => s.rect(x - HL - 0.02, cy + o - 0.05, 0.06, 0.1, { fill: C.red, ft: rb ? 0 : 100, glow: rb ? 8 : undefined, glowColor: C.red, name: '!!bl' + q + k }));
        }
        // Verbrauch
        s.text('Verbrauch', { x: 5.75, y: 4.62, w: 3, h: 0.32, size: 13, bold: true, color: C.mut, name: '!!vt' });
        [[fa, 'A', C.red], [fb, 'B', C.gr]].forEach(([f, l, c], q) => {
          const y = 5.0 + q * 0.5;
          s.text(l, { x: 5.75, y, w: 0.4, h: 0.36, size: 16, bold: true, color: c, valign: 'middle', name: '!!vl' + q });
          s.rrect(6.2, y + 0.06, 6.0, 0.24, { fill: '1A2433', line: C.line, rr: 0.5, name: '!!vb' + q });
          s.rrect(6.2, y + 0.06, Math.max(0.05, 6.0 * f), 0.24, { fill: c, ft: f ? 0 : 100, rr: 0.5, name: '!!vf' + q });
        });
      },
    });
  }

  // ===== DREHZAHL: FRÜH HOCHSCHALTEN (fließend) =====
  {
    const GX = 8.55, GY = 4.05, R = 1.95, MAX = 2500;
    const ang = rpm => -120 + 240 * rpm / MAX; // Grad, 0 = senkrecht nach oben, im Uhrzeigersinn
    const pol = (rpm, r) => { const a = (ang(rpm) - 90) * Math.PI / 180; return [200 + r * Math.cos(a), 200 + r * Math.sin(a)]; };
    const arc = (r0, r1, r, w, col) => { const [x0, y0] = pol(r0, r), [x1, y1] = pol(r1, r), large = (ang(r1) - ang(r0)) > 180 ? 1 : 0; return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${w}"/>`; };
    let g = `<circle cx="200" cy="200" r="196" fill="#0B1119" stroke="#2A3342" stroke-width="3"/>` + arc(0, MAX, 160, 16, '#2A3342') + arc(1000, 1400, 160, 18, '#38D98A') + arc(2100, MAX, 160, 18, '#FF5C5C');
    for (let r = 0; r <= MAX; r += 100) { const [x0, y0] = pol(r, r % 500 ? 140 : 132), [x1, y1] = pol(r, 150); g += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#A9B6C6" stroke-width="${r % 500 ? 2 : 4}"/>`; }
    for (let r = 0; r <= MAX; r += 500) { const [x, y] = pol(r, 108); g += `<text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" font-family="Lato, Arial" font-size="26" font-weight="bold" fill="#F3F5F8" text-anchor="middle">${r / 100}</text>`; }
    g += `<text x="200" y="300" font-family="Lato, Arial" font-size="18" fill="#738296" text-anchor="middle">× 100 /min</text>`;
    const dial = await svgImg(g, 400, 400, 2);
    const needle = await svgImg(`<path d="M195 205 L198 52 L202 52 L205 205 Z" fill="#FFB547"/><circle cx="200" cy="200" r="16" fill="#3C4656" stroke="#FFB547" stroke-width="4"/>`, 400, 400, 2);
    const fr = (rpm, gang, o = {}) => ({ ...o, t: { rpm, gang, ...(o.t || {}) } });
    await motion(deck, 'c10f', {
      kicker: 'Drehzahl', ttl: 'Früh hochschalten', dur: 480, holdDur: 650,
      question: 'Wann schaltet ihr hoch – und wo soll der Zeiger möglichst stehen?',
      answer: 'Früh hochschalten und im grünen Bereich fahren – dort braucht der Motor am wenigsten Diesel.',
      legend: 'Drehzahlmesser · grüner Bereich ist ein Beispiel – maßgeblich ist euer Drehzahlmesser bzw. die Betriebsanleitung',
      frames: [
        fr(1900, 8, { hold: true, t: { v: 0.9 }, cap: 'Der Zeiger steht hoch, kurz vor Rot. Der Motor dreht unnötig schnell – das kostet Diesel.', note: '▶ Sagen: „Der Lkw beschleunigt im 8. Gang, der Zeiger steht bei 1.900 – kurz vor dem roten Bereich. Laut, durstig, verschleißt.“\n❓ Frage auf der Folie stellen.\n🖱 Klick: Hochschalten (läuft von selbst).\n➜ „Schalten wir hoch.“' }),
        fr(1350, 9, { t: { v: 0.6 }, cap: 'Hochschalten: Der Zeiger fällt. Gleiches Tempo, weniger Umdrehungen.' }),
        fr(1500, 9, { t: { v: 0.65 } }),
        fr(1200, 10, { t: { v: 0.45 } }),
        fr(1150, 12, { hold: true, answer: true, t: { v: 0.35 }, cap: 'Im grünen Bereich: viel Kraft, wenig Diesel. Höchstmöglichen Gang fahren – Automatik im Eco-Modus.', note: '▶ „Jetzt steht der Zeiger im grünen Bereich. Hier hat der Motor viel Kraft und braucht am wenigsten Diesel. Regel: früh hochschalten, im höchstmöglichen Gang fahren.“\n✅ Grüner Drehzahlbereich = Bereich des günstigsten Verbrauchs, beim Diesel-Lkw meist um 1.000–1.400/min; genaue Werte stehen am Drehzahlmesser bzw. in der Betriebsanleitung (Lehrbuchwissen).\n💡 Bei Automatik: Eco-Modus nutzen, Gaspedal gefühlvoll.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und wenn man gar kein Gas braucht?“' }),
      ],
      scene: async (s, { rpm, gang, v }) => {
        s.img(dial, { x: GX - R, y: GY - R, w: 2 * R, h: 2 * R, name: '!!dial' });
        s.img(needle, { x: GX - R, y: GY - R, w: 2 * R, h: 2 * R, rotate: Math.round(ang(rpm) * 10) / 10, name: '!!needle' });
        const zone = rpm >= 2100 ? C.red : rpm <= 1400 && rpm >= 1000 ? C.gr : C.or;
        s.text(String(rpm).replace(/(\d)(\d{3})$/, '$1.$2') + ' /min', { x: GX - 1.1, y: GY + 0.75, w: 2.2, h: 0.45, size: 20, bold: true, color: zone, align: 'center', name: '!!rpm' });
        // Gang + Verbrauch
        s.text('Gang', { x: 11.0, y: 2.2, w: 1.9, h: 0.35, size: 14, bold: true, color: C.mut, align: 'center', name: '!!gl' });
        s.text(String(gang), { x: 11.0, y: 2.55, w: 1.9, h: 1.0, size: 54, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!gang' });
        s.text('Verbrauch', { x: 11.0, y: 3.85, w: 1.9, h: 0.35, size: 14, bold: true, color: C.mut, align: 'center', name: '!!vl' });
        s.rrect(11.65, 4.25, 0.6, 2.0, { fill: '1A2433', line: C.line, rr: 0.15, name: '!!vb' });
        s.rrect(11.65, 4.25 + 2.0 * (1 - v), 0.6, 2.0 * v, { fill: v > 0.7 ? C.red : v > 0.5 ? C.or : C.gr, rr: 0.15, name: '!!vf' });
        s.text('grüner Bereich', { x: GX - 1.1, y: GY - R - 0.4, w: 2.2, h: 0.32, size: 13, bold: true, color: C.gr, align: 'center', name: '!!gb' });
      },
    });
  }

  // ===== ROLLEN – ABER WIE? =====
  await ask(deck, 'c10f', {
    kicker: 'Rollen lassen', q: 'Rollen spart Diesel – aber wie rollt ihr richtig?', ico: 'LuLeaf', qsize: 32,
    answers: [
      ['LuCircleCheck', 'Im Gang rollen, Fuß vom Gas', 'Schubabschaltung: Der Motor spritzt keinen Diesel ein – und die Motorbremse hilft mit.', C.gr],
      ['LuCircleX', 'Im Leerlauf rollen', 'Der Motor läuft weiter und braucht Diesel. Bergab fehlt die Motorbremse – nicht machen!', C.red],
      ['LuCirclePlay', 'Eco-Roll (Automatik)', 'Das Getriebe kuppelt auf ebener Strecke und bei leichtem Gefälle selbst aus und nutzt den Schwung. Zum Bremsen kuppelt es wieder ein.', C.bl],
    ],
    notes:
      '▶ Sagen: „Rollen spart Diesel. Aber wie?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–3: je eine Karte.\n' +
      '✅ Schubabschaltung beim Rollen im Gang (Lehrbuchwissen). Prüfungsfrage 2.5.01-208: Gefälle in einem Gang durchfahren, in dem man wenig bremsen muss – nicht im Leerlauf, nicht mit Zündung aus. Prüfungsfrage 2.5.01-213: Eco-Roll spart, weil die Bewegungsenergie maximal ausgenutzt wird.\n' +
      '💡 Vorausschauender Tempomat (mit GPS) kennt Kuppen und Gefälle und lässt vorher Schwung abfallen – laut Herstellern bis etwa 3–5 % Ersparnis.\n' +
      '➜ „Und wenn der Lkw steht?“',
  });

  // ===== LEERLAUF: WAS KOSTET EINE STUNDE AM TAG? (fließend) =====
  {
    const fr = (liter, lab, o = {}) => ({ ...o, t: { liter, lab, ...(o.t || {}) } });
    await motion(deck, 'c10f', {
      kicker: 'Motor aus!', ttl: 'Leerlauf kostet', dur: 550, holdDur: 700,
      question: 'Ihr wartet jeden Tag eine Stunde am Straßenrand vor dem Kunden – mit laufendem Motor. Wie viel Diesel ist das im Jahr?',
      answer: 'Bei 2 Litern pro Stunde rund 440 Liter Diesel und 1,2 Tonnen CO₂ im Jahr. Dazu ist es verboten: 80 €.',
      legend: 'Beispiel: 2 l pro Stunde Leerlauf (Richtwert 1,5–4 l/h) · 220 Arbeitstage · 1 Kanister = 20 l',
      frames: [
        fr(2, '1 Tag', { hold: true, cap: 'Eine Stunde Warten mit laufendem Motor: etwa 2 Liter Diesel.', note: '▶ Sagen: „Ihr wartet jeden Tag eine Stunde am Straßenrand vor dem Kunden und lasst den Motor laufen – für Heizung oder Klima. Im Leerlauf braucht ein Lkw etwa 2 Liter pro Stunde.“\n❓ Frage auf der Folie stellen – schätzen lassen.\n✅ Leerlaufverbrauch Lkw ca. 1,5–4 l pro Stunde (Richtwert, Sekundärquellen).\n🖱 Klick: Die Tage laufen (von selbst bis zum Jahr).\n➜ „Rechnen wir hoch.“' }),
        fr(10, '1 Woche', { cap: 'Eine Woche: 10 Liter.' }),
        fr(40, '1 Monat', { cap: 'Ein Monat: 40 Liter – zwei Kanister.' }),
        fr(440, '1 Jahr', { hold: true, answer: true, cap: 'Ein Jahr: rund 440 Liter Diesel – 22 Kanister. Das sind etwa 1,2 Tonnen CO₂.', note: '▶ „Im Jahr: 440 Liter Diesel, 22 Kanister. Und rund 1,2 Tonnen CO₂ – für nichts. Außerdem ist es verboten: unnötiges Laufenlassen des Motors kostet 80 Euro.“\n✅ Eigene Rechnung: 1 h × 2 l × 220 Arbeitstage = 440 l; × 2,65 kg CO₂/l ≈ 1,2 t. § 30 Abs. 1 StVO: verboten, Fahrzeugmotoren unnötig laufen zu lassen; BKat Nr. 117: 80 €, kein Punkt (gilt für alle Fahrzeuge, im öffentlichen Verkehrsraum – auf dem Werksgelände verbietet es meist die Hausordnung). Prüfungsfragen 2.5.01-108 (Motor im Stand warmlaufen lassen unterlassen) und 2.5.01-206 (Motor bei längeren Wartezeiten laufen lassen = falsch).\n💡 Standheizung braucht nur etwa 0,1–0,6 l pro Stunde. Ausnahme: Bei leerer Druckluftanlage muss der Motor laufen, bis der Vorrat steht – das ist nötig.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage dazu.“' }),
      ],
      scene: async (s, { liter, lab }) => {
        s.text(lab, { x: 5.75, y: 1.55, w: 3.5, h: 0.6, size: 30, bold: true, color: C.gr, name: '!!lab' });
        s.text(String(liter) + ' l', { x: 9.0, y: 1.45, w: 4.05, h: 0.8, size: 46, bold: true, color: C.txt, align: 'right', name: '!!liter' });
        s.text('Diesel im Leerlauf', { x: 9.0, y: 2.2, w: 4.05, h: 0.32, size: 14, color: C.mut, align: 'right', name: '!!dl' });
        const n = liter / 20, ic = await icon('LuFuel', C.or), icd = await icon('LuFuel', '2A3342');
        for (let k = 0; k < 22; k++) {
          const x = 5.85 + (k % 11) * 0.65, y = 2.85 + Math.floor(k / 11) * 0.95, fill = Math.max(0, Math.min(1, n - k));
          s.img(fill > 0 ? ic : icd, { x, y, w: 0.55, h: 0.55, transparency: fill > 0 ? Math.round(70 - 70 * fill) : 0, name: '!!k' + k });
        }
        s.text(liter >= 440 ? '≈ 1,2 t CO₂' : '', { x: 5.75, y: 4.9, w: 7.3, h: 0.7, size: 30, bold: true, color: C.am, align: 'center', name: '!!co2' });
        s.text(liter >= 440 ? 'und 80 € Bußgeld, wenn der Motor unnötig läuft (§ 30 StVO)' : '', { x: 5.75, y: 5.6, w: 7.3, h: 0.4, size: 15, color: C.mut, align: 'center', name: '!!bgt' });
      },
    });
  }

  await quiz(deck, 'c10f', {
    kicker: 'Prüfungsfrage 2.5.01-213', q: 'Warum trägt der Eco-Roll-Modus zur Reduzierung des Kraftstoffverbrauchs bei? Weil im aktivierten Eco-Roll-Modus die …', size: 26,
    opts: ['… Bewegungsenergie des Fahrzeugs maximal ausgenutzt wird', '… Motorbremswirkung erhöht wird', '… Rollphase des Fahrzeugs verkürzt wird'], ok: [0],
    why: 'Eco-Roll kuppelt aus und lässt den Lkw lange rollen – der Schwung wird genutzt.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.5.01-213: nur A.\n➜ „Kapitel 2: Was spart am Lkw selbst?“',
  });
};
