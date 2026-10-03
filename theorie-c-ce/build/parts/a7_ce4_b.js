// Abend 7 · CE4: Kapitel 3 Rückwärts und Abbiegen (Sattelzug rückwärts, Einweiser, Rechtsabbiegen mit Anhänger und Radfahrer)
const { C, sec, chapter, motion, quiz, ask, seg, veh, svgImg } = require('../gs');
const { zugTop, satTop, stepSattel, stepGlieder, hitchG, uv, lf } = require('../zugtop');

sec('ce4r', 'CE4  ·  RÜCKWÄRTS UND ABBIEGEN', C.pu, 'bg_pu.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce4r', { num: 3, ttl: 'Rückwärts und Abbiegen', sub: 'Beim Rückwärtsfahren läuft der Auflieger andersherum als das Lenkrad. Beim Abbiegen schneidet der Anhänger die Kurve.', ico: 'LuUndo2', notes:
    '▶ Sagen: „Zwei Situationen, in denen der Zug anders reagiert als ein Lkw allein: rückwärts und beim Abbiegen.“\n✅ DGUV Information 214-080, S. 31; Prüfungsfrage 2.7.01-310.\n🖱 Keine Klicks.\n➜ „Erst rückwärts – mit dem Sattelzug.“' });

  // ===== SATTELZUG RÜCKWÄRTS (Draufsicht, berechnet) =====
  {
    const S = 0.19, X0 = 8.5, Y0 = 2.55, P = (x, y) => [X0 + x * S, Y0 - y * S];   // etwas kleiner: Aufliegerheck bleibt im Bild
    // Fahrplan: 4 m rückwärts mit Lenkrad links (25°), dann 6 m mit Lenkrad rechts (–20°) nachführen
    const sim = sEnd => { let st = { x: 0, y: 0, a: 90, b: 90 }, s = 0; while (s > sEnd + 1e-6) { st = stepSattel(st, -0.05, s > -4 ? 25 : -20); s -= 0.05; } return st; };
    const F = [
      { s: 0, w: 0, msg: 'Gestreckt. Gleich geht es rückwärts – mit dem Lenkrad nach links.', mc: C.mut },
      { s: 0, w: -90, msg: 'Lenkrad nach links …', mc: C.txt },
      { s: -2, w: -90, msg: 'Der Zug rollt rückwärts …', mc: C.txt },
      { s: -4, w: -90, msg: 'Das Heck des Aufliegers wandert nach rechts – andersherum als das Lenkrad!', mc: C.pu },
      { s: -4, w: 70, msg: 'Jetzt nachführen: Lenkrad nach rechts …', mc: C.txt },
      { s: -7, w: 70, msg: '… der Knick wird nicht größer …', mc: C.txt },
      { s: -10, w: 70, msg: 'Der Knick bleibt – der Zug fährt im Bogen nach rechts hinten.', mc: C.gr },
    ].map(f => ({ ...f, st: sim(f.s) }));
    const wheel = await svgImg('<g transform="rotate(-90 50 50)"><circle cx="50" cy="50" r="42" fill="none" stroke="#C9D0DA" stroke-width="9"/><circle cx="50" cy="50" r="10" fill="#C9D0DA"/><rect x="10" y="46" width="30" height="8" fill="#C9D0DA"/><rect x="60" y="46" width="30" height="8" fill="#C9D0DA"/><rect x="46" y="60" width="8" height="30" fill="#C9D0DA"/><circle cx="50" cy="8" r="5" fill="#7AA2FF"/></g>', 100, 100, 3);
    const fr = (k, o = {}) => ({ ...o, t: { k } });
    await motion(deck, 'ce4r', {
      kicker: 'Rückwärts mit Sattelzug', ttl: 'Rückwärts lenken', dur: 650, holdDur: 650,
      question: 'Ihr fahrt rückwärts und lenkt nach links. Wohin wandert das Heck des Aufliegers?',
      answer: 'Nach rechts – andersherum. Erst anlenken, dann nachführen (gegenlenken), damit der Knick nicht zu groß wird.',
      legend: 'Draufsicht · berechnet · Sattelzug 16,5 m · Fahrer links, Blick nach oben · rot: Spur der Aufliegerachse',
      frames: [
        fr(0, { hold: true,
          cap: 'Der Zug steht gerade. Die gestrichelte Linie zeigt, wo er am Anfang stand.',
          note: '▶ Sagen: „Der Sattelzug steht gerade. Ihr sitzt links, schaut nach vorn – also nach oben. Gleich fahrt ihr rückwärts und lenkt nach links.“\n❓ Frage auf der Folie stellen. Abstimmen: links oder rechts?\n✅ Lehrbuchwissen: Beim Rückwärtsfahren läuft der Auflieger entgegen dem Lenkeinschlag. Bewegung mit einem einfachen Fahrzeugmodell berechnet (Radstand 3,8 m, Königszapfen bis Achsmitte 7,6 m).\n🖱 Klick: Lenkrad links, rückwärts (läuft von selbst).\n➜ „Lenkrad nach links.“' }),
        fr(1), fr(2),
        fr(3, { hold: true, answer: true,
          cap: 'Lenkrad links: Die Zugmaschine schiebt ihr Heck nach links. Der Auflieger knickt dagegen – sein Heck geht nach rechts.',
          note: '▶ „Seht ihr? Lenkrad links – das Heck der Zugmaschine geht nach links, aber der Auflieger knickt ab und sein Heck wandert nach rechts. Genau andersherum als beim Lkw allein.“\n❓ Frage auf der Folie auflösen.\n✅ Lehrbuchwissen; Bewegung berechnet.\n🖱 Klick: nachführen (läuft von selbst).\n➜ „Und jetzt? Wenn ich weiter links lenke, wird der Knick immer größer.“' }),
        fr(4), fr(5),
        fr(6, { hold: true,
          cap: 'Nachführen: Habt ihr den Winkel, lenkt ihr zurück. Dann bleibt der Knick gleich und der Zug zieht seinen Bogen. Kleine Lenkbewegungen, langsam, früh korrigieren.',
          note: '▶ „Hat der Auflieger den Winkel, den ihr wollt, lenkt ihr dagegen – man sagt: nachführen. Dann bleibt der Knick gleich und der Zug fährt im Bogen. Wird der Knick zu groß, gibt es nur eins: vorziehen und neu ansetzen.“\n✅ Lehrbuchwissen; Bewegung berechnet.\n💡 Gliederzug mit Drehschemelanhänger: zwei Gelenke – er reagiert verzögert und ist schwerer zu fahren. Am Fahrzeug üben, nicht nach Folie.\n🖱 Nächster Klick: nächste Folie.\n➜ „Und wer hilft euch dabei?“' }),
      ],
      scene: async (s, t) => {
        const f = F[t.k], st = f.st;
        // Boden und Ausgangslinie
        s.rect(5.7, 1.55, 4.95, 5.05, { fill: '161D27', name: '!!hof' });
        s.lineS(X0, 1.6, X0, 6.55, { color: C.dim, lw: 1.5, dash: 'dash', lt: 30, name: '!!ref' });   // gestrichelt: Lage am Anfang
        // Spur der Aufliegerachse (rot) – erst, wenn der Auflieger deutlich ausschwenkt (vorher läge sie fast ganz unter ihm)
        const trail = F.slice(0, t.k + 1).filter((g, i, A) => i === 0 || g.s !== A[i - 1].s).map(g => ({ P: P(g.st.x, g.st.y), a: g.st.a, b: g.st.b }));
        const r = satTop(s, { P: P(st.x, st.y), a: st.a, b: st.b, S, nm: 'sr', rb: 270, steer: f.w < 0 ? 25 : f.w > 0 ? -20 : 0, trail: t.k >= 5 ? trail.slice(0, -1) : [], nTrail: 4, kpCol: C.pu });
        // Lenkrad
        s.rrect(10.85, 1.6, 2.2, 2.25, { fill: '0E1520', line: '2A3B52', rr: 0.08, name: '!!lrb' });
        s.text('LENKRAD', { x: 11.0, y: 1.66, w: 1.9, h: 0.28, size: 12, bold: true, color: C.dim, cs: 2, name: '!!lrt' });
        s.img(wheel, { x: 11.35, y: 2.0, w: 1.2, h: 1.2, rotate: 90 + f.w, name: '!!lr' });
        s.text(f.w < 0 ? '← links' : f.w > 0 ? 'rechts →' : 'gerade', { x: 10.9, y: 3.3, w: 2.1, h: 0.35, size: 15, bold: true, color: f.w ? C.pu : C.mut, align: 'center', name: '!!lrw' });
        // Rückwärts-Pfeil und Meldung
        s.text(t.k === 0 ? '' : '↓ rückwärts', { x: 10.9, y: 3.95, w: 2.1, h: 0.35, size: 14, bold: true, color: C.am, align: 'center', name: '!!rw' });
        s.text(f.msg, { x: 10.85, y: 4.45, w: 2.2, h: 2.1, size: 15, bold: true, color: f.mc, valign: 'top', name: '!!msg' });
        // „Heck →“ mit 0,15″ Abstand rechts neben der äußersten Ecke des Aufliegerhecks
        const nv = lf(uv(st.b)), xr = Math.max(...[1, -1].map(sd => r.rear[0] + nv[0] * 1.275 * S * sd));
        s.text(t.k >= 3 ? 'Heck →' : '', { x: xr + 0.15, y: r.rear[1] - 0.1, w: 0.9, h: 0.3, size: 12, bold: true, color: C.pu, name: '!!hk' });
      },
    });
  }
  await ask(deck, 'ce4r', {
    kicker: 'Rückwärts mit dem Zug', q: 'Ihr seht hinten fast nichts. Was gilt beim Rückwärtsfahren?', ico: 'LuEye', qsize: 32,
    answers: [
      ['LuUserCheck', 'Einweiser:', 'steht dort, wo ihr ihn seht – nie zwischen Fahrzeug und Hindernis.'],
      ['LuHand', 'Sichtkontakt weg?', 'Sofort anhalten. Erst weiter, wenn ihr ihn wieder seht.'],
      ['LuArrowLeft', 'Wenn möglich nach links:', 'Zur Fahrerseite seht ihr am meisten.'],
      ['LuLink', 'Drehschemelanhänger:', 'zwei Gelenke – er reagiert verzögert. Klein lenken, langsam fahren, im Zweifel vorziehen.'],
      ['LuFootprints', 'Aussteigen und nachsehen', '– das ist keine Schande, das machen Profis.'],
    ],
    notes:
      '▶ Sagen: „Rückwärts seht ihr mit dem Zug fast nichts. Was hilft?“\n' +
      '❓ Vor jedem Klick fragen.\n' +
      '🖱 Klick 1–5: je ein Punkt.\n' +
      '✅ § 9 Abs. 5 StVO: Gefährdung ausschließen, erforderlichenfalls einweisen lassen. DGUV Vorschrift 70 § 46 Abs. 2: Einweiser nur im Sichtbereich des Fahrers, nicht zwischen Fahrzeug und Hindernis, keine anderen Tätigkeiten. Sichtkontakt weg → anhalten: Prüfungsfrage 2.6.03-001. DGUV Information 214-080, S. 31 (Gelenkdeichselanhänger mit Drehschemel: zwei Drehpunkte).\n' +
      '💡 Beim Rangieren mit Drehschemelanhänger: niemand seitlich direkt neben dem Anhänger (DGUV Vorschrift 70 § 47 Abs. 2).\n' +
      '💡 In welche Richtung der Drehschemelanhänger beim Rückwärtsfahren genau läuft, zeigen wir nicht auf der Folie – das übt ihr am Fahrzeug mit dem Fahrlehrer.\n' +
      '➜ „Eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce4r', {
    kicker: 'Prüfungsfrage 2.6.03-001', q: 'Was ist beim Rückwärtsfahren mit einer Fahrzeugkombination richtig, wenn die Sicht nach hinten beeinträchtigt ist?', size: 30,
    opts: ['Wenn die Sichtverbindung zur einweisenden Person abreißt, muss angehalten werden', 'Nur beim Einfahren in eine Vorfahrtstraße ist Einweisung erforderlich', 'Auf einem Betriebsgelände kann auf Einweisung verzichtet werden'], ok: [0],
    why: 'Gerade auf dem Betriebsgelände passieren viele Rückwärts-Unfälle. Seht ihr den Einweiser nicht mehr: Stopp.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.03-001: A. DGUV Vorschrift 70 § 46.\n➜ „Jetzt vorwärts: rechts abbiegen mit Anhänger.“',
  });

  // ===== RECHTS ABBIEGEN MIT ANHÄNGER (Draufsicht, berechnet) =====
  {
    // Querstraße: Fahrbahn von –3,5 m bis 8,5 m, Leitlinie bei 2,5 m (zwei Fahrstreifen je 6 m).
    // Lenkverlauf: ab der Haltlinie gleichmäßig einlenken (31°). Das Fahrerhaus schwenkt dabei nach links aus,
    // bleibt aber in allen gezeigten Bildern im eigenen Fahrstreifen (mind. 0,5 m unter der Leitlinie).
    const S = 0.15, O = [7.15, 3.05], P = (x, y) => [O[0] + x * S, O[1] - y * S], YM = 2.5, YT = 8.5;
    const sim = sEnd => { let st = { x: 1.75, y: -12.55, a: 90, bd: 90, b: 90 }, s = 0; while (s < sEnd - 1e-6) { st = stepGlieder(st, 0.05, st.y >= -12.25 && st.a > 0.5 ? -31 : 0); s += 0.05; } return st; };
    const F = [
      { s: 0, cy: -21.0, msg: 'Der Zug will rechts abbiegen. Neben dem Anhänger fährt ein Radfahrer geradeaus.', mc: C.mut },
      { s: 5, cy: -17.5, msg: 'Der Lkw biegt ab …', mc: C.txt },
      { s: 8.5, cy: -15.0, msg: '… der Anhänger folgt weiter innen …', mc: C.txt },
      { s: 13.5, cy: -11.5, msg: '… und schneidet die Kurve …', mc: C.am },
      { s: 16, cy: -9.5, msg: 'Der Anhänger kreuzt den Radweg – genau da, wo der Radfahrer ist!', mc: C.red },
    ].map(f => ({ ...f, st: sim(f.s) }));
    // Punkte am Zug für die Spuren (Zoll): Lkw-Vorderrad rechts (lf), Anhänger-Hinterrad rechts (ar)
    const zugPts = st => {
      const R = Math.PI / 180, u = [Math.cos(st.a * R), Math.sin(st.a * R)];
      const vr = [st.x + u[0] * 6.45 + Math.sin(st.a * R) * 1.05, st.y + u[1] * 6.45 - Math.cos(st.a * R) * 1.05];
      const h = hitchG(st), T = [h[0] - 2.4 * Math.cos(st.bd * R), h[1] - 2.4 * Math.sin(st.bd * R)];
      const ar = [T[0] - 5 * Math.cos(st.b * R) + Math.sin(st.b * R) * 1.05, T[1] - 5 * Math.sin(st.b * R) - Math.cos(st.b * R) * 1.05];
      return { lf: P(vr[0], vr[1]), ar: P(ar[0], ar[1]) };
    };
    // Spuren in feinen Stücken (je Abschnitt NSUB Zwischenlagen), damit die Kurve rund aussieht
    const NSUB = 4, SUB = [];
    for (let j = 0; j < F.length - 1; j++) { const a = []; for (let q = 0; q <= NSUB; q++) a.push(zugPts(sim(F[j].s + (F[j + 1].s - F[j].s) * q / NSUB))); SUB.push(a); }
    const pose = st => { const h = hitchG(st); return { H: P(h[0], h[1]), a: st.a, bd: st.bd, b: st.b }; };
    const fr = (k, o = {}) => ({ ...o, t: { k } });
    await motion(deck, 'ce4r', {
      kicker: 'Toter Winkel am Zug', ttl: 'Rechts abbiegen', dur: 700, holdDur: 700,
      question: 'Ihr biegt rechts ab. Neben eurem Anhänger fährt ein Radfahrer geradeaus. Was passiert?',
      answer: 'Der Anhänger schneidet die Kurve und kreuzt den Radweg. Den Radfahrer neben dem Anhänger seht ihr kaum. Darum: Schrittgeschwindigkeit, Spiegel bis zum Ende – warten, bis neben dem Zug niemand ist.',
      legend: 'Draufsicht · berechnet · Zug 18,4 m · blau: Lkw-Vorderrad · rot: Anhänger-Hinterrad',
      frames: [
        fr(0, { hold: true,
          cap: 'Rechts neben dem Zug verläuft ein Radweg. Der Radfahrer ist auf Höhe des Anhängers und fährt geradeaus weiter.',
          note: '▶ Sagen: „Der Zug steht an der Haltlinie und will rechts abbiegen. Rechts daneben der Radweg. Ein Radfahrer ist gerade auf Höhe des Anhängers und will geradeaus.“\n❓ Frage auf der Folie stellen.\n✅ Prüfungsfragen 2.2.23-046 (toter Winkel besonders für Radfahrer gefährlich) und 2.2.23-052 (Rechtsabbiegen innerorts: Radfahrer und Fußgänger übersehen). Bewegung mit einem einfachen Fahrzeugmodell berechnet.\n🖱 Klick: Der Zug biegt ab (läuft von selbst).\n➜ „Der Zug fährt los.“' }),
        fr(1), fr(2), fr(3),
        fr(4, { hold: true, answer: true,
          cap: 'Blau läuft der Lkw, rot der Anhänger – deutlich weiter innen. Er schneidet die Kurve und kreuzt den Radweg. Schrittgeschwindigkeit, Spiegel bis zum Schluss beobachten, im Zweifel anhalten.',
          note: '▶ „Schaut auf die zwei Spuren: Blau ist das Vorderrad vom Lkw, rot das Hinterrad vom Anhänger. Der Anhänger läuft weit innen – er schneidet die Kurve und fährt über den Radweg. Genau dort ist jetzt der Radfahrer. Ihn neben dem Anhänger zu sehen, ist sehr schwer.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.01-310: Der Anhänger kann ausschwenken und die Kurve schneiden (falsch: läuft in der Spur des Zugfahrzeugs). § 9 Abs. 6 StVO: Kfz über 3,5 t innerorts beim Rechtsabbiegen Schrittgeschwindigkeit, wenn mit Rad- oder Fußverkehr zu rechnen ist (BKat 45: 70 €, 1 Punkt). Prüfungsfrage 2.2.23-212: erst abbiegen, wenn neben dem Fahrzeug niemand ist.\n💡 Abbiegeassistent (Pflicht für neu zugelassene Lkw seit 7.7.2024) warnt – er ersetzt nicht Spiegel und Schrittgeschwindigkeit.\n💡 Achtet auch auf das Fahrerhaus: Es schwenkt beim Abbiegen weit nach links aus. In engen Querstraßen reicht der eigene Fahrstreifen dann oft nicht – Gegenverkehr beachten. Die Querstraße ist hier breit gezeichnet.\n🖱 Nächster Klick: nächste Folie.\n➜ „Zwei Prüfungsfragen dazu.“' }),
      ],
      scene: async (s, t) => {
        const f = F[t.k];
        // Kreuzung: Gehweg, Straßen, abgerundete Ecke (R = 10 m), Radweg
        s.rect(5.6, 1.5, 7.45, 5.15, { fill: '10161D', name: '!!gw' });
        const [vx0] = P(-3.5, 0), [vx1] = P(5.0, 0), [, hy0] = P(0, YT), [, hy1] = P(0, -3.5);
        s.rect(vx0, 1.5, vx1 - vx0, 5.15, { fill: C.road2, name: '!!rv' });
        s.rect(vx1, hy0, 13.05 - vx1, hy1 - hy0, { fill: C.road2, name: '!!rh' });
        s.rect(5.6, hy0, vx0 - 5.6, hy1 - hy0, { fill: C.road2, name: '!!rh2' });
        s.rect(vx1, hy1, 10 * S, 10 * S, { fill: C.road2, name: '!!rc' });
        const cc = P(15, -13.5);
        s.oval(cc[0] - 10 * S, cc[1] - 10 * S, 20 * S, 20 * S, { fill: '10161D', name: '!!rco' });
        // Radweg (rot) neben der Fahrbahn, durch die Kreuzung als Furt
        const [bx0] = P(3.5, 0);
        s.rect(bx0, hy1, vx1 - bx0, 6.65 - hy1, { fill: '7A2E35', name: '!!rw1' });
        s.rect(bx0, 1.5, vx1 - bx0, hy0 - 1.5, { fill: '7A2E35', name: '!!rw2' });
        s.rect(bx0, hy0, vx1 - bx0, hy1 - hy0, { fill: '7A2E35', ft: 55, name: '!!rw3' });
        // Mittellinien und Haltlinie
        const [mx] = P(0, 0);
        for (let k = 0, y = hy1 + 0.1; y < 6.5; y += 0.45, k++) s.rect(mx - 0.012, y, 0.025, 0.25, { fill: C.mark, name: '!!mv' + k });
        const [, my] = P(0, YM);
        for (let k = 0, x = vx1 + 0.15; x < 12.9; x += 0.45, k++) s.rect(x, my - 0.012, 0.25, 0.025, { fill: C.mark, name: '!!mh' + k });
        const [hlx0, hly] = P(0, -4.3), [hlx1] = P(3.5, 0);
        s.rect(hlx0, hly - 0.02, hlx1 - hlx0, 0.045, { fill: C.mark, name: '!!hl' });
        // Zug
        zugTop(s, { ...pose(f.st), S, nm: 'ab', rb: 270, hl: t.k === 4 ? C.red : undefined });
        // Spuren über dem Zug: Lkw-Vorderrad rechts (blau) und Anhänger-Hinterrad rechts (rot)
        for (let j = 0; j < SUB.length; j++) for (let q = 0; q < NSUB; q++) {
          // sichtbar: Stück j → j+1; noch unsichtbar: winziges Stück am Anfang, schon in der späteren Richtung (wächst dann per Morph)
          // sichtbare Stücke an beiden Enden etwas verlängern: Sie überlappen, die Linie wirkt durchgezogen
          const on = j < t.k, A = SUB[j][q], B = SUB[j][q + 1];
          const piece = (a, b) => {
            if (!on) return [a, [a[0] + (b[0] - a[0]) * 0.002, a[1] + (b[1] - a[1]) * 0.002]];
            const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, e = 0.025, d = [(b[0] - a[0]) / L * e, (b[1] - a[1]) / L * e];
            return [[a[0] - d[0], a[1] - d[1]], [b[0] + d[0], b[1] + d[1]]];
          };
          const [l0, l1] = piece(A.lf, B.lf), [a0, a1] = piece(A.ar, B.ar);
          seg(s, l0[0], l0[1], l1[0], l1[1], { col: '4C8DF0', th: 0.04, hide: !on, rb: -45, name: '!!sl' + j + '_' + q });
          seg(s, a0[0], a0[1], a1[0], a1[1], { col: C.red, th: 0.045, hide: !on, rb: -45, name: '!!sa' + j + '_' + q });
        }
        // Radfahrer (fährt geradeaus nach oben)
        const [bcx] = P(4.25, 0), [, bcy] = P(0, f.cy);
        veh(s, 'bike.png', bcx, bcy, 0, '!!bike', { scale: 0.62 });
        s.oval(bcx - 0.28, bcy - 0.28, 0.56, 0.56, { line: C.red, lw: 3, fill: C.red, ft: 100, lt: t.k === 4 ? 0 : 100, name: '!!bring' });
        s.text(f.msg, { x: 9.6, y: 3.75, w: 3.4, h: 0.8, size: 13, bold: true, color: f.mc, valign: 'top', name: '!!msg' });
        s.text(t.k === 4 ? 'Anhänger schneidet die Kurve' : '', { x: 8.35, y: 4.7, w: 3.0, h: 0.3, size: 13, bold: true, color: C.red, name: '!!sct' });
      },
    });
  }
  await quiz(deck, 'ce4r', {
    kicker: 'Prüfungsfrage 2.7.01-310', q: 'Wie wirken sich die Kurvenlaufeigenschaften einer Fahrzeugkombination (Kraftfahrzeug mit Anhänger) beim Abbiegen aus? Der Anhänger …', size: 28,
    opts: ['… kann ausschwenken', '… kann die Kurve schneiden', '… läuft in der Regel in der Spur des Zugfahrzeugs'], ok: [0, 1],
    why: 'Innen schneidet er die Kurve, außen schwenkt das Heck aus. In der Spur des Lkw läuft er nicht.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.01-310: A und B.\n➜ „Und wie schnell?“',
  });
  await quiz(deck, 'ce4r', {
    kicker: 'Prüfungsfrage 2.2.09-201', q: 'Sie fahren ein Kraftfahrzeug mit mehr als 3,5 t zulässiger Gesamtmasse. Mit welcher Geschwindigkeit müssen Sie innerorts nach rechts abbiegen? Wenn mit Radfahrern oder Fußgängern zu rechnen ist, mit …', size: 24,
    opts: ['… Schrittgeschwindigkeit', '… höchstens 20 km/h', '… höchstens 30 km/h'], ok: [0],
    why: 'Schrittgeschwindigkeit heißt: so langsam, dass ihr sofort stehen könnt. Ein Verstoß kostet 70 € und einen Punkt.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.09-201: A. § 9 Abs. 6 StVO; BKat Nr. 45 (70 €, 1 Punkt).\n💡 Im Gesetz steht keine Zahl. Als Anhalt nannte das Verkehrsministerium 2019 in einem Entwurf etwa 7 bis 11 km/h (eurotransport, 18.06.2019).\n➜ „Kapitel 4: Wetter und Wind.“',
  });
};
