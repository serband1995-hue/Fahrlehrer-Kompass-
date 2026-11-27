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
let nwAlle = []; // Stunden des offenen Nachweises (für die Doppel-Prüfung beim Nachtragen)
const NW_FAHRT_ARTEN = ["fahrstunde", "sonder", "nacht", "schalt"];
const NW_SONDER = [["ueberland", "Überlandfahrt"], ["autobahn", "Autobahnfahrt"], ["nacht", "Fahrt bei Dämmerung oder Dunkelheit"]];
const NW_ART_WAHL = [["fahrstunde", "Übungsfahrt (Grundausbildung)"], ["ueberland", "Sonderfahrt Überland"], ["autobahn", "Sonderfahrt Autobahn"], ["nacht", "Sonderfahrt Dämmerung/Dunkelheit"], ["schalt", "Schaltkompetenz"]];

function nwNeuesRecht(heute) { return String(heute || KR.todayISO()) >= NACHWEIS_NEU_AB; }
// W13 PR 2: über Mitternacht (22:30–00:00) zählt mit, wie im Ausbildungsplan der App (KR.terminMinuten)
function nwMinuten(t) { if (!t.von || !t.bis) return 0; return KR.terminMinuten ? KR.terminMinuten(t.von, t.bis) : Math.max(0, KR.hm2min(t.bis) - KR.hm2min(t.von)); }
// Art der Sonderfahrt: Büro-Eintrag (payload.sonderArt), sonst der Ausbildungsplan der App (srcSonder „sid:gruppe:nr“)
function nwSonderArt(t) {
  if (t.art === "nacht") return "nacht";
  if (t.art !== "sonder") return "";
  const p = t.payload || {};
  if (p.sonderArt) return p.sonderArt;
  const g = String(p.srcSonder || "").split(":")[1] || "";
  return ["ueberland", "autobahn", "nacht"].includes(g) ? g : "";
}
// "" = Sonderfahrt ohne Art: das Büro muss die Art erst wählen
function nwArtWahl(t) { return t.art === "schalt" ? "schalt" : (nwSonderArt(t) || (t.art === "sonder" ? "" : "fahrstunde")); }
function nwArtText(t) {
  const s = nwSonderArt(t);
  if (s) return (NW_SONDER.find((x) => x[0] === s) || [, "Sonderfahrt"])[1];
  if (t.art === "sonder") return "Sonderfahrt (Art fehlt)";
  if (t.art === "schalt") return "Schaltkompetenz";
  return "Übungsfahrt (Grundausbildung)";
}
function nwAusgefallen(t) { const st = (t.payload || {}).status || t.status; return st === "abgebrochen" || st === "nicht erschienen"; }
// Stunde ist gelaufen: Datum vorbei, oder heute und schon zu Ende
function nwVorbei(t, heute, jetztMin) { return t.datum < heute || (t.datum === heute && t.bis && KR.terminEndeMin(t.von, t.bis) <= jetztMin); } // über Mitternacht: erst morgen vorbei
// Unterschrift: ok | neu (nach Änderung neu nötig) | offen
function nwUnterschrift(t) {
  const p = t.payload || {};
  if (p.signed && p.signatureSnap) return "ok";
  return p.signaturUngueltig && !p.signaturUngueltig.erledigt ? "neu" : "offen";
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
    if (a) ist[a] += KR.sonderEinheitenAusMinuten(m); // W13: Länge einer Sonderfahrt-Einheit je Fahrschule (Vorgabe 45)
    else if (t.art === "sonder") sonderOhneArt++;
    else if (t.art === "schalt") schaltMin += m;
    else grundMin += m;
  }
  // Ausbildungsplan der App: abgehakte Sonderfahrten ohne Kalendertermin (die fehlen im Nachweis)
  const plan = ((x.ausbildung || {}).plan || {}).sonder || {};
  // Richter W13 (Kann 2): nur Kästchen bis heute; eine geplante Fahrt ist noch nicht „ohne Termin abgehakt“
  const planIst = {}; for (const [k] of NW_SONDER) planIst[k] = (plan[k] || []).filter((o) => o && o.iso && String(o.iso).slice(0, 10) <= heute).length;
  const unterschrift = { ok: 0, neu: 0, offen: 0 };
  for (const t of gelaufen) unterschrift[nwUnterschrift(t)]++;
  const theorie = typeof theorieStandVon === "function" ? theorieStandVon(x) : null;
  const fehlt = [];
  // dringend = jetzt handeln (rot), sonst nur noch offen
  const kurz = { ueberland: "Überland", autobahn: "Autobahn", nacht: "Nacht" };
  if (!nwNeuesRecht(heute) && (unterschrift.offen + unterschrift.neu)) fehlt.push({ t: `${unterschrift.offen + unterschrift.neu} Unterschrift${unterschrift.offen + unterschrift.neu === 1 ? "" : "en"} des Schülers${unterschrift.neu ? ` (${unterschrift.neu} nach Änderung neu)` : ""}`, dringend: true });
  if (sonderOhneArt) fehlt.push({ t: `${sonderOhneArt} Sonderfahrt${sonderOhneArt === 1 ? "" : "en"} ohne Art (bitte ändern)`, dringend: true });
  NW_SONDER.forEach(([k], i) => { if (ist[k] < soll[i]) fehlt.push({ t: `${kurz[k]}: noch ${soll[i] - ist[k]} × ${KR.sonderMinuten()} Min.` }); });
  if (theorie && theorie.geladen && theorie.pflicht && !theorie.fertig && !theorie.bestanden) fehlt.push({ t: `Theorie: ${theorie.ist} von ${theorie.soll} Doppelstunden` });
  if (!x.theorie_bestanden_am) fehlt.push({ t: "Theorieprüfung" });
  if (!x.praxis_bestanden_am) fehlt.push({ t: "Praxisprüfung" });
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
// P0001 = Termin wurde von der Leitung entfernt (termin_entfernt_schutz) oder (K8) Zahlung ausstehend – verständlich statt Fehlertext
function nwFehlerText(e, sonst) {
  if (!e) return sonst;
  if (/Zahlung ausstehend/.test(e.message || "")) return typeof ZAHLUNG_MELDUNG === "string" ? ZAHLUNG_MELDUNG : "Zahlung ausstehend";
  return e.code === "P0001" ? "die Leitung hat diesen Termin entfernt" : e.message;
}
// K7: Papierkorb – storniert (bleibt aufbewahrt) oder Fehleintrag (nach den eingestellten Tagen endgültig weg, Vorgabe 30)
// Tage im Papierkorb: Einstellung papierkorb.tage (7–90, Vorgabe 30), der Server leert danach (W11 S3)
function nwPapierkorbTage() { try { return window.KE && KE.zahl ? KE.zahl("papierkorb.tage", "tage", 30, 7, 90) : 30; } catch (e) { return 30; } }
function nwStorno(t) { const s = (t.payload || {}).storno; return s && typeof s === "object" ? s : null; }
function nwRestTage(t) {
  const ab = Date.parse(t.geloescht_am || t.aktualisiert_am || "");
  const tage = nwPapierkorbTage();
  if (isNaN(ab)) return tage;
  return Math.max(0, tage - Math.floor((Date.now() - ab) / 86400000));
}
function nwPapierkorbText(t) {
  const s = nwStorno(t);
  if (s) return `storniert${s.grund ? ": „" + s.grund + "“" : ""} · bleibt aufbewahrt`;
  const p = t.payload || {};
  if (p.signed || (p.signaturUngueltig && typeof p.signaturUngueltig === "object")) return "unterschrieben · bleibt aufbewahrt";
  if (!t.geloescht_am) return "liegt im Papierkorb";
  const n = nwRestTage(t);
  return n > 1 ? `wird in ${n} Tagen endgültig gelöscht` : n === 1 ? "wird morgen endgültig gelöscht" : "wird heute endgültig gelöscht";
}
function nwSpurWer(p) { return p.bearbeiter || (teamPerson(p.geaendert_von) || {}).name || (p.geaendert_von ? "unbekannt" : "System"); }
function nwSpurZeile(p, t) {
  const wann = new Date(p.geaendert_am).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
  const was = p.feld === "angelegt" ? `Fahrstunde nachgetragen (${esc(nwSpurWert(p, p.neu))})`
    : p.feld === "geloescht" ? (p.neu === "true" ? "in den Papierkorb gelegt" : "aus dem Papierkorb zurückgeholt")
    : p.feld === "endgueltig_geloescht" ? `endgültig gelöscht (${esc(nwSpurWert(p, p.alt))})`
    : p.feld === "signed" ? (p.neu === "true" ? "vom Schüler unterschrieben" : "Unterschrift ungültig oder entfernt")
    : `${esc(NW_FELD[p.feld] || p.feld)} ${esc(nwSpurWert(p, p.alt))} → ${esc(nwSpurWert(p, p.neu))}`;
  return `${esc(wann)} · ${esc(nwSpurWer(p))}: ${t ? `Stunde vom ${esc(datumDE(t.datum))} · ` : ""}${was}${p.grund ? ` · Grund: „${esc(p.grund)}“` : ""}`;
}

function nwUebersichtHTML(x, d, st) {
  const pill = (txt, gut) => `<span class="marke-pill${gut ? " gruen" : ""}">${txt}</span>`;
  const kurz = { ueberland: "Überland", autobahn: "Autobahn", nacht: "Nacht" };
  const sonderIst = NW_SONDER.reduce((a, [k], i) => a + Math.min(st.ist[k], st.soll[i] || st.ist[k]), 0), sonderSoll = st.soll.reduce((a, b) => a + b, 0);
  const sonder = NW_SONDER.map(([k], i) => `${kurz[k]} ${st.ist[k]}/${st.soll[i]}${st.ist[k] >= st.soll[i] ? " ✓" : ""}`).join(" · ");
  const planHinweis = NW_SONDER.filter(([k]) => st.planIst[k] > st.ist[k]).map(([k, n]) => `${n}: ${st.planIst[k] - st.ist[k]} im Ausbildungsplan abgehakt, aber ohne Termin im Kalender`);
  const u = st.unterschrift, alt = !nwNeuesRecht(st.heute);
  const zeilen = st.gelaufen.slice().reverse().map((t) => {
    const us = nwUnterschrift(t);
    const usTxt = !alt ? "" : us === "ok" ? `<span class="marke-pill gruen">✓ unterschrieben</span>` : us === "neu" ? `<span class="marke-pill rot" title="Nach der Unterschrift geändert">⚠ neu unterschreiben</span>` : `<span class="marke-pill gelb">offen</span>`;
    return `<li class="nw-zeile"><span class="nw-wann"><b>${esc(datumDE(t.datum))}</b> ${esc(t.von || "")}–${esc(t.bis || "")}</span>
      <span class="nw-was">${esc(nwArtText(t))} · <span class="nw-nb">${nwMinuten(t)} Min.</span> · <span class="nw-nb">${esc(lehrerName(t.fahrlehrer_id) || "–")}</span></span>
      <span class="nw-us">${usTxt}</span>
      <span class="nw-knoepfe"><button type="button" class="knopf klein" data-nwaendern="${esc(t.id)}">Ändern</button><button type="button" class="knopf klein" data-nwloeschen="${esc(t.id)}" aria-label="Fahrstunde vom ${esc(datumDE(t.datum))} ${nwIstNachweis(t) ? "stornieren" : "löschen"}">${nwIstNachweis(t) ? "Stornieren" : "Löschen"}</button></span></li>`;
  }).join("");
  const termin = (id) => d.aktiv.concat(d.papierkorb).find((t) => t.id === id);
  return `<div class="nw-kacheln">
      <div class="nw-kachel"><span class="leise klein">Übungsfahrten</span><b>${nwMin(st.grundMin)}</b><span class="leise klein">${st.gelaufen.filter((t) => !nwSonderArt(t) && t.art !== "sonder" && t.art !== "schalt").length} Termine</span></div>
      <div class="nw-kachel nw-sonder"><span class="leise klein">Sonderfahrten (je ${KR.sonderMinuten()} Min.)</span><b>${sonderSoll ? `${sonderIst}/${sonderSoll}` : "–"}</b><span class="leise klein">${sonderSoll ? esc(sonder) : "keine nötig"}</span></div>
      <div class="nw-kachel"><span class="leise klein">Theorie</span><b>${st.theorie && st.theorie.geladen && st.theorie.pflicht ? `${st.theorie.ist}/${st.theorie.soll}` : "–"}</b><span class="leise klein">${x.theorie_bestanden_am ? "Prüfung bestanden " + esc(datumDE(x.theorie_bestanden_am)) : "Prüfung offen"}</span></div>
      ${alt ? `<div class="nw-kachel"><span class="leise klein">Unterschriften</span><b>${st.gelaufen.length ? `${u.ok}/${st.gelaufen.length}` : "–"}</b><span class="leise klein">${!st.gelaufen.length ? "noch keine Stunde" : u.neu ? `${u.neu} neu nötig` : u.offen ? `${u.offen} offen` : "vollständig"}</span></div>` : ""}
    </div>
    ${st.fehlt.length ? `<div class="nw-fehlt"><b>Noch offen</b><ul>${st.fehlt.map((f) => `<li${f.dringend ? ' class="dringend"' : ""}>${esc(f.t)}</li>`).join("")}</ul></div>` : `<p class="nw-fehlt gut"><b>✓ Alles da.</b></p>`}
    ${planHinweis.length ? `<p class="fl-warnung bald">${planHinweis.map(esc).join("<br>")}. Im Nachweis stehen nur Fahrten mit Datum und Uhrzeit: bitte nachtragen.</p>` : ""}
    ${st.geplant.length ? `<p class="leise klein">Noch geplant: ${st.geplant.length} Termin${st.geplant.length === 1 ? "" : "e"} (zählen erst, wenn sie gefahren sind).</p>` : ""}
    <div class="nw-kopf"><h3>Gefahrene Stunden (${st.gelaufen.length})</h3><button type="button" class="knopf klein" id="nwNeu">+ Fahrstunde nachtragen</button></div>
    ${zeilen ? `<ul class="nw-liste">${zeilen}</ul>` : `<p class="leise klein">Noch keine gefahrene Stunde im Kalender.</p>`}
    <details class="nw-details"><summary>Papierkorb (${d.papierkorb.length})</summary>
      ${d.papierkorb.length ? `<ul class="nw-liste">${d.papierkorb.map((t) => `<li class="nw-zeile"><span class="nw-wann">${esc(datumDE(t.datum))} ${esc(t.von || "")}–${esc(t.bis || "")}</span><span class="nw-was">${esc(nwArtText(t))} · ${esc(lehrerName(t.fahrlehrer_id) || "–")}<br><span class="leise klein">${esc(nwPapierkorbText(t))}</span></span><span class="nw-knoepfe"><button type="button" class="knopf klein" data-nwzurueck="${esc(t.id)}">Wiederherstellen</button></span></li>`).join("")}</ul>` : `<p class="leise klein">Leer. Gelöschte Stunden landen hier und lassen sich zurückholen.</p>`}
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
  }, "Nachweis erstellen", { abbrechenText: "Schließen" });
  dlg.classList.add("dialog-breit");
  const ziel = dlg.querySelector("#nwInhalt");
  const neu = async () => {
    d = await nwLaden(sid);
    nwAlle = d.aktiv || [];
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
// Mit Zeitstempel: geschrieben wird nur, wenn die Stunde inzwischen nicht von der App geändert wurde (sonst ginge z. B. eine frische Unterschrift verloren)
async function nwFrisch(id) {
  const r = await supa.from("kalender_termine").select("payload,aktualisiert_am").eq("id", id).maybeSingle();
  return r && !r.error && r.data ? { payload: r.data.payload || {}, am: r.data.aktualisiert_am } : null;
}
async function nwFrischePayload(id) { const f = await nwFrisch(id); return f ? f.payload : null; }

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
      <label class="voll">Art und Inhalt<select name="artwahl" required>${nwArtWahl(v) === "" ? '<option value="" selected>– bitte wählen –</option>' : ""}${NW_ART_WAHL.map(([k, n]) => `<option value="${k}"${nwArtWahl(v) === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label class="voll">Grund (freiwillig, steht im Verlauf)<input type="text" name="grund" maxlength="200" placeholder="${neu ? "z. B. Fahrlehrer hat die Stunde nicht eingetragen" : "z. B. Uhrzeit war falsch eingetragen"}"></label>
      ${unterschrieben ? `<p class="voll fl-warnung bald">Diese Stunde ist schon unterschrieben. Ändern Sie Datum, Uhrzeit oder Art, wird die Unterschrift ungültig und der Schüler muss in der App neu unterschreiben. Der alte Stand bleibt im Verlauf.</p>` : ""}
    </div>
    <p class="leise klein">${neu ? "Die Stunde erscheint innerhalb einer Minute auch in der App des Fahrlehrers." : "Jede Änderung wird mit Ihrem Namen und der Uhrzeit festgehalten."}</p>`;
  oeffneDialog(neu ? `Fahrstunde nachtragen: ${x.name}` : `Fahrstunde vom ${datumDE(v.datum)} ändern`, body, async (form) => {
    const f = Object.fromEntries(new FormData(form).entries());
    if (!f.datum || !f.von || !f.bis || !f.fahrlehrer_id) { toast("Bitte Datum, Beginn, Ende und Fahrlehrer eintragen.", true); return false; }
    if (KR.hm2min(f.bis) <= KR.hm2min(f.von)) { toast("„Ende“ muss nach „Beginn“ liegen.", true); return false; }
    // Art nicht angefasst: Spalte und payload so lassen, wie sie sind (z. B. Nacht-Sonderfahrt der App = art „sonder“ + srcSonder)
    const artGleich = !neu && f.artwahl === nwArtWahl(v);
    // Sonderfahrten wie im Termin-Fenster: art „sonder“ + payload.sonderArt (auch Nacht)
    if (!f.artwahl) { toast("Bitte die Art der Fahrt wählen.", true); return false; }
    const istSonder = ["ueberland", "autobahn", "nacht"].includes(f.artwahl);
    // W22 (Gesamtprüfung): Umschreiber machen keine Sonderfahrten – wie Termin-Fenster und Serie; eine schon eingetragene bleibt änderbar
    if (istSonder && !artGleich && typeof istUmschreiber === "function" && istUmschreiber(x)) { toast("Umschreiber: keine Sonderfahrten. Bitte eine andere Art wählen.", true); return false; }
    const art = artGleich ? v.art : istSonder ? "sonder" : f.artwahl;
    const sonderArt = artGleich ? (((v.payload || {}).sonderArt) || null) : istSonder ? f.artwahl : null;
    const grund = (f.grund || "").trim();
    const jetzt = new Date().toISOString();
    // W16 Teil 3: Urlaub des Fahrlehrers (buero-verwaltung.js), wenn Tag oder Fahrlehrer neu sind; vergangene Tage warnen nicht (Liste ab heute)
    if (typeof vwUrlaubWarnen === "function" && (neu || f.datum !== v.datum || f.fahrlehrer_id !== v.fahrlehrer_id)
      && !(await vwUrlaubWarnen(f.fahrlehrer_id, f.datum))) return false;
    if (neu) {
      const gleich = (nwAlle || []).find((y) => !y.geloescht && y.datum === f.datum && y.von && y.bis && KR.hm2min(y.von) < KR.hm2min(f.bis) && KR.hm2min(y.bis) > KR.hm2min(f.von));
      if (gleich && !(await bestaetige("Zeit schon belegt", `Am ${datumDE(f.datum)} gibt es schon eine Stunde ${gleich.von}–${gleich.bis}. Trotzdem nachtragen?`, "Ja, nachtragen"))) return false;
      const payload = sonderArt ? { sonderArt } : {};
      if (grund) payload.korrekturGrund = grund;
      const zeile = { id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fahrschule_id: S.fsId, fahrlehrer_id: f.fahrlehrer_id, schueler_id: x.id,
        datum: f.datum, von: f.von, bis: f.bis, art, status: "geplant", geloescht: false, payload, erstellt_von: S.user.id, aktualisiert_am: jetzt };
      const res = await supa.from("kalender_termine").insert(zeile).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? (typeof dbFehlerText === "function" ? dbFehlerText(res.error) : res.error.message) : "keine Berechtigung"), true); return false; }
      nwMerken(res.data[0]);
      toast("Fahrstunde nachgetragen");
    } else {
      const zeitNeu = f.datum !== v.datum || f.von !== v.von || f.bis !== v.bis || !artGleich;
      if (unterschrieben && zeitNeu && !(await bestaetige("Unterschrift wird ungültig", "Die Stunde ist schon unterschrieben. Nach der Änderung muss der Schüler neu unterschreiben. Trotzdem ändern?", "Ja, ändern"))) return false;
      const werte = { datum: f.datum, von: f.von, bis: f.bis, art, fahrlehrer_id: f.fahrlehrer_id, aktualisiert_am: jetzt };
      const sonderGeaendert = !artGleich && sonderArt !== (((v.payload || {}).sonderArt) || null);
      const ungueltig = zeitNeu; // Datum, Zeit oder Art geändert
      let frisch = null;
      if (grund || sonderGeaendert || ungueltig) {
        frisch = await nwFrisch(v.id);
        if (!frisch) { toast("Nicht gespeichert: Stunde konnte nicht gelesen werden.", true); return false; }
        const p = frisch.payload;
        // null statt löschen: die App übernimmt nur vorhandene Schlüssel (sonst bliebe ihr alter Wert stehen)
        werte.payload = Object.assign({}, p, sonderGeaendert ? { sonderArt } : {});
        // Wie der Datenbank-Trigger (und auch ohne ihn): unterschriebene Stunde geändert → Unterschrift ungültig, Abdruck bleibt
        if (ungueltig && p.signed) Object.assign(werte.payload, { signed: false, signatureSnap: null,
          signaturUngueltig: { am: new Date().toISOString(), alt: { datum: v.datum, von: v.von, bis: v.bis, art: v.art }, signedAt: p.signedAt || null, snap: p.signatureSnap || null } });
        if (grund) werte.payload.korrekturGrund = grund;
      }
      let q = supa.from("kalender_termine").update(werte).eq("id", v.id);
      if (frisch && frisch.am) q = q.eq("aktualisiert_am", frisch.am);
      const res = await q.select("*");
      if (!res.error && res.data && !res.data.length && frisch) { toast("Die Stunde wurde gerade in der App geändert. Bitte noch einmal öffnen und speichern.", true); nachher(); return true; }
      if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? (typeof dbFehlerText === "function" ? dbFehlerText(res.error) : res.error.message) : "keine Berechtigung"), true); return false; }
      nwMerken(res.data[0]);
      // Online gebuchte, künftige Stunde: Schüler bekommt wie beim Kalender eine E-Mail (Vergangenes nicht)
      if ((f.datum !== v.datum || f.von !== v.von || f.bis !== v.bis) && f.datum >= KR.todayISO() && typeof onlineBuchungMelden === "function") onlineBuchungMelden(v.id, "changed", { new_date: f.datum, new_von: f.von, new_bis: f.bis });
      toast(unterschrieben && zeitNeu ? "Gespeichert. Der Schüler muss neu unterschreiben." : "Gespeichert");
    }
    zeichne(); nachher(); nwKurzSperren(); return true;
  });
}
// Doppeltipp auf „Speichern“ soll nicht den gleich platzierten Knopf des Nachweis-Fensters darunter treffen
function nwKurzSperren() {
  const k = [...document.querySelectorAll("dialog[open] footer button")];
  k.forEach((b) => { b.disabled = true; });
  setTimeout(() => k.forEach((b) => { if (b.isConnected) b.disabled = false; }), 400);
}

/* K7 (🗣 Serband 22.11.2026): Fehleintrag (noch nicht gelaufen, nie unterschrieben) → sofort in den Papierkorb, ohne Rückfrage,
   „Rückgängig“; nach 30 Tagen endgültig leer. Gelaufene oder (je) unterschriebene Stunde → nur „stornieren“ mit kurzem Grund:
   bleibt im Nachweis-Papierkorb als storniert aufbewahrt (gleiche Regel wie termin_ist_nachweis in der Datenbank). */
function nwIstNachweis(t) {
  const p = t.payload || {};
  if (p.signed || (p.signaturUngueltig && typeof p.signaturUngueltig === "object")) return true;
  const j = new Date();
  if (!t.datum || !nwVorbei(t, KR.todayISO(), j.getHours() * 60 + j.getMinutes())) return false;
  // Ausfall mit Berechnung ist Abrechnungs-Beleg (wie App und Datenbank)
  if (p.noshow || (typeof p.tatsaechlicheDauer === "number" && p.tatsaechlicheDauer > 0)) return true;
  return !nwAusgefallen(t);
}
async function nwLoeschen(t, nachher) {
  if (!t) return;
  const storno = nwIstNachweis(t);
  let grund = "";
  if (storno) {
    grund = await nwGrundFragen(`Fahrstunde vom ${datumDE(t.datum)} stornieren`, (nwUnterschrift(t) === "ok" ? "Die Stunde ist schon vom Schüler unterschrieben. " : "Die Stunde ist schon gelaufen. ") + "Sie verschwindet beim Fahrlehrer und aus der Zählung und bleibt als storniert aufbewahrt (nicht endgültig löschbar).", "Stornieren", true);
    if (grund === null) return;
  }
  const werte = { geloescht: true, aktualisiert_am: new Date().toISOString() };
  let q = supa.from("kalender_termine").update(werte).eq("id", t.id);
  if (storno) {
    const fr = await nwFrisch(t.id);
    werte.payload = Object.assign({}, fr ? fr.payload : t.payload || {}, { storno: { grund, am: new Date().toISOString(), von: "Büro" }, korrekturGrund: grund });
    if (fr && fr.am) q = q.eq("aktualisiert_am", fr.am);
  }
  const res = await q.select("*");
  if (res.error || !res.data || !res.data.length) { toast((storno ? "Nicht storniert: " : "Nicht gelöscht: ") + nwFehlerText(res.error, "keine Berechtigung oder gerade geändert"), true); return; }
  PK.zeit = 0; nwMerken(res.data[0]); zeichne(); nachher();
  toastUndo(storno ? "Fahrstunde storniert" : "Fahrstunde im Papierkorb", async () => { await nwWiederherstellen(res.data[0], nachher, true); });
}
async function nwWiederherstellen(t, nachher, still) {
  if (!t) return;
  const res = await supa.from("kalender_termine").update({ geloescht: false, aktualisiert_am: new Date().toISOString() }).eq("id", t.id).select("*");
  if (res.error || !res.data || !res.data.length) { toast("Zurückholen ging nicht: " + nwFehlerText(res.error, "keine Berechtigung"), true); return; }
  PK.zeit = 0; nwMerken(res.data[0]); zeichne(); nachher();
  toast(still ? "Fahrstunde ist wieder da" : "Fahrstunde wiederhergestellt");
}
// Rückfrage mit freiwilligem Grund: liefert den Text ("" = ohne Grund) oder null (abgebrochen)
function nwGrundFragen(titel, text, jaText, pflicht) {
  return new Promise((fertig) => {
    let ergebnis = null;
    const dlg = oeffneDialog(titel, `<p>${esc(text)}</p><label class="voll">Grund (${pflicht ? "kurz" : "freiwillig"}, steht im Verlauf)<input type="text" name="grund" maxlength="200"${pflicht ? ' required placeholder="z. B. falsch eingetragen"' : ""}></label>`, async (form) => {
      ergebnis = String(new FormData(form).get("grund") || "").trim(); if (pflicht && !ergebnis) { ergebnis = null; return false; } return true;
    }, jaText);
    // Design K7: Stornieren ist dieselbe Aktion wie in der App → Warnfarbe statt grünem Hauptknopf
    if (pflicht) { const k = dlg.querySelector("footer button[value=ok]"); if (k) { k.classList.remove("haupt"); k.classList.add("gefahr"); } }
    dlg.addEventListener("close", () => { if (ergebnis !== null) nwKurzSperren(); fertig(ergebnis); });
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
    return `<tr><td class="r">${i + 1}</td><td>${esc(datumDE(t.datum))}</td><td>${esc(t.von || "")}</td><td class="r">${nwMinuten(t)}</td><td>${esc(nwArtText(t))}</td><td class="r">${lehrerNr[t.fahrlehrer_id] || ""}</td>${neuRecht ? "" : `<td class="us">${us === "ok" && bild ? `<img src="${bild}" alt="Unterschrift">` : ""}</td>`}</tr>`;
  }).join("");
  const th = st.theorie;
  const theorieZeilen = th && th.geladen && th.pflicht && th.erfasst ? (S.theorie || []).filter((b) => b.schueler_id === x.id).sort((a, b) => lektOrd(a.lektion) - lektOrd(b.lektion) || String(a.datum).localeCompare(String(b.datum))) : [];
  // Änderungs-Spur steht nur im Büro („Verlauf“), nicht im gedruckten Nachweis (🗣 Serband 21.11.2026)
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(titel)} ${esc(x.name)}</title>
<style>
@page{size:A4;margin:14mm 12mm 16mm}
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-variant-numeric:tabular-nums;color:#111;margin:0;font-size:11pt;line-height:1.35}
.blatt{max-width:186mm;margin:0 auto;padding:10px}
.leiste{position:sticky;top:0;background:#f3f4f6;border-bottom:1px solid #ccc;padding:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.leiste button,.leiste a{font:inherit;font-size:15px;min-height:44px;padding:0 16px;border-radius:8px;border:1px solid #888;background:#fff;color:#111;text-decoration:none;display:inline-flex;align-items:center;cursor:pointer}
.leiste .haupt{background:#2f6b47;border-color:#2f6b47;color:#fff}.hinweis{text-align:center;font-size:12px;color:#555;margin:6px 0 0}
.fs{font-weight:700;font-size:11pt;margin-bottom:2px}.stand{text-align:right;white-space:nowrap}
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
@media print{.leiste,.leiste-hinweis{display:none}.blatt{padding:0;max-width:none}}
@media screen{.breit{overflow-x:auto}}
@media (max-width:600px){.kopf{grid-template-columns:1fr}td.us{width:auto;min-width:24mm}.sig{grid-template-columns:1fr;gap:12mm}table{font-size:8.5pt}}
</style></head><body>
<div class="leiste"><button class="haupt" id="nwDruck">Drucken / als PDF speichern</button>${x.email ? `<a href="mailto:${encodeURIComponent(x.email)}?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent("Hallo " + x.name + ",\n\nanbei " + (neuRecht ? "deine " : "dein ") + titel + " als PDF.\n\nViele Grüße\n" + (fs.name || ""))}">E-Mail vorbereiten</a>` : ""}<button id="nwZu">Schließen</button></div>
<p class="hinweis leiste-hinweis">Für die E-Mail: erst als PDF speichern, dann die PDF an die E-Mail anhängen.</p>
<div class="blatt">
<header><div><div class="fs">${esc(fs.name || "")}</div><h1>${esc(titel)}</h1>${neuRecht ? "" : `<div class="klein">Muster Anlage 3 DV-FahrlG</div>`}</div><div class="klein stand">Stand ${esc(datumDE(st.heute))}</div></header>
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
<div class="summen"><span>Übungsfahrten: <b>${nwMin(st.grundMin)}</b></span>${NW_SONDER.map(([k, n], i) => `<span>${esc(n)}: <b>${st.ist[k]}</b> × ${KR.sonderMinuten()} Min.${st.soll[i] ? ` (Soll ${st.soll[i]})` : ""}</span>`).join("")}${st.schaltMin ? `<span>Schaltkompetenz: <b>${nwMin(st.schaltMin)}</b></span>` : ""}</div>
${zeilen ? `<div class="breit"><table><thead><tr><th class="r">Nr.</th><th>Datum</th><th>Beginn</th><th class="r">Min.</th><th>Art und Inhalt</th><th class="r">FL</th>${neuRecht ? "" : "<th>Unterschrift Fahrschüler</th>"}</tr></thead><tbody>${zeilen}</tbody></table></div>` : `<p>Noch keine gefahrene Stunde.</p>`}
<p class="klein">FL = Fahrlehrer: ${lehrer.map((id) => `${lehrerNr[id]} ${esc(lehrerName(id) || "–")}`).join(" · ") || "–"}</p>
${x.praxis_bestanden_am ? `<p>Praktische Prüfung bestanden am ${esc(datumDE(x.praxis_bestanden_am))}.</p>` : ""}
${teil ? `<h2>Teil-Nachweis</h2><p>Die Ausbildung wurde nicht abgeschlossen (Abbruch oder Wechsel der Fahrschule). Bestätigt werden die oben aufgeführten absolvierten Ausbildungsteile.</p>` : ""}
<div class="sig"><div>Ort, Datum, Unterschrift Fahrlehrer / Fahrschule</div>${neuRecht ? "" : "<div>Unterschrift Fahrschüler</div>"}</div>
<footer>Grundlage: ${esc(grundlage)}.<br>Erstellt mit dem Fahrlehrer-Kompass am ${esc(new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }))}. Aufbewahrung durch die Fahrschule: 5 Jahre nach Ende des Jahres, in dem die Ausbildung abgeschlossen wurde (§ 31 FahrlG).${neuRecht ? "" : " Elektronische Unterschrift nach § 6 Abs. 2 FahrschAusbO."}</footer>
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

/* ---------- K7: Papierkorb der ganzen Fahrschule (unten im Kalender, einklappbar) ----------
   Gelöschte Termine der letzten Zeit mit „Wiederherstellen“. Fehleinträge: „wird in X Tagen endgültig gelöscht“
   (Datenbank-Funktion papierkorb_leeren, täglich und beim Laden). Stornierte/unterschriebene Stunden: eigene Liste,
   bleiben aufbewahrt. Läuft auch mit alter Datenbank (ohne geloescht_am / papierkorb_leeren). */
const PK_MAX = 300;
const PK = { fs: null, voll: false, daten: null, zeit: 0, laedt: false, offen: false, stornoOffen: false, geleert: false, fehler: "" };
async function pkHolen() {
  if (PK.laedt) return; PK.laedt = true;
  const fs = S.fsId;
  try {
    if (!PK.geleert) { PK.geleert = true; try { await supa.rpc("papierkorb_leeren"); } catch (e) { /* alte Datenbank: ohne */ } }
    const spalten = "id,datum,von,bis,art,fahrlehrer_id,schueler_id,status,payload,aktualisiert_am";
    const hol = (sp) => supa.from("kalender_termine").select(sp).eq("fahrschule_id", S.fsId).eq("geloescht", true).order("aktualisiert_am", { ascending: false }).limit(PK_MAX);
    let r = await hol(spalten + ",geloescht_am,admin_entfernt_am");
    if (r.error) r = await hol(spalten + ",geloescht_am");
    if (r.error) r = await hol(spalten);
    if (fs !== S.fsId) return; // während des Ladens Fahrschule gewechselt
    if (r.error) { PK.fehler = r.error.message; PK.daten = PK.daten || []; }
    // Von der Leitung entfernte Termine gehören nicht in den Papierkorb (gesperrt, lassen sich nicht zurückholen)
    else { PK.fehler = ""; PK.voll = (r.data || []).length >= PK_MAX; PK.daten = (r.data || []).filter((t) => t.art !== "block" && !t.admin_entfernt_am); }
    PK.zeit = Date.now();
  } finally { PK.laedt = false; }
}
function pkArt(t) { return NW_FAHRT_ARTEN.includes(t.art || "fahrstunde") ? nwArtText(t) : (ARTEN[t.art] || t.art || "Termin"); }
// Abgesagte Prüfung (Prüfungstafel hat die Verknüpfung gelöst) und online gebuchte Stunde (Absage ist raus): nicht zurückholen
function pkNichtZurueck(t) { return t.art === "pruefung" ? "Prüfung: bitte auf der Prüfungstafel neu planen" : (t.payload || {}).onlineBookingId ? "online gebucht: Absage ist raus, bitte neu buchen" : ""; }
function pkZeile(t) {
  const nein = pkNichtZurueck(t);
  return `<li class="nw-zeile"><span class="nw-wann"><b>${esc(datumDE(t.datum))}</b> ${esc(t.von || "")}–${esc(t.bis || "")}</span>
    <span class="nw-was">${esc(pkArt(t))} · ${esc(schuelerName(t.schueler_id) || "ohne Schüler")} · ${esc(lehrerName(t.fahrlehrer_id) || "–")}<br><span class="leise klein">${esc(nwPapierkorbText(t))}</span></span>
    <span class="nw-knoepfe">${nein ? `<span class="leise klein">${esc(nein)}</span>` : `<button type="button" class="knopf klein" data-pkzurueck="${esc(t.id)}">Wiederherstellen</button>`}</span></li>`;
}
function pkHTML() {
  const alle = PK.daten || [];
  const bleibt = alle.filter((t) => { const p = t.payload || {}; return nwStorno(t) || p.signed || (p.signaturUngueltig && typeof p.signaturUngueltig === "object"); });
  const weg = alle.filter((t) => !bleibt.includes(t));
  return `<details class="karte nw-details pk-karte" id="pkKarte"${PK.offen ? " open" : ""}><summary>Papierkorb (${PK.daten ? alle.length + (PK.voll ? "+" : "") : "…"})</summary>
    ${PK.fehler ? `<p class="leise klein">Papierkorb konnte nicht geladen werden.</p>` : !PK.daten ? `<p class="leise klein">Lädt …</p>` : `
    <p class="leise klein">Gelöschte Termine. Fehleinträge werden nach ${nwPapierkorbTage()} Tagen endgültig gelöscht; stornierte und unterschriebene Stunden bleiben aufbewahrt. Der Verlauf jeder Stunde bleibt.</p>
    ${PK.voll ? `<p class="leise klein">Gezeigt werden die letzten ${PK_MAX} gelöschten Termine.</p>` : ""}
    ${weg.length ? `<ul class="nw-liste">${weg.map(pkZeile).join("")}</ul>` : `<p class="leise klein">Keine gelöschten Termine.</p>`}
    ${bleibt.length ? `<details class="nw-details" id="pkStorno"${PK.stornoOffen ? " open" : ""}><summary>Storniert, bleibt aufbewahrt (${bleibt.length})</summary><ul class="nw-liste">${bleibt.map(pkZeile).join("")}</ul></details>` : ""}`}
  </details>`;
}
function pkZeigen(ziel) {
  if (!ziel || !S.fsId) return;
  if (PK.fs !== S.fsId) { PK.fs = S.fsId; PK.daten = null; PK.zeit = 0; PK.geleert = false; PK.fehler = ""; } // andere Fahrschule: nichts von der vorigen zeigen
  let box = ziel.querySelector("#buPapierkorb");
  if (!box) { box = document.createElement("div"); box.id = "buPapierkorb"; ziel.appendChild(box); }
  const neu = () => {
    box.innerHTML = pkHTML();
    const k = box.querySelector("#pkKarte"); if (k) k.addEventListener("toggle", () => { PK.offen = k.open; });
    const s = box.querySelector("#pkStorno"); if (s) s.addEventListener("toggle", () => { PK.stornoOffen = s.open; });
    box.querySelectorAll("[data-pkzurueck]").forEach((b) => b.addEventListener("click", async () => {
      const t = (PK.daten || []).find((x) => x.id === b.dataset.pkzurueck); if (!t) return;
      b.disabled = true;
      const res = await supa.from("kalender_termine").update({ geloescht: false, aktualisiert_am: new Date().toISOString() }).eq("id", t.id).select("*");
      if (res.error || !res.data || !res.data.length) { b.disabled = false; toast("Zurückholen ging nicht: " + nwFehlerText(res.error, "keine Berechtigung"), true); return; }
      PK.daten = (PK.daten || []).filter((x) => x.id !== t.id);
      nwMerken(res.data[0]); zeichne();
      toast(`${pkArt(t)} vom ${datumDE(t.datum)} ist wieder da`);
    }));
  };
  neu();
  if (!PK.daten || Date.now() - PK.zeit > 60000) pkHolen().then(() => { if (box.isConnected) neu(); });
}
