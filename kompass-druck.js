/* W26 Teil 5 (27.11.2026): Einheitliches Druckbild für App und Büro (A4, Kopf mit Fahrschule und Logo, feine Linien,
   Seite x von y, Tabellen ohne Abschneiden). Nur für Druckfenster/-rahmen und @media print – die Bildschirm-Ansicht
   der Seiten ändert sich nicht. Nichts Fahrschul-Spezifisches im Code: Name, Anschrift und Logo-Slug kommen aus den Daten.
   Logo: logos/<slug>.png; fehlt die Datei, steht kein Logo und keine Lücke. Läuft ohne Browser-Oberfläche (Tests). */
(function (W) {
  "use strict";
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const FONT = 'system-ui,"Segoe UI",Helvetica,Arial,sans-serif';
  // Text für eine CSS-Zeichenkette (Randfelder): Anführungszeichen, Schrägstrich und Zeilenumbruch entschärfen
  const cssText = (t) => String(t == null ? "" : t).replace(/[\\"]/g, "").replace(/[\r\n]+/g, " ").trim();

  function logoUrl(slug) {
    const s = String(slug || "").trim();
    if (!/^[a-z0-9][a-z0-9_-]{0,60}$/i.test(s)) return "";
    try { return new URL("logos/" + s.toLowerCase() + ".png", (W.location && W.location.href) || "http://localhost/").href; } catch (e) { return ""; }
  }
  const jetztText = () => new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

  /* @page mit Randfeldern. o.links: Standard "Erstellt am …", o.mitte: z. B. Vertraulich-Hinweis, o.rechts: Titel · Seite x von y */
  function seite(o) {
    o = o || {};
    const rand = o.rand || "20mm 18mm 22mm 18mm";
    const box = (pos, inhalt) => inhalt ? `@${pos}{content:${inhalt};font:8pt ${FONT};color:#666}` : "";
    const links = o.links !== undefined ? o.links : "Erstellt am " + jetztText();
    const rechts = o.rechts !== undefined ? o.rechts : o.titel || "";
    const rechtsInhalt = `"${cssText(rechts)}${rechts ? " · " : ""}Seite " counter(page) " von " counter(pages)`;
    return `@page{size:A4 ${o.quer ? "landscape" : "portrait"};margin:${rand};${box("bottom-left", links ? `"${cssText(links)}"` : "")}${box("bottom-center", o.mitte ? `"${cssText(o.mitte)}"` : "")}${box("bottom-right", rechtsInhalt)}}`;
  }

  /* Gemeinsames Stylesheet (Text) für eigene Druckfenster und Rahmen. */
  function css(o) {
    o = o || {};
    return `${seite(o)}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font:10pt/1.5 ${FONT};color:#1c1c1c;margin:0;background:#fff}
.dkopf{display:flex;justify-content:space-between;align-items:flex-start;gap:12mm;padding-bottom:5mm;border-bottom:.6pt solid #9a9a9a;break-inside:avoid;break-after:avoid}
.dkopf .absender .name{font-size:13pt;font-weight:600;letter-spacing:.2pt;margin-bottom:1.5mm}
.dkopf .absender .zeile{font-size:9pt;color:#555;line-height:1.45}
.dlogo{flex:none;max-width:48mm;max-height:24mm;width:auto;height:auto;object-fit:contain}
.dtitel{font-size:17pt;font-weight:300;letter-spacing:.8pt;margin:9mm 0 0;break-after:avoid}
.duntertitel{font-size:10pt;color:#555;margin:1.5mm 0 0;break-after:avoid}
.dbezug{margin:5mm 0 0;padding:3mm 0;border-top:.5pt solid #cfcfcf;border-bottom:.5pt solid #cfcfcf;break-inside:avoid}
.dbezug .wer{font-size:11pt;font-weight:600}
.dbezug .zeile{font-size:9.5pt;color:#444}
.dok{margin-top:6mm}
.dok h2,.dok h3{font-size:11pt;font-weight:600;margin:6mm 0 2mm;padding-bottom:1mm;border-bottom:.5pt solid #bdbdbd;break-after:avoid;page-break-after:avoid}
.dok p{margin:0 0 2.5mm;orphans:3;widows:3}
.dkarte,.dblock{break-inside:avoid;page-break-inside:avoid;margin:0 0 4mm}
.dok table{width:100%;border-collapse:collapse;margin:2mm 0 4mm;font-size:9.5pt;table-layout:auto}
.dok thead{display:table-header-group}
.dok tfoot{display:table-footer-group}
.dok tr{break-inside:avoid;page-break-inside:avoid}
.dok th{font-size:8pt;text-transform:uppercase;letter-spacing:.6pt;color:#666;font-weight:500;text-align:left;padding:0 2mm 1.5mm 0;border-bottom:.6pt solid #9a9a9a}
.dok td{padding:1.8mm 2mm 1.8mm 0;vertical-align:top;border-bottom:.5pt solid #dcdcdc;overflow-wrap:anywhere;word-break:break-word}
.dok th.r,.dok td.r{text-align:right;white-space:nowrap}
.dok th:last-child,.dok td:last-child{padding-right:0}
.dok img,.dok svg{max-width:100%}
.dklein{font-size:8.5pt;color:#555}
.dkacheln{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin:0 0 4mm}
.dkachel{border:.5pt solid #bdbdbd;border-radius:1.5mm;padding:2.5mm 3mm;break-inside:avoid;font-size:9pt;color:#444}
.dkachel b{display:block;font-size:14pt;font-weight:600;color:#1c1c1c}
.dunterschrift{display:flex;gap:14mm;margin-top:16mm;break-inside:avoid}
.dunterschrift div{flex:1;border-top:.6pt solid #666;padding-top:1.6mm;font-size:8pt;color:#666}
.dfuss{margin-top:8mm;font-size:8.5pt;color:#666}
.nicht-drucken{display:none}
@media screen{
  body{background:#f3f4f6}
  .dseite{max-width:186mm;margin:12px auto;padding:12mm 12mm;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.18)}
  .nicht-drucken{display:flex;position:sticky;top:0;z-index:5;gap:8px;flex-wrap:wrap;justify-content:center;padding:10px;background:#f3f4f6;border-bottom:1px solid #ccc}
  .nicht-drucken button{font:inherit;font-size:15px;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid #888;background:#fff;color:#111;cursor:pointer}
  .nicht-drucken button.haupt{background:#2f6b47;border-color:#2f6b47;color:#fff}
}
@media print{.nicht-drucken{display:none !important}}`;
  }

  /* Kopf: Fahrschule (links, Name + Zeilen), Logo (rechts); darunter Titel, Untertitel, Bezug (z. B. Schüler mit Kundennummer und Anschrift).
     o.bezug = {wer, zeilen:[…]}. Leere Werte entfallen komplett. Das Logo fehlt: kein Bild, keine Lücke. */
  function kopf(o) {
    o = o || {};
    const voll = (a) => (a || []).filter((z) => z != null && String(z).trim() !== "");
    const zeilen = voll(o.zeilen);
    const hat = o.fahrschule || zeilen.length || o.logo;
    const bz = o.bezug && (o.bezug.wer || voll(o.bezug.zeilen).length) ? o.bezug : null;
    return (hat ? `<div class="dkopf"><div class="absender">${o.fahrschule ? `<div class="name">${esc(o.fahrschule)}</div>` : ""}${zeilen.map((z) => `<div class="zeile">${esc(z)}</div>`).join("")}</div>${o.logo ? `<img class="dlogo" src="${esc(o.logo)}" alt="">` : ""}</div>` : "")
      + (o.titel ? `<h1 class="dtitel">${esc(o.titel)}</h1>` : "")
      + (o.untertitel ? `<div class="duntertitel">${esc(o.untertitel)}</div>` : "")
      + (bz ? `<div class="dbezug">${bz.wer ? `<div class="wer">${esc(bz.wer)}</div>` : ""}${voll(bz.zeilen).map((z) => `<div class="zeile">${esc(z)}</div>`).join("")}</div>` : "");
  }

  /* Ganzes Dokument. o: titel, body (HTML), quer, fahrschule, zeilen, logo, untertitel, bezug, mitte, extraCss, leiste (Knöpfe „Drucken“/„Schließen“) */
  function dokument(o) {
    const titel = o.titel || "Dokument";
    const kopfHtml = kopf({ fahrschule: o.fahrschule, zeilen: o.zeilen, logo: o.logo, titel, untertitel: o.untertitel, bezug: o.bezug });
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.fenstertitel || titel)}</title>
<style>${css({ quer: o.quer, titel: o.fussTitel || titel, mitte: o.mitte, links: o.links, rechts: o.rechts, rand: o.rand })}${o.extraCss || ""}</style></head><body>
${o.leiste ? `<div class="nicht-drucken"><button class="haupt" id="dDruck" type="button">Drucken / als PDF speichern</button><button id="dZu" type="button">Schließen</button></div>` : ""}
<div class="dseite">${kopfHtml}<div class="dok">${o.body || ""}</div></div></body></html>`;
  }

  /* Bilder (Logo) müssen geladen sein, bevor gedruckt wird: höchstens ~1,5 s warten; fehlt ein Bild, wird es entfernt (keine Lücke) */
  function bereit(doc, ms) {
    const bilder = [...(doc.images || [])];
    if (!bilder.length) return Promise.resolve();
    const aufraeumen = () => bilder.forEach((img) => { if (!(img.complete && img.naturalWidth > 0)) img.remove(); });
    return Promise.race([
      Promise.all(bilder.map((img) => new Promise((ok) => {
        const fertig = () => { if (!(img.complete && img.naturalWidth > 0)) img.remove(); ok(); };
        if (img.complete) fertig(); else { img.addEventListener("load", fertig, { once: true }); img.addEventListener("error", fertig, { once: true }); }
      }))),
      new Promise((ok) => setTimeout(() => { aufraeumen(); ok(); }, ms || 1500)),
    ]);
  }

  /* Eigenes Fenster: schreibt html, wartet auf Bilder, druckt (opts.auto !== false) oder zeigt nur die Leiste mit Knöpfen (opts.auto === false).
     Liefert das Fenster oder null (Pop-up blockiert; opts.blockiert = Text für den Hinweis). */
  function fenster(titel, html, opts) {
    opts = opts || {};
    const w = W.open("", "_blank");
    if (!w) { if (typeof W.toast === "function") W.toast(opts.blockiert || "Pop-up blockiert – bitte im Browser-Menü erlauben", true); return null; }
    w.document.write(html); w.document.close();
    const k = (id, f) => { const b = w.document.getElementById && w.document.getElementById(id); if (b) b.addEventListener("click", f); };
    k("dDruck", () => w.print()); k("dZu", () => w.close());
    if (opts.auto !== false) bereit(w.document).then(() => new Promise((ok) => setTimeout(ok, 120))).then(() => { try { w.focus(); w.print(); } catch (e) { /* Fenster zu */ } });
    else { try { w.focus(); } catch (e) { /* egal */ } bereit(w.document); }
    return w;
  }

  /* Unsichtbarer Rahmen (Quittung): druckt, ohne ein Fenster zu öffnen */
  function rahmen(html, opts) {
    opts = opts || {};
    const id = opts.id || "druckRahmen";
    const alt = document.getElementById(id); if (alt) alt.remove();
    const f = document.createElement("iframe");
    f.id = id; f.setAttribute("aria-hidden", "true"); f.title = opts.titel || "Drucken";
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    const d = f.contentWindow.document; d.open(); d.write(html); d.close();
    return bereit(d).then(() => new Promise((ok) => setTimeout(ok, 150))).then(() => { try { f.contentWindow.focus(); f.contentWindow.print(); return true; } catch (e) { if (typeof W.toast === "function") W.toast("Drucken ging nicht. Bitte noch einmal versuchen.", true); return false; } });
  }

  W.DRUCK = { esc, logoUrl, seite, css, kopf, dokument, bereit, fenster, rahmen, jetztText };
  if (typeof module !== "undefined" && module.exports) module.exports = W.DRUCK;
})(typeof window !== "undefined" ? window : globalThis);
