// Sprechzettel: Folienbild + Notizen, zum Ausdrucken (liest Notizen per python-pptx-Export notes.json und Bilder aus render/)
const fs = require('fs');
const path = require('path');
const notes = JSON.parse(fs.readFileSync(path.join(__dirname, 'notes.json'), 'utf8'));
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'boost_logo.png')).toString('base64');
const R = path.join(__dirname, 'render');
const files = fs.readdirSync(R).filter(f => /^s-\d+\.jpg$/.test(f)).sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = t => esc(t).split('\n').map(l => {
  if (/^FOLIE \d+/.test(l)) return '';
  const m = l.match(/^(▶|❓|✅|🖱|➜|⏱|💡|⚠️)/);
  return l.trim() ? `<div class="l ${m ? 'k' + ['▶', '❓', '✅', '🖱', '➜', '⏱', '💡', '⚠️'].indexOf(m[1]) : ''}">${l}</div>` : '';
}).join('');
const items = notes.map((n, i) => {
  const img = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(R, files[i])).toString('base64');
  const head = n.split('\n')[0];
  return `<div class="it"><div class="th"><img src="${img}"><div class="h">${esc(head)}</div></div><div class="nt">${fmt(n)}</div></div>`;
}).join('');
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
@page { size: A4; margin: 10mm 10mm 12mm; }
body { font-family: Calibri, Carlito, Arial, sans-serif; font-size: 9.6pt; color: #1D1F24; margin: 0; }
.top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1D1F24; padding-bottom: 4px; margin-bottom: 6px; font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #6B6F78; }
.top img { height: 18px; }
.it { display: grid; grid-template-columns: 62mm 1fr; gap: 9px; border-bottom: 1px solid #D5D8DD; padding: 6px 0; break-inside: avoid; }
.th img { width: 62mm; border-radius: 4px; display: block; }
.th .h { font-size: 7.5pt; font-weight: 700; letter-spacing: 1px; color: #E8650F; margin-top: 3px; }
.l { margin-bottom: 2px; line-height: 1.3; } .k0 { font-weight: 700; } .k2 { color: #1E7A43; } .k3 { color: #1F5EA8; } .k4 { color: #6B6F78; font-style: italic; }
</style></head><body><div class="top"><span>Sprechzettel · Grundstoff Lektion 9 + 10</span><img src="${logo}"></div>${items}</body></html>`;
fs.writeFileSync(path.join(__dirname, 'worksheets', 'sprechzettel.html'), html);
(async () => {
  const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'worksheets', 'sprechzettel.html'));
  await p.pdf({ path: path.join(__dirname, 'Grundstoff_9_10_Sprechzettel.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#999">Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  await b.close();
  console.log('Sprechzettel fertig');
})();
