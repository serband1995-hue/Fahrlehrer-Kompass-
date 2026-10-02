// Zusatzfolien für Grundstoff 9+10 bauen (werden danach in die bestehende Präsentation eingefügt)
const pptxgen = require('pptxgenjs');
const path = require('path');
(async () => {
  const { Deck, finalize } = require('./lib');
  const pres = new pptxgen(); pres.layout = 'LAYOUT_WIDE';
  const deck = new Deck(pres); deck.autoGlide = true;
  const parts = (process.env.PARTS || 'partA').split(',');
  deck.marks = {};
  for (const p of parts) { deck.marks[p] = deck.slides.length + 1; await require('./' + p)(deck); }
  await finalize(deck, path.join(__dirname, 'x910.pptx'));
  require('fs').writeFileSync(path.join(__dirname, 'marks.json'), JSON.stringify({ marks: deck.marks, n: deck.slides.length }));
  console.log('Folien', deck.slides.length, JSON.stringify(deck.marks));
})().catch(e => { console.error(e); process.exit(1); });
