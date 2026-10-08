/* Kompass Büro – eigene Seite für Büro und Fahrschul-Leitung (PC).
   Nutzt dieselbe Anmeldung und dieselben Fahrschul-Tabellen wie die Gesamtansicht in index.html.
   Rechte: Die Datenbank (RLS) entscheidet, was gelesen und geschrieben werden darf;
   die Seite blendet zusätzlich aus, was eine Rolle nicht braucht. */
"use strict";

const SUPA_URL = "https://oectrvkjunntzsggyhxv.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RydmtqdW5udHpzZ2d5aHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1ODkyMjYsImV4cCI6MjA5ODE2NTIyNn0.8zmIzvyKh9x_WvykSO9LJczhff_eztl3rSycqmlPHPY";
// Muss zu AGB_VERSION in index.html passen (scripts/rechnen-test.mjs prüft das)
const AGB_VERSION = "1.0";
const ROLLEN = { super_admin: "Super-Admin", fahrschule_admin: "Fahrschul-Leitung", buero: "Büro" };
const NEU_LADEN_MS = 120000;

const ARTEN = {
  fahrstunde: "Fahrstunde", nacht: "Nachtfahrt", sonder: "Sonderfahrt", pruefung: "Prüfung", theorie: "Theorie",
  schalt: "Schaltkompetenz", block: "Blockiert", vortest: "Vortest", simulator: "Simulator", beratung: "Beratung", ersthilfe: "Erste Hilfe"
};

const supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);
const S = {
  user: null, profil: null, fsId: null, fs: null, schulen: [],
  lehrer: [], schueler: [], termine: [], pruefungen: [], pruefungstermine: [], fahrzeuge: [], pakete: [],
  geladenAm: null, ladeNr: 0
};

/* ---------- Hilfen ---------- */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function datumDE(iso) { if (!iso) return ""; const [j, m, t] = String(iso).slice(0, 10).split("-"); return `${t}.${m}.${j}`; }
function zahlDE(n, stellen = 0) { return Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen }); }
function euro(n) { return Number(n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }); }
let _toastTimer = null;
function toast(text, fehler = false) {
  const t = $("toast");
  t.textContent = text;
  t.classList.toggle("fehler", !!fehler);
  t.classList.add("zeigen");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("zeigen"), fehler ? 6000 : 3000);
}
function setStatus(art, text) {
  const s = $("status");
  s.classList.remove("ok", "warn", "fehler");
  if (art) s.classList.add(art);
  $("statusText").textContent = text;
}
// supabase-js wirft nicht, sondern liefert {error}: hier wird daraus ein echter Fehler
function pruefe(res, was) {
  if (res && res.error) throw new Error((was ? was + ": " : "") + res.error.message);
  return res ? res.data : null;
}
function lehrerName(id) {
  const l = S.lehrer.find((x) => x.id === id);
  return l ? (l.name || l.email) : "ohne Fahrlehrer";
}
function schuelerName(id) {
  const s = S.schueler.find((x) => x.id === id);
  return s ? s.name : "";
}
function istAdmin() { return S.profil && (S.profil.rolle === "fahrschule_admin" || S.profil.rolle === "super_admin"); }

/* ---------- Bereiche ---------- */
// schritt = Bauplan-Schritt, in dem der Bereich fertig wird (nur Hinweis, solange er noch fehlt)
const BEREICHE = [
  { id: "heute", titel: "Heute zu tun", gruppe: "Arbeit", render: renderHeute },
  { id: "pruefungen", titel: "Prüfungstafel", gruppe: "Arbeit", render: renderPruefungen, nachher: bindePruefungen, zahl: () => zaehlePruefungen().handeln || "" },
  { id: "fahrchecks", titel: "Fahrchecks", gruppe: "Arbeit", schritt: 4 },
  { id: "fristen", titel: "Fristen & Reaktivierung", gruppe: "Arbeit", render: renderFristen, nachher: bindeFristen, zahl: () => zaehleFristen().handeln || "" },
  { id: "kalender", titel: "Kalender", gruppe: "Planung", render: renderKalender, nachher: bindeKalender },
  { id: "schueler", titel: "Schüler", gruppe: "Planung", render: renderSchueler, nachher: bindeSchueler, zahl: () => S.schueler.filter((x) => !x.fahrlehrer_id).length || "" },
  { id: "verkaeufe", titel: "Verkäufe & Provision", gruppe: "Geld", schritt: 6 },
  { id: "zahlen", titel: "Zahlen", gruppe: "Geld", schritt: 7 },
  { id: "team", titel: "Fahrlehrer & Zugänge", gruppe: "Verwaltung", schritt: 9 },
  { id: "flotte", titel: "Fahrzeuge", gruppe: "Verwaltung", schritt: 9 },
];
function aktuellerBereich() {
  const id = (location.hash || "#heute").slice(1).split("?")[0];
  return BEREICHE.find((b) => b.id === id) || BEREICHE[0];
}
function zeichneNav() {
  const aktiv = aktuellerBereich().id;
  let html = "", gruppe = "";
  for (const b of BEREICHE) {
    if (b.gruppe !== gruppe) { gruppe = b.gruppe; html += `<div class="nav-gruppe">${esc(gruppe)}</div>`; }
    const z = b.render && b.zahl && S.geladenAm ? b.zahl() : "";
    const zusatz = b.render ? (z ? `<span class="zahl">${z}</span>` : "") : `<span class="bald">im Bau</span>`;
    html += `<a class="nav-punkt" href="#${b.id}"${b.id === aktiv ? ' aria-current="page"' : ""}>${esc(b.titel)}${zusatz}</a>`;
  }
  $("nav").innerHTML = html;
}
function zeichne() {
  const b = aktuellerBereich();
  $("titel").textContent = b.titel;
  document.title = b.titel + " · Kompass Büro";
  zeichneNav();
  const ziel = $("ansicht");
  if (!S.geladenAm) { ziel.innerHTML = `<p class="leer">Daten werden geladen …</p>`; return; }
  ziel.innerHTML = b.render ? b.render() : renderBald(b);
  if (b.nachher) b.nachher(ziel);
}
window.addEventListener("hashchange", () => { zeichne(); $("ansicht").focus({ preventScroll: true }); window.scrollTo(0, 0); });

function renderBald(b) {
  return `<div class="karte"><h2>${esc(b.titel)}</h2>
    <p class="leise">Dieser Bereich wird gerade gebaut. Bis dahin funktioniert alles wie gewohnt in der Kompass-App unter „Admin-Gesamtübersicht“.</p></div>`;
}

/* ---------- Heute ---------- */
function renderHeute() {
  const heute = KR.todayISO();
  const aktiveSchueler = S.schueler.length;
  const ohneLehrer = S.schueler.filter((s) => !s.fahrlehrer_id).length;
  const termineHeute = S.termine
    .filter((t) => t.datum === heute && t.art !== "block")
    .sort((a, b) => String(a.von || "").localeCompare(String(b.von || "")));
  const kacheln = `<div class="kacheln">
    <div class="kachel"><div class="wert">${zahlDE(aktiveSchueler)}</div><div class="name">aktive Schüler</div></div>
    <div class="kachel"><div class="wert">${zahlDE(S.lehrer.length)}</div><div class="name">Fahrlehrer</div></div>
    <div class="kachel"><div class="wert">${zahlDE(termineHeute.length)}</div><div class="name">Termine heute</div></div>
    <div class="kachel${ohneLehrer ? " rot" : ""}"><div class="wert">${zahlDE(ohneLehrer)}</div><div class="name">Schüler ohne Fahrlehrer</div></div>
  </div>`;
  const zeilen = termineHeute.map((t) => `<tr>
      <td class="zeitspalte">${esc(t.von || "")}${t.bis ? "–" + esc(t.bis) : ""}</td>
      <td>${esc(lehrerName(t.fahrlehrer_id))}</td>
      <td>${esc(schuelerName(t.schueler_id) || t.interessent_name || "")}</td>
      <td><span class="marke-pill">${esc(ARTEN[t.art] || t.art || "")}</span></td>
      <td>${esc(t.fahrzeug || "")}</td>
    </tr>`).join("");
  const liste = `<div class="karte"><div class="karte-kopf"><h2>Termine heute, ${esc(datumDE(heute))}</h2></div>
    ${termineHeute.length ? `<table class="tabelle"><thead><tr><th>Zeit</th><th>Fahrlehrer</th><th>Schüler</th><th>Art</th><th>Fahrzeug</th></tr></thead><tbody>${zeilen}</tbody></table>`
      : `<p class="leer">Heute stehen keine Termine im Kalender.</p>`}</div>`;
  const f = zaehleFristen();
  const aufgaben = [];
  if (f.gesperrt) aufgaben.push(`<a class="aufgabe rot" href="#fristen"><b>${f.gesperrt}</b> Reaktivierung${f.gesperrt === 1 ? "" : "en"} überfällig · ${euro(f.gesperrt * reaktBetrag())} offen</a>`);
  if (f.pruefen) aufgaben.push(`<a class="aufgabe gelb" href="#fristen"><b>${f.pruefen}</b> Schüler mit möglicher Reaktivierung: in ClickClickDrive prüfen</a>`);
  if (f.bald) aufgaben.push(`<a class="aufgabe gelb" href="#fristen"><b>${f.bald}</b> Reaktivierung${f.bald === 1 ? "" : "en"} in den nächsten 30 Tagen fällig</a>`);
  if (f.theorie) aufgaben.push(`<a class="aufgabe gelb" href="#fristen?ansicht=theorie"><b>${f.theorie}</b> Theorie läuft in 60 Tagen ab oder ist abgelaufen</a>`);
  const pz = zaehlePruefungen();
  if (pz.ohneErgebnis) aufgaben.push(`<a class="aufgabe rot" href="#pruefungen"><b>${pz.ohneErgebnis}</b> Prüfung${pz.ohneErgebnis === 1 ? "" : "en"} ohne Ergebnis eingetragen</a>`);
  if (pz.offeneHaken) aufgaben.push(`<a class="aufgabe gelb" href="#pruefungen"><b>${pz.offeneHaken}</b> Prüfung${pz.offeneHaken === 1 ? "" : "en"} in den nächsten 14 Tagen mit offenen Haken (Entgelt, TÜV, AS-Portal)</a>`);
  if (f.ohneDatum) aufgaben.push(`<a class="aufgabe" href="#fristen?ansicht=ohne"><b>${f.ohneDatum}</b> Schüler ohne Vertragsdatum</a>`);
  const todo = `<div class="karte"><div class="karte-kopf"><h2>Zu erledigen</h2></div>${aufgaben.length ? `<div class="aufgaben">${aufgaben.join("")}</div>` : `<p class="leer">Gerade ist nichts offen.</p>`}</div>`;
  return kacheln + todo + liste;
}

/* ---------- Fristen & Reaktivierung ---------- */
const AUSBILDUNGSARTEN = { neu: "Neu", fahrschulwechsel: "Fahrschulwechsel", umschreibung: "Umschreibung", auffrischung: "Auffrischung", erweiterung: "Erweiterung" };
const KLASSEN = ["B", "B197", "BE", "B+BE", "C1", "C1E", "C", "CE", "BKF"];
function reaktBetrag() {
  const k = (S.fs && S.fs.konfiguration) || {};
  return Number(k.reaktivierungBetrag) > 0 ? Number(k.reaktivierungBetrag) : 249;
}
function zaehleFristen() {
  const heute = KR.todayISO();
  const z = { gesperrt: 0, pruefen: 0, bald: 0, theorie: 0, ohneDatum: 0, handeln: 0 };
  for (const s of S.schueler) {
    const r = KR.reaktInfo(s, heute), t = KR.theorieInfo(s, heute);
    if (r.stufe === "gesperrt") z.gesperrt++;
    else if (r.stufe === "pruefen_faellig") z.pruefen++;
    else if (r.stufe === "bald") z.bald++;
    if (r.stufe === "ohne_datum") z.ohneDatum++;
    if (t.stufe === "abgelaufen" || t.stufe === "bald" || t.stufe === "demnaechst") z.theorie++;
  }
  z.handeln = z.gesperrt + z.pruefen;
  return z;
}
const REAKT_TEXT = {
  gesperrt: ["rot", "überfällig · gesperrt"], pruefen_faellig: ["rot", "fällig · in CCD prüfen"], bald: ["gelb", "bald fällig"],
  demnaechst: ["blau", "in 60 Tagen"], ok: ["gruen", "bezahlt"], befreit: ["", "befreit"], ohne_datum: ["", "Vertragsdatum fehlt"]
};
const THEORIE_TEXT = { abgelaufen: ["rot", "abgelaufen"], bald: ["gelb", "läuft bald ab"], demnaechst: ["blau", "in 60 Tagen"], ok: ["gruen", "gültig"], ohne_datum: ["", "–"] };
function fristenParam(name) {
  const m = location.hash.match(new RegExp("[?&]" + name + "=([^&]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}
const FRISTEN_ANSICHTEN = [["handeln", "Handlungsbedarf"], ["alle", "Alle Schüler"], ["ohne", "Ohne Vertragsdatum"], ["theorie", "Theorie-Fristen"]];
const REAKT_RANG = { gesperrt: 0, pruefen_faellig: 1, bald: 2, demnaechst: 3, ohne_datum: 4, ok: 5, befreit: 6 };
function renderFristen() {
  const heute = KR.todayISO();
  const ansicht = fristenParam("ansicht") || "handeln";
  const suche = (fristenParam("suche") || "").toLowerCase();
  const f = zaehleFristen();
  const kacheln = `<div class="kacheln">
    <div class="kachel${f.gesperrt ? " rot" : ""}"><div class="wert">${euro(f.gesperrt * reaktBetrag())}</div><div class="name">offen: ${f.gesperrt} Reaktivierung${f.gesperrt === 1 ? "" : "en"} überfällig</div></div>
    <div class="kachel${f.pruefen ? " rot" : ""}"><div class="wert">${f.pruefen}</div><div class="name">fällig, noch nicht geprüft</div></div>
    <div class="kachel${f.bald ? " gold" : ""}"><div class="wert">${f.bald}</div><div class="name">in 30 Tagen fällig</div></div>
    <div class="kachel"><div class="wert">${f.ohneDatum}</div><div class="name">ohne Vertragsdatum</div></div>
  </div>`;
  let liste = S.schueler.map((s) => ({ s, r: KR.reaktInfo(s, heute), t: KR.theorieInfo(s, heute) }));
  if (ansicht === "handeln") liste = liste.filter((x) => ["gesperrt", "pruefen_faellig", "bald"].includes(x.r.stufe) || ["abgelaufen", "bald"].includes(x.t.stufe));
  if (ansicht === "ohne") liste = liste.filter((x) => x.r.stufe === "ohne_datum");
  if (ansicht === "theorie") liste = liste.filter((x) => x.t.stufe !== "ohne_datum");
  if (suche) liste = liste.filter((x) => (x.s.name || "").toLowerCase().includes(suche) || (x.s.telefon || "").replace(/\s/g, "").includes(suche.replace(/\s/g, "")));
  if (ansicht === "theorie") liste.sort((a, b) => (a.t.tage ?? 99999) - (b.t.tage ?? 99999));
  else liste.sort((a, b) => (REAKT_RANG[a.r.stufe] - REAKT_RANG[b.r.stufe]) || ((a.r.tage ?? 99999) - (b.r.tage ?? 99999)) || String(a.s.name).localeCompare(String(b.s.name), "de"));
  const tabs = FRISTEN_ANSICHTEN.map(([id, name]) => `<a class="tab" href="#fristen?ansicht=${id}"${id === ansicht ? ' aria-current="page"' : ""}>${name}</a>`).join("");
  const zeilen = liste.map(({ s, r, t }) => {
    const [rf, rt] = REAKT_TEXT[r.stufe];
    const [tf, tt] = THEORIE_TEXT[t.stufe];
    const rDatum = r.faellig ? `<div class="unter">${r.tage < 0 ? "seit " + datumDE(r.faellig) : "am " + datumDE(r.faellig)}</div>` : "";
    const tDatum = t.ablauf ? `<div class="unter">${t.tage < 0 ? "seit " : "bis "}${datumDE(t.ablauf)}${t.grund === "praxis" ? " (Praxisprüfung)" : ""}</div>` : "";
    let zahlen = (r.stufe === "gesperrt" || r.stufe === "pruefen_faellig" || r.stufe === "bald")
      ? `<button class="knopf klein haupt" data-zahlung="${esc(s.id)}" type="button">${euro(reaktBetrag())} erhalten</button>` : "";
    if (r.stufe === "pruefen_faellig") zahlen += `<button class="knopf klein" data-nichtbezahlt="${esc(s.id)}" type="button">Nicht bezahlt</button>`;
    return `<tr>
      <td><b>${esc(s.name)}</b><div class="unter">${esc(AUSBILDUNGSARTEN[s.ausbildungsart] || "Neu")}${s.klasse ? " · " + esc(s.klasse) : ""}<span class="nur-schmal"> · Vertrag ${s.vertrag_am ? esc(datumDE(s.vertrag_am)) : "fehlt"}</span></div></td>
      <td>${esc(lehrerName(s.fahrlehrer_id))}</td>
      <td class="zeitspalte nur-breit">${s.vertrag_am ? esc(datumDE(s.vertrag_am)) : '<span class="leise">fehlt</span>'}</td>
      <td><span class="marke-pill ${rf}">${rt}</span>${rDatum}</td>
      <td><span class="marke-pill ${tf}">${tt}</span>${tDatum}</td>
      <td class="aktionen"><div class="aktionen-box">${zahlen}<button class="knopf klein" data-fristen="${esc(s.id)}" type="button">Bearbeiten</button></div></td>
    </tr>`;
  }).join("");
  return kacheln + `<div class="karte">
    <div class="karte-kopf"><div class="tabs">${tabs}</div>
      <input type="search" class="suche" id="fristenSuche" placeholder="Name oder Telefon suchen" value="${esc(fristenParam("suche"))}" aria-label="Schüler suchen"></div>
    ${liste.length ? `<table class="tabelle"><thead><tr><th>Schüler</th><th>Fahrlehrer</th><th class="nur-breit">Vertrag</th><th>Reaktivierung</th><th>Theorie</th><th></th></tr></thead><tbody>${zeilen}</tbody></table>`
      : `<p class="leer">${ansicht === "handeln" ? "Kein Handlungsbedarf. Sehr gut." : "Keine Schüler in dieser Ansicht."}</p>`}
    <p class="leise klein">Reaktivierung: ${euro(reaktBetrag())}, fällig 12 Monate nach Vertragsabschluss und dann jährlich. „Gesperrt“ heißt: keine weiteren Leistungen, bis bezahlt ist. Jede Änderung wird mit Name und Uhrzeit protokolliert.</p>
  </div>`;
}
function bindeFristen(ziel) {
  const suche = ziel.querySelector("#fristenSuche");
  if (suche) {
    let t = null;
    suche.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const ansicht = fristenParam("ansicht") || "handeln";
        history.replaceState(null, "", `#fristen?ansicht=${ansicht}${suche.value ? "&suche=" + encodeURIComponent(suche.value) : ""}`);
        zeichne();
        const neu = $("fristenSuche"); if (neu) { neu.focus(); neu.setSelectionRange(neu.value.length, neu.value.length); }
      }, 250);
    });
  }
  ziel.querySelectorAll("[data-zahlung]").forEach((b) => b.addEventListener("click", () => zahlungErhalten(b.dataset.zahlung)));
  ziel.querySelectorAll("[data-nichtbezahlt]").forEach((b) => b.addEventListener("click", () => nichtBezahlt(b.dataset.nichtbezahlt)));
  ziel.querySelectorAll("[data-fristen]").forEach((b) => b.addEventListener("click", () => fristenDialog(b.dataset.fristen)));
}
async function speichereSchueler(id, werte, meldung) {
  const res = await supa.from("schueler").update(werte).eq("id", id).select("id");
  if (res.error || !res.data || !res.data.length) {
    toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung für diesen Schüler"), true);
    return false;
  }
  const s = S.schueler.find((x) => x.id === id);
  if (s) Object.assign(s, werte);
  toast(meldung || "Gespeichert");
  zeichne();
  return true;
}
async function zahlungErhalten(id) {
  const s = S.schueler.find((x) => x.id === id);
  if (!s) return;
  const neu = KR.reaktNachZahlung(s);
  if (!neu) { fristenDialog(id); return; }
  const ok = await bestaetige(`${euro(reaktBetrag())} Reaktivierung von ${s.name} erhalten?`,
    `Die nächste Reaktivierung ist dann am ${datumDE(neu)} fällig. Bitte die Zahlung auch in ClickClickDrive vermerken.`, "Ja, erhalten");
  if (!ok) return;
  await speichereSchueler(id, { reakt_status: "bezahlt", reakt_bezahlt_bis: neu }, `Gespeichert. Nächste Reaktivierung am ${datumDE(neu)}.`);
}
// Geprüft, nicht bezahlt: Fälligkeit bleibt in der Vergangenheit -> Schüler ist gesperrt
async function nichtBezahlt(id) {
  const s = S.schueler.find((x) => x.id === id);
  const f = s && KR.reaktFaellig(s);
  if (!f) return;
  const ok = await bestaetige(`${s.name}: Reaktivierung nicht bezahlt?`,
    `Dann ist ${s.name} ab sofort gesperrt (keine weiteren Leistungen), bis ${euro(reaktBetrag())} bezahlt sind.`, "Ja, sperren");
  if (!ok) return;
  await speichereSchueler(id, { reakt_status: "bezahlt", reakt_bezahlt_bis: f }, `${s.name} ist gesperrt, bis die Reaktivierung bezahlt ist.`);
}
function fristenDialog(id) {
  const s = S.schueler.find((x) => x.id === id);
  if (!s) return;
  const r = KR.reaktInfo(s);
  const body = `
    <div class="formular">
      <label>Vertrag abgeschlossen am<input type="date" name="vertrag_am" value="${esc(s.vertrag_am || "")}"></label>
      <label>Ausbildungsart<select name="ausbildungsart">${Object.entries(AUSBILDUNGSARTEN).map(([k, v]) => `<option value="${k}"${(s.ausbildungsart || "neu") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Klasse<select name="klasse"><option value="">–</option>${KLASSEN.map((k) => `<option${s.klasse === k ? " selected" : ""}>${k}</option>`).join("")}</select></label>
      <fieldset class="voll"><legend>Reaktivierung</legend>
        <label class="wahl"><input type="radio" name="reakt_status" value="pruefen"${(s.reakt_status || "pruefen") === "pruefen" ? " checked" : ""}> noch nicht geprüft</label>
        <label class="wahl"><input type="radio" name="reakt_status" value="bezahlt"${s.reakt_status === "bezahlt" ? " checked" : ""}> geprüft: bezahlt bis zur nächsten Fälligkeit</label>
        <label class="wahl"><input type="radio" name="reakt_status" value="befreit"${s.reakt_status === "befreit" ? " checked" : ""}> befreit (keine Reaktivierung)</label>
      </fieldset>
      <label>Nächste Reaktivierung fällig am<input type="date" name="reakt_bezahlt_bis" value="${esc(s.reakt_bezahlt_bis || r.faellig || "")}"></label>
      <label>Notiz (z. B. Grund für „befreit“)<input type="text" name="reakt_notiz" maxlength="200" value="${esc(s.reakt_notiz || "")}"></label>
      <label>Theorieunterricht abgeschlossen am<input type="date" name="theorie_abgeschlossen_am" value="${esc(s.theorie_abgeschlossen_am || "")}"></label>
      <label>Theorieprüfung bestanden am<input type="date" name="theorie_bestanden_am" value="${esc(s.theorie_bestanden_am || "")}"></label>
    </div>
    <div class="protokoll" id="protokoll"><p class="leise klein">Verlauf wird geladen …</p></div>`;
  oeffneDialog(`Fristen: ${s.name}`, body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    const werte = {
      vertrag_am: d.vertrag_am || null,
      ausbildungsart: d.ausbildungsart || "neu",
      klasse: d.klasse || null,
      reakt_status: d.reakt_status || "pruefen",
      reakt_bezahlt_bis: d.reakt_status === "bezahlt" ? (d.reakt_bezahlt_bis || null) : (s.reakt_bezahlt_bis || null),
      reakt_notiz: (d.reakt_notiz || "").trim() || null,
      theorie_abgeschlossen_am: d.theorie_abgeschlossen_am || null,
      theorie_bestanden_am: d.theorie_bestanden_am || null,
    };
    if (werte.reakt_status === "bezahlt" && !werte.reakt_bezahlt_bis) { toast("Bitte das Datum der nächsten Fälligkeit eintragen.", true); return false; }
    if (werte.reakt_status === "befreit" && !werte.reakt_notiz) { toast("Bitte einen Grund für „befreit“ eintragen.", true); return false; }
    if (werte.theorie_bestanden_am && werte.theorie_abgeschlossen_am && werte.theorie_bestanden_am < werte.theorie_abgeschlossen_am) {
      toast("Die Theorieprüfung kann nicht vor dem Abschluss des Unterrichts liegen.", true); return false;
    }
    return speichereSchueler(id, werte);
  });
  ladeProtokoll("schueler", id);
}
const FELD_NAMEN = { vertrag_am: "Vertragsdatum", klasse: "Klasse", ausbildungsart: "Ausbildungsart", reakt_status: "Reaktivierung", reakt_bezahlt_bis: "fällig am", reakt_notiz: "Notiz", theorie_abgeschlossen_am: "Theorie abgeschlossen", theorie_bestanden_am: "Theorieprüfung bestanden" };
async function ladeProtokoll(tabelle, id) {
  const ziel = $("protokoll");
  const res = await supa.from("aenderungsprotokoll").select("*").eq("tabelle", tabelle).eq("datensatz_id", id).order("geaendert_am", { ascending: false }).limit(20);
  if (!ziel || !ziel.isConnected) return;
  if (res.error) { ziel.innerHTML = ""; return; }
  const zeilen = (res.data || []).map((p) => {
    const wer = (S.lehrer.find((l) => l.id === p.geaendert_von) || {}).name || (p.geaendert_von === S.user.id ? "du" : "Büro");
    const wann = new Date(p.geaendert_am).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
    const wert = (v) => (/^\d{4}-\d\d-\d\d$/.test(v || "") ? datumDE(v) : (v || "–"));
    return `<li>${esc(wann)} · ${esc(wer)}: ${esc(FELD_NAMEN[p.feld] || p.feld)} ${esc(wert(p.alt))} → ${esc(wert(p.neu))}</li>`;
  }).join("");
  ziel.innerHTML = zeilen ? `<h3>Verlauf</h3><ul>${zeilen}</ul>` : `<p class="leise klein">Noch keine Änderungen protokolliert.</p>`;
}

/* ---------- Prüfungstafel ---------- */
const P_STATUS = { geplant: ["", "geplant"], bestanden: ["gruen", "bestanden"], nicht_bestanden: ["rot", "nicht bestanden"], abgesagt: ["", "abgesagt"] };
const HAKEN = [
  ["entgelt_bezahlt", "blau", "Vorstellungsentgelt bezahlt"],
  ["tuev_gutschein", "rot", "TÜV-Gutschein gekauft"],
  ["as_portal", "gruen", "Letzte Stunde im AS-Portal eingetragen"],
];
function zaehlePruefungen() {
  const heute = KR.todayISO(), bis14 = KR.addDaysISO(heute, 14);
  const z = { ohneErgebnis: 0, offeneHaken: 0, woche: 0, handeln: 0 };
  for (const p of S.pruefungstermine) {
    if (p.status !== "geplant") continue;
    if (p.datum < heute) z.ohneErgebnis++;
    else if (p.datum <= bis14 && HAKEN.some(([k]) => !p[k])) z.offeneHaken++;
    if (p.datum >= heute && p.datum <= KR.addDaysISO(heute, 6)) z.woche++;
  }
  z.handeln = z.ohneErgebnis + z.offeneHaken;
  return z;
}
function wochentag(iso) { return KR.parseISO(iso).toLocaleDateString("de-DE", { weekday: "long" }); }
function hakenHTML(p, gross) {
  return `<div class="haken-reihe${gross ? " gross" : ""}">${HAKEN.map(([k, farbe, titel]) =>
    `<button type="button" class="haken ${farbe}${p[k] ? " an" : ""}" data-haken="${k}" data-id="${esc(p.id)}" aria-pressed="${p[k] ? "true" : "false"}" title="${titel}" aria-label="${titel}"${p.status !== "geplant" ? " disabled" : ""}>✓</button>`).join("")}</div>`;
}
function renderPruefungen() {
  const heute = KR.todayISO();
  const ansicht = fristenParam("ansicht") || "kommend";
  const art = fristenParam("art") || "alle";
  const gross = fristenParam("gross") === "1";
  document.body.classList.toggle("kiosk", gross);
  let liste = S.pruefungstermine.slice();
  if (art !== "alle") liste = liste.filter((p) => p.art === art);
  const offen = liste.filter((p) => p.status === "geplant" && p.datum < heute);
  if (ansicht === "kommend") liste = liste.filter((p) => p.datum >= heute && p.status !== "abgesagt");
  else liste = liste.filter((p) => p.datum < heute || p.status !== "geplant").reverse();
  if (gross) liste = liste.filter((p) => p.datum <= KR.addDaysISO(heute, 13));
  const z = zaehlePruefungen();
  const nachTag = {};
  for (const p of liste) (nachTag[p.datum] = nachTag[p.datum] || []).push(p);
  const tage = Object.keys(nachTag);
  const zeile = (p) => {
    const s = S.schueler.find((x) => x.id === p.schueler_id) || {};
    const [sf, st] = P_STATUS[p.status] || P_STATUS.geplant;
    const aktion = p.status === "geplant"
      ? (p.datum <= heute ? `<button class="knopf klein haupt" data-ergebnis="${esc(p.id)}" type="button">Ergebnis</button>` : "")
      : `<span class="marke-pill ${sf}">${st}</span>`;
    return `<tr class="${p.status === "geplant" && p.datum < heute ? "warnzeile" : ""}">
      <td class="zeitspalte">${esc(p.von || "–")}</td>
      <td><span class="marke-pill ${p.art === "praxis" ? "gruen" : "blau"}">${p.art === "praxis" ? "Praxis" : "Theorie"}</span>${p.klasse ? ` <span class="leise klein">${esc(p.klasse)}</span>` : ""}</td>
      <td><b>${esc(s.name || "(Schüler gelöscht)")}</b>${p.notiz ? `<div class="unter">${esc(p.notiz)}</div>` : ""}</td>
      <td>${esc(p.fahrlehrer_id ? lehrerName(p.fahrlehrer_id) : "–")}</td>
      <td>${hakenHTML(p, gross)}</td>
      ${gross ? "" : `<td class="aktionen"><div class="aktionen-box">${aktion}<button class="knopf klein" data-pbearb="${esc(p.id)}" type="button">Bearbeiten</button></div></td>`}
    </tr>`;
  };
  const tabellen = tage.map((d) => `<h3 class="tag-titel${d === heute ? " heute" : ""}">${d === heute ? "Heute" : esc(wochentag(d))}, ${esc(datumDE(d))}</h3>
    <table class="tabelle ptabelle"><colgroup><col class="c-zeit"><col class="c-art"><col><col class="c-lehrer"><col class="c-haken">${gross ? "" : '<col class="c-akt">'}</colgroup><thead><tr><th>Zeit</th><th>Art</th><th>Schüler</th><th>Fahrlehrer</th><th>Entgelt · TÜV · AS</th>${gross ? "" : "<th></th>"}</tr></thead>
    <tbody>${nachTag[d].map(zeile).join("")}</tbody></table>`).join("");
  const legende = `<div class="legende">${HAKEN.map(([, f, t]) => `<span><span class="haken ${f} an mini">✓</span> ${t}</span>`).join("")}</div>`;
  if (gross) {
    return `<div class="kiosk-kopf"><h2>Prüfungen der nächsten 14 Tage</h2><a class="knopf" href="#pruefungen">Großansicht beenden</a></div>${legende}
      ${tabellen || `<p class="leer">Keine Prüfungen in den nächsten 14 Tagen.</p>`}`;
  }
  const tabs = [["kommend", "Kommende"], ["vergangen", "Vergangene"]].map(([id, n]) => `<a class="tab" href="#pruefungen?ansicht=${id}&art=${art}"${id === ansicht ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  const arten = [["alle", "Alle"], ["praxis", "Praxis"], ["theorie", "Theorie"]].map(([id, n]) => `<a class="tab" href="#pruefungen?ansicht=${ansicht}&art=${id}"${id === art ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  const warn = offen.length && ansicht === "kommend"
    ? `<div class="karte warnkarte"><h2>${offen.length} Prüfung${offen.length === 1 ? "" : "en"} ohne Ergebnis</h2><table class="tabelle ptabelle"><colgroup><col class="c-zeit breit"><col class="c-art"><col><col class="c-lehrer"><col class="c-haken"><col class="c-akt"></colgroup><tbody>${offen.map((p) => zeile(p).replace("<td class=\"zeitspalte\">", `<td class="zeitspalte">${esc(datumDE(p.datum))} `)).join("")}</tbody></table></div>` : "";
  return `<div class="kacheln">
      <div class="kachel"><div class="wert">${z.woche}</div><div class="name">Prüfungen in den nächsten 7 Tagen</div></div>
      <div class="kachel${z.offeneHaken ? " gold" : ""}"><div class="wert">${z.offeneHaken}</div><div class="name">mit offenen Haken (14 Tage)</div></div>
      <div class="kachel${z.ohneErgebnis ? " rot" : ""}"><div class="wert">${z.ohneErgebnis}</div><div class="name">ohne Ergebnis</div></div>
    </div>${warn}
    <div class="karte">
      <div class="karte-kopf"><div class="tabs">${tabs}<span class="trenner"></span>${arten}</div>
        <div class="knopfreihe"><a class="knopf" href="#pruefungen?gross=1">Großansicht für die Küche</a><button class="knopf haupt" id="pNeu" type="button">+ Prüfung planen</button></div></div>
      ${legende}
      ${tabellen || `<p class="leer">${ansicht === "kommend" ? "Keine kommenden Prüfungen geplant." : "Noch keine vergangenen Prüfungen."}</p>`}
    </div>`;
}
function bindePruefungen(ziel) {
  const neu = ziel.querySelector("#pNeu");
  if (neu) neu.addEventListener("click", () => pruefungDialog(null));
  ziel.querySelectorAll("[data-haken]").forEach((b) => b.addEventListener("click", () => setzeHaken(b.dataset.id, b.dataset.haken)));
  ziel.querySelectorAll("[data-pbearb]").forEach((b) => b.addEventListener("click", () => pruefungDialog(b.dataset.pbearb)));
  ziel.querySelectorAll("[data-ergebnis]").forEach((b) => b.addEventListener("click", () => ergebnisDialog(b.dataset.ergebnis)));
}
window.addEventListener("hashchange", () => { if (aktuellerBereich().id !== "pruefungen") document.body.classList.remove("kiosk"); });
async function speicherePruefung(id, werte) {
  werte.aktualisiert_am = new Date().toISOString();
  const res = await supa.from("pruefungstermine").update(werte).eq("id", id).select("*");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return null; }
  const i = S.pruefungstermine.findIndex((x) => x.id === id);
  if (i >= 0) S.pruefungstermine[i] = res.data[0];
  return res.data[0];
}
async function setzeHaken(id, feld) {
  const p = S.pruefungstermine.find((x) => x.id === id);
  if (!p) return;
  if (await speicherePruefung(id, { [feld]: !p[feld] })) zeichne();
}
// Praxisprüfung mit Fahrlehrer und Uhrzeit steht als Termin auch in dessen Kalender (2 UE, wie jede Prüfung)
function kalenderZeile(p) {
  const ende = Math.min(KR.hm2min(p.von) + 90, 23 * 60 + 59);
  const bis = KR.pad2(Math.floor(ende / 60)) + ":" + KR.pad2(ende % 60);
  return {
    fahrschule_id: S.fsId, fahrlehrer_id: p.fahrlehrer_id, schueler_id: p.schueler_id, datum: p.datum, von: p.von, bis,
    art: "pruefung", status: "geplant", geloescht: false, payload: { note: "Praxisprüfung (vom Büro geplant)" }, aktualisiert_am: new Date().toISOString(),
  };
}
async function abgleichKalender(p) {
  const soll = p.art === "praxis" && p.fahrlehrer_id && p.von && p.status !== "abgesagt";
  try {
    if (p.kalender_termin_id && !soll) {
      pruefe(await supa.from("kalender_termine").update({ geloescht: true, aktualisiert_am: new Date().toISOString() }).eq("id", p.kalender_termin_id), "Kalender");
      await speicherePruefung(p.id, { kalender_termin_id: null });
    } else if (p.kalender_termin_id && soll) {
      pruefe(await supa.from("kalender_termine").update(kalenderZeile(p)).eq("id", p.kalender_termin_id), "Kalender");
    } else if (soll) {
      const tid = "pt" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
      pruefe(await supa.from("kalender_termine").insert(Object.assign({ id: tid, erstellt_von: S.user.id }, kalenderZeile(p))), "Kalender");
      await speicherePruefung(p.id, { kalender_termin_id: tid });
    }
  } catch (e) {
    console.error(e);
    toast("Prüfung gespeichert, aber nicht im Kalender des Fahrlehrers: " + e.message, true);
  }
}
function schuelerOptionen(gewaehlt) {
  return S.schueler.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), "de"))
    .map((s) => `<option value="${esc(s.id)}"${s.id === gewaehlt ? " selected" : ""}>${esc(s.name)}${s.fahrlehrer_id ? " · " + esc(lehrerName(s.fahrlehrer_id)) : ""}</option>`).join("");
}
function lehrerOptionen(gewaehlt) {
  return `<option value="">– kein Fahrlehrer –</option>` + S.lehrer.map((l) => `<option value="${esc(l.id)}"${l.id === gewaehlt ? " selected" : ""}>${esc(l.name || l.email)}</option>`).join("");
}
function pruefungDialog(id) {
  const p = id ? S.pruefungstermine.find((x) => x.id === id) : { art: "praxis", datum: KR.addDaysISO(KR.todayISO(), 7), status: "geplant" };
  if (!p) return;
  const body = `<div class="formular">
      <label class="voll">Schüler<select name="schueler_id" required>${id ? "" : '<option value="">– bitte wählen –</option>'}${schuelerOptionen(p.schueler_id)}</select></label>
      <label>Art<select name="art"><option value="praxis"${p.art === "praxis" ? " selected" : ""}>Praxisprüfung</option><option value="theorie"${p.art === "theorie" ? " selected" : ""}>Theorieprüfung</option></select></label>
      <label>Klasse<select name="klasse"><option value="">–</option>${KLASSEN.map((k) => `<option${p.klasse === k ? " selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>Datum<input type="date" name="datum" required value="${esc(p.datum || "")}"></label>
      <label>Uhrzeit<input type="time" name="von" value="${esc(p.von || "")}"></label>
      <label>Fahrlehrer<select name="fahrlehrer_id">${lehrerOptionen(p.fahrlehrer_id)}</select></label>
      <label>Prüfer (nur Initialen)<input type="text" name="pruefer" maxlength="10" value="${esc(p.pruefer || "")}"></label>
      <fieldset class="voll"><legend>Haken</legend>${HAKEN.map(([k, , t]) => `<label class="wahl"><input type="checkbox" name="${k}"${p[k] ? " checked" : ""}> ${t}</label>`).join("")}</fieldset>
      <label class="voll">Notiz<input type="text" name="notiz" maxlength="200" value="${esc(p.notiz || "")}"></label>
      ${id && p.status === "geplant" ? `<label class="voll wahl"><input type="checkbox" name="absagen"> Prüfung absagen</label>` : ""}
    </div>
    <p class="leise klein">Praxisprüfungen mit Fahrlehrer und Uhrzeit erscheinen automatisch im Kalender des Fahrlehrers.</p>`;
  const dlg = oeffneDialog(id ? "Prüfung bearbeiten" : "Prüfung planen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.schueler_id) { toast("Bitte einen Schüler wählen.", true); return false; }
    if (!d.datum) { toast("Bitte ein Datum eintragen.", true); return false; }
    const werte = {
      schueler_id: d.schueler_id, art: d.art, klasse: d.klasse || null, datum: d.datum, von: d.von || null,
      fahrlehrer_id: d.fahrlehrer_id || null, pruefer: (d.pruefer || "").trim() || null, notiz: (d.notiz || "").trim() || null,
      entgelt_bezahlt: !!d.entgelt_bezahlt, tuev_gutschein: !!d.tuev_gutschein, as_portal: !!d.as_portal,
    };
    if (d.absagen) werte.status = "abgesagt";
    let gespeichert;
    if (id) gespeichert = await speicherePruefung(id, werte);
    else {
      const res = await supa.from("pruefungstermine").insert(Object.assign({ fahrschule_id: S.fsId, status: "geplant" }, werte)).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      gespeichert = res.data[0];
      S.pruefungstermine.push(gespeichert);
    }
    if (!gespeichert) return false;
    await abgleichKalender(gespeichert);
    toast(d.absagen ? "Prüfung abgesagt" : "Prüfung gespeichert");
    zeichne();
    return true;
  });
  // Neuer Schüler gewählt: Fahrlehrer und Klasse vom Schüler vorschlagen
  const sel = dlg.querySelector("select[name=schueler_id]");
  sel.addEventListener("change", () => {
    const s = S.schueler.find((x) => x.id === sel.value);
    if (!s) return;
    if (s.fahrlehrer_id) dlg.querySelector("select[name=fahrlehrer_id]").value = s.fahrlehrer_id;
    if (s.klasse) dlg.querySelector("select[name=klasse]").value = s.klasse;
  });
}
function ergebnisDialog(id) {
  const p = S.pruefungstermine.find((x) => x.id === id);
  if (!p) return;
  const s = S.schueler.find((x) => x.id === p.schueler_id) || {};
  const body = `<p>${p.art === "praxis" ? "Praxisprüfung" : "Theorieprüfung"} von <b>${esc(s.name || "")}</b> am ${esc(datumDE(p.datum))}.</p>
    <div class="formular"><fieldset class="voll"><legend>Ergebnis</legend>
      <label class="wahl"><input type="radio" name="ergebnis" value="bestanden"> bestanden</label>
      <label class="wahl"><input type="radio" name="ergebnis" value="nicht_bestanden"> nicht bestanden</label>
    </fieldset></div>
    <p class="leise klein">${p.art === "theorie" ? "Bei „bestanden“ wird das Datum beim Schüler eingetragen: Ab dann hat er 12 Monate für die Praxisprüfung." : "Bei „bestanden“ entfällt die Reaktivierung für diesen Schüler."}</p>`;
  oeffneDialog("Ergebnis eintragen", body, async (form) => {
    const e = new FormData(form).get("ergebnis");
    if (!e) { toast("Bitte bestanden oder nicht bestanden wählen.", true); return false; }
    if (!(await speicherePruefung(id, { status: e }))) return false;
    if (e === "bestanden" && s.id) {
      if (p.art === "theorie") await speichereSchueler(s.id, { theorie_bestanden_am: p.datum }, "Ergebnis gespeichert");
      else await speichereSchueler(s.id, { reakt_status: "befreit", reakt_notiz: `Praxisprüfung bestanden am ${datumDE(p.datum)}` }, "Glückwunsch! Ergebnis gespeichert.");
    } else { toast("Ergebnis gespeichert"); zeichne(); }
    return true;
  }, "Speichern");
}

/* ---------- Schüler ---------- */
function paketName(id) { const p = S.pakete.find((x) => x.id === id); return p ? p.name : ""; }
function neueSchuelerId() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function renderSchueler() {
  const lehrerFilter = fristenParam("lehrer");
  const suche = (fristenParam("suche") || "").toLowerCase();
  let liste = S.schueler.slice();
  if (lehrerFilter === "ohne") liste = liste.filter((x) => !x.fahrlehrer_id);
  else if (lehrerFilter) liste = liste.filter((x) => x.fahrlehrer_id === lehrerFilter);
  if (suche) liste = liste.filter((x) => (x.name || "").toLowerCase().includes(suche) || (x.telefon || "").replace(/\s/g, "").includes(suche.replace(/\s/g, "")));
  liste.sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
  const heute = KR.todayISO();
  const naechster = {};
  for (const t of S.termine) if (t.datum >= heute && t.schueler_id && (!naechster[t.schueler_id] || t.datum < naechster[t.schueler_id])) naechster[t.schueler_id] = t.datum;
  const zeilen = liste.map((x) => {
    const r = KR.reaktInfo(x, heute);
    const [rf, rt] = REAKT_TEXT[r.stufe];
    return `<tr>
      <td><b>${esc(x.name)}</b><div class="unter">${esc(x.telefon || "")}${x.email ? " · " + esc(x.email) : ""}</div></td>
      <td>${x.fahrlehrer_id ? esc(lehrerName(x.fahrlehrer_id)) : '<span class="marke-pill rot">ohne Fahrlehrer</span>'}</td>
      <td>${esc(x.klasse || (x.ausbildung && x.ausbildung.form) || "")}<div class="unter">${esc(AUSBILDUNGSARTEN[x.ausbildungsart] || "Neu")}${x.paket_id ? " · " + esc(paketName(x.paket_id)) : ""}</div></td>
      <td class="nur-breit">${naechster[x.id] ? esc(datumDE(naechster[x.id])) : '<span class="leise">–</span>'}</td>
      <td><span class="marke-pill ${rf}">${rt}</span></td>
      <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" data-sbearb="${esc(x.id)}" type="button">Bearbeiten</button></div></td>
    </tr>`;
  }).join("");
  const lehrerOpt = `<option value="">Alle Fahrlehrer</option><option value="ohne"${lehrerFilter === "ohne" ? " selected" : ""}>Ohne Fahrlehrer</option>` +
    S.lehrer.map((l) => `<option value="${esc(l.id)}"${l.id === lehrerFilter ? " selected" : ""}>${esc(l.name || l.email)}</option>`).join("");
  return `<div class="karte">
    <div class="karte-kopf">
      <div class="knopfreihe"><select class="suche" id="sLehrer" aria-label="Fahrlehrer filtern">${lehrerOpt}</select>
        <input type="search" class="suche" id="sSuche" placeholder="Name oder Telefon suchen" value="${esc(fristenParam("suche"))}" aria-label="Schüler suchen"></div>
      <button class="knopf haupt" id="sNeu" type="button">+ Schüler anlegen</button>
    </div>
    <p class="leise klein">${liste.length} von ${S.schueler.length} Schülern</p>
    ${liste.length ? `<table class="tabelle"><thead><tr><th>Schüler</th><th>Fahrlehrer</th><th>Klasse</th><th class="nur-breit">Nächster Termin</th><th>Reaktivierung</th><th></th></tr></thead><tbody>${zeilen}</tbody></table>` : `<p class="leer">Keine Schüler gefunden.</p>`}
  </div>`;
}
function setzeFilter(bereich, werte) {
  const p = new URLSearchParams((location.hash.split("?")[1]) || "");
  for (const [k, v] of Object.entries(werte)) { if (v) p.set(k, v); else p.delete(k); }
  const q = p.toString();
  history.replaceState(null, "", "#" + bereich + (q ? "?" + q : ""));
  zeichne();
}
function bindeSchueler(ziel) {
  ziel.querySelector("#sNeu").addEventListener("click", () => schuelerDialog(null));
  ziel.querySelector("#sLehrer").addEventListener("change", (e) => setzeFilter("schueler", { lehrer: e.target.value }));
  const su = ziel.querySelector("#sSuche");
  let t = null;
  su.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { setzeFilter("schueler", { suche: su.value }); const n = $("sSuche"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250);
  });
  ziel.querySelectorAll("[data-sbearb]").forEach((b) => b.addEventListener("click", () => schuelerDialog(b.dataset.sbearb)));
}
function schuelerDialog(id) {
  const x = id ? S.schueler.find((y) => y.id === id) : { ausbildungsart: "neu", klasse: "B", vertrag_am: KR.todayISO() };
  if (!x) return;
  const body = `<div class="formular">
      <label class="voll">Name<input type="text" name="name" required maxlength="100" value="${esc(x.name || "")}"></label>
      <label>Telefon (Login für die Fahr-Akademie)<input type="tel" name="telefon" maxlength="40" value="${esc(x.telefon || "")}"></label>
      <label>E-Mail<input type="email" name="email" maxlength="200" value="${esc(x.email || "")}"></label>
      <label>Fahrlehrer<select name="fahrlehrer_id">${lehrerOptionen(x.fahrlehrer_id)}</select></label>
      <label>Paket<select name="paket_id"><option value="">– ohne Paket –</option>${S.pakete.map((p) => `<option value="${esc(p.id)}"${p.id === x.paket_id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      <label>Ausbildungsart<select name="ausbildungsart">${Object.entries(AUSBILDUNGSARTEN).map(([k, v]) => `<option value="${k}"${(x.ausbildungsart || "neu") === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Klasse<select name="klasse"><option value="">–</option>${KLASSEN.map((k) => `<option${x.klasse === k ? " selected" : ""}>${k}</option>`).join("")}</select></label>
      <label>Vertrag abgeschlossen am<input type="date" name="vertrag_am" value="${esc(x.vertrag_am || "")}"></label>
      <label class="voll">Büro-Notiz<input type="text" name="buero_notiz" maxlength="500" value="${esc(x.buero_notiz || "")}"></label>
      <label class="voll">Büro-To-do<input type="text" name="buero_todo" maxlength="500" value="${esc(x.buero_todo || "")}"></label>
    </div>
    <p class="leise klein">Umschreiber brauchen keine Sonderfahrten. Ein neuer Schüler mit Fahrlehrer erscheint innerhalb einer Minute in dessen App.</p>`;
  oeffneDialog(id ? `Schüler: ${x.name}` : "Schüler anlegen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    const name = (d.name || "").trim();
    if (!name) { toast("Bitte einen Namen eintragen.", true); return false; }
    const doppelt = d.telefon && S.schueler.find((y) => y.id !== id && y.telefon && y.telefon.replace(/\D/g, "").slice(-9) === d.telefon.replace(/\D/g, "").slice(-9));
    if (doppelt && !id && !(await bestaetige("Telefonnummer gibt es schon", `${doppelt.name} hat dieselbe Telefonnummer. Trotzdem neu anlegen?`, "Ja, anlegen"))) return false;
    const werte = {
      name, telefon: (d.telefon || "").trim() || null, email: (d.email || "").trim() || null,
      paket_id: d.paket_id || null, ausbildungsart: d.ausbildungsart || "neu", klasse: d.klasse || null, vertrag_am: d.vertrag_am || null,
      buero_notiz: (d.buero_notiz || "").trim() || null, buero_todo: (d.buero_todo || "").trim() || null,
    };
    const neuerLehrer = d.fahrlehrer_id || null;
    if (!id) {
      const neueId = neueSchuelerId();
      const zeile = Object.assign({ id: neueId, fahrschule_id: S.fsId, fahrlehrer_id: neuerLehrer, status: "aktiv", erstellt_von: S.user.id,
        ausbildung: { form: ["B197", "BE"].includes(werte.klasse) ? werte.klasse : "B", umschreiber: werte.ausbildungsart === "umschreibung" } }, werte);
      const res = await supa.from("schueler").insert(zeile).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht angelegt: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      S.schueler.push(res.data[0]);
      toast(`${name} angelegt${neuerLehrer ? " und " + lehrerName(neuerLehrer) + " zugeordnet" : " (noch ohne Fahrlehrer)"}`);
      zeichne();
      return true;
    }
    // Umschreiber-Merkmal auch im Ausbildungsstand setzen, damit die Fahrlehrer-App Sonderfahrten weglässt
    const ausb = Object.assign({}, x.ausbildung || {});
    if ((werte.ausbildungsart === "umschreibung") !== !!ausb.umschreiber) { ausb.umschreiber = werte.ausbildungsart === "umschreibung"; werte.ausbildung = ausb; }
    if (!(await speichereSchueler(id, werte, "Gespeichert"))) return false;
    if ((x.fahrlehrer_id || null) !== neuerLehrer) await verschiebeSchueler(x, neuerLehrer);
    return true;
  });
}
// Wie schuelerVerschieben in index.html: erst künftige Termine (auf Wunsch), dann Schüler, dann Übergabe-Eintrag
async function verschiebeSchueler(x, neuerLehrer) {
  const alter = x.fahrlehrer_id || null;
  const heute = KR.todayISO();
  if (alter && neuerLehrer) {
    const kuenftig = S.termine.filter((t) => t.schueler_id === x.id && t.fahrlehrer_id === alter && t.datum >= heute);
    if (kuenftig.length && await bestaetige("Künftige Termine mitnehmen?", `${kuenftig.length} künftige Termine von ${x.name} liegen noch bei ${lehrerName(alter)}. Zu ${lehrerName(neuerLehrer)} übertragen?`, "Ja, übertragen")) {
      const res = await supa.from("kalender_termine").update({ fahrlehrer_id: neuerLehrer, aktualisiert_am: new Date().toISOString() }).in("id", kuenftig.map((t) => t.id)).select("id");
      if (res.error) toast("Termine nicht übertragen: " + res.error.message, true);
      else kuenftig.forEach((t) => { t.fahrlehrer_id = neuerLehrer; });
    }
  }
  if (!(await speichereSchueler(x.id, { fahrlehrer_id: neuerLehrer }, neuerLehrer ? `${x.name} ist jetzt bei ${lehrerName(neuerLehrer)}` : `${x.name} ist jetzt ohne Fahrlehrer`))) return;
  const v = await supa.from("schueler_verschiebungen").insert({ schueler_id: x.id, von_fahrlehrer_id: alter, zu_fahrlehrer_id: neuerLehrer, verschoben_von: S.user.id, fahrschule_id: S.fsId });
  if (v.error) console.warn("Verschiebung nicht protokolliert:", v.error.message);
}

/* ---------- Kalender (Tag, eine Spalte pro Fahrlehrer) ---------- */
const K_START = 7 * 60, K_ENDE = 21 * 60, K_PX = 1.15; // Pixel pro Minute
const K_FARBEN = { fahrstunde: "#3a7350", nacht: "#5a7da8", sonder: "#5a7da8", pruefung: "#c9a227", theorie: "#9b7dc4", schalt: "#c4607d", block: "#88939a", vortest: "#d68a3e", simulator: "#3ea6a0", beratung: "#7a8fd6", ersthilfe: "#d65a5a" };
function renderKalender() {
  const tag = fristenParam("tag") || KR.todayISO();
  const gewaehlt = (fristenParam("lehrer") || "").split(",").filter(Boolean);
  const lehrer = gewaehlt.length ? S.lehrer.filter((l) => gewaehlt.includes(l.id)) : S.lehrer;
  const termine = S.termine.filter((t) => t.datum === tag);
  const stunden = [];
  for (let m = K_START; m < K_ENDE; m += 60) stunden.push(`<div class="k-stunde" style="top:${(m - K_START) * K_PX}px">${KR.pad2(m / 60)}:00</div>`);
  const hoehe = (K_ENDE - K_START) * K_PX;
  const spalten = lehrer.map((l) => {
    const eigene = termine.filter((t) => t.fahrlehrer_id === l.id && t.von && t.bis);
    const bloecke = eigene.map((t) => {
      const a = Math.max(KR.hm2min(t.von), K_START), b = Math.min(KR.hm2min(t.bis), K_ENDE);
      if (b <= a) return "";
      const sn = schuelerName(t.schueler_id) || t.interessent_name || (t.payload && t.payload.note) || ARTEN[t.art] || "";
      const gesperrt = t.schueler_id && KR.reaktInfo(S.schueler.find((x) => x.id === t.schueler_id) || {}).gesperrt;
      return `<button type="button" class="k-termin${t.art === "block" ? " block" : ""}${gesperrt ? " gesperrt" : ""}" data-termin="${esc(t.id)}" style="top:${(a - K_START) * K_PX}px;height:${Math.max((b - a) * K_PX - 2, 22)}px;--farbe:${K_FARBEN[t.art] || "#3a7350"}">
        <span class="k-zeit">${esc(t.von)}–${esc(t.bis)}</span><span class="k-name">${gesperrt ? "⚠ " : ""}${esc(sn)}</span>${t.fahrzeug ? `<span class="k-fz">${esc(t.fahrzeug)}</span>` : ""}</button>`;
    }).join("");
    return `<div class="k-spalte"><div class="k-kopf"><span class="k-lname">${esc(l.name || l.email)}</span><span class="k-anz">${eigene.filter((t) => t.art !== "block").length} Termine</span></div>
      <div class="k-flaeche" data-lehrer="${esc(l.id)}" style="height:${hoehe}px">${bloecke}</div></div>`;
  }).join("");
  const wtag = KR.parseISO(tag).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const chips = S.lehrer.map((l) => `<label class="chip"><input type="checkbox" data-klehrer="${esc(l.id)}"${!gewaehlt.length || gewaehlt.includes(l.id) ? " checked" : ""}> ${esc(l.name || l.email)}</label>`).join("");
  return `<div class="karte">
    <div class="karte-kopf">
      <div class="knopfreihe"><button class="knopf" data-ktag="${KR.addDaysISO(tag, -1)}" type="button" aria-label="Vortag">←</button>
        <button class="knopf" data-ktag="${KR.todayISO()}" type="button">Heute</button>
        <button class="knopf" data-ktag="${KR.addDaysISO(tag, 1)}" type="button" aria-label="Nächster Tag">→</button>
        <input type="date" class="suche" id="kDatum" value="${esc(tag)}" aria-label="Datum wählen"></div>
      <h2 class="k-titel">${esc(wtag)}</h2>
    </div>
    <div class="chips">${chips}</div>
    <p class="leise klein">In eine freie Stelle klicken, um einen Termin anzulegen. Auf einen Termin klicken, um ihn zu verschieben oder abzusagen.</p>
    <div class="kalender"><div class="k-achse" style="height:${hoehe}px">${stunden.join("")}</div><div class="k-spalten" style="--spalten:${Math.max(lehrer.length, 1)}">${spalten || '<p class="leer">Kein Fahrlehrer gewählt.</p>'}</div></div>
  </div>`;
}
function bindeKalender(ziel) {
  ziel.querySelectorAll("[data-ktag]").forEach((b) => b.addEventListener("click", () => setzeFilter("kalender", { tag: b.dataset.ktag })));
  ziel.querySelector("#kDatum").addEventListener("change", (e) => e.target.value && setzeFilter("kalender", { tag: e.target.value }));
  ziel.querySelectorAll("[data-klehrer]").forEach((c) => c.addEventListener("change", () => {
    const an = [...ziel.querySelectorAll("[data-klehrer]")].filter((x) => x.checked).map((x) => x.dataset.klehrer);
    setzeFilter("kalender", { lehrer: an.length === S.lehrer.length ? "" : (an.join(",") || "keiner") });
  }));
  ziel.querySelectorAll("[data-termin]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); terminDialog(b.dataset.termin); }));
  ziel.querySelectorAll(".k-flaeche").forEach((f) => f.addEventListener("click", (e) => {
    if (e.target !== f) return;
    const y = e.clientY - f.getBoundingClientRect().top;
    const min = Math.round((K_START + y / K_PX) / 15) * 15;
    terminDialog(null, { fahrlehrer_id: f.dataset.lehrer, datum: fristenParam("tag") || KR.todayISO(), von: KR.pad2(Math.floor(min / 60)) + ":" + KR.pad2(min % 60) });
  }));
}
function plusMinuten(hm, n) { const m = Math.min(KR.hm2min(hm) + n, 23 * 60 + 59); return KR.pad2(Math.floor(m / 60)) + ":" + KR.pad2(m % 60); }
function terminDialog(id, vorgabe) {
  const t = id ? S.termine.find((x) => x.id === id) : Object.assign({ art: "fahrstunde" }, vorgabe, { bis: plusMinuten(vorgabe.von, 90) });
  if (!t) return;
  const fahrzeuge = S.fahrzeuge.map((f) => f.bezeichnung || f.name || "").filter(Boolean);
  const body = `<div class="formular">
      <label class="voll">Schüler<select name="schueler_id"><option value="">– ohne Schüler –</option>${schuelerOptionen(t.schueler_id)}</select></label>
      <label>Art<select name="art">${Object.entries(ARTEN).map(([k, v]) => `<option value="${k}"${t.art === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Fahrlehrer<select name="fahrlehrer_id" required>${S.lehrer.map((l) => `<option value="${esc(l.id)}"${l.id === t.fahrlehrer_id ? " selected" : ""}>${esc(l.name || l.email)}</option>`).join("")}</select></label>
      <label>Datum<input type="date" name="datum" required value="${esc(t.datum || "")}"></label>
      <label>Fahrzeug<select name="fahrzeug"><option value="">–</option>${fahrzeuge.map((f) => `<option${t.fahrzeug === f ? " selected" : ""}>${esc(f)}</option>`).join("")}</select></label>
      <label>Von<input type="time" name="von" required value="${esc(t.von || "")}"></label>
      <label>Bis<input type="time" name="bis" required value="${esc(t.bis || "")}"></label>
      ${id ? `<label class="voll wahl"><input type="checkbox" name="absagen"> Termin absagen (löschen)</label>` : ""}
    </div>
    <p class="leise klein">Der Fahrlehrer sieht die Änderung innerhalb einer Minute in seiner App.${id && t.payload && t.payload.onlineBookingId ? " Online gebuchte Termine: Der Schüler bekommt eine E-Mail." : ""}</p>`;
  oeffneDialog(id ? "Termin bearbeiten" : "Termin anlegen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.fahrlehrer_id || !d.datum || !d.von || !d.bis) { toast("Bitte Fahrlehrer, Datum und Uhrzeit eintragen.", true); return false; }
    if (KR.hm2min(d.bis) <= KR.hm2min(d.von)) { toast("„Bis“ muss nach „Von“ liegen.", true); return false; }
    const jetzt = new Date().toISOString();
    if (d.absagen) {
      if (!(await bestaetige("Termin absagen?", "Der Termin wird gelöscht und verschwindet beim Fahrlehrer.", "Ja, absagen"))) return false;
      const res = await supa.from("kalender_termine").update({ geloescht: true, aktualisiert_am: jetzt }).eq("id", id).select("id");
      if (res.error || !res.data || !res.data.length) { toast("Nicht abgesagt: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      S.termine = S.termine.filter((x) => x.id !== id);
      onlineBuchungMelden(id, "cancelled");
      toast("Termin abgesagt"); zeichne(); return true;
    }
    // Überschneidung beim selben Fahrlehrer warnen
    const kollision = S.termine.find((x) => x.id !== id && x.fahrlehrer_id === d.fahrlehrer_id && x.datum === d.datum && x.von && x.bis
      && KR.hm2min(x.von) < KR.hm2min(d.bis) && KR.hm2min(x.bis) > KR.hm2min(d.von));
    if (kollision && !(await bestaetige("Zeit ist schon belegt", `${lehrerName(d.fahrlehrer_id)} hat um ${kollision.von}–${kollision.bis} schon einen Termin. Trotzdem speichern?`, "Trotzdem speichern"))) return false;
    const werte = { schueler_id: d.schueler_id || null, art: d.art, fahrlehrer_id: d.fahrlehrer_id, datum: d.datum, von: d.von, bis: d.bis, fahrzeug: d.fahrzeug || null, aktualisiert_am: jetzt };
    if (id) {
      const res = await supa.from("kalender_termine").update(werte).eq("id", id).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      const zeitGeaendert = d.datum !== t.datum || d.von !== t.von || d.bis !== t.bis;
      Object.assign(t, res.data[0]);
      if (zeitGeaendert) onlineBuchungMelden(id, "changed", { new_date: d.datum, new_von: d.von, new_bis: d.bis });
    } else {
      const zeile = Object.assign({ id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fahrschule_id: S.fsId, status: "geplant", geloescht: false, payload: {}, erstellt_von: S.user.id }, werte);
      const res = await supa.from("kalender_termine").insert(zeile).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht angelegt: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      S.termine.push(res.data[0]);
    }
    toast("Termin gespeichert"); zeichne(); return true;
  });
}
// Online gebuchte Termine: Schüler per E-Mail informieren (wie in index.html, läuft im Hintergrund)
async function onlineBuchungMelden(lessonId, type, zeit) {
  try {
    const { data } = await supa.from("public_bookings").select("id, lc_termin_id, art").eq("merged_lesson_id", lessonId).eq("status", "bestaetigt").maybeSingle();
    if (!data) return;
    if (data.art || data.lc_termin_id) { toast("Hinweis: Termin stammt aus Auda/Google-Kalender, bitte dort ebenfalls ändern."); return; }
    const { data: sd } = await supa.auth.getSession();
    const token = sd && sd.session && sd.session.access_token;
    if (!token) return;
    fetch(SUPA_URL + "/functions/v1/public-booking?action=teacher_update", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(Object.assign({ merged_lesson_id: lessonId, type }, zeit || {})),
    }).catch(() => {});
  } catch (e) { /* Benachrichtigung ist Zusatz, die Änderung selbst ist gespeichert */ }
}

/* ---------- Dialoge ---------- */
function oeffneDialog(titel, inhalt, speichern, knopfText) {
  const dlg = document.createElement("dialog");
  dlg.className = "dialog";
  dlg.innerHTML = `<form method="dialog" class="dialog-form">
      <header><h2>${esc(titel)}</h2><button class="knopf klein" value="abbrechen" type="submit" aria-label="Schließen">✕</button></header>
      <div class="dialog-inhalt">${inhalt}</div>
      <footer><button class="knopf" value="abbrechen" type="submit">Abbrechen</button><button class="knopf haupt" value="ok" type="submit">${esc(knopfText || "Speichern")}</button></footer>
    </form>`;
  document.body.appendChild(dlg);
  const form = dlg.querySelector("form");
  form.addEventListener("submit", async (e) => {
    const wert = e.submitter && e.submitter.value;
    if (wert !== "ok") return; // Abbrechen schließt
    e.preventDefault();
    const knopf = e.submitter; knopf.disabled = true;
    try { if ((await speichern(form)) !== false) dlg.close(); } finally { knopf.disabled = false; }
  });
  dlg.addEventListener("close", () => dlg.remove());
  dlg.showModal();
  const erstes = dlg.querySelector(".dialog-inhalt input, .dialog-inhalt select");
  if (erstes) erstes.focus();
  return dlg;
}
function bestaetige(titel, text, jaText) {
  return new Promise((ok) => {
    let ergebnis = false;
    const dlg = oeffneDialog(titel, `<p>${esc(text)}</p>`, () => { ergebnis = true; }, jaText || "Ja");
    dlg.addEventListener("close", () => ok(ergebnis));
  });
}

/* ---------- Daten ---------- */
async function ladeDaten() {
  const nr = ++S.ladeNr;
  const fsId = S.fsId;
  setStatus("", "lade …");
  try {
    const [fs, lehrer, schueler, termine, pruefungen, fahrzeuge, pakete, pTermine] = await Promise.all([
      supa.from("fahrschulen").select("*").eq("id", fsId).single(),
      supa.from("profiles").select("*").eq("fahrschule_id", fsId).in("rolle", ["fahrlehrer", "super_admin"]).order("name"),
      supa.from("schueler").select("*").eq("fahrschule_id", fsId).neq("status", "geloescht").order("name"),
      supa.from("kalender_termine").select("*").eq("fahrschule_id", fsId).eq("geloescht", false),
      supa.from("kalender_pruefungen").select("*").eq("fahrschule_id", fsId).eq("geloescht", false),
      supa.from("fahrschule_fahrzeuge").select("*").eq("fahrschule_id", fsId).eq("aktiv", true).order("erstellt_am"),
      supa.from("fahrschule_pakete").select("*").eq("fahrschule_id", fsId),
      supa.from("pruefungstermine").select("*").eq("fahrschule_id", fsId).gte("datum", KR.addDaysISO(KR.todayISO(), -120)).order("datum").order("von"),
    ]);
    if (nr !== S.ladeNr) return; // inzwischen wurde neu geladen oder die Fahrschule gewechselt
    S.fs = pruefe(fs, "Fahrschule");
    S.lehrer = pruefe(lehrer, "Fahrlehrer") || [];
    S.schueler = pruefe(schueler, "Schüler") || [];
    S.termine = pruefe(termine, "Termine") || [];
    S.pruefungen = pruefe(pruefungen, "Prüfungen") || [];
    S.fahrzeuge = pruefe(fahrzeuge, "Fahrzeuge") || [];
    S.pakete = pruefe(pakete, "Pakete") || [];
    S.pruefungstermine = pruefe(pTermine, "Prüfungstafel") || [];
    S.geladenAm = new Date();
    $("schulName").textContent = S.fs ? S.fs.name : "";
    setStatus("ok", "verbunden · " + S.geladenAm.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    zeichne();
  } catch (e) {
    if (nr !== S.ladeNr) return;
    console.error(e);
    setStatus("fehler", "keine Verbindung");
    toast("Daten konnten nicht geladen werden. Bitte Internet prüfen und „Aktualisieren“ drücken.", true);
    zeichne();
  }
}

/* ---------- Anmeldung ---------- */
function zeigeNur(id) {
  for (const x of ["login", "hinweis", "app"]) $(x).hidden = x !== id;
}
function zeigeHinweis(titel, text, knoepfe) {
  $("hinweisTitel").textContent = titel;
  $("hinweisText").textContent = text;
  $("hinweisKnoepfe").innerHTML = knoepfe || `<button class="knopf haupt" type="button" data-abmelden>Abmelden</button>`;
  zeigeNur("hinweis");
}
async function abmelden() {
  try { await supa.auth.signOut(); } catch (e) { /* trotzdem neu laden */ }
  location.hash = "";
  location.reload();
}
document.addEventListener("click", (e) => { if (e.target.closest("[data-abmelden]")) abmelden(); });

async function starte(user) {
  S.user = user;
  let profil;
  try {
    profil = pruefe(await supa.from("profiles").select("*").eq("id", user.id).single(), "Profil");
  } catch (e) {
    console.error(e);
    zeigeHinweis("Keine Verbindung", "Das Profil konnte nicht geladen werden. Bitte Internet prüfen und die Seite neu laden.",
      `<button class="knopf haupt" type="button" onclick="location.reload()">Neu laden</button>`);
    return;
  }
  S.profil = profil;
  if (!profil || profil.aktiv === false) {
    zeigeHinweis("Zugang gesperrt", "Dein Zugang ist aktuell gesperrt. Bitte wende dich an die Fahrschul-Leitung oder an Serband.");
    return;
  }
  if (!ROLLEN[profil.rolle]) {
    zeigeHinweis("Nur für das Büro", "Diese Seite ist für Büro und Fahrschul-Leitung. Als Fahrlehrer arbeitest du in der Kompass-App.",
      `<a class="knopf haupt" href="index.html">Zur Kompass-App</a><button class="knopf" type="button" data-abmelden>Abmelden</button>`);
    return;
  }
  if (profil.agb_akzeptiert_version !== AGB_VERSION) {
    zeigeHinweis("Nutzungsbedingungen", "Bitte melde dich einmal in der Kompass-App an und bestätige dort die Nutzungsbedingungen. Danach funktioniert auch die Büro-Seite.",
      `<a class="knopf haupt" href="index.html">Zur Kompass-App</a><button class="knopf" type="button" data-abmelden>Abmelden</button>`);
    return;
  }
  // Fahrschule wählen: Büro und Leitung immer die eigene; Super-Admin kann wechseln
  if (profil.rolle === "super_admin") {
    try {
      S.schulen = pruefe(await supa.from("fahrschulen").select("id,name,aktiv").order("name"), "Fahrschulen") || [];
    } catch (e) { console.error(e); S.schulen = []; }
    let gemerkt = null;
    try { gemerkt = localStorage.getItem("buero-fahrschule"); } catch (e) { /* ohne Speicher weiter */ }
    S.fsId = (S.schulen.find((s) => s.id === gemerkt) || S.schulen.find((s) => s.id === profil.fahrschule_id) || S.schulen[0] || {}).id || profil.fahrschule_id;
    $("schulWahl").innerHTML = S.schulen.map((s) => `<option value="${esc(s.id)}"${s.id === S.fsId ? " selected" : ""}>${esc(s.name)}${s.aktiv === false ? " (gesperrt)" : ""}</option>`).join("");
    $("schulWahlWrap").hidden = S.schulen.length < 2;
  } else {
    S.fsId = profil.fahrschule_id;
    if (!S.fsId) { zeigeHinweis("Keine Fahrschule", "Deinem Zugang ist keine Fahrschule zugeordnet. Bitte wende dich an Serband."); return; }
    const fsRow = (await supa.from("fahrschulen").select("aktiv,name").eq("id", S.fsId).maybeSingle()).data;
    if (fsRow && fsRow.aktiv === false) {
      zeigeHinweis("Fahrschule deaktiviert", `${fsRow.name || "Diese Fahrschule"} ist aktuell deaktiviert. Bitte wende dich an die Fahrschul-Leitung.`);
      return;
    }
  }
  $("nutzerName").textContent = profil.name || user.email;
  $("nutzerRolle").textContent = ROLLEN[profil.rolle];
  zeigeNur("app");
  zeichne();
  await ladeDaten();
  setInterval(() => { if (!document.hidden) ladeDaten(); }, NEU_LADEN_MS);
}

$("schulWahl").addEventListener("change", (e) => {
  S.fsId = e.target.value;
  try { localStorage.setItem("buero-fahrschule", S.fsId); } catch (err) { /* egal */ }
  S.geladenAm = null;
  zeichne();
  ladeDaten();
});
$("abmelden").addEventListener("click", abmelden);
$("neuLaden").addEventListener("click", () => ladeDaten());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && S.geladenAm && Date.now() - S.geladenAm.getTime() > NEU_LADEN_MS) ladeDaten();
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const knopf = $("loginKnopf");
  $("loginFehler").textContent = "";
  knopf.disabled = true; knopf.textContent = "Anmelden …";
  const { data, error } = await supa.auth.signInWithPassword({ email: $("loginMail").value.trim(), password: $("loginPw").value });
  knopf.disabled = false; knopf.textContent = "Anmelden";
  if (error) {
    $("loginFehler").textContent = /invalid/i.test(error.message) ? "E-Mail oder Passwort stimmt nicht." : "Anmeldung fehlgeschlagen: " + error.message;
    return;
  }
  starte(data.user);
});

(async function init() {
  const { data } = await supa.auth.getSession();
  if (data && data.session && data.session.user) starte(data.session.user);
  else zeigeNur("login");
})();
