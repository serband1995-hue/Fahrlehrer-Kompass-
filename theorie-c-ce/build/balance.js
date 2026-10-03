// Zeilenumbruch ohne „Hurenkind“: Steht in der letzten Zeile eines Absatzes nur noch ein einzelnes Wort,
// wird der Absatz etwas schmaler umbrochen (gleiche Zeilenzahl) und die Umbrüche als weiche Zeilenwechsel gesetzt.
// Breiten mit Carlito (metrisch gleich wie Calibri), Tabelle aus carlito_metrics.json.
const M = require('./carlito_metrics.json');
const KERN = 0.992;                       // Unterschneidung macht echten Text etwa 0,8 % kürzer

function width(txt, size, bold, italic, cs = 0) {
  const t = M[bold && italic ? 'bi' : bold ? 'b' : italic ? 'i' : 'r'];
  let w = 0;
  for (const ch of txt) w += t[ch] ?? 520;
  return (w / 1000 * size * KERN + [...txt].length * cs) / 72;
}

// Einheiten: Wortstück (bis Leerzeichen oder nach Binde-/Schrägstrich) + folgende Leerzeichen
function units(segs) {
  const out = [];
  segs.forEach((g, si) => {
    const re = /([^ \t\-\/]*[\-\/]+|[^ \t\-\/]+)([ \t]*)|([ \t]+)/g;
    let m;
    while ((m = re.exec(g.text))) {
      if (m[3] !== undefined) { if (out.length) { out[out.length - 1].sp += m[3]; out[out.length - 1].spW += width(m[3], g.size, g.bold, g.italic, g.cs); } continue; }
      const u = { si, off: m.index, word: m[1], sp: m[2], w: width(m[1], g.size, g.bold, g.italic, g.cs), spW: width(m[2], g.size, g.bold, g.italic, g.cs) };
      const pv = out[out.length - 1];
      // Nummern wie „2.7.03-214“ oder „15-30“ nicht am Bindestrich trennen
      if (pv && pv.si === si && !pv.sp && /\d-$/.test(pv.word) && /^\d/.test(u.word)) { pv.word += u.word; pv.w += u.w; pv.sp = u.sp; pv.spW = u.spW; pv.glued = true; continue; }
      out.push(u);
    }
  });
  return out;
}

// Gieriger Umbruch wie PowerPoint: Liste der Zeilen (je Liste von Einheiten-Indizes)
function wrap(U, W) {
  const lines = [[]]; let cw = 0;
  U.forEach((u, k) => {
    const cur = lines[lines.length - 1];
    if (cur.length && cw + u.w > W + 0.003) { lines.push([k]); cw = u.w + u.spW; }
    else { cur.push(k); cw += u.w + u.spW; }
  });
  return lines;
}
const words = (U, line) => line.filter(k => U[k].sp.length || k === line[line.length - 1]).length;

// Gibt Umbruchstellen zurück: Liste von [Segmentindex, Offset] oder null (nichts zu tun)
function breaks(segs, W) {
  const U = units(segs);
  if (U.length < 3) return null;
  const L = wrap(U, W);
  if (L.length < 2 || L.length > 6) return null;
  const last = L[L.length - 1];
  const single = last.length === 1 || (words(U, last) === 1 && !last.slice(0, -1).some(k => U[k].sp.length));
  const nat = () => L.slice(1).map(line => { const u = U[line[0]]; return [u.si, u.off]; });
  const glued = U.some(u => u.glued);
  if (!single) return glued ? nat() : null;        // feste Umbrüche, damit PowerPoint die Nummer nicht trennt
  // Kandidaten: gleiche Zeilenzahl, letzte Zeile mit mindestens zwei Wörtern. Bevorzugt: Umbruch nach Satzzeichen.
  const cand = [];
  for (let f = 0.98; f >= 0.62; f -= 0.01) {
    const L2 = wrap(U, W * f);
    if (L2.length > L.length) break;
    if (L2.length !== L.length) continue;
    const l2 = L2[L2.length - 1];
    if (l2.length >= 2 && l2.some(k => k !== l2[l2.length - 1] && U[k].sp.length)) {
      const before = U[l2[0] - 1].word;
      cand.push({ L2, punct: /[.?!:;,–]$/.test(before) || U[l2[0]].word === '–' });
    }
  }
  if (!cand.length) return glued ? nat() : null;
  const best = cand.find(c => c.punct) || cand[0];
  return best.L2.slice(1).map(line => { const u = U[line[0]]; return [u.si, u.off]; });
  return null;
}

// t: String oder Liste von Läufen; o: Textoptionen aus lib.text (x, w, size, bold, italic, margin, cs)
function balance(t, o) {
  if (o.wrap === false || o.rotate || !o.w || o.w < 1.0 || o.noBal) return t;
  const m = o.margin ?? 0, mi = Array.isArray(m) ? (m[0] + m[1]) / 72 : 2 * m / 72;
  const W = o.w - mi, size = o.size || 20, cs = o.cs || 0;
  const runs = typeof t === 'string' ? [{ text: t, options: {} }] : t.map(r => ({ text: r.text, options: { ...(r.options || {}) } }));
  if (runs.some(r => typeof r.text !== 'string')) return t;
  // Absätze: '\n' im Text oder breakLine am Lauf
  const paras = [[]];
  runs.forEach(r => {
    const parts = r.text.split('\n');
    parts.forEach((p, k) => {
      const opt = { ...r.options };
      if (k < parts.length - 1) opt.breakLine = true; else if (r.options.breakLine) opt.breakLine = true; else delete opt.breakLine;
      paras[paras.length - 1].push({ text: p, options: opt });
      if (opt.breakLine) paras.push([]);
    });
  });
  if (!paras[paras.length - 1].length) paras.pop();
  let changed = false;
  const out = [];
  for (const P of paras) {
    const segs = P.map(r => ({ text: r.text, size: r.options.fontSize || size, bold: r.options.bold ?? o.bold, italic: r.options.italic ?? o.italic, cs }));
    const br = breaks(segs, W);
    if (!br) { out.push(...P); continue; }
    changed = true;
    // Läufe an den Umbruchstellen teilen; Leerzeichen vor dem Umbruch entfernen
    const cut = {};
    br.forEach(([si, off]) => (cut[si] ||= []).push(off));
    P.forEach((r, si) => {
      const offs = [...new Set(cut[si] || [])].sort((x, y) => x - y);
      const startBr = offs[0] === 0, inner = offs.filter(x => x > 0 && x < r.text.length);
      const bounds = [0, ...inner, r.text.length];
      for (let k = 0; k < bounds.length - 1; k++) {
        let txt = r.text.slice(bounds[k], bounds[k + 1]);
        const brk = k > 0 || startBr;
        const nextBr = k < bounds.length - 2 || (cut[si + 1] || []).includes(0);
        if (nextBr) txt = txt.replace(/[ \t]+$/, '');
        const opt = { ...r.options };
        if (k < bounds.length - 2) delete opt.breakLine;
        if (brk) opt.softBreakBefore = true;
        out.push({ text: txt, options: opt });
      }
    });
  }
  if (!changed) return t;
  // pptxgenjs setzt <a:br/> nur vor Läufen, die nicht am Absatzanfang stehen: leeren Lauf davor vermeiden
  return out.map((r, k) => (k === 0 || out[k - 1].options.breakLine) && r.options.softBreakBefore ? { text: r.text, options: { ...r.options, softBreakBefore: false } } : r);
}
module.exports = { balance, width };
