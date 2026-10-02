// Dunkle Folienhintergründe je Akzentfarbe (filmisch: Verlauf + Lichtschein + feines Raster)
const sharp = require('sharp');
const cols = { blue: '4CC9F0', or: 'FFB547', pu: '7AA2FF', red: 'FF5C5C', gr: '38D98A', am: 'F2C230', kap: 'FF8A3D' };
(async () => {
  for (const [k, c] of Object.entries(cols)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
<defs><radialGradient id="g" cx="0.88" cy="0.05" r="0.9"><stop offset="0" stop-color="#${c}" stop-opacity="0.16"/><stop offset="0.45" stop-color="#${c}" stop-opacity="0.04"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1220"/><stop offset="1" stop-color="#05080E"/></linearGradient>
<pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#FFFFFF" stroke-opacity="0.025" stroke-width="1"/></pattern></defs>
<rect width="1920" height="1080" fill="url(#b)"/><rect width="1920" height="1080" fill="url(#p)"/><rect width="1920" height="1080" fill="url(#g)"/>
<rect x="0" y="1068" width="1920" height="12" fill="#${c}" fill-opacity="0.0"/></svg>`;
    await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(`art/bg_${k}.jpg`);
  }
  console.log('ok');
})();
