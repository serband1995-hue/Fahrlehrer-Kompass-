// Kontroll- und Warnleuchten als SVG (512 × 512), angelehnt an die genormten Symbole (ISO 2575)
function warnSym(kind, c = '#FF5C5C') {
  const st = `fill="none" stroke="${c}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"`;
  const fl = `fill="${c}"`;
  switch (kind) {
    case 'oel': // Ölkanne mit Tropfen
      return `<path d="M120 300 L150 230 L330 230 L400 190 L470 210 L380 330 L150 330 Z" ${st}/><path d="M190 230 L190 200 L250 200" ${st}/><path d="M60 250 L120 270" ${st}/><path d="M465 245 q26 40 0 62 q-26 -22 0 -62 Z" ${fl}/>`;
    case 'kuehl': // Thermometer in Flüssigkeit
      return `<path d="M256 80 L256 300" ${st}/><circle cx="256" cy="340" r="42" ${fl}/><path d="M256 130 L310 130 M256 190 L310 190 M256 250 L310 250" ${st}/><path d="M70 400 q30 -25 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" ${st}/><path d="M70 450 q30 -25 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" ${st}/>`;
    case 'batt': // Batterie / Ladekontrolle
      return `<rect x="70" y="160" width="372" height="240" rx="18" ${st}/><path d="M130 160 L130 120 L190 120 L190 160 M322 160 L322 120 L382 120 L382 160" ${st}/><path d="M130 270 L200 270 M165 235 L165 305 M312 270 L382 270" ${st}/>`;
    case 'brems': // Bremse: Kreis mit Klammern und Ausrufezeichen
      return `<circle cx="256" cy="256" r="140" ${st}/><path d="M80 120 A190 190 0 0 0 80 392 M432 120 A190 190 0 0 1 432 392" ${st}/><path d="M256 170 L256 280" ${st}/><circle cx="256" cy="336" r="20" ${fl}/>`;
    case 'abs':
      return `<circle cx="256" cy="256" r="140" ${st}/><path d="M80 120 A190 190 0 0 0 80 392 M432 120 A190 190 0 0 1 432 392" ${st}/><text x="256" y="300" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="92" ${fl}>ABS</text>`;
    case 'motor': // Motorkontrolle
      return `<path d="M90 230 L90 330 M90 280 L130 280 M130 210 L130 360 L330 360 L380 310 L420 310 L420 240 L380 240 L350 210 L280 210 L280 170 L200 170 L200 210 Z M200 150 L280 150 M420 270 L460 270 M460 220 L460 330" ${st}/>`;
    case 'adblue': // Behälter mit Tropfen (AdBlue-Füllstand)
      return `<path d="M110 170 L110 420 L402 420 L402 170 Z" ${st}/><path d="M180 170 L180 120 L270 120 L270 170" ${st}/><path d="M256 230 q55 75 0 130 q-55 -55 0 -130 Z" ${fl}/>`;
    case 'dpf': // Partikelfilter
      return `<rect x="130" y="170" width="252" height="190" rx="40" ${st}/><path d="M40 265 L130 265 M382 265 L472 265" ${st}/>` + [[195, 220], [255, 220], [315, 220], [225, 275], [285, 275], [195, 320], [255, 320], [315, 320]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" ${fl}/>`).join('');
    case 'blink': // Blinker links/rechts
      return `<path d="M60 256 L190 150 L190 210 L240 210 L240 302 L190 302 L190 362 Z" ${fl}/><path d="M452 256 L322 150 L322 210 L272 210 L272 302 L322 302 L322 362 Z" ${fl}/>`;
    case 'abblend': // Abblendlicht: Leuchte, Strahlen nach unten geneigt
      return `<path d="M300 130 Q440 130 440 256 Q440 382 300 382 Z" ${st}/><path d="M240 160 L80 210 M240 230 L80 280 M240 300 L80 350 M240 370 L80 420" ${st}/>`;
    case 'fern': // Fernlicht: Leuchte, Strahlen waagerecht
      return `<path d="M300 130 Q440 130 440 256 Q440 382 300 382 Z" ${st}/><path d="M240 150 L70 150 M240 220 L70 220 M240 290 L70 290 M240 360 L70 360" ${st}/>`;
    case 'stop':
      return `<path d="M180 60 L332 60 L452 180 L452 332 L332 452 L180 452 L60 332 L60 180 Z" ${fl}/><text x="256" y="300" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="120" fill="#0A0F16">STOP</text>`;
  }
  return '';
}
module.exports = { warnSym };
