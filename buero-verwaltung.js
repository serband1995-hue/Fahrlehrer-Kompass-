/* Kompass Büro – Urlaub, Schichtplan und Backups (Werkstatt 16, 24.11.2026).
   Bisher gab es diese drei nur in der App-Gesamtansicht („Weitere Verwaltung“). Seit W16 kommt das Büro nur noch auf
   die Büro-Seite (🗣 Serband: „je nachdem, wo man sich anmeldet, kommt die richtige Seite“), darum stehen sie jetzt hier.
   Gleiche Tabellen und Regeln wie in der App: fahrschule_urlaub (mit Fahrlehrer-ID, W14), fahrschule_schichten,
   fahrschule_backups. Die Datenbank erlaubt sie Büro, Leitung und Super-Admin (Zugriffsregeln „…/Buero verwaltet …“).
   Eingehängt in BEREICHE (buero.js, Gruppe „Verwaltung“). Löschen ohne Rückfrage, 6 Sekunden „Rückgängig“ (K7). */
"use strict";

const VW = { fsId: null, urlaub: null, schichten: null, backups: null, fehler: {}, laedt: {} };
const VW_STATUS = { arbeitet: "arbeitet", frei: "frei", krank: "krank" };
const VW_TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Andere Fahrschule gewählt (Super-Admin): nichts von der vorigen zeigen
function vwSchule() {
  if (VW.fsId === S.fsId) return;
  VW.fsId = S.fsId; VW.urlaub = null; VW.schichten = null; VW.backups = null; VW.fehler = {}; VW.laedt = {};
}
function vwFehlerKarte(was, titel) {
  return `<p class="leer">${VW.fehler[was] ? `${esc(titel)} konnte nicht geladen werden (${esc(VW.fehler[was])}). <button class="knopf klein" type="button" data-vwneu="${was}">Nochmal laden</button>` : "Lade …"}</p>`;
}
// Lädt einen Bereich nach und zeichnet ihn neu, wenn er noch offen ist
async function vwLaden(was, abfrage) {
  if (VW.laedt[was]) return;
  VW.laedt[was] = true;
  const fs = S.fsId;
  let res;
  try { res = await abfrage(); } catch (e) { res = { error: e }; }
  VW.laedt[was] = false;
  if (fs !== S.fsId) return; // inzwischen andere Fahrschule
  if (res.error) { VW[was] = null; VW.fehler[was] = dbFehlerText(res.error); }
  else { VW[was] = res.data || []; delete VW.fehler[was]; }
  if (aktuellerBereich().id === (was === "schichten" ? "schichtplan" : was)) zeichne();
}
function vwBindeNeuLaden(ziel, was, laden) {
  ziel.querySelectorAll(`[data-vwneu="${was}"]`).forEach((b) => b.addEventListener("click", () => { delete VW.fehler[was]; zeichne(); laden(); }));
}
// Zeile löschen; „Rückgängig“ setzt sie unverändert wieder ein (wie _cloudLoeschenMitRueckgaengig in der App)
async function vwLoeschen(tabelle, zeile, text, neuLaden) {
  const res = await supa.from(tabelle).delete().eq("id", zeile.id).select("id");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gelöscht: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true); return; }
  neuLaden();
  toastUndo(text, async () => {
    const r = await supa.from(tabelle).insert(zeile).select("id");
    if (r.error) { toast("Nicht wiederhergestellt: " + dbFehlerText(r.error), true); return; }
    toast("Wiederhergestellt");
    neuLaden();
  });
}

/* ---------- Urlaub ---------- */
function vwLadeUrlaub() {
  vwSchule();
  return vwLaden("urlaub", () => supa.from("fahrschule_urlaub").select("*").eq("fahrschule_id", S.fsId).gte("bis", KR.todayISO()).order("von"));
}
// Name: bei einem Fahrlehrer der aktuelle Profilname (umbenennen ändert nichts), sonst der eingetragene Name (W14)
function vwUrlaubName(u) {
  if (u.fahrlehrer_id) { const l = S.lehrer.find((x) => x.id === u.fahrlehrer_id) || (S.team || []).find((x) => x.id === u.fahrlehrer_id); if (l) return l.name || l.email || u.mitarbeiter_name || ""; }
  return u.mitarbeiter_name || "";
}
// Blockiert dieser Urlaub keinen Kalender? (keine ID oder die Person unterrichtet nicht mehr)
function vwUrlaubOhneKalender(u) { return !u.fahrlehrer_id || !S.lehrer.some((l) => l.id === u.fahrlehrer_id); }
function renderUrlaub() {
  vwSchule();
  const kopf = `<div class="karte-kopf"><h2>Urlaub${VW.urlaub ? ` (${VW.urlaub.length})` : ""}</h2><button class="knopf haupt" id="vwUrlaubNeu" type="button">+ Urlaub eintragen</button></div>
    <p class="leise klein">Bei einem Fahrlehrer sind die Tage in seinem Kalender blockiert. Andere Personen (z. B. Büro) stehen nur in der Liste.</p>`;
  if (!VW.urlaub) return `<div class="karte">${kopf}${vwFehlerKarte("urlaub", "Der Urlaub")}</div>`;
  if (!VW.urlaub.length) return `<div class="karte">${kopf}<p class="leer">Aktuell kein eingetragener Urlaub.</p></div>`;
  return `<div class="karte">${kopf}<table class="tabelle"><thead><tr><th>Person</th><th>Zeitraum</th><th></th></tr></thead><tbody>${VW.urlaub.map((u) => `<tr>
      <td><b>${esc(vwUrlaubName(u))}</b>${vwUrlaubOhneKalender(u) ? '<div class="unter">ohne Kalender (blockiert nichts)</div>' : ""}${u.notiz ? `<div class="unter">${esc(u.notiz)}</div>` : ""}</td>
      <td>${u.von === u.bis ? esc(datumDE(u.von)) : esc(datumDE(u.von)) + " – " + esc(datumDE(u.bis))}</td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" type="button" data-vwurlaubweg="${esc(u.id)}">Löschen</button></div></td></tr>`).join("")}</tbody></table></div>`;
}
function bindeUrlaub(ziel) {
  if (!VW.urlaub && !VW.fehler.urlaub) vwLadeUrlaub();
  vwBindeNeuLaden(ziel, "urlaub", vwLadeUrlaub);
  const neu = ziel.querySelector("#vwUrlaubNeu");
  if (neu) neu.addEventListener("click", () => urlaubDialog());
  ziel.querySelectorAll("[data-vwurlaubweg]").forEach((b) => b.addEventListener("click", () => {
    const u = (VW.urlaub || []).find((x) => x.id === b.dataset.vwurlaubweg);
    if (!u) return;
    b.disabled = true;
    vwLoeschen("fahrschule_urlaub", u, "Urlaubseintrag gelöscht", () => { VW.urlaub = null; vwLadeUrlaub(); zeichne(); });
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
    VW.urlaub = null; vwLadeUrlaub(); zeichne();
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
function vwLadeSchichten() {
  vwSchule();
  const z = vwSchichtZeitraum();
  return vwLaden("schichten", () => supa.from("fahrschule_schichten").select("*").eq("fahrschule_id", S.fsId).gte("datum", z.montag).lte("datum", z.bis).order("datum"));
}
function renderSchichtplan() {
  vwSchule();
  const kopf = `<div class="karte-kopf"><h2>Schichtplan (2 Wochen)</h2></div><p class="leise klein">Wer im Büro arbeitet, frei hat oder krank ist. Ein Tipp auf „+ Eintrag“ trägt jemanden für den Tag ein.</p>`;
  if (!VW.schichten) return `<div class="karte">${kopf}${vwFehlerKarte("schichten", "Der Schichtplan")}</div>`;
  const z = vwSchichtZeitraum(), heute = KR.todayISO();
  const zeilen = [];
  for (let i = 0; i < 14; i++) {
    const tag = KR.addDaysISO(z.montag, i), d = new Date(tag + "T12:00:00");
    const eintraege = VW.schichten.filter((s) => s.datum === tag);
    zeilen.push(`<tr${tag === heute ? ' class="heute"' : ""}>
      <td class="zeitspalte"><b>${VW_TAGE[(d.getDay() + 6) % 7]}</b> ${esc(datumDE(tag).slice(0, 6))}</td>
      <td>${eintraege.length ? eintraege.map((e) => `<div class="vw-schicht" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:2px 0;"><span>${esc(e.mitarbeiter_name)} – <span class="marke-pill${e.status === "krank" ? " rot" : e.status === "arbeitet" ? " gruen" : ""}">${esc(VW_STATUS[e.status] || e.status)}</span>${e.notiz ? ` <span class="leise">(${esc(e.notiz)})</span>` : ""}</span>
        <button class="knopf klein" type="button" data-vwschichtweg="${esc(e.id)}" aria-label="Eintrag ${esc(e.mitarbeiter_name)} löschen">Löschen</button></div>`).join("") : '<span class="leise" aria-label="Keine Einträge">–</span>'}</td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" type="button" data-vwschichtneu="${tag}">+ Eintrag</button></div></td></tr>`);
  }
  return `<div class="karte">${kopf}<table class="tabelle"><thead><tr><th>Tag</th><th>Einträge</th><th></th></tr></thead><tbody>${zeilen.join("")}</tbody></table></div>`;
}
function bindeSchichtplan(ziel) {
  if (!VW.schichten && !VW.fehler.schichten) vwLadeSchichten();
  vwBindeNeuLaden(ziel, "schichten", vwLadeSchichten);
  ziel.querySelectorAll("[data-vwschichtneu]").forEach((b) => b.addEventListener("click", () => schichtDialog(b.dataset.vwschichtneu)));
  ziel.querySelectorAll("[data-vwschichtweg]").forEach((b) => b.addEventListener("click", () => {
    const e = (VW.schichten || []).find((x) => x.id === b.dataset.vwschichtweg);
    if (!e) return;
    b.disabled = true;
    vwLoeschen("fahrschule_schichten", e, "Eintrag gelöscht", () => { VW.schichten = null; vwLadeSchichten(); zeichne(); });
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
    VW.schichten = null; vwLadeSchichten(); zeichne();
  }, "Eintragen");
}

/* ---------- Backups ---------- */
function vwLadeBackups() {
  vwSchule();
  return vwLaden("backups", () => supa.from("fahrschule_backups").select("id,erstellt_am,automatisch").eq("fahrschule_id", S.fsId).order("erstellt_am", { ascending: false }).limit(30));
}
function renderBackups() {
  vwSchule();
  const kopf = `<div class="karte-kopf"><h2>Backups</h2><button class="knopf haupt" id="vwBackupJetzt" type="button">Jetzt alles sichern</button></div>
    <p class="leise klein">Läuft automatisch jeden Sonntag um 23 Uhr. Du kannst jederzeit zusätzlich sichern. Die Datei enthält Personendaten: nur sicher aufbewahren.</p>`;
  if (!VW.backups) return `<div class="karte">${kopf}${vwFehlerKarte("backups", "Die Liste der Backups")}</div>`;
  if (!VW.backups.length) return `<div class="karte">${kopf}<p class="leer">Noch keine Backups vorhanden.</p></div>`;
  return `<div class="karte">${kopf}<table class="tabelle"><thead><tr><th>Erstellt</th><th>Art</th><th></th></tr></thead><tbody>${VW.backups.map((b) => `<tr>
      <td>${esc(new Date(b.erstellt_am).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }))}</td>
      <td>${b.automatisch ? "automatisch (wöchentlich)" : "von Hand"}</td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" type="button" data-vwbackuplade="${esc(b.id)}">Herunterladen</button></div></td></tr>`).join("")}</tbody></table></div>`;
}
function bindeBackups(ziel) {
  if (!VW.backups && !VW.fehler.backups) vwLadeBackups();
  vwBindeNeuLaden(ziel, "backups", vwLadeBackups);
  const jetzt = ziel.querySelector("#vwBackupJetzt");
  if (jetzt) jetzt.addEventListener("click", async () => {
    jetzt.disabled = true; jetzt.textContent = "Sichere …";
    const res = await supa.rpc("fahrschule_backup_erstellen", { fs_id: S.fsId, ist_automatisch: false });
    jetzt.disabled = false; jetzt.textContent = "Jetzt alles sichern";
    if (res.error) { toast("Backup nicht erstellt: " + dbFehlerText(res.error), true); return; }
    toast("Backup erstellt");
    VW.backups = null; vwLadeBackups(); zeichne();
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
