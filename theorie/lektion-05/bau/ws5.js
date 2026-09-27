// Arbeitsblätter Gruppenarbeit Lektion 5 (A4, druckfertig) → PDF
const React = require('react');
const RDS = require('react-dom/server');
const LU = require('react-icons/lu');
const fs = require('fs');
const path = require('path');
const ic = (n, c = '#E8650F', s = 28) => RDS.renderToStaticMarkup(React.createElement(LU[n], { color: c, size: String(s), strokeWidth: 1.8 }));
const sg = (id) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'art', 'sign_' + id + '.png')).toString('base64');
const zz = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'art', 'zz_SW.png')).toString('base64');

// Plakat-Skizzen (SVG, Draufsicht, schwarz-weiß druckfreundlich)
const note = (x, y, t, c) => `<g transform="rotate(-5 ${x + 14} ${y + 14})"><rect x="${x}" y="${y}" width="28" height="28" fill="${c}" stroke="#555" stroke-width="0.6"/><text x="${x + 14}" y="${y + 20}" font-size="16" font-weight="700" text-anchor="middle" font-family="Carlito,Calibri">${t}</text></g>`;
const arrow = (d, col) => `<path d="${d}" stroke="${col}" stroke-width="3" fill="none" marker-end="url(#m${col.slice(1)})"/>`;
const mk = (col) => `<marker id="m${col.slice(1)}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${col}"/></marker>`;
const G = '#2E9E5B', RD = '#C62828';
const sketchX = (extra = '') => `<svg viewBox="0 0 300 220" width="100%" height="100%"><defs>${mk(G)}${mk(RD)}</defs>
  <rect x="120" y="0" width="60" height="220" fill="#D7DBE0"/><rect x="0" y="80" width="300" height="60" fill="#D7DBE0"/>
  <line x1="150" y1="0" x2="150" y2="75" stroke="#fff" stroke-width="2" stroke-dasharray="8 8"/><line x1="150" y1="145" x2="150" y2="220" stroke="#fff" stroke-width="2" stroke-dasharray="8 8"/>
  <line x1="0" y1="110" x2="115" y2="110" stroke="#fff" stroke-width="2" stroke-dasharray="8 8"/><line x1="185" y1="110" x2="300" y2="110" stroke="#fff" stroke-width="2" stroke-dasharray="8 8"/>${extra}</svg>`;
const SK = {
  abk: sketchX(`<path d="M150 220 L150 120 Q150 110 140 110 L0 110" stroke="#1D1F24" stroke-width="10" fill="none" opacity="0.25"/>
    ${note(155, 160, 'A', '#FFE066')}${note(115, 30, 'B', '#A5D8FF')}${note(215, 82, 'C', '#FFB3C1')}
    ${arrow('M168 150 L168 125 Q168 98 140 98 L95 98', G)}${arrow('M235 125 L205 125', RD)}
    <image href="${zz}" x="190" y="160" width="46" height="36"/><text x="245" y="185" font-size="11" font-family="Carlito">Zusatzzeichen</text>`),
  kreis: `<svg viewBox="0 0 300 220" width="100%" height="100%"><defs>${mk(G)}${mk(RD)}</defs>
    <rect x="125" y="0" width="50" height="220" fill="#D7DBE0"/><rect x="0" y="85" width="300" height="50" fill="#D7DBE0"/>
    <circle cx="150" cy="110" r="62" fill="#D7DBE0"/><circle cx="150" cy="110" r="28" fill="#fff" stroke="#1D1F24" stroke-width="2"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${130 + i * 9}" y="182" width="5" height="14" fill="#1D1F24"/>`).join('')}
    ${note(158, 190, 'A', '#FFE066')}${note(92, 70, 'B', '#A5D8FF')}${note(230, 70, 'C', '#FFB3C1')}
    ${arrow('M110 128 Q150 170 190 128', G)}${arrow('M172 205 L172 190', RD)}
    <text x="6" y="14" font-size="11" font-family="Carlito">Schilder 215 + 205, Zebrastreifen</text></svg>`,
  amp: sketchX(`<rect x="188" y="148" width="14" height="36" rx="3" fill="#1D1F24"/><circle cx="195" cy="156" r="4.5" fill="#E53935"/><circle cx="195" cy="166" r="4.5" fill="#666"/><circle cx="195" cy="176" r="4.5" fill="#666"/>
    <image href="${sg('720')}" x="206" y="150" width="24" height="18"/>
    <circle cx="150" cy="110" r="9" fill="#274A86"/><line x1="126" y1="110" x2="174" y2="110" stroke="#274A86" stroke-width="4"/>
    ${note(155, 165, 'A', '#FFE066')}${note(30, 115, 'B', '#A5D8FF')}${note(235, 60, 'C', '#FFB3C1')}
    ${arrow('M168 160 L168 140 Q168 128 185 128 L230 128', G)}<circle cx="215" cy="150" r="5" fill="#8E24AA"/><text x="224" y="210" font-size="11" font-family="Carlito">Fußgänger</text>`),
};

const GROUPS = [
  { n: 1, key: 'abk', t: 'Abknickende Vorfahrt', icon: 'LuCornerUpLeft', sub: 'Die Vorfahrtstraße macht einen Knick.',
    know: ['Zusatzzeichen: <b>dick</b> = Vorfahrtstraße, <b>dünn</b> = Nebenstraßen. Du kommst immer von unten.', 'Wer dem Knick folgt, <b>blinkt</b>.', 'Auf der Vorfahrtstraße untereinander: <b>Abbiegeregeln</b> (Gegenverkehr).', 'Auf den Nebenstraßen untereinander: <b>rechts vor links</b>.'],
    task: 'Zeichnet eine Kreuzung mit abknickender Vorfahrt (Richtung dürft ihr wählen) und das Zusatzzeichen. Stellt 3 Autos auf: mindestens 1 auf der Vorfahrtstraße, 2 auf Nebenstraßen.',
    help: ['Welche Straßen sind dick, welche dünn?', 'Wer von den Nebenstraßen kommt für den anderen von rechts?', 'Wer muss blinken, wer nicht?'] },
  { n: 2, key: 'kreis', t: 'Kreisverkehr', icon: 'LuRefreshCw', sub: 'Rein ohne, raus mit.',
    know: ['Steht <b>215 unter 205</b>, hat der Verkehr im Kreis Vorfahrt.', 'Reinfahren: <b>nicht blinken</b>. Rausfahren: <b>rechts blinken</b>.', 'Im Kreis <b>nicht halten</b>. Mittelinsel nicht überfahren.', 'An der Ausfahrt: <b>Fußgänger</b> am Zebrastreifen zuerst.'],
    task: 'Zeichnet einen Kreisverkehr mit 4 Armen, Schildern und einem Zebrastreifen. Stellt 3 Autos auf (1 im Kreis, 2 an Einfahrten) und 1 Fußgänger.',
    help: ['Wer ist schon im Kreis?', 'Wann setzt das Auto den Blinker, das zur zweiten Ausfahrt will?', 'Was gilt, wenn nur 215 und kein 205 dasteht?'] },
  { n: 3, key: 'amp', t: 'Ampel, Grünpfeil, Polizei', icon: 'LuSiren', sub: 'Wer hat das Sagen?',
    know: ['Rangfolge: <b>Polizei › Ampel › Schild › rechts vor links</b>.', 'Grünpfeil: <b>anhalten</b>, nur rechter Fahrstreifen, wer Grün hat, geht vor.', 'Ampel aus: <b>Schilder</b> gelten. Keine Schilder: rechts vor links.', 'Polizist: <b>Brust/Rücken = Halt</b>, Seite = frei, Arm hoch = wie Gelb.'],
    task: 'Zeichnet eine Ampelkreuzung. Wählt: Rot mit Grünpfeil ODER ein Polizist in der Mitte. Stellt 3 Autos und 1 Fußgänger auf.',
    help: ['Wer hat Grün, wer Rot?', 'Was muss das Auto am Grünpfeil zuerst tun?', 'Wer sieht beim Polizisten die Seite?'] },
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
.poster { border: 2.5px solid #1D1F24; border-radius: 12px; padding: 8px 10px; height: 100mm; display: grid; grid-template-columns: 1.55fr 1fr; grid-template-rows: 10mm 64mm 11mm; gap: 5px 10px; }
.p-t { grid-column: 1 / 3; border-bottom: 2px solid #1F3A68; font-family: Cambria, Caladea, serif; font-size: 16pt; font-weight: 700; color: #1F3A68; text-align: center; }
.p-s { border: 1.5px dashed #9AA0AA; border-radius: 8px; padding: 3px; min-height: 0; overflow: hidden; } .p-s svg { display: block; height: 100%; width: 100%; }
.p-r { border: 1.5px dashed #9AA0AA; border-radius: 8px; padding: 6px 8px; font-size: 9.5pt; color: #6B6F78; display: flex; flex-direction: column; gap: 5px; }
.p-r b { color: #1D1F24; } .ln { border-bottom: 1px solid #C9CCD2; height: 14px; }
.p-b { grid-column: 1 / 3; border: 1.5px dashed #9AA0AA; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11pt; }
.notes { display: flex; justify-content: space-between; font-size: 9.2pt; color: #444; margin-top: 4px; }
.foot { position: absolute; bottom: 0; left: 0; right: 0; font-size: 8pt; color: #9AA0AA; display: flex; justify-content: space-between; }
table { width: 100%; border-collapse: collapse; font-size: 9.8pt; } td, th { border: 1px solid #C9CCD2; padding: 5px 7px; vertical-align: top; text-align: left; } th { background: #F2F3F5; }
.signs img { height: 26px; vertical-align: middle; margin-right: 4px; }
`;
const foot = (n) => `<div class="foot"><span>Fahrschule Boost · Fahrlehrer Serband · Lektion 5 „Grundregel, Vorfahrt und Verkehrsregelungen“</span><span>${n}</span></div>`;

function sheet(g) {
  return `
<section class="page">
  <div class="head"><span class="l">Gruppenarbeit · Lektion 5</span><span class="r">Namen: ______________________________</span></div>
  <div class="title"><div class="badge">${ic(g.icon, '#E8650F', 32)}</div><div><div class="kick">Gruppe ${g.n}</div><h1>${g.t}</h1><div class="sub">${g.sub}</div></div></div>
  <div class="box mission"><div class="kick">Eure Aufgabe · 15 Minuten</div>
    <div class="big">Baut ein Kreuzungs-Rätsel „Wer fährt zuerst?“ für die Klasse.</div>
    <div style="margin-top:4px">${g.task} Dazu <b>3 Regeln</b> und <b>1 Merksatz</b>.</div></div>
  <div class="row">
    <div class="box"><div class="kick">Das müsst ihr wissen</div><ul>${g.know.map(k => `<li>${k}</li>`).join('')}</ul></div>
    <div class="box" style="flex:0.75"><div class="kick">Wenn ihr hängt</div><ul>${g.help.map(k => `<li>${k}</li>`).join('')}</ul></div>
  </div>
  <div class="kick" style="margin:2px 0 4px">Tipps &amp; Tricks für ein starkes Plakat</div>
  <div class="tg">
    <div><b>Von oben zeichnen</b>Straßen breit, mit Lineal. Schilder klein dazu.</div>
    <div><b>Autos = Klebezettel</b>A, B, C drauf. Bei der Vorstellung verschiebt ihr sie: Die Autos „fahren“ live.</div>
    <div><b>Farbcode</b><div class="cols"><span style="background:#DDF3E6;color:#1E7A43">Grün: fährt</span><span style="background:#FBE3E1;color:#B3261E">Rot: wartet</span></div></div>
    <div><b>Groß schreiben</b>Überschrift ca. 5 cm, Regeln ca. 2 cm. Druckbuchstaben.</div>
    <div><b>Kurz halten</b>Jede Regel höchstens 8 Wörter. Merksatz höchstens 8 Wörter.</div>
    <div><b>Vorstellung: 2 Minuten</b>Erst rät die Klasse, dann löst ihr auf. Einer zeigt, einer spricht.</div>
  </div>
  <div class="kick" style="margin:8px 0 4px">So kann euer Plakat aussehen</div>
  <div class="poster">
    <div class="p-t">WER FÄHRT ZUERST?</div>
    <div class="p-s">${SK[g.key]}</div>
    <div class="p-r"><b>3 Regeln</b><span>1</span><div class="ln"></div><span>2</span><div class="ln"></div><span>3</span><div class="ln"></div><b style="margin-top:4px">Auflösung (zuklappen!)</b><span>1. ___ 2. ___ 3. ___</span></div>
    <div class="p-b">MERKSATZ: ______________________________</div>
  </div>
  <div class="notes"><span>① Kreuzung + Schilder</span><span>② Klebezettel-Autos + Pfeile</span><span>③ Regeln + Merksatz</span><span>④ Auflösung abdecken</span></div>
  ${foot('Gruppe ' + g.n)}
</section>`;
}

function teacher() {
  return `
<section class="page">
  <div class="head"><span class="l">Nur für den Fahrlehrer</span><span class="r">Lektion 5 · Gruppenarbeit</span></div>
  <h1 style="font-size:24pt;margin-bottom:8px">Ablauf und Erwartungshorizont</h1>
  <div class="row">
    <div class="box"><div class="kick">Material</div><ul>
      <li>Je Gruppe ihr Blatt (1 Seite)</li>
      <li>Pro Gruppe 1 Plakat (A2 oder Flipchart), Lineal</li>
      <li>Dicke Stifte: Schwarz, Grün, Rot</li>
      <li>Klebezettel in 3 Farben (Autos), Klebeband</li></ul></div>
    <div class="box"><div class="kick">Ablauf (ca. 25 Minuten)</div><ul>
      <li>3 Gruppen bilden, 3–5 Personen</li>
      <li>15 Minuten Arbeit (Timer auf der Folie)</li>
      <li>Je Gruppe 2 Minuten: Klasse rät, Gruppe löst mit Klebezetteln auf</li>
      <li>Du ergänzt, was fehlt</li></ul></div>
  </div>
  <div class="box"><div class="kick">Deine Rolle</div>Herumgehen, <b>keine Lösungen geben</b>. Hängt eine Gruppe, stell eine Frage aus „Wenn ihr hängt“. Prüfe früh, ob das Rätsel <b>eindeutig lösbar</b> ist. Vier Autos ohne Regelung (Patt) nur, wenn die Gruppe die Verständigung erklärt.</div>
  <div class="kick" style="margin:4px 0 4px">Das muss rein (Erwartungshorizont)</div>
  <table><tr><th style="width:22%">Gruppe</th><th>Pflicht auf dem Plakat</th><th style="width:30%">Typische Fehler</th></tr>
    <tr><td><b>1 · Abknickende Vorfahrt</b><div class="signs"><img src="${sg('306')}"><img src="${zz}"></div></td><td>Zusatzzeichen richtig gelesen · Blinker beim Folgen · Vorfahrtstraße zuerst · Nebenstraßen untereinander rechts vor links</td><td>„Geradeaus hat Vorrang“ · Blinken beim geraden Verlassen · Zusatzzeichen falsch gedreht</td></tr>
    <tr><td><b>2 · Kreisverkehr</b><div class="signs"><img src="${sg('215')}"><img src="${sg('205')}"></div></td><td>Kreis hat Vorfahrt (215 unter 205) · rein ohne, raus mit Blinker · Fußgänger an der Ausfahrt · nicht halten im Kreis</td><td>Blinken beim Reinfahren · zu früh rechts blinken · Einfahrender „von rechts“ hat Vorfahrt (nur ohne 205!)</td></tr>
    <tr><td><b>3 · Ampel, Grünpfeil, Polizei</b><div class="signs"><img src="${sg('720')}"></div></td><td>Rangfolge Polizei › Ampel › Schild › rechts vor links · Grünpfeil: anhalten, rechter Fahrstreifen, Grün zuerst · Handzeichen richtig</td><td>Grünpfeil ohne Anhalten · Grünpfeil-Schild mit grünem Pfeil in der Ampel verwechselt · Polizist falsch gelesen</td></tr>
  </table>
  <div class="box" style="margin-top:8px"><div class="kick">Überleitung danach</div>„Und jetzt lösen wir das Rätsel vom Anfang des Abends …“ → Folie „Die Auflösung“.</div>
  <div class="row">
    <div class="box"><div class="kick">Lösungen Kreuzungs-Duell</div><ul>
      <li>Runde 1: B, A</li><li>Runde 2: B, A, C</li><li>Runde 3: B, C, A</li><li>Runde 4: Patt → Verständigung (A), dann D, C, B</li><li>Runde 5: C, A, B</li></ul></div>
    <div class="box"><div class="kick">Rätsel des Abends</div><b>A, B, C.</b> A ist auf der Vorfahrtstraße und folgt dem Knick (blinkt). B und C sind auf Nebenstraßen: rechts vor links, B kommt für C von rechts.</div>
  </div>
  <div class="box"><div class="kick">Tipp</div>Plakate bis Lektion 6 hängen lassen. Sie passen gut zu den Verkehrszeichen.</div>
  ${foot('Lehrerblatt')}
</section>`;
}

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Lektion 5 · Gruppenarbeit</title><style>${css}</style></head><body>
${teacher()}
${GROUPS.map(sheet).join('\n')}
</body></html>`;
const OUT = path.join(__dirname, 'worksheets5');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'arbeitsblaetter.html'), html);
(async () => {
  let pw; try { pw = require('playwright'); } catch { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + path.join(OUT, 'arbeitsblaetter.html'));
  await p.pdf({ path: path.join(OUT, 'Lektion05_Gruppenarbeit_Arbeitsblaetter.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('PDF fertig');
})();
