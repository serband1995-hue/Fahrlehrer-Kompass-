// Abend 5 · C10: Kapitel 4 Strecke planen, Kapitel 5 Zeit planen, Abschluss C10, Ende Klasse C
const { C, sec, base, chapter, motion, steps, ask, quiz, photoAsk, write, takeaway, veh, sign, svgImg } = require('../gs');
const { icon } = require('../lib');

sec('c10s', 'C10  ·  STRECKE PLANEN', C.pu, 'bg_pu.jpg');
sec('c10z', 'C10  ·  ZEIT PLANEN', C.or, 'bg_or.jpg');
sec('c10e', 'C10  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

const OX = 5.75, OY = 1.5;
const P = (pts) => pts.map(([x, y]) => `${((x - OX) * 100).toFixed(1)} ${((y - OY) * 100).toFixed(1)}`).join(' L');
const rot = (a, b) => Math.round((90 + Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI) * 10) / 10;

module.exports = async (deck) => {
  await chapter(deck, 'c10s', { num: 4, ttl: 'Strecke planen', sub: 'Karte, Lkw-Navi und Schilder – damit der Lkw überall durchpasst.', bg: 'j_luft.jpg', notes:
    '▶ Sagen: „Kapitel 4: die Strecke planen. Ein Lkw kann nicht überall fahren, wo ein Pkw fährt.“\n🖱 Keine Klicks.\n➜ „Was gehört zur Planung?“' });

  // ===== WAS GEHÖRT ZUR PLANUNG? =====
  await photoAsk(deck, 'c10s', {
    bg: 'j_karte_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'Streckenplanung', q: 'Was müsst ihr bei der Planung beachten?', qsize: 30, w: 5.05, asize: 15,
    answers: [
      ['LuRuler', 'Höhe, Breite, Gewicht', 'Brücken, Tunnel, Verbote.', C.pu],
      ['LuClock', 'Lenk- und Ruhezeiten', 'Pausen und Parkplätze einplanen.', C.pu],
      ['LuCalendarX', 'Fahrverbote und Feiertage', 'auch regionale Feiertage und Ausland.', C.pu],
      ['LuConstruction', 'Baustellen, Ferienverkehr', 'und die Reihenfolge der Ladestellen.', C.pu],
    ],
    notes:
      '▶ Sagen: „Ihr plant eine Fahrt. Was müsst ihr beachten?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ Prüfungsfragen 2.6.07-224 (Lenk- und Ruhezeiten, Feiertage der einzelnen Bundesländer, Bestimmungen des anderen Staates), 2.6.07-226 (Ferienreiseverordnung, Lenk- und Ruhezeiten, Baustellen), 2.6.07-204 (Ferienverkehr verschiedener Bundesländer, Baustellen), 2.6.07-217 (Start, Ziel, Reihenfolge der Zwischenstationen, Ladezeiten, Fahrtunterbrechungen), 2.6.07-227 (Stückgut: Reihenfolge der Be- und Entladestellen, Zeitaufwand, Lenk-/Ruhezeiten mit Arbeitszeitgesetz).\n' +
      '💡 Umweltschutz schon bei der Planung: mehrere Ziele in einer Fahrt zusammenlegen (2.5.01-207), Stau und Verkehrsspitzen meiden (2.5.01-105).\n' +
      '➜ „Fangen wir mit der Karte an.“',
  });

  // ===== MASSSTAB (Morph) =====
  {
    const M = [['1 : 200.000', '2 km', '200.000 cm = 2.000 m = 2 km'], ['1 : 300.000', '3 km', '300.000 cm = 3.000 m = 3 km'], ['1 : 500.000', '5 km', '500.000 cm = 5.000 m = 5 km'], ['1 : 200.000', '24 km', '12 cm × 2 km = 24 km']];
    const RX = 6.35, SEG = 0.5, RY = 3.35;
    await steps(deck, 'c10s', {
      kicker: 'Karte', ttl: 'Den Maßstab lesen',
      list: ['1 : 200.000', '1 : 300.000', '1 : 500.000', 'Nachrechnen'],
      ask: { q: 'Maßstab 1 : 200.000 – wie viele Kilometer ist 1 cm auf der Karte?', a: '2 km. Merkregel: fünf Nullen streichen – dann habt ihr Kilometer.', at: 1 },
      caps: [
        'Maßstab 1 : 200.000 heißt: 1 cm auf der Karte sind 200.000 cm in echt.',
        '1 : 300.000: 1 cm sind 3 km. Merkregel: fünf Nullen streichen.',
        '1 : 500.000: 1 cm sind 5 km. Gut für den ersten Überblick über eine lange Strecke.',
        'Ihr messt 12 cm auf einer Karte 1 : 200.000. Wie weit ist das? 12 × 2 km = 24 km.',
      ],
      notes: [
        '▶ Sagen: „Auf jeder Karte steht der Maßstab. 1 zu 200.000 heißt: 1 Zentimeter auf der Karte sind 200.000 Zentimeter in Wirklichkeit.“\n❓ Frage auf der Folie stellen.\n✅ Prüfungsfrage 2.6.07-218: 1 : 200.000 → 1 cm = 2 km.\n➜ „Und bei 1 zu 300.000?“',
        '▶ „200.000 Zentimeter sind 2 Kilometer. Merkregel: fünf Nullen streichen – dann habt ihr Kilometer. 1 zu 300.000: 3 Kilometer.“\n✅ Prüfungsfrage 2.6.07-207: 1 : 300.000 → 1 cm = 3 km.\n➜ „Und für lange Strecken?“',
        '▶ „1 zu 500.000: 1 Zentimeter sind 5 Kilometer. So eine Karte nimmt man für den ersten Überblick, zum Beispiel Hamburg – Rom.“\n✅ Prüfungsfrage 2.6.07-210: Hamburg – Rom, erste Gesamtplanung → 1 : 500.000. Prüfungsfrage 2.6.07-212: Die Legende erklärt die Symbole und hat ein Entfernungslineal.\n➜ „Jetzt rechnen wir.“',
        '▶ „Ihr messt 12 Zentimeter auf einer Karte 1 zu 200.000. Wie weit ist das?“ – kurz rechnen lassen – „12 mal 2 Kilometer: 24 Kilometer.“\n💡 Kurven machen die echte Strecke länger als die gerade Linie.\n➜ „Heute plant man meist mit dem Navi. Aber Vorsicht …“',
      ],
      legend: 'Lineal nicht maßstabsgetreu',
      scene: async (s, i) => {
        const [m, km, calc] = M[i], all = i === 3;
        s.text('Maßstab', { x: 5.75, y: 1.5, w: 7.3, h: 0.35, size: 15, bold: true, color: C.mut, align: 'center', name: '!!ml' });
        s.text(m, { x: 5.75, y: 1.85, w: 7.3, h: 0.9, size: 48, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!m' });
        // Lineal
        s.rrect(RX - 0.15, RY, 12 * SEG + 0.3, 0.75, { fill: 'E8E2CF', line: 'B8B09A', lw: 1, rr: 0.06, name: '!!lin' });
        for (let c = 0; c <= 12; c++) {
          s.rect(RX + c * SEG - 0.01, RY, 0.02, c % 5 === 0 ? 0.32 : 0.22, { fill: '3A3326', name: '!!tk' + c });
          s.text(String(c), { x: RX + c * SEG - 0.2, y: RY + 0.36, w: 0.4, h: 0.3, size: 12, color: '3A3326', align: 'center', name: '!!tn' + c });
        }
        for (let c = 0; c < 12; c++) s.rect(RX + c * SEG + 0.02, RY - 0.22, SEG - 0.04, 0.14, { fill: C.pu, ft: all || c === 0 ? 0 : 100, name: '!!hl' + c });
        s.text('cm', { x: RX + 12 * SEG + 0.2, y: RY + 0.2, w: 0.5, h: 0.3, size: 12, color: C.mut, name: '!!cm' });
        s.text(all ? '12 cm' : '1 cm', { x: all ? RX + 2.0 : RX - 0.4, y: RY - 0.6, w: all ? 2.0 : 1.3, h: 0.35, size: 16, bold: true, color: C.pu, align: 'center', name: '!!seg' });
        s.text('=  ' + km, { x: 5.75, y: 4.35, w: 7.3, h: 0.9, size: 44, bold: true, color: C.pu, align: 'center', valign: 'middle', name: '!!km' });
        s.text(calc, { x: 5.75, y: 5.3, w: 7.3, h: 0.45, size: 18, color: C.mut, align: 'center', name: '!!calc' });
        s.text('Merkregel: fünf Nullen streichen → Kilometer', { x: 5.75, y: 5.85, w: 7.3, h: 0.4, size: 16, bold: true, color: C.am, align: 'center', name: '!!mr' });
      },
    });
  }

  // ===== NAVI UND UNTERFÜHRUNG (fließend) =====
  {
    const A = [[6.1, 5.9], [7.6, 5.9], [8.6, 5.1], [9.4, 4.3], [10.4, 3.3], [11.4, 2.4], [12.6, 2.1]];
    const B = [[9.4, 4.3], [10.4, 4.75], [11.5, 4.7], [12.3, 4.0], [12.6, 3.0], [12.6, 2.1]];
    const W = (13.05 - OX) * 100, H = (6.55 - OY) * 100;
    let base = `<rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="#122019" stroke="#2A3342" stroke-width="2"/>`;
    base += `<path d="M${P([[5.75, 2.55], [7.0, 2.35], [8.3, 1.9], [9.1, 1.5]])}" fill="none" stroke="#1E4A6E" stroke-width="16" stroke-linecap="round"/>`;
    [[9.85, 2.85], [10.75, 2.75], [10.9, 3.55], [9.6, 3.7], [10.0, 4.0], [11.7, 2.9], [6.2, 5.35], [6.7, 5.4], [12.2, 1.75]].forEach(([x, y]) => { base += `<rect x="${((x - OX) * 100).toFixed(0)}" y="${((y - OY) * 100).toFixed(0)}" width="30" height="24" rx="3" fill="#26313F"/>`; });
    base += `<path d="M${P(A)}" fill="none" stroke="#3C4656" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>`;
    base += `<path d="M${P(B)}" fill="none" stroke="#3C4656" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>`;
    // Bahnlinie über die Unterführung
    base += `<path d="M${P([[9.75, 2.65], [11.05, 3.95]])}" fill="none" stroke="#8A95A6" stroke-width="6"/>`;
    for (let k = 0; k <= 10; k++) { const x = 9.75 + k * 0.13, y = 2.65 + k * 0.13; base += `<path d="M${P([[x - 0.07, y + 0.07], [x + 0.07, y - 0.07]])}" stroke="#8A95A6" stroke-width="3"/>`; }
    const mapImg = await svgImg(base, W, H, 2);
    const routeA = await svgImg(`<path d="M${P(A)}" fill="none" stroke="#FFB547" stroke-width="7" stroke-dasharray="16 10" stroke-linejoin="round" stroke-linecap="round"/>`, W, H, 2);
    const routeB = await svgImg(`<path d="M${P(B)}" fill="none" stroke="#38D98A" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`, W, H, 2);
    const T = [[6.3, 5.9, rot(A[0], A[1])], [7.6, 5.9, rot(A[0], A[1])], [8.6, 5.1, rot(A[1], A[2])], [9.05, 4.65, rot(A[2], A[3])], [9.05, 4.65, rot(A[2], A[3])], [10.4, 4.75, rot(B[0], B[1])], [11.5, 4.7, rot(B[1], B[2])], [12.3, 4.0, rot(B[2], B[3])], [12.6, 2.75, rot(B[4], B[5])]];
    const fr = (k, o = {}) => ({ ...o, t: { k, ...(o.t || {}) } });
    await motion(deck, 'c10s', {
      kicker: 'Lkw-Navi', ttl: 'Navi gegen Schild', dur: 520, holdDur: 650,
      question: 'Das Navi schickt euch durch eine Unterführung: 3,8 m. Euer Lkw ist 4,0 m hoch. Was tut ihr?',
      answer: 'Nicht durchfahren – das Schild gilt, nicht das Navi! Anhalten und eine andere Route nehmen. Vorher: Lkw-Daten im Navi eintragen.',
      legend: 'Draufsicht · schematische Karte',
      frames: [
        fr(0, { hold: true, cap: 'Das Navi ist auf „Pkw“ eingestellt und nimmt den kürzesten Weg – durch den Ort und unter der Bahn hindurch.', note: '▶ Sagen: „Euer Navi ist auf Pkw eingestellt oder kennt die Höhe eures Lkw nicht. Es nimmt den kürzesten Weg – durch den Ort, unter der Bahn hindurch.“\n❓ Frage auf der Folie stellen.\n🖱 Klick: Der Lkw fährt los (läuft von selbst bis zum Schild).\n➜ „Fahren wir los.“' }),
        fr(1, { cap: 'Der Lkw folgt dem Navi …' }), fr(2),
        fr(3, { hold: true, t: { big: 1 }, answer: true, cap: 'Vor der Unterführung: Zeichen 265 – tatsächliche Höhe 3,8 m. Der Lkw ist 4,0 m hoch. STOPP!', note: '▶ „Da steht es: Zeichen 265, 3,8 Meter. Euer Lkw ist 4 Meter hoch. Hier passt ihr nicht durch – egal, was das Navi sagt.“\n✅ Zeichen 265 (tatsächliche Höhe), Z. 264 (Breite), Z. 266 (Länge), Z. 262 (tatsächliche Masse), Z. 263 (Achslast) – StVO Anlage 2. Prüfungsfrage 2.6.07-219: Die Informationen des Navis sind Empfehlungen. 2.6.07-223: Anweisungen des Navis „stets befolgen“ ist falsch.\n💡 Höhe mit Ladung und Aufbau messen – angehobene Luftfederung macht den Lkw höher!\n🖱 Klick: Die richtige Route.\n➜ „Was ist die Lösung?“' }),
        fr(4, { hold: true, t: { big: 1, b: 1 }, cap: 'Lkw-Navi mit Fahrzeugprofil (Höhe, Breite, Länge, Gewicht, Achslast) plant die Umfahrung.', note: '▶ „Die Lösung: ein Lkw-Navi mit Fahrzeugprofil. Höhe, Breite, Länge, Gewicht, Achslast eintragen – dann plant es um die Unterführung herum. Und: Das Ziel vor der Abfahrt eingeben – am besten bei abgestelltem Motor oder per Sprache.“\n✅ Prüfungsfrage 2.6.07-223: Karten-Update regelmäßig; Ziel eingeben, wenn das Fahrzeug steht. § 23 Abs. 1a StVO: Navi während der Fahrt nicht in die Hand nehmen; die Ausnahme „stehendes Fahrzeug“ gilt nur bei ganz ausgeschaltetem Motor – Start-Stopp zählt nicht (§ 23 Abs. 1b StVO). BKat Nr. 246.1: 100 € und 1 Punkt.\n🖱 Klick: Der Lkw fährt die Umfahrung (läuft von selbst).\n➜ „Weiter auf der sicheren Route.“' }),
        fr(5, { t: { b: 1 } }), fr(6, { t: { b: 1 } }), fr(7, { t: { b: 1 } }),
        fr(8, { hold: true, t: { b: 1 }, cap: 'Ein kleiner Umweg – aber sicher am Ziel.', note: '▶ „Ein kleiner Umweg – aber sicher angekommen. Eine Brücke abzureißen kostet ein Vielfaches.“\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage zum Navi.“' }),
      ],
      scene: async (s, { k, big = 0, b = 0 }) => {
        s.img(mapImg, { x: OX, y: OY, w: 13.05 - OX, h: 6.55 - OY, name: '!!map' });
        s.img(routeA, { x: OX, y: OY, w: 13.05 - OX, h: 6.55 - OY, transparency: b ? 75 : 0, name: '!!rA' });
        s.img(routeB, { x: OX, y: OY, w: 13.05 - OX, h: 6.55 - OY, transparency: b ? 0 : 100, name: '!!rB' });
        s.text('Start', { x: 5.85, y: 6.1, w: 1.0, h: 0.3, size: 12, bold: true, color: C.mut, name: '!!st' });
        s.img(await icon('LuMapPin', C.red), { x: 12.38, y: 1.62, w: 0.44, h: 0.44, name: '!!ziel' });
        s.text('Ziel', { x: 11.75, y: 1.62, w: 0.6, h: 0.3, size: 12, bold: true, color: C.mut, align: 'right', name: '!!zt' });
        s.text('Bahn', { x: 11.05, y: 3.95, w: 0.8, h: 0.3, size: 12, color: C.mut, name: '!!bahn' });
        await sign(s, '265__3_8__', big ? 6.0 : 9.85, big ? 1.75 : 3.55, big ? 1.25 : 0.38, big ? 1.25 : 0.38, undefined, { name: '!!z265' });
        const [x, y, r] = T[k];
        veh(s, 'truck.png', x, y, r, '!!tr', { scale: 0.33 });
        s.text(b ? 'Lkw-Navi: sichere Route' : big ? '4,0 m > 3,8 m – STOPP!' : 'Pkw-Navi: kürzester Weg', { x: 7.45, y: 1.68, w: 3.6, h: 0.42, size: 15, bold: true, color: C.dark, fill: b ? C.gr : big ? C.red : C.or, shape: s.pres.shapes.ROUNDED_RECTANGLE, rr: 0.3, align: 'center', valign: 'middle', name: '!!stat' });
        s.text('Euer Lkw: 4,0 m hoch', { x: 7.45, y: 6.1, w: 2.6, h: 0.3, size: 12, bold: true, color: C.am, name: '!!h' });
      },
    });
  }

  await quiz(deck, 'c10s', {
    kicker: 'Prüfungsfrage 2.6.07-223', q: 'Was ist bei der Benutzung eines elektronischen Navigationsgeräts zu beachten?', size: 30,
    opts: ['Ein Karten-Update sollte in regelmäßigen Abständen durchgeführt werden', 'Das Ziel sollte eingegeben werden, wenn das Fahrzeug steht', 'Die Anweisungen des Navigationsgeräts sollten stets befolgt werden'], ok: [0, 1],
    why: 'Das Navi gibt nur Empfehlungen. Schilder und eure eigenen Augen gehen vor.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.07-223: A und B.\n➜ „Kapitel 5: Wie lange dauert die Fahrt?“',
  });

  // ===== KAPITEL 5: ZEIT PLANEN =====
  await chapter(deck, 'c10z', { num: 5, ttl: 'Zeit planen', sub: 'Wie lange dauert die Fahrt wirklich – mit Pausen?', ico: 'LuClock', notes:
    '▶ Sagen: „Kapitel 5: die Zeit. Der Kunde fragt: Wann seid ihr da?“\n🖱 Keine Klicks.\n➜ „Rechnen wir eine Tour.“' });
  {
    const T0 = 6, T1 = 17, X0 = 6.2, X1 = 12.85, PH = (X1 - X0) / (T1 - T0), xt = h => X0 + (h - T0) * PH;
    const KX0 = 6.6, KX1 = 12.45, kx = km => KX0 + (KX1 - KX0) * km / 630;
    const fr = (o) => ({ ...o, t: o.t });
    await motion(deck, 'c10z', {
      kicker: 'Tagesplanung', ttl: 'Wann seid ihr da?', dur: 550, holdDur: 700,
      question: 'Hannover – München, rund 630 km Autobahn, Start 6:00 Uhr. Wann seid ihr in München?',
      answer: 'Gegen 15:45 Uhr: 9 Stunden Lenkzeit bei 70 km/h, dazu 45 Minuten Pause. Ohne Stau und ohne Laden!',
      legend: 'Rechnung ohne Stau, Laden und Tanken · Entfernung ist ein Richtwert',
      frames: [
        fr({ t: { km: 0, s: 0 }, hold: true, cap: 'Start um 6:00 Uhr in Hannover. Bis München sind es rund 630 km Autobahn.', note: '▶ Sagen: „Ihr startet um 6 Uhr in Hannover. Bis München sind es rund 630 Kilometer Autobahn. Wann seid ihr da?“\n❓ Frage auf der Folie stellen – schätzen lassen.\n🖱 Klick: die Rechnung.\n➜ „Mit welchem Tempo rechnen wir?“' }),
        fr({ t: { km: 0, s: 1 }, hold: true, cap: 'Ein Lkw über 7,5 t schafft im Schnitt etwa 70 km/h. 630 km ÷ 70 km/h = 9 Stunden reine Lenkzeit.', note: '▶ „Nicht mit 80 rechnen! Auffahrten, Baustellen, Steigungen, Verkehr – im Schnitt schafft ein Lkw über 7,5 Tonnen etwa 70 km/h. 630 durch 70: 9 Stunden reine Lenkzeit.“\n✅ Prüfungsfrage 2.6.07-214: Lkw über 7,5 t, Autobahn Hannover – München → mit 70 km/h Durchschnitt rechnen.\n🖱 Klick: Die Fahrt läuft (von selbst bis zur Pause).\n➜ „Los geht’s.“' }),
        fr({ t: { km: 315, s: 2 }, cap: 'Nach 4,5 Stunden Lenkzeit, um 10:30 Uhr …' }),
        fr({ t: { km: 315, s: 3 }, hold: true, cap: '… 45 Minuten Pause. Das ist Pflicht.', note: '▶ „Nach 4,5 Stunden Lenkzeit: 45 Minuten Pause – Pflicht. Ihr kennt das von Abend 1.“\n✅ Art. 7 VO (EG) Nr. 561/2006: nach höchstens 4,5 h Lenkzeit mindestens 45 min Fahrtunterbrechung (teilbar in 15 + 30 min). Prüfungsfrage 2.6.07-221: Lenk- und Ruhezeiten einplanen, damit die Pausen eingehalten werden können.\n🖱 Klick: Die Fahrt läuft weiter (von selbst bis München).\n➜ „Weiter nach München.“' }),
        fr({ t: { km: 472, s: 4 } }),
        fr({ t: { km: 630, s: 5 }, hold: true, answer: true, cap: 'Ankunft gegen 15:45 Uhr – nach 9 Stunden Lenkzeit. Das ist eine volle Tageslenkzeit!', note: '▶ „Ankunft gegen Viertel vor vier. 9 Stunden Lenkzeit – das ist schon eine volle Tageslenkzeit. Ein Stau, eine Ladezeit – und es wird knapp. Deshalb: Puffer einplanen und den Parkplatz für die Ruhezeit früh suchen.“\n✅ Eigene Rechnung: 630 km ÷ 70 km/h = 9 h; + 45 min Pause → 15:45 Uhr. Tageslenkzeit höchstens 9 h, zweimal pro Woche 10 h (Art. 6 VO 561/2006, siehe Abend 1).\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und an manchen Tagen dürft ihr gar nicht fahren.“' }),
      ],
      scene: async (s, { km, s: st }) => {
        // Strecke
        s.text('Hannover', { x: 5.75, y: 1.55, w: 1.6, h: 0.3, size: 14, bold: true, color: C.mut, name: '!!hh' });
        s.text('München', { x: 11.45, y: 1.55, w: 1.6, h: 0.3, size: 14, bold: true, color: C.mut, align: 'right', name: '!!mm' });
        s.rrect(KX0, 2.05, KX1 - KX0, 0.14, { fill: C.road, rr: 0.5, name: '!!sr' });
        s.rrect(KX0, 2.05, Math.max(0.05, kx(km) - KX0), 0.14, { fill: C.or, ft: km ? 0 : 100, rr: 0.5, name: '!!sf' });
        veh(s, 'truck.png', Math.max(KX0 + 0.4, kx(km) - 0.25), 2.12, 90, '!!tr', { scale: 0.32 });
        s.text(km + ' km', { x: 9.2, y: 2.35, w: 1.4, h: 0.3, size: 13, bold: true, color: C.txt, align: 'center', name: '!!kmt' });
        // Rechnung
        s.text(st >= 1 ? '630 km ÷ 70 km/h = 9 h Lenkzeit' : '', { x: 5.75, y: 2.85, w: 7.3, h: 0.6, size: 26, bold: true, color: C.or, align: 'center', valign: 'middle', name: '!!calc' });
        // Zeitstrahl
        s.rrect(X0, 4.0, X1 - X0, 0.6, { fill: '141D2A', line: C.line, rr: 0.08, name: '!!tl' });
        for (let h = T0; h <= T1; h += 1) {
          s.rect(xt(h) - 0.005, 4.6, 0.01, h % 2 ? 0.08 : 0.14, { fill: C.dim, name: '!!tt' + h });
          s.text(h % 2 ? '' : h + ':00', { x: xt(h) - 0.4, y: 4.75, w: 0.8, h: 0.28, size: 12, color: C.dim, align: 'center', name: '!!tx' + h });
        }
        const blk = (a, b, col, on, nm, lab) => {
          s.rrect(xt(a), 4.05, on ? (xt(b) - xt(a)) : 0.02, 0.5, { fill: col, ft: on ? 0 : 100, rr: 0.1, name: '!!' + nm });
          s.text(on ? lab : '', { x: xt(a), y: 4.05, w: Math.max(0.3, xt(b) - xt(a)), h: 0.5, size: 13, bold: true, color: C.dark, align: 'center', valign: 'middle', name: '!!' + nm + 't' });
        };
        blk(6, st >= 2 ? 10.5 : 6, C.gr, st >= 2, 'b1', '4,5 h lenken');
        blk(10.5, 11.25, C.am, st >= 3, 'p', '');
        blk(11.25, st >= 5 ? 15.75 : st >= 4 ? 13.5 : 11.25, C.gr, st >= 4, 'b2', st >= 5 ? '4,5 h lenken' : '');
        s.text(st >= 3 ? '45 min Pause' : '', { x: xt(10.5) - 0.6, y: 3.6, w: 1.95, h: 0.32, size: 13, bold: true, color: C.am, align: 'center', name: '!!pausel' });
        s.text(st >= 5 ? 'Ankunft ≈ 15:45 Uhr' : '', { x: 5.75, y: 5.25, w: 7.3, h: 0.7, size: 32, bold: true, color: C.gr, align: 'center', valign: 'middle', name: '!!an' });
        s.text(st >= 5 ? 'ohne Stau, Laden und Tanken – volle Tageslenkzeit' : '', { x: 5.75, y: 5.9, w: 7.3, h: 0.4, size: 15, color: C.mut, align: 'center', name: '!!an2' });
      },
    });
  }

  // ===== FAHRVERBOTE =====
  await ask(deck, 'c10z', {
    kicker: 'Fahrverbote', q: 'Wann dürft ihr mit dem Lkw gar nicht fahren?', ico: 'LuCalendarX', qsize: 32,
    answers: [
      ['LuCalendarX', 'Sonn- und Feiertage, 0 bis 22 Uhr', 'Lkw über 7,5 t und Lkw mit Anhänger beim Gütertransport, auch Werkverkehr und Leerfahrten – 120 €.', C.or],
      ['LuSun', 'Samstags im Juli und August', 'Ferienreiseverordnung: 7 bis 20 Uhr auf bestimmten Autobahnen und Bundesstraßen.', C.or],
      ['LuMapPin', 'Regionale Feiertage', 'Fronleichnam, Reformationstag, Allerheiligen gelten nur in einigen Ländern – vorher prüfen.', C.or],
      ['LuGlobe', 'Im Ausland', 'Andere Fahrverbote, Innenstadt-Maut, Umweltzonen und Tempolimits.', C.or],
    ],
    notes:
      '▶ Sagen: „An manchen Tagen steht der Lkw. Wann?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ § 30 Abs. 3 StVO: Sonn- und Feiertagsfahrverbot 0–22 Uhr für Lkw über 7,5 t zulässige Gesamtmasse und Lkw mit Anhänger bei geschäftsmäßiger oder entgeltlicher Beförderung; BKat Nr. 119: 120 € (Details Abend 1). Gilt auch für Werkverkehr und Leerfahrten. § 30 Abs. 4 StVO zählt die Feiertage auf – regional nur Fronleichnam, Reformationstag und Allerheiligen; andere Landesfeiertage (z. B. Heilige Drei Könige, Buß- und Bettag) lösen kein Fahrverbot aus. Ferienreiseverordnung: alle Samstage vom 1.7. bis 31.8., 7–20 Uhr, auf bestimmten Autobahnen und der B 31 und B 96 (Lkw über 7,5 t und Lkw mit Anhänger); BKat Nr. 239: 60 €. Beispiel: Hannover – München über A 3/A 9 ist betroffen. Prüfungsfragen 2.6.07-224 (Feiertage der einzelnen Bundesländer = richtig; Achtung Zwillingsfrage 2.6.07-225: dort ist „Die Fahrverbote aufgrund von Feiertagen der einzelnen Bundesländer“ als falsch markiert – beide üben), Bestimmungen des anderen Staates, 2.6.07-226 (Ferienreiseverordnung), 2.6.07-101 (Ausland: City-Maut, Umweltzonen, Tempolimits).\n' +
      '➜ „Eine Prüfungsfrage zur Zeitplanung.“',
  });
  await quiz(deck, 'c10z', {
    kicker: 'Prüfungsfrage 2.6.07-214', q: 'Lkw über 7,5 t, Autobahn Hannover – München. Mit welcher Durchschnittsgeschwindigkeit können Sie rechnen?', size: 28,
    opts: ['70 km/h', '80 km/h', '40 km/h'], ok: [0],
    why: '80 km/h ist die Höchstgeschwindigkeit – im Schnitt schafft ihr mit Verkehr und Steigungen etwa 70 km/h.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.07-214: A (70 km/h).\n➜ „Das war C10. Zum Mitschreiben.“',
  });

  // ===== ABSCHLUSS C10 =====
  write(deck, 'c10e', {
    ttl: 'Wirtschaftlich fahren, Strecke planen', labelW: 3.3, size: 17,
    rows: [
      ['Vorausschauend', 'früh vom Gas, im Gang rollen (kein Diesel), unnötiges Anhalten vermeiden'],
      ['Drehzahl', 'früh hochschalten, im grünen Bereich fahren'],
      ['Motor aus', 'unnötig laufen lassen ist verboten (§ 30 StVO, 80 €)'],
      ['CO₂', '1 Liter Diesel ≈ 2,65 kg CO₂'],
      ['Maut', 'Lkw über 3,5 t · emissionsfreie Lkw mautfrei bis 30.06.2031'],
      ['Maßstab', '1 : 200.000 → 1 cm = 2 km (fünf Nullen streichen)'],
      ['Zeit planen', 'Schnitt 70 km/h · nach 4,5 h Lenkzeit 45 min Pause'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das kommt in der Prüfung.“\n🖱 Klick 1–7: je eine Lösung.\n💡 Erst das Stichwort vorlesen und fragen: „Wer weiß es?“ – dann klicken.\n✅ Quellen: Prüfungsfragen 2.5.01-213, 2.5.01-015, 2.6.07-218, 2.6.07-214; § 30 Abs. 1 StVO + BKat Nr. 117; § 1 Abs. 2 Nr. 7 BFStrMG; Art. 7 VO (EG) 561/2006; CO₂: eigene Rechnung nach UBA.\n➜ „Drei Prüfungsfragen.“',
  });
  quiz(deck, 'c10e', {
    kicker: 'Prüfungsfrage 2.6.07-218', q: 'Straßenkarte im Maßstab 1:200.000. 1 cm auf der Karte entspricht wie vielen Kilometern in der Realität?', size: 28,
    opts: ['2 km', '10 km', '20 km'], ok: [0],
    why: 'Fünf Nullen streichen: 200.000 cm = 2 km.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.07-218: A.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c10e', {
    kicker: 'Prüfungsfrage 2.5.01-015', q: 'Was kann den Kraftstoffverbrauch eines Nutzfahrzeugs verringern?', size: 32,
    opts: ['Die Verwendung von Luftleiteinrichtungen am Fahrzeug', 'Die vorausschauende Fahrweise des Fahrers', 'Die Verwendung spezieller Reifen'], ok: [0, 1, 2],
    why: 'Alle drei! Spoiler, vorausschauend fahren und rollwiderstandsarme Reifen sparen Diesel.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.5.01-015: alle drei richtig.\n➜ „Letzte Frage.“',
  });
  quiz(deck, 'c10e', {
    kicker: 'Prüfungsfrage 2.6.07-221', q: 'Warum sind bei der Streckenplanung die Lenk- und Ruhezeiten zu berücksichtigen? Weil dadurch …', size: 28,
    opts: ['… sichergestellt wird, dass der Fahrer die vorgeschriebenen Pausen einhalten kann', '… Beeinträchtigungen der Fahrweise vermieden werden sollen', '… die Fahrtstrecke kürzer wird'], ok: [0, 1],
    why: 'Pausen planen heißt: ausgeruht fahren. Kürzer wird die Strecke dadurch nicht.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.07-221: A und B.\n➜ „Das nehmt ihr aus C10 mit.“',
  });
  await takeaway(deck, 'c10e', {
    items: [
      ['LuLeaf', 'Vorausschauend fahren:', 'früh vom Gas, im Gang rollen – Anfahren aus dem Stand kostet am meisten.'],
      ['LuGauge', 'Grüner Bereich:', 'früh hochschalten. Und beim Warten: Motor aus.'],
      ['LuWrench', 'Fahrzeug pflegen:', 'Reifendruck, Spoiler, Luftfilter – das spart jeden Tag Diesel.'],
      ['LuRoute', 'Strecke planen:', 'Lkw-Navi mit Fahrzeugprofil – aber die Schilder gelten.'],
      ['LuClock', 'Zeit planen:', 'mit 70 km/h rechnen, Pausen und Fahrverbote einplanen.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C10, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Damit habt ihr die ganze Theorie für Klasse C!“',
  });

  // ===== ENDE =====
  {
    const s = base(deck, 'c10e', { bg: 'j_luft.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 5 – und damit die ganze Zusatz-Theorie für Klasse C. Glückwunsch! Wer CE macht: Beim nächsten Mal geht es um Züge – CE1, wie man Lkw und Anhänger zusammenstellt und kuppelt, und CE2, die Bremsen am Lastzug. Danke fürs Mitmachen, kommt gut nach Hause.“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen. Prüfungsvorbereitung ansprechen (Fragenkatalog üben).\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.5, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Klasse C geschafft!', { x: 0.7, y: 2.3, w: 6.6, h: 1.3, size: 50, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900 });
    s.text('Abend 5: C9 + C10 – alle zehn Lektionen fertig', { x: 0.7, y: 3.6, w: 6.5, h: 0.6, size: 20, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Weiter mit Klasse CE:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'CE1  Zusammenstellung von Zügen', options: { color: C.txt, breakLine: true } }, { text: 'CE2  Lastzugbremsen', options: { color: C.txt } }], { x: 0.7, y: 4.6, w: 6.3, h: 1.4, size: 20 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
