// Lernszenen Block 6 (c): einbahn, fahrradstrasse, verkehrsberuhigt, einfahrt_verboten.
// Prüft: Szenen registriert, 4–6 Phasen, mindestens 2 Fragen, Fragen gültig, Sprechtexte ≤ 200 Zeichen ohne Ziffern/Klammern/Doppelpunkte/Striche,
// Fahrzeuge kollidieren nicht und bleiben auf der Fahrbahn, Schilder 0,5 m neben der Fahrbahn (nicht darauf), jede Phase erreichbar,
// Fokus-Fahrzeug im Bild, 3D und Oben zeichnen, keine Konsolenfehler.
// (Flag schilderNeu entfallen: seit 17.11. zeichnen alle Szenen ihre Schilder nach Vorlage; Aufstellung prüft lernszenen-schild-test.mjs)
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-neu-c-test.mjs [--bilder ORDNER]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "index.html" : p)); res.writeHead(200, { "Content-Type": TYPES[extname(p === "/" ? "index.html" : p)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const bi = process.argv.indexOf("--bilder"), BILDER = bi > 0 ? process.argv[bi + 1] : null;
if (BILDER) await mkdir(BILDER, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const IDS = ["einbahn", "fahrradstrasse", "verkehrsberuhigt", "einfahrt_verboten"];
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
const setze = (page, v) => page.evaluate(v => { const sl = document.querySelector("#lzSlider"); sl.value = v; sl.dispatchEvent(new Event("input")); }, v);

// ------------------------------------------------------------ Inhalt und Geometrie (einmal, ohne Ansicht)
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } }), page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const erg = await page.evaluate(ids => {
    const L = window.Lernszenen, T = L._intern.TYPEN, roh = L._intern.rohPos, out = [];
    const STRASSE = new Set(["asphalt", "asphalt2", "pflaster", "parken", "weiss", "sperr"]);
    const drin = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
    const oben = (st, p) => { let a = null; st.flaechen.forEach(f => { if (drin(p, f.poly)) a = f.art; }); return a; };   // oberste Fläche an diesem Punkt
    const ecken = (q, l, b) => { const c = Math.cos(q.h), s = Math.sin(q.h); return [[l, b], [l, -b], [-l, -b], [-l, b]].map(([u, v]) => [q.x + c * u - s * v, q.y + s * u + c * v]); };
    const trennt = (A, B) => { for (const P of [A, B]) for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4], nx = a[1] - b[1], ny = b[0] - a[0]; const pa = A.map(p => p[0] * nx + p[1] * ny), pb = B.map(p => p[0] * nx + p[1] * ny); if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return true; } return false; };
    for (const id of ids) {
      const s = L._szenen.find(x => x.id === id), r = { id, fehler: [] };
      if (!s) { r.fehler.push("nicht registriert"); out.push(r); continue; }
      const F = (c, t) => { if (!c) r.fehler.push(t); };
      F(s.kategorie === "innerorts", "kategorie"); F(s.titel && s.kurz && Array.isArray(s.plan), "titel/kurz/plan");
      F(s.phasen.length >= 4 && s.phasen.length <= 6, "Phasenzahl " + s.phasen.length);
      F(s.phasen.filter(p => p.frage).length >= 2, "weniger als 2 Fragen");
      s.phasen.forEach((p, i) => {
        F(i === 0 || p.t > s.phasen[i - 1].t + 1.5, `Phase ${i} zu dicht/falsch sortiert (${p.t.toFixed(2)})`); F(p.t < s.dauer - 1.5, `Phase ${i} zu spät`);
        F(p.text.length <= 200, `Text ${i} ${p.text.length} Zeichen`); F(!/[\d():;\-–—\/]/.test(p.text), `Text ${i} mit Ziffer/Klammer/Doppelpunkt/Strich`);
        F(p.regel && p.titel, `Phase ${i} ohne regel/titel`);
        if (p.frage) { const q = p.frage; F(q.optionen.length === 3 && q.richtig >= 0 && q.richtig < 3 && q.erklaerung, `Frage ${i} ungültig`); F(!/\d/.test(q.text + q.optionen.join("") + q.erklaerung), `Frage ${i} mit Ziffer`); F(q.optionen.every(o => /\b(ich|mir|mich|mein)\b/i.test(o) || /^(ja|nein|nur|der|das|die|am|an|vor|wer)\b/i.test(o)), `Frage ${i}: Antwort nicht in Ich-Form`); }
      });
      const fz = s.fahrzeuge, st = s.strasse, bb = st.flaechen[0].poly, x0 = Math.min(...bb.map(p => p[0])) + 1, x1 = Math.max(...bb.map(p => p[0])) - 1, y0 = Math.min(...bb.map(p => p[1])) + 1, y1 = Math.max(...bb.map(p => p[1])) - 1;
      const imBild = p => p[0] > x0 && p[0] < x1 && p[1] > y0 && p[1] < y1;
      let kol = null, weg = null;
      for (let t = 0; t <= s.dauer; t += 0.1) {
        const lage = fz.map(f => { const T0 = T[f.typ] || T.pkw, q = roh(f, t); return { f, q, P: ecken(q, T0.l / 2 - 0.05, T0.b / 2 - 0.05), person: !!T0.person }; });
        for (let i = 0; i < lage.length; i++) for (let j = i + 1; j < lage.length; j++) {
          const A = lage[i], B = lage[j]; if (A.f.typ === "ball" || B.f.typ === "ball" || (A.person && B.person && A.f.typ !== "rad" && B.f.typ !== "rad")) continue;
          if (!trennt(A.P, B.P) && !kol) kol = `${A.f.id}/${B.f.id} bei t=${t.toFixed(1)}`;
        }
        lage.forEach(e => {
          if (weg) return; const pr = e.person && e.f.typ !== "rad";
          const punkte = pr ? [] : [[e.q.x, e.q.y]].concat(ecken(e.q, (T[e.f.typ] || T.pkw).l / 2 - 0.3, (T[e.f.typ] || T.pkw).b / 2 - 0.15));
          punkte.forEach(p => { if (!weg && imBild(p)) { const a = oben(st, p); if (!STRASSE.has(a)) weg = `${e.f.id} bei t=${t.toFixed(1)} auf ${a} (${p[0].toFixed(1)}|${p[1].toFixed(1)})`; } });
        });
      }
      F(!kol, "Kollision " + kol); F(!weg, "neben der Fahrbahn: " + weg);
      (st.schilder || []).forEach((sc, i) => {
        const a = oben(st, [sc.x, sc.y]), [ax, ay] = sc.aussen || [0, 0], innen = oben(st, [sc.x - ax * 0.65, sc.y - ay * 0.65]);
        F(sc.aussen && sc.blick, `Schild ${i} ohne aussen/blick`); F(!STRASSE.has(a), `Schild ${i} ${sc.typ} steht auf der Fahrbahn (${a})`); F(STRASSE.has(innen), `Schild ${i} ${sc.typ} nicht 0,5 m neben der Fahrbahn (${innen})`);
        // rechts in Fahrtrichtung des Verkehrs, der das Schild sieht (Fahrtrichtung = −blick, rechts davon = (blick_y, −blick_x)); links nur als zweites Schild (links: true)
        const [bx, by] = sc.blick || [0, 0]; F(ax * by - ay * bx >= -0.01 || sc.links, `Schild ${i} ${sc.typ} steht links, ohne links: true`);
      });
      out.push(r);
    }
    return out;
  }, IDS);
  for (const r of erg) { if (!r.fehler.length) pruefe(r.id + ": Inhalt und Geometrie", true); r.fehler.forEach(f => pruefe(r.id + ": " + f, false)); }
  await ctx.close();
}

// ------------------------------------------------------------ Ansicht: Phasen erreichbar, Fokus im Bild, 3D/Oben zeichnen, Mitdenken
for (const [w, h] of [[360, 640], [412, 915], [640, 360], [740, 360]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 500 });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) konsole.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  for (const id of IDS) {
    const t = `${w}×${h} ${id}: `;
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), id);
    try { await page.waitForSelector("#lzCap", { state: "attached", timeout: 5000 }); await page.evaluate(() => { const o = document.querySelector("#lzCapOpen"); if (o && !o.hidden) o.click(); }); } catch { pruefe(t + "öffnet", false); continue; }
    const s = await page.evaluate(sid => { const z = window.Lernszenen._szenen.find(x => x.id === sid); return z ? { d: z.dauer, ph: z.phasen.map(p => ({ t: p.t, titel: p.titel })) } : null; }, id);
    pruefe(t + "registriert", !!s); if (!s) continue;
    for (const k of (BILDER && w === 412 ? ["oben", "3d"] : ["oben"])) {
      await page.click(`[data-kam="${k}"]`);
      for (const [i, p] of s.ph.entries()) {
        await setze(page, p.t + 0.05); await page.waitForTimeout(700);
        const cap = await page.$eval("#lzCap", e => e.textContent);
        pruefe(t + `${k} Phase „${p.titel}“ erreichbar`, cap.includes(p.titel), cap.slice(0, 60));
        if (k === "oben") {
          const r = await page.evaluate(() => { const L = window.Lernszenen, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), st = document.querySelector("#lzCanvas").getBoundingClientRect(), f = sz.fahrzeuge.find(x => x.fokus), q = L._intern.rohPos(f, z.zeit); const sx = st.width / 2 + (q.x - z.ansicht.px) * z.ansicht.zoom, sy = st.height / 2 + (q.y - z.ansicht.py) * z.ansicht.zoom; return sx >= 0 && sx <= st.width && sy >= 0 && sy <= st.height; });
          pruefe(t + `Phase „${p.titel}“: Fokus-Fahrzeug im Bild`, r);
        }
        if (BILDER && w === 412) { const nx = i + 1 < s.ph.length ? s.ph[i + 1].t : s.d; for (const [j, tt] of [[0, p.t + 0.05], [1, (p.t + nx) / 2]]) { await setze(page, tt); await page.waitForTimeout(500); await page.screenshot({ path: join(BILDER, `${id}-${k}-p${i}${j ? "b" : "a"}.png`) }); } }
      }
    }
    for (const k of ["3d", "oben"]) {
      await page.click(`[data-kam="${k}"]`); await page.waitForTimeout(400);
      const farben = await page.evaluate(() => { const cv = document.querySelector("#lzCanvas"), g = cv.getContext("2d"), f = new Set(); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const d = g.getImageData(Math.floor((i + .5) * cv.width / 16), Math.floor((j + .5) * cv.height / 16), 1, 1).data; f.add((d[0] >> 4) + "," + (d[1] >> 4) + "," + (d[2] >> 4)); } return f.size; });
      pruefe(t + `Ansicht ${k} zeichnet`, farben >= 6, String(farben));
    }
    await page.click('[data-modus="mitdenken"]').catch(() => {}); await page.waitForTimeout(300);
    await page.click("#lzPlay").catch(() => {}); await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector("#lzZu").click());
  }
  pruefe(`${w}×${h} Konsole ohne Fehler`, konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
console.log(`Lernszenen-Neu-C-Test: ${ok} bestanden, ${fehler} Fehler`);
await browser.close(); server.close(); process.exit(fehler ? 1 : 0);
