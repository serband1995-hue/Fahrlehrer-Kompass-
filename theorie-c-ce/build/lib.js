// Folien-Bausteine, Animations- und Übergangs-XML (Basis: lib.js der Referenz-Präsentation)
// Neu: Videos mit Autostart/Schleife, eindeutige Objekt-IDs, Akt-Hintergründe, Notizen je Folie
const React = require('react');
const RDS = require('react-dom/server');
const LU = require('react-icons/lu');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { balance } = require('./balance');
const ART = path.join(__dirname, 'art');
const MEDIA = path.join(__dirname, 'media');

const W = 13.333, H = 7.5;
const COL = {
  bg: '07080B', card: '12161E', card2: '1A202B', line: '2A3342', txt: 'F5F2EC', muted: 'A7B0BD', dim: '6E7888',
  orange: 'FF7A1A', amber: 'FFB547', red: 'FF4D4D', green: '4CAF72', blue: '5B8CFF', yellow: 'F2C230',
  kGreen: '3A7350', kGold: 'C9A227', aGold: 'D9954C', aCream: 'FAF6EC', white: 'FFFFFF', black: '000000'
};
const FONT = 'Calibri', SERIF = 'Cambria';

const iconCache = {};
async function icon(name, color = COL.txt, size = 256) {
  const key = name + color + size;
  if (iconCache[key]) return iconCache[key];
  const svg = RDS.renderToStaticMarkup(React.createElement(LU[name], { color: '#' + color, size: String(size), strokeWidth: 1.6 }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return (iconCache[key] = 'image/png;base64,' + buf.toString('base64'));
}

class Deck {
  constructor(pres) {
    this.pres = pres; this.slides = []; this.anchors = {};
    try { this.prevAnchors = JSON.parse(fs.readFileSync(path.join(__dirname, 'anchors.json'), 'utf8')); } catch (e) { this.prevAnchors = {}; }
  }
  // Sprungziele: Name → Foliennummer (zweiter Durchlauf nutzt die Nummern aus dem ersten)
  res(link) { return typeof link === 'number' ? link : (this.prevAnchors[link] || 1); }
  add({ transition = 'fade', dur, notes = '', bg = null, footer = true, hidden = false, noGlide = false, anchor, adv } = {}) {
    if (anchor) this.anchors[anchor] = this.slides.length + 1;
    const s = this.pres.addSlide();
    s.background = { color: COL.bg };
    if (hidden) s.hidden = true;
    const ctx = new Ctx(this, s, this.slides.length + 1, { transition, dur, noGlide, adv });
    this.slides.push(ctx);
    if (bg) ctx.img(bg, { x: 0, y: 0, w: W, h: H, name: '!!bg', alt: 'Hintergrund' });
    ctx.notes = (notes || '').trim(); // Notizen werden in finalize() geschrieben (mit Kopfzeile + Ergänzungen)
    if (footer) ctx.footer = footer;
    return ctx;
  }
}

class Ctx {
  constructor(deck, s, idx, meta) {
    this.deck = deck; this.s = s; this.idx = idx; this.meta = meta; this.n = 0; this.anims = []; this.media = [];
    this.pres = deck.pres;
  }
  nm(name) { return name || `e${this.idx}_${++this.n}`; }
  // Morph dreht von Wert zu Wert (345° → 0° wäre eine Drehung rückwärts um 345°). Darum: Winkel in 0…360 so wählen,
  // dass er nahe am Wert der vorigen Folie bleibt. sym = 180: Form sieht nach halber Drehung gleich aus (Rechteck, Oval).
  // Ist ein Sprung über 0/360 nicht zu vermeiden, bekommt das Objekt ab hier einen neuen Namen – Morph blendet dann über.
  rotFix(name, r, sym = 360) {
    if (!name.startsWith('!!')) return [name, r];
    const D = this.deck, M = D.rotMem ||= {}, AL = D.rotAlias ||= {};
    let v = (((r || 0) % 360) + 360) % 360;
    const m = M[name], prev = m && m.idx === this.idx - 1 ? m.v : null;
    const alt = v < 180 ? v + 180 : v - 180;
    if (prev === null) { if (sym === 180 && r !== undefined && (v < 90 || v >= 270)) v = alt; }   // gedrehte flache Balken um 180° statt um 0° → kein Sprung bei leichter Neigung (ungedrehte Formen bleiben bei 0)
    else {
      if (sym === 180 && Math.abs(alt - prev) < Math.abs(v - prev)) v = alt;
      if (Math.abs(v - prev) > sym / 2) AL[name] = (AL[name] || 0) + 1;
    }
    M[name] = { idx: this.idx, v };
    const out = AL[name] ? name + '~' + AL[name] : name;
    return [out, r === undefined && v === 0 ? undefined : Math.round(v * 100) / 100];
  }
  reg(name, anim, kind) {
    (this.all ||= []).push({ name, kind, animated: !!anim });
    if (!anim) return;
    const list = Array.isArray(anim) ? anim : [anim];
    for (const a of list) this.anims.push({ ...a, name, kind });
  }
  text(t, o = {}, anim) {
    // geschützte Leerzeichen: Zahl + Einheit, Z/§ + Nummer bleiben zusammen
    const nb = x => x.replace(/(\d) (kg|t\b|Std\.|Punkte?|Min\b|km\/h|€|m\b|Mio\.|Monate?|Jahre?|%|ng|°C)/g, '$1\u00A0$2').replace(/(Z|§|Abs\.|Nr\.) (\d)/g, '$1\u00A0$2');
    t = typeof t === 'string' ? nb(t) : t.map(r => ({ ...r, text: nb(r.text) }));
    t = balance(t, o);   // kein einzelnes Wort allein in der letzten Zeile
    const name = this.nm(o.name);
    const opt = {
      x: o.x, y: o.y, w: o.w, h: o.h, fontFace: o.font || FONT, fontSize: o.size || 20, color: o.color || COL.txt,
      bold: !!o.bold, italic: !!o.italic, align: o.align || 'left', valign: o.valign || 'top', margin: o.margin ?? 0,
      isTextBox: true, objectName: name, charSpacing: o.cs, lineSpacingMultiple: o.lsm, paraSpaceAfter: o.psa, rotate: o.rotate,
      fit: 'none', wrap: o.wrap ?? true
    };
    if (o.fill) opt.fill = { color: o.fill, transparency: o.ft || 0 };
    if (o.line) opt.line = { color: o.line, width: o.lw || 1 };
    if (o.shape) { opt.shape = o.shape; if (o.rr) opt.rectRadius = o.rr; }
    if (o.glow) opt.glow = { size: o.glow, opacity: o.glowOp ?? 0.45, color: o.glowColor || o.color || COL.orange };
    if (o.shadow) opt.shadow = { type: 'outer', color: '000000', blur: 12, offset: 3, angle: 90, opacity: 0.6 };
    if (o.link) opt.hyperlink = { slide: this.deck.res(o.link), tooltip: o.tip || '' };
    Object.keys(opt).forEach(k => opt[k] === undefined && delete opt[k]);
    this.s.addText(t, opt);
    (this.deck.texts ||= {})[this.idx + ':' + name] = Array.isArray(t) ? t.map(r => r.text).join('') : t;
    this.reg(name, anim, 'sp');
    return name;
  }
  shape(type, o = {}, anim) {
    const sym = [this.pres.shapes.RECTANGLE, this.pres.shapes.ROUNDED_RECTANGLE, this.pres.shapes.OVAL].includes(type) ? 180 : 360;
    const [name, rotate] = this.rotFix(this.nm(o.name), o.rotate, sym);
    const opt = { x: o.x, y: o.y, w: o.w, h: o.h, objectName: name, rotate, flipH: o.flipH };
    opt.fill = o.fill ? { color: o.fill, transparency: o.ft || 0 } : { type: 'none' };
    opt.line = o.line ? { color: o.line, width: o.lw || 1, dashType: o.dash, transparency: o.lt || 0 } : { type: 'none' };
    if (o.rr !== undefined) opt.rectRadius = o.rr;
    if (o.shadow) opt.shadow = { type: 'outer', color: o.shadowColor || '000000', blur: o.blur || 18, offset: o.soff ?? 4, angle: 90, opacity: o.sop ?? 0.55 };
    if (o.glow) opt.glow = { size: o.glow, opacity: o.glowOp ?? 0.5, color: o.glowColor || o.fill || COL.orange };
    if (o.link) opt.hyperlink = { slide: this.deck.res(o.link), tooltip: o.tip || '' };
    Object.keys(opt).forEach(k => opt[k] === undefined && delete opt[k]);
    this.s.addShape(type, opt);
    this.reg(name, anim, 'sp');
    return name;
  }
  rect(x, y, w, h, o = {}, anim) { return this.shape(this.pres.shapes.RECTANGLE, { x, y, w, h, ...o }, anim); }
  rrect(x, y, w, h, o = {}, anim) { return this.shape(this.pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rr: o.rr ?? 0.12, ...o }, anim); }
  oval(x, y, w, h, o = {}, anim) { return this.shape(this.pres.shapes.OVAL, { x, y, w, h, ...o }, anim); }
  lineS(x1, y1, x2, y2, o = {}, anim) {
    const flipH = x2 < x1, flipV = y2 < y1;
    const name = this.nm(o.name);
    const opt = {
      x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(Math.abs(x2 - x1), 0.001), h: Math.max(Math.abs(y2 - y1), 0.001), objectName: name,
      line: { color: o.color || COL.muted, width: o.lw || 1.5, dashType: o.dash || 'solid', beginArrowType: o.beginArrow, endArrowType: o.endArrow, transparency: o.lt }, flipH, flipV
    };
    if (o.glow) opt.glow = { size: o.glow, opacity: 0.6, color: o.color || COL.orange };
    Object.keys(opt.line).forEach(k => opt.line[k] === undefined && delete opt.line[k]);
    this.s.addShape(this.pres.shapes.LINE, opt);
    this.reg(name, anim, 'sp');
    return name;
  }
  img(file, o = {}, anim) {
    const [name, rotate] = this.rotFix(this.nm(o.name), o.rotate, o.sym);
    const opt = { x: o.x, y: o.y, w: o.w, h: o.h, objectName: name, rotate, flipH: o.flipH, transparency: o.transparency, altText: o.alt || '', rounding: o.round };
    if (typeof file === 'string' && file.startsWith('image/')) opt.data = file; else opt.path = path.join(ART, file);
    if (o.sizing) opt.sizing = { type: o.sizing, w: o.w, h: o.h };
    if (o.shadow) opt.shadow = { type: 'outer', color: '000000', blur: 24, offset: 6, angle: 90, opacity: 0.7 };
    if (o.link) opt.hyperlink = { slide: this.deck.res(o.link), tooltip: o.tip || '' };
    Object.keys(opt).forEach(k => opt[k] === undefined && delete opt[k]);
    this.s.addImage(opt);
    this.reg(name, anim, 'pic');
    return name;
  }
  // Video: startet automatisch (fx play), optional Endlosschleife und stumm
  video(file, o = {}, anim) {
    const name = this.nm(o.name);
    const cover = fs.readFileSync(path.join(MEDIA, o.cover));
    this.s.addMedia({ type: 'video', path: path.join(MEDIA, file), x: o.x, y: o.y, w: o.w, h: o.h, objectName: name,
      cover: 'data:image/jpeg;base64,' + cover.toString('base64') });
    this.media.push({ name, loop: !!o.loop, mute: !!o.mute, dur: o.dur || 30000 });
    const list = [].concat(anim || []);
    list.push({ fx: 'play', auto: o.autoplay !== false, c: o.autoplay === false, dur: o.dur || 30000 });
    this.reg(name, list, 'pic');
    return name;
  }
}

// ---------- Animations-XML ----------
function buildTiming(anims, media, spidOf) {
  if (!anims.length) return '';
  const groups = [];
  let lastClick = null, cur = null;
  for (const a of anims) {
    if (a.auto) { if (!groups.length || groups[0].trigger !== 'auto') groups.unshift({ trigger: 'auto', pars: [] }); cur = groups[0]; }
    else if (a.c || !lastClick) { lastClick = cur = { trigger: 'click', pars: [] }; groups.push(cur); }
    else cur = lastClick;
    if (a.a || !cur.pars.length) cur.pars.push({ effects: [] });
    cur.pars[cur.pars.length - 1].effects.push(a);
  }
  let id = 2;
  const nid = () => ++id;
  const bld = [];
  const grpCount = {};
  const tgt = (spid) => `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`;
  const setVis = (spid, val = 'visible', delay = 0) => `<p:set><p:cBhvr><p:cTn id="${nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst></p:cTn>${tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="${val}"/></p:to></p:set>`;
  const animProp = (spid, attr, from, to, dur, extra = '') => `<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="${nid()}" dur="${dur}" fill="hold" ${extra}/>${tgt(spid)}<p:attrNameLst><p:attrName>${attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav></p:tavLst></p:anim>`;
  const fadeEff = (spid, dur, dir = 'in') => `<p:animEffect transition="${dir}" filter="fade"><p:cBhvr><p:cTn id="${nid()}" dur="${dur}"/>${tgt(spid)}</p:cBhvr></p:animEffect>`;

  function effectXml(a, nodeType) {
    const spid = spidOf(a.name);
    if (!spid) throw new Error('Unbekannter Name in Animation: ' + a.name);
    const fx = a.fx || 'float';
    let dur = a.dur || ({ float: 700, fade: 600, zoom: 500, stamp: 380, wipeL: 700, wipeU: 700, wipeD: 700, wipeR: 700, blink: 800, kb: 14000, pulse: 300, out: 400, move: 1500, rise: 800, flyL: 800, flyR: 800, flyB: 900, grow: 700, spin: 900 }[fx]);
    // Klick-Effekte zügig halten (flüssig, nicht zäh). Auto-Effekte und keep:true bleiben unverändert.
    const CAP = { rise: 550, float: 500, flyL: 550, flyR: 550, flyB: 600, zoom: 400, grow: 450, fade: 600, stamp: 380, wipeL: 800, wipeU: 800, wipeD: 800, wipeR: 1000 };
    if (!a.auto && !a.keep && CAP[fx] && dur > CAP[fx]) dur = CAP[fx];
    const delay = a.d || 0;
    let grpAttr = '';
    if (a.kind === 'sp') {
      const g = grpCount[spid] = (grpCount[spid] ?? -1) + 1;
      grpAttr = ` grpId="${g}"`;
      bld.push(`<p:bldP spid="${spid}" grpId="${g}" animBg="1"/>`);
    }
    const head = (presetID, cls, sub, extra = '') => `<p:par><p:cTn id="${nid()}" presetID="${presetID}" presetClass="${cls}" presetSubtype="${sub}" fill="hold"${grpAttr} nodeType="${nodeType}"${extra}><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>`;
    const tail = `</p:childTnLst></p:cTn></p:par>`;
    let body = '';
    switch (fx) {
      case 'fade': body = head(10, 'entr', 0) + setVis(spid) + fadeEff(spid, dur) + tail; break;
      case 'float': body = head(42, 'entr', 0) + setVis(spid) + fadeEff(spid, dur) + animProp(spid, 'ppt_x', '#ppt_x', '#ppt_x', dur, 'decel="100000"') + animProp(spid, 'ppt_y', '#ppt_y+.05', '#ppt_y', dur, 'decel="100000"') + tail; break;
      case 'rise': body = head(42, 'entr', 0) + setVis(spid) + fadeEff(spid, dur) + animProp(spid, 'ppt_x', '#ppt_x', '#ppt_x', dur, 'decel="100000"') + animProp(spid, 'ppt_y', '#ppt_y+.18', '#ppt_y', dur, 'decel="100000"') + tail; break;
      case 'flyL': body = head(2, 'entr', 8) + setVis(spid) + animProp(spid, 'ppt_x', '0-#ppt_w/2', '#ppt_x', dur, 'decel="100000"') + animProp(spid, 'ppt_y', '#ppt_y', '#ppt_y', dur) + tail; break;
      case 'flyR': body = head(2, 'entr', 2) + setVis(spid) + animProp(spid, 'ppt_x', '1+#ppt_w/2', '#ppt_x', dur, 'decel="100000"') + animProp(spid, 'ppt_y', '#ppt_y', '#ppt_y', dur) + tail; break;
      case 'flyB': body = head(2, 'entr', 4) + setVis(spid) + animProp(spid, 'ppt_x', '#ppt_x', '#ppt_x', dur) + animProp(spid, 'ppt_y', '1+#ppt_h/2', '#ppt_y', dur, 'decel="100000"') + tail; break;
      case 'zoom': body = head(53, 'entr', 16) + setVis(spid) + animProp(spid, 'ppt_w', '0', '#ppt_w', dur, 'decel="100000"') + animProp(spid, 'ppt_h', '0', '#ppt_h', dur, 'decel="100000"') + fadeEff(spid, dur) + tail; break;
      case 'grow': body = head(53, 'entr', 16) + setVis(spid) + animProp(spid, 'ppt_w', '#ppt_w*0.6', '#ppt_w', dur, 'decel="100000"') + animProp(spid, 'ppt_h', '#ppt_h*0.6', '#ppt_h', dur, 'decel="100000"') + fadeEff(spid, dur) + tail; break;
      case 'stamp': body = head(53, 'entr', 32) + setVis(spid) + animProp(spid, 'ppt_w', '#ppt_w*2.2', '#ppt_w', dur, 'accel="60000"') + animProp(spid, 'ppt_h', '#ppt_h*2.2', '#ppt_h', dur, 'accel="60000"') + fadeEff(spid, Math.round(dur * 0.6)) + tail; break;
      case 'wipeL': case 'wipeR': case 'wipeU': case 'wipeD': {
        const m = { wipeL: [8, 'left'], wipeR: [2, 'right'], wipeU: [4, 'down'], wipeD: [1, 'up'] }[fx];
        body = head(22, 'entr', m[0]) + setVis(spid) + `<p:animEffect transition="in" filter="wipe(${m[1]})"><p:cBhvr><p:cTn id="${nid()}" dur="${dur}"/>${tgt(spid)}</p:cBhvr></p:animEffect>` + tail; break;
      }
      case 'blink': body = head(35, 'emph', 0, ' repeatCount="indefinite"') + `<p:anim calcmode="discrete" valueType="str"><p:cBhvr override="childStyle"><p:cTn id="${nid()}" dur="${dur}"/>${tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="hidden"/></p:val></p:tav><p:tav tm="50000"><p:val><p:strVal val="visible"/></p:val></p:tav></p:tavLst></p:anim>` + tail; break;
      case 'kb': { const sc = a.scale || 108000; body = head(6, 'emph', 0) + `<p:animScale><p:cBhvr><p:cTn id="${nid()}" dur="${dur}" fill="hold"/>${tgt(spid)}</p:cBhvr><p:by x="${sc}" y="${sc}"/></p:animScale>` + tail; break; }
      case 'pulse': body = head(6, 'emph', 0, a.loop ? ' repeatCount="indefinite"' : '') + `<p:animScale><p:cBhvr><p:cTn id="${nid()}" dur="${dur}" autoRev="1" fill="hold"/>${tgt(spid)}</p:cBhvr><p:by x="${a.scale || 114000}" y="${a.scale || 114000}"/></p:animScale>` + tail; break;
      case 'out': body = head(10, 'exit', 0) + fadeEff(spid, dur, 'out') + setVis(spid, 'hidden', dur - 1) + tail; break;
      case 'move': body = head(0, 'path', 0, a.lin ? '' : ` accel="${a.acc ?? 40000}" decel="${a.dec ?? 40000}"`) + `<p:animMotion origin="layout" path="${a.path}" pathEditMode="relative" rAng="0" ptsTypes=""><p:cBhvr><p:cTn id="${nid()}" dur="${dur}" fill="hold"/>${tgt(spid)}<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr><p:rCtr x="0" y="0"/></p:animMotion>` + tail; break;
      case 'play': body = `<p:par><p:cTn id="${nid()}" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="${nodeType}"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="${nid()}" dur="${dur}" fill="hold"/>${tgt(spid)}</p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par>`; break;
      default: throw new Error('fx? ' + fx);
    }
    const ends = !['blink', 'kb', 'play'].includes(fx) && !(fx === 'pulse' && a.loop);
    return { xml: body, end: delay + (ends ? dur : 0) };
  }

  let seq = '';
  for (const g of groups) {
    const outerId = nid();
    const cond = g.trigger === 'auto' ? `<p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>` : `<p:cond delay="indefinite"/>`;
    let inner = '', t = 0, first = true;
    for (const p of g.pars) {
      const pid = nid();
      let effs = '', maxEnd = 0, i = 0;
      for (const e of p.effects) {
        const nodeType = first && i === 0 ? (g.trigger === 'auto' ? 'afterEffect' : 'clickEffect') : (i === 0 ? 'afterEffect' : 'withEffect');
        const r = effectXml(e, nodeType);
        effs += r.xml; maxEnd = Math.max(maxEnd, r.end); i++;
      }
      inner += `<p:par><p:cTn id="${pid}" fill="hold"><p:stCondLst><p:cond delay="${t}"/></p:stCondLst><p:childTnLst>${effs}</p:childTnLst></p:cTn></p:par>`;
      t += maxEnd; first = false;
    }
    seq += `<p:par><p:cTn id="${outerId}" fill="hold"><p:stCondLst>${cond}</p:stCondLst><p:childTnLst>${inner}</p:childTnLst></p:cTn></p:par>`;
  }
  const vids = media.map(m => `<p:video><p:cMediaNode vol="${m.mute ? 0 : 80000}"${m.mute ? ' mute="1"' : ''}><p:cTn id="${nid()}"${m.loop ? ' repeatCount="indefinite"' : ''} fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn>${tgt(spidOf(m.name))}</p:cMediaNode></p:video>`).join('');
  return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${seq}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>${vids}</p:childTnLst></p:cTn></p:par></p:tnLst>${bld.length ? `<p:bldLst>${bld.join('')}</p:bldLst>` : ''}</p:timing>`;
}

function transitionXml(kind, dur, adv) {
  const a = adv !== undefined && adv !== null ? ` advTm="${adv}"` : '';
  if (kind === 'morph') return `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" Requires="p159"><p:transition spd="slow" p14:dur="${dur || 1200}"${a}><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"${a}><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>`;
  if (kind === 'black') return `<p:transition spd="slow"${a}><p:fade thruBlk="1"/></p:transition>`;
  if (kind === 'fade') return `<p:transition spd="med"${a}><p:fade/></p:transition>`;
  if (kind === 'zoom') return `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" Requires="p14"><p:transition spd="slow" p14:dur="1000"><p14:warp dir="in"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>`;
  return '';
}

async function finalize(deck, outFile) {
  const JSZip = require('jszip');
  // Sprechernotizen: Kopfzeile (Folie, Klicks) + Text + Ergänzungen aus deck.notesExtra
  for (const ctx of deck.slides) {
    let clicks = 0, seen = false;
    for (const a of ctx.anims) { if (a.auto) continue; if (a.c || !seen) clicks++; seen = true; }
    const texts = Object.entries(deck.texts || {}).filter(([k]) => k.startsWith(ctx.idx + ':')).map(([, v]) => v);
    const extra = deck.notesExtra ? deck.notesExtra(texts, ctx) : '';
    const autoAnim = ctx.anims.some(a => a.auto);
    const how = clicks ? clicks + ' Klick' + (clicks > 1 ? 's' : '') : ctx.meta.adv === 0 ? 'läuft von selbst weiter (kein Klick)' : autoAnim ? 'Animation läuft von selbst · Klick = weiter' : 'keine Animation · Klick = weiter';
    const head = `FOLIE ${ctx.idx} VON ${deck.slides.length} · ${how}`;
    ctx.s.addNotes([head, ctx.notes, extra].filter(Boolean).join('\n\n'));
  }
  // Fußzeile (und ihr Verlauf auf Fotos) immer ganz oben, auch wenn eine Folie danach noch einen Verlauf darüberlegt
  const TOP = ['!!ovb', '!!ftL', '!!ftR'];
  for (const ctx of deck.slides) {
    const objs = ctx.s._slideObjects || [], nm = o => (o.options && o.options.objectName) || o.objectName;
    const top = objs.filter(o => TOP.includes(nm(o)));
    if (top.length) { const rest = objs.filter(o => !TOP.includes(nm(o))); objs.length = 0; objs.push(...rest, ...top); }
  }
  const buf = await deck.pres.write({ outputType: 'nodebuffer' });
  const zip = await JSZip.loadAsync(buf);
  for (const ctx of deck.slides) {
    const f = `ppt/slides/slide${ctx.idx}.xml`;
    let xml = await zip.file(f).async('string');
    // Eindeutige Objekt-IDs (pptxgenjs vergibt bei Videos IDs, die mit Formen kollidieren können)
    let nextId = 2;
    xml = xml.replace(/<p:cNvPr id="\d+"/g, () => `<p:cNvPr id="${nextId++}"`);
    const ids = {};
    for (const m of xml.matchAll(/<p:cNvPr id="(\d+)" name="([^"]*)"/g)) { if (ids[m[2]]) throw new Error(`Doppelter Name ${m[2]} auf Folie ${ctx.idx}`); ids[m[2]] = m[1]; }
    const spidOf = n => ids[n.replace(/&/g, '&amp;')];
    // Auto-Einflug: alles ohne eigene Animation gleitet beim Folienstart herein (außer Morph-Objekte, Hintergrund, Fußzeile)
    if (deck.autoGlide !== false && !ctx.meta.noGlide) {
      const animated = new Set(ctx.anims.map(x => x.name));
      const media = new Set(ctx.media.map(m => m.name));
      let k = 0;
      const glide = (ctx.all || []).filter(e => !e.animated && !animated.has(e.name) && !media.has(e.name) && !e.name.startsWith('!!'));
      const step = glide.length > 12 ? 25 : 45;
      ctx.anims.unshift(...glide.map(e => ({ name: e.name, kind: e.kind, fx: 'float', auto: true, dur: 420, d: Math.min(k++ * step, 700) })));
    }
    const timing = buildTiming(ctx.anims, ctx.media, spidOf);
    const tr = transitionXml(ctx.meta.transition, ctx.meta.dur, ctx.meta.adv);
    xml = xml.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + tr + timing);
    zip.file(f, xml);
  }
  // Identische Medien zusammenführen
  const crypto = require('crypto');
  const seen = {}, remap = {};
  for (const f of Object.keys(zip.files).filter(f => f.startsWith('ppt/media/') && !zip.files[f].dir).sort()) {
    const h = crypto.createHash('md5').update(await zip.file(f).async('nodebuffer')).digest('hex');
    if (seen[h] && f.split('.').pop() === seen[h].split('.').pop()) { remap[f.slice(4)] = seen[h].slice(4); zip.remove(f); } else if (!seen[h]) seen[h] = f;
  }
  for (const f of Object.keys(zip.files).filter(f => /\.rels$/.test(f))) {
    let x = await zip.file(f).async('string'), ch = false;
    x = x.replace(/Target="\.\.\/(media\/[^"]+)"/g, (m, t) => { const n = remap[t]; if (n) { ch = true; return `Target="../${n}"`; } return m; });
    if (ch) zip.file(f, x);
  }
  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outFile, out);
  const changed = JSON.stringify(deck.anchors) !== JSON.stringify(deck.prevAnchors);
  fs.writeFileSync(path.join(__dirname, 'anchors.json'), JSON.stringify(deck.anchors, null, 1));
  return changed;
}

module.exports = { Deck, COL, FONT, SERIF, W, H, icon, finalize };
