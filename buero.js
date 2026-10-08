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
  lehrer: [], schueler: [], termine: [], pruefungen: [], fahrzeuge: [], pakete: [],
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
  { id: "pruefungen", titel: "Prüfungstafel", gruppe: "Arbeit", schritt: 2 },
  { id: "fahrchecks", titel: "Fahrchecks", gruppe: "Arbeit", schritt: 4 },
  { id: "fristen", titel: "Fristen & Reaktivierung", gruppe: "Arbeit", render: renderFristen, nachher: bindeFristen, zahl: () => zaehleFristen().handeln || "" },
  { id: "kalender", titel: "Kalender", gruppe: "Planung", schritt: 3 },
  { id: "schueler", titel: "Schüler", gruppe: "Planung", schritt: 3 },
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
    const [fs, lehrer, schueler, termine, pruefungen, fahrzeuge, pakete] = await Promise.all([
      supa.from("fahrschulen").select("*").eq("id", fsId).single(),
      supa.from("profiles").select("*").eq("fahrschule_id", fsId).in("rolle", ["fahrlehrer", "super_admin"]).order("name"),
      supa.from("schueler").select("*").eq("fahrschule_id", fsId).neq("status", "geloescht").order("name"),
      supa.from("kalender_termine").select("*").eq("fahrschule_id", fsId).eq("geloescht", false),
      supa.from("kalender_pruefungen").select("*").eq("fahrschule_id", fsId).eq("geloescht", false),
      supa.from("fahrschule_fahrzeuge").select("*").eq("fahrschule_id", fsId).eq("aktiv", true).order("erstellt_am"),
      supa.from("fahrschule_pakete").select("*").eq("fahrschule_id", fsId),
    ]);
    if (nr !== S.ladeNr) return; // inzwischen wurde neu geladen oder die Fahrschule gewechselt
    S.fs = pruefe(fs, "Fahrschule");
    S.lehrer = pruefe(lehrer, "Fahrlehrer") || [];
    S.schueler = pruefe(schueler, "Schüler") || [];
    S.termine = pruefe(termine, "Termine") || [];
    S.pruefungen = pruefe(pruefungen, "Prüfungen") || [];
    S.fahrzeuge = pruefe(fahrzeuge, "Fahrzeuge") || [];
    S.pakete = pruefe(pakete, "Pakete") || [];
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
