// Abend 5 · C9: Kapitel 5 Abfahrtkontrolle (Rundgang), einfache Störungen
const { warnSym } = require('../sym');
const { C, sec, base, kick, title, point, CLICK, chapter, motion, steps, veh, ask, quiz, write, takeaway, svgImg } = require('../gs');
const { icon } = require('../lib');

sec('c9a', 'C9  ·  ABFAHRTKONTROLLE', C.gr, 'bg_gr.jpg');
sec('c9e', 'C9  ·  ABSCHLUSS', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'c9a', { num: 5, ttl: 'Abfahrtkontrolle', sub: 'Fünf Minuten Rundgang vor der Fahrt – damit unterwegs nichts passiert.', ico: 'LuClipboardCheck', notes:
    '▶ Sagen: „Kapitel 5: die Abfahrtkontrolle. In der Prüfung zeigt ihr sie dem Prüfer. Und im Beruf macht ihr sie vor jeder Schicht.“\n🖱 Keine Klicks.\n➜ „Gehen wir einmal um den Lkw.“' });

  // ===== RUNDGANG (fließend) =====
  {
    const CX = 9.4, CY = 3.35, SC = 1.8;
    const path = await svgImg('<rect x="4" y="4" width="660" height="300" rx="80" fill="none" stroke="#4A5668" stroke-width="5" stroke-dasharray="16 14"/>', 668, 308, 1);
    const ST = [
      { x: 11.45, y: 3.35, ico: 'LuArmchair', lab: 'Im Fahrerhaus' },
      { x: 11.4, y: 1.85, ico: 'LuScanEye', lab: 'Links vorn' },
      { x: 12.7, y: 3.35, ico: 'LuLightbulb', lab: 'Front' },
      { x: 11.4, y: 4.85, ico: 'LuCircleDot', lab: 'Rechts vorn' },
      { x: 8.6, y: 4.85, ico: 'LuCircleDot', lab: 'Rechte Seite' },
      { x: 6.1, y: 3.35, ico: 'LuPackage', lab: 'Heck' },
      { x: 8.6, y: 1.85, ico: 'LuFuel', lab: 'Linke Seite' },
      { x: 11.45, y: 3.35, ico: 'LuGauge', lab: 'Zurück ins Fahrerhaus' },
    ];
    const CORN = { 1.5: [12.47, 2.08], 2.5: [12.47, 4.62], 4.5: [6.33, 4.62], 5.5: [6.33, 2.08] };
    // Checkliste unten: Stichwort leuchtet, sobald die Station erreicht ist
    const CHK = [['Papiere', 'LuFileText', 0], ['Anzeigen', 'LuGauge', 0], ['Spiegel', 'LuScanEye', 1], ['Reifen', 'LuCircleDot', 1], ['Licht', 'LuLightbulb', 2], ['Ladung', 'LuPackage', 5], ['Tank & Luft', 'LuFuel', 6], ['Bremse', 'LuDisc', 7]];
    const fr = (p, o = {}) => ({ ...o, t: { p } });
    const N = (t) => '▶ Sagen: „' + t;
    await motion(deck, 'c9a', {
      kicker: 'Abfahrtkontrolle', ttl: 'Der Rundgang', dur: 520, holdDur: 650,
      question: 'Was prüft ihr beim Rundgang – und was tut ihr, wenn ihr einen Mangel findet?',
      answer: 'Vor jeder Schicht: Reifen, Licht, Spiegel, Ladung, Bremse. Mängel melden – ist der Lkw nicht sicher: nicht losfahren.',
      legend: 'Draufsicht · Reihenfolge ist ein Vorschlag – wichtig ist, dass nichts fehlt',
      frames: [
        fr(0, { hold: true, cap: 'Im Fahrerhaus: Papiere und Fahrerkarte, Motor an, Druck aufbauen, Kontrollleuchten prüfen.', note: N('Wir starten im Fahrerhaus: Papiere da? Fahrerkarte gesteckt? Motor starten, damit sich Druck aufbaut. Alle Kontrollleuchten gehen kurz an – und dann aus.“\n❓ Frage auf der Folie stellen.\n✅ § 23 Abs. 1 StVO: Der Fahrer ist verantwortlich, dass Fahrzeug, Zug und Ladung vorschriftsmäßig sind. DGUV Vorschrift 70 § 36 Abs. 1: vor Beginn jeder Arbeitsschicht die Wirksamkeit der Betätigungs- und Sicherheitseinrichtungen prüfen. Ausführliche Checkliste: DGUV Grundsatz 314-002 „Kontrolle von Fahrzeugen durch Fahrpersonal“.\n💡 Kontrolle auch nach dem Laden, nach dem Kuppeln und nach längeren Pausen (Prüfungsfrage 2.2.23-216: auch prüfen, ob Kinder unter dem Fahrzeug sind).\n🖱 Klick: Der Rundgang beginnt (läuft bis zur nächsten Station).\n➜ „Raus und links vorn anfangen.“') }),
        fr(1, { hold: true, cap: 'Links vorn: Spiegel sauber und richtig eingestellt, Scheiben frei, Vorderrad: Reifen, Profil, Radmuttern.', note: N('Links vorn: Spiegel sauber und richtig eingestellt? Scheiben frei? Vorderreifen – Profil, Schäden, Luftdruck. Radmuttern – sitzen alle?“\n💡 Viele Lkw haben Radmutter-Anzeiger: Stehen alle Pfeile in einer Linie, hat sich keine Mutter gelöst.\n🖱 Klick: weiter zur Front.\n➜ „Nach vorn.“') }),
        fr(1.5), fr(2, { hold: true, cap: 'Front: Scheinwerfer, Blinker, Kennzeichen, Wischer. Unter dem Lkw: Öl, Kühlmittel oder Diesel auf dem Boden?', note: N('Vorn: Scheinwerfer, Blinker, Kennzeichen, Scheibenwischer. Und ein Blick unter den Lkw – Pfützen von Öl, Kühlmittel oder Diesel?“\n🖱 Klick: weiter nach rechts vorn.\n➜ „Rechte Seite.“') }),
        fr(2.5), fr(3, { hold: true, cap: 'Rechts vorn: Vorderrad, Spiegel rechts – auch Rampen- und Weitwinkelspiegel –, Trittstufen.', note: N('Rechts vorn: Vorderrad, und die rechten Spiegel – Haupt-, Weitwinkel- und Rampenspiegel. Die sind beim Rechtsabbiegen lebenswichtig.“\n🖱 Klick: weiter an der rechten Seite.\n➜ „Weiter nach hinten.“') }),
        fr(4, { hold: true, cap: 'Rechte Seite: Zwillingsreifen (auch zwischen den Reifen!), seitliche Leuchten, Unterfahrschutz, Aufbau.', note: N('Rechte Seite: Zwillingsreifen – schaut auch zwischen die beiden Reifen, da klemmen gern Steine. Seitenmarkierungsleuchten, seitlicher Unterfahrschutz, Aufbau ohne Schäden.“\n🖱 Klick: weiter zum Heck.\n➜ „Zum Heck.“') }),
        fr(4.5), fr(5, { hold: true, cap: 'Heck: Rück-, Brems- und Blinkleuchten, Kennzeichen, Türen oder Plane zu, Ladung gesichert, Unterfahrschutz.', note: N('Heck: Leuchten, Kennzeichen, Unterfahrschutz. Türen zu oder Plane fest – und die Ladung: gesichert, nichts verrutscht?“\n💡 Leuchten prüft man zu zweit oder mit Spiegelung in einer Scheibe – oder mit der Kontrollfunktion im Lkw, falls vorhanden.\n🖱 Klick: weiter zur linken Seite.\n➜ „Linke Seite.“') }),
        fr(5.5), fr(6, { hold: true, cap: 'Linke Seite: Reifen, Tank- und AdBlue-Deckel zu, Batteriekasten, Luftbehälter – bei Bedarf entwässern.', note: N('Linke Seite: Reifen, Tankdeckel und AdBlue-Deckel zu, Batteriekasten verschlossen, Luftbehälter – mit Lufttrockner nur zur Kontrolle entwässern.“\n✅ Siehe Abend 3 (C5): Wasser im Luftbehälter heißt Lufttrockner defekt.\n🖱 Klick: zurück ins Fahrerhaus.\n➜ „Zurück ins Fahrerhaus.“') }),
        fr(7, { hold: true, answer: true, cap: 'Im Fahrerhaus: Druckwarnung aus, Lenkung, Hupe, Bremsprobe gleich nach dem Losfahren. Mängel melden!', note: N('Zurück im Fahrerhaus: Ist der Druck da und die Warnung aus? Lenkung leichtgängig? Hupe? Und gleich nach dem Losfahren eine Bremsprobe.“\n✅ Prüfungsfrage 2.7.02-017: Gleich nach dem Losfahren eine Bremsprobe machen, um die Wirkung der Betriebsbremse zu prüfen. DGUV Vorschrift 70 § 36: festgestellte Mängel dem Aufsichtführenden melden; bei Mängeln, die die Betriebssicherheit gefährden, den Betrieb einstellen.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Und wenn unterwegs etwas nicht stimmt?“') }),
      ],
      scene: async (s, { p }) => {
        s.img(path, { x: 6.06, y: 1.81, w: 6.68, h: 3.08, name: '!!pfad' });
        veh(s, 'truck.png', CX, CY, 90, '!!tr', { scale: SC });
        s.text('Fahrtrichtung →', { x: 8.2, y: 4.12, w: 2.4, h: 0.3, size: 12, color: C.dim, align: 'center', name: '!!fr' });
        // erledigte Stationen
        for (let q = 1; q <= 6; q++) {
          const st = ST[q], done = p > q;
          s.oval(st.x - 0.17, st.y - 0.17, 0.34, 0.34, { fill: done ? C.gr : '2A3342', line: done ? C.gr : '4A5668', lw: 1.5, name: '!!sta' + q });
          s.text(done ? '✓' : String(q), { x: st.x - 0.17, y: st.y - 0.17, w: 0.34, h: 0.34, size: 12, bold: true, color: done ? C.dark : C.mut, align: 'center', valign: 'middle', name: '!!stt' + q });
        }
        // Prüfer-Marker
        let mx, my, lab, ico;
        if (Number.isInteger(p)) ({ x: mx, y: my, lab, ico } = ST[p]); else { [mx, my] = CORN[p]; lab = ''; ico = ST[Math.ceil(p)].ico; }
        s.oval(mx - 0.36, my - 0.36, 0.72, 0.72, { fill: C.gr, line: C.white, lw: 2, glow: 12, glowColor: C.gr, name: '!!mk' });
        s.img(await icon(ico, C.dark), { x: mx - 0.21, y: my - 0.21, w: 0.42, h: 0.42, name: '!!mki' });
        s.text(lab, { x: 7.5, y: 0.95, w: 5.5, h: 0.5, size: 22, bold: true, color: C.gr, align: 'right', name: '!!lab' });
        // Checkliste
        for (let c = 0; c < CHK.length; c++) {
          const [w, ic, at] = CHK[c], x = 5.75 + (c % 4) * 1.82, y = 5.38 + Math.floor(c / 4) * 0.62;
          const on = p >= at, cur = Math.floor(p) === at && Number.isInteger(p), done = on && !cur;
          s.rrect(x, y, 1.72, 0.5, { fill: done ? '12301F' : cur ? '173A2A' : '121A26', line: on ? C.gr : '2A3342', lw: cur ? 2 : 1, rr: 0.5, name: '!!ck' + c });
          s.img(await icon(done ? 'LuCheck' : ic, on ? C.gr : '4A5668'), { x: x + 0.14, y: y + 0.11, w: 0.28, h: 0.28, name: '!!cki' + c });
          s.text(w, { x: x + 0.46, y, w: 1.22, h: 0.5, size: 13, bold: on, color: on ? C.txt : C.dim, valign: 'middle', name: '!!ckt' + c });
        }
      },
    });
  }
  // ===== WARNLEUCHTEN: ROT – GELB – GRÜN (Morph) =====
  {
    const G = [
      { col: C.red, lab: 'ROT', sub: 'So bald wie möglich sicher anhalten!', ic: ['brems', 'kuehl', 'oel', 'batt'], tx: ['Druckluft', 'Kühlwasser', 'Öldruck', 'Ladestrom'] },
      { col: C.am, lab: 'GELB', sub: 'Weiterfahrt meist möglich – bald in die Werkstatt', ic: ['motor', 'abs', 'adblue', 'hinweis'], tx: ['Motorstörung', 'ABS-Störung', 'AdBlue niedrig', 'Hinweis'] },
      { col: C.gr, lab: 'GRÜN / BLAU', sub: 'Nur Info: Eine Funktion ist eingeschaltet', ic: ['abblend', 'blink', 'fern', 'nebel'], tx: ['Abblendlicht', 'Blinker', 'Fernlicht (blau)', 'Nebelscheinwerfer'] },
    ];
    await steps(deck, 'c9a', {
      kicker: 'Einfache Störungen', ttl: 'Warnleuchten lesen',
      list: ['Rot', 'Gelb', 'Grün und Blau'],
      ask: { q: 'Während der Fahrt leuchtet eine rote Warnleuchte. Was tut ihr?', a: 'So bald wie möglich sicher anhalten und nachsehen – Betriebsanleitung! Nicht einfach weiterfahren.', at: 1 },
      caps: [
        'Rot heißt Gefahr: Druckluft, Kühlwasser, Öldruck, Ladestrom. So bald wie möglich sicher anhalten.',
        'Gelb heißt Störung: Weiterfahren geht meist, aber bald in die Werkstatt. Beispiele: Motorstörung, ABS, AdBlue.',
        'Grün und Blau sind nur Info: Licht, Blinker, Fernlicht oder Nebelscheinwerfer sind eingeschaltet.',
      ],
      notes: [
        '▶ Sagen: „Im Cockpit leuchten viele Lampen. Die Farbe sagt euch, wie ernst es ist. Rot heißt: Gefahr. Zum Beispiel Druckluft zu niedrig, Kühlwasser zu heiß, kein Öldruck.“\n❓ Frage auf der Folie stellen.\n✅ Farben nach ISO 2575 (Rot = Gefahr, Gelb/Bernstein = Warnung, Grün = Funktion an, Blau = Fernlicht). Prüfungsfragen 2.7.02-203 (Druckwarneinrichtung spricht an: Vorratsdruck reicht nicht mehr, Bremsanlage wahrscheinlich defekt), 2.7.02-216 (rote Temperaturwarnung: schnellstmöglich an geeigneter Stelle anhalten, Herstellervorgaben), 2.7.02-034 (Öldruckleuchte erlischt nicht: Motor umgehend abstellen, Ölstand prüfen).\n➜ „Und gelb?“',
        '▶ „Die Antwort: so bald wie möglich sicher anhalten und nachsehen. Gelb ist eine Störung: Weiterfahren geht meist, aber ab in die Werkstatt.“\n✅ Die genaue Bedeutung jeder Leuchte steht in der Betriebsanleitung des Lkw.\n➜ „Und grün oder blau?“',
        '▶ „Grün und Blau sind nur Info: Licht ist an, Blinker ist an, Fernlicht ist an.“\n💡 Blinkt die Blinker-Kontrollleuchte doppelt so schnell: Ein Leuchtmittel ist defekt (Prüfungsfrage 2.7.02-134).\n➜ „Und was tut ihr bei diesen Störungen?“',
      ],
      legend: 'Farben der Kontrollleuchten nach ISO 2575 · Beispiele, je nach Lkw verschieden',
      scene: async (s, i) => {
        s.rrect(5.75, 1.55, 7.3, 4.9, { fill: '0B1119', line: '2A3342', lw: 1.5, rr: 0.08, name: '!!cockpit' });
        for (let g = 0; g < 3; g++) {
          const on = g === i, y = 1.8 + g * 1.55, c = G[g].col;
          s.text([{ text: G[g].lab + '  ', options: { bold: true, color: on ? c : C.dim } }, { text: G[g].sub, options: { color: on ? C.txt : C.dim } }], { x: 6.0, y, w: 6.9, h: 0.4, size: 15, valign: 'middle', name: '!!gl' + g });
          for (let q = 0; q < 4; q++) {
            const x = 6.0 + q * 1.72;
            const cc = g === 2 && q === 2 ? '3B82F6' : c;
            // Leuchte wie im Cockpit: genormtes Symbol leuchtet in seiner Farbe auf dunklem Grund
            s.rrect(x + 0.33, y + 0.42, 0.76, 0.68, { fill: '05080D', line: on ? cc : '2A3342', lw: 1, rr: 0.12, name: '!!lo' + g + q });
            s.img(await svgImg(warnSym(G[g].ic[q], '#' + (on ? cc : '3A4656')), 512, 512, 0.6), { x: x + 0.43, y: y + 0.48, w: 0.56, h: 0.56, name: '!!li' + g + q, glowColor: cc });
            s.text(G[g].tx[q], { x: x - 0.1, y: y + 1.08, w: 1.62, h: 0.28, size: 12, color: on ? C.txt : C.dim, align: 'center', name: '!!lt' + g + q });
          }
        }
      },
    });
  }

  // ===== STÖRUNGEN UNTERWEGS =====
  await ask(deck, 'c9a', {
    kicker: 'Einfache Störungen', q: 'Was tut ihr, wenn …', ico: 'LuWrench', qsize: 34,
    answers: [
      ['LuGauge', '… die Druckwarnung kommt?', 'Der Vorrat reicht nicht mehr – sicher anhalten. Bremsanlage wahrscheinlich defekt: nicht weiterfahren.', C.red, 17],
      ['LuThermometer', '… die Temperatur rot wird?', 'Schnellstmöglich an geeigneter Stelle anhalten und nach Betriebsanleitung handeln.', C.red, 17],
      ['LuDroplet', '… die Öldruckleuchte nach dem Start nicht ausgeht?', 'Motor sofort abstellen, Ölstand prüfen.', C.red, 17],
      ['LuMoveHorizontal', '… der Lkw beim Bremsen zur Seite zieht?', 'Ab in die Fachwerkstatt – nicht mit Gegenlenken weiterfahren.', C.am, 17],
      ['LuTimer', '… der Druck nach dem Start viel länger zum Füllen braucht?', 'Undichtigkeit oder Luftpresser schwach – prüfen lassen.', C.am, 17],
    ],
    notes:
      '▶ Sagen: „Fünf Störungen, die euch passieren können. Was tut ihr?“\n' +
      '❓ Jede Situation vorlesen, Antworten sammeln, dann klicken.\n' +
      '🖱 Klick 1–5: je eine Störung.\n' +
      '✅ Prüfungsfragen 2.7.02-203 (Druckwarneinrichtung), 2.7.02-216 (rote Temperaturwarnung), 2.7.02-034 (Öldruckkontrollleuchte erlischt nicht: Motor umgehend abstellen, Ölstand kontrollieren), 2.7.02-030 (zieht beim Bremsen: Fachwerkstatt), 2.7.02-202 (Fülldauer zu lang: Luftbehälter/Anschlüsse undicht oder Förderleistung des Luftpressers zu gering).\n' +
      '➜ „Das war C9. Jetzt zum Mitschreiben.“',
  });

  // ===== ABSCHLUSS C9 =====
  write(deck, 'c9e', {
    ttl: 'Ladungssicherung und Abfahrtkontrolle', labelW: 3.7, size: 17,
    rows: [
      ['Kräfte auf die Ladung', 'vorn bis 80 % · zur Seite 50 % · nach hinten 50 % des Gewichts'],
      ['Formschluss', 'lückenlos an Stirn- und Seitenwände, Lücken mit Füllmitteln schließen'],
      ['Niederzurren', 'Gurt presst die Ladung auf die Ladefläche → mehr Reibung'],
      ['Zurrgurt-Etikett', 'LC = Zurrkraft · STF = Vorspannkraft · ohne Etikett: nicht benutzen'],
      ['Stirnwand (Code L)', 'hält nur 40 % der Nutzlast, höchstens 5 t'],
      ['Lastverteilungsplan', 'Ladung nur im erlaubten Bereich – Achslasten beachten'],
      ['Abfahrtkontrolle', 'vor jeder Schicht und nach Laden oder Kuppeln · Mängel melden · Bremsprobe'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das kommt in der Prüfung.“\n🖱 Klick 1–7: je eine Lösung.\n💡 Erst das Stichwort vorlesen und fragen: „Wer weiß es?“ – dann klicken.\n✅ Quellen: DIN EN 12195-1 (Beschleunigungsbeiwerte), Prüfungsfrage 2.2.22-210 (Formschluss), DIN EN 12195-2 (Etikett), DIN EN 12642 (Aufbau Code L), Prüfungsfragen 2.2.22-217/219 (Lastverteilungsplan), 2.7.02-017 (Bremsprobe), § 23 Abs. 1 StVO.\n➜ „Drei Prüfungsfragen.“',
  });
  quiz(deck, 'c9e', {
    kicker: 'Prüfungsfrage 2.2.22-210', q: 'Was ist unter formschlüssiger Sicherung der Ladung zu verstehen?', size: 30,
    opts: ['Das Ladegut liegt direkt an der Stirn- und Bordwand an', 'Freiräume zwischen den Ladungsteilen sind durch geeignete Füllmittel geschlossen', 'Die frei stehende Ladung ist durch Zurrmittel auf der Ladefläche niedergespannt'], ok: [0, 1],
    why: 'C ist Niederzurren – das ist Kraftschluss, nicht Formschluss.',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.22-210: A und B.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c9e', {
    kicker: 'Prüfungsfrage 2.2.22-221', q: 'Wer ist für die Ladungssicherung am Fahrzeug verantwortlich?', size: 32,
    opts: ['Der Fahrer', 'Der Verlader', 'Der Empfänger'], ok: [0, 1],
    why: 'Fahrer und Verlader – dazu auch der Halter. Der Fahrer muss vor der Abfahrt immer selbst prüfen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.22-221: A und B. § 23 StVO (Fahrer), § 412 HGB (Absender/Verlader), § 31 StVZO (Halter).\n➜ „Letzte Frage.“',
  });
  quiz(deck, 'c9e', {
    kicker: 'Prüfungsfrage 2.7.02-203', q: 'Die Druckwarneinrichtung der Bremsanlage spricht während der Fahrt an. Was bedeutet dies?', size: 30,
    opts: ['Der Vorratsdruck ist nicht mehr ausreichend', 'Die Bremsanlage ist wahrscheinlich defekt', 'Ein Bremszylinder ist undicht'], ok: [0, 1],
    why: 'Der Druck reicht nicht – die Ursache ist noch unklar. Sicher anhalten, nicht weiterfahren.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.02-203: A und B.\n➜ „Das nehmt ihr aus C9 mit.“',
  });
  await takeaway(deck, 'c9e', {
    items: [
      ['LuArrowBigRight', 'Die Ladung will weiter:', 'beim Bremsen mit bis zu 80 % ihres Gewichts nach vorn.'],
      ['LuLink', 'Formschluss und Zurren:', 'lückenlos an die Wände und niederzurren – Reibung allein reicht nie.'],
      ['LuTag', 'Gurt prüfen:', 'Etikett lesbar, keine Schnitte, Ratsche heil – sonst aussortieren.'],
      ['LuScale', 'Lastverteilungsplan:', 'nicht zu weit vorn, nicht zu weit hinten – Achslasten beachten.'],
      ['LuClipboardCheck', 'Abfahrtkontrolle:', 'vor jeder Schicht und nach Laden, Kuppeln, langen Pausen. Rote Warnleuchte: sicher anhalten.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C9, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Jetzt 15 Minuten Pause. Danach C10: sparsam fahren und die Strecke planen.“',
  });
  {
    const s = base(deck, 'c9e', { bg: 'f_pause.jpg', ov: 8.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „15 Minuten Pause. Kurz raus, frische Luft.“\n' +
      '💡 Pausenende ansagen (z. B. 19:45 Uhr).\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Willkommen zurück. Lektion C10: Wie fahrt ihr sparsam – und wie plant ihr eine Strecke mit dem Lkw?“' });
    s.text('PAUSE', { x: 0.7, y: 2.0, w: 6, h: 0.5, size: 18, bold: true, color: C.gr, cs: 6 }, { fx: 'fade', auto: true, dur: 600 });
    s.text('15 Minuten', { x: 0.7, y: 2.5, w: 6.5, h: 1.4, size: 72, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900, d: 200 });
    s.text('Kurz raus, frische Luft.', { x: 0.7, y: 4.0, w: 6.2, h: 0.9, size: 22, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 600 });
    s.text('Danach: Lektion C10 · Wirtschaftlich fahren, Streckenplanung', { x: 0.7, y: 4.85, w: 6.4, h: 0.8, size: 18, color: C.txt }, { fx: 'fade', auto: true, dur: 700, d: 900 });
  }
};
