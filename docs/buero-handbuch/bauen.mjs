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
    return `<h2${attr} id="${key}">${inhalt}<span class="unsichtbar">@@${key}@@</span></h2>`;
  });
  return { ...k, html, funktionen };
}

const seiteKopf = (titel) => `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${esc(titel)}</title>
<link rel="stylesheet" href="../../../fonts/fonts.css"><link rel="stylesheet" href="../handbuch.css"></head><body>`;

function verzeichnis(eintraege, seiten) {
  return `<ul class="verzeichnis">${eintraege.map((e) => `<li class="${e.klasse}"><a class="t" href="#${e.key}">${esc(e.titel)}</a><span class="p"></span><span class="s">${seiten[e.key] ?? "00"}</span></li>`).join("")}</ul>`;
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

// HTML → PDF: so oft drucken, bis die Seitenzahlen im Verzeichnis stabil sind (echte Zahlen können das Verzeichnis
// länger machen und alles verschieben), danach jeden Eintrag prüfen.
async function druck(name, titel, bauHtml, pruefTitel = {}) {
  const htmlDatei = join(HIER, "html", name + ".html");
  const pdfDatei = join(HIER, "pdf", name + ".pdf");
  const drucke = async (html) => {
    await writeFile(htmlDatei, html);
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
  };
  // Seite jeder Überschrift: Jeder Verzeichnis-Eintrag ist ein Link auf seine Überschrift (id = Kennung).
  // Chromium legt dafür im PDF ein Sprungziel an; dessen Seite lesen wir mit pypdf. (Die Text-Suchmarken waren
  // unzuverlässig: auf Seiten mit Seitenumbruch davor fehlten Buchstaben im PDF-Text.)
  const zielSeiten = () => JSON.parse(execFileSync("python3", ["-c", `
import sys, json
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
print(json.dumps({k.lstrip("/"): r.get_destination_page_number(d) + 1 for k, d in r.named_destinations.items()}))
`, pdfDatei]).toString());
  const keys = Object.keys(pruefTitel);
  let seiten = {}, stabil = false;
  for (let lauf = 0; lauf < 6; lauf++) {
    await drucke(bauHtml(seiten));
    const alle = zielSeiten();
    const neu = Object.fromEntries(keys.filter((k) => k in alle).map((k) => [k, alle[k]]));
    stabil = JSON.stringify(neu) === JSON.stringify(seiten);
    seiten = neu;
    if (stabil) break;
  }
  // Die unsichtbaren Suchmarken bleiben im PDF: ohne sie verschiebt Chromium im Gesamt-PDF einzelne Seiten (geprüft 28.11.2026).
  // Folge: Beim Suchen/Kopieren im PDF-Text taucht „@@K1F2@@“ auf; sichtbar sind sie nicht.
  // Prüfung über ALLE Einträge: Sprungziel vorhanden, Seite wie im Verzeichnis, Überschrift steht auf dieser Seite, nirgends „00“.
  const endgueltig = zielSeiten();
  const norm = (t) => t.replace(/\s+/g, " ").replace(/[‚‘’„“"]/g, "").replace(/-/g, "").trim();
  let falsch = 0;
  const fehl = (t) => { falsch++; if (falsch <= 8) console.log(`   ! ${t}`); };
  for (const key of keys) {
    if (!(key in endgueltig)) { fehl(`kein Sprungziel für „${pruefTitel[key]}“`); continue; }
    if (endgueltig[key] !== seiten[key]) fehl(`„${pruefTitel[key]}“: Verzeichnis sagt ${seiten[key]}, steht auf ${endgueltig[key]}`);
    const text = norm(execFileSync("pdftotext", ["-f", String(endgueltig[key]), "-l", String(endgueltig[key]), pdfDatei, "-"]).toString());
    if (!text.includes(norm(pruefTitel[key]).slice(0, 28))) fehl(`„${pruefTitel[key]}“ nicht auf Seite ${endgueltig[key]}`);
  }
  if (bauHtml(seiten).includes('<span class="s">00</span>')) fehl("„00“ im Verzeichnis");
  if (!stabil) fehl("Seitenzahlen nach 6 Läufen nicht stabil");
  if (falsch) { console.log(`FEHL pdf/${name}.pdf: ${falsch} Fehler im Verzeichnis`); process.exitCode = 1; }
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
    eintraege.push({ key: `K${k.nr}`, titel: `${k.nr}  ${k.titel}`, klasse: "kap" });
    for (const f of k.funktionen) eintraege.push({ key: f.key, titel: f.titel, klasse: "fn" });
  }
  const n = await druck("00-Gesamt-Buero-Handbuch", "Gesamtausgabe", (seiten) =>
    seiteKopf("Büro-Handbuch – Gesamtausgabe") +
    deckblatt("Büro-Handbuch", "Gesamtausgabe", "Die Büro-Seite des Fahrlehrer-Kompass Schritt für Schritt erklärt: jede Funktion mit Bildern, für den Alltag im Büro.", "") +
    `<section class="verzeichnis-seite"><h1>Inhalt</h1>${verzeichnis(eintraege, seiten)}</section>` +
    kapitel.map((k) => `<header class="kapitel-kopf" id="K${k.nr}"><div class="kapitelnr">Kapitel ${k.nr}</div><h1>${esc(k.titel)}</h1><p>${esc(k.kurz)}</p></header>${k.html}`).join("") +
    "</body></html>", Object.fromEntries(kapitel.flatMap((k) => [[`K${k.nr}`, k.titel], ...k.funktionen.map((f) => [f.key, f.titel])])));
  ergebnis.push({ datei: "pdf/00-Gesamt-Buero-Handbuch.pdf", seiten: n });
}
await browser.close();
if (!NUR.length) await writeFile(join(HIER, "pdf", "seiten.json"), JSON.stringify(ergebnis, null, 2) + "\n");
