// Büro-Handbuch: baut aus kapitel/*.html die PDFs (ein PDF je Kapitel und ein Gesamt-PDF mit Inhaltsverzeichnis).
// Aufruf (vom Repo-Ordner aus):  NODE_PATH=$(npm root -g) node docs/buero-handbuch/bauen.mjs
// Bilder vorher mit bilder.mjs erzeugen (oder beides mit erzeugen.sh).
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const HIER = fileURLToPath(new URL(".", import.meta.url));
const KAPITEL = JSON.parse(await readFile(join(HIER, "kapitel", "kapitel.json"), "utf8"));
const STAND = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const ABSENDER = "Fahrschule Boost";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

await mkdir(join(HIER, "html"), { recursive: true });
await mkdir(join(HIER, "pdf"), { recursive: true });
// Bilder fürs PDF als JPEG (Qualität 75, höchstens 1400 Pixel breit ≈ 200 dpi auf A4): die PDFs werden deutlich kleiner, Text bleibt scharf
execFileSync("python3", ["-c", `
import os, sys
from PIL import Image
q, z = sys.argv[1], sys.argv[2]
os.makedirs(z, exist_ok=True)
for f in os.listdir(q):
    if not f.endswith(".png"): continue
    a, b = os.path.join(q, f), os.path.join(z, f[:-4] + ".jpg")
    if os.path.exists(b) and os.path.getmtime(b) >= os.path.getmtime(a): continue
    im = Image.open(a).convert("RGB")
    if im.width > 1400: im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    im.save(b, "JPEG", quality=75, optimize=True, progressive=True)
`, join(HIER, "bilder"), join(HIER, "html", "jpg-1400-75")]); // Ordnername enthält Größe und Qualität: andere Werte = frische Umrechnung

// Kapitel lesen, jede Funktion (h2) bekommt eine Kennung für das Inhaltsverzeichnis
async function leseKapitel(k) {
  let html = await readFile(join(HIER, "kapitel", k.datei + ".html"), "utf8");
  html = html.replace(/src="bilder\/([^"]+)\.png"/g, 'src="jpg-1400-75/$1.jpg"').replace(/src="bilder\//g, 'src="../bilder/');
  // Verweise auf die roten Nummern im Bild: „(2)“ im Text wird zum roten Kreis wie im Bild
  html = html.replace(/\((\d{1,2})\)/g, '<span class="marke-ref">$1</span>');
  const funktionen = [];
  let i = 0;
  html = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (m, attr, inhalt) => {
    i++;
    const key = `K${k.nr}F${i}`;
    funktionen.push({ key, titel: inhalt.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim() });
    return `<h2${attr}>${inhalt}<span class="unsichtbar">@@${key}@@</span></h2>`;
  });
  return { ...k, html, funktionen };
}

const seiteKopf = (titel) => `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${esc(titel)}</title>
<link rel="stylesheet" href="../../../fonts/fonts.css"><link rel="stylesheet" href="../handbuch.css"></head><body>`;

function verzeichnis(eintraege, seiten) {
  return `<ul class="verzeichnis">${eintraege.map((e) => `<li class="${e.klasse}"><span class="t">${esc(e.titel)}</span><span class="p"></span><span class="s">${seiten[e.key] ?? "00"}</span></li>`).join("")}</ul>`;
}

function deckblatt(titel, kapitelnr, kurz, inhaltHtml) {
  return `<section class="deckblatt">
  <div class="oben"><span class="absender">${ABSENDER}</span><img src="../../../icon-192.png" alt=""></div>
  <div class="mitte"><div class="kapitelnr">${esc(kapitelnr)}</div><h1>${esc(titel)}</h1><p class="kurz">${esc(kurz)}</p></div>
  ${inhaltHtml ? `<div class="inhalt"><h3 style="font-family:Manrope,Arial;font-size:10pt;text-transform:uppercase;letter-spacing:.06em;color:#2f6b47;margin:0 0 6pt">Inhalt</h3>${inhaltHtml}</div>` : ""}
  <div class="unten">Handbuch zur Büro-Seite des Fahrlehrer-Kompass („Kompass Büro“) · Stand ${STAND}<br>Alle Namen und Daten in den Bildern sind erfunden (Vorführ-Modus). Nur der Name „Serband“ ist echt: Er steht fest in einigen Hinweisen der Büro-Seite.</div>
</section>`;
}

const browser = await chromium.launch();

// HTML → PDF, zweimal: beim ersten Mal die Seitenzahlen der Überschriften suchen, beim zweiten Mal ins Verzeichnis schreiben
async function druck(name, titel, bauHtml, pruefTitel = {}) {
  const htmlDatei = join(HIER, "html", name + ".html");
  const pdfDatei = join(HIER, "pdf", name + ".pdf");
  let seiten = {};
  for (let lauf = 0; lauf < 2; lauf++) {
    // Im zweiten Lauf die unsichtbaren Suchmarken weglassen (sonst stehen sie beim Suchen/Kopieren im PDF-Text)
    const html = bauHtml(seiten);
    await writeFile(htmlDatei, lauf ? html.replace(/<span class="unsichtbar">@@K\d+F\d+@@<\/span>/g, "") : html);
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlDatei).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: pdfDatei, format: "A4", printBackground: true, displayHeaderFooter: true,
      margin: { top: "16mm", bottom: "18mm", left: "16mm", right: "16mm" },
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font:8px Arial,sans-serif;color:#6b7280;padding:0 16mm;display:flex;justify-content:space-between"><span>${esc(ABSENDER)} · Büro-Handbuch · ${esc(titel)}</span><span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`,
    });
    await page.close();
    if (lauf === 0) {
      const anzahl = Number(execFileSync("pdfinfo", [pdfDatei]).toString().match(/Pages:\s+(\d+)/)[1]);
      for (let s = 1; s <= anzahl; s++) {
        const text = execFileSync("pdftotext", ["-f", String(s), "-l", String(s), pdfDatei, "-"]).toString();
        for (const m of text.matchAll(/@@(K\d+F\d+)@@/g)) if (!(m[1] in seiten)) seiten[m[1]] = s;
      }
    }
  }
  // Prüfung: Steht jede Überschrift wirklich auf der Seite, die das Verzeichnis nennt?
  const norm = (t) => t.replace(/\s+/g, " ").replace(/[‚‘’„“"]/g, "").trim().slice(0, 28);
  let falsch = 0;
  for (const [key, seite] of Object.entries(seiten)) {
    if (!pruefTitel[key]) continue;
    const text = norm(execFileSync("pdftotext", ["-f", String(seite), "-l", String(seite), pdfDatei, "-"]).toString());
    if (!text.includes(norm(pruefTitel[key]))) { falsch++; if (falsch <= 5) console.log(`   ! Verzeichnis: „${pruefTitel[key]}“ nicht auf Seite ${seite}`); }
  }
  if (falsch) { console.log(`FEHL pdf/${name}.pdf: ${falsch} Verzeichnis-Einträge zeigen auf die falsche Seite`); process.exitCode = 1; }
  const anzahl = execFileSync("pdfinfo", [pdfDatei]).toString().match(/Pages:\s+(\d+)/)[1];
  console.log(`ok   pdf/${name}.pdf  (${anzahl} Seiten)`);
  return Number(anzahl);
}

// Nur einzelne Kapitel (z. B. „node bauen.mjs 3“): kein Gesamt-PDF, für schnelles Nachsehen beim Schreiben
const NUR = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const kapitel = [];
for (const k of KAPITEL) {
  if (NUR.length && !NUR.includes(k.nr)) continue;
  try { kapitel.push(await leseKapitel(k)); } catch (e) { console.log(`--   Kapitel ${k.nr} fehlt noch (${k.datei}.html)`); }
}

const ergebnis = [];
for (const k of kapitel) {
  const name = `${String(k.nr).padStart(2, "0")}-${k.titel.replace(/[,„“"]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/\s+/g, "-")}`; // Dateinamen ohne Umlaute (Handy, Mail, Dropbox)
  const eintraege = k.funktionen.map((f) => ({ key: f.key, titel: f.titel, klasse: "fn" }));
  // Seitenzahlen im Einzel-PDF: Funktionen aus diesem Kapitel
  const n = await druck(name, `Kapitel ${k.nr}: ${k.titel}`, (seiten) =>
    seiteKopf(`Kapitel ${k.nr}: ${k.titel}`) + deckblatt(k.titel, `Kapitel ${k.nr}`, k.kurz, "") + `<section class="verzeichnis-seite"><h1>Inhalt</h1>${verzeichnis(eintraege, seiten)}</section>` + k.html + "</body></html>", Object.fromEntries(k.funktionen.map((f) => [f.key, f.titel])));
  ergebnis.push({ datei: `pdf/${name}.pdf`, seiten: n });
}

if (kapitel.length && !NUR.length) {
  const eintraege = [];
  for (const k of kapitel) {
    eintraege.push({ key: `K${k.nr}F1`, titel: `${k.nr}  ${k.titel}`, klasse: "kap" });
    for (const f of k.funktionen) eintraege.push({ key: f.key, titel: f.titel, klasse: "fn" });
  }
  const n = await druck("00-Gesamt-Buero-Handbuch", "Gesamtausgabe", (seiten) =>
    seiteKopf("Büro-Handbuch – Gesamtausgabe") +
    deckblatt("Büro-Handbuch", "Gesamtausgabe", "Die Büro-Seite des Fahrlehrer-Kompass Schritt für Schritt erklärt: jede Funktion mit Bildern, für den Alltag im Büro.", "") +
    `<section class="verzeichnis-seite"><h1>Inhalt</h1>${verzeichnis(eintraege, seiten)}</section>` +
    kapitel.map((k) => `<header class="kapitel-kopf"><div class="kapitelnr">Kapitel ${k.nr}</div><h1>${esc(k.titel)}</h1><p>${esc(k.kurz)}</p></header>${k.html}`).join("") +
    "</body></html>", Object.fromEntries(kapitel.flatMap((k) => k.funktionen.map((f) => [f.key, f.titel]))));
  ergebnis.push({ datei: "pdf/00-Gesamt-Buero-Handbuch.pdf", seiten: n });
}
await browser.close();
if (!NUR.length) await writeFile(join(HIER, "pdf", "seiten.json"), JSON.stringify(ergebnis, null, 2) + "\n");
