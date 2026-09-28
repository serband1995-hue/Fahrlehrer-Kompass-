/* ============================================================
   Kinoleinwand: Das Hintergrundbild wird pro Abschnitt wie mit
   einer Kamera abgefahren. Dazu Lichtstreifen, Regen, Stadtlichter
   und das Aufblenden der Scheinwerfer.
   ============================================================ */
import { CONFIG } from "./config.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* Eine Einstellung pro Abschnitt:
   s = Zoom, u/v = Bildpunkt (0–1), der bei px/py (0–1) im Bildschirm liegen soll,
   dark = Abdunklung für Lesbarkeit, fx = Stärke der Lichtstreifen */
const SHOTS = [
  { s: 1.0, u: 0.5, v: 0.5, px: 0.5, py: 0.5, dark: 0, fx: 1, m: { u: 0.7, v: 0.6, py: 0.3 } }, // Start
  { s: 1.35, u: 0.8, v: 0.3, px: 0.62, py: 0.42, dark: 0.45, fx: 0.2 },  // Kurz zu mir: Skyline
  { s: 1.5, u: 0.62, v: 0.86, px: 0.5, py: 0.55, dark: 0.5, fx: 0.9 },   // So läuft's: Straße
  { s: 1.12, u: 0.5, v: 0.5, px: 0.5, py: 0.5, dark: 0.62, fx: 0.6 },    // Dein Weg
  { s: 1.6, u: 0.7, v: 0.42, px: 0.5, py: 0.45, dark: 0.55, fx: 0.2 },   // Stimmen: Brücke & Lichter
  { s: 1.7, u: 0.67, v: 0.62, px: 0.74, py: 0.5, dark: 0.35, fx: 0.7 },  // Test: Scheinwerfer
  { s: 1.7, u: 0.74, v: 0.4, px: 0.7, py: 0.42, dark: 0.45, fx: 0.3 },   // Akademie: Dachschild
  { s: 1.35, u: 0.72, v: 0.66, px: 0.62, py: 0.55, dark: 0.5, fx: 0.8 }, // Buchen
  { s: 1.6, u: 0.93, v: 0.3, px: 0.72, py: 0.42, dark: 0.45, fx: 0.2 },  // Bewerten: Dom
  { s: 1.2, u: 0.5, v: 0.5, px: 0.5, py: 0.5, dark: 0.7, fx: 0.4 },      // Fragen
  { s: 1.04, u: 0.5, v: 0.5, px: 0.5, py: 0.5, dark: 0.15, fx: 1, m: { u: 0.7, v: 0.6, py: 0.3 } } // Ziel
];

// Eigene Kamerafahrten für das Hochformat-Bild
const SHOTS_PORTRAIT = [
  { s: 1.0, u: 0.4, v: 0.72, px: 0.5, py: 0.72, dark: 0, fx: 1 },
  { s: 1.2, u: 0.6, v: 0.45, px: 0.5, py: 0.4, dark: 0.5, fx: 0.2 },
  { s: 1.4, u: 0.5, v: 0.9, px: 0.5, py: 0.5, dark: 0.55, fx: 0.9 },
  { s: 1.1, u: 0.5, v: 0.3, px: 0.5, py: 0.5, dark: 0.6, fx: 0.3 },
  { s: 1.4, u: 0.55, v: 0.55, px: 0.5, py: 0.45, dark: 0.55, fx: 0.2 },
  { s: 1.8, u: 0.54, v: 0.72, px: 0.5, py: 0.35, dark: 0.4, fx: 0.7 },
  { s: 1.6, u: 0.63, v: 0.64, px: 0.5, py: 0.35, dark: 0.5, fx: 0.3 },
  { s: 1.3, u: 0.45, v: 0.75, px: 0.5, py: 0.45, dark: 0.5, fx: 0.8 },
  { s: 1.7, u: 0.92, v: 0.5, px: 0.6, py: 0.4, dark: 0.5, fx: 0.2 },
  { s: 1.1, u: 0.5, v: 0.25, px: 0.5, py: 0.5, dark: 0.7, fx: 0.3 },
  { s: 1.0, u: 0.4, v: 0.72, px: 0.5, py: 0.72, dark: 0.25, fx: 1 }
];

export async function createCinema({ reducedMotion = false } = {}) {
  const K = CONFIG.kino;
  const stage = document.getElementById("stage");
  const img = document.getElementById("stageImg");
  const shade = document.getElementById("shade");
  const fx = document.getElementById("fx");
  const flareBox = document.getElementById("flares");
  const ctx = fx.getContext("2d");

  const portraitMQ = matchMedia("(max-aspect-ratio: 9/10)");
  let usePortrait = false;
  let flares = [];
  async function chooseImage() {
    usePortrait = !!K.bildHandy && portraitMQ.matches;
    const src = usePortrait ? K.bildHandy : K.bild;
    if (!img.src.endsWith(src)) {
      img.src = src;
      try { await img.decode(); } catch (e) {}
    }
    flareBox.innerHTML = "";
    flares = (usePortrait ? K.scheinwerferHandy : K.scheinwerfer).map(([x, y]) => {
      const i = document.createElement("i");
      i.style.left = x * 100 + "%";
      i.style.top = y * 100 + "%";
      flareBox.append(i);
      return i;
    });
  }
  await chooseImage();

  const state = { target: 0, p: 0, speedKmh: 0, lights: 0, lightsTarget: 0, mx: 0, my: 0, smx: 0, smy: 0, running: true, fxAmt: 1 };
  let W = 0, H = 0, iw = 1, ih = 1, cover = 1, dpr = 1;
  const listeners = [];

  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    iw = img.naturalWidth || 1440;
    ih = img.naturalHeight || 805;
    cover = Math.max(W / iw, H / ih);
    stage.style.width = iw * cover + "px";
    stage.style.height = ih * cover + "px";
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    fx.width = Math.round(W * dpr);
    fx.height = Math.round(H * dpr);
    initParticles();
  }

  function shotAt(p) {
    const n = SHOTS.length - 1;
    const f = clamp(p, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const t = smooth(f - i);
    const portrait = W / H < 0.9;
    const list = usePortrait ? SHOTS_PORTRAIT : SHOTS;
    const get = (sh) => (portrait && !usePortrait && sh.m ? { ...sh, ...sh.m } : sh);
    const a = get(list[i]), b = get(list[i + 1]);
    const o = {};
    ["s", "u", "v", "px", "py", "dark", "fx"].forEach((k) => (o[k] = lerp(a[k], b[k], t)));
    return o;
  }

  function applyShot(sh, time) {
    const w = iw * cover, h = ih * cover;
    // leichtes „Atmen“ der Kamera und Maus-Parallaxe
    const breathe = reducedMotion ? 0 : Math.sin(time * 0.25) * 0.012;
    const s = sh.s * (1.02 + breathe);
    let tx = sh.px * W - s * sh.u * w + state.smx * 14;
    let ty = sh.py * H - s * sh.v * h + state.smy * 10;
    tx = clamp(tx, W - s * w, 0);
    ty = clamp(ty, H - s * h, 0);
    stage.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
    shade.style.setProperty("--dark", sh.dark.toFixed(3));
    state.fxAmt = sh.fx;
    // Sichtbarkeit des Straßenbereichs (für die Lichtstreifen) in Bildschirmkoordinaten
    const road = usePortrait ? K.strasseHandy : K.strasse;
    state.roadTop = clamp(ty + s * road[0] * h, 0, H);
    state.roadBot = clamp(ty + s * road[1] * h, 0, H);
  }

  /* ---------- Partikel ---------- */
  let streaks = [], drops = [], bokeh = [];
  function initParticles() {
    const n = W < 700 ? 22 : 38;
    streaks = Array.from({ length: n }, () => newStreak(true));
    drops = K.regen ? Array.from({ length: W < 700 ? 50 : 110 }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 16, v: 500 + Math.random() * 500, a: 0.04 + Math.random() * 0.08 })) : [];
    bokeh = Array.from({ length: W < 700 ? 10 : 18 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.75, r: 10 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 4,
      warm: Math.random() < 0.7, a: 0.03 + Math.random() * 0.06, ph: Math.random() * 6.28
    }));
  }
  function newStreak(anywhere) {
    return {
      x: anywhere ? Math.random() * W : -Math.random() * W * 0.5,
      d: Math.random(), // 0 = weit weg (oben), 1 = nah (unten)
      len: 60 + Math.random() * 220,
      a: 0.25 + Math.random() * 0.5,
      warm: Math.random() < 0.72,
      v: 0.6 + Math.random() * 0.8
    };
  }

  function drawFx(dt, time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (reducedMotion) return;
    const speedF = 0.35 + state.speedKmh / 60; // auch im Stand leichtes Fahren
    const amt = state.fxAmt;
    const top = state.roadTop ?? H * 0.8, bot = state.roadBot ?? H;
    ctx.globalCompositeOperation = "lighter";

    // Stadtlichter (weiche Kreise)
    bokeh.forEach((b) => {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -60) b.x = W + 60; if (b.x > W + 60) b.x = -60;
      if (b.y < -60) b.y = H * 0.75; if (b.y > H * 0.8) b.y = -40;
      const a = b.a * (0.6 + 0.4 * Math.sin(time * 0.8 + b.ph));
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, b.warm ? `rgba(255,190,110,${a})` : `rgba(140,210,230,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
    });

    // Lichtstreifen auf der nassen Straße
    if (bot - top > 8 && amt > 0.02) {
      streaks.forEach((s) => {
        const depth = 0.25 + s.d * 0.75;
        s.x += s.v * speedF * depth * 900 * dt;
        if (s.x - s.len * depth * speedF > W) Object.assign(s, newStreak(false));
        const y = top + (bot - top) * (0.1 + s.d * 0.85);
        const len = s.len * depth * (0.6 + speedF * 0.8);
        const a = s.a * amt * (0.35 + depth * 0.65);
        const g = ctx.createLinearGradient(s.x - len, y, s.x, y);
        const c = s.warm ? "255,196,120" : "225,238,255";
        g.addColorStop(0, `rgba(${c},0)`);
        g.addColorStop(1, `rgba(${c},${a})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.6 + depth * 2.2;
        ctx.beginPath(); ctx.moveTo(s.x - len, y); ctx.lineTo(s.x, y); ctx.stroke();
      });
    }

    // feiner Regen
    if (drops.length) {
      ctx.strokeStyle = "rgba(200,225,240,1)";
      ctx.lineWidth = 1;
      drops.forEach((d) => {
        d.y += d.v * dt; d.x -= d.v * 0.18 * dt;
        if (d.y > H) { d.y = -20; d.x = Math.random() * W * 1.2; }
        ctx.globalAlpha = d.a;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.18, d.y + d.l); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------- Schleife ---------- */
  let last = performance.now();
  function tick(now) {
    if (!state.running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = now / 1000;
    const prevP = state.p;
    state.p += (state.target - state.p) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
    const inst = dt > 0 ? (Math.abs(state.p - prevP) / dt) * 1800 : 0;
    state.speedKmh += (Math.min(inst, 160) - state.speedKmh) * (1 - Math.exp(-dt * 3));
    state.smx += (state.mx - state.smx) * (1 - Math.exp(-dt * 2.5));
    state.smy += (state.my - state.smy) * (1 - Math.exp(-dt * 2.5));

    state.lights += (state.lightsTarget - state.lights) * (1 - Math.exp(-dt * 4));
    const flick = state.lights < 0.97 && state.lightsTarget > 0 ? (Math.sin(time * 55) > 0.1 ? 1 : 0.3) : 1;
    const pulse = 0.85 + 0.15 * Math.sin(time * 1.6);
    flares.forEach((f) => (f.style.opacity = (state.lights * flick * pulse * (state.fxAmt > 0.5 ? 1 : 0.4)).toFixed(3)));

    const sh = shotAt(state.p);
    applyShot(sh, time);
    drawFx(dt, time);
    listeners.forEach((fn) => fn(state));
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", async () => {
    if (!!K.bildHandy && portraitMQ.matches !== usePortrait) await chooseImage();
    layout();
  });
  layout();
  applyShot(shotAt(0), 0);
  requestAnimationFrame(tick);

  return {
    setProgress(p) { state.target = clamp(p, 0, 1); },
    jump(p) { state.target = state.p = clamp(p, 0, 1); state.speedKmh = 0; },
    setPointer(x, y) { state.mx = x; state.my = y; },
    lightsOn(on = true) { state.lightsTarget = on ? 1 : 0; },
    onFrame(fn) { listeners.push(fn); },
    pause(v) {
      const was = state.running;
      state.running = !v;
      if (!was && state.running) { last = performance.now(); requestAnimationFrame(tick); }
    },
    get speed() { return state.speedKmh; }
  };
}
