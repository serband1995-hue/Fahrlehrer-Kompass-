// Abend 6 · CE1: Kapitel 4 Maße und Kurvenlauf (Abmessungen, Längen-Lineal, Kreisring nach § 32d StVZO)
const { C, sec, chapter, steps, motion, ask, quiz, lkw, auflieger, anhaenger, seg, svgImg } = require('../gs');

sec('ce1m', 'CE1  ·  MASSE UND KURVENLAUF', C.pu, 'bg_pu.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce1m', { num: 4, ttl: 'Maße und Kurvenlauf', sub: 'Wie breit, wie hoch, wie lang darf ein Zug sein – und wie viel Platz braucht er in der Kurve?', ico: 'LuRuler', notes:
    '▶ Sagen: „Kapitel 4: Maße. Mit Anhänger wird der Zug lang – und in der Kurve braucht er viel Platz. Dafür gibt es feste Grenzen.“\n✅ § 32 und § 32d StVZO, § 22 StVO.\n🖱 Keine Klicks.\n➜ „Erst die Grundmaße.“' });

  // ===== GRUNDMASSE =====
  await ask(deck, 'ce1m', {
    kicker: 'Abmessungen', q: 'Wie breit und wie hoch darf euer Zug sein?', ico: 'LuRuler', qsize: 34,
    answers: [
      ['LuMoveHorizontal', 'Breite 2,55 m', 'Kühlaufbau mit dicken Wänden: 2,60 m. Die Spiegel zählen nicht mit.', C.pu, 17],
      ['LuMoveVertical', 'Höhe 4,00 m', 'Kennt die echte Höhe von Fahrzeug und Ladung – und beachtet Schilder an Brücken.', C.pu, 17],
      ['LuRuler', 'Länge eines Fahrzeugs 12,00 m', 'Gilt für den Lkw und den Deichselanhänger – jeden für sich. Nicht für den Auflieger.', C.pu, 17],
      ['LuTriangleAlert', 'Keine Toleranz', 'Auf diese Maße gibt es keinen Zuschlag.', C.red, 17],
    ],
    notes:
      '▶ Sagen: „Wie breit und wie hoch darf ein Zug sein?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Maß.\n' +
      '✅ § 32 StVZO: Abs. 1 Breite 2,55 m, klimatisierte Aufbauten (Wände mind. 45 mm) 2,60 m, Spiegel zählen nicht. Abs. 2 Höhe 4,00 m. Abs. 3 Länge Einzelfahrzeug 12,00 m (nicht Sattelanhänger). Abs. 8: keine Toleranzen. Prüfungsfrage 2.6.06-101: tatsächliche Höhe von Fahrzeug und Ladung kennen und Höhenverbote beachten.\n' +
      '💡 Keine Toleranz heißt: keine Messtoleranz. Ausnahmen regelt das Gesetz selbst (z. B. verlängertes Führerhaus, 45-Fuß-Container +15 cm; § 32 Abs. 3 Satz 2, Abs. 4b, 4c und 6 StVZO).\n' +
      '💡 Höhe am Armaturenbrett notieren – Brücken verzeihen nichts.\n' +
      '➜ „Und wie lang darf ein ganzer Zug sein?“',
  });

  // ===== LÄNGEN-LINEAL =====
  {
    const x0 = 5.75, K = 0.27, GY = 3.75, RY = GY + 0.32, BY = RY + 0.55;
    const ST = [
      { len: 16.5, col: C.pu, v: '16,50 m', n: 'Sattelzug', info: 'Sattelzug: 16,50 m. Dafür muss der Auflieger passen: vom Königszapfen bis zum Heck höchstens 12,00 m, vorn (Überhangradius) höchstens 2,04 m. Sonst gelten 15,50 m.' },
      { len: 18.75, col: C.bl, v: '18,75 m', n: 'Lkw mit Anhänger', info: 'Lkw mit Anhänger: 18,75 m. Lkw und Anhänger sind dabei jeder für sich höchstens 12,00 m lang.' },
      { len: 20.75, col: C.or, v: '20,75 m', n: 'mit Ladung, die hinten übersteht', info: 'Zug samt Ladung: höchstens 20,75 m. Mehr als 1 m über die Rückstrahler: hellrote Fahne (mind. 30 × 30 cm). Überstand hinten höchstens 1,50 m – auf Fahrten bis 100\u00A0km höchstens 3 m.' },
      { len: 25.25, col: C.gr, v: '25,25 m', n: 'Lang-Lkw', info: 'Lang-Lkw (Ausnahme-Verordnung), hier Sattelzug mit Zentralachsanhänger: bis\u00A025,25 m. Nur auf freigegebenen Strecken, Überholverbot. Fahrer: seit 5 Jahren CE und 5 Jahre Berufserfahrung.' },
    ];
    await steps(deck, 'ce1m', {
      kicker: 'Länge', ttl: 'Wie lang darf ein Zug sein?',
      list: ['Sattelzug', 'Lkw mit Anhänger', 'Mit Ladung', 'Lang-Lkw'],
      ask: { q: 'Wie lang darf ein Lkw mit Anhänger sein – und wie lang mit Ladung?', a: '18,75 m. Mit Ladung, die hinten übersteht: höchstens 20,75 m.', at: 2 },
      caps: [
        'Der Sattelzug: 16,50 m – wenn der Auflieger die Teillängen einhält.',
        'Lkw mit Anhänger: höchstens 18,75 m.',
        'Mit Ladung, die hinten übersteht: höchstens 20,75 m. Ragt sie mehr als 1 m über die Rückstrahler: hellrote Fahne.',
        'Lang-Lkw bis 25,25 m: nur auf erlaubten Strecken und nur mit Erfahrung.',
      ],
      notes: [
        '▶ Sagen: „Unten seht ihr ein Lineal in Metern. Der Sattelzug: 16,50 Meter – wenn der Auflieger passt. Vom Königszapfen bis zum Heck höchstens 12 Meter, nach vorn höchstens 2,04 Meter. Sonst 15,50 Meter.“\n❓ Frage auf der Folie stellen.\n✅ § 32 Abs. 4 Nr. 1 und 2 StVZO: Sattelkraftfahrzeug 15,50 m; 16,50 m, wenn Königszapfen bis Heck höchstens 12,00 m und vorderer Überhangradius höchstens 2,04 m.\n➜ „Lkw mit Anhänger?“',
        '▶ „Lkw mit Anhänger: 18,75 Meter. Lkw und Anhänger sind dabei jeder für sich höchstens 12 Meter lang.“\n✅ § 32 Abs. 4 Nr. 4 StVZO: Lastzug 18,75 m (Teillängen: Ladefläche vorn bis hinten höchstens 16,40 m, ohne Lücke 15,65 m). § 32 Abs. 3: Einzelfahrzeug 12,00 m. Prüfungsfrage 2.6.06-301: 18,75 m (falsch: 18,00 m, 20,00 m).\n➜ „Und mit Ladung?“',
        '▶ „Mit Ladung, die hinten übersteht: Zug samt Ladung höchstens 20,75 Meter. Ragt die Ladung mehr als einen Meter über die Rückstrahler, braucht ihr eine hellrote Fahne. Mehr als 1,50 Meter Überstand – höchstens 3 Meter – nur, wenn die Fahrt höchstens 100 Kilometer lang ist. Im Bild sind es 2 Meter: also nur auf kurzen Fahrten.“\n❓ Frage auf der Folie auflösen.\n✅ § 22 Abs. 4 StVO: nach hinten bis 1,50 m, bei Fahrten bis 100 km bis 3 m; Zug samt Ladung höchstens 20,75 m; Kennzeichnung bei mehr als 1 m über die Rückstrahler (hellrote Fahne mind. 30 × 30 cm, Schild oder Zylinder, höchstens 1,50 m über der Fahrbahn). Prüfungsfragen 2.6.06-201 / 2.2.22-006, 2.6.06-307 und 2.2.22-005: 20,75 m.\n💡 Im Dunkeln zusätzlich rote Leuchte (höchstens 1,50 m hoch) und roter Rückstrahler (höchstens 90 cm) – Prüfungsfrage 2.2.22-109.\n➜ „Und der längste Zug?“',
        '▶ „Der Lang-Lkw. Bis 25,25 Meter. Den gibt es als Sattelzug mit Zentralachsanhänger, als Lkw mit Dolly und Auflieger oder als Sattelzug mit zweitem Auflieger. Er darf nur auf freigegebenen Strecken fahren und nicht überholen. Fahrer brauchen seit fünf Jahren CE und fünf Jahre Berufserfahrung. Achtung: Das ist eine Ausnahme – normal gilt, wie vorhin: hinter dem Sattelzug kein Anhänger.“\n✅ LKWÜberlStVAusnV: § 3 (Fahrzeugarten), § 4 Abs. 2 und 3 (Länge 25,25 m bei Typ 2–4, Typ 5: 24,00 m), § 4 Abs. 4 (Ausnahme von § 32a StVZO: hinter dem Sattelkraftfahrzeug ein Anhänger), § 2 (Positivnetz), § 9 (Überholverbot außer Fahrzeuge bis 25 km/h), § 11 (5 Jahre CE, 5 Jahre Berufserfahrung, Einweisung). Die Verordnung erlaubt nur mehr Länge, kein Mehrgewicht – es gelten die normalen Gewichte (§ 34 StVZO).\n💡 Typ 1 (verlängerter Auflieger, 17,88 m) war bis 31.12.2026 befristet (§ 13 Abs. 1 LKWÜberlStVAusnV) – aktuellen Stand vor dem Unterricht prüfen. Darum nennen wir Typ 1 auf der Folie nicht.\n➜ „Eine Prüfungsfrage.“',
      ],
      legend: 'Seitenansicht · maßstabsgetreu · Lineal in Metern',
      scene: async (s, i) => {
        const t = ST[i], xm = m => x0 + m * K;
        // Lineal
        s.rect(x0, RY, 26 * K, 0.03, { fill: '4A5668', name: '!!rl' });
        for (let m = 0; m <= 26; m++) s.rect(xm(m) - 0.01, RY, 0.02, m % 5 ? 0.07 : 0.15, { fill: m % 5 ? '3A4656' : '738296', name: '!!tm' + m });
        for (let m = 0; m <= 25; m += 5) s.text(m === 25 ? '25 m' : String(m), { x: xm(m) - 0.4, y: RY + 0.15, w: 0.8, h: 0.26, size: 12, color: C.dim, align: 'center', name: '!!tl' + m });
        // Maßklammer
        seg(s, x0, BY, xm(t.len), BY, { col: t.col, th: 0.06, name: '!!brk' });
        s.rect(x0 - 0.02, BY - 0.13, 0.04, 0.26, { fill: t.col, name: '!!bk0' });
        s.rect(xm(t.len) - 0.02, BY - 0.13, 0.04, 0.26, { fill: t.col, name: '!!bk1' });
        s.text(t.v, { x: 8.3, y: 1.42, w: 4.75, h: 0.75, size: 44, bold: true, color: t.col, align: 'right', valign: 'middle', name: '!!lenv' });
        s.text(t.n, { x: 7.3, y: 2.2, w: 5.75, h: 0.35, size: 16, color: C.mut, align: 'right', name: '!!lenn' });
        s.text(t.info, { x: x0, y: 5.0, w: 7.3, h: 1.5, size: 15, color: C.txt, valign: 'top', name: '!!info' });
        // Fahrzeuge
        const sattel = i === 0 || i === 3;
        if (sattel) {
          await lkw(s, { L: 5.9, box: 'none', axles: [1.35, 5.05], sattel: 4.5, floor: 1.0, r: 0.5, cabL: 2.3, cabTop: 3.7, top: 3.8 }, { x: x0, gy: GY, k: K, name: '!!va' });
          await auflieger(s, { L: 13.6, kp: 1.6, lg: 3.4, floor: 1.34, boxH: 2.6, r: 0.5, axles: [7.89, 9.2, 10.51] }, { x: xm(2.9), gy: GY, k: K, name: 'vb' });
        } else {
          await lkw(s, { L: 9.7, box: 'koffer', boxH: 2.7, floor: 1.05, r: 0.5, axles: [1.5, 6.3, 7.65], cabL: 2.2, cabTop: 3.55, top: 3.85, hitch: true }, { x: x0, gy: GY, k: K, name: '!!va' });
          await anhaenger(s, i === 2 ? { L: 8.2, floor: 1.05, boxH: 0.8, r: 0.5, axles: [1.2, 7.0], box: 'pritsche' } : { L: 8.2, floor: 1.05, boxH: 2.7, r: 0.5, axles: [1.2, 7.0] }, { x: xm(10.55), gy: GY, k: K, name: 'vb' });
        }
        if (i === 3) await anhaenger(s, { L: 7.4, axles: [3.25, 4.55], zaa: true, floor: 1.1, boxH: 2.8, r: 0.5 }, { x: xm(17.85), gy: GY, k: K, name: 'vc' });
        // Deichsel
        const dei = i === 3 ? [xm(17.9), GY - 0.9 * K, xm(16.45), GY - 0.75 * K] : [xm(11.75), GY - 0.55 * K, xm(9.72), GY - 0.6 * K];
        seg(s, dei[0], dei[1], dei[2], dei[3], { col: '3A4250', th: 0.04, hide: i === 0, name: '!!dei' });
        // Überstehende Ladung mit roter Fahne
        const ld = i === 2;
        s.rect(xm(10.75), GY - 2.45 * K, (ld ? 10.0 : 0.1) * K, 0.6 * K, { fill: '9C7A4E', ft: ld ? 0 : 100, line: ld ? '6E5536' : undefined, lw: 0.75, name: '!!load' });
        s.rect(xm(20.75) - 0.02, GY - 1.85 * K, 0.14, 0.12, { fill: C.red, ft: ld ? 0 : 100, name: '!!flag' });
      },
    });
  }
  await quiz(deck, 'ce1m', {
    kicker: 'Prüfungsfrage 2.6.06-301', q: 'Wie lang darf ein Zug, bestehend aus einem Lkw und einem Anhänger, ohne dass Ladung hinausragt, höchstens sein?', size: 28,
    opts: ['18,75 m', '18,00 m', '20,00 m'], ok: [0],
    why: '18,75 m für Lkw mit Anhänger. Mit Ladung, die hinten übersteht: höchstens 20,75 m.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.06-301: A. § 32 Abs. 4 Nr. 4 StVZO.\n➜ „Und in der Kurve?“',
  });

  // ===== KREISRING (Draufsicht, fließend) =====
  {
    const S = 0.19, CX = 9.35, CY = 4.1, W2 = 1.275, WB = 7.6;   // WB: Königszapfen bis Achsmitte Auflieger
    const Rr = Math.sqrt(12.5 * 12.5 - 5.05 * 5.05) - W2; // Hinterachse Zugmaschine (vordere äußere Ecke auf 12,50 m)
    const P = (x, y) => [CX + x * S, CY - y * S];
    const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
    const PR = th => [Rr * Math.cos(rad(th)), Rr * Math.sin(rad(th))], HD = th => [-Math.sin(rad(th)), Math.cos(rad(th))];
    const PK = th => { const p = PR(th), h = HD(th); return [p[0] + 0.55 * h[0], p[1] + 0.55 * h[1]]; };
    // Schleppkurve: Der Zug fährt gestreckt in den Kreis (th = 180°). Die Achse des Aufliegers rollt immer auf den
    // Königszapfen zu und rutscht nicht seitlich – darum wächst der Knickwinkel nur nach und nach (ca. 15°, 30°, 40° …).
    const AX = {};
    {
      const k0 = PK(180); let pa = [k0[0], k0[1] + WB];
      for (let i = 0; i <= 3600; i++) {
        const th = 180 + i * 0.05, K = PK(th), dx = K[0] - pa[0], dy = K[1] - pa[1], L = Math.hypot(dx, dy);
        pa = [K[0] - WB * dx / L, K[1] - WB * dy / L];
        if (i % 20 === 0) AX[Math.round(th)] = pa;
      }
    }
    const pose = th => {
      const pr = PR(th), h = HD(th), pk = PK(th), pa = AX[th], L = Math.hypot(pk[0] - pa[0], pk[1] - pa[1]);
      const ht = [(pk[0] - pa[0]) / L, (pk[1] - pa[1]) / L];
      return { pr, h, rot: -th, pk, ht, rotT: deg(Math.atan2(ht[0], ht[1])) };
    };
    // Innerster Punkt des Aufliegers (Innenkante von 1,60 m vor bis 12,00 m hinter dem Königszapfen)
    const innerPt = p => {
      const n = [-p.ht[1], p.ht[0]]; let best = null, bd = 1e9;
      for (let u = -1.6; u <= 12.001; u += 0.05) {
        const q = [p.pk[0] - u * p.ht[0] + W2 * n[0], p.pk[1] - u * p.ht[1] + W2 * n[1]], d = Math.hypot(q[0], q[1]);
        if (d < bd) { bd = d; best = q; }
      }
      return best;
    };
    const ring = await svgImg(`<path fill-rule="evenodd" fill="#7AA2FF" d="M 250 0 A 250 250 0 1 0 250 500 A 250 250 0 1 0 250 0 Z M 250 ${250 - 250 * 5.3 / 12.5} A ${250 * 5.3 / 12.5} ${250 * 5.3 / 12.5} 0 1 0 250 ${250 + 250 * 5.3 / 12.5} A ${250 * 5.3 / 12.5} ${250 * 5.3 / 12.5} 0 1 0 250 ${250 - 250 * 5.3 / 12.5} Z"/>`, 500, 500, 2);
    const box = (s, c, len, rot, o) => { const [x, y] = P(c[0], c[1]); s.rrect(x - W2 * S, y - len * S / 2, 2 * W2 * S, len * S, { rotate: Math.round(((rot % 360) + 360) % 360 * 10) / 10, rr: 0.15, ...o }); };
    const fr = (t, o = {}) => ({ ...o, t });
    await motion(deck, 'ce1m', {
      kicker: 'Kurvenlauf', ttl: 'Der Kreisring', dur: 560, holdDur: 800,
      question: 'Wie viel Platz braucht euer Sattelzug, wenn er einmal im Kreis fährt?',
      answer: 'Außen ein Kreis mit 12,50 m Radius. Innen bleiben mindestens 5,30 m frei. Der Ring dazwischen ist höchstens 7,20 m breit.',
      legend: 'Draufsicht · maßstabsgetreu (Sattelzug 16,50 m)',
      frames: [
        fr({ th: 180 }, { hold: true, cap: 'Der Prüfkreis aus dem Gesetz: 12,50 m Radius. Die vordere äußere Ecke des Zuges fährt genau auf diesem Kreis.',
          note: '▶ Sagen: „Jedes Fahrzeug und jeder Zug muss diesen Test schaffen: einmal ganz im Kreis fahren. Der Zug steht noch gestreckt am Kreis. Die vordere äußere Ecke – der orange Punkt – fährt auf einem Kreis mit 12,50 Meter Radius.“\n❓ Frage auf der Folie stellen.\n✅ § 32d Abs. 1 StVZO: Kreisfahrt 360°, Außenradius 12,50 m, die überstrichene Ringfläche höchstens 7,20 m breit.\n🖱 Klick: Der Zug fährt in den Kreis (läuft von selbst weiter).\n➜ „Schaut auf den Auflieger.“' }),
        fr({ th: 200 }),
        fr({ th: 220 }),
        fr({ th: 245 }),
        fr({ th: 270, inner: 1 }, { hold: true, cap: 'Der Auflieger läuft weiter innen: Er schneidet die Kurve. Sein innerster Punkt darf nicht näher als 5,30 m an die Kreismitte kommen.',
          note: '▶ „Seht ihr den Auflieger? Er knickt nicht auf einmal ein, sondern nach und nach – er folgt dem Königszapfen. Und er fährt nicht in der Spur der Zugmaschine: Er läuft weiter innen, er schneidet die Kurve. Darum ist innen mehr Platz nötig, als man denkt.“\n✅ Schleppkurve: Der Anhänger bzw. Auflieger läuft auf einem kleineren Radius als das Zugfahrzeug (Prüfungsfrage 2.7.01-310: kann die Kurve schneiden). Eigene Rechnung für diesen Sattelzug (Radstand 3,70 m, Sattelvormaß 0,55 m, Königszapfen–Achsmitte 7,60 m): Der Knickwinkel wächst beim Einfahren langsam auf etwa 45°; der innerste Punkt liegt dann bei etwa 5,5 m.\n🖱 Klick: Der Zug fährt weiter.\n➜ „Und was ergibt das zusammen?“' }),
        fr({ th: 300, inner: 1 }),
        fr({ th: 330, inner: 1 }),
        fr({ th: 360, inner: 1, ring: 1 }, { hold: true, answer: true, cap: 'Der Ring zwischen den Kreisen darf höchstens 7,20 m breit sein. Beim Einfahren darf kein Teil mehr als 0,80 m nach außen ausschwenken.',
          note: '▶ „Das ist der Kreisring: außen 12,50 Meter, innen mindestens 5,30 Meter. Der Ring ist höchstens 7,20 Meter breit. Und beim Einlenken aus der Geraden darf kein Teil mehr als 80 Zentimeter nach außen ausschwenken.“\n❓ Frage auf der Folie auflösen.\n✅ § 32d Abs. 1 StVZO (12,50 m / 7,20 m → innen mindestens 5,30 m, eigene Rechnung) und Abs. 2 (kein Teil darf die Gerade um mehr als 0,80 m nach außen überschneiden).\n💡 Praxis: Im Kreisverkehr und beim Abbiegen braucht der Zug innen viel Platz – Radfahrer und Fußgänger im Blick behalten!\n🖱 Nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage dazu.“' }),
      ],
      scene: async (s, t) => {
        const p = pose(t.th);
        // Kreise
        s.img(ring, { x: CX - 12.5 * S, y: CY - 12.5 * S, w: 25 * S, h: 25 * S, transparency: t.ring ? 72 : 100, name: '!!ring' });
        s.oval(CX - 12.5 * S, CY - 12.5 * S, 25 * S, 25 * S, { line: C.pu, lw: 2, dash: 'dash', fill: C.pu, ft: 100, name: '!!ko' });
        s.oval(CX - 5.3 * S, CY - 5.3 * S, 10.6 * S, 10.6 * S, { line: C.pu, lw: 2, dash: 'dash', lt: t.inner ? 0 : 100, fill: C.pu, ft: 100, name: '!!ki' });
        s.oval(CX - 0.05, CY - 0.05, 0.1, 0.1, { fill: C.mut, name: '!!km' });
        s.text('Außenkreis  R = 12,50 m', { x: CX - 1.6, y: CY - 12.5 * S - 0.36, w: 3.2, h: 0.3, size: 13, bold: true, color: C.pu, align: 'center', name: '!!kot' });
        s.text(t.inner ? 'Innenkreis\nmind. 5,30 m' : '', { x: CX - 0.8, y: CY - 5.3 * S + 0.1, w: 1.6, h: 0.5, size: 12, bold: true, color: C.pu, align: 'center', name: '!!kit' });
        // Ringbreite
        const a = rad(45), b0 = P(5.3 * Math.cos(a), 5.3 * Math.sin(a)), b1 = P(12.5 * Math.cos(a), 12.5 * Math.sin(a));
        seg(s, b0[0], b0[1], b1[0], b1[1], { col: C.white, th: 0.04, hide: !t.ring, name: '!!rb' });
        s.text(t.ring ? 'Ring höchstens\n7,20 m breit' : '', { x: b1[0] + 0.1, y: b1[1] - 0.62, w: 1.9, h: 0.6, size: 14, bold: true, color: C.white, name: '!!rbt' });
        // Zug: Fahrgestell der Zugmaschine, darüber der Auflieger (liegt auf der Sattelplatte), obenauf das Fahrerhaus
        box(s, [p.pr[0] + 2.1 * p.h[0], p.pr[1] + 2.1 * p.h[1]], 5.9, p.rot, { fill: '5E6876', name: '!!tz' });
        const tc = [p.pk[0] + (1.6 - 6.8) * p.ht[0], p.pk[1] + (1.6 - 6.8) * p.ht[1]];
        box(s, tc, 13.6, p.rotT, { fill: 'C9D0DA', line: '97A1AE', lw: 1, name: '!!tr' });
        box(s, [p.pr[0] + 3.9 * p.h[0], p.pr[1] + 3.9 * p.h[1]], 2.3, p.rot, { fill: 'E4E8EE', line: 'AEB6C2', lw: 1, name: '!!tc' });
        // Messpunkte: vordere äußere Ecke (außen), innerster Punkt des Aufliegers (innen)
        const n = [-p.h[1], p.h[0]];  // links vom Fahrer = zur Kreismitte
        const fo = [p.pr[0] + 5.05 * p.h[0] - W2 * n[0], p.pr[1] + 5.05 * p.h[1] - W2 * n[1]], fp = P(fo[0], fo[1]);
        s.oval(fp[0] - 0.07, fp[1] - 0.07, 0.14, 0.14, { fill: C.or, name: '!!mo' });
        const iq = innerPt(p), ip = P(iq[0], iq[1]);
        s.oval(ip[0] - 0.07, ip[1] - 0.07, 0.14, 0.14, { fill: C.or, ft: t.inner ? 0 : 100, name: '!!mi' });
      },
    });
  }
  await quiz(deck, 'ce1m', {
    kicker: 'Prüfungsfrage 2.7.01-310', q: 'Wie wirken sich die Kurvenlaufeigenschaften einer Fahrzeugkombination (Kraftfahrzeug mit Anhänger) beim Abbiegen aus? Der Anhänger …', size: 26,
    opts: ['… kann ausschwenken', '… kann die Kurve schneiden', '… läuft in der Regel in der Spur des Zugfahrzeugs'], ok: [0, 1],
    why: 'Der Anhänger schneidet die Kurve innen – und sein Heck kann nach außen ausschwenken.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.01-310: A und B. § 32d StVZO (Kreisring, Ausschermaß 0,80 m).\n➜ „Kapitel 5: Wie schwer darf der Zug sein – und welchen Führerschein braucht ihr?“',
  });
};
