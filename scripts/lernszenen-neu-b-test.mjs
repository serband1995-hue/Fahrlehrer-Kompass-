// Lernszenen Block 6 (b): Bahnübergang, Straßenbahn, Sicherheitsabstand, Halten und Parken, Einsatzfahrzeug.
// Je Szene: öffnet, alle Phasen erreichbar (Titel im Erklärkasten), Fokus-Fahrzeug im Bild, keine Konsolenfehler,
// dazu fachliche Prüfung der Abläufe (Zeitlinie der Fahrzeuge). Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-neu-b-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => { try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const d = await readFile(join(ROOT, p === "/" ? "index.html" : p)); res.writeHead(200, { "Content-Type": TYPES[extname(p === "/" ? "x.html" : p)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); } });
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
const IDS = ["bahnuebergang", "strassenbahn", "abstand", "halteverbot", "einsatz"], ZEIGE = { strassenbahn: ["tram"], abstand: ["f2", "lr"] };   // der Rettungswagen ist nur in den ersten Phasen im Bild (fährt dann durch)
for (const [w, h] of [[360, 640], [412, 915], [640, 360], [568, 320]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: w < 500 });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message)); page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) konsole.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open, null, { timeout: 15000 });
  const alle = await page.evaluate(() => window.Lernszenen._szenen.map(s => s.id));
  for (const id of IDS) {
    const t = `${w}×${h} ${id}: `; pruefe(t + "registriert", alle.includes(id));
    await page.evaluate(s => window.Lernszenen.open({ szene: s }), id); await page.waitForSelector("#lzCap");
    const info = await page.evaluate(sid => { const s = window.Lernszenen._szenen.find(x => x.id === sid); return { ph: s.phasen.map(p => [p.t, p.titel]), dauer: s.dauer }; }, id);
    for (const [i, [pt, titel]] of info.ph.entries()) {
      const nxt = i + 1 < info.ph.length ? info.ph[i + 1][0] : info.dauer, tm = (pt + nxt) / 2;
      await page.evaluate(v => { const sl = document.querySelector("#lzSlider"); sl.value = v; sl.dispatchEvent(new Event("input")); }, tm); await page.waitForTimeout(700);
      const r = await page.evaluate(zeige => {
        const L = window.Lernszenen, z = L._intern.zustand(), s = L._szenen.find(x => x.id === z.szene), st = document.querySelector("#lzCanvas").getBoundingClientRect(), out = [];
        for (const f of s.fahrzeuge) { if (!f.fokus && !(zeige || []).includes(f.id)) continue; const p = L._intern.rohPos(f, z.zeit), sx = st.width / 2 + (p.x - z.ansicht.px) * z.ansicht.zoom, sy = st.height / 2 + (p.y - z.ansicht.py) * z.ansicht.zoom; out.push([f.id, sx > 0 && sx < st.width && sy > 0 && sy < st.height]); }
        return { out, kasten: (document.querySelector("#lzCap") || {}).textContent || "" };
      }, ZEIGE[id] || (id === "einsatz" && i <= 2 ? ["rtw"] : []));
      pruefe(t + `Phase ${i} erreichbar („${titel}“ im Kasten)`, r.kasten.includes(titel));
      for (const [fid, drin] of r.out) pruefe(t + `Phase ${i}: ${fid} im Bild`, drin);
    }
    await page.evaluate(() => document.querySelector("#lzZu").click());
  }
  pruefe(`${w}×${h} Konsole ohne Fehler`, konsole.length === 0, konsole.join(" | ")); await ctx.close();
}

// Fachliche Prüfung der Abläufe (unabhängig von der Bildschirmgröße)
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } }), page = await ctx.newPage();
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open);
const fach = await page.evaluate(() => {
  const L = window.Lernszenen, I = L._intern, S = id => L._szenen.find(s => s.id === id), F = (s, id) => s.fahrzeuge.find(f => f.id === id), pos = (f, t) => I.rohPos(f, t), TY = I.TYPEN, res = {};
  const lauf = (s, fn) => { for (let t = 0; t <= s.dauer; t += 0.05) fn(t); };
  // Bahnübergang: Auto und Gegenverkehr stehen, solange der Zug in der Nähe ist; nie auf dem Gleis, wenn der Zug kommt
  { const s = S("bahnuebergang"), fs = F(s, "fs"), g = F(s, "g"), z = F(s, "zug"); let schlecht = 0, zugDa = 0;
    lauf(s, t => { const pz = pos(z, t), a = pos(fs, t), b = pos(g, t); if (Math.abs(pz.y) < 40) { zugDa++; if (a.v > 0.05 || b.v > 0.05 || Math.abs(a.x) < 4.2 + TY.fahrschule.l / 2 || Math.abs(b.x) < 4.2 + 2.3) schlecht++; } });
    res.bahn = { zugDa, schlecht, fsEnde: pos(fs, s.dauer).x }; }
  // Straßenbahn: Fahrschule fährt nur los, wenn kein Fahrgast auf ihrer Fahrspur vor ihr ist; Schritttempo neben der Bahn
  { const s = S("strassenbahn"), fs = F(s, "fs"), tram = F(s, "tram"); let schlecht = 0, zuSchnell = 0;
    lauf(s, t => { const a = pos(fs, t); for (const id of ["fa", "fb", "fc", "fd"]) { const f = F(s, id); if (f.unsichtbar && f.unsichtbar(t)) continue; const p = pos(f, t); if (p.y > 1.6 && p.y < 4.9 && p.x > a.x - 3 && p.x < a.x + 6 && a.v > 0.05) schlecht++; }
      const pt = pos(tram, t); if (pt.v < 0.05 && a.x > pt.x - 13.5 && a.x < pt.x + 13.5 && a.v * 3.6 > 7.5) zuSchnell++; });
    res.tram = { schlecht, zuSchnell, stehtBeiAnkunft: pos(tram, 12).v }; }
  // Abstand: Fahrschule berührt den Vordermann nie, das rote Auto fährt auf
  { const s = S("abstand"); let minR = 99, minF = 99; lauf(s, t => { minR = Math.min(minR, pos(F(s, "lr"), t).x - TY.pkw.l / 2 - (pos(F(s, "fs"), t).x + TY.fahrschule.l / 2)); minF = Math.min(minF, pos(F(s, "lf"), t).x - TY.pkw.l / 2 - (pos(F(s, "f2"), t).x + TY.pkw.l / 2)); });
    res.abstand = { minRichtig: +minR.toFixed(1), minZuDicht: +minF.toFixed(1) }; }
  // Halteverbot: Endposition der Fahrschule liegt in der freien (grünen) Zone, kein Parkplatz-Auto im Weg
  { const s = S("halteverbot"), fs = F(s, "fs"), e = pos(fs, s.dauer); res.halte = { x: +e.x.toFixed(1), v: +e.v.toFixed(2) }; }
  // Einsatz: Fahrschule und blaues Auto stehen, solange der Rettungswagen nahe der Kreuzung ist; Fahrschule steht nie in der Kreuzung
  { const s = S("einsatz"), fs = F(s, "fs"), q = F(s, "q"), r = F(s, "rtw"); let schlecht = 0, inKreuzung = 0;
    lauf(s, t => { const pr = pos(r, t), a = pos(fs, t), b = pos(q, t); if (pr.x > -12 && pr.x < 11 && (a.v > 0.05 || b.v > 0.05)) schlecht++; if (a.x + 2.25 > -9.25 && a.v < 0.05) inKreuzung++; });
    res.einsatz = { schlecht, inKreuzung }; }
  return res;
});
console.log(JSON.stringify(fach));
pruefe("Bahnübergang: Zug sichtbar im Zeitfenster", fach.bahn.zugDa > 50); pruefe("Bahnübergang: alle stehen, wenn der Zug kommt", fach.bahn.schlecht === 0, String(fach.bahn.schlecht)); pruefe("Bahnübergang: Fahrschule fährt am Ende über das Gleis", fach.bahn.fsEnde > 3, String(fach.bahn.fsEnde));
pruefe("Straßenbahn: Fahrschule fährt nie auf Fahrgäste zu", fach.tram.schlecht === 0, String(fach.tram.schlecht)); pruefe("Straßenbahn: Schritttempo neben der haltenden Bahn", fach.tram.zuSchnell === 0, String(fach.tram.zuSchnell));
pruefe("Abstand: Fahrschule hält mit Abstand", fach.abstand.minRichtig > 5, String(fach.abstand.minRichtig)); pruefe("Abstand: rotes Auto fährt auf (Abstand ≈ 0)", fach.abstand.minZuDicht < 0.5, String(fach.abstand.minZuDicht));
pruefe("Halteverbot: Fahrschule steht am Ende in der freien Zone (180–196 m)", fach.halte.x > 182 && fach.halte.x < 194 && fach.halte.v < 0.05, JSON.stringify(fach.halte));
pruefe("Einsatz: alle stehen, solange der Rettungswagen die Kreuzung quert", fach.einsatz.schlecht === 0, String(fach.einsatz.schlecht)); pruefe("Einsatz: Fahrschule blockiert die Kreuzung nicht", fach.einsatz.inKreuzung === 0, String(fach.einsatz.inKreuzung));
await browser.close(); server.close();
console.log(`Lernszenen-Neu-B-Test: ${ok} bestanden, ${fehler} Fehler`); process.exit(fehler ? 1 : 0);
