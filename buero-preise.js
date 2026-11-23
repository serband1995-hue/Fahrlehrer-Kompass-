/* Kompass Büro – Preisliste je Fahrschule (K9, Nachtplan 22.11.2026)
   Grundbetrag, Fahrstunde je Klasse, Sonderfahrten, Prüfungsvorstellung, Reaktivierung, Pakete.
   Jeder Preis gilt ab einem Tag; Ändern legt eine neue Zeile an (Verlauf bleibt, nichts wird überschrieben).
   Alte Verträge behalten ihren Preis: es gilt der Preis, der am Vertragsdatum gültig war (preisAm).
   Herunterladen als JSON und CSV: Vorbereitung für das Preisregister (§ 32 FahrlG, ab 01.07.2027).
   Das amtliche Format steht noch nicht fest; die Datei hat deshalb eine eigene Versionsnummer.
   Tabelle: fahrschule_preise (supabase/migrations/20261123_k9_01_preisliste.sql). Fehlt sie (alte Datenbank),
   ist S.preise = null und die Seite sagt das; die Reaktivierung nimmt dann den alten Betrag. */
"use strict";
const PR_ARTEN = [
  // [art, Name, Einheit, mit Klasse, Vorschlag Bezeichnung]
  ["grundbetrag", "Grundbetrag", "pauschal", true, "Grundbetrag"],
  ["fahrstunde", "Übungsfahrstunde", "45min", true, "Übungsfahrstunde"],
  ["sonderfahrt", "Sonderfahrten", "45min", true, "Überlandfahrt"],
  ["pruefung_praxis", "Vorstellung praktische Prüfung", "pauschal", true, "Vorstellung zur praktischen Prüfung"],
  ["pruefung_theorie", "Vorstellung theoretische Prüfung", "pauschal", true, "Vorstellung zur theoretischen Prüfung"],
  ["reaktivierung", "Reaktivierung", "pauschal", false, "Reaktivierung"],
  ["paket", "Pakete", "paket", true, ""],
  ["sonstiges", "Sonstiges", "pauschal", false, ""],
];
const PR_EINHEITEN = [["pauschal", "pauschal"], ["45min", "je 45 Minuten"], ["fahrt", "je Fahrt"], ["paket", "je Paket"]];
const PR_SONDER = ["Überlandfahrt", "Autobahnfahrt", "Fahrt bei Dämmerung oder Dunkelheit"];
const PR_FORMAT_VERSION = 1;

function prArt(art) { return PR_ARTEN.find((a) => a[0] === art) || [art, art, "pauschal", false, ""]; }
function prEinheit(e) { const x = PR_EINHEITEN.find((a) => a[0] === e); return x ? x[1] : e; }
function prSchluessel(r) { return [r.art, r.klasse || "", String(r.bezeichnung || "").trim().toLowerCase()].join("|"); }
// 🗣 Serband: Büro stellt alle Zahlen ein → Büro, Leitung, Super-Admin; Fahrlehrer nur lesen
function prDarf() { return !!(S.profil && ["buero", "fahrschule_admin", "super_admin"].includes(S.profil.rolle)); }
function prIstSuper() { return !!(S.profil && S.profil.rolle === "super_admin"); }
function prEuro(cent) { return cent == null ? "entfällt" : (cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }
// gleicher Tag: die zuletzt eingetragene Zeile gilt (Zeit als Zahl vergleichen, nicht als Text – Prüf-Team)
function prZeit(r) { const t = Date.parse(r.angelegt_am || ""); return isNaN(t) ? 0 : t; }
function prOrdnen(a, b) { return a.gueltig_ab < b.gueltig_ab ? -1 : a.gueltig_ab > b.gueltig_ab ? 1 : prZeit(a) - prZeit(b); }
// Fehlt die Tabelle (alte Datenbank)? Nur dann „nicht eingerichtet“; ein kurzer Netzfehler behält den letzten Stand.
function prTabelleFehlt(err) { return !!err && (["42P01", "PGRST205"].includes(err.code) || /does not exist|could not find the table/i.test(String(err.message || ""))); }
function prPositionen() {
  const m = new Map();
  for (const r of (S.preise || []).slice().sort(prOrdnen)) {
    const k = prSchluessel(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}
// Zeile, die am Tag „datum“ gilt (null = vor dem ersten Eintrag). betrag_cent null heißt „entfällt“.
function prZeileAm(zeilen, datum) {
  let treffer = null;
  for (const r of zeilen) if (r.gueltig_ab <= datum) treffer = r;
  return treffer;
}
/* Preis am Tag (in Euro) für Art/Klasse/Bezeichnung; undefined = kein Eintrag (dann gilt der alte Weg).
   Bezeichnung null: alle Positionen dieser Art und Klasse zusammen (Reaktivierung gibt es nur einmal, egal wie sie heißt). */
function preisAm(art, klasse, bezeichnung, datum) {
  if (!S.preise) return undefined;
  let zeilen;
  if (bezeichnung == null) zeilen = S.preise.filter((r) => r.art === art && (r.klasse || null) === (klasse || null)).sort(prOrdnen);
  else zeilen = prPositionen().get(prSchluessel({ art, klasse, bezeichnung }));
  if (!zeilen || !zeilen.length) return undefined;
  const r = prZeileAm(zeilen, datum || KR.todayISO());
  if (!r) return undefined;
  return r.betrag_cent == null ? null : r.betrag_cent / 100;
}

function renderPreise() {
  if (S.preise === null) {
    return `<div class="karte"><p class="leer">Die Preisliste ist noch nicht eingerichtet. Sobald das Datenbank-Update da ist, erscheint sie hier.</p></div>`;
  }
  const heute = KR.todayISO();
  const pos = prPositionen();
  const darf = prDarf();
  // Eine Tabelle für alle Arten (gleiche Spalten), je Art eine Zwischenzeile; am Handy werden die Zeilen zu Karten (CSS)
  const gruppen = PR_ARTEN.map(([art, artName]) => {
    const liste = [...pos.entries()].filter(([, z]) => z[0].art === art)
      .sort((a, b) => (a[1][0].klasse || "").localeCompare(b[1][0].klasse || "") || a[1][0].bezeichnung.localeCompare(b[1][0].bezeichnung, "de"));
    if (!liste.length) return "";
    const zeilen = liste.map(([k, z]) => {
      const jetzt = prZeileAm(z, heute);
      const kommend = z.filter((r) => r.gueltig_ab > heute);
      const letzte = z[z.length - 1];
      const naechste = kommend.length ? kommend[kommend.length - 1] : null;
      const name = letzte.bezeichnung.trim().toLowerCase() === artName.trim().toLowerCase() ? "" : letzte.bezeichnung;
      const verlauf = z.slice().reverse().map((r) => `<li><b>${esc(prEuro(r.betrag_cent))}</b> ab ${esc(datumDE(r.gueltig_ab))}
          <div class="leise klein">eingetragen ${esc(datumDE(String(r.angelegt_am || "").slice(0, 10)))}${r.bearbeiter ? " von " + esc(r.bearbeiter) : r.angelegt_von ? " von " + esc(prWer(r.angelegt_von)) : ""}</div></li>`).join("");
      return `<tr class="pr-zeile">
        <td class="pr-name">${name ? `<b>${esc(name)}</b>` : ""}${letzte.klasse ? `<span class="pr-klasse">Klasse ${esc(letzte.klasse)}</span>` : ""}${!name && !letzte.klasse ? `<b>${esc(letzte.bezeichnung)}</b>` : ""}
          ${letzte.inhalt ? `<div class="leise klein">${esc(letzte.inhalt)}</div>` : ""}
          <details class="pr-verlauf"><summary class="klein">Verlauf (${z.length})</summary><ul>${verlauf}</ul></details></td>
        <td class="pr-preis">${jetzt ? `<span class="pr-betrag">${esc(prEuro(jetzt.betrag_cent))}</span><div class="leise klein">${esc(prEinheit(jetzt.einheit))} · seit ${esc(datumDE(jetzt.gueltig_ab))}</div>` : `<span class="leise">noch nicht gültig</span>`}</td>
        <td class="pr-plan">${naechste ? `<span class="pr-bald">ab ${esc(datumDE(naechste.gueltig_ab))}: <b>${esc(prEuro(naechste.betrag_cent))}</b></span>` : ""}</td>
        <td class="pr-tun">${darf ? `<button class="knopf klein" type="button" data-pr-aendern="${esc(k)}">Ändern</button>` : ""}</td>
      </tr>`;
    }).join("");
    return `<tr class="pr-gruppe"><th colspan="4" scope="colgroup">${esc(artName)}</th></tr>${zeilen}`;
  }).join("");
  return `<div class="karte">
    <div class="pr-kopf">${darf ? `<button class="knopf haupt" type="button" id="prNeu">Neuer Preis</button>` : `<span class="leise klein">Preise ändern Büro und Leitung.</span>`}
      <span class="pr-speichern"><span class="leise klein">Speichern:</span>
        <button class="knopf klein" type="button" id="prCsv" title="Öffnet sich in Excel oder einer anderen Tabelle">Als Excel-Tabelle</button>
        <button class="knopf klein" type="button" id="prJson" title="Maschinenlesbare Datei, Vorbereitung für das Preisregister ab Juli 2027">Für das Preisregister</button></span></div>
    ${gruppen ? `<table class="tabelle pr-tabelle"><colgroup><col><col class="pr-c-preis"><col class="pr-c-plan"><col class="pr-c-tun"></colgroup>
      <thead><tr><th>Preis</th><th>Heute</th><th>Geplant</th><th><span class="nur-leser">Ändern</span></th></tr></thead><tbody>${gruppen}</tbody></table>`
      : `<p class="leer">Noch keine Preise eingetragen.${darf ? " Mit „Neuer Preis“ anfangen: Grundbetrag, Übungsfahrstunde und Sonderfahrten je Klasse, Prüfungsvorstellung, Reaktivierung, Pakete." : ""}</p>`}
    <p class="leise klein">Ein geänderter Preis gilt ab dem gewählten Tag. Alte Verträge behalten den Preis von ihrem Vertragsdatum. Nichts wird überschrieben: der Verlauf zeigt jeden Stand.</p>
  </div>`;
}
// Verfasser ohne PIN-Person: Name aus dem Team, sonst die Rolle (nicht immer „Leitung“ – Prüf-Team)
function prWer(id) {
  const p = (S.team || []).find((x) => x.id === id);
  if (p && p.name) return p.name;
  return p && p.rolle === "buero" ? "Büro" : p && p.rolle === "super_admin" ? "Super-Admin" : "Leitung";
}

function prFormular(vorlage, nurBetrag) {
  const v = vorlage || {};
  const heute = KR.todayISO();
  const min = prIstSuper() ? "" : ` min="${esc(heute)}"`;
  const betrag = v.betrag_cent == null ? "" : (v.betrag_cent / 100).toFixed(2);
  if (nurBetrag) {
    return `<p>${esc(v.bezeichnung)}${v.klasse ? " · Klasse " + esc(v.klasse) : ""}: heute <b>${esc(v._heute == null ? "noch nicht gültig" : prEuro(v._heute))}</b></p>
      <div class="formular">
        <label>Neuer Preis in €<input type="number" name="betrag" min="0" max="100000" step="0.01" inputmode="decimal" value="${esc(betrag)}"></label>
        <label>Gültig ab<input type="date" name="ab" required value="${esc(heute)}"${min}></label>
        <label class="wahl voll pr-wahl"><input type="checkbox" name="entfaellt"> Diesen Preis gibt es ab dem Tag nicht mehr<span class="leise klein">Er steht dann mit „entfällt“ in der Liste; der Verlauf bleibt.</span></label>
      </div>`;
  }
  return `<div class="formular">
      <label>Art<select name="art">${PR_ARTEN.map(([a, n]) => `<option value="${a}"${v.art === a ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label>Klasse<select name="klasse">${klassenOptionen(v.klasse || "")}</select></label>
      <label class="voll">Bezeichnung<input type="text" name="bezeichnung" maxlength="120" required list="prVorschlaege" value="${esc(v.bezeichnung || "Grundbetrag")}"></label>
      <datalist id="prVorschlaege">${PR_SONDER.concat(PR_ARTEN.map((a) => a[4]).filter(Boolean), (S.pakete || []).map((p) => p.name)).map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <label>Einheit<select name="einheit">${PR_EINHEITEN.map(([e, n]) => `<option value="${e}">${esc(n)}</option>`).join("")}</select></label>
      <label>Preis in €<input type="number" name="betrag" min="0" max="100000" step="0.01" inputmode="decimal" required></label>
      <label>Gültig ab<input type="date" name="ab" required value="${esc(heute)}"${min}></label>
      <label class="voll">Inhalt (nur bei Paketen, z. B. „10 Fahrstunden + Prüfung“)<input type="text" name="inhalt" maxlength="500"></label>
    </div>`;
}
function prBetragLesen(form) {
  if (form.entfaellt && form.entfaellt.checked) return { cent: null };
  const roh = String(form.betrag.value || "").replace(",", ".").trim();
  const n = Number(roh);
  if (roh === "" || !isFinite(n) || n < 0 || n > 100000) return { fehler: "Bitte einen Preis eintragen (oder „gibt es nicht mehr“ wählen)." };
  return { cent: Math.round(n * 100) };
}
function prAbPruefen(ab) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ab || "")) return "Bitte „Gültig ab“ eintragen.";
  if (ab < KR.todayISO() && !prIstSuper()) return "„Gültig ab“ darf nicht in der Vergangenheit liegen (alte Verträge behalten ihren Preis).";
  return "";
}
async function prSpeichern(zeile) {
  const res = await supa.from("fahrschule_preise").insert(Object.assign({ fahrschule_id: S.fsId }, zeile)).select();
  if (res.error || !res.data || !res.data.length) {
    toast("Nicht gespeichert: " + (res.error ? res.error.message : "keine Berechtigung"), true);
    return false;
  }
  S.preise = (S.preise || []).concat(res.data);
  zeichne();
  return true;
}
function prNeu() {
  oeffneDialog("Neuer Preis", prFormular({ art: "grundbetrag", klasse: "B" }), async (form) => {
    const art = form.art.value, a = prArt(art);
    const zeile = { art, klasse: a[3] ? form.klasse.value || null : null, bezeichnung: form.bezeichnung.value.trim(), einheit: form.einheit.value, inhalt: form.inhalt.value.trim() || null, gueltig_ab: form.ab.value };
    if (art === "reaktivierung") zeile.bezeichnung = "Reaktivierung"; // gibt es nur einmal (das Büro rechnet mit ihr)
    if (!zeile.bezeichnung) { toast("Bitte eine Bezeichnung eintragen.", true); return false; }
    const b = prBetragLesen(form); if (b.fehler) { toast(b.fehler, true); return false; }
    const f = prAbPruefen(zeile.gueltig_ab); if (f) { toast(f, true); return false; }
    if (prPositionen().has(prSchluessel(zeile)) || (art === "reaktivierung" && (S.preise || []).some((r) => r.art === "reaktivierung"))) { toast("Diesen Preis gibt es schon. Bitte dort „Ändern“ nutzen.", true); return false; }
    const paket = art === "paket" ? (S.pakete || []).find((p) => String(p.name || "").trim().toLowerCase() === zeile.bezeichnung.toLowerCase()) : null;
    zeile.betrag_cent = b.cent;
    if (paket) zeile.paket_id = paket.id;
    if (await prSpeichern(zeile)) { toast("Preis gespeichert"); return true; }
    return false;
  }, "Preis speichern");
  // Art gewählt → Einheit und Bezeichnung vorschlagen (nur solange nichts Eigenes eingetragen ist)
  const dlg = document.querySelector("dialog.dialog:last-of-type");
  const form = dlg && dlg.querySelector("form");
  if (!form || !form.art) return;
  let eigen = false, warReakt = false; // nach „Reaktivierung“ nicht deren feste Bezeichnung mitnehmen
  form.bezeichnung.addEventListener("input", () => { eigen = true; });
  const passe = () => {
    const a = prArt(form.art.value);
    form.einheit.value = a[2];
    form.klasse.disabled = !a[3];
    if (!eigen || form.art.value === "reaktivierung" || warReakt) { form.bezeichnung.value = a[4]; if (warReakt) eigen = false; }
    warReakt = form.art.value === "reaktivierung";
    form.bezeichnung.readOnly = form.art.value === "reaktivierung";
  };
  form.art.addEventListener("change", passe);
  passe();
}
function prAendern(k) {
  const zeilen = prPositionen().get(k);
  if (!zeilen) return;
  const letzte = zeilen[zeilen.length - 1];
  const jetzt = prZeileAm(zeilen, KR.todayISO());
  const v = Object.assign({}, letzte, { _heute: jetzt ? jetzt.betrag_cent : null });
  if (!jetzt) v._heute = null;
  oeffneDialog("Preis ändern", prFormular(v, true), async (form) => {
    const b = prBetragLesen(form); if (b.fehler) { toast(b.fehler, true); return false; }
    const f = prAbPruefen(form.ab.value); if (f) { toast(f, true); return false; }
    const zeile = { art: letzte.art, klasse: letzte.klasse || null, bezeichnung: letzte.bezeichnung, einheit: letzte.einheit, inhalt: letzte.inhalt || null, paket_id: letzte.paket_id || null, gueltig_ab: form.ab.value, betrag_cent: b.cent };
    if (await prSpeichern(zeile)) { toast(`Gespeichert: gilt ab ${datumDE(zeile.gueltig_ab)}`); return true; }
    return false;
  }, "Speichern");
}

/* Maschinenlesbare Ausgabe: jede Zeile mit „gültig bis“ (Tag vor dem nächsten Stand), damit ein Register sie ohne Rechnen liest. */
function prAusgabe() {
  const heute = KR.todayISO();
  const zeilen = [];
  for (const z of prPositionen().values()) {
    // am selben Tag zählt nur die zuletzt eingetragene Zeile
    const tage = z.filter((r, i) => !(z[i + 1] && z[i + 1].gueltig_ab === r.gueltig_ab));
    tage.forEach((r, i) => {
      const naechste = tage[i + 1];
      const bis = naechste ? KR.addDaysISO(naechste.gueltig_ab, -1) : null;
      zeilen.push({
        art: r.art, art_name: prArt(r.art)[1], klasse: r.klasse || null, bezeichnung: r.bezeichnung, einheit: r.einheit,
        inhalt: r.inhalt || null, waehrung: "EUR", betrag: r.betrag_cent == null ? null : r.betrag_cent / 100,
        entfaellt: r.betrag_cent == null, gueltig_ab: r.gueltig_ab, gueltig_bis: bis,
        gilt_heute: r.gueltig_ab <= heute && (!bis || bis >= heute),
      });
    });
  }
  zeilen.sort((a, b) => PR_ARTEN.findIndex((x) => x[0] === a.art) - PR_ARTEN.findIndex((x) => x[0] === b.art)
    || String(a.klasse || "").localeCompare(String(b.klasse || "")) || a.bezeichnung.localeCompare(b.bezeichnung, "de") || a.gueltig_ab.localeCompare(b.gueltig_ab));
  return {
    format: "fahrlehrer-kompass/preisliste", version: PR_FORMAT_VERSION,
    hinweis: "Vorbereitung für das Preisregister nach § 32 FahrlG (ab 01.07.2027). Das amtliche Format steht noch nicht fest.",
    erstellt_am: new Date().toISOString(), stichtag: heute,
    fahrschule: { id: S.fsId, name: (S.fs && S.fs.name) || "" },
    preise: zeilen,
  };
}
function prCsv(a) {
  const spalten = ["art", "art_name", "klasse", "bezeichnung", "einheit", "inhalt", "waehrung", "betrag", "entfaellt", "gueltig_ab", "gueltig_bis", "gilt_heute"];
  const feld = (v) => {
    if (v == null) return "";
    if (typeof v === "number") return String(v.toFixed(2)).replace(".", ",");
    let s = typeof v === "boolean" ? (v ? "ja" : "nein") : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // keine Formeln in Tabellenprogrammen
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [spalten.join(";")].concat(a.preise.map((r) => spalten.map((k) => feld(r[k])).join(";"))).join("\r\n") + "\r\n";
}
function prHerunterladen(text, name, typ) {
  const url = URL.createObjectURL(new Blob([text], { type: typ }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function bindePreise(ziel) {
  const neu = ziel.querySelector("#prNeu"); if (neu) neu.addEventListener("click", prNeu);
  ziel.querySelectorAll("[data-pr-aendern]").forEach((b) => b.addEventListener("click", () => prAendern(b.dataset.prAendern)));
  const name = "preisliste-" + KR.todayISO();
  const j = ziel.querySelector("#prJson"); if (j) j.addEventListener("click", () => prHerunterladen(JSON.stringify(prAusgabe(), null, 2), name + ".json", "application/json"));
  const c = ziel.querySelector("#prCsv"); if (c) c.addEventListener("click", () => prHerunterladen(prCsv(prAusgabe()), name + ".csv", "text/csv;charset=utf-8"));
}
