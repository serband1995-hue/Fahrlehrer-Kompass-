/* ============================================================
   SERBAND – Steuerung der Seite
   ============================================================ */
import { CONFIG } from "./config.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const isDesktop = () => matchMedia("(min-width: 900px)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

/* ---------- Inhalte aus der Konfiguration ---------- */
function fillContent() {
  const L = CONFIG.links;
  const setHref = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
  setHref("akademieLink", L.akademie);
  setHref("rateLink", L.bewerten);
  setHref("priceLink", L.preise);
  setHref("waLink", L.whatsapp);
  setHref("impLink", L.impressum);
  setHref("dsLink", L.datenschutz);
  const tel = $("#telLink");
  tel.href = "tel:" + L.telefon;
  tel.textContent = L.telefonAnzeige;

  const social = $("#socialLinks");
  [["Instagram", L.instagram], ["TikTok", L.tiktok]].forEach(([n, u]) => {
    if (!u) return;
    const a = document.createElement("a");
    a.href = u; a.target = "_blank"; a.rel = "noopener"; a.textContent = n;
    social.prepend(a);
  });

  if (CONFIG.fotos.portrait) {
    const img = new Image();
    img.src = CONFIG.fotos.portrait;
    img.alt = `${CONFIG.name}, ${CONFIG.rolle}`;
    img.loading = "lazy";
    const frame = $(".portrait__frame");
    $(".portrait__ph", frame).remove();
    frame.prepend(img);
  }

  // Videos in den Ausbildungs-Schritten
  $$(".step[data-video]").forEach((step) => {
    const src = CONFIG.videos[step.dataset.video];
    if (!src) return;
    const v = document.createElement("video");
    Object.assign(v, { src, muted: true, loop: true, playsInline: true, autoplay: true, preload: "metadata" });
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    $(".step__media", step).append(v);
  });

  // Zahlen
  const stats = $("#stats");
  CONFIG.zahlen.filter((z) => z.wert !== null && z.wert !== undefined).forEach((z) => {
    const d = document.createElement("div");
    d.className = "stat reveal-up";
    d.innerHTML = `<b data-count="${z.wert}" data-dec="${z.dezimal || 0}" data-suffix="${z.suffix || ""}">0</b><span>${z.stern ? "★ " : ""}${z.label}</span>`;
    stats.append(d);
  });
  if (stats.children.length < 2) stats.remove();

  // Bewertungen
  const rail = $("#reviewsRail");
  CONFIG.bewertungen.forEach((b) => {
    const el = document.createElement("article");
    el.className = "review" + (b.platzhalter ? " is-placeholder" : "");
    const initial = (b.name || "?").trim().charAt(0).toUpperCase();
    el.innerHTML = `
      ${b.platzhalter ? '<span class="ph-tag">Platzhalter</span>' : ""}
      <div class="review__stars" aria-label="${b.sterne} von 5 Sternen">${"★".repeat(b.sterne || 5)}</div>
      <p class="review__text"></p>
      <div class="review__who"><i>${initial}</i><div><span></span><small>${b.quelle || "Google"}-Bewertung</small></div></div>`;
    $(".review__text", el).textContent = b.text;
    $(".review__who span", el).textContent = b.name;
    rail.append(el);
  });

  // QR-Code zum Bewerten
  try {
    const qr = window.qrcode(0, "M");
    qr.addData(L.bewerten);
    qr.make();
    $("#qrCode").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    const svg = $("#qrCode svg");
    svg.querySelectorAll("path").forEach((p) => p.setAttribute("fill", "#0b2419"));
  } catch (e) {
    $("#qrCode").textContent = "QR-Code konnte nicht erzeugt werden.";
  }
}

/* ---------- Text in Wörter zerlegen ---------- */
function splitWords(el) {
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(" ")); return; }
          const w = document.createElement("span");
          w.className = "w";
          const i = document.createElement("span");
          i.textContent = part;
          w.append(i);
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
}

/* ---------- Motorsound (wird im Browser erzeugt) ---------- */
const engine = (() => {
  let ctx = null, master, osc1, osc2, noiseGain, filter, on = false;
  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 4;
    osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = 34;
    osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = 68;
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    // leises Rauschen für Fahrtwind
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 700;
    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    osc1.connect(filter);
    osc2.connect(g2).connect(filter);
    filter.connect(master);
    noise.connect(nf).connect(noiseGain).connect(master);
    master.connect(ctx.destination);
    osc1.start(); osc2.start(); noise.start();
    return true;
  }
  return {
    start() {
      if (!ctx && !build()) return;
      ctx.resume();
      on = true;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(0, t);
      master.gain.linearRampToValueAtTime(0.16, t + 0.25);
      master.gain.linearRampToValueAtTime(0.07, t + 1.6);
      osc1.frequency.setValueAtTime(26, t);
      osc1.frequency.exponentialRampToValueAtTime(92, t + 0.55);
      osc1.frequency.exponentialRampToValueAtTime(36, t + 1.6);
      osc2.frequency.setValueAtTime(52, t);
      osc2.frequency.exponentialRampToValueAtTime(184, t + 0.55);
      osc2.frequency.exponentialRampToValueAtTime(72, t + 1.6);
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.linearRampToValueAtTime(1300, t + 0.5);
      filter.frequency.linearRampToValueAtTime(420, t + 1.6);
    },
    stop() {
      if (!ctx) return;
      on = false;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    },
    speed(kmh) {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      const r = clamp(kmh / 130, 0, 1);
      // einfache „Gänge“: Drehzahl steigt und fällt je Gang
      const gearPos = (kmh % 32) / 32;
      const rpm = 36 + r * 30 + gearPos * 28;
      osc1.frequency.setTargetAtTime(rpm, t, 0.12);
      osc2.frequency.setTargetAtTime(rpm * 2, t, 0.12);
      filter.frequency.setTargetAtTime(420 + r * 900, t, 0.2);
      master.gain.setTargetAtTime(0.06 + r * 0.06, t, 0.2);
      noiseGain.gain.setTargetAtTime(r * 0.05, t, 0.3);
    },
    get on() { return on; },
    suspend(v) { if (ctx) v ? ctx.suspend() : on && ctx.resume(); }
  };
})();

/* ---------- Start ---------- */
fillContent();
$$(".split-words").forEach(splitWords);
$$(".menu li").forEach((li, i) => li.style.setProperty("--i", i));

let scene = null;
let lenis = null;

async function boot() {
  // Schriften abwarten, damit das Dachschild richtig beschriftet wird
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) < 4;
  try {
    const { createScene } = await import("./scene.js");
    scene = createScene($("#world"), { lowPower, reducedMotion });
  } catch (err) {
    console.warn("3D nicht verfügbar:", err);
    document.body.classList.add("no-webgl");
  }
}

/* Vorspann: Zähler, dann „Motor starten“ */
const counter = { v: 0 };
const bootPromise = boot();
gsap.to(counter, {
  v: 100,
  duration: reducedMotion ? 0.2 : 2.2,
  ease: "power2.inOut",
  onUpdate: () => ($("#introCount").textContent = Math.round(counter.v)),
  onComplete: async () => {
    await bootPromise;
    $(".intro__count").style.opacity = 0;
    const actions = $("#introActions");
    actions.hidden = false;
    gsap.from(actions.children, { y: 20, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" });
  }
});

function ignite(withSound) {
  if (withSound) {
    engine.start();
    setSound(true);
  }
  scene && scene.lightsOn(true);
  const tl = gsap.timeline();
  tl.to(".intro__inner", { opacity: 0, scale: 0.96, duration: 0.5, ease: "power2.in" }, 0.35)
    .set(".intro", { background: "transparent" })
    .fromTo(".intro__curtain", { scaleY: 1 }, { scaleY: 0, duration: 1.3, ease: "expo.inOut" })
    .add(() => {
      $("#intro").remove();
      document.body.classList.remove("is-loading");
      startPage();
    }, "-=0.6");
}
$("#ignite").addEventListener("click", () => ignite(true));
$("#igniteMute").addEventListener("click", () => ignite(false));

/* ---------- Ton-Schalter ---------- */
const soundBtn = $("#soundBtn");
function setSound(on) {
  soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
}
soundBtn.addEventListener("click", () => {
  if (engine.on) { engine.stop(); setSound(false); }
  else { engine.start(); setSound(true); }
});
document.addEventListener("visibilitychange", () => {
  engine.suspend(document.hidden);
  scene && scene.pause(document.hidden);
});

/* ---------- Seite nach dem Vorspann ---------- */
function startPage() {
  // Weiches Scrollen
  if (!reducedMotion) {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else (typeof target === "number" ? window.scrollTo(0, target) : document.querySelector(target).scrollIntoView());
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2 || !document.querySelector(id)) return;
    e.preventDefault();
    closeMenu();
    scrollTo(id);
  }));

  heroIntro();
  setupReveals();
  setupJourney();
  setupProgress(scrollTo);
  setupMarquee();
  setupTilt();
  setupMagnetic();
  setupReviews();
  setupGame();
  setupPhone();
  setupSheets();
  setupPaint();
  setupPointer();
  ScrollTrigger.refresh();
}

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  tl.from(".nav", { y: -30, opacity: 0, duration: 1.2 }, 0)
    .from(".hero__title .split", { yPercent: 115, duration: 1.6, stagger: 0.12 }, 0.1)
    .from(".hero .reveal-up", { y: 30, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.5)
    .from(".scroll-cue", { opacity: 0, duration: 1 }, 1.2);
}

/* ---------- Einblendungen beim Scrollen ---------- */
function setupReveals() {
  $$(".split-words").forEach((el) => {
    gsap.from($$(".w > span", el), {
      yPercent: 110,
      rotate: 4,
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.04,
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });
  $$("main .reveal-up").forEach((el) => {
    if (el.closest(".hero")) return;
    gsap.from(el, {
      y: 36,
      opacity: 0,
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%" }
    });
  });
  $$(".reveal-card").forEach((el) => {
    gsap.from(el, {
      y: 80, rotateX: 12, rotateZ: -3, opacity: 0, scale: 0.94,
      duration: 1.4, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });
  // Porträt: leichte Parallaxe
  const img = $(".portrait__frame img");
  if (img) gsap.to(img, { yPercent: -8, ease: "none", scrollTrigger: { trigger: "#ich", scrub: true } });

  gsap.from(".promise", {
    y: 90, opacity: 0, rotateX: -14, duration: 1.3, ease: "expo.out", stagger: 0.12,
    scrollTrigger: { trigger: ".promises", start: "top 82%" }
  });
  $$(".promise__icon path, .promise__icon circle, .promise__icon rect").forEach((p) => {
    const len = p.getTotalLength ? p.getTotalLength() : 200;
    gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, {
      strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut",
      scrollTrigger: { trigger: p.closest(".promise"), start: "top 80%" }
    });
  });
  gsap.from(".gear-card", {
    y: 80, opacity: 0, duration: 1.3, ease: "expo.out", stagger: 0.15,
    scrollTrigger: { trigger: ".gears", start: "top 85%" }
  });
  gsap.from(".faq details", {
    y: 30, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.07,
    scrollTrigger: { trigger: ".faq", start: "top 85%" }
  });
  gsap.from(".qr__stars i", {
    scale: 0, rotate: -90, duration: 0.8, ease: "back.out(3)", stagger: 0.08,
    scrollTrigger: { trigger: ".qr", start: "top 75%" }
  });
  gsap.from(".finale__title .split", {
    yPercent: 115, duration: 1.6, ease: "expo.out", stagger: 0.12,
    scrollTrigger: { trigger: ".finale", start: "top 60%" }
  });
  // Zahlen hochzählen
  $$("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec, 10) || 0;
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2.2, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
      onUpdate: () => (el.textContent = o.v.toFixed(dec).replace(".", ",") + el.dataset.suffix)
    });
  });
}

/* ---------- Dein Weg: horizontale Fahrt ---------- */
function setupJourney() {
  const track = $("#journeyTrack");
  const svg = $("#journeyRoad");
  const path = $("#journeyPath");
  const steps = $$(".step", track);
  const ns = "http://www.w3.org/2000/svg";
  const glowPath = document.createElementNS(ns, "path");
  glowPath.setAttribute("style", "stroke:#d9b56b;stroke-width:3;stroke-dasharray:none;fill:none;filter:drop-shadow(0 0 6px rgba(217,181,107,.8))");
  svg.append(glowPath);

  const drawRoad = () => {
    const tb = track.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${tb.width} ${tb.height}`);
    const pts = steps.map((s) => {
      const b = s.getBoundingClientRect();
      return [b.left - tb.left + b.width / 2, b.top - tb.top + (s.matches(":nth-child(odd)") ? -14 : b.height + 14)];
    });
    let d = `M ${pts[0][0] - 200} ${pts[0][1]}`;
    pts.forEach((p, i) => {
      const prev = i ? pts[i - 1] : [p[0] - 200, p[1]];
      const mx = (prev[0] + p[0]) / 2;
      d += ` C ${mx} ${prev[1]}, ${mx} ${p[1]}, ${p[0]} ${p[1]}`;
    });
    path.setAttribute("d", d);
    glowPath.setAttribute("d", d);
    const len = glowPath.getTotalLength();
    glowPath.style.strokeDasharray = `${len}`;
    glowPath.dataset.len = len;
  };

  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    drawRoad();
    const dist = () => track.scrollWidth - window.innerWidth;
    const st = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: ".journey",
        start: "top top",
        end: () => "+=" + dist(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onRefresh: drawRoad,
        onUpdate: (self) => {
          const len = +glowPath.dataset.len || 0;
          glowPath.style.strokeDashoffset = len * (1 - self.progress);
        }
      }
    });
    steps.forEach((s, i) => {
      gsap.from(s, {
        y: i % 2 ? 60 : -60, opacity: 0, rotate: i % 2 ? 3 : -3, duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: s, containerAnimation: st, start: "left 92%" }
      });
    });
    return () => { gsap.set(track, { x: 0 }); };
  });
  mm.add("(max-width: 899px)", () => {
    ScrollTrigger.create({
      trigger: track, start: "top 70%", end: "bottom 60%", scrub: true,
      onUpdate: (self) => track.style.setProperty("--prog", self.progress)
    });
    steps.forEach((s) => gsap.from(s, { x: 40, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: s, start: "top 85%" } }));
  });
}

/* ---------- Fortschritt: Auto, Tacho, Route ---------- */
function setupProgress(scrollTo) {
  const sections = $$("[data-stop]");
  const n = sections.length;
  const stopsEl = $("#routeStops");
  sections.forEach((sec, i) => {
    const li = document.createElement("li");
    li.style.top = (i / (n - 1)) * 100 + "%";
    li.innerHTML = `<span>${sec.dataset.stop}</span>`;
    li.addEventListener("click", () => scrollTo("#" + sec.id));
    stopsEl.append(li);
  });
  const lis = $$("li", stopsEl);
  let tops = [];
  const measure = () => {
    tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
  };
  ScrollTrigger.addEventListener("refresh", measure);
  measure();

  // Scrollposition -> virtueller Fortschritt: jeder Abschnitt bekommt den gleichen Anteil
  const virtual = () => {
    const y = window.scrollY + Math.min(window.scrollY, window.innerHeight * 0.35);
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= maxY - 2) return 1;
    let i = 0;
    while (i < n - 1 && y >= tops[i + 1]) i++;
    if (i >= n - 1) return 1;
    const f = clamp((y - tops[i]) / (tops[i + 1] - tops[i]), 0, 1);
    return (i + f) / (n - 1);
  };

  const fill = $("#routeFill"), car = $("#routeCar");
  const speedEl = $("#hudSpeed"), gearEl = $("#hudGear"), gauge = $("#hudFill");
  let current = -1, lastSpeedTxt = "";
  const update = () => {
    const v = virtual();
    scene && scene.setProgress(v);
    fill.style.height = v * 100 + "%";
    car.style.top = v * 100 + "%";
    const idx = Math.min(n - 1, Math.floor(v * (n - 1) + 0.2));
    if (idx !== current) {
      current = idx;
      lis.forEach((li, i) => {
        li.classList.toggle("is-past", i < idx);
        li.classList.toggle("is-current", i === idx);
      });
    }
    document.body.classList.toggle("is-driving", v > 0.02 && v < 0.985);
  };
  window.__snap = () => { update(); scene && scene.jump(virtual()); };
  if (lenis) lenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  update();

  if (scene) {
    scene.onFrame((st) => {
      const s = st.speedKmh;
      const txt = String(Math.round(s));
      if (txt !== lastSpeedTxt) {
        speedEl.textContent = txt;
        lastSpeedTxt = txt;
      }
      gauge.style.strokeDasharray = `${(clamp(s / 140, 0, 1) * 235.6).toFixed(1)} 314.2`;
      const g = s < 1.5 ? (st.p < 0.05 ? "P" : "N") : s < 18 ? "1" : s < 34 ? "2" : s < 52 ? "3" : s < 75 ? "4" : "5";
      if (gearEl.textContent !== g) gearEl.textContent = g;
      engine.speed(s);
    });
    // Leistung prüfen: ruckelt es, wird das Glühen abgeschaltet
    let frames = 0;
    const t0 = performance.now();
    const probe = () => {
      frames++;
      const dt = performance.now() - t0;
      if (dt < 2500) return requestAnimationFrame(probe);
      if (frames / (dt / 1000) < 38) scene.degrade && scene.degrade();
    };
    requestAnimationFrame(probe);
  }
}

/* ---------- Laufband ---------- */
function setupMarquee() {
  const track = $(".marquee__track");
  const half = () => track.scrollWidth / 2;
  let x = 0, boost = 0;
  if (lenis) lenis.on("scroll", (e) => (boost = clamp(Math.abs(e.velocity) * 0.6, 0, 18)));
  gsap.ticker.add((t, dt) => {
    x -= (0.6 + boost) * (dt / 16);
    boost *= 0.92;
    if (-x >= half()) x += half();
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
}

/* ---------- 3D-Kippen der Karten ---------- */
function setupTilt() {
  if (!finePointer) return;
  $$(".tilt").forEach((card) => {
    const glow = $(".promise__glow", card);
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      gsap.to(card, { rotateY: (px - 0.5) * 12, rotateX: (0.5 - py) * 10, duration: 0.6, ease: "power3.out" });
      if (glow) { card.style.setProperty("--gx", px * 100 + "%"); card.style.setProperty("--gy", py * 100 + "%"); }
    });
    card.addEventListener("pointerleave", () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.9, ease: "elastic.out(1, .5)" }));
  });
}

/* ---------- Magnetische Knöpfe & Cursor ---------- */
function setupMagnetic() {
  if (!finePointer) return;
  const cursor = $(".cursor");
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
  window.addEventListener("pointermove", (e) => { cursor.classList.add("is-on"); xTo(e.clientX); yTo(e.clientY); });
  $$("a, button, summary, .reviews").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });
  $$(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.5, ease: "power3.out" });
    });
    el.addEventListener("pointerleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, .4)" }));
  });
}

/* ---------- Bewertungen: ziehen & wischen ---------- */
function setupReviews() {
  const box = $("#reviews"), rail = $("#reviewsRail");
  let x = 0, vx = 0, dragging = false, startX = 0, startPos = 0, lastX = 0, moved = 0;
  const min = () => Math.min(0, box.clientWidth - rail.scrollWidth);
  box.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0;
    startX = lastX = e.clientX; startPos = x;
    box.classList.add("is-drag");
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    vx = e.clientX - lastX; lastX = e.clientX;
    moved += Math.abs(vx);
    x = startPos + (e.clientX - startX);
  });
  const up = () => { dragging = false; box.classList.remove("is-drag"); };
  box.addEventListener("pointerup", up);
  box.addEventListener("pointercancel", up);
  gsap.from(".review", { x: 120, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: box, start: "top 85%" } });
  let back = null;
  gsap.ticker.add(() => {
    if (!dragging && !back) {
      x += vx;
      vx *= 0.94;
      if (Math.abs(vx) < 0.05 && !reducedMotion) x -= 0.3; // langsames Treiben
      if (x > 0) x += (0 - x) * 0.15;
      if (x < min()) {
        x = min();
        // am Ende sanft zurück an den Anfang
        back = gsap.to({ v: x }, { v: 0, duration: 2.4, delay: 2, ease: "power3.inOut", onUpdate() { x = this.targets()[0].v; }, onComplete: () => (back = null) });
      }
    }
    if (dragging && back) { back.kill(); back = null; }
    rail.style.transform = `translate3d(${x}px,0,0)`;
  });
}

/* ---------- Reaktionstest ---------- */
function setupGame() {
  const btn = $("#light"), msg = $("#lightMsg");
  const lamps = $$(".light__lamp", btn);
  const tEl = $("#gameTime"), bEl = $("#gameBest"), dEl = $("#gameDist");
  let state = "idle", timer = null, t0 = 0;
  const best = parseInt(store.get("serband-best") || "", 10);
  if (best) bEl.textContent = best + " ms";
  const reset = () => lamps.forEach((l) => (l.className = "light__lamp"));
  const verdict = (ms) => ms < 230 ? "Blitzreflex!" : ms < 300 ? "Sehr stark!" : ms < 400 ? "Solide!" : "Nochmal, ganz ruhig";
  const go = () => {
    state = "wait";
    reset();
    msg.textContent = "Warte auf Grün …";
    lamps[0].classList.add("red");
    timer = setTimeout(() => {
      lamps[1].classList.add("amber");
      timer = setTimeout(() => {
        reset();
        lamps[2].classList.add("green");
        state = "go";
        t0 = performance.now();
        msg.textContent = "JETZT!";
      }, 600 + Math.random() * 2200);
    }, 900);
  };
  const press = (e) => {
    e.preventDefault();
    if (state === "idle" || state === "done") return go();
    if (state === "wait") {
      clearTimeout(timer);
      reset();
      lamps[0].classList.add("red");
      state = "done";
      msg.textContent = "Zu früh! Nochmal?";
      tEl.textContent = "Rot!";
      gsap.fromTo(btn, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1, .3)" });
      return;
    }
    if (state === "go") {
      const ms = Math.round(performance.now() - t0);
      state = "done";
      tEl.textContent = ms + " ms";
      const dist = (50 / 3.6) * (ms / 1000);
      dEl.textContent = dist.toFixed(1).replace(".", ",") + " m";
      msg.textContent = verdict(ms) + " Nochmal?";
      const prev = parseInt(store.get("serband-best") || "", 10);
      if (!prev || ms < prev) {
        store.set("serband-best", ms);
        bEl.textContent = ms + " ms";
        gsap.fromTo(bEl, { scale: 1.4, color: "#8fe6bf" }, { scale: 1, color: "#f1dca6", duration: 0.8, ease: "back.out(2)" });
      }
    }
  };
  btn.addEventListener("pointerdown", press);
  btn.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") press(e); });
  btn.addEventListener("click", (e) => e.preventDefault());
}

/* ---------- Handy der Fahr-Akademie ---------- */
function setupPhone() {
  const phone = $("#phone");
  gsap.fromTo(phone, { rotateY: -32, rotateX: 14, y: 80 }, {
    rotateY: 14, rotateX: -4, y: -40, ease: "none",
    scrollTrigger: { trigger: "#akademie", start: "top bottom", end: "bottom top", scrub: 1 }
  });
  $$(".float-chip").forEach((c, i) => {
    gsap.fromTo(c, { y: 60 + i * 30, opacity: 0 }, {
      y: -40 - i * 20, opacity: 1, ease: "none",
      scrollTrigger: { trigger: "#akademie", start: "top 80%", end: "bottom 20%", scrub: 1 }
    });
  });
  gsap.from(".ui__path li", { x: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: phone, start: "top 70%" } });
}

/* ---------- Kalender- und Hinweisfenster ---------- */
function setupSheets() {
  const sheet = $("#sheet"), frame = $("#sheetFrame"), consent = $("#sheetConsent");
  let lastFocus = null, currentUrl = "";
  const open = (el) => {
    lastFocus = document.activeElement;
    el.hidden = false;
    lenis && lenis.stop();
    document.body.style.overflow = "hidden";
    setTimeout(() => $(".sheet__close", el).focus(), 50);
  };
  const close = (el) => {
    el.hidden = true;
    lenis && lenis.start();
    document.body.style.overflow = "";
    lastFocus && lastFocus.focus();
  };
  const loadFrame = () => {
    consent.hidden = true;
    frame.hidden = false;
    frame.src = currentUrl;
    try { sessionStorage.setItem("serband-cal-ok", "1"); } catch (e) {}
  };
  $$("[data-cal]").forEach((b) => b.addEventListener("click", () => {
    const auto = b.dataset.cal === "automatik";
    currentUrl = auto ? CONFIG.links.kalenderAutomatik : CONFIG.links.kalenderSchalter;
    $("#sheetKind").textContent = auto ? "Automatik" : "Schaltwagen";
    $("#sheetTitle").textContent = "Fahrstunde buchen";
    $("#sheetExt").href = currentUrl;
    let ok = false;
    try { ok = sessionStorage.getItem("serband-cal-ok") === "1"; } catch (e) {}
    if (ok) loadFrame();
    else { consent.hidden = false; frame.hidden = true; frame.removeAttribute("src"); }
    open(sheet);
  }));
  $("#sheetLoad").addEventListener("click", loadFrame);
  $("#installBtn").addEventListener("click", () => open($("#installSheet")));
  $$(".sheet").forEach((s) => {
    $$("[data-close]", s).forEach((c) => c.addEventListener("click", () => close(s)));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    $$(".sheet").forEach((s) => { if (!s.hidden) close(s); });
    closeMenu();
  });

  // Menü
  $("#menuBtn").addEventListener("click", () => {
    const openNow = !$("#menu").classList.contains("is-open");
    $("#menu").classList.toggle("is-open", openNow);
    $("#menu").setAttribute("aria-hidden", openNow ? "false" : "true");
    $("#menuBtn").setAttribute("aria-expanded", openNow ? "true" : "false");
    openNow ? lenis && lenis.stop() : lenis && lenis.start();
  });
}
function closeMenu() {
  const m = $("#menu");
  if (!m || !m.classList.contains("is-open")) return;
  m.classList.remove("is-open");
  m.setAttribute("aria-hidden", "true");
  $("#menuBtn").setAttribute("aria-expanded", "false");
  lenis && lenis.start();
}

/* ---------- Lackfarbe ---------- */
function setupPaint() {
  $$(".paint__dot").forEach((d) => d.addEventListener("click", () => {
    $$(".paint__dot").forEach((x) => x.classList.toggle("is-active", x === d));
    scene && scene.setPaint(d.dataset.paint);
  }));
}

/* ---------- Maus bewegt die Kamera leicht ---------- */
function setupPointer() {
  if (!scene || !finePointer) return;
  window.addEventListener("pointermove", (e) => {
    scene.setPointer((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * -2);
  });
}
