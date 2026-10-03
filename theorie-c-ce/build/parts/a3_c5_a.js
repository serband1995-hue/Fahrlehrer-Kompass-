// Abend 3 · C5 Kapitel 1 Bremsanlagen, Kapitel 2 Druckluft
const { C, base, kick, title, card, point, CLICK, ask, quiz, steps, foot, svgImg, chapter, motion } = require('../gs');
const { icon } = require('../lib');
const { warnSym } = require('../sym');
const sharp = require('sharp');
const path = require('path');

// Foto um dx Zoll nach rechts schieben (links dunkel aufgefüllt, rechts abgeschnitten) – Bild in art/ bleibt unverändert
async function shiftImg(file, dx) {
  const src = path.join(__dirname, '../art', file);
  const m = await sharp(src).metadata(), px = Math.round(m.width / 13.333 * dx);
  const ext = await sharp(src).extend({ left: px, background: '#05070B' }).toBuffer();
  const buf = await sharp(ext).extract({ left: 0, top: 0, width: m.width, height: m.height }).jpeg({ quality: 90 }).toBuffer();
  return 'image/jpeg;base64,' + buf.toString('base64');
}

// Manometer 0–14 bar (Bogen 240°). Ziffern außen am Skalenring, die Nadel reicht nur bis zum Ring
const MX = 8.3, MY = 3.55, MR = 1.6, MAXB = 14;
const mAng = b => (210 - (b / MAXB) * 240) * Math.PI / 180;
const mPt = (b, r) => [MX + r * Math.cos(mAng(b)), MY - r * Math.sin(mAng(b))];

module.exports = async (deck) => {
  // ===== KAPITEL 1 =====
  await chapter(deck, 'c5a', { num: 1, ttl: 'Bremsanlagen', sub: 'Welche Bremsen hat ein Lkw – und was verlangt das Gesetz von ihnen?', ico: 'LuOctagonAlert', notes:
    '▶ Sagen: „Kapitel 1: Welche Bremsen hat ein Lkw überhaupt?“\n🖱 Keine Klicks.\n➜ „Sammeln wir.“' });
  {
    const s = base(deck, 'c5a', { notes:
      '▶ Sagen: „Ein Pkw hat zwei Bremsen: Fußbremse und Handbremse. Ein schwerer Lkw hat drei.“\n' +
      '❓ „Welche drei?“\n' +
      '🖱 Klick 1: Betriebsbremse · Klick 2: Feststellbremse · Klick 3: Dauerbremse · Klick 4: Hilfsbremswirkung.\n' +
      '✅ § 41 StVZO: zwei voneinander unabhängige Bremsanlagen – jede muss wirken, wenn die andere versagt. Feststellbremse rein mechanisch. Dauerbremse Pflicht bei Lkw über 9 t zulässiger Gesamtmasse (§ 41 Abs. 15). Die Hilfsbremse ist keine eigene Anlage: Fällt ein Teil aus, bremst der Rest noch mit mindestens 44 % der Wirkung (§ 41 Abs. 4a).\n💡 Nach EU-Bremsenrecht (für Lkw über 25 km/h maßgeblich) gelten bei Ausfall eines Kreises eigene Mindestwerte – für den Unterricht reicht: Der Rest bremst weiter.\n' +
      '➜ „Und wie bekommt die Betriebsbremse ihre Kraft? Nicht vom Fuß.“' });
    kick(s, 'Bremsanlagen'); title(s, 'Drei Bremsen im Lkw');
    const B = [['LuFootprints', C.or, 'Betriebsbremse', 'Fußpedal', 'bremst alle Räder – mit Druckluft. Für jede normale Bremsung.'], ['LuSquareParking', C.red, 'Feststellbremse', 'Handbremsventil', 'Federspeicher, rein mechanisch – hält den Lkw am Berg fest.'], ['LuMountain', C.bl, 'Dauerbremse', 'Hebel am Lenkrad', 'Motorbremse oder Retarder – verschleißfrei, für lange Gefälle. StVZO: Pflicht über 9 t.']];
    for (let k = 0; k < 3; k++) {
      const x = 0.7 + k * 4.05, w = 3.85;
      card(s, x, 2.05, w, 2.7, { line: B[k][1] }, CLICK);
      s.oval(x + 0.3, 2.3, 0.9, 0.9, { fill: B[k][1], line: B[k][1] }, { fx: 'zoom', dur: 250 });
      s.img(await icon(B[k][0], C.dark), { x: x + 0.52, y: 2.52, w: 0.46, h: 0.46 }, { fx: 'fade', dur: 150 });
      s.text(B[k][2], { x: x + 1.35, y: 2.3, w: w - 1.45, h: 0.5, size: 22, bold: true, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(B[k][3], { x: x + 1.35, y: 2.78, w: w - 1.45, h: 0.4, size: 15, italic: true, color: B[k][1] }, { fx: 'fade', dur: 200 });
      s.text(B[k][4], { x: x + 0.3, y: 3.42, w: w - 0.5, h: 1.2, size: 19, color: C.mut }, { fx: 'fade', dur: 200 });
    }
    await point(s, 0.7, 5.0, 11.93, 1.3, 'LuShieldCheck', C.gr, 'Fällt ein Teil aus,', 'muss der Rest noch mindestens 44 % der Bremswirkung bringen – die Hilfsbremswirkung.', CLICK, { size: 19 });
  }
  // ===== FREMDKRAFTBREMSE =====
  {
    const s = base(deck, 'c5a', { notes:
      '▶ Sagen: „Beim Pkw drückt euer Fuß über die Bremsflüssigkeit direkt auf die Bremse – mit Verstärker. Beim schweren Lkw ist das anders: Euer Fuß öffnet nur ein Ventil. Die Kraft kommt aus der Druckluft.“\n' +
      '❓ „Was heißt das, wenn keine Luft da ist?“\n' +
      '✅ Ohne Luftvorrat keine Betriebsbremse. Darum gibt es Druckwarnung, mehrere Kreise und die Federspeicher, die bei Luftmangel selbst bremsen.\n' +
      '🖱 Klick 1: Pkw · Klick 2: Lkw · Klick 3: Folge.\n' +
      '✅ Fremdkraftbremse: Der Fuß gibt nur das Steuersignal (eurotransport, „Die Bremsanlage: Retter in der Not“).\n' +
      '➜ „Woher kommt die Luft? Kapitel 2.“' });
    kick(s, 'Bremsanlagen'); title(s, 'Der Fuß gibt nur das Signal');
    const row = async (y, col, lab, items, anim) => {
      s.text(lab, { x: 0.7, y, w: 1.6, h: 1.0, size: 22, bold: true, color: col, valign: 'middle' }, anim);
      for (let k = 0; k < items.length; k++) {
        const x = 2.4 + k * 2.6;
        s.rrect(x, y, 2.2, 1.0, { fill: C.card, line: col, lw: 1.5, rr: 0.12 }, { fx: 'fade', dur: 200 });
        s.text(items[k], { x, y, w: 2.2, h: 1.0, size: 15, bold: true, color: C.txt, align: 'center', valign: 'middle', margin: 9 }, { fx: 'fade', dur: 200 });
        if (k < items.length - 1) s.text('➜', { x: x + 2.2, y, w: 0.4, h: 1.0, size: 22, bold: true, color: col, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 200 });
      }
    };
    await row(2.1, C.mut, 'Pkw', ['Fuß drückt', 'Bremskraftverstärker', 'Bremsflüssigkeit', 'Radbremse'], CLICK);
    await row(3.45, C.bl, 'Lkw', ['Fuß öffnet Ventil', 'Druckluft\naus dem Vorrat', 'Bremszylinder', 'Radbremse'], CLICK);
    s.text('nur Signal', { x: 2.4, y: 4.5, w: 2.2, h: 0.35, size: 14, italic: true, color: C.bl, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('hier kommt die Kraft her', { x: 4.8, y: 4.5, w: 2.6, h: 0.35, size: 14, italic: true, color: C.bl, align: 'center' }, { fx: 'fade', dur: 200 });
    await point(s, 0.7, 5.15, 11.93, 1.25, 'LuTriangleAlert', C.red, 'Ohne Luftvorrat keine Betriebsbremse.', 'Darum: Druck im Blick behalten, Druckwarnung ernst nehmen – und erst losfahren, wenn genug Luft da ist.', CLICK, { size: 17 });
  }

  // ===== KAPITEL 2 DRUCKLUFT =====
  await chapter(deck, 'c5d', { num: 2, ttl: 'Druckluft', sub: 'Woher die Luft kommt, wie sie sauber und trocken wird – und wie sie verteilt wird.', bg: await shiftImg('h_luft.jpg', 0.35), notes:
    '▶ Sagen: „Kapitel 2: die Druckluft. Auf dem Bild seht ihr Luftbehälter am Rahmen und daneben den Lufttrockner.“\n🖱 Keine Klicks.\n➜ „Wir verfolgen die Luft vom Ansaugen bis zur Bremse.“' });

  // ===== WEG DER LUFT (Morph) =====
  const YL = 2.6;
  const BL = [['komp', 5.75, 2.0, 1.35, 1.2, 'Kompressor'], ['regl', 7.4, 2.0, 1.3, 1.2, 'Druckregler'], ['trock', 9.0, 2.0, 1.3, 1.2, 'Lufttrockner'], ['vks', 10.6, 2.0, 1.6, 1.2, 'Vierkreis-\nschutzventil']];
  const TX = [5.8, 7.62, 9.44, 11.26], TW = 1.65, TY = 4.35, MY2 = 3.95;
  const KL = [['Kreis 1', 'Bremse vorn'], ['Kreis 2', 'Bremse hinten'], ['Kreis 3', 'Feststellbremse, Anhänger'], ['Kreis 4', 'Nebenverbraucher']];
  await steps(deck, 'c5d', {
    kicker: 'Druckluft', ttl: 'Der Weg der Luft',
    list: ['Kompressor', 'Druckregler', 'Lufttrockner', 'Vierkreisschutzventil', 'Vorratsbehälter', 'Bremskreise'],
    caps: [
      'Der Kompressor wird vom Motor angetrieben. Er saugt Luft über einen Filter an und drückt sie ins System.',
      'Der Druckregler schaltet den Kompressor ab, wenn der Abschaltdruck erreicht ist – heute etwa 10 bis 13 bar. Kurzes Abblasen ist normal.',
      'Der Lufttrockner entzieht der Luft das Wasser. Sonst rosten Teile – und im Winter friert die Anlage ein.',
      'Das Vierkreisschutzventil verteilt die Luft auf mehrere Kreise. Wird ein Kreis undicht, sperrt es ihn ab.',
      'Jeder Bremskreis hat seinen eigenen Vorratsbehälter – unten mit einem Ventil zum Entwässern.',
      'Kreis 1 und 2: Betriebsbremse vorn und hinten. Kreis 3: Feststellbremse und Anhänger. Kreis 4: Nebenverbraucher.',
    ],
    notes: [
      '▶ Sagen: „Wir verfolgen die Luft. Sie beginnt beim Kompressor – auch Luftpresser genannt. Er wird vom Motor angetrieben. Ist der Vorrat voll, läuft er leer mit – bei neueren Lkw wird er abgekuppelt.“\n✅ Kompressor mit Kupplung: Bei vollem Vorrat wird er ganz vom Motor getrennt (eurotransport, Knorr-Bremse, seit 2009 auf dem Markt).\n✅ Fachwissen (Frage 2.7.06-406, Zugmaschinen-Teil): Am Luftpresser Druckleitungsanschluss und – falls vorhanden – Keilriemen kontrollieren.\n➜ „Wer sagt dem Kompressor, wann genug ist?“',
      '▶ „Der Druckregler. Ist der Abschaltdruck erreicht, schaltet er den Kompressor auf Leerlauf. Ihr hört dann ein kurzes Zischen – das ist normal.“\n✅ Amtlicher Fragetext 2.7.06-232: Abschaltdruck etwa 10 bis 13 bar. Der genaue Wert ist herstellerabhängig.\n💡 Heute ist der Regler oft im Lufttrockner eingebaut oder elektronisch.\n➜ „Was ist in der Luft, das wir nicht wollen?“',
      '▶ „Wasser. Luft enthält Feuchtigkeit. Der Trockner holt sie heraus und reinigt sich selbst.“\n✅ Prüfungsfrage 2.7.06-220: An den Entwässerungsventilen kontrollieren, ob der Trockner richtig arbeitet, und ihn regelmäßig warten lassen. Bei Anlagen mit Lufttrockner gehört KEIN Frostschutzmittel in die Anlage.\n➜ „Dann wird die Luft verteilt.“',
      '▶ „Das Vierkreisschutzventil verteilt die Luft auf die Kreise. Sein Trick: Wird ein Kreis undicht, sperrt es ihn ab – die anderen behalten ihren Druck.“\n✅ Prüfungsfrage 2.7.06-223: undichten Kreis gegen die anderen abschließen, Versorgung der intakten Kreise sichern. NICHT: Schutz vor zu hohem Druck.\n➜ „Wohin geht die Luft?“',
      '▶ „In die Vorratsbehälter – jeder Bremskreis hat seinen eigenen. Unten sitzt ein Entwässerungsventil, oft automatisch.“\n💡 Die Ventile sind auf dieser Folie blau markiert.\n➜ „Und wer verbraucht die Luft?“',
      '▶ „Kreis 1 und 2 sind die Betriebsbremse vorn und hinten – getrennt. Kreis 3 ist die Feststellbremse und der Anhänger. Kreis 4 versorgt Nebenverbraucher, zum Beispiel die Betätigung der Motorbremse.“\n✅ Kreiseinteilung nach eurotransport; neuere Lkw haben oft mehr Kreise (herstellerabhängig).\n➜ „Wie viel Druck braucht ihr, bevor ihr losfahrt?“',
    ],
    legend: 'Druckluftanlage · schematisch',
    scene: async (s, i) => {
      const on = (k) => i >= k, cur = (k) => i === k;
      // Ansaugen
      s.text('Luft', { x: 5.6, y: 1.35, w: 0.8, h: 0.3, size: 13, bold: true, color: on(0) ? C.bl : C.dim, name: '!!tluft' });
      s.lineS(5.95, 1.68, 6.25, 2.0, { color: C.bl, lw: 2.5, endArrow: 'triangle', name: '!!pluft' });
      s.text('vom Motor\nangetrieben', { x: 5.6, y: 3.27, w: 1.65, h: 0.48, size: 13, italic: true, color: C.mut, align: 'center', name: '!!tmot' });
      // Leitungen
      const pipe = (nm, x1, y1, x2, y2, k) => { const v = Math.abs(x2 - x1) < 0.01, th = 0.09; s.rrect(Math.min(x1, x2) - (v ? th / 2 : 0.03), Math.min(y1, y2) - (v ? 0.03 : th / 2), v ? th : Math.abs(x2 - x1) + 0.06, v ? Math.abs(y2 - y1) + 0.06 : th, { fill: on(k) ? C.bl : '3C4656', rr: 0.5, name: '!!' + nm }); };
      pipe('p1', 7.1, YL, 7.4, YL, 1); pipe('p2', 8.7, YL, 9.0, YL, 2); pipe('p3', 10.3, YL, 10.6, YL, 3);
      pipe('p4', 11.4, 3.2, 11.4, MY2, 4); pipe('p5', TX[0] + TW / 2, MY2, TX[3] + TW / 2, MY2, 4);
      TX.forEach((x, k) => pipe('pd' + k, x + TW / 2, MY2, x + TW / 2, TY, 4));
      // Bauteile
      for (const [nm, x, y, w, h, lab] of BL) {
        const k = BL.findIndex(b => b[0] === nm);
        s.rrect(x, y, w, h, { fill: on(k) ? '173048' : '1A212C', line: cur(k) ? C.white : (on(k) ? C.bl : C.line), lw: cur(k) ? 2.5 : 1.5, rr: nm === 'trock' ? 0.25 : 0.1, name: '!!' + nm, glow: cur(k) ? 10 : undefined, glowColor: C.bl });
        s.text(lab, { x, y, w, h, size: 15, bold: true, color: on(k) ? C.txt : C.dim, align: 'center', valign: 'middle', name: '!!t' + nm });
      }
      if (i === 1) s.text('zisch – Abblasen', { x: 7.25, y: 3.25, w: 1.6, h: 0.3, size: 12, bold: true, color: C.bl, align: 'center', name: '!!tzisch' });
      if (i === 2) s.text('Wasser raus', { x: 8.95, y: 3.27, w: 1.4, h: 0.3, size: 12, bold: true, color: C.bl, align: 'center', name: '!!twas' });
      // Behälter mit Füllstand und Entwässerungsventil
      TX.forEach((x, k) => {
        s.rrect(x, TY, TW, 0.8, { fill: '1A212C', line: on(4) ? C.bl : C.line, lw: 1.5, rr: 0.5, name: '!!tank' + k });
        s.rrect(x + 0.08, TY + 0.08, on(4) ? TW - 0.16 : 0.05, 0.64, { fill: C.bl, ft: 35, rr: 0.5, name: '!!fill' + k });
        s.rect(x + TW / 2 - 0.07, TY + 0.8, 0.14, 0.25, { fill: i === 4 ? C.bl : '9AA6B5', name: '!!ev' + k });
        s.text([{ text: KL[k][0], options: { bold: true, breakLine: true } }, { text: KL[k][1], options: {} }], { x: x - 0.05, y: TY + 1.17, w: TW + 0.1, h: 0.8, size: 14, color: on(5) ? C.txt : C.dim, align: 'center', name: '!!tk' + k });
      });
      // Hinweis direkt neben dem Ventil von Kreis 3 (mit kurzer Hinweislinie)
      if (i === 4) { s.lineS(TX[2] + TW / 2 + 0.09, TY + 0.93, TX[2] + TW / 2 + 0.2, TY + 0.93, { color: C.bl, lw: 1.5, name: '!!lev' }); s.text('Entwässerungsventil', { x: TX[2] + TW / 2 + 0.23, y: TY + 0.8, w: 1.5, h: 0.27, size: 12, italic: true, color: C.bl, valign: 'middle', name: '!!tev' }); }
      // Luft-Puls
      const PP = [[6.1, 1.85], [7.25, YL], [8.85, YL], [10.45, YL], [9.35, MY2], [9.35, MY2]];
      s.oval(PP[i][0] - 0.15, PP[i][1] - 0.15, 0.3, 0.3, { fill: C.bl, glow: 12, glowColor: C.bl, name: '!!puls' });
    },
  });

  // ===== DRUCK NACH DEM START (Manometer-Morph) =====
  let dial = '';
  const P = (x, y) => `${((x - MX + MR + 0.3) * 100).toFixed(1)} ${((y - MY + MR + 0.3) * 100).toFixed(1)}`;
  { const [x1, y1] = mPt(0, MR), [x2, y2] = mPt(MAXB, MR); dial += `<path d="M ${P(x1, y1)} A ${MR * 100} ${MR * 100} 0 1 1 ${P(x2, y2)}" fill="none" stroke="#3C4656" stroke-width="12"/>`; }
  for (let b = 0; b <= MAXB; b++) { const [a, c] = mPt(b, MR - (b % 2 ? 0.12 : 0.22)), [d, e] = mPt(b, MR + 0.04); dial += `<line x1="${P(a, c).split(' ')[0]}" y1="${P(a, c).split(' ')[1]}" x2="${P(d, e).split(' ')[0]}" y2="${P(d, e).split(' ')[1]}" stroke="#A9B6C6" stroke-width="${b % 2 ? 3 : 6}"/>`; }
  const dialImg = await svgImg(dial, (MR + 0.3) * 200, (MR + 0.3) * 200, 2);
  const warnOn = await svgImg(warnSym('brems', '#FF5C5C'), 512, 512, 0.5), warnOff = await svgImg(warnSym('brems', '#3C4656'), 512, 512, 0.5);
  const cap0 = 'Nach langer Standzeit ist kaum Druck da. Die Druckwarnung leuchtet und summt. Die Federspeicher halten den Lkw fest.';
  const F = [
    { t: 0, hold: true, cap: cap0, note: '▶ Sagen: „Der Lkw stand übers Wochenende. Ihr startet den Motor. Das Manometer zeigt den Vorratsdruck.“\n❓ Frage auf der Folie vorlesen: „Ab wann dürft ihr losfahren?“ – Antworten sammeln, noch nicht auflösen.\n🖱 Klick: Der Druck steigt (läuft von selbst bis zum nächsten Halt).\n➜ „Der Kompressor arbeitet …“' },
    { t: 1.5 }, { t: 3 }, { t: 4.5 },
    { t: 6, hold: true, cap: 'Der Druck steigt. Die Feststellbremse lässt sich schon lösen – aber die Warnung ist noch an: noch nicht losfahren!', note: '▶ „Der Druck steigt. Ab einem gewissen Druck lassen sich die Federspeicher lösen – aber die Druckwarnung ist noch an: Der Vorrat reicht noch nicht für mehrere kräftige Bremsungen!“\n✅ Federspeicher lösen je nach Fahrzeug bei etwa 5–7 bar (Fachquelle, herstellerabhängig).\n🖱 Klick: Der Druck steigt weiter.\n➜ „Wann also?“' },
    { t: 7 }, { t: 8 },
    { t: 8.6, hold: true, answer: true, cap: 'Die Druckwarnung geht aus: Jetzt ist genug Luft für sicheres Bremsen da. Erst jetzt losfahren.', note: '▶ „Erst wenn die Druckwarnung aus ist. Das ist die amtliche Antwort – jetzt steht sie auch auf der Folie.“\n✅ Prüfungsfrage 2.7.01-238: Frühestens losfahren, wenn die Signale der Druckwarneinrichtung aufgehört haben. FALSCH: sobald sich der Federspeicher löst; bei 3 bar.\n✅ Die Warnung muss spätestens kommen, wenn nach vier Vollbremsungen eine fünfte gerade noch die Hilfsbremswirkung bringt (EU-Bremsenrecht). Einen festen bar-Wert gibt es nicht.\n🖱 Klick: Der Kompressor füllt weiter.\n➜ „Und wenn der Kompressor weiterfüllt?“' },
    { t: 9.6 }, { t: 10.6 }, { t: 11.4 },
    { t: 12, hold: true, cap: 'Abschaltdruck erreicht: Der Druckregler schaltet ab und bläst kurz ab. Das Zischen ist normal.', note: '▶ „Bis zum Abschaltdruck – etwa 10 bis 13 bar. Dann schaltet der Regler ab, es zischt kurz.“\n✅ 2.7.06-232 (amtlicher Fragetext). Füllzeit nach EU-Recht: 65 % des Betriebsdrucks in höchstens 3 Minuten, mit Anhängeranschluss 6 Minuten – gemessen bei Nenndrehzahl, im Leerlauf dauert es länger. Dauert es länger: undicht oder Förderleistung zu gering (2.7.02-202).\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Was passiert, wenn ein Kreis undicht wird?“' },
  ];
  await motion(deck, 'c5d', {
    kicker: 'Druckluft', ttl: 'Wann dürft ihr losfahren?', frames: F, dur: 380,
    question: 'Der Motor läuft, der Druck steigt. Ab wann dürft ihr losfahren?',
    answer: 'Erst wenn die Druckwarnung aus ist – nicht schon, wenn sich die Feststellbremse lösen lässt.',
    legend: 'Vorratsdruck · Werte je nach Fahrzeug',
    scene: async (s, bar) => {
      s.oval(MX - MR - 0.6, MY - MR - 0.6, (MR + 0.6) * 2, (MR + 0.6) * 2, { fill: '0D141E', line: '2A3B52', lw: 2, name: '!!mface' });
      s.img(dialImg, { x: MX - MR - 0.3, y: MY - MR - 0.3, w: (MR + 0.3) * 2, h: (MR + 0.3) * 2, name: '!!mdial' });
      for (let b = 0; b <= MAXB; b += 2) { const [x, y] = mPt(b, MR + 0.3); s.text(String(b), { x: x - 0.25, y: y - 0.17, w: 0.5, h: 0.34, size: 14, bold: true, color: C.mut, align: 'center', valign: 'middle', name: '!!mz' + b }); }
      s.text('bar', { x: MX - 0.4, y: MY + 0.55, w: 0.8, h: 0.3, size: 13, color: C.dim, align: 'center', name: '!!mbar' });
      const a = mAng(bar), L = MR - 0.05;
      s.rrect(MX - L / 2 + (L / 2) * Math.cos(a), MY - 0.04 - (L / 2) * Math.sin(a), L, 0.08, { fill: C.or, rr: 0.5, rotate: -a * 180 / Math.PI, name: '!!mzeiger', glow: 6, glowColor: C.or });
      s.oval(MX - 0.17, MY - 0.17, 0.34, 0.34, { fill: '55606F', name: '!!mnabe' });
      s.text(bar.toFixed(1).replace('.', ',') + ' bar', { x: MX - 1.0, y: MY + 0.95, w: 2.0, h: 0.45, size: 22, bold: true, color: C.txt, align: 'center', name: '!!digi' });
      if (bar >= 12) s.text('zisch – Abschaltdruck', { x: MX - 1.4, y: MY + 1.45, w: 2.8, h: 0.35, size: 14, bold: true, color: C.bl, align: 'center', name: '!!tab' });
      const warn = bar < 8.6, fest = bar < 5.5, go = !warn;
      // rechte Spalte (Mitte x 11,78): rechts bleiben gut 0,6 Zoll Rand
      s.rrect(11.03, 2.0, 1.5, 1.5, { fill: '0A0F16', line: warn ? C.red : '2A3B52', lw: 2, rr: 0.2, name: '!!wbox', glow: warn ? 10 : undefined, glowColor: C.red });
      s.img(warn ? warnOn : warnOff, { x: 11.28, y: 2.12, w: 1.0, h: 1.0, name: '!!wsym' });
      s.text(warn ? 'Druckwarnung!' : 'Warnung aus', { x: 10.83, y: 3.55, w: 1.9, h: 0.35, size: 14, bold: true, color: warn ? C.red : C.gr, align: 'center', name: '!!twarn' });
      s.text(fest ? 'Feststellbremse:\nlässt sich nicht lösen' : 'Feststellbremse:\nlässt sich lösen', { x: 10.83, y: 4.1, w: 1.9, h: 0.75, size: 14, color: fest ? 'C8D0DA' : C.txt, align: 'center', valign: 'middle', name: '!!tfest' });
      s.rrect(10.98, 5.05, 1.6, 0.6, { fill: go ? C.gr : '2A1A1E', line: go ? C.gr : C.red, lw: 2, rr: 0.3, name: '!!go' });
      s.text(go ? 'losfahren' : 'warten', { x: 10.98, y: 5.05, w: 1.6, h: 0.6, size: 17, bold: true, color: go ? C.dark : C.red, align: 'center', valign: 'middle', name: '!!tgo' });
    },
  });

  // ===== VIERKREISSCHUTZVENTIL (fließend: Kreis 2 läuft leer, Ventil sperrt ab) =====
  await motion(deck, 'c5d', {
    kicker: 'Druckluft', ttl: 'Ein Kreis wird undicht', dur: 450,
    question: 'Eine Leitung im Kreis 2 platzt. Verliert jetzt die ganze Anlage ihre Luft?',
    answer: 'Nein. Das Vierkreisschutzventil sperrt den undichten Kreis ab – die anderen behalten ihren Druck und bremsen weiter.',
    legend: 'Schematisch · Füllstand = Druck im Kreis',
    frames: [
      { t: 0, hold: true, cap: 'Alle Kreise sind gefüllt. Das Vierkreisschutzventil hält die Kreise voneinander getrennt.', note: '▶ Sagen: „Hier die vier Kreise mit ihrem Druck. Alle voll.“\n❓ Frage auf der Folie: „Verliert jetzt die ganze Anlage ihre Luft?“ – abstimmen lassen.\n🖱 Klick: Die Leitung platzt (läuft von selbst).\n➜ „Schauen wir.“' },
      { t: 0.25, cap: 'Eine Leitung im Kreis 2 platzt. Die Luft zischt heraus, die Druckwarnung geht an.' }, { t: 0.5 },
      { t: 0.75, hold: true, note: '▶ „Kreis 2 – die Hinterachse – verliert Luft. Ihr hört es zischen, die Druckwarnung geht an. Auch die anderen Kreise verlieren kurz etwas Druck.“\n✅ Prüfungsfrage 2.7.02-213: Undichte Bremsleitung erkennt man am Zischen, an der Druckwarnung und an geringerer Bremswirkung.\n🖱 Klick: Das Ventil sperrt ab.\n➜ „Und jetzt?“' },
      { t: 0.88, cap: 'Das Ventil sperrt den undichten Kreis ab. Die anderen Kreise behalten ihren Sicherungsdruck – vorn wird weiter gebremst.' },
      { t: 1, hold: true, answer: true, note: '▶ „Das Vierkreisschutzventil sperrt den kaputten Kreis ab. Die anderen behalten genug Druck – der Lkw bremst weiter, aber schwächer. Sofort gefahrlos anhalten.“\n✅ Prüfungsfragen 2.7.06-223 und 2.7.02-304 (CE-Teil). Sicherungsdruck nach Fachquelle etwa 6–7 bar (herstellerabhängig).\n✅ 2.7.02-203: Druckwarnung während der Fahrt = Vorratsdruck nicht mehr ausreichend, Bremse wahrscheinlich defekt → sofort gefahrlos anhalten.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und noch etwas sammelt sich in den Behältern: Wasser.“' },
    ],
    scene: async (s, t) => {
      const lk = t > 0.01, closed = t >= 0.88;
      const lev2 = t <= 0.75 ? 1 - (t / 0.75) * 0.95 : 0.05;
      const levO = t <= 0.75 ? 1 - (t / 0.75) * 0.3 : Math.min(0.9, 0.7 + (t - 0.75) / 0.25 * 0.2);
      s.rrect(8.45, 1.9, 2.1, 0.95, { fill: '173048', line: C.bl, lw: 2, rr: 0.2, name: '!!vks2' });
      s.text('Vierkreisschutzventil', { x: 8.45, y: 1.9, w: 2.1, h: 0.95, size: 13, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!tvks2' });
      s.lineS(6.0, 2.37, 8.45, 2.37, { color: C.bl, lw: 5, name: '!!zul' });
      s.text('vom Trockner', { x: 6.0, y: 2.0, w: 1.8, h: 0.3, size: 12, italic: true, color: C.dim, name: '!!tzul' });
      for (let k = 0; k < 4; k++) {
        const x = 5.85 + k * 1.8, cx = x + 0.8, bad = k === 1 && lk, lev = k === 1 ? lev2 : levO;
        s.lineS(9.5, 2.85, cx, 3.75, { color: bad && closed ? '3C4656' : C.bl, lw: 4, name: '!!lt' + k });
        s.rrect(x, 3.75, 1.6, 1.7, { fill: '1A212C', line: bad ? C.red : C.bl, lw: 2, rr: 0.25, name: '!!bh' + k });
        const hh = 1.5 * lev;
        s.rrect(x + 0.1, 3.85 + 1.5 - hh, 1.4, Math.max(hh, 0.04), { fill: bad ? C.red : C.bl, ft: 40, rr: 0.15, name: '!!lv' + k });
        s.text(KL[k][0], { x, y: 5.5, w: 1.6, h: 0.3, size: 13, bold: true, color: bad ? C.red : C.txt, align: 'center', name: '!!tbk' + k });
        s.text(KL[k][1], { x: x - 0.05, y: 5.8, w: 1.7, h: 0.5, size: 13, color: 'C8D0DA', align: 'center', name: '!!tbv' + k });
      }
      s.img(await icon('LuWind', C.red), { x: 8.05, y: 4.0, w: 0.5, h: 0.5, name: '!!leck', transparency: lk ? 0 : 100 });
      s.text(lk ? 'zisch!' : '', { x: 7.9, y: 4.5, w: 0.9, h: 0.3, size: 14, bold: true, color: C.white, align: 'center', name: '!!tleck' });
      s.oval(8.88, 3.0, 0.42, 0.42, { fill: C.red, ft: closed ? 0 : 100, name: '!!zu' });
      s.text(closed ? '×' : '', { x: 8.88, y: 2.98, w: 0.42, h: 0.42, size: 20, bold: true, color: C.white, align: 'center', valign: 'middle', name: '!!tzu' });
      s.text(closed ? 'abgesperrt' : '', { x: 6.45, y: 2.48, w: 1.85, h: 0.32, size: 14, bold: true, color: C.red, align: 'right', name: '!!tabg' });
      s.rrect(11.65, 1.95, 1.4, 0.85, { fill: '0A0F16', line: lk ? C.red : '2A3B52', lw: 2, rr: 0.15, name: '!!wb2', glow: lk ? 8 : undefined, glowColor: C.red });
      s.img(lk ? warnOn : warnOff, { x: 11.95, y: 2.0, w: 0.75, h: 0.75, name: '!!ws2' });
    },
  });

  // ===== ENTWÄSSERN =====
  await ask(deck, 'c5d', {
    kicker: 'Druckluft · Entwässern', q: 'Ihr öffnet das Ventil am Luftbehälter – und es kommt Wasser. Was heißt das?', qsize: 30, ico: 'LuDroplets',
    answers: [
      ['LuWrench', 'Der Lufttrockner arbeitet nicht richtig.', 'Bald in die Werkstatt – Trockner und Kartusche prüfen lassen.', C.bl],
      ['LuSnowflake', 'Wasser ist gefährlich:', 'weniger Luftvorrat, Rost in Ventilen – und im Winter kann die Anlage einfrieren.', C.pu],
      ['LuListChecks', 'Abfahrtkontrolle:', 'Behälter entwässern, wenn keine automatischen Ventile verbaut sind. Bei Lufttrockner kein Frostschutzmittel in die Anlage.', C.gr],
    ],
    notes:
      '▶ Sagen: „Ältere oder einfache Lkw haben Ventile zum Entwässern von Hand. Ihr zieht am Ring – es zischt.“\n' +
      '❓ „Und wenn Wasser kommt?“\n' +
      '🖱 Klick 1–3: je eine Antwort.\n' +
      '✅ Mit funktionierendem Lufttrockner kommt kaum Wasser. Wasser heißt: Trockner arbeitet nicht richtig (Prüfungsfrage 2.7.06-220). Bei der Abfahrtkontrolle Luftbehälter entwässern, sofern keine automatischen Ventile verbaut sind (DGUV Grundsatz 314-002, Nr. 2.3.2).\n' +
      '➜ „Noch zwei Störungen, die ihr erkennen müsst.“',
  });

  // ===== STÖRUNGEN DRUCKLUFTBESCHAFFUNG =====
  {
    const s = base(deck, 'c5d', { notes:
      '▶ Sagen: „Zwei Störungen kommen in der Prüfung immer wieder.“\n' +
      '🖱 Klick 1: Füllen dauert zu lange · Klick 2: Kompressor hört nicht auf · Klick 3: Kontrolle am Kompressor.\n' +
      '✅ 2.7.02-202: Fülldauer zu lang → Behälter oder Anschlüsse undicht, Förderleistung zu gering. 2.7.02-215: zu geringe Förderleistung → verschmutzter Ansaugluftfilter, Luftpresser schadhaft. 2.7.02-204: Kompressor fördert ununterbrochen → Kolbenverschleiß (Abschaltdruck wird nicht erreicht) oder ein Kreis ist undicht. Am Luftpresser Druckleitungsanschluss und – falls vorhanden – Keilriemen kontrollieren (Fachwissen, Frage 2.7.06-406 aus dem Zugmaschinen-Teil).\n' +
      '➜ „Es gibt auch Lkw mit Hydraulik-Bremse. Ganz kurz.“' });
    kick(s, 'Druckluft · Störungen'); title(s, 'Was stimmt hier nicht?');
    await point(s, 0.7, 2.05, 11.93, 1.35, 'LuTimer', C.or, 'Das Füllen dauert viel länger als sonst:', 'Behälter oder Anschlüsse undicht – oder der Kompressor fördert zu wenig (Ansaugfilter verschmutzt, Kompressor defekt).', CLICK, { size: 17 });
    await point(s, 0.7, 3.6, 11.93, 1.35, 'LuRepeat', C.red, 'Der Kompressor hört nicht auf zu fördern:', 'Der Abschaltdruck wird nicht erreicht – Kompressor verschlissen oder ein Kreis ist undicht.', CLICK, { size: 17 });
    await point(s, 0.7, 5.15, 11.93, 1.35, 'LuEye', C.bl, 'Am Kompressor regelmäßig prüfen:', 'den Anschluss der Druckleitung und den Keilriemen (falls er per Riemen angetrieben wird).', CLICK, { size: 17 });
  }

  // ===== HYDRAULISCH / KOMBINIERT =====
  {
    const s = base(deck, 'c5d', { notes:
      '▶ Sagen: „Leichte Lkw – meist auf Transporter-Basis – bremsen wie ein Pkw mit Bremsflüssigkeit. Es gibt auch Mischformen: Druckluft drückt auf einen Hydraulik-Zylinder.“\n' +
      '🖱 Klick 1: Hydraulik · Klick 2: kombiniert.\n' +
      '✅ Bremsflüssigkeit zieht Wasser an, der Siedepunkt sinkt – bei langer Bergabfahrt Dampfblasen, das Pedal fällt durch. Darum Wechsel nach Herstellervorgabe (Prüfungsfrage 2.7.08-001). Pedal fällt bis zum Boden durch: Fahrzeug sofort abstellen, Bremse reparieren lassen – nur nachfüllen genügt nicht (2.7.02-109). Bei der kombinierten Anlage kontrolliert der Fahrer beides: Luftdruck und Bremsflüssigkeit.\n' +
      '✅ Abfahrtkontrolle Hydraulik: Stand der Bremsflüssigkeit prüfen; Pedal länger fest treten – es darf nicht nachgeben (DGUV Grundsatz 314-002 Nr. 2.3.1).\n' +
      '➜ „Kurze Prüfungsfrage zur Druckluft.“' });
    kick(s, 'Andere Bremsanlagen'); title(s, 'Hydraulisch und kombiniert');
    const H = [[C.or, 'Hydraulische Bremse', 'leichte Lkw', ['Pedal', 'Hauptbremszylinder', 'Bremsflüssigkeit', 'Radbremse'], 'Bremsflüssigkeit nach Vorgabe wechseln – sie zieht Wasser. Pedal fällt durch: sofort abstellen.'], [C.pu, 'Druckluft-Hydraulik', 'kombiniert', ['Ventil', 'Druckluft', 'Hydraulik-Zylinder', 'Radbremse'], 'Kontrolle von beidem: Luftdruck und Bremsflüssigkeit.']];
    for (let k = 0; k < 2; k++) {
      const x = 0.7 + k * 6.08, w = 5.85, col = H[k][0];
      card(s, x, 2.05, w, 4.45, { line: col }, CLICK);
      s.text(H[k][1], { x: x + 0.3, y: 2.2, w: w - 0.6, h: 0.5, size: 22, bold: true, color: C.txt }, { fx: 'fade', dur: 200 });
      s.text(H[k][2], { x: x + 0.3, y: 2.7, w: w - 0.6, h: 0.35, size: 15, italic: true, color: col }, { fx: 'fade', dur: 200 });
      // Kette: vier Stationen mit deutlichem Abstand und Pfeilen dazwischen
      H[k][3].forEach((t, j) => {
        const yy = 3.2 + j * 0.78;
        s.rrect(x + 0.4, yy, 2.6, 0.5, { fill: C.card2, line: col, lw: 1, rr: 0.2 }, { fx: 'fade', dur: 150 });
        s.text(t, { x: x + 0.4, y: yy, w: 2.6, h: 0.5, size: 15, bold: true, color: C.txt, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 150 });
        if (j < 3) s.lineS(x + 1.7, yy + 0.53, x + 1.7, yy + 0.75, { color: col, lw: 2.5, endArrow: 'triangle' }, { fx: 'fade', dur: 150 });
      });
      s.text(H[k][4], { x: x + 3.2, y: 3.2, w: w - 3.45, h: 2.84, size: 17, color: C.mut, valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
  }

  quiz(deck, 'c5d', {
    kicker: 'Quiz Druckluft', q: 'Welche Aufgabe hat das Vierkreisschutzventil?', size: 34,
    opts: ['Es schützt die Anlage vor zu hohem Druck', 'Es schließt einen undichten Kreis gegen die anderen ab', 'Es sichert die Versorgung der intakten Kreise'], ok: [1, 2],
    why: 'Fällt ein Kreis aus, sperrt das Ventil ihn ab – die anderen Kreise behalten ihren Druck. Vor zu hohem Druck schützt der Druckregler bzw. ein Sicherheitsventil (Prüfungsfrage 2.7.06-223).',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n💡 Mündlich abstimmen und begründen – kein Bogen zum Ausfüllen (Lernkontrolle, kein Prüfungsbogen, § 4 Abs. 1a FahrschAusbO).\n💡 Einmal ansagen: „Im Quiz stehen die Fragen mit Sie – so wie in der Prüfung. Sonst sagen wir ihr.“\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B und C.\n➜ „Weiter zu Kapitel 3: die Zweikreis-Bremse.“',
  });
};
module.exports.shiftImg = shiftImg;
