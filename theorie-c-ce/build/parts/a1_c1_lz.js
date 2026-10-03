// C1 Kapitel 2: Lenk- und Ruhezeiten (VO (EG) Nr. 561/2006)
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, steps, chapter, write, svgImg, tachoSym, foot } = require('../gs');
const { icon } = require('../lib');

sec('lz', 'C1  ·  LENK- UND RUHEZEITEN', C.or, 'bg_or.jpg');

// Zeitleiste 0–24 Uhr (Morph-Szene). 1 Stunde = HX Zoll
const X0 = 5.7, XW = 7.0, HX = XW / 24, BY = 3.0, BH = 0.9;
const hx = h => X0 + h * HX;

module.exports = async (deck) => {
  await chapter(deck, 'lz', { num: 2, ttl: 'Lenk- und Ruhezeiten', sub: 'Wie lange ihr fahren dürft – und wie lange ihr Pause machen müsst.', bg: 'f_rast.jpg', notes:
    '▶ Sagen: „Jetzt kommt das wichtigste Thema für jeden Berufsfahrer: Lenk- und Ruhezeiten. Das wird bei jeder Kontrolle geprüft, und es kommt in der Prüfung oft dran.“\n' +
    '🖱 Keine Klicks.\n' +
    '➜ „Erst die Frage: Warum gibt es diese Regeln überhaupt?“' });

  await ask(deck, 'lz', {
    kicker: 'Frage an euch', q: 'Warum schreibt der Staat vor, wie lange ein Lkw-Fahrer fahren darf?', ico: 'LuCircleHelp', qsize: 32,
    answers: [
      ['LuMoon', 'Müdigkeit:', 'Wer zu lange fährt, wird unaufmerksam. Sekundenschlaf bei 80 km/h heißt: mehr als 20 m blind pro Sekunde.'],
      ['LuShieldCheck', 'Sicherheit für alle:', 'Ein müder Fahrer in 40 t gefährdet nicht nur sich, sondern alle um ihn herum.'],
      ['LuScale', 'Fairer Wettbewerb:', 'Kein Unternehmen soll billiger sein, weil seine Fahrer bis zur Erschöpfung fahren.'],
    ],
    notes:
      '▶ Sagen: „Warum gibt es diese Regeln? Was meint ihr?“\n' +
      '❓ Antworten sammeln.\n' +
      '🖱 Klick 1: Müdigkeit · Klick 2: Sicherheit · Klick 3: Wettbewerb.\n' +
      '✅ 80 km/h = 22,2 m pro Sekunde. Eine Sekunde Sekundenschlaf = über 20 m ohne Kontrolle.\n' +
      '✅ Die Ziele stehen in der EU-Verordnung (EG) Nr. 561/2006 selbst: Arbeitsbedingungen verbessern, Straßenverkehrssicherheit, fairer Wettbewerb (Art. 1).\n' +
      '➜ „Für wen gelten die Regeln genau?“',
  });

  // ===== WER MUSS SICH DARAN HALTEN =====
  {
    const s = base(deck, 'lz', { notes:
      '▶ Sagen: „Die Regeln stehen in einer EU-Verordnung, der 561 von 2006. Sie gilt in der ganzen EU, also auch, wenn ihr nach Polen oder Frankreich fahrt.“\n' +
      '🖱 Klick 1: Güterverkehr über 3,5 t · Klick 2: Anhänger zählt mit · Klick 3: wer ausgenommen ist.\n' +
      '✅ Art. 2 VO (EG) 561/2006: Güterbeförderung mit Fahrzeugen, deren zulässige Höchstmasse einschließlich Anhänger 3,5 t übersteigt.\n' +
      '✅ Es kommt auf die zulässige Gesamtmasse an, nicht darauf, wie viel gerade geladen ist. Auch eine Leerfahrt zählt.\n' +
      '✅ Art. 3 Buchst. h und aa: ausgenommen u. a. nichtgewerbliche Güterbeförderung bis 7,5 t und Material/Maschinen des eigenen Handwerks bis 7,5 t im Umkreis von 100 km, wenn Fahren nicht die Haupttätigkeit ist. Werkverkehr (eigene Güter, eigener Betrieb) ist sonst erfasst.\n' +
      '💡 Ausnahmen gibt es z. B. für Fahrschulfahrzeuge bei Ausbildung und Prüfung (§ 18 Abs. 1 Nr. 7 FPersV). Eure Fahrstunden zählen also noch nicht – im Beruf dann schon.\n' +
      '💡 Auch Transporter 2,8–3,5 t: In Deutschland gelten die Lenk- und Ruhezeiten dort ebenfalls (§ 1 FPersV), aufgeschrieben wird von Hand statt mit Fahrtenschreiber. Und seit 1.7.2026 gilt die EU-Verordnung im grenzüberschreitenden Verkehr schon ab 2,5 t.\n' +
      '➜ „Der Fahrtenschreiber unterscheidet vier Tätigkeiten.“' });
    kick(s, 'Wer muss sich daran halten?'); title(s, 'EU-Verordnung 561/2006');
    await point(s, 0.7, 2.1, 11.93, 1.05, 'LuTruck', C.or, 'Güterverkehr über 3,5 t', 'zulässige Gesamtmasse – nicht das, was gerade geladen ist.', CLICK, { size: 20 });
    await point(s, 0.7, 3.35, 11.93, 1.05, 'LuContainer', C.or, 'Anhänger zählt mit', 'Transporter 3,2 t + Anhänger 1 t = über 3,5 t → die Regeln gelten.', CLICK, { size: 20 });
    await point(s, 0.7, 4.6, 11.93, 1.05, 'LuGlobe', C.or, 'Gewerblicher Verkehr und Werkverkehr:', 'gilt in der ganzen EU. Ausgenommen u. a.: private Fahrten bis 7,5 t, Handwerker-Material bis 7,5 t im Umkreis von 100 km.', CLICK, { size: 20 });
    foot(s, 'Quelle: VO (EG) Nr. 561/2006, Art. 2 und 3');
  }
  // ===== VIER TÄTIGKEITEN =====
  {
    const s = base(deck, 'lz', { notes:
      '▶ Sagen: „Euer Tag besteht aus vier Tätigkeiten. Jede hat ein Symbol, das ihr auf dem Fahrtenschreiber wiederfindet.“\n' +
      '❓ Vor jedem Klick fragen: „Was bedeutet dieses Symbol?“\n' +
      '🖱 Klick 1: Lenkzeit · Klick 2: andere Arbeit · Klick 3: Bereitschaft · Klick 4: Ruhe/Pause.\n' +
      '✅ Lenken = Lenkrad. Andere Arbeit = zwei gekreuzte Hämmer (Be- und Entladen, Abfahrtkontrolle, Tanken, Waschen). Bereitschaft = Quadrat mit Diagonale (z. B. Warten an der Rampe, wenn das Ende vorher bekannt ist; Beifahrer im fahrenden Lkw). Ruhe = Bett (Pausen und Ruhezeiten).\n💡 Zweifahrerbetrieb: Der Beifahrer darf seine 45-Minuten-Pause auch im fahrenden Lkw machen, wenn er den Fahrer dabei nicht unterstützt (Art. 7 VO 561/2006). Sonst zählt die Zeit als Bereitschaft.\n' +
      '💡 Wichtig: Andere Arbeit ist keine Pause! Wer an der Rampe hilft, hat keine Pause gemacht.\n' +
      '➜ „Jetzt planen wir zusammen einen Arbeitstag.“' });
    kick(s, 'Vier Tätigkeiten'); title(s, 'Was macht ihr gerade?');
    const T = [['lenken', 'Lenkzeit', 'Ihr fahrt.'], ['arbeit', 'Andere Arbeit', 'Laden, Abfahrtkontrolle, Tanken …'], ['bereit', 'Bereitschaft', 'Warten, Ende bekannt; Beifahrer'], ['ruhe', 'Pause / Ruhe', 'Frei über die eigene Zeit verfügen']];
    for (let i = 0; i < 4; i++) {
      const x = 0.7 + i * 3.04;
      card(s, x, 2.1, 2.84, 3.9, {}, { fx: 'rise', c: true, dur: 450 });
      s.oval(x + 0.62, 2.45, 1.6, 1.6, { fill: C.card2, line: C.or, lw: 2 }, { fx: 'zoom', dur: 250 });
      s.img(await svgImg(tachoSym(T[i][0])), { x: x + 0.87, y: 2.7, w: 1.1, h: 1.1 }, { fx: 'fade', dur: 200 });
      s.text(T[i][1], { x: x + 0.15, y: 4.3, w: 2.54, h: 0.5, size: 22, bold: true, color: C.or, align: 'center' }, { fx: 'fade', dur: 200 });
      s.text(T[i][2], { x: x + 0.2, y: 4.85, w: 2.44, h: 0.95, size: 15, color: C.txt, align: 'center' }, { fx: 'fade', dur: 200 });
    }
    foot(s, 'Symbole wie auf dem Fahrtenschreiber (VO (EU) Nr. 165/2014, Art. 34 Abs. 5)');
  }
  // ===== EIN ARBEITSTAG (MORPH-ZEITLEISTE) =====
  // Blöcke: [Name, Start-h, Dauer-h, Farbe, Beschriftung]; sichtbar ab Schritt
  const B = [
    ['!!drv1', 6, 4.5, C.or, '4,5 h', 1],
    ['!!pau1', 10.5, 0.75, C.gr, '45′', 2],
    ['!!drv2', 11.25, 4.5, C.or, '4,5 h', 3],
    ['!!pau2', 15.75, 0.75, C.gr, '45′', 4],
    ['!!ext', 16.5, 1, 'C97A20', '+1 h', 4],
    ['!!rest', 17.5, 11, C.bl, '11 h Ruhe', 5],
  ];
  await steps(deck, 'lz', {
    kicker: 'Ein Arbeitstag', ttl: 'Lenkzeit und Pausen',
    list: ['Losfahren um 6 Uhr', 'Höchstens 4,5 h am Stück', 'Dann 45 Minuten Pause', 'Weiter: Tageslenkzeit 9 h', '2 × pro Woche: 10 h', 'Tägliche Ruhezeit: 11 h'],
    caps: [
      'Euer Tag beginnt um 6 Uhr. Wir rechnen nur die Lenkzeit – also die Zeit am Steuer.',
      'Nach spätestens 4 Stunden 30 Minuten Lenkzeit ist Schluss. Dann muss eine Fahrtunterbrechung kommen.',
      'Die Fahrtunterbrechung dauert mindestens 45 Minuten. Danach beginnt die Zählung von vorn.',
      'Noch einmal 4,5 h – jetzt sind 9 h Lenkzeit erreicht. Das ist die normale Tageslenkzeit.',
      'Zweimal pro Woche dürft ihr auf 10 h verlängern – nach einer weiteren Pause von 45 Minuten.',
      'Danach braucht ihr eine tägliche Ruhezeit von 11 Stunden am Stück. Erst dann beginnt ein neuer Tag.',
    ],
    notes: [
      '▶ Sagen: „Wir planen jetzt einen Arbeitstag. Ihr fahrt um 6 Uhr morgens los.“\n❓ „Wie lange dürft ihr am Stück fahren?“ – erst raten lassen.\n🖱 Keine Animation auf dieser Folie – nächster Klick = nächster Schritt (Morph).\n➜ „Erster Block.“',
      '▶ „4 Stunden 30 Minuten. Dann muss eine Pause kommen – die Verordnung sagt dazu Fahrtunterbrechung.“\n✅ Art. 7 VO (EG) 561/2006: Nach einer Lenkdauer von 4,5 h ist eine ununterbrochene Fahrtunterbrechung von mindestens 45 Minuten einzulegen.\n➜ „Wie lange muss die Pause sein?“',
      '▶ „45 Minuten. In der Zeit dürft ihr nicht arbeiten – kein Entladen, kein Tanken.“\n💡 Die Pause darf auch länger sein. Und sie darf geteilt werden – das zeige ich gleich.\n➜ „Und dann geht es weiter.“',
      '▶ „Noch einmal 4,5 Stunden, jetzt habt ihr 9 Stunden Lenkzeit. Das ist die tägliche Lenkzeit.“\n✅ Art. 6 Abs. 1: Tageslenkzeit höchstens 9 h.\n💡 Arbeitszeit ist mehr als Lenkzeit: Laden, Kontrollen usw. kommen dazu. Höchstens 10 h Arbeit am Tag (§ 3 ArbZG).\n➜ „Manchmal reicht das nicht …“',
      '▶ „Zweimal in der Woche dürft ihr bis zu 10 Stunden fahren. Vorher kommt aber wieder eine Pause von 45 Minuten – ihr seid ja schon wieder 4,5 Stunden am Stück gefahren.“\n✅ Art. 6 Abs. 1 Satz 2: höchstens zweimal in der Woche auf 10 h verlängern.\n❓ „Wie oft? Und was heißt Woche?“ ✅ Woche = Montag 0 Uhr bis Sonntag 24 Uhr (Art. 4 i).\n➜ „Und dann?“',
      '▶ „Jetzt braucht ihr eure tägliche Ruhezeit: 11 Stunden. Erst danach beginnt ein neuer Arbeitstag.“\n✅ Art. 8 Abs. 2: innerhalb von 24 h nach dem Ende der vorigen Ruhezeit eine neue tägliche Ruhezeit. Regelmäßig mindestens 11 h.\n💡 Kontrollfrage: Um 6 Uhr losgefahren, wann muss die Ruhezeit spätestens beginnen? ✅ Für 11 h Ruhe spätestens um 19 Uhr (dann endet sie um 6 Uhr – wenn die letzte Ruhezeit um 6 Uhr endete). Mit verkürzter Ruhezeit (9 h, höchstens 3 ×) spätestens um 21 Uhr.\n➜ „Jetzt zur Pause: Darf man sie teilen?“',
    ],
    legend: 'Lenkzeit (orange) · Fahrtunterbrechung (grün) · Ruhezeit (blau) – Zeitachse 0–24 Uhr, schematisch',
    scene: async (s, i) => {
      // Achse
      s.rrect(X0, BY, XW, BH, { fill: C.card, line: C.line, rr: 0.05, name: '!!axis' });
      for (let h = 0; h <= 24; h += 3) {
        s.rect(hx(h) - 0.005, BY + BH, 0.01, 0.12, { fill: C.dim, name: '!!tk' + h });
        s.text(String(h).padStart(2, '0'), { x: hx(h) - 0.3, y: BY + BH + 0.14, w: 0.6, h: 0.28, size: 12, color: C.dim, align: 'center', name: '!!tl' + h });
      }
      for (const [nm, st, du, col, lab, from] of B) {
        const on = i >= from;
        let x = hx(st), w = du * HX;
        if (nm === '!!rest' && x + w > X0 + XW) w = X0 + XW - x; // Rest läuft über Mitternacht
        if (!on) w = 0.02;
        s.rect(x, BY + 0.06, w, BH - 0.12, { fill: col, ft: on ? 0 : 100, name: nm });
        const inside = du >= 3, row = nm === '!!ext' ? 0.78 : 0.42;
        if (inside) s.text(on ? lab : '', { x, y: BY + 0.06, w: Math.max(w, 0.02), h: BH - 0.12, size: 15, bold: true, color: C.dark, align: 'center', valign: 'middle', name: nm + 't' });
        else s.text(on ? lab : '', { x: x - 0.3, y: BY - row, w: 0.9, h: 0.32, size: 13, bold: true, color: col === 'C97A20' ? C.or : col, align: 'center', name: nm + 't' });
      }
      if (i === 5) s.text('→ geht bis 04:30 am nächsten Morgen', { x: X0 + XW - 4.3, y: BY + BH + 0.44, w: 4.3, h: 0.3, size: 12, italic: true, color: C.bl, align: 'right', name: '!!over' });
      // Zähler
      const lz = [0, 4.5, 4.5, 9, 10, 10][i];
      s.rrect(X0, 4.85, 3.3, 1.4, { fill: C.card2, line: C.or, rr: 0.08, name: '!!cbox' });
      s.text('LENKZEIT HEUTE', { x: X0 + 0.2, y: 4.95, w: 3, h: 0.3, size: 12, bold: true, color: C.or, cs: 2, name: '!!clab' });
      s.text(String(lz).replace('.', ',') + ' h', { x: X0 + 0.2, y: 5.25, w: 3, h: 0.85, size: 44, bold: true, color: C.txt, valign: 'middle', name: '!!cval' });
      s.rrect(X0 + 3.6, 4.85, 3.4, 1.4, { fill: C.card2, line: C.line, rr: 0.08, name: '!!cbox2' });
      s.text('ERLAUBT', { x: X0 + 3.8, y: 4.95, w: 3, h: 0.3, size: 12, bold: true, color: C.mut, cs: 2, name: '!!clab2' });
      s.text(i >= 4 ? '10 h (2× Woche)' : '9 h', { x: X0 + 3.8, y: 5.25, w: 3.1, h: 0.85, size: i >= 4 ? 28 : 44, bold: true, color: C.mut, valign: 'middle', name: '!!cval2' });
      // Lkw-Symbol fährt die Zeitleiste entlang
      const tx = [6, 10.5, 11.25, 15.75, 17.5, 17.5][i];
      s.img(await icon('LuTruck', C.or), { x: hx(tx) - 0.25, y: 1.5, w: 0.5, h: 0.5, name: '!!trk' });
      s.lineS(hx(tx), 2.03, hx(tx), 2.2, { color: C.or, lw: 2, name: '!!trkl' });   // kurzer Zeiger, kreuzt keine Beschriftung
    },
  });
  // ===== FAHRTUNTERBRECHUNG TEILEN =====
  {
    const s = base(deck, 'lz', { notes:
      '▶ Sagen: „Die 45 Minuten Pause dürft ihr teilen. Aber nur in einer Reihenfolge.“\n' +
      '❓ „Was meint ihr: 30 und dann 15 – geht das?“ Abstimmen lassen, dann klicken.\n' +
      '🖱 Klick 1: richtige Teilung 15 + 30 · Klick 2: falsche Teilung 30 + 15 · Klick 3: Regelzeile 15 + 30.\n' +
      '✅ Art. 7 Unterabs. 2: Die Unterbrechung kann ersetzt werden durch eine Unterbrechung von mindestens 15 Minuten, gefolgt von einer Unterbrechung von mindestens 30 Minuten. Beide innerhalb der 4,5 h.\n' +
      '✅ 30 + 15 zählt nicht als vollständige Unterbrechung: Die 30 Minuten zuerst gelten nur als erster Teil (Mindestteil 15). Danach fehlen noch 30.\n' +
      '💡 Merksatz: „Erst die kleine, dann die große.“\n' +
      '➜ „Testen wir das gleich.“' });
    kick(s, 'Fahrtunterbrechung teilen'); title(s, 'Erst die kleine, dann die große');
    const row = async (y, parts, ok, k) => {
      // parts: [typ, Dauer-h]
      const scale = 1.85; let x = 0.7;
      card(s, 0.6, y - 0.25, 12.1, 1.55, { line: ok ? C.gr : C.red }, CLICK);
      for (const [t, d] of parts) {
        const w = d * scale, col = t === 'L' ? C.or : C.gr;
        s.rect(x + 0.1, y + 0.1, w - 0.04, 0.7, { fill: col }, { fx: 'wipeR', dur: 350 });
        if (t === 'P' || d >= 1) s.text(t === 'L' ? d.toString().replace('.', ',') + ' h fahren' : Math.round(d * 60) + '′', { x: x + 0.1, y: y + 0.1, w: w - 0.04, h: 0.7, size: 15, bold: true, color: C.dark, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 150 });
        x += w;
      }
      s.text(ok ? '✓' : '✗', { x: 11.4, y: y, w: 1.0, h: 0.9, size: 44, bold: true, color: ok ? C.gr : C.red, align: 'center', valign: 'middle' }, { fx: 'stamp' });
      s.text(k, { x: 0.8, y: y + 0.85, w: 10.5, h: 0.4, size: 15, color: C.mut }, { fx: 'fade', dur: 200 });
    };
    await row(2.2, [['L', 2], ['P', 0.25], ['L', 2.5], ['P', 0.5], ['L', 0.3]], true, '15 Min + 30 Min innerhalb der 4,5 h → Unterbrechung erfüllt, die Zählung beginnt neu.');
    await row(4.0, [['L', 2], ['P', 0.5], ['L', 2.5], ['P', 0.25], ['L', 0.3]], false, '30 + 15 → zählt nur als erster Teil. Nach 4,5 h Lenkzeit fehlt noch eine Pause von 30 Minuten.');
    s.text('Teil 1: mindestens 15 Min  ·  Teil 2: mindestens 30 Min  ·  zusammen mindestens 45 Min', { x: 0.7, y: 5.85, w: 11.93, h: 0.7, size: 18, bold: true, color: C.txt, align: 'center', valign: 'middle', fill: C.card2, line: C.or, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1 }, { fx: 'rise', c: true, dur: 400 });
  }
  quiz(deck, 'lz', {
    kicker: 'Frage · Fahrtunterbrechung', q: 'Ihr seid 3 h gefahren und habt 30 Minuten Pause gemacht. Wie lange dürft ihr jetzt noch fahren, bevor eine Pause kommen muss?', size: 26,
    opts: ['Wieder volle 4,5 Stunden', 'Noch 1,5 Stunden – dann 15 Minuten Pause', 'Noch 1,5 Stunden – dann 30 Minuten Pause'], ok: 2,
    why: 'Die 30 Minuten zählen nur als erster Teil. Nach insgesamt 4,5 h Lenkzeit muss noch eine Pause von mindestens 30 Minuten kommen (Art. 7).',
    notes: '▶ Frage vorlesen, abstimmen lassen.\n🖱 Klick 1: Antworten · Klick 2: Lösung mit Begründung.\n✅ C. Der erste Teil (hier 30 Min, mindestens 15) ist erledigt. Der zweite Teil muss mindestens 30 Minuten dauern und spätestens nach insgesamt 4,5 h Lenkzeit kommen. 3 h + 1,5 h = 4,5 h.\n💡 Typischer Fehler: B – „Es fehlen doch nur noch 15 Minuten zu 45.“ Die Reihenfolge ist aber fest: erst mind. 15, dann mind. 30.\n➜ „Jetzt schauen wir über den Tag hinaus: die Woche.“',
  });
};
