// Lernszenen-Sprache-Test (17.11.2026): Schalter DE/EN. Standard = Handysprache (de-DE → Deutsch, en-GB → Englisch, andere → Deutsch),
// Wahl wird gemerkt. In Englisch: alle 32 Szenen mit englischem Titel/Text/Fragen (gleiche Zahl Phasen/Optionen), jede Phase hat eine englische
// Aufnahme (stimme/index-en.json, Datei abrufbar), Knöpfe englisch; zurück auf Deutsch ist alles wie vorher. Keine Konsolenfehler.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/lernszenen-sprache-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const f = p === "/" ? "index.html" : p; const d = await readFile(join(ROOT, f)); res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" }); res.end(d); } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
let ok = 0, fehler = 0;
const pruefe = (n, c, g = "") => { if (c) ok++; else { fehler++; console.log("FEHLER " + n + (g ? " – " + g : "")); } };
async function seite(locale) {
  const ctx = await browser.newContext({ locale, viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const konsole = [];
  page.on("pageerror", e => konsole.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(basis); await page.waitForFunction(() => window.Lernszenen && window.Lernszenen.open && window.LernszenenEN, null, { timeout: 15000 });
  return { ctx, page, konsole };
}
const DE_TITEL = { stop: "Stoppschild", kreisel: "Kreisverkehr" };
// 1) Standard je Handysprache
for (const [loc, soll] of [["de-DE", "de"], ["en-GB", "en"], ["en-US", "en"], ["tr-TR", "de"]]) {
  const { ctx, page, konsole } = await seite(loc);
  await page.evaluate(() => window.Lernszenen.open({ szene: "stop" })); await page.waitForSelector("#lzSprache");
  const z = await page.evaluate(() => ({ sp: window.Lernszenen._intern.zustand().sprache, knopf: document.querySelector("#lzSprache").textContent, titel: document.querySelector(".lz-title").textContent, lang: document.querySelector(".lz-root").getAttribute("lang") }));
  pruefe(`${loc}: Standard ${soll}`, z.sp === soll && z.knopf === soll.toUpperCase() && z.lang === soll, JSON.stringify(z));
  pruefe(`${loc}: Titel passt zur Sprache`, soll === "de" ? z.titel === DE_TITEL.stop : z.titel !== DE_TITEL.stop && /stop/i.test(z.titel), z.titel);
  pruefe(`${loc}: keine Konsolenfehler`, konsole.length === 0, konsole.join(" | "));
  await ctx.close();
}
// 2) Umschalten, Merken, Inhalt aller Szenen, Aufnahmen
{
  const { ctx, page, konsole } = await seite("de-DE");
  await page.evaluate(() => window.Lernszenen.open({})); await page.waitForSelector("#lzSprache");
  const deTitel = await page.$$eval(".lz-tile h3", x => x.map(e => e.textContent));
  await page.tap("#lzSprache"); await page.waitForTimeout(300);
  const enTitel = await page.$$eval(".lz-tile h3", x => x.map(e => e.textContent));
  pruefe("Auswahl: Titel wechseln auf Englisch", enTitel.length === deTitel.length && enTitel.every((t, i) => t !== deTitel[i] || /^(Autobahn)$/i.test(t)), JSON.stringify(enTitel.slice(0, 4)));
  pruefe("Auswahl: Knopf zeigt EN", (await page.textContent("#lzSprache")) === "EN");
  pruefe("Wahl gemerkt", await page.evaluate(() => localStorage.getItem("lz_sprache") === "en"));
  const r = await page.evaluate(async () => {
    const L = window.Lernszenen, EN = window.LernszenenEN, idx = await (await fetch("stimme/index-en.json")).json(), out = [];
    const stand = t => { let h = 5381; t = String(t); for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
    let phasen = 0, dateien = [];
    for (const s of L._szenen) {
      const e = EN[s.id]; if (!e) { out.push(s.id + ": keine Übersetzung"); continue; }
      if (s.titel !== e.titel) out.push(s.id + ": Titel nicht englisch");
      s.phasen.forEach((p, i) => { phasen++;
        if (p.text !== e.phasen[i].text) out.push(`${s.id}/${i}: Text nicht englisch`);
        if (/[äöüß]/i.test(p.text + p.titel)) out.push(`${s.id}/${i}: Umlaut im englischen Text`);
        if (/§|StVO|km\/h|Zeichen \d/.test(p.text + p.titel)) out.push(`${s.id}/${i}: Nummer/Abkürzung`);
        const a = idx[s.id] && idx[s.id][stand(p.text)]; if (!a) out.push(`${s.id}/${i}: keine englische Aufnahme`); else dateien.push(a.f);
        if (p.frage && p.frage.optionen && (!e.phasen[i].frage || e.phasen[i].frage.optionen.length !== p.frage.optionen.length || p.frage.optionen[0] !== e.phasen[i].frage.optionen[0])) out.push(`${s.id}/${i}: Frage nicht englisch`);
      });
    }
    let fehlen = 0; for (const f of dateien) { const x = await fetch("stimme/" + f, { method: "HEAD" }); if (!x.ok) fehlen++; }
    return { out, phasen, dateien: dateien.length, fehlen };
  });
  pruefe("Englisch: alle Szenen übersetzt, ohne Nummern, mit Aufnahme", r.out.length === 0, r.out.slice(0, 8).join(" | "));
  pruefe("Englisch: 190 Phasen, 190 Aufnahmen abrufbar", r.phasen === 190 && r.dateien === 190 && r.fehlen === 0, JSON.stringify({ p: r.phasen, d: r.dateien, f: r.fehlen }));
  // Szene auf Englisch: Knöpfe, Mitdenken-Frage, Stimme spielt englische Datei
  let gespielt = [];
  await page.exposeFunction("merke", s => gespielt.push(s));
  await page.evaluate(() => { const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.merke(this.src); return P.call(this).catch(() => {}); }; });
  await page.tap('[data-szene="kreisel"]').catch(async () => { await page.evaluate(() => window.Lernszenen.open({ szene: "kreisel" })); });
  await page.waitForSelector("#lzPlay");
  const ui = await page.evaluate(() => ({ m: [...document.querySelectorAll("[data-modus]")].map(b => b.textContent).join(","), k: [...document.querySelectorAll("[data-kam]")].map(b => b.textContent).join(","), t: document.querySelector("#lzCapOpen").textContent, r: document.querySelector("#lzRegeln").textContent }));
  pruefe("Szene: Knöpfe englisch", ui.m.startsWith("Watch,Think along") && ui.k === "Top,3D" && /Show text/.test(ui.t) && /Rules/.test(ui.r), JSON.stringify(ui));
  await page.tap("#lzPlay"); await page.waitForTimeout(2500);
  pruefe("Szene: englische Stimme spielt", gespielt.some(s => /\/stimme\/en-kreisel-/.test(s)), gespielt.join(" "));
  await page.tap('[data-modus="mitdenken"]'); await page.waitForTimeout(200); await page.tap("#lzPlay");
  await page.waitForSelector(".lz-opt", { timeout: 20000 }).catch(() => {});
  const fr = await page.evaluate(() => ({ h: (document.querySelector(".lz-sheet h2") || {}).textContent, o: [...document.querySelectorAll(".lz-opt")].map(b => b.textContent) }));
  pruefe("Mitdenken: Frage englisch", fr.h === "What is right?" && fr.o.length >= 2 && !fr.o.some(o => /[äöüß]/.test(o)), JSON.stringify(fr));
  if (fr.o.length) { await page.tap(".lz-opt"); await page.waitForTimeout(150); pruefe("Mitdenken: Weiter englisch", (await page.textContent("#lzWeiter")) === "Next ▶"); }
  // zurück auf Deutsch in der Szene
  await page.tap("#lzSprache"); await page.waitForTimeout(400);
  const de = await page.evaluate(() => ({ t: document.querySelector(".lz-title").textContent, m: document.querySelector('[data-modus="mitdenken"]').classList.contains("on"), sp: window.Lernszenen._intern.zustand().sprache }));
  pruefe("Zurück auf Deutsch: Titel deutsch, Modus bleibt", de.t === DE_TITEL.kreisel && de.m && de.sp === "de", JSON.stringify(de));
  const deText = await page.evaluate(() => { const s = window.Lernszenen._szenen.find(x => x.id === "kreisel"); return s.phasen.map(p => p.text).join(" "); });
  pruefe("Deutsch: Texte wieder deutsch", /du|Kreis/.test(deText) && !/\byou\b/i.test(deText));
  pruefe("Konsole ohne Fehler", konsole.length === 0, konsole.join(" | "));
  await ctx.close();
  // neu laden: Wahl bleibt (Deutsch)
}
console.log(`Lernszenen-Sprache-Test: ${ok} bestanden, ${fehler} Fehler`);
await browser.close(); server.close(); process.exit(fehler ? 1 : 0);
