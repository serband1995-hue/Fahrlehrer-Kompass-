/* ============================================================
   Fahrlehrerlaubnis-Klassen als Bleistift-Skizzen.
   Welche Klassen gezeigt werden, steht in config.js → klassen.
   Jede Klasse nennt eine Skizze aus SKIZZEN. Neue Klasse (z. B. A):
   Skizze hier ergänzen und in config.js eintragen.
   Die Striche zeichnen sich selbst, sobald die Karte ins Bild kommt.
   ============================================================ */
import { CONFIG } from "./config.js";

// ---- Skizzen (Seitenansicht, Fahrtrichtung rechts) ----
// Linien: Umriss und Details. Schraffur: dünne Striche für Scheiben und Schatten.
const AUTO = (dx = 0) => ({
  linien: [
    // Karosserie mit Radläufen
    `M${22 + dx},88 L${20 + dx},64 Q${20 + dx},56 ${28 + dx},52 L${44 + dx},40 Q${50 + dx},35 ${60 + dx},34 L${150 + dx},33 Q${158 + dx},33 ${164 + dx},38 L${184 + dx},54 L${220 + dx},60 Q${232 + dx},62 ${234 + dx},72 L${236 + dx},86 Q${236 + dx},90 ${230 + dx},90 L${210 + dx},90 A18,18 0 0 0 ${174 + dx},90 L${78 + dx},90 A18,18 0 0 0 ${42 + dx},90 L${26 + dx},90 Q${22 + dx},90 ${22 + dx},88`,
    // Seitenscheiben
    `M${50 + dx},52 L${62 + dx},40 Q${66 + dx},38 ${72 + dx},38 L${104 + dx},38 L${104 + dx},52 Z`,
    `M${110 + dx},38 L${148 + dx},38 Q${154 + dx},38 ${158 + dx},42 L${170 + dx},52 L${110 + dx},52 Z`,
    // Türen, Griffe, Zierlinie
    `M${107 + dx},56 L${107 + dx},86`, `M${162 + dx},56 Q${165 + dx},70 ${163 + dx},86`,
    `M${88 + dx},61 L${97 + dx},61`, `M${142 + dx},61 L${151 + dx},61`,
    `M${26 + dx},71 Q${130 + dx},68 ${233 + dx},75`,
    // Scheinwerfer, Rücklicht, Spiegel
    `M${218 + dx},63 L${231 + dx},66 L${232 + dx},70 L${220 + dx},68 Z`,
    `M${21 + dx},57 L${28 + dx},55 L${28 + dx},64 L${21 + dx},65`,
    `M${166 + dx},48 L${175 + dx},46 L${176 + dx},52 L${168 + dx},53`
  ],
  kreise: [[60 + dx, 92, 14], [60 + dx, 92, 6], [192 + dx, 92, 14], [192 + dx, 92, 6]],
  speichen: [[60 + dx, 92], [192 + dx, 92]],
  schraffur: [
    `M${50 + dx},52 L${62 + dx},40 Q${66 + dx},38 ${72 + dx},38 L${104 + dx},38 L${104 + dx},52 Z`,
    `M${110 + dx},38 L${148 + dx},38 Q${154 + dx},38 ${158 + dx},42 L${170 + dx},52 L${110 + dx},52 Z`
  ],
  schatten: [[126 + dx, 107, 104, 4]]
});

function anhaenger() {
  const a = AUTO(130);
  a.linien.unshift(
    // Kasten mit Bordwand-Brettern
    "M12,46 L112,46 L112,84 L12,84 Z", "M12,52 L112,52",
    "M37,52 L37,84", "M62,52 L62,84", "M87,52 L87,84",
    // Kotflügel, Deichsel, Stützrad, Rücklicht
    "M44,84 A18,18 0 0 1 80,84",
    "M112,78 L150,86", "M100,84 L112,78",
    "M128,82 L128,98",
    "M12,62 L18,62 L18,68 L12,68"
  );
  a.kreise.unshift([62, 94, 12], [62, 94, 5], [128, 101, 3], [152, 86, 2.2]);
  a.speichen.unshift([62, 94]);
  a.schatten.unshift([62, 107, 58, 3.5]);
  return a;
}

const SKIZZEN = {
  auto: { w: 250, h: 116, teile: () => AUTO(0) },
  anhaenger: { w: 380, h: 116, teile: anhaenger }
};

let nr = 0;
function svg(name) {
  const s = SKIZZEN[name];
  if (!s) return "";
  const t = s.teile(), id = "k" + ++nr;
  let i = 0;
  const strich = (d) => `<path d="${d}" pathLength="1" style="--i:${i++}"/>`;
  const kreis = ([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" pathLength="1" style="--i:${i++}"/>`;
  const speichen = ([x, y]) => [0, 60, 120].map((g) => {
    const a = (g * Math.PI) / 180, dx = Math.cos(a) * 11, dy = Math.sin(a) * 11;
    return strich(`M${(x - dx).toFixed(1)},${(y - dy).toFixed(1)} L${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`);
  }).join("");
  const linien = t.linien.map(strich).join("") + t.kreise.map(kreis).join("") + t.speichen.map(speichen).join("");
  // Schraffur: schräge Striche, auf die Scheiben zugeschnitten
  let hatch = "";
  for (let x = -120; x < s.w; x += 4.5) hatch += `M${x},0 L${x + 70},${s.h}`;
  const boden = `M4,${s.h - 8} L${s.w - 6},${s.h - 9}` + ` M${s.w * 0.1},${s.h - 4} L${s.w * 0.24},${s.h - 4}` + ` M${s.w * 0.62},${s.h - 3} L${s.w * 0.8},${s.h - 3}`;
  const schatten = t.schatten.map(([cx, cy, rx, ry]) => {
    let d = "";
    for (let x = cx - rx; x <= cx + rx; x += 3) { const k = 1 - ((x - cx) / rx) ** 2; d += `M${x},${cy - ry * Math.sqrt(k)} L${x + 3},${cy + ry * Math.sqrt(k)}`; }
    return d;
  }).join("");
  return `<svg viewBox="0 26 ${s.w} ${s.h - 26}" role="img" aria-hidden="true" focusable="false">
    <defs>
      <filter id="${id}f1" x="-4%" y="-8%" width="108%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="w"/>
        <feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="7" result="k"/>
        <feColorMatrix in="k" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.45" result="km"/>
        <feComposite in="d" in2="km" operator="in"/>
      </filter>
      <filter id="${id}f2" x="-4%" y="-8%" width="108%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="w"/>
        <feDisplacementMap in="SourceGraphic" in2="w" scale="3" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="2" result="k"/>
        <feColorMatrix in="k" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.4" result="km"/>
        <feComposite in="d" in2="km" operator="in"/>
      </filter>
      <clipPath id="${id}c">${t.schraffur.map((d) => `<path d="${d}"/>`).join("")}</clipPath>
    </defs>
    <g class="skizze__schraffur" filter="url(#${id}f2)">
      <path clip-path="url(#${id}c)" d="${hatch}"/>
      <path d="${schatten}"/>
    </g>
    <g class="skizze__boden" filter="url(#${id}f2)"><path d="${boden}" pathLength="1" style="--i:0"/></g>
    <g class="skizze__linien" filter="url(#${id}f1)">${linien}</g>
    <g class="skizze__linien skizze__linien--zwei" filter="url(#${id}f2)" transform="translate(.7 -.5)">${linien}</g>
  </svg>`;
}

// „B und BE“ bzw. „B, BE und A“
const liste = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " und " + a[a.length - 1] : a[0] || "");

export function klassenZeichnen() {
  const kl = (CONFIG.klassen || []).filter((k) => SKIZZEN[k.skizze]);
  document.querySelectorAll("[data-klassen-text]").forEach((el) => { if (kl.length) el.textContent = liste(kl.map((k) => k.klasse)); });
  const boxen = document.querySelectorAll("[data-klassen]");
  if (!kl.length) { boxen.forEach((b) => b.remove()); return; }
  const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  boxen.forEach((box) => {
    box.innerHTML = kl.map((k) => `<figure class="klasse klasse--${k.skizze}">
      ${svg(k.skizze)}
      <figcaption><b>Klasse ${k.klasse}</b><span class="sr-only"> – ${k.name}</span></figcaption>
    </figure>`).join("");
    const karten = box.querySelectorAll(".klasse");
    if (ruhig || !("IntersectionObserver" in window)) { karten.forEach((k) => k.classList.add("is-gezeichnet")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-gezeichnet");
      io.unobserve(e.target);
    }), { threshold: 0.35 });
    karten.forEach((k) => io.observe(k));
  });
}

klassenZeichnen();
