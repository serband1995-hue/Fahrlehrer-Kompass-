// Teil A: Wenden & Einparken (Morph-Schritte), Lektion-9-Abschluss, Pause, Gruppen-Auswertung Park-Streife
const { C, base, kick, title, card, badge, quiz, steps, roadH, veh, foot } = require('./gs');
const { icon } = require('./lib');

// gemeinsame Straße für Wenden (zwei Fahrstreifen, Gehwege)
function streetWenden(s) {
  s.rect(5.5, 1.95, 7.83, 0.55, { fill: '1B212A', name: '!!sw1' });
  s.rect(5.5, 5.2, 7.83, 0.55, { fill: '1B212A', name: '!!sw2' });
  roadH(s, 5.5, 2.5, 7.83, 2.7, { name: 'rw' });
  s.text('Fahrtrichtung →', { x: 11.0, y: 4.82, w: 2.2, h: 0.3, size: 12, color: C.dim, align: 'right', name: '!!dir1' });
  s.text('← Gegenrichtung', { x: 5.6, y: 2.58, w: 2.4, h: 0.3, size: 12, color: C.dim, name: '!!dir2' });
}
const SC = 1.5;
// Positionen (Mittelpunkt x, y, Drehung) für Wenden in drei Zügen
const WP = [[7.2, 4.62, 90], [7.2, 4.62, 90], [8.5, 3.48, 340], [9.4, 4.22, 300], [7.7, 3.2, 270], [6.5, 3.2, 270]];

module.exports = async (deck) => {
  // ===== WENDEN IN DREI ZÜGEN =====
  await steps(deck, 'wei', {
    kicker: 'Live · Wenden in drei Zügen', ttl: 'Umdrehen, wo es eng ist',
    list: ['Rechts ranfahren, anhalten', 'Rundum schauen, Blinker links', 'Vorwärts: voll links einschlagen', 'Rückwärts: voll rechts einschlagen', 'Vorwärts: einfädeln, Blinker aus', 'Fertig – zügig weiter'],
    caps: [
      'Straße zu schmal, um in einem Zug zu wenden? Erst rechts ranfahren und anhalten.',
      'Innenspiegel, Außenspiegel, Blinker links, Schulterblick links. Erst losfahren, wenn beide Richtungen frei sind.',
      'Langsam vorwärts, Lenkrad voll nach links. Kurz vor dem Bordstein anhalten – nicht anstoßen.',
      'Rückwärtsgang. Rundum schauen, auch nach hinten! Lenkrad voll nach rechts, langsam zurück bis kurz vor den anderen Bordstein.',
      'Vorwärts, Lenkrad links, auf die rechte Spur der Gegenrichtung. Blinker aus.',
      'Geschafft. Während des ganzen Manövers gilt: Gefährdung anderer ausgeschlossen (§ 9 Abs. 5).',
    ],
    notes: [
      '▶ Sagen: „Ihr habt euch verfahren. Die Straße ist schmal. Wie dreht ihr um?“\n❓ „Wer hat das schon mal gemacht?“\n✅ Wenden in drei Zügen (Umkehren mit Vor- und Zurückstoßen). Erst rechts ranfahren.\n🖱 Jeder Klick = nächster Schritt (die Folien wechseln mit Morph-Animation, das Auto bewegt sich mit).\n➜ „Bevor ihr losfahrt …“',
      '▶ „Rundum schauen: Spiegel, Blinker links, Schulterblick links. Und nach rechts schauen – auch von dort kann jemand kommen.“\n💡 Ihr blockiert gleich die ganze Straße. Darum: nur wenn wirklich frei.\n➜ „Erster Zug: vorwärts.“',
      '▶ „Langsam rollen, Lenkrad schnell voll nach links. Kurz vor dem Bordstein stehen bleiben.“\n💡 Bordstein nicht berühren: Reifen und Felge leiden, in der Prüfung ist das ein Fehler.\n➜ „Zweiter Zug: rückwärts.“',
      '▶ „Jetzt rückwärts. Vorher Lenkrad nach rechts drehen – im Stand nur, wenn es leicht geht, sonst beim Rollen. Rundum schauen, vor allem nach hinten.“\n❓ „Warum rundum?“ ✅ Weil von beiden Seiten jemand kommen kann und Fußgänger hinter dem Auto stehen können.\n➜ „Dritter Zug.“',
      '▶ „Vorwärts, Lenkrad links, und ihr seid in der Gegenrichtung. Blinker aus nicht vergessen.“\n➜ „Wichtig dabei …“',
      '▶ „Wenden heißt: Gefährdung anderer ausgeschlossen. Ihr dürft niemanden bremsen oder ausweichen lassen.“\n✅ Verboten: auf Autobahn und Kraftfahrstraße (§ 18 Abs. 7), bei Zeichen 272. An unübersichtlichen Stellen praktisch unzulässig, weil eine Gefährdung dort nicht ausgeschlossen werden kann.\n💡 Einfacher: um den Block fahren oder in eine Einfahrt/Einmündung rückwärts hinein.\n➜ „Und noch ein Klassiker der Prüfung: rückwärts einparken.“',
    ],
    legend: 'Draufsicht · schematisch',
    scene: async (s, i) => {
      streetWenden(s);
      const [x, y, r] = WP[i];
      veh(s, 'car_y.png', x, y, r, '!!car', { scale: SC });
      if (i === 1 || i === 2) veh(s, 'blinkL.png', x, y, r, '!!blk', { scale: SC });
      // Spur des Manövers (gestrichelt), wächst mit
      const pts = WP.slice(0, i + 1);
      for (let k = 1; k < pts.length; k++) {
        const [a, b] = [pts[k - 1], pts[k]];
        if (a[0] === b[0] && a[1] === b[1]) continue;
        s.lineS(a[0], a[1], b[0], b[1], { color: C.gr, lw: 2, dash: 'sysDash', name: '!!tr' + k });
      }
      if (i === 1) {
        s.oval(x - 0.08, y - 0.08, 0.16, 0.16, { fill: 'FFFFFF', name: '!!eye' });
        s.text('rundum schauen!', { x: x - 1.0, y: y + 0.6, w: 2.0, h: 0.3, size: 13, bold: true, color: C.gr, align: 'center', name: '!!eyet' });
      }
    },
  });
  // ===== RÜCKWÄRTS EINPARKEN LÄNGS =====
  const EP = [[6.9, 3.15, 90], [11.8, 3.42, 90], [11.6, 3.42, 90], [10.25, 3.82, 45], [9.55, 4.3, 45], [9.15, 4.6, 90], [9.1, 4.6, 90]];
  await steps(deck, 'wei', {
    kicker: 'Live · Rückwärts einparken', ttl: 'Längs in die Lücke',
    list: ['Lücke prüfen', 'Neben den Vordermann, Blinker rechts', 'Zurück bis Heck auf Heck', 'Voll rechts bis ca. 45°', 'Gerade zurück', 'Voll links einschwenken', 'Ausrichten, Blinker aus'],
    caps: [
      'Passt das? Faustregel: Die Lücke sollte etwa anderthalb Autolängen lang sein.',
      'Parallel neben das vordere Auto fahren, Abstand etwa 0,5 bis 1 m. Blinker rechts – die anderen wissen, was du vorhast.',
      'Rückwärtsgang, rundum schauen. Langsam zurück, bis dein Heck auf Höhe des Hecks vom Vordermann ist.',
      'Lenkrad voll nach rechts. Langsam zurück, bis dein Auto etwa im 45°-Winkel steht.',
      'Lenkrad gerade. Zurück, bis deine rechte Vorderecke am Heck des Vordermanns vorbei ist. Rechts schauen!',
      'Lenkrad voll nach links. Das Auto schwenkt ein und steht gerade in der Lücke.',
      'Lenkrad gerade, nach vorn ausrichten, Abstand vorne und hinten lassen. Blinker aus.',
    ],
    notes: [
      '▶ Sagen: „Rückwärts einparken ist eine Grundfahraufgabe in der Prüfung. Heute lernt ihr den Ablauf im Kopf.“\n❓ „Wie groß muss die Lücke sein?“\n✅ Faustregel etwa anderthalb Autolängen; mit Übung geht es auch kürzer.\n🖱 Jeder Klick = nächster Schritt.\n➜ „Erst neben den Vordermann.“',
      '▶ „Parallel daneben, ein halber bis ein Meter Abstand. Blinker rechts, damit der Hintermann Platz lässt.“\n💡 Zu nah = Kotflügel streift, zu weit = du landest schräg.\n➜ „Rückwärtsgang.“',
      '▶ „Rundum schauen. Langsam zurück, bis dein Heck auf Höhe des anderen Hecks ist.“\n💡 Bezugspunkte zeigt euch der Fahrlehrer im Auto – jedes Auto ist etwas anders.\n➜ „Jetzt einlenken.“',
      '▶ „Lenkrad voll rechts. Langsam! Bis ihr ungefähr im 45°-Winkel steht.“\n💡 Merkhilfe vieler Fahrlehrer: Im linken Außenspiegel seht ihr dann das ganze hintere Auto.\n➜ „Kurz gerade.“',
      '▶ „Lenkrad gerade, ein Stück zurück, bis eure rechte Vorderecke am Vordermann vorbei ist.“\n❓ „Wohin schaut ihr jetzt besonders?“ ✅ Nach rechts vorn (Ecke) und nach hinten (Abstand, Bordstein).\n➜ „Und einschwenken.“',
      '▶ „Lenkrad voll links. Das Auto dreht sich in die Lücke.“\n💡 Nicht den Bordstein berühren. Bei Bedarf einmal vor- und zurückkorrigieren – das ist erlaubt.\n➜ „Zum Schluss ausrichten.“',
      '▶ „Gerade stellen, Abstand vorne und hinten lassen, damit die anderen rauskommen. Blinker aus.“\n✅ Rückwärtsfahren: Gefährdung anderer ausgeschlossen, nötigenfalls einweisen lassen (§ 9 Abs. 5). Verboten auf Autobahn und Kraftfahrstraße (§ 18 Abs. 7).\n➜ „Es gibt nicht nur Längsparken.“',
    ],
    legend: 'Draufsicht · schematisch · Bezugspunkte je nach Auto',
    scene: async (s, i) => {
      s.rect(5.5, 1.85, 7.83, 0.55, { fill: '1B212A', name: '!!sw1' });
      roadH(s, 5.5, 2.4, 7.83, 1.6, { name: 'rp', center: false });
      s.rect(5.5, 4.0, 7.83, 1.2, { fill: C.road2, name: '!!park' });
      s.rect(5.5, 5.2, 7.83, 0.12, { fill: C.curb, name: '!!curb' });
      s.rect(5.5, 5.32, 7.83, 0.5, { fill: '1B212A', name: '!!sw2' });
      veh(s, 'car_r.png', 6.6, 4.6, 90, '!!pr', { scale: 1.5 });
      veh(s, 'car_b.png', 11.6, 4.6, 90, '!!pf', { scale: 1.5 });
      const [x, y, r] = EP[i];
      veh(s, 'car_y.png', x, y, r, '!!car', { scale: 1.5 });
      if (i >= 1 && i <= 5) veh(s, 'blinkR.png', x, y, r, '!!blk', { scale: 1.5 });
      if (i === 0) {
        s.lineS(7.55, 5.55, 10.65, 5.55, { color: C.gr, lw: 2.5, beginArrow: 'triangle', endArrow: 'triangle', name: '!!gap' });
        s.text('ca. 1,5 Autolängen', { x: 7.6, y: 5.85, w: 3.0, h: 0.32, size: 14, bold: true, color: C.gr, align: 'center', name: '!!gapt' });
      }
      if (i === 1) s.text('0,5–1 m Abstand', { x: 10.9, y: 2.55, w: 2.2, h: 0.32, size: 14, bold: true, color: C.gr, name: '!!abst' });
      if (i === 3) s.text('ca. 45°', { x: 11.25, y: 2.95, w: 1.3, h: 0.32, size: 15, bold: true, color: C.gr, name: '!!winkel' });
    },
  });
  // ===== QUER UND SCHRÄG PARKEN =====
  {
    const s = base(deck, 'wei', { notes: '▶ Sagen: „Auf Parkplätzen parkt ihr meist quer oder schräg.“\n🖱 Klick 1–3: je eine Parkart.\n✅ Quer: vorwärts rein ist leicht, rückwärts rein ist beim Rausfahren sicherer (bessere Sicht). Schräg: nur vorwärts in Fahrtrichtung, die Lücken sind schon schräg angelegt. Immer: in der Markierung bleiben, Türen der Nachbarn nicht blockieren.\n💡 Auf Parkplätzen gilt die StVO meist auch (öffentlicher Verkehrsraum): Rücksicht, Schritttempo empfohlen, rechts vor links nur wenn es echte Straßen sind.\n➜ „Kurz testen.“' });
    kick(s, 'Parken auf dem Parkplatz'); title(s, 'Quer, schräg, rückwärts?');
    const P = [['Quer · vorwärts', 'Leicht hinein, schwer hinaus: Beim Rückwärts-Ausparken siehst du wenig.', 'LuArrowUp'], ['Quer · rückwärts', 'Schwerer hinein, aber sicherer hinaus: Du fährst vorwärts mit guter Sicht weg.', 'LuArrowDown'], ['Schräg', 'Nur vorwärts, in Fahrtrichtung. Die Markierung zeigt den Winkel.', 'LuArrowUpRight']];
    for (let i = 0; i < 3; i++) {
      const x = 0.7 + i * 4.1;
      card(s, x, 2.0, 3.85, 4.4, {}, { fx: 'rise', c: true, dur: 450 });
      // Mini-Parkfeld
      for (let k = 0; k < 3; k++) {
        if (i < 2) s.rect(x + 0.55 + k * 0.95, 2.35, 0.04, 1.55, { fill: C.mark }, { fx: 'fade', dur: 150 });
        else s.rect(x + 0.75 + k * 0.95, 2.35, 0.04, 1.6, { fill: C.mark, rotate: 30 }, { fx: 'fade', dur: 150 });
      }
      veh(s, 'car_y.png', x + 1.97, 3.12, i === 0 ? 0 : i === 1 ? 180 : 30, undefined, { scale: 1.05, anim: { fx: 'fade', dur: 200 } });
      s.text(P[i][0], { x: x + 0.3, y: 4.25, w: 3.3, h: 0.55, size: 24, bold: true, color: C.gr }, { fx: 'fade', dur: 200 });
      s.text(P[i][1], { x: x + 0.3, y: 4.85, w: 3.3, h: 1.4, size: 16.5, color: C.txt }, { fx: 'fade', dur: 200 });
    }
  }
  quiz(deck, 'wei', {
    kicker: 'Frage · Rückwärts', q: 'Du willst rückwärts einparken, siehst hinten aber nichts. Was tust du?',
    opts: ['Langsam zurück, die Sensoren piepen ja', 'Einweisen lassen oder aussteigen und nachsehen', 'Hupen und dann zügig zurücksetzen'], ok: 1,
    why: 'Rückwärts: Gefährdung anderer ausgeschlossen – nötigenfalls einweisen lassen (§ 9 Abs. 5). Kamera und Sensoren helfen, ersetzen den Blick nicht.',
    notes: '▶ Frage vorlesen, abstimmen lassen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. § 9 Abs. 5 StVO: Beim Rückwärtsfahren muss eine Gefährdung anderer ausgeschlossen sein, nötigenfalls hat man sich einweisen zu lassen. Sensoren erfassen z. B. kleine Kinder oder Pfosten nicht immer.\n➜ „Was heißt eigentlich ‚Gefährdung ausgeschlossen‘?“',
  });
};
