/* ============================================================
   Die Bühne: pro Kapitel ein Hintergrund (Video oder Bild).
   - Videos werden beim Scrollen gespult (das Auto fährt mit dem Daumen).
   - Bilder bekommen eine langsame Kamerafahrt.
   - Geladen wird erst kurz bevor ein Kapitel kommt.
   Nur transform/opacity, damit nichts ruckelt.
   ============================================================ */
import { CONFIG } from "./config.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createStage(ids) {
  const root = document.getElementById("stage");
  const portrait = matchMedia("(max-aspect-ratio: 9/10)").matches;
  // Datensparmodus am Handy: nur Standbilder, keine Videos
  const sparen = !!(navigator.connection && navigator.connection.saveData);
  const scenes = {};

  ids.forEach((id) => {
    const cfg = CONFIG.szenen[id] || CONFIG.szenen.standard;
    const el = document.createElement("div");
    el.className = "scene";
    el.dataset.id = id;
    const img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.dataset.src = (portrait && cfg.bildHandy) || cfg.bild;
    if (cfg.fokus) img.style.objectPosition = portrait ? cfg.fokusHandy || cfg.fokus : cfg.fokus;
    el.append(img);
    let video = null;
    const vsrc = !sparen && ((portrait && cfg.videoHandy) || cfg.video);
    if (vsrc) {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.preload = "none";
      // erste Quelle, die der Browser abspielen kann (MP4 ist kleiner, WebM als Rückfall)
      video.dataset.src = [].concat(vsrc).join("|");
      if (cfg.fokus) video.style.objectPosition = portrait ? cfg.fokusHandy || cfg.fokus : cfg.fokus;
      video.style.opacity = 0;
      el.append(video);
    }
    // unscharfe Fassung darüber (Tiefeneffekt), vorab berechnet – kein Filter im Browser
    let soft = null;
    const wsrc = (portrait && cfg.weichHandy) || cfg.weich;
    if (wsrc) {
      soft = document.createElement("img");
      soft.alt = "";
      soft.className = "scene__soft";
      soft.decoding = "async";
      soft.dataset.src = wsrc;
      if (cfg.fokus) soft.style.objectPosition = img.style.objectPosition;
      el.append(soft);
    }
    root.append(el);
    scenes[id] = { el, img, video, soft, cfg, p: 0, t: 0, loaded: false, ready: false };
  });

  // Standbild (und weiche Fassung) laden – klein, darf sofort passieren
  function loadStill(id) {
    const s = scenes[id];
    if (!s || s.still) return;
    s.still = true;
    s.img.src = s.img.dataset.src;
    if (s.soft) s.soft.src = s.soft.dataset.src;
  }

  function load(id) {
    const s = scenes[id];
    if (!s || s.loaded) return;
    s.loaded = true;
    loadStill(id);
    if (s.video) {
      const srcs = s.video.dataset.src.split("|");
      const ok = srcs.find((u) => s.video.canPlayType(u.endsWith(".webm") ? 'video/webm; codecs="vp9"' : 'video/mp4; codecs="avc1.640028"'));
      if (!ok) { s.video.remove(); s.video = null; return; }
      s.video.src = ok;
      s.video.preload = "auto";
      s.video.load();
      s.video.addEventListener("loadeddata", () => {
        s.ready = true;
        s.video.style.opacity = 1;
      }, { once: true });
      // iPhone lädt ohne Abspielen oft nichts: kurz stumm anspielen und sofort anhalten.
      // Klappt das nicht (z. B. Stromsparmodus), bleibt einfach das Standbild stehen.
      const v = s.video, p = v.play();
      if (p && p.then) p.then(() => v.pause()).catch(() => {});
    }
  }

  let active = null, loadTimer = 0;
  function show(id) {
    if (active === id) return;
    const first = active === null;
    active = id;
    const i = ids.indexOf(id);
    const s = scenes[id];
    if (s) s.t = s.p; // direkt an der richtigen Stelle beginnen, nicht vom alten Stand nachspulen
    // Standbild sofort; Videos erst, wenn das Kapitel kurz stehen bleibt –
    // sonst lädt ein Sprung per Menü unterwegs alle Videos.
    loadStill(id);
    clearTimeout(loadTimer);
    const go = () => {
      if (active !== id) return;
      load(id);
      load(ids[i + 1]); // nächstes Kapitel schon vorladen
    };
    if (first) go(); else loadTimer = setTimeout(go, 350);
    Object.values(scenes).forEach((x) => x.el.classList.toggle("is-on", x.el.dataset.id === id));
  }

  function progress(id, p) {
    const s = scenes[id];
    if (s) s.p = clamp(p, 0, 1);
  }

  // Schleife: nur die aktive Szene wird bewegt (immer nur eine Schleife gleichzeitig)
  let running = true, raf = 0;
  function tick() {
    raf = 0;
    if (!running) return;
    const s = scenes[active];
    if (s) {
      // weiche Nachführung, damit das Spulen nicht springt
      s.t += (s.p - s.t) * 0.12;
      const k = s.t;
      if (s.video && s.ready && s.video.duration) {
        const end = s.video.duration - 0.05;
        let target = k * end;
        // während die weiche Fassung darüber liegt, hält das Video genau deren Bild –
        // so passen beide beim Ein- und Ausblenden zusammen
        const hold = portrait && s.cfg.weichZeitHandy != null ? s.cfg.weichZeitHandy : s.cfg.weichZeit;
        if (s.softV > 0 && hold != null) target += (Math.min(hold, end) - target) * Math.min(1, s.softV * 1.25);
        // nicht neu suchen, solange der letzte Sprung noch läuft (schwache Handys)
        if (!s.video.seeking && Math.abs(s.video.currentTime - target) > 1 / 30) s.video.currentTime = target;
      }
      // langsame Kamerafahrt (Bild und Video)
      const z = 1.12 - 0.1 * k;
      const x = (s.cfg.fahrt || 0) * (k - 0.5) * 4;
      const tr = `translate3d(${x.toFixed(2)}%,0,0) scale(${z.toFixed(4)})`;
      s.img.style.transform = tr;
      if (s.video) s.video.style.transform = tr;
      if (s.soft) s.soft.style.transform = tr;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  if (/[?&]debug\b/.test(location.search)) window.__stage = { scenes, get active() { return active; } };
  return {
    show,
    progress,
    load,
    // Hintergrund weichzeichnen (0 … 1), z. B. wenn vorne etwas scharf gestellt wird
    soft(id, v) {
      const s = scenes[id];
      if (!s || !s.soft) return;
      s.softV = clamp(v, 0, 1);
      s.soft.style.opacity = s.softV.toFixed(3);
    },
    pause(v) {
      running = !v;
      if (running && !raf) raf = requestAnimationFrame(tick);
    }
  };
}
