// Abend 2 · C3: Der Weg der Kraft (Morph-Draufsicht auf das Fahrgestell)
const { C, sec, steps } = require('../gs');

// Fahrgestell von oben, Front links. Szene rechts (x 5.6 … 13.1)
const FY = 3.9;            // Mittellinie
const parts = [
  // [Name, x, y, w, h, Farbe, Beschriftung, Schritt]
  ['motor', 6.35, FY - 0.55, 1.25, 1.1, 'B97A3A', 'Motor', 0],
  ['kupp', 7.6, FY - 0.42, 0.32, 0.84, '7A8FA8', 'Kupplung', 1],
  ['getr', 7.92, FY - 0.38, 0.95, 0.76, '6B7FB5', 'Getriebe', 2],
  ['welle', 8.87, FY - 0.07, 2.45, 0.14, '9AA6B5', 'Gelenkwelle', 3],
  ['diff', 11.32, FY - 0.32, 0.6, 0.64, 'C9A227', 'Differenzial', 4],
];
module.exports = async (deck) => {
  await steps(deck, 'c3k', {
    kicker: 'Kraftstrang', ttl: 'Der Weg der Kraft',
    list: ['Motor', 'Kupplung', 'Getriebe', 'Gelenkwelle', 'Differenzial', 'Achswellen und Räder'],
    caps: [
      'Der Dieselmotor erzeugt die Kraft. Er sitzt unter dem Fahrerhaus – darum lässt sich das Fahrerhaus nach vorn kippen.',
      'Die Kupplung trennt den Motor vom Getriebe – zum Anfahren und Schalten.',
      'Das Getriebe übersetzt: viel Kraft beim Anfahren, hohes Tempo auf der Autobahn. Schwere Lkw haben meist 12 Gänge.',
      'Die Gelenkwelle bringt die Kraft nach hinten. Gelenke gleichen das Federn der Achse aus.',
      'Das Differenzial verteilt die Kraft auf das linke und rechte Rad – und lässt sie in der Kurve verschieden schnell drehen.',
      'Über die Achswellen kommt die Kraft an die Antriebsräder. Bei schweren Lkw meist Zwillingsreifen.',
    ],
    notes: [
      '▶ Sagen: „Wie kommt die Kraft vom Motor auf die Straße? Wir gehen den Weg Schritt für Schritt ab. Das ist das Fahrgestell von oben, vorn ist links.“\n❓ „Wer kann die Reihenfolge schon nennen?“\n✅ Motor → Kupplung → Getriebe → Gelenkwelle → Differenzial (Achsgetriebe) → Achswellen → Räder.\n➜ „Zwischen Motor und Getriebe sitzt …“',
      '▶ „… die Kupplung. Sie trennt den Motor vom Getriebe – sonst würde der Motor beim Anhalten absterben.“\n💡 Bei automatisierten Getrieben macht das die Technik; ein Kupplungspedal gibt es oft nur noch zum Rangieren oder gar nicht.\n➜ „Danach das Getriebe.“',
      '▶ „Das Getriebe ist der Übersetzer: kleiner Gang = viel Kraft, großer Gang = viel Tempo.“\n✅ Lkw-Getriebe haben meist 12 Gänge (früher auch 16), aufgebaut aus Grundgetriebe, Split- und Bereichsgruppe.\n➜ „Und dann geht es nach hinten.“',
      '▶ „Die Gelenkwelle überträgt die Kraft zur Hinterachse. Die Gelenke sind nötig, weil die Achse beim Federn auf und ab geht.“\n💡 Bei der Abfahrtkontrolle: auf Geräusche, Schläge oder Ölverlust achten – ausschlagende Gelenke hört man beim Anfahren.\n➜ „Am Ende sitzt ein wichtiges Bauteil.“',
      '▶ „Das Differenzial, auch Ausgleichsgetriebe. Es teilt die Kraft auf links und rechts auf.“\n❓ „Warum müssen die Räder in der Kurve verschieden schnell drehen?“ ✅ Das äußere Rad fährt einen größeren Bogen als das innere – es muss sich schneller drehen.\n➜ „Und zuletzt …“',
      '▶ „Über die Achswellen kommt die Kraft an die Räder. Fertig ist der Weg der Kraft.“\n💡 Merksatz: Motor – Kupplung – Getriebe – Welle – Differenzial – Rad.\n➜ „Ein Teil schauen wir uns genauer an: die Gelenkwelle.“',
    ],
    legend: 'Fahrgestell von oben · Front links · schematisch',
    scene: async (s, i) => {
      // Umriss Fahrerhaus und Aufbau (zur Orientierung)
      s.rrect(5.7, FY - 1.25, 1.75, 2.5, { line: '33445C', lw: 1.5, dash: 'dash', rr: 0.12, name: '!!umr1' });
      s.rect(7.6, FY - 1.25, 5.45, 2.5, { line: '33445C', lw: 1.5, dash: 'dash', name: '!!umr2' });
      s.text('Fahrer-haus', { x: 5.72, y: FY - 1.2, w: 0.7, h: 0.5, size: 10, italic: true, color: C.dim, name: '!!tfh' });
      // Rahmen
      s.rect(5.9, FY - 0.95, 7.0, 0.16, { fill: '3C4656', name: '!!r1' });
      s.rect(5.9, FY + 0.79, 7.0, 0.16, { fill: '3C4656', name: '!!r2' });
      for (const x of [6.0, 8.9, 10.6, 12.7]) s.rect(x, FY - 0.95, 0.1, 1.9, { fill: '3C4656', name: '!!q' + x });
      // Vorderachse + Räder (gelenkt)
      s.rect(6.75, FY - 1.55, 0.12, 3.1, { fill: '55606F', name: '!!va' });
      for (const [k, y] of [[0, FY - 1.95], [1, FY + 1.35]]) s.rrect(6.45, y, 0.72, 0.6, { fill: '1B1F26', line: '555F6E', lw: 1.5, rr: 0.15, name: '!!vr' + k });
      // Hinterachse + Zwillingsräder
      const ra = i >= 5 ? C.or : '55606F';
      s.rect(11.56, FY - 1.55, 0.12, 3.1, { fill: ra, name: '!!ha' });
      for (const [k, y] of [[0, FY - 2.15], [1, FY - 1.6], [2, FY + 1.0], [3, FY + 1.55]]) s.rrect(11.25, y, 0.74, 0.5, { fill: i >= 5 ? '3A2A12' : '1B1F26', line: i >= 5 ? C.or : '555F6E', lw: 1.5, rr: 0.15, name: '!!hr' + k });
      // Bauteile
      for (const [nm, x, y, w, h, col, lab, st] of parts) {
        const on = i >= st, cur = i === st;
        s.rrect(x, y, w, h, { fill: on ? col : '2A3342', line: cur ? C.white : (on ? col : C.line), lw: cur ? 2.5 : 1, rr: 0.08, name: '!!' + nm, glow: cur ? 10 : undefined, glowColor: col });
        const L = { motor: [x + 0.05, y + 0.08, w - 0.1], kupp: [7.15, FY + 0.47, 1.2], getr: [7.92, FY - 0.74, 0.95], welle: [9.3, FY - 0.45, 1.6], diff: [9.95, FY + 0.3, 1.3] }[nm];
        s.text(lab, { x: L[0], y: L[1], w: L[2], h: 0.32, size: 12, bold: cur, color: nm === 'motor' && on ? C.dark : (on ? C.txt : C.dim), align: 'center', valign: 'middle', name: '!!t' + nm });
      }
      // Gelenke der Welle
      for (const [k, x] of [[0, 8.87], [1, 11.22]]) s.oval(x - 0.08, FY - 0.12, 0.24, 0.24, { fill: i >= 3 ? '9AA6B5' : '2A3342', name: '!!gl' + k });
      s.text('Achswellen', { x: 12.05, y: FY + 1.0, w: 1.2, h: 0.3, size: 12, bold: i === 5, color: i >= 5 ? C.or : C.dim, name: '!!tachs' });
      // Kraft-Puls wandert mit
      const PX = [6.97, 7.76, 8.4, 10.1, 11.62, 11.62];
      const PY = [FY + 0.2, FY, FY, FY, FY, FY - 1.6];
      s.oval(PX[i] - 0.17, PY[i] - 0.17, 0.34, 0.34, { fill: C.or, glow: 12, glowColor: C.or, name: '!!puls' });
      s.text('vorn', { x: 5.9, y: 5.85, w: 1.0, h: 0.3, size: 12, color: C.dim, name: '!!vorn' });
      s.lineS(6.9, 6.2, 5.95, 6.2, { color: C.dim, lw: 1.5, endArrow: 'triangle', name: '!!vpf' });
    },
  });

  // ===== GELENKWELLE (Morph: Achse federt ein, Abschleppen) =====
  const J1 = [7.05, 3.85];
  await steps(deck, 'c3k', {
    kicker: 'Kraftstrang', ttl: 'Die Gelenkwelle',
    list: ['Aufbau', 'Die Achse federt ein', 'Abschleppen: abflanschen'],
    caps: [
      'Die Gelenkwelle verbindet Getriebe und Hinterachse. Kreuzgelenke gleichen Winkel aus, das Schiebestück die Länge.',
      'Federt die Achse ein, ändern sich Winkel und Länge – Gelenke und Schiebestück gleichen das aus. Klacken oder Vibrieren beim Anfahren: Werkstatt.',
      'Abschleppen mit der Antriebsachse auf der Straße: Gelenkwelle meist abflanschen (Herstellervorgabe) – sonst kann das Getriebe ohne Schmierung kaputtgehen.',
    ],
    notes: [
      '▶ Sagen: „Die Gelenkwelle bringt die Kraft vom Getriebe zur Hinterachse. Sie hat zwei Kreuzgelenke und ein Schiebestück.“\n❓ „Warum braucht sie Gelenke – sie läuft doch einfach geradeaus?“\n✅ Weil die Achse beim Federn auf und ab geht.\n➜ „Schauen wir, was beim Einfedern passiert.“',
      '▶ „Die Achse geht hoch. Der Winkel ändert sich – das machen die Kreuzgelenke mit. Und der Abstand ändert sich – dafür ist das Schiebestück da.“\n✅ Bei der Sichtkontrolle auf Ölverlust, lose Teile und Beschädigung achten. Vibrationen beim Anfahren oder Klacken beim Lastwechsel deuten auf ausgeschlagene Gelenke – Werkstatt (Lehrbuchwissen, Betriebsanleitung).\n➜ „Und wenn der Lkw abgeschleppt werden muss?“',
      '▶ „Wird der Lkw mit der Antriebsachse auf der Straße abgeschleppt, dreht die Achse die Gelenkwelle und damit Teile des Getriebes mit – aber der Motor steht, die Ölpumpe läuft nicht. Darum wird die Gelenkwelle bei vielen Lkw vorher abgeflanscht.“\n✅ Herstellervorgabe in der Betriebsanleitung beachten. Das macht in der Regel der Abschleppdienst.\n➜ „Jetzt zum Herz des Lkw: dem Motor.“',
    ],
    legend: 'Seitenansicht · schematisch',
    scene: async (s, i) => {
      const lift = i === 1 ? 0.55 : 0, J2 = [10.55, 3.85 - lift], off = i === 2;
      const ang = Math.atan2(J2[1] - J1[1], J2[0] - J1[0]), deg = ang * 180 / Math.PI;
      const at = (d) => [J1[0] + d * Math.cos(ang), J1[1] + d * Math.sin(ang)];
      const bar = (d1, d2, th, col, nm, extra = {}) => { const [x1, y1] = at(d1), [x2, y2] = at(d2), l = d2 - d1; s.rrect((x1 + x2) / 2 - l / 2, (y1 + y2) / 2 - th / 2, l, th, { fill: col, rr: 0.3, rotate: deg, name: '!!' + nm, ...extra }); };
      const len = Math.hypot(J2[0] - J1[0], J2[1] - J1[1]);
      // Getriebe
      s.rrect(5.75, 3.2, 1.05, 1.3, { fill: '1C2440', line: C.pu, lw: 2, rr: 0.1, name: '!!gg' });
      s.text('Getriebe', { x: 5.6, y: 4.6, w: 1.35, h: 0.35, size: 14, bold: true, color: C.pu, align: 'center', name: '!!tgg' });
      s.rect(6.8, J1[1] - 0.32, 0.1, 0.64, { fill: '9AA6B5', name: '!!fl1' });
      // Hinterachse (Seitenansicht: Rad + Achsgehäuse)
      s.oval(J2[0] + 0.15, J2[1] - 1.0 + 0.0, 2.0, 2.0, { line: '3C4656', lw: 3, name: '!!rad' });
      s.oval(J2[0] + 0.55, J2[1] - 0.6, 1.2, 1.2, { fill: '3A2E14', line: 'C9A227', lw: 2, name: '!!diffg' });
      s.text('Hinterachse', { x: J2[0] + 0.25, y: 5.05, w: 1.8, h: 0.35, size: 14, bold: true, color: 'C9A227', align: 'center', name: '!!tha' });
      s.rect(J2[0] + 0.4, J2[1] - 0.32, 0.1, 0.64, { fill: '9AA6B5', name: '!!fl2' });
      // Welle: Gelenk 1, Schiebestück, Rohr, Gelenk 2
      const cut = off ? 0.45 : 0;
      bar(0.15, 1.35, 0.34, '6E7888', 'sleeve');
      bar(1.2, len - 0.12 - cut, 0.22, '9AA6B5', 'tube');
      for (const [nm, d] of [['j1', 0.02], ['j2', len - 0.02 - cut]]) {
        const [x, y] = at(d);
        s.oval(x - 0.2, y - 0.2, 0.4, 0.4, { fill: '1B1F26', line: C.or, lw: 3, name: '!!' + nm });
        s.rect(x - 0.03, y - 0.15, 0.06, 0.3, { fill: C.or, rotate: deg, name: '!!' + nm + 'a' });
        s.rect(x - 0.15, y - 0.03, 0.3, 0.06, { fill: C.or, rotate: deg, name: '!!' + nm + 'b' });
      }
      // Beschriftungen
      const [sx, sy] = at(0.75), [jx, jy] = at(len - 0.02 - cut);
      s.text('Kreuzgelenk', { x: J1[0] - 0.75, y: 2.6, w: 1.5, h: 0.32, size: 13, bold: true, color: C.or, align: 'center', name: '!!tj1' });
      s.text('Schiebestück', { x: sx - 0.8, y: sy + 0.35, w: 1.6, h: 0.32, size: 13, bold: true, color: C.mut, align: 'center', name: '!!tsl' });
      s.text('Kreuzgelenk', { x: jx - 0.9, y: jy - 0.7, w: 1.5, h: 0.32, size: 13, bold: true, color: C.or, align: 'center', name: '!!tj2' });
      if (i === 1) {
        s.lineS(J2[0] + 1.15, 5.0, J2[0] + 1.15, 4.35, { color: C.bl, lw: 3, endArrow: 'triangle', name: '!!pfeil' });
        s.text('federt ein', { x: J2[0] - 0.7, y: 5.45, w: 1.8, h: 0.35, size: 15, bold: true, color: C.bl, align: 'right', name: '!!tfed' });
      }
      if (off) {
        s.text('abgeflanscht', { x: J2[0] - 1.7, y: J2[1] + 0.4, w: 1.9, h: 0.4, size: 16, bold: true, color: C.red, align: 'center', name: '!!toff' });
        s.lineS(8.9, 2.25, 7.7, 2.25, { color: C.red, lw: 3, endArrow: 'triangle', name: '!!pab' });
        s.text('beim Abschleppen', { x: 9.0, y: 2.05, w: 2.2, h: 0.4, size: 15, bold: true, color: C.red, name: '!!tab' });
      }
    },
  });
};
