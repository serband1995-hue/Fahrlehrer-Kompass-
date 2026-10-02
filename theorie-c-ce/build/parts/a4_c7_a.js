// Abend 4 · C7: Kapitel 1 Haftung, Kapitel 2 Widerstände und Energie
const { C, sec, base, kick, title, card, point, CLICK, quiz, steps, svgImg, chapter, lkw, motion, veh } = require('../gs');
const { lkwSide } = require('../lkw');

sec('c7h', 'C7  ·  HAFTUNG', C.bl, 'bg_blue.jpg');
sec('c7w', 'C7  ·  WIDERSTÄNDE UND ENERGIE', C.or, 'bg_or.jpg');

// Lkw-Rad von der Seite (dreht sich): Reifen mit Profilblöcken, Felge, Radmuttern, rote Markierung
function wheelSvg() {
  let s = `<circle cx="200" cy="200" r="196" fill="#15191F"/>`;
  for (let k = 0; k < 28; k++) { const a = k * 360 / 28; s += `<rect x="190" y="2" width="20" height="22" rx="4" fill="#2A313B" transform="rotate(${a} 200 200)"/>`; }
  s += `<circle cx="200" cy="200" r="150" fill="#1E242C"/><circle cx="200" cy="200" r="118" fill="#A9B3C0" stroke="#7D8898" stroke-width="6"/>`;
  s += `<circle cx="200" cy="200" r="78" fill="#8D98A6"/>`;
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; s += `<circle cx="${200 + 56 * Math.cos(a)}" cy="${200 + 56 * Math.sin(a)}" r="9" fill="#58626F"/>`; }
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.5; s += `<ellipse cx="${200 + 98 * Math.cos(a)}" cy="${200 + 98 * Math.sin(a)}" rx="13" ry="9" fill="#5E6876" transform="rotate(${a * 180 / Math.PI} ${200 + 98 * Math.cos(a)} ${200 + 98 * Math.sin(a)})"/>`; }
  s += `<circle cx="200" cy="200" r="26" fill="#6E7888"/><circle cx="200" cy="34" r="13" fill="#FF5C5C"/>`;
  return s;
}

const main = async (deck) => {
  // ===== KAPITEL 1 HAFTUNG =====
  await chapter(deck, 'c7h', { num: 1, ttl: 'Haftung', sub: 'Alles, was der Lkw tut, geht über die Reifen – und die Haftung ist begrenzt.', ico: 'LuCircleDot', notes:
    '▶ Sagen: „Kapitel 1: Haftung. Bremsen, Lenken, Antreiben – alles muss durch ein paar handflächengroße Stellen, wo die Reifen die Straße berühren.“\n🖱 Keine Klicks.\n➜ „Schauen wir uns ein einzelnes Rad an.“' });

  // ===== HAFTREIBUNG / GLEITREIBUNG (fließend: Rad rollt, dann blockiert) =====
  {
    const wheel = await svgImg(wheelSvg(), 400, 400, 1);
    const R = 1.05, GY = 4.2, X0 = 6.85;
    const fr = (x, lock, o = {}) => ({ t: { x, lock }, ...o });
    const XL = 9.0; // hier blockiert das Rad
    await motion(deck, 'c7h', {
      kicker: 'Haftung', ttl: 'Rollen oder rutschen', dur: 450, holdDur: 700,
      question: 'Was bremst stärker: ein Rad, das gerade noch rollt – oder ein blockiertes Rad?',
      answer: 'Das Rad, das noch rollt. Haftreibung ist größer als Gleitreibung – und nur ein rollendes Rad lässt sich lenken.',
      legend: 'Schematisch · rote Markierung zeigt die Drehung des Rads',
      frames: [
        fr(X0, false, { hold: true, cap: 'Das Rad rollt. Wo der Reifen die Straße berührt, steht er kurz still – er haftet.', note: '▶ Sagen: „Ein Lkw-Rad. Achtet auf den roten Punkt.“\n❓ Frage auf der Folie vorlesen und abstimmen lassen: Wer meint „rollendes Rad“, wer „blockiertes Rad“?\n🖱 Klick: Das Rad rollt los (läuft von selbst).\n➜ „Schaut, was passiert.“' }),
        fr(X0 + 0.55, false), fr(X0 + 1.1, false), fr(X0 + 1.65, false),
        fr(XL, false, { hold: true, cap: 'Bremsen bis kurz vor dem Blockieren: Haftreibung – hier ist die Bremskraft am größten.', note: '▶ „Solange das Rad rollt, haftet der Reifen an der Straße. Das heißt Haftreibung. Wenn ich kräftig bremse, aber das Rad gerade noch dreht, ist die Bremskraft am größten.“\n✅ Lehrbuchwissen: Haftreibung ist größer als Gleitreibung.\n🖱 Klick: Jetzt blockiert das Rad (läuft von selbst).\n➜ „Und jetzt tritt jemand zu fest drauf …“' }),
        fr(XL + 0.6, true, { cap: 'Rad blockiert: Es dreht sich nicht mehr und rutscht über die Straße – Gleitreibung.' }), fr(XL + 1.15, true), fr(XL + 1.6, true), fr(XL + 1.95, true),
        fr(XL + 2.2, true, { hold: true, answer: true, cap: 'Gleitreibung bremst schwächer, der Reifen radiert – und ein rutschendes Rad lässt sich nicht lenken.', note: '▶ „Das Rad steht, der Reifen rutscht. Jetzt wirkt nur noch Gleitreibung – die ist kleiner. Der Bremsweg wird länger, und vor allem: Ein rutschendes Rad hat keine Seitenführung, der Lkw lässt sich nicht mehr lenken.“\n✅ Lehrbuchwissen. Deshalb haben Lkw ABS: Es hält die Räder an der Grenze zum Blockieren (siehe Abend 3, C6).\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Wie viel Haftung gibt es überhaupt? Das hängt von der Straße ab.“' }),
      ],
      scene: async (s, { x, lock }) => {
        // Straße
        s.rrect(5.65, GY + 0.02, 7.4, 0.62, { fill: C.road, rr: 0.1, name: '!!str' });
        s.rect(5.65, GY + 0.02, 7.4, 0.04, { fill: '3C4656', name: '!!strK' });
        for (let k = 0; k < 6; k++) s.rrect(5.95 + k * 1.2, GY + 0.33, 0.6, 0.05, { fill: C.mark, ft: 40, rr: 0.5, name: '!!sm' + k });
        // Bremsspur
        const sw = lock ? Math.max(0.02, x - XL) : 0.02;
        s.rrect(XL, GY - 0.03, sw, 0.13, { fill: '050608', ft: lock ? 0 : 100, rr: 0.5, name: '!!spur' });
        // Rad: Drehung = Weg / Radius (nur solange es rollt)
        const rollX = lock ? XL : x;
        const rot = Math.round(((rollX - X0) / R) * 180 / Math.PI) % 360;
        s.img(wheel, { x: x - R, y: GY - 2 * R, w: 2 * R, h: 2 * R, rotate: rot, name: '!!rad' });
        // Kontaktstelle
        s.oval(x - 0.22, GY - 0.08, 0.44, 0.16, { fill: lock ? C.red : C.gr, glow: 6, glowColor: lock ? C.red : C.gr, name: '!!kontakt' });
        // Anzeigen unten
        s.rrect(5.65, 5.15, 4.1, 1.45, { fill: C.card, line: C.line, rr: 0.14, name: '!!bkc' });
        s.text('Bremskraft', { x: 5.9, y: 5.25, w: 3.6, h: 0.32, size: 14, bold: true, color: C.txt, name: '!!bk' });
        s.rrect(5.9, 5.62, 3.6, 0.34, { fill: '1A212C', line: C.line, rr: 0.5, name: '!!bkbg' });
        const bkw = x <= X0 + 0.01 ? 0.12 : (lock ? 2.55 : 3.54);
        s.rrect(5.93, 5.65, bkw, 0.28, { fill: lock ? C.or : C.gr, rr: 0.5, name: '!!bkv' });
        s.text(lock ? 'Gleitreibung – kleiner' : (x <= X0 + 0.01 ? 'Rad rollt frei' : 'Haftreibung – am größten'), { x: 5.9, y: 6.05, w: 3.6, h: 0.35, size: 14, bold: true, color: lock ? C.or : (x <= X0 + 0.01 ? C.mut : C.gr), name: '!!bkt' });
        s.rrect(9.95, 5.15, 3.1, 1.45, { fill: C.card, line: lock ? C.red : C.line, rr: 0.14, name: '!!lkc' });
        s.text('Lenkbar?', { x: 10.2, y: 5.25, w: 2.6, h: 0.32, size: 14, bold: true, color: C.txt, name: '!!lk' });
        s.text(lock ? '✗  nein' : '✓  ja', { x: 10.2, y: 5.6, w: 2.6, h: 0.8, size: 34, bold: true, color: lock ? C.red : C.gr, valign: 'middle', name: '!!lkv' });
      },
    });
  }

  // ===== FAHRBAHN UND BREMSWEG (Morph) =====
  {
    const MU = [[0.8, 'Trocken', '3A4250', 12], [0.5, 'Nass', '2D4A66', 20], [0.2, 'Schnee', 'C9D3DF', 49], [0.1, 'Eis', '9FD4F0', 98]];
    const SC = 0.055, X0 = 5.9;
    await steps(deck, 'c7h', {
      kicker: 'Haftung', ttl: 'Die Straße entscheidet',
      list: ['Trockener Asphalt', 'Nasse Straße', 'Schnee', 'Eis'],
      ask: { q: 'Bremsweg aus 50 km/h: Wie viel länger ist er auf Eis als auf trockener Straße?', a: 'Etwa achtmal so lang – rund 100 statt 12 Meter.', at: 3 },
      caps: [
        'Trockener Asphalt: Der Reifen haftet sehr gut. Aus 50 km/h steht der Lkw nach etwa 12 Metern Bremsweg.',
        'Nasse Straße: Ein Wasserfilm zwischen Reifen und Straße. Etwa 20 Meter.',
        'Schnee: Nur noch ein Viertel der Haftung. Etwa 50 Meter.',
        'Eis: Fast keine Haftung. Rund 100 Meter – achtmal so lang wie trocken.',
      ],
      notes: [
        '▶ Sagen: „Wie viel Haftung ein Reifen hat, hängt vor allem von der Straße ab. Fachleute sagen Haftreibungszahl – wir sagen einfach Haftung.“\n❓ Frage auf der Folie vorlesen, schätzen lassen.\n✅ Richtwerte Haftreibungszahl: trocken etwa 0,8 · nass 0,5 · Schnee 0,2 · Eis 0,1 (Lehrbuchwerte). Bremsweg nur durch Haftung begrenzt: v² / (2 · Haftung · 9,81 m/s²). 50 km/h = 13,9 m/s → trocken etwa 12 m.\n💡 Vereinfachte Rechnung ohne Reaktions- und Ansprechzeit. Echte Lkw-Bremswege sind länger (siehe Abend 3).\n➜ „Jetzt regnet es.“',
        '▶ „Nasse Straße: etwa 20 Meter. Besonders glatt ist es beim ersten Regen nach langer Trockenheit – Staub, Öl und Gummi machen einen Schmierfilm.“\n✅ Haftung etwa 0,5 → 13,9² / (2 · 0,5 · 9,81) ≈ 20 m.\n➜ „Und im Winter?“',
        '▶ „Schnee: etwa 50 Meter.“\n✅ Haftung etwa 0,2 → rund 49 m.\n➜ „Und auf Eis?“',
        '▶ „Auf Eis: rund 100 Meter – achtmal so weit wie auf trockener Straße. Deshalb: Bei Glätte Tempo runter und viel Abstand.“\n✅ Haftung etwa 0,1 → rund 98 m. Achtmal so lang, weil die Haftung nur ein Achtel ist.\n➜ „Die Haftung muss für alles reichen – Bremsen UND Lenken. Wie das zusammenhängt, zeigt der Haftungskreis.“',
      ],
      legend: 'Richtwerte · Bremsweg aus 50 km/h, nur Haftung gerechnet, ohne Reaktionszeit',
      scene: async (s, i) => {
        const [mu, lab, col, bw] = MU[i];
        // Straßenbelag
        s.rrect(X0, 1.75, 7.0, 1.0, { fill: col, rr: 0.14, name: '!!belag' });
        s.text(lab, { x: X0 + 0.25, y: 1.75, w: 3.5, h: 1.0, size: 28, bold: true, color: i >= 2 ? C.dark : C.txt, valign: 'middle', name: '!!blab' });
        s.text('Haftung ' + String(mu).replace('.', ','), { x: X0 + 3.6, y: 1.75, w: 3.2, h: 1.0, size: 22, bold: true, color: i >= 2 ? C.dark : C.txt, align: 'right', valign: 'middle', name: '!!bmu' });
        // Haftungs-Balken
        s.text('Haftung', { x: X0, y: 3.05, w: 2, h: 0.35, size: 14, bold: true, color: C.mut, name: '!!ht' });
        s.rrect(X0, 3.42, 7.0, 0.36, { fill: '1A212C', line: C.line, rr: 0.5, name: '!!hbg' });
        s.rrect(X0 + 0.03, 3.45, 6.94 * mu / 0.8, 0.3, { fill: C.bl, rr: 0.5, name: '!!hv' });
        // Bremsweg-Balken
        s.text('Bremsweg aus 50 km/h', { x: X0, y: 4.05, w: 4, h: 0.35, size: 14, bold: true, color: C.mut, name: '!!bt' });
        s.rrect(X0, 4.45, Math.max(0.3, bw * SC), 0.55, { fill: C.red, rr: 0.5, name: '!!bw' });
        s.text('≈ ' + bw + ' m', { x: X0 + Math.max(0.3, bw * SC) + 0.15, y: 4.45, w: 1.6, h: 0.55, size: 22, bold: true, color: C.txt, valign: 'middle', name: '!!bwt' });
        // Lkw (klein) am Ende des Bremswegs
        veh(s, 'truck.png', X0 + Math.max(0.3, bw * SC) - 0.05, 5.65, 90, '!!tr', { scale: 0.32 });
        s.rect(X0, 5.35, 0.04, 0.6, { fill: C.mut, name: '!!start' });
        s.text('Bremsbeginn', { x: X0 - 0.1, y: 6.0, w: 1.6, h: 0.3, size: 11, color: C.dim, name: '!!startt' });
      },
    });
  }

  // ===== HAFTUNGSKREIS (fließend) =====
  {
    const CX = 9.05, CY = 4.0, R0 = 1.8;
    const fr = (b, q, mu, o = {}) => ({ t: { b, q, mu }, ...o });
    const SURF = { 0.8: 'Trockene Straße', 0.5: 'Nasse Straße', 0.3: 'Matsch', 0.2: 'Schnee' };
    await motion(deck, 'c7h', {
      kicker: 'Haftung', ttl: 'Der Haftungskreis', dur: 450, holdDur: 750,
      question: 'Könnt ihr gleichzeitig voll bremsen und kräftig lenken?',
      answer: 'Nein. Die Haftung reicht nur einmal: Bremsen und Lenken teilen sie sich. Wird es zu viel, rutscht der Lkw.',
      legend: 'Kreis = Haftung zwischen Reifen und Straße · Punkt = was ihr gerade verlangt',
      frames: [
        fr(0, 0, 0.8, { hold: true, cap: 'Der Kreis ist die ganze Haftung, die die Reifen haben. Mehr geht nicht.', note: '▶ Sagen: „Stellt euch die Haftung als Kreis vor. Der Punkt zeigt, was ihr gerade von den Reifen verlangt. Bleibt der Punkt im Kreis, haftet der Lkw. Geht er raus, rutscht er.“\n❓ Frage auf der Folie stellen.\n✅ Lehrbuchwissen: Haftungskreis („Kammscher Kreis“). Längskraft (Bremsen, Antreiben) und Seitenkraft (Lenken) teilen sich die Haftung.\n🖱 Klick: Der Lkw bremst (läuft von selbst).\n➜ „Erst bremsen wir.“' }),
        fr(0.3, 0, 0.8, { cap: 'Bremsen: Der Punkt wandert nach unten.' }), fr(0.6, 0, 0.8),
        fr(0.9, 0, 0.8, { hold: true, cap: 'Starke Bremsung: Die Haftung ist fast ganz ausgenutzt.', note: '▶ „Starke Bremsung – fast die ganze Haftung ist weg. Für das Lenken bleibt kaum noch etwas übrig.“\n🖱 Klick: Jetzt wird zusätzlich gelenkt (läuft von selbst).\n➜ „Und jetzt lenkt ihr dazu – zum Beispiel um einem Hindernis auszuweichen.“' }),
        fr(0.9, 0.2, 0.8, { cap: 'Dazu lenken: Der Punkt geht nach rechts …' }), fr(0.9, 0.38, 0.8),
        fr(0.9, 0.55, 0.8, { hold: true, answer: true, cap: 'Zu viel: Der Punkt ist außerhalb des Kreises. Die Reifen rutschen – der Lkw schiebt geradeaus oder bricht aus.', note: '▶ „Bremsen plus Lenken ist mehr, als die Reifen hergeben. Der Lkw rutscht – über die Vorderräder schiebt er geradeaus, über die Hinterräder bricht er aus.“\n✅ Lehrbuchwissen. ABS hilft, weil es die Räder nicht blockieren lässt – aber auch ABS kann die Haftung nicht vergrößern.\n🖱 Klick: Nächster Fall – die Straße wird nass (läuft von selbst).\n➜ „Jetzt dasselbe mit einer normalen Bremsung – aber das Wetter ändert sich.“' }),
        fr(0.35, 0, 0.8, { cap: 'Nur eine mittlere Bremsung auf trockener Straße – kein Problem.' }),
        fr(0.35, 0, 0.5, { cap: 'Es regnet: Der Kreis wird kleiner …' }), fr(0.35, 0, 0.3, { cap: 'Matsch: noch kleiner …' }),
        fr(0.35, 0, 0.2, { hold: true, cap: 'Schnee: Schon die mittlere Bremsung ist zu viel – der Lkw rutscht.', note: '▶ „Auf nasser Straße wird der Kreis kleiner, auf Schnee winzig. Dieselbe Bremsung, die eben noch harmlos war, ist jetzt zu viel.“\n💡 Merksatz: Bei Nässe und Glätte alles sanfter – bremsen, lenken, Gas geben. Und nie zugleich stark bremsen und stark lenken.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Prüfen wir das mit einer Prüfungsfrage.“' }),
      ],
      scene: async (s, { b, q, mu }) => {
        const Rk = R0 * mu / 0.8;
        const out = Math.hypot(b, q) * R0 > Rk + 0.001;
        // Achsen
        s.lineS(CX - 2.3, CY, CX + 2.3, CY, { color: C.line, lw: 1.25, name: '!!ax1' });
        s.lineS(CX, CY - 2.25, CX, CY + 2.25, { color: C.line, lw: 1.25, name: '!!ax2' });
        s.text('Antreiben', { x: CX - 1, y: CY - 2.6, w: 2, h: 0.32, size: 13, color: C.dim, align: 'center', name: '!!la' });
        s.text('Bremsen', { x: CX - 1, y: CY + 2.28, w: 2, h: 0.32, size: 13, bold: true, color: C.mut, align: 'center', name: '!!lb' });
        s.text('Lenken', { x: CX - 3.3, y: CY - 0.16, w: 0.95, h: 0.32, size: 13, color: C.dim, align: 'right', name: '!!ll' });
        s.text('Lenken', { x: CX + 2.38, y: CY - 0.16, w: 1.0, h: 0.32, size: 13, bold: true, color: C.mut, name: '!!lr' });
        // Haftungskreis
        s.oval(CX - Rk, CY - Rk, 2 * Rk, 2 * Rk, { fill: C.bl, ft: 82, line: C.bl, lw: 2.5, name: '!!kreis' });
        // Lkw in der Mitte (dreht sich beim Rutschen)
        veh(s, 'truck.png', CX, CY, out ? 22 : 0, '!!tr', { scale: 0.36 });
        // Pfeil vom Mittelpunkt zum Punkt
        const dx = q * R0, dy = b * R0, L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
        s.rrect(CX + dx / 2 - Math.max(L, 0.02) / 2, CY + dy / 2 - 0.035, Math.max(L, 0.02), 0.07, { fill: out ? C.red : C.gr, ft: L < 0.05 ? 100 : 0, rr: 0.5, rotate: Math.round(ang), name: '!!pf' });
        s.oval(CX + dx - 0.17, CY + dy - 0.17, 0.34, 0.34, { fill: out ? C.red : C.gr, line: C.white, lw: 2, glow: 10, glowColor: out ? C.red : C.gr, name: '!!pt' });
        // Anzeige
        s.text(SURF[mu], { x: 10.9, y: 1.6, w: 2.2, h: 0.35, size: 15, bold: true, color: C.bl, align: 'right', name: '!!surf' });
        s.text(out ? 'RUTSCHT!' : 'haftet', { x: 10.9, y: 1.95, w: 2.2, h: 0.5, size: out ? 24 : 18, bold: true, color: out ? C.red : C.gr, align: 'right', name: '!!st' });
      },
    });
  }
};
module.exports = main; module.exports.wheelSvg = wheelSvg;
