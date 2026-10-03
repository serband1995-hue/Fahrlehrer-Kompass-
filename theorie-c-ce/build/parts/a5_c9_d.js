// Abend 5 · C9: Kapitel 4 Be- und Entladen (Ladekran + Freileitung, Ladebordwand, Rampe/Stapler)
const { C, sec, chapter, motion, steps, ask, quiz, lkw, seg, arrow } = require('../gs');
const { icon } = require('../lib');

sec('c9b', 'C9  ·  BE- UND ENTLADEN', C.bl, 'bg_blue.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'c9b', { num: 4, ttl: 'Be- und Entladen', sub: 'Ladekran, Ladebordwand, Stapler – hier passieren viele Unfälle.', ico: 'LuForklift', notes:
    '▶ Sagen: „Kapitel 4: Be- und Entladen. Hier passieren viele Arbeitsunfälle – nicht auf der Straße, sondern am stehenden Lkw.“\n🖱 Keine Klicks.\n➜ „Zuerst der Ladekran.“' });

  // ===== LADEKRAN: ABSTÜTZEN + FREILEITUNG (fließend) =====
  {
    const X = 6.0, GY = 6.25, K = 1.0, PX = 7.5, PY = 4.35, BL = 4.3, LY = 1.75, ZONE = 0.75;
    const fr = (a, o = {}) => ({ ...o, t: { a, ...(o.t || {}) } });
    await motion(deck, 'c9b', {
      kicker: 'Ladekran', ttl: 'Abstützen und Abstand', dur: 450, holdDur: 700,
      question: 'Ihr arbeitet mit dem Ladekran neben einer Stromleitung. Wie viel Abstand muss der Kran halten?',
      answer: 'Bis 1 kV: 1 m · bis 110 kV: 3 m · bis 220 kV: 4 m · bis 380 kV oder Spannung unbekannt: 5 m.',
      legend: 'Seitenansicht · schematisch · Schutzabstände nach DGUV Vorschrift 70 § 54 / 52 § 39',
      frames: [
        fr(-4, { hold: true, cap: 'Der Lkw steht an der Baustelle. Über ihm: eine Stromleitung.', note: '▶ Sagen: „Ladekran-Einsatz an der Baustelle. Über dem Lkw hängt eine Freileitung.“\n❓ Frage auf der Folie stellen – schätzen lassen.\n🖱 Klick: Zuerst wird abgestützt.\n➜ „Bevor der Kran sich bewegt: abstützen.“' }),
        fr(-4, { t: { st: 1 }, hold: true, cap: 'Zuerst abstützen: Stützen ganz ausfahren, auf festen Boden, mit Unterlegplatten. Sonst kippt der Lkw.', note: '▶ „Als Erstes die Stützen ganz ausfahren – auf festen Boden und mit Unterlegplatten. Ohne Stützen kippt der Lkw, sobald die Last zur Seite schwenkt.“\n✅ Prüfungsfrage 2.7.09-208: Vor Inbetriebnahme des Ladekrans das Fahrzeug mit den seitlichen Stützen gegen Kippen sichern; im Schwenkbereich dürfen sich keine elektrischen Leitungen befinden. BG Verkehr: tragfähiger Untergrund, Aufstandsfläche mit Unterlagen vergrößern.\n💡 Kranführer darf nur sein, wer 18 Jahre alt, befähigt und schriftlich beauftragt ist (DGUV Vorschrift 52 § 29). Der Lkw-Führerschein allein reicht nicht.\n🖱 Klick: Der Kran fährt aus (läuft von selbst).\n➜ „Jetzt hebt der Kran an.“' }),
        fr(6, { t: { st: 1 }, cap: 'Der Kranarm hebt sich …' }), fr(14, { t: { st: 1 } }), fr(20, { t: { st: 1 } }),
        fr(24, { t: { st: 1, stop: 1 }, hold: true, answer: true, cap: 'STOPP! Der Kran darf nicht in den Schutzabstand. Strom kann überspringen – ohne Berührung!', note: '▶ „Stopp! Der rote Bereich ist der Schutzabstand. Da darf kein Teil des Krans und keine Last hinein. Der Strom kann überspringen – auch ohne dass der Kran die Leitung berührt.“\n✅ Schutzabstände zu Freileitungen (DGUV Vorschrift 70 § 54 und DGUV Vorschrift 52 § 39, Durchführungsanweisungen, nach DIN VDE 0105-100) – auch beim Ausschwingen von Seil und Last: bis 1 kV 1 m · über 1 kV bis 110 kV 3 m · über 110 kV bis 220 kV 4 m · über 220 kV bis 380 kV 5 m · Spannung unbekannt: 5 m.\n💡 Wenn es doch passiert: im Fahrerhaus bleiben. Muss man raus: mit beiden Füßen zugleich weit wegspringen, nicht gleichzeitig Lkw und Boden berühren, in kleinen Hüpfschritten weg.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Die Ladebordwand.“' }),
      ],
      scene: async (s, { a, st = 0, stop = 0 }) => {
        // Freileitung mit Schutzabstand
        s.rect(5.75, LY - ZONE, 7.3, ZONE * 2, { fill: C.red, ft: stop ? 70 : 84, name: '!!zone' });
        s.lineS(5.75, LY - ZONE, 13.05, LY - ZONE, { color: C.red, lw: 1.5, dash: 'dash', name: '!!zoneL' });
        [-0.08, 0.08].forEach((o, q) => s.rect(5.75, LY + o - 0.01, 7.3, 0.025, { fill: 'C9D0DA', name: '!!draht' + q }));
        s.text('Freileitung', { x: 5.8, y: LY - 0.42, w: 2, h: 0.3, size: 12, bold: true, color: C.txt, name: '!!flt' });
        s.text('Schutzabstand', { x: 10.9, y: LY + 0.36, w: 2.1, h: 0.3, size: 12, bold: true, color: 'FF9A9A', align: 'right', name: '!!zt' });
        s.img(await icon('LuZap', C.am), { x: 12.55, y: LY - 0.55, w: 0.4, h: 0.4, name: '!!zap' });
        // Boden
        s.rect(5.75, GY, 7.3, 0.04, { fill: '3C4656', name: '!!boden' });
        await lkw(s, { L: 5.0, box: 'pritsche', boxH: 0.38, axles: [0.78, 3.95], top: 1.95 }, { x: X, gy: GY, k: K, name: '!!lkwK' });
        // Stütze
        const sy1 = st ? GY - 0.02 : GY - 0.55;
        s.rect(PX - 0.24, GY - 0.95, 0.17, sy1 - (GY - 0.95), { fill: 'F2C230', line: 'A87A10', lw: 1, name: '!!stz' });
        s.rect(PX - 0.45, GY - 0.07, 0.6, 0.07, { fill: '9AA4B1', ft: st ? 0 : 100, name: '!!platte' });
        s.text(st ? '↑ Stütze ausgefahren, Unterlegplatte' : '', { x: PX - 0.5, y: GY + 0.06, w: 4.5, h: 0.3, size: 12, bold: true, color: C.am, name: '!!stzt' });
        // Kransäule + Arm
        s.rect(PX - 0.08, PY, 0.22, GY - 0.82 - PY, { fill: 'E0A31A', line: 'A87A10', lw: 1, name: '!!saeule' });
        const r = a * Math.PI / 180, tx = PX + BL * Math.cos(r), ty = PY - BL * Math.sin(r);
        seg(s, PX, PY, tx, ty, { col: stop ? C.red : 'E0A31A', th: 0.16, rr: 0.2, name: '!!arm', glow: stop ? 8 : undefined });
        s.oval(PX - 0.1, PY - 0.1, 0.24, 0.24, { fill: '5A6576', name: '!!gelenk' });
        s.rect(tx - 0.01, ty, 0.02, 0.55, { fill: 'C9D0DA', name: '!!seil' });
        s.text('J', { x: tx - 0.12, y: ty + 0.45, w: 0.3, h: 0.3, size: 16, bold: true, color: 'C9D0DA', name: '!!haken' });
        s.text(stop ? 'STOPP!' : '', { x: 6.0, y: 2.75, w: 2.2, h: 0.55, size: 22, bold: true, color: C.white, fill: C.red, ft: stop ? 0 : 100, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!stop' });
      },
    });
  }

  // ===== LADEBORDWAND =====
  await ask(deck, 'c9b', {
    kicker: 'Ladebordwand', q: 'Ladebordwand (Hubladebühne): Worauf achtet ihr?', ico: 'LuArrowDownToLine', qsize: 32,
    answers: [
      ['LuWeight', 'Tragfähigkeit', 'Nicht mehr Last als der Hersteller erlaubt, Last mittig. Rollwagen gegen Wegrollen sichern.', C.bl],
      ['LuHand', 'Quetschen und Absturz', 'Nicht nah an die Kante, beim Heben und Senken nur im gekennzeichneten Bereich stehen.', C.bl],
      ['LuUser', 'Nur die Bedienperson', 'darf auf der Bühne mitfahren – sonst niemand.', C.bl],
      ['LuSiren', 'Gelbe Blinkleuchten', 'Im Betrieb blinken zwei gelbe Leuchten, dazu rot-weiße Warnmarkierung.', C.bl],
    ],
    notes:
      '▶ Sagen: „Viele Lkw im Verteilerverkehr haben eine Ladebordwand. Worauf achtet ihr?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ BG Verkehr „Be- und Entladen“: Last mittig, rollende Last sichern, Herstellerangaben beachten, nicht nahe der Absturzkante, außer der Bedienperson keine weiteren Personen mitnehmen. § 53b Abs. 5 StVZO: Hubladebühnen müssen im Betrieb durch zwei gelbe Blinkleuchten und rot-weiße retroreflektierende Warnmarkierungen kenntlich sein (Blinkleuchten arbeiten selbsttätig). Prüfungsfrage 2.7.09-209: Ladetätigkeit am Fahrbahnrand nur, wenn die Sicherheit des Verkehrs nicht beeinträchtigt wird und keine Haltverbote missachtet werden.\n' +
      '➜ „Und an der Laderampe mit dem Stapler?“',
  });

  // ===== RAMPE UND STAPLER (Morph) =====
  {
    const GY = 5.9, K = 1.0, X = 5.95, L = 5.6, RX = X + (L - 0.05) * K + 0.02, FY = GY - 0.82 * K;
    await steps(deck, 'c9b', {
      kicker: 'Laderampe', ttl: 'Stapler auf der Ladefläche',
      list: ['An die Rampe, Bremse fest', 'Unterlegkeil', 'Überladebrücke', 'Stapler fährt rein'],
      ask: { q: 'Was muss passieren, bevor der Stapler auf eure Ladefläche fährt?', a: 'Feststellbremse, Motor aus, Unterlegkeil, Überladebrücke. Und nicht losfahren, bevor das Laden fertig ist!', at: 3 },
      caps: [
        'Rückwärts an die Rampe, Feststellbremse anziehen, Motor aus. Schlüssel abziehen.',
        'Unterlegkeil an die Hinterräder. Der Stapler schiebt und bremst auf der Ladefläche – der Lkw darf nicht wandern.',
        'Die Überladebrücke schließt die Lücke zwischen Rampe und Ladefläche.',
        'Erst jetzt fährt der Stapler auf die Ladefläche. Der Ladeboden muss das Gewicht von Stapler und Last tragen.',
      ],
      notes: [
        '▶ Sagen: „Laden an der Rampe mit dem Stapler. Zuerst: rückwärts gerade an die Rampe, Feststellbremse, Motor aus, Schlüssel ab.“\n❓ Frage auf der Folie stellen.\n✅ DGUV Vorschrift 70 § 37: Beim Be- und Entladen darf das Fahrzeug nicht fortrollen, kippen oder umstürzen.\n➜ „Reicht die Feststellbremse?“',
        '▶ „Dazu ein Unterlegkeil. Wenn der Stapler auf der Ladefläche bremst und anfährt, schiebt er den Lkw. Der Lkw darf sich keinen Zentimeter von der Rampe wegbewegen.“\n💡 Viele Rampen haben eine Ampel oder einen Radkeil mit Sensor: Erst bei Grün darf geladen bzw. abgefahren werden.\n➜ „Dann die Brücke.“',
        '▶ „Die Überladebrücke wird aufgelegt – sie schließt die Lücke zwischen Rampe und Ladefläche.“\n💡 Hat euer Lkw eine Ladebordwand: die Überladebrücke nie auf die Ladebordwand legen. Nur eine dafür geeignete Bordwand darf selbst auf die Rampe gelegt werden (Betriebsanleitung; BG Verkehr „Be- und Entladen“).\n➜ „Und jetzt der Stapler.“',
        '▶ „Erst jetzt fährt der Stapler auf die Ladefläche. Achtet darauf: Der Ladeboden muss das Gewicht tragen – Stapler plus Last. Und ganz wichtig: Nicht losfahren, solange noch geladen wird!“\n❓ Frage auf der Folie auflösen.\n✅ DGUV Vorschrift 70 § 37: gegen Fortrollen sichern. DGUV Vorschrift 68 § 7: Stapler fahren darf nur, wer 18 Jahre alt, ausgebildet (Staplerschein) und schriftlich beauftragt ist – der Lkw-Führerschein reicht dafür nicht.\n➜ „Prüfungsfrage zum Ladekran.“',
      ],
      legend: 'Seitenansicht · schematisch',
      scene: async (s, i) => {
        s.rect(5.75, GY, 7.3, 0.04, { fill: '3C4656', name: '!!boden' });
        // Rampe
        s.rect(RX + 0.06, FY, 13.33 - RX, GY - FY, { fill: '3A4250', line: '4A5668', lw: 1, name: '!!rampe' });
        s.rect(RX + 0.06, FY, 13.33 - RX, 0.06, { fill: 'E0A31A', name: '!!kante' });
        s.text('Rampe', { x: RX + 0.2, y: FY + 0.3, w: 1.2, h: 0.3, size: 13, bold: true, color: C.mut, name: '!!rt' });
        const r = await lkw(s, { L, axles: [0.78, 4.05] }, { x: X, gy: GY, k: K, name: '!!lkwR' });
        // aufgeschnittener Koffer
        const [bx0, by0] = r.pt(1.6, 0.75 + 1.43), [bx1, by1] = r.pt(L - 0.12, 0.83);
        s.rect(bx0, by0, bx1 - bx0, by1 - by0, { fill: '1A1F27', ft: 10, name: '!!innen' });
        [0, 1].forEach(q => s.rect(bx0 + 0.15 + q * 0.95, by1 - 0.85, 0.85, 0.85, { fill: 'B9864A', line: '6E4E2A', lw: 1, name: '!!pal' + q }));
        // Keil
        const wx = X + 4.05 * K - 0.3 * K - 0.36;
        s.shape(s.pres.shapes.RIGHT_TRIANGLE, { x: wx, y: GY - 0.28, w: 0.34, h: 0.28, fill: 'E0A31A', ft: i >= 1 ? 0 : 100, flipH: true, name: '!!keil' });
        // Überladebrücke
        s.rect(bx1 - 0.25, FY - 0.04, i >= 2 ? (RX + 0.5) - (bx1 - 0.25) : 0.05, 0.07, { fill: '9AA4B1', ft: i >= 2 ? 0 : 100, name: '!!bruecke' });
        // Stapler
        const sx = i >= 3 ? bx1 - 1.5 : 11.85;
        s.img(await icon('LuForklift', C.am), { x: sx, y: FY - 1.05, w: 1.05, h: 1.05, name: '!!stapler' });
        // Hinweise
        s.text(i === 0 ? 'Bremse fest · Motor aus' : i === 1 ? 'Keil!' : '', { x: 5.75, y: 1.55, w: 5, h: 0.4, size: 18, bold: true, color: C.am, name: '!!hw' });
        arrow(s, wx + 0.17, GY - 0.95, wx + 0.17, GY - 0.38, { col: C.am, th: 0.07, head: 0.2, name: 'kp', hide: i !== 1 });
      },
    });
  }

  await quiz(deck, 'c9b', {
    kicker: 'Prüfungsfrage 2.7.09-208', q: 'Welche Vorsichtsmaßnahmen sind vor Inbetriebnahme eines Ladekranes zu treffen?',
    opts: ['Mit Hilfe der seitlichen Stützen das Fahrzeug gegen Kippen sichern', 'Im Schwenkbereich dürfen sich keine elektrischen Leitungen befinden', 'Prüfen, ob seitliches Abstützen unbedingt erforderlich ist'], ok: [0, 1],
    why: 'Immer abstützen – nicht erst prüfen, ob es nötig ist. Und keine Stromleitungen im Schwenkbereich.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.09-208: A und B.\n➜ „Kapitel 5: Die Abfahrtkontrolle.“',
  });
};
