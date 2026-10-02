// Teil B1: Ausweichen (Engstelle, Wild), Blaulicht § 38, Rettungsgasse § 11 Abs. 2 – kommt hinter „Vorbeifahren § 6“
const { C, base, kick, title, card, quiz, veh, point } = require('./gs');
const { W, H, icon } = require('./lib');
const mv = (dx, dy) => `M 0 0 L ${(dx / W).toFixed(4)} ${(dy / H).toFixed(4)} E`;

module.exports = async (deck) => {
  // ===== AUSWEICHEN: ENGSTELLE OHNE SCHILD =====
  {
    const s = base(deck, 'wei', { bg: 'f_engstelle.jpg', ov: 9.5, notes:
      '▶ Sagen: „Schaut euch die Straße an: links und rechts geparkt, in der Mitte ein Auto mit Licht. Ihr kommt von vorn. Wer lässt wen durch?“\n' +
      '❓ „Wo ist hier das Hindernis – auf eurer Seite oder auf seiner?“\n' +
      '✅ Auf beiden Seiten. Dann hilft § 6 nicht weiter. Es gilt: weit rechts halten (§ 2 Abs. 2), langsam, Rücksicht (§ 1) und verständigen (§ 11 Abs. 3). Wer eine Lücke neben sich hat, fährt hinein und lässt durch.\n' +
      '🖱 Klick 1: Hindernis auf deiner Seite · Klick 2: Schilder 208/308 · Klick 3: keine Regel passt · Klick 4: Mythos „bergab weicht aus“.\n' +
      '💡 Bergregel: In Deutschland gibt es keine Vorschrift, wer am Berg ausweicht. Dass der Bergabfahrende ausweicht, ist nur ein Brauch (in der Schweiz ist es geregelt). In der Prüfung zählt: verständigen.\n' +
      '➜ „Ausweichen ist manchmal aber genau falsch. Zum Beispiel nachts im Wald …“' });
    kick(s, 'Ausweichen · §§ 1, 2, 6, 11');
    title(s, 'Beide Seiten zugeparkt.\nWer lässt wen durch?', { w: 8, h: 1.5, size: 38 });
    await point(s, 0.7, 2.75, 7.9, 0.9, 'LuBan', C.red, 'Hindernis auf deiner Seite?', 'Dann wartest du (§ 6).');
    await point(s, 0.7, 3.8, 7.9, 0.9, 'LuSignpost', C.bl, 'Zeichen 208:', 'du wartest.  Zeichen 308: du darfst zuerst.');
    await point(s, 0.7, 4.85, 7.9, 1.1, 'LuHand', C.gr, 'Keine Regel passt?', 'Weit rechts, langsam, verständigen. Wer eine Lücke hat, fährt rein und lässt durch.');
    s.text([{ text: 'Mythos: „Bergab muss ausweichen.“  ', options: { bold: true, color: C.or } }, { text: 'Kein Gesetz in Deutschland – nur ein Brauch.', options: { color: C.txt } }],
      { x: 0.7, y: 6.15, w: 7.9, h: 0.6, size: 16, fill: C.card2, line: C.or, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, valign: 'middle', margin: [10, 10, 10, 10] }, { fx: 'rise', c: true, dur: 400 });
  }
  // ===== WILD =====
  {
    const s = base(deck, 'wei', { bg: 'f_wild.jpg', ov: 9.5, notes:
      '▶ Sagen: „Landstraße, nachts, Wald. Plötzlich steht ein Reh im Licht. Was macht ihr – der Reihe nach?“\n' +
      '❓ Erst sammeln, dann klicken.\n' +
      '🖱 Klick 1–4: Abblenden · Hupen · Bremsen · Aufprall unvermeidbar. Klick 5: Was danach kommt.\n' +
      '✅ Fernlicht aus (geblendete Tiere bleiben stehen), hupen, stark bremsen. Ist der Zusammenstoß nicht zu vermeiden: Lenkrad festhalten, voll bremsen, nicht ausweichen – ein Baum oder der Gegenverkehr ist viel gefährlicher als das Tier (ADAC).\n' +
      '💡 Wo ein Tier ist, kommen oft weitere. Zeichen 142 (Wildwechsel, rechts im Bild) heißt: langsamer und bremsbereit, besonders in der Dämmerung.\n' +
      '✅ Nach dem Unfall: Warnblinker, Warnweste, Warndreieck, Polizei (110) rufen. Das Tier nicht anfassen – es kann noch leben und sich wehren. Bescheinigung für die Versicherung geben lassen.\n' +
      '➜ „Kleine Testfrage dazu.“' });
    kick(s, 'Ausweichen? Nicht bei Wild');
    title(s, 'Reh im Licht – was jetzt?', { w: 8.5, size: 38 });
    const T = [['LuSun', 'Abblenden', 'Fernlicht aus. Geblendete Tiere bleiben stehen.'], ['LuMegaphone', 'Hupen', 'Das Tier soll flüchten.'], ['LuGauge', 'Stark bremsen', 'So viel Tempo abbauen wie möglich.'], ['LuTriangleAlert', 'Aufprall unvermeidbar?', 'Lenkrad festhalten, voll bremsen, nicht ausweichen.']];
    for (let i = 0; i < 4; i++) await point(s, 0.7, 2.0 + i * 0.98, 7.9, 0.84, T[i][0], i === 3 ? C.red : C.gr, T[i][1], T[i][2]);
    s.text([{ text: 'Danach:  ', options: { bold: true, color: C.or } }, { text: 'Warnblinker · Warnweste · Warndreieck · Polizei 110 · Tier nicht anfassen', options: { color: C.txt } }],
      { x: 0.7, y: 6.0, w: 7.9, h: 0.65, size: 16, fill: C.card2, line: C.or, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, valign: 'middle', margin: [10, 10, 10, 10] }, { fx: 'rise', c: true, dur: 400 });
  }
  quiz(deck, 'wei', {
    kicker: 'Frage · Kleintier', q: 'Ein Hase springt vor dir auf die Landstraße. Gegenverkehr kommt. Was tust du?',
    opts: ['Kurz nach links ausweichen', 'Bremsen, soweit der Hintermann es zulässt – Lenkrad gerade', 'Gas geben, damit es schnell vorbei ist'], ok: 1,
    why: 'Ausweichen bei kleinen Tieren ist gefährlicher als der Aufprall: Gegenverkehr, Graben, Baum. Stark bremsen ohne zwingenden Grund ist verboten (§ 4 Abs. 1) – achte auf den Hintermann.',
    notes: '▶ Frage vorlesen, Hände heben lassen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Bei Kleintieren nie riskant ausweichen. Bremsen nur so stark, wie es der Hintermann zulässt – ein starkes Bremsen ohne zwingenden Grund ist verboten (§ 4 Abs. 1 StVO). Lieber den Aufprall in Kauf nehmen als einen Auffahrunfall auslösen.\n💡 Gleiche Frage gibt es in der Prüfung mit Fuchs oder Katze.\n➜ „Und jetzt kommt jemand, für den ihr sofort Platz machen müsst.“',
  });
  // ===== BLAULICHT + RETTUNGSGASSE (Foto) =====
  {
    const s = base(deck, 'wei', { bg: 'f_rettungsgasse.jpg', ov: 9.0, notes:
      '▶ Sagen: „Hört ihr das Martinshorn? Was müsst ihr jetzt tun?“\n' +
      '✅ Blaulicht und Einsatzhorn zusammen: Alle müssen sofort freie Bahn schaffen (§ 38 Abs. 1). Nur Blaulicht ohne Horn: Es warnt nur – trotzdem aufmerksam sein.\n' +
      '🖱 Klick 1: § 38 · Klick 2: Rettungsgasse – wann · Klick 3: Strafen.\n' +
      '✅ Rettungsgasse (§ 11 Abs. 2): auf Autobahnen und Außerortsstraßen mit mindestens zwei Spuren pro Richtung, sobald der Verkehr nur noch Schritttempo fährt oder steht. Die Gasse liegt zwischen der ganz linken Spur und der Spur daneben – wie im Bild.\n' +
      '✅ Strafen: freie Bahn nicht geschaffen 240 €, 2 Punkte, 1 Monat Fahrverbot. Keine Rettungsgasse gebildet ab 200 €, 2 Punkte, 1 Monat Fahrverbot. Rettungsgasse selbst benutzt ab 240 €, 2 Punkte, 1 Monat Fahrverbot.\n' +
      '➜ „Schauen wir uns an, wie die Gasse entsteht.“' });
    kick(s, 'Blaulicht · §§ 38, 11');
    title(s, 'Blaulicht und Horn:\nsofort Platz machen!', { w: 8, h: 1.5, size: 38 });
    await point(s, 0.7, 2.75, 7.6, 1.0, 'LuSiren', C.bl, 'Blaulicht + Martinshorn:', 'Alle schaffen sofort freie Bahn (§ 38).');
    await point(s, 0.7, 3.9, 7.6, 1.2, 'LuRoute', C.gr, 'Rettungsgasse:', 'schon bei Schritttempo oder Stau bilden – nicht erst, wenn du das Horn hörst (§ 11 Abs. 2).');
    await point(s, 0.7, 5.25, 7.6, 1.2, 'LuBadgeEuro', C.red, 'Wer blockiert oder durchfährt:', '200 bis 240 € und mehr, 2 Punkte, 1 Monat Fahrverbot.');
  }
  // ===== RETTUNGSGASSE ANIMIERT (Draufsicht) =====
  {
    const s = base(deck, 'wei', { notes:
      '▶ Sagen: „Stau auf der Autobahn, drei Spuren. Wohin fahrt ihr, wenn ihr links, in der Mitte oder rechts steht?“\n' +
      '❓ Erst raten lassen, dann Klick.\n' +
      '🖱 Klick 1: Die Autos rücken auseinander – links nach links, alle anderen nach rechts. Klick 2: Der Rettungswagen fährt durch. Klick 3: die Merkregel.\n' +
      '✅ Die Gasse liegt immer zwischen der ganz linken Spur und der Spur daneben. Merkhilfe „rechte Hand“: Daumen = linke Spur, die Finger = alle anderen Spuren. Die Lücke ist zwischen Daumen und Zeigefinger.\n' +
      '💡 Gasse offen lassen, bis der Verkehr wieder fließt – oft kommen mehrere Einsatzfahrzeuge. Nicht hinter dem Rettungswagen herfahren.\n' +
      '➜ „Kurz testen.“' });
    kick(s, 'Live · Rettungsgasse'); title(s, 'So entsteht die Gasse', { size: 36 });
    const y0 = 2.0, lh = 1.1, x0 = 0.7, x1 = 12.63;
    s.rect(x0, y0 - 0.12, x1 - x0, 0.12, { fill: C.curb });
    s.rect(x0, y0, x1 - x0, lh * 3, { fill: C.road });
    s.rect(x0, y0 + lh * 3, x1 - x0, 0.12, { fill: C.curb });
    for (const k of [1, 2]) for (let xx = x0 + 0.2; xx < x1 - 0.3; xx += 0.75) s.rect(xx, y0 + k * lh - 0.02, 0.42, 0.045, { fill: C.mark });
    s.text('linke Spur', { x: x0 + 0.1, y: y0 + 0.04, w: 2, h: 0.28, size: 11, color: C.dim });
    s.text('Fahrtrichtung →', { x: x1 - 2.3, y: y0 + lh * 3 + 0.18, w: 2.2, h: 0.3, size: 12, color: C.dim, align: 'right' });
    const cols = ['car_y.png', 'car_b.png', 'car_w.png', 'car_g.png', 'car_r.png'];
    const xs = [3.0, 4.6, 6.2, 7.8, 9.4, 11.0];
    const moves = [];
    for (let lane = 0; lane < 3; lane++) {
      const cy = y0 + lh * lane + lh / 2;
      xs.forEach((x, j) => {
        const n = veh(s, cols[(lane * 2 + j) % 5], x + (lane % 2) * 0.25, cy, 90);
        moves.push([n, lane === 0 ? -0.26 : lane === 1 ? 0.3 : 0.22]);
      });
    }
    moves.forEach(([n, dy], i) => s.anims.push({ name: n, kind: 'pic', fx: 'move', path: mv(0, dy), dur: 900, c: i === 0 }));
    // Pfeile, die die Richtung zeigen
    s.lineS(1.5, y0 + 0.75, 1.5, y0 + 0.3, { color: C.gr, lw: 3, endArrow: 'triangle' }, { fx: 'fade', dur: 300 });
    s.lineS(1.5, y0 + lh + 0.35, 1.5, y0 + lh + 0.85, { color: C.gr, lw: 3, endArrow: 'triangle' }, { fx: 'fade', dur: 300 });
    s.lineS(1.5, y0 + 2 * lh + 0.35, 1.5, y0 + 2 * lh + 0.85, { color: C.gr, lw: 3, endArrow: 'triangle' }, { fx: 'fade', dur: 300 });
    // Rettungswagen
    const gy = y0 + lh + 0.02;
    const rw = veh(s, 'car_w.png', 0.2, gy, 90, undefined, { scale: 1.12 });
    const bl = s.oval(0.08, gy - 0.12, 0.24, 0.24, { fill: '3D7BFF', glow: 8, glowColor: '3D7BFF' });
    s.anims.push({ name: rw, kind: 'pic', fx: 'fade', dur: 200, c: true });
    s.anims.push({ name: bl, kind: 'sp', fx: 'fade', dur: 200 });
    s.anims.push({ name: rw, kind: 'pic', fx: 'move', path: mv(12.6, 0), dur: 3200, a: true, lin: true });
    s.anims.push({ name: bl, kind: 'sp', fx: 'move', path: mv(12.6, 0), dur: 3200, lin: true });
    s.anims.push({ name: bl, kind: 'sp', fx: 'blink', dur: 400 });
    // Merkregel
    card(s, 0.7, 5.6, 11.93, 1.15, { fill: C.card2 }, { fx: 'rise', c: true, dur: 400 });
    s.img(await icon('LuHand', C.gr), { x: 0.95, y: 5.85, w: 0.65, h: 0.65 }, { fx: 'fade', dur: 200 });
    s.text([{ text: 'Merkregel rechte Hand:  ', options: { bold: true, color: C.gr } }, { text: 'Daumen = linke Spur, Finger = alle anderen. Die Gasse liegt zwischen Daumen und Zeigefinger.', options: { color: C.txt } }],
      { x: 1.85, y: 5.6, w: 10.6, h: 1.15, size: 18, valign: 'middle' }, { fx: 'fade', dur: 250 });
  }
  quiz(deck, 'wei', {
    kicker: 'Frage · Rettungsgasse', q: 'Autobahn, drei Spuren, Stau. Du stehst auf der mittleren Spur. Wohin?',
    opts: ['Nach links', 'Nach rechts', 'Stehen bleiben, bis das Blaulicht kommt'], ok: 1,
    why: 'Die Gasse liegt zwischen der ganz linken Spur und der daneben. Mitte und rechts weichen nach rechts aus – und zwar sofort bei Stau (§ 11 Abs. 2).',
    notes: '▶ Frage vorlesen, mit Handzeichen abstimmen: links oder rechts?\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. Nur die ganz linke Spur weicht nach links aus. Bei vier Spuren: auch die zweite von links fährt nach rechts.\n➜ „Zurück in die Stadt: der Bus an der Haltestelle.“',
  });
};
