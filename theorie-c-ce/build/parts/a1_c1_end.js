// C1 Abschluss: Mitschreiben, Quiz, Das nehmt ihr mit, Pause
const { C, sec, base, kick, title, quiz, write, takeaway } = require('../gs');

sec('c1e', 'C1  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

module.exports = async (deck) => {
  write(deck, 'c1e', {
    ttl: 'Fahrtenschreiber und Arbeitsplatz', labelW: 4.2,
    rows: [
      ['Fahrerkarte', 'persönlich, nur eine, höchstens 5 Jahre gültig'],
      ['Kontrolle', 'heute + die letzten 56 Tage nachweisen'],
      ['Karte weg / defekt', 'Ersatz binnen 7 Tagen beantragen, max. 15 Tage mit Ausdrucken'],
      ['Grenze', 'Land eingeben am nächsten Halteort (neues Gerät: automatisch)'],
      ['Rechtsabbiegen innerorts', 'über 3,5 t Schrittgeschwindigkeit – 70 €, 1 Punkt'],
      ['Spiegel', 'Haupt-, Weitwinkel-, Rampen-, Frontspiegel – trotzdem toter Winkel'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus Kapitel 3 und 4.“\n❓ Vor jedem Klick fragen: „Was gehört hier hin?“\n🖱 Klick 1–6: je eine Lösung.\n✅ Quellen: Art. 26, 27, 29, 34, 36 VO (EU) 165/2014; § 9 Abs. 6 StVO, BKat Nr. 45; § 56 StVZO.\n➜ „Jetzt testen wir alles aus C1.“',
  });
  quiz(deck, 'c1e', {
    kicker: 'Quiz C1 · 1', q: 'Ihr seid heute 4 Stunden gefahren, ohne Pause. Was gilt?', size: 32,
    opts: ['Ich darf noch 30 Minuten fahren, dann mindestens 45 Minuten Pause', 'Ich darf noch 1 Stunde fahren', 'Ich muss sofort 11 Stunden Ruhezeit machen'], ok: 0,
    why: 'Nach höchstens 4,5 h Lenkzeit kommt die Fahrtunterbrechung von mindestens 45 Minuten (Art. 7 VO 561/2006).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A. 4 h + 30 Min = 4,5 h.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c1e', {
    kicker: 'Quiz C1 · 2', q: 'Wie oft dürft ihr die tägliche Ruhezeit auf 9 Stunden verkürzen?', size: 32,
    opts: ['Jeden Tag', 'Höchstens dreimal zwischen zwei wöchentlichen Ruhezeiten', 'Nie'], ok: 1,
    why: 'Art. 8 Abs. 4 VO 561/2006: höchstens drei verkürzte tägliche Ruhezeiten zwischen zwei wöchentlichen Ruhezeiten.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Nicht verwechseln: Die Lenkzeit darf 2 × pro Woche auf 10 h verlängert werden – die Ruhezeit 3 × verkürzt.\n➜ „Und noch eine.“',
  });
  quiz(deck, 'c1e', {
    kicker: 'Quiz C1 · 3', q: 'Was braucht ihr, um die Klasse C nach 5 Jahren zu verlängern?', size: 32,
    opts: ['Nur den einfachen Sehtest wie für Klasse B', 'Ärztliche Untersuchung und Augen-Untersuchung nach Anlage 6 Nr. 2 FeV', 'Eine Fahrstunde mit dem Fahrlehrer'], ok: 1,
    why: '§ 24 FeV mit Anlage 5 und Anlage 6 Nr. 2. Der einfache Sehtest reicht für C nicht.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Zum Schluss von C1: Das nehmt ihr mit.“',
  });
  await takeaway(deck, 'c1e', {
    items: [
      ['LuIdCard', 'Klasse C:', 'ab 21 (mit Grundqualifikation oder Ausbildung ab 18), gilt 5 Jahre, Verlängerung mit Arzt und Augen.'],
      ['LuClock', '4,5 h fahren → 45 Min Pause', '(15 + 30). Tag 9 h (2 × 10 h), Woche 56 h, Doppelwoche 90 h.'],
      ['LuBed', 'Ruhe: täglich 11 h,', 'wöchentlich 45 h – die regelmäßige Wochenruhe nicht in der Kabine.'],
      ['LuCreditCard', 'Fahrerkarte:', 'persönlich, immer stecken; Kontrolle heute + 56 Tage.'],
      ['LuEyeOff', 'Toter Winkel:', 'innerorts rechts abbiegen nur in Schrittgeschwindigkeit – Radfahrer haben Vorrang.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C1, die ihr auf jeden Fall wissen müsst.“\n🖱 Klick 1–5: je ein Punkt. Gern die Klasse den Satz vervollständigen lassen.\n➜ „Jetzt 15 Minuten Pause. Danach Lektion C2.“',
  });
  // ===== PAUSE =====
  {
    const s = base(deck, 'c1e', { bg: 'f_pause.jpg', ov: 8.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „15 Minuten Pause. Wie beim Lkw: Fahrtunterbrechung – kurz raus, frische Luft, Wasser trinken.“\n' +
      '💡 Pausenende ansagen (z. B. 19:45 Uhr).\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Gleich geht es weiter mit Lektion C2.“' });
    s.text('PAUSE', { x: 0.7, y: 2.0, w: 6, h: 0.5, size: 18, bold: true, color: C.gr, cs: 6 }, { fx: 'fade', auto: true, dur: 600 });
    s.text('15 Minuten', { x: 0.7, y: 2.5, w: 6.5, h: 1.4, size: 72, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900, d: 200 });
    s.text('Fahrtunterbrechung – kurz raus, frische Luft.', { x: 0.7, y: 4.0, w: 6.2, h: 0.9, size: 22, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 600 });
    s.text('Danach: Lektion C2 · Besondere Vorschriften, Transportvorschriften', { x: 0.7, y: 4.85, w: 6.4, h: 0.8, size: 18, color: C.txt }, { fx: 'fade', auto: true, dur: 700, d: 900 });
  }
};
