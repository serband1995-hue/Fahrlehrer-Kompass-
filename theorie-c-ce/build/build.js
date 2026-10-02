// Abend bauen: PARTS=a1_c1a,a1_c1b,... OUT=name LABEL="KLASSE C · C1" node build.js
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
(async () => {
  const { Deck, finalize } = require('./lib');
  const pres = new pptxgen(); pres.layout = 'LAYOUT_WIDE';
  pres.title = process.env.TITLE || 'Theorie Klasse C/CE'; pres.company = 'Fahrschule Boost';
  const deck = new Deck(pres); deck.autoGlide = true;
  const parts = (process.env.PARTS || '').split(',').filter(Boolean);
  deck.marks = {};
  for (const p of parts) { deck.marks[p] = deck.slides.length + 1; await require('./parts/' + p)(deck); }
  // Seitenzahlen in die Fußzeile
  const out = path.join(__dirname, (process.env.OUT || 'abend') + '.pptx');
  await finalize(deck, out);
  fs.writeFileSync(path.join(__dirname, 'marks.json'), JSON.stringify({ marks: deck.marks, n: deck.slides.length }));
  console.log('Folien', deck.slides.length, JSON.stringify(deck.marks));
})().catch(e => { console.error(e); process.exit(1); });
