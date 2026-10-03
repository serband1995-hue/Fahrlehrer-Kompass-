// C1 Kapitel 4: Arbeitsplatz – Sitz, Spiegel, toter Winkel, Rechtsabbiegen, Abbiegeassistent
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, chapter, foot, steps, veh, svgImg, photoAsk } = require('../gs');
const { icon } = require('../lib');

sec('ap', 'C1  ·  ARBEITSPLATZ UND TOTER WINKEL', C.red, 'bg_red.jpg');

// Szene (Draufsicht): senkrechte Straße, Kreuzung oben, Radweg rechts
const SX = 5.6, SY = 1.25, SW = 13.333 - 5.6, SH = 6.85 - 1.25;
const PX = 100; // Pixel pro Zoll für das Sichtfeld-SVG
const P = (x, y) => `${((x - SX) * PX).toFixed(0)},${((y - SY) * PX).toFixed(0)}`;
const poly = (pts, fill, op) => `<polygon points="${pts.map(p => P(...p)).join(' ')}" fill="#${fill}" fill-opacity="${op}"/>`;

function scene(s) {
  // Gehwege / Flächen
  s.rect(SX, SY, SW, SH, { fill: '1A2029', name: '!!ground' });
  // senkrechte Straße (2 Fahrstreifen) x 8.4–10.8
  s.rect(8.4, SY, 2.4, SH, { fill: C.road, name: '!!rv' });
  // waagrechte Straße y 1.55–3.15
  s.rect(SX, 1.55, SW, 1.6, { fill: C.road, name: '!!rh' });
  // Mittellinien
  for (let k = 0, y = 3.5; y < 6.8; y += 0.7, k++) s.rect(9.58, y, 0.045, 0.38, { fill: C.mark, name: '!!mv' + k });
  for (let k = 0, x = SX + 0.1; x < 13.2; x += 0.7, k++) if (x < 8.3 || x > 11.3) s.rect(x, 2.33, 0.38, 0.045, { fill: C.mark, name: '!!mh' + k });
  // Haltlinie
  s.rect(9.62, 3.3, 1.18, 0.07, { fill: C.mark, name: '!!stop' });
  // Radweg rechts (rot), über die Kreuzung gestrichelt
  s.rect(10.8, 3.15, 0.5, SY + SH - 3.15, { fill: '7A2E2E', name: '!!rad' });
  for (let k = 0, y = 1.6; y < 3.1; y += 0.32, k++) s.rect(10.8, y, 0.5, 0.18, { fill: '7A2E2E', name: '!!radx' + k });
  s.rect(11.3, 3.15, 0.08, SY + SH - 3.15, { fill: C.curb, name: '!!radc' });
}

// Sichtfelder (Kabine vorn bei y≈3.45, rechter Spiegel bei x≈10.65, y≈3.75)
const FIELDS = {
  direct: poly([[9.95, 3.7], [7.6, SY], [13.33, SY], [13.33, 2.9], [11.4, 3.4]], 'FFFFFF', 0.10),
  vi: poly([[9.6, 3.0], [10.75, 3.0], [10.75, 3.45], [9.6, 3.45]], '38D98A', 0.45),
  v: poly([[10.65, 3.45], [11.45, 3.45], [11.45, 4.45], [10.65, 4.45]], '4CC9F0', 0.45),
  iv: poly([[10.65, 5.15], [11.2, 5.15], [12.6, 6.85], [10.65, 6.85]], 'FFB547', 0.35),
  ii: poly([[10.65, 5.9], [10.95, 5.9], [11.35, 6.85], [10.65, 6.85]], 'F2C230', 0.55),
  gap: poly([[10.65, 4.45], [11.45, 4.45], [11.45, 5.15], [10.65, 5.15]], 'FF5C5C', 0.55),
};
const TX = 10.2, TY = 4.95; // Lkw-Mitte (rechter Fahrstreifen)

module.exports = async (deck) => {
  await chapter(deck, 'ap', { num: 4, ttl: 'Arbeitsplatz und toter Winkel', sub: 'Hoch oben sitzen heißt nicht, alles zu sehen.', bg: 'f_spiegel.jpg', bgX: 7.0, notes:
    '▶ Sagen: „Letztes Kapitel von C1: euer Arbeitsplatz. Ihr sitzt fast zwei Meter höher als im Auto. Man denkt: Ich sehe alles. Das stimmt leider nicht.“\n🖱 Keine Klicks.\n➜ „Bevor ihr losfahrt, stellt ihr alles ein.“' });
  // ===== EINSTELLEN =====
  {
    const s = base(deck, 'ap', { notes:
      '▶ Sagen: „Vor jeder Fahrt – und nach jedem Fahrerwechsel – stellt ihr euren Arbeitsplatz ein. Die Reihenfolge ist wichtig.“\n' +
      '❓ „Warum zuerst der Sitz und erst dann die Spiegel?“ ✅ Weil sich mit der Sitzposition der Blickwinkel in die Spiegel ändert.\n' +
      '🖱 Klick 1: Sitz · Klick 2: Lenkrad · Klick 3: Spiegel · Klick 4: Sicht frei · Klick 5: Klima.\n' +
      '✅ Spiegel bzw. Kamera-Monitor-Systeme müssen nach hinten, zur Seite und unmittelbar vor dem Fahrzeug alle wesentlichen Vorgänge zeigen (§ 56 StVZO).\n' +
      '✅ Sicht und Gehör dürfen nicht beeinträchtigt sein (§ 23 Abs. 1 StVO): nichts an die Scheibe hängen, was die Sicht nimmt. Navi und Handy nicht in die Hand nehmen (§ 23 Abs. 1a).\n' +
      '💡 Klima: angenehm kühl (Richtwert etwa 20–22 °C), Frischluft. Zu warm macht müde. Beschlagene Scheiben sofort frei machen.\n' +
      '➜ „Schaut euch dieses Foto an: Wie viele Spiegel seht ihr?“' });
    kick(s, 'Vor der Fahrt'); title(s, 'Erst der Sitz, dann die Spiegel');
    const T = [['LuArmchair', 'Sitz', 'Rücken anlehnen, Pedale ganz durchtreten, Beine leicht gebeugt'], ['LuCircleDot', 'Lenkrad', 'Hände oben auf dem Kranz – Arme noch leicht angewinkelt'], ['LuEye', 'Alle Spiegel', 'jeden Spiegel einzeln einstellen – auch Rampen- und Frontspiegel'], ['LuEyeOff', 'Sicht frei', 'nichts an der Scheibe, das die Sicht nimmt – Navi nicht in die Hand'], ['LuThermometer', 'Klima', 'nicht zu warm, Frischluft – Wärme macht müde']];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.93;
      s.text(String(i + 1), { x: 0.7, y: y + 0.14, w: 0.52, h: 0.52, size: 18, bold: true, color: C.dark, fill: C.red, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'zoom', c: true, dur: 250 });
      await point(s, 1.45, y, 11.18, 0.8, T[i][0], C.red, T[i][1], T[i][2], { fx: 'flyL', dur: 400 }, { size: 18 });
    }
  }
  // ===== FOTO: SPIEGEL =====
  await photoAsk(deck, 'ap', {
    bg: 'f_spiegel.jpg', kicker: 'Spiegel am Lkw', q: 'Welche Spiegel hat ein Lkw – und wozu?', qsize: 34, w: 5.4, ov: 7.4, asize: 15, bgX: 7.0,
    marks: [[10.35, 2.9], [10.35, 4.45], [10.0, 1.3], [12.55, 1.85]],
    answers: [
      ['LuEye', 'Hauptspiegel', 'nach hinten, entlang der Seite'],
      ['LuEye', 'Weitwinkelspiegel', 'der kleine darunter: breiter, neben dem Lkw'],
      ['LuEye', 'Rampenspiegel', 'über der Tür: direkt neben dem Fahrerhaus'],
      ['LuEye', 'Frontspiegel', 'über der Scheibe: direkt vor der Stoßstange'],
    ],
    notes:
      '▶ Sagen: „Schaut euch das Foto an: die Beifahrerseite eines Lkw. Vorn an der Fahrerhaus-Ecke hängen zwei Spiegel übereinander, oben an der Scheibe sitzt der Frontspiegel.“\n' +
      '❓ „Welche Spiegel hat ein Lkw, und wofür ist welcher?“\n' +
      '🖱 Klick 1: Hauptspiegel · Klick 2: Weitwinkelspiegel · Klick 3: Rampenspiegel · Klick 4: Frontspiegel.\n' +
      '✅ Nach UN-Regelung 46 (gilt über § 56 StVZO): Hauptaußenspiegel (Klasse II), Weitwinkelspiegel (IV), Nahbereichs-/Rampenspiegel (V, Beifahrerseite), Frontspiegel (VI). Für schwere Lkw über 7,5 t sind alle vier vorgeschrieben; bei leichteren hängt es von Bauart und Einbauhöhe ab.\n' +
      '💡 Statt Spiegeln gibt es heute auch Kamera-Monitor-Systeme – die Regeln für die Sichtfelder sind dieselben.\n' +
      '➜ „Was die Spiegel zeigen – und was nicht –, schauen wir uns jetzt von oben an.“',
  });
  // ===== TOTER WINKEL (MORPH, DRAUFSICHT) =====
  const BIKE = [[11.05, 6.55], [11.05, 5.6], [11.05, 4.8], [11.05, 4.8], [11.05, 4.8], [11.05, 1.95], [11.05, 1.8], [11.05, 1.65]];
  await steps(deck, 'ap', {
    kicker: 'Toter Winkel · Draufsicht', ttl: 'Rechts abbiegen',
    list: ['Lkw will rechts abbiegen', 'Was ihr direkt seht', 'Was die Spiegel zeigen', 'Der tote Winkel', 'Assistent warnt – Schrittgeschwindigkeit', 'Radfahrer zuerst', 'Jetzt abbiegen'],
    caps: [
      'Ihr steht an der Kreuzung und wollt rechts abbiegen. Rechts neben euch: ein Radweg. Von hinten kommt ein Radfahrer.',
      'Durch die Scheiben seht ihr nach vorn und weit nach rechts – aber nicht nach unten neben das Fahrerhaus.',
      'Die Spiegel füllen die Lücken: Front-, Rampen-, Weitwinkel- und Hauptspiegel. Jeder zeigt nur seinen Bereich.',
      'Zwischen den Bereichen bleibt eine Lücke. Genau dort fährt jetzt der Radfahrer – ihr seht ihn nicht.',
      'Der Abbiegeassistent warnt. Ihr fahrt nur in Schrittgeschwindigkeit an und schaut mehrfach in alle Spiegel.',
      'Der Radfahrer fährt geradeaus über die Kreuzung. Er hat Vorrang – ihr wartet.',
      'Erst jetzt, wenn alles frei ist, lenkt ihr langsam ein. Spiegel weiter im Blick behalten.',
      'Im Bogen um die Ecke – bis auch das Heck ganz herum ist, bleibt der Blick in den Spiegeln.',
    ],
    notes: [
      '▶ Sagen: „Die gefährlichste Situation für Lkw in der Stadt: Rechtsabbiegen mit Radweg daneben.“\n❓ „Wo könnte hier ein Problem sein?“\n🖱 Keine Animation auf dieser Folie – nächster Klick = nächster Schritt (Morph).\n➜ „Was seht ihr ohne Spiegel?“',
      '▶ „Durch die Frontscheibe und das rechte Fenster seht ihr viel – aber nicht nach unten direkt neben euch. Die Tür und die Höhe verdecken alles.“\n💡 Ein Kind oder ein Radfahrer direkt neben dem Fahrerhaus ist ohne Spiegel unsichtbar.\n➜ „Dafür gibt es die Spiegel.“',
      '▶ „Grün: Frontspiegel – direkt vor der Stoßstange. Blau: Rampenspiegel – direkt neben der Tür. Orange: Weitwinkelspiegel. Gelb: Hauptspiegel – weit nach hinten.“\n✅ Spiegelklassen VI, V, IV, II nach UN-R 46 (§ 56 StVZO).\n💡 Das Bild ist schematisch. Wie groß die Bereiche wirklich sind, hängt vom Lkw und von der Einstellung ab.\n➜ „Und trotzdem …“',
      '▶ „Rot: Hier zeigt kein Spiegel richtig hin, oder ihr schaut gerade in einen anderen Spiegel. Das ist der tote Winkel. Und genau da ist jetzt der Radfahrer.“\n❓ „Was heißt das für euch?“ ✅ Nie darauf verlassen, dass da niemand ist. Mehrfach schauen, langsam fahren.\n💡 Für den Radfahrer ist der Lkw riesig – er denkt oft, der Fahrer sieht ihn.\n➜ „Was hilft?“',
      '▶ „Neue Lkw haben einen Abbiegeassistenten. Er warnt, wenn neben euch jemand ist. Und das Gesetz sagt: Innerorts beim Rechtsabbiegen mit über 3,5 t nur Schrittgeschwindigkeit, wenn mit Radfahrern oder Fußgängern zu rechnen ist.“\n✅ § 9 Abs. 6 StVO; Verstoß: 70 €, 1 Punkt (BKat Nr. 45).\n✅ Abbiegeassistent Pflicht (VO (EU) 2019/2144): für neue Fahrzeugtypen seit 6.7.2022, für alle neu zugelassenen Lkw (N2, N3) seit 7.7.2024.\n➜ „Wer fährt zuerst?“',
      '▶ „Der Radfahrer fährt geradeaus. Er hat Vorrang (§ 9 Abs. 3 StVO). Ihr wartet, bis er sicher vorbei ist.“\n💡 Im Zweifel: stehen bleiben. Lieber 10 Sekunden warten als ein Leben lang damit leben.\n➜ „Und jetzt?“',
      '▶ „Jetzt lenkt ihr ein – langsam. Der Radfahrer ist vorbei, aber schaut weiter in die Spiegel.“\n➜ „Und das Heck?“',
      '▶ „Jetzt biegt ihr ab – langsam, und ihr schaut weiter in die Spiegel. Beim Abbiegen schwenkt das Heck nach außen aus, und die Hinterräder schneiden die Kurve innen.“\n💡 Mit Anhänger (CE) wird das noch enger – das kommt in CE4.\n➜ „Was sagt das Gesetz genau zum Abbiegen mit Lkw?“',
    ],
    legend: 'Draufsicht · schematisch · Bereiche je nach Lkw und Spiegeleinstellung verschieden',
    scene: async (s, i) => {
      scene(s);
      // Sichtfelder als Bild (Ebene über der Straße)
      let svg = '';
      if (i >= 1 && i <= 4) svg += FIELDS.direct;
      if (i >= 2 && i <= 4) svg += FIELDS.vi + FIELDS.v + FIELDS.iv + FIELDS.ii;
      if (i >= 3 && i <= 4) svg += FIELDS.gap;
      s.img(await svgImg(svg || '<rect width="1" height="1" fill-opacity="0"/>', Math.round(SW * PX), Math.round(SH * PX)), { x: SX, y: SY, w: SW, h: SH, name: '!!fields' });
      // Lkw
      // Lkw: geradeaus wartend, dann im Bogen (Zwischenbild 45°), dann in der Querstraße
      const [cx, cy, th] = i < 6 ? [TX, TY, 0] : i === 6 ? [10.97, 3.85, 45] : [11.75, 2.75, 90];
      veh(s, 'truck.png', cx, cy, th, '!!truck');
      const tr = th * Math.PI / 180, bx0 = 0.25, by0 = -1.35;      // Blinker vorn rechts am Fahrerhaus, dreht mit
      veh(s, 'blinkR.png', cx + bx0 * Math.cos(tr) - by0 * Math.sin(tr), cy + bx0 * Math.sin(tr) + by0 * Math.cos(tr), th, '!!blk', { size: [0.3, 0.3] });
      // Radfahrer
      const [bx, by] = BIKE[i];
      veh(s, 'bike.png', bx, by, 0, '!!bike', { scale: 1.1 });
      // Beschriftungen
      if (i >= 2 && i <= 4) {
        s.text('VI', { x: 9.62, y: 2.97, w: 0.4, h: 0.36, size: 14, bold: true, color: C.white, fill: '0B111A', line: C.gr, lw: 1.5, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!lvi' });
        s.text('V', { x: 11.5, y: 3.57, w: 0.4, h: 0.36, size: 14, bold: true, color: C.white, fill: '0B111A', line: C.bl, lw: 1.5, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!lv' });
        s.text('IV', { x: 12.0, y: 6.17, w: 0.4, h: 0.36, size: 14, bold: true, color: C.white, fill: '0B111A', line: C.or, lw: 1.5, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!liv' });
        s.text('II', { x: 11.38, y: 6.42, w: 0.4, h: 0.36, size: 14, bold: true, color: C.white, fill: '0B111A', line: C.am, lw: 1.5, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!lii' });
      }
      if (i >= 3 && i <= 4) s.text('toter Winkel', { x: 11.55, y: 4.6, w: 1.7, h: 0.35, size: 14, bold: true, color: C.red, name: '!!ltw' });
      if (i === 4) {
        s.rrect(5.85, 4.05, 2.35, 1.2, { fill: '3A1515', line: C.red, lw: 2, rr: 0.12, name: '!!warn' });
        s.text('⚠  WARNUNG', { x: 5.9, y: 4.12, w: 2.25, h: 0.45, size: 16, bold: true, color: C.red, align: 'center', name: '!!warnt' });
        s.text('Schrittgeschwindigkeit!', { x: 5.9, y: 4.6, w: 2.25, h: 0.5, size: 18, bold: true, color: C.txt, align: 'center', name: '!!warnt2' });
      }
    },
  });
  // ===== GESETZ: RECHTSABBIEGEN =====
  {
    const s = base(deck, 'ap', { notes:
      '▶ Sagen: „Für Lkw gibt es beim Rechtsabbiegen innerorts eine eigene Regel.“\n' +
      '❓ „Was meint ihr: Wie schnell dürft ihr innerorts rechts abbiegen, wenn Radfahrer da sein können?“\n' +
      '🖱 Klick 1: die Regel · Klick 2: was es kostet · Klick 3: was Schrittgeschwindigkeit heißt.\n' +
      '✅ § 9 Abs. 6 StVO: Wer ein Kfz mit zulässiger Gesamtmasse über 3,5 t führt, muss innerorts beim Rechtsabbiegen Schrittgeschwindigkeit fahren, wo mit geradeaus fahrendem Radverkehr oder querenden Fußgängern zu rechnen ist.\n' +
      '✅ Verstoß: 70 €, 1 Punkt (BKat Nr. 45).\n' +
      '💡 Eine Zahl steht nicht im Gesetz. Die Begründung zur StVO-Novelle 2020 nennt für das Rechtsabbiegen etwa 7 bis 11 km/h; Gerichte sehen Schrittgeschwindigkeit sonst eher bei 4 bis 7 km/h. Merksatz: so langsam, dass ihr sofort stehen könnt.\n' +
      '💡 Außerorts gilt die Sonderregel nicht – Vorsicht ist trotzdem Pflicht.\n' +
      '➜ „Und was hilft euch die Technik?“' });
    kick(s, 'Rechtsabbiegen · § 9 Abs. 6 StVO'); title(s, 'Innerorts: Schrittgeschwindigkeit');
    await point(s, 0.7, 2.1, 11.93, 1.2, 'LuTruck', C.red, 'Über 3,5 t, innerorts, rechts abbiegen', 'und Radfahrer oder Fußgänger können kommen → Schrittgeschwindigkeit.', CLICK, { br: true, size: 19 });
    await point(s, 0.7, 3.5, 11.93, 1.2, 'LuEuro', C.or, '70 € und 1 Punkt', 'wenn ihr schneller fahrt (BKat Nr. 45).', CLICK, { br: true, size: 19 });
    await point(s, 0.7, 4.9, 11.93, 1.2, 'LuGauge', C.gr, 'Schrittgeschwindigkeit heißt:', 'so langsam, dass ihr sofort anhalten könnt.', CLICK, { br: true, size: 19 });
  }
  // ===== ABBIEGEASSISTENT =====
  {
    const s = base(deck, 'ap', { notes:
      '▶ Sagen: „Neue Lkw haben einen Abbiegeassistenten. Sensoren überwachen die rechte Seite und warnen.“\n' +
      '🖱 Klick 1: seit wann Pflicht · Klick 2: was er tut · Klick 3: was er nicht tut.\n' +
      '✅ VO (EU) 2019/2144: Totwinkel-Assistent Pflicht für neue Typgenehmigungen seit 6.7.2022, für alle Neuzulassungen schwerer Lkw und Busse (N2, N3, M2, M3) seit 7.7.2024.\n' +
      '✅ Ab 2026/2029 kommen Anforderungen an die direkte Sicht aus dem Fahrerhaus dazu (größere Scheiben, tiefere Fenster).\n' +
      '💡 Der Assistent ersetzt nicht den Blick in die Spiegel. Ältere Lkw haben ihn oft nicht.\n' +
      '➜ „Kurze Frage dazu.“' });
    kick(s, 'Technik hilft'); title(s, 'Der Abbiegeassistent');
    await point(s, 0.7, 2.1, 11.93, 1.2, 'LuCalendar', C.red, 'Pflicht in neuen Lkw', 'für alle neu zugelassenen Lkw über 3,5 t seit Juli 2024 (EU-Verordnung 2019/2144).', CLICK, { br: true, size: 19 });
    await point(s, 0.7, 3.5, 11.93, 1.2, 'LuRadar', C.or, 'Was er tut', 'überwacht die rechte Seite und warnt, wenn dort ein Radfahrer oder Fußgänger ist.', CLICK, { br: true, size: 19 });
    await point(s, 0.7, 4.9, 11.93, 1.2, 'LuBan', C.dim, 'Was er nicht tut', 'Pflicht ist nur die Warnung – manche bremsen zusätzlich. Keiner ersetzt den Blick in die Spiegel.', CLICK, { br: true, size: 19 });
  }
  quiz(deck, 'ap', {
    kicker: 'Frage · Toter Winkel', q: 'Dein Lkw hat einen Abbiegeassistenten. Er warnt nicht. Darfst du jetzt zügig rechts abbiegen?', size: 28,
    opts: ['Ja, der Assistent hätte gewarnt', 'Nein – Schrittgeschwindigkeit und selbst in alle Spiegel schauen', 'Ja, wenn ich vorher gehupt habe'], ok: 1,
    why: 'Der Assistent ist nur eine Hilfe. Innerorts über 3,5 t gilt beim Rechtsabbiegen Schrittgeschwindigkeit (§ 9 Abs. 6 StVO), und ihr müsst selbst schauen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Assistenten können Fehler machen (Schmutz auf dem Sensor, Person zu klein, zu schnell).\n➜ „Ein toter Winkel fehlt noch – direkt vor dem Lkw.“',
  });
  // ===== TOTER WINKEL VORN (Anfahren) =====
  {
    const s = base(deck, 'ap', { notes:
      '▶ Sagen: „Ihr steht an der roten Ampel, vor euch die Fußgängerfurt. Ein Kind läuft knapp vor eurer Stoßstange – könnt ihr es sehen?“\n' +
      '❓ Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1: Bereich vor der Stoßstange · Klick 2: Frontspiegel · Klick 3: vor dem Anfahren schauen · Klick 4: das Kind im toten Winkel erscheint.\n' +
      '✅ Das Fahrerhaus ist hoch, die Motorhaube vorn breit: Direkt vor der Stoßstange und vorn rechts seht ihr durch die Scheibe nichts. Dafür gibt es den Frontspiegel (Klasse VI, bei schweren Lkw vorgeschrieben) und den Rampenspiegel.\n' +
      '✅ FahrschAusbO Anlage 2.3 Nr. 1 d: „Sichtbehinderung des Fahrers aufgrund der Bauart des Fahrzeugs“.\n' +
      '💡 Gefährlich vor allem nach einem Halt: an der Ampel, am Zebrastreifen, an der Haltestelle, beim Anfahren an Schulen. Erst Front- und Rampenspiegel prüfen, dann losrollen.\n' +
      '➜ „Damit haben wir alle vier Kapitel. Schreibt euch die Kernpunkte auf.“' });
    kick(s, 'Toter Winkel vorn'); title(s, 'Anfahren an der Ampel', { w: 6.8 });
    await point(s, 0.7, 2.1, 6.6, 1.15, 'LuEyeOff', C.red, 'Direkt vor der Stoßstange', 'seht ihr durch die Scheibe kaum etwas – ein Kind kann ganz verschwinden.', CLICK, { br: true, size: 16 });
    await point(s, 0.7, 3.4, 6.6, 1.15, 'LuEye', C.gr, 'Frontspiegel', 'zeigt genau diesen Bereich – vorn rechts hilft der Rampenspiegel.', CLICK, { br: true, size: 16 });
    await point(s, 0.7, 4.7, 6.6, 1.15, 'LuCircleCheck', C.or, 'Vor dem Anfahren', 'immer zuerst Front- und Rampenspiegel – dann langsam losrollen.', CLICK, { br: true, size: 16 });
    // Draufsicht: Lkw an der roten Ampel (rechter Fahrstreifen), vor ihm Haltlinie und Fußgängerfurt
    s.rect(7.9, 1.6, 4.7, 5.0, { fill: '1A2029' });
    s.rect(8.4, 1.6, 3.4, 5.0, { fill: C.road });
    for (let y = 3.6; y < 6.5; y += 0.6) s.rect(10.07, y, 0.06, 0.32, { fill: C.mark });            // Leitlinie
    for (const fy of [2.3, 2.95]) for (let x = 8.45; x < 11.75; x += 0.42) s.rect(x, fy, 0.24, 0.07, { fill: C.mark });   // Furt
    s.rect(10.15, 3.3, 1.65, 0.1, { fill: C.mark });                                                 // Haltlinie
    s.rect(12.04, 2.7, 0.26, 0.66, { fill: '0E1218', line: '55606F', lw: 1, rr: 0.05 });            // Ampel
    s.oval(12.09, 2.75, 0.16, 0.16, { fill: C.red, glow: 6, glowColor: C.red });
    s.oval(12.09, 2.94, 0.16, 0.16, { fill: '3A3020' });
    s.oval(12.09, 3.13, 0.16, 0.16, { fill: '1F3328' });
    veh(s, 'truck.png', 10.95, 4.97, 0, undefined, { scale: 1.05 });
    s.rect(10.45, 2.45, 1.0, 0.95, { fill: C.red, ft: 45 });
    s.text('toter Winkel', { x: 8.45, y: 3.05, w: 1.55, h: 0.35, size: 13, bold: true, color: C.red, align: 'right' });
    s.text('Fußgängerfurt', { x: 8.5, y: 1.78, w: 1.8, h: 0.35, size: 13, color: C.mut });
    const kid = veh(s, 'ped.png', 10.95, 2.82, 0, 'kid', { size: [0.42, 0.36] });
    s.anims.push({ name: kid, kind: 'pic', fx: 'zoom', c: true, dur: 350 });
    s.text('Kind', { x: 10.55, y: 3.0, w: 0.8, h: 0.28, size: 12, bold: true, color: C.white, align: 'center' }, { fx: 'fade', dur: 250 });
    foot(s, 'Draufsicht · schematisch');
  }
};
