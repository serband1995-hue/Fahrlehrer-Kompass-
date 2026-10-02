// C3 Abschluss: Mitschreiben, Quiz, Das nimmst du mit, Pause
const { C, sec, base, quiz, write, takeaway } = require('../gs');

sec('c3e', 'C3  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

module.exports = async (deck) => {
  write(deck, 'c3e', {
    ttl: 'Kraftstrang', labelW: 3.6, size: 18,
    rows: [
      ['Diesel', 'Selbstzünder: heiße, verdichtete Luft entzündet den Diesel'],
      ['AdBlue', 'eigener Tank, blauer Deckel – leer: Kriechmodus höchstens 20 km/h'],
      ['Partikelfilter', 'Standregeneration nicht über trockenem Gras, nicht in der Halle'],
      ['Leerlauf', 'Motor unnötig laufen lassen verboten (§ 30 StVO) – 80 €'],
      ['Winterdiesel', '16.11. – 28.2. (bis −20 °C), Übergang ab 1.10.'],
      ['Kupplung', 'im kleinen Gang anfahren, nicht schleifen lassen'],
      ['Differenzialsperre', 'nur bei Bedarf, im Stand einlegen, sofort wieder raus'],
      ['6 × 4', '6 Radstellen (3 Achsen), davon 4 angetrieben (2 Achsen)'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus C3.“\n❓ Vor jedem Klick fragen: „Was gehört hier hin?“\n🖱 Klick 1–8: je eine Lösung.\n✅ Quellen: Prüfungsfragen 2.7.03-201, -211 bis -215; VO (EU) 582/2011 Anhang XIII; § 30 Abs. 1 StVO, BKat Nr. 117; DIN EN 590; Herstellerangaben.\n➜ „Jetzt testen wir C3.“',
  });
  quiz(deck, 'c3e', {
    kicker: 'Quiz C3 · 1', q: 'Wann dürfen Sie die Differenzialsperre einlegen?', size: 34,
    opts: ['Wenn das Fahrzeug steht', 'Mit Schrittgeschwindigkeit', 'In einer Kurve, wenn der Lkw über die Vorderachse schiebt'], ok: [0, 1],
    why: 'Nur im Stand oder in Schrittgeschwindigkeit – und nie in Kurven (Prüfungsfrage 2.7.03-213, Betriebsanleitung).',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und B.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c3e', {
    kicker: 'Quiz C3 · 2', q: 'Ein Lkw hat die Achsformel 6 × 4. Was heißt das?', size: 34,
    opts: ['6 Räder, davon 4 Zwillingsräder', '3 Achsen, davon 2 angetrieben', '6 Gänge vorwärts, 4 rückwärts'], ok: 1,
    why: 'Erste Zahl: Radstellen (Zwillingsräder zählen als eine). Zweite Zahl: davon angetrieben. 6 Radstellen = 3 Achsen, 4 angetrieben = 2 Achsen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Und noch eine.“',
  });
  quiz(deck, 'c3e', {
    kicker: 'Quiz C3 · 3', q: 'Im Display steht: AdBlue-Tank leer. Was passiert, wenn Sie nicht nachfüllen?', size: 32,
    opts: ['Nichts – AdBlue ist nur für die Umwelt', 'Erst weniger Leistung, zuletzt höchstens 20 km/h', 'Der Motor geht sofort aus'], ok: 1,
    why: 'Das EU-Recht schreibt die Stufen vor: Warnung, Leistungsdrosselung, zuletzt Kriechmodus mit höchstens 20 km/h (VO (EU) 582/2011 Anhang XIII).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Zum Schluss von C3: Das nehmt ihr mit.“',
  });
  await takeaway(deck, 'c3e', {
    items: [
      ['LuRoute', 'Weg der Kraft:', 'Motor – Kupplung – Getriebe – Gelenkwelle – Differenzial – Räder.'],
      ['LuGauge', 'Im grünen Bereich fahren,', 'vorausschauend rollen lassen, nicht im Stand warmlaufen lassen.'],
      ['LuDroplet', 'AdBlue und Partikelfilter', 'gehören zur Abgasreinigung – nie verwechseln, nie manipulieren.'],
      ['LuSettings2', 'Kupplung schonen,', 'Automatik nach Anleitung bedienen, vor dem Gefälle zurückschalten.'],
      ['LuLock', 'Sperre nur bei Bedarf', '– im Stand rein, sofort wieder raus. ASR-Taste nur bei Tiefschnee und Ketten.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C3, die ihr auf jeden Fall wissen müsst.“\n🖱 Klick 1–5: je ein Punkt. Gern die Klasse den Satz vervollständigen lassen.\n➜ „Jetzt 15 Minuten Pause. Danach Lektion C4.“',
  });
  // ===== PAUSE =====
  {
    const s = base(deck, 'c3e', { bg: 'f_pause.jpg', ov: 8.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „15 Minuten Pause. Kurz raus, frische Luft, Wasser trinken.“\n' +
      '💡 Pausenende ansagen (z. B. 19:45 Uhr).\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Willkommen zurück. Lektion C4: Worauf rollt, federt und leuchtet ein Lkw?“' });
    s.text('PAUSE', { x: 0.7, y: 2.0, w: 6, h: 0.5, size: 18, bold: true, color: C.gr, cs: 6 }, { fx: 'fade', auto: true, dur: 600 });
    s.text('15 Minuten', { x: 0.7, y: 2.5, w: 6.5, h: 1.4, size: 72, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900, d: 200 });
    s.text('Kurz raus, frische Luft.', { x: 0.7, y: 4.0, w: 6.2, h: 0.9, size: 22, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 600 });
    s.text('Danach: Lektion C4 · Fahrwerk / Elektrische Anlagen', { x: 0.7, y: 5.4, w: 6.2, h: 0.9, size: 16, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 900 });
  }
};
