// Fahrzeug-Choreografie für Draufsicht-Szenen: Motion-Path + Spin, Blinker, Storyboard zur Kontrolle
// Heading in Grad: 0 = nach oben (Norden), 90 = Osten, 180 = Süden, 270 = Westen. Positive Drehung = rechts.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { W, H, CAR, BIKE, PED, COP, TRUCK } = require('./geo5');
const { schedule } = require('./lib5');
const ART = path.join(__dirname, 'art');

const rad = d => d * Math.PI / 180;
const dir = h => [Math.sin(rad(h)), -Math.cos(rad(h))];
const f4 = n => (Math.round(n * 10000) / 10000).toString();
const DIMS = { car: CAR, bike: BIKE, ped: PED, cop: COP, truck: TRUCK };

let actorSeq = 0;
class Actor {
  // s: Folien-Kontext, sprite: Datei in art/, kind: car|bike|ped|cop, k: Zoll pro Meter
  constructor(s, sprite, x, y, h, { kind = 'car', k = 0.3, name, anim, label } = {}) {
    this.s = s; this.id = ++actorSeq; this.kind = kind; this.k = k; this.label = label || sprite;
    const d = DIMS[kind];
    this.w = (d.w + 2 * d.pad) * k; this.h = (d.l + 2 * d.pad) * k;
    this.x = x; this.y = y; this.hd = h;
    this.parts = [];
    this.speed = kind === 'ped' ? 0.45 : kind === 'bike' ? 1.0 : 1.7; // Zoll pro Sekunde
    const n = this.place(sprite, name, anim);
    this.main = this.parts[0];
    s.actors = s.actors || []; s.actors.push(this);
    this.sprite = sprite;
    this.blinkPart = null;
    return this;
  }
  place(sprite, name, anim, extra = {}) {
    const nm = this.s.img(sprite, { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h, rotate: this.hd, name }, anim);
    const part = { name: nm, ox: this.x, oy: this.y, oh: this.hd, sprite, live: true, ...extra };
    this.parts.push(part);
    return part;
  }
  // Einzelnes Segment ausgeben
  emit(seg, trig, first) {
    const pts = seg.pts; // Liste von kubischen Bézier-Stücken [[p0,p1,p2,p3],...] in Zoll (absolut)
    const dur = Math.max(250, Math.round(seg.len / (seg.speed || this.speed) * 1000));
    const live = this.parts.filter(p => p.live);
    live.forEach((p, i) => {
      const rel = ([x, y]) => `${f4((x - p.ox) / W)} ${f4((y - p.oy) / H)}`;
      let d = `M ${rel(pts[0][0])}`;
      for (const b of pts) d += ` C ${rel(b[1])} ${rel(b[2])} ${rel(b[3])}`;
      d += ' E';
      const a = { fx: 'move', path: d, dur, ease: seg.ease || 'lin', sb: { actor: this.id, seg } };
      if (i === 0) Object.assign(a, first ? trig : { a: true });
      this.s.reg(p.name, a, 'pic');
      if (seg.turn) this.s.reg(p.name, { fx: 'spin', deg: seg.turn, dur, ease: seg.ease || 'lin' }, 'pic');
    });
  }
  // segs: ['S', dist] geradeaus · ['T', winkel, radius] Kurve (+ rechts / − links) · ['G', x, y] gerade zu Punkt · ['C', c1x,c1y,c2x,c2y,ex,ey,hEnd]
  drive(segs, trig = { c: true }, o = {}) {
    let first = true;
    for (const sg of segs) {
      const p0 = [this.x, this.y], h0 = this.hd;
      let seg;
      if (sg[0] === 'S' || sg[0] === 'G') {
        const p3 = sg[0] === 'S' ? [p0[0] + dir(h0)[0] * sg[1], p0[1] + dir(h0)[1] * sg[1]] : [sg[1], sg[2]];
        const len = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
        const p1 = [p0[0] + (p3[0] - p0[0]) / 3, p0[1] + (p3[1] - p0[1]) / 3], p2 = [p0[0] + 2 * (p3[0] - p0[0]) / 3, p0[1] + 2 * (p3[1] - p0[1]) / 3];
        seg = { pts: [[p0, p1, p2, p3]], len, h0, h1: h0, kind: 'line' };
        this.x = p3[0]; this.y = p3[1];
      } else if (sg[0] === 'T') {
        const th = sg[1], r = sg[2], sgn = Math.sign(th);
        const n = [Math.cos(rad(h0)), Math.sin(rad(h0))];
        const c = [p0[0] + sgn * r * n[0], p0[1] + sgn * r * n[1]];
        const pieces = Math.ceil(Math.abs(th) / 90), step = th / pieces;
        const pts = []; let P = p0, h = h0;
        for (let i = 0; i < pieces; i++) {
          const a = rad(step), P3 = [c[0] + (P[0] - c[0]) * Math.cos(a) - (P[1] - c[1]) * Math.sin(a), c[1] + (P[0] - c[0]) * Math.sin(a) + (P[1] - c[1]) * Math.cos(a)];
          const kk = 4 / 3 * Math.tan(Math.abs(a) / 4) * r, h1 = h + step;
          pts.push([P, [P[0] + kk * dir(h)[0], P[1] + kk * dir(h)[1]], [P3[0] - kk * dir(h1)[0], P3[1] - kk * dir(h1)[1]], P3]);
          P = P3; h = h1;
        }
        seg = { pts, len: Math.abs(rad(th)) * r, h0, h1: h0 + th, turn: th, kind: 'arc', c, r };
        this.x = P[0]; this.y = P[1]; this.hd = h0 + th;
      } else if (sg[0] === 'C') {
        const [, c1x, c1y, c2x, c2y, ex, ey, h1] = sg;
        const b = [p0, [c1x, c1y], [c2x, c2y], [ex, ey]];
        let len = 0, prev = p0; for (let t = 0.05; t <= 1.0001; t += 0.05) { const q = bez(b, t); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
        seg = { pts: [b], len, h0, h1, turn: h1 - h0, kind: 'bez' };
        this.x = ex; this.y = ey; this.hd = h1;
      }
      Object.assign(seg, { speed: o.speed, ease: segs.length === 1 ? (o.ease || 'both') : first ? (o.ease0 || 'in') : sg === segs[segs.length - 1] ? (o.ease1 || 'out') : 'lin' });
      if (o.ease === 'lin') seg.ease = 'lin';
      if (o.plan) o.plan.push(seg); else this.emit(seg, trig, first);
      first = false;
    }
    return this;
  }
  // Blinker an (bleibt, bis off). trig wie drive
  blink(side, trig = { c: true }) {
    const part = this.place(side === 'L' ? 'blink_L.png' : side === 'R' ? 'blink_R.png' : 'blink_B.png', undefined, [{ fx: 'fade', dur: 150, ...trig, sb: { actor: this.id, blink: side } }, { fx: 'blink', dur: 700, ...(trig.auto ? { auto: true } : {}) }], { blinker: side });
    this.blinkPart = part;
    return this;
  }
  blinkOff(trig = {}) {
    if (!this.blinkPart) return this;
    this.s.reg(this.blinkPart.name, { fx: 'out', dur: 150, ...trig, sb: { actor: this.id, blink: 'off' } }, 'pic');
    this.blinkPart.live = false; this.blinkPart = null;
    return this;
  }
  // Bremslicht kurz aufleuchten
  brake(trig = {}) {
    const part = this.place('brake.png', undefined, [{ fx: 'fade', dur: 150, ...trig }], { brake: true });
    part.live = true;
    this.brakePart = part;
    return this;
  }
  brakeOff(trig = {}) { if (this.brakePart) { this.s.reg(this.brakePart.name, { fx: 'out', dur: 200, ...trig }, 'pic'); this.brakePart.live = false; this.brakePart = null; } return this; }
  // Nur Drehung auf der Stelle (z. B. Polizist)
  turn(deg, trig = { c: true }, dur = 900) {
    this.parts.filter(p => p.live).forEach((p, i) => this.s.reg(p.name, { fx: 'spin', deg, dur, ...(i === 0 ? trig : {}), sb: i === 0 ? { actor: this.id, spin: deg } : undefined }, 'pic'));
    this.hd += deg; return this;
  }
}
function bez(b, t) { const u = 1 - t; return [0, 1].map(i => u * u * u * b[0][i] + 3 * u * u * t * b[1][i] + 3 * u * t * t * b[2][i] + t * t * t * b[3][i]); }

// ---------- Storyboard ----------
const b64 = {};
const dataUri = f => (b64[f] = b64[f] || 'data:image/png;base64,' + fs.readFileSync(path.join(ART, f)).toString('base64'));
function stateAt(slide, group, frac) {
  // Zustand aller Akteure nach Klick "group" (frac: Anteil innerhalb dieser Gruppe)
  const sch = schedule(slide.anims);
  const gEnd = Math.max(0, ...sch.filter(e => e.group === group && e.a.fx !== 'blink').map(e => e.start + e.dur));
  const tNow = gEnd * frac;
  const st = {};
  for (const A of slide.actors) {
    const p = A.parts[0];
    st[A.id] = { x: p.ox, y: p.oy, h: p.oh, blink: null, A };
  }
  for (const e of sch) {
    const sb = e.a.sb; if (!sb) continue;
    if (e.group > group) continue;
    let prog = e.group < group ? 1 : Math.max(0, Math.min(1, (tNow - e.start) / Math.max(1, e.dur)));
    if (e.group === group && tNow < e.start) continue;
    const S = st[sb.actor];
    if (sb.seg) {
      const seg = sb.seg, n = seg.pts.length, fi = Math.min(n - 1, Math.floor(prog * n)), lt = prog * n - fi;
      const q = bez(seg.pts[fi], Math.min(1, lt));
      S.x = q[0]; S.y = q[1]; S.h = seg.h0 + (seg.h1 - seg.h0) * prog;
    } else if (sb.blink) S.blink = sb.blink === 'off' ? null : sb.blink;
    else if (sb.spin) S.h += sb.spin * prog;
  }
  return st;
}
async function storyboard(deck, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const slide of deck.slides) {
    if (!slide.actors || !slide.actors.length || !slide.bgFile) continue;
    const sch = schedule(slide.anims);
    const groups = [...new Set(sch.filter(e => e.a.sb).map(e => e.group))];
    const frames = [[0, 0]];
    for (const g of groups) { frames.push([g, 0.5]); frames.push([g, 1]); }
    const tiles = [];
    for (const [g, fr] of frames) {
      const st = stateAt(slide, g, fr);
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="800" height="450">`;
      svg += `<image href="data:image/jpeg;base64,${fs.readFileSync(path.join(ART, slide.bgFile)).toString('base64')}" x="0" y="0" width="${W}" height="${H}"/>`;
      for (const id of Object.keys(st)) {
        const S = st[id], A = S.A;
        svg += `<g transform="rotate(${S.h} ${S.x} ${S.y})"><image href="${dataUri(A.sprite)}" x="${S.x - A.w / 2}" y="${S.y - A.h / 2}" width="${A.w}" height="${A.h}"/>${S.blink ? `<image href="${dataUri(S.blink === 'L' ? 'blink_L.png' : 'blink_R.png')}" x="${S.x - A.w / 2}" y="${S.y - A.h / 2}" width="${A.w}" height="${A.h}"/>` : ''}</g>`;
      }
      svg += `<rect x="0.1" y="0.1" width="3.2" height="0.55" fill="#000" opacity="0.7"/><text x="0.2" y="0.52" font-size="0.36" fill="#fff" font-family="Carlito">Klick ${g} · ${Math.round(fr * 100)} %</text></svg>`;
      tiles.push(await sharp(Buffer.from(svg)).png().toBuffer());
    }
    const cols = 3, rows = Math.ceil(tiles.length / cols);
    const img = sharp({ create: { width: 800 * cols, height: 450 * rows, channels: 3, background: '#000' } })
      .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 800, top: Math.floor(i / cols) * 450 })));
    await img.jpeg({ quality: 70 }).toFile(path.join(outDir, `sb_${String(slide.idx).padStart(2, '0')}.jpg`));
  }
}
// Mehrere Akteure gleichzeitig fahren lassen (Segment für Segment verzahnt, gleiche Segmentanzahl)
function together(list, trig = { c: true }) {
  const plans = list.map(([A, segs, o = {}]) => { const plan = []; A.drive(segs, trig, { ...o, plan }); return plan; });
  const n = Math.max(...plans.map(p => p.length));
  for (let i = 0; i < n; i++) { let lead = true; plans.forEach((p, j) => { if (p[i]) { list[j][0].emit(p[i], lead ? (i === 0 ? trig : { a: true }) : {}, true); lead = false; } }); }
}
module.exports = { Actor, storyboard, dir, together };
