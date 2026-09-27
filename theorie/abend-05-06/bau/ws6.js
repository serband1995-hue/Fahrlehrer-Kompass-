// Arbeitsblätter Gruppenarbeit Lektion 6 (A4, druckfertig) → PDF
const React = require('react');
const RDS = require('react-dom/server');
const LU = require('react-icons/lu');
const fs = require('fs');
const path = require('path');
const ic = (n, c = '#E8650F', s = 28) => RDS.renderToStaticMarkup(React.createElement(LU[n], { color: c, size: String(s), strokeWidth: 1.8 }));
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'art', f + '.png')).toString('base64');
const sg = (id) => img('sign_' + id);
const mk = (col) => `<marker id="m${col.slice(1)}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${col}"/></marker>`;
const GR = '#2E9E5B', RD = '#C62828';
const SK = {
  schild: `<svg viewBox="0 0 300 190" width="100%" height="100%">${[['GEFAHR', '#C62828'], ['VORSCHRIFT', '#1F4FA3'], ['RICHTUNG', '#2E7D4F']].map(([t, c], i) => `<rect x="${8 + i * 98}" y="6" width="90" height="178" fill="#fff" stroke="${c}" stroke-width="2.5"/><text x="${53 + i * 98}" y="24" font-size="12" font-weight="700" fill="${c}" text-anchor="middle" font-family="Carlito">${t}</text>`).join('')}
    <image href="${sg('142_10')}" x="30" y="40" width="46" height="40"/><image href="${sg('108_10')}" x="30" y="95" width="46" height="40"/>
    <image href="${sg('267')}" x="133" y="38" width="44" height="44"/><image href="${sg('274_70')}" x="133" y="95" width="44" height="44"/>
    <image href="${sg('357')}" x="230" y="38" width="44" height="44"/><text x="252" y="120" font-size="26" text-anchor="middle" fill="#999">?</text>
    <text x="150" y="176" font-size="10" text-anchor="middle" fill="#555" font-family="Carlito">Unter jedes Schild: Bedeutung + was du tust</text></svg>`,
  linien: `<svg viewBox="0 0 300 190" width="100%" height="100%"><defs>${mk(GR)}${mk(RD)}</defs>
    <rect x="0" y="60" width="300" height="70" fill="#D7DBE0"/><line x1="0" y1="95" x2="95" y2="95" stroke="#fff" stroke-width="3" stroke-dasharray="14 8"/>
    <line x1="100" y1="95" x2="195" y2="95" stroke="#fff" stroke-width="3"/><line x1="200" y1="92" x2="300" y2="92" stroke="#fff" stroke-width="3"/><line x1="200" y1="98" x2="300" y2="98" stroke="#fff" stroke-width="3" stroke-dasharray="14 8"/>
    <path d="M20 113 C40 113 45 78 70 78" stroke="${GR}" stroke-width="3" fill="none" marker-end="url(#m2E9E5B)"/><path d="M120 113 C135 113 140 100 150 100" stroke="${RD}" stroke-width="3" fill="none" marker-end="url(#mC62828)"/>
    <text x="48" y="150" font-size="12" text-anchor="middle" font-family="Carlito" font-weight="700" fill="${GR}">Ja</text><text x="148" y="150" font-size="12" text-anchor="middle" font-family="Carlito" font-weight="700" fill="${RD}">Nein</text><text x="250" y="150" font-size="12" text-anchor="middle" font-family="Carlito" font-weight="700" fill="#333">?</text>
    <image href="${img('ve_bake_l')}" x="20" y="8" width="16" height="42"/><image href="${img('ve_pfosten_r')}" x="60" y="8" width="14" height="42"/><image href="${img('ve_kegel')}" x="95" y="18" width="26" height="34"/>
    <text x="150" y="182" font-size="10" text-anchor="middle" fill="#555" font-family="Carlito">Gelbe Baustellenlinien mit gelbem Stift ergänzen</text></svg>`,
  bahn: `<svg viewBox="0 0 300 190" width="100%" height="100%"><defs>${mk(GR)}${mk(RD)}</defs>
    <rect x="125" y="0" width="50" height="190" fill="#D7DBE0"/><rect x="0" y="82" width="300" height="26" fill="#8A7A66"/><line x1="0" y1="88" x2="300" y2="88" stroke="#555" stroke-width="2"/><line x1="0" y1="102" x2="300" y2="102" stroke="#555" stroke-width="2"/>
    <image href="${sg('201')}" x="180" y="116" width="20" height="30"/><rect x="150" y="122" width="25" height="4" fill="${RD}"/>
    <g transform="rotate(-4 150 160)"><rect x="152" y="150" width="28" height="28" fill="#FFE066" stroke="#555"/><text x="166" y="170" font-size="15" font-weight="700" text-anchor="middle" font-family="Carlito">A</text></g>
    <g transform="rotate(3 150 30)"><rect x="152" y="20" width="28" height="28" fill="#A5D8FF" stroke="#555"/><text x="166" y="40" font-size="15" font-weight="700" text-anchor="middle" font-family="Carlito">B</text></g>
    <text x="10" y="20" font-size="11" font-family="Carlito" fill="#333">Stau hinter den Gleisen?</text><text x="10" y="180" font-size="11" font-family="Carlito" fill="#333">Wann darf A fahren?</text></svg>`,
};
const GROUPS = [
  { n: 1, key: 'schild', t: 'Schilder-Detektive', icon: 'LuSignpost', sub: 'Die Form verrät, was es will.',
    know: ['<b>Dreieck</b> = Gefahrzeichen: Achtung, Tempo runter.', '<b>Kreis</b> = Vorschriftzeichen: blau Gebot, rot umrandet Verbot.', '<b>Rechteck</b> = Richtzeichen: Hinweise, manchmal Pflicht.', '<b>Zusatzzeichen</b> gelten nur für das Zeichen darüber.'],
    task: 'Schneidet die Schilder unten aus und sortiert sie auf dem Plakat in drei Spalten. Schreibt zu jedem Schild die Bedeutung und was ihr tut. Versteckt ein Schild als Rätsel für die Klasse.',
    help: ['Welche Form hat das Schild?', 'Blau oder rot umrandet?', 'Was würdet ihr als Fahrer jetzt tun?'],
    strip: ['101', '136_10', '142_10', '274_70', '267', '276', '237', '330_1', '350_10', '220_10'] },
  { n: 2, key: 'linien', t: 'Linien und Helfer', icon: 'LuConstruction', sub: 'Auch die Straße spricht.',
    know: ['<b>Gestrichelt</b>: darfst du überfahren. <b>Durchgezogen</b>: nicht.', '<b>Einseitig</b>: nur von der gestrichelten Seite rüber.', '<b>Gelb schlägt Weiß</b> (Baustelle).', '<b>Leitpfosten</b>: rechts Rechteck, links zwei Punkte, meist alle 50 m.'],
    task: 'Zeichnet eine Straße von oben mit drei Linien-Abschnitten und einer Baustelle mit gelben Linien. Klebt Leitbaken und Leitpfosten dazu. Fragt die Klasse: Darf ich hier rüber?',
    help: ['Auf welcher Seite ist die gestrichelte Linie?', 'Welche Linie gilt an der Baustelle?', 'Wo fährst du an der Leitbake vorbei?'],
    strip: ['ve_bake_l', 've_bake_r', 've_pfosten_r', 've_pfosten_l', 've_kegel', 've_schranke', 'sign_626_20'] },
  { n: 3, key: 'bahn', t: 'Bahnübergang', icon: 'LuTrainFront', sub: 'Der Zug hat immer Vorrang.',
    know: ['Baken: <b>3 / 2 / 1 Streifen</b> ≈ 240 / 160 / 80 m. Kfz <b>nicht überholen</b>.', '<b>Warten</b> vor dem Andreaskreuz: Zug, Blinklicht, Schranke, Bahnmitarbeiter, Pfeifsignal.', '<b>Stau</b> hinter den Gleisen? Vor dem Andreaskreuz warten.', '<b>Notfall</b>: alle raus, weg von den Gleisen, 112.'],
    task: 'Zeichnet einen Bahnübergang von oben mit Baken, Andreaskreuz und Schranke. Baut die Stau-Falle als Rätsel: Wann darf Auto A fahren? Dazu der Notfall-Plan in 4 Schritten.',
    help: ['Wie weit ist es bei zwei Streifen noch?', 'Kommt A zügig ganz rüber?', 'Was tut ihr zuerst, wenn das Auto stehen bleibt?'],
    strip: ['bb3', 'bb2', 'bb1', 'sign_201', 'sign_201_51'] },
];
const css = `
@page { size: A4; margin: 13mm; }
* { box-sizing: border-box; }
body { font-family: Calibri, Carlito, Arial, sans-serif; color: #1D1F24; font-size: 10.5pt; line-height: 1.3; margin: 0; }
h1, h2, h3 { font-family: Cambria, Caladea, Georgia, serif; margin: 0; }
.page { page-break-after: always; position: relative; height: 270mm; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.head { display: flex; justify-content: space-between; border-bottom: 2px solid #1D1F24; padding-bottom: 5px; margin-bottom: 10px; }
.head .l { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; color: #6B6F78; font-weight: 700; } .head .r { font-size: 9pt; color: #6B6F78; }
.title { display: flex; align-items: center; gap: 14px; margin-bottom: 9px; }
.badge { width: 58px; height: 58px; border-radius: 50%; border: 3px solid #E8650F; display: flex; align-items: center; justify-content: center; flex: none; }
.title h1 { font-size: 27pt; line-height: 1.05; } .title .sub { font-size: 12pt; color: #E8650F; font-weight: 700; margin-top: 2px; }
.kick { font-size: 8.5pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #E8650F; margin-bottom: 3px; }
.box { border: 1.5px solid #C9CCD2; border-radius: 10px; padding: 8px 11px; margin-bottom: 8px; }
.mission { border: 2.5px solid #E8650F; background: #FFF6EF; }
.big { font-size: 13.5pt; font-weight: 700; line-height: 1.25; }
.row { display: flex; gap: 9px; } .row > .box { flex: 1; }
ul { margin: 2px 0 0; padding-left: 17px; } li { margin-bottom: 3px; }
.tg { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; }
.tg div { border: 1.5px solid #C9CCD2; border-radius: 8px; padding: 6px 8px; font-size: 9.8pt; }
.tg b { display: block; font-size: 10.5pt; }
.cols { display: flex; gap: 6px; margin-top: 3px; } .cols span { border-radius: 5px; padding: 1px 7px; font-weight: 700; font-size: 9.5pt; }
.poster { border: 2.5px solid #1D1F24; border-radius: 12px; padding: 8px 10px; height: 84mm; display: grid; grid-template-columns: 1.55fr 1fr; grid-template-rows: 9mm 50mm 10mm; gap: 5px 10px; }
.p-t { grid-column: 1 / 3; border-bottom: 2px solid #1F3A68; font-family: Cambria, Caladea, serif; font-size: 16pt; font-weight: 700; color: #1F3A68; text-align: center; }
.p-s { border: 1.5px dashed #9AA0AA; border-radius: 8px; padding: 3px; min-height: 0; overflow: hidden; } .p-s svg { display: block; height: 100%; width: 100%; }
.p-r { border: 1.5px dashed #9AA0AA; border-radius: 8px; padding: 6px 8px; font-size: 9.5pt; color: #6B6F78; display: flex; flex-direction: column; gap: 5px; }
.p-r b { color: #1D1F24; } .ln { border-bottom: 1px solid #C9CCD2; height: 14px; }
.p-b { grid-column: 1 / 3; border: 1.5px dashed #9AA0AA; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11pt; }
.notes { display: flex; justify-content: space-between; font-size: 9.2pt; color: #444; margin-top: 4px; }
.foot { position: absolute; bottom: 0; left: 0; right: 0; font-size: 8pt; color: #9AA0AA; display: flex; justify-content: space-between; }
table { width: 100%; border-collapse: collapse; font-size: 9.8pt; } td, th { border: 1px solid #C9CCD2; padding: 5px 7px; vertical-align: top; text-align: left; } th { background: #F2F3F5; }
.signs img { height: 26px; vertical-align: middle; margin-right: 4px; }
.strip { border: 1.5px dashed #555; border-radius: 8px; padding: 5px 8px; margin-top: 6px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.strip img { height: 15mm; } .strip .sc { font-size: 9pt; color: #555; font-weight: 700; }
`;
const foot = (n) => `<div class="foot"><span>Fahrschule Boost · Fahrlehrer Serband · Lektion 6 „Verkehrszeichen, Verkehrseinrichtungen und Bahnübergänge“</span><span>${n}</span></div>`;
const stripImg = (f) => { const file = f.startsWith('ve_') || f.startsWith('bb') || f.startsWith('sign_') ? f : 'sign_' + f; return `<img src="${img(file)}">`; };
function sheet(g) {
  return `
<section class="page">
  <div class="head"><span class="l">Gruppenarbeit · Lektion 6</span><span class="r">Namen: ______________________________</span></div>
  <div class="title"><div class="badge">${ic(g.icon, '#E8650F', 32)}</div><div><div class="kick">Gruppe ${g.n}</div><h1>${g.t}</h1><div class="sub">${g.sub}</div></div></div>
  <div class="box mission"><div class="kick">Eure Aufgabe · 15 Minuten</div>
    <div class="big">Baut ein Rätsel für die Klasse.</div>
    <div style="margin-top:4px">${g.task} Dazu <b>3 Regeln</b> und <b>1 Merksatz</b>.</div></div>
  <div class="row">
    <div class="box"><div class="kick">Das müsst ihr wissen</div><ul>${g.know.map(k => `<li>${k}</li>`).join('')}</ul></div>
    <div class="box" style="flex:0.75"><div class="kick">Wenn ihr hängt</div><ul>${g.help.map(k => `<li>${k}</li>`).join('')}</ul></div>
  </div>
  <div class="kick" style="margin:2px 0 4px">Tipps &amp; Tricks für ein starkes Plakat</div>
  <div class="tg">
    <div><b>Groß zeichnen</b>Mit Lineal, von oben. Überschrift ca. 5 cm.</div>
    <div><b>Ausschneiden</b>Die Schilder unten ausschneiden und aufkleben.</div>
    <div><b>Farbcode</b><div class="cols"><span style="background:#DDF3E6;color:#1E7A43">Grün: darf</span><span style="background:#FBE3E1;color:#B3261E">Rot: verboten</span></div></div>
    <div><b>Kurz halten</b>Jede Regel höchstens 8 Wörter.</div>
    <div><b>Rätsel einbauen</b>Eine Frage an die Klasse, Lösung zum Aufklappen.</div>
    <div><b>Vorstellung: 2 Minuten</b>Erst rät die Klasse, dann löst ihr auf.</div>
  </div>
  <div class="kick" style="margin:8px 0 4px">So kann euer Plakat aussehen</div>
  <div class="poster">
    <div class="p-t">${g.n === 1 ? 'WOHIN GEHÖRT ES?' : g.n === 2 ? 'DARF ICH HIER RÜBER?' : 'WANN DARF A FAHREN?'}</div>
    <div class="p-s">${SK[g.key]}</div>
    <div class="p-r"><b>3 Regeln</b><span>1</span><div class="ln"></div><span>2</span><div class="ln"></div><span>3</span><div class="ln"></div><b style="margin-top:3px">Auflösung (zuklappen!)</b></div>
    <div class="p-b">MERKSATZ: ______________________________</div>
  </div>
  <div class="strip"><span class="sc">✂ Ausschneiden:</span>${g.strip.map(stripImg).join('')}</div>
  ${foot('Gruppe ' + g.n)}
</section>`;
}
function teacher() {
  return `
<section class="page">
  <div class="head"><span class="l">Nur für den Fahrlehrer</span><span class="r">Abend Lektion 5 + 6 · Gruppenarbeit in Lektion 6</span></div>
  <h1 style="font-size:24pt;margin-bottom:8px">Ablauf und Erwartungshorizont</h1>
  <div class="row">
    <div class="box"><div class="kick">Material</div><ul>
      <li>Je Gruppe ihr Blatt (1 Seite, farbig drucken)</li>
      <li>Pro Gruppe 1 Plakat (A2 oder Flipchart), Lineal, Schere, Kleber</li>
      <li>Dicke Stifte: Schwarz, Rot, Grün, Gelb, Blau</li>
      <li>Klebezettel (Autos), Klebeband</li></ul></div>
    <div class="box"><div class="kick">Ablauf (ca. 25 Minuten)</div><ul>
      <li>3 Gruppen, 3–5 Personen</li>
      <li>15 Minuten Arbeit (Timer auf der Folie)</li>
      <li>Je Gruppe 2 Minuten: Klasse rät, Gruppe löst auf</li>
      <li>Danach Folie „Sechs Sätze“</li></ul></div>
  </div>
  <div class="box"><div class="kick">Deine Rolle</div>Herumgehen, <b>keine Lösungen geben</b>. Hängt eine Gruppe, stell eine Frage aus „Wenn ihr hängt“. Achte darauf, dass jede Gruppe ein <b>eindeutiges Rätsel</b> baut.</div>
  <div class="kick" style="margin:4px 0 4px">Das muss rein (Erwartungshorizont)</div>
  <table><tr><th style="width:22%">Gruppe</th><th>Pflicht auf dem Plakat</th><th style="width:30%">Typische Fehler</th></tr>
    <tr><td><b>1 · Schilder-Detektive</b></td><td>Richtig sortiert (Dreieck/Kreis/Rechteck) · Bedeutung und Verhalten je Schild · Zusatzzeichen-Regel</td><td>Radweg (blau, rund) als Richtzeichen · Fußgängerüberweg als Gefahrzeichen</td></tr>
    <tr><td><b>2 · Linien und Helfer</b></td><td>Leitlinie / Fahrstreifenbegrenzung / einseitige richtig · Gelb vor Weiß · Leitbake: Streifen fallen zur Vorbeifahr-Seite · Leitpfosten rechts Rechteck</td><td>Einseitige Linie falschherum · „Weiß gilt immer“</td></tr>
    <tr><td><b>3 · Bahnübergang</b></td><td>Baken 240/160/80 m · Überholverbot · 5 Wartefälle · Stau: vor dem Andreaskreuz warten · Notfall: raus, weg, 112</td><td>„Bei offener Schranke immer fahren“ · im Notfall erst Auto retten wollen</td></tr>
  </table>
  <div class="row" style="margin-top:8px">
    <div class="box"><div class="kick">Lösungen Lektion 5 · Kreuzungs-Duell</div><ul>
      <li>Runde 1: B, A · Runde 2: B, A, C</li><li>Runde 3: B, C, A</li><li>Runde 4: Patt → Verständigung (A), dann D, C, B</li><li>Runde 5: C, A, B · Rätsel des Abends: A, B, C</li></ul></div>
    <div class="box"><div class="kick">Tipp</div>Plakate hängen lassen. Beim nächsten Termin (Lektion 7 und 8) kurz wiederholen: „Welche Gruppe erinnert sich an ihr Rätsel?“</div>
  </div>
  ${foot('Lehrerblatt')}
</section>`;
}
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Lektion 6 · Gruppenarbeit</title><style>${css}</style></head><body>
${teacher()}
${GROUPS.map(sheet).join('\n')}
</body></html>`;
const OUT = path.join(__dirname, 'worksheets6');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'arbeitsblaetter.html'), html);
(async () => {
  let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + path.join(OUT, 'arbeitsblaetter.html'));
  await p.pdf({ path: path.join(OUT, 'Lektion06_Gruppenarbeit_Arbeitsblaetter.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('PDF fertig');
})();
