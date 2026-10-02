// Lektion 9 + 10 · Gruppenarbeit „Park-Streife Offenbach“ (passt zu Folie 112–124 der Grundstoff-Präsentation)
// PDF 1: Lehrerblatt + 4 Streifenblätter (A–D) + Musterlösung (2 S.)
// PDF 2: Material (4 Tatort-Pläne quer zum Hochhalten, Jury-Karten, Bastel-Parkscheibe)
// PDF 3: Mitschreibblatt für alle (2 S.) + Lösung
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { css: baseCss, HEAD, foot, hero, roles, cl, ic, logo } = require('../l34/ws34');
const P = require('./plans');

const css = baseCss + `
.page .box.mit { margin-bottom: 10px; padding: 9px 12px; }
.page .box { margin-bottom: 6px; padding: 6px 10px; }
.page .know div { font-size: 9.1pt; padding: 3px 8px; line-height: 1.25; }
.page .hero { padding: 9px 14px; margin-bottom: 7px; }
.plan { border: 2px solid #1D1F24; border-radius: 10px; overflow: hidden; background: #fff; }
.plan-cap { display: flex; justify-content: space-between; font-size: 8.5pt; color: #6B6F78; margin-top: 3px; }
.plan-cap b { color: #1D1F24; }
.rep { width: 100%; border-collapse: collapse; }
.rep th { background: #14171D; color: #fff; font-size: 9pt; letter-spacing: 1px; text-transform: uppercase; padding: 4px 6px; border: 1px solid #14171D; }
.rep td { border: 1px solid #C9CCD2; padding: 3px 6px; font-size: 9.5pt; height: 14mm; vertical-align: top; }
.rep td.v { text-align: center; vertical-align: middle; font-weight: 700; font-size: 9pt; white-space: nowrap; }
.rep td.v span { display: inline-block; border: 1.5px solid #1D1F24; border-radius: 5px; padding: 0 5px; margin: 1px 0; font-size: 8.5pt; }
.rep .car { display: inline-flex; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #1D1F24; align-items: center; justify-content: center; font-weight: 700; margin-right: 5px; }
.rep .car.m { background: #E8650F; color: #fff; border-color: #E8650F; }
.rep .ht { font-size: 8.5pt; color: #6B6F78; }
.chip { display: inline-block; border: 1.5px solid #E8650F; background: #FFF6EF; border-radius: 20px; padding: 1px 9px; font-size: 9pt; font-weight: 700; margin: 2px 3px 0 0; }
.say { border: 2px dashed #E8650F; border-radius: 10px; padding: 3px 10px; font-size: 9.8pt; }
.say .ln { border-bottom: 1px solid #9AA0AA; height: 22px; }
.sol h3 { font-size: 12.5pt; margin: 2px 0 3px; display: flex; gap: 6px; align-items: center; }
.sol table td, .sol table th { font-size: 10pt; padding: 5px 7px; }
.sol .box { margin-bottom: 9px; padding: 8px 11px; }
.ok { color: #1E7A43; font-weight: 700; } .no { color: #B3261E; font-weight: 700; }
.fehler { font-size: 9.2pt; color: #8A1C15; margin: 3px 0 0; } .fehler b { color: #B3261E; }
/* Mitschreibblatt */
.gap { display: inline-block; min-width: 30mm; border-bottom: 1.3px solid #1D1F24; height: 14px; vertical-align: bottom; }
.gap.s { min-width: 12mm; } .gap.l { min-width: 48mm; }
.chain { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 4px; }
.chain div { border: 1.5px solid #1D1F24; border-radius: 8px; height: 21mm; position: relative; font-size: 9pt; padding: 16px 4px 3px; text-align: center; }
.chain div::before { content: attr(data-n); position: absolute; left: 5px; top: 2px; font-weight: 700; color: #E8650F; font-size: 11pt; }
.chain.fill div { font-weight: 700; font-size: 9.6pt; display: flex; align-items: center; justify-content: center; padding: 14px 3px 3px; }
.qq { font-size: 10.6pt; } .qq p { margin: 7px 0; line-height: 1.5; }
.g2c { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
.mt td, .mt th { font-size: 9.6pt; padding: 4px 6px; }
.mt td { height: 10mm; vertical-align: middle; }
.pd { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pd div { border: 1.5px solid #1F5EA8; border-radius: 9px; padding: 8px 10px; font-size: 10.6pt; line-height: 1.7; }
.pd b { color: #1F5EA8; }
.fill { color: #1E5E9A; font-weight: 700; }
`;

const GR = [
  {
    k: 'A', ort: 'Tatort Einmündung', icon: 'LuSignpost', plan: P.planA,
    haupt: 'Du parkst 6 m hinter einer Einmündung. Kein Radweg, keine Schilder.',
    know: [
      ['Kreuzungen und Einmündungen', 'Parkverbot bis 5 m vor und hinter dem Schnittpunkt der Fahrbahnkanten (§ 12 Abs. 3 Nr. 1).'],
      ['Mit Radweg', 'Verläuft rechts ein baulich angelegter Radweg, gilt vor der Einmündung sogar 8 m.'],
      ['Wo messt ihr?', 'Ab dem Schnittpunkt der Fahrbahnkanten, also die Ecke der Bordsteine (roter Punkt). Bei runden Ecken: gedachte Verlängerung der Kanten.'],
      ['Welche Seite?', 'Rechts parken. Links nur in Einbahnstraßen oder wenn rechts Schienen liegen (§ 12 Abs. 4).'],
    ],
    rows: [['A', 'Hauptfall · 6 m hinter der Einmündung', true], ['1', 'kurz vor der Einmündung', false], ['2', 'oben am linken Rand, Front nach rechts', false]],
  },
  {
    k: 'B', ort: 'Tatort Bäckerei', icon: 'LuCroissant', plan: P.planB,
    haupt: 'Du parkst vor einem abgesenkten Bordstein – nur 10 Minuten.',
    know: [
      ['Bordsteinabsenkung', 'Davor ist Parken verboten (§ 12 Abs. 3 Nr. 5). Sie ist für Rollstuhl, Rollator, Kinderwagen und Rad.'],
      ['Halten oder Parken?', 'Wer länger als 3 Minuten hält oder sein Auto verlässt, parkt (§ 12 Abs. 2).'],
      ['Zweite Reihe', 'Parken verboten, meist sogar schon das Halten (§ 12 Abs. 4). Der Warnblinker erlaubt gar nichts.'],
      ['Parkscheibe', 'Einstellen auf den nächsten halben Stundenstrich nach deiner Ankunft (§ 13 Abs. 2).'],
    ],
    rows: [['B', 'Hauptfall · vor der Absenkung, 10 Minuten', true], ['1', 'zweite Reihe, Warnblinker an', false], ['2', 'Parkplatz mit Parkscheibe', false]],
  },
  {
    k: 'C', ort: 'Tatort Garagenhof', icon: 'LuWarehouse', plan: P.planC,
    haupt: 'Schmale Straße: Du parkst gegenüber einer Grundstücksausfahrt.',
    know: [
      ['Grundstücksausfahrt', 'Davor Parkverbot. Auf schmalen Fahrbahnen auch gegenüber (§ 12 Abs. 3 Nr. 3), sonst kommt keiner mehr raus.'],
      ['Enge Straßenstelle', 'Halten verboten (§ 12 Abs. 1). Neben dir müssen rund 3,05 m frei bleiben: 2,55 m breitestes Fahrzeug + 0,50 m.'],
      ['Gehweg', 'Parken nur, wenn ein Schild (Z 315) oder eine Markierung es erlaubt (bis 2,8 t). Sonst ist dort sogar Halten verboten.'],
      ['Eure Maße', 'Fahrbahn 5,40 m breit. Jedes Auto auf dem Plan ist 1,80 m breit und 4,50 m lang.'],
    ],
    rows: [['C', 'Hauptfall · gegenüber der Ausfahrt', true], ['1', 'gegenüber von Auto X', false], ['2', 'auf dem Gehweg, kein Schild', false]],
  },
  {
    k: 'D', ort: 'Tatort Haltestelle', icon: 'LuBus', plan: P.planD,
    haupt: 'Du parkst 10 m hinter einem Haltestellenschild.',
    know: [
      ['Haltestelle (Zeichen 224)', 'Parken verboten bis je 15 m vor und hinter dem Schild. Gemessen wird ab dem Schild.'],
      ['Halten ist nicht Parken', 'Kurz jemanden ein- oder aussteigen lassen und am Auto bleiben ist Halten (höchstens 3 Minuten).'],
      ['Aber: Bus zuerst', 'Halten nur, solange du keinen Bus behinderst (§ 1 Abs. 2, § 20 Abs. 5). Ist eine Zickzacklinie (Z 299) markiert, ist sogar Halten verboten.'],
      ['Vorher / hinterher', '„Vor“ dem Schild heißt: in Fahrtrichtung davor. „Hinter“ heißt: in Fahrtrichtung danach.'],
    ],
    rows: [['D', 'Hauptfall · 10 m hinter dem Schild', true], ['1', 'Oma steigt aus, Fahrerin bleibt sitzen', false], ['2', 'ganz links, vor dem Schild', false]],
  },
];

const report = (rows) => `<table class="rep"><tr><th style="width:27%">Fahrzeug</th><th>Was stellt ihr fest? (Meter zählen!)</th><th style="width:15%">Urteil</th><th style="width:19%">Welche Regel?</th></tr>
${rows.map(([n, t, m]) => `<tr><td><span class="car${m ? ' m' : ''}">${n}</span><span class="ht">${t}</span></td><td></td><td class="v"><span>☐ Freispruch</span><br><span>☐ Knöllchen</span></td><td></td></tr>`).join('')}</table>`;

function sheet(g) {
  const know = `<div class="know">${g.know.map(([b, t]) => `<div><b>${b}</b>${t}</div>`).join('')}</div>`;
  return `<section class="page">${HEAD('Lektion 9 + 10 · Gruppenarbeit · Park-Streife Offenbach')}
  ${hero(`Streife ${g.k} · Ihr seid das Ordnungsamt`, g.ort, g.icon, '8')}
  <div class="box mission"><div class="kick">Euer Einsatz</div>Auf eurem Tatort stehen drei Autos. Euer Hauptfall steht auch auf der Leinwand: <b>„${g.haupt}“</b> Zählt nach, prüft die Regeln und entscheidet: <b>Freispruch oder Knöllchen?</b> Dann stellt ihr den Hauptfall vor, die Klasse ist die Jury. <b>Rollen:</b> Messer/in · Paragrafen-Profi · Schreiber/in · Sprecher/in.</div>
  <div class="plan">${g.plan()}</div>
  <div class="plan-cap"><span><b>Messtrick:</b> Jeder Bordstein (hell / dunkel) ist genau 1 m lang. Die Autos sind 4,50 m lang.</span><span>Draufsicht · maßstäblich</span></div>
  <div class="box" style="margin-top:5px"><div class="kick">Das müsst ihr wissen</div>${know}</div>
  <div class="box mit"><div class="kick">Streifenbericht</div>${report(g.rows)}</div>
  <div class="say"><b>Euer Satz für die Klasse:</b> „Unser Hauptfall ist … , weil …“<div class="ln"></div><div class="ln"></div></div>
  ${foot(`Streife ${g.k}`)}</section>`;
}

function teacher() {
  return `<section class="page">${HEAD('Lektion 9 + 10 · Lehrerblatt · Park-Streife Offenbach')}
  ${hero('Nur für den Fahrlehrer', 'Gruppenarbeit: Park-Streife Offenbach', 'LuSiren', '')}
  <div class="box mission"><div class="kick">Die Idee</div>Folie 112 („Erlaubt oder verboten – und warum?“) bekommt ein Gesicht: Jede Gruppe ist eine Streife des Ordnungsamts und bekommt einen maßstäblichen Tatort-Plan. Der Hauptfall ist genau der Fall A, B, C oder D von der Folie. Dazu kommen zwei Nachbar-Autos. Auf dem Plan ist jeder Bordstein 1 m lang, die Gruppe muss also wirklich nachzählen, statt zu raten.</div>
  <div class="row">
    <div class="box mit"><div class="kick">Material</div><ul class="small"><li>Streifenblatt A, B, C, D (je Gruppe 1–2×)</li><li>Material-PDF S. 1–4: Tatort-Pläne quer zum Hochhalten beim Vorstellen</li><li>Jury-Karten Freispruch/Knöllchen (1 pro Person)</li><li>Bastel-Parkscheibe (optional, für Streife B und das Mitschreibblatt)</li><li>Mitschreibblatt für alle + Lösung</li></ul></div>
    <div class="box mit"><div class="kick">Einteilung</div><ul class="small"><li>4 Gruppen à 3–5 Personen</li><li>Kleine Klasse: 2 Gruppen machen je 2 Tatorte (A+C, B+D)</li><li>Rollen: Messer/in, Paragrafen-Profi, Schreiber/in, Sprecher/in</li><li>Wer nicht vorstellt, ist Jury</li></ul></div>
  </div>
  <div class="box mit"><div class="kick">Ablauf · ca. 25 Minuten</div><div class="time">
    <div><b>1 · Start (2 Min.)</b>Folie 112 zeigen. Blätter austeilen. Timer 8 Minuten.</div>
    <div><b>2 · Streife (8 Min.)</b>Pflicht: Hauptfall + Auto 1. Schnelle Gruppen: Auto 2 als Bonus.</div>
    <div><b>3 · Vorstellen (12 Min.)</b>Je Streife 3 Folien (ab Folie 113): Streife stellt vor, Jury hebt Karte · Check zum Mitschreiben · Nicht vergessen.</div>
    <div><b>4 · Mitschreiben (3 Min.)</b>Auto 1 und 2 stehen auf der Check-Folie – alle ergänzen ihr Blatt.</div></div></div>
  <div class="box mit"><div class="kick">Hauptfälle · Check-Folien 114, 117, 120, 123</div><table>
    <tr><th style="width:9%">Fall</th><th style="width:16%">Urteil</th><th>Begründung auf der Folie</th></tr>
    <tr><td><b>A</b></td><td class="ok">Freispruch</td><td>Die 5-m-Zone ist vorbei (6 m &gt; 5 m). Dahinter gilt immer 5 m, die 8 m nur davor.</td></tr>
    <tr><td><b>B</b></td><td class="no">Knöllchen</td><td>§ 12 Abs. 3 Nr. 5 – Fahrer weg = Parken, egal wie kurz. Halten und am Auto bleiben wäre erlaubt.</td></tr>
    <tr><td><b>C</b></td><td class="no">Knöllchen</td><td>§ 12 Abs. 3 Nr. 3 – auf schmalen Fahrbahnen auch gegenüber.</td></tr>
    <tr><td><b>D</b></td><td class="no">Knöllchen</td><td>Zeichen 224: bis 15 m davor und dahinter.</td></tr></table></div>
  <div class="box mit"><div class="kick">Jury-Regeln</div><ul class="small"><li>Grün „Freispruch“ = erlaubt. Rot „Knöllchen“ = verboten. Wer anders stimmt als die Streife, sagt kurz warum.</li><li>Punkt für die Streife: richtiges Urteil + richtige Regel + richtig gezählte Meter.</li><li>Streife A ist die Falle: Viele sagen reflexartig „Knöllchen“. Genau darüber reden.</li></ul></div>
  ${foot('Lehrerblatt')}</section>`;
}

function solution() {
  const S = [
    ['A', 'LuSignpost', 'Tatort Einmündung', [
      ['A', 'ok', 'Freispruch', 'Zählen ab dem Schnittpunkt der Fahrbahnkanten (roter Punkt rechts): 6 Bordsteine = 6 m. Hinter einer Einmündung gilt immer 5 m (die 8 m bei Radweg gelten nur davor). 6 m > 5 m, erlaubt.'],
      ['1', 'no', 'Knöllchen', 'Die Front steht 3 m vor dem Schnittpunkt. Bis 5 m davor ist Parken verboten (§ 12 Abs. 3 Nr. 1).'],
      ['2', 'no', 'Knöllchen', 'Zweirichtungsstraße: Parken auf der linken Seite ist verboten. Links nur in Einbahnstraßen oder wenn rechts Schienen liegen (§ 12 Abs. 4).']],
      'ab der Mitte der Seitenstraße gemessen · „Keine Schilder, also darf ich überall“ · 5 m und 8 m verwechselt'],
    ['B', 'LuCroissant', 'Tatort Bäckerei', [
      ['B', 'no', 'Knöllchen', 'Fahrer im Laden = Fahrzeug verlassen = Parken, auch nach 1 Minute. Parken vor Bordsteinabsenkungen ist verboten (§ 12 Abs. 3 Nr. 5). Kurz halten und am Auto bleiben wäre erlaubt.'],
      ['1', 'no', 'Knöllchen', 'Zweite Reihe, Fahrer weg = Parken in zweiter Reihe, verboten (§ 12 Abs. 4). Warnblinker ändert daran nichts.'],
      ['2', 'no', 'Knöllchen', 'Ankunft 13:20, richtig wäre 13:30 (nächster halber Stundenstrich), dann bis 15:30. Die Scheibe auf 14:00 ist falsch eingestellt (§ 13 Abs. 2).']],
      '„Mit Warnblinker darf man kurz“ · „10 Minuten ist doch nur Halten“ · Parkscheibe auf die volle Stunde gedreht'],
    ['C', 'LuWarehouse', 'Tatort Garagenhof', [
      ['C', 'no', 'Knöllchen', 'Schmale Fahrbahn (5,40 m): Gegenüber der Ausfahrt ist Parken verboten (§ 12 Abs. 3 Nr. 3). Wer aus der Garage kommt, kann nicht mehr ausfahren.'],
      ['1', 'no', 'Knöllchen', '5,40 m − 1,80 m − 1,80 m = 1,80 m frei. Nötig sind rund 3,05 m. Auto 1 hat eine enge Stelle geschaffen: Hier ist schon Halten verboten (§ 12 Abs. 1).'],
      ['2', 'no', 'Knöllchen', 'Gehweg ohne Zeichen 315 oder Markierung: Parken verboten, sogar Halten (§ 2 Abs. 1, § 12 Abs. 4). Der Gehweg gehört den Fußgängern.']],
      '„Ich stehe ja nicht DAVOR“ · Auto X als Schuldigen nennen (X stand zuerst da, legal) · Gehweg „halb drauf ist okay“'],
    ['D', 'LuBus', 'Tatort Haltestelle', [
      ['D', 'no', 'Knöllchen', 'Ab dem Schild gezählt: 10 m. Bis 15 m hinter dem Zeichen 224 ist Parken verboten.'],
      ['1', 'ok', 'Freispruch', '5 m vor dem Schild, aber nur Halten: Aussteigen lassen, Fahrerin bleibt sitzen, 1 Minute. Zeichen 224 verbietet das Parken, nicht das kurze Halten. Keine Zickzacklinie da. Aber: Auto 1 steht genau da, wo der Bus hält, kommt er, sofort weiterfahren.'],
      ['2', 'ok', 'Freispruch', 'Die Front ist 16 m vor dem Schild. Die 15-m-Zone ist vorbei, erlaubt.']],
      '„An der Haltestelle darf man gar nicht stehen“ · 5 m statt 15 m · ab dem Wartehäuschen statt ab dem Schild gemessen'],
  ];
  const block = ([k, icn, ort, rows, f]) => `<div class="box"><h3>${ic(icn, '#E8650F', 18)} Streife ${k} · ${ort}</h3>
    <table><tr><th style="width:8%">Auto</th><th style="width:15%">Urteil</th><th>Begründung</th></tr>${rows.map(([n, c, u, b]) => `<tr><td><b>${n}</b></td><td class="${c}">${u}</td><td>${b}</td></tr>`).join('')}</table>
    <p class="fehler"><b>Typische Fehler:</b> ${f}</p></div>`;
  return `<section class="page sol">${HEAD('Lektion 9 + 10 · Musterlösung · nur für den Fahrlehrer')}
  ${hero('Musterlösung · Seite 1 von 2', 'Streife A und B', 'LuBadgeCheck', '')}
  ${block(S[0])}${block(S[1])}
  <div class="box"><h3>${ic('LuRuler', '#E8650F', 18)} So wird gezählt</h3><p style="margin:0;font-size:9.6pt">Auf allen Plänen ist jeder Bordstein 1 m lang, jedes Auto 4,50 m lang und 1,80 m breit. Gemessen wird immer bis zum nächstgelegenen Ende des Autos: bei „hinter“ bis zum Heck, bei „vor“ bis zur Front.</p></div>
  ${foot('Musterlösung 1/2')}</section>
  <section class="page sol">${HEAD('Lektion 9 + 10 · Musterlösung · nur für den Fahrlehrer')}
  ${hero('Musterlösung · Seite 2 von 2', 'Streife C und D', 'LuBadgeCheck', '')}
  ${block(S[2])}${block(S[3])}
  <div class="box"><h3>${ic('LuBookOpenCheck', '#E8650F', 18)} Rechtsgrundlagen</h3>
    <p style="margin:0;font-size:9.6pt">§ 12 Abs. 1 StVO Haltverbote (u. a. enge und unübersichtliche Stellen) · § 12 Abs. 2 Parken (länger als 3 Minuten oder Fahrzeug verlassen) · § 12 Abs. 3 Nr. 1 Kreuzungen und Einmündungen 5 m / 8 m, Nr. 3 Grundstücksein- und -ausfahrten, Nr. 5 Bordsteinabsenkungen · § 12 Abs. 4 rechter Fahrbahnrand, zweite Reihe · § 13 Abs. 2 Parkscheibe · Anlage 2 zu Zeichen 224: Parkverbot 15 m vor und hinter der Haltestelle · Anlage 3 Zeichen 315: Parken auf Gehwegen · Enge Stelle rund 3,05 m: Faustwert der Rechtsprechung (2,55 m + 0,50 m).</p></div>
  ${foot('Musterlösung 2/2')}</section>`;
}

// ---------- Mitschreibblatt für alle ----------
function mitschreib(sol) {
  const G = (t, cls = '') => sol ? `<span class="fill">${t}</span>` : `<span class="gap ${cls}"></span>`;
  const chain = ['Spiegel', 'Blinken', 'Schulterblick', 'Einordnen', 'Schulterblick', 'Vorrang beachten', 'Abbiegen'];
  const head = sol ? 'Lösung' : 'Mitschreibblatt';
  const p1 = `<section class="page">${HEAD(`Lektion 9 + 10 · ${head} · Fahrmanöver`)}
  ${hero(sol ? 'Lösung für den Fahrlehrer' : 'Name: ______________________', sol ? 'Lösung Mitschreibblatt · Seite 1' : 'Abbiegen und Überholen', 'LuRoute', '')}
  <div class="box mit"><div class="kick">1 · Die Ablaufkette beim Abbiegen</div><div class="chain${sol ? ' fill' : ''}">${chain.map((c, i) => `<div data-n="${i + 1}">${sol ? c : ''}</div>`).join('')}</div>
    <div class="qq"><p>Wo zeigt dir kein Spiegel etwas? Im ${G('toten Winkel')}. Den schließt nur der ${G('Schulterblick')}.</p>
    <p>Lkw über 3,5 t biegen innerorts rechts nur mit ${G('Schrittgeschwindigkeit')} ab, wenn mit Rad- oder Fußverkehr zu rechnen ist.</p></div></div>
  <div class="box mit"><div class="kick">2 · Wen musst du beim Abbiegen durchlassen? (§ 9 Abs. 3)</div><div class="g2c qq">
    <p>• ${G('Gegenverkehr', 'l')} (beim Linksabbiegen)</p><p>• ${G('Rad, Mofa, E-Scooter', 'l')} in gleicher Richtung</p>
    <p>• ${G('Bahnen und Busse auf der Busspur', 'l')} (Sonderfahrstreifen)</p><p>• ${G('Fußgänger', 'l')}: besondere Rücksicht, notfalls warten</p></div>
    <div class="qq"><p>Beim Warten in der Kreuzung bleiben die Räder ${G('geradeaus')}, weil dich ein Auffahrunfall sonst in den ${G('Gegenverkehr')} schiebt.</p>
    <p>Zwei Linksabbieger von gegenüber biegen in der Regel ${G('voreinander')} ab.</p></div></div>
  <div class="box mit"><div class="kick">3 · Überholen: vier Mal JA</div><div class="q4">
    <div>${sol ? 'Sicht' : '&nbsp;'}<small>Gegenverkehr nicht behindert</small></div><div>${sol ? 'Tempo' : '&nbsp;'}<small>wesentlich schneller</small></div><div>${sol ? 'Erlaubt' : '&nbsp;'}<small>kein Verbot</small></div><div>${sol ? 'Platz' : '&nbsp;'}<small>hinten frei, vorne Lücke</small></div></div>
    <div class="qq"><p>100 km/h überholt einen Lkw mit 80 km/h, Gegenverkehr 100 km/h: Du brauchst rund ${G('1 km')} freie Sicht.</p>
    <p>Seitenabstand zu Rad, Fußgänger, E-Scooter: innerorts ${G('1,5 m', 's')}, außerorts ${G('2 m', 's')}.</p>
    <p>Wer überholt wird, darf nicht ${G('schneller werden')} (§ 5 Abs. 6).</p></div></div>
  <div class="box mit"><div class="kick">4 · Überholen verboten · nenne vier Fälle</div><div class="g2c qq">
    <p>1. ${G('Zeichen 276 / 277.1', 'l')}</p><p>2. ${G('durchgezogene Linie (Z 295)', 'l')}</p><p>3. ${G('unklare Verkehrslage', 'l')}</p><p>4. ${G('Zebrastreifen, Bahnübergang, Bus nähert sich mit Warnblinker der Haltestelle', 'l')}</p></div></div>
  ${foot(`${head} 1/2`)}</section>`;
  const p2 = `<section class="page">${HEAD(`Lektion 9 + 10 · ${head} · Ruhender Verkehr`)}
  ${hero(sol ? 'Lösung für den Fahrlehrer' : 'Weiter geht’s', sol ? 'Lösung Mitschreibblatt · Seite 2' : 'Kleine Manöver, Halten und Parken', 'LuSquareParking', '')}
  <div class="box mit"><div class="kick">5 · Gefährdung ausgeschlossen · die höchste Sorgfalt</div><div class="qq">
    <p>Gilt u. a. beim ${G('Wenden')}, ${G('Rückwärtsfahren')}, ${G('Anfahren')} und ${G('Aussteigen')}.</p>
    <p>Hindernis auf deiner Seite: Zuerst fährt der ${G('Gegenverkehr')} (§ 6). Bus hält mit Warnblinker: nur ${G('Schrittgeschwindigkeit')}.</p>
    <p>Tür auf mit dem holländischen Griff: Fahrertür mit der ${G('rechten')} Hand öffnen.</p></div></div>
  <div class="box mit"><div class="kick">6 · Warten, Halten oder Parken? Kreuze an</div><table class="mt">
    <tr><th>Situation</th><th style="width:12%">Warten</th><th style="width:12%">Halten</th><th style="width:12%">Parken</th></tr>
    ${[['Du stehst an der roten Ampel.', 0], ['Du lässt einen Freund aussteigen, 1 Minute, du bleibst sitzen.', 1], ['Du steigst aus und holst schnell ein Paket (2 Minuten).', 2], ['Du wartest 6 Minuten im Auto auf deine Schwester.', 2]].map(([t, c]) => `<tr><td>${t}</td>${[0, 1, 2].map(i => `<td style="text-align:center;font-size:12pt">${sol && i === c ? '<span class="fill">✗</span>' : '☐'}</td>`).join('')}</tr>`).join('')}</table>
    <div class="qq"><p>Zeichen 283 = ${G('absolutes Haltverbot', 'l')} · Zeichen 286 = ${G('eingeschränktes Haltverbot', 'l')} (max. 3 Min., Ein-/Aussteigen und Be-/Entladen ohne Verzögerung auch länger).</p></div></div>
  <div class="box mit"><div class="kick">7 · Halt- und Parkverbote · trage die Meter ein</div><div class="g2c qq">
    <p>Kreuzung/Einmündung: ${G('5 m', 's')} davor und dahinter · mit baulichem Radweg davor ${G('8 m', 's')}</p>
    <p>Haltestelle (Z 224): ${G('15 m', 's')} vor und hinter dem Schild</p>
    <p>Zebrastreifen: Halten verboten bis ${G('5 m', 's')} davor</p>
    <p>Andreaskreuz: innerorts ${G('5 m', 's')}, außerorts ${G('50 m', 's')} davor und dahinter</p>
    <p>Enge Stelle (Halten verboten): neben dir rund ${G('3,05 m', 's')} frei lassen</p>
    <p>Vor abgesenkten Bordsteinen und Ausfahrten: ${G('nie parken')}</p></div></div>
  <div class="box mit"><div class="kick">8 · Parkscheibe · auf welche Zeit stellst du?</div><div class="pd">
    ${[['8:05', '8:30'], ['16:31', '17:00'], ['12:50', '13:00']].map(([a, b]) => `<div>Ankunft <b>${a} Uhr</b><br>Scheibe: ${G(b + ' Uhr')}</div>`).join('')}</div>
    <div class="qq"><p>Am Berg, Front bergab: Räder ${G('zum Bordstein')} + Rückwärtsgang. Front bergauf: Räder ${G('vom Bordstein weg')} + 1. Gang.</p></div></div>
  ${foot(`${head} 2/2`)}</section>`;
  return p1 + p2;
}

// ---------- Material ----------
const mcss = `
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; } body { margin: 0; font-family: Calibri, Carlito, Arial, sans-serif; color: #1D1F24; }
.pg { page-break-after: always; height: 277mm; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
.pg:last-child { page-break-after: auto; }
.tp { display: flex; justify-content: space-between; font-size: 8pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #6B6F78; border-bottom: 1.5px solid #1D1F24; padding-bottom: 3px; }
.tp img { height: 16px; }
.hint { font-size: 9pt; color: #6B6F78; text-align: center; }
.g2 { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr); gap: 6px; }
.jury { border: 2px dashed #9AA0AA; border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }
.jury div { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 19pt; gap: 3px; text-align: center; }
.jury .g { background: #2E8B57; } .jury .r { background: #C62828; }
.jury small { font-size: 9pt; font-weight: 400; }
.craft { flex: 1; display: grid; grid-template-rows: 1fr 1fr; gap: 8px; }
.craft > div { border: 2px dashed #9AA0AA; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative; }
.craft .lab { position: absolute; left: 10px; top: 6px; font-size: 9pt; color: #6B6F78; font-weight: 700; letter-spacing: 1px; }
`;
const lcss = `
@page { size: A4 landscape; margin: 9mm; }
* { box-sizing: border-box; } body { margin: 0; font-family: Calibri, Carlito, Arial, sans-serif; color: #1D1F24; }
.pg { page-break-after: always; height: 190mm; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
.pg:last-child { page-break-after: auto; }
.tp { display: flex; justify-content: space-between; font-size: 8pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #6B6F78; border-bottom: 1.5px solid #1D1F24; padding-bottom: 3px; }
.tp img { height: 16px; }
.ttl { display: flex; align-items: center; gap: 12px; }
.ttl .k { width: 44px; height: 44px; border-radius: 50%; background: #E8650F; color: #fff; font-family: Cambria, Caladea, serif; font-size: 24pt; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.ttl h1 { font-family: Cambria, Caladea, serif; font-size: 24pt; margin: 0; }
.ttl .c { margin-left: auto; font-size: 13pt; border: 2px solid #E8650F; border-radius: 10px; padding: 4px 10px; background: #FFF6EF; max-width: 55%; }
.plan { border: 2.5px solid #1D1F24; border-radius: 12px; overflow: hidden; flex: 1; display: flex; align-items: center; background: #fff; }
.hint { font-size: 9pt; color: #6B6F78; text-align: center; }
`;
const tp = (t) => `<div class="tp"><span>Lektion 9 + 10 · Park-Streife · Material · ${t}</span><img src="${logo}"></div>`;

// Bastel-Parkscheibe: Scheibe mit 24 halben Stunden (12-Stunden-Zifferblatt wie das Original)
function disc() {
  const R = 60; let s = `<svg width="103mm" height="103mm" viewBox="-66 -66 132 132"><circle r="${R + 4}" fill="#fff" stroke="#1D1F24" stroke-width="1.2" stroke-dasharray="3 2"/><circle r="2.5" fill="#1D1F24"/>`;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 2 * Math.PI - Math.PI / 2, x1 = Math.cos(a) * (R - 2), y1 = Math.sin(a) * (R - 2), x2 = Math.cos(a) * (R - (i % 2 ? 5 : 9)), y2 = Math.sin(a) * (R - (i % 2 ? 5 : 9));
    s += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#1F5EA8" stroke-width="${i % 2 ? 1.4 : 2.4}"/>`;
    if (i % 2 === 0) { const h = i / 2 === 0 ? 12 : i / 2; const tx = Math.cos(a) * (R - 17), ty = Math.sin(a) * (R - 17); s += `<text x="${tx.toFixed(2)}" y="${(ty + 4.5).toFixed(2)}" font-size="13" font-weight="700" text-anchor="middle" fill="#1F5EA8" font-family="Arial">${h}</text>`; }
  }
  return s + '</svg>';
}
function base() {
  return `<svg width="115mm" height="120mm" viewBox="0 0 115 120"><rect x="1" y="1" width="113" height="118" rx="6" fill="#1F5EA8" stroke="#1D1F24" stroke-width="0.6"/>
  <rect x="10" y="8" width="26" height="26" rx="3" fill="#fff"/><text x="23" y="30" font-size="24" font-weight="700" text-anchor="middle" fill="#1F5EA8" font-family="Arial">P</text>
  <text x="44" y="18" font-size="7.5" font-weight="700" fill="#fff" font-family="Arial">PARKSCHEIBE</text><text x="44" y="27" font-size="5" fill="#fff" font-family="Arial">Bastelmodell für den Unterricht</text>
  <text x="57.5" y="50" font-size="7" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial">Ankunftszeit</text>
  <rect x="42" y="54" width="31" height="20" rx="3" fill="#fff" stroke="#fff"/><text x="57.5" y="66" font-size="4.2" text-anchor="middle" fill="#B3261E" font-family="Arial">✂ ausschneiden</text>
  <circle cx="57.5" cy="100" r="2" fill="#fff"/><text x="57.5" y="108" font-size="4.2" text-anchor="middle" fill="#fff" font-family="Arial">Loch für die Musterklammer</text>
  <text x="57.5" y="82" font-size="4.6" text-anchor="middle" fill="#fff" font-family="Arial">Stell auf den nächsten halben</text><text x="57.5" y="88" font-size="4.6" text-anchor="middle" fill="#fff" font-family="Arial">Stundenstrich nach der Ankunft.</text></svg>`;
}
function material() {
  return `<section class="pg">${tp('Jury-Karten')}<div class="g2">${Array(6).fill(`<div class="jury"><div class="g">✓ FREISPRUCH<small>richtig geparkt</small></div><div class="r">✗ KNÖLLCHEN<small>sag, welche Regel</small></div></div>`).join('')}</div>
    <div class="hint">So oft drucken, dass jede/r eine Karte hat. In der Mitte falten: vorne Grün, hinten Rot.</div></section>
  <section class="pg">${tp('Bastel-Parkscheibe')}<div class="craft"><div><span class="lab">TEIL 1 · VORDERSEITE</span>${base()}</div><div><span class="lab">TEIL 2 · SCHEIBE</span>${disc()}</div></div>
    <div class="hint">Beide Teile ausschneiden, das Fenster „Ankunftszeit“ ausschneiden. Die Scheibe hinter die Vorderseite legen und durch das Loch (Mitte der Scheibe) mit einer Musterklammer befestigen, sodass die Zahlen im Fenster erscheinen. Nur zum Üben, nicht fürs echte Auto.</div></section>`;
}
function landPlans() {
  return GR.map(g => `<section class="pg">${tp(`Tatort-Plan ${g.k} · zum Hochhalten`)}<div class="ttl"><div class="k">${g.k}</div><h1>${g.ort}</h1><div class="c">Hauptfall: ${g.haupt}</div></div><div class="plan">${g.plan()}</div><div class="hint">1 Bordstein = 1 m · Autos 4,50 m × 1,80 m · Draufsicht, maßstäblich</div></section>`).join('');
}

const OUT = path.join(__dirname, 'worksheets');
fs.mkdirSync(OUT, { recursive: true });
const doc = (title, c, body) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title><style>${c}</style></head><body>${body}</body></html>`;
const jobs = [
  ['blaetter.html', doc('Lektion 9 + 10 · Park-Streife', css, teacher() + GR.map(sheet).join('\n') + solution()), '.page', 'Lektion09_10_Gruppenarbeit_Arbeitsblaetter.pdf'],
  ['plaene.html', doc('Tatort-Pläne', lcss, landPlans()), '.pg', 'tmp_plaene.pdf'],
  ['material.html', doc('Material', mcss, material()), '.pg', 'tmp_material.pdf'],
  ['mitschreib.html', doc('Mitschreibblatt', css, mitschreib(false) + mitschreib(true)), '.page', 'Lektion09_10_Mitschreibblatt_mit_Loesung.pdf'],
];
(async () => {
  const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  for (const [f, h, sel, out] of jobs) {
    fs.writeFileSync(path.join(OUT, f), h);
    await p.setViewportSize({ width: f === 'plaene.html' ? 1054 : f === 'material.html' ? 718 : 688, height: 1200 });
    await p.goto('file://' + path.join(OUT, f));
    const over = await p.evaluate((sel) => [...document.querySelectorAll(sel)].map((pg, i) => { const kids = [...pg.children].filter(c => !c.classList.contains('foot')); const bottom = Math.max(...kids.map(c => c.getBoundingClientRect().bottom)) - pg.getBoundingClientRect().top; const f = pg.querySelector('.foot'); const lim = f ? f.getBoundingClientRect().top - pg.getBoundingClientRect().top : pg.clientHeight; return [i + 1, Math.round(bottom), Math.round(lim)]; }), sel);
    console.log(out, JSON.stringify(over));
    await p.pdf({ path: path.join(__dirname, out), preferCSSPageSize: true, printBackground: true });
  }
  await b.close();
  execSync(`pdfunite tmp_plaene.pdf tmp_material.pdf Lektion09_10_Gruppenarbeit_Material.pdf && rm tmp_plaene.pdf tmp_material.pdf`, { cwd: __dirname });
  console.log('fertig');
})();
