/* Kompass Büro – Paket-Baukasten (Werkstatt 13, 24.11.2026)
   🗣 Serband: „Paket hinzufügen und dann gibt es frei wählbare Posten … diese Felder mit Zahlen belegen und auch mit Preisen.
   Unten soll sich dann der Gesamtpreis befinden … als Vorlage speichern … Der Name des Paketes kann auch frei gewählt werden.
   Alles aufgebaut wie ein Baukasten.“
   - Büro › Preisliste bekommt zwei Reiter: „Preise“ und „Pakete“ (#preise und #preise?reiter=pakete).
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

/* Preis aus der Preisliste in Cent für einen Posten (am Tag „datum“, Standard heute).
   undefined = steht nicht in der Preisliste, null = dort „entfällt“.
   Reihenfolge: genaue Bezeichnung, dann die übliche Bezeichnung der Art, dann – wenn es genau eine Preisposition dieser Art gibt –
   diese. Erst mit der Klasse des Pakets, dann ohne Klasse (z. B. Lernapp und Simulator gibt es meist nur einmal). */
function bkListenCent(posten, klasse, datum) {
  if (!S.preise || typeof preisAm !== "function") return undefined;
  const art = posten.art, bez = String(posten.bezeichnung || "").trim();
  const klassen = klasse ? [klasse, null] : [null];
  for (const k of klassen) {
    let e = bez ? preisAm(art, k, bez, datum) : undefined;
    if (e === undefined && art !== "sonstiges") {
      const std = prArt(art)[4];
      if (std && std.toLowerCase() !== bez.toLowerCase() && !(art === "sonderfahrt" && PR_SONDER.includes(std))) e = preisAm(art, k, std, datum);
      if (e === undefined) {
        const pos = [...prPositionen().values()].filter((z) => z[0].art === art && (z[0].klasse || null) === k);
        // Sonderfahrten: eine andere Sonderfahrt (z. B. nur „Autobahnfahrt“ eingetragen) gilt nicht für „Überlandfahrt“
        if (pos.length === 1 && !(art === "sonderfahrt" && PR_SONDER.includes(pos[0][0].bezeichnung))) e = preisAm(art, k, pos[0][0].bezeichnung, datum);
      }
    }
    if (e !== undefined) return e == null ? null : Math.round(e * 100);
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
function bkReiterLeiste(aktiv) {
  if (!bkDa()) return "";
  return `<div class="tabs klein bk-reiter" role="tablist" aria-label="Preisliste"><a class="tab" href="#preise"${aktiv === "preise" ? ' aria-current="page"' : ""}>Preise</a><a class="tab" href="#preise?reiter=pakete"${aktiv === "pakete" ? ' aria-current="page"' : ""}>Pakete</a></div>`;
}
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
    : `<span class="bk-v-preis">${esc(prEuro(s.cent))}</span>${s.fehlt ? `<span class="marke-pill gelb">Preis fehlt bei ${s.fehlt} Posten</span>` : ""}`;
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
function bindePakete(ziel) {
  const neu = ziel.querySelector("#bkNeu"); if (neu) neu.addEventListener("click", () => bkEditor(null));
  const finde = (id) => (S.pakete || []).find((p) => p.id === id);
  ziel.querySelectorAll("[data-bk-bearbeiten]").forEach((b) => b.addEventListener("click", () => { const v = finde(b.dataset.bkBearbeiten); if (v) bkEditor(v); }));
  ziel.querySelectorAll("[data-bk-kopie]").forEach((b) => b.addEventListener("click", () => { const v = finde(b.dataset.bkKopie); if (v) bkEditor(v, true); }));
  ziel.querySelectorAll("[data-bk-archiv]").forEach((b) => b.addEventListener("click", () => bkAktiv(b.dataset.bkArchiv, false, b)));
  ziel.querySelectorAll("[data-bk-zurueck]").forEach((b) => b.addEventListener("click", () => bkAktiv(b.dataset.bkZurueck, true, b)));
}

/* ---------- Speichern ---------- */
async function bkSchreiben(id, werte) {
  const q = id ? supa.from("fahrschule_pakete").update(werte).eq("id", id).select()
    : supa.from("fahrschule_pakete").insert(Object.assign({ fahrschule_id: S.fsId }, werte)).select();
  const res = await q;
  if (res.error || !res.data || !res.data.length) {
    if (res.error && bkSpalteFehlt(res.error)) { S.bkFehlt = true; toast("Die Pakete sind in der Datenbank noch nicht eingerichtet.", true); zeichne(); return null; }
    toast("Nicht gespeichert: " + (res.error ? dbFehlerText(res.error) : "keine Berechtigung"), true);
    return null;
  }
  const zeile = res.data[0];
  const i = (S.pakete || []).findIndex((p) => p.id === zeile.id);
  if (i >= 0) S.pakete[i] = zeile; else S.pakete = (S.pakete || []).concat(zeile);
  return zeile;
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
function bkEuroFeld(cent) { return cent == null ? "" : (cent / 100).toFixed(2); }
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
      <span class="bk-mal" aria-hidden="true">×</span>
      <label class="bk-preisfeld"><span class="nur-leser">Einzelpreis in €</span><input type="number" inputmode="decimal" min="0" max="100000" step="0.01" data-bk-preis="${i}" placeholder="Preis" value="${esc(bkEuroFeld(wert))}"><span aria-hidden="true">€</span></label>
      <span class="bk-zeilensumme" data-bk-zsumme="${i}"></span>
    </div>
    <div class="bk-p-hinweis klein" data-bk-hinweis="${i}"></div>
  </li>`;
}
function bkHinweisHTML(p, i, klasse) {
  const liste = bkListenCent(p, klasse);
  if (p.preis_cent_fest != null) {
    return `<span class="marke-pill blau">eigener Preis</span>${liste != null ? ` <span class="leise">Preisliste: ${esc(prEuro(liste))}</span>` : ""} <button class="textknopf" type="button" data-bk-liste="${i}">zurück zur Preisliste</button>`;
  }
  if (liste === undefined) return `<span class="marke-pill gelb">Preis fehlt in der Preisliste</span> <span class="leise">Preis hier eintragen oder im Reiter „Preise“.</span>`;
  if (liste === null) return `<span class="marke-pill gelb">In der Preisliste: entfällt</span> <span class="leise">Preis hier eintragen.</span>`;
  return `<span class="leise">aus der Preisliste</span>`;
}
function bkEditor(vorlage, kopie) {
  const neu = !vorlage || kopie;
  const st = {
    name: vorlage ? (kopie ? `${vorlage.name} (Kopie)` : vorlage.name) : "",
    klasse: vorlage ? vorlage.klasse || "" : "B",
    posten: bkPosten(vorlage).map((p) => ({ art: p.art, bezeichnung: p.bezeichnung, anzahl: Number(p.anzahl) || 1, preis_cent_fest: p.preis_cent_fest == null ? null : Number(p.preis_cent_fest) })),
  };
  const turbo = !neu && bkTurbo(vorlage);
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
  const dlg = oeffneDialog(neu ? (kopie ? "Paket kopieren" : "Neues Paket") : "Paket bearbeiten", inhalt, async (form) => {
    const name = String(form.name.value || "").trim();
    if (!name) { toast("Bitte einen Namen für das Paket eintragen.", true); return false; }
    if (turbo && name !== "Turboboost") { toast("Der Name „Turboboost“ bleibt so.", true); return false; }
    for (const p of st.posten) {
      if (p.art === "sonstiges" && !String(p.bezeichnung || "").trim()) { toast("Bitte bei „Sonstiges“ einen Namen eintragen.", true); return false; }
      if (!(Number.isInteger(p.anzahl) && p.anzahl >= 1 && p.anzahl <= BK_MAX_ANZAHL)) { toast(`Bitte bei „${p.bezeichnung}“ eine Anzahl von 1 bis ${BK_MAX_ANZAHL} eintragen.`, true); return false; }
      if (p.preis_cent_fest != null && !(Number.isInteger(p.preis_cent_fest) && p.preis_cent_fest >= 0 && p.preis_cent_fest <= BK_MAX_CENT)) { toast(`Bitte bei „${p.bezeichnung}“ einen Preis bis 100.000 € eintragen.`, true); return false; }
    }
    const werte = {
      name, klasse: form.klasse.value || null,
      posten: st.posten.map((p) => ({ art: p.art, bezeichnung: String(p.bezeichnung).trim(), anzahl: p.anzahl, preis_cent_fest: p.preis_cent_fest })),
    };
    if (neu) {
      werte.reihenfolge = (S.pakete || []).reduce((m, p) => Math.max(m, Number(p.reihenfolge) || 0), 0) + 1;
      werte.aktiv = true;
      if (!(await bkSchreiben(null, werte))) return false;
      zeichne();
      toast(`Paket „${name}“ gespeichert`);
      return true;
    }
    const alt = { name: vorlage.name, klasse: vorlage.klasse || null, posten: bkPosten(vorlage) };
    if (!(await bkSchreiben(vorlage.id, werte))) return false;
    zeichne();
    toastUndo(`Paket „${name}“ gespeichert`, async () => {
      if (await bkSchreiben(vorlage.id, alt)) { zeichne(); toast("Rückgängig gemacht"); }
    });
    return true;
  }, neu ? "Paket speichern" : "Speichern");
  dlg.classList.add("bk-dialog");
  const form = dlg.querySelector("form");
  const listeEl = dlg.querySelector("[data-bk-liste-posten]");
  const chipsEl = dlg.querySelector("[data-bk-chips]");
  const geaendert = () => { dlg.dataset.geaendert = "1"; };
  const klasse = () => form.klasse.value || null;

  function rechne() {
    const s = bkSumme(st.posten, klasse());
    dlg.querySelector("[data-bk-gesamt]").textContent = prEuro(s.cent);
    const h = dlg.querySelector("[data-bk-gesamt-hinweis]");
    h.textContent = !st.posten.length ? "Noch keine Posten." : s.fehlt ? `Ohne ${s.fehlt} Posten: Preis fehlt.` : "";
    h.classList.toggle("bk-warn", !!s.fehlt);
    st.posten.forEach((p, i) => {
      const e = bkEinzelCent(p, klasse());
      const z = dlg.querySelector(`[data-bk-zsumme="${i}"]`);
      if (z) z.textContent = e == null ? "" : "= " + prEuro(e * p.anzahl);
      const hw = dlg.querySelector(`[data-bk-hinweis="${i}"]`);
      if (hw) hw.innerHTML = bkHinweisHTML(p, i, klasse());
    });
  }
  function zeichneChips() {
    const da = (art) => st.posten.filter((p) => p.art === art).length;
    const voll = st.posten.length >= BK_MAX_POSTEN;
    chipsEl.innerHTML = BK_POSTEN.filter(([art]) => !voll && (art === "sonstiges" || (art === "sonderfahrt" ? da(art) < PR_SONDER.length : !da(art))))
      .map(([art, name]) => `<button class="chip bk-chip" type="button" data-bk-dazu="${art}">+ ${esc(name)}</button>`).join("")
      || `<span class="leise klein">${voll ? `Höchstens ${BK_MAX_POSTEN} Posten.` : "Alle Posten sind schon drin."}</span>`;
  }
  function zeichneListe(fokus) {
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
      const i = +d.bkListe, p = st.posten[i]; p.preis_cent_fest = null;
      const f = listeEl.querySelector(`[data-bk-preis="${i}"]`); if (f) f.value = bkEuroFeld(bkListenCent(p, klasse()));
      geaendert(); rechne();
    } else if (d.bkWeg != null) {
      const i = +d.bkWeg, weg = st.posten.splice(i, 1)[0];
      geaendert(); zeichneListe();
      toastUndo(`„${weg.bezeichnung || bkName(weg.art)}“ entfernt`, () => { st.posten.splice(Math.min(i, st.posten.length), 0, weg); zeichneListe(); });
    }
  });
  listeEl.addEventListener("input", (e) => {
    const t = e.target, d = t.dataset;
    if (d.bkAnzahl != null) { if (t.value !== "") setzeAnzahl(+d.bkAnzahl, t.value, false); }
    else if (d.bkPreis != null) {
      const p = st.posten[+d.bkPreis]; if (!p) return;
      const roh = String(t.value || "").replace(",", ".").trim(), n = Number(roh);
      p.preis_cent_fest = roh === "" || !isFinite(n) || n < 0 ? null : Math.min(BK_MAX_CENT, Math.round(n * 100));
      rechne();
    } else if (d.bkName != null) { const p = st.posten[+d.bkName]; if (p) p.bezeichnung = t.value; }
  });
  listeEl.addEventListener("change", (e) => {
    const t = e.target, d = t.dataset;
    if (d.bkAnzahl != null) setzeAnzahl(+d.bkAnzahl, t.value === "" ? st.posten[+d.bkAnzahl].anzahl : t.value);
    else if (d.bkSonder != null) { const p = st.posten[+d.bkSonder]; if (p) { p.bezeichnung = t.value; geaendert(); zeichneListe(+d.bkSonder); } }
  });
  form.klasse.addEventListener("change", () => zeichneListe());
  zeichneListe();
  if (neu && !kopie) form.name.focus();
}
