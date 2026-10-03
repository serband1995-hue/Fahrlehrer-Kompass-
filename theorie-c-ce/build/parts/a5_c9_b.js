// Abend 5 · C9: Kapitel 2 So wird gesichert (Formschluss, Niederzurren, Direktzurren, Reibung, Hilfsmittel, Zurrgurt)
const { C, sec, chapter, motion, steps, ask, photoAsk, arrow, seg } = require('../gs');
const { icon } = require('../lib');

sec('c9s', 'C9  ·  SO WIRD GESICHERT', C.or, 'bg_or.jpg');

// Heckansicht der Ladefläche (Fahrtrichtung in die Folie hinein)
const DY = 5.0, XL = 6.5, XR = 12.3, ZL = 6.84, ZR = 11.96;
function heck(s, { wallTop = 4.6 } = {}) {
  s.rect(8.4, DY + 0.22, 2.0, 0.33, { fill: '2A3342', name: '!!rahmen' });
  [[6.75, 7.27], [7.32, 7.84], [10.96, 11.48], [11.53, 12.05]].forEach(([a, b], i) => s.rrect(a, DY + 0.3, b - a, 1.0, { fill: '161B23', line: '3C4656', lw: 1, rr: 0.08, name: '!!rad' + i }));
  s.rect(XL, DY, XR - XL, 0.22, { fill: '5A6576', name: '!!deck' });
  s.rect(XL, wallTop, 0.14, DY - wallTop, { fill: '7C8796', name: '!!wandL' });
  s.rect(XR - 0.14, wallTop, 0.14, DY - wallTop, { fill: '7C8796', name: '!!wandR' });
  s.oval(ZL - 0.09, DY - 0.07, 0.18, 0.18, { fill: C.mut, line: C.dark, lw: 1, name: '!!zpL' });
  s.oval(ZR - 0.09, DY - 0.07, 0.18, 0.18, { fill: C.mut, line: C.dark, lw: 1, name: '!!zpR' });
}
function ladung(s, x0, x1, y0) {
  s.rect(x0, y0, x1 - x0, DY - y0, { fill: 'B9864A', line: '6E4E2A', lw: 1.5, name: '!!ldg' });
  s.rect(x0, y0 + (DY - y0) * 0.5 - 0.015, x1 - x0, 0.03, { fill: '8F6634', name: '!!ldgL' });
}

module.exports = async (deck) => {
  await chapter(deck, 'c9s', { num: 2, ttl: 'So wird gesichert', sub: 'Lückenlos anstellen, niederzurren oder direkt festzurren – und das richtige Werkzeug.', bg: 'j_gurt.jpg', notes:
    '▶ Sagen: „Kapitel 2: Wie sichert man Ladung richtig? Dafür gibt es drei Grundarten – und ein paar Helfer.“\n🖱 Keine Klicks.\n➜ „Die drei Arten.“' });

  // ===== DREI ARTEN (Morph, Heckansicht) =====
  {
    const H = [['Formschluss', 'Ladung steht lückenlos an Stirn- und Seitenwänden', C.gr], ['Niederzurren', 'Gurt presst die Ladung auf die Ladefläche', C.or], ['Direktzurren', 'Gurt hält die Ladung direkt fest', C.bl]];
    await steps(deck, 'c9s', {
      kicker: 'Sicherungsarten', ttl: 'Drei Arten zu sichern',
      list: ['Formschluss', 'Niederzurren', 'Direktzurren'],
      ask: { q: 'Was heißt „formschlüssig“ laden?', a: 'Die Ladung steht ohne Lücke an Stirn- und Seitenwänden. Lücken werden mit Füllmitteln geschlossen.', at: 1 },
      caps: [
        'Formschluss: Die Ladung steht ohne Lücke an den Wänden. Lücken füllt man mit Leerpaletten, Staupolstern oder Sperrbalken.',
        'Niederzurren: Der Gurt geht über die Ladung und presst sie auf die Ladefläche. So steigt die Reibung.',
        'Direktzurren: Der Gurt ist an der Ladung selbst befestigt und hält sie direkt – zum Beispiel bei Maschinen mit Zurrösen.',
      ],
      notes: [
        '▶ Sagen: „Wir schauen von hinten auf die Ladefläche. Die erste Art: Formschluss. Die Ladung steht ohne Lücke an der Stirnwand und an den Seitenwänden – sie kann keinen Schwung holen.“\n❓ Frage auf der Folie stellen.\n✅ Prüfungsfrage 2.2.22-210: Formschluss = Ladegut liegt direkt an Stirn- und Bordwand an; Freiräume sind durch geeignete Füllmittel geschlossen. 2.2.22-208: Abstützen gegen Stirn- und Bordwände bzw. gesicherte Distanzstücke.\n➜ „Und wenn die Ladung nicht die ganze Breite füllt?“',
        '▶ „Zweite Art: Niederzurren. Der Gurt läuft über die Ladung und presst sie auf die Ladefläche. Er hält sie nicht direkt – er sorgt für mehr Reibung.“\n✅ Auflösung: Prüfungsfrage 2.2.22-210 (Formschluss, siehe vorige Folie). Niederzurren = kraftschlüssige Sicherung (VDI 2700, DIN EN 12195-1).\n➜ „Und die dritte Art?“',
        '▶ „Dritte Art: Direktzurren. Der Gurt oder die Kette ist an der Ladung selbst befestigt – an Zurrösen – und schräg zum Zurrpunkt gespannt. Er hält die Ladung direkt.“\n✅ DIN EN 12195-1: Direktzurren (Schräg-, Diagonal-, Schlingenzurren) – hier zählt die Zurrkraft LC des Gurts.\n💡 In der Praxis wird oft kombiniert: Formschluss nach vorn plus Niederzurren.\n➜ „Schauen wir uns das Niederzurren genauer an.“',
      ],
      legend: 'Blick von hinten auf die Ladefläche · schematisch',
      scene: async (s, i) => {
        const [h, sub, col] = H[i];
        s.text(h, { x: 5.75, y: 1.45, w: 7.3, h: 0.45, size: 24, bold: true, color: col, name: '!!h' });
        s.text(sub, { x: 5.75, y: 1.9, w: 7.3, h: 0.32, size: 14, color: C.mut, name: '!!sub' });
        heck(s, { wallTop: i === 0 ? 2.65 : 4.6 });
        if (i === 0) ladung(s, XL + 0.14, XR - 0.14, 3.0); else ladung(s, 8.3, 10.5, 3.0);
        // Gurte
        const nz = i === 1, dz = i === 2;
        seg(s, ZL, DY, dz ? 8.3 : 8.3, dz ? 4.15 : 2.97, { name: '!!gL', hide: i === 0, th: 0.08 });
        seg(s, 8.3, 2.97, 10.5, 2.97, { name: '!!gT', hide: !nz, th: 0.08 });
        seg(s, 10.5, dz ? 4.15 : 2.97, ZR, DY, { name: '!!gR', hide: i === 0, th: 0.08 });
        s.oval(8.22, 4.07, 0.16, 0.16, { fill: dz ? C.mut : '8F6634', ft: dz ? 0 : 100, name: '!!oeL' });
        s.oval(10.42, 4.07, 0.16, 0.16, { fill: dz ? C.mut : '8F6634', ft: dz ? 0 : 100, name: '!!oeR' });
        // Druckpfeile (Niederzurren)
        [8.75, 9.4, 10.05].forEach((x, q) => arrow(s, x, 2.3, x, 2.88, { col: C.or, th: 0.08, head: 0.22, name: 'dp' + q, hide: !nz }));
        // Formschluss: Wände halten
        s.text(i === 0 ? 'Wand hält' : '', { x: XL - 0.05, y: 2.3, w: 1.4, h: 0.35, size: 13, bold: true, color: C.gr, name: '!!wtL' });
        s.text(i === 0 ? 'Wand hält' : '', { x: XR - 1.35, y: 2.3, w: 1.4, h: 0.35, size: 13, bold: true, color: C.gr, align: 'right', name: '!!wtR' });
        s.text(dz ? 'Zurröse' : '', { x: 8.35, y: 3.62, w: 2.1, h: 0.3, size: 12, bold: true, color: '4A3418', align: 'center', name: '!!oet' });
        s.text(i ? 'Zurrpunkt' : '', { x: ZL - 0.2, y: DY + 0.24, w: 1.4, h: 0.3, size: 11, color: C.mut, name: '!!zpt' });
      },
    });
  }

  // ===== NIEDERZURREN MIT RATSCHE (fließend) =====
  {
    const A = Math.atan2(DY - 2.97, ZR - 10.5), PX = 10.5 + (ZR - 10.5) * 0.52, PY = 2.97 + (DY - 2.97) * 0.52;
    const fr = (T, o = {}) => ({ ...o, t: { T, ...(o.t || {}) } });
    await motion(deck, 'c9s', {
      kicker: 'Niederzurren', ttl: 'Spannen mit der Ratsche', dur: 380, holdDur: 650,
      question: 'Der Gurt liegt oben auf der Ladung. Wie soll er sie beim Bremsen festhalten?',
      answer: 'Er presst die Ladung auf die Ladefläche. Mehr Druck heißt mehr Reibung – und die Reibung hält die Ladung.',
      legend: 'Blick von hinten · schematisch · Werte: Beispiel-Gurt mit STF 500 daN',
      frames: [
        fr(0, { hold: true, cap: 'Der Gurt liegt locker über der Ladung. So hält er noch gar nichts.', note: '▶ Sagen: „Der Gurt liegt über der Ladung, aber locker. Noch passiert nichts.“\n❓ Frage auf der Folie stellen und sammeln.\n🖱 Klick: Die Ratsche wird gespannt (läuft von selbst bis zur vollen Spannung).\n➜ „Spannen wir.“' }),
        fr(0.25, { t: { up: 1 }, cap: 'Ratsche betätigen: Mit jedem Hub wird der Gurt straffer.' }), fr(0.5), fr(0.75, { t: { up: 1 } }),
        fr(1, { hold: true, answer: true, cap: 'Voll gespannt: Der Gurt presst die Ladung auf die Ladefläche. Mehr Druck – mehr Reibung.', note: '▶ „Jetzt ist der Gurt gespannt. Er drückt die Ladung fest auf die Ladefläche. Dadurch steigt die Reibung – und die Reibung hält die Ladung.“\n✅ Niederzurren = kraftschlüssig: Die Vorspannkraft erhöht die Anpresskraft und damit die Reibkraft (VDI 2700, DIN EN 12195-1). Auf dem Etikett steht die normale Vorspannkraft STF – z. B. 500 daN, rund eine halbe Tonne, mit normaler Handkraft (SHF 50 daN).\n🖱 Klick: Was man noch beachten muss.\n➜ „Zwei Dinge noch.“' }),
        fr(1, { t: { kant: 1 }, hold: true, cap: 'Kantenschutz schützt Gurt und Ladung. Auf der Gegenseite kommt nur etwa die Hälfte der Spannung an – Ratschen abwechselnd links und rechts setzen.', note: '▶ „Erstens: Kantenschutz an die Ecken. Der schützt den Gurt vor dem Durchscheuern und die Ladung vor dem Eindrücken. Zweitens: Auf der Seite ohne Ratsche kommt durch die Reibung an den Kanten nur etwa die Hälfte der Spannung an. Deshalb die Ratschen abwechselnd links und rechts setzen – und unterwegs nachspannen.“\n✅ IHK Stuttgart „Ladungssicherung auf Fahrzeugen“ 2016, S. 21–23: k-Wert 1,5 – auf der Gegenseite kommt nur etwa die Hälfte der Vorspannung an, Ratschen abwechselnd setzen. BG BAU 2021: Kantenschutz/Kantengleiter an scharfen Kanten. Prüfungsfrage 2.7.09-227: Ladungssicherung regelmäßig überprüfen.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Wie viel hält die Reibung eigentlich?“' }),
      ],
      scene: async (s, { T, up = 0, kant = 0 }) => {
        // Anzeige Vorspannkraft
        s.text('Vorspannkraft', { x: 5.75, y: 1.5, w: 2.0, h: 0.4, size: 15, bold: true, color: C.mut, valign: 'middle', name: '!!vkL' });
        s.rrect(7.8, 1.58, 3.7, 0.24, { fill: '1A2433', line: C.line, rr: 0.5, name: '!!vkB' });
        s.rrect(7.8, 1.58, Math.max(0.05, 3.7 * T), 0.24, { fill: C.or, ft: T ? 0 : 100, rr: 0.5, name: '!!vkF', glow: T === 1 ? 8 : undefined, glowColor: C.or });
        s.text(Math.round(500 * T) + ' daN', { x: 11.6, y: 1.5, w: 1.45, h: 0.4, size: 18, bold: true, color: T ? C.or : C.dim, align: 'right', valign: 'middle', name: '!!vkV' });
        heck(s);
        ladung(s, 8.3, 10.5, 3.0);
        const ft = Math.round(70 - 70 * T);
        seg(s, ZL, DY, 8.3, 2.97, { name: '!!gL', th: 0.08, ft });
        seg(s, 8.3, 2.97, 10.5, 2.97, { name: '!!gT', th: 0.08, ft });
        seg(s, 10.5, 2.97, ZR, DY, { name: '!!gR', th: 0.08, ft });
        // Ratsche mit Hebel
        const deg = A * 180 / Math.PI;
        s.rrect(PX - 0.22, PY - 0.12, 0.44, 0.24, { fill: '9AA4B1', line: '5A6576', lw: 1, rr: 0.15, rotate: Math.round(deg), name: '!!rat' });
        const hA = (up ? -75 : -15) * Math.PI / 180;
        seg(s, PX, PY, PX + Math.cos(hA) * 0.62, PY + Math.sin(hA) * 0.62, { name: '!!hebel', col: '5A6576', th: 0.1 });
        // Druckpfeile wachsen
        [8.75, 9.4, 10.05].forEach((x, q) => arrow(s, x, 2.88 - (0.12 + 0.6 * T), x, 2.88, { col: C.or, th: 0.08 + 0.04 * T, head: 0.18 + 0.08 * T, name: 'dp' + q, hide: !T }));
        s.text(T >= 0.5 ? 'drückt auf die Ladefläche' : '', { x: 7.0, y: 1.95, w: 4.8, h: 0.3, size: 13, bold: true, color: C.or, align: 'center', name: '!!dpt' });
        // Kantenschutz + Hinweis Gegenseite
        [[8.18, 2.85, 0], [10.42, 2.85, 1]].forEach(([x, y, q]) => {
          s.rect(x, y, 0.2, 0.06, { fill: '8A95A6', ft: kant ? 0 : 100, name: '!!ksH' + q });
          s.rect(q ? x + 0.14 : x, y, 0.06, 0.24, { fill: '8A95A6', ft: kant ? 0 : 100, name: '!!ksV' + q });
        });
        s.text(kant ? 'Gegenseite: nur etwa die Hälfte' : '', { x: 5.7, y: 3.25, w: 1.95, h: 0.75, size: 13, bold: true, color: C.am, name: '!!geg' });
        s.text(kant ? 'Kantenschutz' : '', { x: 10.65, y: 2.55, w: 1.8, h: 0.3, size: 13, bold: true, color: C.mut, name: '!!kst' });
      },
    });
  }

  // ===== WIE VIEL HÄLT DIE REIBUNG? (Morph, Balken) =====
  {
    const R = [['Schmutzig, verschneit oder vereist', 0.2, 'max. 20 %'], ['Gitterbox auf Siebdruckboden', 0.25, '25 %'], ['Holz auf Holz, trocken', 0.5, '20–50 %', 0.2], ['mit Antirutschmatte', 0.6, '60 %']];
    const X0 = 9.0, SCL = 3.9, Y0 = 2.45, RH = 0.92;
    await steps(deck, 'c9s', {
      kicker: 'Reibung', ttl: 'Wie viel hält die Reibung?',
      list: ['Schmutzig oder vereist', 'Gitterbox auf Siebdruck', 'Holz auf Holz', 'Antirutschmatte'],
      ask: { q: 'Reicht die Reibung allein irgendwo aus?', a: 'Nein. Selbst mit Antirutschmatte fehlen nach vorn 20 %. Den Rest schaffen Formschluss oder Gurte.', at: 3 },
      caps: [
        'Schmutzig, verschneit oder vereist: Die Reibung hält höchstens etwa 20 % des Gewichts – oft weniger.',
        'Gitterbox aus Metall auf Siebdruckboden: etwa 25 %.',
        'Holz auf Holz, trocken: je nach Holz 20 bis 50 %.',
        'Mit Antirutschmatte: etwa 60 %. Gebraucht werden nach vorn aber 80 %!',
      ],
      notes: [
        '▶ Sagen: „Die rote Linie: 80 Prozent – so viel muss nach vorn gehalten werden. Wie viel schafft die Reibung allein? Ist die Ladefläche schmutzig, verschneit oder vereist: höchstens 20 Prozent.“\n✅ BG BAU „Ladungssicherung“ 2021, S. 15: Ist die Fläche nicht besenrein oder nicht frei von Frost, Eis und Schnee, darf höchstens μ = 0,2 angesetzt werden.\n➜ „Eine Gitterbox aus Metall?“',
        '▶ „Gitterbox aus Metall auf Siebdruckboden: etwa 25 Prozent.“\n✅ BG BAU 2021, Reibbeiwerte (nach VDI 2700 Blatt 14): Gitterbox auf Siebdruckboden 0,25.\n➜ „Und Holz auf Holz?“',
        '▶ „Holz auf Holz, trocken: je nach Holz 20 bis 50 Prozent. Nass deutlich weniger, fettig fast nichts.“\n✅ BG BAU 2021: Holz/Holz trocken 0,2–0,5, nass 0,2–0,25, fettig 0,05–0,15.\n➜ „Und mit Antirutschmatte?“',
        '▶ „Mit Antirutschmatte etwa 60 Prozent. Das ist viel – aber immer noch nicht 80.“\n❓ Frage auf der Folie auflösen.\n✅ BG BAU 2021: Antirutschmatte μ = 0,6. Gebraucht nach vorn: 0,8 g (DIN EN 12195-1).\n💡 Rechenbeispiel IHK Stuttgart (1 t Ladung, Ratsche STF 300 daN): bei μ 0,2 etwa 7 Gurte, bei μ 0,6 nur 1 Gurt – die Matte spart Gurte (nur als Tendenz).\n💡 Dazu kommt: Auf holpriger Straße hebt die Ladung kurz ab – dann ist die Reibung für einen Moment weg. Darum nie nur auf Reibung verlassen.\n➜ „Welche Helfer gibt es?“',
      ],
      legend: 'Anteil des Gewichts, den die Reibung hält (Reibbeiwert μ) · Werte: BG BAU 2021 nach VDI 2700 Blatt 14',
      scene: async (s, i) => {
        R.forEach(([lab, v, vt, vmin], q) => {
          const y = Y0 + q * RH, on = q === i, vis = q <= i;
          s.text(lab, { x: 5.75, y, w: 3.1, h: 0.62, size: 14, bold: on, color: on ? C.txt : vis ? C.mut : C.dim, valign: 'middle', name: '!!rl' + q });
          s.rrect(X0, y + 0.13, SCL, 0.36, { fill: '141D2A', line: '223044', rr: 0.3, name: '!!rb' + q });
          s.rrect(X0, y + 0.13, vis ? SCL * v : 0.05, 0.36, { fill: on ? (q === 3 ? C.gr : C.or) : '6A7686', ft: vis ? (vmin ? 55 : 0) : 100, rr: 0.3, name: '!!rf' + q });
          s.rrect(X0, y + 0.13, vis && vmin ? SCL * vmin : 0.05, 0.36, { fill: on ? C.or : '6A7686', ft: vis && vmin ? 0 : 100, rr: 0.3, name: '!!rg' + q });
          s.text(vis ? vt : '', { x: X0 + SCL * v + 0.08, y, w: 1.3, h: 0.62, size: on ? 20 : 15, bold: true, color: on ? C.txt : C.mut, valign: 'middle', name: '!!rv' + q });
        });
        // Linie 80 %
        s.rect(X0 + SCL * 0.8 - 0.015, Y0 - 0.25, 0.03, RH * 4 + 0.15, { fill: C.red, name: '!!l80' });
        s.text('gebraucht: 80 %', { x: X0 + SCL * 0.8 - 1.4, y: Y0 - 0.62, w: 2.8, h: 0.35, size: 14, bold: true, color: C.red, align: 'center', name: '!!l80t' });
      },
    });
  }

  // ===== HELFER =====
  await ask(deck, 'c9s', {
    kicker: 'Hilfsmittel', q: 'Welche Helfer für die Ladungssicherung kennt ihr?', ico: 'LuWrench', qsize: 32,
    answers: [
      ['LuSquareStack', 'Antirutschmatten', 'Unter die Ladung legen – die Reibung steigt auf etwa 60 %. Weniger Gurte nötig.', C.or, 17],
      ['LuShield', 'Kantenschutz', 'Schützt Gurt und Ladung an scharfen Kanten und verteilt die Kraft.', C.or, 17],
      ['LuGrip', 'Sperrbalken und Klemmstangen', 'Zwischen die Wände geklemmt – sie halten die Ladung formschlüssig, auch mitten im Laderaum.', C.or, 17],
      ['LuWind', 'Staupolster (Luftsäcke)', 'Füllen Lücken zwischen den Ladungsteilen – so entsteht Formschluss.', C.or, 17],
      ['LuLink', 'Zurrketten', 'Für schwere Maschinen und Baufahrzeuge – zum Direktzurren an den Zurrösen.', C.or, 17],
    ],
    notes:
      '▶ Sagen: „Welche Helfer habt ihr schon gesehen?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–5: je ein Hilfsmittel.\n' +
      '✅ VDI 2700 ff.: Hilfsmittel zur Ladungssicherung (rutschhemmendes Material, Kantenschutz, Sperrbalken/Ladungssicherungsbalken, Staupolster, Zurrketten nach DIN EN 12195-3). Prüfungsfrage 2.7.09-226: Stückgut durch Unterteilen der Ladefläche mit Trennelementen und formschlüssiges Anordnen sichern.\n' +
      '➜ „Schauen wir uns ein echtes Beispiel an.“',
  });

  // ===== FOTO: WAS IST HIER RICHTIG? =====
  await photoAsk(deck, 'c9s', {
    bg: 'j_lad_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Hinschauen', q: 'Was wurde hier richtig gemacht?', qsize: 30, w: 5.05, asize: 15,
    answers: [
      ['LuLink', 'Niedergezurrt', 'Gurte über die Paletten, straff gespannt.', C.or],
      ['LuShield', 'Kantenschutz', 'an den oberen Ecken.', C.or],
      ['LuSquareStack', 'Antirutschmatte', 'unter den Paletten – mehr Reibung.', C.or],
      ['LuPackage', 'Feste Ladeeinheit', 'Folie hält die Kartons zusammen.', C.or],
    ],
    notes:
      '▶ Sagen: „Schaut euch die Ladung an. Was ist hier richtig gemacht?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Niederzurren mit Kantenschutz und rutschhemmendem Material (VDI 2700 / DIN EN 12195-1). Die Ladeeinheit muss selbst stabil sein (Stretchfolie, Umreifung), sonst rutschen einzelne Kartons heraus.\n' +
      '💡 Wenn gefragt wird: Ob es reicht, hängt vom Gewicht ab – das berechnet man nach DIN EN 12195-1 (Zahl der Gurte).\n' +
      '➜ „Das wichtigste Werkzeug: der Zurrgurt. Was steht auf seinem Etikett?“',
  });

  // ===== ZURRGURT-ETIKETT (Morph) =====
  {
    const LX = 7.05, LY = 1.55, LW = 5.6, LH = 4.95;
    const F = [
      { y: 2.35, h: 0.9, k: 'LC 2500 daN', sub: 'Zurrkraft im geraden Zug', size: 32 },
      { y: 3.35, h: 0.75, k: 'SHF 50 daN  →  STF 500 daN', sub: 'Handkraft  →  Vorspannkraft', size: 20 },
      { y: 4.2, h: 0.75, k: 'PES · Dehnung < 7 %', sub: 'Material · Dehnung bei LC', size: 20 },
      { y: 5.05, h: 0.75, k: 'NICHT ZUM HEBEN!', sub: 'nur zum Zurren', size: 20 },
    ];
    await steps(deck, 'c9s', {
      kicker: 'Zurrgurt', ttl: 'Das steht auf dem Etikett',
      list: ['LC – Zurrkraft', 'STF – Vorspannkraft', 'Welcher Wert zählt?', 'Nur zum Zurren'],
      ask: { q: 'Was verrät das Etikett – und was tut ihr mit einem Gurt ohne Etikett?', a: 'Wie viel der Gurt hält (LC) und wie fest er spannt (STF). Ohne lesbares Etikett: nicht benutzen!', at: 3 },
      caps: [
        'LC = Zurrkraft: So viel Zugkraft hält der Gurt im geraden Zug – 2500 daN, so viel wie rund 2,5 Tonnen wiegen.',
        'STF = normale Vorspannkraft: So fest spannt die Ratsche bei normaler Handkraft (SHF 50 daN). Wichtig fürs Niederzurren.',
        'Niederzurren: Es zählt die STF. Direktzurren: Es zählt die LC. LC 2500 daN heißt NICHT: Der Gurt sichert 2,5 t Ladung!',
        'Zurrgurte sind nur zum Zurren da – niemals zum Heben. Dazu: Norm DIN EN 12195-2, Hersteller, Herstelljahr, Länge.',
      ],
      notes: [
        '▶ Sagen: „Jeder Zurrgurt hat so ein Etikett. Die wichtigste Zahl steht ganz oben: LC – die Zurrkraft. So viel hält der Gurt im geraden Zug. 2500 daN, das sind rund 2,5 Tonnen.“\n❓ Frage auf der Folie stellen.\n✅ DIN EN 12195-2 (nach BG BAU 2021, S. 35–36): Etikett mit LC (Zurrkraft im geraden Zug, in daN), SHF, STF, Hersteller, Herstelljahr, Länge (LGF/LGL), Dehnung (max. 7 %), Norm. 1 daN ≈ 1 kg Gewichtskraft.\n➜ „Die zweite Zahl.“',
        '▶ „STF – die normale Vorspannkraft. So stark spannt die Ratsche, wenn man mit normaler Handkraft zieht – SHF, 50 daN. Die STF braucht ihr fürs Niederzurren.“\n✅ BG BAU 2021: SHF (Standard Hand Force) 50 daN, STF (Standard Tension Force) z. B. 500 daN.\n💡 Hebel nicht mit einem Rohr verlängern – das ist verboten und beschädigt die Ratsche.\n➜ „Welcher Wert zählt denn nun?“',
        '▶ „Welcher Wert zählt? Beim Niederzurren die STF – also wie fest der Gurt auf die Ladung drückt. Beim Direktzurren die LC. Viele denken: LC 2500 daN, dann sichert der Gurt 2,5 Tonnen. Falsch! Beim Niederzurren drückt er nur mit der STF.“\n✅ BG BAU 2021, S. 35–36: LC sagt nicht, wie viel Ladung gesichert wird; zum Niederzurren nur Gurte mit STF-Angabe verwenden.\n➜ „Und ganz wichtig …“',
        '▶ „Zurrgurte sind nur zum Zurren. Niemals damit etwas anheben! Und: Ist das Etikett weg oder nicht mehr lesbar, wird der Gurt nicht mehr benutzt.“\n❓ Frage auf der Folie auflösen.\n✅ BG BAU 2021: Zurrgurte nicht zum Heben verwenden; ohne oder mit unleserlichem Etikett nicht benutzen (ablegereif). Zurrgurte haben keine CE-Kennzeichnung.\n➜ „Wann muss ein Gurt weg?“',
      ],
      legend: 'Beispiel-Etikett · Werte je nach Gurt verschieden',
      scene: async (s, i) => {
        s.rrect(LX, LY, LW, LH, { fill: '1E5AA8', line: '5B8BD0', lw: 2, rr: 0.06, shadow: true, name: '!!et' });
        s.text('EN 12195-2', { x: LX + 0.3, y: LY + 0.18, w: 2.6, h: 0.45, size: 18, bold: true, color: C.white, valign: 'middle', name: '!!etN' });
        s.text('Muster GmbH · 2025 · Nr. 4711', { x: LX + 2.6, y: LY + 0.18, w: LW - 2.9, h: 0.45, size: 13, color: 'D6E4F7', align: 'right', valign: 'middle', name: '!!etH' });
        s.rect(LX + 0.3, LY + 0.68, LW - 0.6, 0.02, { fill: '9CBCE6', name: '!!etS' });
        F.forEach((f, q) => {
          const on = i === 2 ? q < 2 : q === i;
          s.rrect(LX + 0.18, f.y - 0.04, LW - 0.36, f.h + 0.08, { fill: on ? '0D2E5C' : '1E5AA8', line: on ? C.or : '1E5AA8', lw: on ? 3 : 1, rr: 0.1, glow: on ? 10 : undefined, glowColor: C.or, name: '!!fb' + q });
          s.text([{ text: f.k, options: { bold: true, color: C.white, fontSize: f.size, breakLine: true } }, { text: f.sub, options: { color: 'D6E4F7', fontSize: 13 } }], { x: LX + 0.4, y: f.y, w: LW - 0.8, h: f.h, valign: 'middle', name: '!!ft' + q });
        });
        s.text('LGF 0,5 m · LGL 7,5 m', { x: LX + 0.4, y: LY + LH - 0.45, w: LW - 0.8, h: 0.3, size: 12, color: 'D6E4F7', name: '!!etL' });
      },
    });
  }

  // ===== ABLEGEREIFE =====
  await ask(deck, 'c9s', {
    kicker: 'Zurrgurt prüfen', q: 'Wann darf ein Zurrgurt nicht mehr benutzt werden?', ico: 'LuBan', qsize: 32,
    answers: [
      ['LuTag', 'Etikett fehlt oder ist unleserlich', 'Dann weiß niemand, was der Gurt aushält.', C.red, 17],
      ['LuScissors', 'Einschnitte oder Risse im Band', 'Garnbrüche oder Schnitte über 10 % des Querschnitts – weg damit.', C.red, 17],
      ['LuSpline', 'Beschädigte Nähte', 'Die tragenden Nähte halten die ganze Kraft.', C.red, 17],
      ['LuFlame', 'Hitze- oder Chemieschäden', 'Verschmolzene, harte oder verfärbte Stellen – das Band ist geschwächt.', C.red, 17],
      ['LuWrench', 'Ratsche oder Haken kaputt', 'Verformt, angerissen oder gebrochen.', C.red, 17],
    ],
    notes:
      '▶ Sagen: „Vor jeder Benutzung: Gurt anschauen. Wann muss er aussortiert werden?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–5: je ein Grund.\n' +
      '✅ BG BAU „Ladungssicherung“ 2021, S. 37 (nach DIN EN 12195-2): ablegereif bei Garnbrüchen/Schnitten über 10 % des Querschnitts, fehlender oder unlesbarer Kennzeichnung, verformten oder gerissenen Haken/Ratschen, beschädigten tragenden Nähten, Verformung durch Wärme, Schäden durch aggressive Stoffe.\n' +
      '💡 Verboten: Gurt knoten, verdreht spannen, zum Heben nutzen, über scharfe Kanten ohne Kantenschutz, Ratsche mit Rohr verlängern. Prüfungsfrage 2.2.22-113: Reißt ein Gurt in der Pause, erst weiterfahren, wenn er ersetzt ist oder die Ladung anders ausreichend gesichert ist.\n' +
      '➜ „Kapitel 3: Was trägt das Fahrzeug selbst zur Sicherung bei?“',
  });
};
