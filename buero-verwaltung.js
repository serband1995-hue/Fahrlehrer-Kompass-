/* Kompass Büro – Urlaub, Schichtplan und Backups (Werkstatt 16, 24.11.2026).
   Bisher gab es diese drei nur in der App-Gesamtansicht („Weitere Verwaltung“). Ziel von W16 (🗣 Serband: „je nachdem, wo man
   sich anmeldet, kommt die richtige Seite“): Das Büro soll nur noch die Büro-Seite brauchen. Dafür stehen sie jetzt hier.
   Die Weiterleitung (startseite.js BUERO_NUR_BUEROSEITE) bleibt aus, bis auch die übrigen Lücken zu sind (Teil 3).
   Gleiche Tabellen und Regeln wie in der App: fahrschule_urlaub (mit Fahrlehrer-ID, W14), fahrschule_schichten,
   fahrschule_backups. Die Datenbank erlaubt sie Büro, Leitung und Super-Admin (Zugriffsregeln „…/Buero verwaltet …“).
   Eingehängt in BEREICHE (buero.js, Einträge von Werkstatt 11, erscheinen, sobald diese Datei vor buero.js geladen ist).
   Löschen ohne Rückfrage, 6 Sekunden „Rückgängig“ (K7). */
"use strict";

const VW = { fsId: null, urlaub: null, schichten: null, backups: null, fehler: {}, lauf: {}, nr: {}, stand: {}, zeitraum: null };
// So lange gilt eine geladene Liste. Danach lädt das nächste Zeichnen neu (beim Öffnen des Bereichs und im Takt von buero.js),
// damit Einträge aus der App oder von anderen Büro-PCs ohne Neuladen der Seite erscheinen (Daten-Prüfer W16 Teil 2).
const VW_FRISCH_MS = 30000;
const VW_STATUS = { arbeitet: "arbeitet", frei: "frei", krank: "krank" };
const VW_TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
// Eigene kleine Stile (Design-Kritiker W16 Teil 2): Schichtplan am Handy Tag oben, Einträge darunter in voller Breite, Zeitraum ohne Umbruch
(function vwStil() {
  if (typeof document === "undefined" || document.getElementById("vw-stil")) return;
  const st = document.createElement("style"); st.id = "vw-stil";
  st.textContent = `.vw-nowrap{white-space:nowrap}
.vw-hinweis{white-space:normal}
.tabelle .marke-pill.vw-nowrap{white-space:nowrap}
.vw-schicht{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0}
.vw-schicht .vw-wer{min-width:0;flex:1 1 auto;overflow-wrap:anywhere}
.vw-plan tr.heute td:first-child{box-shadow:inset 3px 0 0 var(--akzent)}
@media (max-width:600px){
  .vw-plan{display:table;overflow:visible}
  .vw-plan thead{display:none}
  .vw-plan tr{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:8px;border-bottom:1px solid var(--line-soft)}
  .vw-plan td{border-bottom:none}
  .vw-plan td.vw-eintraege{grid-column:1 / -1;grid-row:2;padding-top:0}
  .vw-plan td.vw-eintraege:empty{display:none}
  .vw-liste{display:table;overflow:visible}
  .vw-liste thead{display:none}
  .vw-liste tr{display:grid;grid-template-columns:1fr auto;align-items:center;column-gap:8px;border-bottom:1px solid var(--line-soft);padding:6px 0}
  .vw-liste td{border-bottom:none;padding:2px 4px}
  .vw-liste td:nth-child(1){grid-column:1;grid-row:1}
  .vw-liste td:nth-child(2){grid-column:1;grid-row:2}
  .vw-liste td.aktionen{grid-column:2;grid-row:1 / span 2}
}`;
  document.head.appendChild(st);
})();
// Datum kurz: im laufenden Jahr ohne Jahreszahl (28.11.), sonst mit
function vwDatumKurz(iso) { return iso && iso.slice(0, 4) === KR.todayISO().slice(0, 4) ? datumDE(iso).slice(0, 6) : datumDE(iso); }
function vwZeitraum(von, bis) { return `<span class="vw-nowrap">${von === bis ? esc(vwDatumKurz(von)) : esc(vwDatumKurz(von)) + " – " + esc(vwDatumKurz(bis))}</span>`; }

// Andere Fahrschule gewählt (Super-Admin): nichts von der vorigen zeigen
function vwSchule() {
  if (VW.fsId === S.fsId) return;
  VW.fsId = S.fsId; VW.urlaub = null; VW.schichten = null; VW.backups = null; VW.fehler = {}; VW.lauf = {}; VW.stand = {}; VW.zeitraum = null;
  Object.keys(VW.nr).forEach((k) => { VW.nr[k]++; }); // Antworten für die vorige Fahrschule zählen nie mehr
}
function vwFehlerKarte(was, titel) {
  return `<p class="leer">${VW.fehler[was] ? `${esc(titel)} konnte nicht geladen werden (${esc(VW.fehler[was])}). <button class="knopf klein" type="button" data-vwneu="${was}">Nochmal laden</button>` : "Lade …"}</p>`;
}
// Liste da, aber das Auffrischen ging nicht: alten Stand zeigen und das sagen
function vwAltHinweis(was) {
  return VW.fehler[was] ? `<p class="leise klein" role="status">Nicht aktuell: Neu laden ging nicht (${esc(VW.fehler[was])}). <button class="knopf klein" type="button" data-vwneu="${was}">Nochmal laden</button></p>` : "";
}
// Nachladen nötig? (noch nichts da, älter als VW_FRISCH_MS; nach einem Fehler ohne Liste nicht bei jedem Zeichnen,
// aber nach 2 Minuten von selbst im Takt – oder sofort mit „Nochmal laden“)
function vwVeraltet(was) {
  if (!VW[was]) return !VW.fehler[was] || Date.now() - (VW.stand[was] || 0) > 4 * VW_FRISCH_MS;
  return Date.now() - (VW.stand[was] || 0) > VW_FRISCH_MS;
}
// Lädt einen Bereich und zeichnet ihn neu, wenn er noch offen ist. Läuft schon eine Abfrage, wird sie geteilt;
// neu = true (nach Speichern oder Löschen) startet immer eine frische, und nur die jüngste Antwort zählt (Daten-Prüfer).
function vwLaden(was, abfrage, neu) {
  if (VW.lauf[was] && !neu) return VW.lauf[was];
  const nr = (VW.nr[was] = (VW.nr[was] || 0) + 1), fs = S.fsId;
  const p = (async () => {
    let res;
    try { res = await abfrage(); } catch (e) { res = { error: e }; }
    if (nr !== VW.nr[was] || fs !== S.fsId) return; // überholt: neuere Abfrage oder andere Fahrschule
    VW.lauf[was] = null;
    VW.stand[was] = Date.now(); // auch nach einem Fehler: nicht bei jedem Zeichnen erneut versuchen
    if (res.error) VW.fehler[was] = dbFehlerText(res.error); // eine schon geladene Liste bleibt stehen (mit Hinweis)
    else { VW[was] = res.data || []; delete VW.fehler[was]; if (res.zeitraum) VW.zeitraum = res.zeitraum; }
    if (aktuellerBereich().id === (was === "schichten" ? "schichtplan" : was)) zeichne();
  })();
  VW.lauf[was] = p;
  return p;
}
function vwBindeNeuLaden(ziel, was, laden) {
  ziel.querySelectorAll(`[data-vwneu="${was}"]`).forEach((b) => b.addEventListener("click", () => { delete VW.fehler[was]; laden(); zeichne(); }));
}
// Zeile löschen; „Rückgängig“ setzt sie unverändert wieder ein (wie _cloudLoeschenMitRueckgaengig in der App).
// neuLaden(weg): weg = true direkt nach dem Löschen (Zeile sofort aus der Liste nehmen, ohne „Lade …“ – sonst sprang die Seite nach oben)
async function vwLoeschen(tabelle, zeile, text, neuLaden) {
  const res = await supa.from(tabelle).delete().eq("id", zeile.id).select("id");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gelöscht: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true); return; }
  neuLaden(true);
  toastUndo(text, async () => {
    const r = await supa.from(tabelle).insert(zeile).select("id");
    if (r.error) { toast("Nicht wiederhergestellt: " + dbFehlerText(r.error), true); return; }
    toast("Wiederhergestellt");
    neuLaden(false);
  });
}

/* ---------- Urlaub ---------- */
function vwLadeUrlaub(neu) {
  vwSchule();
  return vwLaden("urlaub", () => supa.from("fahrschule_urlaub").select("*").eq("fahrschule_id", S.fsId).gte("bis", KR.todayISO()).order("von"), neu);
}
// Name: bei einem Fahrlehrer der aktuelle Profilname (umbenennen ändert nichts), sonst der eingetragene Name (W14)
function vwUrlaubName(u) {
  if (u.fahrlehrer_id) { const l = S.lehrer.find((x) => x.id === u.fahrlehrer_id) || (S.team || []).find((x) => x.id === u.fahrlehrer_id); if (l) return l.name || l.email || u.mitarbeiter_name || ""; }
  return u.mitarbeiter_name || "";
}
// Blockiert dieser Urlaub keinen Kalender? (keine ID oder die Person unterrichtet nicht mehr). Ältere Datenbank ohne die Spalte: kein Hinweis (wie die App).
function vwUrlaubOhneKalender(u) { if (!("fahrlehrer_id" in u)) return false; return !u.fahrlehrer_id || !S.lehrer.some((l) => l.id === u.fahrlehrer_id); }
// Hat dieser Fahrlehrer an dem Tag Urlaub? Für die Warnung beim Termin-Eintragen in buero.js (wie die blockierten Tage in der App).
// Lädt die Liste nach, wenn sie fehlt oder alt ist; ohne Netz: null (dann keine Warnung, der Termin wird wie bisher gespeichert).
async function vwUrlaubAm(lehrerId, datum) {
  if (!lehrerId || !datum || !S.fsId) return null;
  vwSchule();
  if (vwVeraltet("urlaub") || !VW.urlaub) { try { await vwLadeUrlaub(); } catch (e) { /* ohne Liste keine Warnung */ } }
  return (VW.urlaub || []).find((u) => u.fahrlehrer_id === lehrerId && u.von <= datum && u.bis >= datum) || null;
}
function renderUrlaub() {
  vwSchule();
  // Überschrift sagt, was da ist (der Seitentitel heißt schon „Urlaub“)
  const n = VW.urlaub ? VW.urlaub.length : 0;
  const kopf = `<div class="karte-kopf"><h2>${!VW.urlaub ? "Ab heute" : !n ? "Kein Urlaub ab heute" : (n === 1 ? "1 Eintrag" : n + " Einträge") + " ab heute"}</h2><button class="knopf haupt" id="vwUrlaubNeu" type="button">+ Urlaub eintragen</button></div>
    <p class="leise klein">Urlaub von Fahrlehrern sperrt ihre Tage: In der App sind sie blockiert, hier warnt das Termin-Fenster. Bei anderen Personen (z. B. Büro) gibt es keine Termin-Sperre.</p>`;
  if (!VW.urlaub) return `<div class="karte">${kopf}${vwFehlerKarte("urlaub", "Der Urlaub")}</div>`;
  if (!VW.urlaub.length) return `<div class="karte">${kopf}${vwAltHinweis("urlaub")}<p class="leer">Noch nichts eingetragen. Tippe auf „+ Urlaub eintragen“.</p></div>`;
  return `<div class="karte">${kopf}${vwAltHinweis("urlaub")}<table class="tabelle vw-liste"><thead><tr><th>Person</th><th>Zeitraum</th><th></th></tr></thead><tbody>${VW.urlaub.map((u) => `<tr>
      <td><b>${esc(vwUrlaubName(u))}</b>${vwUrlaubOhneKalender(u) ? '<div class="unter"><span class="marke-pill vw-nowrap">keine Sperre</span></div>' : ""}${u.notiz ? `<div class="unter">${esc(u.notiz)}</div>` : ""}</td>
      <td>${vwZeitraum(u.von, u.bis)}</td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" type="button" data-vwurlaubweg="${esc(u.id)}">Löschen</button></div></td></tr>`).join("")}</tbody></table></div>`;
}
function bindeUrlaub(ziel) {
  if (vwVeraltet("urlaub")) vwLadeUrlaub();
  vwBindeNeuLaden(ziel, "urlaub", () => vwLadeUrlaub(true));
  const neu = ziel.querySelector("#vwUrlaubNeu");
  if (neu) neu.addEventListener("click", () => urlaubDialog());
  ziel.querySelectorAll("[data-vwurlaubweg]").forEach((b) => b.addEventListener("click", () => {
    const u = (VW.urlaub || []).find((x) => x.id === b.dataset.vwurlaubweg);
    if (!u) return;
    b.disabled = true;
    vwLoeschen("fahrschule_urlaub", u, "Urlaubseintrag gelöscht", (weg) => { if (weg && VW.urlaub) VW.urlaub = VW.urlaub.filter((x) => x.id !== u.id); vwLadeUrlaub(true); zeichne(); });
  }));
}
// W14: Person aus der Liste (Fahrlehrer der Fahrschule, gespeichert mit Fahrlehrer-ID) oder andere Person ohne Kalender
function urlaubDialog() {
  const lehrer = S.lehrer.slice().sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""), "de"));
  const nameVon = (l) => { const n = l.name || l.email || ""; return lehrer.filter((x) => (x.name || x.email || "") === n).length > 1 && l.email ? n + " (" + l.email + ")" : n; };
  const h = KR.todayISO();
  const dlg = oeffneDialog("Urlaub eintragen", `<div class="formular">
      <label class="voll">Für wen?<select name="wer" required><option value="">– bitte wählen –</option>
        ${lehrer.map((l) => `<option value="${esc(l.id)}">${esc(nameVon(l))}</option>`).join("")}
        <option value="_andere">Andere Person (ohne Kalender)</option></select></label>
      <label class="voll" data-vwname hidden>Name der Person<input type="text" name="name" maxlength="80" autocomplete="off"></label>
      <label>Von<input type="date" name="von" value="${h}" required></label>
      <label>Bis<input type="date" name="bis" value="${h}" required></label>
    </div>`, async (form) => {
    const wer = form.wer.value, andere = wer === "_andere", nameAndere = form.name.value.trim();
    // Heißt die „andere Person“ genau wie ein Fahrlehrer (eindeutig), ist er gemeint – wie der Server es auch zuordnet
    const gleich = andere ? lehrer.filter((x) => (x.name || x.email || "").trim().toLowerCase() === nameAndere.toLowerCase()) : [];
    const lid = andere ? (gleich.length === 1 ? gleich[0].id : null) : wer;
    const l = lid ? lehrer.find((x) => x.id === lid) : null;
    const name = andere ? nameAndere : (l ? (l.name || l.email || "") : "");
    const von = form.von.value, bis = form.bis.value;
    if (!wer) { toast("Bitte wählen, für wen", true); return false; }
    if (!name) { toast("Bitte einen Namen eintragen", true); form.name.focus(); return false; }
    if (!von || !bis) { toast("Bitte von und bis eintragen", true); return false; }
    if (bis < von) { toast("„Bis“ liegt vor „von“", true); form.bis.focus(); return false; }
    if (bis < KR.todayISO()) { toast("Der Urlaub liegt schon in der Vergangenheit", true); form.bis.focus(); return false; }
    if ((Date.parse(bis + "T00:00:00Z") - Date.parse(von + "T00:00:00Z")) / 864e5 > 365) { toast("Höchstens ein Jahr am Stück", true); return false; }
    const res = await supa.from("fahrschule_urlaub").insert({ fahrschule_id: S.fsId, fahrlehrer_id: lid, mitarbeiter_name: name, von, bis, erstellt_von: S.user.id }).select("id");
    if (res.error) { toast("Nicht eingetragen: " + (res.error.code === "22023" && /gehört nicht zu dieser Fahrschule/.test(res.error.message || "") ? "diese Person gehört nicht zur Fahrschule" : dbFehlerText(res.error)), true); return false; }
    toast("Urlaub eingetragen");
    vwLadeUrlaub(true); zeichne(); // alte Liste bleibt stehen, bis die frische da ist (kein Springen)
  }, "Eintragen");
  const sel = dlg.querySelector("select[name=wer]"), nameZeile = dlg.querySelector("[data-vwname]"), von = dlg.querySelector("input[name=von]"), bis = dlg.querySelector("input[name=bis]");
  sel.addEventListener("change", () => { nameZeile.hidden = sel.value !== "_andere"; if (sel.value === "_andere") nameZeile.querySelector("input").focus(); });
  von.addEventListener("change", () => { if (bis.value && bis.value < von.value) bis.value = von.value; });
  return dlg;
}

/* ---------- Schichtplan (diese und nächste Woche) ---------- */
function vwSchichtZeitraum() {
  const heute = KR.todayISO(), d = new Date(heute + "T12:00:00");
  const montag = KR.addDaysISO(heute, -((d.getDay() + 6) % 7));
  return { montag, bis: KR.addDaysISO(montag, 13) };
}
function vwLadeSchichten(neu) {
  vwSchule();
  const z = vwSchichtZeitraum();
  // zeitraum merkt, zu welchen zwei Wochen die Liste gehört (Seite über Sonntag/Mitternacht offen → neu laden)
  return vwLaden("schichten", async () => Object.assign(await supa.from("fahrschule_schichten").select("*").eq("fahrschule_id", S.fsId).gte("datum", z.montag).lte("datum", z.bis).order("datum"), { zeitraum: z.montag }), neu);
}
// Liste passt nicht mehr zu den angezeigten zwei Wochen: wie nicht geladen behandeln
function vwSchichtenPassen() { if (VW.schichten && VW.zeitraum !== vwSchichtZeitraum().montag) { VW.schichten = null; VW.stand.schichten = 0; } }
function renderSchichtplan() {
  vwSchule(); vwSchichtenPassen();
  const z = vwSchichtZeitraum(), heute = KR.todayISO();
  // Überschrift: die zwei angezeigten Wochen (der Seitentitel heißt schon „Schichtplan“)
  const kopf = `<div class="karte-kopf"><h2>${vwZeitraum(z.montag, z.bis)}</h2></div><p class="leise klein">Wer im Büro arbeitet, frei hat oder krank ist. Ein Tipp auf „+ Eintrag“ trägt jemanden für den Tag ein.</p>`;
  if (!VW.schichten) return `<div class="karte">${kopf}${vwFehlerKarte("schichten", "Der Schichtplan")}</div>`;
  const zeilen = [];
  for (let i = 0; i < 14; i++) {
    const tag = KR.addDaysISO(z.montag, i), d = new Date(tag + "T12:00:00");
    const eintraege = VW.schichten.filter((s) => s.datum === tag);
    zeilen.push(`<tr${tag === heute ? ' class="heute"' : ""}>
      <td class="zeitspalte"><b>${tag === heute ? "Heute" : VW_TAGE[(d.getDay() + 6) % 7]}</b> ${esc(datumDE(tag).slice(0, 6))}</td>
      <td class="vw-eintraege">${eintraege.length ? eintraege.map((e) => `<div class="vw-schicht"><span class="vw-wer">${esc(e.mitarbeiter_name)} <span class="marke-pill${e.status === "krank" ? " rot" : e.status === "arbeitet" ? " gruen" : ""}">${esc(VW_STATUS[e.status] || e.status)}</span>${e.notiz ? ` <span class="leise">${esc(e.notiz)}</span>` : ""}</span>
        <button class="knopf klein" type="button" data-vwschichtweg="${esc(e.id)}" aria-label="Eintrag ${esc(e.mitarbeiter_name)} löschen">Löschen</button></div>`).join("") : ""}</td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" type="button" data-vwschichtneu="${tag}">+ Eintrag</button></div></td></tr>`);
  }
  return `<div class="karte">${kopf}${vwAltHinweis("schichten")}<table class="tabelle vw-plan"><thead><tr><th>Tag</th><th>Einträge</th><th></th></tr></thead><tbody>${zeilen.join("")}</tbody></table></div>`;
}
function bindeSchichtplan(ziel) {
  vwSchichtenPassen();
  if (vwVeraltet("schichten")) vwLadeSchichten();
  vwBindeNeuLaden(ziel, "schichten", () => vwLadeSchichten(true));
  ziel.querySelectorAll("[data-vwschichtneu]").forEach((b) => b.addEventListener("click", () => schichtDialog(b.dataset.vwschichtneu)));
  ziel.querySelectorAll("[data-vwschichtweg]").forEach((b) => b.addEventListener("click", () => {
    const e = (VW.schichten || []).find((x) => x.id === b.dataset.vwschichtweg);
    if (!e) return;
    b.disabled = true;
    vwLoeschen("fahrschule_schichten", e, "Eintrag gelöscht", (weg) => { if (weg && VW.schichten) VW.schichten = VW.schichten.filter((x) => x.id !== e.id); vwLadeSchichten(true); zeichne(); });
  }));
}
// Statt dreier Eingabefenster (wie früher in der App) ein Fenster: Name, Status, Notiz
function schichtDialog(datum) {
  const vorschlag = S.werAnzeige || (S.profil && S.profil.rolle !== "buero" ? S.profil.name : "") || "";
  return oeffneDialog("Schicht eintragen · " + datumDE(datum), `<div class="formular">
      <label class="voll">Name<input type="text" name="name" maxlength="80" required autocomplete="off" value="${esc(vorschlag)}"></label>
      <label class="voll">Status<select name="status">${Object.keys(VW_STATUS).map((s) => `<option value="${s}">${esc(VW_STATUS[s])}</option>`).join("")}</select></label>
      <label class="voll">Notiz (freiwillig)<input type="text" name="notiz" maxlength="120" autocomplete="off"></label>
    </div>`, async (form) => {
    const name = form.name.value.trim();
    if (!name) { toast("Bitte einen Namen eintragen", true); form.name.focus(); return false; }
    const status = VW_STATUS[form.status.value] ? form.status.value : "arbeitet";
    const res = await supa.from("fahrschule_schichten").insert({ fahrschule_id: S.fsId, mitarbeiter_name: name, datum, status, notiz: form.notiz.value.trim() || null, erstellt_von: S.user.id }).select("id");
    if (res.error) { toast("Nicht eingetragen: " + dbFehlerText(res.error), true); return false; }
    toast("Eingetragen");
    vwLadeSchichten(true); zeichne();
  }, "Eintragen");
}

/* ---------- Backups ---------- */
function vwLadeBackups(neu) {
  vwSchule();
  return vwLaden("backups", () => supa.from("fahrschule_backups").select("id,erstellt_am,automatisch").eq("fahrschule_id", S.fsId).order("erstellt_am", { ascending: false }).limit(30), neu);
}
function renderBackups() {
  vwSchule();
  // Überschrift: Stand des letzten Backups (der Seitentitel heißt schon „Backups“)
  const letztes = VW.backups && VW.backups[0] ? new Date(VW.backups[0].erstellt_am).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "";
  const kopf = `<div class="karte-kopf"><h2>${letztes ? "Letztes: " + esc(letztes) : VW.backups ? "Noch keins" : "Backups"}</h2><button class="knopf haupt" id="vwBackupJetzt" type="button">Jetzt alles sichern</button></div>
    <p class="leise klein">Läuft automatisch jeden Sonntag um 23 Uhr. Du kannst jederzeit zusätzlich sichern. <span class="marke-pill gelb vw-hinweis">Die Datei enthält Personendaten: nur sicher aufbewahren.</span></p>`;
  if (!VW.backups) return `<div class="karte">${kopf}${vwFehlerKarte("backups", "Die Liste der Backups")}</div>`;
  if (!VW.backups.length) return `<div class="karte">${kopf}${vwAltHinweis("backups")}<p class="leer">Noch keine Backups vorhanden. „Jetzt alles sichern“ legt das erste an.</p></div>`;
  return `<div class="karte">${kopf}${vwAltHinweis("backups")}<table class="tabelle vw-liste"><thead><tr><th>Erstellt</th><th>Art</th><th></th></tr></thead><tbody>${VW.backups.map((b) => `<tr>
      <td>${esc(new Date(b.erstellt_am).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }))}</td>
      <td>${b.automatisch ? "automatisch (wöchentlich)" : "von Hand"}</td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" type="button" data-vwbackuplade="${esc(b.id)}">Herunterladen</button></div></td></tr>`).join("")}</tbody></table></div>`;
}
function bindeBackups(ziel) {
  if (vwVeraltet("backups")) vwLadeBackups();
  vwBindeNeuLaden(ziel, "backups", () => vwLadeBackups(true));
  const jetzt = ziel.querySelector("#vwBackupJetzt");
  if (jetzt) jetzt.addEventListener("click", async () => {
    jetzt.disabled = true; jetzt.textContent = "Sichere …";
    const res = await supa.rpc("fahrschule_backup_erstellen", { fs_id: S.fsId, ist_automatisch: false });
    jetzt.disabled = false; jetzt.textContent = "Jetzt alles sichern";
    if (res.error) { toast("Backup nicht erstellt: " + dbFehlerText(res.error), true); return; }
    toast("Backup erstellt");
    vwLadeBackups(true); zeichne();
  });
  ziel.querySelectorAll("[data-vwbackuplade]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    const res = await supa.from("fahrschule_backups").select("*").eq("id", b.dataset.vwbackuplade).maybeSingle();
    b.disabled = false;
    if (res.error || !res.data) { toast("Backup nicht geladen: " + (res.error ? dbFehlerText(res.error) : "nicht gefunden"), true); return; }
    const blob = new Blob([JSON.stringify(res.data.daten, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fahrschule-backup-${String(res.data.erstellt_am || "").slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
}
