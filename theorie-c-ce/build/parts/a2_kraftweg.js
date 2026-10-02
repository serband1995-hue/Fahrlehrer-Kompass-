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
      'Das Getriebe übersetzt: viel Kraft beim Anfahren, hohes Tempo auf der Autobahn. Lkw haben 12 und mehr Gänge.',
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
      '▶ „Über die Achswellen kommt die Kraft an die Räder. Fertig ist der Weg der Kraft.“\n💡 Merksatz: Motor – Kupplung – Getriebe – Welle – Differenzial – Rad.\n➜ „Schauen wir uns die einzelnen Teile genauer an. Zuerst der Motor.“',
    ],
    legend: 'Fahrgestell von oben · Front links · schematisch',
    scene: async (s, i) => {
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
};
