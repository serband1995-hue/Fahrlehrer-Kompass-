/* Kompass Büro – Paket-Baukasten (Werkstatt 13, 24.11.2026)
   🗣 Serband: „Paket hinzufügen und dann gibt es frei wählbare Posten … diese Felder mit Zahlen belegen und auch mit Preisen.
   Unten soll sich dann der Gesamtpreis befinden … als Vorlage speichern … Der Name des Paketes kann auch frei gewählt werden.
   Alles aufgebaut wie ein Baukasten.“
   - Büro › Zahlungen: Reiter: „Preise“ und „Pakete“ (#preise und #preise?reiter=pakete).
   - Eine Vorlage (fahrschule_pakete) hat Name, Klasse (frei) und Posten: {art, bezeichnung, anzahl, preis_cent_fest}.
     preis_cent_fest null = der Preis kommt aus der Preisliste und folgt ihr (Entscheidung der Hauptsitzung 24.11.2026).
     Ein eingetippter Preis bleibt fest („eigener Preis“, mit „zurück zur Preisliste“).
   - Alles in ganzen Cent. Kein Rabatt in Schritt 1. Nie löschen: Archivieren (aktiv = false) mit Rückgängig.
   - Fehlen die neuen Spalten (alte Datenbank, Migration 20261124_paket_01 noch nicht live), bleibt alles wie vorher:
     kein Reiter, keine neuen Preis-Arten, keine Fehlermeldung. */
"use strict";
// [art, Name im Paket, Vorgabe Anzahl]. Sonderfahrten: Bezeichnung aus PR_SONDER (Überland, Autobahn, Dunkelheit)
const BK_POSTEN = [
  ["grundbetrag", "Grundbetrag", 1],
  ["lernapp", "Fahr-Akademie Lernapp", 1],
  ["fahrstunde", "Übungsstunden", 10],
  ["sonderfahrt", "Sonderfahrt", 1],
  ["simulator", "Simulator", 1],
  ["pruefung_praxis", "Vorstellung zur praktischen Prüfung", 1],
  ["sonstiges", "Sonstiges", 1],
];
// Vorgabe der Sonderfahrten (Klasse B: 5 Überland, 4 Autobahn, 3 Dunkelheit); jederzeit änderbar
const BK_SONDER_ANZAHL = [5, 4, 3];
const BK_MAX_POSTEN = 30, BK_MAX_ANZAHL = 999, BK_MAX_CENT = 10000000;

// Ist die Datenbank so weit? select("*") liefert die Spalte „posten“ erst nach der Migration.
function bkDa() {
  if (S.bkFehlt) return false;
  const p = S.pakete || [];
  return !p.length || p.some((x) => Object.prototype.hasOwnProperty.call(x, "posten"));
}
function bkSpalteFehlt(err) {
  return !!err && (["42703", "PGRST204"].includes(err.code) || /posten|klasse/.test(String(err.message || "")) && /column|schema cache|does not exist|Could not find/i.test(String(err.message || "")));
}
function bkReiter() {
  const p = new URLSearchParams((location.hash.split("?")[1]) || "");
  return p.get("reiter") === "pakete" && bkDa() ? "pakete" : "preise";
}
function bkName(art) { const x = BK_POSTEN.find((a) => a[0] === art); return x ? x[1] : art; }
function bkSortiert(liste) {
  return liste.slice().sort((a, b) => (Number(a.reihenfolge) || 0) - (Number(b.reihenfolge) || 0) || String(a.name || "").localeCompare(String(b.name || ""), "de"));
}
function bkPosten(v) { return Array.isArray(v && v.posten) ? v.posten : []; }
function bkTurbo(v) { return !!v && v.name === "Turboboost"; } // ⚡ in der App hängt am Namen: nicht umbenennen
function bkNameKey(n) { return String(n || "").trim().toLowerCase(); }
function bkNameBelegt(name, ausserId) { return (S.pakete || []).some((p) => p.id !== ausserId && bkNameKey(p.name) === bkNameKey(name)); }
function bkFreierName(basis) {
  let n = `${basis} (Kopie)`, i = 2;
  while (bkNameBelegt(n)) n = `${basis} (Kopie ${i++})`;
  return n;
}

/* Preis aus der Preisliste in Cent für einen Posten (am Tag „datum“, Standard heute).
   undefined = steht nicht in der Preisliste, null = dort „entfällt“.
   Reihenfolge: genaue Bezeichnung, dann die übliche Bezeichnung der Art, dann – wenn es genau eine Preisposition dieser Art gibt –
   diese. Erst mit der Klasse des Pakets, dann ohne Klasse (z. B. Lernapp und Simulator gibt es meist nur einmal). */
function bkIstSonderName(n) { const k = String(n || "").trim().toLowerCase(); return PR_SONDER.some((x) => x.toLowerCase() === k); }
function bkListenCent(posten, klasse, datum) { const q = bkListe(posten, klasse, datum); return q === undefined ? undefined : q.cent; }
// Wie bkListenCent, dazu die Bezeichnung der verwendeten Preisposition (Hinweis „aus: …“, Fehlersucher Daten 24.11.)
function bkListe(posten, klasse, datum) {
  if (!S.preise || typeof preisAm !== "function") return undefined;
  const art = posten.art, bez = String(posten.bezeichnung || "").trim();
  const klassen = klasse ? [klasse, null] : [null];
  for (const k of klassen) {
    let e = bez ? preisAm(art, k, bez, datum) : undefined, quelle = bez;
    if (e === undefined && art !== "sonstiges") {
      const std = prArt(art)[4];
      if (std && std.toLowerCase() !== bez.toLowerCase() && !(art === "sonderfahrt" && bkIstSonderName(std))) { e = preisAm(art, k, std, datum); quelle = std; }
      if (e === undefined) {
        const pos = [...prPositionen().values()].filter((z) => z[0].art === art && (z[0].klasse || null) === k);
        // Sonderfahrten: eine andere Sonderfahrt (z. B. nur „Autobahnfahrt“ eingetragen) gilt nicht für „Überlandfahrt“
        if (pos.length === 1 && !(art === "sonderfahrt" && bkIstSonderName(pos[0][0].bezeichnung))) { quelle = pos[0][0].bezeichnung; e = preisAm(art, k, quelle, datum); }
      }
    }
    if (e !== undefined) return { cent: e == null ? null : Math.round(e * 100), bez: quelle, klasse: k };
  }
  return undefined;
}
// Einzelpreis, mit dem gerechnet wird: eigener Preis, sonst Preisliste (null/undefined = fehlt)
function bkEinzelCent(posten, klasse) {
  if (posten.preis_cent_fest != null) return posten.preis_cent_fest;
  const c = bkListenCent(posten, klasse);
  return c == null ? null : c;
}
function bkSumme(posten, klasse) {
  let cent = 0, fehlt = 0;
  for (const p of posten) {
    const e = bkEinzelCent(p, klasse);
    if (e == null) { fehlt++; continue; }
    cent += e * (Number(p.anzahl) || 0);
  }
  return { cent, fehlt };
}
function bkKurz(posten) {
  return posten.map((p) => `${Number(p.anzahl) || 0} × ${p.bezeichnung}`).join(" · ");
}

/* ---------- Reiter „Preise | Pakete“ ---------- */
// Die Reiter „Preise · Pakete · Verkäufe“ stehen in EINER Zeile oben auf der Seite Zahlungen (zahlungsReiter in buero.js, nur mit Paket-Datenbank mit „Pakete“)
function bkReiterLeiste() { return ""; }
function renderPreisSeite() {
  const r = bkReiter();
  return bkReiterLeiste(r) + (r === "pakete" ? renderPakete() : renderPreise());
}
function bindePreisSeite(ziel) {
  if (bkReiter() === "pakete") bindePakete(ziel); else bindePreise(ziel);
}

function bkVorlageHTML(v, darf) {
  const posten = bkPosten(v);
  const s = bkSumme(posten, v.klasse);
  const preis = !posten.length ? `<span class="leise">noch leer</span>`
    : `${s.fehlt < posten.length ? `<span class="bk-v-preis">${s.fehlt ? "ab " : ""}${esc(prEuro(s.cent))}</span>` : ""}${s.fehlt ? `<span class="marke-pill gelb">Preis fehlt bei ${s.fehlt} Posten</span>` : ""}`;
  const knoepfe = !darf ? "" : v.aktiv === false
    ? `<button class="knopf klein" type="button" data-bk-zurueck="${esc(v.id)}">Zurückholen</button>`
    : `<button class="knopf klein" type="button" data-bk-bearbeiten="${esc(v.id)}">Bearbeiten</button><button class="knopf klein" type="button" data-bk-kopie="${esc(v.id)}">Kopieren</button><button class="knopf klein" type="button" data-bk-archiv="${esc(v.id)}">Archivieren</button>`;
  return `<li class="bk-vorlage">
    <div class="bk-v-kopf"><b class="bk-v-name">${esc(v.name)}</b>${v.klasse ? `<span class="pr-klasse">Klasse ${esc(v.klasse)}</span>` : ""}<span class="bk-v-summe">${preis}</span></div>
    ${posten.length ? `<div class="leise klein">${esc(bkKurz(posten))}</div>` : `<div class="leise klein">Noch keine Posten.${darf && v.aktiv !== false ? " Mit „Bearbeiten“ Posten hinzufügen." : ""}</div>`}
    ${knoepfe ? `<div class="knopfreihe bk-v-knoepfe">${knoepfe}</div>` : ""}
  </li>`;
}
function renderPakete() {
  const darf = prDarf();
  const alle = bkSortiert(S.pakete || []);
  const aktiv = alle.filter((p) => p.aktiv !== false), archiv = alle.filter((p) => p.aktiv === false);
  return `<div class="karte bk-seite">
    <div class="pr-kopf">${darf ? `<button class="knopf haupt" type="button" id="bkNeu">Neues Paket</button>` : `<span class="leise klein">Pakete ändern Büro und Leitung.</span>`}</div>
    ${aktiv.length ? `<ul class="bk-liste">${aktiv.map((v) => bkVorlageHTML(v, darf)).join("")}</ul>` : `<p class="leer">Noch keine Pakete.${darf ? " Mit „Neues Paket“ anfangen." : ""}</p>`}
    ${archiv.length ? `<details class="bk-archiv"><summary>Archiv (${archiv.length})</summary><ul class="bk-liste">${archiv.map((v) => bkVorlageHTML(v, darf)).join("")}</ul></details>` : ""}
    <p class="leise klein">Die Preise kommen aus dem Reiter „Preise“ und passen sich an, wenn sie sich dort ändern. Ein eigener Preis im Paket bleibt fest. Alle Preise sind Endpreise mit MwSt. Ob Pakete in den Preisaushang gehören, bitte prüfen lassen.</p>
  </div>`;
}
// Doppel-Tipp auf „Speichern“: der zweite Tipp landet nach dem Schließen auf dem Knopf darunter (z. B. „Archivieren“).
// Darum Tipps in der Liste kurz nach dem Schließen eines Fensters nicht annehmen (Fehlersucher Bedienung 24.11.).
let bkFensterZu = 0;
let bkKonflikt = false; // letzte Speicherung scheiterte, weil jemand anderes das Paket gerade geändert hat
function bkGeisterTipp() { return Date.now() - bkFensterZu < 500; }
function bindePakete(ziel) {
  const neu = ziel.querySelector("#bkNeu"); if (neu) neu.addEventListener("click", () => { if (!bkGeisterTipp()) bkEditor(null); });
  const finde = (id) => (S.pakete || []).find((p) => p.id === id);
  const an = (sel, f) => ziel.querySelectorAll(sel).forEach((b) => b.addEventListener("click", () => { if (!bkGeisterTipp()) f(b); }));
  an("[data-bk-bearbeiten]", (b) => { const v = finde(b.dataset.bkBearbeiten); if (v) bkEditor(v); });
  an("[data-bk-kopie]", (b) => { const v = finde(b.dataset.bkKopie); if (v) bkEditor(v, true); });
  an("[data-bk-archiv]", (b) => bkAktiv(b.dataset.bkArchiv, false, b));
  an("[data-bk-zurueck]", (b) => bkAktiv(b.dataset.bkZurueck, true, b));
}

/* ---------- Speichern ---------- */
/* stand (nur beim Ändern): aktualisiert_am beim Öffnen. Hat inzwischen jemand anderes gespeichert, schreibt die Datenbank nichts
   (0 Zeilen) und das Büro lädt neu, statt die fremde Änderung still zu überschreiben (Fehlersucher Daten 24.11.). */
async function bkSchreiben(id, werte, stand) {
  let q;
  if (id) {
    q = supa.from("fahrschule_pakete").update(werte).eq("id", id);
    if (stand !== undefined) q = stand ? q.eq("aktualisiert_am", stand) : q.is("aktualisiert_am", null);
    q = q.select();
  } else q = supa.from("fahrschule_pakete").insert(Object.assign({ fahrschule_id: S.fsId }, werte)).select();
  const fs = S.fsId;
  bkKonflikt = false;
  const res = await q;
  if (res.error || !res.data || !res.data.length) {
    if (res.error && bkSpalteFehlt(res.error)) { S.bkFehlt = true; toast("Die Pakete sind in der Datenbank noch nicht eingerichtet.", true); zeichne(); return null; }
    if (!res.error && id && stand !== undefined) {
      const jetzt = await supa.from("fahrschule_pakete").select("id,aktualisiert_am").eq("id", id).maybeSingle();
      const anders = jetzt && !jetzt.error && jetzt.data && (jetzt.data.aktualisiert_am || null) !== (stand || null);
      if (anders) {
        bkKonflikt = true;
        toast("Jemand anderes hat dieses Paket gerade geändert. Die Liste wird neu geladen, bitte noch einmal öffnen.", true);
        if (typeof ladeDaten === "function") ladeDaten();
        return null;
      }
    }
    toast("Nicht gespeichert: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true);
    return null;
  }
  const zeile = res.data[0];
  if (fs !== S.fsId || zeile.fahrschule_id !== S.fsId) return zeile; // inzwischen andere Fahrschule: nicht in deren Liste hängen
  const i = (S.pakete || []).findIndex((p) => p.id === zeile.id);
  if (i >= 0) S.pakete[i] = zeile; else S.pakete = (S.pakete || []).concat(zeile);
  return zeile;
}
// Alte Datenbank ohne Vorlagen: bkDa() kann es an den Zeilen nicht erkennen. Dann einmal nach der Spalte fragen.
async function bkPruefeSpalten() {
  if ((S.pakete || []).length || S.bkFehlt || !S.fsId) return;
  const fs = S.fsId;
  const r = await supa.from("fahrschule_pakete").select("id,posten").eq("fahrschule_id", fs).limit(1);
  if (fs === S.fsId && r && r.error && bkSpalteFehlt(r.error)) { S.bkFehlt = true; zeichne(); }
}
// Archivieren und Zurückholen: ohne Rückfrage, 6 Sekunden Rückgängig
async function bkAktiv(id, aktiv, knopf) {
  const v = (S.pakete || []).find((p) => p.id === id);
  if (!v) return;
  if (knopf) knopf.disabled = true;
  const z = await bkSchreiben(id, { aktiv });
  if (!z) { if (knopf) knopf.disabled = false; return; }
  zeichne();
  toastUndo(aktiv ? `„${v.name}“ ist wieder da` : `„${v.name}“ archiviert`, async () => {
    if (await bkSchreiben(id, { aktiv: !aktiv })) { zeichne(); toast("Rückgängig gemacht"); }
  });
}

/* ---------- Der Baukasten (Fenster) ---------- */
function bkEuroFeld(cent) { return cent == null ? "" : (cent / 100).toFixed(2).replace(".", ","); }
/* Eingabe „65“, „65,“, „65,5“, „65.50“, „1.299,00“ → Cent. "" → null (Preis aus der Liste), ungültig → NaN */
function bkCentAusText(t) {
  let s = String(t || "").replace(/[\s€]/g, "").replace(/[.,]$/, ""); // „65,“ beim Tippen ist ein Zwischenstand, kein Fehler
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const c = Math.round(Number(s) * 100);
  return c > BK_MAX_CENT ? NaN : c;
}
function bkPostenZeile(p, i, klasse) {
  const liste = bkListenCent(p, klasse);
  const fest = p.preis_cent_fest != null;
  const wert = fest ? p.preis_cent_fest : liste;
  let titel;
  if (p.art === "sonderfahrt") {
    titel = `<select class="bk-p-wahl" data-bk-sonder="${i}" aria-label="Art der Sonderfahrt">${PR_SONDER.map((n) => `<option${n === p.bezeichnung ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  } else if (p.art === "sonstiges") {
    titel = `<input type="text" class="bk-p-wahl" data-bk-name="${i}" maxlength="120" placeholder="Name des Postens" aria-label="Name des Postens" value="${esc(p.bezeichnung || "")}">`;
  } else {
    titel = `<b>${esc(p.bezeichnung)}</b>`;
  }
  return `<li class="bk-posten" data-i="${i}">
    <div class="bk-p-titel">${titel}<button class="knopf klein bk-weg" type="button" data-bk-weg="${i}" aria-label="${esc(p.bezeichnung || bkName(p.art))} entfernen">✕</button></div>
    <div class="bk-p-zahlen">
      <span class="bk-stepper" role="group" aria-label="Anzahl">
        <button class="knopf" type="button" data-bk-minus="${i}" aria-label="eins weniger">−</button>
        <input type="number" inputmode="numeric" min="1" max="${BK_MAX_ANZAHL}" step="1" data-bk-anzahl="${i}" aria-label="Anzahl" value="${esc(String(p.anzahl))}">
        <button class="knopf" type="button" data-bk-plus="${i}" aria-label="eins mehr">+</button>
      </span>
      <span class="bk-preisgruppe"><span class="bk-mal" aria-hidden="true">×</span>
      <label class="bk-preisfeld"><span class="nur-leser">Einzelpreis in €</span><input type="text" inputmode="decimal" autocomplete="off" maxlength="12" data-bk-preis="${i}" placeholder="Preis"${fest ? ' class="eigen"' : ""} value="${esc(bkEuroFeld(wert))}"><span aria-hidden="true">€</span></label></span>
      <span class="bk-zeilensumme" data-bk-zsumme="${i}"></span>
    </div>
    <div class="bk-p-hinweis klein" data-bk-hinweis="${i}"></div>
  </li>`;
}
function bkHinweisHTML(p, i, klasse) {
  if (p._ungueltig) return `<span class="marke-pill rot">Preis nicht lesbar</span> <span class="leise">So eintragen: 65,00</span>`;
  const q = bkListe(p, klasse), liste = q === undefined ? undefined : q.cent;
  if (p.preis_cent_fest != null) {
    return `<span class="marke-pill blau">Eigener Preis, bleibt fest</span>${liste != null ? ` <span class="leise">Preisliste: ${esc(prEuro(liste))}</span>` : ""} <button class="textknopf" type="button" data-bk-liste="${i}">Preis aus der Liste nehmen</button>`;
  }
  if (liste === undefined) {
    const spaeter = bkListe(p, klasse, "9999-12-31");
    return `<span class="marke-pill gelb">Preis fehlt in der Preisliste</span> <span class="leise">${spaeter !== undefined ? "Der Preis in der Liste gilt erst später. " : ""}Preis hier eintragen oder im Reiter „Preise“.</span>`;
  }
  if (liste === null) return `<span class="marke-pill gelb">In der Preisliste: entfällt</span> <span class="leise">Preis hier eintragen.</span>`;
  const anders = q.bez && q.bez.toLowerCase() !== String(p.bezeichnung || "").trim().toLowerCase();
  return `<span class="leise">aus der Preisliste${anders || (klasse && !q.klasse) ? ` (${esc(q.bez)}${klasse && !q.klasse ? ", ohne Klasse" : ""})` : ""}, passt sich an</span>`;
}
/* Der Baukasten. opt: true = Kopie; { verkauf: { titel, knopf, fertig(werte) } } = Paket für einen Schüler zusammenstellen
   (schreibt nichts in die Vorlagen, gibt Name, Klasse und Posten an fertig() zurück; jeder Posten braucht dann einen Preis). */
function bkEditor(vorlage, opt) {
  const o = opt === true ? { kopie: true } : (opt || {});
  const kopie = !!o.kopie, verkauf = o.verkauf || null;
  const neu = !vorlage || kopie;
  const st = {
    name: vorlage ? (kopie ? bkFreierName(vorlage.name) : vorlage.name) : "",
    klasse: vorlage ? vorlage.klasse || "" : "B",
    posten: bkPosten(vorlage).map((p) => ({ art: p.art, bezeichnung: p.bezeichnung, anzahl: Number(p.anzahl) || 1, preis_cent_fest: p.preis_cent_fest == null ? null : Number(p.preis_cent_fest) })),
  };
  const turbo = !neu && !verkauf && bkTurbo(vorlage);
  const inhalt = `<div class="formular bk-form">
      <label class="voll">Name des Pakets<input type="text" name="name" maxlength="120" required value="${esc(st.name)}"${turbo ? " readonly" : ""} placeholder="z. B. Boost-Paket B"></label>
      ${turbo ? `<p class="voll leise klein bk-turbo">Der Name „Turboboost“ bleibt so: Die App zeigt daran das ⚡.</p>` : ""}
      <label>Klasse<select name="klasse">${klassenOptionen(st.klasse)}</select></label>
    </div>
    <h3 class="bk-zwischen">Posten</h3>
    <ul class="bk-posten-liste" data-bk-liste-posten></ul>
    <p class="leise klein bk-chips-titel">Hinzufügen:</p>
    <div class="chips bk-chips" data-bk-chips></div>
    <div class="bk-gesamt" aria-live="polite"><span>Gesamtpreis</span><b data-bk-gesamt></b><span class="klein" data-bk-gesamt-hinweis></span></div>`;
  const dlg = oeffneDialog(verkauf ? verkauf.titel : neu ? (kopie ? "Paket kopieren" : "Neues Paket") : "Paket bearbeiten", inhalt, async (form) => {
    const name = String(form.name.value || "").trim();
    if (!name) { toast("Bitte einen Namen für das Paket eintragen.", true); return false; }
    if (turbo && name !== "Turboboost") { toast("Der Name „Turboboost“ bleibt so.", true); return false; }
    if (!verkauf && bkNameBelegt(name, neu ? null : vorlage.id)) { toast(bkNameKey(name) === "turboboost" ? "„Turboboost“ gibt es schon (die App zeigt daran das ⚡). Bitte einen anderen Namen wählen." : "Ein Paket mit diesem Namen gibt es schon (auch im Archiv). Bitte einen anderen Namen wählen.", true); return false; }
    for (const p of st.posten) {
      if (p._ungueltig) { toast(`Bitte bei „${p.bezeichnung || bkName(p.art)}“ einen gültigen Preis eintragen, z. B. 65,00.`, true); return false; }
      if (p.art === "sonstiges" && !String(p.bezeichnung || "").trim()) { toast("Bitte bei „Sonstiges“ einen Namen eintragen.", true); return false; }
      if (!(Number.isInteger(p.anzahl) && p.anzahl >= 1 && p.anzahl <= BK_MAX_ANZAHL)) { toast(`Bitte bei „${p.bezeichnung}“ eine Anzahl von 1 bis ${BK_MAX_ANZAHL} eintragen.`, true); return false; }
      if (p.preis_cent_fest != null && !(Number.isInteger(p.preis_cent_fest) && p.preis_cent_fest >= 0 && p.preis_cent_fest <= BK_MAX_CENT)) { toast(`Bitte bei „${p.bezeichnung}“ einen Preis bis 100.000 € eintragen.`, true); return false; }
    }
    const werte = {
      name, klasse: form.klasse.value || null,
      posten: st.posten.map((p) => ({ art: p.art, bezeichnung: String(p.bezeichnung).trim(), anzahl: p.anzahl, preis_cent_fest: p.preis_cent_fest })),
    };
    if (verkauf) {
      if (!werte.posten.length) { toast("Bitte mindestens einen Posten hinzufügen.", true); return false; }
      const ohne = werte.posten.find((p) => bkEinzelCent(p, werte.klasse) == null);
      if (ohne) { toast(`Bei „${ohne.bezeichnung}“ fehlt der Preis. Bitte eintragen.`, true); return false; }
      verkauf.fertig(werte);
      return true;
    }
    if (neu) {
      werte.reihenfolge = (S.pakete || []).reduce((m, p) => Math.max(m, Number(p.reihenfolge) || 0), 0) + 1;
      werte.aktiv = true;
      if (!(await bkSchreiben(null, werte))) return false;
      zeichne();
      toast(`Paket „${name}“ gespeichert`);
      return true;
    }
    const alt = { name: vorlage.name, klasse: vorlage.klasse || null, posten: bkPosten(vorlage) };
    const z = await bkSchreiben(vorlage.id, werte, vorlage.aktualisiert_am || null);
    if (!z) return bkKonflikt; // fremde Änderung: Fenster schließen, sonst scheitert jedes weitere Speichern auf dem alten Stand
    zeichne();
    toastUndo(`Paket „${name}“ gespeichert`, async () => {
      if (await bkSchreiben(vorlage.id, alt, z.aktualisiert_am || null)) { zeichne(); toast("Rückgängig gemacht"); }
    });
    return true;
  }, verkauf ? verkauf.knopf : neu ? "Paket speichern" : "Speichern");
  dlg.classList.add("bk-dialog");
  let undoFenster = null; // Rückgängig für „Posten entfernt“ gilt nur, solange das Fenster offen ist
  dlg.addEventListener("close", () => { bkFensterZu = Date.now(); if (undoFenster && typeof UNDO !== "undefined" && UNDO.offen === undoFenster) undoAblaufen(); });
  const form = dlg.querySelector("form");
  const listeEl = dlg.querySelector("[data-bk-liste-posten]");
  const chipsEl = dlg.querySelector("[data-bk-chips]");
  const geaendert = () => { dlg.dataset.geaendert = "1"; };
  const klasse = () => form.klasse.value || null;

  function rechne() {
    const s = bkSumme(st.posten.filter((p) => !p._ungueltig), klasse());
    s.fehlt += st.posten.filter((p) => p._ungueltig).length;
    dlg.querySelector("[data-bk-gesamt]").textContent = st.posten.length && s.fehlt >= st.posten.length ? "Preis fehlt" : (s.fehlt ? "ab " : "") + prEuro(s.cent);
    dlg.querySelector(".bk-gesamt").hidden = !st.posten.length; // leer: Platz für die Knöpfe zum Hinzufügen
    const h = dlg.querySelector("[data-bk-gesamt-hinweis]");
    h.innerHTML = s.fehlt ? `<span class="marke-pill gelb">${s.fehlt} Posten ohne Preis, noch nicht eingerechnet</span>` : "";
    st.posten.forEach((p, i) => {
      const e = bkEinzelCent(p, klasse());
      const z = dlg.querySelector(`[data-bk-zsumme="${i}"]`);
      if (z) z.textContent = e == null ? "" : "= " + prEuro(e * p.anzahl);
      const hw = dlg.querySelector(`[data-bk-hinweis="${i}"]`);
      if (hw) hw.innerHTML = bkHinweisHTML(p, i, klasse());
    });
  }
  function zeichneChips() {
    const da = (art) => art === "sonderfahrt" ? new Set(st.posten.filter((p) => p.art === art).map((p) => p.bezeichnung)).size : st.posten.filter((p) => p.art === art).length;
    const voll = st.posten.length >= BK_MAX_POSTEN;
    chipsEl.innerHTML = BK_POSTEN.filter(([art]) => !voll && (art === "sonstiges" || (art === "sonderfahrt" ? da(art) < PR_SONDER.length : !da(art))))
      .map(([art, name]) => `<button class="chip bk-chip" type="button" data-bk-dazu="${art}">+ ${esc(name)}</button>`).join("")
      || `<span class="leise klein">${voll ? `Höchstens ${BK_MAX_POSTEN} Posten.` : "Alle Posten sind schon drin."}</span>`;
  }
  function zeichneListe(fokus) {
    st.posten.forEach((p) => { p._ungueltig = false; }); // Felder zeigen danach wieder den gültigen Preis
    listeEl.innerHTML = st.posten.length ? st.posten.map((p, i) => bkPostenZeile(p, i, klasse())).join("")
      : `<li class="leise klein bk-leer">Noch keine Posten. Unten antippen, was ins Paket gehört.</li>`;
    zeichneChips();
    rechne();
    if (fokus != null) { const f = listeEl.querySelector(`[data-i="${fokus}"] input, [data-i="${fokus}"] select`); if (f) f.focus(); }
  }
  function setzeAnzahl(i, n, feld) {
    const p = st.posten[i]; if (!p) return;
    const z = Math.max(1, Math.min(BK_MAX_ANZAHL, Math.round(Number(n) || 0)));
    p.anzahl = z;
    if (feld !== false) { const f = listeEl.querySelector(`[data-bk-anzahl="${i}"]`); if (f) f.value = String(z); }
    geaendert(); rechne();
  }
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bk-dazu]"); if (!b) return;
    const art = b.dataset.bkDazu, def = BK_POSTEN.find((x) => x[0] === art);
    let bez = def[1], anzahl = def[2];
    if (art === "sonderfahrt") {
      const frei = PR_SONDER.findIndex((n) => !st.posten.some((p) => p.art === art && p.bezeichnung === n));
      bez = PR_SONDER[Math.max(0, frei)]; anzahl = BK_SONDER_ANZAHL[Math.max(0, frei)] || 1;
    } else if (art === "sonstiges") bez = "";
    st.posten.push({ art, bezeichnung: bez, anzahl, preis_cent_fest: null });
    geaendert();
    zeichneListe(art === "sonstiges" ? st.posten.length - 1 : null);
  });
  listeEl.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    const d = t.dataset;
    if (d.bkMinus != null) { const i = +d.bkMinus; setzeAnzahl(i, st.posten[i].anzahl - 1); }
    else if (d.bkPlus != null) { const i = +d.bkPlus; setzeAnzahl(i, st.posten[i].anzahl + 1); }
    else if (d.bkListe != null) {
      const i = +d.bkListe, p = st.posten[i]; p.preis_cent_fest = null; p._ungueltig = false;
      const f = listeEl.querySelector(`[data-bk-preis="${i}"]`); if (f) { f.value = bkEuroFeld(bkListenCent(p, klasse())); f.classList.remove("eigen"); f.setAttribute("aria-invalid", "false"); }
      geaendert(); rechne();
    } else if (d.bkWeg != null) {
      const i = +d.bkWeg, weg = st.posten.splice(i, 1)[0];
      geaendert(); zeichneListe();
      undoFenster = toastUndo(`„${weg.bezeichnung || bkName(weg.art)}“ entfernt`, () => { st.posten.splice(Math.min(i, st.posten.length), 0, weg); zeichneListe(); });
    }
  });
  listeEl.addEventListener("input", (e) => {
    const t = e.target, d = t.dataset;
    if (d.bkAnzahl != null) { if (t.value !== "") setzeAnzahl(+d.bkAnzahl, t.value, false); }
    else if (d.bkPreis != null) {
      const p = st.posten[+d.bkPreis]; if (!p) return;
      const c = bkCentAusText(t.value);
      p._ungueltig = Number.isNaN(c);
      if (!p._ungueltig) p.preis_cent_fest = c;
      t.classList.toggle("eigen", p.preis_cent_fest != null && !p._ungueltig);
      t.setAttribute("aria-invalid", p._ungueltig ? "true" : "false");
      geaendert(); rechne();
    } else if (d.bkName != null) { const p = st.posten[+d.bkName]; if (p) p.bezeichnung = t.value; }
  });
  // Enter (oder „Los“ auf der Handy-Tastatur) in einem Posten-Feld speichert nicht das halbe Paket, sondern beendet nur die Eingabe
  listeEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.matches("[data-bk-anzahl], [data-bk-preis], [data-bk-name]")) return;
    e.preventDefault();
    e.target.dispatchEvent(new Event("change", { bubbles: true }));
    e.target.blur();
  });
  listeEl.addEventListener("change", (e) => {
    const t = e.target, d = t.dataset;
    if (d.bkAnzahl != null) setzeAnzahl(+d.bkAnzahl, t.value === "" ? st.posten[+d.bkAnzahl].anzahl : t.value);
    else if (d.bkSonder != null) {
      const i = +d.bkSonder, p = st.posten[i]; if (!p) return;
      if (st.posten.some((x, j) => j !== i && x.art === "sonderfahrt" && x.bezeichnung === t.value)) { toast(`„${t.value}“ ist schon im Paket.`, true); t.value = p.bezeichnung; return; }
      p.bezeichnung = t.value; geaendert(); zeichneListe(i);
    }
  });
  form.klasse.addEventListener("change", () => zeichneListe());
  zeichneListe();
  if (neu && !kopie) form.name.focus();
}

/* ---------- Paket an einen Schüler verkaufen (Schritt 1, Teil B) ----------
   🗣 „Wenn ein Schüler sich anmeldet, soll er dann entweder normale Anmeldung bekommen oder halt Pakete verkauft bekommen.“
   Im Schüler-Fenster: Auswahl „Normale Anmeldung“ oder eine Vorlage, mit „Anpassen“ im selben Baukasten. Beim Speichern wird das Paket
   als feste Kopie verkauft (schueler_pakete: Preise in Cent wie am Verkaufstag; spätere Änderungen an Vorlage oder Preisliste
   ändern es nicht). Ein aktives Paket je Schüler: ein Wechsel storniert das alte (ein Schritt in der Datenbank,
   schueler_paket_verkaufen). „Normale Anmeldung“ und Rückgängig laufen über schueler_paket_aktivieren. schueler.paket_id zeigt weiter
   auf die Vorlage (Anzeige, ⚡ bei „Turboboost“). „Einzelabrechnung (ohne Paket)“ zählt als normale Anmeldung.
   S.verkauft = aktive verkaufte Pakete der Fahrschule; null = Tabelle fehlt (alte Datenbank) → alte Paket-Auswahl. */
function bkVerkaufDa() { return bkDa() && Array.isArray(S.verkauft); }
function bkIstEinzel(v) { return /ohne paket|einzelabrechnung/i.test(String((v && v.name) || "")); }
function bkAktivesPaket(sid) { return (S.verkauft || []).find((p) => p.schueler_id === sid && !p.storniert_am) || null; }
// Schülerliste: das verkaufte Paket (fest), sonst die bloße Zuordnung schueler.paket_id (die kann ein alter App-Stand überschreiben)
function bkListenPaket(x) {
  const v = bkAktivesPaket(x.id);
  return v ? " · " + esc(v.name) : x.paket_id ? " · " + esc(paketName(x.paket_id)) : "";
}
function bkVorlagenZumVerkauf() { return bkSortiert((S.pakete || []).filter((p) => p.aktiv !== false && !bkIstEinzel(p))); }
// Posten mit festem Preis (Cent) für den Verkauf; fehlt ein Preis, steht der Posten in „fehlt“
function bkFest(posten, klasse) {
  const fest = [], fehlt = [];
  for (const p of posten) {
    const e = bkEinzelCent(p, klasse);
    if (e == null) fehlt.push(p.bezeichnung || bkName(p.art));
    else fest.push({ art: p.art, bezeichnung: String(p.bezeichnung).trim(), anzahl: Number(p.anzahl), preis_cent: e });
  }
  return { posten: fest, fehlt, gesamt: fest.reduce((a, p) => a + p.anzahl * p.preis_cent, 0) };
}
/* Schritt 2: „noch offen“ je Posten. Gleiche Rechnung wie in der App (KR.paketQuelleAusTerminen, KR.paketVerbrauch). Quelle: Termine im
   Büro-Kalender (mit ganzem Verlauf, bkVerlaufLaden) mit dem Fahrcheck-Haken des Büros, Praxisprüfungen mit Ergebnis (App und Tafel). */
function bkVerbrauchQuelle(x, voll) {
  const d = new Date(), heute = KR.todayISO();
  // Termine: die geladenen (letzte DATEN_TAGE Tage, die das Büro frisch hält) und aus dem Verlauf dieses Schülers (voll) nur, was
  // davor liegt. Sonst brächte der beim Öffnen geladene Verlauf einen inzwischen abgesagten Termin zurück (Prüf-Team Daten).
  const grenze = KR.addDaysISO(heute, -DATEN_TAGE);
  const nachId = new Map();
  for (const t of (voll && voll.termine) || []) if (t.datum < grenze) nachId.set(t.id, t);
  for (const t of S.termine || []) if (t.schueler_id === x.id) nachId.set(t.id, t);
  const termine = [...nachId.values()].filter((t) => t.schueler_id === x.id && !t.geloescht).map((t) => {
    const pl = t.payload || {};
    return { art: t.art, datum: t.datum, von: t.von, bis: t.bis, status: pl.status || t.status, sonderArt: pl.sonderArt, srcSonder: pl.srcSonder, fc: pl.fc || null, bueroFc: t.buero_fc_status || "offen" };
  });
  const pruefDaten = typeof pruefErgebnisse === "function" ? pruefErgebnisse("praxis").filter((e) => e.schueler_id === x.id).map((e) => e.datum) : [];
  for (const p of (voll && voll.tafel) || []) if (p.art === "praxis" && (p.status === "bestanden" || p.status === "nicht_bestanden") && p.datum && p.datum < grenze) pruefDaten.push(p.datum);
  // Fahrstunden und Sonderfahrten zählen erst mit dem Fahrcheck-Haken des Büros (KR.paketQuelleAusTerminen), der Plan der App nicht
  return KR.paketQuelleAusTerminen(termine, heute, d.getHours() * 60 + d.getMinutes(), { pruefDaten });
}
/* Folgeauftrag W13: Das Büro lädt Termine und Prüfungstafel nur DATEN_TAGE Tage zurück. Für „noch offen“ zählt aber die ganze
   Ausbildung (Geld!). Darum beim Öffnen der Akte gezielt diesen einen Schüler ganz nachladen, statt alles neu zu laden.
   null = nicht ladbar (dann bleibt der Stand der letzten DATEN_TAGE Tage, mit Hinweis). */
async function bkVerlaufLaden(sid) {
  const fs = S.fsId;
  try {
    const [t, p] = await Promise.all([
      alleSeiten(() => supa.from("kalender_termine").select("*").eq("fahrschule_id", fs).eq("schueler_id", sid).eq("geloescht", false).order("datum").order("id")),
      alleSeiten(() => supa.from("pruefungstermine").select("*").eq("fahrschule_id", fs).eq("schueler_id", sid).order("datum").order("id")),
    ]);
    if (fs !== S.fsId || !t || t.error || !p || p.error) return null;
    return { termine: t.data || [], tafel: p.data || [] };
  } catch (e) { return null; }
}
function bkZahl(n) { return (Math.round(Number(n) * 10) / 10).toLocaleString("de-DE"); }
function bkVerbrauchText(v, art) {
  if (!v || v.verbraucht == null) return "";
  const wort = art === "pruefung_praxis" ? "vorgestellt" : art === "simulator" ? "gemacht" : "gefahren";
  if (v.offen > 0) return `${bkZahl(v.verbraucht)} von ${bkZahl(v.anzahl)} ${wort} · <b>noch ${bkZahl(v.offen)} offen</b>`;
  // Mehr als im Paket kann Zusatzkosten bedeuten: nicht grün, sondern gelb (Richter 24.11.)
  return `alle ${bkZahl(v.anzahl)} ${wort} ✓${v.mehr > 0 ? ` · <span class="bk-anm-mehr">${bkZahl(v.mehr)} mehr als im Paket</span>` : ""}`;
}
function bkPostenListeHTML(posten, verbrauch) {
  return `<ul class="bk-anm-posten">${posten.map((p, i) => {
    const vt = verbrauch ? bkVerbrauchText(verbrauch[i], p.art) : "";
    // vt enthält nur Zahlen und feste Wörter (bkVerbrauchText), darum ohne esc
    return `<li><span><span class="bk-anm-menge">${esc(String(p.anzahl))} ×</span> ${esc(p.bezeichnung)}${vt ? `<small class="bk-anm-stand${verbrauch[i].offen > 0 ? "" : " fertig"}">${vt}</small>` : ""}</span>${p.preis_cent != null ? `<span>${esc(prEuro(p.anzahl * p.preis_cent))}</span>` : `<span class="marke-pill gelb">Preis fehlt</span>`}</li>`;
  }).join("")}</ul>`;
}
function bkAnmeldungHTML() {
  return `<div class="voll bk-anmeldung" data-bk-anm>
    <label>Anmeldung<select name="bk_wahl" data-bk-wahl></select></label>
    <div class="bk-anm-info" data-bk-anm-info aria-live="polite"></div>
  </div>`;
}
// Ist das im Baukasten Übernommene (werte) dasselbe wie das verkaufte Paket? Dann gibt es nichts neu zu verkaufen.
function bkGleich(verkauft, werte) {
  const a = bkPosten(verkauft), b = werte.posten || [];
  return String(verkauft.name || "").trim() === String(werte.name || "").trim() && (verkauft.klasse || null) === (werte.klasse || null)
    && a.length === b.length && a.every((p, i) => p.art === b[i].art && String(p.bezeichnung).trim() === String(b[i].bezeichnung).trim()
      && Number(p.anzahl) === Number(b[i].anzahl) && Number(p.preis_cent) === bkEinzelCent(b[i], werte.klasse));
}
// Örtlichen Stand nach Verkauf, Storno oder Rückgängig nachziehen (zeile = jetzt aktives Paket oder null)
function bkLokal(sid, zeile) {
  S.verkauft = (S.verkauft || []).filter((p) => p.schueler_id !== sid);
  if (zeile) S.verkauft.push(Object.assign({}, zeile, { storniert_am: null }));
  const s = (S.schueler || []).find((y) => y.id === sid);
  const v = zeile && zeile.vorlage_id && (S.pakete || []).some((p) => p.id === zeile.vorlage_id) ? zeile.vorlage_id : null;
  if (s) s.paket_id = v;
}
async function bkAktivSetzen(sid, alt, text, zuordnung, still) {
  const r = await supa.rpc("schueler_paket_aktivieren", { p_schueler: sid, p_paket: alt ? alt.id : null });
  if (r.error) { toast((still ? "Das Paket wurde nicht storniert: " : "Rückgängig ging nicht: ") + dbFehlerText(r.error), true); return false; }
  bkLokal(sid, alt);
  // Vorher (oder danach) nur zugeordnet (ohne Verkauf): die Zuordnung zurückschreiben, sonst fehlt danach z. B. das ⚡ von Turboboost (Fable W2)
  if (!alt && zuordnung) {
    const z = await supa.from("schueler").update({ paket_id: zuordnung }).eq("id", sid).select("id");
    const s = (S.schueler || []).find((y) => y.id === sid);
    if (!z.error && z.data && z.data.length && s) s.paket_id = zuordnung;
  }
  if (still) return true;
  zeichne();
  toast(text || "Rückgängig gemacht");
  return true;
}
// Das jetzt aktive Paket aus der Datenbank (ein zweites Fenster kann inzwischen verkauft haben). undefined = nicht lesbar.
async function bkAktivJetzt(sid) {
  const r = await supa.from("schueler_pakete").select("*").eq("schueler_id", sid).is("storniert_am", null).maybeSingle();
  return r && !r.error ? r.data || null : undefined;
}
function bkAnmeldungBinden(dlg, x, id) {
  // let: nach einem Verkauf oder Storno merkt sich das Fenster den neuen Stand (bleibt es offen, z. B. wegen eines Konflikts
  // in anderen Feldern, verkauft ein zweites Speichern nicht noch einmal)
  let anfang = id ? bkAktivesPaket(id) : null;
  let zugeordnet = !anfang && x.paket_id ? (S.pakete || []).find((p) => p.id === x.paket_id && !bkIstEinzel(p)) || null : null;
  const sel = dlg.querySelector("[data-bk-wahl]"), info = dlg.querySelector("[data-bk-anm-info]");
  const form = dlg.querySelector("form");
  // wahl: "bleibt" (Stand wie bisher), "normal", "neu" (Paket aus Vorlage oder angepasst, steht in „neu“),
  // "zuordnen" (Vorlage noch ohne Posten, z. B. Turboboost: wie bisher nur zuordnen, ohne Preise; steht in „zuVorlage“)
  let wahl = anfang || zugeordnet ? "bleibt" : "normal", neu = null, zuVorlage = null;
  let voll = null, vollStand = id ? "" : "neu"; // "" = noch nicht geladen, "laden", "ok", "fehler"
  function ladeVoll() {
    if (vollStand) return;
    vollStand = "laden";
    bkVerlaufLaden(id).then((v) => {
      voll = v; vollStand = v ? "ok" : "fehler";
      if (wahl === "bleibt" && anfang) zeige(); // auch bei geparktem Fenster (Fable W3)
    });
  }
  const schuelerKlasse = () => (form.klasse && form.klasse.value) || x.klasse || null;
  const ausVorlage = (v) => ({ vorlage_id: v.id, name: v.name, klasse: v.klasse || schuelerKlasse(), posten: bkPosten(v).map((p) => Object.assign({}, p)), angepasst: false });
  function optionen() {
    const vorl = bkVorlagenZumVerkauf();
    let h = "";
    if (anfang) h += `<option value="bleibt">${esc(anfang.name)} · seit ${esc(datumDE(String(anfang.verkauft_am || "").slice(0, 10)).slice(0, 6))}</option>`;
    else if (zugeordnet) h += `<option value="bleibt">„${esc(zugeordnet.name)}“ (nur zugeordnet, nicht verkauft)</option>`;
    h += `<option value="normal">Normale Anmeldung (ohne Paket)</option>`;
    if (neu && neu.angepasst) h += `<option value="angepasst">Paket „${esc(neu.name)}“ (angepasst)</option>`;
    if (vorl.length) h += `<optgroup label="Paket">${vorl.filter((v) => !(zugeordnet && v.id === zugeordnet.id && !bkPosten(v).length)).map((v) => `<option value="v:${esc(v.id)}">${esc(v.name)}${v.klasse ? " · Klasse " + esc(v.klasse) : ""}${bkPosten(v).length ? "" : " · nur zuordnen"}</option>`).join("")}</optgroup>`;
    sel.innerHTML = h;
    sel.value = wahl === "neu" ? (neu.angepasst ? "angepasst" : "v:" + neu.vorlage_id) : wahl === "zuordnen" ? "v:" + zuVorlage.id : wahl;
  }
  function zeige() {
    let h = "";
    if (wahl === "bleibt" && anfang) {
      ladeVoll();
      h = `<p class="bk-anm-verkauft">Verkauft am ${esc(datumDE(String(anfang.verkauft_am || "").slice(0, 10)))}${anfang.bearbeiter ? " von " + esc(anfang.bearbeiter) : ""}</p>
        ${(() => {
          if (vollStand === "laden") return bkPostenListeHTML(bkPosten(anfang), null);
          if (typeof KR_OHNE_HAKEN !== "undefined" && KR_OHNE_HAKEN) return bkPostenListeHTML(bkPosten(anfang), null) + `<p class="leise klein" data-bk-neu-laden>Bitte die Seite neu laden, dann wird „noch offen“ gezählt.</p>`;
          const q = bkVerbrauchQuelle(x, voll);
          return bkPostenListeHTML(bkPosten(anfang), KR.paketVerbrauch(bkPosten(anfang), q))
            + KR.paketHinweise(q).map((h) => `<p class="leise klein" data-bk-ohne-haken>${esc(h)}</p>`).join("");
        })()}
        ${vollStand === "laden" ? `<p class="leise klein" data-bk-voll-laedt>„Noch offen“ wird gezählt …</p>` : ""}
        ${vollStand === "fehler" ? `<p class="bk-anm-warn" data-bk-voll-fehlt>Ältere Termine fehlen: „noch offen“ kann zu hoch sein. Bitte die Akte später noch einmal öffnen.</p>` : ""}
        <p class="bk-anm-summe"><span>Gesamt</span><b>${esc(prEuro(anfang.gesamt_cent))}</b></p>
        <p class="leise klein">Die Preise bleiben so, auch wenn sich die Preisliste ändert. Gezählt wird je Fahrcheck (45 Min.), sobald das Büro ihn abgehakt hat.</p>
        <div class="knopfreihe"><button class="knopf klein" type="button" data-bk-anpassen>Paket ändern</button></div>`;
    } else if (wahl === "bleibt") {
      h = `<p class="leise klein">Das Paket ist nur zugeordnet (ohne Preise). Zum Verkaufen oben ein Paket wählen.</p>`;
    } else if (wahl === "zuordnen") {
      h = `${anfang ? `<p class="bk-anm-warn">Beim Speichern wird das verkaufte Paket „${esc(anfang.name)}“ storniert. Danach geht „Rückgängig“.</p>` : ""}
        <p class="leise klein">„${esc(zuVorlage.name)}“ hat noch keine Posten. Es wird nur zugeordnet, ohne Preise und ohne „noch offen“. Zum Verkaufen unter Preisliste › Pakete die Posten anlegen.</p>`;
    } else if (wahl === "normal") {
      h = anfang ? `<p class="bk-anm-warn">Beim Speichern wird das Paket „${esc(anfang.name)}“ storniert. Danach geht „Rückgängig“.</p>`
        : `<p class="leise klein">Ohne Paket. Abgerechnet wird einzeln nach der Preisliste.</p>`;
    } else {
      const f = bkFest(neu.posten, neu.klasse);
      const liste = neu.posten.map((p) => ({ anzahl: p.anzahl, bezeichnung: p.bezeichnung, preis_cent: bkEinzelCent(p, neu.klasse) }));
      h = `${neu.posten.length ? bkPostenListeHTML(liste) : `<p class="bk-anm-warn">Dieses Paket hat noch keine Posten. Bitte „Anpassen“.</p>`}
        <p class="bk-anm-summe"><span>Gesamt${f.fehlt.length ? " (ohne fehlende Preise)" : ""}</span><b>${esc(prEuro(f.gesamt))}</b></p>
        ${f.fehlt.length ? `<p class="bk-anm-warn">Preis fehlt bei: ${esc(f.fehlt.join(", "))}. Bitte „Anpassen“ und den Preis eintragen.</p>` : ""}
        <p class="leise klein">Wird beim Speichern verkauft${anfang ? ` und ersetzt „${esc(anfang.name)}“` : ""}. Die Preise werden dabei festgeschrieben.</p>
        <div class="knopfreihe"><button class="knopf klein" type="button" data-bk-anpassen>Anpassen</button></div>`;
    }
    info.innerHTML = h;
  }
  sel.addEventListener("change", () => {
    const w = sel.value;
    zuVorlage = null;
    if (w.startsWith("v:")) {
      const v = (S.pakete || []).find((p) => p.id === w.slice(2)); if (!v) return;
      // Vorlage ohne Posten (alle alten Pakete nach der Umstellung): wie bisher nur zuordnen, statt das Speichern zu sperren
      if (!bkPosten(v).length) { zuVorlage = v; neu = null; wahl = "zuordnen"; } else { neu = ausVorlage(v); wahl = "neu"; }
    }
    else if (w === "angepasst") wahl = "neu";
    else { wahl = w; if (neu && !neu.angepasst) neu = null; }
    dlg.dataset.geaendert = "1";
    optionen(); zeige();
  });
  info.addEventListener("click", (e) => {
    if (!e.target.closest("[data-bk-anpassen]")) return;
    // Grundlage: das gewählte neue Paket, sonst das verkaufte (mit seinen festen Preisen als eigene Preise)
    const basis = wahl === "neu" ? neu
      : { vorlage_id: anfang.vorlage_id, name: anfang.name, klasse: anfang.klasse, posten: bkPosten(anfang).map((p) => ({ art: p.art, bezeichnung: p.bezeichnung, anzahl: p.anzahl, preis_cent_fest: p.preis_cent })) };
    bkEditor({ name: basis.name, klasse: basis.klasse, posten: basis.posten }, { verkauf: { titel: `Paket für ${x.name || "den Schüler"}`, knopf: "Übernehmen", fertig: (w) => {
      if (wahl === "bleibt" && anfang && bkGleich(anfang, w)) { toast("Nichts geändert. Das Paket bleibt wie verkauft."); return; } // Fable W7
      neu = { vorlage_id: basis.vorlage_id || null, name: w.name, klasse: w.klasse, posten: w.posten, angepasst: true };
      wahl = "neu"; dlg.dataset.geaendert = "1";
      optionen(); zeige();
    } } });
  });
  // Klasse des Schülers geändert: Preise eines Pakets ohne eigene Klasse neu nachsehen
  if (form.klasse) form.klasse.addEventListener("change", () => {
    if (wahl === "neu" && !neu.angepasst) { const v = (S.pakete || []).find((p) => p.id === neu.vorlage_id); if (v && !v.klasse) { neu.klasse = schuelerKlasse(); zeige(); } }
  });
  optionen(); zeige();
  return {
    pruefen() {
      if (wahl !== "neu") return "";
      const f = bkFest(neu.posten, neu.klasse);
      const fehler = !neu.posten.length ? `Das Paket „${neu.name}“ hat noch keine Posten. Bitte „Anpassen“.`
        : f.fehlt.length ? `Beim Paket fehlt der Preis für „${f.fehlt[0]}“. Bitte „Anpassen“ und den Preis eintragen.` : "";
      if (fehler) dlg.querySelector("[data-bk-anm]").scrollIntoView({ block: "center", behavior: "smooth" }); // Warnung und „Anpassen“ zeigen
      return fehler;
    },
    // Das Formular schreibt paket_id nicht selbst. Nur „Normale Anmeldung“ bei einem bloß zugeordneten Paket löscht die Zuordnung.
    werte(werte) {
      delete werte.paket_id;
      if (wahl === "normal" && zugeordnet) werte.paket_id = null;
      if (wahl === "zuordnen" && !anfang) werte.paket_id = zuVorlage.id; // geht wie jedes Feld durch das sichere Speichern
    },
    // Gibt es nach dem Speichern etwas am Paket zu tun? (dann kein „Nichts geändert“)
    tutWas() { return wahl === "neu" || wahl === "zuordnen" || (wahl === "normal" && !!anfang); },
    // konflikte: aus dem sicheren Speichern (W14). Hat jemand anderes paket_id inzwischen geändert, gilt sein Stand: nichts nachziehen.
    async nachSpeichern(sid, konflikte) {
      const paketKonflikt = (konflikte || []).some((c) => c.k === "paket_id");
      if (wahl === "bleibt" || (wahl === "normal" && !anfang)) { if (wahl === "normal" && zugeordnet && !paketKonflikt) { bkLokal(sid, null); zugeordnet = null; optionen(); zeige(); } return; }
      const vorher = await bkAktivJetzt(sid); // Rückgängig holt das zurück, was wirklich aktiv war (zweites Fenster)
      const alt = vorher === undefined ? anfang : vorher;
      if (wahl === "zuordnen") {
        const zu = zuVorlage;
        if (paketKonflikt && !(alt || anfang)) return; // woanders geändert: der Kasten zeigt es, „Meine Eingabe nehmen“ bleibt möglich
        if (alt || anfang) { // verkauftes Paket stornieren, danach zuordnen (die Storno-Funktion leert paket_id)
          if (!(await bkAktivSetzen(sid, null, null, zu.id, true))) return;
          zeichne();
          if (alt) toastUndo(`Paket „${alt.name}“ storniert, „${zu.name}“ zugeordnet`, () => bkAktivSetzen(sid, alt));
          else toast(`„${zu.name}“ zugeordnet. Das verkaufte Paket war schon storniert.`);
        }
        anfang = null; zugeordnet = zu; zuVorlage = null; wahl = "bleibt"; optionen(); zeige();
        return;
      }
      if (wahl === "normal") {
        const fertig = () => { anfang = null; zugeordnet = null; neu = null; optionen(); zeige(); };
        if (!alt) { bkLokal(sid, null); zeichne(); fertig(); toast("Das Paket war schon storniert."); return; } // inzwischen schon storniert
        const r = await supa.rpc("schueler_paket_aktivieren", { p_schueler: sid, p_paket: null });
        if (r.error) { toast("Das Paket wurde nicht storniert: " + dbFehlerText(r.error), true); return; }
        bkLokal(sid, null); zeichne(); fertig();
        toastUndo(`Paket „${alt.name}“ storniert: normale Anmeldung`, () => bkAktivSetzen(sid, alt));
        return;
      }
      const f = bkFest(neu.posten, neu.klasse);
      // Archivierte oder gelöschte Vorlage: als freies Paket verkaufen, sonst lehnt die Datenbank „Paket ändern“ für immer ab (Fable W1)
      const vorlage = neu.vorlage_id && (S.pakete || []).some((p) => p.id === neu.vorlage_id && p.aktiv !== false) ? neu.vorlage_id : null;
      const r = await supa.rpc("schueler_paket_verkaufen", { p_schueler: sid, p_vorlage: vorlage, p_name: String(neu.name || "").trim(), p_klasse: neu.klasse || null, p_posten: f.posten });
      const zeile = r && !r.error ? (Array.isArray(r.data) ? r.data[0] : r.data) : null;
      if (!zeile) { toast("Der Schüler ist gespeichert, das Paket aber nicht verkauft: " + (r && r.error ? String(dbFehlerText(r.error)).replace(/[.\s]+$/, "") : "keine Antwort") + ". Bitte noch einmal öffnen und speichern.", true); return; }
      bkLokal(sid, zeile); zeichne();
      const warZugeordnet = !alt && zugeordnet ? zugeordnet.id : null;
      anfang = Object.assign({}, zeile, { storniert_am: null }); zugeordnet = null; neu = null; wahl = "bleibt"; optionen(); zeige();
      toastUndo(`Paket „${zeile.name}“ verkauft (${prEuro(zeile.gesamt_cent)})`, () => bkAktivSetzen(sid, alt, null, warZugeordnet));
    },
  };
}
