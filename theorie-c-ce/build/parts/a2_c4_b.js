// Abend 2 · C4: Kapitel 3 Aufbauten, Kapitel 4 Batterie und Bordnetz
const { C, sec, base, kick, title, card, point, CLICK, steps, foot, chapter, lkw } = require('../gs');
const { icon } = require('../lib');

sec('c4a', 'C4  ·  AUFBAUTEN', C.pu, 'bg_pu.jpg');
sec('c4e', 'C4  ·  BATTERIE UND BORDNETZ', 'C9A227', 'bg_am.jpg');

module.exports = async (deck) => {
  // ===== KAPITEL 3 AUFBAUTEN =====
  await chapter(deck, 'c4a', { num: 3, ttl: 'Aufbauten', sub: 'Was hinten drauf ist – und was ihr vor der Fahrt kontrolliert.', ico: 'LuPackage', notes:
    '▶ Sagen: „Kapitel 3: Aufbauten. Ganz kurz – wie man Ladung sichert, kommt ausführlich in C9.“\n🖱 Keine Klicks.\n➜ „Welche Aufbauten kennt ihr?“' });
  {
    const s = base(deck, 'c4a', { notes:
      '▶ Sagen: „Welche Aufbauten kennt ihr?“\n' +
      '❓ Sammeln lassen, dann klicken.\n' +
      '🖱 Klick 1–5: je ein Aufbau · Klick 6: Maße.\n' +
      '✅ Kontrolle vor der Fahrt: Verschlüsse, Plane und Spriegel, Bordwände, Türen und Verriegelungen. Wechselbrücke: Verriegelungen zu, Stützbeine hochgeklappt und gesichert. Kipper: nur auf festem, ebenem Boden kippen, vor der Fahrt Mulde ganz absenken.\n' +
      '✅ Wechselbrücke nur auf tragfähigem Boden absetzen (DGUV Vorschrift 70 § 55). Kipper: Sicherheitsabstand zu Stromleitungen (Freileitungen) halten (§ 54).\n' +
      '✅ Maße nach § 32 StVZO: Breite 2,55 m, Kühlaufbau (Wände mind. 45 mm dick) 2,60 m, Höhe 4,00 m.\n' +
      '➜ „Ein Aufbau-Teil verdient eine eigene Folie: die Ladebordwand.“' });
    kick(s, 'Aufbauten'); title(s, 'Was ist hinten drauf?');
    const A = [['LuTent', 'Plane / Pritsche', 'Plane, Spriegel, Bordwände zu und fest?'], ['LuBox', 'Koffer', 'Türen geschlossen und verriegelt?'], ['LuRefrigerator', 'Kühlkoffer', 'Kühlgerät an, Temperatur richtig?'], ['LuShovel', 'Kipper', 'nur auf festem, ebenem Boden kippen. Mulde vor der Fahrt ganz unten'], ['LuContainer', 'Wechselbrücke', 'Verriegelungen zu, Stützbeine hoch und gesichert?']];
    for (let k = 0; k < 5; k++) {
      const x = 0.7 + k * 2.42, w = 2.25;
      card(s, x, 2.05, w, 3.05, { line: C.pu }, CLICK);
      s.oval(x + w / 2 - 0.45, 2.3, 0.9, 0.9, { fill: C.pu, line: C.pu }, { fx: 'zoom', dur: 250 });
      s.img(await icon(A[k][0], C.dark), { x: x + w / 2 - 0.24, y: 2.51, w: 0.48, h: 0.48 }, { fx: 'fade', dur: 150 });
      s.text(A[k][1], { x: x + 0.1, y: 3.3, w: w - 0.2, h: 0.5, size: 18, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
      s.text(A[k][2], { x: x + 0.15, y: 3.85, w: w - 0.3, h: 1.15, size: 15, color: C.mut, align: 'center' }, { fx: 'fade', dur: 200 });
    }
    card(s, 0.7, 5.4, 11.93, 0.9, { line: C.or }, CLICK);
    s.img(await icon('LuRuler', C.or), { x: 0.95, y: 5.62, w: 0.46, h: 0.46 }, { fx: 'fade', dur: 150 });
    s.text([{ text: 'Maße:  ', options: { bold: true, color: C.or } }, { text: 'Breite höchstens 2,55 m (Kühlaufbau 2,60 m) · Höhe höchstens 4,00 m', options: { color: C.txt } }], { x: 1.6, y: 5.4, w: 10.9, h: 0.9, size: 18, valign: 'middle' }, { fx: 'fade', dur: 200 });
  }

  // ===== LADEBORDWAND =====
  {
    const s = base(deck, 'c4a', { notes:
      '▶ Sagen: „Viele Verteiler-Lkw haben eine Ladebordwand – eine Hebebühne hinten. Damit passieren schwere Unfälle: Füße werden gequetscht, Fußgänger und Radfahrer übersehen die Plattform.“\n' +
      '❓ „Wie wird eine heruntergeklappte Ladebordwand im Verkehr gesichert?“\n' +
      '✅ Zwei gelbe Blinkleuchten, die im Betrieb selbsttätig blinken, und rot-weiße rückstrahlende Warnmarkierungen (§ 53b Abs. 5 StVZO).\n' +
      '🖱 Klick 1: Blinkleuchte, Warnmarkierung und erster Punkt · Klick 2–3: Regeln.\n' +
      '✅ Nicht im Bewegungsbereich stehen, Füße weg von der Plattformkante. Vor der Fahrt hochklappen und verriegeln – Kontrollleuchte im Fahrerhaus muss aus sein (BG Verkehr, Herstellerangaben).\n' +
      '➜ „Weiter zu Kapitel 4: Batterie und Bordnetz.“' });
    kick(s, 'Ladebordwand'); title(s, 'Die Hebebühne am Heck');
    card(s, 0.7, 2.05, 5.6, 4.45, {});
    // Seitenansicht: detaillierter Lkw, Ladebordwand hinten auf den Boden abgesenkt
    const GL = 5.7, XF = 0.85, K = 1.38, LL = 3.17, XR = XF + LL * K;
    await lkw(s, { L: LL, axles: [0.62, 2.3], floor: 0.72, boxH: 1.5 }, { x: XF, gy: GL, k: K });
    s.rect(0.85, GL, 5.3, 0.04, { fill: '55606F' });
    s.lineS(XR - 0.08, GL - 0.62, XR + 0.08, GL - 0.1, { color: '6E7888', lw: 5 });           // Hubarm
    s.rect(XR - 0.02, GL - 0.09, 0.95, 0.07, { fill: '9AA6B5' });                                  // Plattform
    for (let k = 0; k < 7; k++) { s.rect(XR + k * 0.125 + 0.0625, GL - 0.09, 0.0625, 0.07, { fill: C.white }, k === 0 ? CLICK : { fx: 'fade', dur: 80 }); s.rect(XR + k * 0.125, GL - 0.09, 0.0625, 0.07, { fill: C.red }, { fx: 'fade', dur: 80 }); }
    s.rect(XR + 0.85, GL - 0.42, 0.04, 0.33, { fill: '6E7888' }, { fx: 'fade', dur: 150 });          // Halter
    s.oval(XR + 0.77, GL - 0.6, 0.2, 0.2, { fill: C.am, glow: 10, glowColor: C.am }, { fx: 'zoom', dur: 300 });
    s.text([{ text: 'gelbe', options: { breakLine: true } }, { text: 'Blinkleuchte' }], { x: XR + 0.05, y: GL - 1.55, w: 1.1, h: 0.6, size: 12, bold: true, color: C.am, align: 'center' }, { fx: 'fade', dur: 200 });
    s.lineS(XR + 0.6, GL - 0.95, XR + 0.85, GL - 0.6, { color: C.am, lw: 1.5 }, { fx: 'fade', dur: 200 });
    s.text('rot-weiße Markierung', { x: XR - 1.55, y: GL + 0.08, w: 2.3, h: 0.32, size: 13, bold: true, color: C.red, align: 'right' }, { fx: 'fade', dur: 200 });
    s.text('Seitenansicht · schematisch', { x: 0.9, y: 2.12, w: 3.0, h: 0.3, size: 12, italic: true, color: C.dim });
    await point(s, 6.55, 2.05, 6.08, 1.4, 'LuSiren', C.am, 'Im Betrieb gesichert', 'durch zwei gelbe Blinkleuchten und rot-weiße Warnmarkierungen.', { fx: 'flyL', dur: 450 }, { br: true, size: 17 });
    await point(s, 6.55, 3.58, 6.08, 1.4, 'LuFootprints', C.red, 'Quetschgefahr!', 'Nicht im Bewegungsbereich stehen, Füße weg von der Plattformkante.', CLICK, { br: true, size: 17 });
    await point(s, 6.55, 5.11, 6.08, 1.4, 'LuLock', C.gr, 'Vor der Fahrt', 'hochklappen und verriegeln – die Kontrollleuchte muss aus sein.', CLICK, { br: true, size: 17 });
  }

  // ===== KAPITEL 4 BATTERIE =====
  await chapter(deck, 'c4e', { num: 4, ttl: 'Batterie und Bordnetz', sub: '24 Volt, Lichtmaschine, Starthilfe und Hauptschalter.', ico: 'LuBatteryCharging', notes:
    '▶ Sagen: „Kapitel 4: Strom. Beim Lkw ist einiges anders als beim Pkw – vor allem die Spannung.“\n🖱 Keine Klicks.\n➜ „Wie viel Volt hat ein Lkw?“' });

  // ===== 24 VOLT (Morph) =====
  const BY = 2.6, BW = 2.1, BH = 1.4;
  const bat = (s, x, nm, col) => {
    s.rrect(x, BY, BW, BH, { fill: '1B1F26', line: col, lw: 2.5, rr: 0.1, name: '!!' + nm });
    s.rect(x + 0.3, BY - 0.22, 0.35, 0.22, { fill: C.red, name: '!!' + nm + 'p' });
    s.rect(x + BW - 0.65, BY - 0.22, 0.35, 0.22, { fill: '3C4656', name: '!!' + nm + 'm' });
    s.text('+', { x: x + 0.25, y: BY + 0.05, w: 0.45, h: 0.45, size: 22, bold: true, color: C.red, align: 'center', name: '!!' + nm + 'tp' });
    s.text('−', { x: x + BW - 0.7, y: BY + 0.05, w: 0.45, h: 0.45, size: 22, bold: true, color: C.mut, align: 'center', name: '!!' + nm + 'tm' });
    s.text('12 V', { x, y: BY + 0.55, w: BW, h: 0.6, size: 26, bold: true, color: C.txt, align: 'center', name: '!!' + nm + 'tv' });
  };
  await steps(deck, 'c4e', {
    kicker: 'Bordnetz', ttl: '24 Volt im Lkw',
    ask: { q: 'Wie kommt man auf 24 Volt?', a: 'Zwei 12-Volt-Batterien in Reihe: Plus an Minus.', at: 1 },
    list: ['Eine Batterie: 12 V', 'Zwei in Reihe: 24 V', 'Lichtmaschine lädt', 'Ladekontrolle leuchtet rot'],
    caps: [
      'Eine Lkw-Batterie hat 12 Volt – wie im Pkw, nur größer.',
      'Zwei Batterien in Reihe: Plus der einen an Minus der anderen. Zusammen 24 Volt.',
      'Läuft der Motor, lädt die Lichtmaschine die Batterien. Sie wird über einen Riemen angetrieben.',
      'Rote Ladekontrolle während der Fahrt: Die Batterien werden nicht geladen. Oft ist der Riemen gerissen – dann laufen auch Wasserpumpe oder Lüfter nicht. Anhalten!',
    ],
    notes: [
      '▶ Sagen: „Wie viel Volt hat ein Pkw? 12. Und ein Lkw?“\n❓ Antworten sammeln.\n✅ 24 Volt.\n➜ „Wie kommt man auf 24?“',
      '▶ „Zwei 12-Volt-Batterien in Reihe – Plus der einen an Minus der anderen. Das ergibt 24 Volt.“\n💡 Darum: Nie einen 12-Volt-Pkw direkt an einen 24-Volt-Lkw anschließen.\n➜ „Wer lädt die Batterien?“',
      '▶ „Die Lichtmaschine, angetrieben vom Motor über einen Riemen. Sie lädt, solange der Motor läuft.“\n➜ „Und wenn diese Leuchte angeht?“',
      '▶ „Die rote Ladekontrolle leuchtet während der Fahrt: Die Batterie wird nicht geladen. Häufige Ursache: Der Keilrippenriemen ist gerissen. Über ihn laufen oft auch Wasserpumpe und Lüfter – dann wird der Motor heiß.“\n✅ Rote Warnleuchte = anhalten, nachsehen, Werkstatt (Lehrbuchwissen, Betriebsanleitung).\n➜ „Was tun, wenn die Batterie leer ist? Starthilfe.“',
    ],
    legend: 'Schematisch',
    scene: async (s, i) => {
      bat(s, 6.2, 'bat1', i >= 1 ? 'C9A227' : C.line);
      if (i >= 1) {
        bat(s, 9.4, 'bat2', 'C9A227');
        // Reihe: Minus b1 → Plus b2
        s.lineS(6.2 + BW - 0.48, BY - 0.22, 6.2 + BW - 0.48, BY - 0.6, { color: C.am, lw: 4, name: '!!w1' });
        s.lineS(6.2 + BW - 0.48, BY - 0.6, 9.4 + 0.48, BY - 0.6, { color: C.am, lw: 4, name: '!!w2' });
        s.lineS(9.4 + 0.48, BY - 0.6, 9.4 + 0.48, BY - 0.22, { color: C.am, lw: 4, name: '!!w3' });
        s.text('24 V', { x: 7.9, y: BY + BH + 0.25, w: 3.4, h: 0.8, size: 44, bold: true, color: C.am, align: 'center', name: '!!t24', glow: 8, glowColor: C.am });
      }
      if (i >= 2) {
        const bad = i === 3;
        s.oval(6.6, 5.0, 1.0, 1.0, { fill: '3C4656', line: '9AA6B5', lw: 2, name: '!!motr' });
        s.oval(9.7, 5.15, 0.7, 0.7, { fill: '3C4656', line: bad ? C.red : C.gr, lw: 3, name: '!!lima' });
        s.lineS(7.1, 5.0, 10.05, 5.15, { color: bad ? C.red : '9AA6B5', lw: 3, name: '!!r1' });
        // gerissen: unten offen, beide Enden hängen durch
        if (bad) { s.lineS(7.1, 6.0, 7.95, 6.42, { color: C.red, lw: 3, name: '!!r2' }); s.lineS(10.05, 5.85, 9.75, 6.45, { color: C.red, lw: 3, name: '!!r3' }); }
        else s.lineS(7.1, 6.0, 10.05, 5.85, { color: '9AA6B5', lw: 3, name: '!!r2' });
        s.text('Motor', { x: 5.55, y: 5.33, w: 0.95, h: 0.35, size: 13, color: C.dim, align: 'right', name: '!!tmo' });
        s.text('Lichtmaschine', { x: 10.5, y: 5.3, w: 1.9, h: 0.4, size: 15, bold: true, color: bad ? C.red : C.gr, name: '!!tli' });
        s.text(bad ? 'Riemen gerissen?' : 'Riemen', { x: 7.9, y: 5.35, w: 1.8, h: 0.35, size: 13, bold: bad, color: bad ? C.red : C.dim, align: 'center', name: '!!tri' });
      }
      if (i === 3) {
        s.rrect(11.85, 4.15, 1.0, 0.75, { fill: '0A0F16', line: '3C4656', rr: 0.1, name: '!!lamp' });
        s.img(await icon('LuBatteryWarning', C.red), { x: 12.08, y: 4.25, w: 0.55, h: 0.55, name: '!!lampi' });
      }
    },
  });

  // ===== STARTHILFE (Morph) =====
  const PX = 6.1, SX = 10.4, TY = 2.9;   // Pannen-Lkw links, Spender rechts
  await steps(deck, 'c4e', {
    kicker: 'Starthilfe', ttl: 'Die richtige Reihenfolge',
    ask: { q: 'Wohin kommt das letzte Ende des schwarzen Kabels?', a: 'Massepunkt oder Motorblock – nicht an die Batterie.', at: 4 },
    nums: ['!', '1', '2', '3', '4'],
    list: ['Nur 24 V an 24 V', 'Rot an Plus – Pannen-Lkw', 'Rot an Plus – Spender', 'Schwarz an Minus – Spender', 'Schwarz an Masse – Pannen-Lkw'],
    caps: [
      'Nur gleiche Spannung verbinden: 24 V an 24 V. Hat der Lkw einen eigenen Starthilfe-Anschluss, diesen nach Betriebsanleitung nutzen.',
      '1. Rotes Kabel an Plus des Pannen-Lkw.',
      '2. Das andere Ende des roten Kabels an Plus des Spenders.',
      '3. Schwarzes Kabel an Minus des Spenders.',
      '4. Das andere Ende an den Massepunkt laut Betriebsanleitung oder blankes Metall am Motorblock – nicht an die Batterie: Funken! Abklemmen in umgekehrter Reihenfolge.',
    ],
    notes: [
      '▶ Sagen: „Batterie leer – ein Kollege hilft. Erste Regel: Nur gleiche Spannung, also 24 Volt an 24 Volt.“\n✅ ADAC, Starthilfe; Betriebsanleitung. Viele Lkw haben einen Fremdstartstecker.\n💡 Im Bild steht je ein Batteriesatz mit 24 V. Am echten Lkw sind es zwei 12-V-Batterien in Reihe: Die Kabel kommen an den freien Plus- und Minuspol des Batteriesatzes – nie an die Brücke zwischen den Batterien (dort liegen nur 12 V).\n➜ „Jetzt die Reihenfolge. Zuerst das rote Kabel.“',
      '▶ „Rot an Plus der leeren Batterie.“\n➜ „Dann …“',
      '▶ „… das andere rote Ende an Plus des Spenders.“\n➜ „Dann das schwarze Kabel.“',
      '▶ „Schwarz an Minus des Spenders.“\n➜ „Und das letzte Ende?“',
      '▶ „Nicht an Minus der leeren Batterie – sondern an Masse: an den Massepunkt, den die Betriebsanleitung nennt, oder an blankes Metall am Motorblock, mit Abstand zur Batterie. Beim Lkw sitzt der Motor unter dem Fahrerhaus – darum gibt es oft einen eigenen Massepunkt. Beim Laden entsteht Knallgas, ein Funke kann es entzünden.“\n✅ Reihenfolge laut ADAC. Spendermotor laufen lassen, starten. Vor dem Abklemmen Verbraucher einschalten (Gebläse, Licht). Abklemmen in umgekehrter Reihenfolge: erst Schwarz, dann Rot.\n➜ „Noch drei Dinge zur Batterie.“',
    ],
    legend: 'Schematisch · Batterie jeweils 24 V',
    scene: async (s, i) => {
      for (const [nm, x, lab, col] of [['pb', PX, 'Pannen-Lkw', C.red], ['sb', SX, 'Spender', C.gr]]) {
        s.text(lab, { x: x - 0.1, y: TY - 1.4, w: 2.5, h: 0.4, size: 17, bold: true, color: col, name: '!!t' + nm });
        s.rrect(x, TY, 2.3, 1.3, { fill: '1B1F26', line: '55606F', lw: 2, rr: 0.1, name: '!!' + nm });
        s.rect(x + 0.3, TY - 0.22, 0.4, 0.22, { fill: C.red, name: '!!' + nm + 'p' });
        s.rect(x + 1.6, TY - 0.22, 0.4, 0.22, { fill: '3C4656', name: '!!' + nm + 'm' });
        s.text('+', { x: x + 0.25, y: TY + 0.05, w: 0.5, h: 0.45, size: 22, bold: true, color: C.red, align: 'center', name: '!!' + nm + 'tp' });
        s.text('−', { x: x + 1.55, y: TY + 0.05, w: 0.5, h: 0.45, size: 22, bold: true, color: C.mut, align: 'center', name: '!!' + nm + 'tm' });
        s.text('24 V', { x, y: TY + 0.55, w: 2.3, h: 0.6, size: 24, bold: true, color: i === 0 ? C.am : C.txt, align: 'center', name: '!!' + nm + 'tv' });
      }
      // Motorblock Pannen-Lkw
      s.rrect(PX, 5.0, 2.3, 1.2, { fill: '3C4656', line: i === 4 ? C.txt : '55606F', lw: 2, rr: 0.08, name: '!!block' });
      s.text('Motorblock (Masse)', { x: PX, y: 5.0, w: 2.3, h: 1.2, size: 14, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!tblock' });
      // Kabel
      const rx1 = PX + 0.5, rx2 = SX + 0.5, ry = TY - 0.22;
      if (i >= 1) s.lineS(rx1, ry, rx1, ry - (i >= 2 ? 0.5 : 0.35), { color: C.red, lw: 5, name: '!!k1' });
      if (i >= 2) { s.lineS(rx1, ry - 0.5, rx2, ry - 0.5, { color: C.red, lw: 5, name: '!!k2' }); s.lineS(rx2, ry - 0.5, rx2, ry, { color: C.red, lw: 5, name: '!!k3' }); }
      const mx = SX + 1.8;
      // schwarzes Kabel: schwarz mit heller Kontur, damit es auf dunklem Grund sichtbar bleibt
      const KX = 12.92, blk = (x1, y1, x2, y2, nm) => { s.lineS(x1, y1, x2, y2, { color: '9AA6B5', lw: 9, name: '!!' + nm + 'o' }); s.lineS(x1, y1, x2, y2, { color: '111317', lw: 6, name: '!!' + nm }); };
      if (i >= 3) { blk(mx, ry, mx, ry - 0.3, 'k4'); blk(mx, ry - 0.3, KX, ry - 0.3, 'k4b'); blk(KX, ry - 0.3, KX, 4.6, 'k4c'); }
      if (i >= 4) { blk(KX, 4.6, PX + 2.3, 5.6, 'k5'); s.oval(PX + 2.15, 5.45, 0.3, 0.3, { fill: C.am, glow: 10, glowColor: C.am, name: '!!clip' }); }
      // Nummern
      const N = [null, [rx1 - 0.55, ry - 0.62], [rx2 + 0.15, ry - 0.45], [mx - 0.21, ry - 0.88], [PX + 2.5, 5.75]];
      for (let k = 1; k <= Math.min(i, 4); k++) s.text(String(k), { x: N[k][0], y: N[k][1], w: 0.42, h: 0.42, size: 15, bold: true, color: C.dark, fill: k <= 2 ? C.red : C.mut, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!n' + k });
      if (i === 4) s.text('nicht an Minus der leeren Batterie!', { x: PX - 0.1, y: 4.35, w: 3.2, h: 0.4, size: 13, bold: true, color: C.red, name: '!!twarn' });
    },
  });

  // ===== HAUPTSCHALTER, GASUNG, SICHERUNGEN =====
  {
    const s = base(deck, 'c4e', { notes:
      '▶ Sagen: „Noch drei Dinge zur Elektrik.“\n' +
      '🖱 Klick 1–3: je ein Punkt.\n' +
      '✅ Batteriehauptschalter: trennt das Bordnetz – beim Abstellen über längere Zeit, für Arbeiten an der Elektrik, nach Unfall oder Brand. Nicht bei laufendem Motor. Nach „Zündung aus“ die Nachlaufzeit abwarten: Das AdBlue-System pumpt seine Leitungen leer, Steuergeräte speichern Daten (Herstellerangaben, z. B. E-T-A).\n' +
      '✅ Beim Laden entsteht Knallgas: kein Feuer, nicht rauchen, für Lüftung sorgen. Batteriesäure ätzt: Schutzbrille und Handschuhe (ADAC).\n' +
      '✅ Sicherung nur durch eine mit gleicher Amperezahl ersetzen, nie überbrücken – Brandgefahr. Brennt sie wieder durch: Werkstatt.\n' +
      '➜ „Weiter zu Kapitel 5: Licht und Warnleuchten.“' });
    kick(s, 'Elektrik'); title(s, 'Hauptschalter, Batterie, Sicherung');
    await point(s, 0.7, 2.05, 11.93, 1.35, 'LuPower', 'C9A227', 'Batteriehauptschalter:', 'nie bei laufendem Motor. Nach „Zündung aus“ die Nachlaufzeit abwarten – das AdBlue-System muss seine Leitungen leer pumpen.', CLICK, { size: 18 });
    await point(s, 0.7, 3.6, 11.93, 1.35, 'LuFlame', C.red, 'Beim Laden entsteht Knallgas:', 'kein Feuer, nicht rauchen, keine Funken. Säure ätzt – Schutzbrille und Handschuhe.', CLICK, { size: 18 });
    await point(s, 0.7, 5.15, 11.93, 1.35, 'LuZap', C.or, 'Sicherung kaputt?', 'Nur durch eine mit gleicher Amperezahl ersetzen – nie überbrücken. Brennt sie wieder durch: Werkstatt.', CLICK, { size: 18 });
  }
};
