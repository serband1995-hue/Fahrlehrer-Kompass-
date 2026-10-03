// Abend 6 · CE2: Lernziele, Kapitel 1 Der Anhänger bremst selbst, Kapitel 2 Auflaufbremse (Foto, fließend mit Abreißseil)
const { C, sec, base, kick, title, card, CLICK, chapter, motion, ask, photoAsk, quiz, lkw, anhaenger, seg, arrow } = require('../gs');

sec('ce2', 'LEKTION CE2', C.or, 'bg_kap.jpg');
sec('ce2r', 'CE2  ·  DER ANHÄNGER BREMST SELBST', C.bl, 'bg_blue.jpg');
sec('ce2a', 'CE2  ·  AUFLAUFBREMSE', C.or, 'bg_or.jpg');

module.exports = async (deck) => {
  // ===== LERNZIELE CE2 =====
  {
    const s = base(deck, 'ce2', { transition: 'black', notes:
      '▶ Sagen: „Willkommen zurück. In CE2 geht es um die Bremse am Zug. Ein Anhänger mit 18 Tonnen muss selbst bremsen – und zwar so, dass der Zug gestreckt bleibt. Wir schauen uns zwei Bremsen an: die Auflaufbremse und die Zweileitungs-Druckluftbremse. Und: Was passiert, wenn eine Leitung reißt?“\n' +
      '🖱 Klick 1–5: je ein Kapitel.\n' +
      '💡 Zeiten sind Richtwerte für 90 Minuten. Feststellbremse mit Kontrollstellung, ABS/EBS und Dauerbremse kommen in CE3 (Abend 7).\n' +
      '➜ „Kapitel 1: Warum braucht der Anhänger eine eigene Bremse?“' });
    kick(s, 'Lektion CE2 · Lastzugbremsen'); title(s, 'Das lernt ihr in CE2');
    const T = [['01', 'Der Anhänger bremst selbst', 'Was das Gesetz verlangt · welche Bremsen es gibt', '10 Min', C.bl], ['02', 'Auflaufbremse', 'Wann sie bremst · Abreißseil · bis 3,5 t', '20 Min', C.or], ['03', 'Zweileitungs-Druckluftbremse', 'Rot = Vorrat, gelb = Bremse · die Ventile · Funktionsprobe', '25 Min', C.gr], ['04', 'Wenn eine Leitung reißt', 'Rot reißt · gelb reißt · was dann bremst', '20 Min', C.red], ['05', 'Anhänger rangieren', 'Roter und schwarzer Knopf · Löseventil', '10 Min', C.pu]];
    for (let i = 0; i < 5; i++) {
      const y = 2.0 + i * 0.9;
      card(s, 0.7, y, 11.93, 0.78, { line: T[i][4] }, CLICK);
      s.text(T[i][0], { x: 0.9, y, w: 1.0, h: 0.78, size: 28, bold: true, color: T[i][4], valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text([{ text: T[i][1] + '  ', options: { bold: true, color: C.txt } }, { text: T[i][2], options: { color: C.mut, fontSize: 15 } }], { x: 2.0, y, w: 8.6, h: 0.78, size: 20, valign: 'middle' }, { fx: 'fade', dur: 200 });
      s.text(T[i][3], { x: 10.8, y, w: 1.6, h: 0.78, size: 18, bold: true, color: T[i][4], align: 'right', valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    s.text('+ 5 Min Abschluss: Quiz und „Das nimmst du mit“', { x: 0.7, y: 6.55, w: 11.93, h: 0.35, size: 14, italic: true, color: C.dim });
  }

  // ===== KAPITEL 1: DER ANHÄNGER BREMST SELBST =====
  await chapter(deck, 'ce2r', { num: 1, ttl: 'Der Anhänger bremst selbst', sub: 'Ein voller Anhänger wiegt so viel wie ein Lkw. Der Lkw allein kann ihn nicht mitbremsen.', ico: 'LuDisc', notes:
    '▶ Sagen: „Stellt euch vor, nur der Lkw bremst – und hinten schieben 18 Tonnen nach. Der Zug knickt ein. Darum muss der Anhänger selbst bremsen.“\n✅ § 41 Abs. 9 StVZO.\n🖱 Keine Klicks.\n➜ „Was verlangt das Gesetz?“' });
  await ask(deck, 'ce2r', {
    kicker: 'Was das Gesetz verlangt', q: 'Was muss die Bremse eines großen Anhängers können?', ico: 'LuDisc', qsize: 34,
    answers: [
      ['LuDisc', 'Eine eigene Bremse', 'Anhänger mit zwei oder mehr Achsen brauchen eine eigene Bremse – hinter schnellen Lkw auf alle Räder.', C.bl, 17],
      ['LuFootprints', 'Ein Pedal für beide', 'Lkw und Anhänger bremsen zusammen – mit einer Betätigung vom Fahrersitz aus.', C.bl, 17],
      ['LuUnlink', 'Selbst bremsen beim Abreißen', 'Löst sich der Anhänger, muss er von allein zum Stehen kommen.', C.red, 17],
      ['LuMountain', 'Am Berg stehen bleiben', 'Feststellbremse: Der volle Anhänger muss auf 18 % Steigung halten – rein mechanisch.', C.bl, 17],
    ],
    notes:
      '▶ Sagen: „Was muss die Bremse eines großen Anhängers können? Sammelt mal.“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je eine Anforderung.\n' +
      '✅ § 41 Abs. 9 StVZO: Zwei- und mehrachsige Anhänger brauchen eine eigene Bremsanlage; Betriebsbremse von Zug und Anhänger mit einer Betätigung abstufbar (oder selbsttätig wie die Auflaufbremse); trennt sich der Anhänger, muss er selbsttätig zum Stehen kommen; Feststellbremse hält den beladenen Anhänger rein mechanisch auf 18 %; hinter Kfz über 25 km/h Bremse auf alle Räder. Mittlere Vollverzögerung mindestens 5,0 m/s² (Sattelanhänger 4,5 m/s²).\n' +
      '➜ „Welche Bremsen gibt es dafür?“',
  });
  await ask(deck, 'ce2r', {
    kicker: 'Zwei Bremsen', q: 'Welche Bremse hat welcher Anhänger?', ico: 'LuCog', qsize: 34,
    answers: [
      ['LuMoveHorizontal', 'Auflaufbremse', 'Mechanisch: Der Anhänger bremst sich selbst, wenn er aufläuft. Nur bei kleinen Anhängern – auf der Straße höchstens 3,5 t.', C.or, 17],
      ['LuWind', 'Zweileitungs-Druckluftbremse', 'Mit Luft vom Lkw, gesteuert vom Bremspedal. Standard bei Lkw-Anhängern und Sattelaufliegern.', C.gr, 17],
      ['LuScale', 'Durchgehende Bremse = mehr Anhängelast', 'Mit Druckluftbremse darf der Anhänger bis zum 1,5-Fachen des Lkw wiegen.', C.bl, 17],
    ],
    notes:
      '▶ Sagen: „Zwei Bremsen gibt es am Anhänger. Die Auflaufbremse kennt ihr vom Pkw-Anhänger. Und die Druckluftbremse – die hat fast jeder Lkw-Anhänger.“\n' +
      '🖱 Klick 1–3: je eine Karte.\n' +
      '✅ § 41 Abs. 10 StVZO: Auflaufbremse nur bis 3,5 t (bei Anhängern über 40 km/h; bis 8 t nur bei langsamen Anhängern bis 25 bzw. 40 km/h), nie beim Sattelanhänger. RL 71/320/EWG Anhang I Nr. 1.9: „durchgehende Bremsung“ = eine Betätigung, eine Energiequelle, abgestimmte Bremsung von Zug und Anhänger. § 42 Abs. 1 StVZO: mit durchgehender Bremse Anhängelast bis 1,5 × zGM des Lkw (Prüfungsfrage 2.6.03-303).\n' +
      '➜ „Kapitel 2: die Auflaufbremse.“',
  });

  // ===== KAPITEL 2: AUFLAUFBREMSE =====
  await chapter(deck, 'ce2a', { num: 2, ttl: 'Die Auflaufbremse', sub: 'Der Anhänger bremst sich selbst – wenn er auf den Lkw aufläuft.', ico: 'LuMoveHorizontal', notes:
    '▶ Sagen: „Die Auflaufbremse braucht keine Leitung und keine Luft. Sie nutzt den Schub des Anhängers.“\n🖱 Keine Klicks.\n➜ „Schaut euch diese Deichsel an.“' });
  await photoAsk(deck, 'ce2a', {
    bg: 'l_auflauf_r.jpg', bgX: 5.4, ov: 6.6, kicker: 'Anhänger mit Auflaufbremse', q: 'Was seht ihr an dieser Deichsel?', qsize: 30, w: 4.6, asize: 15,
    answers: [
      ['LuMoveHorizontal', 'Auflaufeinrichtung', 'unter dem Faltenbalg – schiebt sich beim Bremsen zusammen.', C.or],
      ['LuHand', 'Handbremshebel', 'die Feststellbremse des Anhängers.', C.or],
      ['LuCable', 'Abreißseil', 'reißt der Anhänger ab, zieht es die Bremse an.', C.red],
      ['LuArrowUpToLine', 'Stützrad', 'nach dem Ankuppeln ganz nach oben.', C.or],
    ],
    notes:
      '▶ Sagen: „Ein Anhänger mit Auflaufbremse. Was seht ihr?“\n' +
      '❓ Sammeln lassen, dann je Klick auflösen.\n' +
      '🖱 Klick 1–4: je ein Teil.\n' +
      '✅ Auflaufeinrichtung, Handbremshebel, Abreißseil: Lehrbuchwissen; RL 71/320/EWG Anhang I Nr. 1.12 (Auflaufbremsung) und Nr. 2.2.2.9 (selbsttätige Bremsung beim Abreißen; Ausnahme einachsige Anhänger bis 1,5 t mit Sicherungsverbindung). Prüfungsfrage 2.7.01-121: nach dem Ankuppeln Bremse prüfen, Stützrad in die oberste Stellung, Abreißseil an der Anhängekupplung des Zugfahrzeugs einhängen.\n' +
      '💡 Das Bild zeigt einen Kugelkopf. Am Lkw hängt so ein Anhänger meist mit Zugöse am Bolzen.\n' +
      '➜ „Und wie bremst das Ding?“',
  });

  // Auflaufbremse: Nahansicht Lkw-Heck, Deichsel, Anhängerfront
  {
    const fr = (t, o = {}) => ({ ...o, t });
    await motion(deck, 'ce2a', {
      kicker: 'Auflaufbremse', ttl: 'So bremst sie', dur: 520, holdDur: 800,
      question: 'Wann bremst ein Anhänger mit Auflaufbremse?',
      answer: 'Erst wenn er auf den Lkw aufläuft – also einen Moment nach dem Lkw. Nicht gleichzeitig mit dem Pedal.',
      legend: 'Seitenansicht · Ausschnitt · schematisch · Hub vergrößert',
      frames: [
        fr({ dx: 0, comp: 0, lkwB: 0, trB: 0, pull: 1 }, { hold: true, cap: 'Beim Fahren zieht der Lkw. Die Auflaufeinrichtung ist auseinandergezogen – die Bremse am Anhänger ist frei.',
          note: '▶ Sagen: „Beim Fahren zieht der Lkw den Anhänger. Die Auflaufeinrichtung in der Deichsel ist ausgezogen. Am Anhänger bremst nichts.“\n❓ Frage auf der Folie stellen.\n✅ Funktion der Auflaufbremse: Lehrbuchwissen (RL 71/320/EWG Anhang I Nr. 1.12: Bremsung durch das Auflaufen des Anhängers auf das Zugfahrzeug).\n🖱 Klick: Der Lkw bremst (läuft von selbst weiter).\n➜ „Jetzt bremst der Lkw.“' }),
        fr({ dx: 0, comp: 0, lkwB: 1, trB: 0 }),
        fr({ dx: 0, comp: 1, lkwB: 1, trB: 1 }, { hold: true, answer: true, cap: 'Der Lkw bremst, der Anhänger schiebt nach: Er läuft auf. Die Deichsel schiebt sich zusammen und zieht über das Gestänge die Radbremsen an.',
          note: '▶ „Der Lkw bremst. Der Anhänger will weiter – er schiebt nach, er läuft auf. Dabei schiebt sich die Auflaufeinrichtung zusammen. Das Gestänge zieht die Radbremsen an. Darum bremst der Anhänger immer einen Moment später als der Lkw.“\n❓ Frage auf der Folie auflösen.\n✅ Prüfungsfrage 2.7.06-105: Bremswirkung beim Auflaufen des Anhängers auf das Zugfahrzeug (falsch: zeitgleich mit dem Pedal; vor dem Zugfahrzeug).\n🖱 Klick: Die Verbindung reißt ab.\n➜ „Und wenn der Anhänger abreißt?“' }),
        fr({ dx: -1.1, comp: 0, lkwB: 0, trB: 1, torn: 1 }, { hold: true, cap: 'Reißt die Verbindung, spannt sich das Abreißseil. Es zieht die Handbremse an – der Anhänger bremst von selbst.',
          note: '▶ „Und wenn die Kupplung abreißt? Dann spannt sich das Abreißseil. Es zieht die Handbremse an, und der Anhänger bremst von selbst. Darum: Seil immer am Lkw einhängen – nicht an der Kupplung des Anhängers selbst!“\n✅ § 41 Abs. 9 StVZO: Trennt sich der Anhänger, muss er selbsttätig zum Stehen kommen. RL 71/320/EWG Anhang I Nr. 2.2.2.9. Prüfungsfrage 2.7.01-121: Abreißseil an der Anhängekupplung des Motorwagens einhängen.\n🖱 Klick: rückwärts.\n➜ „Und beim Rückwärtsfahren?“' }),
        fr({ dx: 0.25, comp: 1, lkwB: 0, trB: 1, back: 1 }, { hold: true, cap: 'Rückwärts schiebt der Lkw – der Anhänger läuft auch auf. Die meisten Bremsen haben eine Rückfahrautomatik. Bei manchen sperrt man die Bremse von Hand.',
          note: '▶ „Beim Rückwärtsfahren drückt der Lkw den Anhänger. Auch dann schiebt sich die Deichsel zusammen – die Bremse würde bremsen. Moderne Auflaufbremsen haben eine Rückfahrautomatik. Bei manchen Anhängern muss man die Auflaufbremse vorher von Hand sperren.“\n✅ Prüfungsfrage 2.7.06-109: Bei manchen Anhängern muss die Auflaufbremse manuell gesperrt werden, damit man rückwärtsfahren kann. Rückfahrautomatik: Lehrbuchwissen.\n🖱 Nächster Klick: nächste Folie.\n➜ „Eine Prüfungsfrage.“' }),
      ],
      scene: async (s, t) => {
        const G = 5.0, H = 4.15, comp = t.comp ? 0.22 : 0, push = t.back ? 0.15 : 0;
        const LR = t.torn ? 6.3 : 6.9 + push;                  // Heck des Lkw
        const E = 7.02 + push - (t.torn ? comp : 0);            // Zugöse (hängt am Bolzen des Lkw)
        const HF = 7.77 + push - comp, HW = 0.9, TX = HF + HW + 0.93;
        s.rect(5.75, G, 7.3, 0.03, { fill: '3C4656', name: '!!boden' });
        // Lkw-Heck (Ausschnitt)
        s.rect(5.75, 2.2, LR - 5.75, 1.55, { fill: 'C9D0DA', line: '97A1AE', lw: 1, name: '!!lkb' });
        s.rect(LR - 0.06, 2.2, 0.06, 1.55, { fill: '9AA4B1', name: '!!lkt' });
        s.rect(5.75, 3.75, LR - 5.75, 0.15, { fill: '3A4250', name: '!!lkr' });
        const wx = LR - 0.8, wv = wx > 6.0 ? 0 : 100;
        s.oval(wx - 0.55, G - 1.1, 1.1, 1.1, { fill: '14181E', ft: wv, name: '!!lkw1' });
        s.oval(wx - 0.32, G - 0.87, 0.64, 0.64, { fill: 'A7B1BE', ft: wv, name: '!!lkw2' });
        s.rect(LR - 0.2, 3.9, 0.14, H - 3.9 + 0.12, { fill: '2E343D', name: '!!lkh' });
        s.rect(LR - 0.16, 3.42, 0.12, 0.16, { fill: C.red, ft: t.lkwB ? 0 : 100, glow: t.lkwB ? 12 : undefined, glowColor: C.red, name: '!!bl' });
        s.text(t.lkwB ? 'Lkw bremst' : (t.torn ? 'Lkw fährt weiter' : 'Lkw'), { x: 5.8, y: G + 0.1, w: 1.8, h: 0.32, size: 14, bold: true, color: t.lkwB ? C.red : C.mut, name: '!!lb' });
        // Anhänger-Front (Pritsche, Tandemachse)
        s.rect(TX, 3.3, 13.05 - TX, 0.5, { fill: '8C96A4', line: '6E7886', lw: 1, name: '!!ahb' });
        s.rect(TX, 3.8, 13.05 - TX, 0.14, { fill: '3A4250', name: '!!ahr' });
        [TX + 1.6, TX + 2.55].forEach((ax, k) => {
          s.oval(ax - 0.45, G - 0.9, 0.9, 0.9, { fill: '14181E', name: '!!aw' + k });
          s.oval(ax - 0.26, G - 0.71, 0.52, 0.52, { fill: 'A7B1BE', name: '!!awh' + k });
          s.oval(ax - 0.56, G - 1.01, 1.12, 1.12, { line: C.red, lw: 3.5, fill: C.red, ft: 100, lt: t.trB ? 0 : 100, name: '!!rb' + k });
        });
        // Deichsel: Zugöse, Zugrohr, Faltenbalg, Gehäuse, Deichselrahmen
        s.oval(E - 0.13, H - 0.13, 0.26, 0.26, { fill: 'C9D0DA', line: '7D8898', lw: 1.5, name: '!!kopf' });
        seg(s, E, H, HF, H, { col: 'C9D0DA', th: 0.1, name: '!!rohr' });
        s.rrect(E + 0.18, H - 0.17, Math.max(0.05, HF - E - 0.18), 0.34, { fill: '1A1F27', line: '3A4250', lw: 1, rr: 0.3, name: '!!balg' });
        s.rrect(HF, H - 0.2, HW, 0.4, { fill: '9AA6B5', line: '7D8898', lw: 1, rr: 0.15, name: '!!geh' });
        seg(s, HF + HW - 0.1, H, TX + 0.1, 3.87, { col: '7D8898', th: 0.16, name: '!!dei' });
        // Gestänge zur Radbremse
        seg(s, HF + HW - 0.15, H + 0.16, TX + 1.6, G - 0.45, { col: t.trB ? C.or : '5E6876', th: 0.06, name: '!!gest' });
        // Handbremshebel und Abreißseil
        const pv = [HF + 0.45, H - 0.2], lt = t.torn ? [HF - 0.05, H - 0.8] : [HF + 0.75, H - 0.82];
        seg(s, pv[0], pv[1], lt[0], lt[1], { col: 'B3BBC6', th: 0.1, name: '!!hebel' });
        s.oval(lt[0] - 0.08, lt[1] - 0.08, 0.16, 0.16, { fill: '1A1F27', line: 'B3BBC6', lw: 1, name: '!!griff' });
        const lh = [LR - 0.13, H + 0.18];
        const mid = t.torn ? [(lt[0] + lh[0]) / 2, (lt[1] + lh[1]) / 2] : [(lt[0] + lh[0]) / 2 - 0.1, H + 0.68];
        seg(s, lt[0], lt[1], mid[0], mid[1], { col: C.am, th: 0.04, name: '!!seil1' });
        seg(s, mid[0], mid[1], lh[0], lh[1], { col: C.am, th: 0.04, name: '!!seil2' });
        // Beschriftungen
        s.text(t.torn ? 'Verbindung gerissen!' : t.comp ? 'Auflaufeinrichtung schiebt sich zusammen' : 'Auflaufeinrichtung ausgezogen', { x: 7.2, y: 2.55, w: 4.2, h: 0.34, size: 15, bold: true, color: t.torn ? C.red : t.comp ? C.or : C.mut, name: '!!dt' });
        seg(s, (E + HF) / 2 + 0.1, 2.92, (E + HF) / 2 + 0.1, H - 0.22, { col: t.comp ? C.or : '4A5668', th: 0.025, hide: !!t.torn, name: '!!dtl' });
        s.text(t.torn ? 'Seil zieht die Handbremse an' : 'Handbremshebel', { x: lt[0] + 0.12, y: lt[1] - 0.36, w: 3.0, h: 0.3, size: 13, bold: !!t.torn, color: t.torn ? C.am : C.mut, name: '!!ht' });
        s.text('Abreißseil', { x: mid[0] - 0.6, y: Math.max(mid[1], H + 0.2) + 0.12, w: 1.4, h: 0.28, size: 12, color: C.am, align: 'center', name: '!!st' });
        s.text(t.trB ? 'Radbremsen ziehen an' : 'Radbremsen frei', { x: TX + 0.6, y: G + 0.1, w: 3.0, h: 0.32, size: 14, bold: true, color: t.trB ? C.red : C.mut, align: 'center', name: '!!tb' });
        s.text('Gestänge', { x: TX + 0.25, y: G - 0.38, w: 1.0, h: 0.26, size: 11, color: t.trB ? C.or : C.dim, name: '!!gt' });
        // Fahrtrichtung bzw. Schub
        const ay = 1.95;
        arrow(s, t.back ? 8.6 : 9.8, ay, t.back ? 9.8 : 8.6, ay, { col: t.back ? C.am : C.mut, th: 0.08, head: 0.24, name: 'fr' });
        s.text(t.back ? 'rückwärts: Lkw drückt' : (t.comp && !t.torn ? 'Anhänger schiebt nach' : 'Fahrtrichtung'), { x: 10.0, y: ay - 0.18, w: 3.0, h: 0.36, size: 14, bold: true, color: t.back ? C.am : (t.comp && !t.torn ? C.or : C.mut), valign: 'middle', name: '!!frt' });
      },
    });
  }
  await quiz(deck, 'ce2a', {
    kicker: 'Prüfungsfrage 2.7.06-105', q: 'Wann tritt bei einem Anhänger mit Auflaufbremse die Bremswirkung ein?', size: 32,
    opts: ['Beim Auflaufen des Anhängers auf das Zugfahrzeug', 'Zeitgleich mit der Betätigung des Bremspedals im Zugfahrzeug', 'Vor Eintreten der Bremswirkung beim Zugfahrzeug, damit der Zug gestreckt bleibt'], ok: [0],
    why: 'Erst wenn der Anhänger aufläuft. Darum bremst er immer einen Moment später als der Lkw.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-105: A.\n➜ „Darf euer Lkw so einen Anhänger ziehen?“',
  });
  await ask(deck, 'ce2a', {
    kicker: 'Auflaufbremse am Lkw', q: 'Euer 12-t-Lkw soll einen 3,5-t-Tandem mit Auflaufbremse ziehen. Geht das?', ico: 'LuTruck', qsize: 30,
    answers: [
      ['LuScale', 'Ja – bis 3,5 t', 'Ein Straßenanhänger mit Auflaufbremse darf höchstens 3,5 t haben.', C.or, 17],
      ['LuBan', 'Nie am Sattelauflieger', 'Und im Zug immer nur ein Anhänger mit Auflaufbremse.', C.or, 17],
      ['LuIdCard', 'Klasse CE', 'Lkw der Klasse C mit Anhänger über 750 kg: CE – auch für den kleinen Tandem.', C.red, 17],
      ['LuCable', 'Vor der Fahrt', 'Kupplung zu, Licht geht, Stützrad oben, Abreißseil am Lkw eingehängt.', C.or, 17],
    ],
    notes:
      '▶ Sagen: „Euer 12-Tonnen-Lkw soll einen 3,5-Tonnen-Tandemanhänger mit Auflaufbremse ziehen. Geht das? Was müsst ihr beachten?“\n' +
      '❓ Sammeln lassen, dann je Klick eine Karte.\n' +
      '🖱 Klick 1–4: je ein Punkt.\n' +
      '✅ § 41 Abs. 10 StVZO: Auflaufbremse bis 3,5 t (Anhänger über 40 km/h), nie beim Sattelanhänger; in einem Zug nur ein Anhänger mit Auflaufbremse. § 42 Abs. 1 StVZO: Anhängelast höchstens zGM des Lkw (ohne durchgehende Bremse). § 6 Abs. 1 FeV: C-Lkw + Anhänger über 750 kg = CE. Prüfungsfrage 2.7.01-121: Bremse prüfen, Stützrad oben, Abreißseil einhängen.\n' +
      '➜ „Noch eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce2a', {
    kicker: 'Prüfungsfrage 2.7.06-109', q: 'Sie nutzen einen Anhänger mit Auflaufbremse. Was müssen Sie beachten? Bei manchen Anhängern muss die Funktion der Auflaufbremse manuell gesperrt werden, damit man …', size: 26,
    opts: ['… rückwärtsfahren kann', '… vorwärtsfahren kann', '… ankuppeln kann'], ok: [0],
    why: 'Rückwärts läuft der Anhänger auf – ohne Rückfahrautomatik würde er bremsen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-109: A.\n➜ „Kapitel 3: die Druckluftbremse am Zug.“',
  });
};
