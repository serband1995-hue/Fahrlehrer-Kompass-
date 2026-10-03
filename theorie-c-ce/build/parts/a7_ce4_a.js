// Abend 7 · CE4: Lernziele, Kapitel 1 Abfahrtkontrolle am Zug, Kapitel 2 Fahrverhalten (Einknicken, Ausbrechen, Pendeln)
const { C, sec, chapter, motion, steps, quiz, base, kick, title, card, CLICK, roadH } = require('../gs');
const { zugTop, uv } = require('../zugtop');

sec('ce4', 'LEKTION CE4', C.or, 'bg_kap.jpg');
sec('ce4k', 'CE4  ·  ABFAHRTKONTROLLE AM ZUG', C.bl, 'bg_blue.jpg');
sec('ce4f', 'CE4  ·  FAHRVERHALTEN', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  // ===== LERNZIELE CE4 =====
  {
    const s = base(deck, 'ce4', { transition: 'black', notes:
      '▶ Sagen: „Willkommen zurück. In CE4 geht es ums Fahren mit dem Zug: Was prüft ihr vor der Fahrt? Wie verhält sich der Zug beim Bremsen und bei Wind? Wie fahrt ihr rückwärts, wie biegt ihr ab? Und was gilt bei Wetter, Tempo, Abstand und Schwertransport?“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '➜ „Kapitel 1: Abfahrtkontrolle am Zug.“' });
    kick(s, 'Lektion CE4 · Fahren mit Zügen'); title(s, 'Das lernt ihr in CE4');
    const T = [['01', 'Abfahrtkontrolle am Zug', 'Kupplung · Leitungen · Anhänger frei · Bremsprobe', '15 Min', C.bl], ['02', 'Wie sich der Zug bewegt', 'Einknicken · Ausbrechen · Pendeln · Kippen', '20 Min', C.or], ['03', 'Rückwärts und Abbiegen', 'Sattelzug rückwärts · Einweiser · toter Winkel am Anhänger', '20 Min', C.pu], ['04', 'Wetter und Gefälle', 'Glätte · Schneeketten · Sicht unter 50 m · Seitenwind', '15 Min', C.gr], ['05', 'Tempo, Abstand, Schwertransport', '50 · 60 · 80 · Zeichen 277 · Begleitfahrzeug', '15 Min', 'C9A227']];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nimmst du mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }

  // ===== KAPITEL 1: ABFAHRTKONTROLLE AM ZUG =====
  await chapter(deck, 'ce4k', { num: 1, ttl: 'Abfahrtkontrolle am Zug', sub: 'Vor jeder Schicht und nach jedem Kuppeln: einmal um den ganzen Zug.', ico: 'LuClipboardCheck', notes:
    '▶ Sagen: „Die Abfahrtkontrolle am Lkw kennt ihr aus C6. Mit Anhänger kommt einiges dazu. Wir gehen einmal um den Zug.“\n✅ DGUV Vorschrift 70 § 36 (vor jeder Schicht); DGUV Grundsatz 314-002 Nr. 1 (auch nach dem Kuppeln) und Nr. 2.10 (Anhängerbetrieb).\n🖱 Keine Klicks.\n➜ „Los geht der Rundgang.“' });
  {
    const S = 0.3, H = [8.55, 3.75], HX = H[0];
    // Rundgang-Punkte (Zoll) und Markierungen je Schritt
    const WALK = [[HX - 0.05, 4.55], [HX - 0.3, 2.95], [HX - 1.1, 4.55], [HX - 2.45, 4.6], [HX + 3.6, 4.6]];
    await steps(deck, 'ce4k', {
      kicker: 'Rundgang', ttl: 'Einmal um den Zug', listY: 1.62,
      list: ['Kupplung zu?', 'Leitungen dran?', 'Anhänger frei?', 'Licht, Reifen, Plane', 'Bremsprobe'],
      ask: { q: 'Was prüft ihr am Zug zusätzlich?', a: 'Kupplung, Leitungen mit ABS-Stecker, Anhänger frei, Licht und Reifen hinten – und die Bremsprobe.', at: 4 },
      caps: [
        'Kupplung: Bolzen eingerastet? Kontrollstift ansehen und tasten. Beim Sattel: Verriegelung zu, Sicherung drin.',
        'Leitungen: rot, gelb, Licht und der ABS/EBS-Stecker. Nichts scheuert, nichts hängt bis zum Boden.',
        'Anhänger frei: Feststellbremse gelöst, Keile weg und verstaut, Stützen hoch.',
        'Am ganzen Zug: Licht, Reifen und Radmuttern. Plane zu, auf dem Dach kein Eis und kein Schnee.',
        'Zum Schluss die Bremsprobe – mit dem ganzen Zug, langsam auf dem Hof.',
      ],
      notes: [
        '▶ Sagen: „Wir starten an der Kupplung. Ist der Bolzen ganz unten? Kontrollstift ansehen und anfassen.“\n❓ Frage auf der Folie stellen.\n✅ DGUV Grundsatz 314-002 Nr. 2.10: Anhängekupplung geschlossen und gesichert. Prüfungsfrage 2.7.07-209 (Kontrollstift), aus CE1.\n➜ „Weiter zu den Leitungen.“',
        '▶ „Dann die Leitungen: rot, gelb, Licht – und der ABS/EBS-Stecker. Die Leitungen dürfen nicht scheuern und nicht durchhängen.“\n✅ DGUV Grundsatz 314-002 Nr. 2.10: elektrische und Bremsleitungen angeschlossen, sofern vorhanden auch ABV/ABS; nicht scheuern, nicht bis zum Boden durchhängen.\n➜ „Weiter am Anhänger.“',
        '▶ „Ist der Anhänger frei? Roter Knopf gedrückt, Keile weg und verstaut, Stützen oben. Sonst fahrt ihr mit angezogener Bremse los.“\n✅ Lehrbuchwissen aus CE1 bis CE3 (Feststellbremse lösen, Keile verstauen: Prüfungsfrage 2.7.07-321).\n➜ „Nach hinten.“',
        '▶ „Hinten: Licht am Anhänger, Reifen, Radmuttern. Und schaut auf die Plane: zu? Liegt Eis oder Schnee auf dem Dach? Das muss runter.“\n✅ DGUV Grundsatz 314-002 Nr. 2.1 (Licht auch am Anhänger), 2.2 (Reifen), 2.8 (Planen geschlossen, Dächer frei von Wasser, Schnee und Eis).\n➜ „Und als Letztes?“',
        '▶ „Als Letztes die Bremsprobe – mit dem ganzen Zug, langsam auf dem Hof. Zieht der Zug gerade? Bremst der Anhänger mit?“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfragen 2.7.02-017 und -020 (Bremsprobe). DGUV Grundsatz 314-002 Nr. 2.3.2: Bremsprobe, ABV-Kontrolle ohne Störung.\n➜ „Zwei Prüfungsfragen dazu.“',
      ],
      legend: 'Draufsicht · schematisch',
      scene: async (s, i) => {
        s.rect(5.7, 2.35, 7.35, 2.8, { fill: '1A222D', name: '!!hof' });
        const H2 = i === 4 ? [H[0] + 0.55, H[1]] : H;
        const z = zugTop(s, { H: H2, S, nm: 'k', hl: i === 4 ? '97A1AE' : i === 3 ? C.am : undefined });
        // Leitungen zwischen Lkw und Anhänger
        [['FF5C5C', -0.24], ['F2C230', -0.08], ['14181E', 0.08], ['6E7886', 0.24]].forEach(([col, off], k) => {
          const y = H2[1] + off * 0.6;
          s.rect(H2[0] - 0.42, y - 0.012, 0.42, 0.025, { fill: col, line: k === 2 ? '8A95A6' : undefined, lw: 0.5, name: '!!ltg' + k });
        });
        // Rückleuchten
        [1, -1].forEach((sd, k) => s.rect(z.rear[0] - 0.05, z.rear[1] + sd * 0.33 - 0.06, 0.06, 0.12, { fill: C.red, name: '!!rl' + k }));
        // Hervorhebung je Schritt
        const HL = [[H2[0] - 0.45, H2[1] - 0.45, 0.9, 0.9], [H2[0] - 0.7, H2[1] - 0.55, 1.0, 1.1], [z.T[0] - 0.55, H2[1] - 0.6, 1.3, 1.2], [z.rear[0] - 0.35, H2[1] - 0.65, 0.9, 1.3], [0, 0, 0, 0]][i];
        s.oval(HL[0], HL[1], Math.max(0.1, HL[2]), Math.max(0.1, HL[3]), { line: C.am, lw: 2.5, fill: C.am, ft: 100, lt: i === 4 ? 100 : 0, name: '!!hlr' });
        // Keile (Schritt 3: weg und verstaut)
        s.rrect(i >= 2 ? H2[0] - 3.2 : z.wa[3][0] + 0.12, i >= 2 ? H2[1] + 0.62 : z.wa[3][1] - 0.06, 0.14, 0.1, { fill: 'E3A23B', rr: 0.2, ft: i >= 2 ? 100 : 0, name: '!!keil' });
        // Läufer
        const w = WALK[i];
        s.oval(w[0] - 0.13, w[1] - 0.13, 0.26, 0.26, { fill: C.bl, line: C.txt, lw: 1.5, name: '!!walk' });
        // Stichwort
        const LAB = ['Kupplung', 'Leitungen', 'Anhänger frei', 'Licht · Reifen · Plane', 'Bremsprobe: Zug fährt an und bremst'][i];
        s.text(LAB, { x: 5.75, y: 5.35, w: 7.3, h: 0.5, size: 20, bold: true, color: C.bl, align: 'center', name: '!!lab' });
        s.text(i === 4 ? '→' : '', { x: H2[0] + 2.95, y: H2[1] - 0.95, w: 0.6, h: 0.4, size: 22, bold: true, color: C.gr, name: '!!pf' });
      },
    });
  }
  await quiz(deck, 'ce4k', {
    kicker: 'Prüfungsfrage 2.6.03-308', q: 'Sie möchten einen Anhänger mitführen. Was müssen Sie hinsichtlich der elektrischen Verbindung zwischen Zugfahrzeug und Anhänger beachten?', size: 26, osize: 17,
    opts: ['Die elektrischen Verbindungseinrichtungen dürfen nicht beschädigt sein', 'Die Bordspannung von Zugfahrzeug und Anhänger muss aufeinander abgestimmt sein', 'Die Funktion der Beleuchtungseinrichtungen der Fahrzeugkombination muss vor Fahrtantritt überprüft werden'], ok: [0, 1, 2],
    why: 'Alle drei sind richtig. Lkw und Anhänger haben in der Regel 24 Volt.',
    notes: '▶ Frage vorlesen, abstimmen. Tipp: Es können auch alle drei richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.03-308: A, B und C.\n➜ „Und noch eine – im Winter.“',
  });
  await quiz(deck, 'ce4k', {
    kicker: 'Prüfungsfrage 2.2.23-302', q: 'Die Plane Ihres Anhängers ist vereist. Was kann passieren, wenn Sie mit dem Anhänger eine Fahrt beginnen? Durch herabfallende Eisplatten können …', size: 26, osize: 18,
    opts: ['… beim Bremsen Luft- und Elektroleitungen am Fahrzeug stark beschädigt werden', '… Personen lebensgefährlich verletzt werden', '… andere Fahrzeuge erheblich beschädigt werden'], ok: [0, 1, 2],
    why: 'Eis und Schnee vom Dach runter, bevor ihr losfahrt. Beim Bremsen rutscht es nach vorn – auf die Leitungen zwischen Lkw und Anhänger.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.23-302: A, B und C. DGUV Grundsatz 314-002 Nr. 2.8: Fahrzeugdächer frei von Wasser, Schnee und Eis.\n➜ „Kapitel 2: Wie sich der Zug bewegt.“',
  });

  // ===== KAPITEL 2: FAHRVERHALTEN =====
  await chapter(deck, 'ce4f', { num: 2, ttl: 'Wie sich der Zug bewegt', sub: 'Zwei Fahrzeuge, ein Gelenk dazwischen. Beim Bremsen, in der Kurve und bei Wind macht das Gelenk, was es will – wenn ihr es lasst.', ico: 'LuWaves', notes:
    '▶ Sagen: „Ein Zug hat ein Gelenk – der Gliederzug sogar zwei: an der Kupplung und am Drehkranz. Darum kann er einknicken, ausbrechen und pendeln.“\n✅ DGUV Information 214-080, S. 31: Gliederzug mit zwei Drehpunkten (Kupplungsbolzen und Drehkranzmitte). Sattelzug: ein Drehpunkt (Königszapfen) – Lehrbuchwissen.\n🖱 Keine Klicks.\n➜ „Erst eine Merkhilfe aus CE3.“' });
  {
    const S = 0.17;
    const PAN = [{ y: 1.6, ttl: 'Antriebsräder des Lkw rutschen', res: 'Der Zug knickt ein', col: C.red }, { y: 4.15, ttl: 'Anhänger-Räder blockieren', res: 'Der Anhänger bricht aus', col: C.or }];
    await steps(deck, 'ce4f', {
      kicker: 'Merkhilfe', ttl: 'Wo blockiert es?',
      list: ['Lkw rutscht', 'Anhänger blockiert'],
      ask: { q: 'Beim Bremsen blockieren Räder. Was macht der Zug – je nachdem, wo?', a: 'Rutschen die Antriebsräder des Lkw, knickt der Zug ein. Blockiert der Anhänger, bricht er aus. Darum: gestreckt bremsen, ABS-Stecker drin.', at: 1 },
      caps: [
        'Rutschen die Antriebsräder des Lkw – zum Beispiel durch Retarder auf Glätte –, schiebt der Anhänger. Der Lkw dreht sich ein: Klappmesser.',
        'Blockieren die Räder des Anhängers – zum Beispiel ohne ABS-Stecker –, verliert er die Führung und schwenkt seitlich aus.',
      ],
      notes: [
        '▶ Sagen: „Eine Merkhilfe: Wo die Räder blockieren, geht die Führung verloren. Rutschen beim Lkw die Antriebsräder, schiebt der Anhänger und der Zug knickt ein – wie ein Klappmesser.“\n❓ Frage auf der Folie stellen.\n✅ Prüfungsfrage 2.7.06-108 (Retarder in der Kurve, Lkw bremst stärker). Mercedes-Benz Actros Betriebsanleitung, S. 250 (Antriebsräder verlieren die Haftung); WABCO EBS3, S. 15 (Blockierneigung der Antriebsräder → instabiler Fahrzustand). Merkhilfe: Lehrbuchwissen.\n💡 Blockiert nur die Vorderachse, kann der Lkw nicht mehr lenken – er schiebt geradeaus. Eingeknickt wird über die Antriebsachse.\n➜ „Und hinten?“',
        '▶ „Blockiert der Anhänger, schwenkt er seitlich aus. Das habt ihr bei der Vollbremsung ohne ABS-Stecker gesehen. Gegen beides hilft: vor der Kurve gestreckt bremsen, Dauerbremse bei Glätte aus, Stecker immer drin.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.06-314. Der Kippschutz (RSS) am Anhänger arbeitet nur mit gestecktem ABS-Stecker (WABCO TEBS E, Kap. 5.7). Das ESC des Lkw arbeitet auch ohne Stecker. Bremst es dabei den Anhänger mit, können ohne Anhänger-ABS dessen Räder blockieren (WABCO EBS3, S. 16–17).\n➜ „Und dann gibt es noch das Pendeln.“',
      ],
      legend: 'Draufsicht · schematisch',
      scene: async (s, i) => {
        PAN.forEach((p, k) => {
          const on = k === i;
          s.rrect(5.75, p.y, 7.3, 2.35, { fill: on ? '1A222D' : '10161F', line: on ? p.col : C.line, lw: on ? 2 : 1, rr: 0.06, name: '!!pn' + k });
          s.text([{ text: p.ttl + '  →  ', options: { color: on ? C.txt : C.dim, bold: true } }, { text: p.res, options: { color: on ? p.col : C.dim, bold: true } }], { x: 5.95, y: p.y + 0.1, w: 7.0, h: 0.38, size: 16, name: '!!pt' + k });
          roadH(s, 5.95, p.y + 0.68, 6.9, 1.4, { name: 'pr' + k, fill: on ? '252E3A' : '1C232D', curbs: false });
        });
        // Antriebsräder Lkw rutschen: Einknicken (Lkw dreht ein, Anhänger schiebt)
        { const LY = 1.6 + 0.68 + 1.05, a = -30, u = uv(a), F = [11.6, LY], Hh = [F[0] - u[0] * 8.1 * S, F[1] - u[1] * 8.1 * S];
          const b = Math.asin((LY - Hh[1]) / (7.4 * S)) * 180 / Math.PI;
          zugTop(s, { H: Hh, a, b, S, nm: 'e', hlL: i === 0 ? C.red : undefined }); }
        // hinten blockiert: Ausbrechen
        { const LY = 4.15 + 0.68 + 1.05; zugTop(s, { H: [10.6, LY], b: -32, S, nm: 'a', hl: i === 1 ? C.or : undefined }); }
      },
    });
  }
  // ===== PENDELN (Draufsicht, fließend) =====
  {
    const S = 0.24, RX = 5.65, RW = 7.45, R = 2.2, RH = 2.4, LY = R + RH * 0.73, H = [9.55, LY];
    const fr = (b, o = {}) => ({ ...o, t: { b, ...(o.t || {}) } });
    const B = (msg, mc) => ({ msg, mc });
    await motion(deck, 'ce4f', {
      kicker: 'Pendeln', ttl: 'Der Anhänger schaukelt', dur: 520, holdDur: 600,
      question: 'Euer Anhänger fängt bei 80 an zu pendeln. Was tut ihr?',
      answer: 'Gas weg, Lenkrad ruhig gerade halten, nicht hektisch gegenlenken. Bremsen erst, wenn der Zug wieder gestreckt ist. Danach: Ladung und Kupplung prüfen.',
      legend: 'Draufsicht · schematisch · Autobahn',
      frames: [
        fr(0, { t: B('Autobahn, 80 km/h. Eine Windböe …', C.mut), hold: true,
          cap: 'Ein Gliederzug hat zwei Gelenke: Kupplung und Drehkranz. Darum kann der Anhänger seitlich hin und her schwingen.',
          note: '▶ Sagen: „Autobahn, 80 km/h. Eine Böe, eine Spurrille oder ein hastiger Lenker – und der Anhänger fängt an zu schwingen.“\n❓ Frage auf der Folie stellen.\n✅ DGUV Information 214-080, S. 31 (zwei Drehpunkte). Pendeln: Lehrbuchwissen; Prüfungsfrage 2.7.01-102 (hastige Lenkbewegungen erhöhen die Schleudergefahr), 2.1.07-209 (Windböen).\n🖱 Klick: Der Anhänger fängt an zu pendeln (läuft von selbst).\n➜ „Schaut auf den Anhänger.“' }),
        fr(5, { t: B('Der Anhänger schwingt aus …', C.am) }),
        fr(-7, { t: B('… und zurück …', C.am) }),
        fr(9, { t: B('… immer weiter …', C.red) }),
        fr(-11, { t: B('Es schaukelt sich auf!', C.red), hold: true,
          cap: 'Pendeln wird schlimmer durch: hohes Tempo, leeren oder hinten schwer beladenen Anhänger, Seitenwind, hastiges Lenken, Spiel an Zugöse oder Drehkranz.',
          note: '▶ „Jetzt schaukelt es sich auf. Was macht ihr? Wer jetzt Gas gibt oder hektisch gegenlenkt, macht es schlimmer.“\n✅ Lehrbuchwissen: Pendeln begünstigt durch hohe Geschwindigkeit, leeren oder hinten schwer beladenen Anhänger, Seitenwind, Spurrillen, Spiel an Zugöse, Zuggabel oder Drehkranz. Vergleiche Prüfungsfrage 2.6.03-102 (Anhänger „springt“ auf Schlaglöchern: Geschwindigkeit vermindern; falsch: beschleunigen, um den Zug zu strecken).\n🖱 Klick: Gas weg (läuft von selbst).\n➜ „So beruhigt ihr den Zug.“' }),
        fr(6, { t: B('Gas weg. Lenkrad ruhig halten …', C.gr) }),
        fr(-3, { t: B('… das Schwingen wird kleiner …', C.gr) }),
        fr(1, { t: B('… und kleiner …', C.gr) }),
        fr(0, { t: B('Der Zug läuft wieder gerade.', C.gr), hold: true, answer: true,
          cap: 'Gas weg, Lenkrad ruhig, nicht hektisch gegenlenken. Bremsen erst, wenn der Zug gestreckt ist. Danach Ladung und Spiel an der Kupplung prüfen.',
          note: '▶ „Gas weg, das Lenkrad ruhig gerade halten, nicht wild gegenlenken. Bremst ihr, dann erst, wenn der Zug wieder gestreckt ist. Und danach: anhalten und nachsehen – Ladung verrutscht? Spiel an Zugöse oder Drehkranz?“\n❓ Frage auf der Folie auflösen.\n✅ Lehrbuchwissen (Gas weg, ruhig halten, gestreckt bremsen); vergleiche Prüfungsfrage 2.6.03-102 (Anhänger „springt“: Geschwindigkeit vermindern). Prüfungsfrage 2.7.08-301: Drehkranz und Zuggabel schmieren.\n💡 Winkel überzeichnet.\n🖱 Nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage.“' }),
      ],
      scene: async (s, t) => {
        roadH(s, RX, R, RW, RH, { name: 'ab', cy: R + RH / 2 - 0.02 });
        s.text('Autobahn · 80 km/h', { x: RX, y: R - 0.45, w: 4, h: 0.3, size: 14, bold: true, color: C.mut, name: '!!abt' });
        zugTop(s, { H, a: -t.b * 0.12, b: t.b, bd: t.b * 1.35, S, nm: 'p', hl: Math.abs(t.b) >= 9 ? C.red : undefined });
        s.text(t.msg, { x: RX, y: 5.1, w: RW, h: 0.6, size: 18, bold: true, color: t.mc, align: 'center', valign: 'middle', name: '!!msg' });
      },
    });
  }
  await quiz(deck, 'ce4f', {
    kicker: 'Prüfungsfrage 2.6.03-102', q: 'Auf einer Straße mit Schlaglöchern kommt Ihr Anhänger ins „Springen“. Wie müssen Sie sich verhalten?', size: 30,
    opts: ['Geschwindigkeit vermindern, um Schleudern zu verhindern', 'Beschleunigen, um den Zug gestreckt zu halten', 'Mit gleich bleibender Geschwindigkeit den Schlaglöchern ausweichen'], ok: [0],
    why: 'Langsamer heißt: weniger Schwung im Anhänger. Gas geben macht es schlimmer.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.03-102: A.\n➜ „Und wann knickt ein Zug auf Glätte ein?“',
  });
  await quiz(deck, 'ce4f', {
    kicker: 'Prüfungsfrage 2.7.06-107', q: 'Wann ist für eine Fahrzeugkombination die Gefahr besonders groß, auf glatter Fahrbahn einzuknicken oder zu schleudern?', size: 30,
    opts: ['Wenn ruckartig gelenkt wird', 'Wenn bei Kurvenfahrten mit der Betriebsbremse mit maximaler Verzögerung gebremst wird', 'Wenn dosiert beschleunigt wird'], ok: [0, 1],
    why: 'Auf Glätte: ruhig lenken, vor der Kurve gestreckt bremsen – nicht in der Kurve.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-107: A und B.\n➜ „Und zum Kippen.“',
  });
  await quiz(deck, 'ce4f', {
    kicker: 'Prüfungsfrage 2.7.01-202', q: 'Worauf müssen Sie sich einstellen, wenn Sie ein Tankfahrzeug mit teilbeladenen Kammern fahren?', size: 32,
    opts: ['Auf erhöhte Kippgefahr in Kurven', 'Auf erhöhte Schleudergefahr', 'Auf schwergängige Lenkung im Gefälle'], ok: [0, 1],
    why: 'Die Flüssigkeit schwappt in der Kurve nach außen und beim Bremsen nach vorn. Das schiebt den Zug.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.01-202: A und B.\n💡 Hoher Schwerpunkt = Kippgefahr in der Kurve (Lehrbuchwissen). Und ungesicherte Ladung kann in der Kurve das Umkippen begünstigen (Prüfungsfrage 2.2.22-121).\n➜ „Kapitel 3: Rückwärts und Abbiegen.“',
  });
};
