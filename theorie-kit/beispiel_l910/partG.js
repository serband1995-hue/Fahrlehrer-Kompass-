// Teil G: Auswertung Gruppenarbeit „Park-Streife Offenbach“ – je Streife 3 Folien (Regel 7 der Didaktik)
const { C, base, kick, title, card, badge } = require('./gs');
const { icon } = require('./lib');
const G = [
  { k: 'A', ort: 'Tatort Einmündung', ico: 'LuSignpost', rows: [
    ['A · 6 m hinter der Einmündung', 'FREISPRUCH', 'Hinter Einmündungen gilt 5 m. 6 m > 5 m – erlaubt.'],
    ['1 · kurz vor der Einmündung', 'KNÖLLCHEN', 'Front 3 m vor der Ecke: bis 5 m davor verboten (§ 12 Abs. 3 Nr. 1).'],
    ['2 · links geparkt', 'KNÖLLCHEN', 'Keine Einbahnstraße: links parken verboten (§ 12 Abs. 4).']],
    nv: [['Gemessen wird', 'ab dem Schnittpunkt der Fahrbahnkanten – nicht ab der Straßenmitte.'], ['8 m gilt nur davor,', 'wenn rechts ein baulicher Radweg verläuft. Dahinter immer 5 m.'], ['Keine Schilder', 'heißt nicht: alles erlaubt. Die Verbote stehen im Gesetz.']] },
  { k: 'B', ort: 'Tatort Bäckerei', ico: 'LuCroissant', rows: [
    ['B · vor abgesenktem Bordstein, 10 Min.', 'KNÖLLCHEN', 'Fahrer weg = Parken. Vor Absenkungen verboten (§ 12 Abs. 3 Nr. 5).'],
    ['1 · zweite Reihe, Warnblinker', 'KNÖLLCHEN', 'Parken in zweiter Reihe verboten (§ 12 Abs. 4). Warnblinker erlaubt nichts.'],
    ['2 · Parkscheibe 14:00 bei Ankunft 13:20', 'KNÖLLCHEN', 'Richtig wäre 13:30 – der nächste halbe Stundenstrich (§ 13 Abs. 2).']],
    nv: [['Wer aussteigt und weggeht,', 'parkt – auch nach einer Minute.'], ['Der Warnblinker', 'ist für Gefahr und Panne da – nicht fürs Brötchenholen.'], ['Parkscheibe:', 'immer auf den nächsten halben Stundenstrich nach der Ankunft.']] },
  { k: 'C', ort: 'Tatort Garagenhof', ico: 'LuWarehouse', rows: [
    ['C · gegenüber der Ausfahrt', 'KNÖLLCHEN', 'Schmale Fahrbahn: auch gegenüber verboten (§ 12 Abs. 3 Nr. 3).'],
    ['1 · gegenüber von Auto X', 'KNÖLLCHEN', '5,40 − 1,80 − 1,80 = 1,80 m frei. Nötig rund 3,05 m: enge Stelle (§ 12 Abs. 1).'],
    ['2 · auf dem Gehweg, kein Schild', 'KNÖLLCHEN', 'Ohne Zeichen 315 oder Markierung ist Gehwegparken verboten.']],
    nv: [['Auto X', 'stand zuerst da – erlaubt. Wer danach dazukommt, schafft die enge Stelle.'], ['Rund 3,05 m', 'müssen frei bleiben: breitestes Fahrzeug 2,55 m + 0,50 m.'], ['Der Gehweg', 'gehört den Fußgängern – „halb drauf“ ist auch drauf.']] },
  { k: 'D', ort: 'Tatort Haltestelle', ico: 'LuBus', rows: [
    ['D · 10 m hinter dem Schild', 'KNÖLLCHEN', 'Zeichen 224: Parken bis je 15 m vor und hinter dem Schild verboten.'],
    ['1 · Oma steigt aus, Fahrerin bleibt', 'FREISPRUCH', 'Nur kurzes Halten, Bus nicht behindert, keine Zickzacklinie.'],
    ['2 · 16 m vor dem Schild', 'FREISPRUCH', 'Die 15-m-Zone ist vorbei.']],
    nv: [['Gemessen wird', 'ab dem Haltestellenschild – nicht ab dem Wartehäuschen.'], ['Zeichen 224', 'verbietet das Parken, nicht das kurze Halten. Kommt der Bus: sofort weiter.'], ['Zickzacklinie (Z 299):', 'dort ist schon das Halten verboten.']] },
];
module.exports = async (deck) => {
  for (const g of G) {
    // 1) Streife stellt vor
    {
      const s = base(deck, 'ruh', { notes: `▶ Sagen: „Streife ${g.k}, ${g.ort}. Bitte nach vorn: Plan hochhalten und euren Satz sagen.“\n❓ Jury: Freispruch oder Knöllchen? Karten hoch!\n💡 1 Minute, 2 Personen vorn. Alle anderen achten darauf: Was fehlt?\n➜ „Gleichen wir ab – schreibt mit.“` });
      kick(s, `Streife ${g.k} ist dran`, { y: 1.15 });
      await badge(s, 0.7, 1.75, 1.15, C.pu, g.ico);
      s.text(g.ort, { x: 2.15, y: 1.75, w: 10, h: 1.15, size: 44, bold: true, color: C.txt, valign: 'middle' });
      s.text('Plan hochhalten · Hauptfall vorstellen · die Jury entscheidet', { x: 0.7, y: 3.2, w: 11.9, h: 0.5, size: 20, color: C.mut });
      const T = [['LuTimer', '1 Minute'], ['LuUsers', '2 Personen vorne'], ['LuEye', 'Alle anderen: Was fehlt?']];
      for (let i = 0; i < 3; i++) {
        const x = 0.7 + i * 4.0;
        card(s, x, 4.1, 3.75, 1.1);
        s.img(await icon(T[i][0], C.pu), { x: x + 0.3, y: 4.35, w: 0.6, h: 0.6 });
        s.text(T[i][1], { x: x + 1.1, y: 4.1, w: 2.5, h: 1.1, size: 19, bold: true, color: C.txt, valign: 'middle' });
      }
    }
    // 2) Check zum Mitschreiben: Zeile → ? → Urteil + Grund
    {
      const s = base(deck, 'ruh', { notes: `▶ Sagen: „Gleichen wir ab. Schreibt mit.“\n❓ Zeile für Zeile: erst die Klasse fragen, dann Klick.\n🖱 Klick 1–3: Urteil und Begründung je Auto.\n✅ ${g.rows.map(r => r[0] + ': ' + r[1] + ' – ' + r[2]).join(' · ')}\n➜ „Was oft vergessen wird …“` });
      kick(s, `Check Streife ${g.k} · zum Mitschreiben`); title(s, g.ort);
      g.rows.forEach(([a, u, b], i) => {
        const y = 2.1 + i * 1.45;
        card(s, 0.7, y, 4.3, 1.25, { fill: C.card2 });
        s.text(a, { x: 0.95, y, w: 3.9, h: 1.25, size: 18, bold: true, color: C.txt, valign: 'middle' });
        card(s, 5.2, y, 7.4, 1.25);
        s.text('?', { x: 5.2, y, w: 7.4, h: 1.25, size: 34, bold: true, color: C.dim, align: 'center', valign: 'middle' }, { fx: 'out', c: true, dur: 200 });
        const ok = u === 'FREISPRUCH';
        s.text(u, { x: 5.45, y: y + 0.32, w: 2.05, h: 0.6, size: 15, bold: true, color: C.dark, fill: ok ? C.gr : C.red, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle' }, { fx: 'stamp', a: true });
        s.text(b, { x: 7.7, y, w: 4.75, h: 1.25, size: 16, color: C.txt, valign: 'middle' }, { fx: 'fade', dur: 250 });
      });
    }
    // 3) Nicht vergessen
    {
      const s = base(deck, 'ruh', { notes: `▶ Sagen: „Das gehört auch aufs Blatt. Fehlt euch davon etwas? Schreibt es jetzt dazu.“\n🖱 Klick 1–3: je ein Punkt.\n✅ ${g.nv.map(r => r.join(' ')).join(' · ')}\n➜ ${g.k !== 'D' ? '„Nächste Streife, bitte nach vorn.“' : '„Alle vier Tatorte geklärt. Jetzt der Lerncheck.“'}` });
      kick(s, `Streife ${g.k} · Nicht vergessen`); title(s, 'Das gehört auch aufs Blatt');
      g.nv.forEach(([b, t], i) => {
        const y = 2.2 + i * 1.3;
        card(s, 0.7, y, 11.9, 1.1, {}, { fx: 'flyL', c: true, dur: 450 });
        s.text(String(i + 1), { x: 0.95, y: y + 0.3, w: 0.5, h: 0.5, size: 16, bold: true, color: C.dark, fill: C.pu, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 150 });
        s.text([{ text: b + ' ', options: { bold: true, color: C.txt } }, { text: t, options: { color: C.mut } }], { x: 1.7, y, w: 10.7, h: 1.1, size: 19, valign: 'middle' }, { fx: 'fade', dur: 200 });
      });
    }
  }
};
