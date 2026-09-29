/* ============================================================
   SERBAND – „Es geht auch anders.“  Steuerung des Films.
   ============================================================ */
import { CONFIG } from "./config.js";
import { createStage } from "./stage.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

/* ---------- Farbtypen (angelehnt an Thomas Erikson) ---------- */
const FRAGEN = [
  { q: "Du sitzt zum ersten Mal am Steuer. Was geht dir durch den Kopf?",
    a: { r: "Los geht's. Wann darf ich schneller?", y: "Wie cool ist das denn!", g: "Hoffentlich mache ich nichts falsch.", b: "Erst mal: Wofür ist welcher Hebel?" } },
  { q: "Du hast einen Fehler gemacht. Was brauchst du jetzt?",
    a: { r: "Kurz sagen, was falsch war. Weiter.", y: "Ein aufmunterndes Wort.", g: "Einen Moment Ruhe.", b: "Eine genaue Erklärung, warum." } },
  { q: "Wie lernst du am liebsten?",
    a: { r: "Machen, machen, machen.", y: "Mit Spaß und Abwechslung.", g: "In meinem Tempo, Schritt für Schritt.", b: "Mit System und Hintergrundwissen." } },
  { q: "Wann war eine Fahrstunde für dich richtig gut?",
    a: { r: "Wenn ich etwas Neues geschafft habe.", y: "Wenn wir zwischendurch gelacht haben.", g: "Wenn ich mich sicher gefühlt habe.", b: "Wenn ich alles verstanden habe." } }
];
const TYPEN = {
  r: { name: "Rot", titel: "Die Macherin, der Macher", farbe: "var(--red)",
       text: "Du willst vorankommen. Wir setzen klare Ziele für jede Stunde, ich rede nicht drumherum, und du bekommst Tempo, sobald es sicher ist." },
  y: { name: "Gelb", titel: "Mit Herz und Begeisterung", farbe: "var(--yellow)",
       text: "Du lernst mit Freude. Wir halten die Stunden abwechslungsreich, feiern jeden Fortschritt, und ich sorge dafür, dass trotzdem nichts untergeht." },
  g: { name: "Grün", titel: "Ruhig und gründlich", farbe: "var(--green)",
       text: "Du brauchst Sicherheit. Wir fangen dort an, wo du dich wohlfühlst, ohne Druck und ohne Überraschungen. Schritt für Schritt, bis es sitzt." },
  b: { name: "Blau", titel: "Erst verstehen, dann fahren", farbe: "var(--blue)",
       text: "Du willst wissen, warum. Ich erkläre dir den Grund hinter jeder Regel, und in der Fahr-Akademie kannst du alles in Ruhe nachschauen." }
};

/* ---------- Inhalte aus der Konfiguration ---------- */
function fillContent() {
  const L = CONFIG.links;
  const setHref = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
  setHref("akademieLink", L.akademie);
  setHref("rateLink", L.bewerten);
  setHref("priceLink", L.preise);
  setHref("waLink", L.whatsapp);
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
  // Fotos: groß und klein (Handy), leer = Foto ausblenden
  // (srcset/sizes stehen schon im HTML, damit nichts doppelt lädt; hier nur bei anderer Konfiguration)
  $$("[data-foto]").forEach((img) => {
    const f = (CONFIG.fotos || {})[img.dataset.foto];
    if (!f) {
      const story = img.closest(".story");
      if (story) story.classList.replace("story--shot", "story--solo");
      img.closest("figure").remove();
      return;
    }
    const src = typeof f === "string" ? f : f.src;
    if (img.getAttribute("src") === (f.klein || src)) return;
    if (f.klein) img.srcset = `${f.klein} ${f.kleinBreite}w, ${src} ${f.breite}w`;
    else img.removeAttribute("srcset");
    img.src = f.klein || src;
  });
  if (!$("#vowPhoto")) $("#vow").classList.add("vow--text");
  // echte Screenshots der Apps statt Beispielansichten
  const shots = CONFIG.screenshots || {};
  $$("[data-shot]").forEach((d) => {
    const src = shots[d.dataset.shot];
    if (!src) return;
    const img = new Image();
    img.src = src; img.alt = ""; img.loading = "lazy";
    $(".device__screen", d).replaceChildren(img);
  });
  // Bewertungen: Platzhalter nur unter ?entwurf, sonst Block ausblenden
  const entwurf = /[?&]entwurf\b/.test(location.search);
  const reviews = CONFIG.bewertungen.filter((b) => entwurf || !b.platzhalter);
  if (!reviews.length) $("#stimmen").remove();
  const rail = $("#reviewsRail");
  reviews.forEach((b) => {
    const el = document.createElement("article");
    el.className = "review" + (b.platzhalter ? " is-placeholder" : "");
    const sterne = Math.max(1, Math.min(5, parseInt(b.sterne, 10) || 5));
    el.innerHTML = `${b.platzhalter ? '<span class="ph-tag">Platzhalter</span>' : ""}
      <div class="review__stars" role="img" aria-label="${sterne} von 5 Sternen">${"★".repeat(sterne)}</div>
      <p class="review__text"></p>
      <div class="review__who"><i></i><div><span></span><small></small></div></div>`;
    $(".review__text", el).textContent = b.text;
    $(".review__who span", el).textContent = b.name;
    $(".review__who i", el).textContent = (b.name || "?").trim().charAt(0).toUpperCase();
    $(".review__who small", el).textContent = (b.quelle || "Google") + "-Bewertung";
    rail && rail.append(el);
  });
  try {
    const qr = window.qrcode(0, "M");
    qr.addData(L.bewerten);
    qr.make();
    $("#qrCode").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    $$("#qrCode path").forEach((p) => p.setAttribute("fill", "#0b1115"));
  } catch (e) {}
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

/* ---------- Bestenliste (Supabase, nur zwei öffentliche Funktionen) ---------- */
const board = (() => {
  const B = CONFIG.bestenliste;
  const call = async (fn, body) => {
    const r = await fetch(`${B.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: B.key, "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error((data && data.message) || "fehler");
    return data;
  };
  const list = $("#board");
  let me = store.get("serband-name") || "";
  async function load() {
    if (!list) return;
    try {
      const rows = await call("website_reaktion_top");
      list.innerHTML = "";
      if (!rows.length) {
        list.innerHTML = '<li class="board__empty">Noch leer – sei die oder der Erste!</li>';
        return;
      }
      rows.forEach((r) => {
        const li = document.createElement("li");
        li.innerHTML = "<b></b><span></span><em></em>";
        $("b", li).textContent = r.platz + ".";
        $("span", li).textContent = r.name;
        $("em", li).textContent = r.ms + " ms";
        if (me && r.name.toLowerCase() === me.toLowerCase()) li.classList.add("is-me");
        list.append(li);
      });
    } catch (e) {
      list.innerHTML = '<li class="board__empty">Bestenliste gerade nicht erreichbar.</li>';
    }
  }
  const texte = {
    name_laenge: "Bitte 2 bis 15 Zeichen.",
    name_zeichen: "Bitte nur Buchstaben, Zahlen, Leerzeichen, Punkt oder Bindestrich.",
    name_unzulaessig: "Dieser Name geht leider nicht.",
    zeit_ungueltig: "Diese Zeit können wir nicht eintragen.",
    zu_viele_versuche: "Viele Versuche – probier es später noch einmal."
  };
  async function submit(name, ms) {
    const platz = await call("website_reaktion_eintragen", { p_name: name, p_ms: ms });
    me = name;
    store.set("serband-name", name);
    await load();
    return platz;
  }
  return { load, submit, texte, get me() { return me; } };
})();

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
      showEntry(ms);
      const prev = parseInt(store.get("serband-best") || "", 10);
      if (!prev || ms < prev) {
        store.set("serband-best", ms);
        bEl.textContent = ms + " ms";
        gsap.fromTo(bEl, { scale: 1.4, color: "#8fe6bf" }, { scale: 1, color: "#f1dca6", duration: 0.8, ease: "back.out(2)" });
      }
    }
  };
  // Eintragen in die Bestenliste
  const form = $("#entry"), input = $("#entryName"), note = $("#entryMsg");
  let lastMs = 0;
  input.value = board.me;
  function showEntry(ms) {
    lastMs = ms;
    note.textContent = "";
    form.hidden = false;
    $("label", form).textContent = ms < 400 ? `${ms} ms – starke Zeit! Trag dich in die Bestenliste ein:` : `${ms} ms. Trag dich in die Bestenliste ein:`;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    const sendBtn = $("button", form);
    sendBtn.disabled = true;
    try {
      const platz = await board.submit(name, lastMs);
      note.textContent = platz <= 5 ? `Du bist auf Platz ${platz}!` : `Eingetragen – dein Platz: ${platz}. Für die Top 5 geht noch was.`;
      setTimeout(() => (form.hidden = true), 2600);
    } catch (err) {
      note.textContent = board.texte[err.message] || "Das hat nicht geklappt. Bitte später nochmal.";
    }
    sendBtn.disabled = false;
  });
  ScrollTrigger.create({ trigger: "#test", start: "top bottom", once: true, onEnter: () => board.load() });

  btn.addEventListener("pointerdown", press);
  btn.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") press(e); });
  btn.addEventListener("click", (e) => e.preventDefault());
}

/* ---------- Bewertungen: ziehen & wischen ---------- */
function setupReviews() {
  const box = $("#reviews"), rail = $("#reviewsRail");
  if (!box || !rail.children.length) return;
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

/* ---------- Buchen: Umschalter Schaltung / Automatik ---------- */
function setupBooking() {
  const sw = $(".switch");
  if (!sw) return;
  const texts = {
    schalter: { word: "SCHALTUNG", title: "Schaltwagen", text: "Du lernst kuppeln und schalten und darfst später Schalt- und Automatikwagen fahren." },
    automatik: { word: "AUTOMATIK", title: "Automatik", text: "Kein Kuppeln, kein Abwürgen. Du konzentrierst dich ganz auf den Verkehr." }
  };
  const setMode = (mode) => {
    const t = texts[mode];
    const auto = mode === "automatik";
    sw.classList.toggle("is-auto", auto);
    $$(".switch__opt", sw).forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $("#gearSchalter").toggleAttribute("hidden", auto);
    $("#gearAutomatik").toggleAttribute("hidden", !auto);
    $("#bookBtn").dataset.cal = mode;
    gsap.fromTo([$("#bookTitle"), $("#bookText")], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power2.out", onStart: () => { $("#bookTitle").textContent = t.title; $("#bookText").textContent = t.text; } });
  };
  $$(".switch__opt", sw).forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
}


/* ---------- Start ---------- */
$$(".top, main").forEach((el) => el.setAttribute("inert", ""));
fillContent();
const chapters = $$("main section[data-kapitel]");
const ids = chapters.map((c) => c.id);
const stage = createStage(ids);
stage.show("prolog");
let lenis = null;

// Inhaltsverzeichnis
chapters.forEach((c, i) => {
  const li = document.createElement("li");
  li.innerHTML = `<a href="#${c.id}" style="--i:${i}"><small></small><span></span></a>`;
  $("small", li).textContent = c.dataset.kapitel;
  $("span", li).textContent = c.dataset.titel;
  $("#menuList").append(li);
});

// Vorspann
const counter = { v: 0 };
gsap.to(counter, {
  v: 100, duration: reducedMotion ? 0.2 : 1.8, ease: "power2.inOut",
  onUpdate: () => ($("#introCount").textContent = Math.round(counter.v)),
  onComplete: () => {
    $(".intro__count").style.opacity = 0;
    const actions = $("#introActions");
    actions.hidden = false;
    gsap.from(actions.children, { y: 20, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" });
  }
});
let started = false;
function ignite(withSound) {
  if (started) return;
  started = true;
  if (withSound) { engine.start(); setSound(true); }
  gsap.timeline()
    .to(".intro__inner", { opacity: 0, scale: 0.96, duration: 0.5, ease: "power2.in" }, 0.3)
    .set(".intro", { background: "transparent" })
    .fromTo(".intro__curtain", { scaleY: 1 }, { scaleY: 0, duration: 1.2, ease: "expo.inOut" })
    .to(".bars i", { scaleY: 0, duration: 1.4, ease: "expo.inOut" }, "-=0.9")
    .add(() => {
      $("#intro").remove();
      document.body.classList.remove("is-loading");
      $$("[inert]").forEach((el) => el.removeAttribute("inert"));
      startFilm();
    }, "-=0.8");
}
$("#ignite").addEventListener("click", () => ignite(true));
$("#igniteMute").addEventListener("click", () => ignite(false));

// Ton
const soundBtn = $("#soundBtn");
function setSound(on) {
  soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
  $("b", soundBtn).textContent = on ? "an" : "aus";
}
soundBtn.addEventListener("click", () => { if (engine.on) { engine.stop(); setSound(false); } else { engine.start(); setSound(true); } });
document.addEventListener("visibilitychange", () => { engine.suspend(document.hidden); stage.pause(document.hidden); });

/* ---------- Der Film ---------- */
function startFilm() {
  if (!reducedMotion && finePointer) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else document.querySelector(target).scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2 || !document.querySelector(id)) return;
    e.preventDefault();
    closeMenu();
    scrollTo(id);
  }));

  setupChapters();
  setupProlog();
  setupTitles();
  setupFloats();
  setupQuiz();
  setupVow();
  setupShot();
  setupDepth();
  setupRoad();
  setupGame();
  setupReviews();
  setupSheets();
  setupBooking();
  ScrollTrigger.refresh();
}

/* Kapitel: Bühne, Kopfzeile, Fortschritt */
function setupChapters() {
  const num = $("#topNum"), name = $("#topName"), bar = $("#topBar");
  const links = $$("#menuList a");
  chapters.forEach((c, i) => {
    ScrollTrigger.create({
      trigger: c, start: "top 55%", end: "bottom 55%",
      onToggle: (self) => {
        if (!self.isActive) return;
        stage.show(c.id);
        num.textContent = c.dataset.kapitel;
        name.textContent = c.dataset.titel;
        links.forEach((l, k) => l.classList.toggle("is-current", k === i));
        gsap.fromTo([num, name], { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out" });
      }
    });
    ScrollTrigger.create({
      trigger: c, start: i === 0 ? "top top" : "top bottom", end: "bottom top",
      onUpdate: (self) => stage.progress(c.id, self.progress)
    });
  });
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => (bar.style.transform = `scaleX(${self.progress.toFixed(4)})`) });
}

/* Prolog: Satz für Satz, dann Licht */
function setupProlog() {
  const lines = $$(".prolog .prolog__line");
  const shade = $("#stageShade");
  const setDim = (v) => shade.style.setProperty("--dim", v.toFixed(3));
  if (reducedMotion) { lines.forEach((l) => (l.style.opacity = 1)); return; }
  const tl = gsap.timeline({
    scrollTrigger: { trigger: ".chapter--prolog", start: "top top", end: () => "+=" + window.innerHeight * 1.5, scrub: 0.6 }
  });
  lines.forEach((l, i) => {
    tl.fromTo(l, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, i)
      .to(l, { opacity: 0, y: -18, duration: 0.4 }, i + 0.75);
  });
  // Bühne im Prolog fast schwarz, beim „Ist es nicht.“ geht das Licht an
  setDim(0.9);
  ScrollTrigger.create({
    trigger: ".prolog__turn", start: "top 90%", end: "top 20%", scrub: true,
    onUpdate: (self) => setDim(0.9 - 0.75 * self.progress)
  });
  gsap.from(".prolog__turn > *", { y: 40, opacity: 0, duration: 1.4, stagger: 0.15, ease: "expo.out", scrollTrigger: { trigger: ".prolog__turn", start: "top 45%" } });
  // Für die übrigen Kapitel: leichte Abdunklung für Lesbarkeit
  ScrollTrigger.create({ trigger: "#ruhe", start: "top 80%", endTrigger: "#los", end: "bottom top", onToggle: (s) => s.isActive && setDim(0.45) });
  ScrollTrigger.create({ trigger: "#epilog", start: "top 60%", onEnter: () => setDim(0.25), onLeaveBack: () => setDim(0.45) });
}

/* Kapitelüberschriften fliegen herein */
function setupTitles() {
  $$(".chapter:not(.chapter--prolog) .chead").forEach((h) => {
    gsap.from($(".chead__num", h), { opacity: 0, letterSpacing: "0.6em", duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: h, start: "top 80%" } });
    gsap.from($$(".line > *", h), { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: h, start: "top 80%" } });
    if (!reducedMotion) gsap.from($(".title", h), { scale: 0.9, filter: finePointer ? "blur(10px)" : "blur(6px)", duration: 1.4, ease: "expo.out", clearProps: "filter,scale", scrollTrigger: { trigger: h, start: "top 80%" } });
  });
  $$(".story p, .story .trio li, .shot .card__cap, .promise__honest, .tool__text > *, .parts li, .faq details, .road__step, .book, .rate, .pause, .quiz, .epilog > *").forEach((el) => {
    gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
}

/* Schwebende 3D-Elemente: kippen beim Vorbeiscrollen, folgen der Maus */
function setupFloats() {
  if (reducedMotion) return;
  $$(".float3d").forEach((el) => {
    const wrap = document.createElement("div");
    wrap.className = "float3d__wrap";
    wrap.style.cssText = "transform-style:preserve-3d;will-change:transform";
    el.parentNode.insertBefore(wrap, el);
    wrap.append(el);
    gsap.fromTo(wrap, { rotateX: 16, y: 70, z: -60 }, {
      rotateX: -8, y: -50, z: 0, ease: "none",
      scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: 0.8 }
    });
  });
  if (finePointer) {
    let mx = 0, my = 0;
    window.addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
    const floats = $$(".float3d");
    gsap.ticker.add(() => floats.forEach((f) => gsap.set(f, { rotateY: mx * 10, rotateX: -my * 6 })));
  }
}

/* Farbtypen-Quiz */
function setupQuiz() {
  const body = $("#quizBody"), step = $("#quizStep");
  let i = 0;
  const score = { r: 0, y: 0, g: 0, b: 0 };
  const render = () => {
    const f = FRAGEN[i];
    step.textContent = `Frage ${i + 1} von ${FRAGEN.length}`;
    body.innerHTML = '<p class="quiz__q"></p><div class="quiz__opts"></div>';
    $(".quiz__q", body).textContent = f.q;
    // Reihenfolge der Antworten mischen, damit keine Farbe immer oben steht
    const keys = Object.keys(f.a).sort(() => Math.random() - 0.5);
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz__opt";
      b.textContent = f.a[k];
      b.addEventListener("click", () => { score[k]++; i++; i < FRAGEN.length ? render() : result(); });
      $(".quiz__opts", body).append(b);
    });
    gsap.from($$(".quiz__q, .quiz__opt", body), { y: 14, opacity: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" });
  };
  const result = () => {
    const top = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
    const t = TYPEN[top];
    step.textContent = "Dein Ergebnis";
    body.innerHTML = `<div class="quiz__result" style="--col:${t.farbe}"><div class="quiz__orb"></div><div><h4><small></small><span></span></h4><p></p><p class="quiz__so">So fahren wir zusammen. Den Rest besprechen wir in der ersten Stunde.</p><button class="quiz__again" type="button">Nochmal machen</button></div></div>`;
    $("h4 small", body).textContent = "Du bist eher " + t.name;
    $("h4 span", body).textContent = t.titel;
    $(".quiz__result p", body).textContent = t.text;
    $(".quiz__again", body).addEventListener("click", () => { i = 0; Object.keys(score).forEach((k) => (score[k] = 0)); render(); });
    gsap.from(".quiz__orb", { scale: 0, duration: 1, ease: "back.out(2)" });
    gsap.from($$(".quiz__result h4, .quiz__result p, .quiz__again", body), { y: 14, opacity: 0, duration: 0.6, stagger: 0.08 });
    try { sessionStorage.setItem("serband-farbe", t.name); } catch (e) {}
  };
  render();
}

/* Versprechen als Szene: die Stelle bleibt stehen, Serband kommt aus der Tiefe
   und wird scharf (der Hintergrund dafür unscharf), der Satz leuchtet Wort für Wort
   auf, dann schreibt sich die Unterschrift. Beim Weiterscrollen tritt er zurück. */
function setupVow() {
  const vow = $("#vow"), p = $("#promiseText");
  const words = p.textContent.trim().split(/\s+/);
  p.innerHTML = words.map((w) => `<span class="w">${w.replace(/[<>&]/g, "")}</span>`).join(" ");
  const spans = $$(".w", p);
  const photo = $("#vowPhoto");
  const frame = photo && $(".vow__frame", photo);
  const sig = $(".promise__sig span", vow);
  // stehen bleiben nur, wenn genug Höhe da ist (nicht bei Handy quer)
  if (reducedMotion || window.innerHeight < 520) { spans.forEach((s) => s.classList.add("is-lit")); return; }
  vow.classList.add("is-pinned");
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: vow, start: "top top", end: "bottom bottom", scrub: 0.6,
      onUpdate: (self) => {
        const k = self.progress;
        const n = Math.round(smooth(0.2, 0.7, k) * spans.length);
        spans.forEach((s, i) => s.classList.toggle("is-lit", i < n));
        if (photo) stage.soft("versprechen", smooth(0.04, 0.3, k) * (1 - smooth(0.9, 1, k)));
      }
    }
  });
  if (frame) {
    tl.fromTo(frame, { scale: 0.7, yPercent: 10, rotateY: -16, rotateX: 7, opacity: 0, filter: finePointer ? "blur(18px)" : "blur(8px)" },
      { scale: 1, yPercent: 0, rotateY: 0, rotateX: 0, opacity: 1, filter: "blur(0px)", duration: 0.32, ease: "power2.out" }, 0)
      .fromTo(".vow__glow", { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power1.out" }, 0.08)
      .fromTo(".vow__sheen", { x: 0, xPercent: -70 }, { x: 0, xPercent: 70, duration: 0.16, ease: "power1.inOut" }, 0.34)
      .to(frame, { scale: 0.9, yPercent: -4, opacity: 0.55, filter: finePointer ? "blur(6px)" : "blur(4px)", duration: 0.1 }, 0.9)
      .to(".vow__glow", { opacity: 0.2, duration: 0.1 }, 0.9);
  }
  tl.fromTo(sig, { clipPath: "inset(-30% 110% -30% -10%)", opacity: 0.4 }, { clipPath: "inset(-30% -30% -30% -10%)", opacity: 1, duration: 0.14, ease: "power1.inOut" }, 0.72)
    .to({}, { duration: 0.02 }, 0.98); // Zeitleiste endet genau bei 1
  // am Computer folgt das Foto leicht der Maus
  if (photo && finePointer) {
    const rx = gsap.quickTo(photo, "rotateX", { duration: 0.8, ease: "power3.out" });
    const ry = gsap.quickTo(photo, "rotateY", { duration: 0.8, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => { ry((e.clientX / innerWidth - 0.5) * 12); rx(-(e.clientY / innerHeight - 0.5) * 8); });
  }
}

/* Kapitel I: das Foto öffnet sich wie eine Blende und schwebt beim Scrollen */
function setupShot() {
  const shot = $("#shot");
  if (!shot || reducedMotion) return;
  const frame = $(".shot__frame", shot), img = $("img", shot);
  gsap.fromTo(frame, { clipPath: "inset(16% 12% 16% 12% round 30px)", filter: finePointer ? "blur(10px)" : "blur(6px)" },
    { clipPath: "inset(-40% -30% -40% -30% round 18px)", filter: "blur(0px)", ease: "none",
      scrollTrigger: { trigger: shot, start: "top 96%", end: "top 45%", scrub: 0.6 } });
  gsap.fromTo(img, { scale: 1.3, yPercent: -5 }, { scale: 1.04, yPercent: 3, ease: "none",
    scrollTrigger: { trigger: shot, start: "top bottom", end: "bottom top", scrub: true } });
}

/* Was nach oben weggeschoben wird, tritt zurück und verschwimmt.
   Am Handy nur bei wenigen Elementen, damit nichts ruckelt. */
function setupDepth() {
  if (reducedMotion) return;
  const max = finePointer ? 8 : 5;
  const sel = finePointer
    ? ".chead, .story, .tool, .deal, .road, .faq-wrap, .stimmen"
    : ".chead, .shot";
  const items = $$(sel).map((el) => [el, el, max]);
  // die bildschirmhohe Versprechen-Fläche am Handy nur ausblenden, nicht weichzeichnen
  items.push([$("#vow"), $("#vow .vow__pin"), finePointer ? max : 0]);
  items.forEach(([trigger, el, blur]) => {
    const reset = () => { el.style.filter = ""; el.style.opacity = ""; el.style.scale = ""; };
    ScrollTrigger.create({
      trigger, start: "bottom 38%", end: "bottom top", scrub: true,
      onUpdate: (s) => {
        const k = s.progress;
        if (k < 0.01) return reset();
        if (blur) el.style.filter = `blur(${(k * blur).toFixed(2)}px)`;
        el.style.opacity = (1 - k * 0.75).toFixed(3);
        el.style.scale = (1 - k * 0.06).toFixed(4);
      },
      onLeaveBack: reset
    });
  });
}

/* Dein Weg: goldene Linie wächst mit */
function setupRoad() {
  const road = $("#road");
  ScrollTrigger.create({ trigger: road, start: "top 70%", end: "bottom 60%", scrub: true, onUpdate: (s) => road.style.setProperty("--prog", s.progress.toFixed(3)) });
}

/* Kalender- und Hinweisfenster, Menü */
function setupSheets() {
  const sheet = $("#sheet"), frame = $("#sheetFrame"), consent = $("#sheetConsent");
  let lastFocus = null, currentUrl = "";
  const open = (el) => { lastFocus = document.activeElement; el.hidden = false; lenis && lenis.stop(); document.body.style.overflow = "hidden"; setTimeout(() => $(".sheet__close", el).focus(), 50); };
  const close = (el) => { el.hidden = true; lenis && lenis.start(); document.body.style.overflow = ""; lastFocus && lastFocus.focus(); };
  const loadFrame = () => { consent.hidden = true; frame.hidden = false; frame.src = currentUrl; try { sessionStorage.setItem("serband-cal-ok", "1"); } catch (e) {} };
  $$("[data-cal]").forEach((b) => b.addEventListener("click", () => {
    const auto = b.dataset.cal === "automatik";
    currentUrl = auto ? CONFIG.links.kalenderAutomatik : CONFIG.links.kalenderSchalter;
    $("#sheetKind").textContent = auto ? "Automatik" : "Schaltwagen";
    $("#sheetTitle").textContent = "Fahrstunde buchen";
    $("#sheetExt").href = currentUrl;
    let ok = false;
    try { ok = sessionStorage.getItem("serband-cal-ok") === "1"; } catch (e) {}
    if (ok) loadFrame(); else { consent.hidden = false; frame.hidden = true; frame.removeAttribute("src"); }
    open(sheet);
  }));
  $("#sheetLoad").addEventListener("click", loadFrame);
  $("#installBtn").addEventListener("click", () => open($("#installSheet")));
  $$(".sheet").forEach((s) => $$("[data-close]", s).forEach((c) => c.addEventListener("click", () => close(s))));
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; $$(".sheet").forEach((s) => { if (!s.hidden) close(s); }); closeMenu(); });
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

