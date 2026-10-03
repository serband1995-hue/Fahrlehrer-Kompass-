// Abend 6 · CE1: Kapitel 3 Auf- und Absatteln (Aufsatteln fließend mit Lupe, fremder Auflieger, Absatteln fließend)
const { C, sec, chapter, motion, ask, quiz, lkw, auflieger, seg } = require('../gs');

sec('ce1s', 'CE1  ·  AUF- UND ABSATTELN', C.gr, 'bg_gr.jpg');

// Sattelzug in Seitenansicht mit Lupe auf die Sattelkupplung.
// dx = Versatz der Zugmaschine (Zoll, 0 = eingekuppelt), lift = Höhe der Luftfederung (m, negativ = abgesenkt)
const K = 0.58, GY = 4.4, TX = 8.3, FL = 1.09, XC = TX - (2.55 - 0.55) * K;
async function szene(s, { dx = 0, lift = 0, legs = 1, secured = 0, lines = 0, locked = 0, lupe = '', lupeCol = C.mut, ring = C.gr, pill = '', gm = 0 }) {
  const X = XC + dx;
  s.rect(5.75, GY, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
  await lkw(s, { L: 3.6, box: 'none', axles: [0.78, 2.75], sattel: 2.55, cabTop: 3.05, top: 3.15, cabL: 1.75 }, { x: X, gy: GY, k: K, name: 'zm', split: true, lift });
  await auflieger(s, { L: 8.0, floor: FL, boxH: 2.2, legs }, { x: TX, gy: GY, k: K, name: 'af' });
  // Keil + Feststellbremse Auflieger
  const rw = TX + (8.0 - 1.05) * K;
  s.shape(s.pres.shapes.RIGHT_TRIANGLE, { x: rw + 0.2, y: GY - 0.17, w: 0.2, h: 0.17, fill: C.am, ft: secured ? 0 : 100, name: '!!keil' });
  s.text(secured ? 'P' : '', { x: 5.9, y: 5.42, w: 0.34, h: 0.34, size: 13, bold: true, color: C.white, fill: C.red, ft: secured ? 0 : 100, shape: s.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!P' });
  s.text(secured ? 'Feststellbremse + Keil' : '', { x: 6.32, y: 5.4, w: 2.85, h: 0.38, size: 13, bold: true, color: C.am, valign: 'middle', name: '!!pt' });
  // Leitungen Führerhaus → Stirnwand
  const lx0 = X + 1.79 * K, lx1 = TX + 0.02;
  seg(s, lx0, GY - 1.75 * K, lx1, GY - 1.62 * K, { col: C.am, th: 0.05, hide: !lines, name: '!!lgelb' });
  seg(s, lx0, GY - 1.87 * K, lx1, GY - 1.74 * K, { col: C.red, th: 0.05, hide: !lines, name: '!!lrot' });
  // Markierung an der Kupplung
  const kx = TX + 0.55 * K, ky = GY - (FL - 0.14) * K;
  s.oval(kx - 0.24, ky - 0.24, 0.48, 0.48, { line: ring, lw: 2.5, fill: ring, ft: 100, name: '!!ring' });
  // Lupe (unter dem Zug)
  const LX = 9.25, LY = 4.72, LW = 3.8, LH = 1.85, KPX = 11.6, AY = LY + 0.72;
  s.rrect(LX, LY, LW, LH, { fill: '0B1119', line: ring, lw: 2, rr: 0.08, name: '!!lupe' });
  s.text('LUPE: SATTELKUPPLUNG', { x: LX + 0.15, y: LY + 0.07, w: 3.0, h: 0.26, size: 10, bold: true, color: C.dim, cs: 2, name: '!!lupk' });
  s.rect(LX + 0.15, AY, LW - 0.3, 0.17, { fill: '5A6474', name: '!!agp' });
  s.text('Auflieger', { x: LX + 0.15, y: AY - 0.3, w: 1.4, h: 0.26, size: 11, color: C.mut, name: '!!agpt' });
  const gap = Math.max(0, -lift) * 2.0, pcx = KPX + Math.max(-1.35, Math.min(0, dx * 2.3)), px0 = Math.max(LX + 0.12, pcx - 1.1);
  s.rrect(px0, AY + 0.17 + gap, pcx + 1.1 - px0, 0.2, { fill: '1F242B', line: '7A8494', lw: 1.5, rr: 0.3, name: '!!sp' });
  s.text('Sattelplatte', { x: px0 + 0.1, y: AY + 0.17 + gap, w: 1.0, h: 0.2, size: 9, color: 'C9D0DA', valign: 'middle', name: '!!spt' });
  s.rect(KPX - 0.1, AY + 0.17, 0.2, 0.2, { fill: '9AA6B5', name: '!!kz' });
  seg(s, KPX - 1.0, AY + 0.19, KPX - 1.0, AY + 0.15 + Math.max(0.06, gap), { col: C.or, th: 0.04, hide: !gm, name: '!!gm' });
  s.text(gm ? '≤ 5 cm' : '', { x: KPX - 0.92, y: AY + 0.15, w: 0.8, h: 0.26, size: 11, bold: true, color: C.or, valign: 'middle', name: '!!gmt' });
  s.text('Königszapfen', { x: KPX + 0.15, y: AY - 0.3, w: 1.2, h: 0.26, size: 11, color: C.mut, name: '!!kzt' });
  s.oval(KPX - 0.2, AY + 0.07, 0.4, 0.4, { line: C.gr, lw: 2, fill: C.gr, ft: 100, lt: locked ? 0 : 100, name: '!!kzr' });
  s.text(lupe, { x: LX + 0.15, y: LY + LH - 0.42, w: LW - 0.3, h: 0.34, size: 13, bold: true, color: lupeCol, align: 'right', valign: 'middle', name: '!!lupt' });
  // Status
  s.text(pill, { x: 5.9, y: 4.75, w: 2.9, h: 0.42, size: 14, bold: true, color: C.dark, fill: pill ? C.gr : undefined, ft: pill ? 0 : 100, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!stat' });
}

module.exports = async (deck) => {
  await chapter(deck, 'ce1s', { num: 3, ttl: 'Auf- und Absatteln', sub: 'Beim Sattelzug liegt der Auflieger auf einer großen Platte. Die Höhe entscheidet – und der zweite Blick.', ico: 'LuTruck', notes:
    '▶ Sagen: „Kapitel 3: Sattelzug. Hier gibt es keine Zuggabel. Der Auflieger liegt mit dem Königszapfen auf der Sattelkupplung. Zwei Dinge sind wichtig: die richtige Höhe – und die Kontrolle danach.“\n✅ DGUV Information 214-080 „Kuppeln – aber sicher!“, Kap. 2.3.\n🖱 Keine Klicks.\n➜ „So wird aufgesattelt.“' });

  // ===== AUFSATTELN (fließend) =====
  const fa = (t, o = {}) => ({ ...o, t });
  await motion(deck, 'ce1s', {
    kicker: 'Aufsatteln', ttl: 'So wird aufgesattelt', dur: 650, holdDur: 900,
    question: 'Wie hoch muss die Sattelplatte stehen, wenn ihr unter den Auflieger fahrt?',
    answer: 'Knapp darunter – höchstens 5 cm Luftspalt. Dann anheben bis Kontakt. Der Auflieger selbst wird nicht angehoben.',
    legend: 'Seitenansicht · schematisch · Lupe vergrößert',
    frames: [
      fa({ dx: -1.1, lift: -0.12, secured: 1, ring: C.or, lupe: 'Kupplung offen', lupeCol: C.or }, { hold: true,
        cap: 'Auflieger gesichert: Feststellbremse, Keile. Sattelkupplung entsichert und offen. Zugmaschine abgesenkt.',
        note: '▶ Sagen: „Der Auflieger steht auf seinen Stützen und ist gesichert: roter Knopf gezogen, Keile liegen. Bei der Zugmaschine ist die Sattelkupplung entsichert und offen. Mit Luftfederung wird die Zugmaschine abgesenkt.“\n❓ Frage auf der Folie stellen.\n✅ DGUV I 214-080, Kap. 2.3 (Schritte 1–4). Prüfungsfrage 2.7.07-323: Vor dem Aufsatteln muss die Sattelkupplung entsichert und geöffnet sein, Sattelkupplung und Sattelzapfen etwa auf gleicher Höhe.\n💡 Zwangsgelenkte Auflieger nur gerade anfahren – Einfahrwinkel deutlich unter ± 10°.\n🖱 Klick: Die Zugmaschine fährt unter den Auflieger.\n➜ „Jetzt unterfahren.“' }),
      fa({ dx: -0.32, lift: -0.12, secured: 1, ring: C.or, gm: 1, lupe: 'Luftspalt höchstens 5 cm', lupeCol: C.or }, { hold: true,
        cap: 'Gerade rückwärts unterfahren. Die Sattelplatte bleibt knapp unter dem Auflieger.',
        note: '▶ „Die Zugmaschine fährt gerade rückwärts unter den Auflieger. Die Platte bleibt knapp darunter – höchstens 5 Zentimeter Luft. In der Lupe seht ihr den Spalt.“\n✅ DGUV I 214-080, Kap. 2.3: mit Luftfederung unterfahren, Luftspalt Sattelplatte–Aufgleitplatte höchstens 5 cm.\n🖱 Klick: Die Zugmaschine hebt an.\n➜ „Jetzt anheben.“' }),
      fa({ dx: -0.32, lift: 0, secured: 1, lupe: 'Kontakt – Auflieger nicht anheben', lupeCol: C.gr }, { hold: true, answer: true,
        cap: 'Luftfederung anheben, bis die Platte den Auflieger berührt. Nicht weiter: Der Auflieger bleibt auf seinen Stützen.',
        note: '▶ „Jetzt hebt die Luftfederung an – bis die Platte den Auflieger berührt. Nicht weiter! Der Auflieger darf nicht angehoben werden.“\n❓ Frage auf der Folie auflösen.\n✅ DGUV I 214-080, Kap. 2.3: anheben bis zum Kontakt, der Auflieger darf dabei nicht angehoben werden. Mit Blattfederung: Aufgleitplatte etwa auf Kupplungshöhe – der Auflieger wird beim Einfahren etwas angehoben.\n🖱 Klick: Die Zugmaschine setzt zurück, bis es einrastet.\n➜ „Und jetzt einrasten.“' }),
      fa({ dx: 0, lift: 0, secured: 1, locked: 1, lupe: 'Königszapfen im Verschluss', lupeCol: C.gr, pill: '✓  eingerastet' }, { hold: true,
        cap: 'Zurücksetzen, bis es einrastet. Kurz anrucken – das ist nur ein Vortest. Feststellbremse ziehen, aussteigen.',
        note: '▶ „Langsam zurück, bis die Kupplung einrastet. Dann kurz im Vorwärtsgang anrucken. Aber Achtung: Das Anrucken ersetzt nicht den Blick. Feststellbremse der Zugmaschine ziehen, aussteigen.“\n✅ DGUV I 214-080, Kap. 2.3 (Schritte 5–6 und Tipp nach Schritt 8): Anrucken ersetzt die Sichtkontrolle nicht. Vergleiche Prüfungsfrage 2.7.07-312 (Bolzenkupplung): „durch kurzes Anrucken“ ist dort falsch.\n🖱 Klick: Kontrolle.\n➜ „Was prüft ihr draußen?“' }),
      fa({ dx: 0, lift: 0, secured: 1, locked: 1, lupe: 'kein Luftspalt ✓   Sicherung eingefallen ✓', lupeCol: C.gr, pill: '✓  eingerastet' }, { hold: true,
        cap: 'Kontrolle von außen: Der Auflieger liegt ohne Spalt auf der Platte. Die Sicherung ist eingefallen. Im Dunkeln: Handlampe.',
        note: '▶ „Jetzt der Blick von außen: Liegt der Auflieger ohne Spalt auf der Platte? Ist die Sicherung eingefallen – je nach Hersteller ein Bügel, eine Klappe oder ein Karabiner? Im Dunkeln mit der Handlampe.“\n✅ DGUV I 214-080, Kap. 2.3 (Schritt 7). Prüfungsfrage 2.7.07-302: Nach dem Aufsatteln Verschluss und Sicherungssystem der Sattelkupplung überprüfen.\n💡 Ein Spalt kann heißen: Der Königszapfen sitzt nicht richtig im Verschluss. Dann nicht losfahren – neu aufsatteln.\n🖱 Klick: Leitungen.\n➜ „Jetzt die Leitungen.“' }),
      fa({ dx: 0, lift: 0, secured: 1, locked: 1, lines: 1, lupe: 'Leitungen: gelb, dann rot', lupeCol: C.am, ring: C.am, pill: '✓  eingerastet' }, { hold: true,
        cap: 'Leitungen: gelb, dann rot, dazu Strom und ABS/EBS. Sie dürfen nicht scheuern und in Kurven nicht zu straff sein.',
        note: '▶ „Leitungen: wie beim Anhänger erst gelb, dann rot. Dazu Licht und ABS/EBS. Die Wendelleitungen dürfen nicht scheuern und nicht durchhängen. Tipp: Zugmaschine etwa 45 Grad einschlagen und schauen, ob die Leitungen noch Luft haben.“\n✅ DGUV I 214-080, Kap. 2.3 (Schritt 8). Prüfungsfrage 2.7.07-302: alle Schlauch- und Kabelverbindungen herstellen und überprüfen.\n🖱 Klick: Stützen hoch.\n➜ „Und zum Schluss.“' }),
      fa({ dx: 0, lift: 0, legs: 0, locked: 1, lines: 1, lupe: 'Fahrbereit', lupeCol: C.gr, pill: '✓  fahrbereit' }, { hold: true,
        cap: 'Stützen hoch, Kurbel sichern. Feststellbremse am Auflieger lösen, Keile weg. Dann: Abfahrtkontrolle.',
        note: '▶ „Zum Schluss: Stützen ganz hochkurbeln, Kurbel sichern. Feststellbremse am Auflieger lösen, Keile wegnehmen und verstauen. Luftfederung und Liftachse in Fahrstellung. Dann die Abfahrtkontrolle.“\n✅ DGUV I 214-080, Kap. 2.3 (Schritte 9–10).\n🖱 Nächster Klick: nächste Folie.\n➜ „Und wenn der Auflieger fremd ist?“' }),
    ],
    scene: async (s, t) => szene(s, t),
  });

  // ===== FREMDER AUFLIEGER =====
  await ask(deck, 'ce1s', {
    kicker: 'Vor dem Aufsatteln', q: 'Ein fremder Auflieger: Was prüft ihr vorher?', ico: 'LuSearch', qsize: 32,
    answers: [
      ['LuCircleDot', 'Königszapfen', 'abgenutzt oder beschädigt? Passt er zur Kupplung (2 oder 3,5 Zoll)?', C.gr, 17],
      ['LuArrowLeftRight', 'Platz zum Führerhaus', 'Dreht der Auflieger in der Kurve frei – ohne an die Kabine zu stoßen?', C.gr, 17],
      ['LuMoveVertical', 'Höhe', 'Passt die Aufsattelhöhe? Bleibt der Zug bei höchstens 4,00 m?', C.gr, 17],
      ['LuScale', 'Sattellast und Länge', 'Sattellast der Zugmaschine reicht? Zug höchstens 16,50 m?', C.gr, 17],
    ],
    notes:
      '▶ Sagen: „Ihr übernehmt einen Auflieger, den ihr noch nie gefahren habt. Was prüft ihr, bevor ihr aufsattelt?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Prüfungsfrage 2.7.07-304: auf Abnutzung oder Beschädigung des Kupplungszapfens und ausreichenden Freiraum zwischen Führerhaus und Sattelanhänger achten (falsch: gleiche Reifengröße). DGUV I 214-080, Kap. 2.3 (Schritt 1): Kombination zulässig? Sattellast, Aufsattelhöhe, Gesamthöhe, Sattelvormaß, Länge, Zwangslenkung. Höhe 4,00 m: § 32 Abs. 2 StVZO. Länge 16,50 m: § 32 Abs. 4 StVZO. Königszapfen 50 mm (2 Zoll) oder 90 mm (3,5 Zoll).\n' +
      '➜ „Eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce1s', {
    kicker: 'Prüfungsfrage 2.7.07-323', q: 'Welche Voraussetzung muss vor dem Aufsatteln eines Sattelanhängers erfüllt sein?', size: 30,
    opts: ['Die Sattelkupplung muss entsichert und geöffnet sein', 'Sattelkupplung und Sattelzapfen müssen etwa auf gleicher Höhe stehen', 'Alle Schlauch- und Kabelverbindungen müssen hergestellt sein'], ok: [0, 1],
    why: 'Erst aufsatteln, dann die Leitungen. (Ausnahme: kein Platz hinter dem Führerhaus – dann vorher, aber auch gelb vor rot.)',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.07-323: A und B. Ausnahme „abweichendes Aufsatteln“: DGUV I 214-080, S. 47, und DGUV FBVL-003 (2020) – nur wenn bauartbedingt kein Platz für die Leitungen ist.\n➜ „Und das Absatteln?“',
  });

  // ===== ABSATTELN (fließend) =====
  await motion(deck, 'ce1s', {
    kicker: 'Absatteln', ttl: 'So wird abgesattelt', dur: 650, holdDur: 900,
    question: 'Warum fahrt ihr erst ein Stück vor und senkt dann ab – statt gleich wegzufahren?',
    answer: 'Damit sich die Platte ruhig vom Auflieger löst. Fährt die Zugmaschine gleich ganz heraus, kann ihr Heck hochschlagen.',
    legend: 'Seitenansicht · schematisch · Lupe vergrößert',
    frames: [
      fa({ dx: 0, lift: 0, legs: 0, locked: 1, lines: 1, lupe: 'Untergrund fest? Beladen erlaubt?', lupeCol: C.or, ring: C.or }, { hold: true,
        cap: 'Vorher klären: Darf der Auflieger beladen abgestellt werden? Trägt der Boden die Stützen? Gestreckt abstellen.',
        note: '▶ Sagen: „Absatteln. Zuerst denken: Darf der Auflieger beladen abgestellt werden? Das steht auf dem Fabrikschild oder an den Stützen. Trägt der Boden? Sonst eine Platte unterlegen. Und gestreckt abstellen – einen zwangsgelenkten Auflieger bekommt man im Winkel nicht wieder drauf.“\n❓ Frage auf der Folie stellen.\n✅ DGUV I 214-080, Kap. 2.3 (Absatteln, Schritte 1–3).\n🖱 Klick: sichern und Stützen ausfahren.\n➜ „Dann sichern.“' }),
      fa({ dx: 0, lift: 0, legs: 1, secured: 1, locked: 1, lines: 1, lupe: 'Stützen am Boden', lupeCol: C.gr }, { hold: true,
        cap: 'Feststellbremse der Zugmaschine, dann roter Knopf am Auflieger. Keile. Stützen ausfahren bis zum Boden.',
        note: '▶ „Wenn der Zug steht: Feststellbremse der Zugmaschine, dann am Auflieger den roten Knopf ziehen. Keile unterlegen. Stützen ausfahren. Mit Luftfederung: bis sie den Boden berühren. Mit Blattfederung: bis die Federn der Zugmaschine entlastet sind.“\n✅ DGUV I 214-080, Kap. 2.3 (Absatteln, Schritte 4–7): luftgefederte Zugmaschine vorher etwas anheben. Prüfungsfrage 2.7.07-305: Räder feststellen und Stützeinrichtung ausfahren.\n🖱 Klick: Leitungen trennen, Kupplung öffnen.\n➜ „Jetzt die Leitungen.“' }),
      fa({ dx: 0, lift: 0, legs: 1, secured: 1, locked: 0, lines: 0, lupe: 'rot, dann gelb ab · Kupplung offen', lupeCol: C.or, ring: C.or }, { hold: true,
        cap: 'Leitungen trennen: erst rot, dann gelb. In die Halter, Kappen drauf. Sicherung aushängen, Kupplung öffnen.',
        note: '▶ „Leitungen trennen – wie beim Anhänger: erst rot, dann gelb. In die Parkdosen, Schutzkappen drauf, Wendeln entwirren. Dann Sicherung aushängen und Kupplung öffnen.“\n✅ DGUV I 214-080, Kap. 2.3 (Absatteln, Schritte 8–9). Prüfungsfrage 2.7.07-305: alle Verbindungen trennen; Verriegelung entsichern und Verschluss öffnen. 2.7.07-319: zuerst rot.\n🖱 Klick: Die Zugmaschine fährt vor und senkt ab.\n➜ „Jetzt ausfahren – aber in zwei Schritten.“' }),
      fa({ dx: -0.17, lift: 0, legs: 1, secured: 1, lupe: 'etwa 30 cm vor', lupeCol: C.or, ring: C.or }),
      fa({ dx: -0.17, lift: -0.08, legs: 1, secured: 1, lupe: 'dann 5–10 cm absenken', lupeCol: C.gr }, { hold: true, answer: true,
        cap: 'Etwa 30 cm vorziehen, dann 5–10 cm absenken. Jetzt trägt der Auflieger sich selbst.',
        note: '▶ „Mit Luftfederung: erst etwa 30 Zentimeter vorziehen, dann die Zugmaschine 5 bis 10 Zentimeter absenken. Jetzt liegt das Gewicht auf den Stützen.“\n❓ Frage auf der Folie auflösen.\n✅ DGUV I 214-080, Kap. 2.3 (Absatteln, Schritt 10): ca. 30 cm vorziehen, 5–10 cm absenken, dann ganz ausfahren – sonst kann das Heck hochschlagen. Mit Blattfederung: langsam vorziehen.\n🖱 Klick: Die Zugmaschine fährt weg.\n➜ „Und raus.“' }),
      fa({ dx: -1.1, lift: -0.08, legs: 1, secured: 1, lupe: 'Auflieger steht sicher', lupeCol: C.gr }, { hold: true,
        cap: 'Langsam herausfahren. Der Auflieger steht gesichert auf seinen Stützen. Bei Bedarf: Parkwarntafel.',
        note: '▶ „Jetzt langsam heraus. Der Auflieger steht auf den Stützen, Feststellbremse und Keile halten ihn.“\n✅ DGUV I 214-080, Kap. 2.3 (Absatteln, Schritt 11): ggf. Parkwarntafel; Liftachse absenken, wenn beladen wird.\n🖱 Nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage dazu.“' }),
    ],
    scene: async (s, t) => szene(s, t),
  });
  await quiz(deck, 'ce1s', {
    kicker: 'Prüfungsfrage 2.7.07-305', q: 'Was müssen Sie vor dem Absatteln eines Sattelanhängers tun?', size: 32,
    opts: ['Die Räder des Sattelanhängers feststellen und die Stützeinrichtung ausfahren', 'Alle Schlauch- und Kabelverbindungen zwischen Sattelzugmaschine und Sattelanhänger trennen', 'Die Kupplungsverriegelung entsichern und den Verschluss der Sattelkupplung öffnen'], ok: [0, 1, 2],
    why: 'Alle drei sind richtig – genau in dieser Reihenfolge.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.07-305: A, B und C.\n➜ „Kapitel 4: Wie lang darf ein Zug sein?“',
  });
};
