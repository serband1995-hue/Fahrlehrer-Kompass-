// Abend 5 · C10: Kapitel 2 Fahrzeug und Wartung, Kapitel 3 Umwelt, Antriebe, Maut
const { C, sec, chapter, motion, steps, ask, quiz, lkw, seg, arrow, svgImg } = require('../gs');
const { icon } = require('../lib');

sec('c10w', 'C10  ·  FAHRZEUG UND WARTUNG', C.bl, 'bg_blue.jpg');
sec('c10u', 'C10  ·  UMWELT, ANTRIEBE, MAUT', 'C9A227', 'bg_am.jpg');

// glatte Linie durch Punkte (Catmull-Rom → Bézier), Koordinaten in Zoll, Bild beginnt bei (OX, OY)
const OX = 5.75, OY = 1.5;
function smooth(pts, col, w = 4, dash = '') {
  const P = pts.map(([x, y]) => [(x - OX) * 100, (y - OY) * 100]);
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
}

module.exports = async (deck) => {
  await chapter(deck, 'c10w', { num: 2, ttl: 'Fahrzeug und Wartung', sub: 'Ein gut eingestellter, gut gewarteter Lkw braucht weniger Diesel.', ico: 'LuWrench', notes:
    '▶ Sagen: „Kapitel 2: Was am Lkw selbst Diesel spart – noch bevor ihr losfahrt.“\n🖱 Keine Klicks.\n➜ „Zuerst: der Dachspoiler.“' });

  // ===== DACHSPOILER (fließend) =====
  {
    const X = 6.55, GY = 5.35, K = 1.15, F = 0.75, ROOF = GY - (F + 1.12) * K, TOP = GY - (F + 1.5) * K;
    const PX = X + 0.5 * K, EX = X + 1.37 * K;
    const bad = [
      smooth([[5.8, 3.62], [6.05, 3.6], [6.35, 3.4], [6.62, ROOF - 0.1], [7.1, ROOF - 0.12], [7.6, ROOF - 0.13], [7.95, ROOF - 0.14], [8.12, ROOF - 0.25], [8.05, ROOF - 0.4], [7.88, ROOF - 0.36], [7.86, ROOF - 0.22], [7.98, ROOF - 0.2]], '#FF5C5C', 5),
      smooth([[5.8, 3.22], [6.3, 3.17], [6.75, 2.98], [7.6, 2.82], [8.0, 2.62], [8.3, TOP - 0.28], [8.8, TOP - 0.32], [9.6, TOP - 0.22], [13.0, TOP - 0.18]], '#A9B6C6', 4),
      smooth([[5.8, 2.75], [7.0, 2.7], [7.9, 2.48], [8.6, TOP - 0.52], [10.0, TOP - 0.46], [13.0, TOP - 0.44]], '#738296', 3),
    ].join('');
    const good = [
      smooth([[5.8, 3.62], [6.05, 3.6], [6.35, 3.4], [6.62, ROOF - 0.1], [7.1, ROOF - 0.15], [8.2, TOP - 0.06], [8.6, TOP - 0.07], [13.0, TOP - 0.08]], '#38D98A', 5),
      smooth([[5.8, 3.25], [6.3, 3.2], [6.75, 3.0], [7.35, ROOF - 0.38], [8.25, TOP - 0.3], [8.8, TOP - 0.3], [13.0, TOP - 0.3]], '#A9B6C6', 4),
      smooth([[5.8, 2.85], [6.8, 2.8], [7.45, ROOF - 0.62], [8.3, TOP - 0.52], [9.0, TOP - 0.52], [13.0, TOP - 0.52]], '#738296', 3),
    ].join('');
    const W = (13.05 - OX) * 100, Hh = (5.0 - OY) * 100;
    const imgBad = await svgImg(bad, W, Hh, 2), imgGood = await svgImg(good, W, Hh, 2);
    const fr = (ey, ok, o = {}) => ({ ...o, t: { ey, ok, ...(o.t || {}) } });
    await motion(deck, 'c10w', {
      kicker: 'Luftleitteile', ttl: 'Den Dachspoiler einstellen', dur: 500, holdDur: 650,
      question: 'Der Aufbau ist höher als das Fahrerhaus. Was passiert mit dem Fahrtwind – und was hilft?',
      answer: 'Ohne passenden Spoiler prallt die Luft auf den Aufbau. Spoiler auf Aufbauhöhe einstellen – die Luft strömt glatt darüber.',
      legend: 'Seitenansicht · schematisch · Linien = Fahrtwind',
      frames: [
        fr(ROOF - 0.07, 0, { hold: true, cap: 'Der Spoiler liegt flach. Der Fahrtwind prallt gegen die Vorderkante des Aufbaus und wirbelt.', note: '▶ Sagen: „Der Aufbau ist höher als das Fahrerhaus. Der Dachspoiler liegt flach. Was passiert mit dem Fahrtwind?“\n❓ Frage auf der Folie stellen.\n🖱 Klick: Der Spoiler wird hochgestellt (läuft von selbst).\n➜ „Stellen wir den Spoiler hoch.“' }),
        fr(ROOF - 0.2, 0, { cap: 'Der Spoiler wird hochgestellt …' }),
        fr(TOP + 0.12, 1),
        fr(TOP, 1, { hold: true, answer: true, cap: 'Spoiler auf Aufbauhöhe: Die Luft strömt glatt über den Aufbau. Das spart Diesel – vor allem auf der Autobahn.', note: '▶ „Jetzt steht der Spoiler genau auf Höhe des Aufbaus. Die Luft strömt glatt darüber – weniger Luftwiderstand, weniger Diesel. Wichtig: Nach einem Aufbau- oder Anhängerwechsel neu einstellen!“\n✅ Prüfungsfrage 2.5.01-015: Den Kraftstoffverbrauch verringern Luftleiteinrichtungen, vorausschauende Fahrweise und spezielle Reifen (alle drei richtig). Dachspoiler auf Aufbauhöhe einstellen, Seitenverkleidungen, Plane straff (Lehrbuchwissen).\n💡 Zu hoch eingestellt ist auch schlecht: Dann bietet der Spoiler selbst Angriffsfläche.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Was spart noch am Fahrzeug?“' }),
      ],
      scene: async (s, { ey, ok }) => {
        s.rect(5.75, GY, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
        await lkw(s, { L: 5.6, axles: [0.78, 4.05] }, { x: X, gy: GY, k: K, name: '!!lkwS' });
        s.img(ok ? imgGood : imgBad, { x: OX, y: OY, w: 13.05 - OX, h: 5.0 - OY, name: '!!flow' });
        seg(s, PX, ROOF - 0.01, EX, ey, { col: 'F3F5F8', th: 0.09, rr: 0.3, line: '738296', lw: 1, name: '!!spoiler' });
        s.text('Fahrtwind →', { x: 5.8, y: 2.05, w: 1.8, h: 0.3, size: 12, color: C.dim, name: '!!fw' });
        s.text(ok ? 'Luft strömt glatt darüber' : 'Luft prallt auf – Wirbel!', { x: 8.6, y: 1.45, w: 4.45, h: 0.42, size: 18, bold: true, color: ok ? C.gr : C.red, align: 'right', name: '!!st' });
      },
    });
  }

  // ===== WAS SPART AM FAHRZEUG? =====
  await ask(deck, 'c10w', {
    kicker: 'Fahrzeug', q: 'Was spart am Lkw selbst Diesel?', ico: 'LuWrench', qsize: 34,
    answers: [
      ['LuCircleDot', 'Richtiger Reifendruck', 'Zu wenig Druck: Der Reifen wird heiß, der Lkw instabil – und braucht mehr Diesel. Der Druck steht in der Betriebsanleitung.', C.bl, 17],
      ['LuWind', 'Luftleitteile', 'Dachspoiler auf Aufbauhöhe, Seitenverkleidungen, Plane straff, Bordwände zu.', C.bl, 17],
      ['LuWeight', 'Kein unnötiges Gewicht', 'Wasser im Aufbau, Schnee und Eis auf dem Dach, Kram im Fahrzeug – alles fährt mit.', C.bl, 17],
      ['LuFilter', 'Wartung', 'Luftfilter wechseln, Spur und Reifenverschleiß prüfen. Ein gewarteter Motor braucht weniger.', C.bl, 17],
    ],
    notes:
      '▶ Sagen: „Was spart am Lkw selbst Diesel?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Prüfungsfragen 2.7.05-205 (zu niedriger Reifendruck: Überhitzung, weniger Fahrstabilität, höherer Kraftstoffverbrauch), 2.7.05-216 (Reifendruck steht in der Betriebsanleitung), 2.5.01-015 (Luftleiteinrichtungen, spezielle Reifen), 2.7.08-201 (Luftfilter), 2.7.08-202 (einseitig abgefahrene Reifen: Spur/Sturz oder Stoßdämpfer prüfen).\n' +
      '➜ „Eine Prüfungsfrage zum Luftfilter.“',
  });
  await quiz(deck, 'c10w', {
    kicker: 'Prüfungsfrage 2.7.08-201', q: 'Welche Folgen hat ein Verzicht auf den regelmäßigen Luftfilterwechsel für den Motor?', size: 30,
    opts: ['Der Schadstoffanteil in den Abgasen kann sich erhöhen', 'Der Kraftstoffverbrauch kann sich erhöhen', 'Die Leistung des Motors kann abnehmen'], ok: [0, 1, 2],
    why: 'Alle drei! Ein verstopfter Filter lässt zu wenig Luft in den Motor.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.08-201: alle drei richtig.\n➜ „Kapitel 3: Umwelt, Antriebe und Maut.“',
  });

  // ===== KAPITEL 3 =====
  await chapter(deck, 'c10u', { num: 3, ttl: 'Umwelt, Antriebe, Maut', sub: 'Was ein Liter Diesel anrichtet – und welche Lkw heute schon anders fahren.', ico: 'LuEarth', notes:
    '▶ Sagen: „Kapitel 3: Umwelt. Wie viel CO₂ macht ein Lkw? Welche Antriebe gibt es? Und was kostet die Maut?“\n🖱 Keine Klicks.\n➜ „Fangen wir mit einem Liter Diesel an.“' });

  // ===== CO₂ (Morph) =====
  {
    const ST = [
      { l1: '1 Liter Diesel', l2: 'wiegt etwa 0,83 kg', r1: '? kg', r2: 'CO₂', sc: 0.9 },
      { l1: '1 Liter Diesel', l2: 'wiegt etwa 0,83 kg', r1: '2,65 kg', r2: 'CO₂', sc: 1.15 },
      { l1: '100 km', l2: 'Sattelzug, etwa 30 Liter', r1: '≈ 80 kg', r2: 'CO₂', sc: 1.45 },
      { l1: '1 Jahr', l2: '100.000 km = 30.000 Liter', r1: '≈ 80 t', r2: 'CO₂', sc: 1.8 },
    ];
    await steps(deck, 'c10u', {
      kicker: 'CO₂', ttl: 'Was aus einem Liter wird',
      list: ['Schätzen', '1 Liter', '100 Kilometer', '1 Jahr'],
      ask: { q: '1 Liter Diesel wiegt 0,83 kg. Wie viel CO₂ entsteht beim Verbrennen?', a: 'Rund 2,65 kg – mehr als dreimal so viel! Der Kohlenstoff verbindet sich mit Sauerstoff aus der Luft.', at: 1 },
      caps: [
        'Ein Liter Diesel wiegt etwa 0,83 kg. Wie schwer ist das CO₂, das daraus entsteht?',
        'Rund 2,65 kg CO₂ aus einem Liter Diesel. Der Sauerstoff aus der Luft macht es schwerer.',
        'Ein Sattelzug braucht etwa 30 Liter auf 100 km – das sind rund 80 kg CO₂.',
        'Im Jahr mit 100.000 km: 30.000 Liter Diesel, rund 80 Tonnen CO₂. Wer 5 % spart, spart 1.500 Liter und 4 Tonnen CO₂.',
      ],
      notes: [
        '▶ Sagen: „Ein Liter Diesel wiegt etwa 0,83 Kilo. Wie viel CO₂ entsteht, wenn er verbrennt?“\n❓ Frage auf der Folie stellen – schätzen lassen.\n➜ „Die Auflösung.“',
        '▶ „Rund 2,65 Kilo CO₂ – mehr als dreimal so viel, wie der Diesel wiegt. Der Kohlenstoff im Diesel verbindet sich mit dem Sauerstoff aus der Luft.“\n✅ Eigene Rechnung aus dem UBA-Emissionsfaktor Diesel (74,0 t CO₂/TJ, Heizwert ca. 43 MJ/kg, Dichte ca. 0,83 kg/l) ≈ 2,65 kg CO₂ je Liter (Literaturwerte 2,62–2,67).\n➜ „Und auf 100 Kilometer?“',
        '▶ „Ein Sattelzug braucht im Fernverkehr etwa 30 Liter auf 100 Kilometer. Das sind rund 80 Kilo CO₂.“\n✅ Richtwert 25–35 l/100 km (Sekundärquellen); 30 × 2,65 ≈ 80 kg.\n➜ „Und im Jahr?“',
        '▶ „Im Jahr, bei 100.000 Kilometern: 30.000 Liter Diesel und rund 80 Tonnen CO₂. Wer durch gutes Fahren nur 5 Prozent spart, spart 1.500 Liter Diesel – und 4 Tonnen CO₂.“\n✅ Eigene Rechnung. Prüfungsfrage 2.5.01-016: Hohe Geschwindigkeit erhöht Verbrauch und Schadstoffausstoß.\n💡 Tempo kostet: Der Luftwiderstand wächst mit dem Quadrat der Geschwindigkeit. 85 statt 80 km/h: rund 13 % mehr Luftwiderstand – auf 100 km aber nur gut 4 Minuten schneller (eigene Rechnung: (85/80)² ≈ 1,13; 75,0 statt 70,6 Minuten).\n➜ „Neben CO₂ gibt es noch etwas, das stört: Lärm.“',
      ],
      legend: 'Richtwerte · CO₂ je Liter: eigene Rechnung nach Umweltbundesamt',
      scene: async (s, i) => {
        const t = ST[i];
        s.rrect(5.85, 2.3, 3.1, 3.3, { fill: C.card, line: C.line, rr: 0.1, name: '!!lc' });
        s.img(await icon('LuFuel', C.or), { x: 6.85, y: 2.55, w: 1.1, h: 1.1, name: '!!li' });
        s.text(t.l1, { x: 5.95, y: 3.85, w: 2.9, h: 0.6, size: 24, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!cl1' });
        s.text(t.l2, { x: 5.95, y: 4.45, w: 2.9, h: 0.8, size: 15, color: C.mut, align: 'center', valign: 'middle', name: '!!cl2' });
        arrow(s, 9.15, 3.95, 9.95, 3.95, { col: C.am, th: 0.1, head: 0.28, name: 'pf' });
        const d = 1.55 * t.sc, cx = 11.55, cy = 3.35;
        s.img(await icon('LuCloud', '8A95A6'), { x: cx - d / 2, y: cy - d / 2, w: d, h: d, name: '!!wolke' });
        s.text(t.r1, { x: 10.1, y: 4.25, w: 2.9, h: 0.75, size: i ? 34 : 30, bold: true, color: i ? C.am : C.dim, align: 'center', valign: 'middle', name: '!!r1' });
        s.text(t.r2, { x: 10.1, y: 4.95, w: 2.9, h: 0.4, size: 16, bold: true, color: C.mut, align: 'center', name: '!!r2' });
        s.text(i === 3 ? '5 % gespart = 1.500 l Diesel und 4 t CO₂ weniger' : '', { x: 5.85, y: 5.85, w: 7.2, h: 0.45, size: 18, bold: true, color: C.gr, align: 'center', valign: 'middle', name: '!!spar' });
      },
    });
  }

  // ===== LÄRM =====
  await ask(deck, 'c10u', {
    kicker: 'Lärm', q: 'Ein Lkw ist laut. Wie vermeidet ihr unnötigen Lärm?', ico: 'LuVolumeX', qsize: 32,
    answers: [
      ['LuLink', 'Ketten und Gurte verstauen', 'Lose Spannketten und klappernde Ladung machen Lärm – Ladung, die Lärm macht: 10 € Bußgeld.', 'C9A227', 17],
      ['LuDoorClosed', 'Bordwände in Ordnung halten', 'Ausgeschlagene Scharniere und Verschlüsse austauschen.', 'C9A227', 17],
      ['LuGauge', 'Druckluft von außen', 'Leere Druckluftbehälter möglichst an einer stationären Anlage füllen – nicht mit dem Motor im Stand.', 'C9A227', 17],
      ['LuBellOff', 'Kein unnötiger Krach', 'Nicht zur Begrüßung hupen, Türen nicht zuknallen, Motor nicht unnötig laufen lassen.', 'C9A227', 17],
    ],
    notes:
      '▶ Sagen: „Ein Lkw ist laut – gerade nachts beim Ausliefern. Was könnt ihr tun?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Prüfungsfragen 2.5.01-202/-203 (Bordwandscharniere, Spannketten, lose Ladung), 2.5.01-206 (Druckluft aus stationärer Anlage, Bordwandverschlüsse austauschen; Motor bei Wartezeiten laufen lassen = falsch), 2.5.01-212 (Hupen zur Begrüßung, Türen zuknallen). § 22 Abs. 1 StVO: Ladung darf keinen vermeidbaren Lärm erzeugen; BKat Nr. 103: 10 €.\n' +
      '➜ „Und welche Antriebe gibt es außer Diesel?“',
  });

  // ===== ANTRIEBE (Morph) =====
  {
    const A = [
      ['LuDroplet', C.gr, 'HVO100', 'Diesel, meist aus Rest- und Abfallstoffen', 'Seit Ende Mai 2024 an Tankstellen erlaubt. Nur tanken, wenn der Hersteller euren Lkw dafür freigegeben hat.'],
      ['LuSnowflake', C.bl, 'Erdgas (LNG/CNG)', 'tiefkalt verflüssigt oder verdichtet', 'LNG im isolierten Tank, CNG in Druckflaschen – auch als Bio-Gas. Die Mautbefreiung für Gas-Lkw lief Ende 2023 aus.'],
      ['LuBatteryCharging', C.am, 'Batterie-elektrisch', 'Strom aus der Batterie', 'Kein Abgas, sehr leise, Bremsenergie wird zurückgewonnen. Reichweite und Laden planen – am besten in der Pause laden.'],
      ['LuAtom', C.pu, 'Wasserstoff', 'Brennstoffzelle macht Strom an Bord', 'Aus dem Auspuff kommt nur Wasserdampf. Es gibt noch wenige Tankstellen – Tankstopps genau planen.'],
    ];
    await steps(deck, 'c10u', {
      kicker: 'Antriebe', ttl: 'Nicht nur Diesel',
      list: ['HVO100', 'Erdgas (LNG/CNG)', 'Batterie-elektrisch', 'Wasserstoff'],
      ask: { q: 'Welcher Antrieb ist auf deutschen Autobahnen zurzeit mautfrei?', a: 'Emissionsfrei – mit Batterie oder Wasserstoff. Mautfrei bis zum 30. Juni 2031.', at: 3 },
      caps: [
        'HVO100 ist Diesel aus hydriertem Pflanzenöl, meist aus Rest- und Abfallstoffen. Nur tanken mit Freigabe des Herstellers.',
        'Erdgas-Lkw tanken meist tiefkalt verflüssigtes Gas (LNG), manche verdichtetes Gas (CNG). Sie zahlen inzwischen wieder Maut.',
        'Batterie-Lkw fahren ohne Abgas und sehr leise. Reichweite und Ladestopps müssen geplant werden.',
        'Wasserstoff-Lkw machen mit der Brennstoffzelle Strom an Bord. Batterie- und Wasserstoff-Lkw sind bis 30.06.2031 mautfrei.',
      ],
      notes: [
        '▶ Sagen: „Diesel ist nicht mehr alles. Erstens: HVO100 – Diesel aus hydriertem Pflanzenöl, meist aus Rest- und Abfallstoffen wie altem Speiseöl. Er darf seit Ende Mai 2024 an Tankstellen verkauft werden. Aber: Nur tanken, wenn der Hersteller euren Lkw freigegeben hat!“\n✅ Zweite Verordnung zur Änderung der 10. BImSchV vom 28.05.2024 (BGBl. 2024 I Nr. 169), in Kraft seit 29.05.2024: paraffinischer Diesel nach DIN EN 15940 (z. B. HVO100) an öffentlichen Tankstellen zulässig (§ 4 Abs. 3 10. BImSchV).\n➜ „Zweitens: Gas.“',
        '▶ „Erdgas-Lkw tanken meist LNG – tiefkalt verflüssigtes Erdgas. Manche, vor allem im Verteilerverkehr, tanken CNG – verdichtetes Erdgas. Beides gibt es auch als Bio-Gas. Die Mautbefreiung für Gas-Lkw galt nur von 2019 bis Ende 2023.“\n✅ § 1 Abs. 2 Nr. 8 BFStrMG: Befreiung für Gas-Lkw (CNG, LNG oder Zweistoffmotor LNG/Diesel) nur 01.01.2019–31.12.2023.\n➜ „Drittens: Strom.“',
        '▶ „Batterie-Lkw: kein Abgas, sehr leise. Beim Bremsen wird Energie zurückgewonnen. Aber: Reichweite und Ladestopps müssen geplant werden – am besten lädt man in der Pause.“\n💡 Anstecken und Abstecken gehören nicht zur Pause – nur die freie Zeit dazwischen.\n✅ Art. 4 Buchst. d VO (EG) 561/2006: Eine Fahrtunterbrechung dient ausschließlich der Erholung, keine anderen Arbeiten. Eine amtliche Auslegung zum Laden von E-Lkw gibt es bisher nicht. Rekuperation: Lehrbuchwissen. Batterie mindert die Nutzlast.\n➜ „Und viertens?“',
        '▶ „Wasserstoff: Die Brennstoffzelle macht an Bord Strom – aus dem Auspuff kommt nur Wasserdampf. Problem: Es gibt noch wenige Tankstellen.“\n❓ Frage auf der Folie auflösen.\n✅ § 1 Abs. 2 Nr. 7 BFStrMG: emissionsfreie schwere Nutzfahrzeuge mautfrei bis 30.06.2031; Nr. 9: bis 4,25 t dauerhaft (Viertes Gesetz zur Änderung mautrechtlicher Vorschriften, Dezember 2025). Die alte Regel „nur bis Ende 2025“ ist überholt.\n➜ „Was zahlt dann ein Diesel-Lkw an Maut?“',
      ],
      legend: 'Stand der Recherche: Oktober 2026',
      scene: async (s, i) => {
        let y = 1.7;
        for (let q = 0; q < 4; q++) {
          const on = q === i, h = on ? 1.6 : 0.68, [ic, col, name, sub, det] = A[q];   // aufgeklappt nur so hoch wie der Text
          s.rrect(5.75, y, 7.3, h, { fill: on ? C.card2 : C.card, line: on ? col : C.line, lw: on ? 2 : 1, rr: 0.1, name: '!!ab' + q });
          s.oval(5.95, y + 0.1, 0.48, 0.48, { fill: on ? col : '2A3342', line: on ? col : '2A3342', name: '!!ao' + q });
          s.img(await icon(ic, on ? C.dark : C.mut), { x: 6.06, y: y + 0.21, w: 0.26, h: 0.26, name: '!!ai' + q });
          s.text([{ text: name + '  ', options: { bold: true, color: on ? C.txt : C.mut } }, { text: sub, options: { color: on ? col : C.dim } }], { x: 6.6, y: y + 0.08, w: 6.3, h: 0.52, size: on ? 20 : 16, valign: 'middle', name: '!!at' + q });
          s.text(on ? det : '', { x: 6.6, y: y + 0.66, w: 6.25, h: on ? 0.86 : 0.05, size: 16, color: C.txt, valign: 'top', name: '!!ad' + q });
          y += h + 0.14;
        }
      },
    });
  }

  // ===== MAUT-RECHNER (fließend) =====
  {
    const B = [['Infrastruktur', 15.5, '5B7BA6'], ['Luftverschmutzung', 2.3, '8A95A6'], ['Lärm', 1.2, 'A9B6C6'], ['CO₂', 15.8, 'C9A227']];
    const LY = [5.27, 4.36, 4.0, 2.97], BASE = 6.25, SC = 0.12, BX = 11.0, BW = 1.35;
    const fr = (n, o = {}) => ({ ...o, t: { n, ...(o.t || {}) } });
    await motion(deck, 'c10u', {
      kicker: 'Lkw-Maut', ttl: 'Was kostet ein Kilometer?', dur: 480, holdDur: 650,
      question: 'Ein 40-t-Sattelzug fährt von Hannover nach München – rund 630 km Autobahn. Was kostet die Maut?',
      answer: 'Rund 35 Cent pro Kilometer – also etwa 219 € für die Strecke. Ein E-Lkw zahlt zurzeit nichts.',
      legend: 'Mautsätze nach BFStrMG Anlage 1 · Euro VI, über 18 t, ab 5 Achsen, CO₂-Klasse 1',
      frames: [
        fr(0, { hold: true, cap: 'Maut zahlen grundsätzlich alle Lkw im Güterverkehr über 3,5 t – auf Autobahnen und Bundesstraßen. Der Preis pro Kilometer hat vier Teile.', note: '▶ Sagen: „Maut zahlen grundsätzlich alle Lkw im Güterverkehr über 3,5 Tonnen technisch zulässiger Gesamtmasse – auf Autobahnen und Bundesstraßen. Was kostet ein Kilometer für einen 40-Tonner? Den fahrt ihr später mit CE.“\n❓ Frage auf der Folie stellen – schätzen lassen.\n✅ § 1 Abs. 1 BFStrMG: Mautpflicht auf Bundesautobahnen und Bundesstraßen für Kfz über 3,5 t technisch zulässige Gesamtmasse (Güterkraftverkehr). § 3 Abs. 1: Mautsatz = Infrastruktur + Luftverschmutzung + Lärm + CO₂.\n🖱 Klick: Die Teile stapeln sich (läuft von selbst).\n➜ „Rechnen wir zusammen.“' }),
        fr(1, { cap: 'Infrastruktur: für Bau und Erhalt der Straßen.' }), fr(2, { cap: 'Luftverschmutzung …' }), fr(3, { cap: '… und Lärm.' }),
        fr(4, { hold: true, cap: 'Dazu seit Dezember 2023 ein CO₂-Teil. Er hängt davon ab, wie viel CO₂ der Lkw ausstößt.', note: '▶ „Und seit Dezember 2023 kommt ein CO₂-Teil dazu – fast so groß wie der ganze Rest. Sparsame Lkw kommen in eine günstigere CO₂-Klasse.“\n✅ BFStrMG Anlage 1: CO₂-Klassen 1 bis 5 (1 = Standard, 5 = emissionsfrei). Rechenbeispiel Euro VI, über 18 t, ab 5 Achsen, CO₂-Klasse 1: 15,5 + 2,3 + 1,2 + 15,8 = 34,8 ct/km.\n🖱 Klick: das Ergebnis.\n➜ „Und für die ganze Strecke?“' }),
        fr(4, { t: { trip: 1 }, hold: true, answer: true, cap: '34,8 Cent pro Kilometer. Hannover – München, rund 630 km: etwa 219 € Maut.', note: '▶ „34,8 Cent pro Kilometer. Für rund 630 Kilometer sind das etwa 219 Euro – für eine einzige Fahrt.“\n✅ Eigene Rechnung: 630 km × 0,348 €/km ≈ 219 € (Sätze laut Toll Collect gültig seit 01.07.2024). Mautschuldner ist auch der Fahrer (§ 2 BFStrMG).\n💡 Vergleich für euren C-Lkw (3 Achsen, 26 t, Euro VI, CO₂-Klasse 1): 14,1 + 2,2 + 1,6 + 12,4 = 30,3 ct/km → rund 191 € für dieselbe Strecke.\n💡 Mautsätze können sich ändern – vor dem Unterricht kurz auf toll-collect.de prüfen.\n🖱 Klick: Und ein E-Lkw?\n➜ „Und ein Elektro-Lkw?“' }),
        fr(0, { t: { trip: 1, el: 1 }, hold: true, cap: 'Ein emissionsfreier Lkw (Batterie oder Wasserstoff) zahlt bis 30. Juni 2031 keine Maut.', note: '▶ „Ein E-Lkw zahlt auf derselben Strecke: nichts. Emissionsfreie Lkw sind bis Ende Juni 2031 mautfrei.“\n✅ § 1 Abs. 2 Nr. 7 BFStrMG: emissionsfreie schwere Nutzfahrzeuge mautfrei bis 30.06.2031.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Kapitel 4: Wie plant ihr eine Strecke?“' }),
      ],
      scene: async (s, { n, trip = 0, el = 0 }) => {
        s.rect(BX, BASE - 34.8 * SC, BW, 34.8 * SC, { line: '4A5668', lw: 1.25, dash: 'dash', name: '!!mrahmen' });   // leerer Rahmen: hier stapelt sich der Preis
        let y = BASE, sum = 0;
        for (let q = 0; q < 4; q++) {
          const on = q < n, h = on ? B[q][1] * SC : 0.02;
          y -= h; if (on) sum += B[q][1];
          s.rect(BX, y, BW, h, { fill: B[q][2], ft: on ? 0 : 100, line: on ? '0B1119' : undefined, lw: 1, name: '!!blk' + q });
          s.text(on ? B[q][0] + '  ' + String(B[q][1]).replace('.', ',') + ' ct' : '', { x: 7.9, y: LY[q] - 0.17, w: 3.0, h: 0.34, size: 14, bold: true, color: C.txt, align: 'right', valign: 'middle', name: '!!bl' + q });
        }
        s.text(el ? 'E-Lkw' : 'Diesel-Sattelzug, Euro VI', { x: 5.75, y: 1.5, w: 5.0, h: 0.45, size: 18, bold: true, color: el ? C.gr : C.mut, name: '!!fz' });
        s.text((el ? '0' : n ? String(Math.round(sum * 10) / 10).replace('.', ',') : '?') + ' ct/km', { x: 5.75, y: 1.95, w: 5.0, h: 0.9, size: 44, bold: true, color: el ? C.gr : C.am, name: '!!sum' });
        s.text(trip ? (el ? '× 630 km = 0 € – mautfrei bis 30.06.2031' : '× 630 km ≈ 219 €') : '', { x: 5.75, y: 2.85, w: 5.0, h: 0.5, size: 20, bold: true, color: C.txt, name: '!!trip' });
        s.text('Maut pro Kilometer', { x: BX - 0.4, y: BASE + 0.05, w: BW + 0.8, h: 0.3, size: 12, color: C.dim, align: 'center', name: '!!ml' });
      },
    });
  }
};
