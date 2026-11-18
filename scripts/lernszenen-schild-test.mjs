// Lernszenen: Verkehrszeichen nach amtlicher Vorlage, fester Maßstab, richtige Aufstellung.
// Prüft für jede Szene und jedes Schild:
//  - Typ bekannt (Vorlage oder maßstabsgetreu selbst gezeichnet), aussen/blick gesetzt, rechts in Fahrtrichtung (links nur mit links: true)
//  - 3D: Schildfläche (echte Größe) nicht über der Fahrbahn, Seitenabstand 0,5 m innerorts / 1,5 m außerorts (± Toleranz), mindestens 0,3 m;
//    Schild schaut dem ankommenden Verkehr entgegen (vor dem Schild liegt Fahrbahn)
//  - Oben: Schildbild überdeckt keine Fahrbahnfläche, alle Schilder einer Szene im selben mm-Maßstab
//  - Zusatzzeichen direkt unter dem Hauptzeichen (ohne Abstand), Größe 2 innerorts / Größe 3 Autobahn
//  - selbst gezeichnete Schilder: Außenmaß in mm laut Tabelle, Randbreiten/Innenflächen per Pixel-Auswertung
//  - keine Konsolenfehler; Bilder je Szene (Oben + 3D) nach --bilder ORDNER (Standard /tmp/claude-0/pruefen/schilder)
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-schild-test.mjs [--bilder ORDNER]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "index.html" : p)); res.writeHead(200, { "Content-Type": TYPES[extname(p === "/" ? "index.html" : p)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const bi = process.argv.indexOf("--bilder"), BILDER = bi > 0 ? process.argv[bi + 1] : "/tmp/claude-0/pruefen/schilder";
await mkdir(BILDER, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
const setze = (page, v) => page.evaluate(v => { const sl = document.querySelector("#lzSlider"); sl.value = v; sl.dispatchEvent(new Event("input")); }, v);

// Außenmaße (mm, Größe 2) der selbst gezeichneten Schilder nach VwV-StVO Rn. 13 bzw. VzKat/Herstellerkatalog, unabhängig vom Programm notiert
const A35 = 35 * Math.PI / 180;
const MASS = {
  z274: [600, 600], z276: [600, 600], z280: [600, 600], z283: [600, 600], z286: [600, 600], z224: [420, 420], zone30: [840, 840],
  z201: [850, 0], z450: [650, 1500],
  z1000_32: [600, 450], z1020_30: [600, 330], zkfz: [600, 450], z244_1: [600, 600], z244_2: [600, 600], z325_1: [900, 600], z325_2: [900, 600],
  z350: [600, 600], z330: [600, 600], z531: [1250, 1600], z332: [2800, 0], z333: [1500, 0], vorweg: [3500, 2600], weg: [3500, 2600],
  // Katalogteile: nur die Breite zählt (Höhe aus dem Seitenverhältnis des Bilds); z201 stehend geschätzt, z332/z333 Autobahntafeln geschätzt
  z205: [847, 0], z206: [900, 0], z215: [600, 0], z306: [848.5, 0], z1022_10: [600, 0], z220_20: [800, 0], z220_10: [800, 0], z250: [600, 0], z267: [600, 0]
};
// Randmessung: Farbläufe von außen nach innen entlang einer Linie (mm): [Farbe, Länge] … Toleranz ±3 mm (bei 1 px/mm)
const RING = [["weiss", 10], ["rot", 80.4]];            // Zeichen 274-Ring: Lichtkante 10, roter Ring bis Innen-Ø 419 (wie Vorlage 250)
const RAHMEN = [["weiss", 10], ["schwarz", 15]];        // Zusatzzeichen-Rand: Lichtkante 10, schwarzer Rand 15 (wie Vorlage 1002)
const LAEUFE = {
  z274: { y: 300, l: RING.concat([["weiss", 60]]) }, z276: { y: 300, l: RING.concat([["weiss", 40]]) }, z283: { y: 300, l: RING.concat([["blau", 40]]) }, z286: { y: 300, l: RING.concat([["blau", 40]]) },
  z280: { y: 300, l: [["weiss", 10], ["grau", 8], ["weiss", 20]] }, z224: { y: 210, l: [["weiss", 7], ["gruen", 28], ["gelb", 20]] },
  zone30: { y: 420, l: RAHMEN.concat([["weiss", 30]]), x: 420, ly: RAHMEN.concat([["weiss", 45 + 8], ["rot", 64.3], ["weiss", 20]]) },
  z1000_32: { y: 225, l: RAHMEN.concat([["weiss", 20]]) }, z1020_30: { y: 165, l: RAHMEN.concat([["weiss", 20]]) }, zkfz: { y: 225, l: RAHMEN.concat([["weiss", 8]]) },
  z244_1: { y: 300, l: RAHMEN.concat([["weiss", 40]]) }, z325_1: { y: 300, l: [["weiss", 16], ["blau", 30]] }, z325_2: { y: 300, l: [["weiss", 16], ["blau", 20]] },
  z450: { y: 40, l: [["grau", 6], ["weiss", 20]] },
  z531: { y: 800, l: [["schwarz", 25], ["gelb", 20]] }, vorweg: { y: 1300, l: [["blau", 25], ["weiss", 40], ["blau", 20]] }, weg: { y: 1300, l: [["blau", 25], ["weiss", 40], ["blau", 20]] }
};

// ------------------------------------------------------------ Geometrie und Bilder (ohne Ansicht)
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } }), page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  await page.evaluate(() => window.Lernszenen.open({}));
  await page.waitForFunction(() => { const V = window.Lernszenen._intern.vz; return Object.values(V.VZ_TEIL).every(t => (!t.svg || V.vzSvg(t.svg).ok) && (!t.kat || V.vzSvg(t.kat, true).ok)); }, null, { timeout: 10000 }).catch(() => pruefe("Vorlagen (schilder/*.svg) und Katalogbilder (schilder/kat/*.webp) geladen", false));
  const erg = await page.evaluate(({ MASS, LAEUFE }) => {
    const L = window.Lernszenen, V = L._intern.vz, out = { szenen: [], teile: [] };
    const FARBE = { weiss: [255, 255, 255], rot: [193, 18, 28], schwarz: [35, 31, 32], blau: [21, 72, 137], gelb: [247, 186, 11], gruen: [30, 125, 60], grau: [111, 111, 111] };
    const klasse = d => { if (d[3] < 128) return "leer"; let b = null, m = 1e9; for (const [k, f] of Object.entries(FARBE)) { const e = (d[0] - f[0]) ** 2 + (d[1] - f[1]) ** 2 + (d[2] - f[2]) ** 2; if (e < m) { m = e; b = k; } } return b; };
    // ---- selbst gezeichnete Teile: Außenmaß und Randläufe, gerendert mit 1 px/mm
    for (const [n, t] of Object.entries(V.VZ_TEIL)) {
      const r = { n, quelle: t.kat ? "Katalog schilder/kat/" + t.kat + ".webp" : t.svg ? "Vorlage schilder/" + t.svg + ".svg" : t.alt ? "alte Zeichnung, auf Außenmaß gestreckt" : "selbst gezeichnet", w: t.w, h: t.h, form: t.form, fehler: [] };
      out.teile.push(r); if (t.svg) continue;
      if (t.kat) {   // Katalogbild: geladen, Seitenverhältnis exakt wie das Bild (±0,5 %), Breite = Sollbreite
        const e = V.vzSvg(t.kat, true); if (!e.ok) { r.fehler.push("Katalogbild nicht geladen"); continue; }
        const q = e.img.naturalHeight / e.img.naturalWidth; r.gemessen = [e.img.naturalWidth, e.img.naturalHeight];
        if (Math.abs(t.h / t.w - q) > q * 0.005) r.fehler.push(`Seitenverhältnis ${(t.h / t.w).toFixed(4)} statt ${q.toFixed(4)} (Bild)`);
        if (MASS[n] && Math.abs(t.w - MASS[n][0]) > MASS[n][0] * 0.012) r.fehler.push(`Breite ${t.w} statt ${MASS[n][0]}`);
        continue;
      }
      const [w, h] = V.vzMass(n, 2), c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); const g = c.getContext("2d");
      V.vzTeilMalen(g, n, w, h, { zahl: n === "z450" ? "3" : "60" });
      const d = g.getImageData(0, 0, c.width, c.height).data, px = (x, y) => d.subarray((Math.round(y) * c.width + Math.round(x)) * 4, (Math.round(y) * c.width + Math.round(x)) * 4 + 4);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, soll = MASS[n], tol = t.alt ? 0.04 : 0.012;
      if (!soll) r.fehler.push("kein Sollmaß in der Testtabelle");
      else if (Math.abs(bw - soll[0]) > soll[0] * tol || Math.abs(bh - soll[1]) > soll[1] * tol) r.fehler.push(`Außenmaß ${bw}×${bh} statt ${soll[0].toFixed(0)}×${soll[1].toFixed(0)}`);
      r.gemessen = [bw, bh];
      const lauf = (sx, sy, dx, dy, liste) => {   // Farbläufe ab (sx, sy) in Richtung (dx, dy)
        let x = sx, y = sy, i = 0, len = 0; const ist = [];
        while (x >= 0 && y >= 0 && x < c.width && y < c.height) { const k = klasse(px(x, y)); if (ist.length && ist[ist.length - 1][0] === k) ist[ist.length - 1][1]++; else ist.push([k, 1]); x += dx; y += dy; }
        for (let j = 0; j < ist.length - 1; j++) if (ist[j][1] <= 1) { ist[j + 1][1] += ist[j][1]; ist.splice(j, 1); j--; }   // 1-px-Haarlinie/Kantenglättung zählt zur nächsten Fläche
        liste.forEach(([f, l], j) => {
          const e = ist[j]; if (!e || e[0] !== f) { r.fehler.push(`Lauf ${j}: ${e ? e[0] : "nichts"} statt ${f} (${JSON.stringify(ist.slice(0, liste.length))})`); return; }
          if (j < liste.length - 1 && Math.abs(e[1] - l) > 3) r.fehler.push(`Lauf ${j} ${f}: ${e[1]} mm statt ${l}`);
          if (j === liste.length - 1 && e[1] < Math.min(l, 8)) r.fehler.push(`Lauf ${j} ${f}: nur ${e[1]} mm (${JSON.stringify(ist.slice(0, liste.length + 1))})`);
        });
        r.laeufe = (r.laeufe || []).concat([ist.slice(0, liste.length)]);
      };
      const m = LAEUFE[n] || (n.endsWith("_2") || n === "z244_2" ? LAEUFE[n.replace("_2", "_1")] : null);
      if (m) { lauf(0, m.y, 1, 0, m.l); if (m.ly) lauf(m.x, 0, 0, 1, m.ly); }
      else if (!t.alt && n !== "z201") r.fehler.push("keine Randmessung festgelegt");
      if (n === "z201") { const a = klasse(px(w / 2, h / 2)), b = klasse(px(w / 2, h / 2 - 75)); if (a !== "weiss") r.fehler.push("Kreuzmitte nicht weiß"); if (b !== "rot") r.fehler.push("roter Rand fehlt (" + b + ")"); }
    }
    // ---- Szenen
    for (const s of L._szenen) {
      const st = s.strasse, r = { id: s.id, kat: s.kategorie || "autobahn", fehler: [], schilder: [] }; out.szenen.push(r);
      if (!st || !(st.schilder || []).length) continue;
      V.vzAufstellen(s);
      const d0 = r.kat === "autobahn" || r.kat === "ueberland" ? 1.5 : 0.5;
      st.schilder.forEach((sc, i) => {
        const tag = `Schild ${i} ${sc.typ}`, gr = V.vzGroesse(sc, r.kat), vz = V.vzBild(sc.typ, gr);
        r.schilder.push({ typ: sc.typ, x: sc.x, y: sc.y, gr });
        if (!vz) { r.fehler.push(tag + ": Typ unbekannt"); return; }
        if (!sc.aussen || !sc.blick) { r.fehler.push(tag + ": ohne aussen/blick"); return; }
        const [ax, ay] = sc.aussen, [bx, by] = sc.blick;
        if (!(ax * by - ay * bx >= -0.01 || sc.links)) r.fehler.push(tag + ": steht links ohne links: true");
        if (V.vzStrasse(st, sc.x, sc.y)) r.fehler.push(tag + ": Pfosten auf der Fahrbahn");
        if (!V.vzFrei(st, sc, r.kat, 0.3)) r.fehler.push(tag + ": Schildfläche näher als 0,3 m an der Fahrbahn");
        if (!sc.frei) {
          if (!V.vzFrei(st, sc, r.kat, d0 - 0.06)) r.fehler.push(tag + `: Seitenabstand unter ${d0} m`);
          if (V.vzFrei(st, sc, r.kat, d0 + 0.35)) r.fehler.push(tag + `: Seitenabstand weit über ${d0} m`);
        }
        // Blick zum Ankommenden: vor der Schildfläche (in Richtung blick) liegt Fahrbahn
        let vorn = false; const nx = -by, ny = bx;
        for (const u of [4, 8, 12, 16, 20]) for (let v = -8; v <= 8 && !vorn; v += 0.5) if (V.vzStrasse(st, sc.x + bx * u + nx * v, sc.y + by * u + ny * v)) vorn = true;
        if (!vorn) r.fehler.push(tag + ": vor dem Schild keine Fahrbahn (Blick falsch?)");
        // Größe nach VwV Rn. 15
        const t0 = V.VZ_TEIL[vz.teile[0].n], soll = r.kat === "autobahn" ? 3 : r.kat === "ueberland" && t0.form === "ronde" ? 3 : 2;
        if (gr !== soll) r.fehler.push(tag + `: Größe ${gr} statt ${soll}`);
        // Zusatzzeichen direkt unter dem Hauptzeichen: Teile lückenlos übereinander, Mittelspalte ohne leere Zeile zwischen den Teilen
        if (vz.teile.length > 1) {
          const summe = vz.teile.reduce((a, t) => a + t.h, 0); if (Math.abs(summe - vz.h) > 0.5) r.fehler.push(tag + ": Teile nicht lückenlos");
          if (vz.teile.slice(1).some(t => V.VZ_TEIL[t.n].form !== "zusatz" && !(sc.typ === "z205_215"))) r.fehler.push(tag + ": unten kein Zusatzzeichen");
          const g = vz.img.getContext("2d"), cx = Math.floor(vz.img.width / 2); let yy = 0;
          vz.teile.slice(0, -1).forEach(t => { yy += t.h; const py = Math.round(yy * vz.img.height / vz.h); let leer = 0; for (let k = -4; k <= 4; k++) { let zeile = true; for (let x = cx - 10; x <= cx + 10; x++) if (g.getImageData(x, py + k, 1, 1).data[3] > 20) { zeile = false; break; } if (zeile) leer++; } if (leer > 1) r.fehler.push(tag + ": Lücke zwischen Haupt- und Zusatzzeichen"); });
        }
        // Maßstab: Teile in mm wie Tabelle (Größe 2/3)
        vz.teile.forEach(t => { const [w, h] = V.vzMass(t.n, gr); if (Math.abs(t.w - w) > 0.5 || Math.abs(t.h - h) > 0.5) r.fehler.push(tag + ": Teil " + t.n + " nicht im mm-Maßstab"); });
      });
    }
    return out;
  }, { MASS, LAEUFE });
  for (const t of erg.teile) { if (t.fehler.length) t.fehler.forEach(f => pruefe(`Teil ${t.n}: ${f}`, false)); else pruefe(`Teil ${t.n}`, true); }
  for (const r of erg.szenen) { if (!r.fehler.length) pruefe(r.id + ": Schilder-Geometrie", true); r.fehler.forEach(f => pruefe(r.id + ": " + f, false)); }
  pruefe("Konsole ohne Fehler (Geometrie)", konsole.length === 0, konsole.join(" | "));
  globalThis.ERG = erg;
  await ctx.close();
}

// ------------------------------------------------------------ Ansicht: Oben (Bild ohne Fahrbahn, gleicher Maßstab) und 3D, Bilder je Szene
{
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|supabase|net::ERR/i.test(m.text())) konsole.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const ids = globalThis.ERG.szenen.filter(r => r.schilder.length).map(r => r.id);
  for (const id of ids) {
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), id);
    try { await page.waitForSelector("#lzCap", { state: "attached", timeout: 5000 }); } catch { pruefe(id + ": öffnet", false); continue; }
    await page.waitForFunction(() => { const V = window.Lernszenen._intern.vz; return Object.values(V.VZ_TEIL).every(t => (!t.svg || V.vzSvg(t.svg).ok) && (!t.kat || V.vzSvg(t.kat, true).ok)); }, null, { timeout: 8000 }).catch(() => {});
    await page.click('[data-kam="oben"]'); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const L = window.Lernszenen, V = L._intern.vz, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), st = sz.strasse, s = z.ansicht.zoom * V.dpr(), f = [], ks = new Set();
      st.schilder.forEach((sc, i) => {
        const Lg = V.vzObenLage(st, sc, sz.kategorie, s); if (!Lg) { f.push(`Schild ${i} ${sc.typ}: oben nicht nach Vorlage`); return; }
        // gleicher Maßstab (px je mm) für alle Schilder; Ausnahme: Querformat-Tafeln (220, 325 …) haben am Handy eine Mindesthöhe VZ_MIN_QUER CSS-px,
        // damit sie kein Strich sind – sie sind dann höchstens so groß, nie kleiner als der gemeinsame Maßstab
        const kBasis = Math.max(V.VZ_OBEN * s / 1000, V.VZ_MIN * V.dpr() / 900);
        Lg.vz.teile.forEach((t0, j) => {
          const q = Lg.teile[j], k = q.dw * s / t0.w, quer = t0.w >= 1.4 * t0.h;
          if (Math.abs(q.dh * s / t0.h - k) > 1e-6 * k) f.push(`Schild ${i} ${sc.typ}: Teil ${t0.n} verzerrt`);
          if (!quer) ks.add((k / s * 1e6).toFixed(3));
          else { if (k < kBasis * 0.999) f.push(`Schild ${i} ${sc.typ}: Querformat kleiner als der gemeinsame Maßstab`); if (t0.h * k / V.dpr() < V.VZ_MIN_QUER - 0.5) f.push(`Schild ${i} ${sc.typ}: Querformat oben nur ${(t0.h * k / V.dpr()).toFixed(1)} px hoch`); }
          if (j && Math.abs(q.dy - (Lg.teile[j - 1].dy + Lg.teile[j - 1].dh)) > 1e-6) f.push(`Schild ${i} ${sc.typ}: Zusatzzeichen oben nicht direkt darunter`);
        });
        for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) if (V.vzStrasse(st, Lg.x0 + Lg.w * a / 8, Lg.y0 + Lg.h * b / 8)) { f.push(`Schild ${i} ${sc.typ}: Bild oben überdeckt die Fahrbahn`); a = b = 99; }
      });
      if (ks.size > 1) f.push("Schilder oben nicht im selben Maßstab: " + [...ks].join(", "));
      return f;
    });
    pruefe(id + ": Oben ohne Überdeckung, gleicher Maßstab", r.length === 0, r.join(" | "));
    // Bilder: Zeitpunkt, zu dem ein Schild 10–35 m vor dem Fokus-Fahrzeug liegt
    const tt = await page.evaluate(() => {
      const L = window.Lernszenen, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), f = sz.fahrzeuge.find(x => x.fokus);
      for (let t = 0; t <= sz.dauer; t += 0.2) { const q = L._intern.rohPos(f, t), c = Math.cos(q.h), s = Math.sin(q.h);
        for (const [i, sc] of sz.strasse.schilder.entries()) { const dx = sc.x - q.x, dy = sc.y - q.y, vor = dx * c + dy * s, quer = Math.abs(-dx * s + dy * c); if (vor > 4 && vor < 16 && quer < vor * 0.8 && sc.blick[0] * c + sc.blick[1] * s < -0.3) return [t, i]; } }   // Schild für die eigene Fahrtrichtung
      return [0, -1];
    });
    const [t3, i3] = tt;
    await setze(page, t3); await page.waitForTimeout(1200);
    // Kamera oben: jedes Schild, das (teilweise) zu sehen ist, ist ganz im Bild und nicht unter dem Tempo-Feld (sofern es neben das Fokus-Auto passt)
    const rand = await page.evaluate(() => {
      const L = window.Lernszenen, V = L._intern.vz, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), st = sz.strasse, cvr = document.querySelector("#lzCanvas").getBoundingClientRect(), W = cvr.width, H = cvr.height, zz = z.ansicht.zoom, s = zz * V.dpr(), f = [];
      const hu = document.querySelector("#lzHud"), hr = hu && !hu.hidden ? hu.getBoundingClientRect() : null;
      st.schilder.forEach((sc, i) => {
        const Lg = V.vzObenLage(st, sc, sz.kategorie, s); if (!Lg) return;
        const sx0 = W / 2 + (Lg.x0 - z.ansicht.px) * zz, sx1 = sx0 + Lg.w * zz, sy0 = H / 2 + (Lg.y0 - z.ansicht.py) * zz, sy1 = sy0 + Lg.h * zz;
        if (sx1 < 0 || sx0 > W || sy1 < 0 || sy0 > H) return;
        if (sx0 < -1 || sx1 > W + 1 || sy0 < -1 || sy1 > H + 1) f.push(`Schild ${i} ${sc.typ}: oben am Rand abgeschnitten (${sx0.toFixed(0)}–${sx1.toFixed(0)} × ${sy0.toFixed(0)}–${sy1.toFixed(0)} von ${W.toFixed(0)} × ${H.toFixed(0)})`);
        if (hr && sx1 + cvr.left > hr.left + 2 && sx0 + cvr.left < hr.right && sy1 + cvr.top > hr.top + 2 && sy0 + cvr.top < hr.bottom) f.push(`Schild ${i} ${sc.typ}: oben unter dem Tempo-Feld`);
      });
      return f;
    });
    pruefe(id + ": Oben Schilder ganz im Bild, nicht unter dem Tempo-Feld", rand.length === 0, rand.join(" | "));
    await page.screenshot({ path: join(BILDER, `${id}-oben.png`) });
    await page.click('[data-kam="3d"]'); await setze(page, t3); await page.waitForTimeout(500);
    const vorne = await page.evaluate(() => {   // jedes sichtbare Schild: von vorn gesehen, wenn die Kamera auf der Blickseite ist
      const L = window.Lernszenen, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), f = [];
      sz.strasse.schilder.forEach((sc, i) => { const p = L._intern.punkt3d(sc.x, sc.y, 2.5); if (!p) return; if (!(p[2] > 0)) f.push(`Schild ${i}: hinter der Kamera`); });
      return f;
    });
    pruefe(id + ": 3D zeichnet die Schilder", vorne.length === 0, vorne.join(" | "));
    // 3D: das Schild vor dem Fokus-Auto zeigt mit der Vorderseite zur Kamera (Verfolger, 26 m hinter dem Auto), nicht fast von der Kante
    if (i3 >= 0) {
      const cosB = await page.evaluate(([t, i]) => {
        const L = window.Lernszenen, z = L._intern.zustand(), sz = L._szenen.find(x => x.id === z.szene), f = sz.fahrzeuge.find(x => x.fokus), q = L._intern.rohPos(f, t), sc = sz.strasse.schilder[i];
        const cx = q.x - Math.cos(q.h) * 26, cy = q.y - Math.sin(q.h) * 26, dx = cx - sc.x, dy = cy - sc.y, d = Math.hypot(dx, dy);
        return (dx * sc.blick[0] + dy * sc.blick[1]) / d / Math.hypot(...sc.blick);
      }, [t3, i3]);
      pruefe(id + ": 3D Schild dem Verkehr zugewandt (Kamera sieht es von vorn)", cosB >= 0.35, "cos " + cosB.toFixed(2));
    }
    await page.screenshot({ path: join(BILDER, `${id}-3d.png`) });
    await page.evaluate(() => document.querySelector("#lzZu").click());
  }
  pruefe("Konsole ohne Fehler (Ansicht)", konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
// Liste der Schild-Teile mit Quelle und Maß (LISTE.md im Bilder-Ordner)
{
  const T = globalThis.ERG.teile, typen = new Map();
  globalThis.ERG.szenen.forEach(r => r.schilder.forEach(sc => { if (!typen.has(sc.typ + "|" + sc.gr)) typen.set(sc.typ + "|" + sc.gr, { typ: sc.typ, gr: sc.gr, szenen: new Set() }); typen.get(sc.typ + "|" + sc.gr).szenen.add(r.id); }));
  const md = ["# Verkehrszeichen der Lernszenen: Quelle und Maße", "", "Maße in mm bei Größe 2 (Größe 3: Dreieck/Quadrat/Rechteck ×1,4, Ronde/Zusatzzeichen ×1,25, Achteck 1050). Gemessen = Außenmaß am gerenderten Bild (1 px/mm).", "",
    "| Teil | Quelle | Maß (B × H) | gemessen | Randmessung (Farbläufe von außen, mm) |", "|---|---|---|---|---|",
    ...T.map(t => `| ${t.n} | ${t.quelle} | ${Math.round(t.w)} × ${Math.round(t.h)} | ${t.gemessen ? t.gemessen.join(" × ") : "–"} | ${(t.laeufe || []).map(l => l.map(([f, n]) => f + " " + n).join(", ")).join(" / ") || "–"} |`),
    "", "| Schild-Typ in Szenen | Größe | Szenen |", "|---|---|---|", ...[...typen.values()].map(t => `| ${t.typ} | ${t.gr} | ${[...t.szenen].join(", ")} |`)];
  await writeFile(join(BILDER, "LISTE.md"), md.join("\n") + "\n");
}
console.log("Teile: " + globalThis.ERG.teile.map(t => `${t.n} (${t.quelle}, ${Math.round(t.w)}×${Math.round(t.h)} mm)`).join("; "));
console.log(`Lernszenen-Schild-Test: ${ok} bestanden, ${fehler} Fehler (Bilder: ${BILDER})`);
await browser.close(); server.close(); process.exit(fehler ? 1 : 0);
