/* Kompass Büro – Zahlungsbelege / Quittungen (W19 Teil 2, 26.11.2026)
   🗣 Serband 26.11.: „Bargeld: Boost nimmt hauptsächlich Bargeld, selten Überweisung. Bau alles, damit es bereits steht.“
   - Zahlungen › Belege (#belege): Liste aller Belege, „Neuer Beleg“, je Beleg „Drucken“ (Drucken oder als PDF speichern) und „Stornieren“.
   - Im Schüler-Bereich: Knopf „Beleg“ je Schüler (belegDialog(sid)).
   - Die Datenbank (supabase/migrations/20261201_w19_02_zahlungsbelege.sql) setzt Nummer (fortlaufend je Fahrschule), Name des
     Schülers, Kopf der Fahrschule und Steuer-Einstellung als feste Kopie. Ein Beleg ist danach nicht änderbar; Storno = Gegenbeleg.
   - Einstellungen › „Belege & Quittungen“: Kopf (Name, Anschrift, Steuernummer, USt-IdNr.), Steuerausweis (Standard: keiner),
     Schalter „Bargeld-Belege“ (Standard AUS, mit Hinweis Kassensicherungsverordnung). Nichts wird erfunden: leere Felder bleiben leer.
   - Fehlt die Tabelle (Migration noch nicht live): Hinweis „Datenbank noch nicht bereit“, sonst nichts. */
"use strict";
const BELEG_ZAHLART = { bar: "Bar", ec: "EC-Karte", ueberweisung: "Überweisung" };
const BELEG_ZWECKE = ["Grundbetrag", "Fahrstunden", "Sonderfahrten", "Vorstellung zur praktischen Prüfung", "Vorstellung zur theoretischen Prüfung", "Lernapp", "Paket", "Reaktivierung"];
const BELEG_KOPF_STD = { name: "", anschrift: "", steuernummer: "", ustid: "" };
const BELEG_STEUER_STD = { ausweisen: false, satz: "", hinweis: "" };
const BELEG_BARGELD_HINWEIS = "Bargeld-Belege aus dem Kompass können als elektronische Kasse gelten (Kassensicherungsverordnung, § 146a AO). Vor dem Einschalten mit dem Steuerberater klären.";

function belegDarf() { return !!(S.profil && ["buero", "fahrschule_admin", "super_admin"].includes(S.profil.rolle)); }
function belegKopf() { return window.KE ? KE.wert("beleg.fahrschule", BELEG_KOPF_STD) : Object.assign({}, BELEG_KOPF_STD); }
function belegSteuer() { return window.KE ? KE.wert("beleg.steuer", BELEG_STEUER_STD) : Object.assign({}, BELEG_STEUER_STD); }
function belegBargeldAn() { return !!(window.KE && KE.wert("beleg.bargeld", { aktiv: false }).aktiv === true); }
function belegEuro(n) { return Number(n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }
function belegFehltTabelle(err) { const m = String((err && (err.message || err.code)) || ""); return /zahlungsbelege/.test(m) && /does not exist|schema cache|Could not find|42P01/i.test(m); }
function belegFehlerText(err) {
  const m = String((err && err.message) || "");
  if (/Bargeld-Belege sind in den Einstellungen ausgeschaltet/.test(m)) return "Bargeld-Belege sind ausgeschaltet (Einstellungen › Belege & Quittungen).";
  if (/ein_storno|duplicate key/i.test(m)) return "Dieser Beleg ist schon storniert.";
  if (belegFehltTabelle(err)) return "Datenbank noch nicht bereit (Belege). Bitte später noch einmal versuchen.";
  return typeof dbFehlerText === "function" ? dbFehlerText(err) : m;
}

/* ---------- Laden ---------- */
// S.belege: null = noch nicht geladen; S.belegeFehlt = Tabelle fehlt; S.belegeFs = Fahrschule des geladenen Stands
async function belegeLaden(erzwingen) {
  if (!belegDarf() || !S.fsId) return;
  if (!erzwingen && S.belege && S.belegeFs === S.fsId && Date.now() - (S.belegeAm || 0) < 60000) return; // höchstens 1 Minute alt (zweiter Büro-PC)
  const fs = S.fsId;
  const res = await supa.from("zahlungsbelege").select("*").eq("fahrschule_id", fs).order("nummer", { ascending: false }).limit(1000);
  if (S.fsId !== fs) return; // inzwischen andere Fahrschule (Super-Admin)
  if (res.error) {
    S.belegeFehlt = belegFehltTabelle(res.error);
    if (S.belegeFehlt) { S.belegeFehler = null; S.belege = []; S.belegeFs = fs; return; }
    // anderer Fehler (Netz, Anmeldung abgelaufen): nichts zwischenspeichern, später neu versuchen (Prüfer Bedienung)
    S.belegeFehler = belegFehlerText(res.error); S.belegeFehlerAm = Date.now(); S.belege = null; return;
  }
  S.belegeFehlt = false; S.belegeFehler = null; S.belege = res.data || []; S.belegeFs = fs; S.belegeAm = Date.now();
}
function belegStorniert(b) { return (S.belege || []).find((x) => x.storno_von === b.id) || null; }

/* ---------- Seite #belege ---------- */
function renderBelege() {
  if (!belegDarf()) return `<p class="leer">Belege sehen nur Büro und Leitung.</p>`;
  if ((!S.belege || S.belegeFs !== S.fsId) && S.belegeFehler && Date.now() - (S.belegeFehlerAm || 0) < 30000)
    return `<div class="karte"><p class="fl-warnung">Belege gerade nicht abrufbar: ${esc(S.belegeFehler)}</p><button class="knopf haupt" type="button" id="belegNochmal">Erneut laden</button></div>`;
  if (S.belege && S.belegeFs === S.fsId && Date.now() - (S.belegeAm || 0) >= 60000 && !S.belegeLaeuft) { S.belegeLaeuft = true; belegeLaden(true).finally(() => { S.belegeLaeuft = false; if (document.body.dataset.bereich === "belege") zeichne(); }); }
  if (!S.belege || S.belegeFs !== S.fsId) { belegeLaden().then(() => { if (document.body.dataset.bereich === "belege") zeichne(); }); return `<p class="leer">Belege werden geladen …</p>`; }
  if (S.belegeFehlt) return `<div class="karte"><p class="leer">Datenbank noch nicht bereit (Belege). Sobald sie eingespielt ist, erscheinen die Belege hier.</p></div>`;
  const suche = (fristenParam("suche") || "").trim().toLowerCase();
  const liste = S.belege.filter((b) => !suche || [b.schueler_name, String(b.nummer), b.zweck, datumDE(b.datum)].join(" ").toLowerCase().includes(suche));
  const heute = KR.todayISO();
  const heuteListe = S.belege.filter((b) => b.datum === heute);
  const summeHeute = heuteListe.filter((b) => !b.storno_von).reduce((a, b) => a + Number(b.betrag || 0), 0);
  const stornoHeute = heuteListe.filter((b) => b.storno_von);
  const zeilen = liste.slice(0, 300).map((b) => {
    const st = belegStorniert(b);
    return `<tr>
      <td class="zahlspalte"><b>${esc(String(b.nummer))}</b></td>
      <td class="zeitspalte">${esc(datumDE(b.datum))}</td>
      <td><b>${esc(b.schueler_name)}</b><div class="unter">${esc(b.zweck)}</div></td>
      <td class="nur-breit">${esc(BELEG_ZAHLART[b.zahlart] || b.zahlart)}</td>
      <td class="zahlspalte"><b>${esc(belegEuro(b.betrag))}</b>${b.storno_von ? `<div class="unter"><span class="marke-pill rot">Storno</span></div>` : st ? `<div class="unter"><span class="marke-pill">storniert (Nr. ${esc(String(st.nummer))})</span></div>` : ""}</td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" type="button" data-belegdruck="${esc(b.id)}">Drucken</button>${!b.storno_von && !st ? `<button class="knopf klein" type="button" data-belegstorno="${esc(b.id)}">Stornieren</button>` : ""}</div></td>
    </tr>`;
  }).join("");
  return `<div class="kacheln">
      <div class="kachel"><div class="wert">${S.belege.length}</div><div class="name">Belege insgesamt</div></div>
      <div class="kachel gruen"><div class="wert">${esc(belegEuro(summeHeute))}</div><div class="name">heute erhalten (${heuteListe.length - stornoHeute.length} Beleg${heuteListe.length - stornoHeute.length === 1 ? "" : "e"})</div></div>
      <div class="kachel${stornoHeute.length ? " rot" : ""}"><div class="wert">${esc(belegEuro(stornoHeute.reduce((a, b) => a + Number(b.betrag || 0), 0)))}</div><div class="name">heute storniert (${stornoHeute.length})</div></div>
    </div>
    <div class="karte">
      <div class="filterzeile">
        <input type="search" class="suche" id="belegSuche" placeholder="Name, Nummer oder Zweck" value="${esc(fristenParam("suche"))}" aria-label="Belege suchen">
        <button class="knopf haupt" type="button" id="belegNeu">Neuer Beleg</button>
      </div>
      ${S.belegeFehler ? `<p class="fl-warnung">${esc(S.belegeFehler)}</p>` : ""}
      ${liste.length ? `<table class="tabelle"><thead><tr><th class="zahlspalte">Nr.</th><th>Datum</th><th>Schüler und Zweck</th><th class="nur-breit">Zahlart</th><th class="zahlspalte">Betrag</th><th></th></tr></thead><tbody>${zeilen}</tbody></table>`
        : `<p class="leer">${suche ? "Kein Beleg gefunden." : "Noch keine Belege."}</p>`}
      ${liste.length > 300 ? `<p class="leise klein">Angezeigt: die neuesten 300 von ${liste.length}. Bitte oben suchen.</p>` : ""}
      <p class="leise klein">Ein Beleg bekommt die nächste freie Nummer und lässt sich danach nicht mehr ändern oder löschen. Ist etwas falsch, wird er storniert: Dann entsteht ein Gegenbeleg mit eigener Nummer und negativem Betrag. „Drucken“ öffnet den Druck; dort lässt sich der Beleg auch als PDF speichern.${belegBargeldAn() ? "" : " Bargeld-Belege sind ausgeschaltet (Einstellungen › Belege &amp; Quittungen)."}</p>
    </div>`;
}
function bindeBelege(ziel) {
  const su = ziel.querySelector("#belegSuche");
  if (su) { let t = null; su.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { setzeFilter("belege", { suche: su.value.trim() }); const n = $("belegSuche"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); }); }
  const noch = ziel.querySelector("#belegNochmal"); if (noch) noch.addEventListener("click", () => { S.belegeFehlerAm = 0; zeichne(); });
  const neu = ziel.querySelector("#belegNeu"); if (neu) neu.addEventListener("click", () => belegDialog(null));
  ziel.querySelectorAll("[data-belegdruck]").forEach((b) => b.addEventListener("click", () => { const x = (S.belege || []).find((y) => y.id === b.dataset.belegdruck); if (x) belegDrucken(x); }));
  ziel.querySelectorAll("[data-belegstorno]").forEach((b) => b.addEventListener("click", () => belegStornieren(b.dataset.belegstorno)));
}

/* ---------- Neuer Beleg ---------- */
async function belegDialog(sid) {
  if (!belegDarf()) return;
  await belegeLaden();
  if (!S.belege && S.belegeFehler) { toast("Belege gerade nicht abrufbar: " + S.belegeFehler, true); return; }
  if (S.belegeFehlt) { toast("Datenbank noch nicht bereit (Belege). Bitte später noch einmal versuchen.", true); return; }
  const bar = belegBargeldAn();
  const schueler = S.schueler.filter((x) => istAktiv(x) || x.id === sid).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));
  const heute = KR.todayISO();
  const kopf = belegKopf();
  const kopfFehlt = [!String(kopf.anschrift || "").trim() && "Anschrift", !String(kopf.steuernummer || "").trim() && !String(kopf.ustid || "").trim() && "Steuernummer"].filter(Boolean);
  const body = `${kopfFehlt.length ? `<p class="fl-warnung">Auf der Quittung fehlt noch: ${esc(kopfFehlt.join(" und "))}. <a href="#einstellungen?thema=belege">Jetzt in den Einstellungen ergänzen</a> – ein erstellter Beleg lässt sich nicht mehr ändern.</p>` : ""}<div class="formular">
      <label class="voll">Schüler
        <select name="schueler" required><option value="">– bitte wählen –</option>${schueler.map((x) => `<option value="${esc(x.id)}"${x.id === sid ? " selected" : ""}>${esc(x.name || "(ohne Namen)")}</option>`).join("")}</select></label>
      <label>Datum der Zahlung<input type="date" name="datum" value="${esc(heute)}" max="${esc(heute)}" required></label>
      <label>Betrag in Euro<input type="text" name="betrag" inputmode="decimal" placeholder="z. B. 45,00" required autocomplete="off"></label>
      <label class="voll">Zweck<input type="text" name="zweck" maxlength="200" list="belegZwecke" required placeholder="z. B. Grundbetrag" autocomplete="off"></label>
      <datalist id="belegZwecke">${BELEG_ZWECKE.map((z) => `<option value="${esc(z)}">`).join("")}</datalist>
      <fieldset class="voll"><legend>Zahlart</legend>
        <label class="wahl"><input type="radio" name="zahlart" value="ec" checked> EC-Karte</label>
        <label class="wahl"><input type="radio" name="zahlart" value="ueberweisung"> Überweisung</label>
        <label class="wahl"><input type="radio" name="zahlart" value="bar"${bar ? "" : " disabled"}> Bar${bar ? "" : " (ausgeschaltet)"}</label>
      </fieldset>
    </div>
    ${bar ? "" : `<p class="leise klein">Bar ist ausgeschaltet (<a href="#einstellungen?thema=belege">Einstellungen</a>).</p>`}
    <p class="leise klein">Nach dem Speichern bekommt der Beleg die nächste Nummer und lässt sich nicht mehr ändern. Danach öffnet sich der Druck.</p>`;
  const dlg = oeffneDialog("Neuer Beleg", body, async (form) => {
    const sId = form.schueler.value;
    const st = S.schueler.find((x) => x.id === sId);
    if (!st) { toast("Bitte einen Schüler wählen.", true); return false; }
    const roh = String(form.betrag.value || "").trim().replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
    const betrag = Number(roh);
    if (!/^\d+(\.\d{1,2})?$/.test(roh) || !(betrag > 0) || betrag > 100000) { toast("Bitte einen gültigen Betrag eintragen (z. B. 45,00).", true); return false; }
    const zweck = String(form.zweck.value || "").trim();
    if (!zweck) { toast("Bitte den Zweck eintragen.", true); return false; }
    const datum = form.datum.value;
    if (!/^\d{4}-\d\d-\d\d$/.test(datum) || datum > heute) { toast("Bitte ein gültiges Datum wählen (nicht in der Zukunft).", true); return false; }
    const zahlart = (form.querySelector("input[name=zahlart]:checked") || {}).value || "ec";
    // Prüfer Daten: nach einem Verbindungsabbruch nicht unbemerkt doppelt (frisch laden, gleicher Schüler/Betrag/Tag)
    await belegeLaden(true);
    const doppelt = (S.belege || []).find((b) => !b.storno_von && b.schueler_id === sId && Number(b.betrag) === betrag && b.datum === datum && !belegStorniert(b));
    if (doppelt && !(await bestaetige("Gibt es schon", `Für ${st.name} gibt es schon Beleg Nr. ${doppelt.nummer} über ${belegEuro(betrag)} vom ${datumDE(datum)}. Trotzdem einen weiteren Beleg erstellen?`, "Ja, weiteren Beleg"))) return false;
    if (!(await bestaetige("Beleg erstellen?", `${belegEuro(betrag)} von ${st.name} (${BELEG_ZAHLART[zahlart]}) für „${zweck}“ am ${datumDE(datum)}. Danach lässt sich der Beleg nicht mehr ändern, nur stornieren.`, "Ja, Beleg erstellen"))) return false;
    const res = await supa.from("zahlungsbelege").insert({ fahrschule_id: S.fsId, schueler_id: sId, schueler_name: st.name || "(ohne Namen)", datum, betrag, zweck, zahlart }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? belegFehlerText(res.error) : "keine Berechtigung"), true); return false; }
    S.belege = [res.data[0]].concat(S.belege || []);
    toast(`Beleg Nr. ${res.data[0].nummer} erstellt ✓`);
    if (document.body.dataset.bereich === "belege") zeichne();
    belegDrucken(res.data[0]);
    return true;
  }, "Beleg erstellen");
  if (sid && dlg) { const b = dlg.querySelector("input[name=betrag]"); if (b) b.focus(); } // Schüler schon gewählt: gleich den Betrag
}

/* ---------- Storno ---------- */
async function belegStornieren(id) {
  const b = (S.belege || []).find((x) => x.id === id);
  if (!b || b.storno_von || belegStorniert(b)) return;
  const body = `<p>Beleg <b>Nr. ${esc(String(b.nummer))}</b> · ${esc(b.schueler_name)} · ${esc(belegEuro(b.betrag))} · ${esc(datumDE(b.datum))}</p>
    <div class="formular"><label class="voll">Grund (erscheint auf dem Gegenbeleg)<input type="text" name="grund" maxlength="150" required placeholder="z. B. falscher Betrag"></label></div>
    <p class="leise klein">Der Beleg bleibt bestehen. Es entsteht ein Gegenbeleg mit der nächsten Nummer und ${esc(belegEuro(-Number(b.betrag)))}.</p>`;
  oeffneDialog("Beleg stornieren", body, async (form) => {
    const grund = String(form.grund.value || "").trim();
    if (!grund) { toast("Bitte einen Grund eintragen.", true); return false; }
    const res = await supa.from("zahlungsbelege").insert({ fahrschule_id: S.fsId, storno_von: b.id, schueler_id: b.schueler_id, schueler_name: b.schueler_name, datum: KR.todayISO(), betrag: -Number(b.betrag), zweck: grund, zahlart: b.zahlart }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht storniert: " + (res.error ? belegFehlerText(res.error) : "keine Berechtigung"), true); return false; }
    S.belege = [res.data[0]].concat(S.belege || []);
    toast(`Gegenbeleg Nr. ${res.data[0].nummer} erstellt ✓`);
    zeichne();
    belegDrucken(res.data[0]);
    return true;
  }, "Stornieren");
}

/* ---------- Druck (auch „Als PDF speichern“ im Druckfenster) ---------- */
function belegHTML(b) {
  const k = b.fahrschule_daten || {};
  const zeilen = (t) => esc(String(t || "")).replace(/\n/g, "<br>");
  const st = b.steuer && b.steuer.ausweisen === true ? b.steuer : null;
  const satz = st ? Number(String(st.satz).replace(",", ".")) : NaN;
  let steuerZeile = "";
  if (st && satz > 0 && satz < 100) {
    const brutto = Number(b.betrag), ust = Math.round(brutto * satz / (100 + satz) * 100) / 100;
    steuerZeile = `<tr><td>Darin enthalten ${esc(String(satz).replace(".", ","))} % USt</td><td class="r">${esc(belegEuro(ust))}</td></tr><tr><td>Nettobetrag</td><td class="r">${esc(belegEuro(Math.round((brutto - ust) * 100) / 100))}</td></tr>`;
  }
  const orig = b.storno_von ? (S.belege || []).find((x) => x.id === b.storno_von) : null;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Beleg Nr. ${esc(String(b.nummer))}</title>
<style>
  @page{size:A5 portrait;margin:14mm}
  body{font:11pt/1.45 Georgia,"Times New Roman",serif;color:#111;margin:0}
  .kopf{border-bottom:1px solid #111;padding-bottom:8px;margin-bottom:14px}
  .kopf b{font-size:13pt}
  h1{font-size:15pt;margin:0 0 4px}
  .nr{font-size:10.5pt;color:#333;margin-bottom:14px}
  table{width:100%;border-collapse:collapse}
  td{padding:5px 0;vertical-align:top;border-bottom:1px solid #ddd}
  td.r{text-align:right;white-space:nowrap}
  .summe td{font-size:13pt;font-weight:700;border-bottom:2px solid #111}
  .klein{font-size:9pt;color:#333;margin-top:14px}
  .storno{border:2px solid #111;padding:4px 8px;display:inline-block;font-weight:700;margin-bottom:10px}
  .erhalten{margin:14px 0 0}
  .unterschrift{display:flex;gap:24px;margin-top:34px}
  .unterschrift div{flex:1;border-top:1px solid #111;padding-top:3px;font-size:9pt;color:#333}
</style></head><body>
  <div class="kopf"><b>${esc(k.name || "")}</b>${k.anschrift ? `<br>${zeilen(k.anschrift)}` : ""}${k.steuernummer ? `<br>Steuernummer: ${esc(k.steuernummer)}` : ""}${k.ustid ? `<br>USt-IdNr.: ${esc(k.ustid)}` : ""}</div>
  ${b.storno_von ? `<div class="storno">STORNO${orig ? ` zu Beleg Nr. ${esc(String(orig.nummer))}` : ""}</div>` : ""}
  <h1>Quittung</h1>
  <div class="nr">Beleg Nr. ${esc(String(b.nummer))} · Datum der Zahlung: ${esc(datumDE(b.datum))}</div>
  <table>
    <tr><td>Erhalten von</td><td class="r">${esc(b.schueler_name)}</td></tr>
    <tr><td>Zweck</td><td class="r">${esc(b.zweck)}</td></tr>
    <tr><td>Zahlart</td><td class="r">${esc(BELEG_ZAHLART[b.zahlart] || b.zahlart)}</td></tr>
    ${steuerZeile}
    <tr class="summe"><td>${b.storno_von ? "STORNO – Betrag" : "Betrag"}</td><td class="r">${esc(belegEuro(b.betrag))}</td></tr>
  </table>
  ${b.storno_von ? "" : `<p class="erhalten">Betrag erhalten.</p>`}
  <div class="unterschrift"><div>Ort, Datum</div><div>Unterschrift / Stempel</div></div>
  ${st && st.hinweis ? `<p class="klein">${zeilen(st.hinweis)}</p>` : ""}
  <p class="klein">Erstellt am ${esc(new Date(b.erstellt_am || Date.now()).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }))}${b.bearbeiter ? ` von ${esc(b.bearbeiter)}` : ""}.</p>
</body></html>`;
}
function belegDrucken(b) {
  const alt = document.getElementById("belegDruckRahmen"); if (alt) alt.remove();
  const f = document.createElement("iframe");
  f.id = "belegDruckRahmen"; f.setAttribute("aria-hidden", "true"); f.title = "Beleg drucken";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(f);
  const d = f.contentWindow.document; d.open(); d.write(belegHTML(b)); d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast("Drucken ging nicht. Bitte noch einmal versuchen.", true); } }, 150);
}

/* ---------- Einstellungen › Belege & Quittungen ---------- */
(function () {
  const W = window;
  if (!Array.isArray(W.BUERO_EINSTELLUNGEN_THEMEN)) W.BUERO_EINSTELLUNGEN_THEMEN = [];
  W.BUERO_EINSTELLUNGEN_THEMEN.push({
    id: "belege", titel: "Belege & Quittungen", reihenfolge: 35, rollen: ["leitung", "buero", "superadmin"],
    render(el, ctx) {
      const k = belegKopf(), st = belegSteuer(), bar = belegBargeldAn();
      el.innerHTML = `<form class="formular" id="belegEinst" novalidate>
        <h3 class="es-abschnitt voll">Kopf auf dem Beleg</h3>
        <p class="leise klein voll">So steht die Fahrschule oben auf jeder Quittung. Nur ausfüllen, was stimmt. Leere Felder erscheinen nicht. Schon erstellte Belege behalten ihren alten Kopf.</p>
        <label class="voll">Name der Fahrschule (leer = Name aus dem Konto)<input type="text" name="name" maxlength="120" value="${esc(k.name || "")}"></label>
        <label class="voll">Anschrift<textarea name="anschrift" rows="3" maxlength="300">${esc(k.anschrift || "")}</textarea></label>
        <label>Steuernummer<input type="text" name="steuernummer" maxlength="40" value="${esc(k.steuernummer || "")}"></label>
        <label>USt-IdNr.<input type="text" name="ustid" maxlength="40" value="${esc(k.ustid || "")}"></label>
        <h3 class="es-abschnitt voll">Umsatzsteuer auf dem Beleg</h3>
        <label class="wahl voll"><input type="checkbox" name="ausweisen"${st.ausweisen === true ? " checked" : ""}> Umsatzsteuer auf dem Beleg ausweisen</label>
        <label>Steuersatz in % (nur mit Haken)<input type="text" name="satz" inputmode="decimal" maxlength="5" value="${esc(String(st.satz || ""))}"></label>
        <label class="voll">Hinweis-Text unten auf dem Beleg (optional)<input type="text" name="hinweis" maxlength="200" value="${esc(st.hinweis || "")}"></label>
        <p class="fl-warnung voll">Standard ist: keine Steuer auf dem Beleg. Ob und wie Umsatzsteuer auszuweisen ist, entscheidet nicht der Kompass. Bitte mit dem Steuerberater prüfen.</p>
        <h3 class="es-abschnitt voll">Bargeld</h3>
        <label class="wahl voll"><input type="checkbox" name="bargeld"${bar ? " checked" : ""}> Bargeld-Belege erlauben</label>
        <p class="fl-warnung voll">${esc(BELEG_BARGELD_HINWEIS)}</p>
        <p class="leise klein voll">EC-Karte und Überweisung gehen immer.</p>
        <div class="voll knopfreihe"><button class="knopf haupt" type="submit">Speichern</button></div>
      </form>`;
      const form = el.querySelector("#belegEinst");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!window.KE) { ctx.meldung("Einstellungen gerade nicht verfügbar.", "fehler"); return; }
        const f = form.elements;
        const satzText = String(f.satz.value || "").trim().replace(",", ".");
        if (f.ausweisen.checked && !(/^\d{1,2}(\.\d{1,2})?$/.test(satzText) && Number(satzText) > 0)) { ctx.meldung("Bitte einen Steuersatz eintragen (z. B. 19) oder den Haken entfernen.", "fehler"); return; }
        const barNeu = f.bargeld.checked;
        let barGut = barNeu;
        // Nein bei der Rückfrage: nur Bargeld bleibt aus, Kopf und Steuer werden trotzdem gespeichert (Prüfer Bedienung)
        if (barNeu && !bar && !(await bestaetige("Bargeld-Belege einschalten?", BELEG_BARGELD_HINWEIS + " Wurde das geklärt?", "Ja, geklärt – einschalten"))) { f.bargeld.checked = false; barGut = false; }
        try {
          await KE.setze(ctx.sb, ctx.fahrschuleId, "beleg.fahrschule", { name: f.name.value.trim(), anschrift: f.anschrift.value.trim(), steuernummer: f.steuernummer.value.trim(), ustid: f.ustid.value.trim() });
          await KE.setze(ctx.sb, ctx.fahrschuleId, "beleg.steuer", { ausweisen: !!f.ausweisen.checked, satz: f.ausweisen.checked ? satzText : "", hinweis: f.hinweis.value.trim() });
          if (barGut !== bar) await KE.setze(ctx.sb, ctx.fahrschuleId, "beleg.bargeld", { aktiv: barGut });
          ctx.meldung("Gespeichert.", "ok"); toast("Einstellungen gespeichert");
        } catch (x) { ctx.meldung("Nicht gespeichert: " + String((x && x.message) || x) + (/Unbekannte Einstellung|fe_schluessel|check constraint/i.test(String(x && x.message)) ? " (Datenbank noch nicht bereit)" : ""), "fehler"); }
      });
    },
  });
})();
