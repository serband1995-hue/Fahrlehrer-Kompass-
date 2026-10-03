// Abend 4 · C7: Kapitel 2 Widerstände und Energie
const { C, sec, base, kick, title, point, CLICK, steps, svgImg, chapter, lkw, motion, foot } = require('../gs');
const { lkwSide } = require('../lkw');

sec('c7w', 'C7  ·  WIDERSTÄNDE UND ENERGIE', C.or, 'bg_or.jpg');

// Luftströmung um das Fahrerhaus (geschwungene Linien), Stärke 0..2
function luftSvg(k) {
  const sw = [3, 5, 8][k], op = [0.45, 0.65, 0.85][k], n = [4, 5, 6][k];
  let s = '';
  for (let i = 0; i < n; i++) {
    const y0 = 225 - i * 31, y1 = 78 - i * 12; // vorn tief, über dem Aufbau eng zusammen
    s += `<path d="M 10 ${y0} C 120 ${y0}, 170 ${y0}, 215 ${(y0 + y1) / 2} S 260 ${y1}, 330 ${y1} L 738 ${y1}" fill="none" stroke="#4CC9F0" stroke-opacity="${op}" stroke-width="${sw}" stroke-linecap="round"/>`;
    s += `<path d="M 724 ${y1 - 9} L 740 ${y1} L 724 ${y1 + 9}" fill="none" stroke="#4CC9F0" stroke-opacity="${op}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  // Wirbel hinter dem Aufbau
  s += `<path d="M 742 120 q 14 40 -6 80 q -16 26 -40 8" fill="none" stroke="#4CC9F0" stroke-opacity="${op * 0.6}" stroke-width="${sw * 0.7}" stroke-linecap="round"/>`;
  return s;
}

module.exports = async (deck) => {
  // ===== KAPITEL 2 =====
  await chapter(deck, 'c7w', { num: 2, ttl: 'Widerstände und Energie', sub: 'Was den Lkw bremst, ohne dass ihr bremst – und wie viel Wucht in 18 Tonnen steckt.', ico: 'LuWind', notes:
    '▶ Sagen: „Kapitel 2: Gegen welche Kräfte muss der Motor ankämpfen – und wie viel Energie steckt in einem fahrenden Lkw?“\n🖱 Keine Klicks.\n➜ „Drei Widerstände.“' });

  // ===== DREI WIDERSTÄNDE =====
  {
    const s = base(deck, 'c7w', { notes:
      '▶ Sagen: „Drei Widerstände bremsen den Lkw, auch ohne Bremse. Gegen alle drei muss der Motor arbeiten – das kostet Diesel.“\n' +
      '❓ „Was bremst einen Lkw, wenn ihr vom Gas geht?“ – sammeln.\n' +
      '🖱 Klick 1: Rollwiderstand · Klick 2: Luftwiderstand · Klick 3: Steigungswiderstand.\n' +
      '✅ Lehrbuchwissen (Fahrwiderstände). Zu wenig Reifendruck erhöht den Rollwiderstand und den Verbrauch, der Reifen walkt und wird heiß (siehe Abend 2).\n' +
      '➜ „Der Luftwiderstand hat eine Besonderheit – schauen wir ihn genauer an.“' });
    kick(s, 'Widerstände'); title(s, 'Was den Lkw bremst – ohne Bremse');
    await point(s, 0.7, 2.05, 11.93, 1.3, 'LuCircleDashed', C.or, 'Rollwiderstand –', 'der Reifen verformt sich beim Rollen. Mehr Gewicht und zu wenig Luftdruck = mehr Widerstand.', CLICK, { size: 19 });
    await point(s, 0.7, 3.5, 11.93, 1.3, 'LuWind', C.bl, 'Luftwiderstand –', 'die große Stirnfläche drückt gegen die Luft. Er wächst mit dem Quadrat der Geschwindigkeit.', CLICK, { size: 19 });
    await point(s, 0.7, 4.95, 11.93, 1.3, 'LuMountain', C.red, 'Steigungswiderstand –', 'bergauf zieht die Masse den Lkw zurück. Je schwerer und je steiler, desto mehr.', CLICK, { size: 19 });
    foot(s, 'Im Gefälle dreht sich das um: Dann schiebt die Masse den Lkw nach vorn.');
  }

  // ===== LUFTWIDERSTAND (Morph) =====
  {
    const imgs = [await svgImg(luftSvg(0), 760, 320, 1), await svgImg(luftSvg(1), 760, 320, 1), await svgImg(luftSvg(2), 760, 320, 1)];
    const V = [[60, '× 0,56', 0.56], [80, '× 1', 1], [90, '× 1,27', 1.27]];
    await steps(deck, 'c7w', {
      kicker: 'Luftwiderstand', ttl: 'Schneller kostet viel mehr',
      list: ['60 km/h', '80 km/h', '90 km/h'],
      ask: { q: 'Von 80 auf 90 km/h – um wie viel wächst der Luftwiderstand?', a: 'Um etwa ein Viertel. Er wächst mit dem Quadrat der Geschwindigkeit.', at: 2 },
      caps: [
        'Bei 60 km/h ist der Luftwiderstand nur gut halb so groß wie bei 80 km/h.',
        '80 km/h – das ist unser Vergleichswert.',
        '90 km/h: nur gut 10 Prozent schneller, aber etwa 27 Prozent mehr Luftwiderstand. Das kostet Diesel.',
      ],
      notes: [
        '▶ Sagen: „Die Luft muss um den großen Lkw herum. Das Fahrerhaus ist wie eine Wand von gut 2,5 Metern Breite und fast 4 Metern Höhe.“\n✅ Physik: Luftwiderstand wächst mit dem Quadrat der Geschwindigkeit. (60/80)² = 0,56.\n➜ „Jetzt 80 km/h.“',
        '▶ „80 km/h – das nehmen wir als Vergleich. Dachspoiler und Seitenverkleidungen lenken die Luft um den Aufbau herum und sparen so Diesel.“\n💡 Spoiler richtig einstellen: Er soll die Luft auf Höhe der Aufbau-Oberkante führen.\n➜ „Und bei 90?“',
        '▶ „90 km/h: Ihr seid nur gut 10 Prozent schneller, aber der Luftwiderstand ist um 27 Prozent größer. Und Lkw über 3,5 t dürfen auf der Autobahn ohnehin nur 80 fahren.“\n❓ Frage auf der Folie auflösen.\n✅ Eigene Rechnung: (90/80)² = 1,27. § 18 Abs. 5 Satz 2 Nr. 1 a StVO: Kfz über 3,5 t höchstens 80 km/h auf Autobahnen.\n➜ „Noch stärker bremst den Lkw nur eins: der Berg.“',
      ],
      legend: 'Schematisch · Werte im Verhältnis zu 80 km/h',
      scene: async (s, i) => {
        const [v, lab, f] = V[i];
        s.rrect(5.65, 4.32, 7.4, 0.42, { fill: C.road, rr: 0.1, name: '!!road' });
        s.img(imgs[i], { x: 5.65, y: 1.45, w: 7.6, h: 3.2, name: '!!luft' });
        await lkw(s, { L: 4.6, axles: [0.65, 3.55], boxH: 1.45, floor: 0.7 }, { x: 8.25, gy: 4.38, k: 0.95, name: '!!lkw' });
        s.text(v + ' km/h', { x: 5.7, y: 1.5, w: 3.0, h: 0.55, size: 28, bold: true, color: C.txt, name: '!!v' });
        s.text('Luftwiderstand', { x: 5.7, y: 5.1, w: 3, h: 0.35, size: 14, bold: true, color: C.mut, name: '!!lt' });
        s.rrect(5.7, 5.55, 5.2, 0.42, { fill: '1A212C', line: C.line, rr: 0.5, name: '!!lbg' });
        s.rrect(5.73, 5.58, 5.14 * f / 1.27, 0.36, { fill: i === 2 ? C.red : C.bl, rr: 0.5, name: '!!lv' });
        s.text(lab, { x: 11.05, y: 5.48, w: 2.0, h: 0.55, size: 26, bold: true, color: i === 2 ? C.red : C.bl, name: '!!lf' });
      },
    });
  }

  // ===== STEIGUNG (Morph: Lkw neigt sich) =====
  {
    const o = { L: 4.6, axles: [0.65, 3.55], boxH: 1.45, floor: 0.7 }, k = 0.8;
    const r = lkwSide(o), w = r.W / 100 * k, h = r.H / 100 * k;
    const SX = 9.55, SY = 4.85; // Aufstandspunkt Mitte Lkw
    const A = [[0, 'Ebene', '0 kN', 0], [6, '5 % Steigung', '≈ 9 kN', 0.9], [12, '10 % Steigung', '≈ 18 kN', 1.8]];
    await steps(deck, 'c7w', {
      kicker: 'Steigungswiderstand', ttl: 'Der Berg zieht mit',
      list: ['Ebene Straße', '5 % Steigung', '10 % Steigung'],
      ask: { q: '18-t-Lkw, 10 % Steigung: Wie stark zieht der Berg ihn zurück?', a: 'So stark, als hingen 1,8 Tonnen hinten am Seil.', at: 2 },
      caps: [
        'Auf der Ebene zieht nichts nach hinten. Der Motor muss nur Roll- und Luftwiderstand überwinden.',
        '5 % Steigung: Die Masse zieht mit etwa 9 Kilonewton nach hinten – wie 900 Kilo am Seil.',
        '10 % Steigung: doppelt so viel – wie 1,8 Tonnen am Seil. Früh zurückschalten!',
      ],
      notes: [
        '▶ Sagen: „Ein voller 18-Tonner auf der Ebene.“\n➜ „Jetzt geht es bergauf.“',
        '▶ „5 Prozent Steigung – 5 Meter Höhe auf 100 Meter Strecke. Schon zieht der Berg mit rund 9 Kilonewton nach hinten. Das ist, als würde hinten ein Gewicht von 900 Kilo am Seil hängen.“\n✅ Eigene Rechnung: 18.000 kg · 9,81 m/s² · 0,05 ≈ 8,8 kN.\n➜ „Und bei 10 Prozent?“',
        '▶ „10 Prozent: doppelt so viel, rund 18 Kilonewton – wie 1,8 Tonnen am Seil. Deshalb vor der Steigung zurückschalten, damit der Lkw nicht ins Stocken kommt. Und bergab dreht sich das um: Dann schiebt die Masse mit dieser Kraft nach vorn – darum Dauerbremse.“\n✅ Eigene Rechnung: 18.000 kg · 9,81 m/s² · 0,10 ≈ 17,6 kN. Steigung hier überzeichnet dargestellt.\n➜ „Und jetzt: Wie viel Wucht steckt in einem fahrenden Lkw?“',
      ],
      legend: 'Neigung überzeichnet · Rechnung für 18 t',
      scene: async (s, i) => {
        const [deg, lab, kn, f] = A[i], a = deg * Math.PI / 180;
        // Straße als gedrehtes Band: Oberkante läuft durch (SX, SY)
        const RW = 7.6, RH = 1.1;
        const cx = SX - RH / 2 * Math.sin(a), cy = SY + RH / 2 * Math.cos(a);
        s.rect(cx - RW / 2, cy - RH / 2, RW, RH, { fill: C.road, rotate: deg, name: '!!hang' });
        const kx = SX - 0.025 * Math.sin(a), ky = SY + 0.025 * Math.cos(a);
        s.rect(kx - RW / 2, ky - 0.025, RW, 0.05, { fill: '55606F', rotate: deg, name: '!!hangK' });
        // Lkw: Mitte unten auf (SX, SY), gedreht (Front links geht nach oben)
        const cxx = SX + (h / 2) * Math.sin(a), cyy = SY - (h / 2) * Math.cos(a);
        const X0 = cxx - w / 2, Y0 = cyy - h / 2;
        await lkw(s, o, { x: X0 + r.pad * k, gy: Y0 + h, k, name: '!!lkwS', rot: deg });
        // Hangabtrieb: Pfeil vom Heck bergab
        const len = Math.max(0.05, f * 0.7), ux = Math.cos(a), uy = Math.sin(a); // bergab = nach rechts unten
        const bx = SX + (w / 2 - 0.2) * ux, by = SY - 0.55 + (w / 2 - 0.2) * uy;
        s.rrect(bx + ux * len / 2 - len / 2, by + uy * len / 2 - 0.06, len, 0.12, { fill: C.red, ft: f ? 0 : 100, rr: 0.5, rotate: deg, name: '!!hab' });
        s.oval(bx + ux * len - 0.13, by + uy * len - 0.13, 0.26, 0.26, { fill: C.red, ft: f ? 0 : 100, name: '!!habK' });
        s.text(lab, { x: 9.0, y: 1.55, w: 4.05, h: 0.55, size: 28, bold: true, color: C.txt, align: 'right', name: '!!lab' });
        s.text([{ text: 'Zug nach hinten: ', options: { color: C.mut } }, { text: kn, options: { bold: true, color: f ? C.red : C.mut } }], { x: 8.5, y: 2.15, w: 4.55, h: 0.5, size: 22, align: 'right', name: '!!kn' });
        s.text(f ? 'wie ' + (f === 0.9 ? '900 kg' : '1,8 t') + ' am Seil' : '', { x: 8.5, y: 2.65, w: 4.55, h: 0.45, size: 18, color: C.or, align: 'right', name: '!!seil' });
      },
    });
  }

  // ===== BEWEGUNGSENERGIE (fließend) =====
  {
    const GY = 3.75;
    let D = 0;
    const fr = (v, o = {}) => ({ t: { v }, ...o });
    const blocks = v => Math.round(16 * (v / 80) * (v / 80));
    await motion(deck, 'c7w', {
      kicker: 'Bewegungsenergie', ttl: 'Die Wucht der Masse', dur: 420, holdDur: 700,
      question: 'Doppelt so schnell – wie viel mehr Energie steckt im Lkw?',
      answer: 'Viermal so viel. Die Energie wächst mit dem Quadrat der Geschwindigkeit – der Bremsweg auch.',
      legend: 'Jedes Kästchen = gleich viel Bewegungsenergie · voller 18-Tonner',
      frames: [
        fr(0, { hold: true, cap: 'Ein voller 18-Tonner steht. Keine Bewegungsenergie.', note: '▶ Sagen: „Ein 18-Tonner fährt los. Jedes orange Kästchen ist eine Portion Bewegungsenergie.“\n❓ Frage auf der Folie: „Doppelt so schnell – wie viel mehr Energie?“ – Tipps sammeln.\n🖱 Klick: Der Lkw beschleunigt bis 40 km/h (läuft von selbst).\n➜ „Los geht’s.“' }),
        fr(10, { cap: 'Der Lkw beschleunigt …' }), fr(20), fr(30),
        fr(40, { hold: true, cap: '40 km/h: 4 Kästchen Energie.', note: '▶ „40 km/h – vier Kästchen.“\n🖱 Klick: weiter bis 80 km/h (läuft von selbst).\n➜ „Jetzt verdoppeln wir das Tempo.“' }),
        fr(50, { cap: 'Weiter bis 80 km/h – doppelt so schnell …' }), fr(60), fr(70),
        fr(80, { hold: true, answer: true, cap: '80 km/h: 16 Kästchen – viermal so viel Energie wie bei 40 km/h.', note: '▶ „80 km/h: 16 Kästchen. Doppelt so schnell – viermal so viel Energie. Die muss beim Bremsen komplett in Wärme umgewandelt werden, deshalb ist auch der Bremsweg viermal so lang.“\n✅ Physik: Bewegungsenergie = ½ · m · v². (80/40)² = 4.\n🖱 Klick: Vergleich mit einem Auto.\n➜ „Wie viel ist das im Vergleich zu einem Auto?“' }),
        fr(80, { t: { v: 80, cmp: true }, cap: 'So viel Wucht wie ein Auto mit fast 280 km/h. Und doppelte Masse heißt doppelte Energie.', note: '▶ „Ein voller 18-Tonner mit 80 km/h hat so viel Bewegungsenergie wie ein Auto mit 1,5 Tonnen bei fast 280 km/h. Und: Doppelte Masse bedeutet doppelte Energie – ein voller Lkw braucht mehr Weg zum Bremsen als ein leerer.“\n✅ Eigene Rechnung: ½ · 18.000 kg · (22,2 m/s)² ≈ 4,4 MJ. Auto 1.500 kg: v = √(2 · 4,4 MJ / 1.500 kg) ≈ 77 m/s ≈ 277 km/h.\n🖱 Keine Animation mehr – nächster Klick: nächste Folie.\n➜ „Kapitel 3: Was passiert mit dieser Wucht in der Kurve?“' }),
      ],
      scene: async (s, t, k) => {
        const { v, cmp } = t;
        if (k > 0 && !cmp) D += v * 0.028;
        // Straße mit wandernden Leitlinien (Lkw fährt nach links → Straße wandert nach rechts)
        s.rrect(5.65, GY, 7.4, 0.55, { fill: C.road, rr: 0.1, name: '!!road' });
        for (let j = -260; j < 12; j++) {
          const x = 5.6 + j * 0.9 + D;
          if (x > 5.7 && x < 12.5) s.rrect(x, GY + 0.25, 0.45, 0.05, { fill: C.mark, rr: 0.5, name: '!!d' + j });
        }
        await lkw(s, { L: 5.2, axles: [0.7, 3.9], floor: 0.68, boxH: 1.4 }, { x: 6.4, gy: GY + 0.05, k: 0.72, name: '!!lkw' });
        // Fahrtwind-Striche hinter dem Lkw
        for (let q = 0; q < 3; q++) s.rrect(10.6 + q * 0.25, 2.55 + q * 0.36, 0.9 + 0.3 * (v / 80), 0.05, { fill: C.mut, ft: v ? 100 - Math.round(v * 0.8) : 100, rr: 0.5, name: '!!wind' + q });
        // Tacho
        s.text(String(v), { x: 10.6, y: 1.5, w: 1.6, h: 0.8, size: 46, bold: true, color: C.txt, align: 'right', name: '!!kmh' });
        s.text('km/h', { x: 12.25, y: 1.85, w: 0.8, h: 0.4, size: 15, color: C.mut, name: '!!kmhl' });
        // Energie-Kästchen
        const n = blocks(v);
        s.text([{ text: 'Bewegungsenergie  ', options: { bold: true, color: C.txt } }, { text: n + ' Kästchen', options: { color: C.or } }], { x: 5.8, y: 4.5, w: 5, h: 0.35, size: 15, name: '!!et' });
        for (let b = 0; b < 16; b++) {
          const on = b < n;
          s.rrect(5.8 + (b % 8) * 0.6, 4.95 + Math.floor(b / 8) * 0.6, 0.5, 0.5, { fill: on ? C.or : '1A212C', line: on ? C.or : C.line, rr: 0.1, glow: on ? 4 : undefined, glowColor: C.or, name: '!!e' + b });
        }
        // Vergleich Auto
        s.rrect(10.75, 4.5, 2.3, 1.55, { fill: cmp ? '2A1E0E' : C.card, ft: cmp ? 0 : 100, line: C.or, lt: cmp ? 0 : 100, rr: 0.14, name: '!!cmpb' });
        s.text(cmp ? [{ text: '= Auto (1,5 t)', options: { bold: true, color: C.txt, breakLine: true } }, { text: 'mit 277 km/h', options: { bold: true, color: C.or } }] : '', { x: 10.85, y: 4.55, w: 2.1, h: 1.45, size: 17, align: 'center', valign: 'middle', name: '!!cmpt' });
      },
    });
  }
};
