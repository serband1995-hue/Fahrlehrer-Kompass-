// C1 Kapitel 3: Fahrtenschreiber (VO (EU) Nr. 165/2014, FPersV)
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, chapter, foot, svgImg, tachoSym } = require('../gs');
const { icon } = require('../lib');

sec('ft', 'C1  ·  FAHRTENSCHREIBER', C.pu, 'bg_pu.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ft', { num: 3, ttl: 'Der Fahrtenschreiber', ttlW: 5.2, sub: 'Er schreibt alles mit – und ihr müsst es bei jeder Kontrolle zeigen können.', bg: 'f_tacho.jpg', notes:
    '▶ Sagen: „Woher weiß die Polizei, wie lange ihr gefahren seid? Vom Fahrtenschreiber. Er sitzt im Armaturenbrett, und eure persönliche Fahrerkarte steckt darin.“\n🖱 Keine Klicks.\n➜ „Was genau zeichnet er auf?“' });
  // ===== WAS WIRD AUFGEZEICHNET =====
  {
    const s = base(deck, 'ft', { notes:
      '▶ Sagen: „Der digitale Fahrtenschreiber speichert auf zwei Wegen: im Gerät selbst und auf eurer Fahrerkarte.“\n' +
      '❓ „Was meint ihr, was alles gespeichert wird?“\n' +
      '🖱 Klick 1: Tätigkeiten · Klick 2: Tempo und Strecke · Klick 3: Ort · Klick 4: Ereignisse.\n' +
      '✅ Lenken, andere Arbeit, Bereitschaft, Ruhe (die Symbole von vorhin). Dazu Geschwindigkeit und gefahrene Kilometer.\n' +
      '✅ Der intelligente Fahrtenschreiber (Smart-Tacho) speichert zusätzlich Standorte, z. B. Beginn und Ende der Arbeit und alle drei Stunden Lenkzeit, und den Grenzübertritt automatisch.\n' +
      '✅ Ereignisse und Fehler: Fahren ohne Karte, Geschwindigkeitsüberschreitung, Stromunterbrechung.\n' +
      '💡 Die Behörde kann manche Daten sogar aus der Ferne während der Fahrt abfragen (Fernkommunikation), um gezielt zu kontrollieren.\n' +
      '➜ „Das Wichtigste daran: die Fahrerkarte.“' });
    kick(s, 'Was wird gespeichert?'); title(s, 'Er vergisst nichts');
    const syms = ['lenken', 'arbeit', 'bereit', 'ruhe'];
    card(s, 0.7, 2.05, 11.93, 1.05, {}, CLICK);
    for (let i = 0; i < 4; i++) s.img(await svgImg(tachoSym(syms[i], '#7AA2FF')), { x: 1.0 + i * 0.75, y: 2.3, w: 0.55, h: 0.55 }, { fx: 'fade', dur: 200 });
    s.text([{ text: 'Tätigkeiten  ', options: { bold: true, color: C.txt } }, { text: 'Lenken, andere Arbeit, Bereitschaft, Pause/Ruhe – minutengenau', options: { color: C.mut } }], { x: 4.15, y: 2.05, w: 8.3, h: 1.05, size: 18, valign: 'middle' }, { fx: 'fade', dur: 200 });
    await point(s, 0.7, 3.25, 11.93, 1.0, 'LuGauge', C.pu, 'Tempo und Strecke', 'Geschwindigkeit, gefahrene Kilometer, Uhrzeit', CLICK, { size: 18 });
    await point(s, 0.7, 4.4, 11.93, 1.0, 'LuMapPin', C.pu, 'Ort', 'der neue „intelligente“ Fahrtenschreiber: Standorte und Grenzübertritte automatisch', CLICK, { size: 18 });
    await point(s, 0.7, 5.55, 11.93, 1.0, 'LuTriangleAlert', C.red, 'Ereignisse', 'Fahren ohne Karte, zu schnell, Stromunterbrechung, Manipulationsversuch', CLICK, { size: 18 });
  }
  // ===== FAHRERKARTE =====
  {
    const s = base(deck, 'ft', { notes:
      '▶ Sagen: „Die Fahrerkarte ist euer persönlicher Ausweis für den Fahrtenschreiber. Sie gehört euch, nicht dem Chef.“\n' +
      '🖱 Klick 1–4: je eine Regel.\n' +
      '✅ Nur eine einzige gültige Fahrerkarte pro Person (Art. 27 VO 165/2014). Gültig höchstens 5 Jahre (Art. 26 Abs. 6). Ausgestellt vom Staat, in dem ihr wohnt. Erneuerung spätestens 15 Arbeitstage vor Ablauf beantragen (Art. 28 Abs. 1).\n' +
      '✅ Persönlich: Niemand anderes darf mit eurer Karte fahren, ihr nicht mit fremder. Das ist verboten und wird hart bestraft.\n' +
      '✅ Beim Fahren muss die Karte im Gerät stecken – ab Arbeitsbeginn bis Arbeitsende.\n' +
      '✅ Nach Ablauf muss die alte Karte noch mindestens 28 Kalendertage im Fahrzeug mitgeführt werden (§ 6 FPersV).\n' +
      '💡 Fahrer mit Fahrzeugwechsel: Karte mitnehmen und im neuen Fahrzeug stecken.\n' +
      '➜ „Wie weit zurück muss man bei einer Kontrolle Nachweise zeigen?“' });
    kick(s, 'Die Fahrerkarte'); title(s, 'Euer persönlicher Schlüssel');
    // Karte als Grafik
    s.rrect(8.2, 2.2, 4.2, 2.65, { fill: '2B3F73', line: C.pu, lw: 2, rr: 0.08, shadow: true }, { fx: 'rise', auto: true, dur: 800 });
    s.rrect(8.55, 3.05, 0.7, 0.55, { fill: 'C9A227', rr: 0.15 });
    s.text('FAHRERKARTE', { x: 8.5, y: 2.35, w: 3.6, h: 0.4, size: 16, bold: true, color: C.white, cs: 3 });
    s.text('D', { x: 11.55, y: 2.3, w: 0.6, h: 0.5, size: 22, bold: true, color: C.am, align: 'center', fill: '1E2E5A', shape: deck.pres.shapes.OVAL });
    s.rect(9.5, 3.15, 2.6, 0.08, { fill: '6B7FB5' }); s.rect(9.5, 3.4, 2.0, 0.08, { fill: '6B7FB5' });
    s.rect(8.55, 4.0, 3.5, 0.08, { fill: '6B7FB5' }); s.rect(8.55, 4.25, 2.8, 0.08, { fill: '6B7FB5' });
    const T = [['LuLock', 'Persönlich', 'Nur ihr fahrt damit. Nie fremde Karte benutzen.'], ['LuCircleAlert', 'Nur eine', 'Jeder darf nur eine gültige Fahrerkarte haben.'], ['LuCalendar', 'Höchstens 5 Jahre', 'gültig. Neue Karte spätestens 15 Arbeitstage vorher beantragen.'], ['LuCreditCard', 'Immer stecken', 'ab Übernahme des Lkw bis Ende der Arbeitszeit.']];
    for (let i = 0; i < 4; i++) await point(s, 0.7, 2.05 + i * 1.12, 7.1, 0.98, T[i][0], C.pu, T[i][1], T[i][2], CLICK, { size: 17 });
  }
  // ===== 56 TAGE (Kalender-Diagramm) =====
  {
    const s = base(deck, 'ft', { notes:
      '▶ Sagen: „Bei einer Kontrolle müsst ihr nachweisen können, was ihr heute und an den letzten 56 Tagen gemacht habt.“\n' +
      '❓ Vorher fragen: „Was schätzt ihr – wie weit zurück?“\n' +
      '🖱 Klick 1: heute · Klick 2: die 56 Tage davor · Klick 3: was zählt dazu.\n' +
      '✅ Art. 36 VO (EU) 165/2014 (geändert durch VO 2020/1054): laufender Tag und die vorausgehenden 56 Tage, seit 31.12.2024. Vorher waren es 28 Tage.\n' +
      '✅ Nachweis: Fahrerkarte, Ausdrucke, handschriftliche Aufzeichnungen bzw. Schaublätter (wenn ihr in der Zeit ein Fahrzeug mit analogem Gerät gefahren seid).\n' +
      '💡 Für Transporter von 2,8 bis 3,5 t (nur Deutschland, Aufzeichnung von Hand) gelten nach § 1 Abs. 6 FPersV weiterhin der laufende Tag und 28 Tage.\n' +
      '➜ „Und wenn die Karte weg ist?“' });
    kick(s, 'Kontrolle · Art. 36 VO 165/2014'); title(s, 'Heute + 56 Tage zurück');
    const cols = 19, sz = 0.42, g = 0.08, x0 = 0.95, y0 = 2.2;
    const pos = d => { const r = Math.floor(d / cols), c = d % cols; return [x0 + c * (sz + g), y0 + r * (sz + g)]; };
    { const [x, y] = pos(56); s.rect(x, y, sz, sz, { fill: C.am }, { fx: 'zoom', c: true, dur: 350 }); }
    s.text('HEUTE', { x: x0 + 18 * (sz + g) - 0.6, y: y0 + 3 * (sz + g) - 0.05, w: 1.6, h: 0.35, size: 13, bold: true, color: C.am, align: 'center' }, { fx: 'fade', dur: 200 });
    for (let d = 55; d >= 0; d--) { const [x, y] = pos(d); s.rect(x, y, sz, sz, { fill: C.pu, ft: 15 }, { fx: 'fade', c: d === 55, dur: 120, d: (55 - d) * 18 }); }
    s.text([{ text: '56 Tage ', options: { bold: true, color: C.pu } }, { text: 'davor – etwa zwei Monate', options: { color: C.txt } }], { x: x0, y: y0 + 3 * (sz + g) + 0.35, w: 7, h: 0.4, size: 18 }, { fx: 'fade', dur: 200 });
    s.text([{ text: 'Nachweis durch:  ', options: { bold: true, color: C.pu } }, { text: 'Fahrerkarte · Ausdrucke · handschriftliche Aufzeichnungen · Schaublätter (bei Fahrzeugen mit altem Gerät)', options: { color: C.txt } }],
      { x: 0.7, y: 5.55, w: 11.93, h: 0.85, size: 17, valign: 'middle', fill: C.card2, line: C.pu, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
    foot(s, 'Seit 31.12.2024 – vorher waren es 28 Tage');
  }
  // ===== KARTE VERLOREN =====
  {
    const s = base(deck, 'ft', { notes:
      '▶ Sagen: „Die Karte ist kaputt, verloren oder gestohlen. Was jetzt?“\n' +
      '❓ Erst sammeln, dann klicken.\n' +
      '🖱 Klick 1: melden · Klick 2: Ersatz beantragen · Klick 3: weiterfahren mit Ausdrucken · Klick 4: Grenze 15 Tage.\n' +
      '✅ Art. 29 VO (EU) 165/2014: Diebstahl bei der Behörde vor Ort anzeigen, Verlust beim Ausstellerstaat melden, eine beschädigte oder defekte Karte bei der ausstellenden Behörde zurückgeben (Art. 29 Abs. 2). Ersatzkarte binnen 7 Kalendertagen beantragen.\n' +
      '✅ Weiterfahren ohne Karte höchstens 15 Kalendertage (länger nur, um zum Standort zurückzukommen). Dabei bei Beginn und Ende der Fahrt einen Ausdruck machen, darauf Name, Kartennummer bzw. Führerscheinnummer und Unterschrift; manuell auch Zeiten anderer Arbeit, Bereitschaft und Pausen (Art. 35).\n' +
      '💡 Ohne Ausdrucke wirkt das bei der Kontrolle wie Fahren ohne Karte – das ist teuer.\n' +
      '➜ „Und wenn ihr ins Ausland fahrt?“' });
    kick(s, 'Karte verloren oder defekt'); title(s, 'Was tun – und wie schnell?');
    const T = [['LuPhone', 'Melden', 'Diebstahl der Polizei, Verlust der ausstellenden Behörde – defekte Karte dort zurückgeben.'], ['LuFileText', 'Ersatz beantragen', 'innerhalb von 7 Kalendertagen.'], ['LuReceipt', 'Ausdrucke machen', 'bei Fahrtbeginn und Fahrtende – Name, Kartennummer, Unterschrift drauf.'], ['LuTimer', 'Höchstens 15 Tage', 'ohne Karte fahren. Danach nur noch zurück zum Standort.']];
    for (let i = 0; i < 4; i++) {
      const y = 2.05 + i * 1.13;
      s.text(String(i + 1), { x: 0.7, y: y + 0.2, w: 0.55, h: 0.55, size: 18, bold: true, color: C.dark, fill: C.pu, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'zoom', c: true, dur: 250 });
      await point(s, 1.45, y, 11.18, 0.98, T[i][0], C.pu, T[i][1], T[i][2], { fx: 'flyL', dur: 400 }, { size: 17 });
    }
  }
  // ===== AUSLAND UND NACHTRÄGE =====
  await ask(deck, 'ft', {
    kicker: 'Grenze und Nachträge', q: 'Ihr fahrt von Frankfurt nach Lyon. Was müsst ihr am Fahrtenschreiber beachten?', ico: 'LuGlobe', qsize: 30,
    answers: [
      ['LuFlag', 'Grenzübertritt:', 'Land eingeben – am nächsten möglichen Halteort nach der Grenze. Der Smart-Tacho Version 2 macht es automatisch.'],
      ['LuClipboardList', 'Manueller Nachtrag:', 'Zeiten ohne Karte im Gerät (z. B. Urlaub, frei, Krankheit) vor Fahrtbeginn auf der Karte nachtragen.'],
      ['LuShieldCheck', 'Regeln gleich:', 'Lenk- und Ruhezeiten gelten in Frankreich genauso – es ist dieselbe EU-Verordnung.'],
    ],
    notes:
      '▶ Sagen: „Ihr fahrt ins Ausland. Woran müsst ihr denken?“\n' +
      '❓ Sammeln lassen.\n' +
      '🖱 Klick 1: Grenzübertritt · Klick 2: Nachtrag · Klick 3: gleiche Regeln.\n' +
      '✅ Art. 34 Abs. 7 VO 165/2014: Ländersymbol nach dem Grenzübertritt am nächstmöglichen Halteplatz eingeben. Beim intelligenten Fahrtenschreiber Version 2 (Neufahrzeuge seit August 2023, im Auslandsverkehr nachgerüstet) wird der Grenzübertritt automatisch aufgezeichnet.\n' +
      '✅ Nachträge: Zeiten, in denen die Karte nicht im Gerät war (frei, Urlaub, Krankheit, anderes Fahrzeug ohne Fahrtenschreiber), werden über die manuelle Eingabe auf der Karte nachgetragen (Art. 34 Abs. 3; § 20 FPersV).\n' +
      '➜ „Kurzer Test.“',
  });
  quiz(deck, 'ft', {
    kicker: 'Frage · Fahrerkarte', q: 'Deine Fahrerkarte ist am Montag kaputtgegangen. Was ist richtig?', size: 30,
    opts: ['Ich darf erst wieder fahren, wenn die neue Karte da ist', 'Ich fahre mit der Karte eines Kollegen weiter', 'Ersatz innerhalb von 7 Tagen beantragen, bis zu 15 Tage mit Ausdrucken fahren'], ok: 2,
    why: 'Art. 29 VO (EU) 165/2014. Eine fremde Karte zu benutzen ist verboten. Ausdrucke bei Beginn und Ende der Fahrt mit Name und Unterschrift.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ C. Ersatzkarte binnen 7 Kalendertagen beantragen; höchstens 15 Kalendertage ohne Karte mit Ausdrucken.\n💡 B ist ein schwerer Verstoß: Karte eines anderen benutzen. Dann stimmen alle Aufzeichnungen nicht mehr.\n➜ „Jetzt euer Arbeitsplatz.“',
  });
};
