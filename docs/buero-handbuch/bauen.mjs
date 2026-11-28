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

// Kapitel lesen, jede Funktion (h2) bekommt eine Kennung für das Inhaltsverzeichnis
async function leseKapitel(k) {
  let html = await readFile(join(HIER, "kapitel", k.datei + ".html"), "utf8");
  html = html.replace(/src="bilder\//g, 'src="../bilder/');
  const funktionen = [];
  let i = 0;
  html = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (m, attr, inhalt) => {
    i++;
    const key = `K${k.nr}F${i}`;
    funktionen.push({ key, titel: inhalt.replace(/<[^>]+>/g, "").trim() });
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
  <div class="unten">Handbuch zur Büro-Seite des Fahrlehrer-Kompass („Kompass Büro“) · Stand ${STAND}<br>Alle Namen und Daten in den Bildern sind erfunden (Vorführ-Modus).</div>
</section>`;
}

const browser = await chromium.launch();

// HTML → PDF, zweimal: beim ersten Mal die Seitenzahlen der Überschriften suchen, beim zweiten Mal ins Verzeichnis schreiben
async function druck(name, titel, bauHtml) {
  const htmlDatei = join(HIER, "html", name + ".html");
  const pdfDatei = join(HIER, "pdf", name + ".pdf");
  let seiten = {};
  for (let lauf = 0; lauf < 2; lauf++) {
    await writeFile(htmlDatei, bauHtml(seiten));
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
  const name = `${String(k.nr).padStart(2, "0")}-${k.titel.replace(/[,„“"]/g, "").replace(/\s+/g, "-")}`;
  const eintraege = k.funktionen.map((f) => ({ key: f.key, titel: f.titel, klasse: "fn" }));
  // Seitenzahlen im Einzel-PDF: Funktionen aus diesem Kapitel
  const n = await druck(name, `Kapitel ${k.nr}: ${k.titel}`, (seiten) =>
    seiteKopf(`Kapitel ${k.nr}: ${k.titel}`) + deckblatt(k.titel, `Kapitel ${k.nr}`, k.kurz, verzeichnis(eintraege, seiten)) + k.html + "</body></html>");
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
    "</body></html>");
  ergebnis.push({ datei: "pdf/00-Gesamt-Buero-Handbuch.pdf", seiten: n });
}
await browser.close();
if (!NUR.length) await writeFile(join(HIER, "pdf", "seiten.json"), JSON.stringify(ergebnis, null, 2) + "\n");
