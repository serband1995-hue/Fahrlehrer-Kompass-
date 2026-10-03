// C2 Teil B: Bahnübergänge (§ 19 StVO), Halten und Parken (§ 12, § 17 StVO, § 41 StVZO)
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, chapter, foot, steps, veh, photoAsk, sign, svgImg } = require('../gs');
const { icon, W } = require('../lib');

sec('bahn', 'C2  ·  BAHNÜBERGÄNGE', C.red, 'bg_red.jpg');
sec('park', 'C2  ·  HALTEN UND PARKEN', C.pu, 'bg_pu.jpg');

// Szene Bahnübergang (Draufsicht): Straße waagrecht, Gleis senkrecht bei x≈9.9
const RY = 3.3, RH = 1.6, GX = 9.9;
function bahnScene(s, i) {
  s.rect(5.6, 1.3, W - 5.6, 5.32, { fill: '1A2029', name: '!!gnd' });
  s.rect(5.6, RY, W - 5.6, RH, { fill: C.road, name: '!!road' });
  for (let k = 0, x = 5.7; x < W - 0.2; x += 0.75, k++) if (x < GX - 0.9 || x > GX + 0.6) s.rect(x, RY + RH / 2 - 0.02, 0.42, 0.045, { fill: C.mark, name: '!!rm' + k });
  // Gleis: Schotter + Schienen + Schwellen
  s.rect(GX - 0.55, 1.3, 1.1, 5.32, { fill: '4A4238', name: '!!schotter' });
  for (let k = 0, y = 1.4; y < 6.5; y += 0.28, k++) s.rect(GX - 0.45, y, 0.9, 0.08, { fill: '6B5B45', name: '!!sw' + k });
  s.rect(GX - 0.3, 1.3, 0.05, 5.32, { fill: 'B8BEC6', name: '!!sch1' });
  s.rect(GX + 0.25, 1.3, 0.05, 5.32, { fill: 'B8BEC6', name: '!!sch2' });
  // Straße über dem Gleis (Bohlen)
  s.rect(GX - 0.55, RY, 1.1, RH, { fill: '30363F', name: '!!plank' });
  s.rect(GX - 0.3, RY, 0.05, RH, { fill: 'B8BEC6', name: '!!sch1r' });   // Schienen auch über der Fahrbahn
  s.rect(GX + 0.25, RY, 0.05, RH, { fill: 'B8BEC6', name: '!!sch2r' });
  // Haltlinie / Andreaskreuz rechts vor dem Gleis (Fahrtrichtung →, Fahrstreifen unten)
  s.rect(GX - 1.25, RY + RH / 2 + 0.05, 0.07, RH / 2 - 0.1, { fill: C.mark, name: '!!halt' });
  // Andreaskreuz (rot-weiß) am rechten Fahrbahnrand
  const ax = GX - 1.15, ay = RY + RH + 0.35;
  s.rect(ax - 0.28, ay - 0.04, 0.56, 0.08, { fill: 'FFFFFF', rotate: 45, name: '!!ak1' });
  s.rect(ax - 0.28, ay - 0.04, 0.56, 0.08, { fill: 'FFFFFF', rotate: -45, name: '!!ak2' });
  s.rect(ax - 0.06, ay - 0.04, 0.12, 0.08, { fill: 'D52B1E', rotate: 45, name: '!!ak3' });
  // Blinklicht unter dem Andreaskreuz (an nur in Schritt 3, danach Zug vorbei)
  const on = i === 3;
  s.oval(ax - 0.12, ay + 0.3, 0.24, 0.24, { fill: on ? C.red : '3A2020', glow: on ? 8 : undefined, glowColor: C.red, name: '!!blink' });
  // Schranke (Halbschranke, senkt sich ab Schritt 3)
  s.rect(GX - 0.95, on ? RY + RH / 2 : RY + RH, on ? 0.09 : 0.09, on ? RH / 2 : 0.01, { fill: on ? 'FFFFFF' : C.road, name: '!!bar' });
  // Stau hinter dem Übergang (ab Schritt 2)
  const q = i >= 2 && i <= 3;
  for (let k = 0; k < 3; k++) veh(s, ['car_r.png', 'car_w.png', 'car_g.png'][k], q ? GX + 1.05 + k * 1.2 : W + 1 + k, RY + RH * 0.75, 90, '!!qc' + k, { scale: 0.85 });
}
// Lkw-Positionen (Mitte x) je Schritt; Lkw fährt nach rechts (Drehung 90)
const TPOS = [6.95, 7.25, 7.25, 7.25, 7.25, 11.85];

module.exports = async (deck) => {
  await chapter(deck, 'bahn', { num: 3, ttl: 'Bahnübergänge', sub: 'Ein Zug kann nicht ausweichen – und nicht rechtzeitig bremsen.', bg: 'f_bahn.jpg', notes:
    '▶ Sagen: „Kapitel 3: Bahnübergänge. Ein Güterzug mit 100 km/h braucht für eine Notbremsung oft 1.000 Meter oder mehr. Er kann nicht ausweichen. Ihr müsst warten.“\n🖱 Keine Klicks.\n💡 Lange, schwere und tiefe Fahrzeuge sind besonders gefährdet: Sie brauchen länger zum Überqueren und können aufsetzen.\n➜ „Spielen wir die Annäherung durch.“' });
  await steps(deck, 'bahn', {
    kicker: 'Bahnübergang · § 19 StVO', ttl: 'Lkw am Gleis',
    list: ['Annähern: mäßiges Tempo', 'Nicht überholen', 'Stau hinter dem Gleis?', 'Blinklicht / Schranke', 'Frei: zügig hinüber'],
    caps: [
      'Ihr nähert euch einem Bahnübergang. Nur mit mäßiger Geschwindigkeit – und bremsbereit.',
      'Ab dem Warnschild bis einschließlich Übergang: keine Kraftfahrzeuge überholen.',
      'Hinter dem Gleis stehen Autos. Passt euer ganzer Lkw hinter die Schienen? Wenn nicht: VOR dem Andreaskreuz warten!',
      'Rotes Blinklicht oder Schranke senkt sich: Ihr wartet vor dem Andreaskreuz. Niemals noch durchfahren.',
      'Der Zug ist vorbei, das Blinklicht ist aus, die Schranke offen. Ist hinter dem Gleis Platz für den ganzen Lkw?',
      'Erst wenn ihr ohne Halt ganz hinüberkommt: zügig überqueren – nicht auf dem Gleis anhalten.',
    ],
    notes: [
      '▶ Sagen: „Ihr nähert euch einem Bahnübergang. Was macht ihr?“\n✅ § 19 Abs. 1 StVO: Annäherung nur mit mäßiger Geschwindigkeit. Schienenfahrzeuge haben Vorrang.\n🖱 Keine Animation auf dieser Folie – nächster Klick = nächster Schritt (Morph).\n➜ „Darf man vor dem Übergang überholen?“',
      '▶ „Nein. Vom Warnschild (Zeichen 151 bzw. erste Bake 156) bis einschließlich Übergang dürft ihr keine Kraftfahrzeuge überholen.“\n✅ § 19 Abs. 1 StVO. Verstoß: 70 €, 1 Punkt (BKat Nr. 89a).\n➜ „Jetzt wird es kritisch.“',
      '▶ „Hinter dem Gleis staut es sich. Euer Lkw ist 10, 12 Meter lang – mit Anhänger über 18 Meter. Passt das?“\n❓ „Was tut ihr?“\n✅ § 19 Abs. 3 StVO: Kann der Bahnübergang wegen des Straßenverkehrs nicht zügig und ohne Aufenthalt überquert werden, ist vor dem Andreaskreuz zu warten.\n💡 Das ist DIE Lkw-Regel am Bahnübergang. Ein Lkw, der mit dem Heck auf dem Gleis im Stau steht, ist ein typischer schwerer Unfall.\n➜ „Und dann geht das Blinklicht an …“',
      '▶ „Rotes Blinklicht – oder die Schranke senkt sich. Ihr wartet vor dem Andreaskreuz.“\n✅ § 19 Abs. 2 StVO. Blinklicht oder senkende Schranke missachtet: 240 €, 1 Monat Fahrverbot, 2 Punkte (BKat 89b.2). Bei geschlossener Schranke durchfahren: 700 €, 3 Monate Fahrverbot, 2 Punkte (BKat 244).\n➜ „Wann dürft ihr fahren?“',
      '▶ „Der Zug ist durch, das Blinklicht aus, die Schranke offen. Bevor ihr losfahrt: Ist hinter dem Gleis Platz für den ganzen Lkw?“\n➜ „Ja – dann …“',
      '▶ „Hinter dem Gleis ist Platz für euren ganzen Lkw: Jetzt zügig hinüber – nicht auf den Schienen anhalten oder schalten.“\n💡 Tiefliegende Fahrzeuge (z. B. Tieflader) können auf gewölbten Übergängen aufsetzen. Strecke vorher prüfen – im Zweifel nicht drüber.\n➜ „Und wenn es doch passiert: Ihr steckt auf dem Gleis fest?“',
    ],
    legend: 'Draufsicht · schematisch',
    scene: async (s, i) => {
      bahnScene(s, i);
      veh(s, 'truck.png', TPOS[i], RY + RH * 0.75, 90, '!!truck', { scale: 0.9 });
      if (i === 1) {
        s.text('keine Kfz überholen – bis einschl. Übergang', { x: 5.8, y: 2.6, w: 4.6, h: 0.4, size: 16, bold: true, color: C.red, name: '!!ueb' });
        s.rect(5.75, 3.08, GX + 0.65 - 5.75, 0.05, { fill: C.red, name: '!!ubl' });
        s.rect(5.75, 3.0, 0.05, 0.21, { fill: C.red, name: '!!ub0' });
        s.rect(GX + 0.6, 3.0, 0.05, 0.21, { fill: C.red, name: '!!ub1' });
      }
      if (i === 2) {
        s.rrect(GX + 0.65, RY - 0.95, 2.6, 0.75, { fill: '3A1515', line: C.red, rr: 0.1, name: '!!qbox' });
        s.text('Platz für den\nganzen Lkw?', { x: GX + 0.7, y: RY - 0.95, w: 2.5, h: 0.75, size: 15, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!qt' });
      }
    },
  });
  await ask(deck, 'bahn', {
    kicker: 'Notfall', q: 'Euer Lkw bleibt auf dem Gleis liegen. Was tut ihr?', ico: 'LuSiren',
    answers: [
      ['LuDoorOpen', 'Sofort raus', '– alle verlassen das Fahrzeug und gehen weg vom Gleis, schräg in Richtung des möglichen Zuges.'],
      ['LuPhone', 'Notruf', '112 oder die Notrufnummer am Bahnübergang. Die Kennnummer am Andreaskreuz oder Schaltkasten durchgeben.'],
      ['LuTriangleAlert', 'Nicht mehr einsteigen', 'um „noch schnell“ wegzufahren, wenn sich das Blinklicht einschaltet.'],
    ],
    notes:
      '▶ Sagen: „Motor aus, nichts geht mehr – und ihr steht auf dem Gleis. Was jetzt?“\n' +
      '❓ Sammeln lassen.\n' +
      '🖱 Klick 1: raus · Klick 2: Notruf · Klick 3: nicht wieder einsteigen.\n' +
      '✅ Menschen zuerst: Alle raus und weg vom Gleis. Bei einem Aufprall fliegen Trümmer in Fahrtrichtung des Zuges – deshalb dem Zug entgegen und seitlich weg.\n' +
      '✅ Bahnübergänge der Deutschen Bahn haben am Andreaskreuz bzw. am Technikschrank eine Kennung mit Notrufnummer. Damit kann der Zug gestoppt werden. (Praxis der DB, keine Gesetzesvorschrift.)\n' +
      '💡 Wenn genug Zeit ist und es gefahrlos geht: Warnblinker an. Aber nie Leben riskieren für den Lkw.\n' +
      '➜ „Kapitel 4: Halten und Parken mit dem Lkw.“',
  });
  // ================= KAPITEL 4: HALTEN UND PARKEN =================
  await chapter(deck, 'park', { num: 4, ttl: 'Halten und Parken', sub: 'Wo ein Lkw nachts nicht stehen darf – und wie er sichtbar bleibt.', ico: 'LuSquareParking', notes:
    '▶ Sagen: „Kapitel 4: Halten und Parken. Wo stellt ihr den Lkw abends ab?“\n🖱 Keine Klicks.\n➜ „Schaut euch dieses Bild an.“' });
  await photoAsk(deck, 'park', {
    bg: 'f_wohn.jpg', kicker: '§ 12 Abs. 3a StVO', q: 'Darf ein 12-t-Lkw hier jede Nacht parken?', w: 5.6, ov: 7.2, qsize: 34,
    answers: [
      ['LuBan', 'Nein – regelmäßiges Parken verboten', 'für Lkw über 7,5 t und Anhänger über 2 t in Wohngebieten. Verstoß: 30 €.'],
      ['LuMoon', 'Wann?', 'von 22 bis 6 Uhr und an Sonn- und Feiertagen.'],
      ['LuSquareParking', 'Ausnahme', 'auf extra gekennzeichneten Parkplätzen.'],
    ],
    notes:
      '▶ Sagen: „Ein Lkw mit 12 Tonnen, Wohngebiet, nachts. Darf der hier jede Nacht stehen?“\n' +
      '❓ Abstimmen lassen.\n' +
      '🖱 Klick 1: Nein · Klick 2: Zeiten · Klick 3: Ausnahme und Bußgeld.\n' +
      '✅ § 12 Abs. 3a StVO: Mit Kfz über 7,5 t zGM und Anhängern über 2 t zGM ist innerorts in reinen und allgemeinen Wohngebieten, Sondergebieten zur Erholung, Kurgebieten und Klinikgebieten das regelmäßige Parken von 22 bis 6 Uhr sowie an Sonn- und Feiertagen unzulässig – außer auf entsprechend gekennzeichneten Parkplätzen. Verstoß: 30 € (BKat Nr. 56).\n' +
      '💡 „Regelmäßig“ heißt: immer wieder dort. Ein einmaliges Abstellen ist nicht gemeint – aber Lärm und Ärger mit den Nachbarn trotzdem.\n' +
      '➜ „Was gilt sonst noch beim Abstellen?“',
  });
  {
    const s = base(deck, 'park', { notes:
      '▶ Sagen: „Drei Regeln, die ihr beim Abstellen kennen müsst.“\n' +
      '🖱 Klick 1: Anhänger allein · Klick 2: Beleuchtung und Park-Warntafel · Klick 3: Unterlegkeile.\n' +
      '✅ § 12 Abs. 3b StVO: Anhänger ohne Zugfahrzeug höchstens 2 Wochen parken (20 €, BKat Nr. 57).\n' +
      '✅ § 17 Abs. 4 StVO: Haltende Fahrzeuge außerorts mit eigener Lichtquelle beleuchten. Innerorts müssen Fahrzeuge über 3,5 t und Anhänger auf der Fahrbahn immer beleuchtet oder mit Park-Warntafeln (rot-weiß, § 51c StVZO) kenntlich gemacht sein.\n' +
      '✅ § 41 Abs. 14 StVZO: mitführen – 1 Unterlegkeil bei Kfz über 4 t und zweiachsigen Anhängern über 750 kg; 2 Keile bei drei- und mehrachsigen Fahrzeugen, Sattelanhängern, Starrdeichsel- und Zentralachsanhängern über 750 kg.\n' +
      '💡 Feststellbremse ist Pflicht – der Keil ist zusätzliche Sicherung, z. B. am Hang oder beim Abkuppeln.\n' +
      '➜ „Kurz testen.“' });
    kick(s, 'Abstellen'); title(s, 'Drei Regeln beim Abstellen');
    await point(s, 0.7, 2.05, 7.6, 1.25, 'LuContainer', C.pu, 'Anhänger allein', 'höchstens 2 Wochen parken (§ 12 Abs. 3b StVO).', CLICK, { br: true, size: 18 });
    await point(s, 0.7, 3.45, 7.6, 1.25, 'LuLightbulb', C.pu, 'Sichtbar bleiben', 'bei Dunkelheit: außerorts eigenes Licht; innerorts über 3,5 t auf der Fahrbahn Licht oder Park-Warntafeln.', CLICK, { br: true, size: 18 });
    await point(s, 0.7, 4.85, 7.6, 1.25, 'LuTriangle', C.pu, 'Unterlegkeile', 'über 4 t: einer · drei und mehr Achsen: zwei.', CLICK, { br: true, size: 18 });
    // Park-Warntafel (Grafik)
    s.rrect(8.9, 2.05, 3.73, 4.05, { fill: C.card, line: C.line, rr: 0.08 });
    s.text('Park-Warntafel', { x: 9.0, y: 2.15, w: 3.5, h: 0.4, size: 15, bold: true, color: C.mut, align: 'center' });
    { let st = ''; for (let k = -6; k < 12; k++) st += `<polygon points="${k * 40},0 ${k * 40 + 20},0 ${k * 40 + 20 + 190},190 ${k * 40 + 190},190" fill="#D52B1E"/>`;
      s.img(await svgImg(`<clipPath id="c"><rect width="240" height="190" rx="6"/></clipPath><g clip-path="url(#c)"><rect width="240" height="190" fill="#FFFFFF"/>${st}</g>`, 240, 190), { x: 9.6, y: 2.75, w: 2.4, h: 1.9 }); }
    s.text('rot-weiß, schräg gestreift – vorn und hinten', { x: 9.0, y: 4.85, w: 3.5, h: 0.9, size: 14, color: C.txt, align: 'center' });
  }
  quiz(deck, 'park', {
    kicker: 'Frage · Anhänger', q: 'Du stellst einen Anhänger ohne Zugfahrzeug am Straßenrand ab. Wie lange darf er dort höchstens parken?', size: 28,
    opts: ['1 Woche', '2 Wochen', 'Unbegrenzt, wenn er beleuchtet ist'], ok: 1,
    why: '§ 12 Abs. 3b StVO: Anhänger ohne Zugfahrzeug dürfen höchstens zwei Wochen geparkt werden (20 €, BKat Nr. 57). Ausnahme: gekennzeichnete Parkplätze.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B, 2 Wochen.\n➜ „Und wie ist es mit der Beleuchtung?“',
  });
  quiz(deck, 'park', {
    kicker: 'Frage · Parken', q: 'Dein Lkw (18 t) steht innerorts nachts am Fahrbahnrand. Was ist Pflicht?', size: 30,
    opts: ['Nichts – innerorts ist es ja hell', 'Beleuchtung oder Park-Warntafeln', 'Nur das Warndreieck aufstellen'], ok: 1,
    why: '§ 17 Abs. 4 StVO: Innerorts müssen haltende Fahrzeuge über 3,5 t und Anhänger auf der Fahrbahn stets beleuchtet oder mit Park-Warntafeln kenntlich gemacht sein.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Für Pkw reicht innerorts oft die Straßenbeleuchtung – für Lkw über 3,5 t nicht.\n➜ „Kapitel 5: Wann dürft ihr gar nicht fahren?“',
  });
};
