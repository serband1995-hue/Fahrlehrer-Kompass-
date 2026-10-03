// Abend 2 · C4: Lernziele, Kapitel 1 Federung, Kapitel 2 Räder und Reifen
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, steps, foot, svgImg, chapter, photoAsk, sign, lkw } = require('../gs');
const { icon } = require('../lib');

sec('c4', 'LEKTION C4', C.bl, 'bg_kap.jpg');
sec('c4f', 'C4  ·  FEDERUNG', C.bl, 'bg_blue.jpg');
sec('c4r', 'C4  ·  RÄDER UND REIFEN', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  // ===== LERNZIELE C4 =====
  {
    const s = base(deck, 'c4', { transition: 'black', notes:
      '▶ Sagen: „Willkommen zurück. In C4 geht es um alles, worauf der Lkw steht, rollt und leuchtet: Federung, Räder und Reifen, Aufbauten, Batterie und Licht.“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten.\n' +
      '➜ „Kapitel 1: die Federung.“' });
    kick(s, 'Lektion C4 · Fahrwerk / Elektrische Anlagen'); title(s, 'Das lernt ihr in C4');
    const T = [['01', 'Federung', 'Blattfeder, Luftfeder, Heben und Senken, Liftachse', '15 Min', C.bl], ['02', 'Räder und Reifen', 'Bezeichnung, Profil, Winterreifen, Zwillinge, Radmuttern, Ketten', '30 Min', C.or], ['03', 'Aufbauten', 'Plane, Koffer, Kipper, Wechselbrücke, Ladebordwand', '10 Min', C.pu], ['04', 'Batterie und Bordnetz', '24 Volt, Lichtmaschine, Starthilfe, Hauptschalter', '15 Min', 'C9A227'], ['05', 'Licht und Warnleuchten', 'Umriss, Seite, Kontur, Rundumlicht, Kontrollleuchten, Assistenten', '15 Min', C.red]];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nimmst du mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }

  // ===== KAPITEL 1 FEDERUNG =====
  await chapter(deck, 'c4f', { num: 1, ttl: 'Federung', sub: 'Blattfeder, Luftfeder – und warum man den Lkw heben und senken kann.', bg: 'g_rampe.jpg', notes:
    '▶ Sagen: „Kapitel 1: die Federung. Auf dem Bild steht ein Lkw an der Rampe – die Ladefläche ist genau auf Rampenhöhe. Das macht die Luftfederung möglich.“\n🖱 Keine Klicks.\n➜ „Welche Federn gibt es am Lkw?“' });

  // ===== BLATTFEDER / LUFTFEDER =====
  {
    const s = base(deck, 'c4f', { notes:
      '▶ Sagen: „Am Lkw gibt es zwei Arten von Federn: die Blattfeder und die Luftfeder.“\n' +
      '❓ „Welche Feder hält den Lkw leer und voll auf gleicher Höhe?“\n' +
      '✅ Die Luftfeder – die Bälge werden mit Druckluft aus der Bremsanlage mehr oder weniger gefüllt.\n' +
      '🖱 Klick 1: Blattfeder · Klick 2: Luftfeder.\n' +
      '💡 Bei der Abfahrtkontrolle: Blattfeder auf gebrochene oder verschobene Lagen ansehen; Luftbälge auf Risse, Zischen und schiefen Stand.\n' +
      '➜ „Mit der Luftfeder kann man den Lkw auch heben und senken.“' });
    kick(s, 'Federung'); title(s, 'Blattfeder und Luftfeder');
    // Blattfeder (Lagen als Bögen)
    let lf = '';
    for (let k = 0; k < 5; k++) { const w = 460 - k * 70, x0 = 260 - w / 2; lf += `<path d="M ${x0} ${60 + k * 18} Q 260 ${110 + k * 18} ${x0 + w} ${60 + k * 18}" fill="none" stroke="#A9B6C6" stroke-width="12" stroke-linecap="round"/>`; }
    lf += '<rect x="235" y="40" width="50" height="140" rx="6" fill="#55606F"/><circle cx="30" cy="60" r="18" fill="none" stroke="#738296" stroke-width="8"/><circle cx="490" cy="60" r="18" fill="none" stroke="#738296" stroke-width="8"/>';
    // Luftfederbalg
    let lb = '<rect x="160" y="10" width="200" height="22" rx="6" fill="#55606F"/><rect x="185" y="180" width="150" height="40" rx="8" fill="#55606F"/>';
    lb += '<ellipse cx="260" cy="70" rx="110" ry="42" fill="#1B1F26" stroke="#4CC9F0" stroke-width="8"/><ellipse cx="260" cy="140" rx="110" ry="42" fill="#1B1F26" stroke="#4CC9F0" stroke-width="8"/>';
    const P = [['Blattfeder', await svgImg(lf, 520, 220), C.mut, 'Stahl-Lagen, sehr robust – oft vorn und an Baustellen-Lkw.', 'Kontrolle: gebrochene oder verschobene Lagen, schiefer Stand.'], ['Luftfeder', await svgImg(lb, 520, 220), C.bl, 'Bälge mit Druckluft – gleiche Höhe bei jeder Beladung, schont Ladung und Straße.', 'Kontrolle: Risse, Zischen, Lkw steht schief.']];
    for (let k = 0; k < 2; k++) {
      const x = 0.7 + k * 6.08;
      card(s, x, 2.05, 5.85, 4.45, { line: P[k][2] }, CLICK);
      s.img(P[k][1], { x: x + 0.8, y: 2.3, w: 4.25, h: 1.8 }, { fx: 'fade', dur: 250 });
      s.text(P[k][0], { x: x + 0.3, y: 4.15, w: 5.25, h: 0.5, size: 24, bold: true, color: P[k][2] === C.mut ? C.txt : C.bl }, { fx: 'fade', dur: 200 });
      s.text(P[k][3], { x: x + 0.3, y: 4.7, w: 5.25, h: 0.85, size: 17, color: C.txt }, { fx: 'fade', dur: 200 });
      s.text(P[k][4], { x: x + 0.3, y: 5.55, w: 5.25, h: 0.8, size: 16, italic: true, color: C.mut }, { fx: 'fade', dur: 200 });
    }
  }

  // ===== HEBEN UND SENKEN (Morph, Seitenansicht) =====
  const GY = 6.1, RX = 11.45;           // Boden, Rampenkante
  await steps(deck, 'c4f', {
    kicker: 'Luftfederung', ttl: 'Heben und Senken',
    ask: { q: 'Was müsst ihr nach dem Laden tun?', a: 'Zurück aufs Fahrniveau – sonst Anstoß an Brücken und Toren.', at: 2 },
    list: ['Fahrniveau', 'An der Rampe anheben', 'Danach: zurück aufs Fahrniveau'],
    caps: [
      'Die Luftfeder hält den Aufbau bei jeder Beladung auf der gleichen Höhe: dem Fahrniveau.',
      'Mit dem Bedienteil hebt ihr die Ladefläche auf Rampenhöhe. Nur im Stand – niemand unter oder neben dem Lkw: Quetschgefahr!',
      'Nach dem Laden zurück aufs Fahrniveau. Sonst stößt der Aufbau an Brücken oder Tore, und der Lkw fährt schlechter.',
    ],
    notes: [
      '▶ Sagen: „Seitenansicht: Lkw mit Koffer, hinten die Laderampe. Die Ladefläche steht tiefer als die Rampe.“\n❓ „Wie bekommt ihr die Ladefläche auf Rampenhöhe?“\n✅ Mit der Niveauregulierung der Luftfederung (Heben/Senken per Bedienteil oder Fernbedienung).\n➜ „Wir heben an.“',
      '▶ „Die Bälge werden mit mehr Luft gefüllt, der Aufbau geht hoch. Jetzt passt die Ladefläche zur Rampe.“\n✅ Bedienung nur im Stand; auf Personen und Gegenstände unter und neben dem Fahrzeug achten – Quetschgefahr (Herstellerangaben, z. B. ECAS).\n💡 Gleiches Prinzip beim Auf- und Absatteln einer Wechselbrücke.\n➜ „Und nach dem Laden?“',
      '▶ „Taste für das Fahrniveau drücken. Viele Systeme regeln ab einer bestimmten Geschwindigkeit selbst zurück – verlassen dürft ihr euch darauf nicht.“\n✅ Sonst: Anstoß an Brücken oder Toren, Aufsetzen, schlechteres Fahrverhalten.\n➜ „Noch eine Besonderheit: die Liftachse.“',
    ],
    legend: 'Seitenansicht · schematisch',
    scene: async (s, i) => {
      // Detaillierter Lkw (Front links), Aufbau hebt sich per Morph; Räder bleiben stehen
      const K = 1.3, XF = 5.85, F = 0.72, LIFT = i === 1 ? 0.28 : 0;
      const floorY = GY - (F + 0.07 + LIFT) * K, rampY = GY - (F + 0.07 + 0.28) * K;
      s.rect(RX, rampY, 13.2 - RX, GY - rampY, { fill: '3C4656', name: '!!rampe' });
      s.rect(RX, rampY - 0.06, 13.2 - RX, 0.06, { fill: C.am, name: '!!rkante' });
      s.text('Rampe', { x: RX + 0.1, y: rampY + 0.3, w: 1.6, h: 0.4, size: 15, bold: true, color: C.mut, name: '!!trampe' });
      s.rect(5.7, GY, 7.5, 0.05, { fill: '55606F', name: '!!boden' });
      // Luftbalg hinter der Hinterachse + Längslenker
      const bx = XF + 3.62 * K, top = GY - (F - 0.13 + LIFT) * K, bot = GY - 0.36 * K;
      s.rect(XF + 3.25 * K, GY - 0.3 * K - 0.05, 0.61 * K, 0.1, { fill: '8A96A6', name: '!!lenker' });
      s.rrect(bx, top, 0.26 * K, bot - top, { fill: '1B1F26', line: C.bl, lw: 2.5, rr: 0.25, name: '!!balg', glow: i === 1 ? 8 : undefined, glowColor: C.bl });
      await lkw(s, { L: 4.2, axles: [0.62, 3.25], floor: F, boxH: 1.5, top: F + 1.5 + 0.25 }, { x: XF, gy: GY, k: K, name: 'lkw', split: true, lift: LIFT });
      s.text('Ladefläche', { x: XF + 1.6 * K, y: floorY - 0.42, w: 2.3 * K, h: 0.35, size: 14, bold: true, color: '3C4656', align: 'center', name: '!!tlade' });
      s.rect(XF + 1.47 * K, floorY - 0.03, (4.2 - 1.52) * K, 0.06, { fill: i === 1 ? C.gr : C.or, name: '!!boden2' });
      // Höhenhinweis
      const ok = i === 1;
      s.text(ok ? 'passt!' : (i === 0 ? 'zu tief' : ''), { x: 11.45, y: 3.9, w: 1.7, h: 0.4, size: 17, bold: true, color: ok ? C.gr : (i === 0 ? C.or : C.dim), align: 'center', name: '!!thoehe' });
      s.text(i === 2 ? '↓ Fahrniveau' : (i === 1 ? '↑ angehoben' : ''), { x: 11.45, y: 3.4, w: 1.75, h: 0.4, size: 17, bold: true, color: i === 2 ? C.gr : C.bl, name: '!!tniv' });
      s.text('Luftbalg', { x: 10.1, y: GY + 0.12, w: 1.7, h: 0.35, size: 13, color: C.bl, align: 'center', name: '!!tbalg' });
      if (i === 1) {
        // Warnung über der Szene (links steht die Frage an die Klasse)
        s.img(await icon('LuTriangleAlert', C.red), { x: 5.85, y: 1.7, w: 0.45, h: 0.45, name: '!!warn' });
        s.text('Nur im Stand – Quetschgefahr!', { x: 6.4, y: 1.7, w: 5.2, h: 0.45, size: 18, bold: true, color: C.red, valign: 'middle', name: '!!twarn' });
      }
    },
  });

  // ===== LIFTACHSE =====
  await ask(deck, 'c4f', {
    kicker: 'Liftachse', q: 'Leer unterwegs: Die Liftachse ist oben. Was müsst ihr wissen?', qsize: 30, ico: 'LuArrowUpDown',
    answers: [
      ['LuTrendingDown', 'Vorteil', 'weniger Reifenverschleiß, weniger Diesel, kleinerer Wendekreis.', C.gr],
      ['LuWeight', 'Achslast beachten', '– die Antriebsachse trägt mehr. Beladen senkt sich die Liftachse meist selbst ab.'],
      ['LuSnowflake', 'Anfahrhilfe auf Glätte', 'Liftachse kurz anheben: mehr Druck auf die Antriebsachse. Spätestens vor 30 km/h senkt sie sich wieder ab.', C.bl],
      ['LuBan', 'Reifenschaden an der Liftachse, Lkw voll?', 'Nicht anheben und weiterfahren – Rad wechseln oder Pannendienst.', C.red],
    ],
    notes:
      '▶ Sagen: „Viele Lkw haben eine Liftachse. Leer wird sie hochgezogen.“\n' +
      '❓ „Was bringt das? Und worauf müsst ihr achten?“\n' +
      '🖱 Klick 1–4: je eine Antwort.\n' +
      '✅ Anfahrhilfe: Die Antriebsachse darf dabei bis zu 30 % über der zulässigen Achslast liegen (höchstens Herstellerwert); spätestens vor 30 km/h muss die Liftachse automatisch wieder absenken (VO (EU) 1230/2012 Anhang IV).\n' +
      '✅ Prüfungsfrage 2.7.01-247 (Reifenschaden an der Liftachse, voll beladen): Rad nach Bedienungsanleitung wechseln oder Lkw-Pannendienst – nicht anheben und weiterfahren, das überlastet die anderen Achsen.\n' +
      '➜ „Kurze Prüfungsfrage zur Luftfederung.“',
  });

  quiz(deck, 'c4f', {
    kicker: 'Quiz Federung', q: 'Ein Luftfederbalg ist stark undicht. Was kann passieren?', size: 34,
    opts: ['Das Fahrzeug neigt sich zu einer Seite', 'Die Bremswirkung kann sich verändern', 'Der Motor verliert Leistung'], ok: [0, 1],
    why: 'Der Lkw sackt auf der Seite ab. Und: Der automatische Bremskraftregler bekommt seinen Steuerdruck oft vom Luftbalg – stimmt der nicht, stimmt die Bremskraft nicht (Prüfungsfrage 2.7.02-211).',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und B.\n💡 Den Bremskraftregler (ALB) besprechen wir in der Bremsen-Lektion C5.\n➜ „Weiter zu Kapitel 2: Räder und Reifen.“',
  });

  // ===== KAPITEL 2 RÄDER UND REIFEN =====
  await chapter(deck, 'c4r', { num: 2, ttl: 'Räder und Reifen', sub: 'Bezeichnung lesen, Profil, Winterreifen, Zwillinge, Radmuttern, Schneeketten.', ico: 'LuCircleDot', notes:
    '▶ Sagen: „Kapitel 2: Räder und Reifen. Der Reifen ist die einzige Verbindung zur Straße – beim Lkw pro Reifen etwa so groß wie ein Blatt DIN A5.“\n🖱 Keine Klicks.\n➜ „Erst lesen wir einen Reifen.“' });

  // ===== REIFENBEZEICHNUNG (Morph) =====
  const SEG = [['315', 0.95], ['/', 0.22], ['70', 0.62], ['R', 0.42], ['22,5', 1.0], ['154/150', 1.95], ['L', 0.42]];
  const segX = []; { let x = 6.15; for (const [, w] of SEG) { segX.push(x); x += w + 0.1; } }
  const HL = [[0], [2], [3], [4], [5], [6]];
  await steps(deck, 'c4r', {
    kicker: 'Reifen lesen', ttl: 'Was steht auf dem Reifen?',
    list: ['Breite', 'Höhe', 'Bauart', 'Felge', 'Tragfähigkeit', 'Höchstgeschwindigkeit'],
    caps: [
      '315: Der Reifen ist 315 mm breit.',
      '70: Die Flanke ist 70 % so hoch wie der Reifen breit ist.',
      'R: Radialreifen – heute üblich.',
      '22,5: passt auf eine Felge mit 22,5 Zoll Durchmesser.',
      '154/150: Tragfähigkeit. 154 = 3.750 kg als Einzelreifen, 150 = 3.350 kg je Reifen als Zwilling.',
      'L: Höchstgeschwindigkeit des Reifens – L = 120 km/h.',
    ],
    notes: [
      '▶ Sagen: „So steht es auf einem typischen Lkw-Reifen: 315/70 R 22,5 154/150 L. Wir lesen von links. 315 ist die Breite in Millimetern.“\n➜ „Dann die 70.“',
      '▶ „70 heißt: Die Höhe der Flanke ist 70 % der Breite. Man sagt Querschnittsverhältnis.“\n➜ „Das R?“',
      '▶ „R steht für Radialbauart. Wichtig: Über 3,5 t müssen an einer Achse alle Reifen die gleiche Bauart haben – nur Radial oder nur Diagonal (§ 36 Abs. 6 StVZO).“\n➜ „Dann die Felge.“',
      '▶ „22,5 ist der Felgendurchmesser in Zoll.“\n➜ „Jetzt kommt das Wichtigste für den Lkw.“',
      '▶ „154/150 ist die Tragfähigkeit. Die erste Zahl gilt für einen Einzelreifen, die zweite für jeden Reifen am Zwilling. 154 heißt 3.750 kg, 150 heißt 3.350 kg je Reifen.“\n✅ Prüfungsfrage 2.7.05-221 (Tragfähigkeitskennzahl Einzel/Zwilling); Werte aus den Lastindex-Tabellen der Reifenhersteller.\n➜ „Und der letzte Buchstabe?“',
      '▶ „L ist der Geschwindigkeitsindex: L heißt bis 120 km/h.“\n✅ Prüfungsfrage 2.7.05-220. Zum Vergleich: K = 110, M = 130 km/h.\n➜ „Und jetzt an einem echten Reifen: Findet ihr alles wieder?“',
    ],
    legend: 'Beispiel einer Reifenbezeichnung',
    scene: async (s, i) => {
      s.rrect(5.95, 1.75, 7.2, 1.0, { fill: '1B1F26', line: '3C4656', lw: 2, rr: 0.2, name: '!!flanke' });
      const h = HL[i][0];
      s.rrect(segX[h] - 0.06, 1.85, SEG[h][1] + 0.12, 0.8, { fill: C.or, rr: 0.15, name: '!!hl2' });
      SEG.forEach(([t, w], k) => s.text(t, { x: segX[k], y: 1.85, w, h: 0.8, size: 30, bold: true, color: k === h ? C.dark : C.mut, align: 'center', valign: 'middle', name: '!!sg' + k }));
      const big = ['315 mm breit', 'Flanke = 70 % der Breite', 'Radialreifen', 'Felge 22,5 Zoll', 'einzeln 3.750 kg · Zwilling je 3.350 kg', 'bis 120 km/h'][i];
      s.text(big, { x: 5.95, y: 2.95, w: 7.2, h: 0.6, size: i === 4 ? 22 : 26, bold: true, color: C.txt, align: 'center', name: '!!big' });
      // Querschnitt Reifen auf Felge
      const cx = 9.55, ty = 3.95, tw = 2.0, th = 1.4;
      s.rrect(cx - tw / 2, ty, tw, th, { fill: '1B1F26', line: i <= 2 ? C.or : '55606F', lw: 2, rr: 0.25, name: '!!q1' });
      s.rect(cx - tw / 2 + 0.25, ty + th - 0.05, tw - 0.5, 0.85, { fill: i === 3 ? C.or : '6E7888', name: '!!felge' });
      // Maßpfeile
      s.lineS(cx - tw / 2, ty - 0.18, cx + tw / 2, ty - 0.18, { color: i === 0 ? C.or : C.dim, lw: 2, beginArrow: 'triangle', endArrow: 'triangle', name: '!!mb' });
      s.lineS(cx + tw / 2 + 0.2, ty, cx + tw / 2 + 0.2, ty + th, { color: i === 1 ? C.or : C.dim, lw: 2, beginArrow: 'triangle', endArrow: 'triangle', name: '!!mh' });
      s.text('Breite', { x: cx - 0.8, y: ty - 0.55, w: 1.6, h: 0.32, size: 13, bold: i === 0, color: i === 0 ? C.or : C.dim, align: 'center', name: '!!tb' });
      s.text('Höhe', { x: cx + tw / 2 + 0.3, y: ty + th / 2 - 0.16, w: 1.0, h: 0.32, size: 13, bold: i === 1, color: i === 1 ? C.or : C.dim, name: '!!th' });
      s.text('Felge', { x: cx + tw / 2 + 0.3, y: ty + th + 0.2, w: 1.0, h: 0.32, size: 13, bold: i === 3, color: i === 3 ? C.or : C.dim, name: '!!tfe' });
      s.text('Querschnitt', { x: 6.0, y: ty + 0.2, w: 1.8, h: 0.32, size: 13, italic: true, color: C.dim, name: '!!tq' });
    },
  });

  // ===== ECHTER REIFEN (Foto mit Markierungen) =====
  {
    const s = base(deck, 'c4r', { bg: 'g_flanke.jpg', notes:
      '▶ Sagen: „Ein echter Lkw-Reifen. Wer findet die Größe, die Tragfähigkeit und das Wintersymbol?“\n' +
      '❓ Die Klasse suchen lassen, dann klicken.\n' +
      '🖱 Klick 1: Größe · Klick 2: Tragfähigkeit und Tempo · Klick 3: Alpine-Symbol · Klick 4: M+S.\n' +
      '✅ 315/70 R22.5 = Breite 315 mm, Flanke 70 %, Radial, Felge 22,5 Zoll. 154/150 L = Tragfähigkeit einzeln/Zwilling, bis 120 km/h (Prüfungsfragen 2.7.05-220, -221). Alpine-Symbol (Berg mit Schneeflocke) = Winterreifen nach § 36 Abs. 4 StVZO. M+S allein reicht seit 1.10.2024 nicht mehr.\n' +
      '💡 Auf der Flanke steht auch die DOT-Nummer: Die letzten vier Ziffern sind Woche und Jahr der Herstellung, z. B. 2324 = 23. Woche 2024. Runderneuerte Reifen erkennt man an der Kennzeichnung „RETREAD“ (amtliche Antwort, Prüfungsfrage 2.7.05-212) bzw. „Runderneuert“ und am Prüfzeichen.\n' +
      '➜ „Wie viel Profil muss mindestens drauf sein?“' });
    s.rrect(9.55, 0.45, 3.4, 1.35, { fill: '070B12', ft: 15, rr: 0.08 });
    s.text('REIFEN LESEN', { x: 9.75, y: 0.55, w: 3.1, h: 0.35, size: 13, bold: true, color: C.or, cs: 3 });
    s.text('Findet die Angaben!', { x: 9.75, y: 0.9, w: 3.1, h: 0.8, size: 26, bold: true, color: C.txt });
    const tag = (x, y, w, txt, col, tx, ty, anim) => {
      s.lineS(tx, ty, x + w / 2, y, { color: col, lw: 2.5 }, anim);
      s.oval(tx - 0.08, ty - 0.08, 0.16, 0.16, { fill: col }, { fx: 'zoom', dur: 200 });
      s.text(txt, { x, y, w, h: 0.95, size: 15, bold: true, color: C.txt, fill: '0A0F16', ft: 8, line: col, lw: 2, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.12, align: 'center', valign: 'middle', margin: [6, 8, 6, 8] }, { fx: 'fade', dur: 250 });
    };
    tag(0.6, 3.35, 3.9, 'Größe: 315 mm breit · Flanke 70 % · Radial · Felge 22,5 Zoll', C.or, 3.4, 2.35, CLICK);
    tag(4.4, 5.55, 3.6, 'Tragfähigkeit 154 einzeln / 150 Zwilling · L = bis 120 km/h', C.bl, 7.1, 4.2, CLICK);
    tag(10.15, 2.9, 2.85, 'Alpine-Symbol: gilt als Winterreifen', C.gr, 9.35, 4.95, CLICK);
    tag(10.15, 5.75, 2.85, 'M+S allein reicht seit 1.10.2024 nicht mehr', C.red, 9.9, 5.8, CLICK);
  }

  // ===== PROFIL =====
  {
    const s = base(deck, 'c4r', { notes:
      '▶ Sagen: „Wie viel Profil braucht ein Lkw-Reifen mindestens?“\n' +
      '❓ Antworten sammeln – oft hört man 2 oder 3 mm.\n' +
      '✅ Gesetzlich 1,6 mm im Hauptprofil – auf dem ganzen Umfang (§ 36 Abs. 3 StVZO). Für Lkw gilt kein höherer Wert. Mehr ist eine Empfehlung, besonders im Winter.\n' +
      '🖱 Klick 1: Mindestprofil · Klick 2: Bußgeld · Klick 3: gleiche Bauart.\n' +
      '✅ BKat Nr. 212 (Fahrer): 60 €, 1 Punkt · Nr. 213 (Halter): 75 €, 1 Punkt. Bauart gemischt: BKat 208, 15 €.\n' +
      '➜ „Und wann brauche ich Winterreifen?“' });
    kick(s, 'Profil'); title(s, 'Wie viel Profil muss sein?');
    // Profil-Schnitt
    let pr = '<rect x="0" y="60" width="600" height="170" rx="10" fill="#3C4656"/>';
    for (let k = 0; k < 5; k++) pr += `<rect x="${60 + k * 120 - 20}" y="60" width="40" height="90" fill="#0D141E"/>`;
    card(s, 0.7, 2.05, 5.6, 4.45, {});
    s.img(await svgImg(pr, 600, 240), { x: 0.95, y: 2.5, w: 5.1, h: 2.04 });
    s.lineS(3.5, 3.03, 3.5, 3.75, { color: C.or, lw: 2, beginArrow: 'triangle', endArrow: 'triangle' }, CLICK);
    s.text('Profiltiefe: mind. 1,6 mm', { x: 1.5, y: 4.65, w: 4.0, h: 0.4, size: 18, bold: true, color: C.or, align: 'center' }, { fx: 'fade', dur: 200 });
    s.text('Hauptprofil: die breiten Rillen in der Mitte der Lauffläche', { x: 0.95, y: 5.25, w: 5.1, h: 0.8, size: 15, color: C.mut, align: 'center' });
    await point(s, 6.55, 2.05, 6.08, 1.4, 'LuRuler', C.or, '1,6 mm – auch beim Lkw', 'auf dem ganzen Umfang. Mehr ist besser, besonders im Winter.', { fx: 'flyL', dur: 450 }, { br: true, size: 17 });
    await point(s, 6.55, 3.58, 6.08, 1.4, 'LuCircleAlert', C.red, 'Zu wenig Profil:', 'Fahrer 60 €, 1 Punkt – Halter 75 €, 1 Punkt.', CLICK, { br: true, size: 17 });
    await point(s, 6.55, 5.11, 6.08, 1.4, 'LuLayers', C.pu, 'Gleiche Bauart je Achse', 'Über 3,5 t an einer Achse nur Radial- oder nur Diagonalreifen.', CLICK, { br: true, size: 17 });
  }

  // ===== WINTERREIFEN (Draufsicht 6×2) =====
  {
    const s = base(deck, 'c4r', { notes:
      '▶ Sagen: „Winterreifen: Es gibt kein festes Datum. Die Pflicht gilt bei Glatteis, Schneeglätte, Schneematsch, Eis- oder Reifglätte (§ 2 Abs. 3a StVO).“\n' +
      '❓ „Brauchen beim Lkw alle Räder Winterreifen?“\n' +
      '🖱 Klick 1: Lenkachse vorn · Klick 2: Antriebsachse · Klick 3–5: die Regeln.\n' +
      '✅ Grundsätzlich alle Räder. Bei Lkw über 3,5 t (N2, N3) genügt: mindestens die Räder der permanent angetriebenen Achsen und der vorderen Lenkachsen – die Lenkachse seit 1.7.2020.\n' +
      '✅ Als Winterreifen zählt nur ein Reifen mit Alpine-Symbol (Berg mit Schneeflocke, § 36 Abs. 4 StVZO). Reine M+S-Reifen gelten seit 1.10.2024 nicht mehr.\n' +
      '✅ BKat Nr. 5a: 60 €, 1 Punkt · mit Behinderung (5a.1) 80 €, 1 Punkt · Halter (213a) 75 €, 1 Punkt.\n' +
      '➜ „Beim Lkw gibt es oft zwei Reifen nebeneinander. Was ist da wichtig?“' });
    kick(s, 'Winterreifen'); title(s, 'Welche Achsen brauchen Winterreifen?');
    // Draufsicht: Front links
    card(s, 0.7, 2.05, 5.6, 4.45, {});
    const Y = 4.2;
    s.rect(1.4, Y - 0.45, 4.3, 0.9, { fill: '3C4656' });
    s.rrect(1.0, Y - 0.6, 0.9, 1.2, { fill: 'D9DEE6', rr: 0.15 });
    s.text('vorn', { x: 0.9, y: 5.55, w: 1.1, h: 0.3, size: 12, color: C.dim, align: 'center' });
    const ax = [[1.55, false, 'Lenkachse', true], [4.0, true, 'Antrieb', true], [5.05, true, 'Nachlauf', false]];
    for (let k = 0; k < 3; k++) {
      const [x, twin, lab, must] = ax[k];
      const col = '6E7888', w = twin ? 0.62 : 0.38;
      s.rect(x - 0.04, Y - 1.05, 0.08, 2.1, { fill: col });
      for (const sy of [-1, 1]) s.rrect(x - 0.25, Y + sy * 1.15 - 0.2 - (sy < 0 ? w - 0.4 : 0), 0.5, w, { fill: col, rr: 0.15 });
      if (must) {
        const a = k === 0 ? CLICK : CLICK;
        for (const sy of [-1, 1]) s.rrect(x - 0.25, Y + sy * 1.15 - 0.2 - (sy < 0 ? w - 0.4 : 0), 0.5, w, { fill: C.bl, rr: 0.15, glow: 6, glowColor: C.bl }, sy < 0 ? a : { fx: 'zoom', dur: 300 });
        s.text(lab, { x: x - 0.7, y: 2.2, w: 1.4, h: 0.35, size: 14, bold: true, color: C.bl, align: 'center' }, { fx: 'fade', dur: 200 });
      } else s.text(lab, { x: x - 0.55, y: 5.85, w: 1.3, h: 0.35, size: 13, color: C.dim, align: 'center' });
    }
    s.text('Lkw 6 × 2 von oben · blau = Winterreifen Pflicht', { x: 0.8, y: 6.15, w: 5.4, h: 0.3, size: 11, italic: true, color: C.dim, align: 'center' });
    await point(s, 6.55, 2.05, 6.08, 1.4, 'LuSnowflake', C.bl, 'Kein festes Datum', 'Pflicht bei Glatteis, Schneeglätte, Schneematsch, Eis- oder Reifglätte.', CLICK, { br: true, size: 17 });
    await point(s, 6.55, 3.58, 6.08, 1.4, 'LuMountainSnow', C.gr, 'Nur mit Alpine-Symbol', 'Berg mit Schneeflocke. M+S allein reicht seit 1.10.2024 nicht mehr.', CLICK, { br: true, size: 17 });
    await point(s, 6.55, 5.11, 6.08, 1.4, 'LuCircleAlert', C.red, 'Ohne Winterreifen:', 'Fahrer 60 €, 1 Punkt (mit Behinderung 80 €) – Halter 75 €, 1 Punkt.', CLICK, { br: true, size: 17 });
  }

  // ===== ZWILLINGSREIFEN UND DRUCK =====
  {
    const s = base(deck, 'c4r', { notes:
      '▶ Sagen: „An der Antriebsachse sitzen meist Zwillingsreifen – zwei Reifen nebeneinander. Sie tragen gemeinsam.“\n' +
      '❓ „Was passiert, wenn einer davon Luft verliert?“\n' +
      '✅ Der andere Reifen muss allein tragen – er wird überlastet und kann platzen.\n' +
      '🖱 Klick 1: Stein zwischen den Reifen · Klick 2–4: Regeln.\n' +
      '✅ Druck am kalten Reifen prüfen, Werte aus der Betriebsanleitung bzw. Tabelle (2.7.05-216). Zu wenig Druck: Walken, Überhitzung, Platzen, Reifenbrand (2.7.05-203, -205). Zwillinge: gleiche Größe, Bauart und Druck. Steine dazwischen entfernen – sie beschädigen die Flanken und können als Geschoss nach hinten fliegen.\n' +
      '✅ Prüfungsfrage 2.7.05-222: Die Reifendruck-Kontrolle meldet Druckverlust an einem Zwilling → an der nächsten geeigneten Stelle anhalten und nachsehen.\n' +
      '💡 Auch prüfen: Kotflügel und Schmutzfänger vorhanden und fest (§ 36a StVZO).\n' +
      '➜ „Und was hält das Rad am Lkw? Die Radmuttern.“' });
    kick(s, 'Zwillingsreifen'); title(s, 'Zwei Reifen – ein Team');
    // Rückansicht: Zwilling mit Stein
    card(s, 0.7, 2.05, 5.6, 4.45, {});
    s.rect(1.0, 3.75, 1.55, 0.3, { fill: '6E7888' });
    for (const x of [2.4, 3.95]) {
      s.rrect(x, 2.4, 1.35, 3.6, { fill: '1B1F26', line: '55606F', lw: 2, rr: 0.12 });
      for (let k = 0; k < 9; k++) s.rect(x + 0.15, 2.6 + k * 0.37, 1.05, 0.08, { fill: '2A3342' });
    }
    s.rect(3.75, 3.55, 0.2, 0.7, { fill: '9AA6B5' });
    s.text('Zwillingsreifen von hinten · schematisch', { x: 0.8, y: 6.1, w: 5.4, h: 0.3, size: 11, italic: true, color: C.dim, align: 'center' });
    s.oval(3.68, 5.45, 0.34, 0.3, { fill: 'A08A6A', line: C.red, lw: 2 }, CLICK);
    s.oval(3.35, 5.1, 1.0, 1.0, { line: C.red, lw: 3 }, { fx: 'zoom', dur: 300 });
    s.text('Stein!', { x: 4.4, y: 5.35, w: 1.2, h: 0.4, size: 17, bold: true, color: C.red }, { fx: 'fade', dur: 200 });
    await point(s, 6.55, 2.05, 6.08, 1.4, 'LuGauge', C.or, 'Druck am kalten Reifen prüfen', 'Werte aus Betriebsanleitung oder Tabelle. Zu wenig Druck: Hitze, Platzen, Brand.', CLICK, { br: true, size: 16 });
    await point(s, 6.55, 3.58, 6.08, 1.4, 'LuCopy', C.bl, 'Beide gleich:', 'gleiche Größe, gleiche Bauart, gleicher Druck. Steine dazwischen entfernen.', CLICK, { br: true, size: 16 });
    await point(s, 6.55, 5.11, 6.08, 1.4, 'LuTriangleAlert', C.red, 'Druckverlust gemeldet?', 'An der nächsten geeigneten Stelle anhalten und nachsehen – der Partner wird überlastet.', CLICK, { br: true, size: 16 });
  }

  // ===== RADMUTTERN =====
  {
    const s = base(deck, 'c4r', { notes:
      '▶ Sagen: „Ein Lkw-Rad wiegt mit Reifen rund 100 kg. Löst es sich, wird es zum Geschoss.“\n' +
      '❓ „Nach einem Radwechsel – was müsst ihr noch tun?“\n' +
      '✅ Mit dem Drehmomentschlüssel nach Herstellerwert anziehen und nach kurzer Strecke nachziehen – Empfehlung: nach 50 bis 100 km (Prüfungsfragen 2.7.01-242 und 2.7.05-217; Räderhersteller-Verband EUWA).\n' +
      '🖱 Klick 1: lose Mutter am Anzeiger erkennen · Klick 2–3: Regeln.\n' +
      '💡 Radmutter-Anzeiger: kleine Kunststoffpfeile. Zeigt einer aus der Reihe, hat sich die Mutter gedreht. Das ist eine schnelle Sichtkontrolle – ersetzt aber nicht das Nachziehen.\n' +
      '➜ „Zum Schluss des Kapitels: Schneeketten.“' });
    kick(s, 'Radmuttern'); title(s, 'Hält das Rad?');
    card(s, 0.7, 2.05, 5.6, 4.45, {});
    const CX = 3.5, CY = 4.25;
    s.oval(CX - 2.0, CY - 2.0, 4.0, 4.0, { fill: '1B1F26', line: '3C4656', lw: 3 });
    s.oval(CX - 1.45, CY - 1.45, 2.9, 2.9, { fill: '6E7888' });
    s.oval(CX - 0.55, CY - 0.55, 1.1, 1.1, { fill: '3C4656' });
    for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5 + 0.3; s.oval(CX + 1.22 * Math.cos(a) - 0.13, CY + 1.22 * Math.sin(a) - 0.1, 0.26, 0.2, { fill: '2A3342' }); }
    s.oval(CX - 0.3, CY - 0.3, 0.6, 0.6, { fill: '55606F', line: '7D8898', lw: 1 });
    for (let k = 0; k < 10; k++) {
      const a = k * Math.PI / 5, nx = CX + 0.95 * Math.cos(a), ny = CY + 0.95 * Math.sin(a);
      s.shape(deck.pres.shapes.HEXAGON, { x: nx - 0.16, y: ny - 0.14, w: 0.32, h: 0.28, fill: 'B8C2CF', line: '7D8898', lw: 1 });
      s.oval(nx - 0.06, ny - 0.06, 0.12, 0.12, { fill: '8A96A6' });
      // Anzeiger: zeigt im Uhrzeigersinn zur nächsten Mutter, einer ist verdreht
      const bad = k === 3, rot = (a * 180 / Math.PI) + (bad ? 90 + 55 : 90);
      const px = CX + 0.95 * Math.cos(a + 0.24), py = CY + 0.95 * Math.sin(a + 0.24);
      if (!bad) s.shape(deck.pres.shapes.ISOSCELES_TRIANGLE, { x: px - 0.11, y: py - 0.13, w: 0.22, h: 0.26, fill: C.am, rotate: rot });
      else {
        s.shape(deck.pres.shapes.ISOSCELES_TRIANGLE, { x: px - 0.11, y: py - 0.13, w: 0.22, h: 0.26, fill: C.am, rotate: rot });
        s.oval(nx - 0.4, ny - 0.4, 0.8, 0.8, { line: C.red, lw: 3 }, CLICK);
        s.text('lose?', { x: 0.9, y: 5.7, w: 1.0, h: 0.4, size: 16, bold: true, color: C.red }, { fx: 'fade', dur: 200 });
      }
    }
    s.text('Rad mit Radmutter-Anzeigern · schematisch', { x: 0.8, y: 6.15, w: 5.4, h: 0.3, size: 11, italic: true, color: C.dim, align: 'center' });
    await point(s, 6.55, 2.05, 6.08, 1.4, 'LuWrench', C.or, 'Drehmomentschlüssel', 'Radmuttern nach Wert des Herstellers anziehen – nicht nach Gefühl.', CLICK, { br: true, size: 17 });
    await point(s, 6.55, 3.58, 6.08, 1.4, 'LuRefreshCw', C.bl, 'Nach 50 bis 100 km nachziehen', 'Die Teile setzen sich – sonst kann sich das Rad lösen.', CLICK, { br: true, size: 17 });
    await point(s, 6.55, 5.11, 6.08, 1.4, 'LuEye', C.am, 'Anzeiger-Pfeile', 'Einer zeigt aus der Reihe? Mutter hat sich gedreht – sofort prüfen lassen.', { fx: 'flyL', dur: 450 }, { br: true, size: 17 });
  }

  // ===== SCHNEEKETTEN =====
  {
    const s = await photoAsk(deck, 'c4r', {
      bg: 'g_schnee.jpg', kicker: 'Schneeketten', q: 'Dieses Zeichen steht vor dem Pass. Was gilt?', qsize: 30, w: 5.5, asize: 15,
      answers: [
        ['LuLink', 'Nur mit Schneeketten weiter', 'auf den Rädern der Antriebsachse.'],
        ['LuGauge', 'Höchstens 50 km/h', 'mit Ketten – auch auf guter Strecke.', C.red],
        ['LuWrench', 'Vorher üben, nachspannen', 'nach 50–100 m anhalten und nachspannen. Auf freier Straße abnehmen.', C.bl],
      ],
      notes:
        '▶ Sagen: „Ihr fahrt im Winter in die Alpen. Vor dem Pass steht dieses Zeichen.“\n' +
        '❓ „Was bedeutet es – und wie schnell dürft ihr dann fahren?“\n' +
        '🖱 Klick 1–3: je eine Antwort.\n' +
        '✅ Zeichen 268 „Schneeketten vorgeschrieben“ (StVO Anlage 2 lfd. Nr. 42). Mit Schneeketten höchstens 50 km/h, auch unter günstigsten Umständen (§ 3 Abs. 4 StVO).\n' +
        '✅ Ketten auf die Antriebsachse, bei Zwillingen nach Herstellerangabe. Nach 50–100 m nachspannen. Im Herbst auf dem Hof üben – nicht erst im Schneesturm.\n' +
        '💡 Mit Ketten kann die ASR-Taste nötig sein (siehe C3) – nach Betriebsanleitung.\n' +
        '➜ „Kurzes Quiz zu den Reifen.“',
    });
    await sign(s, '268', 0.7, 2.2, 1.0);
  }

  quiz(deck, 'c4r', {
    kicker: 'Quiz Reifen', q: 'Auf dem Reifen steht 315/80 R 22,5 156/150 L. Was bedeutet das „L“?', size: 32,
    opts: ['Leichtlaufreifen', 'Zulässige Höchstgeschwindigkeit des Reifens: 120 km/h', 'Lastindex für Lenkachsen'], ok: 1,
    why: 'Der letzte Buchstabe ist der Geschwindigkeitsindex. L = 120 km/h (Prüfungsfrage 2.7.05-220). 156/150 ist die Tragfähigkeit einzeln/Zwilling.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Weiter zu Kapitel 3: die Aufbauten.“',
  });
};
