/* Werkstatt 16 Teil 3 (25.11.2026): Lücken der Büro-Seite schließen, damit das Büro (Kristina) nur noch die Büro-Seite braucht.
   Jede Funktion folgt der Stelle in der App (index.html) mit denselben Tabellen und Regeln:
   - Buchungslinks und QR je Fahrlehrer        ← App _fsBuchungslinksHTML, routeBuchungsQR (nur profiles.slug lesen, nichts schreiben)
   - Provision von Hand                         ← App fsProvisionErfassen (provisionen, status „offen“, ohne Schüler)
   - Monatsbericht als PDF                      ← App fsMonatsberichtPDF (Druckfenster, „Als PDF speichern“; ohne Schülernamen)
   - Quote je Fahrlehrer, Prüfer-Statistik      ← App routeFahrschuleStatistik, routeFahrschulePruefer
   - Glocke: Erinnerungen per WhatsApp-Link     ← App openBellSheet, formatPhoneForWa (nur Links, nichts wird verschickt)
   Geladen vor buero.js (wie buero-verwaltung.js); buero.js ruft die Funktionen nur, wenn es sie gibt (typeof … === "function"). */
"use strict";

/* ---------- gemeinsame Kleinigkeiten ---------- */
const LU_BUCHUNG_URL = "https://serband1995-hue.github.io/Fahrlehrer-Kompass-/buchen.html"; // wie BUCHUNG_BASE_URL in der App
function luBuchLink(slug, typ) { return `${LU_BUCHUNG_URL}?typ=${typ === "automatik" ? "automatik" : "schalt"}&lehrer=${encodeURIComponent(slug)}`; }
function luTypName(typ) { return typ === "automatik" ? "Automatik" : "Schalter"; }
// Nur Info-Fenster: ein Knopf „Schließen“ statt „Abbrechen“ + „Speichern“
function luInfoFenster(titel, inhalt) {
  const dlg = oeffneDialog(titel, inhalt, async () => true, "Schließen");
  const ab = dlg.querySelector("footer [data-schliessen]"); if (ab) ab.remove();
  const ok = dlg.querySelector("footer button[value=ok]"); if (ok) ok.focus(); // kein Fokus-Rahmen auf dem ersten Feld
  return dlg;
}
async function luKopieren(text) {
  try { await navigator.clipboard.writeText(text); toast("Link kopiert"); }
  catch (e) { toast("Kopieren ging nicht. Bitte den Link markieren und mit Strg+C kopieren.", true); }
}
// QR-Code als Bild (PNG). Erzeuger: quiz-qrcode.js (Kazuhiko Arase, MIT, liegt im Repo; kein fremder Dienst). null = zu lang oder Bibliothek fehlt.
function luQrMatrix(text) {
  if (typeof qrcode !== "function") return null;
  try { const q = qrcode(0, "M"); q.addData(text, "Byte"); q.make(); return q; } catch (e) { return null; }
}
function luQrMalen(ctx, q, x0, y0, breite) {
  const n = q.getModuleCount(), rand = 4, skal = Math.floor(breite / (n + rand * 2)), gr = (n + rand * 2) * skal, ox = x0 + Math.round((breite - gr) / 2), oy = y0 + Math.round((breite - gr) / 2);
  ctx.fillStyle = "#fff"; ctx.fillRect(ox, oy, gr, gr); // heller Rand ist Pflicht, sonst scannt es nicht
  ctx.fillStyle = "#000";
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (q.isDark(i, j)) ctx.fillRect(ox + (j + rand) * skal, oy + (i + rand) * skal, skal, skal);
}
function luQrBild(text, pixel) {
  const q = luQrMatrix(text); if (!q) return null;
  const c = document.createElement("canvas"); c.width = pixel; c.height = pixel;
  luQrMalen(c.getContext("2d"), q, 0, 0, pixel);
  return c.toDataURL("image/png");
}
// Blatt wie in der App (_bqBildDatei): Überschrift, großer Code, Getriebe und Name
function luQrBlatt(link, typ, name) {
  const q = luQrMatrix(link); if (!q) return null;
  const c = document.createElement("canvas"); c.width = 1200; c.height = 1500; const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, 1200, 1500); x.fillStyle = "#111"; x.textAlign = "center";
  x.font = "bold 92px system-ui, sans-serif"; x.fillText("Fahrstunde buchen", 600, 150);
  x.font = "48px system-ui, sans-serif"; x.fillText("QR-Code mit der Handy-Kamera scannen", 600, 230);
  luQrMalen(x, q, 120, 290, 960);
  x.fillStyle = "#111";
  const unter = luTypName(typ) + (name ? " · " + name : ""); let gr = 64;
  do { x.font = `bold ${gr}px system-ui, sans-serif`; gr -= 4; } while (gr >= 28 && x.measureText(unter).width > 1100);
  x.fillText(unter, 600, 1360, 1100);
  return c.toDataURL("image/png");
}

/* ---------- 1. Buchungslinks und QR je Fahrlehrer (Seite „Fahrlehrer & Büro“) ---------- */
function luBuchungsDialog(lehrerId, typWahl) {
  const l = S.lehrer.find((x) => x.id === lehrerId);
  if (!l || !l.slug) { toast("Für diesen Fahrlehrer ist noch kein Buchungslink eingerichtet.", true); return; }
  const name = l.name || l.email || "";
  const typ = typWahl === "automatik" ? "automatik" : "schalt";
  const link = luBuchLink(l.slug, typ);
  const bild = luQrBild(link, 560);
  const zeile = (t) => `<div class="lu-link"><span class="lu-link-typ">${luTypName(t)}</span><input type="text" readonly value="${esc(luBuchLink(l.slug, t))}" aria-label="Buchungslink ${luTypName(t)}" data-entwurf><button type="button" class="knopf klein" data-lukopie="${t}">Kopieren</button></div>`;
  const inhalt = `<p class="leise">Schüler öffnen den Link oder scannen den Code und buchen direkt bei ${esc(name)}.</p>
    ${zeile("schalt")}${zeile("automatik")}
    <div class="lu-qr">
      <div class="lu-wahl" role="group" aria-label="Getriebe für den QR-Code">
        <button type="button" class="knopf klein${typ === "schalt" ? " haupt" : ""}" data-luqrtyp="schalt" aria-pressed="${typ === "schalt"}">Schalter</button>
        <button type="button" class="knopf klein${typ === "automatik" ? " haupt" : ""}" data-luqrtyp="automatik" aria-pressed="${typ === "automatik"}">Automatik</button>
      </div>
      ${bild ? `<img class="lu-qr-bild" src="${bild}" alt="QR-Code: Fahrstunde buchen, ${luTypName(typ)}, ${esc(name)}">` : `<p class="leer">Der QR-Code kann hier nicht erzeugt werden. Bitte den Link kopieren und weitergeben.</p>`}
      <div class="knopfreihe"><button type="button" class="knopf" data-luqrdruck${bild ? "" : " disabled"}>QR drucken</button><button type="button" class="knopf" data-luqrbild${bild ? "" : " disabled"}>Bild speichern</button></div>
    </div>`;
  const dlg = luInfoFenster(`Buchungslinks: ${name}`, inhalt);
  dlg.querySelectorAll("[data-lukopie]").forEach((b) => b.addEventListener("click", () => luKopieren(luBuchLink(l.slug, b.dataset.lukopie))));
  dlg.querySelectorAll("[data-luqrtyp]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.luqrtyp === typ) return;
    dlg.close(); luBuchungsDialog(lehrerId, b.dataset.luqrtyp);
  }));
  const bildKnopf = dlg.querySelector("[data-luqrbild]");
  if (bildKnopf) bildKnopf.addEventListener("click", () => {
    const url = luQrBlatt(link, typ, name); if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = `Buchungs-QR-${luTypName(typ)}-${String(name).replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g, "-")}.png`;
    document.body.appendChild(a); a.click(); a.remove(); toast("Bild gespeichert");
  });
  const druck = dlg.querySelector("[data-luqrdruck]");
  if (druck) druck.addEventListener("click", () => {
    const url = luQrBlatt(link, typ, name); if (!url) return;
    const w = window.open("", "_blank");
    if (!w) { toast("Bitte Pop-ups für das Drucken erlauben oder „Bild speichern“ nutzen.", true); return; }
    w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Buchungs-QR ${esc(luTypName(typ))}</title>
      <style>body{margin:0;font-family:system-ui,sans-serif;text-align:center}img{width:min(100%,160mm);height:auto}.nicht-drucken{margin:16px}@media print{.nicht-drucken{display:none}}</style></head>
      <body><div class="nicht-drucken"><button id="d" style="font-size:18px;min-height:44px;padding:0 20px">Drucken</button></div><img src="${url}" alt="QR-Code zum Buchen"></body></html>`);
    w.document.close(); w.focus();
    const k = w.document.getElementById("d"); if (k) k.addEventListener("click", () => w.print());
  });
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-buchlink]");
  if (b && !document.querySelector("dialog[open]")) luBuchungsDialog(b.dataset.buchlink);
});

/* ---------- 5. Provision von Hand (Seite „Verkäufe & Provision“) ---------- */
// Wie fsProvisionErfassen in der App, aber als Fenster statt prompt(): Fahrlehrer, Art, Betrag (> 0). Ohne Schüler.
// Rückgängig setzt „storniert“ (das Büro darf in provisionen nicht endgültig löschen).
function luBetrag(t) {
  const s = String(t || "").trim().replace(/\s|€/g, "");
  if (!s) return NaN;
  // 1.234,56 · 1234,56 · 1234.56 · 15
  const norm = /,/.test(s) || /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s; // „1.250“ = 1250 wie in der App
  return /^\d+(\.\d{1,2})?$/.test(norm) ? Number(norm) : NaN;
}
// Betrag mit Cent (euro() in buero.js rundet auf ganze Euro)
function luEuroCent(n) { return Number(n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function luProvisionDialog() {
  const aktive = S.lehrer.filter((l) => l.aktiv !== false);
  const body = `<div class="formular">
      <label class="voll">Fahrlehrer<select name="fahrlehrer_id" required><option value="">– bitte wählen –</option>${aktive.map((l) => `<option value="${esc(l.id)}">${esc(l.name || l.email)}</option>`).join("")}</select></label>
      <label>Wofür<select name="typ"><option value="simulator">Simulator</option><option value="akademie">Fahr-Akademie</option><option value="_frei">Anderes …</option></select></label>
      <label>Betrag in Euro<input type="text" name="betrag" inputmode="decimal" required placeholder="z. B. 15,00" autocomplete="off"></label>
      <label class="voll" id="luTypFrei" hidden>Anderes, nämlich<input type="text" name="typ_frei" maxlength="40" autocomplete="off"></label>
    </div>
    <p class="leise klein">Die Provision steht danach unter „Offene Provisionen“, bis sie als ausgezahlt markiert wird. Die Leitung sieht sie sofort, auch in der App.</p>`;
  const dlg = oeffneDialog("Provision von Hand erfassen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.fahrlehrer_id) { toast("Bitte einen Fahrlehrer wählen.", true); return false; }
    const typ = d.typ === "_frei" ? (d.typ_frei || "").trim() : d.typ;
    if (!typ) { toast("Bitte eintragen, wofür die Provision ist.", true); return false; }
    const betrag = luBetrag(d.betrag);
    if (!(betrag > 0)) { toast("Bitte einen Betrag über 0 € eintragen, z. B. 15,00.", true); return false; }
    if (betrag > 10000 && !(await bestaetige("Hoher Betrag", `${luEuroCent(betrag)} als Provision eintragen?`, "Ja, eintragen", "Abbrechen", true))) return false;
    const res = await supa.from("provisionen").insert({ fahrlehrer_id: d.fahrlehrer_id, fahrschule_id: S.fsId, typ, betrag, status: "offen" }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true); return false; }
    const neu = res.data[0];
    S.provisionen.unshift(neu);
    zeichne();
    toastUndo(`${luEuroCent(betrag)} für ${lehrerName(d.fahrlehrer_id)} eingetragen`, async () => {
      const r = await supa.from("provisionen").update({ status: "storniert" }).eq("id", neu.id).eq("status", "offen").select("id");
      if (r.error || !r.data || !r.data.length) { toast("Rückgängig ging nicht: " + (r.error ? dbFehlerText(r.error) : "schon ausgezahlt oder keine Berechtigung"), true); return; }
      neu.status = "storniert";
      toast("Provision zurückgenommen"); zeichne();
    });
    return true;
  });
  const sel = dlg.querySelector("select[name=typ]");
  sel.addEventListener("change", () => { dlg.querySelector("#luTypFrei").hidden = sel.value !== "_frei"; });
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#pvNeu") && !document.querySelector("dialog[open]")) luProvisionDialog();
});

/* ---------- 6. Quote je Fahrlehrer und Prüfer-Statistik (Seite „Statistik“) ---------- */
// Praxis-Ergebnisse mit Prüfer: pruefErgebnisse("praxis") in buero.js (je Schüler und Tag einmal, Tafel vor App, Prüfer-Name aus der App,
// sonst die Initialen von der Tafel). Eine Stelle für alle Zahlen der Statistik.
function luPraxisMitPruefer() { return pruefErgebnisse("praxis"); }
function luQuote(ok, n) { return n ? Math.round(ok / n * 100) + " %" : "–"; }
function luZahlenZusatz(f, monate) {
  const von = monate[0], bis = monate[monate.length - 1];
  const imZeitraum = (e) => e.datum.slice(0, 7) >= von && e.datum.slice(0, 7) <= bis && ergebnisPasst(e, f);
  const praxis = luPraxisMitPruefer().filter(imZeitraum);
  const theorie = pruefErgebnisse("theorie").filter(imZeitraum);
  const jeLehrer = {};
  const zaehle = (liste, k) => { for (const e of liste) { const x = S.schueler.find((y) => y.id === e.schueler_id) || {}; const id = e.fahrlehrer_id || x.fahrlehrer_id || ""; jeLehrer[id] = jeLehrer[id] || { p: { ok: 0, n: 0 }, t: { ok: 0, n: 0 } }; jeLehrer[id][k].n++; if (e.ok) jeLehrer[id][k].ok++; } };
  zaehle(praxis, "p"); zaehle(theorie, "t");
  const bereich = von + ".." + bis;
  const lehrerZeilen = Object.entries(jeLehrer).map(([id, v]) => ({ id, name: id ? lehrerName(id) : "ohne Fahrlehrer", v })).sort((a, b) => b.v.p.n - a.v.p.n || a.name.localeCompare(b.name, "de"));
  const zelle = (q) => (q.n ? `<b>${luQuote(q.ok, q.n)}</b><div class="unter">${q.ok} von ${q.n}</div>` : '<span class="leise">–</span>');
  const lt = lehrerZeilen.length ? `<table class="tabelle"><thead><tr><th>Fahrlehrer</th><th class="zahlspalte">Praxis</th><th class="zahlspalte">Theorie</th></tr></thead><tbody>${lehrerZeilen.map((z) => `<tr>
      <td>${z.id ? `<a href="${zLink({ liste: "praxis", monat: bereich, lehrer: z.id })}"><b>${esc(z.name)}</b></a>` : esc(z.name)}</td>
      <td class="zahlspalte">${zelle(z.v.p)}</td><td class="zahlspalte">${zelle(z.v.t)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="leer">Keine Prüfungsergebnisse in diesem Zeitraum.</p>`;
  const jePruefer = {};
  // gleich geschrieben = gleicher Prüfer (Groß/Klein und Leerzeichen egal); angezeigt wird die erste Schreibweise
  const nameVon = {};
  for (const e of praxis) { const roh = String(e.pruefer || "").trim().replace(/\s+/g, " "), k = roh.toLowerCase(); if (k && !nameVon[k]) nameVon[k] = roh; jePruefer[k] = jePruefer[k] || { ok: 0, n: 0, letzte: "" }; jePruefer[k].n++; if (e.ok) jePruefer[k].ok++; if (e.datum > jePruefer[k].letzte) jePruefer[k].letzte = e.datum; }
  const pz = Object.entries(jePruefer).filter(([k]) => k).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0], "de"));
  const ohne = (jePruefer[""] || { n: 0 }).n;
  const pt = pz.length ? `<table class="tabelle"><thead><tr><th>Prüfer</th><th class="zahlspalte">Quote</th></tr></thead><tbody>${pz.map(([k, v]) => `<tr><td><b>${esc(nameVon[k] || k)}</b><div class="unter">zuletzt ${esc(datumDE(v.letzte))}</div></td><td class="zahlspalte"><b>${luQuote(v.ok, v.n)}</b><div class="unter">${v.ok} von ${v.n}</div></td></tr>`).join("")}</tbody></table>`
    : `<p class="leise">Noch keine Praxisprüfung mit Prüfer in diesem Zeitraum.</p>`;
  return `<div class="raster zwei">
    <div class="karte" id="luQuoteLehrer"><h2>Bestehensquote je Fahrlehrer</h2><p class="leise klein">${esc(zeitraumText(von, bis))}. Namen anklicken für die Liste.</p>${lt}</div>
    <div class="karte" id="luPruefer"><h2>Prüfer-Statistik (Praxis)</h2><p class="leise klein">${esc(zeitraumText(von, bis))}. Name oder Initialen, wie eingetragen.${ohne ? ` ${ohne} ohne Prüfer.` : ""}</p>${pt}</div>
  </div>`;
}

/* ---------- 4. Monatsbericht als PDF (Knopf im Kopf der Statistik) ---------- */
// Wie fsMonatsberichtPDF in der App: eigenes Druckfenster, „Als PDF speichern“ im Druckdialog. Nur Summen, keine Schülernamen.
function luMonatsberichtDaten(monat) {
  const heute = KR.todayISO();
  const praxis = luPraxisMitPruefer().filter((e) => e.datum.slice(0, 7) === monat);
  const theorie = pruefErgebnisse("theorie").filter((e) => e.datum.slice(0, 7) === monat);
  const lehrer = {};
  const l = (id) => (lehrer[id] = lehrer[id] || { ue: 0, p: { ok: 0, n: 0 }, t: { ok: 0, n: 0 }, schueler: 0 });
  for (const e of praxis) { const x = S.schueler.find((y) => y.id === e.schueler_id) || {}; const z = l(e.fahrlehrer_id || x.fahrlehrer_id || ""); z.p.n++; if (e.ok) z.p.ok++; }
  for (const e of theorie) { const x = S.schueler.find((y) => y.id === e.schueler_id) || {}; const z = l(e.fahrlehrer_id || x.fahrlehrer_id || ""); z.t.n++; if (e.ok) z.t.ok++; }
  ueJeFahrlehrer(S.termine.filter((t) => t.datum && t.datum.slice(0, 7) === monat && t.datum <= heute), (fl, u) => { l(fl).ue += u; });
  for (const x of aktiveSchueler()) if (x.fahrlehrer_id) l(x.fahrlehrer_id).schueler++;
  let anm = 0; for (const x of S.schueler) { const d = anmeldeDatum(x); if (d && d.slice(0, 7) === monat) anm++; }
  const verk = S.verkaeufe.filter((v) => v.status === "bezahlt" && monatVon(v.aktualisiert_am || v.erstellt_am) === monat);
  const summe = (a) => a.reduce((s, e) => ({ ok: s.ok + (e.ok ? 1 : 0), n: s.n + 1 }), { ok: 0, n: 0 });
  return {
    monat, aktive: aktiveSchueler().length, fahrlehrer: S.lehrer.filter((x) => x.aktiv !== false).length, anm,
    praxis: summe(praxis), theorie: summe(theorie), lehrer,
    akademie: verk.filter((v) => v.typ === "akademie").length, simulator: verk.filter((v) => v.typ === "simulator").length,
    umsatz: verk.reduce((s, v) => s + Number(v.betrag || 0), 0),
    provOffen: S.provisionen.filter((p) => p.status === "offen").reduce((s, p) => s + Number(p.betrag || 0), 0),
    bisHeute: monat === heute.slice(0, 7),
  };
}
function luMonatsberichtHTML(d) {
  const schulName = (S.fs && S.fs.name) || "";
  const zeilen = Object.entries(d.lehrer).map(([id, v]) => ({ name: id ? lehrerName(id) : "ohne Fahrlehrer", v })).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const ue = (n) => zahlDE(n, 1);
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Monatsbericht ${esc(monatLang(d.monat))}</title>
  <style>
    body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:24px;line-height:1.4}
    h1{font-size:24px;margin:0 0 2px}.unter{color:#555;margin:0 0 18px}
    .kacheln{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 18px}
    .k{border:1px solid #ccc;border-radius:8px;padding:10px}.k b{display:block;font-size:22px}
    table{width:100%;border-collapse:collapse;margin:0 0 18px;font-size:14px}th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left}
    th.z,td.z{text-align:right}h2{font-size:17px;margin:18px 0 6px}.fuss{color:#666;font-size:12px;margin-top:24px}
    .nicht-drucken{margin:0 0 16px}.nicht-drucken button{font-size:16px;min-height:44px;padding:0 18px;margin-right:8px}
    @media print{.nicht-drucken{display:none}body{margin:12mm}}
  </style></head><body>
  <div class="nicht-drucken"><button id="luDruck">Drucken / als PDF speichern</button><button id="luZu">Schließen</button></div>
  <h1>Monatsbericht ${esc(monatLang(d.monat))}</h1>
  <p class="unter">${esc(schulName)}${d.bisHeute ? " · Stand " + esc(datumDE(KR.todayISO())) + " (Monat läuft noch)" : ""}</p>
  <div class="kacheln">
    <div class="k"><b>${d.aktive}</b>aktive Schüler</div>
    <div class="k"><b>${d.fahrlehrer}</b>Fahrlehrer</div>
    <div class="k"><b>${d.anm}</b>Anmeldungen im Monat</div>
    <div class="k"><b>${luQuote(d.praxis.ok, d.praxis.n)}</b>Praxis bestanden (${d.praxis.ok} von ${d.praxis.n})</div>
    <div class="k"><b>${luQuote(d.theorie.ok, d.theorie.n)}</b>Theorie bestanden (${d.theorie.ok} von ${d.theorie.n})</div>
    <div class="k"><b>${esc(euro(d.umsatz))}</b>Akademie & Simulator bezahlt (${d.akademie + d.simulator})</div>
  </div>
  <h2>Je Fahrlehrer</h2>
  <table><thead><tr><th>Fahrlehrer</th><th class="z">aktive Schüler</th><th class="z">Unterrichtseinheiten</th><th class="z">Praxis</th><th class="z">Theorie</th></tr></thead><tbody>
  ${zeilen.map((z) => `<tr><td>${esc(z.name)}</td><td class="z">${z.v.schueler}</td><td class="z">${ue(z.v.ue)}</td><td class="z">${z.v.p.n ? `${z.v.p.ok} von ${z.v.p.n} (${luQuote(z.v.p.ok, z.v.p.n)})` : "–"}</td><td class="z">${z.v.t.n ? `${z.v.t.ok} von ${z.v.t.n} (${luQuote(z.v.t.ok, z.v.t.n)})` : "–"}</td></tr>`).join("") || `<tr><td colspan="5">Keine Daten in diesem Monat.</td></tr>`}
  </tbody></table>
  <h2>Verkäufe und Provision</h2>
  <table><tbody>
    <tr><td>Fahr-Akademie bezahlt</td><td class="z">${d.akademie}</td></tr>
    <tr><td>Simulator bezahlt</td><td class="z">${d.simulator}</td></tr>
    <tr><td>Umsatz Akademie & Simulator</td><td class="z">${esc(euro(d.umsatz))}</td></tr>
    <tr><td>Provision an Fahrlehrer offen (heute)</td><td class="z">${esc(euro(d.provOffen))}</td></tr>
  </tbody></table>
  <p class="fuss">Erstellt am ${esc(datumDE(KR.todayISO()))} mit dem Kompass Büro. Zahlen sind nur so vollständig wie die Daten im Kompass.</p>
  </body></html>`;
}
function luMonatsberichtOeffnen(monat) {
  const w = window.open("", "_blank");
  if (!w) { toast("Bitte Pop-ups für den Monatsbericht erlauben.", true); return false; }
  w.document.write(luMonatsberichtHTML(luMonatsberichtDaten(monat)));
  w.document.close(); w.focus();
  const k = (id, fn) => { const b = w.document.getElementById(id); if (b) b.addEventListener("click", fn); };
  k("luDruck", () => w.print()); k("luZu", () => w.close());
  return true;
}
function luMonatsberichtDialog() {
  const monate = letzteMonate(12).reverse();
  const body = `<div class="formular"><label class="voll">Monat<select name="monat">${monate.map((m, i) => `<option value="${m}"${i === 0 ? " selected" : ""}>${esc(monatLang(m))}${i === 0 ? " (läuft noch)" : ""}</option>`).join("")}</select></label></div>
    <p class="leise klein">Öffnet sich in neuem Fenster; dort als PDF speichern oder drucken. Nur Summen, keine Schülernamen.</p>`;
  oeffneDialog("Monatsbericht", body, async (form) => luMonatsberichtOeffnen(new FormData(form).get("monat")), "Zeigen");
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#kMonatsbericht") && !document.querySelector("dialog[open]")) luMonatsberichtDialog();
});

/* ---------- 3. Glocke: Erinnerungen für morgen und Geburtstage heute (Kopf der Büro-Seite) ---------- */
// Wie openBellSheet in der App, aber für alle Fahrlehrer der Fahrschule. Nur Links zu WhatsApp (wa.me): das Büro tippt,
// WhatsApp öffnet sich mit fertigem Text, abgeschickt wird dort von Hand. Nichts wird gespeichert oder automatisch verschickt.
// Telefonnummer wie formatPhoneForWa in der App: nur Ziffern, 00… → …, 0… → 49….
function luWaNummer(tel) {
  let d = String(tel || "").replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "49" + d.slice(1);
  return d;
}
function luWaLink(tel, text) { const n = luWaNummer(tel); return `https://wa.me/${n || ""}?text=${encodeURIComponent(text)}`; }
function luVorname(name) { return String(name || "").trim().split(/\s+/)[0] || ""; }
function luGlockeEintraege() {
  if (!S.geladenAm) return { morgen: [], geburtstage: [], tag: "" };
  const heute = KR.todayISO(), morgen = KR.addDaysISO(heute, 1);
  const sx = (id) => S.schueler.find((y) => y.id === id && y.status !== "geloescht" && istAktiv(y)); // Archiv: keine Erinnerung
  const morgenListe = [];
  // Wie die App (DB.lessons): Fahrstunden samt Sonder-/Nachtfahrt und Schaltkompetenz, dazu Prüfungen; abgebrochen nicht (Status wie sonst im Büro: payload zuerst)
  const ARTEN_GLOCKE = KR.FAHR_ARTEN.concat(["schalt", "pruefung"]);
  const termine = S.termine.filter((t) => t.datum === morgen && !t.geloescht && ((t.payload || {}).status || t.status) !== "abgebrochen" && t.schueler_id && ARTEN_GLOCKE.includes(t.art || "fahrstunde"));
  for (const t of termine) {
    const x = sx(t.schueler_id); if (!x) continue;
    const pruefung = t.art === "pruefung";
    morgenListe.push({ key: "t:" + t.id, x, von: t.von || "", fahrlehrer_id: t.fahrlehrer_id, art: pruefung ? "Prüfung" : (ARTEN[t.art] || "Fahrstunde"), pruefung });
  }
  // Prüfungen von der Tafel ohne Kalender-Eintrag (z. B. Theorie oder ohne Uhrzeit/Fahrlehrer)
  for (const p of S.pruefungstermine) {
    if (p.datum !== morgen || p.status !== "geplant") continue;
    if (p.kalender_termin_id && S.termine.some((t) => t.id === p.kalender_termin_id && !t.geloescht)) continue;
    if (p.art !== "theorie" && morgenListe.some((m) => m.pruefung && m.x.id === p.schueler_id)) continue; // dieselbe Prüfung schon aus dem Kalender
    const x = sx(p.schueler_id); if (!x) continue;
    morgenListe.push({ key: "p:" + p.id, x, von: p.von || "", fahrlehrer_id: p.fahrlehrer_id, art: p.art === "theorie" ? "Theorieprüfung" : "Prüfung", pruefung: true });
  }
  morgenListe.sort((a, b) => (a.von || "99").localeCompare(b.von || "99") || a.x.name.localeCompare(b.x.name, "de"));
  const md = heute.slice(5);
  // Geburtsdatum steht wie alle Ausbildungsangaben der App in schueler.ausbildung (jsonb)
  const geb = (x) => String((x.ausbildung || {}).geburtsdatum || x.geburtsdatum || "");
  const geburtstage = aktiveSchueler().filter((x) => geb(x).slice(5, 10) === md);
  return { morgen: morgenListe, geburtstage, tag: morgen };
}
function luGlockeText(e) {
  const vn = luVorname(e.x.name);
  const zeit = e.von ? ` um ${e.von} Uhr` : "";
  return e.pruefung
    ? `Hey ${vn}! Kurze Erinnerung: morgen${zeit} ist deine Prüfung. Viel Erfolg! 🍀🚗`
    : `Hey ${vn}! Kurze Erinnerung: morgen${zeit} ist deine Fahrstunde. Bis dann! 🚗`;
}
// „Gesendet“ merkt sich nur dieses Gerät (Gerätespeicher, nur Kennungen und Tag, keine Namen); gilt bis zum Tag danach.
const LU_GESENDET_KEY = "buero-glocke-gesendet";
function luGesendet() { try { const m = JSON.parse(localStorage.getItem(LU_GESENDET_KEY) || "{}"); return m && typeof m === "object" ? m : {}; } catch (e) { return {}; } }
function luGesendetSetzen(k) {
  const heute = KR.todayISO(), m = luGesendet();
  for (const x of Object.keys(m)) if (m[x] < heute) delete m[x]; // Altes weg
  m[k] = heute;
  try { localStorage.setItem(LU_GESENDET_KEY, JSON.stringify(m)); } catch (e) { /* ohne Speicher: nur nicht abgehakt */ }
}
function luGlockeKey(e, tag) { return e.key + "|" + tag; }
function luGlockeAuffrischen() {
  const k = $("glocke"); if (!k) return;
  if (!S.geladenAm) { k.hidden = true; return; }
  const e = luGlockeEintraege(), ges = luGesendet(), heute = KR.todayISO();
  const n = e.morgen.filter((m) => !ges[luGlockeKey(m, e.tag)]).length + e.geburtstage.filter((x) => !ges["g:" + x.id + "|" + heute]).length;
  k.hidden = false;
  const z = $("glockeZahl");
  if (z) { z.textContent = n ? String(n) : ""; z.hidden = !n; }
  k.setAttribute("aria-label", n ? `Erinnerungen: ${n} offen` : "Erinnerungen: nichts offen");
}
function luGlockeFenster() {
  const e = luGlockeEintraege(), ges = luGesendet(), heute = KR.todayISO();
  const zeile = (k, oben, unten, link) => {
    const war = !!ges[k];
    return `<li class="lu-gl-zeile${war ? " gesendet" : ""}"><span class="lu-gl-text"><span>${oben}</span><span class="leise klein">${unten}${war ? " · ✓ gesendet" : ""}</span></span>${link ? `<a class="knopf klein" href="${esc(link)}" target="_blank" rel="noopener" data-lugesendet="${esc(k)}">WhatsApp</a>` : ""}</li>`;
  };
  const geb = e.geburtstage.map((x) => zeile("g:" + x.id + "|" + heute, `🎂 <b>${esc(x.name)}</b>`, x.fahrlehrer_id ? esc(lehrerName(x.fahrlehrer_id)) : "Geburtstag heute",
    x.telefon ? luWaLink(x.telefon, `Alles Gute zum Geburtstag, ${luVorname(x.name)}! 🎉`) : "")).join("");
  const mor = e.morgen.map((m) => zeile(luGlockeKey(m, e.tag), `<b>${esc(m.von || "–")}</b> ${m.pruefung ? "🏆 " : ""}<b>${esc(m.x.name)}</b>`,
    `${esc(m.art)}${m.fahrlehrer_id ? " · " + esc(lehrerName(m.fahrlehrer_id)) : ""}${luWaNummer(m.x.telefon) ? "" : " · keine Nummer"}`, luWaLink(m.x.telefon, luGlockeText(m)))).join("");
  const inhalt = `<p class="leise klein">„WhatsApp“ öffnet den fertigen Text; abgeschickt wird dort von Hand.</p>
    <h3 class="lu-gl-titel">Heute Geburtstag</h3>${geb ? `<ul class="lu-gl-liste">${geb}</ul>` : `<p class="leise">Heute hat niemand Geburtstag.</p>`}
    <h3 class="lu-gl-titel">Morgen, ${esc(datumDE(e.tag))}</h3>${mor ? `<ul class="lu-gl-liste">${mor}</ul>` : `<p class="leise">Morgen stehen keine Fahrstunden oder Prüfungen an.</p>`}`;
  const dlg = luInfoFenster("Erinnerungen", inhalt);
  dlg.querySelectorAll("[data-lugesendet]").forEach((a) => a.addEventListener("click", () => {
    luGesendetSetzen(a.dataset.lugesendet);
    const li = a.closest(".lu-gl-zeile"); if (li && !li.classList.contains("gesendet")) { li.classList.add("gesendet"); const u = li.querySelector(".lu-gl-text .klein"); if (u) u.textContent += " · ✓ gesendet"; }
    luGlockeAuffrischen();
  }));
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#glocke") && !document.querySelector("dialog[open]")) luGlockeFenster();
});

/* ---------- Serientermine (Turboboost) in der Schüler-Akte ---------- */
// Wie fsSerientermineSheet in der App: nur für Schüler mit Paket „Turboboost“, Fahrlehrer des Schülers, 90 Minuten,
// Fahrstunde oder Sonderfahrt, täglich / jeden 2. Tag / wöchentlich, 1–20 Termine, gleiche Zeilen in kalender_termine.
// Dazu wie im Termin-Fenster: Zahlung ausstehend sperrt, Urlaub und belegte Zeiten warnen („Abbrechen“ ist Hauptknopf).
function luIstTurbo(x) { return !!x && !!x.paket_id && (S.pakete || []).some((pk) => pk.id === x.paket_id && pk.name === "Turboboost"); }
function luSerienTage(start, intervall, anzahl) {
  const out = []; let d = start;
  for (let i = 0; i < anzahl; i++) { out.push(d); d = KR.addDaysISO(d, intervall); }
  return out;
}
// W22: Umschreiber (Büro-Spalte) bekommen keine Sonderfahrten. istUmschreiber steht in buero.js.
function luUmschreiber(x) { return typeof istUmschreiber === "function" ? istUmschreiber(x) : String((x && x.ausbildungsart) || "") === "umschreibung"; }
function luSerienDialog(sid) {
  const x = S.schueler.find((y) => y.id === sid);
  if (!x) return;
  if (!x.fahrlehrer_id) { toast("Erst einen Fahrlehrer zuweisen, dann gehen Serientermine.", true); return; }
  const body = `<div class="formular">
      <p class="voll leise klein">Für ${esc(x.name)} bei ${esc(lehrerName(x.fahrlehrer_id))}. Jeder Termin dauert 90 Minuten.</p>
      <label>Erster Tag<input type="date" name="start" required value="${esc(KR.addDaysISO(KR.todayISO(), 1))}"></label>
      <label>Uhrzeit<input type="time" name="von" required value="10:00"></label>
      <label>Art<select name="art"><option value="fahrstunde">Fahrstunde</option>${luUmschreiber(x) ? "" : '<option value="sonder">Sonderfahrt</option>'}</select></label>
      ${luUmschreiber(x) ? '<p class="voll leise klein">Umschreiber: keine Sonderfahrten, nur Fahrstunden.</p>' : ""}
      <label>Wie oft<select name="intervall"><option value="1">täglich</option><option value="2">jeden 2. Tag</option><option value="7">wöchentlich</option></select></label>
      <label>Anzahl Termine<input type="number" name="anzahl" min="1" max="20" value="5" required></label>
      <p class="voll leise klein" id="luSerieVorschau" aria-live="polite"></p>
    </div>`;
  const dlg = oeffneDialog("Serientermine (Turboboost)", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    const anzahl = Math.round(Number(d.anzahl));
    if (!d.start || !d.von) { toast("Bitte ersten Tag und Uhrzeit eintragen.", true); return false; }
    if (!(anzahl >= 1 && anzahl <= 20)) { toast("Bitte 1 bis 20 Termine wählen.", true); return false; }
    if (d.art === "sonder" && luUmschreiber(x)) { toast("Umschreiber: keine Sonderfahrten. Bitte „Fahrstunde“ wählen.", true); return false; } // W22
    if (bueroGesperrt(x) && d.start >= KR.todayISO()) { toast(ZAHLUNG_MELDUNG, true); return false; }
    const bis = plusMinuten(d.von, 90);
    if (KR.hm2min(bis) <= KR.hm2min(d.von)) { toast("Zu spät am Tag für 90 Minuten.", true); return false; }
    const tage = luSerienTage(d.start, Number(d.intervall) || 1, anzahl);
    const belegt = tage.filter((t) => S.termine.some((y) => !y.geloescht && y.fahrlehrer_id === x.fahrlehrer_id && y.datum === t && y.von && y.bis && KR.hm2min(y.von) < KR.hm2min(bis) && KR.hm2min(y.bis) > KR.hm2min(d.von)));
    if (belegt.length && !(await bestaetige("Zeit schon belegt", `${lehrerName(x.fahrlehrer_id)} hat an ${belegt.length === 1 ? "1 Tag" : belegt.length + " Tagen"} um diese Zeit schon einen Termin (${belegt.map(datumDE).join(", ")}). Trotzdem alle anlegen?`, "Trotzdem anlegen", "Abbrechen", true))) return false;
    if (typeof vwUrlaubWarnen === "function" && !(await vwUrlaubWarnen(x.fahrlehrer_id, tage, "Trotzdem alle anlegen?", "Trotzdem anlegen"))) return false;
    const jetzt = new Date().toISOString();
    const zeilen = tage.map((t, i) => ({ id: "b" + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 6), fahrschule_id: S.fsId, fahrlehrer_id: x.fahrlehrer_id, schueler_id: sid,
      datum: t, von: d.von, bis, art: d.art === "sonder" ? "sonder" : "fahrstunde", status: "geplant", geloescht: false, payload: {}, erstellt_von: S.user.id, aktualisiert_am: jetzt }));
    const res = await supa.from("kalender_termine").insert(zeilen).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht angelegt: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true); return false; }
    S.termine.push(...res.data);
    zeichne();
    // Rückgängig wie beim Absagen: alle eben angelegten Termine wieder weg (geloescht: true, Büro löscht nie endgültig)
    toastUndo(`${res.data.length} Termine angelegt`, async () => {
      const ids = res.data.map((y) => y.id);
      const r = await supa.from("kalender_termine").update({ geloescht: true, aktualisiert_am: new Date().toISOString() }).in("id", ids).select("id");
      if (r.error || !r.data || !r.data.length) { toast("Rückgängig ging nicht: " + (r.error ? dbFehlerText(r.error) : "keine Berechtigung"), true); return; }
      S.termine = S.termine.filter((y) => !ids.includes(y.id));
      toast("Serientermine zurückgenommen"); zeichne();
    });
    return true;
  }, "Termine anlegen");
  const vorschau = () => {
    const f = dlg.querySelector("form"), n = Math.round(Number(f.anzahl.value));
    const el = dlg.querySelector("#luSerieVorschau");
    if (!f.start.value || !(n >= 1 && n <= 20)) { el.textContent = ""; return; }
    const tage = luSerienTage(f.start.value, Number(f.intervall.value) || 1, n);
    el.textContent = `${n === 1 ? "1 Termin" : n + " Termine"}: ${datumDE(tage[0])}${n > 1 ? " bis " + datumDE(tage[n - 1]) : ""}`;
  };
  dlg.querySelector("form").addEventListener("input", vorschau);
  dlg.querySelector("form").addEventListener("change", vorschau);
  vorschau();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-luserie]");
  if (b && b.closest("dialog[open]")) luSerienDialog(b.dataset.luserie);
});

/* ---------- Heute › „Fristen und Warnungen“: Erste Hilfe unbezahlt, lange ohne Fahrstunde (Hauptsitzung 25.11.2026) ---------- */
// Erste Hilfe: Termine der Art „ersthilfe“ mit kurs_bezahlt = false (wie der Schalter „Bezahlt“ der App, fsKursBezahltToggle).
function luErsteHilfeOffen() {
  // Nur ab 60 Tagen zurück: der App-Schalter war lange nicht erreichbar, ältere Kurse stünden sonst alle als „unbezahlt“ da (Fable)
  const ab = KR.addDaysISO(KR.todayISO(), -60);
  return S.termine.filter((t) => t.art === "ersthilfe" && !t.geloescht && t.datum >= ab && ((t.payload || {}).status || t.status) !== "abgebrochen" && "kurs_bezahlt" in t && !t.kurs_bezahlt)
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.von || "").localeCompare(String(b.von || "")));
}
// Wie App routeFahrschuleStatistik: aktive Schüler, deren letzte Fahrstunde (auch geplante) über 28 Tage zurückliegt oder die keine haben.
// Zusätzlich hier: nicht, wer die Praxisprüfung schon hat, keinen Fahrlehrer hat oder sich erst in den letzten 28 Tagen angemeldet hat.
function luLangeOhneFahrstunde() {
  const vor28 = KR.addDaysISO(KR.todayISO(), -28);
  const letzte = {};
  for (const t of S.termine) {
    if (t.geloescht || !t.schueler_id || !KR.FAHR_ARTEN.concat(["schalt"]).includes(t.art || "fahrstunde") || ((t.payload || {}).status || t.status) === "abgebrochen") continue;
    if (!letzte[t.schueler_id] || t.datum > letzte[t.schueler_id]) letzte[t.schueler_id] = t.datum;
  }
  const bestanden = new Set(pruefErgebnisse("praxis").filter((e) => e.ok).map((e) => e.schueler_id)); // auch nur in der App eingetragen
  return aktiveSchueler().filter((x) => {
    if (!x.fahrlehrer_id || x.praxis_bestanden_am || bestanden.has(x.id)) return false;
    const anm = anmeldeDatum(x);
    if (!letzte[x.id] && anm && anm >= vor28) return false;
    return !letzte[x.id] || letzte[x.id] < vor28;
  }).map((x) => ({ x, letzte: letzte[x.id] || null })).sort((a, b) => String(a.letzte || "").localeCompare(String(b.letzte || "")));
}
function luHeuteHinweise() {
  const out = [], eh = luErsteHilfeOffen(), weg = luLangeOhneFahrstunde();
  if (eh.length) out.push(`<a class="aufgabe" href="#heute" data-luliste="ersthilfe"><b>${eh.length}</b> Erste-Hilfe-${eh.length === 1 ? "Kurs" : "Kurse"} noch nicht bezahlt</a>`);
  if (weg.length) out.push(`<a class="aufgabe" href="#heute" data-luliste="ohnefahrt"><b>${weg.length}</b> Schüler seit über 4 Wochen ohne Fahrstunde</a>`);
  return out;
}
function luListeErsteHilfe() {
  const eh = luErsteHilfeOffen();
  const zeilen = eh.map((t) => `<li class="lu-gl-zeile"><span class="lu-gl-text"><span><b>${esc(schuelerName(t.schueler_id) || t.interessent_name || "ohne Namen")}</b></span><span class="leise klein">${esc(datumDE(t.datum))}${t.von ? " · " + esc(t.von) + " Uhr" : ""}${t.fahrlehrer_id ? " · " + esc(lehrerName(t.fahrlehrer_id)) : ""}</span></span><button type="button" class="knopf klein" data-luehbezahlt="${esc(t.id)}">Bezahlt</button></li>`).join("");
  const dlg = luInfoFenster("Erste Hilfe: noch nicht bezahlt", zeilen ? `<ul class="lu-gl-liste">${zeilen}</ul>` : `<p class="leise">Alle Kurse sind bezahlt.</p>`);
  dlg.querySelectorAll("[data-luehbezahlt]").forEach((b) => b.addEventListener("click", async () => {
    if (b.disabled) return; b.disabled = true;
    const id = b.dataset.luehbezahlt, t = S.termine.find((y) => y.id === id);
    const res = await supa.from("kalender_termine").update({ kurs_bezahlt: true }).eq("id", id).select("id");
    if (res.error || !res.data || !res.data.length) { b.disabled = false; toast("Nicht gespeichert: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true); return; }
    if (t) t.kurs_bezahlt = true;
    const li = b.closest("li"); if (li) li.remove();
    zeichne();
    toastUndo("Als bezahlt vermerkt", async () => {
      const r = await supa.from("kalender_termine").update({ kurs_bezahlt: false }).eq("id", id).select("id");
      if (r.error || !r.data || !r.data.length) { toast("Rückgängig ging nicht: " + (r.error ? dbFehlerText(r.error) : "keine Berechtigung"), true); return; }
      if (t) t.kurs_bezahlt = false;
      toast("Wieder offen"); zeichne();
    });
  }));
}
function luListeOhneFahrt() {
  const weg = luLangeOhneFahrstunde();
  const zeilen = weg.map(({ x, letzte }) => `<li class="lu-gl-zeile"><span class="lu-gl-text"><span><b>${esc(x.name)}</b></span><span class="leise klein">${esc(lehrerName(x.fahrlehrer_id))} · ${letzte ? "letzte Fahrstunde " + esc(datumDE(letzte)) : "noch keine Fahrstunde"}</span></span><button type="button" class="knopf klein" data-luakte="${esc(x.id)}">Akte</button></li>`).join("");
  const dlg = luInfoFenster("Seit über 4 Wochen ohne Fahrstunde", `<p class="leise klein">Nachfassen: Will der Schüler weitermachen? Gezählt werden auch geplante Fahrstunden.</p>${zeilen ? `<ul class="lu-gl-liste">${zeilen}</ul>` : `<p class="leise">Niemand.</p>`}`);
  dlg.querySelectorAll("[data-luakte]").forEach((b) => b.addEventListener("click", () => schuelerDialog(b.dataset.luakte)));
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-luliste]");
  if (!a || document.querySelector("dialog[open]")) return;
  e.preventDefault();
  if (a.dataset.luliste === "ersthilfe") luListeErsteHilfe(); else luListeOhneFahrt();
});
