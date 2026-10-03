// Abend 3 · C5 Kapitel 3 Zweikreis-Bremse, Kapitel 4 ALB/EBS, Kapitel 5 Feststellbremse, Abschluss C5
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, steps, write, takeaway, svgImg, chapter, lkw } = require('../gs');
const { icon } = require('../lib');

sec('c5e', 'C5  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

// Schraubenfeder als Zickzack (Breite w, Höhe h in Zoll)
const feder = (w, n = 9) => {
  const W = Math.max(w, 0.3) * 100, H = 140; let d = `M 0 ${H / 2}`;
  for (let k = 0; k < n; k++) d += ` L ${(k + 0.25) * W / n} 6 L ${(k + 0.75) * W / n} ${H - 6}`;
  d += ` L ${W} ${H / 2}`;
  return { svg: `<path d="${d}" fill="none" stroke="#C9A227" stroke-width="9" stroke-linejoin="round"/>`, W, H };
};

module.exports = async (deck) => {
  // ===== KAPITEL 3 ZWEIKREIS =====
  await chapter(deck, 'c5z', { num: 3, ttl: 'Zweikreis-Bremse', sub: 'Vorn und hinten getrennt – damit bei einem Defekt noch gebremst wird.', ico: 'LuSplit', notes:
    '▶ Sagen: „Kapitel 3: Die Betriebsbremse arbeitet mit zwei getrennten Kreisen.“\n🖱 Keine Klicks.\n➜ „Schauen wir von oben auf den Lkw.“' });

  // ===== ZWEI KREISE (Morph, Draufsicht) =====
  const FY = 3.75;
  await steps(deck, 'c5z', {
    kicker: 'Zweikreis-Bremse', ttl: 'Vorn und hinten getrennt',
    ask: { q: 'Kreis 2 fällt aus – zieht der Lkw dann zur Seite?', a: 'Nein. Die Kreise sind nach Achsen getrennt – links und rechts bremsen gleich.', at: 2 },
    list: ['Zwei Kreise', 'Kreis 2 fällt aus', 'Vorn wird weiter gebremst'],
    caps: [
      'Das Bremsventil am Pedal steuert zwei Kreise: Kreis 1 bremst die Vorderachse, Kreis 2 die Hinterachse.',
      'Eine Leitung im Kreis 2 wird undicht. Es zischt, die Druckwarnung geht an.',
      'Kreis 1 bremst die Vorderachse weiter. Der Bremsweg wird länger – aber der Lkw zieht nicht zur Seite. Sofort gefahrlos anhalten.',
    ],
    notes: [
      '▶ Sagen: „Von oben: Das Bremsventil – auch Motorwagenbremsventil – sitzt am Pedal. Es hat zwei Teile: einen für vorn, einen für hinten.“\n✅ Zweikreis-Druckluftbremse, achsweise aufgeteilt (eurotransport, „Die Bremsanlage: Retter in der Not“). Mehr Pedal = mehr Druck.\n➜ „Was passiert bei einem Leck?“',
      '▶ „Kreis 2 verliert Luft. Das Vierkreisschutzventil sperrt ihn ab.“\n✅ Prüfungsfrage 2.7.02-304 (CE-Teil): Luft des Kreises entweicht, die Bremswirkung kann erheblich nachlassen; das Vierkreisschutzventil sichert die intakten Kreise.\n➜ „Wie bremst der Lkw jetzt?“',
      '▶ „Nur noch mit der Vorderachse. Weil die Kreise achsweise getrennt sind, bremsen links und rechts gleich – der Lkw bleibt in der Spur.“\n💡 Darum ist die Aufteilung nach Achsen gewählt – nicht nach Seiten.\n➜ „Was sitzt an den Rädern? Die Bremszylinder.“',
    ],
    legend: 'Draufsicht · Front links · schematisch',
    scene: async (s, i) => {
      s.rrect(5.75, FY - 1.25, 1.7, 2.5, { line: '33445C', lw: 1.5, dash: 'dash', rr: 0.12, name: '!!cab' });
      s.rect(7.6, FY - 1.25, 5.4, 2.5, { line: '33445C', lw: 1.5, dash: 'dash', name: '!!box' });
      s.rect(5.9, FY - 0.9, 7.0, 0.14, { fill: '3C4656', name: '!!r1' }); s.rect(5.9, FY + 0.76, 7.0, 0.14, { fill: '3C4656', name: '!!r2' });
      // Achsen und Räder
      const AX = [6.75, 11.6];
      AX.forEach((x, a) => {
        const k2 = a === 1, dead = k2 && i >= 1, brake = (a === 0 && i === 2) || i === 0;
        s.rect(x - 0.05, FY - 1.5, 0.1, 3.0, { fill: '55606F', name: '!!ax' + a });
        for (const [j, y] of [[0, FY - 1.95], [1, FY + 1.35]]) {
          s.rrect(x - 0.35, y, 0.7, 0.6, { fill: '1B1F26', line: brake ? (a ? C.or : C.bl) : '555F6E', lw: brake ? 3 : 1.5, rr: 0.15, name: '!!w' + a + j, glow: brake && i === 2 ? 10 : undefined, glowColor: C.bl });
          s.oval(x + 0.28, y + 0.15, 0.3, 0.3, { fill: dead ? C.red : (a ? C.or : C.bl), name: '!!zy' + a + j });
        }
      });
      // Bremsventil
      s.rrect(6.05, FY - 0.35, 0.9, 0.7, { fill: '1C2440', line: C.pu, lw: 2, rr: 0.1, name: '!!bv' });
      s.text('Brems-ventil', { x: 6.0, y: FY - 0.35, w: 1.0, h: 0.7, size: 12, bold: true, color: C.txt, align: 'center', valign: 'middle', name: '!!tbv' });
      // Leitungen Kreis 1 (vorn) und Kreis 2 (hinten)
      s.lineS(6.5, FY - 0.35, 6.5, FY - 1.2, { color: C.bl, lw: 4, name: '!!l1a' }); s.lineS(6.5, FY - 1.2, 7.03, FY - 1.2, { color: C.bl, lw: 4, name: '!!l1b' }); s.lineS(7.03, FY - 1.2, 7.03, FY - 1.65, { color: C.bl, lw: 4, name: '!!l1c' });
      s.lineS(6.5, FY + 0.35, 6.5, FY + 1.2, { color: C.bl, lw: 4, name: '!!l1d' }); s.lineS(6.5, FY + 1.2, 7.03, FY + 1.2, { color: C.bl, lw: 4, name: '!!l1e' }); s.lineS(7.03, FY + 1.2, 7.03, FY + 1.5, { color: C.bl, lw: 4, name: '!!l1f' });
      const c2 = i >= 1 ? C.red : C.or, d2 = i >= 1 ? 'dash' : 'solid';
      s.lineS(6.95, FY, 11.88, FY, { color: c2, lw: 4, dash: d2, name: '!!l2a' });
      s.lineS(11.88, FY - 1.65, 11.88, FY + 1.5, { color: c2, lw: 4, dash: d2, name: '!!l2b' });
      s.text('Kreis 1 – vorn', { x: 7.3, y: FY - 1.55, w: 1.8, h: 0.3, size: 13, bold: true, color: C.bl, name: '!!tk1' });
      s.text('Kreis 2 – hinten', { x: 9.4, y: FY - 0.42, w: 2.0, h: 0.3, size: 13, bold: true, color: c2, name: '!!tk2' });
      if (i >= 1) { s.img(await icon('LuWind', C.red), { x: 10.2, y: FY + 0.12, w: 0.45, h: 0.45, name: '!!leck' }); s.text('undicht', { x: 9.95, y: FY + 0.55, w: 1.0, h: 0.3, size: 13, bold: true, color: C.red, align: 'center', name: '!!tleck' }); }
      if (i === 2) s.text('bremst', { x: 6.2, y: FY + 2.0, w: 1.1, h: 0.35, size: 15, bold: true, color: C.bl, align: 'center', name: '!!tbr' });
      if (i === 2) s.text('bremst nicht', { x: 10.95, y: FY + 2.0, w: 1.5, h: 0.35, size: 15, bold: true, color: C.red, align: 'center', name: '!!tnbr' });
    },
  });

  // ===== BREMSZYLINDER UND RADBREMSE =====
  {
    const s = base(deck, 'c5z', { notes:
      '▶ Sagen: „An den Rädern sitzen die Bremszylinder. Vorn meist einfache Membranzylinder – nur für die Betriebsbremse. Hinten Kombizylinder: vorne ein Membranteil für die Betriebsbremse, hinten ein Federspeicher für die Feststellbremse.“\n' +
      '🖱 Klick 1: Membranzylinder · Klick 2: Kombizylinder · Klick 3: Radbremsen.\n' +
      '✅ eurotransport, „Die Bremsanlage: Anker und Hilfsbremser“. Radbremsen: Scheibenbremse mit automatischer Nachstellung oder Trommelbremse mit Gestängesteller. Prüfungsfrage 2.7.02-031: Zu großer Bremszylinderhub → automatischer Gestängesteller defekt oder ausgeschlagene Lagerungen – NICHT zu hoher Vorratsdruck.\n' +
      '💡 Wie der Federspeicher genau arbeitet, kommt in Kapitel 5.\n' +
      '➜ „Kapitel 4: Wie weiß die Bremse, wie schwer der Lkw ist?“' });
    kick(s, 'Zweikreis-Bremse'); title(s, 'Was an den Rädern sitzt');
    const Z = [[C.bl, 'Vorderachse', 'Membranzylinder', 'nur Betriebsbremse – Luft drückt eine Membran, die Kolbenstange bewegt den Bremshebel.'], [C.or, 'Hinterachse', 'Kombizylinder', 'zwei Teile in einem: Membranteil für die Betriebsbremse, Federspeicher für die Feststellbremse.']];
    for (let k = 0; k < 2; k++) {
      const x = 0.7 + k * 6.08, w = 5.85, col = Z[k][0];
      card(s, x, 2.05, w, 2.7, { line: col }, CLICK);
      // Zylinder-Skizze
      const cx = x + 0.4, cy = 2.45;
      s.rrect(cx, cy, 0.95, 0.9, { fill: '1A212C', line: '6E7888', lw: 2, rr: 0.3 }, { fx: 'fade', dur: 200 });
      if (k) { s.rect(cx + 0.92, cy - 0.05, 0.08, 1.0, { fill: '9AA6B5' }, { fx: 'fade', dur: 200 }); s.rrect(cx + 1.0, cy, 1.25, 0.9, { fill: '1A212C', line: C.or, lw: 2, rr: 0.3 }, { fx: 'fade', dur: 200 }); }
      s.rect(cx - 0.35, cy + 0.4, 0.4, 0.1, { fill: '9AA6B5' }, { fx: 'fade', dur: 200 });
      s.text(Z[k][1], { x: x + 3.0, y: 2.2, w: 2.7, h: 0.35, size: 14, italic: true, color: col }, { fx: 'fade', dur: 200 });
      s.text(Z[k][2], { x: x + 3.0, y: 2.55, w: 2.7, h: 0.5, size: 21, bold: true, color: C.txt }, { fx: 'fade', dur: 200 });
      s.text(Z[k][3], { x: x + 0.4, y: 3.5, w: w - 0.7, h: 1.15, size: 16, color: C.mut }, { fx: 'fade', dur: 200 });
    }
    await point(s, 0.7, 4.95, 11.93, 1.5, 'LuDisc', C.pu, 'Radbremsen: Scheibe oder Trommel.', 'Ist der Weg der Kolbenstange (Zylinderhub) zu groß, stimmt die Nachstellung nicht – Gestängesteller defekt oder Lager ausgeschlagen. Werkstatt.', CLICK, { size: 17 });
  }

  // ===== KAPITEL 4 ALB / EBS =====
  await chapter(deck, 'c5l', { num: 4, ttl: 'ALB und EBS', sub: 'Leer oder voll beladen – die Bremse passt sich an.', ico: 'LuWeight', notes:
    '▶ Sagen: „Kapitel 4: Ein leerer Lkw wiegt vielleicht 9 Tonnen, voll beladen 26. Die Bremse muss sich daran anpassen.“\n🖱 Keine Klicks.\n➜ „Wie macht sie das?“' });
  const GY = 5.6, XF = 5.9, K = 1.15;
  await steps(deck, 'c5l', {
    kicker: 'ALB', ttl: 'Bremskraft nach Beladung',
    ask: { q: 'Warum bekommt die Hinterachse leer weniger Bremsdruck?', a: 'Wenig Last hinten – mit vollem Druck würden die Räder blockieren.', at: 1 },
    list: ['Leer: wenig Last hinten', 'Voll: viel Last hinten', 'ALB defekt'],
    caps: [
      'Leer drückt wenig Gewicht auf die Hinterachse. Die ALB gibt wenig Bremsdruck nach hinten – sonst blockieren die Räder.',
      'Voll beladen trägt die Hinterachse viel. Die ALB gibt mehr Bremsdruck nach hinten.',
      'Ist die ALB defekt oder falsch eingestellt, blockieren die Hinterräder des leeren Lkw bei jeder stärkeren Bremsung.',
    ],
    notes: [
      '▶ Sagen: „ALB heißt automatisch lastabhängige Bremskraftregelung. Leer: wenig Last hinten – also wenig Bremsdruck hinten.“\n✅ Prüfungsfragen 2.7.06-208 und -233: Bremskraft wird der Achslast bzw. der tatsächlichen Fahrzeugmasse angepasst.\n➜ „Und voll beladen?“',
      '▶ „Voll: Die Achse federt ein. Die ALB misst das – mechanisch über den Abstand Rahmen–Achse oder bei Luftfederung über den Balgdruck – und gibt mehr Druck.“\n✅ eurotransport, „Die Bremsanlage: Retter in der Not“.\n➜ „Was, wenn sie kaputt ist?“',
      '▶ „Dann bekommt der leere Lkw hinten zu viel Druck – die Hinterräder blockieren.“\n✅ Prüfungsfrage 2.7.06-209: defekte oder falsch eingestellte ALB, Bruch mehrerer Federblätter. NICHT Fading.\n✅ 2.7.06-210: ABS verhindert Blockieren – egal bei welcher Last und Fahrbahn; ALB passt die Bremskraft der Achslast an, NICHT dem Fahrbahnzustand.\n➜ „Heute macht das bei schweren Lkw meist die Elektronik: EBS.“',
    ],
    legend: 'Seitenansicht · schematisch',
    scene: async (s, i) => {
      const voll = i === 1, F = voll ? 0.66 : 0.76;
      s.rect(5.7, GY, 7.5, 0.05, { fill: '55606F', name: '!!boden' });
      await lkw(s, { L: 5.5, axles: [0.7, 4.0], floor: 0.76, box: 'none', top: 2.2 }, { x: XF, gy: GY, k: K, name: 'lkw', split: true, lift: F - 0.76 });
      // Ladefläche (Pritsche) + Ladung
      const fy = GY - (F + 0.07) * K;
      s.rect(XF + 1.45 * K, fy - 0.08, 3.95 * K, 0.1, { fill: '8C96A4', name: '!!pritsche' });
      for (let k = 0; k < 4; k++) s.rrect(XF + (1.6 + k * 0.95) * K, fy - 0.08 - (voll ? 0.85 : 0.0001), 0.85 * K, voll ? 0.85 : 0.0001, { fill: 'B97A3A', line: '8A5A2A', lw: 1, rr: 0.04, name: '!!pal' + k });
      // ALB-Ventil mit Gestänge zur Achse
      const ax = XF + 4.0 * K;
      s.rrect(ax - 0.95, fy + 0.15, 0.6, 0.35, { fill: '3A2E14', line: 'C9A227', lw: 2, rr: 0.06, name: '!!alb' });
      s.text('ALB', { x: ax - 0.95, y: fy + 0.15, w: 0.6, h: 0.35, size: 12, bold: true, color: 'C9A227', align: 'center', valign: 'middle', name: '!!talb' });
      s.lineS(ax - 0.65, fy + 0.5, ax, GY - 0.3 * K, { color: 'C9A227', lw: 2, name: '!!gest' });
      // Last-Pfeil und Bremsdruck-Balken
      s.lineS(ax, 1.75, ax, voll ? 2.55 : 2.25, { color: voll ? C.or : C.mut, lw: voll ? 6 : 3, endArrow: 'triangle', name: '!!last' });
      s.text(voll ? 'viel Last' : 'wenig Last', { x: ax - 0.9, y: 1.4, w: 1.8, h: 0.32, size: 14, bold: true, color: voll ? C.or : C.mut, align: 'center', name: '!!tlast' });
      s.text('Bremsdruck hinten', { x: 5.8, y: 1.45, w: 2.6, h: 0.3, size: 13, bold: true, color: C.txt, name: '!!tbd' });
      s.rrect(5.8, 1.8, 2.6, 0.35, { fill: '1A212C', line: C.line, rr: 0.15, name: '!!bdbg' });
      const p = [0.3, 0.92, 0.92][i];
      s.rrect(5.84, 1.84, 2.52 * p, 0.27, { fill: i === 2 ? C.red : 'C9A227', rr: 0.15, name: '!!bd' });
      if (i === 2) {
        s.text('blockiert!', { x: ax - 0.9, y: GY + 0.1, w: 1.8, h: 0.35, size: 16, bold: true, color: C.red, align: 'center', name: '!!tblock' });
        s.lineS(ax - 1.4, GY + 0.02, ax - 0.4, GY + 0.02, { color: C.red, lw: 5, name: '!!spur' });
      }
    },
  });
  await ask(deck, 'c5l', {
    kicker: 'EBS', q: 'Moderne Lkw bremsen elektronisch geregelt. Was ihr über EBS wissen müsst:', qsize: 28, ico: 'LuCpu',
    answers: [
      ['LuZap', 'Pedal gibt ein elektrisches Signal –', 'die Elektronik regelt den Druck an jeder Achse. ABS und Lastregelung sind eingebaut.', 'C9A227'],
      ['LuShieldCheck', 'Elektronik fällt aus?', 'Kontrollleuchte an – der Lkw bremst über die Druckluft weiter (Redundanz). Bald in die Werkstatt.', C.gr],
      ['LuBan', 'EBS ist kein Notbremsassistent.', 'Es bremst nicht selbst bei Hindernissen – es verteilt die Bremskraft optimal.', C.red],
    ],
    notes:
      '▶ Sagen: „Heute haben schwere Lkw meist EBS – eine elektronisch geregelte Bremse.“\n' +
      '🖱 Klick 1–3: je ein Punkt.\n' +
      '✅ Prüfungsfrage 2.7.06-228: Bei Ausfall des EBS wird der Fehler per Kontrollleuchte angezeigt, gebremst wird über den pneumatischen Redundanzdruck – NICHT nur noch mit der Feststellbremse. 2.7.06-229: EBS stimmt die Bremskräfte optimal ab und überwacht die Bremsanlage – NICHT automatische Bremsung bei Hindernissen. 2.7.06-235: kürzerer Bremsweg, bessere Stabilität, weniger Belagverschleiß (alle drei richtig).\n' +
      '➜ „Kapitel 5: die Feststellbremse.“',
  });

  // ===== KAPITEL 5 FESTSTELLBREMSE =====
  await chapter(deck, 'c5f', { num: 5, ttl: 'Feststellbremse', sub: 'Die Feder bremst, die Luft löst – und was bei leerem Luftvorrat passiert.', ico: 'LuSquareParking', notes:
    '▶ Sagen: „Kapitel 5: Die Feststellbremse des Lkw funktioniert ganz anders als beim Pkw.“\n🖱 Keine Klicks.\n➜ „Wir schneiden einen Kombizylinder auf.“' });

  // ===== KOMBIZYLINDER (Morph, Schnitt) =====
  const CY = 3.75;
  await steps(deck, 'c5f', {
    kicker: 'Feststellbremse', ttl: 'Feder bremst, Luft löst',
    ask: { q: 'Wer bremst bei der Feststellbremse – die Luft oder die Feder?', a: 'Die Feder! Luft hält sie gespannt und löst die Bremse.', at: 2 },
    list: ['Fahren', 'Betriebsbremse', 'Feststellbremse', 'Notlösen'],
    caps: [
      'Beim Fahren drückt Luft den Kolben nach rechts und spannt die starke Feder. Die Bremse ist gelöst.',
      'Pedal treten: Luft strömt in den Membranteil. Die Membran schiebt die Kolbenstange heraus – die Betriebsbremse wirkt.',
      'Handbremse ziehen: Die Luft aus dem Federspeicher wird abgelassen. Die Feder drückt den Kolben – der Lkw bremst mechanisch.',
      'Kein Luftvorrat und der Lkw muss weg? Die Löseschraube herausdrehen spannt die Feder von Hand. Vorher den Lkw gegen Wegrollen sichern!',
    ],
    notes: [
      '▶ Sagen: „Links der Membranteil für die Betriebsbremse, rechts der Federspeicher. Beim Fahren ist im Federspeicher Luft – sie hält die starke Feder zusammengedrückt.“\n➜ „Jetzt tretet ihr auf die Bremse.“',
      '▶ „Luft strömt in den linken Teil. Die Membran schiebt die Kolbenstange heraus, der Bremshebel dreht sich – die Radbremse wirkt. Pedal los: Luft raus, eine kleine Feder zieht die Stange zurück.“\n➜ „Und die Feststellbremse?“',
      '▶ „Ihr betätigt das Handbremsventil: Es lässt die Luft aus dem Federspeicher. Die Feder drückt den Kolben nach links – und über die Stange wird gebremst. Feder bremst, Luft löst.“\n✅ Prüfungsfragen 2.7.06-213 (Bremsung durch Federkraft) und 2.7.06-214 (Handbremsventil entlüftet den Federspeicher-Zylinder, die Federkraft bremst).\n✅ Darum bremst der Lkw auch von selbst, wenn der Druck ganz wegfällt – vorher kommt die Warnung.\n➜ „Und wenn keine Luft mehr da ist und der Lkw abgeschleppt werden muss?“',
      '▶ „Dann lässt sich der Federspeicher nicht über das Handbremsventil lösen. Es gibt eine Hilfslöseeinrichtung – mechanisch über die Löseschraube oder pneumatisch.“\n✅ Prüfungsfragen 2.7.06-215 und -216. EU-Recht: Hilfslöseeinrichtung Pflicht; braucht man Werkzeug, muss es im Fahrzeug sein.\n⚠️ Vorher sichern: Unterlegkeile, Abschleppstange angekuppelt – nach dem Lösen hat der Lkw keine Feststellbremse mehr! Nach der Reparatur die Schraube wieder zurückdrehen.\n➜ „Wie bedient ihr die Feststellbremse im Fahrerhaus?“',
    ],
    legend: 'Kombizylinder im Schnitt · schematisch',
    scene: async (s, i) => {
      const betr = i === 1, fsAir = i <= 1, applied = i === 1 || i === 2;
      const mem = applied ? 7.7 : 8.6, px = (i === 2) ? 9.3 : 11.2, tip = mem - 2.0;
      // Gehäuse
      s.rrect(7.2, CY - 1.0, 1.7, 2.0, { fill: '1A212C', line: '6E7888', lw: 2, rr: 0.25, name: '!!g1' });
      s.rrect(8.95, CY - 1.0, 3.5, 2.0, { fill: '1A212C', line: '6E7888', lw: 2, rr: 0.2, name: '!!g2' });
      s.rect(8.86, CY - 1.1, 0.12, 2.2, { fill: '9AA6B5', name: '!!band' });
      s.text('Betriebsbremsteil', { x: 6.9, y: CY - 1.5, w: 2.3, h: 0.35, size: 13, bold: true, color: C.bl, align: 'center', name: '!!tb1' });
      s.text('Federspeicherteil', { x: 9.4, y: CY - 1.5, w: 2.6, h: 0.35, size: 13, bold: true, color: 'C9A227', align: 'center', name: '!!tb2' });
      // Luftanschlüsse
      s.rect(8.35, CY - 1.3, 0.15, 0.3, { fill: betr ? C.bl : '55606F', name: '!!a11' });
      s.rect(9.25, CY - 1.3, 0.15, 0.3, { fill: fsAir ? C.bl : '55606F', name: '!!a12' });
      // Luft in den Kammern
      s.rect(mem + 0.06, CY - 0.88, Math.max(8.84 - mem - 0.06, 0.02), 1.76, { fill: C.bl, ft: betr ? 55 : 100, name: '!!luft1' });
      s.rect(9.0, CY - 0.88, Math.max(px - 9.0, 0.02), 1.76, { fill: C.bl, ft: fsAir ? 55 : 100, name: '!!luft2' });
      // Membran + Kolbenstange + Bremshebel
      s.rect(mem, CY - 0.88, 0.07, 1.76, { fill: '2E3A4A', line: C.bl, lw: 1, name: '!!mem' });
      s.rect(tip, CY - 0.07, mem - tip, 0.14, { fill: '9AA6B5', name: '!!stange' });
      s.rrect(tip - 0.12, CY - 0.75, 0.16, 1.1, { fill: applied ? C.or : '6E7888', rr: 0.3, name: '!!hebel' });
      s.text(applied ? 'bremst' : 'gelöst', { x: tip - 0.35, y: CY - 1.2, w: 1.2, h: 0.35, size: 15, bold: true, color: applied ? C.or : C.gr, align: 'center', name: '!!tzust' });
      // Federspeicher: Kolben, Kolbenstange nach links, Feder rechts
      s.rect(px, CY - 0.85, 0.18, 1.7, { fill: '8A96A6', name: '!!kolben' });
      s.rect(px - 1.62, CY - 0.06, 1.62, 0.12, { fill: '6E7888', name: '!!kst' });
      // Feder aus einzelnen Windungen – beim Morph wird sie sichtbar zusammengedrückt bzw. entspannt
      const fx0 = px + 0.2, fx1 = 12.36, nW = 16, top = CY - 0.66, bot = CY + 0.66;
      for (let k = 0; k < nW; k++) {
        const xa = fx0 + (fx1 - fx0) * k / nW, xb = fx0 + (fx1 - fx0) * (k + 1) / nW;
        const ya = k % 2 ? bot : top, yb = k % 2 ? top : bot;
        const len = Math.hypot(xb - xa, yb - ya), ang = Math.atan2(yb - ya, xb - xa) * 180 / Math.PI;
        s.rrect((xa + xb) / 2 - len / 2, (ya + yb) / 2 - 0.035, len, 0.07, { fill: 'D4AF37', rr: 0.5, rotate: ang, name: '!!fw' + k });
      }
      // Löseschraube
      const out = i === 3;
      s.rect(12.45, CY - 0.05, out ? 0.5 : 0.12, 0.1, { fill: '9AA6B5', name: '!!schr' });
      s.rect(out ? 12.95 : 12.57, CY - 0.18, 0.1, 0.36, { fill: out ? C.red : '9AA6B5', name: '!!skopf' });
      if (out) s.text('Löse-schraube', { x: 12.45, y: CY + 0.3, w: 0.75, h: 0.6, size: 12, bold: true, color: C.red, align: 'center', name: '!!tschr' });
      if (out) { s.rrect(5.75, 5.3, 4.2, 0.62, { fill: '2A1A1E', line: C.red, lw: 2, rr: 0.1, name: '!!warn' }); s.text('Keine Feststellbremse mehr – vorher Keile!', { x: 5.8, y: 5.3, w: 4.1, h: 0.62, size: 14, bold: true, color: C.red, align: 'center', valign: 'middle', name: '!!twarn' }); }
      s.text(['Feder gespannt (Luft)', 'Feder gespannt (Luft)', 'Feder drückt – bremst', 'Feder von Hand gespannt'][i], { x: 9.3, y: CY + 1.1, w: 2.4, h: 0.32, size: 13, bold: true, color: 'C9A227', align: 'center', name: '!!tfeder' });
    },
  });

  // ===== HANDBREMSVENTIL (Morph) =====
  const PX = 9.0, PY = 5.3, LL = 2.2;
  const ANG = [-35, 25, 50];
  await steps(deck, 'c5f', {
    kicker: 'Feststellbremse', ttl: 'Das Handbremsventil',
    ask: { q: 'Wozu gibt es die Kontrollstellung?', a: 'Mit Anhänger: prüfen, ob der Lkw den ganzen Zug allein hält.', at: 2 },
    list: ['Fahrstellung', 'Feststellbremse', 'Kontrollstellung'],
    caps: [
      'Fahrstellung: Der Federspeicher ist belüftet, die Feststellbremse ist gelöst.',
      'Hebel ziehen: Der Federspeicher wird entlüftet, die Federn bremsen. Abstufbar – im Notfall auch als Hilfsbremse.',
      'Kontrollstellung (mit Anhänger): Nur das Zugfahrzeug hält, die Anhängerbremse wird gelöst. So prüft ihr, ob der Lkw den Zug allein hält.',
    ],
    notes: [
      '▶ Sagen: „Im Fahrerhaus sitzt das Handbremsventil – ein Hebel mit mehreren Stellungen. Bei manchen neuen Lkw ist es ein elektrischer Schalter.“\n➜ „Hebel nach hinten ziehen …“',
      '▶ „… die Federspeicher werden entlüftet, die Federn bremsen. Ihr könnt den Hebel auch stufenweise ziehen – das ist im Notfall eine Hilfsbremse.“\n✅ Die Feststellbremse muss den beladenen Lkw auf 18 % Steigung oder Gefälle halten (EU-Bremsenrecht). § 41 Abs. 5 StVZO: rein mechanisch wirkend.\n➜ „Und ganz durchziehen?“',
      '▶ „Die Kontrollstellung braucht ihr mit Anhänger: Der Anhänger wird gelöst, nur der Lkw hält. So seht ihr, ob die Feststellbremse des Lkw den ganzen Zug allein hält – das muss sie auf 12 %.“\n✅ Prüfungsfrage 2.7.06-320 (CE-Teil): In Kontrollstellung bremst das Zugfahrzeug über den Federspeicher, die Betriebsbremse des Anhängers wird gelöst. Mehr dazu in CE.\n💡 Bedienung je nach Hersteller – Betriebsanleitung.\n➜ „Und wie stellt ihr den Lkw am Berg sicher ab?“',
    ],
    legend: 'Handbremsventil · schematisch · je nach Hersteller',
    scene: async (s, i) => {
      // Kulisse
      let arc = '';
      const R = LL * 100 + 20, cx = 300, cy = 300;
      const pt = (d) => [cx + R * Math.sin(d * Math.PI / 180), cy - R * Math.cos(d * Math.PI / 180)];
      const [x1, y1] = pt(-45), [x2, y2] = pt(60);
      arc += `<path d="M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}" fill="none" stroke="#3C4656" stroke-width="18" stroke-linecap="round"/>`;
      s.img(await svgImg(arc, 600, 600, 1), { x: PX - 3, y: PY - 3, w: 6, h: 6, name: '!!kul' });
      const lab = [['Fahrt', -35, C.gr], ['Feststell-bremse', 25, C.red], ['Kontroll-stellung', 50, C.pu]];
      for (const [t, d, col] of lab) {
        const a = d * Math.PI / 180, r = LL + 0.65;
        s.text(t, { x: PX + r * Math.sin(a) - 0.75, y: PY - r * Math.cos(a) - 0.3, w: 1.5, h: 0.6, size: 14, bold: true, color: ANG[i] === d ? col : C.dim, align: 'center', valign: 'middle', name: '!!tl' + d });
      }
      // Hebel um den Drehpunkt
      const a = ANG[i] * Math.PI / 180, mx = PX + (LL / 2) * Math.sin(a), my = PY - (LL / 2) * Math.cos(a);
      s.rrect(mx - 0.09, my - LL / 2, 0.18, LL, { fill: '9AA6B5', rr: 0.5, rotate: ANG[i], name: '!!hebel' });
      s.oval(PX + LL * Math.sin(a) - 0.28, PY - LL * Math.cos(a) - 0.28, 0.56, 0.56, { fill: [C.gr, C.red, C.pu][i], name: '!!knauf', glow: 8, glowColor: [C.gr, C.red, C.pu][i] });
      s.rrect(PX - 0.6, PY - 0.15, 1.2, 0.5, { fill: '2A3342', rr: 0.1, name: '!!sockel' });
      // Wirkung rechts
      const W = [['Lkw', 'gelöst', 'Anhänger', 'gelöst'], ['Lkw', 'bremst', 'Anhänger', 'bremst (Luft)'], ['Lkw', 'bremst', 'Anhänger', 'gelöst']][i];
      s.text([{ text: W[0] + ': ', options: { bold: true, color: C.txt } }, { text: W[1], options: { color: W[1] === 'gelöst' ? C.gr : C.red, bold: true } }], { x: 10.5, y: 5.05, w: 2.6, h: 0.4, size: 17, name: '!!w1' });
      s.text([{ text: W[2] + ': ', options: { bold: true, color: C.mut } }, { text: W[3], options: { color: W[3] === 'gelöst' ? C.gr : C.red } }], { x: 10.5, y: 5.45, w: 2.6, h: 0.7, size: 15, name: '!!w2' });
    },
  });

  // ===== NOTLÖSEN / ABSTELLEN =====
  quiz(deck, 'c5f', {
    kicker: 'Feststellbremse', q: 'Wie sichern Sie einen zweiachsigen Lkw in starkem Gefälle gegen Wegrollen?', size: 32,
    opts: ['Feststellbremse anziehen', 'Unterlegkeil an ein Hinterrad legen', 'Dauerbremse einschalten'], ok: [0, 1],
    why: 'Feststellbremse und Unterlegkeil – die Dauerbremse wirkt nur bei laufendem Motor und rollendem Lkw (Prüfungsfrage 2.2.23-201).',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und B. Den Keil auf der Talseite unter das Rad legen.\n➜ „Zum Schluss von C5: Mitschreiben.“',
  });

  // ===== ABSCHLUSS C5 =====
  write(deck, 'c5e', {
    ttl: 'Lkw-Bremsen', labelW: 3.6, size: 18,
    rows: [
      ['Drei Bremsen', 'Betriebsbremse, Feststellbremse, Dauerbremse (Pflicht über 9 t)'],
      ['Druckluft', 'Kompressor – Druckregler – Lufttrockner – Vierkreisschutzventil – Behälter'],
      ['Abschaltdruck', 'etwa 10 bis 13 bar – kurzes Zischen ist normal'],
      ['Losfahren', 'erst wenn die Druckwarnung aus ist'],
      ['Kreis undicht', 'Ventil sperrt ihn ab – die anderen Kreise bremsen weiter'],
      ['Wasser im Behälter', 'Lufttrockner defekt – Werkstatt'],
      ['ALB', 'passt die Bremskraft der Beladung an'],
      ['Federspeicher', 'Feder bremst, Luft löst – Notlösen nur mit Keilen'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus C5.“\n❓ Vor jedem Klick fragen: „Was gehört hier hin?“\n🖱 Klick 1–8: je eine Lösung.\n✅ Quellen: § 41 StVZO; Prüfungsfragen 2.7.06-232, 2.7.01-238, 2.7.06-223, 2.7.06-220, 2.7.06-208, 2.7.06-213.\n➜ „Jetzt testen wir C5.“',
  });
  quiz(deck, 'c5e', {
    kicker: 'Quiz C5 · 1', q: 'Der Lkw stand mehrere Tage. Wann dürfen Sie frühestens losfahren?', size: 34,
    opts: ['Sobald sich die Feststellbremse lösen lässt', 'Wenn die Druckwarnung aufgehört hat', 'Bei 3 bar Vorratsdruck'], ok: 1,
    why: 'Erst wenn die Druckwarneinrichtung keine Signale mehr gibt, ist genug Luft für sicheres Bremsen da (Prüfungsfrage 2.7.01-238).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c5e', {
    kicker: 'Quiz C5 · 2', q: 'Wodurch wird bei einer Federspeicher-Bremse die Bremsung bewirkt?', size: 34,
    opts: ['Durch Druckluft', 'Durch Federkraft', 'Durch Bremsflüssigkeit'], ok: 1,
    why: 'Das Handbremsventil lässt die Luft aus dem Federspeicher – die Feder bremst. Luft löst (Prüfungsfragen 2.7.06-213, -214).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Und noch eine.“',
  });
  quiz(deck, 'c5e', {
    kicker: 'Quiz C5 · 3', q: 'Beim leeren Lkw blockieren bei jeder stärkeren Bremsung die Hinterräder. Mögliche Ursache?', size: 30,
    opts: ['Defekte oder falsch eingestellte ALB', 'Fading', 'Bruch mehrerer Federblätter'], ok: [0, 2],
    why: 'Die ALB misst die Last über die Federung. Ist sie defekt oder sind Federblätter gebrochen, bekommt die leere Hinterachse zu viel Druck (Prüfungsfrage 2.7.06-209).',
    notes: '▶ Frage vorlesen, abstimmen. Mehrere Antworten können richtig sein.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ A und C. Fading heißt: heiße Bremsen bremsen schwächer – das Gegenteil von Blockieren.\n➜ „Zum Schluss von C5: Das nehmt ihr mit.“',
  });
  await takeaway(deck, 'c5e', {
    items: [
      ['LuWind', 'Ohne Luft keine Betriebsbremse –', 'losfahren erst, wenn die Druckwarnung aus ist.'],
      ['LuSplit', 'Mehrere Kreise:', 'fällt einer aus, sperrt das Ventil ihn ab – die anderen bremsen weiter.'],
      ['LuDroplets', 'Wasser im Luftbehälter', 'heißt: Lufttrockner defekt – bei Lufttrockner kein Frostschutzmittel.'],
      ['LuWeight', 'ALB oder EBS', 'passen die Bremskraft der Beladung an.'],
      ['LuSquareParking', 'Feder bremst, Luft löst –', 'vor dem Notlösen den Lkw mit Keilen sichern.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus C5, die ihr auf jeden Fall wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Jetzt 15 Minuten Pause. Danach Lektion C6.“',
  });
  {
    const s = base(deck, 'c5e', { bg: 'f_rast.jpg', ov: 8.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „15 Minuten Pause. Kurz raus, frische Luft.“\n' +
      '💡 Pausenende ansagen (z. B. 19:45 Uhr).\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Willkommen zurück. Lektion C6: Wie bremst man lange Gefälle – und wer prüft die Bremse?“' });
    s.text('PAUSE', { x: 0.7, y: 2.0, w: 6, h: 0.5, size: 18, bold: true, color: C.gr, cs: 6 }, { fx: 'fade', auto: true, dur: 600 });
    s.text('15 Minuten', { x: 0.7, y: 2.5, w: 6.5, h: 1.4, size: 72, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900, d: 200 });
    s.text('Kurz raus, frische Luft.', { x: 0.7, y: 4.0, w: 6.2, h: 0.9, size: 22, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 600 });
    s.text('Danach: Lektion C6 · Dauerbremsen, Untersuchungen, Begrenzer', { x: 0.7, y: 5.4, w: 6.2, h: 0.9, size: 16, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 900 });
  }
};
