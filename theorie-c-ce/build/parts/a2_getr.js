// Abend 2 · C3 Kapitel 3: Kupplung und Getriebe
const { C, base, kick, title, card, point, CLICK, quiz, steps, foot, sign, chapter } = require('../gs');
const { icon } = require('../lib');

module.exports = async (deck) => {
  await chapter(deck, 'c3g', { num: 3, ttl: 'Kupplung und Getriebe', sub: 'Schonend anfahren, 12 Gänge verstehen, die Automatik richtig bedienen.', ico: 'LuCog', notes:
    '▶ Sagen: „Kapitel 3: Kupplung und Getriebe. Fast alle neuen Lkw haben heute ein automatisiertes Getriebe – trotzdem müsst ihr wissen, was darin passiert.“\n🖱 Keine Klicks.\n➜ „Erst eine Prüfungsfrage zur Kupplung.“' });

  // ===== KUPPLUNG: PRÜFUNGSFRAGE =====
  quiz(deck, 'c3g', {
    kicker: 'Kupplung', q: 'Was erhöht den Verschleiß der Kupplung?', size: 34,
    opts: ['Anfahren in einem hohen Gang', 'Anfahren im kleinsten Gang', 'Rangieren mit erhöhter Motordrehzahl'], ok: [0, 2],
    why: 'Verschleiß entsteht durch Schleifen. Hoher Gang oder hohe Drehzahl beim Rangieren lassen die Kupplung lange schleifen (Prüfungsfrage 2.7.03-214).',
    notes: '▶ Sagen: „Hier können mehrere Antworten richtig sein – wie in der Prüfung.“\n❓ Abstimmen lassen.\n🖱 Klick 1: Antworten · Klick 2: Lösung (A und C).\n✅ A und C. Je länger die Kupplung schleift, desto mehr verschleißt sie.\n➜ „Wie schont ihr die Kupplung also?“',
  });

  // ===== KUPPLUNG SCHONEN =====
  {
    const s = base(deck, 'c3g', { notes:
      '▶ Sagen: „Die Kupplung ist ein Verschleißteil. Ein Wechsel kostet beim Lkw schnell mehrere tausend Euro und einen Tag Stillstand.“\n' +
      '🖱 Klick 1–4: je ein Tipp · Klick 5: Warnzeichen.\n' +
      '✅ Prüfungsfrage 2.7.03-215 „Wie können Sie die Kupplungsbauteile schonen?“: im kleinen Gang anfahren, nicht schleifen lassen, Fuß nicht auf dem Pedal lassen, beim Warten in den Leerlauf statt ausgekuppelt stehen. Amtliche Antworten: „Beim Warten Leerlauf einlegen und Fuß vom Kupplungspedal“ und „mit geringer Motordrehzahl rangieren“.\n' +
      '✅ Rutscht die Kupplung (Drehzahl steigt, Lkw wird nicht schneller) oder riecht es verbrannt: Werkstatt.\n' +
      '➜ „Jetzt zum Getriebe: Warum hat ein Lkw 12 Gänge?“' });
    kick(s, 'Kupplung'); title(s, 'So schont ihr die Kupplung');
    await point(s, 0.7, 2.05, 5.85, 1.15, 'LuArrowDown01', C.pu, 'Im kleinen Gang anfahren', '', CLICK, { size: 18 });
    await point(s, 6.78, 2.05, 5.85, 1.15, 'LuHand', C.pu, 'Nicht schleifen lassen', '', CLICK, { size: 18 });
    await point(s, 0.7, 3.4, 5.85, 1.15, 'LuFootprints', C.pu, 'Fuß weg vom Pedal', 'während der Fahrt', CLICK, { size: 18 });
    await point(s, 6.78, 3.4, 5.85, 1.15, 'LuCirclePause', C.pu, 'Beim Warten: Leerlauf', 'statt ausgekuppelt stehen', CLICK, { size: 18 });
    await point(s, 0.7, 4.85, 11.93, 1.4, 'LuTriangleAlert', C.red, 'Warnzeichen: Die Kupplung rutscht', '– der Motor dreht hoch, aber der Lkw wird nicht schneller. Oder es riecht verbrannt. → Werkstatt.', CLICK, { size: 18 });
  }

  // ===== 12 GÄNGE (Morph) =====
  const X0 = 5.9, AW = 7.0, BY = 2.75, BH = 1.0;
  const bw = AW / 12; // ein Gang im fertigen 12-Gang-Bild
  await steps(deck, 'c3g', {
    kicker: 'Getriebe', ttl: 'Warum 12 Gänge?',
    ask: { q: 'Warum hat ein Lkw so viele Gänge?', a: 'Kleine Sprünge – der Motor bleibt immer im grünen Bereich.', at: 3 },
    list: ['Grundgetriebe: 3 Gänge', 'Splitgruppe: × 2', 'Bereichsgruppe: × 2', 'Ergebnis: kleine Sprünge'],
    caps: [
      'Das Grundgetriebe hat nur wenige Gänge – hier 3. Die Sprünge dazwischen sind groß.',
      'Die Splitgruppe teilt jeden Gang in zwei Halbgänge. Aus 3 werden 6.',
      'Die Bereichsgruppe schaltet von „langsam“ auf „schnell“ um. Die 6 Gänge gibt es zweimal: 12.',
      'Kleine Gangsprünge halten den Motor immer im grünen Bereich – das spart Diesel. Meist schaltet die Automatik.',
    ],
    notes: [
      '▶ Sagen: „Ein Lkw der Klasse C wiegt bis zu 32 Tonnen, ein Lastzug bis zu 40. Damit der Motor immer im grünen Bereich bleibt, braucht er viele Gänge. Gebaut wird das aus drei Teilen. Teil 1: das Grundgetriebe, hier mit 3 Gängen.“\n➜ „Teil 2 …“',
      '▶ „… die Splitgruppe. Sie halbiert jeden Gangsprung. Aus 3 werden 6 Gänge.“\n➜ „Und Teil 3?“',
      '▶ „Die Bereichsgruppe – auch Rangegruppe. Sie schaltet zwischen langsamem und schnellem Bereich um. Die 6 Gänge gibt es also zweimal: 3 × 2 × 2 = 12.“\n✅ Aufbau z. B. bei 12-Gang-Getrieben von ZF; Lehrbuchwissen. Es gibt auch 16 Gänge (4 × 2 × 2), heute seltener. Leichte Lkw (z. B. 7,5 t) haben oft nur 6 bis 9 Gänge.\n➜ „Wozu der Aufwand?“',
      '▶ „Kleine Sprünge: Beim Hochschalten fällt die Drehzahl nur wenig. Der Motor bleibt im grünen Bereich.“\n❓ „Wer schaltet heute meistens?“\n✅ Das automatisierte Getriebe – die Technik dahinter bleibt gleich.\n➜ „Wie bedient man so eine Automatik?“',
    ],
    legend: 'Gänge über der Geschwindigkeit · Beispiel 12-Gang-Getriebe · schematisch',
    scene: async (s, i) => {
      // Achse
      s.lineS(X0, 4.35, X0 + AW + 0.1, 4.35, { color: C.dim, lw: 2, endArrow: 'triangle', name: '!!achse' });
      s.text('langsam', { x: X0, y: 4.45, w: 1.5, h: 0.35, size: 14, color: C.dim, name: '!!tl' });
      s.text('schnell', { x: X0 + AW - 1.4, y: 4.45, w: 1.5, h: 0.35, size: 14, color: C.dim, align: 'right', name: '!!ts' });
      s.text('Fahrgeschwindigkeit', { x: X0 + AW / 2 - 1.5, y: 4.45, w: 3, h: 0.35, size: 14, color: C.dim, align: 'center', name: '!!tf' });
      const n = i >= 2 ? 12 : 6;
      for (let g = 0; g < n; g++) {
        const hi = g >= 6;
        // Schritt 1: zwei Hälften liegen deckungsgleich als ein großer Block
        const x = X0 + (i === 0 ? (g - (g % 2)) * bw : g * bw);
        const w = i === 0 ? 2 * bw - 0.05 : bw - 0.05;
        s.rect(x, BY, w, BH, { fill: hi ? C.or : C.pu, name: '!!g' + g });
        if (i >= 1) s.text(String(g + 1), { x, y: BY, w: bw - 0.05, h: BH, size: 18, bold: true, color: C.dark, align: 'center', valign: 'middle', name: '!!n' + g });
      }
      if (i === 0) for (let k = 0; k < 3; k++) s.text(String(k + 1), { x: X0 + k * 2 * bw, y: BY, w: 2 * bw - 0.05, h: BH, size: 26, bold: true, color: C.dark, align: 'center', valign: 'middle', name: '!!n' + (k * 2) });
      // Klammern oben
      if (i >= 1) s.text(i === 1 ? 'Halbgänge durch die Splitgruppe' : 'Bereich „langsam“', { x: X0, y: BY - 0.5, w: 6 * bw, h: 0.4, size: 15, bold: true, color: C.pu, align: 'center', name: '!!kl' });
      if (i >= 2) s.text('Bereich „schnell“', { x: X0 + 6 * bw, y: BY - 0.5, w: 6 * bw, h: 0.4, size: 15, bold: true, color: C.or, align: 'center', name: '!!kr' });
      // Formel
      const f = ['3 Gänge', '3 × 2 = 6 Gänge', '3 × 2 × 2 = 12 Gänge', '3 × 2 × 2 = 12 Gänge'][i];
      s.text(f, { x: X0, y: 5.05, w: AW, h: 0.6, size: 28, bold: true, color: i >= 2 ? C.txt : C.mut, align: 'center', name: '!!formel' });
      if (i === 3) s.text('kleine Sprünge = Motor bleibt im grünen Bereich', { x: X0, y: 5.7, w: AW, h: 0.45, size: 17, bold: true, color: C.gr, align: 'center', name: '!!fazit' });
    },
  });

  // ===== AUTOMATISIERTES GETRIEBE BEDIENEN =====
  {
    const s = base(deck, 'c3g', { notes:
      '▶ Sagen: „Fast alle neuen schweren Lkw haben ein automatisiertes Schaltgetriebe. Es schaltet selbst – ihr wählt nur die Fahrstufe. Wo der Wählhebel sitzt, ist je nach Hersteller verschieden: am Lenkrad, als Drehknopf oder Tasten.“\n' +
      '🖱 Klick 1–5: je eine Fahrstufe oder Funktion.\n' +
      '✅ Herstellerangaben (z. B. Mercedes PowerShift, MAN TipMatic, Volvo I-Shift, ZF TraXon). Starten meist in N, je nach Hersteller mit getretener Bremse. Manuell: selbst schalten, z. B. vor Gefälle, bei Bergfahrt, Baustelle, Schnee. Rangiermodus: begrenzte Geschwindigkeit, sehr feinfühlig.\n' +
      '💡 Immer die Betriebsanleitung des Fahrzeugs lesen – die Bedienung ist nicht einheitlich.\n' +
      '➜ „Für schwere Arbeit gibt es noch eine besondere Kupplung: den Wandler.“' });
    kick(s, 'Automatisiertes Getriebe'); title(s, 'Ihr wählt – das Getriebe schaltet');
    const L = [['D', C.gr, 'Fahren vorwärts', 'Das Getriebe wählt den Gang selbst.'], ['N', C.mut, 'Neutral', 'Motor starten meist nur in N – je nach Lkw mit getretener Bremse.'], ['R', C.red, 'Rückwärts', 'im Stand einlegen.'], ['M', C.pu, 'Manuell', 'selbst schalten: vor dem Gefälle, am Berg, auf der Baustelle, bei Schnee.'], ['', C.or, 'Rangiermodus / Kriechgang', 'ganz langsam und feinfühlig – an der Rampe und beim Ankuppeln.']];
    for (let k = 0; k < 5; k++) {
      const y = 2.0 + k * 0.92;
      card(s, 0.7, y, 11.93, 0.8, { line: L[k][1] }, CLICK);
      if (k < 4) s.text(L[k][0], { x: 0.9, y: y + 0.1, w: 0.6, h: 0.6, size: 24, bold: true, color: C.dark, fill: L[k][1], shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.12, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 250 });
      else { s.rrect(0.9, y + 0.1, 0.6, 0.6, { fill: L[k][1], rr: 0.12 }, { fx: 'zoom', dur: 250 }); s.img(await icon('LuSnail', C.dark), { x: 1.0, y: y + 0.2, w: 0.4, h: 0.4 }, { fx: 'fade', dur: 150 }); }
      s.text([{ text: L[k][2] + '  ', options: { bold: true, color: C.txt } }, { text: L[k][3], options: { color: C.mut } }], { x: 1.75, y, w: 10.7, h: 0.8, size: 18, valign: 'middle' }, { fx: 'fade', dur: 200 });
    }
    foot(s, 'Bedienung je nach Hersteller verschieden – Betriebsanleitung beachten');
  }

  // ===== WANDLERSCHALTKUPPLUNG (Morph) =====
  await steps(deck, 'c3g', {
    kicker: 'Wandlerschaltkupplung', ttl: 'Anfahren über Öl',
    ask: { q: 'Warum verschleißt diese Kupplung beim Anfahren nicht?', a: 'Die Kraft geht über Öl im Wandler – ohne Reibung.', at: 1 },
    list: ['Anfahren: Wandler', 'Fahren: Kupplung zu', 'Wo man sie findet'],
    caps: [
      'Beim Anfahren überträgt Öl im Wandler die Kraft – ohne Reibung, ohne Verschleiß, sehr feinfühlig.',
      'Danach schließt eine Kupplung und überbrückt den Wandler – die Kraft geht direkt ins Getriebe.',
      'Bei schweren Fahrzeugen, die oft langsam anfahren und rangieren: Schwertransport, Baustelle, Feuerwehr.',
    ],
    notes: [
      '▶ Sagen: „Schwertransporter fahren mit 100 Tonnen und mehr an. Eine normale Kupplung würde dabei glühen. Darum gibt es die Wandlerschaltkupplung. Beim Anfahren arbeitet ein Wandler: Ein Rad pumpt Öl auf ein zweites Rad – die Kraft geht über das Öl.“\n➜ „Und wenn der Lkw rollt?“',
      '▶ „Dann schließt eine Kupplung und verbindet Motor und Getriebe direkt. Der Wandler ist überbrückt – kein Verlust mehr.“\n✅ Wandlerschaltkupplung = Drehmomentwandler + Überbrückungskupplung vor dem Getriebe (z. B. ZF TraXon Torque, Mercedes Turbo-Retarder-Kupplung).\n➜ „Wo findet ihr so etwas?“',
      '▶ „Schwertransport, Baustelle, Feuerwehr – überall, wo oft schwer und langsam angefahren wird.“\n💡 Vorteil: Anfahren und Rangieren ohne Kupplungsverschleiß.\n➜ „Zum Schluss des Kapitels: das Gefälle.“',
    ],
    legend: 'Schematisch',
    scene: async (s, i) => {
      const Y = 3.55;
      // Motor
      s.rrect(5.9, Y - 0.8, 1.6, 1.6, { fill: '2A1A1E', line: C.red, lw: 2, rr: 0.1, name: '!!mot' });
      s.text('Motor', { x: 5.9, y: Y - 0.8, w: 1.6, h: 1.6, size: 18, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!tmot' });
      // Gehäuse WSK: unten der Wandler, oben parallel dazu die Überbrückungskupplung
      s.rrect(7.8, Y - 1.25, 2.9, 2.5, { fill: '111B28', line: C.line, lw: 1.5, rr: 0.08, name: '!!geh' });
      const oil = i === 0, zu = i >= 1;
      const on = C.or, off = '55606F', LW = 5;
      const yu = Y - 0.75, yl = Y + 0.55;                        // oberer Weg (Kupplung), unterer Weg (Wandler)
      // Wandler: Pumpenrad + Turbinenrad + Öl
      s.oval(8.25, Y - 0.0, 0.8, 1.1, { fill: oil ? 'B97A3A' : '3C4656', line: oil ? C.or : '55606F', lw: 2, ft: oil ? 20 : 0, name: '!!pumpe', glow: oil ? 10 : undefined, glowColor: C.or });
      s.oval(8.85, Y - 0.0, 0.8, 1.1, { fill: oil ? 'B97A3A' : '3C4656', line: oil ? C.or : '55606F', lw: 2, ft: oil ? 35 : 0, name: '!!turb' });
      s.text('Wandler (Öl)', { x: 7.85, y: Y + 1.3, w: 2.2, h: 0.35, size: 14, bold: oil, color: oil ? C.or : C.mut, align: 'center', name: '!!twand' });
      // Überbrückungskupplung: zwei Scheiben, offen / zu
      const p2 = zu ? 9.04 : 9.24;
      s.rect(8.9, yu - 0.32, 0.12, 0.64, { fill: zu ? C.gr : '8A96A6', name: '!!sch1' });
      s.rect(p2, yu - 0.32, 0.12, 0.64, { fill: zu ? C.gr : '8A96A6', name: '!!sch2', glow: zu ? 8 : undefined, glowColor: C.gr });
      s.text(zu ? 'Kupplung zu' : 'Kupplung offen', { x: 8.05, y: Y - 1.65, w: 1.9, h: 0.35, size: 14, bold: zu, color: zu ? C.gr : C.mut, align: 'center', name: '!!tkup' });
      // Getriebe
      s.rrect(11.0, Y - 0.8, 1.7, 1.6, { fill: '1C2440', line: C.pu, lw: 2, rr: 0.1, name: '!!getr' });
      s.text('Getriebe', { x: 11.0, y: Y - 0.8, w: 1.7, h: 1.6, size: 17, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!tgetr' });
      // Kraftweg: Motor → (Wandler | Kupplung) → Getriebe
      s.lineS(7.5, Y, 7.95, Y, { color: on, lw: LW, name: '!!w1' });
      s.lineS(7.95, Y, 7.95, yl, { color: oil ? on : off, lw: LW, name: '!!wl1' });
      s.lineS(7.95, yl, 8.25, yl, { color: oil ? on : off, lw: LW, name: '!!wl2' });
      s.lineS(9.65, yl, 10.35, yl, { color: oil ? on : off, lw: LW, name: '!!wl3' });
      s.lineS(10.35, yl, 10.35, Y, { color: oil ? on : off, lw: LW, name: '!!wl4' });
      s.lineS(7.95, Y, 7.95, yu, { color: zu ? on : off, lw: LW, name: '!!wu1' });
      s.lineS(7.95, yu, 8.9, yu, { color: zu ? on : off, lw: LW, name: '!!wu2' });
      s.lineS(p2 + 0.12, yu, 10.35, yu, { color: zu ? on : off, lw: LW, name: '!!wu3' });
      s.lineS(10.35, yu, 10.35, Y, { color: zu ? on : off, lw: LW, name: '!!wu4' });
      s.lineS(10.35, Y, 11.0, Y, { color: on, lw: LW, name: '!!w2' });
      // Einsatz
      if (i === 2) {
        const E = [['LuContainer', 'Schwertransport'], ['LuHardHat', 'Baustelle'], ['LuSiren', 'Feuerwehr']];
        for (let k = 0; k < 3; k++) {
          const x = 5.85 + k * 2.35;
          s.rrect(x, 5.35, 2.25, 1.15, { fill: C.card2, line: C.pu, rr: 0.1, name: '!!e' + k });
          s.img(await icon(E[k][0], C.pu), { x: x + 0.15, y: 5.68, w: 0.5, h: 0.5, name: '!!ei' + k });
          s.text(E[k][1], { x: x + 0.72, y: 5.35, w: 1.48, h: 1.15, size: 14, bold: true, color: C.txt, valign: 'middle', name: '!!et' + k });
        }
      }
    },
  });

  // ===== GEFÄLLE =====
  {
    const s = base(deck, 'c3g', { notes:
      '▶ Sagen: „Vor euch dieses Zeichen: 10 % Gefälle, und euer Lkw ist voll beladen.“\n' +
      '❓ „Wann schaltet ihr zurück – oben oder unten am Berg?“\n' +
      '🖱 Klick 1–3: je eine Antwort.\n' +
      '✅ Vor dem Gefälle in einen kleineren Gang schalten. Dann wirken Motorbremse und Retarder stark, die Betriebsbremse bleibt kühl für den Notfall (Prüfungsfrage 2.7.01-257: rechtzeitig zurückschalten, Dauerbremse nutzen). Beim automatisierten Getriebe: Manuell-Modus oder Bergab-Funktion nach Betriebsanleitung.\n' +
      '💡 Mehr zu Dauerbremsen in der Bremsen-Lektion.\n' +
      '➜ „Kurzes Quiz zum Getriebe.“' });
    kick(s, 'Getriebe am Berg'); title(s, 'Langes Gefälle voraus – wann zurückschalten?', { w: 9.6, h: 1.4, size: 36 });
    await sign(s, '108_10', 10.9, 0.55, 1.75);
    await point(s, 0.7, 2.6, 11.93, 1.1, 'LuArrowDown01', C.pu, 'Vor dem Gefälle', 'in einen kleineren Gang schalten – unten am Berg ist es zu spät.', CLICK, { size: 19 });
    await point(s, 0.7, 3.9, 11.93, 1.1, 'LuGauge', C.or, 'Motorbremse und Retarder', 'halten das Tempo – sie wirken im kleinen Gang am stärksten.', CLICK, { size: 19 });
    await point(s, 0.7, 5.2, 11.93, 1.1, 'LuShieldCheck', C.gr, 'Betriebsbremse bleibt kühl', '– für den Notfall. Bei der Automatik: Manuell-Modus oder Bergab-Funktion.', CLICK, { size: 19 });
  }

  quiz(deck, 'c3g', {
    kicker: 'Quiz Getriebe', q: 'Wozu dient die Splitgruppe im Lkw-Getriebe?', size: 34,
    opts: ['Sie schaltet den Rückwärtsgang', 'Sie halbiert die Gangsprünge – der Motor bleibt im grünen Bereich', 'Sie verteilt die Kraft auf die Vorderachse'], ok: 1,
    why: 'Die Splitgruppe macht aus jedem Gang zwei Halbgänge. Die Bereichsgruppe verdoppelt die Gänge noch einmal: 3 × 2 × 2 = 12.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Lehrbuchwissen, Herstellerangaben.\n➜ „Weiter zu Kapitel 4: Differenzial und Achsen.“',
  });
};
