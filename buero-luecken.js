/* Werkstatt 16 Teil 3 (25.11.2026): Lücken der Büro-Seite schließen, damit das Büro (Kristina) nur noch die Büro-Seite braucht.
   Jede Funktion folgt der Stelle in der App (index.html) mit denselben Tabellen und Regeln:
   - Buchungslinks und QR je Fahrlehrer        ← App _fsBuchungslinksHTML, routeBuchungsQR (nur profiles.slug lesen, nichts schreiben)
   - Provision von Hand                         ← App fsProvisionErfassen (provisionen, status „offen“, ohne Schüler)
   - Monatsbericht als PDF                      ← App fsMonatsberichtPDF (Druckfenster, „Als PDF speichern“; ohne Schülernamen)
   - Quote je Fahrlehrer, Prüfer-Statistik      ← App routeFahrschuleStatistik, routeFahrschulePruefer
   - Glocke: Erinnerungen per WhatsApp-Link     ← App openBellSheet, formatPhoneForWa (nur Links, nichts wird verschickt)
   Geladen nach buero.js; buero.js ruft die Funktionen nur, wenn es sie gibt (typeof … === "function"). */
"use strict";

/* ---------- gemeinsame Kleinigkeiten ---------- */
const LU_BUCHUNG_URL = "https://serband1995-hue.github.io/Fahrlehrer-Kompass-/buchen.html"; // wie BUCHUNG_BASE_URL in der App
function luBuchLink(slug, typ) { return `${LU_BUCHUNG_URL}?typ=${typ === "automatik" ? "automatik" : "schalt"}&lehrer=${encodeURIComponent(slug)}`; }
function luTypName(typ) { return typ === "automatik" ? "Automatik" : "Schalter"; }
// Nur Info-Fenster: ein Knopf „Schließen“ statt „Abbrechen“ + „Speichern“
function luInfoFenster(titel, inhalt) {
  const dlg = oeffneDialog(titel, inhalt, async () => true, "Schließen");
  const ab = dlg.querySelector("footer [data-schliessen]"); if (ab) ab.remove();
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
  const norm = /,/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s;
  return /^\d+(\.\d{1,2})?$/.test(norm) ? Number(norm) : NaN;
}
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
    if (betrag > 10000 && !(await bestaetige("Hoher Betrag", `${euro(betrag)} als Provision eintragen?`, "Ja, eintragen", "Abbrechen", true))) return false;
    const res = await supa.from("provisionen").insert({ fahrlehrer_id: d.fahrlehrer_id, fahrschule_id: S.fsId, typ, betrag, status: "offen" }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true); return false; }
    const neu = res.data[0];
    S.provisionen.unshift(neu);
    zeichne();
    toastUndo(`${euro(betrag)} für ${lehrerName(d.fahrlehrer_id)} eingetragen`, async () => {
      const r = await supa.from("provisionen").update({ status: "storniert" }).eq("id", neu.id).select("id");
      if (r.error || !r.data || !r.data.length) { toast("Rückgängig ging nicht: " + (r.error ? dbFehlerText(r.error) : "keine Berechtigung"), true); return; }
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
// Praxis-Ergebnisse wie pruefErgebnisse("praxis") (je Schüler und Tag einmal, Tafel vor App), dazu der Prüfer:
// der volle Name aus der App (kalender_pruefungen.pruefer), sonst die Initialen von der Prüfungstafel.
function luPraxisMitPruefer() {
  const map = {};
  for (const e of S.pruefungen) {
    if ((e.payload || {}).b197) continue;
    const ok = e.result === "pass" || e.result === "bestanden", nein = e.result === "fail" || e.result === "nicht_bestanden";
    if ((ok || nein) && e.datum) map[e.schueler_id + "|" + e.datum] = { datum: e.datum, ok, schueler_id: e.schueler_id, fahrlehrer_id: e.fahrlehrer_id || null, klasse: null, pruefer: String(e.pruefer || (e.payload || {}).pruefer || "").trim() };
  }
  for (const p of S.pruefungstermine) {
    if (p.art !== "praxis" || (p.status !== "bestanden" && p.status !== "nicht_bestanden")) continue;
    const alt = map[p.schueler_id + "|" + p.datum];
    map[p.schueler_id + "|" + p.datum] = { datum: p.datum, ok: p.status === "bestanden", schueler_id: p.schueler_id, fahrlehrer_id: p.fahrlehrer_id, klasse: p.klasse, pruefer: (alt && alt.pruefer) || String(p.pruefer || "").trim() };
  }
  return Object.values(map);
}
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
  const lt = lehrerZeilen.length ? `<table class="tabelle"><thead><tr><th>Fahrlehrer</th><th class="zahlspalte">Praxis bestanden</th><th class="zahlspalte">Quote Praxis</th><th class="zahlspalte nur-breit">Theorie bestanden</th><th class="zahlspalte nur-breit">Quote Theorie</th></tr></thead><tbody>${lehrerZeilen.map((z) => `<tr>
      <td>${z.id ? `<a href="${zLink({ liste: "praxis", monat: bereich, lehrer: z.id })}"><b>${esc(z.name)}</b></a>` : esc(z.name)}</td>
      <td class="zahlspalte">${z.v.p.ok} von ${z.v.p.n}</td><td class="zahlspalte"><b>${luQuote(z.v.p.ok, z.v.p.n)}</b></td>
      <td class="zahlspalte nur-breit">${z.v.t.ok} von ${z.v.t.n}</td><td class="zahlspalte nur-breit">${luQuote(z.v.t.ok, z.v.t.n)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="leer">Keine Prüfungsergebnisse in diesem Zeitraum.</p>`;
  const jePruefer = {};
  for (const e of praxis) { const k = e.pruefer || ""; jePruefer[k] = jePruefer[k] || { ok: 0, n: 0, letzte: "" }; jePruefer[k].n++; if (e.ok) jePruefer[k].ok++; if (e.datum > jePruefer[k].letzte) jePruefer[k].letzte = e.datum; }
  const pz = Object.entries(jePruefer).filter(([k]) => k).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0], "de"));
  const ohne = (jePruefer[""] || { n: 0 }).n;
  const pt = pz.length ? `<table class="tabelle"><thead><tr><th>Prüfer</th><th class="zahlspalte">Prüfungen</th><th class="zahlspalte">Quote</th><th class="zahlspalte nur-breit">zuletzt</th></tr></thead><tbody>${pz.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td class="zahlspalte">${v.n}</td><td class="zahlspalte"><b>${luQuote(v.ok, v.n)}</b></td><td class="zahlspalte nur-breit">${esc(datumDE(v.letzte))}</td></tr>`).join("")}</tbody></table>`
    : `<p class="leer">Noch keine Praxisprüfung mit Prüfer in diesem Zeitraum.</p>`;
  return `<div class="raster zwei">
    <div class="karte" id="luQuoteLehrer"><h2>Bestehensquote je Fahrlehrer</h2><p class="leise klein">${esc(zeitraumText(von, bis))}. Namen anklicken für die Liste.</p>${lt}</div>
    <div class="karte" id="luPruefer"><h2>Prüfer-Statistik (Praxis)</h2><p class="leise klein">${esc(zeitraumText(von, bis))}. Name aus der App, sonst die Initialen von der Prüfungstafel.${ohne ? ` ${ohne} ${ohne === 1 ? "Prüfung" : "Prüfungen"} ohne Prüfer nicht mitgezählt.` : ""}</p>${pt}</div>
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
    <p class="leise klein">Der Bericht öffnet sich in einem neuen Fenster. Dort „Drucken / als PDF speichern“ tippen und als Drucker „Als PDF speichern“ wählen. Er enthält nur Summen, keine Schülernamen.</p>`;
  oeffneDialog("Monatsbericht", body, async (form) => luMonatsberichtOeffnen(new FormData(form).get("monat")), "Bericht öffnen");
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#kMonatsbericht") && !document.querySelector("dialog[open]")) luMonatsberichtDialog();
});
