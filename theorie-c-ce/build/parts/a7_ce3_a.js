// Abend 7 · CE3: Kapitel 1 Jedes Fahrzeug bremst sich selbst (Koppelkraft, Voreilung), Kapitel 2 Lastanpassung und EBS
const { C, sec, chapter, motion, steps, quiz, lkw, anhaenger, seg, arrow } = require('../gs');
const { dots } = require('../ce2schema');

sec('ce3k', 'CE3  ·  JEDES FAHRZEUG BREMST SICH SELBST', C.bl, 'bg_blue.jpg');
sec('ce3l', 'CE3  ·  LASTANPASSUNG UND EBS', C.gr, 'bg_gr.jpg');

const pctCol = p => (p === 0 ? C.dim : Math.abs(p - 100) <= 15 ? C.gr : p > 100 ? C.or : C.red);

module.exports = async (deck) => {
  await chapter(deck, 'ce3k', { num: 1, ttl: 'Jedes Fahrzeug bremst sich selbst', sub: 'Lkw und Anhänger bremsen jeder ihr eigenes Gewicht. Dann bleibt der Zug gerade.', ico: 'LuScale', notes:
    '▶ Sagen: „Im Zug hängen zwei schwere Fahrzeuge aneinander. Die Kunst ist: Beide bremsen genau so stark, wie es zu ihrem eigenen Gewicht passt. Dann drückt und zieht nichts an der Kupplung.“\n✅ WABCO EBS3 Systembeschreibung, Kap. 4: „Motorwagen und Anhängerfahrzeug bremsen jeweils den eigenen Massenanteil des Zuges. Dadurch wird die Koppelkraft … gering gehalten.“ DVR-Vorstandsbeschluss vom 17.10.2024.\n🖱 Keine Klicks.\n➜ „Schauen wir uns das an.“' });

  // ===== KOPPELKRAFT (fließend) =====
  {
    const x0 = 5.85, K = 0.47, GY = 4.55, xm = m => x0 + m * K;
    const LA = [1.4, 5.5, 6.85], AA = [1.1, 5.4], AX = 8.5;
    const fr = (t, o = {}) => ({ ...o, t });
    await motion(deck, 'ce3k', {
      kicker: 'Koppelkraft', ttl: 'Wer bremst wie stark?', dur: 500, holdDur: 700,
      question: 'Was passiert, wenn der Lkw stärker bremst als der Anhänger?',
      answer: 'Dann schiebt der Anhänger den Lkw. In der Kurve oder auf Glätte kann der Zug einknicken. Richtig: Jeder bremst sein eigenes Gewicht – der Anhänger eher einen Tick früher.',
      legend: 'Seitenansicht · schematisch · 100 % = so stark, wie es zum eigenen Gewicht passt',
      frames: [
        fr({ l: 0, a: 0, kop: 0, msg: 'Der Zug fährt. Noch bremst niemand.', mc: C.mut }, { hold: true,
          cap: 'Im Zug soll jedes Fahrzeug sein eigenes Gewicht bremsen. Die Balken zeigen: Wie stark bremst der Lkw, wie stark der Anhänger?',
          note: '▶ Sagen: „Oben seht ihr zwei Balken. 100 Prozent heißt: Das Fahrzeug bremst genau so stark, wie es zu seinem eigenen Gewicht passt. Zwischen den Fahrzeugen zeigt ein Pfeil, ob der Anhänger schiebt oder zieht.“\n❓ Frage auf der Folie stellen.\n✅ WABCO EBS3, Kap. 4; Mercedes-Benz Actros Betriebsanleitung (EBS): „… stets ihrem Gewicht entsprechend, an der Bremsarbeit des gesamten Lastzugs.“ Darstellung: eigene, schematisch.\n🖱 Klick: Der Fahrer bremst (läuft von selbst weiter).\n➜ „Jetzt wird gebremst.“' }),
        fr({ l: 50, a: 50, kop: 0, msg: 'Der Fahrer bremst …', mc: C.mut }),
        fr({ l: 100, a: 100, kop: 0.2, msg: 'Jeder bremst sein eigenes Gewicht: An der Kupplung drückt fast nichts. Der Zug bleibt gerade.', mc: C.gr }, { hold: true,
          cap: 'Richtig abgestimmt: Lkw und Anhänger bremsen beide ihr eigenes Gewicht. Die Kraft an der Kupplung bleibt klein.',
          note: '▶ „So soll es sein: Beide bremsen 100 Prozent ihres eigenen Gewichts. An der Kupplung drückt und zieht fast nichts – die Fachleute sagen: Die Koppelkraft ist klein. Der Zug bleibt gerade.“\n✅ WABCO EBS3, Kap. 4 (Koppelkraft gering halten).\n🖱 Klick: Was, wenn der Lkw stärker bremst?\n➜ „Jetzt bremst der Lkw zu stark.“' }),
        fr({ l: 140, a: 60, kop: -1, msg: 'Der Lkw bremst stärker: Der Anhänger schiebt. In der Kurve oder auf Glätte kann der Zug einknicken!', mc: C.red }, { hold: true, answer: true,
          cap: 'Der Lkw bremst stärker als der Anhänger – zum Beispiel, weil der Retarder nur den Lkw bremst. Der Anhänger schiebt.',
          note: '▶ „Jetzt bremst der Lkw viel stärker – zum Beispiel, weil der Retarder nur auf seine Antriebsachse wirkt. Der Anhänger will weiter und schiebt. Geradeaus merkt ihr das kaum. In der Kurve oder auf Glätte kann der Zug einknicken.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.06-108: Einknick- oder Schleudergefahr auf Glätte, wenn der Retarder bei Kurvenfahrt voll betätigt wird oder der Lkw bei Kurvenfahrt stärker bremst als der Anhänger.\n🖱 Klick: Und umgekehrt?\n➜ „Und wenn der Anhänger viel stärker bremst?“' }),
        fr({ l: 70, a: 140, kop: 1, msg: 'Der Anhänger bremst viel stärker: Er zieht hinten. Seine Bremsen werden heiß und nutzen sich schneller ab.', mc: C.or }, { hold: true,
          cap: 'Der Anhänger bremst viel stärker: Er zieht am Lkw. Seine Bremsen machen die meiste Arbeit – sie werden heiß und verschleißen.',
          note: '▶ „Umgekehrt: Der Anhänger bremst viel stärker. Dann zieht er hinten – das ist zwar stabil, aber seine Bremsen machen fast alles. Sie werden heiß und verschleißen schneller.“\n✅ Lehrbuchwissen. DVR-Beschluss 17.10.2024: Lkw und Anhänger sollen jeweils ihre eigene Masse abbremsen.\n🖱 Klick: Die richtige Einstellung.\n➜ „Wie macht man es richtig?“' }),
        fr({ l: 100, a: 110, kop: 0.45, msg: 'Voreilung: Der Anhänger bremst einen Tick früher. Er zieht ganz leicht – der Zug bleibt gestreckt.', mc: C.gr }, { hold: true,
          cap: 'Voreilung: Bei leichtem Bremsen bekommt der Anhänger etwas mehr Druck. Er zieht den Zug gerade. Einstellen darf das nur die Werkstatt.',
          note: '▶ „Deshalb gibt es die Voreilung: Bei leichtem Bremsen bekommt der Anhänger etwas mehr Druck als der Lkw. Er bremst einen Tick früher und zieht den Zug gerade. Das stellt die Werkstatt ein – beim EBS steht es im Steuergerät. Ihr als Fahrer verstellt daran nichts.“\n✅ Voreilung: Lehrbuchwissen (Patent DE4234098A1 „Anhänger-Steuerventil“; WABCO EBS3: bei EBS nicht von Hand einstellbar, im Steuergerät parametriert). Prüfungsfrage 2.7.07-328: „Bei abgeschalteter Voreilung … scharf bremsen“ ist eine falsche Antwort. Keine Zahlenwerte – je nach Fahrzeug verschieden.\n💡 DVR 2024: Starke Dauerbremsen nehmen dem Anhänger viel Arbeit ab – seine Beläge können „einschlafen“. Hersteller empfehlen, die Anhängerbremse ab und zu bewusst zu nutzen.\n🖱 Nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage.“' }),
      ],
      scene: async (s, t) => {
        s.rect(5.75, GY, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
        await lkw(s, { L: 7.5, box: 'koffer', boxH: 2.4, floor: 1.0, r: 0.48, axles: LA, cabL: 2.1, cabTop: 3.3, top: 3.5, hitch: true }, { x: x0, gy: GY, k: K, name: '!!lk' });
        const a = await anhaenger(s, { L: 6.5, floor: 1.0, boxH: 2.4, r: 0.48, axles: AA }, { x: xm(AX), gy: GY, k: K, name: 'ah' });
        seg(s, a.pivot[0], a.pivot[1], xm(7.52), GY - 0.6 * K, { col: '3A4250', th: 0.05, name: '!!dei' });
        // Bremsringe an den Rädern
        const ring = (x, lv, nm) => s.oval(x - 0.3, GY - 0.48 * K - 0.3, 0.6, 0.6, { line: C.red, lw: 1 + 3 * Math.min(1.4, lv / 100), fill: C.red, ft: 100, lt: lv ? 0 : 100, name: nm });
        LA.forEach((ax, k) => ring(xm(ax), t.l, '!!rl' + k));
        AA.forEach((ax, k) => ring(xm(AX + ax), t.a, '!!ra' + k));
        // Balken: wie stark bremst jedes Fahrzeug?
        const bar = (cx, p, lab, nm) => {
          const W = 2.6, x = cx - W / 2;
          s.text([{ text: lab + '  ', options: { color: C.mut } }, { text: p ? p + ' %' : '–', options: { bold: true, color: pctCol(p) } }], { x, y: 1.5, w: W, h: 0.32, size: 14, align: 'center', name: '!!' + nm + 't' });
          s.rrect(x, 1.85, W, 0.3, { fill: '0B1119', line: '3C4656', rr: 0.3, name: '!!' + nm + 'b' });
          s.rrect(x, 1.85, Math.max(0.05, W * Math.min(150, p) / 150), 0.3, { fill: pctCol(p), ft: p ? 0 : 100, rr: 0.3, name: '!!' + nm + 'f' });
          s.rect(x + W * 100 / 150 - 0.01, 1.78, 0.025, 0.44, { fill: C.txt, name: '!!' + nm + 'm' });
        };
        bar(xm(3.75), t.l, 'Lkw bremst', 'bl');
        bar(xm(AX + 3.25), t.a, 'Anhänger bremst', 'ba');
        // Koppelkraft
        const cx = (xm(7.5) + xm(AX)) / 2, L = 0.75 * Math.abs(t.kop), col = t.kop < 0 ? C.red : C.or;
        arrow(s, t.kop < 0 ? cx + L : cx - L, 2.75, t.kop < 0 ? cx - L : cx + L, 2.75, { col, th: 0.09, head: 0.26, name: 'kop', hide: Math.abs(t.kop) < 0.3 });
        s.text(t.kop <= -0.3 ? 'Anhänger schiebt' : t.kop >= 0.9 ? 'Anhänger zieht' : t.kop >= 0.3 ? 'zieht leicht' : t.l ? 'Koppelkraft klein' : '', { x: cx - 1.3, y: 2.26, w: 2.6, h: 0.32, size: 14, bold: true, color: t.kop <= -0.3 ? C.red : t.kop >= 0.9 ? C.or : C.gr, align: 'center', name: '!!kopt' });
        s.text(t.msg, { x: 5.75, y: 5.0, w: 7.3, h: 1.2, size: 17, bold: true, color: t.mc, align: 'center', valign: 'middle', name: '!!msg' });
      },
    });
  }
  await quiz(deck, 'ce3k', {
    kicker: 'Prüfungsfrage 2.7.06-108', q: 'Wann ist für einen druckluftgebremsten Lastzug die Gefahr besonders groß, auf glatter Fahrbahn einzuknicken oder zu schleudern?', size: 28,
    opts: ['Wenn der Retarder bei Kurvenfahrt voll betätigt wird', 'Wenn der Lkw bei Kurvenfahrt stärker bremst als der Anhänger', 'Wenn die Ladung überwiegend die Antriebsachse belastet'], ok: [0, 1],
    why: 'Beides heißt: Der Lkw bremst stärker als der Anhänger – der Anhänger schiebt.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-108: A und B.\n➜ „Kapitel 2: Woher weiß der Anhänger, wie schwer er ist?“',
  });

  // ===== KAPITEL 2: LASTANPASSUNG UND EBS =====
  await chapter(deck, 'ce3l', { num: 2, ttl: 'Lastanpassung und EBS', sub: 'Ein leerer Anhänger braucht wenig Bremsdruck, ein voller viel. Woher weiß er, wie schwer er ist?', ico: 'LuGauge', notes:
    '▶ Sagen: „Ein Anhänger wiegt leer vielleicht 6 Tonnen, voll 24. Bremst er leer mit vollem Druck, blockieren die Räder. Also muss er wissen, wie schwer er gerade ist.“\n✅ Wiederholung aus C5 (ALB am Lkw). Beispielgewichte: grobe Werte.\n🖱 Keine Klicks.\n➜ „So misst der Anhänger seine Last.“' });
  {
    const K = 0.72, GY = 4.25, TX = 6.2, AA = [1.2, 5.3], L = 6.5;
    const ST = [
      { pal: 0, bp: 0.2, bd: 0.25, info: 'Leer: wenig Luft im Balg – wenig Bremsdruck. Die Räder blockieren nicht.', col: C.gr },
      { pal: 1, bp: 0.55, bd: 0.6, info: 'Halb beladen: mehr Luft im Balg – mehr Bremsdruck.', col: C.gr },
      { pal: 2, bp: 1, bd: 1, info: 'Voll beladen: viel Luft im Balg – voller Bremsdruck.', col: C.gr },
      { pal: 2, bp: 0.12, bd: 0.15, leak: 1, info: 'Balg undicht: Die Messung stimmt nicht mehr – der Bremsdruck ist falsch. Von hinten seht ihr: Der Anhänger hängt schief.', col: C.red },
    ];
    await steps(deck, 'ce3l', {
      kicker: 'Lastanpassung', ttl: 'Der Anhänger wiegt sich',
      list: ['Leer', 'Halb beladen', 'Voll beladen', 'Luftbalg undicht'],
      ask: { q: 'Euer Anhänger ist leer. Ihr bremst kräftig. Warum blockieren seine Räder nicht?', a: 'Die Lastanpassung misst am Luftbalg, wie schwer er ist – und gibt weniger Druck in die Bremszylinder.', at: 2 },
      caps: [
        'Bei Luftfederung misst der Anhänger den Druck im Luftbalg. Bei Blattfedern misst er, wie weit die Feder einfedert.',
        'Je mehr Ladung, desto mehr Luft im Balg – und desto mehr Bremsdruck darf er geben.',
        'Voll beladen: voller Bremsdruck. So bremst der Anhänger leer wie voll passend zu seinem Gewicht.',
        'Ein undichter Balg verfälscht die Messung: Die Bremswirkung stimmt nicht mehr. Ab in die Werkstatt!',
      ],
      notes: [
        '▶ Sagen: „Hier ein Anhänger mit Luftfederung. Über jeder Achse sitzt ein Luftbalg. Je schwerer der Anhänger, desto mehr Luft braucht der Balg, um ihn zu tragen. Diesen Druck misst die Lastanpassung – früher das ALB-Ventil, heute meist das EBS.“\n❓ Frage auf der Folie stellen.\n✅ WABCO TEBS E System Description, Kap. 5.9.2: Last über Balgdruck (Luftfederung) bzw. Federweg (mechanische Federung). Prüfungsfrage 2.7.06-233: Bremskraft wird der tatsächlichen Fahrzeugmasse angepasst.\n➜ „Jetzt wird beladen.“',
        '▶ „Halb beladen: Der Balg braucht mehr Luft. Die Lastanpassung gibt mehr Bremsdruck frei.“\n✅ Prüfungsfrage 2.7.06-208: Die Bremskraft wird entsprechend der Belastung der Achsen automatisch geregelt.\n➜ „Und voll?“',
        '▶ „Voll beladen: viel Luft im Balg, voller Bremsdruck. So passt die Bremse immer zum Gewicht. Wichtig: Das ist kein ABS. Die Lastanpassung kennt nur das Gewicht – nicht, ob die Straße glatt ist.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.06-210: ALB passt die Bremskraft der Achslast an; ABS verhindert unabhängig von Gewicht und Fahrbahn das Blockieren (falsch: ALB passt an den Fahrbahnzustand an).\n➜ „Was, wenn der Balg kaputt ist?“',
        '▶ „Ist der Balg stark undicht, stimmt die Messung nicht mehr – der Bremsdruck ist falsch. Und das Fahrzeug hängt auf der Seite schief. Das seht ihr bei der Abfahrtkontrolle.“\n✅ Prüfungsfrage 2.7.02-211: Das Fahrzeug neigt sich einseitig; die Bremswirkung wird durch einen falschen Steuerdruck der ALB beeinträchtigt. WABCO: Im pneumatischen Notbetrieb fehlt die Lastanpassung ganz – ein leerer Anhänger blockiert dann leichter.\n➜ „Und wie kommt der Bremswunsch zum Anhänger?“',
      ],
      legend: 'Seitenansicht · schematisch',
      scene: async (s, i) => {
        const t = ST[i];
        s.rect(5.0, GY, 8.05, 0.03, { fill: '3C4656', name: '!!boden' });
        const ah = await anhaenger(s, { L, floor: 1.15, boxH: 0.6, r: 0.45, axles: AA, box: 'pritsche' }, { x: TX, gy: GY, k: K, name: 'ah' });
        // Deichsel mit Zugöse
        const [dx, dy] = ah.pt(AA[0], 0.88), ey = GY - 0.78 * K;
        seg(s, dx, dy, TX - 0.95, ey, { col: '5E6876', th: 0.08, name: '!!deichsel' });
        s.oval(TX - 1.08, ey - 0.1, 0.2, 0.2, { fill: '14181E', line: '8C96A4', lw: 2, name: '!!oese' });
        // Paletten
        for (let k = 0; k < 5; k++) {
          const on = t.pal === 2 || (t.pal === 1 && k < 3);
          s.rrect(TX + (0.25 + k * 1.22) * K, GY - (1.75 + 1.15) * K, 1.1 * K, 1.15 * K, { fill: 'B98A4E', ft: on ? 0 : 100, line: on ? '8A6334' : undefined, lw: 0.75, rr: 0.05, name: '!!pa' + k });
        }
        // Luftbälge über den Achsen
        AA.forEach((ax, k) => {
          const x = TX + ax * K, hb = t.leak ? 0.13 : 0.26, wb = t.leak ? 0.5 : 0.42;
          s.rrect(x - wb / 2, GY - 1.0 * K - hb / 2 + (t.leak ? 0.05 : 0), wb, hb, { fill: t.leak ? '5A2A2E' : '1F3A63', line: t.leak ? C.red : '4C8DF0', lw: 1.5, rr: 0.4, name: '!!balg' + k });
        });
        s.text(t.leak ? 'Luftbalg undicht!' : 'Luftbälge', { x: TX + 1.2 * K - 1.0, y: GY + 0.12, w: 2.0, h: 0.3, size: 13, bold: true, color: t.leak ? C.red : '4C8DF0', align: 'center', name: '!!balgt' });
        // Anzeigen
        const gauge = (y, lab, v, col, nm) => {
          s.text(lab, { x: 6.2, y, w: 2.8, h: 0.36, size: 14, color: C.mut, valign: 'middle', name: '!!' + nm + 'l' });
          s.rrect(9.0, y + 0.05, 3.9, 0.26, { fill: '0B1119', line: '3C4656', rr: 0.3, name: '!!' + nm + 'b' });
          s.rrect(9.0, y + 0.05, Math.max(0.06, 3.9 * v), 0.26, { fill: col, rr: 0.3, name: '!!' + nm + 'f' });
        };
        gauge(4.6, 'Druck im Luftbalg', t.bp, t.leak ? C.red : '4C8DF0', 'g1');
        gauge(5.05, 'Bremsdruck (Vollbremsung)', t.bd, t.leak ? C.red : C.gr, 'g2');
        s.text(t.info, { x: 6.2, y: 5.55, w: 6.85, h: 0.85, size: 16, bold: true, color: t.col, valign: 'middle', name: '!!info' });
      },
    });
  }

  // ===== ZWEI WEGE ZUM ANHÄNGER (EBS, fließend) =====
  {
    const CY = 2.75, AY = 4.05;
    const cable = [[8.05, CY], [12.0, CY]], air = [[8.05, AY], [12.0, AY]];
    let ph = 0;
    const fr = (t, o = {}) => ({ ...o, t: { ...t, ph: ph++ } });
    await motion(deck, 'ce3l', {
      kicker: 'EBS', ttl: 'Zwei Wege zum Anhänger', dur: 550, holdDur: 650,
      question: 'Woher weiß der Anhänger, wie stark ihr bremsen wollt?',
      answer: 'Auf zwei Wegen: elektrisch über das Kabel im ABS/EBS-Stecker und mit Luft über die gelbe Leitung. Fehlt der Stecker, bleibt nur gelb.',
      legend: 'Schema · vereinfacht',
      frames: [
        fr({ plug: 1, brake: 0, msg: 'Fahren: Der Stecker ist drin. Nichts wird gebremst.', mc: C.mut }, { hold: true,
          cap: 'Beim EBS bekommt der Anhänger den Bremswunsch doppelt: als elektrisches Signal und als Luftdruck in der gelben Leitung.',
          note: '▶ Sagen: „Links der Lkw mit seinem EBS-Steuergerät, rechts der Anhänger mit seinem Bremsmodul. Dazwischen zwei Verbindungen: das Kabel im schwarzen ABS/EBS-Stecker und die gelbe Leitung.“\n❓ Frage auf der Folie stellen.\n✅ WABCO EBS3 Systembeschreibung: Anhänger wird elektronisch (ISO 11992, CAN im ISO-7638-Stecker) und pneumatisch über das Anhängersteuerventil angesteuert.\n🖱 Klick: Der Fahrer bremst (läuft von selbst weiter).\n➜ „Jetzt wird gebremst.“' }),
        fr({ plug: 1, brake: 1, msg: 'Bremsen: Das Signal läuft durch das Kabel – und Luft durch gelb.', mc: C.am }),
        fr({ plug: 1, brake: 1, msg: 'Der Anhänger nimmt das elektrische Signal. Gelb ist die Reserve.', mc: C.am }, { hold: true,
          cap: 'Der Anhänger nimmt zuerst das elektrische Signal: schnell, mit Lastanpassung, ABS und Kippschutz. Gelb ist die Reserve.',
          note: '▶ „Bremst ihr, läuft das Signal durch das Kabel – sehr schnell. Gleichzeitig kommt Luft durch gelb. Der Anhänger nimmt zuerst das elektrische Signal. Dann regelt er selbst: Last, ABS und Kippschutz. Die gelbe Leitung ist die Reserve.“\n✅ WABCO TEBS E System Description, Kap. 5.9.1: Bremswunsch vorrangig über CAN; fehlt CAN, misst ein Drucksensor am gelben Anschluss. Kap. 5.1: TEBS mit Lastanpassung, ABS und Kippschutz (RSS).\n🖱 Klick: Was, wenn der Stecker fehlt?\n➜ „Und ohne Stecker?“' }),
        fr({ plug: 0, brake: 0, msg: 'Der Stecker fehlt.', mc: C.red }),
        fr({ plug: 0, brake: 1, msg: 'Ohne Stecker bremst der Anhänger nur über gelb – ohne ABS, ohne Lastanpassung, ohne Kippschutz.', mc: C.red }, { hold: true, answer: true,
          cap: 'Ohne Stecker: kein Strom, keine Daten. Der Anhänger bremst nur noch über gelb – ohne ABS, ohne Lastanpassung, ohne Kippschutz.',
          note: '▶ „Fehlt der Stecker, hat das Bremsmodul keinen Strom und keine Daten. Der Anhänger bremst trotzdem – über gelb. Aber ohne ABS, ohne Lastanpassung und ohne Kippschutz. Ein leerer Anhänger blockiert dann sehr leicht.“\n❓ Frage auf der Folie auflösen.\n✅ WABCO TEBS E, Kap. 5.7: „The ABS, EBS and RSS control functions are not available if the ISO 7638 plug connection … is not connected.“ Kap. 5.9: ohne Strom wird der gelbe Steuerdruck ohne Lastanpassung durchgeschaltet. Prüfungsfrage 2.7.06-315: ABV kann abgeschaltet sein; Bremsung mit pneumatischem Redundanzdruck.\n🖱 Nächster Klick: nächste Folie.\n➜ „Zwei Prüfungsfragen.“' }),
      ],
      scene: async (s, t) => {
        const ph = t.ph;
        // Bereiche
        s.rrect(5.75, 1.62, 2.3, 3.9, { fill: '0E1520', line: '2A3B52', rr: 0.08, name: '!!zl' });
        s.rrect(11.75, 1.62, 1.3, 3.9, { fill: '0E1520', line: '2A3B52', rr: 0.08, name: '!!za' });
        s.text('LKW', { x: 5.9, y: 1.68, w: 1.5, h: 0.3, size: 12, bold: true, color: C.dim, cs: 3, name: '!!zlt' });
        s.text('ANHÄNGER', { x: 11.8, y: 1.68, w: 1.25, h: 0.3, size: 10, bold: true, color: C.dim, cs: 1, name: '!!zat' });
        // Kabel (mit Lücke am Stecker, wenn er fehlt)
        seg(s, 8.05, CY, t.plug ? 12.0 : 9.6, CY, { col: '2A303A', th: 0.12, name: '!!cab1' });
        seg(s, t.plug ? 9.9 : 10.5, CY, 12.0, CY, { col: '2A303A', th: 0.12, name: '!!cab2' });
        s.rrect(t.plug ? 9.55 : 9.45, CY - 0.17, 0.42, 0.34, { fill: '1A1F27', line: '6E7886', lw: 1.5, rr: 0.2, rotate: t.plug ? 0 : 25, name: '!!plug' });
        s.text(t.plug ? 'ABS/EBS-Stecker (ISO 7638)' : 'Stecker fehlt!', { x: 8.3, y: CY - 0.62, w: 3.5, h: 0.3, size: 12, bold: true, color: t.plug ? C.mut : C.red, align: 'center', name: '!!plugt' });
        dots(s, cable, 'FFFFFF', t.plug && t.brake, 'c', ph * 2);
        s.text('Daten und Strom', { x: 8.3, y: CY + 0.2, w: 3.5, h: 0.28, size: 11, color: t.plug ? C.mut : C.dim, align: 'center', name: '!!cabt' });
        // gelbe Leitung
        seg(s, 8.05, AY, 12.0, AY, { col: t.brake ? C.am : '4A4224', th: 0.09, name: '!!air' });
        dots(s, air, C.am, !!t.brake, 'a', ph);
        s.text('gelbe Leitung (Luft)', { x: 8.3, y: AY + 0.18, w: 3.5, h: 0.28, size: 11, color: C.mut, align: 'center', name: '!!airt' });
        // Lkw: Pedal + Steuergerät
        s.rrect(6.05, 2.35, 1.7, 2.2, { fill: '16202E', line: t.brake ? C.or : '4A5668', lw: t.brake ? 2.5 : 1.25, rr: 0.12, name: '!!ecu' });
        s.text('EBS-\nSteuergerät\nLkw', { x: 6.05, y: 2.35, w: 1.7, h: 2.2, size: 12, bold: true, color: C.mut, align: 'center', valign: 'middle', name: '!!ecut' });
        s.rrect(6.25, 4.82, 0.6, 0.14, { fill: t.brake ? C.txt : '7A8494', rr: 0.3, rotate: t.brake ? 8 : -18, name: '!!pd' });
        s.text(t.brake ? 'Pedal getreten' : 'Pedal', { x: 6.9, y: 4.7, w: 1.4, h: 0.36, size: 11, color: t.brake ? C.txt : C.dim, valign: 'middle', name: '!!pdt' });
        // Anhänger-Modul + Funktionen
        s.rrect(11.9, 2.35, 1.0, 2.2, { fill: '16202E', line: t.brake ? C.or : '4A5668', lw: t.brake ? 2.5 : 1.25, rr: 0.12, name: '!!mod' });
        s.text('Brems-\nmodul', { x: 11.9, y: 2.35, w: 1.0, h: 2.2, size: 11, bold: true, color: C.mut, align: 'center', valign: 'middle', name: '!!modt' });
        const fn = [['ABS', 'abs'], ['Last', 'last'], ['Kippschutz', 'rss']];
        fn.forEach(([lab, nm], k) => {
          const ok = !!t.plug;
          s.text((ok ? '✓ ' : '✕ ') + lab, { x: 11.8, y: 4.65 + k * 0.28, w: 1.25, h: 0.28, size: 11, bold: true, color: ok ? C.gr : C.red, name: '!!f' + nm });
        });
        s.text(t.msg, { x: 5.75, y: 5.6, w: 7.3, h: 0.95, size: 16, bold: true, color: t.mc, align: 'center', valign: 'middle', name: '!!msg' });
      },
    });
  }
  await quiz(deck, 'ce3l', {
    kicker: 'Prüfungsfrage 2.7.02-211', q: 'Welche Auswirkungen kann ein stark undichter Luftfederbalg für die Verkehrssicherheit haben?', size: 30, osize: 17,
    opts: ['Das Fahrzeug neigt sich einseitig', 'Die Bremswirkung wird durch einen falschen Steuerdruck der automatisch-lastabhängigen Bremskraftregelung (ALB) beeinträchtigt', 'Die Vorratsleitung des vorderen Bremskreises verliert Druckluft'], ok: [0, 1],
    why: 'Der Balg trägt das Fahrzeug – und er ist der Messfühler für die Lastanpassung.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.02-211: A und B.\n➜ „Noch eine.“',
  });
  await quiz(deck, 'ce3l', {
    kicker: 'Prüfungsfrage 2.7.06-210', q: 'Wie unterscheiden sich automatisch-lastabhängige Bremskraftregelung (ALB) und Antiblockiersystem (ABS) in ihrer Wirkung?', size: 28, osize: 17,
    opts: ['ABS verhindert beim Bremsen unabhängig von Gewicht und Fahrbahnzustand automatisch das Blockieren der Räder', 'ALB passt die Bremskraft automatisch der Achslast an', 'ALB passt die Bremskraft automatisch dem Fahrbahnzustand an'], ok: [0, 1],
    why: 'ALB kennt nur das Gewicht. Ob die Straße glatt ist, merkt nur das ABS.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-210: A und B.\n➜ „Kapitel 3: der ABS-Stecker.“',
  });
};
