// C1 Kapitel 1: Fahrerlaubnis C, Befristung, Untersuchungen, Berufskraftfahrer (Abgrenzung), Papiere
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, chapter, write, foot } = require('../gs');
const { icon } = require('../lib');

sec('fs', 'C1  ·  FÜHRERSCHEIN UND PAPIERE', C.bl, 'bg_blue.jpg');

module.exports = async (deck) => {
  // ===== LERNZIELE C1 =====
  {
    const s = base(deck, 'c1', { notes:
      '▶ Sagen: „Lektion C1 hat vier Teile. Am meisten Zeit nehmen wir uns für die Lenk- und Ruhezeiten, weil die euch im Beruf jeden Tag betreffen.“\n' +
      '🖱 Klick 1–4: je ein Kapitel mit Zeit.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: der Führerschein.“' });
    kick(s, 'Lektion C1 · Persönliche Voraussetzungen und Arbeitsplatz'); title(s, 'Das lernt ihr in C1');
    const T = [
      ['01', 'Führerschein und Papiere', 'Klassen, Alter, Befristung, Untersuchungen, was ihr dabei haben müsst', '15 Min', C.bl],
      ['02', 'Lenk- und Ruhezeiten', 'Wie lange fahren, wie lange Pause – Tag, Woche, Doppelwoche', '35 Min', C.or],
      ['03', 'Fahrtenschreiber', 'Fahrerkarte, Symbole, Kontrolle, was bei Verlust zu tun ist', '15 Min', C.pu],
      ['04', 'Arbeitsplatz und toter Winkel', 'Sitz, Spiegel, Rechtsabbiegen, Abbiegeassistent', '20 Min', C.red],
    ];
    for (let i = 0; i < 4; i++) {
      const y = 2.05 + i * 1.1;
      card(s, 0.7, y, 11.93, 0.95, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.95, size: 34, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1], options: { bold: true, color: C.txt, breakLine: true } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.95, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.95, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nimmst du mit“', { x: 0.7, y: 6.5, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }
  await chapter(deck, 'fs', { num: 1, ttl: 'Führerschein und Papiere', sub: 'Welche Klasse für welchen Lkw – und was ihr dafür mitbringen müsst.', ico: 'LuIdCard', notes:
    '▶ Sagen: „Erstes Kapitel: Welche Führerscheinklasse braucht ihr wofür, ab wann bekommt ihr sie, und warum ist sie befristet?“\n🖱 Keine Klicks.\n➜ „Zuerst die Klassen.“' });
  // ===== KLASSEN (Diagramm Gesamtmasse) =====
  {
    const s = base(deck, 'fs', { notes:
      '▶ Sagen: „Was entscheidet, welche Klasse ihr braucht? Die zulässige Gesamtmasse – das, was im Fahrzeugschein steht, nicht das Gewicht, das gerade auf der Waage ist.“\n' +
      '🖱 Klick 1: B · Klick 2: C1 · Klick 3: C · Klick 4: Anhänger-Regel.\n' +
      '✅ B: bis 3.500 kg. C1: über 3.500 kg bis 7.500 kg. C: über 3.500 kg, nach oben offen. Jeweils höchstens 8 Personen außer dem Fahrer (§ 6 Abs. 1 FeV).\n' +
      '✅ Mit C1 und C dürft ihr einen Anhänger bis 750 kg zGM ziehen. Schwerer → C1E bzw. CE.\n' +
      '💡 Die Obergrenze für den Lkw selbst steht nicht in der Fahrerlaubnis, sondern in der Zulassung (StVZO): z. B. 18 t bei zwei Achsen, 32 t bei vier Achsen (§ 34 StVZO).\n' +
      '➜ „Ab welchem Alter dürft ihr C fahren?“' });
    kick(s, 'Welche Klasse?'); title(s, 'Entscheidend ist die zulässige Gesamtmasse', { size: 34 });
    const X0 = 2.6, k = 0.28; // 1 t = 0,28 Zoll (bis 34 t sichtbar)
    for (const t of [0, 3.5, 7.5, 12, 18, 26, 32]) {
      s.rect(X0 + t * k, 2.15, 0.012, 3.3, { fill: C.line });
      s.text(String(t).replace('.', ',') + ' t', { x: X0 + t * k - 0.4, y: 5.5, w: 0.8, h: 0.3, size: 12, color: C.dim, align: 'center' });
    }
    const R = [['B', 0, 3.5, C.dim, 'bis 3,5 t'], ['C1', 3.5, 7.5, '7FD6F5', 'über 3,5 t bis 7,5 t'], ['C', 3.5, 34, C.bl, 'über 3,5 t – nach oben offen']];
    for (let i = 0; i < 3; i++) {
      const y = 2.3 + i * 1.0;
      s.text(R[i][0], { x: 0.7, y, w: 1.6, h: 0.7, size: 30, bold: true, color: R[i][3], valign: 'middle' }, { fx: 'fade', c: true, dur: 200 });
      s.rect(X0 + R[i][1] * k, y + 0.1, (R[i][2] - R[i][1]) * k, 0.5, { fill: R[i][3] }, { fx: 'wipeR', dur: 600 });
      const inside = R[i][2] - R[i][1] > 10;
      s.text(R[i][4], { x: inside ? X0 + R[i][1] * k + 0.15 : X0 + R[i][2] * k + 0.15, y: y + 0.1, w: 6.5, h: 0.5, size: 16, bold: true, color: inside ? C.dark : R[i][3], valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text([{ text: 'Anhänger:  ', options: { bold: true, color: C.bl } }, { text: 'Mit C1 und C bis 750 kg. Schwerer → C1E oder CE.  ·  Gebaut für höchstens 8 Personen außer dem Fahrer.', options: { color: C.txt } }],
      { x: 0.7, y: 5.95, w: 11.93, h: 0.7, size: 17, valign: 'middle', fill: C.card2, line: C.bl, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
  }
  // ===== MINDESTALTER =====
  await ask(deck, 'fs', {
    kicker: 'Mindestalter · § 10 FeV', q: 'Ab wann dürft ihr Klasse C fahren?', ico: 'LuCalendar',
    answers: [
      ['LuIdCard', 'Mit 21 Jahren', '– der Normalfall.'],
      ['LuGraduationCap', 'Mit 18 Jahren', 'mit Grundqualifikation als Berufskraftfahrer (Prüfung bei der IHK) – vorher MPU.'],
      ['LuBriefcase', 'Mit 18 Jahren in der Ausbildung', 'zum Berufskraftfahrer – vorher MPU; nur im Inland und nur für die Ausbildung, bis 21 oder Abschluss.'],
      ['LuTruck', 'Vorbesitz:', 'Klasse B muss da sein (oder gleichzeitig erworben werden). Für CE braucht ihr vorher C.'],
    ],
    notes:
      '▶ Sagen: „Wer von euch ist unter 21?“ Kurz schauen. „Für euch gibt es zwei Wege.“\n' +
      '❓ „Ab wann dürft ihr Klasse C fahren?“ Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1: 21 · Klick 2: 18 mit Grundqualifikation · Klick 3: 18 in der Ausbildung · Klick 4: Vorbesitz.\n' +
      '✅ § 10 Abs. 1 FeV: C/CE ab 21; ab 18 nach Grundqualifikation nach § 2 Abs. 1 Nr. 1 BKrFQG oder während bzw. nach einer Ausbildung zum Berufskraftfahrer/Fachkraft im Fahrbetrieb. In der Ausbildungsvariante gelten Auflagen (nur Inland, nur Ausbildung) bis 21 oder Abschluss (§ 10 Abs. 1 Nr. 7).\n' +
      '✅ Wichtig für alle unter 21: Wer C mit 18 erwirbt (Grundqualifikation oder Ausbildung), muss vor der ersten Erteilung ein medizinisch-psychologisches Gutachten (MPU) vorlegen (§ 10 Abs. 2 FeV).\n' +
      '✅ C1/C1E ab 18. C setzt B voraus (§ 9 Abs. 1), CE setzt C voraus (§ 9 Abs. 2).\n' +
      '➜ „Und wie lange gilt der Führerschein dann?“',
  });
  // ===== BEFRISTUNG UND UNTERSUCHUNGEN =====
  {
    const s = base(deck, 'fs', { notes:
      '▶ Sagen: „Anders als euer Pkw-Führerschein ist C befristet: 5 Jahre. Dann müsst ihr zeigen, dass ihr noch gesund seid und gut seht.“\n' +
      '🖱 Klick 1: Zeitstrahl 5 Jahre · Klick 2: ärztliche Untersuchung · Klick 3: Augen · Klick 4: Hinweis Sehtest.\n' +
      '✅ § 23 Abs. 1 FeV: C1, C1E, C, CE längstens 5 Jahre. Verlängerung jeweils um 5 Jahre auf Antrag (§ 24), frühestens 6 Monate vor Ablauf beantragen.\n' +
      '✅ Nachweise: ärztliche Untersuchung nach Anlage 5 Nr. 1 FeV (z. B. Herz, Zucker, Nerven) und Sehvermögen nach Anlage 6 Nr. 2. Beim Ersterwerb genauso.\n' +
      '✅ Anlage 6 Nr. 2: Sehschärfe je Auge mindestens 0,8, beidäugig 1,0, dazu Farbensehen, Gesichtsfeld, räumliches Sehen, Dämmerungssehen. Der einfache Sehtest wie für B reicht nicht.\n' +
      '💡 Achtung: Das Kartendokument (die Plastikkarte) hat ein eigenes Ablaufdatum – das ist etwas anderes als die Befristung der Klasse C. Auf der Rückseite steht für jede Klasse das Ablaufdatum.\n' +
      '➜ „Kurze Frage dazu.“' });
    kick(s, 'Befristung · § 23 FeV'); title(s, 'Klasse C gilt 5 Jahre');
    const x0 = 0.9, w = 11.4;
    s.rect(x0, 2.75, w, 0.06, { fill: C.line });
    for (let j = 0; j <= 5; j++) {
      s.oval(x0 + j * w / 5 - 0.09, 2.69, 0.18, 0.18, { fill: j === 0 || j === 5 ? C.bl : C.dim, line: C.bg });
      s.text(j === 0 ? 'Erteilung' : j === 5 ? 'Ablauf' : 'Jahr ' + j, { x: x0 + j * w / 5 - 0.8, y: 2.95, w: 1.6, h: 0.3, size: 13, color: j === 0 || j === 5 ? C.bl : C.dim, align: 'center' });
    }
    s.rect(x0, 2.65, w, 0.26, { fill: C.bl }, { fx: 'wipeR', c: true, dur: 900 });
    s.text('5 Jahre', { x: x0 + w / 2 - 1, y: 2.15, w: 2, h: 0.4, size: 20, bold: true, color: C.bl, align: 'center' }, { fx: 'fade', dur: 200 });
    await point(s, 0.7, 3.55, 5.85, 1.5, 'LuStethoscope', C.bl, 'Ärztliche Untersuchung', 'Anlage 5 FeV – Herz, Blutzucker, Nerven … Höchstens 1 Jahr alt.', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 3.55, 5.85, 1.5, 'LuEye', C.bl, 'Augen-Untersuchung', 'Anlage 6 Nr. 2 FeV – Sehschärfe, Farben, Gesichtsfeld, Dämmerung.', CLICK, { br: true, size: 17 });
    s.text([{ text: 'Achtung:  ', options: { bold: true, color: C.or } }, { text: 'Der einfache Sehtest wie für Klasse B reicht für C nicht. Und das gilt beim ersten Mal und bei jeder Verlängerung.', options: { color: C.txt } }],
      { x: 0.7, y: 5.35, w: 11.93, h: 0.85, size: 17, valign: 'middle', fill: C.card2, line: C.or, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
    foot(s, 'Quellen: §§ 11, 12, 23, 24 FeV · Anlagen 5 und 6 FeV');
  }
  quiz(deck, 'fs', {
    kicker: 'Frage · Befristung', q: 'Dein C-Führerschein läuft in zwei Monaten ab. Was brauchst du für die Verlängerung?', size: 28,
    opts: ['Nichts – Antrag stellen reicht', 'Ärztliche Untersuchung und Augen-Untersuchung', 'Eine neue theoretische Prüfung'], ok: 1,
    why: 'Verlängerung um 5 Jahre mit Nachweis nach Anlage 5 (Arzt) und Anlage 6 Nr. 2 (Augen) – § 24 FeV. Eine neue Prüfung gibt es nicht.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. § 24 Abs. 1 FeV. Antrag frühestens 6 Monate vor Ablauf.\n💡 Wer die Frist verpasst, darf ab dem Ablaufdatum kein Fahrzeug der Klasse C mehr fahren – Fahren ohne Fahrerlaubnis ist eine Straftat (§ 21 StVG).\n➜ „Wer beruflich fährt, braucht noch etwas: die Berufskraftfahrer-Qualifikation.“' });
  // ===== BERUFSKRAFTFAHRER – ABGRENZUNG =====
  {
    const s = base(deck, 'fs', { notes:
      '▶ Sagen: „Der Führerschein allein reicht nicht, wenn ihr beruflich Güter fahrt. Dann braucht ihr zusätzlich die Berufskraftfahrer-Qualifikation. Das ist ein eigener Kurs mit eigener Prüfung – nicht Teil dieses Unterrichts.“\n' +
      '🖱 Klick 1: wer braucht sie · Klick 2: Ausnahmen · Klick 3: Nachweis und Weiterbildung.\n' +
      '✅ BKrFQG § 1 Abs. 1: Güter- oder Personenbeförderung mit Fahrzeugen der Klassen C1, C1E, C, CE, D1, D1E, D, DE.\n' +
      '✅ Keine Qualifikation nötig (§ 1 Abs. 2) u. a.: Material oder Maschinen für den eigenen Beruf, wenn Fahren nicht die Hauptarbeit ist (Handwerker); nichtgewerbliche Fahrten; Fahrschul- und Prüfungsfahrzeuge; Polizei, Feuerwehr, Rettungsdienst; Land- und Forstwirtschaft bis 100 km.\n' +
      '✅ Nachweis: Schlüsselzahl 95 im Führerschein bzw. Fahrerqualifizierungsnachweis – bei jeder Fahrt mitführen (§§ 7, 8). Weiterbildung alle 5 Jahre (§ 5).\n' +
      '➜ „Damit zu den Papieren: Was muss im Lkw dabei sein?“' });
    kick(s, 'Abgrenzung · Berufskraftfahrer'); title(s, 'Beruflich fahren: die „95“');
    await point(s, 0.7, 2.05, 11.93, 1.2, 'LuBriefcase', C.bl, 'Wer braucht sie?', 'Alle, die mit Klasse C beruflich Güter befördern – Spedition, Paketdienst, Baustoffhandel …', CLICK, { br: true, size: 18 });
    await point(s, 0.7, 3.4, 11.93, 1.2, 'LuWrench', C.gr, 'Wer nicht?', 'Handwerker mit eigenem Material (Fahren ist nicht die Hauptarbeit), private Fahrten, Fahrschule und Prüfung, Feuerwehr …', CLICK, { br: true, size: 18 });
    await point(s, 0.7, 4.75, 11.93, 1.2, 'LuIdCard', C.or, 'Nachweis', 'Fahrerqualifizierungsnachweis (Karte) oder „95“ im Führerschein – bei jeder Fahrt dabei. Weiterbildung alle 5 Jahre.', CLICK, { br: true, size: 18 });
    foot(s, 'Berufskraftfahrerqualifikationsgesetz (BKrFQG) §§ 1, 5, 7, 8 – eigener Kurs, nicht Teil des Fahrschulunterrichts');
  }
  // ===== PAPIERE =====
  {
    const s = base(deck, 'fs', { notes:
      '▶ Sagen: „Stellt euch vor: Kontrolle auf dem Rastplatz. Was will der Beamte sehen?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–6: je ein Papier.\n' +
      '✅ Führerschein (§ 4 Abs. 2 FeV) · Zulassungsbescheinigung Teil I (§ 13 Abs. 6 FZV) · Fahrerkarte plus Ausdrucke bzw. Aufzeichnungen des laufenden Tages und der vorausgehenden 56 Tage (Art. 36 VO (EU) 165/2014) · Nachweis Berufskraftfahrer: 95 oder Fahrerqualifizierungsnachweis (§ 8 BKrFQG) · bei gewerblichem Güterkraftverkehr: beglaubigte Kopie der Lizenz, nicht eingeschweißt (§ 7 GüKG) · Ladungspapiere (Thema in C2).\n' +
      '💡 Urlaub oder Krankheit (Tage ohne Fahrerkarte) werden vor Fahrtantritt als manueller Nachtrag auf der Fahrerkarte eingetragen (§ 20 FPersV). Eine Bescheinigung vom Chef ist nur noch die Ausnahme.\n' +
      '➜ „Jetzt kommt das Thema, das euch im Beruf jeden Tag begleitet: Wie lange dürft ihr fahren?“' });
    kick(s, 'Kontrolle · Was muss dabei sein?'); title(s, 'Papiere im Lkw');
    const T = [
      ['LuIdCard', 'Führerschein', 'mit gültiger Klasse C'],
      ['LuFileText', 'Fahrzeugschein', 'Zulassungsbescheinigung Teil I'],
      ['LuCreditCard', 'Fahrerkarte', 'plus Ausdrucke: heute und die letzten 56 Tage'],
      ['LuGraduationCap', 'Nachweis „95“', 'wenn ihr beruflich fahrt'],
      ['LuFileCheck', 'Lizenz-Kopie', 'beglaubigt, nicht eingeschweißt – bei gewerblichem Transport'],
      ['LuPackage', 'Ladungspapiere', 'Frachtbrief / Begleitpapier – kommt in C2'],
    ];
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2), x = 0.7 + col * 6.08, y = 2.05 + row * 1.5;
      await point(s, x, y, 5.85, 1.3, T[i][0], C.bl, T[i][1], T[i][2], CLICK, { br: true, size: 18 });
    }
  }
};
