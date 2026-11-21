/* Kompass Büro – Ausbildungsnachweis (🗣 Serband 21.11.2026, Wunsch Nr. 3 aus dem Boost-Termin)
   Kleiner Knopf „Ausbildungsnachweis“ in der Schüler-Akte → Übersicht je Schüler (Fahrstunden, Sonderfahrten, Theorie,
   Unterschriften, was noch fehlt), Fahrstunden ändern / nachtragen / löschen (immer mit Spur), Papierkorb, Verlauf
   und „Ausbildungsnachweis erstellen“ (A4, Drucken oder als PDF speichern).
   Recht (Vault-Recherche 10.11.2026): heute Muster Anlage 3 DV-FahrlG (Datum, Art und Inhalt, Beginn, Minuten, Fahrlehrer,
   Unterschriften), Unterschrift elektronisch erlaubt, Übergabe digital erlaubt (§ 6 Abs. 2 FahrschAusbO), Teil-Nachweis bei
   Abbruch oder Wechsel, 5 Jahre aufbewahren (§ 31 FahrlG). Ab 01.07.2027 (BT-Drs. 21/7404): kein Muster, keine
   Unterschrift des Schülers, Aufzeichnung „in geeigneter Form“ → NACHWEIS_NEU_AB schaltet das Druckbild um.
   Spur in der Datenbank: Trigger trg_termin_zz_nachweis_spur (supabase/migrations/20261121_nachweis_01_termin_spur.sql).
   Ändert jemand Datum, Uhrzeit, Art oder Schüler einer unterschriebenen Stunde, setzt der Trigger signed=false und
   legt den alten Abdruck in payload.signaturUngueltig ab. Gelöscht wird nie hart (geloescht=true, Papierkorb). */
"use strict";
const NACHWEIS_NEU_AB = "2027-07-01";
const NW_FAHRT_ARTEN = ["fahrstunde", "sonder", "nacht", "schalt"];
const NW_SONDER = [["ueberland", "Überlandfahrt"], ["autobahn", "Autobahnfahrt"], ["nacht", "Fahrt bei Dämmerung oder Dunkelheit"]];
const NW_ART_WAHL = [["fahrstunde", "Übungsfahrt (Grundausbildung)"], ["ueberland", "Sonderfahrt Überland"], ["autobahn", "Sonderfahrt Autobahn"], ["nacht", "Sonderfahrt Dämmerung/Dunkelheit"], ["schalt", "Schaltkompetenz"]];

function nwNeuesRecht(heute) { return String(heute || KR.todayISO()) >= NACHWEIS_NEU_AB; }
function nwMinuten(t) { if (!t.von || !t.bis) return 0; return Math.max(0, KR.hm2min(t.bis) - KR.hm2min(t.von)); }
// Art der Sonderfahrt: Büro-Eintrag (payload.sonderArt), sonst der Ausbildungsplan der App (srcSonder „sid:gruppe:nr“)
function nwSonderArt(t) {
  if (t.art === "nacht") return "nacht";
  if (t.art !== "sonder") return "";
  const p = t.payload || {};
  if (p.sonderArt) return p.sonderArt;
  const g = String(p.srcSonder || "").split(":")[1] || "";
  return ["ueberland", "autobahn", "nacht"].includes(g) ? g : "";
}
function nwArtWahl(t) { return t.art === "schalt" ? "schalt" : (nwSonderArt(t) || (t.art === "sonder" ? "ueberland" : "fahrstunde")); }
function nwArtText(t) {
  const s = nwSonderArt(t);
  if (s) return (NW_SONDER.find((x) => x[0] === s) || [, "Sonderfahrt"])[1];
  if (t.art === "sonder") return "Sonderfahrt (Art fehlt)";
  if (t.art === "schalt") return "Schaltkompetenz";
  return "Übungsfahrt (Grundausbildung)";
}
function nwAusgefallen(t) { const st = (t.payload || {}).status || t.status; return st === "abgebrochen" || st === "nicht erschienen"; }
// Stunde ist gelaufen: Datum vorbei, oder heute und schon zu Ende
function nwVorbei(t, heute, jetztMin) { return t.datum < heute || (t.datum === heute && t.bis && KR.hm2min(t.bis) <= jetztMin); }
// Unterschrift: ok | neu (nach Änderung neu nötig) | offen
function nwUnterschrift(t) {
  const p = t.payload || {};
  if (p.signed && p.signatureSnap) return "ok";
  return p.signaturUngueltig ? "neu" : "offen";
}
function nwBildUrl(u) { return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(u || "")) ? u : ""; }

// Daten eines Schülers frisch aus der Datenbank (das Büro hält sonst nur die letzten Monate im Speicher)
async function nwLaden(sid) {
  const res = await alleSeiten(() => supa.from("kalender_termine").select("*").eq("schueler_id", sid).order("datum").order("id"));
  if (res.error) return { fehler: res.error.message };
  const alle = (res.data || []).filter((t) => NW_FAHRT_ARTEN.includes(t.art || "fahrstunde"));
  const ids = alle.map((t) => t.id);
  let spur = [], spurFehlt = false;
  for (let i = 0; i < ids.length; i += 150) {
    const r = await supa.from("aenderungsprotokoll").select("*").eq("tabelle", "kalender_termine").in("datensatz_id", ids.slice(i, i + 150)).order("geaendert_am", { ascending: false }).limit(500);
    if (r.error) { spurFehlt = true; break; }
    spur.push(...(r.data || []));
  }
  spur.sort((a, b) => String(b.geaendert_am).localeCompare(String(a.geaendert_am)));
  return { aktiv: alle.filter((t) => !t.geloescht), papierkorb: alle.filter((t) => t.geloescht), spur, spurFehlt };
}

// Kennzahlen für Übersicht und Druck
function nwStand(x, d) {
  const heute = KR.todayISO(), jetzt = new Date(), jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();
  const gelaufen = d.aktiv.filter((t) => t.datum && nwVorbei(t, heute, jetztMin) && !nwAusgefallen(t)).sort((a, b) => (a.datum + (a.von || "")).localeCompare(b.datum + (b.von || "")));
  const geplant = d.aktiv.filter((t) => t.datum && !nwVorbei(t, heute, jetztMin) && !nwAusgefallen(t));
  const form = formAusKlasse(klasseVon(x) || "B");
  const soll = istUmschreiber(x) ? [0, 0, 0] : KR.sonderSoll(form, lkwWegBuero(x));
  const ist = { ueberland: 0, autobahn: 0, nacht: 0 };
  let grundMin = 0, sonderOhneArt = 0, schaltMin = 0;
  for (const t of gelaufen) {
    const a = nwSonderArt(t), m = nwMinuten(t);
    if (a) ist[a] += Math.floor(m / 45);
    else if (t.art === "sonder") sonderOhneArt++;
    else if (t.art === "schalt") schaltMin += m;
    else grundMin += m;
  }
  // Ausbildungsplan der App: abgehakte Sonderfahrten ohne Kalendertermin (die fehlen im Nachweis)
  const plan = ((x.ausbildung || {}).plan || {}).sonder || {};
  const planIst = {}; for (const [k] of NW_SONDER) planIst[k] = (plan[k] || []).filter((o) => o && o.iso).length;
  const unterschrift = { ok: 0, neu: 0, offen: 0 };
  for (const t of gelaufen) unterschrift[nwUnterschrift(t)]++;
  const theorie = typeof theorieStandVon === "function" ? theorieStandVon(x) : null;
  const fehlt = [];
  NW_SONDER.forEach(([k, n], i) => { if (ist[k] < soll[i]) fehlt.push(`${n}: ${soll[i] - ist[k]} × 45 Min.`); });
  if (sonderOhneArt) fehlt.push(`${sonderOhneArt} Sonderfahrt${sonderOhneArt === 1 ? "" : "en"} ohne Art (bitte ändern)`);
  if (theorie && theorie.geladen && theorie.pflicht && !theorie.fertig && !theorie.bestanden) fehlt.push(`Theorie: ${theorie.ist} von ${theorie.soll} Doppelstunden`);
  if (!x.theorie_bestanden_am) fehlt.push("Theorieprüfung");
  if (!x.praxis_bestanden_am) fehlt.push("Praxisprüfung");
  if (!nwNeuesRecht(heute) && (unterschrift.offen + unterschrift.neu)) fehlt.push(`${unterschrift.offen + unterschrift.neu} Unterschrift${unterschrift.offen + unterschrift.neu === 1 ? "" : "en"} des Schülers`);
  return { heute, gelaufen, geplant, soll, ist, grundMin, schaltMin, sonderOhneArt, planIst, unterschrift, theorie, fehlt };
}

function nwMin(m) { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} Std.${r ? " " + r + " Min." : ""}` : `${r} Min.`; }
const NW_FELD = { datum: "Datum", von: "Beginn", bis: "Ende", art: "Art", schueler_id: "Schüler", fahrlehrer_id: "Fahrlehrer", geloescht: "Gelöscht", status: "Status", sonderArt: "Sonderfahrt", signed: "Unterschrift", angelegt: "Nachgetragen" };
function nwSpurWert(p, v) {
  if (v == null || v === "") return "–";
  if (p.feld === "geloescht" || p.feld === "signed") return v === "true" ? "ja" : "nein";
  if (p.feld === "fahrlehrer_id") return lehrerName(v) || "–";
  if (p.feld === "schueler_id") return schuelerName(v) || "anderer Schüler";
  if (p.feld === "art") return ARTEN[v] || v;
  if (p.feld === "sonderArt") return (NW_SONDER.find((x) => x[0] === v) || [, v])[1];
  if (/^\d{4}-\d\d-\d\d/.test(v)) return datumDE(v.slice(0, 10)) + v.slice(10);
  return v;
}
function nwSpurWer(p) { return p.bearbeiter || (teamPerson(p.geaendert_von) || {}).name || (p.geaendert_von ? "Büro" : "System"); }
function nwSpurZeile(p, t) {
  const wann = new Date(p.geaendert_am).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  const was = p.feld === "angelegt" ? `Fahrstunde nachgetragen (${esc(nwSpurWert(p, p.neu))})`
    : p.feld === "geloescht" ? (p.neu === "true" ? "in den Papierkorb gelegt" : "aus dem Papierkorb zurückgeholt")
    : p.feld === "signed" ? (p.neu === "true" ? "vom Schüler unterschrieben" : "Unterschrift ungültig oder entfernt")
    : `${esc(NW_FELD[p.feld] || p.feld)} ${esc(nwSpurWert(p, p.alt))} → ${esc(nwSpurWert(p, p.neu))}`;
  return `${esc(wann)} · ${esc(nwSpurWer(p))}: ${t ? `Stunde vom ${esc(datumDE(t.datum))} · ` : ""}${was}${p.grund ? ` · Grund: „${esc(p.grund)}“` : ""}`;
}

function nwUebersichtHTML(x, d, st) {
  const pill = (txt, gut) => `<span class="marke-pill${gut ? " gruen" : ""}">${txt}</span>`;
  const kurz = { ueberland: "Überland", autobahn: "Autobahn", nacht: "Nacht" };
  const sonder = NW_SONDER.map(([k], i) => pill(`${kurz[k]} ${st.ist[k]}/${st.soll[i]}`, st.ist[k] >= st.soll[i])).join(" ");
  const planHinweis = NW_SONDER.filter(([k]) => st.planIst[k] > st.ist[k]).map(([k, n]) => `${n}: ${st.planIst[k] - st.ist[k]} im Ausbildungsplan abgehakt, aber ohne Termin im Kalender`);
  const u = st.unterschrift, alt = !nwNeuesRecht(st.heute);
  const zeilen = st.gelaufen.slice().reverse().map((t) => {
    const us = nwUnterschrift(t);
    const usTxt = !alt ? "" : us === "ok" ? `<span class="marke-pill gruen">✓ unterschrieben</span>` : us === "neu" ? `<span class="marke-pill rot" title="Nach der Unterschrift geändert">⚠ neu unterschreiben</span>` : `<span class="marke-pill">offen</span>`;
    return `<li class="nw-zeile"><span class="nw-wann"><b>${esc(datumDE(t.datum))}</b> ${esc(t.von || "")}–${esc(t.bis || "")}</span>
      <span class="nw-was">${esc(nwArtText(t))} · ${nwMinuten(t)} Min. · ${esc(lehrerName(t.fahrlehrer_id) || "–")}</span>
      <span class="nw-us">${usTxt}</span>
      <span class="nw-knoepfe"><button type="button" class="knopf klein" data-nwaendern="${esc(t.id)}">Ändern</button><button type="button" class="knopf klein" data-nwloeschen="${esc(t.id)}" aria-label="Fahrstunde vom ${esc(datumDE(t.datum))} löschen">Löschen</button></span></li>`;
  }).join("");
  const termin = (id) => d.aktiv.concat(d.papierkorb).find((t) => t.id === id);
  return `<div class="nw-kacheln">
      <div class="nw-kachel"><span class="leise klein">Übungsfahrten</span><b>${nwMin(st.grundMin)}</b><span class="leise klein">${st.gelaufen.filter((t) => !nwSonderArt(t) && t.art !== "sonder" && t.art !== "schalt").length} Termine</span></div>
      <div class="nw-kachel"><span class="leise klein">Sonderfahrten (je 45 Min.)</span><span>${sonder}</span></div>
      <div class="nw-kachel"><span class="leise klein">Theorie</span><b>${st.theorie && st.theorie.geladen && st.theorie.pflicht ? `${st.theorie.ist}/${st.theorie.soll}` : "–"}</b><span class="leise klein">${x.theorie_bestanden_am ? "Prüfung bestanden " + esc(datumDE(x.theorie_bestanden_am)) : "Prüfung offen"}</span></div>
      ${alt ? `<div class="nw-kachel"><span class="leise klein">Unterschriften</span><b>${u.ok}/${st.gelaufen.length}</b><span class="leise klein">${u.neu ? `${u.neu} neu nötig` : u.offen ? `${u.offen} offen` : "vollständig"}</span></div>` : ""}
    </div>
    ${st.fehlt.length ? `<p class="nw-fehlt"><b>Noch offen:</b> ${st.fehlt.map(esc).join(" · ")}</p>` : `<p class="nw-fehlt gut"><b>✓ Alles da.</b></p>`}
    ${planHinweis.length ? `<p class="fl-warnung bald">${planHinweis.map(esc).join("<br>")}. Im Nachweis stehen nur Fahrten mit Datum und Uhrzeit: bitte nachtragen.</p>` : ""}
    ${st.geplant.length ? `<p class="leise klein">Noch geplant: ${st.geplant.length} Termin${st.geplant.length === 1 ? "" : "e"} (zählen erst, wenn sie gefahren sind).</p>` : ""}
    <div class="nw-kopf"><h3>Gefahrene Stunden (${st.gelaufen.length})</h3><button type="button" class="knopf klein" id="nwNeu">+ Fahrstunde nachtragen</button></div>
    ${zeilen ? `<ul class="nw-liste">${zeilen}</ul>` : `<p class="leise klein">Noch keine gefahrene Stunde im Kalender.</p>`}
    <details class="nw-details"><summary>Papierkorb (${d.papierkorb.length})</summary>
      ${d.papierkorb.length ? `<ul class="nw-liste">${d.papierkorb.map((t) => `<li class="nw-zeile"><span class="nw-wann">${esc(datumDE(t.datum))} ${esc(t.von || "")}–${esc(t.bis || "")}</span><span class="nw-was">${esc(nwArtText(t))} · ${esc(lehrerName(t.fahrlehrer_id) || "–")}</span><span class="nw-knoepfe"><button type="button" class="knopf klein" data-nwzurueck="${esc(t.id)}">Wiederherstellen</button></span></li>`).join("")}</ul>` : `<p class="leise klein">Leer. Gelöschte Stunden landen hier und lassen sich zurückholen.</p>`}
    </details>
    <details class="nw-details"><summary>Verlauf der Änderungen (${d.spur.length})</summary>
      ${d.spurFehlt ? `<p class="leise klein">Verlauf konnte nicht geladen werden.</p>` : d.spur.length ? `<ul class="nw-spur">${d.spur.map((p) => `<li>${nwSpurZeile(p, termin(p.datensatz_id))}</li>`).join("")}</ul>` : `<p class="leise klein">Noch keine Änderung. Jede Änderung wird hier mit Name, Zeit, altem und neuem Wert festgehalten.</p>`}
    </details>
    <label class="wahl nw-teil"><input type="checkbox" id="nwTeil"> Teil-Nachweis (Ausbildung abgebrochen oder Fahrschule gewechselt)</label>`;
}

// Hauptfenster: Übersicht je Schüler
async function nachweisDialog(sid) {
  const x = S.schueler.find((y) => y.id === sid); if (!x) return;
  let d = null, st = null;
  const dlg = oeffneDialog(`Ausbildungsnachweis: ${x.name}`, `<div id="nwInhalt" data-entwurf><p class="leise">Lade alle Fahrstunden …</p></div>`, async () => {
    if (!d) { toast("Daten sind noch nicht geladen.", true); return false; }
    nwDrucken(x, d, nwStand(x, d), !!dlg.querySelector("#nwTeil:checked"));
    return false; // Fenster bleibt offen
  }, "Ausbildungsnachweis erstellen", { abbrechenText: "Schließen" });
  dlg.classList.add("dialog-breit");
  const ziel = dlg.querySelector("#nwInhalt");
  const neu = async () => {
    d = await nwLaden(sid);
    if (!ziel.isConnected) return;
    if (d.fehler) { ziel.innerHTML = `<p class="fl-warnung">Fahrstunden konnten nicht geladen werden: ${esc(d.fehler)}</p>`; d = null; return; }
    const teil = !!dlg.querySelector("#nwTeil:checked");
    st = nwStand(x, d);
    ziel.innerHTML = nwUebersichtHTML(x, d, st);
    if (teil) ziel.querySelector("#nwTeil").checked = true;
    ziel.querySelector("#nwNeu").addEventListener("click", () => nwStundeDialog(x, null, neu));
    ziel.querySelectorAll("[data-nwaendern]").forEach((b) => b.addEventListener("click", () => nwStundeDialog(x, d.aktiv.find((t) => t.id === b.dataset.nwaendern), neu)));
    ziel.querySelectorAll("[data-nwloeschen]").forEach((b) => b.addEventListener("click", () => nwLoeschen(d.aktiv.find((t) => t.id === b.dataset.nwloeschen), neu)));
    ziel.querySelectorAll("[data-nwzurueck]").forEach((b) => b.addEventListener("click", () => nwWiederherstellen(d.papierkorb.find((t) => t.id === b.dataset.nwzurueck), neu)));
  };
  await neu();
}

// Büro-Kalender im Speicher nachziehen (nur Termine im geladenen Zeitraum)
function nwMerken(zeile) {
  if (!zeile) return;
  const i = S.termine.findIndex((t) => t.id === zeile.id);
  if (zeile.geloescht) { if (i >= 0) S.termine.splice(i, 1); }
  else if (i >= 0) S.termine[i] = zeile;
  else if (zeile.datum >= KR.addDaysISO(KR.todayISO(), -DATEN_TAGE)) S.termine.push(zeile);
}
// payload frisch lesen, damit eine Unterschrift oder ein Fahrcheck aus der App nicht überschrieben wird
async function nwFrischePayload(id) {
  const r = await supa.from("kalender_termine").select("payload").eq("id", id).maybeSingle();
  return r && !r.error && r.data ? (r.data.payload || {}) : null;
}

// Ändern oder nachtragen (t = null)
function nwStundeDialog(x, t, nachher) {
  const neu = !t;
  const v = t || { datum: KR.todayISO(), von: "", bis: "", art: "fahrstunde", fahrlehrer_id: x.fahrlehrer_id, payload: {} };
  const unterschrieben = !neu && nwUnterschrift(v) === "ok";
  const body = `<div class="formular">
      <label>Datum<input type="date" name="datum" required value="${esc(v.datum || "")}" max="${esc(KR.addDaysISO(KR.todayISO(), 365))}"></label>
      <label>Fahrlehrer<select name="fahrlehrer_id" required>${lehrerAuswahl(v.fahrlehrer_id).map((l) => `<option value="${esc(l.id)}"${l.id === v.fahrlehrer_id ? " selected" : ""}>${esc(l.name || l.email)}</option>`).join("")}</select></label>
      <label>Beginn<input type="time" name="von" required value="${esc(v.von || "")}"></label>
      <label>Ende<input type="time" name="bis" required value="${esc(v.bis || "")}"></label>
      <label class="voll">Art und Inhalt<select name="artwahl">${NW_ART_WAHL.map(([k, n]) => `<option value="${k}"${nwArtWahl(v) === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label class="voll">Grund (freiwillig, steht im Verlauf)<input type="text" name="grund" maxlength="200" placeholder="${neu ? "z. B. Fahrlehrer hat die Stunde nicht eingetragen" : "z. B. Uhrzeit war falsch eingetragen"}"></label>
      ${unterschrieben ? `<p class="voll fl-warnung bald">Diese Stunde ist schon unterschrieben. Ändern Sie Datum, Uhrzeit oder Art, wird die Unterschrift ungültig und der Schüler muss in der App neu unterschreiben. Der alte Stand bleibt im Verlauf.</p>` : ""}
    </div>
    <p class="leise klein">${neu ? "Die Stunde erscheint innerhalb einer Minute auch in der App des Fahrlehrers." : "Jede Änderung wird mit Ihrem Namen und der Uhrzeit festgehalten."}</p>`;
  oeffneDialog(neu ? `Fahrstunde nachtragen: ${x.name}` : `Fahrstunde vom ${datumDE(v.datum)} ändern`, body, async (form) => {
    const f = Object.fromEntries(new FormData(form).entries());
    if (!f.datum || !f.von || !f.bis || !f.fahrlehrer_id) { toast("Bitte Datum, Beginn, Ende und Fahrlehrer eintragen.", true); return false; }
    if (KR.hm2min(f.bis) <= KR.hm2min(f.von)) { toast("„Ende“ muss nach „Beginn“ liegen.", true); return false; }
    const art = ["ueberland", "autobahn"].includes(f.artwahl) ? "sonder" : f.artwahl;
    const sonderArt = ["ueberland", "autobahn", "nacht"].includes(f.artwahl) ? f.artwahl : null;
    const grund = (f.grund || "").trim();
    const jetzt = new Date().toISOString();
    if (neu) {
      const payload = sonderArt ? { sonderArt } : {};
      if (grund) payload.korrekturGrund = grund;
      const zeile = { id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fahrschule_id: S.fsId, fahrlehrer_id: f.fahrlehrer_id, schueler_id: x.id,
        datum: f.datum, von: f.von, bis: f.bis, art, status: "geplant", geloescht: false, payload, erstellt_von: S.user.id, aktualisiert_am: jetzt };
      const res = await supa.from("kalender_termine").insert(zeile).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      nwMerken(res.data[0]);
      toast("Fahrstunde nachgetragen");
    } else {
      const zeitNeu = f.datum !== v.datum || f.von !== v.von || f.bis !== v.bis || art !== v.art || sonderArt !== (nwSonderArt(v) || null);
      if (unterschrieben && zeitNeu && !(await bestaetige("Unterschrift wird ungültig", "Die Stunde ist schon unterschrieben. Nach der Änderung muss der Schüler neu unterschreiben. Trotzdem ändern?", "Ja, ändern"))) return false;
      const werte = { datum: f.datum, von: f.von, bis: f.bis, art, fahrlehrer_id: f.fahrlehrer_id, aktualisiert_am: jetzt };
      const sonderGeaendert = sonderArt !== (((v.payload || {}).sonderArt) || null) && (art === "sonder" || (v.payload || {}).sonderArt);
      if (grund || sonderGeaendert) {
        const p = await nwFrischePayload(v.id);
        if (!p) { toast("Nicht gespeichert: Stunde konnte nicht gelesen werden.", true); return false; }
        werte.payload = Object.assign({}, p, art === "sonder" ? { sonderArt } : {});
        if (art !== "sonder") delete werte.payload.sonderArt;
        if (grund) werte.payload.korrekturGrund = grund;
      }
      const res = await supa.from("kalender_termine").update(werte).eq("id", v.id).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      nwMerken(res.data[0]);
      // Online gebuchte, künftige Stunde: Schüler bekommt wie beim Kalender eine E-Mail (Vergangenes nicht)
      if ((f.datum !== v.datum || f.von !== v.von || f.bis !== v.bis) && f.datum >= KR.todayISO() && typeof onlineBuchungMelden === "function") onlineBuchungMelden(v.id, "changed", { new_date: f.datum, new_von: f.von, new_bis: f.bis });
      toast(unterschrieben && zeitNeu ? "Gespeichert. Der Schüler muss neu unterschreiben." : "Gespeichert");
    }
    zeichne(); nachher(); return true;
  });
}

async function nwLoeschen(t, nachher) {
  if (!t) return;
  const grund = await nwGrundFragen(`Fahrstunde vom ${datumDE(t.datum)} löschen?`, "Die Stunde kommt in den Papierkorb und verschwindet beim Fahrlehrer. Sie lässt sich zurückholen.", "Ja, löschen");
  if (grund === null) return;
  const werte = { geloescht: true, aktualisiert_am: new Date().toISOString() };
  if (grund) { const p = await nwFrischePayload(t.id); if (p) werte.payload = Object.assign({}, p, { korrekturGrund: grund }); }
  const res = await supa.from("kalender_termine").update(werte).eq("id", t.id).select("*");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gelöscht: " + (res.error ? res.error.message : "keine Berechtigung"), true); return; }
  nwMerken(res.data[0]); zeichne(); nachher();
  toastUndo("Fahrstunde im Papierkorb", async () => { await nwWiederherstellen(res.data[0], nachher, true); });
}
async function nwWiederherstellen(t, nachher, still) {
  if (!t) return;
  const res = await supa.from("kalender_termine").update({ geloescht: false, aktualisiert_am: new Date().toISOString() }).eq("id", t.id).select("*");
  if (res.error || !res.data || !res.data.length) { toast("Zurückholen ging nicht: " + (res.error ? res.error.message : "keine Berechtigung"), true); return; }
  nwMerken(res.data[0]); zeichne(); nachher();
  toast(still ? "Fahrstunde ist wieder da" : "Fahrstunde wiederhergestellt");
}
// Rückfrage mit freiwilligem Grund: liefert den Text ("" = ohne Grund) oder null (abgebrochen)
function nwGrundFragen(titel, text, jaText) {
  return new Promise((fertig) => {
    let ergebnis = null;
    const dlg = oeffneDialog(titel, `<p>${esc(text)}</p><label class="voll">Grund (freiwillig, steht im Verlauf)<input type="text" name="grund" maxlength="200"></label>`, async (form) => {
      ergebnis = String(new FormData(form).get("grund") || "").trim(); return true;
    }, jaText);
    dlg.addEventListener("close", () => fertig(ergebnis));
  });
}

/* ---------- Druck (A4) ---------- */
function nwDruckHTML(x, d, st, teil) {
  const neuRecht = nwNeuesRecht(st.heute);
  const fs = S.fs || {};
  const titel = neuRecht ? "Aufzeichnung über die fahrpraktische Ausbildung" : (teil ? "Ausbildungsnachweis (Teil-Nachweis)" : "Ausbildungsnachweis");
  const grundlage = neuRecht ? "Aufzeichnung in geeigneter Form nach dem Fahrlehrergesetz (Fassung ab 01.07.2027)" : "nach § 6 FahrschAusbO, Muster Anlage 3 DV-FahrlG (Abweichungen für die maschinelle Erstellung zulässig, Fußnote zu Anlage 3)";
  const lehrer = [...new Set(st.gelaufen.map((t) => t.fahrlehrer_id).filter(Boolean))];
  const lehrerNr = Object.fromEntries(lehrer.map((id, i) => [id, i + 1]));
  const zeilen = st.gelaufen.map((t, i) => {
    const bild = nwBildUrl((t.payload || {}).signatureSnap), us = nwUnterschrift(t);
    return `<tr><td class="r">${i + 1}</td><td>${esc(datumDE(t.datum))}</td><td>${esc(t.von || "")}</td><td class="r">${nwMinuten(t)}</td><td>${esc(nwArtText(t))}</td><td class="r">${lehrerNr[t.fahrlehrer_id] || ""}</td>${neuRecht ? "" : `<td class="us">${us === "ok" && bild ? `<img src="${bild}" alt="Unterschrift">` : us === "neu" ? `<span class="neu">nach Änderung neu zu unterschreiben</span>` : ""}</td>`}</tr>`;
  }).join("");
  const th = st.theorie;
  const theorieZeilen = th && th.geladen && th.pflicht && th.erfasst ? (S.theorie || []).filter((b) => b.schueler_id === x.id).sort((a, b) => lektOrd(a.lektion) - lektOrd(b.lektion) || String(a.datum).localeCompare(String(b.datum))) : [];
  // Änderungs-Spur steht nur im Büro („Verlauf“), nicht im gedruckten Nachweis (🗣 Serband 21.11.2026)
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(titel)} ${esc(x.name)}</title>
<style>
@page{size:A4;margin:14mm 12mm 16mm}
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111;margin:0;font-size:11pt;line-height:1.35}
.blatt{max-width:186mm;margin:0 auto;padding:10px}
.leiste{position:sticky;top:0;background:#f3f4f6;border-bottom:1px solid #ccc;padding:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.leiste button,.leiste a{font:inherit;font-size:15px;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid #888;background:#fff;color:#111;text-decoration:none;display:inline-flex;align-items:center;cursor:pointer}
.leiste .haupt{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px}
h1{font-size:17pt;margin:0}h2{font-size:12pt;margin:14px 0 6px;border-bottom:1px solid #999;padding-bottom:2px}
.klein{font-size:9pt;color:#444}
.kopf{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:6px}.kopf div{border-bottom:1px dotted #999;padding:2px 0}.kopf b{display:inline-block;min-width:34mm;font-weight:600}
table{border-collapse:collapse;width:100%;font-size:9.5pt}th,td{border:1px solid #777;padding:3px 5px;vertical-align:middle;text-align:left}th{background:#eee;font-weight:600}
td.r,th.r{text-align:right}td.us{width:34mm;height:11mm;padding:1px}td.us img{max-height:10mm;max-width:33mm;display:block}
.neu{font-size:8pt;color:#a00}tr{break-inside:avoid}thead{display:table-header-group}
.summen{display:flex;flex-wrap:wrap;gap:6px 18px;margin:6px 0}.summen span b{font-weight:700}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:18mm;margin-top:18mm}.sig div{border-top:1px solid #111;padding-top:3px;font-size:9pt}
ul{margin:4px 0;padding-left:18px}li{margin:1px 0}
footer{margin-top:10mm;font-size:8pt;color:#555;border-top:1px solid #ccc;padding-top:4px}
@media print{.leiste{display:none}.blatt{padding:0;max-width:none}}
@media (max-width:600px){.kopf{grid-template-columns:1fr}.sig{grid-template-columns:1fr;gap:12mm}table{font-size:8.5pt}}
</style></head><body>
<div class="leiste"><button class="haupt" id="nwDruck">Drucken / als PDF speichern</button>${x.email ? `<a href="mailto:${encodeURIComponent(x.email)}?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent("Hallo " + x.name + ",\n\nanbei Ihr " + titel + " als PDF.\n\nViele Grüße\n" + (fs.name || ""))}">E-Mail vorbereiten</a>` : ""}<button id="nwZu">Schließen</button></div>
<div class="leiste klein" style="position:static;background:#fff;border:0;min-height:0">Für die E-Mail: erst als PDF speichern, dann die PDF an die E-Mail anhängen.</div>
<div class="blatt">
<header><div><h1>${esc(titel)}</h1><div class="klein">${esc(grundlage)}</div></div><div class="klein" style="text-align:right"><b>${esc(fs.name || "")}</b><br>Stand ${esc(datumDE(st.heute))}</div></header>
<div class="kopf">
<div><b>Fahrschüler</b>${esc(x.name)}</div><div><b>Klasse</b>${esc(klasseVon(x) || "B")}${istUmschreiber(x) ? " (Umschreibung)" : ""}</div>
<div><b>Ausbildungsart</b>${esc(artName(x.ausbildungsart))}</div><div><b>Vertrag vom</b>${x.vertrag_am ? esc(datumDE(x.vertrag_am)) : "–"}</div>
${x.bewerbernummer ? `<div><b>Bewerbernummer</b>${esc(x.bewerbernummer)}</div>` : ""}<div><b>Fahrschule</b>${esc(fs.name || "")}</div>
</div>
<h2>Theoretischer Unterricht</h2>
${th && th.geladen && th.pflicht ? `<p>${th.ist} von ${th.soll} Doppelstunden${th.fertig ? " – vollständig" : ""}${x.theorie_bestanden_am ? ` · Theorieprüfung bestanden am ${esc(datumDE(x.theorie_bestanden_am))}` : ""}</p>
${theorieZeilen.length ? `<table><thead><tr><th>Lektion</th><th>Datum</th><th>Fahrlehrer</th></tr></thead><tbody>${theorieZeilen.map((b) => `<tr><td>${esc(b.lektion)}</td><td>${esc(datumDE(b.datum))}</td><td>${esc(b.bearbeiter || "")}</td></tr>`).join("")}</tbody></table>` : `<p class="klein">Keine Anwesenheit im Kompass erfasst.</p>`}`
    : `<p>${th && th.grund ? esc(th.grund) : "Nicht erfasst"}${x.theorie_bestanden_am ? ` · Theorieprüfung bestanden am ${esc(datumDE(x.theorie_bestanden_am))}` : ""}</p>`}
<h2>Praktischer Unterricht</h2>
<div class="summen"><span>Übungsfahrten: <b>${nwMin(st.grundMin)}</b></span>${NW_SONDER.map(([k, n], i) => `<span>${esc(n)}: <b>${st.ist[k]}</b> × 45 Min.${st.soll[i] ? ` (Soll ${st.soll[i]})` : ""}</span>`).join("")}${st.schaltMin ? `<span>Schaltkompetenz: <b>${nwMin(st.schaltMin)}</b></span>` : ""}</div>
${zeilen ? `<table><thead><tr><th class="r">Nr.</th><th>Datum</th><th>Beginn</th><th class="r">Min.</th><th>Art und Inhalt</th><th class="r">FL</th>${neuRecht ? "" : "<th>Unterschrift Fahrschüler</th>"}</tr></thead><tbody>${zeilen}</tbody></table>` : `<p>Noch keine gefahrene Stunde.</p>`}
<p class="klein">FL = Fahrlehrer: ${lehrer.map((id) => `${lehrerNr[id]} ${esc(lehrerName(id) || "–")}`).join(" · ") || "–"}</p>
${x.praxis_bestanden_am ? `<p>Praktische Prüfung bestanden am ${esc(datumDE(x.praxis_bestanden_am))}.</p>` : ""}
${teil ? `<h2>Teil-Nachweis</h2><p>Die Ausbildung wurde nicht abgeschlossen (Abbruch oder Wechsel der Fahrschule). Bestätigt werden die oben aufgeführten absolvierten Ausbildungsteile.</p>` : ""}
<div class="sig"><div>Ort, Datum, Unterschrift Fahrlehrer / Fahrschule</div>${neuRecht ? "" : "<div>Unterschrift Fahrschüler</div>"}</div>
<footer>Erstellt mit dem Fahrlehrer-Kompass am ${esc(new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }))}. Aufbewahrung durch die Fahrschule: 5 Jahre nach Ende des Jahres, in dem die Ausbildung abgeschlossen wurde (§ 31 FahrlG).${neuRecht ? "" : " Elektronische Unterschrift nach § 6 Abs. 2 FahrschAusbO."}</footer>
</div></body></html>`;
}
function nwDrucken(x, d, st, teil) {
  const w = window.open("", "_blank");
  if (!w) { toast("Bitte Pop-ups für den Ausbildungsnachweis erlauben.", true); return; }
  w.document.write(nwDruckHTML(x, d, st, teil));
  w.document.close(); w.focus();
  const k = (id, f) => { const b = w.document.getElementById(id); if (b) b.addEventListener("click", f); };
  k("nwDruck", () => w.print()); k("nwZu", () => w.close());
}
