// Lektion 5 · Teil 3: Verkehrszeichen, Unfall, abknickende Vorfahrt, Kreisverkehr
const { together } = require('./drive5');
module.exports = async function (H5) {
  const { COL, SERIF, W, H, run, footer, kicker, title, chip, body, src, sign, signW, stampNum, tag, banner, smallLight, armPos, carAt, go, vanish, flash, X, R, K, Actor, add, I, pres } = H5;
  const TAGCOL = { blau: '6F9BD1', rot: 'E08892', gruen: '7FD1A3', weiss: 'E6EAF0' };
  const rotv = (v, h) => { const a = h * Math.PI / 180; return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]; };
  const HD = { S: 0, W: 90, N: 180, E: 270 };
  const near = (arm, v) => { const [x, y] = armPos(arm); const o = rotv(v, HD[arm]); return [x + o[0], y + o[1]]; };
  // Schilderpositionen an den Zufahrten (rechte Seite, vor der Kreuzung)
  const SGN = { S: (w, h) => [X.x1 + 0.64, X.y1 + 0.2], N: (w, h) => [X.x0 - 0.12 - w, X.y0 - 0.2 - h], E: (w, h) => [X.x1 + 0.2, X.y0 - 0.12 - h], W: (w, h) => [X.x0 - 0.2 - w, X.y1 + 0.12] };
  const signAt = (s, arm, id, h = 0.5, anim) => { const w = signW(id, h); const [x, y] = SGN[arm](w, h); return sign(s, id, x, y, h, anim); };
  const abkSigns = (s) => {
    s.img('ov_abk.png', { x: 0, y: 0, w: W, h: H });
    sign(s, '306', X.x1 + 0.64, X.y1 + 0.2, 0.5); s.img('zz_SW.png', { x: X.x1 + 0.61, y: X.y1 + 0.74, w: 0.65, h: 0.5, alt: 'Zusatzzeichen Verlauf der Vorfahrtstraße' });
    sign(s, '306', X.x0 - 0.2 - signW('306', 0.5), X.y1 + 0.12, 0.5); s.img('zz_SW.png', { x: X.x0 - 0.2 - 0.65, y: X.y1 + 0.66, w: 0.65, h: 0.5 });
    signAt(s, 'N', '205'); signAt(s, 'E', '205');
  };

  // ================= AKT 5 · VORFAHRT DURCH ZEICHEN =================
  {
    const s = add({ bg: 'bg_black.jpg', transition: 'black', footer: false, notes: `
Kapitel: Vorfahrt durch Verkehrszeichen.
❓ Frage: Wie heißen die beiden Zeichen? 🖱 Klick 1: ✅ 205 „Vorfahrt gewähren“ und 206 „Halt. Vorfahrt gewähren“.
▶ Beide haben eine Form, die es kein zweites Mal gibt: das auf der Spitze stehende Dreieck und das Achteck.
❓ Frage: Warum? 🖱 Klick 2: ✅ Damit man sie auch von hinten, bei Dunkelheit oder mit Schnee darauf erkennt. Wer die Rückseite sieht, weiß: Hier muss jemand warten. Die eigenen Schilder trotzdem beachten.` });
    kicker(s, 'Kapitel 3 · Verkehrszeichen', 0.8, 0.9, { w: 11.7, align: 'center' }, { fx: 'fade', auto: true });
    title(s, 'Die Form verrät es', 0.8, 1.3, 11.7, 1.1, { size: 56, align: 'center' }, { fx: 'fade', auto: true, a: true });
    sign(s, '205', 1.85, 2.8, 2.4, { fx: 'zoom', auto: true, a: true, dur: 600 });
    sign(s, '206', 7.75, 2.8, 2.4, { fx: 'zoom', auto: true, a: true, dur: 600 });
    s.text('Vorfahrt gewähren', { x: 1.25, y: 5.3, w: 4.0, h: 0.5, size: 20, bold: true, align: 'center' }, { fx: 'rise', c: true });
    s.text('Halt. Vorfahrt gewähren', { x: 6.95, y: 5.3, w: 4.0, h: 0.5, size: 20, bold: true, align: 'center' }, { fx: 'rise' });
    // Rückseiten
    s.shape(pres.shapes.ISOSCELES_TRIANGLE, { x: 4.65, y: 3.2, w: 1.15, h: 1.0, fill: '6E7888', rotate: 180 }, { fx: 'flyB', c: true, dur: 700 });
    s.shape(pres.shapes.OCTAGON, { x: 10.45, y: 3.2, w: 1.05, h: 1.05, fill: '6E7888' }, { fx: 'flyB', dur: 700 });
    s.text('von hinten', { x: 4.3, y: 4.3, w: 1.85, h: 0.4, size: 16, italic: true, color: COL.muted, align: 'center' }, { fx: 'fade', a: true });
    s.text('von hinten', { x: 10.05, y: 4.3, w: 1.85, h: 0.4, size: 16, italic: true, color: COL.muted, align: 'center' }, { fx: 'fade' });
    s.text('Diese Formen gibt es nur einmal. Du erkennst sie auch von hinten oder mit Schnee darauf.', { x: 0.8, y: 6.1, w: 11.7, h: 0.5, font: SERIF, size: 22, italic: true, color: COL.orange, align: 'center' }, { fx: 'fade', a: true });
  }
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Die Zeichen im Überblick. Links: Du hast Vorfahrt. Rechts: Du musst warten.
Pro Schild 2 Klicks: 1. Schild erscheint, ❓ „Was bedeutet es?“ 2. Bedeutung gleitet herein.
✅ 301 Vorfahrt: nur an der nächsten Kreuzung oder Einmündung.
✅ 306 Vorfahrtstraße: gilt bis zum nächsten Zeichen 205, 206 oder 307. Außerorts ist auf der Fahrbahn einer Vorfahrtstraße Parken verboten.
✅ 307: Ende der Vorfahrtstraße.
✅ 205 Vorfahrt gewähren.
✅ 206 Halt. Vorfahrt gewähren: immer anhalten, an der Haltlinie. Gibt es keine, dort, wo man die Straße überblickt.
✅ 102: Warnung, Kreuzung oder Einmündung mit Vorfahrt von rechts.
Merke: 205 und 206 stehen fast immer als Paar mit 301 oder 306 der anderen Straße.` });
    footer(s);
    kicker(s, 'Die Zeichen', 0.8, 0.9, { color: COL.amber });
    title(s, 'Vorfahrt haben, Vorfahrt geben', 0.75, 1.3, 12, 1.0, { size: 42 });
    s.text('DU HAST VORFAHRT', { x: 0.8, y: 2.45, w: 5.7, h: 0.4, size: 15, bold: true, cs: 4, color: COL.green });
    s.text('DU MUSST WARTEN', { x: 6.85, y: 2.45, w: 5.7, h: 0.4, size: 15, bold: true, cs: 4, color: COL.red });
    const L = [['301', 'Vorfahrt', 'nur an der nächsten Kreuzung'], ['306', 'Vorfahrtstraße', 'bis 205, 206 oder 307'], ['307', 'Ende der Vorfahrtstraße', '']];
    const Rr = [['205', 'Vorfahrt gewähren', 'warten, wenn nötig'], ['206', 'Halt. Vorfahrt gewähren', 'immer anhalten'], ['102', 'Kreuzung', 'Vorfahrt von rechts']];
    [[L, 0.8], [Rr, 6.85]].forEach(([list, x]) => list.forEach(([id, t, d], i) => {
      const y = 2.95 + i * 1.22;
      s.rrect(x, y, 5.7, 1.08, { fill: COL.card, line: '2A3342', rr: 0.12 }, { fx: 'flyB', c: true, dur: 500 });
      sign(s, id, x + 0.2, y + 0.14, 0.8, { fx: 'zoom', dur: 350 });
      s.text(t, { x: x + 1.35, y: y + 0.12, w: 4.2, h: 0.45, size: 20, bold: true }, { fx: 'rise', c: true, dur: 450 });
      if (d) s.text(d, { x: x + 1.35, y: y + 0.56, w: 4.2, h: 0.4, size: 16, color: COL.muted }, { fx: 'fade', dur: 450 });
    }));
  }
  // Stopp heißt Stopp
  {
    const s = add({ bg: 'sc_t.jpg', transition: 'fade', notes: `
Zeichen 206: Halt. Vorfahrt gewähren.
▶ Du musst anhalten, auch wenn die Straße frei ist. Die Räder müssen stillstehen. Langsames Rollen reicht nicht. In der Prüfung ist das ein erheblicher Fehler, die Prüfung ist dann nicht bestanden.
🖱 Klick 1: Du hältst an der Haltlinie. Stempel.
🖱 Klick 2: Ein Auto von links kommt. Warten.
🖱 Klick 3: Frei. Du biegst rechts ab.
Ohne Haltlinie hältst du dort, wo du die Straße überblicken kannst.` });
    footer(s);
    kicker(s, 'Zeichen 206', 0.8, 0.9);
    title(s, 'Stopp heißt\nStopp.', 0.75, 1.3, 5, 2.0, { size: 52 });
    body(s, 'Anhalten, auch wenn alles frei ist.\nDie Räder stehen still. Rollen reicht nicht.', 0.8, 3.4, 4.4, 1.0, { size: 19 });
    s.rect(X.cx, X.y1 + 0.12, X.L, 0.07, { fill: 'D9DEE5' });
    sign(s, '206', X.x1 + 0.12, X.y1 + 0.25, 0.55);
    const du = new Actor(s, 'car_du.png', X.nb, 6.6, 0, { k: X.k });
    du.blink('R', { auto: true });
    const c = carAt(s, 'car_weiss.png', 'W');
    du.drive([['G', X.nb, X.y1 + 0.95]], { c: true }, { speed: 1.0 });
    du.brake({ a: true });
    banner(s, 'Räder stehen still!', 0.8, 4.75, 3.8, COL.red, { fx: 'stamp' });
    c.drive([['S', 7]], { c: true }); vanish(c);
    du.brakeOff({ c: true });
    du.drive([['G', X.nb, X.eb + 0.8], ['T', 90, 0.8], ['S', 3.2]], {}); vanish(du);
  }
  // Unfall
  {
    const s = add({ bg: 'sc_x.jpg', transition: 'fade', notes: `
Was passiert, wenn einer das Schild übersieht? Du fährst auf der Vorfahrtstraße (306), A hat 205 und fährt einfach rein.
🖱 Klick 1: Knall. Kurz Stille aushalten.
🖱 Klick 2–4: Die Folgen (Bußgeldkatalog):
❓ Frage vor jedem Klick: Was glaubt ihr, was das kostet?
✅ Vorfahrt nicht beachtet (Vorfahrtberechtigten wesentlich behindert): 25 € · mit Gefährdung: 100 € und 1 Punkt · mit Sachbeschädigung: 120 € und 1 Punkt. Mit Verletzten wird es ein Strafverfahren.
✅ In der Probezeit sind die Verstöße mit Punkt A-Verstöße: Aufbauseminar und die Probezeit verlängert sich um 2 Jahre.
Dazu kommt der Schaden: Wer die Vorfahrt nimmt, haftet in der Regel ganz oder überwiegend.
Und: Mit Vorfahrt fährt man trotzdem bremsbereit. Du darfst dich auf andere verlassen, aber nicht blind.` });
    footer(s);
    kicker(s, 'Wenn einer nicht schaut', 0.8, 0.9, { color: COL.red });
    title(s, 'Was passiert\ndann?', 0.75, 1.3, 5, 2.0, { size: 52 });
    signAt(s, 'S', '306'); signAt(s, 'E', '205');
    const du = carAt(s, 'car_du.png', 'S'), a = carAt(s, 'car_blau.png', 'E');
    tag(s, 'A', ...near('E', [0.62, 0.35]), TAGCOL.blau);
    together([[du, [['S', 1.54]], { speed: 1.4, ease: 'lin' }], [a, [['S', 0.45]], { speed: 0.41, ease: 'lin' }]], { c: true });
    s.img('ov_crash.png', { x: 9.3 - 0.55, y: 3.4 - 0.55, w: 1.1, h: 1.1 }, { fx: 'stamp', a: true, dur: 300 });
    flash(s, {});
    const rows = [['Vorfahrt missachtet', '25 €'], ['mit Gefährdung', '100 € + 1 Punkt'], ['mit Sachschaden', '120 € + 1 Punkt']];
    rows.forEach(([t, v], i) => {
      const y = 3.45 + i * 0.72;
      s.rrect(0.8, y, 4.9, 0.6, { fill: COL.card, line: '3A2A2A', rr: 0.1 }, { fx: 'flyL', c: true, dur: 450 });
      s.text(t, { x: 1.0, y, w: 2.5, h: 0.6, size: 17, valign: 'middle' }, { fx: 'fade', dur: 300 });
      s.text(v, { x: 3.4, y, w: 2.15, h: 0.6, size: 18, bold: true, color: COL.red, align: 'right', valign: 'middle' }, { fx: 'fade', dur: 300 });
    });
    s.text([run('Probezeit: ', { bold: true, color: COL.orange }), run('mit Punkt ein A-Verstoß → Aufbauseminar, +2 Jahre')], { x: 0.8, y: 5.7, w: 4.9, h: 0.75, size: 16, color: COL.txt }, { fx: 'fade', c: true });
    src(s, 'Bußgeldkatalog (BKatV), Stand 2026 · § 2a StVG', { w: 5, y: 6.6 });
  }

  // ================= AKT 6 · ABKNICKENDE VORFAHRT =================
  {
    const s = add({ bg: 'sc_x.jpg', transition: 'fade', notes: `
Kapitel: Abknickende Vorfahrt. Die Vorfahrtstraße macht an der Kreuzung einen Knick.
▶ Das Zusatzzeichen unter dem Schild zeigt den Verlauf von oben: Die dicke Linie ist die Vorfahrtstraße, die dünnen Linien sind die Nebenstraßen. Du kommst immer von unten.
🖱 Klick 1: Das Zusatzzeichen groß. ❓ Frage: Was bedeuten die dicke und die dünnen Linien?
🖱 Klick 2: ✅ Dick = Vorfahrtstraße, dünn = Nebenstraßen, du kommst von unten.
🖱 Klick 3: Die Vorfahrtstraße leuchtet in der Kreuzung auf.
Hinweis: Das Zusatzzeichen (Nr. 1002) ist hier nachgezeichnet.` });
    footer(s);
    kicker(s, 'Kapitel 4', 0.8, 0.9);
    title(s, 'Abknickende\nVorfahrt', 0.75, 1.3, 5.2, 2.0, { size: 52 });
    sign(s, '306', 0.8, 3.55, 1.2, { fx: 'zoom', auto: true, dur: 500 });
    s.img('zz_SW.png', { x: 0.8, y: 4.85, w: 1.56, h: 1.2, alt: 'Zusatzzeichen Verlauf der Vorfahrtstraße, nachgezeichnet' }, { fx: 'zoom', c: true, dur: 500 });
    s.text([run('Dick', { bold: true, color: COL.txt }), run(' = Vorfahrtstraße\n'), run('Dünn', { bold: true, color: COL.txt }), run(' = Nebenstraßen\n'), run('Du', { bold: true, color: COL.orange }), run(' kommst immer von unten.')], { x: 2.6, y: 4.8, w: 3.4, h: 1.3, size: 17, color: COL.muted, lsm: 1.15 }, { fx: 'rise', c: true });
    s.img('ov_abk.png', { x: 0, y: 0, w: W, h: H }, { fx: 'wipeU', c: true, dur: 1200 });
  }
  {
    const s = add({ bg: 'bg_amber.jpg', transition: 'fade', notes: `
Die Regeln. Nur drei, aber die sitzen. Vor jedem Klick fragen: ❓ Was glaubt ihr?
🖱 Klick 1 · Blinken: Wer dem Knick folgt, ändert die Richtung und muss blinken.
🖱 Klick 2 · Auf der Vorfahrtstraße untereinander gelten die Abbiegeregeln (§ 9 StVO): z. B. Gegenverkehr beachten.
🖱 Klick 3 · Auf den Nebenstraßen untereinander gilt rechts vor links.
🖱 Klick 4 · ❓ Und wer geradeaus fährt und damit die Vorfahrtstraße verlässt? ✅ Blinkt nicht, er lenkt ja nicht.` });
    footer(s);
    kicker(s, 'Drei Regeln', 0.8, 0.9, { color: COL.amber });
    title(s, 'So klappt der Knick', 0.75, 1.3, 12, 1.0, { size: 46 });
    const r = [['1', 'Dem Knick folgen = blinken', 'Du änderst die Richtung. Also Blinker setzen.'],
      ['2', 'Auf der Vorfahrtstraße untereinander', 'Es gelten die Abbiegeregeln, z. B. Gegenverkehr beachten.'],
      ['3', 'Auf den Nebenstraßen untereinander', 'Es gilt rechts vor links.']];
    r.forEach(([n, t, d], i) => {
      const y = 2.6 + i * 1.3;
      s.rrect(0.8, y, 11.7, 1.1, { fill: COL.card, line: '2A3342', rr: 0.12 }, { fx: 'flyL', c: true, dur: 600 });
      s.text(n, { x: 1.05, y: y + 0.2, w: 0.7, h: 0.7, font: SERIF, size: 28, bold: true, color: '1A0E05', fill: COL.orange, shape: pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'zoom', dur: 300 });
      s.text(t, { x: 2.05, y: y + 0.1, w: 10.2, h: 0.5, font: SERIF, size: 23, bold: true }, { fx: 'fade', dur: 300 });
      s.text(d, { x: 2.05, y: y + 0.58, w: 10.2, h: 0.42, size: 17, color: COL.muted }, { fx: 'fade', dur: 300 });
    });
    body(s, 'Geradeaus aus der Vorfahrtstraße raus? Nicht blinken, du lenkst ja nicht.', 0.8, 6.6, 11.7, 0.4, { size: 17, italic: true, align: 'center' }, { fx: 'fade', c: true });
  }
  {
    const s = add({ bg: 'sc_x.jpg', transition: 'fade', notes: `
Szene: Du folgst der Vorfahrtstraße nach links, also blinkst du links. Gleichzeitig folgt A von links kommend dem Knick nach rechts. Ihr seid beide auf der Vorfahrtstraße, eure Wege kreuzen sich nicht: Ihr fahrt gleichzeitig.
B kommt aus der Nebenstraße von rechts und muss warten.
❓ Frage: Wer fährt zuerst? ✅ Du und A gleichzeitig (beide auf der Vorfahrtstraße, Wege kreuzen sich nicht), dann B.
🖱 Klick 1: Du und A fahrt, Stempel „B wartet“. 🖱 Klick 2: B fährt.` });
    footer(s);
    kicker(s, 'Abknickende Vorfahrt', 0.8, 0.9);
    title(s, 'Dem Knick\nfolgen', 0.75, 1.3, 5, 2.0, { size: 52 });
    body(s, 'Du und A folgen dem Knick.\nB will geradeaus. Wer fährt?', 0.8, 3.4, 4.4, 1.2, { size: 19 });
    abkSigns(s);
    const du = carAt(s, 'car_du.png', 'S'), a = carAt(s, 'car_blau.png', 'W'), b = carAt(s, 'car_rot.png', 'E');
    du.blink('L', { auto: true }); a.blink('R', { auto: true });
    tag(s, 'A', ...near('W', [0.62, 0.35]), TAGCOL.blau); tag(s, 'B', ...near('E', [0.62, 0.35]), TAGCOL.rot);
    together([[du, [['S', 0.9875], ['T', -90, 1.3], ['S', 1.6]]], [a, [['S', 0.5125], ['T', 90, 0.8], ['S', 3.0]]]], { c: true });
    vanish(du); vanish(a, {});
    banner(s, 'B wartet: Nebenstraße', 0.8, 4.85, 4.2, COL.orange, { fx: 'stamp', a: true });
    go(b, 'straight', { c: true }, { ext: 3.6 });
  }
  // Runde 5
  {
    const s = add({ bg: 'sc_x.jpg', transition: 'fade', notes: `
Runde 5 im Kreuzungs-Duell, jetzt mit abknickender Vorfahrt. Die Vorfahrtstraße kommt von unten und knickt nach links ab.
C ist auf der Vorfahrtstraße (von links) und folgt dem Knick nach rechts. A (von oben) und B (von rechts) sind auf Nebenstraßen und wollen geradeaus.
✅ C zuerst (Vorfahrtstraße). Dann A vor B: Auf den Nebenstraßen gilt untereinander rechts vor links, und A kommt für B von rechts.
🖱 Klick 1: Abstimmen. 🖱 Klicks 2–4: C, A, B. 🖱 Klick 5: Begründung.` });
    footer(s);
    kicker(s, 'Runde 5 von 5', 0.8, 0.9);
    title(s, 'Wer fährt\nzuerst?', 0.75, 1.3, 5, 2.0, { size: 52 });
    s.text('C folgt dem Knick nach rechts.\nA und B wollen geradeaus.', { x: 0.8, y: 3.4, w: 4.4, h: 1.1, size: 18, color: COL.muted, lsm: 1.12 });
    abkSigns(s);
    const A = carAt(s, 'car_blau.png', 'N'), B = carAt(s, 'car_rot.png', 'E'), C = carAt(s, 'car_gruen.png', 'W');
    C.blink('R', { auto: true });
    tag(s, 'A', ...near('N', [0.62, 0.35]), TAGCOL.blau); tag(s, 'B', ...near('E', [0.62, 0.35]), TAGCOL.rot); tag(s, 'C', ...near('W', [0.62, 0.35]), TAGCOL.gruen);
    chip(s, 'Abstimmen: A · B · C ?', 0.8, 4.85, 3.6, { size: 18, fill: COL.orange, color: '0A0C10' }, { fx: 'stamp', c: true });
    stampNum(s, 1, ...near('W', [0.62, 1.0]), { fx: 'stamp', c: true }); go(C, 'right', { a: true });
    stampNum(s, 2, ...near('N', [0.62, 1.0]), { fx: 'stamp', c: true }); go(A, 'straight', { a: true });
    stampNum(s, 3, ...near('E', [0.62, 1.0]), { fx: 'stamp', c: true }); go(B, 'straight', { a: true }, { ext: 3.6 });
    s.text('C ist auf der Vorfahrtstraße. A und B sind auf Nebenstraßen: rechts vor links, A kommt für B von rechts.', { x: 0.8, y: 5.55, w: 5.0, h: 1.1, size: 17, color: COL.txt, lsm: 1.1, fill: '12161E', line: '2A3342', shape: pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: 8, valign: 'middle' }, { fx: 'rise', c: true, dur: 600 });
  }

  // ================= AKT 7 · KREISVERKEHR =================
  {
    const s = add({ bg: 'sc_kreis.jpg', transition: 'fade', notes: `
Kapitel: Kreisverkehr. Du kommst von unten und willst die zweite Ausfahrt nehmen (geradeaus nach oben).
❓ Frage: Wer fährt zuerst? Und wann blinkst du? Erst raten lassen.
✅ Steht Zeichen 215 (Kreisverkehr) unter Zeichen 205, hat der Verkehr im Kreis Vorfahrt (§ 8 Abs. 1a StVO). Fußgänger am Zebrastreifen haben Vorrang (§ 26).
🖱 Klick 1: Eine Fußgängerin geht über den Zebrastreifen, gleichzeitig fährt A im Kreis vorbei. Du wartest.
🖱 Klick 2: Du fährst ein, OHNE zu blinken (Blinken beim Einfahren ist unzulässig, § 8 Abs. 1a StVO), und fährst gegen den Uhrzeigersinn.
Nachdem du an der ersten Ausfahrt vorbei bist, blinkst du rechts und fährst raus.
❓ Frage: Wann blinke ich zum Rausfahren? ✅ Wenn du an der Ausfahrt vor deiner Ausfahrt vorbei bist. Rechts blinken.` });
    footer(s);
    kicker(s, 'Kapitel 5', 0.8, 0.9, { color: COL.green });
    title(s, 'Der Kreis-\nverkehr', 0.75, 1.3, 5, 2.0, { size: 52 });
    const bx = K.cx + K.L + 0.14;
    sign(s, '215', bx, K.cy + K.rOut + 0.45, 0.5); sign(s, '205', bx, K.cy + K.rOut + 1.0, 0.5);
    body(s, 'Du willst geradeaus raus.\nWer fährt zuerst? Wann blinkst du?', 0.8, 3.4, 4.4, 0.9, { size: 19 });
    const du = new Actor(s, 'car_du.png', K.cx + K.L / 2, 6.95, 0, { k: K.k });
    const a = new Actor(s, 'car_blau.png', K.cx - K.rm, K.cy, 180, { k: K.k });
    const ped = new Actor(s, 'ped.png', K.cx - K.L - 0.35, K.cy + K.rOut + 0.51, 90, { k: 0.3, kind: 'ped' });
    a.blink('R', { auto: true });
    banner(s, 'Warten: Kreis und Zebrastreifen', 0.8, 4.4, 4.2, COL.red, { fx: 'stamp', c: true }, { size: 19 });
    together([[a, [['T', -150, K.rm], ['C', 10.27, 4.137, 10.9, K.cy + K.L / 2, 11.3, K.cy + K.L / 2, 90], ['S', 2.2]]], [ped, [['S', 2.1]], { speed: 1.0 }]], {});
    vanish(a); vanish(ped, {});
    du.drive([['G', K.cx + K.L / 2, 5.9], ['C', K.cx + K.L / 2, 5.5, 9.287, 5.12, 9.59, 4.945, 60], ['T', -60, K.rm]], { c: true }, { ease1: 'lin' });
    banner(s, 'Rein: kein Blinker', 0.8, 5.15, 3.6, COL.orange, { fx: 'stamp' });
    du.blink('R', { a: true, dur: 1 });
    du.drive([['T', -60, K.rm], ['C', 9.287, 2.38, K.cx + K.L / 2, 2.0, K.cx + K.L / 2, 1.6, 0], ['S', 2.2]], { a: true }, { ease0: 'lin' });
    vanish(du);
    banner(s, 'Raus: rechts blinken', 0.8, 5.9, 3.6, COL.green, { fx: 'stamp', a: true });
  }
  {
    const s = add({ bg: 'bg_green.jpg', transition: 'fade', notes: `
Die Kreisverkehr-Regeln als Frage und Antwort. Pro Karte 2 Klicks: 1. Frage erscheint, Klasse antwortet. 2. Antwort gleitet herein.
✅ Wer hat Vorfahrt? Wer im Kreis fährt, wenn 215 unter 205 steht (§ 8 Abs. 1a StVO).
✅ Reinfahren blinken? Nein, unzulässig (§ 8 Abs. 1a StVO).
✅ Rausfahren blinken? Ja, rechts. Und auf Fußgänger und Radfahrer achten (§ 9 StVO).
✅ Im Kreis halten? Nein, auf der Kreisfahrbahn verboten (Anlage 2 StVO zu Zeichen 215).
✅ Über die Mittelinsel? Nein. Nur große Fahrzeuge, wenn es anders nicht geht und niemand gefährdet wird (Anlage 2 StVO zu Zeichen 215).
✅ Profi-Frage: Nur Zeichen 215, aber kein 205? Dann gilt rechts vor links: Wer reinfährt, hat Vorfahrt.
🖱 Letzter Klick: Merksatz „Rein ohne, raus mit.“` });
    footer(s);
    kicker(s, 'Merken', 0.8, 0.9, { color: COL.green });
    title(s, 'Kreisverkehr: 6 Fragen', 0.75, 1.3, 6.4, 1.0, { size: 40 });
    sign(s, '215', 10.3, 0.85, 0.9); sign(s, '205', 10.3 + 0.95, 0.85, 0.9);
    const r = [[I.hand, 'Wer hat Vorfahrt?', 'Wer im Kreis fährt (215 unter 205).'], [I.no, 'Reinfahren: blinken?', 'Nein. Blinken ist hier unzulässig.'],
      [I.ok, 'Rausfahren: blinken?', 'Ja, rechts. Fußgänger und Radfahrer beachten.'], [I.alert, 'Im Kreis anhalten?', 'Nein. Halten auf der Kreisfahrbahn ist verboten.'],
      [I.cone, 'Über die Mittelinsel?', 'Nein. Nur große Fahrzeuge, wenn es nicht anders geht.'], [I.q, 'Nur 215, kein 205?', 'Dann rechts vor links: Wer reinfährt, hat Vorfahrt.']];
    const cw = 5.75, ch = 1.2, x0 = 0.8;
    r.forEach(([ic, t, d], i) => {
      const x = x0 + (i % 2) * (cw + 0.2), y = 2.55 + Math.floor(i / 2) * (ch + 0.2);
      s.rrect(x, y, cw, ch, { fill: i === 5 ? '17241C' : COL.card, line: i === 5 ? '2E5A40' : '2A3342', rr: 0.12 }, { fx: 'rise', c: true, dur: 500 });
      s.img(ic, { x: x + 0.25, y: y + 0.3, w: 0.6, h: 0.6 }, { fx: 'fade', dur: 300 });
      s.text(t, { x: x + 1.05, y: y + 0.14, w: cw - 1.2, h: 0.45, size: 19, bold: true }, { fx: 'fade', dur: 300 });
      s.text(d, { x: x + 1.05, y: y + 0.6, w: cw - 1.2, h: 0.45, size: 16, color: COL.orange, bold: true }, { fx: 'rise', c: true, dur: 450 });
    });
    banner(s, 'Rein ohne, raus mit.', 7.1, 1.45, 3.0, COL.green, { fx: 'stamp', c: true }, { size: 20, h: 0.55 });
  }

  await require('./build5d')(H5);
};
