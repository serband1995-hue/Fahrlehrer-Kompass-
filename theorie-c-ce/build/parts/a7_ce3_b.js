// Abend 7 · CE3: Kapitel 3 Der ABS-Stecker (Vollbremsung auf Nässe), Kapitel 4 Feststellbremse im Zug (Kontrollstellung am Berg)
const { C, sec, chapter, motion, quiz, photoAsk, ask, roadH, lkw, anhaenger, seg, arrow, svgImg } = require('../gs');
const { icon } = require('../lib');
const { zugTop, LKW } = require('../zugtop');
const { lkwSide, anhaengerSide } = require('../lkw');

sec('ce3a', 'CE3  ·  DER ABS-STECKER', C.or, 'bg_or.jpg');
sec('ce3f', 'CE3  ·  FESTSTELLBREMSE IM ZUG', C.pu, 'bg_pu.jpg');

module.exports = async (deck) => {
  // ===== KAPITEL 3: DER ABS-STECKER =====
  await chapter(deck, 'ce3a', { num: 3, ttl: 'Der ABS-Stecker', sub: 'Ein Stecker entscheidet, ob das ABS des Anhängers arbeitet: der ABS/EBS-Stecker (ISO 7638). Was passiert, wenn er fehlt?', ico: 'LuPlug', notes:
    '▶ Sagen: „Beim Ankuppeln schließt ihr vier Dinge an: gelb, rot, den Lichtstecker – und den ABS/EBS-Stecker. Wer den ABS/EBS-Stecker vergisst, fährt mit einem Anhänger, dessen ABS nicht arbeitet. Zeigt am Fahrzeug, welcher Stecker es ist. Schauen wir, was dann passiert.“\n✅ DGUV Grundsatz 314-002 Nr. 2.10: elektrische Leitungen und Bremsleitungen angeschlossen, sofern vorhanden auch die ABV/ABS-Steckverbindung. ISO-7638-Steckverbindung: Strom und Daten für ABS/EBS des Anhängers (UN-R 13 Nr. 5.2.2.17, früher RL 71/320/EWG Anhang X Nr. 4.4; WABCO TEBS E Kap. 5.7).\n🖱 Keine Klicks.\n➜ „Zwei Züge, eine Vollbremsung.“' });

  // ===== VOLLBREMSUNG AUF NÄSSE (Draufsicht, fließend) =====
  {
    const S = 0.2, RX = 5.65, RW = 7.45, R1 = 1.95, R2 = 4.1, F0 = 9.75, D1 = 2.1, D2 = 3.1;
    const lane = top => top + 1.05, pos = (D, u) => D * (1 - (1 - u) ** 2);
    const U = [0, 0.35, 0.65, 0.88, 1], ANG = [0, -4, -14, -26, -32];
    const hAt = (D, u, top) => [F0 + pos(D, u) - LKW.front * S, lane(top)];
    const fr = (t, o = {}) => ({ ...o, t });
    await motion(deck, 'ce3a', {
      kicker: 'ABS-Stecker', ttl: 'Vollbremsung auf Nässe', dur: 650, holdDur: 650,
      question: 'Vollbremsung auf nasser Fahrbahn. Was passiert, wenn der ABS-Stecker fehlt?',
      answer: 'Die Räder des Anhängers können blockieren. Dann kann der Anhänger ausbrechen – und der Bremsweg wird länger.',
      legend: 'Draufsicht · schematisch · nasse Fahrbahn',
      frames: [
        fr({ k: 0, msg: 'Zwei gleiche Züge, gleich schnell. Gleich bremsen beide voll.', mc: C.mut }, { hold: true,
          cap: 'Oben ist der ABS-Stecker drin. Unten fehlt er: Nur am Lkw arbeitet das ABS, am Anhänger nicht.',
          note: '▶ Sagen: „Zwei gleiche Züge auf nasser Straße. Oben steckt der ABS-Stecker – Lkw und Anhänger haben ABS. Unten fehlt der Stecker – das ABS arbeitet nur am Lkw. Beide machen gleich eine Vollbremsung.“\n❓ Frage auf der Folie stellen. Tipps sammeln.\n✅ Prüfungsfrage 2.7.06-314: Nur das Zugfahrzeug hat ABV – Vollbremsung auf nasser Fahrbahn. WABCO TEBS E, Kap. 5.7: Ohne ISO-7638-Verbindung sind ABS, EBS und Kippschutz nicht verfügbar.\n🖱 Klick: Vollbremsung (läuft von selbst bis zum Stand).\n➜ „Achtung – Vollbremsung!“' }),
        fr({ k: 1, msg: 'Vollbremsung!', mc: C.am }),
        fr({ k: 2, msg: 'Unten blockieren die Räder des Anhängers …', mc: C.red }),
        fr({ k: 3, msg: '… er verliert die Seitenführung und bricht aus.', mc: C.red }),
        fr({ k: 4, msg: 'Ohne Stecker: Der Anhänger kann ausbrechen – und der Zug steht später.', mc: C.red }, { hold: true, answer: true,
          cap: 'Oben regelt ABS an allen Rädern: Der Zug bleibt gerade. Unten blockieren die Anhängerräder: Er kann ausbrechen, der Bremsweg wird länger.',
          note: '▶ „Oben: ABS regelt an allen Rädern, der Zug bleibt gerade und steht. Unten: Die Anhängerräder blockieren. Ein blockiertes Rad kann nicht mehr seitlich führen – der Anhänger schwenkt aus, bis in den Gegenverkehr. Und der Zug steht später.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.06-314: Beim Blockieren der Anhängerräder kann sich der Bremsweg verlängern und der Anhänger ausbrechen (falsch: Zug sicher gestreckt). Mercedes-Benz Actros Betriebsanleitung (manualslib S. 244, gedruckt S. 242): „Die Räder des Anhängers/Aufliegers können beim Bremsen blockieren und der Lastzug kann instabil werden, wenn der Anhänger/Auflieger kein ABS hat …“\n💡 Strecken und Winkel sind gezeichnet, nicht gemessen.\n🖱 Nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage dazu.“' }),
      ],
      scene: async (s, t) => {
        const k = t.k, u = U[k];
        roadH(s, RX, R1, RW, 1.4, { name: 'r1', fill: '252E3A' });
        roadH(s, RX, R2, RW, 1.4, { name: 'r2', fill: '252E3A' });
        s.text([{ text: '✓  Mit ABS-Stecker', options: { bold: true, color: C.gr } }, { text: '   Lkw und Anhänger mit ABS', options: { color: C.mut } }], { x: RX, y: R1 - 0.46, w: RW, h: 0.3, size: 14, name: '!!l1' });
        s.text([{ text: '✕  Ohne ABS-Stecker', options: { bold: true, color: C.red } }, { text: '   ABS arbeitet nur am Lkw', options: { color: C.mut } }], { x: RX, y: R2 - 0.46, w: RW, h: 0.3, size: 14, name: '!!l2' });
        // Haltepunkt mit ABS (dünne Linie, liegt unter den Fahrzeugen)
        const xs = F0 + D1, xe = F0 + D2;
        s.rect(xs - 0.008, R1, 0.016, R2 + 1.4 - R1, { fill: C.white, ft: k === 4 ? 45 : 100, name: '!!stop' });
        // oben: mit Stecker – bleibt gerade
        const H1 = hAt(D1, u, R1);
        zugTop(s, { H: H1, S, nm: 'o' });
        s.text(k === 0 ? '' : k < 4 ? 'ABS regelt' : 'steht – gerade', { x: H1[0] - 0.4, y: R1 + 0.12, w: 2.4, h: 0.3, size: 12, bold: true, color: C.gr, align: 'center', name: '!!ot' });
        // unten: ohne Stecker – Anhänger blockiert und bricht aus
        const H2 = hAt(D2, u, R2);
        zugTop(s, { H: H2, b: ANG[k], S, nm: 'u', trailAh: U.slice(0, k).map((uu, j) => ({ H: hAt(D2, uu, R2), b: ANG[j] })), nTrail: 4, hl: k >= 2 ? C.red : undefined });
        s.text(k ? 'Räder blockieren' : '', { x: H2[0] - 2.2, y: R2 + 1.53, w: 2.2, h: 0.28, size: 12, bold: true, color: C.red, align: 'center', name: '!!ut' });
        arrow(s, xs + 0.05, R2 + 0.3, xe - 0.02, R2 + 0.3, { col: C.am, th: 0.05, head: 0.16, name: 'mehr', hide: k !== 4 });
        s.text(k === 4 ? 'länger' : '', { x: xs, y: R2 + 0.02, w: xe - xs, h: 0.26, size: 12, bold: true, color: C.am, align: 'center', name: '!!mehrt' });
        s.text(t.msg, { x: RX, y: 5.95, w: RW, h: 0.7, size: 16, bold: true, color: t.mc, align: 'center', valign: 'middle', name: '!!msg' });
      },
    });
  }
  await quiz(deck, 'ce3a', {
    kicker: 'Prüfungsfrage 2.7.06-314', q: 'Bei einem Lastzug ist nur das Zugfahrzeug mit einem Automatischen Blockierverhinderer (ABV) ausgerüstet. Wie kann sich das bei einer Vollbremsung auf nasser Fahrbahn auswirken? Beim Blockieren der Räder des Anhängers kann …', size: 22,
    opts: ['… sich der Bremsweg verlängern', '… der Anhänger ausbrechen', '… der Zug sicher gestreckt werden'], ok: [0, 1],
    why: 'Blockierte Räder führen nicht mehr seitlich. Gestreckt bleibt der Zug nur, wenn der Anhänger nicht blockiert.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-314: A und B.\n➜ „Merkt ihr eigentlich, wenn der Stecker fehlt?“',
  });

  // ===== STECKER VERGESSEN – MERKT IHR DAS? =====
  await photoAsk(deck, 'ce3a', {
    bg: 'k_koepfe_r.jpg', bgX: 6.0, ov: 7.0, kicker: 'ABS-Stecker', q: 'Stecker vergessen – merkt ihr das?', qsize: 32, w: 5.25, asize: 15,
    answers: [
      ['LuLightbulbOff', 'Warnleuchte? Kein Verlass!', 'Ohne Stecker bleibt sie oft einfach dunkel.', C.red],
      ['LuEye', 'Hinsehen', 'Nach dem Kuppeln: Steckt der ABS-Stecker?', C.or],
      ['LuEar', 'Hinhören', 'Zündung an: Oft klickt es kurz am Anhänger.', C.gr],
      ['LuCircleCheck', 'Leuchte prüfen', 'Sie muss spätestens beim Anfahren ausgehen.', C.am],
    ],
    notes:
      '▶ Sagen: „Viele denken: Wenn der Stecker fehlt, leuchtet doch eine Lampe. Darauf könnt ihr euch nicht verlassen.“\n' +
      '❓ Frage stellen, sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ UN-R 13 Nr. 5.2.1.29.2 (früher RL 71/320/EWG Anhang X Nr. 4.2.1): Die Anhänger-ABS-Warnung darf nicht leuchten, wenn kein Anhänger mit ABV angeschlossen ist. WABCO TEBS E, Kap. 5.8.1: Fällt die ISO-7638-Verbindung ganz aus, kann über Pin 5 keine Warnung gesendet werden. Daraus folgt (eigene Schlussfolgerung): Fehlt der Stecker, bleibt die Leuchte meist dunkel. WABCO TEBS E: Nach dem Einschalten schaltet der Modulator kurz die Magnetventile (hörbares Klicken). DGUV Grundsatz 314-002, Nr. 1 und 2.3.2: Nach dem Kuppeln den Zustand kontrollieren; ABV-Kontrolle zeigt keine Störung.\n' +
      '💡 Leuchte: WABCO TEBS E Kap. 5.8.1 nennt zwei zulässige Varianten – sie geht nach etwa 2 Sekunden aus oder erst beim Anfahren (ab etwa 7 km/h). Bleibt sie auch beim Fahren an: Fehler, Werkstatt. Welche Variante euer Zug hat, steht in der Betriebsanleitung.\n' +
      '💡 Auf dem Foto hängen die Wendel lose bis weit nach unten. Am Fahrzeug gehören sie in die Halterung – nichts darf scheuern oder bis zum Boden hängen (DGUV Grundsatz 314-002 Nr. 2.10, Rundgang in CE4).\n' +
      '➜ „Noch eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce3a', {
    kicker: 'Prüfungsfrage 2.7.06-315', q: 'Die Verbindung des Elektronischen Bremssystems (EBS) zum Anhänger ist unterbrochen. Welche Auswirkung kann dies beim Bremsen für den Anhänger haben?', size: 26, osize: 18,
    opts: ['Der Automatische Blockierverhinderer (ABV) kann abgeschaltet sein', 'Der Anhänger wird mithilfe des pneumatischen Redundanzdrucks gebremst', 'Die Bremsleuchten funktionieren nicht mehr'], ok: [0, 1],
    why: '„Redundanzdruck“ heißt: Der Bremswunsch kommt nur noch als Luft über gelb. Fehlt auch der Strom (Stecker ganz ab), arbeitet das ABS nicht – darum „kann“. Bremsleuchten: Lichtstecker.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-315: A und B. WABCO TEBS E, Kap. 5.9.1: ohne CAN Bremsung über den pneumatischen Steuerdruck; hat das Modul Strom, regelt es weiter Last, ABS und Kippschutz. Kap. 5.8.2: ABS bleibt bei pneumatischer Redundanz „to the greatest possible extent“ erhalten. Kap. 5.7: Erst ohne ISO-7638-Stecker gibt es kein ABS.\n💡 Die Beleuchtung kommt über den eigenen Lichtstecker (24 V, ISO 1185 / ISO 12098).\n➜ „Kapitel 4: Die Feststellbremse im Zug.“',
  });

  // ===== KAPITEL 4: FESTSTELLBREMSE IM ZUG =====
  await chapter(deck, 'ce3f', { num: 4, ttl: 'Feststellbremse im Zug', sub: 'Die Feststellbremse im Lkw hält den Lkw mit Federkraft. Und womit hält sie den Anhänger?', ico: 'LuCircleParking', notes:
    '▶ Sagen: „Ihr stellt den Zug am Berg ab und zieht die Feststellbremse. Fertig? Nicht ganz. Der Anhänger wird dabei anders gehalten als der Lkw.“\n✅ Prüfungsfragen 2.7.06-320 und -321.\n🖱 Keine Klicks.\n➜ „Schauen wir uns das am Berg an.“' });

  {
    const T = Math.atan(0.12), TD = Math.round(T * 1800 / Math.PI) / 10, K = 0.4;
    const P0 = [13.1, 5.85], dv = [-Math.cos(T), -Math.sin(T)], nup = [Math.sin(T), -Math.cos(T)];
    const onS = (sv, h = 0) => [P0[0] + dv[0] * sv + nup[0] * h, P0[1] + dv[1] * sv + nup[1] * h];
    const OL = { L: 7.5, box: 'koffer', boxH: 2.4, floor: 1.0, r: 0.48, axles: [1.4, 5.5, 6.85], cabL: 2.1, cabTop: 3.3, top: 3.5, hitch: true };
    const OA = { L: 6.5, floor: 1.0, boxH: 2.4, r: 0.48, axles: [1.1, 5.4] };
    const RL = lkwSide(OL), RA = anhaengerSide(OA);
    const place = (r, sB) => {
      const B = onS(sB), w = r.W / 100 * K, h = r.H / 100 * K, Cc = [B[0] + h / 2 * Math.sin(T), B[1] - h / 2 * Math.cos(T)];
      return { x: Cc[0] - w / 2 + r.pad * K, gy: Cc[1] - h / 2 + r.Ht * K, C: Cc };
    };
    const vpt = (pl, nx, ny) => {
      const dx = pl.x + nx * K - pl.C[0], dy = pl.gy - ny * K - pl.C[1];
      return [pl.C[0] + dx * Math.cos(T) - dy * Math.sin(T), pl.C[1] + dx * Math.sin(T) + dy * Math.cos(T)];
    };
    const hill = await svgImg(`<polygon points="0,${(5.85 - 4.9 - 7.5 * 0.12) * 100 + 0} 750,${(5.85 - 4.9) * 100} 750,170 0,170" fill="#141B25"/>`, 750, 170, 2);
    const wedge = await svgImg('<polygon points="0,0 0,70 110,70" fill="#E3A23B" stroke="#8A6022" stroke-width="5"/>', 110, 70, 3);
    const hand = await icon('LuHand', C.txt);
    const LEV = { F: 0, S: 1, K: 2 };
    const fr = (t, o = {}) => ({ ...o, t });
    await motion(deck, 'ce3f', {
      kicker: 'Kontrollstellung', ttl: 'Den Zug am Berg abstellen', dur: 600, holdDur: 650,
      question: 'Ihr zieht im Lkw die Feststellbremse. Womit wird der Anhänger gehalten?',
      answer: 'In der Regel nur mit Druckluft über seine Betriebsbremse – und die kann entweichen. Darum: Kontrollstellung prüfen, Feststellbremse am Anhänger ziehen, Keile unterlegen.',
      legend: 'Seitenansicht · schematisch · 12 % maßstäblich',
      frames: [
        fr({ lev: 'F', lk: 0, ah: 0, air: 0, roll: 0, msg: 'Der Zug steht an einer Steigung von 12 %. Der Fahrer hält ihn noch mit der Fußbremse.', mc: C.mut }, { hold: true,
          cap: 'Der Zug soll hier stehen bleiben. Gleich zieht der Fahrer die Feststellbremse. Was hält dann den Lkw – und was den Anhänger?',
          note: '▶ Sagen: „Der Zug steht an einer Steigung von 12 Prozent. Rechts oben seht ihr das Handbremsventil im Lkw mit drei Stellungen: Fahren, Feststellen und Kontrolle.“\n❓ Frage auf der Folie stellen.\n✅ UN-R 13 Anh. 4 Nr. 2.3.2 (früher RL 71/320/EWG Anhang II Nr. 2.1.3.2; für Lkw gültig über § 41 Abs. 18 StVZO): Die Feststellbremse des Zugfahrzeugs muss den ganzen Zug an 12 % Steigung oder Gefälle halten.\n🖱 Klick: Feststellbremse ziehen.\n➜ „Hebel auf Feststellen.“' }),
        fr({ lev: 'S', lk: 1, ah: 1, air: 1, roll: 0, msg: 'Feststellen: Der Lkw hält mit Federkraft – mechanisch. Der Anhänger hält mit Luft.', mc: C.txt }, { hold: true,
          cap: 'Lkw: Die Federspeicher halten – mechanisch, ohne Luft. Anhänger: Er wird in der Regel nur mit Druckluft über seine Betriebsbremse gehalten.',
          note: '▶ „Hebel auf Feststellen. Am Lkw drücken jetzt die Federspeicher – das hält mechanisch, auch ohne Luft. Der Anhänger bekommt dabei Luft auf seine normale Betriebsbremse. Er hält also in der Regel nur mit Druckluft.“\n✅ Prüfungsfrage 2.7.06-321: Zugfahrzeug mechanisch gebremst; Anhänger üblicherweise nur mit Druckluft durch die Betriebsbremsanlage (falsch: Anhänger mechanisch). Mercedes-Benz Actros Betriebsanleitung (manualslib S. 246, gedruckt S. 244): Bei angekuppeltem Anhänger/Auflieger mit EG-Bremsanlage wirkt die Feststellbremse auf die Betriebsbremse des Anhängers.\n🖱 Klick: Zeit vergeht.\n➜ „Was passiert über Nacht?“' }),
        fr({ lev: 'S', lk: 1, ah: 2, air: 0.2, roll: 0, msg: 'Stunden später: Die Luft im Anhänger entweicht. Dann hält dort meist nichts mehr.', mc: C.am }, { hold: true,
          cap: 'Druckluft entweicht mit der Zeit. Manche neue Anhänger bremsen dann selbst mit dem Federspeicher – verlasst euch nicht darauf. Reicht der Lkw allein für den ganzen Zug?',
          note: '▶ „Luft bleibt nicht ewig. Über Stunden entweicht sie. Dann hält am Anhänger meist nichts mehr – nur noch der Lkw mit seinen Federn. Manche neue Anhänger bremsen dann von selbst mit ihrem Federspeicher, aber darauf verlasst ihr euch nicht. Die Frage ist: Schafft der Lkw das allein?“\n✅ Lehrbuchwissen; DGUV Information 214-080, S. 33: Anhänger nie nur mit der Notbremsfunktion abstellen; der Federspeicher spricht „in der Regel nicht“ automatisch an. WABCO TEBS E Kap. 5.8.1: Bei Anhängern mit dieser Ausstattung bremsen die Federspeicher automatisch, wenn der Druck am Kupplungskopf unter 2,5 bar fällt.\n🖱 Klick: Kontrollstellung.\n➜ „Genau das prüft ihr mit der Kontrollstellung.“' }),
        fr({ lev: 'K', lk: 1, ah: 3, air: 0, roll: 0, msg: 'Kontrollstellung: Hebel weiter ziehen und halten. Die Anhängerbremse ist gelöst. Hält der Lkw den Zug allein?', mc: C.pu }, { hold: true,
          cap: 'Kontrollstellung: Die Anhängerbremse wird gelöst, nur die Federspeicher des Lkw halten. So seht ihr: Hält der Lkw den ganzen Zug allein?',
          note: '▶ „Jetzt der Trick: Hebel über Feststellen hinaus in die Kontrollstellung ziehen – und festhalten. Die Anhängerbremse wird gelöst. Es hält nur noch der Lkw. Bleibt der Zug stehen, ist alles gut.“\n✅ Prüfungsfrage 2.7.06-320: Zugfahrzeug über Federspeicher gebremst, Betriebsbremse des Anhängers gelöst (falsch: Anhängerbremse betätigt). Mercedes-Benz Actros Betriebsanleitung (manualslib S. 247, gedruckt S. 245): Hebel in die Kontrollstellung schwenken und halten; „Das Fahrzeug darf sich nicht bewegen.“ UN-R 13 Nr. 5.1.2.3 (früher RL 71/320/EWG Anhang I Nr. 2.1.2.3): Der Fahrer muss prüfen können, ob die rein mechanische Feststellbremse allein reicht.\n💡 Bei den meisten Lkw rastet der Hebel in der Kontrollstellung nicht ein – Betriebsanleitung.\n🖱 Klick: Was, wenn er nicht hält?\n➜ „Und wenn er rollt?“' }),
        fr({ lev: 'K', lk: 1, ah: 3, air: 0, roll: 1, msg: 'Der Zug rollt? Hebel sofort zurück auf Feststellen – der Lkw allein reicht hier nicht!', mc: C.red }, { hold: true,
          cap: 'Rollt der Zug in der Kontrollstellung, reicht der Lkw allein nicht. Dann den Zug zusätzlich sichern.',
          note: '▶ „Rollt der Zug, Hebel sofort zurück auf Feststellen – dann hält der Anhänger wieder mit Luft. Aber auf Dauer reicht das nicht. Ihr müsst zusätzlich sichern.“\n✅ Mercedes-Benz Actros Betriebsanleitung (manualslib S. 247): Hält der Zug in der Kontrollstellung nicht, Zugfahrzeug und Anhänger mit Unterlegkeilen sichern.\n🖱 Klick: richtig sichern.\n➜ „So stellt ihr den Zug sicher ab.“' }),
        fr({ lev: 'S', lk: 1, ah: 4, air: 0, roll: 1, keil: 1, msg: 'Sicher: Hebel in Feststellen einrasten. Feststellbremse am Anhänger ziehen. Keile unterlegen.', mc: C.gr }, { hold: true, answer: true,
          cap: 'Hebel zurück in Feststellen, einrasten. Anhänger: Feststellbremse ziehen (roter Knopf). Keile an Räder einer starren Achse\u00A0– nie an Lenk- oder Liftachse\u00A0–, auf der Seite zum Gefälle.',
          note: '▶ „So steht der Zug sicher: Hebel zurück in Feststellen und einrasten. Am Anhänger den roten Knopf ziehen – seine eigene Feststellbremse. Und Keile unter: an die Räder einer starren Achse, nie an eine Lenk- oder Liftachse – immer auf der Seite zum Gefälle.“\n❓ Frage auf der Folie auflösen.\n✅ Mercedes-Benz Actros Betriebsanleitung, manualslib S. 247 (Kontrollstellung, danach zurück in Vollbremsstellung und einrasten). Prüfungsfrage 2.2.23-201: Feststellbremse anziehen und Unterlegkeil vor ein Hinterrad legen. Keile nur an die starre Achse, nie an Lenk- oder Liftachse (DGUV Information 214-080, S. 34 und 51); mindestens einen in Richtung des Gefälles (S. 20).\n💡 Der rote Knopf löst sich wieder, wenn ihr vor dem Losfahren drückt – nur mit Luft im Anhänger (siehe Abend 6).\n🖱 Nächster Klick: nächste Folie.\n➜ „Zwei Prüfungsfragen.“' }),
      ],
      scene: async (s, t) => {
        // Hang
        s.img(hill, { x: 5.6, y: 4.9, w: 7.5, h: 1.7, name: '!!hill' });
        const g0 = onS(-0.05), g1 = onS(7.6);
        seg(s, g0[0], g0[1], g1[0], g1[1], { col: '4A5566', th: 0.05, name: '!!hang' });
        s.text('Steigung 12 %', { x: 11.0, y: 6.05, w: 2.0, h: 0.32, size: 14, bold: true, color: C.pu, align: 'right', name: '!!pct' });
        // Fahrzeuge (rollen ein Stück zurück, wenn roll)
        const sR = 0.4 - 0.22 * t.roll;
        const sA = sR + OA.L / 2 * K, sL = sR + OA.L * K + 0.44 + OL.L / 2 * K;
        const pA = place(RA, sA), pL = place(RL, sL);
        await anhaenger(s, OA, { x: pA.x, gy: pA.gy, k: K, name: 'ah', rot: TD });
        await lkw(s, OL, { x: pL.x, gy: pL.gy, k: K, name: '!!lk', rot: TD });
        const d0 = vpt(pA, OA.axles[0], 0.55), d1 = vpt(pL, 7.52, 0.6);
        seg(s, d0[0], d0[1], d1[0], d1[1], { col: '3A4250', th: 0.05, name: '!!dei' });
        // Keile auf der Talseite der Hinterräder
        const keil = (pl, ax, r, nm) => {
          const c = vpt(pl, ax + r + 0.3, 0.17);
          s.img(wedge, { x: c[0] - 0.12, y: c[1] - 0.08, w: 0.24, h: 0.16, rotate: TD, transparency: t.keil ? 0 : 100, name: nm });
        };
        keil(pL, OL.axles[2], OL.r, '!!keil0');
        keil(pA, OA.axles[1], OA.r, '!!keil1');
        // Rollen: Pfeil parallel zum Hang direkt über der Fahrbahn, zwischen den Anhängerachsen (zeigt bergab)
        const r0 = onS(sR + 1.9, 0.14), r1 = onS(sR + 0.72, 0.14), rl = onS(sR + 1.45, -0.06);
        arrow(s, r0[0], r0[1], r1[0], r1[1], { col: C.red, th: 0.06, head: 0.2, name: 'roll', hide: !(t.roll && !t.keil) });
        s.text(t.roll && !t.keil ? 'rollt!' : '', { x: rl[0] - 0.6, y: rl[1], w: 1.2, h: 0.3, size: 14, bold: true, color: C.red, align: 'center', name: '!!rollt' });
        // Lkw-Status
        const bL = vpt(pL, OL.L / 2, 3.9);
        s.text(t.lk ? [{ text: 'Lkw: ', options: { color: C.mut } }, { text: 'Federspeicher hält', options: { bold: true, color: C.gr } }] : '', { x: bL[0] - 1.6, y: bL[1] - 0.34, w: 3.2, h: 0.32, size: 14, align: 'center', name: '!!stL' });
        // Anhänger-Status mit Luftdruck-Balken
        const bA = vpt(pA, OA.L / 2, 3.85);
        const AHS = [['', C.mut], ['hält mit Luft', C.bl], ['Luft entweicht …', C.am], ['Bremse gelöst', C.pu], ['Feststellbremse gezogen', C.gr]][t.ah];
        s.text(t.ah ? [{ text: 'Anhänger: ', options: { color: C.mut } }, { text: AHS[0], options: { bold: true, color: AHS[1] } }] : '', { x: Math.min(bA[0], 11.55) - 1.45, y: bA[1] - 0.6, w: 2.9, h: 0.3, size: 14, align: 'center', name: '!!stA' });
        const showBar = t.ah >= 1 && t.ah <= 3;
        s.rrect(bA[0] - 0.9, bA[1] - 0.22, 1.8, 0.13, { fill: '0B1119', line: '3C4656', rr: 0.3, ft: showBar ? 0 : 100, lt: showBar ? 0 : 100, name: '!!airb' });
        s.rrect(bA[0] - 0.9, bA[1] - 0.22, Math.max(0.04, 1.8 * t.air), 0.13, { fill: t.air > 0.5 ? C.bl : C.am, rr: 0.3, ft: showBar && t.air > 0 ? 0 : 100, name: '!!airf' });
        // Handbremsventil
        s.rrect(10.35, 1.5, 2.7, 1.75, { fill: '0E1520', line: '2A3B52', rr: 0.08, name: '!!hbv' });
        s.text('HANDBREMSVENTIL', { x: 10.5, y: 1.55, w: 2.4, h: 0.28, size: 12, bold: true, color: C.dim, cs: 2, name: '!!hbvt' });
        s.rrect(10.72, 1.92, 0.12, 1.2, { fill: '0B1119', line: '3C4656', rr: 0.5, name: '!!gate' });
        const LY = [1.9, 2.37, 2.84], LT = ['Fahren', 'Feststellen', 'Kontrolle (halten)'];
        LT.forEach((l, i) => s.text(l, { x: 11.05, y: LY[i], w: 1.95, h: 0.3, size: 13, bold: LEV[t.lev] === i, color: LEV[t.lev] === i ? (i === 2 ? C.pu : C.txt) : C.dim, valign: 'middle', name: '!!hl' + i }));
        const ky = LY[LEV[t.lev]] + 0.15;
        s.oval(10.62, ky - 0.16, 0.32, 0.32, { fill: t.lev === 'K' ? C.pu : t.lev === 'S' ? C.red : C.mut, line: C.txt, lw: 1, name: '!!knob' });
        s.img(hand, { x: 10.36, y: ky - 0.13, w: 0.26, h: 0.26, transparency: t.lev === 'K' ? 0 : 100, name: '!!hand' });
        // Meldung
        s.text(t.msg, { x: 5.7, y: 1.55, w: 4.45, h: 1.25, size: 15, bold: true, color: t.mc, valign: 'middle', name: '!!msg' });
      },
    });
  }
  await quiz(deck, 'ce3f', {
    kicker: 'Prüfungsfrage 2.7.06-321', q: 'Wie wirkt es sich bei einem Lastzug aus, wenn der Feststellbremshebel im Zugfahrzeug betätigt wird (nicht in Kontrollstellung)?', size: 28, osize: 18,
    opts: ['Das Zugfahrzeug wird mechanisch gebremst', 'Der Anhänger wird dabei üblicherweise nur mit Druckluft durch die Betriebsbremsanlage gebremst', 'Der Anhänger wird mechanisch gebremst'], ok: [0, 1],
    why: 'Lkw: Federspeicher, also mechanisch. Anhänger: meist nur Luft – und die kann entweichen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-321: A und B.\n➜ „Und was macht die Kontrollstellung?“',
  });
  await quiz(deck, 'ce3f', {
    kicker: 'Prüfungsfrage 2.7.06-320', q: 'Sie fahren einen Lkw mit Anhänger und durchgehender Druckluftbremsanlage. Welche Funktion übernimmt dabei die Kontrollstellung des Handbremsventils?', size: 26, osize: 18,
    opts: ['Das Zugfahrzeug wird über die Federspeicherbremse gebremst', 'Die Betriebsbremse des Anhängers wird gelöst', 'Die Betriebsbremse des Anhängers wird betätigt'], ok: [0, 1],
    why: 'In der Kontrollstellung hält nur der Lkw. So prüft ihr, ob er den ganzen Zug allein halten kann.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-320: A und B.\n➜ „Wie steil muss die Feststellbremse das schaffen?“',
  });
  await ask(deck, 'ce3f', {
    kicker: 'Feststellbremse', q: 'Wie steil? Was muss die Feststellbremse mindestens halten können?', ico: 'LuMountain', qsize: 32,
    answers: [
      ['LuTruck', 'Lkw hält den ganzen Zug', '12 % – nur mit seiner eigenen Feststellbremse.'],
      ['LuTruck', 'Ein Fahrzeug allein, beladen', '18 % – Lkw ohne Anhänger.'],
      ['LuCircleParking', 'Anhänger abgekuppelt, beladen', '18 % – mit seiner eigenen Feststellbremse.'],
    ],
    notes:
      '▶ Sagen: „Wie steil muss die Feststellbremse es mindestens schaffen? Ratet mal.“\n' +
      '❓ Je Zeile schätzen lassen, dann klicken.\n' +
      '🖱 Klick 1–3: je eine Zeile.\n' +
      '✅ UN-R 13 Anh. 4 Nr. 2.3.1 (Fahrzeug allein 18 %), Nr. 2.3.2 (Zugfahrzeug hält den Zug 12 %), Nr. 3.2.1 (Anhänger abgekuppelt 18 %) – für Lkw und ihre Anhänger gültig über § 41 Abs. 18 StVZO. Früher RL 71/320/EWG Anhang II Nr. 2.1.3.1, 2.1.3.2 und 2.2.2.1.\n' +
      '💡 Das sind Bauvorschriften – was die Bremse mindestens können muss. Keine Erlaubnis, bis zu welcher Steigung man abstellen darf: Keile gehören am Hang immer dazu. Zum Vergleich: 12 % heißt 12 m Höhe auf 100 m waagerecht. Das ist schon steil – viele Bergstraßen haben weniger.\n' +
      '➜ „Kapitel 5: Dauerbremse und Prüffristen.“',
  });
};
