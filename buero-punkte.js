/* Kompass Büro – Punktesystem mit Platzhaltern (W19 Teil 3, 26.11.2026)
   🗣 Serband 26.11.: „Alles bauen, beim Punktesystem Platzhalter lassen, damit man selber angeben kann, was der Schüler bekommen soll.“
   - Nichts ist vorgegeben: Standard AUS, beide Listen leer. Die Fahrschule legt selbst an, wofür es Punkte gibt (punkte.regeln) und
     was man einlösen kann (punkte.praemien). Schalter „Verschenken“ und ein Text „Bedingungen“ (punkte.system).
   - Einstellungen › „Punktesystem“ (Leitung, Büro, Super-Admin): Schalter mit Rückfrage und gut sichtbarem Hinweis, beide Listen, Verschenken, Bedingungen.
   - Schülerliste: Knopf „Punkte“ (nur wenn das System an ist): Kontostand, Verlauf mit wer/wann, Punkte geben, Einlösen, Verschenken, eigene Buchung.
   - Die Datenbank (supabase/migrations/20261202_w19_03_punkte.sql) setzt Vorzeichen, Wer/Wann, prüft Schalter und Kontostand.
     Eine Buchung ist danach nicht änderbar; Korrektur = Gegenbuchung („Eigene Buchung“).
   - Fehlt die Tabelle (Migration noch nicht live): Hinweis „Datenbank noch nicht bereit“, sonst nichts. */
"use strict";
const PUNKTE_SYSTEM_STD = { aktiv: false, verschenken: false, bedingungen: "" };
const PUNKTE_HINWEIS = "Punkte für Bezahltes wirken wie ein Rabatt (Preisangaben, Steuer). Viele Schüler sind minderjährig. Vor dem Einschalten prüfen.";
const PUNKTE_MAX_EINTRAEGE = 50;
const PUNKTE_ART_TEXT = { vergeben: "Punkte bekommen", einloesen: "Eingelöst", verschenkt_ab: "Verschenkt", verschenkt_an: "Geschenkt bekommen" };

function punkteDarf() { return !!(S.profil && ["buero", "fahrschule_admin", "super_admin"].includes(S.profil.rolle)); }
function punkteSystem() { return window.KE ? KE.wert("punkte.system", PUNKTE_SYSTEM_STD) : Object.assign({}, PUNKTE_SYSTEM_STD); }
function punkteAn() { return punkteSystem().aktiv === true; }
function punkteListe(schluessel) {
  const w = window.KE ? KE.wert(schluessel, { liste: [] }) : { liste: [] };
  return (Array.isArray(w.liste) ? w.liste : []).filter((x) => x && typeof x === "object" && String(x.name || "").trim() && Number(x.punkte) > 0)
    .map((x) => ({ id: String(x.id || ""), name: String(x.name).trim(), punkte: Math.floor(Number(x.punkte)) }));
}
function punkteFehltTabelle(err) { const m = String((err && (err.message || err.code)) || ""); return /schueler_punkte|punkte_kontostand|punkte_verschenken/.test(m) && /does not exist|schema cache|Could not find|42P01|rpc fehlt/i.test(m); }
function punkteFehlerText(err) {
  const m = String((err && err.message) || "");
  if (/Punktesystem ist ausgeschaltet/.test(m)) return "Das Punktesystem ist ausgeschaltet (Einstellungen › Punktesystem).";
  if (/Verschenken ist ausgeschaltet/.test(m)) return "Verschenken ist ausgeschaltet (Einstellungen › Punktesystem).";
  const n = m.match(/Nicht genug Punkte: Kontostand (-?\d+), gebraucht (\d+)/);
  if (n) return `Nicht genug Punkte: Der Schüler hat ${n[1]}, gebraucht werden ${n[2]}.`;
  if (/nicht in der Liste/.test(m)) return "Das steht nicht in der Liste der Fahrschule.";
  if (punkteFehltTabelle(err)) return "Datenbank noch nicht bereit (Punkte). Bitte später noch einmal versuchen.";
  return typeof dbFehlerText === "function" ? dbFehlerText(err) : m;
}
function punkteZahl(n) { const v = Number(n || 0); return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString("de-DE"); }

// Knopf „Punkte“ erscheint erst, wenn die Einstellungen da sind
window.addEventListener("ke:geladen", () => { try { if (document.body && document.body.dataset.bereich === "schueler" && typeof zeichne === "function" && S.geladenAm) zeichne(); } catch (e) { /* egal */ } });

/* ---------- Schülerkonto (Dialog) ---------- */
async function punkteDialog(sid) {
  if (!punkteDarf() || !punkteAn()) return;
  const st = S.schueler.find((x) => x.id === sid);
  if (!st) return;
  const fs = S.fsId;
  const [stand, verlauf] = await Promise.all([
    supa.rpc("punkte_kontostand", { p_fahrschule: fs, p_schueler: sid }),
    supa.from("schueler_punkte").select("*").eq("fahrschule_id", fs).eq("schueler_id", sid).order("erstellt_am", { ascending: false }).limit(200),
  ]);
  const err = stand.error || verlauf.error;
  if (err) { toast(punkteFehlerText(err), true); return; }
  const kontostand = Number(stand.data || 0);
  const sys = punkteSystem(), regeln = punkteListe("punkte.regeln"), praemien = punkteListe("punkte.praemien");
  const name = (id) => { const x = S.schueler.find((y) => y.id === id); return x ? x.name : "anderer Schüler"; };
  const zeilen = (verlauf.data || []).map((b) => `<li class="punkte-zeile"><span class="punkte-zahl ${Number(b.punkte) < 0 ? "minus" : "plus"}">${esc(punkteZahl(b.punkte))}</span>
      <span class="punkte-text"><b>${esc(b.grund)}</b><span class="unter">${esc(PUNKTE_ART_TEXT[b.art] || b.art)}${b.gegen_schueler_id ? ` · ${b.art === "verschenkt_ab" ? "an" : "von"} ${esc(name(b.gegen_schueler_id))}` : ""} · ${esc(new Date(b.erstellt_am).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }))}${b.bearbeiter ? ` · ${esc(b.bearbeiter)}` : ""}</span></span></li>`).join("");
  const andere = S.schueler.filter((x) => x.id !== sid && istAktiv(x)).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));
  const aktionen = [["vergeben", "Punkte geben"], ["einloesen", "Einlösen"]].concat(sys.verschenken === true ? [["verschenken", "Verschenken"]] : []).concat([["frei", "Eigene Buchung"]]);
  const body = `<div class="punkte-kopf"><div class="punkte-stand" id="punkteStand"><b>${esc(kontostand.toLocaleString("de-DE"))}</b> Punkte</div><div class="leise">${esc(st.name || "")}</div></div>
    <div class="formular">
      <fieldset class="voll"><legend>Was soll gebucht werden?</legend>
        ${aktionen.map(([w, t], i) => `<label class="wahl"><input type="radio" name="aktion" value="${w}"${i === 0 ? " checked" : ""}> ${esc(t)}</label>`).join("")}
      </fieldset>
      <label class="voll" id="punkteEintragZeile">Auswahl<select name="eintrag"></select></label>
      <label id="punkteAnzahlZeile" hidden>Punkte<input type="number" name="anzahl" min="1" max="1000000" step="1" inputmode="numeric"></label>
      <label class="voll" id="punkteGrundZeile" hidden>Grund<input type="text" name="grund" maxlength="200" autocomplete="off"></label>
      <fieldset class="voll" id="punkteRichtungZeile" hidden><legend>Richtung</legend>
        <label class="wahl"><input type="radio" name="richtung" value="vergeben" checked> Punkte gutschreiben</label>
        <label class="wahl"><input type="radio" name="richtung" value="einloesen"> Punkte abziehen</label>
      </fieldset>
      <label class="voll" id="punkteAnZeile" hidden>An wen?<select name="an"><option value="">– bitte wählen –</option>${andere.map((x) => `<option value="${esc(x.id)}">${esc(x.name || "(ohne Namen)")}</option>`).join("")}</select></label>
    </div>
    <p class="leise klein" id="punkteLeerHinweis" hidden></p>
    ${sys.bedingungen ? `<p class="leise klein"><b>Bedingungen:</b> ${esc(sys.bedingungen).replace(/\n/g, "<br>")}</p>` : ""}
    <h3 class="punkte-titel">Verlauf</h3>
    ${zeilen ? `<ul class="punkte-liste">${zeilen}</ul>` : `<p class="leer">Noch keine Buchungen.</p>`}
    <p class="leise klein">Buchungen lassen sich nicht ändern oder löschen. Ist etwas falsch, bitte mit „Eigene Buchung“ das Gegenteil buchen.</p>`;
  const dlg = oeffneDialog("Punkte", body, async (form) => {
    const aktion = (form.querySelector("input[name=aktion]:checked") || {}).value;
    const wahl = form.eintrag.value;
    let art, punkte, grund, gegen = null;
    if (aktion === "vergeben" || aktion === "einloesen") {
      const l = (aktion === "vergeben" ? regeln : praemien)[Number(wahl)];
      if (!l) { toast("Bitte etwas auswählen.", true); return false; }
      art = aktion; punkte = l.punkte; grund = l.name;
    } else if (aktion === "verschenken") {
      gegen = form.an.value; punkte = Number(form.anzahl.value); grund = String(form.grund.value || "").trim();
      if (!gegen) { toast("Bitte wählen, an wen.", true); return false; }
      art = "verschenkt_ab";
    } else {
      punkte = Number(form.anzahl.value); grund = String(form.grund.value || "").trim();
      art = (form.querySelector("input[name=richtung]:checked") || {}).value || "vergeben";
    }
    if (!Number.isInteger(punkte) || punkte <= 0 || punkte > 1000000) { toast("Bitte eine ganze Zahl über 0 eintragen.", true); return false; }
    if (!grund) { toast("Bitte einen Grund eintragen.", true); return false; }
    const was = art === "vergeben" ? `${punkte} Punkte gutschreiben` : art === "einloesen" ? `${punkte} Punkte abziehen` : `${punkte} Punkte an ${name(gegen)} verschenken`;
    if (!(await bestaetige("Punkte buchen?", `${st.name}: ${was} (Grund: ${grund}). Die Buchung lässt sich danach nicht mehr ändern.`, "Ja, buchen"))) return false;
    const res = art === "verschenkt_ab"
      ? await supa.rpc("punkte_verschenken", { p_fahrschule: fs, p_von: sid, p_an: gegen, p_punkte: punkte, p_grund: grund })
      : await supa.from("schueler_punkte").insert({ fahrschule_id: fs, schueler_id: sid, art, punkte, grund }).select("*");
    if (res.error) { toast("Nicht gebucht: " + punkteFehlerText(res.error), true); return false; }
    const neu = await supa.rpc("punkte_kontostand", { p_fahrschule: fs, p_schueler: sid });
    toast(`Gebucht ✓ Kontostand: ${neu.error ? "?" : Number(neu.data || 0).toLocaleString("de-DE")} Punkte`);
    return true;
  }, "Buchen");
  // Auswahl passend zur Aktion
  const f = dlg.querySelector("form");
  const zeige = (id, an) => { const e = dlg.querySelector("#" + id); if (e) e.hidden = !an; };
  const fuelle = () => {
    const aktion = (f.querySelector("input[name=aktion]:checked") || {}).value;
    const liste = aktion === "vergeben" ? regeln : aktion === "einloesen" ? praemien : [];
    const sel = f.eintrag;
    const mitListe = aktion === "vergeben" || aktion === "einloesen";
    sel.innerHTML = liste.map((x, i) => `<option value="${i}">${esc(x.name)} (${x.punkte.toLocaleString("de-DE")})</option>`).join("");
    sel.disabled = !liste.length;
    zeige("punkteEintragZeile", mitListe);
    zeige("punkteAnzahlZeile", !mitListe); zeige("punkteGrundZeile", !mitListe); zeige("punkteRichtungZeile", aktion === "frei"); zeige("punkteAnZeile", aktion === "verschenken");
    f.anzahl.required = !mitListe; f.grund.required = !mitListe; f.an.required = aktion === "verschenken";
    if (aktion === "verschenken" && !f.grund.value) f.grund.value = "Geschenk";
    const h = dlg.querySelector("#punkteLeerHinweis");
    h.hidden = !(mitListe && !liste.length);
    h.textContent = mitListe && !liste.length ? (aktion === "vergeben" ? "Es gibt noch keine Regel „Wofür gibt es Punkte“. Bitte erst in den Einstellungen › Punktesystem anlegen." : "Es gibt noch keine Prämie „Was kann man einlösen“. Bitte erst in den Einstellungen › Punktesystem anlegen.") : "";
  };
  f.querySelectorAll("input[name=aktion]").forEach((r) => r.addEventListener("change", fuelle));
  fuelle();
}

/* ---------- Einstellungen › Punktesystem ---------- */
(function () {
  const W = window;
  if (!Array.isArray(W.BUERO_EINSTELLUNGEN_THEMEN)) W.BUERO_EINSTELLUNGEN_THEMEN = [];
  // Entwurf überlebt das Neuzeichnen (Auffrischen im Hintergrund); gehört zu Fahrschule und Stand
  let E = null;
  const neueId = () => "e" + Math.random().toString(36).slice(2, 9);
  const ausKE = (k) => ((window.KE ? KE.wert(k, { liste: [] }) : { liste: [] }).liste || []).filter((x) => x && typeof x === "object").map((x) => ({ id: String(x.id || neueId()), name: String(x.name || ""), punkte: x.punkte == null ? "" : String(x.punkte) }));
  function frisch(fs) {
    const sys = punkteSystem();
    E = { fs, aktiv: sys.aktiv === true, verschenken: sys.verschenken === true, bedingungen: String(sys.bedingungen || ""), regeln: ausKE("punkte.regeln"), praemien: ausKE("punkte.praemien"), dirty: false };
  }
  function zeile(art, x, i) {
    return `<div class="es-zeile punkte-edit voll" data-art="${art}" data-i="${i}">
      <label class="es-name"><span class="nur-leser">Name</span><input type="text" data-feld="name" maxlength="60" value="${esc(x.name)}" placeholder="${art === "regeln" ? "z. B. Theorie bestanden" : "z. B. Eine Fahrstunde gratis"}" aria-label="Name"></label>
      <label class="es-wert"><input type="number" data-feld="punkte" min="1" max="1000000" step="1" inputmode="numeric" value="${esc(x.punkte)}" placeholder="Punkte" aria-label="Punkte"> <span class="es-einheit">Punkte</span></label>
      <button type="button" class="knopf klein" data-weg="${art}:${i}" aria-label="Eintrag entfernen">Entfernen</button>
    </div>`;
  }
  function html() {
    const liste = (art, titel, leer, neu) => `<h3 class="es-abschnitt voll">${esc(titel)}</h3>
      ${E[art].length ? E[art].map((x, i) => zeile(art, x, i)).join("") : `<p class="es-leer">${esc(leer)}</p>`}
      <div class="voll"><button type="button" class="knopf klein" data-neu="${art}"${E[art].length >= PUNKTE_MAX_EINTRAEGE ? " disabled" : ""}>${esc(neu)}</button></div>`;
    return `<form class="formular" id="punkteEinst" novalidate>
      <p class="fl-warnung voll" role="note"><b>Bitte beachten:</b> ${esc(PUNKTE_HINWEIS)}</p>
      <label class="wahl voll"><input type="checkbox" name="aktiv"${E.aktiv ? " checked" : ""}> Punktesystem einschalten</label>
      <p class="leise klein voll">Standard ist aus. Solange es aus ist, sieht und bucht niemand Punkte. Schon gebuchte Punkte bleiben erhalten.</p>
      ${liste("regeln", "Wofür gibt es Punkte?", "Noch nichts angelegt. Lege selbst fest, wofür ein Schüler Punkte bekommt und wie viele.", "+ Eintrag hinzufügen")}
      ${liste("praemien", "Was kann man einlösen?", "Noch nichts angelegt. Lege selbst fest, was ein Schüler für Punkte bekommt und wie viele Punkte das kostet.", "+ Eintrag hinzufügen")}
      <h3 class="es-abschnitt voll">Verschenken</h3>
      <label class="wahl voll"><input type="checkbox" name="verschenken"${E.verschenken ? " checked" : ""}> Schüler dürfen Punkte verschenken (Büro oder Fahrlehrer bucht es)</label>
      <h3 class="es-abschnitt voll">Bedingungen</h3>
      <label class="voll">Hinweis an die Schüler (z. B. Gültigkeit, Ausschlüsse) – wird im Punkte-Fenster angezeigt<textarea name="bedingungen" rows="4" maxlength="1500">${esc(E.bedingungen)}</textarea></label>
      <div class="voll knopfreihe"><button class="knopf haupt" type="submit">Speichern</button></div>
    </form>`;
  }
  // Eingaben aus dem Formular in den Entwurf holen
  function einlesen(form) {
    if (!E || !form) return;
    form.querySelectorAll(".punkte-edit").forEach((z) => { const l = E[z.dataset.art][Number(z.dataset.i)]; if (l) { l.name = z.querySelector("[data-feld=name]").value; l.punkte = z.querySelector("[data-feld=punkte]").value; } });
    E.aktiv = form.elements.aktiv.checked; E.verschenken = form.elements.verschenken.checked; E.bedingungen = form.elements.bedingungen.value;
  }
  const aufDa = (liste) => liste.map((x) => ({ name: x.name.trim(), punkte: x.punkte }));
  const unveraendert = () => {
    if (!E) return true;
    const sys = punkteSystem();
    return E.aktiv === (sys.aktiv === true) && E.verschenken === (sys.verschenken === true) && E.bedingungen === String(sys.bedingungen || "")
      && JSON.stringify(aufDa(E.regeln)) === JSON.stringify(aufDa(ausKE("punkte.regeln"))) && JSON.stringify(aufDa(E.praemien)) === JSON.stringify(aufDa(ausKE("punkte.praemien")));
  };
  W.BUERO_EINSTELLUNGEN_THEMEN.push({
    id: "punkte", titel: "Punktesystem", reihenfolge: 36, rollen: ["leitung", "buero", "superadmin"],
    verlassen() { const f = document.getElementById("punkteEinst"); if (f) einlesen(f); return unveraendert(); },
    verwerfen() { E = null; },
    render(el, ctx) {
      if (!E || E.fs !== ctx.fahrschuleId) frisch(ctx.fahrschuleId);
      const zeichneNeu = () => { el.innerHTML = html(); binde(); };
      const form = () => el.querySelector("#punkteEinst");
      function binde() {
        const f = form();
        f.addEventListener("input", () => { E.dirty = true; });
        f.querySelectorAll("[data-neu]").forEach((b) => b.addEventListener("click", () => {
          einlesen(f); const art = b.dataset.neu; if (E[art].length >= PUNKTE_MAX_EINTRAEGE) return;
          E[art].push({ id: neueId(), name: "", punkte: "" }); E.dirty = true; zeichneNeu();
          const z = form().querySelectorAll(`.punkte-edit[data-art=${art}] [data-feld=name]`); if (z.length) z[z.length - 1].focus();
        }));
        f.querySelectorAll("[data-weg]").forEach((b) => b.addEventListener("click", () => { einlesen(f); const [art, i] = b.dataset.weg.split(":"); E[art].splice(Number(i), 1); E.dirty = true; zeichneNeu(); }));
        f.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          if (!window.KE) { ctx.meldung("Einstellungen gerade nicht verfügbar.", "fehler"); return; }
          einlesen(f);
          const pruefe = (art, titel) => {
            const aus = [], namen = new Set();
            for (const x of E[art]) {
              const name = x.name.trim(), p = String(x.punkte).trim();
              if (!name && !p) continue; // leere Zeile
              if (!name) return titel + ": Bitte jeden Eintrag benennen.";
              if (!/^\d{1,7}$/.test(p) || Number(p) < 1 || Number(p) > 1000000) return titel + ": „" + name + "“ braucht eine ganze Punktezahl von 1 bis 1.000.000.";
              if (namen.has(name.toLowerCase())) return titel + ": „" + name + "“ gibt es doppelt.";
              namen.add(name.toLowerCase()); aus.push({ id: x.id, name, punkte: Number(p) });
            }
            return aus;
          };
          const regeln = pruefe("regeln", "Wofür gibt es Punkte"), praemien = pruefe("praemien", "Was kann man einlösen");
          if (typeof regeln === "string") { ctx.meldung(regeln, "fehler"); return; }
          if (typeof praemien === "string") { ctx.meldung(praemien, "fehler"); return; }
          const warAn = punkteSystem().aktiv === true;
          if (E.aktiv && !warAn && !(await bestaetige("Punktesystem einschalten?", PUNKTE_HINWEIS + " Wurde das geprüft?", "Ja, geprüft – einschalten"))) { f.elements.aktiv.checked = false; E.aktiv = false; return; }
          try {
            await KE.setze(ctx.sb, ctx.fahrschuleId, "punkte.regeln", { liste: regeln });
            await KE.setze(ctx.sb, ctx.fahrschuleId, "punkte.praemien", { liste: praemien });
            await KE.setze(ctx.sb, ctx.fahrschuleId, "punkte.system", { aktiv: !!E.aktiv, verschenken: !!E.verschenken, bedingungen: E.bedingungen.trim() });
            E = null; frisch(ctx.fahrschuleId); zeichneNeu();
            ctx.meldung("Gespeichert.", "ok"); toast("Einstellungen gespeichert");
          } catch (x) { ctx.meldung("Nicht gespeichert: " + String((x && x.message) || x) + (/Unbekannte Einstellung|fe_schluessel|check constraint/i.test(String(x && x.message)) ? " (Datenbank noch nicht bereit)" : ""), "fehler"); }
        });
      }
      zeichneNeu();
    },
  });
})();
