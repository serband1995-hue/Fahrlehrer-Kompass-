// Abend 2 · C4: Kapitel 5 Licht und Warnleuchten, Abschluss C4, Ende
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, write, takeaway, foot, chapter, lkw, lkwHeck } = require('../gs');
const { icon } = require('../lib');

sec('c4l', 'C4  ·  LICHT UND WARNLEUCHTEN', C.red, 'bg_red.jpg');
sec('c4x', 'C4  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

const { svgImg } = require('../gs');
const { warnSym } = require('../sym');
const warnImg = {};

module.exports = async (deck) => {
  for (const [kd, hex] of [['oel', 'FF5C5C'], ['kuehl', 'FF5C5C'], ['brems', 'FF5C5C'], ['batt', 'FF5C5C'], ['stop', 'FF5C5C'], ['abs', 'F2C230'], ['motor', 'F2C230'], ['adblue', 'F2C230'], ['dpf', 'F2C230'], ['blink', '38D98A'], ['abblend', '38D98A'], ['fern', '3B82F6']]) warnImg[kd + hex] = await svgImg(warnSym(kd, '#' + hex), 512, 512, 0.6);
  await chapter(deck, 'c4l', { num: 5, ttl: 'Licht und Warnleuchten', sub: 'Gesehen werden, richtig warnen – und verstehen, was im Cockpit leuchtet.', ico: 'LuLightbulb', notes:
    '▶ Sagen: „Letztes Kapitel: Licht. Ein Lkw ist nachts bis zu 12 Meter dunkle Wand – als Zug fast 19 Meter – er muss gut zu sehen sein.“\n🖱 Keine Klicks.\n➜ „Welche Leuchten hat ein Lkw, die ein Pkw nicht hat?“' });

  // ===== LEUCHTEN AM LKW (Seiten- und Rückansicht) =====
  {
    const s = base(deck, 'c4l', { notes:
      '▶ Sagen: „Welche Leuchten hat ein Lkw, die ein Pkw nicht hat?“\n' +
      '❓ Sammeln lassen, dann klicken.\n' +
      '🖱 Klick 1: Umrissleuchten · Klick 2: Seitenmarkierungsleuchten · Klick 3: Konturmarkierung seitlich · Klick 4: Konturmarkierung hinten.\n' +
      '✅ Umrissleuchten: Pflicht bei mehr als 2,10 m Breite – vorn weiß, hinten rot (§ 51b StVZO). Seitenmarkierungsleuchten: gelb, Pflicht bei mehr als 6 m Länge (§ 51a Abs. 6 StVZO; Ausnahme u. a. Fahrgestelle mit Fahrerhaus).\n' +
      '✅ Konturmarkierung: rückstrahlende Streifen – seitlich weiß oder gelb, hinten rot oder gelb (§ 53 Abs. 10 StVZO). Pflicht für neue Lkw über 7,5 t und neue Anhänger über 3,5 t seit 10.7.2011, ohne Nachrüstpflicht. Hinten die volle Kontur, seitlich mindestens Linie unten und Ecken oben. Ausgenommen u. a. Sattelzugmaschinen und Fahrgestelle mit Fahrerhaus (§ 53 Abs. 10 Satz 1 Nr. 3 StVZO).\n' +
      '💡 Bei der Abfahrtkontrolle: alle Leuchten an und sauber, Konturmarkierung sauber und vollständig. Verschmutzte Beleuchtung: 20 € (BKat 73).\n' +
      '➜ „Darf ein Lkw auch gelbes Rundumlicht haben?“' });
    kick(s, 'Beleuchtung'); title(s, 'Damit man den Lkw nachts sieht');
    // Seitenansicht (Front links): detaillierter Lkw, nachts abgedunkelt
    const X0 = 0.85, GL = 5.55, F = 0.78, BH = 1.85, BT = GL - (F + BH), BB = GL - (F + 0.07), BX1 = X0 + 1.42, BX2 = X0 + 7.55;
    const SCX = 0.55, SCW = 8.3;
    card(s, SCX, 2.0, SCW, 4.2, {});
    await lkw(s, { L: 7.6, axles: [0.82, 5.55, 6.15], floor: F, boxH: BH }, { x: X0, gy: GL });
    s.rrect(SCX, 2.0, SCW, 4.2, { fill: '070B12', ft: 45, rr: 0.16 });            // nachts: die ganze Karte etwas dunkler
    s.rrect(SCX, 2.0, SCW, 4.2, { line: C.line, lw: 1, rr: 0.16 });
    s.text('Seitenansicht', { x: SCX + 0.15, y: 2.05, w: 3, h: 0.3, size: 12, italic: true, color: C.dim });
    // 1 Umrissleuchten (vorn weiß, hinten rot – oben an den Ecken)
    s.oval(BX1 - 0.1, BT - 0.1, 0.2, 0.2, { fill: C.white, glow: 10, glowColor: C.white }, CLICK);
    s.oval(BX2 - 0.1, BT - 0.1, 0.2, 0.2, { fill: C.red, glow: 10, glowColor: C.red }, { fx: 'zoom', dur: 250 });
    s.text('Umrissleuchten', { x: (BX1 + BX2) / 2 - 1.3, y: BT + 0.2, w: 2.6, h: 0.4, size: 16, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
    // 2 Seitenmarkierungsleuchten (gelb) am unteren Rand des Aufbaus
    for (let k = 0; k < 5; k++) s.oval(BX1 + 0.35 + k * 1.3, BB - 0.2, 0.17, 0.17, { fill: C.am, glow: 9, glowColor: C.am }, k === 0 ? CLICK : { fx: 'zoom', dur: 150 });
    s.text('Seitenmarkierungsleuchten (gelb)', { x: BX1 + 0.2, y: GL + 0.05, w: 4.8, h: 0.4, size: 15, bold: true, color: C.am }, { fx: 'fade', dur: 200 });
    s.lineS(BX1 + 0.35 + 1.3 + 0.085, GL + 0.08, BX1 + 0.35 + 1.3 + 0.085, BB - 0.04, { color: C.am, lw: 1.5 }, { fx: 'fade', dur: 200 });   // Hinweislinie zur zweiten Leuchte
    // 3 Konturmarkierung seitlich: Linie unten + Ecken oben
    s.rect(BX1 + 0.08, BB - 0.08, BX2 - BX1 - 0.16, 0.06, { fill: 'F2D23A', glow: 4, glowColor: 'F2D23A' }, { fx: 'wipeR', c: true, dur: 600 });
    s.rect(BX1 + 0.08, BT + 0.08, 0.5, 0.06, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.rect(BX1 + 0.08, BT + 0.08, 0.06, 0.5, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.rect(BX2 - 0.58, BT + 0.08, 0.5, 0.06, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.rect(BX2 - 0.14, BT + 0.08, 0.06, 0.5, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.text('Konturmarkierung seitlich: gelb oder weiß', { x: BX1 + 0.3, y: BT + 0.85, w: BX2 - BX1 - 0.6, h: 0.4, size: 15, bold: true, color: 'F2D23A', align: 'center' }, { fx: 'fade', dur: 200 });
    // 4 Rückansicht mit Vollkontur
    const RX = 9.35, RK = 1.1, RW = 2.55 * RK, RT = GL - (F + BH) * RK, RB = GL - F * RK;
    card(s, RX - 0.3, 2.0, RW + 0.6, 4.2, {}, CLICK);
    s.text('Rückansicht', { x: RX - 0.2, y: 2.05, w: 2.5, h: 0.3, size: 12, italic: true, color: C.dim }, { fx: 'fade', dur: 150 });
    await lkwHeck(s, { w: 2.55, floor: F, boxH: BH }, { x: RX, gy: GL, k: RK, anim: { fx: 'fade', dur: 200 } });
    s.rrect(RX - 0.3, 2.0, RW + 0.6, 4.2, { fill: '070B12', ft: 45, rr: 0.16 }, { fx: 'fade', dur: 200 });
    s.rrect(RX - 0.3, 2.0, RW + 0.6, 4.2, { line: C.line, lw: 1, rr: 0.16 }, { fx: 'fade', dur: 200 });
    s.rect(RX + 0.07, RT + 0.07, RW - 0.14, RB - RT - 0.14, { line: C.red, lw: 4 }, { fx: 'fade', dur: 300 });
    s.oval(RX - 0.08, RT - 0.12, 0.2, 0.2, { fill: C.red, glow: 8, glowColor: C.red }, { fx: 'zoom', dur: 200 });
    s.oval(RX + RW - 0.12, RT - 0.12, 0.2, 0.2, { fill: C.red, glow: 8, glowColor: C.red }, { fx: 'zoom', dur: 200 });
    s.text('volle Kontur hinten: rot oder gelb', { x: RX - 0.25, y: GL + 0.05, w: RW + 0.5, h: 0.5, size: 14, bold: true, color: C.red, align: 'center' }, { fx: 'fade', dur: 200 });
    // Regeln unten
    s.text([{ text: 'Umrissleuchten: ', options: { bold: true, color: C.txt } }, { text: 'breiter als 2,10 m  ·  ', options: { color: C.mut } }, { text: 'Seitenmarkierung: ', options: { bold: true, color: C.txt } }, { text: 'länger als 6 m  ·  ', options: { color: C.mut } }, { text: 'Kontur: ', options: { bold: true, color: C.txt } }, { text: 'neue Lkw über 7,5 t seit 2011', options: { color: C.mut } }], { x: 0.7, y: 6.32, w: 11.93, h: 0.45, size: 15 });
  }

  // ===== RUNDUMLICHT, ARBEITSSCHEINWERFER =====
  await ask(deck, 'c4l', {
    kicker: 'Rundumlicht', q: 'Panne auf dem Standstreifen. Darf ich das gelbe Rundumlicht einschalten?', qsize: 30, ico: 'LuSiren',
    answers: [
      ['LuX', 'Nein – nur berechtigte Fahrzeuge', 'z. B. Straßendienst, Müllabfuhr, Pannenhilfe, Begleitfahrzeuge – und nur zur Warnung vor Arbeits- oder Unfallstellen, ungewöhnlich langsamen oder übergroßen Fahrzeugen.', C.red],
      ['LuTriangleAlert', 'Bei einer Panne:', 'Warnblinklicht an, Warnweste anziehen, Warndreieck aufstellen.', C.am],
      ['LuLightbulbOff', 'Arbeitsscheinwerfer nicht während der Fahrt', '(außer Straßendienst, Müllabfuhr) – und nur genehmigte Leuchten, keine Dekoleuchten.'],
    ],
    notes:
      '▶ Sagen: „Manche Lkw haben ein gelbes Rundumlicht auf dem Dach.“\n' +
      '❓ „Darf ich es bei einer Panne einschalten?“\n' +
      '🖱 Klick 1–3: je eine Antwort.\n' +
      '✅ Gelbes Rundumlicht nur an berechtigten Fahrzeugen (§ 52 Abs. 4 StVZO) – z. B. Straßenbau, -unterhaltung und -reinigung, Müllabfuhr, Pannenhilfsfahrzeuge, Fahrzeuge mit Überbreite oder Überlänge nach Anordnung, Begleitfahrzeuge. Einschalten nur zur Warnung vor Arbeits- oder Unfallstellen, vor ungewöhnlich langsamen oder breiten Fahrzeugen (§ 38 Abs. 3 StVO).\n' +
      '✅ Arbeitsscheinwerfer nicht während der Fahrt (Ausnahme: Arbeitsfahrten von Straßendienst und Müllabfuhr) – § 52 Abs. 7 StVZO. Nicht genehmigte Zusatzleuchten (§ 49a StVZO): 20 € (BKat 221.2).\n' +
      '➜ „Jetzt ins Cockpit: Was bedeuten die Farben der Warnleuchten?“',
  });

  // ===== WARNLEUCHTEN-FARBEN =====
  {
    const s = base(deck, 'c4l', { notes:
      '▶ Sagen: „Im Cockpit leuchten viele Symbole. Wichtig ist vor allem die Farbe.“\n' +
      '❓ „Was bedeutet Rot?“\n' +
      '🖱 Klick 1: Rot · Klick 2: Gelb · Klick 3: Grün · Klick 4: Blau.\n' +
      '✅ Rot = Gefahr: an sicherer Stelle anhalten, nach Betriebsanleitung handeln (meist Motor aus – aber bei roter Bremsdruck-Warnung Motor laufen lassen, damit der Kompressor Druck aufbaut) – z. B. Öldruck, Kühlmitteltemperatur (2.7.02-216), Bremsdruck/Druckwarnung (2.7.02-203), Ladekontrolle, oft ein großes rotes STOP. Gelb = Störung oder Hinweis: bald handeln – AdBlue nachfüllen, Partikelfilter regenerieren oder Werkstatt – z. B. ABS/EBS, Motorstörung, AdBlue, Partikelfilter. Grün = eingeschaltet. Blau = Fernlicht (Farben nach ISO 2575, Lehrbuchwissen).\n' +
      '➜ „Zum Schluss: die elektronischen Helfer.“' });
    kick(s, 'Kontrollleuchten'); title(s, 'Die Farbe sagt, was zu tun ist');
    const F = [
      [C.red, 'FF5C5C', 'Rot', 'Gefahr!', 'An sicherer Stelle anhalten, Betriebsanleitung beachten.', [['oel', 'Öldruck'], ['kuehl', 'Kühlmittel'], ['brems', 'Bremse / Druck'], ['batt', 'Ladekontrolle'], ['stop', 'STOP-Leuchte']]],
      ['F2C230', 'F2C230', 'Gelb', 'Störung', 'Bald handeln: nachfüllen, regenerieren oder Werkstatt.', [['abs', 'ABS / EBS'], ['motor', 'Motor'], ['adblue', 'AdBlue'], ['dpf', 'Partikelfilter']]],
      [C.gr, '38D98A', 'Grün', 'Ist an', 'Alles in Ordnung.', [['blink', 'Blinker'], ['abblend', 'Abblendlicht']]],
      ['3B82F6', '3B82F6', 'Blau', 'Fernlicht', 'Gegenverkehr? Abblenden!', [['fern', 'Fernlicht']]],
    ];
    for (let k = 0; k < 4; k++) {
      const x = 0.7 + k * 3.03, w = 2.85, [col, hex, nm, mean, act, sy] = F[k];
      card(s, x, 2.0, w, 4.55, { line: col }, CLICK);
      // Symbolfeld: bis zu drei Reihen (Rot hat fünf Symbole, die STOP-Leuchte unten in der Mitte)
      const SZ = 0.66, PIT = 0.95, PT = 2.15, PHT = 2.92, n = sy.length, rows = Math.ceil(n / 2);
      s.rrect(x + 0.15, PT, w - 0.3, PHT, { fill: '070B12', line: '1E2836', rr: 0.08 }, { fx: 'fade', dur: 200 });
      const y0 = PT + (PHT - rows * PIT) / 2 + 0.03;
      sy.forEach(([kd, lab], j) => {
        const alone = n === 1 || (j === n - 1 && n % 2 === 1);
        const cx = x + (alone ? w / 2 : (j % 2 ? w * 0.72 : w * 0.28)), cy = y0 + Math.floor(j / 2) * PIT;
        s.img(warnImg[kd + hex], { x: cx - SZ / 2, y: cy, w: SZ, h: SZ }, { fx: 'zoom', dur: 250 });
        s.text(lab, { x: cx - 0.7, y: cy + SZ, w: 1.4, h: 0.26, size: 13, color: C.mut, align: 'center' }, { fx: 'fade', dur: 150 });
      });
      s.text([{ text: nm + ' = ', options: { color: col } }, { text: mean, options: { color: C.txt } }], { x: x + 0.1, y: 5.12, w: w - 0.2, h: 0.45, size: 22, bold: true, align: 'center' }, { fx: 'fade', dur: 200 });
      s.text(act, { x: x + 0.15, y: 5.57, w: w - 0.3, h: 0.92, size: 16, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
    }
    foot(s, 'Symbole vereinfacht · Aussehen je nach Hersteller · STOP-Leuchte: so schnell wie möglich an sicherer Stelle anhalten');
  }

  // ===== ASSISTENZSYSTEME =====
  {
    const s = base(deck, 'c4l', { notes:
      '▶ Sagen: „Neue Lkw haben viele elektronische Helfer – einige schreibt die EU vor.“\n' +
      '🖱 Klick 1–4: je ein System · Klick 5: die wichtigste Regel.\n' +
      '✅ Notbremsassistent: warnt und bremst selbst, wenn ein Aufprall droht – nicht dauerhaft abschalten. Spurhaltewarner: warnt, wenn der Lkw ohne Blinker die Spur verlässt. Abbiegeassistent: warnt vor Radfahrern und Fußgängern rechts neben dem Lkw – Pflicht für neu zugelassene Lkw über 3,5 t (N2, N3) seit 7.7.2024, keine Nachrüstpflicht (VO (EU) 2019/2144 Anhang II). Schrittgeschwindigkeit beim Rechtsabbiegen: innerorts, über 3,5 t (§ 9 Abs. 6 StVO). Anfahr-Informationssystem: warnt vor Personen direkt vor dem Lkw beim Anfahren.\n' +
      '✅ 2.7.01-148: Bremsassistent und autonomer Notbremsassistent sind richtig, der Tempomat nicht. 2.7.01-149: warnen, helfen, automatisch eingreifen (alle drei richtig). 2.7.01-063: mehr Sicherheit, Unterstützung – kein Ausgleich von Fahruntüchtigkeit. Die Verantwortung bleibt beim Fahrer.\n' +
      '➜ „Damit ist C4 geschafft. Zeit zum Mitschreiben.“' });
    kick(s, 'Fahrerassistenz'); title(s, 'Elektronische Helfer');
    await point(s, 0.7, 2.05, 5.85, 1.25, 'LuOctagonAlert', C.red, 'Notbremsassistent', 'warnt und bremst selbst, wenn ein Auffahrunfall droht.', CLICK, { br: true, size: 16 });
    await point(s, 6.78, 2.05, 5.85, 1.25, 'LuMoveHorizontal', C.bl, 'Spurhaltewarner', 'warnt, wenn der Lkw ohne Blinker die Spur verlässt.', CLICK, { br: true, size: 16 });
    await point(s, 0.7, 3.45, 5.85, 1.25, 'LuBike', C.or, 'Abbiegeassistent', 'warnt vor Radfahrern rechts – Pflicht für neu zugelassene Lkw über 3,5 t seit Juli 2024.', CLICK, { br: true, size: 16 });
    await point(s, 6.78, 3.45, 5.85, 1.25, 'LuPersonStanding', C.pu, 'Anfahr-Informationssystem', 'warnt vor Menschen direkt vor dem Lkw.', CLICK, { br: true, size: 16 });
    await point(s, 0.7, 4.95, 11.93, 1.5, 'LuShieldAlert', C.gr, 'Die Helfer unterstützen – die Verantwortung bleibt bei euch.', 'Spiegel, Schulterblick und innerorts Schrittgeschwindigkeit beim Rechtsabbiegen bleiben Pflicht – auch wenn nichts piept.', CLICK, { br: true, size: 18 });
  }

  quiz(deck, 'c4l', {
    kicker: 'Quiz Licht', q: 'Die Blinker-Kontrollleuchte blinkt plötzlich viel schneller als sonst. Warum?', size: 32,
    opts: ['Der Warnblinker ist an', 'Eine Blinkleuchte ist ausgefallen', 'Die Sicherung ist defekt'], ok: 1,
    why: 'Schnelles Blinken der Kontrolle zeigt: Eine Blinkleuchte am Lkw oder Anhänger ist ausgefallen (Prüfungsfrage 2.7.02-134). Ist die Sicherung defekt, blinkt gar nichts.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Amtlich: „Ein Leuchtmittel ist defekt“. Falsch: „Die Sicherung ist defekt“ und „Das Warnblinklicht ist eingeschaltet“.\n➜ „Zum Abschluss von C4: die Abfahrtkontrolle.“',
  });

  // ===== ABFAHRTKONTROLLE C3/C4 =====
  {
    const s = base(deck, 'c4x', { notes:
      '▶ Sagen: „Alles, was ihr heute gelernt habt, kontrolliert ihr vor jeder Fahrt. In der praktischen Prüfung gehört die Abfahrtkontrolle dazu.“\n' +
      '❓ „Wo fangt ihr an?“\n' +
      '🖱 Klick 1: Motorraum · Klick 2: Räder · Klick 3: Licht · Klick 4: Aufbau.\n' +
      '✅ Motorraum: Motoröl, Kühlmittel (nur kalt öffnen), Scheibenwaschwasser, Keilrippenriemen. Räder: Profil (mind. 1,6 mm), Schäden, Steine zwischen den Zwillingen, Luftdruck, Radmuttern und Anzeiger, Kotflügel und Schmutzfänger. Licht: alle Leuchten an und sauber, Kontur und Rückstrahler. Am Rahmen: Diesel- und AdBlue-Stand, Tankdeckel zu. Aufbau: Türen, Plane, Bordwände zu, Ladebordwand verriegelt.\n' +
      '💡 Ausführlich mit Bremsen und Ladung in C9 (Abfahrtkontrolle).\n' +
      '➜ „Jetzt schreiben wir die wichtigsten Punkte auf.“' });
    kick(s, 'Abfahrtkontrolle'); title(s, 'Vor jeder Fahrt: einmal rundherum');
    const GL = 4.45, XF = 3.43, K = 0.9;
    const g = await lkw(s, { L: 7.2, axles: [0.82, 5.25, 5.85], floor: 0.78, boxH: 1.75 }, { x: XF, gy: GL, k: K });
    const M = [[0.55, 1.1, C.red], [5.55, 0.3, C.or], [7.15, 0.6, C.am], [4.0, 1.7, C.pu]];
    const P = [['LuDroplet', 'Motorraum', 'Öl, Waschwasser\nKühlmittel (nur kalt!)\nKeilrippenriemen'], ['LuCircleDot', 'Räder', 'Profil, Schäden, Luftdruck\nSteine zwischen Zwillingen\nRadmuttern, Kotflügel'], ['LuLightbulb', 'Licht', 'alle Leuchten an und sauber\nKontur, Rückstrahler'], ['LuPackage', 'Aufbau', 'Türen, Plane, Bordwände zu\nLadebordwand verriegelt']];
    for (let k = 0; k < 4; k++) {
      const [px, py] = g.pt(M[k][0], M[k][1]);
      s.text(String(k + 1), { x: px - 0.22, y: py - 0.22, w: 0.44, h: 0.44, size: 16, bold: true, color: C.dark, fill: M[k][2], shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', glow: 8, glowColor: M[k][2] }, { fx: 'zoom', c: true, dur: 300 });
      const x = 0.7 + k * 3.03;
      card(s, x, 4.7, 2.85, 1.75, { line: M[k][2] }, { fx: 'rise', dur: 400 });
      s.text(String(k + 1), { x: x + 0.2, y: 4.82, w: 0.42, h: 0.42, size: 15, bold: true, color: C.dark, fill: M[k][2], shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.img(await icon(P[k][0], M[k][2]), { x: x + 2.25, y: 4.84, w: 0.4, h: 0.4 }, { fx: 'fade', dur: 200 });
      s.text(P[k][1], { x: x + 0.75, y: 4.82, w: 1.5, h: 0.42, size: 18, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(P[k][2], { x: x + 0.17, y: 5.33, w: 2.6, h: 0.95, size: 16, color: C.mut }, { fx: 'fade', dur: 200 });
    }
  }

  // ===== ABSCHLUSS C4 =====
  write(deck, 'c4x', {
    ttl: 'Fahrwerk und Elektrik', labelW: 2.4, size: 18,
    rows: [
      ['Luftfeder', 'Heben und Senken nur im Stand – danach zurück aufs Fahrniveau'],
      ['Profil', 'mindestens 1,6 mm – auch beim Lkw (Fahrer 60 €, 1 Punkt)'],
      ['Winterreifen', 'bei Glätte oder Schneematsch: Alpine-Symbol – Antriebsachsen und vordere Lenkachsen'],
      ['Schneeketten', 'Zeichen 268 – höchstens 50 km/h'],
      ['Radmuttern', 'nach 50–100 km nachziehen'],
      ['Bordnetz', '24 V: zwei 12-V-Batterien in Reihe'],
      ['Starthilfe', 'Rot an + (Panne) · Rot an + (Spender) · Schwarz an − (Spender) · Schwarz an Masse (Panne)'],
      ['Warnleuchte rot', 'so schnell wie möglich an sicherer Stelle anhalten'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus C4.“\n❓ Vor jedem Klick fragen: „Was gehört hier hin?“\n🖱 Klick 1–8: je eine Lösung.\n✅ Quellen: § 36 Abs. 3 StVZO, BKat 212; § 2 Abs. 3a StVO; § 3 Abs. 4 StVO, Zeichen 268; ADAC Starthilfe; Prüfungsfragen 2.7.01-242, 2.7.02-216.\n➜ „Jetzt testen wir C4.“',
  });
  quiz(deck, 'c4x', {
    kicker: 'Quiz C4 · 1', q: 'Schneematsch auf der Straße. Wo braucht Ihr Lkw mindestens Winterreifen?', size: 32,
    opts: ['Nur auf der Antriebsachse', 'Auf den Antriebsachsen und den vorderen Lenkachsen', 'Keine Pflicht – Winterreifen sind nur für Pkw'], ok: 1,
    why: '§ 2 Abs. 3a StVO: Bei Lkw über 3,5 t genügen Winterreifen auf den permanent angetriebenen Achsen und den vorderen Lenkachsen – mit Alpine-Symbol.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Die Lenkachse ist seit 1.7.2020 dabei.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c4x', {
    kicker: 'Quiz C4 · 2', q: 'Starthilfe:\nWohin kommt das letzte Ende des schwarzen Kabels?', size: 34,
    opts: ['An Minus der leeren Batterie', 'An den Massepunkt des Pannen-Lkw (Betriebsanleitung) oder den Motorblock', 'An Plus des Spenders'], ok: 1,
    why: 'An den Massepunkt laut Betriebsanleitung oder blankes Metall am Motorblock, mit Abstand zur Batterie – sonst können Funken das Knallgas der Batterie entzünden (ADAC).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Zum Schluss: Das nehmt ihr mit.“',
  });
  await takeaway(deck, 'c4x', {
    items: [
      ['LuArrowUpDown', 'Luftfeder:', 'heben und senken nur im Stand – danach zurück aufs Fahrniveau.'],
      ['LuCircleDot', 'Reifen:', '1,6 mm Profil, Druck kalt prüfen, Steine aus den Zwillingen, Radmuttern nachziehen.'],
      ['LuSnowflake', 'Winter:', 'Alpine-Symbol auf Antriebs- und Lenkachse – mit Ketten höchstens 50 km/h.'],
      ['LuBatteryCharging', '24 Volt:', 'Starthilfe nur 24 an 24 – Schwarz zuletzt an Masse.'],
      ['LuLightbulb', 'Licht:', 'alle Leuchten und Kontur sauber – rote Warnleuchte heißt anhalten.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C4, die ihr auf jeden Fall wissen müsst.“\n🖱 Klick 1–5: je ein Punkt. Gern die Klasse den Satz vervollständigen lassen.\n➜ „Das war Abend 2.“',
  });

  // ===== ENDE =====
  {
    const s = base(deck, 'c4x', { bg: 'g_licht.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 2. Beim nächsten Mal geht es um die Bremsen: C5 – wie eine Druckluftbremse funktioniert – und C6 – Dauerbremsen, ABS, Prüfungen am Fahrzeug und der Geschwindigkeitsbegrenzer. Danke fürs Mitmachen, kommt gut nach Hause.“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen.\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.5, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Gute Heimfahrt!', { x: 0.7, y: 1.3, w: 6.5, h: 1.0, size: 54, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900 });   // über dem Lkw im Foto
    s.text('Abend 2 geschafft: C3 + C4', { x: 0.7, y: 4.85, w: 6.5, h: 0.5, size: 22, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Nächstes Mal:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'C5  Bremsen – Druckluftbremse', options: { color: C.txt, breakLine: true } }, { text: 'C6  Dauerbremsen, Untersuchungen, Begrenzer', options: { color: C.txt } }], { x: 0.7, y: 5.45, w: 6.3, h: 1.4, size: 20 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
