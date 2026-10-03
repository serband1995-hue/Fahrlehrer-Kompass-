// Abend 7 · CE4: Kapitel 4 Wetter und Gefälle, Kapitel 5 Tempo, Abstand, Schwertransport
const { C, sec, chapter, steps, quiz, ask, photoAsk, base, kick, title, card, CLICK, sign, svgImg } = require('../gs');
const { icon } = require('../lib');

sec('ce4w', 'CE4  ·  WETTER UND GEFÄLLE', C.gr, 'bg_gr.jpg');
sec('ce4t', 'CE4  ·  TEMPO, ABSTAND, SCHWERTRANSPORT', 'C9A227', 'bg_am.jpg');

module.exports = async (deck) => {
  // ===== KAPITEL 4: WETTER UND GEFÄLLE =====
  await chapter(deck, 'ce4w', { num: 4, ttl: 'Wetter und Gefälle', sub: 'Schnee, Nebel und Wind treffen den Zug härter als den Lkw allein.', ico: 'LuCloudSnow', notes:
    '▶ Sagen: „Bergab mit der Dauerbremse kennt ihr aus CE3. Jetzt das Wetter: Schnee, Glätte, schlechte Sicht und Wind.“\n✅ § 3, § 5, § 18 StVO; Prüfungsfragen 2.2.05-104, 2.2.23-101.\n🖱 Keine Klicks.\n➜ „Erst der Winter.“' });
  await photoAsk(deck, 'ce4w', {
    bg: 'm_winter_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Winter', q: 'Schnee und Glätte – was gilt für euren Zug?', qsize: 30, w: 5.25, asize: 15,
    answers: [
      ['LuSnowflake', 'Schneeketten', 'höchstens 50 km/h.', C.bl],
      ['LuArrowLeftToLine', 'Autobahn, über 7,5 t', 'bei Glätte nie ganz links fahren.', C.or],
      ['LuCloudFog', 'Sicht unter 50 m', '50 km/h. Über 7,5 t nicht überholen.', C.pu],
      ['LuMountainSnow', 'Dauerbremse', 'bei Glätte aus oder nur schwach.', C.gr],
    ],
    notes:
      '▶ Sagen: „Euer Zug im Winter. Was gilt?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ § 3 Abs. 4 StVO: mit Schneeketten höchstens 50 km/h (Prüfungsfrage 2.2.03-101); Zeichen 268 = Schneeketten vorgeschrieben; Ketten gehören auf die Antriebsachse (C4). § 18 Abs. 11 StVO: Lkw über 7,5 t einschließlich ihrer Anhänger dürfen bei Schneeglätte, Glatteis oder Sicht unter 50 m den äußerst linken Fahrstreifen nicht benutzen (BKat 87a: 80 €, 1 Punkt). § 3 Abs. 1 StVO: Sicht unter 50 m höchstens 50 km/h. § 5 Abs. 3a StVO: Kfz über 7,5 t Überholverbot bei Sicht unter 50 m (BKat 21: 120 €, 1 Punkt). Dauerbremse: CE3, Mercedes-Benz Actros Betriebsanleitung.\n' +
      '💡 Winterreifen bei Glätte: an Lkw über 3,5 t mindestens auf den Antriebsachsen und den vorderen Lenkachsen (§ 2 Abs. 3a StVO, siehe C4).\n' +
      '➜ „Eine Prüfungsfrage dazu.“',
  });
  await quiz(deck, 'ce4w', {
    kicker: 'Prüfungsfrage 2.2.05-104', q: 'Sie befahren die Autobahn mit einem Kraftfahrzeug, dessen zulässige Gesamtmasse 7,5 t übersteigt. Die Sichtweite beträgt aufgrund starken Schneefalls weniger als 50 m. Wie müssen Sie sich verhalten?', size: 24,
    opts: ['Ich darf den äußerst linken Fahrstreifen nicht benutzen', 'Ich darf nicht schneller als 50 km/h fahren', 'Ich muss die Autobahn an der nächsten Ausfahrt verlassen'], ok: [0, 1],
    why: 'Sicht unter 50 m heißt: höchstens 50 km/h – und über 7,5 t weg vom linken Fahrstreifen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.05-104: A und B. § 3 Abs. 1 und § 18 Abs. 11 StVO.\n➜ „Und bei Wind?“',
  });
  await ask(deck, 'ce4w', {
    kicker: 'Seitenwind', q: 'Sturm auf der Brücke: Wer ist gefährdeter – der volle oder der leere Planenzug?', ico: 'LuWind', qsize: 30,
    answers: [
      ['LuWind', 'Der leere Planenzug:', 'große Fläche, wenig Gewicht. Der Wind schiebt ihn zur Seite – im schlimmsten Fall kippt er.'],
      ['LuTriangleAlert', 'Besonders gefährlich:', 'auf Brücken, an Waldschneisen und beim Überholen von Lastzügen.'],
      ['LuMoveHorizontal', 'Erfasst euch eine Böe:', 'gegenlenken und langsamer fahren.'],
      ['LuCoffee', 'Sturmwarnung und leer?', 'Windsäcke und Warnschilder beachten. Im Zweifel Pause machen.'],
    ],
    notes:
      '▶ Sagen: „Sturm auf der Brücke. Welcher Zug ist gefährdeter – voll oder leer?“\n' +
      '❓ Abstimmen lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Prüfungsfragen 2.2.23-101 (unbeladene Anhänger mit hohen Planenaufbauten besonders seitenwindempfindlich), 2.1.03-020 (Brücken, Waldschneisen, Überholen von Lastzügen), 2.1.03-018 (gegenlenken, Geschwindigkeit herabsetzen). Kippgefahr: Lehrbuchwissen.\n' +
      '➜ „Eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce4w', {
    kicker: 'Prüfungsfrage 2.2.23-101', q: 'Was ist bei Fahrzeugen mit Planen zu beachten?', size: 34, osize: 18,
    opts: ['Die Planen dürfen die Sicht des Fahrers über die Außenspiegel nach hinten nicht behindern', 'Unbeladene Anhänger mit hohen Planenaufbauten sind gegen Seitenwind besonders empfindlich', 'Bei Fahrzeugen mit Planen kann auf eine besondere Sicherung der Ladung verzichtet werden'], ok: [0, 1],
    why: 'Eine Plane hält keine Ladung fest. Und leer ist die Plane ein Segel.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.23-101: A und B.\n➜ „Kapitel 5: Tempo, Abstand und Schwertransport.“',
  });

  // ===== KAPITEL 5: TEMPO, ABSTAND, SCHWERTRANSPORT =====
  await chapter(deck, 'ce4t', { num: 5, ttl: 'Tempo, Abstand, Schwertransport', sub: 'Mit Anhänger gelten eigene Zahlen. Und manche Transporte brauchen eine Erlaubnis und Begleitung.', ico: 'LuGauge', notes:
    '▶ Sagen: „Zum Schluss Zahlen: Wie schnell, wie viel Abstand? Und was ist ein Schwertransport?“\n✅ § 3, § 4, § 18 StVO; § 70 StVZO; § 29 Abs. 3 StVO.\n🖱 Keine Klicks.\n➜ „Wie schnell darf euer Zug?“' });
  {
    const CX = 9.4, CY = 3.95, RR = 1.75;
    const dial = await svgImg((() => {
      let g = `<circle cx="200" cy="200" r="190" fill="#0E1520" stroke="#2A3B52" stroke-width="6"/>`;
      for (let v = 0; v <= 100; v += 10) {
        const a = (-120 + v * 2.4 - 90) * Math.PI / 180, r1 = v % 20 ? 160 : 150, r0 = 176;
        g += `<line x1="${200 + r0 * Math.cos(a)}" y1="${200 + r0 * Math.sin(a)}" x2="${200 + r1 * Math.cos(a)}" y2="${200 + r1 * Math.sin(a)}" stroke="#738296" stroke-width="${v % 20 ? 3 : 6}"/>`;
        if (v % 20 === 0) g += `<text x="${200 + 125 * Math.cos(a)}" y="${200 + 125 * Math.sin(a) + 9}" font-family="Lato, sans-serif" font-size="26" fill="#A9B6C6" text-anchor="middle">${v}</text>`;
      }
      return g;
    })(), 400, 400, 2);
    const needle = await svgImg('<polygon points="96,20 104,20 108,104 92,104" fill="#FFB547"/><circle cx="100" cy="100" r="13" fill="#FFB547"/>', 200, 200, 3);
    const ST = [
      { v: 50, road: 'innerorts', sg: '274_50', note: 'Wie alle Fahrzeuge innerorts' },
      { v: 60, road: 'auf der Landstraße', sg: '274_60', note: 'Lkw über 3,5 t mit Anhänger: 60 – nicht 80!' },
      { v: 80, road: 'auf der Autobahn', sg: '274_80', note: 'Auch auf Kraftfahrstraßen mit getrennten Fahrbahnen. Begrenzer: 90 – erlaubt sind 80.' },
      { v: 50, road: 'mit Schneeketten', sg: '268', note: 'Und bei Sicht unter 50 m: ebenfalls höchstens 50.' },
    ];
    await steps(deck, 'ce4t', {
      kicker: 'Höchstgeschwindigkeit', ttl: 'Wie schnell mit dem Zug?',
      list: ['Innerorts', 'Landstraße', 'Autobahn', 'Schneeketten'],
      ask: { q: 'Wie schnell dürft ihr mit dem 40-t-Zug innerorts, auf der Landstraße und auf der Autobahn?', a: '50 – 60 – 80 km/h. Mit Schneeketten höchstens 50.', at: 2 },
      caps: [
        'Innerorts gilt für alle 50 km/h – auch für euren Zug.',
        'Landstraße: Lkw über 3,5 t mit Anhänger höchstens 60 km/h. Viele denken 80 – das ist falsch.',
        'Autobahn und Kraftfahrstraße mit getrennten Fahrbahnen: 80 km/h. Der Begrenzer regelt erst bei 90 ab.',
        'Mit Schneeketten höchstens 50 km/h. Das gilt auch bei Sicht unter 50 m.',
      ],
      notes: [
        '▶ Sagen: „Wie schnell darf euer 40-Tonnen-Zug? Innerorts?“\n❓ Frage auf der Folie stellen.\n✅ § 3 Abs. 3 Nr. 1 StVO: innerorts 50 km/h.\n➜ „Und auf der Landstraße?“',
        '▶ „Auf der Landstraße: 60 km/h für Lkw über 3,5 t mit Anhänger. Nicht 80!“\n✅ § 3 Abs. 3 Nr. 2 Buchstabe b StVO (Lkw über 3,5 t mit Anhänger: 60 km/h). Prüfungsfrage 2.2.03-108 (Lkw 5,5 t + Anhänger 2 t: 60).\n💡 Ausnahme (nicht vertiefen): Auf Straßen mit getrennten Fahrbahnen oder zwei Fahrstreifen je Richtung gilt § 3 Abs. 3 nicht – dann Beschilderung beachten.\n➜ „Und auf der Autobahn?“',
        '▶ „Autobahn: 80. Euer Begrenzer lässt 90 zu – erlaubt sind trotzdem nur 80.“\n❓ Frage auf der Folie auflösen.\n✅ § 18 Abs. 5 Nr. 1 StVO (Lkw mit Anhänger 80 km/h). Prüfungsfrage 2.2.03-301 (Lastzug 40 t: 80). § 57c StVZO (Begrenzer 90 km/h).\n➜ „Und im Winter?“',
        '▶ „Mit Schneeketten: höchstens 50. Und bei Nebel unter 50 Meter Sicht ebenfalls 50.“\n✅ § 3 Abs. 4 und Abs. 1 StVO. Prüfungsfrage 2.2.03-101.\n➜ „Und überholen?“',
      ],
      legend: 'Höchstwerte nach StVO · Schilder vor Ort haben Vorrang, wenn sie weniger erlauben',
      scene: async (s, i) => {
        const t = ST[i];
        s.img(dial, { x: CX - RR, y: CY - RR, w: 2 * RR, h: 2 * RR, name: '!!dial' });
        // 50 km/h zeigt senkrecht nach oben → Drehwinkel (v – 50) · 2,4°
        s.img(needle, { x: CX - 1.8, y: CY - 1.8, w: 3.6, h: 3.6, rotate: (t.v - 50) * 2.4, name: '!!ndl' });
        s.text(String(t.v), { x: CX - 1.0, y: CY + 0.45, w: 2.0, h: 0.8, size: 44, bold: true, color: C.or, align: 'center', name: '!!val' });
        s.text('km/h', { x: CX - 1.0, y: CY + 1.12, w: 2.0, h: 0.3, size: 13, color: C.mut, align: 'center', name: '!!unit' });
        await sign(s, t.sg, 11.75, 2.35, 1.15, 1.15, undefined, { name: '!!sg' });
        s.text(t.road, { x: 11.2, y: 3.6, w: 1.85, h: 0.6, size: 16, bold: true, color: C.txt, align: 'center', name: '!!road' });
        s.text(t.note, { x: 5.75, y: 6.0, w: 7.3, h: 0.6, size: 15, color: 'C9A227', bold: true, align: 'center', valign: 'middle', name: '!!nt' });
      },
    });
  }
  // ===== ZEICHEN 277: ZUG-SUMME =====
  {
    const s = base(deck, 'ce4t', { notes:
      '▶ Sagen: „Zeichen 277 mit Zusatz 7,5 t. Euer Lkw hat 7,49 Tonnen, der Anhänger 3,5 Tonnen. Dürft ihr überholen?“\n' +
      '❓ Abstimmen lassen.\n' +
      '🖱 Klick 1: Antwort · Klick 2: Rechnung · Klick 3: Merksatz.\n' +
      '✅ StVO Anlage 2 lfd. Nr. 53–54: Das Verbot gilt für Kfz über 3,5 t „einschließlich ihrer Anhänger“; mit Zusatzzeichen, „soweit die zulässige Gesamtmasse dieser Kraftfahrzeuge, einschließlich ihrer Anhänger, die angegebene Grenze überschreitet“. BKat 153a: 70 €, 1 Punkt.\n' +
      '💡 Auf dreistreifigen Straßen außerorts dürfen Lkw über 3,5 t und alle Kfz mit Anhänger den linken Streifen nur zum Linksabbiegen benutzen (§ 7 Abs. 3c StVO).\n' +
      '➜ „Und wie viel Abstand?“' });
    kick(s, 'Überholverbot'); title(s, 'Zeichen 277 mit „7,5 t“ – dürft ihr überholen?', { w: 11.9, size: 32 });
    await sign(s, '277', 0.9, 2.2, 1.9, 1.9);
    await sign(s, '1053_33', 0.95, 4.2, 1.8, 0.9);
    card(s, 3.3, 2.2, 9.3, 1.1, { line: C.red }, CLICK);
    s.text([{ text: 'Nein!  ', options: { bold: true, color: C.red } }, { text: 'Beim Zug zählt die Summe – Lkw und Anhänger zusammen.', options: { color: C.txt } }], { x: 3.55, y: 2.2, w: 8.9, h: 1.1, size: 22, valign: 'middle' }, { fx: 'fade', dur: 200 });
    card(s, 3.3, 3.5, 9.3, 1.1, { line: 'C9A227' }, CLICK);
    s.text([{ text: '7,49 t  +  3,5 t  =  10,99 t', options: { bold: true, color: 'C9A227' } }, { text: '   mehr als 7,5 t → Überholen verboten', options: { color: C.txt } }], { x: 3.55, y: 3.5, w: 8.9, h: 1.1, size: 22, valign: 'middle' }, { fx: 'fade', dur: 200 });
    card(s, 3.3, 4.8, 9.3, 1.1, { line: C.gr }, CLICK);
    s.text([{ text: 'Merke:  ', options: { bold: true, color: C.gr } }, { text: 'Ohne Zusatz gilt Zeichen 277 schon für alle Kfz über 3,5 t – samt Anhänger.', options: { color: C.txt } }], { x: 3.55, y: 4.8, w: 8.9, h: 1.1, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
  }
  await ask(deck, 'ce4t', {
    kicker: 'Abstand', q: 'Wie viel Abstand müsst ihr mit dem Zug halten?', ico: 'LuRuler', qsize: 32,
    answers: [
      ['LuArrowRightLeft', 'Außerorts, ein Streifen je Richtung:', 'so viel, dass ein Überholer vor euch einscheren kann. Gilt für Lkw über 3,5 t und Züge über 7 m.'],
      ['LuMilestone', 'Autobahn, über 50 km/h:', 'mindestens 50 m – Lkw über 3,5 t.'],
      ['LuTimer', 'Mit Zug lieber mehr:', 'Euer Bremsweg ist länger, und ihr seht nach vorn schlechter.'],
    ],
    notes:
      '▶ Sagen: „Zwei Abstandsregeln, die nur für schwere Fahrzeuge gelten.“\n' +
      '❓ Vor jedem Klick fragen.\n' +
      '🖱 Klick 1–3: je eine Regel.\n' +
      '✅ § 4 Abs. 2 StVO: Kfz mit besonderer Geschwindigkeitsbeschränkung und Züge über 7 m außerorts so viel Abstand, dass ein Überholer einscheren kann – nicht bei mehr als einem Fahrstreifen je Richtung, beim angekündigten Überholen und bei Überholverbot (BKat 14: 25 €). § 4 Abs. 3 StVO: Lkw über 3,5 t und Busse auf der Autobahn bei mehr als 50 km/h mindestens 50 m (BKat 15: 80 €, 1 Punkt). Prüfungsfragen 2.2.04-306, -307, -303.\n' +
      '➜ „Eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce4t', {
    kicker: 'Prüfungsfrage 2.2.04-307', q: 'Sie fahren mit einer Fahrzeugkombination außerorts auf einer Straße mit nur einem Fahrstreifen für jede Richtung. Welchen Abstand müssen Sie in der Regel zu einem vorausfahrenden Fahrzeug einhalten? Der Abstand …', size: 24, osize: 17,
    opts: ['… muss so groß sein, dass ein überholendes Fahrzeug einscheren kann', '… darf nicht größer als 10 m sein, damit der Verkehrsraum optimal ausgenutzt wird', '… muss so groß sein, dass mindestens zwei weitere Fahrzeuge einscheren können'], ok: [0],
    why: 'Ein Überholer muss vor euch Platz finden – nicht zwei, und erst recht nicht nur 10 m.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.04-307: A. § 4 Abs. 2 StVO.\n➜ „Und jetzt die ganz Großen: Schwertransport.“',
  });
  await photoAsk(deck, 'ce4t', {
    bg: 'm_schwer_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Schwertransport', q: 'Zu breit, zu lang, zu schwer – was braucht der Transport?', qsize: 28, w: 5.25, asize: 15,
    answers: [
      ['LuFileCheck', 'Ausnahmegenehmigung', 'für das Fahrzeug (§ 70 StVZO).', C.or],
      ['LuStamp', 'Erlaubnis für die Fahrt', 'mit Strecke und Auflagen (§ 29 StVO).', 'C9A227'],
      ['LuSiren', 'Oft ein Begleitfahrzeug', 'z. B. über 3,50 m Breite (nicht Autobahn).', C.bl],
      ['LuMoon', 'Bescheid mitführen', 'Auflagen einhalten, oft nur nachts.', C.pu],
    ],
    notes:
      '▶ Sagen: „Ein Transport ist breiter, länger oder schwerer als erlaubt. Was braucht er?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ § 70 StVZO: Ausnahmegenehmigung für Fahrzeuge, die von den Vorschriften über Maße und Gewichte abweichen (Urkunde mitführen). § 29 Abs. 3 StVO: Erlaubnis für den Verkehr mit Fahrzeugen und Zügen, die Abmessungen, Achslasten oder Gesamtmassen tatsächlich überschreiten. VwV-StVO zu § 29 Abs. 3, Rn. 133: Begleitfahrzeug mit nach hinten wirkender Wechselverkehrszeichen-Anlage u. a. bei Breite über 3,50 m außerhalb von Autobahnen (über 4,00 m bzw. 4,50 m auf Autobahnen). Rn. 139–143: Fahrzeiten, meist nachts. Merkblatt für Begleitfahrzeuge (BMVI 2015): BF3 (Zeichen nach hinten), BF4 (nach vorn und seitlich). BKat 116: ohne Erlaubnis 60 €, 1 Punkt.\n' +
      '💡 Ist nur die Ladung zu groß (Fahrzeug normal), braucht es eine Ausnahmegenehmigung nach § 46 Abs. 1 Nr. 5 StVO statt der Erlaubnis.\n' +
      '➜ „Eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce4t', {
    kicker: 'Prüfungsfrage 2.2.29-205', q: 'Ein Fahrzeug überschreitet die gesetzlichen Grenzwerte für Gesamtmassen und Abmessungen. Was gilt für den Betrieb dieses Fahrzeugs auf öffentlichen Straßen?', size: 28,
    opts: ['Es bedarf einer zusätzlichen Erlaubnis', 'Ein Begleitfahrzeug kann vorgeschrieben werden', 'Die Route des Fahrzeugs kann frei gewählt werden'], ok: [0, 1],
    why: 'Die Strecke steht im Bescheid – frei wählen dürft ihr sie nicht.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.29-205: A und B.\n➜ „Zum Abschluss von CE4: Mitschreiben.“',
  });
};
