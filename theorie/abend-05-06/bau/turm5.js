// Rangfolge-Turm: gleiche Kreuzung, vier Ebenen, die Vorfahrt kippt jedes Mal (Morph)
module.exports = async function (H5) {
  const { COL, SERIF, W, footer, kicker, title, body, sign, signW, banner, smallLight, carAt, go, X, add, I, run } = H5;
  const LV = [
    { n: 4, t: 'Rechts vor links', sub: 'Die Grundregel' },
    { n: 3, t: 'Verkehrszeichen', sub: 'z. B. 306 und 205' },
    { n: 2, t: 'Ampel', sub: 'Lichtzeichen' },
    { n: 1, t: 'Polizei', sub: 'Zeichen und Weisungen' },
  ];
  const NOTES = [`
Der Rangfolge-Turm. Immer dieselbe Kreuzung: Du (orange) kommst von unten und willst geradeaus. A (blau) kommt von rechts und will geradeaus.
Stufe 4: Keine Schilder, keine Ampel, kein Polizist. ❓ Wer fährt? ✅ A, denn A kommt von rechts.
🖱 Klick 1: A fährt. 🖱 Klick 2: Du fährst.
➜ Weiterklicken: Jetzt kommen Schilder dazu.`, `
Stufe 3: Du hast Zeichen 306 (Vorfahrtstraße), A hat Zeichen 205 (Vorfahrt gewähren). Die Schilder schlagen rechts vor links.
❓ Wer fährt jetzt? ✅ Du.
🖱 Klick 1: Du fährst. 🖱 Klick 2: A fährt.`, `
Stufe 2: Jetzt kommt eine Ampel dazu. Du hast Rot, A hat Grün. Die Ampel schlägt die Schilder (§ 37 Abs. 1 StVO).
Die Schilder bleiben hängen: Sie gelten, wenn die Ampel ausfällt oder abgeschaltet ist.
❓ Wer fährt? ✅ A, trotz deiner Vorfahrtstraße.
🖱 Klick 1: A fährt. 🖱 Klick 2: Ampel springt um, du fährst.`, `
Stufe 1: Ein Polizist steht auf der Kreuzung. Seine Zeichen gehen allen anderen Anordnungen und Regeln vor, auch der Ampel (§ 36 Abs. 1 StVO).
Er zeigt dir seine Seite: Du darfst fahren. A sieht seine Brust: A muss halten. Obwohl deine Ampel Rot zeigt.
🖱 Klick 1: Du fährst. 🖱 Klick 2: Merksatz.
Merksatz: Polizei vor Ampel vor Schild vor rechts vor links.`];
  for (let lv = 0; lv < 4; lv++) {
    const s = add({ bg: 'sc_x.jpg', transition: lv === 0 ? 'fade' : 'morph', dur: 1100, notes: NOTES[lv] });
    footer(s);
    kicker(s, 'Wer hat das Sagen?', 0.8, 0.9, { name: '!!k' });
    title(s, 'Die Rangfolge', 0.75, 1.3, 5, 1.0, { size: 46, name: '!!t' });
    // Turm
    for (let i = 0; i <= lv; i++) {
      const L = LV[i], y = 5.85 - i * 0.92, top = i === lv;
      s.rrect(0.8, y, 4.6, 0.8, { fill: top ? '2A1A0E' : '12161E', line: top ? COL.orange : '2A3342', lw: top ? 2 : 1, rr: 0.12, glow: top ? 10 : undefined, glowOp: 0.35, name: '!!tb' + i });
      s.text(String(L.n), { x: 0.95, y: y + 0.1, w: 0.6, h: 0.6, font: SERIF, size: 28, bold: true, color: top ? COL.orange : '5B6474', align: 'center', valign: 'middle', name: '!!tn' + i });
      s.text([run(L.t, { bold: true, color: top ? COL.txt : '8A93A2', fontSize: 21 }), run('  ' + L.sub, { color: top ? COL.muted : '5B6474', fontSize: 14 })], { x: 1.65, y: y + 0.1, w: 3.7, h: 0.6, valign: 'middle', name: '!!tt' + i });
    }
    if (lv < 3) body(s, 'Was oben steht, schlägt alles darunter.', 0.8, 2.35, 4.8, 0.45, { size: 17, italic: true, name: '!!hint' });
    // Szene
    if (lv >= 1) {
      sign(s, '306', X.x1 + 0.12, X.y1 + (lv >= 2 ? 1.05 : 0.2), 0.5, undefined, { name: '!!s306' });
      sign(s, '205', X.x1 + 0.2, X.y0 - 0.6, 0.5, undefined, { name: '!!s205' });
    }
    let lS, lE, rS;
    if (lv >= 2) {
      lS = smallLight(s, X.x1 + 0.24, X.y1 + 0.2, { name: '!!lS' });
      lE = smallLight(s, X.x1 + 0.78, X.y0 - 0.8, { name: '!!lE' });
      rS = lS.lamp('r'); lE.lamp('g');
    }
    if (lv === 3) { s.oval(X.cx - 0.5, X.cy - 0.5, 1.0, 1.0, { fill: '5B8CFF', ft: 80, glow: 18, glowColor: '5B8CFF', glowOp: 0.5, name: '!!copg' }); s.img('cop_out.png', { x: X.cx - 0.42, y: X.cy - 0.225, w: 0.84, h: 0.45, rotate: 90, name: '!!cop' }); }
    const du = carAt(s, 'car_du.png', 'S', { name: '!!du' });
    const a = carAt(s, 'car_blau.png', 'E', { name: '!!a' });
    s.text('DU', { x: X.nb - 1.0, y: 5.55 + 0.35, w: 0.6, h: 0.4, size: 16, bold: true, color: COL.orange, name: '!!ldu' });
    H5.tag(s, 'A', 11.35, X.wb, '6F9BD1', undefined, '!!la');
    const first = lv === 0 || lv === 2 ? 'a' : 'du';
    const bText = ['A kommt von rechts', 'Du hast Vorfahrt (306)', 'A hat Grün', 'Der Polizist lässt dich fahren'][lv];
    banner(s, bText, 6.6, 0.95, 4.6, lv === 3 ? COL.blue : COL.orange, { fx: 'stamp', c: true }, { size: 20 });
    if (first === 'a') { go(a, 'straight', { a: true }, { ext: 3.6 }); if (lv === 2) { s.reg(rS, { fx: 'out', c: true, dur: 200 }, 'sp'); lS.lamp('g', { fx: 'fade', dur: 300 }); go(du, 'straight', { a: true }); } else go(du, 'straight', { c: true }); }
    else { go(du, 'straight', { a: true }); if (lv < 3) go(a, 'straight', { c: true }, { ext: 3.6 }); }
    if (lv === 3) s.text('Polizei › Ampel › Schild › rechts vor links', { x: 0.8, y: 2.3, w: 4.6, h: 0.5, size: 18, bold: true, color: COL.orange, fill: '1A120B', shape: H5.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle' }, { fx: 'rise', c: true, dur: 700 });
  }
};
