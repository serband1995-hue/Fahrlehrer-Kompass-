// Abend 2 · C4: Kapitel 5 Licht und Warnleuchten, Abschluss C4, Ende
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, write, takeaway, foot, chapter } = require('../gs');
const { icon } = require('../lib');

sec('c4l', 'C4  ·  LICHT UND WARNLEUCHTEN', C.red, 'bg_red.jpg');
sec('c4x', 'C4  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'c4l', { num: 5, ttl: 'Licht und Warnleuchten', sub: 'Gesehen werden, richtig warnen – und verstehen, was im Cockpit leuchtet.', ico: 'LuLightbulb', notes:
    '▶ Sagen: „Letztes Kapitel: Licht. Ein Lkw ist nachts 16 Meter dunkle Wand – er muss gut zu sehen sein.“\n🖱 Keine Klicks.\n➜ „Welche Leuchten hat ein Lkw, die ein Pkw nicht hat?“' });

  // ===== LEUCHTEN AM LKW (Seiten- und Rückansicht) =====
  {
    const s = base(deck, 'c4l', { notes:
      '▶ Sagen: „Welche Leuchten hat ein Lkw, die ein Pkw nicht hat?“\n' +
      '❓ Sammeln lassen, dann klicken.\n' +
      '🖱 Klick 1: Umrissleuchten · Klick 2: Seitenmarkierungsleuchten · Klick 3: Konturmarkierung seitlich · Klick 4: Konturmarkierung hinten.\n' +
      '✅ Umrissleuchten: Pflicht bei mehr als 2,10 m Breite – vorn weiß, hinten rot (§ 51b StVZO). Seitenmarkierungsleuchten: gelb, Pflicht bei mehr als 6 m Länge (§ 51a Abs. 6 StVZO; Ausnahme u. a. Fahrgestelle mit Fahrerhaus).\n' +
      '✅ Konturmarkierung: rückstrahlende Streifen – seitlich weiß oder gelb, hinten rot oder gelb (§ 53 Abs. 10 StVZO). Pflicht für neue Lkw über 7,5 t und neue Anhänger über 3,5 t seit 10.7.2011, ohne Nachrüstpflicht. Hinten die volle Kontur, seitlich mindestens Linie unten und Ecken oben.\n' +
      '💡 Bei der Abfahrtkontrolle: alle Leuchten an und sauber, Konturmarkierung sauber und vollständig. Verschmutzte Beleuchtung: 20 € (BKat 73).\n' +
      '➜ „Darf ein Lkw auch gelbes Rundumlicht haben?“' });
    kick(s, 'Beleuchtung'); title(s, 'Damit man den Lkw nachts sieht');
    // Seitenansicht (Front links)
    const Y0 = 2.35, L = 7.6, X0 = 0.9, HB = 2.6;
    s.rect(X0 + 1.6, Y0, L - 1.6, HB, { fill: '2A3342', line: '3C4656' });
    s.rrect(X0, Y0 + 0.6, 1.5, HB - 0.6, { fill: '3C4656', rr: 0.1 });
    s.rect(X0 + 0.1, Y0 + 0.85, 0.7, 0.7, { fill: '1B2433' });
    s.rect(X0, Y0 + HB, L, 0.15, { fill: '55606F' });
    for (const x of [X0 + 0.8, X0 + L - 2.0, X0 + L - 1.1]) s.oval(x - 0.38, Y0 + HB - 0.05, 0.76, 0.76, { fill: '11161E', line: '55606F', lw: 2 });
    s.text('Seitenansicht', { x: X0, y: 1.95, w: 3, h: 0.3, size: 12, italic: true, color: C.dim });
    // 1 Umrissleuchten (vorn weiß oben am Aufbau, hinten rot)
    s.oval(X0 + 1.55, Y0 - 0.08, 0.2, 0.2, { fill: C.white, glow: 8, glowColor: C.white }, CLICK);
    s.oval(X0 + L - 0.2, Y0 - 0.08, 0.2, 0.2, { fill: C.red, glow: 8, glowColor: C.red }, { fx: 'zoom', dur: 250 });
    s.text('Umrissleuchten', { x: X0 + L / 2 - 1.2, y: Y0 + 0.15, w: 2.4, h: 0.4, size: 16, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
    // 2 Seitenmarkierungsleuchten (gelb)
    for (let k = 0; k < 5; k++) s.oval(X0 + 2.0 + k * 1.3, Y0 + HB - 0.3, 0.18, 0.18, { fill: C.am, glow: 8, glowColor: C.am }, k === 0 ? CLICK : { fx: 'zoom', dur: 150 });
    s.text('Seitenmarkierungsleuchten (gelb)', { x: X0 + 2.0, y: Y0 + HB + 0.75, w: 4.8, h: 0.4, size: 15, bold: true, color: C.am }, { fx: 'fade', dur: 200 });
    // 3 Konturmarkierung seitlich: Linie unten + Ecken oben
    s.rect(X0 + 1.7, Y0 + HB - 0.1, L - 1.8, 0.07, { fill: 'F2D23A' }, { fx: 'wipeR', c: true, dur: 600 });
    s.rect(X0 + 1.7, Y0 + 0.08, 0.5, 0.07, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.rect(X0 + 1.7, Y0 + 0.08, 0.07, 0.5, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.rect(X0 + L - 0.6, Y0 + 0.08, 0.5, 0.07, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.rect(X0 + L - 0.17, Y0 + 0.08, 0.07, 0.5, { fill: 'F2D23A' }, { fx: 'fade', dur: 200 });
    s.text('Konturmarkierung seitlich: gelb oder weiß', { x: X0 + 1.7, y: Y0 + 1.1, w: 5.6, h: 0.4, size: 15, bold: true, color: 'F2D23A', align: 'center' }, { fx: 'fade', dur: 200 });
    // 4 Rückansicht mit Vollkontur
    const RX = 9.3, RW = 2.9, RH = 3.1, RY = 2.35;
    card(s, RX - 0.25, RY - 0.4, RW + 0.5, RH + 1.15, {}, CLICK);
    s.text('Rückansicht', { x: RX - 0.15, y: RY - 0.35, w: 2.5, h: 0.3, size: 12, italic: true, color: C.dim }, { fx: 'fade', dur: 150 });
    s.rect(RX, RY, RW, RH, { fill: '2A3342', line: '3C4656' }, { fx: 'fade', dur: 200 });
    s.rect(RX + 0.08, RY + 0.08, RW - 0.16, RH - 0.16, { line: C.red, lw: 4 }, { fx: 'fade', dur: 300 });
    s.oval(RX - 0.05, RY - 0.12, 0.2, 0.2, { fill: C.red, glow: 8, glowColor: C.red }, { fx: 'zoom', dur: 200 });
    s.oval(RX + RW - 0.15, RY - 0.12, 0.2, 0.2, { fill: C.red, glow: 8, glowColor: C.red }, { fx: 'zoom', dur: 200 });
    s.text('volle Kontur hinten: rot oder gelb', { x: RX - 0.2, y: RY + RH + 0.15, w: RW + 0.4, h: 0.6, size: 14, bold: true, color: C.red, align: 'center' }, { fx: 'fade', dur: 200 });
    // Regeln unten
    s.text([{ text: 'Umrissleuchten: ', options: { bold: true, color: C.txt } }, { text: 'breiter als 2,10 m  ·  ', options: { color: C.mut } }, { text: 'Seitenmarkierung: ', options: { bold: true, color: C.txt } }, { text: 'länger als 6 m  ·  ', options: { color: C.mut } }, { text: 'Kontur: ', options: { bold: true, color: C.txt } }, { text: 'neue Lkw über 7,5 t seit 2011', options: { color: C.mut } }], { x: 0.7, y: 6.32, w: 11.93, h: 0.45, size: 15 });
  }

  // ===== RUNDUMLICHT, ARBEITSSCHEINWERFER =====
  await ask(deck, 'c4l', {
    kicker: 'Rundumlicht', q: 'Panne auf dem Standstreifen. Darf ich das gelbe Rundumlicht einschalten?', qsize: 30, ico: 'LuSiren',
    answers: [
      ['LuX', 'Nein – nur berechtigte Fahrzeuge', 'z. B. Straßendienst, Müllabfuhr, Pannenhilfe, Begleitfahrzeuge bei Überbreite – und nur zur Warnung vor Gefahren.', C.red],
      ['LuTriangleAlert', 'Bei einer Panne:', 'Warnblinklicht an, Warnweste anziehen, Warndreieck aufstellen.', C.am],
      ['LuLightbulbOff', 'Arbeitsscheinwerfer nie während der Fahrt', '– und keine zusätzlichen Deko-Leuchten: nur genehmigte Leuchten sind erlaubt.'],
    ],
    notes:
      '▶ Sagen: „Manche Lkw haben ein gelbes Rundumlicht auf dem Dach.“\n' +
      '❓ „Darf ich es bei einer Panne einschalten?“\n' +
      '🖱 Klick 1–3: je eine Antwort.\n' +
      '✅ Gelbes Rundumlicht nur an berechtigten Fahrzeugen (§ 52 Abs. 4 StVZO) – z. B. Straßenbau, -unterhaltung und -reinigung, Müllabfuhr, Pannenhilfsfahrzeuge, Fahrzeuge mit Überbreite oder Überlänge nach Anordnung, Begleitfahrzeuge. Einschalten nur zur Warnung vor Arbeits- oder Unfallstellen, vor ungewöhnlich langsamen oder breiten Fahrzeugen (§ 38 Abs. 3 StVO).\n' +
      '✅ Arbeitsscheinwerfer nicht während der Fahrt (Ausnahme: Arbeitsfahrten von Straßendienst und Müllabfuhr) – § 52 Abs. 7 StVZO. Nicht genehmigte Zusatzleuchten (§ 49a StVZO): 20 € (BKat 221.2).\n' +
      '➜ „Jetzt ins Cockpit: Was bedeuten die Farben der Warnleuchten?“',
  });

  // ===== WARNLEUCHTEN-FARBEN =====
  {
    const s = base(deck, 'c4l', { notes:
      '▶ Sagen: „Im Cockpit leuchten viele Symbole. Wichtig ist vor allem die Farbe.“\n' +
      '❓ „Was bedeutet Rot?“\n' +
      '🖱 Klick 1: Rot · Klick 2: Gelb · Klick 3: Grün · Klick 4: Blau.\n' +
      '✅ Rot = Gefahr: an sicherer Stelle anhalten, Motor aus bzw. Betriebsanleitung – z. B. Öldruck, Kühlmitteltemperatur (2.7.02-216), Bremsdruck/Druckwarnung (2.7.02-203), Ladekontrolle, oft ein großes rotes STOP. Gelb = Störung: bald in die Werkstatt – z. B. ABS/EBS, Motorstörung, AdBlue, Partikelfilter. Grün = eingeschaltet. Blau = Fernlicht (Farben nach ISO 2575, Lehrbuchwissen).\n' +
      '➜ „Zum Schluss: die elektronischen Helfer.“' });
    kick(s, 'Kontrollleuchten'); title(s, 'Die Farbe sagt, was zu tun ist');
    const F = [[C.red, 'Rot', 'Gefahr!', 'An sicherer Stelle anhalten, Motor aus.', 'Öldruck · Kühlmittel · Bremsdruck · Ladekontrolle · STOP', 'LuOctagonAlert'], ['F2C230', 'Gelb', 'Störung', 'Bald in die Werkstatt.', 'ABS / EBS · Motor · AdBlue · Partikelfilter', 'LuTriangleAlert'], [C.gr, 'Grün', 'Ist an', 'Alles in Ordnung.', 'Blinker · Abblendlicht', 'LuCircleCheck'], ['3B82F6', 'Blau', 'Fernlicht', 'Gegenverkehr? Abblenden!', '', 'LuSun']];
    for (let k = 0; k < 4; k++) {
      const x = 0.7 + k * 3.03, w = 2.85;
      card(s, x, 2.05, w, 4.45, { line: F[k][0] }, CLICK);
      s.oval(x + w / 2 - 0.6, 2.35, 1.2, 1.2, { fill: '0A0F16', line: F[k][0], lw: 3, glow: 12, glowColor: F[k][0] }, { fx: 'zoom', dur: 250 });
      s.img(await icon(F[k][5], F[k][0]), { x: x + w / 2 - 0.33, y: 2.62, w: 0.66, h: 0.66 }, { fx: 'fade', dur: 150 });
      s.text([{ text: F[k][1] + ' = ', options: { color: F[k][0] } }, { text: F[k][2], options: { color: C.txt } }], { x: x + 0.1, y: 3.75, w: w - 0.2, h: 0.5, size: 22, bold: true, align: 'center' }, { fx: 'fade', dur: 200 });
      s.text(F[k][3], { x: x + 0.15, y: 4.3, w: w - 0.3, h: 0.8, size: 16, bold: true, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
      if (F[k][4]) s.text(F[k][4], { x: x + 0.15, y: 5.1, w: w - 0.3, h: 1.25, size: 14, color: C.mut, align: 'center' }, { fx: 'fade', dur: 200 });
    }
  }

  // ===== ASSISTENZSYSTEME =====
  {
    const s = base(deck, 'c4l', { notes:
      '▶ Sagen: „Neue Lkw haben viele elektronische Helfer – einige schreibt die EU vor.“\n' +
      '🖱 Klick 1–4: je ein System · Klick 5: die wichtigste Regel.\n' +
      '✅ Notbremsassistent: warnt und bremst selbst, wenn ein Aufprall droht – nicht dauerhaft abschalten. Spurhaltewarner: warnt, wenn der Lkw ohne Blinker die Spur verlässt. Abbiegeassistent: warnt vor Radfahrern und Fußgängern rechts neben dem Lkw – Pflicht für alle neuen Lkw seit 7.7.2024 (VO (EU) 2019/2144). Anfahr-Informationssystem: warnt vor Personen direkt vor dem Lkw beim Anfahren.\n' +
      '✅ Prüfungsfragen 2.7.01-202 und 2.7.01-206: Assistenzsysteme unterstützen – die Verantwortung bleibt beim Fahrer.\n' +
      '➜ „Damit ist C4 geschafft. Zeit zum Mitschreiben.“' });
    kick(s, 'Fahrerassistenz'); title(s, 'Elektronische Helfer');
    await point(s, 0.7, 2.05, 5.85, 1.25, 'LuOctagonAlert', C.red, 'Notbremsassistent', 'warnt und bremst selbst, wenn ein Auffahrunfall droht.', CLICK, { br: true, size: 16 });
    await point(s, 6.78, 2.05, 5.85, 1.25, 'LuMoveHorizontal', C.bl, 'Spurhaltewarner', 'warnt, wenn der Lkw ohne Blinker die Spur verlässt.', CLICK, { br: true, size: 16 });
    await point(s, 0.7, 3.45, 5.85, 1.25, 'LuBike', C.or, 'Abbiegeassistent', 'warnt vor Radfahrern rechts – Pflicht für alle neuen Lkw seit Juli 2024.', CLICK, { br: true, size: 16 });
    await point(s, 6.78, 3.45, 5.85, 1.25, 'LuPersonStanding', C.pu, 'Anfahr-Informationssystem', 'warnt vor Menschen direkt vor dem Lkw.', CLICK, { br: true, size: 16 });
    await point(s, 0.7, 4.95, 11.93, 1.5, 'LuShieldAlert', C.gr, 'Die Helfer unterstützen – die Verantwortung bleibt bei dir.', 'Spiegel, Schulterblick und Schritttempo beim Rechtsabbiegen bleiben Pflicht – auch wenn nichts piept.', CLICK, { br: true, size: 18 });
  }

  quiz(deck, 'c4l', {
    kicker: 'Quiz Licht', q: 'Die Blinker-Kontrollleuchte blinkt plötzlich viel schneller als sonst. Warum?', size: 32,
    opts: ['Der Warnblinker ist an', 'Eine Blinkleuchte ist ausgefallen', 'Die Batterie ist voll geladen'], ok: 1,
    why: 'Schnelles Blinken der Kontrolle zeigt: Eine Blinkleuchte am Lkw oder Anhänger ist ausgefallen (Prüfungsfrage 2.7.02-202).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Zum Abschluss von C4: Mitschreiben.“',
  });

  // ===== ABSCHLUSS C4 =====
  write(deck, 'c4x', {
    ttl: 'Fahrwerk und Elektrik', labelW: 3.6, size: 18,
    rows: [
      ['Luftfeder', 'Heben und Senken nur im Stand – danach zurück aufs Fahrniveau'],
      ['Profil', 'mindestens 1,6 mm – auch beim Lkw (Fahrer 60 €, 1 Punkt)'],
      ['Winterreifen', 'bei Glätte, Alpine-Symbol – Antriebsachsen und vordere Lenkachsen'],
      ['Schneeketten', 'Zeichen 268 – höchstens 50 km/h'],
      ['Radmuttern', 'nach 50–100 km nachziehen'],
      ['Bordnetz', '24 V: zwei 12-V-Batterien in Reihe'],
      ['Starthilfe', 'Rot + Panne, Rot + Spender, Schwarz − Spender, Schwarz an Masse'],
      ['Warnleuchte rot', 'sofort an sicherer Stelle anhalten'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus C4.“\n❓ Vor jedem Klick fragen: „Was gehört hier hin?“\n🖱 Klick 1–8: je eine Lösung.\n✅ Quellen: § 36 Abs. 3 StVZO, BKat 212; § 2 Abs. 3a StVO; § 3 Abs. 4 StVO, Zeichen 268; ADAC Starthilfe; Prüfungsfragen 2.7.01-242, 2.7.02-216.\n➜ „Jetzt testen wir C4.“',
  });
  quiz(deck, 'c4x', {
    kicker: 'Quiz C4 · 1', q: 'Schneematsch auf der Straße. Wo braucht Ihr Lkw mindestens Winterreifen?', size: 32,
    opts: ['Nur auf der Antriebsachse', 'Auf den Antriebsachsen und den vorderen Lenkachsen', 'Keine Pflicht – Winterreifen sind nur für Pkw'], ok: 1,
    why: '§ 2 Abs. 3a StVO: Bei Lkw über 3,5 t genügen Winterreifen auf den permanent angetriebenen Achsen und den vorderen Lenkachsen – mit Alpine-Symbol.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Die Lenkachse ist seit 1.7.2020 dabei.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c4x', {
    kicker: 'Quiz C4 · 2', q: 'Starthilfe: Wo kommt das letzte Ende des schwarzen Kabels hin?', size: 34,
    opts: ['An Minus der leeren Batterie', 'An Masse am Motorblock des Pannen-Lkw', 'An Plus des Spenders'], ok: 1,
    why: 'An blankes Metall am Motorblock, mit Abstand zur Batterie – sonst können Funken das Knallgas der Batterie entzünden (ADAC).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Zum Schluss: Das nehmt ihr mit.“',
  });
  await takeaway(deck, 'c4x', {
    items: [
      ['LuArrowUpDown', 'Luftfeder:', 'heben und senken nur im Stand – danach zurück aufs Fahrniveau.'],
      ['LuCircleDot', 'Reifen:', '1,6 mm Profil, Druck kalt prüfen, Steine aus den Zwillingen, Radmuttern nachziehen.'],
      ['LuSnowflake', 'Winter:', 'Alpine-Symbol auf Antriebs- und Lenkachse – mit Ketten höchstens 50 km/h.'],
      ['LuBatteryCharging', '24 Volt:', 'Starthilfe nur 24 an 24 – Schwarz zuletzt an Masse.'],
      ['LuLightbulb', 'Licht:', 'alle Leuchten und Kontur sauber – rote Warnleuchte heißt anhalten.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C4, die ihr auf jeden Fall wissen müsst.“\n🖱 Klick 1–5: je ein Punkt. Gern die Klasse den Satz vervollständigen lassen.\n➜ „Das war Abend 2.“',
  });

  // ===== ENDE =====
  {
    const s = base(deck, 'c4x', { bg: 'g_licht.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 2. Beim nächsten Mal geht es um die Bremsen: C5 – wie eine Druckluftbremse funktioniert – und C6 – Dauerbremsen, ABS, Prüfungen am Fahrzeug und der Geschwindigkeitsbegrenzer. Danke fürs Mitmachen, kommt gut nach Hause.“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen.\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.5, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Gute Heimfahrt!', { x: 0.7, y: 2.4, w: 6.5, h: 1.2, size: 54, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900 });
    s.text('Abend 2 geschafft: C3 + C4', { x: 0.7, y: 3.65, w: 6.5, h: 0.6, size: 22, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Nächstes Mal:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'C5  Bremsen – Druckluftbremse', options: { color: C.txt, breakLine: true } }, { text: 'C6  Dauerbremsen, Untersuchungen, Begrenzer', options: { color: C.txt } }], { x: 0.7, y: 4.6, w: 6.3, h: 1.4, size: 20 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
