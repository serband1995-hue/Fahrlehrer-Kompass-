// Abend 4 · C8: Kapitel 3 Ladung, Kapitel 4 Besondere Güter, Kapitel 5 Arbeitssicherheit, Abschluss, Ende
const { C, sec, base, kick, title, card, point, CLICK, chapter, motion, steps, lkw, ask, photoAsk, quiz, write, takeaway, veh, svgImg, arrow, foot } = require('../gs');
const { icon } = require('../lib');

// Gurt-Symbol (Person im Sitz mit Schräg- und Beckengurt), dunkel auf grünem Kreis – die Lücke um den Gurt hat die Kreisfarbe
function gurtSvg(D, G) {
  const gurt = d => `<path d="${d}" fill="none" stroke="${G}" stroke-width="54" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${D}" stroke-width="26" stroke-linecap="round"/>`;
  return `<path d="M136 150 L156 418 L392 418" fill="none" stroke="${D}" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="262" cy="80" r="62" fill="${D}"/>` +
    `<path d="M240 186 L262 330 L396 330 L410 470" fill="none" stroke="${D}" stroke-width="98" stroke-linecap="round" stroke-linejoin="round"/>` +
    gurt('M318 150 L212 352') + gurt('M212 352 L336 354');
}
// Karte wie point() (br: true), aber mit eigenem Bild statt Lucide-Symbol
async function pointBild(s, x, y, w, h, img, col, head, body, size = 18) {
  card(s, x, y, w, h, {}, CLICK);
  const d = Math.min(0.62, h - 0.3);
  s.oval(x + 0.22, y + (h - d) / 2, d, d, { fill: col, line: col }, { fx: 'zoom', dur: 250 });
  s.img(img, { x: x + 0.22 + d * 0.15, y: y + (h - d) / 2 + d * 0.15, w: d * 0.7, h: d * 0.7 }, { fx: 'fade', dur: 150 });
  s.text([{ text: head, options: { bold: true, color: C.txt, breakLine: true } }, { text: body, options: { color: C.mut } }], { x: x + d + 0.45, y, w: w - d - 0.6, h, size, valign: 'middle' }, { fx: 'fade', dur: 200 });
}

sec('c8l', 'C8  ·  LADUNG', 'C9A227', 'bg_am.jpg');
sec('c8g', 'C8  ·  BESONDERE GÜTER', C.red, 'bg_red.jpg');
sec('c8s', 'C8  ·  ARBEITSSICHERHEIT', C.bl, 'bg_blue.jpg');
sec('c8e', 'C8  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

module.exports = async (deck) => {
  // ===== KAPITEL 3 LADUNG =====
  await chapter(deck, 'c8l', { num: 3, ttl: 'Ladung', sub: 'Wie weit Ladung herausragen darf – und wer für sie geradesteht.', ico: 'LuPackage', notes:
    '▶ Sagen: „Kapitel 3: Ladung. Wie man sie richtig sichert, kommt ausführlich in C9. Heute: Was darf herausragen, und wer ist verantwortlich?“\n🖱 Keine Klicks.\n➜ „Eine Pritsche mit langen Rohren.“' });
  {
    const L = 5.0, F = 0.72, BH = 0.42, k = 0.95, X = 5.9, GY = 4.95, M = 0.4; // M = Zoll je Meter Überstand
    const END = X + L * k; // Fahrzeugende (Rückstrahler)
    const ST = [{ ov: 0.9, flag: 0, night: 0 }, { ov: 1.5, flag: 1, night: 0 }, { ov: 3.0, flag: 1, night: 0 }, { ov: 3.0, flag: 1, night: 1 }];
    await steps(deck, 'c8l', {
      kicker: 'Ladung', ttl: 'Was hinten herausragen darf',
      list: ['Bis 1 m: ohne Kennzeichnung', 'Mehr als 1 m: rote Fahne', 'Höchstens 1,50 m – kurz 3 m', 'Im Dunkeln: rotes Licht'],
      ask: { q: 'Ab wann muss hinten eine rote Fahne an die Ladung?', a: 'Wenn sie mehr als 1 m über die Rückstrahler hinausragt.', at: 1 },
      caps: [
        'Ragt die Ladung höchstens 1 m über die Rückstrahler hinaus, muss sie nicht gekennzeichnet werden.',
        'Mehr als 1 m: hellrote Fahne oder Schild, mindestens 30 × 30 cm, höchstens 1,50 m über der Straße.',
        'Erlaubt sind höchstens 1,50 m nach hinten. Nur bei einer Fahrt bis 100\u00A0km: bis zu 3 m.',
        'Bei Dämmerung, Dunkelheit oder schlechter Sicht: rote Leuchte an der Fahne, dazu ein roter Rückstrahler (höchstens 90 cm hoch).',
      ],
      notes: [
        '▶ Sagen: „Lange Rohre auf der Pritsche. Wie weit dürfen sie hinten raus?“\n✅ § 22 Abs. 4 StVO: Kennzeichnung erst, wenn das äußerste Ende mehr als 1 m über die Rückstrahler hinausragt.\n➜ „Jetzt etwas mehr.“',
        '▶ „Mehr als 1 Meter: Dann muss eine hellrote Fahne dran – mindestens 30 mal 30 Zentimeter, mit Querstange, oder ein gleich großes, pendelnd aufgehängtes Schild. Nicht höher als 1,50 Meter über der Straße.“\n❓ Frage auf der Folie auflösen.\n✅ § 22 Abs. 4 StVO. Prüfungsfrage 2.7.09-204: Fahne mit Querstange oder pendelndes Schild – NICHT eine orangefarbene Warntafel.\n➜ „Wie weit darf es höchstens sein?“',
        '▶ „Nach hinten höchstens 1,50 Meter. Ausnahme: Wenn die ganze Fahrt höchstens 100 Kilometer lang ist, dürfen es bis zu 3 Meter sein.“\n✅ § 22 Abs. 4 StVO. Die 1,50 m bzw. 3 m zählen ab dem Fahrzeugende, die 1-m-Grenze für die Kennzeichnung ab den Rückstrahlern. Zug samt Ladung höchstens 20,75 m.\n💡 Nach vorn: bis 2,50 m Höhe darf gar nichts über das Fahrzeug hinausragen, darüber höchstens 50 cm (§ 22 Abs. 3 StVO). Seitlich: Ragt Ladung mehr als 40 cm über die Leuchten hinaus, bei Dämmerung, Dunkelheit oder schlechter Sicht vorn weißes und hinten rotes Licht (§ 22 Abs. 5; Prüfungsfrage 2.7.09-221). Stangen, Pfähle und liegende Platten dürfen seitlich gar nicht herausragen (§ 22 Abs. 5 Satz 2).\n➜ „Und nachts?“',
        '▶ „Bei Dämmerung, Dunkelheit oder schlechter Sicht: zusätzlich eine Leuchte mit rotem Licht an der Fahne und ein roter Rückstrahler. Die 90 Zentimeter gelten nur für den Rückstrahler – die Leuchte sitzt an der Fahne.“\n✅ § 22 Abs. 4 StVO: „Wenn nötig (§ 17 Absatz 1)“ – also bei Dämmerung, Dunkelheit oder schlechter Sicht – eine Leuchte mit rotem Licht an gleicher Stelle, außerdem ein roter Rückstrahler nicht höher als 90 cm.\n➜ „Und wer ist für die Ladung verantwortlich?“',
      ],
      legend: 'Schematisch · nicht maßstäblich',
      scene: async (s, i) => {
        const st = ST[i];
        s.rect(5.6, 1.45, 7.5, 5.2, { fill: '05070C', ft: st.night ? 25 : 100, name: '!!nacht' });
        s.rrect(5.65, GY, 7.4, 0.3, { fill: C.road, rr: 0.1, name: '!!str' });
        await lkw(s, { L, floor: F, boxH: BH, box: 'pritsche', axles: [0.72, 3.6], r: 0.28, cabTop: F + 1.12 }, { x: X, gy: GY, k, name: '!!lkwP' });
        // Rohrbündel
        const y0 = GY - (F + BH + 0.02) * k, rl = (L - 1.55) * k + st.ov * M, rx = X + 1.5 * k;
        for (let q = 0; q < 3; q++) s.rrect(rx, y0 - 0.12 * (q + 1), rl, 0.11, { fill: q % 2 ? '9AA6B5' : 'B4BDC9', line: '6E7888', lw: 1, rr: 0.5, name: '!!rohr' + q });
        const tip = rx + rl;
        // Maß Überstand
        arrow(s, END, y0 - 0.65, tip, y0 - 0.65, { col: C.am, th: 0.05, head: 0.18, name: 'ov' });
        s.rect(END - 0.015, y0 - 0.8, 0.03, 0.75, { fill: C.am, ft: 30, name: '!!rueck' });
        s.text(String(st.ov).replace('.', ',') + ' m', { x: (END + tip) / 2 - 0.8, y: y0 - 1.15, w: 1.6, h: 0.4, size: 20, bold: true, color: C.am, align: 'center', name: '!!ovt' });
        // Rückstrahler am Fahrzeug: Beschriftung unter der Straße mit Hinweislinie
        const RX = END + 0.08;
        s.lineS(END + 0.01, GY - 0.5, RX, GY + 0.36, { color: C.mut, lw: 1, name: '!!rtl' });
        s.text('Rückstrahler am Fahrzeug', { x: RX - 1.3, y: GY + 0.37, w: 2.6, h: 0.3, size: 12, color: C.mut, align: 'center', name: '!!rt' });
        // Fahne / Schild
        s.rect(tip - 0.2, y0 - 0.12, 0.02, 0.45, { fill: C.txt, ft: st.flag ? 0 : 100, name: '!!stab' });
        s.rect(tip - 0.38, y0 + 0.28, 0.36, 0.36, { fill: 'FF4D4D', ft: st.flag ? 0 : 100, line: st.flag ? 'B02A2A' : undefined, name: '!!fahne' });
        // Leuchte + Rückstrahler bei Nacht
        s.oval(tip - 0.32, y0 + 0.7, 0.18, 0.18, { fill: 'FF2A2A', ft: st.night ? 0 : 100, glow: st.night ? 14 : undefined, glowColor: 'FF2A2A', name: '!!leuchte' });
        s.rrect(tip - 0.1, y0 + 0.72, 0.1, 0.14, { fill: 'C0392B', ft: st.night ? 0 : 100, rr: 0.2, name: '!!refl' });
        s.text(st.night ? [{ text: 'Leuchte +', options: { breakLine: true } }, { text: 'Rückstrahler' }] : '', { x: tip + 0.08, y: y0 + 0.5, w: 1.15, h: 0.56, size: 12, bold: true, color: 'FF8A8A', valign: 'middle', name: '!!refll' });
        s.text(['ohne Kennzeichnung', 'Fahne oder Schild', 'nur bis 100 km Fahrt', 'rotes Licht + Rückstrahler'][i], { x: 9.0, y: 1.6, w: 4.05, h: 0.5, size: 22, bold: true, color: i ? C.red : C.gr, align: 'right', name: '!!lab' });
      },
    });
  }
  await ask(deck, 'c8l', {
    kicker: 'Ladung', q: 'Wer ist verantwortlich, dass die Ladung sicher ist?', ico: 'LuUsers', qsize: 34,
    answers: [
      ['LuTruck', 'Ihr als Fahrer', 'Ihr prüft vor der Abfahrt. Ist die Ladung nicht sicher: nicht losfahren.', C.or],
      ['LuForklift', 'Der Verlader', 'lädt und sichert die Ladung – zusammen mit euch.', 'C9A227'],
      ['LuBuilding2', 'Der Halter', 'stellt ein geeignetes Fahrzeug und Sicherungsmittel bereit.', C.bl],
      ['LuBan', 'Nicht der Empfänger', 'Und: Ungesicherte Ladung kostet beim Lkw 60 € und einen Punkt.', C.red],
    ],
    notes:
      '▶ Sagen: „Bei einer Kontrolle zählt: Wer fährt, ist dran. Aber ihr seid nicht allein verantwortlich.“\n' +
      '❓ Erst sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je eine Karte.\n' +
      '✅ Prüfungsfrage 2.2.22-221: Fahrer und Verlader sind für die Ladungssicherung verantwortlich – nicht der Empfänger. Prüfungsfrage 2.2.22-214: Fahrer und Halter sind hinsichtlich der Ladung für den Betrieb verantwortlich. § 22 Abs. 1 StVO: Ladung so sichern, dass sie selbst bei Vollbremsung oder plötzlicher Ausweichbewegung nicht verrutscht. Bußgeld Lkw 60 € + 1 Punkt (BKat Nr. 102.1, FeV Anlage 13 Nr. 3.2.14). Rechtsgrundlagen: Fahrer § 23 Abs. 1 StVO, Halter § 31 Abs. 2 StVZO.\n' +
      '💡 Wie man richtig sichert (Zurrgurte, Formschluss, Lastverteilungsplan), kommt in C9.\n' +
      '➜ „Kapitel 4: Besondere Güter.“',
  });

  // ===== KAPITEL 4 BESONDERE GÜTER =====
  await chapter(deck, 'c8g', { num: 4, ttl: 'Besondere Güter', sub: 'Gefahrgut, Abfall und Tiere haben eigene Regeln.', bg: 'i_adr_r.jpg', bgX: 6.0, notes:
    '▶ Sagen: „Kapitel 4: Besondere Güter. Auf dem Bild: ein Tankfahrzeug mit orangefarbener Warntafel.“\n🖱 Keine Klicks.\n➜ „Was bedeutet diese Tafel?“' });
  await photoAsk(deck, 'c8g', {
    bg: 'i_adr_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Gefahrgut', q: 'Orange Tafel am Lkw – was bedeutet das?', qsize: 30, w: 5.05, asize: 14, top: 2.55,
    answers: [
      ['LuFlame', 'Gefahrgut über der 1000-Punkte-Grenze', 'Der Fahrer braucht eine ADR\u2011Schulungsbescheinigung.', C.or],
      ['LuFireExtinguisher', 'Kleine Mengen in Versandstücken', 'keine orange Tafel, keine ADR\u2011Schulungsbescheinigung – aber Feuerlöscher (2 kg), Beförderungspapier, Unterweisung.', C.red],
      ['LuPhoneCall', 'Bei einem Unfall', 'Abstand halten, Notruf – die Nummern auf der Tafel (wenn vorhanden) der Feuerwehr nennen.', C.am],
    ],
    notes:
      '▶ Sagen: „Die orangefarbene Tafel heißt: Hier wird Gefahrgut transportiert – in einer Menge, für die die vollen Gefahrgutregeln gelten.“\n' +
      '❓ „Darf ich mit meinem C-Führerschein Gefahrgut fahren?“ – Antwort: kleine Mengen in Versandstücken (Kanister, Fässer, Pakete) ja, darüber nur mit ADR-Schulungsbescheinigung. Tank- und Schüttguttransporte wie auf dem Bild: nie ohne ADR-Schulungsbescheinigung.\n' +
      '🖱 Klick 1–3: je eine Karte.\n' +
      '✅ ADR 2025, Unterabschnitt 1.1.3.6 (1000-Punkte-Regel, höchstzulässige Menge je Beförderungseinheit): gilt nur für Güter in Versandstücken (nicht in Tanks oder lose geschüttet). Unterhalb der Grenze keine orangefarbenen Tafeln, keine schriftlichen Weisungen, keine ADR-Schulungsbescheinigung. Pflicht bleiben ein Feuerlöscher (2 kg), das Beförderungspapier und eine Unterweisung des Fahrers (8.2.3 ADR). Quelle: Übersicht „Freistellungsmöglichkeiten nach ADR 2025“ (Gefahrgut-Dünnebier).\n' +
      '💡 Auf der Tafel stehen oft zwei Zahlen: oben die Nummer zur Gefahr, unten die UN-Nummer des Stoffs. Die helfen der Feuerwehr.\n' +
      '➜ „Es gibt noch mehr Güter mit eigenen Regeln.“',
  });
  {
    const s = base(deck, 'c8g', { notes:
      '▶ Sagen: „Drei Arten von Gütern haben eigene Vorschriften: Gefahrgut, Abfall und lebende Tiere. Und bei jeder Ladung gilt: Ihr schaut sie euch an, bevor ihr sie übernehmt.“\n' +
      '🖱 Klick 1–3: je ein Gut · Klick 4: Ladung übernehmen.\n' +
      '✅ Prüfungsfrage 2.7.09-220: besondere Vorschriften für gefährliche Güter, Abfall und lebende Tiere (alle drei richtig). § 55 KrWG: Sammler und Beförderer von Abfällen versehen ihre Fahrzeuge mit zwei weißen, rückstrahlenden Warntafeln (A-Schilder), vorn und hinten. Prüfungsfrage 2.7.09-231: Das A-Schild weist auf Abfalltransporte hin.\n' +
      '💡 Ausnahme beim A-Schild: Betriebe, die nur ihren eigenen Abfall nebenbei mitnehmen (z. B. Handwerker mit Bauschutt), brauchen keins (§ 55 Abs. 1 Satz 2 KrWG, § 10 Abs. 2 AbfVerbrG: „im Rahmen wirtschaftlicher Unternehmen“).\n' +
      '✅ VO (EG) Nr. 1/2005 Art. 6 Abs. 5 und 7: Wer Pferde, Rinder, Schafe, Ziegen, Schweine oder Geflügel über mehr als 65 km fährt, braucht einen Befähigungsnachweis. „Beförderungs- und Ruhezeiten“ meint die Zeiten der Tiere – nicht eure Lenkzeiten.\n' +
      '✅ Ladung übernehmen (Rahmenplan C8: Entgegennahme, Transport, Ablieferung): Prüfungsfrage 2.7.09-228 – beschädigte Ladung, von der eine Gefahr beim Transport zu erwarten ist, zurückweisen, wenn ich die Gefahr nicht abwenden kann (nicht „unter Vorbehalt annehmen“). 2.7.09-216 – Kühlgut: Temperatur ständig überwachen, bei Ausfall der Kühlung Maßnahmen zum Erhalt der Ladung treffen. 2.7.09-211 – heiße Ladung (z. B. Bitumen) bei Panne: Fahrzeug absichern, Hilfe organisieren, notwendige Temperatur sicherstellen (alle drei richtig).\n' +
      '➜ „Kapitel 5: Wie ihr bei der Arbeit am Lkw gesund bleibt.“' });
    kick(s, 'Besondere Güter'); title(s, 'Eigene Regeln für besondere Güter');
    const T = [
      ['LuFlame', C.or, 'Gefahrgut', 'Orange Tafeln, Ausrüstung und ADR‑Schulungsbescheinigung. Kleine Mengen in Versandstücken: Feuerlöscher, Papier, Unterweisung.'],
      ['LuRecycle', C.gr, 'Abfall', 'Wer Abfall als Sammler oder Entsorger befördert: vorn und hinten ein weißes A-Schild.'],
      ['LuPawPrint', C.am, 'Lebende Tiere', 'Eigene Tierschutz-Vorschriften: genug Platz, Versorgung, Beförderungs- und Ruhezeiten.'],
    ];
    const y = 2.0, ch = 3.6, sy = y + 2.85;   // Karten 2,00–5,60; Symbolzeile unten in jeder Karte
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 4.05;
      card(s, x, y, 3.83, ch, { line: T[i][1] }, CLICK);
      s.oval(x + 1.5, y + 0.2, 0.84, 0.84, { fill: T[i][1], line: T[i][1] }, { fx: 'zoom', dur: 250 });
      s.img(await icon(T[i][0], C.dark), { x: x + 1.69, y: y + 0.39, w: 0.46, h: 0.46 }, { fx: 'fade', dur: 150 });
      s.text(T[i][2], { x: x + 0.2, y: y + 1.12, w: 3.43, h: 0.45, size: 22, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: x + 0.2, y: y + 1.6, w: 3.43, h: 1.15, size: 14, color: C.mut, align: 'center' }, { fx: 'fade', dur: 200 });
      if (i === 0) s.rrect(x + 1.37, sy, 1.1, 0.62, { fill: 'F28C28', line: '111111', lw: 3, rr: 0.04 }, { fx: 'zoom', dur: 300 });   // orange Tafel
      if (i === 1) {   // A-Schild
        s.rrect(x + 1.47, sy - 0.04, 0.9, 0.7, { fill: 'FFFFFF', line: '111111', lw: 2.5, rr: 0.06 }, { fx: 'zoom', dur: 300 });
        s.text('A', { x: x + 1.47, y: sy - 0.04, w: 0.9, h: 0.7, size: 36, bold: true, color: '111111', align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
      }
      if (i === 2) s.text([{ text: 'Nutztiere über 65 km:', options: { breakLine: true } }, { text: 'Befähigungsnachweis', options: { bold: true } }], { x: x + 0.35, y: sy - 0.04, w: 3.13, h: 0.7, size: 14, color: C.txt, align: 'center', valign: 'middle', fill: C.card2, line: C.am, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2 }, { fx: 'zoom', dur: 300 });   // Befähigungsnachweis
    }
    // Ladung übernehmen (Rahmenplan C8: Entgegennahme und Ablieferung von Gütern)
    await point(s, 0.7, 5.75, 11.93, 0.8, 'LuPackageX', C.bl, 'Ladung übernehmen:', 'Beschädigte Ladung, die beim Transport gefährlich werden kann, zurückweisen. Kühlgut: Temperatur ständig überwachen. Heiße Ladung (z. B. Bitumen) bei Panne: absichern, Hilfe holen, Temperatur halten.', CLICK, { size: 15 });
  }

  // ===== KAPITEL 5 ARBEITSSICHERHEIT =====
  await chapter(deck, 'c8s', { num: 5, ttl: 'Arbeitssicherheit', sub: 'Die meisten Arbeitsunfälle passieren nicht beim Fahren, sondern rund um den Lkw.', ico: 'LuHardHat', notes:
    '▶ Sagen: „Kapitel 5: Arbeitssicherheit. Die meisten Arbeitsunfälle von Lkw-Fahrern passieren gar nicht im Verkehr – sondern beim Aussteigen, Rangieren und Be- und Entladen. Vor allem Stürze.“\n✅ BG Verkehr, „Sicher unterwegs – Arbeitsplatz Lkw“ (Broschüre 2018, Zahlen 2015): Verkehrsunfälle 8,4 %, Stürze 44,3 % der meldepflichtigen Arbeitsunfälle im Güterkraftverkehr. Über die Schwere sagen die Zahlen nichts – ein verstauchter Knöchel zählt so viel wie ein tödlicher Verkehrsunfall.\n💡 Für Fahrer in Transportbetrieben ist die BG Verkehr zuständig, in anderen Branchen deren Berufsgenossenschaft – die Unfallverhütungsvorschrift „Fahrzeuge“ (DGUV Vorschrift 70) gilt für alle.\n🖱 Keine Klicks.\n➜ „Fangen wir mit dem Aussteigen an.“' });
  {
    const k = 2.1, X = 6.3, GY = 6.55;
    await steps(deck, 'c8s', {
      kicker: 'Ein- und Aussteigen', ttl: 'Drei Punkte halten',
      list: ['Gesicht zum Fahrerhaus', 'Immer drei Kontaktpunkte', 'Nicht springen'],
      ask: { q: 'Warum nicht einfach aus der Kabine springen?', a: 'Ein Sprung belastet Knochen und Bänder bis zum Siebenfachen des Körpergewichts – ein falscher Tritt, und der Knöchel ist gebrochen.', at: 2 },
      caps: [
        'Aussteigen wie von einer Leiter: mit dem Gesicht zum Fahrerhaus.',
        'Immer drei Punkte am Lkw – am besten zwei Hände und ein Fuß („2+1“). Jede Stufe nehmen, Hände frei.',
        'Nicht springen, nicht über Reifen oder Felgen klettern. Stufen sauber und frei von Schnee und Eis halten.',
      ],
      notes: [
        '▶ Sagen: „Wie steigt ihr aus einem Lkw aus? Wie von einer Leiter – mit dem Gesicht zum Fahrerhaus.“\n✅ DGUV Vorschrift 70 § 41: Aufstiege und Haltegriffe benutzen.\n➜ „Und festhalten?“',
        '▶ „Immer drei Punkte haben Kontakt mit dem Lkw – am besten zwei Hände und ein Fuß. Die BG Verkehr nennt das „2+1“. Haltegriffe benutzen, jede Stufe nehmen, keine auslassen. Und die Hände frei: Papiere und Handy vorher in die Tasche.“\n✅ BG Verkehr, Unterweisungskarte G12: „2+1“ – zwei Hände und ein Fuß sind immer in Kontakt mit dem Fahrzeug; jede Stufe nutzen; nichts in den Händen halten. DGUV Vorschrift 70 § 41.\n➜ „Und warum nicht springen?“',
        '▶ „Nicht springen! Der Sitz ist über einen Meter hoch, der Boden oft uneben. Ein Sprung belastet Knochen und Bänder bis zum Siebenfachen des Körpergewichts – ein falscher Tritt, und der Knöchel ist gebrochen.“\n❓ Frage auf der Folie auflösen.\n✅ BG Verkehr, „Sicher unterwegs – Arbeitsplatz Lkw“, S. 7: Springen belastet Muskeln, Bänder und Knochen bis zum Siebenfachen des Körpergewichts. DGUV Vorschrift 70 § 41 mit Durchführungsanweisung: Aufsteigen über Reifen, Felgen oder Radnaben sowie Abspringen ist nicht zulässig.\n✅ Prüfungsfrage 2.7.01-256: Alle Trittstufen müssen vor der Benutzung schnee- und eisfrei sein.\n➜ „Das zweite große Risiko: Rückwärtsfahren.“',
      ],
      scene: async (s, i) => {
        s.text(i ? 'Schematisch · grüne Punkte = Kontaktpunkte' : 'Schematisch', { x: 5.6, y: 6.7, w: 7, h: 0.3, size: 11, italic: true, color: C.dim, name: '!!leg' });   // Legende erst, wenn die Punkte da sind
        const r = await lkw(s, { L: 3.2, axles: [0.78, 2.6], boxH: 1.4, box: 'koffer' }, { x: X, gy: GY, k, name: '!!lkwA' });
        const [hx, hy] = r.pt((6.8 - X) / k, 1.25), [h2x, h2y] = r.pt(1.12, 1.6), [fx, fy] = r.pt(0.2, 0.36);   // linker Griff an der A-Säule, nicht auf der Tür
        // Haltegriffe
        s.rrect(hx - 0.04, hy - 0.55, 0.08, 1.1, { fill: '5E6876', rr: 0.5, name: '!!griff1' });
        s.rrect(h2x - 0.04, h2y - 0.5, 0.08, 1.0, { fill: '5E6876', rr: 0.5, name: '!!griff2' });
        const P = [[hx, hy, 'Hand'], [h2x, h2y, 'Hand'], [fx, fy - 0.05, 'Fuß']];
        P.forEach(([x, y, t], q) => {
          const on = i >= 1;
          s.oval(x - 0.17, y - 0.17, 0.34, 0.34, { fill: C.gr, ft: on ? 0 : 100, line: on ? C.white : undefined, lw: 2, glow: on ? 10 : undefined, glowColor: C.gr, name: '!!kp' + q });
          s.text(on ? t : '', { x: t === 'Fuß' ? x - 0.99 : x + 0.24, y: y - 0.17, w: 0.75, h: 0.34, size: 14, bold: true, color: C.gr, fill: on ? C.dark : undefined, ft: 15, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!kpt' + q });
        });
        s.text(i >= 2 ? '✗  nicht springen' : '', { x: 5.75, y: 1.55, w: 3.3, h: 0.55, size: 24, bold: true, color: C.red, name: '!!nojump' });
        s.text(['Gesicht zum Fahrerhaus', 'Drei Kontaktpunkte', 'Stufe für Stufe'][i], { x: 9.6, y: 1.6, w: 3.45, h: 0.5, size: 22, bold: true, color: C.bl, align: 'right', name: '!!lab' });
      },
    });
  }

  // ===== RÜCKWÄRTS MIT EINWEISER (fließend) =====
  {
    const CX = 10.0, WALL = 1.75, SCL = 0.8, TW = 0.78 * SCL, TH = 2.86 * SCL;
    // Spiegelbereich: 4,1 Zoll lang (Einweiser steht schon zu Beginn im Grün), oben an der Hallenkante abgeschnitten
    const CH = 4.1;
    const cone = async (my) => {
      const cut = Math.max(0, (WALL - (my - CH + 0.1)) * 100);   // was über der Hallenkante liegt, wird nicht gezeichnet
      return svgImg(`<clipPath id="c"><rect x="0" y="${cut.toFixed(1)}" width="160" height="${CH * 100}"/></clipPath><path clip-path="url(#c)" d="M 6 ${CH * 100 - 10} L 0 10 L 150 40 Z" fill="#38D98A" fill-opacity="0.16" stroke="#38D98A" stroke-opacity="0.45" stroke-width="3"/>`, 160, CH * 100, 1);
    };
    const fr = (y, o = {}) => ({ ...o, t: { y, ...(o.t || {}) } });
    await motion(deck, 'c8s', {
      kicker: 'Rückwärtsfahren', ttl: 'Mit Einweiser an die Rampe', dur: 520, holdDur: 800,
      question: 'Wo darf der Einweiser stehen – und was tut ihr, wenn ihr ihn nicht mehr seht?',
      answer: 'Seitlich hinten im Blickfeld des Fahrers – nie zwischen Lkw und Rampe. Seht ihr ihn nicht mehr: sofort anhalten.',
      legend: 'Draufsicht · schematisch · grüner Bereich = Blick in den linken Außenspiegel',
      frames: [
        fr(5.2, { hold: true, cap: 'Rückwärts an die Laderampe. Hinter dem Lkw seht ihr nichts.', note: '▶ Sagen: „Ihr setzt rückwärts an die Rampe. Direkt hinter dem Lkw seht ihr gar nichts.“\n❓ Frage auf der Folie stellen.\n🖱 Klick: Gefahrzone und Platz des Einweisers erscheinen.\n➜ „Wo darf jemand stehen?“' }),
        fr(5.2, { t: { zone: 1 }, hold: true, cap: 'Rot: Hier darf niemand stehen. Grün: Hier steht der Einweiser – im Spiegel sichtbar.', note: '▶ „Zwischen Lkw und Rampe: lebensgefährlich, da darf niemand stehen. Der Einweiser steht seitlich hinten, so dass ihr ihn im linken Spiegel seht.“\n✅ DGUV Vorschrift 70 § 46: Rückwärtsfahren nur, wenn niemand gefährdet ist – sonst mit Einweiser. Einweiser nur im Sichtbereich des Fahrers, nicht zwischen Fahrzeug und Hindernis, keine anderen Tätigkeiten.\n🖱 Klick: Der Lkw setzt zurück (läuft von selbst).\n➜ „Langsam zurück.“' }),
        fr(4.7, { t: { zone: 1 }, cap: 'Langsam, Schrittgeschwindigkeit – Blick in den Spiegel, auf den Einweiser.' }), fr(4.2, { t: { zone: 1 } }), fr(3.7, { t: { zone: 1 } }),
        fr(3.25, { t: { zone: 1, stop: 1 }, hold: true, answer: true, cap: 'Der Einweiser zeigt „Halt“ – sofort stehen bleiben. Seht ihr ihn nicht mehr: ebenfalls sofort anhalten.', note: '▶ „Der Einweiser gibt das Haltzeichen – ihr bleibt sofort stehen. Und ganz wichtig: Verliert ihr ihn aus dem Spiegel, haltet ihr an. Erst wieder fahren, wenn ihr ihn seht.“\n✅ Prüfungsfrage 2.2.23-213: Beim Rückwärtsfahren aus einem Grundstück in die Straße sichert man durch Sicherungsposten (Einweiser) – nicht durch Warnblinklicht oder Hupen.\n💡 Rückfahrkamera, Rückfahrwarner oder eine Absperrung können genügen, wenn damit sicher niemand gefährdet ist – sonst Einweiser (Durchführungsanweisung zu DGUV Vorschrift 70 § 46).\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und was zieht ihr bei der Arbeit an?“' }),
      ],
      scene: async (s, t) => {
        // Halle / Rampe
        s.rect(5.65, 1.45, 7.4, WALL - 1.45, { fill: '3C4656', name: '!!halle' });
        s.rect(CX - 0.6, WALL - 0.08, 1.2, 0.08, { fill: C.am, name: '!!puffer' });
        s.rect(5.65, WALL, 7.4, 4.95, { fill: C.road, name: '!!hof' });
        for (const x of [CX - 0.75, CX + 0.71]) s.rect(x, WALL, 0.04, 3.2, { fill: C.mark, ft: 30, name: '!!lin' + (x < CX ? 'l' : 'r') });
        // Gefahrzone und Einweiserplatz
        const rear = t.y - TH / 2;
        s.rect(CX - 0.6, WALL, 1.2, Math.max(0.05, rear - WALL), { fill: C.red, ft: t.zone ? 70 : 100, name: '!!zone' });
        const zh = rear - WALL, big = zh >= 0.75;   // wenig Platz (Lkw fast an der Rampe): kleines ✗ im roten Streifen
        s.text(t.zone ? '✗' : '', { x: CX - 0.4, y: big ? WALL + 0.1 : WALL, w: 0.8, h: big ? 0.6 : Math.max(0.2, zh), size: big ? 30 : 16, bold: true, color: C.red, align: 'center', valign: big ? 'top' : 'middle', name: '!!zx' });
        // Spiegel-Blickfeld (Fahrer links = vom Lkw aus links; Lkw zeigt nach unten, also rechts im Bild)
        const mx = CX + TW / 2 + 0.06, my = t.y + TH / 2 - 0.28;
        s.img(await cone(my), { x: mx - 0.06, y: my - CH + 0.1, w: 1.6, h: CH, name: '!!cone' });
        // Einweiser
        const ex = CX + 0.95, ey = WALL + 0.85;
        s.oval(ex - 0.28, ey - 0.28, 0.56, 0.56, { fill: t.zone ? C.gr : C.line, line: C.white, lw: 1.5, name: '!!ew' });
        s.img(await icon('LuUser', C.dark), { x: ex - 0.18, y: ey - 0.18, w: 0.36, h: 0.36, name: '!!ewi' });
        s.text(t.zone ? (t.stop ? 'HALT!' : 'Einweiser') : '', { x: ex - 0.2, y: ey + 0.32, w: 1.6, h: 0.35, size: t.stop ? 18 : 13, bold: true, color: t.stop ? C.red : C.gr, name: '!!ewt' });
        // Lkw (rückwärts nach oben, Front zeigt nach unten)
        veh(s, 'truck.png', CX, t.y, 180, '!!tr', { scale: SCL });
        s.oval(mx - 0.06, my - 0.06, 0.12, 0.12, { fill: C.gr, name: '!!spiegel' });
        // Rückfahr-Pfeil
        arrow(s, CX - 1.25, t.y + 0.5, CX - 1.25, t.y - 0.5, { col: C.mut, th: 0.06, head: 0.2, name: 'rp', hide: !!t.stop });
      },
    });
  }
  {
    const s = base(deck, 'c8s', { notes:
      '▶ Sagen: „Was gehört zur Schutzausrüstung, wenn ihr am Lkw arbeitet?“\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Warnweste: § 53a Abs. 2 Nr. 3 StVZO (mitführen); beim Aussteigen auf der Fahrbahn anziehen (Prüfungsfrage 2.2.15-201). DGUV Vorschrift 70 § 56 Abs. 5: Bei Arbeiten am Fahrzeug im fließenden Verkehr (z. B. Radwechsel) muss Warnkleidung getragen werden. § 31: Der Unternehmer rüstet jedes Fahrzeug damit aus. Auf dem Betriebshof gilt die Betriebsanweisung.\n' +
      '✅ Schuhe: DGUV Vorschrift 70 § 44 Abs. 2 – beim Fahren den Fuß umschließende Schuhe, keine Clogs, keine Sandalen ohne Fersenriemen. BG Verkehr G12: Schuhe fest und rutschfest. Sicherheitsschuhe und Handschuhe beim Be- und Entladen: nach der Gefährdungsbeurteilung des Unternehmers (BG Verkehr). Sicherheitsgurt: § 21a StVO – auch im Lkw anlegen. Ausnahmen nur bei Haus-zu-Haus-Auslieferung mit häufigem Aussteigen und bei Schrittgeschwindigkeit, z. B. beim Rückwärtsfahren (§ 21a Abs. 1 Satz 2 Nr. 2 und 3).\n' +
      '➜ „Fassen wir C8 zusammen.“' });
    kick(s, 'Arbeitssicherheit'); title(s, 'Schutz für euch selbst');
    await point(s, 0.7, 2.05, 5.85, 2.0, 'LuShirt', 'D7F000', 'Warnweste', 'vor dem Aussteigen auf der Straße anziehen – bei Arbeiten am Lkw im Verkehr ist sie Pflicht.', CLICK, { br: true, size: 18 });
    await point(s, 6.78, 2.05, 5.85, 2.0, 'LuFootprints', C.or, 'Schuhe', 'beim Fahren fest und geschlossen – beim Be- und Entladen Sicherheitsschuhe mit Zehenschutz.', CLICK, { br: true, size: 18 });
    await point(s, 0.7, 4.25, 5.85, 2.0, 'LuHand', C.bl, 'Handschuhe', 'beim Arbeiten mit Spanngurten, Planen und Ketten.', CLICK, { br: true, size: 18 });
    await pointBild(s, 6.78, 4.25, 5.85, 2.0, await svgImg(gurtSvg('#' + C.dark, '#' + C.gr), 512, 512, 0.5), C.gr, 'Sicherheitsgurt', 'auch im Lkw. Bei einem Unfall hält er euch im Sitz.');
  }

  // ===== ABSCHLUSS C8 =====
  write(deck, 'c8e', {
    ttl: 'Ausrüstung, Beförderung, Sicherheit', labelW: 3.3, size: 16,
    rows: [
      ['Über 3,5 t an Bord', 'Warndreieck + Warnleuchte, Warnweste, Verbandkasten'],
      ['Unterlegkeile', 'über 4 t einer, ab 3 Achsen zwei – talseitig vor ein Hinterrad'],
      ['Panne', 'Warnblinklicht, Weste, Dreieck bei schnellem Verkehr ca. 100 m'],
      ['Maße', '2,55 m breit (Kühlaufbau 2,60 m) · 4 m hoch · 12 m lang'],
      ['Gewicht', '2 Achsen 18 t · 3 Achsen 25 / 26 t · 4 Achsen 32 t'],
      ['Ladung hinten', 'höchstens 1,50 m (bis 100\u00A0km 3 m) · mehr als 1 m über die Rückstrahler: hellrote Fahne'],
      ['Überladung', 'Fahrer und Halter zahlen – Polizei kann Ab- oder Umladen verlangen'],
      ['Rückwärts', 'Einweiser im Blickfeld – nie zwischen Lkw und Hindernis'],
    ],
    notes: '▶ Sagen: „Schreibt euch diese acht Punkte auf.“\n❓ Vor jedem Klick fragen: „Was gehört hierhin?“\n🖱 Klick 1–8: je eine Antwort.\n✅ Zusammenfassung von C8 (Quellen auf den Folien davor).\n➜ „Drei Prüfungsfragen.“',
  });
  quiz(deck, 'c8e', {
    kicker: 'Quiz C8 · 1', q: 'Was ist zu tun, um einen zweiachsigen Lkw in starkem Gefälle gegen Wegrollen zu sichern?', size: 30,
    opts: ['Feststellbremse anziehen', 'Unterlegkeil vor ein Hinterrad legen', 'Dauerbremse betätigen'], ok: [0, 1],
    why: 'Feststellbremse und Unterlegkeil. Die Dauerbremse hält den Lkw nicht fest (Prüfungsfrage 2.2.23-201).',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n💡 Gemeinsam besprechen – keine Prüfungsbögen ausfüllen lassen (§ 4 Abs. 1a FahrschAusbO).\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und B.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c8e', {
    kicker: 'Quiz C8 · 2', q: 'Eine nach hinten hinausragende Ladung muss kenntlich gemacht werden. Welche Mittel sind bei Tage zulässig?', size: 28,
    opts: ['Eine hellrote, mindestens 30 × 30 cm große Fahne, die durch eine Querstange auseinandergehalten wird', 'Eine orangefarbene Warntafel', 'Ein mindestens 30 × 30 cm großes, hellrotes, quer zur Fahrtrichtung pendelnd aufgehängtes Schild'], ok: [0, 2],
    why: 'Fahne mit Querstange oder pendelndes Schild – die orangefarbene Tafel ist für Gefahrgut (Prüfungsfrage 2.7.09-204, § 22 Abs. 4 StVO).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und C.\n➜ „Letzte Frage.“',
  });
  quiz(deck, 'c8e', {
    kicker: 'Quiz C8 · 3', q: 'Wie kann die Überladung eines Lastkraftwagens festgestellt werden?', size: 32,
    opts: ['Durch Nachwiegen des beladenen Fahrzeugs', 'Durch eine Bremsprobe mit dem beladenen Fahrzeug', 'Durch eingebaute Achslastmessgeräte'], ok: [0, 2],
    why: 'Nur die Waage oder eingebaute Achslastmesser zeigen das Gewicht. Eine Bremsprobe sagt darüber nichts (Prüfungsfrage 2.2.22-203).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und C.\n➜ „Das nehmt ihr aus C8 mit.“',
  });
  await takeaway(deck, 'c8e', {
    items: [
      ['LuTriangleAlert', 'Über 3,5 t an Bord:', 'Warndreieck, Warnleuchte, Warnweste, Verbandkasten – über 4 t Unterlegkeil.'],
      ['LuSiren', 'Panne:', 'Warnblinklicht, Weste an, Warndreieck bei schnellem Verkehr etwa 100 m dahinter.'],
      ['LuRuler', 'Maße:', '2,55 m breit, 4 m hoch, 12 m lang – und die Achslasten zählen genauso wie das Gesamtgewicht.'],
      ['LuFlag', 'Ladung mehr als 1 m hinter den Rückstrahlern:', 'hellrote Fahne oder Schild – höchstens 1,50 m, bis 100\u00A0km Fahrt 3 m.'],
      ['LuHardHat', 'Schützt euch selbst:', 'drei Punkte beim Aussteigen, Einweiser im Blickfeld, Schutzkleidung.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C8, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Damit sind wir für heute durch.“',
  });
  // ===== ENDE =====
  {
    const s = base(deck, 'c8e', { bg: 'i_titel.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 4 – Kräfte, Ausrüstung, Gewichte und Sicherheit. Beim nächsten Mal: C9 – Ladung richtig sichern und die Abfahrtkontrolle – und C10 – wirtschaftlich und umweltschonend fahren und die Strecke planen. Danke fürs Mitmachen, kommt gut nach Hause.“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen.\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.5, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Gute Heimfahrt!', { x: 0.7, y: 2.4, w: 6.5, h: 1.2, size: 54, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900 });
    s.text('Abend 4 geschafft: C7 + C8', { x: 0.7, y: 3.65, w: 6.5, h: 0.6, size: 22, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Nächstes Mal:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'C9  Ladungssicherung und Abfahrtkontrolle', options: { color: C.txt, breakLine: true } }, { text: 'C10  Wirtschaftlich fahren, Streckenplanung', options: { color: C.txt } }], { x: 0.7, y: 4.6, w: 6.3, h: 1.4, size: 20 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
