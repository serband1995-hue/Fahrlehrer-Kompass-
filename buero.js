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

// Gemeinsamer Büro-Zugang: Jede Anfrage an die Datenbank trägt den Namen der Person, die gerade bedient
// (Kopfzeile x-buero-bearbeiter). Die Datenbank schreibt ihn ins Änderungsprotokoll und in die Fahrcheck-Quittungen.
function bueroFetch(url, opts) {
  const o = Object.assign({}, opts || {});
  if (S.wer && String(url).includes("/rest/v1/")) { const h = new Headers(o.headers || {}); h.set("x-buero-bearbeiter", S.wer); o.headers = h; }
  return fetch(url, o);
}
const supa = window.supabase.createClient(SUPA_URL, SUPA_KEY, { global: { fetch: (url, opts) => bueroFetch(url, opts) } });
const S = {
  user: null, profil: null, fsId: null, fs: null, schulen: [],
  lehrer: [], team: [], schueler: [], termine: [], pruefungen: [], pruefungstermine: [], fcAbgaben: [], verkaeufe: [], provisionen: [], fahrzeuge: [], pakete: [],
  geladenAm: null, ladeNr: 0, wer: "", notizen: [], gelesen: [], aufgaben: []
};

/* ---------- Hilfen ---------- */
const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
// ISO-Datum (2026-10-08) → 08.10.2026; ein schon deutsches Datum (10.08.2026) bleibt, wie es ist
function datumDE(iso) {
  if (!iso) return "";
  const t = String(iso).trim();
  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(t)) return t;
  const m = t.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : t;
}
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
  { id: "heute", titel: "Heute zu tun", gruppe: "Arbeit", render: renderHeute, nachher: bindeHeute, zahl: () => heuteAufgaben().length || "" },
  { id: "pruefungen", titel: "Prüfungstafel", gruppe: "Arbeit", render: renderPruefungen, nachher: bindePruefungen, zahl: () => zaehlePruefungen().handeln || "" },
  { id: "fahrchecks", titel: "Fahrchecks", gruppe: "Arbeit", render: renderFahrchecks, nachher: bindeFahrchecks, zahl: () => fcOffeneAbgaben().length || "" },
  { id: "fristen", titel: "Fristen & Reaktivierung", gruppe: "Arbeit", render: renderFristen, nachher: bindeFristen, zahl: () => zaehleFristen().handeln || "" },
  { id: "kalender", titel: "Kalender", gruppe: "Planung", render: renderKalender, nachher: bindeKalender },
  { id: "auslastung", titel: "Auslastung", gruppe: "Planung", render: renderAuslastung },
  { id: "schueler", titel: "Schüler", gruppe: "Planung", render: renderSchueler, nachher: bindeSchueler, zahl: () => aktiveSchueler().filter((x) => !x.fahrlehrer_id).length || "" },
  { id: "verkaeufe", titel: "Verkäufe & Provision", gruppe: "Geld", render: renderVerkaeufe, nachher: bindeVerkaeufe, zahl: () => S.verkaeufe.filter((v) => v.status === "empfohlen").length || "" },
  { id: "zahlen", titel: "Zahlen", gruppe: "Geld", render: renderZahlen, nachher: bindeZahlen },
  { id: "team", titel: "Fahrlehrer & Zugänge", gruppe: "Verwaltung", render: renderTeam, nachher: bindeTeam },
  { id: "flotte", titel: "Fahrzeuge", gruppe: "Verwaltung", render: renderFlotte, nachher: bindeFlotte, zahl: () => fahrzeugKonflikte().length || "" },
];
function aktuellerBereich() {
  const id = (location.hash || "#heute").slice(1).split("?")[0];
  return BEREICHE.find((b) => b.id === id) || BEREICHE[0];
}
// Gruppen der Seitenleiste lassen sich auf- und zuklappen; wer eine Seite in einer zugeklappten Gruppe öffnet, sieht sie wieder offen
function navZu() {
  try { return JSON.parse(localStorage.getItem("buero-nav-zu") || "[]"); } catch (e) { return []; }
}
function setzeNavZu(liste) {
  try { localStorage.setItem("buero-nav-zu", JSON.stringify(liste)); } catch (e) { /* ohne Speicher weiter */ }
}
function zeichneNav() {
  const aktiv = aktuellerBereich();
  const zu = navZu();
  const gruppen = [...new Set(BEREICHE.map((b) => b.gruppe))];
  $("nav").innerHTML = gruppen.map((g) => {
    const punkte = BEREICHE.filter((b) => b.gruppe === g);
    const offen = !zu.includes(g);
    const summe = punkte.reduce((a, b) => a + (b.render && b.zahl && S.geladenAm ? Number(b.zahl()) || 0 : 0), 0);
    const liste = punkte.map((b) => {
      const z = b.render && b.zahl && S.geladenAm ? b.zahl() : "";
      const zusatz = b.render ? (z ? `<span class="zahl">${z}</span>` : "") : `<span class="bald">im Bau</span>`;
      return `<a class="nav-punkt" href="#${b.id}"${b.id === aktiv.id ? ' aria-current="page"' : ""}>${esc(b.titel)}${zusatz}</a>`;
    }).join("");
    return `<div class="nav-block"><button type="button" class="nav-gruppe" data-gruppe="${esc(g)}" aria-expanded="${offen ? "true" : "false"}"><span class="pfeil" aria-hidden="true"></span>${esc(g)}${!offen && summe ? `<span class="zahl klein">${summe}</span>` : ""}</button>
      <div class="nav-liste"${offen ? "" : " hidden"}>${liste}</div></div>`;
  }).join("");
}
document.addEventListener("click", (e) => {
  const knopf = e.target.closest("[data-gruppe]");
  if (!knopf) return;
  const g = knopf.dataset.gruppe;
  const zu = navZu();
  setzeNavZu(zu.includes(g) ? zu.filter((x) => x !== g) : zu.concat(g));
  zeichneNav();
  const neu = [...document.querySelectorAll("[data-gruppe]")].find((b) => b.dataset.gruppe === g);
  if (neu) neu.focus();
});
function zeichne() {
  wartIndex = null; // Warteliste neu rechnen (Termine können sich geändert haben)
  const b = aktuellerBereich();
  $("titel").textContent = b.titel;
  document.body.dataset.bereich = b.id;
  $("drucken").hidden = b.id === "team"; // Zugangsliste wird nicht gedruckt
  document.title = b.titel + " · Kompass Büro";
  zeichneNav();
  const ziel = $("ansicht");
  if (!S.geladenAm) { ziel.innerHTML = `<p class="leer">Daten werden geladen …</p>`; return; }
  ziel.innerHTML = b.render ? b.render() : renderBald(b);
  if (b.nachher) b.nachher(ziel);
}
window.addEventListener("hashchange", () => {
  const g = aktuellerBereich().gruppe;
  if (navZu().includes(g)) setzeNavZu(navZu().filter((x) => x !== g));
  zeichne(); $("ansicht").focus({ preventScroll: true }); window.scrollTo(0, 0);
});

function renderBald(b) {
  return `<div class="karte"><h2>${esc(b.titel)}</h2>
    <p class="leise">Dieser Bereich wird gerade gebaut. Bis dahin funktioniert alles wie gewohnt in der Kompass-App unter „Admin-Gesamtübersicht“.</p></div>`;
}

/* ---------- Heute ---------- */
function renderHeute() {
  const heute = KR.todayISO();
  const anzahlAktiv = aktiveSchueler().length;
  const ohneLehrer = aktiveSchueler().filter((s) => !s.fahrlehrer_id).length;
  const termineHeute = S.termine
    .filter((t) => t.datum === heute && t.art !== "block")
    .sort((a, b) => String(a.von || "").localeCompare(String(b.von || "")));
  const kacheln = `<div class="kacheln">
    <div class="kachel"><div class="wert">${zahlDE(anzahlAktiv)}</div><div class="name">aktive Schüler</div></div>
    <div class="kachel"><div class="wert">${zahlDE(S.lehrer.filter((l) => l.aktiv !== false).length)}</div><div class="name">Fahrlehrer</div></div>
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
  const fcOffen = fcOffeneAbgaben();
  if (fcOffen.length) aufgaben.push(`<a class="aufgabe gelb" href="#fahrchecks?z=vor"><b>${fcOffen.length}</b> Fahrcheck-Abgabe${fcOffen.length === 1 ? "" : "n"} für ${esc(datumDE(fcOffen[0].von))}–${esc(datumDE(fcOffen[0].bis))} noch nicht bestätigt</a>`);
  const neuVerk = S.verkaeufe.filter((v) => v.status === "empfohlen").length;
  if (neuVerk) aufgaben.push(`<a class="aufgabe" href="#verkaeufe"><b>${neuVerk}</b> neue Empfehlung${neuVerk === 1 ? "" : "en"} von Fahrlehrern (Akademie/Simulator): Zugang ausgeben, Zahlung eintragen</a>`);
  const ungelesen = S.notizen.filter((n) => !n.erledigt_am && !S.gelesen.some((g) => g.notiz_id === n.id) && aktiveSchueler().some((x) => x.id === n.schueler_id));
  if (ungelesen.length) aufgaben.push(`<a class="aufgabe gelb" href="#schueler?notiz=ungelesen"><b>${ungelesen.length}</b> Notiz${ungelesen.length === 1 ? "" : "en"} an Fahrlehrer noch nicht gelesen</a>`);
  const beiGesperrten = aktiveSchueler().filter((x) => x.fahrlehrer_id && (S.lehrer.find((l) => l.id === x.fahrlehrer_id) || {}).aktiv === false).length;
  if (beiGesperrten) aufgaben.push(`<a class="aufgabe rot" href="#schueler"><b>${beiGesperrten}</b> Schüler ${beiGesperrten === 1 ? "gehört" : "gehören"} zu einem gesperrten Fahrlehrer: neu zuweisen (Bereich „Auslastung“ zeigt, wer Platz hat)</a>`);
  if (f.antragAb) aufgaben.push(`<a class="aufgabe rot" href="#fristen?ansicht=antrag"><b>${f.antragAb}</b> ${f.antragAb === 1 ? "Führerscheinantrag" : "Führerscheinanträge"} abgelaufen: neu stellen</a>`);
  if (f.antragBald) aufgaben.push(`<a class="aufgabe gelb" href="#fristen?ansicht=antrag"><b>${f.antragBald}</b> ${f.antragBald === 1 ? "Führerscheinantrag läuft" : "Führerscheinanträge laufen"} in den nächsten 60 Tagen ab</a>`);
  if (f.ohneDatum) aufgaben.push(`<a class="aufgabe" href="#fristen?ansicht=ohne"><b>${f.ohneDatum}</b> Schüler ohne Vertragsdatum</a>`);
  const ha = heuteAufgaben();
  const heuteKarte = ha.length ? `<div class="karte"><div class="karte-kopf"><h2>Meine Aufgaben für heute (${ha.length})</h2></div><ul class="notizliste">${ha.map((a) => `<li class="notiz stopp">
      <div><button type="button" class="knopf klein" data-hagschueler="${esc(a.schueler_id)}">${esc(schuelerName(a.schueler_id) || "Schüler")}</button> <span class="notiz-text">${esc(a.text)}</span></div>
      <div class="unter">${esc(a.bearbeiter || "Büro")} · ${esc(notizZeit(a))}${a.faellig_am ? ` · fällig ${esc(datumDE(a.faellig_am))}` : ""}</div>
      <div class="notiz-aktion"><button type="button" class="knopf klein" data-hagerledigt="${esc(a.id)}">Erledigt</button></div></li>`).join("")}</ul></div>` : "";
  const todo = `<div class="karte"><div class="karte-kopf"><h2>Zu erledigen</h2></div>${aufgaben.length ? `<div class="aufgaben">${aufgaben.join("")}</div>` : `<p class="leer">Gerade ist nichts offen.</p>`}</div>`;
  return kacheln + heuteKarte + todo + liste;
}

/* ---------- Fristen & Reaktivierung ---------- */
const AUSBILDUNGSARTEN = { ersterwerb: "Ersterwerb", fahrschulwechsel: "Fahrschulwechsel", umschreibung: "Umschreibung", neuerteilung: "Neuerteilung", auffrischung: "Auffrischung", erweiterung: "Erweiterung" };
// Ältere Einträge heißen „neu“: gleich wie Ersterwerb behandeln
function artKey(v) { return !v || v === "neu" ? "ersterwerb" : v; }
function artName(v) { return AUSBILDUNGSARTEN[artKey(v)] || v; }
function artOptionen(gewaehlt) {
  return Object.entries(AUSBILDUNGSARTEN).map(([k, v]) => `<option value="${k}"${artKey(gewaehlt) === k ? " selected" : ""}>${v}</option>`).join("");
}
const KLASSEN = [["B", "B (Schalter)"], ["B78", "B78 (Automatik)"], ["B197", "B197 (Schaltkompetenz)"], ["BE", "BE"], ["B+BE", "B + BE"], ["C1", "C1"], ["C1E", "C1E"], ["C", "C"], ["CE", "CE"], ["BKF", "BKF"]];
function klassenOptionen(gewaehlt) {
  const liste = KLASSEN.slice();
  if (gewaehlt && !liste.some(([k]) => k === gewaehlt)) liste.push([gewaehlt, gewaehlt]);
  return `<option value="">–</option>` + liste.map(([k, n]) => `<option value="${esc(k)}"${gewaehlt === k ? " selected" : ""}>${esc(n)}</option>`).join("");
}
// Standardbetrag der Reaktivierung: 240 € (Kristina, 09.10.2026); einstellbar durch den Super-Admin, im Einzelfall je Zahlung änderbar
const REAKT_STANDARD = 240;
function reaktBetrag() {
  const k = (S.fs && S.fs.konfiguration) || {};
  return Number(k.reaktivierungBetrag) > 0 ? Number(k.reaktivierungBetrag) : REAKT_STANDARD;
}
// Wer im Büro bedient: Namen für „Wer bist du?“ (einstellbar durch den Super-Admin)
const PERSONEN_STANDARD = ["Jelena", "Murat", "Kristina", "Isra"];
function bueroPersonen() {
  const k = (S.fs && S.fs.konfiguration) || {};
  const l = Array.isArray(k.bueroPersonen) ? k.bueroPersonen.map((x) => String(x).trim()).filter(Boolean) : [];
  return l.length ? l : PERSONEN_STANDARD;
}
// Inaktive Schüler (z. B. bestanden): zählen nicht bei Fristen, Reaktivierung und Auswahllisten
function istAktiv(x) { return !x.inaktiv_seit; }
function aktiveSchueler() { return S.schueler.filter(istAktiv); }
/* Warteliste: Der Fahrlehrer hat „wartet auf Theorie“ oder „Praxis-Warteliste“ gesetzt und es gibt weder neue Fahrstunden noch einen
   Prüfungstermin. Wartende zählen nicht in der Auslastung. Die Regel steht in kompass-rechnen.js (wartetInfo), die App nutzt dieselbe. */
const WARTE_TEXT = { theorie: "wartet auf Theorie", nach_theorie: "Theorie bestanden, wartet auf Fahrstunden", praxis: "wartet auf Praxisprüfung" };
let wartIndex = null;
function wartDaten() {
  if (wartIndex) return wartIndex;
  const heute = KR.todayISO(), fahr = {}, pruef = {};
  for (const t of S.termine) {
    if (!t.schueler_id) continue;
    if (KR.FAHR_ARTEN.includes(t.art) && t.status !== "abgebrochen" && t.status !== "nicht erschienen") { if (!fahr[t.schueler_id] || t.datum > fahr[t.schueler_id]) fahr[t.schueler_id] = t.datum; }
    if (t.art === "pruefung" && t.datum >= heute && t.status !== "abgesagt") pruef[t.schueler_id] = true;
  }
  for (const p of S.pruefungstermine) if (p.art === "praxis" && p.datum >= heute && !["abgesagt", "bestanden", "nicht_bestanden"].includes(p.status)) pruef[p.schueler_id] = true;
  wartIndex = { fahr, pruef };
  return wartIndex;
}
function wartetArt(x) {
  if (!istAktiv(x)) return "";
  const d = wartDaten();
  return KR.wartetInfo(x.ausbildung || {}, { pruefungstermin: !!d.pruef[x.id], fahrstundeNach: (iso) => !!d.fahr[x.id] && d.fahr[x.id] > iso });
}
function arbeitendeSchueler() { return aktiveSchueler().filter((x) => !wartetArt(x)); }
function wartendeSchueler() { return aktiveSchueler().filter((x) => wartetArt(x)); }
function zaehleFristen() {
  const heute = KR.todayISO();
  const z = { gesperrt: 0, pruefen: 0, bald: 0, theorie: 0, ohneDatum: 0, handeln: 0, antragAb: 0, antragBald: 0 };
  for (const s of aktiveSchueler()) {
    const r = KR.reaktInfo(s, heute), t = KR.theorieInfo(s, heute);
    if (r.stufe === "gesperrt") z.gesperrt++;
    else if (r.stufe === "pruefen_faellig") z.pruefen++;
    else if (r.stufe === "bald") z.bald++;
    if (r.stufe === "ohne_datum") z.ohneDatum++;
    if (t.stufe === "abgelaufen" || t.stufe === "bald" || t.stufe === "demnaechst") z.theorie++;
    const a = KR.antragInfo(s, heute);
    if (a.stufe === "abgelaufen") z.antragAb++;
    else if (a.stufe === "bald") z.antragBald++;
  }
  z.handeln = z.gesperrt + z.pruefen + z.antragAb;
  return z;
}
const REAKT_TEXT = {
  gesperrt: ["rot", "überfällig · gesperrt"], pruefen_faellig: ["rot", "fällig · in CCD prüfen"], bald: ["gelb", "bald fällig"],
  demnaechst: ["blau", "in 60 Tagen"], ok: ["gruen", "bezahlt"], befreit: ["", "befreit"], ohne_datum: ["", "Vertragsdatum fehlt"]
};
// Stufe „ok“ heißt: nichts fällig; „bezahlt“ steht nur bei Schülern, deren Zahlung das Büro eingetragen hat
function reaktText(s, r) {
  if (r.stufe === "ok" && s.reakt_status !== "bezahlt") return ["gruen", "nichts fällig"];
  return REAKT_TEXT[r.stufe];
}
const THEORIE_TEXT = { abgelaufen: ["rot", "abgelaufen"], bald: ["gelb", "läuft bald ab"], demnaechst: ["blau", "in 60 Tagen"], ok: ["gruen", "gültig"], ohne_datum: ["", "–"] };
function fristenParam(name) {
  const m = location.hash.match(new RegExp("[?&]" + name + "=([^&]*)"));
  if (!m) return "";
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { return ""; } // URLSearchParams schreibt Leerzeichen als „+“; kaputte Adresse ignorieren
}
const FRISTEN_ANSICHTEN = [["handeln", "Handlungsbedarf"], ["alle", "Alle Schüler"], ["ohne", "Ohne Vertragsdatum"], ["theorie", "Theorie-Fristen"], ["antrag", "Führerscheinantrag"]];
const ANTRAG_TEXT = { abgelaufen: ["rot", "abgelaufen · neu stellen"], bald: ["gelb", "läuft bald ab"], ok: ["gruen", "gültig"], ohne_datum: ["", "Antragsdatum fehlt"] };
const REAKT_RANG = { gesperrt: 0, pruefen_faellig: 1, bald: 2, demnaechst: 3, ohne_datum: 4, ok: 5, befreit: 6 };
function renderFristen() {
  const heute = KR.todayISO();
  const ansicht = FRISTEN_ANSICHTEN.some(([id]) => id === fristenParam("ansicht")) ? fristenParam("ansicht") : "handeln";
  const suche = (fristenParam("suche") || "").trim().toLowerCase();
  const f = zaehleFristen();
  const kacheln = `<div class="kacheln">
    <div class="kachel${f.gesperrt ? " rot" : ""}"><div class="wert">${euro(f.gesperrt * reaktBetrag())}</div><div class="name">offen: ${f.gesperrt} Reaktivierung${f.gesperrt === 1 ? "" : "en"} überfällig</div></div>
    <div class="kachel${f.pruefen ? " rot" : ""}"><div class="wert">${f.pruefen}</div><div class="name">fällig, noch nicht geprüft</div></div>
    <div class="kachel${f.bald ? " gold" : ""}"><div class="wert">${f.bald}</div><div class="name">in 30 Tagen fällig</div></div>
    <div class="kachel"><div class="wert">${f.ohneDatum}</div><div class="name">ohne Vertragsdatum</div></div>
    <div class="kachel${f.antragAb ? " rot" : (f.antragBald ? " gold" : "")}"><div class="wert">${f.antragAb + f.antragBald}</div><div class="name">Führerscheinanträge abgelaufen oder bald (${f.antragAb} abgelaufen)</div></div>
  </div>`;
  let liste = aktiveSchueler().map((s) => ({ s, r: KR.reaktInfo(s, heute), t: KR.theorieInfo(s, heute), a: KR.antragInfo(s, heute) }));
  if (ansicht === "handeln") liste = liste.filter((x) => ["gesperrt", "pruefen_faellig", "bald"].includes(x.r.stufe) || ["abgelaufen", "bald"].includes(x.t.stufe) || x.a.stufe === "abgelaufen");
  const ohneAntrag = liste.filter((x) => x.a.stufe === "ohne_datum").length;
  if (ansicht === "antrag") liste = liste.filter((x) => x.a.stufe !== "ohne_datum");
  if (ansicht === "ohne") liste = liste.filter((x) => x.r.stufe === "ohne_datum");
  if (ansicht === "theorie") liste = liste.filter((x) => x.t.stufe !== "ohne_datum");
  if (suche) liste = liste.filter((x) => (x.s.name || "").toLowerCase().includes(suche) || (x.s.telefon || "").replace(/\s/g, "").includes(suche.replace(/\s/g, "")));
  const ANTRAG_RANG = { abgelaufen: 0, bald: 1, ok: 2, ohne_datum: 3 };
  if (ansicht === "theorie") liste.sort((a, b) => (a.t.tage ?? 99999) - (b.t.tage ?? 99999));
  else if (ansicht === "antrag") liste.sort((a, b) => (ANTRAG_RANG[a.a.stufe] - ANTRAG_RANG[b.a.stufe]) || ((a.a.tage ?? 99999) - (b.a.tage ?? 99999)) || String(a.s.name).localeCompare(String(b.s.name), "de"));
  else liste.sort((a, b) => (REAKT_RANG[a.r.stufe] - REAKT_RANG[b.r.stufe]) || ((a.r.tage ?? 99999) - (b.r.tage ?? 99999)) || String(a.s.name).localeCompare(String(b.s.name), "de"));
  const tabs = FRISTEN_ANSICHTEN.map(([id, name]) => `<a class="tab" href="#fristen?ansicht=${id}"${id === ansicht ? ' aria-current="page"' : ""}>${name}</a>`).join("");
  const antragZeilen = ansicht !== "antrag" ? "" : liste.map(({ s, a }) => {
    const [af, at] = ANTRAG_TEXT[a.stufe];
    return `<tr>
      <td><b>${esc(s.name)}</b><div class="unter">${esc(artName(s.ausbildungsart))}${s.klasse ? " · " + esc(s.klasse) : ""}</div><div class="unter nur-unter">${esc(lehrerName(s.fahrlehrer_id))}</div></td>
      <td class="nur-sehr-breit">${esc(lehrerName(s.fahrlehrer_id))}</td>
      <td class="zeitspalte">${s.antrag_am ? esc(datumDE(s.antrag_am)) : '<span class="leise">fehlt</span>'}</td>
      <td class="zeitspalte">${a.ablauf ? esc(datumDE(a.ablauf)) : "–"}${a.grund === "theorie" ? '<div class="unter">verlängert durch Theorie</div>' : ""}</td>
      <td><span class="marke-pill ${af}">${at}</span></td>
      <td class="aktionen"><div class="aktionen-box">${a.stufe === "abgelaufen" || a.stufe === "bald" ? `<button class="knopf klein haupt" data-antragneu="${esc(s.id)}" type="button">Neu eingereicht</button>` : ""}<button class="knopf klein" data-fristen="${esc(s.id)}" type="button">Bearbeiten</button></div></td>
    </tr>`;
  }).join("");
  const zeilen = liste.map(({ s, r, t, a }) => {
    const [rf, rt] = reaktText(s, r);
    const [tf, tt] = THEORIE_TEXT[t.stufe];
    const rDatum = r.faellig ? `<div class="unter">${r.tage < 0 ? "seit " + datumDE(r.faellig) : "am " + datumDE(r.faellig)}</div>` : "";
    const tDatum = t.ablauf ? `<div class="unter">${t.tage < 0 ? "seit " : "bis "}${datumDE(t.ablauf)}${t.grund === "praxis" ? " (Praxisprüfung)" : ""}</div>` : "";
    let zahlen = (r.stufe === "gesperrt" || r.stufe === "pruefen_faellig" || r.stufe === "bald")
      ? `<button class="knopf klein haupt" data-zahlung="${esc(s.id)}" type="button">${euro(reaktBetrag())} erhalten</button>` : "";
    if (r.stufe === "pruefen_faellig") zahlen += `<button class="knopf klein" data-nichtbezahlt="${esc(s.id)}" type="button">Nicht bezahlt</button>`;
    return `<tr>
      <td><b>${esc(s.name)}</b><div class="unter">${esc(artName(s.ausbildungsart))}${s.klasse ? " · " + esc(s.klasse) : ""}<span class="nur-schmal"> · Vertrag ${s.vertrag_am ? esc(datumDE(s.vertrag_am)) : "fehlt"}</span></div></td>
      <td>${esc(lehrerName(s.fahrlehrer_id))}</td>
      <td class="zeitspalte nur-breit">${s.vertrag_am ? esc(datumDE(s.vertrag_am)) : '<span class="leise">fehlt</span>'}</td>
      <td><span class="marke-pill ${rf}">${rt}</span>${rDatum}</td>
      <td><span class="marke-pill ${tf}">${tt}</span>${tDatum}${a.stufe === "abgelaufen" || a.stufe === "bald" ? `<div class="unter"><span class="marke-pill ${ANTRAG_TEXT[a.stufe][0]}">Antrag ${a.stufe === "abgelaufen" ? "abgelaufen" : "bis " + esc(datumDE(a.ablauf))}</span></div>` : ""}</td>
      <td class="aktionen"><div class="aktionen-box">${zahlen}<button class="knopf klein" data-fristen="${esc(s.id)}" type="button">Bearbeiten</button></div></td>
    </tr>`;
  }).join("");
  return kacheln + `<div class="karte">
    <div class="karte-kopf"><div class="tabs">${tabs}</div>
      <input type="search" class="suche" id="fristenSuche" placeholder="Name oder Telefon suchen" value="${esc(fristenParam("suche"))}" aria-label="Schüler suchen"></div>
    ${ansicht === "antrag" ? (liste.length ? `<table class="tabelle"><thead><tr><th>Schüler</th><th class="nur-sehr-breit">Fahrlehrer</th><th>Eingereicht</th><th>Gültig bis</th><th>Status</th><th></th></tr></thead><tbody>${antragZeilen}</tbody></table><p class="leise klein">Der Führerscheinantrag bei der Führerscheinstelle gilt 12 Monate. Nach bestandener Theorieprüfung gilt er 12 Monate ab dem Prüfungsdatum. Danach muss er neu gestellt werden: „Neu eingereicht“ setzt das heutige Datum. ${ohneAntrag} aktive Schüler haben noch kein Antragsdatum (im Fenster „Bearbeiten“ eintragen).</p>` : `<p class="leer">Keine Schüler.</p>`) : ""}
    ${ansicht === "antrag" ? "" : liste.length ? `<table class="tabelle"><thead><tr><th>Schüler</th><th>Fahrlehrer</th><th class="nur-breit">Vertrag</th><th>Reaktivierung</th><th>Theorie</th><th></th></tr></thead><tbody>${zeilen}</tbody></table>`
      : `<p class="leer">${ansicht === "handeln" ? "Kein Handlungsbedarf. Sehr gut." : "Keine Schüler in dieser Ansicht."}</p>`}
    <p class="leise klein">Reaktivierung: ${euro(reaktBetrag())}, fällig 12 Monate nach Vertragsabschluss und dann jährlich. „Gesperrt“ heißt: keine weiteren Leistungen, bis bezahlt ist. Jede Änderung wird mit Name und Uhrzeit protokolliert.</p>
  </div>${renderBueroEinstellungen()}`;
}
function renderBueroEinstellungen() {
  const k = (S.fs && S.fs.konfiguration) || {};
  const darf = S.profil && S.profil.rolle === "super_admin";
  return `<div class="karte nicht-drucken"><div class="karte-kopf"><h2>Einstellungen</h2></div>
    <form id="einstForm" class="formular">
      <label>Standardbetrag Reaktivierung in €<input type="number" name="betrag" min="1" max="9999" step="0.01" value="${esc(k.reaktivierungBetrag || REAKT_STANDARD)}"${darf ? "" : " disabled"}></label>
      <label>Unterrichtseinheiten pro Fahrlehrer und Woche (12 pro Tag × 5 Tage)<input type="number" name="ue" min="1" max="200" step="1" value="${esc(ueProWoche())}"${darf ? "" : " disabled"}></label>
      <label>Namen für „Wer bist du?“ (mit Komma trennen)<input type="text" name="personen" maxlength="200" value="${esc(bueroPersonen().join(", "))}"${darf ? "" : " disabled"}></label>
      <div class="voll knopfreihe">${darf ? `<button class="knopf haupt" type="submit">Einstellungen speichern</button>` : `<span class="leise klein">Diese Einstellungen ändert der Super-Admin. Eine abweichende Zahlung (z. B. Sonderangebot) trägst du direkt beim Eintragen der Zahlung ein.</span>`}</div>
    </form></div>`;
}
function bindeEinstellungen(ziel) {
  const f = ziel.querySelector("#einstForm");
  if (!f || f.betrag.disabled) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const betrag = Number(String(f.betrag.value).replace(",", "."));
    const personen = f.personen.value.split(",").map((x) => x.trim()).filter(Boolean);
    if (!(betrag > 0) || !personen.length) { toast("Bitte Betrag und mindestens einen Namen eintragen.", true); return; }
    const ue = Number(f.ue.value);
    if (!(ue >= 1)) { toast("Bitte die Unterrichtseinheiten pro Woche eintragen.", true); return; }
    const neu = Object.assign({}, (S.fs && S.fs.konfiguration) || {}, { reaktivierungBetrag: betrag, bueroPersonen: personen, ueProWoche: ue });
    const res = await supa.from("fahrschulen").update({ konfiguration: neu }).eq("id", S.fsId).select("id");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return; }
    S.fs.konfiguration = neu;
    toast("Einstellungen gespeichert");
    zeichne();
  });
}
function bindeFristen(ziel) {
  bindeEinstellungen(ziel);
  const suche = ziel.querySelector("#fristenSuche");
  if (suche) {
    let t = null;
    suche.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const ansicht = FRISTEN_ANSICHTEN.some(([id]) => id === fristenParam("ansicht")) ? fristenParam("ansicht") : "handeln";
        history.replaceState(null, "", `#fristen?ansicht=${ansicht}${suche.value ? "&suche=" + encodeURIComponent(suche.value) : ""}`);
        zeichne();
        const neu = $("fristenSuche"); if (neu) { neu.focus(); neu.setSelectionRange(neu.value.length, neu.value.length); }
      }, 250);
    });
  }
  ziel.querySelectorAll("[data-zahlung]").forEach((b) => b.addEventListener("click", () => zahlungErhalten(b.dataset.zahlung)));
  ziel.querySelectorAll("[data-nichtbezahlt]").forEach((b) => b.addEventListener("click", () => nichtBezahlt(b.dataset.nichtbezahlt)));
  ziel.querySelectorAll("[data-fristen]").forEach((b) => b.addEventListener("click", () => fristenDialog(b.dataset.fristen)));
  ziel.querySelectorAll("[data-antragneu]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    if (!(await speichereSchueler(b.dataset.antragneu, { antrag_am: KR.todayISO() }, "Antrag als neu eingereicht eingetragen ✓"))) b.disabled = false;
  }));
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
  const personen = bueroPersonen();
  const body = `<p>Reaktivierung von <b>${esc(s.name)}</b>. Die nächste ist dann am <b>${esc(datumDE(neu))}</b> fällig. Bitte die Zahlung auch in ClickClickDrive vermerken.</p>
    <div class="formular">
      <label>Bezahlter Betrag in €<input type="number" name="betrag" min="0" max="9999" step="0.01" inputmode="decimal" required value="${reaktBetrag()}"></label>
      <label>Bezahlt am<input type="date" name="am" required value="${esc(KR.todayISO())}"></label>
      <label class="voll">Nach Absprache mit (nur nötig, wenn der Betrag vom Standard ${euro(reaktBetrag())} abweicht)
        <select name="absprache"><option value="">– keine Absprache –</option>${personen.map((n) => `<option>${esc(n)}</option>`).join("")}</select></label>
      <label class="voll">Notiz (z. B. Sonderangebot)<input type="text" name="notiz" maxlength="150"></label>
    </div>`;
  oeffneDialog(`Reaktivierung bezahlt: ${s.name}`, body, async (form) => {
    const betrag = Number(String(form.betrag.value).replace(",", "."));
    if (!isFinite(betrag) || betrag < 0) { toast("Bitte einen gültigen Betrag eintragen.", true); return false; }
    const abspr = form.absprache.value, notiz = form.notiz.value.trim();
    if (Math.abs(betrag - reaktBetrag()) > 0.005 && !abspr && !notiz) { toast(`Der Betrag weicht von ${euro(reaktBetrag())} ab. Bitte „Nach Absprache mit“ oder eine Notiz eintragen.`, true); return false; }
    const text = `Bezahlt ${euro(betrag)} am ${datumDE(form.am.value)}${abspr ? " · nach Absprache mit " + abspr : ""}${notiz ? " · " + notiz : ""}`;
    return speichereSchueler(id, { reakt_status: "bezahlt", reakt_bezahlt_bis: neu, reakt_betrag: betrag, reakt_notiz: text }, `Gespeichert. Nächste Reaktivierung am ${datumDE(neu)}.`);
  }, "Als bezahlt eintragen");
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
      <label>Ausbildungsart<select name="ausbildungsart">${artOptionen(s.ausbildungsart)}</select></label>
      <label>Klasse<select name="klasse">${klassenOptionen(s.klasse)}</select></label>
      <fieldset class="voll"><legend>Reaktivierung</legend>
        <label class="wahl"><input type="radio" name="reakt_status" value="pruefen"${(s.reakt_status || "pruefen") === "pruefen" ? " checked" : ""}> noch nicht geprüft</label>
        <label class="wahl"><input type="radio" name="reakt_status" value="bezahlt"${s.reakt_status === "bezahlt" ? " checked" : ""}> geprüft: bezahlt bis zur nächsten Fälligkeit</label>
        <label class="wahl"><input type="radio" name="reakt_status" value="befreit"${s.reakt_status === "befreit" ? " checked" : ""}> befreit (keine Reaktivierung)</label>
      </fieldset>
      <label>Nächste Reaktivierung fällig am (nur bei „bezahlt“)<input type="date" name="reakt_bezahlt_bis" value="${esc(s.reakt_bezahlt_bis || r.faellig || "")}"${s.reakt_status === "bezahlt" ? "" : " disabled"}></label>
      <label>Notiz (z. B. Grund für „befreit“)<input type="text" name="reakt_notiz" maxlength="200" value="${esc(s.reakt_notiz || "")}"></label>
      <label>Führerscheinantrag eingereicht am<span class="feld-mit-knopf"><input type="date" name="antrag_am" value="${esc(s.antrag_am || "")}"><button type="button" class="knopf klein" id="antragHeute">heute</button></span></label>
      <label>Theorieunterricht abgeschlossen am<input type="date" name="theorie_abgeschlossen_am" value="${esc(s.theorie_abgeschlossen_am || "")}"></label>
      <label>Theorieprüfung bestanden am<input type="date" name="theorie_bestanden_am" value="${esc(s.theorie_bestanden_am || "")}"></label>
    </div>
    <div class="protokoll" id="protokoll"><p class="leise klein">Verlauf wird geladen …</p></div>`;
  const fdlg = oeffneDialog(`Fristen: ${s.name}`, body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    const werte = {
      vertrag_am: d.vertrag_am || null,
      ausbildungsart: d.ausbildungsart || "ersterwerb",
      klasse: d.klasse || null,
      reakt_status: d.reakt_status || "pruefen",
      reakt_bezahlt_bis: d.reakt_status === "bezahlt" ? (d.reakt_bezahlt_bis || null) : (s.reakt_bezahlt_bis || null),
      reakt_notiz: (d.reakt_notiz || "").trim() || null,
      theorie_abgeschlossen_am: d.theorie_abgeschlossen_am || null,
      theorie_bestanden_am: d.theorie_bestanden_am || null,
      antrag_am: d.antrag_am || null,
    };
    if (werte.reakt_status === "bezahlt" && !werte.reakt_bezahlt_bis) { toast("Bitte das Datum der nächsten Fälligkeit eintragen.", true); return false; }
    if (werte.reakt_status === "befreit" && !werte.reakt_notiz) { toast("Bitte einen Grund für „befreit“ eintragen.", true); return false; }
    if (werte.theorie_bestanden_am && werte.theorie_abgeschlossen_am && werte.theorie_bestanden_am < werte.theorie_abgeschlossen_am) {
      toast("Die Theorieprüfung kann nicht vor dem Abschluss des Unterrichts liegen.", true); return false;
    }
    return speichereSchueler(id, werte);
  });
  fdlg.querySelector("#antragHeute").addEventListener("click", () => { fdlg.querySelector("input[name=antrag_am]").value = KR.todayISO(); });
  const faellig = fdlg.querySelector("input[name=reakt_bezahlt_bis]");
  fdlg.querySelectorAll("input[name=reakt_status]").forEach((r) => r.addEventListener("change", () => { faellig.disabled = r.value !== "bezahlt" || !r.checked; }));
  ladeProtokoll("schueler", id);
}
const FELD_NAMEN = { vertrag_am: "Vertragsdatum", klasse: "Klasse", ausbildungsart: "Ausbildungsart", reakt_status: "Reaktivierung", reakt_bezahlt_bis: "fällig am", reakt_notiz: "Notiz", theorie_abgeschlossen_am: "Theorie abgeschlossen", theorie_bestanden_am: "Theorieprüfung bestanden", antrag_am: "Führerscheinantrag eingereicht", reakt_betrag: "Reaktivierung bezahlt (€)", b197_testfahrt_am: "B197 Testfahrt abgegeben", inaktiv_seit: "Inaktiv seit" };
async function ladeProtokoll(tabelle, id) {
  const ziel = $("protokoll");
  const res = await supa.from("aenderungsprotokoll").select("*").eq("tabelle", tabelle).eq("datensatz_id", id).order("geaendert_am", { ascending: false }).limit(20);
  if (!ziel || !ziel.isConnected) return;
  if (res.error) { ziel.innerHTML = ""; return; }
  const zeilen = (res.data || []).map((p) => {
    const wer = p.bearbeiter || (S.lehrer.find((l) => l.id === p.geaendert_von) || {}).name || (p.geaendert_von === S.user.id ? "du" : "Büro");
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
const P_ANSICHTEN = [["kommend", "Kommende"], ["vergangen", "Vergangene"], ["alle", "Alle"]];
// Link innerhalb der Prüfungstafel; Suche, Datum und Sortierung bleiben beim Wechsel der Reiter erhalten
function pLink(aender) {
  const p = new URLSearchParams((location.hash.split("?")[1]) || "");
  p.delete("gross");
  for (const [k, v] of Object.entries(aender)) { if (v) p.set(k, v); else p.delete(k); }
  const q = p.toString();
  return "#pruefungen" + (q ? "?" + q : "");
}
function renderPruefungen() {
  const heute = KR.todayISO();
  const gross = fristenParam("gross") === "1";
  // Großansicht (Küche): immer nur die kommenden 14 Tage, alle Arten, ohne Suchfilter
  const ansicht = gross ? "kommend" : (P_ANSICHTEN.some(([id]) => id === fristenParam("ansicht")) ? fristenParam("ansicht") : "kommend");
  const art = gross ? "alle" : (["praxis", "theorie"].includes(fristenParam("art")) ? fristenParam("art") : "alle");
  const suche = (fristenParam("suche") || "").trim().toLowerCase();
  const datumOk = (d) => /^\d{4}-\d\d-\d\d$/.test(d) ? d : "";
  const vonF = datumOk(fristenParam("von")), bisF = datumOk(fristenParam("bis"));
  const sortierung = fristenParam("sort") === "auf" || fristenParam("sort") === "ab" ? fristenParam("sort") : (ansicht === "vergangen" ? "ab" : "auf");
  document.body.classList.toggle("kiosk", gross);
  let liste = S.pruefungstermine.slice();
  if (art !== "alle") liste = liste.filter((p) => p.art === art);
  const offen = liste.filter((p) => p.status === "geplant" && p.datum < heute);
  if (ansicht === "kommend") liste = liste.filter((p) => p.datum >= heute && p.status !== "abgesagt");
  else if (ansicht === "vergangen") liste = liste.filter((p) => p.datum < heute || p.status !== "geplant");
  if (!gross) {
    if (vonF) liste = liste.filter((p) => p.datum >= vonF);
    if (bisF) liste = liste.filter((p) => p.datum <= bisF);
    if (suche) liste = liste.filter((p) => {
      const s = S.schueler.find((x) => x.id === p.schueler_id) || {};
      return [s.name, p.fahrlehrer_id ? lehrerName(p.fahrlehrer_id) : "", p.notiz, p.klasse, datumDE(p.datum)].some((t) => String(t || "").toLowerCase().includes(suche));
    });
  }
  if (gross) liste = liste.filter((p) => p.datum <= KR.addDaysISO(heute, 13));
  liste.sort((a, b) => (a.datum + (a.von || "")).localeCompare(b.datum + (b.von || "")) * (sortierung === "ab" && !gross ? -1 : 1));
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
      <td><b>${esc(s.name || "(Schüler gelöscht)")}</b>${p.status !== "geplant" ? `<div class="nur-druck">${esc(sf === "gruen" ? "Ergebnis: " : "Status: ")}${esc(st)}</div>` : ""}${p.notiz ? `<div class="unter">${esc(p.notiz)}</div>` : ""}</td>
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
  const tabs = P_ANSICHTEN.map(([id, n]) => `<a class="tab" href="${pLink({ ansicht: id === "kommend" ? "" : id })}"${id === ansicht ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  const arten = [["alle", "Alle"], ["praxis", "Praxis"], ["theorie", "Theorie"]].map(([id, n]) => `<a class="tab" href="${pLink({ art: id === "alle" ? "" : id })}"${id === art ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  const filterAktiv = suche || vonF || bisF;
  const filterZeile = `<div class="filterzeile">
      <input type="search" class="suche" id="pSuche" placeholder="Name oder Datum suchen" value="${esc(fristenParam("suche"))}" aria-label="Prüfungen suchen">
      <label class="feld-klein">von <input type="date" class="suche" id="pVon" value="${esc(vonF)}"></label>
      <label class="feld-klein">bis <input type="date" class="suche" id="pBis" value="${esc(bisF)}"></label>
      <select class="suche" id="pSort" aria-label="Sortierung"><option value="auf"${sortierung === "auf" ? " selected" : ""}>Datum: älteste zuerst</option><option value="ab"${sortierung === "ab" ? " selected" : ""}>Datum: neueste zuerst</option></select>
      ${filterAktiv ? `<a class="knopf klein" href="${pLink({ suche: "", von: "", bis: "" })}">Filter löschen</a>` : ""}
    </div>`;
  const warn = offen.length && ansicht === "kommend" && !filterAktiv
    ? `<div class="karte warnkarte"><h2>${offen.length} Prüfung${offen.length === 1 ? "" : "en"} ohne Ergebnis</h2><table class="tabelle ptabelle"><colgroup><col class="c-zeit breit"><col class="c-art"><col><col class="c-lehrer"><col class="c-haken"><col class="c-akt"></colgroup><tbody>${offen.map((p) => zeile(p).replace("<td class=\"zeitspalte\">", `<td class="zeitspalte">${esc(datumDE(p.datum))} `)).join("")}</tbody></table></div>` : "";
  return `<div class="kacheln">
      <div class="kachel"><div class="wert">${z.woche}</div><div class="name">Prüfungen in den nächsten 7 Tagen</div></div>
      <div class="kachel${z.offeneHaken ? " gold" : ""}"><div class="wert">${z.offeneHaken}</div><div class="name">mit offenen Haken (14 Tage)</div></div>
      <div class="kachel${z.ohneErgebnis ? " rot" : ""}"><div class="wert">${z.ohneErgebnis}</div><div class="name">ohne Ergebnis</div></div>
    </div>${warn}
    <div class="karte">
      <div class="karte-kopf"><div class="tabs">${tabs}<span class="trenner"></span>${arten}</div>
        <div class="knopfreihe"><a class="knopf" href="#pruefungen?gross=1">Großansicht für die Küche</a><button class="knopf haupt" id="pNeu" type="button">+ Prüfung planen</button></div></div>
      ${filterZeile}
      ${legende}
      ${tabellen || `<p class="leer">${filterAktiv ? "Keine Prüfung passt zu dieser Suche." : (ansicht === "kommend" ? "Keine kommenden Prüfungen geplant." : "Noch keine Prüfungen in dieser Ansicht.")}</p>`}
    </div>`;
}
function bindePruefungen(ziel) {
  const ps = ziel.querySelector("#pSuche");
  if (ps) {
    let t = null;
    ps.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        setzeFilter("pruefungen", { suche: ps.value.trim() });
        const n = $("pSuche"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 250);
    });
    ziel.querySelector("#pVon").addEventListener("change", (e) => setzeFilter("pruefungen", { von: e.target.value }));
    ziel.querySelector("#pBis").addEventListener("change", (e) => setzeFilter("pruefungen", { bis: e.target.value }));
    ziel.querySelector("#pSort").addEventListener("change", (e) => setzeFilter("pruefungen", { sort: e.target.value }));
  }
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
  return S.schueler.filter((x) => istAktiv(x) || x.id === gewaehlt).sort((a, b) => String(a.name).localeCompare(String(b.name), "de"))
    .map((s) => `<option value="${esc(s.id)}"${s.id === gewaehlt ? " selected" : ""}>${esc(s.name)}${s.fahrlehrer_id ? " · " + esc(lehrerName(s.fahrlehrer_id)) : ""}</option>`).join("");
}
function lehrerOptionen(gewaehlt, mitAuslastung) {
  let l2 = S.lehrer.filter((l) => l.aktiv !== false || l.id === gewaehlt);
  if (mitAuslastung) { const rang = auslastungListe().map((x) => x.l.id); l2 = l2.slice().sort((a, b) => (rang.indexOf(a.id) + 1 || 999) - (rang.indexOf(b.id) + 1 || 999)); }
  return `<option value="">– kein Fahrlehrer –</option>` + l2.map((l) => `<option value="${esc(l.id)}"${l.id === gewaehlt ? " selected" : ""}>${esc(l.name || l.email)}${mitAuslastung ? esc(auslastungKurz(l.id)) : ""}</option>`).join("");
}
function pruefungDialog(id) {
  const p = id ? S.pruefungstermine.find((x) => x.id === id) : { art: "praxis", datum: KR.addDaysISO(KR.todayISO(), 7), status: "geplant" };
  if (!p) return;
  const body = `<div class="formular">
      <label class="voll">Schüler<select name="schueler_id" required>${id ? "" : '<option value="">– bitte wählen –</option>'}${schuelerOptionen(p.schueler_id)}</select></label>
      <label>Art<select name="art"><option value="praxis"${p.art === "praxis" ? " selected" : ""}>Praxisprüfung</option><option value="theorie"${p.art === "theorie" ? " selected" : ""}>Theorieprüfung</option></select></label>
      <label>Klasse<select name="klasse">${klassenOptionen(p.klasse)}</select></label>
      <label>Datum<input type="date" name="datum" required value="${esc(p.datum || "")}"></label>
      <label>Uhrzeit<input type="time" name="von" value="${esc(p.von || "")}"></label>
      <label>Fahrlehrer<select name="fahrlehrer_id">${lehrerOptionen(p.fahrlehrer_id)}</select></label>
      <label>Prüfer (nur Initialen)<input type="text" name="pruefer" maxlength="10" value="${esc(p.pruefer || "")}"></label>
      <fieldset class="voll"><legend>Haken</legend>${HAKEN.map(([k, , t]) => `<label class="wahl"><input type="checkbox" name="${k}"${p[k] ? " checked" : ""}> ${t}</label>`).join("")}</fieldset>
      <label class="voll">Notiz<input type="text" name="notiz" maxlength="200" value="${esc(p.notiz || "")}"></label>
      ${id && p.status === "geplant" ? `<label class="voll wahl"><input type="checkbox" name="absagen"> Prüfung absagen</label>` : ""}
      ${id && p.status !== "geplant" ? `<label class="voll">Ergebnis korrigieren<select name="status">${Object.entries(P_STATUS).map(([k, v]) => `<option value="${k}"${k === p.status ? " selected" : ""}>${v[1]}</option>`).join("")}</select></label>
        <p class="leise klein voll">Eine Korrektur ändert nur die Prüfungstafel. Reaktivierung und Theorie-Datum des Schülers bitte danach unter „Fristen“ prüfen.</p>` : ""}
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
    else if (id && d.status && d.status !== p.status) werte.status = d.status;
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
      else {
        await speichereSchueler(s.id, { reakt_status: "befreit", reakt_notiz: `Praxisprüfung bestanden am ${datumDE(p.datum)}` }, "Glückwunsch! Ergebnis gespeichert.");
        // Erst nach dem Schließen dieses Fensters fragen (sonst liegen zwei Fenster übereinander)
        if (istAktiv(s)) setTimeout(async () => {
          if (await bestaetige(`${s.name} ins Archiv legen?`, "Der Schüler hat bestanden. Archivierte Schüler stehen im Reiter „Archiv“, sind überall ausgeblendet und zählen nicht mehr bei Fristen, Reaktivierung und Auslastung. Du kannst das jederzeit rückgängig machen.", "Ja, ins Archiv")) {
            await speichereSchueler(s.id, { inaktiv_seit: KR.todayISO() }, `${s.name} liegt jetzt im Archiv.`);
          }
        }, 150);
      }
    } else { toast("Ergebnis gespeichert"); zeichne(); }
    return true;
  }, "Speichern");
}

/* ---------- Auslastung je Fahrlehrer ---------- */
// Regel (Serband/Kristina, 09.10.2026): 12 UE am Tag, 5 Tage = 60 UE pro Woche. „Voll“ ist ein Fahrlehrer erst, wenn er
// demselben Schüler in der Woche nicht mehr zwei Termine (je 90 Minuten) geben kann.
const UE_PRO_WOCHE_STANDARD = 60, UE_PRO_TAG = 12;
function ueProWoche() {
  const k = (S.fs && S.fs.konfiguration) || {};
  return Number(k.ueProWoche) > 0 ? Number(k.ueProWoche) : UE_PRO_WOCHE_STANDARD;
}
function montagVon(iso) { const wt = (KR.parseISO(iso).getDay() + 6) % 7; return KR.addDaysISO(iso, -wt); }
function auslastungWoche(lehrerId, montag) {
  const bis = KR.addDaysISO(montag, 6);
  let belegt = 0, gesperrt = 0;
  const blockTag = {};
  for (const t of S.termine) {
    if (t.fahrlehrer_id !== lehrerId || t.datum < montag || t.datum > bis || !t.von || !t.bis) continue;
    const ue = Math.max(KR.hm2min(t.bis) - KR.hm2min(t.von), 0) / 45;
    if (t.art === "block") { const wt = (KR.parseISO(t.datum).getDay() + 6) % 7; if (wt < 5) blockTag[t.datum] = (blockTag[t.datum] || 0) + ue; }
    else belegt += ue;
  }
  for (const d of Object.keys(blockTag)) gesperrt += Math.min(blockTag[d], UE_PRO_TAG); // je Tag höchstens 12 UE; nur Montag bis Freitag
  const kapazitaet = Math.max(ueProWoche() - gesperrt, 0);
  const frei = Math.max(kapazitaet - belegt, 0);
  const termine = Math.floor(frei / 2 + 1e-9); // freie 90-Minuten-Termine
  return {
    montag, belegt: Math.round(belegt * 10) / 10, kapazitaet: Math.round(kapazitaet * 10) / 10,
    pct: kapazitaet > 0 ? Math.round(belegt / kapazitaet * 100) : 100,
    freieTermine: termine, platz: Math.floor(termine / 2), voll: termine < 2,
  };
}
function auslastungListe() {
  const heute = KR.todayISO(), diese = montagVon(heute), naechste = KR.addDaysISO(diese, 7);
  const zahl = {};
  const wartet = {};
  for (const x of aktiveSchueler()) if (x.fahrlehrer_id) { if (wartetArt(x)) wartet[x.fahrlehrer_id] = (wartet[x.fahrlehrer_id] || 0) + 1; else zahl[x.fahrlehrer_id] = (zahl[x.fahrlehrer_id] || 0) + 1; }
  return S.lehrer.filter((l) => l.aktiv !== false).map((l) => ({ l, schueler: zahl[l.id] || 0, wartend: wartet[l.id] || 0, diese: auslastungWoche(l.id, diese), naechste: auslastungWoche(l.id, naechste) }))
    .sort((a, b) => (b.naechste.freieTermine - a.naechste.freieTermine) || (a.schueler - b.schueler));
}
function auslastungAmpel(w) {
  if (w.voll) return ["rot", "voll"];
  if (w.pct >= 80) return ["gelb", "fast voll"];
  return ["gruen", "hat Platz"];
}
function auslastungBalken(w) {
  const f = auslastungAmpel(w)[0];
  return `<span class="stand"><span class="stand-spur"><span class="stand-balken ausl-${f}" style="width:${Math.min(w.pct, 100)}%"></span></span><span class="stand-zahl">${w.pct} %</span></span>`;
}
// Kurztext für Auswahllisten („Fahrlehrer zuweisen“)
function auslastungKurz(lehrerId) {
  const x = auslastungListe().find((y) => y.l.id === lehrerId);
  if (!x) return "";
  return ` · nächste Woche ${x.naechste.pct} %${x.naechste.voll ? " (voll)" : `, Platz für ${x.naechste.platz}`}`;
}
function renderAuslastung() {
  const liste = auslastungListe();
  const heute = KR.todayISO(), diese = montagVon(heute), naechste = KR.addDaysISO(diese, 7);
  const ohne = aktiveSchueler().filter((x) => !x.fahrlehrer_id).length;
  const frei = liste.filter((x) => !x.naechste.voll);
  const empfehlung = frei.length
    ? `<div class="kachel gruen"><div class="wert">${esc(frei[0].l.name || frei[0].l.email)}</div><div class="name">Nächster Schüler zu: hat nächste Woche noch ${frei[0].naechste.freieTermine} freie Termine (Platz für ${frei[0].naechste.platz} neue Schüler)</div></div>`
    : `<div class="kachel rot"><div class="wert">Alle voll</div><div class="name">Kein Fahrlehrer hat nächste Woche zwei freie Termine</div></div>`;
  const zeilen = liste.map((x) => {
    const [af, at] = auslastungAmpel(x.naechste);
    return `<tr>
      <td><b>${esc(x.l.name || x.l.email)}</b><div class="unter">${x.schueler} aktive Schüler${x.wartend ? ` · ${x.wartend} auf der Warteliste (zählen nicht)` : ""}</div></td>
      <td>${auslastungBalken(x.diese)}<div class="unter">${x.diese.belegt} von ${x.diese.kapazitaet} UE</div></td>
      <td>${auslastungBalken(x.naechste)}<div class="unter">${x.naechste.belegt} von ${x.naechste.kapazitaet} UE</div></td>
      <td class="zahlspalte nur-sehr-breit">${x.naechste.freieTermine}</td>
      <td class="zahlspalte nur-sehr-breit">${x.naechste.platz}</td>
      <td><span class="marke-pill ${af}">${at}</span><div class="unter nur-unter">${x.naechste.freieTermine} freie Termine · Platz für ${x.naechste.platz}</div></td>
    </tr>`;
  }).join("");
  return `<div class="kacheln">
      <div class="kachel"><div class="wert">${liste.length}</div><div class="name">Fahrlehrer</div></div>
      ${empfehlung}
      <div class="kachel${ohne ? " rot" : ""}"><div class="wert">${ohne}</div><div class="name">Schüler ohne Fahrlehrer</div></div>
    </div>
    <div class="karte">
      <div class="karte-kopf"><h2>Wer hat noch Platz?</h2><a class="knopf" href="#schueler?lehrer=ohne">Schüler ohne Fahrlehrer zeigen</a></div>
      <table class="tabelle"><thead><tr><th>Fahrlehrer</th><th>Diese Woche<div class="th-unter">ab ${esc(datumDE(diese).slice(0, 6))}</div></th><th>Nächste Woche<div class="th-unter">ab ${esc(datumDE(naechste).slice(0, 6))}</div></th><th class="zahlspalte nur-sehr-breit">Freie Termine</th><th class="zahlspalte nur-sehr-breit">Platz für neue Schüler</th><th>Ergebnis</th></tr></thead><tbody>${zeilen || `<tr><td colspan="6" class="leer">Keine Fahrlehrer.</td></tr>`}</tbody></table>
      <p class="leise klein">So wird gerechnet: ${ueProWoche()} UE pro Woche (Standard: 12 UE am Tag, 5 Tage). Blockierte Zeiten (Montag bis Freitag, höchstens 12 UE am Tag) zählen nicht zur Kapazität. Ein Termin dauert 90 Minuten = 2 UE. <b>Voll</b> ist ein Fahrlehrer, wenn er einem Schüler nicht mehr zwei Termine in der Woche geben kann. Ein neuer Schüler braucht zwei Termine pro Woche. Schüler auf der Warteliste (wartet auf Theorie oder Praxisprüfung, ohne neue Fahrstunden oder Prüfungstermin) und archivierte Schüler werden nicht mitgezählt. Die Liste ist so sortiert, dass der Fahrlehrer mit den meisten freien Terminen oben steht.</p>
    </div>`;
}

/* ---------- Schüler ---------- */
const FARBTYP = { rot: ["Rot", "#D64534"], gelb: ["Gelb", "#E0A32E"], gruen: ["Grün", "#3FAE6B"], blau: ["Blau", "#2F7DD1"] };
function farbPunkt(a) {
  const f = a && FARBTYP[a.profil];
  return f ? `<span class="farbpunkt" style="background:${f[1]}" title="Farbprofil ${f[0]}" aria-label="Farbprofil ${f[0]}"></span>` : `<span class="farbpunkt ohne" title="kein Farbprofil"></span>`;
}
function standHTML(a) {
  const p = a && typeof a.standPct === "number" ? Math.max(0, Math.min(100, Math.round(a.standPct))) : null;
  if (p == null) return '<span class="leise">–</span>';
  return `<span class="stand"><span class="stand-spur"><span class="stand-balken" style="width:${p}%"></span></span><span class="stand-zahl">${p} %</span></span>`;
}
function paketName(id) { const p = S.pakete.find((x) => x.id === id); return p ? p.name : ""; }
function neueSchuelerId() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function renderSchueler() {
  const lehrerFilter = fristenParam("lehrer");
  const suche = (fristenParam("suche") || "").trim().toLowerCase();
  const sicht = ["inaktiv", "warte", "alle"].includes(fristenParam("sicht")) ? fristenParam("sicht") : "aktiv";
  const klasseF = fristenParam("klasse");
  const nWarte = wartendeSchueler().length, nAktiv = aktiveSchueler().length - nWarte, nInaktiv = S.schueler.length - aktiveSchueler().length;
  let liste = S.schueler.filter((x) => sicht === "alle" || (sicht === "inaktiv" ? !istAktiv(x) : sicht === "warte" ? !!wartetArt(x) : istAktiv(x) && !wartetArt(x)));
  if (klasseF) liste = liste.filter((x) => klasseVon(x) === klasseF);
  const notizF = ["offen", "ungelesen"].includes(fristenParam("notiz")) ? fristenParam("notiz") : "";
  if (notizF) liste = liste.filter((x) => { const o = offeneNotizen(x.id); return notizF === "offen" ? o.length > 0 : o.some((n) => !S.gelesen.some((g) => g.notiz_id === n.id)); });
  if (lehrerFilter === "ohne") liste = liste.filter((x) => !x.fahrlehrer_id);
  else if (lehrerFilter) liste = liste.filter((x) => x.fahrlehrer_id === lehrerFilter);
  if (suche) liste = liste.filter((x) => (x.name || "").toLowerCase().includes(suche) || (x.telefon || "").replace(/\s/g, "").includes(suche.replace(/\s/g, "")));
  liste.sort((a, b) => String(a.name).localeCompare(String(b.name), "de"));
  const heute = KR.todayISO();
  const naechster = {};
  for (const t of S.termine) if (t.datum >= heute && t.schueler_id && (!naechster[t.schueler_id] || t.datum < naechster[t.schueler_id])) naechster[t.schueler_id] = t.datum;
  const zeilen = liste.map((x) => {
    const r = KR.reaktInfo(x, heute);
    const [rf, rt] = reaktText(x, r);
    const a = x.ausbildung || {};
    const theo = typeof a.theoriePct === "number" ? Math.round(a.theoriePct) + " %" : "–";
    const b197 = x.klasse === "B197";
    const testfahrt = b197 ? (x.b197_testfahrt_am ? `<span class="marke-pill gruen">Testfahrt ✓ ${esc(datumDE(x.b197_testfahrt_am).slice(0, 6))}</span>` : `<span class="marke-pill gelb">Testfahrt offen</span>`) : "";
    return `<tr${istAktiv(x) ? "" : ' class="inaktivzeile"'}>
      <td><div class="name-zeile">${farbPunkt(a)}<b>${esc(x.name)}</b></div><div class="unter">${istAktiv(x) ? "" : `im Archiv seit ${esc(datumDE(x.inaktiv_seit))} · `}${wartetArt(x) ? `<span class="marke-pill gelb">${esc(WARTE_TEXT[wartetArt(x)])}</span> ` : ""}${esc(x.telefon || "")}${x.email ? " · " + esc(x.email) : ""}</div><div class="unter nur-unter">${esc(klasseVon(x))} · ${esc(artName(x.ausbildungsart))}${x.paket_id ? " · " + esc(paketName(x.paket_id)) : ""}</div></td>
      <td>${x.fahrlehrer_id ? esc(lehrerName(x.fahrlehrer_id)) : '<span class="marke-pill rot">ohne Fahrlehrer</span>'}</td>
      <td class="nur-sehr-breit">${esc(klasseVon(x))}<div class="unter">${esc(artName(x.ausbildungsart))}${x.paket_id ? " · " + esc(paketName(x.paket_id)) : ""}${a.beginn ? ` · seit <span class="datum">${esc(datumDE(a.beginn))}</span>` : ""}</div></td>
      <td>${standHTML(a)}<div class="unter">Theorie ${esc(theo)}</div></td>
      <td class="nur-sehr-breit">${naechster[x.id] ? esc(datumDE(naechster[x.id])) : '<span class="leise">–</span>'}</td>
      <td>${istAktiv(x) ? `<span class="marke-pill ${rf}">${rt}</span>` : '<span class="leise">–</span>'}${testfahrt ? `<div class="unter">${testfahrt}</div>` : ""}${notizPill(x.id)}${aufgabePill(x.id)}</td>
      <td class="aktionen"><div class="aktionen-box">${b197 && !x.b197_testfahrt_am && istAktiv(x) ? `<button class="knopf klein" data-testfahrt="${esc(x.id)}" type="button">Testfahrt ✓</button>` : ""}<button class="knopf klein" data-sbearb="${esc(x.id)}" type="button">Bearbeiten</button></div></td>
    </tr>`;
  }).join("");
  const lehrerOpt = `<option value="">Alle Fahrlehrer</option><option value="ohne"${lehrerFilter === "ohne" ? " selected" : ""}>Ohne Fahrlehrer</option>` +
    S.lehrer.map((l) => `<option value="${esc(l.id)}"${l.id === lehrerFilter ? " selected" : ""}>${esc(l.name || l.email)}</option>`).join("");
  const sichtTabs = [["aktiv", `Aktiv (${nAktiv})`], ["warte", `Warteliste (${nWarte})`], ["inaktiv", `Archiv (${nInaktiv})`], ["alle", "Alle"]]
    .map(([id, n]) => `<a class="tab" href="${linkMit("schueler", { sicht: id === "aktiv" ? "" : id })}"${id === sicht ? ' aria-current="page"' : ""}>${esc(n)}</a>`).join("");
  const klassenFilter = `<select class="suche" id="sKlasse" aria-label="Klasse filtern"><option value="">Alle Klassen</option>${KLASSEN.map(([k, n]) => `<option value="${k}"${k === klasseF ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  return `<div class="karte">
    <div class="tabs" style="margin-bottom:12px">${sichtTabs}</div>
    <div class="karte-kopf">
      <div class="knopfreihe">${klassenFilter}<select class="suche" id="sNotiz" aria-label="Notizen filtern"><option value="">Alle Notizen</option><option value="offen"${notizF === "offen" ? " selected" : ""}>Mit offener Notiz</option><option value="ungelesen"${notizF === "ungelesen" ? " selected" : ""}>Notiz noch nicht gelesen</option></select><select class="suche" id="sLehrer" aria-label="Fahrlehrer filtern">${lehrerOpt}</select>
        <input type="search" class="suche" id="sSuche" placeholder="Name oder Telefon suchen" value="${esc(fristenParam("suche"))}" aria-label="Schüler suchen"></div>
      <button class="knopf haupt" id="sNeu" type="button">+ Schüler anlegen</button>
    </div>
    <p class="leise klein">${liste.length} Schüler${sicht === "inaktiv" ? " (Archiv: bestanden oder nicht mehr dabei; überall ausgeblendet, zählen nicht bei Fristen, Reaktivierung und Auslastung)" : ""}${sicht === "warte" ? " (warten auf Theorie oder Praxisprüfung; zählen nicht in der Auslastung. Sobald neue Fahrstunden oder ein Prüfungstermin eingetragen sind, sind sie wieder aktiv.)" : ""}</p>
    ${liste.length ? `<table class="tabelle schuelertab"><thead><tr><th>Schüler</th><th>Fahrlehrer</th><th class="nur-sehr-breit">Klasse</th><th>Ausbildungsstand</th><th class="nur-sehr-breit">Nächster Termin</th><th>Reaktivierung</th><th></th></tr></thead><tbody>${zeilen}</tbody></table>` : `<p class="leer">${sicht === "inaktiv" ? "Das Archiv ist leer." : sicht === "warte" ? "Niemand steht auf der Warteliste." : "Keine Schüler gefunden."}</p>`}
  </div>`;
}
function notizPill(sid) {
  const o = offeneNotizen(sid);
  if (!o.length) return "";
  const stopp = o.some((n) => n.art === "stopp");
  const ungelesen = o.some((n) => !S.gelesen.some((g) => g.notiz_id === n.id));
  return `<div class="unter"><span class="marke-pill ${stopp ? "rot" : "gelb"}">${stopp ? "Stopp-Notiz" : "Notiz"}${ungelesen ? " · ungelesen" : " · gelesen"}</span></div>`;
}
function linkMit(bereich, aender) {
  const p = new URLSearchParams((location.hash.split("?")[1]) || "");
  for (const [k, v] of Object.entries(aender)) { if (v) p.set(k, v); else p.delete(k); }
  const q = p.toString();
  return "#" + bereich + (q ? "?" + q : "");
}
// Klasse eines Schülers; ältere Einträge ohne Klasse: aus der Form in der Fahrlehrer-App („Automatik“ = B78)
function klasseVon(x) {
  if (x.klasse) return x.klasse;
  const f = (x.ausbildung || {}).form || "";
  return f === "Automatik" ? "B78" : f;
}
function setzeFilter(bereich, werte, neuerEintrag) {
  const p = new URLSearchParams((location.hash.split("?")[1]) || "");
  for (const [k, v] of Object.entries(werte)) { if (v) p.set(k, v); else p.delete(k); }
  const q = p.toString();
  // Blättern (←/→) legt einen Eintrag im Verlauf an, damit „Zurück“ im Browser den vorigen Tag/Monat zeigt
  history[neuerEintrag ? "pushState" : "replaceState"](null, "", "#" + bereich + (q ? "?" + q : ""));
  zeichne();
}
function bindeSchueler(ziel) {
  ziel.querySelector("#sNeu").addEventListener("click", () => schuelerDialog(null));
  ziel.querySelector("#sLehrer").addEventListener("change", (e) => setzeFilter("schueler", { lehrer: e.target.value }));
  ziel.querySelector("#sNotiz").addEventListener("change", (e) => setzeFilter("schueler", { notiz: e.target.value }));
  ziel.querySelector("#sKlasse").addEventListener("change", (e) => setzeFilter("schueler", { klasse: e.target.value }));
  ziel.querySelectorAll("[data-testfahrt]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    if (!(await speichereSchueler(b.dataset.testfahrt, { b197_testfahrt_am: KR.todayISO() }, "Testfahrt als abgegeben eingetragen ✓"))) b.disabled = false;
  }));
  const su = ziel.querySelector("#sSuche");
  let t = null;
  su.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { setzeFilter("schueler", { suche: su.value }); const n = $("sSuche"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250);
  });
  ziel.querySelectorAll("[data-sbearb]").forEach((b) => b.addEventListener("click", () => schuelerDialog(b.dataset.sbearb)));
}
/* ---------- Notizen ans Team (Fahrlehrer bekommt sie als Popup, bis er „Gelesen“ tippt) ---------- */
function offeneNotizen(sid) { return S.notizen.filter((n) => n.schueler_id === sid && !n.erledigt_am); }
function notizGelesenText(n) {
  const g = S.gelesen.filter((x) => x.notiz_id === n.id);
  if (!g.length) return `<span class="marke-pill gelb">noch nicht gelesen</span>`;
  return `<span class="marke-pill gruen">gelesen von ${esc(g.map((x) => lehrerName(x.fahrlehrer_id)).join(", "))} · ${esc(new Date(g[0].gelesen_am).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }))}</span>`;
}
function notizZeit(n) { return new Date(n.erstellt_am).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function notizBlockHTML(sid, fahrlehrerId) {
  const alle = S.notizen.filter((n) => n.schueler_id === sid);
  const offen = alle.filter((n) => !n.erledigt_am), erledigt = alle.filter((n) => n.erledigt_am);
  const zeile = (n) => `<li class="notiz ${n.art === "stopp" ? "stopp" : ""}">
      <div><span class="marke-pill ${n.art === "stopp" ? "rot" : "gelb"}">${n.art === "stopp" ? "Stopp" : "Info"}</span> <span class="notiz-text">${esc(n.text)}</span></div>
      <div class="unter">${esc(n.bearbeiter || "Büro")} · ${esc(notizZeit(n))}${n.erledigt_am ? ` · erledigt${n.erledigt_bearbeiter ? " von " + esc(n.erledigt_bearbeiter) : ""}` : ""}</div>
      ${n.erledigt_am ? "" : `<div class="notiz-aktion">${notizGelesenText(n)}<button type="button" class="knopf klein" data-notizerledigt="${esc(n.id)}">Erledigt</button></div>`}</li>`;
  return `<h3>Notiz an den Fahrlehrer</h3>
    ${fahrlehrerId ? "" : `<p class="leise klein">Dieser Schüler hat noch keinen Fahrlehrer. Die Notiz erscheint, sobald einer zugeteilt ist.</p>`}
    <div class="notiz-neu">
      <select class="suche" id="nzArt" aria-label="Art der Notiz"><option value="info">Info</option><option value="stopp">Stopp: keine Fahrstunden anbieten</option></select>
      <textarea id="nzText" rows="2" maxlength="500" placeholder="z. B. Reaktivierung offen, bitte keine Fahrstunden anbieten" aria-label="Text der Notiz"></textarea>
      <button type="button" class="knopf haupt" id="nzSenden">An Fahrlehrer senden</button>
    </div>
    ${offen.length ? `<ul class="notizliste">${offen.map(zeile).join("")}</ul>` : `<p class="leise klein">Keine offene Notiz.</p>`}
    ${erledigt.length ? `<details><summary>Erledigt (${erledigt.length})</summary><ul class="notizliste">${erledigt.slice(0, 20).map(zeile).join("")}</ul></details>` : ""}
    <p class="leise klein">Nur kurze Arbeitsanweisungen. Keine Gesundheits- oder Privatdaten. Der Fahrlehrer sieht die Notiz innerhalb einer Minute als Meldung und danach im Schülerblatt.</p>`;
}
function bindeNotizBlock(dlg, sid, fahrlehrerId) {
  const block = dlg.querySelector("#notizBlock");
  const neu = () => { block.innerHTML = notizBlockHTML(sid, fahrlehrerId); bind(); zeichne(); };
  const bind = () => {
    block.querySelector("#nzSenden").addEventListener("click", async (e) => {
      const text = block.querySelector("#nzText").value.trim();
      if (!text) { toast("Bitte einen Text eintragen.", true); return; }
      e.target.disabled = true;
      const res = await supa.from("schueler_notizen").insert({ fahrschule_id: S.fsId, schueler_id: sid, text, art: block.querySelector("#nzArt").value, erstellt_von: S.user.id }).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Notiz nicht gesendet: " + (res.error ? res.error.message : "keine Berechtigung"), true); e.target.disabled = false; return; }
      S.notizen.unshift(Object.assign({}, res.data[0], { bearbeiter: res.data[0].bearbeiter || S.werAnzeige || null }));
      toast("Notiz gesendet. Der Fahrlehrer sieht sie innerhalb einer Minute.");
      neu();
    });
    block.querySelectorAll("[data-notizerledigt]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      const jetzt = new Date().toISOString();
      const res = await supa.from("schueler_notizen").update({ erledigt_am: jetzt, erledigt_von: S.user.id }).eq("id", b.dataset.notizerledigt).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); b.disabled = false; return; }
      const n = S.notizen.find((x) => x.id === b.dataset.notizerledigt);
      if (n) Object.assign(n, res.data[0], { erledigt_bearbeiter: res.data[0].erledigt_bearbeiter || S.werAnzeige || null });
      neu();
    }));
  };
  bind();
}
/* ---------- Interne Aufgaben je Schüler (nur Büro, der Fahrlehrer sieht sie nicht) ---------- */
function offeneAufgaben(sid) { return S.aufgaben.filter((a) => a.schueler_id === sid && !a.erledigt_am); }
// „Heute zu tun“: ausdrücklich so markiert, oder das Fälligkeitsdatum ist heute oder früher
function heuteAufgaben() {
  const h = KR.todayISO(), aktive = new Set(aktiveSchueler().map((x) => x.id));
  return S.aufgaben.filter((a) => !a.erledigt_am && aktive.has(a.schueler_id) && (a.heute || (a.faellig_am && a.faellig_am <= h)));
}
function aufgabePill(sid) {
  const o = offeneAufgaben(sid);
  if (!o.length) return "";
  const h = KR.todayISO(), heute = o.some((a) => a.heute || (a.faellig_am && a.faellig_am <= h));
  return `<div class="unter"><span class="marke-pill ${heute ? "gelb" : ""}">${o.length === 1 ? "Aufgabe offen" : o.length + " Aufgaben offen"}${heute ? " · heute" : ""}</span></div>`;
}
function aufgabenBlockHTML(sid) {
  const alle = S.aufgaben.filter((a) => a.schueler_id === sid), heute = KR.todayISO();
  const offen = alle.filter((a) => !a.erledigt_am), erledigt = alle.filter((a) => a.erledigt_am);
  const zeile = (a) => {
    const jetzt = a.heute || (a.faellig_am && a.faellig_am <= heute);
    return `<li class="notiz${jetzt && !a.erledigt_am ? " stopp" : ""}">
      <div>${jetzt && !a.erledigt_am ? `<span class="marke-pill gelb">Heute zu tun</span> ` : ""}<span class="notiz-text">${esc(a.text)}</span></div>
      <div class="unter">${esc(a.bearbeiter || "Büro")} · ${esc(notizZeit(a))}${a.faellig_am && !a.erledigt_am ? ` · fällig ${esc(datumDE(a.faellig_am))}` : ""}${a.erledigt_am ? ` · erledigt${a.erledigt_bearbeiter ? " von " + esc(a.erledigt_bearbeiter) : ""}` : ""}</div>
      ${a.erledigt_am ? "" : `<div class="notiz-aktion"><button type="button" class="knopf klein" data-agheute="${esc(a.id)}">${a.heute ? "Nicht mehr heute" : "Heute zu tun"}</button><button type="button" class="knopf klein" data-agerledigt="${esc(a.id)}">Erledigt</button></div>`}</li>`;
  };
  return `<h3>Interne Aufgaben (nur Büro)</h3>
    <div class="notiz-neu">
      <textarea id="agText" rows="2" maxlength="500" placeholder="z. B. Unterlagen nachfordern, Mutter zurückrufen" aria-label="Text der Aufgabe"></textarea>
      <label class="datum-klein">Fällig am (optional)<input type="date" id="agDatum"></label>
      <div class="knopfreihe"><button type="button" class="knopf haupt" id="agSpeichern">Aufgabe speichern</button><button type="button" class="knopf" id="agHeute">📌 Heute zu tun</button></div>
    </div>
    ${offen.length ? `<ul class="notizliste">${offen.map(zeile).join("")}</ul>` : `<p class="leise klein">Keine offene Aufgabe.</p>`}
    ${erledigt.length ? `<details><summary>Erledigt (${erledigt.length})</summary><ul class="notizliste">${erledigt.slice(0, 20).map(zeile).join("")}</ul></details>` : ""}
    <p class="leise klein">Aufgaben mit „Heute zu tun“ oder einem Datum von heute stehen auf der Startseite „Heute zu tun“. Keine Gesundheits- oder Privatdaten.</p>`;
}
async function aendereAufgabe(id, werte, hinweis) {
  const res = await supa.from("schueler_aufgaben").update(werte).eq("id", id).select("*");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
  const a = S.aufgaben.find((x) => x.id === id);
  if (a) Object.assign(a, res.data[0], werte.erledigt_am ? { erledigt_bearbeiter: werte.erledigt_bearbeiter } : {});
  if (hinweis) toast(hinweis);
  return true;
}
function bindeAufgabenBlock(dlg, sid) {
  const block = dlg.querySelector("#aufgabenBlock");
  const neu = () => { block.innerHTML = aufgabenBlockHTML(sid); bind(); zeichne(); };
  const anlegen = async (heute, knopf) => {
    const text = block.querySelector("#agText").value.trim();
    if (!text) { toast("Bitte einen Text eintragen.", true); return; }
    knopf.disabled = true;
    const faellig = block.querySelector("#agDatum").value || null;
    const res = await supa.from("schueler_aufgaben").insert({ fahrschule_id: S.fsId, schueler_id: sid, text, heute, faellig_am: faellig, erstellt_von: S.user.id, bearbeiter: S.werAnzeige || null }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Aufgabe nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); knopf.disabled = false; return; }
    S.aufgaben.unshift(res.data[0]);
    toast(heute ? "Aufgabe steht jetzt unter „Heute zu tun“." : "Aufgabe gespeichert.");
    neu();
  };
  const bind = () => {
    block.querySelector("#agSpeichern").addEventListener("click", (e) => anlegen(false, e.target));
    block.querySelector("#agHeute").addEventListener("click", (e) => anlegen(true, e.target));
    block.querySelectorAll("[data-agheute]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      const a = S.aufgaben.find((x) => x.id === b.dataset.agheute);
      if (await aendereAufgabe(b.dataset.agheute, { heute: !(a && a.heute) })) neu(); else b.disabled = false;
    }));
    block.querySelectorAll("[data-agerledigt]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      if (await aendereAufgabe(b.dataset.agerledigt, { erledigt_am: new Date().toISOString(), erledigt_von: S.user.id, erledigt_bearbeiter: S.werAnzeige || null, heute: false })) neu(); else b.disabled = false;
    }));
  };
  bind();
}
function bindeHeute(ziel) {
  ziel.querySelectorAll("[data-hagerledigt]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    if (await aendereAufgabe(b.dataset.hagerledigt, { erledigt_am: new Date().toISOString(), erledigt_von: S.user.id, erledigt_bearbeiter: S.werAnzeige || null, heute: false }, "Aufgabe erledigt ✓")) zeichne(); else b.disabled = false;
  }));
  ziel.querySelectorAll("[data-hagschueler]").forEach((b) => b.addEventListener("click", () => schuelerDialog(b.dataset.hagschueler)));
}
function schuelerDialog(id) {
  const x = id ? S.schueler.find((y) => y.id === id) : { ausbildungsart: "ersterwerb", klasse: "B", vertrag_am: KR.todayISO() };
  if (!x) return;
  const body = `<div class="formular">
      <label class="voll">Name<input type="text" name="name" required maxlength="100" value="${esc(x.name || "")}"></label>
      <label>Telefon (Login für die Fahr-Akademie)<input type="tel" name="telefon" maxlength="40" value="${esc(x.telefon || "")}"></label>
      <label>E-Mail<input type="email" name="email" maxlength="200" value="${esc(x.email || "")}"></label>
      <label>Fahrlehrer (der mit dem meisten Platz steht oben)<select name="fahrlehrer_id">${lehrerOptionen(x.fahrlehrer_id, true)}</select></label>
      <label>Paket<select name="paket_id"><option value="">– ohne Paket –</option>${S.pakete.map((p) => `<option value="${esc(p.id)}"${p.id === x.paket_id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      <label>Ausbildungsart<select name="ausbildungsart">${artOptionen(x.ausbildungsart)}</select></label>
      <label>Klasse<select name="klasse">${klassenOptionen(x.klasse)}</select></label>
      <label>Vertrag abgeschlossen am<input type="date" name="vertrag_am" value="${esc(x.vertrag_am || "")}"></label>
      <div class="voll b197-feld" id="b197Feld"${x.klasse === "B197" ? "" : " hidden"}>
        <label class="wahl"><input type="checkbox" name="testfahrt"${x.b197_testfahrt_am ? " checked" : ""}> B197: Testfahrt abgegeben</label>
        <label class="datum-klein">am<input type="date" name="testfahrt_am" value="${esc(x.b197_testfahrt_am || "")}"></label>
      </div>
      ${id ? `<div class="voll schalter-zeile"><label class="schalter"><input type="checkbox" name="aktiv" role="switch"${istAktiv(x) ? " checked" : ""}><span class="schalter-bahn" aria-hidden="true"></span><span class="schalter-text"><b id="aktivText">${istAktiv(x) ? "Aktiv" : "Im Archiv"}</b><span class="leise klein"> Archiv heißt: bestanden oder nicht mehr dabei. Der Schüler verschwindet überall (auch aus der Fahrlehrer-App) und zählt nicht bei Fristen, Reaktivierung und Auslastung. Jederzeit zurückholbar.</span></span></label></div>` : ""}
      ${id ? `<div class="voll" id="notizBlock">${notizBlockHTML(id, x.fahrlehrer_id)}</div>` : ""}
      <label class="voll">Interne Notiz (nur Büro, der Fahrlehrer sieht sie nicht)<input type="text" name="buero_notiz" maxlength="500" value="${esc(x.buero_notiz || "")}"></label>
      ${id ? `<div class="voll" id="aufgabenBlock">${aufgabenBlockHTML(id)}</div>` : ""}
    </div>
    <p class="leise klein">Umschreiber brauchen keine Sonderfahrten. Ein neuer Schüler mit Fahrlehrer erscheint innerhalb einer Minute in dessen App.</p>`;
  const dlg = oeffneDialog(id ? `Schüler: ${x.name}` : "Schüler anlegen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    const name = (d.name || "").trim();
    if (!name) { toast("Bitte einen Namen eintragen.", true); return false; }
    const offeneAufgabe = form.querySelector("#agText");
    if (offeneAufgabe && offeneAufgabe.value.trim()) { toast("Die Aufgabe ist noch nicht gespeichert. Bitte „Aufgabe speichern“ oder „Heute zu tun“ tippen oder den Text löschen.", true); return false; }
    const offenerText = form.querySelector("#nzText");
    if (offenerText && offenerText.value.trim()) { toast("Die Notiz ist noch nicht gesendet. Bitte „An Fahrlehrer senden“ tippen oder den Text löschen.", true); return false; }
    const doppelt = d.telefon && S.schueler.find((y) => y.id !== id && y.telefon && y.telefon.replace(/\D/g, "").slice(-9) === d.telefon.replace(/\D/g, "").slice(-9));
    if (doppelt && !id && !(await bestaetige("Telefonnummer gibt es schon", `${doppelt.name} hat dieselbe Telefonnummer. Trotzdem neu anlegen?`, "Ja, anlegen"))) return false;
    const werte = {
      name, telefon: (d.telefon || "").trim() || null, email: (d.email || "").trim() || null,
      paket_id: d.paket_id || null, ausbildungsart: d.ausbildungsart || "ersterwerb", klasse: d.klasse || null, vertrag_am: d.vertrag_am || null,
      buero_notiz: (d.buero_notiz || "").trim() || null,
    };
    const neuerLehrer = d.fahrlehrer_id || null;
    // B197-Testfahrt: Haken setzen = Datum (heute, wenn leer); Haken weg oder andere Klasse = leer
    werte.b197_testfahrt_am = werte.klasse === "B197" && d.testfahrt ? (d.testfahrt_am || x.b197_testfahrt_am || KR.todayISO()) : null;
    if (id) werte.inaktiv_seit = d.aktiv ? null : (x.inaktiv_seit || KR.todayISO());
    if (!id) {
      const neueId = neueSchuelerId();
      const zeile = Object.assign({ id: neueId, fahrschule_id: S.fsId, fahrlehrer_id: neuerLehrer, status: "aktiv", erstellt_von: S.user.id,
        ausbildung: { form: werte.klasse === "B78" ? "Automatik" : (["B197", "BE"].includes(werte.klasse) ? werte.klasse : "B"), umschreiber: werte.ausbildungsart === "umschreibung" } }, werte);
      const res = await supa.from("schueler").insert(zeile).select("*");
      if (res.error || !res.data || !res.data.length) { toast("Nicht angelegt: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
      S.schueler.push(res.data[0]);
      toast(`${name} angelegt${neuerLehrer ? " und " + lehrerName(neuerLehrer) + " zugeordnet" : " (noch ohne Fahrlehrer)"}`);
      zeichne();
      return true;
    }
    // Umschreiber: die Fahrlehrer-App liest die Spalte ausbildungsart selbst (nicht ins jsonb schreiben,
    // sonst überschreibt der nächste Abgleich des Fahrlehrers den Wert)
    const wirdArchiviert = istAktiv(x) && !!werte.inaktiv_seit;
    const offeneTermine = wirdArchiviert ? S.termine.filter((t) => t.schueler_id === id && t.datum >= KR.todayISO() && t.art !== "block").length : 0;
    if (!(await speichereSchueler(id, werte, wirdArchiviert ? `${name} liegt jetzt im Archiv.${offeneTermine ? ` Achtung: ${offeneTermine} künftige Termine stehen noch im Kalender.` : ""}` : "Gespeichert"))) return false;
    if ((x.fahrlehrer_id || null) !== neuerLehrer) await verschiebeSchueler(x, neuerLehrer);
    return true;
  });
  if (id) bindeNotizBlock(dlg, id, x.fahrlehrer_id);
  if (id) bindeAufgabenBlock(dlg, id);
  const klasseSel = dlg.querySelector("select[name=klasse]"), testBox = dlg.querySelector("input[name=testfahrt]"), testDat = dlg.querySelector("input[name=testfahrt_am]");
  klasseSel.addEventListener("change", () => { dlg.querySelector("#b197Feld").hidden = klasseSel.value !== "B197"; });
  testBox.addEventListener("change", () => { if (testBox.checked && !testDat.value) testDat.value = KR.todayISO(); if (!testBox.checked) testDat.value = ""; });
  const aktivBox = dlg.querySelector("input[name=aktiv]");
  if (aktivBox) aktivBox.addEventListener("change", () => { dlg.querySelector("#aktivText").textContent = aktivBox.checked ? "Aktiv" : "Im Archiv"; });
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

/* ---------- Kalender: Tag, Woche, Monat, Jahr ---------- */
let K_START = 7 * 60, K_ENDE = 21 * 60; const K_PX = 1.15; // Pixel pro Minute
// Normal 07–21 Uhr; liegt ein Termin davor oder danach, wird der Bereich erweitert (nichts darf unsichtbar bleiben)
function kBereichSetzen(termine) {
  let a = 7 * 60, e = 21 * 60;
  for (const t of termine) {
    if (!t.von || !t.bis) continue;
    a = Math.min(a, Math.floor(KR.hm2min(t.von) / 60) * 60);
    e = Math.max(e, Math.ceil(KR.hm2min(t.bis) / 60) * 60);
  }
  K_START = a; K_ENDE = Math.min(e, 24 * 60);
}
const K_FARBEN = { fahrstunde: "#3a7350", nacht: "#5a7da8", sonder: "#5a7da8", pruefung: "#c9a227", theorie: "#9b7dc4", schalt: "#c4607d", block: "#88939a", vortest: "#d68a3e", simulator: "#3ea6a0", beratung: "#7a8fd6", ersthilfe: "#d65a5a" };
const K_ANSICHTEN = [["tag", "Tag"], ["woche", "Woche"], ["monat", "Monat"], ["jahr", "Jahr"]];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
function kAnsicht() { const a = fristenParam("ansicht"); return K_ANSICHTEN.some(([id]) => id === a) ? a : "tag"; }
function kTag() { const t = fristenParam("tag"); return /^\d{4}-\d\d-\d\d$/.test(t) && KR.dateISO(KR.parseISO(t)) === t ? t : KR.todayISO(); }
function kGewaehlteLehrer() { return (fristenParam("lehrer") || "").split(",").filter(Boolean); }
function kTerminBlock(t) {
  const a = Math.max(KR.hm2min(t.von), K_START), b = Math.min(KR.hm2min(t.bis), K_ENDE);
  if (b <= a) return "";
  const sn = schuelerName(t.schueler_id) || t.interessent_name || (t.payload && t.payload.note) || ARTEN[t.art] || "";
  const gesperrt = t.schueler_id && KR.reaktInfo(S.schueler.find((x) => x.id === t.schueler_id) || {}).gesperrt;
  return `<button type="button" class="k-termin${t.art === "block" ? " block" : ""}${gesperrt ? " gesperrt" : ""}" data-termin="${esc(t.id)}" style="top:${(a - K_START) * K_PX}px;height:${Math.max((b - a) * K_PX - 2, 22)}px;--farbe:${K_FARBEN[t.art] || "#3a7350"}">
        <span class="k-zeit">${esc(t.von)}–${esc(t.bis)}</span><span class="k-name">${gesperrt ? "⚠ " : ""}${esc(sn)}</span>${t.fahrzeug ? `<span class="k-fz">${esc(t.fahrzeug)}</span>` : ""}</button>`;
}
function kStundenAchse() {
  const stunden = [];
  for (let m = K_START; m < K_ENDE; m += 60) stunden.push(`<div class="k-stunde" style="top:${(m - K_START) * K_PX}px">${KR.pad2(m / 60)}:00</div>`);
  return `<div class="k-achse" style="height:${(K_ENDE - K_START) * K_PX}px">${stunden.join("")}</div>`;
}
// Anzahl Termine und Unterrichtseinheiten je Tag für die gewählten Fahrlehrer (für Monat und Jahr)
function kTageSummen(von, bis, lehrerIds) {
  const m = {};
  const ids = new Set(lehrerIds);
  for (const t of S.termine) {
    if (t.datum < von || t.datum > bis || t.art === "block" || !ids.has(t.fahrlehrer_id)) continue;
    const e = (m[t.datum] = m[t.datum] || { n: 0, ue: 0 });
    e.n++;
    if (t.von && t.bis) e.ue += Math.max(KR.hm2min(t.bis) - KR.hm2min(t.von), 0) / 45;
  }
  return m;
}
// Stufe 0–4 nach Auslastung des Tages (12 UE je Fahrlehrer und Tag)
function kHitze(e, anzahlLehrer) {
  if (!e || !e.n) return 0;
  const r = e.ue / (12 * Math.max(anzahlLehrer, 1));
  return r < 0.34 ? 1 : (r < 0.67 ? 2 : (r < 0.95 ? 3 : 4));
}
function kSuchErgebnis() {
  const q = (fristenParam("ksuche") || "").trim().toLowerCase();
  if (!q) return "";
  const heute = KR.todayISO();
  const alleTreffer = aktiveSchueler().filter((x) => (x.name || "").toLowerCase().includes(q));
  const treffer = alleTreffer.slice(0, 8);
  if (!treffer.length) return `<div class="k-suche-erg"><p class="leer">Kein Schüler mit „${esc(fristenParam("ksuche"))}“ gefunden.</p></div>`;
  const zeilen = treffer.map((x) => {
    const eigene = S.termine.filter((t) => t.schueler_id === x.id && t.art !== "block").sort((a, b) => (a.datum + (a.von || "")).localeCompare(b.datum + (b.von || "")));
    const kommend = eigene.filter((t) => t.datum >= heute).slice(0, 4), davor = eigene.filter((t) => t.datum < heute).slice(-1);
    const knopf = (t) => `<button type="button" class="knopf klein" data-ksprung="${esc(t.datum)}">${esc(datumDE(t.datum))} ${esc(t.von || "")}</button>`;
    return `<li><b>${esc(x.name)}</b> <span class="leise klein">${esc(lehrerName(x.fahrlehrer_id))}</span>
      <div class="k-sprung">${davor.length ? `<span class="leise klein">zuletzt</span> ${davor.map(knopf).join("")}` : ""} ${kommend.length ? `<span class="leise klein">als Nächstes</span> ${kommend.map(knopf).join("")}` : '<span class="leise klein">keine künftigen Termine</span>'}</div></li>`;
  }).join("");
  return `<div class="k-suche-erg"><ul>${zeilen}</ul>${alleTreffer.length > 8 ? `<p class="leise klein">${alleTreffer.length - 8} weitere Treffer: bitte genauer suchen.</p>` : ""}</div>`;
}
function kopfKalender(ansicht, tag, titel, schritt) {
  const tabs = K_ANSICHTEN.map(([id, n]) => `<a class="tab" href="${linkMit("kalender", { ansicht: id === "tag" ? "" : id })}"${id === ansicht ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  return `<div class="karte-kopf">
      <div class="tabs">${tabs}</div>
      <h2 class="k-titel">${esc(titel)}</h2>
    </div>
    <div class="filterzeile">
      <div class="knopfreihe"><button class="knopf" data-ktag="${schritt(-1)}" type="button" aria-label="Zurück">←</button>
        <button class="knopf" data-ktag="${KR.todayISO()}" type="button">Heute</button>
        <button class="knopf" data-ktag="${schritt(1)}" type="button" aria-label="Weiter">→</button></div>
      <label class="feld-klein">Zu Datum springen <input type="date" class="suche" id="kDatum" value="${esc(tag)}" aria-label="Datum wählen"></label>
      <input type="search" class="suche" id="kSuche" placeholder="Schüler im Kalender suchen" value="${esc(fristenParam("ksuche"))}" aria-label="Schüler im Kalender suchen">
    </div>
    ${kSuchErgebnis()}`;
}
function kLehrerChips(gewaehlt) {
  return `<div class="chips">${S.lehrer.filter((l) => l.aktiv !== false).map((l) => `<label class="chip"><input type="checkbox" data-klehrer="${esc(l.id)}"${!gewaehlt.length || gewaehlt.includes(l.id) ? " checked" : ""}> ${esc(l.name || l.email)}</label>`).join("")}</div>`;
}
function renderKalender() {
  const ansicht = kAnsicht(), tag = kTag();
  if (ansicht === "woche") return kalenderWoche(tag);
  if (ansicht === "monat") return kalenderMonat(tag);
  if (ansicht === "jahr") return kalenderJahr(tag);
  const gewaehlt = kGewaehlteLehrer();
  const lehrer = (gewaehlt.length ? S.lehrer.filter((l) => gewaehlt.includes(l.id)) : S.lehrer).filter((l) => l.aktiv !== false);
  const termine = S.termine.filter((t) => t.datum === tag);
  kBereichSetzen(termine);
  const hoehe = (K_ENDE - K_START) * K_PX;
  const spalten = lehrer.map((l) => {
    const eigene = termine.filter((t) => t.fahrlehrer_id === l.id && t.von && t.bis);
    return `<div class="k-spalte"><div class="k-kopf"><span class="k-lname" title="${esc(l.name || l.email)}">${esc(l.name || l.email)}</span><span class="k-anz">${eigene.filter((t) => t.art !== "block").length} Termine</span></div>
      <div class="k-flaeche" data-lehrer="${esc(l.id)}" data-datum="${esc(tag)}" style="height:${hoehe}px">${eigene.map(kTerminBlock).join("")}</div></div>`;
  }).join("");
  const wtag = KR.parseISO(tag).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `<div class="karte">
    ${kopfKalender("tag", tag, wtag, (n) => KR.addDaysISO(tag, n))}
    ${kLehrerChips(gewaehlt)}
    <p class="leise klein">In eine freie Stelle klicken, um einen Termin anzulegen. Auf einen Termin klicken, um ihn zu verschieben oder abzusagen.</p>
    <div class="kalender">${kStundenAchse()}<div class="k-spalten" style="--spalten:${Math.max(lehrer.length, 1)}">${spalten || '<p class="leer">Kein Fahrlehrer gewählt.</p>'}</div></div>
  </div>`;
}
function kalenderWoche(tag) {
  const montag = montagVon(tag), sonntag = KR.addDaysISO(montag, 6);
  const aktive = S.lehrer.filter((l) => l.aktiv !== false);
  const gewaehlt = kGewaehlteLehrer();
  const wahl = fristenParam("wl") || gewaehlt[0] || (aktive[0] || {}).id;
  const l = aktive.find((x) => x.id === wahl) || aktive[0];
  kBereichSetzen(S.termine.filter((t) => l && t.fahrlehrer_id === l.id && t.datum >= montag && t.datum <= sonntag));
  const hoehe = (K_ENDE - K_START) * K_PX;
  const heute = KR.todayISO();
  const spalten = l ? Array.from({ length: 7 }, (_, i) => {
    const d = KR.addDaysISO(montag, i);
    const eigene = S.termine.filter((t) => t.fahrlehrer_id === l.id && t.datum === d && t.von && t.bis);
    return `<div class="k-spalte${d === heute ? " heute" : ""}"><div class="k-kopf"><span class="k-lname">${WOCHENTAGE_KURZ[i]} ${esc(datumDE(d).slice(0, 6))}</span><span class="k-anz">${eigene.filter((t) => t.art !== "block").length} Termine</span></div>
      <div class="k-flaeche" data-lehrer="${esc(l.id)}" data-datum="${esc(d)}" style="height:${hoehe}px">${eigene.map(kTerminBlock).join("")}</div></div>`;
  }).join("") : "";
  const kw = (() => { const d = KR.parseISO(montag); const t = new Date(d.getTime()); t.setDate(t.getDate() + 3); const j = new Date(t.getFullYear(), 0, 4); return 1 + Math.round(((t - j) / 86400000 - 3 + ((j.getDay() + 6) % 7)) / 7); })();
  const titel = `Woche ${kw}: ${datumDE(montag).slice(0, 6)}–${datumDE(sonntag)}`;
  return `<div class="karte">
    ${kopfKalender("woche", tag, titel, (n) => KR.addDaysISO(tag, 7 * n))}
    <div class="filterzeile"><label class="feld-klein">Fahrlehrer <select class="suche" id="kWoLehrer" aria-label="Fahrlehrer der Woche">${aktive.map((x) => `<option value="${esc(x.id)}"${l && x.id === l.id ? " selected" : ""}>${esc(x.name || x.email)}</option>`).join("")}</select></label></div>
    <p class="leise klein">In eine freie Stelle klicken, um einen Termin anzulegen. Auf einen Termin klicken, um ihn zu verschieben oder abzusagen.</p>
    <div class="kalender">${kStundenAchse()}<div class="k-spalten" style="--spalten:7">${spalten || '<p class="leer">Kein Fahrlehrer vorhanden.</p>'}</div></div>
  </div>`;
}
function kalenderMonat(tag) {
  const j = KR.parseISO(tag).getFullYear(), m = KR.parseISO(tag).getMonth();
  const erster = KR.dateISO(new Date(j, m, 1)), letzter = KR.dateISO(new Date(j, m + 1, 0));
  const start = montagVon(erster), ende = KR.addDaysISO(montagVon(letzter), 6);
  const gewaehlt = kGewaehlteLehrer();
  const lehrer = (gewaehlt.length ? S.lehrer.filter((l) => gewaehlt.includes(l.id)) : S.lehrer).filter((l) => l.aktiv !== false);
  const summen = kTageSummen(start, ende, lehrer.map((l) => l.id));
  const heute = KR.todayISO();
  const zellen = [];
  for (let d = start; d <= ende; d = KR.addDaysISO(d, 1)) {
    const e = summen[d], h = kHitze(e, lehrer.length);
    const wt = (KR.parseISO(d).getDay() + 6) % 7;
    zellen.push(`<button type="button" class="m-tag h${h}${d.slice(0, 7) !== erster.slice(0, 7) ? " fremd" : ""}${d === heute ? " heute" : ""}${wt >= 5 ? " we" : ""}" data-ksprung="${esc(d)}" aria-label="${esc(datumDE(d))}: ${e ? e.n : 0} Termine">
      <span class="m-nr">${Number(d.slice(8))}</span>${e ? `<span class="m-anz">${e.n} Termine</span><span class="m-ue">${Math.round(e.ue * 10) / 10} UE</span>` : ""}</button>`);
  }
  return `<div class="karte">
    ${kopfKalender("monat", tag, `${MONATE[m]} ${j}`, (n) => KR.addMonthsISO(tag, n))}
    ${kLehrerChips(gewaehlt)}
    <div class="monat"><div class="m-kopf">${WOCHENTAGE_KURZ.map((w) => `<span>${w}</span>`).join("")}</div><div class="m-raster">${zellen.join("")}</div></div>
    <p class="leise klein">Farbe = Auslastung des Tages (12 UE je Fahrlehrer). Auf einen Tag klicken, um ihn zu öffnen.</p>
  </div>`;
}
function kalenderJahr(tag) {
  const j = KR.parseISO(tag).getFullYear();
  const gewaehlt = kGewaehlteLehrer();
  const lehrer = (gewaehlt.length ? S.lehrer.filter((l) => gewaehlt.includes(l.id)) : S.lehrer).filter((l) => l.aktiv !== false);
  const summen = kTageSummen(`${j}-01-01`, `${j}-12-31`, lehrer.map((l) => l.id));
  const heute = KR.todayISO();
  const frueh = S.termine.reduce((a, t) => (t.datum && t.datum < a ? t.datum : a), heute);
  const monate = MONATE.map((name, m) => {
    const erster = KR.dateISO(new Date(j, m, 1)), letzter = KR.dateISO(new Date(j, m + 1, 0));
    const start = montagVon(erster), ende = KR.addDaysISO(montagVon(letzter), 6);
    const zellen = [];
    for (let d = start; d <= ende; d = KR.addDaysISO(d, 1)) {
      if (d.slice(0, 7) !== erster.slice(0, 7)) { zellen.push('<span class="j-leer"></span>'); continue; }
      const e = summen[d];
      zellen.push(`<button type="button" class="j-tag h${kHitze(e, lehrer.length)}${d === heute ? " heute" : ""}" data-ksprung="${esc(d)}" title="${esc(datumDE(d))}: ${e ? e.n : 0} Termine" aria-label="${esc(datumDE(d))}: ${e ? e.n : 0} Termine">${Number(d.slice(8))}</button>`);
    }
    return `<div class="j-monat"><a class="j-titel" href="${linkMit("kalender", { ansicht: "monat", tag: erster })}">${name}</a><div class="j-kopf">${WOCHENTAGE_KURZ.map((w) => `<span>${w.slice(0, 1)}</span>`).join("")}</div><div class="j-raster">${zellen.join("")}</div></div>`;
  }).join("");
  return `<div class="karte">
    ${kopfKalender("jahr", tag, String(j), (n) => KR.addMonthsISO(tag, 12 * n))}
    ${kLehrerChips(gewaehlt)}
    <div class="jahr">${monate}</div>
    <p class="leise klein">Farbe = Auslastung des Tages. Auf einen Tag klicken, um ihn zu öffnen; auf einen Monat klicken, um ihn groß zu sehen. Termine sind ab dem ${esc(datumDE(frueh))} geladen.</p>
  </div>`;
}
function bindeKalender(ziel) {
  ziel.querySelectorAll("[data-ktag]").forEach((b) => b.addEventListener("click", () => setzeFilter("kalender", { tag: b.dataset.ktag }, true)));
  ziel.querySelectorAll("[data-ksprung]").forEach((b) => b.addEventListener("click", () => { location.hash = linkMit("kalender", { ansicht: "", tag: b.dataset.ksprung }); }));
  ziel.querySelector("#kDatum").addEventListener("change", (e) => e.target.value && setzeFilter("kalender", { tag: e.target.value }));
  const su = ziel.querySelector("#kSuche");
  let t = null;
  su.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { setzeFilter("kalender", { ksuche: su.value.trim() }); const n = $("kSuche"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250);
  });
  const wl = ziel.querySelector("#kWoLehrer");
  if (wl) wl.addEventListener("change", () => setzeFilter("kalender", { wl: wl.value }));
  ziel.querySelectorAll("[data-klehrer]").forEach((c) => c.addEventListener("change", () => {
    const an = [...ziel.querySelectorAll("[data-klehrer]")].filter((x) => x.checked).map((x) => x.dataset.klehrer);
    setzeFilter("kalender", { lehrer: an.length === ziel.querySelectorAll("[data-klehrer]").length ? "" : (an.join(",") || "keiner") });
  }));
  ziel.querySelectorAll("[data-termin]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); terminDialog(b.dataset.termin); }));
  ziel.querySelectorAll(".k-flaeche").forEach((f) => f.addEventListener("click", (e) => {
    if (e.target !== f) return;
    const y = e.clientY - f.getBoundingClientRect().top;
    const min = Math.round((K_START + y / K_PX) / 15) * 15;
    terminDialog(null, { fahrlehrer_id: f.dataset.lehrer, datum: f.dataset.datum || kTag(), von: KR.pad2(Math.floor(min / 60)) + ":" + KR.pad2(min % 60) });
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
    // Stopp-Notiz oder offene Reaktivierung: Büro vor dem Buchen warnen (wie in der Fahrlehrer-App)
    if (!id && d.schueler_id && ["fahrstunde", "sonder", "nacht", "schalt"].includes(d.art)) {
      const sch = S.schueler.find((x) => x.id === d.schueler_id) || {};
      const stopp = offeneNotizen(d.schueler_id).filter((n) => n.art === "stopp");
      const gesperrtR = KR.reaktInfo(sch).gesperrt;
      if ((stopp.length || gesperrtR) && !(await bestaetige("Achtung bei " + (sch.name || "diesem Schüler"), (stopp.length ? "Stopp-Notiz: " + stopp.map((n) => n.text).join(" / ") + ". " : "") + (gesperrtR ? "Die Reaktivierung ist überfällig. " : "") + "Trotzdem buchen?", "Trotzdem buchen"))) return false;
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

/* ---------- Fahrchecks ---------- */
// Termin aus der Datenbank in die Form, die KR.fcSoll erwartet (Vermerke stehen im payload)
function fcTermin(t) {
  const p = t.payload || {};
  return { id: t.id, datum: t.datum, von: t.von, bis: t.bis, art: t.art, status: p.status || t.status, fc: p.fc || null, nachAm: p.nachAm || null, schueler_id: t.schueler_id };
}
function fcFuerLehrer(lehrerId, von, bis) {
  return KR.fcSoll(S.termine.filter((t) => t.fahrlehrer_id === lehrerId).map(fcTermin), von, bis);
}
function letzteQuittung(lehrerId, von) {
  return S.fcAbgaben.find((q) => q.fahrlehrer_id === lehrerId && q.zeitraum_von === von) || null;
}
// Abgeschlossener letzter Zeitraum: welche Fahrlehrer haben Fahrchecks, aber noch keine Quittung?
function fcOffeneAbgaben() {
  if (!S.geladenAm) return [];
  const [von, bis] = KR.fcVorZeitraum(KR.fcZeitraum(KR.todayISO())[0]);
  return S.lehrer.filter((l) => !letzteQuittung(l.id, von) && fcFuerLehrer(l.id, von, bis).soll > 0).map((l) => ({ lehrer: l, von, bis }));
}
// Gewählter Abgabe-Zeitraum: jetzt | vor | Startdatum eines früheren Halbmonats (JJJJ-MM-TT)
function fcPeriode() {
  const jetzt = KR.fcZeitraum(KR.todayISO());
  const z = fristenParam("z");
  if (z === "vor") return KR.fcVorZeitraum(jetzt[0]);
  if (/^\d{4}-\d\d-\d\d$/.test(z)) return KR.fcZeitraum(z);
  return jetzt;
}
function fcPeriodenOptionen(gewaehlt) {
  let [von, bis] = KR.fcZeitraum(KR.todayISO());
  let html = "";
  for (let i = 0; i < 14; i++) {
    const wert = i === 0 ? "jetzt" : (i === 1 ? "vor" : von);
    const name = `${i === 0 ? "Aktuell" : (i === 1 ? "Letzter Zeitraum" : "Früher")} · ${datumDE(von).slice(0, 6)}–${datumDE(bis)}`;
    html += `<option value="${wert}"${wert === gewaehlt || (gewaehlt === von && i > 1) ? " selected" : ""}>${esc(name)}</option>`;
    [von, bis] = KR.fcVorZeitraum(von);
  }
  return html;
}
const FC_ANSICHTEN = [["abgaben", "Abgaben je Fahrlehrer"], ["stunden", "Alle Fahrcheck-Stunden"]];
function fcTabs(aktiv) {
  return FC_ANSICHTEN.map(([id, n]) => `<a class="tab" href="#fahrchecks${id === "abgaben" ? "" : "?ansicht=" + id}"${id === aktiv ? ' aria-current="page"' : ""}>${esc(n)}</a>`).join("");
}
function lehrerFilterOptionen(gewaehlt, alleText) {
  return `<option value="">${esc(alleText)}</option>` + S.lehrer.filter((l) => l.aktiv !== false || l.id === gewaehlt).map((l) => `<option value="${esc(l.id)}"${l.id === gewaehlt ? " selected" : ""}>${esc(l.name || l.email)}</option>`).join("");
}
function renderFahrchecks() {
  if (fristenParam("ansicht") === "stunden") return renderFcStunden();
  const [von, bis] = fcPeriode();
  const laeuft = bis >= KR.todayISO();
  const lehrerF = fristenParam("lehrer");
  const statusF = ["ohne", "fehlend", "ok"].includes(fristenParam("status")) ? fristenParam("status") : "";
  const suche = (fristenParam("suche") || "").trim().toLowerCase();
  let summeSoll = 0, summeIst = 0, offen = 0;
  const zeilen = S.lehrer.filter((l) => (!lehrerF || l.id === lehrerF) && (!suche || (l.name || l.email || "").toLowerCase().includes(suche))).map((l) => {
    const r = fcFuerLehrer(l.id, von, bis);
    const q = letzteQuittung(l.id, von);
    summeSoll += r.soll;
    if (q) summeIst += q.ist; else if (r.soll) offen++;
    const vermerkt = r.fehlend.reduce((a, p) => a + p.fehlt, 0);
    const istOk = q && q.ist >= q.soll;
    if (statusF === "ohne" && (q || !r.soll)) return "";
    if (statusF === "fehlend" && !(q && !istOk)) return "";
    if (statusF === "ok" && !istOk) return "";
    const status = q
      ? (istOk ? `<span class="marke-pill gruen">✓ ${q.ist} von ${q.soll}</span>` : `<span class="marke-pill rot">${q.ist} von ${q.soll}</span>`) + `<div class="unter">bestätigt ${esc(new Date(q.bestaetigt_am).toLocaleDateString("de-DE"))}</div>`
      : (r.soll ? `<span class="marke-pill${laeuft ? "" : " gelb"}">${laeuft ? "Zeitraum läuft" : "noch nicht abgegeben"}</span>` : `<span class="leise">–</span>`);
    return `<tr>
      <td><b>${esc(l.name || l.email)}</b></td>
      <td class="zahlspalte"><b>${r.soll}</b></td>
      <td class="zahlspalte nur-breit">${vermerkt ? `<span class="marke-pill gelb">${vermerkt}</span>` : "–"}</td>
      <td>${status}</td>
      <td class="aktionen"><div class="aktionen-box">
        ${r.soll || q ? `<button class="knopf klein${q ? "" : " haupt"}" data-fcabgabe="${esc(l.id)}" type="button">${q ? "Neu erfassen" : "Abgabe erfassen"}</button>` : ""}
        <a class="knopf klein" href="#fahrchecks?ansicht=stunden&lehrer=${esc(l.id)}&von=${esc(von)}&bis=${esc(bis)}">Stunden</a></div></td>
    </tr>`;
  }).join("");
  return `<div class="kacheln">
      <div class="kachel"><div class="wert">${summeSoll}</div><div class="name">Fahrchecks erwartet (${esc(datumDE(von))}–${esc(datumDE(bis))})</div></div>
      <div class="kachel gruen"><div class="wert">${summeIst}</div><div class="name">davon bestätigt abgegeben</div></div>
      <div class="kachel${offen && !laeuft ? " gold" : ""}"><div class="wert">${offen}</div><div class="name">Fahrlehrer ohne Quittung</div></div>
    </div>
    <div class="karte">
      <div class="karte-kopf"><div class="tabs">${fcTabs("abgaben")}</div></div>
      <div class="filterzeile">
        <input type="search" class="suche" id="fcSuche" placeholder="Fahrlehrer suchen" value="${esc(fristenParam("suche"))}" aria-label="Fahrlehrer suchen">
        <select class="suche" id="fcLehrer" aria-label="Fahrlehrer">${lehrerFilterOptionen(lehrerF, "Alle Fahrlehrer")}</select>
        <select class="suche" id="fcZeitraum" aria-label="Zeitraum">${fcPeriodenOptionen(fristenParam("z") || "jetzt")}</select>
        <select class="suche" id="fcStatus" aria-label="Abgabe-Status">
          <option value="">Alle Abgaben</option><option value="ohne"${statusF === "ohne" ? " selected" : ""}>Noch ohne Quittung</option>
          <option value="fehlend"${statusF === "fehlend" ? " selected" : ""}>Mit fehlenden Fahrchecks</option><option value="ok"${statusF === "ok" ? " selected" : ""}>Vollständig abgegeben</option></select>
      </div>
      <table class="tabelle"><thead><tr><th>Fahrlehrer</th><th class="zahlspalte">Erwartet</th><th class="zahlspalte nur-breit">Als fehlend vermerkt</th><th>Abgabe</th><th></th></tr></thead><tbody>${zeilen || `<tr><td colspan="5" class="leer">Nichts gefunden.</td></tr>`}</tbody></table>
      <p class="leise klein">So geht's: Umschlag des Fahrlehrers zählen, „Abgabe erfassen“, Zahl eintippen. Stimmt sie, ist alles mit einem Klick erledigt. Auch frühere Zeiträume lassen sich nachtragen (Zeitraum oben wählen). Jede Abgabe ist eine Quittung, die nicht geändert werden kann. Stimmt etwas nicht, wird sie neu erfasst; die alte bleibt als Verlauf stehen. Der Fahrlehrer sieht sie in seiner App.</p>
    </div>
    ${renderFcVerlauf()}`;
}

/* ----- Alle Fahrcheck-Stunden: suchen, filtern, ändern, nachtragen ----- */
const FC_TYP = {
  ok: ["gruen", "Alle FC erhalten"], eins: ["gelb", "1 FC fehlt"], zwei: ["rot", "2 FC fehlen"],
  geschenkt: ["", "geschenkt"], offen: ["gelb", "FC noch offen"], nachgereicht: ["blau", "nachgereicht"], keine: ["", "keine FC"],
};
function fcTyp(ft) {
  if (!KR.fcGebucht(ft)) return "keine";
  if (ft.status === "abgebrochen" || ft.status === "nicht erschienen") return "keine";
  if (ft.fc === "v1" || ft.fc === "halb_bewusst" || ft.fc === "eins_ok") return "eins";
  if (ft.fc === "v2") return "zwei";
  if (ft.fc === "geschenkt") return "geschenkt";
  if (ft.fc === "offen") return "offen";
  if (ft.fc === "nachgereicht") return "nachgereicht";
  return "ok";
}
const FC_BUERO = { offen: ["", "noch nicht geprüft"], abgegeben: ["gruen", "abgegeben"], fehlt: ["rot", "fehlt"] };
const FC_MAX_ZEILEN = 300;
function fcStundenListe() {
  const heute = KR.todayISO();
  const [vorVon] = KR.fcVorZeitraum(KR.fcZeitraum(heute)[0]);
  const fruehester = S.termine.reduce((m, t) => (t.datum && t.datum < m ? t.datum : m), heute);
  let von = /^\d{4}-\d\d-\d\d$/.test(fristenParam("von")) ? fristenParam("von") : vorVon;
  if (["bald", "verfallen"].includes(fristenParam("gueltig")) && !fristenParam("von")) von = fruehester; // Gültigkeit betrifft auch ältere Stunden
  if (von < fruehester) von = fruehester; // „alle geladenen“: nicht ab 2000 anzeigen, sondern ab dem ersten vorhandenen Termin
  const bis = /^\d{4}-\d\d-\d\d$/.test(fristenParam("bis")) ? fristenParam("bis") : heute;
  const lehrerF = fristenParam("lehrer");
  const artF = ["fahrstunde", "sonder", "nacht"].includes(fristenParam("art")) ? fristenParam("art") : "";
  const typF = FC_TYP[fristenParam("typ")] ? fristenParam("typ") : "";
  const statusF = FC_BUERO[fristenParam("status")] ? fristenParam("status") : "";
  const gueltigF = ["bald", "verfallen"].includes(fristenParam("gueltig")) ? fristenParam("gueltig") : "";
  const suche = (fristenParam("suche") || "").trim().toLowerCase();
  const richtung = fristenParam("sort") === "auf" ? 1 : -1;
  const alle = [];
  for (const t of S.termine) {
    if (!["fahrstunde", "sonder", "nacht"].includes(t.art) || t.datum < von || t.datum > bis) continue;
    const ft = fcTermin(t);
    const gebucht = KR.fcGebucht(ft);
    if (!gebucht) continue;
    const typ = fcTyp(ft);
    const buero = t.buero_fc_status || "offen";
    if (lehrerF && t.fahrlehrer_id !== lehrerF) continue;
    if (artF && t.art !== artF) continue;
    if (typF && typ !== typF) continue;
    if (statusF && buero !== statusF) continue;
    const erwartet = KR.fcErhalten(ft);
    const g = erwartet ? KR.fcGueltigkeit(t.datum) : { stufe: "ok", bis: KR.fcGueltigBis(t.datum), tage: null };
    if (gueltigF && g.stufe !== gueltigF) continue;
    if (suche) {
      const hay = [schuelerName(t.schueler_id), lehrerName(t.fahrlehrer_id), datumDE(t.datum), t.interessent_name].join(" ").toLowerCase();
      if (!hay.includes(suche)) continue;
    }
    alle.push({ t, ft, gebucht, erwartet, typ, buero, g });
  }
  alle.sort((x, y) => (x.t.datum + (x.t.von || "")).localeCompare(y.t.datum + (y.t.von || "")) * richtung);
  return { alle, von, bis, lehrerF, artF, typF, statusF, gueltigF, suche, richtung };
}
function renderFcStunden() {
  const f = fcStundenListe();
  const zaehl = { erwartet: 0, abgegeben: 0, fehlt: 0, offen: 0 };
  for (const x of f.alle) {
    if (!x.erwartet) continue;
    zaehl.erwartet += x.erwartet;
    if (x.buero === "abgegeben") zaehl.abgegeben += x.erwartet; else if (x.buero === "fehlt") zaehl.fehlt += x.erwartet; else zaehl.offen += x.erwartet;
  }
  const sicht = f.alle.slice(0, FC_MAX_ZEILEN);
  const nVerfallen = f.alle.filter((x) => x.g.stufe === "verfallen").length, nBald = f.alle.filter((x) => x.g.stufe === "bald").length;
  const zeilen = sicht.map(({ t, gebucht, erwartet, typ, buero, g }) => {
    const [tf, tn] = FC_TYP[typ], [bf, bn] = FC_BUERO[buero];
    const knoepfe = erwartet ? [
      buero !== "abgegeben" ? `<button class="knopf klein haupt" data-fcstatus="abgegeben" data-id="${esc(t.id)}" type="button">Abgegeben</button>` : "",
      buero !== "fehlt" ? `<button class="knopf klein" data-fcstatus="fehlt" data-id="${esc(t.id)}" type="button">Fehlt</button>` : "",
      buero === "fehlt" ? `<button class="knopf klein" data-fcnach="${esc(t.id)}" type="button">Nachgereicht</button>` : "",
    ].join("") : "";
    return `<tr>
      <td class="zeitspalte">${esc(datumDE(t.datum))}<div class="unter">${esc(t.von || "")}${t.bis ? "–" + esc(t.bis) : ""}</div>${erwartet ? (g.stufe === "verfallen" ? `<div><span class="marke-pill rot">verfallen ${esc(datumDE(g.bis))}</span></div>` : `<div class="unter">gültig bis ${esc(datumDE(g.bis))}</div>${g.stufe === "bald" ? `<div><span class="marke-pill gelb">läuft bald ab</span></div>` : ""}`) : ""}</td>
      <td><b>${esc(schuelerName(t.schueler_id) || t.interessent_name || "–")}</b><div class="unter nur-unter">${esc(lehrerName(t.fahrlehrer_id))} · ${esc(ARTEN[t.art] || t.art)}</div></td>
      <td class="nur-sehr-breit">${esc(lehrerName(t.fahrlehrer_id))}</td>
      <td class="nur-sehr-breit"><span class="marke-pill">${esc(ARTEN[t.art] || t.art)}</span></td>
      <td class="zahlspalte"><b>${erwartet}</b><span class="leise"> von ${gebucht}</span></td>
      <td><span class="marke-pill ${tf}">${esc(tn)}</span></td>
      <td>${erwartet ? `<span class="marke-pill ${bf}">${esc(bn)}</span>${t.buero_fc_nachgereicht_am ? `<div class="unter">nachgereicht ${esc(datumDE(t.buero_fc_nachgereicht_am))}</div>` : ""}` : `<span class="leise">–</span>`}</td>
      <td class="aktionen"><div class="aktionen-box">${knoepfe}<button class="knopf klein" data-fcbearb="${esc(t.id)}" type="button">Ändern</button></div></td>
    </tr>`;
  }).join("");
  const filterAktiv = f.lehrerF || f.artF || f.typF || f.statusF || f.gueltigF || f.suche || fristenParam("von") || fristenParam("bis");
  const opt = (obj, gew, alle) => `<option value="">${esc(alle)}</option>` + Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === gew ? " selected" : ""}>${esc(v[1])}</option>`).join("");
  return `<div class="kacheln">
      <div class="kachel"><div class="wert">${zaehl.erwartet}</div><div class="name">Fahrchecks erwartet (${esc(datumDE(f.von))}–${esc(datumDE(f.bis))})</div></div>
      <div class="kachel gruen"><div class="wert">${zaehl.abgegeben}</div><div class="name">als abgegeben markiert</div></div>
      <div class="kachel${zaehl.fehlt ? " rot" : ""}"><div class="wert">${zaehl.fehlt}</div><div class="name">als fehlend markiert</div></div>
      <div class="kachel"><div class="wert">${zaehl.offen}</div><div class="name">noch nicht geprüft</div></div>
    </div>
    <div class="karte">
      <div class="karte-kopf"><div class="tabs">${fcTabs("stunden")}</div></div>
      <div class="filterzeile">
        <input type="search" class="suche" id="fcSuche" placeholder="Name oder Datum suchen" value="${esc(fristenParam("suche"))}" aria-label="Fahrchecks suchen">
        <select class="suche" id="fcLehrer" aria-label="Fahrlehrer">${lehrerFilterOptionen(f.lehrerF, "Alle Fahrlehrer")}</select>
        <select class="suche" id="fcArt" aria-label="Stundenart"><option value="">Alle Stundenarten</option>${["fahrstunde", "sonder", "nacht"].map((k) => `<option value="${k}"${k === f.artF ? " selected" : ""}>${esc(ARTEN[k])}</option>`).join("")}</select>
        <select class="suche" id="fcTyp" aria-label="Fahrcheck-Vermerk">${opt(FC_TYP, f.typF, "Alle Fahrcheck-Typen")}</select>
        <select class="suche" id="fcStatus" aria-label="Status im Büro">${opt(FC_BUERO, f.statusF, "Jeder Status")}</select>
        <select class="suche" id="fcGueltig" aria-label="Gültigkeit"><option value="">Jede Gültigkeit</option><option value="bald"${f.gueltigF === "bald" ? " selected" : ""}>Läuft in 60 Tagen ab</option><option value="verfallen"${f.gueltigF === "verfallen" ? " selected" : ""}>Verfallen (älter als 12 Monate)</option></select>
        <label class="feld-klein">von <input type="date" class="suche" id="fcVon" value="${esc(f.von)}"></label>
        <label class="feld-klein">bis <input type="date" class="suche" id="fcBis" value="${esc(f.bis)}"></label>
        <select class="suche" id="fcSort" aria-label="Sortierung"><option value="ab"${f.richtung < 0 ? " selected" : ""}>Neueste zuerst</option><option value="auf"${f.richtung > 0 ? " selected" : ""}>Älteste zuerst</option></select>
        ${filterAktiv ? `<a class="knopf klein" href="#fahrchecks?ansicht=stunden">Filter löschen</a>` : ""}
        <a class="knopf klein" href="#fahrchecks?ansicht=stunden&von=2000-01-01">Alle geladenen Monate</a>
      </div>
      <table class="tabelle"><thead><tr><th>Datum</th><th>Schüler</th><th class="nur-sehr-breit">Fahrlehrer</th><th class="nur-sehr-breit">Art</th><th class="zahlspalte">FC</th><th>Vermerk</th><th>Status Büro</th><th></th></tr></thead>
      <tbody>${zeilen || `<tr><td colspan="8" class="leer">${filterAktiv ? "Keine Stunde passt zu diesem Filter." : "Keine Fahrstunden in diesem Zeitraum."}</td></tr>`}</tbody></table>
      ${f.alle.length > FC_MAX_ZEILEN ? `<p class="leise klein">Angezeigt: die ersten ${FC_MAX_ZEILEN} von ${f.alle.length}. Bitte oben weiter eingrenzen.</p>` : `<p class="leise klein">${f.alle.length} Stunde${f.alle.length === 1 ? "" : "n"}.</p>`}
      <p class="leise klein">Fahrcheck-Zettel (Übungs-, Sonder- und Testfahrten) sind <b>12 Monate</b> ab dem Datum der Stunde gültig. In dieser Liste: <b>${nVerfallen}</b> verfallen, <b>${nBald}</b> laufen in den nächsten 60 Tagen ab.</p>
      <p class="leise klein">„Vermerk Fahrlehrer“ trägt der Fahrlehrer selbst in seiner App ein (z. B. 1 FC vergessen). „Status Büro“ ist deine Kontrolle: abgegeben, fehlt oder noch nicht geprüft. Beides wird zusammen gezählt.</p>
    </div>`;
}
// Status einer Stunde im Büro setzen (ohne aktualisiert_am: sonst überschreibt die Fahrlehrer-App ihre eigenen Vermerke)
async function fcSetzeStatus(id, status, nachAm) {
  const upd = { buero_fc_status: status };
  if (nachAm !== undefined) upd.buero_fc_nachgereicht_am = nachAm || null;
  const res = await supa.from("kalender_termine").update(upd).eq("id", id).select("id");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
  const t = S.termine.find((x) => x.id === id);
  if (t) { Object.assign(t, upd); }
  return true;
}
function pLinkFc(aender) {
  const p = new URLSearchParams((location.hash.split("?")[1]) || "");
  for (const [k, v] of Object.entries(aender)) { if (v) p.set(k, v); else p.delete(k); }
  return "#fahrchecks?" + p.toString();
}
function bindeFcFilter(ziel) {
  const sende = (w) => setzeFilter("fahrchecks", w);
  const su = ziel.querySelector("#fcSuche");
  if (su) {
    let t = null;
    su.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { sende({ suche: su.value.trim() }); const n = $("fcSuche"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250);
    });
  }
  const wahl = [["#fcLehrer", "lehrer"], ["#fcArt", "art"], ["#fcTyp", "typ"], ["#fcStatus", "status"], ["#fcGueltig", "gueltig"], ["#fcSort", "sort"], ["#fcVon", "von"], ["#fcBis", "bis"], ["#fcZeitraum", "z"]];
  for (const [sel, name] of wahl) {
    const e = ziel.querySelector(sel);
    if (e) e.addEventListener("change", () => sende({ [name]: name === "z" && e.value === "jetzt" ? "" : e.value }));
  }
}
function renderFcVerlauf() {
  const lehrerF = fristenParam("lehrer");
  const gefiltert = lehrerF ? S.fcAbgaben.filter((q) => q.fahrlehrer_id === lehrerF) : S.fcAbgaben;
  const liste = gefiltert.slice(0, fristenParam("alle") === "1" || lehrerF ? 200 : 15);
  if (!liste.length) return "";
  return `<div class="karte"><h2>${lehrerF ? "Quittungen von " + esc(lehrerName(lehrerF)) : "Letzte Quittungen"}</h2><table class="tabelle"><thead><tr><th>Zeitraum</th><th>Fahrlehrer</th><th class="zahlspalte">Ergebnis</th><th>Bestätigt</th><th>Notiz</th></tr></thead><tbody>${liste.map((q) => `<tr>
    <td class="zeitspalte">${esc(datumDE(q.zeitraum_von))}–${esc(datumDE(q.zeitraum_bis))}</td>
    <td>${esc(lehrerName(q.fahrlehrer_id))}</td>
    <td class="zahlspalte">${q.ist >= q.soll ? `<span class="marke-pill gruen">${q.ist} von ${q.soll}</span>` : `<span class="marke-pill rot">${q.ist} von ${q.soll}</span>`}</td>
    <td>${esc(new Date(q.bestaetigt_am).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }))}</td>
    <td>${esc(q.notiz || "")}</td></tr>`).join("")}</tbody></table>${!lehrerF && gefiltert.length > 15 && fristenParam("alle") !== "1" ? `<p class="leise klein"><a href="${pLinkFc({ alle: "1" })}">Alle ${gefiltert.length} Quittungen anzeigen</a></p>` : ""}</div>`;
}
function bindeFahrchecks(ziel) {
  bindeFcFilter(ziel);
  ziel.querySelectorAll("[data-fcabgabe]").forEach((b) => b.addEventListener("click", () => fcAbgabeDialog(b.dataset.fcabgabe)));
  ziel.querySelectorAll("[data-fcstatus]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    if (await fcSetzeStatus(b.dataset.id, b.dataset.fcstatus)) { toast(b.dataset.fcstatus === "abgegeben" ? "Als abgegeben markiert ✓" : "Als fehlend markiert"); zeichne(); } else b.disabled = false;
  }));
  ziel.querySelectorAll("[data-fcnach]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    if (await fcSetzeStatus(b.dataset.fcnach, "abgegeben", KR.todayISO())) { toast("Als nachgereicht eingetragen ✓"); zeichne(); } else b.disabled = false;
  }));
  ziel.querySelectorAll("[data-fcbearb]").forEach((b) => b.addEventListener("click", () => fcStundeDialog(b.dataset.fcbearb)));
}
function fcStundeDialog(id) {
  const t = S.termine.find((x) => x.id === id);
  if (!t) return;
  const ft = fcTermin(t);
  const typ = fcTyp(ft);
  const status = t.buero_fc_status || "offen";
  const body = `<p><b>${esc(schuelerName(t.schueler_id) || t.interessent_name || "–")}</b> · ${esc(datumDE(t.datum))} ${esc(t.von || "")}${t.bis ? "–" + esc(t.bis) : ""}<br>
      <span class="leise">${esc(lehrerName(t.fahrlehrer_id))} · ${esc(ARTEN[t.art] || t.art)} · erwartet ${KR.fcErhalten(ft)} von ${KR.fcGebucht(ft)} Fahrcheck${KR.fcGebucht(ft) === 1 ? "" : "s"} · Vermerk des Fahrlehrers: ${esc(FC_TYP[typ][1])}</span></p>
    <div class="formular">
      <label>Status im Büro
        <select name="status">${Object.entries(FC_BUERO).map(([k, v]) => `<option value="${k}"${k === status ? " selected" : ""}>${esc(v[1])}</option>`).join("")}</select></label>
      <label>Nachgereicht am (leer = nicht nachgereicht)
        <input type="date" name="nach" value="${esc(t.buero_fc_nachgereicht_am || "")}"></label>
    </div>
    <p class="leise klein">Den Vermerk des Fahrlehrers (z. B. „1 FC vergessen“) ändert nur er selbst in seiner App; sonst würde seine Eingabe beim nächsten Abgleich überschrieben.</p>`;
  oeffneDialog("Fahrcheck ändern", body, async (form) => {
    const nach = form.nach.value;
    if (nach && !/^\d{4}-\d\d-\d\d$/.test(nach)) { toast("Bitte ein gültiges Datum wählen.", true); return false; }
    if (!(await fcSetzeStatus(id, form.status.value, nach || null))) return false;
    toast("Gespeichert ✓");
    zeichne();
    return true;
  });
}
function fcAbgabeDialog(lehrerId) {
  const [von, bis] = fcPeriode();
  const r = fcFuerLehrer(lehrerId, von, bis);
  const zeilen = r.posten.map((p) => `<tr>
      <td class="zeitspalte">${esc(datumDE(p.datum))} ${esc(p.von || "")}</td>
      <td>${esc(schuelerName(p.sid) || "–")}${p.fc === "nachgereicht" ? ' <span class="marke-pill blau">nachgereicht</span>' : ""}${p.fehlt ? ` <span class="marke-pill gelb">${p.fehlt} vom Fahrlehrer als fehlend vermerkt</span>` : ""}</td>
      <td class="zahlspalte"><b>${p.n}</b></td>
      <td>${p.n ? `<label class="wahl"><input type="checkbox" name="fehlt" value="${esc(p.id)}"> fehlt</label>` : ""}</td></tr>`).join("");
  const body = `<p><b>${esc(lehrerName(lehrerId))}</b> · Zeitraum ${esc(datumDE(von))}–${esc(datumDE(bis))}</p>
    <div class="soll-ist">
      <div><div class="leise">Erwartet</div><div class="gross-zahl">${r.soll}</div></div>
      <label><div class="leise">Gezählt im Umschlag</div><input type="number" name="ist" min="0" max="999" inputmode="numeric" class="gross-eingabe" required></label>
      <div id="fcErgebnis" class="fc-ergebnis"></div>
    </div>
    <details${r.posten.length > 20 ? "" : " open"}><summary>Stunden im Zeitraum (${r.posten.length})</summary>
      <table class="tabelle"><thead><tr><th>Datum</th><th>Schüler</th><th class="zahlspalte">FC</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></details>
    <div class="formular" style="margin-top:12px"><label class="voll">Notiz (optional)<input type="text" name="notiz" maxlength="200"></label></div>`;
  const dlg = oeffneDialog("Fahrcheck-Abgabe erfassen", body, async (form) => {
    const ist = Number(form.ist.value);
    if (form.ist.value === "" || !Number.isInteger(ist) || ist < 0) { toast("Bitte die gezählte Zahl eintragen.", true); return false; }
    const fehlend = [...form.querySelectorAll("input[name=fehlt]:checked")].map((c) => c.value);
    if (ist < r.soll && !fehlend.length && !(await bestaetige("Es fehlen Fahrchecks", `Es fehlen ${r.soll - ist}. Ohne Angabe, bei welchen Stunden, weiß der Fahrlehrer nicht, was fehlt. Trotzdem speichern?`, "Trotzdem speichern"))) return false;
    const res = await supa.from("fc_abgaben").insert({ fahrschule_id: S.fsId, fahrlehrer_id: lehrerId, zeitraum_von: von, zeitraum_bis: bis, soll: r.soll, ist, fehlend, notiz: (form.notiz.value || "").trim() || null, bestaetigt_von: S.user.id }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
    S.fcAbgaben.unshift(res.data[0]);
    // Büro-Status je Termin setzen: angekreuzt = fehlt, Rest = abgegeben
    const ids = r.posten.filter((p) => p.n && p.fc !== "nachgereicht").map((p) => p.id);
    const ok = ids.filter((id) => !fehlend.includes(id));
    // Bewusst ohne aktualisiert_am: sonst hält die Fahrlehrer-App die Zeile für neuer und überschreibt
    // ihre eigenen, vielleicht noch nicht hochgeladenen Fahrcheck-Vermerke.
    const a = ok.length ? await supa.from("kalender_termine").update({ buero_fc_status: "abgegeben" }).in("id", ok) : { error: null };
    const b = fehlend.length ? await supa.from("kalender_termine").update({ buero_fc_status: "fehlt" }).in("id", fehlend) : { error: null };
    if (a.error || b.error) toast("Quittung gespeichert, aber der Status einzelner Stunden nicht: " + (a.error || b.error).message, true);
    else toast(ist >= r.soll ? `Abgabe bestätigt: ${ist} von ${r.soll} ✓` : `Abgabe gespeichert: ${r.soll - ist} Fahrcheck${r.soll - ist === 1 ? "" : "s"} fehlen`);
    S.termine.forEach((t) => { if (ok.includes(t.id)) t.buero_fc_status = "abgegeben"; if (fehlend.includes(t.id)) t.buero_fc_status = "fehlt"; });
    zeichne();
    return true;
  }, "Abgabe bestätigen");
  const feld = dlg.querySelector("input[name=ist]");
  const zeig = () => {
    const e = dlg.querySelector("#fcErgebnis");
    if (feld.value === "") { e.textContent = ""; e.className = "fc-ergebnis"; return; }
    const ist = Number(feld.value);
    if (ist === r.soll) { e.textContent = "✓ Stimmt genau"; e.className = "fc-ergebnis gut"; }
    else if (ist < r.soll) { e.textContent = `Es fehlen ${r.soll - ist}. Bitte unten die Stunden ankreuzen.`; e.className = "fc-ergebnis schlecht"; dlg.querySelector("details").open = true; }
    else { e.textContent = `${ist - r.soll} mehr als erwartet (z. B. nachgereicht). Bitte in der Notiz vermerken.`; e.className = "fc-ergebnis schlecht"; }
  };
  feld.addEventListener("input", zeig);
  feld.focus();
}

/* ---------- Verkäufe & Provision ---------- */
const V_TYP = { akademie: "Fahr-Akademie", simulator: "Simulator-Flat" };
const V_STATUS = { empfohlen: ["gelb", "empfohlen"], zugangsdaten_ausgegeben: ["blau", "Zugang ausgegeben"], bezahlt: ["gruen", "bezahlt"], storniert: ["", "storniert"] };
function vkKonfig() { return ((S.fs && S.fs.konfiguration) || {}).akademieVermittlung || {}; }
function vkVorschlag(typ) {
  const c = vkKonfig();
  const b = typ === "simulator" ? c.betragSimulator : c.betragAkademie;
  return b != null && b !== "" ? Number(b) : (typ === "akademie" ? 100 : 149); // Akademie 100 € (Serband 08.10.2026), Simulator-Flat 149 € (Webseite)
}
function monatVon(iso) { return String(iso || "").slice(0, 7); }
function renderVerkaeufe() {
  const monat = /^\d{4}-\d\d$/.test(fristenParam("monat")) ? fristenParam("monat") : KR.todayISO().slice(0, 7);
  const lehrerF = fristenParam("lehrer");
  const statusF = fristenParam("status");
  let liste = S.verkaeufe.filter((v) => monatVon(v.erstellt_am) === monat || (v.status === "bezahlt" && monatVon(v.aktualisiert_am) === monat) || (v.status !== "bezahlt" && v.status !== "storniert"));
  if (lehrerF) liste = liste.filter((v) => v.fahrlehrer_id === lehrerF);
  if (statusF) liste = liste.filter((v) => v.status === statusF);
  const bezahltMonat = S.verkaeufe.filter((v) => v.status === "bezahlt" && monatVon(v.aktualisiert_am || v.erstellt_am) === monat);
  const umsatz = bezahltMonat.reduce((a, v) => a + Number(v.betrag || 0), 0);
  const provOffen = S.provisionen.filter((p) => p.status === "offen");
  const offenSumme = provOffen.reduce((a, p) => a + Number(p.betrag || 0), 0);
  const monate = [...new Set([KR.todayISO().slice(0, 7), ...S.verkaeufe.map((v) => monatVon(v.erstellt_am))])].sort().reverse().slice(0, 12);
  const monatName = (m) => KR.parseISO(m + "-01").toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const zeilen = liste.map((v) => {
    const [sf, st] = V_STATUS[v.status] || ["", v.status];
    const anteil = v.aufteilung && v.aufteilung.fahrlehrer != null ? euro(v.aufteilung.fahrlehrer) : "–";
    const knoepfe = [];
    if (v.status === "empfohlen") knoepfe.push(`<button class="knopf klein" data-vzugang="${esc(v.id)}" type="button">Zugang ausgegeben</button>`);
    if (v.status !== "bezahlt" && v.status !== "storniert") knoepfe.push(`<button class="knopf klein haupt" data-vbezahlt="${esc(v.id)}" type="button">Bezahlt</button>`);
    if (v.status === "storniert") knoepfe.push(`<button class="knopf klein" data-vwieder="${esc(v.id)}" type="button">Wieder öffnen</button>`);
    if (v.status !== "storniert") knoepfe.push(`<button class="knopf klein" data-vstorno="${esc(v.id)}" type="button">${v.status === "bezahlt" ? "Zurücknehmen" : "Stornieren"}</button>`);
    return `<tr>
      <td><b>${esc(v.schueler_name || schuelerName(v.schueler_id))}</b><div class="unter">${esc(datumDE(String(v.erstellt_am).slice(0, 10)))} · ${v.fahrlehrer_id ? "von " + esc(v.fahrlehrer_name || lehrerName(v.fahrlehrer_id)) : "Büro"}</div></td>
      <td><span class="marke-pill ${v.typ === "simulator" ? "blau" : "gruen"}">${esc(V_TYP[v.typ] || v.typ)}</span></td>
      <td><span class="marke-pill ${sf}">${esc(st)}</span></td>
      <td class="zahlspalte">${v.betrag != null ? euro(v.betrag) : "–"}</td>
      <td class="zahlspalte nur-breit">${anteil}</td>
      <td class="aktionen"><div class="aktionen-box">${knoepfe.join("")}</div></td></tr>`;
  }).join("");
  const provProLehrer = {};
  for (const p of provOffen) provProLehrer[p.fahrlehrer_id] = (provProLehrer[p.fahrlehrer_id] || 0) + Number(p.betrag || 0);
  const provZeilen = Object.entries(provProLehrer).map(([id, sum]) => `<tr><td><b>${esc(lehrerName(id))}</b></td>
    <td class="zahlspalte">${S.provisionen.filter((p) => p.status === "offen" && p.fahrlehrer_id === id).length}</td><td class="zahlspalte"><b>${euro(sum)}</b></td>
    <td class="aktionen"><div class="aktionen-box"><button class="knopf klein" data-pausz="${esc(id)}" type="button">Als ausgezahlt markieren</button></div></td></tr>`).join("");
  const c = vkKonfig();
  const splitText = KR.aufteilung(100, c.splitKollege)
    ? (istAdmin() ? `Aufteilung je Verkauf: Fahrlehrer ${c.splitKollege.fahrlehrer} %, Fahrschule ${c.splitKollege.fahrschule} %, Plattform ${c.splitKollege.plattform} %, Akademie ${c.splitKollege.akademie} %.`
      : `Provision für den vermittelnden Fahrlehrer: ${c.splitKollege.fahrlehrer} % des Betrags.`)
    : "Die Aufteilung (Fahrlehrer, Fahrschule, Serband) ist noch nicht festgelegt. Bis dahin wird nur der Betrag gespeichert, ohne Provision.";
  const sel = (id, opts) => `<select class="suche" id="${id}">${opts}</select>`;
  return `<div class="kacheln">
      <div class="kachel gruen"><div class="wert">${bezahltMonat.length}</div><div class="name">verkauft (bezahlt) im ${esc(monatName(monat))}</div></div>
      <div class="kachel"><div class="wert">${euro(umsatz)}</div><div class="name">Umsatz Akademie & Simulator</div></div>
      <div class="kachel gold"><div class="wert">${euro(offenSumme)}</div><div class="name">Provision an Fahrlehrer offen</div></div>
      <div class="kachel${S.verkaeufe.filter((v) => v.status === "empfohlen").length ? " rot" : ""}"><div class="wert">${S.verkaeufe.filter((v) => v.status === "empfohlen").length}</div><div class="name">neue Empfehlungen</div></div>
    </div>
    <div class="karte">
      <div class="karte-kopf"><div class="knopfreihe">
        ${sel("vMonat", monate.map((m) => `<option value="${m}"${m === monat ? " selected" : ""}>${esc(monatName(m))}</option>`).join(""))}
        ${sel("vLehrer", `<option value="">Alle Fahrlehrer</option>` + S.lehrer.map((l) => `<option value="${esc(l.id)}"${l.id === lehrerF ? " selected" : ""}>${esc(l.name || l.email)}</option>`).join(""))}
        ${sel("vStatus", `<option value="">Alle Stände</option>` + Object.entries(V_STATUS).map(([k, [, n]]) => `<option value="${k}"${k === statusF ? " selected" : ""}>${n}</option>`).join(""))}
      </div><button class="knopf haupt" id="vNeu" type="button">+ Verkauf erfassen</button></div>
      <p class="leise klein">Fahrlehrer empfehlen in ihrer App („Akademie empfehlen“, „Simulator empfehlen“). Hier sieht das Büro, von wem es kam, gibt den Zugang aus und trägt die Zahlung ein. Bei „bezahlt“ wird die Provision des Fahrlehrers automatisch gebucht.</p>
      ${liste.length ? `<table class="tabelle"><thead><tr><th>Schüler</th><th>Was</th><th>Stand</th><th class="zahlspalte">Betrag</th><th class="zahlspalte nur-breit">Provision</th><th></th></tr></thead><tbody>${zeilen}</tbody></table>` : `<p class="leer">Keine Verkäufe in dieser Auswahl.</p>`}
      <p class="leise klein">${esc(splitText)}</p>
    </div>
    <div class="karte"><h2>Offene Provisionen der Fahrlehrer</h2>
      ${provZeilen ? `<table class="tabelle"><thead><tr><th>Fahrlehrer</th><th class="zahlspalte">Verkäufe</th><th class="zahlspalte">Summe</th><th></th></tr></thead><tbody>${provZeilen}</tbody></table>` : `<p class="leer">Keine offenen Provisionen.</p>`}
    </div>`;
}
function bindeVerkaeufe(ziel) {
  ziel.querySelector("#vMonat").addEventListener("change", (e) => setzeFilter("verkaeufe", { monat: e.target.value }));
  ziel.querySelector("#vLehrer").addEventListener("change", (e) => setzeFilter("verkaeufe", { lehrer: e.target.value }));
  ziel.querySelector("#vStatus").addEventListener("change", (e) => setzeFilter("verkaeufe", { status: e.target.value }));
  ziel.querySelector("#vNeu").addEventListener("click", verkaufNeuDialog);
  ziel.querySelectorAll("[data-vzugang]").forEach((b) => b.addEventListener("click", () => verkaufStatus(b.dataset.vzugang, { status: "zugangsdaten_ausgegeben" }, "Zugang als ausgegeben vermerkt")));
  ziel.querySelectorAll("[data-vbezahlt]").forEach((b) => b.addEventListener("click", () => verkaufBezahltDialog(b.dataset.vbezahlt)));
  ziel.querySelectorAll("[data-vwieder]").forEach((b) => b.addEventListener("click", () => verkaufWiederOeffnen(b.dataset.vwieder)));
  ziel.querySelectorAll("[data-vstorno]").forEach((b) => b.addEventListener("click", () => verkaufStorno(b.dataset.vstorno)));
  ziel.querySelectorAll("[data-pausz]").forEach((b) => b.addEventListener("click", () => provisionAusgezahlt(b.dataset.pausz)));
}
async function verkaufStatus(id, werte, meldung) {
  werte.aktualisiert_am = new Date().toISOString();
  const res = await supa.from("fahrschule_empfehlungen").update(werte).eq("id", id).select("*");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return null; }
  const i = S.verkaeufe.findIndex((v) => v.id === id);
  if (i >= 0) S.verkaeufe[i] = res.data[0];
  if (meldung) { toast(meldung); zeichne(); }
  return res.data[0];
}
function verkaufBezahltDialog(id) {
  const v = S.verkaeufe.find((x) => x.id === id);
  if (!v) return;
  const split = vkKonfig().splitKollege;
  const body = `<p>${esc(V_TYP[v.typ] || v.typ)} für <b>${esc(v.schueler_name || schuelerName(v.schueler_id))}</b>${v.fahrlehrer_id ? ", vermittelt von " + esc(v.fahrlehrer_name || lehrerName(v.fahrlehrer_id)) : ""}.</p>
    <div class="formular"><label>Bezahlter Betrag (€)<input type="number" name="betrag" min="0" step="1" value="${vkVorschlag(v.typ)}" required></label></div>
    <div id="vSplit" class="split"></div>`;
  const dlg = oeffneDialog("Zahlung eintragen", body, async (form) => {
    const betrag = Number(form.betrag.value);
    if (!(betrag >= 0) || form.betrag.value === "") { toast("Bitte den Betrag eintragen.", true); return false; }
    const auf = v.fahrlehrer_id ? KR.aufteilung(betrag, split) : null;
    const neu = await verkaufStatus(id, { status: "bezahlt", betrag, aufteilung: auf });
    if (!neu) return false;
    if (auf && auf.fahrlehrer > 0 && !S.provisionen.some((p) => p.empfehlung_id === id || (p.schueler_id === v.schueler_id && p.typ === v.typ && p.fahrlehrer_id === v.fahrlehrer_id))) {
      const res = await supa.from("provisionen").insert({ fahrlehrer_id: v.fahrlehrer_id, fahrschule_id: S.fsId, typ: v.typ, schueler_id: v.schueler_id, betrag: auf.fahrlehrer, status: "offen" }).select("*");
      if (res.error) toast("Zahlung gespeichert, Provision aber nicht: " + res.error.message, true);
      else S.provisionen.unshift(res.data[0]);
    }
    if (v.typ === "simulator" && v.schueler_id) await supa.from("schueler").update({ hat_simulator: true }).eq("id", v.schueler_id);
    toast(auf ? `Bezahlt. Provision ${euro(auf.fahrlehrer)} für ${lehrerName(v.fahrlehrer_id)} gebucht.` : "Bezahlt eingetragen");
    zeichne();
    return true;
  }, "Bezahlt speichern");
  const feld = dlg.querySelector("input[name=betrag]");
  const zeig = () => {
    const box = dlg.querySelector("#vSplit");
    if (!v.fahrlehrer_id) { box.innerHTML = `<p class="leise klein">Direktverkauf durch das Büro: keine Provision.</p>`; return; }
    const a = KR.aufteilung(Number(feld.value || 0), split);
    box.innerHTML = a ? `<table class="tabelle"><tbody>
        <tr><td>${esc(v.fahrlehrer_name || lehrerName(v.fahrlehrer_id))} (Provision)</td><td class="zahlspalte"><b>${euro(a.fahrlehrer)}</b></td></tr>
        <tr><td>Fahrschule</td><td class="zahlspalte">${euro(a.fahrschule)}</td></tr>
        ${istAdmin() ? `<tr><td>Plattform</td><td class="zahlspalte">${euro(a.plattform)}</td></tr><tr><td>Akademie</td><td class="zahlspalte">${euro(a.akademie)}</td></tr>` : ""}
      </tbody></table>` : `<p class="leise klein">Aufteilung noch nicht festgelegt: Betrag wird gespeichert, Provision nicht.</p>`;
  };
  feld.addEventListener("input", zeig);
  zeig();
}
async function verkaufStorno(id) {
  const v = S.verkaeufe.find((x) => x.id === id);
  if (!v) return;
  const war = v.status === "bezahlt";
  if (!(await bestaetige(war ? "Zahlung zurücknehmen?" : "Empfehlung stornieren?", war ? "Betrag und Aufteilung werden zurückgesetzt. Eine schon gebuchte Provision bitte bei „Offene Provisionen“ prüfen." : "Die Empfehlung wird als storniert markiert.", "Ja"))) return;
  const neu = await verkaufStatus(id, { status: "storniert", betrag: null, aufteilung: null }, war ? "Zurückgenommen" : "Storniert");
  if (!neu) return;
  // Eine noch nicht ausgezahlte Provision zu dieser Zahlung fällt mit weg; schon Ausgezahltes bleibt und wird gemeldet
  const passend = S.provisionen.filter((p) => p.schueler_id === v.schueler_id && p.typ === v.typ && p.fahrlehrer_id === v.fahrlehrer_id);
  const offen = passend.filter((p) => p.status === "offen");
  if (offen.length) {
    const res = await supa.from("provisionen").update({ status: "storniert" }).in("id", offen.map((p) => p.id)).select("id");
    if (res.error) toast("Zahlung zurückgenommen, Provision aber nicht: " + res.error.message, true);
    else { offen.forEach((p) => { p.status = "storniert"; }); zeichne(); }
  }
  if (passend.some((p) => p.status === "ausgezahlt")) toast("Achtung: Die Provision wurde schon ausgezahlt und muss mit dem Fahrlehrer geklärt werden.", true);
}
async function verkaufWiederOeffnen(id) {
  await verkaufStatus(id, { status: "empfohlen" }, "Wieder geöffnet");
}
async function provisionAusgezahlt(lehrerId) {
  const offen = S.provisionen.filter((p) => p.status === "offen" && p.fahrlehrer_id === lehrerId);
  const summe = offen.reduce((a, p) => a + Number(p.betrag || 0), 0);
  if (!(await bestaetige("Provision ausgezahlt?", `${euro(summe)} an ${lehrerName(lehrerId)} (${offen.length} Verkäufe) als ausgezahlt markieren?`, "Ja, ausgezahlt"))) return;
  const res = await supa.from("provisionen").update({ status: "ausgezahlt" }).in("id", offen.map((p) => p.id)).select("id");
  if (res.error) { toast("Nicht gespeichert: " + res.error.message, true); return; }
  offen.forEach((p) => { p.status = "ausgezahlt"; });
  toast(`${euro(summe)} als ausgezahlt vermerkt`);
  zeichne();
}
function verkaufNeuDialog() {
  const body = `<div class="formular">
      <label class="voll">Schüler<select name="schueler_id" required><option value="">– bitte wählen –</option>${schuelerOptionen("")}</select></label>
      <label>Was<select name="typ"><option value="akademie">Fahr-Akademie</option><option value="simulator">Simulator-Flat</option></select></label>
      <label>Verkauft von<select name="fahrlehrer_id"><option value="">Büro (keine Provision)</option>${S.lehrer.map((l) => `<option value="${esc(l.id)}">${esc(l.name || l.email)}</option>`).join("")}</select></label>
    </div>`;
  oeffneDialog("Verkauf erfassen", body, async (form) => {
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.schueler_id) { toast("Bitte einen Schüler wählen.", true); return false; }
    const doppelt = S.verkaeufe.find((v) => v.schueler_id === d.schueler_id && v.typ === d.typ && v.status !== "storniert");
    if (doppelt && !(await bestaetige("Schon vorhanden", `Für diesen Schüler gibt es schon einen Eintrag (${(V_STATUS[doppelt.status] || ["", doppelt.status])[1]}). Trotzdem neu anlegen?`, "Ja"))) return false;
    const res = await supa.from("fahrschule_empfehlungen").insert({
      fahrschule_id: S.fsId, schueler_id: d.schueler_id, schueler_name: schuelerName(d.schueler_id), typ: d.typ, status: "empfohlen",
      fahrlehrer_id: d.fahrlehrer_id || null, fahrlehrer_name: d.fahrlehrer_id ? lehrerName(d.fahrlehrer_id) : null,
    }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
    S.verkaeufe.unshift(res.data[0]);
    toast("Verkauf erfasst"); zeichne(); return true;
  });
}

/* ---------- Zahlen (für die Fahrschul-Leitung) ---------- */
function letzteMonate(n) {
  const out = [], d = KR.parseISO(KR.todayISO().slice(0, 7) + "-01");
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(KR.dateISO(x).slice(0, 7)); }
  return out;
}
function monatKurz(m) { return KR.parseISO(m + "-01").toLocaleDateString("de-DE", { month: "short" }).replace(".", ""); }
// Praxis-Ergebnisse aus beiden Quellen (Fahrlehrer-App und Prüfungstafel), je Schüler und Tag nur einmal
function praxisErgebnisse() {
  const map = {};
  for (const e of S.pruefungen) {
    const ok = e.result === "pass" || e.result === "bestanden", nein = e.result === "fail" || e.result === "nicht_bestanden";
    if ((ok || nein) && e.datum) map[e.schueler_id + "|" + e.datum] = { datum: e.datum, ok };
  }
  for (const p of S.pruefungstermine) {
    if (p.art !== "praxis" || (p.status !== "bestanden" && p.status !== "nicht_bestanden")) continue;
    map[p.schueler_id + "|" + p.datum] = { datum: p.datum, ok: p.status === "bestanden" };
  }
  return Object.values(map);
}
function saeulenSVG(punkte, opt) {
  // punkte: [{x, wert, text, tip}] – eine Reihe, eine Farbe, Grundlinie bei 0
  const B = 720, H = 240, unten = 28, oben = 22, max = Math.max(opt.max || 0, ...punkte.map((p) => p.wert || 0), 1);
  const breite = B / punkte.length, balken = Math.min(breite * 0.6, 44);
  const y = (v) => H - unten - (v / max) * (H - unten - oben);
  const fmt = (v) => (opt.max === 100 ? Math.round(v) + " %" : String(Math.round(v * 10) / 10).replace(".", ","));
  const linien = [0, 0.5, 1].map((f) => `<line x1="0" x2="${B}" y1="${y(max * f)}" y2="${y(max * f)}" class="d-gitter"/>${f ? `<text x="2" y="${y(max * f) - 4}" class="d-skala">${fmt(max * f)}</text>` : ""}`).join("");
  const saeulen = punkte.map((p, i) => {
    const cx = breite * i + breite / 2;
    const hoch = p.wert == null ? 0 : Math.max(H - unten - y(p.wert), p.wert > 0 ? 3 : 0);
    const rect = !p.wert ? "" : `<path class="d-balken" d="M${cx - balken / 2},${H - unten} v${-Math.max(hoch - 4, 0)} q0,-4 4,-4 h${balken - 8} q4,0 4,4 v${Math.max(hoch - 4, 0)} z"/>`;
    const label = p.zeigen && p.wert != null ? `<text x="${cx}" y="${y(p.wert) - 7}" class="d-wert">${esc(p.text)}</text>` : "";
    return `<g class="d-punkt" tabindex="0" data-tip="${esc(p.tip)}"><rect x="${breite * i}" y="0" width="${breite}" height="${H}" fill="transparent"/>${rect}${label}<text x="${cx}" y="${H - 8}" class="d-achse">${esc(p.x)}</text></g>`;
  }).join("");
  return `<svg viewBox="0 0 ${B} ${H}" class="diagramm" role="img" aria-label="${esc(opt.titel)}">${linien}${saeulen}</svg>`;
}
function balkenListe(zeilen, max) {
  max = Math.max(max || 0, ...zeilen.map((z) => z.wert), 1);
  return `<div class="hbalken">${zeilen.map((z) => `<div class="hb-zeile" data-tip="${esc(z.tip)}" tabindex="0">
    <span class="hb-name">${esc(z.name)}</span><span class="hb-spur"><span class="hb-balken" style="width:${(z.wert / max) * 100}%"></span></span><span class="hb-wert">${esc(z.text)}</span></div>`).join("")}</div>`;
}
function tabelleAus(kopf, zeilen) {
  return `<details class="als-tabelle"><summary>Als Tabelle</summary><table class="tabelle"><thead><tr>${kopf.map((k, i) => `<th${i ? ' class="zahlspalte"' : ""}>${esc(k)}</th>`).join("")}</tr></thead><tbody>${zeilen.map((z) => `<tr>${z.map((v, i) => `<td${i ? ' class="zahlspalte"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
}
function renderZahlen() {
  const heute = KR.todayISO(), monate = letzteMonate(12), dieser = monate[11], vorher = monate[10];
  // Anmeldungen: Vertragsdatum, sonst Ausbildungsbeginn aus der Fahrlehrer-App (TT.MM.JJJJ).
  // Nicht der Tag der Eingabe im Kompass: beim ersten Übertragen wären sonst alle im selben Monat.
  const anm = {};
  let ohneDatum = 0;
  for (const x of S.schueler) {
    let m = x.vertrag_am ? String(x.vertrag_am).slice(0, 7) : "";
    const b = !m && x.ausbildung && String(x.ausbildung.beginn || "").match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (b) m = `${b[3]}-${b[2].padStart(2, "0")}`;
    if (m) anm[m] = (anm[m] || 0) + 1; else ohneDatum++;
  }
  // Bestehensquote Praxis je Monat
  const erg = praxisErgebnisse(), quote = {};
  for (const e of erg) { const m = e.datum.slice(0, 7); quote[m] = quote[m] || { ok: 0, n: 0 }; quote[m].n++; if (e.ok) quote[m].ok++; }
  const q3 = monate.slice(9).reduce((a, m) => ({ ok: a.ok + ((quote[m] || {}).ok || 0), n: a.n + ((quote[m] || {}).n || 0) }), { ok: 0, n: 0 });
  // Auslastung: Unterrichtseinheiten je Fahrlehrer in diesem Monat (gefahren bis heute)
  const ue = {}, ueGesamt = { v: 0 };
  for (const t of S.termine) {
    if (!t.datum || t.datum.slice(0, 7) !== dieser || t.datum > heute || t.art === "block") continue;
    const p = t.payload || {};
    if ((p.status || t.status) === "abgebrochen") continue;
    const u = KR.ueOf(t.art, t.von, t.bis, p.tatsaechlicheDauer);
    ue[t.fahrlehrer_id] = (ue[t.fahrlehrer_id] || 0) + u; ueGesamt.v += u;
  }
  const f = zaehleFristen();
  const provOffen = S.provisionen.filter((p) => p.status === "offen").reduce((a, p) => a + Number(p.betrag || 0), 0);
  const fcFehlt = S.fcAbgaben.filter((q) => q.ist < q.soll).reduce((a, q) => a + (q.soll - q.ist), 0);
  const verkaufMonat = S.verkaeufe.filter((v) => v.status === "bezahlt" && monatVon(v.aktualisiert_am || v.erstellt_am) === dieser);
  const diff = (anm[dieser] || 0) - (anm[vorher] || 0);
  const kacheln = `<div class="kacheln">
    <div class="kachel"><div class="wert">${anm[dieser] || 0}</div><div class="name">Anmeldungen im ${esc(monatKurz(dieser))}${anm[vorher] != null || diff ? ` <span class="leise">(${diff >= 0 ? "+" : ""}${diff} zum Vormonat)</span>` : ""}</div></div>
    <div class="kachel gruen"><div class="wert">${q3.n ? Math.round(q3.ok / q3.n * 100) + " %" : "–"}</div><div class="name">Bestehensquote Praxis, 3 Monate (${q3.ok} von ${q3.n})</div></div>
    <div class="kachel"><div class="wert">${zahlDE(ueGesamt.v)}</div><div class="name">Unterrichtseinheiten im ${esc(monatKurz(dieser))} (bis heute)</div></div>
    <div class="kachel${f.gesperrt ? " rot" : ""}"><div class="wert">${euro(f.gesperrt * reaktBetrag())}</div><div class="name">offene Reaktivierungen</div></div>
  </div>`;
  const anmPunkte = monate.map((m, i) => ({ x: monatKurz(m), wert: anm[m] || 0, text: String(anm[m] || 0), zeigen: i === 11 || i === 10, tip: `${monatKurz(m)}: ${anm[m] || 0} Anmeldungen` }));
  const qPunkte = monate.map((m, i) => { const v = quote[m]; return { x: monatKurz(m), wert: v ? Math.round(v.ok / v.n * 100) : null, text: v ? Math.round(v.ok / v.n * 100) + " %" : "", zeigen: !!v && i >= 9, tip: v ? `${monatKurz(m)}: ${Math.round(v.ok / v.n * 100)} % (${v.ok} von ${v.n} bestanden)` : `${monatKurz(m)}: keine Prüfungen` }; });
  const lehrerZeilen = S.lehrer.map((l) => ({ name: l.name || l.email, wert: ue[l.id] || 0, text: zahlDE(ue[l.id] || 0, 0) + " UE", tip: `${l.name || l.email}: ${zahlDE(ue[l.id] || 0, 1)} Unterrichtseinheiten` })).sort((a, b) => b.wert - a.wert);
  const hinweis = S.lehrer.length <= 1 ? `<p class="leise klein">Hinweis: Zahlen sind nur so vollständig wie die Daten im Kompass. Solange nicht alle Fahrlehrer den Kompass nutzen, fehlen ihre Stunden.</p>` : "";
  return kacheln + `<div class="raster zwei">
    <div class="karte"><h2>Anmeldungen je Monat</h2>${saeulenSVG(anmPunkte, { titel: "Anmeldungen je Monat, letzte 12 Monate" })}
      ${ohneDatum ? `<p class="leise klein">${ohneDatum} Schüler ohne Vertragsdatum oder Ausbildungsbeginn sind nicht mitgezählt.</p>` : ""}
      ${tabelleAus(["Monat", "Anmeldungen"], monate.map((m) => [monatKurz(m) + " " + m.slice(0, 4), anm[m] || 0]))}</div>
    <div class="karte"><h2>Bestehensquote Praxis</h2>${saeulenSVG(qPunkte, { titel: "Bestehensquote Praxisprüfung je Monat in Prozent", max: 100 })}
      ${tabelleAus(["Monat", "Bestanden", "Prüfungen", "Quote"], monate.map((m) => { const v = quote[m] || { ok: 0, n: 0 }; return [monatKurz(m) + " " + m.slice(0, 4), v.ok, v.n, v.n ? Math.round(v.ok / v.n * 100) + " %" : "–"]; }))}</div>
  </div>
  <div class="raster zwei">
    <div class="karte"><h2>Auslastung der Fahrlehrer im ${esc(monatKurz(dieser))}</h2>${balkenListe(lehrerZeilen)}${hinweis}</div>
    <div class="karte"><h2>Offenes Geld und Verkäufe</h2>
      <table class="tabelle"><tbody>
        <tr><td>Reaktivierungen überfällig (${f.gesperrt} × ${euro(reaktBetrag())})</td><td class="zahlspalte"><b>${euro(f.gesperrt * reaktBetrag())}</b></td></tr>
        <tr><td>Reaktivierung fällig, noch nicht geprüft</td><td class="zahlspalte">${f.pruefen} Schüler</td></tr>
        <tr><td>Fahrchecks fehlend laut Quittungen</td><td class="zahlspalte">${fcFehlt}</td></tr>
        <tr><td>Provision an Fahrlehrer offen</td><td class="zahlspalte">${euro(provOffen)}</td></tr>
        <tr><td>Akademie & Simulator verkauft im ${esc(monatKurz(dieser))}</td><td class="zahlspalte">${verkaufMonat.length} · ${euro(verkaufMonat.reduce((a, v) => a + Number(v.betrag || 0), 0))}</td></tr>
      </tbody></table></div>
  </div><div id="tip" class="tip" hidden></div>`;
}
function bindeZahlen(ziel) {
  const tip = ziel.querySelector("#tip");
  const zeig = (el, x, y) => { tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = x + 14 + "px"; tip.style.top = y + 14 + "px"; };
  ziel.querySelectorAll("[data-tip]").forEach((el) => {
    el.addEventListener("mousemove", (e) => zeig(el, e.clientX, e.clientY));
    el.addEventListener("mouseleave", () => { tip.hidden = true; });
    el.addEventListener("focus", () => { const r = el.getBoundingClientRect(); zeig(el, r.left, r.top); });
    el.addEventListener("blur", () => { tip.hidden = true; });
  });
}

/* ---------- Fahrlehrer & Zugänge ---------- */
async function adminFunktion(body) {
  const { data: sd } = await supa.auth.getSession();
  const token = sd && sd.session ? sd.session.access_token : null;
  const { data, error } = await supa.functions.invoke("admin-create-account", { body: Object.assign({}, body, { requester_token: token }) });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
  return data;
}
function renderTeam() {
  const heute = KR.todayISO(), monat = heute.slice(0, 7);
  const ue = {}, schuelerZahl = {};
  for (const t of S.termine) if (t.datum && t.datum.slice(0, 7) === monat && t.datum <= heute && t.art !== "block") ue[t.fahrlehrer_id] = (ue[t.fahrlehrer_id] || 0) + KR.ueOf(t.art, t.von, t.bis, (t.payload || {}).tatsaechlicheDauer);
  for (const x of aktiveSchueler()) if (x.fahrlehrer_id) schuelerZahl[x.fahrlehrer_id] = (schuelerZahl[x.fahrlehrer_id] || 0) + 1;
  const admin = istAdmin();
  const zeile = (p, mitZahlen) => `<tr>
      <td><b>${esc(p.name || "–")}</b><div class="unter">${esc(p.email || "")}</div></td>
      <td>${esc(ROLLEN[p.rolle] || (p.rolle === "fahrlehrer" ? "Fahrlehrer" : p.rolle))}</td>
      ${mitZahlen ? `<td class="zahlspalte">${schuelerZahl[p.id] || 0}</td><td class="zahlspalte">${zahlDE(ue[p.id] || 0)}</td>` : ""}
      <td>${p.aktiv === false ? '<span class="marke-pill rot">gesperrt</span>' : '<span class="marke-pill gruen">aktiv</span>'}</td>
      <td class="aktionen"><div class="aktionen-box">${admin && p.rolle !== "super_admin" && p.id !== S.user.id ? `<button class="knopf klein" data-pwreset="${esc(p.id)}" type="button">Neues Passwort</button>
        <button class="knopf klein" data-sperren="${esc(p.id)}" type="button">${p.aktiv === false ? "Freischalten" : "Sperren"}</button>` : ""}</div></td></tr>`;
  const lehrer = S.lehrer;
  const buero = S.team.filter((p) => p.rolle === "buero" || p.rolle === "fahrschule_admin");
  return `<div class="karte"><div class="karte-kopf"><h2>Fahrlehrer (${lehrer.length})</h2>${admin ? '<button class="knopf haupt" id="tNeuFl" type="button">+ Fahrlehrer anlegen</button>' : ""}</div>
      <table class="tabelle"><thead><tr><th>Name</th><th>Rolle</th><th class="zahlspalte">Schüler</th><th class="zahlspalte">UE im Monat</th><th>Zugang</th><th></th></tr></thead><tbody>${lehrer.map((p) => zeile(p, true)).join("")}</tbody></table></div>
    <div class="karte"><div class="karte-kopf"><h2>Büro und Leitung</h2>${admin ? `<button class="knopf" id="tNeuBu" type="button">+ ${S.profil.rolle === "super_admin" ? "Büro- oder Leitungs-Zugang" : "Büro-Zugang"} anlegen</button>` : ""}</div>
      ${buero.length ? `<table class="tabelle"><thead><tr><th>Name</th><th>Rolle</th><th>Zugang</th><th></th></tr></thead><tbody>${buero.map((p) => zeile(p, false)).join("")}</tbody></table>` : `<p class="leer">Keine weiteren Zugänge sichtbar.</p>`}
      ${admin ? "" : `<p class="leise klein">Zugänge anlegen, sperren und Passwörter zurücksetzen darf die Fahrschul-Leitung.</p>`}</div>`;
}
function bindeTeam(ziel) {
  const fl = ziel.querySelector("#tNeuFl"), bu = ziel.querySelector("#tNeuBu");
  if (fl) fl.addEventListener("click", () => zugangDialog("fahrlehrer"));
  if (bu) bu.addEventListener("click", () => zugangDialog("buero"));
  ziel.querySelectorAll("[data-pwreset]").forEach((b) => b.addEventListener("click", () => passwortNeu(b.dataset.pwreset)));
  ziel.querySelectorAll("[data-sperren]").forEach((b) => b.addEventListener("click", () => zugangSperren(b.dataset.sperren)));
}
function teamPerson(id) { return S.team.find((p) => p.id === id) || S.lehrer.find((p) => p.id === id); }
function zeigePasswort(email, passwort) {
  let versucht = false;
  oeffneDialog("Zugangsdaten", `<p>Bitte jetzt weitergeben. Das Passwort wird <b>nur dieses eine Mal</b> angezeigt.</p>
    <div class="formular"><label class="voll">E-Mail<input type="text" readonly value="${esc(email)}"></label>
    <label class="voll">Passwort<input type="text" readonly value="${esc(passwort)}" id="pwFeld"></label></div>`, async () => {
    if (versucht) return true;
    try { await navigator.clipboard.writeText(`E-Mail: ${email}\nPasswort: ${passwort}`); toast("Kopiert"); } catch (e) {
      versucht = true; toast("Kopieren ging nicht, bitte abschreiben. Dann noch einmal „Schließen“.", true);
      document.querySelector("dialog[open] footer button[value=ok]").textContent = "Schließen";
      return false;
    }
    return true;
  }, "Kopieren und schließen", { festhalten: true });
}
function zugangDialog(rolle) {
  // Super-Admin kann auch die Fahrschul-Leitung (Inhaber, Prokuristin) anlegen
  const wahl = rolle === "buero" && S.profil.rolle === "super_admin"
    ? `<label class="voll">Rolle<select name="rolle"><option value="buero">Büro</option><option value="fahrschule_admin">Fahrschul-Leitung (Inhaber, Prokura)</option></select></label>` : "";
  oeffneDialog(rolle === "buero" ? "Zugang für Büro oder Leitung anlegen" : "Fahrlehrer anlegen", `<div class="formular">
      <label class="voll">E-Mail<input type="email" name="email" required></label>
      <label class="voll">Name<input type="text" name="name" maxlength="100"></label>${wahl}</div>
      <p class="leise klein">Das Passwort erscheint danach einmal zum Weitergeben. Die Person kann es später über „Passwort vergessen?“ selbst ändern.</p>`, async (form) => {
    if (form.rolle) rolle = form.rolle.value;
    const email = form.email.value.trim(), name = form.name.value.trim();
    if (!email) { toast("Bitte eine E-Mail eintragen.", true); return false; }
    try {
      const res = await adminFunktion({ action: "create_account", email, name, rolle, fahrschule_id: S.fsId });
      setTimeout(() => zeigePasswort(res.email || email, res.passwort), 50);
      ladeDaten();
      return true;
    } catch (e) { toast("Nicht angelegt: " + e.message, true); return false; }
  }, "Anlegen");
}
async function passwortNeu(id) {
  const p = teamPerson(id);
  if (!p || !(await bestaetige("Neues Passwort?", `Für ${p.name || p.email} wird ein neues Passwort erzeugt. Das alte gilt dann nicht mehr.`, "Ja, neues Passwort"))) return;
  try { const res = await adminFunktion({ action: "reset_password", target_user_id: id }); zeigePasswort(res.email || p.email, res.passwort); }
  catch (e) { toast("Nicht möglich: " + e.message, true); }
}
async function zugangSperren(id) {
  const p = teamPerson(id);
  if (!p) return;
  const sperren = p.aktiv !== false;
  if (!(await bestaetige(sperren ? "Zugang sperren?" : "Zugang freischalten?", sperren ? `${p.name || p.email} wird sofort abgemeldet und kann sich nicht mehr anmelden.` : `${p.name || p.email} kann sich wieder anmelden.`, sperren ? "Ja, sperren" : "Ja, freischalten"))) return;
  const res = await supa.from("profiles").update({ aktiv: !sperren }).eq("id", id).select("id");
  if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return; }
  for (const l of [S.team, S.lehrer]) { const x = l.find((y) => y.id === id); if (x) x.aktiv = !sperren; }
  toast(sperren ? "Gesperrt" : "Freigeschaltet"); zeichne();
}

/* ---------- Fahrzeuge ---------- */
// Doppelt belegte Fahrzeuge in den nächsten 14 Tagen (gleiches Fahrzeug, überschneidende Zeit)
function fahrzeugKonflikte() {
  const heute = KR.todayISO(), bis = KR.addDaysISO(heute, 14), out = [];
  const nach = {};
  for (const t of S.termine) {
    if (!t.fahrzeug || !t.von || !t.bis || t.art === "block" || t.datum < heute || t.datum > bis) continue;
    (nach[t.datum + "|" + t.fahrzeug] = nach[t.datum + "|" + t.fahrzeug] || []).push(t);
  }
  for (const liste of Object.values(nach)) {
    liste.sort((a, b) => a.von.localeCompare(b.von));
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      if (KR.hm2min(liste[j].von) < KR.hm2min(liste[i].bis)) out.push([liste[i], liste[j]]);
    }
  }
  return out;
}
function renderFlotte() {
  const heute = KR.todayISO(), bis = KR.addDaysISO(heute, 6);
  const nutzung = {};
  for (const t of S.termine) if (t.fahrzeug && t.datum >= heute && t.datum <= bis && t.art !== "block") nutzung[t.fahrzeug] = (nutzung[t.fahrzeug] || 0) + 1;
  const konf = fahrzeugKonflikte();
  const admin = istAdmin();
  const typName = { schalt: "Schaltung", automatik: "Automatik" };
  return `${konf.length ? `<div class="karte warnkarte"><h2>${konf.length} Doppelbelegung${konf.length === 1 ? "" : "en"} in den nächsten 14 Tagen</h2><table class="tabelle"><tbody>${konf.map(([a, b]) => `<tr>
      <td class="zeitspalte">${esc(datumDE(a.datum))}</td><td><b>${esc(a.fahrzeug)}</b></td>
      <td>${esc(a.von)}–${esc(a.bis)} ${esc(lehrerName(a.fahrlehrer_id))}</td><td>${esc(b.von)}–${esc(b.bis)} ${esc(lehrerName(b.fahrlehrer_id))}</td></tr>`).join("")}</tbody></table></div>` : ""}
    <div class="karte"><div class="karte-kopf"><h2>Fahrzeuge (${S.fahrzeuge.length})</h2>${admin ? '<button class="knopf haupt" id="fzNeu" type="button">+ Fahrzeug</button>' : ""}</div>
      ${S.fahrzeuge.length ? `<table class="tabelle"><thead><tr><th>Fahrzeug</th><th>Typ</th><th class="zahlspalte">Termine in 7 Tagen</th><th></th></tr></thead><tbody>${S.fahrzeuge.map((f) => `<tr>
        <td><b>${esc(f.name || f.bezeichnung || "")}</b></td><td>${esc(typName[f.typ] || f.typ || "")}</td><td class="zahlspalte">${nutzung[f.name || f.bezeichnung] || 0}</td>
        <td class="aktionen"><div class="aktionen-box">${admin ? `<button class="knopf klein" data-fzweg="${esc(f.id)}" type="button">Entfernen</button>` : ""}</div></td></tr>`).join("")}</tbody></table>` : `<p class="leer">Noch keine Fahrzeuge eingetragen.</p>`}
      ${admin ? "" : `<p class="leise klein">Fahrzeuge anlegen und entfernen darf die Fahrschul-Leitung.</p>`}</div>`;
}
function bindeFlotte(ziel) {
  const neu = ziel.querySelector("#fzNeu");
  if (neu) neu.addEventListener("click", () => oeffneDialog("Fahrzeug anlegen", `<div class="formular">
      <label class="voll">Bezeichnung (z. B. „Golf Schalter“)<input type="text" name="name" required maxlength="60"></label>
      <label>Typ<select name="typ"><option value="schalt">Schaltung</option><option value="automatik">Automatik</option></select></label></div>`, async (form) => {
    const name = form.name.value.trim();
    if (!name) { toast("Bitte eine Bezeichnung eintragen.", true); return false; }
    const res = await supa.from("fahrschule_fahrzeuge").insert({ fahrschule_id: S.fsId, name, typ: form.typ.value, aktiv: true }).select("*");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return false; }
    S.fahrzeuge.push(res.data[0]); toast("Fahrzeug angelegt"); zeichne(); return true;
  }, "Anlegen"));
  ziel.querySelectorAll("[data-fzweg]").forEach((b) => b.addEventListener("click", async () => {
    const f = S.fahrzeuge.find((x) => x.id === b.dataset.fzweg);
    if (!f || !(await bestaetige("Fahrzeug entfernen?", `${f.name || ""} wird aus der Liste genommen. Alte Termine bleiben unverändert.`, "Ja, entfernen"))) return;
    const res = await supa.from("fahrschule_fahrzeuge").update({ aktiv: false }).eq("id", f.id).select("id");
    if (res.error || !res.data || !res.data.length) { toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true); return; }
    S.fahrzeuge = S.fahrzeuge.filter((x) => x.id !== f.id); toast("Entfernt"); zeichne();
  }));
}

/* ---------- Dialoge ---------- */
function oeffneDialog(titel, inhalt, speichern, knopfText, optionen) {
  const dlg = document.createElement("dialog");
  dlg.className = "dialog";
  dlg.innerHTML = `<form method="dialog" class="dialog-form">
      <header><h2>${esc(titel)}</h2>${optionen && optionen.festhalten ? "" : '<button class="knopf klein" type="button" data-schliessen aria-label="Schließen">✕</button>'}</header>
      <div class="dialog-inhalt">${inhalt}</div>
      <footer>${optionen && optionen.festhalten ? "" : '<button class="knopf" type="button" data-schliessen>Abbrechen</button>'}<button class="knopf haupt" value="ok" type="submit">${esc(knopfText || "Speichern")}</button></footer>
    </form>`;
  document.body.appendChild(dlg);
  const form = dlg.querySelector("form");
  // Abbrechen und ✕ sind keine Absende-Knöpfe: Enter speichert, und das Schließen klappt auch bei leeren Pflichtfeldern
  dlg.querySelectorAll("[data-schliessen]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  let laeuft = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (laeuft) return; // Doppelklick oder zweimal Enter: nur einmal speichern
    laeuft = true;
    const knopf = dlg.querySelector("footer button[value=ok]");
    try { if ((await speichern(form)) !== false) dlg.close(); } finally { knopf.disabled = false; laeuft = false; }
  });
  dlg.addEventListener("close", () => dlg.remove());
  // Immer schließbar: Abbrechen, ✕ (ohne Pflichtfeld-Prüfung), Esc, und ein Klick neben das Fenster (nur solange nichts eingegeben wurde)
  let geaendert = false;
  form.addEventListener("input", () => { geaendert = true; });
  if (optionen && optionen.festhalten) dlg.addEventListener("cancel", (e) => e.preventDefault()); // Zugangsdaten: nicht versehentlich wegklicken
  else dlg.addEventListener("mousedown", (e) => { if (e.target === dlg && !geaendert) dlg.close(); });
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
// Supabase liefert höchstens 1000 Zeilen je Abfrage: seitenweise laden, damit nie still etwas fehlt
async function alleSeiten(abfrage, seite = 1000) {
  const alle = [];
  for (let von = 0; von < 50000; von += seite) {
    const res = await abfrage().range(von, von + seite - 1);
    if (res.error) return res;
    alle.push(...(res.data || []));
    if (!res.data || res.data.length < seite) break;
  }
  return { data: alle, error: null };
}
async function ladeDaten() {
  const nr = ++S.ladeNr;
  const fsId = S.fsId;
  setStatus("", "lade …");
  try {
    const [fs, lehrer, schueler, termine, pruefungen, fahrzeuge, pakete, pTermine, fcAbg, verk, prov, team, notizen, gelesen, aufgaben] = await Promise.all([
      supa.from("fahrschulen").select("*").eq("id", fsId).single(),
      supa.from("profiles").select("*").eq("fahrschule_id", fsId).in("rolle", ["fahrlehrer", "super_admin"]).order("name"),
      supa.from("schueler").select("*").eq("fahrschule_id", fsId).neq("status", "geloescht").order("name"),
      alleSeiten(() => supa.from("kalender_termine").select("*").eq("fahrschule_id", fsId).eq("geloescht", false).gte("datum", KR.addDaysISO(KR.todayISO(), -400)).order("datum").order("id")),
      supa.from("kalender_pruefungen").select("*").eq("fahrschule_id", fsId).eq("geloescht", false),
      supa.from("fahrschule_fahrzeuge").select("*").eq("fahrschule_id", fsId).eq("aktiv", true).order("erstellt_am"),
      supa.from("fahrschule_pakete").select("*").eq("fahrschule_id", fsId),
      supa.from("pruefungstermine").select("*").eq("fahrschule_id", fsId).gte("datum", KR.addDaysISO(KR.todayISO(), -120)).order("datum").order("von"),
      supa.from("fc_abgaben").select("*").eq("fahrschule_id", fsId).gte("zeitraum_von", KR.addDaysISO(KR.todayISO(), -200)).order("bestaetigt_am", { ascending: false }),
      supa.from("fahrschule_empfehlungen").select("*").eq("fahrschule_id", fsId).order("erstellt_am", { ascending: false }).limit(1000),
      supa.from("provisionen").select("*").eq("fahrschule_id", fsId).order("erstellt_am", { ascending: false }).limit(2000),
      supa.from("profiles").select("*").eq("fahrschule_id", fsId).order("name"),
      supa.from("schueler_notizen").select("*").eq("fahrschule_id", fsId).order("erstellt_am", { ascending: false }).limit(2000),
      supa.from("schueler_notiz_gelesen").select("*").limit(5000),
      supa.from("schueler_aufgaben").select("*").eq("fahrschule_id", fsId).order("erstellt_am", { ascending: false }).limit(3000),
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
    S.fcAbgaben = pruefe(fcAbg, "Fahrcheck-Abgaben") || [];
    S.verkaeufe = pruefe(verk, "Verkäufe") || [];
    S.provisionen = pruefe(prov, "Provisionen") || [];
    S.team = pruefe(team, "Team") || [];
    S.notizen = (notizen && !notizen.error && notizen.data) || [];   // Notizen sind Zusatz: Fehler ignorieren
    S.gelesen = (gelesen && !gelesen.error && gelesen.data) || [];
    S.aufgaben = (aufgaben && !aufgaben.error && aufgaben.data) || [];   // Aufgaben sind Zusatz: Fehler ignorieren
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

/* ---------- Wer bedient gerade? (gemeinsamer Büro-Zugang) ---------- */
const WER_LEERLAUF_MS = 20 * 60 * 1000;
let letzteAktion = Date.now();
function werNoetig() { return !!(S.profil && S.profil.rolle !== "super_admin"); }
// Für die Kopfzeile nur einfache Zeichen (Umlaute werden umschrieben)
function werKopfzeile(name) {
  return String(name).replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "").trim().slice(0, 30);
}
function setzeWer(name) {
  S.werAnzeige = String(name).trim().slice(0, 30);
  S.wer = werKopfzeile(S.werAnzeige) || "Büro";
  try { sessionStorage.setItem("buero-wer", JSON.stringify({ name: S.werAnzeige, t: Date.now() })); } catch (e) { /* ohne Speicher weiter */ }
  letzteAktion = Date.now();
  $("werAnzeige").textContent = S.werAnzeige;
  $("werZeile").hidden = false;
  $("wer").hidden = true;
}
function zeigeWer() {
  document.querySelectorAll("dialog[open]").forEach((d) => d.close()); // ein offenes Fenster würde das Overlay verdecken
  $("werZu").hidden = !S.wer; // Beim ersten Mal muss man sich entscheiden; beim bewussten „wechseln“ kann man abbrechen
  $("werListe").innerHTML = bueroPersonen().map((n) => `<button type="button" class="knopf gross" data-wer="${esc(n)}">${esc(n)}</button>`).join("");
  $("wer").hidden = false;
  const erster = $("werListe").querySelector("button");
  if (erster) erster.focus();
}
function starteWer() {
  if (!werNoetig()) return;
  let alt = null;
  try { alt = JSON.parse(sessionStorage.getItem("buero-wer") || "null"); } catch (e) { /* neu fragen */ }
  if (alt && alt.name && Date.now() - alt.t < WER_LEERLAUF_MS) setzeWer(alt.name);
  else zeigeWer();
}
$("werListe").addEventListener("click", (e) => { const b = e.target.closest("[data-wer]"); if (b) setzeWer(b.dataset.wer); });
$("werAnderer").addEventListener("submit", (e) => {
  e.preventDefault();
  const n = $("werName").value.trim();
  if (!n) { toast("Bitte einen Namen eintragen.", true); return; }
  $("werName").value = "";
  setzeWer(n);
});
$("werWechseln").addEventListener("click", zeigeWer);
$("werZu").addEventListener("click", () => { $("wer").hidden = true; letzteAktion = Date.now(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("wer").hidden && S.wer) { $("wer").hidden = true; letzteAktion = Date.now(); } });
for (const ev of ["pointerdown", "keydown"]) document.addEventListener(ev, () => { letzteAktion = Date.now(); }, { passive: true });
setInterval(() => {
  if (werNoetig() && S.wer && $("wer").hidden && Date.now() - letzteAktion > WER_LEERLAUF_MS) zeigeWer();
}, 30000);

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
  try { sessionStorage.removeItem("buero-wer"); } catch (e) { /* egal */ }
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
  if (window.BUERO_VORFUEHRUNG) { $("vorfuehrung").hidden = false; document.title = "Vorführung · Kompass Büro"; }
  $("nutzerName").textContent = profil.name || user.email;
  $("nutzerRolle").textContent = ROLLEN[profil.rolle];
  zeigeNur("app");
  zeichne();
  starteWer();
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
// Drucken: Kopf mit Fahrschule, Bereich, Datum, Person und den aktiven Filtern
function fuelleDruckKopf() {
  const b = aktuellerBereich();
  const teile = [];
  const tab = document.querySelector("#ansicht .tab[aria-current=page]");
  if (tab) teile.push(tab.textContent.trim());
  document.querySelectorAll("#ansicht .filterzeile select, #ansicht .karte-kopf select").forEach((sel) => { if (sel.value && sel.selectedOptions[0] && !/Sort$/.test(sel.id)) teile.push(sel.selectedOptions[0].textContent.trim()); });
  const chips = [...document.querySelectorAll("#ansicht [data-klehrer]")];
  if (chips.length && chips.some((c) => !c.checked)) teile.push("Fahrlehrer: " + (chips.filter((c) => c.checked).map((c) => c.closest("label").textContent.trim()).join(", ") || "keiner"));
  document.querySelectorAll("#ansicht .filterzeile input[type=search], #ansicht .karte-kopf input[type=search]").forEach((i) => { if (i.value.trim()) teile.push("Suche: „" + i.value.trim() + "“"); });
  document.querySelectorAll("#ansicht .filterzeile input[type=date]:not(#kDatum)").forEach((i) => { if (i.value) teile.push((i.closest("label") ? i.closest("label").textContent.trim().split(/\s+/)[0] + " " : "") + datumDE(i.value)); });
  const jetzt = new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
  $("druckKopf").innerHTML = `<b>${esc(b.titel)}</b><span>${esc((S.fs && S.fs.name) || "")} · gedruckt am ${esc(jetzt)}${S.werAnzeige || (S.profil && S.profil.name) ? " von " + esc(S.werAnzeige || S.profil.name) : ""}${teile.length ? " · " + esc(teile.join(" · ")) : ""}</span>`;
}
window.addEventListener("beforeprint", fuelleDruckKopf);
$("drucken").addEventListener("click", () => { fuelleDruckKopf(); window.print(); });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && S.geladenAm && Date.now() - S.geladenAm.getTime() > NEU_LADEN_MS) ladeDaten();
});

function loginFehlerText(error) {
  const m = String((error && error.message) || "");
  if (/invalid login/i.test(m)) return "E-Mail oder Passwort stimmt nicht. Bitte die E-Mail prüfen oder in der Kompass-App „Passwort vergessen?“ nutzen.";
  if (/not confirmed/i.test(m)) return "Die E-Mail-Adresse ist noch nicht bestätigt. Bitte den Link in der E-Mail anklicken.";
  if (/rate limit|too many/i.test(m)) return "Zu viele Versuche. Bitte ein paar Minuten warten.";
  if (/fetch|network/i.test(m)) return "Keine Internetverbindung.";
  return "Anmeldung fehlgeschlagen: " + m;
}
$("loginZeig").addEventListener("change", (e) => { $("loginPw").type = e.target.checked ? "text" : "password"; });
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const knopf = $("loginKnopf");
  $("loginFehler").textContent = "";
  knopf.disabled = true; knopf.textContent = "Anmelden …";
  const { data, error } = await supa.auth.signInWithPassword({ email: $("loginMail").value.trim(), password: $("loginPw").value });
  knopf.disabled = false; knopf.textContent = "Anmelden";
  if (error) {
    $("loginFehler").textContent = loginFehlerText(error);
    return;
  }
  starte(data.user);
});

/* Als App installieren (Chrome/Edge am PC): eigenes Fenster, Symbol auf dem Desktop und in der Taskleiste.
   Die Anmeldung bleibt gespeichert; man muss sich nur nach „Abmelden“ neu anmelden. */
let _installEvent = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); _installEvent = e; $("installieren").hidden = false; });
window.addEventListener("appinstalled", () => { $("installieren").hidden = true; toast("Kompass Büro ist jetzt als App installiert"); });
$("installieren").addEventListener("click", async () => {
  if (!_installEvent) return;
  _installEvent.prompt();
  await _installEvent.userChoice.catch(() => null);
  _installEvent = null;
  $("installieren").hidden = true;
});
if ("serviceWorker" in navigator && !window.BUERO_VORFUEHRUNG) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

(async function init() {
  const { data } = await supa.auth.getSession();
  if (data && data.session && data.session.user) starte(data.session.user);
  else zeigeNur("login");
})();
