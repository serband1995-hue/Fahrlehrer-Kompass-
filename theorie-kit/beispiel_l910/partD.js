// Teil D: Liegenbleiben und Absichern (§ 15), Abschleppen/Schleppen/Anschleppen (§ 15a StVO, § 43 StVZO) – kommt hinter „Parken am Berg“
const { C, base, kick, title, card, quiz, veh, point } = require('./gs');
const { W, H, icon } = require('./lib');
const mv = (dx, dy) => `M 0 0 L ${(dx / W).toFixed(4)} ${(dy / H).toFixed(4)} E`;

module.exports = async (deck) => {
  // ===== PANNE: WAS IST HIER FALSCH? (Foto) =====
  {
    const s = base(deck, 'pan', { bg: 'f_panne.jpg', ov: 7.0, notes:
      '▶ Sagen: „Panne auf der Landstraße, nachts, Regen. Der Fahrer hat schon etwas richtig gemacht – und etwas falsch. Was?“\n' +
      '❓ Sammeln lassen. Dann Klick.\n' +
      '🖱 Klick 1: Kreis um das Warndreieck · Klick 2: die Auflösung · Klick 3: was richtig ist.\n' +
      '✅ Falsch: Das Warndreieck steht direkt hinter dem Auto. Es muss weit vorher stehen, damit die anderen rechtzeitig bremsen können: bei schnellem Verkehr etwa 100 m (§ 15).\n' +
      '✅ Richtig: Warnblinker ist an, das Auto steht weit rechts.\n' +
      '💡 Auf diesem Bild kommt noch eine Kurve: Das Dreieck gehört vor die Kurve, sonst sieht es niemand rechtzeitig.\n' +
      '➜ „Wie geht man bei einer Panne der Reihe nach vor?“' });
    kick(s, 'Panne · § 15', { col: C.red });
    title(s, 'Was ist hier\nfalsch?', { w: 6, h: 1.6, size: 44 });
    const ring = s.oval(6.55, 3.55, 1.6, 1.4, { line: C.red, lw: 4 }, { fx: 'zoom', c: true, dur: 400 });
    s.anims.push({ name: ring, kind: 'sp', fx: 'pulse', dur: 350, a: true });
    await point(s, 0.7, 3.0, 5.6, 1.35, 'LuTriangleAlert', C.red, 'Das Dreieck steht viel zu nah.', 'Bei schnellem Verkehr etwa 100 m vorher aufstellen.', { fx: 'flyL', c: true, dur: 450 }, { br: true });
    await point(s, 0.7, 4.5, 5.6, 1.35, 'LuZap', C.gr, 'Richtig:', 'Warnblinker an, Auto weit rechts.', { fx: 'flyL', c: true, dur: 450 }, { br: true });
  }
  // ===== RICHTIG ABSICHERN: REIHENFOLGE =====
  {
    const s = base(deck, 'pan', { notes:
      '▶ Sagen: „Die Reihenfolge ist wichtig. Was macht ihr zuerst?“\n' +
      '❓ Erst fragen, dann Schritt für Schritt klicken.\n' +
      '🖱 Klick 1–5: je ein Schritt.\n' +
      '✅ 1. Warnblinker sofort an – noch während ihr ausrollt. So weit rechts wie möglich, am besten auf den Seitenstreifen oder in eine Nothaltebucht. Bei Dunkelheit Licht anlassen.\n' +
      '✅ 2. Warnweste anziehen – schon im Auto. Pflicht ist, eine Weste dabeizuhaben (§ 53a StVZO). Tragen ist in Deutschland für Private keine Pflicht, aber dringend zu empfehlen. Im Ausland oft Pflicht.\n' +
      '✅ 3. Alle steigen auf der verkehrsabgewandten Seite aus (meist rechts) und gehen hinter die Schutzplanke.\n' +
      '✅ 4. Warndreieck aufstellen: am Rand bzw. hinter der Leitplanke gegen die Fahrtrichtung gehen, das Dreieck vor dem Körper halten.\n' +
      '✅ 5. Hilfe rufen: 112 bei Verletzten, sonst Pannendienst. Auf der Autobahn: Notrufsäule – die Pfeile an den Leitpfosten zeigen zur nächsten Säule.\n' +
      '💡 Nicht abgesichert und dadurch jemanden gefährdet: 60 €, 1 Punkt.\n' +
      '➜ „Wie weit muss das Dreieck weg?“' });
    kick(s, 'Panne · Schritt für Schritt', { col: C.red }); title(s, 'Absichern in fünf Schritten', { size: 36 });
    const T = [
      ['LuTriangleAlert', 'Warnblinker an', 'sofort, noch beim Ausrollen. Weit rechts halten.'],
      ['LuShirt', 'Warnweste an', 'schon im Auto anziehen.'],
      ['LuDoorOpen', 'Alle raus – rechts', 'und hinter die Schutzplanke.'],
      ['LuTriangle', 'Warndreieck aufstellen', 'gegen die Fahrtrichtung gehen, Dreieck vor dem Körper.'],
      ['LuPhone', 'Hilfe rufen', '112 · Pannendienst · Notrufsäule an der Autobahn.'],
    ];
    for (let i = 0; i < 5; i++) {
      const y = 1.95 + i * 0.93;
      s.text(String(i + 1), { x: 0.7, y: y + 0.14, w: 0.52, h: 0.52, size: 18, bold: true, color: C.dark, fill: C.red, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'zoom', c: true, dur: 250 });
      await point(s, 1.45, y, 11.18, 0.8, T[i][0], C.or, T[i][1], T[i][2], { fx: 'flyL', dur: 400 });
    }
  }
  // ===== WARNDREIECK: ABSTAND (Diagramm) =====
  {
    const s = base(deck, 'pan', { notes:
      '▶ Sagen: „Wie weit muss das Dreieck vom Auto weg?“\n' +
      '❓ „Wer kennt eine Zahl?“\n' +
      '🖱 Klick 1: innerorts · Klick 2: Landstraße · Klick 3: Autobahn · Klick 4: was im Gesetz steht.\n' +
      '✅ Faustregeln: innerorts etwa 50 m, Landstraße etwa 100 m, Autobahn 150 bis 200 m.\n' +
      '✅ Im Gesetz (§ 15) steht nur: „in ausreichender Entfernung“, bei schnellem Verkehr „etwa 100 m“. Vor einer Kurve oder Kuppe: das Dreieck davor aufstellen, damit es rechtzeitig gesehen wird.\n' +
      '💡 Messhilfe: Die weißen Leitpfosten am Straßenrand stehen meist alle 50 m. Zwei Pfosten = 100 m.\n' +
      '➜ „Wo wartet ihr auf der Autobahn?“' });
    kick(s, 'Panne · Warndreieck', { col: C.red }); title(s, 'Wie weit nach hinten?', { size: 36 });
    // Straße: Auto rechts, Abstand nach links (200 m = 10 Zoll)
    const y0 = 3.35, rh = 1.1, xc = 11.9, k = 0.05; // 1 m = 0,05 Zoll
    s.rect(0.7, y0, 12.33, rh, { fill: C.road });
    for (let xx = 0.8; xx < 12.9; xx += 0.75) s.rect(xx, y0 + rh / 2 - 0.02, 0.42, 0.045, { fill: C.mark });
    s.rect(0.7, y0 + rh, 12.33, 0.1, { fill: C.curb });
    veh(s, 'car_g.png', xc, y0 + rh * 0.75, 90);
    s.oval(xc - 0.72, y0 + rh * 0.75 - 0.3, 0.16, 0.16, { fill: C.or, glow: 6, glowColor: C.or }, { fx: 'blink', auto: true, dur: 800 });
    s.oval(xc - 0.72, y0 + rh * 0.75 + 0.14, 0.16, 0.16, { fill: C.or, glow: 6, glowColor: C.or }, { fx: 'blink', auto: true, dur: 800 });
    s.text('Fahrtrichtung →', { x: 0.8, y: y0 + 0.05, w: 2.2, h: 0.3, size: 12, color: C.dim });
    // Leitpfosten alle 50 m
    for (let m = 0; m <= 200; m += 50) {
      const x = xc - 0.6 - m * k;
      s.rect(x - 0.03, y0 + rh + 0.18, 0.06, 0.3, { fill: 'E8ECF2' });
      s.rect(x - 0.03, y0 + rh + 0.2, 0.06, 0.07, { fill: C.dark });
      s.text(m + ' m', { x: x - 0.5, y: y0 + rh + 0.52, w: 1.0, h: 0.3, size: 12, color: C.dim, align: 'center' });
    }
    s.text('Leitpfosten: meist alle 50 m', { x: 0.8, y: y0 + rh + 0.85, w: 5, h: 0.3, size: 13, italic: true, color: C.dim });
    const D = [[50, 'innerorts', 'ca. 50 m', C.or], [100, 'Landstraße', 'ca. 100 m', C.red], [200, 'Autobahn', '150–200 m', 'FF3B6B']];
    for (const [m, l, t, col] of D) {
      const x = xc - 0.6 - m * k;
      s.shape(deck.pres.shapes.ISOSCELES_TRIANGLE, { x: x - 0.22, y: y0 + rh * 0.62, w: 0.44, h: 0.4, line: col, lw: 3, fill: C.road }, { fx: 'flyR', c: true, dur: 600 });
      const ly = y0 - 0.2 - (m === 50 ? 0 : m === 100 ? 0.4 : 0.8);
      s.lineS(x, ly, xc - 0.6, ly, { color: col, lw: 2.5, beginArrow: 'triangle', endArrow: 'triangle' }, { fx: 'wipeR', dur: 400 });
      s.text([{ text: l + ': ', options: { color: C.txt } }, { text: t, options: { bold: true, color: col } }], { x: x - 0.1, y: ly - 0.42, w: 3.2, h: 0.4, size: 16 }, { fx: 'fade', dur: 250 });
    }
    s.text([{ text: 'Im Gesetz (§ 15):  ', options: { bold: true, color: C.or } }, { text: '„ausreichende Entfernung“, bei schnellem Verkehr etwa 100 m. Vor Kurve oder Kuppe: davor aufstellen!', options: { color: C.txt } }],
      { x: 0.7, y: 5.95, w: 11.93, h: 0.8, size: 17, fill: C.card2, line: C.or, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, valign: 'middle', margin: [10, 10, 10, 10] }, { fx: 'rise', c: true, dur: 400 });
  }
  quiz(deck, 'pan', {
    kicker: 'Frage · Autobahn', q: 'Panne auf der Autobahn. Wo wartest du auf Hilfe?',
    opts: ['Im Auto, angeschnallt', 'Hinter der Schutzplanke', 'Auf dem Seitenstreifen beim Warndreieck'], ok: 1,
    why: 'Im Auto oder auf dem Seitenstreifen kann dich ein Auffahrunfall treffen. Hinter der Schutzplanke bist du geschützt – am besten etwas versetzt gegen die Fahrtrichtung.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Alle Insassen auf der rechten Seite aussteigen und hinter die Schutzplanke.\n💡 Wer auf der Autobahn ohne Not liegen bleibt (z. B. kein Sprit), kann ein Bußgeld bekommen.\n➜ „Was muss überhaupt im Auto dabei sein?“',
  });
  // ===== MITFÜHREN =====
  {
    const s = base(deck, 'pan', { notes:
      '▶ Sagen: „Was muss in jedem Auto sein?“\n' +
      '🖱 Klick 1–3: je ein Teil.\n' +
      '✅ Warndreieck (§ 53a StVZO), eine Warnweste (seit 2014 Pflicht im Pkw), Verbandkasten (§ 35h StVZO).\n' +
      '💡 Pflicht ist eine Weste. Besser: eine für jeden Mitfahrer, griffbereit im Innenraum – nicht im Kofferraum unter dem Gepäck.\n' +
      '💡 Motorräder brauchen kein Warndreieck.\n' +
      '➜ „Und wenn das Auto gar nicht mehr fährt? Dann wird abgeschleppt.“' });
    kick(s, 'Panne · Was muss ins Auto?', { col: C.red }); title(s, 'Drei Dinge, immer dabei', { size: 36 });
    const T = [['LuTriangle', 'Warndreieck', 'rückstrahlend, schnell griffbereit'], ['LuShirt', 'Warnweste', 'Pflicht: eine. Besser: eine pro Person, vorne im Auto'], ['LuBriefcaseMedical', 'Verbandkasten', 'vollständig und nicht abgelaufen']];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 4.1;
      card(s, x, 2.0, 3.85, 3.0, {}, { fx: 'rise', c: true, dur: 450 });
      s.oval(x + 1.32, 2.35, 1.2, 1.2, { fill: C.red, line: C.red }, { fx: 'zoom', dur: 250 });
      s.img(await icon(T[i][0], C.dark), { x: x + 1.6, y: 2.63, w: 0.64, h: 0.64 }, { fx: 'fade', dur: 150 });
      s.text(T[i][1], { x: x + 0.2, y: 3.8, w: 3.45, h: 0.55, size: 24, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
      s.text(T[i][2], { x: x + 0.3, y: 4.4, w: 3.25, h: 1.0, size: 16, color: C.mut, align: 'center' }, { fx: 'fade', dur: 200 });
    }
    s.text('Tipp: Warnweste vorne ins Auto – dann ziehst du sie an, bevor du aussteigst.', { x: 0.7, y: 5.4, w: 11.93, h: 0.5, size: 18, italic: true, color: C.mut, align: 'center' });
  }
  // ===== ABSCHLEPPEN (Foto) =====
  {
    const s = base(deck, 'pan', { bg: 'f_abschlepp.jpg', ov: 9.0, notes:
      '▶ Sagen: „Euer Auto springt nicht mehr an. Ein Freund will euch mit dem Seil zur Werkstatt ziehen. Was müsst ihr beachten?“\n' +
      '🖱 Klick 1–5: je eine Regel.\n' +
      '✅ Beide Autos: Warnblinker an (§ 15a Abs. 3).\n' +
      '✅ Seil oder Stange: höchstens 5 m Abstand zwischen den Autos und gut sichtbar machen, zum Beispiel mit einem roten Lappen (§ 43 Abs. 3 StVZO).\n' +
      '✅ Autobahn: Ist das Auto dort liegen geblieben, an der nächsten Ausfahrt raus. Ein Auto, das woanders liegen geblieben ist, darf nicht auf die Autobahn geschleppt werden (§ 15a Abs. 1 und 2).\n' +
      '✅ Motorräder dürfen nicht abgeschleppt werden (§ 15a Abs. 4).\n' +
      '✅ Führerschein: Es reicht die Klasse für das ziehende Auto (§ 6 Abs. 1 FeV). Mit Klasse B darfst du einen Pkw abschleppen – BE brauchst du dafür nicht.\n' +
      '💡 Abschleppen heißt: nur bis zur nächsten geeigneten Werkstatt. Eine Tempogrenze steht nicht im Gesetz; empfohlen sind höchstens etwa 50 km/h.\n' +
      '➜ „Wer im gezogenen Auto sitzt, hat es schwerer als gedacht.“' });
    kick(s, 'Abschleppen · § 15a', { col: C.red });
    title(s, 'Abschleppen – nur bis\nzur nächsten Werkstatt', { w: 8.3, h: 1.5, size: 36 });
    const T = [
      ['LuTriangleAlert', 'Beide Autos:', 'Warnblinker an.'],
      ['LuCable', 'Seil oder Stange:', 'höchstens 5 m, gut sichtbar (roter Lappen).'],
      ['LuRoute', 'Autobahn:', 'nächste Ausfahrt raus – nie hinein schleppen.'],
      ['LuBan', 'Motorrad:', 'darf nicht abgeschleppt werden.'],
      ['LuKey', 'Führerschein:', 'Klasse des ziehenden Autos reicht (B).'],
    ];
    for (let i = 0; i < 5; i++) await point(s, 0.7, 2.65 + i * 0.84, 7.9, 0.74, T[i][0], C.red, T[i][1], T[i][2], undefined, { size: 16.5 });
  }
  // ===== IM GEZOGENEN AUTO (Animation) =====
  {
    const s = base(deck, 'pan', { notes:
      '▶ Sagen: „Ihr sitzt im gezogenen Auto. Der Motor ist aus. Was ist anders?“\n' +
      '❓ „Was passiert, wenn ihr den Schlüssel abzieht?“\n' +
      '🖱 Klick 1: Die Autos fahren los – das Seil bleibt straff. Klick 2–4: Zündung · Bremse und Lenkung · Seil straff.\n' +
      '✅ Zündung an: sonst rastet das Lenkradschloss ein, und Blinker, Bremslicht und Warnblinker gehen nicht. Nie den Schlüssel abziehen!\n' +
      '✅ Motor aus heißt: kein Bremskraftverstärker und keine Servolenkung. Ihr braucht viel mehr Kraft zum Bremsen und Lenken.\n' +
      '✅ Seil immer straff halten: Das gezogene Auto bremst leicht mit, damit das Seil nicht durchhängt und ruckt. Früh und sanft bremsen, große Kurven fahren.\n' +
      '💡 Automatik: Wählhebel auf N und Bedienungsanleitung lesen – viele Hersteller erlauben nur kurze Strecken (oft max. 50 km/h und 50 km). E-Autos meist gar nicht abschleppen, sondern transportieren.\n' +
      '💡 Wer lenkt, sollte nüchtern sein und einen Führerschein haben: Laut BGH gilt er als Fahrzeugführer – die Promillegrenzen gelten.\n' +
      '➜ „Abschleppen, Schleppen, Anschleppen – drei Wörter, drei Regeln.“' });
    kick(s, 'Abschleppen · im gezogenen Auto', { col: C.red }); title(s, 'Motor aus – alles wird schwer', { size: 36 });
    const y0 = 1.95, rh = 1.2;
    s.rect(0.7, y0, 11.93, rh, { fill: C.road });
    s.rect(0.7, y0 + rh, 11.93, 0.1, { fill: C.curb });
    const cy = y0 + rh / 2;
    const a = veh(s, 'car_b.png', 4.6, cy, 90);
    const b = veh(s, 'car_y.png', 2.4, cy, 90);
    const rope = s.lineS(3.0, cy, 4.0, cy, { color: 'E8ECF2', lw: 2.5 });
    const flag = s.rect(3.42, cy - 0.12, 0.16, 0.12, { fill: C.red });
    const lbl = s.text('max. 5 m', { x: 3.0, y: cy - 0.5, w: 1.0, h: 0.28, size: 12, bold: true, color: C.txt, align: 'center' });
    [a, b, rope, flag, lbl].forEach((n, i) => s.anims.push({ name: n, kind: (n === a || n === b) ? 'pic' : 'sp', fx: 'move', path: mv(6.8, 0), dur: 2600, c: i === 0, acc: 50000, dec: 50000 }));
    const T = [
      ['LuKey', 'Zündung an!', 'Sonst rastet das Lenkradschloss ein. Blinker und Bremslicht gehen nur mit Zündung.'],
      ['LuGauge', 'Bremsen und Lenken:', 'ohne Motor kein Bremskraftverstärker und keine Servolenkung – viel mehr Kraft nötig.'],
      ['LuCable', 'Seil straff halten:', 'früh und sanft bremsen, große Kurven fahren.'],
    ];
    for (let i = 0; i < 3; i++) await point(s, 0.7, 3.6 + i * 1.05, 11.93, 0.92, T[i][0], C.or, T[i][1], T[i][2]);
  }
  // ===== ABSCHLEPPEN · SCHLEPPEN · ANSCHLEPPEN =====
  {
    const s = base(deck, 'pan', { notes:
      '▶ Sagen: „Drei Wörter, die gleich klingen – aber Unterschiedliches bedeuten.“\n' +
      '🖱 Klick 1–3: je ein Begriff.\n' +
      '✅ Abschleppen: Notlösung. Ein liegen gebliebenes Auto wird zur nächsten Werkstatt gezogen (§ 15a StVO).\n' +
      '✅ Schleppen: planmäßig, eine längere Strecke, z. B. „das Auto von Opa nach Hause holen“. Dann ist das gezogene Auto wie ein Anhänger – und das ist ohne Ausnahmegenehmigung verboten (§ 33 StVZO). Richtig: Abschleppwagen oder Autotransporter.\n' +
      '✅ Anschleppen: Ein Auto mit leerer Batterie wird gezogen, damit der Motor anspringt. Nur mit Schaltgetriebe: 2. Gang, Kupplung treten, Zündung an, bei etwa 10–15 km/h Kupplung kommen lassen. Mit Automatik geht es nicht. Nicht auf der Autobahn.\n' +
      '💡 Anschleppen kann den Katalysator beschädigen (unverbrannter Kraftstoff). Besser: Starthilfekabel – das kommt ausführlich in Lektion 13.\n' +
      '➜ „Zwei Prüfungsfragen.“' });
    kick(s, 'Begriffe', { col: C.red }); title(s, 'Abschleppen, Schleppen, Anschleppen', { size: 34 });
    const P = [
      ['LuWrench', C.gr, 'Abschleppen', 'Notlösung: liegen gebliebenes Auto bis zur nächsten Werkstatt ziehen.', 'erlaubt'],
      ['LuTruck', C.red, 'Schleppen', 'Planmäßig und weit: Das Auto wäre ein Anhänger. Ohne Ausnahmegenehmigung verboten – nimm einen Abschleppwagen.', 'verboten'],
      ['LuBatteryLow', C.or, 'Anschleppen', 'Ziehen, bis der Motor anspringt. Nur Schaltwagen, nie Automatik. Besser: Starthilfekabel.', 'nur Schaltwagen'],
    ];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 4.1;
      card(s, x, 1.95, 3.85, 4.55, {}, { fx: 'rise', c: true, dur: 450 });
      s.oval(x + 0.3, 2.25, 0.85, 0.85, { fill: P[i][1], line: P[i][1] }, { fx: 'zoom', dur: 250 });
      s.img(await icon(P[i][0], C.dark), { x: x + 0.5, y: 2.45, w: 0.45, h: 0.45 }, { fx: 'fade', dur: 150 });
      s.text(P[i][2], { x: x + 0.3, y: 3.3, w: 3.3, h: 0.55, size: 24, bold: true, color: C.txt }, { fx: 'fade', dur: 200 });
      s.text(P[i][3], { x: x + 0.3, y: 3.9, w: 3.3, h: 1.75, size: 16, color: C.mut }, { fx: 'fade', dur: 200 });
      s.text(P[i][4], { x: x + 0.3, y: 5.8, w: 3.25, h: 0.48, size: 15, bold: true, color: C.dark, fill: P[i][1], shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.25, align: 'center', valign: 'middle' }, { fx: 'stamp', dur: 350 });
    }
  }
  quiz(deck, 'pan', {
    kicker: 'Frage · Abschleppseil', q: 'Wie weit dürfen die beiden Autos beim Abschleppen mit Seil höchstens auseinander sein?',
    opts: ['3 m', '5 m', '10 m'], ok: 1,
    why: 'Höchstens 5 m lichter Abstand – und Seil oder Stange gut sichtbar machen, z. B. mit einem roten Lappen (§ 43 Abs. 3 StVZO).',
    notes: '▶ Frage vorlesen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B, 5 m.\n➜ „Und noch eine zur Autobahn.“',
  });
  quiz(deck, 'pan', {
    kicker: 'Frage · Abschleppen und Autobahn', q: 'Ein Auto bleibt auf der Landstraße liegen. Darfst du es über die Autobahn zur Werkstatt schleppen?',
    opts: ['Ja, wenn es schneller geht', 'Nein – auf die Autobahn darf nicht abgeschleppt werden', 'Ja, mit Warnblinker an beiden Autos'], ok: 1,
    why: 'Nur ein Auto, das auf der Autobahn liegen geblieben ist, darf dort abgeschleppt werden – bis zur nächsten Ausfahrt (§ 15a Abs. 1 und 2).',
    notes: '▶ Frage vorlesen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Jetzt seid ihr dran: Park-Streife!“',
  });
};
