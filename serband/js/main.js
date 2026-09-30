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
  setHref("reviewsLink", L.bewertungen || L.bewerten);
  setHref("priceLink", L.preise);
  setHref("waLink", L.whatsapp);
  // Links ohne Ziel (leer in der Konfiguration) nicht zeigen – sonst öffnet sich die Seite selbst
  $$('a[target="_blank"][href="#"]:not(#sheetExt)').forEach((a) => (a.hidden = true));
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
    const set = f.klein ? `${f.klein} ${f.kleinBreite}w, ${src} ${f.breite}w` : null;
    if (img.getAttribute("src") === (f.klein || src) && img.getAttribute("srcset") === set) return;
    if (set) img.srcset = set;
    else img.removeAttribute("srcset");
    img.src = f.klein || src;
  });
  if (!$("#vowPhoto")) $("#vow").classList.add("vow--text");
  // Sprachen der Fahr-Akademie aus der Konfiguration („A, B und C“)
  const sp = CONFIG.sprachen || [];
  if (sp.length) $$("[data-sprachen]").forEach((el) => { const w = sp.map((x) => "\u2068" + x + "\u2069"); el.textContent = w.length > 1 ? w.slice(0, -1).join(", ") + " und " + w[w.length - 1] : w[0]; });
  if (!CONFIG.bewertungen.some((b) => !b.platzhalter)) $("#stimmen").remove();
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
      setTimeout(() => { if (!on) ctx.suspend(); }, 800); // stumm heißt auch: nichts rechnen
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
  // gleiche Grenzen wie die Bestenliste auf dem Server: darunter geraten, darüber abgelenkt
  const MIN_MS = 100, MAX_MS = 1500;
  let state = "idle", timer = null, t0 = 0, swallow = false;
  const best = parseInt(store.get("serband-best") || "", 10);
  if (best >= MIN_MS && best <= MAX_MS) bEl.textContent = best + " ms";
  const reset = () => lamps.forEach((l) => (l.className = "light__lamp"));
  const verdict = (ms) => ms < 230 ? "Blitzreflex!" : ms < 300 ? "Sehr stark!" : ms < 400 ? "Solide!" : "Nochmal, ganz ruhig";
  const shake = () => gsap.fromTo(btn, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1, .3)" });
  const go = () => {
    state = "wait";
    hideEntry();
    reset();
    msg.textContent = "Warte auf Grün …";
    lamps[0].classList.add("red");
    timer = setTimeout(() => {
      lamps[1].classList.add("amber");
      timer = setTimeout(() => {
        reset();
        lamps[2].classList.add("green");
        state = "go";
        msg.textContent = "JETZT!";
        t0 = performance.now();
        // gemessen wird ab dem Bild, in dem das Grün wirklich zu sehen ist
        const armed = t0;
        requestAnimationFrame(() => requestAnimationFrame(() => { if (state === "go" && t0 === armed) t0 = performance.now(); }));
      }, 600 + Math.random() * 2200);
    }, 900);
  };
  const press = (at) => {
    if (state === "wait") {
      clearTimeout(timer);
      reset();
      lamps[0].classList.add("red");
      state = "done";
      msg.textContent = "Zu früh! Nochmal?";
      tEl.textContent = "Rot!";
      dEl.textContent = "–";
      shake();
      return;
    }
    if (state !== "go") return;
    const ms = Math.round(at - t0);
    state = "done";
    if (ms < MIN_MS) {
      // schneller als ein Mensch reagieren kann: das war geraten
      reset();
      lamps[0].classList.add("red");
      msg.textContent = "Geraten! Nochmal?";
      tEl.textContent = "Rot!";
      dEl.textContent = "–";
      shake();
      return;
    }
    tEl.textContent = ms + " ms";
    const dist = (50 / 3.6) * (ms / 1000);
    dEl.textContent = dist.toFixed(1).replace(".", ",") + " m";
    if (ms > MAX_MS) { msg.textContent = "Abgelenkt? Nochmal!"; return; }
    msg.textContent = verdict(ms) + " Nochmal?";
    showEntry(ms);
    const prev = parseInt(store.get("serband-best") || "", 10);
    if (!(prev >= MIN_MS && prev <= MAX_MS) || ms < prev) {
      store.set("serband-best", ms);
      bEl.textContent = ms + " ms";
      gsap.fromTo(bEl, { scale: 1.4, color: "#8fe6bf" }, { scale: 1, color: "#f1dca6", duration: 0.8, ease: "back.out(2)" });
    }
  };
  // Eintragen in die Bestenliste
  const form = $("#entry"), input = $("#entryName"), note = $("#entryMsg"), sendBtn = $("button", form);
  let lastMs = 0, hideTimer = 0;
  input.value = board.me;
  function hideEntry() { clearTimeout(hideTimer); form.hidden = true; lastMs = 0; }
  function showEntry(ms) {
    clearTimeout(hideTimer);
    lastMs = ms;
    note.textContent = "";
    sendBtn.disabled = false;
    form.hidden = false;
    $("label", form).textContent = `${ms} ms – ${verdict(ms)} Trag dich in die Bestenliste ein:`;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!lastMs || sendBtn.disabled) return;
    const name = input.value.trim(), ms = lastMs;
    sendBtn.disabled = true;
    try {
      const platz = await board.submit(name, ms);
      lastMs = 0; // diese Zeit ist eingetragen – kein zweites Mal
      note.textContent = platz <= 5 ? `Du bist auf Platz ${platz}!` : `Eingetragen – dein Platz: ${platz}. Für die Top 5 geht noch was.`;
      hideTimer = setTimeout(() => (form.hidden = true), 2600);
    } catch (err) {
      note.textContent = board.texte[err.message] || "Das hat nicht geklappt. Bitte später nochmal.";
      sendBtn.disabled = false;
    }
  });
  ScrollTrigger.create({ trigger: "#test", start: "top bottom", once: true, onEnter: () => board.load() });

  // Messen beim Aufsetzen des Fingers (genau), Starten erst beim Tippen (click) –
  // so startet ein Wischen über die Ampel beim Scrollen keinen Test.
  // swallow: dieser Tipp wurde schon beim Aufsetzen gewertet, sein click startet nicht neu
  btn.addEventListener("pointerdown", (e) => {
    swallow = false;
    if (e.button !== 0 || (state !== "wait" && state !== "go")) return;
    e.preventDefault();
    swallow = true;
    press(e.timeStamp || performance.now());
  });
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (swallow) { swallow = false; return; }
    if (state === "idle" || state === "done") go();
    else press(e.timeStamp || performance.now());
  });
  // Tastatur: sofort beim Drücken werten; gehaltene Taste zählt nicht als neue Eingabe
  btn.addEventListener("keydown", (e) => {
    if (e.repeat) { e.preventDefault(); return; }
    if (e.key !== " " && e.key !== "Enter") return;
    swallow = false;
    if (state === "wait" || state === "go") {
      e.preventDefault();
      swallow = true;
      press(e.timeStamp || performance.now());
    }
  });
}

/* ---------- Bewertungen: Laufband ----------
   Zwei Reihen gegenläufig (am Handy eine). Jede Reihe enthält die Karten doppelt,
   damit sie ohne Sprung endlos läuft. Anfassen, Maus darüber oder Tastatur-Fokus
   hält sie an; ziehen/wischen geht auch. Bei „Bewegung reduzieren“: normale Wischliste. */
function setupReviews() {
  const box = $("#reviews");
  const list = CONFIG.bewertungen.filter((b) => !b.platzhalter && b.text);
  if (!box || !list.length) return;
  const card = (b, i) => {
    const el = document.createElement("article");
    el.className = "review";
    el.innerHTML = `<div class="review__stars" role="img" aria-label="5 von 5 Sternen">★★★★★</div>
      <p class="review__text"></p>
      <button class="review__more" type="button">Ganze Bewertung lesen</button>
      <div class="review__who"><i aria-hidden="true"></i><div><span></span><small>Google-Bewertung</small></div></div>`;
    // auf der Karte als Fließtext (spart Zeilen), im Fenster mit Absätzen
    $(".review__text", el).textContent = b.text.replace(/\s*\n\s*/g, " ");
    $(".review__who span", el).textContent = b.name;
    $(".review__who i", el).textContent = (b.name || "?").trim().charAt(0).toUpperCase();
    el.dataset.i = i;
    return el;
  };
  const wide = matchMedia("(min-width: 760px)");
  let rows = [];

  function build() {
    rows = [];
    box.replaceChildren();
    const n = wide.matches && list.length > 5 ? 2 : 1;
    for (let r = 0; r < n; r++) {
      const items = list.map((b, i) => [b, i]).filter((_, i) => i % n === r);
      const row = document.createElement("div");
      row.className = "reviews__row";
      const rail = document.createElement("div");
      rail.className = "reviews__rail";
      items.forEach(([b, i]) => rail.append(card(b, i)));
      if (!reducedMotion) {
        // zweite Hälfte nur fürs endlose Laufen: unsichtbar für Vorleser und Tab-Taste
        items.forEach(([b, i]) => { const c = card(b, i); c.setAttribute("aria-hidden", "true"); c.inert = true; c.classList.add("is-copy"); rail.append(c); });
      }
      row.append(rail);
      // Fokus darf die Reihe nicht selbst verschieben – das macht die Laufband-Position
      if (!reducedMotion) row.addEventListener("scroll", () => (row.scrollLeft = 0));
      box.append(row);
      rows.push({ row, rail, x: 0, vx: 0, dir: r % 2 ? 1 : -1, w: 0, hover: false, focus: false, until: 0, drag: null });
    }
    measure();
  }

  // Breite einer Hälfte; lange Texte bekommen „Ganze Bewertung lesen“
  function measure() {
    rows.forEach((o) => {
      const cards = $$(".review", o.rail), half = cards.length / 2;
      o.w = reducedMotion || !half ? 0 : cards[half].offsetLeft - cards[0].offsetLeft;
      if (o.dir > 0 && o.w && o.x === 0) o.x = -o.w; // rechtslaufende Reihe startet versetzt
    });
    $$(".review", box).forEach((c) => {
      const t = $(".review__text", c);
      c.classList.toggle("is-long", t.scrollHeight > t.clientHeight + 2);
    });
  }

  // Tippen auf eine Karte öffnet die ganze Bewertung (nicht nach dem Ziehen)
  box.addEventListener("click", (e) => {
    const c = e.target.closest(".review");
    if (!c || !c.classList.contains("is-long")) return;
    const o = rows.find((r) => r.row.contains(c));
    if (o && o.moved > 6) return;
    const b = list[+c.dataset.i];
    $("#reviewTitle").textContent = b.name;
    $("#reviewFull").textContent = b.text;
    $("#reviewSheet .sheet__body").scrollTop = 0;
    openSheet($("#reviewSheet"));
  });

  if (!reducedMotion) {
    const rowOf = (el) => rows.find((r) => r.row.contains(el));
    box.addEventListener("pointerover", (e) => { const o = rowOf(e.target); if (o && e.pointerType === "mouse") o.hover = true; });
    box.addEventListener("pointerout", (e) => { const o = rowOf(e.target); if (o && e.pointerType === "mouse" && !o.row.contains(e.relatedTarget)) o.hover = false; });
    box.addEventListener("pointerdown", (e) => {
      const o = rowOf(e.target);
      if (!o || e.button > 0) return;
      o.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, pos: o.x, last: e.clientX, on: false };
      o.moved = 0; o.vx = 0;
    });
    box.addEventListener("pointermove", (e) => {
      const o = rows.find((r) => r.drag && r.drag.id === e.pointerId);
      if (!o) return;
      const d = o.drag, dx = e.clientX - d.x0;
      if (!d.on) {
        // erst waagerecht ziehen, dann festhalten – senkrecht bleibt normales Scrollen
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - d.y0)) return;
        d.on = true;
        try { o.row.setPointerCapture(e.pointerId); } catch (err) {}
        o.row.classList.add("is-drag");
      }
      o.vx = e.clientX - d.last; d.last = e.clientX;
      o.moved = Math.abs(dx);
      o.x = d.pos + dx;
    });
    const up = (e) => {
      const o = rows.find((r) => r.drag && r.drag.id === e.pointerId);
      if (!o) return;
      o.drag = null;
      o.row.classList.remove("is-drag");
      o.until = performance.now() + (e.pointerType === "mouse" ? 0 : 1800); // nach dem Wischen kurz stehen lassen
      setTimeout(() => (o.moved = 0), 0);
    };
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
    // Tastatur: fokussierte Karte ins Bild holen und die Reihe anhalten
    box.addEventListener("focusin", (e) => {
      const o = rowOf(e.target), c = e.target.closest(".review");
      if (!o || !c) return;
      o.focus = true;
      o.row.scrollLeft = 0;
      const left = c.offsetLeft + o.x, room = o.row.clientWidth - c.offsetWidth;
      if (left < 16 || left > room - 16) o.x = -c.offsetLeft + Math.max(16, room / 2);
    });
    box.addEventListener("focusout", (e) => { const o = rowOf(e.target); if (o && !o.row.contains(e.relatedTarget)) o.focus = false; });

    let visible = false, last = 0;
    new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(box);
    gsap.ticker.add(() => {
      const now = performance.now(), dt = Math.min(64, now - (last || now)); last = now;
      if (!visible) return;
      const halt = !$("#reviewSheet").hidden;
      rows.forEach((o) => {
        if (!o.w) return;
        if (!o.drag) {
          o.x += o.vx; o.vx *= 0.92;
          if (!o.hover && !o.focus && !halt && now > o.until && Math.abs(o.vx) < 0.3) o.x += o.dir * 0.028 * dt; // rund 28 px pro Sekunde
        }
        // endlos: immer innerhalb einer Hälfte bleiben
        while (o.x > 0) o.x -= o.w;
        while (o.x <= -o.w) o.x += o.w;
        if (o.drag && o.drag.on) o.drag.pos = o.x - (o.drag.last - o.drag.x0);
        o.rail.style.transform = `translate3d(${o.x.toFixed(2)}px,0,0)`;
      });
    });
  }

  build();
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(measure, 150); });
  wide.addEventListener ? wide.addEventListener("change", build) : wide.addListener(build);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  gsap.from(box, { opacity: 0, y: 40, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: box, start: "top 90%" } });
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
  if (withSound) { try { engine.start(); setSound(true); } catch (e) {} }
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
    const id = a.getAttribute("href") || "";
    if (id[0] !== "#" || id.length < 2) return; // z. B. „In neuem Tab“ zeigt inzwischen auf eine Adresse
    let target = null;
    try { target = document.querySelector(id); } catch (err) {}
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollTo(id);
  }));

  setupChapters();
  setupProlog();
  setupTitles();
  setupFloats();
  setupTour();
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
    // gleicher Bereich wie oben: Anfang und Ende jedes Videos sind so auch zu sehen
    ScrollTrigger.create({
      trigger: c, start: i === 0 ? "top top" : "top 55%", end: i === chapters.length - 1 ? "bottom bottom" : "bottom 55%",
      onUpdate: (self) => stage.progress(c.id, self.progress),
      onRefresh: (self) => stage.progress(c.id, self.progress)
    });
  });
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: (self) => (bar.style.transform = `scaleX(${self.progress.toFixed(4)})`) });
}

/* Prolog: Satz für Satz, dann Licht */
function setupProlog() {
  const lines = $$(".prolog .prolog__line");
  const shade = $("#stageShade");
  const setDim = (v) => shade.style.setProperty("--dim", v.toFixed(3));
  // Abdunklung der Bühne aus der Scrollposition berechnet – stimmt auch nach Neuladen,
  // bei Direktlinks und in beide Richtungen: Prolog fast schwarz, bei „Ist es nicht.“
  // geht das Licht an, in den Kapiteln leicht abgedunkelt, im Epilog heller.
  const turn = $(".prolog__turn"), ruhe = $("#ruhe"), epilog = $("#epilog");
  const dim = () => {
    const vh = window.innerHeight;
    if (epilog.getBoundingClientRect().top <= vh * 0.6) return 0.25;
    if (ruhe.getBoundingClientRect().top <= vh * 0.8) return 0.45;
    return 0.9 - 0.75 * clamp((vh * 0.9 - turn.getBoundingClientRect().top) / (vh * 0.7), 0, 1);
  };
  const update = () => setDim(dim());
  update();
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: update, onRefresh: update });
  if (reducedMotion) { lines.forEach((l) => (l.style.opacity = 1)); return; }
  const tl = gsap.timeline({
    scrollTrigger: { trigger: ".chapter--prolog", start: "top top", end: () => "+=" + window.innerHeight * 1.5, scrub: 0.6 }
  });
  lines.forEach((l, i) => {
    // die erste Zeile steht schon da, wenn sich der Vorhang öffnet
    if (i === 0) gsap.set(l, { opacity: 1, y: 0 });
    else tl.fromTo(l, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, i);
    tl.to(l, { opacity: 0, y: -18, duration: 0.4 }, i + 0.75);
  });
  gsap.from(".prolog__turn > *", { y: 40, opacity: 0, duration: 1.4, stagger: 0.15, ease: "expo.out", scrollTrigger: { trigger: ".prolog__turn", start: "top 45%" } });
}

/* Kapitelüberschriften fliegen herein */
function setupTitles() {
  $$(".chapter:not(.chapter--prolog) .chead").forEach((h) => {
    gsap.from($(".chead__num", h), { opacity: 0, letterSpacing: "0.6em", duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: h, start: "top 80%" } });
    gsap.from($$(".line > *", h), { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: h, start: "top 80%" } });
    if (!reducedMotion) gsap.from($(".title", h), { scale: 0.9, filter: finePointer ? "blur(10px)" : "blur(6px)", duration: 1.4, ease: "expo.out", clearProps: "filter,scale", scrollTrigger: { trigger: h, start: "top 80%" } });
  });
  $$(".story p, .story .trio li, .shot .card__cap, .promise__honest, .tour__intro > *, .tour__cta, .faq details, .road__step, .book, .rate, .pause, .quiz, .epilog > *").forEach((el) => {
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

/* App-Tour (Kapitel IV): der Schritt in der Bildschirmmitte bestimmt das Bild im Handy */
function setupTour() {
  const tour = $("#tour");
  if (!tour) return;
  const steps = $$(".tour__step", tour), shots = $$(".tour__shot", tour), dots = $$("#tourDots i"), label = $("#tourLabel");
  const names = { kompass: "Fahrlehrer-Kompass", akademie: "Fahr-Akademie" };
  let cur = -1;
  const set = (i) => {
    if (i === cur) return;
    cur = i;
    shots.forEach((s, k) => s.classList.toggle("is-on", k === i));
    dots.forEach((d, k) => d.classList.toggle("is-on", k === i));
    steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
    label.textContent = names[steps[i].dataset.app] || "";
    // nächstes Bild schon laden, damit der Wechsel ohne Lücke klappt
    [shots[i], shots[i + 1]].forEach((s) => { if (s) s.loading = "eager"; });
  };
  set(0);
  steps.forEach((s, i) => ScrollTrigger.create({
    trigger: s, start: "top 55%", end: "bottom 55%",
    onToggle: (st) => st.isActive && set(i)
  }));
  // am Handy: Bild je Schritt kommt leicht vergrößert herein
  if (!reducedMotion) $$(".tour__inline .device", tour).forEach((d) => {
    gsap.fromTo(d, { scale: 0.9, rotateX: 10, opacity: 0.4 }, { scale: 1, rotateX: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: d, start: "top bottom", end: "top 45%", scrub: 0.6 } });
  });
}

/* Farbtypen-Quiz */
function setupQuiz() {
  const body = $("#quizBody"), step = $("#quizStep");
  let i = 0, last = null, lockUntil = 0;
  const score = { r: 0, y: 0, g: 0, b: 0 };
  // gleichmäßig mischen (Fisher-Yates) – sort(Math.random) bevorzugt bestimmte Plätze
  const shuffle = (a) => { for (let j = a.length - 1; j > 0; j--) { const r = Math.floor(Math.random() * (j + 1)); [a[j], a[r]] = [a[r], a[j]]; } return a; };
  const render = () => {
    lockUntil = performance.now() + 350; // ein Doppeltipp überspringt keine Frage
    const f = FRAGEN[i];
    step.textContent = `Frage ${i + 1} von ${FRAGEN.length}`;
    body.innerHTML = '<p class="quiz__q"></p><div class="quiz__opts"></div>';
    $(".quiz__q", body).textContent = f.q;
    // Reihenfolge der Antworten mischen, damit keine Farbe immer oben steht
    const keys = shuffle(Object.keys(f.a));
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz__opt";
      b.textContent = f.a[k];
      b.addEventListener("click", () => {
        if (performance.now() < lockUntil) return;
        lockUntil = Infinity;
        score[k]++; last = k; i++;
        i < FRAGEN.length ? render() : result();
      });
      $(".quiz__opts", body).append(b);
    });
    gsap.from($$(".quiz__q, .quiz__opt", body), { y: 14, opacity: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" });
  };
  const result = () => {
    // Gleichstand: die zuletzt gewählte der gleichauf liegenden Farben (nicht immer Rot)
    const max = Math.max(...Object.values(score));
    const tied = Object.keys(score).filter((k) => score[k] === max);
    const top = tied.length === 1 ? tied[0] : tied.includes(last) ? last : tied[Math.floor(Math.random() * tied.length)];
    const t = TYPEN[top];
    step.textContent = "Dein Ergebnis";
    body.innerHTML = `<div class="quiz__result" style="--col:${t.farbe}"><div class="quiz__orb"></div><div><h4><small></small><span></span></h4><p></p><p class="quiz__so">So fahren wir zusammen. Den Rest besprechen wir in der ersten Stunde.</p><button class="quiz__again" type="button">Nochmal machen</button></div></div>`;
    $("h4 small", body).textContent = "Du bist eher " + t.name;
    $("h4 span", body).textContent = t.titel;
    $(".quiz__result p", body).textContent = t.text;
    $(".quiz__again", body).addEventListener("click", () => { i = 0; last = null; Object.keys(score).forEach((k) => (score[k] = 0)); render(); });
    gsap.from(".quiz__orb", { scale: 0, duration: 1, ease: "back.out(2)" });
    gsap.from($$(".quiz__result h4, .quiz__result p, .quiz__again", body), { y: 14, opacity: 0, duration: 0.6, stagger: 0.08 });
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
  // wird das Handy nach dem Laden quer gedreht, entfällt das Stehenbleiben (CSS);
  // dann die Szene fertig zeigen statt halb eingeblendet
  const flach = matchMedia("(max-height: 519px)");
  const onFlach = () => {
    if (flach.matches) {
      tl.scrollTrigger.disable(false);
      tl.progress(0.86);
      spans.forEach((s) => s.classList.add("is-lit"));
      if (photo) stage.soft("versprechen", 0);
    } else tl.scrollTrigger.enable();
  };
  flach.addEventListener("change", onFlach);
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
    ? ".chead, .story, .tour__intro, .deal, .road, .faq-wrap, .stimmen"
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
let openSheet = () => {};
function setupSheets() {
  const sheet = $("#sheet"), frame = $("#sheetFrame"), consent = $("#sheetConsent");
  let lastFocus = null, currentUrl = "";
  const open = (el) => { lastFocus = document.activeElement; el.hidden = false; lockScroll(true); setTimeout(() => $(".sheet__close", el).focus(), 50); };
  const close = (el) => { el.hidden = true; lockScroll(menuOpen()); lastFocus && lastFocus.focus(); };
  // gleiche Adresse nicht neu laden – ein angefangener Buchungsvorgang bleibt erhalten
  const loadFrame = () => { consent.hidden = true; frame.hidden = false; if (frame.getAttribute("src") !== currentUrl) frame.src = currentUrl; try { sessionStorage.setItem("serband-cal-ok", "1"); } catch (e) {} };
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
  openSheet = open;
  $("#sheetLoad").addEventListener("click", loadFrame);
  $("#installBtn").addEventListener("click", () => open($("#installSheet")));
  $$(".sheet").forEach((s) => $$("[data-close]", s).forEach((c) => c.addEventListener("click", () => close(s))));
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; $$(".sheet").forEach((s) => { if (!s.hidden) close(s); }); closeMenu(); });
  $("#menuBtn").addEventListener("click", () => setMenu(!menuOpen()));
}
const menuOpen = () => $("#menu").classList.contains("is-open");
const sheetOpen = () => $$(".sheet").some((s) => !s.hidden);
// Seite hinter Menü oder Fenster festhalten (auch am Handy ohne Lenis)
function lockScroll(on) {
  document.body.style.overflow = on ? "hidden" : "";
  if (lenis) on ? lenis.stop() : lenis.start();
}
function setMenu(openNow) {
  const m = $("#menu");
  m.classList.toggle("is-open", openNow);
  m.setAttribute("aria-hidden", openNow ? "false" : "true");
  $("#menuBtn").setAttribute("aria-expanded", openNow ? "true" : "false");
  // Tab-Taste bleibt im Menü statt im verdeckten Inhalt
  $("main").toggleAttribute("inert", openNow);
  lockScroll(openNow || sheetOpen());
}
function closeMenu() {
  if (menuOpen()) setMenu(false);
}

