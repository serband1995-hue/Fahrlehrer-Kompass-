// Abend 3 · C6 Kapitel 3 ABS, 4 Kontrolle, 5 HU/SP, 6 Begrenzer/Fahrtenschreiber, Abschluss, Ende
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, steps, write, takeaway, foot, svgImg, chapter, roadV, veh, motion } = require('../gs');
const { icon } = require('../lib');
const { warnSym } = require('../sym');

sec('c6a', 'C6  ·  ABS', C.bl, 'bg_blue.jpg');
sec('c6k', 'C6  ·  KONTROLLE', C.pu, 'bg_pu.jpg');
sec('c6h', 'C6  ·  HU UND SP', 'C9A227', 'bg_am.jpg');
sec('c6b', 'C6  ·  BEGRENZER', C.gr, 'bg_gr.jpg');
sec('c6e', 'C6  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

// Manometer (gleich wie in C5)
const MX = 9.0, MY = 3.6, MR = 1.75, MAXB = 14;
const mAng = b => (210 - (b / MAXB) * 240) * Math.PI / 180;
const mPt = (b, r) => [MX + r * Math.cos(mAng(b)), MY - r * Math.sin(mAng(b))];

module.exports = async (deck) => {
  // ===== KAPITEL 3 ABS =====
  await chapter(deck, 'c6a', { num: 3, ttl: 'ABS', sub: 'Die Räder blockieren nicht – der Lkw bleibt lenkbar.', ico: 'LuCircleDot', notes:
    '▶ Sagen: „Kapitel 3: das ABS – im Gesetz heißt es Automatischer Blockierverhinderer, ABV.“\n🖱 Keine Klicks.\n➜ „Was bringt es in der Gefahr?“' });
  // ===== ABS (fließend: ohne und mit ABS) =====
  const SK = (on, len) => ({ on, len });
  const AF = [
    { t: { x: 10.0, y: 5.6, r: 0, sk: 0, mode: 0 }, hold: true, cap: 'Vor euch steht plötzlich ein Auto. Vollbremsung!', note: '▶ Sagen: „Ein Auto steht plötzlich auf eurer Spur. Ihr macht eine Vollbremsung und wollt links vorbei.“\n❓ Frage auf der Folie: „Kann der Lkw noch ausweichen?“ – abstimmen lassen.\n🖱 Klick: Bremsung ohne ABS (läuft von selbst).\n➜ „Zuerst ohne ABS.“' },
    { t: { x: 10.0, y: 5.15, r: 0, sk: 0.45, mode: 1 }, cap: 'Ohne ABS blockieren die Räder. Der Lkw rutscht geradeaus – lenken bringt nichts.' },
    { t: { x: 10.0, y: 4.72, r: 0, sk: 0.88, mode: 1 } }, { t: { x: 10.0, y: 4.38, r: 0, sk: 1.22, mode: 1 } },
    { t: { x: 10.0, y: 4.12, r: 0, sk: 1.48, mode: 1 }, hold: true, note: '▶ „Blockierte Räder übertragen keine Seitenkraft – der Lkw rutscht geradeaus, auch wenn ihr lenkt. Er trifft das Auto.“\n🖱 Klick: noch einmal – jetzt mit ABS.\n➜ „Und mit ABS?“' },
    { t: { x: 10.0, y: 5.6, r: 0, sk: 0, mode: 2 }, hold: true, cap: 'Noch einmal – jetzt mit ABS.', note: '▶ „Gleiche Lage, jetzt mit ABS.“\n🖱 Klick: Bremsung mit ABS (läuft von selbst).\n➜ „Schaut auf die Räder.“' },
    { t: { x: 9.92, y: 5.05, r: -4, sk: 0, mode: 2 }, cap: 'Mit ABS drehen die Räder weiter. Ihr könnt bremsen und gleichzeitig ausweichen.' },
    { t: { x: 9.6, y: 4.45, r: -11, sk: 0, mode: 2 } }, { t: { x: 9.05, y: 3.75, r: -15, sk: 0, mode: 2 } }, { t: { x: 8.5, y: 3.05, r: -10, sk: 0, mode: 2 } },
    { t: { x: 8.25, y: 2.55, r: -3, sk: 0, mode: 2 }, hold: true, answer: true, note: '▶ „Das ABS regelt den Schlupf: Die Räder drehen knapp vor dem Blockieren weiter. Der Lkw bleibt lenkbar – ihr kommt am Auto vorbei.“\n✅ Prüfungsfrage 2.7.06-101: bestmögliche Bremsung auch bei Glätte, Lenkfähigkeit bleibt weitgehend erhalten – NICHT: verhindert Aquaplaning. 2.7.06-103/-104: kein Blockieren, lenkbar, Bremsen und Ausweichen möglich – NICHT: schneller durch Kurven, weniger Kippgefahr.\n💡 Auf Schnee oder Schotter kann der Bremsweg mit ABS sogar länger sein – der Gewinn ist die Lenkbarkeit.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Wie bremst ihr richtig mit ABS?“' },
  ];
  await motion(deck, 'c6a', {
    kicker: 'ABS', ttl: 'Bremsen und lenken', frames: AF, dur: 480, holdDur: 800,
    question: 'Vollbremsung – kann der Lkw noch am Auto vorbei?',
    answer: 'Nur mit ABS: Die Räder drehen weiter, der Lkw bleibt lenkbar. Ohne ABS rutscht er geradeaus.',
    legend: 'Draufsicht · schematisch',
    scene: async (s, f) => {
      roadV(s, 7.3, 1.5, 3.6, 5.1, { name: 'str' });
      veh(s, 'car_r.png', 10.0, 2.4, 0, '!!auto');
      const on = f.mode === 1;
      for (const [k, dx] of [[1, -0.25], [2, 0.25]]) s.rrect(10.0 + dx - 0.05, 5.95 - f.sk, 0.1, Math.max(f.sk, 0.02), { fill: '050505', ft: on ? 10 : 100, rr: 0.5, name: '!!sp' + k });
      veh(s, 'truck.png', f.x, f.y, f.r, '!!lkw', { scale: 0.85 });
      const hit = f.mode === 1 && f.sk > 1.4;
      s.oval(9.6, 2.65, 0.8, 0.8, { line: C.red, lw: 3, lt: hit ? 0 : 100, name: '!!knall' });
      const lab = f.mode === 0 ? '' : (f.mode === 1 ? 'ohne ABS: blockiert – nicht lenkbar' : 'mit ABS: lenkbar – ausweichen');
      s.text(lab, { x: 11.05, y: 3.3, w: 2.1, h: 0.9, size: 15, bold: true, color: f.mode === 1 ? C.red : C.gr, name: '!!t1' });
    },
  });
  {
    const absImg = await svgImg(warnSym('abs', '#F2C230'), 512, 512, 0.6);
    const s = base(deck, 'c6a', { notes:
      '▶ Sagen: „ABS ist bei Lkw über 3,5 t Pflicht, wenn sie schneller als 60 km/h fahren können.“\n' +
      '🖱 Klick 1: Leuchte beim Start · Klick 2: Leuchte bleibt an · Klick 3: richtig bremsen.\n' +
      '✅ § 41b StVZO. EU-Recht: Die ABS-Leuchte muss beim Einschalten der Zündung aufleuchten (Selbsttest). Manche Fehler erkennt das System erst über etwa 10 km/h – darum geht die Leuchte bei manchen Lkw erst nach dem Anfahren aus (herstellerabhängig). Bleibt sie an: ABS ganz oder teilweise aus, die normale Bremse wirkt, Räder können aber blockieren → vorsichtig fahren, Werkstatt (§ 23 Abs. 1 StVO: Fahrer sorgt für vorschriftsmäßigen Zustand).\n' +
      '✅ Prüfungsfrage 2.7.01-139: Mit ABV schlagartig und mit maximaler Pedalkraft bremsen – nicht pumpen.\n' +
      '➜ „Kapitel 4: Wie kontrolliert ihr die Bremse?“' });
    kick(s, 'ABS'); title(s, 'Leuchte und richtig bremsen');
    card(s, 0.7, 2.05, 3.4, 4.45, {});
    s.rrect(1.3, 2.5, 2.2, 2.2, { fill: '0A0F16', line: '3C4656', lw: 2, rr: 0.15 });
    s.img(absImg, { x: 1.55, y: 2.75, w: 1.7, h: 1.7 });
    s.text('ABS-Kontrollleuchte', { x: 0.8, y: 4.85, w: 3.2, h: 0.4, size: 16, bold: true, color: C.txt, align: 'center' });
    s.text('Symbol je nach Hersteller', { x: 0.8, y: 5.25, w: 3.2, h: 0.35, size: 12, italic: true, color: C.dim, align: 'center' });
    await point(s, 4.35, 2.05, 8.28, 1.4, 'LuPower', C.gr, 'Beim Start leuchtet sie kurz auf –', 'Selbsttest. Dann geht sie aus, bei manchen Lkw erst nach dem Anfahren.', CLICK, { br: true, size: 17 });
    await point(s, 4.35, 3.58, 8.28, 1.4, 'LuTriangleAlert', 'F2C230', 'Bleibt sie an: ABS ist aus.', 'Die Bremse wirkt – aber die Räder können blockieren. Vorsichtig fahren, Werkstatt.', CLICK, { br: true, size: 17 });
    await point(s, 4.35, 5.11, 8.28, 1.4, 'LuFootprints', C.red, 'Vollbremsung mit ABS:', 'Pedal schlagartig und mit voller Kraft treten und halten – nicht pumpen!', CLICK, { br: true, size: 17 });
  }

  // ===== KAPITEL 4 KONTROLLE =====
  await chapter(deck, 'c6k', { num: 4, ttl: 'Kontrolle der Bremse', sub: 'Was ihr vor der Fahrt prüft – und woran ihr einen Fehler erkennt.', ico: 'LuListChecks', notes:
    '▶ Sagen: „Kapitel 4: Der Fahrer ist verantwortlich, dass die Bremse in Ordnung ist.“\n🖱 Keine Klicks.\n➜ „Was gehört vor jeder Schicht dazu?“' });
  {
    const s = base(deck, 'c6k', { notes:
      '▶ Sagen: „Vor jeder Schicht prüft ihr die Bremse. Das verlangt die Berufsgenossenschaft.“\n' +
      '🖱 Klick 1–5: je ein Punkt.\n' +
      '✅ DGUV Vorschrift 70 § 36: Der Fahrer prüft vor jeder Arbeitsschicht die Wirksamkeit der Betätigungs- und Sicherheitseinrichtungen; Mängel melden, bei Gefahr Betrieb einstellen. DGUV Grundsatz 314-002 Nr. 2.3.2: Luftbehälter entwässert (wenn nicht automatisch), Lufttrockner funktionsfähig, Anlage dicht, maximaler Vorratsdruck erreicht, Druckwarnung funktioniert, Bremsprobe.\n' +
      '✅ Rechtsprechung (OLG Düsseldorf, 28.01.2014): Bei der Abfahrtkontrolle genügt eine Bremsprobe – Risse in den Bremsscheiben durch die Felgen suchen muss der Fahrer nicht.\n' +
      '➜ „Wie prüft ihr die Dichtheit genau?“' });
    kick(s, 'Kontrolle'); title(s, 'Vor jeder Schicht: Bremse prüfen');
    const P = [['LuDroplets', C.bl, 'Entwässern', 'wenn keine automatischen Ventile – kommt Wasser, ist der Trockner defekt'], ['LuGauge', C.or, 'Druck aufbauen', 'der volle Vorratsdruck wird erreicht'], ['LuEar', C.pu, 'Dicht?', 'kein Zischen, Druck fällt nicht ab'], ['LuSiren', C.red, 'Druckwarnung', 'funktioniert – Prüfung nach Betriebsanleitung'], ['LuFootprints', C.gr, 'Bremsprobe', 'gleich nach dem Losfahren – wirkt sie gleichmäßig?']];
    for (let k = 0; k < 5; k++) {
      const y = 2.0 + k * 0.92;
      await point(s, 0.7, y, 11.93, 0.8, P[k][0], P[k][1], P[k][2] + ':', P[k][3], CLICK, { size: 17 });
    }
  }
  // Dichtheit (Manometer-Morph)
  let dial = '';
  const Pt = (x, y) => `${((x - MX + MR + 0.3) * 100).toFixed(1)} ${((y - MY + MR + 0.3) * 100).toFixed(1)}`;
  { const [x1, y1] = mPt(0, MR), [x2, y2] = mPt(MAXB, MR); dial += `<path d="M ${Pt(x1, y1)} A ${MR * 100} ${MR * 100} 0 1 1 ${Pt(x2, y2)}" fill="none" stroke="#3C4656" stroke-width="12"/>`; }
  for (let b = 0; b <= MAXB * 2; b++) { const v = b / 2, [a, c] = mPt(v, MR - (b % 4 ? (b % 2 ? 0.08 : 0.14) : 0.24)), [d, e] = mPt(v, MR + 0.04); dial += `<line x1="${Pt(a, c).split(' ')[0]}" y1="${Pt(a, c).split(' ')[1]}" x2="${Pt(d, e).split(' ')[0]}" y2="${Pt(d, e).split(' ')[1]}" stroke="#A9B6C6" stroke-width="${b % 4 ? 2 : 6}"/>`; }
  const dialImg = await svgImg(dial, (MR + 0.3) * 200, (MR + 0.3) * 200, 2);
  const BAR = [12.0, 11.4, 10.8];
  await steps(deck, 'c6k', {
    kicker: 'Kontrolle', ttl: 'Ist die Anlage dicht?',
    ask: { q: 'Wie viel Druck darf bei einer Vollbremsung verloren gehen?', a: 'Höchstens 0,7 bar. Mehr heißt: undicht oder zu großer Zylinderhub.', at: 1 },
    list: ['Voll füllen, Motor aus', 'Einmal voll bremsen', 'Mehr als 0,7 bar weg?'],
    caps: [
      'Lkw mit Keilen sichern, bis zum Abschaltdruck füllen, Motor aus. Hören: zischt es irgendwo?',
      'Einmal das Bremspedal voll durchtreten. Fällt der Druck um höchstens 0,7 bar, ist alles in Ordnung.',
      'Fällt er mehr, verliert die Anlage zu schnell Luft – undicht oder zu großer Zylinderhub. Werkstatt!',
    ],
    notes: [
      '▶ Sagen: „Ein einfacher Test: Anlage voll füllen, Motor aus, Manometer ablesen. Und hinhören – jedes Zischen ist verdächtig.“\n💡 Wie lange und wie viel Druckverlust ohne Bremsen erlaubt ist, steht in der Betriebsanleitung.\n➜ „Jetzt einmal voll bremsen.“',
      '▶ „Einmal voll durchtreten – der Druck sinkt ein wenig. Bis 0,7 bar ist unbedenklich.“\n✅ Prüfungsfrage 2.7.06-231: maximal unbedenklicher Druckabfall bei einer Vollbremsung mit voll gefülltem Behälter: 0,7 bar.\n➜ „Und wenn mehr?“',
      '▶ „Dann fällt der Luftvorrat zu schnell ab – nach wenigen Bremsungen ist die Wirkung schlechter.“\n✅ Prüfungsfrage 2.7.06-232 (Abschaltdruck etwa 10–13 bar): Druckabfall über 0,7 bar ist problematisch, weil der Luftvorrat zu schnell abfällt und die Bremswirkung schlechter wird. Ursache oft Undichtigkeit oder zu großer Zylinderhub (Beläge, Nachstellung).\n➜ „Noch zwei Punkte: Bremsprobe und Beläge.“',
    ],
    legend: 'Vorratsdruck · Beispielwerte',
    scene: async (s, i) => {
      s.oval(MX - MR - 0.4, MY - MR - 0.4, (MR + 0.4) * 2, (MR + 0.4) * 2, { fill: '0D141E', line: '2A3B52', lw: 2, name: '!!mface' });
      s.img(dialImg, { x: MX - MR - 0.3, y: MY - MR - 0.3, w: (MR + 0.3) * 2, h: (MR + 0.3) * 2, name: '!!mdial' });
      for (let b = 0; b <= MAXB; b += 2) { const [x, y] = mPt(b, MR - 0.52); s.text(String(b), { x: x - 0.25, y: y - 0.17, w: 0.5, h: 0.34, size: 14, bold: true, color: C.mut, align: 'center', valign: 'middle', name: '!!mz' + b }); }
      const a = mAng(BAR[i]), L = MR - 0.2;
      s.rect(MX - L / 2 + (L / 2) * Math.cos(a), MY - 0.03 - (L / 2) * Math.sin(a), L, 0.06, { fill: C.or, rotate: -a * 180 / Math.PI, name: '!!mzeiger', glow: 6, glowColor: C.or });
      s.oval(MX - 0.17, MY - 0.17, 0.34, 0.34, { fill: '55606F', name: '!!mnabe' });
      s.text(BAR[i].toFixed(1).replace('.', ',') + ' bar', { x: MX - 1.0, y: MY + 0.55, w: 2.0, h: 0.5, size: 24, bold: true, color: C.txt, align: 'center', name: '!!digi' });
      // Ergebnis rechts
      const ok = i === 1, bad = i === 2;
      s.text(i === 0 ? 'Start: 12,0 bar' : (ok ? '− 0,6 bar' : '− 1,2 bar'), { x: 11.35, y: 2.3, w: 1.85, h: 0.5, size: 20, bold: true, color: i === 0 ? C.mut : (ok ? C.gr : C.red), name: '!!diff' });
      s.text(i === 0 ? 'Motor aus' : (ok ? 'in Ordnung' : 'zu viel – Werkstatt'), { x: 11.35, y: 2.85, w: 1.85, h: 0.8, size: 16, bold: true, color: i === 0 ? C.dim : (ok ? C.gr : C.red), name: '!!erg' });
      s.text('Grenze: 0,7 bar je Vollbremsung', { x: 11.35, y: 4.6, w: 1.85, h: 0.7, size: 13, color: C.mut, name: '!!gr' });
      if (bad) s.img(await icon('LuWind', C.red), { x: 11.35, y: 3.75, w: 0.5, h: 0.5, name: '!!leck' });
    },
  });
  {
    const s = base(deck, 'c6k', { notes:
      '▶ Sagen: „Die Bremsprobe macht ihr gleich nach dem Losfahren – bei geringem Tempo, ohne Verkehr hinter euch zu gefährden.“\n' +
      '🖱 Klick 1: Bremsprobe · Klick 2: wann unerlässlich · Klick 3: Beläge.\n' +
      '✅ Prüfungsfrage 2.7.02-017: Bremsprobe, um die Wirkung der Betriebsbremse zu prüfen. 2.7.02-020: unerlässlich bei Übernahme eines anderen Fahrzeugs und nach längerer Standzeit. Beläge: bei Scheibenbremsen meist elektrische Verschleißanzeige im Display; Wartung in der Werkstatt (2.7.08-207).\n' +
      '➜ „Kapitel 5: Wer prüft den Lkw regelmäßig?“' });
    kick(s, 'Kontrolle'); title(s, 'Bremsprobe und Beläge');
    await point(s, 0.7, 2.05, 11.93, 1.35, 'LuFootprints', C.gr, 'Bremsprobe gleich nach dem Losfahren:', 'zieht der Lkw gerade, greift die Bremse gleichmäßig und kräftig?', CLICK, { size: 18 });
    await point(s, 0.7, 3.6, 11.93, 1.35, 'LuRefreshCw', C.or, 'Unbedingt bei:', 'Übernahme eines anderen Fahrzeugs und nach längerer Standzeit.', CLICK, { size: 18 });
    await point(s, 0.7, 5.15, 11.93, 1.35, 'LuDisc', C.pu, 'Bremsbeläge:', 'Verschleißanzeige im Display beachten – Wechsel und Wartung macht die Werkstatt.', CLICK, { size: 18 });
  }

  // ===== KAPITEL 5 HU UND SP =====
  await chapter(deck, 'c6h', { num: 5, ttl: 'HU und SP', sub: 'Hauptuntersuchung und Sicherheitsprüfung – wann, was und was es kostet, wenn man sie verpasst.', ico: 'LuClipboardCheck', notes:
    '▶ Sagen: „Kapitel 5: Lkw müssen öfter zur Prüfung als Pkw.“\n🖱 Keine Klicks.\n➜ „Wie oft?“' });
  {
    const s = base(deck, 'c6h', { notes:
      '▶ Sagen: „Lkw über 3,5 t müssen jedes Jahr zur Hauptuntersuchung. Schwere Lkw zusätzlich zur Sicherheitsprüfung – immer in der Mitte zwischen zwei HU.“\n' +
      '🖱 Klick 1: 3,5 bis 7,5 t · Klick 2: 7,5 bis 12 t · Klick 3: über 12 t.\n' +
      '✅ StVZO Anlage VIII Nr. 2.1: HU alle 12 Monate bei Lkw über 3,5 t. SP alle 6 Monate: über 7,5 bis 12 t nach den ersten 36 Monaten, über 12 t nach den ersten 24 Monaten. Die SP-Frist zählt ab der letzten HU. SP darf einen Monat früher gemacht werden, ohne dass sich die Frist verschiebt.\n' +
      '💡 SP prüft Fahrgestell, Fahrwerk, Lenkung, Reifen, Räder und Bremsanlage – auch in anerkannten Werkstätten. HU nur Prüfingenieure/Sachverständige.\n' +
      '➜ „Woran sieht man, dass der Lkw geprüft ist?“' });
    kick(s, 'HU und SP'); title(s, 'Wie oft zur Prüfung?');
    const X0 = 3.0, XS = 0.16; // Zoll je Monat
    s.lineS(X0, 6.0, X0 + 48 * XS + 0.2, 6.0, { color: C.dim, lw: 1.5, endArrow: 'triangle' });
    for (const m of [0, 12, 24, 36, 48]) { s.rect(X0 + m * XS - 0.01, 5.92, 0.02, 0.16, { fill: C.dim }); s.text(m ? (m / 12) + (m === 12 ? ' Jahr' : ' Jahre') : 'neu', { x: X0 + m * XS - 0.6, y: 6.1, w: 1.2, h: 0.3, size: 12, color: C.dim, align: 'center' }); }
    const R = [['3,5 – 7,5 t', []], ['7,5 – 12 t', [42]], ['über 12 t', [30, 42]]];
    for (let k = 0; k < 3; k++) {
      const y = 2.15 + k * 1.2;
      card(s, 0.7, y, 11.93, 1.0, {}, CLICK);
      s.text(R[k][0], { x: 0.9, y, w: 2.0, h: 1.0, size: 18, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
      for (const m of [12, 24, 36, 48]) {
        s.oval(X0 + m * XS - 0.3, y + 0.2, 0.6, 0.6, { fill: C.bl, line: C.bl }, { fx: 'zoom', dur: 200 });
        s.text('HU', { x: X0 + m * XS - 0.3, y: y + 0.2, w: 0.6, h: 0.6, size: 12, bold: true, color: C.dark, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 100 });
      }
      for (const m of R[k][1]) {
        s.rrect(X0 + m * XS - 0.3, y + 0.2, 0.6, 0.6, { fill: C.or, line: C.or, rr: 0.15 }, { fx: 'zoom', dur: 200 });
        s.text('SP', { x: X0 + m * XS - 0.3, y: y + 0.2, w: 0.6, h: 0.6, size: 12, bold: true, color: C.dark, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 100 });
      }
      const txt = ['HU jedes Jahr', 'SP ab dem 4. Jahr', 'SP ab dem 3. Jahr'][k];
      s.text(txt, { x: X0 + 48 * XS + 0.45, y, w: 1.75, h: 1.0, size: 14, bold: true, color: k ? C.or : C.bl, valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
  }
  {
    const s = base(deck, 'c6h', { notes:
      '▶ Sagen: „Die HU-Plakette kennt ihr vom Pkw – hinten am Kennzeichen. Für die SP gibt es eine Prüfmarke auf dem SP-Schild.“\n' +
      '🖱 Klick 1: Nachweis · Klick 2: geringe Mängel · Klick 3: erhebliche Mängel · Klick 4: verkehrsunsicher.\n' +
      '✅ § 29 Abs. 2 StVZO (Plakette, Prüfmarke), Anlage VIII Nr. 3.1.4: geringe Mängel – Plakette, beheben binnen eines Monats; erhebliche/gefährliche Mängel – keine Plakette, Nachprüfung spätestens nach einem Monat; verkehrsunsicher – Plakette wird entfernt, Fahrzeug darf nicht mehr fahren. Bericht und SP-Protokoll aufbewahren und auf Verlangen aushändigen (§ 29 Abs. 10).\n' +
      '➜ „Und was kostet es, wenn die Frist überzogen ist?“' });
    kick(s, 'HU und SP'); title(s, 'Nachweis und Mängel');
    await point(s, 0.7, 2.05, 11.93, 1.0, 'LuBadgeCheck', C.bl, 'Nachweis:', 'HU-Plakette hinten am Kennzeichen – SP-Prüfmarke auf dem SP-Schild. Prüfbericht aufbewahren.', CLICK, { size: 17 });
    await point(s, 0.7, 3.2, 11.93, 1.0, 'LuCircleCheck', C.gr, 'Geringe Mängel:', 'Plakette gibt es – Mängel innerhalb eines Monats beheben.', CLICK, { size: 17 });
    await point(s, 0.7, 4.35, 11.93, 1.0, 'LuTriangleAlert', C.or, 'Erhebliche Mängel:', 'keine Plakette – nach der Reparatur Nachprüfung spätestens nach einem Monat.', CLICK, { size: 17 });
    await point(s, 0.7, 5.5, 11.93, 1.0, 'LuOctagonAlert', C.red, 'Verkehrsunsicher:', 'Plakette wird entfernt – der Lkw darf nicht mehr fahren.', CLICK, { size: 17 });
  }
  {
    const s = base(deck, 'c6h', { notes:
      '▶ Sagen: „Wer zahlt, wenn die HU abgelaufen ist? Der Halter – also meist die Firma. Wer mit kaputten Bremsen fährt, zahlt aber selbst.“\n' +
      '🖱 Klick 1: Tabelle Halter · Klick 2: Fahrer · Klick 3: Halter bei unsicherem Lkw.\n' +
      '✅ BKat Nr. 186.1 (SP-pflichtiges Fahrzeug, Halter): bis 2 Monate 15 €, über 2 bis 4 Monate 25 €, über 4 bis 8 Monate 60 € + 1 Punkt, über 8 Monate 75 € + 1 Punkt. Andere Fahrzeuge (186.2): erst ab 2 Monaten, über 8 Monate 60 € + 1 Punkt. BKat 214.1 (Fahrer): Lkw in Betrieb genommen, Verkehrssicherheit wesentlich beeinträchtigt, insbesondere Bremsen: 180 € + 1 Punkt. BKat 189.2.1 (Halter): angeordnet oder zugelassen: 270 € + 1 Punkt. Punkte: FeV Anlage 13 Nr. 3.5.\n' +
      '➜ „Letztes Kapitel: Begrenzer und Fahrtenschreiber.“' });
    kick(s, 'HU und SP'); title(s, 'Was es kostet');
    card(s, 0.7, 2.05, 6.6, 4.45, { line: 'C9A227' }, CLICK);
    s.text('HU/SP überzogen – zahlt der Halter', { x: 0.95, y: 2.15, w: 6.2, h: 0.45, size: 17, bold: true, color: 'C9A227' }, { fx: 'fade', dur: 200 });
    const T = [['bis 2 Monate', '15 €'], ['über 2 bis 4 Monate', '25 €'], ['über 4 bis 8 Monate', '60 € + 1 Punkt'], ['über 8 Monate', '75 € + 1 Punkt']];
    T.forEach(([a, b], k) => {
      const y = 2.8 + k * 0.78;
      s.rect(0.95, y + 0.66, 6.1, 0.015, { fill: C.line }, { fx: 'fade', dur: 100 });
      s.text(a, { x: 0.95, y, w: 3.3, h: 0.66, size: 17, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 100 });
      s.text(b, { x: 4.3, y, w: 2.75, h: 0.66, size: 18, bold: true, color: k >= 2 ? C.red : C.txt, align: 'right', valign: 'middle' }, { fx: 'fade', dur: 100 });
    });
    s.text('Lkw mit SP-Pflicht · andere Fahrzeuge etwas weniger', { x: 0.95, y: 5.95, w: 6.2, h: 0.4, size: 12, italic: true, color: C.dim }, { fx: 'fade', dur: 100 });
    await point(s, 7.55, 2.05, 5.08, 2.1, 'LuUser', C.red, 'Fahrer fährt Lkw mit kaputten Bremsen:', '180 € + 1 Punkt', CLICK, { br: true, size: 18, bodyCol: C.red });
    await point(s, 7.55, 4.4, 5.08, 2.1, 'LuBuilding2', C.or, 'Halter lässt das zu:', '270 € + 1 Punkt', CLICK, { br: true, size: 18, bodyCol: C.or });
  }

  // ===== KAPITEL 6 BEGRENZER UND FAHRTENSCHREIBER =====
  await chapter(deck, 'c6b', { num: 6, ttl: 'Begrenzer und Fahrtenschreiber', sub: 'Was eingebaut sein muss – und wie oft es geprüft wird.', ico: 'LuGauge', notes:
    '▶ Sagen: „Letztes Kapitel: Geschwindigkeitsbegrenzer und Prüfung des Fahrtenschreibers.“\n🖱 Keine Klicks.\n➜ „Wie schnell kann ein Lkw fahren – und wie schnell darf er?“' });
  {
    // Tacho 0–120 km/h
    const TX = 3.9, TY = 4.45, TR = 1.95, MAXV = 120;
    const tA = v => (210 - (v / MAXV) * 240) * Math.PI / 180, tP = (v, r) => [TX + r * Math.cos(tA(v)), TY - r * Math.sin(tA(v))];
    const Q = (x, y) => `${((x - TX + TR + 0.3) * 100).toFixed(1)} ${((y - TY + TR + 0.3) * 100).toFixed(1)}`;
    const arcP = (v1, v2, r, col, w) => { const [a, b] = tP(v1, r), [c, d] = tP(v2, r); return `<path d="M ${Q(a, b)} A ${r * 100} ${r * 100} 0 ${v2 - v1 > 90 ? 1 : 0} 1 ${Q(c, d)}" fill="none" stroke="${col}" stroke-width="${w}"/>`; };
    let svg = arcP(0, MAXV, TR, '#3C4656', 14);
    for (let v = 0; v <= MAXV; v += 10) { const [a, b] = tP(v, TR - (v % 20 ? 0.12 : 0.24)), [c, d] = tP(v, TR + 0.04); svg += `<line x1="${Q(a, b).split(' ')[0]}" y1="${Q(a, b).split(' ')[1]}" x2="${Q(c, d).split(' ')[0]}" y2="${Q(c, d).split(' ')[1]}" stroke="#A9B6C6" stroke-width="${v % 20 ? 3 : 6}"/>`; }
    const s = base(deck, 'c6b', { notes:
      '▶ Sagen: „Jeder Lkw über 3,5 t hat einen Geschwindigkeitsbegrenzer. Er ist auf höchstens 90 km/h eingestellt – und nicht abschaltbar.“\n' +
      '❓ „Darf ich also 90 fahren?“\n' +
      '✅ Nein. Erlaubt sind für Lkw über 3,5 t auf der Autobahn 80 km/h (§ 18 Abs. 5 StVO), außerorts über 7,5 t 60 km/h, bis 7,5 t 80 km/h (§ 3 Abs. 3 StVO).\n' +
      '🖱 Klick 1: 60 km/h · Klick 2: 80 km/h · Klick 3: 90 km/h Begrenzer · Klick 4: Bußgeld.\n' +
      '✅ § 57c StVZO: Pflicht über 3,5 t, höchstens 90 km/h einschließlich aller Toleranzen, nicht abschaltbar. Einbauschild an der B-Säule (§ 57d). BKat 223 (Fahrer): ohne Begrenzer, falsch eingestellt oder nicht benutzt – 100 € + 1 Punkt; BKat 224 (Halter): 150 € + 1 Punkt.\n' +
      '➜ „Und wer prüft Fahrtenschreiber und Begrenzer?“' });
    kick(s, 'Geschwindigkeitsbegrenzer'); title(s, 'Kann 90 – darf 80');
    s.oval(TX - TR - 0.4, TY - TR - 0.4, (TR + 0.4) * 2, (TR + 0.4) * 2, { fill: '0D141E', line: '2A3B52', lw: 2 });
    s.img(await svgImg(svg, (TR + 0.3) * 200, (TR + 0.3) * 200, 2), { x: TX - TR - 0.3, y: TY - TR - 0.3, w: (TR + 0.3) * 2, h: (TR + 0.3) * 2 });
    for (let v = 0; v <= MAXV; v += 20) { const [x, y] = tP(v, TR - 0.6); s.text(String(v), { x: x - 0.3, y: y - 0.17, w: 0.6, h: 0.34, size: 15, bold: true, color: C.mut, align: 'center', valign: 'middle' }); }
    s.text('km/h', { x: TX - 0.5, y: TY + 0.15, w: 1.0, h: 0.3, size: 13, color: C.dim, align: 'center' });
    let li = 0;
    const mark = async (v, col, lab, anim) => {
      const [x1, y1] = tP(v, TR - 0.35), [x2, y2] = tP(v, TR + 0.3);
      s.lineS(x1, y1, x2, y2, { color: col, lw: 7, glow: 6 }, anim);
      const ly = TY + 0.95 + li++ * 0.33;
      s.rect(TX - 1.2, ly + 0.12, 0.3, 0.08, { fill: col }, { fx: 'fade', dur: 200 });
      s.text(lab, { x: TX - 0.82, y: ly, w: 2.3, h: 0.32, size: 12, bold: true, color: col, valign: 'middle' }, { fx: 'fade', dur: 200 });
    };
    await mark(60, C.bl, '60 außerorts über 7,5 t', CLICK);
    await mark(80, C.gr, '80 Autobahn', CLICK);
    await mark(90, C.red, '90 Begrenzer', CLICK);
    await point(s, 7.6, 2.05, 5.03, 1.4, 'LuLock', C.red, 'Begrenzer: höchstens 90 km/h', 'Pflicht über 3,5 t – nicht abschaltbar.', { fx: 'flyL', dur: 450 }, { br: true, size: 16 });
    await point(s, 7.6, 3.58, 5.03, 1.4, 'LuGauge', C.gr, 'Erlaubt ist weniger:', 'Autobahn 80 km/h – außerorts über 7,5 t nur 60 km/h.', { fx: 'flyL', dur: 450 }, { br: true, size: 16 });
    await point(s, 7.6, 5.11, 5.03, 1.4, 'LuReceiptEuro', C.or, 'Kein oder falsch eingestellter Begrenzer:', 'Fahrer 100 € + 1 Punkt, Halter 150 € + 1 Punkt.', CLICK, { br: true, size: 16 });
  }
  {
    const s = base(deck, 'c6b', { notes:
      '▶ Sagen: „Fahrtenschreiber und Begrenzer werden in einer Fachwerkstatt geprüft. Danach kommt ein Einbauschild an die B-Säule auf der Fahrerseite.“\n' +
      '🖱 Klick 1: Fahrtenschreiber · Klick 2: Begrenzer · Klick 3: Einbauschild.\n' +
      '✅ § 57b StVZO: Fahrtenschreiber mindestens alle 24 Monate prüfen lassen (Halterpflicht), außerdem sofort nach Reparatur, Änderung der Reifengröße, Plombentausch, Kennzeichenwechsel oder wenn die Uhrzeit mehr als 20 Minuten abweicht. § 57d: Begrenzer prüfen nach Einbau, Reparatur, Änderung der Reifengröße oder der Kraftstoffzufuhr – eine feste Frist gibt es nicht; die HU prüft ihn mit. Einbauschild plombiert an der B-Säule.\n' +
      '➜ „Damit ist C6 geschafft. Zeit zum Mitschreiben.“' });
    kick(s, 'Prüfungen'); title(s, 'Fahrtenschreiber und Begrenzer prüfen');
    await point(s, 0.7, 2.05, 11.93, 1.35, 'LuCalendarClock', C.bl, 'Fahrtenschreiber:', 'mindestens alle 24 Monate prüfen – und sofort nach Reparatur, neuer Reifengröße, beim digitalen Gerät auch nach neuem Kennzeichen oder falscher Uhrzeit (über 20 Minuten).', CLICK, { size: 17 });
    await point(s, 0.7, 3.6, 11.93, 1.35, 'LuGauge', C.gr, 'Begrenzer:', 'Prüfung nach Einbau, Reparatur oder neuer Reifengröße – die HU kontrolliert ihn mit.', CLICK, { size: 17 });
    await point(s, 0.7, 5.15, 11.93, 1.35, 'LuTag', 'C9A227', 'Einbauschild:', 'plombiert am Gerät oder an der B-Säule auf der Fahrerseite – zeigt die letzte Prüfung.', CLICK, { size: 17 });
  }

  // ===== ABSCHLUSS C6 =====
  write(deck, 'c6e', {
    ttl: 'Dauerbremsen, Prüfung, Begrenzer', labelW: 3.6, size: 18,
    rows: [
      ['Dauerbremse', 'Pflicht über 9 t – verschleißfrei, bremst nicht bis zum Stand'],
      ['Gefälle', 'vorher zurückschalten, Dauerbremse nutzen – sonst Fading'],
      ['Glätte', 'Dauerbremse klein oder aus – sie bremst nur die Antriebsachse'],
      ['ABS-Bremsung', 'schlagartig, voll treten und halten – nicht pumpen'],
      ['Dichtheit', 'eine Vollbremsung: höchstens 0,7 bar Druckabfall'],
      ['HU / SP', 'HU jedes Jahr – über 7,5 t dazu SP alle 6 Monate (ab 3. bzw. 4. Jahr)'],
      ['Begrenzer', '90 km/h – erlaubt sind auf der Autobahn 80 km/h'],
      ['Fahrtenschreiber', 'Prüfung mindestens alle 24 Monate'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus C6.“\n❓ Vor jedem Klick fragen: „Was gehört hier hin?“\n🖱 Klick 1–8: je eine Lösung.\n✅ Quellen: § 41 Abs. 15, § 57b, § 57c StVZO; StVZO Anlage VIII; § 18 Abs. 5 StVO; Prüfungsfragen 2.7.06-239, -310, -108, 2.7.01-139, 2.7.06-231.\n➜ „Jetzt testen wir C6.“',
  });
  quiz(deck, 'c6e', {
    kicker: 'Quiz C6 · 1', q: 'Warum sollten Sie die Dauerbremse (Retarder) nutzen?', size: 34,
    opts: ['Sie arbeitet verschleißfrei', 'Sie bremst den Lkw bis zum Stillstand', 'Sie entlastet die Betriebsbremse'], ok: [0, 2],
    why: 'Die Dauerbremse ist verschleißfrei und hält die Betriebsbremse kühl. Bis zum Stillstand bremst sie nicht (Prüfungsfrage 2.7.06-239).',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und C.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c6e', {
    kicker: 'Quiz C6 · 2', q: 'Sie treten bei voll gefülltem Luftbehälter einmal das Bremspedal voll durch. Welcher Druckabfall ist unbedenklich?', size: 28,
    opts: ['Bis 0,7 bar', 'Bis 1,2 bar', 'Bis 1,5 bar'], ok: 0,
    why: 'Höchstens 0,7 bar je Vollbremsung. Mehr heißt: Der Luftvorrat fällt zu schnell ab (Prüfungsfragen 2.7.06-231, -232).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A.\n➜ „Und noch eine.“',
  });
  quiz(deck, 'c6e', {
    kicker: 'Quiz C6 · 3', q: 'Wie erreichen Sie mit ABS den kürzesten Bremsweg?', size: 34,
    opts: ['Pedal mehrmals kurz treten (pumpen)', 'Schlagartig und mit maximaler Pedalkraft bremsen', 'Erst leicht, dann immer stärker bremsen'], ok: 1,
    why: 'Voll treten und halten – das ABS regelt selbst. Pumpen verlängert den Bremsweg (Prüfungsfrage 2.7.01-139).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Zum Schluss: Das nehmt ihr mit.“',
  });
  await takeaway(deck, 'c6e', {
    items: [
      ['LuMountain', 'Bergab:', 'vorher zurückschalten, Dauerbremse arbeiten lassen – sonst droht Fading.'],
      ['LuSnowflake', 'Auf Glätte', 'Dauerbremse klein oder aus – nie voll in der Kurve.'],
      ['LuCircleDot', 'ABS:', 'voll treten und halten – bleibt die Leuchte an, ab in die Werkstatt.'],
      ['LuListChecks', 'Vor jeder Schicht:', 'Druck, Dichtheit, Druckwarnung, Bremsprobe.'],
      ['LuClipboardCheck', 'HU jedes Jahr, über 7,5 t auch SP –', 'Begrenzer 90 km/h, erlaubt 80.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C6, die ihr auf jeden Fall wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Das war Abend 3.“',
  });
  // ===== ENDE =====
  {
    const s = base(deck, 'c6e', { bg: 'h_titel.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 3 – die Bremsen. Beim nächsten Mal: C7 – welche Kräfte beim Fahren wirken – und C8 – Ausrüstung, Gewichte und Abmessungen, Sicherheit. Danke fürs Mitmachen, kommt gut nach Hause.“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen.\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.5, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Gute Heimfahrt!', { x: 0.7, y: 2.4, w: 6.5, h: 1.2, size: 54, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900 });
    s.text('Abend 3 geschafft: C5 + C6', { x: 0.7, y: 3.65, w: 6.5, h: 0.6, size: 22, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Nächstes Mal:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'C7  Wirkung von Kräften beim Fahren', options: { color: C.txt, breakLine: true } }, { text: 'C8  Ausrüstung, Beförderung, Sicherheit', options: { color: C.txt } }], { x: 0.7, y: 4.6, w: 6.3, h: 1.4, size: 20 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
