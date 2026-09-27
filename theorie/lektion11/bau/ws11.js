// Arbeitsblätter Gruppenarbeit Lektion 11 (A4) → PDF
const React = require('react');
const RDS = require('react-dom/server');
const LU = require('react-icons/lu');
const fs = require('fs');
const path = require('path');
const ic = (n, c = '#E8650F', s = 28) => RDS.renderToStaticMarkup(React.createElement(LU[n], { color: c, size: String(s), strokeWidth: 1.8 }));

const GROUPS = [
  { key: 'licht', name: 'LICHT', thema: 'Licht & Sicht', icon: 'LuEye',
    auftrag: 'Erklärt der Klasse, welches Licht wann richtig ist. Mit Nebel und Blendung.',
    fragen: ['Welche 5 Leuchten gibt es, und wann benutzt man sie?', 'Was ist die „50er-Regel“ bei Nebel?', 'Geblendet: Was tust du in 3 Schritten?', 'Warum reicht Tagfahrlicht in der Dämmerung nicht?'],
    tipp: 'Zeichnet die Symbole aus dem Cockpit groß ab. Ein Bild sagt mehr als ein Satz.' },
  { key: 'blau', name: 'BLAULICHT', thema: 'Blaulicht', icon: 'LuSiren',
    auftrag: 'Erklärt der Klasse, wie man ruhig und richtig Platz macht. Mit Rettungsgasse.',
    fragen: ['Blau + Horn, Blau allein, Gelb: Was bedeutet was?', 'Wann und wie bildest du die Rettungsgasse?', 'Rote Ampel, Blaulicht hinter dir: Was tust du?', 'Was kostet es, keinen Platz zu machen?'],
    tipp: 'Zeichnet die Autobahn von oben: 3 Spuren, Autos als Kästchen, Pfeile für links und rechts.' },
  { key: 'tunnel', name: 'TUNNEL', thema: 'Tunnel', icon: 'LuFlame',
    auftrag: 'Erklärt der Klasse, was im Tunnel gilt. Vor der Einfahrt und im Notfall.',
    fragen: ['Welche Regeln gelten vor und im Tunnel?', 'Stau im Tunnel: Was ist anders?', 'Panne im Tunnel: Wo hältst du, wen rufst du?', 'Brand: Warum bleibt der Schlüssel stecken?'],
    tipp: 'Macht drei Spalten: Stau, Panne, Brand. Jede mit einem eigenen Symbol.' }
];
const IDEEN = {
  licht: ['Standlicht nur Halten/Parken · Abblendlicht bei Dämmerung, Dunkelheit, starker Sichtbehinderung, Tunnel · Fernlicht nur auf unbeleuchteten Straßen, ohne Blendung · Nebelscheinwerfer bei starker Sichtbehinderung · Nebelschlussleuchte nur bei Nebel unter 50 m', 'Sicht unter 50 m → max. 50 km/h → Nebelschlussleuchte darf an, nur bei Nebel (Leitpfosten auf gerader Strecke alle 50 m)', 'Blick zum rechten Rand, Tempo runter, notfalls anhalten, nicht zurückblenden', 'Tagfahrlicht: hinten oft dunkel → Abblendlicht an'],
  blau: ['Blau + Horn: sofort freie Bahn (Wegerecht § 38) · Blau allein: Warnung · Gelb: warnt, kein Vorrecht', 'Schon bei Schritttempo/Stillstand; ganz links nach links, alle anderen nach rechts', 'Ruhig bleiben, nur wenn nötig vorsichtig vorrollen, niemanden gefährden', 'Keine Gasse 200 € + 2 P · mit Behinderung / Gasse befahren / kein Platz bei Blau + Horn: 240 € + 2 P + 1 Monat Fahrverbot'],
  tunnel: ['Abblendlicht (Z. 327), Sonnenbrille ab, Radio an, Abstand, nicht wenden (Z. 327), nicht rückwärts, nur im Notfall halten', 'Warnblinker, mind. 5 m Abstand, Rettungsgasse, bei längerem Stillstand Motor aus', 'Pannenbucht, Warnblinker, Warnweste, Notrufstation (Zentrale sieht, wo du bist)', 'Feuerwehr muss das Auto wegfahren können; Tür nicht abschließen, zu Fuß weg vom Rauch zum grünen Notausgang']
};
const css = `
@page { size: A4; margin: 14mm 14mm 14mm 14mm; }
* { box-sizing: border-box; }
body { font-family: Calibri, Carlito, Arial, sans-serif; color: #1D1F24; font-size: 10.5pt; line-height: 1.32; margin: 0; }
h1, h2, h3 { font-family: Cambria, Caladea, Georgia, serif; margin: 0; }
.page { page-break-after: always; position: relative; height: 268mm; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.head { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1D1F24; padding-bottom: 6px; margin-bottom: 12px; }
.head .l { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; color: #6B6F78; font-weight: 700; }
.head .r { font-size: 9pt; color: #6B6F78; }
.title { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
.badge { width: 58px; height: 58px; border-radius: 50%; border: 3px solid #E8650F; display: flex; align-items: center; justify-content: center; flex: none; }
.title h1 { font-size: 24pt; line-height: 1.05; }
.title .sub { font-size: 12pt; color: #E8650F; font-weight: 700; margin-top: 2px; }
.box { border: 1.5px solid #C9CCD2; border-radius: 10px; padding: 8px 11px; margin-bottom: 8px; }
.box.mission { border: 2.5px solid #E8650F; background: #FFF6EF; }
.box h3 { font-size: 13pt; margin-bottom: 4px; }
.kick { font-size: 8.5pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #E8650F; margin-bottom: 2px; }
.row { display: flex; gap: 10px; }
.row > .box { flex: 1; }
ul { margin: 4px 0 0 0; padding-left: 18px; } li { margin-bottom: 3px; }
.big { font-size: 15pt; font-weight: 700; }
.q4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 6px; }
.q4 div { border: 1.5px solid #E8650F; border-radius: 8px; padding: 5px 6px; text-align: center; font-weight: 700; font-size: 10.5pt; }
.q4 small { display: block; font-weight: 400; color: #555; font-size: 8.5pt; }
.bad { color: #B3261E; } .good { color: #1E7A43; }
.roles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 4px; }
.roles div { border: 1px dashed #9AA0AA; border-radius: 8px; padding: 5px 7px; font-size: 9.5pt; min-height: 44px; }
.roles b { display: block; font-size: 10pt; }
.time { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 4px; border: 1.5px solid #1D1F24; border-radius: 8px; overflow: hidden; }
.time div { padding: 5px 7px; font-size: 9.5pt; border-right: 1px solid #C9CCD2; } .time div:last-child { border-right: none; }
.time b { display: block; font-size: 10pt; color: #E8650F; }
.lines div { border-bottom: 1px solid #C9CCD2; height: 22px; }
.foot { position: absolute; bottom: 0; left: 0; right: 0; font-size: 8pt; color: #9AA0AA; display: flex; justify-content: space-between; }
/* Plakat-Vorlage */
.poster { border: 2.5px solid #1D1F24; border-radius: 12px; padding: 10px; height: 150mm; display: grid; grid-template-rows: 22mm 1fr 30mm; gap: 8px; }
.p-top { border: 1.5px dashed #9AA0AA; border-radius: 8px; display: flex; align-items: center; gap: 12px; padding: 0 12px; }
.p-top .t { font-family: Cambria, Caladea, serif; font-size: 17pt; font-weight: 700; }
.p-mid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tip { border: 2px solid #1D1F24; border-radius: 10px; padding: 8px; display: flex; flex-direction: column; }
.tip .n { font-family: Cambria, Caladea, serif; font-size: 24pt; font-weight: 700; color: #1F3A68; line-height: 1; }
.tip .f { border-bottom: 1px solid #E3D5CB; padding: 5px 0; font-size: 9pt; color: #6B6F78; flex: 1; }
.tip .f b { color: #1D1F24; }
.p-bot { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.p-bot div { border: 1.5px dashed #9AA0AA; border-radius: 8px; padding: 6px 10px; font-size: 9.5pt; color: #6B6F78; }
.p-bot b { color: #1D1F24; display: block; font-size: 10.5pt; }
.rules { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; font-size: 10pt; margin-top: 8px; }
.rules div::before { content: '✓ '; color: #1E7A43; font-weight: 700; }
.step { display: flex; gap: 10px; border: 1.5px solid #C9CCD2; border-radius: 10px; padding: 6px 10px; margin-bottom: 6px; }
.sn { flex: none; width: 30px; height: 30px; border-radius: 50%; background: #1D1F24; color: #fff; font-weight: 700; font-size: 14pt; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
.sb { flex: 1; font-size: 10pt; }
.st { font-weight: 700; font-size: 11.5pt; margin-bottom: 2px; display: flex; justify-content: space-between; }
.st span { color: #E8650F; font-size: 10pt; }
ul.small li { margin-bottom: 0; font-size: 9.5pt; }
.note { font-size: 9.5pt; color: #444; margin-top: 5px; }
.checks { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 16px; font-size: 10pt; }
.poster.sample { height: 150mm; grid-template-rows: 20mm 1fr 24mm; border-color: #1F3A68; }
.tip.s { border-color: #1F3A68; align-items: center; text-align: center; justify-content: space-between; }
.tip.s .n { color: #1F3A68; }
.tip.s .w { font-weight: 700; font-size: 14pt; line-height: 1.2; }
.tip.s .d { font-size: 8.5pt; color: #444; }
.w2 { display: block; font-weight: 700; font-size: 11.5pt; color: #1D1F24; }
.speech { background: #F6F7F9; border-radius: 8px; padding: 6px 10px; font-size: 10pt; }
.one .title h1 { font-size: 30pt; }
.one .big { font-size: 16pt; line-height: 1.25; }
.one .box.mission { padding: 12px 14px; margin-bottom: 12px; }
.tt { border: 1.5px solid #C9CCD2; border-radius: 10px; padding: 10px 12px; }
.ttg { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin-top: 4px; font-size: 11pt; }
.ttg b { display: block; font-size: 12pt; margin-bottom: 1px; }
.sketch { border: 2.5px solid #1D1F24; border-radius: 12px; padding: 10px; height: 112mm; display: grid; grid-template-rows: 15mm 1fr 12mm; gap: 7px; }
.sk-top { display: flex; align-items: center; justify-content: center; gap: 10px; border-bottom: 2px solid #1F3A68; font-family: Cambria, Caladea, serif; font-size: 17pt; font-weight: 700; color: #1F3A68; }
.sk-mid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.sk-tip { border: 2px solid #1D1F24; border-radius: 9px; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 7px; }
.sk-n { font-family: Cambria, Caladea, serif; font-size: 26pt; font-weight: 700; color: #1F3A68; line-height: 1; }
.sk-l { height: 7px; background: #1D1F24; border-radius: 4px; } .w80 { width: 80%; } .w60 { width: 60%; }
.sk-small { font-size: 8.5pt; color: #6B6F78; text-align: center; }
.sk-ic { margin-top: auto; font-size: 9pt; color: #6B6F78; }
.sk-bot { border: 1.5px dashed #9AA0AA; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #1D1F24; font-size: 11pt; }
.sk-notes { display: flex; justify-content: space-between; font-size: 9.5pt; color: #444; margin-top: 5px; }
table { width: 100%; border-collapse: collapse; font-size: 10pt; }
td, th { border: 1px solid #C9CCD2; padding: 5px 7px; vertical-align: top; text-align: left; }
th { background: #F2F3F5; }
`;
const css2 = ".sketch{height:88mm !important}";
const foot = (n) => `<div class="foot"><span>Fahrschule Boost · Fahrlehrer Serband · Lektion 11 „Besondere Situationen“</span><span>${n}</span></div>`;

function sheet(g) {
  return `
<section class="page one">
  <div class="head"><span class="l">Gruppenarbeit · Lektion 11</span><span class="r">Namen: ______________________________</span></div>
  <div class="title"><div class="badge">${ic(g.icon, '#E8650F', 34)}</div>
    <div><div class="kick">Thema ${g.thema}</div><h1>Gruppe ${g.name}</h1><div class="sub">Ihr seid jetzt die Fahrlehrer.</div></div></div>
  <div class="box mission">
    <div class="kick">Eure Aufgabe · 15 Minuten</div>
    <div class="big">${g.auftrag} Macht ein Plakat mit euren 3 wichtigsten Regeln und stellt es in 1 Minute vor.</div>
  </div>
  <div class="tt">
    <div class="kick">Diese Fragen helfen euch</div>
    <div class="ttg">${g.fragen.map((f, i) => `<div><b>${i + 1}.</b>${f}</div>`).join('')}</div>
  </div>
  <div class="tt" style="margin-top:8px">
    <div class="kick">Tipps &amp; Tricks</div>
    <div class="ttg">
      <div><b>Kurz sein</b>Pro Regel höchstens 6 Wörter.</div>
      <div><b>Beispiel</b><span class="bad">✗ „Man sollte vorsichtig sein“</span><br><span class="good">✓ „Sicht unter 50 m: max. 50 km/h“</span></div>
      <div><b>Bild statt Text</b>${g.tipp}</div>
      <div><b>Groß schreiben</b>Druckbuchstaben, Überschrift ca. 5 cm, Regeln ca. 3 cm. Nur Schwarz + eine dunkle Farbe.</div>
    </div>
  </div>
  <div class="kick" style="margin:10px 0 4px">So kann euer Plakat aussehen</div>
  <div class="sketch">
    <div class="sk-top">${ic(g.icon, '#1F3A68', 26)}<span>${g.thema.toUpperCase()}: DAS MUSST DU WISSEN</span></div>
    <div class="sk-mid">
      ${[1, 2, 3].map(n => `<div class="sk-tip"><div class="sk-n">${n}</div><div class="sk-l w80"></div><div class="sk-l w60"></div><div class="sk-small">Regel · kurz und klar</div><div class="sk-ic">◯ Skizze</div></div>`).join('')}
    </div>
    <div class="sk-bot">UNSER MERKSATZ: ____________________</div>
  </div>
  <div class="sk-notes"><span>① Überschrift + Symbol</span><span>② drei Regeln mit Skizze</span><span>③ ein Merksatz</span></div>
  ${foot('Gruppe ' + g.name)}
</section>`;
}

function teacher() {
  return `
<section class="page">
  <div class="head"><span class="l">Nur für den Fahrlehrer</span><span class="r">Lektion 11 · Gruppenarbeit</span></div>
  <h1 style="font-size:24pt;margin-bottom:8px">Ablauf und Lösungen</h1>
  <div class="row">
    <div class="box"><div class="kick">Vorbereitung</div><ul>
      <li>Je Gruppe ihr Blatt drucken (1 Seite)</li>
      <li>Pro Gruppe 1 Plakat (Flipchart/A2), 2 dicke schwarze Stifte, 1 dunkle Farbe</li>
      <li>Timer auf 15 Minuten (Folie „Gruppenarbeit“)</li>
      <li>Klebeband oder Magnete</li></ul></div>
    <div class="box"><div class="kick">Gruppen bilden</div><ul>
      <li>Abzählen 1-2-3: Licht, Blaulicht, Tunnel</li>
      <li>Große Klasse: jedes Thema zweimal vergeben</li>
      <li>Ideal: 3–5 Personen pro Gruppe</li></ul></div>
  </div>
  <div class="box"><div class="kick">Deine Rolle</div>Herumgehen, zuhören, <b>keine Lösungen geben</b>. Hängt eine Gruppe, eine Frage vom Blatt stellen. Regeln zu lang? „Geht das in 6 Wörtern?“</div>
  <div class="box"><div class="kick">Auswertung (ca. 5 Minuten)</div>Pro Gruppe <b>2 Personen</b> vorne, 1 Minute. Danach Folie „Drei Sätze für heute“ zeigen.</div>
  <div class="kick" style="margin:6px 0 4px">Lösungen zu den Fragen</div>
  <table><tr><th style="width:16%">Gruppe</th><th>Antworten (Frage 1–4)</th></tr>
    ${GROUPS.map(g => `<tr><td><b>${g.thema}</b></td><td><ol style="margin:0;padding-left:16px">${IDEEN[g.key].map(t => `<li>${t}</li>`).join('')}</ol></td></tr>`).join('')}
  </table>
  <div class="note">Rechtsgrundlagen: § 3 Abs. 1, § 11 Abs. 2, § 17, § 35, § 38 StVO · Bußgelder laut BKatV (Regelsätze)</div>
  ${foot('Lehrerblatt')}
</section>`;
}

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Lektion 11 · Gruppenarbeit</title><style>${css}${css2}</style></head><body>${teacher()}${GROUPS.map(sheet).join('')}</body></html>`;
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'arbeitsblaetter11.html'), html);
(async () => {
  const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + path.join(OUT, 'arbeitsblaetter11.html'));
  await p.pdf({ path: path.join(OUT, 'Lektion11_Gruppenarbeit_Arbeitsblaetter.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('PDF fertig');
})();
